// Body-read authority evaluator — PWB-REQ-005, pure.
//
// The POC may not read any Butlers project-shape body until each of the
// three exact authorities — the per-repository observation-consent
// record, the observing project's secret-classification policy and the
// observer's adapter-registry entry — carries an effective human owner
// act under RFC3-16(a), bound under RFC3-16(b) to the artifact's exact
// digest, identity, act type, project and scope, in provenance state (1)
// `owner-adopted (bootstrap, uncorrelated)` or state (2)
// `Syzygy-verified` (RFC3-16(c)).
//
// This module decides that, and nothing else. It reads no file, shells
// no process and consults no clock: the artifact bytes, the act-record
// text, the lifecycle facts, the recording-tag resolution, the controlled
// expectations and the A1 correlator all arrive as inputs. The one thing
// it computes for itself is the artifact's SHA-256 from the bytes handed
// to it, so that "exact digest" (RFC3-16(b) item 3) is compared against
// what was actually read and an edited artifact is a wrong-but-present
// digest rather than a trusted one.
//
// PWB-REQ-005's invalid-case population is closed at exactly 195 cases:
// 55 common owner-act cases decided per authority (× 3 = 165) plus 30
// authority-specific cases. Every case is one predicate site below,
// marked `// mutation-point: <case>` on the line before it so that the
// mutation runner (`apps/three-surface-poc/src/pwb-mutation-runner.ts`)
// can disable exactly that predicate and prove the independent test
// notices. The FIRST failing predicate names the case; predicates are
// ordered so that every case is reachable by a fixture that is wrong in
// only that one way. There is no "other invalid" bucket.
//
// An absent artifact or an absent act record is not an invalid ACT — it
// is the absence of one — and is reported as `absent`, which is equally
// non-admitting. State (2) is decided only through the injected
// correlator; a failed, unavailable or indeterminate correlation is
// invalid and never falls back to state (1).

import { deepFreeze, sha256 } from '@syzygy/support';
import {
  ACT_IDENTITY,
  ISO_DATE,
  NON_HUMAN_PRINCIPAL,
  PHRASE,
  PROJECT_IDENTITY,
  SHA256,
  SLUG,
  TAG,
  isGovernancePath,
  isHumanName,
  isIsoDate,
  provenanceFromLabel,
  type ProvenanceLabel,
} from './act-fields.js';
import {
  parseConsentArtifact,
  parsePolicyArtifact,
  parseRegistryArtifact,
  type ArtifactField,
} from './authority-artifact-fields.js';
import { parseOwnerActRecord, type ParsedOwnerActRecord } from './owner-act-record.js';

export const AUTHORITY_KINDS = ['consent', 'policy', 'registry'] as const;
export type AuthorityKind = (typeof AUTHORITY_KINDS)[number];

// RFC3-16(c)'s two provenance states, defined with the shared owner-act
// field rules and re-exported here, where their callers import them.
export { STATE_1_LABEL, STATE_2_LABEL, type ProvenanceLabel } from './act-fields.js';

// ---------------------------------------------------------------------
// Closed invalid-case vocabulary (195).
// ---------------------------------------------------------------------

export const COMMON_INVALID_CASES = [
  // RFC3-16(b) binding fields — 28.
  'project-identity-missing',
  'project-identity-malformed',
  'project-identity-wrong',
  'artifact-identity-missing',
  'artifact-identity-malformed',
  'artifact-identity-wrong',
  'exact-digest-missing',
  'exact-digest-malformed',
  'exact-digest-wrong',
  'act-type-missing',
  'act-type-malformed',
  'act-type-wrong',
  'act-instant-missing',
  'act-instant-malformed',
  'act-instant-wrong',
  'owner-missing',
  'owner-malformed',
  'owner-non-human',
  'owner-another-human',
  'scope-missing',
  'scope-malformed',
  'scope-wrong',
  'supersession-target-missing',
  'supersession-target-malformed',
  'supersession-target-wrong',
  'a1-identity-missing',
  'a1-identity-malformed',
  'a1-identity-wrong',
  // Evaluation association — 4.
  'act-identity-missing',
  'act-identity-malformed',
  'act-identity-wrong',
  'paired-to-different-authority',
  // Provenance-state input — 3.
  'provenance-state-missing',
  'provenance-state-malformed',
  'provenance-state-outside-vocabulary',
  // False substitutes — 5.
  'tree-attribution-only',
  'git-ref-only',
  'specification-signoff-only',
  'machine-submission',
  'agent-assertion',
  // Lifecycle — 4.
  'stale',
  'expired',
  'superseded',
  'revoked',
  // Provenance-state mechanics — 5.
  'state-1-not-explicitly-selected',
  'state-1-a1-present',
  'state-2-correlation-failed',
  'state-2-correlation-unavailable',
  'state-2-correlation-indeterminate',
  // State-(1) record semantics — 6.
  'phrase-missing',
  'phrase-malformed',
  'phrase-mismatched',
  'recording-tag-missing',
  'recording-tag-malformed',
  'recording-tag-mismatched',
] as const;
export type CommonInvalidCase = (typeof COMMON_INVALID_CASES)[number];

