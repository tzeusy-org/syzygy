// Test support: exports with no non-test importer are consumed by tests only, by design.

// Test fixture: one lawful cold-open walkthrough pair (run record, judgment,
// owner act record) in the PWB-REQ-021/022 grammar, plus the knobs the
// app-level tests need to reach every presentation state. Never a real
// owner act: identities, dates and digests are fixture values, and the
// judgment evaluator is what decides lawfulness.
import { sha256 } from '@syzygy/support';
import {
  JUDGMENT_CORRELATION_UNAVAILABLE,
  type JudgmentCorrelator,
  type WalkthroughJudgmentExpectations,
  type WalkthroughJudgmentInputs,
} from '@syzygy/three-surface-poc-core';

const JUDGMENT_FIXTURE = {
  owner: 'Tzeusy',
  project: 'project:syzygy',
  criterion: 'polaris-cold-open-comprehension',
  runId: 'PWB-WALKTHROUGH-2026-09-05',
  runPath: '.syzygy/governance/records/PWB-WALKTHROUGH-2026-09-05.md',
  judgmentPath: '.syzygy/governance/decisions/PWB-COLD-OPEN-WALKTHROUGH-JUDGMENT-2026-09-05.md',
  surface: 'polaris@0.3.0',
  evaluation: 'eval-0007',
  mode: 'nonvisual-keyboard-only',
  routes: ['/', '/polaris', '/trajectory', '/orrery', '/entry'],
  // Deliberately repeats a path: multiplicity must survive both channels.
  traversed: ['/polaris', '/entry', '/polaris'],
  evaluationInstant: '2026-09-06T10:00:00Z',
  governingActDate: '2026-09-02',
  actDate: '2026-09-05',
  a1Identity: 'a1:audit-record-0042',
  actIdentity: 'PWB-WALKTHROUGH-JUDGMENT-2026-09-05',
  actType: 'adopt-walkthrough-judgment',
  phrasePrefix: 'ADOPT POLARIS COLD-OPEN WALKTHROUGH JUDGMENT',
  recordingTag: 'pwb-adopt-walkthrough-judgment-signed-2026-09-05',
  rationale: 'Reading `PWB-WALKTHROUGH-2026-09-05` against the Butlers intent tree, every RFC7-30 prompt was answered without a surface-caused error.',
} as const;

const F = JUDGMENT_FIXTURE;

function bytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/** The nine PWB-REQ-021 answer identities, hand-typed here (never imported). */
const FIXTURE_ANSWER_IDENTITIES = [
  'why',
  'promises',
  'refusals-and-rule',
  'capabilities-and-fit',
  'exact-requirement',
  'unknown-or-contradiction',
  'claim-strength',
  'architecture-and-groups',
  'v1-success',
] as const;

export interface FixtureAnswer {
  readonly identity: string;
  readonly text?: string;
  readonly sources?: readonly string[];
  readonly authority?: string;
}

/** Nine answers anchored into the project-shape fixture's root index
 * (`about/README.md`), the exact-requirement one citing it as authority. */
export function fixtureAnswers(): FixtureAnswer[] {
  return FIXTURE_ANSWER_IDENTITIES.map((identity, index) => ({
    identity,
    text: `(${identity}: the reader's own words, fixture ${index + 1}.)`,
    sources: [`about/README.md:${index + 1}`],
    ...(identity === 'exact-requirement' ? { authority: 'about/README.md' } : {}),
  }));
}

interface RunRecordOptions {
  /** Traversed paths; default is the fixture's `/polaris`, `/entry`, `/polaris`. */
  readonly traversed?: readonly string[];
  /** Answers section; `null` omits it; default is the nine fixture answers. */
  readonly answers?: readonly FixtureAnswer[] | null;
}

function fixtureRunRecordText(options: RunRecordOptions = {}): string {
  const lines = [
    '# Cold-open walkthrough execution record',
    '',
    `Record identity: \`${F.runId}\``,
    '',
    `Surface version: \`${F.surface}\``,
    '',
    `Evaluation identity: \`${F.evaluation}\``,
    '',
    `Mode: \`${F.mode}\``,
    '',
    'Recorded by: the recording session, 2026-09-05',
    '',
    '## Traversed paths',
    '',
    ...(options.traversed ?? F.traversed).map((path) => `- \`${path}\``),
    '',
  ];
  if (options.answers !== null) {
    lines.push('## Answers', '');
    for (const answer of options.answers ?? fixtureAnswers()) {
      lines.push(`### ${answer.identity}`, '');
      if (answer.text !== undefined && answer.text !== '') lines.push(answer.text, '');
      if (answer.sources !== undefined) lines.push(`Sources: ${answer.sources.map((source) => `\`${source}\``).join(', ')}`);
      if (answer.authority !== undefined) lines.push(`Authority: \`${answer.authority}\``);
      lines.push('');
    }
  }
  return lines.join('\n');
}

function fixtureJudgmentText(runDigest: string, verdict: 'met' | 'not-met' = 'met', judgingParty: string = F.owner): string {
  return [
    '# Owner judgment — Polaris cold-open walkthrough',
    '',
    `Date: ${F.actDate}`,
    '',
    `Judging party: ${judgingParty}`,
    '',
    `Verdict: \`${F.criterion}=${verdict}\``,
    '',
    `Run record: \`${F.runId}@${runDigest}\``,
    '',
    '## Rationale',
    '',
    F.rationale,
    '',
  ].join('\n');
}

