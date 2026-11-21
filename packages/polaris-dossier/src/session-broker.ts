import * as fs from 'node:fs';
import * as net from 'node:net';
import path from 'node:path';
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
export type ReleaseReply = (reply: unknown, revalidate?: () => void) => void;

/** Fixed-role host endpoint, mounted only into that role. Socket possession is
 * the explicit filesystem capability; no role or execution authority is read
 * from client JSON. Require request EOF before invoking, not merely a newline.
 * A timed-out underlying operation retains capacity and poisons admission; a
 * closed socket does not prove cancellation of a filesystem/CLI operation.
 */
export async function startSessionBroker(socket: string, invoke: (value: unknown, release: ReleaseReply) => Promise<unknown>,
  onFault: () => void, limits: SessionBrokerLimits = SESSION_BROKER_LIMITS): Promise<SessionBroker> {
  let canonicalParent = false;
  try { canonicalParent = fs.realpathSync(path.dirname(socket)) === path.dirname(socket); } catch { /* Fixed configuration error below. */ }
  if (!path.isAbsolute(socket) || Buffer.byteLength(socket) > 103 || socket.includes('\0')
    || !canonicalParent
    || Object.keys(limits).length !== Object.keys(SESSION_BROKER_LIMITS).length
    || Object.entries(limits).some(([key, value]) => !Object.hasOwn(SESSION_BROKER_LIMITS, key)
      || !Number.isSafeInteger(value) || value < 1 || value > SESSION_BROKER_LIMITS[key as keyof SessionBrokerLimits])) throw new Error('invalid-session-broker');
  const bounded = Object.freeze({ ...limits });
  const sockets = new Set<net.Socket>();
  let pending = 0, poisoned = false, closing = false;
  const poison = (): void => { poisoned = true; try { onFault(); } catch { /* Safe fixed transport outcome only. */ } };
  const server = net.createServer({ allowHalfOpen: true }, connection => {
    sockets.add(connection);
    // Install handlers even for refused connections: a peer reset must never
    // escape as a platform diagnostic or retain a connection slot.
    connection.on('error', () => undefined);
    connection.once('close', () => { sockets.delete(connection); });
    if (closing || poisoned || sockets.size > bounded.connections || pending >= bounded.invocations) {
      connection.destroy(); return;
    }
    const chunks: Buffer[] = [];
    let size = 0, completed = false;
    const deadline = performance.now() + bounded.milliseconds;
    const finish = (reply: string): void => {
      if (completed) return;
      completed = true;
      if (!connection.destroyed) connection.end(reply);
    };
    // Guard the actual write after serialization. A lease can expire while a
    // large reply is being encoded, before a timer can run.
    const release: ReleaseReply = (reply, revalidate) => {
      if (completed || poisoned || closing || connection.destroyed) throw new Error('session-broker-unavailable');
      const frame = encodeCanonicalJson(reply, bounded) + '\n';
      revalidate?.();
      if (completed || poisoned || closing || connection.destroyed || performance.now() >= deadline)
        throw new Error('session-broker-unavailable');
      finish(frame);
    };
    // This deadline also bounds flushing the reply to a non-reading peer.
    // The invocation retains its slot until its own promise actually settles.
    const timer = setTimeout(() => { poison(); completed = true; connection.destroy(); }, bounded.milliseconds);
    connection.on('error', () => { poison(); clearTimeout(timer); completed = true; });
    connection.on('close', () => { sockets.delete(connection); clearTimeout(timer); completed = true; });
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
        const reply = await invoke(value, release);
        if (!completed) release(reply);
      } catch { poison(); finish(FAILURE); }
      finally { pending--; }
    })(); });
  });
  // Extra connections receive no authority; the callback's lower bound also
  // covers environments where maxConnections is handled differently.
  server.maxConnections = bounded.connections;
  try {
    await new Promise<void>((resolve, reject) => {
      const failed = (): void => { reject(new Error('session-broker-start-failed')); };
      server.once('error', failed);
      server.listen(socket, () => { server.off('error', failed); resolve(); });
    });
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
