import { isRecord } from '@syzygy/support';
import { STEP_LOG_FORMAT } from './check-model.js';

/** Stage timings, check revisions and reviewer rounds, derived at close from the bounded step-log snapshot that also gives the record's
 * existing `steps` view (REQ-polaris-generation-033 version 2.31; syzygy-5dhm.25).
 *
 * The step log lies within the agent sessions' write reach, so a complete usable log yields an Inferred projection, never an Observed
 * one. A log that is absent, unreadable, empty, malformed inside its retained prefix or longer than that prefix yields one Unknown
 * projection with a fixed reason, and a single measure whose evidence is missing or unusable is Unknown with its own fixed reason:
 * a missing measurement is never zero (VIS-2). The projection carries only numbers, closed labels and fixed reasons: no instant, step
 * field or stored text is copied (SEC-5).
 *
 * Every interval starts at the first retained instant. The close interval ends at the captured `closedAt` clock value, which precedes
 * the close step this command appends, so it is no close command duration; none of the intervals claims command duration, session effort
 * or attendance.
 *
 * Reviewer rounds are tallied per kind in physical order. A `session-prompt` row with role `review` and outcome `issued` opens round 1
 * of its session; one with outcome `delivered` opens its recorded round. Session and round must be positive integers, unique as a pair
 * within the kind, or that kind is Unknown. The next `review-check` row of the kind with outcome `validated`, before a newer opener, pairs
 * once with the pending round; a newer opener replaces the pending one, which stays unfinished. `await` rows and refused checks neither
 * open nor pair. The pairing is evidence of the stored order only: a check carries no session or round of its own. */

export const STEP_MEASURES_FORMAT = 'polaris-dossier-step-measures/1';
/** The retained prefix: the first 10,000 nonempty lines of the step log, in physical order. */
export const STEP_LINES_MAX = 10_000;
export const STEP_MEASURES_BASIS = 'derived by Syzygy at close from the same bounded step-log read as the steps view; the operator agent can write that log, so the projection is Inferred, and a measure the log cannot support is Unknown, never zero';
export const REVIEW_KINDS = ['fidelity', 'design'] as const;
export type ReviewKind = (typeof REVIEW_KINDS)[number];

/** Token, turn, cache, cost and tool-runtime totals attributable to either agent tool: Syzygy holds no tool-owned receipt for them. */
export const TOOL_OWNED_USAGE = { label: 'Unknown', why: 'no-tool-owned-receipt' } as const;

export type LogUnknownReason =
  | 'step-log-absent' | 'step-log-unreadable' | 'step-log-empty' | 'step-log-malformed-row' | 'step-log-over-retained-limit';
export type MeasureUnknown<W extends string> = { readonly state: 'unknown'; readonly why: W };
export type Interval = { readonly state: 'measured'; readonly ms: number } | MeasureUnknown<'no-ending-observation' | 'ending-before-start'>;
export type Revisions = { readonly state: 'counted'; readonly distinct: number } | MeasureUnknown<'no-completed-check' | 'unusable-revision'>;
export type PairedMs = { readonly state: 'measured'; readonly ms: number } | MeasureUnknown<'no-paired-round' | 'paired-interval-backwards' | 'sum-not-exact-integer'>;
export type Rounds =
  | { readonly state: 'counted'; readonly opened: number; readonly paired: number; readonly unfinished: number; readonly pairedMs: PairedMs }
  | MeasureUnknown<'invalid-round-identity' | 'repeated-round-identity'>;
export interface RowCounts { readonly retained: number; readonly rejected: number; readonly omitted: number }

interface Head { readonly format: typeof STEP_MEASURES_FORMAT; readonly basis: typeof STEP_MEASURES_BASIS; readonly toolOwnedUsage: typeof TOOL_OWNED_USAGE }
export type StepMeasures =
  | (Head & {
    readonly label: 'Inferred';
    readonly rows: RowCounts;
    readonly elapsedMs: {
      readonly toClose: Interval;
      readonly toFirstDraftCheckAttempt: Interval;
      readonly toFirstPassedDraftCheck: Interval;
      readonly toFirstPassedInventoryCheck: Interval;
      readonly toFirstRender: Interval;
    };
    readonly revisions: { readonly draft: Revisions; readonly inventory: Revisions };
    readonly reviewRounds: Readonly<Record<ReviewKind, Rounds>>;
  })
  | (Head & { readonly label: 'Unknown'; readonly why: LogUnknownReason; readonly rows?: RowCounts })
  | (Head & { readonly label: 'Unknown'; readonly why: 'record-capacity' });

/** One bounded read of the step log: absent, unreadable, or its nonempty lines in physical order. */
export type StepLogSnapshot =
  | { readonly state: 'absent' }
  | { readonly state: 'unreadable'; readonly why: string }
  | { readonly state: 'read'; readonly lines: readonly string[] };

interface Row {
  readonly step: string;
  readonly ms: number;
  readonly outcome: unknown;
  readonly role: unknown;
  readonly kind: unknown;
  readonly revision: unknown;
  readonly session: unknown;
  readonly round: unknown;
}

const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const head: Head = { format: STEP_MEASURES_FORMAT, basis: STEP_MEASURES_BASIS, toolOwnedUsage: TOOL_OWNED_USAGE };

