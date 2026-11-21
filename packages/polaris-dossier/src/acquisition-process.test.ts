import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { acquisitionGitTestPort, runAcquisitionGit, type AcquisitionProcessRequest } from './acquisition-process.js';

const directories: string[] = [];
afterEach(async () => { for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true }); });
async function fixture(): Promise<{ root: string; cwd: string; request: (overrides?: Partial<AcquisitionProcessRequest>) => Promise<AcquisitionProcessRequest> }> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'syzygy-acquisition-process-'));
  directories.push(root);
  const cwd = path.join(root, 'clone');
  await mkdir(cwd);
  let sequence = 0;
  return { root, cwd, request: async (overrides = {}) => {
    const home = path.join(root, `home-${sequence++}`);
    await mkdir(home);
    return { args: ['init', '--template=', '.'], cwd, home, transport: 'none', monitorRoot: cwd,
      limits: { sampleMilliseconds: 1_000, processMilliseconds: 5_000 }, ...overrides };
  } };
}
async function fake(root: string, body: string): Promise<ReturnType<typeof acquisitionGitTestPort>> {
  const executable = path.join(root, 'trusted-fixture-git');
  await writeFile(executable, `#!${process.execPath}\n${body}\n`);
  await chmod(executable, 0o755);
  return acquisitionGitTestPort({ git: executable, prlimit: '/usr/bin/prlimit' });
}

