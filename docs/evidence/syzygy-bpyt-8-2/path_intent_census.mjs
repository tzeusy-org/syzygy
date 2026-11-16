// syzygy-bpyt.8.2: the census of the two resolvePathIntent copies before unification, and the old-versus-new differential of each
// caller, over one path corpus built on disk.
//   - census: at base, the daemon's own copy (apps/syzygy/src/main.ts) and the state directory's copy
//     (packages/polaris-dossier/src/state-directory.ts) over every path input, compared on every field both return;
//   - shared: the head's one copy against each base copy, on every field each base copy returns;
//   - callers: each caller at base (its own copy) against the same caller at head (the shared copy): the daemon's
//     governedPlaneViolation (lifted by extract_path_intent.py), stateRootViolation and inventory's sessionsRootViolation (the
//     tree's built dist), over (root, path) and (path, clone) pairs;
//   - entries (--entries): the built `syzygy` entry at base and at head, for every daemon pair with root <fixture>/root and every
//     `dossier init` pair with clone <fixture>/root that the base caller refuses, compared on exit, stdout and stderr. A pair the
//     base accepts would start a daemon or reach the consent sources, so it is compared at function level only.
// Nothing reads a repository; the corpus is built here. Usage:
//   node path_intent_census.mjs <base-tree> <base-lifted> <head-tree> <head-lifted> <fixture-dir> <out.json> [--entries]
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

const [baseTree, baseLifted, headTree, headLifted, F, outFile] = process.argv.slice(2, 8).map((arg) => path.resolve(arg));
const entries = process.argv.includes('--entries');
if (fs.existsSync(F)) throw new Error(`fixture directory ${F} must not exist`);

const load = async (dir) => ({
  daemon: await import(path.join(dir, 'daemon-path-intent.ts')),
  state: await import(path.join(dir, 'state-directory.ts')),
});
const base = await load(baseLifted), head = await load(headLifted);
const baseInventory = await import(path.join(baseTree, 'packages/polaris-dossier/dist/inventory.js'));
const headInventory = await import(path.join(headTree, 'packages/polaris-dossier/dist/inventory.js'));
if (typeof base.daemon.resolvePathIntent !== 'function') throw new Error('the base daemon region must hold its own resolvePathIntent');
if (head.daemon.resolvePathIntent !== undefined) throw new Error('the head daemon region must import the shared copy');

// --- The corpus ---------------------------------------------------------------------------------------------------------------
const LONG_OK = 'L'.repeat(255), LONG_BAD = 'L'.repeat(256), DEEP = 'n'.repeat(200), DEEP_LEVELS = 22;
const j = (...parts) => path.join(F, ...parts);
function build() {
  for (const dir of ['plain/dir', 'root/.syzygy/governance', 'root/openspec', 'outside/gov', 'root-gov-out/openspec',
    'root-gov-dangling/openspec', 'root-gov-unread/.syzygy', 'root-gov-loop/openspec', 'noperm/x', 'deep']) fs.mkdirSync(j(dir), { recursive: true });
  fs.writeFileSync(j('plain/file.txt'), 'fixture\n');
  fs.writeFileSync(j('root/README.md'), '# fixture\n');
  execFileSync('mkfifo', [j('plain/fifo')]);
  const links = [
    ['root/.syzygy/out-link', j('outside')], ['root/openspec/rel-out', '../../outside'], ['root-link', j('root')],
    ['root-gov-out/.syzygy', j('outside/gov')], ['root-gov-dangling/.syzygy', j('nowhere/gov')],
    ['root-gov-unread/openspec', j('noperm/x')], ['root-gov-loop/.syzygy', j('root-gov-loop/.syzygy')],
    ['loop-self', j('loop-self')], ['loop-a', j('loop-b')], ['loop-b', j('loop-a')], ['loop-rel-a', 'loop-rel-b'], ['loop-rel-b', './loop-rel-a'],
    ['loopdir-a', j('loopdir-b/sub')], ['loopdir-b', j('loopdir-a/sub')],
    ['dangling', j('nowhere/target')], ['dangling-rel', 'nowhere-rel/target'], ['dangling-chain', j('dangling')],
    ['chain1', j('chain2')], ['chain2', j('plain/dir')], ['chain-rel', 'plain/../chain2'],
    ['sd-in', j('root/.syzygy/x')], ['sd-in-existing', j('root/openspec')], ['sd-in-rel', 'root/.syzygy'], ['sd-in-chain', j('sd-in')],
    ['sd-in-via-root-link', j('root-link/.syzygy/y')], ['to-file', j('plain/file.txt')], ['to-fifo', j('plain/fifo')],
    ['to-slash', '/'], ['up', '..'], ['long-target', j(LONG_BAD)],
  ];
  for (const [at, target] of links) fs.symlinkSync(target, j(at));
  // A path longer than PATH_MAX that exists: built one relative step at a time, so lstat of the whole fails ENAMETOOLONG.
  const back = process.cwd();
  process.chdir(j('deep'));
  for (let level = 0; level < DEEP_LEVELS; level++) { fs.mkdirSync(DEEP); process.chdir(DEEP); }
  process.chdir(back);
  fs.chmodSync(j('noperm'), 0o000);
}
function teardown() {
  fs.chmodSync(j('noperm'), 0o755);
  const back = process.cwd();
  process.chdir(j('deep'));
  for (let level = 0; level < DEEP_LEVELS; level++) process.chdir(DEEP);
  for (let level = 0; level < DEEP_LEVELS; level++) { process.chdir('..'); fs.rmdirSync(DEEP); }
  process.chdir(back);
  fs.rmSync(F, { recursive: true });
}

