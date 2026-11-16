import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { reach, readModule } from '../../polaris-generation-core/src/workspace-reach.testkit.js';

// syzygy-bpyt.8.2: the daemon entry statically imports two of this package's modules by subpath, `/argv` and `/state-directory`,
// and the barrel only inside its `dossier` and `polaris` branches. Each subpath module imports exactly the node: built-ins listed
// below, so the daemon path can reach neither this package's barrel, another @syzygy package nor a third-party module through them,
// and no built-in that loads code (node:module) slips in. Every import edge counts, wherever it stands: static, type-only, re-export,
// `import =`, `require`, a type-position `import()` and dynamic with a literal specifier (syzygy-bpyt.8.32, the review of 8.2, N2).
// Neither method sees what a computed specifier names, a `require` under another name, or an edge one module further on, so the
// daemon path is also walked from the entry, edge by edge (syzygy-bpyt.8.34, the review of 8.32, N4): it reaches this package through
// the two subpath modules alone, and no module on it loads code by `node:module` or by an `import()` or `require` of a computed name.
// syzygy-bpyt.8.5 (one leaf util) may move both modules; this guard moves with them.

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const PACKAGE = 'packages/polaris-dossier';
const ENTRY = 'apps/syzygy/src/main.ts';

interface Edge {
  /** The literal specifier, or null for an `import()` or `require` whose argument is not a string literal. */
  readonly specifier: string | null;
  readonly form: string;
  /** The nearest enclosing `if` branch, or outside any if. */
  readonly where: string;
  /** `<form> '<specifier>' <where>`, or `<form> of <argument> <where>` for a computed one. */
  readonly edge: string;
}

/** Every import edge of `text`, found twice: by TypeScript's preprocessor and by a walk of the syntax tree. It throws unless the two
 * agree on the literal specifiers, so a form one of them misses (the preprocessor misses `export * as ns from`) fails the check instead
 * of passing unseen. The walk also returns each computed one, which the preprocessor cannot name. */
function edgesOf(text: string): Edge[] {
  const source = ts.createSourceFile('module.ts', text, ts.ScriptTarget.Latest, true);
  const edges: Edge[] = [];
  const where = (node: ts.Node): string => {
    for (let child = node, parent = node.parent; parent !== undefined; child = parent, parent = parent.parent) {
      if (ts.isIfStatement(parent) && child === parent.thenStatement) return `inside if (${parent.expression.getText(source)})`;
      if (ts.isIfStatement(parent) && child === parent.elseStatement) return `inside the else of if (${parent.expression.getText(source)})`;
    }
    return 'outside any if';
  };
  const add = (form: string, literal: ts.Node): void => {
    if (ts.isStringLiteralLike(literal)) edges.push({ specifier: literal.text, form, where: where(literal), edge: `${form} '${literal.text}' ${where(literal)}` });
    else edges.push({ specifier: null, form, where: where(literal), edge: `${form} of ${literal.getText(source)} ${where(literal)}` });
  };
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) add(node.importClause?.isTypeOnly ? 'import type' : 'import', node.moduleSpecifier);
    else if (ts.isExportDeclaration(node) && node.moduleSpecifier !== undefined) add('export from', node.moduleSpecifier);
    else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) add('import =', node.moduleReference.expression);
    else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0]) add('dynamic import', node.arguments[0]);
    else if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'require' && node.arguments[0]) add('require', node.arguments[0]);
    else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) add('type-position import', node.argument.literal);
    ts.forEachChild(node, visit);
  };
  visit(source);
  const walked = edges.flatMap((edge) => (edge.specifier === null ? [] : [edge.specifier])).sort();
  const reported = ts.preProcessFile(text, true, true).importedFiles.map((file) => file.fileName).sort();
  if (JSON.stringify(walked) !== JSON.stringify(reported)) throw new Error(`the preprocessor and the syntax walk disagree: ${JSON.stringify({ walked, reported })}`);
  return edges;
}
const importsOf = (text: string): (string | null)[] => edgesOf(text).map((edge) => edge.specifier);
/** The edges of `text` into this package, by its name or by a relative path. */
const entryEdgesOf = (text: string): string[] => edgesOf(text).filter((edge) => edge.specifier?.includes('polaris-dossier')).map((edge) => edge.edge);

