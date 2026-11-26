import { describe, expect, it } from 'vitest';

import { parseTrajectoryView, projectTrajectory, projectTrajectoryView, type TrajectoryProjection } from './trajectory-projection.js';
import { governingIntentUnknown, countWorkItemTitles, type WorkItemFact, type WorkItemsObserved } from './work-items.js';

// POC-REQ-042 (syzygy-t3jk.18). Expected values are literals or the test's
// own formula over the fixture, never the module under test.

const STATUSES = ['open', 'in_progress', 'blocked', 'deferred', 'pinned', 'hooked', 'closed'] as const;
const OBSERVED_GOVERNED = { label: 'Observed', reference: 'intent:x' } as unknown as WorkItemFact['governedBy'];

/** 640 items: ids bu-0000..bu-0639, status by i % 7, every third item governed (so not Unknown). */
function fixture(): WorkItemsObserved {
  const items: WorkItemFact[] = Array.from({ length: 640 }, (_, i) => ({
    id: `bu-${String(i).padStart(4, '0')}`,
    status: STATUSES[i % 7]!,
    issueType: 'task',
    priority: 2,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
    closedAt: i % 7 === 6 ? '2026-08-02T00:00:00Z' : null,
    governedBy: i % 3 === 0 ? OBSERVED_GOVERNED : governingIntentUnknown(),
    title: { text: 'fixture title' },
  }));
  return {
    kind: 'observed',
    beadPrefix: 'bu',
    provenance: { kind: 'dolt-revision', source: 'Beads Dolt database (bu)', revision: 'rev-1' },
    capturedAt: '2026-08-30T00:00:00Z',
    items: [...items].reverse(),
    governedByUnknownCount: items.filter((_, i) => i % 3 !== 0).length,
    titles: countWorkItemTitles(items),
  };
}

function base(workItems: WorkItemsObserved): TrajectoryProjection {
  return projectTrajectory(workItems, { nonClosedLimit: 200, recentClosedWindow: 50 });
}

function view(workItems: WorkItemsObserved, query: string) {
  const request = parseTrajectoryView(new URLSearchParams(query));
  if (request === null || 'refused' in request) throw new Error(`not a view: ${query}`);
  return projectTrajectoryView(base(workItems), workItems, request);
}

/** Every page of a view, until the last, collecting rendered ids. */
function allPages(workItems: WorkItemsObserved, query: string): string[] {
  const ids: string[] = [];
  for (let page = 1; ; page += 1) {
    const projection = view(workItems, `${query}${query === '' ? '' : '&'}page=${page}`);
    if ('refused' in projection) throw new Error('refused');
    if (projection.kind !== 'observed') throw new Error('unreachable');
    expect(projection.renderedCount + projection.excludedCount).toBe(projection.totalCount);
    ids.push(...projection.rendered.map((item) => item.id));
    if (page === projection.narrowing.view!.pageCount) return ids;
  }
}

