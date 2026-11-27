// Repository-reading tests can depend on a declared path family even when their imports and literals do not name its files.
import { posix } from 'node:path';
import ts from 'typescript';

export const DOSSIER_CORPUS_MANIFEST = 'docs/polaris-generation/dossier-corpus-v1.json';
const DOSSIER_CORPUS_READER = 'packages/polaris-dossier/src/corpus.test.ts';
const DOSSIER_CORPUS_MODULE = 'packages/polaris-dossier/src/corpus';
const DOSSIER_CORPUS_DIRECT_INPUTS = [DOSSIER_CORPUS_MANIFEST, 'docs/evidence/pursuit-2026-11-21b/measure-now.json'];
const MECHANISM_MEMBER = /^(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]*\*?[A-Za-z0-9._-]*$/u;

// The path interpretation below is valid only with these repository-relative reader adapters. An unfamiliar adapter
// selects full until its path semantics can be reviewed. Use TS printing so comments and layout are immaterial.
const readerAdapter = ts.createSourceFile('dossier-reader-adapter.ts', `
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { corpusRefusals, mechanismVersion, type MechanismTree } from './corpus.js';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
let corpus: Json;
const readJson = (file: string): Json => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8')) as Json;
const checkoutTree: MechanismTree = { list: (dir) => fs.readdirSync(path.join(ROOT, dir)), read: (file) => fs.readFileSync(path.join(ROOT, file)) };
`, ts.ScriptTarget.Latest);
const adapterPrinter = ts.createPrinter({ removeComments: true });
const adapterStatements = readerAdapter.statements.map((statement) =>
  adapterPrinter.printNode(ts.EmitHint.Unspecified, statement, readerAdapter));

function hasExpectedReaderAdapter(source: ts.SourceFile): boolean {
  const actual = new Set(source.statements
    .filter((statement) => ts.isImportDeclaration(statement) || ts.isVariableStatement(statement))
    .map((statement) => adapterPrinter.printNode(ts.EmitHint.Unspecified, statement, source)));
  return adapterStatements.every((statement) => actual.has(statement));
}

export type ReaderInventory =
  | { readonly reader: string; readonly matches: (path: string) => boolean }
  | { readonly issue: string }
  | undefined;

function importsCorpus(source: ts.SourceFile): boolean {
  return source.statements.some((statement) => {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) return false;
    const name = statement.moduleSpecifier.text;
    if (!name.startsWith('.') || posix.join(posix.dirname(source.fileName), name).replace(/\.[jt]s$/u, '') !== DOSSIER_CORPUS_MODULE) {
      return false;
    }
    const clause = statement.importClause;
    const bindings = clause?.namedBindings;
    if (!clause || clause.isTypeOnly || !bindings) return false;
    return ts.isNamespaceImport(bindings) || bindings.elements.some((binding) =>
      !binding.isTypeOnly && (binding.propertyName ?? binding.name).text === 'mechanismVersion');
  });
}

function isReviewedMechanismUse(tree: ts.Identifier, parent?: ts.Node): boolean {
  if (!parent || !ts.isCallExpression(parent) || parent.questionDotToken || parent.arguments.length !== 2 ||
      parent.arguments[1] !== tree || !ts.isIdentifier(parent.expression) || parent.expression.text !== 'mechanismVersion') {
    return false;
  }
  const definition = parent.arguments[0]!;
  return ts.isElementAccessExpression(definition) && ts.isIdentifier(definition.expression) &&
    definition.expression.text === 'corpus' && ts.isStringLiteralLike(definition.argumentExpression) &&
    definition.argumentExpression.text === 'mechanismVersion';
}

