import { isRecord } from '@syzygy/support';

import type { WorkItemsResult } from './work-items.js';

const DOLT_REVISION = /^[0-9a-v]{32}$/;

export function isDoltRevision(value: unknown): value is string {
  return typeof value === 'string' && DOLT_REVISION.test(value);
}

export const DEPENDENCY_EDGE_TYPES = ['blocks', 'parent-child', 'discovered-from', 'related', 'relates-to', 'tracks'] as const;
type DependencyEdgeType = (typeof DEPENDENCY_EDGE_TYPES)[number];

export const DEPENDENCY_EDGE_REASONS = [
  'unlisted-edge-type',
  'external-blocker',
  'wisp-blocker',
  'out-of-prefix-blocker',
  'unobserved-blocker',
] as const;
export type DependencyEdgeReason = (typeof DEPENDENCY_EDGE_REASONS)[number];

export type DependencyFeedReason =
  | 'work-item-revision-unavailable'
  | 'dependency-read-failed'
  | 'dependency-result-malformed'
  | 'dependency-revision-unverified';

export interface DependencyEdgeCounts {
  readonly total: number;
  readonly byType: Readonly<Record<DependencyEdgeType, number>>;
  readonly unlisted: number;
  readonly external: number;
  readonly wisp: number;
  readonly outOfPrefix: number;
}

interface ItemDependencyFacts {
  readonly blockers: ReadonlySet<string>;
  readonly reasons: ReadonlySet<DependencyEdgeReason>;
}

/** syzygy-t3jk.20: what the parent-child rows say about each child. A
 * parent is the depends_on_issue_id of a parent-child row whose dependent
 * is the child. Only a served parent is named; any other target is counted
 * by its class, never by its identifier. */
export interface ParentFacts {
  /** Child id → its served parents, ascending, distinct. */
  readonly parents: ReadonlyMap<string, readonly string[]>;
  /** Children with a parent row whose target is external, a wisp or outside the prefix. */
  readonly outsideTracker: ReadonlySet<string>;
  /** Children with a parent row whose in-prefix target is not a served item. */
  readonly unobserved: ReadonlySet<string>;
}

export type WorkItemDependencyObservation =
  | { readonly kind: 'unknown'; readonly reason: DependencyFeedReason }
  | {
      readonly kind: 'observed';
      readonly counts: DependencyEdgeCounts;
      readonly byItem: ReadonlyMap<string, ItemDependencyFacts>;
      readonly parentFacts: ParentFacts;
    };

const EDGE_FIELDS = ['issue_id', 'depends_on_issue_id', 'type', 'has_external', 'has_wisp'] as const;

function isDependencyType(value: string): value is DependencyEdgeType {
  return (DEPENDENCY_EDGE_TYPES as readonly string[]).includes(value);
}

// Dolt transports a predicate through the SQL adapter as boolean or 0/1.
function readPresence(value: unknown): boolean | null {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  return null;
}

