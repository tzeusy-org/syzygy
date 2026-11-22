import type { WorkItemFact } from './work-items.js';

/**
 * POC-REQ-045 (syzygy-t3jk.17): four elapsed-time measures over every
 * served work item, each with its coverage, derived from recorded instants
 * only (POC-REQ-041) and the observation's own capture instant, never a
 * render-time clock. Elapsed time is the only cost dimension measured
 * (RFC8-18 lists lead time as an independent measure; nothing here is a
 * composite); an item whose instants are missing, invalid, timezone-less or
 * reversed is counted as not covered, never dropped and never zero
 * (RFC8-19).
 */

/** A duration over the items it applies to: `covered` of `total` had the
 * instants it needs; median and 90th percentile by nearest rank, in whole
 * hours (floored), null when no item is covered. */
export interface DurationMeasure {
  readonly covered: number;
  readonly total: number;
  readonly medianHours: number | null;
  readonly p90Hours: number | null;
}

/** One ISO week (UTC): how many covered items arrived and closed in it. */
export interface WeeklyCount {
  readonly week: string;
  readonly arrivals: number;
  readonly closures: number;
}

export interface TrajectoryTimeMeasures {
  /** RFC8-18: each measure's declared source and evidence class. */
  readonly source: 'tracker-recorded-instants';
  readonly evidenceClass: 'observed';
  /** The instant age is measured to: the observation's capture instant. */
  readonly measuredAt: string;
  /** Closed items, created to closed. */
  readonly leadTime: DurationMeasure;
  /** Non-closed items, created to `measuredAt`. */
  readonly age: DurationMeasure;
  /** Arrivals: every served item with a valid created instant not after `measuredAt`. */
  readonly arrivals: { readonly covered: number; readonly total: number };
  /** Closures: closed items whose closed instant is valid, not after `measuredAt`, and not before a covered created instant. */
  readonly closures: { readonly covered: number; readonly total: number };
  /** Every ISO week from the first to the last covered event (at most
   * `WEEK_LIMIT`), in order; a week between them with no covered event counts
   * 0 over the covered items, which `arrivals` and `closures` disclose. */
  readonly weeks: readonly WeeklyCount[];
  /** Covered arrivals and closures in weeks before the listed ones (the
   * series lists at most `WEEK_LIMIT` weeks, ending at the last covered event). */
  readonly earlier: { readonly arrivals: number; readonly closures: number };
}

/** Recorded instants, parsed (shared with the selection ranking).
 * Explicit offsets only: the host timezone must never select a different item. */
