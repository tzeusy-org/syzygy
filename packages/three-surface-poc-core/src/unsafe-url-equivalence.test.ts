// syzygy-bpyt.52: the unsafe-URL pattern of the active-content scan was
// rewritten so each whitespace run is matched by one `\s*`. The scan is a
// gate (GP-Q0), so the rewrite must flag the same matches, index and text,
// for every input. The oracle below is the replaced pattern, hard-coded
// here and never imported, and it is compared with the shipped matcher over
// the package's own fixtures and test sources, an exhaustive token corpus
// and a seeded random corpus. The timing rows hold the shipped matcher to
// linear time on whitespace runs that sent the old pattern cubic.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { scanActiveContent, unsafeUrlMatches } from './git-object-reader.js';

// The pattern as it stood before syzygy-bpyt.52, byte for byte.
const OLD_UNSAFE_SCHEME = '(?:j\\s*a\\s*v\\s*a\\s*s\\s*c\\s*r\\s*i\\s*p\\s*t|v\\s*b\\s*s\\s*c\\s*r\\s*i\\s*p\\s*t|d\\s*a\\s*t\\s*a|f\\s*i\\s*l\\s*e)\\s*:';
const OLD_UNSAFE_URL = new RegExp(`(?:\\]\\(\\s*<?|\\]:\\s*<?|=\\s*["']?\\s*|<)\\s*${OLD_UNSAFE_SCHEME}`, 'gi');

const oracle = (text: string): { index: number; value: string }[] =>
  [...text.matchAll(OLD_UNSAFE_URL)].map((match) => ({ index: match.index, value: match[0] }));

// Compares both matchers over a population and returns the inputs that
// differ, so a failure names them rather than a count.
const differing = (inputs: Iterable<string>): { input: string; old: unknown; head: unknown }[] => {
  const out: { input: string; old: unknown; head: unknown }[] = [];
  for (const input of inputs) {
    const old = oracle(input);
    const head = unsafeUrlMatches(input);
    if (JSON.stringify(old) !== JSON.stringify(head)) out.push({ input, old, head });
  }
  return out;
};

// Every JavaScript `\s` class the old pattern could meet, not only ASCII.
const WHITESPACE = [' ', '\t', '\n', '\r', '\r\n', '\v', '\f', ' ', ' ', ' ', ' ', ' ', ' ', '　', '﻿'];
const TOKENS = [
  ...WHITESPACE,
  '](', ']:', ']', '(', ':', '=', '<', '"', "'", '`', '&#x6A;',
  'javascript', 'JaVaScRiPt', 'java script', 'j a v a', 'vbscript', 'VB', 'data', 'DATA', 'd a t a', 'file', 'F\tI\nL E', 'fil',
  'j', 'a', 'v', 's', 'c', 'r', 'i', 'p', 't', 'b', 'd', 'f', 'l', 'e', 'x', 'k',
  // Letters a case-insensitive non-Unicode pattern must not fold to ASCII.
  'ſ', 'ı', 'İ', 'K',
];

// mulberry32: a fixed seed so a failure is reproducible.
const random = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const sourceDir = fileURLToPath(new URL('.', import.meta.url));

