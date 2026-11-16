import { afterEach, describe, expect, it } from 'vitest';
import type { RouteContext } from '@syzygy/http-host';
import { describeReevaluation, type Reevaluation } from '@syzygy/three-surface-poc-core';

import { reobserveRoutes, REOBSERVE_HUMAN_PATH, type ReobserveResult } from './reobserve-action.js';

function reevaluation(evaluation: string, supersedes: string | null = 'evaluation:old'): Reevaluation {
  return describeReevaluation({
    prior: supersedes === null ? null : { evaluation: supersedes, clocks: { butlersHead: 'head-old', workingTreeDigest: 'tree-old', doltRevision: 'dolt-old' } },
    next: { evaluation, clocks: { butlersHead: 'head-new', workingTreeDigest: 'tree-old', doltRevision: null } },
    projectChange: { changedSources: 2, addedSources: 1 },
    observatory: { buildRevision: 'syzygy-build-revision', currentRevision: 'syzygy-later-revision', commitsSinceBuild: 4 },
  });
}

const cleanup: (() => void)[] = [];
afterEach(() => {
  for (const close of cleanup.splice(0)) close();
});

function route() {
  const candidate = reobserveRoutes({ reobserve: async () => ({ kind: 'reobserved', reevaluation: reevaluation('evaluation:new') }) }).find((item) => item.path === REOBSERVE_HUMAN_PATH);
  if (candidate === undefined) throw new Error('reobserve route missing');
  return candidate;
}

function context(headers: Record<string, string> = {}): RouteContext {
  return { request: { method: 'POST', path: REOBSERVE_HUMAN_PATH, query: new URLSearchParams(), headers } };
}

describe('human-triggered re-observation route', () => {
  it('single-flights concurrent requests and swaps only after a complete success', async () => {
    let calls = 0;
    let release!: (result: ReobserveResult) => void;
    const pending = new Promise<ReobserveResult>((resolve) => { release = resolve; });
    const candidate = reobserveRoutes({ reobserve: async () => { calls += 1; return pending; } }).find((item) => item.path === REOBSERVE_HUMAN_PATH);
    if (candidate === undefined) throw new Error('reobserve route missing');
    const first = candidate.handle(context({ host: '127.0.0.1:1' }));
    const second = candidate.handle(context({ host: '127.0.0.1:1' }));
    release({ kind: 'reobserved', reevaluation: reevaluation('evaluation:complete') });
    const [a, b] = await Promise.all([first, second]);
    expect(calls).toBe(1);
    expect(a).toMatchObject({ status: 200 });
    expect(b).toMatchObject({ status: 200 });
    expect(a.body).toContain('evaluation:complete');
  });

  it('preserves a named failure and refuses cross-origin requests', async () => {
    const candidate = reobserveRoutes({ reobserve: async () => ({ kind: 'failed', reason: 'observation refused' }) }).find((item) => item.path === REOBSERVE_HUMAN_PATH);
    if (candidate === undefined) throw new Error('reobserve route missing');
    const failure = await candidate.handle(context({ host: '127.0.0.1:1' }));
    expect(failure).toMatchObject({ status: 502 });
    expect(failure.body).toContain('observation refused');
    const refused = await candidate.handle(context({ host: 'poc.attacker.invalid', origin: 'http://poc.attacker.invalid' }));
    expect(refused).toMatchObject({ status: 403 });
  });

  it('names the superseded evaluation, the three clocks and both limbs on the result page (syzygy-u05.2)', async () => {
    const served = await route().handle(context({ host: '127.0.0.1:1' }));
    expect(served).toMatchObject({ status: 200 });
    expect(served.body).toContain('data-reobserve-evaluation="evaluation:new" data-reobserve-supersedes="evaluation:old"');
    const items = [...served.body.matchAll(/<li>([^<]*)<\/li>/g)].map((match) => match[1]);
    expect(items).toEqual([
      'Evaluation: evaluation:new',
      'Supersedes: evaluation:old',
      'Butlers HEAD: head-new (moved)',
      'Working-tree digest: tree-old (unchanged)',
      'Dolt revision: Unknown (work items not observed) (movement Unknown)',
      'Observed-project limb: 2 changed, 1 added since the superseded evaluation',
      'Observatory limb: 4 Syzygy commits since build syzygy-build…',
    ]);
  });

  it('refuses a request outside browserRequestAllowed before any re-observation runs', async () => {
    let calls = 0;
    const candidate = reobserveRoutes({ reobserve: async () => { calls += 1; return { kind: 'reobserved', reevaluation: reevaluation('evaluation:never') }; } }).find((item) => item.path === REOBSERVE_HUMAN_PATH);
    if (candidate === undefined) throw new Error('reobserve route missing');
    const refused = await candidate.handle(context({ host: '127.0.0.1:1', origin: 'http://poc.attacker.invalid' }));
    expect(refused).toEqual({ status: 403, contentType: 'application/json', body: '{"served":"nothing","reason":"browser-origin-refused"}' });
    expect(calls).toBe(0);
  });
});
