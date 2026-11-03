import { createHash, randomBytes } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  excludedSourceId, generationSourcesForBody, generationSourcesForRedactedBody, generationSpanRange, generationSourceTextAt, isDossierPagePath, leadInQuotationSpans, PAGE_SINK_CONTRACT, pageSinkCspFinding,
  type EpistemicMarking, type EvidenceAnchor, type GenerationExclusionReason, type GenerationSource, type LocalBlock,
  type LocalDisclosureItem, type LocalDraftLayer, type LocalPage, type LocalPageItem, type LocalRenderInput, type LocalSegment,
  type DossierDraft, type DraftBlock, type DraftParagraph,
} from '@syzygy/polaris-generation-core/live';
import { isRecord, sha256 } from '@syzygy/support';
import { collectBlocks, deriveFindings, draftRules, type BlobRedaction, type Derived } from './check.js';
import { CREDENTIAL_CHECK_DISCLOSURE, credentialStepCheck, storedBriefArm, type CredentialStepResult } from './credential-probe.js';
import { UNDERSTANDING_ITEMS } from './draft-schema.js';
import { EXECUTION_FLAGS_BASIS, executionFlags, type ExecutionFlags } from './execution-flags.js';
import type { CredentialProbe } from './execution-rule.js';
import { RECORDS_WITHIN_REACH } from './gate-sources.js';
import { GitObjectReadRefusal, openPinnedObjectReader } from './git-object-reader.js';
import { errno, logStep, openRun, readRecord, type OpenedRun } from './inventory.js';
import { buildDesignPacket } from './design-review.js';
import type { Outcome } from './outcome.js';
import { designReviewOfRecord, latestPassedDraft, reviewOfRecord, type DesignReviewOfRecord, type ReviewDeps, type ReviewOfRecord } from './review.js';
import type { ReverifyRefusal } from './reverify.js';
import { NO_WORK_ITEM_REASON } from './run-record.js';
import { CLASS_NOT_CONSENTED, unconsentedClass, unconsentedText } from './class-gate.js';
import { loadDossierScreen, type DossierScreen, type ScreenExclusion } from './screen.js';
import { RUN_LAYOUT } from './state-directory.js';
import { continuationOf } from './waiting-sessions.js';

/** `syzygy dossier render <run>` (REQ-polaris-generation-033, 034, 036; design "Command surface", `render`; syzygy-qkea.10).
 *
 * In this order: the renderer is wired; the pinned revision is verified again, the brief issued and the deadline not passed; the
 * adapter-credential check runs where the brief permitted execution; the latest checked draft revision must have passed and be the bytes
 * its check recorded; the screening policy in force is loaded and every check re-derived from Git objects read now at the pinned
 * revision and re-hashed, which must find nothing; the fidelity review of record is decided by rebuilding its packet now. Then the draft
 * renders through the existing multi-page dossier renderer, through the injected port, into a new numbered `site/<n>/`. The rendered-design
 * review of record is decided from the pages this render draws: it counts only while their design packet, the pages outside the one named
 * review-status region, has the digest its verdict names, and the region alone states it.
 *
 * Every rendered quotation is the span Syzygy located at this render in a blob it read and verified, never the agent's copy and never a
 * stored byte range; a source page exists only for a cited blob read now and admitted by screening; each anchor is RFC7-10's evidence
 * artifact identifier with integrity digest (the recomputed object identifier, its algorithm named, the byte range, the pinned revision),
 * the path a label. A claim block is Inferred only where the agent labels it so, no quotation of it is withheld and the counted fidelity
 * review judges it supported; an Unknown block carries its RFC2-24 reason; a non-normative block is no claim and carries no anchor.
 *
 * The draft layer renders as an editorial draft only while the owner's reading of RFC7-20 holds: the disclosure on every page and in the
 * machine view, the tool and provider declared and recorded, every rendered quotation byte-verified, and the ruling in force by its act.
 * Otherwise it renders Unknown (`unconsented-source-or-provider`) and no draft content renders, while the source pages, the run's
 * disclosure, discovery, executions and review pages stay. No owner-act record binds the ruling yet (`RFC7_20_RULING_ACT_FORM`), so in
 * production the draft layer is Unknown.
 *
 * Every string of the agent's that Syzygy renders passes the screen's secret detector first; a match withholds the string. */

export const RENDER_REPORT_FORMAT = 'polaris-dossier-render/1';
export const NO_RENDERER = 'no renderer wired: the dossier pages are drawn by the multi-page dossier renderer of apps/three-surface-poc, which the `syzygy` composition root injects; this caller injected none, so nothing is rendered';
const WITHHELD_TEXT = '[withheld: a secret detector matches this text]';
const SECRET_PATH = 'a path a secret detector matches (not shown)';

/** What the renderer port takes and gives: the multi-page renderer's operator-agent input and the files of the site. A renderer that
 * writes every source byte as entity-encoded text says so by carrying `pageSinkContract` (`PAGE_SINK_CONTRACT`). */
export interface DossierRendererInput { readonly local: LocalRenderInput; readonly sources: readonly GenerationSource[] }
export type DossierRenderer = ((input: DossierRendererInput) => { readonly files: ReadonlyMap<string, string> }) & { readonly pageSinkContract?: string };

/** Why the drawn site cannot be confirmed to meet the screening scope's `codeContentExemption.renderCondition` (policy version 3), or
 * null when it can: the renderer declares the encoding half (`PAGE_SINK_CONTRACT`) and every HTML page carries the required
 * Content-Security-Policy first in its head (`pageSinkCspFinding`). */
export function pageSinkUnconfirmed(renderer: DossierRenderer, files: ReadonlyMap<string, string>): string | null {
  if (renderer.pageSinkContract !== PAGE_SINK_CONTRACT) return 'the injected renderer does not declare that it writes every source byte as entity-encoded text';
  for (const [file, html] of files) {
    if (!file.endsWith('.html')) continue;
    const finding = pageSinkCspFinding(html);
    if (finding !== null) return `${file}: ${finding}`;
  }
  return null;
}

export interface RenderDeps extends ReviewDeps {
  readonly probe: CredentialProbe;
  readonly renderer?: DossierRenderer;
}

export type RenderStage = 'renderer' | 'run' | 'reverify' | 'not-briefed' | 'deadline' | 'draft' | 'screen' | 'object-read' | 'rederive' | 'sources' | 'render' | 'write';

export interface RenderRefusal {
  readonly command: 'render';
  readonly outcome: 'refused';
  readonly stage: RenderStage;
  readonly reason: string;
  readonly reasons?: readonly string[];
  /** The step guard's refusals with their machine codes, when the guard refused. */
  readonly refusals?: readonly ReverifyRefusal[];
  readonly objectRead?: ReturnType<GitObjectReadRefusal['toJSON']>;
  readonly disclosures: readonly string[];
}

