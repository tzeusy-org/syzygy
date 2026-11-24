import { createConnection, createServer, type Socket, type Server } from 'node:net';
import { once } from 'node:events';
import type { Duplex } from 'node:stream';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { sha256 } from '@syzygy/support';
import { createSessionMachineTransport, isSessionMachineTransport, openSessionMachineConnection,
  endSessionMachineReply, prepareSessionMachineTransport, sessionMachineEffectContext, stopSessionMachineIngress,
  sessionMachineEffectCurrent, assertSessionMachineEffectCurrent, type SessionMachineEffectContext } from './session-machine-transport.js';
import { startSessionBroker } from './session-broker.js';
import { sessionRelayTestPort, SESSION_RELAY_LIMITS, type SessionRelayPorts, type SessionRelaySubject } from './session-relay.js';
import type { UrlMachineEffectPreflight, UrlMachinePeer } from './url-machine-peer.js';

// Adapter-only fixture backend. These assertions make no kernel identity claim;
// url-machine-peer.test.ts independently exercises the actual native verifier.
const backend = vi.hoisted(() => ({ states: new WeakMap<object, { socket: object; chunks: Buffer[]; live: boolean; endAfterChunks?: boolean }>(),
  mediations: 0, reads: 0, readBlock: null as (() => Promise<Buffer | null>) | null, deny: false, guard: null as (() => void) | null }));
