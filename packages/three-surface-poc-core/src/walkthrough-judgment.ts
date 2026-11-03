// Walkthrough judgment — PWB-REQ-022's evaluator over the pair
// (retained walkthrough execution record, separate owner judgment).
//
// The execution record (`.syzygy/governance/records/`) establishes only
// what walkthrough occurred: its identity, the surface version, the
// evaluation identity, the nonvisual/keyboard-only mode and the traversed
// paths, plus the reader's answers (retained, never judged here). The
// judgment (`.syzygy/governance/decisions/`) names the verdict, rationale,
// judging party and the exact run record (identity plus SHA-256, which
// transitively binds the surface version and evaluation identity the
// record names), and carries an effective human owner act under
// RFC3-16(a)/(b) in state (1) or state (2).
//
// The closed invalid population is 84 present-invalid cases plus 2 absent
// cases. The 55 common act cases are PWB-REQ-005's exact common
// population applied to the judgment act; their predicates are re-stated
// here, in the same order, so that each gate's `// mutation-point:` sites
// stay its own rule-6 mutation targets. The field rules those predicates
// apply — identity and digest shapes, the human-name and non-human
// principal rules — are shared with `body-read-authority.ts` through
// `act-fields.ts`, so one owner name is classified the same way by both.
// Predicate ORDER is load-bearing: the first failing predicate names the
// case.
//
// Nothing here is evidence that comprehension succeeded. A lawful outcome
// carries the owner's recorded verdict as recorded human judgment — never
// Observed, never a score. Absence renders Unknown, never met, without
// inventing a verdict; a present invalid pair records exactly
// `verdict-unlawful`, renders Unknown-never-met and mints the RFC3-16(a)
// contradiction. Failed, unavailable or indeterminate state-(2)
// correlation is invalid and never downgrades to state (1). History is
// append-only: later correlation never rewrites the provenance under
// which an earlier judgment took effect.

import { deepFreeze, sha256 } from '@syzygy/support';
import {
  ACT_IDENTITY,
  ISO_DATE,
  NON_HUMAN_PRINCIPAL,
  PHRASE,
  PROJECT_IDENTITY,
  SHA256,
  SLUG,
  STATE_1_LABEL,
  STATE_2_LABEL,
  TAG,
  isGovernancePath,
  isHumanName,
  isIsoDate,
  provenanceFromLabel,
  type ProvenanceLabel,
} from './act-fields.js';
import {
  type A1Expectation,
  type ActRecordInput,
  type ArtifactInput,
  type CommonInvalidCase,
  type CorrelationOutcome,
  type LifecycleInput,
  type RecordingTagResolution,
} from './body-read-authority.js';
import { STATE_1_DISCLOSURE, STATE_2_DISCLOSURE } from './authority-disclosure.js';
import { parseOwnerActRecord, type ParsedField, type ParsedOwnerActRecord } from './owner-act-record.js';

// ---------------------------------------------------------------------
// Closed vocabularies.
// ---------------------------------------------------------------------

const RUN_RECORD_HOME = '.syzygy/governance/records/' as const;
const JUDGMENT_HOME = '.syzygy/governance/decisions/' as const;

// Exact recorded value for every present-invalid case (PWB-REQ-022).
export const VERDICT_UNLAWFUL = 'verdict-unlawful' as const;

const WALKTHROUGH_MODES = ['nonvisual-keyboard-only', 'visual-pointer'] as const;
type WalkthroughMode = (typeof WALKTHROUGH_MODES)[number];

const VERDICT_VALUES = ['met', 'not-met'] as const;
type VerdictValue = (typeof VERDICT_VALUES)[number];

// Run-record fields — 15 (five fields × missing / malformed / wrong).
const RUN_RECORD_INVALID_CASES = [
  'run-record-identity-missing',
  'run-record-identity-malformed',
  'run-record-identity-wrong',
  'surface-version-missing',
  'surface-version-malformed',
  'surface-version-wrong',
  'evaluation-identity-missing',
  'evaluation-identity-malformed',
  'evaluation-identity-wrong',
  'nonvisual-mode-missing',
  'nonvisual-mode-malformed',
  'nonvisual-mode-wrong',
  'traversed-paths-missing',
  'traversed-paths-malformed',
  'traversed-paths-wrong',
] as const;

// Judgment fields — 12 (four fields × missing / malformed / wrong).
const JUDGMENT_FIELD_INVALID_CASES = [
  'verdict-missing',
  'verdict-malformed',
  'verdict-wrong',
  'rationale-missing',
  'rationale-malformed',
  'rationale-wrong',
  'judging-party-missing',
  'judging-party-malformed',
  'judging-party-wrong',
  'run-record-reference-missing',
  'run-record-reference-malformed',
  'run-record-reference-wrong',
] as const;

// Governance homes — 2.
const GOVERNANCE_HOME_INVALID_CASES = [
  'run-record-outside-records-home',
  'judgment-outside-decisions-home',
] as const;

export type JudgmentInvalidCase =
  | CommonInvalidCase
  | (typeof RUN_RECORD_INVALID_CASES)[number]
  | (typeof JUDGMENT_FIELD_INVALID_CASES)[number]
  | (typeof GOVERNANCE_HOME_INVALID_CASES)[number];

