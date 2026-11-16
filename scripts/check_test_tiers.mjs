// Every workspace test file is in exactly one test tier, and vitest runs it there (syzygy-bpyt.4.3).
//
//   npm run test:tiers   (node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/check_test_tiers.mjs)
//
// Two methods over one denominator, the `*.test.ts` files under each workspace's `src/`:
// 1. a walk of the tree against the lists in vitest.tiers.ts (`partitionProblems`): a file in two lists, a list entry that
//    names no file, an unsorted or repeated list;
// 2. what vitest itself lists (`vitest list --filesOnly`, root config and the system config): each file appears exactly once, under
//    the project named for its tier, and no project lists a file the walk did not find.
// Prints the count per tier and the total, which the unit tests of vitest.tiers.ts also pin. Exit 1 on any disagreement.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { TIERS, E2E_TESTS, partitionProblems, testFiles, tierOf, SYSTEM_TEST_SUFFIX } = await import(join(root, 'vitest.tiers.ts'));

const files = testFiles(root);
const problems = partitionProblems(files);

/** The (project, path) rows of `vitest list --filesOnly` under a config; a row without a project has project ''. */
function listed(...args) {
  const done = spawnSync(process.execPath, [join(root, 'node_modules/vitest/vitest.mjs'), 'list', '--filesOnly', ...args], { cwd: root, encoding: 'utf8' });
  if (done.status !== 0) {
    problems.push(`vitest list ${args.join(' ')} exited ${done.status}: ${(done.stderr || done.stdout).trim().slice(0, 400)}`);
    return [];
  }
  return done.stdout.split('\n').filter((line) => line.trim() !== '').map((line) => {
    const match = /^(?:\[([\w:-]+)\] )?(\S.*)$/.exec(line.trim());
    return { project: match?.[1] ?? '', path: match?.[2] ?? line };
  });
}

const rootRows = problems.length === 0 ? listed() : [];
const systemRows = problems.length === 0 ? listed('--config', 'packages/cap1-system/vitest.config.ts') : [];
const inRoot = files.filter((path) => !path.endsWith(SYSTEM_TEST_SUFFIX));
const inSystem = files.filter((path) => path.endsWith(SYSTEM_TEST_SUFFIX));
if (problems.length === 0) {
  for (const path of inRoot) {
    const rows = rootRows.filter((row) => row.path === path);
    const tier = tierOf(path);
    if (rows.length !== 1 || rows[0].project !== tier) problems.push(`${path}: vitest lists it under [${rows.map((row) => row.project).join(', ')}], the lists say ${tier}`);
  }
  for (const row of rootRows) if (!inRoot.includes(row.path)) problems.push(`vitest lists ${row.path} under [${row.project}], which the tree walk did not find`);
  const systemPaths = systemRows.map((row) => row.path).sort();
  if (JSON.stringify(systemPaths) !== JSON.stringify(inSystem)) problems.push(`the system config lists ${systemPaths.length} files and the tree has ${inSystem.length} ${SYSTEM_TEST_SUFFIX} files`);
}

// Discover the actual npm command's phases, not a second copy of their filters.
// The lifetime file has a fixed cleanup budget and runs without e2e peers.
const e2eSteps = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).scripts['test:e2e'].split(/\s*&&\s*/);
const phaseCommands = e2eSteps.slice(0, 2).map((step) => step.trim().split(/\s+/));
const prefix = 'vitest run --project e2e';
let phaseRows = [];
if (e2eSteps.length !== 3 || e2eSteps[2].trim().split(/\s+/).join(' ') !== 'npm run test:system'
    || phaseCommands.some((args) => args.slice(0, 4).join(' ') !== prefix)) {
  problems.push('test:e2e must run two Vitest e2e phases followed by the system tier');
} else if (problems.length === 0) {
  phaseRows = phaseCommands.map((args) => listed(...args.slice(2)));
  const lifetime = 'apps/three-surface-poc/src/cdp-browser.browser.test.ts';
  if (phaseRows[0].length !== 1 || phaseRows[0][0].path !== lifetime) problems.push('the first e2e phase must contain only the browser lifetime file');
  const staged = phaseRows.flat().map((row) => row.path).sort();
  if (JSON.stringify(staged) !== JSON.stringify([...E2E_TESTS].sort())) problems.push(`staged e2e discovery lists ${staged.length} rows; expected ${E2E_TESTS.length} files exactly once`);
}

const counts = Object.fromEntries(TIERS.map((tier) => [tier, files.filter((path) => tierOf(path) === tier).length]));
console.log(`test tiers: ${TIERS.map((tier) => `${tier} ${counts[tier]}`).join(', ')}; total ${files.length} (of which ${inSystem.length} system tests, e2e, under their own config)`);
console.log(`vitest lists ${rootRows.length} root-config files and ${systemRows.length} system-config files`);
console.log(`e2e phases list ${phaseRows.map((rows) => rows.length).join(' + ')} files; declared e2e population ${E2E_TESTS.length}`);
for (const problem of problems) console.error(`FAIL ${problem}`);
console.log(problems.length === 0 ? 'ok: every test file is in exactly one tier' : `${problems.length} problem(s)`);
process.exit(problems.length === 0 ? 0 : 1);
