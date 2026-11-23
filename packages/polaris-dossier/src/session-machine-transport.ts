import { Socket, Server } from 'node:net';
import { AsyncLocalStorage } from 'node:async_hooks';
import { Duplex } from 'node:stream';
import {
  closeUrlMachinePeer, isUrlMachinePeerFor, mediateUrlMachinePeer, readUrlMachinePeer,
  type UrlMachineEffectPreflight, type UrlMachinePeer,
} from './url-machine-peer.js';
import type { UrlMachineOperation } from './url-machine-instance.js';

export interface SessionMachineTransport { readonly authentication: 'url-machine-peer/1' }
export interface SessionMachineEffectContext {
  readonly peer: UrlMachinePeer;
  mediate<T>(operation: UrlMachineOperation, effect: (current: () => boolean) => T | Promise<T>,
    preflight?: UrlMachineEffectPreflight):
    Promise<{ readonly ok: true; readonly value: T } | { readonly ok: false }>;
}
interface TransportPorts {
  /** Configure sender metadata on the actual listener before any client launch. */
  readonly prepare: (server: Server) => boolean | Promise<boolean>;
  /** The trusted closure selects the genuine launch and captures this exact socket.
   * It may await launch registration within the connection's original deadline. */
  readonly accept: (socket: Socket) => Promise<UrlMachinePeer | null>;
  /** Complete protected issuance while the captured raw socket remains paused. */
  readonly authorize?: (peer: UrlMachinePeer, stillOpening: () => boolean) => Promise<boolean>;
}
const transports = new WeakMap<SessionMachineTransport, TransportPorts>();
interface ConnectionState {
  readonly raw: Socket; readonly peer: UrlMachinePeer; readonly stream: Duplex;
  readonly deadline: number;
  boundary: (() => boolean) | null;
  ingressComplete: boolean;
  readonly ingressDrained: Promise<void>;
  replyWrite: { readonly bytes: Buffer; readonly check: () => void; checked: boolean } | null;
}
const contexts = new WeakMap<SessionMachineEffectContext, ConnectionState>();
const connections = new WeakMap<Duplex, SessionMachineEffectContext>();

/** One exact broker reply. The budget check follows the native authority guard
 * inside write(), and must run synchronously before this call returns. A queued
 * write receives no deferred grant: destroy it before it can emit any bytes. */
export function endSessionMachineReply(stream: Duplex, frame: string, finalToolBudgetCheck: () => void): void {
  const context = connections.get(stream), state = context === undefined ? undefined : contexts.get(context);
  if (!state || state.stream !== stream || state.replyWrite !== null || stream.destroyed || stream.writableEnded
    || stream.writableLength !== 0) throw new Error('session-machine-transport-unavailable');
  const pending = { bytes: Buffer.from(frame), check: finalToolBudgetCheck, checked: false };
  state.replyWrite = pending;
  try {
    stream.end(pending.bytes);
    if (!pending.checked) throw new Error('session-machine-transport-unavailable');
  } catch {
    state.replyWrite = null;
    stream.destroy();
    throw new Error('session-machine-transport-unavailable');
  }
}
const effects = new AsyncLocalStorage<{ readonly boundary: () => boolean; active: boolean }>();
/** Undefined means no mediated effect is active in this async chain. An expired
 * descendant retains a revoked scope instead of inheriting a later effect. */
export function sessionMachineEffectCurrent(): boolean | undefined {
  const selected = effects.getStore();
  return selected === undefined ? undefined : selected.active && selected.boundary();
}
/** Protected producers call this again immediately before an awaited write. */
export function assertSessionMachineEffectCurrent(): void {
  if (sessionMachineEffectCurrent() !== true) throw new Error('session-machine-transport-unavailable');
}

/** First-party factory only. Merely returning peer-shaped metadata cannot
 * authenticate: every accepted capability must belong to its exact raw socket. */
