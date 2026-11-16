// Extended object differential (R-GP-IMPL-OBJECT-ISO-HELPERS-1). Re-uses the retained differential.mjs's own corpus, evaluator and
// grouping, and adds the reviewer's values. Members: every base `shape` function of the census, the head's is-record.ts exact text,
// the head's is-record.ts loaded by Node itself (type stripping), and the built @syzygy/support dist the importers resolve.
// Usage: node --allow-natives-syntax differential-extended.mjs <clone> <census-base.json> <census-head.json> <out.json>
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { pathToFileURL } from 'node:url';

const [clone, censusBase, censusHead, out] = process.argv.slice(2);
const d = await import(pathToFileURL(`${clone}/docs/evidence/syzygy-bpyt-6-3-iso/differential.mjs`).href);
const ts = createRequire(`${clone}/package.json`)('typescript');

function reviewerCorpus() {
  const extra = [];
  const add = (label, make) => { try { extra.push([label, make()]); } catch (e) { extra.push([`${label} (UNBUILDABLE: ${e.constructor.name})`, Symbol('unbuildable')]); } };
  add('arguments object', () => (function () { return arguments; })(1, 2));
  add('strict arguments object', () => (function () { 'use strict'; return arguments; })());
  add('other realm arguments object', () => runInNewContext('(function () { return arguments; })(1)'));
  add('Float64Array', () => new Float64Array(1));
  add('BigInt64Array', () => new BigInt64Array(1));
  add('Buffer', () => Buffer.from('ab'));
  add('other realm Uint8Array', () => runInNewContext('new Uint8Array(1)'));
  add('Proxy(Proxy([]))', () => new Proxy(new Proxy([], {}), {}));
  add('other realm Proxy([])', () => runInNewContext('new Proxy([], {})'));
  add('Proxy([]) with throwing handler', () => new Proxy([], new Proxy({}, { get() { throw new Error('trap must not run'); } })));
  add('Proxy({}) whose getPrototypeOf says Array.prototype', () => new Proxy({}, { getPrototypeOf: () => Array.prototype }));
  add('Proxy(revoked Proxy([]))', () => { const r = Proxy.revocable([], {}); r.revoke(); return new Proxy(r.proxy, {}); });
  add('revoked Proxy(function)', () => { const r = Proxy.revocable(() => 1, {}); r.revoke(); return r.proxy; });
  add('Array.prototype', () => Array.prototype);
  add('other realm Array.prototype', () => runInNewContext('Array.prototype'));
  add('Object.create(other realm Array.prototype)', () => Object.create(runInNewContext('Array.prototype')));
  add('array with prototype set to Object.prototype', () => Object.setPrototypeOf([], Object.prototype));
  add('array with null prototype', () => Object.setPrototypeOf([1], null));
  add('{constructor: Array}', () => ({ constructor: Array }));
  add('toStringTag getter that throws', () => Object.defineProperty({}, Symbol.toStringTag, { get() { throw new Error('tag must not run'); } }));
  add('frozen array', () => Object.freeze([1]));
  add('structuredClone([])', () => structuredClone([]));
  add('other realm SubArray', () => runInNewContext('new (class S extends Array {})()'));
  add('array iterator', () => [].values());
  add('generator object', () => (function* () { yield 1; })());
  add('WeakRef', () => new WeakRef({}));
  add('globalThis', () => globalThis);
  add('AggregateError', () => new AggregateError([]));
  add('bound function', () => (() => 1).bind(null));
  add('other realm function', () => runInNewContext('(function () {})'));
  add('class with static isArray', () => ({ isArray: true }));
  // document.all-like: V8's undetectable object (typeof 'undefined', == null); only with --allow-natives-syntax.
  add('V8 undetectable (document.all-like)', () => new Function('return %GetUndetectable()')());
  return extra;
}

const rowsBase = JSON.parse(readFileSync(censusBase, 'utf8')).rows.filter((r) => r.kinds.includes('shape'));
const headRow = JSON.parse(readFileSync(censusHead, 'utf8')).rows.find((r) => r.file === 'packages/support/src/is-record.ts');
const constantsOf = (r) => d.literalConstants(ts, r.file, readFileSync(`${clone}/${r.file}`, 'utf8'));
const members = rowsBase.map((r) => ({ id: `base ${r.file}:${r.line} ${r.name}`, fn: d.evaluate(ts, r.name, r.exactText) }));
members.push({ id: 'head packages/support/src/is-record.ts exact text', fn: d.evaluate(ts, headRow.name, headRow.exactText.replace(/^export\s+/, '')) });
const stripped = await import(pathToFileURL(`${clone}/packages/support/src/is-record.ts`).href);
members.push({ id: 'head is-record.ts loaded by node (type stripping)', fn: stripped.isRecord });
const dist = await import(pathToFileURL(`${clone}/packages/support/dist/index.js`).href);
members.push({ id: 'head @syzygy/support dist/index.js isRecord', fn: dist.isRecord });

const original = d.objectCorpus();
const extra = reviewerCorpus();
const corpus = [...original, ...extra];
const groups = d.group(members, corpus);
const MERGED = ['check.ts', 'close.ts', 'design-review.ts', 'execution-flags.ts', 'inventory.ts', 'render.ts', 'review.ts', 'run-record.ts', 'screen.ts',
  'session-statement.ts', 'waiting-sessions.ts', 'discovery.ts', 'dossier-evaluation.ts', 'public-source-classification.ts', 'reader-questions.ts',
  'secret-redaction.ts', 'authority-artifact-fields.ts'];
const isMerged = (id) => MERGED.some((f) => id.includes(`/src/${f}:`)) && !id.includes('discovery-provider');
const headIds = members.filter((m) => m.id.startsWith('head')).map((m) => m.id);
const headGroup = groups.find((g) => g.members.includes(headIds[0]));
const mergedOutside = members.filter((m) => isMerged(m.id) && !headGroup.members.includes(m.id)).map((m) => m.id);
const extraTable = extra.map(([label, value]) => ({ label, head: d.outcome(dist.isRecord, value),
  mergedOutcomes: [...new Set(members.filter((m) => isMerged(m.id)).map((m) => d.outcome(m.fn, value)))] }));
const result = {
  corpus: { original: original.length, reviewer: extra.length, total: corpus.length, reviewerLabels: extra.map(([l]) => l) },
  members: members.length, mergedCount: members.filter((m) => isMerged(m.id)).length,
  groups: groups.map((g) => ({ signature: g.signatureSha256, size: g.members.length, members: g.members })),
  headGroupHoldsAllHeadForms: headIds.every((id) => headGroup.members.includes(id)),
  mergedOutsideHeadGroup: mergedOutside, extraTable,
};
writeFileSync(out, `${JSON.stringify(result, null, 1)}\n`);
console.log(`corpus ${original.length} + ${extra.length} = ${corpus.length}; members ${members.length}; merged ${result.mergedCount}; groups ${groups.length}`);
for (const g of result.groups) console.log(`  ${g.signature} x${g.size}: ${g.members.map((m) => m.replace(/^base packages\/|^base /, '')).join(' | ')}`);
console.log(`head forms all in one group: ${result.headGroupHoldsAllHeadForms}; merged copies outside the head group: ${mergedOutside.length}`);
for (const row of extraTable) console.log(`  ${row.label}: head ${row.head}; merged copies ${row.mergedOutcomes.join(',')}`);
