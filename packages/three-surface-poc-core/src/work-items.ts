import { execFileSync } from 'node:child_process';

import type { UnknownReason } from '@syzygy/cap1-core';
import { isRecord } from '@syzygy/support';

import { unknown, type PocUnknown } from './epistemic.js';
import type { PocProvenance } from './model.js';
import { resolutionRoute, type ResolutionRoutes } from './project-shape-model.js';
import { isDoltRevision, observeWorkItemDependencies, type WorkItemDependencyObservation } from './work-item-dependencies.js';
import { observeWorkItemChanges, type ChangeWindowObservation } from './work-item-history.js';

export const WORK_ITEM_STATUSES = [
  'open',
  'in_progress',
  'blocked',
  'deferred',
  'pinned',
  'hooked',
  'closed',
] as const;

export type WorkItemStatus = (typeof WORK_ITEM_STATUSES)[number];

/** Work-item title omission is disclosed in `titles` and governed by SEC-5.
 * Historical owner answer and successor scope:
 * `.syzygy/governance/decisions/BEAD-TITLE-WITHHOLDING-RECORD-2026-10-20.md`. */
export interface WorkItemFact {
  readonly id: string;
  readonly status: WorkItemStatus;
  readonly issueType: string;
  readonly priority: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly closedAt: string | null;
  /** POC-REQ-014: the item's governing intent. Always the one Unknown below:
   * the observation reads no link from an item to the intent that warrants
   * it, and nothing is taken from the title. */
  readonly governedBy: GoverningIntentUnknown;
}

/** POC-REQ-014's value: "`Unknown` with the primary reason
 * `source-uncaptured-or-unreachable` and that reason's RFC2-24 resolution
 * route". The signed text names no basis sentence, so the served item
 * carries none: it repeats on every one of the served items, and on the
 * proving case that is thousands of copies against the machine ceiling.
 * The basis sentence stays on the rendered card's twin (`model.ts`). */
export interface GoverningIntentUnknown {
  readonly label: 'Unknown';
  readonly closedReason: UnknownReason;
  readonly resolutionRoutes: ResolutionRoutes;
}

/** The basis sentence of every work item's governing-intent Unknown. */
export const GOVERNING_INTENT_UNKNOWN_BASIS =
  'No governing intent was captured for any work item: the observation reads no link from an item to the intent that warrants it, and none is taken from its title.';

/** POC-REQ-014: `Unknown`, primary reason `source-uncaptured-or-unreachable`,
 * and that reason's RFC2-24 route. The same value for every item. */
export function governingIntentUnknown(): GoverningIntentUnknown {
  return {
    label: 'Unknown',
    closedReason: 'source-uncaptured-or-unreachable',
    resolutionRoutes: [resolutionRoute('source-uncaptured-or-unreachable')],
  };
}

/** Every served item's title, stated once on the observation rather than on
 * each item: `Unknown`, primary reason `excluded-content`, and that reason's
 * RFC2-24 route. SEC-5 excludes anything not classifiable under the declared
 * secret policy, and the only declared policy covers
 * `declared-project-shape-text`, so the title column is never selected. */
interface WorkItemTitlesWithheld {
  readonly label: 'Unknown';
  readonly closedReason: 'excluded-content';
  readonly resolutionRoutes: ResolutionRoutes;
}

/** The basis sentence of the withheld-title Unknown. */
const WORK_ITEM_TITLES_WITHHELD_BASIS =
  'Work-item titles are withheld under SEC-5: a title is free text, the only declared secret-classification policy covers declared-project-shape-text and none covers work-item titles, so the observation never reads them. Each item is named by its identifier.';

export function workItemTitlesWithheld(): WorkItemTitlesWithheld {
  return {
    label: 'Unknown',
    closedReason: 'excluded-content',
    resolutionRoutes: [resolutionRoute('excluded-content')],
  };
}

/** The disclosure twin of the observation's `titles`, with its basis. */
export function workItemTitlesDisclosure(titles: WorkItemTitlesWithheld): PocUnknown {
  return unknown(titles.closedReason, WORK_ITEM_TITLES_WITHHELD_BASIS);
}

/** How many items carry the governing-intent Unknown, counted over the
 * served item set (POC-REQ-014), never assumed equal to its length. */
export function countGoverningIntentUnknown(items: readonly WorkItemFact[]): number {
  return items.filter(
    (item) => item.governedBy.label === 'Unknown' && item.governedBy.closedReason === 'source-uncaptured-or-unreachable',
  ).length;
}

/**
 * POC-REQ-010 "One statement of provenance": the observation names its Dolt
 * revision once, in the shared `PocProvenance` shape the entities and
 * relationships carry, and no work-item fact restates it. `capturedAt` is the
 * second half of the observation's identity, not a second statement of
 * provenance; an item's created, updated and closed times are database facts.
 */
export interface WorkItemsObserved {
  readonly kind: 'observed';
  readonly beadPrefix: string;
  readonly provenance: PocProvenance;
  readonly capturedAt: string;
  readonly items: readonly WorkItemFact[];
  /** POC-REQ-014: the served items whose `governedBy` is the Unknown. */
  readonly governedByUnknownCount: number;
  /** SEC-5: every item's title is withheld, never read. */
  readonly titles: WorkItemTitlesWithheld;
}

interface WorkItemsUnknown {
  readonly kind: 'unknown';
  readonly reason: string;
}

export type WorkItemsResult = WorkItemsObserved | WorkItemsUnknown;

