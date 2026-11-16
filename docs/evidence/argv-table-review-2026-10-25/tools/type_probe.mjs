// rev-521: my own N4 probe. Lift ReviewPacketResult (and, at head, ReviewPacketRefusal) from review.ts at three commits by the
// syntax tree, with the real ReverifyRefusal from the built declarations and Outcome from outcome.ts, then check every
// assignability direction under tsc --strict, plus a negative control (Head with draftRevision: string) and a pairing probe: a value
// whose ok:true report is the union must not be assignable to Head (the wide form). Usage: node type_probe.mjs <tree> <scratch>
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const [tree, scratch] = process.argv.slice(2).map((p) => path.resolve(p));
const ts = createRequire(path.join(tree, 'package.json'))('typescript');
const show = (c, f) => execFileSync('git', ['show', `${c}:${f}`], { cwd: tree, encoding: 'utf8' });
const COMMITS = { before: 'ce322e1a65b784c6304d51b05fb347351912a926', was: 'df6046a153fe130202abdf6bd3045a79ba143879', head: 'e3e6a78b2ae9db8a26e5139ce74213325f3e8d72' };
function aliases(text) {
  const src = ts.createSourceFile('review.ts', text, ts.ScriptTarget.Latest, true);
  const out = {};
  for (const st of src.statements) if (ts.isTypeAliasDeclaration(st) && /^ReviewPacket(Result|Refusal)$/.test(st.name.text)) out[st.name.text] = st.type.getText(src);
  return out;
}
const lifted = Object.fromEntries(Object.entries(COMMITS).map(([k, c]) => [k, aliases(show(c, 'packages/polaris-dossier/src/review.ts'))]));
const outcome = show(COMMITS.head, 'packages/polaris-dossier/src/outcome.ts').replace('export type Outcome', 'type Outcome');
const refusalHead = lifted.head.ReviewPacketRefusal;
const body = (name, type) => `type ${name} = ${type.replaceAll('ReviewPacketRefusal', '(' + refusalHead + ')')};`;
const prelude = [`import type { ReverifyRefusal } from ${JSON.stringify(path.join(tree, 'packages/polaris-dossier/dist/reverify.js'))};`, outcome,
  body('Before', lifted.before.ReviewPacketResult), body('Was', lifted.was.ReviewPacketResult), body('Head', lifted.head.ReviewPacketResult),
  body('Neg', lifted.head.ReviewPacketResult.replace('readonly draftRevision: number', 'readonly draftRevision: string'))].join('\n');
fs.mkdirSync(scratch, { recursive: true });
const tsc = path.join(tree, 'node_modules/typescript/bin/tsc');
const checks = [];
for (const [s, t] of [['Before', 'Head'], ['Head', 'Before'], ['Before', 'Was'], ['Was', 'Before'], ['Was', 'Head'], ['Head', 'Was'], ['Neg', 'Head'], ['Head', 'Neg']]) {
  const file = path.join(scratch, `${s}-${t}.ts`);
  fs.writeFileSync(file, `${prelude}\nexport const f = (v: ${s}): ${t} => v;\n`);
  const cfg = path.join(scratch, `${s}-${t}.json`);
  fs.writeFileSync(cfg, JSON.stringify({ compilerOptions: { strict: true, noEmit: true, target: 'es2022', module: 'nodenext', moduleResolution: 'nodenext', types: [] }, files: [file] }));
  const r = spawnSync(process.execPath, [tsc, '-p', cfg], { encoding: 'utf8' });
  checks.push({ assign: `${s} -> ${t}`, exit: r.status, errors: r.stdout.split('\n').filter((l) => l.includes('error TS')).map((l) => l.replace(/^.*?error/, 'error')) });
}
console.log(JSON.stringify({ lifted: Object.fromEntries(Object.entries(lifted).map(([k, v]) => [k, Object.keys(v)])), checks }, null, 1));
