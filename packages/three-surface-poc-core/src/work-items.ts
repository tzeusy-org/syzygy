import { execFileSync } from 'node:child_process';

import type { UnknownReason } from '@syzygy/cap1-core';

import { unknown, type PocUnknown } from './epistemic.js';
import type { PocProvenance } from './model.js';
import { resolutionRoute, type ResolutionRoutes } from './project-shape-model.js';

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

/** No title: a work-item title is free text no declared secret policy
 * covers, so the observation never reads it (SEC-5; owner answer of
 * 2026-10-20, `syzygy-jytt`). The observation's `titles` discloses that. */
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
  'No governing intent was captured for this work item: the observation reads no link from an item to the intent that warrants it, and none is taken from its title.';

/** POC-REQ-014: `Unknown`, primary reason `source-uncaptured-or-unreachable`,
 * and that reason's RFC2-24 route. The same value for every item. */
export function governingIntentUnknown(): GoverningIntentUnknown {
  return {
    label: 'Unknown',
    closedReason: 'source-uncaptured-or-unreachable',
    resolutionRoutes: [resolutionRoute('source-uncaptured-or-unreachable')],
  };
}

/** The disclosure twin of an item's governing intent: the served value
 * with its basis sentence, as every rendered Unknown carries one. */
export function governingIntentDisclosure(governedBy: GoverningIntentUnknown): PocUnknown {
  return unknown(governedBy.closedReason, GOVERNING_INTENT_UNKNOWN_BASIS);
}

/** Every served item's title, stated once on the observation rather than on
 * each item: `Unknown`, primary reason `excluded-content`, and that reason's
 * RFC2-24 route. SEC-5 excludes anything not classifiable under the declared
 * secret policy, and the only declared policy covers
 * `declared-project-shape-text`, so the title column is never selected. */
export interface WorkItemTitlesWithheld {
  readonly label: 'Unknown';
  readonly closedReason: 'excluded-content';
  readonly resolutionRoutes: ResolutionRoutes;
}

/** The basis sentence of the withheld-title Unknown. */
export const WORK_ITEM_TITLES_WITHHELD_BASIS =
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

export interface WorkItemsUnknown {
  readonly kind: 'unknown';
  readonly reason: string;
}

export type WorkItemsResult = WorkItemsObserved | WorkItemsUnknown;

export interface ObserveWorkItemsInput {
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

interface RawRow {
  readonly revision?: unknown;
  readonly id?: unknown;
  readonly status?: unknown;
  readonly issue_type?: unknown;
  readonly priority?: unknown;
  readonly created_at?: unknown;
  readonly updated_at?: unknown;
  readonly closed_at?: unknown;
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
    `created_at, updated_at, closed_at FROM issues WHERE id LIKE '${input.beadPrefix}-%' ORDER BY id`;

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
  if (rows.length === 0) {
    // Zero items under the registered prefix is a legitimate observed-empty
    // result, distinct from Unknown (POC-REQ-013) — but the revision still
    // has to be captured from a live query rather than left unrecorded.
    let revisionOnly: string;
    try {
      revisionOnly = runQuery(input.repoRoot, "SELECT dolt_hashof('HEAD') AS revision");
    } catch {
      return {
        kind: 'unknown',
        reason: 'the Beads Dolt database was unreachable or unreadable during revision capture',
      };
    }
    let revisionRows: unknown;
    try {
      revisionRows = JSON.parse(revisionOnly);
    } catch {
      return { kind: 'unknown', reason: 'revision capture returned a non-JSON response' };
    }
    const revisionValue = Array.isArray(revisionRows)
      ? (revisionRows[0] as RawRow | undefined)?.revision
      : undefined;
    if (typeof revisionValue !== 'string') {
      return { kind: 'unknown', reason: 'revision capture returned an unexpected shape' };
    }
    return {
      kind: 'observed',
      beadPrefix: input.beadPrefix,
      provenance: doltProvenance(input.beadPrefix, revisionValue),
      capturedAt: input.capturedAt,
      items: [],
      governedByUnknownCount: 0,
      titles: workItemTitlesWithheld(),
    };
  }

  const items: WorkItemFact[] = [];
  let doltRevision: string | undefined;
  for (const raw of rows as readonly RawRow[]) {
    if (
      typeof raw.revision !== 'string' ||
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
    doltRevision ??= raw.revision;
    if (raw.revision !== doltRevision) {
      return { kind: 'unknown', reason: 'work-item observation spanned more than one Dolt revision' };
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

  return {
    kind: 'observed',
    beadPrefix: input.beadPrefix,
    provenance: doltProvenance(input.beadPrefix, doltRevision as string),
    capturedAt: input.capturedAt,
    items,
    governedByUnknownCount: countGoverningIntentUnknown(items),
    titles: workItemTitlesWithheld(),
  };
}

function doltProvenance(beadPrefix: string, revision: string): PocProvenance {
  return { kind: 'dolt-revision', source: `Beads Dolt database (${beadPrefix})`, revision };
}
