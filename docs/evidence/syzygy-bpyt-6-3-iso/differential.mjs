// Differential for syzygy-bpyt.6.3 stack 4: every object-shape predicate and every extractable date helper, run on a hostile corpus.
// Usage: node differential.mjs <git repo> <commit> <census.json from census.mjs> <out.json>
//        node differential.mjs --selftest
//
// Each function is taken from the census as its exact text at the commit, transpiled (types erased, nothing else), and
// evaluated alone. Two functions "decide identically" only if their outcome strings agree on every corpus entry, where an
// outcome is T, F, E:<error name>, or V:<value> for a function that does not return a boolean. Functions are then grouped by
// the full outcome string; a group of one is a copy that decides differently from every other and is not a merge candidate.
//
// The object corpus is hostile on purpose: arrays and array look-alikes, null-prototype and cross-realm objects, boxed
// primitives, class instances, revoked and trapping proxies. The date corpus covers leap days, impossible days, offsets,
// fractional seconds, lowercase t/z, 24:00, a leap second, year 0000 and the signed six-digit years, and non-strings.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { pathToFileURL } from 'node:url';
import { git, sha, functionLikes } from './census.mjs';

const loadTs = (repo) => createRequire(resolve(repo, 'package.json'))('typescript');

/** `[label, value]` pairs; the label is stable text, the value is built fresh per call so mutation cannot leak across functions. */
export function objectCorpus() {
  class Plain {}
  class SubArray extends Array {}
  const throwingGetter = {};
  Object.defineProperty(throwingGetter, 'x', { get() { throw new Error('getter must not run'); }, enumerable: true });
  const tagged = { [Symbol.toStringTag]: 'Array' };
  const revoked = Proxy.revocable({}, {});
  revoked.revoke();
  const revokedArray = Proxy.revocable([], {});
  revokedArray.revoke();
  const trapping = new Proxy({}, new Proxy({}, { get() { throw new Error('trap must not run'); } }));
  const proto = Object.create(null);
  return [
    ['undefined', undefined], ['null', null], ['true', true], ['false', false], ['0', 0], ['-0', -0], ['NaN', NaN], ['1', 1],
    ["''", ''], ["'x'", 'x'], ['1n', 1n], ['symbol', Symbol('s')],
    ['function', () => 1], ['class', Plain], ['async function', async () => 1],
    ['{}', {}], ['{a:1}', { a: 1 }], ['{length:0}', { length: 0 }], ['{0:1,length:1}', { 0: 1, length: 1 }],
    ['Object.create(null)', Object.create(null)], ['Object.create({})', Object.create({})],
    ['Object.create(Array.prototype)', Object.create(Array.prototype)], ['Object.create(proto-null-object)', Object.create(proto)],
    ['[]', []], ['[1]', [1]], ['new Array(3)', new Array(3)], ['array with extra key', Object.assign([], { x: 1 })],
    ['Uint8Array', new Uint8Array(2)], ['SubArray', new SubArray()],
    ['new Number(1)', new Number(1)], ['new String(s)', new String('s')], ['new Boolean(false)', new Boolean(false)],
    ['Object(1n)', Object(1n)], ['Object(Symbol())', Object(Symbol('s'))],
    ['new Plain()', new Plain()], ['Date(0)', new Date(0)], ['Date(NaN)', new Date(NaN)], ['Map', new Map()], ['Set', new Set()],
    ['WeakMap', new WeakMap()], ['RegExp', /r/], ['Error', new Error('e')], ['Promise', Promise.resolve()],
    ['ArrayBuffer', new ArrayBuffer(2)], ['DataView', new DataView(new ArrayBuffer(2))],
    ['frozen {}', Object.freeze({})], ['sealed {a:1}', Object.seal({ a: 1 })], ['throwing getter', throwingGetter],
    ['toStringTag Array', tagged], ['{toJSON}', { toJSON: () => 1 }],
    ['Proxy({})', new Proxy({}, {})], ['Proxy([])', new Proxy([], {})], ['Proxy(function)', new Proxy(() => 1, {})],
    ['Proxy(null-proto)', new Proxy(Object.create(null), {})], ['revoked Proxy({})', revoked.proxy], ['revoked Proxy([])', revokedArray.proxy],
    ['trapping Proxy({})', trapping],
    ['other realm {}', runInNewContext('({})')], ['other realm []', runInNewContext('[]')],
    ['other realm Object.create(null)', runInNewContext('Object.create(null)')], ['other realm class instance', runInNewContext('new (class K {})()')],
    ['other realm Date', runInNewContext('new Date(0)')],
  ];
}

