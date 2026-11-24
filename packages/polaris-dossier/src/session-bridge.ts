import { spawn } from 'node:child_process';
import * as http from 'node:http';
import type { Socket } from 'node:net';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/** Trusted transport inside a role's private network namespace. This is not the
 * policy gate: it has exactly one Unix destination, whose supervisor checks
 * complete requests before any provider send. No Internet client is present. */
export interface SessionBridgeLimits {
  readonly requestBytes: number;
  readonly responseBytes: number;
  readonly milliseconds: number;
  readonly connections: number;
}
export const SESSION_BRIDGE_LIMITS: SessionBridgeLimits = Object.freeze({
  requestBytes: 8 * 1024 * 1024, responseBytes: 8 * 1024 * 1024,
  milliseconds: 300_000, connections: 4,
});
export interface SessionBridge {
  readonly baseUrl: string;
  close(): Promise<void>;
}
const ROUTES = new Set(['/v1/messages', '/v1/messages?beta=true', '/v1/messages/count_tokens', '/v1/messages/count_tokens?beta=true']);
const FORWARDED_HEADERS = new Set(['authorization', 'x-api-key', 'anthropic-version', 'anthropic-beta', 'content-type', 'user-agent', 'x-app']);
const FAILURE_BODY = '{"type":"error","error":{"type":"invalid_request_error","message":"The bounded session transport refused this request."}}';

