// PWB-REQ-005 conformance: eight valid triples, the closed 195-case
// invalid population, later correlation, disclosure and the read spy.
//
// Oracle independence: every expected case id below is a string literal
// typed by hand from PWB-REQ-005's table; the fixtures are literal
// Markdown/JSON text; digests are computed here with node:crypto; the
// read spy is a local counter. Nothing in the expected table is derived
// from the evaluator's exported vocabulary — a separate denominator test
// compares the two sets in both directions.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  FIXED_MAY_NOT_IDS,
  FIXED_MAY_NOT_STATEMENTS,
  STATE_1_DISCLOSURE,
  discloseAuthority,
} from './authority-disclosure.js';
import {
  A1_CORRELATION_UNAVAILABLE,
  INVALID_CASE_IDS,
  appendEvaluation,
  evaluateBodyReadAuthority,
  type A1Correlator,
  type ActRecordInput,
  type AuthorityInput,
  type AuthorityKind,
  type BodyReadAuthorityEvaluation,
  type BodyReadAuthorityExpectations,
  type BodyReadAuthorityInputs,
} from './body-read-authority.js';
import { PWB_ADMISSION_FAILURE_MAPPING, observeProjectShape } from './project-shape-observer.js';
import { frozenCensus } from './test-frozen.js';

// ---------------------------------------------------------------------
// Literal fixtures.
// ---------------------------------------------------------------------

const OWNER = 'Tzeusy';
const PROJECT = 'project:syzygy';
const REPOSITORY = 'repository:butlers-configured-poc';
const CONTENT_CLASS = 'declared-project-shape-text';
const GOVERNANCE_HOME = '.syzygy/governance/declarations/adapter-registry';
const POLICY_VERSION = '1.0.0-candidate.4';
const EVALUATION_INSTANT = '2026-09-03T10:00:00Z';
const GOVERNING_ACT_DATE = '2026-09-02';
const ACT_DATE = '2026-09-02';
const A1_IDENTITY = 'a1:audit-record-0001';

const AUTHORITIES = {
  consent: {
    artifactPath: '.syzygy/governance/decisions/BUTLERS-PROJECT-SHAPE-OBSERVATION-CONSENT.md',
    actIdentity: 'PWB-BUTLERS-OBSERVATION-CONSENT-2026-09-02',
    actType: 'consent-observation',
    phrasePrefix: 'CONSENT TO BUTLERS PROJECT-SHAPE OBSERVATION',
    recordingTag: 'pwb-consent-observation-signed-2026-09-02',
    title: 'Butlers project-shape observation consent',
    effect: `The consent record below is the owner's effective observation consent for
the pair (\`${PROJECT}\`, \`${REPOSITORY}\`) and the one
content class \`${CONTENT_CLASS}\`. Scope: read-only Git objects
selected by the signed PWB source population.`,
    scopeAnchors: [PROJECT, REPOSITORY, CONTENT_CLASS, 'read-only'],
  },
  policy: {
    artifactPath: '.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json',
    actIdentity: 'PWB-SECRET-CLASSIFICATION-POLICY-APPROVAL-2026-09-02',
    actType: 'approve-policy',
    phrasePrefix: 'APPROVE POLARIS BUTLERS SECRET-CLASSIFICATION POLICY',
    recordingTag: 'pwb-approve-policy-signed-2026-09-02',
    title: 'Polaris Butlers secret-classification policy approval',
    effect: `The policy below (\`polaris-butlers-project-shape-secrets\`, policy-owning
project \`${PROJECT}\`) is approved as the observing project's
secret-classification policy for that pair and content class.`,
    scopeAnchors: ['polaris-butlers-project-shape-secrets', PROJECT],
  },
  registry: {
    artifactPath: '.syzygy/governance/declarations/adapter-registry/POLARIS-BUTLERS-PROJECT-SHAPE-OBSERVER-CANDIDATE.json',
    actIdentity: 'PWB-OBSERVER-REGISTRY-ENTRY-ADOPTION-2026-09-02',
    actType: 'adopt-registry-entry',
    phrasePrefix: 'ADOPT POLARIS BUTLERS PROJECT-SHAPE OBSERVER REGISTRY ENTRY',
    recordingTag: 'pwb-adopt-registry-entry-signed-2026-09-02',
    title: 'Polaris Butlers project-shape observer registry-entry adoption',
    effect: `The adapter-registry entry below (\`polaris-butlers-project-shape\`) is
adopted in Syzygy's governance home
\`${GOVERNANCE_HOME}\` for \`${PROJECT}\` and
the configured Butlers repository, with read-only authority and an empty
write surface.`,
    scopeAnchors: ['polaris-butlers-project-shape', GOVERNANCE_HOME, 'read-only', 'empty write surface'],
  },
} as const;

function consentArtifact(overrides: { subject?: string | null; contentClass?: string | null } = {}): string {
  const subject = overrides.subject === undefined ? `\`(${PROJECT}, ${REPOSITORY})\`` : overrides.subject;
  const contentClass = overrides.contentClass === undefined ? `\`${CONTENT_CLASS}\`` : overrides.contentClass;
  return [
    '# Butlers project-shape observation consent',
    '',
    'Date: 2026-08-31',
    '',
    `Owner: ${OWNER}`,
    '',
    'Record ID: `PWB-CONSENT-2026-08-31`',
    '',
    'Consent class: observation',
    '',
    ...(contentClass === null ? [] : [`Observation content class: ${contentClass}`, '']),
    ...(subject === null ? [] : [`Subject: ${subject}`, '']),
    'Status: **candidate, act-ready; no effect until the owner acts on this exact digest**',
    '',
    '## Scope',
    '',
    'Read-only project-shape observation.',
    '',
  ].join('\n');
}

const DELETE = Symbol('delete');
type JsonOverrides = Readonly<Record<string, unknown | typeof DELETE>>;

