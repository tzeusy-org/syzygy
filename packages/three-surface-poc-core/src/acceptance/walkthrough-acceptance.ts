// The acceptance slice: the PWB-REQ-022 walkthrough judgment and the
// PWB-REQ-021 readiness of its answer population, composed at the app edge
// (syzygy-bpyt.7.1). The daemon and its fixtures hand `buildPocModel` a
// builder made here; the model builder imports neither evaluator and keeps
// only the two PocModel fields this slice fills.
//
// The two evaluations stay independent: readiness reads the run record and
// the shape's source population, never the judgment's outcome, and the
// judgment evaluator never sees a readiness arm (PWB-REQ-021 "Relation to
// PWB-REQ-022"). They share inputs only — the loaded pair and its binding.

import type { ProjectShape } from '../project-shape-model.js';
import {
  evaluateWalkthroughJudgment,
  type WalkthroughJudgmentEvaluation,
  type WalkthroughJudgmentInputs,
} from '../walkthrough-judgment.js';
import {
  evaluateWalkthroughReadiness,
  walkthroughEvaluationIdentity,
  type ReadinessPopulation,
  type ReadinessTraversal,
  type WalkthroughReadiness,
} from '../walkthrough-readiness.js';

export type WalkthroughJudgmentInputsFor = (binding: {
  readonly evaluationIdentity: string;
}) => WalkthroughJudgmentInputs;

export type WalkthroughReadinessPresentation =
  | { readonly kind: 'not-evaluated'; readonly detail: string }
  | { readonly kind: 'evaluated'; readonly readiness: WalkthroughReadiness };

export type WalkthroughJudgmentPresentation =
  | { readonly kind: 'not-evaluated'; readonly detail: string }
  | {
      readonly kind: 'evaluated';
      readonly evaluation: WalkthroughJudgmentEvaluation;
    };

export interface AcceptanceSlice {
  readonly walkthroughJudgment: WalkthroughJudgmentPresentation;
  readonly walkthroughReadiness: WalkthroughReadinessPresentation;
}

/** Receives the shape this build observed, so the pair binds to its exact
 * evaluation identity and readiness resolves against its sources. */
export type AcceptanceSliceBuilder = (projectShape: ProjectShape) => AcceptanceSlice;

export interface WalkthroughAcceptanceInput {
  /** Absent → `walkthroughJudgment.kind === 'not-evaluated'`. A function
   * receives the exact evaluation identity of the shape the build observed
   * (`walkthroughEvaluationIdentity`) so the pair's expectations bind to it
   * rather than to a placeholder; if it throws, the judgment and readiness
   * stay `not-evaluated` with the failure named. */
  readonly judgment?: WalkthroughJudgmentInputs | WalkthroughJudgmentInputsFor | undefined;
  /** Why no pair was supplied, when none was. */
  readonly judgmentDetail?: string | undefined;
  /** PWB-REQ-021 readiness needs the surface's own traversal predicate
   * (which routes are Polaris and its same-evaluation exact-source route);
   * the run record comes from the judgment pair and the source population
   * from the built project shape. Absent → `not-evaluated`. */
  readonly traversal?: ReadinessTraversal | undefined;
}

/** The same-evaluation source population readiness resolves against: the
 * observed shape's complete source list (admitted = classified body) and
 * its PWB-REQ-006 breach count; `unavailable` when no shape was observed. */
function readinessPopulation(projectShape: ProjectShape): ReadinessPopulation {
  if (projectShape.kind !== 'observed') {
    return {
      kind: 'unavailable',
      reason: `project shape ${projectShape.kind}: no same-evaluation source population`,
    };
  }
  return {
    kind: 'observed',
    sources: projectShape.sources.map((source) => ({
      path: source.path,
      admitted: source.record.outcome === 'classified',
    })),
    limitBreaches: projectShape.limitBreaches.length,
  };
}

export function walkthroughAcceptance(input: WalkthroughAcceptanceInput = {}): AcceptanceSliceBuilder {
  return (projectShape) => {
    let inputs: WalkthroughJudgmentInputs | undefined;
    let detail = input.judgmentDetail;
    if (typeof input.judgment === 'function') {
      try {
        inputs = input.judgment({ evaluationIdentity: walkthroughEvaluationIdentity(projectShape) });
      } catch (error: unknown) {
        detail = `Walkthrough-judgment inputs could not be loaded: ${error instanceof Error ? error.message : String(error)}`;
      }
    } else {
      inputs = input.judgment;
    }
    if (inputs === undefined) {
      return {
        walkthroughJudgment: {
          kind: 'not-evaluated',
          detail: detail ?? 'No cold-open walkthrough run record and judgment pair was supplied to this evaluation; no judgment was evaluated.',
        },
        walkthroughReadiness: {
          kind: 'not-evaluated',
          detail: detail ?? 'No cold-open walkthrough run record was supplied to this evaluation; no answer population was assessed.',
        },
      };
    }
    return {
      walkthroughJudgment: { kind: 'evaluated', evaluation: evaluateWalkthroughJudgment(inputs) },
      walkthroughReadiness:
        input.traversal === undefined
          ? {
              kind: 'not-evaluated',
              detail: 'No Polaris traversal predicate was supplied to this evaluation; readiness cannot tell Polaris routes from others.',
            }
          : {
              kind: 'evaluated',
              readiness: evaluateWalkthroughReadiness({
                runRecord: inputs.runRecord,
                expectations: {
                  surfaceVersion: inputs.expectations.surfaceVersion,
                  evaluationIdentity: inputs.expectations.evaluationIdentity,
                },
                traversal: input.traversal,
                population: readinessPopulation(projectShape),
              }),
            },
    };
  };
}
