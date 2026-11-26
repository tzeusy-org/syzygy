import { recordedInstant, trajectoryTimeMeasures, type TrajectoryTimeMeasures } from './trajectory-time-measures.js';
import type { WorkItemFact, WorkItemsResult, WorkItemStatus } from './work-items.js';
import type { CommitJoinsResult } from './commit-joins.js';
import { CHANGE_WINDOWS, type ChangeWindow, type ChangeWindowObservation } from './work-item-history.js';
import {
  DEPENDENCY_EDGE_REASONS,
  type DependencyEdgeCounts,
  type DependencyEdgeReason,
  type DependencyFeedReason,
  type WorkItemDependencyObservation,
} from './work-item-dependencies.js';

export const STATUS_TO_COLUMN = {
  open: 'Backlog',
  in_progress: 'Claimed',
  blocked: 'Blocked',
  deferred: 'Deferred',
  pinned: 'Pinned',
  hooked: 'Hooked',
  closed: 'Closed',
} as const satisfies Record<WorkItemStatus, string>;

export type TrajectoryColumn = (typeof STATUS_TO_COLUMN)[WorkItemStatus];

export type TrajectoryEligibilityState = 'ready' | 'planned' | 'blocked' | 'eligibility-undetermined';
export type TrajectoryEligibilityReason = DependencyEdgeReason | DependencyFeedReason | 'tracker-deferred';

export interface TrajectoryItemEligibility {
  readonly state: TrajectoryEligibilityState;
  readonly reasons: readonly TrajectoryEligibilityReason[];
  readonly block?: {
    readonly causes: readonly ['dependency'] | readonly [];
    readonly blockers: readonly { readonly id: string; readonly page: number }[];
  };
}

export interface TrajectoryEligibility {
  readonly served: number;
  readonly counts: Readonly<Record<TrajectoryEligibilityState | 'absent', number>>;
  readonly feed: { readonly kind: 'unknown'; readonly reason: DependencyFeedReason } |
    { readonly kind: 'observed'; readonly counts: DependencyEdgeCounts };
  readonly items: Readonly<Partial<Record<string, TrajectoryItemEligibility>>>;
}

export interface TrajectoryLaneItem {
  readonly id: string;
  readonly status: WorkItemStatus;
  readonly column: TrajectoryColumn;
  /** The tracker's own priority, as read (work-items.ts). */
  readonly priority: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly closedAt: string | null;
  readonly verification: 'unknown';
}

/** POC-REQ-044 (syzygy-t3jk.16): the disclosures the five answers name.
 * Each exists in `unknownSubjects` exactly when its answer part renders. */
export const TRAJECTORY_CHANGED_ID = 'region:trajectory-changed' as const;
export const TRAJECTORY_COST_ID = 'region:trajectory-cost' as const;
export const TRAJECTORY_ORPHANED_WORK_ID = 'region:trajectory-orphaned-work' as const;
export const TRAJECTORY_CHAIN_MEMBERSHIP_ID = 'region:trajectory-chain-membership' as const;
/** POC-REQ-065 (syzygy-t3jk.26): the disclosure a closed item's landing
 * names when the commit join (POC-REQ-064) is Unknown. */
export const TRAJECTORY_COMMIT_JOINS_ID = 'region:trajectory-commit-joins' as const;
/** POC-REQ-065: the disclosure every closed item no read commit names
 * refers to. RFC4-22: a join that cannot be established (message tag
 * absent) renders Unknown, never fuzzy-matched. */
export const TRAJECTORY_LANDING_UNNAMED_ID = 'region:trajectory-landing-unnamed' as const;
/** The board's governing-intent disclosure (POC-REQ-014); model.ts exports it. */
export const GOVERNING_INTENT_REGION_ID = 'region:work-item-governing-intent' as const;
/** The disclosure every answer names when work items were not observed. */
export const WORK_ITEMS_REGION_ID = 'region:work-items' as const;

/** README.md:99's five Trajectory questions, in their fixed order. */
export const TRAJECTORY_ANSWER_ORDER = ['remains', 'running', 'changed', 'cost', 'intent'] as const;
export type TrajectoryAnswerId = (typeof TRAJECTORY_ANSWER_ORDER)[number];

/** An answer, or a part of one, that is Unknown: the id of the
 * `unknownSubjects` entry that carries its reason and route. */
export interface TrajectoryAnswerUnknown {
  readonly state: 'unknown';
  readonly disclosure: string;
}

/** POC-REQ-065 (syzygy-t3jk.26): a closed item's landing, from the commit
 * join alone. `merged-by-convention`: a commit reachable from the observed
 * revision names it (RFC4-22 `naming-convention`, `reduced-fidelity`), never
 * proof the work was done or the intent satisfied. `no-naming-commit-read`:
 * no commit read names it, so its join cannot be established and where it
 * landed is Unknown (RFC4-22); when the read was truncated, older history
 * may name it. */
export type ClosedItemLanding = 'merged-by-convention' | 'no-naming-commit-read';

/** The closed items' landings, counted over every served closed item, or
 * Unknown with the commit-join disclosure when the join is Unknown. */