const CONSENT_SPECIFIC_CASES = [
  'observing-project-missing',
  'observing-project-malformed',
  'observing-project-wrong',
  'configured-repository-missing',
  'configured-repository-malformed',
  'configured-repository-wrong',
  'content-class-missing',
  'content-class-malformed',
  'content-class-wrong',
] as const;
const POLICY_SPECIFIC_CASES = [
  'policy-owning-project-missing',
  'policy-owning-project-malformed',
  'policy-owning-project-wrong',
  'policy-version-missing',
  'policy-version-malformed',
  'policy-version-wrong',
] as const;
const REGISTRY_SPECIFIC_CASES = [
  'governance-home-missing',
  'governance-home-malformed',
  'governance-home-wrong',
  'project-missing',
  'project-malformed',
  'project-wrong',
  'repository-missing',
  'repository-malformed',
  'repository-wrong',
  'read-only-authority-missing',
  'read-only-authority-malformed',
  'read-only-authority-wrong',
  'write-surface-missing',
  'write-surface-malformed',
  'write-surface-wrong',
] as const;

type InvalidCaseId =
  | `${AuthorityKind}:${CommonInvalidCase}`
  | `consent:${(typeof CONSENT_SPECIFIC_CASES)[number]}`
  | `policy:${(typeof POLICY_SPECIFIC_CASES)[number]}`
  | `registry:${(typeof REGISTRY_SPECIFIC_CASES)[number]}`;

export const INVALID_CASE_IDS: readonly InvalidCaseId[] = [
  ...AUTHORITY_KINDS.flatMap((kind) =>
    COMMON_INVALID_CASES.map((name): InvalidCaseId => `${kind}:${name}`),
  ),
  ...CONSENT_SPECIFIC_CASES.map((name): InvalidCaseId => `consent:${name}`),
  ...POLICY_SPECIFIC_CASES.map((name): InvalidCaseId => `policy:${name}`),
  ...REGISTRY_SPECIFIC_CASES.map((name): InvalidCaseId => `registry:${name}`),
];

// ---------------------------------------------------------------------
// Inputs.
// ---------------------------------------------------------------------

export type ArtifactInput =
  | { readonly kind: 'present'; readonly bytes: Uint8Array }
  | { readonly kind: 'missing' }
  | { readonly kind: 'unreadable' };

// What stands in the place of an owner act. Only `owner-act-record` can
// ever be valid; the five substitutes are PWB-REQ-005's closed list of
// things that SHALL NOT substitute for an act, and `absent` is nothing.
export type ActRecordInput =
  | { readonly kind: 'owner-act-record'; readonly text: string }
  | { readonly kind: 'tree-attribution-only'; readonly stamp: string }
  | { readonly kind: 'git-ref-only'; readonly ref: string }
  | { readonly kind: 'specification-signoff-only'; readonly signoffRecord: string }
  | { readonly kind: 'machine-submission'; readonly submitter: string }
  | { readonly kind: 'agent-assertion'; readonly agent: string }
  | { readonly kind: 'absent' };

export interface LifecycleInput {
  readonly supersededBy?: string | undefined;
  readonly revokedBy?: string | undefined;
}

export type RecordingTagResolution =
  | { readonly kind: 'resolved'; readonly commit: string }
  | { readonly kind: 'unresolved' };

export interface AuthorityInput {
  readonly artifact: ArtifactInput;
  readonly actRecord: ActRecordInput;
  readonly lifecycle: LifecycleInput;
  readonly recordingTag: RecordingTagResolution;
}

interface AuthorityExpectation {
  readonly artifactPath: string;
  readonly actIdentity: string;
  readonly actType: string;
  readonly phrasePrefix: string;
  readonly recordingTag: string;
  readonly scopeAnchors: readonly string[];
  // The A1 audit-record identity this act is expected to correlate with,
  // or its explicit absence (RFC3-16(b) item 9). Absent for every state-(1)
  // act; production supplies absent for all three.
  readonly a1: A1Expectation;
  // What RFC3-16(b) item 8 must say. Absent means "none": the act
  // supersedes nothing. An amending act (the 2026-09-05 policy and
  // registry acts) must name exactly the record it supersedes, for its own
  // role only; anything else is `supersession-target-wrong`.
  readonly supersession?: SupersessionExpectation;
}

type SupersessionExpectation =
  | { readonly kind: 'none' }
  | { readonly kind: 'supersedes'; readonly target: string };

export type A1Expectation =
  | { readonly kind: 'absent' }
  | { readonly kind: 'identity'; readonly identity: string };

