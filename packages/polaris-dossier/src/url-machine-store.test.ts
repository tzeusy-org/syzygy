import { mkdir, mkdtemp, readFile, readdir, rename, rm, symlink, unlink, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { sha256 } from '@syzygy/support';
import { initializeUrlMachineStore, openUrlMachineStore, type UrlMachineStore, type UrlMachineStoreOptions } from './url-machine-store.js';
import { publishUrlMachineLifecycle } from './url-machine-lifecycle.js';
import { URL_MACHINE_CLIENT_LIMITS, type UrlMachineClientContext, type UrlMachineClientRecord } from './url-machine-instance.js';

const NOW = Date.parse('2026-11-22T01:00:00.000Z');
const id = () => randomBytes(32).toString('hex');
const canon = (value: unknown) => Buffer.from(encodeCanonicalJson(value, URL_MACHINE_CLIENT_LIMITS));
const cleanup: (() => Promise<unknown>)[] = [];
const filesystem = vi.hoisted(() => ({ afterSync: undefined as ((file: string) => Promise<void> | void) | undefined }));
vi.mock('node:fs/promises', async importOriginal => {
  const original = await importOriginal<typeof import('node:fs/promises')>();
  return { ...original, open: async (...args: Parameters<typeof original.open>) => {
    const handle = await original.open(...args);
    const sync = handle.sync.bind(handle);
    handle.sync = async () => { await sync(); await filesystem.afterSync?.(String(args[0])); };
    return handle;
  } };
});
afterEach(async () => { filesystem.afterSync = undefined; for (const clean of cleanup.splice(0).reverse()) await clean(); });

async function fixture(duration = 60_000) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'machine-store-'));
  cleanup.push(() => rm(root, { recursive: true, force: true }));
  const governanceRoot = path.join(root, 'observing/.syzygy');
  const canonicalRoot = path.join(governanceRoot, 'governance/policies/dossier-machine-clients');
  await mkdir(canonicalRoot, { recursive: true });
  let now = NOW, valid = true;
  const options: UrlMachineStoreOptions = { governanceRoot, protectedRoot: path.join(root, 'protected'),
    deadline: NOW + duration, now: () => now, current: () => valid };
  const store = await initializeUrlMachineStore(options);
  expect(store).not.toBeNull();
  cleanup.push(() => store!.close());
  const allocate = async () => {
    const allocated = await store!.allocateClient(options.deadline);
    if (!allocated) throw new Error('owned fixture slot refused');
    const context: UrlMachineClientContext = { clientId: allocated.clientId, policySha256: id(), profileSha256: id(), sourcePin: 'a'.repeat(40),
      runId: `run-${'b'.repeat(32)}`, role: 'design', kind: 'mcp-shim', allowedScopes: ['artifact_read', 'dossier_step'], now: NOW, deadline: options.deadline };
    const record: UrlMachineClientRecord = { format: 'polaris-dossier-local-machine-client/1', clientId: context.clientId, issuanceId: id(),
      revision: 1, projectId: 'project:syzygy', policySha256: context.policySha256, sourcePin: context.sourcePin, runId: context.runId,
      role: context.role, kind: context.kind, scopes: ['artifact_read'], issuedAt: new Date(NOW - 1000).toISOString(),
      expiresAt: new Date(options.deadline).toISOString(), revokedAt: null, instances: [{ instanceId: id(), generation: 1,
        issuedAt: new Date(NOW - 1000).toISOString(), expiresAt: new Date(options.deadline).toISOString(), retiredAt: null, revokedAt: null,
        verifier: { mechanism: 'rfc5-7d', profileSha256: context.profileSha256, processIdentitySha256: id(), channelIdentitySha256: id() } }] };
    const binding = { parentBindingSha256: id(), controllerSha256: id() };
    const publish = (next = record, expected: { revision: number; sha256: string } | null = null, adapter: UrlMachineStore = store!) =>
      publishUrlMachineLifecycle({ context: { ...context, now }, binding, next: canon(next), expected }, adapter);
    return { allocated, context, record, binding, publish, file: path.join(canonicalRoot, `${context.clientId}.json`),
      projection: path.join(options.protectedRoot, `projection-${context.clientId}.json`) };
  };
  return { root, options, canonicalRoot, store: store!, allocate, tick: (instant: number) => { now = instant; }, revoke: () => { valid = false; } };
}

