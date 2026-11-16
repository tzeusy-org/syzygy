// syzygy-bpyt.6.15: which modules and workspace packages the POC daemon's entry reaches, by two methods, and the observer-input
// gate's decision on each, from one built tree.
//   walk:    the drift guard's own method: the shared workspace-reach testkit (built), following every edge
//            ts.preProcessFile reports, from apps/three-surface-poc/src/main.ts;
//   program: an independent second method: a TypeScript program over the same entry, with Node's module resolution through
//            node_modules (realpath), counting every source and declaration file it loads by workspace package.
// Usage: node closure.mjs <tree> <out.json>
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

const [tree, out] = process.argv.slice(2);
const ENTRY = 'apps/three-surface-poc/src/main.ts';
const ts = createRequire(join(tree, 'package.json'))('typescript');
const kit = await import(pathToFileURL(join(tree, 'packages/polaris-generation-core/dist/workspace-reach.testkit.js')).href);
const { pocObserverInputsAreClean } = await import(pathToFileURL(join(tree, 'apps/three-surface-poc/dist/git-observation.js')).href);
const dirs = [...kit.WORKSPACE.manifests.values()].map((manifest) => manifest.dir).filter((dir) => dir !== '.');
const packageOf = (path) => dirs.find((dir) => path.startsWith(`${dir}/`)) ?? null;

const { reachable, unresolved } = kit.reach(ENTRY, (file) =>
  ts.preProcessFile(kit.readModule(file), true, true).importedFiles.map((imported) => imported.fileName));
const walkPackages = [...new Set(reachable.map(packageOf))].sort();

const options = { strict: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext,
  noEmit: true, skipLibCheck: true, types: ['node'], typeRoots: [join(tree, 'node_modules', '@types')] };
const host = ts.createCompilerHost(options);
host.getCurrentDirectory = () => tree;
const program = ts.createProgram([join(tree, ENTRY)], options, host);
const programPackages = [...new Set(program.getSourceFiles().map((file) => packageOf(relative(tree, file.fileName))).filter((dir) => dir !== null))].sort();

const inputs = [...reachable, ...walkPackages.flatMap((dir) => [`${dir}/package.json`, `${dir}/tsconfig.json`])];
const unprotected = inputs.filter((path) => pocObserverInputsAreClean({ changedPaths: [path] }));
const commit = execFileSync('git', ['-C', tree, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const record = { commit, entry: ENTRY, typescript: ts.version, reachable: reachable.length, unresolved, walkPackages, programPackages,
  methodsAgree: JSON.stringify(walkPackages) === JSON.stringify(programPackages), inputs: inputs.length, unprotected };
writeFileSync(out, `${JSON.stringify(record, null, 1)}\n`);
console.log(JSON.stringify({ ...record, unprotected: unprotected.length }));
