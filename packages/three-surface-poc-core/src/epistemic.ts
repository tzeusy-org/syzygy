// The one constructor module for the POC's surface epistemic carriers
// (syzygy-bpyt.6.4, DC-4). Internal: `index.ts` re-exports the types through
// `model.ts` and exports neither constructor.
//
// An Unknown is built only here, from a typed RFC2-24 reason and its basis
// sentence; a producer cannot hand the model an untyped or minted reason,
// because `unknown` takes an `UnknownReason` and nothing re-validates a
// string later. The serialized shape is unchanged: `reason` is still the
// basis prose the page has always rendered, `closedReason` the closed word,
// in that key order.

import type { UnknownReason } from '@syzygy/cap1-core';

import { resolutionRoute, type ResolutionRoutes } from './project-shape-model.js';

/** The one lawful action a POC Unknown can lead to (M4 slice 1): the
 * read-only materialize preview on Trajectory. Following it writes nothing. */
export interface PocActionRoute {
  readonly surface: 'trajectory';
  readonly anchor: 'materialize-panel';
}

/** An Unknown carries its basis sentence (`reason`, the prose the page has
 * always rendered), the closed RFC2-24 reason, and at least one route
 * (M4 slices 1–2, P-71). */
export interface PocUnknown {
  readonly label: 'Unknown';
  readonly reason: string;
  readonly closedReason: UnknownReason;
  readonly resolutionRoutes: ResolutionRoutes;
  readonly actionRoute?: PocActionRoute;
}

export type PocEpistemic = { readonly label: 'Observed'; readonly basis: string } | PocUnknown;

export function observed(basis: string): PocEpistemic {
  return { label: 'Observed', basis };
}

/** `closedReason` is the typed RFC2-24 reason; `basis` is the sentence the
 * page renders as the Unknown's `reason`. */
export function unknown(closedReason: UnknownReason, basis: string, actionRoute?: PocActionRoute): PocUnknown {
  return {
    label: 'Unknown',
    reason: basis,
    closedReason,
    resolutionRoutes: [resolutionRoute(closedReason)],
    ...(actionRoute === undefined ? {} : { actionRoute }),
  };
}

/** The closed reason each region producer establishes when its result is
 * Unknown. These results (`CodeStructureResult`, `OrreryProjection`,
 * `WorkItemsResult`, `TrajectoryProjection`, `TestArtifactVerificationResult`)
 * are served inside `/api/poc` with their prose `reason` alone, so the closed
 * word cannot join their Unknown arms without changing the wire bytes; it is
 * stated here once, typed, and `deriveUnknownSubjects` looks it up. */
export const PRODUCER_UNKNOWN_REASONS = {
  codeStructure: 'source-uncaptured-or-unreachable',
  workItems: 'source-uncaptured-or-unreachable',
  testArtifactVerification: 'missing-evidence',
} as const satisfies Readonly<Record<string, UnknownReason>>;