describe('protected URL machine lifecycle files', { timeout: 30_000 }, () => {
  it('publishes through actual files, reopens the store, and refuses canonical plus projection rollback after revocation', async () => {
    const f = await fixture(), slot = await f.allocate();
    const first = await slot.publish();
    expect(first.ok).toBe(true);
    const bytes = await readFile(slot.file), projection = await readFile(slot.projection);
    expect(bytes).toEqual(canon(slot.record));
    const reopened = await openUrlMachineStore(f.options, f.store.identitySha256);
    expect(reopened).not.toBeNull(); cleanup.push(() => reopened!.close());
    const revoked = { ...slot.record, revision: 2, revokedAt: new Date(NOW).toISOString() };
    const second = await slot.publish(revoked, { revision: 1, sha256: sha256(bytes) }, reopened!);
    expect(second.ok).toBe(true);
    const latest = await readFile(slot.file), latestProjection = await readFile(slot.projection);
    await writeFile(slot.file, bytes); await writeFile(slot.projection, projection);
    let replay: unknown;
    expect(await reopened!.exclusive(slot.context.clientId, f.options.deadline, async lease => { replay = await lease.read(); })).toBe(true);
    expect(replay).toBeNull();
    expect((await slot.publish(revoked, { revision: 1, sha256: sha256(bytes) }, reopened!)).ok).toBe(false);
    await writeFile(slot.file, latest); await writeFile(slot.projection, latestProjection);
    let checked: unknown;
    expect(await reopened!.exclusive(slot.context.clientId, f.options.deadline, async lease => { checked = await lease.read(); })).toBe(true);
    expect(checked).toMatchObject({ anchor: { kind: 'committed', head: { record: { revision: 2 } } } });
  });

  it('never reinitializes an existing store and refuses missing state, identity mismatch, or symlinked authority', async () => {
    const f = await fixture(), slot = await f.allocate();
    expect(await initializeUrlMachineStore(f.options)).toBeNull();
    const racing = { ...f.options, protectedRoot: path.join(f.root, 'racing-root') };
    const attempts = await Promise.all([initializeUrlMachineStore(racing), initializeUrlMachineStore(racing)]);
    expect(attempts.filter(Boolean)).toHaveLength(1);
    for (const adapter of attempts) if (adapter) cleanup.push(() => adapter.close());
    expect(await openUrlMachineStore(f.options, id())).toBeNull();
    const state = path.join(f.options.protectedRoot, 'state.json'), bytes = await readFile(state);
    await unlink(state);
    expect(await openUrlMachineStore(f.options, f.store.identitySha256)).toBeNull();
    await writeFile(state, bytes);
    const target = path.join(f.root, 'untrusted-record');
    await writeFile(target, canon(slot.record)); await symlink(target, slot.file);
    expect((await slot.publish()).ok).toBe(false);
    expect(await readFile(target)).toEqual(canon(slot.record));
  });

  it('refuses a replaced protected-root pathname even while its original descriptor remains open', async () => {
    const f = await fixture(), slot = await f.allocate();
    await rename(f.options.protectedRoot, path.join(f.root, 'retained-original-root'));
    await mkdir(f.options.protectedRoot, { mode: 0o700 });
    expect((await slot.publish()).ok).toBe(false);
    expect(await openUrlMachineStore(f.options, f.store.identitySha256)).toBeNull();
    await expect(readFile(slot.file)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('serializes independent adapters and accepts exactly one publication for one expected predecessor', async () => {
    const f = await fixture(), slot = await f.allocate();
    expect((await slot.publish()).ok).toBe(true);
    const second = await openUrlMachineStore(f.options, f.store.identitySha256);
    expect(second).not.toBeNull(); cleanup.push(() => second!.close());
    const expected = { revision: 1, sha256: sha256(canon(slot.record)) };
    const left = { ...slot.record, revision: 2, expiresAt: new Date(NOW + 30_000).toISOString() };
    const right = { ...slot.record, revision: 2, revokedAt: new Date(NOW).toISOString() };
    const results = await Promise.all([slot.publish(left, expected), slot.publish(right, expected, second!)]);
    expect(results.filter(result => result.ok)).toHaveLength(1);
    expect(results.filter(result => !result.ok)).toHaveLength(1);
    const actual = JSON.parse(await readFile(slot.file, 'utf8')) as UrlMachineClientRecord;
    expect(actual.revision).toBe(2);
  });

  it('retains an OS-process lock after its holder is killed and refuses a successor process', async () => {
    const f = await fixture(), slot = await f.allocate();
    const bundle = path.join(f.root, 'owned-process.mjs');
    const source = fileURLToPath(new URL('./url-machine-store.ts', import.meta.url));
    await build({ stdin: { contents: `
      import { openUrlMachineStore } from ${JSON.stringify(source)};
      const input = JSON.parse(process.argv[2]);
      const store = await openUrlMachineStore({ ...input.options, now: () => ${NOW}, current: () => true }, input.identity);
      if (!store) process.exit(2);
      await store.exclusive(input.clientId, input.options.deadline, async lease => {
        if (!await lease.read()) process.exit(3);
        process.stdout.write('held');
        await new Promise(() => {});
      });
      await store.close();
    `, resolveDir: path.dirname(source), loader: 'ts' }, bundle: true, platform: 'node', format: 'esm',
      conditions: ['source'], outfile: bundle, logLevel: 'silent' });
    const child = spawn(process.execPath, [bundle, JSON.stringify({ options: f.options, identity: f.store.identitySha256, clientId: slot.context.clientId })],
      { stdio: ['ignore', 'pipe', 'pipe'], env: {} });
    cleanup.push(async () => { child.kill('SIGKILL'); });
    const exited = once(child, 'exit');
    const signal = await Promise.race([once(child.stdout, 'data').then(([bytes]) => String(bytes)), exited.then(() => 'exited')]);
    expect(signal).toBe('held');
    child.kill('SIGKILL');
    expect(await exited).toEqual([null, 'SIGKILL']);
    const successor = await openUrlMachineStore(f.options, f.store.identitySha256);
    expect(successor).not.toBeNull(); cleanup.push(() => successor!.close());
    expect(await successor!.exclusive(slot.context.clientId, f.options.deadline, async () => { throw new Error('OS-process lock was stolen'); })).toBe(false);
    expect(await readdir(path.join(f.options.protectedRoot, 'lock'))).toEqual([]);
  });

  it('preserves pending evidence and the unstealable lock after an interrupted transaction', async () => {
    const f = await fixture(), slot = await f.allocate();
    const wrapped = { ...f.store, exclusive: (clientId, deadline, operation) => f.store.exclusive(clientId, deadline, lease => operation({ ...lease,
      advance: async (expected, step) => {
        const result = await lease.advance(expected, step);
        if (step.kind === 'reserve' && result) throw new Error('owned simulated interruption');
        return result;
      },
    })) } satisfies UrlMachineStore;
    const result = await slot.publish(slot.record, null, wrapped);
    expect(result.ok).toBe(false);
    expect((JSON.parse(await readFile(path.join(f.options.protectedRoot, 'state.json'), 'utf8')) as { used: string[] }).used)
      .toContain(slot.context.clientId);
    expect(await readdir(path.join(f.options.protectedRoot, 'lock'))).toEqual([]);
    expect(await openUrlMachineStore(f.options, f.store.identitySha256)).toBeNull();
  });

  it.each(['omitted-preflight', 'changed-intent', 'changed-bytes', 'changed-id-reservation', 'changed-run'] as const)('cannot bypass archive preflight with %s', async fault => {
    const f = await fixture(), slot = await f.allocate();
    const wrapped = { ...f.store, exclusive: (clientId, deadline, operation) => f.store.exclusive(clientId, deadline, lease => operation({ ...lease,
      preflightCanonical: fault === 'omitted-preflight' ? undefined : lease.preflightCanonical,
      advance: async (expected, step) => lease.advance(expected,
        fault === 'changed-intent' && step.kind === 'reserve' ? { ...step, anchor: { ...step.anchor, intentSha256: id() } }
        : fault === 'changed-id-reservation' && step.kind === 'reserve' ? { ...step, newIdentities: [slot.context.clientId, id(), id()] }
        : fault === 'changed-run' && step.kind === 'reserve' && step.newClient !== null ? { ...step, newClient: { ...step.newClient, runId: `run-${'e'.repeat(32)}` } }
        : fault === 'changed-bytes' && step.kind === 'publish' ? { ...step, canonical: canon({ ...slot.record, issuanceId: id() }) } : step),
    })) } satisfies UrlMachineStore;
    expect((await slot.publish(slot.record, null, wrapped)).ok).toBe(false);
    await expect(readFile(slot.file)).rejects.toMatchObject({ code: 'ENOENT' });
    const state = JSON.parse(await readFile(path.join(f.options.protectedRoot, 'state.json'), 'utf8'));
    if (fault === 'changed-bytes') {
      expect(state.used).toContain(slot.context.clientId); expect(state.clients[0].anchor.kind).toBe('pending');
      expect(await openUrlMachineStore(f.options, f.store.identitySha256)).toBeNull();
    } else {
      expect(state.used).toEqual([]); expect(state.clients[0].anchor.kind).toBe('never-issued');
      expect((await slot.publish()).ok).toBe(true);
    }
  });

  it('retains pending evidence when the new pack reached disk but its state pointer did not', async () => {
    const f = await fixture(), slot = await f.allocate();
    const pack = path.join(f.options.protectedRoot, 'canonical-history.json');
    const original = await readFile(pack);
    filesystem.afterSync = async file => {
      if (file === f.options.protectedRoot && !(await readFile(pack)).equals(original)) throw new Error('owned archive/state interruption');
    };
    expect((await slot.publish()).ok).toBe(false); filesystem.afterSync = undefined;
    const state = JSON.parse(await readFile(path.join(f.options.protectedRoot, 'state.json'), 'utf8'));
    expect(state.clients[0].anchor.kind).toBe('pending'); expect(state.clients[0].audit).toEqual([]);
    expect(JSON.parse(await readFile(pack, 'utf8')).entries).toHaveLength(1);
    expect(await openUrlMachineStore(f.options, f.store.identitySha256)).toBeNull();
    expect(state.used).toContain(slot.context.clientId);
  });

  it('keeps globally consumed identifiers and the sixteen-client run cap across new adapters', async () => {
    const f = await fixture();
    const first = await f.allocate(); expect((await first.publish()).ok).toBe(true);
    const repeated = await f.allocate();
    expect((await repeated.publish({ ...repeated.record, issuanceId: first.record.issuanceId })).ok).toBe(false);
    for (let index = 1; index < 16; index++) {
      const slot = await f.allocate(); expect((await slot.publish()).ok, `owned client ${index}`).toBe(true);
    }
    const final = await f.allocate(); expect((await final.publish()).ok).toBe(false);
    const state = JSON.parse(await readFile(path.join(f.options.protectedRoot, 'state.json'), 'utf8')) as { runs: { clients: string[] }[]; used: string[] };
    expect(state.runs[0]!.clients).toHaveLength(16);
    expect(state.used).toHaveLength(48);
  });

  it('rechecks expiry after actual file sync and leaves late timed-out writes unpublished', async () => {
    const expired = await fixture(), slot = await expired.allocate();
    filesystem.afterSync = file => {
      if (file.includes(`${slot.context.clientId}.json.new-`)) expired.tick(expired.options.deadline);
    };
    expect((await slot.publish()).ok).toBe(false);
    await expect(readFile(slot.file)).rejects.toMatchObject({ code: 'ENOENT' });
    filesystem.afterSync = undefined;

    const durable = await fixture(), changed = await durable.allocate();
    filesystem.afterSync = file => {
      if (file === durable.canonicalRoot) durable.tick(durable.options.deadline);
    };
    expect((await changed.publish()).ok).toBe(false);
    expect(await readFile(changed.file)).toEqual(canon(changed.record));
    const pending = JSON.parse(await readFile(path.join(durable.options.protectedRoot, 'state.json'), 'utf8')) as { clients: { anchor: { kind: string } }[] };
    expect(pending.clients[0]!.anchor.kind).toBe('pending');
    await expect(readFile(changed.projection)).rejects.toMatchObject({ code: 'ENOENT' });
    expect(await readdir(path.join(durable.options.protectedRoot, 'lock'))).toEqual([]);
    filesystem.afterSync = undefined;

    const late = await fixture(300), next = await late.allocate();
    let entered!: () => void, release!: () => void;
    const syncing = new Promise<void>(resolve => { entered = resolve; });
    const held = new Promise<void>(resolve => { release = resolve; });
    filesystem.afterSync = async file => {
      if (file.includes(`${next.context.clientId}.json.new-`)) { entered(); await held; }
    };
    const publishing = next.publish();
    await syncing;
    expect((await publishing).ok).toBe(false);
    release();
    await new Promise(resolve => setTimeout(resolve, 20));
    await expect(readFile(next.file)).rejects.toMatchObject({ code: 'ENOENT' });
    expect(await readdir(path.join(late.options.protectedRoot, 'lock'))).toEqual([]);
  });

  it('fails closed when an operation exhausts its finite I/O-call ceiling', async () => {
    const f = await fixture(), slot = await f.allocate();
    let samples = 0;
    expect(await f.store.exclusive(slot.context.clientId, f.options.deadline, async lease => {
      for (let index = 0; index < 1000; index++) { await lease.read(); samples++; }
    })).toBe(false);
    expect(samples).toBeGreaterThan(1);
    expect(samples).toBeLessThan(512);
    expect(await readdir(path.join(f.options.protectedRoot, 'lock'))).toEqual([]);
  });

  it('refuses expired, backward-clock and revoked host leases before canonical publication', async () => {
    const expired = await fixture(), slot = await expired.allocate();
    expired.tick(expired.options.deadline);
    expect((await slot.publish()).ok).toBe(false);
    await expect(readFile(slot.file)).rejects.toMatchObject({ code: 'ENOENT' });
    const backward = await fixture(), other = await backward.allocate();
    backward.tick(NOW - 1);
    expect((await other.publish()).ok).toBe(false);
    const revoked = await fixture(), last = await revoked.allocate();
    revoked.revoke(); expect((await last.publish()).ok).toBe(false);
  });
});
