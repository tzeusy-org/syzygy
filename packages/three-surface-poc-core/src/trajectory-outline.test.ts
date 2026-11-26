import { describe, expect, it } from 'vitest';

import { parseTrajectoryView, projectTrajectory, projectTrajectoryView } from './trajectory-projection.js';
import { observeWorkItemDependencies } from './work-item-dependencies.js';
import { governingIntentUnknown, countWorkItemTitles, type WorkItemFact, type WorkItemsObserved, type WorkItemStatus } from './work-items.js';

// syzygy-t3jk.20 (POC-REQ-042 amended): the grouped view and the outline.
// Expected values are literals or the test's own formula over the fixture,
// never the module under test.

const REVISION = '0123456789abcdefghijklmnopqrstuv';

function item(id: string, status: WorkItemStatus): WorkItemFact {
  return {
    id,
    status,
    issueType: 'task',
    priority: 2,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
    closedAt: status === 'closed' ? '2026-08-02T00:00:00Z' : null,
    governedBy: governingIntentUnknown(),
    title: { text: 'fixture title' },
  };
}

function observed(items: readonly WorkItemFact[]): WorkItemsObserved {
  return {
    kind: 'observed',
    beadPrefix: 'bu',
    provenance: { kind: 'dolt-revision', source: 'Beads Dolt database (bu)', revision: REVISION },
    capturedAt: '2026-08-30T00:00:00Z',
    items,
    governedByUnknownCount: items.length,
    titles: countWorkItemTitles(items),
  };
}

interface Edge { readonly child: string; readonly parent: string | null; readonly external?: boolean }

function edgeRows(edges: readonly Edge[]): string {
  return JSON.stringify([
    ...edges.map((edge) => ({
      issue_id: edge.child, depends_on_issue_id: edge.parent, type: 'parent-child',
      has_external: edge.external === true ? 1 : 0, has_wisp: 0, revision: null,
    })),
    { issue_id: null, depends_on_issue_id: null, type: null, has_external: null, has_wisp: null, revision: REVISION },
  ]);
}

function project(workItems: WorkItemsObserved, edges: readonly Edge[] | 'unreadable') {
  const dependencies = observeWorkItemDependencies(workItems, () => {
    if (edges === 'unreadable') throw new Error('down');
    return edgeRows(edges);
  });
  return projectTrajectory(workItems, { nonClosedLimit: 200, recentClosedWindow: 50, dependencies });
}

function grouped(workItems: WorkItemsObserved, edges: readonly Edge[] | 'unreadable', query = 'group=parent') {
  const request = parseTrajectoryView(new URLSearchParams(query));
  if (request === null || 'refused' in request) throw new Error(`not a view: ${query}`);
  const view = projectTrajectoryView(project(workItems, edges), workItems, request);
  if ('refused' in view || view.kind !== 'observed' || view.grouping === undefined) throw new Error('not a grouped view');
  return { ...view, grouping: view.grouping };
}

/** Three deep (a > b > c), a two-parent item (d under a and x), a closed
 * parent with open children (x), a two-member cycle (f, g), a parent in
 * another tracker (h), an external parent (j), an in-prefix parent that is
 * not served (i), an orphan (a) and a closed child (k) the view leaves out. */
const ITEMS = [
  item('bu-a', 'open'), item('bu-b', 'open'), item('bu-c', 'open'), item('bu-d', 'open'),
  item('bu-e', 'blocked'), item('bu-f', 'open'), item('bu-g', 'open'), item('bu-h', 'open'),
  item('bu-i', 'open'), item('bu-j', 'open'), item('bu-k', 'closed'), item('bu-x', 'closed'),
];
const EDGES: readonly Edge[] = [
  { child: 'bu-b', parent: 'bu-a' }, { child: 'bu-c', parent: 'bu-b' },
  { child: 'bu-d', parent: 'bu-a' }, { child: 'bu-d', parent: 'bu-x' }, { child: 'bu-e', parent: 'bu-x' },
  { child: 'bu-f', parent: 'bu-g' }, { child: 'bu-g', parent: 'bu-f' },
  { child: 'bu-h', parent: 'other-1' }, { child: 'bu-i', parent: 'bu-zz' },
  { child: 'bu-j', parent: null, external: true }, { child: 'bu-k', parent: 'bu-a' },
];