// The controlled evaluation input (PWB-REQ-005: "semantically different
// from the controlled evaluation input" is what "wrong but present"
// means). Supplied by the caller, never read from the artifacts.
export interface BodyReadAuthorityExpectations {
  readonly observingProject: string;
  readonly configuredRepository: string;
  readonly contentClass: string;
  readonly owner: string;
  readonly governanceHome: string;
  readonly policyVersion: string;
  // ISO date-time of this evaluation; act instants after its date are
  // future and therefore wrong.
  readonly evaluationInstant: string;
  // YYYY-MM-DD of the act that made these authorities lawful (the PWB
  // state-(1) amendment); an act recorded before it is stale.
  readonly governingActInstant: string;
  readonly authorities: Readonly<Record<AuthorityKind, AuthorityExpectation>>;
}

export type CorrelationOutcome = 'succeeded' | 'failed' | 'unavailable' | 'indeterminate';
interface CorrelationRequest {
  readonly authority: AuthorityKind;
  readonly actIdentity: string;
  readonly a1Identity: string;
  readonly artifactDigest: string;
}
export type A1Correlator = (request: CorrelationRequest) => CorrelationOutcome;

// The production correlator. [Observed] No RFC5-25 independent audit
// trail exists in this repository, so state (2) cannot be reached here.
export const A1_CORRELATION_UNAVAILABLE: A1Correlator = () => 'unavailable';

export interface BodyReadAuthorityInputs {
  readonly evaluationId: string;
  readonly consent: AuthorityInput;
  readonly policy: AuthorityInput;
  readonly registry: AuthorityInput;
  readonly expectations: BodyReadAuthorityExpectations;
  readonly correlate: A1Correlator;
}

// ---------------------------------------------------------------------
// Outputs.
// ---------------------------------------------------------------------

export type AuthorityState =
  | {
      readonly kind: 'valid';
      readonly provenance: ProvenanceLabel;
      readonly actIdentity: string;
      readonly artifactDigest: string;
      readonly actInstant: string;
    }
  | {
      readonly kind: 'invalid';
      readonly caseId: InvalidCaseId;
      readonly detail: string;
      readonly artifactDigest: string;
      readonly claimedProvenance: ProvenanceLabel | undefined;
    }
  | {
      readonly kind: 'absent';
      readonly what: 'artifact-missing' | 'artifact-unreadable' | 'act-record-absent';
      readonly artifactDigest: string | undefined;
    };

type AuthorizationMode = 'independently-verified' | 'owner-trusted-bootstrap' | 'rejected';

export interface Rfc316aContradiction {
  readonly clause: 'RFC3-16(a)';
  readonly definedTerm: 'authorization-bearing governance artifact';
  readonly statement: string;
  readonly failing: readonly { readonly authority: AuthorityKind; readonly state: string }[];
}

export interface BodyReadAuthorityEvaluation {
  readonly evaluationId: string;
  readonly evaluationInstant: string;
  readonly admits: boolean;
  readonly authorizationMode: AuthorizationMode;
  readonly consent: AuthorityState;
  readonly policy: AuthorityState;
  readonly registry: AuthorityState;
  readonly contradiction: Rfc316aContradiction | undefined;
}

// ---------------------------------------------------------------------
// Shape predicates.
// ---------------------------------------------------------------------

// The owner-act field rules both owner-act evaluators share live in
// `act-fields.ts`; these two are this gate's own.
const REPOSITORY_IDENTITY = /^repository:[a-z0-9][a-z0-9-]*$/;
const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

function isString(value: unknown): value is string {
  return typeof value === 'string';
}
function isEmptyArray(value: unknown): boolean {
  return Array.isArray(value) && value.length === 0;
}

// ---------------------------------------------------------------------
// Per-authority evaluation.
// ---------------------------------------------------------------------

type Verdict = AuthorityState;