export function dateStringCorpus() {
  const s = [
    '2026-02-28', '2026-02-29', '2024-02-29', '2000-02-29', '1900-02-29', '2026-02-30', '2026-02-31', '2026-04-31', '2026-13-01', '2026-00-10',
    '2026-01-00', '2026-01-32', '0000-01-01', '0001-01-01', '9999-12-31', '10000-01-01', '+010000-01-01', '-000001-01-01', '+275760-09-13',
    '2026-1-1', '20260101', ' 2026-01-01', '2026-01-01 ', '2026-01-01\n', '', '2026-01-01T', 'x',
    '2026-01-01T00:00:00Z', '2026-01-01t00:00:00z', '2026-01-01T00:00:00z', '2026-01-01t00:00:00Z', '2026-01-01T00:00Z',
    '2026-01-01T24:00:00Z', '2026-01-01T24:00:01Z', '2026-01-01T23:59:60Z', '2026-01-01T23:59:59Z', '2026-01-01T00:00:00.5Z',
    '2026-01-01T00:00:00.123Z', '2026-01-01T00:00:00.1234567Z', '2026-01-01T00:00:00.Z', '2026-01-01T00:00:00+05:30', '2026-01-01T00:00:00+0530',
    '2026-01-01T00:00:00-00:00', '2026-01-01T00:00:00+24:00', '2026-01-01T00:00:00+23:59', '2026-01-01T00:00:00', '2026-01-01 00:00:00Z',
    '2026-02-30T00:00:00Z', '2026-02-29T00:00:00Z', '2024-02-29T12:00:00Z', '0000-01-01T00:00:00Z', '-000001-01-01T00:00:00Z',
    '+010000-01-01T00:00:00Z', '+275760-09-13T00:00:00.000Z', '+275760-09-13T00:00:00.001Z', '2026-01-01T00:00:00.000Z',
    '2026-01-01T00:00:00\n', '２０２６-01-01', '٢٠٢٦-01-01',
  ];
  return [...s.map((x) => [JSON.stringify(x), x]),
    ['20260101 (number)', 20260101], ['null', null], ['undefined', undefined], ['{}', {}], ['[]', []], ['Date(0)', new Date(0)], ['true', true],
    ['{toString}', { toString: () => '2026-01-01' }], ['symbol', Symbol('s')], ['[2026-01-01]', ['2026-01-01']]];
}

export function instantNumberCorpus() {
  return [0, 1, -1, 1.5, -0, 951782400000, 4102444800000, 253402300799999, 253402300800000, -62198755200000, -62167219200000, -62167219200001,
    8.64e15, -8.64e15, 8.64e15 + 1, -8.64e15 - 1, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER, 2 ** 53, 1e21]
    .map((n) => [String(Object.is(n, -0) ? '-0' : n), n])
    .concat([['null', null], ['undefined', undefined], ["'0'", '0'], ['{}', {}], ['Date(5)', new Date(5)], ['true', true], ['1n', 1n]]);
}

/** T, F, E:<name>, or V:<value>. */
export function outcome(fn, input) {
  try {
    const result = fn(input);
    if (result === true) return 'T';
    if (result === false) return 'F';
    return `V:${typeof result === 'bigint' ? `${result}n` : JSON.stringify(result) ?? String(result)}`;
  } catch (error) {
    return `E:${error?.constructor?.name ?? typeof error}`;
  }
}

/** Evaluate a function's exact source text alone; `context` supplies same-file constants it names (regex and string literals). */
export function evaluate(ts, name, text, context = {}) {
  const body = text.replace(/^\s*export\s+/, '');
  const named = name === '(anonymous)' ? `const __anon = ${body};` : body;
  const js = ts.transpileModule(named, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const entry = name === '(anonymous)' ? '__anon' : name;
  const names = Object.keys(context);
  return new Function(...names, `${js}\nreturn ${entry};`)(...names.map((n) => context[n]));
}

/** Top-level `const NAME = <regex or string literal>` of a source file, as live values: the constants a lone function may name. */
export function literalConstants(ts, file, text) {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const out = {};
  for (const statement of sf.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const d of statement.declarationList.declarations) {
      if (!ts.isIdentifier(d.name) || !d.initializer) continue;
      if (ts.isRegularExpressionLiteral(d.initializer)) {
        const m = /^\/(.*)\/([a-z]*)$/s.exec(d.initializer.getText(sf));
        out[d.name.text] = new RegExp(m[1], m[2]);
      } else if (ts.isStringLiteral(d.initializer) || ts.isNoSubstitutionTemplateLiteral(d.initializer)) {
        out[d.name.text] = d.initializer.text;
      }
    }
  }
  return out;
}

export function group(entries, corpus) {
  const bySignature = new Map();
  for (const entry of entries) {
    const signature = corpus.map(([, value]) => outcome(entry.fn, value)).join(' ');
    const key = sha(signature).slice(0, 12);
    if (!bySignature.has(key)) bySignature.set(key, { signatureSha256: key, outcomes: signature.split(' '), members: [] });
    bySignature.get(key).members.push(entry.id);
  }
  return [...bySignature.values()];
}

