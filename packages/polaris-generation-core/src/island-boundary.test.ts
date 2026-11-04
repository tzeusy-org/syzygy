import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { isFile, reach as reachBy, readModule } from './workspace-reach.testkit.js';

// syzygy-bpyt.8.1/.8.23: the CLI and the broker-client process it launches
// never load the parked provider island (owner packet Q8). Read TypeScript
// edges by syntax, refusing loaders whose target the walk cannot determine.
// The shared resolver follows workspace exports, including their conditions.
// Only the island and the two Node entries are listed, never their reach sets.
const ENTRIES = ['apps/syzygy/src/main.ts', 'packages/polaris-dossier/src/broker-client.ts'];
const ISLAND = [
  'packages/polaris-generation-core/src/admitted-input.ts',
  'packages/polaris-generation-core/src/discovery-provider.ts',
  'packages/polaris-generation-core/src/discovery.ts',
  'packages/polaris-generation-core/src/excerpt.ts',
  'packages/polaris-generation-core/src/pipeline.ts',
  'packages/polaris-generation-core/src/provider-draft.ts',
  'packages/polaris-generation-core/src/rendered-design.ts',
  'apps/three-surface-poc/src/polaris-generation/dossier-trigger.ts',
  'apps/three-surface-poc/src/polaris-generation/durable-lifecycle.ts',
  'apps/three-surface-poc/src/polaris-generation/generation-mutation-run-main.ts',
  'apps/three-surface-poc/src/polaris-generation/generation-mutation.ts',
  'apps/three-surface-poc/src/polaris-generation/pipeline-demo-main.ts',
  'apps/three-surface-poc/src/polaris-generation/pipeline-demo.ts',
  'apps/three-surface-poc/src/polaris-generation/redis-shaped-fixture.ts',
  'apps/three-surface-poc/src/polaris-generation/redis-shaped-measure-main.ts',
  'apps/three-surface-poc/src/polaris-generation/redis-shaped-measure.ts',
  'apps/three-surface-poc/src/polaris-generation/repo-corpus-main.ts',
  'apps/three-surface-poc/src/polaris-generation/repo-corpus.ts',
  'apps/three-surface-poc/src/polaris-generation/self-corpus-main.ts',
  'apps/three-surface-poc/src/polaris-generation/self-corpus.ts',
];
/** Static, type-only, re-export, import-type and literal dynamic edges. A
 * computed import or CommonJS loader cannot be followed by this guard. */
function importsOf(file: string, text: string): { specifiers: string[]; unsupported: string[] } {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const specifiers: string[] = [];
  const unsupported: string[] = [];
  const createRequireNames = new Set(['createRequire']);
  // An imported createRequire alias still constructs a CommonJS loader.
  for (const node of source.statements) {
    if (!ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier)
      || !['node:module', 'module'].includes(node.moduleSpecifier.text)) continue;
    const bindings = node.importClause?.namedBindings;
    if (bindings !== undefined && ts.isNamedImports(bindings)) {
      for (const imported of bindings.elements) {
        if ((imported.propertyName ?? imported.name).text === 'createRequire') createRequireNames.add(imported.name.text);
      }
    }
  }
  const refuse = (node: ts.Node, form: string): void => {
    const { line, character } = source.getLineAndCharacterOfPosition(node.getStart(source));
    unsupported.push(`${file}:${line + 1}:${character + 1} ${form}: ${node.getText(source)}`);
  };
  const visit = (node: ts.Node): void => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier !== undefined
      && ts.isStringLiteral(node.moduleSpecifier)) specifiers.push(node.moduleSpecifier.text);
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) {
      specifiers.push(node.argument.literal.text);
    }
    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) refuse(node, 'require import');
    if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const argument = node.arguments[0];
        if (argument !== undefined && (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument))) specifiers.push(argument.text);
        else refuse(node, 'computed import()');
      } else {
        let callee: ts.Expression = node.expression;
        while (ts.isParenthesizedExpression(callee)) callee = callee.expression;
        const name = ts.isIdentifier(callee) ? callee.text : ts.isPropertyAccessExpression(callee) ? callee.name.text
          : ts.isElementAccessExpression(callee) && ts.isStringLiteral(callee.argumentExpression) ? callee.argumentExpression.text : undefined;
        if (name === 'require' || (name !== undefined && createRequireNames.has(name))) refuse(node, 'require/createRequire call');
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return { specifiers, unsupported };
}

/** Every module and unresolved/unsupported edge, with an originating path for
 * island entries. Walking the consent root deliberately reaches the island. */