export interface RenderReport {
  readonly format: typeof RENDER_REPORT_FORMAT;
  readonly command: 'render';
  readonly outcome: 'rendered';
  readonly run: string;
  readonly site: string;
  readonly draftRevision: number;
  readonly draftLayer: { readonly state: 'editorial-draft' } | { readonly state: 'unknown'; readonly reason: 'unconsented-source-or-provider'; readonly why: readonly string[] };
  readonly fidelityReview: { readonly counts: true; readonly packetSha256: string; readonly label: 'Observed' } | { readonly counts: false; readonly why: string };
  /** The rendered-design review, decided from the design packet of these pages; its digest is what a design verdict must name. */
  readonly designReview: { readonly counts: true; readonly packetSha256: string; readonly label: 'Observed' } | { readonly counts: false; readonly packetSha256: string; readonly why: string };
  readonly pages: number;
  readonly quotations: { readonly rendered: number; readonly withheld: number; readonly label: 'Observed' };
  readonly sources: { readonly admitted: number; readonly excluded: number };
  readonly credential: CredentialStepResult;
  readonly disclosures: readonly string[];
}

export type RenderResult = Outcome<RenderReport, RenderRefusal>;

const DISCLOSURES = [
  RECORDS_WITHIN_REACH,
  'Every quotation, source page, check result and review binding on the rendered pages was derived at this render from Git objects read by identifier at the pinned revision and re-hashed now; no stored byte range, check result or packet was used.',
  'Every value the pages show from Syzygy\'s stored records rather than re-deriving it is labelled Inferred.',
];

const list = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);
const text = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
const SUBJECT_JSON_LIMITS = Object.freeze({ maxBytes: 4 * 1024 * 1024, maxNodes: 500_000, maxDepth: 16 });

const EXCLUSION_REASON: Readonly<Record<ScreenExclusion, GenerationExclusionReason>> = {
  'denied-path': 'denied-path', 'secret-detector-match': 'secret-detector-match', 'unknown-extraction-class': 'unknown-extraction-class',
  'not-utf8-text': 'not-utf-8', 'active-content': 'active-content',
};

export async function renderRun(runDir: string, deps: RenderDeps): Promise<RenderResult> {
  const now = deps.now();
  let logRun: string | undefined;
  const refuse = (stage: RenderStage, reason: string, extra: Partial<RenderRefusal> = {}): RenderResult => {
    if (logRun !== undefined) logStep(logRun, 'render', now, { outcome: 'refused', stage, reason });
    return { ok: false, refusal: { command: 'render', outcome: 'refused', stage, reason, ...extra, disclosures: DISCLOSURES } };
  };
  if (deps.renderer === undefined) return refuse('renderer', NO_RENDERER);
  const opened = await openRun(runDir, deps.sources, now, 'nothing is rendered', deps.openReader ? { openReader: deps.openReader } : {});
  if (!opened.ok) return refuse(opened.stage, opened.reason, { ...(opened.reasons ? { reasons: opened.reasons } : {}), ...(opened.refusals ? { refusals: opened.refusals } : {}) });
  const { run, runId, subject, declared } = opened;
  logRun = run;
  const pinned = subject.pinnedRevision.commit;

  const credential = await credentialStepCheck(run, 'render', deps.probe, now);

  const draftRev = latestPassedDraft(run);
  if (!draftRev.ok) return refuse('draft', `nothing is rendered: ${draftRev.reason}`);
  let doc: Readonly<Record<string, unknown>>;
  try {
    const parsed: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(draftRev.bytes));
    if (!isRecord(parsed) || draftRev.bytes.byteLength > SUBJECT_JSON_LIMITS.maxBytes) throw new Error('not an object');
    doc = parsed;
  } catch {
    return refuse('draft', `draft revision ${draftRev.revision} is not one bounded JSON object`);
  }

  const screenLoad = await (deps.loadScreen ?? (() => loadDossierScreen(deps.sources.recordsRoot, now)))();
  if (!screenLoad.ok) return refuse('screen', screenLoad.why);
  const screen = screenLoad.screen;
  const reader = (deps.openReader ?? openPinnedObjectReader)({ gitDir: path.join(subject.clone.path, '.git'), revision: pinned });
  let derived: Derived;
  try {
    derived = await deriveFindings(doc, { pinned, screen, reader }, draftRules(pinned, declared.maxQuestions));
  } catch (cause) {
    if (cause instanceof GitObjectReadRefusal) return refuse('object-read', `an object at the pinned revision could not be read: ${cause.message}`, { objectRead: cause.toJSON() });
    throw cause;
  }
  if (derived.findings.length > 0) {
    return refuse('rederive', `draft revision ${draftRev.revision} passed its check, but checking it again at this render from the objects read now finds ${derived.findings.length} finding(s); the stored result is not trusted, so nothing is rendered`,
      { reasons: derived.findings.map((finding) => `${finding.kind} at ${finding.at}`) });
  }

  const review = await reviewOfRecord(opened, deps);
  const ruling = await deps.sources.rfc720Ruling();

  const built = buildLocalInput({ opened, doc, derived, review, ruling, screen, credential, algorithm: reader.algorithm });
  if (!built.ok) return refuse(built.stage, built.reason);

  const renderer = deps.renderer;
  const draw = (local: LocalRenderInput): ReadonlyMap<string, string> | string => {
    try { return renderer({ local, sources: built.sources }).files; } catch (cause) { return `the renderer refused the run: ${cause instanceof Error ? cause.message : 'unknown'}`; }
  };
  // The rendered-design review of record is decided from the pages this render draws, outside the review-status region, which is where
  // the decision is stated: draw once with the decision pending, decide it from those pages, then draw again with it stated, and refuse
  // unless the second drawing equals the first outside the region.
  const pending = draw(built.local);
  if (typeof pending === 'string') return refuse('render', pending);
  const reviewed = buildDesignPacket({ run, runId, pinnedRevision: pinned, files: pending });
  if (!reviewed.ok) return refuse('render', `the rendered pages cannot be compared outside the review-status region: ${reviewed.reason}`);
  const design = await designReviewOfRecord(opened, reviewed, { sources: deps.sources, now: () => now });
  const local: LocalRenderInput = { ...built.local, reviewStatus: built.local.reviewStatus.map((item) => (item.id === 'review-status/design' ? designStatusItem(design, run) : item)) };
  const files = draw(local);
  if (typeof files === 'string') return refuse('render', files);
  const published = buildDesignPacket({ run, runId, pinnedRevision: pinned, files });
  if (!published.ok || published.sha256 !== reviewed.sha256) {
    return refuse('render', 'stating the rendered-design review in the review-status region changed the pages outside that region, so the review of record cannot be decided from them');
  }
  // The first RFC7-20 condition, checked on the output itself: the disclosure on every page and in the machine view.
  const pagesMissing = [...files].filter(([file, html]) => file.endsWith('.html') && !html.includes('class="run-disclosure"')).map(([file]) => file);
  if (pagesMissing.length > 0 || !files.has('machine.json')) return refuse('render', `the rendered site does not carry the run disclosure on every page and in the machine view (${pagesMissing.join(', ') || 'machine.json'})`);
  // The code-content exemption (policy version 3) admitted some bodies without the active-content scan. It holds at these pages only
  // while they meet its renderCondition; where that cannot be confirmed, each such body is scanned as before for these pages, and one with
  // a finding is excluded whole here: a quoted or cited body cannot leave the pages it is drawn on, so nothing is rendered.
  const scannedAsBefore = [...derived.admitted].filter(([, blob]) => screen.screenBody(blob.raw) !== undefined).map(([cited]) => cited);
  const unconfirmed = scannedAsBefore.length === 0 ? null : pageSinkUnconfirmed(renderer, files);
  if (unconfirmed !== null) {
    return refuse('render', `${scannedAsBefore.length} cited blob(s) were admitted only under the screening policy's code-content exemption, and these pages cannot be confirmed to meet its render condition (${unconfirmed}); scanned as before for these pages they hold active content, so nothing is rendered`);
  }

  let site: string;
  try { site = writeSite(run, files); } catch (cause) { return refuse('write', `the site could not be written (${cause instanceof Error && cause.message.startsWith('invalid') ? cause.message : errno(cause)})`); }
  const quoted = built.local.blocks;
  const rendered = [...quoted.values()].reduce((n, block) => n + block.segments.filter((part) => part.kind === 'quotation').length, 0);
  const withheldQuotes = [...quoted.values()].reduce((n, block) => n + block.segments.filter((part) => part.kind === 'withheld').length, 0);
  const report: RenderReport = {
    format: RENDER_REPORT_FORMAT,
    command: 'render',
    outcome: 'rendered',
    run,
    site,
    draftRevision: draftRev.revision,
    draftLayer: built.local.draftLayer.state === 'editorial-draft' ? { state: 'editorial-draft' } : built.local.draftLayer,
    fidelityReview: review.counts ? { counts: true, packetSha256: review.packetSha256, label: 'Observed' } : { counts: false, why: review.why },
    designReview: design.counts ? { counts: true, packetSha256: design.packetSha256, label: 'Observed' } : { counts: false, packetSha256: reviewed.sha256, why: design.why },
    pages: [...files.keys()].filter((file) => file.endsWith('.html')).length,
    quotations: { rendered: built.local.draftLayer.state === 'editorial-draft' ? rendered : 0, withheld: withheldQuotes, label: 'Observed' },
    sources: { admitted: built.sources.filter((source) => !source.exclusion.excluded).length, excluded: built.sources.filter((source) => source.exclusion.excluded).length },
    credential,
    disclosures: credential.required ? [...DISCLOSURES, CREDENTIAL_CHECK_DISCLOSURE] : DISCLOSURES,
  };
  logStep(run, 'render', now, { outcome: 'rendered', site: path.relative(run, site), draftRevision: draftRev.revision, draftLayer: report.draftLayer.state });
  return { ok: true, report };
}

