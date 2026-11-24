import { mkdir, mkdtemp, readFile, readdir, rename, rm, rmdir, symlink, unlink, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
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
import * as machinePeer from './url-machine-peer.js';

const NOW = Date.parse('2026-11-22T01:00:00.000Z');
const id = () => randomBytes(32).toString('hex');
const canon = (value: unknown) => Buffer.from(encodeCanonicalJson(value, URL_MACHINE_CLIENT_LIMITS));
const cleanup: (() => Promise<unknown>)[] = [];
const filesystem = vi.hoisted(() => ({
  afterSync: undefined as ((file: string) => Promise<void> | void) | undefined,
  afterLstat: undefined as ((file: string) => void) | undefined,
  afterRealpath: undefined as ((file: string) => void) | undefined,
  beforeMkdir: undefined as ((file: string) => Promise<void> | void) | undefined,
  beforeRmdir: undefined as ((file: string) => void) | undefined,
  beforeOpendir: undefined as ((file: string) => void) | undefined,
  beforeOpen: undefined as ((file: string) => Promise<void> | void) | undefined,
  afterOpen: undefined as ((file: string) => Promise<void> | void) | undefined,
  afterClose: undefined as ((file: string) => void) | undefined,
}));
vi.mock('node:fs/promises', async importOriginal => {
  const original = await importOriginal<typeof import('node:fs/promises')>();
  return { ...original, lstat: async (...args: Parameters<typeof original.lstat>) => {
    const stat = await original.lstat(...args);
    filesystem.afterLstat?.(String(args[0]));
    return stat;
  }, realpath: async (...args: Parameters<typeof original.realpath>) => {
    const resolved = await original.realpath(...args);
    filesystem.afterRealpath?.(String(args[0]));
    return resolved;
  }, mkdir: (...args: Parameters<typeof original.mkdir>) => {
    const delay = filesystem.beforeMkdir?.(String(args[0]));
    return delay === undefined ? original.mkdir(...args) : delay.then(() => original.mkdir(...args));
  }, rmdir: (...args: Parameters<typeof original.rmdir>) => {
    filesystem.beforeRmdir?.(String(args[0]));
    return original.rmdir(...args);
  }, opendir: (...args: Parameters<typeof original.opendir>) => {
    filesystem.beforeOpendir?.(String(args[0]));
    return original.opendir(...args);
  }, open: async (...args: Parameters<typeof original.open>) => {
    const file = String(args[0]);
    if (filesystem.beforeOpen !== undefined) await filesystem.beforeOpen(file);
    const handle = await original.open(...args);
    const sync = handle.sync.bind(handle), close = handle.close.bind(handle);
    handle.sync = async () => { await sync(); await filesystem.afterSync?.(file); };
    handle.close = async () => { await close(); filesystem.afterClose?.(file); };
    const hold = filesystem.afterOpen?.(file);
    if (hold !== undefined) await hold;
    return handle;
  } };
});
afterEach(async () => {
  filesystem.afterSync = filesystem.afterLstat = filesystem.afterRealpath = filesystem.beforeMkdir = filesystem.afterOpen = filesystem.afterClose = undefined;
  filesystem.beforeOpen = filesystem.beforeOpendir = filesystem.beforeRmdir = undefined;
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
  const allocate = async (profile?: NativeSessionProfile, runId = profile?.input.binding.run ?? `run-${'b'.repeat(32)}`) => {
    const allocated = await store!.allocateClient(options.deadline);
    if (!allocated) throw new Error('owned fixture slot refused');
    const context: UrlMachineClientContext = { clientId: allocated.clientId, policySha256: id(), profileSha256: profile?.digest ?? id(), sourcePin: 'a'.repeat(40),
      runId, role: 'design', kind: 'mcp-shim', allowedScopes: ['artifact_read', 'dossier_step'], now: NOW, deadline: options.deadline };
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
  it('admits same-adapter work in FIFO order after a legitimate holder exceeds one second', async () => {
    const f = await fixture(), slot = await f.allocate();
    let entered!: () => void, release!: () => void, offset = 0, submissions = 0;
    const holding = new Promise<void>(resolve => { entered = resolve; });
    const held = new Promise<void>(resolve => { release = resolve; });
    const order: number[] = [];
    const first = f.store.exclusive(slot.context.clientId, f.options.deadline, async () => { order.push(1); entered(); await held; });
    await holding;
    const original = performance.now.bind(performance);
    const clock = vi.spyOn(performance, 'now').mockImplementation(() => original() + offset);
    filesystem.beforeMkdir = file => { if (path.basename(file) === 'lock') submissions++; };
    const queued = [2, 3].map(number => f.store.exclusive(slot.context.clientId, f.options.deadline, async lease => {
      order.push(number); expect(await lease.read()).not.toBeNull();
    }));
    try {
      await new Promise(resolve => setImmediate(resolve));
      expect(submissions).toBe(0); expect(order).toEqual([1]);
      offset = 1500; release();
      expect(await first).toBe(true); expect(await Promise.all(queued)).toEqual([true, true]);
      expect(order).toEqual([1, 2, 3]); expect(submissions).toBe(2);
    } finally { release(); clock.mockRestore(); await Promise.allSettled([first, ...queued]); }
  });

  it('starts the held operation clock after admission while retaining its own five-second limit', async () => {
    const f = await fixture(), slot = await f.allocate();
    let entered!: () => void, release!: () => void, offset = 0;
    const holding = new Promise<void>(resolve => { entered = resolve; });
    const held = new Promise<void>(resolve => { release = resolve; });
    const original = performance.now.bind(performance);
    const clock = vi.spyOn(performance, 'now').mockImplementation(() => original() + offset);
    const first = f.store.exclusive(slot.context.clientId, f.options.deadline, async () => { entered(); await held; });
    await holding;
    const second = f.store.exclusive(slot.context.clientId, f.options.deadline, async lease => {
      offset = 6000; expect(lease.current()).toBe(true);
      offset = 7001; expect(lease.current()).toBe(false);
    });
    try {
      offset = 2000; release();
      expect(await first).toBe(true); expect(await second).toBe(false);
    } finally { release(); clock.mockRestore(); await Promise.allSettled([first, second]); }
  });

  it('expires a queued call independently of a held callback and removes it before admitting its successor', async () => {
    const f = await fixture(), slot = await f.allocate();
    let entered!: () => void, release!: () => void;
    const holding = new Promise<void>(resolve => { entered = resolve; });
    const held = new Promise<void>(resolve => { release = resolve; });
    const first = f.store.exclusive(slot.context.clientId, f.options.deadline, async () => { entered(); await held; });
    await holding;
    const expired = vi.fn(), next = vi.fn(async () => {});
    const second = f.store.exclusive(slot.context.clientId, NOW + 40, expired);
    const third = f.store.exclusive(slot.context.clientId, f.options.deadline, next);
    try {
      expect(await second).toBe(false); expect(expired).not.toHaveBeenCalled(); expect(next).not.toHaveBeenCalled();
      release(); expect(await first).toBe(true); expect(await third).toBe(true); expect(next).toHaveBeenCalledOnce();
    } finally { release(); await Promise.allSettled([first, second, third]); }
  });

  it.each(['withdrawal', 'admission-expiry'] as const)('rechecks %s before promoting a queued call into filesystem work', async reason => {
    const f = await fixture(), slot = await f.allocate();
    let entered!: () => void, release!: () => void, offset = 0, submissions = 0;
    const holding = new Promise<void>(resolve => { entered = resolve; });
    const held = new Promise<void>(resolve => { release = resolve; });
    const first = f.store.exclusive(slot.context.clientId, f.options.deadline, async () => { entered(); await held; });
    await holding;
    const original = performance.now.bind(performance);
    const clock = vi.spyOn(performance, 'now').mockImplementation(() => original() + offset);
    filesystem.beforeMkdir = file => { if (path.basename(file) === 'lock') submissions++; };
    const effect = vi.fn(), second = f.store.exclusive(slot.context.clientId, f.options.deadline, effect);
    try {
      if (reason === 'withdrawal') f.revoke(); else offset = 30_001;
      release(); expect(await first).toBe(false); expect(await second).toBe(false);
      expect(effect).not.toHaveBeenCalled(); expect(submissions).toBe(0);
    } finally { release(); clock.mockRestore(); await Promise.allSettled([first, second]); }
  });

  it('bounds queued admissions and settles them on close while the current callback remains held', async () => {
    const f = await fixture(), slot = await f.allocate();
    let entered!: () => void, release!: () => void;
    const holding = new Promise<void>(resolve => { entered = resolve; });
    const held = new Promise<void>(resolve => { release = resolve; });
    const first = f.store.exclusive(slot.context.clientId, f.options.deadline, async () => { entered(); await held; });
    await holding;
    const effect = vi.fn();
    let settled = 0;
    const queued = Array.from({ length: 256 }, () =>
      f.store.exclusive(slot.context.clientId, f.options.deadline, effect));
    for (const waiting of queued) void waiting.then(() => { settled++; });
    const excess = f.store.exclusive(slot.context.clientId, f.options.deadline, effect);
    try {
      expect(await Promise.race([excess, new Promise(resolve => setImmediate(() => resolve('queued')))])).toBe(false);
      expect(settled).toBe(0);
      await f.store.close();
      const closed = await Promise.race([Promise.all(queued), new Promise(resolve => setImmediate(() => resolve('pending')))]);
      expect(closed).toEqual(Array(256).fill(false));
      expect(effect).not.toHaveBeenCalled();
    } finally { await f.store.close(); release(); await first; await excess; await Promise.allSettled(queued); }
  });

  it.each(['unprofiled', 'ordinary', 'ordered'] as const)('bounds %s effects by the matching declared profile while retaining finite expiry', async kind => {
    const profile = effectProfile(kind === 'ordered'), f = await fixture(), slot = await f.allocate(profile);
    expect((await slot.publish()).ok).toBe(true);
    expect(slot.context.policySha256).not.toBe(profile.input.binding.policy);
    let offset = 0;
    const clock = vi.spyOn(performance, 'now').mockImplementation(() => offset);
    try {
      let afterSixSeconds: boolean | undefined, atTwentySeconds: boolean | undefined, atThirtySeconds: boolean | undefined;
      const result = await f.store.exclusive(slot.context.clientId, f.options.deadline, async lease => {
        offset = 6000; afterSixSeconds = lease.current();
        offset = 20_000; atTwentySeconds = lease.current();
        offset = 30_000; atThirtySeconds = lease.current();
      }, kind === 'unprofiled' ? undefined : profile);
      expect(afterSixSeconds).toBe(kind !== 'unprofiled');
      expect(atTwentySeconds).toBe(kind === 'ordered');
      expect(atThirtySeconds).toBe(false);
      expect(result).toBe(false);
    } finally { clock.mockRestore(); }
  });

  it.each([true, false])('takes one fresh synchronous parent sample before the first private anchor read when current is %s', async allowed => {
    const profile = effectProfile(false), f = await fixture(), slot = await f.allocate(profile);
    expect((await slot.publish()).ok).toBe(true);
    let granted = true;
    const current = vi.fn(() => granted);
    const reopened = await openUrlMachineStore({ ...f.options, current }, f.store.identitySha256);
    if (reopened === null) throw new Error('owned machine store failed to reopen');
    cleanup.push(() => reopened.close());
    current.mockClear();
    granted = allowed;
    let checksAtFirstAnchor: number | undefined;
    filesystem.afterLstat = file => {
      if (file === f.options.protectedRoot) checksAtFirstAnchor ??= current.mock.calls.length;
    };
    const effect = vi.fn();
    expect(await reopened.exclusive(slot.context.clientId, f.options.deadline, async lease => {
      effect();
      expect(lease.sampleCurrent()).not.toBeNull();
    }, profile)).toBe(allowed);
    if (allowed) {
      expect(checksAtFirstAnchor).toBe(1);
      expect(effect).toHaveBeenCalledTimes(1);
    } else {
      expect(checksAtFirstAnchor).toBeUndefined();
      expect(current).toHaveBeenCalledTimes(1);
      expect(effect).not.toHaveBeenCalled();
    }
  });

  it.each([true, false])('ordinary synchronous lease reads check currentness once before the first private root read when current is %s', async allowed => {
    const profile = effectProfile(false), f = await fixture(), slot = await f.allocate(profile);
    expect((await slot.publish()).ok).toBe(true);
    let reading = false, checks = 0, checksAtFirstAnchor: number | undefined;
    const current = (): boolean => {
      if (!reading) return true;
      checks++;
      return allowed;
    };
    const reopened = await openUrlMachineStore({ ...f.options, current }, f.store.identitySha256);
    if (reopened === null) throw new Error('owned machine store failed to reopen');
    cleanup.push(() => reopened.close());
    filesystem.afterLstat = file => {
      if (reading && file === f.options.protectedRoot) checksAtFirstAnchor ??= checks;
    };
    let read: 'committed' | 'refused' | 'other' = 'other';
    const completed = await reopened.exclusive(slot.context.clientId, f.options.deadline, async lease => {
      reading = true;
      try {
        if ((await lease.read())?.anchor.kind === 'committed') read = 'committed';
      } catch { read = 'refused'; }
      finally { reading = false; }
    }, profile);
    expect(completed).toBe(true);
    expect(read).toBe(allowed ? 'committed' : 'refused');
    expect(checksAtFirstAnchor).toBe(allowed ? 1 : undefined);
    if (!allowed) expect(checks).toBe(1);
  });

  it.each([false, true])('rejects copied, oversized and mismatched effect profiles before entry when ordered is %s', async ordered => {
    const profile = effectProfile(ordered), f = await fixture(), slot = await f.allocate(profile);
    expect((await slot.publish()).ok).toBe(true);
    for (const candidate of [
      { ...profile },
      { ...profile, transcript: { ...('transcript' in profile ? profile.transcript : {}), nativeEffectMilliseconds: 30_001 } },
      effectProfile(ordered),
    ]) {
      let entered = false;
      expect(await f.store.exclusive(slot.context.clientId, f.options.deadline, async () => { entered = true; }, candidate as NativeSessionProfile)).toBe(false);
      expect(entered).toBe(false);
    }
  });

  it.each([false, true])('refuses an effect profile matching the digest but not the durable run when ordered is %s', async ordered => {
    const profile = effectProfile(ordered), f = await fixture(), slot = await f.allocate(profile, `run-${'c'.repeat(32)}`);
    expect((await slot.publish()).ok).toBe(true);
    expect(slot.record.instances[0]!.verifier.profileSha256).toBe(profile.digest);
    expect(slot.record.runId).not.toBe(profile.input.binding.run);
    const entered = vi.fn(async () => {});
    expect(await f.store.exclusive(slot.context.clientId, f.options.deadline, entered, profile)).toBe(false);
    expect(entered).not.toHaveBeenCalled();
  });

  it.each([false, true])('clips the native effect to the caller deadline when ordered is %s', async ordered => {
    const profile = effectProfile(ordered), f = await fixture(), slot = await f.allocate(profile);
    expect((await slot.publish()).ok).toBe(true);
    const clock = vi.spyOn(performance, 'now').mockReturnValue(0);
    try {
      const completed = await f.store.exclusive(slot.context.clientId, NOW + 1000, async lease => {
        expect(lease.current()).toBe(true);
        f.tick(NOW + 1000);
        expect(lease.current()).toBe(false);
      }, profile);
      expect(completed).toBe(false);
    } finally { clock.mockRestore(); }
  });

  it.each([
    { ordered: false, fault: 'original-deadline' }, { ordered: false, fault: 'revocation' },
    { ordered: true, fault: 'original-deadline' }, { ordered: true, fault: 'revocation' },
  ] as const)('prevents publication after $fault during a declared effect when ordered is $ordered', async ({ ordered, fault }) => {
    const profile = effectProfile(ordered), f = await fixture(), slot = await f.allocate(profile);
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

  // Isolate store timing behind the selector. This stub does not establish a
  // genuine native peer; the composed native run verifies that separate gate.
  it.each(['selected', 'selected-eleven-seconds', 'ordinary', 'operation-expired', 'run-expired', 'connection-closed'] as const)(
    'isolates archive and audit timing behind the resumed publication selector in mode %s', async scenario => {
      const f = await fixture(), slot = await f.allocate(), root = f.options.protectedRoot;
      const archive = path.join(root, 'canonical-history.json'), stateFile = path.join(root, 'state.json');
      const previousArchive = await readFile(archive);
      const previousPointer = JSON.parse(await readFile(stateFile, 'utf8')).archive;
      const store = await openUrlMachineStore({ ...f.options, currentAsync: async () => true }, f.store.identitySha256);
      if (store === null) throw new Error('owned store reopen refused');
      cleanup.push(() => store.close());
      const proof = vi.spyOn(machinePeer, 'matchesResumedDesignPeerPublication').mockReturnValue(true);
      const published = { context: slot.context, binding: slot.binding, next: canon(slot.record), expected: null };
      const peer = scenario === 'ordinary' ? undefined : { verifier: slot.record.instances[0]!.verifier };
      let offset = 0, opening = true;
      const stillOpening = () => opening;
      const now = performance.now.bind(performance);
      const clock = vi.spyOn(performance, 'now').mockImplementation(() => now() + offset);
      const elapsed = scenario === 'operation-expired' ? 15_000 : scenario === 'selected-eleven-seconds' ? 11_000 : 6_000;
      const accepted = scenario === 'selected' || scenario === 'selected-eleven-seconds';
      filesystem.afterSync = async file => {
        if (file !== root || offset !== 0 || previousArchive.equals(await readFile(archive))) return;
        offset = elapsed;
        if (scenario === 'run-expired') f.tick(f.options.deadline);
        if (scenario === 'connection-closed') opening = false;
      };
      try {
        const result = await store.publish(published, stillOpening, peer);
        expect(result.ok).toBe(accepted);
        expect(offset).toBe(elapsed);
        if (peer !== undefined) expect(proof).toHaveBeenCalledExactlyOnceWith(peer, store, published, stillOpening);
        else expect(proof).not.toHaveBeenCalled();
        const state = JSON.parse(await readFile(stateFile, 'utf8'));
        const entry = state.clients.find((client: { clientId: string }) => client.clientId === slot.context.clientId);
        expect(entry.anchor.kind).toBe(accepted ? 'committed' : 'pending');
        expect(entry.audit).toHaveLength(accepted ? 1 : 0);
        if (accepted) expect(state.archive.sha256).toBe(sha256(await readFile(archive)));
        else expect(state.archive).toEqual(previousPointer);
      } finally {
        proof.mockRestore();
        clock.mockRestore();
      }
    });

  it('refuses a copied peer before granting the resumed Design publication window', async () => {
    const f = await fixture(), slot = await f.allocate(), root = f.options.protectedRoot;
    const store = await openUrlMachineStore({ ...f.options, currentAsync: async () => true }, f.store.identitySha256);
    if (store === null) throw new Error('owned store reopen refused');
    cleanup.push(() => store.close());
    const before = await readFile(path.join(root, 'state.json'));
    const candidate = { context: slot.context, binding: slot.binding, next: canon(slot.record), expected: null };
    expect(await store.publish(candidate, () => true, { verifier: slot.record.instances[0]!.verifier })).toEqual({ ok: false, code: 'unavailable' });
    expect(await readFile(path.join(root, 'state.json'))).toEqual(before);
    expect(await readdir(root)).not.toContain('lock');
  });

  it('refuses resumed Design publication if a contended lock arrives after one second', async () => {
    const f = await fixture(), slot = await f.allocate(), root = f.options.protectedRoot;
    const store = await openUrlMachineStore({ ...f.options, currentAsync: async () => true }, f.store.identitySha256);
    if (store === null) throw new Error('owned store reopen refused');
    cleanup.push(() => store.close());
    const stateFile = path.join(root, 'state.json'), lock = path.join(root, 'lock');
    const before = await readFile(stateFile);
    await mkdir(lock);
    const proof = vi.spyOn(machinePeer, 'matchesResumedDesignPeerPublication').mockReturnValue(true);
    const now = performance.now.bind(performance);
    let attempts = 0, offset = 0;
    const clock = vi.spyOn(performance, 'now').mockImplementation(() => now() + offset);
    filesystem.beforeMkdir = async file => {
      if (path.basename(file) !== 'lock' || ++attempts !== 2) return;
      await rmdir(lock);
      offset = 1001;
    };
    try {
      expect(await store.publish({ context: slot.context, binding: slot.binding, next: canon(slot.record), expected: null },
        () => true, { verifier: slot.record.instances[0]!.verifier })).toMatchObject({ ok: false });
      expect(attempts).toBe(2);
      expect(await readFile(stateFile)).toEqual(before);
      expect(await readdir(root)).not.toContain('lock');
    } finally {
      proof.mockRestore();
      clock.mockRestore();
    }
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
    const namedRootChecks: string[] = [];
    const current = vi.fn(f.options.current);
    const currentAsync = vi.fn(async () => { namedRootChecks.push('current'); return asyncCurrent; });
    const reopened = await openUrlMachineStore({ ...f.options, current, currentAsync }, f.store.identitySha256);
    expect(reopened).not.toBeNull(); cleanup.push(() => reopened!.close());
    current.mockClear(); currentAsync.mockClear(); namedRootChecks.length = 0;
    filesystem.afterLstat = file => { if (file === f.options.protectedRoot) namedRootChecks.push('root-lstat'); };
    filesystem.afterRealpath = file => { if (file === f.canonicalRoot) namedRootChecks.push('last-realpath'); };
    filesystem.beforeMkdir = file => { if (path.basename(file) === 'lock') namedRootChecks.push('lock-mkdir'); };
    expect(await reopened!.exclusive(slot.context.clientId, f.options.deadline, async lease => {
      expect(await lease.read()).toMatchObject({ canonical: canon(slot.record), anchor: { kind: 'committed' } });
      expect(currentAsync.mock.calls.length).toBeGreaterThan(current.mock.calls.length);
      const asyncChecks = currentAsync.mock.calls.length, syncChecks = current.mock.calls.length;
      expect(lease.current()).toBe(true);
      expect(currentAsync.mock.calls).toHaveLength(asyncChecks);
      expect(current.mock.calls).toHaveLength(syncChecks + 1);
    })).toBe(true);
    expect(namedRootChecks.slice(0, 6)).toEqual(['current', 'root-lstat', 'last-realpath', 'current', 'current', 'lock-mkdir']);
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

  it('publishes a complete eight-slot allocation in one protected state update', async () => {
    const f = await fixture(), oldSlot = await f.allocate();
    expect((await oldSlot.publish()).ok).toBe(true);
    const stateFile = path.join(f.options.protectedRoot, 'state.json');
    const archiveFile = path.join(f.options.protectedRoot, 'canonical-history.json');
    const previousBytes = await readFile(stateFile), previous = JSON.parse(previousBytes.toString());
    const archived = await readFile(archiveFile), canonical = await readFile(oldSlot.file);
    const projected = await readFile(oldSlot.projection);
    const names = (await readdir(f.options.protectedRoot)).sort();
    const reopened = await openUrlMachineStore({ ...f.options, currentAsync: async () => true }, f.store.identitySha256);
    if (!reopened) throw new Error('owned store reopen refused');
    cleanup.push(() => reopened.close());
    let temporarySyncs = 0;
    filesystem.afterSync = file => { if (path.basename(file).startsWith('state.json.new-')) temporarySyncs++; };
    for (const count of [0, 1.5, 9]) expect(await reopened.allocateClients(count, f.options.deadline)).toBeNull();
    expect(await readFile(stateFile)).toEqual(previousBytes);
    const slots = await reopened.allocateClients(8, f.options.deadline);
    if (!slots) throw new Error('complete allocation refused');
    expect(slots).toHaveLength(8);
    expect(new Set(slots.map(slot => slot.clientId)).size).toBe(8);
    expect(new Set(slots.map(slot => slot.witnessSha256)).size).toBe(8);
    expect(temporarySyncs).toBe(1);
    expect(JSON.parse(await readFile(stateFile, 'utf8'))).toEqual({ ...previous, clients: [...previous.clients,
      ...slots.map(slot => ({ ...slot, audit: [], anchor: { kind: 'never-issued', ...slot } }))] });
    expect(await readFile(archiveFile)).toEqual(archived);
    expect(await readFile(oldSlot.file)).toEqual(canonical);
    expect(await readFile(oldSlot.projection)).toEqual(projected);
    expect(await readdir(f.canonicalRoot)).toEqual([path.basename(oldSlot.file)]);
    expect((await readdir(f.options.protectedRoot)).sort()).toEqual(names);
  });

  it.each([
    { asynchronous: true, count: 8, elapsed: 6000, expiry: 'none', accepted: true },
    { asynchronous: false, count: 8, elapsed: 6000, expiry: 'none', accepted: false },
    { asynchronous: true, count: 1, elapsed: 6000, expiry: 'none', accepted: false },
    { asynchronous: true, count: 8, elapsed: 10_001, expiry: 'none', accepted: false },
    { asynchronous: true, count: 8, elapsed: 6000, expiry: 'caller', accepted: false },
    { asynchronous: true, count: 8, elapsed: 6000, expiry: 'run', accepted: false },
  ] as const)('bounds allocation with async $asynchronous, count $count, elapsed $elapsed and expiry $expiry', async scenario => {
    const f = await fixture();
    const reopened = await openUrlMachineStore({ ...f.options,
      ...(scenario.asynchronous ? { currentAsync: async () => true } : {}),
    }, f.store.identitySha256);
    if (!reopened) throw new Error('owned store reopen refused');
    cleanup.push(() => reopened.close());
    let elapsed = 0;
    const now = performance.now.bind(performance);
    const clock = vi.spyOn(performance, 'now').mockImplementation(() => now() + elapsed);
    filesystem.afterSync = file => {
      if (!path.basename(file).startsWith('state.json.new-')) return;
      elapsed = scenario.elapsed;
      if (scenario.expiry === 'caller') f.tick(NOW + 6000);
      if (scenario.expiry === 'run') f.tick(f.options.deadline);
    };
    try {
      const deadline = scenario.expiry === 'caller' ? NOW + 5000 : f.options.deadline;
      const result = await reopened.allocateClients(scenario.count, deadline);
      expect(elapsed).toBe(scenario.elapsed);
      if (scenario.accepted) expect(result).toHaveLength(8);
      else expect(result).toBeNull();
      const state = JSON.parse(await readFile(path.join(f.options.protectedRoot, 'state.json'), 'utf8'));
      expect(state.clients).toHaveLength(scenario.accepted ? 8 : 0);
      expect((await readdir(f.options.protectedRoot)).includes('lock')).toBe(!scenario.accepted);
    } finally { clock.mockRestore(); }
  });

  it.each([true, false])('staged allocation samples opening authority once before reading either root when current is %s', async allowed => {
    const f = await fixture(), root = f.options.protectedRoot;
    let measuring = false, checks = 0, checksAtOpen: number | undefined;
    const reopened = await openUrlMachineStore({
      ...f.options,
      current: () => { if (!measuring) return true; checks++; return allowed; },
      currentAsync: async () => true,
    }, f.store.identitySha256);
    if (!reopened) throw new Error('owned store reopen refused');
    cleanup.push(() => reopened.close());
    filesystem.afterLstat = file => { if (file === root) checksAtOpen ??= checks; };
    measuring = true;
    const result = await reopened.allocateClients(8, f.options.deadline);
    if (allowed) {
      expect(checksAtOpen).toBe(1);
      expect(result).toHaveLength(8);
    } else {
      expect(checks).toBe(1);
      expect(checksAtOpen).toBeUndefined();
      expect(result).toBeNull();
    }
    expect(await readdir(root)).not.toContain('lock');
  });

  it.each([true, false])('checks staged allocation authority once between readback and cleanup when current is %s', async allowed => {
    const f = await fixture(), root = f.options.protectedRoot;
    let measuring = false, asyncChecks = 0, syncChecks = 0, checksAtCleanup: number | undefined;
    const reopened = await openUrlMachineStore({ ...f.options,
      currentAsync: async () => { if (measuring) asyncChecks++; return true; },
      current: () => {
        if (!measuring || asyncChecks !== 5) return true;
        syncChecks++;
        return allowed;
      },
    }, f.store.identitySha256);
    if (!reopened) throw new Error('owned store reopen refused');
    cleanup.push(() => reopened.close());
    filesystem.beforeRmdir = file => { if (file.startsWith('/proc/self/fd/')) checksAtCleanup = syncChecks; };
    measuring = true;
    const result = await reopened.allocateClients(8, f.options.deadline);
    if (allowed) {
      expect(result).toHaveLength(8);
      expect(checksAtCleanup).toBe(1);
      expect(asyncChecks).toBe(6);
    } else {
      expect(result).toBeNull();
      expect(checksAtCleanup).toBeUndefined();
      expect(syncChecks).toBe(1);
      expect(asyncChecks).toBe(5);
    }
    const state = JSON.parse(await readFile(path.join(root, 'state.json'), 'utf8'));
    expect(state.clients).toHaveLength(8);
    expect(state.clients.every((client: { anchor: { kind: string } }) => client.anchor.kind === 'never-issued')).toBe(true);
    expect((await readdir(root)).includes('lock')).toBe(!allowed);
  });

  it.each([true, false])('joins the staged allocation lock sync and census before currentness %s admits state reads', async allowed => {
    const f = await fixture(), root = f.options.protectedRoot, stateFile = path.join(root, 'state.json');
    const before = await readFile(stateFile);
    let measuring = false, asyncSamples = 0, censusStarted = false, stateOpened = false, rootSyncs = 0;
    const reopened = await openUrlMachineStore({ ...f.options, currentAsync: async () => {
      if (!measuring) return true;
      return ++asyncSamples !== 2 || allowed;
    } }, f.store.identitySha256);
    if (!reopened) throw new Error('owned store reopen refused');
    cleanup.push(() => reopened.close());

    let enterSync!: () => void, releaseSync!: () => void;
    const syncEntered = new Promise<void>(resolve => { enterSync = resolve; });
    const syncReleased = new Promise<void>(resolve => { releaseSync = resolve; });
    filesystem.afterSync = file => {
      if (file !== root || ++rootSyncs !== 1) return;
      enterSync();
      return syncReleased;
    };
    filesystem.beforeOpendir = file => { if (/^\/proc\/self\/fd\/[0-9]+$/u.test(file)) censusStarted = true; };
    filesystem.beforeOpen = file => { if (path.basename(file) === 'state.json') stateOpened = true; };

    measuring = true;
    const pending = reopened.allocateClients(8, f.options.deadline);
    await syncEntered;
    const whileSyncHeld = { censusStarted, stateOpened, asyncSamples };
    releaseSync();
    const issued = await pending;
    expect(whileSyncHeld).toEqual({ censusStarted: true, stateOpened: false, asyncSamples: 1 });
    expect(asyncSamples).toBe(allowed ? 6 : 2);
    expect(stateOpened).toBe(allowed);
    if (allowed) {
      expect(issued).toHaveLength(8);
      expect(await readdir(root)).not.toContain('lock');
    } else {
      expect(issued).toBeNull();
      expect(await readFile(stateFile)).toEqual(before);
      expect(await readdir(root)).toContain('lock');
    }
  });

  it.each(['before-rename', 'after-cleanup'] as const)('withholds every batched witness on withdrawal %s', async phase => {
    const f = await fixture();
    const stateFile = path.join(f.options.protectedRoot, 'state.json');
    const before = await readFile(stateFile), original = JSON.parse(before.toString());
    let allowed = true, rootSyncs = 0;
    const reopened = await openUrlMachineStore({ ...f.options, currentAsync: async () => allowed }, f.store.identitySha256);
    if (!reopened) throw new Error('owned store reopen refused');
    cleanup.push(() => reopened.close());
    filesystem.afterSync = file => {
      if (phase === 'before-rename' && path.basename(file).startsWith('state.json.new-')) allowed = false;
      if (phase === 'after-cleanup' && file === f.options.protectedRoot && ++rootSyncs === 3) allowed = false;
    };
    expect(await reopened.allocateClients(8, f.options.deadline)).toBeNull();
    expect(allowed).toBe(false);
    const actual = await readFile(stateFile);
    if (phase === 'before-rename') expect(actual).toEqual(before);
    else {
      const { clients } = JSON.parse(actual.toString());
      expect(clients).toHaveLength(8);
      expect(JSON.parse(actual.toString())).toEqual({ ...original, clients: clients.map(({ clientId, witnessSha256 }: { clientId: string; witnessSha256: string }) => ({
        clientId, witnessSha256, audit: [], anchor: { kind: 'never-issued', clientId, witnessSha256 },
      })) });
    }
    expect(await readdir(f.canonicalRoot)).toEqual([]);
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

  it.each([1, 8])('refuses a staged %i-slot retry when contention clears after its original cutoff', async slots => {
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
      expect(await reopened!.allocateClients(slots, f.options.deadline)).toBeNull();
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

  it.each([1, 8])('returns %i-slot allocation at the clipped deadline while its late cleanup still owns the descriptor', async count => {
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
    const allocation = reopened!.allocateClients(count, NOW + 1_000);
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

  it('confirms protected state and client bytes within five seconds of fresh authority checks', async () => {
    const f = await fixture(), slot = await f.allocate();
    expect((await slot.publish()).ok).toBe(true);
    const revoked = { ...slot.record, revision: 2, revokedAt: new Date(NOW).toISOString() };
    const publication = await slot.publish(revoked, { revision: 1, sha256: sha256(canon(slot.record)) });
    if (!publication.ok) throw new Error('fixture retirement refused');
    let elapsed = 0, measuring = false;
    const reopened = await openUrlMachineStore({ ...f.options, currentAsync: async () => {
      if (measuring) elapsed += 400;
      return true;
    } }, f.store.identitySha256);
    if (!reopened) throw new Error('fixture reopen refused');
    cleanup.push(() => reopened.close());
    const original = performance.now.bind(performance);
    const clock = vi.spyOn(performance, 'now').mockImplementation(() => original() + elapsed);
    try {
      measuring = true;
      const finished = await reopened.exclusive(slot.context.clientId, f.options.deadline, async lease => {
        expect(await lease.read()).toEqual({ canonical: canon(revoked), anchor: { kind: 'committed', head: publication.receipt },
          audit: publication.receipt, projection: publication.receipt.record });
        expect(lease.current()).toBe(true);
      });
      expect(finished).toBe(true);
      expect(elapsed).toBe(4000);
    } finally { clock.mockRestore(); }
  });

  it.each(['async', 'both'] as const)('checks the complete terminal read beyond five seconds under %s authority latency', async latency => {
    const f = await fixture(), slot = await f.allocate();
    let elapsed = 0, measuring = false, syncChecks = 0, asyncChecks = 0;
    const reopened = await openUrlMachineStore({ ...f.options, current: () => {
      if (measuring) {
        syncChecks++;
        if (latency === 'both') elapsed += 400;
      }
      return f.options.current();
    }, currentAsync: async () => {
      if (measuring) { asyncChecks++; elapsed += latency === 'both' ? 480 : 1040; }
      return true;
    } }, f.store.identitySha256);
    if (reopened === null) throw new Error('fixture reopen refused');
    cleanup.push(() => reopened.close());
    const original = performance.now.bind(performance);
    const clock = vi.spyOn(performance, 'now').mockImplementation(() => original() + elapsed);
    try {
      measuring = true;
      const verify = vi.fn<Parameters<typeof reopened.readTerminal>[2]>(async lease => {
        expect(Object.keys(lease).sort()).toEqual(['read', 'sampleCurrent']);
        expect(await lease.read()).toMatchObject({ canonical: null, projection: null, audit: null,
          anchor: { kind: 'never-issued', clientId: slot.context.clientId } });
        expect(lease.sampleCurrent()).toBe(NOW);
        expect(lease.sampleCurrent()).toBe(NOW);
      });
      expect(await reopened.readTerminal(slot.context.clientId, f.options.deadline, verify)).toBe(true);
      expect(verify).toHaveBeenCalledTimes(1);
      expect(asyncChecks).toBe(5);
      expect(syncChecks).toBe(7);
      expect(elapsed).toBe(5_200);
    } finally { clock.mockRestore(); }
  });

  it.each(['original caller', 'original run', 'async envelope', 'sync envelope', 'sync withdrawal'] as const)(
    'withholds a terminal confirmation at the %s boundary after reading its snapshot', async boundary => {
    const f = await fixture(boundary === 'original run' ? 6000 : 60_000), slot = await f.allocate();
    const reopened = await openUrlMachineStore({ ...f.options,
      ...(boundary === 'sync envelope' ? {} : { currentAsync: async () => true }),
    }, f.store.identitySha256);
    if (reopened === null) throw new Error('fixture reopen refused');
    cleanup.push(() => reopened.close());
    const deadline = boundary === 'original caller' ? NOW + 6000 : f.options.deadline;
    let elapsed = 0;
    const original = performance.now.bind(performance);
    const clock = vi.spyOn(performance, 'now').mockImplementation(() => original() + elapsed);
    let snapshot: unknown, before: number | null | undefined, after: number | null | undefined;
    const verify = vi.fn<Parameters<typeof reopened.readTerminal>[2]>(async lease => {
      snapshot = await lease.read();
      before = lease.sampleCurrent();
      if (boundary === 'original caller' || boundary === 'original run') f.tick(NOW + 6000);
      else if (boundary === 'sync withdrawal') f.revoke();
      else elapsed = boundary === 'async envelope' ? 10_000 : 5000;
      after = lease.sampleCurrent();
    });
    try {
      expect(await reopened.readTerminal(slot.context.clientId, deadline, verify)).toBe(false);
    } finally { clock.mockRestore(); }
    expect(verify).toHaveBeenCalledTimes(1);
    expect(snapshot).toMatchObject({ canonical: null, projection: null, audit: null,
      anchor: { kind: 'never-issued', clientId: slot.context.clientId } });
    expect(before).toBe(NOW);
    expect(after).toBeNull();
    // An expired or withdrawn confirmation cannot release an uncertain lock.
    expect(await readdir(f.options.protectedRoot)).toContain('lock');
  });

  it('withholds client and projection reads when async authority is withdrawn while reading terminal state', async () => {
    const f = await fixture(), slot = await f.allocate();
    expect((await slot.publish()).ok).toBe(true);
    let withdrew = false, refused = false;
    const terminalNames = new Set([path.basename(slot.file), path.basename(slot.projection)]);
    const reopened = await openUrlMachineStore({ ...f.options, currentAsync: async () => {
      if (!withdrew) return true;
      refused = true;
      return false;
    } }, f.store.identitySha256);
    if (reopened === null) throw new Error('fixture reopen refused');
    cleanup.push(() => reopened.close());
    filesystem.afterClose = file => { if (path.basename(file) === 'state.json') withdrew = true; };
    const readTerminalFile = vi.fn();
    filesystem.beforeOpen = file => { if (terminalNames.has(path.basename(file))) readTerminalFile(); };
    const inspect = vi.fn();
    expect(await reopened.readTerminal(slot.context.clientId, f.options.deadline, async lease => {
      inspect(await lease.read());
    })).toBe(false);
    expect(withdrew).toBe(true);
    expect(refused).toBe(true);
    expect(f.options.current()).toBe(true);
    expect(readTerminalFile).not.toHaveBeenCalled();
    expect(inspect).not.toHaveBeenCalled();
  });

  it('resamples async authority before a delayed terminal state read', async () => {
    const f = await fixture(), slot = await f.allocate();
    let withdrew = false, refused = false;
    const reopened = await openUrlMachineStore({ ...f.options, currentAsync: async () => {
      if (!withdrew) return true;
      refused = true;
      return false;
    } }, f.store.identitySha256);
    if (reopened === null) throw new Error('fixture reopen refused');
    cleanup.push(() => reopened.close());
    const readState = vi.fn();
    filesystem.beforeOpen = file => { if (path.basename(file) === 'state.json') readState(); };
    const inspect = vi.fn();
    expect(await reopened.readTerminal(slot.context.clientId, f.options.deadline, async lease => {
      await Promise.resolve();
      withdrew = true;
      inspect(await lease.read());
    })).toBe(false);
    expect(refused).toBe(true);
    expect(readState).not.toHaveBeenCalled();
    expect(inspect).not.toHaveBeenCalled();
  });

  it.each(['async', 'sync'] as const)('refuses terminal lock submission when %s authority is withdrawn', async authority => {
    const f = await fixture(), slot = await f.allocate();
    let revoke = false, asyncSample = false;
    const reopened = await openUrlMachineStore({ ...f.options,
      current: () => f.options.current() && !(authority === 'sync' && asyncSample),
      currentAsync: async () => {
        if (!revoke) return true;
        asyncSample = true;
        return authority !== 'async';
      },
    }, f.store.identitySha256);
    if (reopened === null) throw new Error('fixture reopen refused');
    cleanup.push(() => reopened.close());
    const submit = vi.fn();
    filesystem.beforeMkdir = submit;
    const verify = vi.fn();
    revoke = true;
    expect(await reopened.readTerminal(slot.context.clientId, f.options.deadline, verify)).toBe(false);
    expect(asyncSample).toBe(true);
    expect(submit).not.toHaveBeenCalled();
    expect(verify).not.toHaveBeenCalled();
  });

  it('refuses to submit the terminal lock census when authority sampling crosses the deadline', async () => {
    const f = await fixture(), slot = await f.allocate();
    let lockSubmitted = false, censusSubmitted = false, expired = false;
    const reopened = await openUrlMachineStore({ ...f.options, currentAsync: async () => {
      if (lockSubmitted && !expired) {
        // Advance after the authority promise has resolved and before its caller resumes.
        queueMicrotask(() => queueMicrotask(() => queueMicrotask(() => {
          f.tick(f.options.deadline);
          expired = true;
        })));
      }
      return true;
    } }, f.store.identitySha256);
    if (reopened === null) throw new Error('fixture reopen refused');
    cleanup.push(() => reopened.close());
    filesystem.beforeMkdir = file => { if (path.basename(file) === 'lock') lockSubmitted = true; };
    filesystem.beforeOpendir = () => { censusSubmitted = true; };
    const verify = vi.fn();
    expect(await reopened.readTerminal(slot.context.clientId, f.options.deadline, verify)).toBe(false);
    expect(expired).toBe(true);
    expect(censusSubmitted).toBe(false);
    expect(verify).not.toHaveBeenCalled();
    expect(await readdir(f.options.protectedRoot)).toContain('lock');
  });

  it.each(['withdrawn', 'root replaced', 'expired'] as const)('withholds a terminal snapshot after its bytes were read when %s', async change => {
    const f = await fixture(), slot = await f.allocate();
    expect((await slot.publish()).ok).toBe(true);
    const completed = new Set<string>();
    const terminalNames = new Set([path.basename(slot.file), path.basename(slot.projection)]);
    let confirmed = false;
    const reopened = await openUrlMachineStore({ ...f.options, currentAsync: async () => {
      if (completed.size !== terminalNames.size) return true;
      confirmed = true;
      if (change === 'withdrawn') return false;
      if (change === 'expired') f.tick(f.options.deadline);
      else {
        await rename(f.canonicalRoot, f.canonicalRoot + '.previous');
        await mkdir(f.canonicalRoot, { mode: 0o700 });
      }
      return true;
    } }, f.store.identitySha256);
    if (reopened === null) throw new Error('fixture reopen refused');
    cleanup.push(() => reopened.close());
    filesystem.afterClose = file => {
      const name = path.basename(file);
      if (terminalNames.has(name)) completed.add(name);
    };
    const inspect = vi.fn();
    expect(await reopened.readTerminal(slot.context.clientId, f.options.deadline, async lease => {
      inspect(await lease.read());
    })).toBe(false);
    expect(completed).toEqual(terminalNames);
    expect(confirmed).toBe(true);
    expect(inspect).not.toHaveBeenCalled();
  });

  it('refuses a swapped named root before submitting a terminal-read lock', async () => {
    const f = await fixture(), slot = await f.allocate();
    const displaced = f.options.protectedRoot + '.previous';
    let swapRoot = false, submitted = false;
    const reopened = await openUrlMachineStore({ ...f.options, currentAsync: async () => {
      if (swapRoot) {
        swapRoot = false;
        await rename(f.options.protectedRoot, displaced);
        await mkdir(f.options.protectedRoot, { mode: 0o700 });
      }
      return true;
    } }, f.store.identitySha256);
    if (reopened === null) throw new Error('fixture reopen refused');
    cleanup.push(() => reopened.close());
    filesystem.beforeMkdir = file => { if (path.basename(file) === 'lock') submitted = true; };
    const verify = vi.fn();
    swapRoot = true;
    expect(await reopened.readTerminal(slot.context.clientId, f.options.deadline, verify)).toBe(false);
    expect(swapRoot).toBe(false);
    expect(submitted).toBe(false);
    expect(verify).not.toHaveBeenCalled();
  });

  it('detaches terminal snapshots from cached lifecycle metadata', async () => {
    const f = await fixture(), slot = await f.allocate();
    expect((await slot.publish()).ok).toBe(true);
    const revoked = { ...slot.record, revision: 2, revokedAt: new Date(NOW).toISOString() };
    const publication = await slot.publish(revoked, { revision: 1, sha256: sha256(canon(slot.record)) });
    if (!publication.ok) throw new Error('fixture retirement refused');
    expect(await f.store.readTerminal(slot.context.clientId, f.options.deadline, async lease => {
      const first = await lease.read();
      if (first?.anchor.kind !== 'committed' || first.audit === null || first.projection === null || first.canonical === null)
        throw new Error('fixture terminal read refused');
      expect(Reflect.set(first.anchor.head.record, 'revision', 999)).toBe(false);
      expect(Reflect.set(first.audit.binding, 'controllerSha256', '0'.repeat(64))).toBe(false);
      expect(Reflect.set(first.projection, 'revision', 999)).toBe(false);
      first.canonical.fill(0);
      const second = await lease.read();
      expect(second).toEqual({ canonical: canon(revoked), anchor: { kind: 'committed', head: publication.receipt },
        audit: publication.receipt, projection: publication.receipt.record });
      expect(second?.anchor).not.toBe(first.anchor);
    })).toBe(true);
  });

  it('refuses terminal read lock contention that clears after one second', async () => {
    const f = await fixture(), slot = await f.allocate();
    const lock = path.join(f.options.protectedRoot, 'lock');
    let submissions = 0, elapsed = 0;
    const reopened = await openUrlMachineStore({ ...f.options, currentAsync: async () => {
      if (submissions === 1 && elapsed === 0) {
        await rmdir(lock);
        elapsed = 1001;
      }
      return true;
    } }, f.store.identitySha256);
    if (reopened === null) throw new Error('fixture reopen refused');
    cleanup.push(() => reopened.close());
    await mkdir(lock, { mode: 0o700 });
    filesystem.beforeMkdir = file => { if (path.basename(file) === 'lock') submissions++; };
    const verify = vi.fn();
    const original = performance.now.bind(performance);
    const clock = vi.spyOn(performance, 'now').mockImplementation(() => original() + elapsed);
    try {
      expect(await reopened.readTerminal(slot.context.clientId, f.options.deadline, verify)).toBe(false);
    } finally { clock.mockRestore(); }
    expect(elapsed).toBe(1001);
    expect(submissions).toBe(1);
    expect(verify).not.toHaveBeenCalled();
  });

  it.each([
    { authority: 'synchronous', withdrawal: 'none' },
    { authority: 'asynchronous', withdrawal: 'none' },
    { authority: 'asynchronous', withdrawal: 'during-confirmation' },
    { authority: 'asynchronous', withdrawal: 'queued-after-check' },
    { authority: 'asynchronous', withdrawal: 'named-root-replaced' },
  ] as const)('settles a late terminal read lock under $authority authority (withdrawal $withdrawal)',
    async ({ authority, withdrawal }) => {
    const f = await fixture(), slot = await f.allocate();
    const lock = path.join(f.options.protectedRoot, 'lock');
    const displacedRoot = f.options.protectedRoot + '.previous';
    const retainsLock = withdrawal === 'during-confirmation' || withdrawal === 'named-root-replaced';
    let submissions = 0, elapsed = 0, withdrawn = false, stateRead = false;
    let cleanupWhileCurrent: boolean | undefined;
    const reopened = await openUrlMachineStore({ ...f.options, current: () => {
      if (elapsed === 1001 && withdrawal === 'queued-after-check') queueMicrotask(() => { withdrawn = true; });
      return !withdrawn;
    },
      ...(authority === 'asynchronous' ? { currentAsync: async () => {
        if (elapsed === 1001 && withdrawal === 'during-confirmation') withdrawn = true;
        if (elapsed === 1001 && withdrawal === 'named-root-replaced') {
          await rename(f.options.protectedRoot, displacedRoot);
          await mkdir(f.options.protectedRoot, { mode: 0o700 });
        }
        return true;
      } } : {}) }, f.store.identitySha256);
    if (reopened === null) throw new Error('fixture reopen refused');
    cleanup.push(() => reopened.close());
    await mkdir(lock, { mode: 0o700 });
    filesystem.beforeMkdir = file => {
      if (path.basename(file) !== 'lock' || ++submissions !== 2) return;
      return rmdir(lock).then(() => { elapsed = 1001; });
    };
    filesystem.beforeOpen = file => { if (path.basename(file) === 'state.json') stateRead = true; };
    filesystem.beforeRmdir = file => { if (file.startsWith('/proc/self/fd/')) cleanupWhileCurrent = !withdrawn; };
    const verify = vi.fn();
    const original = performance.now.bind(performance);
    const clock = vi.spyOn(performance, 'now').mockImplementation(() => original() + elapsed);
    try {
      expect(await reopened.readTerminal(slot.context.clientId, f.options.deadline, verify)).toBe(false);
    } finally { clock.mockRestore(); }
    expect(elapsed).toBe(1001);
    expect(submissions).toBe(2);
    expect(verify).not.toHaveBeenCalled();
    expect(stateRead).toBe(false);
    expect(withdrawn).toBe(withdrawal === 'during-confirmation' || withdrawal === 'queued-after-check');
    expect(cleanupWhileCurrent).toBe(retainsLock ? undefined : true);
    const files = await readdir(withdrawal === 'named-root-replaced' ? displacedRoot : f.options.protectedRoot);
    expect(files.includes('lock')).toBe(retainsLock);
  });

  it.each([
    { kind: 'resumed', allowed: true, overlaps: true },
    { kind: 'resumed', allowed: false, overlaps: true },
    { kind: 'ordinary', allowed: true, overlaps: true },
    { kind: 'ordinary', allowed: false, overlaps: true },
    { kind: 'ordered', allowed: true, overlaps: false },
    { kind: 'unprofiled', allowed: true, overlaps: false },
  ] as const)('keeps the $kind lock sync and census before authority-gated state reads when current is $allowed', async ({ kind, allowed, overlaps }) => {
    const profile = effectProfile(kind === 'ordered'), f = await fixture(), slot = await f.allocate(profile);
    expect((await slot.publish()).ok).toBe(true);
    let current = true;
    const authority = kind === 'resumed' ? { currentAsync: async () => current } : { current: () => current };
    const reopened = await openUrlMachineStore({ ...f.options, ...authority }, f.store.identitySha256);
    if (!reopened) throw new Error('owned store reopen refused');
    cleanup.push(() => reopened.close());
    let reportSync!: () => void, releaseSync!: () => void;
    const synced = new Promise<void>(resolve => { reportSync = resolve; });
    const syncHold = new Promise<void>(resolve => { releaseSync = resolve; });
    let censusStarted = false, readStarted = false;
    filesystem.beforeOpendir = file => { if (/^\/proc\/self\/fd\/[0-9]+$/u.test(file)) censusStarted = true; };
    filesystem.afterSync = file => {
      if (file === f.options.protectedRoot) { reportSync(); return syncHold; }
    };
    filesystem.beforeOpen = file => { if (path.basename(file) === 'state.json') readStarted = true; };
    const pending = reopened.exclusive(slot.context.clientId, f.options.deadline, async lease => {
      expect(await lease.read()).toMatchObject({ canonical: canon(slot.record), anchor: { kind: 'committed' } });
    }, kind === 'ordinary' || kind === 'ordered' ? profile : undefined);
    const reached = await Promise.race([synced.then(() => true), pending.then(() => false)]);
    const held = { censusStarted, readStarted };
    current = allowed;
    releaseSync();
    expect(await pending).toBe(allowed);
    expect(reached).toBe(true);
    expect(held).toEqual({ censusStarted: overlaps, readStarted: false });
    expect(readStarted).toBe(allowed);
  });

  it('reads private state while identity is held and joins both before client access', async () => {
    const f = await fixture(), slot = await f.allocate();
    expect((await slot.publish()).ok).toBe(true);
    let signalIdentity!: () => void, releaseIdentity!: () => void;
    const identityRequested = new Promise<void>(resolve => { signalIdentity = resolve; });
    const identityHold = new Promise<void>(resolve => { releaseIdentity = resolve; });
    let stateStarted = false, archiveStarted = false, clientStarted = false;
    filesystem.beforeOpen = file => {
      switch (path.basename(file)) {
        case 'identity.json': signalIdentity(); return identityHold;
        case 'state.json': stateStarted = true; return;
        case 'canonical-history.json': archiveStarted = true; return;
        case path.basename(slot.file): clientStarted = true;
      }
    };
    const pending = f.store.exclusive(slot.context.clientId, f.options.deadline, async lease => {
      expect(await lease.read()).toMatchObject({ canonical: canon(slot.record), anchor: { kind: 'committed' } });
    });
    const reached = await Promise.race([identityRequested.then(() => true), pending.then(() => false)]);
    const held = { stateStarted, archiveStarted, clientStarted };
    releaseIdentity();
    expect(await pending).toBe(true);
    expect(reached).toBe(true);
    expect(held).toEqual({ stateStarted: true, archiveStarted: false, clientStarted: false });
    expect(archiveStarted).toBe(true);
    expect(clientStarted).toBe(true);
  });

  it('joins the held state descriptor after identity fails before refusing the read', async () => {
    const f = await fixture(), slot = await f.allocate();
    expect((await slot.publish()).ok).toBe(true);
    let reportOpen!: () => void, reportRejection!: () => void, releaseState!: () => void, reportClose!: () => void;
    const stateOpened = new Promise<void>(resolve => { reportOpen = resolve; });
    const identityFailed = new Promise<void>(resolve => { reportRejection = resolve; });
    const stateHold = new Promise<void>(resolve => { releaseState = resolve; });
    const stateClosed = new Promise<void>(resolve => { reportClose = resolve; });
    let settled = false, closed = false, clientStarted = false;
    filesystem.beforeOpen = async file => {
      if (path.basename(file) !== 'identity.json') return;
      await stateOpened;
      reportRejection();
      throw new Error('owned identity open refused');
    };
    filesystem.afterOpen = file => {
      if (path.basename(file) === path.basename(slot.file)) clientStarted = true;
      if (path.basename(file) === 'state.json') { reportOpen(); return stateHold; }
    };
    filesystem.afterClose = file => {
      if (path.basename(file) === 'state.json') { closed = true; reportClose(); }
    };
    const pending = f.store.exclusive(slot.context.clientId, f.options.deadline, async lease => { await lease.read(); })
      .then(result => { settled = true; return result; });
    const reached = await Promise.race([identityFailed.then(() => true), pending.then(() => false)]);
    await new Promise<void>(resolve => setImmediate(resolve));
    const held = { closed, settled, clientStarted };
    releaseState();
    expect(await pending).toBe(false);
    expect(reached).toBe(true);
    await stateClosed;
    expect(held).toEqual({ closed: false, settled: false, clientStarted: false });
    expect(clientStarted).toBe(false);
  });

  it.each(['exclusive', 'readTerminal'] as const)('%s checks authority after protected state I/O before opening the client', async read => {
    const f = await fixture(), slot = await f.allocate();
    expect((await slot.publish()).ok).toBe(true);
    let current = true, clientOpened = false;
    const reopened = await openUrlMachineStore({ ...f.options, currentAsync: async () => current }, f.store.identitySha256);
    expect(reopened).not.toBeNull(); cleanup.push(() => reopened!.close());
    filesystem.afterClose = file => { if (path.basename(file) === 'canonical-history.json') current = false; };
    filesystem.afterOpen = file => { if (path.basename(file) === path.basename(slot.file)) clientOpened = true; };
    const finished = await reopened![read](slot.context.clientId, f.options.deadline, async lease => { await lease.read(); });
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

  it.each([['current', 0], ['changed after preflight', 2], ['changed after the reserve predecessor read', 3]] as const)(
    'preflights one checked snapshot and rechecks the archive %s before reserve', async (_archiveState, replaceAfter) => {
    const f = await fixture(), slot = await f.allocate();
    const stateFile = path.join(f.options.protectedRoot, 'state.json');
    const pack = path.join(f.options.protectedRoot, 'canonical-history.json');
    const originalState = await readFile(stateFile);
    const archive = JSON.parse(await readFile(pack, 'utf8')) as { rootId: string };
    let archiveReads = 0;
    let readsBeforeReserve: number | undefined;
    filesystem.afterClose = file => {
      if (path.basename(file) !== 'canonical-history.json') return;
      archiveReads++;
      if (archiveReads === replaceAfter) {
        writeFileSync(pack, canon({ ...archive, rootId: id() }));
      }
    };
    filesystem.afterSync = file => {
      if (path.basename(file).startsWith('state.json.new-')) readsBeforeReserve ??= archiveReads;
    };
    const result = await f.store.publish({ context: slot.context, binding: slot.binding, expected: null, next: canon(slot.record) }, () => true);
    if (replaceAfter !== 0) {
      expect(archiveReads).toBe(replaceAfter + 1);
      expect(readsBeforeReserve).toBeUndefined();
      expect(result.ok).toBe(false);
      expect(await readFile(stateFile)).toEqual(originalState);
      await expect(readFile(slot.file)).rejects.toMatchObject({ code: 'ENOENT' });
    } else {
      // Initial lifecycle read, preflight, reserve predecessor, and reserve state.
      expect(readsBeforeReserve).toBe(4);
      expect(result.ok).toBe(true);
      expect(await readFile(slot.file)).toEqual(canon(slot.record));
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