// This audits the corpus test's known JSON reader and its declared mechanism adapter use. Other reader families
// are still covered by the existing graph heuristics and the whole merge-group run.
function directReadInputs(source: ts.SourceFile): ReadonlySet<string> | undefined {
  const constants = new Map<string, string>();
  const topLevel = new Map<string, ts.Identifier>();
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    const isConst = (statement.declarationList.flags & ts.NodeFlags.Const) !== 0;
    for (const { name, initializer } of statement.declarationList.declarations) {
      if (!ts.isIdentifier(name)) continue;
      topLevel.set(name.text, name);
      if (isConst && initializer && ts.isStringLiteralLike(initializer)) constants.set(name.text, initializer.text);
    }
  }
  const readJsonBinding = topLevel.get('readJson');
  const checkoutTreeBinding = topLevel.get('checkoutTree');
  if (!readJsonBinding || !checkoutTreeBinding) return undefined;

  const inputs = new Set<string>();
  const referencedBindings = new Set(['readJson', 'checkoutTree', 'mechanismVersion', 'corpus']);
  const otherBindings = new Set<string>();
  let unresolved = false;
  let mechanismUses = 0;
  function recordBinding(name: ts.BindingName): void {
    if (ts.isIdentifier(name)) {
      if (topLevel.get(name.text) !== name) otherBindings.add(name.text);
    } else {
      for (const element of name.elements) if (ts.isBindingElement(element)) recordBinding(element.name);
    }
  }
  function visit(node: ts.Node, parent?: ts.Node): void {
    // Taking the function as a value can hide its subsequent arguments from this direct-call audit.
    if (ts.isIdentifier(node) && node.text === 'readJson' && node !== readJsonBinding &&
        !(parent && ts.isCallExpression(parent) && parent.expression === node && parent.questionDotToken === undefined)) {
      unresolved = true;
    }
    if (ts.isIdentifier(node) && node.text === 'checkoutTree' && node !== checkoutTreeBinding) {
      if (isReviewedMechanismUse(node, parent)) mechanismUses++;
      else unresolved = true;
    }
    if (ts.isVariableDeclaration(node) || ts.isParameter(node)) recordBinding(node.name);
    if ((ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isClassDeclaration(node) ||
        ts.isClassExpression(node) || ts.isEnumDeclaration(node)) && node.name) recordBinding(node.name);
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'readJson') {
      const first = node.arguments[0];
      let path: string | undefined;
      if (first && ts.isStringLiteralLike(first)) path = first.text;
      else if (first && ts.isIdentifier(first)) {
        referencedBindings.add(first.text);
        path = constants.get(first.text);
      }
      if (path === undefined) unresolved = true;
      else inputs.add(path);
    }
    ts.forEachChild(node, (child) => visit(child, node));
  }
  visit(source);
  // An accepted identifier must be unambiguous in this file. A shadowed binding exceeds the supported audit.
  if (unresolved || mechanismUses !== 1 || [...referencedBindings].some((name) => otherBindings.has(name))) return undefined;
  return inputs;
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function corpusPaths(value: unknown): ((path: string) => boolean) | undefined {
  const manifest = record(value);
  const mechanism = record(manifest?.['mechanismVersion']);
  const rows = mechanism?.['members'];
  const excluded = mechanism?.['excludeSuffixes'];
  if (manifest?.['format'] !== 'polaris-dossier-corpus/1' || mechanism?.['format'] !== 'polaris-dossier-mechanism/1' ||
      !Array.isArray(rows) || rows.length === 0 || !Array.isArray(excluded) ||
      !excluded.every((suffix): suffix is string => typeof suffix === 'string' && suffix.length > 0)) {
    return undefined;
  }

  const seen = new Set<string>();
  const members = new Set<string>();
  const wildcards: Array<{ directory: string; head: string; tail: string }> = [];
  for (const row of rows) {
    const member = record(row);
    const path = member?.['path'];
    const group = member?.['group'];
    if (typeof group !== 'string' || group.length === 0 || typeof path !== 'string' || seen.has(path) ||
        !MECHANISM_MEMBER.test(path) || path.split('/').some((part) => part === '' || part === '.' || part === '..')) {
      return undefined;
    }
    const name = posix.basename(path);
    const directory = posix.dirname(path);
    const parts = name.split('*');
    seen.add(path);
    if (parts.length === 2) wildcards.push({ directory, head: parts[0]!, tail: parts[1]! });
    else members.add(path);
  }
  return (path) => {
    if (members.has(path) || DOSSIER_CORPUS_DIRECT_INPUTS.includes(path)) return true;
    const name = posix.basename(path);
    if (excluded.some((suffix) => name.endsWith(suffix))) return false;
    const directory = posix.dirname(path);
    return wildcards.some(({ directory: parent, head, tail }) =>
      directory === parent && name.length >= head.length + tail.length && name.startsWith(head) && name.endsWith(tail));
  };
}

/** Derive paths for the tracked dossier mechanism reader and refuse drift in the supported reader family. */
export function dossierCorpusReaders(modules: ReadonlyMap<string, string>, manifest: unknown): ReaderInventory {
  const readers = [];
  for (const [name, contents] of modules) {
    if (!name.endsWith('.test.ts')) continue;
    const source = ts.createSourceFile(name, contents, ts.ScriptTarget.Latest);
    if (importsCorpus(source)) readers.push(source);
  }
  if (readers.length === 0 && manifest === undefined) return undefined;
  const undeclared = readers.find(({ fileName }) => fileName !== DOSSIER_CORPUS_READER);
  if (undeclared) return { issue: `Unregistered dossier corpus test reader: ${undeclared.fileName}` };
  const reader = readers[0];
  const inputs = reader && hasExpectedReaderAdapter(reader) && directReadInputs(reader);
  if (!inputs || inputs.size !== DOSSIER_CORPUS_DIRECT_INPUTS.length ||
      !DOSSIER_CORPUS_DIRECT_INPUTS.every((path) => inputs.has(path))) {
    return { issue: `Tracked dossier corpus test reader inputs drifted: ${DOSSIER_CORPUS_READER}` };
  }
  const matches = corpusPaths(manifest);
  if (!matches) return { issue: 'Tracked dossier corpus reader manifest could not be read exactly' };
  return { reader: DOSSIER_CORPUS_READER, matches };
}
