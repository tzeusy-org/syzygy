import type { ProjectDeclaration } from './declaration.js';
import type { ProjectId, RepositoryId } from './identity.js';
// Types only: coverage projects a closed decision and never runs, reloads or
// re-verifies one, so it imports no value from the decision module.
import type {
  ConsentDiagnostic,
  PreObservationConsentDecision,
  UntrustedConsentRecordView,
  VerifiedConsentRecord,
} from './consent-decision.js';
import { UNKNOWN_REASONS } from './vocabulary.js';

// Per-repository coverage — every declared repository gets an explicit
// result (CAP1-REQ-010), the failure states stay distinguishable
// (CAP1-REQ-013), and a partial capture is never rendered as the whole
// (CAP1-REQ-014). Pure domain logic over caller-supplied inputs.
//
// Vocabulary note: the `state` names below ('observed', 'unconsented',
// 'capture-failed', 'stale', 'degraded-partial') are IMPLEMENTATION
// vocabulary — machine-readable discriminants this layer mints so that
// CAP1-REQ-013's four conditions cannot collapse into one rendered
// state. They claim no spec authority. The spec-governed spellings are
// the `reason` values, each imported verbatim from the closed
// twelve-reason vocabulary (RFC2-24) — never restrung here.

// Reasons taken from the closed vocabulary by position — the tuple type
// makes each binding a compile error if the vocabulary is ever
// reordered, so the spelling is imported, never restrung (RFC2-24).
const UNCONSENTED: 'unconsented-source-or-provider' = UNKNOWN_REASONS[5]; // reason #6
const UNCAPTURED: 'source-uncaptured-or-unreachable' = UNKNOWN_REASONS[9]; // reason #10
const STALE: 'stale-beyond-currency-bound' = UNKNOWN_REASONS[3]; // reason #4

// RFC6-26's resolution route, verbatim from the clause: unconsented is a
// standing policy state "with its resolution route (record consent)".
export const UNCONSENTED_RESOLUTION_ROUTE = 'record consent';

// What the observation layer reports per repository, before consent is
// applied. This is caller input — in Capability 1's pure layer the
// checker's fixture plays the observer; the daemon slice will supply
// real outcomes. The four outcomes map onto RFC2-23's degradation rows:
// 'captured' (full), 'captured-partial' (Partial snapshot),
// 'unreachable' (Source unreachable / Observer failed — both render
// reason #10, and this layer does not further split them), 'stale'
// (evidence past its currency bound).
export type ObservationOutcome =
  | {
      readonly repositoryId: RepositoryId;
      readonly outcome: 'captured';
      readonly capturedScope: string;
    }
  | {
      readonly repositoryId: RepositoryId;
      readonly outcome: 'captured-partial';
      readonly capturedScope: string;
      readonly declaredScope: string;
    }
  | { readonly repositoryId: RepositoryId; readonly outcome: 'unreachable' }
  | { readonly repositoryId: RepositoryId; readonly outcome: 'stale' };

type RefusedDecision = Extract<PreObservationConsentDecision, { authorization: 'Unknown' }>;

// A consent record cited by a rendered coverage entry — the declared
// reference, the record's id and artifact digest, scope, attribution,
// grant state and the provenance label, exactly as the closed
// pre-observation decision verified them (REQ-011: never a bare boolean,
// always the record it derives from). The in-force grant behind
// observed/degraded-partial/capture-failed/stale, or the withdrawal behind
// an unconsented-by-withdrawal entry. Coverage copies it; it never reloads
// or re-verifies a record (syzygy-u2a.6).
export type ConsentCitation = VerifiedConsentRecord;

