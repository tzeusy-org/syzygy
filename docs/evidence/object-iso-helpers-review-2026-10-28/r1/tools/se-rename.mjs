// Probe of the retained site-equivalence.mjs's base-side rename (R-GP-IMPL-OBJECT-ISO-HELPERS-1).
// Usage: node se-rename.mjs <clone> <base> <head>
// SE-7: a string literal that names an old helper at the base and the new one at the head (a changed rendered value, no identifier).
// It is run through the original tool and the reviewer's strict variant, and through the proposed guard: on the base side, the count of
// \bisObj(?:ect)?\b matches in the emitted JavaScript must equal the count of Identifier nodes of those names in it.
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const [clone, base, head] = process.argv.slice(2);
const dir = `${clone}/docs/evidence/syzygy-bpyt-6-3-iso`;
const original = await import(pathToFileURL(`${dir}/site-equivalence.mjs`).href);
const strict = await import(pathToFileURL(`${dir}/site-equivalence-strict.mjs`).href);
const ts = createRequire(`${clone}/package.json`)('typescript');
const show = (rev, p) => execFileSync('git', ['-C', clone, 'show', `${rev}:${p}`]).toString('utf8');
const emit = (source, path) => ts.transpileModule(source, { fileName: path, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, removeComments: true } }).outputText;

const guard = (js) => {
  const regex = (js.match(/\bisObj(?:ect)?\b/g) ?? []).length;
  let ident = 0;
  const visit = (n) => { if (ts.isIdentifier(n) && /^isObj(?:ect)?$/.test(n.text)) ident++; ts.forEachChild(n, visit); };
  visit(ts.createSourceFile('x.js', js, ts.ScriptTarget.ES2022, true));
  return { regex, ident, ok: regex === ident };
};

const p = 'packages/polaris-dossier/src/check.ts';
const baseText = show(base, p), headText = show(head, p);
const cases = [
  ['SE-7', "export const helperLabel = 'isObject';\n", "export const helperLabel = 'isRecord';\n", 'a string literal changed from isObject to isRecord'],
  ['SE-8', "export const helperLabel = 'isObject';\n", "export const helperLabel = 'isObject';\n", 'control: the same string literal on both sides'],
];
for (const [id, addBase, addHead, why] of cases) {
  const b = baseText + addBase, h = headText + addHead;
  const o = original.compareFiles(b, h, p), s = strict.compareFiles(b, h, p), g = guard(emit(b, p));
  console.log(`${id} ${p}: original equal=${o.equal}; strict equal=${s.equal}; guard on base emit regex ${g.regex} identifiers ${g.ident} ok=${g.ok}; ${why}`);
}
const g0 = guard(emit(baseText, p));
console.log(`unmutated base ${p}: guard regex ${g0.regex} identifiers ${g0.ident} ok=${g0.ok}`);
