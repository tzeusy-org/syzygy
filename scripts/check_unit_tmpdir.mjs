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

async function childRun(command, args, cwd, owner, options) {
  const reports = [];
  let text = '';
  let pending = '';
  let outputOverflow = false;
  let interrupted = null;
  let signalError = null;
  let launchError = null;
  let lifetimeText = '';
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
    // The direct supervisor owns its descendants; it pins their signals with
    // pidfds. If it dies without proof, ownedRun refuses census and cleanup.
    if (child && child.exitCode === null && child.signalCode === null) child.kill(signal);
  };
  const term = () => stop('SIGTERM');
  const interrupt = () => stop('SIGINT');
  process.on('SIGTERM', term); process.on('SIGINT', interrupt);
  let outcome;
  try {
    child = spawn('/usr/bin/python3', [join(dirname(HERE), 'check_unit_tmpdir_child.py'), command, ...args], { cwd, detached: true, env: { ...process.env,
      TMPDIR: owner.path, TMP: owner.path, TEMP: owner.path, TMPPREFIX: owner.path },
    stdio: ['ignore', 'pipe', 'pipe', 'pipe'] });
    child.stdio[3].on('data', (bytes) => { lifetimeText += bytes.toString(); });
    child.stdout.on('data', receive); child.stderr.on('data', receive);
    const proofDone = new Promise((finish) => child.stdio[3].once('close', finish));
    const closed = new Promise((finish) => child.once('close', finish));
    const done = new Promise((finish) => {
      child.once('error', (e) => { launchError = e.code ?? e.message; finish({ code: null, signal: null }); });
      child.once('exit', (code, signal) => finish({ code, signal }));
    });
    options.onSpawn?.(child, owner);
    outcome = await done;
    await proofDone; // Only the supervisor inherits the proof pipe.
    let proof;
    try { proof = JSON.parse(lifetimeText); }
    catch { proof = { code: null, signal: null, signalError: 'missing-writer-lifetime-proof', writers: [] }; }
    const valid = proof.lifetime?.method === 'linux-subreaper-pidfd' && proof.lifetime.complete === true &&
      Array.isArray(proof.writers) && proof.writers.length === 0 && outcome.code === 0 && !outcome.signal && !launchError;
    if (valid) await closed; // All verified writers exited: drain the real reports.
    else { child.stdout.destroy(); child.stderr.destroy(); } // Unknown writers may retain stdout forever.
    return { ...proof, supervisorOutcome: outcome, interrupted: interrupted ?? proof.interrupted,
      signalError: signalError ?? proof.signalError, lifetimeVerified: valid, outputOverflow, reports, text };
  } finally { process.off('SIGTERM', term); process.off('SIGINT', interrupt); }
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
    if (!result.child.lifetimeVerified) { safe = false; result.errors.push('owned-writer-lifetime-unknown'); }
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
      for (const transition of ['unchanged', 'setpgrp', 'setsid']) {
        const ready = join(control.path, `writer-${transition}.json`);
        const release = join(control.path, `release-${transition}`);
        const worker = `import os,time,json,pathlib,sys
root,ready,release=map(pathlib.Path,sys.argv[1:])
${transition === 'unchanged' ? '' : `os.${transition}()`}
ready.write_text(json.dumps({'pid':os.getpid(),'start':pathlib.Path('/proc/self/stat').read_text().rsplit(')',1)[1].split()[19],'uid':os.getuid(),'group':os.getpgrp(),'session':os.getsid(0)}))
deadline=time.monotonic()+10
while not release.exists() and time.monotonic()<deadline: time.sleep(.01)
if release.exists():
 root.mkdir(exist_ok=True)
 (root/'late-writer-leak').write_text('late')
`;
        const r = await fixture(`fs.writeFileSync(join(root,'worker-leak'),'x');const {spawn}=await import('node:child_process');spawn('/usr/bin/python3',['-c',${JSON.stringify(worker)},root,${JSON.stringify(ready)},${JSON.stringify(release)}],{stdio:'ignore'}).unref();while(!fs.existsSync(${JSON.stringify(ready)}))await new Promise(r=>setTimeout(r,10));`);
        assert.equal(r.child.signalError, 'owned-writers-remained');
        assert.equal(r.child.lifetimeVerified, true);
        assert.deepEqual(r.child.writers, []);
        const writer = JSON.parse(fs.readFileSync(ready, 'utf8'));
        assert.equal(fs.existsSync(`/proc/${writer.pid}`), false, `${transition} writer must be reaped before census`);
        assert(r.child.lifetime.signals.some((p) => p.pid === writer.pid && p.start === writer.start && p.uid === writer.uid), 'termination must target the recorded writer identity');
        if (transition === 'setpgrp') { assert.equal(writer.group, writer.pid); assert.notEqual(writer.group, writer.session); }
        if (transition === 'setsid') assert.equal(writer.session, writer.pid);
        leak(r, ['worker-leak']);
        fs.writeFileSync(release, 'go');
        await pause(30);
        assert.equal(fs.existsSync(r.root), false, `${transition} writer must not recreate the root after return`);
      }
      const unknown = await fixture("process.kill(process.ppid,'SIGKILL');");
      assert.equal(unknown.ok, false); assert.equal(unknown.cleanup, false); assert.equal(unknown.census, null);
      assert.equal(unknown.child.lifetimeVerified, false); assert(unknown.errors.includes('owned-writer-lifetime-unknown'));
      assert.equal(unknown.child.supervisorOutcome.signal, 'SIGKILL');
      // This no-fork fixture exits after killing its supervisor. The fixture
      // controller owns recovery, never the driver's refused cleanup proof.
      assert.equal(fs.existsSync(unknown.root), true); fs.rmdirSync(unknown.root);
      const pinning = `import importlib.util,os,pathlib,signal,subprocess
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('supervisor',${JSON.stringify(join(dirname(HERE), 'check_unit_tmpdir_child.py'))})
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
sibling=subprocess.Popen(['/usr/bin/sleep','10'])
try:
 original=m.identity
 for field in ['parent','uid','start']:
  calls=[0]
  def forged(pid):
   calls[0]+=1
   value=original(pid)
   if field!='start' or calls[0]>1: value[field]=-1
   return value
  with patch.object(m,'identity',forged):
   try: m.pin_child(sibling.pid)
   except RuntimeError as e: assert str(e)=='writer-identity-refused'
   else: raise AssertionError(f'{field} identity accepted')
 assert sibling.poll() is None,'refused identity must not signal sibling'
 child=subprocess.Popen(['/usr/bin/sleep','10'])
 fd,record=m.pin_child(child.pid)
 child.terminate();child.wait()
 try:
  try: signal.pidfd_send_signal(fd,signal.SIGKILL)
  except ProcessLookupError: pass
  else: raise AssertionError('exited pidfd accepted signal')
  assert sibling.poll() is None,'stale pidfd must not signal unrelated sibling'
 finally: os.close(fd)
 print('verified identity refusal and stale pidfd sibling survival')
finally:
 sibling.terminate();sibling.wait()
`;
      const pinned = await fixture(`const {execFileSync}=await import('node:child_process');execFileSync('/usr/bin/python3',['-c',${JSON.stringify(pinning)}],{stdio:'pipe'});`);
      assert.equal(pinned.ok, true, 'identity refusal and stale pidfd must preserve the unrelated sibling'); clean(pinned);
    });
    await caseRun('outside sibling and link target survive', async () => {
      const target = join(control.path, 'outside'); fs.mkdirSync(target); fs.writeFileSync(join(target, 'decoy'), 'untouched');
      const r = await fixture(`fs.symlinkSync(${JSON.stringify(target)},join(root,'outside-link'));`); leak(r, ['outside-link']);
      assert.deepEqual(r.census.entries, [{ path: 'outside-link', type: 'link', exempt: false }]); assert.deepEqual(r.census.errors, []);
      assert.equal(fs.readFileSync(join(target, 'decoy'), 'utf8'), 'untouched');
      assert.throws(() => verifyRoot({ path: target, identity: identity(fs.lstatSync(target)), parent: dirname(target) }), /unowned-root/);
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
      parameters++;
      const narrowed = await ownedRun({ mode: 'selftest-cli-refusal', args: [HERE, '--project', 'integration'], quiet: true });
      assert.equal(narrowed.ok, false); assert.equal(narrowed.child.code, 1); assert.match(narrowed.child.text, /usage:/); clean(narrowed);
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
