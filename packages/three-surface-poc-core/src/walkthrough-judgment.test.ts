// PWB-REQ-022 conformance: both valid judgment states, the closed 84-case
// present-invalid population, both absent cases, failed state-(2)
// correlation without fallback, and later-correlation history.
//
// Oracle independence: the expected case table, the `verdict-unlawful`
// literal, the two state labels and the state-(1) disclosure are
// hand-typed here; this file never imports the evaluator's case
// vocabulary or the disclosure module. The one cross-check against the
// implementation reads its source as TEXT (mutation-point markers), so a
// case without a predicate — or a predicate without a case — fails.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  JUDGMENT_CORRELATION_UNAVAILABLE,
  appendJudgmentEvaluation,
  evaluateWalkthroughJudgment,
  type ActRecordInput,
  type JudgmentCorrelator,
  type JudgmentInput,
  type RunRecordInput,
  type WalkthroughJudgmentExpectations,
  type WalkthroughJudgmentInputs,
} from './index.js';

// ---------------------------------------------------------------------
// Literal fixtures.
// ---------------------------------------------------------------------

const OWNER = 'Tzeusy';
const PROJECT = 'project:syzygy';
const CRITERION = 'polaris-cold-open-comprehension';
const RUN_ID = 'PWB-WALKTHROUGH-2026-09-05';
const RUN_PATH = '.syzygy/governance/records/PWB-WALKTHROUGH-2026-09-05.md';
const JUDGMENT_PATH = '.syzygy/governance/decisions/PWB-COLD-OPEN-WALKTHROUGH-JUDGMENT-2026-09-05.md';
const SURFACE = 'polaris@0.3.0';
const EVALUATION = 'eval-0007';
const MODE = 'nonvisual-keyboard-only';
const ROUTES = ['/', '/polaris', '/trajectory', '/orrery', '/entry'];
const TRAVERSED = ['/polaris', '/entry', '/polaris'];
const EVALUATION_INSTANT = '2026-09-06T10:00:00Z';
const GOVERNING_ACT_DATE = '2026-09-02';
const ACT_DATE = '2026-09-05';
const A1_IDENTITY = 'a1:audit-record-0042';
const OTHER_ACT_BOUND = [
  '.syzygy/governance/decisions/BUTLERS-PROJECT-SHAPE-OBSERVATION-CONSENT.md',
  '.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json',
];
const ACT = {
  actIdentity: 'PWB-WALKTHROUGH-JUDGMENT-2026-09-05',
  actType: 'adopt-walkthrough-judgment',
  phrasePrefix: 'ADOPT POLARIS COLD-OPEN WALKTHROUGH JUDGMENT',
  recordingTag: 'pwb-adopt-walkthrough-judgment-signed-2026-09-05',
  title: 'Polaris cold-open walkthrough judgment',
  effect: `The judgment below is the owner's recorded judgment on the cold-open
walkthrough \`${RUN_ID}\` against the criterion
\`${CRITERION}\` (PWB-REQ-021). It authorizes nothing else.`,
  scopeAnchors: [RUN_ID, CRITERION],
} as const;

// Hand-typed expected strings (never imported).
const UNLAWFUL = 'verdict-unlawful';
const STATE_1 = 'owner-adopted (bootstrap, uncorrelated)';
const STATE_2 = 'Syzygy-verified';
const STATE_1_SENTENCE =
  "Owner-trusted only; same-tree forgeable from Syzygy's perspective. Digest detects drift, not authorship or attendance.";

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}
function bytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

interface RunOverrides {
  readonly omit?: readonly string[];
  readonly set?: Readonly<Record<string, string>>;
  // null omits the section; 'raw' writes unbackticked items.
  readonly paths?: readonly string[] | null | 'raw';
}

function runRecordText(overrides: RunOverrides = {}): string {
  const head: [string, string][] = [
    ['Record identity:', `\`${RUN_ID}\``],
    ['Surface version:', `\`${SURFACE}\``],
    ['Evaluation identity:', `\`${EVALUATION}\``],
    ['Mode:', `\`${MODE}\``],
    ['Recorded by:', 'the recording session, 2026-09-05'],
  ];
  const lines: string[] = ['# Cold-open walkthrough execution record', ''];
  for (const [label, value] of head) {
    if (overrides.omit?.includes(label)) continue;
    lines.push(`${label} ${overrides.set?.[label] ?? value}`, '');
  }
  if (overrides.paths !== null) {
    lines.push('## Traversed paths', '');
    if (overrides.paths === 'raw') lines.push('- polaris', '');
    else for (const path of overrides.paths ?? TRAVERSED) lines.push(`- \`${path}\``);
    lines.push('');
  }
  lines.push(
    '## Answers',
    '',
    '1. Why Butlers exists: (answer in the reader\'s own words).',
    '2. One current Unknown or contradiction: (answer).',
    '',
  );
  return lines.join('\n');
}

