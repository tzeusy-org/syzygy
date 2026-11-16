import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { ROOT, isFile, reach as reachBy, readModule } from './workspace-reach.testkit.js';

// syzygy-bpyt.8.1/.8.23: the CLI and the broker-client process it launches
// never load the parked provider island (owner packet Q8). Read TypeScript
// edges by syntax, refusing loaders whose target the walk cannot determine.
// The shared resolver follows workspace exports, including their conditions.
// Entry reach sets and the production-source population are discovered, not listed.
const ENTRIES = ['apps/syzygy/src/main.ts', 'packages/polaris-dossier/src/broker-client.ts'];
const ISLAND = [
  'packages/polaris-generation-core/src/admitted-input.ts',
  'packages/polaris-generation-core/src/discovery-provider.ts',
  'packages/polaris-generation-core/src/discovery.ts',
  'packages/polaris-generation-core/src/excerpt.ts',
  'packages/polaris-generation-core/src/pipeline.ts',
  'packages/polaris-generation-core/src/provider-draft.ts',
  'packages/polaris-generation-core/src/rendered-design.ts',
  'apps/three-surface-poc/src/polaris-generation/dossier-main.ts',
  'apps/three-surface-poc/src/polaris-generation/dossier-render.ts',
  'apps/three-surface-poc/src/polaris-generation/dossier-render-main.ts',
  'apps/three-surface-poc/src/polaris-generation/dossier-trigger.ts',
  'apps/three-surface-poc/src/polaris-generation/durable-lifecycle.ts',
  'apps/three-surface-poc/src/polaris-generation/generation-mutation-run-main.ts',
  'apps/three-surface-poc/src/polaris-generation/generation-mutation.ts',
  'apps/three-surface-poc/src/polaris-generation/pipeline-demo-main.ts',
  'apps/three-surface-poc/src/polaris-generation/pipeline-demo.ts',
  'apps/three-surface-poc/src/polaris-generation/public-source-screening.ts',
  'apps/three-surface-poc/src/polaris-generation/redis-shaped-fixture.ts',
  'apps/three-surface-poc/src/polaris-generation/redis-shaped-measure-main.ts',
  'apps/three-surface-poc/src/polaris-generation/redis-shaped-measure.ts',
  'apps/three-surface-poc/src/polaris-generation/repo-corpus-main.ts',
  'apps/three-surface-poc/src/polaris-generation/repo-corpus.ts',
  'apps/three-surface-poc/src/polaris-generation/self-corpus-main.ts',
  'apps/three-surface-poc/src/polaris-generation/self-corpus.ts',
];
// Original G2 remainders: the parked roots re-export provider declarations;
// consent-ports uses the core root, as do the two source helpers and the
// evaluation command. These are allowed origins, never traversal cutoffs.
const PARKED_REMAINDER = [
  'packages/polaris-generation-core/src/index.ts',
  'packages/polaris-generation-consent/src/index.ts',
  'packages/polaris-generation-consent/src/consent-ports.ts',
  'apps/three-surface-poc/src/polaris-generation/run-key.ts',
  'apps/three-surface-poc/src/polaris-generation/synthetic-source.ts',
  'apps/three-surface-poc/src/polaris-generation/dossier-evaluation-main.ts',
];

/** All JS/TS sources under each app/package's src directory, including
 * disconnected modules. Tests, testkits and declaration files are the
 * deliberate source exceptions; scripts are outside this production walk.
 * Ordinary test helpers remain in the population, making it conservative. */
function productionModules(): string[] {
  const files: string[] = [];
  const walk = (directory: string): void => {
    for (const item of readdirSync(join(ROOT, directory), { withFileTypes: true })) {
      const path = `${directory}/${item.name}`;
      if (item.isDirectory()) walk(path);
      else if (item.isFile() && /\.[cm]?[jt]s$/u.test(path)
        && !/\.(?:test|testkit)\.[cm]?[jt]s$|\.d\.[cm]?ts$/u.test(path)) files.push(path);
    }
  };
  for (const parent of ['apps', 'packages']) {
    for (const item of readdirSync(join(ROOT, parent), { withFileTypes: true })) {
      if (item.isDirectory() && isFile(`${parent}/${item.name}/package.json`)) walk(`${parent}/${item.name}/src`);
    }
  }
  return files.sort();
}
/** Static, type-only, re-export, import-type and literal dynamic edges. A
 * computed import or CommonJS loader cannot be followed by this guard. */
