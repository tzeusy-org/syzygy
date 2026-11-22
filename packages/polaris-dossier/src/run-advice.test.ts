import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { patchFs } from './fs-patch.testkit.js';
import { computeRunAdvice, readRunAdvice, writeRunAdvice } from './run-advice.js';
import { figureFitClass, mechanismRuleOf, readerAdvisoryClass } from './reader-advice.js';

// REQ-polaris-generation-034 version 2.9 (syzygy-3efd.64): each advice item's class, and the run file as a function of the run's check
// records. Every entry and expected file is a literal.

const NO_LAYOUT = 'no figure layout was supplied to this check, so its width is not known';
const at = (viewportPx: number, columnPx: number, laidOutPx: number) => ({ diagram: 'd', viewportPx, laidOutPx, drawnPx: laidOutPx, columnPx, textPx: 13, minTextPx: 11, failed: ['width' as const] });

describe('advice classes', () => {
  it('classes every reader advisory author, and a figure-fit entry mechanism in exactly the two cases', () => {
    expect(readerAdvisoryClass({ standard: 'RS-19', at: '$.sections[0].paragraphs', detail: 'x' })).toBe('author');
    expect(mechanismRuleOf({ diagram: 'd', unknown: NO_LAYOUT })).toBe('no-figure-layout');
    expect(mechanismRuleOf({ diagram: 'd', unknown: 'the figure could not be laid out' })).toBeNull();
    expect(mechanismRuleOf(at(390, 261, 648))).toBe('graph-without-narrow-form');
    expect(mechanismRuleOf(at(390, 261, 1048))).toBe('graph-without-narrow-form');
    // Under 648 px laid out, or a column of 648 px or more: author.
    expect(mechanismRuleOf(at(390, 261, 647))).toBeNull();
    expect(mechanismRuleOf(at(390, 261, 261.5))).toBeNull();
    expect(mechanismRuleOf(at(1440, 966, 1200))).toBeNull();
    expect(mechanismRuleOf(at(700, 648, 1048))).toBeNull();
    expect(mechanismRuleOf(at(700, 647, 1048))).toBe('graph-without-narrow-form');
    expect(figureFitClass(at(390, 261, 1048))).toBe('mechanism');
    expect(figureFitClass(at(1440, 966, 1200))).toBe('author');
  });
});

describe('the run file', () => {
  const record = (revision: number, entries: readonly unknown[] | null) => `${JSON.stringify({ format: 'polaris-dossier-check/1', revision, ...(entries === null ? {} : { figureFit: { examined: 1, entries } }) }, null, 2)}\n`;
  const runWith = (records: Readonly<Record<number, string>>): string => {
    const run = tempDir('run-advice-');
    fs.mkdirSync(path.join(run, 'checks'));
    for (const [n, text] of Object.entries(records)) fs.writeFileSync(path.join(run, 'checks', `rev-${n}.json`), text);
    return run;
  };

  it('holds each distinct advisory once, compared as a JSON value, ordered by first revision then by place, with its revisions', () => {
    const wide = at(390, 261, 1048);
    const reordered = { failed: ['width'], minTextPx: 11, textPx: 13, columnPx: 261, drawnPx: 1048, laidOutPx: 1048, viewportPx: 390, diagram: 'd' };
    const run = runWith({
      0: record(0, [at(1440, 966, 1200), { diagram: 'e', unknown: NO_LAYOUT }]),
      1: record(1, [wide, { diagram: 'e', unknown: NO_LAYOUT }]),
      2: record(2, [reordered, wide]),
      3: '{ not json',
      4: record(5, [wide]),
      10: record(10, [wide]),
      11: record(11, null),
    });
    const advice = computeRunAdvice(run, 'run-x');
    expect(advice).toEqual({
      format: 'polaris-dossier-run-advice/1', runId: 'run-x', rules: [{ id: 'no-figure-layout', version: 1 }, { id: 'graph-without-narrow-form', version: 1 }],
      // Revision 3 does not parse and revision 4's record names revision 5: both unreadable. Revision 11 has no figureFit. Revisions are
      // taken in numeric order, so 10 follows 2.
      checkRecords: { read: 5, unreadable: 2 }, occurrences: 5,
      advisories: [
        { rule: 'no-figure-layout', advice: { diagram: 'e', unknown: NO_LAYOUT }, revisions: [0, 1] },
        { rule: 'graph-without-narrow-form', advice: wide, revisions: [1, 2, 10] },
      ],
    });
    writeRunAdvice(run, advice);
    expect(fs.readFileSync(path.join(run, 'run-advice.json'), 'utf8')).toBe(`${JSON.stringify(advice, null, 2)}\n`);
    expect(readRunAdvice(run)).toEqual(advice);
    fs.writeFileSync(path.join(run, 'run-advice.json'), JSON.stringify(advice));
    expect(readRunAdvice(run)).toBeNull();
  });

  it('throws where the file cannot be put in place, leaving no temporary file', () => {
    const run = runWith({ 0: record(0, []) });
    fs.mkdirSync(path.join(run, 'run-advice.json'));
    expect(() => writeRunAdvice(run, computeRunAdvice(run, 'run-z'))).toThrow();
    expect(fs.readdirSync(run).sort()).toEqual(['checks', 'run-advice.json']);
  });

  it('reads the run file under the check record\'s bound: one past 16,777,216 bytes from its size alone, or nested past 16 levels, is null', () => {
    const run = runWith({ 0: record(0, [at(390, 261, 1048)]) });
    const advice = computeRunAdvice(run, 'run-b');
    writeRunAdvice(run, advice);
    const file = path.join(run, 'run-advice.json');
    expect(readRunAdvice(run)).toEqual(advice);
    // Padded with trailing spaces to the bound, it still reads as JSON; one byte past it, it is refused unread.
    const text = fs.readFileSync(file, 'utf8');
    fs.writeFileSync(file, text + ' '.repeat(16_777_216 - Buffer.byteLength(text)));
    expect(fs.statSync(file).size).toBe(16_777_216);
    expect(() => JSON.parse(fs.readFileSync(file, 'utf8'))).not.toThrow();
    // Refused from its size alone: no byte of the file is read.
    const reads = (): number => {
      let n = 0;
      const restore = patchFs('readFileSync', (original) => ((target: fs.PathOrFileDescriptor, ...rest: unknown[]) => {
        if (target === file) n += 1;
        return (original as (...args: unknown[]) => unknown)(target, ...rest);
      }) as typeof original);
      try { readRunAdvice(run); } finally { restore(); }
      return n;
    };
    expect(reads()).toBe(1);
    fs.truncateSync(file, 16_777_217);
    expect(readRunAdvice(run)).toBeNull();
    expect(reads()).toBe(0);
    // Seventeen levels of nesting below the root: past the depth bound.
    fs.writeFileSync(file, `${JSON.stringify({ ...advice, rules: [[[[[[[[[[[[[[[[[0]]]]]]]]]]]]]]]]] }, null, 2)}\n`);
    expect(readRunAdvice(run)).toBeNull();
  });

  it('is empty for a run with no check record', () => {
    expect(computeRunAdvice(tempDir('run-advice-empty-'), 'run-y')).toMatchObject({ checkRecords: { read: 0, unreadable: 0 }, occurrences: 0, advisories: [] });
  });
});
