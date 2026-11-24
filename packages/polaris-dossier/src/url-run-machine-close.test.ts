import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createServer, Socket } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { sha256 } from '@syzygy/support';
import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { createUrlRunMachine, isUrlRunMachineClosedHistory, readUrlRunMachineClosedHistory, type UrlRunMachineOptions } from './url-run-machine.js';
import { reconstructColdUrlRunMachineHistory } from './url-machine-cold-history.js';
import * as machineStore from './url-machine-store.js';
import { publishUrlMachineLifecycle } from './url-machine-lifecycle.js';
import { URL_MACHINE_CLIENT_LIMITS, type UrlMachineClientContext, type UrlMachineClientRecord } from './url-machine-instance.js';
import { URL_ORIGIN_POLICY_PATH, URL_ROLES } from './url-run-record.js';
import type { UrlRolePlan } from './url-role-plan.js';
import type { UrlRuntime } from './url-runtime.js';
import * as peerPort from './url-machine-peer.js';
import * as sessionProfile from './session-profile.js';
import * as transportPort from './session-machine-transport.js';

// Unit scope: upstream installation/plan admission is substituted. The actual
// provisioner, eight protected filesystem allocations and close/readback run.
// The accept-order control substitutes the launch sample and peer ports.
// No native helper or CLI is executed and no peer capability is issued.
const admission = vi.hoisted(() => ({ runtimes: new WeakSet<object>(), plans: new WeakSet<object>() }));
vi.mock('./url-runtime.js', async original => ({ ...await original<typeof import('./url-runtime.js')>(),
  urlMachineReaderProgram: (value: object) => admission.runtimes.has(value) ? { executable: '/not-executed', sha256: 'a'.repeat(64) } : null,
}));
vi.mock('./url-role-plan.js', async original => ({ ...await original<typeof import('./url-role-plan.js')>(),
  isPreparedUrlRolePlan: (value: object) => admission.plans.has(value),
}));
const NOW = Date.parse('2026-11-22T01:00:00.000Z');
const id = (n: number) => n.toString(16).padStart(64, '0');
const canon = (value: unknown) => Buffer.from(encodeCanonicalJson(value, URL_MACHINE_CLIENT_LIMITS));
const cleanup: (() => Promise<unknown>)[] = [];
afterEach(async () => { vi.restoreAllMocks(); for (const close of cleanup.splice(0).reverse()) await close(); });

async function fixture(overrides: Partial<Pick<UrlRunMachineOptions, 'launch' | 'reverify' | 'waitForDesignActivation'>> = {}) {
  const root = tempDir('machine-close-'), runId = `run-${'b'.repeat(32)}`;
  let now = NOW, current = true, effects = true;
  const runtime = { inputTreeSha256: id(1), worker: { node: '/not-executed', nodeSha256: id(3) },
    peerProgram: { executable: '/not-executed', sha256: id(4) }, supportSha256: { 'session-mcp.js': id(5), 'session-bridge.js': id(6) },
  } as unknown as UrlRuntime;
  admission.runtimes.add(runtime);
  const plans = URL_ROLES.map((role, ordinal) => {
    const plan = { role, profile: { digest: id(10 + ordinal), input: { binding: { run: runId, role } } },
      view: { supportDirectory: '/not-executed', protectedPaths: [] } } as unknown as UrlRolePlan;
    admission.plans.add(plan); return plan;
  });
  await mkdir(path.join(root, 'observing/.syzygy'), { recursive: true });
  const options: UrlRunMachineOptions = { governanceRoot: path.join(root, 'observing/.syzygy'), protectedRoot: path.join(root, 'protected'),
    runtime, plans, runId, originPolicySha256: id(2), pin: 'a'.repeat(40), deadline: NOW + 60_000, now: () => now,
    parent: { rowId: 'A-1', landedCommit: 'a'.repeat(40), defaultCommit: 'a'.repeat(40), tagObject: 'b'.repeat(40),
      subjects: [{ path: URL_ORIGIN_POLICY_PATH, sha256: id(2) }] }, current: () => current, effectCurrent: () => effects,
    reverify: () => true, launch: () => undefined, audit: () => {},
    waitForDesignActivation: async () => false,
    chargeNativeCpuMicroseconds: () => { throw new Error('unit closure invoked native helper'); }, ...overrides };
  const machine = await createUrlRunMachine(options); cleanup.push(() => machine.close());
  return { root, options, machine, expire: () => { now = options.deadline; }, withdraw: () => { current = false; }, withdrawEffects: () => { effects = false; } };
}

