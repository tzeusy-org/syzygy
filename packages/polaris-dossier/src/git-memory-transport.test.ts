import { decodeGitIncomingUnit } from './git-memory-selection.js';
import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmod, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import http from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { sha256 } from '@syzygy/support';
import { GIT_MEMORY_HELPER_PROFILE, gitMemoryTransportTestPort, receiveGitPackInMemory, type GitMemoryRequest, gitMemorySelectionTestPort, selectGitRevisionOverHttps } from './git-memory-transport.js';

const roots: string[] = [];
const servers: http.Server[] = [];
const jobs = new Set<Promise<void>>();
const serverErrors: unknown[] = [];
afterEach(async () => {
  for (const server of servers.splice(0)) { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
  await Promise.allSettled([...jobs]);
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
  expect(serverErrors.splice(0)).toEqual([]);
});
const pkt = (text: string | Buffer): Buffer => {
  const body = Buffer.isBuffer(text) ? text : Buffer.from(text);
  return Buffer.concat([Buffer.from((body.length + 4).toString(16).padStart(4, '0')), body]);
};
async function directories() {
  const root = await mkdtemp(path.join(await realpath(tmpdir()), 'syzygy-memory-transport-test-')); roots.push(root);
  const home = path.join(root, 'recipient-home'); await mkdir(home, { mode: 0o700 });
  return { root, home };
}
async function fixture(format: 'sha1' | 'sha256' = 'sha1') {
  const dirs = await directories(), source = path.join(dirs.root, 'own-synthetic-server.git'), fixtureHome = path.join(dirs.root, 'fixture-home');
  await mkdir(fixtureHome);
  const env = { PATH: '/usr/bin:/bin', HOME: fixtureHome, LC_ALL: 'C', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_AUTHOR_NAME: 'Synthetic Fixture', GIT_AUTHOR_EMAIL: 'fixture@example.invalid', GIT_COMMITTER_NAME: 'Synthetic Fixture', GIT_COMMITTER_EMAIL: 'fixture@example.invalid', GIT_AUTHOR_DATE: '2000-01-01T00:00:00Z', GIT_COMMITTER_DATE: '2000-01-01T00:00:00Z' };
  const git = (args: string[], input?: Buffer | string): Buffer => execFileSync('/usr/bin/git', args, { env, input, timeout: 5000, maxBuffer: 2 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] });
  git(['init', '--bare', '--template=', `--object-format=${format}`, source]);
  const body = Buffer.from('NONSECRET_MEMORY_TRANSPORT_CANARY_1907\n');
  const blob = git([`--git-dir=${source}`, 'hash-object', '-w', '--stdin'], body).toString().trim();
  const tree = git([`--git-dir=${source}`, 'mktree'], `100644 blob ${blob}\tREADME.md\n`).toString().trim();
  const parent = git([`--git-dir=${source}`, 'commit-tree', tree], 'Synthetic base\n').toString().trim();
  const pin = git([`--git-dir=${source}`, 'commit-tree', tree, '-p', parent], 'Synthetic tip\n').toString().trim();
  git([`--git-dir=${source}`, 'update-ref', 'refs/heads/trunk', pin]);
  return { ...dirs, source, pin, parent, body, env, objectFormat: format };
}
type Census = Record<string, { bytes: number; sha256: string }>;
async function census(home: string): Promise<Census> {
  const result: Census = {};
  const walk = async (base: string) => {
    for (const entry of await readdir(base, { withFileTypes: true })) {
      const full = path.join(base, entry.name);
      if (entry.isDirectory()) await walk(full);
      else {
        expect(entry.isFile()).toBe(true);
        const bytes = await readFile(full);
        result[path.relative(home, full)] = { bytes: bytes.length, sha256: sha256(bytes) };
      }
    }
  };
  await walk(home); return result;
}
function independentCensus(home: string): Census {
  const files = execFileSync('/usr/bin/find', [home, '-type', 'f', '-print0'], { timeout: 5000, maxBuffer: 65_536, env: { PATH: '/usr/bin:/bin', LC_ALL: 'C' } }).toString().split('\0').filter(Boolean);
  const result: Census = {};
  for (const full of files) {
    const line = execFileSync('/usr/bin/sha256sum', ['--', full], { timeout: 5000, encoding: 'utf8', env: { PATH: '/usr/bin:/bin', LC_ALL: 'C' } });
    const size = execFileSync('/usr/bin/stat', ['--format=%s', '--', full], { timeout: 5000, encoding: 'utf8', env: { PATH: '/usr/bin:/bin', LC_ALL: 'C' } });
    result[path.relative(home, full)] = { bytes: Number(size.trim()), sha256: line.slice(0, 64) };
  }
  return result;
}
async function serve(f: Awaited<ReturnType<typeof fixture>>, options: { advertisement?: Buffer; response?: Buffer; redirect?: boolean; stall?: boolean } = {}) {
  const calls: { method: string; path: string }[] = [], snapshots: Census[] = [], requests: Buffer[] = [];
  const server = http.createServer((request, response) => {
    calls.push({ method: request.method!, path: request.url! });
    expect(request.headers['git-protocol']).toBe('version=2');
    if (request.method === 'GET') {
      if (options.redirect) { response.writeHead(302, { location: '/forbidden-redirect' }); response.end(); return; }
      if (options.stall) return;
      const data = options.advertisement ?? execFileSync('/usr/bin/git', ['upload-pack', '--stateless-rpc', '--advertise-refs', f.source], { env: { ...f.env, GIT_PROTOCOL: 'version=2' }, timeout: 5000, maxBuffer: 2 * 1024 * 1024 });
      response.writeHead(200, { 'content-type': 'application/x-git-upload-pack-advertisement', 'content-length': data.length }); response.end(data);
      return;
    }
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    request.on('end', () => { const job = (async () => {
      const input = Buffer.concat(chunks);
      requests.push(Buffer.from(input));
      if (input.includes(Buffer.from('command=ls-refs\n'))) expect(input.includes(Buffer.from('want '))).toBe(false);
      else { expect(input.includes(Buffer.from(`want ${f.pin}\n`))).toBe(true); expect(input.includes(Buffer.from('deepen 1\n'))).toBe(true); }
      snapshots.push(await census(f.home));
      expect(independentCensus(f.home)).toEqual(snapshots[0]);
      const output = options.response ?? execFileSync('/usr/bin/git', ['upload-pack', '--stateless-rpc', f.source], { env: { ...f.env, GIT_PROTOCOL: 'version=2' }, input, timeout: 5000, maxBuffer: 2 * 1024 * 1024 });
      response.writeHead(200, { 'content-type': 'application/x-git-upload-pack-result', 'content-length': output.length });
      const middle = Math.floor(output.length / 2); response.write(output.subarray(0, middle));
      await new Promise(resolve => setTimeout(resolve, 30));
      snapshots.push(await census(f.home));
      expect(independentCensus(f.home)).toEqual(snapshots[1]);
      response.end(output.subarray(middle));
    })(); jobs.add(job); void job.catch(error => serverErrors.push(error)).finally(() => jobs.delete(job)); });
  });
  servers.push(server); await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); if (address === null || typeof address === 'string') throw new Error('fixture-listen');
  return { url: `http://127.0.0.1:${address.port}/repo`, calls, snapshots, requests };
}
const DECLARED = { sourceProvider: 'synthetic-source-provider', admitIncomingMetadata: () => true, admitMetadata: () => true };
const nativePort = gitMemoryTransportTestPort({ helper: GIT_MEMORY_HELPER_PROFILE.path, digest: GIT_MEMORY_HELPER_PROFILE.sha256, prlimit: '/usr/bin/prlimit', allowLoopbackHttp: true });
type FixtureRequest = Omit<GitMemoryRequest, 'sourceProvider' | 'admitMetadata' | 'admitIncomingMetadata'> & Partial<Pick<GitMemoryRequest, 'sourceProvider' | 'admitMetadata' | 'admitIncomingMetadata'>>;
const native = (request: FixtureRequest) => nativePort({ ...DECLARED, ...request });
async function fake(home: string, root: string, script: string) {
  const file = path.join(root, 'trusted-synthetic-helper');
  await writeFile(file, `#!${process.execPath}\n${script}\n`); await chmod(file, 0o755);
  return { run: gitMemoryTransportTestPort({ helper: file, digest: sha256(await readFile(file)), prlimit: '/usr/bin/prlimit', allowLoopbackHttp: true }), request: { ...DECLARED, home, url: 'http://127.0.0.1:1/repo', pin: 'a'.repeat(40), objectFormat: 'sha1' } satisfies GitMemoryRequest };
}

