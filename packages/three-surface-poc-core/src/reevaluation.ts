import type { PocModel } from './model.js';

// A named re-evaluation result (pursuit N2, syzygy-u05.2; P-69: every
// re-evaluation is human-triggered). It records the new evaluation
// identity, the identity it supersedes, and three clock readings: the
// observed repository's git HEAD, its working-tree digest and the Beads
// Dolt revision. It also keeps the two staleness limbs apart: the observed
// project moving (sources changed or added between the two evaluated
// revisions) and the observatory moving (Syzygy commits since the running
// build). A prior evaluation is never rewritten; this result names it.
// Pure: every reading is supplied by the caller.

interface EvaluationClocks {
  readonly butlersHead: string;
  readonly workingTreeDigest: string;
  /** Null when this evaluation did not observe the work-item database:
   * the Dolt clock is Unknown, never a remembered value. */
  readonly doltRevision: string | null;
}

/** One evaluation's identity. The snapshot names the observed inputs, so an
 * unchanged repository re-observed yields the same snapshot; the observation
 * instant makes each re-evaluation its own identity, and the prior one stays
 * nameable beside it. */
export function evaluationIdentity(model: PocModel): string {
  return `${model.evaluation.snapshot}|observed:${model.evaluation.asOf}`;
}

/** The clocks one evaluation read. The Dolt revision is the one the
 * evaluation's own work-item observation captured; nothing is re-queried. */
export function evaluationClocks(model: PocModel, workingTreeDigest: string): EvaluationClocks {
  return {
    butlersHead: model.project.revision,
    workingTreeDigest,
    doltRevision: model.workItems.kind === 'observed' ? model.workItems.provenance.revision : null,
  };
}

export interface EvaluatedClocks {
  readonly evaluation: string;
  readonly clocks: EvaluationClocks;
}

/** Moved, unchanged, or Unknown (no prior evaluation, or a clock either
 * side could not read). */
export type ClockMovement = 'moved' | 'unchanged' | 'unknown';

type ObservedProjectLimb =
  | { readonly kind: 'no-prior' }
  | { readonly kind: 'unknown'; readonly reason: string }
  | { readonly kind: 'compared'; readonly changedSources: number; readonly addedSources: number };

export interface ObservatoryLimb {
  /** The Syzygy revision the running daemon was started from. */
  readonly buildRevision: string;
  readonly currentRevision: string | null;
  /** Null when the count could not be read: Unknown, never zero. */
  readonly commitsSinceBuild: number | null;
}

export interface Reevaluation {
  readonly evaluation: string;
  readonly supersedes: string | null;
  readonly clocks: EvaluationClocks;
  readonly moved: {
    readonly butlersHead: ClockMovement;
    readonly workingTreeDigest: ClockMovement;
    readonly doltRevision: ClockMovement;
  };
  readonly limbs: {
    readonly observedProject: ObservedProjectLimb;
    readonly observatory: ObservatoryLimb;
  };
}

interface ReevaluationInput {
  readonly prior: EvaluatedClocks | null;
  readonly next: EvaluatedClocks;
  /** Sources changed and added between the two evaluated revisions; null
   * when that comparison could not be read. Ignored without a prior. */
  readonly projectChange: { readonly changedSources: number; readonly addedSources: number } | null;
  readonly observatory: ObservatoryLimb;
}

function movement(before: string | null | undefined, after: string | null): ClockMovement {
  if (before === undefined || before === null || after === null) return 'unknown';
  return before === after ? 'unchanged' : 'moved';
}

export function describeReevaluation(input: ReevaluationInput): Reevaluation {
  const { prior, next } = input;
  if (prior !== null && prior.evaluation === next.evaluation) {
    throw new Error(`a re-evaluation must mint a new identity; ${next.evaluation} is the prior one`);
  }
  const observedProject: ObservedProjectLimb = prior === null
    ? { kind: 'no-prior' }
    : input.projectChange === null
      ? { kind: 'unknown', reason: 'the revision comparison could not be read' }
      : { kind: 'compared', changedSources: input.projectChange.changedSources, addedSources: input.projectChange.addedSources };
  return Object.freeze({
    evaluation: next.evaluation,
    supersedes: prior?.evaluation ?? null,
    clocks: Object.freeze({ ...next.clocks }),
    moved: Object.freeze({
      butlersHead: movement(prior?.clocks.butlersHead, next.clocks.butlersHead),
      workingTreeDigest: movement(prior?.clocks.workingTreeDigest, next.clocks.workingTreeDigest),
      doltRevision: movement(prior?.clocks.doltRevision, next.clocks.doltRevision),
    }),
    limbs: Object.freeze({
      observedProject: Object.freeze(observedProject),
      observatory: Object.freeze({ ...input.observatory }),
    }),
  });
}