export function observeWorkItemDependencies(
  workItems: WorkItemsResult,
  runQuery: (sql: string) => string,
): WorkItemDependencyObservation {
  if (workItems.kind === 'unknown' || !isDoltRevision(workItems.provenance.revision)) {
    return { kind: 'unknown', reason: 'work-item-revision-unavailable' };
  }

  const revision = workItems.provenance.revision;
  const prefix = `${workItems.beadPrefix}-`;
  const sql =
    `SELECT issue_id, depends_on_issue_id, type, depends_on_external IS NOT NULL AS has_external, ` +
    `depends_on_wisp_id IS NOT NULL AS has_wisp, NULL AS revision FROM dependencies AS OF '${revision}' ` +
    `WHERE issue_id LIKE '${prefix}%' UNION ALL SELECT NULL, NULL, NULL, NULL, NULL, dolt_hashof('${revision}')`;
  let stdout: string;
  try {
    stdout = runQuery(sql);
  } catch {
    return { kind: 'unknown', reason: 'dependency-read-failed' };
  }

  let rows: unknown;
  try {
    rows = JSON.parse(stdout);
  } catch {
    return { kind: 'unknown', reason: 'dependency-result-malformed' };
  }
  if (!Array.isArray(rows)) return { kind: 'unknown', reason: 'dependency-result-malformed' };

  const statusById = new Map(workItems.items.map((item) => [item.id, item.status]));
  const counts = {
    total: 0,
    byType: { blocks: 0, 'parent-child': 0, 'discovered-from': 0, related: 0, 'relates-to': 0, tracks: 0 },
    unlisted: 0,
    external: 0,
    wisp: 0,
    outOfPrefix: 0,
  };
  const byItem = new Map<string, { blockers: Set<string>; reasons: Set<DependencyEdgeReason> }>();
  const parents = new Map<string, Set<string>>();
  const outsideTracker = new Set<string>();
  const unobserved = new Set<string>();
  let witnessed = false;
  for (const row of rows as readonly unknown[]) {
    if (!isRecord(row) || Object.keys(row).length !== 6 || !Object.hasOwn(row, 'revision') || EDGE_FIELDS.some((key) => !Object.hasOwn(row, key))) {
      return { kind: 'unknown', reason: 'dependency-result-malformed' };
    }
    if (row.revision !== null) {
      if (witnessed || row.revision !== revision || EDGE_FIELDS.some((key) => row[key] !== null)) {
        return { kind: 'unknown', reason: 'dependency-revision-unverified' };
      }
      witnessed = true;
      continue;
    }
    const dependent = row.issue_id;
    const target = row.depends_on_issue_id;
    const type = row.type;
    const external = readPresence(row.has_external);
    const wisp = readPresence(row.has_wisp);
    if (typeof dependent !== 'string' || !dependent.startsWith(prefix) || !statusById.has(dependent) ||
        (target !== null && typeof target !== 'string') || typeof type !== 'string' || external === null || wisp === null) {
      return { kind: 'unknown', reason: 'dependency-result-malformed' };
    }

    const outOfPrefix = target !== null && !target.startsWith(prefix);
    counts.total++;
    if (external) counts.external++;
    if (wisp) counts.wisp++;
    if (outOfPrefix) counts.outOfPrefix++;

    if (type === 'parent-child') {
      if (external || wisp || outOfPrefix || target === null) outsideTracker.add(dependent);
      else if (!statusById.has(target)) unobserved.add(dependent);
      else {
        let set = parents.get(dependent);
        if (set === undefined) parents.set(dependent, (set = new Set<string>()));
        set.add(target);
      }
    }
    if (isDependencyType(type)) {
      counts.byType[type]++;
      if (type !== 'blocks') continue;
    } else {
      counts.unlisted++;
    }

    let facts = byItem.get(dependent);
    if (facts === undefined) {
      facts = { blockers: new Set<string>(), reasons: new Set<DependencyEdgeReason>() };
      byItem.set(dependent, facts);
    }
    if (type !== 'blocks') {
      facts.reasons.add('unlisted-edge-type');
      continue;
    }
    if (external) facts.reasons.add('external-blocker');
    if (wisp) facts.reasons.add('wisp-blocker');
    if (outOfPrefix) facts.reasons.add('out-of-prefix-blocker');
    if (external || wisp || outOfPrefix) continue;

    const targetStatus = target === null ? undefined : statusById.get(target);
    if (targetStatus === undefined) facts.reasons.add('unobserved-blocker');
    else if (target !== null && targetStatus !== 'closed') facts.blockers.add(target);
  }

  if (!witnessed) return { kind: 'unknown', reason: 'dependency-revision-unverified' };
  const parentFacts: ParentFacts = {
    parents: new Map([...parents].map(([child, set]) => [child, [...set].sort()])),
    outsideTracker,
    unobserved,
  };
  return { kind: 'observed', counts, byItem, parentFacts };
}
