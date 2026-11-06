// Whether each named file's JavaScript emit is equal at two commits (syzygy-bpyt.43). Evidence tool, not authority.
//
// usage: node emit_equal.mjs TREE COMMIT_A COMMIT_B PATH...
//
// Each named file is read at each commit with git show, transpiled by this tree's installed TypeScript using the
// options below, then comments are removed and CPU-bound constants masked. A true result proves only equality of
// those masked TypeScript-transpiled JavaScript bytes. Type-only edits can correctly pass. This does not compare
// Vitest/Jest leading pragmas, runner configuration/environment, imported modules or actual timed-region CPU.
// In particular @vitest-environment/@jest-environment comments and a transitive busy loop can leave this comparison
// true while changing test execution. Equal emits do not imply that source differences are only comments/types/bounds.
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