function selftest() {
  const ts = loadTs(process.cwd());
  const strict = evaluate(ts, 'p', 'const p = (v: unknown): boolean => v !== null && typeof v === "object" && !Array.isArray(v);');
  const loose = evaluate(ts, 'p', 'const p = (v: unknown): boolean => v !== null && typeof v === "object";');
  const corpus = objectCorpus();
  const groups = group([{ id: 'strict', fn: strict }, { id: 'loose', fn: loose }, { id: 'strict2', fn: strict }], corpus);
  // the corpus separates a predicate that admits arrays from one that refuses them, and groups identical ones
  assert(groups.length === 2, 'two groups expected');
  assert(groups.some((g) => g.members.join() === 'strict,strict2'), 'identical functions share a group');
  // outcome strings: boolean, throw, value
  assert(outcome(() => true, 0) === 'T' && outcome(() => false, 0) === 'F', 'booleans');
  assert(outcome(() => { throw new RangeError('x'); }, 0) === 'E:RangeError', 'throw');
  assert(outcome(() => [1], 0) === 'V:[1]' && outcome(() => 3n, 0) === 'V:3n' && outcome(() => undefined, 0) === 'V:undefined', 'values');
  // a revoked proxy of an array makes Array.isArray throw: the corpus carries it
  assert(objectCorpus().some(([l, v]) => l === 'revoked Proxy([])' && outcome(strict, v) === 'E:TypeError'), 'revoked proxy throws');
  // literal constants are read as live values
  const k = literalConstants(ts, 'x.ts', 'const A = /^\\d{4}$/; const B = "s"; const C = f(1);');
  assert(k.A.test('2026') && k.B === 's' && !('C' in k), 'constants');
  console.log('differential selftest ok');
}

function assert(condition, message) {
  if (!condition) throw new Error(`selftest: ${message}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  if (process.argv[2] === '--selftest') {
    selftest();
  } else {
    const [repo, commit, censusJson, out] = process.argv.slice(2);
    if (out === undefined) throw new Error('usage: differential.mjs <git repo> <commit> <census.json> <out.json>');
    const ts = loadTs(repo);
    const rows = JSON.parse(readFileSync(censusJson, 'utf8')).rows;
    const textOf = new Map();
    const constantsOf = (file) => {
      if (!textOf.has(file)) textOf.set(file, git(repo, 'show', `${commit}:${file}`).toString('utf8'));
      return literalConstants(ts, file, textOf.get(file));
    };

    // 1. object-shape predicates: every census row of kind `shape`
    const shapeEntries = rows.filter((r) => r.kinds.includes('shape')).map((r) => ({
      id: `${r.file}:${r.line} ${r.name}`, row: r, fn: evaluate(ts, r.name, r.exactText, constantsOf(r.file)),
    }));
    const objectCorp = objectCorpus();
    const objectGroups = group(shapeEntries, objectCorp).map((g) => ({
      ...g,
      booleanOnly: g.outcomes.every((o) => o === 'T' || o === 'F' || o.startsWith('E:')),
      declaredShapes: [...new Set(g.members.map((id) => {
        const r = shapeEntries.find((e) => e.id === id).row;
        return `${r.params.join(', ')} => ${r.returnType ?? '(none)'}`;
      }))],
    }));

    // 2. isoOf: the seven textually identical formatters on the instant corpus
    const isoRows = rows.filter((r) => r.name === 'isoOf');
    const isoEntries = isoRows.map((r) => ({ id: `${r.file}:${r.line}`, fn: evaluate(ts, 'isoOf', r.exactText) }));
    const isoGroups = group(isoEntries, instantNumberCorpus());

    // 3. the date validators that are lone one-parameter functions, on the date-string corpus
    const dateRows = rows.filter((r) => ['isIsoDate', 'isIsoInstant', 'recordedInstant'].includes(r.name));
    const dateEntries = dateRows.map((r) => ({ id: `${r.file}:${r.line} ${r.name}`, fn: evaluate(ts, r.name, r.exactText, constantsOf(r.file)) }));
    const dateCorp = dateStringCorpus();
    const dateGroups = group(dateEntries, dateCorp);

    const result = {
      commit: git(repo, 'rev-parse', commit).toString().trim(),
      census: { rows: rows.length },
      object: {
        corpusSize: objectCorp.length, corpusLabels: objectCorp.map(([l]) => l), functions: shapeEntries.length,
        groups: objectGroups,
      },
      isoOf: { corpusSize: instantNumberCorpus().length, corpusLabels: instantNumberCorpus().map(([l]) => l), functions: isoEntries.length, groups: isoGroups },
      dateValidators: { corpusSize: dateCorp.length, corpusLabels: dateCorp.map(([l]) => l), functions: dateEntries.map((e) => e.id), groups: dateGroups },
    };
    writeFileSync(out, `${JSON.stringify(result, null, 1)}\n`);
    for (const [name, part] of [['object', result.object], ['isoOf', result.isoOf], ['dateValidators', result.dateValidators]]) {
      console.log(`${name}: ${part.corpusSize} corpus entries, ${typeof part.functions === 'number' ? part.functions : part.functions.length} functions, ${part.groups.length} outcome groups`);
      for (const g of part.groups) console.log(`  ${g.signatureSha256} x${g.members.length}${g.booleanOnly === false ? ' (non-boolean)' : ''}: ${g.members.join(' | ')}`);
    }
  }
}
