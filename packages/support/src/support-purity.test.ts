import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { FORBIDDEN, identifiersOf, specifiersOf } from './purity.testkit.js';

// The package is a leaf that every importer inherits (the owner-act drafter's own purity test
// stops at `@syzygy/support`), so what it may import and name is pinned here, not left to the closure guard,
// which admits `node:fs` (syzygy-bpyt.6.3, review R-GP-IMPL-SUPPORT-LEAF-1 N3). Every source module under `src` is
// read, at any depth and with any JavaScript or TypeScript extension; the test files and the one testkit are test
// support (syzygy-bpyt.6.14, the PR 530 round-2 review's N9).
const SRC = new URL('./', import.meta.url);
/** Every source module under `dir`, at any depth and with any JavaScript or TypeScript extension, but the tests and the testkit. */
const sourcesUnder = (dir: URL): string[] => readdirSync(dir, { recursive: true, encoding: 'utf8' })
  .filter((name) => /\.[cm]?[jt]sx?$/u.test(name) && !name.endsWith('.test.ts') && name !== 'purity.testkit.ts').sort();
const SOURCES = sourcesUnder(SRC);
const read = (name: string): string => readFileSync(new URL(name, SRC), 'utf8');

const ALLOWED_SPECIFIER = /^(?:node:crypto|\.\/[a-z0-9-]+\.js)$/u;
// Every name the package's code may use: its own declarations and parameters, the hash's `createHash().update().digest()`,
// `Object`'s freeze walk, the object predicate's `Array.isArray` and `Readonly<Record<string, unknown>>` type, and the strict
// decoder's `new TextDecoder('utf-8', { fatal: true }).decode()`, which reads only the bytes it is given. Any other global
// (`globalThis`, `process`, `console`, `fetch`, `WebSocket`, `performance`), another export of `node:crypto` (`randomBytes`) or
// a loader (`require`, `eval`, `Function`) is a name not on it.
const ALLOWED_IDENTIFIERS = new Set([
  'Array', 'Object', 'Readonly', 'Record', 'STRICT_UTF8', 'T', 'TextDecoder', 'Uint8Array', 'bytes', 'createHash', 'decode', 'decodeUtf8',
  'deepFreeze', 'digest', 'fatal', 'freeze', 'isArray', 'isFrozen', 'isRecord', 'member', 'sha256', 'undefined', 'update', 'value', 'values',
]);

/** Every import and re-export declaration of a module, `import x = require('m')` included, by its specifier and as written. */
function moduleDeclarationsOf(name: string, source: string): { specifier: string; text: string }[] {
  const file = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, false);
  return file.statements.flatMap((statement) => {
    const specifier = ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement) ? statement.moduleSpecifier
      : ts.isImportEqualsDeclaration(statement) && ts.isExternalModuleReference(statement.moduleReference) ? statement.moduleReference.expression
      : undefined;
    return specifier !== undefined && ts.isStringLiteral(specifier) ? [{ specifier: specifier.text, text: statement.getText(file) }] : [];
  });
}

/** Every write to a property, as written: an assignment by `=` or any compound operator whose target, or a target its
 * destructuring pattern names, is a property or element access. */
function propertyWritesOf(name: string, source: string): string[] {
  const file = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, false);
  const writes: string[] = [];
  const targets = (node: ts.Expression): ts.Expression[] =>
    ts.isArrayLiteralExpression(node) ? node.elements.flatMap((element) => targets(ts.isSpreadElement(element) ? element.expression : element))
      : ts.isObjectLiteralExpression(node) ? node.properties.flatMap((property) =>
        ts.isPropertyAssignment(property) ? targets(property.initializer) : ts.isSpreadAssignment(property) ? targets(property.expression) : [])
      : ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken ? targets(node.left)
      : ts.isParenthesizedExpression(node) ? targets(node.expression)
      : [node];
  const visit = (node: ts.Node): void => {
    if (ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment
      && targets(node.left).some((target) => ts.isPropertyAccessExpression(target) || ts.isElementAccessExpression(target))) writes.push(node.getText(file));
    ts.forEachChild(node, visit);
  };
  visit(file);
  return writes;
}

/** Every `import()` call of a module, as written, however it is spaced or commented and whatever its argument. */
function importCallsOf(name: string, source: string): string[] {
  const file = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, false);
  const calls: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) calls.push(node.getText(file));
    ts.forEachChild(node, visit);
  };
  visit(file);
  return calls;
}

