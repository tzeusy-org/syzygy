import * as fs from 'node:fs';
import * as path from 'node:path';
import { UNKNOWN_REASONS } from '@syzygy/cap1-core';
import { leadInQuotations, lineCount, locateQuote, normaliseTracked, parseBoundedJson, retainedWithMarkers, spanTouchesWithheld, verifiedRedactedBody, type VerifiedRedactedBody, type TrackedText } from '@syzygy/polaris-generation-core/live';
import { isRecord, sha256 } from '@syzygy/support';
import { CREDENTIAL_CHECK_DISCLOSURE, credentialStepCheck, storedBriefArm, type CredentialStepResult } from './credential-probe.js';
import { SESSION_ID_PATTERN, UNDERSTANDING_ITEMS, checkDraftShape, localDraftSchema, type DraftSchemaWithDefs } from './draft-schema.js';
import { EXECUTION_FLAGS_BASIS, executionFlags, type ExecutionFlags } from './execution-flags.js';
import type { CredentialProbe } from './execution-rule.js';
import { RECORDS_WITHIN_REACH, type GateSources } from './gate-sources.js';
import { BLOB_MODES, GitObjectReadRefusal, openPinnedObjectReader, type PinnedObjectReader, type PinnedObjectReaderOptions, type TreeEntry } from './git-object-reader.js';
import { isoOf } from './iso-of.js';
import type { Outcome } from './outcome.js';
import { reverifyPinnedRevision, type ReverifyRefusal } from './reverify.js';
import type { RunConfig } from './run-config.js';
import { loadDossierScreen, placementSubjectOf, type DossierScreen, type ScreenExclusion, type ScreenLoader } from './screen.js';
import { REVISION_FILE, RUN_ID, RUN_LAYOUT } from './state-directory.js';
import { screenCensusReport, withheldCensus, type ScreenCensusReport } from './census.js';
import { CLASS_NOT_CONSENTED, unconsentedClass } from './class-gate.js';

/** `syzygy dossier check <run> [--draft <file>]` (REQ-polaris-generation-033, 034, 036).
 *
 * One check of one draft, in this order: the pinned revision is verified again against the records in force; the deadline (from the
 * brief's issue, on Syzygy's clock) and the repair-cycle limit refuse the step when spent; the adapter-credential check runs where the
 * brief permitted execution; the draft is read; the screening policy in force is loaded and the pinned tree listed and every cited blob
 * read from the clone the run record names, each object re-hashed on the way down from the pinned commit (the clone's working tree is
 * never read, and no clone is taken from the command line); then the draft's bytes
 * are frozen as revision N and the result written to `checks/rev-N.json`. A refusal writes no revision and no result.
 *
 * The checks: the draft's schema, its revision, unique identities and resolving references; every cited path a blob at the pinned
 * revision and every line range inside it; every quotation one contiguous run of its cited blob after the core's normalisation, on word
 * boundaries, inside the cited range, with its byte range; labels and citations by block kind, the Unknown reasons, and every block
 * marked as resting on execution naming a reported command; the understanding record's items; the clarification-question limit; and
 * every path of the self-reported discovery account a blob at the pinned revision. A quotation from a blob screening excludes is not
 * verified: its block is recorded Unknown (`excluded-content`), never a finding, and no finding carries quoted or excluded text.
 *
 * Every result is derived at this step from objects read now (R1): no earlier check result, byte range or record of earlier reads is
 * read. What is stored is within the agent sessions' write reach, so the revision count and the deadline's start are Inferred.
 *
 * `inventory-check` (REQ-polaris-generation-035) runs the same check through `checkSubject` with the inventory's plan: its own schema,
 * blocks, coverage account, frozen-revision directory and record, and a gate on the session identifiers (`inventory.ts`). */

export const CHECK_RECORD_FORMAT = 'polaris-dossier-check/1';
export const STEP_LOG_FORMAT = 'polaris-dossier-step/1';
export const DEFAULT_DRAFT = 'next.json';
export const DRAFT_MAX_BYTES = 4 * 1024 * 1024;
const DRAFT_JSON_LIMITS = Object.freeze({ maxBytes: DRAFT_MAX_BYTES, maxNodes: 500_000, maxDepth: 16 });
const BRIEF_JSON_LIMITS = Object.freeze({ maxBytes: 262_144, maxNodes: 4096, maxDepth: 8 });

export type CheckFindingKind =
  | 'not-json' | 'schema' | 'wrong-revision' | 'duplicate-id' | 'unresolved-reference'
  | 'label' | 'citation-by-kind' | 'unknown-reason' | 'execution-marking' | 'understanding-missing' | 'question-limit'
  | 'path-absent' | 'range-invalid' | 'range-beyond-blob'
  | 'quotation-count' | 'quotation-citation' | 'quotation-in-unquotable-block' | 'lead-in-without-quote' | 'quotation-unterminated'
  | 'quotation-empty' | 'quotation-elided' | 'quotation-not-in-cited-file' | 'quotation-outside-range'
  | 'discovery-path-absent' | 'adapter-credential-readable';

/** A repair finding: the kind of failure, where to repair it (a JSON path into the draft), and the block and citation it concerns. It
 * never carries quoted text or any byte of a blob. */
export interface CheckFinding {
  readonly kind: CheckFindingKind;
  readonly at: string;
  readonly blockId?: string;
  readonly citationId?: string;
  readonly detail: string;
}

export interface VerifiedQuotation {
  readonly blockId: string;
  readonly at: string;
  readonly index: number;
  readonly citationId: string;
  readonly path: string;
  readonly objectId: string;
  readonly algorithm: string;
  /** The span's byte range in the blob, `[start, end)`, for the finding record; render locates the quotation again. */
  readonly byteRange: readonly [number, number];
}

export interface ExcludedQuotation {
  readonly blockId: string;
  readonly at: string;
  readonly index: number;
  readonly citationId: string;
  readonly unknownReason: 'excluded-content';
}

/** The cited files the review session will not see, from a check's cited blobs (bead syzygy-olmr). The fidelity packet carries a span's
 * text only when screening admits its file and the class gate passes its class (`class-gate.ts`, as `review.ts` applies it), so a block
 * or inventory entry that cites only withheld files stays unresolved in review, and an unresolved row blocks readiness. A file screening
 * admits under a class the run's consent does not cover is listed as `class-not-consented` with that class (round-2 review note 3). `checkSubject` puts it on the report of both `check` and `inventory-check`, whichever caller runs
 * them (the CLI commands, or `await --submit` for a waiting inventory session: syzygy-mea.3 round-1 finding 1), so the session can
 * prefer admitted evidence before spending repair cycles; it is advice, never a finding, and never written to the check record. */
