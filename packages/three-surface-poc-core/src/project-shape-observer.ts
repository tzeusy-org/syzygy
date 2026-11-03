// Project-shape observer — the body-read gate (PWB-REQ-005).
//
// This is the module the adopted adapter-registry entry names
// (`implementation: packages/three-surface-poc-core/src/project-shape-observer.ts`).
// Its FIRST statement is the gate: when the body-read authority
// evaluation does not admit, it returns a project-shape Unknown carrying
// the registry's admission-failure reason and the RFC3-16(a)
// contradiction, and the injected reader is never called. Only an
// admitting evaluation reaches `read`.
//
// Slice P1 lands exactly this gate; the revision-bound manifest, the
// contained Git-object reader, classification and extraction (slices
// P2–P4) are supplied later through `read`. Nothing here opens a file.

import {
  AUTHORITY_KINDS,
  type AuthorityKind,
  type AuthorityState,
  type BodyReadAuthorityEvaluation,
  type Rfc316aContradiction,
} from './body-read-authority.js';

// RFC2-24 closed Unknown reasons the adopted registry entry maps
// admission failures to (`admissionFailureMapping`). Hard-coded here so
// that a missing or invalid registry cannot take the mapping with it;
// `project-shape-observer.test.ts` proves byte equality with the adopted
// entry's own table.
export const PWB_ADMISSION_FAILURE_MAPPING = {
  missingConsent: 'unconsented-source-or-provider',
  mismatchedStaleRevokedOrUnattributedConsent: 'unconsented-source-or-provider',
  missingSecretPolicy: 'missing-declaration',
  mismatchedStaleRevokedOrUnattributedSecretPolicy: 'source-uncaptured-or-unreachable',
  missingRegistryEntry: 'source-uncaptured-or-unreachable',
  mismatchedStaleRevokedOrUnattributedRegistryEntry: 'source-uncaptured-or-unreachable',
} as const;

export type AdmissionFailureReason =
  (typeof PWB_ADMISSION_FAILURE_MAPPING)[keyof typeof PWB_ADMISSION_FAILURE_MAPPING];

interface ProjectShapeReadContext {
  readonly authority: BodyReadAuthorityEvaluation;
}

type ProjectShapeObservation<T> =
  | {
      readonly kind: 'unknown';
      readonly reason: AdmissionFailureReason;
      readonly secondaryReasons: readonly AdmissionFailureReason[];
      readonly contradiction: Rfc316aContradiction;
      readonly authority: BodyReadAuthorityEvaluation;
    }
  | {
      readonly kind: 'admitted';
      readonly authority: BodyReadAuthorityEvaluation;
      readonly result: T;
    };

function reasonFor(kind: AuthorityKind, state: AuthorityState): AdmissionFailureReason {
  const missing = state.kind === 'absent';
  switch (kind) {
    case 'consent':
      return missing
        ? PWB_ADMISSION_FAILURE_MAPPING.missingConsent
        : PWB_ADMISSION_FAILURE_MAPPING.mismatchedStaleRevokedOrUnattributedConsent;
    case 'policy':
      return missing
        ? PWB_ADMISSION_FAILURE_MAPPING.missingSecretPolicy
        : PWB_ADMISSION_FAILURE_MAPPING.mismatchedStaleRevokedOrUnattributedSecretPolicy;
    case 'registry':
      return missing
        ? PWB_ADMISSION_FAILURE_MAPPING.missingRegistryEntry
        : PWB_ADMISSION_FAILURE_MAPPING.mismatchedStaleRevokedOrUnattributedRegistryEntry;
  }
}

export function observeProjectShape<T>(input: {
  readonly authority: BodyReadAuthorityEvaluation;
  readonly read: (context: ProjectShapeReadContext) => T;
}): ProjectShapeObservation<T> {
  const authority = input.authority;
  // mutation-point: gate | !authority.admits => false
  if (!authority.admits) {
    const reasons = AUTHORITY_KINDS.filter((kind) => authority[kind].kind !== 'valid').map((kind) =>
      reasonFor(kind, authority[kind]),
    );
    const primary = reasons[0] ?? PWB_ADMISSION_FAILURE_MAPPING.missingRegistryEntry;
    return {
      kind: 'unknown',
      reason: primary,
      secondaryReasons: reasons.slice(1),
      contradiction: authority.contradiction ?? {
        clause: 'RFC3-16(a)',
        definedTerm: 'authorization-bearing governance artifact',
        statement: 'The evaluation does not admit and recorded no contradiction; the gate fails closed.',
        failing: [],
      },
      authority,
    };
  }
  return { kind: 'admitted', authority, result: input.read({ authority }) };
}