/** Write the site into a new numbered directory under `site/`, through a staging directory renamed into place only when every file is
 * written. Returns the directory. */
function writeSite(run: string, files: ReadonlyMap<string, string>): string {
  for (const file of files.keys()) if (!isDossierPagePath(file)) throw new Error('invalid-output-path');
  const root = path.join(run, RUN_LAYOUT.site);
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  const taken = fs.readdirSync(root).flatMap((name) => (/^(0|[1-9][0-9]*)$/.test(name) ? [Number(name)] : []));
  const target = path.join(root, String(taken.length === 0 ? 0 : Math.max(...taken) + 1));
  const staging = path.join(root, `.partial-${randomBytes(8).toString('hex')}`);
  fs.mkdirSync(staging, { mode: 0o700 });
  try {
    for (const [file, content] of files) {
      const out = path.join(staging, file);
      fs.mkdirSync(path.dirname(out), { recursive: true, mode: 0o700 });
      fs.writeFileSync(out, content, { mode: 0o600, flag: 'wx' });
    }
    if (fs.existsSync(target)) throw new Error('site-directory-exists');
    fs.renameSync(staging, target);
    return target;
  } catch (cause) {
    fs.rmSync(staging, { recursive: true, force: true });
    throw cause;
  }
}

interface BuildInputs {
  readonly opened: Extract<OpenedRun, { ok: true }>;
  readonly doc: Readonly<Record<string, unknown>>;
  readonly derived: Derived;
  readonly review: ReviewOfRecord;
  /** The rendered-design review of record; absent while it is not yet decided, before the pages it is decided from are rendered. */
  readonly design?: DesignReviewOfRecord;
  readonly ruling: Awaited<ReturnType<RenderDeps['sources']['rfc720Ruling']>>;
  readonly screen: DossierScreen;
  readonly credential: CredentialStepResult;
  readonly algorithm: 'sha1' | 'sha256';
}

type Built = { readonly ok: true; readonly local: LocalRenderInput; readonly sources: readonly GenerationSource[] } | { readonly ok: false; readonly stage: RenderStage; readonly reason: string };

/** How much of a redacted-span body screening kept: partially retained, or, where the emptied body no longer matches a detector and
 * `redactBody` withholds every line, retained with every line withheld (syzygy-mea.3 round-1 note 6). Never "not retained". */
export const redactedExtent = ({ withheld, lines }: { readonly withheld: number; readonly lines: number }): string => (withheld >= lines
  ? `retained by screening as redacted-span with every one of its ${lines} line(s) withheld`
  : `partially retained by screening as redacted-span: ${withheld} of its ${lines} line(s) withheld`);

/** A redacted body's provenance as the discovery row states it: the detectors that matched and the withheld line ranges, never the
 * matched text (syzygy-ts8u). */
export const redactionDetails = (redaction: BlobRedaction | undefined): string[] => (redaction === undefined ? [] : [
  `detectors matched: ${redaction.detectorIds.join(', ')}`,
  `withheld lines: ${redaction.withheldLineRanges.map(([first, last]) => (first === last ? `${first}` : `${first}\u2013${last}`)).join(', ')}`,
]);

