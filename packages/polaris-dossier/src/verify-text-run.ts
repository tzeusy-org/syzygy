import * as fs from 'node:fs';
import * as path from 'node:path';
import { sha256 } from '@syzygy/support';
import { NotARegularFileError, PastBoundError, readBoundedFile } from './check-record-read.js';
import type { GateSources } from './gate-sources.js';
import { GitObjectReadRefusal, openPinnedObjectReader, type PinnedObjectReader, type PinnedObjectReaderOptions } from './git-object-reader.js';
import { isoOf } from './iso-of.js';
import type { Outcome } from './outcome.js';
import { reverifyPinnedRevision } from './reverify.js';
import { placementSubjectOf, screenLoaderOf, type ScreenLoader } from './screen.js';
import { RUN_ID, RUN_LAYOUT } from './state-directory.js';
import { CLAIM_OUTCOMES, VERIFY_TEXT_DISCLOSURES, VERIFY_TEXT_FORMAT, verifyText, type CheckedClaim, type ClaimOutcome, type VerifiedText } from './verify-text.js';

/** `syzygy dossier verify <run> --text <file> [--out <file>]` (syzygy-5dhm.23).
 *
 * Checks a free-form Markdown text against the run's pinned revision with the dossier check's own derivation (`verify-text.ts`), in this
 * order: the pinned revision is verified again against the records in force, exactly as `check` does; the screening policy bound to the
 * run is loaded; the text is read (strict UTF-8, at most `VERIFY_TEXT_MAX_BYTES`); every reference and quotation is checked against
 * objects read now from the clone the run record names, re-hashed from the pinned commit. It writes nothing into the run directory: no
 * revision, no record, no step-log line, so a stored run stays as it was. With `--out` it writes the annotated copy there, once (an
 * existing file is refused) and never inside the run directory. No deadline or repair-cycle limit applies: nothing is frozen. */

export const VERIFY_TEXT_MAX_BYTES = 4 * 1024 * 1024;

export interface VerifyTextRequest { readonly textFile: string; readonly outFile?: string }
export interface VerifyTextDeps {
  readonly sources: GateSources;
  readonly now: () => number;
  readonly loadScreen?: ScreenLoader;
  readonly openReader?: (options: PinnedObjectReaderOptions) => PinnedObjectReader;
}

export interface VerifyTextReport {
  readonly command: 'verify';
  readonly format: typeof VERIFY_TEXT_FORMAT;
  readonly run: string;
  readonly pinnedRevision: string;
  readonly checkedAt: string;
  readonly text: { readonly file: string; readonly sha256: string; readonly bytes: number };
  readonly screeningPolicy: { readonly policyId: string; readonly policyVersion: string; readonly sha256: string };
  readonly claims: number;
  readonly tally: Readonly<Record<ClaimOutcome, number>>;
  /** The claims no reader can check at all: those that name no file. */
  readonly cannotBeChecked: number;
  readonly items: VerifiedText['items'];
  readonly skipped: VerifiedText['skipped'];
  readonly annotated: string | null;
  readonly claimResults: readonly CheckedClaim[];
  readonly label: 'Observed';
  readonly disclosures: readonly string[];
}
export interface VerifyTextRefusal { readonly command: 'verify'; readonly outcome: 'refused'; readonly stage: string; readonly reason: string; readonly at: string }
export type VerifyTextResult = Outcome<VerifyTextReport, VerifyTextRefusal>;

