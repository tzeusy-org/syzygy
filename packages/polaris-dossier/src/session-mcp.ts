/** Trusted stdio transport only. Role, source and effect authority stay in the host broker. */
import { createConnection } from 'node:net';
import { pathToFileURL } from 'node:url';

export interface SessionMcpLimits {
  maxBytes: number;
  maxNodes: number;
  maxDepth: number;
  timeoutMs: number;
  maxInflight: number;
}
const CEILINGS: Readonly<SessionMcpLimits> = Object.freeze({
  maxBytes: 8 * 1024 * 1024, maxNodes: 65_536, maxDepth: 32, timeoutMs: 90_000, maxInflight: 4,
});
function bounds(lower: Partial<SessionMcpLimits> = {}): SessionMcpLimits {
  const result = { ...CEILINGS };
  for (const key of Object.keys(lower) as (keyof SessionMcpLimits)[]) {
    const value = lower[key];
    if (!Object.hasOwn(CEILINGS, key) || typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1 || value > CEILINGS[key]) {
      throw new Error('Invalid session MCP limits');
    }
    result[key] = value;
  }
  return result;
}
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
const keysWithin = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).every(key => keys.includes(key));
const textValue = (value: unknown): value is string => typeof value === 'string' && !/[\u0000]/u.test(value);
const pathSchema = { type: 'string', minLength: 1, maxLength: 4096 };
export const SESSION_MCP_TOOLS = Object.freeze([
  { name: 'source_read', description: 'Read a bounded pinned source span through the role broker.', inputSchema: {
    type: 'object', properties: { path: pathSchema, offset: { type: 'integer', minimum: 0 }, limit: { type: 'integer', minimum: 1 } }, required: ['path'], additionalProperties: false,
  } },
  { name: 'artifact_read', description: 'Read an artifact admitted for this role.', inputSchema: {
    type: 'object', properties: { path: pathSchema }, required: ['path'], additionalProperties: false,
  } },
  { name: 'artifact_write', description: 'Submit an artifact for host validation before writing.', inputSchema: {
    type: 'object', properties: { path: pathSchema, content: { type: 'string' } }, required: ['path', 'content'], additionalProperties: false,
  } },
  { name: 'dossier_step', description: 'Request a fixed dossier operation validated by the host.', inputSchema: {
    type: 'object', properties: { argv: { type: 'array', minItems: 1, maxItems: 128, items: { type: 'string' } }, stdin: { type: 'string' } }, required: ['argv'], additionalProperties: false,
  } },
]);
export type SessionMcpTool = 'source_read' | 'artifact_read' | 'artifact_write' | 'dossier_step';
export interface SessionMcpInvocation { tool: SessionMcpTool; input: Record<string, unknown> }
export type SessionMcpInvocationPort = (invocation: SessionMcpInvocation) => Promise<unknown>;
type Response = Record<string, unknown>;
const fault = (id: unknown, code: number, message: string): Response => ({ jsonrpc: '2.0', id, error: { code, message } });
const brokerFailure = () => ({ ok: false, error: 'session-broker-unavailable' });

/** Iterative census also protects direct callers that do not start with JSON bytes. */
function boundedJson(value: unknown, limits: SessionMcpLimits): string {
  const pending: { value: unknown; depth: number; exit?: boolean }[] = [{ value, depth: 0 }];
  const seen = new Set<object>();
  let nodes = 0;
  let scheduled = 1;
  while (pending.length) {
    const current = pending.pop()!;
    if (current.exit) { seen.delete(current.value as object); continue; }
    if (++nodes > limits.maxNodes || current.depth > limits.maxDepth) throw new Error('Invalid session MCP value');
    const item = current.value;
    if (item === null || typeof item === 'boolean') continue;
    if (typeof item === 'string') {
      // JSON.stringify repairs lone surrogates; refuse rather than change transported bytes.
      if (/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(item)) throw new Error('Invalid session MCP value');
      continue;
    }
    if (typeof item === 'number' && Number.isFinite(item)) continue;
    if (!Array.isArray(item) && !object(item)) throw new Error('Invalid session MCP value');
    if (seen.has(item)) throw new Error('Invalid session MCP value');
    seen.add(item);
    const values = Array.isArray(item) ? item : Object.values(item);
    scheduled += values.length;
    if (scheduled > limits.maxNodes) throw new Error('Invalid session MCP value');
    pending.push({ value: item, depth: current.depth, exit: true });
    for (const child of values) pending.push({ value: child, depth: current.depth + 1 });
  }
  const encoded = JSON.stringify(value);
  if (Buffer.byteLength(encoded, 'utf8') + 1 > limits.maxBytes) throw new Error('Session MCP size limit');
  return encoded;
}
function decode(bytes: Uint8Array, limits: SessionMcpLimits): unknown {
  if (bytes.byteLength + 1 > limits.maxBytes) throw new Error('Session MCP size limit');
  const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  boundedJson(value, limits);
  return value;
}
function argumentsValid(tool: string, input: unknown): input is Record<string, unknown> {
  if (!object(input)) return false;
  const path = () => textValue(input.path) && input.path.length > 0 && input.path.length <= 4096;
  switch (tool) {
    case 'source_read': return keysWithin(input, ['path', 'offset', 'limit']) && path()
      && (input.offset === undefined || (Number.isSafeInteger(input.offset) && (input.offset as number) >= 0))
      && (input.limit === undefined || (Number.isSafeInteger(input.limit) && (input.limit as number) > 0));
    case 'artifact_read': return keysWithin(input, ['path']) && path();
    case 'artifact_write': return keysWithin(input, ['path', 'content']) && path() && textValue(input.content);
    case 'dossier_step': return keysWithin(input, ['argv', 'stdin']) && Array.isArray(input.argv)
      && input.argv.length > 0 && input.argv.length <= 128 && input.argv.every(textValue)
      && (input.stdin === undefined || textValue(input.stdin));
    default: return false;
  }
}
async function within<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([operation, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Session MCP timeout')), timeoutMs);
    })]);
  } finally { clearTimeout(timer); }
}