const JUDGMENT_ABSENT_CASES = ['no-run-record', 'no-judgment'] as const;
type JudgmentAbsentCase = (typeof JUDGMENT_ABSENT_CASES)[number];

// ---------------------------------------------------------------------
// Inputs.
// ---------------------------------------------------------------------

export interface RunRecordInput {
  // Repository-relative path of the execution record as located.
  readonly path: string;
  readonly artifact: ArtifactInput;
}

export interface JudgmentInput {
  // Repository-relative path of the judgment decision as located.
  readonly path: string;
  readonly artifact: ArtifactInput;
  // The owner act binding the judgment artifact's exact digest.
  readonly actRecord: ActRecordInput;
  readonly lifecycle: LifecycleInput;
  readonly recordingTag: RecordingTagResolution;
}

interface JudgmentActExpectation {
  readonly artifactPath: string;
  readonly actIdentity: string;
  readonly actType: string;
  readonly phrasePrefix: string;
  readonly recordingTag: string;
  readonly scopeAnchors: readonly string[];
  readonly a1: A1Expectation;
}

// The controlled evaluation input. "Wrong but present" means semantically
// different from these values (PWB-REQ-005's meaning, reused by
// PWB-REQ-022). Supplied by the caller, never read from the artifacts.
export interface WalkthroughJudgmentExpectations {
  readonly observingProject: string;
  readonly owner: string;
  readonly evaluationInstant: string;
  readonly governingActInstant: string;
  // The criterion the verdict must judge.
  readonly criterion: string;
  // The walkthrough record under evaluation.
  readonly runRecordIdentity: string;
  readonly surfaceVersion: string;
  readonly evaluationIdentity: string;
  readonly mode: WalkthroughMode;
  // The surface's route population; a traversed path outside it is wrong.
  readonly surfaceRoutes: readonly string[];
  readonly judgment: JudgmentActExpectation;
  // Other act-bound artifacts an act could be mis-paired to.
  readonly otherActBoundArtifacts: readonly string[];
}

interface JudgmentCorrelationRequest {
  readonly subject: 'walkthrough-judgment';
  readonly actIdentity: string;
  readonly a1Identity: string;
  readonly artifactDigest: string;
}
export type JudgmentCorrelator = (request: JudgmentCorrelationRequest) => CorrelationOutcome;

// The production correlator. [Observed] No RFC5-25 independent audit
// trail exists in this repository, so state (2) cannot be reached here.
export const JUDGMENT_CORRELATION_UNAVAILABLE: JudgmentCorrelator = () => 'unavailable';

export interface WalkthroughJudgmentInputs {
  readonly evaluationId: string;
  readonly runRecord: RunRecordInput;
  readonly judgment: JudgmentInput;
  readonly expectations: WalkthroughJudgmentExpectations;
  readonly correlate: JudgmentCorrelator;
}

// ---------------------------------------------------------------------
// Outputs.
// ---------------------------------------------------------------------

interface RfcJudgmentContradiction {
  readonly clause: 'RFC3-16(a)';
  readonly definedTerm: 'authorization-bearing governance artifact';
  readonly statement: string;
  readonly failing: readonly { readonly subject: 'walkthrough-judgment'; readonly state: string }[];
}

interface RunRecordSummary {
  readonly identity: string;
  readonly digest: string;
  readonly surfaceVersion: string;
  readonly evaluationIdentity: string;
  readonly mode: WalkthroughMode;
  readonly traversedPaths: readonly string[];
}

interface OwnerVerdict {
  readonly criterion: string;
  readonly value: VerdictValue;
  readonly rationale: string;
  readonly judgingParty: string;
}

type WalkthroughJudgmentOutcome =
  | {
      readonly kind: 'absent';
      readonly what: JudgmentAbsentCase;
      readonly detail: string;
      readonly criterion: 'unknown-never-met';
      readonly verdict: undefined;
      readonly runRecordDigest: string | undefined;
      readonly judgmentDigest: string | undefined;
    }
  | {
      readonly kind: 'unlawful';
      readonly recorded: typeof VERDICT_UNLAWFUL;
      readonly caseId: JudgmentInvalidCase;
      readonly detail: string;
      readonly criterion: 'unknown-never-met';
      readonly verdict: undefined;
      readonly claimedProvenance: ProvenanceLabel | undefined;
      readonly runRecordDigest: string;
      readonly judgmentDigest: string;
      readonly contradiction: RfcJudgmentContradiction;
    }
  | {
      readonly kind: 'lawful';
      readonly criterion: 'owner-verdict-carried';
      // What the carried verdict is: recorded human judgment. Never
      // Observed, never a score, never evidence of success.
      readonly evidenceKind: 'recorded-human-judgment';
      readonly provenance: ProvenanceLabel;
      readonly stateLabel: typeof STATE_1_LABEL | typeof STATE_2_LABEL;
      // True ONLY for state (2).
      readonly independentlyVerified: boolean;
      readonly disclosure: typeof STATE_1_DISCLOSURE | typeof STATE_2_DISCLOSURE;
      readonly verdict: OwnerVerdict;
      readonly runRecord: RunRecordSummary;
      readonly judgmentDigest: string;
      readonly actIdentity: string;
      readonly actInstant: string;
    };

