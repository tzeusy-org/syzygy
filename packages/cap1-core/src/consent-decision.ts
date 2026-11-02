import type { ConsentRecord, GrantState } from './consent.js';
import type { RepositoryEntry } from './declaration.js';
import type { ProjectId, RepositoryId } from './identity.js';
import { canonicalDigest, instantMillis, isSha256Digest, type Sha256Digest } from './snapshot.js';

// The pre-observation consent decision (CAP1-REQ-011 v1.0; RFC3-16(a/b/c)).
//
// One closed decision per declared repository, computed from captured
// authority inputs and an explicit as-of BEFORE any dependent repository
// content is read. Only an `admitted` decision lets the daemon read the
// repository; every other outcome is authorization Unknown with the primary
// reason `unconsented-source-or-provider`, a specific diagnostic and the
// owner-adjudication route.
//
// The act encoding (`cap1-owner-act/v1`), the ordered checks and the
// precedence rules are implementation conventions frozen and reviewed in
// docs/design/CAP1-CONSENT-RECORD-ENCODING-AND-AUTHORITY-INTERFACE.md (§2–§5)
// as narrowed by docs/design/CAP1-CONSENT-INTERFACE-REVIEW-DISPOSITION.md.
// They are not conformance authority: the adopted spec text is.
//
// Pure: no I/O, no clock. The as-of is an argument.

export const OWNER_ACT_SCHEMA = 'cap1-owner-act/v1' as const;

export const OWNER_ACT_KEYS = [
  'schema',
  'act',
  'project',
  'artifact',
  'artifact_digest',
  'act_type',
  'owner',
  'instant',
  'scope',
  'supersedes',
  'expires',
  'actor',
  'provenance',
  'a1_audit_record',
] as const;

// The closed RFC3-7 scope token set; repository observation needs `observe`.
export const CONSENT_SCOPE_TOKENS = ['observe', 'write', 'execute'] as const;
export const OBSERVATION_SCOPE_TOKEN = 'observe' as const;

export const PROVENANCE_LABELS = {
  'owner-adopted-bootstrap': 'owner-adopted (bootstrap, uncorrelated)',
  'syzygy-verified': 'Syzygy-verified',
} as const;
export type ConsentProvenanceLabel = (typeof PROVENANCE_LABELS)[keyof typeof PROVENANCE_LABELS];
export type ProvenanceClaim = keyof typeof PROVENANCE_LABELS;

export const CONSENT_DECISION_REASON = 'unconsented-source-or-provider' as const;
export const CONSENT_DECISION_ROUTE = 'owner-adjudication' as const;

export type ConsentReferenceFailureKind =
  | 'reference-unresolvable'
  | 'record-unreadable'
  | 'record-malformed'
  | 'record-identity-mismatch';

// The closed diagnostic vocabulary, in check order (§3), then the
// pair-level precedence diagnostics (§5).
export const CONSENT_DIAGNOSTICS = [
  'reference-unresolvable',
  'record-unreadable',
  'record-malformed',
  'record-identity-mismatch',
  'record-subject-mismatch',
  'owner-act-missing',
  'owner-act-unreadable',
  'owner-act-malformed',
  'owner-attribution-missing',
  'act-instant-missing',
  'audit-identity-omitted',
  'act-identity-duplicate',
  'actor-non-human',
  'artifact-identity-mismatch',
  'artifact-digest-mismatch',
  'project-mismatch',
  'act-type-mismatch',
  'scope-mismatch',
  'scope-excludes-observation',
  'provenance-state-inconsistent',
  'act-instant-future',
  'act-expired',
  'act-stale',
  'act-revoked',
  'act-superseded',
  'correlation-unavailable',
  'correlation-not-found',
  'correlation-mismatch',
  'correlation-indeterminate',
  'withdrawn',
  'withdrawal-unresolved',
  'consent-evidence-unresolved',
] as const;
export type ConsentDiagnostic = (typeof CONSENT_DIAGNOSTICS)[number];

export interface AuditRecordIdentity {
  readonly id: string;
  readonly digest: Sha256Digest;
}