/** The adapter from the checked local draft to the renderer's operator-agent input. */
export function buildLocalInput(inputs: BuildInputs): Built {
  const { opened, doc, derived, review, design, ruling, screen, credential, algorithm } = inputs;
  const { run, runId, subject, declared } = opened;
  const pinned = subject.pinnedRevision.commit;
  const clean = (value: string): string => (screen.screenBody(value) === 'secret-detector-match' ? WITHHELD_TEXT : value);
  const shownPath = (repositoryPath: string): string => (screen.screenPath(repositoryPath) === 'secret-detector-match' ? SECRET_PATH : repositoryPath);

  // The class gate (`class-gate.ts`): the design packet carries these pages to a review session, so a blob screening admitted under a
  // class the run's statement does not list is neither quoted nor put on a source page; it is a counted row naming the class.
  const consented = opened.contentClasses;
  const withheldClass = new Map<string, string>();
  for (const repositoryPath of derived.admitted.keys()) {
    const missing = unconsentedClass(screen.contentClass(repositoryPath), consented);
    if (missing !== undefined) withheldClass.set(repositoryPath, missing);
  }
  // A body retained as redacted-span is partially retained, never "not retained" (syzygy-ts8u): its withheld and total line counts.
  const redacted = new Map([...derived.admitted].flatMap(([repositoryPath, blob]) => (blob.withheld === undefined ? [] : [[repositoryPath, { withheld: blob.withheld.length, lines: blob.retainedLines!.length }] as const])));
  const admitted = new Map([...derived.admitted].filter(([repositoryPath]) => !withheldClass.has(repositoryPath)));

  // Sources: every cited blob read now and admitted (whole, or in pieces when too long to quote whole), and every cited blob screening
  // excluded or the class gate withheld as a counted row with its reason. A blob whose path a secret detector matches is named nowhere.
  const sources: GenerationSource[] = [];
  const pieces = new Map<string, GenerationSource[]>();
  const sourceIdOf = (repositoryPath: string): string => `src-${sha256(repositoryPath).slice(0, 24)}`;
  for (const [repositoryPath, blob] of [...admitted].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    const identity = { sourceId: sourceIdOf(repositoryPath), repositoryId: subject.repository.repositoryId, revision: pinned, path: repositoryPath, objectId: blob.objectId, evaluationId: runId };
    const own = blob.withheld === undefined ? generationSourcesForBody({ ...identity, body: blob.raw })
      : generationSourcesForRedactedBody({ ...identity, projection: blob.projection!, policySha256: screen.policySha256 });
    pieces.set(repositoryPath, [...own]);
    sources.push(...own);
  }
  // The excluded rows' identifiers are keyed by the run and its pinned revision, not by a fresh key per render, so a later render of the
  // same subject names them alike and a rendered-design review of these pages survives it. The key hides nothing the page does not show:
  // each such row names its path, and no row is written for a path a secret detector matches.
  const runKey = createHash('sha256').update(`polaris-dossier excluded-source key\u0000${runId}\u0000${pinned}`).digest();
  for (const cited of derived.citedBlobs) {
    if (cited.path === null || cited.objectId === null) continue;
    // The closed exclusion vocabulary has no class reason; a withheld body is one not carried into generation, and its class is named on
    // the discovery page's row for it.
    const reason = cited.outcome !== 'admitted' ? EXCLUSION_REASON[cited.outcome] : withheldClass.has(cited.path) ? 'body-not-retained-for-generation' : undefined;
    if (reason === undefined) continue;
    sources.push({
      sourceId: excludedSourceId(runKey, cited.path), repositoryId: subject.repository.repositoryId, revision: pinned, path: cited.path, objectId: cited.objectId,
      evaluationId: runId, classificationBasis: cited.read ? 'body' : 'path-only', exclusion: { excluded: true, reason }, spans: [],
    });
  }
  if (sources.length === 0) return { ok: false, stage: 'sources', reason: 'the draft cites no blob Syzygy can name, so there is no source population to render' };
  const byteOf = (raw: string, line: number): number => {
    let at = 0;
    for (let seen = 1; seen < line; seen++) {
      const next = raw.slice(at).search(/\r\n|\r|\n/u);
      if (next === -1) return Buffer.byteLength(raw);
      at += next + (raw.slice(at + next, at + next + 2) === '\r\n' ? 2 : 1);
    }
    return Buffer.byteLength(raw.slice(0, at));
  };
  const pieceAt = (repositoryPath: string, byte: number): GenerationSource | undefined => {
    const own = pieces.get(repositoryPath);
    if (own === undefined) return undefined;
    return own.find(piece => piece.redaction === undefined
      ? piece.segment === undefined || (byte >= piece.segment.start && byte < piece.segment.end)
      : piece.spans.some(span => { const [start, end] = generationSpanRange(piece, span); return byte >= start && byte < end; }));
  };
  const citedSources = (value: Readonly<Record<string, unknown>>): string[] => [...new Set(list(value['citations']).flatMap((citation) => {
    if (!isRecord(citation)) return [];
    const cited = text(citation['path']);
    const blob = cited === undefined ? undefined : admitted.get(cited);
    const piece = blob === undefined ? undefined : pieceAt(cited!, blob.lineByteOffsets?.[(typeof citation['startLine'] === 'number' ? citation['startLine'] : 1) - 1] ?? byteOf(blob.raw, typeof citation['startLine'] === 'number' ? citation['startLine'] : 1));
    return piece === undefined ? [] : [piece.sourceId];
  }))];
  const anchorOf = (source: GenerationSource, start: number, end: number): EvidenceAnchor => ({
    targetClass: 'evidence-artifact-identifier-with-integrity-digest', identifier: source.objectId!, algorithm, fragment: { start, end }, targetState: pinned, pathLabel: source.path,
  });
  const sourceAnchors = new Map(sources.filter((source) => !source.exclusion.excluded && source.spans.length > 0).map((source) => {
    const [start, end] = generationSpanRange(source, source.spans[0]!);
    return [source.sourceId, anchorOf(source, start, end)] as const;
  }));

  // Claim blocks: segments from the agent's text with every quotation replaced by Syzygy's located bytes, and the marking.
  // A quotation verified against a body the class gate withholds is withheld like one from an excluded file, naming the class.
  const verified = new Map(derived.quotations.filter((quotation) => !withheldClass.has(quotation.path)).map((quotation) => [`${quotation.blockId}\u0000${quotation.index}`, quotation]));
  const classOf = new Map(derived.quotations.filter((quotation) => withheldClass.has(quotation.path)).map((quotation) => [`${quotation.blockId}\u0000${quotation.index}`, withheldClass.get(quotation.path)!]));
  const excluded = new Set([...derived.excludedContent.map((quotation) => `${quotation.blockId}\u0000${quotation.index}`), ...classOf.keys()]);
  const executions = new Map(list(doc['executions']).flatMap((entry) => (isRecord(entry) && text(entry['id']) !== undefined ? [[text(entry['id'])!, clean(text(entry['command']) ?? '')] as const] : [])));
  const support = review.counts ? review.verdict.blockSupport : {};
  const blocks = new Map<string, LocalBlock>();
  for (const block of collectBlocks(doc).filter((candidate) => candidate.textKey === 'text')) {
    const value = block.value;
    const id = text(value['id'])!;
    const prose = text(value['text']) ?? '';
    const label = value['label'];
    let segments: LocalSegment[] = [];
    let at = 0;
    let withheld = false;
    const unconsented = new Set<string>();
    leadInQuotationSpans(prose).forEach((span, index) => {
      segments.push({ kind: 'prose', text: prose.slice(at, span.open) });
      const key = `${id}\u0000${index}`;
      const found = verified.get(key);
      if (found !== undefined) {
        const blob = admitted.get(found.path)!;
        const [start, end] = found.byteRange;
        const piece = pieceAt(found.path, start)!;
        segments.push({ kind: 'quotation', sourceId: piece.sourceId, start, end, text: generationSourceTextAt(piece, start, end)!, anchor: anchorOf(piece, start, end) });
      } else {
        if (!excluded.has(key)) throw new Error(`render: quotation ${index + 1} of block ${id} was neither verified nor excluded at this render`);
        segments.push({ kind: 'withheld', reason: 'excluded-content' });
        withheld = true;
        if (classOf.has(key)) unconsented.add(classOf.get(key)!);
      }
      at = span.close + 1;
    });
    segments.push({ kind: 'prose', text: prose.slice(at) });
    const secret = screen.screenBody(prose) === 'secret-detector-match';
    if (secret) segments = [{ kind: 'prose', text: WITHHELD_TEXT }];
    segments = segments.filter((part) => part.kind !== 'prose' || part.text !== '');
    const named = list(value['executionIds']).flatMap((executionId) => (typeof executionId === 'string' && executions.has(executionId) ? [{ id: executionId, command: executions.get(executionId)! }] : []));
    const unknown = (reason: string, basis: string): LocalBlock => ({ marking: 'unknown', unknownReason: reason, basis, segments, executions: named });
    if (label === 'non-normative') blocks.set(id, { marking: 'non-normative', unknownReason: null, basis: 'the agent marks this block non-normative: it claims nothing from a source', segments, executions: [] });
    else if (label === 'unknown') blocks.set(id, unknown(text(value['reason']) ?? 'missing-evidence', 'the agent labels this block Unknown'));
    else if (withheld || secret) {
      blocks.set(id, unknown('excluded-content', secret ? 'a secret detector matches its text, so it is withheld'
        : unconsented.size > 0 ? `a quotation it rests on is from a ${[...unconsented].sort().join(' or ')} file, ${unconsentedText([...unconsented].sort().join(' or '), consented).replace(/^withheld/u, 'which is withheld')}, so the quotation is not shown`
          : 'a quotation it rests on is from a file screening excludes, so the quotation is neither verified nor shown'));
    }
    else if (support[id] === 'supported') {
      blocks.set(id, { marking: 'inferred', unknownReason: null, basis: 'the agent\'s claim, which the counted fidelity review judged supported by the spans it cites', segments, executions: named });
    } else {
      blocks.set(id, unknown('missing-evidence', review.counts ? `the counted fidelity review judged it ${support[id] ?? 'not at all'}, not supported` : `no fidelity review counts for this draft: ${review.why}`));
    }
  }

  // The draft in the renderer's shape. Only admitted sources are cited; a block whose every citation is excluded cites none.
  const plain = (id: string): string => {
    const block = blocks.get(id);
    const joined = block === undefined ? '' : block.segments.map((part) => (part.kind === 'withheld' ? '[withheld]' : part.text)).join('');
    return joined === '' ? '[no text]' : joined;
  };
  const paragraph = (value: unknown): DraftParagraph => {
    const record = isRecord(value) ? value : {};
    return { id: text(record['id'])!, text: plain(text(record['id'])!), sourceIds: record['label'] === 'non-normative' ? [] : citedSources(record) };
  };
  const tree = (values: unknown): DraftBlock[] => list(values).map((value) => ({ ...paragraph(value), children: list(isRecord(value) ? value['children'] : []).map(paragraph) }));
  const disposition = (value: unknown): DossierDraft['sections'][number]['disposition'] => {
    const record = isRecord(value) ? value : {};
    if (record['kind'] === 'produced') return { kind: 'produced', assetIds: list(record['assetIds']).filter((id): id is string => typeof id === 'string') };
    return { kind: record['kind'] === 'omitted' ? 'omitted' : 'unresolved', reason: clean(text(record['reason']) ?? ''), references: citedSources(record) };
  };
  const title = (value: unknown): string => clean(text(value) ?? '');
  const draft: DossierDraft = {
    title: title(doc['title']),
    introduction: paragraph(doc['introduction']),
    sections: list(doc['sections']).filter(isRecord).map((section) => ({ id: text(section['id'])!, title: title(section['title']), paragraphs: tree(section['paragraphs']), disposition: disposition(section['disposition']) })),
    diagrams: list(doc['diagrams']).filter(isRecord).map((diagram) => ({
      id: text(diagram['id'])!, title: title(diagram['title']), sectionId: text(diagram['sectionId'])!, kind: diagram['kind'] as DossierDraft['diagrams'][number]['kind'], relationship: title(diagram['relationship']),
      nodes: list(diagram['nodes']).filter(isRecord).map((node) => ({ id: text(node['id'])!, label: title(node['label']), sourceIds: citedSources(node), epistemic: node['epistemic'] === 'inferred' ? 'inferred' as const : 'unknown' as const })),
      edges: list(diagram['edges']).filter(isRecord).map((edge) => ({ id: text(edge['id'])!, from: text(edge['from'])!, to: text(edge['to'])!, label: title(edge['label']), sourceIds: citedSources(edge), epistemic: edge['epistemic'] === 'inferred' ? 'inferred' as const : 'unknown' as const })),
      disposition: disposition(diagram['disposition']),
    })),
    deepDives: list(doc['deepDives']).filter(isRecord).map((dive) => ({ id: text(dive['id'])!, title: title(dive['title']), sectionId: text(dive['sectionId'])!, paragraphs: tree(dive['paragraphs']), disposition: disposition(dive['disposition']) })),
    unresolved: list(doc['unresolved']).filter(isRecord).map((item) => ({ question: title(item['question']), reason: title(item['reason']), references: citedSources(item) })),
  };

  // The run's own pages.
  const understanding = isRecord(doc['understanding']) ? doc['understanding'] : {};
  const understandingItem = (prefix: string, value: unknown): LocalPageItem => {
    const record = isRecord(value) ? value : {};
    const unknown = record['label'] === 'unknown';
    return {
      id: `${prefix}/${text(record['id'])!}`, marking: unknown ? 'unknown' : 'inferred', unknownReason: unknown ? text(record['reason']) ?? 'missing-evidence' : null,
      title: text(record['id'])!, text: clean(text(record['statement']) ?? ''), details: [`Scope: ${clean(text(record['scope']) ?? '')}`], sourceIds: citedSources(record),
    };
  };
  const glossary = list(understanding['terminology']).map((value) => understandingItem('glossary', value));
  const understandingPage: LocalPage = {
    path: 'understanding.html', title: 'Understanding',
    intro: 'The agent\'s understanding record, which it reports forming before it drafted the argument (that order is its own report). Every item is its self-reported understanding: Inferred where it cites the files it rests on, Unknown with its reason where it could not be established.',
    groups: UNDERSTANDING_ITEMS.map((key) => ({ id: `understanding-${key}`, heading: UNDERSTANDING_HEADINGS[key], note: 'Self-reported by the agent; Inferred or Unknown.', empty: 'No entry.', items: list(understanding[key]).map((value) => understandingItem('understanding', value)) })),
  };
  const discovery = isRecord(doc['discovery']) ? doc['discovery'] : {};
  const reported = (part: string): LocalPageItem[] => list(discovery[part]).filter(isRecord).map((entry, i) => ({
    id: `discovery/${part}/${i + 1}`, marking: 'inferred', unknownReason: null, title: shownPath(text(entry['path']) ?? ''), text: clean(text(entry['reason']) ?? ''), details: [], sourceIds: [],
  }));
  const inspected = list(discovery['inspected']).filter((entry): entry is string => typeof entry === 'string');
  const observedReads: LocalPageItem[] = derived.citedBlobs.map((cited, i) => ({
    id: `discovery/read/${i + 1}`, marking: 'observed', unknownReason: null,
    title: cited.path === null ? SECRET_PATH : cited.path,
    text: cited.outcome !== 'admitted' ? `${cited.read ? 'read at this render and re-hashed' : 'named by the pinned tree and not read'}; excluded by screening (${cited.outcome})`
      : cited.path !== null && withheldClass.has(cited.path) ? `read at this render, re-hashed, and admitted by screening as ${withheldClass.get(cited.path)!}; ${unconsentedText(withheldClass.get(cited.path)!, consented)} (${CLASS_NOT_CONSENTED})`
        : cited.path !== null && redacted.has(cited.path) ? `read at this render, re-hashed, and ${redactedExtent(redacted.get(cited.path)!)}; each withheld run is marked on its source page; surviving spans retain their original coordinates`
        : 'read at this render, re-hashed, and admitted by screening',
    details: [`object ${cited.objectId === null ? '(not shown)' : `${algorithm}:${cited.objectId}`}`, `revision ${pinned}`, ...redactionDetails(cited.redaction)],
    sourceIds: cited.outcome === 'admitted' && cited.path !== null ? (pieces.get(cited.path) ?? []).slice(0, 1).map((source) => source.sourceId) : [],
  }));
  const discoveryPage: LocalPage = {
    path: 'discovery.html', title: 'Discovery',
    intro: 'Two populations, kept apart. The first is the agent\'s own account of what it read, selected and set aside: self-reported, Inferred, never complete or verified, and no Observed coverage or not-read figure is drawn from it. The second is the set of objects this render itself read at the pinned revision, each re-hashed: Observed. Which objects earlier steps read is not shown.',
    groups: [
      { id: 'discovery-inspected', heading: 'Inspected, as the agent reports', note: 'Self-reported; Inferred.', empty: 'The agent reports no inspected path.', items: inspected.length === 0 ? [] : [{ id: 'discovery/inspected', marking: 'inferred', unknownReason: null, title: null, text: `The agent reports inspecting ${inspected.length} path(s).`, details: inspected.map(shownPath), sourceIds: [] }] },
      { id: 'discovery-selected', heading: 'Selected, as the agent reports', note: 'Self-reported, with the agent\'s reasons; Inferred.', empty: 'None reported.', items: reported('selected') },
      { id: 'discovery-excluded', heading: 'Excluded, as the agent reports', note: 'Self-reported, with the agent\'s reasons; Inferred.', empty: 'None reported.', items: reported('excluded') },
      { id: 'discovery-unresolved', heading: 'Could not resolve, as the agent reports', note: 'Self-reported, with the agent\'s reasons; Inferred.', empty: 'None reported.', items: reported('unresolved') },
      { id: 'discovery-deferred', heading: 'Deferred, as the agent reports', note: 'Self-reported, with the agent\'s reasons; Inferred.', empty: 'None reported.', items: reported('deferred') },
      { id: 'discovery-stopping', heading: 'Stopping reason, as the agent reports', note: 'Self-reported; Inferred.', empty: 'None reported.', items: [{ id: 'discovery/stopping-reason', marking: 'inferred', unknownReason: null, title: null, text: clean(text(discovery['stoppingReason']) ?? ''), details: [], sourceIds: [] }] },
      { id: 'discovery-read', heading: 'Read by this render', note: `Every cited object this render read by identifier at revision ${pinned}, its identifier recomputed from the bytes, with its screening outcome; Observed at this render.`, empty: 'This render read no object.', items: observedReads },
    ],
  };
  const clarificationsPage: LocalPage = {
    path: 'clarifications.html', title: 'Clarifications',
    intro: 'The questions the agent asked and the answers it records, each attributed to the operator. That the operator gave the answer is the agent\'s record: Inferred.',
    groups: [{ id: 'clarifications-asked', heading: 'Questions and answers', note: 'As the draft records them; Inferred.', empty: 'The agent recorded no question.', items: list(doc['clarifications']).filter(isRecord).map((entry) => ({
      id: `clarification/${text(entry['id'])!}`, marking: 'inferred' as const, unknownReason: null, title: clean(text(entry['question']) ?? ''), text: clean(text(entry['answer']) ?? ''),
      details: [`Answer kind: ${text(entry['answerKind']) ?? ''}`, `Consequence: ${clean(text(entry['consequence']) ?? '')}`, ...list(entry['options']).flatMap((option) => (typeof option === 'string' ? [`Option: ${clean(option)}`] : [])), 'Answered by the operator, as the agent records it'],
      sourceIds: citedSources({ citations: entry['evidence'] }),
    })) }],
  };
  const executionList = list(doc['executions']).filter(isRecord);
  const flags = executionFlags(executionList, subject.clone.path, storedBriefArm(run));
  const executionsPage: LocalPage = {
    path: 'executions.html', title: 'Executions',
    intro: 'Every command the agent reports having run. Syzygy cannot observe what the agent ran and ran nothing itself: the list is the agent\'s own report, Inferred, and not complete or Observed.',
    groups: [{ id: 'executions-reported', heading: 'Reported commands', note: 'Self-reported; Inferred.', empty: 'The agent reports running no command.', items: executionList.map((entry, index) => ({
      id: `execution/${text(entry['id'])!}`, marking: 'inferred' as const, unknownReason: null, title: clean(text(entry['command']) ?? ''), text: clean(text(entry['purpose']) ?? ''),
      details: [
        `Working directory: ${text(entry['workingDirectory']) === undefined ? 'not reported' : clean(text(entry['workingDirectory'])!)}`,
        ...(flags.applies ? [`Scope, as the agent states it: ${flags.commands[index]!.scope === 'not-stated' ? 'not stated' : flags.commands[index]!.scope}`] : []),
        ...(flags.applies ? flags.commands[index]!.flags.map((flag) => `Flagged (Inferred, self-reported): ${flag.detail}`) : []),
      ], sourceIds: [],
    })) }],
  };
  const fidelityContinuation = review.counts ? continuationOf(run, 'fidelity', review.session, review.number, review.packetSha256, review.sessionId.value) : null;
  const reviewItems: LocalPageItem[] = review.counts ? [
    { id: 'review/fidelity/binding', marking: 'observed', unknownReason: null, title: 'Fidelity review binding', text: `Syzygy rebuilt the fidelity packet from the frozen draft and inventory at this render; its digest is ${review.packetSha256}, and the counted verdict names that digest.`, details: [], sourceIds: [] },
    { id: 'review/fidelity/verdict', marking: 'inferred', unknownReason: null, title: 'Fidelity verdict', text: `The review session declares the draft ${review.verdict.readiness}${review.verdict.blocking ? ', beside a blocking finding' : ''}.`,
      details: [`Review session identifier ${review.sessionId.value}, as that session declares it`, `Launch form ${review.launchForm.value}, as the operator declares it`, ...review.inferred.basis], sourceIds: [] },
    // A reviewer that continued across revisions is disclosed (owner direction POLARIS-DOSSIER-WAITING-SESSIONS-2026-10-08).
    { id: 'review/fidelity/continuation', marking: 'inferred', unknownReason: null, title: fidelityContinuation!.continuing ? 'Continuing reviewer' : 'Reviewer continuity', text: fidelityContinuation!.text,
      details: [`From ${fidelityContinuation!.basis}`], sourceIds: [] },
  ] : [{ id: 'review/fidelity/none', marking: 'unknown', unknownReason: 'missing-evidence', title: 'Fidelity review', text: `No fidelity review counts for this draft: ${review.why}.`, details: [], sourceIds: [] }];
  const reviewPage: LocalPage = {
    path: 'review.html', title: 'Review',
    intro: 'The fidelity review of record. Only the packet Syzygy rebuilt, its digest and that the verdict names it are Observed; everything the verdict says is the review session\'s, Inferred. That the session read the packet unaltered, or had nothing else, is not observable.',
    groups: [
      { id: 'review-fidelity', heading: 'Fidelity review', note: 'Rebuilt and bound at this render.', empty: 'None.', items: reviewItems },
      // This page is part of what the design review reviews, so it never states that review's status: only the region does.
      { id: 'review-design', heading: 'Rendered-design review', note: 'Of these rendered pages, excluding the review-status region.', empty: DESIGN_REVIEW_WHERE, items: [] },
    ],
  };

  // RFC7-20 as the owner's reading applies it. The disclosure condition is checked on the rendered output (renderRun); the tool and
  // provider are declared in the run record, which refuses any run without them; every quotation is located at this render.
  const why: string[] = [];
  if (ruling.state !== 'ok') why.push(`the owner's reading of RFC7-20 (POLARIS-DOSSIER-LOCAL-AGENT-RULINGS-2026-10-05, item 1) is not in force: ${ruling.why}`);
  if (declared.agentTool.trim() === '' || declared.agentProvider.trim() === '') why.push('the agent tool or provider is not declared and recorded');
  const draftLayer: LocalDraftLayer = why.length === 0 && ruling.state === 'ok'
    ? { state: 'editorial-draft', ruling: ruling.record, inferenceProvenance: { modelIdentity: declared.model, modelVersion: declared.modelVersion, declaredBy: 'operator', label: 'Inferred' } }
    : { state: 'unknown', reason: 'unconsented-source-or-provider', why };

  const quotationCount = [...blocks.values()].reduce((n, block) => n + block.segments.filter((part) => part.kind === 'quotation').length, 0);
  const disclosure = disclosureItems({ opened, draftLayer, executionList, flags, quotationCount, credential, clean, run });
  const reviewStatus: LocalDisclosureItem[] = [
    review.counts
      ? { id: 'review-status/fidelity', text: `Fidelity review: one counts, bound to packet ${review.packetSha256} rebuilt at this render; its verdict, ${review.verdict.readiness}, is the review session's.${fidelityContinuation!.continuing ? ' Its reviewer continued across revisions (see the review page).' : ''}`, label: 'Inferred' }
      : { id: 'review-status/fidelity', text: `Fidelity review: none counts (${review.why}).`, label: 'Unknown' },
    designStatusItem(design, run),
  ];

  const editorial = draftLayer.state === 'editorial-draft';
  const pages = editorial ? [understandingPage, discoveryPage, clarificationsPage, executionsPage, reviewPage] : [discoveryPage, executionsPage, reviewPage];
  return {
    ok: true,
    sources,
    local: {
      draft, withheldTitle: `Dossier of ${subject.repository.url} at ${pinned.slice(0, 12)}`, draftLayer, blocks, glossary, disclosure,
      sourceAnchors, pages, reviewStatus,
    },
  };
}

