// Run-level resource oracle (syzygy-bpyt.4.17). The default selection cannot be narrowed by CLI arguments.
import * as fs from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const HERE = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(HERE), '..');
const MARKER = 'syzygy-tmpdir-report:';
const owners = new WeakSet();
const pause = (ms) => new Promise((done) => setTimeout(done, ms));
const print = (kind, value) => console.log(`${kind} ${JSON.stringify(value)}`);
const typeOf = (s) => s.isSymbolicLink() ? 'link' : s.isDirectory() ? 'directory' : s.isFile() ? 'file' : s.isFIFO() ? 'fifo' : 'other';
const identity = (s) => `${s.dev}:${s.ino}:${s.uid}`;

function freshRoot() {
  const parent = fs.realpathSync(tmpdir());
  const path = fs.mkdtempSync(join(parent, 'ut-'));
  const owner = { path, identity: identity(fs.lstatSync(path)), parent };
  owners.add(owner);
  verifyRoot(owner);
  assert.deepEqual(fs.readdirSync(path), []);
  return owner;
}

function verifyRoot(owner) {
  if (!owners.has(owner)) throw new Error('unowned-root');
  const s = fs.lstatSync(owner.path);
  if (!s.isDirectory() || s.isSymbolicLink() || identity(s) !== owner.identity ||
      s.uid !== process.getuid() || fs.realpathSync(owner.path) !== owner.path ||
      dirname(owner.path) !== owner.parent) throw new Error('root-identity-refused');
}

function census(owner) {
  verifyRoot(owner);
  const entries = [];
  const errors = [];
  function walk(directory, prefix) {
    let names;
    try { names = fs.readdirSync(directory).sort(); }
    catch (e) { errors.push({ path: prefix || '.', error: e.code ?? e.message }); return; }
    for (const name of names) {
      const path = join(directory, name);
      const rel = prefix ? `${prefix}/${name}` : name;
      try {
        const s = fs.lstatSync(path); // Never follow a leftover link, including a cache-named link.
        const type = typeOf(s);
        const exempt = rel === 'node-compile-cache' && type === 'directory';
        entries.push({ path: rel, type, exempt });
        if (type === 'directory' && !exempt) walk(path, rel);
      } catch (e) { errors.push({ path: rel, error: e.code ?? e.message }); }
    }
  }
  walk(owner.path, '');
  verifyRoot(owner);
  return { entries, leftovers: entries.filter((e) => !e.exempt), errors };
}

// Linux's private session identifies writers even after the launcher exits. No process-name matching or group signalling.
function processIdentity(pid) {
  try {
    const s = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
    const fields = s.slice(s.lastIndexOf(')') + 2).split(' ');
    return { pid, state: fields[0], group: Number(fields[2]), session: Number(fields[3]),
      start: fields[19], uid: fs.statSync(`/proc/${pid}`).uid };
  } catch (e) { if (e.code === 'ENOENT' || e.code === 'ESRCH') return null; throw e; }
}

function writers(pid) {
  const found = [];
  for (const name of fs.readdirSync('/proc')) {
    if (!/^\d+$/.test(name)) continue;
    const p = processIdentity(Number(name));
    if (p?.group === pid && p.session === pid && p.state !== 'Z' && p.state !== 'X') {
      if (p.uid !== process.getuid()) throw new Error('writer-identity-refused');
      found.push(p);
    }
  }
  return found;
}

function stopWriters(pid, signal) {
  for (const p of writers(pid)) {
    const now = processIdentity(p.pid);
    if (now === null) continue;
    if (identityProcess(now) !== identityProcess(p)) throw new Error('writer-identity-changed');
    try { process.kill(p.pid, signal); } catch (e) { if (e.code !== 'ESRCH') throw e; }
  }
}
const identityProcess = (p) => `${p.pid}:${p.start}:${p.group}:${p.session}:${p.uid}`;