export type ReviewVisibility = {
  readonly withheld: readonly ({ readonly path: string; readonly outcome: ScreenExclusion } | { readonly path: string; readonly outcome: typeof CLASS_NOT_CONSENTED; readonly missingClass: string })[];
  readonly note: string;
};
/** `contentClass` is the screen's, and `consented` the classes the run's per-project statement lists, or null when it relies on none. */
export function reviewVisibility(citedBlobs: readonly CitedBlob[], contentClass: DossierScreen['contentClass'], consented: readonly string[] | null): ReviewVisibility | null {
  const withheld = citedBlobs.flatMap((blob): ReviewVisibility['withheld'] => {
    if (blob.outcome !== 'admitted') return [{ path: blob.path ?? '(a path a secret detector matches)', outcome: blob.outcome }];
    if (blob.path === null) return [];
    const missingClass = unconsentedClass(contentClass(blob.path), consented);
    return missingClass === undefined ? [] : [{ path: blob.path, outcome: CLASS_NOT_CONSENTED, missingClass }];
  });
  if (withheld.length === 0) return null;
  return {
    withheld,
    note: `${withheld.length} cited file(s) are withheld from the review session, by screening or by the class gate, so it cannot confirm the blocks and inventory entries that rest on them; unconfirmed rows block readiness. Where the same fact is stated in an admitted file, cite that file as well or instead.`,
  };
}

/** A cited blob as this step found it. A path a secret detector matches is named by neither path nor object identifier. An admitted
 * blob screening retained as RFC5-17's `redacted-span` (policy version 4) carries `redaction`: its count of withheld lines, the ids of
 * the detectors that matched and the withheld line ranges, the policy's `secretRedaction.provenance` beside the object id (syzygy-ts8u). */
export interface CitedBlob {
  readonly path: string | null;
  readonly objectId: string | null;
  readonly read: boolean;
  readonly outcome: 'admitted' | ScreenExclusion;
  readonly redaction?: BlobRedaction;
}
/** A retained body's redaction: its class, how many of its lines are withheld, the ids of the detectors that matched, in policy order,
 * and the withheld lines as inclusive 1-based `[first, last]` ranges, ascending. Line numbers and detector ids only: no withheld line,
 * no matched text, nor any digest of either, is carried. */
export interface BlobRedaction {
  readonly redactionClass: 'redacted-span';
  readonly withheldLines: number;
  readonly detectorIds: readonly string[];
  readonly withheldLineRanges: readonly (readonly [number, number])[];
}

/** Ascending 1-based line numbers as inclusive `[first, last]` ranges of consecutive lines: `[2, 3, 4, 9]` is `[[2, 4], [9, 9]]`. */
export function lineRanges(lines: readonly number[]): [number, number][] {
  const ranges: [number, number][] = [];
  for (const line of lines) {
    const last = ranges[ranges.length - 1];
    if (last !== undefined && line === last[1] + 1) last[1] = line;
    else ranges.push([line, line]);
  }
  return ranges;
}

/** A redacted body's provenance as `BlobRedaction` states it. */
export const blobRedaction = (withheld: readonly number[], detectorIds: readonly string[]): BlobRedaction =>
  ({ redactionClass: 'redacted-span', withheldLines: withheld.length, detectorIds: [...detectorIds], withheldLineRanges: lineRanges(withheld) });

export type CheckStage = 'run' | 'reverify' | 'not-briefed' | 'deadline' | 'repair-limit' | 'session' | 'authoring-session' | 'session-identity'
  | 'draft' | 'inventory' | 'screen' | 'object-read' | 'freeze' | 'write';

/** The two commands that check a subject at the pinned revision: the authoring draft (`check`) and the inventory (`inventory-check`). */
export type CheckCommand = 'check' | 'inventory-check';

export interface CheckRefusal {
  readonly command: CheckCommand;
  readonly outcome: 'refused';
  readonly stage: CheckStage;
  readonly reason: string;
  readonly reasons?: readonly string[];
  /** The step guard's refusals in machine form, beside `reasons`. */
  readonly refusals?: readonly ReverifyRefusal[];
  readonly objectRead?: ReturnType<GitObjectReadRefusal['toJSON']>;
  readonly at: string;
  readonly disclosures: readonly string[];
}

export interface CheckRecord {
  readonly format: typeof CHECK_RECORD_FORMAT;
  readonly runId: string;
  readonly revision: number;
  readonly supersedes: number | null;
  readonly pinnedRevision: string;
  readonly checkedAt: string;
  readonly outcome: 'passed' | 'findings';
  readonly draft: { readonly file: string; readonly sha256: string; readonly bytes: number };
  /** The authoring session's identifier as the draft declares it; null where it declares none that is well formed. */
  readonly session: { readonly sessionId: string | null; readonly declaredBy: 'the authoring session'; readonly label: 'Inferred' };
  readonly findings: readonly CheckFinding[];
  /** Where execution was permitted, the flags on the reported commands (v1.1, N6): disclosed beside each command, never a finding that
   * sets the outcome, so a flag refuses no step. */
  readonly executionFlags: ExecutionFlags;
  readonly quotations: readonly VerifiedQuotation[];
  readonly excludedContent: readonly ExcludedQuotation[];
  readonly citedBlobs: readonly CitedBlob[];
  readonly screeningPolicy: { readonly policyId: string; readonly policyVersion: string; readonly sha256: string };
  readonly credential: CredentialStepResult;
  readonly limits: {
    readonly repairCycles: { readonly declared: number; readonly thisRevision: number; readonly label: 'Inferred'; readonly basis: string };
    readonly questions: { readonly declared: number; readonly recorded: number | null };
    readonly deadline: { readonly endsAt: string; readonly label: 'Inferred'; readonly basis: string };
  };
  readonly label: 'Inferred';
}

export interface CheckReport extends CheckRecord {
  readonly command: 'check';
  readonly run: string;
  readonly checkFile: string;
  readonly disclosures: readonly string[];
  /** The path-only census of every file screening withholds at the pinned revision (`census.ts`); on the report, never the record. */
  readonly screenCensus?: ScreenCensusReport;
  /** The cited files withheld from the review session, by screening or the class gate (`reviewVisibility`); on the report, never the record. */
  readonly reviewVisibility?: ReviewVisibility;
}

export type CheckResult = Outcome<CheckReport, CheckRefusal>;

export interface CheckRequest {
  /** The draft to check; `drafts/next.json` in the run directory by default. */
  readonly draftFile?: string;
}

export interface CheckDeps {
  readonly sources: GateSources;
  readonly now: () => number;
  readonly probe: CredentialProbe;
  /** The screen; by default the policy the act chain puts in force, from the records root. */
  readonly loadScreen?: ScreenLoader;
  readonly openReader?: (options: PinnedObjectReaderOptions) => PinnedObjectReader;
}

