import { execFile } from 'node:child_process';
import * as fs from 'node:fs/promises';
import { createServer, connect, type Socket, type Server, type AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { randomBytes } from 'node:crypto';
import { afterEach, afterAll, beforeAll, describe, expect, it } from 'vitest';
import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { sha256 } from '@syzygy/support';
import { createSessionProfile, DEFAULT_SESSION_MODEL } from './session-profile.js';
import { launchRestrictedUrlSession, prepareRestrictedUrlSession, URL_CLI_PROGRAM, type UrlSessionLaunchOptions } from './session-launch.js';
import { captureUrlMachinePeer, isUrlMachinePeerFor, prepareUrlMachineListener, closeUrlMachinePeer, mediateUrlMachinePeer, readUrlMachinePeer, type UrlMachinePeer, type UrlMachinePeerOptions } from './url-machine-peer.js';
import { initializeUrlMachineStore } from './url-machine-store.js';
import { publishUrlMachineLifecycle } from './url-machine-lifecycle.js';
import { URL_MACHINE_CLIENT_LIMITS, type UrlMachineClientContext, type UrlMachineClientRecord } from './url-machine-instance.js';

const exec = promisify(execFile), id = () => randomBytes(32).toString('hex');
const canonical = (value: unknown) => Buffer.from(encodeCanonicalJson(value, URL_MACHINE_CLIENT_LIMITS));
const cleanup: (() => void | Promise<unknown>)[] = [];
let programs: UrlMachinePeerOptions['programs'], buildRoot: string;
afterEach(async () => { for (const close of cleanup.splice(0).reverse()) await close(); });
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

async function fixture(scenario: 'live' | 'inherited' | 'mixed' | 'exit' = 'live') {
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
    const preparedListener = prepareUrlMachineListener(server, programs.reader);
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
    audit: () => { audited++; if (expireDuringAudit) now = deadline; if (failAudit) throw new Error('owned audit failure'); } };
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
