// Runs the differential at the head (with the separator slice) and the differential as it stood at c399eda9 (without it) over
// copies of the head build, each with one mutation, and records which checks fail. A mutant that fails C1 at the head and passes
// the c399eda9 differential is seen by the separator slice alone.
// Usage: node diff-mutants.mjs <base dist> <head dist> <node_modules> <head differential> <c399eda9 differential> <scratch, must not exist> <out.json>
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
const [baseDist, headDist, nodeModules, headDiff, oldDiff, scratch, out] = process.argv.slice(2);
if (existsSync(scratch)) throw new Error(`${scratch} exists`);
const BS = '\\';
const e = (...p) => p.map((x) => BS + x).join('');
const LINE_END = `const LINE_END = /${e('r', 'n')}|${e('r')}|${e('n')}/g;`;
const le = (body) => `const LINE_END = /${body}/g;`;
const [CRLF, CR, LF, LS, PS, NEL, VT, FF] = [e('r', 'n'), e('r'), e('n'), e('u2028'), e('u2029'), e('x85'), e('v'), e('f')];
const MASK = 'markdown-code-context.js';
const READER = 'git-object-reader.js';
const MUTANTS = [
  ['none', null, null, null],
  ['S5-js-set', MASK, LINE_END, le(`${CRLF}|[${CR}${LF}${LS}${PS}]`)],
  ['S6-nel', MASK, LINE_END, le(`${CRLF}|${CR}|${LF}|${NEL}`)],
  ['MU17-u2028', MASK, LINE_END, le(`${CRLF}|${CR}|${LF}|${LS}`)],
  ['RW1-u2029', MASK, LINE_END, le(`${CRLF}|${CR}|${LF}|${PS}`)],
  ['RW3-vt-ff', MASK, LINE_END, le(`${CRLF}|[${CR}${LF}${VT}${FF}]`)],
  ['RW5-closer-separators', MASK, '/^ {0,3}(`{3,}|~{3,}) *$/', `/^ {0,3}(\`{3,}|~{3,})[ ${LS}${PS}${NEL}]*$/`],
  ['RW7-span-reset-at-u2028', MASK, "rendered += span === undefined ? line[cursor] : ' ';", `if (line[cursor] === '${LS}') span = undefined;\n        rendered += span === undefined ? line[cursor] : ' ';`],
  ['RW9-lfcr-is-one-line-end', MASK, LINE_END, le(`${CRLF}|${LF}${CR}|${CR}|${LF}`)],
  ['RW10-positionOf-u2028', READER, 'if (text.charCodeAt(i) === 10) {', 'if (text.charCodeAt(i) === 10 || text.charCodeAt(i) === 0x2028) {'],
];
const run = (tool, dist, outJson) => {
  let exit = 0;
  try {
    execFileSync('node', [tool, baseDist, dist, outJson], { stdio: ['ignore', 'ignore', 'ignore'], maxBuffer: 1 << 28, env: { ...process.env, EVIDENCE_DIR: dirname(headDiff) } });
  } catch (error) {
    exit = error.status ?? -1;
  }
  const o = existsSync(outJson) ? JSON.parse(readFileSync(outJson, 'utf8')) : null;
  return o === null ? { exit, output: 'none' } : { exit, failingChecks: o.failingChecks, failureCount: o.failureCount, c1: o.checks.C1_lfUnchanged.failures, first50ByCorpus: o.failures.reduce((m, f) => ({ ...m, [`${f.check}:${f.corpus}`]: (m[`${f.check}:${f.corpus}`] ?? 0) + 1 }), {}) };
};
const results = [];
mkdirSync(scratch, { recursive: true });
for (const [id, file, oldText, newText] of MUTANTS) {
  const root = join(scratch, id);
  const dist = join(root, 'packages', 'three-surface-poc-core', 'dist');
  mkdirSync(dirname(dist), { recursive: true });
  cpSync(headDist, dist, { recursive: true });
  symlinkSync(nodeModules, join(root, 'node_modules'));
  if (file !== null) {
    const p = join(dist, file);
    const src = readFileSync(p, 'utf8');
    if (src.split(oldText).length !== 2) throw new Error(`${id}: fragment not once`);
    writeFileSync(p, src.replace(oldText, () => newText));
  }
  const row = { id, file, old: oldText, new: newText, head: run(headDiff, dist, join(root, 'head.json')), withoutSlice: run(oldDiff, dist, join(root, 'old.json')) };
  results.push(row);
  console.log(JSON.stringify({ id, head: row.head, withoutSlice: row.withoutSlice }));
}
rmSync(scratch, { recursive: true, force: true });
writeFileSync(out, `${JSON.stringify({ tool: 'rev-544-r2/tools/diff-mutants.mjs', results }, null, 1)}\n`);
