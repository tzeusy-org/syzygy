import { describe, expect, it, vi } from 'vitest';

import { projectTrajectory, STATUS_TO_COLUMN } from './trajectory-projection.js';
import { governingIntentUnknown, workItemTitlesWithheld, type WorkItemsObserved } from './work-items.js';

function itemsFixture(): WorkItemsObserved {
  return {
    kind: 'observed',
    beadPrefix: 'bu',
    provenance: { kind: 'dolt-revision', source: 'Beads Dolt database (bu)', revision: 'rev-1' },
    capturedAt: '2026-08-30T00:00:00Z',
    items: [
      { id: 'bu-1', status: 'open', issueType: 'task', priority: 1, createdAt: '2026-08-01T00:00:00Z', updatedAt: '2026-08-02T00:00:00Z', closedAt: null, governedBy: governingIntentUnknown() },
      { id: 'bu-2', status: 'in_progress', issueType: 'task', priority: 1, createdAt: '2026-08-03T00:00:00Z', updatedAt: '2026-08-04T00:00:00Z', closedAt: null, governedBy: governingIntentUnknown() },
      { id: 'bu-3', status: 'closed', issueType: 'task', priority: 1, createdAt: '2026-08-05T00:00:00Z', updatedAt: '2026-08-06T00:00:00Z', closedAt: '2026-08-06T00:00:00Z', governedBy: governingIntentUnknown() },
      { id: 'bu-4', status: 'closed', issueType: 'task', priority: 1, createdAt: '2026-07-01T00:00:00Z', updatedAt: '2026-07-02T00:00:00Z', closedAt: '2026-07-02T00:00:00Z', governedBy: governingIntentUnknown() },
    ],
    governedByUnknownCount: 4,
    titles: workItemTitlesWithheld(),
  };
}

