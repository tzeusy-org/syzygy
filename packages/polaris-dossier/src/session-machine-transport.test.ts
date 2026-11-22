import { createConnection, createServer, type Socket } from 'node:net';
import { once } from 'node:events';
import type { Duplex } from 'node:stream';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { sha256 } from '@syzygy/support';
import { createSessionMachineTransport, isSessionMachineTransport, openSessionMachineConnection,
  prepareSessionMachineTransport, sessionMachineEffectContext, stopSessionMachineIngress,
  sessionMachineEffectCurrent, assertSessionMachineEffectCurrent, type SessionMachineEffectContext } from './session-machine-transport.js';
import { startSessionBroker } from './session-broker.js';
import { sessionRelayTestPort, SESSION_RELAY_LIMITS, type SessionRelayPorts, type SessionRelaySubject } from './session-relay.js';
import type { UrlMachinePeer } from './url-machine-peer.js';

// Adapter-only fixture backend. These assertions make no kernel identity claim;
// url-machine-peer.test.ts independently exercises the actual native verifier.
const backend = vi.hoisted(() => ({ states: new WeakMap<object, { socket: object; chunks: Buffer[]; live: boolean }>(),
  mediations: 0, reads: 0, readBlock: null as (() => Promise<Buffer>) | null, deny: false }));
vi.mock('./url-machine-peer.js', () => ({
  isUrlMachinePeerFor: (peer: object, socket: object) => backend.states.get(peer)?.socket === socket,
  closeUrlMachinePeer: (peer: object) => { const state = backend.states.get(peer); if (state) state.live = false; },
  readUrlMachinePeer: async (peer: object) => {
    const state = backend.states.get(peer); if (!state?.live) return null;
    backend.reads++;
    if (backend.readBlock) return { kind: 'data', bytes: await backend.readBlock() };
    const bytes = state.chunks.shift(); return bytes ? { kind: 'data', bytes } : { kind: 'pending' };
  },
  mediateUrlMachinePeer: async (peer: object, _operation: string, effect: (current: () => boolean) => unknown) => {
    const state = backend.states.get(peer); if (!state?.live || backend.deny) return { ok: false };
    backend.mediations++;
    try { const value = await effect(() => state.live && !backend.deny); return state.live && !backend.deny ? { ok: true, value } : { ok: false }; }
    catch { return { ok: false }; }
  },
}));
const cleanup: (() => unknown | Promise<unknown>)[] = [];
afterEach(async () => { backend.deny = false; backend.mediations = 0; backend.reads = 0; backend.readBlock = null; for (const close of cleanup.splice(0).reverse()) await close(); });
function fixtureTransport(chunks: readonly Buffer[], onAccept?: (socket: Socket, peer: UrlMachinePeer) => void) {
  return createSessionMachineTransport({ prepare: server => server.listening,
    accept: async socket => {
      expect(socket.isPaused()).toBe(true); expect(socket.listenerCount('data')).toBe(0); expect(socket.listenerCount('readable')).toBe(0);
      const peer = Object.freeze({ verifier: {} }) as UrlMachinePeer;
      backend.states.set(peer, { socket, chunks: chunks.map(chunk => Buffer.from(chunk)), live: true });
      onAccept?.(socket, peer); return peer;
    } })!;
}
function client(path: string) {
  const socket = createConnection(path), chunks: Buffer[] = [];
  socket.on('data', chunk => chunks.push(Buffer.from(chunk))); socket.on('error', () => undefined);
  cleanup.push(() => socket.destroy());
  return { socket, output: new Promise<string>(resolve => socket.once('close', () => resolve(Buffer.concat(chunks).toString()))) };
}

