// syzygy-rmax: the obfuscated-destination pattern of the active-content
// scan was rewritten so a run of `](` is scanned a bounded number of times
// instead of once from every `](` in it. The scan is a gate (GP-Q0), so the
// rewrite must flag the same matches, index and text, for every input. The
// oracle below is the replaced pattern, hard-coded here and never imported,
// and it is compared with the shipped matcher over the package's own
// fixtures and test sources, an exhaustive token corpus, adversarial floods
// and a seeded random corpus. The timing rows hold the shipped matcher to
// linear time on the `](` floods that sent the old pattern quadratic.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { obfuscatedDestinationMatches, scanActiveContent } from './git-object-reader.js';

// The pattern as it stood before syzygy-rmax, byte for byte.
const OLD_OBFUSCATED_DESTINATION = /\]\(\s*<?[^)\s]*&(?:#\d+|#[xX][0-9a-fA-F]+|[A-Za-z][A-Za-z0-9]*);/g;

const oracle = (text: string): { index: number; value: string }[] =>
  [...text.matchAll(OLD_OBFUSCATED_DESTINATION)].map((match) => ({ index: match.index, value: match[0] }));

// Compares both matchers over a population and returns the first inputs
// that differ, so a failure names them rather than a count; it stops at 20,
// so a matcher that differs everywhere fails the assertion, not the heap.
const differing = (inputs: Iterable<string>): { input: string; old: unknown; head: unknown }[] => {
  const out: { input: string; old: unknown; head: unknown }[] = [];
  for (const input of inputs) {
    const old = oracle(input);
    const head = obfuscatedDestinationMatches(input);
    if (JSON.stringify(old) !== JSON.stringify(head)) out.push({ input, old, head });
    if (out.length === 20) break;
  }
  return out;
};

// Every JavaScript `\s` class member the old pattern could meet, not only ASCII.
const WHITESPACE = [' ', '\t', '\n', '\r', '\r\n', '\v', '\f', ' ', ' ', ' ', ' ', ' ', ' ', '　', '﻿'];
const TOKENS = [
  ...WHITESPACE,
  '](', ']', '(', ')', '<', '>', '&', '#', ';', 'x', 'X', '1', 'f', 'g', 'a', 'Z', '_', '[x]',
  '&amp;', '&#106;', '&#x6A;', '&#X6a;', '&lt', '&#;', '&#x;', '&1a;', '&a-b;', '&&a;', '&#12&#34;',
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

describe('OBFUSCATED_DESTINATION rewrite matches the replaced pattern exactly (syzygy-rmax)', () => {
  it('on the package fixtures and the reader and scan test sources', () => {
    const files = [
      ...readdirSync(join(sourceDir, 'fixtures')).map((name) => join(sourceDir, 'fixtures', name)),
      join(sourceDir, 'git-object-reader.test.ts'),
      join(sourceDir, 'markdown-code-context.test.ts'),
      join(sourceDir, 'project-shape-observation.test.ts'),
      join(sourceDir, 'obfuscated-destination-equivalence.test.ts'),
    ];
    const texts = files.map((file) => readFileSync(file, 'utf8'));
    // The population is not vacuous: the reader's own sentinels match.
    expect(texts.reduce((n, text) => n + oracle(text).length, 0)).toBeGreaterThanOrEqual(3);
    expect(differing(texts)).toEqual([]);
    // Line by line too, so a whole-file match cannot hide a per-line one.
    expect(differing(texts.flatMap((text) => text.split('\n')))).toEqual([]);
  });

  it('on the hand-written edge cases', () => {
    const cases = [
      '[x](&#x6A;avascript:1)', '[x](java&colon;script)', '[x]( <&amp;)', '[x](<&amp;>)', '[x](<<&amp;)', '[x](　&lt;)',
      '[x](a&b;c&d;e)', '[x](a&b;c&d)', '[x](&#12&#34;)', '[x](&#12;&#x;)', '[x](&1a;)', '[x](&a-b;)', '[x](&;)',
      '](](&amp;', '](](&amp;](', '](](&amp;](&lt;', '](&amp;](&lt;)', '](&amp; ](&lt;', '](a]( &amp;', '](a](\n&amp;',
      ']( ]( &amp;', '](]( ]( &amp;', '](]]( &amp;', '](a)](&amp;', ']()](&amp;', ']( ]( &amp;', '](](\r\n&gt;',
      '](a]', '](a](', '](a]( ', ']]((&amp;', '](((&amp;', '](]&amp;', ']\n(&amp;', '] (&amp;', '](&AMP;', '](&#X1F;',
      `](${'](' .repeat(50)}&amp;`, `${'](' .repeat(50)} &amp;`, `${'](' .repeat(50)} ](&amp;`, `](${' '.repeat(50)}<${'x'.repeat(50)}&q;`,
    ];
    expect(oracle(cases.join('\n')).length).toBeGreaterThan(20);
    expect(differing(cases)).toEqual([]);
    expect(differing([cases.join(''), cases.join(' '), cases.join('\n'), cases.join(')')])).toEqual([]);
  });

  it('on every string of up to five tokens over a 13-token alphabet', () => {
    const alphabet = [']', '(', ')', ' ', '\n', '<', '&', '#', 'x', '1', 'a', ';', ']('];
    const inputs: string[] = [''];
    let layer = [''];
    for (let depth = 1; depth <= 5; depth += 1) {
      layer = layer.flatMap((prefix) => alphabet.map((token) => prefix + token));
      for (const input of layer) inputs.push(input);
    }
    expect(inputs.length).toBe((13 ** 6 - 1) / 12);
    const matched = inputs.filter((text) => oracle(text).length > 0).length;
    expect(matched).toBeGreaterThanOrEqual(80);
    expect(differing(inputs)).toEqual([]);
  });

  it('on `](` followed by every string of up to six tokens over a 9-token alphabet', () => {
    const alphabet = ['](', ' ', ')', '<', '&', '#', 'x', '1', ';'];
    const inputs: string[] = [];
    let layer = [''];
    for (let depth = 0; depth <= 6; depth += 1) {
      for (const suffix of layer) inputs.push(`](${suffix}`);
      layer = layer.flatMap((prefix) => alphabet.map((token) => prefix + token));
    }
    expect(inputs.length).toBe((9 ** 7 - 1) / 8);
    const matched = inputs.filter((text) => oracle(text).length > 0).length;
    expect(matched).toBeGreaterThanOrEqual(3_000);
    expect(differing(inputs)).toEqual([]);
  });

  it('on every sequence of up to three tokens, each followed by an entity tail', () => {
    const inputs: string[] = [];
    const short = ['', ' ', '\t\n', '](', ']( ', ']', '(', ')', '<', '&', 'x', ']]('];
    for (const a of short) for (const b of short) for (const c of short) for (const tail of ['&amp;', '&#1;', '&#xF;', '&a', '&;', 'x;', ')&a;']) inputs.push(a + b + c + tail);
    expect(inputs.length).toBe(12 ** 3 * 7);
    expect(differing(inputs)).toEqual([]);
  });

  it('on adversarial floods of `](`, `](<`, `&` and whitespace', () => {
    const floods: string[] = [];
    for (const unit of ['](', '](<', '](&', '](&a', '](&#1', ']( ', '](\n', ']]((', '](a', '](&a;', ']( &a;']) {
      for (const tail of ['', '&amp;', ' &amp;', ')&amp;', '](&amp;', ']( &amp;']) {
        floods.push(unit.repeat(300) + tail, tail + unit.repeat(300), unit.repeat(150) + tail + unit.repeat(150));
      }
    }
    expect(floods.filter((text) => oracle(text).length > 0).length).toBeGreaterThan(50);
    expect(differing(floods)).toEqual([]);
  });

  it('on 20,000 seeded random strings, half free tokens and half near-miss destinations', () => {
    const next = random(0x0bf5d);
    const pick = <T,>(items: readonly T[]): T => items[Math.floor(next() * items.length)] as T;
    const run = (): string => {
      let text = '';
      for (let k = Math.floor(next() * 3); k > 0; k -= 1) text += pick(WHITESPACE);
      return text;
    };
    // A link destination with each part kept, dropped or replaced at random,
    // so the corpus sits on the boundary between a match and a miss.
    const nearMiss = (): string => {
      const part = (kept: string, other: string): string => (next() < 0.8 ? kept : next() < 0.5 ? '' : other);
      const entity = pick(['&amp;', '&#106;', '&#x6a;', '&#X6A;', '&a1;']).split('').map((c) => part(c, pick(TOKENS))).join('');
      return part('](', pick(TOKENS)) + run() + part(pick(['', '<']), pick(TOKENS)) + part(pick(['', 'java', 'a](b', '](']), pick(TOKENS)) + entity + part(pick(['', 'x', ')', ' ']), pick(TOKENS));
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

// The old pattern took about 0.4 s of CPU on 10,000 `](` and is quadratic:
// about 40 s on 100,000. The rewrite takes a few milliseconds on any row
// (docs/evidence/syzygy-rmax/obfuscated-destination-equivalence-2026-11-04.json).
const FLOOD_CPU_MS = 1_000;

describe('the obfuscated-destination scan is linear on `](` floods (syzygy-rmax)', () => {
  it.each([
    ['of `](`', '](' .repeat(100_000)],
    ['of `](<`', '](<'.repeat(100_000)],
    ['of `](&`', '](&'.repeat(100_000)],
    ['of `](&a`', '](&a'.repeat(100_000)],
    ['of `](` ending in an entity', `${'](' .repeat(100_000)}&amp;`],
    ['of `](` with an entity first', `](&amp;${'](' .repeat(100_000)}`],
  ])('scans a 100,000-unit flood %s under the bound', (_label, line) => {
    const cpu = cpuUsage();
    const findings = scanActiveContent(line);
    expect(cpuMsSince(cpu)).toBeLessThan(FLOOD_CPU_MS);
    expect(findings.every((finding) => finding.form === 'obfuscated-link-destination')).toBe(true);
  });
});
