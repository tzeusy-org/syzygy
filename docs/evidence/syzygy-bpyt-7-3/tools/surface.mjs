// The export surface of module entries, by TypeScript's checker: every exported name, whether it carries a value, a type or
// both, and the declaration it resolves to (file and name). Usage: node surface.mjs <tree> <out.json> <entry.ts>...
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
const [tree, out, ...entries] = process.argv.slice(2);
const ts = createRequire(join(tree, 'package.json'))('typescript');
const options = { strict: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext, noEmit: true, skipLibCheck: true, typeRoots: [join(tree, 'node_modules', '@types')], types: ['node'] };
const host = ts.createCompilerHost(options);
host.getCurrentDirectory = () => tree;
// Resolve @syzygy/* to source, as the root Vitest aliases do, so no dist is needed.
const SOURCES = { '@syzygy/cap1-core': 'packages/cap1-core/src/index.ts', '@syzygy/cap1-daemon': 'packages/cap1-daemon/src/index.ts', '@syzygy/http-host': 'packages/http-host/src/index.ts' };
host.resolveModuleNameLiterals = (literals, containing) => literals.map((literal) => {
  const name = literal.text;
  if (SOURCES[name]) return { resolvedModule: { resolvedFileName: join(tree, SOURCES[name]), extension: ts.Extension.Ts, isExternalLibraryImport: false } };
  return ts.resolveModuleName(name, containing, options, host);
});
const program = ts.createProgram(entries.map((e) => join(tree, e)), options, host);
const checker = program.getTypeChecker();
const result = {};
for (const entry of entries) {
  const file = program.getSourceFile(join(tree, entry));
  const symbol = checker.getSymbolAtLocation(file);
  const rows = checker.getExportsOfModule(symbol).map((exported) => {
    const target = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
    const decl = target.declarations?.[0];
    return {
      name: exported.name,
      value: Boolean(target.flags & ts.SymbolFlags.Value),
      type: Boolean(target.flags & ts.SymbolFlags.Type),
      declaredIn: decl === undefined ? null : relative(tree, decl.getSourceFile().fileName),
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
  result[entry] = rows;
}
const diagnostics = ts.getPreEmitDiagnostics(program).filter((d) => d.category === ts.DiagnosticCategory.Error).length;
writeFileSync(out, JSON.stringify({ tree, entries: result, errors: diagnostics }, null, 1));
console.log(Object.entries(result).map(([e, rows]) => `${e}: ${rows.length} names (${rows.filter((r) => r.value).length} values)`).join('\n'), `errors=${diagnostics}`);
