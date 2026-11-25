import * as fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import { build } from 'esbuild';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { sha256 } from '@syzygy/support';
import { createNativePolicyGitScope, type PolicyGitProgram } from './policy-git-native.js';
import type { PolicyGitScope, PolicyGitExecutor, PolicyGitOptions } from './policy-git.js';
import { committedUrlPoliciesCurrent, committedUrlPoliciesCurrentAsync, DOSSIER_POLICY_PATH, DOSSIER_URL_ORIGIN_POLICY_PATH, type PolicyBinding } from './policy-snapshot.js';
import { URL_PARENT_DEFAULT_REF, URL_PARENT_TAG, type UrlParentAdoption } from './url-parent-adoption.js';
const imageClosures = vi.hoisted(() => ({ observe: undefined as ((fd: number) => void) | undefined,
  failAfterClose: undefined as ((fd: number) => boolean) | undefined }));
vi.mock('node:fs', async original => {
  const actual = await original<typeof import('node:fs')>();
  return { ...actual, closeSync(fd: number) {
    imageClosures.observe?.(fd);
    const fail = imageClosures.failAfterClose?.(fd) === true;
    actual.closeSync(fd);
    if (fail) throw new Error('owned first image close failed');
  } };
});
const exec = promisify(execFile), environment = { PATH: '/usr/bin:/bin', LANG: 'C', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_OPTIONAL_LOCKS: '0', GIT_NO_LAZY_FETCH: '1' };
const source = fileURLToPath(new URL('.', import.meta.url));
const arguments_ = ['--no-replace-objects', '-C', source, 'cat-file', '--batch-command'];
const scopes: PolicyGitScope[] = [];
let program: PolicyGitProgram;
let preparation: { host: PolicyGitProgram; git: PolicyGitProgram; witness: string };
const open = (): PolicyGitScope => { const scope = createNativePolicyGitScope(program); scopes.push(scope); return scope; };
const options = (mode: string, input?: Buffer) => ({ env: { ...environment, POLICY_FIXTURE_MODE: mode }, maxBuffer: 1024,
  timeout: 1000, ...(input === undefined ? {} : { input }) });
