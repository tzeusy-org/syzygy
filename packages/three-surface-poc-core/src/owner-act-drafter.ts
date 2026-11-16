// Owner-act drafter — claims sharing one reason → a drafted act packet as
// data (M4 slice 7, P-71 Q3 arm (b)).
//
// The inverse of `owner-act-record.ts`: that parser turns a performed act
// record into typed fields; this drafter turns a set of Unknown claims, the
// authority artifact an act would bind and the act type into the packet an
// owner would be shown — subject, the exact ceremony phrase, the frozen
// digest of the artifact's bytes, and each claim the act would change.
//
// Pure, and it writes nothing: no filesystem, no network, no clock. The
// caller supplies the artifact's bytes; the drafter only hashes them. Like
// the parser it owns NO notion of validity — a draft is never an act, never
// evidence that an act would be lawful, and binds nothing (VIS-4). Under
// arm (b) nothing persists it: no file under `.syzygy/` is written, no
// phrase is registered, and no claim changes state because a draft exists.

import type { EpistemicState, UnknownReason } from '@syzygy/cap1-core';
import { sha256 } from '@syzygy/support';

/** The act types a draft can name, each with the ceremony verb the owner
 * would write and the reasons it can discharge. Only owner-actor reasons
 * appear; the classification is this implementation's [Inferred]. */
export const DRAFTABLE_ACTS = {
  consent: { phrase: 'RECORD CONSENT', title: 'Record consent', resolves: ['unconsented-source-or-provider'] },
  policy: { phrase: 'ADOPT POLICY', title: 'Adopt policy', resolves: ['no-currency-bound-declared', 'excluded-content'] },
  adjudication: { phrase: 'ADJUDICATE', title: 'Adjudicate', resolves: ['contradicted-pending-adjudication', 'challenge-suspended'] },
  declaration: { phrase: 'SIGN OFF DECLARATION', title: 'Sign off declaration', resolves: ['missing-declaration', 'mapping-coverage-absent'] },
} as const satisfies Readonly<Record<string, { readonly phrase: string; readonly title: string; readonly resolves: readonly UnknownReason[] }>>;

export type DraftActType = keyof typeof DRAFTABLE_ACTS;

export interface DraftableClaim {
  readonly claimId: string;
  readonly epistemic: EpistemicState;
}

export interface DraftInput {
  /** The one reason every claim carries and the act would discharge. */
  readonly reason: UnknownReason;
  readonly claims: readonly DraftableClaim[];
  /** The authority artifact the act would bind: its repository-relative
   * path and its exact bytes, frozen by the caller. */
  readonly artifact: { readonly path: string; readonly bytes: string };
  readonly actType: DraftActType;
}

/** What the act would do to a claim: discharge the reason. Whether the
 * claim then reads Observed is the next evaluation's to say, never the act's. */
export interface DraftedClaimChange {
  readonly claimId: string;
  readonly from: UnknownReason;
  readonly to: 'reason-discharged-pending-new-evaluation';
}

export interface OwnerActDraft {
  readonly status: 'draft-binds-nothing';
  readonly actType: DraftActType;
  readonly reason: UnknownReason;
  readonly subject: string;
  readonly ceremonyPhrase: string;
  readonly artifactPath: string;
  readonly frozenDigest: string;
  readonly claims: readonly DraftedClaimChange[];
}

export type DraftResult =
  | { readonly kind: 'drafted'; readonly draft: OwnerActDraft }
  | { readonly kind: 'refused'; readonly refusal: string };

function carries(state: EpistemicState, reason: UnknownReason): boolean {
  return state.label === 'Unknown' && 'reasons' in state
    && (state.reasons.primary === reason || state.reasons.secondary.includes(reason));
}

// A repository-relative POSIX path: no empty, `.` or `..` segment, no NUL
// or line break.
function relativePath(path: string): boolean {
  return !/[\0\n\r]/.test(path) && path.split('/').every((segment) => segment !== '' && segment !== '.' && segment !== '..');
}

export function draftOwnerAct(input: DraftInput): DraftResult {
  const act = DRAFTABLE_ACTS[input.actType];
  if (!(act.resolves as readonly UnknownReason[]).includes(input.reason)) {
    return { kind: 'refused', refusal: `a ${input.actType} act does not discharge ${input.reason}` };
  }
  if (input.claims.length === 0) return { kind: 'refused', refusal: 'no claims' };
  const stray = input.claims.find((claim) => !carries(claim.epistemic, input.reason));
  if (stray !== undefined) return { kind: 'refused', refusal: `${stray.claimId} does not carry ${input.reason}` };
  const ids = input.claims.map((claim) => claim.claimId);
  if (new Set(ids).size !== ids.length) return { kind: 'refused', refusal: 'a claim is named twice' };
  if (!relativePath(input.artifact.path)) return { kind: 'refused', refusal: `not a repository-relative path: ${input.artifact.path}` };
  const frozenDigest = sha256(input.artifact.bytes);
  return {
    kind: 'drafted',
    draft: {
      status: 'draft-binds-nothing',
      actType: input.actType,
      reason: input.reason,
      subject: `${act.title} for ${input.artifact.path}`,
      ceremonyPhrase: `${act.phrase} ${input.artifact.path}: ${frozenDigest}`,
      artifactPath: input.artifact.path,
      frozenDigest,
      claims: [...ids].sort().map((claimId) => ({ claimId, from: input.reason, to: 'reason-discharged-pending-new-evaluation' })),
    },
  };
}
