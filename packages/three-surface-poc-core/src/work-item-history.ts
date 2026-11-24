import { isRecord } from '@syzygy/support';

import { isDoltRevision } from './work-item-dependencies.js';
import { WORK_ITEM_STATUSES, type WorkItemsResult, type WorkItemStatus } from './work-items.js';

/**
 * syzygy-t3jk.21 (POC-REQ-044, "What changed?"): what the tracker's history
 * says changed between two named Dolt revisions, per window.
 *
 * Two read-only statements through the same `bd sql` runner as the work-item
 * read. The first finds each window's start: the newest commit in the history
 * of the observed revision at or before the window bound, read from
 * `dolt_log('<revision>')` by `commit_hash` and `date` only (never message,
 * committer or email). The second diffs each start against the observed
 * revision with `dolt_diff(<start>, <revision>, 'issues')`, naming only the
 * id, status and diff-type columns (never a title or other free text, SEC-5).
 * The window end is always the observed revision, never a fresh HEAD.
 */

/** The windows, in their fixed order. The first is the page's default. */
export const CHANGE_WINDOWS = ['day', 'week', 'since-last'] as const;
export type ChangeWindow = (typeof CHANGE_WINDOWS)[number];

/** How far each timed window reaches back from the observation instant. */
const WINDOW_MILLISECONDS: Readonly<Record<Exclude<ChangeWindow, 'since-last'>, number>> = {
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
};

/** The kinds of change a listed fact can be, in their fixed order. */
export const CHANGE_KINDS = ['added', 'closed', 'reopened', 're-stated', 'removed'] as const;
export type ChangeKind = (typeof CHANGE_KINDS)[number];

export type ChangeWindowReason =
  | 'work-item-revision-unavailable'
  | 'observation-instant-unavailable'
  | 'history-read-failed'
  | 'history-result-malformed'
  | 'history-revision-unverified'
  | 'history-shorter-than-window'
  | 'no-previous-evaluation-recorded';

export interface ChangeFact {
  readonly id: string;
  readonly kind: ChangeKind;
  /** The status at the window start; null for an added item. */
  readonly from: WorkItemStatus | null;
  /** The status at the observed revision; null for a removed item. */
  readonly to: WorkItemStatus | null;
}

export interface CommitPoint {
  readonly revision: string;
  /** The commit's recorded instant, as Dolt reports it. */
  readonly at: string;
}

export type ChangeWindowObservation =
  | { readonly window: ChangeWindow; readonly kind: 'unknown'; readonly reason: ChangeWindowReason }
  | {
      readonly window: ChangeWindow;
      readonly kind: 'observed';
      readonly from: CommitPoint;
      readonly to: CommitPoint;
      /** Facts per kind; sums to `facts.length`. */
      readonly counts: Readonly<Record<ChangeKind, number>>;
      /** Every changed in-prefix item, ascending id. */
      readonly facts: readonly ChangeFact[];
      /** Rows that changed an item without changing its status: counted, never listed. */
      readonly updatedWithoutStatusChange: number;
      /** Rows outside the observed prefix: counted, never named. */
      readonly outsidePrefix: number;
    };

const unknownAll = (reason: ChangeWindowReason): readonly ChangeWindowObservation[] =>
  CHANGE_WINDOWS.map((window) => window === 'since-last'
    ? { window, kind: 'unknown', reason: 'no-previous-evaluation-recorded' }
    : { window, kind: 'unknown', reason });

/** SQL instant literal in UTC to the millisecond, as Dolt compares `dolt_log.date`. */
function sqlInstant(ms: number): string {
  return new Date(ms).toISOString().replace('T', ' ').replace('Z', '');
}

function isStatus(value: unknown): value is WorkItemStatus {
  return typeof value === 'string' && (WORK_ITEM_STATUSES as readonly string[]).includes(value);
}

