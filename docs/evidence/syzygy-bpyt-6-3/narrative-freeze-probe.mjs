// Where the package's deepFreeze and the variant it replaced in polaris-narrative.ts differ (review R-GP-IMPL-SUPPORT-LEAF-1, N7).
// Usage: node narrative-freeze-probe.mjs <repo with the base commit> <built clone> > out.json
//
// The old variant is read from the committed blob at the base commit, and the probe refuses to run unless the blob holds the three
// statements this file runs, so the old behaviour is the committed one and not a retyped one. The package side is the built
// `@syzygy/support` of the clone. Each case is run on both, on a fresh value each, and every object the value reaches is
// counted as frozen or not afterwards; a throw is recorded with its name and the first line of its message.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [repo, clone] = process.argv.slice(2);
if (clone === undefined) throw new Error('usage: node narrative-freeze-probe.mjs <repo> <built clone>');
const BASE = 'a088f1caf061c1a2062527ce8521c9b64c3c7fd1';
const BLOB = 'apps/three-surface-poc/src/polaris-narrative.ts';
const blob = execFileSync('git', ['-C', repo, 'show', `${BASE}:${BLOB}`], { encoding: 'utf8' });
const STATEMENTS = [
  "    for (const inner of Object.values(value as Record<string, unknown>)) deepFreeze(inner);",
  '    Object.freeze(value);',
  "  if (value !== null && typeof value === 'object') {",
];
for (const statement of STATEMENTS) if (blob.split('\n').filter((line) => line === statement).length !== 1) throw new Error(`the base blob does not hold exactly once: ${statement}`);

function oldDeepFreeze(value) {
  if (value !== null && typeof value === 'object') {
    for (const inner of Object.values(value)) oldDeepFreeze(inner);
    Object.freeze(value);
  }
  return value;
}
const { deepFreeze: packageDeepFreeze } = await import(pathToFileURL(join(clone, 'packages/support/dist/index.js')).href);

/** Every distinct object reachable through own enumerable values, a typed array as one object (its elements are numbers). */
function census(root) {
  const seen = new Set();
  const walk = (v) => {
    if (v === null || typeof v !== 'object' || seen.has(v)) return;
    seen.add(v);
    for (const m of Object.values(v)) walk(m);
  };
  walk(root);
  return { objects: seen.size, frozen: [...seen].filter((o) => Object.isFrozen(o)).length };
}

const CASES = [
  ['typed array member, non-empty, two siblings', () => ({ a: {}, view: new Uint8Array(1), b: {} })],
  ['typed array member, non-empty, one sibling', () => ({ a: {}, view: new Uint8Array(1) })],
  ['typed array member first, non-empty, one sibling', () => ({ view: new Uint8Array(1), a: {} })],
  ['typed array member, empty', () => ({ a: {}, view: new Uint8Array(0) })],
  ['control: nested plain objects', () => ({ a: { b: { c: {} } }, d: [{}, {}] })],
  ['stated difference 1: a cycle', () => { const x = { name: 'x' }; x.self = x; return x; }],
  ['stated difference 2: a frozen shell around an unfrozen member', () => Object.freeze({ inner: { leaf: {} } })],
];
const run = (label, freeze, make) => {
  const value = make();
  let threw = null;
  try { freeze(value); } catch (error) { threw = { name: error?.name, message: String(error?.message).split('\n')[0] }; }
  return { implementation: label, threw, ...census(value) };
};
const rows = CASES.map(([name, make]) => ({ case: name, old: run('old (polaris-narrative.ts at the base)', oldDeepFreeze, make), package: run('@syzygy/support', packageDeepFreeze, make) }));
const body = { base: BASE, blob: BLOB, blobSha256: createHash('sha256').update(blob).digest('hex'), node: process.version, rows };
console.log(JSON.stringify(body, null, 1));
