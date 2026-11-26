import { describe, expect, it, vi } from 'vitest';

import { closedItemLanding, projectTrajectory, projectTrajectoryView, STATUS_TO_COLUMN, type TrajectoryProjection } from './trajectory-projection.js';
import { governingIntentUnknown, type WorkItemsObserved } from './work-items.js';

function itemsFixture(): WorkItemsObserved {
  return {
    kind: 'observed',
    beadPrefix: 'bu',
    provenance: { kind: 'dolt-revision', source: 'Beads Dolt database (bu)', revision: 'rev-1' },
    capturedAt: '2026-08-30T00:00:00Z',
    items: [
      { id: 'bu-1', status: 'open', issueType: 'task', priority: 1, createdAt: '2026-08-01T00:00:00Z', updatedAt: '2026-08-02T00:00:00Z', closedAt: null, governedBy: governingIntentUnknown(), title: { text: 'fixture title' } },
      { id: 'bu-2', status: 'in_progress', issueType: 'task', priority: 1, createdAt: '2026-08-03T00:00:00Z', updatedAt: '2026-08-04T00:00:00Z', closedAt: null, governedBy: governingIntentUnknown(), title: { text: 'fixture title' } },
      { id: 'bu-3', status: 'closed', issueType: 'task', priority: 1, createdAt: '2026-08-05T00:00:00Z', updatedAt: '2026-08-06T00:00:00Z', closedAt: '2026-08-06T00:00:00Z', governedBy: governingIntentUnknown(), title: { text: 'fixture title' } },
      { id: 'bu-4', status: 'closed', issueType: 'task', priority: 1, createdAt: '2026-07-01T00:00:00Z', updatedAt: '2026-07-02T00:00:00Z', closedAt: '2026-07-02T00:00:00Z', governedBy: governingIntentUnknown(), title: { text: 'fixture title' } },
    ],
    governedByUnknownCount: 4,
    titles: { policyId: 'work-item-title', policyVersion: '1.0.0', admitted: 4, withheld: 0, withheldByReason: { 'secret-matched': 0, 'active-content': 0, unclassifiable: 0 } },
  };
}