describe('machine accept authorization ordering', () => {
  it('keeps both initial ordered Design clients unpublished across a Stop before activation', async () => {
    const createTransport = vi.spyOn(transportPort, 'createSessionMachineTransport');
    const child: NonNullable<ReturnType<UrlRunMachineOptions['launch']>> = {
      pid: 1, commandSha256: id(7), waitForSample: async () => true, finished: new Promise(() => {}),
      stop: async () => { throw new Error('fixture launch cannot be stopped'); },
    };
    let activate!: (active: boolean) => void;
    const activation = new Promise<boolean>(resolve => { activate = resolve; });
    const waitForDesignActivation = vi.fn(() => activation);
    const f = await fixture({ waitForDesignActivation });
    vi.spyOn(sessionProfile, 'isOrderedDesignSessionProfile').mockReturnValue(true);
    const wait = vi.spyOn(peerPort, 'waitForUrlMachinePeerPublication').mockImplementation(async (_peer, activate, current) =>
      await activate(child) && current());
    const designPorts = createTransport.mock.calls.slice(-2).map(([ports]) => ports);
    const admissions = designPorts.map(ports => ports.authorize!(Object.freeze({}) as peerPort.UrlMachinePeer, () => true));
    try {
      expect(waitForDesignActivation.mock.calls).toEqual([[child], [child]]);
      expect(wait).toHaveBeenCalledTimes(2);
      const stopped = await f.machine.close();
      expect(stopped).toEqual({ lifecycle: 'retired' });
      const history = readUrlRunMachineClosedHistory(stopped);
      expect(history?.clients).toHaveLength(8);
      expect(history?.clients.filter(({ context }) => context.role === 'design').map(({ terminal }) => terminal.kind))
        .toEqual(['never-issued', 'never-issued']);
    } finally { activate(true); await Promise.allSettled(admissions); }
    await expect(Promise.all(admissions)).resolves.toEqual([false, false]);
  });

  it.each(['sample-refused', 'verification-refused', 'verified'] as const)('checks the fresh verifier after the live sample for %s', async outcome => {
    const events: string[] = [];
    let constructed = false;
    const createTransport = vi.spyOn(transportPort, 'createSessionMachineTransport');
    vi.spyOn(peerPort, 'prepareUrlMachineListenerAsync').mockResolvedValue({ transport: 'kernel-sender-stream/1' });
    const capture = vi.spyOn(peerPort, 'captureUrlMachinePeer').mockImplementation(async options => {
      events.push('capture');
      expect(await options.current()).toBe(outcome === 'verified');
      return null;
    });
    const f = await fixture({ launch: () => ({ pid: 1, commandSha256: id(7),
      waitForSample: async () => { events.push('sample'); return outcome !== 'sample-refused'; },
      finished: new Promise(() => {}), stop: async () => { throw new Error('fixture launch cannot be stopped'); } }),
    reverify: async () => { events.push('verify'); return !constructed || outcome !== 'verification-refused'; } });
    const [ports] = createTransport.mock.calls[0]!;
    expect(f.machine.transport('author', 'mcp-shim')).toBe(createTransport.mock.results[0]!.value);
    expect(await ports.prepare(createServer())).toBe(true);
    events.length = 0;
    constructed = true;
    const socket = new Socket();
    try {
      expect(await ports.accept(socket)).toBeNull();
      expect(capture).toHaveBeenCalledOnce();
      expect(events).toEqual(outcome === 'sample-refused' ? ['capture', 'sample'] : ['capture', 'sample', 'verify']);
    } finally { socket.destroy(); }
  });
});

