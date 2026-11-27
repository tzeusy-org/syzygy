// Selects the test files a pull request runs, per tier (syzygy-qu5j). Usage:
//   node scripts/select_ci_tests.mjs --base <commit> --out <selection.json>
// The plan comes from ci-selection.ts (what changed, which triggers force a full run, which modules read a changed
// document); the files come from Vitest's own module graph, the one `vitest related` uses. The selection is printed
// before any test runs, so a narrow run is visibly narrow. Merge-group runs never call this.
// On Actions the event must attest the exact checked-out PR merge and its ordered parents. Outside Actions
// the explicit base is enough for a local comparison.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { fullSelection, matchesPullRequestCheckout, parseGitPathList, parseNameStatus, planSelection } =
  await import(join(ROOT, 'ci-selection.ts'));
const { dossierCorpusReaders, DOSSIER_CORPUS_MANIFEST } = await import(join(ROOT, 'ci-reader-inventory.ts'));
const { TIERS, testFiles, filesOfTier } = await import(join(ROOT, 'vitest.tiers.ts'));

function argument(name) {
  const at = process.argv.indexOf(name);
  if (at < 0 || process.argv[at + 1] === undefined) throw new Error(`usage: node scripts/select_ci_tests.mjs --base <commit> --out <file>`);
  return process.argv[at + 1];
}

const base = argument('--base');
const out = argument('--out');
const git = (...args) => execFileSync('git', args, {
  cwd: ROOT, maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
});
const gitText = (...args) => git(...args).toString('utf8');
const utf8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

function changeInputs() {
  let head;
  try {
    head = gitText('rev-parse', '--verify', 'HEAD^{commit}').trim();
  } catch {
    return { head: null, changed: [], fallbackReason: 'Git checkout identity unavailable' };
  }

  const { GITHUB_ACTIONS, GITHUB_EVENT_NAME, GITHUB_EVENT_PATH, GITHUB_SHA } = process.env;
  const hosted = GITHUB_ACTIONS === 'true' ||
    GITHUB_EVENT_NAME !== undefined || GITHUB_EVENT_PATH !== undefined || GITHUB_SHA !== undefined;
  let comparisonBase = base;
  if (hosted) {
    const unbound = { head, changed: [], fallbackReason: 'GitHub pull request checkout could not be verified' };
    if (GITHUB_EVENT_NAME !== 'pull_request' || !GITHUB_EVENT_PATH) return unbound;
    try {
      const request = JSON.parse(utf8.decode(readFileSync(GITHUB_EVENT_PATH)))?.pull_request;
      const checkout = gitText('rev-list', '--parents', '-n', '1', head).trim().split(/\s+/u);
      if (!matchesPullRequestCheckout(base, GITHUB_SHA, checkout, request?.base?.sha, request?.head?.sha)) {
        return unbound;
      }
    } catch {
      return unbound;
    }
  } else {
    try {
      comparisonBase = gitText('rev-parse', '--verify', '--end-of-options', `${base}^{commit}`).trim();
    } catch {
      return { head, changed: [], fallbackReason: 'Git comparison base unavailable' };
    }
  }

  try {
    const changed = parseNameStatus(git('diff', '--name-status', '-z', '--no-ext-diff',
      '-M', '-C', '--find-copies-harder', comparisonBase, head, '--'));
    return { head, changed, fallbackReason: null };
  } catch {
    return { head, changed: [], fallbackReason: 'Git change list could not be read exactly' };
  }
}

function readTrackedModules() {
  try {
    const modules = new Map();
    const paths = parseGitPathList(git('ls-files', '-z', '--', 'apps/*/src/**', 'packages/*/src/**', 'packages/*/test-support/**'));
    for (const path of paths) {
      if (/\.(ts|mts|cts|tsx|js|mjs|cjs)$/u.test(path)) modules.set(path, utf8.decode(readFileSync(join(ROOT, path))));
    }
    return modules;
  } catch {
    return undefined;
  }
}

function readInventory(head, modules) {
  let manifest;
  try {
    const entries = parseGitPathList(git('ls-tree', '-z', '--full-tree', head, '--', DOSSIER_CORPUS_MANIFEST));
    if (entries.length > 0) {
      const entry = /^(?:100644|100755) blob ([0-9a-f]{40})\t(.+)$/u.exec(entries[0]);
      if (entries.length !== 1 || entry?.[2] !== DOSSIER_CORPUS_MANIFEST) {
        throw new Error('unreadable dossier corpus manifest entry');
      }
      manifest = JSON.parse(utf8.decode(git('cat-file', 'blob', entry[1])));
    }
  } catch {
    return { issue: 'Tracked dossier corpus reader manifest could not be read exactly' };
  }
  return dossierCorpusReaders(modules, manifest);
}

const { head, changed, fallbackReason } = changeInputs();
const plan = fallbackReason === null
  ? planSelection(changed, readTrackedModules, (modules) => readInventory(head, modules))
  : fullSelection([fallbackReason]);
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
  head,
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
for (const reason of plan.reasons) console.log(`  full run: ${JSON.stringify(reason)}`);
if (plan.mode === 'selected' && changed.length === 0) console.log('  no changes in the checked range');
for (const { path, tokens, readers } of plan.documents) {
  console.log(`  ${JSON.stringify(path)} ${JSON.stringify(tokens)}: ${readers.length} reader module(s)`);
}
for (const tier of TIERS) console.log(`  ${tier}: ${selected[tier].length} of ${tiers[tier].length}`);
