import { isRecord } from '@syzygy/support';

/** Stage timings, draft and inventory revisions and review rounds, derived at close from the run's step log (syzygy-5dhm.25, pursuit
 * 2026-11-21b move R3 slice 1; REQ-polaris-generation-033 version 2.27).
 *
 * The step log lies within the agent sessions' write reach, so every figure is Inferred, never Observed. A figure whose rows the log does
 * not carry is Unknown with its reason, never zero (VIS-2): no check row means the time to the first check is Unknown, and no delivered
 * review prompt of a kind means that kind's rounds are Unknown. A count inside a counted figure may be zero (a round with no refused
 * submission), since the rows it counts over are present.
 *
 * The round predicate is the one `scripts/dossier_stored_run_measures.py` (figure f) states over the stored runs: a round opens at a
 * `session-prompt` row with role `review`, a kind and outcome `delivered` (or `issued`, the handover mode's prompt), and ends at the next
 * `review-check` row of the same kind with outcome `validated`; the `review-check` rows of that kind with outcome `refused` between are its
 * refused submissions. A round no validated row ends is unfinished and adds no time. Every duration is in whole milliseconds between two
 * logged instants. */

export const STEP_MEASURES_BASIS = 'derived by Syzygy at close from the run\'s step log, which the agent sessions can write; every figure is Inferred, and a figure whose rows the log does not carry is Unknown, never zero';

export const ROUND_PREDICATE = 'a round opens at a session-prompt row with role review, a kind and outcome delivered or issued, and ends at the next review-check row of that kind with outcome validated; the review-check rows of that kind with outcome refused between are its refused submissions; a round no validated row ends is unfinished and adds no time';

const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;
export const REVIEW_KINDS = ['fidelity', 'design'] as const;
export type ReviewKind = (typeof REVIEW_KINDS)[number];

export interface StepRow {
  readonly step: string;
  readonly at: string;
  readonly ms: number;
  readonly outcome: string | null;
  readonly role: string | null;
  readonly kind: string | null;
  readonly revision: number | null;
  readonly round: number | null;
  readonly session: number | null;
}

export type Unknown = { readonly state: 'unknown'; readonly why: string };
export type Span = { readonly state: 'measured'; readonly ms: number; readonly from: string; readonly to: string } | Unknown;
export type RevisionCount = { readonly state: 'counted'; readonly revisions: number; readonly rows: Readonly<Record<string, number>> } | Unknown;
export interface Round { readonly round: number | null; readonly session: number | null; readonly ms: number | null; readonly refusedSubmissions: number }
export type Rounds = {
  readonly state: 'counted';
  readonly opened: number;
  readonly completed: number;
  readonly unfinished: number;
  readonly refusedSubmissions: number;
  readonly ms: number;
  readonly rounds: readonly Round[];
} | Unknown;

export type StepMeasures =
  | {
    readonly label: 'Inferred';
    readonly basis: typeof STEP_MEASURES_BASIS;
    readonly rows: number;
    readonly unreadableRows: number;
    readonly wall: Span;
    readonly toFirstDraftCheck: Span;
    readonly toFirstPassedDraft: Span;
    readonly toFirstPassedInventory: Span;
    readonly toFirstRender: Span;
    readonly draftRevisions: RevisionCount;
    readonly inventoryRevisions: RevisionCount;
    readonly reviewRounds: Readonly<Record<ReviewKind, Rounds>>;
    readonly roundPredicate: typeof ROUND_PREDICATE;
  }
  | { readonly label: 'Unknown'; readonly basis: typeof STEP_MEASURES_BASIS; readonly why: string };

const text = (value: unknown): string | null => (typeof value === 'string' ? value : null);
const count = (value: unknown): number | null => (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null);

/** One step-log line as a row the measures read; null for a line that is not a JSON object with a step name and a UTC instant. */
export function readStepRow(line: string): StepRow | null {
  let entry: unknown;
  try { entry = JSON.parse(line); } catch { return null; }
  if (!isRecord(entry)) return null;
  const step = text(entry['step']), at = text(entry['at']);
  if (step === null || at === null || !INSTANT.test(at)) return null;
  const ms = Date.parse(at);
  if (Number.isNaN(ms)) return null;
  return {
    step, at, ms, outcome: text(entry['outcome']), role: text(entry['role']), kind: text(entry['kind']),
    revision: count(entry['revision']), round: count(entry['round']), session: count(entry['session']),
  };
}

const unknown = (why: string): Unknown => ({ state: 'unknown', why });