describe('bounded acquisition Git', () => {
  it('initializes a real owned repository with no ambient hooks, templates, config, helper, proxy or askpass inheritance', async () => {
    const f = await fixture();
    const trap = path.join(f.root, 'trap');
    await mkdir(trap);
    const marker = path.join(f.root, 'executed');
    const hook = path.join(trap, 'post-checkout');
    await writeFile(hook, `#!/bin/sh\ntouch '${marker}'\n`);
    await chmod(hook, 0o755);
    const ambient = path.join(f.root, 'ambient');
    await writeFile(ambient, `[init]\n templateDir = ${trap}\n[core]\n hooksPath = ${trap}\n[include]\n path = /does-not-exist\n`);
    const keys = ['GIT_CONFIG_GLOBAL', 'GIT_TEMPLATE_DIR', 'GIT_CONFIG_COUNT', 'GIT_CONFIG_KEY_0', 'GIT_CONFIG_VALUE_0',
      'GIT_ASKPASS', 'HTTPS_PROXY', 'GIT_SSH_COMMAND'] as const;
    const previous = keys.map((key) => [key, process.env[key]] as const);
    try {
      process.env.GIT_CONFIG_GLOBAL = ambient; process.env.GIT_TEMPLATE_DIR = trap;
      process.env.GIT_CONFIG_COUNT = '1'; process.env.GIT_CONFIG_KEY_0 = 'init.defaultBranch'; process.env.GIT_CONFIG_VALUE_0 = 'inherited-branch';
      process.env.GIT_ASKPASS = hook; process.env.HTTPS_PROXY = 'http://invalid-fixture.invalid'; process.env.GIT_SSH_COMMAND = hook;
      const result = await runAcquisitionGit(await f.request());
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.code);
      expect(result.summary.groupTermination).toBe('confirmed');
      expect(result.summary.census.samples).toBeGreaterThanOrEqual(2);
      expect(result.summary.census.residualBytes).toBeGreaterThan(0);
      expect(result.summary.census.betweenSamples).toBe('Unknown');
      expect(await readFile(path.join(f.cwd, '.git/HEAD'), 'utf8')).not.toContain('inherited-branch');
      await expect(readFile(marker)).rejects.toMatchObject({ code: 'ENOENT' });
      await expect(readFile(path.join(f.cwd, '.git/post-checkout'))).rejects.toMatchObject({ code: 'ENOENT' });
      const probe = await fake(f.root, `const e=process.env;const a=process.argv;const required=['protocol.allow=never','protocol.https.allow=never','protocol.ssh.allow=always','protocol.file.allow=never','http.sslVerify=true','http.followRedirects=false','credential.helper=','core.hooksPath=/dev/null'];const forbidden=['GIT_TEMPLATE_DIR','GIT_CONFIG_COUNT','GIT_CONFIG_KEY_0','GIT_CONFIG_VALUE_0','HTTPS_PROXY','https_proxy','HTTP_PROXY','ALL_PROXY','GIT_EXEC_PATH','CURL_HOME'];if(forbidden.some(k=>e[k]!==undefined)||required.some(k=>!a.includes(k))||e.GIT_ASKPASS!=='/bin/false'||e.SSH_ASKPASS!=='/bin/false'||e.GIT_CONFIG_GLOBAL!=='/dev/null'||!e.GIT_SSH_COMMAND.includes('-F /dev/null -oBatchMode=yes -oStrictHostKeyChecking=yes')||!e.GIT_SSH_COMMAND.includes('-oControlMaster=no -oControlPath=none -oControlPersist=no')||!e.GIT_SSH_COMMAND.includes('-oProxyCommand=none -oProxyJump=none')||!e.GIT_SSH_COMMAND.includes('-oClearAllForwardings=yes -oForwardAgent=no'))process.exit(19);process.stdout.write('isolated');`);
      expect(await probe(await f.request({ transport: 'ssh' }))).toMatchObject({ ok: true, stdout: 'isolated' });
    } finally { for (const [key, value] of previous) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } }
  });

  it('supports the trusted file-fixture port while production refuses file transport and never returns raw Git diagnostics', async () => {
    const f = await fixture();
    expect((await runAcquisitionGit(await f.request())).ok).toBe(true);
    const request = await f.request({ args: ['ls-remote', '--', `file://${f.cwd}`, 'HEAD'] });
    const refused = await runAcquisitionGit(request);
    expect(refused).toMatchObject({ ok: false, code: 'git-failed', summary: { groupTermination: 'confirmed' } });
    expect(JSON.stringify(refused)).not.toContain(f.cwd);
    const local = acquisitionGitTestPort({ git: '/usr/bin/git', prlimit: '/usr/bin/prlimit', allowFixtureFileTransport: true });
    const allowed = await local(await f.request({ args: request.args }));
    expect(allowed).toMatchObject({ ok: true, stdout: '' });
    const source = path.join(f.root, 'source'); await mkdir(source);
    const sourceHome = path.join(f.root, 'source-home'); await mkdir(sourceHome);
    const git = (args: string[]): string => execFileSync('/usr/bin/git', ['-c', 'core.hooksPath=/dev/null', ...args], {
      cwd: source, env: { PATH: '/usr/bin:/bin', LANG: 'C', HOME: sourceHome, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' },
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
    git(['init', '--template=', '.']);
    await writeFile(path.join(source, 'README'), 'fixture body\n');
    await writeFile(path.join(source, '.gitattributes'), 'README filter=synthetic\n');
    git(['add', '.']);
    git(['-c', 'user.name=Synthetic Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', 'own synthetic fixture']);
    const pin = git(['rev-parse', 'HEAD']).trim();
    const trapMarker = path.join(f.root, 'filter-executed');
    const sourceConfig = path.join(source, '.git/config');
    await writeFile(sourceConfig, `${await readFile(sourceConfig, 'utf8')}[filter "synthetic"]\n smudge = touch ${trapMarker}\n`);
    expect((await local(await f.request({ args: ['fetch', '--depth=1', '--no-tags', '--no-recurse-submodules', '--', `file://${source}`, pin] }))).ok).toBe(true);
    expect((await local(await f.request({ args: ['checkout', '--detach', pin] }))).ok).toBe(true);
    expect(await readFile(path.join(f.cwd, 'README'), 'utf8')).toBe('fixture body\n');
    expect((await readFile(path.join(f.cwd, '.git/shallow'), 'utf8')).trim()).toBe(pin);
    await expect(readFile(trapMarker)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('refuses invalid bounds, nonempty HOME, unsupported limiter and executable or repository config without launching', async () => {
    const f = await fixture();
    const runner = await fake(f.root, 'require("node:fs").writeFileSync("unexpected-run", "bad")');
    for (const value of [0, -1, NaN, Infinity, 1.5]) {
      expect(await runner(await f.request({ limits: { fileBytes: value } }))).toMatchObject({ ok: false, code: 'invalid-request' });
    }
    const nonempty = await f.request(); await writeFile(path.join(nonempty.home, 'unexpected'), 'x');
    expect(await runner(nonempty)).toMatchObject({ ok: false, code: 'invalid-request' });
    expect(await acquisitionGitTestPort({ git: '/usr/bin/git', prlimit: '/not-a-trusted-limiter' })(await f.request()))
      .toMatchObject({ ok: false, code: 'limiter-unavailable', summary: { groupTermination: 'not-started' } });
    expect(await runner(await f.request({ args: ['config', '--list'] }))).toMatchObject({ ok: false, code: 'invalid-request' });
    expect((await runAcquisitionGit(await f.request())).ok).toBe(true);
    const config = path.join(f.cwd, '.git/config');
    const original = await readFile(config);
    for (const addition of ['[include]\npath = /synthetic\n', '[filter "synthetic"]\nsmudge = /bin/false\n', '[core]\nhooksPath = /synthetic\n']) {
      await writeFile(config, Buffer.concat([original, Buffer.from(addition)]));
      expect(await runner(await f.request({ args: ['checkout', '--detach', 'a'.repeat(40)] })))
        .toMatchObject({ ok: false, code: 'invalid-request', summary: { groupTermination: 'not-started' } });
    }
    await expect(readFile(path.join(f.cwd, 'unexpected-run'))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('enforces a combined byte cap on stdout and stderr, discards failed output and refuses invalid UTF-8', async () => {
    const f = await fixture();
    for (const body of ['process.stdout.write("x".repeat(65))', 'process.stdout.write("x".repeat(32)); process.stderr.write("private-fixture".repeat(8))']) {
      const runner = await fake(f.root, body);
      const result = await runner(await f.request({ limits: { outputBytes: 64, sampleMilliseconds: 1_000 } }));
      expect(result).toMatchObject({ ok: false, code: 'output-limit', summary: { groupTermination: 'confirmed' } });
      expect('stdout' in result).toBe(false);
      expect(JSON.stringify(result)).not.toContain('private-fixture');
    }
    const invalid = await fake(f.root, 'process.stdout.write(Buffer.from([0xc0,0xaf]))');
    expect(await invalid(await f.request())).toMatchObject({ ok: false, code: 'invalid-output' });
    const nonzero = await fake(f.root, 'process.stdout.write("raw-fixture"); process.stderr.write("raw-fixture");process.exitCode=3');
    const failed = await nonzero(await f.request());
    expect(failed).toMatchObject({ ok: false, code: 'git-failed', summary: { exitCode: 3 } });
    expect(JSON.stringify(failed)).not.toContain('raw-fixture');
  });

  it('kills an uncooperative process at its deadline and confirms the group stopped', async () => {
    const f = await fixture();
    const runner = await fake(f.root, 'process.on("SIGTERM",()=>{});setInterval(()=>{},1000)');
    const result = await runner(await f.request({ limits: { processMilliseconds: 200, sampleMilliseconds: 1_000 } }));
    expect(result).toMatchObject({ ok: false, code: 'process-deadline', summary: { groupTermination: 'confirmed', signal: 'SIGKILL' } });
    expect(result.summary.durationMilliseconds).toBeLessThan(3_000);
  });

  it('kills a background grandchild before reporting a successful group termination', async () => {
    const f = await fixture();
    const marker = path.join(f.root, 'late-grandchild-write');
    // The parent waits/reaps its child on TERM; the child would otherwise write after the deadline.
    const runner = await fake(f.root, `const {spawn}=require('node:child_process');const child=spawn(process.execPath,['-e',${JSON.stringify(`setTimeout(()=>require('node:fs').writeFileSync(${JSON.stringify(marker)},'bad'),1500)`)}],{stdio:'ignore'});process.on('SIGTERM',()=>child.once('exit',()=>process.exit(0)));setInterval(()=>{},1000);`);
    const result = await runner(await f.request({ limits: { processMilliseconds: 300, sampleMilliseconds: 1_000 } }));
    expect(result).toMatchObject({ ok: false, code: 'process-deadline', summary: { groupTermination: 'confirmed' } });
    await expect(readFile(marker)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('returns an explicit unconfirmed refusal within its cleanup bound if group signalling is ineffective', async () => {
    const f = await fixture();
    const executable = path.join(f.root, 'trusted-unkillable-fixture');
    const pidFile = path.join(f.root, 'fixture-pid');
    await writeFile(executable, `#!${process.execPath}\nrequire('node:fs').writeFileSync(${JSON.stringify(pidFile)},String(process.pid));setInterval(()=>{},1000);\n`);
    await chmod(executable, 0o755);
    const runner = acquisitionGitTestPort({ git: executable, prlimit: '/usr/bin/prlimit', signalGroup: () => {} });
    try {
      const result = await runner(await f.request({ limits: { processMilliseconds: 300, sampleMilliseconds: 1_000 } }));
      expect(result).toMatchObject({ ok: false, code: 'termination-unconfirmed', summary: { groupTermination: 'unconfirmed' } });
      expect(result.summary.durationMilliseconds).toBeLessThan(3_000);
    } finally {
      const pid = Number(await readFile(pidFile, 'utf8'));
      process.kill(-pid, 'SIGKILL');
      const deadline = Date.now() + 1_000;
      while (Date.now() < deadline) {
        try { process.kill(pid, 0); } catch { break; }
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      expect(() => process.kill(pid, 0)).toThrow();
    }
  });

  it('inherits hard file-size limits into a trusted grandchild and refuses a caught write failure', async () => {
    const f = await fixture();
    const target = path.join(f.cwd, 'limited');
    const childCode = `try{require('node:fs').writeFileSync(${JSON.stringify(target)},Buffer.alloc(2048));process.exit(0)}catch{process.exit(23)}`;
    const runner = await fake(f.root, `const c=require('node:child_process').spawnSync(process.execPath,['-e',${JSON.stringify(childCode)}],{stdio:'ignore'});process.exit(c.status===0?0:23)`);
    const result = await runner(await f.request({ limits: { fileBytes: 1024, sampleMilliseconds: 1_000 } }));
    expect(result).toMatchObject({ ok: false, code: 'git-failed', summary: { exitCode: 23, groupTermination: 'confirmed' } });
    expect((await readFile(target)).length).toBeLessThanOrEqual(1024);
    const control = await runner(await f.request({ limits: { fileBytes: 4096, sampleMilliseconds: 1_000 } }));
    expect(control.ok).toBe(true);
    expect((await readFile(target)).length).toBe(2048);
  });

  it('stops on sampled byte and entry breaches, reports measured residuals and follows no symlink', async () => {
    const f = await fixture();
    const outside = path.join(f.root, 'outside'); await mkdir(outside); await writeFile(path.join(outside, 'large'), Buffer.alloc(8192));
    await symlink('../outside', path.join(f.cwd, 'link'));
    const benign = await fake(f.root, 'process.stdout.write("safe")');
    const safe = await benign(await f.request({ limits: { directoryBytes: 128, directoryEntries: 8, sampleMilliseconds: 1_000 } }));
    expect(safe).toMatchObject({ ok: true, summary: { census: { residualBytes: 10, residualEntries: 1 } } });
    const writer = await fake(f.root, 'require("node:fs").writeFileSync("growth",Buffer.alloc(256));setInterval(()=>{},1000)');
    const bytes = await writer(await f.request({ limits: { directoryBytes: 128, sampleMilliseconds: 100, processMilliseconds: 2_000 } }));
    expect(bytes).toMatchObject({ ok: false, code: 'directory-byte-limit', summary: { groupTermination: 'confirmed', census: { aggregateEnforcement: 'sampled-stop-only' } } });
    expect(bytes.summary.census.peakBytes).toBeGreaterThanOrEqual(256);
    await rm(path.join(f.cwd, 'growth'));
    const entries = await fake(f.root, 'for(let i=0;i<5;i++)require("node:fs").writeFileSync("entry"+i,"");setInterval(()=>{},1000)');
    expect(await entries(await f.request({ limits: { directoryEntries: 3, sampleMilliseconds: 100, processMilliseconds: 2_000 } })))
      .toMatchObject({ ok: false, code: 'directory-entry-limit', summary: { groupTermination: 'confirmed', census: { peakEntries: 4 } } });
  });

  it('fails closed on incomplete census of a special file instead of treating it as zero', async () => {
    const f = await fixture();
    execFileSync('/usr/bin/mkfifo', [path.join(f.cwd, 'fifo')]);
    const runner = await fake(f.root, 'process.stdout.write("must-not-run")');
    expect(await runner(await f.request())).toMatchObject({ ok: false, code: 'census-incomplete', summary: {
      groupTermination: 'not-started', census: { samples: 0, residualBytes: null, residualEntries: null },
    } });
  });
});