const NAMES = ['plain/dir', 'plain/file.txt', 'plain/fifo', 'root', 'root/.syzygy', 'root/openspec', 'root/.syzygy/out-link',
  'root/openspec/rel-out', 'outside', 'root-link', 'root-gov-out', 'root-gov-dangling', 'root-gov-unread', 'root-gov-loop', 'noperm',
  'noperm/x', 'loop-self', 'loop-a', 'loop-rel-a', 'loopdir-a', 'dangling', 'dangling-rel', 'dangling-chain', 'chain1', 'chain-rel',
  'sd-in', 'sd-in-existing', 'sd-in-rel', 'sd-in-chain', 'sd-in-via-root-link', 'to-file', 'to-fifo', 'to-slash', 'up', 'long-target',
  'missing', LONG_OK, LONG_BAD];
const SUFFIXES = ['', '/', '/child', '/child/grand', '/./child', '/../sibling', '//child'];
const CLASS_OF = [
  [/^(loop|root-gov-loop)/, 'symlink loop'], [/^noperm|^root-gov-unread/, 'unreadable directory'],
  [/^(dangling|sd-in$|root-gov-dangling)/, 'dangling link'], [/^sd-in|^root-link|^root-gov-out|^root-gov-dangling/, 'link into the governed plane'],
  [/^root\/(\.syzygy\/out-link|openspec\/rel-out)|^root-gov-out/, 'link out of the governed plane'],
  [/^plain\/file\.txt|^plain\/fifo|^to-file|^to-fifo/, 'non-directory'], [/^missing/, 'missing path'], [/^L{255,}|^long-target|^deep/, 'long path'],
];
function classes(name, suffix, form) {
  const found = CLASS_OF.filter(([pattern]) => pattern.test(name)).map(([, label]) => label);
  if (form === 'relative') found.push('relative path');
  if (suffix === '/') found.push('trailing slash');
  if (suffix.includes('..') || name === 'up' || name === 'chain-rel' || name.startsWith('root/openspec/rel-out')) found.push('.. segments');
  return found;
}
const inputs = [];
for (const name of NAMES) for (const suffix of SUFFIXES) inputs.push({ input: j(name) + suffix, classes: classes(name, suffix, 'absolute') });
for (const name of ['plain/dir', 'sd-in', 'loop-a', 'dangling', 'missing', 'noperm/x', 'to-file']) {
  for (const suffix of ['', '/child', '/']) inputs.push({ input: name + suffix, classes: classes(name, suffix, 'relative') });
}
for (const special of ['', '.', './plain/dir', `../${path.basename(F)}/sd-in`, '/', `${F}/plain/dir/../../${path.basename(F)}/root/.syzygy/x`]) {
  inputs.push({ input: special, classes: special.includes('..') ? ['relative path', '.. segments'] : ['relative path'] });
}
inputs.push({ input: j('deep', ...Array(DEEP_LEVELS).fill(DEEP)), classes: ['long path'] });
inputs.push({ input: j('deep', ...Array(DEEP_LEVELS).fill(DEEP), 'child'), classes: ['long path'] });
inputs.push({ input: j(...Array(25).fill('d'.repeat(200))), classes: ['long path', 'missing path'] });
const ROOTS = [j('root'), j('root-link'), j('root') + '/', `${F}/plain/../root`, j('root-gov-out'), j('root-gov-dangling'), j('root-gov-unread'),
  j('root-gov-loop'), j('loop-self/sub'), j('noperm/x/r'), j('missing-root'), j('plain/file.txt')];
