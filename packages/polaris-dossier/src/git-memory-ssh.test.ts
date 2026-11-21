import { decodeGitIncomingUnit } from './git-memory-selection.js';
import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmod, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import net from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { sha256 } from '@syzygy/support';
import { receiveGitPackOverSsh, gitMemorySshTestPort, GIT_MEMORY_SSH_PROFILE, type GitSshRequest, type GitSshMetadata, selectGitRevisionOverSsh } from './git-memory-ssh.js';

const roots: string[] = [], children: ChildProcess[] = [];
const cleanEnv = (home: string) => ({ PATH: '/usr/bin:/bin', HOME: home, ZDOTDIR: home, LC_ALL: 'C' });
afterEach(async () => {
  for (const child of children.splice(0)) {
    if (child.exitCode === null && child.signalCode === null) {
      const done = new Promise<void>(resolve => child.once('close', () => resolve()));
      child.kill('SIGTERM'); await done;
    }
  }
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});
const packet = (text: string | Buffer): Buffer => { const bytes = Buffer.isBuffer(text) ? text : Buffer.from(text); return Buffer.concat([Buffer.from((bytes.length + 4).toString(16).padStart(4, '0')), bytes]); };
const advertisement = (format = 'sha1', agent?: string) => Buffer.concat([packet('version 2\n'), ...(agent === undefined ? [] : [packet(`agent=${agent}\n`)]), packet('ls-refs=unborn\n'), packet('fetch=shallow wait-for-done\n'), packet(`object-format=${format}\n`), Buffer.from('0000')]);
async function base() {
  const root = await mkdtemp(path.join(await realpath(tmpdir()), 'syzygy-memory-ssh-test-')); roots.push(root);
  const home = path.join(root, 'recipient-home'), serverHome = path.join(root, 'server-home');
  await mkdir(home, { mode: 0o700 }); await mkdir(serverHome, { mode: 0o700 });
  for (const name of ['host', 'client', 'other']) execFileSync('/usr/bin/ssh-keygen', ['-q', '-t', 'ed25519', '-N', '', '-f', path.join(root, name)], { env: cleanEnv(serverHome), timeout: 5000, stdio: ['ignore', 'pipe', 'pipe'] });
  return { root, home, serverHome, identity: path.join(root, 'client'), knownHosts: path.join(root, 'known_hosts') };
}
async function fixture(format: 'sha1' | 'sha256' = 'sha1', mode = 'native', custom?: Buffer | ((pin: string) => Buffer), incomingAgent?: string) {
  const f = await base(), source = path.join(f.root, 'own-synthetic.git');
  const env = { ...cleanEnv(f.serverHome), GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_AUTHOR_NAME: 'NONSECRET Fixture', GIT_AUTHOR_EMAIL: 'fixture@example.invalid', GIT_COMMITTER_NAME: 'NONSECRET Fixture', GIT_COMMITTER_EMAIL: 'fixture@example.invalid', GIT_AUTHOR_DATE: '2000-01-01T00:00:00Z', GIT_COMMITTER_DATE: '2000-01-01T00:00:00Z' };
  const git = (args: string[], input?: string) => execFileSync('/usr/bin/git', args, { env, input, timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
  git(['init', '--bare', '--template=', `--object-format=${format}`, source]);
  const blob = git([`--git-dir=${source}`, 'hash-object', '-w', '--stdin'], 'NONSECRET_SSH_SOURCE_CANARY_1907\n');
  const tree = git([`--git-dir=${source}`, 'mktree'], `100644 blob ${blob}\tREADME.md\n`);
  const parent = git([`--git-dir=${source}`, 'commit-tree', tree], 'NONSECRET base\n');
  const pin = git([`--git-dir=${source}`, 'commit-tree', tree, '-p', parent], 'NONSECRET tip\n');
  git([`--git-dir=${source}`, 'update-ref', 'refs/heads/trunk', pin]);
  const listener = net.createServer(); await new Promise<void>(resolve => listener.listen(0, '127.0.0.1', resolve));
  const address = listener.address(); if (address === null || typeof address === 'string') throw new Error('fixture-port');
  const port = address.port; await new Promise<void>(resolve => listener.close(() => resolve()));
  const pub = (await readFile(path.join(f.root, 'host.pub'), 'utf8')).trim().split(' ');
  await writeFile(f.knownHosts, `[127.0.0.1]:${port} ${pub[0]} ${pub[1]}\n`, { mode: 0o600 });
  const receipt = path.join(f.root, 'server-receipt.json'), requestLog = path.join(f.root, 'server-request.bin');
  const wrapper = path.join(f.root, 'trusted-synthetic-upload-pack.cjs');
  const script = `const fs=require('node:fs');const cp=require('node:child_process');const crypto=require('node:crypto');const protocol=process.env.GIT_PROTOCOL||'';fs.writeFileSync(${JSON.stringify(receipt)},JSON.stringify({protocol,commandDigest:crypto.createHash('sha256').update(process.env.SSH_ORIGINAL_COMMAND||'').digest('hex')}));setTimeout(()=>process.exit(0),2000).unref();
if(${JSON.stringify(mode)}==='native'||${JSON.stringify(mode)}==='v0'){const child=cp.spawn('/usr/bin/git',['upload-pack',${JSON.stringify(source)}],{env:{PATH:'/usr/bin:/bin',HOME:${JSON.stringify(f.serverHome)},GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_PROTOCOL:${JSON.stringify(mode)}==='v0'?'':protocol},stdio:['pipe','inherit','inherit']});process.stdin.on('data',chunk=>{fs.appendFileSync(${JSON.stringify(requestLog)},chunk);child.stdin.write(chunk)});process.stdin.on('end',()=>child.stdin.end());child.on('close',code=>process.exit(code||0));}
else if(${JSON.stringify(mode)}==='stall'){setInterval(()=>{},1000);}
else {process.stdout.write(Buffer.from(${JSON.stringify(advertisement(format, incomingAgent).toString('base64'))},'base64'));process.stdin.once('data',chunk=>{fs.writeFileSync(${JSON.stringify(requestLog)},chunk);process.stdout.write(Buffer.from(${JSON.stringify((typeof custom === 'function' ? custom(pin) : custom ?? Buffer.from('zzzz')).toString('base64'))},'base64'));process.stdin.on('end',()=>process.exit(0));});}`;
  await writeFile(wrapper, script);
  const config = path.join(f.root, 'sshd_config');
  await writeFile(config, `Port ${port}\nListenAddress 127.0.0.1\nHostKey ${path.join(f.root, 'host')}\nPidFile ${path.join(f.root, 'pid')}\nAuthorizedKeysFile ${path.join(f.root, 'client.pub')}\nStrictModes no\nUsePAM no\nPasswordAuthentication no\nKbdInteractiveAuthentication no\nPubkeyAuthentication yes\nAuthenticationMethods publickey\nPermitRootLogin no\nAllowUsers orca\nAllowTcpForwarding no\nAllowAgentForwarding no\nX11Forwarding no\nPermitTunnel no\nPermitUserEnvironment no\nPermitUserRC no\nAcceptEnv GIT_PROTOCOL\nSetEnv HOME=${f.serverHome} ZDOTDIR=${f.serverHome}\nForceCommand ${process.execPath} ${wrapper}\nLogLevel ERROR\n`);
  execFileSync('/usr/sbin/sshd', ['-t', '-f', config], { env: cleanEnv(f.serverHome), timeout: 5000, stdio: ['ignore', 'pipe', 'pipe'] });
  const server = spawn('/usr/sbin/sshd', ['-D', '-e', '-f', config], { env: cleanEnv(f.serverHome), stdio: ['ignore', 'pipe', 'pipe'] }); children.push(server);
  // Readiness uses TCP only; no authentication/command or unknown user configuration is invoked.
  for (let count = 0; ; count++) {
    const ready = await new Promise<boolean>(resolve => { const socket = net.connect(port, '127.0.0.1'); socket.once('connect', () => { socket.destroy(); resolve(true); }); socket.once('error', () => resolve(false)); });
    if (ready) break; if (count > 100 || server.exitCode !== null) throw new Error('fixture-sshd-unavailable'); await new Promise(resolve => setTimeout(resolve, 10));
  }
  const url = `ssh://orca@127.0.0.1:${port}/own-synthetic.git`;
  const request: GitSshRequest = { url, pin, objectFormat: format, home: f.home, knownHostsPath: f.knownHosts, authentication: { kind: 'identity-file', path: f.identity }, sourceProvider: 'synthetic-ssh-provider', admitIncomingMetadata: () => true, admitMetadata: () => true, limits: { milliseconds: 5000 } };
  return { ...f, pin, port, source, request, receipt, requestLog };
}
async function census(home: string): Promise<string[]> {
  const entries: string[] = [];
  for (const entry of await readdir(home, { withFileTypes: true })) {
    entries.push(entry.name + (entry.isDirectory() ? '/' : ':file'));
    if (entry.isDirectory()) for (const child of await readdir(path.join(home, entry.name))) entries.push(`${entry.name}/${child}`);
  }
  return entries.sort();
}
function independentFiles(home: string): string[] { return execFileSync('/usr/bin/find', [home, '-type', 'f', '-print0'], { env: cleanEnv(home), timeout: 1000 }).toString().split('\0').filter(Boolean); }

describe('native memory-only SSH Git v2', () => {
  for (const format of ['sha1', 'sha256'] as const) it(`receives a real ${format} shallow PACK with fixed explicit auth and no recipient files`, async () => {
    const f = await fixture(format), metadata: GitSshMetadata[] = [];
    const result = await receiveGitPackOverSsh({ ...f.request, admitMetadata: value => { metadata.push(value); expect(independentFiles(f.home)).toEqual([]); return true; } });
    expect(result.ok, JSON.stringify(result.evidence)).toBe(true); if (!result.ok) throw new Error(result.code);
    expect(result.shallow).toEqual([f.pin]);
    const pack = Buffer.from(result.pack), trailer = format === 'sha1' ? 20 : 32;
    expect(pack.subarray(0, 4).toString()).toBe('PACK'); expect(pack.readUInt32BE(8)).toBe(3);
    expect(createHash(format).update(pack.subarray(0, -trailer)).digest()).toEqual(pack.subarray(-trailer));
    expect(result.evidence).toMatchObject({ helper: { sha256: GIT_MEMORY_SSH_PROFILE.sha256 }, groupTermination: 'confirmed', metadataUnchanged: true, childRegularFileWriteLimit: 0, childCoreLimit: 0, protocolVersion: 2 });
    expect(await census(f.home)).toEqual(['tmp/', 'xdg/']); expect(independentFiles(f.home)).toEqual([]);
    expect(JSON.parse(await readFile(f.receipt, 'utf8'))).toEqual({ protocol: 'version=2', commandDigest: sha256("git-upload-pack '/own-synthetic.git'") });
    expect(metadata.map(value => value.stage)).toEqual(['connect', 'fetch']);
    expect(metadata[0]!.destination).toEqual({ scheme: 'ssh', user: 'orca', host: '127.0.0.1', port: f.port, repository: '/own-synthetic.git', service: 'git-upload-pack' });
    const config = metadata[0]!.config;
    expect(config.environment).toMatchObject({ HOME: f.home, ZDOTDIR: f.home, GIT_PROTOCOL: 'version=2' });
    expect(JSON.stringify(config.environment)).not.toContain('SSH_AUTH_SOCK');
    const wire = await readFile(f.requestLog); expect(wire).toEqual(Buffer.from(metadata[1]!.wire));
    expect(wire.includes(Buffer.from(`want ${f.pin}\n`))).toBe(true);
    expect(JSON.stringify(result.evidence)).not.toContain(f.identity); expect(JSON.stringify(result.evidence)).not.toContain(f.request.url);
  });

  it('refuses denied/throwing connect metadata before SSH process or network activity', async () => {
    for (const admission of [() => false, () => { throw new Error('NONSECRET_PRIVATE_ADMISSION_ERROR'); }]) {
      const f = await fixture(); let connections = 0;
      const listener = net.createServer(socket => { connections++; socket.destroy(); });
      await new Promise<void>(resolve => listener.listen(0, '127.0.0.1', resolve));
      try {
        const address = listener.address(); if (address === null || typeof address === 'string') throw new Error('fixture-port');
        const result = await receiveGitPackOverSsh({ ...f.request, url: `ssh://orca@127.0.0.1:${address.port}/repo`, admitMetadata: admission });
        expect(result).toMatchObject({ ok: false, code: 'metadata-admission-refused', evidence: { groupTermination: 'not-started', sentBytes: 0, admittedMetadata: [] } });
        expect(connections).toBe(0); expect(JSON.stringify(result)).not.toContain('NONSECRET_PRIVATE_ADMISSION_ERROR');
        await expect(lstat(f.receipt)).rejects.toMatchObject({ code: 'ENOENT' });
      } finally { await new Promise<void>(resolve => listener.close(() => resolve())); }
    }
  });

  it('refuses denied/throwing fetch metadata without sending any Git request', async () => {
    for (const throws of [false, true]) {
      const f = await fixture(), stages: string[] = [];
      const result = await receiveGitPackOverSsh({ ...f.request, admitMetadata: value => {
        stages.push(value.stage); if (value.stage === 'connect') return true;
        if (throws) throw new Error('NONSECRET_PRIVATE_FETCH_ERROR'); return false;
      } });
      expect(result).toMatchObject({ ok: false, code: 'metadata-admission-refused', evidence: { sentBytes: 0, groupTermination: 'confirmed' } });
      expect(stages).toEqual(['connect', 'fetch']);
      expect(JSON.parse(await readFile(f.receipt, 'utf8')).protocol).toBe('version=2');
      await expect(lstat(f.requestLog)).rejects.toMatchObject({ code: 'ENOENT' });
    }
  });

  it('copies wire and selected auth/destination/config across awaited callback mutations', async () => {
    const f = await fixture(), stages: string[] = [], received: Buffer[] = [];
    const request: GitSshRequest = { ...f.request, admitMetadata: async value => {
      stages.push(value.stage); received.push(Buffer.from(value.wire));
      expect(value.sourceProvider).toBe('synthetic-ssh-provider'); expect(value.url).toBe(f.request.url);
      expect(sha256(value.wire)).toBe(value.digest);
      expect(Object.isFrozen(value.config.environment)).toBe(true); expect(Object.isFrozen(value.config.args)).toBe(true);
      expect(Object.isFrozen(value.config.authenticationMetadata)).toBe(true);
      const args = value.config.args as readonly string[];
      for (const control of ['BatchMode=yes', 'StrictHostKeyChecking=yes', 'GlobalKnownHostsFile=/dev/null', 'IdentityAgent=none', 'IdentitiesOnly=yes', 'CertificateFile=none', 'ProxyCommand=none', 'ProxyJump=none', 'ControlPath=none', 'ClearAllForwardings=yes', 'ForwardAgent=no', 'PermitLocalCommand=no', 'SendEnv=GIT_PROTOCOL']) expect(args).toContain(control);
      value.wire.fill(0);
      const mutable = request as { url: string; pin: string; authentication: { kind: 'identity-file'; path: string }; sourceProvider: string; admitMetadata: GitSshRequest['admitMetadata'] };
      mutable.url = 'ssh://orca@127.0.0.1:1/UNADMITTED'; mutable.pin = '0'.repeat(40); mutable.authentication.path = path.join(f.root, 'other'); mutable.sourceProvider = 'unadmitted'; mutable.admitMetadata = () => false;
      await new Promise(resolve => setTimeout(resolve, 1)); return true;
    } };
    const result = await receiveGitPackOverSsh(request); expect(result.ok).toBe(true);
    expect(stages).toEqual(['connect', 'fetch']); expect(await readFile(f.requestLog)).toEqual(received[1]);
  });

  it('requires exact host-key and explicit identity instead of trusting connection or ambient credentials', async () => {
    for (const wrong of ['host-key', 'identity']) {
      const f = await fixture();
      if (wrong === 'host-key') { const key = (await readFile(path.join(f.root, 'other.pub'), 'utf8')).split(' '); await writeFile(f.knownHosts, `[127.0.0.1]:${f.port} ${key[0]} ${key[1]}\n`); }
      const result = await receiveGitPackOverSsh({ ...f.request, authentication: { kind: 'identity-file', path: wrong === 'identity' ? path.join(f.root, 'other') : f.identity } });
      expect(result.ok).toBe(false); expect('pack' in result).toBe(false);
      expect(result.evidence).toMatchObject({ groupTermination: 'confirmed', sentBytes: 0, protocolVersion: null });
      await expect(lstat(f.receipt)).rejects.toMatchObject({ code: 'ENOENT' });
      expect(JSON.stringify(result)).not.toContain('PRIVATE KEY'); expect(JSON.stringify(result)).not.toContain(f.identity);
    }
  });

  it('constrains an explicitly selected synthetic agent to the exact public identity', async () => {
    const f = await fixture(), socket = path.join(f.root, 'own-agent.sock');
    const agent = spawn('/usr/bin/ssh-agent', ['-D', '-a', socket], { env: cleanEnv(f.serverHome), stdio: ['ignore', 'pipe', 'pipe'] }); children.push(agent);
    for (let count = 0; ; count++) { if (await lstat(socket).then(stat => stat.isSocket(), () => false)) break; if (count > 100) throw new Error('fixture-agent-unavailable'); await new Promise(resolve => setTimeout(resolve, 10)); }
    execFileSync('/usr/bin/ssh-add', ['-q', f.identity, path.join(f.root, 'other')], { env: { ...cleanEnv(f.serverHome), SSH_AUTH_SOCK: socket }, timeout: 1000, stdio: ['ignore', 'pipe', 'pipe'] });
    const auth = { kind: 'agent-socket' as const, path: socket, publicIdentityPath: f.identity + '.pub' };
    const result = await receiveGitPackOverSsh({ ...f.request, authentication: auth }); expect(result.ok, JSON.stringify(result.evidence)).toBe(true);
    const freshHome = path.join(f.root, 'second-recipient'); await mkdir(freshHome);
    const refused = await receiveGitPackOverSsh({ ...f.request, home: freshHome, authentication: { ...auth, publicIdentityPath: path.join(f.root, 'other.pub') } });
    expect(refused.ok).toBe(false); expect(refused.evidence.sentBytes).toBe(0);
  });

  it('rejects unsupported locators, unknown auth fields, unsafe file metadata and missing admission before connection', async () => {
    const f = await fixture();
    for (const url of ['https://example.invalid/repo', 'ssh://orca:NONSECRET@example.invalid/repo', 'ssh://orca@example.invalid/a;echo', 'ssh://orca@example.invalid/a%27b', 'ssh://orca@example.invalid/a/../b', 'ssh://orca@example.invalid:0/repo', '-orca@host:repo', 'orca@-host:repo', 'orca@host:-option', 'orca@host:path with spaces']) {
      expect(await receiveGitPackOverSsh({ ...f.request, url })).toMatchObject({ ok: false, code: 'unsupported-transport', evidence: { groupTermination: 'not-started' } });
    }
    expect(await receiveGitPackOverSsh({ ...f.request, authentication: { ...f.request.authentication, unknown: 'NONSECRET_AUTH_FIELD' } as never })).toMatchObject({ ok: false, code: 'invalid-request' });
    expect(await receiveGitPackOverSsh({ ...f.request, admitMetadata: undefined as never })).toMatchObject({ ok: false, code: 'invalid-request' });
    const link = path.join(f.root, 'identity-link'); await symlink(f.identity, link);
    expect(await receiveGitPackOverSsh({ ...f.request, authentication: { kind: 'identity-file', path: link } })).toMatchObject({ ok: false, code: 'metadata-unavailable' });
    await chmod(f.identity, 0o644);
    expect(await receiveGitPackOverSsh(f.request)).toMatchObject({ ok: false, code: 'metadata-unavailable' });
    expect(await readdir(f.home)).toEqual([]);
  });

  it('rejects authentication metadata changes during admission before starting SSH', async () => {
    const f = await fixture();
    const result = await receiveGitPackOverSsh({ ...f.request, admitMetadata: async () => { await chmod(f.knownHosts, 0o644); return true; } });
    expect(result).toMatchObject({ ok: false, code: 'metadata-changed', evidence: { groupTermination: 'not-started' } });
    await expect(lstat(f.receipt)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('supports narrow scp-style relative paths without command interpolation', async () => {
    const f = await fixture(); let connect = '';
    // The source path is bound but the forced fixture upload-pack always reads its own repository.
    const result = await receiveGitPackOverSsh({ ...f.request, url: 'orca@127.0.0.1:org/repo.git', admitMetadata: value => { connect = Buffer.from(value.wire).toString(); return false; } });
    expect(result).toMatchObject({ ok: false, code: 'metadata-admission-refused' });
    expect(connect).toBe("git-upload-pack 'org/repo.git'");
  });

  it('refuses actual Git v0 without a protocol fallback', async () => {
    const f = await fixture('sha1', 'v0'), result = await receiveGitPackOverSsh(f.request);
    expect(result).toMatchObject({ ok: false, code: 'protocol-refused', evidence: { sentBytes: 0, protocolVersion: null, groupTermination: 'confirmed' } });
  });

  it('refuses malformed framing, wrong shallow pin, unknown section and corrupt checksum', async () => {
    const cases: { response: Buffer | ((pin: string) => Buffer); code: string }[] = [
      { response: Buffer.from('zzzz'), code: 'protocol-refused' },
      { response: Buffer.concat([packet('shallow-info\n'), packet(`shallow ${'0'.repeat(40)}`), Buffer.from('0001'), packet('packfile\n'), Buffer.from('0000')]), code: 'protocol-refused' },
      { response: Buffer.concat([packet('unknown-section\n'), Buffer.from('0000')]), code: 'protocol-refused' },
      { response: pin => Buffer.concat([packet('shallow-info\n'), packet(`shallow ${pin}`), Buffer.from('0001'), packet('packfile\n'), packet(Buffer.concat([Buffer.from([1]), Buffer.from('PACK'), Buffer.from([0, 0, 0, 2, 0, 0, 0, 0]), Buffer.alloc(20)])), Buffer.from('0000')]), code: 'pack-refused' },
    ];
    for (const item of cases) {
      const f = await fixture('sha1', 'custom', item.response), result = await receiveGitPackOverSsh(f.request);
      expect(result, JSON.stringify(result.evidence)).toMatchObject({ ok: false, code: item.code, evidence: { groupTermination: 'confirmed' } });
      expect('pack' in result).toBe(false);
    }
  });

  it('enforces PACK bytes and the absolute deadline on real native SSH', async () => {
    const f = await fixture();
    expect(await receiveGitPackOverSsh({ ...f.request, limits: { milliseconds: 1000, packBytes: 16 } })).toMatchObject({ ok: false, code: 'pack-limit', evidence: { groupTermination: 'confirmed' } });
    const stalled = await fixture('sha1', 'stall');
    const result = await receiveGitPackOverSsh({ ...stalled.request, limits: { milliseconds: 200 } });
    expect(result).toMatchObject({ ok: false, code: 'process-deadline', evidence: { groupTermination: 'confirmed' } });
    expect(result.evidence.durationMilliseconds).toBeLessThan(2000);
  });

  it('refuses invalid limits and helper identities without using explicit authentication', async () => {
    const f = await fixture();
    for (const milliseconds of [0, -1, NaN, Infinity, 1.5]) expect(await receiveGitPackOverSsh({ ...f.request, limits: { milliseconds } })).toMatchObject({ ok: false, code: 'invalid-request', evidence: { groupTermination: 'not-started' } });
    const wrong = gitMemorySshTestPort({ ssh: GIT_MEMORY_SSH_PROFILE.path, digest: '0'.repeat(64), prlimit: '/usr/bin/prlimit' });
    expect(await wrong(f.request)).toMatchObject({ ok: false, code: 'helper-profile-unavailable', evidence: { groupTermination: 'not-started' } });
    const result = await receiveGitPackOverSsh({ ...f.request, limits: { NONSECRET_UNKNOWN_FIELD: 'NONSECRET_UNBOUNDED_VALUE' } as never });
    expect(result).toMatchObject({ ok: false, code: 'invalid-request' });
    expect(JSON.stringify(result)).not.toContain('NONSECRET_UNBOUNDED_VALUE'); expect(await readdir(f.home)).toEqual([]);
  });

  it('bounds raw diagnostic/wire output and kills an uncooperative own helper process group', async () => {
    for (const mode of ['wire', 'stderr', 'stall']) {
      const f = await fixture(), helper = path.join(f.root, 'trusted-synthetic-ssh');
      const script = mode === 'wire' ? "process.stdout.write('NONSECRET_RAW_PROTOCOL'.repeat(1000));setInterval(()=>{},1000);" : mode === 'stderr' ? "process.stderr.write('NONSECRET_RAW_DIAGNOSTIC'.repeat(1000));setInterval(()=>{},1000);" : "process.on('SIGTERM',()=>{});setInterval(()=>{},1000);";
      await writeFile(helper, `#!${process.execPath}\n${script}\n`); await chmod(helper, 0o755);
      const run = gitMemorySshTestPort({ ssh: helper, digest: sha256(await readFile(helper)), prlimit: '/usr/bin/prlimit' });
      const result = await run({ ...f.request, limits: { milliseconds: mode === 'stall' ? 200 : 1000, wireBytes: mode === 'wire' ? 32 : 100_000, stderrBytes: mode === 'stderr' ? 32 : 1000 } });
      expect(result).toMatchObject({ ok: false, code: mode === 'stall' ? 'process-deadline' : 'wire-limit', evidence: { groupTermination: 'confirmed' } });
      if (mode === 'stall') expect(result.evidence.signal).toBe('SIGKILL');
      expect(result.evidence.durationMilliseconds).toBeLessThan(2000);
      expect(JSON.stringify(result)).not.toContain('NONSECRET_RAW_PROTOCOL'); expect(JSON.stringify(result)).not.toContain('NONSECRET_RAW_DIAGNOSTIC');
    }
  });

  it('enforces inherited hard fsize0 and detects zero-byte recipient additions with an independent write control', async () => {
    const f = await fixture(), target = path.join(f.home, 'tmp', 'NONSECRET-spill-canary'), helper = path.join(f.root, 'trusted-synthetic-ssh');
    await writeFile(helper, `#!${process.execPath}\nconst fs=require('node:fs');try{fs.writeFileSync(${JSON.stringify(target)},'NONSECRET_SSH_BODY_WRITE_CANARY')}catch(e){if(e.code!=='EFBIG')process.exit(9)}process.stdout.write('zzzz');\n`); await chmod(helper, 0o755);
    const run = gitMemorySshTestPort({ ssh: helper, digest: sha256(await readFile(helper)), prlimit: '/usr/bin/prlimit' });
    expect(await run(f.request)).toMatchObject({ ok: false, code: 'metadata-changed', evidence: { metadataUnchanged: false, groupTermination: 'confirmed' } });
    expect((await lstat(target)).size).toBe(0);
    const control = path.join(f.root, 'own-write-control');
    execFileSync('/usr/bin/prlimit', ['--core=0:0', '--fsize=1024:1024', '--', process.execPath, '-e', `require('node:fs').writeFileSync(${JSON.stringify(control)},'NONSECRET_SSH_BODY_WRITE_CANARY')`], { env: cleanEnv(f.serverHome), timeout: 1000 });
    expect(await readFile(control, 'utf8')).toBe('NONSECRET_SSH_BODY_WRITE_CANARY');
    expect(independentFiles(f.home)).toEqual([target]);
    expect(execFileSync('/usr/bin/stat', ['--format=%s', '--', target], { env: cleanEnv(f.serverHome), timeout: 1000, encoding: 'utf8' }).trim()).toBe('0');
  });

  for (const format of ['sha1', 'sha256'] as const) it(`selects actual ${format} SSH default HEAD with one v2 advertisement and ls-refs`, async () => {
    const f = await fixture(format);
    execFileSync('/usr/bin/git', [`--git-dir=${f.source}`, 'symbolic-ref', 'HEAD', 'refs/heads/trunk'], { env: cleanEnv(f.serverHome), timeout: 1000 });
    const stages: string[] = [], formats: unknown[] = [], wires: Buffer[] = [];
    const result = await selectGitRevisionOverSsh({ ...f.request, admitMetadata: value => { stages.push(value.stage); formats.push(value.objectFormat); wires.push(Buffer.from(value.wire)); expect('pin' in value).toBe(false); return true; } });
    expect(result, JSON.stringify(result.evidence)).toMatchObject({ ok: true, selection: { mode: 'remote-default', reference: 'refs/heads/trunk', identifier: f.pin, objectFormat: format }, evidence: { packBytes: 0, groupTermination: 'confirmed', metadataUnchanged: true } });
    expect(stages).toEqual(['connect', 'ls-refs']); expect(formats).toEqual([null, format]);
    expect(await readFile(f.requestLog)).toEqual(wires[1]); expect(wires[1]!.includes(Buffer.from('want '))).toBe(false);
    expect(independentFiles(f.home)).toEqual([]); expect(await census(f.home)).toEqual(['tmp/', 'xdg/']);
  });

  it('does no SSH/auth/HOME activity for a full commit selection', async () => {
    let called = false;
    const result = await selectGitRevisionOverSsh({ url: 'NONSECRET_NO_NETWORK_LOCATOR', selector: 'D'.repeat(64), sourceProvider: 'synthetic-ssh-provider', admitIncomingMetadata: () => true, admitMetadata: () => { called = true; return false; } });
    expect(result).toMatchObject({ ok: true, selection: { mode: 'full-commit', reference: null, identifier: 'd'.repeat(64), objectFormat: 'sha256' }, evidence: { helper: null, groupTermination: 'not-started', sentBytes: 0 } });
    expect(called).toBe(false);
  });

  it('gates SSH selection connect and ls-refs before any command/request effects', async () => {
    for (const part of ['connect', 'ls-refs']) for (const throws of [false, true]) {
      const f = await fixture();
      const result = await selectGitRevisionOverSsh({ ...f.request, selector: 'refs/heads/trunk', admitMetadata: value => { if (value.stage !== part) return true; if (throws) throw new Error('NONSECRET_PRIVATE_SELECTION_ERROR'); return false; } });
      expect(result).toMatchObject({ ok: false, code: 'metadata-admission-refused', evidence: { groupTermination: part === 'connect' ? 'not-started' : 'confirmed', sentBytes: 0 } });
      if (part === 'connect') await expect(lstat(f.receipt)).rejects.toMatchObject({ code: 'ENOENT' });
      else expect(JSON.parse(await readFile(f.receipt, 'utf8')).protocol).toBe('version=2');
      await expect(lstat(f.requestLog)).rejects.toMatchObject({ code: 'ENOENT' });
      expect(JSON.stringify(result)).not.toContain('NONSECRET_PRIVATE_SELECTION_ERROR');
    }
  });

  it('copies SSH selection wires and freezes selectors across awaited callback mutation', async () => {
    const f = await fixture(), wires: Buffer[] = [];
    const request = { ...f.request, selector: 'refs/heads/trunk', admitMetadata: async (value: import('./git-memory-selection.js').GitSelectionMetadata): Promise<boolean> => {
      expect(value.selector).toBe('refs/heads/trunk'); expect(Object.isFrozen(value.plan)).toBe(true); wires.push(Buffer.from(value.wire)); value.wire.fill(0);
      request.selector = 'refs/heads/UNADMITTED'; request.url = 'ssh://orca@127.0.0.1:1/UNADMITTED'; await new Promise(resolve => setTimeout(resolve, 1)); return true;
    } };
    const result = await selectGitRevisionOverSsh(request); expect(result).toMatchObject({ ok: true, selection: { reference: 'refs/heads/trunk', identifier: f.pin } });
    expect(await readFile(f.requestLog)).toEqual(wires[1]);
  });

  it('rejects unrequested SSH ref attributes and observes the selection wall deadline', async () => {
    const f = await fixture('sha1', 'custom', pin => Buffer.concat([packet(`${pin} HEAD symref-target:refs/heads/trunk unknown:NONSECRET\n`), Buffer.from('0000')]));
    expect(await selectGitRevisionOverSsh({ ...f.request, admitMetadata: () => true })).toMatchObject({ ok: false, code: 'protocol-refused', evidence: { packBytes: 0, groupTermination: 'confirmed' } });
    const stalled = await fixture('sha1', 'stall');
    expect(await selectGitRevisionOverSsh({ ...stalled.request, admitMetadata: () => true, limits: { milliseconds: 200 } })).toMatchObject({ ok: false, code: 'process-deadline', evidence: { groupTermination: 'confirmed' } });
  });

  it('requires an incoming gate before SSH and exposes ignored agent metadata before any request', async () => {
    const missing = await fixture();
    expect(await receiveGitPackOverSsh({ ...missing.request, admitIncomingMetadata: undefined as never })).toMatchObject({ ok: false, code: 'invalid-request', evidence: { groupTermination: 'not-started' } });
    await expect(lstat(missing.receipt)).rejects.toMatchObject({ code: 'ENOENT' }); expect(await readdir(missing.home)).toEqual([]);
    const f = await fixture('sha1', 'custom', undefined, 'git/NONSECRET_SSH_CAPABILITY_CANARY_1907');
    const result = await receiveGitPackOverSsh({ ...f.request, admitIncomingMetadata: value => !value.text.includes('NONSECRET_SSH_CAPABILITY_CANARY_1907') });
    expect(result).toMatchObject({ ok: false, code: 'incoming-metadata-refused', evidence: { protocolVersion: null, incomingMetadata: [] } });
    await expect(lstat(f.requestLog)).rejects.toMatchObject({ code: 'ENOENT' }); expect(JSON.stringify(result)).not.toContain('NONSECRET_SSH_CAPABILITY_CANARY_1907');
  });

  it('gates each complete SSH fetch metadata unit and never returns PACK after denial/throw', async () => {
    for (const unit of ['advertisement', 'fetch-header', 'fetch-end']) for (const throws of [false, true]) {
      const f = await fixture(), seen: string[] = [];
      const result = await receiveGitPackOverSsh({ ...f.request, admitIncomingMetadata: value => {
        seen.push(value.unit); if (value.unit !== unit) return true; if (throws) throw new Error('NONSECRET_PRIVATE_SSH_INGEST_ERROR'); return false;
      } });
      expect(result).toMatchObject({ ok: false, code: 'incoming-metadata-refused', evidence: { groupTermination: 'confirmed' } }); expect('pack' in result).toBe(false);
      expect(seen).toEqual(['advertisement', 'fetch-header', 'fetch-end'].slice(0, ['advertisement', 'fetch-header', 'fetch-end'].indexOf(unit) + 1));
      if (unit === 'advertisement') await expect(lstat(f.requestLog)).rejects.toMatchObject({ code: 'ENOENT' });
      expect(JSON.stringify(result)).not.toContain('NONSECRET_PRIVATE_SSH_INGEST_ERROR');
    }
  });

  it('copies SSH incoming units and screens full ref rows before semantic selection', async () => {
    const f = await fixture(), captured: string[] = []; let prior = '';
    const result = await selectGitRevisionOverSsh({ ...f.request, selector: 'refs/heads/trunk', admitMetadata: () => true, admitIncomingMetadata: value => {
      expect(decodeGitIncomingUnit(value.unit, value.protocol, value.objectFormat, value.rawWire)).toEqual({ parsed: value.parsed, text: value.text, payloadText: value.payloadText, decodedFields: value.decodedFields, composition: value.composition });
      expect(value.cumulativeComposition).toBe(prior + value.composition); prior = value.cumulativeComposition; captured.push(value.unit); value.rawWire.fill(0); return true;
    } });
    expect(result).toMatchObject({ ok: true, selection: { reference: 'refs/heads/trunk', identifier: f.pin } }); expect(captured).toEqual(['advertisement', 'ls-refs']);
    for (const throws of [false, true]) {
      const denied = await fixture();
      const failure = await selectGitRevisionOverSsh({ ...denied.request, selector: 'refs/heads/trunk', admitMetadata: () => true, admitIncomingMetadata: value => { if (value.unit === 'advertisement') return true; if (throws) throw new Error('NONSECRET_PRIVATE_REF_INGEST'); return false; } });
      expect(failure).toMatchObject({ ok: false, code: 'incoming-metadata-refused' }); expect('selection' in failure).toBe(false);
    }
    // Pure selection requires neither incoming admission nor authentication/HOME.
    expect(await selectGitRevisionOverSsh({ url: 'NONSECRET_PURE', selector: 'a'.repeat(40), sourceProvider: 'synthetic', admitMetadata: () => false })).toMatchObject({ ok: true, evidence: { groupTermination: 'not-started' } });
  });
});
