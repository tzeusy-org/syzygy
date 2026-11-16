// Three key-sorted JSON encoders, side by side (syzygy-bpyt.6.3 stack 2).
// Usage: node canonical-json-probe.mjs <built clone> <out.json>
//   lenient  canonicalJson          packages/three-surface-poc-core  (every PWB sha256 identity)
//   strict   encodeCanonicalJson    packages/polaris-generation-core (every Polaris generation digest), generous limits
//   cap1     deterministicLayer     packages/cap1-core               (the Capability 1 deterministic layer; not exported)
// Part 1: a row table of value classes, the outcome of each encoder spelled out.
// Part 2: 1,200 seeded values in two populations, and how often each pair of encoders agrees. Population A holds no key that is
//         an array index; B draws a third of its keys from the array indices. Disagreements are tallied by the facts of the value.
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [clone, out] = process.argv.slice(2);
if (out === undefined) throw new Error('usage: canonical-json-probe.mjs <built clone> <out.json>');
const load = async (rel) => import(pathToFileURL(join(clone, rel)).href);
const { canonicalJson } = await load('packages/three-surface-poc-core/dist/project-shape-manifest.js');
const { encodeCanonicalJson, CanonicalJsonError } = await load('packages/polaris-generation-core/dist/canonical-json.js');
const { deterministicLayer } = await load('packages/cap1-core/dist/evaluation.js');
const sha = (t) => createHash('sha256').update(t).digest('hex');
const BIG = { maxBytes: 1_000_000_000, maxNodes: 100_000_000, maxDepth: 256 };

const run = (fn) => { try { const t = fn(); return typeof t === 'string' ? { ok: t } : { returns: String(t) }; } catch (e) { return { error: e instanceof CanonicalJsonError ? e.code : e instanceof Error ? e.constructor.name : 'non-error' }; } };
const three = (v) => ({ lenient: run(() => canonicalJson(v)), strict: run(() => encodeCanonicalJson(v, BIG)), cap1: run(() => deterministicLayer(v)) });
const same = (a, b) => a.ok !== undefined && b.ok !== undefined && a.ok === b.ok;

// ---- part 1 ----
class Point { constructor() { this.x = 1; } }
const loop = {}; loop.self = loop;
const rows = [
  ['plain object', () => ({ b: 1, a: [2, { d: 3, c: 4 }] })],
  ['array-index keys beside names', () => ({ b: 1, '10': 2, a: 3, '2': 4 })],
  ['array-index keys only', () => ({ '1': 'x', '0': 'y' })],
  ['undefined member', () => ({ a: undefined, b: 1 })],
  ['undefined array element', () => [undefined]],
  ['top-level undefined', () => undefined],
  ['NaN', () => NaN],
  ['Date', () => new Date(0)],
  ['Map', () => new Map([[1, 2]])],
  ['class instance', () => new Point()],
  ['getter', () => Object.defineProperty({}, 'a', { get: () => 1, enumerable: true })],
  ['sparse array', () => [1, , 3]],
  ['symbol key', () => ({ a: 1, [Symbol('s')]: 2 })],
  ['own key __proto__', () => JSON.parse('{"__proto__": 1}')],
  ['own key __proto__ holding an object', () => JSON.parse('{"__proto__": {"a": 1}, "b": 2}')],
  ['own key constructor', () => ({ constructor: 1 })],
  ['BigInt', () => ({ n: 1n })],
  ['Proxy', () => new Proxy({ a: 1 }, {})],
  ['cycle', () => loop],
  ['null-prototype object', () => Object.assign(Object.create(null), { b: 1, a: 2 })],
  ['negative zero', () => ({ z: -0 })],
  ['lone surrogate', () => ['\ud800']],
].map(([label, make]) => ({ label, ...three(make()) }));

// ---- part 2 ----
let seed = 20261025;
const next = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
const pick = (list) => list[next() % list.length];
const NUMBERS = [0, -0, 1, -1, 7, 0.5, -2.25, 1e21, 1e-7, 123456789012345680000, 0.1 + 0.2, Number.MAX_SAFE_INTEGER, Number.MIN_VALUE];
const STRINGS = ['', 'a', 'Z', 'é', '€', '\u{1F600}', 'quote"inside', 'back\\slash', 'line\nbreak', '\u0000', '\ud800', 'a b'];
const TAILS = ['', 'a', 'B', 'zz', 'é', '€', '\u{1F600}', '_', ' space', '10', '2', '-1', '1.5'];
const makeValue = (withIndexKeys) => {
  const keyOf = () => (withIndexKeys && next() % 3 === 0 ? String(pick([0, 1, 2, 9, 10, 11, 100, 4294967294])) : `k${pick(TAILS)}${next() % 3 === 0 ? String(next() % 100) : ''}`);
  const go = (depth) => {
    const kind = next() % (depth > 0 ? 7 : 4);
    if (kind === 0) return null;
    if (kind === 1) return next() % 2 === 0;
    if (kind === 2) return pick(NUMBERS);
    if (kind === 3) return pick(STRINGS);
    if (kind === 4) return Array.from({ length: next() % 5 }, () => go(depth - 1));
    const o = {};
    for (let i = next() % 5; i > 0; i--) o[keyOf()] = go(depth - 1);
    return o;
  };
  return go(5);
};
const population = (withIndexKeys) => {
  const t = { values: 600, lenientEqualsStrict: 0, lenientEqualsCap1: 0, strictEqualsCap1: 0, allThree: 0, strictRefused: 0, lenientDiffersFromStrictAndStrictAccepted: 0, valuesWithAnIndexKeyBesideAnotherKey: 0 };
  const hasMixedIndexKey = (v) => v !== null && typeof v === 'object' && (Array.isArray(v) ? v.some(hasMixedIndexKey) : (Object.keys(v).length >= 2 && Object.keys(v).some((k) => /^(0|[1-9][0-9]*)$/.test(k) && Number(k) < 4294967295)) || Object.values(v).some(hasMixedIndexKey));
  for (let i = 0; i < 600; i++) {
    const v = makeValue(withIndexKeys);
    const r = three(v);
    if (hasMixedIndexKey(v)) t.valuesWithAnIndexKeyBesideAnotherKey++;
    const ls = same(r.lenient, r.strict), lc = same(r.lenient, r.cap1), sc = same(r.strict, r.cap1);
    if (ls) t.lenientEqualsStrict++;
    if (lc) t.lenientEqualsCap1++;
    if (sc) t.strictEqualsCap1++;
    if (ls && lc) t.allThree++;
    if (r.strict.error !== undefined) t.strictRefused++;
    else if (!ls) t.lenientDiffersFromStrictAndStrictAccepted++;
  }
  return t;
};
const result = {
  encoders: { lenient: 'canonicalJson', strict: 'encodeCanonicalJson (limits 1e9 bytes, 1e8 nodes, depth 256)', cap1: 'deterministicLayer' },
  rows,
  populations: { A_noArrayIndexKeys: population(false), B_arrayIndexKeysIncluded: population(true) },
};
result.rowsSha256 = sha(JSON.stringify(rows));
writeFileSync(out, `${JSON.stringify(result, null, 1)}\n`);
console.log(`rows ${rows.length}; A ${JSON.stringify(result.populations.A_noArrayIndexKeys)}; B ${JSON.stringify(result.populations.B_arrayIndexKeysIncluded)}`);