/** No request can select a socket or perform an effect except through the injected role port.
 * The deadline bounds this await, not cancellation of an arbitrary injected port.
 * A stream makes such a failure terminal; direct callers own their port lifetime. */
export async function handleSessionMcpRequest(request: unknown, invoke: SessionMcpInvocationPort, lower: Partial<SessionMcpLimits> = {}): Promise<Response | undefined> {
  return handleRequest(request, invoke, bounds(lower), () => {});
}

async function handleRequest(request: unknown, invoke: SessionMcpInvocationPort, limits: SessionMcpLimits, invocationFailed: () => void): Promise<Response | undefined> {
  try { boundedJson(request, limits); } catch { return fault(null, -32600, 'Invalid request'); }
  if (!object(request)) return fault(null, -32600, 'Invalid request');
  // Notifications, including initialized/cancelled, never invoke the broker or receive a response.
  if (!Object.hasOwn(request, 'id')) return undefined;
  const id = request.id;
  if (!(typeof id === 'string' || (typeof id === 'number' && Number.isSafeInteger(id)) || id === null)) return fault(null, -32600, 'Invalid request');
  if (request.jsonrpc !== '2.0' || typeof request.method !== 'string' || !keysWithin(request, ['jsonrpc', 'id', 'method', 'params'])) return fault(id, -32600, 'Invalid request');
  if (request.method === 'initialize') {
    if (!object(request.params) || typeof request.params.protocolVersion !== 'string'
      || !keysWithin(request.params, ['protocolVersion', 'capabilities', 'clientInfo'])
      || (request.params.capabilities !== undefined && !object(request.params.capabilities))
      || (request.params.clientInfo !== undefined && !object(request.params.clientInfo))) return fault(id, -32602, 'Invalid parameters');
    return { jsonrpc: '2.0', id, result: { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'syzygy-session', version: '1' } } };
  }
  if (request.method === 'tools/list') {
    if (request.params !== undefined && (!object(request.params) || Object.keys(request.params).length !== 0)) return fault(id, -32602, 'Invalid parameters');
    return { jsonrpc: '2.0', id, result: { tools: SESSION_MCP_TOOLS } };
  }
  if (request.method !== 'tools/call') return fault(id, -32601, 'Method not found');
  const params = request.params;
  if (!object(params) || !keysWithin(params, ['name', 'arguments', '_meta']) || (params._meta !== undefined && !object(params._meta)) || typeof params.name !== 'string' || !argumentsValid(params.name, params.arguments)) return fault(id, -32602, 'Invalid parameters');
  let reply: unknown;
  try {
    reply = await within(Promise.resolve().then(() => invoke({ tool: params.name as SessionMcpTool, input: params.arguments as Record<string, unknown> })), limits.timeoutMs);
    boundedJson(reply, limits);
  } catch { invocationFailed(); reply = brokerFailure(); }
  const response = { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(reply) }], isError: object(reply) && reply.ok === false } };
  try { boundedJson(response, { ...CEILINGS, maxBytes: limits.maxBytes }); return response; } catch { return fault(id, -32603, 'Response limit exceeded'); }
}

/** Framing or invocation failure is terminal. Timed-out underlying work may
 * remain for the host to clean up; its capacity is never reused by this stream. */