interface JudgmentOverrides {
  readonly omit?: readonly string[];
  readonly set?: Readonly<Record<string, string>>;
  // null omits the section; '' writes an empty section.
  readonly rationale?: string | null;
  readonly verdict?: 'met' | 'not-met';
}

function judgmentText(runDigest: string, overrides: JudgmentOverrides = {}): string {
  const head: [string, string][] = [
    ['Date:', ACT_DATE],
    ['Judging party:', OWNER],
    ['Verdict:', `\`${CRITERION}=${overrides.verdict ?? 'met'}\``],
    ['Run record:', `\`${RUN_ID}@${runDigest}\``],
  ];
  const lines: string[] = ['# Owner judgment — Polaris cold-open walkthrough', ''];
  for (const [label, value] of head) {
    if (overrides.omit?.includes(label)) continue;
    lines.push(`${label} ${overrides.set?.[label] ?? value}`, '');
  }
  if (overrides.rationale !== null) {
    lines.push('## Rationale', '');
    const rationale =
      overrides.rationale ??
      `Reading \`${RUN_ID}\` against the Butlers intent tree, every RFC7-30 prompt was answered without a surface-caused error.`;
    if (rationale !== '') lines.push(rationale, '');
  }
  return lines.join('\n');
}

interface RecordOverrides {
  readonly omit?: readonly string[];
  readonly set?: Readonly<Record<string, string>>;
  readonly phrase?: string | null;
  readonly recordingTag?: string | null;
  readonly effect?: string | null;
  readonly state?: 'state-1' | 'state-2' | 'unselected-state-1';
  readonly a1?: string;
  readonly extraHead?: readonly string[];
}

function actRecord(digest: string, overrides: RecordOverrides = {}): string {
  const state = overrides.state ?? 'state-1';
  const provenance =
    state === 'state-2'
      ? '`Syzygy-verified` — state (2), correlated through the A1 audit record'
      : state === 'unselected-state-1'
        ? '`owner-adopted (bootstrap, uncorrelated)` — state (1)'
        : '`owner-adopted (bootstrap, uncorrelated)` — state (1),\nexplicitly selected by performing the offered state-(1) phrase';
  const a1 = overrides.a1 ?? (state === 'state-2' ? `\`${A1_IDENTITY}\`` : '**explicitly absent**');
  const head: [string, string][] = [
    ['Date:', ACT_DATE],
    ['Owner:', OWNER],
    ['Act identity:', `\`${ACT.actIdentity}\``],
    ['Act type:', `\`${ACT.actType}\``],
    ['Project identity:', `\`${PROJECT}\``],
    ['Artifact identity:', `\`${JUDGMENT_PATH}\``],
    ['Exact digest (SHA-256):', `\`${digest}\``],
    ['Provenance state:', provenance],
    ['Supersession / revocation:', 'none — this act supersedes no earlier act'],
    ['A1 audit-record identity (RFC3-16(b) item 9):', a1],
  ];
  const lines: string[] = [`# Owner act — ${ACT.title}`, ''];
  for (const [label, value] of head) {
    if (overrides.omit?.includes(label)) continue;
    lines.push(`${label} ${overrides.set?.[label] ?? value}`.trimEnd(), '');
  }
  for (const extra of overrides.extraHead ?? []) lines.push(extra, '');
  const phrase = overrides.phrase === undefined ? `${ACT.phrasePrefix}: ${digest}` : overrides.phrase;
  const tag = overrides.recordingTag === undefined ? ACT.recordingTag : overrides.recordingTag;
  lines.push('## Ceremony', '', 'The owner performed this one act by writing exactly:', '');
  if (phrase !== null) lines.push('```text', phrase, '```', '');
  lines.push('Frozen provenance:', '', '- reviewed subject: `48e0f5db645d1fb08e5e3a65c5e50dbcece40412`;');
  if (tag !== null) lines.push(`- recording tag: \`${tag}\`, on the commit carrying this act record.`);
  lines.push('');
  if (overrides.effect !== null) {
    lines.push('## Effect', '');
    if (overrides.effect !== undefined) {
      if (overrides.effect !== '') lines.push(overrides.effect, '');
    } else {
      lines.push(ACT.effect, '');
    }
  }
  lines.push('## What this act does not authorize', '', 'Nothing beyond its own authority.', '');
  return lines.join('\n');
}

