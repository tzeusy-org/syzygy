/**
 * The `anchorsResolved` pair (PWB-REQ-014, tag
 * `pwb-anchor-resolution-amendment-v1.0`): per anchored block and for the
 * narrative, the number of anchors that resolve over the number of anchors,
 * counted against the machine answer of the same evaluation.
 *
 * An anchor resolves when the machine answer serves exactly one record with
 * an `identity` field of its own whose whole value equals the anchor's target
 * identity. A reference to another record's identity (`sourceIdentity`) is a
 * different key and counts for nothing, as does an identity composed from
 * other fields. Machine channel only: the pair is presentation, never
 * authority, and nothing here reads or sets `citable`.
 */
import { resolutionRoute, type PocUnknown } from '@syzygy/three-surface-poc-core';

/** Counted, or Unknown with its reason when the machine answer serves no
 * record with an identity of its own (a measured 0 of N there would be a zero
 * standing in for no evidence, VIS-2). */
export type AnchorsResolved =
  | { readonly kind: 'counted'; readonly resolved: number; readonly total: number }
  | ({ readonly kind: 'unknown' } & PocUnknown);

const NO_OWN_IDENTITY: AnchorsResolved = {
  kind: 'unknown',
  label: 'Unknown',
  reason: 'The machine answer at this evaluation serves no record with an identity of its own, so no anchor can be resolved against it.',
  closedReason: 'missing-evidence',
  resolutionRoutes: [resolutionRoute('missing-evidence')],
};

/** How many records of the machine answer carry each own `identity` string.
 * Walks the answer as `JSON.stringify` would serve it (a shared sub-object
 * serializes once per occurrence), iteratively: the answer is megabytes. */
export function ownIdentityCounts(answer: unknown): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  const pending: unknown[] = [answer];
  while (pending.length > 0) {
    const value = pending.pop();
    if (value === null || typeof value !== 'object') continue;
    if (Array.isArray(value)) {
      for (const member of value) pending.push(member);
      continue;
    }
    const record = value as Record<string, unknown>;
    const own = Object.hasOwn(record, 'identity') ? record['identity'] : undefined;
    if (typeof own === 'string') counts.set(own, (counts.get(own) ?? 0) + 1);
    for (const member of Object.values(record)) pending.push(member);
  }
  return counts;
}

export interface AnchoredBlockInput {
  readonly anchors: readonly { readonly targetId: string }[];
}

/** One pair per block, in order, and the narrative's pair: the sum of the
 * blocks' pairs. An opening carries no anchor set, so it is not here. */
export function resolveAnchors(blocks: readonly AnchoredBlockInput[], answer: unknown): { readonly blocks: readonly AnchorsResolved[]; readonly narrative: AnchorsResolved } {
  const counts = ownIdentityCounts(answer);
  if (counts.size === 0) return { blocks: blocks.map(() => NO_OWN_IDENTITY), narrative: NO_OWN_IDENTITY };
  let resolved = 0;
  let total = 0;
  const pairs = blocks.map((block): AnchorsResolved => {
    const blockResolved = block.anchors.filter((anchor) => counts.get(anchor.targetId) === 1).length;
    resolved += blockResolved;
    total += block.anchors.length;
    return { kind: 'counted', resolved: blockResolved, total: block.anchors.length };
  });
  return { blocks: pairs, narrative: { kind: 'counted', resolved, total } };
}