describe('UNSAFE_URL rewrite matches the replaced pattern exactly (syzygy-bpyt.52)', () => {
  it('on the package fixtures and the reader and scan test sources', () => {
    const files = [
      ...readdirSync(join(sourceDir, 'fixtures')).map((name) => join(sourceDir, 'fixtures', name)),
      join(sourceDir, 'git-object-reader.test.ts'),
      join(sourceDir, 'markdown-code-context.test.ts'),
      join(sourceDir, 'project-shape-observation.test.ts'),
    ];
    const texts = files.map((file) => readFileSync(file, 'utf8'));
    // The population is not vacuous: the reader's own sentinels match.
    expect(texts.reduce((n, text) => n + oracle(text).length, 0)).toBeGreaterThanOrEqual(5);
    expect(differing(texts)).toEqual([]);
    // Line by line too, so a whole-file match cannot hide a per-line one.
    expect(differing(texts.flatMap((text) => text.split('\n')))).toEqual([]);
  });

  it('on the hand-written edge cases', () => {
    const cases = [
      '[x](javascript:1)', '[x]( <javascript:1>)', '[x](  <  j a v a s c r i p t :1)', '[x](<<javascript:1)',
      '[ref]: javascript:1', '[ref]:<data:x', '[ref]:  <  file:', ']: :file:',
      'a=javascript:1', 'a = " javascript:1', "a='  data:x", 'a=""javascript:', 'a= " \' data:', 'a="<data:',
      '<javascript:1>', '< \t data:', '<<data:', '<=data:', '=<data:', '](=data:', '](<=data:', '=](data:',
      '](javascript:](javascript:', '<file:<file:', 'a="file:"file:', '](< j a v　a﻿script\r\n:',
      'a =' + ' '.repeat(60) + 'b', 'a =' + ' '.repeat(60) + 'data:', '](' + ' '.repeat(40) + '<' + ' '.repeat(40) + 'file:',
      '=ſata:', 'fıle:', 'fİle:', '<javascriKt:', '=DaTa:', '=dAtA :', '=data', '=data\n:', ']\n(data:',
    ];
    expect(oracle(cases.join('\n')).length).toBeGreaterThan(20);
    expect(differing(cases)).toEqual([]);
    expect(differing([cases.join(''), cases.join(' '), cases.join('\n')])).toEqual([]);
  });

  it('on every sequence of up to three tokens, each followed by a scheme', () => {
    const inputs: string[] = [];
    const short = ['', ' ', '\t\n', '](', ']:', '=', '<', '"', "'", ']', 'x'];
    for (const a of short) for (const b of short) for (const c of short) for (const tail of ['data:', ' f i l e :', 'JavaScript:', 'vbscrip:', 'x:']) inputs.push(a + b + c + tail);
    expect(inputs.length).toBe(11 ** 3 * 5);
    expect(differing(inputs)).toEqual([]);
  });

  it('on 20,000 seeded random strings, half free tokens and half near-miss URLs', () => {
    const next = random(0x5ec52);
    const pick = <T,>(items: readonly T[]): T => items[Math.floor(next() * items.length)] as T;
    const run = (): string => {
      let text = '';
      for (let k = Math.floor(next() * 4); k > 0; k -= 1) text += pick(WHITESPACE);
      return text;
    };
    // A URL start with each part kept, dropped or replaced at random, so
    // the corpus sits on the boundary between a match and a miss.
    const nearMiss = (): string => {
      const part = (kept: string, other: string): string => (next() < 0.8 ? kept : next() < 0.5 ? '' : other);
      const scheme = pick(['javascript', 'vbscript', 'data', 'file']).split('').map((letter) => (next() < 0.5 ? letter.toUpperCase() : letter));
      return part(pick(['](', ']:', '=', '<', ']', '(']), pick(TOKENS)) + run() + part(pick(['', '<', '"', "'"]), pick(TOKENS)) + run()
        + scheme.map((letter) => part(letter, pick(TOKENS)) + (next() < 0.2 ? run() : '')).join('') + run() + part(':', pick(TOKENS));
    };
    const inputs: string[] = [];
    for (let n = 0; n < 20_000; n += 1) {
      let text = '';
      for (let k = 1 + Math.floor(next() * 12); k > 0; k -= 1) text += n % 2 === 0 ? pick(TOKENS) : next() < 0.5 ? nearMiss() : pick(TOKENS);
      inputs.push(text);
    }
    // Many strings must reach a match and many must miss, or the corpus tests one side only.
    const matched = inputs.filter((text) => oracle(text).length > 0).length;
    expect(matched).toBeGreaterThan(2_000);
    expect(inputs.length - matched).toBeGreaterThan(2_000);
    expect(differing(inputs)).toEqual([]);
  });
});

/** CPU time this thread has spent (`process.threadCpuUsage`, Node 23.9 and later), else the whole process's. */
const cpuUsage = (from?: NodeJS.CpuUsage): NodeJS.CpuUsage =>
  (typeof process.threadCpuUsage === 'function' ? process.threadCpuUsage(from) : process.cpuUsage(from));
const cpuMsSince = (from: NodeJS.CpuUsage): number => { const { user, system } = cpuUsage(from); return (user + system) / 1000; };

// The old pattern took 2.4-5.2 s of CPU on the 2 KB line and is cubic: it
// did not finish the 20 KB one in 120 s. The rewrite takes at most 3 ms on
// any row (docs/evidence/syzygy-bpyt-52/unsafe-url-equivalence-2026-11-04.json).
const TWO_KB_CPU_MS = 200;
const TWENTY_KB_CPU_MS = 1_000;

describe('the unsafe-URL scan is linear on long whitespace runs (syzygy-bpyt.52)', () => {
  it('scans a 2 KB `=` whitespace line under the bound', () => {
    const line = `a =${' '.repeat(2_000)}b`;
    const cpu = cpuUsage();
    expect(scanActiveContent(line)).toEqual([]);
    expect(cpuMsSince(cpu)).toBeLessThan(TWO_KB_CPU_MS);
  });

  it.each([
    ['after `=`', `a =${' '.repeat(20_000)}b`],
    ['after `="`', `a ="${' \t'.repeat(10_000)}b`],
    ['after `](` and `<`', `[x](${' '.repeat(10_000)}<${' '.repeat(10_000)}b`],
    ['after `]:`', `[x]:${' '.repeat(20_000)}b`],
    ['inside a scheme', `<j${' '.repeat(10_000)}a${' '.repeat(10_000)}x`],
    ['of a 20 KB code span the mask blanks', `a =\`${'x'.repeat(20_000)}\``],
  ])('scans a 20 KB whitespace line %s under the bound', (_label, line) => {
    const cpu = cpuUsage();
    expect(scanActiveContent(line)).toEqual([]);
    expect(cpuMsSince(cpu)).toBeLessThan(TWENTY_KB_CPU_MS);
  });
});