function importsOf(file: string, text: string): { specifiers: string[]; unsupported: string[] } {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const specifiers: string[] = [];
  const unsupported: string[] = [];
  const createRequireNames = new Set(['createRequire']);
  // Imported aliases and destructuring an awaited literal module import
  // retain createRequire provenance. This is finite syntax handling, not
  // arbitrary JavaScript value/loader alias analysis.
  const bindingsOf = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)
      && ['node:module', 'module'].includes(node.moduleSpecifier.text)) {
      const bindings = node.importClause?.namedBindings;
      if (bindings !== undefined && ts.isNamedImports(bindings)) {
        for (const imported of bindings.elements) {
          if ((imported.propertyName ?? imported.name).text === 'createRequire') createRequireNames.add(imported.name.text);
        }
      }
    }
    if (ts.isVariableDeclaration(node) && ts.isObjectBindingPattern(node.name) && node.initializer !== undefined
      && ts.isAwaitExpression(node.initializer) && ts.isCallExpression(node.initializer.expression)) {
      const call = node.initializer.expression;
      const argument = call.arguments[0];
      if (call.expression.kind === ts.SyntaxKind.ImportKeyword && argument !== undefined
        && (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument))
        && ['node:module', 'module'].includes(argument.text)) {
        for (const binding of node.name.elements) {
          if (ts.isIdentifier(binding.name) && (binding.propertyName ?? binding.name).getText(source) === 'createRequire') {
            createRequireNames.add(binding.name.text);
          }
        }
      }
    }
    ts.forEachChild(node, bindingsOf);
  };
  bindingsOf(source);
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
function reach(entry: string, readImports = (file: string) => importsOf(file, readModule(file))): { reachable: string[]; intoIsland: string[]; unresolved: string[]; unsupported: string[] } {
  const island = new Set(ISLAND);
  const unsupported: string[] = [];
  const { reachable, edges, unresolved } = reachBy(entry, (file) => {
    const imports = readImports(file);
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
  it('lists twenty-four island modules, each a file in the tree', () => {
    expect(new Set(ISLAND).size).toBe(24);
    expect(ISLAND).toHaveLength(24);
    expect(ISLAND.filter(path => !isFile(path))).toEqual([]);
  });

  it('admits transitive island ingress only from the island and exact parked remainder', () => {
    const population = productionModules();
    const allowed = new Set([...ISLAND, ...PARKED_REMAINDER]);
    const cache = new Map<string, ReturnType<typeof importsOf>>();
    const readImports = (file: string): ReturnType<typeof importsOf> => {
      let imports = cache.get(file);
      if (imports === undefined) { imports = importsOf(file, readModule(file)); cache.set(file, imports); }
      return imports;
    };
    const violations: string[] = [];
    const unresolved: string[] = [];
    const unsupported: string[] = [];
    for (const module of population) {
      const result = reach(module, readImports);
      for (const edge of result.unresolved) unresolved.push(edge);
      for (const form of result.unsupported) unsupported.push(form);
      if (!allowed.has(module) && result.intoIsland.length > 0) violations.push(result.intoIsland[0]!);
    }
    expect(population.length, 'production-source enumeration must not be empty').toBeGreaterThan(0);
    expect([...new Set(unsupported)], `${population.length} production sources: unsupported loaders`).toEqual([]);
    expect([...new Set(unresolved)], `${population.length} production sources: unresolved workspace edges`).toEqual([]);
    expect(violations, `${population.length} production sources: unlisted transitive ingress\n${violations.join('\n')}`).toEqual([]);
  });

  it('resolves every workspace import both entries reach, dynamic ones included', () => {
    for (const entry of ENTRIES) {
      const { reachable, unresolved, unsupported } = reach(entry);
      expect(unsupported, `${entry}: unsupported loader forms\n${unsupported.join('\n')}`).toEqual([]);
      expect(unresolved, `${entry}: unresolved workspace imports\n${unresolved.join('\n')}`).toEqual([]);
      if (entry === ENTRIES[0]) {
        expect(reachable).toContain('apps/three-surface-poc/src/polaris-generation/dossier-site.ts');
        expect(reachable).toContain('packages/polaris-generation-consent/src/in-force.ts');
      }
    }
  });

  it('reaches no island module from either live entry', () => {
    for (const entry of ENTRIES) {
      const { reachable, intoIsland } = reach(entry);
      expect(intoIsland, `${entry}: first path into the parked island\n${intoIsland[0] ?? '(none)'}`).toEqual([]);
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
      ...['node:module', 'module'].map(module => `const { createRequire: auditMake } = await import('${module}'); const auditLoad = auditMake(import.meta.url); auditLoad('@syzygy/polaris-generation-core');`),
    ]) {
      const { unsupported } = importsOf('fixture.ts', text);
      expect(unsupported, text).toHaveLength(1);
      expect(unsupported[0], text).toContain('fixture.ts:');
      expect(unsupported[0], text).toContain('require/createRequire call');
    }
    expect(importsOf('fixture.ts', [
      '// createRequire and require are words here, not loaders.',
      "const prose = 'createRequire require auditMake';",
      "const { createInterface: ordinary } = await import('node:readline/promises'); ordinary();",
      "const { createRequire: ordinaryName } = await import('./ordinary.js'); ordinaryName();",
    ].join('\n'))).toEqual({ specifiers: ['node:readline/promises', './ordinary.js'], unsupported: [] });
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