export type TrajectoryClosedLanding =
  | {
      readonly state: 'observed';
      readonly closed: number;
      readonly mergedByConvention: number;
      readonly noNamingCommitRead: number;
      readonly basis: 'naming-convention';
      readonly fidelity: 'reduced-fidelity';
      /** Commits read, newest first from the observed revision. */
      readonly commitsRead: number;
      /** True when older history was not read: a closed item counted under
       * `noNamingCommitRead` may be named there. */
      readonly historyTruncated: boolean;
    }
  | (TrajectoryAnswerUnknown & { readonly closed: number });

/** The landing of one served item, or null when it is not closed or the
 * join is Unknown. Both channels derive a card's landing from this alone. */
export function closedItemLanding(item: { readonly id: string; readonly status: WorkItemStatus }, joins: CommitJoinsResult): ClosedItemLanding | null {
  if (item.status !== 'closed' || joins.kind !== 'observed') return null;
  return joins.items.some((entry) => entry.id === item.id) ? 'merged-by-convention' : 'no-naming-commit-read';
}

function closedLanding(items: readonly WorkItemFact[], joins: CommitJoinsResult | undefined): TrajectoryClosedLanding {
  const closed = items.filter((item) => item.status === 'closed');
  if (joins === undefined || joins.kind !== 'observed') {
    return { state: 'unknown', disclosure: TRAJECTORY_COMMIT_JOINS_ID, closed: closed.length };
  }
  const joined = new Set(joins.items.map((entry) => entry.id));
  const merged = closed.filter((item) => joined.has(item.id)).length;
  return {
    state: 'observed',
    closed: closed.length,
    mergedByConvention: merged,
    noNamingCommitRead: closed.length - merged,
    basis: joins.basis,
    fidelity: joins.fidelity,
    commitsRead: joins.read,
    historyTruncated: joins.truncated,
  };
}

/** POC-REQ-044. Every count is over all served work items, never the
 * rendered selection. No answer is omitted for being Unknown. */
export type TrajectoryAnswer =
  | {
      readonly id: 'remains';
      readonly state: 'observed';
      /** Served items per tracker status, every status listed; sums to `served`. */
      readonly byStatus: Readonly<Record<WorkItemStatus, number>>;
      readonly served: number;
      /** POC-REQ-065: how the closed items landed, by the commit join. */
      readonly closedLanding: TrajectoryClosedLanding;
    }
  | {
      readonly id: 'running';
      readonly state: 'observed';
      /** Items the tracker marks in_progress: the tracker's claim. */
      readonly claimed: number;
      readonly served: number;
      /** RFC8-16: with no staleness bound declared, a claimed item's
       * liveness state is `activity-undetermined`, state-local (RFC8-12):
       * never an RFC2-24 reason, never counted among Unknown reasons. */
      readonly liveness: 'activity-undetermined';
    }
  | {
      /** syzygy-t3jk.21: every window, in CHANGE_WINDOWS order, each observed
       * or Unknown with its reason; an Unknown window names the one changed
       * disclosure. The page shows one window; this carries all of them. */
      readonly id: 'changed';
      readonly state: 'observed';
      readonly windows: readonly TrajectoryChangeWindow[];
    }
  | ({ readonly id: 'cost' } & TrajectoryAnswerUnknown)
  | {
      readonly id: 'intent';
      readonly state: 'observed';
      /** Three counts, each with its own denominator, never summed. */
      readonly unknownProvenance: { readonly count: number; readonly served: number; readonly disclosure: string };
      /** RFC2-18: materialized work whose change reached the default branch.
       * Each member's reconciliation evidence is absent (RFC8-29), a
       * chain-state fact carrying no RFC2-24 reason. */
      readonly reconciliationChain: {
        readonly members: number | TrajectoryAnswerUnknown;
        /** The denominator: materialized work items (0 or 1 in the POC). */
        readonly materialized: number;
        readonly memberEvidence: 'reconciliation-evidence-absent';
      };
      /** RFC8-8: no orphaned-work check runs, so the count of the served
       * items that are orphaned is Unknown. */
      readonly orphanedWork: TrajectoryAnswerUnknown & { readonly served: number };
    }
  | ({ readonly id: TrajectoryAnswerId } & TrajectoryAnswerUnknown);

/** What the reconciliation-chain count reads: the one materialized item
 * and the worker change observed for it. */
export interface ReconciliationChainInput {
  readonly materializedBeadId: string | null;
  readonly workerChange: { readonly kind: 'observed'; readonly state: string } | { readonly kind: 'unknown' } | null;
}

interface TrajectoryPopulation {
  readonly kind: 'observed';
  readonly doltRevision: string;
  readonly totalCount: number;
  /** POC-REQ-045: elapsed-time measures over every served item. */
  readonly timeMeasures: TrajectoryTimeMeasures;
  /** POC-REQ-062: eligibility and dependency counts over every served item. */
  readonly eligibility: TrajectoryEligibility;
  /** POC-REQ-044: the five answers, in TRAJECTORY_ANSWER_ORDER. */
  readonly answers: readonly TrajectoryAnswer[];
  /** POC-REQ-042: the parent outline from the work-item revision. */
  readonly outline: TrajectoryOutline;
}