function reach(entry: string): { reachable: string[]; intoIsland: string[]; unresolved: string[]; unsupported: string[] } {
  const island = new Set(ISLAND);
  const unsupported: string[] = [];
  const { reachable, edges, unresolved } = reachBy(entry, (file) => {
    const imports = importsOf(file, readModule(file));
    for (const form of imports.unsupported) unsupported.push(form);
    return imports.specifiers;
  });
  const paths = new Map([[entry, entry]]);
  for (const edge of edges) {
    if (!paths.has(edge.to)) paths.set(edge.to, `${paths.get(edge.from)} -> ${edge.from} imports ${edge.specifier} (${edge.to})`);
  }
  return {
    reachable,
    intoIsland: edges.filter((edge) => island.has(edge.to) && !island.has(edge.from))
      .map((edge) => `${paths.get(edge.from)} -> ${edge.from} imports ${edge.specifier} (${edge.to})`),
    unresolved: unresolved.map((edge) => `${entry}: ${edge.from} imports ${edge.specifier}`),
    unsupported: unsupported.map((form) => `${entry}: ${form}`),
  };
}

describe('the live Node entries and the parked provider island', () => {
  it('lists twenty island modules, each a file in the tree', () => {
    expect(new Set(ISLAND).size).toBe(20);
    expect(ISLAND.filter(path => !isFile(path))).toEqual([]);
  });

  it('resolves every workspace import both entries reach, dynamic ones included', () => {
    for (const entry of ENTRIES) {
      const { reachable, unresolved, unsupported } = reach(entry);
      expect(unsupported, `${entry}: unsupported loader forms`).toEqual([]);
      expect(unresolved, `${entry}: unresolved workspace imports`).toEqual([]);
      if (entry === ENTRIES[0]) {
        expect(reachable).toContain('apps/three-surface-poc/src/polaris-generation/dossier-site.ts');
        expect(reachable).toContain('packages/polaris-generation-consent/src/in-force.ts');
      }
    }
  });

  it('reaches no island module from either live entry', () => {
    for (const entry of ENTRIES) {
      const { reachable, intoIsland } = reach(entry);
      expect(intoIsland, `${entry}: paths into the parked island`).toEqual([]);
      expect(reachable, `${entry}: consent root must stay parked`).not.toContain('packages/polaris-generation-consent/src/index.ts');
      expect(reachable, `${entry}: consent ports must stay parked`).not.toContain('packages/polaris-generation-consent/src/consent-ports.ts');
      expect(reachable.filter(path => ISLAND.includes(path)), entry).toEqual([]);
    }
  });

  // .8.19 removed the whole-module exception. This positive control depends
  // on consent-ports still importing the parked core root; a later decoupling
  // must replace this control rather than treating that change as a defect.
  it('reaches the island from the consent package root, which neither live entry imports', () => {
    expect(reach('packages/polaris-generation-consent/src/index.ts').intoIsland.length).toBeGreaterThan(0);
  });

  it('refuses computed import arguments, including template expressions', () => {
    for (const call of ['import(target)', "import(['@syzygy', 'polaris-generation-core'].join('/'))", 'import(`./${target}.js`)']) {
      const { unsupported } = importsOf('fixture.ts', call);
      expect(unsupported, call).toHaveLength(1);
      expect(unsupported[0]).toContain('computed import()');
      expect(unsupported[0]).toContain(call);
    }
  });

  it('refuses require calls and import-equals loaders', () => {
    for (const call of ["require('island')", "(require)('island')", "module.require('island')", "module['require']('island')", "import island = require('island')"]) {
      expect(importsOf('fixture.ts', call).unsupported, call).toHaveLength(1);
    }
  });

  it('refuses createRequire calls, including imported aliases and module properties', () => {
    for (const text of [
      'createRequire(import.meta.url)', '(createRequire)(import.meta.url)',
      "import { createRequire as load } from 'node:module'; load(import.meta.url)",
      "import * as mod from 'node:module'; mod.createRequire(import.meta.url)",
    ]) expect(importsOf('fixture.ts', text).unsupported, text).toHaveLength(1);
  });

  it('follows a no-substitution template and the existing static, type and literal dynamic forms', () => {
    expect(importsOf('fixture.ts', [
      "import './static.js';", "import type { T } from './type.js';", "export * from './export.js';",
      "type T = import('./import-type.js').T;", "import('./dynamic.js');", 'import(`./template.js`);',
    ].join('\n'))).toEqual({
      specifiers: ['./static.js', './type.js', './export.js', './import-type.js', './dynamic.js', './template.js'], unsupported: [],
    });
  });
});
