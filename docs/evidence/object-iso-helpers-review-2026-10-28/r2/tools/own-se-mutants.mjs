// Round-2 reviewer mutants against site-equivalence.mjs's new SM4 self-test cases (R-GP-IMPL-OBJECT-ISO-HELPERS-2).
// Usage: node own-se-mutants.mjs <clean repo, at the reviewed commit> <out.json> <pair base> <pair head>
// Each mutant replaces one fragment (which must occur exactly once) of the committed tool, writes the copy beside the tool so
// `typescript` resolves, runs `--selftest`, then runs the copy on the pair and stores modified / equal / notEqual.
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [repo, out, pairBase, pairHead] = process.argv.slice(2);
const git = (...a) => execFileSync('git', ['-C', repo, ...a]).toString('utf8').trim();
if (git('status', '--porcelain') !== '') throw new Error('repository not clean');
const commit = git('rev-parse', 'HEAD');
const dir = join(repo, 'docs/evidence/syzygy-bpyt-6-3-iso');
const original = readFileSync(join(dir, 'site-equivalence.mjs'), 'utf8');
const sha = (v) => createHash('sha256').update(v).digest('hex');

const ISO_IMPORT = "out = out.replace(/^import \\{ isoOf \\} from '\\.\\/iso-of\\.js';\\n/m, '');";
const ISO_DEF = "  'const isoOf = (instant: number): string => new Date(instant).toISOString();',\n";
const RET = '  return out;\n}';
const MUTANTS = [
  // R2-M1: the isoOf import is never removed (the line deleted outright)
  ['R2-M1-iso-import-not-removed', ISO_IMPORT, ''],
  // R2-M2: the isoOf definition is not censused (dropped from DEFINITIONS)
  ['R2-M2-iso-definition-not-censused', ISO_DEF, ''],
  // R2-M3: both sides erase every isoOf call's argument, so a changed call is invisible
  ['R2-M3-iso-call-arguments-erased', RET, "  out = out.replace(/isoOf\\([^)]*\\)/g, 'isoOf()');\n  return out;\n}"],
  // R2-M4: the isoOf import regex loses its `m` flag, so it matches only when the import is the file's first line
  ['R2-M4-iso-import-first-line-only', ISO_IMPORT, "out = out.replace(/^import \\{ isoOf \\} from '\\.\\/iso-of\\.js';\\n/, '');"],
  // R2-M5: the isoOf import is removed whatever module it comes from
  ['R2-M5-iso-import-any-source', ISO_IMPORT, "out = out.replace(/^import \\{ isoOf \\} from '[^']*';\\n/m, '');"],
];

const rows = [];
for (const [id, old, next] of MUTANTS) {
  if (original.split(old).length !== 2) throw new Error(`${id}: fragment occurs ${original.split(old).length - 1} times`);
  const text = original.replace(old, () => next);
  const file = join(dir, `.${id}.mjs`);
  writeFileSync(file, text);
  const scratch = mkdtempSync(join(tmpdir(), 'r2-se-'));
  try {
    const r = spawnSync('node', [file, '--selftest'], { encoding: 'utf8' });
    const first = `${r.stdout}${r.stderr}`.split('\n').find((l) => /selftest/.test(l)) ?? '';
    const p = spawnSync('node', [file, repo, pairBase, pairHead, join(scratch, 'p.json')], { encoding: 'utf8' });
    let pair;
    try { const j = JSON.parse(readFileSync(join(scratch, 'p.json'), 'utf8')); pair = { modified: j.modified, equal: j.equal, notEqual: j.notEqual.length, exit: p.status }; } catch { pair = { error: `${p.stderr}`.slice(0, 200) }; }
    rows.push({ id, ranAt: commit, toolSha256: sha(original), old, new: next, mutatedSha256: sha(text), selftestExit: r.status, killedBySelftest: r.status !== 0, firstLine: first.trim().slice(0, 220), onThePair: pair });
  } finally { rmSync(file, { force: true }); rmSync(scratch, { recursive: true, force: true }); }
}
writeFileSync(out, `${JSON.stringify(rows, null, 1)}\n`);
for (const r of rows) console.log(r.id, r.killedBySelftest ? 'KILLED' : 'SURVIVED', JSON.stringify(r.onThePair), '|', r.firstLine);
