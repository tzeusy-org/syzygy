// rev-536: compare two versions of a TypeScript file with every comment removed: the JS TypeScript emits for each with
// removeComments, after a full parse. Usage: node strip_compare.cjs <typescript module dir> <old file> <new file>
const fs = require('node:fs');
const ts = require(process.argv[2]);
const [oldText, newText] = [process.argv[3], process.argv[4]].map((file) => fs.readFileSync(file, 'utf8'));
const emit = (text) => ts.transpileModule(text, { compilerOptions: { removeComments: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const [a, b] = [emit(oldText), emit(newText)];
console.log(JSON.stringify({ emitEqual: a === b, emitBytes: [a.length, b.length] }));