const DESIGN_REVIEW_WHERE = 'Whether a rendered-design review counts for these pages is stated in the review-status region at the foot of every page, the only part of a page a later render may change without retiring that review; this page is part of what that review reviews, so it does not repeat it.';

/** The review-status region's line for the rendered-design review. */
export function designStatusItem(design: DesignReviewOfRecord | undefined, run: string): LocalDisclosureItem {
  if (design === undefined) return { id: 'review-status/design', text: 'Rendered-design review: not yet decided at this render.', label: 'Unknown' };
  if (!design.counts) return { id: 'review-status/design', text: `Rendered-design review: none counts (${design.why}).`, label: 'Unknown' };
  // The design review's status lives only in this region, so its reviewer's continuity, continuing or not, is disclosed here, never on a
  // reviewed page.
  const continuation = continuationOf(run, 'design', design.session, design.number, design.packetSha256, design.sessionId.value);
  return { id: 'review-status/design', text: `Rendered-design review: one counts, bound to packet ${design.packetSha256}, which Syzygy built at this render from these pages outside this region; its verdict, ${design.verdict.readiness}${design.verdict.blocking ? ' beside a blocking finding' : ''}, is the review session's. ${continuation.text} (Inferred, from ${continuation.basis}.)`, label: 'Inferred' };
}

