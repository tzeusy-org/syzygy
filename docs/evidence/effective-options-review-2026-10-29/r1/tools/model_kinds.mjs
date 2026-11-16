// rev-558: product-build.test.ts's new emitted() (copied) against tsc --listFilesOnly and against what tsc -b writes, on a scratch
// project holding a .js, .mjs and .cts under allowJs, an imported JSON under resolveJsonModule, a module named only in `files`,
// and a triple-slash reference. Usage: node model_kinds.mjs <checkout with node_modules> <scratch dir>
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative } from 'node:path';
const [checkout, root] = process.argv.slice(2);
const require = createRequire(join(checkout, 'x.js'));
const ts = require('typescript');
function emitted(project, rootDir) {
  const base = rootDir.endsWith('/') ? rootDir : `${rootDir}/`;
  const path = join(base, project, 'tsconfig.json');
  const parsed = ts.parseJsonConfigFileContent(ts.readConfigFile(path, ts.sys.readFile).config, ts.sys, dirname(path));
  const program = ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options, projectReferences: parsed.projectReferences });
  return program.getSourceFiles().map(({ fileName }) => fileName)
    .filter((file) => file.startsWith(`${base}${project}/src/`) && !file.endsWith('.d.ts')).map((file) => file.slice(base.length)).sort();
}
const put = (p, t) => { mkdirSync(dirname(join(root, p)), { recursive: true }); writeFileSync(join(root, p), t); };
symlinkSync(join(checkout, 'node_modules'), join(root, 'node_modules'));
put('packages/k/src/index.ts', "/// <reference path=\"./ref.ts\" />\nimport data from './data.json';\nimport { j } from './j.js';\nimport { m } from './m.mjs';\nexport const all = [data, j, m];\n");
put('packages/k/src/ref.ts', 'export const r = 1;\n');
put('packages/k/src/data.json', '{"x": 1}\n');
put('packages/k/src/j.js', 'export const j = 1;\n');
put('packages/k/src/m.mjs', 'export const m = 1;\n');
put('packages/k/src/c.cts', 'export const c = 1;\n');
put('packages/k/src/only-in-files.ts', 'export const o = 1;\n');
put('packages/k/src/unreached.ts', 'export const u = 1;\n');
put('packages/k/tsconfig.json', JSON.stringify({
  compilerOptions: { composite: true, allowJs: true, resolveJsonModule: true, target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext', types: [], rootDir: 'src', outDir: 'dist', tsBuildInfoFile: 'dist/.tsbuildinfo', esModuleInterop: true },
  files: ['src/only-in-files.ts', 'src/c.cts'], include: ['src/index.ts', 'src/ref.ts', 'src/j.js', 'src/m.mjs', 'src/data.json'],
}));
put('packages/k/package.json', JSON.stringify({ type: 'module' }));
const tsc = require.resolve('typescript/bin/tsc');
const listed = execFileSync(process.execPath, [tsc, '-p', join(root, 'packages/k/tsconfig.json'), '--listFilesOnly'], { encoding: 'utf8' })
  .split('\n').filter((f) => f.startsWith(`${root}/packages/k/src/`) && !f.endsWith('.d.ts')).map((f) => f.slice(root.length + 1)).sort();
let buildExit = 0;
try { execFileSync(process.execPath, [tsc, '-b', join(root, 'packages/k')], { encoding: 'utf8', stdio: 'pipe' }); } catch (e) { buildExit = e.status; }
const walk = (d) => readdirSync(d).flatMap((n) => statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]);
const written = walk(join(root, 'packages/k/dist')).map((f) => relative(root, f)).filter((f) => !f.endsWith('.d.ts') && !f.endsWith('.d.mts') && !f.endsWith('.d.cts') && !f.endsWith('.tsbuildinfo')).sort();
const model = emitted('packages/k', root);
console.log(JSON.stringify({ model, listed, modelEqualsListed: JSON.stringify(model) === JSON.stringify(listed), buildExit, written }, null, 1));
