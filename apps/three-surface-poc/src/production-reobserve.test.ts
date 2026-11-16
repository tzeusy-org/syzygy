import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

import { describeReevaluation, evaluationClocks, evaluationIdentity, type PocEvaluationEvidence, type PocModel } from '@syzygy/three-surface-poc-core';
import { tempDir } from '@syzygy/test-kit';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createReobserveState } from './reobserve-state.js';
import { buildPocEvaluationEvidence, buildProductionPocModel, type PocRuntimeCapture } from './production-reobserve.js';
import { renderPolarisPage } from './polaris.js';
import { fixtureRepoWithGit } from './test-model-fixture.js';

const cleanups: string[] = [];
afterEach(() => {
  vi.useRealTimers();
  for (const directory of cleanups.splice(0)) rmSync(directory, { recursive: true, force: true });
});

const observerRoot = process.cwd();
const observerRevision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

function capture(
  repositoryRevision: string,
  asOf: string,
  changedSources: number,
  workingTreeDigest = 'working-tree-a',
): PocRuntimeCapture {
  const evidence: PocEvaluationEvidence = {
    pinnedRevision: repositoryRevision,
    pinnedCommitterInstant: '2026-08-24T00:00:00Z',
    observationInstant: asOf,
    probe: {
      claimId: 'claim:currency-probe',
      evaluationId: `evaluation:pwb-currency-probe:${asOf}`,
      evaluationInstant: asOf,
      epistemic: { label: 'Observed', tier: 'report-fact', challenge: 'unchallenged' },
      pinnedRevision: repositoryRevision,
      currentRevision: repositoryRevision,
      changedSources,
      addedSources: 0,
    },
    currencyBounds: [],
  };
  return {
    repositoryRevision,
    observerRevision,
    workingTreeDigest,
    evidence,
  };
}

function workItemQuery(_repoRoot: string, sql: string): string {
  return sql.includes('WHERE id LIKE') ? JSON.stringify([]) : JSON.stringify([{ revision: 'dolt-fixture-revision' }]);
}

function build(repoRoot: string, stateDir: string, nextCapture: PocRuntimeCapture): PocModel {
  return buildProductionPocModel({
    capture: nextCapture,
    repoRoot,
    stateDir,
    observerRoot,
    runWorkItemQuery: workItemQuery,
  });
}

// Each test below runs two full production builds (about 1.4 s each alone;
// the observer root is the real tree), so no cheaper fixture keeps what they
// test. Measured worst case 18.0 s under the parallel-load protocol
// (syzygy-4d15, docs/evidence/poc-test-timeouts-2026-10-03.json).
const PRODUCTION_BUILD_TIMEOUT_MS = 60_000;

