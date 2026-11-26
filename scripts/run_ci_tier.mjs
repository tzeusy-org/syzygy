// Runs one tier of a pull request's selected tests (syzygy-qu5j). Usage:
//   node scripts/run_ci_tier.mjs <integration|e2e> <selection.json>
// The selection comes from scripts/select_ci_tests.mjs; every named file must be a file of that tier in the current tree.
// It mirrors the full scripts: integration runs the tmpdir guard's selftest first; e2e runs the browser preflight file
// first when it is chosen, then the rest, then the system tests, which always run (they spawn the compiled daemon, a
// graph Vitest's root config does not see). A tier with nothing chosen prints so and passes.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BROWSER_PREFLIGHT = 'apps/three-surface-poc/src/cdp-browser.browser.test.ts';
const [tier, selectionPath] = process.argv.slice(2);
if (!['integration', 'e2e'].includes(tier ?? '') || selectionPath === undefined) {
  console.error('usage: node scripts/run_ci_tier.mjs <integration|e2e> <selection.json>');
  process.exit(2);
}
const { filesOfTier, testFiles } = await import(join(ROOT, 'vitest.tiers.ts'));
const selection = JSON.parse(readFileSync(selectionPath, 'utf8'));
const chosen = selection?.tiers?.[tier];
if (!Array.isArray(chosen)) throw new Error(`selection without the ${tier} tier`);
const population = filesOfTier(testFiles(ROOT), tier);
const strays = chosen.filter((path) => !population.includes(path));
if (strays.length > 0 || new Set(chosen).size !== chosen.length) throw new Error(`selection names files outside the ${tier} tier: ${JSON.stringify(strays)}`);
console.log(`ci-tier ${tier} mode=${selection.mode} selected=${chosen.length} of ${population.length}`);
for (const path of chosen) console.log(`  ${path}`);

const run = (command, args) => {
  console.log(`$ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { cwd: ROOT, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
};
const vitest = (files) => run(process.execPath, [join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', '--project', tier, ...files]);

if (tier === 'integration') {
  run(process.execPath, [join(ROOT, 'scripts/check_unit_tmpdir.mjs'), '--selftest']);
  if (chosen.length > 0) vitest(chosen);
} else {
  if (chosen.includes(BROWSER_PREFLIGHT)) vitest([BROWSER_PREFLIGHT]);
  const rest = chosen.filter((path) => path !== BROWSER_PREFLIGHT);
  if (rest.length > 0) vitest(rest);
  run('npm', ['run', 'test:system']);
}
if (chosen.length === 0) console.log(`ci-tier ${tier}: no test file selected`);
