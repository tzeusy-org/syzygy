// Authority disclosure — the ONE place the per-authority state text and
// the exact state-(1) sentence are rendered (PWB-REQ-005: every human
// and machine rendering of the authorization basis exposes each
// authority's exact state; only state (2) may be called independently
// verified; state (1) renders exactly the quoted sentence).
//
// Polaris, the home page and `/api/poc` all carry these strings from
// this module, so human/machine parity for the authorization basis is
// by construction rather than by comparison.

import {
  AUTHORITY_KINDS,
  STATE_1_LABEL,
  STATE_2_LABEL,
  type AuthorityKind,
  type AuthorityState,
  type BodyReadAuthorityEvaluation,
} from './body-read-authority.js';

// Quoted verbatim from PWB-REQ-005.
export const STATE_1_DISCLOSURE =
  "Owner-trusted only; same-tree forgeable from Syzygy's perspective. Digest detects drift, not authorship or attendance." as const;

export const STATE_2_DISCLOSURE =
  'Independently verified: the owner act correlates with an A1 audit record kept outside this tree.' as const;

interface AuthorityStateDisclosure {
  readonly authority: AuthorityKind;
  // RFC3-16(c)'s label for a valid act, or the non-valid kind.
  readonly state: typeof STATE_1_LABEL | typeof STATE_2_LABEL | 'invalid act' | 'absent';
  // True ONLY for state (2). Nothing else may claim independent verification.
  readonly independentlyVerified: boolean;
  readonly disclosure: string;
  readonly actIdentity: string | undefined;
  readonly artifactDigest: string | undefined;
  readonly invalidCase: string | undefined;
}

interface AuthorityMayNot {
  readonly id: string;
  readonly statement: string;
  readonly actIdentity: string | undefined;
  readonly artifactDigest: string | undefined;
}

export const FIXED_MAY_NOT_IDS = Object.freeze([
  'no-write-to-observed-repository',
  'no-second-repository-or-wider-content-class',
  'no-production-release-or-remote-access',
  'no-edit-to-act-bound-artifact',
  'no-doctrine-or-contract-change-or-syzygy-authored-code',
  'no-independent-verification',
] as const);

export const FIXED_MAY_NOT_STATEMENTS = Object.freeze([
  'No write, egress, execution, deployment, release, recovery, or mission effect on Butlers or on any other repository. The observer registry entry the owner adopted declares an empty write surface; that remains the bound.',
  'No second repository, no wider content class, no reading of Butlers content the secret-classification policy excludes or cannot classify.',
  'No production release, broad remote access, or multi-user support.',
  'No edit to any act-bound artifact: the eleven signed PWB artifacts, the three effect-act subjects, the six signed three-surface-poc-experience artifacts, or the seven adopted Capability 1 artifacts. Spec changes route through CC-REV-2\'s amendment path and a new owner act.',
  'No doctrine or contract change; no autonomous intent adoption; no Syzygy-authored implementation code; no unattended agent coordination.',
  'No independent verification: this authorization, like the three effect acts, is a state-(1) human direction. A later Syzygy-verified state is a separate act.',
] as const);

const IMPLEMENTATION_ACT_IDENTITY = 'PWB-IMPLEMENTATION-AUTHORIZATION-ACT' as const;

function authorityMayNot(entry: AuthorityStateDisclosure): AuthorityMayNot {
  const statement = entry.state === 'owner-adopted (bootstrap, uncorrelated)' || entry.state === 'Syzygy-verified'
    ? `May not read outside the effective ${entry.authority} authority; ${entry.disclosure}`
    : `May not read under the ${entry.authority} authority; ${entry.disclosure}`;
  return {
    id: `no-${entry.authority}-authority-breach`,
    statement,
    actIdentity: entry.actIdentity,
    artifactDigest: entry.artifactDigest,
  };
}

function fixedMayNot(): readonly AuthorityMayNot[] {
  return FIXED_MAY_NOT_IDS.map((id, index) => ({
    id,
    statement: FIXED_MAY_NOT_STATEMENTS[index] as string,
    actIdentity: IMPLEMENTATION_ACT_IDENTITY,
    artifactDigest: undefined,
  }));
}

export interface AuthorityDisclosure {
  readonly evaluationId: string;
  readonly evaluationInstant: string;
  readonly admits: boolean;
  readonly authorizationMode: BodyReadAuthorityEvaluation['authorizationMode'];
  readonly authorities: readonly AuthorityStateDisclosure[];
  readonly mayNot: readonly AuthorityMayNot[];
  readonly contradiction: string | undefined;
}

function discloseAuthorityState(authority: AuthorityKind, state: AuthorityState): AuthorityStateDisclosure {
  if (state.kind === 'valid') {
    return {
      authority,
      state: state.provenance === 'state-2' ? STATE_2_LABEL : STATE_1_LABEL,
      independentlyVerified: state.provenance === 'state-2',
      disclosure: state.provenance === 'state-2' ? STATE_2_DISCLOSURE : STATE_1_DISCLOSURE,
      actIdentity: state.actIdentity,
      artifactDigest: state.artifactDigest,
      invalidCase: undefined,
    };
  }
  if (state.kind === 'invalid') {
    return {
      authority,
      state: 'invalid act',
      independentlyVerified: false,
      disclosure: `Invalid owner act (${state.caseId}): ${state.detail}. No authority is in force; the artifact and its act remain visible.`,
      actIdentity: undefined,
      artifactDigest: state.artifactDigest,
      invalidCase: state.caseId,
    };
  }
  return {
    authority,
    state: 'absent',
    independentlyVerified: false,
    disclosure: `No owner act in force (${state.what}).`,
    actIdentity: undefined,
    artifactDigest: state.artifactDigest,
    invalidCase: undefined,
  };
}

export function discloseAuthority(evaluation: BodyReadAuthorityEvaluation): AuthorityDisclosure {
  const authorities = AUTHORITY_KINDS.map((kind) => discloseAuthorityState(kind, evaluation[kind]));
  return {
    evaluationId: evaluation.evaluationId,
    evaluationInstant: evaluation.evaluationInstant,
    admits: evaluation.admits,
    authorizationMode: evaluation.authorizationMode,
    authorities,
    mayNot: Object.freeze([...authorities.map(authorityMayNot), ...fixedMayNot()]),
    contradiction: evaluation.contradiction?.statement,
  };
}