function evaluateAuthority(
  kind: AuthorityKind,
  input: AuthorityInput,
  expectations: BodyReadAuthorityExpectations,
  correlate: A1Correlator,
): Verdict {
  if (input.artifact.kind === 'missing') {
    return { kind: 'absent', what: 'artifact-missing', artifactDigest: undefined };
  }
  if (input.artifact.kind === 'unreadable') {
    return { kind: 'absent', what: 'artifact-unreadable', artifactDigest: undefined };
  }
  const bytes = input.artifact.bytes;
  const digest = sha256(bytes);
  const expected = expectations.authorities[kind];
  const otherArtifactPaths = AUTHORITY_KINDS.filter((other) => other !== kind).map(
    (other) => expectations.authorities[other].artifactPath,
  );
  const evaluationDate = expectations.evaluationInstant.slice(0, 10);

  let claimed: ProvenanceLabel | undefined;
  const invalid = (name: string, detail: string): Verdict => ({
    kind: 'invalid',
    caseId: `${kind}:${name}` as InvalidCaseId,
    detail,
    artifactDigest: digest,
    claimedProvenance: claimed,
  });

  const rec = input.actRecord;
  if (rec.kind === 'absent') {
    return { kind: 'absent', what: 'act-record-absent', artifactDigest: digest };
  }
  // --- False substitutes (5). Nothing but an owner-act record proceeds.
  // mutation-point: tree-attribution-only
  if (rec.kind === 'tree-attribution-only') return invalid('tree-attribution-only', `only the tree's self-declared stamp attests: ${rec.stamp}`);
  // mutation-point: git-ref-only
  if (rec.kind === 'git-ref-only') return invalid('git-ref-only', `only a Git commit/tag attests: ${rec.ref}`);
  // mutation-point: specification-signoff-only
  if (rec.kind === 'specification-signoff-only') return invalid('specification-signoff-only', `only a specification sign-off attests: ${rec.signoffRecord}`);
  // mutation-point: machine-submission
  if (rec.kind === 'machine-submission') return invalid('machine-submission', `a machine submission is not an owner act: ${rec.submitter}`);
  // mutation-point: agent-assertion
  if (rec.kind === 'agent-assertion') return invalid('agent-assertion', `an agent assertion is not an owner act: ${rec.agent}`);

  const record: ParsedOwnerActRecord = parseOwnerActRecord(rec.text);

  // --- RFC3-16(b) binding fields (28).
  const projectIdentity = record.projectIdentity;
  // mutation-point: project-identity-missing
  if (projectIdentity.kind === 'missing') return invalid('project-identity-missing', 'RFC3-16(b) item 1 absent');
  // mutation-point: project-identity-malformed
  if (projectIdentity.kind === 'malformed' || !PROJECT_IDENTITY.test(projectIdentity.value)) return invalid('project-identity-malformed', 'RFC3-16(b) item 1 is not a project identity');
  // mutation-point: project-identity-wrong
  if (projectIdentity.value !== expectations.observingProject) return invalid('project-identity-wrong', `act names ${projectIdentity.value}, evaluation is for ${expectations.observingProject}`);

  const artifactIdentity = record.artifactIdentity;
  // mutation-point: artifact-identity-missing
  if (artifactIdentity.kind === 'missing') return invalid('artifact-identity-missing', 'RFC3-16(b) item 2 absent');
  // mutation-point: artifact-identity-malformed
  if (artifactIdentity.kind === 'malformed' || !isGovernancePath(artifactIdentity.value)) return invalid('artifact-identity-malformed', 'RFC3-16(b) item 2 is not a governance-plane path');
  // mutation-point: artifact-identity-wrong
  if (artifactIdentity.value !== expected.artifactPath && !otherArtifactPaths.includes(artifactIdentity.value)) return invalid('artifact-identity-wrong', `act names ${artifactIdentity.value}, expected ${expected.artifactPath}`);

  const exactDigest = record.exactDigest;
  // mutation-point: exact-digest-missing
  if (exactDigest.kind === 'missing') return invalid('exact-digest-missing', 'RFC3-16(b) item 3 absent');
  // mutation-point: exact-digest-malformed
  if (exactDigest.kind === 'malformed' || !SHA256.test(exactDigest.value)) return invalid('exact-digest-malformed', 'RFC3-16(b) item 3 is not a SHA-256 digest');
  // mutation-point: exact-digest-wrong
  if (exactDigest.value !== digest) return invalid('exact-digest-wrong', `act binds ${exactDigest.value}; the artifact as read is ${digest}`);

  const actType = record.actType;
  // mutation-point: act-type-missing
  if (actType.kind === 'missing') return invalid('act-type-missing', 'RFC3-16(b) item 4 absent');
  // mutation-point: act-type-malformed
  if (actType.kind === 'malformed' || !SLUG.test(actType.value)) return invalid('act-type-malformed', 'RFC3-16(b) item 4 is not an act-type slug');
  // mutation-point: act-type-wrong
  if (actType.value !== expected.actType) return invalid('act-type-wrong', `act type ${actType.value}, expected ${expected.actType}`);

  const actInstant = record.actInstant;
  // mutation-point: act-instant-missing
  if (actInstant.kind === 'missing') return invalid('act-instant-missing', 'RFC3-16(b) item 6 absent');
  // mutation-point: act-instant-malformed
  if (actInstant.kind === 'malformed' || !isIsoDate(actInstant.value)) return invalid('act-instant-malformed', 'RFC3-16(b) item 6 is not a date');
  // mutation-point: act-instant-wrong
  if (actInstant.value > evaluationDate) return invalid('act-instant-wrong', `act instant ${actInstant.value} is after the evaluation instant ${evaluationDate}`);

  const owner = record.owner;
  // mutation-point: owner-missing
  if (owner.kind === 'missing') return invalid('owner-missing', 'RFC3-16(b) item 5 absent');
  // mutation-point: owner-malformed
  if (owner.kind === 'malformed' || !isHumanName(owner.value)) return invalid('owner-malformed', 'RFC3-16(b) item 5 is not an attribution');
  // mutation-point: owner-non-human
  if (NON_HUMAN_PRINCIPAL.test(owner.value)) return invalid('owner-non-human', `attributed to a non-human principal: ${owner.value}`);
  // mutation-point: owner-another-human
  if (owner.value !== expectations.owner) return invalid('owner-another-human', `attributed to ${owner.value}, not the project owner`);

  const scope = record.scope;
  // mutation-point: scope-missing
  if (scope.kind === 'missing') return invalid('scope-missing', 'RFC3-16(b) item 7 absent');
  // mutation-point: scope-malformed
  if (scope.kind === 'malformed') return invalid('scope-malformed', 'RFC3-16(b) item 7 is empty');
  // mutation-point: scope-wrong
  if (!expected.scopeAnchors.every((anchor) => scope.value.replace(/\s+/g, ' ').includes(anchor))) return invalid('scope-wrong', 'RFC3-16(b) item 7 does not state the expected scope');

  const supersession = record.supersession;
  // mutation-point: supersession-target-missing
  if (supersession.kind === 'missing') return invalid('supersession-target-missing', 'RFC3-16(b) item 8 absent');
  // mutation-point: supersession-target-malformed
  if (supersession.kind === 'malformed') return invalid('supersession-target-malformed', 'RFC3-16(b) item 8 is neither none nor a named target');
  const expectedSupersession = expected.supersession ?? { kind: 'none' };
  // mutation-point: supersession-target-wrong
  if (expectedSupersession.kind === 'none') {
    if (supersession.value.relation !== 'none') return invalid('supersession-target-wrong', `act ${supersession.value.relation} ${supersession.value.target}; no supersession is expected`);
  } else if (supersession.value.relation !== 'supersedes') {
    return invalid('supersession-target-wrong', `act ${supersession.value.relation === 'none' ? 'supersedes nothing' : `revokes ${supersession.value.target}`}; expected to supersede ${expectedSupersession.target}`);
  } else if (supersession.value.target !== expectedSupersession.target) {
    return invalid('supersession-target-wrong', `act supersedes ${supersession.value.target}; expected ${expectedSupersession.target}`);
  } else if (supersession.value.role !== undefined && supersession.value.role !== expected.actType) {
    return invalid('supersession-target-wrong', `act supersedes for the ${supersession.value.role} role; its own type is ${expected.actType}`);
  }

  const a1 = record.a1;
  // mutation-point: a1-identity-missing
  if (a1.kind === 'missing') return invalid('a1-identity-missing', 'RFC3-16(b) item 9 absent');
  // mutation-point: a1-identity-malformed
  if (a1.kind === 'malformed') return invalid('a1-identity-malformed', 'RFC3-16(b) item 9 is neither an identity nor explicit absence');
  // mutation-point: a1-identity-wrong
  if (expected.a1.kind === 'identity' && (a1.value.absent || a1.value.identity !== expected.a1.identity)) return invalid('a1-identity-wrong', 'RFC3-16(b) item 9 does not name the expected audit record');

  // --- Evaluation association (4).
  const actIdentity = record.actIdentity;
  // mutation-point: act-identity-missing
  if (actIdentity.kind === 'missing') return invalid('act-identity-missing', 'act-record identity absent');
  // mutation-point: act-identity-malformed
  if (actIdentity.kind === 'malformed' || !ACT_IDENTITY.test(actIdentity.value)) return invalid('act-identity-malformed', 'act-record identity is not an identifier');
  // mutation-point: act-identity-wrong
  if (actIdentity.value !== expected.actIdentity) return invalid('act-identity-wrong', `act ${actIdentity.value}, expected ${expected.actIdentity}`);
  // mutation-point: paired-to-different-authority
  if (artifactIdentity.value !== expected.artifactPath) return invalid('paired-to-different-authority', `act is bound to ${artifactIdentity.value}, another authority's artifact`);

  // --- Provenance-state input (3).
  const provenanceState = record.provenanceState;
  // mutation-point: provenance-state-missing
  if (provenanceState.kind === 'missing') return invalid('provenance-state-missing', 'provenance state absent');
  // mutation-point: provenance-state-malformed
  if (provenanceState.kind === 'malformed') return invalid('provenance-state-malformed', 'provenance state is not a labelled state');
  claimed = provenanceFromLabel(provenanceState.value.label);
  // mutation-point: provenance-state-outside-vocabulary
  if (claimed === undefined) return invalid('provenance-state-outside-vocabulary', `\`${provenanceState.value.label}\` is outside RFC3-16(c)'s two states`);

  // --- Lifecycle (4).
  // mutation-point: stale
  if (actInstant.value < expectations.governingActInstant) return invalid('stale', `act instant ${actInstant.value} predates the governing act ${expectations.governingActInstant}`);
  // mutation-point: expired
  if (record.expires.kind !== 'missing' && (record.expires.kind === 'malformed' || !isIsoDate(record.expires.value) || record.expires.value <= evaluationDate)) return invalid('expired', 'act declares an expiry that has passed or cannot be read');
  // mutation-point: superseded
  if (input.lifecycle.supersededBy !== undefined) return invalid('superseded', `superseded by ${input.lifecycle.supersededBy}`);
  // mutation-point: revoked
  if (input.lifecycle.revokedBy !== undefined) return invalid('revoked', `revoked by ${input.lifecycle.revokedBy}`);

  // --- Provenance-state mechanics (5).
  // mutation-point: state-1-not-explicitly-selected
  if (claimed === 'state-1' && !provenanceState.value.explicitSelection) return invalid('state-1-not-explicitly-selected', 'state (1) must be explicitly selected by the human act');
  // mutation-point: state-1-a1-present
  if (claimed === 'state-1' && !a1.value.absent) return invalid('state-1-a1-present', 'state (1) must record the A1 audit-record identity as absent');
  const correlation: CorrelationOutcome | undefined =
    claimed === 'state-2'
      ? a1.value.absent
        ? 'unavailable'
        : correlate({ authority: kind, actIdentity: actIdentity.value, a1Identity: a1.value.identity, artifactDigest: digest })
      : undefined;
  // mutation-point: state-2-correlation-failed
  if (correlation === 'failed') return invalid('state-2-correlation-failed', 'claimed state (2) but A1 correlation failed; no fallback to state (1)');
  // mutation-point: state-2-correlation-unavailable
  if (correlation === 'unavailable') return invalid('state-2-correlation-unavailable', 'claimed state (2) but A1 correlation is unavailable; no fallback to state (1)');
  // mutation-point: state-2-correlation-indeterminate
  if (correlation === 'indeterminate') return invalid('state-2-correlation-indeterminate', 'claimed state (2) but A1 correlation is indeterminate; no fallback to state (1)');

  // --- State-(1) record semantics (6). These validate trusted record
  // semantics; they never claim to prove attendance.
  const phrase = record.ceremonyPhrase;
  // mutation-point: phrase-missing
  if (phrase.kind === 'missing') return invalid('phrase-missing', 'the exact owner phrase is absent');
  // mutation-point: phrase-malformed
  if (phrase.kind === 'malformed' || !PHRASE.test(phrase.value)) return invalid('phrase-malformed', 'the owner phrase is not of the form PHRASE: <sha256>');
  const phraseParts = PHRASE.exec(phrase.value);
  // mutation-point: phrase-mismatched
  if (phraseParts?.[1] !== expected.phrasePrefix || phraseParts[2] !== exactDigest.value) return invalid('phrase-mismatched', 'the owner phrase does not match this act and digest');

  const tag = record.recordingTag;
  // mutation-point: recording-tag-missing
  if (tag.kind === 'missing') return invalid('recording-tag-missing', 'the recording tag is absent');
  // mutation-point: recording-tag-malformed
  if (tag.kind === 'malformed' || !TAG.test(tag.value)) return invalid('recording-tag-malformed', 'the recording tag is not a tag name');
  // mutation-point: recording-tag-mismatched
  if (tag.value !== expected.recordingTag || input.recordingTag.kind !== 'resolved') return invalid('recording-tag-mismatched', `recording tag ${tag.value} does not resolve to the expected recording ${expected.recordingTag}`);

  // --- Authority-specific fields (9 / 6 / 15).
  const specific = evaluateSpecificFields(kind, bytes, expectations);
  if (specific !== undefined) return invalid(specific.name, specific.detail);

  const provenance: ProvenanceLabel = claimed;
  return {
    kind: 'valid',
    provenance,
    actIdentity: actIdentity.value,
    artifactDigest: digest,
    actInstant: actInstant.value,
  };
}