export interface WalkthroughJudgmentEvaluation {
  readonly evaluationId: string;
  readonly evaluationInstant: string;
  readonly outcome: WalkthroughJudgmentOutcome;
}

// ---------------------------------------------------------------------
// Record grammar (pure text → fields; no validity).
// ---------------------------------------------------------------------

const RUN_RECORD_LABELS = {
  identity: 'Record identity:',
  surfaceVersion: 'Surface version:',
  evaluationIdentity: 'Evaluation identity:',
  mode: 'Mode:',
} as const;
const RUN_RECORD_PATHS_SECTION = 'Traversed paths';

const JUDGMENT_LABELS = {
  verdict: 'Verdict:',
  judgingParty: 'Judging party:',
  runRecord: 'Run record:',
} as const;
const JUDGMENT_RATIONALE_SECTION = 'Rationale';

function paragraphs(text: string): readonly string[] {
  const out: string[] = [];
  let current: string[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '') {
      if (current.length > 0) {
        out.push(current.join(' '));
        current = [];
      }
      continue;
    }
    current.push(line);
  }
  if (current.length > 0) out.push(current.join(' '));
  return out;
}

function headOf(text: string): readonly string[] {
  const firstHeading = text.search(/^## /m);
  return paragraphs(firstHeading < 0 ? text : text.slice(0, firstHeading));
}

function labelledValue(head: readonly string[], label: string): string | undefined {
  for (const paragraph of head) {
    if (paragraph.startsWith(label)) return paragraph.slice(label.length).trim();
  }
  return undefined;
}

const BACKTICKED = /^`([^`]+)`(.*)$/s;

function backtickedField(head: readonly string[], label: string): ParsedField<string> {
  const value = labelledValue(head, label);
  if (value === undefined) return { kind: 'missing' };
  const match = BACKTICKED.exec(value);
  if (match === null || match[2]?.trim() !== '') return { kind: 'malformed', raw: value };
  return { kind: 'present', value: match[1] ?? '' };
}

function plainField(head: readonly string[], label: string): ParsedField<string> {
  const value = labelledValue(head, label);
  if (value === undefined) return { kind: 'missing' };
  if (value === '' || /[`*]/.test(value)) return { kind: 'malformed', raw: value };
  return { kind: 'present', value };
}

function section(text: string, name: string): string | undefined {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `## ${name}`);
  if (start < 0) return undefined;
  const body: string[] = [];
  for (let index = start + 1; index < lines.length; index++) {
    const line = lines[index] ?? '';
    if (line.startsWith('## ')) break;
    body.push(line);
  }
  return body.join('\n');
}

