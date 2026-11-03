import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { isRecord, sha256 } from '@syzygy/support';
import { CREDENTIAL_CHECK_DISCLOSURE, credentialStepCheck, storedBriefArm, type CredentialStepResult } from './credential-probe.js';
import { SESSION_ID_PATTERN } from './draft-schema.js';
import { executionFlags } from './execution-flags.js';
import { GitObjectReadRefusal, openPinnedObjectReader } from './git-object-reader.js';
import { isoOf } from './iso-of.js';
import type { Outcome } from './outcome.js';
import { reverifyPinnedRevision } from './reverify.js';
import type { RunConfig } from './run-config.js';
import { placementSubjectOf, screenLoaderOf } from './screen.js';
import { REVISION_FILE, RUN_ID, RUN_LAYOUT } from './state-directory.js';
import { screenCensusReport, withheldCensus, type ScreenCensusReport } from './census.js';
import { BRIEF_JSON_LIMITS, CHECK_RECORD_FORMAT, type CheckCommand, type CheckDeps, type CheckFinding, type CheckRecord, type CheckRefusal, type CheckRequest, type CheckResult, type CheckStage, type CitedBlob, DEFAULT_DRAFT, DISCLOSURES, DRAFT_JSON_LIMITS, DRAFT_MAX_BYTES, type ExcludedQuotation, type ReviewVisibility, STEP_LOG_FORMAT, type VerifiedQuotation, errno, reviewVisibility, text } from './check-model.js';
import { type Derived, type SubjectRules, deriveFindings, draftRules } from './check-derive.js';
export { CHECK_RECORD_FORMAT, STEP_LOG_FORMAT, DEFAULT_DRAFT, DRAFT_MAX_BYTES, reviewVisibility, lineRanges, blobRedaction } from './check-model.js';
export type { CheckFindingKind, CheckFinding, VerifiedQuotation, ExcludedQuotation, ReviewVisibility, CitedBlob, BlobRedaction, CheckStage, CheckCommand, CheckRefusal, CheckRecord, CheckReport, CheckResult, CheckRequest, CheckDeps } from './check-model.js';
export { deriveFindings, draftRules, collectBlocks, collectCitations } from './check-derive.js';
export type { Derived, DeriveInputs, SubjectBlock, SubjectRules, Citation } from './check-derive.js';

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

  const screenLoad = await screenLoaderOf(deps.loadScreen, deps.sources.recordsRoot, started)(placementSubjectOf(subject));
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