// The validated act: every RFC3-16(b) item plus the repository and the
// act-record digest.
export interface ConsentActBinding {
  readonly projectId: ProjectId;
  readonly repositoryId: RepositoryId;
  readonly artifactId: string;
  readonly artifactDigest: Sha256Digest;
  readonly actType: 'consent' | 'revoke';
  readonly owner: string;
  readonly instant: string;
  readonly scope: string;
  readonly supersedes: string | null;
  readonly expires: string | null;
  readonly a1AuditRecord: AuditRecordIdentity | null;
  readonly actId: string;
  readonly actor: 'human';
  readonly provenance: ProvenanceClaim;
  readonly actRecordDigest: Sha256Digest;
}

export type ConsentCorrelation =
  | {
      readonly state: 'correlated';
      readonly auditRecordId: string;
      readonly auditRecordDigest: Sha256Digest;
      readonly bindingDigest: Sha256Digest;
    }
  | { readonly state: 'not-found' | 'mismatch' | 'indeterminate' | 'unavailable' };

export interface ConsentCorrelationProvider {
  readonly id: string;
  correlate(input: {
    readonly binding: ConsentActBinding;
    readonly bindingDigest: Sha256Digest;
  }): Promise<ConsentCorrelation>;
}

export interface ConsentCurrencyBound {
  readonly maxAgeSeconds: number;
  readonly declaredBy: string;
}

export interface ConsentAuthorityInput {
  readonly reference: string;
  readonly artifact:
    | { readonly state: 'loaded'; readonly digest: Sha256Digest; readonly record: ConsentRecord }
    | {
        readonly state: 'failed';
        readonly failure: ConsentReferenceFailureKind;
        readonly digest: Sha256Digest | null;
        readonly pair: { readonly projectId: ProjectId; readonly repositoryId: RepositoryId } | null;
      };
  readonly act:
    | { readonly state: 'loaded'; readonly digest: Sha256Digest; readonly document: unknown }
    | { readonly state: 'unparseable'; readonly digest: Sha256Digest }
    | { readonly state: 'missing' | 'unreadable' | 'not-read' };
  readonly correlation: ConsentCorrelation | 'not-attempted';
}

export interface AdmittedAct {
  readonly binding: ConsentActBinding;
  readonly correlation: Extract<ConsentCorrelation, { state: 'correlated' }> | null;
}

export interface UntrustedConsentRecordView {
  readonly trust: 'untrusted content';
  readonly recordId: string;
  readonly artifactDigest: Sha256Digest;
  readonly projectId: ProjectId;
  readonly repositoryId: RepositoryId;
  readonly scope: string;
  readonly attribution: string;
  readonly grantState: GrantState;
}

// The verified record a closed decision stands on, as coverage cites it: the
// admitted grant, or the valid withdrawal that defeated the pair. Every field
// comes from a record that passed every check (CAP1-REQ-011), so coverage
// carries it without reloading or re-verifying anything (syzygy-u2a.6).
export interface VerifiedConsentRecord {
  readonly reference: string;
  readonly recordId: string;
  readonly artifactDigest: Sha256Digest;
  readonly scope: string;
  readonly attribution: string;
  readonly grantState: GrantState;
  readonly provenance: ConsentProvenanceLabel;
}

export type PreObservationConsentDecision =
  | {
      readonly authorization: 'admitted';
      readonly repositoryId: RepositoryId;
      readonly reference: string;
      readonly artifactDigest: Sha256Digest;
      readonly record: ConsentRecord;
      readonly act: AdmittedAct;
      readonly provenance: ConsentProvenanceLabel;
    }
  | {
      readonly authorization: 'Unknown';
      readonly repositoryId: RepositoryId;
      readonly reference: string;
      readonly reason: typeof CONSENT_DECISION_REASON;
      readonly diagnostic: ConsentDiagnostic;
      readonly diagnosticReference: string;
      readonly route: typeof CONSENT_DECISION_ROUTE;
      readonly untrustedRecord: UntrustedConsentRecordView | null;
      // The withdrawal that defeated the pair: non-null exactly when the
      // diagnostic is `withdrawn` (rules 2 and 3), null otherwise.
      readonly withdrawal: VerifiedConsentRecord | null;
    };

// --- Act parsing (checks 5–9) ---------------------------------------------

