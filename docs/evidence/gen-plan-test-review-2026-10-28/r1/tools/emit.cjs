// usage: node emit.cjs <clone> <fileName> < source
// Prints TypeScript's emit of stdin with the same options as the plan test
// (removeComments, ES2022, ESNext), using the clone's own TypeScript.
const { createRequire } = require('node:module');
const path = require('node:path');
const ts = createRequire(path.resolve(process.argv[2], 'package.json'))('typescript');
const text = require('node:fs').readFileSync(0, 'utf8');
process.stdout.write(ts.transpileModule(text, {
  fileName: process.argv[3],
  compilerOptions: { removeComments: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText);