describe('Trajectory outline: parents from parent-child rows (syzygy-t3jk.20)', () => {
  it('records each served parent, each class of unnamed parent and each cycle', () => {
    const base = project(observed(ITEMS), EDGES);
    if (base.kind !== 'observed') throw new Error('unreachable');
    expect(base.outline).toEqual({
      kind: 'observed',
      parents: {
        'bu-b': ['bu-a'], 'bu-c': ['bu-b'], 'bu-d': ['bu-a', 'bu-x'], 'bu-e': ['bu-x'],
        'bu-f': ['bu-g'], 'bu-g': ['bu-f'], 'bu-k': ['bu-a'],
      },
      outsideTracker: ['bu-h', 'bu-j'],
      unobserved: ['bu-i'],
      cycles: [['bu-f', 'bu-g']],
    });
  });

  it('names no parent outside the tracker by its identifier', () => {
    const base = project(observed(ITEMS), EDGES);
    expect(JSON.stringify(base)).not.toContain('other-1');
    expect(JSON.stringify(base)).not.toContain('bu-zz');
  });

  it('finds a self-parent and a long chain without exhausting the stack', () => {
    const chain = Array.from({ length: 20_000 }, (_, i) => item(`bu-${String(i).padStart(5, '0')}`, 'open'));
    const edges: Edge[] = chain.slice(1).map((child, i) => ({ child: child.id, parent: chain[i]!.id }));
    edges.push({ child: 'bu-00000', parent: 'bu-00000' });
    const base = project(observed(chain), edges);
    if (base.kind !== 'observed' || base.outline.kind !== 'observed') throw new Error('unreachable');
    expect(base.outline.cycles).toEqual([['bu-00000']]);
  });

  it('is Unknown with the feed reason when the rows are unread', () => {
    const base = project(observed(ITEMS), 'unreadable');
    if (base.kind !== 'observed') throw new Error('unreachable');
    expect(base.outline).toEqual({ kind: 'unknown', reason: 'dependency-read-failed' });
  });
});