function policyArtifact(overrides: JsonOverrides = {}): string {
  const document: Record<string, unknown> = {
    schemaVersion: 1,
    policyId: 'polaris-butlers-project-shape-secrets',
    policyVersion: POLICY_VERSION,
    status: 'candidate-act-ready-no-effect-until-owner-act',
    policyOwningProject: PROJECT,
    scope: { observingProject: PROJECT, observedRepository: REPOSITORY, contentClass: CONTENT_CLASS },
  };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === DELETE) delete document[key];
    else document[key] = value;
  }
  return `${JSON.stringify(document, null, 2)}\n`;
}

function registryArtifact(overrides: {
  root?: JsonOverrides;
  entry?: JsonOverrides;
  subject?: JsonOverrides | unknown;
  typedAuthority?: JsonOverrides | unknown;
  entries?: unknown;
} = {}): string {
  const typedAuthority: Record<string, unknown> = {
    authorityType: 'version-control',
    questions: ['What currently exists?'],
    readAuthority: 'within the one resolved Git object database, exact Git objects only',
    writeSurface: [],
    databaseAccess: [],
    networkAccess: [],
    executeObservedCode: false,
    workingTreeRead: false,
  };
  const subject: Record<string, unknown> = { observingProject: PROJECT, observedRepository: REPOSITORY };
  const entry: Record<string, unknown> = {
    observerId: 'polaris-butlers-project-shape',
    subject,
    typedAuthority,
  };
  const root: Record<string, unknown> = {
    schemaVersion: 1,
    registryVersion: '1.0.0-candidate.3',
    governanceHome: GOVERNANCE_HOME,
    project: PROJECT,
    entries: [entry],
  };
  const apply = (target: Record<string, unknown>, patch: JsonOverrides | undefined): void => {
    for (const [key, value] of Object.entries(patch ?? {})) {
      if (value === DELETE) delete target[key];
      else target[key] = value;
    }
  };
  if (overrides.subject !== undefined) {
    if (isPlainObject(overrides.subject)) apply(subject, overrides.subject as JsonOverrides);
    else entry['subject'] = overrides.subject;
  }
  if (overrides.typedAuthority !== undefined) {
    if (isPlainObject(overrides.typedAuthority)) apply(typedAuthority, overrides.typedAuthority as JsonOverrides);
    else entry['typedAuthority'] = overrides.typedAuthority;
  }
  apply(entry, overrides.entry);
  apply(root, overrides.root);
  if (overrides.entries !== undefined) root['entries'] = overrides.entries;
  return `${JSON.stringify(root, null, 2)}\n`;
}

function isPlainObject(value: unknown): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
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

function actRecord(kind: AuthorityKind, digest: string, overrides: RecordOverrides = {}): string {
  const meta = AUTHORITIES[kind];
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
    ['Act identity:', `\`${meta.actIdentity}\``],
    ['Act type:', `\`${meta.actType}\``],
    ['Project identity:', `\`${PROJECT}\``],
    ['Artifact identity:', `\`${meta.artifactPath}\``],
    ['Exact digest (SHA-256):', `\`${digest}\``],
    ['Provenance state:', provenance],
    ['Supersession / revocation:', 'none — this act supersedes no earlier act'],
    ['A1 audit-record identity (RFC3-16(b) item 9):', a1],
  ];
  const lines: string[] = [`# Owner act — ${meta.title}`, ''];
  for (const [label, value] of head) {
    if (overrides.omit?.includes(label)) continue;
    const text = overrides.set?.[label] ?? value;
    lines.push(`${label} ${text}`.trimEnd(), '');
  }
  for (const extra of overrides.extraHead ?? []) lines.push(extra, '');
  const phrase = overrides.phrase === undefined ? `${meta.phrasePrefix}: ${digest}` : overrides.phrase;
  const tag = overrides.recordingTag === undefined ? meta.recordingTag : overrides.recordingTag;
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
      lines.push(meta.effect, '');
    }
  }
  lines.push('## What this act does not authorize', '', 'Nothing beyond its own authority.', '');
  return lines.join('\n');
}

function expectations(a1: Partial<Record<AuthorityKind, 'absent' | 'identity'>> = {}): BodyReadAuthorityExpectations {
  const perAuthority = (kind: AuthorityKind) => ({
    artifactPath: AUTHORITIES[kind].artifactPath,
    actIdentity: AUTHORITIES[kind].actIdentity,
    actType: AUTHORITIES[kind].actType,
    phrasePrefix: AUTHORITIES[kind].phrasePrefix,
    recordingTag: AUTHORITIES[kind].recordingTag,
    scopeAnchors: AUTHORITIES[kind].scopeAnchors,
    a1: (a1[kind] ?? 'absent') === 'identity' ? { kind: 'identity' as const, identity: A1_IDENTITY } : { kind: 'absent' as const },
  });
  return {
    observingProject: PROJECT,
    configuredRepository: REPOSITORY,
    contentClass: CONTENT_CLASS,
    owner: OWNER,
    governanceHome: GOVERNANCE_HOME,
    policyVersion: POLICY_VERSION,
    evaluationInstant: EVALUATION_INSTANT,
    governingActInstant: GOVERNING_ACT_DATE,
    authorities: { consent: perAuthority('consent'), policy: perAuthority('policy'), registry: perAuthority('registry') },
  };
}

interface AuthorityFixture {
  readonly artifactText?: string;
  readonly artifact?: AuthorityInput['artifact'];
  readonly record?: RecordOverrides;
  readonly actRecord?: ActRecordInput;
  readonly lifecycle?: AuthorityInput['lifecycle'];
  readonly recordingTag?: AuthorityInput['recordingTag'];
}

function defaultArtifactText(kind: AuthorityKind): string {
  if (kind === 'consent') return consentArtifact();
  if (kind === 'policy') return policyArtifact();
  return registryArtifact();
}