function expectations(a1: 'absent' | 'identity' = 'absent'): WalkthroughJudgmentExpectations {
  return {
    observingProject: PROJECT,
    owner: OWNER,
    evaluationInstant: EVALUATION_INSTANT,
    governingActInstant: GOVERNING_ACT_DATE,
    criterion: CRITERION,
    runRecordIdentity: RUN_ID,
    surfaceVersion: SURFACE,
    evaluationIdentity: EVALUATION,
    mode: MODE,
    surfaceRoutes: ROUTES,
    judgment: {
      artifactPath: JUDGMENT_PATH,
      actIdentity: ACT.actIdentity,
      actType: ACT.actType,
      phrasePrefix: ACT.phrasePrefix,
      recordingTag: ACT.recordingTag,
      scopeAnchors: ACT.scopeAnchors,
      a1: a1 === 'identity' ? { kind: 'identity', identity: A1_IDENTITY } : { kind: 'absent' },
    },
    otherActBoundArtifacts: OTHER_ACT_BOUND,
  };
}

interface Fixture {
  readonly run?: RunOverrides;
  readonly runPath?: string;
  readonly runArtifact?: RunRecordInput['artifact'];
  readonly judgment?: JudgmentOverrides;
  readonly judgmentPath?: string;
  readonly judgmentArtifact?: JudgmentInput['artifact'];
  readonly record?: RecordOverrides;
  readonly actRecord?: ActRecordInput;
  readonly lifecycle?: JudgmentInput['lifecycle'];
  readonly recordingTag?: JudgmentInput['recordingTag'];
  readonly expectations?: WalkthroughJudgmentExpectations;
  readonly correlate?: JudgmentCorrelator;
  readonly evaluationId?: string;
}

function inputs(fixture: Fixture = {}): WalkthroughJudgmentInputs {
  const runText = runRecordText(fixture.run);
  const runDigest = sha256(runText);
  const judgmentTextValue = judgmentText(runDigest, fixture.judgment);
  const judgmentDigest = sha256(judgmentTextValue);
  return {
    evaluationId: fixture.evaluationId ?? 'judgment-eval-0001',
    runRecord: {
      path: fixture.runPath ?? RUN_PATH,
      artifact: fixture.runArtifact ?? { kind: 'present', bytes: bytes(runText) },
    },
    judgment: {
      path: fixture.judgmentPath ?? JUDGMENT_PATH,
      artifact: fixture.judgmentArtifact ?? { kind: 'present', bytes: bytes(judgmentTextValue) },
      actRecord: fixture.actRecord ?? { kind: 'owner-act-record', text: actRecord(judgmentDigest, fixture.record) },
      lifecycle: fixture.lifecycle ?? {},
      recordingTag: fixture.recordingTag ?? { kind: 'resolved', commit: '45fce03ac7929649def093f4563d6e5e98cbff5c' },
    },
    expectations: fixture.expectations ?? expectations(),
    correlate: fixture.correlate ?? JUDGMENT_CORRELATION_UNAVAILABLE,
  };
}

// ---------------------------------------------------------------------
// Expected table — 84 present-invalid cases, one fixture mutation each.
// ---------------------------------------------------------------------

const HOME_CASES: readonly [string, Fixture][] = [
  ['run-record-outside-records-home', { runPath: '.syzygy/governance/decisions/PWB-WALKTHROUGH-2026-09-05.md' }],
  ['judgment-outside-decisions-home', { judgmentPath: '.syzygy/governance/records/PWB-COLD-OPEN-WALKTHROUGH-JUDGMENT-2026-09-05.md' }],
];

const RUN_RECORD_CASES: readonly [string, Fixture][] = [
  ['run-record-identity-missing', { run: { omit: ['Record identity:'] } }],
  ['run-record-identity-malformed', { run: { set: { 'Record identity:': '`walkthrough 5`' } } }],
  ['run-record-identity-wrong', { run: { set: { 'Record identity:': '`PWB-WALKTHROUGH-2026-09-01`' } } }],
  ['surface-version-missing', { run: { omit: ['Surface version:'] } }],
  ['surface-version-malformed', { run: { set: { 'Surface version:': '`polaris 0.3.0`' } } }],
  ['surface-version-wrong', { run: { set: { 'Surface version:': '`polaris@0.2.9`' } } }],
  ['evaluation-identity-missing', { run: { omit: ['Evaluation identity:'] } }],
  ['evaluation-identity-malformed', { run: { set: { 'Evaluation identity:': '`Eval 7`' } } }],
  ['evaluation-identity-wrong', { run: { set: { 'Evaluation identity:': '`eval-0006`' } } }],
  ['nonvisual-mode-missing', { run: { omit: ['Mode:'] } }],
  ['nonvisual-mode-malformed', { run: { set: { 'Mode:': '`keyboard`' } } }],
  ['nonvisual-mode-wrong', { run: { set: { 'Mode:': '`visual-pointer`' } } }],
  ['traversed-paths-missing', { run: { paths: null } }],
  ['traversed-paths-malformed', { run: { paths: 'raw' } }],
  ['traversed-paths-wrong', { run: { paths: ['/polaris', '/admin'] } }],
];

