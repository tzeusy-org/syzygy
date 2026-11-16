#!/usr/bin/env node
// syzygy-bpyt.4.2: what running the workspace from source under Node type stripping would have rewritten. Node loads a relative
// specifier as written, so each relative `.js` specifier in workspace TypeScript would have to name its `.ts` file. Run from the
// repository root: `node <this file>`. It writes nothing and prints one JSON record.
//
// A specifier is the literal of an import or export declaration, of `import('…')`, of an `import('…')` type, or the first
// argument of `vi.mock`, `vi.doMock`, `vi.unmock`, `vi.doUnmock`, `vi.importActual` or `vi.importMock`. It is counted when it
// starts with `./` or `../`, ends with `.js`, and the `.ts` file it then names is tracked; one whose `.ts` file is not tracked is
// listed. The files are every tracked `.ts` file under `apps/*/src`, `packages/*/src` and `packages/*/test-support`. The record
// also counts constructor parameter properties, which type stripping refuses (erasableSyntaxOnly).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { posix } from 'node:path';

const ts = createRequire(`${process.cwd()}/package.json`)('typescript');
const tracked = new Set(execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean));
const files = [...tracked].filter((file) => /^(?:apps\/[^/]+\/src|packages\/[^/]+\/(?:src|test-support))\/.+\.ts$/u.test(file)).sort();
const VI_CALLS = new Set(['mock', 'doMock', 'unmock', 'doUnmock', 'importActual', 'importMock']);

function specifierLiterals(source) {
  const literals = [];
  const visit = (node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier !== undefined && ts.isStringLiteral(node.moduleSpecifier)) {
      literals.push(node.moduleSpecifier);
    } else if (ts.isCallExpression(node) && node.arguments.length > 0 && ts.isStringLiteralLike(node.arguments[0])) {
      const callee = node.expression;
      if (callee.kind === ts.SyntaxKind.ImportKeyword) literals.push(node.arguments[0]);
      else if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression) && callee.expression.text === 'vi' && VI_CALLS.has(callee.name.text)) literals.push(node.arguments[0]);
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) {
      literals.push(node.argument.literal);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return literals;
}

let filesWithSpecifiers = 0;
let specifiers = 0;
const leftAlone = [];
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const positions = [];
  for (const literal of specifierLiterals(source)) {
    const specifier = literal.text;
    if (!/^\.\.?\//u.test(specifier) || !specifier.endsWith('.js')) continue;
    const target = posix.normalize(posix.join(posix.dirname(file), `${specifier.slice(0, -3)}.ts`));
    if (!tracked.has(target)) { leftAlone.push(`${file}: ${specifier}`); continue; }
    // The literal's text ends in `.js` followed by its closing quote; the extension's three letters end one before it.
    const end = literal.getEnd() - 1;
    if (text.slice(end - 3, end) !== '.js') throw new Error(`${file}: ${specifier} is not spelled as written`);
    positions.push(end - 2);
  }
  if (positions.length === 0) continue;
  filesWithSpecifiers += 1;
  specifiers += positions.length;
}
let parameterProperties = 0;
const withParameterProperties = new Set();
const PROPERTY_MODIFIERS = [ts.SyntaxKind.PublicKeyword, ts.SyntaxKind.PrivateKeyword, ts.SyntaxKind.ProtectedKeyword, ts.SyntaxKind.ReadonlyKeyword];
for (const file of files) {
  const visit = (node) => {
    if (ts.isParameter(node) && ts.isConstructorDeclaration(node.parent) && (ts.getModifiers(node) ?? []).some((m) => PROPERTY_MODIFIERS.includes(m.kind))) {
      parameterProperties += 1;
      withParameterProperties.add(file);
    }
    ts.forEachChild(node, visit);
  };
  visit(ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true));
}
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
process.stdout.write(`${JSON.stringify({ commit, files: files.length, filesWithRelativeJsSpecifiers: filesWithSpecifiers, relativeJsSpecifiers: specifiers, leftAlone, parameterProperties, filesWithParameterProperties: withParameterProperties.size }, null, 1)}\n`);