function authorityInput(kind: AuthorityKind, fixture: AuthorityFixture = {}): AuthorityInput {
  const text = fixture.artifactText ?? defaultArtifactText(kind);
  const digest = sha256(text);
  return {
    artifact: fixture.artifact ?? { kind: 'present', bytes: new TextEncoder().encode(text) },
    actRecord: fixture.actRecord ?? { kind: 'owner-act-record', text: actRecord(kind, digest, fixture.record) },
    lifecycle: fixture.lifecycle ?? {},
    recordingTag: fixture.recordingTag ?? { kind: 'resolved', commit: '45fce03ac7929649def093f4563d6e5e98cbff5c' },
  };
}

interface TripleFixture {
  readonly consent?: AuthorityFixture;
  readonly policy?: AuthorityFixture;
  readonly registry?: AuthorityFixture;
  readonly expectations?: BodyReadAuthorityExpectations;
  readonly correlate?: A1Correlator;
  readonly evaluationId?: string;
}

function inputs(fixture: TripleFixture = {}): BodyReadAuthorityInputs {
  return {
    evaluationId: fixture.evaluationId ?? 'eval-0001',
    consent: authorityInput('consent', fixture.consent),
    policy: authorityInput('policy', fixture.policy),
    registry: authorityInput('registry', fixture.registry),
    expectations: fixture.expectations ?? expectations(),
    correlate: fixture.correlate ?? A1_CORRELATION_UNAVAILABLE,
  };
}

function spy(): { readonly read: () => 'read'; calls: () => number } {
  let count = 0;
  return {
    read: () => {
      count += 1;
      return 'read';
    },
    calls: () => count,
  };
}

// ---------------------------------------------------------------------
// Expected table — the 55 common cases as fixture mutations applied to
// one authority at a time, plus the 30 authority-specific cases.
// ---------------------------------------------------------------------

const OTHER_PATH: Record<AuthorityKind, string> = {
  consent: AUTHORITIES.policy.artifactPath,
  policy: AUTHORITIES.registry.artifactPath,
  registry: AUTHORITIES.consent.artifactPath,
};

const COMMON_CASES: readonly [string, (kind: AuthorityKind) => TripleFixture][] = [
  ['project-identity-missing', (k) => ({ [k]: { record: { omit: ['Project identity:'] } } })],
  ['project-identity-malformed', (k) => ({ [k]: { record: { set: { 'Project identity:': '`Syzygy Project`' } } } })],
  ['project-identity-wrong', (k) => ({ [k]: { record: { set: { 'Project identity:': '`project:other`' } } } })],
  ['artifact-identity-missing', (k) => ({ [k]: { record: { omit: ['Artifact identity:'] } } })],
  ['artifact-identity-malformed', (k) => ({ [k]: { record: { set: { 'Artifact identity:': '`../../etc/passwd`' } } } })],
  ['artifact-identity-wrong', (k) => ({ [k]: { record: { set: { 'Artifact identity:': '`.syzygy/governance/decisions/SOMETHING-ELSE.md`' } } } })],
  ['exact-digest-missing', (k) => ({ [k]: { record: { omit: ['Exact digest (SHA-256):'] } } })],
  ['exact-digest-malformed', (k) => ({ [k]: { record: { set: { 'Exact digest (SHA-256):': '`sha256:not-a-digest`' } } } })],
  ['exact-digest-wrong', (k) => ({ [k]: { record: { set: { 'Exact digest (SHA-256):': `\`${'0'.repeat(64)}\`` } } } })],
  ['act-type-missing', (k) => ({ [k]: { record: { omit: ['Act type:'] } } })],
  ['act-type-malformed', (k) => ({ [k]: { record: { set: { 'Act type:': '`Consent Observation!`' } } } })],
  ['act-type-wrong', (k) => ({ [k]: { record: { set: { 'Act type:': '`revoke-consent`' } } } })],
  ['act-instant-missing', (k) => ({ [k]: { record: { omit: ['Date:'] } } })],
  ['act-instant-malformed', (k) => ({ [k]: { record: { set: { 'Date:': 'yesterday' } } } })],
  ['act-instant-wrong', (k) => ({ [k]: { record: { set: { 'Date:': '2027-01-01' } } } })],
  ['owner-missing', (k) => ({ [k]: { record: { omit: ['Owner:'] } } })],
  ['owner-malformed', (k) => ({ [k]: { record: { set: { 'Owner:': '`**`' } } } })],
  ['owner-non-human', (k) => ({ [k]: { record: { set: { 'Owner:': 'agent: Claude Code' } } } })],
  ['owner-another-human', (k) => ({ [k]: { record: { set: { 'Owner:': 'Somebody Else' } } } })],
  ['scope-missing', (k) => ({ [k]: { record: { effect: null } } })],
  ['scope-malformed', (k) => ({ [k]: { record: { effect: '' } } })],
  ['scope-wrong', (k) => ({ [k]: { record: { effect: 'This act authorizes writes to a second repository.' } } })],
  ['supersession-target-missing', (k) => ({ [k]: { record: { omit: ['Supersession / revocation:'] } } })],
  ['supersession-target-malformed', (k) => ({ [k]: { record: { set: { 'Supersession / revocation:': 'maybe' } } } })],
  ['supersession-target-wrong', (k) => ({ [k]: { record: { set: { 'Supersession / revocation:': 'supersedes `PWB-EARLIER-ACT-2026-08-01`' } } } })],
  ['a1-identity-missing', (k) => ({ [k]: { record: { omit: ['A1 audit-record identity (RFC3-16(b) item 9):'] } } })],
  ['a1-identity-malformed', (k) => ({ [k]: { record: { a1: 'n/a' } } })],
  ['a1-identity-wrong', (k) => ({ [k]: { record: { state: 'state-2', a1: '`a1:some-other-record`' } }, expectations: expectations({ [k]: 'identity' }), correlate: () => 'succeeded' })],
  ['act-identity-missing', (k) => ({ [k]: { record: { omit: ['Act identity:'] } } })],
  ['act-identity-malformed', (k) => ({ [k]: { record: { set: { 'Act identity:': '`pwb act #1`' } } } })],
  ['act-identity-wrong', (k) => ({ [k]: { record: { set: { 'Act identity:': '`PWB-SOME-OTHER-ACT-2026-09-02`' } } } })],
  ['paired-to-different-authority', (k) => ({ [k]: { record: { set: { 'Artifact identity:': `\`${OTHER_PATH[k]}\`` } } } })],
  ['provenance-state-missing', (k) => ({ [k]: { record: { omit: ['Provenance state:'] } } })],
  ['provenance-state-malformed', (k) => ({ [k]: { record: { set: { 'Provenance state:': 'trusted' } } } })],
  ['provenance-state-outside-vocabulary', (k) => ({ [k]: { record: { set: { 'Provenance state:': '`owner-verified` — state (3), explicitly selected' } } } })],
  ['tree-attribution-only', (k) => ({ [k]: { actRecord: { kind: 'tree-attribution-only', stamp: 'Status: accepted' } } })],
  ['git-ref-only', (k) => ({ [k]: { actRecord: { kind: 'git-ref-only', ref: AUTHORITIES[k].recordingTag } } })],
  ['specification-signoff-only', (k) => ({ [k]: { actRecord: { kind: 'specification-signoff-only', signoffRecord: '.syzygy/governance/decisions/PWB-STATE1-AMENDMENT-ACT.md' } } })],
  ['machine-submission', (k) => ({ [k]: { actRecord: { kind: 'machine-submission', submitter: 'node-ci' } } })],
  ['agent-assertion', (k) => ({ [k]: { actRecord: { kind: 'agent-assertion', agent: 'claude-code' } } })],
  ['stale', (k) => ({ [k]: { record: { set: { 'Date:': '2026-08-31' } } } })],
  ['expired', (k) => ({ [k]: { record: { extraHead: ['Expires: 2026-09-01'] } } })],
  ['superseded', (k) => ({ [k]: { lifecycle: { supersededBy: 'PWB-LATER-ACT-2026-09-10' } } })],
  ['revoked', (k) => ({ [k]: { lifecycle: { revokedBy: 'PWB-REVOCATION-2026-09-10' } } })],
  ['state-1-not-explicitly-selected', (k) => ({ [k]: { record: { state: 'unselected-state-1' } } })],
  ['state-1-a1-present', (k) => ({ [k]: { record: { state: 'state-1', a1: `\`${A1_IDENTITY}\`` } } })],
  ['state-2-correlation-failed', (k) => ({ [k]: { record: { state: 'state-2' } }, expectations: expectations({ [k]: 'identity' }), correlate: () => 'failed' })],
  ['state-2-correlation-unavailable', (k) => ({ [k]: { record: { state: 'state-2' } }, expectations: expectations({ [k]: 'identity' }), correlate: () => 'unavailable' })],
  ['state-2-correlation-indeterminate', (k) => ({ [k]: { record: { state: 'state-2' } }, expectations: expectations({ [k]: 'identity' }), correlate: () => 'indeterminate' })],
  ['phrase-missing', (k) => ({ [k]: { record: { phrase: null } } })],
  ['phrase-malformed', (k) => ({ [k]: { record: { phrase: 'I agree.' } } })],
  ['phrase-mismatched', (k) => ({ [k]: { record: { phrase: `SOME OTHER PHRASE: ${'a'.repeat(64)}` } } })],
  ['recording-tag-missing', (k) => ({ [k]: { record: { recordingTag: null } } })],
  ['recording-tag-malformed', (k) => ({ [k]: { record: { recordingTag: 'Tag With Spaces' } } })],
  ['recording-tag-mismatched', (k) => ({ [k]: { recordingTag: { kind: 'unresolved' } } })],
];

