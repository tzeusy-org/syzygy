// rev-521: read every readArgv caller's spec from the syntax tree at a tree, compare it with argv.test.ts's four policy copies, and
// run the built readArgv on every real spec to see whether any reaches the new programming-error throw. Usage: node spec_copies.mjs <tree>
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const tree = path.resolve(process.argv[2]);
const ts = createRequire(path.join(tree, 'package.json'))('typescript');
const parse = (rel) => ts.createSourceFile(rel, fs.readFileSync(path.join(tree, rel), 'utf8'), ts.ScriptTarget.Latest, true);
function value(node, src) {
  if (ts.isStringLiteralLike(node)) return node.text;
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map((e) => value(e, src));
  if (ts.isObjectLiteralExpression(node)) {
    const out = {};
    for (const p of node.properties) {
      if (ts.isPropertyAssignment(p)) out[p.name.getText(src)] = value(p.initializer, src);
      else if (ts.isSpreadAssignment(p)) out[`...${p.expression.getText(src)}`] = '<spread>';
      else out[p.getText(src)] = '<unsupported>';
    }
    return out;
  }
  return `<expr ${node.getText(src)}>`;
}
const calls = (rel) => {
  const src = parse(rel); const found = [];
  const visit = (n) => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'readArgv') found.push({ line: src.getLineAndCharacterOfPosition(n.getStart(src)).line + 1, spec: value(n.arguments[1], src) });
    ts.forEachChild(n, visit);
  };
  visit(src); return found;
};
const testSrc = parse('packages/polaris-dossier/src/argv.test.ts');
const copies = {};
for (const st of testSrc.statements) if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) if (d.initializer && ts.isObjectLiteralExpression(d.initializer)) copies[d.name.getText(testSrc)] = value(d.initializer, testSrc);
const main = calls('apps/syzygy/src/main.ts');
const polaris = calls('packages/polaris-dossier/src/polaris.ts');
const cli = calls('packages/polaris-dossier/src/cli.ts');
// DOSSIER_COMMANDS: every entry's args, from the syntax tree
const cliSrc = parse('packages/polaris-dossier/src/cli.ts');
const commands = {};
const visit = (n) => {
  if (ts.isVariableDeclaration(n) && n.name.getText(cliSrc) === 'DOSSIER_COMMANDS') {
    const obj = n.initializer.arguments[0];
    for (const p of obj.properties) {
      const args = p.initializer.properties.find((q) => q.name?.getText(cliSrc) === 'args');
      commands[p.name.getText(cliSrc)] = value(args.initializer, cliSrc);
    }
  }
  ts.forEachChild(n, visit);
};
visit(cliSrc);
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const report = {
  callers: { main: main.map((c) => c.line), polaris: polaris.map((c) => c.line), cli: cli.map((c) => c.line) },
  copies: Object.keys(copies),
  daemonCopyEqual: main.length === 1 && eq(copies.DAEMON, main[0].spec),
  polarisCopyEqual: polaris.length === 1 && eq(copies.POLARIS, polaris[0].spec),
  dossierOneCopyEqual: eq(copies.DOSSIER_ONE, cli[0]?.spec),
  dossierOptionsPolicyEqual: eq({ ...copies.DOSSIER_OPTIONS, valued: '<v>' }, { ...cli[1]?.spec, valued: '<v>' }),
  dossierOptionsCallerValued: cli[1]?.spec.valued,
  dossierOptionsCopyValued: copies.DOSSIER_OPTIONS?.valued,
  optionsCommands: Object.fromEntries(Object.entries(commands).filter(([, a]) => a.kind === 'options').map(([k, a]) => [k, a.options])),
  oneCommands: Object.entries(commands).filter(([, a]) => a.kind === 'one').map(([k]) => k),
  commandCount: Object.keys(commands).length,
};
report.dossierOptionsValuedIsACommand = Object.entries(report.optionsCommands).filter(([, o]) => eq(o, copies.DOSSIER_OPTIONS?.valued)).map(([k]) => k);
// every real spec through the built reader
const { readArgv } = await import(pathToFileURL(path.join(tree, 'packages/polaris-dossier/dist/argv.js')).href);
const real = [['daemon', main[0].spec], ['polaris', polaris[0].spec], ['dossier one', cli[0].spec],
  ...Object.entries(report.optionsCommands).map(([k, options]) => [`dossier ${k}`, { ...cli[1].spec, valued: options }])];
report.realSpecs = real.length;
report.throws = [];
for (const [name, spec] of real) for (const args of [[], ['x'], ['--help'], ['-h', 'x']]) {
  try { readArgv(args, spec); } catch (e) { report.throws.push({ name, args, message: e.message }); }
}
console.log(JSON.stringify(report, null, 1));
