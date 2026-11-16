// Applies the stack-4 isoOf dedupe to a working tree: each polaris-dossier module that held its own copy of
//   const isoOf = (instant: number): string => new Date(instant).toISOString();
// loses that line (and one blank line when it stood alone between two) and imports the one in ./iso-of.js, placed among the relative
// imports in specifier order. Usage: node apply-iso-of.mjs <repo root> [--check]
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const root = resolve(process.argv[2] ?? '.');
const check = process.argv.includes('--check');
const ts = createRequire(resolve(root, 'package.json'))('typescript');
const DEFINITION = 'const isoOf = (instant: number): string => new Date(instant).toISOString();';
const FILES = ['brief', 'check', 'close', 'inventory', 'review', 'session-handover', 'waiting-sessions'].map((n) => `packages/polaris-dossier/src/${n}.ts`);
const SPECIFIER = './iso-of.js';

const report = [];
for (const file of FILES) {
  const path = resolve(root, file);
  const text = readFileSync(path, 'utf8');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const defs = sf.statements.filter((s) => ts.isVariableStatement(s) && s.getText(sf) === DEFINITION);
  if (defs.length !== 1) throw new Error(`${file}: expected one definition, found ${defs.length}`);
  const edits = [];

  const start = text.lastIndexOf('\n', defs[0].getStart(sf) - 1) + 1;
  let end = text.indexOf('\n', defs[0].getEnd()) + 1;
  const lineBefore = text.slice(text.lastIndexOf('\n', start - 2) + 1, start - 1);
  const lineAfter = text.slice(end, text.indexOf('\n', end));
  if (lineBefore.trim() === '' && lineAfter.trim() === '') end = text.indexOf('\n', end) + 1;
  edits.push({ start, end, text: '' });

  const imports = sf.statements.filter(ts.isImportDeclaration);
  const relative = imports.filter((i) => i.moduleSpecifier.text.startsWith('./'));
  if (relative.length === 0) throw new Error(`${file}: no relative import to place the new one beside`);
  const next = relative.find((i) => i.moduleSpecifier.text > SPECIFIER);
  const at = next !== undefined ? text.lastIndexOf('\n', next.getStart(sf) - 1) + 1 : text.indexOf('\n', relative[relative.length - 1].getEnd()) + 1;
  edits.push({ start: at, end: at, text: `import { isoOf } from '${SPECIFIER}';\n` });

  edits.sort((a, b) => b.start - a.start || b.end - a.end);
  let out = text;
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  report.push({ file, calls: [...text.matchAll(/\bisoOf\(/g)].length - 0, placedBefore: next?.moduleSpecifier.text ?? '(end of imports)' });
  if (!check) writeFileSync(path, out);
}
console.log(JSON.stringify(report, null, 1));