function span(from: StepRow, to: { readonly at: string; readonly ms: number } | undefined, missing: string): Span {
  if (to === undefined) return unknown(missing);
  if (to.ms < from.ms) return unknown(`the step log's instants are out of order: ${to.at} precedes ${from.at}`);
  return { state: 'measured', ms: to.ms - from.ms, from: from.at, to: to.at };
}

function revisions(rows: readonly StepRow[], step: string): RevisionCount {
  const own = rows.filter((row) => row.step === step);
  if (own.length === 0) return unknown(`the step log records no ${step} row`);
  const byOutcome: Record<string, number> = {};
  for (const row of own) byOutcome[row.outcome ?? 'none'] = (byOutcome[row.outcome ?? 'none'] ?? 0) + 1;
  const numbered = new Set(own.map((row) => row.revision).filter((revision): revision is number => revision !== null));
  if (numbered.size === 0) return unknown(`no ${step} row in the step log names a revision`);
  return { state: 'counted', revisions: numbered.size, rows: Object.fromEntries(Object.entries(byOutcome).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) };
}

function reviewRounds(rows: readonly StepRow[], kind: ReviewKind): Rounds {
  const opened = rows.map((row, index) => ({ row, index }))
    .filter(({ row }) => row.step === 'session-prompt' && row.role === 'review' && row.kind === kind && (row.outcome === 'delivered' || row.outcome === 'issued'));
  if (opened.length === 0) return unknown(`the step log records no delivered or issued ${kind} review prompt`);
  const rounds: Round[] = [];
  for (const { row, index } of opened) {
    let refused = 0;
    let end: StepRow | undefined;
    for (const later of rows.slice(index + 1)) {
      if (later.step !== 'review-check' || later.kind !== kind) continue;
      if (later.outcome === 'validated') { end = later; break; }
      if (later.outcome === 'refused') refused++;
    }
    if (end !== undefined && end.ms < row.ms) return unknown(`the step log's instants are out of order: ${end.at} precedes ${row.at}`);
    rounds.push({ round: row.round, session: row.session, ms: end === undefined ? null : end.ms - row.ms, refusedSubmissions: refused });
  }
  const completed = rounds.filter((round) => round.ms !== null);
  return {
    state: 'counted',
    opened: rounds.length,
    completed: completed.length,
    unfinished: rounds.length - completed.length,
    refusedSubmissions: rounds.reduce((sum, round) => sum + round.refusedSubmissions, 0),
    ms: completed.reduce((sum, round) => sum + round.ms!, 0),
    rounds,
  };
}

/** The measures over the step log's lines, ending the run's wall time at the close instant; Unknown, with its reason, for a log that
 * cannot be read or carries no readable row. */
export function stepMeasures(lines: readonly string[] | { readonly why: string }, closedAt: string): StepMeasures {
  if (!Array.isArray(lines)) return { label: 'Unknown', basis: STEP_MEASURES_BASIS, why: (lines as { readonly why: string }).why };
  const rows: StepRow[] = [];
  let unreadable = 0;
  for (const line of lines as readonly string[]) {
    const row = readStepRow(line);
    if (row === null) unreadable++; else rows.push(row);
  }
  const first = rows[0];
  if (first === undefined) return { label: 'Unknown', basis: STEP_MEASURES_BASIS, why: unreadable === 0 ? 'the step log records no step' : `no row of the step log is readable (${unreadable} unreadable)` };
  const firstOf = (predicate: (row: StepRow) => boolean): StepRow | undefined => rows.find(predicate);
  const close = Date.parse(closedAt);
  return {
    label: 'Inferred',
    basis: STEP_MEASURES_BASIS,
    rows: rows.length,
    unreadableRows: unreadable,
    wall: span(first, Number.isNaN(close) ? undefined : { at: closedAt, ms: close }, 'the close instant is not a UTC instant'),
    toFirstDraftCheck: span(first, firstOf((row) => row.step === 'check'), 'the step log records no check row'),
    toFirstPassedDraft: span(first, firstOf((row) => row.step === 'check' && row.outcome === 'passed'), 'the step log records no passed check row'),
    toFirstPassedInventory: span(first, firstOf((row) => row.step === 'inventory-check' && row.outcome === 'passed'), 'the step log records no passed inventory-check row'),
    toFirstRender: span(first, firstOf((row) => row.step === 'render' && row.outcome === 'rendered'), 'the step log records no rendered render row'),
    draftRevisions: revisions(rows, 'check'),
    inventoryRevisions: revisions(rows, 'inventory-check'),
    reviewRounds: { fidelity: reviewRounds(rows, 'fidelity'), design: reviewRounds(rows, 'design') },
    roundPredicate: ROUND_PREDICATE,
  };
}