describe('Trajectory projection', () => {
  it('places every rendered item by its declared status-to-column mapping (POC-REQ-040)', () => {
    const projection = projectTrajectory(itemsFixture(), { nonClosedLimit: 10, recentClosedWindow: 1 });
    expect(projection.kind).toBe('observed');
    if (projection.kind !== 'observed') throw new Error('unreachable');
    for (const item of projection.rendered) {
      expect(item.column).toBe(STATUS_TO_COLUMN[item.status]);
    }
  });

  it('declares scope and reconciles rendered + excluded against the total (POC-REQ-042)', () => {
    const original = itemsFixture();
    const fixture = Object.freeze({
      ...original, provenance: Object.freeze({ ...original.provenance }),
      items: Object.freeze([...original.items].reverse().map((item) => Object.freeze({ ...item }))),
    });
    const projection = projectTrajectory(fixture, { nonClosedLimit: 1, recentClosedWindow: 1 });
    if (projection.kind !== 'observed') throw new Error('unreachable');
    expect(projection.renderedCount + projection.excludedCount).toBe(projection.totalCount);
    expect(projection.totalCount).toBe(4);
    expect(projection.renderedCount).toBe(2);
    expect(projection.excludedCount).toBe(2);
    expect(projection.rendered.map((item) => item.id)).toEqual(['bu-2', 'bu-3']);
    expect(projection.selectionRule).toBe('up to 1 most recently updated non-closed items, plus up to 1 most recently closed items; missing, invalid or timezone-less times last, timestamp ties and card order by ascending item id');
    // The shared observation remains complete; neither sorting nor capping mutates it.
    expect(fixture.items.map((item) => item.id)).toEqual(['bu-4', 'bu-3', 'bu-2', 'bu-1']);
  });

  it('never renders activity/closure as verification satisfaction (POC-REQ-043)', () => {
    const projection = projectTrajectory(itemsFixture(), { nonClosedLimit: 10, recentClosedWindow: 5 });
    if (projection.kind !== 'observed') throw new Error('unreachable');
    const closedItem = projection.rendered.find((item) => item.id === 'bu-3');
    expect(closedItem?.status).toBe('closed');
    expect(closedItem?.verification).toBe('unknown');
  });

  it('derives every temporal value from recorded instants, identical across two projections (POC-REQ-041)', () => {
    const fixture = itemsFixture();
    const first = projectTrajectory(fixture, { nonClosedLimit: 10, recentClosedWindow: 5 });
    const second = projectTrajectory(fixture, { nonClosedLimit: 10, recentClosedWindow: 5 });
    expect(second).toEqual(first);
    if (first.kind !== 'observed') throw new Error('unreachable');
    expect(first.timeRange).toEqual({ earliest: '2026-07-01T00:00:00Z', latest: '2026-08-06T00:00:00Z' });
  });

  it('answers the five questions over every served item, not the rendered selection (POC-REQ-044)', () => {
    // recentClosedWindow 1 renders three of four items; the answers count four.
    const projection = projectTrajectory(itemsFixture(), { nonClosedLimit: 10, recentClosedWindow: 1 });
    if (projection.kind !== 'observed') throw new Error('unreachable');
    expect(projection.renderedCount).toBe(3);
    expect(projection.answers).toEqual([
      { id: 'remains', state: 'observed', served: 4, byStatus: { open: 1, in_progress: 1, blocked: 0, deferred: 0, pinned: 0, hooked: 0, closed: 2 } },
      { id: 'running', state: 'observed', claimed: 1, served: 4, liveness: { state: 'unknown', disclosure: 'region:trajectory-running-liveness' } },
      { id: 'changed', state: 'unknown', disclosure: 'region:trajectory-changed' },
      { id: 'cost', state: 'unknown', disclosure: 'region:trajectory-cost' },
      {
        id: 'intent',
        state: 'observed',
        unknownProvenance: { count: 4, served: 4, disclosure: 'region:work-item-governing-intent' },
        reconciliationChain: { members: 0, memberEvidence: 'reconciliation-evidence-absent' },
        orphanedWork: { state: 'unknown', disclosure: 'region:trajectory-orphaned-work' },
      },
    ]);
  });

  it.each([
    ['nothing materialized', { materializedBeadId: null, workerChange: null }, 0],
    ['materialized, no commit yet', { materializedBeadId: 'bu-2', workerChange: { kind: 'observed', state: 'planned' } }, 0],
    ['materialized, commit off the default branch', { materializedBeadId: 'bu-2', workerChange: { kind: 'observed', state: 'active' } }, 0],
    ['materialized and on the default branch', { materializedBeadId: 'bu-2', workerChange: { kind: 'observed', state: 'changed-or-merged' } }, 1],
    ['materialized, worker change unobserved', { materializedBeadId: 'bu-2', workerChange: { kind: 'unknown' } }, { state: 'unknown', disclosure: 'region:trajectory-chain-membership' }],
  ] as const)('counts the reconciliation chain (RFC2-18): %s', (_name, reconciliationChain, members) => {
    const projection = projectTrajectory(itemsFixture(), { nonClosedLimit: 10, recentClosedWindow: 5, reconciliationChain });
    const intent = projection.answers.find((answer) => answer.id === 'intent');
    expect(intent).toMatchObject({ reconciliationChain: { members }, unknownProvenance: { count: 4 } });
  });

  it('propagates Unknown from the work-items observation', () => {
    const projection = projectTrajectory({ kind: 'unknown', reason: 'db unreachable' }, { nonClosedLimit: 10, recentClosedWindow: 5 });
    expect(projection).toEqual({
      kind: 'unknown',
      reason: 'db unreachable',
      answers: [
        { id: 'remains', state: 'unknown', disclosure: 'region:work-items' },
        { id: 'running', state: 'unknown', disclosure: 'region:work-items' },
        { id: 'changed', state: 'unknown', disclosure: 'region:work-items' },
        { id: 'cost', state: 'unknown', disclosure: 'region:work-items' },
        { id: 'intent', state: 'unknown', disclosure: 'region:work-items' },
      ],
    });
  });

  it.each([
    {
      name: 'newest updates, with offsets compared as instants', field: 'updatedAt', status: 'open',
      times: ['2026-08-01T00:00:00Z', '2026-08-03T01:00:00+02:00', '2026-08-03T00:00:00Z'],
      limit: 1, expected: ['bu-c'],
    },
    {
      name: 'update ties by ascending id', field: 'updatedAt', status: 'blocked',
      times: ['2026-08-02T00:00:00Z', '2026-08-02T00:00:00Z', '2026-08-02T00:00:00Z'],
      limit: 2, expected: ['bu-a', 'bu-b'],
    },
    {
      name: 'missing and invalid updates last, without substituting creation', field: 'updatedAt', status: 'deferred',
      times: ['', 'not-recorded', '2026-08-01T00:00:00Z'],
      limit: 2, expected: ['bu-a', 'bu-c'],
    },
    {
      name: 'timezone-less updates last on every host', field: 'updatedAt', status: 'open',
      times: ['2026-08-03T00:00:00', '2026-08-02T20:00:00Z', '2026-08-01T00:00:00Z'],
      limit: 1, expected: ['bu-b'],
    },
    {
      name: 'timezone-less closures last on every host', field: 'closedAt', status: 'closed',
      times: ['2026-08-03T00:00:00', '2026-08-02T20:00:00Z', '2026-08-01T00:00:00Z'],
      limit: 1, expected: ['bu-b'],
    },
    {
      name: 'impossible update dates last', field: 'updatedAt', status: 'open',
      times: ['2026-02-30T23:00:00Z', '2026-03-01T00:00:00Z', '2026-02-28T00:00:00Z'],
      limit: 1, expected: ['bu-b'],
    },
    {
      name: 'impossible closure dates last', field: 'closedAt', status: 'closed',
      times: ['2026-02-30T23:00:00Z', '2026-03-01T00:00:00Z', '2026-02-28T00:00:00Z'],
      limit: 1, expected: ['bu-b'],
    },
    {
      name: 'valid leap days and fractional precision', field: 'updatedAt', status: 'open',
      times: ['2024-02-29T00:00:00.000001Z', '2024-02-29T00:00:00.000002Z', '2023-02-29T00:00:00Z'],
      limit: 1, expected: ['bu-b'],
    },
    {
      name: 'closed ties and missing closure times', field: 'closedAt', status: 'closed',
      times: ['2026-08-01T00:00:00Z', '2026-08-01T00:00:00Z', null],
      limit: 1, expected: ['bu-a'],
    },
  ] as const)('selects $name independently of input order (POC-REQ-041/042)', ({ field, status, times, limit, expected }) => {
    const base = itemsFixture().items[0]!;
    const items = ['bu-a', 'bu-b', 'bu-c'].map((id, i) => ({
      ...base, id, status, createdAt: '2026-08-10T00:00:00Z',
      updatedAt: field === 'updatedAt' ? times[i] ?? '' : base.updatedAt,
      closedAt: field === 'closedAt' ? times[i] ?? null : null,
    }));
    const fixture: WorkItemsObserved = { ...itemsFixture(), items };
    const options = { nonClosedLimit: limit, recentClosedWindow: limit };
    try {
      for (const timezone of ['UTC', 'Asia/Singapore']) {
        vi.stubEnv('TZ', timezone);
        const projection = projectTrajectory(fixture, options);
        if (projection.kind !== 'observed') throw new Error('unreachable');
        expect(projection.rendered.map((item) => item.id), timezone).toEqual(expected);
        expect(projectTrajectory({ ...fixture, items: [...items].reverse() }, options)).toEqual(projection);
      }
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