describe('Trajectory grouped view (syzygy-t3jk.20)', () => {
  it('groups the non-closed items under each parent, then the four classes, in the declared order', () => {
    const view = grouped(observed(ITEMS), EDGES);
    expect(view.grouping.positions).toBe(11);
    expect(view.grouping.groups.map((group) => [group.anchor, group.total, group.onPage])).toEqual([
      ['group-p-bu-a', 2, ['bu-b', 'bu-d']],
      ['group-p-bu-b', 1, ['bu-c']],
      ['group-p-bu-f', 1, ['bu-g']],
      ['group-p-bu-g', 1, ['bu-f']],
      ['group-p-bu-x', 2, ['bu-d', 'bu-e']],
      ['group-parent-outside-tracker', 2, ['bu-h', 'bu-j']],
      ['group-parent-unobserved', 1, ['bu-i']],
      ['group-no-parent', 1, ['bu-a']],
    ]);
    expect(view.renderedCount).toBe(10);
    expect(view.renderedCount + view.excludedCount).toBe(12);
  });

  it('states each parent as recorded: status, where its card is, what it sits under and its cycle', () => {
    const view = grouped(observed(ITEMS), EDGES);
    const parent = (anchor: string) => view.grouping.groups.find((group) => group.anchor === anchor)?.parent;
    expect(parent('group-p-bu-x')).toEqual({ status: 'closed', cardPage: 1, under: [], cycle: null });
    expect(parent('group-p-bu-b')).toEqual({ status: 'open', cardPage: 1, under: [{ id: 'bu-a', groupPage: 1, cardPage: 1 }], cycle: null });
    expect(parent('group-p-bu-f')).toEqual({ status: 'open', cardPage: 1, under: [{ id: 'bu-g', groupPage: 1, cardPage: 1 }], cycle: { members: ['bu-f', 'bu-g'] } });
    expect(parent('group-p-bu-g')?.cycle).toEqual({ statedUnder: 'bu-f', page: 1 });
    expect(view.grouping.groups.find((group) => group.anchor === 'group-no-parent')?.parent).toBeUndefined();
  });

  it('links a grandparent with no group in this view to its card on the all-items page', () => {
    // 300 closed items push bu-zz-root's card to page 2 of the all-items view; bu-zz-mid is
    // closed, so the non-closed view has no group for bu-zz-root.
    const filler = Array.from({ length: 300 }, (_, i) => item(`bu-f${String(i).padStart(3, '0')}`, 'closed'));
    const items = [...filler, item('bu-zz-root', 'open'), item('bu-zz-mid', 'closed'), item('bu-zz-leaf', 'open')];
    const view = grouped(observed(items), [{ child: 'bu-zz-mid', parent: 'bu-zz-root' }, { child: 'bu-zz-leaf', parent: 'bu-zz-mid' }]);
    expect(view.grouping.groups.find((group) => group.anchor === 'group-p-bu-zz-mid')?.parent)
      .toEqual({ status: 'closed', cardPage: 2, under: [{ id: 'bu-zz-root', groupPage: null, cardPage: 2 }], cycle: null });
  });

  it('groups closed items only when the closed status is asked for', () => {
    const view = grouped(observed(ITEMS), EDGES, 'group=parent&status=closed');
    expect(view.grouping.groups.map((group) => [group.anchor, group.onPage])).toEqual([
      ['group-p-bu-a', ['bu-k']],
      ['group-no-parent', ['bu-x']],
    ]);
  });

  it('puts every item under parent-unknown, with the reason, when the rows are unread', () => {
    const view = grouped(observed(ITEMS), 'unreadable');
    expect(view.grouping.groups).toEqual([{
      key: { kind: 'parent-unknown', reason: 'dependency-read-failed' },
      anchor: 'group-parent-unknown',
      total: 10,
      onPage: ['bu-a', 'bu-b', 'bu-c', 'bu-d', 'bu-e', 'bu-f', 'bu-g', 'bu-h', 'bu-i', 'bu-j'],
      continuedFromPage: null,
      continuesOnPage: null,
    }]);
  });

  it('pages positions, marks a split group at both ends, and places each item once per parent (3 pages)', () => {
    // 600 open children: i % 3 picks parent p0, p1 or p2; every tenth also sits under p1.
    const parents = ['bu-p0', 'bu-p1', 'bu-p2'].map((id) => item(id, 'closed'));
    const children = Array.from({ length: 600 }, (_, i) => item(`bu-c${String(i).padStart(3, '0')}`, 'open'));
    const edges: Edge[] = children.flatMap((child, i) => {
      const own = `bu-p${i % 3}`;
      return i % 10 === 0 && own !== 'bu-p1' ? [{ child: child.id, parent: own }, { child: child.id, parent: 'bu-p1' }] : [{ child: child.id, parent: own }];
    });
    const workItems = observed([...parents, ...children]);

    // The test's own formula: positions per parent, ascending ids.
    const expected = new Map<string, string[]>();
    for (const edge of [...edges].sort((a, b) => (a.child < b.child ? -1 : 1))) {
      const list = expected.get(edge.parent!) ?? [];
      list.push(edge.child);
      expected.set(edge.parent!, list);
    }
    const positions = [...expected.values()].reduce((sum, list) => sum + list.length, 0);
    expect(positions).toBe(640);

    // The test's own placement: groups by parent id, each a contiguous run of positions.
    const starts = new Map<string, number>();
    let at = 0;
    for (const parent of [...expected.keys()].sort()) { starts.set(parent, at); at += expected.get(parent)!.length; }

    const seen = new Map<string, string[]>();
    for (let page = 1; page <= 3; page++) {
      const view = grouped(workItems, edges, `group=parent&page=${page}`);
      expect(view.narrowing.view?.pageCount).toBe(3);
      expect(view.grouping.positions).toBe(640);
      expect(view.renderedCount + view.excludedCount).toBe(603);
      const [pageStart, pageEnd] = [(page - 1) * 250, page * 250];
      const expectedHere = [...starts].filter(([parent, start]) => start < pageEnd && start + expected.get(parent)!.length > pageStart).map(([parent]) => `group-p-${parent}`);
      expect(view.grouping.groups.map((group) => group.anchor)).toEqual(expectedHere);
      for (const group of view.grouping.groups) {
        const parent = group.anchor.slice('group-p-'.length);
        const start = starts.get(parent)!;
        const end = start + expected.get(parent)!.length;
        seen.set(parent, [...(seen.get(parent) ?? []), ...group.onPage]);
        expect(group.total).toBe(expected.get(parent)!.length);
        expect([group.continuedFromPage, group.continuesOnPage], `${group.anchor} on page ${page}`)
          .toEqual([start < pageStart ? page - 1 : null, end > pageEnd ? page + 1 : null]);
      }
    }
    expect(Object.fromEntries(seen)).toEqual(Object.fromEntries(expected));
    expect(() => grouped(workItems, edges, 'group=parent&page=4')).toThrow('not a grouped view');
  });

  it('marks a group spanning three pages at both ends of its middle page', () => {
    const parent = item('bu-big', 'closed');
    const children = Array.from({ length: 600 }, (_, i) => item(`bu-k${String(i).padStart(3, '0')}`, 'open'));
    const edges = children.map((child) => ({ child: child.id, parent: 'bu-big' }));
    const middle = grouped(observed([parent, ...children]), edges, 'group=parent&page=2');
    expect(middle.grouping.groups.map((group) => [group.anchor, group.total, group.onPage.length, group.continuedFromPage, group.continuesOnPage]))
      .toEqual([['group-p-bu-big', 600, 250, 1, 3]]);
  });

  it('keeps an item named like a group class apart from that class', () => {
    // `no-parent` is a valid item id under the prefix `no`.
    const items = [item('no-parent', 'open'), item('no-a', 'open'), item('no-b', 'open')];
    const workItems = { ...observed(items), beadPrefix: 'no', provenance: { kind: 'dolt-revision' as const, source: 'Beads Dolt database (no)', revision: REVISION } };
    const view = grouped(workItems, [{ child: 'no-a', parent: 'no-parent' }]);
    expect(view.grouping.groups.map((group) => [group.anchor, group.onPage])).toEqual([
      ['group-p-no-parent', ['no-a']],
      ['group-no-parent', ['no-b', 'no-parent']],
    ]);
  });

  it('declares the grouped order and that its pages count positions', () => {
    const view = grouped(observed(ITEMS), EDGES);
    expect([view.narrowing.groupedOrder, view.narrowing.groupedPageUnit]).toEqual([
      'parent groups by ascending parent id, then parent-outside-tracker, parent-unobserved, no-parent and parent-unknown; items by ascending id within a group',
      'position',
    ]);
  });

  it('refuses a group value outside the declared set', () => {
    expect(parseTrajectoryView(new URLSearchParams('group=status'))).toEqual({
      refused: 'trajectory-view-parameter', parameter: 'group', reason: 'unknown-value', allowed: ['parent'],
    });
  });
});
