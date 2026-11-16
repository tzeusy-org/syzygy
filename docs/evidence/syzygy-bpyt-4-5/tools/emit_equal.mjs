// Whether each named file's JavaScript emit is equal at two commits (syzygy-bpyt.4.5). Evidence tool, not authority.
//
// usage: node emit_equal.mjs TREE COMMIT_A COMMIT_B PATH...
//
// Each side is the file's bytes at that commit (`git show`), transpiled by the tree's own TypeScript with comments removed,
// and every `const <NAME>_CPU_MS = <digits>;` in the emit masked to `const <NAME>_CPU_MS = BOUND;`. Two sides are equal when
// the masked emits are byte-equal: they then differ only in comments, in types, or in a CPU bound's value, none of which
// changes what a timed region runs. Prints one JSON object, {path: true | false}.
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import * as path from 'node:path';

const [tree, a, b, ...files] = process.argv.slice(2);
const ts = createRequire(path.join(path.resolve(tree), 'package.json'))('typescript');
const emit = (commit, file) =>
  ts.transpileModule(execFileSync('git', ['show', `${commit}:${file}`], { cwd: tree, encoding: 'utf8' }), {
    fileName: file,
    compilerOptions: { removeComments: true, target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext },
  }).outputText.replace(/const ([A-Z_]+_CPU_MS) = [0-9_]+;/g, 'const $1 = BOUND;');
console.log(JSON.stringify(Object.fromEntries(files.map((file) => [file, emit(a, file) === emit(b, file)]))));