describe('production-owned capture-to-model re-observation seam', () => {
  it('keeps the production probe identity bound to the captured observation instant', () => {
    const evidence = buildPocEvaluationEvidence(
      '2026-09-23T00:00:00Z',
      'revision-pinned',
      '2026-08-24T00:00:00Z',
      { currentRevision: 'revision-current', changedSources: 2, addedSources: 1 },
    );
    expect(evidence.probe.evaluationId).toBe('evaluation:pwb-currency-probe:2026-09-23T00:00:00Z');
    expect(evidence.probe.evaluationInstant).toBe(evidence.observationInstant);
    expect(evidence.probe.currentRevision).toBe('revision-current');
  });

  it('keeps served bytes and asOf stable when the same capture is rebuilt across wall-clock instants', () => {
    const fixture = fixtureRepoWithGit(cleanups);
    const stateDir = tempDir('syzygy-production-reobserve-state-');
    const observed = capture(fixture.revision, '2026-08-30T12:00:00Z', 0);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-22T00:00:00Z'));
    const first = build(fixture.repoRoot, stateDir, observed);
    vi.setSystemTime(new Date('2026-09-23T00:00:00Z'));
    const second = build(fixture.repoRoot, stateDir, observed);
    expect(second).toEqual(first);
    expect(second.evaluation.asOf).toBe('2026-08-30T12:00:00Z');
    expect(renderPolarisPage(second)).toBe(renderPolarisPage(first));
  }, PRODUCTION_BUILD_TIMEOUT_MS);

  it('uses the production builder for an atomic successful swap with identity advancement and one in-flight observation', async () => {
    const fixture = fixtureRepoWithGit(cleanups);
    const stateDir = tempDir('syzygy-production-reobserve-state-');
    const initialCapture = capture(fixture.revision, '2026-08-30T12:00:00Z', 0);
    const nextCapture = capture(fixture.revision, '2026-09-23T00:00:00Z', 3, 'working-tree-b');
    const initialModel = build(fixture.repoRoot, stateDir, initialCapture);
    let observeCalls = 0;
    let release!: (next: PocRuntimeCapture) => void;
    const pending = new Promise<PocRuntimeCapture>((resolve) => { release = resolve; });
    const state = createReobserveState<PocRuntimeCapture, PocModel>({
      capture: initialCapture,
      model: initialModel,
      observe: async () => { observeCalls += 1; return pending; },
      build: (next) => build(fixture.repoRoot, stateDir, next),
    });
    const first = state.reobserve();
    const second = state.reobserve();
    expect(observeCalls).toBe(1);
    expect(state.get().evaluation.asOf).toBe('2026-08-30T12:00:00Z');
    release(nextCapture);
    const [a, b] = await Promise.all([first, second]);
    expect(a).toEqual(b);
    expect(a.kind).toBe('reobserved');
    if (a.kind !== 'reobserved') throw new Error('expected successful production re-observation');
    expect(a.model.evaluation.asOf).toBe('2026-09-23T00:00:00Z');
    expect(a.model.evaluation.snapshot).not.toBe(initialModel.evaluation.snapshot);
    expect(a.model.evaluation.evidence.probe.evaluationId).toBe(nextCapture.evidence.probe.evaluationId);
    expect(a.model.evaluation.evidence.probe.changedSources).toBe(3);
    expect(state.get()).toBe(a.model);
    expect(state.getCapture()).toBe(nextCapture);
  }, PRODUCTION_BUILD_TIMEOUT_MS);

  it('re-evaluates an unchanged repository twice: two distinct named identities, the first result unchanged (syzygy-u05.2)', async () => {
    const fixture = fixtureRepoWithGit(cleanups);
    const stateDir = tempDir('syzygy-production-reobserve-state-');
    const captures = [
      capture(fixture.revision, '2026-10-03T01:00:00Z', 0),
      capture(fixture.revision, '2026-10-03T02:00:00Z', 0),
      capture(fixture.revision, '2026-10-03T03:00:00Z', 0, 'working-tree-b'),
    ];
    const models = captures.map((next) => build(fixture.repoRoot, stateDir, next));
    const observatory = { buildRevision: observerRevision, currentRevision: observerRevision, commitsSinceBuild: 0 };
    const named = (index: number) => ({ evaluation: evaluationIdentity(models[index] as PocModel), clocks: evaluationClocks(models[index] as PocModel, (captures[index] as PocRuntimeCapture).workingTreeDigest) });
    const initial = describeReevaluation({ prior: null, next: named(0), projectChange: null, observatory });
    const frozen = JSON.stringify(initial);
    const once = describeReevaluation({ prior: initial, next: named(1), projectChange: { changedSources: 0, addedSources: 0 }, observatory });
    const twice = describeReevaluation({ prior: once, next: named(2), projectChange: { changedSources: 0, addedSources: 0 }, observatory });
    // An unchanged repository keeps one snapshot; each re-evaluation is still its own identity.
    expect(models[0]?.evaluation.snapshot).toBe(models[1]?.evaluation.snapshot);
    expect(new Set([initial.evaluation, once.evaluation, twice.evaluation]).size).toBe(3);
    expect(once.supersedes).toBe(initial.evaluation);
    expect(twice.supersedes).toBe(once.evaluation);
    expect(JSON.stringify(initial)).toBe(frozen);
    expect(initial.evaluation.endsWith('|observed:2026-10-03T01:00:00Z')).toBe(true);
    expect(once.clocks).toEqual({ butlersHead: fixture.revision, workingTreeDigest: 'working-tree-a', doltRevision: 'dolt-fixture-revision' });
    expect(once.moved).toEqual({ butlersHead: 'unchanged', workingTreeDigest: 'unchanged', doltRevision: 'unchanged' });
    expect(twice.moved).toEqual({ butlersHead: 'unchanged', workingTreeDigest: 'moved', doltRevision: 'unchanged' });
  }, PRODUCTION_BUILD_TIMEOUT_MS); // this test: up to 8.5 s in 5 full-suite runs at load1 38-71, over the 5 s default in 3 of them; up to 1.6 s in 5 alone runs at load1 22-24 (docs/evidence/syzygy-bpyt-4-31/full-runs.json, docs/evidence/syzygy-bpyt-4-31/repair-durations/production-reobserve.test.tests.json)

  it('retains the prior production model and non-zero drift when the production build fails', async () => {
    const fixture = fixtureRepoWithGit(cleanups);
    const stateDir = tempDir('syzygy-production-reobserve-state-');
    const initialCapture = capture(fixture.revision, '2026-08-30T12:00:00Z', 7);
    const nextCapture = capture(fixture.revision, '2026-09-23T00:00:00Z', 0, 'working-tree-b');
    const initialModel = build(fixture.repoRoot, stateDir, initialCapture);
    const state = createReobserveState<PocRuntimeCapture, PocModel>({
      capture: initialCapture,
      model: initialModel,
      observe: async () => nextCapture,
      build: (next) => {
        build(fixture.repoRoot, stateDir, next);
        throw new Error('production model build failed');
      },
    });
    await expect(state.reobserve()).resolves.toEqual({ kind: 'failed', reason: 'production model build failed' });
    expect(state.get()).toBe(initialModel);
    expect(state.getCapture()).toBe(initialCapture);
    expect(state.get().evaluation.evidence.probe.changedSources).toBe(7);
  }, PRODUCTION_BUILD_TIMEOUT_MS);
});
