// Reviewer's own lifter (R-GP-IMPL-DOSSIER-CLI-TABLE-1): cut the daemon's parseCli and polaris's parseArgs out of one tree by
// TypeScript AST (FunctionDeclaration by name), transpile each to JavaScript, and write two modules the parse harness imports.
// Usage: node lift.mjs <tree> <out-dir>
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createRequire } from 'node:module';

const [tree, out] = process.argv.slice(2).map((p) => path.resolve(p));
const require = createRequire(path.join(tree, 'package.json'));
const ts = require('typescript');
fs.mkdirSync(out, { recursive: true });

function functionText(file, name) {
  const text = fs.readFileSync(file, 'utf8');
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const found = source.statements.filter((s) => ts.isFunctionDeclaration(s) && s.name?.text === name);
  if (found.length !== 1) throw new Error(`${file}: ${found.length} declarations of ${name}`);
  const consts = source.statements.filter((s) => ts.isVariableStatement(s)).map((s) => s.getText(source));
  return { body: found[0].getText(source), consts, text };
}

const js = (code) => ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const argvJs = path.join(tree, 'packages/polaris-dossier/dist/argv.js');
const argvImport = (body) => (body.includes('readArgv') ? `import { isArgvFault, readArgv } from ${JSON.stringify(argvJs)};\n` : '');

const daemon = functionText(path.join(tree, 'apps/syzygy/src/main.ts'), 'parseCli');
const wanted = daemon.consts.filter((c) => /^const (DEFAULT_PORT|DEFAULT_STATE_DIR_NAME) =/.test(c));
if (wanted.length !== 2) throw new Error('daemon constants');
fs.writeFileSync(path.join(out, 'daemon-parse.mjs'), js(`import * as path from 'node:path';\n${argvImport(daemon.body)}${wanted.join('\n')}\n${daemon.body}\nexport { parseCli };\n`));

const polaris = functionText(path.join(tree, 'packages/polaris-dossier/src/polaris.ts'), 'parseArgs');
fs.writeFileSync(path.join(out, 'polaris-parse.mjs'), js(`import * as os from 'node:os';\nimport * as path from 'node:path';\n${argvImport(polaris.body)}const STATE_ROOT_ENV = 'SYZYGY_DOSSIER_STATE_ROOT';\nconst POLARIS_USAGE = '<POLARIS_USAGE>';\n${polaris.body}\nexport { parseArgs };\n`));
const used = [...new Set(polaris.body.match(/\b[A-Z][A-Z_]{3,}\b/g) ?? [])];
console.log(JSON.stringify({ tree, daemonBytes: daemon.body.length, polarisBytes: polaris.body.length, polarisUpperIdentifiers: used }));