function isMapping(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

interface ParsedAct {
  readonly actId: string;
  readonly project: string;
  readonly artifact: string;
  readonly artifactDigest: Sha256Digest;
  readonly actType: 'consent' | 'revoke';
  readonly owner: string;
  readonly instant: string;
  readonly scope: string;
  readonly supersedes: string | null;
  readonly expires: string | null;
  readonly actor: 'human' | 'machine';
  readonly provenance: ProvenanceClaim;
  readonly a1AuditRecord: AuditRecordIdentity | null;
}

function parseAuditRecord(value: unknown): AuditRecordIdentity | null | 'invalid' {
  if (value === null) return null;
  if (!isMapping(value)) return 'invalid';
  const keys = Object.keys(value);
  if (keys.length !== 2 || !keys.includes('id') || !keys.includes('digest')) return 'invalid';
  if (!isNonEmptyString(value['id']) || !isSha256Digest(value['digest'])) return 'invalid';
  return { id: value['id'], digest: value['digest'] };
}

// Checks 6–9 over a document that already parsed to a mapping (check 5).
function parseActDocument(
  doc: Record<string, unknown>,
): { readonly ok: true; readonly act: ParsedAct } | { readonly ok: false; readonly diagnostic: ConsentDiagnostic } {
  if (!isNonBlankString(doc['owner'])) return { ok: false, diagnostic: 'owner-attribution-missing' };
  if (!isNonBlankString(doc['instant'])) return { ok: false, diagnostic: 'act-instant-missing' };
  if (!('a1_audit_record' in doc)) return { ok: false, diagnostic: 'audit-identity-omitted' };

  const malformed = { ok: false, diagnostic: 'owner-act-malformed' } as const;
  const keys = Object.keys(doc);
  if (keys.length !== OWNER_ACT_KEYS.length) return malformed;
  for (const key of OWNER_ACT_KEYS) {
    if (!(key in doc)) return malformed;
  }
  if (doc['schema'] !== OWNER_ACT_SCHEMA) return malformed;
  const actId = doc['act'];
  const project = doc['project'];
  const artifact = doc['artifact'];
  const artifactDigest = doc['artifact_digest'];
  const actType = doc['act_type'];
  const scope = doc['scope'];
  const supersedes = doc['supersedes'];
  const expires = doc['expires'];
  const actor = doc['actor'];
  const provenance = doc['provenance'];
  const a1 = parseAuditRecord(doc['a1_audit_record']);
  if (
    !isNonEmptyString(actId) ||
    !isNonEmptyString(project) ||
    !isNonEmptyString(artifact) ||
    !isSha256Digest(artifactDigest) ||
    (actType !== 'consent' && actType !== 'revoke') ||
    instantMillis(doc['instant']) === undefined ||
    // Check 9 asks only for a non-empty string; the token grammar is check 17.
    !isNonEmptyString(scope) ||
    (supersedes !== null && !isNonEmptyString(supersedes)) ||
    (expires !== null && instantMillis(expires) === undefined) ||
    (actor !== 'human' && actor !== 'machine') ||
    (provenance !== 'owner-adopted-bootstrap' && provenance !== 'syzygy-verified') ||
    a1 === 'invalid'
  ) {
    return malformed;
  }
  return {
    ok: true,
    act: {
      actId,
      project,
      artifact,
      artifactDigest,
      actType,
      owner: doc['owner'] as string,
      instant: doc['instant'] as string,
      scope,
      supersedes: supersedes as string | null,
      expires: expires as string | null,
      actor,
      provenance,
      a1AuditRecord: a1,
    },
  };
}

function scopeAdmitsObservation(scope: string): boolean {
  const tokens = scope.split(' ');
  if (tokens.some((token) => !(CONSENT_SCOPE_TOKENS as readonly string[]).includes(token))) {
    return false;
  }
  if (new Set(tokens).size !== tokens.length) return false;
  return tokens.includes(OBSERVATION_SCOPE_TOKEN);
}

// --- The relational population (checks 10, 22, 23) ------------------------

interface ActRelation {
  readonly reference: string;
  readonly actId: string;
  readonly actType: string;
  readonly supersedes: string | null;
}

// Every captured act that parsed to a mapping and whose `act`, `act_type`
// and `supersedes` are strings (or null), valid or not.
function actRelations(inputs: readonly ConsentAuthorityInput[]): readonly ActRelation[] {
  const relations: ActRelation[] = [];
  for (const input of inputs) {
    if (input.act.state !== 'loaded' || !isMapping(input.act.document)) continue;
    const doc = input.act.document;
    const supersedes = doc['supersedes'];
    if (
      typeof doc['act'] === 'string' &&
      typeof doc['act_type'] === 'string' &&
      (supersedes === null || typeof supersedes === 'string')
    ) {
      relations.push({
        reference: input.reference,
        actId: doc['act'],
        actType: doc['act_type'],
        supersedes,
      });
    }
  }
  return relations;
}

// The digest a provider correlates: the canonical binding WITHOUT the A1
// identity and the act-record digest (both would otherwise have to sit
// inside the bytes they hash). Item 9 is correlated separately.
export function correlationBindingDigest(binding: ConsentActBinding): Sha256Digest {
  const { a1AuditRecord: _a1, actRecordDigest: _actRecord, ...correlated } = binding;
  return canonicalDigest(correlated);
}

// --- One act's evaluation (checks 3–24) -----------------------------------

export interface ActEvaluationContext {
  readonly projectId: ProjectId;
  readonly repositoryId: RepositoryId;
  readonly asOfMillis: number;
  readonly bound: ConsentCurrencyBound | undefined;
  readonly relations: readonly ActRelation[];
}

export type ActEvaluation =
  | { readonly ok: true; readonly binding: ConsentActBinding }
  | { readonly ok: false; readonly diagnostic: ConsentDiagnostic };

// Frozen §3 check 2 with the §5 rules that consult another reference: the
// one predicate saying whether `entry`'s decision evaluates this artifact's
// act. True for the entry's own reference whose pair equals the entry pair
// (rule 1), and for any other reference that is a `withdrawn` artifact for
// that same pair (rules 3 and 4). Every other pair is decided without its
// act, so the daemon never hands that act to a correlation provider (frozen
// §4: "only for acts that passed checks 1–23").
export function consentPairEvaluatedForEntry(
  record: { readonly projectId: string; readonly repositoryId: string; readonly grantState: string },
  reference: string,
  projectId: string,
  entry: RepositoryEntry,
): boolean {
  if (record.projectId !== projectId || record.repositoryId !== entry.id) return false;
  return reference === entry.consent || record.grantState === 'withdrawn';
}

// Checks 3–23 for an input whose artifact loaded. Correlation (check 24) is
// separate, so the daemon calls a provider only for an act that passed these.
export function evaluateConsentActBeforeCorrelation(
  input: ConsentAuthorityInput,
  context: ActEvaluationContext,
): ActEvaluation {
  if (input.artifact.state !== 'loaded') {
    return { ok: false, diagnostic: input.artifact.failure };
  }
  const record = input.artifact.record;
  switch (input.act.state) {
    case 'missing':
    case 'not-read':
      return { ok: false, diagnostic: 'owner-act-missing' };
    case 'unreadable':
      return { ok: false, diagnostic: 'owner-act-unreadable' };
    case 'unparseable':
      return { ok: false, diagnostic: 'owner-act-malformed' };
    case 'loaded':
      break;
  }
  if (!isMapping(input.act.document)) return { ok: false, diagnostic: 'owner-act-malformed' };
  const parsed = parseActDocument(input.act.document);
  if (!parsed.ok) return parsed;
  const act = parsed.act;

  const sameId = context.relations.filter((relation) => relation.actId === act.actId);
  if (sameId.length > 1) return { ok: false, diagnostic: 'act-identity-duplicate' };
  if (act.actor !== 'human') return { ok: false, diagnostic: 'actor-non-human' };
  if (act.artifact !== input.reference) return { ok: false, diagnostic: 'artifact-identity-mismatch' };
  if (act.artifactDigest !== input.artifact.digest) {
    return { ok: false, diagnostic: 'artifact-digest-mismatch' };
  }
  if (act.project !== context.projectId) return { ok: false, diagnostic: 'project-mismatch' };
  const expectedType = record.grantState === 'in-force' ? 'consent' : 'revoke';
  if (act.actType !== expectedType) return { ok: false, diagnostic: 'act-type-mismatch' };
  if (act.scope !== record.scope) return { ok: false, diagnostic: 'scope-mismatch' };
  if (!scopeAdmitsObservation(act.scope)) {
    return { ok: false, diagnostic: 'scope-excludes-observation' };
  }
  if ((act.provenance === 'owner-adopted-bootstrap') !== (act.a1AuditRecord === null)) {
    return { ok: false, diagnostic: 'provenance-state-inconsistent' };
  }
  const instant = instantMillis(act.instant) as number;
  if (instant > context.asOfMillis) return { ok: false, diagnostic: 'act-instant-future' };
  if (act.expires !== null && (instantMillis(act.expires) as number) <= context.asOfMillis) {
    return { ok: false, diagnostic: 'act-expired' };
  }
  if (
    context.bound !== undefined &&
    context.asOfMillis - instant > context.bound.maxAgeSeconds * 1000
  ) {
    return { ok: false, diagnostic: 'act-stale' };
  }
  // Every captured act is in the population, the act under evaluation
  // included: an act naming itself in `supersedes` defeats itself (§3
  // checks 22–23; R-RT-U2A2 implementation review finding 1).
  const defeaters = context.relations.filter((relation) => relation.supersedes === act.actId);
  if (defeaters.some((relation) => relation.actType === 'revoke')) {
    return { ok: false, diagnostic: 'act-revoked' };
  }
  if (defeaters.some((relation) => relation.actType === 'consent')) {
    return { ok: false, diagnostic: 'act-superseded' };
  }
  return {
    ok: true,
    binding: {
      projectId: context.projectId,
      repositoryId: context.repositoryId,
      artifactId: act.artifact,
      artifactDigest: act.artifactDigest,
      actType: act.actType,
      owner: act.owner,
      instant: act.instant,
      scope: act.scope,
      supersedes: act.supersedes,
      expires: act.expires,
      a1AuditRecord: act.a1AuditRecord,
      actId: act.actId,
      actor: 'human',
      provenance: act.provenance,
      actRecordDigest: input.act.digest,
    },
  };
}

type CorrelationOutcome =
  | { readonly ok: true; readonly provenance: ConsentProvenanceLabel; readonly correlation: AdmittedAct['correlation'] }
  | { readonly ok: false; readonly diagnostic: ConsentDiagnostic };

// Check 24, and the state-(1) upgrade. A failed or absent correlation never
// creates state (1) for a state-(2) claim and never refuses a state-(1) act.
function applyCorrelation(
  binding: ConsentActBinding,
  correlation: ConsentAuthorityInput['correlation'],
): CorrelationOutcome {
  const matched =
    correlation !== 'not-attempted' &&
    correlation.state === 'correlated' &&
    correlation.bindingDigest === correlationBindingDigest(binding) &&
    (binding.a1AuditRecord === null ||
      (correlation.auditRecordId === binding.a1AuditRecord.id &&
        correlation.auditRecordDigest === binding.a1AuditRecord.digest));
  if (matched) {
    return {
      ok: true,
      provenance: PROVENANCE_LABELS['syzygy-verified'],
      correlation: correlation as Extract<ConsentCorrelation, { state: 'correlated' }>,
    };
  }
  if (binding.provenance === 'owner-adopted-bootstrap') {
    return { ok: true, provenance: PROVENANCE_LABELS['owner-adopted-bootstrap'], correlation: null };
  }
  if (correlation === 'not-attempted') return { ok: false, diagnostic: 'correlation-unavailable' };
  switch (correlation.state) {
    case 'correlated':
    case 'mismatch':
      return { ok: false, diagnostic: 'correlation-mismatch' };
    case 'not-found':
      return { ok: false, diagnostic: 'correlation-not-found' };
    case 'indeterminate':
      return { ok: false, diagnostic: 'correlation-indeterminate' };
    case 'unavailable':
      return { ok: false, diagnostic: 'correlation-unavailable' };
  }
}

function fullEvaluation(
  input: ConsentAuthorityInput,
  context: ActEvaluationContext,
): { readonly ok: true; readonly act: AdmittedAct; readonly provenance: ConsentProvenanceLabel } | { readonly ok: false; readonly diagnostic: ConsentDiagnostic } {
  const before = evaluateConsentActBeforeCorrelation(input, context);
  if (!before.ok) return before;
  const outcome = applyCorrelation(before.binding, input.correlation);
  if (!outcome.ok) return outcome;
  return {
    ok: true,
    act: { binding: before.binding, correlation: outcome.correlation },
    provenance: outcome.provenance,
  };
}

// --- The pair decision (§5) -----------------------------------------------

function verifiedRecord(
  reference: string,
  artifactDigest: Sha256Digest,
  record: ConsentRecord,
  provenance: ConsentProvenanceLabel,
): VerifiedConsentRecord {
  return {
    reference,
    recordId: record.id,
    artifactDigest,
    scope: record.scope,
    attribution: record.attribution,
    grantState: record.grantState,
    provenance,
  };
}

export function relationsOf(inputs: readonly ConsentAuthorityInput[]): readonly ActRelation[] {
  return actRelations(inputs);
}

const CANDIDATE_RANK: Readonly<Record<string, number>> = {
  withdrawn: 0,
  'withdrawal-unresolved': 1,
  'consent-evidence-unresolved': 2,
};

function compareCodeUnits(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function decideRepositoryConsent(
  projectId: ProjectId,
  entry: RepositoryEntry,
  inputs: readonly ConsentAuthorityInput[],
  asOf: string,
  bound: ConsentCurrencyBound | undefined,
): PreObservationConsentDecision {
  const asOfMillis = instantMillis(asOf);
  if (asOfMillis === undefined) {
    throw new TypeError('decideRepositoryConsent: asOf is not an instant');
  }
  const relations = actRelations(inputs);
  const context: ActEvaluationContext = {
    projectId,
    repositoryId: entry.id,
    asOfMillis,
    bound,
    relations,
  };
  const reference = entry.consent;
  const own = inputs.find((input) => input.reference === reference);

  const untrusted: UntrustedConsentRecordView | null =
    own !== undefined && own.artifact.state === 'loaded'
      ? {
          trust: 'untrusted content',
          recordId: own.artifact.record.id,
          artifactDigest: own.artifact.digest,
          projectId: own.artifact.record.projectId,
          repositoryId: own.artifact.record.repositoryId,
          scope: own.artifact.record.scope,
          attribution: own.artifact.record.attribution,
          grantState: own.artifact.record.grantState,
        }
      : null;

  const refuse = (
    diagnostic: ConsentDiagnostic,
    diagnosticReference: string,
  ): PreObservationConsentDecision => ({
    authorization: 'Unknown',
    repositoryId: entry.id,
    reference,
    reason: CONSENT_DECISION_REASON,
    diagnostic,
    diagnosticReference,
    route: CONSENT_DECISION_ROUTE,
    untrustedRecord: untrusted,
    withdrawal: null,
  });
  const withdrawn = (withdrawal: VerifiedConsentRecord): PreObservationConsentDecision => ({
    authorization: 'Unknown',
    repositoryId: entry.id,
    reference,
    reason: CONSENT_DECISION_REASON,
    diagnostic: 'withdrawn',
    diagnosticReference: withdrawal.reference,
    route: CONSENT_DECISION_ROUTE,
    untrustedRecord: untrusted,
    withdrawal,
  });

  // Rule 1: the entry reference's own evidence is primary.
  if (own === undefined) return refuse('reference-unresolvable', reference);
  if (own.artifact.state !== 'loaded') return refuse(own.artifact.failure, reference);
  const record = own.artifact.record;
  if (!consentPairEvaluatedForEntry(record, reference, projectId, entry)) {
    return refuse('record-subject-mismatch', reference);
  }
  const evaluated = fullEvaluation(own, context);
  if (!evaluated.ok) return refuse(evaluated.diagnostic, reference);
  // Rule 2: the entry names a valid withdrawal.
  if (record.grantState === 'withdrawn') {
    return withdrawn(verifiedRecord(reference, own.artifact.digest, record, evaluated.provenance));
  }

  // Rules 3 and 4: every other captured reference that may withdraw P.
  const candidates: {
    readonly diagnostic: 'withdrawn' | 'withdrawal-unresolved' | 'consent-evidence-unresolved';
    readonly reference: string;
    readonly withdrawal: VerifiedConsentRecord | null;
  }[] = [];
  for (const input of inputs) {
    if (input.reference === reference) continue;
    if (input.artifact.state === 'loaded') {
      if (!consentPairEvaluatedForEntry(input.artifact.record, input.reference, projectId, entry)) {
        continue;
      }
      const withdrawal = fullEvaluation(input, context);
      candidates.push(
        withdrawal.ok
          ? {
              diagnostic: 'withdrawn',
              reference: input.reference,
              withdrawal: verifiedRecord(input.reference, input.artifact.digest, input.artifact.record, withdrawal.provenance),
            }
          : { diagnostic: 'withdrawal-unresolved', reference: input.reference, withdrawal: null },
      );
      continue;
    }
    const pair = input.artifact.pair;
    if (pair === null) {
      candidates.push({ diagnostic: 'consent-evidence-unresolved', reference: input.reference, withdrawal: null });
    } else if (pair.projectId === projectId && pair.repositoryId === entry.id) {
      candidates.push({ diagnostic: 'withdrawal-unresolved', reference: input.reference, withdrawal: null });
    }
  }
  if (candidates.length > 0) {
    const [winner] = [...candidates].sort(
      (a, b) =>
        (CANDIDATE_RANK[a.diagnostic] as number) - (CANDIDATE_RANK[b.diagnostic] as number) ||
        compareCodeUnits(a.reference, b.reference),
    );
    if (winner !== undefined) {
      return winner.withdrawal !== null
        ? withdrawn(winner.withdrawal)
        : refuse(winner.diagnostic, winner.reference);
    }
  }

  // Rule 5: admitted, with the exact provenance label.
  return {
    authorization: 'admitted',
    repositoryId: entry.id,
    reference,
    artifactDigest: own.artifact.digest,
    record,
    act: evaluated.act,
    provenance: evaluated.provenance,
  };
}

// --- The served tuple (CAP1-REQ-046 v1.0) ---------------------------------

// The one projection both channels serve, so the human fact set and the
// machine answer cannot drift: the consent artifact identity and digest,
// the owner-act basis, the provenance label and the A1 identity or its
// explicit absence — or authorization Unknown with the primary reason, the
// specific diagnostic, its reference, the route and any untrusted record.
// The evaluation identity is added by the serializer. A decision never
// claims an effect succeeded.
export const CONSENT_A1_EXPLICITLY_ABSENT = 'explicitly absent' as const;

export interface ConsentDecisionTuple {
  readonly repositoryId: RepositoryId;
  readonly reference: string;
  readonly authorization: 'admitted' | 'Unknown';
  readonly provenance: ConsentProvenanceLabel | null;
  readonly artifactId: string | null;
  readonly artifactDigest: Sha256Digest | null;
  readonly actId: string | null;
  readonly actRecordDigest: Sha256Digest | null;
  readonly owner: string | null;
  readonly actInstant: string | null;
  readonly scope: string | null;
  readonly a1AuditRecord: AuditRecordIdentity | typeof CONSENT_A1_EXPLICITLY_ABSENT | null;
  readonly reason: typeof CONSENT_DECISION_REASON | null;
  readonly diagnostic: ConsentDiagnostic | null;
  readonly diagnosticReference: string | null;
  readonly route: typeof CONSENT_DECISION_ROUTE | null;
  readonly untrustedRecord: UntrustedConsentRecordView | null;
}

export function consentDecisionTuple(decision: PreObservationConsentDecision): ConsentDecisionTuple {
  if (decision.authorization === 'admitted') {
    const binding = decision.act.binding;
    const correlation = decision.act.correlation;
    return {
      repositoryId: decision.repositoryId,
      reference: decision.reference,
      authorization: 'admitted',
      provenance: decision.provenance,
      artifactId: decision.record.id,
      artifactDigest: decision.artifactDigest,
      actId: binding.actId,
      actRecordDigest: binding.actRecordDigest,
      owner: binding.owner,
      actInstant: binding.instant,
      scope: binding.scope,
      a1AuditRecord:
        correlation !== null
          ? { id: correlation.auditRecordId, digest: correlation.auditRecordDigest }
          : CONSENT_A1_EXPLICITLY_ABSENT,
      reason: null,
      diagnostic: null,
      diagnosticReference: null,
      route: null,
      untrustedRecord: null,
    };
  }
  return {
    repositoryId: decision.repositoryId,
    reference: decision.reference,
    authorization: 'Unknown',
    provenance: null,
    artifactId: null,
    artifactDigest: null,
    actId: null,
    actRecordDigest: null,
    owner: null,
    actInstant: null,
    scope: null,
    a1AuditRecord: null,
    reason: decision.reason,
    diagnostic: decision.diagnostic,
    diagnosticReference: decision.diagnosticReference,
    route: decision.route,
    untrustedRecord: decision.untrustedRecord,
  };
}