afterEach(async () => { imageClosures.observe = undefined; imageClosures.failAfterClose = undefined; for (const scope of scopes.splice(0)) await scope.close(); });
beforeAll(async () => {
  const root = tempDir('policy-native-');
  // Host SGID is not a private scratch permission. Tighten this newly owned
  // fixture directory only, never a project/shared directory.
  fs.chmodSync(root, 0o700);
  const include = path.resolve(path.dirname(process.execPath), '../include/node');
  const compile = async (name: string, input: string, extra: string[] = []) => {
    const file = path.join(root, name);
    await exec('/usr/bin/cc', ['-std=c11', '-Wall', '-Wextra', '-Werror', '-O2', ...extra, path.join(source, input), '-o', file],
      { env: environment, timeout: 10_000, killSignal: 'SIGKILL', maxBuffer: 65_536 });
    return { file, sha256: sha256(fs.readFileSync(file)) };
  };
  program = { addon: await compile('policy.node', 'policy-git.c', ['-shared', '-fPIC', '-pthread', '-I', include]),
    supervisor: await compile('supervisor', 'policy-git-supervisor.c'), git: await compile('git', 'fixtures/policy-git-fixture.c') };
  const wrapper = path.join(source, 'fixtures/policy-git-setup-delay.c'), witness = path.join(root, 'setup-started');
  const witnessFlag = `-DPOLICY_SETUP_WITNESS=${JSON.stringify(witness)}`;
  preparation = { witness,
    host: { ...program,
      addon: await compile('delay-host.node', 'policy-git.c', ['-shared', '-fPIC', '-pthread', '-I', include,
        wrapper, '-DPOLICY_DELAY_HOST', '-Wl,--wrap=posix_spawn_file_actions_addclosefrom_np']),
      supervisor: await compile('witness-supervisor', 'policy-git-supervisor.c', [wrapper, witnessFlag]) },
    git: { ...program, supervisor: await compile('delay-git-supervisor', 'policy-git-supervisor.c',
      [wrapper, witnessFlag, '-DPOLICY_DELAY_GIT', '-Wl,--wrap=pipe2', '-Wl,--wrap=fork']) } };
});
describe('native policy Git ownership and transport', () => {
  it('preserves complete large stdin and independently permits each output stream at maxBuffer', async () => {
    for (const async of [false, true]) {
      const scope = open(), input = Buffer.alloc(131_073, 0x51);
      const request = { ...options('echo', input), maxBuffer: input.length };
      const output = async ? await scope.runAsync(arguments_, request) : scope.runSync(arguments_, request);
      expect(output.equals(input)).toBe(true);
      const separate = async ? await scope.runAsync(arguments_, options('separate')) : scope.runSync(arguments_, options('separate'));
      expect(separate).toEqual(Buffer.alloc(1024, 'o'));
      expect(scope.childCpuMicroseconds()).toBeGreaterThan(0);
    }
  });
  it('matches independent argv/environment/stdin expectations and detects each changed field', async () => {
    for (const async of [false, true]) {
      const scope = open(), own = { ...options('oracle', Buffer.from('exact own request')),
        env: { ...options('oracle').env, POLICY_FIXTURE_ROOT: source } };
      const call = (args: readonly string[], request: typeof own) => async ? scope.runAsync(args, request) : Promise.resolve().then(() => scope.runSync(args, request));
      expect(await call(arguments_, own)).toEqual(Buffer.from('oracle'));
      await expect(call([...arguments_.slice(0, 3), 'cat-file', '-t', 'a'.repeat(40)], own)).rejects.toThrow('policy-git-failed');
      await expect(call(arguments_, { ...own, env: { ...own.env, LANG: 'changed' } })).rejects.toThrow('policy-git-failed');
      await expect(call(arguments_, { ...own, input: Buffer.from('exact own reques') })).rejects.toThrow('policy-git-failed');
      expect(scope.healthy()).toBe(true);
    }
  });
  it('charges failed exits, signals and either stream overflow without poisoning complete usage', async () => {
    for (const mode of ['exit', 'signal', 'overflow', 'stderr-overflow']) {
      const scope = open();
      await expect(scope.runAsync(arguments_, options(mode))).rejects.toThrow('policy-git-failed');
      expect(scope.childCpuMicroseconds()).toBeGreaterThan(0);
      expect(scope.healthy()).toBe(true);
    }
  });
  it('restores child signals and closes unrelated inherited descriptors', async () => {
    const scope = open();
    expect(await scope.runAsync(arguments_, options('identity'))).toEqual(Buffer.alloc(0));
  });
  it('charges the complete waited nested-child CPU population once', async () => {
    const scope = open();
    let completed = false;
    const first = scope.runAsync(arguments_, options('nested-cpu')).then(output => { completed = true; return output; });
    const second = scope.runAsync(arguments_, options('nested-cpu'));
    expect(completed).toBe(false);
    scope.cpuClock();
    expect(completed).toBe(false); // native completion, not JS callback progress
    const charged = scope.childCpuMicroseconds();
    expect(charged).toBeGreaterThanOrEqual(120_000);
    scope.cpuClock(); expect(scope.childCpuMicroseconds()).toBe(charged);
    await Promise.all([first, second]);
    expect(scope.childCpuMicroseconds()).toBe(charged);
    expect(charged).toBeLessThan(1_000_000);
  });
  it('holds native images until the outer receipt is accounted and removes its join before descriptor release', async () => {
    const scope = open(), paths = new Set([program.addon.file, program.supervisor.file, program.git.file]);
    const pending = scope.runAsync(arguments_, options('nested-cpu'));
    const releases: { charged: number; joined: boolean }[] = [];
    imageClosures.observe = fd => {
      if (!paths.has(fs.readlinkSync(`/proc/self/fd/${fd}`))) return;
      const charged = scope.childCpuMicroseconds();
      let joined = false;
      try { scope.cpuClock(); joined = true; } catch { /* Assert the observed ordering outside cleanup. */ }
      releases.push({ charged, joined });
    };
    await expect(pending).resolves.toEqual(Buffer.alloc(0));
    imageClosures.observe = undefined;
    expect(releases).toHaveLength(3);
    expect(releases.every(value => value.charged >= 60_000 && value.joined)).toBe(true);
    const charged = scope.childCpuMicroseconds();
    expect(await scope.close()).toBe(true);
    expect(scope.childCpuMicroseconds()).toBe(charged);
    expect(releases).toHaveLength(3);
  });
  it('samples timeout/control while stderr stays busy and reaps the complete writer population', async () => {
    for (const async of [false, true]) {
      const scope = open(), pidFile = path.join(tempDir('policy-flood-'), 'pid');
      const began = performance.now();
      const request = { ...options('continuous-stderr'), maxBuffer: 4_294_967_296, timeout: 150,
        env: { ...options('continuous-stderr').env, POLICY_FIXTURE_PID: pidFile } };
      const pending = async ? scope.runAsync(arguments_, request) : Promise.resolve().then(() => scope.runSync(arguments_, request));
      await expect(pending).rejects.toThrow('policy-git-failed');
      expect(performance.now() - began).toBeLessThan(2000);
      const pid = Number(fs.readFileSync(pidFile, 'ascii').trim());
      expect(Number.isSafeInteger(pid)).toBe(true);
      expect(() => process.kill(pid, 0)).toThrow();
      expect(scope.childCpuMicroseconds()).toBeGreaterThan(0);
      expect(scope.healthy()).toBe(true);
    }
  });
  it('waits and reaps a detached adopted child after direct Git exit and closed pipes', async () => {
    const scope = open(), pidFile = path.join(tempDir('policy-orphan-'), 'pid');
    await expect(scope.runAsync(arguments_, { ...options('orphan'), timeout: 100,
      env: { ...options('orphan').env, POLICY_FIXTURE_PID: pidFile } })).rejects.toThrow('policy-git-failed');
    const pid = Number(fs.readFileSync(pidFile, 'ascii').trim());
    expect(Number.isSafeInteger(pid)).toBe(true);
    expect(() => process.kill(pid, 0)).toThrow();
    expect(scope.healthy()).toBe(true);
    expect(scope.childCpuMicroseconds()).toBeGreaterThan(0);
  });
  it('refuses expiry during actual host/Git preparation before either executable starts', async () => {
    const root = tempDir('policy-preparation-'), entry = path.join(root, 'preparation.mjs');
    const script = `import fs from 'node:fs';
      import { createNativePolicyGitScope } from ${JSON.stringify(path.join(source, 'policy-git-native.ts'))};
      const program=JSON.parse(process.argv[2]), root=process.argv[3], witness=process.argv[4];
      const scope=createNativePolicyGitScope(program), args=['--no-replace-objects','-C',root,'cat-file','--batch-command'];
      const started=root+'/git-started', env={PATH:'/usr/bin:/bin',LANG:'C',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_OPTIONAL_LOCKS:'0',GIT_NO_LAZY_FETCH:'1',POLICY_FIXTURE_MODE:'echo',POLICY_FIXTURE_STARTED:started};
      const observations=[];
      for(const async of [false,true]) {
        const invoke=timeout=>async?scope.runAsync(args,{env,maxBuffer:1024,timeout,input:Buffer.alloc(0)}):Promise.resolve().then(()=>scope.runSync(args,{env,maxBuffer:1024,timeout,input:Buffer.alloc(0)}));
        await invoke(1000);
        const positive={supervisor:fs.existsSync(witness),git:fs.existsSync(started),fork:fs.existsSync(witness+'.fork')};
        fs.rmSync(witness,{force:true});fs.rmSync(started,{force:true});fs.rmSync(witness+'.fork',{force:true});
        const before=scope.childCpuMicroseconds();let failure='';
        try { await invoke(50); } catch(error) { failure=error.message; }
        observations.push({async,positive,failure,supervisor:fs.existsSync(witness),git:fs.existsSync(started),fork:fs.existsSync(witness+'.fork'),known:scope.healthy(),childCpu:scope.childCpuMicroseconds()-before});
        fs.rmSync(witness,{force:true});fs.rmSync(started,{force:true});fs.rmSync(witness+'.fork',{force:true});
      }
      const closed=await scope.close();process.stdout.write(JSON.stringify({observations,closed}));`;
    await build({ stdin: { contents: script, resolveDir: source }, bundle: true, platform: 'node', format: 'esm',
      conditions: ['source'], outfile: entry, logLevel: 'silent' });
    for (const phase of ['host', 'git'] as const) {
      const { stdout } = await exec(process.execPath, [entry, JSON.stringify(preparation[phase]), root, preparation.witness],
        { env: { PATH: '/usr/bin:/bin', LANG: 'C' }, timeout: 10_000, killSignal: 'SIGKILL', maxBuffer: 4096 });
      const result = JSON.parse(stdout) as { observations: { async: boolean; positive: { supervisor: boolean; git: boolean; fork: boolean };
        failure: string; supervisor: boolean; git: boolean; fork: boolean; known: boolean; childCpu: number }[]; closed: boolean };
      expect(result.observations).toHaveLength(2);
      for (const [index, observation] of result.observations.entries()) {
        expect(observation.async).toBe(index === 1);
        expect(observation.positive).toEqual({ supervisor: true, git: true, fork: phase === 'git' });
        expect(observation.failure).toBe('policy-git-failed');
        expect(observation.supervisor).toBe(phase === 'git');
        expect(observation.git).toBe(false);
        expect(observation.fork).toBe(false);
        expect(observation.known).toBe(true);
        if (phase === 'host') expect(observation.childCpu).toBe(0);
        else expect(observation.childCpu).toBeGreaterThan(0);
      }
      expect(result.closed).toBe(true);
    }
  });
  it('settles queued work without JS callbacks and never dispatches after its admission deadline', async () => {
    const root = tempDir('policy-queued-'), entry = path.join(root, 'queued.mjs');
    const sourceFile = path.join(source, 'policy-git-native.ts');
    const script = `import fs from 'node:fs';
      import { createNativePolicyGitScope } from ${JSON.stringify(sourceFile)};
      const program=JSON.parse(process.argv[2]), root=process.argv[3];
      const scope=createNativePolicyGitScope(program);
      const args=['--no-replace-objects','-C',root,'cat-file','--batch-command'];
      const env={PATH:'/usr/bin:/bin',LANG:'C',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_OPTIONAL_LOCKS:'0',GIT_NO_LAZY_FETCH:'1'};
      let callbacks=0;
      const first=scope.runAsync(args,{env:{...env,POLICY_FIXTURE_MODE:'orphan',POLICY_FIXTURE_PID:root+'/pid'},maxBuffer:1024,timeout:2000});
      const calls=[first,...Array.from({length:6},()=>scope.runAsync(args,{env:{...env,POLICY_FIXTURE_MODE:'nested-cpu',POLICY_FIXTURE_STARTED:root+'/started'},maxBuffer:1024,timeout:50}))];
      const done=calls.map(call=>call.then(()=>{callbacks++;return 'passed';},()=>{callbacks++;return 'failed';}));
      scope.cpuClock();
      const beforeCallbacks=callbacks, charged=scope.childCpuMicroseconds();
      const outcomes=await Promise.all(done);
      const count=fs.existsSync(root+'/started')?fs.readFileSync(root+'/started','ascii').trim().split('\\n').length:0;
      const stable=scope.childCpuMicroseconds()===charged, healthy=scope.healthy(), closed=await scope.close();
      process.stdout.write(JSON.stringify({beforeCallbacks,charged,outcomes,count,stable,healthy,closed}));`;
    await build({ stdin: { contents: script, resolveDir: source }, bundle: true, platform: 'node', format: 'esm',
      conditions: ['source'], outfile: entry, logLevel: 'silent' });
    const { stdout } = await exec(process.execPath, [entry, JSON.stringify(program), root], {
      env: { PATH: '/usr/bin:/bin', LANG: 'C', UV_THREADPOOL_SIZE: '1' }, timeout: 10_000, killSignal: 'SIGKILL', maxBuffer: 4096 });
    const result = JSON.parse(stdout) as { beforeCallbacks: number; charged: number; outcomes: string[]; count: number; stable: boolean; healthy: boolean; closed: boolean };
    expect(result.beforeCallbacks).toBe(0);
    expect(result.charged).toBeGreaterThan(0);
    expect(result.outcomes).toEqual(Array<string>(7).fill('failed'));
    expect(result.count).toBe(0);
    expect(result.stable).toBe(true);
    expect(result.healthy).toBe(true);
    expect(result.closed).toBe(true);
  });
  it('attempts every held-image close exactly once when request construction and the first close fail', () => {
    const scope = open(), paths = new Set([program.addon.file, program.supervisor.file, program.git.file]);
    const attempts: { fd: number; path: string }[] = [];
    imageClosures.observe = fd => {
      const target = fs.readlinkSync(`/proc/self/fd/${fd}`);
      if (paths.has(target)) attempts.push({ fd, path: target });
    };
    imageClosures.failAfterClose = fd => attempts.length === 1 && attempts[0]!.fd === fd;
    try { expect(() => scope.runSync([], options('echo'))).toThrow('policy-git-job-construction'); }
    finally { imageClosures.observe = undefined; imageClosures.failAfterClose = undefined; }
    expect(attempts.map(value => value.path)).toEqual([program.addon.file, program.supervisor.file, program.git.file]);
    expect(new Set(attempts.map(value => value.fd)).size).toBe(3);
    for (const { fd } of attempts) expect(() => fs.fstatSync(fd)).toThrow();
    expect(scope.healthy()).toBe(false);
    expect(() => scope.runSync(arguments_, options('echo'))).toThrow('policy-git-unavailable');
  });
  it('copies async input before dispatch and drains it before closing admission', async () => {
    const scope = open(), input = Buffer.from('immutable request');
    const pending = scope.runAsync(arguments_, options('echo', input)); input.fill(0);
    const closing = scope.close();
    expect(await pending).toEqual(Buffer.from('immutable request'));
    expect(await closing).toBe(true);
    expect(() => scope.runSync(arguments_, options('echo'))).toThrow('policy-git-unavailable');
  });
  it('poisons a missing tree receipt and refuses a changed executable before spawn', async () => {
    const bad = createNativePolicyGitScope({ ...program, supervisor: program.git }); scopes.push(bad);
    const pending = bad.runAsync(arguments_, options('echo'));
    expect(() => bad.cpuClock()).toThrow('policy-git-usage-unavailable');
    await expect(pending).rejects.toThrow('policy-git-usage-unavailable');
    expect(bad.healthy()).toBe(false);
    expect(() => createNativePolicyGitScope({ ...program, addon: { ...program.addon, sha256: '0'.repeat(64) } })).toThrow('policy-git-image-digest');
  });
});


