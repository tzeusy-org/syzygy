// V-CRLF-MASK-1 rule-6 mutants over the prototype mask. Usage:
//   node mutants.mjs <clone-root> <today-source-file> <out.json>
// Each mutant rewrites every copy of one fragment of the prototype source
// (asserting at least one), runs crlf-pin.test.ts, records which pins fail,
// and restores the prototype bytes.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const [root, todayFile, out] = process.argv.slice(2);
const target = `${root}/packages/three-surface-poc-core/src/markdown-code-context.ts`;
const proto = readFileSync(target, 'utf8');
const today = readFileSync(todayFile, 'utf8');

const MUTANTS = [
  { id: 'TODAY', whole: today },
  { id: 'MU1-lf-only', old: 'const LINE_END = /\\r\\n|\\r|\\n/g;', new: 'const LINE_END = /\\n/g;' },
  { id: 'MU2-crlf-only', old: 'const LINE_END = /\\r\\n|\\r|\\n/g;', new: 'const LINE_END = /\\r?\\n/g;' },
  { id: 'MU3-crlf-as-two', old: 'const LINE_END = /\\r\\n|\\r|\\n/g;', new: 'const LINE_END = /\\r|\\n/g;' },
  { id: 'MU4-no-bare-cr', old: 'const LINE_END = /\\r\\n|\\r|\\n/g;', new: 'const LINE_END = /\\r\\n|\\n/g;' },
  { id: 'MU5-join-lf', old: "out.map((line, i) => line + (terms[i] ?? '')).join('')", new: "out.join('\\n')" },
  { id: 'MU6-cr-to-lf', old: "out.map((line, i) => line + (terms[i] ?? '')).join('')", new: "out.map((line, i) => line + (terms[i] === '\\r' ? '\\n' : (terms[i] ?? ''))).join('')" },
];

const results = [];
try {
  for (const m of MUTANTS) {
    let mutated;
    if (m.whole !== undefined) mutated = m.whole;
    else {
      const copies = proto.split(m.old).length - 1;
      if (copies < 1) throw new Error(`${m.id}: fragment not found`);
      mutated = proto.split(m.old).join(m.new);
    }
    writeFileSync(target, mutated);
    let report;
    try {
      report = execFileSync('npx', ['vitest', 'run', 'packages/three-surface-poc-core/src/crlf-pin.test.ts', '--reporter=json'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    } catch (error) {
      report = error.stdout;
    }
    const json = JSON.parse(report.slice(report.indexOf('{')));
    const tests = json.testResults.flatMap((f) => f.assertionResults);
    const failed = tests.filter((t) => t.status !== 'passed').map((t) => t.title.split(' ')[0]);
    results.push({ id: m.id, old: m.old ?? '(whole file: 8ff50172 markdown-code-context.ts)', new: m.new ?? null, total: tests.length, failed, outcome: failed.length > 0 ? 'killed' : 'survived' });
    console.log(m.id, failed.length > 0 ? 'killed' : 'SURVIVED', failed.join(' '));
  }
} finally {
  writeFileSync(target, proto);
}
writeFileSync(out, JSON.stringify(results, null, 1));
