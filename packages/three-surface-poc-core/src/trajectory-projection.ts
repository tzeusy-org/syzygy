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
export const TRAJECTORY_RUNNING_LIVENESS_ID = 'region:trajectory-running-liveness' as const;
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
      readonly liveness: TrajectoryAnswerUnknown;
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
        readonly memberEvidence: 'reconciliation-evidence-absent';
      };
      /** RFC8-8: no orphaned-work check runs, so the count is Unknown. */
      readonly orphanedWork: TrajectoryAnswerUnknown;
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
  readonly timeRange: { readonly earliest: string; readonly latest: string } | null;
  /** POC-REQ-044: the five answers, in TRAJECTORY_ANSWER_ORDER. */
  readonly answers: readonly TrajectoryAnswer[];
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
    { id: 'running', state: 'observed', claimed: byStatus.in_progress, served, liveness: { state: 'unknown', disclosure: TRAJECTORY_RUNNING_LIVENESS_ID } },
    { id: 'changed', state: 'unknown', disclosure: TRAJECTORY_CHANGED_ID },
    { id: 'cost', state: 'unknown', disclosure: TRAJECTORY_COST_ID },
    {
      id: 'intent',
      state: 'observed',
      unknownProvenance: { count: workItems.governedByUnknownCount, served, disclosure: GOVERNING_INTENT_REGION_ID },
      reconciliationChain: { members: chainMembers(chain), memberEvidence: 'reconciliation-evidence-absent' },
      orphanedWork: { state: 'unknown', disclosure: TRAJECTORY_ORPHANED_WORK_ID },
    },
  ];
}

function byId(a: WorkItemFact, b: WorkItemFact): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Explicit offsets only: the host timezone must never select a different item. */
function recordedInstant(value: string | null): bigint | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(?:\.(\d{1,9}))?(Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.exec(value ?? '');
  if (match === null) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > days[month - 1]!) return null;
  // Calendar validity is checked before Date.parse, which otherwise rolls
  // impossible dates forward. Parse whole seconds, retaining up to nine
  // fractional digits separately so sub-millisecond updates remain ordered.
  const milliseconds = Date.parse(`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}${match[8]}`);
  if (!Number.isFinite(milliseconds)) return null;
  return BigInt(milliseconds) * 1_000_000n + BigInt((match[7] ?? '').padEnd(9, '0'));
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

  const instants = rendered.flatMap((item) =>
    [item.createdAt, item.updatedAt, item.closedAt ?? undefined].filter(
      (value): value is string => value !== undefined,
    ),
  );
  const timeRange =
    instants.length === 0
      ? null
      : {
          earliest: instants.reduce((min, value) => (value < min ? value : min)),
          latest: instants.reduce((max, value) => (value > max ? value : max)),
        };

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
    timeRange,
    answers: observedAnswers(workItems, options.reconciliationChain),
  };
}