describe('Trajectory views: narrowing by state, with paging (POC-REQ-042)', () => {
  it('reads no parameter as the default selection and a valid set as a view', () => {
    expect(parseTrajectoryView(new URLSearchParams(''))).toBeNull();
    expect(parseTrajectoryView(new URLSearchParams('status=blocked&governing-intent=unknown&page=2'))).toEqual({ status: 'blocked', governingIntent: 'unknown', group: null, changed: null, page: 2 });
    expect(parseTrajectoryView(new URLSearchParams('page=1'))).toEqual({ status: null, governingIntent: null, group: null, changed: null, page: 1 });
    expect(parseTrajectoryView(new URLSearchParams('status=open'))).toEqual({ status: 'open', governingIntent: null, group: null, changed: null, page: 1 });
    expect(parseTrajectoryView(new URLSearchParams('changed=week'))).toEqual({ status: null, governingIntent: null, group: 'parent', changed: 'week', page: 1 });
    expect(parseTrajectoryView(new URLSearchParams('selection=recent&changed=week'))).toEqual({ status: null, governingIntent: null, group: null, selection: 'recent', changed: 'week', page: 1 });
  });

  it('refuses a name, value or page outside the declared set, naming it and the allowed set', () => {
    const refusal = (query: string) => parseTrajectoryView(new URLSearchParams(query));
    expect(refusal('type=bug')).toEqual({ refused: 'trajectory-view-parameter', parameter: 'type', reason: 'unknown-parameter', allowed: ['status', 'governing-intent', 'group', 'selection', 'changed', 'page'] });
    expect(refusal('status=open&status=closed')).toEqual({ refused: 'trajectory-view-parameter', parameter: 'status', reason: 'repeated-parameter', allowed: ['status', 'governing-intent', 'group', 'selection', 'changed', 'page'] });
    expect(refusal('status=done')).toEqual({ refused: 'trajectory-view-parameter', parameter: 'status', reason: 'unknown-value', allowed: ['open', 'in_progress', 'blocked', 'deferred', 'pinned', 'hooked', 'closed'] });
    expect(refusal('governing-intent=known')).toEqual({ refused: 'trajectory-view-parameter', parameter: 'governing-intent', reason: 'unknown-value', allowed: ['unknown'] });
    expect(refusal('selection=all')).toEqual({ refused: 'trajectory-view-parameter', parameter: 'selection', reason: 'unknown-value', allowed: ['recent'] });
    for (const query of ['status=open', 'governing-intent=unknown', 'group=parent']) {
      expect(refusal(`selection=recent&${query}`)).toEqual({ refused: 'trajectory-view-parameter', parameter: 'selection', reason: 'incompatible-parameter', allowed: ['changed', 'page=1'] });
    }
    expect(view(fixture(), 'selection=recent&page=2')).toEqual({ refused: 'trajectory-view-parameter', parameter: 'page', reason: 'page-past-end', allowed: ['1 to 1'] });
    for (const page of ['0', '-1', '1.5', '01', 'two', '', '1e3']) {
      expect(refusal(`page=${page}`), page).toEqual({ refused: 'trajectory-view-parameter', parameter: 'page', reason: 'not-a-positive-integer', allowed: ['positive integer'] });
    }
    // A positive integer of any length is a page; past the last it is refused as such.
    expect(view(fixture(), 'page=99999999999')).toEqual({ refused: 'trajectory-view-parameter', parameter: 'page', reason: 'page-past-end', allowed: ['1 to 3'] });
    expect(view(fixture(), 'page=4')).toEqual({ refused: 'trajectory-view-parameter', parameter: 'page', reason: 'page-past-end', allowed: ['1 to 3'] });
    expect(view(fixture(), 'status=open&page=2')).toEqual({ refused: 'trajectory-view-parameter', parameter: 'page', reason: 'page-past-end', allowed: ['1 to 1'] });
  });

  it('renders the Unknown board for a well-formed view over an Unknown population', () => {
    const unknownBase = projectTrajectory({ kind: 'unknown', reason: 'db unreachable' }, { nonClosedLimit: 200, recentClosedWindow: 50 });
    expect(projectTrajectoryView(unknownBase, { kind: 'unknown', reason: 'db unreachable' }, { status: 'open', governingIntent: null, group: null, changed: null, page: 7 })).toBe(unknownBase);
  });

  it('puts every served item on exactly one page of the unnarrowed view, in ascending id (640 items, 3 pages)', () => {
    const workItems = fixture();
    const ids = allPages(workItems, '');
    expect(ids).toHaveLength(640);
    expect(new Set(ids).size).toBe(640);
    expect(ids).toEqual(Array.from({ length: 640 }, (_, i) => `bu-${String(i).padStart(4, '0')}`));
  });

  it('puts every item of each status on exactly one page of its status view', () => {
    const workItems = fixture();
    for (const [index, status] of STATUSES.entries()) {
      const expected = Array.from({ length: 640 }, (_, i) => i).filter((i) => i % 7 === index).map((i) => `bu-${String(i).padStart(4, '0')}`);
      expect(allPages(workItems, `status=${status}`), status).toEqual(expected);
    }
  });

  it('covers every item carrying the governing-intent Unknown, and only those', () => {
    const workItems = fixture();
    const expected = Array.from({ length: 640 }, (_, i) => i).filter((i) => i % 3 !== 0).map((i) => `bu-${String(i).padStart(4, '0')}`);
    const ids = allPages(workItems, 'governing-intent=unknown');
    expect(ids).toHaveLength(426);
    expect(ids).toEqual(expected);
  });

  it('states the view, its counts and what it leaves out, with the answers still over every item', () => {
    const workItems = fixture();
    const projection = view(workItems, 'status=closed&governing-intent=unknown&page=1');
    if ('refused' in projection || projection.kind !== 'observed') throw new Error('unreachable');
    // i % 7 === 6 over 0..639: 91 items; 31 of them (i % 21 === 6) are governed: 60.
    expect(projection.renderedCount).toBe(60);
    expect(projection.excludedCount).toBe(580);
    expect(projection.totalCount).toBe(640);
    expect(projection.selectionRule).toBe('page 1 of 1 of the 60 observed items with status closed and governing intent Unknown, 250 per page by ascending item id');
    expect(projection.narrowing).toEqual({
      parameters: { status: ['open', 'in_progress', 'blocked', 'deferred', 'pinned', 'hooked', 'closed'], 'governing-intent': ['unknown'], group: ['parent'], selection: ['recent'], changed: ['day', 'week', 'since-last'], page: 'positive integer' },
      defaultSelection: 'grouped-by-parent',
      recentLimits: { nonClosedLimit: 200, recentClosedWindow: 50 },
      changedDefault: 'day',
      pageSize: 250,
      order: 'ascending item id',
      groupedOrder: 'parent groups by ascending parent id, then parent-outside-tracker, parent-unobserved, no-parent and parent-unknown; items by ascending id within a group',
      groupedPageUnit: 'position',
      view: { status: 'closed', governingIntent: 'unknown', group: null, changed: null, page: 1, matching: 60, pageCount: 1 },
    });
    const defaultProjection = base(workItems);
    if (defaultProjection.kind !== 'observed') throw new Error('unreachable');
    expect(projection.answers).toEqual(defaultProjection.answers);
    expect(projection.timeMeasures).toEqual(defaultProjection.timeMeasures);
    expect(defaultProjection.narrowing.view).toEqual({ status: null, governingIntent: null, group: 'parent', changed: null, page: 1, matching: 549, pageCount: 3 });
    // A status with no item renders page 1 empty, never refused.
    const none = projectTrajectoryView(defaultProjection, { ...workItems, items: workItems.items.filter((item) => item.status !== 'pinned') }, { status: 'pinned', governingIntent: null, group: null, changed: null, page: 1 });
    if ('refused' in none || none.kind !== 'observed') throw new Error('unreachable');
    expect([none.renderedCount, none.narrowing.view]).toEqual([0, { status: 'pinned', governingIntent: null, group: null, changed: null, page: 1, matching: 0, pageCount: 1 }]);
  });
});
