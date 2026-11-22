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
import { createOrderedDesignSessionProfile, createSessionProfile, DEFAULT_SESSION_MODEL, type NativeSessionProfile } from './session-profile.js';
import { URL_MACHINE_CLIENT_LIMITS, type UrlMachineClientContext, type UrlMachineClientRecord } from './url-machine-instance.js';

const NOW = Date.parse('2026-11-22T01:00:00.000Z');
const id = () => randomBytes(32).toString('hex');
const canon = (value: unknown) => Buffer.from(encodeCanonicalJson(value, URL_MACHINE_CLIENT_LIMITS));
const cleanup: (() => Promise<unknown>)[] = [];
const filesystem = vi.hoisted(() => ({
  afterSync: undefined as ((file: string) => Promise<void> | void) | undefined,
  afterLstat: undefined as ((file: string) => void) | undefined,
  afterOpen: undefined as ((file: string) => void) | undefined,
  afterClose: undefined as ((file: string) => void) | undefined,
}));
vi.mock('node:fs/promises', async importOriginal => {
  const original = await importOriginal<typeof import('node:fs/promises')>();
  return { ...original, lstat: async (...args: Parameters<typeof original.lstat>) => {
    const stat = await original.lstat(...args);
    filesystem.afterLstat?.(String(args[0]));
    return stat;
  }, open: async (...args: Parameters<typeof original.open>) => {
    const handle = await original.open(...args), file = String(args[0]);
    filesystem.afterOpen?.(file);
    const sync = handle.sync.bind(handle), close = handle.close.bind(handle);
    handle.sync = async () => { await sync(); await filesystem.afterSync?.(file); };
    handle.close = async () => { await close(); filesystem.afterClose?.(file); };
    return handle;
  } };
});
afterEach(async () => {
  filesystem.afterSync = filesystem.afterLstat = filesystem.afterOpen = filesystem.afterClose = undefined;
  for (const clean of cleanup.splice(0).reverse()) await clean();
});

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
  const allocate = async (profile?: NativeSessionProfile) => {
    const allocated = await store!.allocateClient(options.deadline);
    if (!allocated) throw new Error('owned fixture slot refused');
    const context: UrlMachineClientContext = { clientId: allocated.clientId, policySha256: id(), profileSha256: profile?.digest ?? id(), sourcePin: 'a'.repeat(40),
      runId: profile?.input.binding.run ?? `run-${'b'.repeat(32)}`, role: 'design', kind: 'mcp-shim', allowedScopes: ['artifact_read', 'dossier_step'], now: NOW, deadline: options.deadline };
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

function effectProfile(ordered: boolean): NativeSessionProfile {
  const compiled = (ordered ? createOrderedDesignSessionProfile : createSessionProfile)({
    binding: { run: `run-${'b'.repeat(32)}`, role: 'design', sourceBinding: id(), policy: id(), provider: 'anthropic', model: DEFAULT_SESSION_MODEL },
    sessionId: '12345678-1234-4234-8234-123456789012', systemPrompt: 'Review owned material.',
    initialPrompt: 'Inspect every ordered part.', utcDate: '2026-11-22', kernelRelease: os.release(),
  });
  if (!compiled.ok) throw new Error('owned profile refused');
  return compiled.value.profile;
}

describe('protected URL machine lifecycle files', { timeout: 30_000 }, () => {
  it.each(['unprofiled', 'ordinary', 'ordered'] as const)('bounds %s effects by the matching declared profile while retaining finite expiry', async kind => {
    const profile = effectProfile(kind === 'ordered'), f = await fixture(), slot = await f.allocate(profile);
    expect((await slot.publish()).ok).toBe(true);
    expect(slot.context.policySha256).not.toBe(profile.input.binding.policy);
    const original = performance.now.bind(performance);
    let offset = 0;
    const clock = vi.spyOn(performance, 'now').mockImplementation(() => original() + offset);
    try {
      let afterSixSeconds: boolean | undefined, afterThirtySeconds: boolean | undefined;
      const result = await f.store.exclusive(slot.context.clientId, f.options.deadline, async lease => {
        offset = 6000; afterSixSeconds = lease.current();
        offset = 30_001; afterThirtySeconds = lease.current();
      }, kind === 'unprofiled' ? undefined : profile);
      expect(afterSixSeconds).toBe(kind === 'ordered');
      expect(afterThirtySeconds).toBe(false);
      expect(result).toBe(false);
    } finally { clock.mockRestore(); }
  });

  it('rejects copied, oversized and mismatched effect profiles before entry', async () => {
    const profile = effectProfile(true), f = await fixture(), slot = await f.allocate(profile);
    expect((await slot.publish()).ok).toBe(true);
    for (const candidate of [
      { ...profile },
      { ...profile, transcript: { ...('transcript' in profile ? profile.transcript : {}), nativeEffectMilliseconds: 30_001 } },
      effectProfile(true),
    ]) {
      let entered = false;
      expect(await f.store.exclusive(slot.context.clientId, f.options.deadline, async () => { entered = true; }, candidate as NativeSessionProfile)).toBe(false);
      expect(entered).toBe(false);
    }
  });

  it.each(['original-deadline', 'revocation'] as const)('prevents publication after %s during a declared ordered effect', async fault => {
    const profile = effectProfile(true), f = await fixture(), slot = await f.allocate(profile);
    expect((await slot.publish()).ok).toBe(true);
    const before = await readFile(slot.file), projection = await readFile(slot.projection);
    const wrapped = { ...f.store, exclusive: (clientId, deadline, operation) => f.store.exclusive(clientId, deadline, lease => operation({ ...lease,
      preflightCanonical: async (...args) => {
        const checked = await lease.preflightCanonical!(...args);
        expect(checked).toBe(true);
        if (fault === 'original-deadline') f.tick(f.options.deadline); else f.revoke();
        expect(lease.current()).toBe(false);
        return checked;
      },
    }), profile) } satisfies UrlMachineStore;
    expect((await slot.publish({ ...slot.record, revision: 2 }, { revision: 1, sha256: sha256(before) }, wrapped)).ok).toBe(false);
    expect(await readFile(slot.file)).toEqual(before);
    expect(await readFile(slot.projection)).toEqual(projection);
  });

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

  it('publishes through the trusted store with one checked clock at each lifecycle boundary', async () => {
    const f = await fixture(), slot = await f.allocate();
    const current = vi.fn(f.options.current);
    const currentAsync = vi.fn(async () => f.options.current());
    const reopened = await openUrlMachineStore({ ...f.options, current, currentAsync }, f.store.identitySha256);
    expect(reopened).not.toBeNull(); cleanup.push(() => reopened!.close());
    current.mockClear(); currentAsync.mockClear();
    const result = await reopened!.publish({ context: slot.context, binding: slot.binding, expected: null, next: canon(slot.record) });
    expect(result.ok).toBe(true);
    expect(await readFile(slot.file)).toEqual(canon(slot.record));
    expect(current.mock.calls.length).toBeLessThan(30);
    expect(currentAsync).not.toHaveBeenCalled();
    await expect(reopened!.exclusive(slot.context.clientId, f.options.deadline, async lease => {
      const checks = current.mock.calls.length;
      expect(lease.sampleCurrent?.()).toBe(NOW);
      expect(current.mock.calls.length).toBe(checks + 1);
      expect(await lease.read()).toMatchObject({ anchor: { kind: 'committed' } });
    })).resolves.toBe(true);
  });

  it.each(['parent-withdrawn', 'connection-closed'] as const)('prevents the first durable rename when %s during a private write', async fault => {
    const f = await fixture(), slot = await f.allocate(), stateFile = path.join(f.options.protectedRoot, 'state.json');
    const before = await readFile(stateFile);
    let opening = true, synced = false;
    filesystem.afterSync = file => {
      if (!path.basename(file).startsWith('state.json.new-')) return;
      synced = true;
      if (fault === 'parent-withdrawn') f.revoke();
      else opening = false;
    };
    const result = await f.store.publish({ context: slot.context, binding: slot.binding, expected: null, next: canon(slot.record) }, () => opening);
    expect(synced).toBe(true);
    expect(result.ok).toBe(false);
    expect(await readFile(stateFile)).toEqual(before);
    await expect(readFile(slot.file)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('awaits fresh authority around real protected filesystem work', async () => {
    const f = await fixture(), slot = await f.allocate();
    expect((await slot.publish()).ok).toBe(true);
    let asyncCurrent = true;
    const current = vi.fn(f.options.current);
    const currentAsync = vi.fn(async () => asyncCurrent);
    const reopened = await openUrlMachineStore({ ...f.options, current, currentAsync }, f.store.identitySha256);
    expect(reopened).not.toBeNull(); cleanup.push(() => reopened!.close());
    current.mockClear(); currentAsync.mockClear();
    expect(await reopened!.exclusive(slot.context.clientId, f.options.deadline, async lease => {
      expect(await lease.read()).toMatchObject({ canonical: canon(slot.record), anchor: { kind: 'committed' } });
      expect(currentAsync.mock.calls.length).toBeGreaterThan(current.mock.calls.length);
      const asyncChecks = currentAsync.mock.calls.length, syncChecks = current.mock.calls.length;
      expect(lease.current()).toBe(true);
      expect(currentAsync.mock.calls).toHaveLength(asyncChecks);
      expect(current.mock.calls).toHaveLength(syncChecks + 1);
    })).toBe(true);
    filesystem.afterSync = file => { if (file === f.options.protectedRoot) asyncCurrent = false; };
    const run = vi.fn();
    expect(await reopened!.exclusive(slot.context.clientId, f.options.deadline, run)).toBe(false);
    expect(run).not.toHaveBeenCalled();
    expect(current()).toBe(true);
    expect(await readFile(slot.file)).toEqual(canon(slot.record));
  });

  it('allocates an unissued slot within the original bound when fresh policy checks have a cost', async () => {
    const f = await fixture(), oldSlot = await f.allocate();
    expect((await oldSlot.publish()).ok).toBe(true);
    const revoked = { ...oldSlot.record, revision: 2, revokedAt: new Date(NOW).toISOString() };
    expect((await oldSlot.publish(revoked, { revision: 1, sha256: sha256(canon(oldSlot.record)) })).ok).toBe(true);
    const stateFile = path.join(f.options.protectedRoot, 'state.json');
    const archiveFile = path.join(f.options.protectedRoot, 'canonical-history.json');
    const previous = JSON.parse(await readFile(stateFile, 'utf8'));
    const archived = await readFile(archiveFile);
    const realNow = performance.now.bind(performance);
    let measuring = false, elapsed = 0;
    const clock = vi.spyOn(performance, 'now').mockImplementation(() => realNow() + elapsed);
    try {
      const reopened = await openUrlMachineStore({ ...f.options, currentAsync: async () => {
        if (measuring) elapsed += 200;
        return true;
      } }, f.store.identitySha256);
      expect(reopened).not.toBeNull(); cleanup.push(() => reopened!.close());
      measuring = true;
      const allocated = await reopened!.allocateClient(f.options.deadline);
      expect(allocated).not.toBeNull();
      const state = JSON.parse(await readFile(stateFile, 'utf8'));
      expect(state).toEqual({ ...previous, clients: [...previous.clients, expect.objectContaining({ clientId: allocated!.clientId,
        audit: [], anchor: expect.objectContaining({ kind: 'never-issued' }) })] });
      expect(await readFile(archiveFile)).toEqual(archived);
      expect(await readdir(f.options.protectedRoot)).not.toContain('lock');
    } finally { clock.mockRestore(); }
  });

  it.each(['before-lock', 'before-rename', 'after-anchor-check', 'after-readback', 'after-cleanup'] as const)('refuses allocation on async authority withdrawal %s', async phase => {
    const f = await fixture();
    let allowed = true, archiveReads = 0, rootSyncs = 0, temporarySynced = false;
    const reopened = await openUrlMachineStore({ ...f.options, currentAsync: async () => allowed }, f.store.identitySha256);
    expect(reopened).not.toBeNull(); cleanup.push(() => reopened!.close());
    if (phase === 'before-lock') {
      allowed = false;
    } else if (phase === 'before-rename') {
      filesystem.afterSync = file => { if (path.basename(file).startsWith('state.json.new-')) allowed = false; };
    } else if (phase === 'after-anchor-check') {
      filesystem.afterSync = file => { if (path.basename(file).startsWith('state.json.new-')) temporarySynced = true; };
      filesystem.afterLstat = file => { if (temporarySynced && file === f.options.protectedRoot) allowed = false; };
    } else if (phase === 'after-cleanup') {
      filesystem.afterSync = file => { if (file === f.options.protectedRoot && ++rootSyncs === 3) allowed = false; };
    } else {
      filesystem.afterClose = file => {
        if (path.basename(file) === 'canonical-history.json' && ++archiveReads === 2) allowed = false;
      };
    }
    expect(await reopened!.allocateClient(f.options.deadline)).toBeNull();
    expect(allowed).toBe(false);
    const state = JSON.parse(await readFile(path.join(f.options.protectedRoot, 'state.json'), 'utf8'));
    const slotPersisted = phase === 'after-readback' || phase === 'after-cleanup';
    expect(state.clients).toEqual(slotPersisted ? [expect.objectContaining({ audit: [],
      anchor: expect.objectContaining({ kind: 'never-issued' }) })] : []);
    expect((await readdir(f.options.protectedRoot)).includes('lock')).toBe(phase !== 'before-lock' && phase !== 'after-cleanup');
  });

  it.each(['before-lock', 'after-lock'] as const)('refuses independent synchronous withdrawal during async allocation %s', async phase => {
    const f = await fixture();
    let measuring = false, syncAllowed = true, lockSynced = false, stateOpened = false;
    const reopened = await openUrlMachineStore({ ...f.options, current: () => syncAllowed, currentAsync: async () => {
      if (measuring && (phase === 'before-lock' || lockSynced)) syncAllowed = false;
      return true;
    } }, f.store.identitySha256);
    expect(reopened).not.toBeNull(); cleanup.push(() => reopened!.close());
    filesystem.afterOpen = file => { if (path.basename(file) === 'state.json') stateOpened = true; };
    filesystem.afterSync = file => { if (file === f.options.protectedRoot) lockSynced = true; };
    measuring = true;
    expect(await reopened!.allocateClient(f.options.deadline)).toBeNull();
    expect(syncAllowed).toBe(false);
    expect(stateOpened).toBe(false);
    expect((await readdir(f.options.protectedRoot)).includes('lock')).toBe(phase === 'after-lock');
  });

  it('refuses allocation when the named root is replaced during prepublication authority checking', async () => {
    const f = await fixture(), root = f.options.protectedRoot, moved = `${root}-old`;
    const before = await readFile(path.join(root, 'state.json'));
    let temporarySynced = false, finalAnchorChecked = false, movedRoot = false;
    const reopened = await openUrlMachineStore({ ...f.options, currentAsync: async () => {
      if (finalAnchorChecked && !movedRoot) {
        await rename(root, moved); await mkdir(root, { mode: 0o700 }); movedRoot = true;
      }
      return true;
    } }, f.store.identitySha256);
    expect(reopened).not.toBeNull(); cleanup.push(() => reopened!.close());
    filesystem.afterSync = file => { if (path.basename(file).startsWith('state.json.new-')) temporarySynced = true; };
    filesystem.afterLstat = file => { if (temporarySynced && file === root) finalAnchorChecked = true; };
    expect(await reopened!.allocateClient(f.options.deadline)).toBeNull();
    expect(movedRoot).toBe(true);
    expect(await readFile(path.join(moved, 'state.json'))).toEqual(before);
    expect(await readdir(root)).toEqual([]);
  });

  it('refuses a staged retry when contention clears after its original cutoff', async () => {
    const f = await fixture(), lock = path.join(f.options.protectedRoot, 'lock');
    const stateFile = path.join(f.options.protectedRoot, 'state.json'), before = await readFile(stateFile);
    let count = 0, measuring = false, elapsed = 0;
    const reopened = await openUrlMachineStore({ ...f.options, currentAsync: async () => {
      if (measuring && ++count === 2) { elapsed = 1_000; await rm(lock, { recursive: true }); }
      return true;
    } }, f.store.identitySha256);
    expect(reopened).not.toBeNull(); cleanup.push(() => reopened!.close());
    await mkdir(lock, { mode: 0o700 });
    const realNow = performance.now.bind(performance);
    const clock = vi.spyOn(performance, 'now').mockImplementation(() => realNow() + elapsed);
    try {
      measuring = true;
      expect(await reopened!.allocateClient(f.options.deadline)).toBeNull();
      expect(count).toBe(2);
      expect(await readFile(stateFile)).toEqual(before);
      expect(await readdir(f.options.protectedRoot)).not.toContain('lock');
    } finally { clock.mockRestore(); }
  });

  it('withholds the reserved slot when cleanup crosses the allocation deadline', async () => {
    const f = await fixture();
    const reopened = await openUrlMachineStore({ ...f.options, currentAsync: async () => true }, f.store.identitySha256);
    expect(reopened).not.toBeNull(); cleanup.push(() => reopened!.close());
    const realNow = performance.now.bind(performance);
    let rootSyncs = 0, elapsed = 0;
    const clock = vi.spyOn(performance, 'now').mockImplementation(() => realNow() + elapsed);
    try {
      filesystem.afterSync = file => { if (file === f.options.protectedRoot && ++rootSyncs === 3) elapsed = 5000; };
      expect(await reopened!.allocateClient(f.options.deadline)).toBeNull();
      expect(rootSyncs).toBe(3);
      const state = JSON.parse(await readFile(path.join(f.options.protectedRoot, 'state.json'), 'utf8'));
      expect(state.clients).toEqual([expect.objectContaining({ audit: [], anchor: expect.objectContaining({ kind: 'never-issued' }) })]);
      expect(await readdir(f.options.protectedRoot)).not.toContain('lock');
    } finally { clock.mockRestore(); }
  });

  it('returns at the clipped allocation deadline while its late cleanup still owns the descriptor', async () => {
    const f = await fixture();
    const reopened = await openUrlMachineStore({ ...f.options, currentAsync: async () => true }, f.store.identitySha256);
    expect(reopened).not.toBeNull(); cleanup.push(() => reopened!.close());
    let rootSyncs = 0, closed = false;
    let cleanupStarted!: () => void, releaseCleanup!: () => void, descriptorClosed!: () => void;
    const entering = new Promise<void>(resolve => { cleanupStarted = resolve; });
    const held = new Promise<void>(resolve => { releaseCleanup = resolve; });
    const closing = new Promise<void>(resolve => { descriptorClosed = resolve; });
    filesystem.afterSync = file => {
      if (file !== f.options.protectedRoot || ++rootSyncs !== 3) return;
      cleanupStarted(); return held;
    };
    filesystem.afterClose = file => {
      if (file !== f.options.protectedRoot) return;
      closed = true; descriptorClosed();
    };
    const allocation = reopened!.allocateClient(NOW + 1_000);
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    try {
      expect(await Promise.race([entering.then(() => 'cleanup'), allocation.then(() => 'returned')])).toBe('cleanup');
      const outcome = await Promise.race([allocation, new Promise<'still pending'>(resolve => {
        watchdog = setTimeout(() => resolve('still pending'), 2_000);
      })]);
      expect(outcome).toBeNull();
      await reopened!.close();
      expect(closed).toBe(false);
    } finally { releaseCleanup(); clearTimeout(watchdog); await allocation; }
    await closing;
    expect(closed).toBe(true);
  });

  it('checks authority after protected state I/O before using it to open the client', async () => {
    const f = await fixture(), slot = await f.allocate();
    expect((await slot.publish()).ok).toBe(true);
    let current = true, clientOpened = false;
    const reopened = await openUrlMachineStore({ ...f.options, currentAsync: async () => current }, f.store.identitySha256);
    expect(reopened).not.toBeNull(); cleanup.push(() => reopened!.close());
    filesystem.afterClose = file => { if (path.basename(file) === 'canonical-history.json') current = false; };
    filesystem.afterOpen = file => { if (path.basename(file) === path.basename(slot.file)) clientOpened = true; };
    const finished = await reopened!.exclusive(slot.context.clientId, f.options.deadline, async lease => { await lease.read(); });
    expect(finished).toBe(false);
    expect(current).toBe(false);
    expect(clientOpened).toBe(false);
  });

  it('discards filesystem results when authority outlasts the exclusive deadline', async () => {
    const f = await fixture(), slot = await f.allocate();
    expect((await slot.publish()).ok).toBe(true);
    let afterSync = false;
    const reopened = await openUrlMachineStore({ ...f.options, currentAsync: async () => {
      if (afterSync) f.tick(NOW + 1000);
      return true;
    } }, f.store.identitySha256);
    expect(reopened).not.toBeNull(); cleanup.push(() => reopened!.close());
    filesystem.afterSync = file => { if (file === f.options.protectedRoot) afterSync = true; };
    const run = vi.fn();
    expect(await reopened!.exclusive(slot.context.clientId, NOW + 1000, run)).toBe(false);
    expect(afterSync).toBe(true);
    expect(run).not.toHaveBeenCalled();
    expect(await readFile(slot.file)).toEqual(canon(slot.record));
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