interface ObserveWorkItemsInput {
  readonly repoRoot: string;
  readonly beadPrefix: string;
  readonly capturedAt: string;
  readonly runQuery?: (repoRoot: string, sql: string) => string;
}

const PREFIX_PATTERN = /^[a-z][a-z0-9]{0,15}$/;

function defaultRunQuery(repoRoot: string, sql: string): string {
  return execFileSync(
    'bd',
    ['--readonly', '--json', '-C', repoRoot, 'sql', sql],
    { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] },
  );
}

function isWorkItemStatus(value: unknown): value is WorkItemStatus {
  return typeof value === 'string' && (WORK_ITEM_STATUSES as readonly string[]).includes(value);
}

/**
 * Reads work items exclusively through `bd sql` against the live Dolt
 * database (POC-REQ-010/012). This module never opens the passive JSONL
 * export or any file derived from it — it shells a single read-only SQL
 * statement and parses its stdout. The statement names every column it
 * reads, and `title` is not among them; a row that carries one anyway is
 * never copied from.
 */
export function observeWorkItems(input: ObserveWorkItemsInput): WorkItemsResult {
  if (!PREFIX_PATTERN.test(input.beadPrefix)) {
    return { kind: 'unknown', reason: `configured bead-prefix is not a valid identifier: ${input.beadPrefix}` };
  }
  const runQuery = input.runQuery ?? defaultRunQuery;
  const sql =
    `SELECT dolt_hashof('HEAD') AS revision, id, status, issue_type, priority, ` +
    `created_at, updated_at, closed_at FROM issues AS OF 'HEAD' WHERE id LIKE '${input.beadPrefix}-%' ` +
    `UNION ALL SELECT dolt_hashof('HEAD'), NULL, NULL, NULL, NULL, NULL, NULL, NULL ORDER BY id`;

  let stdout: string;
  try {
    stdout = runQuery(input.repoRoot, sql);
  } catch {
    return {
      kind: 'unknown',
      reason: 'the Beads Dolt database was unreachable or unreadable during work-item observation',
    };
  }

  let rows: unknown;
  try {
    rows = JSON.parse(stdout);
  } catch {
    return { kind: 'unknown', reason: 'work-item observation returned a non-JSON response' };
  }
  if (!Array.isArray(rows)) {
    return { kind: 'unknown', reason: 'work-item observation returned an unexpected shape' };
  }
  const items: WorkItemFact[] = [];
  let doltRevision: string | undefined;
  let sawRevisionWitness = false;
  for (const raw of rows as readonly unknown[]) {
    if (!isRecord(raw) || !isDoltRevision(raw.revision)) {
      return { kind: 'unknown', reason: 'work-item observation returned a malformed revision' };
    }
    doltRevision ??= raw.revision;
    if (raw.revision !== doltRevision) {
      return { kind: 'unknown', reason: 'work-item observation spanned more than one Dolt revision' };
    }
    // The revision row comes from the same statement even for an empty
    // committed item population. Its null columns cannot describe an item.
    if (raw.id === null) {
      if (sawRevisionWitness || [raw.status, raw.issue_type, raw.priority, raw.created_at, raw.updated_at, raw.closed_at].some((value) => value !== null)) {
        return { kind: 'unknown', reason: 'work-item observation returned a malformed revision witness' };
      }
      sawRevisionWitness = true;
      continue;
    }
    if (
      typeof raw.id !== 'string' ||
      !isWorkItemStatus(raw.status) ||
      typeof raw.issue_type !== 'string' ||
      typeof raw.priority !== 'number' ||
      typeof raw.created_at !== 'string' ||
      typeof raw.updated_at !== 'string'
    ) {
      return { kind: 'unknown', reason: 'work-item observation returned a malformed row' };
    }
    if (!raw.id.startsWith(`${input.beadPrefix}-`)) {
      return { kind: 'unknown', reason: 'work-item observation returned an out-of-prefix identifier' };
    }
    items.push({
      id: raw.id,
      status: raw.status,
      issueType: raw.issue_type,
      priority: raw.priority,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
      closedAt: typeof raw.closed_at === 'string' ? raw.closed_at : null,
      governedBy: governingIntentUnknown(),
    });
  }
  if (doltRevision === undefined || !sawRevisionWitness) {
    return { kind: 'unknown', reason: 'work-item observation returned no revision witness' };
  }

  return {
    kind: 'observed',
    beadPrefix: input.beadPrefix,
    provenance: doltProvenance(input.beadPrefix, doltRevision),
    capturedAt: input.capturedAt,
    items,
    governedByUnknownCount: countGoverningIntentUnknown(items),
    titles: workItemTitlesWithheld(),
  };
}

function doltProvenance(beadPrefix: string, revision: string): PocProvenance {
  return { kind: 'dolt-revision', source: `Beads Dolt database (${beadPrefix})`, revision };
}

export function observeTrajectoryWorkItems(input: ObserveWorkItemsInput): {
  readonly workItems: WorkItemsResult;
  readonly dependencies: WorkItemDependencyObservation;
  readonly changes: readonly ChangeWindowObservation[];
} {
  const workItems = observeWorkItems(input);
  const runQuery = input.runQuery ?? defaultRunQuery;
  const run = (sql: string): string => runQuery(input.repoRoot, sql);
  return { workItems, dependencies: observeWorkItemDependencies(workItems, run), changes: observeWorkItemChanges(workItems, run) };
}