describe('@syzygy/support stays a pure leaf', () => {
  it('scans every source module under src, at any depth, not an empty list', () => {
    expect(SOURCES).toEqual(expect.arrayContaining(['decode-utf8.ts', 'deep-freeze.ts', 'index.ts', 'sha256.ts']));
  });

  it('lists a module at any depth and with any extension, and skips only the tests and the testkit', () => {
    const dir = mkdtempSync(join(tmpdir(), 'support-sources-'));
    try {
      for (const file of ['a.ts', 'io/b.ts', 'c.mts', 'd.cjs', 'e.test.ts', 'purity.testkit.ts', 'f.json', 'g.tsx', 'h.jsx', 'latest.ts', 'io/purity.testkit.ts']) {
        mkdirSync(dirname(join(dir, file)), { recursive: true });
        writeFileSync(join(dir, file), '');
      }
      expect(sourcesUnder(pathToFileURL(`${dir}/`))).toEqual(['a.ts', 'c.mts', 'd.cjs', 'g.tsx', 'h.jsx', 'io/b.ts', 'io/purity.testkit.ts', 'latest.ts']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('names no module but node:crypto and a module beside it in any literal specifier of any source', () => {
    const imports = SOURCES.flatMap((file) => specifiersOf(read(file)).map((specifier) => ({ file, specifier })));
    expect(imports.filter(({ specifier }) => !ALLOWED_SPECIFIER.test(specifier))).toEqual([]);
    // The one external module is the hash.
    expect([...new Set(imports.map(({ specifier }) => specifier).filter((specifier) => !specifier.startsWith('./')))]).toEqual(['node:crypto']);
  });

  it('names no identifier outside its literal list in any source', () => {
    expect(SOURCES.flatMap((file) => identifiersOf(file, read(file)).filter((name) => !ALLOWED_IDENTIFIERS.has(name)).map((name) => `${file}: ${name}`))).toEqual([]);
  });

  it('takes only createHash from node:crypto, by its own name, and re-exports nothing from it', () => {
    // An `export *`, a namespace binding or a string-named specifier names no identifier, so the allowlist cannot see it.
    const external = SOURCES.flatMap((file) => moduleDeclarationsOf(file, read(file))
      .filter(({ specifier }) => !specifier.startsWith('./')).map(({ text }) => `${file}: ${text}`));
    expect(external).toEqual(["sha256.ts: import { createHash } from 'node:crypto';"]);
  });

  it('assigns to no property in any source, so no allowed global is rewritten', () => {
    expect(SOURCES.flatMap((file) => propertyWritesOf(file, read(file)).map((write) => `${file}: ${write}`))).toEqual([]);
  });

  it('calls no import() in any source, however it is spaced or commented', () => {
    expect(SOURCES.flatMap((file) => importCallsOf(file, read(file)).map((call) => `${file}: ${call}`))).toEqual([]);
  });

  it('names none of the forbidden tokens it shares with the owner-act drafter in any source', () => {
    for (const name of SOURCES) {
      const source = read(name);
      for (const forbidden of FORBIDDEN) expect(source, `${name} ${String(forbidden)}`).not.toMatch(forbidden);
    }
  });

  it('declares no dependency and references no project in its manifests', () => {
    const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as Record<string, unknown>;
    for (const key of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) expect(manifest[key] ?? {}, key).toEqual({});
    const tsconfig = JSON.parse(readFileSync(new URL('../tsconfig.json', import.meta.url), 'utf8')) as Record<string, unknown>;
    expect(tsconfig['references'] ?? []).toEqual([]);
  });

  it('exports exactly the "." entry, index.js, so no other module is an entry', () => {
    const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as Record<string, unknown>;
    expect(manifest['exports']).toEqual({ '.': { source: './src/index.ts', types: './dist/index.d.ts', import: './dist/index.js', default: './dist/index.js' } });
  });
});

describe('the specifier reader this guard stands on', () => {
  // A guard whose reader misses a form passes over the form it was written for.
  const CASES: readonly (readonly [string, readonly string[]])[] = [
    ["import { createHash } from 'node:crypto';", ['node:crypto']],
    ['import { readFileSync } from "node:fs";', ['node:fs']],
    ["export { sha256 } from './sha256.js';", ['./sha256.js']],
    ["import 'node:http';", ['node:http']],
    ["const fs = await import('node:fs');", ['node:fs']],
    ["const fs = require('node:fs');", ['node:fs']],
    ["import type { X } from '@syzygy/cap1-core';", ['@syzygy/cap1-core']],
    ["// import { readFileSync } from 'node:fs';\nexport const a = 1;", []],
    ['export const a = 1;', []],
  ];
  it.each(CASES)('reads %j', (source, expected) => {
    expect(specifiersOf(source)).toEqual(expected);
  });
});

describe('the forbidden-token list both guards stand on', () => {
  it('is the literal list, so a narrowed token fails here', () => {
    expect(FORBIDDEN.map(String)).toEqual([
      '/\\brequire\\(/', '/\\bimport\\(/', '/\\bfetch\\(/', '/\\bwriteFile/', '/\\bappendFile/', '/\\bmkdir/', '/\\bprocess\\./', '/\\bDate\\b/',
      "/\\b(?:node:)?(?:fs|net|http|https|child_process|os)['\"`]/",
    ]);
  });

  // One form per token, each matched by that token alone, so a token dropped from the shared list fails its row.
  const CASES: readonly string[] = [
    'const m = require(name);', 'const m = await import(name);', 'await fetch(url);', 'writeFileSync(p, d);', 'appendFileSync(p, d);',
    'mkdirSync(p);', 'const h = process.env.HOME;', 'const t = new Date();', "import { readFileSync } from 'node:fs';",
  ];
  it.each(CASES)('refuses %j', (source) => {
    expect(FORBIDDEN.filter((forbidden) => forbidden.test(source))).toHaveLength(1);
  });
});

describe('the module-declaration reader the createHash row stands on', () => {
  // A reader that misses a declaration form passes over the module binding it was written for.
  const CASES: readonly (readonly [string, readonly string[]])[] = [
    ["import { createHash } from 'node:crypto';", ["import { createHash } from 'node:crypto';"]],
    ["export * from 'node:crypto';", ["export * from 'node:crypto';"]],
    ["import 'node:crypto';", ["import 'node:crypto';"]],
    ["import value = require ('node:crypto');", ["import value = require ('node:crypto');"]],
    ["export { sha256 } from './sha256.js';\nexport { value };", ["export { sha256 } from './sha256.js';"]],
  ];
  it.each(CASES)('reads %j', (source, expected) => {
    expect(moduleDeclarationsOf('case.ts', source).map(({ text }) => text)).toEqual(expected);
  });
});

describe('the property-write reader the no-write row stands on', () => {
  const CASES: readonly (readonly [string, readonly string[]])[] = [
    ['Object.freeze = (value) => value;', ['Object.freeze = (value) => value']],
    ["Object['freeze'] ??= (value) => value;", ["Object['freeze'] ??= (value) => value"]],
    ['[Object.freeze] = [(value) => value];', ['[Object.freeze] = [(value) => value]']],
    ['({ value: Object.freeze } = { value: (bytes) => bytes });', ['{ value: Object.freeze } = { value: (bytes) => bytes }']],
    ['(Object.freeze) = (value) => value;', ['(Object.freeze) = (value) => value']],
    ['[...Object.freeze] = [];', ['[...Object.freeze] = []']],
    ['({ ...Object.freeze } = {});', ['{ ...Object.freeze } = {}']],
    ['let a = 1; a += 1; [a] = [2];', []],
  ];
  it.each(CASES)('reads %j', (source, expected) => {
    expect(propertyWritesOf('case.ts', source)).toEqual(expected);
  });
});

describe('the import() reader the import() row stands on', () => {
  const CASES: readonly (readonly [string, readonly string[]])[] = [
    ["export const value = () => import ('node:crypto');", ["import ('node:crypto')"]],
    ["const value = 'node:f' + 's';\nvoid import (value);", ['import (value)']],
    ["void import/**/('node:fs');", ["import/**/('node:fs')"]],
    ['const meta = import.meta.url;', []],
  ];
  it.each(CASES)('reads %j', (source, expected) => {
    expect(importCallsOf('case.ts', source)).toEqual(expected);
  });
});

describe('the identifier reader the allowlist stands on', () => {
  const CASES: readonly (readonly [string, readonly string[]])[] = [
    ["const h = globalThis['process']; // console.log(h)", ['globalThis', 'h']],
    ['/** fetch(url) */\nexport const a = b.c?.(`${d}e`);', ['a', 'b', 'c', 'd']],
    ['class K { #p = 1; m<T>(v: T): T { return v; } }', ['#p', 'K', 'T', 'm', 'v']],
    ['import { randomBytes as r } from "node:crypto";', ['r', 'randomBytes']],
    ['const \\u0070rocess = 1;', ['process']],
  ];
  it.each(CASES)('reads %j', (source, expected) => {
    expect(identifiersOf('case.ts', source)).toEqual(expected);
  });
});
