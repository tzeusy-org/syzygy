import { describe, expect, it } from 'vitest';

import { canonicalJson } from '@syzygy/three-surface-poc-core';
import { CanonicalJsonError, encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';

// syzygy-bpyt.6.3 (DC-3): the repository has three key-sorted JSON encoders, kept apart on purpose.
//   lenient  `canonicalJson`        (three-surface-poc-core, project-shape-manifest.ts): a total function; drops
//                                   undefined members, flattens any object, leans on JSON.stringify; the one form of
//                                   every PWB sha256 identity.
//   strict   `encodeCanonicalJson`  (polaris-generation-core, canonical-json.ts): a validating encoder with limits;
//                                   rejects what it cannot spell exactly; the one form of every Polaris generation digest.
//   cap1     `deterministicLayer`   (cap1-core, evaluation.ts, not exported from the barrel): the independent oracle's own
//                                   encoder, left out of this file on purpose (cap1 imports nothing shared). No test here
//                                   pins it; canonical-json-probe.mjs compares it with the lenient encoder.
// This file pins where the first two agree and where they do not. Every expected value is typed here, from the language rules
// (ECMAScript [[OwnPropertyKeys]] order, JSON.stringify), not read back from either encoder. A change that moves one
// encoder toward the other changes an output or a refusal on some input, so it is not behaviour-preserving (GP-Q0) and goes to
// the owner: a merge would make the strict encoder refuse what the lenient one spells (an undefined member, a BigInt) and
// reorder array-index keys. On the calls the whole test suite made, both encoders spell three PWB identities alike
// (canonicalManifestJson, resourceLimitsDigest, walkthroughEvaluationIdentity); the other two carry undefined members or a BigInt.
// The record of the same comparison over the whole test suite's calls: docs/evidence/syzygy-bpyt-6-3/dc3-decode-and-canonical-json-2026-10-25.json.

const GENEROUS = { maxBytes: 64_000_000, maxNodes: 4_000_000, maxDepth: 256 } as const;
type Outcome = { readonly ok: string } | { readonly returns: string } | { readonly error: string };

const lenient = (value: unknown): Outcome => {
  try {
    const text: unknown = canonicalJson(value);
    return typeof text === 'string' ? { ok: text } : { returns: String(text) };
  } catch (error) {
    return { error: error instanceof Error ? error.constructor.name : 'non-error' };
  }
};
const strict = (value: unknown, limits: { maxBytes: number; maxNodes: number; maxDepth: number } = GENEROUS): Outcome => {
  try {
    return { ok: encodeCanonicalJson(value, limits) };
  } catch (error) {
    return { error: error instanceof CanonicalJsonError ? error.code : error instanceof Error ? error.constructor.name : 'non-error' };
  }
};

// An independent reference: keys by UTF-16 code unit, strings and numbers spelled by JSON.stringify.
const reference = (value: unknown): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(reference).join(',')}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${keys.map((key) => `${JSON.stringify(key)}:${reference(record[key])}`).join(',')}}`;
};

let seed = 20261025;
const next = (): number => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
const pick = <T,>(list: readonly T[]): T => list[next() % list.length] as T;
const NUMBERS = [0, -0, 1, -1, 7, 0.5, -2.25, 1e21, 1e-7, 123456789012345680000, 0.1 + 0.2, Number.MAX_SAFE_INTEGER, Number.MIN_VALUE];
const STRINGS = ['', 'a', 'Z', 'é', '€', '\u{1F600}', 'quote"inside', 'back\\slash', 'line\nbreak', 'tab\there', '\u0000', ' ', '\ud800', '\udc00x', 'a b'];
// Keys that are never an array index: a letter first, so no canonical numeric string among them.
const KEY_TAILS = ['', 'a', 'B', 'zz', 'é', '€', '\u{1F600}', '_', ' space', '10', '2', '-1', '1.5'];
const keyOf = (): string => `k${pick(KEY_TAILS)}${next() % 3 === 0 ? String(next() % 100) : ''}`;
const value = (depth: number): unknown => {
  const kind = next() % (depth > 0 ? 7 : 4);
  if (kind === 0) return null;
  if (kind === 1) return next() % 2 === 0;
  if (kind === 2) return pick(NUMBERS);
  if (kind === 3) return pick(STRINGS);
  if (kind === 4) return Array.from({ length: next() % 5 }, () => value(depth - 1));
  const out: Record<string, unknown> = {};
  for (let i = next() % 5; i > 0; i--) out[keyOf()] = value(depth - 1);
  return out;
};

const hasObjectWithTwoKeys = (v: unknown): boolean => {
  if (v === null || typeof v !== 'object') return false;
  if (Array.isArray(v)) return v.some(hasObjectWithTwoKeys);
  const record = v as Record<string, unknown>;
  return Object.keys(record).length >= 2 || Object.values(record).some(hasObjectWithTwoKeys);
};

describe('where the two key-sorted JSON encoders agree', () => {
  it('agree with each other and with an independent reference on 600 seeded plain JSON values', () => {
    let keyOrderMatters = 0;
    for (let i = 0; i < 600; i++) {
      const sample = value(5);
      const expected = reference(sample);
      expect(lenient(sample), `value ${i}`).toEqual({ ok: expected });
      expect(strict(sample), `value ${i}`).toEqual({ ok: expected });
      if (hasObjectWithTwoKeys(sample)) keyOrderMatters++;
    }
    // The generator reaches objects whose key order is in question, not only scalars.
    expect(keyOrderMatters).toBeGreaterThan(100);
  });

  it('agree on the rows the generator cannot reach', () => {
    const rows: ReadonlyArray<readonly [string, unknown, string]> = [
      ['a null-prototype object', Object.assign(Object.create(null) as object, { b: 1, a: 2 }), '{"a":2,"b":1}'],
      ['negative zero, spelled 0', { z: -0 }, '{"z":0}'],
      ['keys ordered by UTF-16 code unit, an astral key before U+FFFF', { '￿': 1, '\u{10000}': 2 }, '{"\u{10000}":2,"￿":1}'],
      ['a lone surrogate, escaped', ['\ud800'], '["\\ud800"]'],
      ['the empty key', { '': 1, a: 2 }, '{"":1,"a":2}'],
      ['nested empties', { a: [], b: {} }, '{"a":[],"b":{}}'],
    ];
    for (const [label, input, text] of rows) {
      expect(lenient(input), `lenient, ${label}`).toEqual({ ok: text });
      expect(strict(input), `strict, ${label}`).toEqual({ ok: text });
    }
  });
});

describe('where they differ on plain, acyclic, finite JSON', () => {
  it('a key that is an array index sorts first and numerically in the lenient encoder, by code unit in the strict one', () => {
    // [[OwnPropertyKeys]] lists integer-index keys in ascending numeric order before the other string keys; the
    // lenient encoder rebuilds its objects with sorted keys and so inherits that order. The strict one writes its own.
    expect(lenient({ b: 1, '10': 2, a: 3, '2': 4 })).toEqual({ ok: '{"2":4,"10":2,"a":3,"b":1}' });
    expect(strict({ b: 1, '10': 2, a: 3, '2': 4 })).toEqual({ ok: '{"10":2,"2":4,"a":3,"b":1}' });
    expect(lenient({ '1': 'x', '0': 'y' })).toEqual({ ok: '{"0":"y","1":"x"}' });
    expect(strict({ '1': 'x', '0': 'y' })).toEqual({ ok: '{"0":"y","1":"x"}' });
    expect(lenient({ '4294967295': 1, '4294967294': 2 })).toEqual({ ok: '{"4294967294":2,"4294967295":1}' });
    expect(strict({ '4294967295': 1, '4294967294': 2 })).toEqual({ ok: '{"4294967294":2,"4294967295":1}' });
  });
});

describe('where they differ because the strict encoder refuses what the lenient one spells', () => {
  function accessor(): object {
    return Object.defineProperty({}, 'a', { get: () => 1, enumerable: true });
  }
  function sparse(): unknown[] {
    return [1, , 3]; // eslint-disable-line no-sparse-arrays
  }
  class Point { x = 1; }
  const symbolKeyed = { a: 1, [Symbol('s')]: 2 };
  const prototypeKey: unknown = JSON.parse('{"__proto__": 1}');

  // [label, input, lenient outcome, strict outcome]
  const rows: ReadonlyArray<readonly [string, () => unknown, Outcome, Outcome]> = [
    ['an undefined member', () => ({ a: undefined, b: 1 }), { ok: '{"b":1}' }, { error: 'unsupported-value' }],
    ['an undefined array element', () => [undefined], { ok: '[null]' }, { error: 'unsupported-value' }],
    ['a top-level undefined', () => undefined, { returns: 'undefined' }, { error: 'unsupported-value' }],
    ['a function member', () => ({ f: () => 1, b: 1 }), { ok: '{"b":1}' }, { error: 'unsupported-value' }],
    ['NaN', () => NaN, { ok: 'null' }, { error: 'unsupported-value' }],
    ['Infinity in an array', () => [Infinity], { ok: '[null]' }, { error: 'unsupported-value' }],
    ['a Date', () => new Date(0), { ok: '{}' }, { error: 'unsupported-object' }],
    ['a Map', () => new Map([[1, 2]]), { ok: '{}' }, { error: 'unsupported-object' }],
    ['a class instance', () => new Point(), { ok: '{"x":1}' }, { error: 'unsupported-object' }],
    ['a getter, which the lenient encoder runs', accessor, { ok: '{"a":1}' }, { error: 'unsupported-property' }],
    ['a sparse array', sparse, { ok: '[1,null,3]' }, { error: 'unsupported-property' }],
    ['a symbol key', () => symbolKeyed, { ok: '{"a":1}' }, { error: 'unsupported-property' }],
    ['an own key named __proto__', () => prototypeKey, { ok: '{"__proto__":1}' }, { error: 'unsupported-property' }],
    ['a key named constructor', () => ({ constructor: 1 }), { ok: '{"constructor":1}' }, { error: 'unsupported-property' }],
    ['a BigInt', () => ({ n: 1n }), { error: 'TypeError' }, { error: 'unsupported-value' }],
    ['a Proxy', () => new Proxy({ a: 1 }, {}), { ok: '{"a":1}' }, { error: 'unsupported-object' }],
  ];

  it.each(rows)('%s', (_label, make, lenientOutcome, strictOutcome) => {
    expect(lenient(make())).toEqual(lenientOutcome);
    expect(strict(make())).toEqual(strictOutcome);
  });

  it('a cycle is a stack overflow in the lenient encoder and a named refusal in the strict one', () => {
    const loop: { self?: unknown } = {};
    loop.self = loop;
    expect(lenient(loop)).toEqual({ error: 'RangeError' });
    expect(strict(loop)).toEqual({ error: 'cycle' });
  });

  it('only the strict encoder has limits', () => {
    const deep = (n: number): unknown => (n === 0 ? 1 : { a: deep(n - 1) });
    expect(lenient(deep(40))).toEqual({ ok: `${'{"a":'.repeat(40)}1${'}'.repeat(40)}` });
    expect(strict(deep(40), { maxBytes: 1_000_000, maxNodes: 1_000_000, maxDepth: 10 })).toEqual({ error: 'depth-limit' });
    expect(strict(['abc'], { maxBytes: 4, maxNodes: 100, maxDepth: 4 })).toEqual({ error: 'byte-limit' });
    expect(strict([1, 2, 3], { maxBytes: 100, maxNodes: 3, maxDepth: 4 })).toEqual({ error: 'node-limit' });
    expect(strict([1], { maxBytes: 100, maxNodes: 3, maxDepth: 257 })).toEqual({ error: 'invalid-limits' });
  });
});