const UNDERSTANDING_HEADINGS: Readonly<Record<(typeof UNDERSTANDING_ITEMS)[number], string>> = {
  purpose: 'Purpose', beneficiary: 'Beneficiary', proposition: 'Proposition', capabilities: 'Capabilities', components: 'Components and relationships',
  choices: 'Choices and alternatives', tradeOffs: 'Trade-offs', limits: 'Limits', terminology: 'Terminology', contradictions: 'Contradictory accounts', openQuestions: 'Open questions',
};

/** The run disclosure REQ-polaris-generation-036 requires on every page and in the machine view. */
function disclosureItems(inputs: {
  readonly opened: Extract<OpenedRun, { ok: true }>; readonly draftLayer: LocalDraftLayer; readonly executionList: readonly Readonly<Record<string, unknown>>[];
  readonly flags: ExecutionFlags; readonly quotationCount: number; readonly credential: CredentialStepResult; readonly clean: (value: string) => string; readonly run: string;
}): LocalDisclosureItem[] {
  const { opened, draftLayer, executionList, flags, quotationCount, credential, clean, run } = inputs;
  const { subject, declared } = opened;
  const brief = readRecord(path.join(run, RUN_LAYOUT.briefRecord));
  const rule = isRecord(brief) && isRecord(brief['executionRule']) ? brief['executionRule'] : {};
  const commands = executionList.map((entry) => clean(text(entry['command']) ?? ''));
  const items: LocalDisclosureItem[] = [
    { id: 'mode', text: 'Authoring mode: operator-agent. The operator\'s own agent session read the clone and wrote the draft; Syzygy pinned the revision, checked the draft and rendered these pages.', label: null },
    { id: 'agent', text: `Agent tool ${declared.agentTool} ${declared.agentToolVersion}, provider ${declared.agentProvider}, model ${declared.model}${declared.modelVersion === null ? ' (version not shown by the agent tool)' : ` ${declared.modelVersion}`}, as the operator declared them; no provider-reported model version exists in this mode.`, label: 'Inferred' },
    { id: 'unrestricted-reading', text: 'The agent read the clone without restriction: neither the content classes a per-project statement names nor the observing project\'s classification and screening policies bound what it read or sent to its provider. They bind only what Syzygy reads, stores and renders.', label: null },
    { id: 'read-account', text: 'The agent\'s account of what it read is its own report (Discovery): self-reported, never complete or verified.', label: 'Inferred' },
    rule['arm'] === 'permitting'
      ? { id: 'execution-rule', text: `The brief permitted building and running the observed project from the authoring session, under the owner's execution choice it names (who entered the choice is the operator's declaration). What that costs, as D9 states: ${isRecord(rule['cost']) ? text(rule['cost']['text']) ?? '' : ''}`, label: 'Inferred' }
      : { id: 'execution-rule', text: 'The brief carried SEC-3\'s rule: no building or running of the observed project outside an explicit, opt-in execution profile, and it granted none.', label: 'Inferred' },
    { id: 'reported-commands', text: commands.length === 0 ? 'The agent reports building or running nothing.' : `The agent reports running ${commands.length} command(s), whether or not a claim rests on them: ${commands.join('; ')}. This is its own report, not complete and not observed.`, label: 'Inferred' },
    ...(flags.applies ? [{ id: 'execution-flags', text: `Flagged reported commands: ${flags.flagged} of ${flags.commands.length}, each flag shown beside its command on the Executions page: a command without a reported working directory, with one outside the clone, or that the agent states falls outside the owner's execution choice. ${EXECUTION_FLAGS_BASIS}`, label: 'Inferred' as const }] : []),
    { id: 'no-provider-call', text: 'Syzygy made no provider call and transmitted no project content.', label: null },
    { id: 'pinned-revision', text: `Pinned revision ${subject.pinnedRevision.commit} of ${subject.repository.url}; which consented revision the run was pinned to rests on the stored run record.`, label: 'Inferred' },
    { id: 'pinned-revision-verified', text: `At this render Syzygy verified again that the in-force observation consent ${opened.revision.consentRecord} names the pinned revision${opened.revision.label === null ? ', under more than one label' : ` as ${opened.revision.label}`}, and that the source-acquisition registry entry and the screening policy are in force.`, label: 'Observed' },
    { id: 'quotations', text: `Each of the ${quotationCount} quotation(s) shown was located by Syzygy at this render in the blob it read at the pinned revision, the object identifiers recomputed from the bytes read; never the agent's copy or a stored byte range.`, label: 'Observed' },
    { id: 'stored-records', text: 'Every value shown from Syzygy\'s stored records rather than re-derived at this render is Inferred: the repair-cycle count, the instants of earlier steps, the run record\'s history, the pinned revision chosen, the brief and the execution rule it carried, the execution choice and who entered it, the per-project statement cited, session identifiers and launch forms, and which objects earlier steps read.', label: 'Inferred' },
    { id: 'records-within-reach', text: `The records the gates read and the run directory lie within the agent sessions' write reach: ${RECORDS_WITHIN_REACH}.`, label: null },
    { id: 'unattributed-execution', text: `This run has no scheduler work item: ${NO_WORK_ITEM_REASON}.`, label: null },
    draftLayer.state === 'editorial-draft'
      ? { id: 'draft-layer', text: `Draft layer: an editorial draft under the owner's reading of RFC7-20 (${draftLayer.ruling}); the generated prose's inference provenance is the operator-declared model.`, label: null }
      : { id: 'draft-layer', text: `Draft layer: Unknown (unconsented-source-or-provider), so no part of the draft is shown: ${draftLayer.why.join('; ')}.`, label: 'Unknown' },
  ];
  if (credential.required) {
    items.push(credential.passed
      ? { id: 'adapter-credential', text: `At this render no adapter credential of the ${credential.checked} listed was readable as the operator's user.`, label: 'Observed' }
      : { id: 'adapter-credential', text: `At this render an adapter credential was readable as the operator's user: ${credential.finding.why}. ${credential.finding.instruction}`, label: 'Observed' });
  }
  return items;
}