const JUDGMENT_FIELD_CASES: readonly [string, Fixture][] = [
  ['verdict-missing', { judgment: { omit: ['Verdict:'] } }],
  ['verdict-malformed', { judgment: { set: { 'Verdict:': '`passed`' } } }],
  ['verdict-wrong', { judgment: { set: { 'Verdict:': '`some-other-criterion=met`' } } }],
  ['rationale-missing', { judgment: { rationale: null } }],
  ['rationale-malformed', { judgment: { rationale: '' } }],
  ['rationale-wrong', { judgment: { rationale: 'Compared the answers retained in `PWB-WALKTHROUGH-2026-08-30`.' } }],
  ['judging-party-missing', { judgment: { omit: ['Judging party:'] } }],
  ['judging-party-malformed', { judgment: { set: { 'Judging party:': '`Tzeusy`' } } }],
  ['judging-party-wrong', { judgment: { set: { 'Judging party:': 'Somebody Else' } } }],
  ['run-record-reference-missing', { judgment: { omit: ['Run record:'] } }],
  ['run-record-reference-malformed', { judgment: { set: { 'Run record:': `\`${RUN_ID}\`` } } }],
  ['run-record-reference-wrong', { judgment: { set: { 'Run record:': `\`${RUN_ID}@${'0'.repeat(64)}\`` } } }],
];

const COMMON_CASES: readonly [string, Fixture][] = [
  ['project-identity-missing', { record: { omit: ['Project identity:'] } }],
  ['project-identity-malformed', { record: { set: { 'Project identity:': '`Syzygy Project`' } } }],
  ['project-identity-wrong', { record: { set: { 'Project identity:': '`project:other`' } } }],
  ['artifact-identity-missing', { record: { omit: ['Artifact identity:'] } }],
  ['artifact-identity-malformed', { record: { set: { 'Artifact identity:': '`../../etc/passwd`' } } }],
  ['artifact-identity-wrong', { record: { set: { 'Artifact identity:': '`.syzygy/governance/decisions/SOMETHING-ELSE.md`' } } }],
  ['exact-digest-missing', { record: { omit: ['Exact digest (SHA-256):'] } }],
  ['exact-digest-malformed', { record: { set: { 'Exact digest (SHA-256):': '`sha256:not-a-digest`' } } }],
  ['exact-digest-wrong', { record: { set: { 'Exact digest (SHA-256):': `\`${'0'.repeat(64)}\`` } } }],
  ['act-type-missing', { record: { omit: ['Act type:'] } }],
  ['act-type-malformed', { record: { set: { 'Act type:': '`Adopt Judgment!`' } } }],
  ['act-type-wrong', { record: { set: { 'Act type:': '`consent-observation`' } } }],
  ['act-instant-missing', { record: { omit: ['Date:'] } }],
  ['act-instant-malformed', { record: { set: { 'Date:': 'yesterday' } } }],
  ['act-instant-wrong', { record: { set: { 'Date:': '2027-01-01' } } }],
  ['owner-missing', { record: { omit: ['Owner:'] } }],
  ['owner-malformed', { record: { set: { 'Owner:': '`**`' } } }],
  ['owner-non-human', { record: { set: { 'Owner:': 'agent: Claude Code' } } }],
  ['owner-another-human', { record: { set: { 'Owner:': 'Somebody Else' } } }],
  ['scope-missing', { record: { effect: null } }],
  ['scope-malformed', { record: { effect: '' } }],
  ['scope-wrong', { record: { effect: 'This act adopts the judgment on some other walkthrough.' } }],
  ['supersession-target-missing', { record: { omit: ['Supersession / revocation:'] } }],
  ['supersession-target-malformed', { record: { set: { 'Supersession / revocation:': 'maybe' } } }],
  ['supersession-target-wrong', { record: { set: { 'Supersession / revocation:': 'supersedes `PWB-EARLIER-JUDGMENT-2026-08-01`' } } }],
  ['a1-identity-missing', { record: { omit: ['A1 audit-record identity (RFC3-16(b) item 9):'] } }],
  ['a1-identity-malformed', { record: { a1: 'n/a' } }],
  ['a1-identity-wrong', { record: { state: 'state-2', a1: '`a1:some-other-record`' }, expectations: expectations('identity'), correlate: () => 'succeeded' }],
  ['act-identity-missing', { record: { omit: ['Act identity:'] } }],
  ['act-identity-malformed', { record: { set: { 'Act identity:': '`pwb act #1`' } } }],
  ['act-identity-wrong', { record: { set: { 'Act identity:': '`PWB-SOME-OTHER-ACT-2026-09-05`' } } }],
  ['paired-to-different-authority', { record: { set: { 'Artifact identity:': `\`${OTHER_ACT_BOUND[0]}\`` } } }],
  ['provenance-state-missing', { record: { omit: ['Provenance state:'] } }],
  ['provenance-state-malformed', { record: { set: { 'Provenance state:': 'trusted' } } }],
  ['provenance-state-outside-vocabulary', { record: { set: { 'Provenance state:': '`owner-verified` — state (3), explicitly selected' } } }],
  ['tree-attribution-only', { actRecord: { kind: 'tree-attribution-only', stamp: 'Status: judged' } }],
  ['git-ref-only', { actRecord: { kind: 'git-ref-only', ref: ACT.recordingTag } }],
  ['specification-signoff-only', { actRecord: { kind: 'specification-signoff-only', signoffRecord: '.syzygy/governance/decisions/PWB-STATE1-AMENDMENT-ACT.md' } }],
  ['machine-submission', { actRecord: { kind: 'machine-submission', submitter: 'node-ci' } }],
  ['agent-assertion', { actRecord: { kind: 'agent-assertion', agent: 'claude-code' } }],
  ['stale', { record: { set: { 'Date:': '2026-08-31' } } }],
  ['expired', { record: { extraHead: ['Expires: 2026-09-01'] } }],
  ['superseded', { lifecycle: { supersededBy: 'PWB-LATER-JUDGMENT-2026-09-10' } }],
  ['revoked', { lifecycle: { revokedBy: 'PWB-REVOCATION-2026-09-10' } }],
  ['state-1-not-explicitly-selected', { record: { state: 'unselected-state-1' } }],
  ['state-1-a1-present', { record: { state: 'state-1', a1: `\`${A1_IDENTITY}\`` } }],
  ['state-2-correlation-failed', { record: { state: 'state-2' }, expectations: expectations('identity'), correlate: () => 'failed' }],
  ['state-2-correlation-unavailable', { record: { state: 'state-2' }, expectations: expectations('identity'), correlate: () => 'unavailable' }],
  ['state-2-correlation-indeterminate', { record: { state: 'state-2' }, expectations: expectations('identity'), correlate: () => 'indeterminate' }],
  ['phrase-missing', { record: { phrase: null } }],
  ['phrase-malformed', { record: { phrase: 'I agree.' } }],
  ['phrase-mismatched', { record: { phrase: `SOME OTHER PHRASE: ${'a'.repeat(64)}` } }],
  ['recording-tag-missing', { record: { recordingTag: null } }],
  ['recording-tag-malformed', { record: { recordingTag: 'Tag With Spaces' } }],
  ['recording-tag-mismatched', { recordingTag: { kind: 'unresolved' } }],
];