function fixtureActRecordText(digest: string, state: 'state-1' | 'state-2' = 'state-1'): string {
  const provenance =
    state === 'state-2'
      ? '`Syzygy-verified` — state (2), correlated through the A1 audit record'
      : '`owner-adopted (bootstrap, uncorrelated)` — state (1),\nexplicitly selected by performing the offered state-(1) phrase';
  const a1 = state === 'state-2' ? `\`${F.a1Identity}\`` : '**explicitly absent**';
  return [
    '# Owner act — Polaris cold-open walkthrough judgment',
    '',
    `Date: ${F.actDate}`,
    '',
    `Owner: ${F.owner}`,
    '',
    `Act identity: \`${F.actIdentity}\``,
    '',
    `Act type: \`${F.actType}\``,
    '',
    `Project identity: \`${F.project}\``,
    '',
    `Artifact identity: \`${F.judgmentPath}\``,
    '',
    `Exact digest (SHA-256): \`${digest}\``,
    '',
    `Provenance state: ${provenance}`,
    '',
    'Supersession / revocation: none — this act supersedes no earlier act',
    '',
    `A1 audit-record identity (RFC3-16(b) item 9): ${a1}`,
    '',
    '## Ceremony',
    '',
    'The owner performed this one act by writing exactly:',
    '',
    '```text',
    `${F.phrasePrefix}: ${digest}`,
    '```',
    '',
    'Frozen provenance:',
    '',
    '- reviewed subject: `48e0f5db645d1fb08e5e3a65c5e50dbcece40412`;',
    `- recording tag: \`${F.recordingTag}\`, on the commit carrying this act record.`,
    '',
    '## Effect',
    '',
    `The judgment below is the owner's recorded judgment on the cold-open`,
    `walkthrough \`${F.runId}\` against the criterion`,
    `\`${F.criterion}\` (PWB-REQ-021). It authorizes nothing else.`,
    '',
    '## What this act does not authorize',
    '',
    'Nothing beyond its own authority.',
    '',
  ].join('\n');
}

function fixtureJudgmentExpectations(a1: 'absent' | 'identity' = 'absent'): WalkthroughJudgmentExpectations {
  return {
    observingProject: F.project,
    owner: F.owner,
    evaluationInstant: F.evaluationInstant,
    governingActInstant: F.governingActDate,
    criterion: F.criterion,
    runRecordIdentity: F.runId,
    surfaceVersion: F.surface,
    evaluationIdentity: F.evaluation,
    mode: F.mode,
    surfaceRoutes: F.routes,
    judgment: {
      artifactPath: F.judgmentPath,
      actIdentity: F.actIdentity,
      actType: F.actType,
      phrasePrefix: F.phrasePrefix,
      recordingTag: F.recordingTag,
      scopeAnchors: [F.runId, F.criterion],
      a1: a1 === 'identity' ? { kind: 'identity', identity: F.a1Identity } : { kind: 'absent' },
    },
    otherActBoundArtifacts: [
      '.syzygy/governance/decisions/BUTLERS-PROJECT-SHAPE-OBSERVATION-CONSENT.md',
      '.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json',
    ],
  };
}

export type JudgmentFixtureState = 'lawful-state-1' | 'lawful-state-2' | 'unlawful' | 'absent-run-record' | 'absent-judgment';

/** One evaluator input per presentation state. `unlawful` names a wrong
 * judging party (case `judging-party-wrong`); `lawful-state-2` pairs a
 * state-(2) act record with a correlator that succeeds. */
export function walkthroughJudgmentFixture(state: JudgmentFixtureState, evaluationId = 'judgment-eval-0001', runRecord: RunRecordOptions = {}): WalkthroughJudgmentInputs {
  const runText = fixtureRunRecordText(runRecord);
  const runDigest = sha256(runText);
  const judgmentText = fixtureJudgmentText(runDigest, 'met', state === 'unlawful' ? 'Somebody Else' : F.owner);
  const judgmentDigest = sha256(judgmentText);
  const actState = state === 'lawful-state-2' ? 'state-2' : 'state-1';
  const correlate: JudgmentCorrelator = state === 'lawful-state-2' ? () => 'succeeded' : JUDGMENT_CORRELATION_UNAVAILABLE;
  return {
    evaluationId,
    runRecord: {
      path: F.runPath,
      artifact: state === 'absent-run-record' ? { kind: 'missing' } : { kind: 'present', bytes: bytes(runText) },
    },
    judgment: {
      path: F.judgmentPath,
      artifact: state === 'absent-judgment' ? { kind: 'missing' } : { kind: 'present', bytes: bytes(judgmentText) },
      actRecord: { kind: 'owner-act-record', text: fixtureActRecordText(judgmentDigest, actState) },
      lifecycle: {},
      recordingTag: { kind: 'resolved', commit: '45fce03ac7929649def093f4563d6e5e98cbff5c' },
    },
    expectations: fixtureJudgmentExpectations(state === 'lawful-state-2' ? 'identity' : 'absent'),
    correlate,
  };
}
