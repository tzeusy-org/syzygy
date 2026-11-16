// rev-540: the POC daemon's runtime closure by two methods independent of the workspace-reach testkit, from one built tree,
// and the built observer-input gate's decision on each input.
//   runtime: Node itself loads apps/three-surface-poc/dist/main.js --help under load-hook.mjs; every file:// URL inside the tree
//            is a module the daemon process really loads (static graph only: --help returns before serving);
//   esbuild: esbuild bundles the same dist entry (platform node, every non-@syzygy bare specifier external), following static,
//            re-export and literal dynamic imports; its metafile's inputs are the modules it reached.
// Each dist path maps back to its source (<pkg>/dist/a/b.js -> <pkg>/src/a/b.ts). Inputs: each module, plus each reached
// package's package.json and tsconfig.json.
// Usage: node closure_independent.mjs <tree> <load-hook.mjs> <out.json>
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const [tree, hook, out] = process.argv.slice(2);
const ENTRY = 'apps/three-surface-poc/dist/main.js';
const { pocObserverInputsAreClean } = await import(pathToFileURL(join(tree, 'apps/three-surface-poc/dist/git-observation.js')).href);
const PKG = /^((?:apps|packages)\/[^/]+)\/dist\/(.*)\.js$/u;
const toSource = (path) => { const m = PKG.exec(path); return m ? `${m[1]}/src/${m[2]}.ts` : path; };
const packageOf = (path) => /^((?:apps|packages)\/[^/]+)\//u.exec(path)?.[1] ?? null;

// Method 1: what Node loads.
const scratch = mkdtempSync(join(process.env.TMPDIR ?? '/tmp', 'rev540-loads-'));
const loadsFile = join(scratch, 'loads.txt');
const stdout = execFileSync(process.execPath, ['--import', pathToFileURL(hook).href, join(tree, ENTRY), '--help'],
  { cwd: tree, encoding: 'utf8', env: { ...process.env, REV540_LOADS: loadsFile } });
const urls = readFileSync(loadsFile, 'utf8').split('\n').filter(Boolean);
rmSync(scratch, { recursive: true, force: true });
const inTree = urls.filter((u) => u.startsWith('file://')).map((u) => relative(tree, fileURLToPath(u)))
  .filter((p) => !p.startsWith('..') && !p.startsWith('node_modules/'));
const outsideTreeFiles = urls.filter((u) => u.startsWith('file://')).map((u) => fileURLToPath(u)).filter((p) => relative(tree, p).startsWith('..'));
const runtime = [...new Set(inTree.map(toSource))].sort();

// Method 2: esbuild's resolver over the same entry.
const esbuild = createRequire(join(tree, 'package.json'))('esbuild');
const external = {
  name: 'external-non-workspace',
  setup(build) {
    build.onResolve({ filter: /^[^./]/ }, (args) => (args.path.startsWith('@syzygy/') ? undefined : { path: args.path, external: true }));
  },
};
const result = await esbuild.build({ entryPoints: [join(tree, ENTRY)], bundle: true, write: false, platform: 'node', format: 'esm',
  metafile: true, logLevel: 'silent', plugins: [external], absWorkingDir: tree, preserveSymlinks: false });
const bundled = [...new Set(Object.keys(result.metafile.inputs).map((p) => toSource(p)))].sort();

const methodsAgree = JSON.stringify(runtime) === JSON.stringify(bundled);
const packages = [...new Set(runtime.map(packageOf))].sort();
const inputs = [...runtime, ...packages.flatMap((dir) => [`${dir}/package.json`, `${dir}/tsconfig.json`])];
const missingSource = runtime.filter((p) => !existsSync(join(tree, p)));
const unprotected = inputs.filter((p) => pocObserverInputsAreClean({ changedPaths: [p] }));
const commit = execFileSync('git', ['-C', tree, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const record = { commit, entry: ENTRY, helpPrinted: stdout.startsWith('syzygy three-surface POC'), loadedUrls: urls.length,
  nonFileUrls: urls.filter((u) => !u.startsWith('file://')).length, outsideTreeFiles,
  runtime: runtime.length, esbuild: bundled.length, methodsAgree,
  onlyInRuntime: runtime.filter((p) => !bundled.includes(p)), onlyInEsbuild: bundled.filter((p) => !runtime.includes(p)),
  packages, inputs: inputs.length, missingSource, unprotected, modules: runtime };
writeFileSync(out, `${JSON.stringify(record, null, 1)}\n`);
console.log(JSON.stringify({ ...record, modules: undefined }));