export function createSessionMachineTransport(ports: TransportPorts): SessionMachineTransport | null {
  if (typeof ports?.prepare !== 'function' || typeof ports.accept !== 'function'
    || (ports.authorize !== undefined && typeof ports.authorize !== 'function')) return null;
  const transport: SessionMachineTransport = Object.freeze({ authentication: 'url-machine-peer/1' });
  const { prepare, accept, authorize } = ports;
  transports.set(transport, Object.freeze({ prepare, accept, ...(authorize === undefined ? {} : { authorize }) }));
  return transport;
}
export const isSessionMachineTransport = (transport: SessionMachineTransport): boolean => transports.has(transport);
export async function prepareSessionMachineTransport(transport: SessionMachineTransport, server: Server): Promise<boolean> {
  try { return await transports.get(transport)?.prepare(server) === true; } catch { return false; }
}
export function sessionMachineEffectContext(stream: Duplex): SessionMachineEffectContext | null {
  return connections.get(stream) ?? null;
}

/** A complete single HTTP request needs no further ingress while awaiting its
 * response. Keep the authenticated peer for separately mediated effects. */
export function stopSessionMachineIngress(stream: Duplex): boolean {
  const context = connections.get(stream), state = context === undefined ? undefined : contexts.get(context);
  if (!state || state.stream !== stream || stream.destroyed || state.ingressComplete) return false;
  state.ingressComplete = true;
  return true;
}

/** Node never consumes the accepted raw socket. The native sender verifier is
 * its sole reader; only checked chunks enter this bounded parser-facing stream.
 * Native writes require the active effect's immediate boundary guard. */
