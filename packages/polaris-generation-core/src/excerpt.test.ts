import { describe, expect, it } from 'vitest';

import { DECLARATION_LINE_MAX, DOC_COMMENT_SHARE_PERCENT, EXCERPT_KINDS, LICENCE_MARKERS, MAX_EXCERPT_RANGES, PATTERN_PREFIX_MAX, buildExcerpt } from './excerpt.js';

const BUDGET = 1500;
/** CPU time so far: this thread's (`process.threadCpuUsage`, Node 23.9 and later) or, where `process.threadCpuUsage` is absent
 * (Node before 23.9), the whole process's (`process.cpuUsage`), which also counts the worker's other threads; each bound keeps
 * its 10x margins under both (docs/evidence/syzygy-bpyt-4-5/cpu-separation-node22.json). */
const cpuUsage = (from?: NodeJS.CpuUsage): NodeJS.CpuUsage =>
  (typeof process.threadCpuUsage === 'function' ? process.threadCpuUsage(from) : process.cpuUsage(from));
/** CPU milliseconds spent since `from`: the work done, which neither load on the host nor the pool running the file stretches. */
const cpuMsSince = (from: NodeJS.CpuUsage): number => { const { user, system } = cpuUsage(from); return (user + system) / 1000; };
// A CPU-time bound sits at least 10x from the slowest head run of its region and from the fastest run of the quadratic
// mutant it names (docs/evidence/syzygy-bpyt-4-5/cpu-separation.json, syzygy-bpyt.4.5). Each was set at the geometric
// mean of the two at 3fc3709f and is kept, not refitted to each re-measurement, while both margins hold.
const HOSTILE_LINE_CPU_MS = 140; // the prefix cap removed and FUNCTION_LINE given overlapping blank runs
const LICENCE = `/*
 * Copyright (c) 2009-2024, Example Author
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met.
 */
`;
const BODY = `${LICENCE}
/* Overview: this unit owns the widget state machine. */

#include "server.h"
#define WIDGET_MAX 1024
struct widget {
    int phase;
};
typedef struct gadget {
    int id;
} gadget;
int widgetInit(struct widget *w) {
    return 0;
}
static void widgetStep(struct widget *w, int n) {
    w->phase += n;
}
`;
const bytes = (text: string): Buffer => Buffer.from(text, 'utf8');
/** What the ranges quote, in order, joined as the excerpt joins its segments. */
const quoted = (body: string, ranges: readonly (readonly [number, number])[], base = 0): string[] => ranges.map(([a, b]) => bytes(body).subarray(a - base, b - base).toString('utf8'));
const lines = (text: string): string[] => text.split('\n');

describe('excerpt: a leading licence comment is skipped, by literal markers', () => {
  it('skips a block comment that carries a marker, records its byte range, and starts at the first doc comment', () => {
    const ex = buildExcerpt('src/widget.c', BODY, 0, BUDGET);
    expect(ex.kind).toBe('code-declarations');
    expect(ex.licenceSkipped).toEqual([0, bytes(LICENCE.trimEnd()).length]);
    expect(ex.text.startsWith('/* Overview')).toBe(true);
    expect(ex.text).not.toContain('Redistribution');
    expect(ex.text).toContain('/* Overview: this unit owns the widget state machine. */');
  });

  it('lists exactly the four literal markers', () => {
    expect([...LICENCE_MARKERS]).toEqual(['Copyright', 'SPDX-License-Identifier', 'Permission is hereby granted', 'Licensed under']);
  });

  it.each(['Copyright', 'SPDX-License-Identifier', 'Permission is hereby granted', 'Licensed under'])('treats %s as a marker', marker => {
    const body = `/* ${marker} 2024 */\nint f(int x) {\n    return x;\n}\n`;
    const ex = buildExcerpt('a.c', body, 0, BUDGET);
    expect(ex.licenceSkipped).not.toBeNull();
    expect(ex.text).not.toContain(marker);
  });

  it('matches markers case-sensitively: a lower-case word is not a licence comment', () => {
    const body = '/* copyright handling lives in the next function */\nint f(int x) {\n    return x;\n}\n';
    const ex = buildExcerpt('a.c', body, 0, BUDGET);
    expect(ex.licenceSkipped).toBeNull();
    expect(ex.text).toContain('copyright handling');
  });

  it('skips a run of // lines and several successive licence blocks, but not a comment without a marker', () => {
    const body = '// Copyright 2024 Example\n// All rights reserved.\n\n/* SPDX-License-Identifier: BSD-3-Clause */\n/* Event loop overview. */\nint ev(int fd) {\n    return fd;\n}\n';
    const ex = buildExcerpt('ev.c', body, 0, BUDGET);
    expect(ex.text).not.toContain('All rights');
    expect(ex.text).not.toContain('SPDX');
    expect(ex.text).toContain('Event loop overview.');
  });

  it('does not skip a later comment or code that merely follows the first line', () => {
    const body = 'int first(int x) {\n    return x;\n}\n/* Copyright later */\nint second(int y) {\n    return y;\n}\n';
    const ex = buildExcerpt('a.c', body, 0, BUDGET);
    expect(ex.licenceSkipped).toBeNull();
    expect(ex.text).toContain('int first(int x) {');
  });

  it('is not fooled by a byte-order mark before the licence comment', () => {
    const ex = buildExcerpt('a.c', `\uFEFF${LICENCE}int f(int x) {\n    return x;\n}\n`, 0, BUDGET);
    expect(ex.licenceSkipped).not.toBeNull();
    expect(ex.text).toContain('int f(int x) {');
  });
});

