import { describe, expect, it } from 'vitest';
import { isoOf } from './iso-of.js';

// Every expected string is written out from the ISO 8601 calendar, not computed by a Date.
describe('isoOf', () => {
  it.each<readonly [string, number, string]>([
    ['the epoch', 0, '1970-01-01T00:00:00.000Z'],
    ['one millisecond after the epoch', 1, '1970-01-01T00:00:00.001Z'],
    ['one millisecond before the epoch', -1, '1969-12-31T23:59:59.999Z'],
    ['a leap day', 951_782_400_000, '2000-02-29T00:00:00.000Z'],
    ['the first instant of 2100, which is not a leap year', 4_102_444_800_000, '2100-01-01T00:00:00.000Z'],
    ['the last instant of year 9999', 253_402_300_799_999, '9999-12-31T23:59:59.999Z'],
    ['the first instant of year 10000, which takes a signed six-digit year', 253_402_300_800_000, '+010000-01-01T00:00:00.000Z'],
    ['the first instant of year 0000', -62_167_219_200_000, '0000-01-01T00:00:00.000Z'],
    ['the last instant of year -0001, which takes a signed six-digit year', -62_167_219_200_001, '-000001-12-31T23:59:59.999Z'],
    ['the largest instant a Date holds', 8_640_000_000_000_000, '+275760-09-13T00:00:00.000Z'],
    ['the smallest instant a Date holds', -8_640_000_000_000_000, '-271821-04-20T00:00:00.000Z'],
    ['a fraction of a millisecond, which is cut', 1.9, '1970-01-01T00:00:00.001Z'],
    ['negative zero', -0, '1970-01-01T00:00:00.000Z'],
  ])('writes %s', (_label, instant, text) => {
    expect(isoOf(instant)).toBe(text);
  });

  it.each<readonly [string, number]>([
    ['one past the largest instant a Date holds', 8_640_000_000_000_001],
    ['one before the smallest instant a Date holds', -8_640_000_000_000_001],
    ['NaN', Number.NaN],
    ['positive infinity', Number.POSITIVE_INFINITY],
    ['negative infinity', Number.NEGATIVE_INFINITY],
  ])('throws a RangeError for %s instead of writing text', (_label, instant) => {
    expect(() => isoOf(instant)).toThrow(RangeError);
  });
});