it('keeps the actual policy phase trace, HEAD retry, ref short circuit and working-file checks', async () => {
  const root = tempDir('policy-phase-');
  const run = (...args: string[]): string => execFileSync('/usr/bin/git', ['-C', root, ...args], {
    env: environment, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 10_000 }).trim();
  run('init', '-q', '--template=', '--initial-branch=main');
  const baseBytes = Buffer.from('own base policy fixture'), originBytes = Buffer.from('own origin policy fixture');
  for (const [file, bytes] of [[DOSSIER_POLICY_PATH, baseBytes], [DOSSIER_URL_ORIGIN_POLICY_PATH, originBytes]] as const) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); fs.writeFileSync(path.join(root, file), bytes);
  }
  run('add', '.'); run('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'Initial');
  const commit = run('rev-parse', 'HEAD');
  run('update-ref', URL_PARENT_DEFAULT_REF, commit); run('update-ref', `refs/tags/${URL_PARENT_TAG}`, commit);
  const base: PolicyBinding = { path: DOSSIER_POLICY_PATH, commit, policyId: 'polaris-butlers-project-shape-secrets',
    policyVersion: 'dossier-declared-source/4.0.0', sha256: sha256(baseBytes) };
  const origin: PolicyBinding = { ...base, path: DOSSIER_URL_ORIGIN_POLICY_PATH, sha256: sha256(originBytes) };
  const parent: UrlParentAdoption = { rowId: 'own', landedCommit: commit, defaultCommit: commit, tagObject: commit, subjects: [] };
  const native = createNativePolicyGitScope({ ...program, git: { file: '/usr/bin/git', sha256: sha256(fs.readFileSync('/usr/bin/git')) } }); scopes.push(native);
  for (const async of [false, true]) for (const scenario of ['baseline', 'HEAD retry', 'early ref drift', 'working drift'] as const) {
    const traces: { args: readonly string[]; input: string | null; environment: string; timeout: number; cap: number }[][] = [];
    for (const mode of ['original', 'native']) {
      run('reset', '--hard', commit); run('update-ref', URL_PARENT_DEFAULT_REF, commit);
      if (scenario === 'early ref drift') run('update-ref', '-d', URL_PARENT_DEFAULT_REF);
      const trace: typeof traces[number] = []; traces.push(trace);
      const before = (args: readonly string[], options: PolicyGitOptions): void => {
        trace.push({ args: [...args], input: options.input === undefined ? null : options.input.toString(),
          environment: sha256(JSON.stringify(options.env)), timeout: options.timeout, cap: options.maxBuffer });
        if (scenario === 'HEAD retry' && trace.length === 2) run('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '--allow-empty', '-qm', 'Unrelated HEAD');
      };
      const after = (): void => { if (scenario === 'working drift' && trace.length === 2) fs.appendFileSync(path.join(root, DOSSIER_POLICY_PATH), ' '); };
      const execute = (args: readonly string[], options: PolicyGitOptions): Buffer => execFileSync('/usr/bin/git', args, {
        ...options, stdio: [options.input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'] });
      const executor: PolicyGitExecutor = {
        runSync(args, options) { before(args, options); const output = mode === 'native' ? native.runSync(args, options) : execute(args, options); after(); return output; },
        async runAsync(args, options) { before(args, options); const output = mode === 'native' ? await native.runAsync(args, options) : execute(args, options); after(); return output; },
      };
      const result = async ? await committedUrlPoliciesCurrentAsync(root, base, origin, parent, executor)
        : committedUrlPoliciesCurrent(root, base, origin, parent, executor);
      expect(result, `${mode}: ${scenario}`).toBe(scenario === 'baseline' || scenario === 'HEAD retry');
      expect(trace.map(call => call.args[3]), scenario).toEqual(scenario === 'early ref drift' ? ['for-each-ref']
        : scenario === 'HEAD retry' ? ['for-each-ref', 'cat-file', 'cat-file', 'for-each-ref'] : ['for-each-ref', 'cat-file', 'for-each-ref']);
      expect(trace[0]!.input).toBeNull();
      if (trace.length > 1) expect(trace[1]!.input).toBe(`info HEAD^{commit}\ncontents ${commit}:${base.path}\ncontents ${commit}:${origin.path}\ninfo HEAD^{commit}\n`);
    }
    // The unrelated HEAD commit includes a timestamp; compare exact command,
    // env digest, mode and bounds, and normalize only its retry input object ID.
    const normalize = (trace: typeof traces[number]) => trace.map((call, index) => ({ ...call,
      input: scenario === 'HEAD retry' && index === 2 ? call.input?.replaceAll(/[a-f0-9]{40}(?=:)/gu, '<retry-head>') : call.input }));
    expect(normalize(traces[1]!)).toEqual(normalize(traces[0]!));
  }
});

it('admits a real policy batch above the former prototype 64KiB stdin cap', async () => {
  const root = tempDir('policy-large-batch-');
  const run = (...args: string[]): string => execFileSync('/usr/bin/git', ['-C', root, ...args], {
    env: environment, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 10_000 }).trim();
  run('init', '-q', '--template=', '--initial-branch=main');
  const subjects: { path: string; sha256: string }[] = [];
  for (const file of [DOSSIER_POLICY_PATH, DOSSIER_URL_ORIGIN_POLICY_PATH, ...Array.from({ length: 512 }, (_, index) => `subjects/${index}-${'p'.repeat(145)}`)]) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); fs.writeFileSync(path.join(root, file), 'x');
    subjects.push({ path: file, sha256: sha256('x') });
  }
  run('add', '.'); run('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'Large policy population');
  const commit = run('rev-parse', 'HEAD'); run('update-ref', URL_PARENT_DEFAULT_REF, commit); run('update-ref', `refs/tags/${URL_PARENT_TAG}`, commit);
  const base: PolicyBinding = { path: DOSSIER_POLICY_PATH, commit, policyId: 'polaris-butlers-project-shape-secrets', policyVersion: 'dossier-declared-source/4.0.0', sha256: sha256('x') };
  const origin: PolicyBinding = { ...base, path: DOSSIER_URL_ORIGIN_POLICY_PATH };
  const parent: UrlParentAdoption = { rowId: 'own', landedCommit: commit, defaultCommit: commit, tagObject: commit, subjects };
  const native = createNativePolicyGitScope({ ...program, git: { file: '/usr/bin/git', sha256: sha256(fs.readFileSync('/usr/bin/git')) } }); scopes.push(native);
  let inputSize = 0;
  const executor: PolicyGitExecutor = { runSync(args, options) { inputSize = Math.max(inputSize, Buffer.byteLength(options.input ?? '')); return native.runSync(args, options); },
    async runAsync(args, options) { inputSize = Math.max(inputSize, Buffer.byteLength(options.input ?? '')); return native.runAsync(args, options); } };
  expect(committedUrlPoliciesCurrent(root, base, origin, parent, executor)).toBe(true);
  expect(await committedUrlPoliciesCurrentAsync(root, base, origin, parent, executor)).toBe(true);
  expect(inputSize).toBeGreaterThan(65_536);
});
