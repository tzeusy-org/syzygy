import * as fs from 'node:fs';
import * as net from 'node:net';
import path from 'node:path';
import type { Duplex } from 'node:stream';
import { endSessionMachineReply, isSessionMachineTransport, openSessionMachineConnection, prepareSessionMachineTransport, sessionMachineEffectContext,
  type SessionMachineTransport, type SessionMachineEffectContext } from './session-machine-transport.js';
import { encodeCanonicalJson, parseBoundedJson } from '@syzygy/polaris-generation-core/live';

export interface SessionBrokerLimits {
  readonly maxBytes: number; readonly maxNodes: number; readonly maxDepth: number;
  readonly milliseconds: number; readonly connections: number; readonly invocations: number;
}
export const SESSION_BROKER_LIMITS: SessionBrokerLimits = Object.freeze({
  maxBytes: 2_097_152, maxNodes: 65_536, maxDepth: 32, milliseconds: 85_000, connections: 4, invocations: 4,
});
export interface SessionBroker {
  readonly socket: string;
  close(): Promise<{ readonly pendingInvocations: number; readonly termination: 'settled' | 'Unknown' }>;
}
const FAILURE = '{"ok":false,"reason":"session-broker-unavailable"}\n';
export type ReleaseReply = (reply: unknown, revalidate?: () => void, finalToolBudgetCheck?: () => void) => void;

/** Fixed-role host endpoint, mounted only into that role. Kernel sender identity
 * and independently scoped mediation are required; no role or execution authority is read
 * from client JSON. Require request EOF before invoking, not merely a newline.
 * A timed-out underlying operation retains capacity and poisons admission; a
 * closed socket does not prove cancellation of a filesystem/CLI operation.
 */
type Invoke = (value: unknown, release: ReleaseReply, context: SessionMachineEffectContext | null) => Promise<unknown>;
export const startSessionBroker = (socket: string, invoke: Invoke, onFault: () => void,
  limits: SessionBrokerLimits = SESSION_BROKER_LIMITS, machine?: SessionMachineTransport): Promise<SessionBroker> =>
  start(socket, invoke, onFault, limits, machine, false);
/** Own synthetic fixtures only; never selected by role input or production wiring. */
export const sessionBrokerTestPort = (socket: string, invoke: Invoke, onFault: () => void,
  limits: SessionBrokerLimits = SESSION_BROKER_LIMITS): Promise<SessionBroker> => start(socket, invoke, onFault, limits, undefined, true);