// The per-repository coverage result: a discriminated union over
// `state`, so any two of REQ-013's conditions are distinguishable in the
// machine-readable field itself, not only in prose.
export type RepositoryCoverage =
  | {
      readonly repositoryId: RepositoryId;
      readonly state: 'observed';
      // A capture declares its scope even when full — the boundary is
      // built from declared scopes, never implied ones (RFC2-23).
      readonly capturedScope: string;
      // REQ-011: the served consent state derives from the record and
      // renders with the coverage boundary — scope, attribution, grant
      // state, citing the record by id.
      readonly consent: ConsentCitation;
    }
  | {
      readonly repositoryId: RepositoryId;
      readonly state: 'unconsented';
      readonly label: 'Unknown';
      readonly reason: typeof UNCONSENTED;
      // REQ-012 / RFC6-26: a standing POLICY state, never a failure, an
      // error, or an empty region — the discriminant says so machine-
      // readably, and the resolution route travels with it.
      readonly presentation: 'policy';
      readonly resolutionRoute: typeof UNCONSENTED_RESOLUTION_ROUTE;
      readonly basis: 'no-resolvable-in-force-record';
      // The entry's declared consent reference, and Task 1's typed refusal
      // carried verbatim: the specific diagnostic, the reference it names,
      // the owner-adjudication route and any recorded-but-unhonored record
      // (the visible contradiction). The primary reason stays #6 whatever
      // the diagnostic says; `reference-unresolvable` here is a consent
      // diagnostic, never reason #11.
      readonly reference: string;
      readonly diagnostic: Exclude<ConsentDiagnostic, 'withdrawn'>;
      readonly diagnosticReference: string;
      readonly route: RefusedDecision['route'];
      readonly untrustedRecord: UntrustedConsentRecordView | null;
    }
  | {
      readonly repositoryId: RepositoryId;
      readonly state: 'unconsented';
      readonly label: 'Unknown';
      readonly reason: typeof UNCONSENTED;
      readonly presentation: 'policy';
      readonly resolutionRoute: typeof UNCONSENTED_RESOLUTION_ROUTE;
      readonly basis: 'withdrawn';
      readonly reference: string;
      // R-S2 finding #4: WHICH withdrawal record defeated the grant —
      // the render already says the pair is withdrawn; this names the
      // record so the claim is checkable, not just assertable.
      readonly consent: ConsentCitation;
      readonly route: RefusedDecision['route'];
      readonly untrustedRecord: UntrustedConsentRecordView | null;
    }
  | {
      readonly repositoryId: RepositoryId;
      readonly state: 'capture-failed';
      readonly label: 'Unknown';
      readonly reason: typeof UNCAPTURED;
      // Reachable only when the pair IS consented (an unconsented pair
      // never reaches an observation outcome — see computeCoverage) — the
      // in-force record standing behind the failed capture, cited by id.
      readonly consent: ConsentCitation;
    }
  | {
      readonly repositoryId: RepositoryId;
      readonly state: 'stale';
      readonly label: 'Unknown';
      readonly reason: typeof STALE;
      // Same reachability note as capture-failed above.
      readonly consent: ConsentCitation;
    }
  | {
      readonly repositoryId: RepositoryId;
      readonly state: 'degraded-partial';
      // REQ-014 / RFC2-23 "Partial snapshot": a partial capture DECLARES
      // its captured scope explicitly, and the uncaptured remainder
      // renders Unknown — never presented as complete.
      readonly capturedScope: string;
      readonly declaredScope: string;
      readonly uncaptured: { readonly label: 'Unknown'; readonly reason: typeof UNCAPTURED };
      readonly consent: ConsentCitation;
    };

export type RepositoryCoverageState = RepositoryCoverage['state'];

export interface CoverageResult {
  readonly projectId: ProjectId;
  // Exactly one entry per declared repository, in declaration order —
  // the denominator is the declaration's own repository count
  // (CAP1-REQ-010): nothing is silently absent.
  readonly repositories: readonly RepositoryCoverage[];
}