describe('memory-only native Git wire reception', () => {
  for (const format of ['sha1', 'sha256'] as const) it(`receives an actual ${format} shallow PACK with no recipient object persistence`, async () => {
    const f = await fixture(format), server = await serve(f);
    const result = await native({ home: f.home, url: server.url, pin: f.pin, objectFormat: format, limits: { milliseconds: 5000 } });
    expect(result.ok, result.ok ? undefined : JSON.stringify(result.evidence)).toBe(true); if (!result.ok) throw new Error(result.code);
    expect(result.shallow).toEqual([f.pin]);
    expect(Buffer.from(result.pack).subarray(0, 4).toString()).toBe('PACK');
    expect(Buffer.from(result.pack).readUInt32BE(8)).toBe(3);
    const trailer = format === 'sha1' ? 20 : 32, bytes = Buffer.from(result.pack);
    expect(createHash(format).update(bytes.subarray(0, -trailer)).digest()).toEqual(bytes.subarray(-trailer));
    expect(result.evidence).toMatchObject({ groupTermination: 'confirmed', metadataUnchanged: true, childRegularFileWriteLimit: 0, childCoreLimit: 0, externalMemorySpillSwapDump: 'Unknown', helper: { sha256: GIT_MEMORY_HELPER_PROFILE.sha256 } });
    const final = await census(f.home);
    expect(Object.keys(final).sort()).toEqual(['metadata.git/HEAD', 'metadata.git/config']);
    expect(server.snapshots).toHaveLength(2);
    for (const snapshot of server.snapshots) expect(snapshot).toEqual(final);
    expect(independentCensus(f.home)).toEqual(final);
    expect(await readdir(path.join(f.home, 'metadata.git/objects'))).toEqual([]);
    expect(await readdir(path.join(f.home, 'tmp'))).toEqual([]);
    expect(server.calls).toEqual([{ method: 'GET', path: '/repo/info/refs?service=git-upload-pack' }, { method: 'POST', path: '/repo/git-upload-pack' }]);
    expect(JSON.stringify(result.evidence)).not.toContain(server.url);
    expect(JSON.stringify(result.evidence)).not.toContain('NONSECRET_MEMORY_TRANSPORT_CANARY_1907');
  });

  it('refuses SSH, plain HTTP and malformed/credentialed locators before starting', async () => {
    const f = await directories();
    for (const url of ['ssh://host/repo', 'git@host:repo', 'http://127.0.0.1:1/repo', 'file:///synthetic', 'https://user:NONSECRET@host/repo']) {
      const result = await receiveGitPackInMemory({ ...DECLARED, home: f.home, url, pin: 'a'.repeat(40), objectFormat: 'sha1' });
      expect(result).toMatchObject({ ok: false, code: 'unsupported-transport', evidence: { groupTermination: 'not-started' } });
      expect(JSON.stringify(result)).not.toContain(url);
    }
    expect(await readdir(f.home)).toEqual([]);
  });

  it('refuses invalid finite bounds and unsupported helper identity without source reception', async () => {
    const f = await directories();
    for (const value of [0, -1, 1.5, NaN, Infinity]) expect(await native({ home: f.home, url: 'http://127.0.0.1:1/repo', pin: 'a'.repeat(40), objectFormat: 'sha1', limits: { packBytes: value } })).toMatchObject({ ok: false, code: 'invalid-request' });
    const wrong = gitMemoryTransportTestPort({ helper: GIT_MEMORY_HELPER_PROFILE.path, digest: '0'.repeat(64), prlimit: '/usr/bin/prlimit', allowLoopbackHttp: true });
    expect(await wrong({ ...DECLARED, home: f.home, url: 'http://127.0.0.1:1/repo', pin: 'a'.repeat(40), objectFormat: 'sha1' })).toMatchObject({ ok: false, code: 'helper-profile-unavailable' });
    expect(await readdir(f.home)).toEqual([]);
    const refused = await native({ home: f.home, url: 'http://127.0.0.1:1/repo', pin: 'a'.repeat(40), objectFormat: 'sha1', limits: { NONSECRET_UNKNOWN_LIMIT: 'NONSECRET_EXCLUDED_OPTION' } as never });
    expect(refused).toMatchObject({ ok: false, code: 'invalid-request' });
    expect(JSON.stringify(refused)).not.toContain('NONSECRET_UNKNOWN_LIMIT');
    expect(JSON.stringify(refused)).not.toContain('NONSECRET_EXCLUDED_OPTION');
  });

  it('requires declared metadata admission and refuses denied/throwing connect before process or GET', async () => {
    for (const admitMetadata of [() => false, () => { throw new Error('NONSECRET_PRIVATE_ADMISSION_DIAGNOSTIC'); }]) {
      const f = await fixture(), server = await serve(f);
      const result = await native({ home: f.home, url: server.url, pin: f.pin, objectFormat: 'sha1', admitMetadata });
      expect(result).toMatchObject({ ok: false, code: 'metadata-admission-refused', evidence: { groupTermination: 'not-started', sentBytes: 0, admittedMetadata: [] } });
      expect(server.calls).toEqual([]);
      expect(JSON.stringify(result)).not.toContain('NONSECRET_PRIVATE_ADMISSION_DIAGNOSTIC');
    }
    const d = await directories();
    expect(await nativePort({ home: d.home, url: 'http://127.0.0.1:1/repo', pin: 'a'.repeat(40), objectFormat: 'sha1' } as GitMemoryRequest)).toMatchObject({ ok: false, code: 'invalid-request' });
  });

  it('refuses denied/throwing fetch admission after GET and before any POST or want bytes', async () => {
    for (const throwOnFetch of [false, true]) {
      const f = await fixture(), server = await serve(f), phases: string[] = [];
      const result = await native({ home: f.home, url: server.url, pin: f.pin, objectFormat: 'sha1', admitMetadata: metadata => {
        phases.push(metadata.stage);
        if (metadata.stage === 'connect') return true;
        if (throwOnFetch) throw new Error('NONSECRET_PRIVATE_FETCH_DIAGNOSTIC');
        return false;
      } });
      expect(result).toMatchObject({ ok: false, code: 'metadata-admission-refused', evidence: { groupTermination: 'confirmed', sentBytes: Buffer.byteLength('capabilities\nstateless-connect git-upload-pack\n') } });
      expect(phases).toEqual(['connect', 'fetch']);
      expect(server.calls).toEqual([{ method: 'GET', path: '/repo/info/refs?service=git-upload-pack' }]);
      expect(JSON.stringify(result)).not.toContain('NONSECRET_PRIVATE_FETCH_DIAGNOSTIC');
    }
  });

  it('snapshots provider/destination/config/wire across awaited callback tampering', async () => {
    const f = await fixture(), server = await serve(f), phases: string[] = [], identities: string[] = [];
    const request: GitMemoryRequest = { ...DECLARED, home: f.home, url: server.url, pin: f.pin, objectFormat: 'sha1', limits: { packBytes: 1024, milliseconds: 5000 }, admitMetadata: async metadata => {
      phases.push(metadata.stage); identities.push(metadata.bindingDigest);
      expect(metadata.sourceProvider).toBe('synthetic-source-provider');
      expect(metadata.url).toBe(server.url);
      expect(metadata.pin).toBe(f.pin);
      expect(metadata.destination).toEqual({ scheme: 'http', host: '127.0.0.1', port: Number(new URL(server.url).port), service: 'git-upload-pack' });
      expect(metadata.classes).toEqual(['code-structure']);
      expect(sha256(metadata.wire)).toBe(metadata.digest);
      expect(Object.isFrozen(metadata.config.environment)).toBe(true);
      expect(Object.isFrozen(metadata.config.args)).toBe(true);
      if (metadata.stage === 'fetch') expect(Buffer.from(metadata.wire).includes(Buffer.from(`want ${f.pin}\n`))).toBe(true);
      metadata.wire.fill(0); // Copy delivered to the port cannot mutate the actual send buffer.
      const mutable = request as { url: string; pin: string; sourceProvider: string; limits: { packBytes: number }; admitMetadata: GitMemoryRequest['admitMetadata'] };
      mutable.url = 'http://127.0.0.1:1/NONSECRET_UNADMITTED_DESTINATION'; mutable.pin = '0'.repeat(40); mutable.sourceProvider = 'unadmitted-provider'; mutable.limits.packBytes = 1; mutable.admitMetadata = () => false;
      await new Promise(resolve => setTimeout(resolve, 1));
      return true;
    } };
    const result = await nativePort(request);
    expect(result.ok).toBe(true);
    expect(phases).toEqual(['connect', 'fetch']);
    expect(result.evidence.admittedMetadata.map(item => item.bindingDigest)).toEqual(identities);
    expect(new Set(identities).size).toBe(2);
    expect(result.evidence.configDigest).toMatch(/^[0-9a-f]{64}$/);
  });

  it('does not follow source URL redirects', async () => {
    const f = await fixture(), server = await serve(f, { redirect: true });
    const result = await native({ home: f.home, url: server.url, pin: f.pin, objectFormat: 'sha1', limits: { milliseconds: 1000 } });
    expect(result.ok).toBe(false);
    expect(server.calls).toEqual([{ method: 'GET', path: '/repo/info/refs?service=git-upload-pack' }]);
  });

  it('refuses unknown helper/server protocol capabilities and another object format', async () => {
    const d = await directories();
    const helper = await fake(d.home, d.root, "process.stdin.once('data',()=>process.stdout.write('stateless-connect\\nunknown-capability\\n\\n'));");
    expect(await helper.run(helper.request)).toMatchObject({ ok: false, code: 'protocol-refused', evidence: { groupTermination: 'confirmed' } });
    for (const advertisement of [
      Buffer.concat([pkt('version 1\n'), Buffer.from('0000')]),
      Buffer.concat([pkt('version 2\n'), pkt('fetch=shallow wait-for-done\n'), pkt('object-format=sha256\n'), Buffer.from('0000')]),
      Buffer.concat([pkt('version 2\n'), pkt('fetch=shallow wait-for-done\n'), pkt('object-format=sha1\n'), pkt('unknown-capability\n'), Buffer.from('0000')]),
    ]) {
      const f = await fixture(), server = await serve(f, { advertisement });
      const result = await native({ home: f.home, url: server.url, pin: f.pin, objectFormat: 'sha1', limits: { milliseconds: 1000 } });
      expect(result.ok).toBe(false);
      expect(server.calls.filter(call => call.method === 'POST')).toHaveLength(0);
    }
  });

  it('refuses malformed framing, a different shallow pin and corrupt PACK before returning bytes', async () => {
    for (const [response, expectedCode] of [
      [Buffer.from('zzzz'), 'protocol-refused'],
      [Buffer.concat([pkt('shallow-info\n'), pkt(`shallow ${'0'.repeat(40)}\n`), Buffer.from('0001'), pkt('packfile\n'), Buffer.from('00000002')]), 'protocol-refused'],
      [Buffer.concat([pkt('shallow-info\n'), pkt('REPLACE_PIN'), Buffer.from('0001'), pkt('packfile\n'), pkt(Buffer.concat([Buffer.from([1]), Buffer.from('PACK'), Buffer.from([0, 0, 0, 2, 0, 0, 0, 0]), Buffer.alloc(20)])), Buffer.from('0000')]), 'pack-refused'],
    ] as const) {
      const f = await fixture();
      const replaced = Buffer.from(response.toString('latin1').replace(pkt('REPLACE_PIN').toString('latin1'), pkt(`shallow ${f.pin}`).toString('latin1')), 'latin1');
      const server = await serve(f, { response: replaced });
      const result = await native({ home: f.home, url: server.url, pin: f.pin, objectFormat: 'sha1', limits: { milliseconds: 1000 } });
      expect(result.ok).toBe(false); expect('pack' in result).toBe(false);
      expect(result, JSON.stringify(result.evidence)).toMatchObject({ code: expectedCode });
      expect(result.evidence.groupTermination).toBe('confirmed');
    }
  });

  it('enforces PACK/wire caps and never returns raw failed response or diagnostics', async () => {
    const f = await fixture(), server = await serve(f);
    expect(await native({ home: f.home, url: server.url, pin: f.pin, objectFormat: 'sha1', limits: { packBytes: 16, milliseconds: 1000 } })).toMatchObject({ ok: false, code: 'pack-limit', evidence: { groupTermination: 'confirmed' } });
    const d = await directories();
    const helper = await fake(d.home, d.root, "process.stdout.write('NONSECRET_RAW_FAILED_OUTPUT'.repeat(100));process.stderr.write('NONSECRET_DIAGNOSTIC');setInterval(()=>{},1000);");
    const result = await helper.run({ ...helper.request, limits: { wireBytes: 64, milliseconds: 1000 } });
    expect(result).toMatchObject({ ok: false, code: 'wire-limit', evidence: { groupTermination: 'confirmed' } });
    expect(JSON.stringify(result)).not.toContain('NONSECRET_RAW_FAILED_OUTPUT'); expect(JSON.stringify(result)).not.toContain('NONSECRET_DIAGNOSTIC');
  });

  it('kills an uncooperative helper at the wall deadline and refuses a stalled native endpoint', async () => {
    const d = await directories();
    const helper = await fake(d.home, d.root, "process.on('SIGTERM',()=>{});setInterval(()=>{},1000);");
    const result = await helper.run({ ...helper.request, limits: { milliseconds: 150 } });
    expect(result).toMatchObject({ ok: false, code: 'process-deadline', evidence: { signal: 'SIGKILL', groupTermination: 'confirmed' } });
    expect(result.evidence.durationMilliseconds).toBeLessThan(2500);
    const f = await fixture(), server = await serve(f, { stall: true });
    expect(await native({ home: f.home, url: server.url, pin: f.pin, objectFormat: 'sha1', limits: { milliseconds: 200 } })).toMatchObject({ ok: false, code: 'process-deadline', evidence: { groupTermination: 'confirmed' } });
  });

  it('denies helper body writes with inherited hard fsize0 and detects added recipient entries', async () => {
    const d = await directories(), target = path.join(d.home, 'tmp', 'NONSECRET-spill-canary');
    const helper = await fake(d.home, d.root, `const fs=require('node:fs');try{fs.writeFileSync(${JSON.stringify(target)},'NONSECRET_BODY_WRITE_CANARY_1907')}catch(e){if(e.code!=='EFBIG')process.exit(9)}process.stdout.write('unsupported\\n\\n');`);
    const result = await helper.run(helper.request);
    expect(result).toMatchObject({ ok: false, code: 'metadata-changed' });
    expect((await lstat(target)).size).toBe(0);
    const control = path.join(d.root, 'own-nonsecret-write-control');
    execFileSync('/usr/bin/prlimit', ['--core=0:0', '--fsize=1024:1024', '--', process.execPath, '-e', `require('node:fs').writeFileSync(${JSON.stringify(control)},'NONSECRET_BODY_WRITE_CANARY_1907')`], { env: { PATH: '/usr/bin:/bin', HOME: d.home }, timeout: 1000 });
    expect(await readFile(control, 'utf8')).toBe('NONSECRET_BODY_WRITE_CANARY_1907');
    expect(independentCensus(d.home)['tmp/NONSECRET-spill-canary']!.bytes).toBe(0);
  });

  for (const format of ['sha1', 'sha256'] as const) it(`selects actual ${format} remote HEAD with one native advertisement and admitted ls-refs`, async () => {
    const f = await fixture(format);
    execFileSync('/usr/bin/git', [`--git-dir=${f.source}`, 'symbolic-ref', 'HEAD', 'refs/heads/trunk'], { env: f.env, timeout: 1000 });
    const server = await serve(f), stages: string[] = [], formats: unknown[] = [];
    const select = gitMemorySelectionTestPort({ helper: GIT_MEMORY_HELPER_PROFILE.path, digest: GIT_MEMORY_HELPER_PROFILE.sha256, prlimit: '/usr/bin/prlimit', allowLoopbackHttp: true });
    const result = await select({ url: server.url, home: f.home, sourceProvider: 'synthetic-source-provider', admitIncomingMetadata: () => true, limits: { milliseconds: 5000 }, admitMetadata: value => { stages.push(value.stage); formats.push(value.objectFormat); expect(value.selector).toBeNull(); expect('pin' in value).toBe(false); return true; } });
    expect(result, JSON.stringify(result.evidence)).toMatchObject({ ok: true, selection: { mode: 'remote-default', reference: 'refs/heads/trunk', identifier: f.pin, objectFormat: format }, evidence: { packBytes: 0, metadataUnchanged: true, groupTermination: 'confirmed' } });
    expect(stages).toEqual(['connect', 'ls-refs']); expect(formats).toEqual([null, format]);
    expect(server.calls).toEqual([{ method: 'GET', path: '/repo/info/refs?service=git-upload-pack' }, { method: 'POST', path: '/repo/git-upload-pack' }]);
    expect(server.requests).toHaveLength(1); expect(server.requests[0]!.includes(Buffer.from('command=ls-refs\n'))).toBe(true); expect(server.requests[0]!.includes(Buffer.from('want '))).toBe(false);
    expect(await readdir(path.join(f.home, 'metadata.git/objects'))).toEqual([]); expect(independentCensus(f.home)).toEqual(await census(f.home));
  });

  it('resolves full pins without HOME/helper/network or reinterpreting a tag object', async () => {
    let called = false;
    for (const pin of ['a'.repeat(40), 'b'.repeat(64)]) {
      const result = await selectGitRevisionOverHttps({ url: 'NONSECRET_NO_NETWORK_LOCATOR', selector: pin.toUpperCase(), sourceProvider: 'synthetic-source-provider', admitIncomingMetadata: () => true, admitMetadata: () => { called = true; return false; } });
      expect(result).toMatchObject({ ok: true, selection: { mode: 'full-commit', reference: null, identifier: pin, objectFormat: pin.length === 64 ? 'sha256' : 'sha1' }, evidence: { helper: null, groupTermination: 'not-started', sentBytes: 0 } });
    }
    expect(called).toBe(false);
  });

  it('captures default drift afresh and selects only exact branch/tag metadata', async () => {
    const f = await fixture(), select = gitMemorySelectionTestPort({ helper: GIT_MEMORY_HELPER_PROFILE.path, digest: GIT_MEMORY_HELPER_PROFILE.sha256, prlimit: '/usr/bin/prlimit', allowLoopbackHttp: true });
    const git = (args: string[]) => execFileSync('/usr/bin/git', [`--git-dir=${f.source}`, ...args], { env: f.env, timeout: 1000 });
    git(['symbolic-ref', 'HEAD', 'refs/heads/trunk']);
    const server = await serve(f);
    const request = { url: server.url, home: f.home, sourceProvider: 'synthetic-source-provider', admitIncomingMetadata: () => true, admitMetadata: () => true, limits: { milliseconds: 3000 } };
    expect(await select(request)).toMatchObject({ ok: true, selection: { reference: 'refs/heads/trunk', identifier: f.pin } });
    git(['update-ref', 'refs/heads/next-default', f.parent]); git(['symbolic-ref', 'HEAD', 'refs/heads/next-default']); git(['update-ref', 'refs/tags/trunk', f.parent]);
    const fresh = async () => { const home = path.join(f.root, `fresh-${Math.random()}`); await mkdir(home); return { ...request, home }; };
    expect(await select(await fresh())).toMatchObject({ ok: true, selection: { reference: 'refs/heads/next-default', identifier: f.parent } });
    expect(await select({ ...await fresh(), selector: 'trunk' })).toMatchObject({ ok: false, code: 'ref-ambiguous' });
    expect(await select({ ...await fresh(), selector: 'refs/heads/trunk' })).toMatchObject({ ok: true, selection: { reference: 'refs/heads/trunk', identifier: f.pin } });
    expect(server.calls.filter(value => value.method === 'GET')).toHaveLength(4); expect(server.calls.filter(value => value.method === 'POST')).toHaveLength(4);
    expect(server.requests.every(wire => !wire.includes(Buffer.from('want ')))).toBe(true);
  });

  it('gates native selection connect and ls-refs independently before their network effects', async () => {
    const select = gitMemorySelectionTestPort({ helper: GIT_MEMORY_HELPER_PROFILE.path, digest: GIT_MEMORY_HELPER_PROFILE.sha256, prlimit: '/usr/bin/prlimit', allowLoopbackHttp: true });
    for (const part of ['connect', 'ls-refs']) for (const throws of [false, true]) {
      const f = await fixture(), server = await serve(f);
      const result = await select({ url: server.url, home: f.home, sourceProvider: 'synthetic-source-provider', admitIncomingMetadata: () => true, limits: { milliseconds: 2000 }, admitMetadata: value => { if (value.stage !== part) return true; if (throws) throw new Error('NONSECRET_PRIVATE_SELECTION_ERROR'); return false; } });
      expect(result).toMatchObject({ ok: false, code: 'metadata-admission-refused', evidence: { groupTermination: part === 'connect' ? 'not-started' : 'confirmed' } });
      expect(server.calls.map(value => value.method)).toEqual(part === 'connect' ? [] : ['GET']); expect(server.requests).toEqual([]);
      expect(JSON.stringify(result)).not.toContain('NONSECRET_PRIVATE_SELECTION_ERROR');
    }
  });

  it('snapshots selection selector/destination and copies exact ls-refs bytes across awaited mutations', async () => {
    const f = await fixture(), server = await serve(f), wires: Buffer[] = [];
    const select = gitMemorySelectionTestPort({ helper: GIT_MEMORY_HELPER_PROFILE.path, digest: GIT_MEMORY_HELPER_PROFILE.sha256, prlimit: '/usr/bin/prlimit', allowLoopbackHttp: true });
    const request = { url: server.url, home: f.home, selector: 'refs/heads/trunk', sourceProvider: 'synthetic-source-provider', admitIncomingMetadata: () => true, limits: { milliseconds: 3000 }, admitMetadata: async (value: import('./git-memory-selection.js').GitSelectionMetadata): Promise<boolean> => {
      expect(value.selector).toBe('refs/heads/trunk'); expect(value.url).toBe(server.url); expect(Object.isFrozen(value.plan)).toBe(true);
      expect(sha256(value.wire)).toBe(value.digest); wires.push(Buffer.from(value.wire)); value.wire.fill(0);
      request.url = 'http://127.0.0.1:1/UNADMITTED'; request.selector = 'refs/heads/UNADMITTED'; request.sourceProvider = 'unadmitted'; await new Promise(resolve => setTimeout(resolve, 1)); return true;
    } };
    const result = await select(request); expect(result).toMatchObject({ ok: true, selection: { reference: 'refs/heads/trunk', identifier: f.pin } });
    expect(server.requests).toEqual([wires[1]]);
  });

  it('refuses unknown reference attributes/mixed format and respects selection deadline/bounds', async () => {
    const select = gitMemorySelectionTestPort({ helper: GIT_MEMORY_HELPER_PROFILE.path, digest: GIT_MEMORY_HELPER_PROFILE.sha256, prlimit: '/usr/bin/prlimit', allowLoopbackHttp: true });
    for (const row of [`${'a'.repeat(40)} HEAD symref-target:refs/heads/trunk unknown:NONSECRET\n`, `${'b'.repeat(64)} HEAD symref-target:refs/heads/trunk\n`]) {
      const f = await fixture(), server = await serve(f, { response: Buffer.concat([pkt(row), Buffer.from('0000')]) });
      expect(await select({ url: server.url, home: f.home, sourceProvider: 'synthetic-source-provider', admitIncomingMetadata: () => true, admitMetadata: () => true, limits: { milliseconds: 1000 } })).toMatchObject({ ok: false, code: 'protocol-refused', evidence: { packBytes: 0 } });
    }
    const f = await fixture(), server = await serve(f, { stall: true });
    expect(await select({ url: server.url, home: f.home, sourceProvider: 'synthetic-source-provider', admitIncomingMetadata: () => true, admitMetadata: () => true, limits: { milliseconds: 200 } })).toMatchObject({ ok: false, code: 'process-deadline', evidence: { groupTermination: 'confirmed' } });
  });

  it('refuses supported incoming agent canary before dependent fetch', async () => {
    const f = await fixture();
    const advertisement = Buffer.concat([pkt('version 2\n'), pkt('agent=git/NONSECRET_INCOMING_CAPABILITY_CANARY_1907\n'), pkt('ls-refs=unborn\n'), pkt('fetch=shallow wait-for-done\n'), pkt('server-option\n'), pkt('object-format=sha1\n'), Buffer.from('0000')]);
    const server = await serve(f, { advertisement });
    const result = await native({ home: f.home, url: server.url, pin: f.pin, objectFormat: 'sha1', limits: { milliseconds: 3000 }, admitIncomingMetadata: value => !value.text.includes('NONSECRET_INCOMING_CAPABILITY_CANARY_1907') });
    expect(result).toMatchObject({ ok: false, code: 'incoming-metadata-refused', evidence: { protocolVersion: null, incomingMetadata: [] } });
    expect(server.calls.map(value => value.method)).toEqual(['GET']);
    expect(JSON.stringify(result.evidence)).not.toContain('NONSECRET_INCOMING_CAPABILITY_CANARY_1907');
  });

  it('requires incoming admission before networking and screens each complete fetch metadata unit', async () => {
    const absent = await fixture(), absentServer = await serve(absent);
    expect(await native({ home: absent.home, url: absentServer.url, pin: absent.pin, objectFormat: 'sha1', admitIncomingMetadata: undefined as never })).toMatchObject({ ok: false, code: 'invalid-request', evidence: { groupTermination: 'not-started' } });
    expect(absentServer.calls).toEqual([]); expect(await readdir(absent.home)).toEqual([]);
    for (const unit of ['advertisement', 'fetch-header', 'fetch-end']) for (const throws of [false, true]) {
      const f = await fixture(), server = await serve(f), observed: string[] = [];
      const result = await native({ home: f.home, url: server.url, pin: f.pin, objectFormat: 'sha1', limits: { milliseconds: 2000 }, admitIncomingMetadata: value => {
        observed.push(value.unit); if (value.unit !== unit) return true; if (throws) throw new Error('NONSECRET_PRIVATE_INGEST_ERROR'); return false;
      } });
      expect(result).toMatchObject({ ok: false, code: 'incoming-metadata-refused', evidence: { groupTermination: 'confirmed' } }); expect('pack' in result).toBe(false);
      expect(observed).toEqual(['advertisement', 'fetch-header', 'fetch-end'].slice(0, ['advertisement', 'fetch-header', 'fetch-end'].indexOf(unit) + 1));
      expect(server.calls.map(value => value.method)).toEqual(unit === 'advertisement' ? ['GET'] : ['GET', 'POST']);
      expect(JSON.stringify(result)).not.toContain('NONSECRET_PRIVATE_INGEST_ERROR');
    }
  });

  it('exposes raw capability fields and compositions to synthetic split detectors before use', async () => {
    const f = await fixture();
    const advertisement = Buffer.concat([pkt('version 2\n'), pkt('agent=git/NONSECRET_JOIN\n'), pkt('object-format=sha1\n'), pkt('fetch=shallow wait-for-done\n'), pkt('ls-refs=unborn\n'), Buffer.from('0000')]);
    const server = await serve(f, { advertisement }); let captured: import('./git-memory-selection.js').GitIncomingMetadata | undefined;
    const result = await native({ home: f.home, url: server.url, pin: f.pin, objectFormat: 'sha1', admitIncomingMetadata: value => {
      captured = value; return !value.composition.includes('NONSECRET_JOINobject-formatsha1');
    } });
    expect(captured?.text).not.toContain('NONSECRET_JOINobject-formatsha1'); expect(captured?.composition).toContain('NONSECRET_JOINobject-formatsha1');
    expect(captured?.parsed).toMatchObject({ kind: 'advertisement', agent: 'git/NONSECRET_JOIN' });
    expect(result).toMatchObject({ ok: false, code: 'incoming-metadata-refused' }); expect(server.calls.map(value => value.method)).toEqual(['GET']);
  });

  it('copies complete incoming metadata and binds cumulative decoded history without exposing PACK', async () => {
    const f = await fixture(), server = await serve(f), seen: import('./git-memory-selection.js').GitIncomingMetadata[] = [];
    let payloads = '', compositions = '';
    const result = await native({ home: f.home, url: server.url, pin: f.pin, objectFormat: 'sha1', admitIncomingMetadata: value => {
      expect(value.sourceProvider).toBe('synthetic-source-provider'); expect(value.url).toBe(server.url); expect(value.operation).toBe('receive');
      expect(value.pin).toBe(f.pin); expect(value.objectFormat).toBe('sha1'); expect(sha256(value.rawWire)).toBe(value.digest);
      expect(decodeGitIncomingUnit(value.unit, value.protocol, value.objectFormat, value.rawWire)).toEqual({ parsed: value.parsed, text: value.text, payloadText: value.payloadText, decodedFields: value.decodedFields, composition: value.composition });
      payloads += value.payloadText; compositions += value.composition; expect(value.cumulativeText).toBe(payloads); expect(value.cumulativeComposition).toBe(compositions);
      expect(value.previousBindingDigest).toBe(seen.at(-1)?.bindingDigest ?? null); expect(Object.isFrozen(value.parsed)).toBe(true); expect(Object.isFrozen(value.decodedFields)).toBe(true);
      expect(Buffer.from(value.rawWire).includes(Buffer.from('PACK'))).toBe(false); seen.push(value); value.rawWire.fill(0); return true;
    } });
    expect(result.ok).toBe(true); expect(seen.map(value => value.unit)).toEqual(['advertisement', 'fetch-header', 'fetch-end']);
    expect(result.evidence.incomingMetadata.map(value => value.bindingDigest)).toEqual(seen.map(value => value.bindingDigest));
  });

  it('admits full reference metadata before selecting and provides cross-unit compositions', async () => {
    const select = gitMemorySelectionTestPort({ helper: GIT_MEMORY_HELPER_PROFILE.path, digest: GIT_MEMORY_HELPER_PROFILE.sha256, prlimit: '/usr/bin/prlimit', allowLoopbackHttp: true });
    for (const throws of [false, true]) {
      const f = await fixture(), server = await serve(f); let previous = '';
      const result = await select({ url: server.url, home: f.home, selector: 'refs/heads/trunk', sourceProvider: 'synthetic-source-provider', admitMetadata: () => true, admitIncomingMetadata: value => {
        if (value.unit === 'advertisement') { previous = value.composition; return true; }
        expect(value.unit).toBe('ls-refs'); expect(value.parsed).toMatchObject({ kind: 'ls-refs', rows: [{ identifier: f.pin, reference: 'refs/heads/trunk', attributes: [] }] });
        expect(value.cumulativeComposition).toBe(previous + value.composition); if (throws) throw new Error('NONSECRET_PRIVATE_REF_ERROR'); return false;
      } });
      expect(result).toMatchObject({ ok: false, code: 'incoming-metadata-refused', evidence: { incomingMetadata: [{ unit: 'advertisement' }] } }); expect('selection' in result).toBe(false);
      expect(server.requests).toHaveLength(1); expect(JSON.stringify(result)).not.toContain('NONSECRET_PRIVATE_REF_ERROR');
    }
  });

  it('refuses unrequested progress rather than discarding unscreened peer strings', async () => {
    const f = await fixture();
    const response = Buffer.concat([pkt('shallow-info\n'), pkt(`shallow ${f.pin}`), Buffer.from('0001'), pkt('packfile\n'), pkt(Buffer.from('\u0002NONSECRET_UNSUPPORTED_PROGRESS\n')), Buffer.from('0000')]);
    const server = await serve(f, { response });
    const result = await native({ home: f.home, url: server.url, pin: f.pin, objectFormat: 'sha1' });
    expect(result).toMatchObject({ ok: false, code: 'protocol-refused' }); expect('pack' in result).toBe(false); expect(JSON.stringify(result)).not.toContain('NONSECRET_UNSUPPORTED_PROGRESS');
  });
});
