import * as fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { buildSync } from 'esbuild';
import { beforeAll, describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { sha256 } from '@syzygy/support';
import { policyFixture } from './full-run.testkit.js';
import { runGitMemoryWorker, GIT_MEMORY_WORKER_BUNDLE_BANNER, type GitMemoryWorkerProgram, type GitMemoryWorkerRequest, type GitMemoryWorkerAudit } from './git-memory-worker.js';

const SOURCE = fileURLToPath(new URL('./git-memory-worker.ts', import.meta.url));
let program: GitMemoryWorkerProgram;
beforeAll(() => {
  const bundle = path.join(tempDir('memory-worker-program-'), 'worker.mjs');
  buildSync({ entryPoints: [SOURCE], bundle: true, platform: 'node', format: 'esm', conditions: ['source'], banner: { js: GIT_MEMORY_WORKER_BUNDLE_BANNER }, outfile: bundle });
  program = { bundle, bundleSha256: sha256(fs.readFileSync(bundle)), node: fs.realpathSync(process.execPath), nodeSha256: sha256(fs.readFileSync(process.execPath)) };
});
function fixture(format: 'sha1' | 'sha256' = 'sha1', body = 'Own safe worker documentation.\n') {
  const object = (type: 'commit' | 'tree' | 'blob', bytes: string | Buffer) => {
    const content = Buffer.from(bytes); return { type, body: content, oid: createHash(format).update(`${type} ${content.length}\0`).update(content).digest('hex') };
  };
  const blob = object('blob', body), tree = object('tree', Buffer.concat([Buffer.from('100644 README.md\0'), Buffer.from(blob.oid, 'hex')]));
  const commit = object('commit', `tree ${tree.oid}\nauthor Own Fixture <own@example.invalid> 946684800 +0000\ncommitter Own Fixture <own@example.invalid> 946684800 +0000\n\nOwn synthetic worker fixture.\n`);
  const objects = [commit, tree, blob], header = Buffer.alloc(12); header.write('PACK'); header.writeUInt32BE(2, 4); header.writeUInt32BE(3, 8);
  const entries = objects.map(o => {
    let size = o.body.length; const bytes = [({ commit: 1, tree: 2, blob: 3 }[o.type] << 4) | (size & 15)]; size = Math.floor(size / 16);
    while (size) { bytes[bytes.length - 1]! |= 128; bytes.push(size & 127); size = Math.floor(size / 128); }
    return Buffer.concat([Buffer.from(bytes), deflateSync(o.body)]);
  });
  const prefix = Buffer.concat([header, ...entries]), pack = Buffer.concat([prefix, createHash(format).update(prefix).digest()]);
  const parent = path.join(tempDir('memory-worker-source-'), 'destination'); fs.mkdirSync(parent, { mode: 0o700 });
  const policyBytes = policyFixture().bytes;
  const events: GitMemoryWorkerAudit[] = [];
  const request: GitMemoryWorkerRequest = { program, parent, pack, selectedCommit: commit.oid, shallow: [commit.oid], objectFormat: format, policyBytes, visibility: 'private',
    binding: { run: 'own-worker', acquisition: 'own-capture', sourceBinding: 'a'.repeat(64), policySha256: sha256(policyBytes), originPolicySha256: 'e'.repeat(64) },
    current: () => true, audit: event => { if (event.stage !== 'worker-refused') expect(fs.readdirSync(parent)).toEqual([]); events.push(event); } };
  return { request, events, blob: blob.oid, body };
}

describe('bounded same-realm acquisition worker', () => {
  it.each(['sha1', 'sha256'] as const)('admits and independently reads an exact %s closure only after parent audit', async format => {
    const f = fixture(format), original = Buffer.from(f.request.pack);
    const result = await runGitMemoryWorker(f.request);
    expect(result, JSON.stringify(result)).toHaveProperty('ok', true); if (!result.ok) return;
    expect(f.request.pack).toEqual(original);
    expect(f.events).toHaveLength(1); expect(f.events[0]!.stage).toBe('whole-closure-admitted');
    expect(result.summary).toMatchObject({ termination: 'confirmed', stage: 'finished', aggregateEnforcement: 'sampled-stop-only', betweenSamples: 'Unknown' });
    const contents = execFileSync('/usr/bin/git', ['--git-dir', path.join(result.store.clone, '.git'), 'cat-file', 'blob', f.blob],
      { env: { PATH: '/usr/bin:/bin', LANG: 'C', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    expect(contents).toBe(f.body); expect(fs.readdirSync(result.store.clone)).toEqual(['.git']);
  });
  it('rechecks the binding after worker exit and the final directory census before accepting the clone', async () => {
    const f = fixture(); let stale = false, scheduled = false;
    const result = await runGitMemoryWorker({ ...f.request, current: () => {
      const clone = fs.readdirSync(f.request.parent).find(name => name.startsWith('clone-'));
      if (!scheduled && clone && fs.existsSync(path.join(f.request.parent, clone, '.git', 'HEAD'))) {
        scheduled = true; setTimeout(() => { stale = true; }, 1);
      }
      return !stale;
    } });
    expect(scheduled).toBe(true); expect(result).toHaveProperty('code', 'worker-binding-stale');
    expect(result.summary.storage).toBe('admitted-possible'); expect(fs.readdirSync(f.request.parent)).toHaveLength(1);
  });
  it('refuses an excluded whole closure before source writes and audits only protected hashes', async () => {
    const secret = 'AKIA' + 'A'.repeat(16), f = fixture('sha1', secret); let audited = false;
    const result = await runGitMemoryWorker({ ...f.request, audit: async event => {
      await new Promise(r => setTimeout(r, 150)); audited = true; f.events.push(event); expect(fs.readdirSync(f.request.parent)).toEqual([]);
    } });
    expect(result.ok).toBe(false); expect(audited).toBe(true); expect(fs.readdirSync(f.request.parent)).toEqual([]);
    expect(f.events).toHaveLength(1); expect(f.events[0]!.stage).toBe('acquisition-excluded');
    expect(f.events[0]!.exclusions[0]).toMatchObject({ species: 'blob-alias', contentSha256: sha256(secret), outcome: 'secret-detector-match' });
    expect(JSON.stringify(result)).not.toContain(secret); expect(JSON.stringify(result)).not.toContain(f.request.selectedCommit); expect(JSON.stringify(result)).not.toContain(sha256(secret));
  });
  it('refuses changed policy/program bindings, malformed packs and higher limits without acquiring storage authority', async () => {
    for (const kind of ['policy', 'program', 'pack', 'shallow', 'limits'] as const) {
      const f = fixture(); const request = kind === 'policy' ? { ...f.request, policyBytes: Buffer.from('{}') }
        : kind === 'program' ? { ...f.request, program: { ...program, bundleSha256: 'f'.repeat(64) } }
          : kind === 'pack' ? { ...f.request, pack: Buffer.alloc(40) } : kind === 'shallow' ? { ...f.request, shallow: [] } : { ...f.request, limits: { cpuSeconds: 11 } };
      expect((await runGitMemoryWorker(request)).ok).toBe(false); expect(fs.readdirSync(f.request.parent)).toEqual([]); if (kind === 'pack') expect(f.events).toMatchObject([{ stage: 'worker-refused' }]); else expect(f.events).toEqual([]);
    }
  });
  it('refuses stale binding and failed or delayed audit before ACK and any store write', async () => {
    for (const kind of ['stale', 'failed', 'blocked'] as const) {
      const f = fixture(); let current = true;
      const result = await runGitMemoryWorker({ ...f.request, limits: { wallMilliseconds: 400 }, current: () => current,
        audit: async () => { expect(fs.readdirSync(f.request.parent)).toEqual([]); if (kind === 'stale') current = false;
          if (kind === 'failed') throw new Error('NONSECRET-unsafe-audit-error'); if (kind === 'blocked') await new Promise(() => undefined); } });
      expect(result.ok).toBe(false); expect(fs.readdirSync(f.request.parent)).toEqual([]); expect(result.summary.termination).toBe('confirmed');
      expect(JSON.stringify(result)).not.toContain('NONSECRET-unsafe-audit-error');
    }
  });
  it('enforces the post-ACK binding before store mutation and hard per-file/storage bounds', async () => {
    const stale = fixture(); let checks = 0;
    const r = await runGitMemoryWorker({ ...stale.request, current: () => ++checks <= 4 });
    expect(r.ok).toBe(false); expect(fs.readdirSync(stale.request.parent)).toEqual([]);
    const file = fixture(); const result = await runGitMemoryWorker({ ...file.request, limits: { fileBytes: 8 } });
    expect(result.ok).toBe(false); expect(result.summary.storage).toBe('admitted-possible'); expect(result.summary.termination).toBe('confirmed');
    for (const name of fs.readdirSync(file.request.parent, { recursive: true })) {
      const p = path.join(file.request.parent, String(name)); if (fs.statSync(p).isFile()) expect(fs.statSync(p).size).toBeLessThanOrEqual(8);
    }
    const aggregate = fixture(); expect((await runGitMemoryWorker({ ...aggregate.request, limits: { directoryBytes: 1 } })).ok).toBe(false);
  });
  it('bounds an unresolved initial current check and cancellation without starting the worker', async () => {
    const f = fixture(), began = performance.now();
    expect((await runGitMemoryWorker({ ...f.request, limits: { wallMilliseconds: 50 }, current: () => new Promise(() => undefined) })).ok).toBe(false);
    expect(performance.now() - began).toBeLessThan(1500); expect(fs.readdirSync(f.request.parent)).toEqual([]);
    const controller = new AbortController(); controller.abort();
    expect(await runGitMemoryWorker({ ...f.request, signal: controller.signal })).toMatchObject({ ok: false, summary: { stage: 'not-started', termination: 'not-started' } });
  });
});

/** This oracle observes positive regular-file write syscalls continuously. A
 * final directory census cannot see the deliberately written-and-deleted body. */
describe('independent worker effects and resource falsifiers', () => {
  it('detects a transient pre-admission source write that a final census misses', () => {
    const root = tempDir('memory-worker-effects-'), source = fs.readFileSync(SOURCE, 'utf8');
    const injection = `if (!decoded.ok) throw new Error();
      const transient = path.join(v.parent, 'pre-admission-transient');
      const file = await open(transient, constants.O_CREAT | constants.O_WRONLY | constants.O_EXCL, 0o600);
      try { await file.writeFile(decoded.pack.objects.find(o => o.type === 'blob')!.body); }
      finally { await file.close(); await unlink(transient); }`;
    const attempted = source.replace('lstat, open, readdir, realpath', 'lstat, open, readdir, realpath, unlink')
      .replace('if (!decoded.ok) throw new Error();', injection);
    expect(attempted).not.toBe(source);
    const bypassed = attempted.replace('`--fsize=0:${limits.fileBytes}`', '`--fsize=${limits.fileBytes}:${limits.fileBytes}`');
    expect(bypassed).not.toBe(attempted);
    const captures: { name: string; earlyWrites: number; bodyWrites: number; transientPresent: boolean; ok: boolean; blocked: boolean }[] = [];
    for (const [name, code] of [['clean', source], ['blocked-attempt', attempted], ['transient-mutant', bypassed]]) {
      const own = path.join(root, name!); fs.mkdirSync(own); const bundle = path.join(own, 'worker.mjs'); fs.writeFileSync(path.join(own, 'subject.ts'), code!);
      buildSync({ stdin: { contents: code!, resolveDir: path.dirname(SOURCE), sourcefile: SOURCE, loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', conditions: ['source'], banner: { js: GIT_MEMORY_WORKER_BUNDLE_BANNER }, outfile: bundle });
      const parent = path.join(own, 'destination'); fs.mkdirSync(parent, { mode: 0o700 });
      const marker = path.join(own, 'audit-marker'), trace = path.join(own, 'effects.trace'), driver = path.join(own, 'driver.mjs');
      const trusted = { ...program, bundle, bundleSha256: sha256(fs.readFileSync(bundle)) };
      fs.writeFileSync(driver, `import * as fs from 'node:fs'; import { createHash } from 'node:crypto'; import { deflateSync } from 'node:zlib';
import { runGitMemoryWorker } from ${JSON.stringify(pathToFileURL(bundle).href)};
const object = (type, body) => { body=Buffer.from(body);return {type,body,oid:createHash('sha1').update(type+' '+body.length+'\\0').update(body).digest('hex')}; };
const blob=object('blob','Own continuous-effects source fixture.\\n');
const tree=object('tree',Buffer.concat([Buffer.from('100644 README.md\\0'),Buffer.from(blob.oid,'hex')]));
const commit=object('commit','tree '+tree.oid+'\\nauthor Own Fixture <own@example.invalid> 946684800 +0000\\ncommitter Own Fixture <own@example.invalid> 946684800 +0000\\n\\nOwn effects fixture.\\n');
const header=Buffer.alloc(12);header.write('PACK');header.writeUInt32BE(2,4);header.writeUInt32BE(3,8);
const entries=[commit,tree,blob].map(o=>{let n=o.body.length;const bytes=[({commit:1,tree:2,blob:3}[o.type]<<4)|(n&15)];n=Math.floor(n/16);while(n){bytes[bytes.length-1]|=128;bytes.push(n&127);n=Math.floor(n/128);}return Buffer.concat([Buffer.from(bytes),deflateSync(o.body)]);});
const prefix=Buffer.concat([header,...entries]),pack=Buffer.concat([prefix,createHash('sha1').update(prefix).digest()]);
const policyBytes=Buffer.from(${JSON.stringify(Buffer.from(policyFixture().bytes).toString('base64'))},'base64');
const result=await runGitMemoryWorker({program:${JSON.stringify(trusted)},parent:${JSON.stringify(parent)},pack,objectFormat:'sha1',selectedCommit:commit.oid,shallow:[commit.oid],policyBytes,visibility:'private',binding:{run:'own-effects',acquisition:'own-capture',sourceBinding:'a'.repeat(64),policySha256:createHash('sha256').update(policyBytes).digest('hex'),originPolicySha256:'e'.repeat(64)},current:()=>true,audit:event=>{if(event.stage==='whole-closure-admitted')fs.writeFileSync(${JSON.stringify(marker)},'ACK\\n',{mode:0o600});}});
process.stdout.write(JSON.stringify(result));`);
      const result = JSON.parse(execFileSync('/usr/bin/strace', ['-f', '-qq', '-yy', '-s', '0', '-e', 'trace=write,writev,pwrite64,pwritev,openat,unlink,unlinkat', '-o', trace, process.execPath, driver],
        { env: { PATH: '/usr/bin:/bin', LANG: 'C', LC_ALL: 'C' }, encoding: 'utf8', timeout: 10_000, maxBuffer: 65_536 }));
      const lines = completeTrace(fs.readFileSync(trace, 'utf8').split('\n')), markerAt = lines.findIndex(line => line.includes(`<${marker}>`) && /\bwrite\(/u.test(line) && /\)\s*=\s*[1-9][0-9]*$/u.test(line));
      const writes = lines.map((line, index) => ({ line, index })).filter(({ line }) => line.includes(`<${parent}/`) && /\b(?:write|writev|pwrite64|pwritev)\(/u.test(line) && /\)\s*=\s*[1-9][0-9]*$/u.test(line));
      const early = writes.filter(({ index }) => markerAt < 0 || index < markerAt);
      captures.push({ name: name!, earlyWrites: early.length, bodyWrites: writes.length, transientPresent: fs.existsSync(path.join(parent, 'pre-admission-transient')), ok: result.ok,
        blocked: lines.some(line => line.includes('pre-admission-transient>') && line.includes('EFBIG')) });
    }
    expect(captures[0]).toMatchObject({ name: 'clean', earlyWrites: 0, ok: true, transientPresent: false }); expect(captures[0]!.bodyWrites).toBeGreaterThan(0);
    expect(captures[1]).toMatchObject({ name: 'blocked-attempt', earlyWrites: 0, ok: false, blocked: true, transientPresent: false });
    expect(captures[2]).toMatchObject({ name: 'transient-mutant', earlyWrites: 1, ok: true, transientPresent: false });
    const evidence = process.env.SYZYGY_GIT_MEMORY_WORKER_EVIDENCE_DIR;
    if (evidence !== undefined) {
      if (!path.isAbsolute(evidence)) throw new Error('Worker fixture evidence directory must be absolute.');
      fs.mkdirSync(evidence, { recursive: true }); fs.cpSync(root, path.join(evidence, 'effects'), { recursive: true });
      fs.writeFileSync(path.join(evidence, 'effects-results.json'), JSON.stringify({ sourceSha256: sha256(source), captures }, null, 2) + '\n');
    }
  }, 35_000);
  it('rejects a wrong receipt ACK, with a guard mutant proving the before-store predicate', async () => {
    const source = fs.readFileSync(SOURCE, 'utf8');
    const wrong = source.replace("const ack = await input.line(4096);", "const receivedAck = await input.line(4096); const ack = { ...(receivedAck as Record<string, unknown>), receiptSha256: '0'.repeat(64) };");
    expect(wrong).not.toBe(source);
    const weakened = wrong.replace('ack.receiptSha256 !== digest(receipt)', 'false'); expect(weakened).not.toBe(wrong);
    const captures: { name: string; ok: boolean; entries: number; sourceSha256: string }[] = [];
    for (const [name, contents] of [['wrong-ack', wrong], ['disabled-ack-guard', weakened]]) {
      const f = fixture(), root = tempDir('memory-worker-ack-'), bundle = path.join(root, 'worker.mjs');
      buildSync({ stdin: { contents: contents!, resolveDir: path.dirname(SOURCE), loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', conditions: ['source'], banner: { js: GIT_MEMORY_WORKER_BUNDLE_BANNER }, outfile: bundle });
      const result = await runGitMemoryWorker({ ...f.request, program: { ...program, bundle, bundleSha256: sha256(fs.readFileSync(bundle)) } });
      captures.push({ name: name!, ok: result.ok, entries: fs.readdirSync(f.request.parent).length, sourceSha256: sha256(contents!) });
      const evidence = process.env.SYZYGY_GIT_MEMORY_WORKER_EVIDENCE_DIR;
      if (evidence) { fs.mkdirSync(evidence, { recursive: true }); fs.writeFileSync(path.join(evidence, name! + '.ts'), contents!); fs.copyFileSync(bundle, path.join(evidence, name! + '.mjs')); }
    }
    expect(captures[0]).toMatchObject({ name: 'wrong-ack', ok: false, entries: 0 });
    expect(captures[1]).toMatchObject({ name: 'disabled-ack-guard', ok: true, entries: 1 });
    const evidence = process.env.SYZYGY_GIT_MEMORY_WORKER_EVIDENCE_DIR;
    if (evidence) fs.writeFileSync(path.join(evidence, 'ack-results.json'), JSON.stringify(captures, null, 2) + '\n');
  });
  it('enforces hard CPU/heap, finite wall and output limits on own trusted fixture programs', async () => {
    const root = tempDir('memory-worker-resource-');
    const captures: unknown[] = [];
    for (const kind of ['cpu', 'wall', 'heap', 'output'] as const) {
      const f = fixture(), bundle = path.join(root, `${kind}.mjs`);
      const code = kind === 'cpu' ? 'export async function gitMemoryWorkerMain(){for(;;){}}'
        : kind === 'wall' ? 'export async function gitMemoryWorkerMain(){setInterval(()=>{},1000);await new Promise(()=>{});}'
          : kind === 'heap' ? 'export async function gitMemoryWorkerMain(){const held=[];for(;;)held.push(new Array(65536).fill(123));}' : 'export async function gitMemoryWorkerMain(){process.stdout.write("x".repeat(4096));}';
      fs.writeFileSync(bundle, code);
      const start = performance.now();
      const result = await runGitMemoryWorker({ ...f.request, program: { ...program, bundle, bundleSha256: sha256(code) },
        limits: kind === 'cpu' ? { cpuSeconds: 1, wallMilliseconds: 5000 } : kind === 'wall' ? { wallMilliseconds: 200 } : kind === 'heap' ? { heapMiB: 16 } : { outputBytes: 128 } });
      expect(result.ok).toBe(false); expect(result.summary.termination).toBe('confirmed'); expect(fs.readdirSync(f.request.parent)).toEqual([]);
      expect(performance.now() - start).toBeLessThan(kind === 'cpu' ? 3000 : 1500);
      captures.push({ kind, result, durationMilliseconds: performance.now() - start });
      if (kind === 'cpu') expect(result.summary.signal).toBe('SIGKILL'); if (kind === 'heap') expect(result.summary.signal).toBe('SIGABRT'); if (kind === 'wall') expect(result).toHaveProperty('code', 'worker-limit'); if (kind === 'output') expect(result).toHaveProperty('code', 'worker-limit');
    }
    const evidence = process.env.SYZYGY_GIT_MEMORY_WORKER_EVIDENCE_DIR;
    if (evidence) fs.writeFileSync(path.join(evidence, 'resource-results.json'), JSON.stringify(captures, null, 2) + '\n');
  }, 10_000);
});

function completeTrace(lines: readonly string[]): string[] {
  const pending = new Map<string, { text: string; index: number }>(); const complete: string[] = [];
  for (const [index, line] of lines.entries()) {
    const pid = /^([0-9]+)\s+/u.exec(line)?.[1];
    if (pid && line.includes('<unfinished ...>')) { pending.set(pid, { text: line.replace(' <unfinished ...>', ''), index }); continue; }
    if (pid && /<\.\.\. [a-z0-9_]+ resumed>/u.test(line)) {
      const first = pending.get(pid); if (!first) throw new Error('Incomplete syscall trace.');
      complete[first.index] = first.text + line.replace(/^[0-9]+\s+<\.\.\. [a-z0-9_]+ resumed>/u, ''); pending.delete(pid);
    } else complete[index] = line;
  }
  if (pending.size) throw new Error('Incomplete syscall trace.'); return complete.filter(line => line !== undefined);
}