interface TrajectoryProjectionObserved extends TrajectoryPopulation {
  readonly selectionRule: string;
  readonly rendered: readonly TrajectoryLaneItem[];
  readonly renderedCount: number;
  readonly excludedCount: number;
  /** POC-REQ-043 (syzygy-t3jk.15): verification is Unknown for every served
   * item (no evidence source is ingested); `inside` are rendered, `outside`
   * are served but outside the selection. Both channels read these. */
  readonly verificationUnknown: { readonly served: number; readonly inside: number; readonly outside: number };
  /** Present for the default outline and explicit grouped views. */
  readonly grouping?: TrajectoryGrouping;
  /** POC-REQ-042: the declared selection controls and the rendered view. */
  readonly narrowing: TrajectoryNarrowing;
}

/** The closed query parameter set of GET /trajectory (POC-REQ-042). */
export const TRAJECTORY_VIEW_PARAMETERS = ['status', 'governing-intent', 'group', 'selection', 'changed', 'page'] as const;
export type TrajectoryViewParameter = (typeof TRAJECTORY_VIEW_PARAMETERS)[number];
/** Items per page of a narrowed or paged view, in ascending item id. */
export const TRAJECTORY_PAGE_SIZE = 250;

export interface TrajectoryViewRequest {
  readonly status: WorkItemStatus | null;
  readonly governingIntent: 'unknown' | null;
  /** syzygy-t3jk.20: group the matching items by parent. */
  readonly group: 'parent' | null;
  /** Select the capped recency board. Pagination and grouping have their own views. */
  readonly selection?: 'recent';
  /** syzygy-t3jk.21: the changed answer's window; null shows the default window. */
  readonly changed: ChangeWindow | null;
  readonly page: number;
}

const DEFAULT_VIEW = { status: null, governingIntent: null, group: 'parent', changed: null, page: 1 } as const satisfies TrajectoryViewRequest;

/** syzygy-t3jk.20: the parent structure, read from parent-child rows. */
export type TrajectoryOutline =
  | { readonly kind: 'unknown'; readonly reason: DependencyFeedReason }
  | {
      readonly kind: 'observed';
      /** Child id → its served parents, ascending; only children that have one. */
      readonly parents: Readonly<Record<string, readonly string[]>>;
      /** Children with a parent outside this tracker (external, wisp or another prefix), ascending. */
      readonly outsideTracker: readonly string[];
      /** Children with an in-prefix parent that is not a served item, ascending. */
      readonly unobserved: readonly string[];
      /** Each set of served items whose parent links form a cycle, ascending; never followed. */
      readonly cycles: readonly (readonly string[])[];
    };

/** A group of the grouped view. The four classes after `parent` hold the
 * items with no served parent to sit under, each for its stated cause. */
export type TrajectoryGroupKey =
  | { readonly kind: 'parent'; readonly id: string }
  | { readonly kind: 'parent-outside-tracker' }
  | { readonly kind: 'parent-unobserved' }
  | { readonly kind: 'no-parent' }
  | { readonly kind: 'parent-unknown'; readonly reason: DependencyFeedReason };

export interface TrajectoryGroupSlice {
  readonly key: TrajectoryGroupKey;
  /** The group's element id, stable across pages. */
  readonly anchor: string;
  /** Matching items in the whole group, over every page. */
  readonly total: number;
  /** The group's items on this page, ascending id. */
  readonly onPage: readonly string[];
  readonly continuedFromPage: number | null;
  readonly continuesOnPage: number | null;
  /** For a parent group: the parent's own facts, as recorded. */
  readonly parent?: {
    readonly status: WorkItemStatus;
    /** The page of the all-items view that holds the parent's card. */
    readonly cardPage: number;
    /** The parent's own served parents, each with the first page of its group in this view
     * (null: not a group here) and the all-items page of its card. */
    readonly under: readonly { readonly id: string; readonly groupPage: number | null; readonly cardPage: number }[];
    /** The cycle the parent belongs to: its members, ascending, stated in the
     * group of its first member only; the other members' groups name that
     * member (`statedUnder`) and the page its group starts on. Null when none. */
    readonly cycle:
      | { readonly members: readonly string[] }
      | { readonly statedUnder: string; readonly page: number | null }
      | null;
  };
}

export interface TrajectoryGrouping {
  /** Matching items placed: an item with several parents has one position per parent. */
  readonly positions: number;
  readonly groups: readonly TrajectoryGroupSlice[];
}

export interface TrajectoryNarrowing {
  readonly parameters: {
    readonly status: readonly WorkItemStatus[];
    readonly 'governing-intent': readonly ['unknown'];
    readonly group: readonly ['parent'];
    readonly selection: readonly ['recent'];
    /** syzygy-t3jk.21: the window the changed answer shows; alone it keeps the default selection. */
    readonly changed: readonly ChangeWindow[];
    readonly page: 'positive integer';
  };
  readonly defaultSelection: 'grouped-by-parent';
  readonly recentLimits: RecentLimits;
  /** syzygy-t3jk.21: the window shown when `changed` is absent. */
  readonly changedDefault: 'day';
  readonly pageSize: number;
  readonly order: 'ascending item id';
  /** syzygy-t3jk.20: with `group=parent`, the page counts positions in this order. */
  readonly groupedOrder: typeof GROUPED_ORDER;
  readonly groupedPageUnit: 'position';
  readonly view: TrajectoryViewRequest & { readonly matching: number; readonly pageCount: number };
}

export interface TrajectoryViewRefusal {
  readonly refused: 'trajectory-view-parameter';
  readonly parameter: string;
  readonly reason: 'unknown-parameter' | 'repeated-parameter' | 'unknown-value' | 'not-a-positive-integer' | 'page-past-end' | 'incompatible-parameter';
  readonly allowed: readonly string[];
}

