// What the PR 545 identifier walk sees, form by form (R-GP-IMPL-SUPPORT-LEAF-GUARDS-1).
// Usage: node ast_probe.mjs <clone>
// `identifiersOf` is copied verbatim from packages/support/src/support-purity.test.ts at 3b04b1cd (types erased); the
// allowlist is the 20-name literal there. Each case prints the identifiers the walk reports and those outside the list.
import { createRequire } from 'node:module';
import { join } from 'node:path';

const clone = process.argv[2];
const ts = createRequire(join(clone, 'package.json'))('typescript');

function identifiersOf(name, source) {
  const names = new Set();
  const visit = (node) => {
    if (ts.isIdentifier(node) || ts.isPrivateIdentifier(node)) names.add(node.text);
    ts.forEachChild(node, visit);
  };
  visit(ts.createSourceFile(name, source, ts.ScriptTarget.Latest, false));
  return [...names].sort();
}

const ALLOWED = new Set([
  'Object', 'STRICT_UTF8', 'T', 'TextDecoder', 'Uint8Array', 'bytes', 'createHash', 'decode', 'decodeUtf8', 'deepFreeze', 'digest', 'fatal',
  'freeze', 'isFrozen', 'member', 'sha256', 'undefined', 'update', 'value', 'values',
]);

const CASES = [
  ['type position', 'case.ts', 'let a: Map<string, process.Env> = b;'],
  ['decorator', 'case.ts', '@dec class K { @prop m() {} }'],
  ['JSX in .tsx', 'case.tsx', 'const a = <div onClick={b} />;'],
  ['import.meta', 'case.ts', 'const a = import.meta.url;'],
  ['label', 'case.ts', 'outer: for (;;) { break outer; }'],
  ['shorthand property', 'case.ts', 'const a = { b };'],
  ['destructuring default', 'case.ts', 'const { a = b } = c;'],
  ['computed key', 'case.ts', 'const a = { [b]: 1 };'],
  ['export * from', 'case.ts', "export * from 'node:crypto';"],
  ['export * as value from', 'case.ts', "export * as value from 'node:crypto';"],
  ["export * as 'string' from", 'case.ts', "export * as 'randomBytes' from 'node:crypto';"],
  ['string-named import', 'case.ts', "import { 'randomBytes' as value } from 'node:crypto';"],
  ['string-named re-export', 'case.ts', "export { 'randomBytes' as 'value' } from 'node:crypto';"],
  ['namespace import', 'case.ts', "import * as value from 'node:crypto';\nexport { value };"],
  ['element access by string', 'case.ts', "Object['constructor']['constructor']('return 1')();"],
  ['element access by template', 'case.ts', 'Object[`constructor`];'],
  ['this keyword', 'case.ts', 'function value() { return this; }'],
  ['new.target', 'case.ts', 'function value() { return new.target; }'],
  ['import call, newline', 'case.ts', 'import\n(value);'],
  ['import call, comment', 'case.ts', 'import/**/(value);'],
  ['type-only import type', 'case.ts', "type value = typeof import('node:fs');"],
  ['JSDoc in .js', 'case.js', "/** @type {import('node:fs')} */\nconst value = 1;"],
  ['escaped identifier', 'case.ts', 'const \\u{70}rocess = 1;'],
  ['private name', 'case.ts', 'class K { #x = 1; }'],
  ['arguments', 'case.ts', 'function value() { return arguments; }'],
  ['global mutation', 'case.ts', 'Object.freeze = (value) => value;'],
  ['using declaration', 'case.ts', 'using value = bytes;'],
  ['import attributes', 'case.ts', "import value from './x.js' with { type: 'json' };"],
];

for (const [label, file, source] of CASES) {
  const ids = identifiersOf(file, source);
  console.log(JSON.stringify({ label, file, source, ids, outside: ids.filter((n) => !ALLOWED.has(n)) }));
}