// One explicit coverage result per declared repository (CAP1-REQ-010),
// projected from the closed pre-observation decisions (syzygy-u2a.6).
//
// The join is ORDINAL: `consentByEntry[i]` is the decision for
// `declaration.repositories[i]`. A count, repository-identity or
// reference mismatch is a caller contract violation and throws; it is
// never repaired by looking a pair up. Coverage never resolves consent
// itself: it copies what the decision verified.
//
// Precedence, and why: consent comes FIRST. A repository whose decision is
// not `admitted` renders 'unconsented' even if an observation outcome was
// (wrongly) supplied for it — no served content, structure, or derived
// fact may originate from an unconsented source (CAP1-REQ-016, RFC1-3),
// so an outcome without consent is discarded, not surfaced. Only for an
// admitted repository is the observation outcome consulted; an admitted
// repository with NO outcome at all renders 'capture-failed' (reason
// #10) — absence of an outcome is a fact of the render, never a silent
// omission (RFC2-23 "Source unreachable": the snapshot records the
// absence as a fact).
//
// Deterministic: a pure function of (declaration, decisions,
// observations). The (project, evaluation) pairing REQ-015 speaks of is
// the caller's: this layer computes over one evaluation's inputs and
// holds no clock; the daemon slice stamps the evaluation identity.
export function computeCoverage(
  declaration: ProjectDeclaration,
  consentByEntry: readonly PreObservationConsentDecision[],
  observations: readonly ObservationOutcome[],
): CoverageResult {
  const projectId = declaration.project.id;
  if (consentByEntry.length !== declaration.repositories.length) {
    throw new TypeError(
      `computeCoverage: ${consentByEntry.length} consent decisions for ${declaration.repositories.length} declared repositories`,
    );
  }

  const repositories = declaration.repositories.map((entry, ordinal): RepositoryCoverage => {
    const decision = consentByEntry[ordinal] as PreObservationConsentDecision;
    if (decision.repositoryId !== entry.id || decision.reference !== entry.consent) {
      throw new TypeError(
        `computeCoverage: decision ${ordinal} is for ${decision.repositoryId} (${decision.reference}), not ${entry.id} (${entry.consent})`,
      );
    }

    if (decision.authorization !== 'admitted') {
      const unconsented = {
        repositoryId: entry.id,
        state: 'unconsented',
        label: 'Unknown',
        reason: UNCONSENTED,
        presentation: 'policy',
        resolutionRoute: UNCONSENTED_RESOLUTION_ROUTE,
        reference: decision.reference,
      } as const;
      if (decision.diagnostic === 'withdrawn') {
        if (decision.withdrawal === null) {
          throw new TypeError(
            `computeCoverage: withdrawn decision for ${entry.id} names no withdrawal record`,
          );
        }
        return {
          ...unconsented,
          basis: 'withdrawn',
          consent: decision.withdrawal,
          route: decision.route,
          untrustedRecord: decision.untrustedRecord,
        };
      }
      return {
        ...unconsented,
        basis: 'no-resolvable-in-force-record',
        diagnostic: decision.diagnostic,
        diagnosticReference: decision.diagnosticReference,
        route: decision.route,
        untrustedRecord: decision.untrustedRecord,
      };
    }

    const consent: ConsentCitation = {
      reference: decision.reference,
      recordId: decision.record.id,
      artifactDigest: decision.artifactDigest,
      scope: decision.record.scope,
      attribution: decision.record.attribution,
      grantState: decision.record.grantState,
      provenance: decision.provenance,
    };

    // First outcome for this repository, in caller order — reproducible
    // per evaluation; a repository with none is a capture failure.
    const outcome = observations.find((o) => o.repositoryId === entry.id);
    if (outcome === undefined || outcome.outcome === 'unreachable') {
      return {
        repositoryId: entry.id,
        state: 'capture-failed',
        label: 'Unknown',
        reason: UNCAPTURED,
        consent,
      };
    }
    if (outcome.outcome === 'stale') {
      return {
        repositoryId: entry.id,
        state: 'stale',
        label: 'Unknown',
        reason: STALE,
        consent,
      };
    }
    if (outcome.outcome === 'captured-partial') {
      return {
        repositoryId: entry.id,
        state: 'degraded-partial',
        capturedScope: outcome.capturedScope,
        declaredScope: outcome.declaredScope,
        uncaptured: { label: 'Unknown', reason: UNCAPTURED },
        consent,
      };
    }
    return {
      repositoryId: entry.id,
      state: 'observed',
      capturedScope: outcome.capturedScope,
      consent,
    };
  });

  return { projectId, repositories };
}

// REQ-015's served object: the coverage boundary — the union of the
// evaluation's executed coverage records and, where a capture was
// partial, its explicitly declared captured scopes (RFC6-19 class 7).
// One boundary per (project, evaluation); the evaluation coordinate is
// the caller's (see computeCoverage). Deterministic: a pure projection
// of the result, so two computations over the same result are deeply
// equal — the same boundary facts serve every channel.
export interface CoverageBoundary {
  readonly projectId: ProjectId;
  readonly records: readonly RepositoryCoverage[];
  readonly declaredCapturedScopes: readonly {
    readonly repositoryId: RepositoryId;
    readonly capturedScope: string;
  }[];
}

export function coverageBoundary(result: CoverageResult): CoverageBoundary {
  return {
    projectId: result.projectId,
    records: result.repositories,
    declaredCapturedScopes: result.repositories.flatMap((entry) =>
      entry.state === 'observed' || entry.state === 'degraded-partial'
        ? [{ repositoryId: entry.repositoryId, capturedScope: entry.capturedScope }]
        : [],
    ),
  };
}

// True ONLY when every declared repository is 'observed' — the whole is
// never claimed from a part (CAP1-REQ-014). A partial capture cannot
// reach 'observed': computeCoverage maps 'captured-partial' to
// 'degraded-partial' unconditionally, so full-scope completeness cannot
// be asserted over partial data through this function. An empty
// repository list is vacuously complete over a denominator of zero —
// the denominator itself stays visible in the result.
export function isComplete(result: CoverageResult): boolean {
  return result.repositories.every((entry) => entry.state === 'observed');
}
