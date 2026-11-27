// Checks a read census against pull-request selection (syzygy-qu5j). Usage:
//   node scripts/check_read_census.mjs <census-dir> [--json <out>]
// The census (vitest.read-census.setup.ts, SYZYGY_READ_CENSUS=<dir>) lists, per test file, the tracked repository paths
// it read in-process. For each such path this asks what ci-selection.ts would plan for a pull request changing only that
// path, resolves the plan through Vitest's module graph exactly as scripts/select_ci_tests.mjs does, and fails when the
// test that read the path would not be selected: a test whose input changed would be skipped on the pull request.
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { parseGitPathList, planSelection } = await import(join(ROOT, 'ci-selection.ts'));
const [dir] = process.argv.slice(2);
if (dir === undefined) throw new Error('usage: node scripts/check_read_census.mjs <census-dir> [--json <out>]');
const jsonAt = process.argv.indexOf('--json');
const jsonOut = jsonAt > 0 ? process.argv[jsonAt + 1] : undefined;

const git = (...args) => execFileSync('git', args, { cwd: ROOT, maxBuffer: 256 * 1024 * 1024 });
const utf8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
const tracked = new Set(parseGitPathList(git('ls-files', '-z')));
const modules = new Map();
for (const path of parseGitPathList(git('ls-files', '-z', '--', 'apps/*/src/**', 'packages/*/src/**', 'packages/*/test-support/**'))) {
  if (/\.(ts|mts|cts|tsx|js|mjs|cjs)$/u.test(path)) modules.set(path, utf8.decode(readFileSync(join(ROOT, path))));
}

const readers = new Map(); // path -> Set(test file)
let files = 0;
for (const name of readdirSync(dir).filter((entry) => entry.endsWith('.jsonl')).sort()) {
  for (const line of readFileSync(join(dir, name), 'utf8').split('\n').filter(Boolean)) {
    const { file, paths } = JSON.parse(line);
    if (typeof file !== 'string' || file === '' || !Array.isArray(paths)) throw new Error(`unreadable census line in ${name}`);
    files += 1;
    for (const path of paths) {
      if (!tracked.has(path) || path === file) continue;
      if (!readers.has(path)) readers.set(path, new Set());
      readers.get(path).add(file);
    }
  }
}
if (files === 0) throw new Error(`no census lines under ${dir}`);
const recorded = [...readers.values()].reduce((sum, set) => sum + set.size, 0);
// A recorder that saw nothing would make every check pass: some test in every tier reads a tracked file.
if (recorded === 0) throw new Error(`census under ${dir} records no read of a tracked file`);

const { createVitest } = await import('vitest/node');
const vitest = await createVitest('test', { watch: false, run: true });
const misses = [];
let full = 0;
try {
  const specifications = await vitest.globTestSpecifications();
  const deps = new Map();
  const wanted = new Set([...readers.values()].flatMap((set) => [...set]));
  for (const spec of specifications) {
    const file = relative(ROOT, spec.moduleId).split(sep).join('/');
    if (!wanted.has(file) || deps.has(file)) continue;
    const found = await vitest.specifications.getTestDependencies(spec);
    deps.set(file, new Set([...found].map((path) => relative(ROOT, path).split(sep).join('/'))));
  }
  for (const [path, tests] of [...readers].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const plan = planSelection([{ status: 'M', path }], () => modules);
    if (plan.mode === 'full') { full += 1; continue; }
    const related = new Set(plan.related);
    for (const test of [...tests].sort()) {
      const graph = deps.get(test);
      if (graph === undefined) throw new Error(`census names a test Vitest does not list: ${test}`);
      if (related.has(test) || [...graph].some((dep) => related.has(dep))) continue;
      misses.push({ path, test });
    }
  }
} finally {
  await vitest.close();
}

const pairs = recorded;
console.log(`read-census files=${files} paths=${readers.size} pairs=${pairs} full-run-paths=${full} misses=${misses.length}`);
for (const { path, test } of misses) console.log(`  miss: ${test} reads ${path}`);
if (jsonOut !== undefined) writeFileSync(jsonOut, `${JSON.stringify({ files, paths: readers.size, pairs, fullRunPaths: full, misses }, null, 2)}\n`);
process.exit(misses.length === 0 ? 0 : 1);