const SPECIFIC_CASES: readonly [string, TripleFixture][] = [
  ['consent:observing-project-missing', { consent: { artifactText: consentArtifact({ subject: null }) } }],
  ['consent:observing-project-malformed', { consent: { artifactText: consentArtifact({ subject: `\`(Syzygy, ${REPOSITORY})\`` }) } }],
  ['consent:observing-project-wrong', { consent: { artifactText: consentArtifact({ subject: `\`(project:other, ${REPOSITORY})\`` }) } }],
  ['consent:configured-repository-missing', { consent: { artifactText: consentArtifact({ subject: `\`(${PROJECT})\`` }) } }],
  ['consent:configured-repository-malformed', { consent: { artifactText: consentArtifact({ subject: `\`(${PROJECT}, /home/tze/GitHub/butlers)\`` }) } }],
  ['consent:configured-repository-wrong', { consent: { artifactText: consentArtifact({ subject: `\`(${PROJECT}, repository:some-other-repo)\`` }) } }],
  ['consent:content-class-missing', { consent: { artifactText: consentArtifact({ contentClass: null }) } }],
  ['consent:content-class-malformed', { consent: { artifactText: consentArtifact({ contentClass: 'every file body' }) } }],
  ['consent:content-class-wrong', { consent: { artifactText: consentArtifact({ contentClass: '`arbitrary-file-bodies`' }) } }],
  ['policy:policy-owning-project-missing', { policy: { artifactText: policyArtifact({ policyOwningProject: DELETE }) } }],
  ['policy:policy-owning-project-malformed', { policy: { artifactText: policyArtifact({ policyOwningProject: 42 }) } }],
  ['policy:policy-owning-project-wrong', { policy: { artifactText: policyArtifact({ policyOwningProject: 'project:butlers' }) } }],
  ['policy:policy-version-missing', { policy: { artifactText: policyArtifact({ policyVersion: DELETE }) } }],
  ['policy:policy-version-malformed', { policy: { artifactText: policyArtifact({ policyVersion: 'latest' }) } }],
  ['policy:policy-version-wrong', { policy: { artifactText: policyArtifact({ policyVersion: '1.0.0-candidate.3' }) } }],
  ['registry:governance-home-missing', { registry: { artifactText: registryArtifact({ root: { governanceHome: DELETE } }) } }],
  ['registry:governance-home-malformed', { registry: { artifactText: registryArtifact({ root: { governanceHome: '/etc/adapters' } }) } }],
  ['registry:governance-home-wrong', { registry: { artifactText: registryArtifact({ root: { governanceHome: '.syzygy/governance/declarations/other-registry' } }) } }],
  ['registry:project-missing', { registry: { artifactText: registryArtifact({ root: { project: DELETE } }) } }],
  ['registry:project-malformed', { registry: { artifactText: registryArtifact({ root: { project: ['project:syzygy'] } }) } }],
  ['registry:project-wrong', { registry: { artifactText: registryArtifact({ root: { project: 'project:butlers' } }) } }],
  ['registry:repository-missing', { registry: { artifactText: registryArtifact({ subject: { observedRepository: DELETE } }) } }],
  ['registry:repository-malformed', { registry: { artifactText: registryArtifact({ subject: { observedRepository: 'butlers' } }) } }],
  ['registry:repository-wrong', { registry: { artifactText: registryArtifact({ subject: { observedRepository: 'repository:some-other-repo' } }) } }],
  ['registry:read-only-authority-missing', { registry: { artifactText: registryArtifact({ entry: { typedAuthority: DELETE } }) } }],
  ['registry:read-only-authority-malformed', { registry: { artifactText: registryArtifact({ typedAuthority: 'read-only' }) } }],
  ['registry:read-only-authority-wrong', { registry: { artifactText: registryArtifact({ typedAuthority: { executeObservedCode: true } }) } }],
  ['registry:write-surface-missing', { registry: { artifactText: registryArtifact({ typedAuthority: { writeSurface: DELETE } }) } }],
  ['registry:write-surface-malformed', { registry: { artifactText: registryArtifact({ typedAuthority: { writeSurface: 'none' } }) } }],
  ['registry:write-surface-wrong', { registry: { artifactText: registryArtifact({ typedAuthority: { writeSurface: ['openspec/changes/**'] } }) } }],
];

