// Selects the test files a pull request runs, per tier (syzygy-qu5j). Usage:
//   node scripts/select_ci_tests.mjs --base <commit> --out <selection.json>
// The plan comes from ci-selection.ts (what changed, which triggers force a full run, which modules read a changed
// document); the files come from Vitest's own module graph, the one `vitest related` uses. The selection is printed
// before any test runs, so a narrow run is visibly narrow. Merge-group runs never call this.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { planSelection, parseNameStatus } = await import(join(ROOT, 'ci-selection.ts'));
const { TIERS, testFiles, filesOfTier } = await import(join(ROOT, 'vitest.tiers.ts'));

function argument(name) {
  const at = process.argv.indexOf(name);
  if (at < 0 || process.argv[at + 1] === undefined) throw new Error(`usage: node scripts/select_ci_tests.mjs --base <commit> --out <file>`);
  return process.argv[at + 1];
}

const base = argument('--base');
const out = argument('--out');
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
const changed = parseNameStatus(git('diff', '--name-status', '-M', base, 'HEAD'));
const modules = new Map();
for (const path of git('ls-files', '-z', '--', 'apps/*/src/**', 'packages/*/src/**', 'packages/*/test-support/**').split('\0')) {
  if (/\.(ts|mts|cts|tsx|js|mjs|cjs)$/u.test(path)) modules.set(path, readFileSync(join(ROOT, path), 'utf8'));
}
const plan = planSelection(changed, modules);
const population = testFiles(ROOT);
const tiers = Object.fromEntries(TIERS.map((tier) => [tier, filesOfTier(population, tier)]));

let selected;
if (plan.mode === 'full') selected = tiers;
else if (plan.related.length === 0) selected = Object.fromEntries(TIERS.map((tier) => [tier, []]));
else {
  const { createVitest } = await import('vitest/node');
  const vitest = await createVitest('test', { watch: false, run: true, related: plan.related.map((path) => join(ROOT, path)) });
  try {
    const specifications = await vitest.getRelevantTestSpecifications();
    const files = new Set(specifications.map((spec) => relative(ROOT, spec.moduleId).split(sep).join('/')));
    selected = Object.fromEntries(TIERS.map((tier) => [tier, tiers[tier].filter((path) => files.has(path))]));
    const placed = new Set(TIERS.flatMap((tier) => selected[tier]));
    const stray = [...files].filter((path) => !placed.has(path));
    if (stray.length > 0) throw new Error(`selected files in no tier: ${JSON.stringify(stray)}`);
  } finally {
    await vitest.close();
  }
}

const selection = {
  base,
  head: git('rev-parse', 'HEAD').trim(),
  mode: plan.mode,
  reasons: plan.reasons,
  changed,
  code: plan.code,
  documents: plan.documents,
  counts: Object.fromEntries(TIERS.map((tier) => [tier, { selected: selected[tier].length, population: tiers[tier].length }])),
  tiers: selected,
};
writeFileSync(out, `${JSON.stringify(selection, null, 2)}\n`);
console.log(`ci-selection mode=${plan.mode} changed=${changed.length} related=${plan.related.length}`);
for (const reason of plan.reasons) console.log(`  full run: ${reason}`);
for (const { path, tokens, readers } of plan.documents) console.log(`  ${path} [${tokens.join(', ')}]: ${readers.length} reader module(s)`);
for (const tier of TIERS) console.log(`  ${tier}: ${selected[tier].length} of ${tiers[tier].length}`);
