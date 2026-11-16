// Compare the emitted JS (and declaration text) of one module at two commits.
// usage: node emit_compare.cjs <clone> <path> <base> <head>
const { execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const [clone, file, base, head] = process.argv.slice(2);
const ts = require(require.resolve('typescript', { paths: [clone] }));
const show = (c) => execFileSync('git', ['-C', clone, 'show', `${c}:${file}`], { encoding: 'utf8' });
const h = (s) => crypto.createHash('sha256').update(s).digest('hex');
const tsconfig = JSON.parse(execFileSync('git', ['-C', clone, 'show', `${head}:apps/three-surface-poc/tsconfig.json`], { encoding: 'utf8' }).replace(/\/\/.*$/gm, ''));
console.log('typescript', ts.version);
for (const [label, opts] of [
  ['transpile removeComments=false', { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, removeComments: false }],
  ['transpile removeComments=true', { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, removeComments: true }],
  ['transpile NodeNext', { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.NodeNext }],
]) {
  const out = [base, head].map((c) => ts.transpileModule(show(c), { fileName: file, compilerOptions: opts }).outputText);
  console.log(label, h(out[0]), h(out[1]), out[0] === out[1] ? 'EQUAL' : 'DIFFERENT');
}
// declaration emit, in-memory, isolated
for (const c of [base, head]) {
  const src = show(c);
  let dts = '';
  const host = ts.createCompilerHost({});
  const orig = host.getSourceFile;
  host.getSourceFile = (n, l) => (n === '/m.ts' ? ts.createSourceFile(n, src, l) : orig(n, l));
  host.writeFile = (n, t) => { if (n.endsWith('.d.ts')) dts = t; };
  const p = ts.createProgram(['/m.ts'], { declaration: true, emitDeclarationOnly: true, noResolve: true, isolatedModules: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }, host);
  p.emit();
  console.log('d.ts', c, h(dts), dts.split('\n').filter((l) => l.includes('mustFail') || l.includes('MUST')).join(' | '));
}