function narrowingDeclaration(recentLimits: RecentLimits, view: TrajectoryNarrowing['view']): TrajectoryNarrowing {
  return {
    parameters: { status: Object.keys(STATUS_TO_COLUMN) as WorkItemStatus[], 'governing-intent': ['unknown'], group: ['parent'], selection: ['recent'], changed: [...CHANGE_WINDOWS], page: 'positive integer' },
    defaultSelection: 'grouped-by-parent',
    recentLimits,
    changedDefault: 'day',
    pageSize: TRAJECTORY_PAGE_SIZE,
    order: 'ascending item id',
    groupedOrder: GROUPED_ORDER,
    groupedPageUnit: 'position',
    view,
  };
}

/**
 * Read the closed parameter set from a query (POC-REQ-042). No parameter →
 * null (the default selection). Any other name, a repeated name, a value
 * outside its set or a page that is not a positive integer is refused with
 * its reason, never ignored.
 */
export function parseTrajectoryView(query: URLSearchParams): TrajectoryViewRequest | TrajectoryViewRefusal | null {
  const names = [...query.keys()];
  if (names.length === 0) return null;
  const seen = new Set<string>();
  for (const name of names) {
    if (!(TRAJECTORY_VIEW_PARAMETERS as readonly string[]).includes(name)) {
      return { refused: 'trajectory-view-parameter', parameter: name, reason: 'unknown-parameter', allowed: TRAJECTORY_VIEW_PARAMETERS };
    }
    if (seen.has(name)) return { refused: 'trajectory-view-parameter', parameter: name, reason: 'repeated-parameter', allowed: TRAJECTORY_VIEW_PARAMETERS };
    seen.add(name);
  }
  const statuses = Object.keys(STATUS_TO_COLUMN);
  const status = query.get('status');
  if (status !== null && !statuses.includes(status)) {
    return { refused: 'trajectory-view-parameter', parameter: 'status', reason: 'unknown-value', allowed: statuses };
  }
  const intent = query.get('governing-intent');
  if (intent !== null && intent !== 'unknown') {
    return { refused: 'trajectory-view-parameter', parameter: 'governing-intent', reason: 'unknown-value', allowed: ['unknown'] };
  }
  const group = query.get('group');
  if (group !== null && group !== 'parent') {
    return { refused: 'trajectory-view-parameter', parameter: 'group', reason: 'unknown-value', allowed: ['parent'] };
  }
  const selection = query.get('selection');
  if (selection !== null && selection !== 'recent') {
    return { refused: 'trajectory-view-parameter', parameter: 'selection', reason: 'unknown-value', allowed: ['recent'] };
  }
  if (selection === 'recent' && (status !== null || intent !== null || group !== null)) {
    return { refused: 'trajectory-view-parameter', parameter: 'selection', reason: 'incompatible-parameter', allowed: ['changed', 'page=1'] };
  }
  const changed = query.get('changed');
  if (changed !== null && !(CHANGE_WINDOWS as readonly string[]).includes(changed)) {
    return { refused: 'trajectory-view-parameter', parameter: 'changed', reason: 'unknown-value', allowed: [...CHANGE_WINDOWS] };
  }
  const page = query.get('page');
  if (page !== null && !/^[1-9][0-9]*$/.test(page)) {
    return { refused: 'trajectory-view-parameter', parameter: 'page', reason: 'not-a-positive-integer', allowed: ['positive integer'] };
  }
  const changedOnly = changed !== null && seen.size === 1;
  return {
    status: status as WorkItemStatus | null,
    governingIntent: intent === null ? null : 'unknown',
    group: group === 'parent' || changedOnly ? DEFAULT_VIEW.group : null,
    ...(selection === null ? {} : { selection }),
    changed: changed as ChangeWindow | null,
    page: page === null ? 1 : Number(page),
  };
}

/** Does an item carry the governing-intent Unknown POC-REQ-014 counts? */
function carriesGoverningIntentUnknown(item: WorkItemFact): boolean {
  return item.governedBy.label === 'Unknown' && item.governedBy.closedReason === 'source-uncaptured-or-unreachable';
}

/**
 * One narrowed or paged view, computed per request from every served item
 * (never cached): the items matching the request in ascending id, one page
 * of `TRAJECTORY_PAGE_SIZE`. The answers and measures stay over every served
 * item; the counts say what this page renders and what it leaves out. A page
 * past the last is refused; a view with no match renders page 1 empty.
 * Over an Unknown population a well-formed view renders the Unknown board:
 * with no served item there is no view to page and no last page to pass.
 */
export function projectTrajectoryView(
  base: TrajectoryProjection,
  workItems: WorkItemsResult,
  request: TrajectoryViewRequest,
): TrajectoryProjection | TrajectoryViewRefusal {
  if (request.selection === 'recent' && request.page > 1) return pastEnd(1);
  if (base.kind === 'unknown' || workItems.kind === 'unknown') return base;
  const { grouping: _grouping, narrowing, ...population } = base;
  return projectObservedView({ ...population, totalCount: workItems.items.length }, workItems.items, request, narrowing.recentLimits);
}

