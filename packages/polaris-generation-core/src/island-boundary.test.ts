import { readdirSync } from 'node:fs';
import { isBuiltin } from 'node:module';
import { join } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { ROOT, isFile, reach as reachBy, readModule, resolve, type ReachEdge } from './workspace-reach.testkit.js';

// syzygy-bpyt.8.1/.8.23: the CLI and the broker-client process it launches
// never load the parked provider island (owner packet Q8). Read TypeScript
// edges by syntax, refusing loaders whose target the walk cannot determine.
// The shared resolver follows workspace exports, including their conditions.
// Entry reach sets and the production-source population are discovered, not listed.
const ENTRIES = ['apps/syzygy/src/main.ts', 'packages/polaris-dossier/src/broker-client.ts'];
const URL_RUNTIME = 'packages/polaris-dossier/src/url-runtime.ts';
const RUNTIME_BUILDER = 'scripts/build_dossier_runtime.mjs';
const RENDERER_ENTRY = 'apps/three-surface-poc/src/polaris-generation/dossier-site.ts';
const RENDERER_EDGE = `../../../${RENDERER_ENTRY}`;
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
const parse = (file: string, text: string): ts.SourceFile => ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
const printer = ts.createPrinter({ removeComments: true });
const syntax = (node: ts.Node): string => printer.printNode(ts.EmitHint.Unspecified, node, node.getSourceFile());
const statementsOf = (text: string): string[] => parse('expected.ts', text).statements.map(syntax);
const findFunction = (source: ts.SourceFile, name: string): ts.FunctionDeclaration | undefined => source.statements.find(
  (statement): statement is ts.FunctionDeclaration => ts.isFunctionDeclaration(statement) && statement.name?.text === name);

const rendererLoad = "const module: unknown = await import(`data:text/javascript;base64,${Buffer.from(captured.rendererBytes).toString('base64')}`);";
const checkedRendererLoad = statementsOf(`
  const captured = installed.get(runtime);
  if (captured === undefined) return null;
  const fresh = await readUrlRuntime(captured.root);
  if (!fresh.ok || JSON.stringify(fresh.runtime) !== JSON.stringify(runtime)) return null;
  ${rendererLoad}
`);

/** The data URL adds the installed bundle's first-party source edge. Admit
 * only the exact import node reached after the runtime capability checks. */
function installedRendererImport(source: ts.SourceFile): ts.CallExpression | undefined {
  if (source.fileName !== URL_RUNTIME) return undefined;
  const loader = findFunction(source, 'loadUrlDossierRenderer');
  if (loader?.parameters.length !== 1 || syntax(loader.parameters[0]!) !== 'runtime: UrlRuntime') return undefined;
  const attempt = loader.body?.statements[0];
  if (loader.body?.statements.length !== 1 || attempt === undefined || !ts.isTryStatement(attempt)) return undefined;
  const prefix = attempt.tryBlock.statements.slice(0, checkedRendererLoad.length);
  if (prefix.length !== checkedRendererLoad.length || !prefix.every((statement, index) => syntax(statement) === checkedRendererLoad[index])) return undefined;
  const statement = prefix.at(-1)!;
  if (!ts.isVariableStatement(statement)) return undefined;
  const initializer = statement.declarationList.declarations[0]?.initializer;
  return initializer !== undefined && ts.isAwaitExpression(initializer) && ts.isCallExpression(initializer.expression)
    ? initializer.expression : undefined;
}

/** Static, type-only, re-export, import-type and literal dynamic edges.
 * The verified installed renderer is the only computed edge with a known target. */