function parseRows(stdout: string): readonly Record<string, unknown>[] | null {
  let rows: unknown;
  try {
    rows = JSON.parse(stdout);
  } catch {
    return null;
  }
  if (!Array.isArray(rows) || !rows.every(isRecord)) return null;
  return rows as Record<string, unknown>[];
}

function classify(from: WorkItemStatus | null, to: WorkItemStatus | null): ChangeKind | 'unchanged' {
  if (from === null) return 'added';
  if (to === null) return 'removed';
  if (from === to) return 'unchanged';
  if (to === 'closed') return 'closed';
  if (from === 'closed') return 'reopened';
  return 're-stated';
}

const TIMED: readonly Exclude<ChangeWindow, 'since-last'>[] = ['day', 'week'];
const BOUND_FIELDS = ['revision', 'revision_at', 'day_from', 'day_at', 'week_from', 'week_at'] as const;
const DIFF_FIELDS = ['w', 'diff_type', 'from_id', 'to_id', 'from_status', 'to_status', 'n'] as const;

export function observeWorkItemChanges(
  workItems: WorkItemsResult,
  runQuery: (sql: string) => string,
): readonly ChangeWindowObservation[] {
  if (workItems.kind === 'unknown' || !isDoltRevision(workItems.provenance.revision)) {
    return unknownAll('work-item-revision-unavailable');
  }
  const capturedMs = Date.parse(workItems.capturedAt);
  if (!Number.isFinite(capturedMs)) return unknownAll('observation-instant-unavailable');
  const revision = workItems.provenance.revision;
  const prefix = `${workItems.beadPrefix}-`;

  // (a) Each window's start: the newest commit in the revision's own history
  // at or before its bound (ties by ascending hash), and the revision's instant.
  const start = (bound: number, column: 'commit_hash' | 'date'): string =>
    `(SELECT ${column} FROM dolt_log('${revision}') WHERE date <= '${sqlInstant(bound)}' ORDER BY date DESC, commit_hash ASC LIMIT 1)`;
  const boundsSql =
    `SELECT dolt_hashof('${revision}') AS revision, ` +
    `(SELECT date FROM dolt_log('${revision}') WHERE commit_hash = '${revision}') AS revision_at, ` +
    TIMED.map((window) => {
      const bound = capturedMs - WINDOW_MILLISECONDS[window];
      return `${start(bound, 'commit_hash')} AS ${window}_from, ${start(bound, 'date')} AS ${window}_at`;
    }).join(', ');
  let stdout: string;
  try {
    stdout = runQuery(boundsSql);
  } catch {
    return unknownAll('history-read-failed');
  }
  const boundRows = parseRows(stdout);
  if (boundRows === null || boundRows.length !== 1) return unknownAll('history-result-malformed');
  const bounds = boundRows[0]!;
  if (Object.keys(bounds).length !== BOUND_FIELDS.length || BOUND_FIELDS.some((key) => !Object.hasOwn(bounds, key))) {
    return unknownAll('history-result-malformed');
  }
  if (bounds.revision !== revision || typeof bounds.revision_at !== 'string') return unknownAll('history-revision-unverified');
  const to: CommitPoint = { revision, at: bounds.revision_at };

  const starts = new Map<Exclude<ChangeWindow, 'since-last'>, CommitPoint>();
  for (const window of TIMED) {
    const from = bounds[`${window}_from`];
    const at = bounds[`${window}_at`];
    if (from === null && at === null) continue; // no commit that old: the history is shorter than the window
    if (!isDoltRevision(from) || typeof at !== 'string') return unknownAll('history-result-malformed');
    starts.set(window, { revision: from, at });
  }

  // (b) The diff of each start against the revision, in-prefix rows listed,
  // the rest counted by one aggregate row per window.
  // COALESCE keeps a one-sided row (added, removed) out of SQL's NULL logic.
  const inPrefix = `(COALESCE(from_id, '') LIKE '${prefix}%' OR COALESCE(to_id, '') LIKE '${prefix}%')`;
  const parts = [...starts].flatMap(([window, from]) => {
    const diff = `dolt_diff('${from.revision}', '${revision}', 'issues')`;
    return [
      `SELECT '${window}' AS w, diff_type, from_id, to_id, from_status, to_status, NULL AS n FROM ${diff} WHERE ${inPrefix}`,
      `SELECT '${window}', 'outside-prefix', NULL, NULL, NULL, NULL, COUNT(*) FROM ${diff} WHERE NOT ${inPrefix}`,
    ];
  });
  const rowsByWindow = new Map<string, Record<string, unknown>[]>();
  if (parts.length > 0) {
    try {
      stdout = runQuery(parts.join(' UNION ALL '));
    } catch {
      return unknownAll('history-read-failed');
    }
    const rows = parseRows(stdout);
    if (rows === null) return unknownAll('history-result-malformed');
    for (const row of rows) {
      if (Object.keys(row).length !== DIFF_FIELDS.length || DIFF_FIELDS.some((key) => !Object.hasOwn(row, key)) || typeof row.w !== 'string' || !starts.has(row.w as 'day')) {
        return unknownAll('history-result-malformed');
      }
      let list = rowsByWindow.get(row.w);
      if (list === undefined) rowsByWindow.set(row.w, (list = []));
      list.push(row);
    }
  }

  const observed = new Map<ChangeWindow, ChangeWindowObservation>();
  for (const [window, from] of starts) {
    const counts = Object.fromEntries(CHANGE_KINDS.map((kind) => [kind, 0])) as Record<ChangeKind, number>;
    const facts: ChangeFact[] = [];
    let updatedWithoutStatusChange = 0;
    let outsidePrefix: number | null = null;
    const seen = new Set<string>();
    for (const row of rowsByWindow.get(window) ?? []) {
      if (row.diff_type === 'outside-prefix') {
        if (outsidePrefix !== null || typeof row.n !== 'number' || !Number.isInteger(row.n) || row.n < 0) return unknownAll('history-result-malformed');
        outsidePrefix = row.n;
        continue;
      }
      const fromStatus = row.from_status === null ? null : isStatus(row.from_status) ? row.from_status : undefined;
      const toStatus = row.to_status === null ? null : isStatus(row.to_status) ? row.to_status : undefined;
      const shapeOk =
        row.n === null && fromStatus !== undefined && toStatus !== undefined &&
        (row.diff_type === 'added' ? row.from_id === null && typeof row.to_id === 'string' && fromStatus === null && toStatus !== null
          : row.diff_type === 'removed' ? row.to_id === null && typeof row.from_id === 'string' && toStatus === null && fromStatus !== null
            : row.diff_type === 'modified' && typeof row.from_id === 'string' && row.from_id === row.to_id && fromStatus !== null && toStatus !== null);
      const id = (row.to_id ?? row.from_id) as string;
      if (!shapeOk || !id.startsWith(prefix) || seen.has(id)) return unknownAll('history-result-malformed');
      seen.add(id);
      const kind = classify(fromStatus as WorkItemStatus | null, toStatus as WorkItemStatus | null);
      if (kind === 'unchanged') {
        updatedWithoutStatusChange++;
        continue;
      }
      counts[kind]++;
      facts.push({ id, kind, from: fromStatus as WorkItemStatus | null, to: toStatus as WorkItemStatus | null });
    }
    if (outsidePrefix === null) return unknownAll('history-result-malformed');
    facts.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    observed.set(window, { window, kind: 'observed', from, to, counts, facts, updatedWithoutStatusChange, outsidePrefix });
  }

  return CHANGE_WINDOWS.map((window): ChangeWindowObservation => {
    if (window === 'since-last') return { window, kind: 'unknown', reason: 'no-previous-evaluation-recorded' };
    return observed.get(window) ?? { window, kind: 'unknown', reason: 'history-shorter-than-window' };
  });
}