function recent(fixture: WorkItemsObserved, options: { nonClosedLimit: number; recentClosedWindow: number }): TrajectoryProjection {
  const view = projectTrajectoryView(projectTrajectory(fixture, options), fixture, {
    status: null, governingIntent: null, group: null, selection: 'recent', changed: null, page: 1,
  });
  if ('refused' in view) throw new Error('unreachable');
  return view;
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
    expect(projection.rendered.map((item) => item.id)).toEqual(['bu-1', 'bu-2']);
    expect(projection.grouping).toMatchObject({
      positions: 2,
      groups: [{ key: { kind: 'parent-unknown', reason: 'work-item-revision-unavailable' }, onPage: ['bu-1', 'bu-2'] }],
    });
    expect(projection.selectionRule).toContain('page 1 of 1 of the 2 observed items with a status other than closed, grouped by parent: 2 positions');
    // The entire observation remains available in its original order.
    expect(fixture.items.map((item) => item.id)).toEqual(['bu-4', 'bu-3', 'bu-2', 'bu-1']);
  });

  it('never renders activity/closure as verification satisfaction (POC-REQ-043)', () => {
    const projection = recent(itemsFixture(), { nonClosedLimit: 10, recentClosedWindow: 5 });
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
    // syzygy-t3jk.17: the measures run to the observation's capture instant,
    // never a clock; a later wall-clock time changes nothing.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2031-01-01T00:00:00Z'));
    try {
      expect(projectTrajectory(fixture, { nonClosedLimit: 10, recentClosedWindow: 5 })).toEqual(first);
    } finally {
      vi.useRealTimers();
    }
    expect(first.timeMeasures.measuredAt).toBe('2026-08-30T00:00:00Z');
    expect(first.timeMeasures.age).toEqual({ covered: 2, total: 2, medianHours: 648, p90Hours: 696 });
    expect('timeRange' in first).toBe(false);
  });

  it('answers the five questions over every served item, not the rendered selection (POC-REQ-044)', () => {
    // The outline renders two of four items; the answers count four.
    const projection = projectTrajectory(itemsFixture(), { nonClosedLimit: 10, recentClosedWindow: 1 });
    if (projection.kind !== 'observed') throw new Error('unreachable');
    expect(projection.renderedCount).toBe(2);
    expect(projection.answers).toEqual([
      { id: 'remains', state: 'observed', served: 4, byStatus: { open: 1, in_progress: 1, blocked: 0, deferred: 0, pinned: 0, hooked: 0, closed: 2 }, closedLanding: { state: 'unknown', disclosure: 'region:trajectory-commit-joins', closed: 2 } },
      { id: 'running', state: 'observed', claimed: 1, served: 4, liveness: 'activity-undetermined' },
      // syzygy-t3jk.21: no history supplied reads as not read, each window Unknown.
      { id: 'changed', state: 'observed', windows: [
        { window: 'day', kind: 'unknown', reason: 'history-not-read', disclosure: 'region:trajectory-changed' },
        { window: 'week', kind: 'unknown', reason: 'history-not-read', disclosure: 'region:trajectory-changed' },
        { window: 'since-last', kind: 'unknown', reason: 'no-previous-evaluation-recorded', disclosure: 'region:trajectory-changed' },
      ] },
      { id: 'cost', state: 'unknown', disclosure: 'region:trajectory-cost' },
      {
        id: 'intent',
        state: 'observed',
        unknownProvenance: { count: 4, served: 4, disclosure: 'region:work-item-governing-intent' },
        reconciliationChain: { members: 0, materialized: 0, memberEvidence: 'reconciliation-evidence-absent' },
        orphanedWork: { state: 'unknown', disclosure: 'region:trajectory-orphaned-work', served: 4 },
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
        const projection = recent(fixture, options);
        if (projection.kind !== 'observed') throw new Error('unreachable');
        expect(projection.rendered.map((item) => item.id), timezone).toEqual(expected);
        expect(recent({ ...fixture, items: [...items].reverse() }, options)).toEqual(projection);
      }
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

// POC-REQ-065 (syzygy-t3jk.26): closed items' landings from the commit join.
describe('closed landings (POC-REQ-065)', () => {
  const H = 'a'.repeat(40);
  const items = [
    { id: 'bu-1', status: 'closed' }, { id: 'bu-2', status: 'closed' }, { id: 'bu-3', status: 'open' },
  ] as const;
  const joins = (truncated: boolean) => ({
    kind: 'observed', revision: H, basis: 'naming-convention', fidelity: 'reduced-fidelity', cause: 'derived-from-convention',
    bound: 5000, read: 7, truncated, joined: 2, unjoined: 5,
    items: [{ id: 'bu-1', commits: [{ hash: H, at: '2026-11-26T00:00:00Z' }] }, { id: 'bu-3', commits: [{ hash: H, at: '2026-11-26T00:00:00Z' }] }],
  }) as const;

  it('derives each item\'s landing from the join and its status alone', () => {
    expect(items.map((item) => closedItemLanding(item, joins(false)))).toEqual(['merged-by-convention', 'no-naming-commit-read', null]);
    expect(items.map((item) => closedItemLanding(item, { kind: 'unknown', reason: 'commit-history-read-failed' }))).toEqual([null, null, null]);
  });

  it('counts the closed items merged by convention and those no read commit names, over every served item', () => {
    // itemsFixture: bu-3 and bu-4 closed; the join names bu-1 (open) and bu-3.
    const named = (truncated: boolean) => ({ ...joins(truncated), items: [{ id: 'bu-1', commits: [] }, { id: 'bu-3', commits: [] }] });
    const remains = (truncated: boolean) => {
      const projection = projectTrajectory(itemsFixture(), { nonClosedLimit: 10, recentClosedWindow: 1, commitJoins: named(truncated) });
      return projection.answers.find((answer) => answer.id === 'remains');
    };
    expect(remains(false)).toMatchObject({ closedLanding: { state: 'observed', closed: 2, mergedByConvention: 1, noNamingCommitRead: 1, basis: 'naming-convention', fidelity: 'reduced-fidelity', commitsRead: 7, historyTruncated: false } });
    expect(remains(true)).toMatchObject({ closedLanding: { historyTruncated: true } });
    const unknown = projectTrajectory(itemsFixture(), { nonClosedLimit: 10, recentClosedWindow: 1, commitJoins: { kind: 'unknown', reason: 'commit-history-malformed' } });
    expect(unknown.answers.find((answer) => answer.id === 'remains')).toMatchObject({ closedLanding: { state: 'unknown', disclosure: 'region:trajectory-commit-joins', closed: 2 } });
  });
});