function projectObservedView(
  base: TrajectoryPopulation,
  served: readonly WorkItemFact[],
  request: TrajectoryViewRequest,
  recentLimits: RecentLimits,
): TrajectoryProjectionObserved | TrajectoryViewRefusal {
  if (request.selection === 'recent') return recentView(base, served, request, recentLimits);
  // syzygy-t3jk.20: the grouped view holds the non-closed set unless a
  // status is asked for, closed included.
  const matching = served
    .filter((item) =>
      (request.status === null ? request.group === null || item.status !== 'closed' : item.status === request.status) &&
      (request.governingIntent === null || carriesGoverningIntentUnknown(item)))
    .sort(byId);
  const narrowed = [
    request.status === null ? (request.group === null ? null : 'a status other than closed') : `status ${request.status}`,
    request.governingIntent === null ? null : 'governing intent Unknown',
  ].filter((part): part is string => part !== null);
  const scope = narrowed.length === 0 ? `all ${served.length} observed items` : `the ${matching.length} observed items with ${narrowed.join(' and ')}`;
  if (request.group === 'parent') return groupedView(base, served, matching, request, scope, recentLimits);

  const pageCount = Math.max(1, Math.ceil(matching.length / TRAJECTORY_PAGE_SIZE));
  if (request.page > pageCount) return pastEnd(pageCount);
  const rendered = matching.slice((request.page - 1) * TRAJECTORY_PAGE_SIZE, request.page * TRAJECTORY_PAGE_SIZE).map(laneItem);
  return {
    ...base,
    selectionRule: `page ${request.page} of ${pageCount} of ${scope}, ${TRAJECTORY_PAGE_SIZE} per page by ascending item id`,
    rendered,
    renderedCount: rendered.length,
    excludedCount: served.length - rendered.length,
    verificationUnknown: { served: served.length, inside: rendered.length, outside: served.length - rendered.length },
    narrowing: narrowingDeclaration(recentLimits, { ...request, matching: matching.length, pageCount }),
  };
}

function pastEnd(pageCount: number): TrajectoryViewRefusal {
  return { refused: 'trajectory-view-parameter', parameter: 'page', reason: 'page-past-end', allowed: [`1 to ${pageCount}`] };
}

const SPECIAL_GROUP_ORDER = ['parent-outside-tracker', 'parent-unobserved', 'no-parent', 'parent-unknown'] as const;
const GROUPED_ORDER = 'parent groups by ascending parent id, then parent-outside-tracker, parent-unobserved, no-parent and parent-unknown; items by ascending id within a group' as const;

/** A group's element id. A parent's is `group-p-<id>`; a class's is
 * `group-<kind>`, and no kind begins `p-`, so an item named like a class
 * (`no-parent`) cannot collide with it (R-T4S2-OUTLINE-1 finding 1). */
export function groupAnchor(key: TrajectoryGroupKey): string {
  return key.kind === 'parent' ? `group-p-${key.id}` : `group-${key.kind}`;
}

/**
 * syzygy-t3jk.20: the matching items grouped by parent. An item sits under
 * each served parent it has, once per parent, and under each class of
 * parent it cannot name; with neither it sits under `no-parent`, and with
 * the dependency rows unread every item sits under `parent-unknown`. Parent
 * groups come first by parent id, then the four classes in their declared
 * order; items by id. Positions are paged; a group split across pages says
 * where it continues. No group states a verdict about its parent.
 */