const inside = (parent: string, child: string): boolean => {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

/** A path with every existing ancestor's symbolic links resolved, so containment is decided on the real location. */
const realOf = (target: string): string => {
  const missing: string[] = [];
  let probe = target;
  for (;;) {
    try { return path.join(fs.realpathSync(probe), ...missing.reverse()); } catch { /* not there yet */ }
    const parent = path.dirname(probe);
    if (parent === probe) return target;
    missing.push(path.basename(probe));
    probe = parent;
  }
};

/** The `--text` file's bytes, or why it is refused. It is read by the reader rule of version 2.10 (`readBoundedFile`, syzygy-3efd.83): one
 * open without blocking, the type and size from that descriptor, at most one byte past the bound read, so a FIFO or a file grown past
 * the bound after its size was taken is refused, never read whole. A link to a regular file is read, as `stat` read it before; the bound
 * is this command's own, stated here and in no requirement yet (syzygy-nffo). */
export function readVerifyText(textFile: string): { readonly bytes: Uint8Array } | { readonly reason: string } {
  try {
    return { bytes: new Uint8Array(readBoundedFile(textFile, VERIFY_TEXT_MAX_BYTES)) };
  } catch (cause) {
    if (cause instanceof NotARegularFileError) return { reason: `${textFile} is not a regular file` };
    if (cause instanceof PastBoundError) return { reason: `${textFile} is larger than the ${VERIFY_TEXT_MAX_BYTES}-byte text bound` };
    return { reason: `the text ${textFile} cannot be read (${(cause as NodeJS.ErrnoException).code ?? 'unknown-error'})` };
  }
}

export async function verifyTextInRun(runDir: string, request: VerifyTextRequest, deps: VerifyTextDeps): Promise<VerifyTextResult> {
  const run = path.resolve(runDir);
  const started = deps.now();
  const refuse = (stage: string, reason: string): VerifyTextResult => ({ ok: false, refusal: { command: 'verify', outcome: 'refused', stage, reason, at: isoOf(started) } });
  if (!RUN_ID.test(path.basename(run)) || !fs.existsSync(path.join(run, RUN_LAYOUT.config))) return refuse('run', `${run} is not a run directory`);
  const outFile = request.outFile === undefined ? undefined : path.resolve(request.outFile);
  const outReal = outFile === undefined ? undefined : realOf(outFile);
  const forbidden = [run, `${run}.agents`, `${run}.sessions`].flatMap((dir) => [dir, realOf(dir)]);
  // Nor into any other run (a path segment named like a run, or its .agents or .sessions sibling), nor under the records root.
  const runLike = (target: string): boolean => target.split(path.sep).some((segment) => RUN_ID.test(segment.replace(/\.(agents|sessions)$/u, '')));
  const recordsRoot = typeof deps.sources?.recordsRoot === 'string' ? path.resolve(deps.sources.recordsRoot) : undefined;
  if (recordsRoot !== undefined) forbidden.push(recordsRoot, realOf(recordsRoot));
  if (outFile !== undefined && outReal !== undefined
      && (runLike(outFile) || runLike(outReal) || forbidden.some((dir) => inside(dir, outFile) || inside(dir, outReal)))) {
    return refuse('out', 'verify writes nothing into a run directory, its session directories, any other run or the records root; name an --out outside them');
  }
  if (outFile !== undefined && fs.existsSync(outFile)) return refuse('out', `${outFile} already exists; verify writes a new file only`);

  const checked = await reverifyPinnedRevision(run, deps.sources, started, deps.openReader ? { openReader: deps.openReader } : {});
  if (!checked.ok) return refuse('reverify', `the pinned revision could not be verified again, so the text is not checked: ${checked.reasons.join('; ')}`);
  const { subject } = checked.record;
  const pinned = subject.pinnedRevision.commit;

  const textFile = path.resolve(request.textFile);
  const read = readVerifyText(textFile);
  if ('reason' in read) return refuse('text', read.reason);
  const { bytes } = read;
  let markdown: string;
  try { markdown = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { return refuse('text', `${textFile} is not strict UTF-8`); }

  const screenLoad = await screenLoaderOf(deps.loadScreen, deps.sources.recordsRoot, started)(placementSubjectOf(subject));
  if (!screenLoad.ok) return refuse('screen', screenLoad.why);
  const screen = screenLoad.screen;
  const reader = (deps.openReader ?? openPinnedObjectReader)({ gitDir: path.join(subject.clone.path, '.git'), revision: pinned });

  let result: Awaited<ReturnType<typeof verifyText>>;
  try {
    result = await verifyText(markdown, { pinned, screen, reader }, path.basename(textFile));
  } catch (cause) {
    if (cause instanceof GitObjectReadRefusal) return refuse('object-read', `an object at the pinned revision could not be read: ${cause.message}`);
    // A text the checker could not turn into a subject the derivation accepts is refused, never a crash.
    return refuse('derive', `the text could not be checked: ${cause instanceof Error ? cause.message : String(cause)}`);
  }
  if (outFile !== undefined) {
    try { fs.writeFileSync(outFile, result.annotated, { flag: 'wx', mode: 0o644 }); } catch (cause) {
      return refuse('write', `the annotated copy could not be written to ${outFile} (${(cause as NodeJS.ErrnoException).code ?? 'unknown-error'})`);
    }
  }
  const { verified } = result;
  return { ok: true, report: {
    command: 'verify', format: VERIFY_TEXT_FORMAT, run, pinnedRevision: pinned, checkedAt: isoOf(started),
    text: { file: textFile, sha256: sha256(bytes), bytes: bytes.byteLength },
    screeningPolicy: { policyId: screen.policyId, policyVersion: screen.policyVersion, sha256: screen.policySha256 },
    claims: verified.claims.length, tally: verified.tally, cannotBeChecked: verified.tally.unanchored, items: verified.items, skipped: verified.skipped,
    annotated: outFile ?? null, claimResults: verified.claims, label: 'Observed',
    disclosures: [...VERIFY_TEXT_DISCLOSURES, `The tally's outcomes, in order: ${CLAIM_OUTCOMES.join(', ')}.`],
  } };
}
