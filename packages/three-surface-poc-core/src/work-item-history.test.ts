import { describe, expect, it } from 'vitest';

import { observeWorkItemChanges, type ChangeWindowObservation } from './work-item-history.js';
import { countWorkItemTitles, type WorkItemsObserved } from './work-items.js';

// syzygy-t3jk.21. Expected values are literals, never the module under test.

const REVISION = '0123456789abcdefghijklmnopqrstuv';
const DAY_FROM = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const WEEK_FROM = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

function workItems(overrides: Partial<WorkItemsObserved> = {}): WorkItemsObserved {
  return {
    kind: 'observed',
    beadPrefix: 'bu',
    provenance: { kind: 'dolt-revision', source: 'Beads Dolt database (bu)', revision: REVISION },
    capturedAt: '2026-08-31T12:00:00Z',
    items: [],
    governedByUnknownCount: 0,
    titles: countWorkItemTitles([]),
    ...overrides,
  };
}

const bounds = (overrides: Record<string, unknown> = {}) => ({
  revision: REVISION, revision_at: '2026-08-31T11:59:00.000Z',
  day_from: DAY_FROM, day_at: '2026-08-30T11:00:00.000Z',
  week_from: WEEK_FROM, week_at: '2026-08-24T09:00:00.000Z',
  ...overrides,
});
const row = (w: string, diff_type: string, from_id: string | null, to_id: string | null, from_status: string | null, to_status: string | null) =>
  ({ w, diff_type, from_id, to_id, from_status, to_status, n: null });
const tally = (w: string, diff_type: string, n: number) => ({ w, diff_type, from_id: null, to_id: null, from_status: null, to_status: null, n });
/** A window's three counts: outside-prefix rows, and the linearity checks (merges, inverted dates). */
const outside = (w: string, n: number, merges = 0, inverted = 0) => [tally(w, 'outside-prefix', n), tally(w, 'merges', merges), tally(w, 'inverted', inverted)];

const DAY_ROWS = [
  row('day', 'added', null, 'bu-new', null, 'open'),
  row('day', 'added', null, 'bu-done-new', null, 'closed'),
  row('day', 'modified', 'bu-shut', 'bu-shut', 'in_progress', 'closed'),
  row('day', 'modified', 'bu-back', 'bu-back', 'closed', 'open'),
  row('day', 'modified', 'bu-move', 'bu-move', 'open', 'blocked'),
  row('day', 'modified', 'bu-touch', 'bu-touch', 'open', 'open'),
  row('day', 'removed', 'bu-gone', null, 'deferred', null),
  ...outside('day', 3),
];
const WEEK_ROWS = [row('week', 'modified', 'bu-shut', 'bu-shut', 'open', 'closed'), ...outside('week', 0)];

function run(responses: { bounds?: () => string; diff?: () => string }, input: WorkItemsObserved = workItems()) {
  const calls: string[] = [];
  const windows = observeWorkItemChanges(input, (sql) => {
    calls.push(sql);
    if (sql.includes('dolt_diff(')) return (responses.diff ?? (() => JSON.stringify([...DAY_ROWS, ...WEEK_ROWS])))();
    return (responses.bounds ?? (() => JSON.stringify([bounds()])))();
  });
  return { windows, calls };
}

const unknownWindows = (reason: string): ChangeWindowObservation[] => [
  { window: 'day', kind: 'unknown', reason } as ChangeWindowObservation,
  { window: 'week', kind: 'unknown', reason } as ChangeWindowObservation,
  { window: 'since-last', kind: 'unknown', reason: 'no-previous-evaluation-recorded' },
];