function groupedView(
  base: TrajectoryPopulation,
  served: readonly WorkItemFact[],
  matching: readonly WorkItemFact[],
  request: TrajectoryViewRequest,
  scope: string,
  recentLimits: RecentLimits,
): TrajectoryProjectionObserved | TrajectoryViewRefusal {
  const outline = base.outline;
  const members = new Map<string, { key: TrajectoryGroupKey; ids: string[] }>();
  const join = (key: TrajectoryGroupKey, id: string): void => {
    const anchor = groupAnchor(key);
    let group = members.get(anchor);
    if (group === undefined) members.set(anchor, (group = { key, ids: [] }));
    group.ids.push(id);
  };
  const outside = new Set(outline.kind === 'observed' ? outline.outsideTracker : []);
  const unobserved = new Set(outline.kind === 'observed' ? outline.unobserved : []);
  for (const item of matching) {
    if (outline.kind === 'unknown') {
      join({ kind: 'parent-unknown', reason: outline.reason }, item.id);
      continue;
    }
    const parents = outline.parents[item.id] ?? [];
    for (const parent of parents) join({ kind: 'parent', id: parent }, item.id);
    if (outside.has(item.id)) join({ kind: 'parent-outside-tracker' }, item.id);
    if (unobserved.has(item.id)) join({ kind: 'parent-unobserved' }, item.id);
    if (parents.length === 0 && !outside.has(item.id) && !unobserved.has(item.id)) join({ kind: 'no-parent' }, item.id);
  }
  const rank = (key: TrajectoryGroupKey): number => key.kind === 'parent' ? -1 : SPECIAL_GROUP_ORDER.indexOf(key.kind);
  const groups = [...members.values()].sort((a, b) =>
    rank(a.key) - rank(b.key) || (a.key.kind === 'parent' && b.key.kind === 'parent' ? (a.key.id < b.key.id ? -1 : 1) : 0));

  const positions = groups.reduce((sum, group) => sum + group.ids.length, 0);
  const pageCount = Math.max(1, Math.ceil(positions / TRAJECTORY_PAGE_SIZE));
  if (request.page > pageCount) return pastEnd(pageCount);

  const pageOf = (position: number): number => Math.floor(position / TRAJECTORY_PAGE_SIZE) + 1;
  const firstPage = new Map<string, number>();
  let start = 0;
  const placed = groups.map((group) => {
    firstPage.set(groupAnchor(group.key), pageOf(start));
    const at = start;
    start += group.ids.length;
    return { group, at };
  });

  const statusById = new Map(served.map((item) => [item.id, item.status]));
  const cardPage = new Map([...served].sort(byId).map((item, index) => [item.id, pageOf(index)]));
  const cycleOf = new Map<string, readonly string[]>();
  if (outline.kind === 'observed') for (const cycle of outline.cycles) for (const id of cycle) cycleOf.set(id, cycle);
  // A cycle's members are listed once, in the group that comes first.
  const cycleNote = (id: string): NonNullable<TrajectoryGroupSlice['parent']>['cycle'] => {
    const cycle = cycleOf.get(id);
    if (cycle === undefined) return null;
    const first = cycle.find((member) => firstPage.has(groupAnchor({ kind: 'parent', id: member })))!;
    return first === id ? { members: cycle } : { statedUnder: first, page: firstPage.get(groupAnchor({ kind: 'parent', id: first })) ?? null };
  };

  const pageStart = (request.page - 1) * TRAJECTORY_PAGE_SIZE;
  const pageEnd = pageStart + TRAJECTORY_PAGE_SIZE;
  const slices: TrajectoryGroupSlice[] = [];
  const onPageIds = new Set<string>();
  for (const { group, at } of placed) {
    const end = at + group.ids.length;
    if (end <= pageStart || at >= pageEnd) continue;
    const onPage = group.ids.slice(Math.max(0, pageStart - at), Math.min(group.ids.length, pageEnd - at));
    for (const id of onPage) onPageIds.add(id);
    const key = group.key;
    const parent = key.kind !== 'parent' ? undefined : {
      status: statusById.get(key.id) as WorkItemStatus,
      cardPage: cardPage.get(key.id) as number,
      under: (outline.kind === 'observed' ? outline.parents[key.id] ?? [] : []).map((id) => ({ id, groupPage: firstPage.get(groupAnchor({ kind: 'parent', id })) ?? null, cardPage: cardPage.get(id) as number })),
      cycle: cycleNote(key.id),
    };
    slices.push({
      key,
      anchor: groupAnchor(key),
      total: group.ids.length,
      onPage,
      continuedFromPage: at < pageStart ? request.page - 1 : null,
      continuesOnPage: end > pageEnd ? request.page + 1 : null,
      ...(parent === undefined ? {} : { parent }),
    });
  }
  const rendered = matching.filter((item) => onPageIds.has(item.id)).map(laneItem);
  return {
    ...base,
    selectionRule: `page ${request.page} of ${pageCount} of ${scope}, grouped by parent: ${positions} positions, since an item with several parents sits under each; ${TRAJECTORY_PAGE_SIZE} positions per page, parent groups by ascending parent id, then items whose parent is outside this tracker, not served, absent or unread; items by ascending id`,
    rendered,
    renderedCount: rendered.length,
    excludedCount: served.length - rendered.length,
    verificationUnknown: { served: served.length, inside: rendered.length, outside: served.length - rendered.length },
    grouping: { positions, groups: slices },
    narrowing: narrowingDeclaration(recentLimits, { ...request, matching: matching.length, pageCount }),
  };
}

/** Sets of served items whose parent links form a cycle (Tarjan, iterative:
 * a deep chain must not exhaust the stack). A self-parent is a cycle of one. */
function parentCycles(parents: ReadonlyMap<string, readonly string[]>): string[][] {
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const cycles: string[][] = [];
  let next = 0;
  for (const root of [...parents.keys()].sort()) {
    if (index.has(root)) continue;
    const work: { id: string; edge: number }[] = [{ id: root, edge: 0 }];
    index.set(root, next); low.set(root, next); next++; stack.push(root); onStack.add(root);
    while (work.length > 0) {
      const frame = work[work.length - 1]!;
      const edges = parents.get(frame.id) ?? [];
      if (frame.edge < edges.length) {
        const target = edges[frame.edge++]!;
        if (!index.has(target)) {
          index.set(target, next); low.set(target, next); next++; stack.push(target); onStack.add(target);
          work.push({ id: target, edge: 0 });
        } else if (onStack.has(target)) {
          low.set(frame.id, Math.min(low.get(frame.id)!, index.get(target)!));
        }
        continue;
      }
      work.pop();
      if (work.length > 0) {
        const caller = work[work.length - 1]!.id;
        low.set(caller, Math.min(low.get(caller)!, low.get(frame.id)!));
      }
      if (low.get(frame.id) === index.get(frame.id)) {
        const members: string[] = [];
        let member: string;
        do {
          member = stack.pop()!;
          onStack.delete(member);
          members.push(member);
        } while (member !== frame.id);
        if (members.length > 1 || (parents.get(frame.id) ?? []).includes(frame.id)) cycles.push(members.sort());
      }
    }
  }
  return cycles.sort((a, b) => (a[0]! < b[0]! ? -1 : 1));
}