const CLONES = [j('root'), j('root-link'), j('plain/dir'), j('plain'), j('loop-self'), j('noperm/x'), j('missing-clone'), 'root', j('root') + '/',
  j('sd-in-existing')];

for (const [name, list] of [['inputs', inputs.map((row) => row.input)], ['roots', ROOTS], ['clones', CLONES]]) {
  if (new Set(list).size !== list.length) throw new Error(`the ${name} must be distinct`);
}

// --- Comparison ---------------------------------------------------------------------------------------------------------------
const answer = (call) => { try { return { value: call() }; } catch (cause) { return { threw: `${cause?.name}: ${cause?.message}` }; } };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const pick = (value, keys) => value.value === undefined ? value : { value: Object.fromEntries(keys.filter((k) => k in value.value).map((k) => [k, value.value[k]])) };
const daemonCopy = (value) => value.value === undefined ? value
  : { value: value.value.resolved ? { resolved: true, realPath: value.value.intendedRealPath } : { resolved: false, reason: value.value.reason, detail: value.value.detail } };
const REASON_OF_DETAIL = (detail) => detail.startsWith('symbolic link cycle revisits ') ? 'symlink-loop' : 'path-unreadable';
const sha = (text) => createHash('sha256').update(text).digest('hex');

build();
const rows = [];
const out = { fixture: F, node: process.version, inputs: inputs.length, roots: ROOTS.length, clones: CLONES.length };
try {
  process.chdir(F);
  // census and shared
  const census = { rows: 0, disagree: [], arms: {}, reasonMatchesDetail: 0, danglingTrue: 0 };
  const shared = { againstDaemon: { rows: 0, differ: [] }, againstState: { rows: 0, differ: [] } };
  const perClass = {};
  for (const { input, classes: tags } of inputs) {
    const a = answer(() => base.daemon.resolvePathIntent(input));
    const b = answer(() => base.state.resolvePathIntent(input));
    const s = answer(() => head.state.resolvePathIntent(input));
    const aCommon = pick(daemonCopy(a), ['resolved', 'realPath', 'detail']);
    const bCommon = pick(b, ['resolved', 'realPath', 'detail']);
    census.rows++;
    if (!same(aCommon, bCommon)) census.disagree.push({ input, daemon: a, state: b });
    const arm = a.threw ? 'threw' : a.value.resolved ? 'resolved' : a.value.reason;
    census.arms[arm] = (census.arms[arm] ?? 0) + 1;
    if (a.value && !a.value.resolved && REASON_OF_DETAIL(a.value.detail) === a.value.reason) census.reasonMatchesDetail++;
    if (a.value?.dangling === true) census.danglingTrue++;
    for (const tag of tags) { perClass[tag] ??= {}; perClass[tag][arm] = (perClass[tag][arm] ?? 0) + 1; }
    shared.againstDaemon.rows++;
    if (!same(daemonCopy(a), pick(s, ['resolved', 'realPath', 'reason', 'detail']))) shared.againstDaemon.differ.push({ input, base: a, head: s });
    shared.againstState.rows++;
    if (!same(bCommon, pick(s, ['resolved', 'realPath', 'detail']))) shared.againstState.differ.push({ input, base: b, head: s });
    rows.push({ kind: 'resolve', input, daemon: a, state: b, shared: s });
  }
  census.classes = perClass;
  out.census = census;
  out.shared = shared;
  // callers
  const callers = {};
  const compare = (name, pairs, oldCall, newCall) => {
    const result = { pairs: 0, differ: [], refusedAtBase: 0, refusals: [] };
    for (const [x, y] of pairs) {
      const before = answer(() => oldCall(x, y)), after = answer(() => newCall(x, y));
      result.pairs++;
      if (!same(before, after)) result.differ.push({ args: [x, y], base: before, head: after });
      if (before.value !== null) { result.refusedAtBase++; result.refusals.push([x, y]); }
      rows.push({ kind: name, args: [x, y], base: before, head: after });
    }
    callers[name] = result;
  };
  const cross = (xs, ys) => xs.flatMap((x) => ys.map((y) => [x, y]));
  const paths = inputs.map((row) => row.input);
  compare('governedPlaneViolation', cross(ROOTS, paths), base.daemon.governedPlaneViolation, head.daemon.governedPlaneViolation);
  compare('stateRootViolation', cross(paths, CLONES), base.state.stateRootViolation, head.state.stateRootViolation);
  compare('sessionsRootViolation', cross(paths, CLONES), baseInventory.sessionsRootViolation, headInventory.sessionsRootViolation);
  // entries
  if (entries) {
    const run = (tree, args) => {
      const done = spawnSync(process.execPath, [path.join(tree, 'apps/syzygy/dist/main.js'), ...args], {
        cwd: F, env: { PATH: '/nonexistent-la-b82/bin', HOME: '/tmp/la-b82/home', TMPDIR: '/tmp/la-b82/g' }, stdio: ['ignore', 'pipe', 'pipe'],
        encoding: 'utf8', timeout: 120_000,
      });
      return { exit: done.status, signal: done.signal, stdout: done.stdout, stderr: done.stderr };
    };
    const config = path.join('/tmp/la-b82/g', 'run.json');
    fs.writeFileSync(config, JSON.stringify({ operator: 'Tzeusy', agentTool: 'claude-code', agentToolVersion: '2.1.0', agentProvider: 'anthropic',
      model: 'claude-opus-5-5', deadline: 'PT2H', agentTurnBudget: 200, maxRepairCycles: 2, maxQuestions: 3, audience: 'a new contributor', operatorIsOwner: true }));
    const entryRows = { daemon: { runs: 0, differ: [] }, init: { runs: 0, differ: [] } };
    for (const [root, stateDir] of callers.governedPlaneViolation.refusals.filter(([root]) => root === j('root'))) {
      const args = ['--root', root, '--state-dir', stateDir, '--port', '0'];
      const before = run(baseTree, args), after = run(headTree, args);
      entryRows.daemon.runs++;
      if (!same(before, after)) entryRows.daemon.differ.push({ args, base: before, head: after });
      rows.push({ kind: 'entry-daemon', args, base: before, head: after });
    }
    for (const [stateRoot, clone] of callers.stateRootViolation.refusals.filter(([, clone]) => clone === j('root'))) {
      const args = ['dossier', 'init', clone, '--url', 'https://github.com/example/fixture', '--config', config, '--state-root', stateRoot];
      const before = run(baseTree, args), after = run(headTree, args);
      entryRows.init.runs++;
      if (!same(before, after)) entryRows.init.differ.push({ args, base: before, head: after });
      rows.push({ kind: 'entry-init', args, base: before, head: after });
    }
    fs.rmSync(config);
    out.entries = entryRows;
  }
  for (const result of Object.values(callers)) delete result.refusals;
  out.callers = callers;
} finally {
  process.chdir('/');
  teardown();
}
const rowText = rows.map((row) => JSON.stringify(row)).join('\n') + '\n';
fs.writeFileSync(outFile.replace(/\.json$/, '.rows.jsonl'), rowText);
out.rows = { file: path.basename(outFile.replace(/\.json$/, '.rows.jsonl')), count: rows.length, sha256: sha(rowText) };
fs.writeFileSync(outFile, `${JSON.stringify(out, null, 1)}\n`);
const summary = { inputs: out.inputs, censusDisagree: out.census.disagree.length, arms: out.census.arms, sharedVsDaemon: out.shared.againstDaemon.differ.length,
  sharedVsState: out.shared.againstState.differ.length, callers: Object.fromEntries(Object.entries(out.callers).map(([k, v]) => [k, `${v.differ.length}/${v.pairs} differ, ${v.refusedAtBase} refused at base`])),
  entries: out.entries && Object.fromEntries(Object.entries(out.entries).map(([k, v]) => [k, `${v.differ.length}/${v.runs} differ`])) };
console.log(JSON.stringify(summary));