describe('retained production machine closure evidence', () => {
  it('retains eight actual never-issued anchors and immutable selected contexts from the exact clean result', async () => {
    const f = await fixture(), stateFile = path.join(f.options.protectedRoot, 'state.json'), before = await readFile(stateFile);
    expect(f.machine.current()).toBe(true); expect(readUrlRunMachineClosedHistory({ lifecycle: 'retired' })).toBeNull();
    f.withdrawEffects();
    const closing = f.machine.close(); expect(f.machine.current()).toBe(false);
    const result = await closing; expect(result).toEqual({ lifecycle: 'retired' }); expect(await f.machine.close()).toBe(result);
    const evidence = readUrlRunMachineClosedHistory(result); expect(evidence).not.toBeNull(); if (!evidence) return;
    expect(isUrlRunMachineClosedHistory(evidence)).toBe(true); expect(isUrlRunMachineClosedHistory({ ...evidence })).toBe(false);
    expect(readUrlRunMachineClosedHistory({ ...result })).toBeNull(); expect(readUrlRunMachineClosedHistory(JSON.parse(JSON.stringify(result)))).toBeNull();
    expect(evidence).toMatchObject({ authorization: 'none', replay: 'forbidden', identitySha256: f.machine.identitySha256, observedAt: NOW });
    expect(evidence.clients).toHaveLength(8);
    const actual = JSON.parse(before.toString());
    for (const client of evidence.clients) {
      expect(client.terminal).toEqual(actual.clients.find((value: { clientId: string }) => value.clientId === client.context.clientId).anchor);
      expect(client.terminal.kind).toBe('never-issued');
      expect(client.context).toMatchObject({ policySha256: f.options.originPolicySha256, sourcePin: f.options.pin, runId: f.options.runId, deadline: f.options.deadline });
      expect(client.context.profileSha256).toBe(f.options.plans.find(plan => plan.role === client.context.role)!.profile.digest);
      expect(Object.isFrozen(client.context.allowedScopes)).toBe(true);
    }
    expect(Object.isFrozen(evidence.clients)).toBe(true); expect(await readFile(stateFile)).toEqual(before);
    expect(await readdir(path.join(f.options.governanceRoot, 'governance/policies/dossier-machine-clients'))).toEqual([]);
  });

  it.each(['expire', 'withdraw'] as const)('emits no clean evidence after %s', async fault => {
    const f = await fixture(); f[fault](); const result = await f.machine.close();
    expect(result).toEqual({ lifecycle: 'Unknown' }); expect(readUrlRunMachineClosedHistory(result)).toBeNull();
  });

  it.each(['committed', 'pending'] as const)('refuses clean closure when actual %s state contradicts in-memory never-issued state', async fault => {
    const f = await fixture(), state = JSON.parse(await readFile(path.join(f.options.protectedRoot, 'state.json'), 'utf8'));
    const clientId = state.clients[0].clientId;
    if (fault === 'pending') {
      state.clients[0].anchor = { kind: 'pending', clientId, intentSha256: id(50) };
      state.used.push(clientId, id(30), id(31)); state.runs.push({ runId: f.options.runId, clients: [clientId] });
      const bytes = Buffer.from(encodeCanonicalJson(state, { maxBytes: 8_388_608, maxNodes: 524_288, maxDepth: 32 }));
      const file = path.join(f.options.protectedRoot, 'state.json'); await writeFile(file, bytes);
      const result = await f.machine.close(); expect(result).toEqual({ lifecycle: 'Unknown' }); expect(readUrlRunMachineClosedHistory(result)).toBeNull();
      expect(await readFile(file)).toEqual(bytes); return;
    }
    const store = await machineStore.openUrlMachineStore({ ...f.options }, f.machine.identitySha256); if (!store) throw new Error('owned store refused');
    const context: UrlMachineClientContext = { clientId, policySha256: f.options.originPolicySha256, profileSha256: f.options.plans[0]!.profile.digest,
      sourcePin: f.options.pin, runId: f.options.runId, role: 'author', kind: 'mcp-shim', allowedScopes: ['artifact_read'], now: NOW, deadline: f.options.deadline };
    // This independently written synthetic record tests a protected-store
    // contradiction; it is never presented as an actual captured peer.
    const record: UrlMachineClientRecord = { format: 'polaris-dossier-local-machine-client/1', clientId, issuanceId: id(30), revision: 1,
      projectId: 'project:syzygy', policySha256: context.policySha256, sourcePin: context.sourcePin, runId: context.runId, role: 'author', kind: 'mcp-shim',
      scopes: ['artifact_read'], issuedAt: new Date(NOW).toISOString(), expiresAt: new Date(context.deadline).toISOString(), revokedAt: null,
      instances: [{ instanceId: id(31), generation: 1, issuedAt: new Date(NOW).toISOString(), expiresAt: new Date(context.deadline).toISOString(), retiredAt: null, revokedAt: null,
        verifier: { mechanism: 'rfc5-7d', profileSha256: context.profileSha256, processIdentitySha256: id(32), channelIdentitySha256: id(33) } }] };
    const published = await publishUrlMachineLifecycle({ context, binding: { controllerSha256: id(1), parentBindingSha256: id(40) }, expected: null, next: canon(record) }, store);
    expect(published.ok).toBe(true); await store.close();
    const result = await f.machine.close(); expect(result).toEqual({ lifecycle: 'Unknown' }); expect(readUrlRunMachineClosedHistory(result)).toBeNull();
    const canonical = path.join(f.options.governanceRoot, 'governance/policies/dossier-machine-clients', `${clientId}.json`);
    expect(sha256(await readFile(canonical))).toBe(sha256(canon(record)));
  });
});


