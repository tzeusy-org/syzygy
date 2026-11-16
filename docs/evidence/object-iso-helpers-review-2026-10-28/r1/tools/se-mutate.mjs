// Probe of the retained site-equivalence.mjs (R-GP-IMPL-OBJECT-ISO-HELPERS-1).
// Usage: node se-mutate.mjs <clone> <base> <head>
// 1. Token census: every \bisObj(?:ect)?\b match the tool's base-side rename touches, against the Identifier nodes of that name in the
//    syntax tree, per file at the base (a match that is not an identifier would be a string or comment the rename rewrites).
// 2. Mutants of real head files, each run through the tool's own compareFiles: the ones its normalisation could mask, and controls.
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const [clone, base, head] = process.argv.slice(2);
const tool = await import(pathToFileURL(`${clone}/docs/evidence/syzygy-bpyt-6-3-iso/${process.env.SE_TOOL ?? 'site-equivalence.mjs'}`).href);
const ts = createRequire(`${clone}/package.json`)('typescript');
const git = (...args) => execFileSync('git', ['-C', clone, ...args], { maxBuffer: 1 << 28 }).toString('utf8');
const show = (rev, p) => git('show', `${rev}:${p}`);

const files = git('diff', '--name-only', base, head).split('\n').filter((p) => /^(packages|apps)\/[^/]+\/src\/.*\.ts$/.test(p) && !p.endsWith('.test.ts'));
let regexTotal = 0, identTotal = 0;
for (const p of files) {
  let src;
  try { src = show(base, p); } catch { continue; }
  const regex = (src.match(/\bisObj(?:ect)?\b/g) ?? []).length;
  let ident = 0;
  const sf = ts.createSourceFile(p, src, ts.ScriptTarget.ES2022, true);
  const visit = (n) => { if (ts.isIdentifier(n) && /^isObj(?:ect)?$/.test(n.text)) ident++; ts.forEachChild(n, visit); };
  visit(sf);
  regexTotal += regex; identTotal += ident;
  if (regex !== ident) console.log(`TOKEN MISMATCH ${p}: regex ${regex}, identifiers ${ident}`);
}
console.log(`token census over ${files.length} files: regex matches ${regexTotal}, identifier nodes ${identTotal}`);

const cases = [
  // [id, file, from, to, expectEqual, why]
  ['SE-1', 'packages/polaris-dossier/src/brief.ts', 'account.\n\nDossier draft:', 'account.\nDossier draft:', null,
    'a blank line removed inside the DOSSIER_GUIDANCE template literal (the brief text changes)'],
  ['SE-2', 'packages/polaris-dossier/src/brief.ts', 'account.\n\nDossier draft:', 'account.\n\n   \n\nDossier draft:', null,
    'whitespace-only lines added inside the DOSSIER_GUIDANCE template literal'],
  ['SE-3', 'packages/polaris-dossier/src/check.ts', "const doc: Readonly<Record<string, unknown>> = isRecord(subject) ? subject : {};",
    "const doc: Readonly<Record<string, unknown>> = isRecord(subject) ? subject : { pinnedRevision: undefined };", false,
    'control: a changed fallback object at a call site'],
  ['SE-4', 'packages/polaris-generation-core/src/secret-redaction.ts', "if (!isRecord(red)) return refuse('is not an object');",
    "if (!isRecord(red) && !Array.isArray(red)) return refuse('is not an object');", false, 'control: an array admitted at a class-4 call site'],
  ['SE-5', 'packages/three-surface-poc-core/src/authority-artifact-fields.ts', 'isRecord(', '(isRecord)(', null,
    'parenthesised callee at the first call (same value; emit may differ)'],
  ['SE-6', 'packages/polaris-dossier/src/screen.ts', "if (!isRecord(scope)) return refuse('it carries no publicSourceScope');",
    "if (!isRecord(scope)) return refuse('it carries no publicSourceScope');\n\n", true, 'control: blank lines outside any literal (no behaviour change)'],
];
for (const [id, p, from, to, expectEqual, why] of cases) {
  const baseText = show(base, p), headText = show(head, p);
  const at = headText.indexOf(from);
  if (at < 0 || headText.indexOf(from, at + 1) >= 0 && id !== 'SE-5') { console.log(`${id} SKIP: fragment occurs ${at < 0 ? 0 : '>1'} times`); continue; }
  const mutated = headText.slice(0, at) + to + headText.slice(at + from.length);
  const r = tool.compareFiles(baseText, mutated, p);
  const verdict = expectEqual === null ? (r.equal ? 'MASKED (tool says equal)' : 'reported') : (r.equal === expectEqual ? 'as expected' : 'UNEXPECTED');
  console.log(`${id} ${p}: equal=${r.equal} -> ${verdict}; ${why}`);
}