function projectOutline(dependencies: WorkItemDependencyObservation): TrajectoryOutline {
  if (dependencies.kind === 'unknown') return { kind: 'unknown', reason: dependencies.reason };
  const facts = dependencies.parentFacts;
  return {
    kind: 'observed',
    parents: Object.fromEntries([...facts.parents].sort(([a], [b]) => (a < b ? -1 : 1))),
    outsideTracker: [...facts.outsideTracker].sort(),
    unobserved: [...facts.unobserved].sort(),
    cycles: parentCycles(facts.parents),
  };
}

export interface TrajectoryProjectionUnknown {
  readonly kind: 'unknown';
  readonly reason: string;
  /** POC-REQ-044: all five answers, each Unknown under `region:work-items`. */
  readonly answers: readonly TrajectoryAnswer[];
}

export type TrajectoryProjection = TrajectoryProjectionObserved | TrajectoryProjectionUnknown;

interface RecentLimits {
  readonly nonClosedLimit: number;
  readonly recentClosedWindow: number;
}

interface ProjectTrajectoryOptions extends RecentLimits {
  /** Absent: nothing was materialized, so the chain has no member. */
  readonly reconciliationChain?: ReconciliationChainInput;
  readonly dependencies?: WorkItemDependencyObservation;
  /** syzygy-t3jk.21: the history read's windows; absent reads as unread. */
  readonly changes?: readonly ChangeWindowObservation[];
  /** POC-REQ-065: the commit join; absent reads as Unknown. */
  readonly commitJoins?: CommitJoinsResult;
}

/** RFC2-18: only materialized work that reached merge enters the chain.
 * Nothing materialized is an observed 0; a materialized item whose worker
 * change could not be observed is Unknown, never 0. */
function chainMembers(input: ReconciliationChainInput | undefined): number | TrajectoryAnswerUnknown {
  if (input === undefined || input.materializedBeadId === null) return 0;
  if (input.workerChange === null || input.workerChange.kind === 'unknown') return { state: 'unknown', disclosure: TRAJECTORY_CHAIN_MEMBERSHIP_ID };
  return input.workerChange.state === 'changed-or-merged' ? 1 : 0;
}

/** syzygy-t3jk.21: a window as the changed answer carries it. */
export type TrajectoryChangeWindow =
  | (Extract<ChangeWindowObservation, { kind: 'observed' }>)
  | (Extract<ChangeWindowObservation, { kind: 'unknown' }> & { readonly disclosure: typeof TRAJECTORY_CHANGED_ID });

function changeWindows(changes: readonly ChangeWindowObservation[] | undefined): readonly TrajectoryChangeWindow[] {
  const unread: readonly ChangeWindowObservation[] = CHANGE_WINDOWS.map((window) => ({ window, kind: 'unknown', reason: window === 'since-last' ? 'no-previous-evaluation-recorded' : 'history-not-read' }));
  return (changes ?? unread).map((window) => (window.kind === 'unknown' ? { ...window, disclosure: TRAJECTORY_CHANGED_ID } : window));
}

function observedAnswers(workItems: Extract<WorkItemsResult, { kind: 'observed' }>, chain: ReconciliationChainInput | undefined, changes: readonly ChangeWindowObservation[] | undefined, joins: CommitJoinsResult | undefined): readonly TrajectoryAnswer[] {
  const byStatus = Object.fromEntries(Object.keys(STATUS_TO_COLUMN).map((status) => [status, 0])) as Record<WorkItemStatus, number>;
  for (const item of workItems.items) byStatus[item.status] += 1;
  const served = workItems.items.length;
  return [
    { id: 'remains', state: 'observed', byStatus, served, closedLanding: closedLanding(workItems.items, joins) },
    { id: 'running', state: 'observed', claimed: byStatus.in_progress, served, liveness: 'activity-undetermined' },
    { id: 'changed', state: 'observed', windows: changeWindows(changes) },
    { id: 'cost', state: 'unknown', disclosure: TRAJECTORY_COST_ID },
    {
      id: 'intent',
      state: 'observed',
      unknownProvenance: { count: workItems.governedByUnknownCount, served, disclosure: GOVERNING_INTENT_REGION_ID },
      reconciliationChain: {
        members: chainMembers(chain),
        materialized: chain === undefined || chain.materializedBeadId === null ? 0 : 1,
        memberEvidence: 'reconciliation-evidence-absent',
      },
      orphanedWork: { state: 'unknown', disclosure: TRAJECTORY_ORPHANED_WORK_ID, served },
    },
  ];
}

function byId(a: WorkItemFact, b: WorkItemFact): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function itemEligibility(item: WorkItemFact, dependencies: WorkItemDependencyObservation, pageById: ReadonlyMap<string, number>): TrajectoryItemEligibility | null {
  if (item.status === 'closed') return null;
  if (dependencies.kind === 'unknown') {
    return {
      state: 'eligibility-undetermined',
      reasons: [dependencies.reason],
      ...(item.status === 'blocked' ? { block: { causes: [], blockers: [] } } : {}),
    };
  }
  if (item.status === 'in_progress' || item.status === 'pinned' || item.status === 'hooked') return null;

  const facts = dependencies.byItem.get(item.id);
  const reasons = DEPENDENCY_EDGE_REASONS.filter((reason) => facts?.reasons.has(reason));
  const blockers = [...(facts?.blockers ?? [])].sort().flatMap((id) => {
    const page = pageById.get(id);
    return page === undefined ? [] : [{ id, page }];
  });
  const block: NonNullable<TrajectoryItemEligibility['block']> = {
    blockers,
    causes: blockers.length > 0 ? ['dependency'] : [],
  };
  if (reasons.length > 0) {
    return { state: 'eligibility-undetermined', reasons, ...(item.status === 'blocked' ? { block } : {}) };
  }
  if (item.status === 'deferred') return { state: 'planned', reasons: ['tracker-deferred'] };
  if (item.status === 'blocked' || blockers.length > 0) return { state: 'blocked', reasons: [], block };
  return { state: 'ready', reasons: [] };
}