async function start(socket: string, invoke: Invoke, onFault: () => void, limits: SessionBrokerLimits,
  machine: SessionMachineTransport | undefined, fixture: boolean): Promise<SessionBroker> {
  let canonicalParent = false;
  try { canonicalParent = fs.realpathSync(path.dirname(socket)) === path.dirname(socket); } catch { /* Fixed configuration error below. */ }
  if (!path.isAbsolute(socket) || Buffer.byteLength(socket) > 103 || socket.includes('\0')
    || (!fixture && (machine === undefined || !isSessionMachineTransport(machine)))
    || !canonicalParent
    || Object.keys(limits).length !== Object.keys(SESSION_BROKER_LIMITS).length
    || Object.entries(limits).some(([key, value]) => !Object.hasOwn(SESSION_BROKER_LIMITS, key)
      || !Number.isSafeInteger(value) || value < 1 || value > SESSION_BROKER_LIMITS[key as keyof SessionBrokerLimits])) throw new Error('invalid-session-broker');
  const bounded = Object.freeze({ ...limits });
  const sockets = new Set<net.Socket>();
  let pending = 0, poisoned = false, closing = false;
  const poison = (): void => { poisoned = true; try { onFault(); } catch { /* Safe fixed transport outcome only. */ } };
  const server = net.createServer({ allowHalfOpen: true, pauseOnConnect: !fixture }, raw => { void (async () => {
    sockets.add(raw);
    // Install handlers even for refused connections: a peer reset must never
    // escape as a platform diagnostic or retain a connection slot.
    raw.on('error', () => undefined);
    raw.once('close', () => { sockets.delete(raw); });
    if (closing || poisoned || sockets.size > bounded.connections || pending >= bounded.invocations) {
      raw.destroy(); return;
    }
    const connection: Duplex | null = fixture ? raw : await openSessionMachineConnection(raw, machine!, { bytes: bounded.maxBytes, milliseconds: bounded.milliseconds });
    if (connection === null) { poison(); raw.destroy(); return; }
    const context = fixture ? null : sessionMachineEffectContext(connection);
    if (!fixture && context === null) { poison(); connection.destroy(); return; }
    const chunks: Buffer[] = [];
    let size = 0, completed = false;
    const deadline = performance.now() + bounded.milliseconds;
    const finish = (reply: string, finalToolBudgetCheck?: () => void): void => {
      if (completed) return;
      completed = true;
      if (!connection.destroyed) {
        if (finalToolBudgetCheck !== undefined) endSessionMachineReply(connection, reply, finalToolBudgetCheck);
        else connection.end(reply);
      }
    };
    // Guard the actual write after serialization. A lease can expire while a
    // large reply is being encoded, before a timer can run.
    const release: ReleaseReply = (reply, revalidate, finalToolBudgetCheck) => {
      if (completed || poisoned || closing || connection.destroyed) throw new Error('session-broker-unavailable');
      const frame = encodeCanonicalJson(reply, bounded) + '\n';
      revalidate?.();
      if (completed || poisoned || closing || connection.destroyed || performance.now() >= deadline)
        throw new Error('session-broker-unavailable');
      // Authority and encoding can consume the active ordered tool's allowance.
      // Keep its final budget check separate, after those guards and before bytes.
      if (fixture) {
        if (finalToolBudgetCheck?.() !== undefined) throw new Error('session-broker-unavailable');
        finish(frame);
      }
      else finish(frame, finalToolBudgetCheck);
    };
    // This deadline also bounds flushing the reply to a non-reading peer.
    // The invocation retains its slot until its own promise actually settles.
    const timer = setTimeout(() => { poison(); completed = true; connection.destroy(); }, bounded.milliseconds);
    connection.on('error', () => { poison(); clearTimeout(timer); completed = true; });
    connection.on('close', () => { sockets.delete(raw); clearTimeout(timer); completed = true; });
    connection.on('data', (chunk: Buffer) => {
      if (completed) return;
      size += chunk.length;
      if (size > bounded.maxBytes) { poison(); finish(FAILURE); connection.destroy(); return; }
      chunks.push(chunk);
    });
    connection.once('end', () => { void (async () => {
      if (completed) return;
      let value: unknown;
      try {
        const bytes = Buffer.concat(chunks, size);
        if (bytes.length === 0 || bytes.at(-1) !== 10 || bytes.indexOf(10) !== bytes.length - 1) throw new Error();
        value = parseBoundedJson(new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes.subarray(0, -1)), bounded);
      } catch { poison(); finish(FAILURE); return; }
      // Recheck after the complete frame: simultaneous open connections may
      // all have arrived before any invocation consumed a slot.
      if (closing || poisoned || pending >= bounded.invocations) { finish(FAILURE); return; }
      pending++;
      try {
        const reply = await invoke(value, release, context);
        if (!completed) release(reply);
      } catch { poison(); finish(FAILURE); }
      finally { pending--; }
    })(); });
  })().catch(() => { poison(); raw.destroy(); }); });
  // Extra connections receive no authority; the callback's lower bound also
  // covers environments where maxConnections is handled differently.
  server.maxConnections = bounded.connections;
  try {
    await new Promise<void>((resolve, reject) => {
      const failed = (): void => { reject(new Error('session-broker-start-failed')); };
      server.once('error', failed);
      server.listen(socket, () => { server.off('error', failed); resolve(); });
    });
    if (!fixture && !(await prepareSessionMachineTransport(machine!, server))) throw new Error('session-broker-start-failed');
    server.on('error', poison);
    fs.chmodSync(socket, 0o600);
  } catch {
    server.close(); throw new Error('session-broker-start-failed');
  }
  let closeResult: Promise<{ readonly pendingInvocations: number; readonly termination: 'settled' | 'Unknown' }> | undefined;
  return { socket, close: () => closeResult ??= (async () => {
    closing = true; poisoned = true;
    for (const connection of sockets) connection.destroy();
    await new Promise<void>(resolve => server.close(() => resolve()));
    try { fs.unlinkSync(socket); } catch { /* Caller records safe cleanup state. */ }
    return { pendingInvocations: pending, termination: pending === 0 ? 'settled' : 'Unknown' };
  })() };
}