describe('what changed, between two named revisions (syzygy-t3jk.21)', () => {
  it('classifies each changed item per window, counting what it does not list', () => {
    const { windows } = run({});
    expect(windows).toEqual([
      {
        window: 'day', kind: 'observed',
        from: { revision: DAY_FROM, at: '2026-08-30T11:00:00.000Z' },
        to: { revision: REVISION, at: '2026-08-31T11:59:00.000Z' },
        counts: { added: 2, closed: 1, reopened: 1, 're-stated': 1, removed: 1 },
        facts: [
          { id: 'bu-back', kind: 'reopened', from: 'closed', to: 'open' },
          { id: 'bu-done-new', kind: 'added', from: null, to: 'closed' },
          { id: 'bu-gone', kind: 'removed', from: 'deferred', to: null },
          { id: 'bu-move', kind: 're-stated', from: 'open', to: 'blocked' },
          { id: 'bu-new', kind: 'added', from: null, to: 'open' },
          { id: 'bu-shut', kind: 'closed', from: 'in_progress', to: 'closed' },
        ],
        updatedWithoutStatusChange: 1,
        outsidePrefix: 3,
      },
      {
        window: 'week', kind: 'observed',
        from: { revision: WEEK_FROM, at: '2026-08-24T09:00:00.000Z' },
        to: { revision: REVISION, at: '2026-08-31T11:59:00.000Z' },
        counts: { added: 0, closed: 1, reopened: 0, 're-stated': 0, removed: 0 },
        facts: [{ id: 'bu-shut', kind: 'closed', from: 'open', to: 'closed' }],
        updatedWithoutStatusChange: 0,
        outsidePrefix: 0,
      },
      { window: 'since-last', kind: 'unknown', reason: 'no-previous-evaluation-recorded' },
    ]);
  });

  it('pins both statements to the observed revision and names only id, status and date columns', () => {
    const { calls } = run({});
    expect(calls).toHaveLength(2);
    expect(calls[0]).toBe(
      `SELECT dolt_hashof('${REVISION}') AS revision, (SELECT date FROM dolt_log('${REVISION}') WHERE commit_hash = '${REVISION}') AS revision_at, ` +
      `(SELECT commit_hash FROM dolt_log('${REVISION}') WHERE date <= '2026-08-30 12:00:00.000' ORDER BY date DESC, commit_hash ASC LIMIT 1) AS day_from, ` +
      `(SELECT date FROM dolt_log('${REVISION}') WHERE date <= '2026-08-30 12:00:00.000' ORDER BY date DESC, commit_hash ASC LIMIT 1) AS day_at, ` +
      `(SELECT commit_hash FROM dolt_log('${REVISION}') WHERE date <= '2026-08-24 12:00:00.000' ORDER BY date DESC, commit_hash ASC LIMIT 1) AS week_from, ` +
      `(SELECT date FROM dolt_log('${REVISION}') WHERE date <= '2026-08-24 12:00:00.000' ORDER BY date DESC, commit_hash ASC LIMIT 1) AS week_at`,
    );
    const inPrefix = "(COALESCE(from_id, '') LIKE 'bu-%' OR COALESCE(to_id, '') LIKE 'bu-%')";
    expect(calls[1]).toBe([
      `SELECT 'day' AS w, diff_type, from_id, to_id, from_status, to_status, NULL AS n FROM dolt_diff('${DAY_FROM}', '${REVISION}', 'issues') WHERE ${inPrefix}`,
      `SELECT 'day', 'outside-prefix', NULL, NULL, NULL, NULL, COUNT(*) FROM dolt_diff('${DAY_FROM}', '${REVISION}', 'issues') WHERE NOT ${inPrefix}`,
      `SELECT 'day', 'merges', NULL, NULL, NULL, NULL, COUNT(*) FROM dolt_commit_ancestors WHERE parent_index > 0 AND commit_hash IN (SELECT commit_hash FROM dolt_log('${REVISION}')) AND commit_hash NOT IN (SELECT commit_hash FROM dolt_log('${DAY_FROM}'))`,
      `SELECT 'day', 'inverted', NULL, NULL, NULL, NULL, COUNT(*) FROM dolt_log('${REVISION}') WHERE (date > '2026-08-30 12:00:00.000' AND commit_hash IN (SELECT commit_hash FROM dolt_log('${DAY_FROM}'))) OR (date <= '2026-08-30 12:00:00.000' AND commit_hash NOT IN (SELECT commit_hash FROM dolt_log('${DAY_FROM}')))`,
      `SELECT 'week' AS w, diff_type, from_id, to_id, from_status, to_status, NULL AS n FROM dolt_diff('${WEEK_FROM}', '${REVISION}', 'issues') WHERE ${inPrefix}`,
      `SELECT 'week', 'outside-prefix', NULL, NULL, NULL, NULL, COUNT(*) FROM dolt_diff('${WEEK_FROM}', '${REVISION}', 'issues') WHERE NOT ${inPrefix}`,
      `SELECT 'week', 'merges', NULL, NULL, NULL, NULL, COUNT(*) FROM dolt_commit_ancestors WHERE parent_index > 0 AND commit_hash IN (SELECT commit_hash FROM dolt_log('${REVISION}')) AND commit_hash NOT IN (SELECT commit_hash FROM dolt_log('${WEEK_FROM}'))`,
      `SELECT 'week', 'inverted', NULL, NULL, NULL, NULL, COUNT(*) FROM dolt_log('${REVISION}') WHERE (date > '2026-08-24 12:00:00.000' AND commit_hash IN (SELECT commit_hash FROM dolt_log('${WEEK_FROM}'))) OR (date <= '2026-08-24 12:00:00.000' AND commit_hash NOT IN (SELECT commit_hash FROM dolt_log('${WEEK_FROM}')))`,
    ].join(' UNION ALL '));
    // SEC-5: no free-text or person column is named by either statement.
    for (const sql of calls) expect(sql).not.toMatch(/\b(title|description|notes|message|committer|email|author|created_by|metadata)\b/i);
  });

  it('states a window older than the retained history as Unknown, never zero', () => {
    const { windows, calls } = run({
      bounds: () => JSON.stringify([bounds({ week_from: null, week_at: null })]),
      diff: () => JSON.stringify(DAY_ROWS),
    });
    expect(windows.map((window) => [window.window, window.kind, window.kind === 'unknown' ? window.reason : window.facts.length]))
      .toEqual([['day', 'observed', 6], ['week', 'unknown', 'history-shorter-than-window'], ['since-last', 'unknown', 'no-previous-evaluation-recorded']]);
    expect(calls[1]).not.toContain("'week'");
  });

  it('runs no diff when no window has a start, and reads an observed zero as zero', () => {
    const none = run({ bounds: () => JSON.stringify([bounds({ day_from: null, day_at: null, week_from: null, week_at: null })]) });
    expect(none.calls).toHaveLength(1);
    expect(none.windows.map((window) => window.kind === 'unknown' ? window.reason : 'observed')).toEqual(['history-shorter-than-window', 'history-shorter-than-window', 'no-previous-evaluation-recorded']);
    const zero = run({ diff: () => JSON.stringify([...outside('day', 0), ...outside('week', 0)]) });
    expect(zero.windows[0]).toMatchObject({ kind: 'observed', facts: [], counts: { added: 0, closed: 0, reopened: 0, 're-stated': 0, removed: 0 } });
  });

  it('retains valid Dolt UTC instants at full microsecond precision', () => {
    const { windows, calls } = run({ bounds: () => JSON.stringify([bounds({
      revision_at: '2026-08-31T11:59:00.123456Z',
      day_at: '2026-08-30T12:00:00Z',
    })]) });
    expect(calls).toHaveLength(2);
    expect(windows[0]).toMatchObject({
      kind: 'observed',
      from: { at: '2026-08-30T12:00:00Z' },
      to: { at: '2026-08-31T11:59:00.123456Z' },
    });
  });

  it.each([
    [{ revision_at: '2026-08-31' }, 'history-revision-unverified'],
    [{ revision_at: '2026-08-31T12:00:00.000001Z' }, 'history-revision-unverified'],
    [{ day_at: '2026-02-30T10:00:00Z' }, 'history-result-malformed'],
    [{ day_at: '2026-08-30T12:00:00.000001Z' }, 'history-result-malformed'],
  ])('stops before diffing when a returned date is malformed or crosses its bound (%j)', (overrides, reason) => {
    const { windows, calls } = run({ bounds: () => JSON.stringify([bounds(overrides)]) });
    expect(windows).toEqual(unknownWindows(reason));
    expect(calls).toHaveLength(1);
  });

  it.each([
    ['the bounds read throws', { bounds: () => { throw new Error('down'); } }, 'history-read-failed'],
    ['the diff read throws', { diff: () => { throw new Error('down'); } }, 'history-read-failed'],
    ['bounds are not JSON', { bounds: () => 'nope' }, 'history-result-malformed'],
    ['bounds carry an extra column', { bounds: () => JSON.stringify([{ ...bounds(), message: 'sample text' }]) }, 'history-result-malformed'],
    ['two bound rows', { bounds: () => JSON.stringify([bounds(), bounds()]) }, 'history-result-malformed'],
    ['another revision answers', { bounds: () => JSON.stringify([bounds({ revision: DAY_FROM })]) }, 'history-revision-unverified'],
    ['the revision has no commit date', { bounds: () => JSON.stringify([bounds({ revision_at: null })]) }, 'history-revision-unverified'],
    ['a start is not a revision', { bounds: () => JSON.stringify([bounds({ day_from: 'HEAD~1' })]) }, 'history-result-malformed'],
    // The diff answers only for the intact window, so a half-read start cannot pass as a short history.
    ['a start without its instant', { bounds: () => JSON.stringify([bounds({ day_at: null })]), diff: () => JSON.stringify(WEEK_ROWS) }, 'history-result-malformed'],
    ['an instant without its start', { bounds: () => JSON.stringify([bounds({ week_from: null })]), diff: () => JSON.stringify(DAY_ROWS) }, 'history-result-malformed'],
    ['a diff row names another prefix', { diff: () => JSON.stringify([row('day', 'added', null, 'other-1', null, 'open'), ...outside('day', 0), ...WEEK_ROWS]) }, 'history-result-malformed'],
    ['a diff row carries an unknown status', { diff: () => JSON.stringify([row('day', 'modified', 'bu-a', 'bu-a', 'open', 'done'), ...outside('day', 0), ...WEEK_ROWS]) }, 'history-result-malformed'],
    ['a diff row names an unknown window', { diff: () => JSON.stringify([...DAY_ROWS, ...WEEK_ROWS, ...outside('month', 0)]) }, 'history-result-malformed'],
    ['a window lacks its outside count', { diff: () => JSON.stringify([...DAY_ROWS, WEEK_ROWS[0], tally('week', 'merges', 0), tally('week', 'inverted', 0)]) }, 'history-result-malformed'],
    ['a window lacks its merge count', { diff: () => JSON.stringify([...DAY_ROWS, WEEK_ROWS[0], tally('week', 'outside-prefix', 0), tally('week', 'inverted', 0)]) }, 'history-result-malformed'],
    ['a count is repeated', { diff: () => JSON.stringify([...DAY_ROWS, ...WEEK_ROWS, tally('week', 'merges', 0)]) }, 'history-result-malformed'],
    ['a count is not an integer', { diff: () => JSON.stringify([...DAY_ROWS, WEEK_ROWS[0], tally('week', 'outside-prefix', 1.5), tally('week', 'merges', 0), tally('week', 'inverted', 0)]) }, 'history-result-malformed'],
    ['a count row names an item', { diff: () => JSON.stringify([...DAY_ROWS, WEEK_ROWS[0], { ...tally('week', 'outside-prefix', 0), to_id: 'bu-x' }, tally('week', 'merges', 0), tally('week', 'inverted', 0)]) }, 'history-result-malformed'],
    ['an added row has a start id', { diff: () => JSON.stringify([row('day', 'added', 'bu-a', 'bu-a', null, 'open'), ...outside('day', 0), ...WEEK_ROWS]) }, 'history-result-malformed'],
    ['a removed row keeps a status', { diff: () => JSON.stringify([row('day', 'removed', 'bu-a', null, 'open', 'open'), ...outside('day', 0), ...WEEK_ROWS]) }, 'history-result-malformed'],
    ['a diff row carries an extra column', { diff: () => JSON.stringify([{ ...row('day', 'added', null, 'bu-a', null, 'open'), title: 'sample text' }, ...outside('day', 0), ...WEEK_ROWS]) }, 'history-result-malformed'],
    ['an unknown diff type', { diff: () => JSON.stringify([row('day', 'renamed', 'bu-a', 'bu-a', 'open', 'closed'), ...outside('day', 0), ...WEEK_ROWS]) }, 'history-result-malformed'],
    ['an item appears twice in a window', { diff: () => JSON.stringify([...DAY_ROWS, DAY_ROWS[0], ...WEEK_ROWS]) }, 'history-result-malformed'],
    ['a modified row changes its id', { diff: () => JSON.stringify([row('day', 'modified', 'bu-a', 'bu-b', 'open', 'closed'), ...outside('day', 0), ...WEEK_ROWS]) }, 'history-result-malformed'],
  ])('reads every timed window as Unknown when %s, never a partial count', (_case, responses, reason) => {
    expect(run(responses).windows).toEqual(unknownWindows(reason));
  });

  it('states a window whose history is not one line as Unknown (R-T6S1-CHANGES-1 F1)', () => {
    const merged = run({ diff: () => JSON.stringify([...DAY_ROWS.slice(0, -3), ...outside('day', 3, 1, 0), ...WEEK_ROWS]) });
    expect(merged.windows.map((window) => window.kind === 'unknown' ? window.reason : 'observed')).toEqual(['history-non-linear', 'observed', 'no-previous-evaluation-recorded']);
    const inverted = run({ diff: () => JSON.stringify([...DAY_ROWS, WEEK_ROWS[0], ...outside('week', 0, 0, 2)]) });
    expect(inverted.windows.map((window) => window.kind === 'unknown' ? window.reason : 'observed')).toEqual(['observed', 'history-non-linear', 'no-previous-evaluation-recorded']);
  });

  it('reads nothing without an exact revision or a readable instant', () => {
    const calls: string[] = [];
    const record = (sql: string): string => { calls.push(sql); return '[]'; };
    expect(observeWorkItemChanges({ kind: 'unknown', reason: 'down' }, record)).toEqual(unknownWindows('work-item-revision-unavailable'));
    expect(observeWorkItemChanges(workItems({ provenance: { kind: 'dolt-revision', source: 'x', revision: 'HEAD' } }), record)).toEqual(unknownWindows('work-item-revision-unavailable'));
    expect(observeWorkItemChanges(workItems({ capturedAt: 'not a time' }), record)).toEqual(unknownWindows('observation-instant-unavailable'));
    expect(calls).toEqual([]);
  });
});