const EXPECTED_INVALID: readonly [string, TripleFixture][] = [
  ...(['consent', 'policy', 'registry'] as const).flatMap((kind) =>
    COMMON_CASES.map(([name, build]): [string, TripleFixture] => [`${kind}:${name}`, build(kind)]),
  ),
  ...SPECIFIC_CASES,
];

// ---------------------------------------------------------------------
// Denominators.
// ---------------------------------------------------------------------

describe('PWB-REQ-005 denominators', () => {
  it('the hand-typed invalid table has exactly 195 distinct cases and matches the closed vocabulary both ways', () => {
    const tableIds = EXPECTED_INVALID.map(([id]) => id);
    expect(tableIds.length).toBe(195);
    expect(new Set(tableIds).size).toBe(195);
    expect(INVALID_CASE_IDS.length).toBe(195);
    const vocabulary = new Set<string>(INVALID_CASE_IDS);
    expect(tableIds.filter((id) => !vocabulary.has(id))).toEqual([]);
    expect(INVALID_CASE_IDS.filter((id) => !tableIds.includes(id))).toEqual([]);
  });

  it('the observer admission-failure mapping is byte-equal to the adopted registry entry', () => {
    const adopted = JSON.parse(
      readFileSync(resolve(process.cwd(), AUTHORITIES.registry.artifactPath), 'utf8'),
    ) as { entries: { admissionFailureMapping: Record<string, string> }[] };
    expect(adopted.entries[0]?.admissionFailureMapping).toEqual(PWB_ADMISSION_FAILURE_MAPPING);
  });
});

// ---------------------------------------------------------------------
// Eight valid triples.
// ---------------------------------------------------------------------

const STATES = ['state-1', 'state-2'] as const;
const VALID_TRIPLES = STATES.flatMap((consent) =>
  STATES.flatMap((policy) => STATES.map((registry) => ({ consent, policy, registry }))),
);