vi.mock('./url-machine-peer.js', () => ({
  isUrlMachinePeerFor: (peer: object, socket: object) => backend.states.get(peer)?.socket === socket,
  closeUrlMachinePeer: (peer: object) => { const state = backend.states.get(peer); if (state) state.live = false; },
  readUrlMachinePeer: async (peer: object) => {
    const state = backend.states.get(peer); if (!state?.live) return null;
    backend.reads++;
    if (backend.readBlock) { const bytes = await backend.readBlock(); return bytes === null ? { kind: 'pending' } : { kind: 'data', bytes }; }
    const bytes = state.chunks.shift(); return bytes ? { kind: 'data', bytes } : { kind: state.endAfterChunks ? 'end' : 'pending' };
  },
  mediateUrlMachinePeer: async (peer: object, _operation: string, effect: (current: () => boolean) => unknown,
    preflight?: UrlMachineEffectPreflight) => {
    const state = backend.states.get(peer); if (!state?.live || backend.deny) return { ok: false };
    backend.mediations++;
    const current = () => { backend.guard?.(); return state.live && !backend.deny; };
    try {
      if (!current() || (preflight !== undefined && (!(await preflight.prepare()) || !preflight.current()))) return { ok: false };
      const value = await effect(current);
      return state.live && !backend.deny ? { ok: true, value } : { ok: false };
    }
    catch { return { ok: false }; }
  },
}));
const cleanup: (() => unknown | Promise<unknown>)[] = [];
afterEach(async () => { backend.deny = false; backend.mediations = 0; backend.reads = 0; backend.readBlock = null; backend.guard = null; for (const close of cleanup.splice(0).reverse()) await close(); });
function fixtureTransport(chunks: readonly Buffer[], onAccept?: (socket: Socket, peer: UrlMachinePeer) => void, endAfterChunks = false) {
  return createSessionMachineTransport({ prepare: server => server.listening,
    accept: async socket => {
      expect(socket.isPaused()).toBe(true); expect(socket.listenerCount('data')).toBe(0); expect(socket.listenerCount('readable')).toBe(0);
      const peer = Object.freeze({ verifier: {} }) as UrlMachinePeer;
      backend.states.set(peer, { socket, chunks: chunks.map(chunk => Buffer.from(chunk)), live: true, endAfterChunks });
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
  it.each([
    ['broker', true], ['broker', false], ['relay', true], ['relay', false],
  ] as const)('awaits actual %s listener preparation and honors its %s result before returning a host', async (kind, allowed) => {
    let enter!: () => void, release!: (value: boolean) => void, finished = false;
    const entered = new Promise<void>(resolve => { enter = resolve; });
    const gate = new Promise<boolean>(resolve => { release = resolve; });
    const transport = createSessionMachineTransport({ prepare: server => {
      expect(server.listening).toBe(true); enter(); return gate;
    }, accept: async () => null })!;
    const socket = join(tempDir('machine-prepare-'), 'p.sock');
    const subject: SessionRelaySubject = { binding: { run: 'own', role: 'author', sourceBinding: 'a'.repeat(64), policy: 'b'.repeat(64),
      provider: 'anthropic', model: 'own' }, project: 'project:syzygy', pin: 'c'.repeat(40), principal: 'own' };
    const ports: SessionRelayPorts = { current: () => true, request: () => ({ ok: false }), providerHeaders: () => null,
      response: () => ({ ok: false }), audit: () => {} };
    const started = kind === 'broker' ? startSessionBroker(socket, async () => undefined, () => {}, undefined, transport)
      : sessionRelayTestPort(async () => { throw new Error('no provider exchange in listener fixture'); })(socket, subject, ports, undefined, transport);
    void started.then(() => { finished = true; }, () => { finished = true; });
    cleanup.push(async () => { release(false); try { await (await started).close(); } catch { /* Refused listener already closed. */ } });
    await entered; await new Promise<void>(resolve => setImmediate(resolve));
    expect(finished).toBe(false); release(allowed);
    if (allowed) expect((await started).socket).toBe(socket);
    else await expect(started).rejects.toThrow(`session-${kind}-start-failed`);
  });

  it('binds context to the exact accepted stream and writes only inside its active mediated boundary', async () => {
    let context: SessionMachineEffectContext | null = null, actual: Socket | undefined, emptyNativeWrites = 0;
    let finished!: (value: unknown) => void;
    const completed = new Promise<unknown>(resolve => { finished = resolve; });
    const transport = fixtureTransport([Buffer.from('verified\n')], socket => {
      actual = socket;
      const write = socket.write.bind(socket);
      const spy = vi.spyOn(socket, 'write').mockImplementation(((...args: unknown[]) => {
        const chunk = args[0];
        if ((typeof chunk === 'string' || Buffer.isBuffer(chunk)) && chunk.length === 0) {
          emptyNativeWrites++;
          const callback = args.at(-1);
          if (typeof callback === 'function') queueMicrotask(() => callback(Object.assign(new Error('own closed-response fixture'), { code: 'EPIPE' })));
          return false;
        }
        return Reflect.apply(write, socket, args);
      }) as Socket['write']);
      cleanup.push(() => { spy.mockRestore(); });
    });
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
        const result = await context!.mediate('artifact_read', async guard => {
          expect(guard()).toBe(true);
          // HTTP may finish an already complete response with an empty write
          // after its reader closed. No additional bytes need an OS write.
          await new Promise<void>((resolve, reject) => stream.write(Buffer.alloc(0), error => error ? reject(error) : resolve()));
          expect(guard()).toBe(true); stream.end('checked reply');
        });
        finished(result);
      })(); });
    })(); });
    const socketPath = join(tempDir('machine-adapter-'), 'a.sock'); server.listen(socketPath); await once(server, 'listening');
    cleanup.push(() => new Promise<void>(resolve => server.close(() => resolve())));
    expect(await prepareSessionMachineTransport(transport, server)).toBe(true);
    const c = client(socketPath); c.socket.write('unverified raw bytes');
    const output = await c.output;
    expect(await completed).toEqual({ ok: true, value: undefined });
    expect(emptyNativeWrites).toBe(0); expect(output).toBe('checked reply');
    expect(context).not.toBeNull(); expect(actual?.listenerCount('data')).toBe(0); expect(actual?.listenerCount('readable')).toBe(0);
  });

  it.each(['current', 'cpu', 'wall', 'revoked'] as const)('guards the broker raw write after the last machine authority check: %s', async scenario => {
    let cpu = 0, wall = 0, released = 0, writes = 0;
    const order: string[] = [], reply = { ok: true, text: 'NONSECRET-ordered-prepared' };
    const transport = fixtureTransport([Buffer.from('{}\n')], socket => {
      const write = socket.write.bind(socket);
      const spy = vi.spyOn(socket, 'write').mockImplementation(((...args: unknown[]) => {
        writes++; order.push('raw-write'); return Reflect.apply(write, socket, args);
      }) as Socket['write']);
      cleanup.push(() => spy.mockRestore());
    }, true);
    const broker = await startSessionBroker(join(tempDir('machine-final-budget-'), 'b.sock'), async (_input, release, context) => {
      const result = await context!.mediate('artifact_read', () => {
        release(reply, () => {
          order.push('authority');
          backend.guard = () => {
            order.push('machine');
            if (scenario === 'cpu') cpu = 11;
            if (scenario === 'wall') wall = 30_000;
            if (scenario === 'revoked') backend.deny = true;
          };
        }, () => {
          order.push('tool-budget');
          if (cpu > 10 || wall >= 30_000) throw new Error('owned tool expired');
        });
        released++;
      });
      if (!result.ok) throw new Error('owned mediation refused');
    }, () => {}, { maxBytes: 128, maxNodes: 64, maxDepth: 8, milliseconds: 1000, connections: 1, invocations: 1 }, transport);
    cleanup.push(() => broker.close());
    const c = client(broker.socket); c.socket.end('unverified native request');
    const output = await c.output;
    expect(order).toEqual(scenario === 'current' ? ['authority', 'machine', 'tool-budget', 'raw-write']
      : scenario === 'revoked' ? ['authority', 'machine'] : ['authority', 'machine', 'tool-budget']);
    expect(output).toBe(scenario === 'current' ? JSON.stringify(reply) + '\n' : '');
    expect(released).toBe(scenario === 'current' ? 1 : 0);
    expect(writes).toBe(scenario === 'current' ? 1 : 0);
  });

  it.each(['deferred', 'changed-frame', 'async-guard'] as const)('destroys a %s guarded write before it can emit or report successful release', async scenario => {
    const transport = fixtureTransport([]), socketPath = join(tempDir('machine-deferred-reply-'), 's.sock');
    let opened!: (stream: Duplex) => void;
    const ready = new Promise<Duplex>(resolve => { opened = resolve; });
    const server = createServer({ pauseOnConnect: true, allowHalfOpen: true }, raw => { void (async () => {
      const stream = await openSessionMachineConnection(raw, transport, { bytes: 128, milliseconds: 1000 });
      if (!stream) throw new Error('owned stream refused'); opened(stream);
    })(); });
    server.listen(socketPath); await once(server, 'listening');
    cleanup.push(() => new Promise<void>(resolve => server.close(() => resolve())));
    const c = client(socketPath), stream = await ready;
    const write = stream._write.bind(stream);
    let deferred: (() => void) | undefined, checks = 0, released = 0;
    const spy = vi.spyOn(stream, '_write').mockImplementation((chunk, encoding, done) => {
      if (scenario === 'deferred') deferred = () => write(chunk, encoding, done);
      else write(scenario === 'changed-frame' ? Buffer.from('NONSECRET-other-frame') : chunk, encoding, done);
    });
    cleanup.push(() => spy.mockRestore());
    const result = await sessionMachineEffectContext(stream)!.mediate('artifact_read', () => {
      endSessionMachineReply(stream, 'NONSECRET-protected-queued-reply', () => {
        checks++;
        if (scenario === 'async-guard') return Promise.resolve();
      });
      released++;
    });
    expect(result).toEqual({ ok: false }); expect(released).toBe(0); expect(checks).toBe(scenario === 'async-guard' ? 1 : 0);
    expect(stream.destroyed).toBe(true);
    if (scenario === 'deferred') { expect(deferred).toBeTypeOf('function'); deferred!(); }
    expect(await c.output).toBe(''); expect(checks).toBe(scenario === 'async-guard' ? 1 : 0);
  });

  it.each([
    ['published', undefined, 4000, 8000, false],
    ['capture-expired', undefined, 5001, 8000, true],
    ['connection-expired', undefined, 4000, 8000, false],
    ['publication-refused', undefined, 4000, 8000, false],
    ['bounded ordered capture', 30_000, 6000, 40_000, false],
    ['capture boundary', 30_000, 30_000, 40_000, true],
    ['original caller expiry', 30_000, 8001, 8000, true],
  ] as const)(
    'keeps staged admission paused until protected publication: %s', async (outcome, captureMilliseconds, captureElapsed, milliseconds, captureExpired) => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
      let opening: (() => boolean) | undefined, peer: UrlMachinePeer | undefined;
      let startCapture!: () => void, finishCapture!: (value: UrlMachinePeer | null) => void;
      let startAuthorization!: () => void, finishAuthorization!: (value: boolean) => void;
      const capturing = new Promise<void>(resolve => { startCapture = resolve; });
      const captured = new Promise<UrlMachinePeer | null>(resolve => { finishCapture = resolve; });
      const authorizing = new Promise<void>(resolve => { startAuthorization = resolve; });
      const authorized = new Promise<boolean>(resolve => { finishAuthorization = resolve; });
      const authorize = vi.fn(async (captured: UrlMachinePeer, stillOpening: () => boolean) => {
        expect(captured).toBe(peer);
        opening = stillOpening;
        startAuthorization();
        return authorized;
      });
      const ports = { captureMilliseconds: captureMilliseconds as number | undefined, prepare: (server: Server) => server.listening, authorize, accept: async (raw: Socket) => {
        peer = Object.freeze({ verifier: {} }) as UrlMachinePeer;
        backend.states.set(peer, { socket: raw, chunks: [Buffer.from('checked')], live: true });
        startCapture();
        return captured;
      } };
      const transport = createSessionMachineTransport(ports)!;
      // The trusted selection is a snapshot, even if its caller later mutates ports.
      ports.captureMilliseconds = 5000;
      let settled = false, result!: (stream: Duplex | null) => void;
      const connected = new Promise<Duplex | null>(resolve => { result = resolve; });
      const socketPath = join(tempDir('machine-staged-'), 's.sock');
      const server = createServer({ pauseOnConnect: true, allowHalfOpen: true }, raw => {
        void openSessionMachineConnection(raw, transport, { bytes: 128, milliseconds }).then(stream => {
          settled = true;
          if (stream === null) raw.destroy();
          result(stream);
        });
      });
      server.listen(socketPath); await once(server, 'listening');
      cleanup.push(() => new Promise<void>(resolve => server.close(() => resolve())));
      const connection = client(socketPath);
      try {
        await capturing;
        await vi.advanceTimersByTimeAsync(captureElapsed);
        expect(settled).toBe(captureExpired);
        finishCapture(peer!);
        if (captureExpired) await vi.advanceTimersByTimeAsync(0);
        else {
          await authorizing;
          expect(opening?.()).toBe(true);
          await vi.advanceTimersByTimeAsync(outcome === 'connection-expired' ? 4001 : 2000);
          expect(opening?.()).toBe(outcome !== 'connection-expired');
          expect(backend.reads).toBe(0);
          expect(backend.mediations).toBe(0);
          finishAuthorization(outcome !== 'publication-refused');
        }
        const stream = await connected;
        if (outcome === 'published' || outcome === 'bounded ordered capture') {
          expect(stream).not.toBeNull();
          expect(sessionMachineEffectContext(stream!)?.peer).toBe(peer);
          stream!.destroy();
        } else {
          expect(stream).toBeNull();
          expect(backend.states.get(peer!)?.live).toBe(false);
          expect(backend.reads).toBe(0);
        }
        expect(authorize).toHaveBeenCalledTimes(captureExpired ? 0 : 1);
        await connection.output;
      } finally {
        finishCapture(null);
        finishAuthorization(false);
        vi.useRealTimers();
      }
    },
  );

  it.each([0, -1, 1.5, NaN, Infinity, 30_001, null as unknown as number])('refuses invalid trusted capture bound %s', captureMilliseconds => {
    expect(createSessionMachineTransport({ captureMilliseconds, prepare: () => true, accept: async () => null })).toBeNull();
  });

  it('retains the exact async effect guard across awaits and revokes escaped descendants', async () => {
    let opened!: (stream: Duplex) => void;
    const accepted = new Promise<Duplex>(resolve => { opened = resolve; });
    let socket!: Socket;
    const transport = fixtureTransport([], raw => { socket = raw; }), socketPath = join(tempDir('machine-effect-'), 's.sock');
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
    let checks = 0;
    backend.guard = () => { checks++; };
    const released = new Promise<void>(resolve => { release = resolve; });
    const admitted = await context.mediate('artifact_write', async () => {
      expect(checks).toBe(1);
      await Promise.resolve();
      assertSessionMachineEffectCurrent();
      expect(checks).toBe(2);
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
    const emptyError = await new Promise<Error | null | undefined>(resolve => stream.write(Buffer.alloc(0), resolve));
    expect(emptyError?.message).toBe('session-machine-transport-unavailable');
    // The lower guard can see current peer authority while the raw socket
    // already reports destruction. Its close event has yet to reach the adapter.
    backend.deny = false;
    backend.guard = () => { socket.destroy(); };
    const afterClose = vi.fn();
    expect(await context.mediate('artifact_write', afterClose)).toEqual({ ok: false });
    expect(afterClose).not.toHaveBeenCalled();
    expect(await c.output).toBe('');
  });

  it('runs preparation outside the effect and refuses a disconnected socket before calling the effect', async () => {
    let opened!: (stream: Duplex) => void;
    const accepted = new Promise<Duplex>(resolve => { opened = resolve; });
    let socket!: Socket;
    const transport = fixtureTransport([], raw => { socket = raw; });
    const socketPath = join(tempDir('machine-preflight-'), 's.sock');
    const server = createServer({ pauseOnConnect: true }, raw => { void (async () => {
      const stream = await openSessionMachineConnection(raw, transport, { bytes: 128, milliseconds: 1000 });
      if (!stream) throw new Error('owned stream refused');
      opened(stream);
    })(); });
    server.listen(socketPath); await once(server, 'listening');
    cleanup.push(() => new Promise<void>(resolve => server.close(() => resolve())));
    client(socketPath);
    const context = sessionMachineEffectContext(await accepted)!;
    const effect = vi.fn(() => assertSessionMachineEffectCurrent());
    const current = vi.fn(() => true);
    const prepare = vi.fn(async () => {
      expect(sessionMachineEffectCurrent()).toBeUndefined();
      socket.destroy();
      return true;
    });
    expect(await context.mediate('inference-forward', effect, { prepare, current })).toEqual({ ok: false });
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(current).not.toHaveBeenCalled();
    expect(effect).not.toHaveBeenCalled();
  });

  it.each(['data', 'pending'] as const)('settles an in-flight native %s chunk before any protected effect after ingress stops', async kind => {
    let entered!: () => void, release!: (bytes: Buffer | null) => void, stream!: Duplex;
    const reading = new Promise<void>(resolve => { entered = resolve; });
    const chunk = new Promise<Buffer | null>(resolve => { release = resolve; });
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
    let effects = 0;
    const result = sessionMachineEffectContext(stream)!.mediate('inference-forward', () => { effects++; });
    await new Promise<void>(resolve => setImmediate(resolve));
    const beforeDrain = effects;
    release(kind === 'data' ? Buffer.from('late unadmitted pipeline') : null);
    const outcome = await result;
    expect(beforeDrain).toBe(0);
    if (kind === 'data') {
      expect(outcome).toEqual({ ok: false }); expect(effects).toBe(0);
      expect(await c.output).toBe(''); expect(stream.destroyed).toBe(true);
      expect(backend.mediations).toBe(0);
    } else {
      expect(outcome).toEqual({ ok: true, value: undefined }); expect(effects).toBe(1);
      expect(stream.destroyed).toBe(false); stream.destroy(); expect(await c.output).toBe('');
    }
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
    for (const scenario of ['current', 'revoked', 'pipeline', 'preflight-refused'] as const) {
      const contexts: (SessionMachineEffectContext | null)[] = [];
      const order: string[] = [];
      const ports: SessionRelayPorts = {
        current: () => true,
        productPreflight: {
          prepare: async () => {
            expect(sessionMachineEffectCurrent()).toBeUndefined();
            order.push('prepare');
            return scenario !== 'preflight-refused';
          },
          current: () => { order.push('preflight-current'); return true; },
        },
        request: (bytes, context) => {
          assertSessionMachineEffectCurrent();
          order.push('request');
          contexts.push(context); expect(Buffer.from(bytes).toString()).toBe(body);
          return { ok: true, body: bytes, admission: { bytes: bytes.length, digest: sha256(bytes), originIds: ['own'], classes: ['work-history'] }, consumedToolResults: [] }; },
        providerHeaders: (headers, context) => { contexts.push(context); return headers; },
        response: (_bytes, _type, context) => { contexts.push(context); return { ok: true, observation: { stopReason: 'end_turn', textBlocks: 1, tool: null } }; },
        audit: (event, context) => { contexts.push(context); if (scenario === 'revoked' && event.event === 'attempt-allowed') backend.deny = true; },
      };
      const forward = vi.fn(async () => { const reads = backend.reads;
        await new Promise(resolve => setTimeout(resolve, 30)); expect(backend.reads).toBe(reads); return { status: 200, contentType: 'application/json', body: Buffer.from('{}'), requestFlushed: true }; });
      const relay = await sessionRelayTestPort(forward)(join(tempDir('machine-relay-'), 'r.sock'), subject, ports,
        { ...SESSION_RELAY_LIMITS, milliseconds: 1000 }, fixtureTransport([scenario === 'pipeline' ? Buffer.concat([raw, raw]) : raw]));
      cleanup.push(() => relay.close());
      const c = client(relay.socket); c.socket.write('unverified raw request'); const output = await c.output;
      expect(forward).toHaveBeenCalledTimes(scenario === 'current' ? 1 : 0);
      if (scenario === 'pipeline') expect(order).toEqual([]);
      else if (scenario === 'preflight-refused') expect(order).toEqual(['prepare']);
      else expect(order.slice(0, 3)).toEqual(['prepare', 'preflight-current', 'request']);
      if (scenario === 'current') { expect(output.startsWith('HTTP/1.1 200')).toBe(true); expect(output.endsWith('{}')).toBe(true); }
      if (scenario !== 'pipeline') expect(contexts.length).toBeGreaterThan(0);
      expect(contexts.every(value => value !== null && value === contexts[0])).toBe(true);
      backend.deny = false;
    }
    expect(backend.mediations).toBeGreaterThan(5);
  });
});
