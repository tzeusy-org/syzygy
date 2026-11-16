// Transpile each file at two commits with the repository's TypeScript and compare the emitted JavaScript.
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const [tree, base, head, ...files] = process.argv.slice(2);
const ts = createRequire(`${tree}/package.json`)('typescript');
const options = { module: ts.ModuleKind.NodeNext, target: ts.ScriptTarget.ES2022, isolatedModules: true, verbatimModuleSyntax: false };
let same = 0;
for (const file of files) {
  const emit = (rev) => ts.transpileModule(execFileSync('git', ['-C', tree, 'show', `${rev}:${file}`], { encoding: 'utf8' }), { compilerOptions: options, fileName: file }).outputText;
  const a = emit(base), b = emit(head);
  if (a === b) same++; else console.log('DIFFERS', file);
}
console.log(`emitted JavaScript identical for ${same} of ${files.length} files`);
