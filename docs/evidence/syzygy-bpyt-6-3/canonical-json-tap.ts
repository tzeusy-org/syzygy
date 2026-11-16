// Vitest setup file for the canonical JSON measurement of syzygy-bpyt.6.3 stack 2. NEVER COMMITTED INTO THE SOURCE TREE:
// canonical-json-tap-apply.py copies it to the root of a scratch clone, adds two one-line calls at the top of the two
// encoders and registers this file as a second setup file there. Every call to either encoder then reports to
// `globalThis.__cjTap(kind, value, limits)`, which runs BOTH encoders on the same value and appends one line of facts
// to CJ_TAP_OUT.<pid>: which encoder was called, who called it, whether the two spelled the value the same, and why not.
// The line holds digests, sizes and flags, never the value. Reentrancy is guarded, so the tap's own calls are not counted.
import { appendFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

import { canonicalJson } from './packages/three-surface-poc-core/src/project-shape-manifest.ts';
import { encodeCanonicalJson, CanonicalJsonError } from './packages/polaris-generation-core/src/canonical-json.ts';

type Kind = 'lenient' | 'strict';
const OUT = process.env['CJ_TAP_OUT'];
const ROOT = process.env['CJ_TAP_ROOT'] ?? process.cwd();
const BIG = { maxBytes: 1_000_000_000, maxNodes: 100_000_000, maxDepth: 256 };
let busy = false;

const sha = (text: string): string => createHash('sha256').update(text).digest('hex').slice(0, 16);
const INDEX_KEY = /^(0|[1-9][0-9]*)$/;
const isIndexKey = (key: string): boolean => INDEX_KEY.test(key) && Number(key) < 4294967295;

interface Facts {
  nodes: number;
  undefinedValue: boolean;
  nonFinite: boolean;
  nonPlainObject: boolean;
  accessor: boolean;
  symbolKey: boolean;
  forbiddenKey: boolean;
  sparse: boolean;
  bigint: boolean;
  functionValue: boolean;
  cycle: boolean;
  orderSensitiveIntegerKeys: boolean;
  capped: boolean;
}

function scan(root: unknown): Facts {
  const facts: Facts = { nodes: 0, undefinedValue: false, nonFinite: false, nonPlainObject: false, accessor: false, symbolKey: false, forbiddenKey: false, sparse: false, bigint: false, functionValue: false, cycle: false, orderSensitiveIntegerKeys: false, capped: false };
  const onPath = new Set<object>();
  const seen = new Set<object>();
  const walk = (value: unknown, depth: number): void => {
    if (facts.nodes >= 200_000 || depth > 300) { facts.capped = true; return; }
    facts.nodes++;
    if (value === undefined) { facts.undefinedValue = true; return; }
    if (typeof value === 'number') { if (!Number.isFinite(value)) facts.nonFinite = true; return; }
    if (typeof value === 'bigint') { facts.bigint = true; return; }
    if (typeof value === 'function') { facts.functionValue = true; return; }
    if (typeof value === 'symbol') { facts.functionValue = true; return; }
    if (value === null || typeof value !== 'object') return;
    if (onPath.has(value)) { facts.cycle = true; return; }
    if (seen.has(value)) return;
    seen.add(value);
    onPath.add(value);
    const prototype: unknown = Object.getPrototypeOf(value);
    if (Array.isArray(value)) {
      if (prototype !== Array.prototype) facts.nonPlainObject = true;
      if (Reflect.ownKeys(value).length !== value.length + 1) facts.sparse = true;
      for (let i = 0; i < value.length; i++) walk(value[i], depth + 1);
    } else {
      if (prototype !== Object.prototype && prototype !== null) facts.nonPlainObject = true;
      const keys = Reflect.ownKeys(value);
      const names: string[] = [];
      for (const key of keys) {
        if (typeof key !== 'string') { facts.symbolKey = true; continue; }
        names.push(key);
        if (key === '__proto__' || key === 'prototype' || key === 'constructor') facts.forbiddenKey = true;
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (descriptor !== undefined && !('value' in descriptor)) facts.accessor = true;
      }
      const indexed = names.filter(isIndexKey);
      if (indexed.length > 0 && names.length >= 2) {
        const codeUnitOrder = [...names].sort();
        const engineOrder = names; // [[OwnPropertyKeys]]: indices ascending, then strings in creation order
        const lenientOrder = [...indexed].sort((a, b) => Number(a) - Number(b)).concat(names.filter((n) => !isIndexKey(n)).sort());
        if (JSON.stringify(lenientOrder) !== JSON.stringify(codeUnitOrder)) facts.orderSensitiveIntegerKeys = true;
        void engineOrder;
      }
      for (const key of names) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (descriptor !== undefined && 'value' in descriptor) walk(descriptor.value, depth + 1);
      }
    }
    onPath.delete(value);
  };
  walk(root, 0);
  return facts;
}