/** The source module a subpath export names: `./dist/X.js` is `src/X.ts`. */
function moduleOf(subpath: string): string {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, PACKAGE, 'package.json'), 'utf8')) as { exports: Record<string, { import: string }> };
  const target = manifest.exports[subpath]?.import ?? '';
  return path.posix.join(PACKAGE, target.replace(/^\.\/dist\//u, 'src/').replace(/\.js$/u, '.ts'));
}

describe('the subpaths the daemon entry imports', () => {
  it('are /argv and /state-directory, imported statically, and the barrel only dynamically inside the dossier and polaris branches', () => {
    expect(entryEdgesOf(fs.readFileSync(path.join(ROOT, ENTRY), 'utf8'))).toEqual([
      "import '@syzygy/polaris-dossier/argv' outside any if",
      "import '@syzygy/polaris-dossier/state-directory' outside any if",
      "dynamic import '@syzygy/polaris-dossier' inside if (argv[0] === 'dossier')",
      "dynamic import '@syzygy/polaris-dossier' inside if (argv[0] === 'polaris')",
    ]);
  });

  it.each([
    ['./argv', 'packages/polaris-dossier/src/argv.ts', ['node:util']],
    ['./state-directory', 'packages/polaris-dossier/src/state-directory.ts', ['node:crypto', 'node:fs', 'node:path']],
  ])('%s is %s, which imports exactly %j', (subpath, module, imports) => {
    expect(moduleOf(subpath)).toBe(module);
    expect(importsOf(fs.readFileSync(path.join(ROOT, module), 'utf8'))).toEqual(imports);
  });

  it.each([
    ["import { DOSSIER_USAGE } from './cli.js';", './cli.js'],
    ["import type { CliPorts } from './index.js';", './index.js'],
    ["export * from '@syzygy/cap1-core';", '@syzygy/cap1-core'],
    ["const lazy = await import('typescript');", 'typescript'],
    ["const fs = require('fs');", 'fs'],
    ["import { createRequire } from 'node:module';", 'node:module'],
  ])('the check sees a forbidden import in %s (its own mutant)', (line, specifier) => {
    expect(importsOf(`import * as path from 'node:path';\n${line}\n`)).toEqual(['node:path', specifier]);
  });

  it.each([
    ["export { runDossierCli } from '@syzygy/polaris-dossier';", "export from '@syzygy/polaris-dossier' outside any if"],
    ["import type { CliPorts } from '@syzygy/polaris-dossier';", "import type '@syzygy/polaris-dossier' outside any if"],
    ["const lazy = await import('@syzygy/polaris-dossier');", "dynamic import '@syzygy/polaris-dossier' outside any if"],
    ["type Barrel = typeof import('@syzygy/polaris-dossier');", "type-position import '@syzygy/polaris-dossier' outside any if"],
    ["if (argv[0] !== 'dossier') require('@syzygy/polaris-dossier');", "require '@syzygy/polaris-dossier' inside if (argv[0] !== 'dossier')"],
    ["if (argv[0] === 'dossier') {} else await import('@syzygy/polaris-dossier');", "dynamic import '@syzygy/polaris-dossier' inside the else of if (argv[0] === 'dossier')"],
    ["import cli = require('../../../packages/polaris-dossier/src/cli.js');", "import = '../../../packages/polaris-dossier/src/cli.js' outside any if"],
    ["if (a) {} else if (argv[0] === 'dossier') { await import('@syzygy/polaris-dossier'); }", "dynamic import '@syzygy/polaris-dossier' inside if (argv[0] === 'dossier')"],
    ["switch (argv[0]) { case 'dossier': await import('@syzygy/polaris-dossier'); }", "dynamic import '@syzygy/polaris-dossier' outside any if"],
    ["if (await import('@syzygy/polaris-dossier')) {}", "dynamic import '@syzygy/polaris-dossier' outside any if"],
  ])('the entry check sees %s (its own mutant)', (line, edge) => {
    expect(entryEdgesOf(`import * as path from 'node:path';\n${line}\n`)).toEqual([edge]);
  });

  it('fails on a form the preprocessor misses rather than passing it unseen', () => {
    expect(() => edgesOf("export * as dossier from '@syzygy/polaris-dossier';\n")).toThrow(
      'the preprocessor and the syntax walk disagree: {"walked":["@syzygy/polaris-dossier"],"reported":[]}',
    );
  });

  it('fails on a form only the preprocessor reports rather than passing it unseen', () => {
    expect(() => edgesOf("await import('@syzygy/' + 'polaris-dossier');\n")).toThrow(
      'the preprocessor and the syntax walk disagree: {"walked":[],"reported":["@syzygy/"]}',
    );
  });

  it.each([
    ["const barrel = '@syzygy/polaris-dossier';\nawait import(barrel);", 'dynamic import of barrel outside any if'],
    ["const name = '@syzygy/polaris-dossier';\nif (argv[0] === 'dossier') require(name);", "require of name inside if (argv[0] === 'dossier')"],
  ])('the walk returns a computed specifier in %j as its own edge (its own mutant)', (text, edge) => {
    expect(edgesOf(`${text}\n`).map((found) => [found.specifier, found.edge])).toEqual([[null, edge]]);
  });
});

/** The daemon path: the modules the entry reaches through every edge but its literal dynamic imports inside the `dossier` and
 * `polaris` branches, which only those commands take. Each module's edges are found by `edgesOf`, so a module on the path where the
 * two methods disagree fails here too. */
let daemonPath: { reachable: string[]; unresolved: string[]; branchEdges: string[]; edges: (Edge & { readonly module: string })[] } | undefined;
function walkDaemonPath(): NonNullable<typeof daemonPath> {
  if (daemonPath !== undefined) return daemonPath;
  const BRANCHES = ["inside if (argv[0] === 'dossier')", "inside if (argv[0] === 'polaris')"];
  const branchEdges: string[] = [];
  const edges: (Edge & { readonly module: string })[] = [];
  const walked = reach(ENTRY, (module) => {
    const found = edgesOf(readModule(module));
    edges.push(...found.map((edge) => ({ module, ...edge })));
    const branch = (edge: Edge): boolean => module === ENTRY && edge.specifier !== null && edge.form === 'dynamic import' && BRANCHES.includes(edge.where);
    branchEdges.push(...found.filter(branch).map((edge) => edge.edge));
    return found.flatMap((edge) => (edge.specifier === null || branch(edge) ? [] : [edge.specifier]));
  });
  daemonPath = { reachable: walked.reachable, unresolved: walked.unresolved.map((edge) => `${edge.from} imports ${edge.specifier}`), branchEdges, edges };
  return daemonPath;
}

describe('the daemon path, every module the entry reaches outside its dossier and polaris branches', () => {
  it('leaves the entry by every edge but the four dynamic imports inside those branches', () => {
    expect(walkDaemonPath().branchEdges).toEqual([
      "dynamic import '@syzygy/polaris-dossier' inside if (argv[0] === 'dossier')",
      "dynamic import '@syzygy/three-surface-poc-app/dossier-site' inside if (argv[0] === 'dossier')",
      "dynamic import '@syzygy/polaris-dossier' inside if (argv[0] === 'polaris')",
      "dynamic import '@syzygy/three-surface-poc-app/dossier-site' inside if (argv[0] === 'polaris')",
    ]);
  });

  it('resolves every workspace specifier on it, and reaches past the entry\'s own imports', () => {
    const { reachable, unresolved } = walkDaemonPath();
    expect(unresolved).toEqual([]);
    expect(reachable).toContain('packages/cap1-core/src/index.ts');
  });

  it('reaches this package through argv.ts and state-directory.ts alone', () => {
    expect(walkDaemonPath().reachable.filter((module) => module.startsWith(`${PACKAGE}/`))).toEqual([
      'packages/polaris-dossier/src/argv.ts',
      'packages/polaris-dossier/src/state-directory.ts',
    ]);
  });

  it('has no node:module edge, and no import() or require of a computed name', () => {
    const { edges } = walkDaemonPath();
    expect(edges.filter((edge) => edge.specifier === 'node:module' || edge.specifier === 'module').map((edge) => `${edge.module}: ${edge.edge}`)).toEqual([]);
    expect(edges.filter((edge) => edge.specifier === null).map((edge) => `${edge.module}: ${edge.edge}`)).toEqual([]);
  });
});
