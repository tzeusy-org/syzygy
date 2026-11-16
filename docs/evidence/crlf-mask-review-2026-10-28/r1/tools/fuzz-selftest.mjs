// Rule 6 over the reviewer fuzz: each mutant rewrites one fragment of the built head module, and the fuzz must exit 1 on it.
// Usage: node fuzz-selftest.mjs <base dist> <head dist> <scratch dir inside the clone's node_modules> <out.json>
import { execFileSync } from 'node:child_process';
import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [baseDist, headDist, scratch, out] = process.argv.slice(2);
const here = dirname(fileURLToPath(import.meta.url));
const BS = '\\';
const LINE_END = 'const LINE_END = /' + BS + 'r' + BS + 'n|' + BS + 'r|' + BS + 'n/g;';
const JOIN = "out.map((line, index) => line + (terminators[index] ?? '')).join('')";
const MUTANTS = [
  { id: 'F1-lf-only', file: 'markdown-code-context.js', old: LINE_END, new: 'const LINE_END = /' + BS + 'n/g;' },
  { id: 'F2-no-bare-cr', file: 'markdown-code-context.js', old: LINE_END, new: 'const LINE_END = /' + BS + 'r?' + BS + 'n/g;' },
  { id: 'F3-crlf-as-two', file: 'markdown-code-context.js', old: LINE_END, new: 'const LINE_END = /' + BS + 'r|' + BS + 'n/g;' },
  { id: 'F4-join-lf', file: 'markdown-code-context.js', old: JOIN, new: "out.join('" + BS + "n')" },
  { id: 'F5-drop-final-terminator', file: 'markdown-code-context.js', old: JOIN, new: "out.map((line, index) => line + (index === out.length - 2 && out[out.length - 1] === '' ? '' : (terminators[index] ?? ''))).join('')" },
  { id: 'F6-u2028-is-a-line-end', file: 'markdown-code-context.js', old: LINE_END, new: 'const LINE_END = /' + BS + 'r' + BS + 'n|' + BS + 'r|' + BS + 'n|' + BS + 'u2028/g;' },
  { id: 'F7-cr-blanked-length-kept', file: 'markdown-code-context.js', old: JOIN, new: "out.map((line, index) => line + (terminators[index] ?? '').replace('" + BS + "r', ' ')).join('')" },
  { id: 'F8-positionOf-counts-cr', file: 'git-object-reader.js', old: 'if (text.charCodeAt(i) === 10) {', new: 'if (text.charCodeAt(i) === 10 || text.charCodeAt(i) === 13) {' },
];
const results = [];
for (const m of MUTANTS) {
  const dir = join(scratch, `mut-${m.id}`);
  rmSync(dir, { recursive: true, force: true });
  cpSync(headDist, dir, { recursive: true });
  const path = join(dir, m.file);
  const src = readFileSync(path, 'utf8');
  const copies = src.split(m.old).length - 1;
  if (copies !== 1) throw new Error(`${m.id}: fragment occurs ${copies} times`);
  writeFileSync(path, src.split(m.old).join(m.new));
  let exit = 0;
  let stdout = '';
  try {
    stdout = execFileSync('node', [join(here, 'fuzz.mjs'), baseDist, dir, join(scratch, `mut-${m.id}.json`), '20000', '544'], { encoding: 'utf8' });
  } catch (error) {
    exit = error.status;
    stdout = error.stdout;
  }
  const counts = JSON.parse(stdout.split('\n')[0]);
  const failed = Object.fromEntries(Object.entries(counts).filter(([k, v]) => k.endsWith('fail') && v > 0));
  results.push({ id: m.id, file: m.file, old: m.old, new: m.new, exit, killed: exit === 1, failedChecks: failed });
  console.log(m.id, exit === 1 ? 'killed' : 'SURVIVED', JSON.stringify(failed));
  rmSync(dir, { recursive: true, force: true });
  rmSync(join(scratch, `mut-${m.id}.json`), { force: true });
}
writeFileSync(out, JSON.stringify({ tool: 'rev-544/tools/fuzz-selftest.mjs', mutants: results.length, killed: results.filter((r) => r.killed).length, results }, null, 1) + '\n');