function projectEligibility(sorted: readonly WorkItemFact[], dependencies: WorkItemDependencyObservation): TrajectoryEligibility {
  const pageById = new Map(sorted.map((item, index) => [item.id, Math.floor(index / TRAJECTORY_PAGE_SIZE) + 1]));
  const counts = { ready: 0, planned: 0, blocked: 0, 'eligibility-undetermined': 0, absent: 0 };
  const items: [string, TrajectoryItemEligibility][] = [];
  let served = 0;
  for (const item of sorted) {
    if (item.status === 'closed') continue;
    served++;
    const eligibility = itemEligibility(item, dependencies, pageById);
    if (eligibility === null) counts.absent++;
    else {
      counts[eligibility.state]++;
      items.push([item.id, eligibility]);
    }
  }
  const feed = dependencies.kind === 'unknown' ? dependencies : { kind: 'observed' as const, counts: dependencies.counts };
  return { served, counts, feed, items: Object.fromEntries(items) };
}

/** Missing or invalid recorded times rank last; never substitute another field. */
function newestFirst(a: string | null, b: string | null): number {
  const aTime = recordedInstant(a);
  const bTime = recordedInstant(b);
  if (aTime === bTime) return 0;
  if (aTime === null) return 1;
  if (bTime === null) return -1;
  return aTime > bTime ? -1 : 1;
}

function laneItem(item: WorkItemFact): TrajectoryLaneItem {
  return {
    id: item.id,
    status: item.status,
    column: STATUS_TO_COLUMN[item.status],
    priority: item.priority,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    closedAt: item.closedAt,
    // No verification/test-evidence source is ingested by this POC slice;
    // closure or merge activity is never rendered as satisfaction
    // (POC-REQ-043) — the field is always the disclosed Unknown.
    verification: 'unknown',
  };
}

/** Recorded update and closure instants determine membership, then cards
 * keep ascending id order within each column. */
function recentView(
  base: TrajectoryPopulation,
  served: readonly WorkItemFact[],
  request: TrajectoryViewRequest,
  recentLimits: RecentLimits,
): TrajectoryProjectionObserved {
  const open = served
    .filter((item) => item.status !== 'closed')
    .sort((a, b) => newestFirst(a.updatedAt, b.updatedAt) || byId(a, b))
    .slice(0, recentLimits.nonClosedLimit);
  const closed = served
    .filter((item) => item.status === 'closed')
    .sort((a, b) => newestFirst(a.closedAt, b.closedAt) || byId(a, b))
    .slice(0, recentLimits.recentClosedWindow);

  const rendered = [...open, ...closed].sort(byId).map(laneItem);
  return {
    ...base,
    selectionRule: `up to ${recentLimits.nonClosedLimit} most recently updated non-closed items, plus up to ${recentLimits.recentClosedWindow} most recently closed items; missing, invalid or timezone-less times last, timestamp ties and card order by ascending item id`,
    rendered,
    renderedCount: rendered.length,
    excludedCount: served.length - rendered.length,
    verificationUnknown: { served: served.length, inside: rendered.length, outside: served.length - rendered.length },
    narrowing: narrowingDeclaration(recentLimits, { ...request, matching: rendered.length, pageCount: 1 }),
  };
}

/** The same parent-grouped first page feeds the machine answer and the
 * human route. Every temporal value comes from the captured observation. */
export function projectTrajectory(
  workItems: WorkItemsResult,
  options: ProjectTrajectoryOptions,
): TrajectoryProjection {
  if (workItems.kind === 'unknown') {
    return {
      kind: 'unknown',
      reason: workItems.reason,
      answers: TRAJECTORY_ANSWER_ORDER.map((id) => ({ id, state: 'unknown', disclosure: WORK_ITEMS_REGION_ID })),
    };
  }

  const sorted = [...workItems.items].sort(byId);
  const dependencies = options.dependencies ?? { kind: 'unknown', reason: 'work-item-revision-unavailable' };
  const population: TrajectoryPopulation = {
    kind: 'observed',
    doltRevision: workItems.provenance.revision,
    totalCount: sorted.length,
    timeMeasures: trajectoryTimeMeasures(workItems.items, workItems.capturedAt),
    eligibility: projectEligibility(sorted, dependencies),
    answers: observedAnswers(workItems, options.reconciliationChain, options.changes, options.commitJoins),
    outline: projectOutline(dependencies),
  };
  const { nonClosedLimit, recentClosedWindow } = options;
  const view = projectObservedView(population, sorted, DEFAULT_VIEW, { nonClosedLimit, recentClosedWindow });
  if ('refused' in view) throw new Error('The first Trajectory outline page must exist');
  return view;
}
