#!/usr/bin/env node
// Census of the consent package's public surface (syzygy-bpyt.8.19). Evidence tool, not a check and not authority.
//
//   (in the tree) npm ci && npx tsc -b packages/polaris-generation-consent
//   node scripts/census_consent_exports.mjs <tree> --out <file.json> [--against <earlier census.json>]
//
// For the tree at `<tree>`, it lists: the subpaths `packages/polaris-generation-consent/package.json` exports; for each subpath and
// for `src/consent-ports.ts`, every name the module exports, from TypeScript's checker over the source (a name is a value when its
// target symbol has a value meaning, else a type; its origin is the file declaring that target), and the names its compiled module
// exports at runtime; and, for each module, which of its value exports are the same object as the root barrel's export of that name.
// It reads the tree only and writes only `--out`.
//
// With `--against`, it also compares this census with an earlier one: for every module both list, the names added and removed and
// the names whose origin moved; the subpaths removed; and, for each subpath the earlier census did not list, whether every name it
// exports is a root name of the same origin and every value it exports is the root's own object. `comparison.unchanged` is true only
// when no subpath was removed, no module both list gained or lost a name, and every added subpath passes both tests; the exit code is
// 0 either way. A moved origin is reported, not judged: moving a declaration is what syzygy-bpyt.8.19 does.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_REL = 'scripts/census_consent_exports.mjs';
const PACKAGE = 'packages/polaris-generation-consent';
const argv = process.argv.slice(2);
const tree = argv[0] === undefined || argv[0].startsWith('--') ? undefined : path.resolve(argv[0]);
const out = argv.includes('--out') ? argv[argv.indexOf('--out') + 1] : undefined;
const against = argv.includes('--against') ? argv[argv.indexOf('--against') + 1] : undefined;
if (tree === undefined || out === undefined) {
  process.stderr.write('usage: node scripts/census_consent_exports.mjs <tree> --out <file.json>\n');
  process.exit(2);
}
const ts = createRequire(path.join(tree, 'package.json'))('typescript');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const git = (...args) => execFileSync('git', ['-C', tree, ...args], { encoding: 'utf8' }).trim();