const PRESENT_INVALID: readonly [string, Fixture][] = [
  ...HOME_CASES,
  ...RUN_RECORD_CASES,
  ...JUDGMENT_FIELD_CASES,
  ...COMMON_CASES,
];

const ABSENT_CASES: readonly [string, string, Fixture][] = [
  ['no-run-record', 'run record missing', { runArtifact: { kind: 'missing' } }],
  ['no-run-record', 'run record unreadable', { runArtifact: { kind: 'unreadable' } }],
  ['no-judgment', 'judgment missing', { judgmentArtifact: { kind: 'missing' } }],
  ['no-judgment', 'judgment unreadable', { judgmentArtifact: { kind: 'unreadable' } }],
  ['no-judgment', 'judgment without an owner act', { actRecord: { kind: 'absent' } }],
];

function numbersIn(value: unknown, path = '$'): string[] {
  if (typeof value === 'number') return [path];
  if (Array.isArray(value)) return value.flatMap((entry, index) => numbersIn(entry, `${path}[${index}]`));
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).flatMap(([key, entry]) => numbersIn(entry, `${path}.${key}`));
  }
  return [];
}

// ---------------------------------------------------------------------
// Denominators.
// ---------------------------------------------------------------------

describe('PWB-REQ-022 — closed judgment-case denominators', () => {
  it('the hand-typed table has exactly 84 distinct present-invalid cases in the spec groups (55 + 15 + 12 + 2)', () => {
    expect(COMMON_CASES.length).toBe(55);
    expect(RUN_RECORD_CASES.length).toBe(15);
    expect(JUDGMENT_FIELD_CASES.length).toBe(12);
    expect(HOME_CASES.length).toBe(2);
    expect(PRESENT_INVALID.length).toBe(84);
    expect(new Set(PRESENT_INVALID.map(([id]) => id)).size).toBe(84);
    expect(new Set(ABSENT_CASES.map(([id]) => id)).size).toBe(2);
  });

  it('every case has exactly one predicate in the evaluator source, and no case predicate lacks a case', () => {
    const source = readFileSync(fileURLToPath(new URL('./walkthrough-judgment.ts', import.meta.url)), 'utf8');
    const markers = [...source.matchAll(/^\s*\/\/ mutation-point: ([a-z0-9-]+)$/gm)].map((match) => match[1] ?? '');
    const cases = new Set(PRESENT_INVALID.map(([id]) => id));
    for (const id of cases) {
      expect(markers.filter((marker) => marker === id), id).toHaveLength(1);
    }
    const extra = markers.filter((marker) => !cases.has(marker));
    // The four remaining sites are the literal mutation targets the spec
    // names beside the case sweep (exact state, disclosure, verification
    // flag, history), not invalid cases.
    expect(extra.sort()).toEqual(['exact-disclosure', 'exact-state', 'history-append-only', 'independently-verified']);
  });
});