export async function openSessionMachineConnection(raw: Socket, transport: SessionMachineTransport,
  limits: { readonly bytes: number; readonly milliseconds: number }): Promise<Duplex | null> {
  const ports = transports.get(transport), began = performance.now();
  const deadline = began + limits.milliseconds, captureDeadline = Math.min(deadline, began + 5000);
  if (!ports || !(raw instanceof Socket) || !raw.isPaused() || raw.readableLength !== 0
    || raw.listenerCount('data') !== 0 || raw.listenerCount('readable') !== 0
    || !Number.isSafeInteger(limits.bytes) || limits.bytes <= 0 || limits.bytes > 8_388_608
    || !Number.isSafeInteger(limits.milliseconds) || limits.milliseconds <= 0 || limits.milliseconds > 180_000) return null;
  let expired = false;
  const before = async <T>(until: number, work: () => Promise<T>): Promise<T | null> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([new Promise<null>(resolve => {
        timer = setTimeout(() => { expired = true; resolve(null); }, Math.max(1, until - performance.now()));
      }), work()]);
    } finally { clearTimeout(timer); }
  };
  let peer: UrlMachinePeer | null = null;
  try {
    peer = await before(captureDeadline, async () => {
      const captured = await ports.accept(raw);
      if (captured !== null && (expired || performance.now() >= captureDeadline)) {
        closeUrlMachinePeer(captured);
        return null;
      }
      return captured;
    });
    if (peer === null) return null;
    const captured = peer;
    const stillOpening = (): boolean => !expired && performance.now() < deadline
      && !raw.destroyed && raw.isPaused() && raw.readableLength === 0 && isUrlMachinePeerFor(captured, raw);
    const authorize = ports.authorize;
    if (!stillOpening() || (authorize !== undefined
      && (await before(deadline, () => authorize(captured, stillOpening)) !== true || !stillOpening()))) {
      closeUrlMachinePeer(captured);
      return null;
    }
  } catch {
    if (peer !== null) closeUrlMachinePeer(peer);
    return null;
  }
  const selected = peer;
  let bytes = 0, reading = false, ended = false, resume: (() => void) | null = null;
  let state: ConnectionState;
  let settleIngress!: () => void;
  const ingressDrained = new Promise<void>(resolve => { settleIngress = resolve; });
  const stream = new Duplex({ allowHalfOpen: true, autoDestroy: false, readableHighWaterMark: 65_536, writableHighWaterMark: 65_536,
    read() { resume?.(); resume = null; },
    write(chunk: Buffer, _encoding, done) {
      if (!state.boundary?.() || raw.destroyed || performance.now() >= deadline) { done(new Error('session-machine-transport-unavailable')); return; }
      // HTTP completion can write no bytes after the bridge consumed its full
      // response. Keep the guard, but perform no needless write to that peer.
      if (chunk.length === 0) { done(); return; }
      const pending = state.replyWrite;
      if (pending !== null) {
        state.replyWrite = null;
        try {
          if (!chunk.equals(pending.bytes)) throw new Error();
          if (pending.check() !== undefined) throw new Error();
          pending.checked = true;
        } catch { done(new Error('session-machine-transport-unavailable')); return; }
      }
      raw.write(chunk, error => done(error ? new Error('session-machine-transport-unavailable') : undefined));
    },
    final(done) { raw.end(done); },
    destroy(error, done) {
      ended = true; resume?.(); resume = null; settleIngress(); clearTimeout(lifetime); closeUrlMachinePeer(selected); raw.destroy(); done(error ? new Error('session-machine-transport-unavailable') : undefined);
    },
  });
  state = { raw, peer: selected, stream, deadline, boundary: null, ingressComplete: false, ingressDrained, replyWrite: null };
  const context: SessionMachineEffectContext = Object.freeze({ peer: selected,
    async mediate<T>(this: SessionMachineEffectContext, operation: UrlMachineOperation,
      effect: (current: () => boolean) => T | Promise<T>, preflight?: UrlMachineEffectPreflight):
      Promise<{ readonly ok: true; readonly value: T } | { readonly ok: false }> {
      const active = contexts.get(this);
      if (!active || active !== state || ended || stream.destroyed || active.boundary !== null) return { ok: false };
      // The parser can finish the request while its native reader is still
      // validating a chunk. Settle that read before any protected callback:
      // trailing data must refuse before an effect, not after its response.
      if (active.ingressComplete) await active.ingressDrained;
      const transportCurrent = () => !ended && !raw.destroyed && !stream.destroyed && performance.now() < deadline;
      if (!transportCurrent() || active.boundary !== null) return { ok: false };
      const checkedPreflight = preflight === undefined ? undefined : {
        prepare: async () => transportCurrent() && await preflight.prepare(),
        current: () => transportCurrent() && preflight.current() && transportCurrent(),
      };
      return mediateUrlMachinePeer(selected, operation, async current => {
        // The peer checked currentness immediately before entering this callback.
        if (!transportCurrent()) throw new Error('session-machine-transport-unavailable');
        const boundary = () => transportCurrent() && current();
        active.boundary = boundary;
        const selectedEffect = { boundary, active: true };
        try { return await effects.run(selectedEffect, () => effect(boundary)); }
        finally { selectedEffect.active = false; active.boundary = null; }
      }, checkedPreflight);
    },
  });
  contexts.set(context, state); connections.set(stream, context);
  const lifetime = setTimeout(() => stream.destroy(new Error('session-machine-transport-unavailable')), Math.max(1, deadline - performance.now()));
  raw.once('close', () => stream.destroy()); raw.on('error', () => stream.destroy());
  stream.on('error', () => undefined);
  stream.once('finish', () => { setImmediate(() => stream.destroy()); });
  const pump = async (): Promise<void> => {
    if (reading) return;
    reading = true;
    try {
      while (!ended && !stream.destroyed && !state.ingressComplete && performance.now() < deadline) {
        const chunk = await readUrlMachinePeer(selected);
        if (!chunk || ended || stream.destroyed || performance.now() >= deadline) throw new Error();
        if (state.ingressComplete) {
          if (chunk.kind === 'data') throw new Error();
          return;
        }
        if (chunk.kind === 'end') { stream.push(null); return; }
        if (chunk.kind === 'pending') { await new Promise(resolve => setTimeout(resolve, 5)); continue; }
        if (chunk.kind !== 'data') throw new Error();
        bytes += chunk.bytes.length;
        if (bytes > limits.bytes || chunk.bytes.length === 0 || chunk.bytes.length > 65_536) throw new Error();
        if (!stream.push(Buffer.from(chunk.bytes)) && !ended && !stream.destroyed) await new Promise<void>(resolve => { resume = resolve; });
      }
      if (!ended && !state.ingressComplete) stream.destroy(new Error('session-machine-transport-unavailable'));
    } catch { stream.destroy(new Error('session-machine-transport-unavailable')); }
    finally { reading = false; settleIngress(); }
  };
  // Let the caller attach its bounded parser before the first checked chunk.
  setImmediate(() => { void pump(); });
  return stream;
}