describe('PWB-REQ-005 valid triples (8)', () => {
  expect(VALID_TRIPLES.length).toBe(8);
  for (const triple of VALID_TRIPLES) {
    const label = `${triple.consent}/${triple.policy}/${triple.registry}`;
    it(`valid triple ${label} admits, preserves each exact state and permits exactly one read`, () => {
      const a1 = {
        consent: triple.consent === 'state-2' ? 'identity' : 'absent',
        policy: triple.policy === 'state-2' ? 'identity' : 'absent',
        registry: triple.registry === 'state-2' ? 'identity' : 'absent',
      } as const;
      const evaluation = evaluateBodyReadAuthority(
        inputs({
          consent: { record: { state: triple.consent } },
          policy: { record: { state: triple.policy } },
          registry: { record: { state: triple.registry } },
          expectations: expectations(a1),
          correlate: () => 'succeeded',
        }),
      );
      expect(evaluation.admits).toBe(true);
      expect(evaluation.contradiction).toBeUndefined();
      for (const kind of ['consent', 'policy', 'registry'] as const) {
        const state = evaluation[kind];
        expect(state.kind).toBe('valid');
        if (state.kind === 'valid') expect(state.provenance).toBe(triple[kind]);
      }
      const allVerified = triple.consent === 'state-2' && triple.policy === 'state-2' && triple.registry === 'state-2';
      expect(evaluation.authorizationMode).toBe(allVerified ? 'independently-verified' : 'owner-trusted-bootstrap');

      const reads = spy();
      const observed = observeProjectShape({ authority: evaluation, read: reads.read });
      expect(observed.kind).toBe('admitted');
      expect(reads.calls()).toBe(1);

      const disclosure = discloseAuthority(evaluation);
      for (const entry of disclosure.authorities) {
        const expected = triple[entry.authority];
        expect(entry.state).toBe(expected === 'state-2' ? 'Syzygy-verified' : 'owner-adopted (bootstrap, uncorrelated)');
        expect(entry.independentlyVerified).toBe(expected === 'state-2');
        if (expected === 'state-1') {
          expect(entry.disclosure).toBe(
            "Owner-trusted only; same-tree forgeable from Syzygy's perspective. Digest detects drift, not authorship or attendance.",
          );
          expect(entry.disclosure.toLowerCase()).not.toContain('verified');
        }
      }
    });
  }

  it('projects three parsed authority constraints plus the six act-ordered fixed prohibitions', () => {
    const evaluation = evaluateBodyReadAuthority(inputs());
    const disclosure = discloseAuthority(evaluation);
    expect(disclosure.mayNot).toHaveLength(9);
    expect(disclosure.mayNot.slice(0, 3).map((entry) => entry.actIdentity)).toEqual([
      AUTHORITIES.consent.actIdentity,
      AUTHORITIES.policy.actIdentity,
      AUTHORITIES.registry.actIdentity,
    ]);
    expect(disclosure.mayNot.slice(3).map((entry) => entry.id)).toEqual([...FIXED_MAY_NOT_IDS]);
    expect(disclosure.mayNot.slice(3).every((entry) => entry.artifactDigest === undefined)).toBe(true);
  });

  it('registers the six fixed rows against the six bullets of the implementation act', () => {
    const source = readFileSync(
      resolve(process.cwd(), '.syzygy/governance/decisions/PWB-IMPLEMENTATION-AUTHORIZATION-ACT.md'),
      'utf8',
    );
    const section = source.slice(source.indexOf('## What this does not authorize'), source.indexOf('## Escalation triggers'));
    const bullets: string[] = [];
    for (const line of section.split('\n')) {
      if (line.startsWith('- ')) bullets.push(line.slice(2));
      else if (line.startsWith('  ') && bullets.length > 0) bullets[bullets.length - 1] += ` ${line.trim()}`;
    }
    const normalized = bullets.map((bullet) => bullet.replace(/`/g, '').replace(/\s+/g, ' ').trim());
    const idFor = (statement: string): (typeof FIXED_MAY_NOT_IDS)[number] => {
      if (statement.startsWith('No write, egress, execution,')) return 'no-write-to-observed-repository';
      if (statement.startsWith('No second repository,')) return 'no-second-repository-or-wider-content-class';
      if (statement.startsWith('No production release,')) return 'no-production-release-or-remote-access';
      if (statement.startsWith('No edit to any act-bound artifact:')) return 'no-edit-to-act-bound-artifact';
      if (statement.startsWith('No doctrine or contract change;')) return 'no-doctrine-or-contract-change-or-syzygy-authored-code';
      if (statement.startsWith('No independent verification:')) return 'no-independent-verification';
      throw new Error(`unregistered implementation-act prohibition: ${statement}`);
    };
    expect(normalized).toHaveLength(6);
    expect(FIXED_MAY_NOT_IDS.map((id, index) => ({ id, statement: FIXED_MAY_NOT_STATEMENTS[index] }))).toEqual(
      normalized.map((statement) => ({ id: idFor(statement), statement })),
    );
  });
});

// ---------------------------------------------------------------------
// 195 invalid cases: zero reads, Unknown, contradiction, exact case id.
// ---------------------------------------------------------------------

const EXPECTED_REASON: Record<AuthorityKind, string> = {
  consent: 'unconsented-source-or-provider',
  policy: 'source-uncaptured-or-unreachable',
  registry: 'source-uncaptured-or-unreachable',
};

describe('PWB-REQ-005 invalid cases (195)', () => {
  for (const [caseId, fixture] of EXPECTED_INVALID) {
    const authority = caseId.split(':')[0] as AuthorityKind;
    it(`${caseId} → zero reads, Unknown, RFC3-16(a) contradiction, exact state retained`, () => {
      const evaluation = evaluateBodyReadAuthority(inputs(fixture));
      expect(evaluation.admits).toBe(false);
      expect(evaluation.authorizationMode).toBe('rejected');
      const state = evaluation[authority];
      expect(state.kind).toBe('invalid');
      if (state.kind === 'invalid') {
        expect(state.caseId).toBe(caseId);
        expect(state.artifactDigest).toMatch(/^[0-9a-f]{64}$/);
      }
      for (const other of ['consent', 'policy', 'registry'] as const) {
        if (other !== authority) expect(evaluation[other].kind).toBe('valid');
      }
      expect(evaluation.contradiction?.clause).toBe('RFC3-16(a)');
      expect(evaluation.contradiction?.failing.map((entry) => entry.authority)).toEqual([authority]);

      const reads = spy();
      const observed = observeProjectShape({ authority: evaluation, read: reads.read });
      expect(reads.calls()).toBe(0);
      expect(observed.kind).toBe('unknown');
      if (observed.kind === 'unknown') {
        expect(observed.reason).toBe(EXPECTED_REASON[authority]);
        expect(observed.contradiction.clause).toBe('RFC3-16(a)');
      }

      const disclosure = discloseAuthority(evaluation);
      const entry = disclosure.authorities.find((item) => item.authority === authority);
      expect(entry?.state).toBe('invalid act');
      expect(entry?.independentlyVerified).toBe(false);
      expect(entry?.invalidCase).toBe(caseId);
      expect(entry?.artifactDigest).toMatch(/^[0-9a-f]{64}$/);
      const mayNot = disclosure.mayNot.find((row) => row.id === `no-${authority}-authority-breach`);
      expect(mayNot?.statement).toContain('May not');
      expect(mayNot?.actIdentity).toBeUndefined();
      expect(mayNot?.artifactDigest).toBe(entry?.artifactDigest);
      expect(disclosure.contradiction).toContain('RFC3-16(a)');
    });
  }
});

// One non-human-principal rule (syzygy-bpyt.6.2): this gate and the
// PWB-REQ-022 judgment evaluator classify an owner name the same way. Each
// principal names one arm of the two former rules; the "flipped" ones
// were human to this gate before, and refused only as owner-another-human.
const NON_HUMAN_OWNERS: readonly [string, string][] = [
  ['agent: Claude Code', 'role prefix agent'],
  ['machine', 'role prefix machine'],
  ['Anthropic Claude', 'model name claude as a word'],
  ['codex', 'model name codex'],
  ['gpt-5', 'model name gpt'],
  ['GitHub Copilot', 'model name copilot'],
  ['an llm', 'model name llm'],
  ['daemon', 'role prefix daemon (flipped)'],
  ['automation: nightly', 'role prefix automation (flipped)'],
  ['syzygy', 'role prefix syzygy (flipped)'],
  ['ci/release', 'role prefix ci with a slash (flipped)'],
  ['renovate[bot]', 'suffix [bot] (flipped)'],
  ['deploy-bot', 'suffix -bot (flipped)'],
  ['review-agent', 'suffix -agent (flipped)'],
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

describe('PWB-REQ-005 owner-non-human: one rule shared with the judgment evaluator', () => {
  for (const kind of ['consent', 'policy', 'registry'] as const) {
    it.each(NON_HUMAN_OWNERS)(`${kind}: owner %j (%s) → owner-non-human`, (owner) => {
      const state = evaluateBodyReadAuthority(inputs({ [kind]: { record: { set: { 'Owner:': owner } } } }))[kind];
      expect(state.kind).toBe('invalid');
      if (state.kind === 'invalid') expect(state.caseId).toBe(`${kind}:owner-non-human`);
    });
  }

  // Each human name sits one anchor away from an arm: a word boundary, a
  // separator after a role prefix, a line start, a line end.
  it.each(['Somebody Else', 'Claudette', 'Botha', 'Agentha Smith', 'Anna Model', 'Anna Daemon', 'Jean-Botha', 'Annagpt Lee'])('a human name %j stays owner-another-human', (owner) => {
    const state = evaluateBodyReadAuthority(inputs({ consent: { record: { set: { 'Owner:': owner } } } })).consent;
    expect(state.kind).toBe('invalid');
    if (state.kind === 'invalid') expect(state.caseId).toBe('consent:owner-another-human');
  });
});

// ---------------------------------------------------------------------
// Absence, no-fallback, history, freezing.
// ---------------------------------------------------------------------

describe('PWB-REQ-005 absence and mechanics', () => {
  it('a missing consent artifact yields zero reads and the missing-consent reason', () => {
    const evaluation = evaluateBodyReadAuthority(inputs({ consent: { artifact: { kind: 'missing' } } }));
    expect(evaluation.admits).toBe(false);
    expect(evaluation.consent).toEqual({ kind: 'absent', what: 'artifact-missing', artifactDigest: undefined });
    const missingConsent = discloseAuthority(evaluation).mayNot.find((row) => row.id === 'no-consent-authority-breach');
    expect(missingConsent?.actIdentity).toBeUndefined();
    expect(missingConsent?.artifactDigest).toBeUndefined();
    const reads = spy();
    const observed = observeProjectShape({ authority: evaluation, read: reads.read });
    expect(reads.calls()).toBe(0);
    expect(observed.kind === 'unknown' && observed.reason).toBe('unconsented-source-or-provider');
  });

  it('an absent policy act record yields the missing-declaration reason; an absent registry act yields source-uncaptured', () => {
    const policy = evaluateBodyReadAuthority(inputs({ policy: { actRecord: { kind: 'absent' } } }));
    const registry = evaluateBodyReadAuthority(inputs({ registry: { artifact: { kind: 'unreadable' } } }));
    expect(policy.policy.kind).toBe('absent');
    expect(registry.registry.kind).toBe('absent');
    const p = observeProjectShape({ authority: policy, read: () => 'read' });
    const r = observeProjectShape({ authority: registry, read: () => 'read' });
    expect(p.kind === 'unknown' && p.reason).toBe('missing-declaration');
    expect(r.kind === 'unknown' && r.reason).toBe('source-uncaptured-or-unreachable');
  });

  it('two invalid authorities list both in the contradiction and as primary plus secondary reasons', () => {
    const evaluation = evaluateBodyReadAuthority(
      inputs({ consent: { artifact: { kind: 'missing' } }, registry: { lifecycle: { revokedBy: 'X-1' } } }),
    );
    expect(evaluation.contradiction?.failing.map((entry) => entry.authority)).toEqual(['consent', 'registry']);
    const observed = observeProjectShape({ authority: evaluation, read: () => 'read' });
    expect(observed.kind === 'unknown' && observed.reason).toBe('unconsented-source-or-provider');
    expect(observed.kind === 'unknown' && observed.secondaryReasons).toEqual(['source-uncaptured-or-unreachable']);
  });

  it('a failed state-(2) correlation is invalid and does not downgrade to state (1)', () => {
    const evaluation = evaluateBodyReadAuthority(
      inputs({
        registry: { record: { state: 'state-2' } },
        expectations: expectations({ registry: 'identity' }),
        correlate: () => 'failed',
      }),
    );
    expect(evaluation.registry.kind).toBe('invalid');
    expect(evaluation.registry.kind === 'invalid' && evaluation.registry.caseId).toBe('registry:state-2-correlation-failed');
    expect(evaluation.registry.kind === 'invalid' && evaluation.registry.claimedProvenance).toBe('state-2');
    expect(evaluation.admits).toBe(false);
    const disclosure = discloseAuthority(evaluation).authorities.find((entry) => entry.authority === 'registry');
    expect(disclosure?.state).toBe('invalid act');
    expect(disclosure?.state).not.toBe('owner-adopted (bootstrap, uncorrelated)');
  });

  it('the production correlator is unavailable, so a state-(2) claim is invalid here today', () => {
    const evaluation = evaluateBodyReadAuthority(
      inputs({ consent: { record: { state: 'state-2' } }, expectations: expectations({ consent: 'identity' }) }),
    );
    expect(evaluation.consent.kind === 'invalid' && evaluation.consent.caseId).toBe('consent:state-2-correlation-unavailable');
  });

  it('later correlation renders state (2) in a new evaluation and leaves the earlier evaluation recorded as state (1)', () => {
    const first = evaluateBodyReadAuthority(inputs({ evaluationId: 'eval-0001' }));
    let history = appendEvaluation([], first);
    const later = evaluateBodyReadAuthority(
      inputs({
        evaluationId: 'eval-0002',
        consent: { record: { state: 'state-2' } },
        expectations: expectations({ consent: 'identity' }),
        correlate: () => 'succeeded',
      }),
    );
    history = appendEvaluation(history, later);
    expect(history.length).toBe(2);
    expect(history[0]?.consent.kind === 'valid' && history[0].consent.provenance).toBe('state-1');
    expect(history[1]?.consent.kind === 'valid' && history[1].consent.provenance).toBe('state-2');
    expect(Object.isFrozen(history)).toBe(true);
    expect(Object.isFrozen(history[0])).toBe(true);
    expect(Object.isFrozen(history[0]?.consent)).toBe(true);
    expect(() => appendEvaluation(history, first)).toThrow(/append-only/);
    expect(() => {
      (history[0] as { admits: boolean }).admits = false;
    }).toThrow();
  });

  // `appendEvaluation` freezes what it appends, so a frozen history entry says nothing about the evaluator: census the result itself
  // (syzygy-bpyt.6.13, review R-GP-IMPL-SUPPORT-LEAF-1 N2).
  it('hands out an evaluation frozen all the way down, admitting or rejecting, before any history appends it', () => {
    const admitting = evaluateBodyReadAuthority(inputs());
    const rejecting = evaluateBodyReadAuthority(inputs({ consent: { record: { omit: ['Project identity:'] } } }));
    expect([admitting.admits, rejecting.admits]).toEqual([true, false]);
    expect(rejecting.contradiction).toBeDefined();
    for (const evaluation of [admitting, rejecting]) {
      const { visited, unfrozen } = frozenCensus(evaluation);
      expect(unfrozen).toEqual([]);
      // The evaluation and its three authority states at least; a census of nothing would also report no path.
      expect(visited).toBeGreaterThanOrEqual(4);
    }
  });

  it('the state-(1) disclosure constant is exactly the PWB-REQ-005 sentence', () => {
    expect(STATE_1_DISCLOSURE).toBe(
      "Owner-trusted only; same-tree forgeable from Syzygy's perspective. Digest detects drift, not authorship or attendance.",
    );
  });

  it('the evaluation carries the exact evaluation instant and id it was given', () => {
    const evaluation: BodyReadAuthorityEvaluation = evaluateBodyReadAuthority(inputs({ evaluationId: 'eval-xyz' }));
    expect(evaluation.evaluationId).toBe('eval-xyz');
    expect(evaluation.evaluationInstant).toBe(EVALUATION_INSTANT);
  });
});

// ---------------------------------------------------------------------
// Expected supersession (the 2026-09-05 amendment acts): an amending act
// must name exactly the record it supersedes, for its own role only. The
// case id stays `supersession-target-wrong`; the population is unchanged.
// ---------------------------------------------------------------------

describe('PWB-REQ-005 expected supersession target', () => {
  const SUPERSEDED = '.syzygy/governance/decisions/PWB-SECRET-CLASSIFICATION-POLICY-ACT.md';
  const amended = (): BodyReadAuthorityExpectations => {
    const base = expectations();
    return { ...base, authorities: { ...base.authorities, policy: { ...base.authorities.policy, supersession: { kind: 'supersedes', target: SUPERSEDED } } } };
  };
  const line = (text: string) => ({ policy: { record: { set: { 'Supersession / revocation:': text } } }, expectations: amended() });
  const scoped = (role: string, target: string) => `this act supersedes, for the \`${role}\` role\nonly, the 2026-09-02 act recorded at \`${target}\`. That\nrecord remains immutable history.`;

  it('admits an act that supersedes exactly the expected record for its own role, in either written form', () => {
    for (const text of [scoped('approve-policy', SUPERSEDED), `supersedes \`${SUPERSEDED}\``]) {
      const evaluation = evaluateBodyReadAuthority(inputs(line(text)));
      expect(evaluation.policy.kind, text).toBe('valid');
      expect(evaluation.admits, text).toBe(true);
    }
  });

  it.each([
    ['none', 'none — this act supersedes no earlier act'],
    ['another target', scoped('approve-policy', '.syzygy/governance/decisions/PWB-OTHER-ACT.md')],
    ['another role', scoped('adopt-registry-entry', SUPERSEDED)],
    ['revocation instead of supersession', `revokes \`${SUPERSEDED}\``],
  ])('rejects %s as supersession-target-wrong with zero reads', (_label, text) => {
    const evaluation = evaluateBodyReadAuthority(inputs(line(text)));
    expect(evaluation.policy.kind === 'invalid' && evaluation.policy.caseId).toBe('policy:supersession-target-wrong');
    expect(evaluation.admits).toBe(false);
    const reads = spy();
    expect(observeProjectShape({ authority: evaluation, read: reads.read }).kind).toBe('unknown');
    expect(reads.calls()).toBe(0);
  });

  it('an expectation of none still rejects any named supersession', () => {
    const evaluation = evaluateBodyReadAuthority(inputs({ policy: { record: { set: { 'Supersession / revocation:': scoped('approve-policy', SUPERSEDED) } } } }));
    expect(evaluation.policy.kind === 'invalid' && evaluation.policy.caseId).toBe('policy:supersession-target-wrong');
  });
});
