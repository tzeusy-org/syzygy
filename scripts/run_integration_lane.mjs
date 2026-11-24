// Hosted placement only. `npm run test:integration` remains the full local tier.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const composed = 'packages/polaris-dossier/src/url-run-composed.test.ts';
const scenarios = ['complete', 'delivery-stop', 'stop-resume', 'eligible-stop-resume'];
const lanes = ['core-1', 'core-2', 'core-3', ...scenarios];
const observer = '^bounded restoration observer \\(no native authority fixture\\)';
const nativePattern = scenario => `runs the genuine production pipeline to ${scenario}$`;
const vitest = join(root, 'node_modules/vitest/vitest.mjs');

function exact(actual, expected, label) {
  assert.deepEqual([...actual].sort(), [...expected].sort(), label);
}

function plan(files) {
  const core = files.filter(file => file !== composed).sort();
  assert(core.length >= 3, 'three nonempty core slices required');
  return Object.fromEntries(lanes.map((lane, index) => [lane, index < 3
    ? [{ files: core.slice(Math.floor(index * core.length / 3), Math.floor((index + 1) * core.length / 3)) },
      ...(index === 0 ? [{ files: [composed], pattern: observer }] : [])]
    : [{ files: [composed], pattern: nativePattern(lane) }]]));
}

function workflowLanes(text) {
  const block = /^  integration:\n([\s\S]*?)(?=^  [\w-]+:|(?![\s\S]))/m.exec(text)?.[1];
  assert(block, 'integration job missing');
  assert(!/^\s+(?:include|exclude|continue-on-error):/m.test(block), 'matrix exceptions may not remove required lanes');
  assert(/^      fail-fast: false$/m.test(block), 'all mandatory lanes must run after a peer fails');
  const rows = [...block.matchAll(/^        lane: (\[[^\n]+\])$/gm)];
  assert.equal(rows.length, 1, 'one static integration lane matrix required');
  return JSON.parse(rows[0][1]);
}

function population(files, routes, cases, matrix) {
  exact(matrix, lanes, 'mandatory workflow matrix');
  exact(Object.keys(routes), lanes, 'mandatory routing lanes');
  exact(lanes.slice(0, 3).flatMap(lane => routes[lane].filter(step => !step.pattern).flatMap(step => step.files)),
    files.filter(file => file !== composed), 'core file population exactly once');
  const selectedCases = [];
  for (const lane of lanes) {
    assert.equal(routes[lane].length, lane === 'core-1' ? 2 : 1, `${lane}: command count`);
    const filtered = routes[lane].filter(step => step.pattern);
    assert.equal(filtered.length, lane === 'core-2' || lane === 'core-3' ? 0 : 1, `${lane}: composed selection count`);
    for (const step of filtered) {
      exact(step.files, [composed], `${lane}: composed file`);
      const selected = cases.filter(name => new RegExp(step.pattern).test(name));
      if (lane === 'core-1') assert.equal(selected.length, 3, 'three observer cases');
      else exact(selected, [`composed URL run with actual role processes > runs the genuine production pipeline to ${lane}`], `${lane}: native case`);
      selectedCases.push(...selected);
    }
  }
  exact(selectedCases, cases, 'composed cases exactly once');
}

function command(args, capture = false) {
  const done = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit' });
  assert(!done.error && done.status === 0, `integration command failed (${done.status ?? done.error?.code}): ${args.join(' ')}`);
  return capture ? JSON.parse(done.stdout) : undefined;
}

function discover(step) {
  const args = [vitest, 'list', '--project', 'integration', ...step.files, '--json'];
  if (step.pattern) args.push('--testNamePattern', step.pattern);
  else args.push('--filesOnly');
  const rows = command(args, true);
  assert(rows.every(row => row.projectName === 'integration'), 'discovery must stay in integration');
  return rows.map(row => step.pattern ? row.name : relative(root, row.file));
}

async function checkedPlan() {
  const full = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).scripts['test:integration'];
  assert.equal(full, 'node scripts/check_unit_tmpdir.mjs --selftest && vitest run --project integration', 'canonical full integration command changed');
  const files = discover({ files: [] });
  const { INTEGRATION_TESTS } = await import('../vitest.tiers.ts');
  exact(files, INTEGRATION_TESTS, 'canonical Vitest integration discovery');
  assert.equal(files.filter(file => file === composed).length, 1, 'one composed file required');
  const cases = discover({ files: [composed], pattern: '.*' });
  const routes = plan(files);
  population(files, routes, cases, workflowLanes(readFileSync(join(root, '.github/workflows/node-ci.yml'), 'utf8')));
  return { files, cases, routes };
}

function checkSelection(step, cases) {
  exact(discover(step), step.pattern ? cases.filter(name => new RegExp(step.pattern).test(name)) : step.files,
    'actual Vitest lane selection');
}