describe('excerpt: declarations by literal line patterns', () => {
  const picked = (body: string, path = 'a.c'): string[] => lines(buildExcerpt(path, body, 0, BUDGET).text);

  it('takes defines, struct, typedef struct and function signature lines at column zero, in order', () => {
    const got = picked(BODY);
    expect(got).toEqual(['/* Overview: this unit owns the widget state machine. */', '#define WIDGET_MAX 1024', 'struct widget {', 'typedef struct gadget {',
      'int widgetInit(struct widget *w) {', 'static void widgetStep(struct widget *w, int n) {']);
  });

  it('ignores indented lines, closing braces, includes, calls, assignments and control statements', () => {
    const body = 'int run(int x) {\n    int y = helper(x);\n    return y;\n}\nFOO(bar);\nSTART_BLOCK(x)\nint table = lookup(3,\nint z = compute(3);\nif (x) {\nelse if (y) {\nwhile (y) {\nreturn (x);\n#include "a.h"\n';
    expect(picked(body)).toEqual(['int run(int x) {']);
  });

  it('keeps a prototype in a header and drops it in a source file', () => {
    const proto = 'int widgetInit(struct widget *w);\n';
    expect(picked(proto, 'a.h')).toEqual(['int widgetInit(struct widget *w);']);
    expect(buildExcerpt('a.c', proto, 0, BUDGET).kind).toBe('head');
  });

  it('takes the doc comment only before the first function or tag, not after it', () => {
    const body = 'int first(int x) {\n    return x;\n}\n/* late comment */\nint second(int y) {\n    return y;\n}\n';
    expect(picked(body)).toEqual(['int first(int x) {', 'int second(int y) {']);
    const defineFirst = '#define A 1\n/* doc after a define */\nint f(int x) {\n    return x;\n}\n';
    expect(picked(defineFirst)).toEqual(['#define A 1', '/* doc after a define */', 'int f(int x) {']);
  });

  it('cuts the doc comment at its share of the budget and a long declaration line at its limit', () => {
    const doc = `/*\n${' * words '.repeat(300).split(' * ').join('\n * ')}\n */\n`;
    const ex = buildExcerpt('a.c', `${doc}int tail(int x) {\n    return x;\n}\n`, 0, 400);
    expect(ex.text.length).toBeLessThanOrEqual(400);
    const docChars = ex.text.split('\n').filter(line => line !== 'int tail(int x) {').join('\n').length;
    expect(DOC_COMMENT_SHARE_PERCENT).toBe(40);
    expect(docChars).toBeLessThanOrEqual(160);
    const longLine = `int f(${'int a, '.repeat(60)}int z) {\n    return 0;\n}\n`;
    expect(buildExcerpt('a.c', longLine, 0, BUDGET).text.split('\n')[0]!.length).toBe(DECLARATION_LINE_MAX);
  });

  it('never exceeds the budget, for any budget, and always keeps whole lines', () => {
    for (const budget of [60, 120, 400, 1500]) {
      const ex = buildExcerpt('src/widget.c', BODY.repeat(5), 0, budget);
      expect(ex.text.length, String(budget)).toBeLessThanOrEqual(budget);
    }
  });

  it('falls back: opening text after the licence when no declaration is found, and the plain head when nothing was skipped', () => {
    const after = buildExcerpt('a.c', `${LICENCE}static const char *table[] = { "a", "b" };\n/* data only */\n`, 0, BUDGET);
    expect(after.kind).toBe('code-after-licence');
    expect(after.text).toContain('static const char *table');
    expect(after.text).not.toContain('Redistribution');
    const plain = buildExcerpt('a.c', 'static const char *table[] = { "a" };\n', 0, BUDGET);
    expect(plain.kind).toBe('head');
    expect(plain.text).toBe('static const char *table[] = { "a" };\n');
  });
});