export async function serveSessionMcp(input: AsyncIterable<Uint8Array>, write: (line: string) => Promise<void>, invoke: SessionMcpInvocationPort, lower: Partial<SessionMcpLimits> = {}): Promise<void> {
  const limits = bounds(lower);
  let partial = Buffer.alloc(0);
  let output = Promise.resolve();
  const pending = new Set<Promise<void>>();
  let terminal = false;
  let signalTerminal!: () => void;
  const stopped = new Promise<IteratorResult<Uint8Array>>(resolve => {
    signalTerminal = () => resolve({ done: true, value: undefined });
  });
  const stop = () => { terminal = true; signalTerminal(); };
  const iterator = input[Symbol.asyncIterator]();
  const emit = (response: Response) => {
    // Serialization and writes are ordered; responses retain IDs when invocation completion reorders them.
    const line = boundedJson(response, { ...CEILINGS, maxBytes: limits.maxBytes }) + '\n';
    const writing = output.then(() => within(Promise.resolve().then(() => write(line)), limits.timeoutMs));
    output = writing.catch(stop);
    return output;
  };
  try {
    while (!terminal) {
      const next = await Promise.race([iterator.next(), stopped]);
      if (next.done || terminal) break;
      const chunk = next.value;
      if (!(chunk instanceof Uint8Array) || chunk.byteLength + partial.length > limits.maxBytes) throw new Error('Invalid session MCP frame');
      const bytes = Buffer.concat([partial, chunk]);
      const requests: unknown[] = [];
      let start = 0;
      // Validate the entire received chunk before admitting any of its requests.
      for (let end = bytes.indexOf(10); end !== -1; end = bytes.indexOf(10, start)) {
        requests.push(decode(bytes.subarray(start, end), limits));
        start = end + 1;
      }
      partial = bytes.subarray(start);
      for (const request of requests) {
        while (pending.size >= limits.maxInflight && !terminal) await Promise.race(pending);
        if (terminal) break;
        let failed = false;
        const operation = handleRequest(request, invoke, limits, () => { failed = true; }).then(async response => {
          if (response !== undefined && !terminal) await emit(response);
          if (failed) stop();
        }).catch(stop);
        pending.add(operation);
        void operation.finally(() => pending.delete(operation));
      }
    }
    if (!terminal && partial.length !== 0) throw new Error('Invalid session MCP frame');
  } catch {
    stop();
    // This constant never includes bytes or parser/transport exception text.
    try { await emit(fault(null, -32700, 'Invalid message framing')); } catch { /* closed output */ }
  }
  if (terminal && iterator.return) {
    // An arbitrary input port may never finish return(); do not wait without a bound.
    void Promise.resolve(iterator.return()).catch(() => {});
  }
  await Promise.all(pending);
  await output;
}

/** One fresh bounded connection per invocation. The socket is fixed by the role launcher. */
export function createSessionBrokerInvocation(socketPath: string, lower: Partial<SessionMcpLimits> = {}): SessionMcpInvocationPort {
  const limits = bounds(lower);
  if (!socketPath.startsWith('/') || socketPath.includes('\0') || Buffer.byteLength(socketPath) > 103) throw new Error('Invalid session broker socket');
  let inflight = 0;
  return async invocation => {
    const line = boundedJson(invocation, limits) + '\n';
    if (inflight >= limits.maxInflight) throw new Error('Session broker concurrency limit');
    inflight += 1;
    try {
      return await new Promise<unknown>((resolve, reject) => {
        const socket = createConnection({ path: socketPath });
        const chunks: Buffer[] = [];
        let length = 0;
        let finished = false;
        const finish = (reply?: unknown, failed = false) => {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          socket.destroy();
          if (failed) reject(new Error('Session broker transport failed')); else resolve(reply);
        };
        const timer = setTimeout(() => finish(undefined, true), limits.timeoutMs);
        // Half-close the request so the host can validate the whole unary frame
        // before starting an effect, including data after its first newline.
        socket.once('connect', () => socket.end(line));
        socket.on('data', (chunk: Buffer) => {
          length += chunk.length;
          if (length > limits.maxBytes) { finish(undefined, true); return; }
          chunks.push(chunk);
        });
        socket.once('end', () => {
          try {
            const bytes = Buffer.concat(chunks, length);
            if (bytes.length === 0 || bytes[bytes.length - 1] !== 10 || bytes.indexOf(10) !== bytes.length - 1) throw new Error('Invalid session broker frame');
            finish(decode(bytes.subarray(0, -1), limits));
          } catch { finish(undefined, true); }
        });
        socket.once('error', () => finish(undefined, true));
        socket.once('close', () => { if (!finished) finish(undefined, true); });
      });
    } finally { inflight -= 1; }
  };
}
async function main(): Promise<void> {
  // Writable streams emit error as well as rejecting their write callback. Never let
  // an EPIPE become an unhandled exception containing platform or input details.
  process.stdout.on('error', () => { process.exitCode = 1; process.stdin.destroy(); });
  try {
    const socketPath = process.env.SYZYGY_SESSION_MCP_SOCKET;
    if (!socketPath) throw new Error('Missing session broker socket');
    const invoke = createSessionBrokerInvocation(socketPath);
    await serveSessionMcp(process.stdin, line => new Promise<void>((resolve, reject) => {
      process.stdout.write(line, error => error ? reject(new Error('Session MCP output failed')) : resolve());
    }), invoke);
    process.stdin.destroy();
  } catch { process.exitCode = 1; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) void main();
