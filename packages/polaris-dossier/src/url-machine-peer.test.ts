import { execFile } from 'node:child_process';
import { fstatSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import { createServer, connect, type Socket, type Server, type AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { randomBytes } from 'node:crypto';
import { afterEach, afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { sha256 } from '@syzygy/support';
import { createSessionProfile, DEFAULT_SESSION_MODEL } from './session-profile.js';
import { launchRestrictedUrlSession, prepareRestrictedUrlSession, URL_CLI_PROGRAM, type UrlSessionLaunchOptions } from './session-launch.js';
import { captureUrlMachinePeer, isUrlMachinePeerFor, prepareUrlMachineListener, prepareUrlMachineListenerAsync, closeUrlMachinePeer, mediateUrlMachinePeer, readUrlMachinePeer, type UrlMachinePeer, type UrlMachinePeerOptions } from './url-machine-peer.js';
import { initializeUrlMachineStore } from './url-machine-store.js';
import { publishUrlMachineLifecycle } from './url-machine-lifecycle.js';
import { URL_MACHINE_CLIENT_LIMITS, type UrlMachineClientContext, type UrlMachineClientRecord } from './url-machine-instance.js';
import { captureKernelUnixPeer, captureKernelUnixPeerAsync } from './session-peer.js';

const nativeObservations = vi.hoisted(() => ({ calls: (): readonly (readonly unknown[])[] => [],
  synchronous: (): readonly (readonly unknown[])[] => [] }));
const filesystemBoundary = vi.hoisted(() => ({ refuseLargeSyncReads: false, largeSyncReads: 0 }));
vi.mock('node:fs', async importOriginal => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return { ...actual, readSync: (...args: Parameters<typeof actual.readSync>): number => {
    if (filesystemBoundary.refuseLargeSyncReads && actual.fstatSync(args[0]).size > 1_048_576) {
      filesystemBoundary.largeSyncReads++; throw new Error('owned large synchronous read refused');
    }
    return Reflect.apply(actual.readSync, actual, args) as number;
  } };
});
vi.mock('node:child_process', async importOriginal => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  // Observe real helper execution at the OS boundary; keep its actual result.
  const observed = vi.fn(actual.spawnSync), asynchronous = vi.fn(actual.spawn);
  nativeObservations.synchronous = () => observed.mock.calls;
  nativeObservations.calls = () => [...observed.mock.calls, ...asynchronous.mock.calls]
    .filter(call => call[0] === '/usr/bin/prlimit' && Array.isArray(call[1]) && call[1][2] === '/proc/self/fd/4');
  return { ...actual, spawnSync: observed, spawn: asynchronous };
});

const exec = promisify(execFile), id = () => randomBytes(32).toString('hex');
const canonical = (value: unknown) => Buffer.from(encodeCanonicalJson(value, URL_MACHINE_CLIENT_LIMITS));
const cleanup: (() => void | Promise<unknown>)[] = [];
let programs: UrlMachinePeerOptions['programs'], buildRoot: string;
afterEach(async () => { filesystemBoundary.refuseLargeSyncReads = false; for (const close of cleanup.splice(0).reverse()) await close(); });
afterAll(async () => { await fs.rm(buildRoot, { recursive: true, force: true }); });
beforeAll(async () => {
  const root = buildRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-build-'));
  for (const name of ['session-peer', 'url-machine-peer']) {
    await exec('/usr/bin/cc', ['-std=c11', '-Wall', '-Wextra', '-Werror', '-O2', fileURLToPath(new URL(`./${name}.c`, import.meta.url)), '-o', path.join(root, name)],
      { env: { PATH: '/usr/bin:/bin', LANG: 'C' }, timeout: 10_000, killSignal: 'SIGKILL', maxBuffer: 65_536 });
  }
  programs = { peer: { executable: path.join(root, 'session-peer'), sha256: sha256(await fs.readFile(path.join(root, 'session-peer'))) },
    reader: { executable: path.join(root, 'url-machine-peer'), sha256: sha256(await fs.readFile(path.join(root, 'url-machine-peer'))) } };
});

async function fixture(scenario: 'live' | 'inherited' | 'mixed' | 'exit' = 'live',
  chargeNativeCpuMicroseconds?: (capacity: number) => void, captureGuards?: Partial<Pick<UrlMachinePeerOptions, 'current' | 'effectCurrent' | 'readImageCurrent'>>) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-'));
  cleanup.push(() => fs.rm(root, { recursive: true, force: true }));
  for (const name of ['support', 'home', 'work', 'broker', 'relay', 'hidden']) await fs.mkdir(path.join(root, name), { mode: 0o700 });
  const hidden = path.join(root, 'hidden/canary'); await fs.writeFile(hidden, 'OWN SYNTHETIC CANARY');
  const governanceRoot = path.join(root, 'observing/.syzygy');
  await fs.mkdir(path.join(governanceRoot, 'governance/policies/dossier-machine-clients'), { recursive: true });
  let now = Date.now(), current = true, audited = 0, failAudit = false, expireDuringAudit = false;
  const deadline = now + 60_000;
  const store = await initializeUrlMachineStore({ governanceRoot, protectedRoot: path.join(root, 'hidden/store'), now: () => now, deadline, current: () => current });
  if (!store) throw new Error('owned store unavailable'); cleanup.push(() => store.close());
  const slot = await store.allocateClient(deadline); if (!slot) throw new Error('owned slot unavailable');
  const runId = `run-${id().slice(0, 32)}`;
  const compiled = createSessionProfile({ binding: { run: runId, role: 'author', sourceBinding: id(), policy: id(), provider: 'anthropic', model: DEFAULT_SESSION_MODEL },
    sessionId: '12345678-1234-4234-8234-123456789012', systemPrompt: 'Use only the owned synthetic peer fixture.', initialPrompt: 'Owned peer test.',
    utcDate: new Date(now).toISOString().slice(0, 10), kernelRelease: os.release() });
  if (!compiled.ok) throw new Error('owned profile unavailable');
  const profile = compiled.value.profile;
  const nodeExecutable = await fs.realpath(process.execPath), nodeSha256 = sha256(await fs.readFile(nodeExecutable));
  const bridge = Buffer.from(`import {spawn} from 'node:child_process';
    const child = spawn('/tool/node', ['/tool/support/session-mcp.js'], {stdio:'inherit'});
    child.on('exit', () => process.exit(0));`);
  const mcp = Buffer.from(`import net from 'node:net'; import {spawn} from 'node:child_process';
    const socket = net.connect('/sockets/broker/b.sock');
    socket.on('error', () => process.exit(1));
    const send = () => {
      if (${JSON.stringify(scenario)} === 'live' || ${JSON.stringify(scenario)} === 'exit') {
        socket.write('OWN_FRAME\\n', () => { if (${JSON.stringify(scenario)} === 'exit') process.exit(0); });
      } else {
        if (${JSON.stringify(scenario)} === 'mixed') socket.write('OWN_PREFIX');
        const fd = socket._handle.fd;
        spawn('/tool/node', ['--input-type=module', '-e', "import fs from 'node:fs'; fs.writeSync(3, 'OWN_FORGED_FRAME\\\\n'); setInterval(() => {}, 1000);"],
          {stdio:['ignore','ignore','ignore',fd], env:{}});
      }
    };
    if (${JSON.stringify(scenario)} === 'exit') socket.on('data', send);
    else socket.once('connect', send);`);
  const bridgePath = path.join(root, 'support/session-bridge.js'), mcpPath = path.join(root, 'support/session-mcp.js');
  await fs.writeFile(bridgePath, bridge); await fs.writeFile(mcpPath, mcp);
  const loopback = createServer(socket => socket.end());
  await new Promise<void>(resolve => loopback.listen(0, '127.0.0.1', resolve));
  cleanup.push(() => new Promise<void>(resolve => loopback.close(() => resolve())));
  const launchOptions: UrlSessionLaunchOptions = {
    view: { role: 'author', cliExecutable: await fs.realpath(path.join(os.homedir(), '.local/share/claude/versions', URL_CLI_PROGRAM.version)),
      nodeExecutable, supportDirectory: path.join(root, 'support'), homeDirectory: path.join(root, 'home'), workDirectory: path.join(root, 'work'),
      brokerSocketDirectory: path.join(root, 'broker'), relaySocketDirectory: path.join(root, 'relay'), protectedPaths: [path.join(root, 'hidden')] },
    profile, expected: { nodeSha256, supportSha256: { 'session-bridge.js': sha256(bridge), 'session-mcp.js': sha256(mcp) } },
    current: () => current, audit: () => {}, canaries: [hidden], hostLoopbackPort: (loopback.address() as AddressInfo).port,
    limits: { milliseconds: 60_000 },
  };
  const preparation = await prepareRestrictedUrlSession(launchOptions);
  const brokerSocket = path.join(root, 'broker/b.sock'), relaySocket = path.join(root, 'relay/r.sock');
  let accept!: (socket: Socket) => void;
  const accepted = new Promise<Socket>(resolve => { accept = resolve; });
  const sockets = new Set<Socket>(), servers: Server[] = [];
  let listener: ReturnType<typeof prepareUrlMachineListener> = null;
  for (const endpoint of [brokerSocket, relaySocket]) {
    const server = createServer({ pauseOnConnect: true, allowHalfOpen: true }, socket => { sockets.add(socket); socket.on('error', () => {}); if (endpoint === brokerSocket) accept(socket); });
    await new Promise<void>(resolve => server.listen(endpoint, resolve)); servers.push(server);
    const preparedListener = await prepareUrlMachineListenerAsync(server, programs.reader, chargeNativeCpuMicroseconds);
    expect(preparedListener).not.toBeNull();
    if (endpoint === brokerSocket) listener = preparedListener;
  }
  let closed = false;
  const close = async () => {
    if (!closed) { closed = true; for (const socket of sockets) socket.destroy(); for (const server of servers) await new Promise<void>(resolve => server.close(() => resolve())); }
    return { pendingInvocations: 0, termination: 'settled' as const };
  };
  cleanup.push(close);
  const launch = await launchRestrictedUrlSession({ preparation, host: { brokerSocket, relaySocket, close } });
  cleanup.push(() => launch.stop());
  const socket = await accepted;
  const context: UrlMachineClientContext = { clientId: slot.clientId, policySha256: id(), sourcePin: 'a'.repeat(40), runId, role: 'author', kind: 'mcp-shim',
    allowedScopes: ['artifact_read'], profileSha256: profile.digest, now, deadline };
  const binding = { parentBindingSha256: id(), controllerSha256: id() };
  const options: UrlMachinePeerOptions = { socket, listener: listener!, launch, profile, context, store, binding, programs,
    installed: { executable: nodeExecutable, sha256: nodeSha256, script: mcpPath, scriptSha256: sha256(mcp) },
    protectedPaths: [path.join(root, 'hidden'), governanceRoot], now: () => now, current: () => current,
    audit: () => { audited++; if (expireDuringAudit) now = deadline; if (failAudit) throw new Error('owned audit failure'); },
    chargeNativeCpuMicroseconds, ...captureGuards };
  const peer = await captureUrlMachinePeer(options);
  if (peer) cleanup.push(() => closeUrlMachinePeer(peer));
  const record = (credential: UrlMachinePeer): UrlMachineClientRecord => ({ format: 'polaris-dossier-local-machine-client/1', clientId: slot.clientId, issuanceId: id(),
    policySha256: context.policySha256, revision: 1, projectId: 'project:syzygy', sourcePin: context.sourcePin, runId, role: 'author', kind: 'mcp-shim', scopes: ['artifact_read'],
    issuedAt: new Date(now - 1000).toISOString(), expiresAt: new Date(deadline).toISOString(), revokedAt: null,
    instances: [{ instanceId: id(), generation: 1, issuedAt: new Date(now - 1000).toISOString(), expiresAt: new Date(deadline).toISOString(),
      retiredAt: null, revokedAt: null, verifier: credential.verifier }] });
  const publish = (value: UrlMachineClientRecord, expected: { revision: number; sha256: string } | null = null) =>
    publishUrlMachineLifecycle({ context: { ...context, now }, binding, next: canonical(value), expected }, store);
  const read = async () => {
    for (let index = 0; index < 100; index++) {
      const value = peer ? await readUrlMachinePeer(peer) : null;
      if (value?.kind !== 'pending') return value;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    throw new Error('owned request did not arrive');
  };
  return { peer, socket, options, record, publish, read, launch, audited: () => audited, revokeParent: () => { current = false; },
    failAudit: () => { failAudit = true; }, expireAudit: () => { expireDuringAudit = true; } };
}

describe('live URL machine peer binding', { timeout: 60_000 }, () => {
  it('refuses the fresh parent before invoking any native capture helper', async () => {
    const first = nativeObservations.calls().length;
    const current = vi.fn(async () => false);
    const f = await fixture('live', undefined, { current });
    expect(f.peer).toBeNull();
    expect(current).toHaveBeenCalledOnce();
    const modes = nativeObservations.calls().slice(first).map(call => (call[1] as readonly string[]).at(-1));
    expect(modes).toEqual(['listener', 'listener']);
  });

  it.each([true, false])('rechecks authority once at final native helper dispatch (current: %s)', async allowed => {
    let verifierCalls = 0;
    let effectChecks = 0;
    const lastHelperChecks: number[] = [];
    const f = await fixture('live', () => {
      if (verifierCalls === 3) lastHelperChecks.push(effectChecks);
    }, {
      current: async () => { verifierCalls++; return true; },
      effectCurrent: () => {
        if (verifierCalls !== 3) return true;
        effectChecks++;
        return allowed;
      },
    });
    expect(verifierCalls).toBe(3);
    expect(lastHelperChecks).toEqual(allowed ? [1] : []);
    if (allowed) expect(f.peer).not.toBeNull();
    else expect(f.peer).toBeNull();
  });

  it('pins the actual Node image with ordered, bounded positional reads and detects a short read', async () => {
    filesystemBoundary.largeSyncReads = 0; filesystemBoundary.refuseLargeSyncReads = true;
    const probe = await fs.open(await fs.realpath(process.execPath), 'r');
    const identity = await probe.stat({ bigint: true }), prototype = Object.getPrototypeOf(probe);
    await probe.close();
    const read = prototype.read;
    const chunkBytes = 4 * 1_048_576;
    const reads: { position: number; requested: number; received: number }[] = [];
    let observing = false, firstWaiting = false, overlapped = false;
    let releaseFirst!: () => void;
    const siblingStarted = new Promise<void>(resolve => { releaseFirst = resolve; });
    const descriptor = vi.spyOn(prototype, 'read').mockImplementation(async function(this: fs.FileHandle, ...args: unknown[]) {
      const held = observing ? fstatSync(this.fd, { bigint: true }) : null;
      if (held?.ino !== identity.ino || held.dev !== identity.dev) return read.apply(this, args);
      const position = args[3] as number, requested = args[2] as number;
      expect(Number.isSafeInteger(position)).toBe(true);
      expect(requested).toBeGreaterThan(0);
      expect(requested).toBeLessThanOrEqual(chunkBytes);
      if (position === 0) {
        firstWaiting = true;
        let fallback: ReturnType<typeof setTimeout> | undefined;
        try {
          await Promise.race([siblingStarted, new Promise<void>(resolve => { fallback = setTimeout(resolve, 1500); })]);
        } finally { clearTimeout(fallback); firstWaiting = false; }
        // One real short read challenges completion of the exact first range.
        args[2] = requested / 2;
      } else if (position === chunkBytes) {
        overlapped = firstWaiting;
        releaseFirst();
      }
      const result = await read.apply(this, args);
      reads.push({ position, requested, received: result.bytesRead });
      return result;
    });
    try {
      const f = await fixture('live', undefined, { readImageCurrent: () => { observing = true; return true; } });
      expect(f.peer).not.toBeNull();
      expect(filesystemBoundary.largeSyncReads).toBe(0);
      expect(overlapped).toBe(true);
      const size = Number(identity.size);
      let bytesRead = 0;
      for (const { position, received } of reads.sort((a, b) => a.position - b.position)) {
        expect(position).toBe(bytesRead);
        bytesRead += received;
      }
      expect(reads[0]).toEqual({ position: 0, requested: chunkBytes, received: chunkBytes / 2 });
      expect(bytesRead).toBe(size);
      expect(reads.at(-1)).toEqual({ position: size, requested: 1, received: 0 });
    } finally { releaseFirst(); descriptor.mockRestore(); }
  });

  it('holds the installed image descriptor until a submitted sibling settles after read failure', async () => {
    const probe = await fs.open(await fs.realpath(process.execPath), 'r');
    const identity = await probe.stat({ bigint: true }), prototype = Object.getPrototypeOf(probe);
    await probe.close();
    const read = prototype.read;
    let observing = false, siblingFd: number | undefined;
    let enteredSibling!: (entered: true) => void, releaseSibling!: () => void;
    const siblingEntered = new Promise<true>(resolve => { enteredSibling = resolve; });
    const heldSibling = new Promise<void>(resolve => { releaseSibling = resolve; });
    const descriptor = vi.spyOn(prototype, 'read').mockImplementation(async function(this: fs.FileHandle, ...args: unknown[]) {
      const held = observing ? fstatSync(this.fd, { bigint: true }) : null;
      if (held?.ino === identity.ino && held.dev === identity.dev) {
        if (args[3] === 0) throw new Error('owned positional image read failure');
        if (args[3] === 4 * 1_048_576) {
          siblingFd = this.fd;
          enteredSibling(true);
          await heldSibling;
        }
      }
      return read.apply(this, args);
    });
    let settled = false;
    const capture = fixture('live', undefined, { readImageCurrent: () => { observing = true; return true; } })
      .finally(() => { settled = true; });
    try {
      expect(await Promise.race([siblingEntered, capture.then(() => false)])).toBe(true);
      await new Promise<void>(resolve => setImmediate(resolve));
      expect(settled).toBe(false);
      expect(fstatSync(siblingFd!, { bigint: true })).toMatchObject({ dev: identity.dev, ino: identity.ino });
      releaseSibling();
      expect((await capture).peer).toBeNull();
    } finally {
      releaseSibling();
      await capture.catch(() => {});
      descriptor.mockRestore();
    }
  });

  it.each([false, true])('checks full authority at the installed image read boundaries (withdrawal: %s)', async withdrawn => {
    let authorized = true;
    const effectCurrent = vi.fn(() => authorized), fullChecksDuringRead = new Set<number>();
    const readImageCurrent = vi.fn(() => {
      fullChecksDuringRead.add(effectCurrent.mock.calls.length);
      if (withdrawn) authorized = false;
      return true;
    });
    const f = await fixture('live', undefined, { effectCurrent, readImageCurrent });
    expect(readImageCurrent.mock.calls.length).toBeGreaterThan(1);
    expect(fullChecksDuringRead.size).toBe(1);
    expect(effectCurrent.mock.calls.length).toBeGreaterThan([...fullChecksDuringRead][0]!);
    if (withdrawn) expect(f.peer).toBeNull();
    else expect(f.peer).not.toBeNull();
  });

  it('refuses the next positioned read after authority is lost during the first batch', async () => {
    const probe = await fs.open(await fs.realpath(process.execPath), 'r');
    const identity = await probe.stat({ bigint: true }), prototype = Object.getPrototypeOf(probe);
    await probe.close();
    const read = prototype.read;
    let observing = false, current = true;
    const submits: { position: number; current: boolean }[] = [];
    const readImageCurrent = () => { observing = true; return current; };
    const descriptor = vi.spyOn(prototype, 'read').mockImplementation(async function(this: fs.FileHandle, ...args: unknown[]) {
      const held = observing ? fstatSync(this.fd, { bigint: true }) : null;
      if (held?.ino !== identity.ino || held.dev !== identity.dev) return read.apply(this, args);
      const position = args[3] as number;
      submits.push({ position, current });
      if (position === 0) args[2] = 2 * 1_048_576;
      const result = await read.apply(this, args);
      if (position === 0) current = false;
      return result;
    });
    try {
      const f = await fixture('live', undefined, { effectCurrent: () => true, readImageCurrent });
      expect(f.peer).toBeNull();
      expect(submits).toEqual([{ position: 0, current: true }, { position: 4 * 1_048_576, current: true }]);
    } finally { descriptor.mockRestore(); }
  });

  it('reserves hard CPU capacity before every actual helper and executes none when its retained reservation refuses', async () => {
    const calls = nativeObservations.calls, before = calls().length, syncBefore = nativeObservations.synchronous().length, charges: number[] = [];
    let denied = false;
    const charge = (capacity: number) => { charges.push(capacity); if (denied) throw new Error('owned capacity exhausted'); };
    const f = await fixture('live', charge); expect(f.peer).not.toBeNull(); if (!f.peer) return;
    expect((await f.publish(f.record(f.peer))).ok).toBe(true);
    expect(await f.read()).toEqual({ kind: 'data', bytes: Buffer.from('OWN_FRAME\n') });
    expect(await mediateUrlMachinePeer(f.peer, 'artifact_read', () => 'owned')).toEqual({ ok: true, value: 'owned' });
    expect(charges.length).toBeGreaterThan(5); expect(charges.every(value => value === 2_000_000)).toBe(true);
    expect(calls().length - before).toBe(charges.length);
    expect(nativeObservations.synchronous()).toHaveLength(syncBefore);
    for (const call of calls()) {
      const args: unknown = call[1];
      expect(call[0]).toBe('/usr/bin/prlimit'); expect(Array.isArray(args)).toBe(true);
      if (Array.isArray(args)) expect(args.slice(0, 3)).toEqual(['--cpu=1:1', '--', '/proc/self/fd/4']);
      expect(call[2]).toMatchObject({ timeout: 1000, killSignal: 'SIGKILL', env: { LANG: 'C' } });
    }
    expect(await f.launch.waitForSample()).toBe(true);
    denied = true; const invoked = calls().length, reserved = charges.length;
    const server = (f.socket as Socket & { readonly server: Server }).server;
    expect(prepareUrlMachineListener(server, programs.reader, charge)).toBeNull();
    expect(await prepareUrlMachineListenerAsync(server, programs.reader, charge)).toBeNull();
    expect(captureKernelUnixPeer(f.socket, programs.peer, charge)).toBeNull();
    expect(await captureKernelUnixPeerAsync(f.socket, programs.peer, charge)).toBeNull();
    expect(await f.read()).toBeNull();
    expect(charges).toHaveLength(reserved + 5); expect(calls()).toHaveLength(invoked);
  });

  it('captures a genuine isolated descendant and authorizes its scoped effect against actual protected lifecycle files', async () => {
    const f = await fixture(); expect(f.peer).not.toBeNull();
    expect(isUrlMachinePeerFor(f.peer!, f.socket)).toBe(true);
    expect(isUrlMachinePeerFor({ verifier: f.peer!.verifier }, f.socket)).toBe(false);
    const record = f.record(f.peer!); expect((await f.publish(record)).ok).toBe(true);
    expect(await f.read()).toEqual({ kind: 'data', bytes: Buffer.from('OWN_FRAME\n') });
    let effects = 0;
    expect(await mediateUrlMachinePeer(f.peer!, 'artifact_write', () => ++effects)).toEqual({ ok: false });
    expect(await mediateUrlMachinePeer({ verifier: f.peer!.verifier }, 'artifact_read', () => ++effects)).toEqual({ ok: false });
    expect(await mediateUrlMachinePeer(f.peer!, 'artifact_read', boundary => { expect(boundary()).toBe(true); return ++effects; })).toEqual({ ok: true, value: 1 });
    expect(f.audited()).toBe(1); expect(effects).toBe(1);
    const revoked = { ...record, revision: 2, revokedAt: new Date(f.options.now()).toISOString() };
    expect((await f.publish(revoked, { revision: 1, sha256: sha256(canonical(record)) })).ok).toBe(true);
    expect(await mediateUrlMachinePeer(f.peer!, 'artifact_read', () => ++effects)).toEqual({ ok: false });
    expect(effects).toBe(1);
  });

  it('rejects copied launch objects and an unrelated same-UID socket carrying copied claims', async () => {
    const f = await fixture(); expect(f.peer).not.toBeNull();
    expect((await f.publish(f.record(f.peer!))).ok).toBe(true);
    const endpoint = path.join(os.tmpdir(), `mp-other-${id().slice(0, 12)}`);
    let accept!: (socket: Socket) => void;
    const accepted = new Promise<Socket>(resolve => { accept = resolve; });
    const server = createServer({ pauseOnConnect: true }, socket => { socket.on('error', () => {}); accept(socket); });
    await new Promise<void>(resolve => server.listen(endpoint, resolve));
    const listener = prepareUrlMachineListener(server, programs.reader); expect(listener).not.toBeNull();
    const client = connect(endpoint); client.on('error', () => {});
    const socket = await accepted;
    expect(isUrlMachinePeerFor(f.peer!, socket)).toBe(false);
    cleanup.push(async () => { socket.destroy(); client.destroy(); await new Promise<void>(resolve => server.close(() => resolve())); });
    client.write(JSON.stringify({ pid: f.launch.pid, verifier: f.peer!.verifier }));
    expect(await captureUrlMachinePeer({ ...f.options, socket, listener: listener!, launch: { ...f.launch } })).toBeNull();
    expect(await captureUrlMachinePeer({ ...f.options, socket, listener: listener! })).toBeNull();
    const original = (f.socket as Socket & { _handle: { readonly fd: number } })._handle;
    const foreign = (socket as Socket & { _handle: { readonly fd: number } })._handle;
    const descriptor = Object.getOwnPropertyDescriptor(original, 'fd');
    expect(descriptor?.configurable ?? true).toBe(true);
    let effects = 0;
    for (const substitution of ['handle', 'descriptor'] as const) {
      let entered = 0, applied = false, allowed: boolean | undefined, helperCalls: number | undefined;
      const result = await mediateUrlMachinePeer(f.peer!, 'artifact_read', boundary => {
        entered++;
        try {
          if (substitution === 'handle') (f.socket as Socket & { _handle: unknown })._handle = foreign;
          else Object.defineProperty(original, 'fd', { configurable: true, value: foreign.fd });
          applied = true;
          const before = nativeObservations.calls().length;
          allowed = boundary(); helperCalls = nativeObservations.calls().length - before;
          if (!allowed) throw new Error('owned channel substitution refused');
          effects++;
        } finally {
          if (substitution === 'handle') (f.socket as Socket & { _handle: unknown })._handle = original;
          else if (descriptor) Object.defineProperty(original, 'fd', descriptor);
          else delete (original as { fd?: number }).fd;
        }
      });
      expect(result).toEqual({ ok: false }); expect(entered).toBe(1); expect(applied).toBe(true);
      expect(allowed).toBe(false); expect(helperCalls).toBe(0);
    }
    expect(effects).toBe(0);
  });

  it.each(['inherited', 'mixed'] as const)('refuses the %s descriptor sender rather than authenticating it as the living connector', async scenario => {
    const f = await fixture(scenario); expect(f.peer).not.toBeNull();
    expect((await f.publish(f.record(f.peer!))).ok).toBe(true);
    const first = await f.read();
    if (scenario === 'mixed') {
      expect(first).toEqual({ kind: 'data', bytes: Buffer.from('OWN_PREFIX') });
      expect(await f.read()).toBeNull();
    } else expect(first).toBeNull();
    let effects = 0;
    expect(await mediateUrlMachinePeer(f.peer!, 'artifact_read', () => ++effects)).toEqual({ ok: false });
    expect(effects).toBe(0);
  });

  it('refuses queued bytes and subsequent effects after the captured sender exits', async () => {
    const f = await fixture('exit'); expect(f.peer).not.toBeNull();
    expect((await f.publish(f.record(f.peer!))).ok).toBe(true);
    f.socket.write('GO');
    await f.launch.finished;
    expect(await f.read()).toBeNull();
    expect(await mediateUrlMachinePeer(f.peer!, 'artifact_read', () => 'unexpected')).toEqual({ ok: false });
  });

  it.each(['parent', 'audit', 'expiry'] as const)('blocks the effect on current %s failure', async failure => {
    const f = await fixture(); expect(f.peer).not.toBeNull();
    expect((await f.publish(f.record(f.peer!))).ok).toBe(true);
    if (failure === 'parent') f.revokeParent(); else if (failure === 'audit') f.failAudit(); else f.expireAudit();
    let effects = 0;
    expect(await mediateUrlMachinePeer(f.peer!, 'artifact_read', () => ++effects)).toEqual({ ok: false });
    expect(effects).toBe(0);
  });
});