async function childRun(command, args, cwd, owner, options) {
  const reports = [];
  let text = '';
  let pending = '';
  let outputOverflow = false;
  let interrupted = null;
  let signalError = null;
  let launchError = null;
  let escalation;
  let child;
  const receive = (bytes) => {
    if (!options.quiet) process.stdout.write(bytes);
    if (text.length < 8_000_000) text += bytes.toString(); else outputOverflow = true;
    pending += bytes.toString();
    const lines = pending.split('\n'); pending = lines.pop();
    if (pending.length > 4_000_000) { pending = ''; outputOverflow = true; }
    for (const line of lines) if (line.startsWith(MARKER)) {
      try { reports.push(JSON.parse(line.slice(MARKER.length))); }
      catch { reports.push({ malformed: true }); }
    }
  };
  const stop = (signal) => {
    interrupted = signal;
    try { if (child?.pid) stopWriters(child.pid, signal); }
    catch (e) { signalError = e.message; }
    escalation ??= setTimeout(() => {
      try { if (child?.pid) stopWriters(child.pid, 'SIGKILL'); }
      catch (e) { signalError = e.message; }
    }, 2000);
  };
  const term = () => stop('SIGTERM');
  const interrupt = () => stop('SIGINT');
  process.on('SIGTERM', term); process.on('SIGINT', interrupt);
  let outcome;
  try {
    child = spawn(command, args, { cwd, detached: true, env: { ...process.env,
      TMPDIR: owner.path, TMP: owner.path, TEMP: owner.path, TMPPREFIX: owner.path },
    stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', receive); child.stderr.on('data', receive);
    const done = new Promise((finish) => {
      child.once('error', (e) => { launchError = e.code ?? e.message; });
      child.once('close', (code, signal) => finish({ code, signal }));
    });
    options.onSpawn?.(child, owner);
    outcome = await done;
    // A successful launcher must not leave a detached worker writing after census.
    let remaining = child.pid ? writers(child.pid) : [];
    if (remaining.length) {
      signalError ??= 'owned-writers-remained';
      stopWriters(child.pid, 'SIGTERM');
      for (let i = 0; i < 100 && remaining.length; i++) { await pause(20); remaining = writers(child.pid); }
      if (remaining.length) {
        stopWriters(child.pid, 'SIGKILL');
        for (let i = 0; i < 100 && remaining.length; i++) { await pause(20); remaining = writers(child.pid); }
      }
    }
    return { ...outcome, launchError, interrupted, signalError, writers: remaining, outputOverflow, reports, text };
  } finally { clearTimeout(escalation); process.off('SIGTERM', term); process.off('SIGINT', interrupt); }
}

function denominator(expected, reports) {
  const problems = [];
  const key = (r) => `${r.project}\0${r.path}`;
  const desired = expected.map(key).sort();
  const report = reports.length === 1 ? reports[0] : null;
  if (!report || !Array.isArray(report.files)) return { problems: ['missing-or-ambiguous-report'], expected, collected: [], executed: [] };
  const collected = report.files.map(key).sort();
  const executed = report.files.filter((f) => f.passed + f.failed > 0).map(key).sort();
  const missing = desired.filter((k) => !collected.includes(k));
  const extra = collected.filter((k) => !desired.includes(k));
  const unexecuted = desired.filter((k) => !executed.includes(k));
  if (!desired.length || new Set(desired).size !== desired.length) problems.push('empty-or-duplicate-expected');
  if (new Set(collected).size !== collected.length || missing.length || extra.length) problems.push('collected-selection-mismatch');
  if (unexecuted.length) problems.push('unexecuted-files');
  if (report.errors?.length) problems.push('runner-errors');
  if (report.files.some((f) => f.failed > 0 || f.state !== 'pass')) problems.push('failed-files');
  if (report.files.some((f) => !['passed', 'failed', 'skipped', 'todo'].every((k) => Number.isSafeInteger(f[k]) && f[k] >= 0))) problems.push('invalid-counts');
  const counts = Object.fromEntries(['passed', 'failed', 'skipped', 'todo'].map((k) => [k, report.files.reduce((n, f) => n + f[k], 0)]));
  if (!(counts.passed + counts.failed > 0)) problems.push('zero-executed-tests');
  return { problems, expected, collected: report.files, executed, missing, extra, unexecuted, counts };
}

async function ownedRun({ command = process.execPath, args, cwd = ROOT, expected, mode, ...options }) {
  const owner = freshRoot();
  print('tmpdir-start', { mode, path: owner.path, identity: owner.identity, initiallyEmpty: true });
  const result = { mode, root: owner.path, identity: owner.identity, child: null, census: null, cleanup: false, errors: [] };
  let safe = true;
  try {
    result.child = await childRun(command, args, cwd, owner, options);
    if (result.child.writers.length) { safe = false; result.errors.push('owned-writers-still-live'); }
  } catch (e) { safe = false; result.errors.push(`child-lifetime-unknown: ${e.message}`); }
  try {
    if (!safe) throw new Error('census-refused-live-or-unknown-writers');
    result.census = census(owner);
    // The observer sees escaped relative names and types before removal, even when the child failed.
    print('tmpdir-census', { mode, root: owner.path, ...result.census });
  } catch (e) { result.errors.push(`census: ${e.code ?? e.message}`); }
  try {
    if (!safe) throw new Error('cleanup-refused-live-or-unknown-writers');
    verifyRoot(owner);
    fs.rmSync(owner.path, { recursive: true }); // rm unlinks symlinks; all verified owned writers have finished.
    try { fs.lstatSync(owner.path); throw new Error('root-remains'); }
    catch (e) { if (e.code !== 'ENOENT') throw e; }
    result.cleanup = true;
    owners.delete(owner);
  } catch (e) { result.errors.push(`cleanup: ${e.code ?? e.message}`); }
  result.denominator = expected === undefined ? null : denominator(expected, result.child?.reports ?? []);
  const child = result.child;
  result.ok = child !== null && child.code === 0 && !child.signal && !child.launchError && !child.interrupted &&
    !child.signalError && !child.outputOverflow && result.errors.length === 0 && result.cleanup &&
    result.census !== null && result.census.leftovers.length === 0 && result.census.errors.length === 0 &&
    (result.denominator === null || result.denominator.problems.length === 0);
  print('tmpdir-result', { ...result, child: child && { ...child, text: undefined, reports: undefined } });
  return result;
}

// Vitest loads this same module as a reporter. Importing it never runs a command or creates a temp directory.
export default class TmpdirReporter {
  onInit(ctx) { this.root = ctx.config.root; }
  onFinished(files, errors) {
    const visit = (tasks, counts, tests, prefix = '') => {
      for (const task of tasks ?? []) {
        if (task.type === 'test') {
          const state = task.result?.state ?? task.mode;
          tests.push({ name: `${prefix}${task.name}`, state });
          if (state === 'pass') counts.passed++;
          else if (state === 'fail') counts.failed++;
          else if (state === 'todo') counts.todo++;
          else if (state === 'skip') counts.skipped++;
        } else visit(task.tasks, counts, tests, `${prefix}${task.name} > `);
      }
    };
    const rows = (files ?? []).map((f) => {
      const counts = { passed: 0, failed: 0, skipped: 0, todo: 0 };
      const tests = [];
      visit(f.tasks, counts, tests);
      return { project: f.projectName ?? '', path: relative(this.root, f.filepath).split(sep).join('/'), state: f.result?.state, ...counts, tests };
    });
    console.log(MARKER + JSON.stringify({ files: rows, errors: (errors ?? []).map((e) => ({ name: e.name, message: e.message })) }));
  }
}

// Explicit operator API for historical/current leak witnesses; it never changes the guarded npm-test selection.
export async function diagnoseVitest({ root, project, files, config }) {
  if (!project || !files?.length) throw new Error('diagnostic-requires-named-project-and-files');
  return ownedRun({ mode: 'operator-diagnostic', cwd: root,
    args: [join(root, 'node_modules/vitest/vitest.mjs'), 'run', '--project', project, ...files,
      ...(config ? ['--config', config] : []), '--reporter=default', `--reporter=${HERE}`],
    expected: files.map((path) => ({ project, path })) });
}

async function fullUnit() {
  const { filesOfTier, testFiles, workspaceDirectories, partitionProblems } = await import(join(ROOT, 'vitest.tiers.ts'));
  const population = testFiles(ROOT);
  const partition = partitionProblems(population);
  if (partition.length) throw new Error(`tier-partition: ${JSON.stringify(partition)}`);
  const expected = filesOfTier(population, 'unit').map((path) => ({ project: 'unit', path }));
  const workspaces = workspaceDirectories(ROOT).map((path) => ({ path, files: expected.filter((r) => r.path.startsWith(`${path}/`)).length }));
  print('unit-selection', { projects: ['unit'], fileCount: expected.length, population: population.length, workspaces, expected });
  const entry = join(ROOT, 'node_modules/vitest/vitest.mjs');
  const preflight = await ownedRun({ mode: 'unit-discovery', args: [entry, 'list', '--filesOnly', '--project', 'unit'] });
  if (!preflight.ok) return false;
  const rows = preflight.child.text.trim().split('\n').filter(Boolean).map((line) => {
    const m = /^\[([^\]]+)\] (.+)$/.exec(line.trim());
    if (!m) throw new Error(`unrecognized-unit-list-row: ${JSON.stringify(line)}`);
    return { project: m[1], path: m[2] };
  });
  assert.deepEqual(rows.map((r) => `${r.project}\0${r.path}`).sort(), expected.map((r) => `${r.project}\0${r.path}`).sort(), 'static/list selection mismatch');
  print('unit-discovered', { projects: [...new Set(rows.map((r) => r.project))], fileCount: rows.length, files: rows });
  return (await ownedRun({ mode: 'full-current-unit', expected,
    args: [entry, 'run', '--project', 'unit', '--allowOnly=false', '--passWithNoTests=false', '--retry=0', '--reporter=default', `--reporter=${HERE}`] })).ok;
}

async function selftest() {
  const control = freshRoot();
  const expected = [{ project: 'fixture', path: 'fixture.test.ts' }];
  const report = { files: [{ ...expected[0], state: 'pass', passed: 1, failed: 0, skipped: 0, todo: 0 }], errors: [] };
  let parameters = 0;
  let cases = 0;
  const caseRun = async (name, fn) => { await fn(); cases++; print('tmpdir-selftest-case', { name, status: 'pass' }); };
  const fixture = async (source = '', options = {}) => {
    parameters++;
    return ownedRun({ mode: 'selftest-fixture', expected, quiet: true, ...options,
      args: ['--input-type=module', '-e', `import * as fs from 'node:fs';import {join} from 'node:path';const root=process.env.TMPDIR;${source}\nconsole.log(${JSON.stringify(MARKER)}+JSON.stringify(${JSON.stringify(options.report ?? report)}));`] });
  };
  const clean = (r) => { assert.equal(r.cleanup, true); assert.equal(fs.existsSync(r.root), false); };
  const leak = (r, names) => { assert.equal(r.ok, false); for (const name of names) assert(r.census.leftovers.some((e) => e.path === name), `missing leftover ${name}`); clean(r); };
  const vitestFixture = async (source) => {
    const directory = fs.mkdtempSync(join(control.path, 'fixture-'));
    const config = join(directory, 'vitest.config.mjs');
    fs.writeFileSync(config, `export default {root:${JSON.stringify(directory)},test:{name:'fixture',include:['fixture.test.ts'],testTimeout:100,hookTimeout:1000,maxWorkers:1}};`);
    fs.writeFileSync(join(directory, 'fixture.test.ts'), `import {it,expect} from ${JSON.stringify(pathToFileURL(join(ROOT,'node_modules/vitest/dist/index.js')).href)};${source}`);
    parameters++;
    return diagnoseVitest({ root: ROOT, project: 'fixture', files: ['fixture.test.ts'], config });
  };
  try {
    await caseRun('empty success', async () => { const r = await fixture(); assert.equal(r.ok, true); clean(r); });
    await caseRun('exact real cache-only success', async () => { const r = await fixture("fs.mkdirSync(join(root,'node-compile-cache'));fs.writeFileSync(join(root,'node-compile-cache','entry'),'cache');"); assert.equal(r.ok, true); clean(r); });
    await caseRun('ordinary nested hidden and escaped leaks', async () => {
      const r = await fixture("fs.mkdirSync(join(root,'nested'));for(const name of ['ordinary','.hidden','line\\nbreak','nested/child'])fs.writeFileSync(join(root,name),'x');");
      leak(r, ['ordinary', '.hidden', 'line\nbreak', 'nested', 'nested/child']);
    });
    await caseRun('cache exact-name prefix type and link distinctions', async () => {
      for (const source of ["fs.writeFileSync(join(root,'node-compile-cache'),'x');", "fs.mkdirSync(join(root,'node-compile-cache-other'));", "fs.symlinkSync('missing',join(root,'node-compile-cache'));", "fs.symlinkSync('missing',join(root,'dangling'));", "const {execFileSync}=await import('node:child_process');execFileSync('/usr/bin/mkfifo',[join(root,'pipe')]);"]) {
        const r = await fixture(source); assert.equal(r.ok, false); assert.equal(r.census.leftovers.length, 1); clean(r);
      }
    });
    await caseRun('assertion and collection failure survive a clean root', async () => {
      const nonzero = await fixture('process.exitCode=1;'); assert.equal(nonzero.ok, false); assert.equal(nonzero.child.code, 1); assert.deepEqual(nonzero.denominator.problems, []); clean(nonzero);
      const assertion = await vitestFixture("it('fails an actual assertion',()=>expect(1).toBe(2));");
      assert.equal(assertion.ok, false); assert.equal(assertion.denominator.counts.failed, 1); assert.match(assertion.child.text, /AssertionError/); clean(assertion);
      const collection = await vitestFixture("import './deliberately-absent-fixture.js';it('unreachable',()=>expect(1).toBe(1));");
      assert.equal(collection.ok, false); assert.notEqual(collection.child.code, 0); assert.match(collection.child.text, /deliberately-absent-fixture/); clean(collection);
    });
    await caseRun('actual Vitest timeout after write still censuses and cleans', async () => {
      const r = await vitestFixture("import {writeFileSync} from 'node:fs';import {join} from 'node:path';it('post-write timeout',async()=>{writeFileSync(join(process.env.TMPDIR,'timeout-leak'),'x');await new Promise(()=>{});});");
      // The fixture root is explicit; a collection failure is never a timeout witness.
      assert.match(r.child.text, /Test timed out/); assert.equal(r.denominator.counts.failed, 1); leak(r, ['timeout-leak']);
    });
    await caseRun('spawn failure and bounded interruption', async () => {
      parameters++;
      const failed = await ownedRun({ mode: 'selftest-spawn', command: join(control.path, 'no-such-executable'), args: [], expected, quiet: true });
      assert.equal(failed.ok, false); assert.equal(failed.child.launchError, 'ENOENT'); clean(failed);
      const interrupted = await fixture("fs.writeFileSync(join(root,'interrupt-leak'),'x');setTimeout(()=>process.kill(process.ppid,'SIGTERM'),10);setInterval(()=>{},1000);");
      assert.equal(interrupted.child.signal, 'SIGTERM'); assert.equal(interrupted.child.interrupted, 'SIGTERM'); leak(interrupted, ['interrupt-leak']);
      const orphan = await fixture("fs.writeFileSync(join(root,'worker-leak'),'x');const {spawn}=await import('node:child_process');spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'}).unref();");
      assert.equal(orphan.child.signalError, 'owned-writers-remained'); assert.deepEqual(orphan.child.writers, []); leak(orphan, ['worker-leak']);
    });
    await caseRun('outside sibling and link target survive', async () => {
      const target = join(control.path, 'outside'); fs.mkdirSync(target); fs.writeFileSync(join(target, 'decoy'), 'untouched');
      const r = await fixture(`fs.symlinkSync(${JSON.stringify(target)},join(root,'outside-link'));`); leak(r, ['outside-link']);
      assert.equal(fs.readFileSync(join(target, 'decoy'), 'utf8'), 'untouched');
      assert.throws(() => verifyRoot({ path: target }), /unowned-root/);
    });
    await caseRun('read identity and cleanup refusal stay failed with named remainders', async () => {
      const r = await fixture("fs.mkdirSync(join(root,'unreadable'),0o000);");
      assert.equal(r.ok, false); assert(r.census.errors.some((e) => e.path === 'unreadable')); assert.equal(r.cleanup, false); assert(r.errors.some((e) => e.startsWith('cleanup:')));
      fs.chmodSync(join(r.root, 'unreadable'), 0o700); fs.rmSync(r.root, { recursive: true });
      const replaced = await fixture("fs.renameSync(root,root+'.moved');fs.symlinkSync(root+'.moved',root);");
      assert.equal(replaced.ok, false); assert.equal(replaced.cleanup, false); assert(replaced.errors.some((e) => e.includes('root-identity-refused')));
      assert.equal(fs.lstatSync(replaced.root).isSymbolicLink(), true); fs.unlinkSync(replaced.root); fs.rmSync(replaced.root+'.moved', { recursive: true });
      const foreign = await fixture("fs.renameSync(root,root+'.moved');fs.mkdirSync(root);");
      assert.equal(foreign.ok, false); assert.equal(foreign.cleanup, false); assert(foreign.errors.some((e) => e.includes('root-identity-refused')));
      assert.equal(fs.existsSync(foreign.root), true); fs.rmdirSync(foreign.root); fs.rmSync(foreign.root+'.moved', { recursive: true });
    });
    await caseRun('sequential concurrent isolation and denominator refusal', async () => {
      const rows = [await fixture(), await fixture(), ...await Promise.all([fixture(), fixture()])];
      assert.equal(new Set(rows.map((r) => r.root)).size, rows.length); for (const r of rows) { assert.equal(r.ok, true); clean(r); }
      for (const wrong of [{ files: [], errors: [] }, { files: [{ ...report.files[0], project: 'wrong' }], errors: [] }, { files: [{ ...report.files[0], path: 'wrong.test.ts' }], errors: [] }, { files: [{ ...report.files[0], passed: 0, skipped: 1 }], errors: [] }]) {
        const r = await fixture('', { report: wrong }); assert.equal(r.ok, false); assert(r.denominator.problems.length); clean(r);
      }
      const missing = await fixture('process.exit(0);'); assert.equal(missing.ok, false); assert(missing.denominator.problems.includes('missing-or-ambiguous-report')); clean(missing);
      const empty = await fixture('', { expected: [] }); assert.equal(empty.ok, false); assert(empty.denominator.problems.includes('empty-or-duplicate-expected')); clean(empty);
    });
    print('tmpdir-selftest', { cases, parameters, status: 'pass' });
  } finally { verifyRoot(control); fs.rmSync(control.path, { recursive: true }); }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    if (process.argv.length === 2) process.exitCode = await fullUnit() ? 0 : 1;
    else if (process.argv.length === 3 && process.argv[2] === '--selftest') await selftest();
    else throw new Error('usage: node scripts/check_unit_tmpdir.mjs [--selftest]; focused runs use Vitest directly');
  } catch (e) { console.error(e); process.exitCode = 1; }
}
