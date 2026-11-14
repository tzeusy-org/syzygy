import { lstatSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { expect, it } from 'vitest';

// DC-3 regrowth, not semantic equivalence: declarations and function-valued variables named
// sha256*, deepFreeze*, decodeUtf8*, isRecord/isObj/isObject/isPlainObject; also the direct
// createHash('sha256').update(value[, 'utf8']).digest('hex') chain, whatever its wrapper's name.
// Comments, strings, imports and re-exports are not implementations. Inline TextDecoders,
// buffer digests, streaming/multiple updates, aliases of createHash and other rewrites are
// outside this bounded recognizer. support-purity.test.ts separately protects the leaf.
const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const ROOTS = ['packages', 'apps'] as const;
const EXTENSIONS = new Set(['.ts', '.mts', '.cts', '.tsx', '.js', '.mjs', '.cjs', '.jsx']);
const TEST_SUPPORT = /\.test\.|testkit|^packages\/test-kit\/|-fixture|\/fixtures?\/|\/test-support\//u;
type Mechanism = 'sha256' | 'deepFreeze' | 'decodeUtf8' | 'object-predicate' | 'direct-hex-hash';
interface Site { readonly path: string; readonly symbol: string; readonly mechanism: Mechanism; readonly line: number }
interface ExpectedSite { readonly path: string; readonly symbol: string; readonly mechanism: Mechanism; readonly reason: string }

// Literal path + symbol + mechanism, exactly once each. Never derive permissions from the
// current tree or allow a file/package prefix. Rationale: reconciliation-gen1.json R4a/G4,
// and the retained DC-3 record; these exceptions preserve distinct existing boundaries.
const REQUIRED: readonly ExpectedSite[] = [
  { path: 'packages/support/src/sha256.ts', symbol: 'sha256', mechanism: 'sha256', reason: 'canonical support definition' },
  { path: 'packages/support/src/deep-freeze.ts', symbol: 'deepFreeze', mechanism: 'deepFreeze', reason: 'canonical support definition' },
  { path: 'packages/support/src/decode-utf8.ts', symbol: 'decodeUtf8', mechanism: 'decodeUtf8', reason: 'canonical support definition' },
  { path: 'packages/support/src/is-record.ts', symbol: 'isRecord', mechanism: 'object-predicate', reason: 'canonical support definition' },
];
const EXCEPTIONS: readonly ExpectedSite[] = [
  { path: 'packages/cap1-core/src/snapshot.ts', symbol: 'sha256Digest', mechanism: 'sha256', reason: 'cap1 imports nothing shared' },
  { path: 'packages/cap1-daemon/src/source-snapshot.ts', symbol: 'deepFreeze', mechanism: 'deepFreeze', reason: 'cap1 imports nothing shared' },
  { path: 'packages/cap1-core/src/declaration.ts', symbol: 'isPlainObject', mechanism: 'object-predicate', reason: 'cap1 imports nothing shared' },
  { path: 'packages/cap1-daemon/src/consent-loading.ts', symbol: 'isPlainObject', mechanism: 'object-predicate', reason: 'cap1 imports nothing shared' },
  { path: 'packages/three-surface-poc-core/src/response-identity.ts', symbol: 'isObject', mechanism: 'object-predicate', reason: 'responseIdentity deletes keys from the narrowed value' },
  { path: 'packages/three-surface-poc-core/src/test-artifact-verification.ts', symbol: 'junitDigest', mechanism: 'direct-hex-hash', reason: 'recorded class-4 import-guard constraint (syzygy-bpyt.25 item 8)' },
  { path: 'packages/cap1-system/src/harness.ts', symbol: 'FIXTURE_OWNER_ACT', mechanism: 'direct-hex-hash', reason: 'independent cap1 oracle imports nothing shared' },
  { path: 'packages/cap1-system/src/harness.ts', symbol: 'snapshotTree', mechanism: 'direct-hex-hash', reason: 'independent cap1 oracle imports nothing shared' },
];
const identity = (site: Pick<Site, 'path' | 'symbol' | 'mechanism'>): string => `${site.path}#${site.symbol} (${site.mechanism})`;
const errorCode = (error: unknown): string => (error as NodeJS.ErrnoException).code ?? 'invalid input';
const extensionOf = (path: string): string => path.slice(path.lastIndexOf('.'));

/** Read-only, sorted filesystem census; no Git, process, network or runtime source imports.
 * Reject symbolic entries and non-directory roots without following targets. */
function discover(root: string, problems: string[]): string[] {
  const files: string[] = [];
  const entriesAt = (path: string) => {
    try {
      if (!lstatSync(join(root, path)).isDirectory()) {
        problems.push(`discovery ${path}: expected a regular directory`);
        return [];
      }
      return readdirSync(join(root, path), { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
    }
    catch (error) { problems.push(`discovery ${path}: ${errorCode(error)}`); return []; }
  };
  const walk = (directory: string): void => {
    for (const entry of entriesAt(directory)) {
      const path = `${directory}/${entry.name}`;
      if (TEST_SUPPORT.test(`${path}${entry.isDirectory() || entry.isSymbolicLink() ? '/' : ''}`)) continue;
      if (entry.isSymbolicLink()) problems.push(`discovery ${path}: symbolic source entry`);
      else if (entry.isDirectory()) walk(path);
      else if (EXTENSIONS.has(extensionOf(path))) {
        if (entry.isFile()) files.push(path);
        else problems.push(`discovery ${path}: expected a regular source file`);
      }
    }
  };
  for (const parent of ROOTS) {
    const workspaces = entriesAt(parent);
    if (!workspaces.some((entry) => entry.isDirectory())) problems.push(`discovery ${parent}: no workspace directories`);
    for (const workspace of workspaces) {
      const directory = `${parent}/${workspace.name}/src`;
      if (TEST_SUPPORT.test(`${directory}/`)) continue;
      if (workspace.isSymbolicLink()) problems.push(`discovery ${parent}/${workspace.name}: symbolic workspace entry`);
      else if (workspace.isDirectory()) walk(directory);
    }
  }
  if (files.length === 0) problems.push('discovery: no source modules');
  return files.sort();
}

function mechanismOf(name: string): Mechanism | undefined {
  if (/^sha256/u.test(name)) return 'sha256';
  if (/^deepFreeze/u.test(name)) return 'deepFreeze';
  if (/^decodeUtf8/u.test(name)) return 'decodeUtf8';
  if (/^(?:isRecord|isObj|isObject|isPlainObject)$/u.test(name)) return 'object-predicate';
  return undefined;
}

function unwrap(expression: ts.Expression): ts.Expression {
  while (ts.isParenthesizedExpression(expression) || ts.isAsExpression(expression) || ts.isTypeAssertionExpression(expression)
    || ts.isNonNullExpression(expression) || ts.isSatisfiesExpression(expression)) expression = expression.expression;
  return expression;
}
const literalIs = (expression: ts.Expression | undefined, text: string): boolean => expression !== undefined
  && ts.isStringLiteralLike(unwrap(expression)) && (unwrap(expression) as ts.StringLiteralLike).text === text;

/** Exactly one update, optionally explicit UTF-8, followed by a hex digest. */
function isDirectHexHash(node: ts.Node): node is ts.CallExpression {
  if (!ts.isCallExpression(node) || node.arguments.length !== 1 || !literalIs(node.arguments[0], 'hex')) return false;
  const digest = unwrap(node.expression);
  if (!ts.isPropertyAccessExpression(digest) || digest.name.text !== 'digest') return false;
  const updateCall = unwrap(digest.expression);
  if (!ts.isCallExpression(updateCall) || (updateCall.arguments.length !== 1
    && !(updateCall.arguments.length === 2 && literalIs(updateCall.arguments[1], 'utf8')))) return false;
  const update = unwrap(updateCall.expression);
  if (!ts.isPropertyAccessExpression(update) || update.name.text !== 'update') return false;
  const hash = unwrap(update.expression);
  return ts.isCallExpression(hash) && ts.isIdentifier(hash.expression) && hash.expression.text === 'createHash'
    && hash.arguments.length === 1 && literalIs(hash.arguments[0], 'sha256');
}

function functionNames(node: ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction): string[] {
  let container: ts.Node = node;
  while (ts.isParenthesizedExpression(container.parent) || ts.isAsExpression(container.parent)
    || ts.isTypeAssertionExpression(container.parent) || ts.isSatisfiesExpression(container.parent)
    || ts.isNonNullExpression(container.parent)) container = container.parent;
  const names = new Set<string>();
  if ('name' in node && node.name !== undefined) names.add(node.name.text);
  if (ts.isVariableDeclaration(container.parent) && ts.isIdentifier(container.parent.name)) names.add(container.parent.name.text);
  return [...names];
}

/** The outer declaration names a direct-hash site, including hashes inside nested callbacks. */
function enclosingSymbol(node: ts.Node): string {
  let symbol = '<module>';
  for (let parent = node.parent; parent !== undefined; parent = parent.parent) {
    if (ts.isFunctionDeclaration(parent) && parent.name !== undefined) symbol = parent.name.text;
    if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) symbol = parent.name.text;
  }
  return symbol;
}

function implementationsOf(path: string, source: ts.SourceFile): Site[] {
  const sites: Site[] = [];
  const named: { readonly node: ts.Node; readonly symbol: string; readonly mechanism: Mechanism }[] = [];
  const hashes: ts.CallExpression[] = [];
  const visit = (node: ts.Node): void => {
    if ((ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) && node.body !== undefined) {
      for (const symbol of functionNames(node)) {
        const mechanism = mechanismOf(symbol);
        if (mechanism !== undefined) named.push({ node, symbol, mechanism });
      }
    }
    if (isDirectHexHash(node)) hashes.push(node);
    ts.forEachChild(node, visit);
  };
  visit(source);
  const siteAt = (node: ts.Node, symbol: string, mechanism: Mechanism): Site => ({ path, symbol, mechanism,
    line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1 });
  for (const entry of named) sites.push(siteAt(entry.node, entry.symbol, entry.mechanism));
  for (const hash of hashes) {
    // A named helper and its enclosed direct expression are one implementation, not two.
    if (!named.some(({ node }) => hash.pos >= node.pos && hash.end <= node.end)) sites.push(siteAt(hash, enclosingSymbol(hash), 'direct-hex-hash'));
  }
  return sites;
}

// Exported only from this excluded test module so temporary corpus/mutation evidence can
// exercise the same discovery + parse + comparison seam without another maintained scanner.
export function scanWorkspace(root: string): { readonly files: readonly string[]; readonly sites: readonly Site[]; readonly problems: readonly string[] } {
  const problems: string[] = [];
  const files = discover(root, problems);
  const sites: Site[] = [];
  for (const path of files) {
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(readFileSync(join(root, path)));
      const kind = /\.tsx$/u.test(path) ? ts.ScriptKind.TSX : /\.jsx$/u.test(path) ? ts.ScriptKind.JSX
        : /\.[cm]?js$/u.test(path) ? ts.ScriptKind.JS : ts.ScriptKind.TS;
      const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, kind);
      const diagnostics = (source as ts.SourceFile & { readonly parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics;
      if (diagnostics.length > 0) {
        for (const diagnostic of diagnostics) problems.push(`parse ${path}: TS${diagnostic.code} ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`);
      } else for (const site of implementationsOf(path, source)) sites.push(site);
    } catch (error) { problems.push(`read/parse ${path}: ${errorCode(error)}`); }
  }
  const expected = [...REQUIRED, ...EXCEPTIONS];
  const seen = new Set<string>();
  for (const entry of expected) {
    const key = identity(entry);
    if (!/^(?:packages|apps)\/[\w-]+\/src\/[\w./-]+\.[cm]?[jt]sx?$/u.test(entry.path)
      || entry.path.split('/').some((part) => part === '.' || part === '..') || !/^[A-Za-z_$][\w$]*$/u.test(entry.symbol)
      || entry.reason.trim() === '') problems.push(`invalid expected site: ${key}`);
    if (seen.has(key)) problems.push(`duplicate expected site: ${key}`);
    seen.add(key);
    const count = sites.filter((site) => identity(site) === key).length;
    if (count !== 1) problems.push(`expected exactly one ${key}; found ${count}`);
  }
  for (const site of sites) if (!seen.has(identity(site))) problems.push(`unexpected implementation: ${identity(site)}:${site.line}`);
  sites.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : a.line - b.line || (a.symbol < b.symbol ? -1 : a.symbol > b.symbol ? 1 : 0));
  return { files, sites, problems: problems.sort() };
}

it('keeps shared helper implementations at the canonical sites and literal recorded exceptions', () => {
  const census = scanWorkspace(ROOT);
  expect(census.problems, `support regrowth census: ${census.files.length} non-test modules; ${census.sites.length} implementation sites`).toEqual([]);
});
