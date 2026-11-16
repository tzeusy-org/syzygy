// Rule 6 for site-equivalence.mjs (syzygy-bpyt.6.3 stack 4; R-GP-IMPL-OBJECT-ISO-HELPERS-1 round 1, finding F1): each guard the tool relies on
// is removed on its own, and the tool's own `--selftest` must then fail.
// Usage: node site-equivalence-mutants.mjs <git repo, clean> <out.json> [<base commit> <head commit>]
// With a base and a head commit every row is also run on that pair (the reviewed pair): `onThePair` stores the modified, equal and
// not-equal counts the mutated tool then reports, so a mutant the self-test cannot see can still be seen to change the real result.
//
// For every mutant the tool's committed text is read, one fragment (`old`, which must occur exactly once) is replaced by `new`, the result is
// written beside the tool (so `typescript` resolves from the same place), `node <it> --selftest` runs, and the copy is deleted. A mutant is
// KILLED when that run exits non-zero. Controls: the unmutated text, and the text with a harmless trailing comment, must both pass. Each row
// stores the old and new fragment, the commit the repository was at, and the sha256 of the mutated text, so it can be re-run by hand.
//   SM1  the identifier-only rename guard is removed: a string that names an old helper is renamed and compares equal
//   SM2  the blank-line filter is restored: a blank line removed inside a template literal is invisible
//   SM3  a censused definition is removed without its own line end: the base side keeps a blank line the head side lacks
//   SM4  the isoOf import line is removed without its own line end: likewise
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const [repo, out, pairBase, pairHead] = process.argv.slice(2);
if (out === undefined) throw new Error('usage: site-equivalence-mutants.mjs <git repo> <out.json> [<base> <head>]');
const git = (...args) => execFileSync('git', ['-C', repo, ...args]).toString('utf8').trim();
if (git('status', '--porcelain') !== '') throw new Error('the repository is not clean');
const commit = git('rev-parse', 'HEAD');
const toolPath = join(here, 'site-equivalence.mjs');
const original = readFileSync(toolPath, 'utf8');
const sha = (v) => createHash('sha256').update(v).digest('hex');

// Fragments are plain strings (no template literals), so a backslash or a ${ in them is the character itself.
const GUARD = "    if ((out.match(/\\bisObj(?:ect)?\\b/g) ?? []).length !== identifiers) return 'RENAME-GUARD: an old name occurs outside an identifier';\n";
const NO_FILTER = "  // no blank-line filter: the TypeScript emitter writes no blank line between statements, so a blank line left here is inside a literal\n  return out;\n";
const FILTER = "  return out.split('\\n').filter((line) => line.trim() !== '').join('\\n');\n";
const DEFINITION_REMOVAL = "for (const d of DEFINITIONS) out = out.split(`${d}\\n`).join('');";
const DEFINITION_REMOVAL_NO_EOL = "for (const d of DEFINITIONS) out = out.split(d).join('');";
const ISO_IMPORT = "out = out.replace(/^import \\{ isoOf \\} from '\\.\\/iso-of\\.js';\\n/m, '');";
const ISO_IMPORT_NO_EOL = "out = out.replace(/^import \\{ isoOf \\} from '\\.\\/iso-of\\.js';/m, '');";

const MUTANTS = [
  ['SM1-rename-guard-removed', GUARD, ''],
  ['SM2-blank-line-filter-restored', NO_FILTER, FILTER],
  ['SM3-definition-removed-without-its-line-end', DEFINITION_REMOVAL, DEFINITION_REMOVAL_NO_EOL],
  ['SM4-iso-import-removed-without-its-line-end', ISO_IMPORT, ISO_IMPORT_NO_EOL],
];

const run = (id, text) => {
  const file = join(here, `.${id}.mjs`);
  writeFileSync(file, text);
  const scratch = pairBase === undefined ? null : mkdtempSync(join(tmpdir(), 'se-mut-'));
  try {
    const r = spawnSync('node', [file, '--selftest'], { encoding: 'utf8' });
    const line = `${r.stdout}${r.stderr}`.split('\n').find((l) => /selftest|Error/.test(l)) ?? '';
    const result = { exit: r.status, firstLine: line.trim().slice(0, 200) };
    if (scratch !== null) {
      const pairOut = join(scratch, 'pair.json');
      const p = spawnSync('node', [file, repo, pairBase, pairHead, pairOut], { encoding: 'utf8' });
      let counts = null;
      try {
        const j = JSON.parse(readFileSync(pairOut, 'utf8'));
        counts = { modified: j.modified, equal: j.equal, notEqual: j.notEqual.length, exit: p.status };
      } catch {
        counts = { error: `${p.stdout}${p.stderr}`.slice(0, 200), exit: p.status };
      }
      result.onThePair = counts;
    }
    return result;
  } finally {
    rmSync(file, { force: true });
    if (scratch !== null) rmSync(scratch, { recursive: true, force: true });
  }
};

const rows = [];
const control = (id, text) => {
  const result = run(id, text);
  rows.push({ id, ranAt: commit, file: 'docs/evidence/syzygy-bpyt-6-3-iso/site-equivalence.mjs', toolSha256: sha(original), mutatedSha256: sha(text), ...result, passedClean: result.exit === 0 });
};
control('C0-unmutated', original);
control('N0-trailing-comment', `${original}// harmless\n`);
for (const [id, old, next] of MUTANTS) {
  if (original.split(old).length !== 2) throw new Error(`${id}: the old fragment occurs ${original.split(old).length - 1} times, not once`);
  const text = original.replace(old, () => next);
  const result = run(id, text);
  rows.push({ id, ranAt: commit, file: 'docs/evidence/syzygy-bpyt-6-3-iso/site-equivalence.mjs', toolSha256: sha(original), old, new: next, mutatedSha256: sha(text), ...result, killed: result.exit !== 0 });
}
const mutants = rows.filter((r) => 'killed' in r);
const summary = { ranAt: commit, pair: pairBase === undefined ? null : { base: pairBase, head: pairHead }, mutants: mutants.length, killed: mutants.filter((r) => r.killed).length, killedBySelftest: mutants.filter((r) => r.killed).map((r) => r.id), survivedSelftest: mutants.filter((r) => !r.killed).map((r) => r.id), controlsClean: rows.filter((r) => 'passedClean' in r).every((r) => r.passedClean) };
writeFileSync(out, `${JSON.stringify({ summary, rows }, null, 1)}\n`);
console.log(JSON.stringify(summary));
for (const r of rows) console.log(r.id, 'killed' in r ? (r.killed ? 'KILLED' : 'SURVIVED') : (r.passedClean ? 'clean' : 'NOT CLEAN'), `exit ${r.exit}`, r.firstLine);
// Exit 0 only when every mutant is killed by the self-test. A survivor is reported, never hidden: the record explains it by `onThePair`.
process.exitCode = summary.killed === summary.mutants && summary.controlsClean ? 0 : 1;
