import { describe, expect, it } from 'vitest';

import { isoWeek, recordedInstant, trajectoryTimeMeasures } from './trajectory-time-measures.js';
import { governingIntentUnknown, type WorkItemFact } from './work-items.js';

// POC-REQ-045 (syzygy-t3jk.17). Every expected value below is a literal,
// computed by hand (ISO weeks by Python's date.isocalendar), never by the
// module under test.

function item(id: string, status: WorkItemFact['status'], createdAt: string, closedAt: string | null): WorkItemFact {
  return { id, status, issueType: 'task', priority: 2, createdAt, updatedAt: createdAt, closedAt, governedBy: governingIntentUnknown(), title: { text: 'fixture title' } };
}

const ITEMS: readonly WorkItemFact[] = [
  item('bu-c1', 'closed', '2026-08-01T00:00:00Z', '2026-08-03T00:00:00Z'), // 48 h
  item('bu-c2', 'closed', '2026-08-01T00:00:00Z', '2026-08-01T12:00:00Z'), // 12 h
  item('bu-c3', 'closed', '2026-08-02T00:00:00', '2026-08-05T00:00:00Z'), // timezone-less created
  item('bu-c4', 'closed', '2026-08-05T00:00:00Z', '2026-08-04T00:00:00Z'), // reversed
  item('bu-c5', 'closed', '2026-08-01T00:00:00Z', 'not-a-date'), // invalid closed
  item('bu-c6', 'closed', '2026-08-04T00:00:00Z', '2026-08-04T00:00:00Z'), // closed when created: 0 h, covered
  item('bu-c7', 'closed', '2026-08-01T00:00:00Z', '2026-08-20T00:00:00Z'), // closed after the capture instant
  item('bu-o1', 'open', '2026-08-09T00:00:00Z', null), // 24 h old
  item('bu-o2', 'in_progress', '2026-08-06T00:00:00Z', null), // 96 h old
  item('bu-o3', 'blocked', '2026-08-31T00:00:00Z', null), // created after the capture instant
  item('bu-o4', 'open', '2026-02-30T00:00:00Z', null), // impossible date
  item('bu-o5', 'open', '2026-08-10T00:00:00Z', null), // created at the capture instant: 0 h, covered
];
const MEASURED_AT = '2026-08-10T00:00:00Z';

describe('Trajectory elapsed-time measures (POC-REQ-045)', () => {
  it('measures lead time, age, arrivals and closures with their coverage over every served item', () => {
    expect(trajectoryTimeMeasures(ITEMS, MEASURED_AT)).toEqual({
      source: 'tracker-recorded-instants',
      evidenceClass: 'observed',
      measuredAt: '2026-08-10T00:00:00Z',
      leadTime: { covered: 3, total: 7, medianHours: 12, p90Hours: 48 },
      age: { covered: 3, total: 5, medianHours: 24, p90Hours: 96 },
      arrivals: { covered: 9, total: 12 },
      closures: { covered: 3, total: 7 },
      weeks: [
        { week: '2026-W31', arrivals: 4, closures: 1 },
        { week: '2026-W32', arrivals: 4, closures: 2 },
        { week: '2026-W33', arrivals: 1, closures: 0 },
      ],
      earlier: { arrivals: 0, closures: 0 },
    });
  });

  it('counts an invalid, a timezone-less, a reversed and a post-capture instant as not covered, never dropped', () => {
    const measures = trajectoryTimeMeasures(ITEMS, MEASURED_AT);
    // Seven closed items stay the lead-time denominator; c3, c4, c5 and c7 are not covered.
    expect(measures.leadTime.total - measures.leadTime.covered).toBe(4);
    // Five open items stay the age denominator; o3 (after the capture) and o4 (invalid) are not covered.
    expect(measures.age.total - measures.age.covered).toBe(2);
    // c3 (timezone-less), o3 (after the capture) and o4 (invalid) are not covered arrivals.
    expect(measures.arrivals.total - measures.arrivals.covered).toBe(3);
  });

  it('lists at most 104 weeks, counting covered events before them', () => {
    const measures = trajectoryTimeMeasures(
      [item('bu-old', 'open', '1970-01-01T00:00:00Z', null), item('bu-new', 'open', '2026-08-03T00:00:00Z', null)],
      MEASURED_AT,
    );
    expect(measures.weeks).toHaveLength(104);
    expect(measures.weeks[0]).toEqual({ week: '2024-W33', arrivals: 0, closures: 0 });
    expect(measures.weeks[103]).toEqual({ week: '2026-W32', arrivals: 1, closures: 0 });
    expect(measures.earlier).toEqual({ arrivals: 1, closures: 0 });
    expect(measures.arrivals).toEqual({ covered: 2, total: 2 });
  });

  it('is Unknown (null), never zero, when no item is covered', () => {
    expect(trajectoryTimeMeasures([item('bu-x', 'closed', 'bad', 'bad')], MEASURED_AT)).toEqual({
      source: 'tracker-recorded-instants',
      evidenceClass: 'observed',
      measuredAt: '2026-08-10T00:00:00Z',
      leadTime: { covered: 0, total: 1, medianHours: null, p90Hours: null },
      age: { covered: 0, total: 0, medianHours: null, p90Hours: null },
      arrivals: { covered: 0, total: 1 },
      closures: { covered: 0, total: 1 },
      weeks: [],
      earlier: { arrivals: 0, closures: 0 },
    });
  });

  it('takes nearest-rank percentiles in whole hours, floored', () => {
    const closed = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((h) => item(`bu-r${h}`, 'closed', '2026-08-01T00:00:00Z', `2026-08-01T${String(h).padStart(2, '0')}:30:00Z`));
    expect(trajectoryTimeMeasures(closed, MEASURED_AT).leadTime).toEqual({ covered: 10, total: 10, medianHours: 5, p90Hours: 9 });
  });

  it('names ISO weeks in UTC across a year change', () => {
    const at = (value: string): bigint => recordedInstant(value)!;
    expect(isoWeek(at('2025-12-29T00:00:00Z'))).toBe('2026-W01');
    expect(isoWeek(at('2026-12-31T23:00:00Z'))).toBe('2026-W53');
    expect(isoWeek(at('2027-01-01T01:00:00Z'))).toBe('2026-W53');
    expect(isoWeek(at('2027-01-04T00:00:00Z'))).toBe('2027-W01');
    expect(isoWeek(at('2021-01-03T23:59:59Z'))).toBe('2020-W53');
    // An offset selects the UTC week, never the local one.
    expect(isoWeek(at('2027-01-04T03:00:00+02:00'))).toBe('2027-W01'); // 01:00Z Monday
    expect(isoWeek(at('2027-01-04T01:00:00+02:00'))).toBe('2026-W53'); // 23:00Z Sunday
    // Years below 100 keep their own calendar (Date.UTC would read 0050 as 1950).
    expect(isoWeek(at('0050-01-01T00:00:00Z'))).toBe('0049-W52');
    expect(isoWeek(at('0050-06-15T00:00:00Z'))).toBe('0050-W24');
    const spanning = [item('bu-y1', 'closed', '2026-12-28T00:00:00Z', '2027-01-05T00:00:00Z')];
    expect(trajectoryTimeMeasures(spanning, '2027-02-01T00:00:00Z').weeks).toEqual([
      { week: '2026-W53', arrivals: 1, closures: 0 },
      { week: '2027-W01', arrivals: 0, closures: 1 },
    ]);
  });
});