// ---------------------------------------------------------------------
// Valid states.
// ---------------------------------------------------------------------

describe('PWB-REQ-022 — valid judgment states carry the owner verdict with the exact state', () => {
  it('valid state (1): owner-adopted, not independently verified, exact disclosure', () => {
    const evaluation = evaluateWalkthroughJudgment(inputs());
    const outcome = evaluation.outcome;
    expect(outcome.kind).toBe('lawful');
    if (outcome.kind !== 'lawful') return;
    expect(outcome.provenance).toBe('state-1');
    expect(outcome.stateLabel).toBe(STATE_1);
    expect(outcome.independentlyVerified).toBe(false);
    expect(outcome.disclosure).toBe(STATE_1_SENTENCE);
    expect(outcome.criterion).toBe('owner-verdict-carried');
    expect(outcome.evidenceKind).toBe('recorded-human-judgment');
    expect(outcome.verdict).toEqual({
      criterion: CRITERION,
      value: 'met',
      rationale: `Reading \`${RUN_ID}\` against the Butlers intent tree, every RFC7-30 prompt was answered without a surface-caused error.`,
      judgingParty: OWNER,
    });
    expect(outcome.runRecord).toEqual({
      identity: RUN_ID,
      digest: sha256(runRecordText()),
      surfaceVersion: SURFACE,
      evaluationIdentity: EVALUATION,
      mode: MODE,
      traversedPaths: TRAVERSED,
    });
    expect(outcome.actIdentity).toBe(ACT.actIdentity);
    expect(outcome.actInstant).toBe(ACT_DATE);
    expect(evaluation.evaluationInstant).toBe(EVALUATION_INSTANT);
  });

  it('valid state (2): Syzygy-verified, independently verified, no state-(1) sentence', () => {
    const outcome = evaluateWalkthroughJudgment(
      inputs({ record: { state: 'state-2' }, expectations: expectations('identity'), correlate: () => 'succeeded' }),
    ).outcome;
    expect(outcome.kind).toBe('lawful');
    if (outcome.kind !== 'lawful') return;
    expect(outcome.provenance).toBe('state-2');
    expect(outcome.stateLabel).toBe(STATE_2);
    expect(outcome.independentlyVerified).toBe(true);
    expect(outcome.disclosure).not.toBe(STATE_1_SENTENCE);
    expect(outcome.verdict.value).toBe('met');
  });

  it("a lawful not-met verdict is carried as the owner's verdict, unchanged", () => {
    const outcome = evaluateWalkthroughJudgment(inputs({ judgment: { verdict: 'not-met' } })).outcome;
    expect(outcome.kind).toBe('lawful');
    if (outcome.kind !== 'lawful') return;
    expect(outcome.verdict.value).toBe('not-met');
    expect(outcome.criterion).toBe('owner-verdict-carried');
  });

  it('a lawful outcome is recorded human judgment: never Observed, never a score', () => {
    const outcome = evaluateWalkthroughJudgment(inputs()).outcome;
    expect(numbersIn(outcome)).toEqual([]);
    expect(JSON.stringify(outcome).toLowerCase()).not.toContain('"observed"');
    expect(JSON.stringify(outcome)).not.toContain('score');
  });

  it('the evaluation object is deeply frozen', () => {
    const evaluation = evaluateWalkthroughJudgment(inputs());
    expect(Object.isFrozen(evaluation)).toBe(true);
    expect(Object.isFrozen(evaluation.outcome)).toBe(true);
    if (evaluation.outcome.kind === 'lawful') {
      expect(Object.isFrozen(evaluation.outcome.verdict)).toBe(true);
      expect(Object.isFrozen(evaluation.outcome.runRecord.traversedPaths)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------
// Absent cases.
// ---------------------------------------------------------------------

describe('PWB-REQ-022 — either absent case renders Unknown, never met, without a verdict', () => {
  it.each(ABSENT_CASES)('%s — %s', (what, _label, fixture) => {
    const outcome = evaluateWalkthroughJudgment(inputs(fixture)).outcome;
    expect(outcome.kind).toBe('absent');
    if (outcome.kind !== 'absent') return;
    expect(outcome.what).toBe(what);
    expect(outcome.criterion).toBe('unknown-never-met');
    expect(outcome.verdict).toBeUndefined();
    expect('recorded' in outcome).toBe(false);
    expect(JSON.stringify(outcome)).not.toContain('=met');
  });

  it('absence of the run record is reported before anything about the judgment is read', () => {
    const outcome = evaluateWalkthroughJudgment(
      inputs({ runArtifact: { kind: 'missing' }, judgmentArtifact: { kind: 'missing' } }),
    ).outcome;
    expect(outcome.kind === 'absent' && outcome.what).toBe('no-run-record');
    expect(outcome.kind === 'absent' && outcome.judgmentDigest).toBeUndefined();
  });
});

// ---------------------------------------------------------------------
// The 84 present-invalid cases.
// ---------------------------------------------------------------------

describe('PWB-REQ-022 — each present-invalid case records verdict-unlawful and Unknown-never-met', () => {
  it.each(PRESENT_INVALID)('%s', (caseId, fixture) => {
    const outcome = evaluateWalkthroughJudgment(inputs(fixture)).outcome;
    expect(outcome.kind).toBe('unlawful');
    if (outcome.kind !== 'unlawful') return;
    expect(outcome.caseId).toBe(caseId);
    expect(outcome.recorded).toBe(UNLAWFUL);
    expect(outcome.criterion).toBe('unknown-never-met');
    expect(outcome.verdict).toBeUndefined();
    expect(outcome.contradiction.clause).toBe('RFC3-16(a)');
    expect(outcome.contradiction.definedTerm).toBe('authorization-bearing governance artifact');
    expect(outcome.contradiction.failing).toEqual([{ subject: 'walkthrough-judgment', state: `${UNLAWFUL}: ${caseId}` }]);
    expect(outcome.contradiction.statement).toContain(caseId);
    expect(outcome.runRecordDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(outcome.judgmentDigest).toMatch(/^[0-9a-f]{64}$/);
  });

  it('the valid pair used as the mutation baseline is itself lawful (so each case is one mutation away)', () => {
    expect(evaluateWalkthroughJudgment(inputs()).outcome.kind).toBe('lawful');
    expect(
      evaluateWalkthroughJudgment(
        inputs({ record: { state: 'state-2' }, expectations: expectations('identity'), correlate: () => 'succeeded' }),
      ).outcome.kind,
    ).toBe('lawful');
  });
});

// One non-human-principal rule (syzygy-bpyt.6.2): this evaluator and the
// PWB-REQ-005 body-read gate classify an owner name the same way. Each
// principal names one arm of the two former rules; the "flipped" ones
// were human to this evaluator before, and refused only as
// owner-another-human.
const NON_HUMAN_OWNERS: readonly [string, string][] = [
  ['agent: Claude Code', 'role prefix agent'],
  ['daemon', 'role prefix daemon'],
  ['automation: nightly', 'role prefix automation'],
  ['syzygy', 'role prefix syzygy'],
  ['ci/release', 'role prefix ci with a slash'],
  ['renovate[bot]', 'suffix [bot]'],
  ['deploy-bot', 'suffix -bot'],
  ['review-agent', 'suffix -agent'],
  ['machine', 'role prefix machine (flipped)'],
  ['Anthropic Claude', 'model name claude as a word (flipped)'],
  ['codex', 'model name codex (flipped)'],
  ['gpt-5', 'model name gpt (flipped)'],
  ['GitHub Copilot', 'model name copilot (flipped)'],
  ['an llm', 'model name llm (flipped)'],
  // syzygy-bpyt.6.8, corrected by syzygy-bpyt.6.11: what each group kills.
  // Section 3H of R-GP-IMPL-OWNER-ACT-FIELDS-1 lists the first seven below.
  //  - bot, service: deploy, system, pipeline-7, model: x, agent: nightly are
  //    each matched by their word in BOTH line-start arms, so they kill only
  //    the deletion of that word from both arms at once (section 3H); a
  //    deletion from one arm leaves the other matching them.
  //  - agent/triage, bot/deploy, system/cron, service/gateway, pipeline/build,
  //    model/v2 (slash) and daemon nightly (whitespace) kill the single-arm
  //    deletions (second arm) and the separator deletions.
  //  - daemon-7 (hyphen) kills the deletion of daemon from the second arm and
  //    of the hyphen from that arm's separator class.
  //  - machine: build-42, machine runner and machine-7 are matched by the
  //    first arm alone and kill the colon, whitespace and hyphen deletions
  //    from its separator class.
  ['bot', 'role prefix bot, bare'],
  ['service: deploy', 'role prefix service, colon'],
  ['system', 'role prefix system, bare'],
  ['pipeline-7', 'role prefix pipeline, hyphen'],
  ['model: x', 'role prefix model, colon'],
  ['agent: nightly', 'role prefix agent with no model name'],
  ['machine: build-42', 'role prefix machine, colon (only the first arm lists machine)'],
  ['machine runner', 'role prefix machine, whitespace'],
  ['machine-7', 'role prefix machine, hyphen'],
  ['agent/triage', 'role prefix agent with a slash'],
  ['bot/deploy', 'role prefix bot with a slash'],
  ['system/cron', 'role prefix system with a slash'],
  ['service/gateway', 'role prefix service with a slash'],
  ['pipeline/build', 'role prefix pipeline with a slash'],
  ['model/v2', 'role prefix model with a slash'],
  ['daemon nightly', 'role prefix daemon, whitespace'],
  ['daemon-7', 'role prefix daemon, hyphen'],
];

describe('PWB-REQ-022 owner-non-human: one rule shared with the body-read gate', () => {
  it.each(NON_HUMAN_OWNERS)('owner %j (%s) → owner-non-human', (owner) => {
    const outcome = evaluateWalkthroughJudgment(inputs({ record: { set: { 'Owner:': owner } } })).outcome;
    expect(outcome.kind).toBe('unlawful');
    if (outcome.kind === 'unlawful') expect(outcome.caseId).toBe('owner-non-human');
  });

  // Each human name sits one anchor away from an arm: a word boundary, a
  // separator after a role prefix, a line start, a line end.
  it.each(['Somebody Else', 'Claudette', 'Botha', 'Agentha Smith', 'Anna Model', 'Anna Daemon', 'Jean-Botha', 'Annagpt Lee'])('a human name %j stays owner-another-human', (owner) => {
    const outcome = evaluateWalkthroughJudgment(inputs({ record: { set: { 'Owner:': owner } } })).outcome;
    expect(outcome.kind).toBe('unlawful');
    if (outcome.kind === 'unlawful') expect(outcome.caseId).toBe('owner-another-human');
  });
});

// ---------------------------------------------------------------------
// State-(2) no-fallback and history.
// ---------------------------------------------------------------------

describe('PWB-REQ-022 — failed state (2) never downgrades; history is append-only', () => {
  it('a failed state-(2) correlation is unlawful with the claimed state retained, not a state-(1) judgment', () => {
    const outcome = evaluateWalkthroughJudgment(
      inputs({ record: { state: 'state-2' }, expectations: expectations('identity'), correlate: () => 'failed' }),
    ).outcome;
    expect(outcome.kind).toBe('unlawful');
    if (outcome.kind !== 'unlawful') return;
    expect(outcome.caseId).toBe('state-2-correlation-failed');
    expect(outcome.claimedProvenance).toBe('state-2');
    expect(JSON.stringify(outcome)).not.toContain(STATE_1);
  });

  it('the production correlator is unavailable, so a state-(2) claim is unlawful here today', () => {
    const outcome = evaluateWalkthroughJudgment(
      inputs({ record: { state: 'state-2' }, expectations: expectations('identity') }),
    ).outcome;
    expect(outcome.kind === 'unlawful' && outcome.caseId).toBe('state-2-correlation-unavailable');
  });

  it('later correlation is a new entry; the earlier state-(1) entry keeps its provenance', () => {
    const first = evaluateWalkthroughJudgment(inputs({ evaluationId: 'judgment-eval-0001' }));
    let history = appendJudgmentEvaluation([], first);
    const later = evaluateWalkthroughJudgment(
      inputs({
        evaluationId: 'judgment-eval-0002',
        record: { state: 'state-2' },
        expectations: expectations('identity'),
        correlate: () => 'succeeded',
      }),
    );
    history = appendJudgmentEvaluation(history, later);
    expect(history.map((entry) => entry.evaluationId)).toEqual(['judgment-eval-0001', 'judgment-eval-0002']);
    expect(history[0]?.outcome.kind === 'lawful' && history[0].outcome.stateLabel).toBe(STATE_1);
    expect(history[0]?.outcome.kind === 'lawful' && history[0].outcome.disclosure).toBe(STATE_1_SENTENCE);
    expect(history[1]?.outcome.kind === 'lawful' && history[1].outcome.stateLabel).toBe(STATE_2);
    expect(Object.isFrozen(history)).toBe(true);
    expect(() => {
      (history[0] as { evaluationId: string }).evaluationId = 'rewritten';
    }).toThrow();
  });

  it('re-recording an evaluation identity throws instead of rewriting', () => {
    const first = evaluateWalkthroughJudgment(inputs({ evaluationId: 'judgment-eval-0001' }));
    const history = appendJudgmentEvaluation([], first);
    const again = evaluateWalkthroughJudgment(
      inputs({
        evaluationId: 'judgment-eval-0001',
        record: { state: 'state-2' },
        expectations: expectations('identity'),
        correlate: () => 'succeeded',
      }),
    );
    expect(() => appendJudgmentEvaluation(history, again)).toThrow(/append-only/);
    expect(history).toHaveLength(1);
  });
});