describe('verified-chunk session transport adapter', () => {
  it('binds context to the exact accepted stream and writes only inside its active mediated boundary', async () => {
    let context: SessionMachineEffectContext | null = null, actual: Socket | undefined;
    const transport = fixtureTransport([Buffer.from('verified\n')], socket => { actual = socket; });
    expect(isSessionMachineTransport(transport)).toBe(true);
    expect(isSessionMachineTransport({ ...transport })).toBe(false);
    const server = createServer({ pauseOnConnect: true, allowHalfOpen: true }, raw => { void (async () => {
      const stream = await openSessionMachineConnection(raw, transport, { bytes: 128, milliseconds: 1000 });
      expect(stream).not.toBeNull(); if (!stream) return;
      context = sessionMachineEffectContext(stream);
      let received = '';
      stream.on('data', chunk => { received += String(chunk); void (async () => {
        expect(received).toBe('verified\n');
        expect(stopSessionMachineIngress({} as Duplex)).toBe(false);
        expect(stopSessionMachineIngress(stream)).toBe(true);
        expect(stopSessionMachineIngress(stream)).toBe(false);
        expect(await context!.mediate.call({ ...context! }, 'artifact_read', () => undefined)).toEqual({ ok: false });
        await context!.mediate('artifact_read', guard => { expect(guard()).toBe(true); stream.end('checked reply'); });
      })(); });
    })(); });
    const socketPath = join(tempDir('machine-adapter-'), 'a.sock'); server.listen(socketPath); await once(server, 'listening');
    cleanup.push(() => new Promise<void>(resolve => server.close(() => resolve())));
    expect(prepareSessionMachineTransport(transport, server)).toBe(true);
    const c = client(socketPath); c.socket.write('unverified raw bytes');
    expect(await c.output).toBe('checked reply');
    expect(context).not.toBeNull(); expect(actual?.listenerCount('data')).toBe(0); expect(actual?.listenerCount('readable')).toBe(0);
  });

  it('retains the exact async effect guard across awaits and revokes escaped descendants', async () => {
    let opened!: (stream: Duplex) => void;
    const accepted = new Promise<Duplex>(resolve => { opened = resolve; });
    const transport = fixtureTransport([]), socketPath = join(tempDir('machine-effect-'), 's.sock');
    const server = createServer({ pauseOnConnect: true, allowHalfOpen: true }, raw => { void (async () => {
      const stream = await openSessionMachineConnection(raw, transport, { bytes: 128, milliseconds: 1000 });
      if (!stream) throw new Error('owned stream refused');
      opened(stream);
    })(); });
    server.listen(socketPath); await once(server, 'listening');
    cleanup.push(() => new Promise<void>(resolve => server.close(() => resolve())));
    const c = client(socketPath), stream = await accepted;
    expect(stopSessionMachineIngress(stream)).toBe(true);
    const context = sessionMachineEffectContext(stream)!;
    expect(sessionMachineEffectCurrent()).toBeUndefined();
    expect(assertSessionMachineEffectCurrent).toThrow('session-machine-transport-unavailable');
    let release!: () => void, descendant: Promise<boolean | undefined> | undefined;
    const released = new Promise<void>(resolve => { release = resolve; });
    const admitted = await context.mediate('artifact_write', async () => {
      await Promise.resolve();
      assertSessionMachineEffectCurrent();
      descendant = released.then(sessionMachineEffectCurrent);
      return 'checked';
    });
    expect(admitted).toEqual({ ok: true, value: 'checked' });
    release(); expect(await descendant).toBe(false);
    let writes = 0;
    const revoked = await context.mediate('artifact_write', async () => {
      await Promise.resolve(); backend.deny = true;
      assertSessionMachineEffectCurrent();
      writes++;
    });
    expect(revoked).toEqual({ ok: false }); expect(writes).toBe(0);
    expect(sessionMachineEffectCurrent()).toBeUndefined();
    stream.destroy(); expect(await c.output).toBe('');
  });

  it('refuses an in-flight native data chunk returned after ingress was stopped', async () => {
    let entered!: () => void, release!: (bytes: Buffer) => void, stream!: Duplex;
    const reading = new Promise<void>(resolve => { entered = resolve; });
    const chunk = new Promise<Buffer>(resolve => { release = resolve; });
    backend.readBlock = () => { entered(); return chunk; };
    const transport = fixtureTransport([]), socketPath = join(tempDir('machine-inflight-'), 's.sock');
    const server = createServer({ pauseOnConnect: true, allowHalfOpen: true }, raw => { void (async () => {
      const selected = await openSessionMachineConnection(raw, transport, { bytes: 128, milliseconds: 1000 });
      if (!selected) throw new Error('owned stream refused');
      stream = selected; stream.on('data', () => { throw new Error('late data reached parser'); });
    })(); });
    server.listen(socketPath); await once(server, 'listening');
    cleanup.push(() => new Promise<void>(resolve => server.close(() => resolve())));
    const c = client(socketPath); await reading;
    expect(stopSessionMachineIngress(stream)).toBe(true);
    release(Buffer.from('late unadmitted pipeline'));
    expect(await c.output).toBe(''); expect(stream.destroyed).toBe(true);
    expect(backend.mediations).toBe(0);
  });

  it('refuses missing transport and peer/socket substitution before broker effects', async () => {
    const socketPath = join(tempDir('machine-broker-'), 'a.sock'); let effects = 0;
    await expect(startSessionBroker(socketPath, async () => { effects++; }, () => {})).rejects.toThrow('invalid-session-broker');
    const transport = fixtureTransport([Buffer.alloc(129)], (_socket, peer) => { backend.states.get(peer)!.socket = {}; });
    const broker = await startSessionBroker(socketPath, async () => { effects++; }, () => {},
      { maxBytes: 128, maxNodes: 64, maxDepth: 8, milliseconds: 250, connections: 1, invocations: 1 }, transport);
    cleanup.push(() => broker.close());
    const c = client(socketPath); c.socket.end('{}\n'); expect(await c.output).toBe(''); expect(effects).toBe(0);
  });

  it('runs HTTP parsing and protected callbacks on verified chunks and refuses revoked mediation before forward', async () => {
    const body = '{"messages":[]}', raw = Buffer.from(`POST /v1/messages HTTP/1.1\r\nHost: localhost\r\nContent-Type: application/json\r\nAuthorization: Bearer NONSECRET-fixture\r\nContent-Length: ${body.length}\r\n\r\n${body}`);
    const subject: SessionRelaySubject = { binding: { run: 'own', role: 'author', sourceBinding: 'a'.repeat(64), policy: 'b'.repeat(64),
      provider: 'anthropic', model: 'own' }, project: 'project:syzygy', pin: 'c'.repeat(40), principal: 'own' };
    for (const { revoke, pipeline } of [{ revoke: false, pipeline: false }, { revoke: true, pipeline: false }, { revoke: false, pipeline: true }]) {
      let forwards = 0; const contexts: (SessionMachineEffectContext | null)[] = [];
      const ports: SessionRelayPorts = {
        current: () => true,
        request: (bytes, context) => { contexts.push(context); expect(Buffer.from(bytes).toString()).toBe(body);
          return { ok: true, body: bytes, admission: { bytes: bytes.length, digest: sha256(bytes), originIds: ['own'], classes: ['work-history'] }, consumedToolResults: [] }; },
        providerHeaders: (headers, context) => { contexts.push(context); return headers; },
        response: (_bytes, _type, context) => { contexts.push(context); return { ok: true, observation: { stopReason: 'end_turn', textBlocks: 1, tool: null } }; },
        audit: (event, context) => { contexts.push(context); if (revoke && event.event === 'attempt-allowed') backend.deny = true; },
      };
      const start = sessionRelayTestPort(async () => { forwards++; const reads = backend.reads;
        await new Promise(resolve => setTimeout(resolve, 30)); expect(backend.reads).toBe(reads); return { status: 200, contentType: 'application/json', body: Buffer.from('{}'), requestFlushed: true }; });
      const relay = await start(join(tempDir('machine-relay-'), 'r.sock'), subject, ports,
        { ...SESSION_RELAY_LIMITS, milliseconds: 1000 }, fixtureTransport([pipeline ? Buffer.concat([raw, raw]) : raw]));
      cleanup.push(() => relay.close());
      const c = client(relay.socket); c.socket.write('unverified raw request'); const output = await c.output;
      expect(forwards).toBe(revoke || pipeline ? 0 : 1);
      if (!revoke && !pipeline) { expect(output.startsWith('HTTP/1.1 200')).toBe(true); expect(output.endsWith('{}')).toBe(true); }
      if (!pipeline) expect(contexts.length).toBeGreaterThan(0); expect(contexts.every(value => value !== null && value === contexts[0])).toBe(true);
      backend.deny = false;
    }
    expect(backend.mediations).toBeGreaterThan(5);
  });
});