function importsOf(file: string, text: string): { specifiers: string[]; unsupported: string[] } {
  const source = parse(file, text);
  const rendererImport = installedRendererImport(source);
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
        else if (node === rendererImport) specifiers.push(RENDERER_EDGE);
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

const importsInCheckout = new Map<string, ReturnType<typeof importsOf>>();

function readCheckoutImports(file: string): ReturnType<typeof importsOf> {
  let imports = importsInCheckout.get(file);
  if (imports === undefined) {
    imports = importsOf(file, readModule(file));
    importsInCheckout.set(file, imports);
  }
  return imports;
}

/** Every module and unresolved/unsupported edge, with an originating path for
 * island entries. Walking the consent root deliberately reaches the island. */
function reach(entry: string, readImports = readCheckoutImports, resolveModule: typeof resolve = resolve): { reachable: string[]; intoIsland: string[]; unresolved: string[]; unsupported: string[] } {
  const island = new Set(ISLAND);
  const unsupported: string[] = [];
  const { reachable, edges, unresolved } = reachBy(entry, (file) => {
    const imports = readImports(file);
    for (const form of imports.unsupported) unsupported.push(form);
    return imports.specifiers;
  }, resolveModule);
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

/** Record one forward route per origin by walking the import graph backwards. */
function routesIntoIsland(edges: readonly ReachEdge[], island: readonly string[]): Map<string, ReachEdge> {
  const incoming = new Map<string, ReachEdge[]>();
  for (const edge of edges) {
    const previous = incoming.get(edge.to) ?? [];
    previous.push(edge);
    incoming.set(edge.to, previous);
  }
  const reachable = new Set(island);
  const pending = [...island];
  const routes = new Map<string, ReachEdge>();
  for (const module of pending) {
    for (const edge of incoming.get(module) ?? []) {
      if (reachable.has(edge.from)) continue;
      reachable.add(edge.from);
      routes.set(edge.from, edge);
      pending.push(edge.from);
    }
  }
  return routes;
}

describe('the live Node entries and the parked provider island', () => {
  it('lists twenty-four island modules, each a file in the tree', () => {
    expect(new Set(ISLAND).size).toBe(24);
    expect(ISLAND).toHaveLength(24);
    expect(ISLAND.filter(path => !isFile(path))).toEqual([]);
  });

  // A cold source census took 10.5 s under host load with the URL modules
  // present. Round three times the observed duration up to the next 5 s.
  it('admits transitive island ingress only from the island and exact parked remainder', () => {
    const population = productionModules();
    const allowed = new Set([...ISLAND, ...PARKED_REMAINDER]);
    const census = '<production census>';
    const unsupported: string[] = [];
    const parsed = new Set<string>();
    let importCount = 0;
    let resolutionCount = 0;
    const resolved = new Map<string, Set<string>>();
    const { edges, unresolved } = reachBy(census, (file) => {
      if (file === census) return population;
      parsed.add(file);
      const imports = readCheckoutImports(file);
      for (const form of imports.unsupported) unsupported.push(form);
      const specifiers = [...new Set(imports.specifiers)];
      importCount += specifiers.length;
      return specifiers;
    }, (from, specifier) => {
      if (from === census) return specifier;
      const specifiers = resolved.get(from) ?? new Set();
      if (specifiers.has(specifier)) throw new Error(`repeated edge resolution: ${from} imports ${specifier}`);
      specifiers.add(specifier);
      resolved.set(from, specifiers);
      resolutionCount += 1;
      return resolve(from, specifier);
    });
    const routes = routesIntoIsland(edges.filter((edge) => edge.from !== census), ISLAND);
    const violations: string[] = [];
    for (const module of population) {
      if (allowed.has(module) || !routes.has(module)) continue;
      const path = [module];
      for (let edge = routes.get(module); edge !== undefined; edge = routes.get(edge.to)) {
        path.push(`${edge.specifier} (${edge.to})`);
      }
      violations.push(path.join(' -> '));
    }
    expect(population.length, 'production-source enumeration must not be empty').toBeGreaterThan(0);
    expect(population.filter((file) => !parsed.has(file)), 'unexamined production sources').toEqual([]);
    expect(resolutionCount).toBe(importCount);
    expect(unsupported, `${population.length} production sources: unsupported loaders`).toEqual([]);
    expect(unresolved, `${population.length} production sources: unresolved workspace edges`).toEqual([]);
    expect(violations, `${population.length} production sources: unlisted transitive ingress\n${violations.join('\n')}`).toEqual([]);
  }, 35_000);

  it('finds a path to the island through a parked origin even with a cycle', () => {
    const hidden = { from: 'disconnected', specifier: './parked', to: 'parked' };
    const parked = { from: 'parked', specifier: './island', to: 'island' };
    const cycle = { from: 'parked', specifier: './disconnected', to: 'disconnected' };
    expect(routesIntoIsland([cycle, hidden, parked], ['island'])).toEqual(new Map([
      ['parked', parked],
      ['disconnected', hidden],
    ]));
  });

  // syzygy-8dzi: the import-graph walks measured up to 5.9 s alone on a loaded host.
  it('resolves every workspace import both entries reach, dynamic ones included', () => {
    for (const entry of ENTRIES) {
      const { reachable, unresolved, unsupported } = reach(entry);
      expect(unsupported, `${entry}: unsupported loader forms\n${unsupported.join('\n')}`).toEqual([]);
      expect(unresolved, `${entry}: unresolved workspace imports\n${unresolved.join('\n')}`).toEqual([]);
      if (entry === ENTRIES[0]) {
        expect(reachable).toContain(RENDERER_ENTRY);
        expect(reachable).toContain('packages/polaris-generation-consent/src/in-force.ts');
      }
    }
  }, 30_000);

  it('reaches no island module from either live entry', () => {
    for (const entry of ENTRIES) {
      const { reachable, intoIsland } = reach(entry);
      expect(intoIsland, `${entry}: first path into the parked island\n${intoIsland[0] ?? '(none)'}`).toEqual([]);
      expect(reachable, `${entry}: consent root must stay parked`).not.toContain('packages/polaris-generation-consent/src/index.ts');
      expect(reachable, `${entry}: consent ports must stay parked`).not.toContain('packages/polaris-generation-consent/src/consent-ports.ts');
      expect(reachable.filter(path => ISLAND.includes(path)), entry).toEqual([]);
    }
  }, 30_000);

  // .8.19 removed the whole-module exception. This positive control depends
  // on consent-ports still importing the parked core root; a later decoupling
  // must replace this control rather than treating that change as a defect.
  it('reaches the island from the consent package root, which neither live entry imports', () => {
    expect(reach('packages/polaris-generation-consent/src/index.ts').intoIsland.length).toBeGreaterThan(0);
  });

  it('walks the installed renderer from its exact captured bundle entry through the workspace', () => {
    const runtime = parse(URL_RUNTIME, readModule(URL_RUNTIME));
    expect(runtime.statements.map(syntax)).toContain(statementsOf(`const RENDERER_ENTRY = '${RENDERER_ENTRY}';`)[0]);
    const read = findFunction(runtime, 'readUrlRuntime')?.body?.statements[0];
    if (read === undefined || !ts.isTryStatement(read)) throw new Error('expected runtime capture in the readUrlRuntime try block');
    const capture = read.tryBlock.statements.map(syntax);
    for (const statement of statementsOf(`
      for (const file of files) {
        if (file.bytes > (file.path === 'worker.mjs' || file.path === 'renderer.mjs' || file.path === ORDERED_SCREEN ? 8_388_608 : 262_144)) throw new Error();
        const value = await read(path.join(directory, file.path), file.bytes, root, true);
        if (value.length !== file.bytes || sha256(value) !== file.sha256) throw new Error();
        if (file.path === 'renderer.mjs') rendererBytes = Uint8Array.from(value);
      }
      if (rendererBytes === undefined) throw new Error();
      installed.set(runtime, { root, rendererBytes, rendererSha256: files[1]!.sha256,
        policyGitProgram: deepFreeze({ addon: { file: path.join(directory, POLICY_ADDON), sha256: files[8]!.sha256 },
          supervisor: { file: path.join(directory, POLICY_SUPERVISOR), sha256: files[9]!.sha256 },
          git: { file: git, sha256: manifest.nativeBuild.git.sha256 } }),
        machineReaderProgram: deepFreeze({ executable: path.join(directory, MACHINE_PEER), sha256: files[7]!.sha256 }),
        orderedScreenProgram: deepFreeze({ node: { path: node, bytes: Number(manifest.node.bytes), sha256: manifest.node.sha256 },
          worker: { path: path.join(directory, ORDERED_SCREEN), bytes: files[6]!.bytes, sha256: files[6]!.sha256 } }) });
    `)) expect(capture).toContain(statement);
    const builder = statementsOf(readModule(RUNTIME_BUILDER));
    for (const statement of statementsOf(`
      const renderer = '${RENDERER_ENTRY}';
      const design = await build({ absWorkingDir: root, entryPoints: [renderer], bundle: true,
        platform: 'node', format: 'esm', conditions: ['source'], target: 'node24', outfile: 'renderer.mjs',
        write: false, metafile: true, logLevel: 'silent', plugins: [capturePlugin] });
      if (design.outputFiles.length !== 1 || design.outputFiles[0].contents.length > 8_388_608) throw new Error('unexpected renderer build output');
      outputs.set('renderer.mjs', design.outputFiles[0].contents);
      const inputs = new Set([...Object.keys(result.metafile.inputs), ...Object.keys(host.metafile.inputs), ...Object.keys(design.metafile.inputs),
        ...Object.keys(orderedScreen.metafile.inputs), ...ORDERED_SCREEN_SOURCES, ...profileSources,
        worker, ...peerSources.map(([source]) => source), ...POLICY_GIT_SOURCES,
        'scripts/build_dossier_runtime.mjs', 'scripts/compile_dossier_policy_git.mjs', 'scripts/compile_dossier_session_support.mjs', 'package-lock.json']);
      for (const name of [...Object.keys(host.metafile.inputs), ...Object.keys(design.metafile.inputs), ...Object.keys(orderedScreen.metafile.inputs)])
        if (!captured.has(name)) throw new Error('uncaptured host/renderer/screen compiler input');
    `)) expect(builder).toContain(statement);

    const runtimeImports = importsOf(URL_RUNTIME, runtime.text);
    expect(runtimeImports.specifiers.filter(specifier => resolve(URL_RUNTIME, specifier) === RENDERER_ENTRY)).toEqual([RENDERER_EDGE]);
    // The workspace walk includes type-only branches esbuild can erase.
    // Stop at these exact registry import edges.
    const registryImports = new Map([
      ['packages/polaris-generation-core/src/page-sink.ts', 'parse5'],
      ['packages/cap1-core/src/yaml-dialect.ts', 'yaml'],
    ]);
    const resolveRenderer: typeof resolve = (from, specifier) => {
      const target = resolve(from, specifier);
      if (target !== null || registryImports.get(from) === specifier || (specifier.startsWith('node:') && isBuiltin(specifier))) return target;
      return undefined;
    };
    const closure = reach(RENDERER_ENTRY, undefined, resolveRenderer);
    expect(closure.unresolved).toEqual([]);
    expect(closure.unsupported).toEqual([]);
    expect(closure.intoIsland).toEqual([]);
  });

  it('refuses nearby computed loaders with different inputs, provenance, or scope', () => {
    const runtime = readModule(URL_RUNTIME);
    expect(runtime).toContain(rendererLoad);
    expect(importsOf('lookalike/url-runtime.ts', runtime).unsupported).toHaveLength(1);
    for (const [before, after, admitted] of [
      ['captured.rendererBytes).toString', 'captured.workerBytes).toString', 0],
      ['data:text/javascript;base64,', 'data:text/javascript,', 0],
      [".toString('base64')}`)", ".toString('base64')}`, {})", 0],
      ['const captured = installed.get(runtime);', 'const captured = fallback.get(runtime);', 0],
      ['const fresh = await readUrlRuntime(captured.root);', 'const fresh = await uncheckedRuntime(captured.root);', 0],
      ['function loadUrlDossierRenderer(runtime:', 'function otherLoader(runtime:', 0],
      ['function loadUrlDossierRenderer(runtime: UrlRuntime)', 'function loadUrlDossierRenderer(runtime: UrlRuntime, Buffer: unknown)', 0],
      [rendererLoad, `if (choose) { ${rendererLoad} }`, 0],
      [rendererLoad, `${rendererLoad}\n${rendererLoad.replace('const module:', 'const anotherModule:')}`, 1],
    ] as const) {
      expect(runtime, before).toContain(before);
      const imports = importsOf(URL_RUNTIME, runtime.replace(before, after));
      expect(imports.unsupported, after).toHaveLength(1);
      expect(imports.unsupported[0], after).toContain('computed import()');
      expect(imports.specifiers.filter(specifier => specifier === RENDERER_EDGE), after).toHaveLength(admitted);
    }
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