describe('excerpt: kinds and the unchanged head', () => {
  it('gives README and documents the same bound as everything else and keeps the opening text', () => {
    const text = 'x'.repeat(10_000);
    for (const path of ['README.md', 'docs/guide.rst', 'NOTES.txt', 'docs/intro.adoc', '00-RELEASENOTES', 'CHANGELOG', 'sub/README']) {
      const ex = buildExcerpt(path, text, 0, 100);
      expect(ex.kind, path).toBe('head');
      expect(ex.text, path).toBe('x'.repeat(100));
    }
  });

  it('leaves every other file at the original head of maxExcerptChars', () => {
    for (const path of ['Makefile', 'redis.conf', 'tests/unit/expire.tcl', 'src/x.py', 'src/c']) {
      const ex = buildExcerpt(path, 'y'.repeat(5000), 0, 100);
      expect(ex.kind, path).toBe('head');
      expect(ex.text).toBe('y'.repeat(100));
    }
  });

  it('counts a head in code points, not code units, and never splits a pair', () => {
    expect(buildExcerpt('Makefile', '\u{1F600}'.repeat(10), 0, 3).text).toBe('\u{1F600}'.repeat(3));
  });

  it('is deterministic and uses only kinds from the closed list', () => {
    const a = buildExcerpt('src/widget.c', BODY, 7, BUDGET), b = buildExcerpt('src/widget.c', BODY, 7, BUDGET);
    expect(a).toEqual(b);
    expect(EXCERPT_KINDS).toContain(a.kind);
  });
});

describe('excerpt: ranges are exact UTF-8 byte ranges of the text it was handed', () => {
  it('quote exactly the lines of the excerpt, in order, and never the licence comment', () => {
    const ex = buildExcerpt('src/widget.c', BODY, 0, BUDGET);
    const segments = quoted(BODY, ex.ranges);
    expect(lines(ex.text).join('\n')).toBe(segments.join('\n'));
    expect(segments.join('')).not.toContain('Copyright');
    for (let i = 1; i < ex.ranges.length; i++) expect(ex.ranges[i]![0]).toBeGreaterThan(ex.ranges[i - 1]![1]);
    expect(ex.ranges.length).toBeLessThanOrEqual(MAX_EXCERPT_RANGES);
  });

  it('state the skipped licence comment as a blob-absolute byte range, and null when nothing was skipped', () => {
    expect(buildExcerpt('src/widget.c', BODY, 4096, BUDGET).licenceSkipped).toEqual([4096, 4096 + bytes(LICENCE.trimEnd()).length]);
    expect(buildExcerpt('a.c', 'int f(int x) {\n}\n', 4096, BUDGET).licenceSkipped).toBeNull();
    expect(buildExcerpt('Makefile', LICENCE, 0, BUDGET).licenceSkipped).toBeNull();
  });

  it('are blob-absolute: a piece that starts at a byte offset shifts every range by it', () => {
    const plain = buildExcerpt('src/widget.c', BODY, 0, BUDGET), shifted = buildExcerpt('src/widget.c', BODY, 4096, BUDGET);
    expect(shifted.ranges).toEqual(plain.ranges.map(([a, b]) => [a + 4096, b + 4096]));
    expect(quoted(BODY, shifted.ranges, 4096)).toEqual(quoted(BODY, plain.ranges));
  });

  it('count bytes, not characters, with multi-byte text, CRLF line ends and a BOM', () => {
    const body = '/* Pr\u00e9via: \u00fcn\u00efcode doc \u00e9 */\r\nint f(int x) { /* \u00e9 */\r\n    return x;\r\n}\r\n#define ECOLE "\u00c9"\r\n';
    const ex = buildExcerpt('a.c', body, 0, BUDGET);
    const segments = quoted(body, ex.ranges);
    expect(segments.join('\n')).toBe(lines(ex.text).join('\n'));
    expect(segments.some(segment => segment.includes('\r'))).toBe(false);
    expect(ex.ranges[0]![0]).toBe(0);
    const bom = buildExcerpt('a.c', `\uFEFF/* doc */\nint f(int x) {\n}\n`, 0, BUDGET);
    expect(quoted(`\uFEFF/* doc */\nint f(int x) {\n}\n`, bom.ranges).join('\n')).toBe(lines(bom.text).join('\n'));
  });

  it('for a head excerpt is the single range from the start of the text', () => {
    const ex = buildExcerpt('README.md', 'héllo '.repeat(500), 10, 100);
    expect(ex.ranges).toEqual([[10, 10 + bytes(ex.text).length]]);
    expect(buildExcerpt('README.md', '', 0, 100).ranges).toEqual([]);
  });

  it('are capped at the range limit when a large budget quotes more separated lines', () => {
    const body = Array.from({ length: 600 }, (_, i) => `#define D${i} ${i}\nint x${i};`).join('\n');
    const ex = buildExcerpt('a.c', body, 0, 1_000_000);
    expect(lines(ex.text).length).toBe(600);
    expect(ex.ranges.length).toBe(512);
  });

  it('merge neighbouring lines into one range', () => {
    const ex = buildExcerpt('a.c', '#define A 1\n#define B 2\n#define C 3\n', 0, BUDGET);
    expect(ex.ranges).toEqual([[0, 35]]);
  });
});