interface SpecificFailure {
  readonly name: string;
  readonly detail: string;
}

const MISSING: ArtifactField = { kind: 'missing' };

function evaluateSpecificFields(
  kind: AuthorityKind,
  bytes: Uint8Array,
  expectations: BodyReadAuthorityExpectations,
): SpecificFailure | undefined {
  if (kind === 'consent') {
    const parsed = parseConsentArtifact(bytes);
    const fields = parsed.kind === 'parsed' ? parsed.fields : { observingProject: MISSING, configuredRepository: MISSING, contentClass: MISSING };
    const project = fields.observingProject;
    // mutation-point: observing-project-missing
    if (project.kind === 'missing') return { name: 'observing-project-missing', detail: 'consent subject names no observing project' };
    // mutation-point: observing-project-malformed
    if (!isString(project.value) || !PROJECT_IDENTITY.test(project.value)) return { name: 'observing-project-malformed', detail: 'consent observing project is not a project identity' };
    // mutation-point: observing-project-wrong
    if (project.value !== expectations.observingProject) return { name: 'observing-project-wrong', detail: `consent is for ${project.value}, not ${expectations.observingProject}` };
    const repository = fields.configuredRepository;
    // mutation-point: configured-repository-missing
    if (repository.kind === 'missing') return { name: 'configured-repository-missing', detail: 'consent subject names no repository' };
    // mutation-point: configured-repository-malformed
    if (!isString(repository.value) || !REPOSITORY_IDENTITY.test(repository.value)) return { name: 'configured-repository-malformed', detail: 'consent repository is not a repository identity' };
    // mutation-point: configured-repository-wrong
    if (repository.value !== expectations.configuredRepository) return { name: 'configured-repository-wrong', detail: `consent is for ${repository.value}, not ${expectations.configuredRepository}` };
    const contentClass = fields.contentClass;
    // mutation-point: content-class-missing
    if (contentClass.kind === 'missing') return { name: 'content-class-missing', detail: 'consent names no observation content class' };
    // mutation-point: content-class-malformed
    if (!isString(contentClass.value) || !SLUG.test(contentClass.value)) return { name: 'content-class-malformed', detail: 'consent content class is not a class slug' };
    // mutation-point: content-class-wrong
    if (contentClass.value !== expectations.contentClass) return { name: 'content-class-wrong', detail: `consent covers ${contentClass.value}, not ${expectations.contentClass}` };
    return undefined;
  }
  if (kind === 'policy') {
    const parsed = parsePolicyArtifact(bytes);
    const fields = parsed.kind === 'parsed' ? parsed.fields : { policyOwningProject: MISSING, policyVersion: MISSING };
    const project = fields.policyOwningProject;
    // mutation-point: policy-owning-project-missing
    if (project.kind === 'missing') return { name: 'policy-owning-project-missing', detail: 'policy names no owning project' };
    // mutation-point: policy-owning-project-malformed
    if (!isString(project.value) || !PROJECT_IDENTITY.test(project.value)) return { name: 'policy-owning-project-malformed', detail: 'policy owning project is not a project identity' };
    // mutation-point: policy-owning-project-wrong
    if (project.value !== expectations.observingProject) return { name: 'policy-owning-project-wrong', detail: `policy is owned by ${project.value}, not the observing project` };
    const version = fields.policyVersion;
    // mutation-point: policy-version-missing
    if (version.kind === 'missing') return { name: 'policy-version-missing', detail: 'policy declares no version' };
    // mutation-point: policy-version-malformed
    if (!isString(version.value) || !SEMVER.test(version.value)) return { name: 'policy-version-malformed', detail: 'policy version is not a version string' };
    // mutation-point: policy-version-wrong
    if (version.value !== expectations.policyVersion) return { name: 'policy-version-wrong', detail: `policy version ${version.value}, expected ${expectations.policyVersion}` };
    return undefined;
  }
  const parsed = parseRegistryArtifact(bytes);
  const fields =
    parsed.kind === 'parsed'
      ? parsed.fields
      : { governanceHome: MISSING, project: MISSING, repository: MISSING, readOnlyAuthority: MISSING, writeSurface: MISSING };
  const home = fields.governanceHome;
  // mutation-point: governance-home-missing
  if (home.kind === 'missing') return { name: 'governance-home-missing', detail: 'registry declares no governance home' };
  // mutation-point: governance-home-malformed
  if (!isString(home.value) || !isGovernancePath(home.value)) return { name: 'governance-home-malformed', detail: 'registry governance home is not a governance-plane path' };
  // mutation-point: governance-home-wrong
  if (home.value !== expectations.governanceHome) return { name: 'governance-home-wrong', detail: `registry lives at ${home.value}, expected ${expectations.governanceHome}` };
  const project = fields.project;
  // mutation-point: project-missing
  if (project.kind === 'missing') return { name: 'project-missing', detail: 'registry names no project' };
  // mutation-point: project-malformed
  if (!isString(project.value) || !PROJECT_IDENTITY.test(project.value)) return { name: 'project-malformed', detail: 'registry project is not a project identity' };
  // mutation-point: project-wrong
  if (project.value !== expectations.observingProject) return { name: 'project-wrong', detail: `registry is for ${project.value}, not the observing project` };
  const repository = fields.repository;
  // mutation-point: repository-missing
  if (repository.kind === 'missing') return { name: 'repository-missing', detail: 'registry entry names no observed repository' };
  // mutation-point: repository-malformed
  if (!isString(repository.value) || !REPOSITORY_IDENTITY.test(repository.value)) return { name: 'repository-malformed', detail: 'registry observed repository is not a repository identity' };
  // mutation-point: repository-wrong
  if (repository.value !== expectations.configuredRepository) return { name: 'repository-wrong', detail: `registry entry observes ${repository.value}, not ${expectations.configuredRepository}` };
  const authority = fields.readOnlyAuthority;
  // mutation-point: read-only-authority-missing
  if (authority.kind === 'missing') return { name: 'read-only-authority-missing', detail: 'registry entry declares no typed authority' };
  const typed = authority.value as Record<string, unknown> | null;
  // mutation-point: read-only-authority-malformed
  if (typeof typed !== 'object' || typed === null || Array.isArray(typed) || !isString(typed['authorityType']) || !isString(typed['readAuthority']) || typed['readAuthority'] === '') return { name: 'read-only-authority-malformed', detail: 'registry typed authority is not an authority declaration' };
  // mutation-point: read-only-authority-wrong
  if (typed['authorityType'] !== 'version-control' || typed['executeObservedCode'] !== false || typed['workingTreeRead'] !== false || !isEmptyArray(typed['databaseAccess']) || !isEmptyArray(typed['networkAccess'])) return { name: 'read-only-authority-wrong', detail: 'registry typed authority is not read-only version-control authority' };
  const writeSurface = fields.writeSurface;
  // mutation-point: write-surface-missing
  if (writeSurface.kind === 'missing') return { name: 'write-surface-missing', detail: 'registry entry declares no write surface' };
  // mutation-point: write-surface-malformed
  if (!Array.isArray(writeSurface.value)) return { name: 'write-surface-malformed', detail: 'registry write surface is not a list' };
  // mutation-point: write-surface-wrong
  if (writeSurface.value.length !== 0) return { name: 'write-surface-wrong', detail: 'registry declares a non-empty write surface' };
  return undefined;
}

