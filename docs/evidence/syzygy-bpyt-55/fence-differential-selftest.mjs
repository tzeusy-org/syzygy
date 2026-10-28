// Selftest of fence-differential.mjs (verification rule 6: mutate the input and confirm each predicate of the check fails).
// Usage: node fence-differential-selftest.mjs <base dist> <head dist> <fixtures.json> <out.json>
// For each mutant the HEAD dist is copied to a sibling directory of the same package (so `@syzygy/*` still resolves), one compiled
// fragment is replaced (it must occur exactly once), and the differential runs in quick mode against the copy. A mutant is killed
// when the differential exits 1 and the checks it names are among the failing ones. The control (no mutation) must exit 0.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const [baseDist, headDist, fixtures, out] = process.argv.slice(2);
if (out === undefined) throw new Error('usage: fence-differential-selftest.mjs <base dist> <head dist> <fixtures.json> <out.json>');
const sha = (v) => createHash('sha256').update(v).digest('hex');

const CTX = 'markdown-code-context.js';
const EXT = 'project-shape-extraction.js';
const MAN = 'project-shape-manifest.js';
// id, file, old fragment, new fragment, checks that must fail
const MUTANTS = [
  ['K1-opener-indent-4', CTX, 'const FENCE_OPENER = /^ {0,3}(', 'const FENCE_OPENER = /^ {0,4}(', ['R1', 'M1']],
  ['K2-closer-length-strict', CTX, 'return run[0] === char && run.length >= length;', 'return run[0] === char && run.length > length;', ['R1', 'M1']],
  ['K3-span-closes-at-longer-run', CTX, 'else if (runLength === span.length) {', 'else if (runLength >= span.length) {', ['R1', 'M1']],
  ['K4-fence-range-includes-terminator', CTX, 'fenceRanges.push([fence.start, lineStart + line.length]);', "fenceRanges.push([fence.start, lineStart + line.length + (terminators[index] ?? '').length]);", ['R1']],
  ['K5-backtick-info-ignored', CTX, "if (run[0] === '`' && info.includes('`'))", 'if (false)', ['R1', 'M1']],
  ['K6-closer-allows-trailing-tab', CTX, '/^ {0,3}(`{3,}|~{3,}) *$/', '/^ {0,3}(`{3,}|~{3,})[ \\t]*$/', ['R1', 'M1']],
  ['K7-unclosed-fence-range-dropped', CTX, 'fenceRanges.push([fence.start, text.length]);', ';', ['R1']],
  ['K8-open-span-kept-at-fence-opener', CTX, "note('unclosed-inline-span', span.line);\n                span = undefined;\n            }\n            const run", "note('unclosed-inline-span', span.line);\n            }\n            const run", ['R1']],
  ['K9-mask-blanks-cr', CTX, ".replace(/[^\\r\\n]/g, ' ')", ".replace(/[^\\n]/g, ' ')", ['M1']],
  ['K10-mask-ignores-spans', CTX, '[...recognition.fenceRanges, ...recognition.spanRanges]', '[...recognition.fenceRanges]', ['M1']],
  ['K11-is-fenced-excludes-opener-offset', CTX, 'range[0] <= offset;', 'range[0] < offset;', ['O1', 'O4', 'D1']],
  ['K12-extractor-ignores-recognizer', EXT, 'const inside = isFencedAt(recognition, offset);', 'const inside = false;', ['O3', 'O4']],
  ['K13-extractor-offset-drift', EXT, 'offset += raw.length + 1;', 'offset += raw.length;', ['O3', 'O4']],
  ['K14-links-ignore-fences', MAN, 'if (isFencedAt(recognition, start))\n            continue;', 'if (false)\n            continue;', ['O1', 'D1']],
  ['K15-links-keep-spans', MAN, 'if (!stripInlineCode) {', 'if (true) {', ['O1']],
  ['K16-links-blank-spans', MAN, ".replace(/[^\\r\\n]/g, '')", ".replace(/[^\\r\\n]/g, ' ')", ['O1']],
  ['K17-roots-strip-spans', MAN, 'const lines = stripFences(text, false);', 'const lines = stripFences(text, true);', ['O2']],
  ['K18-links-offset-drift', MAN, 'offset += line.length + 1;', 'offset += line.length;', ['O1', 'D1']],
];

const run = (head, tag) => {
  const result = spawnSync(process.execPath, [join(here, 'fence-differential.mjs'), baseDist, head, fixtures, `${out}.${tag}.tmp.json`], { env: { ...process.env, FENCE_DIFF_QUICK: '1' }, encoding: 'utf8', maxBuffer: 1 << 26 });
  let failing = [];
  try {
    failing = JSON.parse(readFileSync(`${out}.${tag}.tmp.json`, 'utf8')).failingChecks;
  } catch {
    failing = ['(no output)'];
  }
  rmSync(`${out}.${tag}.tmp.json`, { force: true });
  return { status: result.status, failing, stderr: result.stderr.slice(0, 200) };
};

const rows = [];
const control = run(headDist, 'control');
rows.push({ id: 'CONTROL', exit: control.status, failingChecks: control.failing, killed: null, ok: control.status === 0 });
for (const [id, file, oldText, newText, expected] of MUTANTS) {
  const copy = `${headDist}-selftest-${id}`;
  rmSync(copy, { recursive: true, force: true });
  cpSync(headDist, copy, { recursive: true });
  const source = readFileSync(join(copy, file), 'utf8');
  const count = source.split(oldText).length - 1;
  if (count !== 1) {
    rows.push({ id, file, occurrences: count, ok: false, note: 'fragment does not occur exactly once' });
    rmSync(copy, { recursive: true, force: true });
    continue;
  }
  writeFileSync(join(copy, file), source.replace(oldText, () => newText));
  const result = run(copy, id);
  const killed = result.status === 1 && expected.every((check) => result.failing.includes(check));
  rows.push({ id, file, old: oldText, new: newText, mutatedModuleSha256: sha(readFileSync(join(copy, file))), expectedFailing: expected, exit: result.status, failingChecks: result.failing, killed, ok: killed });
  rmSync(copy, { recursive: true, force: true });
}
const mutantRows = rows.filter((r) => r.id !== 'CONTROL');
const summary = { tool: 'docs/evidence/syzygy-bpyt-55/fence-differential-selftest.mjs', headDistModuleShas: Object.fromEntries([CTX, EXT, MAN].map((f) => [f, sha(readFileSync(join(headDist, f)))])), mutants: mutantRows.length, killed: mutantRows.filter((r) => r.killed).length, controlExit: control.status, rows };
writeFileSync(out, `${JSON.stringify(summary, null, 1)}\n`);
console.log(JSON.stringify({ mutants: summary.mutants, killed: summary.killed, controlExit: summary.controlExit, survivors: mutantRows.filter((r) => !r.ok).map((r) => ({ id: r.id, failing: r.failingChecks, note: r.note })) }, null, 1));
if (control.status !== 0 || mutantRows.some((r) => !r.ok)) process.exit(1);