describe('excerpt: line endings and hostile lines', () => {
  const crlf = (text: string): string => text.replace(/\n/gu, '\r\n');
  const mixed = (text: string): string => text.split('\n').map((line, i) => (i % 2 === 0 ? `${line}\r` : line)).join('\n');
  const forms: [string, string][] = [['LF', BODY], ['CRLF', crlf(BODY)], ['mixed', mixed(BODY)]];

  for (const [name, body] of forms) {
    it(`${name}: the bytes at the recorded ranges, joined by one newline, are the excerpt text`, () => {
      const ex = buildExcerpt('src/widget.c', body, 0, BUDGET);
      expect(ex.kind).toBe('code-declarations');
      expect(quoted(body, ex.ranges).join('\n')).toBe(ex.text);
      for (const [a, b] of ex.ranges) expect(b).toBeGreaterThan(a);
      const [from, to] = ex.licenceSkipped!;
      expect(bytes(body).subarray(from, to).toString('utf8')).toContain('Copyright');
    });

    it(`${name}: the after-licence fallback quotes exact bytes too`, () => {
      const plain = `${LICENCE}\nstatic const char *banner = "hello";\n\nstatic int counter = 3;\n`;
      const text = name === 'LF' ? plain : name === 'CRLF' ? crlf(plain) : mixed(plain);
      const ex = buildExcerpt('src/data.c', text, 0, BUDGET);
      expect(ex.kind).toBe('code-after-licence');
      expect(ex.text).toBe('static const char *banner = "hello";\nstatic int counter = 3;');
      expect(quoted(text, ex.ranges).join('\n')).toBe(ex.text);
    });
  }

  it('a blank line inside a CRLF doc comment leaves no empty range', () => {
    const body = crlf('/* first line\n\n   second line */\nint f(int x) {\n}\n');
    const ex = buildExcerpt('a.c', body, 0, BUDGET);
    expect(ex.ranges.every(([a, b]) => b > a)).toBe(true);
    expect(ex.text).toBe('/* first line\n   second line */\nint f(int x) {');
    expect(quoted(body, ex.ranges).join('\n')).toBe(ex.text);
  });

  for (const [name, lead] of [['a tag keyword', 'struct'], ['an identifier', 'a']] as const) {
    it(`stays linear on one 100k line of spaces after ${name}`, () => {
      const hostile = `${lead}${' '.repeat(100_000)}x\nint f(int a) {\n}\n`;
      const cpu = cpuUsage();
      const ex = buildExcerpt('a.c', hostile, 0, BUDGET);
      expect(cpuMsSince(cpu)).toBeLessThan(HOSTILE_LINE_CPU_MS);
      expect(ex.text).toBe('int f(int a) {');
    });
  }

  it('never takes a line longer than the pattern prefix as a declaration', () => {
    const long = `#define LONG ${'x'.repeat(PATTERN_PREFIX_MAX)}\n#define SHORT 1\n`;
    expect(buildExcerpt('a.c', long, 0, BUDGET).text).toBe('#define SHORT 1');
  });
});