/** Reopen uses real cold verification and protected files. Only upstream
 * runtime/plan admission remains the same explicit unit substitution above. */
describe('same-store machine continuation seam', () => {
  async function closedFixture(issued = false) {
    const f = await fixture(), result = await f.machine.close();
    let sealed = readUrlRunMachineClosedHistory(result); if (!sealed) throw new Error('owned close refused');
    if (issued) {
      // Independently retained synthetic sealed terminal over actual lifecycle
      // writes; this is historical data, never a captured peer/credential.
      const context = sealed.clients[0]!.context;
      const store = await machineStore.openUrlMachineStore(f.options, f.machine.identitySha256); if (!store) throw new Error('owned reopen refused');
      const first: UrlMachineClientRecord = { format: 'polaris-dossier-local-machine-client/1', clientId: context.clientId,
        issuanceId: id(30), revision: 1, projectId: 'project:syzygy', policySha256: context.policySha256, sourcePin: context.sourcePin,
        runId: context.runId, role: context.role, kind: context.kind, scopes: context.allowedScopes,
        issuedAt: new Date(NOW - 1).toISOString(), expiresAt: new Date(context.deadline).toISOString(), revokedAt: null,
        instances: [{ instanceId: id(31), generation: 1, issuedAt: new Date(NOW - 1).toISOString(), expiresAt: new Date(context.deadline).toISOString(),
          retiredAt: null, revokedAt: null, verifier: { mechanism: 'rfc5-7d', profileSha256: context.profileSha256,
            processIdentitySha256: id(32), channelIdentitySha256: id(33) } }] };
      const publication = await publishUrlMachineLifecycle({ context, binding: sealed.binding, expected: null, next: canon(first) }, store);
      const next = { ...first, revision: 2, revokedAt: new Date(NOW).toISOString() };
      const revoked = await publishUrlMachineLifecycle({ context, binding: sealed.binding,
        expected: { revision: 1, sha256: sha256(canon(first)) }, next: canon(next) }, store);
      if (!publication.ok || !revoked.ok) throw new Error('owned historical publication refused');
      await store.close();
      sealed = { ...sealed, clients: [{ context, terminal: { kind: 'revoked', head: revoked.receipt } }, ...sealed.clients.slice(1)] };
    }
    const history = await reconstructColdUrlRunMachineHistory({ governanceRoot: f.options.governanceRoot, protectedRoot: f.options.protectedRoot,
      sealed, expected: { identitySha256: f.machine.identitySha256, binding: sealed.binding, runId: f.options.runId, sourcePin: f.options.pin,
        originPolicySha256: f.options.originPolicySha256,
        profiles: Object.fromEntries(f.options.plans.map(plan => [plan.role, plan.profile.digest])) as Record<typeof URL_ROLES[number], string>,
        deadline: f.options.deadline }, now: f.options.now, current: f.options.current });
    if (!history) throw new Error('owned cold history refused');
    let claim = true;
    const options: UrlRunMachineOptions = { ...f.options,
      resume: { history, identitySha256: f.machine.identitySha256, current: () => claim } };
    return { ...f, history, options, withdrawClaim: () => { claim = false; } };
  }

  it.each([0, 1, 4])('retains exact old anchors and allocates only %i freshly prepared roles in the same store', async count => {
    const f = await closedFixture(), stateFile = path.join(f.options.protectedRoot, 'state.json'), before = JSON.parse(await readFile(stateFile, 'utf8'));
    const requiredRoles = URL_ROLES.slice(0, count), plans = f.options.plans.slice(0, count);
    const resumed = await createUrlRunMachine({ ...f.options, plans, requiredRoles }); cleanup.push(() => resumed.close());
    expect(resumed.identitySha256).toBe(f.machine.identitySha256); expect(resumed.current()).toBe(true);
    const during = JSON.parse(await readFile(stateFile, 'utf8'));
    expect(during.clients).toHaveLength(8 + 2 * count); expect(during.clients.slice(0, 8)).toEqual(before.clients);
    expect(during.used).toEqual(before.used); expect(during.runs).toEqual(before.runs);
    if (count < 4) expect(() => resumed.transport(URL_ROLES[count]!, 'mcp-shim')).toThrow('url-run-machine-unavailable');
    const result = await resumed.close(); expect(result).toEqual({ lifecycle: 'retired' });
    const evidence = readUrlRunMachineClosedHistory(result)!; expect(evidence.clients).toHaveLength(8 + 2 * count);
    expect(evidence.clients.slice(0, 8)).toEqual(f.history.clients); expect(evidence.identitySha256).toBe(f.machine.identitySha256);
    expect(evidence.clients.every(client => client.context.deadline === f.options.deadline)).toBe(true);
    expect(evidence.clients.slice(8).map(client => client.context.role)).toEqual(requiredRoles.flatMap(role => [role, role]));
    expect(new Set(evidence.clients.map(client => client.context.clientId)).size).toBe(8 + 2 * count);
  });

  it.each(['copy', 'identity', 'controller', 'parent', 'deadline', 'run', 'pin', 'origin', 'profile', 'missing-store', 'clock', 'claim', 'unprepared', 'extra-plan', 'duplicate-role', 'role-order'] as const)('refuses %s drift without allocating fresh endpoints', async fault => {
    const f = await closedFixture(), stateFile = path.join(f.options.protectedRoot, 'state.json'), before = await readFile(stateFile);
    let options = f.options;
    if (fault === 'copy') options = { ...options, resume: { ...options.resume!, history: { ...f.history } } };
    if (fault === 'identity') options = { ...options, resume: { ...options.resume!, identitySha256: id(99) } };
    if (fault === 'controller') {
      const runtime = { ...options.runtime, inputTreeSha256: id(99) } as UrlRuntime;
      admission.runtimes.add(runtime); options = { ...options, runtime };
    }
    if (fault === 'parent') options = { ...options, parent: { ...options.parent, landedCommit: 'c'.repeat(40) } };
    if (fault === 'deadline') options = { ...options, deadline: options.deadline + 1 };
    if (fault === 'run') options = { ...options, runId: `run-${'c'.repeat(32)}`, plans: [], requiredRoles: [] };
    if (fault === 'pin') options = { ...options, pin: 'c'.repeat(40) };
    if (fault === 'origin') options = { ...options, originPolicySha256: id(99), parent: { ...options.parent,
      subjects: [{ path: URL_ORIGIN_POLICY_PATH, sha256: id(99) }] } };
    if (fault === 'profile') {
      const plan = { ...options.plans[0]!, profile: { ...options.plans[0]!.profile, digest: id(99) } } as UrlRolePlan;
      admission.plans.add(plan); options = { ...options, plans: [plan, ...options.plans.slice(1)] };
    }
    if (fault === 'missing-store') options = { ...options, protectedRoot: path.join(f.root, 'alternate-store') };
    if (fault === 'clock') options = { ...options, now: () => NOW - 1 };
    if (fault === 'claim') f.withdrawClaim();
    if (fault === 'unprepared') options = { ...options, plans: [{ ...options.plans[0]! }, ...options.plans.slice(1)] };
    if (fault === 'extra-plan') options = { ...options, requiredRoles: ['author'] };
    if (fault === 'duplicate-role') options = { ...options, requiredRoles: ['author', 'author'], plans: [options.plans[0]!, options.plans[0]!] };
    if (fault === 'role-order') options = { ...options, requiredRoles: ['inventory', 'author'], plans: [options.plans[1]!, options.plans[0]!] };
    await expect(createUrlRunMachine(options)).rejects.toThrow('url-run-machine-unavailable');
    expect(await readFile(stateFile)).toEqual(before);
    expect((await readdir(f.root)).includes('alternate-store')).toBe(false);
  });

  it('preserves an actually revoked old head through a fresh same-role allocation and close', async () => {
    const f = await closedFixture(true), stateFile = path.join(f.options.protectedRoot, 'state.json'), before = JSON.parse(await readFile(stateFile, 'utf8'));
    const old = f.history.clients[0]!, canonicalFile = path.join(f.options.governanceRoot, 'governance/policies/dossier-machine-clients', `${old.context.clientId}.json`);
    const canonicalBefore = await readFile(canonicalFile);
    const resumed = await createUrlRunMachine({ ...f.options, requiredRoles: ['author'], plans: f.options.plans.slice(0, 1) }); cleanup.push(() => resumed.close());
    const result = await resumed.close(), evidence = readUrlRunMachineClosedHistory(result)!;
    expect(result).toEqual({ lifecycle: 'retired' }); expect(evidence.clients[0]).toEqual(old); expect(evidence.clients).toHaveLength(10);
    const after = JSON.parse(await readFile(stateFile, 'utf8')); expect(after.runs).toEqual(before.runs); expect(after.used).toEqual(before.used);
    expect(after.clients.slice(0, 8)).toEqual(before.clients); expect(await readFile(canonicalFile)).toEqual(canonicalBefore);
  });

  it.each([0, 1, 2])('uses one held authority and time sample at each terminal boundary (refusal %i)', async refusal => {
    const f = await closedFixture(true), stateFile = path.join(f.options.protectedRoot, 'state.json');
    const before = await readFile(stateFile);
    const sampleTimes: (number | null)[] = [];
    const separateClock = vi.fn(() => { throw new Error('unexpected unpaired clock read'); });
    const separateCurrent = vi.fn(() => { throw new Error('unexpected unpaired authority check'); });
    const open = machineStore.openUrlMachineStore;
    vi.spyOn(machineStore, 'openUrlMachineStore').mockImplementationOnce(async (...args) => {
      const store = await open(...args);
      if (store === null) return null;
      let first = true;
      return { ...store, readTerminal: (clientId, deadline, operation) => {
        if (!first) return store.readTerminal(clientId, deadline, operation);
        first = false;
        return store.readTerminal(clientId, deadline, lease => {
          const observed = {
            ...lease, current: separateCurrent, now: separateClock,
            sampleCurrent: () => {
              const actual = lease.sampleCurrent();
              const sample = sampleTimes.length + 1 === refusal ? null : actual;
              sampleTimes.push(sample);
              return sample;
            },
          };
          return operation(observed);
        });
      } };
    });
    const create = createUrlRunMachine({ ...f.options, requiredRoles: ['author'], plans: f.options.plans.slice(0, 1) });
    if (refusal === 0) {
      const resumed = await create;
      cleanup.push(() => resumed.close());
      expect(resumed.current()).toBe(true);
      expect(sampleTimes).toEqual([NOW, NOW]);
      const beforeClients = JSON.parse(before.toString()).clients;
      const afterClients = JSON.parse(await readFile(stateFile, 'utf8')).clients;
      expect(afterClients).toHaveLength(beforeClients.length + 2);
      expect(afterClients.slice(0, beforeClients.length)).toEqual(beforeClients);
    } else {
      await expect(create).rejects.toThrow('url-run-machine-unavailable');
      expect(sampleTimes).toEqual(refusal === 1 ? [null] : [NOW, null]);
      expect(await readFile(stateFile)).toEqual(before);
    }
    expect(separateCurrent).not.toHaveBeenCalled();
    expect(separateClock).not.toHaveBeenCalled();
  });

  it('refuses a changed protected retired head after genuine cold capture and never allocates around it', async () => {
    const f = await closedFixture(true), old = f.history.clients[0]!, store = await machineStore.openUrlMachineStore(f.options, f.machine.identitySha256);
    if (!store || old.terminal.kind !== 'revoked') throw new Error('owned historical reopen refused');
    const canonicalFile = path.join(f.options.governanceRoot, 'governance/policies/dossier-machine-clients', `${old.context.clientId}.json`);
    const prior = JSON.parse(await readFile(canonicalFile, 'utf8')) as UrlMachineClientRecord;
    const next = { ...prior, revision: 3, instances: prior.instances.map(instance => ({ ...instance, revokedAt: new Date(NOW).toISOString() })) };
    const advanced = await publishUrlMachineLifecycle({ context: old.context, binding: old.terminal.head.binding,
      expected: { revision: 2, sha256: sha256(canon(prior)) }, next: canon(next) }, store);
    expect(advanced.ok).toBe(true); await store.close();
    const stateFile = path.join(f.options.protectedRoot, 'state.json'), before = await readFile(stateFile);
    await expect(createUrlRunMachine(f.options)).rejects.toThrow('url-run-machine-unavailable');
    expect(await readFile(stateFile)).toEqual(before); expect(await readFile(canonicalFile)).toEqual(canon(next));
  });

  it.each(['run-authority', 'claim'] as const)('withdraws both live currentness and retirement when %s is lost', async guard => {
    const f = await closedFixture();
    const resumed = await createUrlRunMachine({ ...f.options, requiredRoles: [], plans: [] }); cleanup.push(() => resumed.close());
    expect(resumed.current()).toBe(true);
    if (guard === 'claim') f.withdrawClaim(); else f.withdraw();
    expect(resumed.current()).toBe(false);
    const result = await resumed.close(); expect(result).toEqual({ lifecycle: 'Unknown' }); expect(readUrlRunMachineClosedHistory(result)).toBeNull();
  });

  it.each(['run-authority', 'claim'] as const)('refuses %s withdrawal after awaited revalidation before any fresh allocation', async guard => {
    const f = await closedFixture(), stateFile = path.join(f.options.protectedRoot, 'state.json'), before = await readFile(stateFile);
    let count = 0;
    await expect(createUrlRunMachine({ ...f.options, reverify: async () => {
      if (++count === 2) { if (guard === 'claim') f.withdrawClaim(); else f.withdraw(); }
      return true;
    } }))
      .rejects.toThrow('url-run-machine-unavailable');
    expect(await readFile(stateFile)).toEqual(before);
  });
});
