import type { PocModel } from '@syzygy/three-surface-poc-core';

type ServedEvaluation = PocModel['evaluation'];
export type ServedResponseLimit = 'maxHumanResponseBytes' | 'maxMachineResponseBytes' | 'maxBriefingResponseBytes';

interface ServedResponseBreach {
  readonly sequence: number;
  readonly evaluation: { readonly inputsDigest: string; readonly asOf: string };
  readonly limit: ServedResponseLimit;
  readonly declared: number;
  readonly observed: number;
  readonly population:
    | { readonly kind: 'counted'; readonly sources: number; readonly items: number; readonly facts: number; readonly exclusions: number }
    | { readonly kind: 'unknown'; readonly reason: string };
}

interface ServedResponseSnapshot {
  readonly count: number;
  readonly latest: ServedResponseBreach | null;
}

const EMPTY: ServedResponseSnapshot = Object.freeze({ count: 0, latest: null });

function keyOf(evaluation: ServedEvaluation): string {
  return `${evaluation.snapshot}\u0000${evaluation.asOf}`;
}

/** Process-local served-side aggregate. A new evaluation cannot inherit the
 * prior one; no response body or request history is retained. */
export class ServedResponseRecorder {
  private key: string | null = null;
  private current: ServedResponseSnapshot = EMPTY;

  snapshot(evaluation: ServedEvaluation): ServedResponseSnapshot {
    return this.key === keyOf(evaluation) ? this.current : EMPTY;
  }

  record(event: Omit<ServedResponseBreach, 'sequence' | 'evaluation'> & { readonly evaluation: ServedEvaluation }): ServedResponseBreach {
    const key = keyOf(event.evaluation);
    if (this.key !== key) {
      this.key = key;
      this.current = EMPTY;
    }
    const breach: ServedResponseBreach = Object.freeze({
      sequence: this.current.count + 1,
      evaluation: Object.freeze({ inputsDigest: event.evaluation.inputsDigest, asOf: event.evaluation.asOf }),
      limit: event.limit,
      declared: event.declared,
      observed: event.observed,
      population: Object.freeze({ ...event.population }),
    });
    this.current = Object.freeze({ count: breach.sequence, latest: breach });
    return breach;
  }
}