function checkReceipts(records, sha) {
  assert(/^[a-f0-9]{40}$/.test(sha), 'receipt subject must be a commit SHA');
  exact(Object.keys(records), lanes.map(lane => `${lane}.json`), 'mandatory success receipts');
  for (const lane of lanes) assert.deepEqual(records[`${lane}.json`], { lane, sha }, `${lane}: success receipt subject`);
}

function selftest() {
  const files = ['a.test.ts', 'b.test.ts', 'c.test.ts', 'd.test.ts', composed];
  const cases = [1, 2, 3].map(id => `bounded restoration observer (no native authority fixture) > observer ${id}`)
    .concat(scenarios.map(scenario => `composed URL run with actual role processes > runs the genuine production pipeline to ${scenario}`));
  const routes = plan(files), matrix = [...lanes], sha = 'a'.repeat(40);
  const records = Object.fromEntries(lanes.map(lane => [`${lane}.json`, { lane, sha }]));
  population(files, routes, cases, matrix);
  checkReceipts(records, sha);
  const mutations = [
    ['omitted file', changed => { changed.routes['core-1'][0].files.pop(); }],
    ['duplicate file', changed => { changed.routes['core-2'][0].files.push(changed.routes['core-1'][0].files[0]); }],
    ['omitted observer', changed => { changed.routes['core-1'].pop(); }],
    ['duplicate observer', changed => { changed.routes['core-2'].push(changed.routes['core-1'][1]); }],
    ['omitted native', changed => { changed.routes.complete = []; }],
    ['duplicate native', changed => { changed.routes['delivery-stop'][0].pattern = nativePattern('complete'); }],
    ['omitted matrix cell', changed => { changed.matrix.pop(); }],
    ['duplicate matrix cell', changed => { changed.matrix.push('complete'); }],
    ['unrouted new composed case', changed => { changed.cases.push('new composed case'); }],
  ];
  for (const [name, mutate] of mutations) {
    const changed = structuredClone({ routes, cases, matrix });
    mutate(changed);
    assert.throws(() => population(files, changed.routes, changed.cases, changed.matrix), undefined, name);
  }
  const missing = { ...records }; delete missing['complete.json'];
  assert.throws(() => checkReceipts(missing, sha), undefined, 'missing success receipt');
  assert.throws(() => checkReceipts({ ...records, 'unexpected.json': {} }, sha), undefined, 'unexpected success receipt');
  assert.throws(() => checkReceipts({ ...records, 'complete.json': { lane: 'complete', sha: 'b'.repeat(40) } }, sha), undefined, 'foreign commit receipt');
  const fixture = `  integration:\n    strategy:\n      fail-fast: false\n      matrix:\n        lane: ${JSON.stringify(lanes)}\n  e2e:\n`;
  exact(workflowLanes(fixture), lanes, 'workflow parser control');
  assert.throws(() => workflowLanes(fixture.replace('      matrix:', '      matrix:\n        exclude: []')), undefined, 'matrix exclusion');
  assert.throws(() => workflowLanes(fixture.replace('fail-fast: false', 'fail-fast: true')), undefined, 'matrix fail-fast');
  console.log(`integration routing selftest: control + ${mutations.length + 5} rejected mutations`);
}

async function main() {
  const [mode, ...args] = process.argv.slice(2);
  if (mode === '--selftest' && args.length === 0) return selftest();
  if (mode === '--receipts' && args.length === 2) {
    const records = Object.fromEntries(readdirSync(args[0]).map(name => [name, JSON.parse(readFileSync(join(args[0], name), 'utf8'))]));
    checkReceipts(records, args[1]);
    return console.log(`integration success receipts: ${lanes.length}/${lanes.length} for ${args[1]}`);
  }
  assert(args.length === 0 && (mode === '--check' || lanes.includes(mode)), 'usage: run_integration_lane.mjs <lane>|--check|--selftest|--receipts <directory> <sha>');
  const { files, cases, routes } = await checkedPlan();
  for (const lane of mode === '--check' ? lanes : [mode]) for (const step of routes[lane]) checkSelection(step, cases);
  console.log(`integration routing: ${files.length} files; ${cases.length} composed cases; core slices ${lanes.slice(0, 3).map(lane => routes[lane][0].files.length).join('+')}; ${lanes.length} lanes`);
  if (mode === '--check') return;
  const sha = process.env.GITHUB_SHA;
  assert(/^[a-f0-9]{40}$/.test(sha ?? ''), 'GITHUB_SHA required for the success receipt');
  if (mode === 'core-1') command(['scripts/check_unit_tmpdir.mjs', '--selftest']);
  for (const step of routes[mode]) command([vitest, 'run', '--project', 'integration', ...step.files,
    ...(step.pattern ? ['--testNamePattern', step.pattern] : [])]);
  mkdirSync(join(root, 'integration-receipts'), { recursive: true });
  writeFileSync(join(root, 'integration-receipts', `${mode}.json`), `${JSON.stringify({ lane: mode, sha })}\n`, { flag: 'wx' });
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