/** The instant's milliseconds when `at` is a valid UTC instant in the form Syzygy's steps write; null otherwise (2026-02-30 included). */
export function utcInstantMs(at: unknown): number | null {
  if (typeof at !== 'string' || !INSTANT.test(at)) return null;
  const ms = Date.parse(at);
  return Number.isNaN(ms) || new Date(ms).toISOString() !== at ? null : ms;
}

/** One retained line as a `polaris-dossier-step/1` row with a valid UTC instant; null for any other line. */
function readRow(line: string): Row | null {
  let entry: unknown;
  try { entry = JSON.parse(line); } catch { return null; }
  if (!isRecord(entry) || entry['format'] !== STEP_LOG_FORMAT || typeof entry['step'] !== 'string') return null;
  const ms = utcInstantMs(entry['at']);
  if (ms === null) return null;
  return {
    step: entry['step'], ms, outcome: entry['outcome'], role: entry['role'], kind: entry['kind'],
    revision: entry['revision'], session: entry['session'], round: entry['round'],
  };
}

const positive = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
const nonnegative = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

function interval(start: number, end: number | undefined): Interval {
  if (end === undefined) return { state: 'unknown', why: 'no-ending-observation' };
  if (end < start) return { state: 'unknown', why: 'ending-before-start' };
  return { state: 'measured', ms: end - start };
}

function revisions(rows: readonly Row[], step: string): Revisions {
  const completed = rows.filter((row) => row.step === step && (row.outcome === 'passed' || row.outcome === 'findings'));
  if (completed.length === 0) return { state: 'unknown', why: 'no-completed-check' };
  if (!completed.every((row) => nonnegative(row.revision))) return { state: 'unknown', why: 'unusable-revision' };
  return { state: 'counted', distinct: new Set(completed.map((row) => row.revision)).size };
}

function rounds(rows: readonly Row[], kind: ReviewKind): Rounds {
  const seen = new Set<string>();
  let pending: Row | null = null;
  let opened = 0, paired = 0, unfinished = 0, sum = 0, backwards = false;
  for (const row of rows) {
    if (row.kind !== kind) continue;
    if (row.step === 'session-prompt' && row.role === 'review' && (row.outcome === 'issued' || row.outcome === 'delivered')) {
      const round = row.outcome === 'issued' ? 1 : row.round;
      if (!positive(row.session) || !positive(round)) return { state: 'unknown', why: 'invalid-round-identity' };
      const identity = `${row.session}/${round}`;
      if (seen.has(identity)) return { state: 'unknown', why: 'repeated-round-identity' };
      seen.add(identity);
      if (pending !== null) unfinished++;
      pending = row;
      opened++;
    } else if (row.step === 'review-check' && row.outcome === 'validated' && pending !== null) {
      paired++;
      if (row.ms < pending.ms) backwards = true; else sum += row.ms - pending.ms;
      pending = null;
    }
  }
  if (pending !== null) unfinished++;
  const pairedMs: PairedMs = backwards ? { state: 'unknown', why: 'paired-interval-backwards' }
    : paired === 0 ? { state: 'unknown', why: 'no-paired-round' }
      : !Number.isSafeInteger(sum) ? { state: 'unknown', why: 'sum-not-exact-integer' }
        : { state: 'measured', ms: sum };
  return { state: 'counted', opened, paired, unfinished, pairedMs };
}

/** The measures of one step-log snapshot, the close interval ending at `closedAt` (Syzygy's clock, milliseconds). */
export function stepMeasures(snapshot: StepLogSnapshot, closedAt: number): StepMeasures {
  if (snapshot.state === 'absent') return { ...head, label: 'Unknown', why: 'step-log-absent' };
  if (snapshot.state === 'unreadable') return { ...head, label: 'Unknown', why: 'step-log-unreadable' };
  const prefix = snapshot.lines.slice(0, STEP_LINES_MAX);
  const parsed = prefix.map(readRow);
  const rows = parsed.filter((row): row is Row => row !== null);
  const counts: RowCounts = { retained: rows.length, rejected: prefix.length - rows.length, omitted: snapshot.lines.length - prefix.length };
  const why: LogUnknownReason | null = prefix.length === 0 ? 'step-log-empty'
    : counts.rejected > 0 ? 'step-log-malformed-row'
      : counts.omitted > 0 ? 'step-log-over-retained-limit'
        : null;
  if (why !== null) return { ...head, label: 'Unknown', why, rows: counts };
  const start = rows[0]!.ms;
  const first = (predicate: (row: Row) => boolean): number | undefined => rows.find(predicate)?.ms;
  return {
    ...head,
    label: 'Inferred',
    rows: counts,
    elapsedMs: {
      toClose: interval(start, closedAt),
      toFirstDraftCheckAttempt: interval(start, first((row) => row.step === 'check')),
      toFirstPassedDraftCheck: interval(start, first((row) => row.step === 'check' && row.outcome === 'passed')),
      toFirstPassedInventoryCheck: interval(start, first((row) => row.step === 'inventory-check' && row.outcome === 'passed')),
      toFirstRender: interval(start, first((row) => row.step === 'render' && row.outcome === 'rendered')),
    },
    revisions: { draft: revisions(rows, 'check'), inventory: revisions(rows, 'inventory-check') },
    reviewRounds: { fidelity: rounds(rows, 'fidelity'), design: rounds(rows, 'design') },
  };
}

/** The projection that replaces the full measures when the record has no room for them. */
export const CAPACITY_UNKNOWN: StepMeasures = { ...head, label: 'Unknown', why: 'record-capacity' };