const manifest = JSON.parse(fs.readFileSync(path.join(tree, PACKAGE, 'package.json'), 'utf8'));
const subpaths = Object.keys(manifest.exports).sort();
/** The source module of one subpath: its `import` target with `./dist/X.js` read as `src/X.ts`. */
const sourceOf = subpath => {
  const target = manifest.exports[subpath];
  const file = typeof target === 'string' ? target : target.import ?? target.default;
  return path.posix.join(PACKAGE, file.replace(/^\.\/dist\//u, 'src/').replace(/\.js$/u, '.ts'));
};
const compiledOf = source => path.join(tree, source.replace(/\/src\//u, '/dist/').replace(/\.ts$/u, '.js'));

const modules = [...subpaths.map(sourceOf), `${PACKAGE}/src/consent-ports.ts`];
const program = ts.createProgram(modules.map(m => path.join(tree, m)), {
  module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext, target: ts.ScriptTarget.ES2022, strict: true, noEmit: true, skipLibCheck: true,
});
const checker = program.getTypeChecker();
/** Every name `source` exports, as `value` or `type`, sorted. */
const declared = source => {
  const file = program.getSourceFile(path.join(tree, source));
  if (file === undefined) throw new Error(`${source}: not in the program`);
  const symbol = checker.getSymbolAtLocation(file);
  if (symbol === undefined) throw new Error(`${source}: not a module`);
  return checker.getExportsOfModule(symbol).map(s => {
    const target = s.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(s) : s;
    const declaration = target.declarations?.[0];
    const origin = declaration === undefined ? null : path.relative(tree, declaration.getSourceFile().fileName).split(path.sep).join('/');
    return { name: s.name, kind: target.flags & ts.SymbolFlags.Value ? 'value' : 'type', origin };
  }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
};

const root = await import(pathToFileURL(compiledOf(sourceOf('.'))).href);
const census = {};
for (const source of modules) {
  const loaded = await import(pathToFileURL(compiledOf(source)).href);
  const names = declared(source);
  const runtime = Object.keys(loaded).sort();
  census[source] = {
    sha256: sha256(fs.readFileSync(path.join(tree, source))),
    subpath: subpaths.find(s => sourceOf(s) === source) ?? null,
    names: names.map(n => `${n.kind} ${n.name}`),
    values: names.filter(n => n.kind === 'value').map(n => n.name),
    types: names.filter(n => n.kind === 'type').map(n => n.name),
    origins: Object.fromEntries(names.map(n => [n.name, n.origin])),
    runtime,
    runtimeEqualsValues: JSON.stringify(runtime) === JSON.stringify(names.filter(n => n.kind === 'value').map(n => n.name)),
    sameObjectAsRoot: runtime.filter(name => Object.hasOwn(root, name) && root[name] === loaded[name]),
  };
}
const document = {
  schema: 'consent-export-census/1',
  bead: 'syzygy-bpyt.8.19',
  text: 'Evidence record, not authority: every name the consent package exports, per subpath, and every name consent-ports.ts exports. Generated by the script named here; do not edit.',
  script: { path: SCRIPT_REL, sha256: sha256(fs.readFileSync(fileURLToPath(import.meta.url))) },
  measuredOn: { commit: git('rev-parse', 'HEAD'), clean: git('status', '--porcelain', '--untracked-files=no') === '', typescript: ts.version, node: process.version },
  subpaths,
  modules: census,
};
if (against !== undefined) {
  const bytes = fs.readFileSync(against);
  const earlier = JSON.parse(bytes.toString('utf8'));
  const minus = (a, b) => a.filter(x => !b.includes(x));
  const rootNames = census[sourceOf('.')].names;
  const modulesCompared = Object.keys(earlier.modules).filter(m => Object.hasOwn(census, m)).map(m => ({
    module: m, added: minus(census[m].names, earlier.modules[m].names), removed: minus(earlier.modules[m].names, census[m].names),
    originMoved: Object.keys(census[m].origins).filter(n => Object.hasOwn(earlier.modules[m].origins ?? {}, n) && earlier.modules[m].origins[n] !== census[m].origins[n])
      .map(n => `${n}: ${earlier.modules[m].origins[n]} -> ${census[m].origins[n]}`),
  }));
  const subpathsAdded = minus(subpaths, earlier.subpaths).map(s => {
    const c = census[sourceOf(s)];
    const rootOrigins = census[sourceOf('.')].origins;
    return {
      subpath: s, module: sourceOf(s), names: c.names.length, notRootNames: minus(c.names, rootNames),
      notRootOrigins: Object.keys(c.origins).filter(n => Object.hasOwn(rootOrigins, n) && rootOrigins[n] !== c.origins[n]),
      valuesNotRootObjects: minus(c.runtime, c.sameObjectAsRoot),
    };
  });
  const subpathsRemoved = minus(earlier.subpaths, subpaths);
  const modulesNotCompared = [...minus(Object.keys(earlier.modules), Object.keys(census)), ...minus(Object.keys(census), Object.keys(earlier.modules))];
  document.against = { path: path.basename(against), sha256: sha256(bytes), commit: earlier.measuredOn.commit };
  document.comparison = {
    subpathsAdded, subpathsRemoved, modulesCompared, modulesNotCompared,
    unchanged: subpathsRemoved.length === 0 && modulesCompared.every(m => m.added.length === 0 && m.removed.length === 0)
      && subpathsAdded.every(s => s.notRootNames.length === 0 && s.notRootOrigins.length === 0 && s.valuesNotRootObjects.length === 0)
      && modulesNotCompared.every(m => subpathsAdded.some(s => s.module === m)),
  };
}
fs.writeFileSync(out, `${JSON.stringify(document, null, 1)}\n`);
process.stderr.write(`${modules.length} modules: ${modules.map(m => `${path.basename(m)} ${census[m].names.length}`).join(', ')}${document.comparison === undefined ? '' : `; unchanged against ${document.against.commit.slice(0, 8)}: ${document.comparison.unchanged}`}\n`);