// A `## Traversed paths` section is a list of backticked paths, one per
// `- ` item; anything else in the section makes it malformed.
function pathsField(text: string): ParsedField<readonly string[]> {
  const body = section(text, RUN_RECORD_PATHS_SECTION);
  if (body === undefined) return { kind: 'missing' };
  const items = body.split(/\r?\n/).map((line) => line.trim()).filter((line) => line !== '');
  if (items.length === 0) return { kind: 'malformed', raw: body };
  const paths: string[] = [];
  for (const item of items) {
    const match = /^- `([^`]+)`$/.exec(item);
    if (match === null) return { kind: 'malformed', raw: body };
    paths.push(match[1] ?? '');
  }
  return { kind: 'present', value: paths };
}

function rationaleField(text: string): ParsedField<string> {
  const body = section(text, JUDGMENT_RATIONALE_SECTION);
  if (body === undefined) return { kind: 'missing' };
  const trimmed = body.trim();
  if (trimmed === '' || !/[A-Za-z]/.test(trimmed)) return { kind: 'malformed', raw: body };
  return { kind: 'present', value: trimmed };
}

interface ParsedRunRecord {
  readonly identity: ParsedField<string>;
  readonly surfaceVersion: ParsedField<string>;
  readonly evaluationIdentity: ParsedField<string>;
  readonly mode: ParsedField<string>;
  readonly traversedPaths: ParsedField<readonly string[]>;
}

export function parseRunRecord(text: string): ParsedRunRecord {
  const head = headOf(text);
  return {
    identity: backtickedField(head, RUN_RECORD_LABELS.identity),
    surfaceVersion: backtickedField(head, RUN_RECORD_LABELS.surfaceVersion),
    evaluationIdentity: backtickedField(head, RUN_RECORD_LABELS.evaluationIdentity),
    mode: backtickedField(head, RUN_RECORD_LABELS.mode),
    traversedPaths: pathsField(text),
  };
}

interface ParsedJudgment {
  readonly verdict: ParsedField<string>;
  readonly rationale: ParsedField<string>;
  readonly judgingParty: ParsedField<string>;
  readonly runRecordReference: ParsedField<string>;
}

function parseJudgment(text: string): ParsedJudgment {
  const head = headOf(text);
  return {
    verdict: backtickedField(head, JUDGMENT_LABELS.verdict),
    rationale: rationaleField(text),
    judgingParty: plainField(head, JUDGMENT_LABELS.judgingParty),
    runRecordReference: backtickedField(head, JUDGMENT_LABELS.runRecord),
  };
}

// ---------------------------------------------------------------------
// Shape predicates.
// ---------------------------------------------------------------------

const RUN_RECORD_IDENTITY = /^PWB-WALKTHROUGH-[A-Z0-9][A-Z0-9-]*$/;
const SURFACE_VERSION = /^[a-z][a-z0-9-]*@[0-9A-Za-z][0-9A-Za-z.+-]*$/;
const EVALUATION_IDENTITY = /^[a-z0-9][a-z0-9-]*$/;
const VERDICT = /^([a-z][a-z0-9-]*)=(met|not-met)$/;
const RUN_RECORD_REFERENCE = /^(PWB-WALKTHROUGH-[A-Z0-9][A-Z0-9-]*)@([0-9a-f]{64})$/;

function isSurfacePath(value: string): boolean {
  if (!value.startsWith('/') || /\s/.test(value)) return false;
  return value.split('/').slice(1).every((segment) => segment !== '.' && segment !== '..');
}
function under(path: string, home: string): boolean {
  return path.startsWith(home) && path.length > home.length && isGovernancePath(path);
}

function contradictionFor(caseId: JudgmentInvalidCase, detail: string): RfcJudgmentContradiction {
  return {
    clause: 'RFC3-16(a)',
    definedTerm: 'authorization-bearing governance artifact',
    statement:
      'The owner judgment on the cold-open walkthrough is an "authorization-bearing governance artifact" under RFC3-16(a) — ' +
      'its presence would "unblock or widen a claim class" (the project-wide Polaris evaluation criterion) — and is honored ' +
      `only through an effective owner act bound to the exact run record. No effective judgment is in force: ${caseId} (${detail}). ` +
      'The criterion stays Unknown, never met; no verdict is carried.',
    failing: [{ subject: 'walkthrough-judgment', state: `${VERDICT_UNLAWFUL}: ${caseId}` }],
  };
}

// ---------------------------------------------------------------------
// Evaluation.
// ---------------------------------------------------------------------

export function evaluateWalkthroughJudgment(inputs: WalkthroughJudgmentInputs): WalkthroughJudgmentEvaluation {
  const outcome = evaluateOutcome(inputs);
  return deepFreeze({
    evaluationId: inputs.evaluationId,
    evaluationInstant: inputs.expectations.evaluationInstant,
    outcome,
  });
}

function evaluateOutcome(inputs: WalkthroughJudgmentInputs): WalkthroughJudgmentOutcome {
  const { runRecord, judgment, expectations, correlate } = inputs;
  const absent = (
    what: JudgmentAbsentCase,
    detail: string,
    runRecordDigest: string | undefined,
    judgmentDigest: string | undefined,
  ): WalkthroughJudgmentOutcome => ({
    kind: 'absent',
    what,
    detail,
    criterion: 'unknown-never-met',
    verdict: undefined,
    runRecordDigest,
    judgmentDigest,
  });

  // --- Absent cases (2). Unknown, never met; no verdict is invented.
  if (runRecord.artifact.kind !== 'present') {
    return absent('no-run-record', `walkthrough execution record ${runRecord.artifact.kind}`, undefined, undefined);
  }
  const runBytes = runRecord.artifact.bytes;
  const runDigest = sha256(runBytes);
  if (judgment.artifact.kind !== 'present') {
    return absent('no-judgment', `owner judgment ${judgment.artifact.kind}`, runDigest, undefined);
  }
  const judgmentBytes = judgment.artifact.bytes;
  const judgmentDigest = sha256(judgmentBytes);
  const rec = judgment.actRecord;
  if (rec.kind === 'absent') {
    return absent('no-judgment', 'owner judgment carries no owner act record', runDigest, judgmentDigest);
  }

  let claimed: ProvenanceLabel | undefined;
  const unlawful = (caseId: JudgmentInvalidCase, detail: string): WalkthroughJudgmentOutcome => ({
    kind: 'unlawful',
    recorded: VERDICT_UNLAWFUL,
    caseId,
    detail,
    criterion: 'unknown-never-met',
    verdict: undefined,
    claimedProvenance: claimed,
    runRecordDigest: runDigest,
    judgmentDigest,
    contradiction: contradictionFor(caseId, detail),
  });

  // --- Governance homes (2).
  // mutation-point: run-record-outside-records-home
  if (!under(runRecord.path, RUN_RECORD_HOME)) return unlawful('run-record-outside-records-home', `execution record at ${runRecord.path} is outside ${RUN_RECORD_HOME}`);
  // mutation-point: judgment-outside-decisions-home
  if (!under(judgment.path, JUDGMENT_HOME)) return unlawful('judgment-outside-decisions-home', `judgment at ${judgment.path} is outside ${JUDGMENT_HOME}`);

  // --- Run-record fields (15).
  const run = parseRunRecord(new TextDecoder('utf-8', { fatal: false }).decode(runBytes));
  // mutation-point: run-record-identity-missing
  if (run.identity.kind === 'missing') return unlawful('run-record-identity-missing', 'run-record identity absent');
  // mutation-point: run-record-identity-malformed
  if (run.identity.kind === 'malformed' || !RUN_RECORD_IDENTITY.test(run.identity.value)) return unlawful('run-record-identity-malformed', 'run-record identity is not a walkthrough-record identifier');
  // mutation-point: run-record-identity-wrong
  if (run.identity.value !== expectations.runRecordIdentity) return unlawful('run-record-identity-wrong', `run record ${run.identity.value}, evaluation is for ${expectations.runRecordIdentity}`);
  const runIdentity = run.identity.value;

  // mutation-point: surface-version-missing
  if (run.surfaceVersion.kind === 'missing') return unlawful('surface-version-missing', 'surface version absent');
  // mutation-point: surface-version-malformed
  if (run.surfaceVersion.kind === 'malformed' || !SURFACE_VERSION.test(run.surfaceVersion.value)) return unlawful('surface-version-malformed', 'surface version is not <surface>@<version>');
  // mutation-point: surface-version-wrong
  if (run.surfaceVersion.value !== expectations.surfaceVersion) return unlawful('surface-version-wrong', `surface version ${run.surfaceVersion.value}, expected ${expectations.surfaceVersion}`);

  // mutation-point: evaluation-identity-missing
  if (run.evaluationIdentity.kind === 'missing') return unlawful('evaluation-identity-missing', 'evaluation identity absent');
  // mutation-point: evaluation-identity-malformed
  if (run.evaluationIdentity.kind === 'malformed' || !EVALUATION_IDENTITY.test(run.evaluationIdentity.value)) return unlawful('evaluation-identity-malformed', 'evaluation identity is not an identifier');
  // mutation-point: evaluation-identity-wrong
  if (run.evaluationIdentity.value !== expectations.evaluationIdentity) return unlawful('evaluation-identity-wrong', `evaluation ${run.evaluationIdentity.value}, expected ${expectations.evaluationIdentity}`);

  // mutation-point: nonvisual-mode-missing
  if (run.mode.kind === 'missing') return unlawful('nonvisual-mode-missing', 'nonvisual/keyboard-only mode absent');
  // mutation-point: nonvisual-mode-malformed
  if (run.mode.kind === 'malformed' || !(WALKTHROUGH_MODES as readonly string[]).includes(run.mode.value)) return unlawful('nonvisual-mode-malformed', 'mode is outside the two-mode vocabulary');
  // mutation-point: nonvisual-mode-wrong
  if (run.mode.value !== expectations.mode) return unlawful('nonvisual-mode-wrong', `mode ${run.mode.value}, expected ${expectations.mode}`);

  const paths = run.traversedPaths;
  // mutation-point: traversed-paths-missing
  if (paths.kind === 'missing') return unlawful('traversed-paths-missing', 'traversed paths absent');
  // mutation-point: traversed-paths-malformed
  if (paths.kind === 'malformed' || !paths.value.every(isSurfacePath)) return unlawful('traversed-paths-malformed', 'traversed paths are not a list of surface paths');
  // mutation-point: traversed-paths-wrong
  if (!paths.value.every((path) => expectations.surfaceRoutes.includes(path))) return unlawful('traversed-paths-wrong', 'a traversed path is outside the surface route population');

  // --- Judgment fields (12).
  const parsed = parseJudgment(new TextDecoder('utf-8', { fatal: false }).decode(judgmentBytes));
  // mutation-point: verdict-missing
  if (parsed.verdict.kind === 'missing') return unlawful('verdict-missing', 'verdict absent');
  const verdictParts = parsed.verdict.kind === 'present' ? VERDICT.exec(parsed.verdict.value) : null;
  // mutation-point: verdict-malformed
  if (verdictParts === null) return unlawful('verdict-malformed', 'verdict is not <criterion>=met|not-met');
  // mutation-point: verdict-wrong
  if (verdictParts[1] !== expectations.criterion) return unlawful('verdict-wrong', `verdict judges ${verdictParts[1]}, expected ${expectations.criterion}`);

  // mutation-point: rationale-missing
  if (parsed.rationale.kind === 'missing') return unlawful('rationale-missing', 'rationale absent');
  // mutation-point: rationale-malformed
  if (parsed.rationale.kind === 'malformed') return unlawful('rationale-malformed', 'rationale is empty');
  const rationale = parsed.rationale.value;
  const namedRecords = [...rationale.matchAll(/`(PWB-WALKTHROUGH-[A-Z0-9-]+)`/g)].map((m) => m[1]);
  // mutation-point: rationale-wrong
  if (namedRecords.some((identity) => identity !== runIdentity)) return unlawful('rationale-wrong', 'rationale reasons about a different walkthrough record');

  // mutation-point: judging-party-missing
  if (parsed.judgingParty.kind === 'missing') return unlawful('judging-party-missing', 'judging party absent');
  // mutation-point: judging-party-malformed
  if (parsed.judgingParty.kind === 'malformed' || !isHumanName(parsed.judgingParty.value)) return unlawful('judging-party-malformed', 'judging party is not an attribution');
  // mutation-point: judging-party-wrong
  if (parsed.judgingParty.value !== expectations.owner) return unlawful('judging-party-wrong', `judged by ${parsed.judgingParty.value}, not the project owner`);

  // mutation-point: run-record-reference-missing
  if (parsed.runRecordReference.kind === 'missing') return unlawful('run-record-reference-missing', 'exact run-record reference absent');
  const reference = parsed.runRecordReference.kind === 'present' ? RUN_RECORD_REFERENCE.exec(parsed.runRecordReference.value) : null;
  // mutation-point: run-record-reference-malformed
  if (reference === null) return unlawful('run-record-reference-malformed', 'run-record reference is not <identity>@<sha256>');
  // mutation-point: run-record-reference-wrong
  if (reference[1] !== runIdentity || reference[2] !== runDigest) return unlawful('run-record-reference-wrong', `judgment binds ${reference[1]}@${reference[2]}; the run record as read is ${runIdentity}@${runDigest}`);

  // --- The owner act: PWB-REQ-005's 55-case common population applied
  // to the judgment act, in the same order.
  // --- False substitutes (5).
  // mutation-point: tree-attribution-only
  if (rec.kind === 'tree-attribution-only') return unlawful('tree-attribution-only', `only the tree's self-declared stamp attests: ${rec.stamp}`);
  // mutation-point: git-ref-only
  if (rec.kind === 'git-ref-only') return unlawful('git-ref-only', `only a Git commit/tag attests: ${rec.ref}`);
  // mutation-point: specification-signoff-only
  if (rec.kind === 'specification-signoff-only') return unlawful('specification-signoff-only', `only a specification sign-off attests: ${rec.signoffRecord}`);
  // mutation-point: machine-submission
  if (rec.kind === 'machine-submission') return unlawful('machine-submission', `a machine submission is not an owner act: ${rec.submitter}`);
  // mutation-point: agent-assertion
  if (rec.kind === 'agent-assertion') return unlawful('agent-assertion', `an agent assertion is not an owner act: ${rec.agent}`);

  const record: ParsedOwnerActRecord = parseOwnerActRecord(rec.text);
  const expected = expectations.judgment;
  const evaluationDate = expectations.evaluationInstant.slice(0, 10);

  // --- RFC3-16(b) binding fields (28).
  const projectIdentity = record.projectIdentity;
  // mutation-point: project-identity-missing
  if (projectIdentity.kind === 'missing') return unlawful('project-identity-missing', 'RFC3-16(b) item 1 absent');
  // mutation-point: project-identity-malformed
  if (projectIdentity.kind === 'malformed' || !PROJECT_IDENTITY.test(projectIdentity.value)) return unlawful('project-identity-malformed', 'RFC3-16(b) item 1 is not a project identity');
  // mutation-point: project-identity-wrong
  if (projectIdentity.value !== expectations.observingProject) return unlawful('project-identity-wrong', `act names ${projectIdentity.value}, evaluation is for ${expectations.observingProject}`);

  const artifactIdentity = record.artifactIdentity;
  // mutation-point: artifact-identity-missing
  if (artifactIdentity.kind === 'missing') return unlawful('artifact-identity-missing', 'RFC3-16(b) item 2 absent');
  // mutation-point: artifact-identity-malformed
  if (artifactIdentity.kind === 'malformed' || !isGovernancePath(artifactIdentity.value)) return unlawful('artifact-identity-malformed', 'RFC3-16(b) item 2 is not a governance-plane path');
  // mutation-point: artifact-identity-wrong
  if (artifactIdentity.value !== expected.artifactPath && !expectations.otherActBoundArtifacts.includes(artifactIdentity.value)) return unlawful('artifact-identity-wrong', `act names ${artifactIdentity.value}, expected ${expected.artifactPath}`);

  const exactDigest = record.exactDigest;
  // mutation-point: exact-digest-missing
  if (exactDigest.kind === 'missing') return unlawful('exact-digest-missing', 'RFC3-16(b) item 3 absent');
  // mutation-point: exact-digest-malformed
  if (exactDigest.kind === 'malformed' || !SHA256.test(exactDigest.value)) return unlawful('exact-digest-malformed', 'RFC3-16(b) item 3 is not a SHA-256 digest');
  // mutation-point: exact-digest-wrong
  if (exactDigest.value !== judgmentDigest) return unlawful('exact-digest-wrong', `act binds ${exactDigest.value}; the judgment as read is ${judgmentDigest}`);

  const actType = record.actType;
  // mutation-point: act-type-missing
  if (actType.kind === 'missing') return unlawful('act-type-missing', 'RFC3-16(b) item 4 absent');
  // mutation-point: act-type-malformed
  if (actType.kind === 'malformed' || !SLUG.test(actType.value)) return unlawful('act-type-malformed', 'RFC3-16(b) item 4 is not an act-type slug');
  // mutation-point: act-type-wrong
  if (actType.value !== expected.actType) return unlawful('act-type-wrong', `act type ${actType.value}, expected ${expected.actType}`);

  const actInstant = record.actInstant;
  // mutation-point: act-instant-missing
  if (actInstant.kind === 'missing') return unlawful('act-instant-missing', 'RFC3-16(b) item 6 absent');
  // mutation-point: act-instant-malformed
  if (actInstant.kind === 'malformed' || !isIsoDate(actInstant.value)) return unlawful('act-instant-malformed', 'RFC3-16(b) item 6 is not a date');
  // mutation-point: act-instant-wrong
  if (actInstant.value > evaluationDate) return unlawful('act-instant-wrong', `act instant ${actInstant.value} is after the evaluation instant ${evaluationDate}`);

  const owner = record.owner;
  // mutation-point: owner-missing
  if (owner.kind === 'missing') return unlawful('owner-missing', 'RFC3-16(b) item 5 absent');
  // mutation-point: owner-malformed
  if (owner.kind === 'malformed' || !isHumanName(owner.value)) return unlawful('owner-malformed', 'RFC3-16(b) item 5 is not an attribution');
  // mutation-point: owner-non-human
  if (NON_HUMAN_PRINCIPAL.test(owner.value)) return unlawful('owner-non-human', `attributed to a non-human principal: ${owner.value}`);
  // mutation-point: owner-another-human
  if (owner.value !== expectations.owner) return unlawful('owner-another-human', `attributed to ${owner.value}, not the project owner`);

  const scope = record.scope;
  // mutation-point: scope-missing
  if (scope.kind === 'missing') return unlawful('scope-missing', 'RFC3-16(b) item 7 absent');
  // mutation-point: scope-malformed
  if (scope.kind === 'malformed') return unlawful('scope-malformed', 'RFC3-16(b) item 7 is empty');
  // mutation-point: scope-wrong
  if (!expected.scopeAnchors.every((anchor) => scope.value.replace(/\s+/g, ' ').includes(anchor))) return unlawful('scope-wrong', 'RFC3-16(b) item 7 does not state the expected scope');

  const supersession = record.supersession;
  // mutation-point: supersession-target-missing
  if (supersession.kind === 'missing') return unlawful('supersession-target-missing', 'RFC3-16(b) item 8 absent');
  // mutation-point: supersession-target-malformed
  if (supersession.kind === 'malformed') return unlawful('supersession-target-malformed', 'RFC3-16(b) item 8 is neither none nor a named target');
  // mutation-point: supersession-target-wrong
  if (supersession.value.relation !== 'none') return unlawful('supersession-target-wrong', `act ${supersession.value.relation} ${supersession.value.target}; no supersession is expected`);

  const a1 = record.a1;
  // mutation-point: a1-identity-missing
  if (a1.kind === 'missing') return unlawful('a1-identity-missing', 'RFC3-16(b) item 9 absent');
  // mutation-point: a1-identity-malformed
  if (a1.kind === 'malformed') return unlawful('a1-identity-malformed', 'RFC3-16(b) item 9 is neither an identity nor explicit absence');
  // mutation-point: a1-identity-wrong
  if (expected.a1.kind === 'identity' && (a1.value.absent || a1.value.identity !== expected.a1.identity)) return unlawful('a1-identity-wrong', 'RFC3-16(b) item 9 does not name the expected audit record');

  // --- Evaluation association (4).
  const actIdentity = record.actIdentity;
  // mutation-point: act-identity-missing
  if (actIdentity.kind === 'missing') return unlawful('act-identity-missing', 'act-record identity absent');
  // mutation-point: act-identity-malformed
  if (actIdentity.kind === 'malformed' || !ACT_IDENTITY.test(actIdentity.value)) return unlawful('act-identity-malformed', 'act-record identity is not an identifier');
  // mutation-point: act-identity-wrong
  if (actIdentity.value !== expected.actIdentity) return unlawful('act-identity-wrong', `act ${actIdentity.value}, expected ${expected.actIdentity}`);
  // mutation-point: paired-to-different-authority
  if (artifactIdentity.value !== expected.artifactPath) return unlawful('paired-to-different-authority', `act is bound to ${artifactIdentity.value}, another authority's artifact`);

  // --- Provenance-state input (3).
  const provenanceState = record.provenanceState;
  // mutation-point: provenance-state-missing
  if (provenanceState.kind === 'missing') return unlawful('provenance-state-missing', 'provenance state absent');
  // mutation-point: provenance-state-malformed
  if (provenanceState.kind === 'malformed') return unlawful('provenance-state-malformed', 'provenance state is not a labelled state');
  claimed = provenanceFromLabel(provenanceState.value.label);
  // mutation-point: provenance-state-outside-vocabulary
  if (claimed === undefined) return unlawful('provenance-state-outside-vocabulary', `\`${provenanceState.value.label}\` is outside RFC3-16(c)'s two states`);

  // --- Lifecycle (4).
  // mutation-point: stale
  if (actInstant.value < expectations.governingActInstant) return unlawful('stale', `act instant ${actInstant.value} predates the governing act ${expectations.governingActInstant}`);
  // mutation-point: expired
  if (record.expires.kind !== 'missing' && (record.expires.kind === 'malformed' || !isIsoDate(record.expires.value) || record.expires.value <= evaluationDate)) return unlawful('expired', 'act declares an expiry that has passed or cannot be read');
  // mutation-point: superseded
  if (judgment.lifecycle.supersededBy !== undefined) return unlawful('superseded', `superseded by ${judgment.lifecycle.supersededBy}`);
  // mutation-point: revoked
  if (judgment.lifecycle.revokedBy !== undefined) return unlawful('revoked', `revoked by ${judgment.lifecycle.revokedBy}`);

  // --- Provenance-state mechanics (5).
  // mutation-point: state-1-not-explicitly-selected
  if (claimed === 'state-1' && !provenanceState.value.explicitSelection) return unlawful('state-1-not-explicitly-selected', 'state (1) must be explicitly selected by the human act');
  // mutation-point: state-1-a1-present
  if (claimed === 'state-1' && !a1.value.absent) return unlawful('state-1-a1-present', 'state (1) must record the A1 audit-record identity as absent');
  const correlation: CorrelationOutcome | undefined =
    claimed === 'state-2'
      ? a1.value.absent
        ? 'unavailable'
        : correlate({ subject: 'walkthrough-judgment', actIdentity: actIdentity.value, a1Identity: a1.value.identity, artifactDigest: judgmentDigest })
      : undefined;
  // mutation-point: state-2-correlation-failed
  if (correlation === 'failed') return unlawful('state-2-correlation-failed', 'claimed state (2) but A1 correlation failed; no fallback to state (1)');
  // mutation-point: state-2-correlation-unavailable
  if (correlation === 'unavailable') return unlawful('state-2-correlation-unavailable', 'claimed state (2) but A1 correlation is unavailable; no fallback to state (1)');
  // mutation-point: state-2-correlation-indeterminate
  if (correlation === 'indeterminate') return unlawful('state-2-correlation-indeterminate', 'claimed state (2) but A1 correlation is indeterminate; no fallback to state (1)');

  // --- State-(1) record semantics (6).
  const phrase = record.ceremonyPhrase;
  // mutation-point: phrase-missing
  if (phrase.kind === 'missing') return unlawful('phrase-missing', 'the exact owner phrase is absent');
  // mutation-point: phrase-malformed
  if (phrase.kind === 'malformed' || !PHRASE.test(phrase.value)) return unlawful('phrase-malformed', 'the owner phrase is not of the form PHRASE: <sha256>');
  const phraseParts = PHRASE.exec(phrase.value);
  // mutation-point: phrase-mismatched
  if (phraseParts?.[1] !== expected.phrasePrefix || phraseParts[2] !== exactDigest.value) return unlawful('phrase-mismatched', 'the owner phrase does not match this act and digest');

  const tag = record.recordingTag;
  // mutation-point: recording-tag-missing
  if (tag.kind === 'missing') return unlawful('recording-tag-missing', 'the recording tag is absent');
  // mutation-point: recording-tag-malformed
  if (tag.kind === 'malformed' || !TAG.test(tag.value)) return unlawful('recording-tag-malformed', 'the recording tag is not a tag name');
  // mutation-point: recording-tag-mismatched
  if (tag.value !== expected.recordingTag || judgment.recordingTag.kind !== 'resolved') return unlawful('recording-tag-mismatched', `recording tag ${tag.value} does not resolve to the expected recording ${expected.recordingTag}`);

  // --- Lawful. The verdict is carried as recorded human judgment.
  const provenance: ProvenanceLabel = claimed;
  // mutation-point: exact-state
  const stateLabel = provenance === 'state-2' ? STATE_2_LABEL : STATE_1_LABEL;
  return {
    kind: 'lawful',
    criterion: 'owner-verdict-carried',
    evidenceKind: 'recorded-human-judgment',
    provenance,
    stateLabel,
    // mutation-point: independently-verified
    independentlyVerified: provenance === 'state-2',
    // mutation-point: exact-disclosure
    disclosure: provenance === 'state-2' ? STATE_2_DISCLOSURE : STATE_1_DISCLOSURE,
    verdict: {
      criterion: verdictParts[1] ?? '',
      value: verdictParts[2] as VerdictValue,
      rationale,
      judgingParty: parsed.judgingParty.value,
    },
    runRecord: {
      identity: runIdentity,
      digest: runDigest,
      surfaceVersion: run.surfaceVersion.value,
      evaluationIdentity: run.evaluationIdentity.value,
      mode: run.mode.value as WalkthroughMode,
      traversedPaths: paths.value,
    },
    judgmentDigest,
    actIdentity: actIdentity.value,
    actInstant: actInstant.value,
  };
}

// Judgment history is append-only: a later evaluation (for example one
// whose A1 correlation succeeded) is a new entry and never rewrites the
// provenance under which an earlier judgment took effect (PWB-REQ-022).
// Test seam: no production code calls it; walkthrough-judgment.test.ts pins the
// append-only rule through it, and the mutation sweep's history-append-only
// site is in its body.
export function appendJudgmentEvaluation(
  history: readonly WalkthroughJudgmentEvaluation[],
  evaluation: WalkthroughJudgmentEvaluation,
): readonly WalkthroughJudgmentEvaluation[] {
  for (const earlier of history) {
    // mutation-point: history-append-only
    if (earlier.evaluationId === evaluation.evaluationId) {
      throw new Error(`evaluation ${evaluation.evaluationId} is already recorded; history is append-only`);
    }
  }
  return Object.freeze([...history, deepFreeze(evaluation)]);
}