const DISCLOSURES = [
  RECORDS_WITHIN_REACH,
  'Every result of this check was derived at this step from Git objects read by identifier at the pinned revision and re-hashed now; no earlier check result, byte range or record of earlier reads was used.',
  'The repair-cycle count is the number of frozen draft revisions in the run directory, and the deadline runs from the instant the brief record states; both are stored where the agent sessions can write, so both are Inferred.',
  'Whether a claim not marked as resting on execution rests on it is the agent\'s report; Syzygy sees only the marking.',
  `Where the brief permitted execution, each reported command without a working directory, with one outside the clone, or that the agent states falls outside the owner's choice is flagged in executionFlags, beside the command: ${EXECUTION_FLAGS_BASIS}`,
  'The discovery account is the agent\'s self-report, labelled Inferred; a path in it that exists does not make it Observed or complete.',
  'Quoted text without the lead-in is the agent\'s prose, not a quotation, and is never rendered as Observed.',
  'The clone read is the one the run record names, as the operator supplied it at init; the record is within the agent sessions\' write reach, so the location is Inferred, and only objects re-hashed from the pinned commit are used.',
];

const list = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);
const text = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
const line = (value: unknown): number | undefined => (typeof value === 'number' && Number.isSafeInteger(value) && value >= 1 ? value : undefined);
const errno = (cause: unknown): string => (cause as NodeJS.ErrnoException).code ?? 'unknown-error';

/** What one checked revision yields, from which each subject builds its own record. */
export interface CheckedRevision {
  readonly runId: string;
  readonly revision: number;
  readonly pinned: string;
  readonly checkedAt: string;
  readonly outcome: 'passed' | 'findings';
  readonly file: { readonly file: string; readonly sha256: string; readonly bytes: number };
  readonly findings: readonly CheckFinding[];
  readonly quotations: readonly VerifiedQuotation[];
  readonly excludedContent: readonly ExcludedQuotation[];
  readonly citedBlobs: readonly CitedBlob[];
  readonly screeningPolicy: CheckRecord['screeningPolicy'];
  readonly credential: CredentialStepResult;
  readonly repairCycles: CheckRecord['limits']['repairCycles'];
  readonly deadline: CheckRecord['limits']['deadline'];
  /** The parsed subject; undefined when it is not one bounded JSON document. */
  readonly doc: unknown;
  readonly run: string;
  /** The clone's path as the run record names it. */
  readonly clonePath: string;
}

/** A subject's own gate, run once the subject is parsed and before any object is read: a refusal, or what it found for the record. */
export type SubjectGate<G> = { readonly ok: false; readonly stage: CheckStage; readonly reason: string } | { readonly ok: true; readonly found: G };

/** What differs between checking the authoring draft and checking the inventory. */
export interface SubjectPlan<R extends object, G> {
  readonly command: CheckCommand;
  readonly noun: 'draft' | 'inventory';
  /** Where revisions are frozen and their results written, relative to the run directory. */
  readonly frozenDir: string;
  readonly checksDir: string;
  /** The file checked when none is named, or why none is. */
  readonly defaultFile: (run: string) => string;
  readonly rules: (pinned: string, declared: RunConfig) => SubjectRules;
  readonly gate: (run: string, doc: unknown) => SubjectGate<G>;
  readonly record: (checked: CheckedRevision, found: G, declared: RunConfig) => R;
  readonly disclosures: readonly string[];
}

/** `screenCensus` is on `check`'s report only (`census.ts`): advice to the author, never written to the check record. */
export type SubjectReport<R extends object> = R & { readonly command: CheckCommand; readonly run: string; readonly checkFile: string; readonly disclosures: readonly string[]; readonly screenCensus?: ScreenCensusReport; readonly reviewVisibility?: ReviewVisibility };
export type SubjectResult<R extends object> = Outcome<SubjectReport<R>, CheckRefusal>;

const DRAFT_PLAN: SubjectPlan<CheckRecord, null> = {
  command: 'check',
  noun: 'draft',
  frozenDir: RUN_LAYOUT.drafts,
  checksDir: RUN_LAYOUT.checks,
  defaultFile: (run) => path.join(run, RUN_LAYOUT.drafts, DEFAULT_DRAFT),
  rules: (pinned, declared) => draftRules(pinned, declared.maxQuestions),
  gate: () => ({ ok: true, found: null }),
  record: (checked, _found, declared) => ({
    format: CHECK_RECORD_FORMAT,
    runId: checked.runId,
    revision: checked.revision,
    supersedes: checked.revision === 0 ? null : checked.revision - 1,
    pinnedRevision: checked.pinned,
    checkedAt: checked.checkedAt,
    outcome: checked.outcome,
    draft: checked.file,
    session: { sessionId: declaredSessionId(checked.doc), declaredBy: 'the authoring session', label: 'Inferred' },
    findings: checked.findings,
    executionFlags: executionFlags(isRecord(checked.doc) ? checked.doc['executions'] : undefined, checked.clonePath, storedBriefArm(checked.run)),
    quotations: checked.quotations,
    excludedContent: checked.excludedContent,
    citedBlobs: checked.citedBlobs,
    screeningPolicy: checked.screeningPolicy,
    credential: checked.credential,
    limits: {
      repairCycles: checked.repairCycles,
      questions: { declared: declared.maxQuestions, recorded: isRecord(checked.doc) && Array.isArray(checked.doc['clarifications']) ? checked.doc['clarifications'].length : null },
      deadline: checked.deadline,
    },
    label: 'Inferred',
  }),
  disclosures: DISCLOSURES,
};

const SESSION_ID = new RegExp(SESSION_ID_PATTERN, 'u');
/** A subject's declared session identifier when it is well formed, or null. */
export const declaredSessionId = (doc: unknown): string | null => {
  const id = isRecord(doc) ? doc['sessionId'] : undefined;
  return typeof id === 'string' && id.length <= 200 && SESSION_ID.test(id) ? id : null;
};

export async function checkDraft(runDir: string, request: CheckRequest, deps: CheckDeps): Promise<CheckResult> {
  return checkSubject(runDir, request.draftFile, deps, DRAFT_PLAN) as Promise<CheckResult>;
}