const reasonsOf = (facts: Facts): string[] => Object.entries(facts).filter(([k, v]) => v === true && k !== 'capped').map(([k]) => k);

const ENCODER_FRAMES = new Set(['canonicalJson', 'encodeCanonicalJson', 'digestCanonicalJson', '__cjTap']);

function callerOf(stack: string): { readonly where: string; readonly origin: 'production' | 'test' | 'unknown' } {
  for (const frame of stack.split('\n').slice(1)) {
    const m = /\(?(\/[^():]+):(\d+):\d+\)?\s*$/.exec(frame.trim());
    if (!m) continue;
    const file = m[1] as string;
    const fn = /at\s+(?:async\s+)?(?:\w+\.)?([^\s(]+)/.exec(frame.trim())?.[1] ?? '?';
    if (ENCODER_FRAMES.has(fn) || file.endsWith('cj-tap-setup.ts') || !file.startsWith(ROOT) || file.includes('/node_modules/')) continue;
    const relative = file.slice(ROOT.length + 1);
    const origin = /\.(test|testkit)\.ts$/.test(relative) || relative.includes('/fixtures/') || /\/test-[^/]*\.ts$/.test(relative) ? 'test' : 'production';
    return { where: `${relative}:${fn}`, origin };
  }
  return { where: 'unknown', origin: 'unknown' };
}

const outcome = (run: () => string): { readonly text?: string; readonly error?: string } => {
  try {
    const text: unknown = run();
    return typeof text === 'string' ? { text } : { error: 'returned-non-string' };
  } catch (error) {
    return { error: error instanceof CanonicalJsonError ? error.code : error instanceof Error ? error.constructor.name : 'non-error' };
  }
};

(globalThis as { __cjTap?: unknown }).__cjTap = (kind: Kind, value: unknown, limits?: unknown): void => {
  if (OUT === undefined || busy) return;
  busy = true;
  try {
    const caller = callerOf(new Error().stack ?? '');
    const facts = scan(value);
    const lenient = outcome(() => canonicalJson(value));
    const strict = outcome(() => encodeCanonicalJson(value, BIG));
    const same = lenient.text !== undefined && strict.text !== undefined && lenient.text === strict.text;
    const line = {
      kind, caller: caller.where, origin: caller.origin,
      same,
      lenient: lenient.text !== undefined ? { bytes: Buffer.byteLength(lenient.text), sha: sha(lenient.text) } : { error: lenient.error },
      strict: strict.text !== undefined ? { bytes: Buffer.byteLength(strict.text), sha: sha(strict.text) } : { error: strict.error },
      reasons: reasonsOf(facts), nodes: facts.nodes, capped: facts.capped,
      ownLimits: kind === 'strict' ? limits : undefined,
    };
    appendFileSync(`${OUT}.${process.pid}`, `${JSON.stringify(line)}\n`);
  } finally {
    busy = false;
  }
};