export async function startSessionBridge(socketPath: string, limits: SessionBridgeLimits = SESSION_BRIDGE_LIMITS): Promise<SessionBridge> {
  if (!path.isAbsolute(socketPath) || Buffer.byteLength(socketPath) > 103 || /[\0\r\n]/u.test(socketPath)
    || Object.values(limits).some(value => !Number.isSafeInteger(value) || value <= 0)
    || limits.milliseconds > 2_147_483_647) throw new Error('invalid-session-bridge-configuration');
  const connections = new Set<Socket>();
  let active = 0;
  let closing = false;
  const server = http.createServer({ maxHeaderSize: 16_384, requestTimeout: limits.milliseconds, headersTimeout: Math.min(10_000, limits.milliseconds) }, (incoming, outgoing) => {
    let terminal = false;
    let upstream: http.ClientRequest | undefined;
    let requestSize = 0;
    const chunks: Buffer[] = [];
    active++;
    const finish = (): void => {
      if (terminal) return;
      terminal = true;
      clearTimeout(timer);
      active--;
    };
    const refuse = (status: number): void => {
      if (terminal) return;
      upstream?.destroy();
      finish();
      incoming.resume();
      if (!outgoing.headersSent && !outgoing.destroyed) {
        outgoing.writeHead(status, { 'content-type': 'application/json', connection: 'close' });
        outgoing.end(FAILURE_BODY);
      } else outgoing.destroy();
    };
    const timer = setTimeout(() => refuse(504), limits.milliseconds);
    outgoing.on('close', () => { upstream?.destroy(); finish(); });
    incoming.on('error', () => refuse(400));
    const names = new Set<string>();
    for (let index = 0; index < incoming.rawHeaders.length; index += 2) {
      const name = incoming.rawHeaders[index]!.toLowerCase();
      if (names.has(name)) { refuse(400); return; }
      names.add(name);
    }
    if (closing || active > limits.connections) { refuse(503); return; }
    if (incoming.method !== 'POST' || !ROUTES.has(incoming.url ?? '')) { refuse(400); return; }
    if (incoming.headers['content-encoding'] !== undefined && incoming.headers['content-encoding'] !== 'identity') { refuse(415); return; }
    if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/iu.test(incoming.headers['content-type'] ?? '')) { refuse(415); return; }
    incoming.on('data', (chunk: Buffer) => {
      if (terminal) return;
      requestSize += chunk.length;
      if (requestSize > limits.requestBytes) { refuse(413); return; }
      chunks.push(chunk);
    });
    incoming.on('end', () => {
      if (terminal) return;
      const body = Buffer.concat(chunks, requestSize);
      const headers: http.OutgoingHttpHeaders = { host: 'syzygy-session-relay', 'content-length': body.length, 'accept-encoding': 'identity' };
      for (const [name, value] of Object.entries(incoming.headers)) {
        if (!FORWARDED_HEADERS.has(name)) continue;
        if (typeof value !== 'string' || value.length > 8192 || /[\0\r\n]/u.test(value)) { refuse(400); return; }
        headers[name] = value;
      }
      // socketPath is fixed by the supervisor; neither Host nor an absolute URL
      // can turn this transport into a TCP/CONNECT proxy.
      upstream = http.request({ socketPath, method: 'POST', path: incoming.url, headers, setHost: false, agent: false }, response => {
        let responseSize = 0;
        const responseChunks: Buffer[] = [];
        const status = response.statusCode ?? 502;
        if (status < 200 || status >= 600 || (status >= 300 && status < 400)
          || (response.headers['content-encoding'] !== undefined && response.headers['content-encoding'] !== 'identity')) {
          response.destroy(); refuse(502); return;
        }
        response.on('error', () => refuse(502));
        response.on('data', (chunk: Buffer) => {
          if (terminal) return;
          responseSize += chunk.length;
          if (responseSize > limits.responseBytes) { response.destroy(); refuse(502); return; }
          responseChunks.push(chunk);
        });
        response.on('end', () => {
          if (terminal) return;
          const contentType = response.headers['content-type'];
          if (typeof contentType !== 'string' || !/^(?:application\/json|text\/event-stream)(?:\s*;\s*charset=utf-8)?$/iu.test(contentType)) { refuse(502); return; }
          finish();
          outgoing.writeHead(status, { 'content-type': contentType, 'content-length': responseSize });
          outgoing.end(Buffer.concat(responseChunks, responseSize));
        });
      });
      upstream.on('error', () => refuse(502));
      upstream.end(body);
    });
  });
  server.on('connection', socket => {
    connections.add(socket);
    socket.on('close', () => connections.delete(socket));
    socket.setTimeout(limits.milliseconds, () => socket.destroy());
  });
  server.maxConnections = limits.connections;
  server.on('clientError', (_error, socket) => { socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Length: 0\r\n\r\n'); });
  try {
    await new Promise<void>((resolve, reject) => {
      const failed = (error: Error): void => reject(error);
      server.once('error', failed);
      server.listen(0, '127.0.0.1', () => { server.off('error', failed); resolve(); });
    });
  } catch { server.close(); throw new Error('session-bridge-start-failed'); }
  const address = server.address();
  if (address === null || typeof address === 'string') { server.close(); throw new Error('session-bridge-address-unavailable'); }
  return { baseUrl: `http://127.0.0.1:${address.port}`, close: async () => {
    if (closing) return;
    closing = true;
    for (const connection of connections) connection.destroy();
    await new Promise<void>(resolve => server.close(() => resolve()));
  } };
}

/** Runs only the supervisor-selected installed CLI. Bubblewrap's private PID
 * namespace and die-with-parent policy own descendant containment; this wrapper
 * does not claim that a signal alone proves every descendant has terminated. */
async function main(): Promise<number> {
  const [socketFlag, socketPath, delimiter, executable, ...args] = process.argv.slice(2);
  if (socketFlag !== '--socket' || socketPath === undefined || delimiter !== '--'
    || executable === undefined || !path.isAbsolute(executable)) return 2;
  let bridge: SessionBridge;
  try { bridge = await startSessionBridge(socketPath); } catch { process.stderr.write('Session transport could not start.\n'); return 1; }
  const child = spawn(executable, args, { stdio: 'inherit', env: { ...process.env, ANTHROPIC_BASE_URL: bridge.baseUrl } });
  let killTimer: ReturnType<typeof setTimeout> | undefined;
  let exitTimer: ReturnType<typeof setTimeout> | undefined;
  const terminate = (): void => {
    if (killTimer !== undefined) return;
    child.kill('SIGTERM');
    killTimer = setTimeout(() => child.kill('SIGKILL'), 1250);
    exitTimer = setTimeout(() => {
      process.stderr.write('Session transport termination deadline reached; supervisor process verification is required.\n');
      process.exit(1);
    }, 2500);
    killTimer.unref(); exitTimer.unref();
  };
  process.on('SIGTERM', terminate); process.on('SIGINT', terminate); process.on('SIGHUP', terminate);
  const result = await new Promise<number>(resolve => {
    child.once('error', () => resolve(1));
    child.once('exit', code => resolve(code ?? 1));
  });
  process.off('SIGTERM', terminate); process.off('SIGINT', terminate); process.off('SIGHUP', terminate);
  clearTimeout(killTimer); clearTimeout(exitTimer);
  await bridge.close();
  return result;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  void main().then(code => { process.exitCode = code; }, () => { process.stderr.write('Session transport stopped.\n'); process.exitCode = 1; });
}