/** One check of one subject at the pinned revision, in the order the file comment states. A refusal freezes and writes nothing. */
export async function checkSubject<R extends object, G>(runDir: string, file: string | undefined, deps: CheckDeps, plan: SubjectPlan<R, G>): Promise<SubjectResult<R>> {
  const run = path.resolve(runDir);
  const started = deps.now();
  const { noun } = plan;
  const log = (entry: Record<string, unknown>): void => {
    try {
      fs.appendFileSync(path.join(run, RUN_LAYOUT.steps), `${JSON.stringify({ format: STEP_LOG_FORMAT, step: plan.command, at: isoOf(started), ...entry })}\n`, { mode: 0o600 });
    } catch { /* the step log is a convenience within the agent's reach; a failure to append changes no result */ }
  };
  const refuse = (stage: CheckStage, reason: string, extra: Partial<CheckRefusal> = {}): SubjectResult<R> => {
    if (stage !== 'run') log({ outcome: 'refused', stage, reason });
    return { ok: false, refusal: { command: plan.command, outcome: 'refused', stage, reason, ...extra, at: isoOf(started), disclosures: plan.disclosures } };
  };
  const runId = path.basename(run);
  if (!RUN_ID.test(runId) || !fs.existsSync(path.join(run, RUN_LAYOUT.config))) return refuse('run', `${run} is not a run directory`);

  const checked = await reverifyPinnedRevision(run, deps.sources, started, deps.openReader ? { openReader: deps.openReader } : {});
  if (!checked.ok) {
    return refuse('reverify', `the pinned revision could not be verified again, so the ${noun} is not checked`, {
      reasons: checked.reasons, refusals: checked.refusals, ...(checked.objectRead ? { objectRead: checked.objectRead } : {}),
    });
  }
  const { subject, declared } = checked.record;
  const pinned = subject.pinnedRevision.commit;

  const issued = briefIssuedAt(run, pinned, noun);
  if (typeof issued === 'string') return refuse('not-briefed', issued);
  const deadlineEnds = issued + declared.deadline.seconds * 1000;
  if (started >= deadlineEnds) return refuse('deadline', `the deadline ${declared.deadline.declared} from the brief ended at ${isoOf(deadlineEnds)} on Syzygy's clock; no step runs after it`);

  const frozenDir = path.join(run, plan.frozenDir), checksDir = path.join(run, plan.checksDir);
  const revision = nextRevision(frozenDir);
  if (revision > declared.maxRepairCycles) {
    return refuse('repair-limit', `${noun === 'draft' ? '' : `${noun} `}revision ${revision} would be repair cycle ${revision} of the ${declared.maxRepairCycles} declared; the repair-cycle limit is spent`);
  }

  const credential = await credentialStepCheck(run, plan.command, deps.probe, started);

  const subjectFile = file === undefined ? plan.defaultFile(run) : path.resolve(file);
  const bytes = readSubject(subjectFile, noun);
  if (typeof bytes === 'string') return refuse(noun, bytes);
  let doc: unknown;
  let parseFault: string | null = null;
  try {
    doc = parseBoundedJson(new TextDecoder('utf-8', { fatal: true }).decode(bytes), DRAFT_JSON_LIMITS);
  } catch {
    parseFault = `the ${noun} is not one bounded UTF-8 JSON document`;
  }

  const gate = plan.gate(run, parseFault === null ? doc : undefined);
  if (!gate.ok) return refuse(gate.stage, gate.reason);

  const screenLoad = await (deps.loadScreen ?? ((placement) => loadDossierScreen(deps.sources.recordsRoot, started, undefined, placement)))(placementSubjectOf(subject));
  if (!screenLoad.ok) return refuse('screen', screenLoad.why);
  const screen = screenLoad.screen;

  const reader = (deps.openReader ?? openPinnedObjectReader)({ gitDir: path.join(subject.clone.path, '.git'), revision: pinned });
  const findings: CheckFinding[] = [];
  let quotations: VerifiedQuotation[] = [], excludedContent: ExcludedQuotation[] = [], citedBlobs: CitedBlob[] = [];
  if (parseFault !== null) findings.push({ kind: 'not-json', at: '$', detail: parseFault });
  else {
    let derived: Derived;
    try {
      derived = await deriveFindings(doc, { pinned, screen, reader }, plan.rules(pinned, declared));
    } catch (cause) {
      if (cause instanceof GitObjectReadRefusal) return refuse('object-read', `an object at the pinned revision could not be read: ${cause.message}`, { objectRead: cause.toJSON() });
      throw cause;
    }
    findings.push(...derived.findings);
    ({ quotations, excludedContent, citedBlobs } = derived);
  }
  // The author's path-only census of what the review will not see (syzygy-mea.3, lead ruling): every blob of the pinned tree, through the
  // same screen and the class gate, on every check from the first. The reader re-lists the tree it listed for the derivation.
  let screenCensus: ScreenCensusReport | undefined;
  if (plan.command === 'check') {
    try {
      screenCensus = screenCensusReport({ ok: true, census: withheldCensus(await reader.listTree(), screen, checked.contentClasses) });
    } catch (cause) {
      if (!(cause instanceof GitObjectReadRefusal)) throw cause;
      screenCensus = screenCensusReport({ ok: false, why: `the pinned tree could not be listed (${cause.reason})`, consented: checked.contentClasses });
    }
  }
  if (credential.required && !credential.passed) {
    findings.push({ kind: 'adapter-credential-readable', at: '$', detail: `${credential.finding.why}. ${credential.finding.instruction}` });
  }

  const frozen = path.join(frozenDir, `rev-${revision}.json`), checkFile = path.join(checksDir, `rev-${revision}.json`);
  try {
    fs.mkdirSync(frozenDir, { recursive: true, mode: 0o700 });
    fs.writeFileSync(frozen, bytes, { mode: 0o600, flag: 'wx' });
  } catch (cause) {
    return refuse('freeze', `the ${noun} could not be frozen as ${path.relative(run, frozen)} (${errno(cause)})`);
  }
  const outcome = findings.length === 0 ? 'passed' : 'findings';
  const record = plan.record({
    runId,
    revision,
    pinned,
    checkedAt: isoOf(started),
    outcome,
    file: { file: path.relative(run, frozen), sha256: sha256(bytes), bytes: bytes.byteLength },
    findings,
    quotations,
    excludedContent,
    citedBlobs,
    screeningPolicy: { policyId: screen.policyId, policyVersion: screen.policyVersion, sha256: screen.policySha256 },
    credential,
    repairCycles: { declared: declared.maxRepairCycles, thisRevision: revision, label: 'Inferred', basis: `the frozen ${noun} revisions in the run directory` },
    deadline: { endsAt: isoOf(deadlineEnds), label: 'Inferred', basis: 'the issue instant the brief record states, plus the declared deadline' },
    doc: parseFault === null ? doc : undefined,
    run,
    clonePath: subject.clone.path,
  }, gate.found, declared);
  try {
    fs.mkdirSync(checksDir, { recursive: true, mode: 0o700 });
    fs.writeFileSync(checkFile, `${JSON.stringify(record, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
  } catch (cause) {
    return refuse('write', `${noun === 'draft' ? '' : `${noun} `}revision ${revision} was frozen, but its result could not be written to ${path.relative(run, checkFile)} (${errno(cause)})`);
  }
  log({ outcome, revision, findings: findings.length });
  const disclosures = credential.required ? [...plan.disclosures, CREDENTIAL_CHECK_DISCLOSURE] : plan.disclosures;
  const visibility = reviewVisibility(citedBlobs, screen.contentClass, checked.contentClasses);
  return { ok: true, report: { command: plan.command, run, checkFile, ...record, disclosures, ...(screenCensus === undefined ? {} : { screenCensus }), ...(visibility === null ? {} : { reviewVisibility: visibility }) } };
}

/** The instant the brief record states it was issued, or why the run counts as not briefed. */
export function briefIssuedAt(run: string, pinned: string, noun = 'draft'): number | string {
  let record: unknown;
  try {
    record = parseBoundedJson(fs.readFileSync(path.join(run, RUN_LAYOUT.briefRecord), 'utf8'), BRIEF_JSON_LIMITS);
  } catch {
    return `the run holds no readable ${RUN_LAYOUT.briefRecord}: no brief was issued, so the deadline clock has not started and no ${noun} is checked`;
  }
  if (!isRecord(record) || record['pinnedRevision'] !== pinned) return `${RUN_LAYOUT.briefRecord} does not name the pinned revision ${pinned}`;
  const issuedAt = text(record['issuedAt']);
  const instant = issuedAt === undefined || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(issuedAt) ? Number.NaN : Date.parse(issuedAt);
  return Number.isNaN(instant) ? `${RUN_LAYOUT.briefRecord} states no issue instant, so the deadline cannot be measured` : instant;
}

/** The next revision number in a directory of frozen revisions: one past the highest, or 0. */
export function nextRevision(dir: string): number {
  let names: string[];
  try { names = fs.readdirSync(dir); } catch { return 0; }
  const numbers = names.flatMap((name) => { const match = REVISION_FILE.exec(name); return match === null ? [] : [Number(match[1])]; });
  return numbers.length === 0 ? 0 : Math.max(...numbers) + 1;
}

function readSubject(file: string, noun: string): Uint8Array | string {
  try {
    const stats = fs.statSync(file);
    if (!stats.isFile()) return `${file} is not a regular file`;
    if (stats.size > DRAFT_MAX_BYTES) return `${file} is larger than the ${DRAFT_MAX_BYTES}-byte ${noun} bound`;
    return new Uint8Array(fs.readFileSync(file));
  } catch (cause) {
    return `the ${noun} ${file} cannot be read (${errno(cause)})`;
  }
}

/** What one derivation found. `admitted` holds the text of every cited blob this step read, re-hashed and screening admitted, by path:
 * the only bytes a render may quote or put on a source page. */
export interface Derived {
  readonly findings: CheckFinding[];
  readonly quotations: VerifiedQuotation[];
  readonly excludedContent: ExcludedQuotation[];
  readonly citedBlobs: CitedBlob[];
  /** Each admitted blob's text: the whole body, or for a body retained as `redacted-span` the retained text (every withheld line emptied,
   * its terminator kept) with the withheld line numbers. */
  readonly admitted: ReadonlyMap<string, { readonly objectId: string; readonly raw: string; readonly withheld?: readonly number[]; readonly detectorIds?: readonly string[];
    readonly retainedLines?: readonly string[]; readonly lineByteOffsets?: readonly number[]; readonly originalBytes?: number; readonly contentSha256?: string; readonly projection?: VerifiedRedactedBody;
    /** For a redacted body only: whether its complete body, scanned for active content as before, holds any (`DossierScreen.activeContentAsBefore`).
     * The complete body is not kept, so a page sink that cannot meet the renderCondition reads this instead of rescanning. */
    readonly activeContentAsBefore?: boolean }>;
}

export interface DeriveInputs {
  readonly pinned: string;
  readonly screen: DossierScreen;
  readonly reader: PinnedObjectReader;
}

/** A labelled block of a subject: a claim or understanding item of a draft, or an entry of an inventory. */
export interface SubjectBlock {
  readonly at: string;
  readonly value: Readonly<Record<string, unknown>>;
  /** The field holding the block's prose, where its quotations are. */
  readonly textKey: 'text' | 'statement';
  readonly allowed: readonly string[];
  /** The one label under which the block may carry quotations, or null where it never may. */
  readonly quotable: string | null;
  /** The finding's detail for a quotation in a block that may not carry one. */
  readonly unquotable: string;
}

/** What the shared derivation checks of one kind of subject beyond the rules every subject shares. */
export interface SubjectRules {
  readonly noun: 'draft' | 'inventory';
  readonly schema: DraftSchemaWithDefs;
  /** The declared clarification-question limit, where the subject records questions. */
  readonly maxQuestions: number | null;
  /** The subject's references and required records, after identities are checked. */
  readonly structural: (doc: Readonly<Record<string, unknown>>, add: (finding: CheckFinding) => void) => void;
  readonly blocks: (doc: Readonly<Record<string, unknown>>) => readonly SubjectBlock[];
  /** The self-reported account of what the session read: its key, and the parts other than `inspected` that list `{path, reason}`. */
  readonly account: { readonly key: string; readonly parts: readonly string[] };
}

type Block = SubjectBlock;
export type Citation = { readonly at: string; readonly value: Readonly<Record<string, unknown>> };
type BlobState =
  | { readonly state: 'absent' }
  | { readonly state: 'excluded'; readonly outcome: ScreenExclusion }
  | { readonly state: 'admitted'; readonly entry: TreeEntry; readonly raw: string; readonly lines: number; tracked: TrackedText | null; readonly withheld?: readonly number[];
      readonly detectorIds?: readonly string[]; readonly retainedLines?: readonly string[]; readonly lineByteOffsets?: readonly number[]; readonly originalBytes?: number; readonly contentSha256?: string; readonly projection?: VerifiedRedactedBody;
      readonly activeContentAsBefore?: boolean };

/** Every check over a parsed subject. Each walker tolerates a subject of the wrong shape, so one submission reports every finding it
 * carries, not only its schema faults. It freezes and writes nothing: `checkSubject` freezes, and `render` derives again from a frozen
 * revision with it. */
export async function deriveFindings(subject: unknown, inputs: DeriveInputs, rules: SubjectRules): Promise<Derived> {
  const findings: CheckFinding[] = [];
  const add = (finding: CheckFinding): void => { findings.push(finding); };
  const { noun } = rules;
  for (const error of checkDraftShape(rules.schema, subject)) add({ kind: 'schema', at: error.path, detail: error.detail });
  const doc: Readonly<Record<string, unknown>> = isRecord(subject) ? subject : {};

  if (doc['pinnedRevision'] !== inputs.pinned) add({ kind: 'wrong-revision', at: '$.pinnedRevision', detail: `the ${noun} must name the pinned revision ${inputs.pinned}; a ${noun} naming another revision is refused` });
  const asked = list(doc['clarifications']).length;
  if (rules.maxQuestions !== null && asked > rules.maxQuestions) add({ kind: 'question-limit', at: '$.clarifications', detail: `the ${noun} records ${asked} clarification questions; the declared limit is ${rules.maxQuestions}` });

  // Identities, across the whole subject.
  const seen = new Map<string, string>();
  walk(doc, '$', (value, at) => {
    const id = text(value['id']);
    if (id === undefined) return;
    const first = seen.get(id);
    if (first === undefined) seen.set(id, at);
    else add({ kind: 'duplicate-id', at, detail: `the identity ${JSON.stringify(id)} is already used at ${first}` });
  });

  rules.structural(doc, add);
  const executionIds = new Set(list(doc['executions']).flatMap((execution) => (isRecord(execution) && text(execution['id']) !== undefined ? [text(execution['id'])!] : [])));

  // Labels, citations by block kind and the execution marking.
  const blocks = rules.blocks(doc);
  const toVerify: { readonly block: Block; readonly blockId: string; readonly index: number; readonly citation: Citation; readonly inner: string }[] = [];
  for (const block of blocks) {
    const { value, at } = block;
    const blockId = text(value['id']);
    const about = blockId === undefined ? {} : { blockId };
    const label = value['label'];
    const { allowed } = block;
    if (typeof label === 'string' && label.toLowerCase() === 'observed') {
      add({ kind: 'label', at: `${at}.label`, ...about, detail: 'an agent cannot label its own claim Observed; Observed is reserved for a quotation Syzygy verified' });
    } else if (typeof label !== 'string' || !allowed.includes(label)) {
      add({ kind: 'label', at: `${at}.label`, ...about, detail: `every block carries exactly one label, ${allowed.join(', ')}` });
    }
    // The rules by kind apply to a block whose label is one its kind permits; any other label is already a finding.
    if (typeof label !== 'string' || !allowed.includes(label)) continue;
    const citations = Array.isArray(value['citations']) ? value['citations'] : null;
    if (label === 'inferred' && (citations === null || citations.length === 0)) add({ kind: 'citation-by-kind', at: `${at}.citations`, ...about, detail: 'an inferred block cites at least one source' });
    if (label === 'non-normative' && (Object.hasOwn(value, 'citations') || Object.hasOwn(value, 'quotations'))) {
      add({ kind: 'citation-by-kind', at, ...about, detail: 'a non-normative block carries no citation and no anchor' });
    }
    if (label === 'unknown' && !UNKNOWN_REASONS.includes(value['reason'] as never)) {
      add({ kind: 'unknown-reason', at: `${at}.reason`, ...about, detail: 'an unknown block names its reason from RFC2-24\'s closed list' });
    }
    if (label === 'inferred' && value['basis'] === 'execution') {
      const named = list(value['executionIds']);
      if (named.length === 0) add({ kind: 'execution-marking', at: `${at}.executionIds`, ...about, detail: 'a block marked as resting on execution names at least one command from executions' });
      named.forEach((executionId, k) => {
        if (typeof executionId !== 'string' || !executionIds.has(executionId)) add({ kind: 'execution-marking', at: `${at}.executionIds[${k}]`, ...about, detail: 'the block names a command that the draft\'s executions list does not report' });
      });
    }

    const prose = text(value[block.textKey]) ?? '';
    const leadIns = leadInQuotations(prose);
    if (leadIns.length === 0) continue;
    if (label !== block.quotable) {
      add({ kind: 'quotation-in-unquotable-block', at, ...about, detail: block.unquotable });
      continue;
    }
    // A lead-in with no quote after it promises bytes it does not show; it is not a quotation, so it takes no citation.
    const spans = leadIns.filter((span) => span.terminated || span.kind !== 'lead-in-without-quote');
    for (let bare = leadIns.length - spans.length; bare > 0; bare--) {
      add({ kind: 'lead-in-without-quote', at: `${at}.${block.textKey}`, ...about, detail: 'a lead-in is not followed by a straight double quote: a lead-in promises a verbatim quotation' });
    }
    const named = list(value['quotations']);
    if (named.length !== spans.length) add({ kind: 'quotation-count', at: `${at}.quotations`, ...about, detail: `the text carries ${spans.length} quotation(s) and quotations names ${named.length} citation(s); name one per quotation, in order` });
    spans.forEach((span, index) => {
      if (!span.terminated) { add({ kind: 'quotation-unterminated', at: `${at}.${block.textKey}`, ...about, detail: `quotation ${index + 1} is never closed` }); return; }
      const citationId = named[index];
      if (citationId === undefined) return;
      const citation = (citations ?? []).find((entry) => isRecord(entry) && entry['id'] === citationId);
      if (typeof citationId !== 'string' || !isRecord(citation)) {
        add({ kind: 'quotation-citation', at: `${at}.quotations[${index}]`, ...about, detail: 'the quotation names no citation of this block' });
        return;
      }
      if (blockId === undefined) return;
      const where = (citations ?? []).indexOf(citation);
      toVerify.push({ block, blockId, index, citation: { at: `${at}.citations[${where}]`, value: citation }, inner: span.inner });
    });
  }

  // Paths and ranges at the pinned revision; the screen; the reads.
  const tree = new Map<string, TreeEntry>();
  for (const entry of await inputs.reader.listTree()) if (BLOB_MODES.has(entry.mode)) tree.set(entry.path, entry);
  const citations = collectCitations(doc);
  const blobs = new Map<string, BlobState>();
  const toRead: TreeEntry[] = [];
  for (const { value } of citations) {
    const cited = text(value['path']);
    if (cited === undefined || blobs.has(cited)) continue;
    const entry = tree.get(cited);
    if (entry === undefined) { blobs.set(cited, { state: 'absent' }); continue; }
    const outcome = inputs.screen.screenPath(cited);
    if (outcome !== undefined) { blobs.set(cited, { state: 'excluded', outcome }); continue; }
    toRead.push(entry);
  }
  const read = toRead.length === 0 ? [] : await inputs.reader.readBlobs(toRead.map((entry) => entry.path));
  const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
  for (const blob of read) {
    let raw: string;
    try { raw = decoder.decode(blob.bytes); } catch { blobs.set(blob.path, { state: 'excluded', outcome: 'not-utf8-text' }); continue; }
    // A retained body (policy version 4) keeps only its retained text: a withheld line is never used to verify a quotation.
    const screened = inputs.screen.screenTargetBody(raw, blob.path);
    blobs.set(blob.path, screened.kind === 'excluded' ? { state: 'excluded', outcome: screened.outcome }
      : screened.kind === 'redacted' ? { state: 'admitted', entry: blob, raw: retainedWithMarkers(screened.retainedLines, screened.withheld), lines: screened.retainedLines.length,
        tracked: null, withheld: screened.withheld, detectorIds: screened.detectorIds, retainedLines: screened.retainedLines, lineByteOffsets: screened.lineByteOffsets,
        originalBytes: screened.originalBytes, contentSha256: screened.contentSha256, projection: verifiedRedactedBody(raw, blob.id, blob.path, inputs.screen.screenTargetBody),
        activeContentAsBefore: inputs.screen.activeContentAsBefore(raw) }
        : { state: 'admitted', entry: blob, raw, lines: lineCount(raw), tracked: null });
  }
  const firstCited = [...new Set(citations.flatMap(({ value }) => (text(value['path']) === undefined ? [] : [text(value['path'])!])))];
  const citedBlobs: CitedBlob[] = firstCited.map((cited) => [cited, blobs.get(cited)!] as const).flatMap(([cited, state]): CitedBlob[] => {
    if (state.state === 'absent') return [];
    if (state.state === 'admitted') {
      return [{ path: cited, objectId: state.entry.id, read: true, outcome: 'admitted', ...(state.withheld === undefined ? {} : { redaction: blobRedaction(state.withheld, state.detectorIds!) }) }];
    }
    const pathSecret = state.outcome === 'secret-detector-match' && inputs.screen.screenPath(cited) === 'secret-detector-match';
    return [{ path: pathSecret ? null : cited, objectId: pathSecret ? null : tree.get(cited)!.id, read: toRead.some((entry) => entry.path === cited), outcome: state.outcome }];
  });

  const pathLabel = (cited: string): string => (inputs.screen.screenPath(cited) === 'secret-detector-match' ? 'the cited path' : JSON.stringify(cited));
  const rangeOk = new Set<Citation['value']>();
  for (const citation of citations) {
    const { value, at } = citation;
    const citationId = text(value['id']);
    const about = citationId === undefined ? {} : { citationId };
    const cited = text(value['path']);
    const start = line(value['startLine']), end = line(value['endLine']);
    if (cited === undefined) continue;
    const state = blobs.get(cited)!;
    if (state.state === 'absent') { add({ kind: 'path-absent', at: `${at}.path`, ...about, detail: `${pathLabel(cited)} names no file at the pinned revision ${inputs.pinned}` }); continue; }
    if (start === undefined || end === undefined || start > end) { add({ kind: 'range-invalid', at, ...about, detail: 'a line range is two integers from 1, startLine not after endLine' }); continue; }
    if (state.state !== 'admitted') continue;
    if (end > state.lines) { add({ kind: 'range-beyond-blob', at: `${at}.endLine`, ...about, detail: `${pathLabel(cited)} has ${state.lines} line(s) at the pinned revision; the range ends at line ${end}` }); continue; }
    rangeOk.add(value);
  }

  // Quotations.
  const quotations: VerifiedQuotation[] = [];
  const excludedContent: ExcludedQuotation[] = [];
  for (const { block, blockId, index, citation, inner } of toVerify) {
    const cited = text(citation.value['path']);
    const citationId = citation.value['id'] as string;
    if (cited === undefined) continue;
    const state = blobs.get(cited);
    if (state === undefined || state.state === 'absent') continue;
    if (state.state === 'excluded') { excludedContent.push({ blockId, at: block.at, index, citationId, unknownReason: 'excluded-content' }); continue; }
    if (!rangeOk.has(citation.value)) continue;
    // A cited span that includes a withheld line is withheld whole, and the quotation that rests on it is Unknown (RFC5-17).
    if (state.withheld !== undefined && spanTouchesWithheld(state.withheld, citation.value['startLine'] as number, citation.value['endLine'] as number)) {
      excludedContent.push({ blockId, at: block.at, index, citationId, unknownReason: 'excluded-content' });
      continue;
    }
    const startLine = citation.value['startLine'] as number, endLine = citation.value['endLine'] as number;
    const source = state.retainedLines === undefined ? state.raw : state.retainedLines.slice(startLine - 1, endLine).join('');
    const tracked = state.retainedLines === undefined ? (state.tracked ??= normaliseTracked(source)) : normaliseTracked(source);
    const located = locateQuote(source, tracked, inner, state.retainedLines === undefined ? startLine : 1,
      state.retainedLines === undefined ? endLine : endLine - startLine + 1);
    if (!located.found) {
      add({ kind: located.kind, at: `${block.at}.${block.textKey}`, blockId, citationId, detail: `quotation ${index + 1} ${QUOTE_FAILURE[located.kind]} (citation ${JSON.stringify(citationId)})` });
      continue;
    }
    const base = state.lineByteOffsets?.[startLine - 1] ?? 0;
    quotations.push({ blockId, at: block.at, index, citationId, path: cited, objectId: state.entry.id, algorithm: inputs.reader.algorithm,
      byteRange: [base + located.byteStart, base + located.byteEnd] });
  }

  // The self-reported account of what the session read.
  const { key } = rules.account;
  const account = isRecord(doc[key]) ? doc[key] : {};
  list(account['inspected']).forEach((entry, i) => {
    if (typeof entry === 'string' && !tree.has(entry)) add({ kind: 'discovery-path-absent', at: `$.${key}.inspected[${i}]`, detail: `${pathLabel(entry)} names no file at the pinned revision` });
  });
  for (const part of rules.account.parts) {
    list(account[part]).forEach((entry, i) => {
      const reported = isRecord(entry) ? text(entry['path']) : undefined;
      if (reported !== undefined && !tree.has(reported)) add({ kind: 'discovery-path-absent', at: `$.${key}.${part}[${i}].path`, detail: `${pathLabel(reported)} names no file at the pinned revision` });
    });
  }

  const admitted = new Map([...blobs].flatMap(([cited, state]) => (state.state === 'admitted'
    ? [[cited, { objectId: state.entry.id, raw: state.raw, ...(state.withheld === undefined ? {} : { withheld: state.withheld, detectorIds: state.detectorIds!,
      retainedLines: state.retainedLines!, lineByteOffsets: state.lineByteOffsets!, originalBytes: state.originalBytes!, contentSha256: state.contentSha256!, projection: state.projection!,
      activeContentAsBefore: state.activeContentAsBefore! }) }] as const] : [])));
  return { findings, quotations, excludedContent, citedBlobs, admitted };
}

const CLAIM_UNQUOTABLE = 'only an inferred claim block carries quotations; give this one its own inferred block with a citation';

/** The authoring draft's rules: its schema and question limit, references, understanding record, blocks and discovery account. */
export function draftRules(pinned: string, maxQuestions: number): SubjectRules {
  return {
    noun: 'draft',
    schema: localDraftSchema({ pinnedRevision: pinned, maxQuestions }),
    maxQuestions,
    structural: draftStructure,
    blocks: collectBlocks,
    account: { key: 'discovery', parts: ['selected', 'excluded', 'unresolved', 'deferred'] },
  };
}

function draftStructure(doc: Readonly<Record<string, unknown>>, add: (finding: CheckFinding) => void): void {
  // References.
  const sectionIds = new Set(list(doc['sections']).flatMap((section) => (isRecord(section) && text(section['id']) !== undefined ? [text(section['id'])!] : [])));
  for (const part of ['diagrams', 'deepDives'] as const) {
    list(doc[part]).forEach((asset, i) => {
      if (!isRecord(asset)) return;
      const sectionId = text(asset['sectionId']);
      if (sectionId !== undefined && !sectionIds.has(sectionId)) add({ kind: 'unresolved-reference', at: `$.${part}[${i}].sectionId`, detail: `no section has the identity ${JSON.stringify(sectionId)}` });
    });
  }
  list(doc['diagrams']).forEach((diagram, i) => {
    if (!isRecord(diagram)) return;
    const nodes = new Set(list(diagram['nodes']).flatMap((node) => (isRecord(node) && text(node['id']) !== undefined ? [text(node['id'])!] : [])));
    list(diagram['edges']).forEach((edge, j) => {
      if (!isRecord(edge)) return;
      for (const end of ['from', 'to'] as const) {
        const target = text(edge[end]);
        if (target !== undefined && !nodes.has(target)) add({ kind: 'unresolved-reference', at: `$.diagrams[${i}].edges[${j}].${end}`, detail: `no node of this diagram has the identity ${JSON.stringify(target)}` });
      }
    });
  });
  // A produced disposition names what its own asset produced, as in the provider draft: the asset, its paragraphs, or its nodes and edges.
  const idsOf = (values: unknown): string[] => list(values).flatMap((entry) => (isRecord(entry) && text(entry['id']) !== undefined ? [text(entry['id'])!] : []));
  for (const part of ['sections', 'diagrams', 'deepDives'] as const) {
    list(doc[part]).forEach((asset, i) => {
      if (!isRecord(asset) || !isRecord(asset['disposition']) || asset['disposition']['kind'] !== 'produced') return;
      const paragraphs = list(asset['paragraphs']);
      const own = new Set([...idsOf([asset]), ...idsOf(paragraphs), ...paragraphs.flatMap((p) => (isRecord(p) ? idsOf(p['children']) : [])), ...idsOf(asset['nodes']), ...idsOf(asset['edges'])]);
      list(asset['disposition']['assetIds']).forEach((assetId, k) => {
        if (typeof assetId === 'string' && !own.has(assetId)) add({ kind: 'unresolved-reference', at: `$.${part}[${i}].disposition.assetIds[${k}]`, detail: `${JSON.stringify(assetId)} is not this asset or a part of it` });
      });
    });
  }

  // The understanding record.
  const understanding = isRecord(doc['understanding']) ? doc['understanding'] : {};
  for (const item of UNDERSTANDING_ITEMS) {
    if (list(understanding[item]).length === 0) add({ kind: 'understanding-missing', at: `$.understanding.${item}`, detail: `the understanding record has no entry for ${item}; an item that cannot be established is an unknown entry with its reason` });
  }
}

const QUOTE_FAILURE: Readonly<Record<'quotation-empty' | 'quotation-elided' | 'quotation-not-in-cited-file' | 'quotation-outside-range', string>> = {
  'quotation-empty': 'is empty after normalisation',
  'quotation-elided': 'carries an ellipsis the cited file does not carry there: an elision',
  'quotation-not-in-cited-file': 'is not one contiguous run of the cited file after normalisation: it is altered or joins separate spans',
  'quotation-outside-range': 'occurs in the cited file only outside the cited line range',
};

/** Call `visit` for every object in the document, with its JSON path. */
function walk(value: unknown, at: string, visit: (value: Readonly<Record<string, unknown>>, at: string) => void): void {
  if (Array.isArray(value)) { value.forEach((item, i) => walk(item, `${at}[${i}]`, visit)); return; }
  if (!isRecord(value)) return;
  visit(value, at);
  for (const [key, child] of Object.entries(value)) walk(child, `${at}.${key}`, visit);
}

/** The claim blocks (introduction, section and deep-dive paragraphs and their children) and the understanding record's items. */
export function collectBlocks(doc: Readonly<Record<string, unknown>>): Block[] {
  const out: Block[] = [];
  const claim = (at: string, value: Readonly<Record<string, unknown>>): Block =>
    ({ at, value, textKey: 'text', allowed: ['inferred', 'unknown', 'non-normative'], quotable: 'inferred', unquotable: CLAIM_UNQUOTABLE });
  if (isRecord(doc['introduction'])) out.push(claim('$.introduction', doc['introduction']));
  for (const part of ['sections', 'deepDives'] as const) {
    list(doc[part]).forEach((container, i) => {
      if (!isRecord(container)) return;
      list(container['paragraphs']).forEach((paragraph, j) => {
        if (!isRecord(paragraph)) return;
        const at = `$.${part}[${i}].paragraphs[${j}]`;
        out.push(claim(at, paragraph));
        list(paragraph['children']).forEach((child, k) => { if (isRecord(child)) out.push(claim(`${at}.children[${k}]`, child)); });
      });
    });
  }
  const understanding = isRecord(doc['understanding']) ? doc['understanding'] : {};
  for (const item of UNDERSTANDING_ITEMS) {
    list(understanding[item]).forEach((entry, i) => { if (isRecord(entry)) out.push({ at: `$.understanding.${item}[${i}]`, value: entry, textKey: 'statement', allowed: ['inferred', 'unknown'], quotable: null, unquotable: CLAIM_UNQUOTABLE }); });
  }
  return out;
}

/** Every citation in the draft: each object in a `citations` or `evidence` list. */
export function collectCitations(doc: Readonly<Record<string, unknown>>): Citation[] {
  const out: Citation[] = [];
  walk(doc, '$', (value, at) => {
    for (const key of ['citations', 'evidence'] as const) {
      list(value[key]).forEach((citation, i) => { if (isRecord(citation)) out.push({ at: `${at}.${key}[${i}]`, value: citation }); });
    }
  });
  return out;
}