export function recordedInstant(value: string | null): bigint | null {
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

const NS_PER_HOUR = 3_600_000_000_000n;
const NS_PER_MS = 1_000_000n;
const WEEK_MS = 7 * 86_400_000;
/** The weekly series lists at most this many ISO weeks (two years). */
export const WEEK_LIMIT = 104;

/** Nearest rank: the smallest value with at least p of the values at or below it. */
function nearestRank(sorted: readonly bigint[], p: number): number | null {
  if (sorted.length === 0) return null;
  const rank = Math.max(1, Math.ceil(p * sorted.length));
  return Number(sorted[rank - 1]! / NS_PER_HOUR);
}

function duration(durations: bigint[], total: number): DurationMeasure {
  const sorted = [...durations].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return { covered: sorted.length, total, medianHours: nearestRank(sorted, 0.5), p90Hours: nearestRank(sorted, 0.9) };
}

/** Midnight UTC of a calendar day in ms; `Date.UTC` maps years 0-99 to 1900-1999, this does not. */
function utcDay(year: number, month: number, day: number): number {
  const date = new Date(0);
  date.setUTCFullYear(year, month, day);
  return date.getTime();
}

/** ISO 8601 week of a UTC instant, as `YYYY-Www`. */
export function isoWeek(instantNs: bigint): string {
  const ms = Number(instantNs / NS_PER_MS);
  const day = new Date(ms);
  const date = utcDay(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
  const weekday = (new Date(date).getUTCDay() + 6) % 7; // Monday 0
  const thursday = new Date(date + (3 - weekday) * 86_400_000);
  const year = thursday.getUTCFullYear();
  const week = 1 + Math.floor((thursday.getTime() - utcDay(year, 0, 1)) / (7 * 86_400_000));
  return `${String(year).padStart(4, '0')}-W${String(week).padStart(2, '0')}`;
}

/** The Monday (UTC, ms) of the ISO week an instant falls in. */
function weekStartMs(instantNs: bigint): number {
  const ms = Number(instantNs / NS_PER_MS);
  const day = new Date(ms);
  const date = utcDay(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
  return date - ((new Date(date).getUTCDay() + 6) % 7) * 86_400_000;
}

export function trajectoryTimeMeasures(items: readonly WorkItemFact[], measuredAt: string): TrajectoryTimeMeasures {
  const measuredNs = recordedInstant(measuredAt);
  const lead: bigint[] = [];
  const ages: bigint[] = [];
  const arrivalWeeks = new Map<number, number>();
  const closureWeeks = new Map<number, number>();
  let arrivals = 0;
  let closures = 0;
  let closedTotal = 0;
  let openTotal = 0;
  for (const item of items) {
    // An instant after the capture instant is not a fact of this observation:
    // not covered by any measure (fail closed when the capture is invalid).
    const createdRaw = recordedInstant(item.createdAt);
    const created = createdRaw !== null && measuredNs !== null && createdRaw <= measuredNs ? createdRaw : null;
    if (created !== null) {
      arrivals += 1;
      const week = weekStartMs(created);
      arrivalWeeks.set(week, (arrivalWeeks.get(week) ?? 0) + 1);
    }
    if (item.status === 'closed') {
      closedTotal += 1;
      const closedRaw = recordedInstant(item.closedAt);
      const closed = closedRaw !== null && measuredNs !== null && closedRaw <= measuredNs ? closedRaw : null;
      if (created !== null && closed !== null && closed >= created) {
        closures += 1;
        lead.push(closed - created);
        const week = weekStartMs(closed);
        closureWeeks.set(week, (closureWeeks.get(week) ?? 0) + 1);
      }
    } else {
      openTotal += 1;
      if (created !== null && measuredNs !== null) ages.push(measuredNs - created);
    }
  }
  const starts = [...arrivalWeeks.keys(), ...closureWeeks.keys()];
  const weeks: WeeklyCount[] = [];
  let earlierArrivals = 0;
  let earlierClosures = 0;
  if (starts.length > 0) {
    let low = starts[0]!;
    let high = starts[0]!;
    for (const start of starts) {
      if (start < low) low = start;
      if (start > high) high = start;
    }
    // At most WEEK_LIMIT weeks, ending at the last covered event; covered
    // events before them are counted, never dropped.
    low = Math.max(low, high - (WEEK_LIMIT - 1) * WEEK_MS);
    for (const [start, count] of arrivalWeeks) if (start < low) earlierArrivals += count;
    for (const [start, count] of closureWeeks) if (start < low) earlierClosures += count;
    for (let start = low; start <= high; start += WEEK_MS) {
      weeks.push({ week: isoWeek(BigInt(start) * NS_PER_MS), arrivals: arrivalWeeks.get(start) ?? 0, closures: closureWeeks.get(start) ?? 0 });
    }
  }
  return {
    source: 'tracker-recorded-instants',
    evidenceClass: 'observed',
    measuredAt,
    leadTime: duration(lead, closedTotal),
    age: duration(ages, openTotal),
    arrivals: { covered: arrivals, total: items.length },
    closures: { covered: closures, total: closedTotal },
    weeks,
    earlier: { arrivals: earlierArrivals, closures: earlierClosures },
  };
}
