import { recordedInstant, trajectoryTimeMeasures, type TrajectoryTimeMeasures } from './trajectory-time-measures.js';
import type { WorkItemFact, WorkItemsResult, WorkItemStatus } from './work-items.js';

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

/** POC-REQ-044. Every count is over all served work items, never the
 * rendered selection. No answer is omitted for being Unknown. */
export type TrajectoryAnswer =
  | {
      readonly id: 'remains';
      readonly state: 'observed';
      /** Served items per tracker status, every status listed; sums to `served`. */
      readonly byStatus: Readonly<Record<WorkItemStatus, number>>;
      readonly served: number;
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
  | ({ readonly id: 'changed' | 'cost' } & TrajectoryAnswerUnknown)
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

interface TrajectoryProjectionObserved {
  readonly kind: 'observed';
  readonly doltRevision: string;
  readonly selectionRule: string;
  readonly rendered: readonly TrajectoryLaneItem[];
  readonly renderedCount: number;
  readonly excludedCount: number;
  readonly totalCount: number;
  /** POC-REQ-043 (syzygy-t3jk.15): verification is Unknown for every served
   * item (no evidence source is ingested); `inside` are rendered, `outside`
   * are served but outside the selection. Both channels read these. */
  readonly verificationUnknown: { readonly served: number; readonly inside: number; readonly outside: number };
  /** POC-REQ-045 (syzygy-t3jk.17): elapsed-time measures over every served item. */
  readonly timeMeasures: TrajectoryTimeMeasures;
  /** POC-REQ-044: the five answers, in TRAJECTORY_ANSWER_ORDER. */
  readonly answers: readonly TrajectoryAnswer[];
  /** POC-REQ-042 (syzygy-t3jk.18): the declared narrowing and paging, and
   * the view this projection renders (null: the default selection). */
  readonly narrowing: TrajectoryNarrowing;
}

/** The closed query parameter set of GET /trajectory (POC-REQ-042). */
export const TRAJECTORY_VIEW_PARAMETERS = ['status', 'governing-intent', 'page'] as const;
export type TrajectoryViewParameter = (typeof TRAJECTORY_VIEW_PARAMETERS)[number];
/** Items per page of a narrowed or paged view, in ascending item id. */
export const TRAJECTORY_PAGE_SIZE = 250;

export interface TrajectoryViewRequest {
  readonly status: WorkItemStatus | null;
  readonly governingIntent: 'unknown' | null;
  readonly page: number;
}

export interface TrajectoryNarrowing {
  readonly parameters: {
    readonly status: readonly WorkItemStatus[];
    readonly 'governing-intent': readonly ['unknown'];
    readonly page: 'positive integer';
  };
  readonly pageSize: number;
  readonly order: 'ascending item id';
  readonly view: (TrajectoryViewRequest & { readonly matching: number; readonly pageCount: number }) | null;
}

export interface TrajectoryViewRefusal {
  readonly refused: 'trajectory-view-parameter';
  readonly parameter: string;
  readonly reason: 'unknown-parameter' | 'repeated-parameter' | 'unknown-value' | 'not-a-positive-integer' | 'page-past-end';
  readonly allowed: readonly string[];
}

function narrowingDeclaration(view: TrajectoryNarrowing['view']): TrajectoryNarrowing {
  return {
    parameters: { status: Object.keys(STATUS_TO_COLUMN) as WorkItemStatus[], 'governing-intent': ['unknown'], page: 'positive integer' },
    pageSize: TRAJECTORY_PAGE_SIZE,
    order: 'ascending item id',
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
  const page = query.get('page');
  if (page !== null && !/^[1-9][0-9]*$/.test(page)) {
    return { refused: 'trajectory-view-parameter', parameter: 'page', reason: 'not-a-positive-integer', allowed: ['positive integer'] };
  }
  return { status: status as WorkItemStatus | null, governingIntent: intent === null ? null : 'unknown', page: page === null ? 1 : Number(page) };
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
  if (base.kind === 'unknown' || workItems.kind === 'unknown') return base;
  const matching = [...workItems.items]
    .filter((item) => (request.status === null || item.status === request.status) && (request.governingIntent === null || carriesGoverningIntentUnknown(item)))
    .sort(byId);
  const pageCount = Math.max(1, Math.ceil(matching.length / TRAJECTORY_PAGE_SIZE));
  if (request.page > pageCount) {
    return { refused: 'trajectory-view-parameter', parameter: 'page', reason: 'page-past-end', allowed: [`1 to ${pageCount}`] };
  }
  const rendered = matching.slice((request.page - 1) * TRAJECTORY_PAGE_SIZE, request.page * TRAJECTORY_PAGE_SIZE).map(laneItem);
  const narrowed = [
    request.status === null ? null : `status ${request.status}`,
    request.governingIntent === null ? null : 'governing intent Unknown',
  ].filter((part): part is string => part !== null);
  const scope = narrowed.length === 0 ? `all ${workItems.items.length} observed items` : `the ${matching.length} observed items with ${narrowed.join(' and ')}`;
  return {
    ...base,
    selectionRule: `page ${request.page} of ${pageCount} of ${scope}, ${TRAJECTORY_PAGE_SIZE} per page by ascending item id`,
    rendered,
    renderedCount: rendered.length,
    excludedCount: workItems.items.length - rendered.length,
    totalCount: workItems.items.length,
    verificationUnknown: { served: workItems.items.length, inside: rendered.length, outside: workItems.items.length - rendered.length },
    narrowing: narrowingDeclaration({ ...request, matching: matching.length, pageCount }),
  };
}

export interface TrajectoryProjectionUnknown {
  readonly kind: 'unknown';
  readonly reason: string;
  /** POC-REQ-044: all five answers, each Unknown under `region:work-items`. */
  readonly answers: readonly TrajectoryAnswer[];
}

export type TrajectoryProjection = TrajectoryProjectionObserved | TrajectoryProjectionUnknown;

interface ProjectTrajectoryOptions {
  readonly nonClosedLimit: number;
  readonly recentClosedWindow: number;
  /** Absent: nothing was materialized, so the chain has no member. */
  readonly reconciliationChain?: ReconciliationChainInput;
}

/** RFC2-18: only materialized work that reached merge enters the chain.
 * Nothing materialized is an observed 0; a materialized item whose worker
 * change could not be observed is Unknown, never 0. */
function chainMembers(input: ReconciliationChainInput | undefined): number | TrajectoryAnswerUnknown {
  if (input === undefined || input.materializedBeadId === null) return 0;
  if (input.workerChange === null || input.workerChange.kind === 'unknown') return { state: 'unknown', disclosure: TRAJECTORY_CHAIN_MEMBERSHIP_ID };
  return input.workerChange.state === 'changed-or-merged' ? 1 : 0;
}

function observedAnswers(workItems: Extract<WorkItemsResult, { kind: 'observed' }>, chain: ReconciliationChainInput | undefined): readonly TrajectoryAnswer[] {
  const byStatus = Object.fromEntries(Object.keys(STATUS_TO_COLUMN).map((status) => [status, 0])) as Record<WorkItemStatus, number>;
  for (const item of workItems.items) byStatus[item.status] += 1;
  const served = workItems.items.length;
  return [
    { id: 'remains', state: 'observed', byStatus, served },
    { id: 'running', state: 'observed', claimed: byStatus.in_progress, served, liveness: 'activity-undetermined' },
    { id: 'changed', state: 'unknown', disclosure: TRAJECTORY_CHANGED_ID },
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

/**
 * Deterministic per observation (POC-REQ-041): every temporal value comes
 * from `item.createdAt/updatedAt/closedAt`, never a render-time clock.
 * Both populations are capped, ranked by their recorded update/closure
 * times and then id. Cards keep ascending id order within each column.
 */
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
  const open = sorted
    .filter((item) => item.status !== 'closed')
    .sort((a, b) => newestFirst(a.updatedAt, b.updatedAt) || byId(a, b))
    .slice(0, options.nonClosedLimit);
  const closed = sorted
    .filter((item) => item.status === 'closed')
    .sort((a, b) => newestFirst(a.closedAt, b.closedAt) || byId(a, b))
    .slice(0, options.recentClosedWindow);

  const renderedIds = new Set<string>([...open.map((item) => item.id), ...closed.map((item) => item.id)]);
  const rendered = sorted.filter((item) => renderedIds.has(item.id)).map(laneItem);


  return {
    kind: 'observed',
    doltRevision: workItems.provenance.revision,
    selectionRule: `up to ${options.nonClosedLimit} most recently updated non-closed items, plus up to ${options.recentClosedWindow} most recently closed items; missing, invalid or timezone-less times last, timestamp ties and card order by ascending item id`,
    rendered,
    renderedCount: rendered.length,
    excludedCount: workItems.items.length - rendered.length,
    totalCount: workItems.items.length,
    verificationUnknown: {
      served: workItems.items.length,
      inside: rendered.filter((item) => item.verification === 'unknown').length,
      outside: workItems.items.length - rendered.filter((item) => item.verification === 'unknown').length,
    },
    timeMeasures: trajectoryTimeMeasures(workItems.items, workItems.capturedAt),
    answers: observedAnswers(workItems, options.reconciliationChain),
    narrowing: narrowingDeclaration(null),
  };
}
