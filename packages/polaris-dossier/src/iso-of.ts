/**
 * An instant, in milliseconds since the epoch, as ISO 8601 text in UTC with milliseconds: `2026-10-28T00:00:00.000Z`. The caller
 * supplies the instant; nothing here reads a clock. An instant outside the range a Date holds (plus or minus 8.64e15), or one that
 * is not a number, throws a RangeError.
 *
 * It lives here and not in `@syzygy/support`, whose purity guard forbids the Date constructor; seven modules of this package held
 * the same line before it (syzygy-bpyt.6.3, stack 4).
 */
export const isoOf = (instant: number): string => new Date(instant).toISOString();
