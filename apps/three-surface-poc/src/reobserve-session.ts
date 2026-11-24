import type { Readable, Writable } from 'node:stream';

import {
  describeReevaluation,
  evaluationClocks,
  evaluationIdentity,
  type ObservatoryLimb,
  type PocModel,
  type Reevaluation,
} from '@syzygy/three-surface-poc-core';

import type { GitHorizonObservation } from './git-observation.js';
import type { PocRuntimeCapture } from './production-reobserve.js';
import type { ReobserveResult } from './reobserve-action.js';
import { createReobserveState } from './reobserve-state.js';
import { attachWatchMode } from './watch-mode.js';

// The daemon's re-evaluation session (syzygy-u05.2; extracted from main.ts
// by syzygy-5oi3 so its wiring is unit-tested). It owns the served model,
// its capture and the latest named re-evaluation, and keeps them moving
// together: a re-observation and a post-materialize rebuild each mint a new
// named re-evaluation that supersedes the one before. Every trigger is a
// human act (P-69); nothing here schedules, polls or watches.

// Test seam: exported type the tests name; production code uses it only inside this file.
export interface ReobserveSessionOptions {
  readonly capture: PocRuntimeCapture;
  readonly build: (capture: PocRuntimeCapture) => PocModel;
  /** A full re-observation: repository, observer and horizon. */
  readonly observe: () => Promise<PocRuntimeCapture>;
  /** Called after a complete re-observation replaces the served evaluation. */
  readonly onReobserved?: () => void;
  /** The current head compared with a pinned revision, metadata only. */
  readonly observeHorizon: (pinnedRevision: string) => Pick<GitHorizonObservation, 'currentRevision' | 'changedSources' | 'addedSources'>;
  readonly observeRevisionChange: (fromRevision: string, toRevision: string) => { readonly changedSources: number; readonly addedSources: number } | null;
  readonly observeObservatory: () => ObservatoryLimb;
  /** The observation instant of a rebuild; read once per human trigger. */
  readonly now: () => string;
}

interface ReobserveSession {
  readonly model: () => PocModel;
  readonly latest: () => Reevaluation;
  /** One owner request at a time, from the browser or the console. */
  readonly reobserve: () => Promise<ReobserveResult>;
  /** Rebuild after a materialize wrote state: same repository revision, a
   * new observation instant, so a new named evaluation. */
  readonly afterMaterialized: () => void;
  /** Attach the Enter-driven console when, and only when, enabled. */
  readonly startConsole: (enabled: boolean, io: { readonly input: Readable; readonly output: Writable }) => Promise<void> | undefined;
}

export function createReobserveSession(options: ReobserveSessionOptions): ReobserveSession {
  const state = createReobserveState<PocRuntimeCapture, PocModel>({
    capture: options.capture,
    model: options.build(options.capture),
    observe: options.observe,
    build: options.build,
  });
  const reevaluate = (prior: Reevaluation | null, current: PocModel, capture: PocRuntimeCapture): Reevaluation => describeReevaluation({
    prior,
    next: { evaluation: evaluationIdentity(current), clocks: evaluationClocks(current, capture.workingTreeDigest) },
    projectChange: prior === null ? null : options.observeRevisionChange(prior.clocks.butlersHead, current.project.revision),
    observatory: options.observeObservatory(),
  });
  let latest = reevaluate(null, state.get(), state.getCapture());
  let reobserving: Promise<ReobserveResult> | undefined;

  const reobserve = (): Promise<ReobserveResult> => reobserving ?? (reobserving = (async (): Promise<ReobserveResult> => {
    const result = await state.reobserve();
    if (result.kind === 'failed') return result;
    try {
      latest = reevaluate(latest, result.model, state.getCapture());
    } catch (cause) {
      return { kind: 'failed', reason: cause instanceof Error ? cause.message : 'the re-evaluation could not be named' };
    }
    options.onReobserved?.();
    return { kind: 'reobserved', reevaluation: latest };
  })().finally(() => { reobserving = undefined; }));

  const afterMaterialized = (): void => {
    const prior = state.getCapture();
    const at = options.now();
    const horizon = options.observeHorizon(prior.repositoryRevision);
    const capture: PocRuntimeCapture = {
      ...prior,
      evidence: {
        ...prior.evidence,
        observationInstant: at,
        probe: {
          ...prior.evidence.probe,
          evaluationId: `evaluation:pwb-currency-probe:${at}`,
          evaluationInstant: at,
          currentRevision: horizon.currentRevision,
          changedSources: horizon.changedSources,
          addedSources: horizon.addedSources,
        },
      },
    };
    const model = options.build(capture);
    const next = reevaluate(latest, model, capture);
    state.replace(capture, model);
    latest = next;
  };

  return {
    model: () => state.get(),
    latest: () => latest,
    reobserve,
    afterMaterialized,
    startConsole: (enabled, io) => (enabled ? attachWatchMode({ ...io, reobserve }) : undefined),
  };
}
