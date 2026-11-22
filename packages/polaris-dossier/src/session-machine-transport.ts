import { Socket, Server } from 'node:net';
import { AsyncLocalStorage } from 'node:async_hooks';
import { Duplex } from 'node:stream';
import {
  closeUrlMachinePeer, isUrlMachinePeerFor, mediateUrlMachinePeer, readUrlMachinePeer,
  type UrlMachinePeer,
} from './url-machine-peer.js';
import type { UrlMachineOperation } from './url-machine-instance.js';

export interface SessionMachineTransport { readonly authentication: 'url-machine-peer/1' }
export interface SessionMachineEffectContext {
  readonly peer: UrlMachinePeer;
  mediate<T>(operation: UrlMachineOperation, effect: (current: () => boolean) => T | Promise<T>):
    Promise<{ readonly ok: true; readonly value: T } | { readonly ok: false }>;
}
interface TransportPorts {
  /** Configure sender metadata on the actual listener before any client launch. */
  readonly prepare: (server: Server) => boolean | Promise<boolean>;
  /** The trusted closure selects the genuine launch and captures this exact socket.
   * It may await launch registration within the connection's original deadline. */
  readonly accept: (socket: Socket) => Promise<UrlMachinePeer | null>;
}
const transports = new WeakMap<SessionMachineTransport, TransportPorts>();
interface ConnectionState {
  readonly raw: Socket; readonly peer: UrlMachinePeer; readonly stream: Duplex;
  readonly deadline: number;
  boundary: (() => boolean) | null;
  ingressComplete: boolean;
  readonly ingressDrained: Promise<void>;
}
const contexts = new WeakMap<SessionMachineEffectContext, ConnectionState>();
const connections = new WeakMap<Duplex, SessionMachineEffectContext>();
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
  if (typeof ports?.prepare !== 'function' || typeof ports.accept !== 'function') return null;
  const transport: SessionMachineTransport = Object.freeze({ authentication: 'url-machine-peer/1' });
  transports.set(transport, Object.freeze({ prepare: ports.prepare, accept: ports.accept }));
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
  const ports = transports.get(transport), deadline = performance.now() + limits.milliseconds;
  if (!ports || !(raw instanceof Socket) || !raw.isPaused() || raw.readableLength !== 0
    || raw.listenerCount('data') !== 0 || raw.listenerCount('readable') !== 0
    || !Number.isSafeInteger(limits.bytes) || limits.bytes <= 0 || limits.bytes > 8_388_608
    || !Number.isSafeInteger(limits.milliseconds) || limits.milliseconds <= 0 || limits.milliseconds > 180_000) return null;
  let peer: UrlMachinePeer | null = null, expired = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const capture = ports.accept(raw);
    void capture.then(value => { if (expired && value) closeUrlMachinePeer(value); }, () => {});
    peer = await Promise.race([capture, new Promise<null>(resolve => {
      timer = setTimeout(() => { expired = true; resolve(null); }, Math.min(5000, limits.milliseconds));
    })]);
  } catch { /* Fixed refusal only. */ }
  finally { clearTimeout(timer); }
  if (!peer || expired || raw.destroyed || performance.now() >= deadline || !isUrlMachinePeerFor(peer, raw)) {
    if (peer) closeUrlMachinePeer(peer);
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
      raw.write(chunk, error => done(error ? new Error('session-machine-transport-unavailable') : undefined));
    },
    final(done) { raw.end(done); },
    destroy(error, done) {
      ended = true; resume?.(); resume = null; settleIngress(); clearTimeout(lifetime); closeUrlMachinePeer(selected); raw.destroy(); done(error ? new Error('session-machine-transport-unavailable') : undefined);
    },
  });
  state = { raw, peer: selected, stream, deadline, boundary: null, ingressComplete: false, ingressDrained };
  const context: SessionMachineEffectContext = Object.freeze({ peer: selected,
    async mediate<T>(this: SessionMachineEffectContext, operation: UrlMachineOperation,
      effect: (current: () => boolean) => T | Promise<T>): Promise<{ readonly ok: true; readonly value: T } | { readonly ok: false }> {
      const active = contexts.get(this);
      if (!active || active !== state || ended || stream.destroyed || active.boundary !== null) return { ok: false };
      // The parser can finish the request while its native reader is still
      // validating a chunk. Settle that read before any protected callback:
      // trailing data must refuse before an effect, not after its response.
      if (active.ingressComplete) await active.ingressDrained;
      if (ended || stream.destroyed || active.boundary !== null || performance.now() >= deadline) return { ok: false };
      return mediateUrlMachinePeer(selected, operation, async current => {
        const boundary = () => !ended && !raw.destroyed && !stream.destroyed && performance.now() < deadline && current();
        if (!boundary()) throw new Error('session-machine-transport-unavailable');
        active.boundary = boundary;
        const selectedEffect = { boundary, active: true };
        try { return await effects.run(selectedEffect, () => effect(boundary)); }
        finally { selectedEffect.active = false; active.boundary = null; }
      });
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