// ---------------------------------------------------------------------
// The triple.
// ---------------------------------------------------------------------

function describeState(state: AuthorityState): string {
  if (state.kind === 'valid') return `valid ${state.provenance}`;
  if (state.kind === 'invalid') return `invalid act: ${state.caseId}`;
  return `absent: ${state.what}`;
}

function contradictionFor(
  states: Readonly<Record<AuthorityKind, AuthorityState>>,
): Rfc316aContradiction {
  const failing = AUTHORITY_KINDS.filter((kind) => states[kind].kind !== 'valid').map((kind) => ({
    authority: kind,
    state: describeState(states[kind]),
  }));
  return {
    clause: 'RFC3-16(a)',
    definedTerm: 'authorization-bearing governance artifact',
    statement:
      'The observation-consent record, secret-classification policy and observer registry entry are each an ' +
      '"authorization-bearing governance artifact" under RFC3-16(a) — an artifact whose presence "authorizes a dangerous act, ' +
      'unblocks or widens a claim class" — and is honored only through an effective owner act. ' +
      `No effective act is in force for: ${failing.map((entry) => `${entry.authority} (${entry.state})`).join('; ')}. No body read is admitted.`,
    failing,
  };
}

export function evaluateBodyReadAuthority(inputs: BodyReadAuthorityInputs): BodyReadAuthorityEvaluation {
  const states = {
    consent: evaluateAuthority('consent', inputs.consent, inputs.expectations, inputs.correlate),
    policy: evaluateAuthority('policy', inputs.policy, inputs.expectations, inputs.correlate),
    registry: evaluateAuthority('registry', inputs.registry, inputs.expectations, inputs.correlate),
  } as const;
  const valid = AUTHORITY_KINDS.map((kind) => states[kind]).filter(
    (state): state is Extract<AuthorityState, { kind: 'valid' }> => state.kind === 'valid',
  );
  const admits = valid.length === AUTHORITY_KINDS.length;
  const authorizationMode: AuthorizationMode = !admits
    ? 'rejected'
    : valid.every((state) => state.provenance === 'state-2')
      ? 'independently-verified'
      : 'owner-trusted-bootstrap';
  return deepFreeze({
    evaluationId: inputs.evaluationId,
    evaluationInstant: inputs.expectations.evaluationInstant,
    admits,
    authorizationMode,
    consent: states.consent,
    policy: states.policy,
    registry: states.registry,
    contradiction: admits ? undefined : contradictionFor(states),
  });
}

// Evaluation history is append-only: a later evaluation (for example one
// whose A1 correlation succeeded) is a new entry and never rewrites the
// state under which an earlier read occurred (PWB-REQ-005).
export function appendEvaluation(
  history: readonly BodyReadAuthorityEvaluation[],
  evaluation: BodyReadAuthorityEvaluation,
): readonly BodyReadAuthorityEvaluation[] {
  for (const earlier of history) {
    if (earlier.evaluationId === evaluation.evaluationId) {
      throw new Error(`evaluation ${evaluation.evaluationId} is already recorded; history is append-only`);
    }
  }
  return Object.freeze([...history, deepFreeze(evaluation)]);
}
