import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { createSessionBrokerInvocation, handleSessionMcpRequest, serveSessionMcp, SESSION_MCP_TOOLS, type SessionMcpInvocation, type SessionMcpLimits } from './session-mcp.js';

const { connect } = vi.hoisted(() => ({ connect: vi.fn() }));
vi.mock('node:net', () => ({ createConnection: connect }));

const call = (id: number, name = 'source_read', args: unknown = { path: 'README.md' }) => ({ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } });
const line = (value: unknown) => Buffer.from(JSON.stringify(value) + '\n');
async function* chunks(...values: Uint8Array[]) { for (const value of values) yield value; }
async function run(input: Uint8Array[], invoke = vi.fn(async (_input: SessionMcpInvocation): Promise<unknown> => ({ ok: true })), limits: Partial<SessionMcpLimits> = {}) {
  const output: string[] = [];
  await serveSessionMcp(chunks(...input), async text => { output.push(text); }, invoke, limits);
  return { output: output.map(text => JSON.parse(text)), invoke, raw: output.join('') };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
const turn = () => new Promise<void>(resolve => setImmediate(resolve));

describe('trusted session MCP protocol', () => {
  it('negotiates the supported version, lists only the four fixed tools, and ignores notifications', async () => {
    const invoke = vi.fn();
    const handshake = await handleSessionMcpRequest({ jsonrpc: '2.0', id: 0, method: 'initialize', params: {
      protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'synthetic-client', version: '1' },
    } }, invoke);
    expect(handshake).toEqual({ jsonrpc: '2.0', id: 0, result: {
      protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'syzygy-session', version: '1' },
    } });
    const listing = await handleSessionMcpRequest({ jsonrpc: '2.0', id: 'list', method: 'tools/list' }, invoke);
    expect(listing).toEqual({ jsonrpc: '2.0', id: 'list', result: { tools: SESSION_MCP_TOOLS } });
    expect(SESSION_MCP_TOOLS.map(tool => tool.name)).toEqual(['source_read', 'artifact_read', 'artifact_write', 'dossier_step']);
    expect(SESSION_MCP_TOOLS.every(tool => tool.inputSchema.additionalProperties === false)).toBe(true);
    expect(await handleSessionMcpRequest({ jsonrpc: '2.0', method: 'notifications/initialized' }, invoke)).toBeUndefined();
    expect(await handleSessionMcpRequest({ jsonrpc: '2.0', method: 'tools/call', params: call(1).params }, invoke)).toBeUndefined();
    expect(invoke).not.toHaveBeenCalled();
  });

  it.each([
    ['source_read', { path: 'doc.md', offset: 12, limit: 40 }],
    ['artifact_read', { path: 'draft.json' }],
    ['artifact_write', { path: 'draft.json', content: 'λ\n"quoted"' }],
    ['dossier_step', { argv: ['checkpoint', '--run', 'synthetic'], stdin: '{}' }],
  ])('forwards only %s and its validated arguments, then preserves canonical reply bytes', async (name, args) => {
    const reply = { ok: true, body: 'λ\n"quoted"', origin: { pin: 'synthetic-pin' } };
    const invoke = vi.fn(async () => reply);
    const request = { ...call(7, name as string, args), params: { ...call(7, name as string, args).params, _meta: { progressToken: 7, 'claudecode/toolUseId': 'synthetic' } } };
    expect(await handleSessionMcpRequest(request, invoke)).toEqual({ jsonrpc: '2.0', id: 7, result: {
      content: [{ type: 'text', text: JSON.stringify(reply) }], isError: false,
    } });
    expect(invoke).toHaveBeenCalledExactlyOnceWith({ tool: name, input: args });
  });

  it('marks only explicit ok:false replies as tool errors', async () => {
    for (const reply of [{ ok: false, error: 'source-refused' }, { ok: 0 }, false, null]) {
      const response = await handleSessionMcpRequest(call(1), async () => reply);
      expect(response?.result).toEqual({ content: [{ type: 'text', text: JSON.stringify(reply) }], isError: reply !== null && typeof reply === 'object' && reply.ok === false });
    }
  });

  it.each([
    ['execute', { argv: ['sh'] }], ['source_read', { path: 'x', socket: '/arbitrary' }],
    ['source_read', { path: 'x', offset: -1 }], ['source_read', { path: 'x', limit: 0 }],
    ['source_read', { path: 'x', offset: 1.5 }], ['source_read', { path: '' }],
    ['artifact_read', { path: 'x', content: 'extra' }], ['artifact_write', { path: 'x' }],
    ['artifact_write', { path: 'x', content: null }], ['dossier_step', { argv: [] }],
    ['dossier_step', { argv: ['step', 1] }], ['dossier_step', { argv: ['step'], stdin: 1 }],
    ['dossier_step', { argv: Array.from({ length: 129 }, () => 'x') }],
    ['source_read', { path: 'bad\0path' }], ['artifact_read', { path: 'x'.repeat(4097) }],
  ])('rejects invalid %s arguments before invoking the broker', async (name, args) => {
    const invoke = vi.fn();
    expect(await handleSessionMcpRequest(call(1, name as string, args), invoke)).toMatchObject({ id: 1, error: { code: -32602 } });
    expect(invoke).not.toHaveBeenCalled();
  });

  it('rejects unknown methods, malformed envelopes, and invalid metadata without reflecting input', async () => {
    const invoke = vi.fn();
    const secret = 'NONSECRET_UNSAFE_ERROR_CANARY';
    const unknown = await handleSessionMcpRequest({ jsonrpc: '2.0', id: 9, method: secret }, invoke);
    expect(unknown).toEqual({ jsonrpc: '2.0', id: 9, error: { code: -32601, message: 'Method not found' } });
    for (const request of [{ ...call(1), jsonrpc: '1.0' }, { ...call(1), extra: secret }, { ...call(1), id: {} }]) {
      expect(await handleSessionMcpRequest(request, invoke)).toMatchObject({ error: { code: -32600 } });
    }
    expect(await handleSessionMcpRequest({ ...call(1), params: { ...call(1).params, _meta: secret } }, invoke)).toMatchObject({ error: { code: -32602 } });
    expect(JSON.stringify(unknown)).not.toContain(secret);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('bounds direct request depth, node count and UTF8 bytes before dispatch', async () => {
    const invoke = vi.fn();
    const request = call(1, 'artifact_write', { path: 'x', content: 'λ'.repeat(200) });
    for (const [value, limits] of [[request, { maxBytes: 300 }], [call(1), { maxDepth: 2 }], [call(1), { maxNodes: 6 }], [call(1, 'artifact_write', { path: 'x', content: '\ud800' }), {}]] as const) {
      expect(await handleSessionMcpRequest(value, invoke, limits)).toMatchObject({ error: { code: -32600 } });
    }
    expect(invoke).not.toHaveBeenCalled();
  });

  it('returns a generic canonical refusal for failed, oversized or non-JSON broker replies', async () => {
    const unsafe = 'NONSECRET_UNSAFE_EXCEPTION_CANARY';
    for (const invoke of [async () => { throw new Error(unsafe); }, async () => ({ body: unsafe.repeat(1000) }), async () => ({ bad: BigInt(1) })]) {
      const response = await handleSessionMcpRequest(call(1), invoke, { maxBytes: 1024 });
      expect(response).toEqual({ jsonrpc: '2.0', id: 1, result: {
        content: [{ type: 'text', text: '{"ok":false,"error":"session-broker-unavailable"}' }], isError: true,
      } });
      expect(JSON.stringify(response)).not.toContain(unsafe);
    }
  });

  it('bounds broker waiting and rejects output expansion past the wire bound', async () => {
    vi.useFakeTimers();
    try {
      const waiting = handleSessionMcpRequest(call(1), () => new Promise(() => {}), { timeoutMs: 10 });
      await vi.advanceTimersByTimeAsync(10);
      expect(await waiting).toMatchObject({ result: { isError: true } });
    } finally { vi.useRealTimers(); }
    const response = await handleSessionMcpRequest(call(1), async () => ({ body: '"'.repeat(200) }), { maxBytes: 512 });
    expect(response).toMatchObject({ error: { code: -32603, message: 'Response limit exceeded' } });
  });

  it('allows callers only to lower finite positive bounds and requires an absolute fixed socket', () => {
    for (const lower of [{ maxInflight: 5 }, { timeoutMs: 90_001 }, { maxBytes: 0 }, { maxDepth: NaN }]) {
      expect(() => createSessionBrokerInvocation('/tmp/synthetic.sock', lower)).toThrow('Invalid session MCP limits');
    }
    for (const socket of ['', 'relative.sock', '/tmp/bad\0socket', '/tmp/' + 'x'.repeat(104)]) {
      expect(() => createSessionBrokerInvocation(socket)).toThrow('Invalid session broker socket');
    }
  });
});

describe('session MCP byte stream', () => {

  it('serializes the actual tool catalogue through the wire port', async () => {
    const result = await run([line({ jsonrpc: '2.0', id: 'catalogue', method: 'tools/list' })]);
    expect(result.output).toEqual([{ jsonrpc: '2.0', id: 'catalogue', result: { tools: SESSION_MCP_TOOLS } }]);
    expect(result.invoke).not.toHaveBeenCalled();
  });

  it('decodes split UTF8 and frames, preserves IDs, and writes exactly one JSON line per response', async () => {
    const bytes = line(call(11, 'artifact_write', { path: 'x', content: 'λ' }));
    const split = bytes.indexOf(Buffer.from('λ')) + 1;
    const result = await run([bytes.subarray(0, split), bytes.subarray(split), line(call(12))]);
    expect(result.output.map(value => value.id)).toEqual([11, 12]);
    expect(result.invoke.mock.calls[0]?.[0]).toEqual({ tool: 'artifact_write', input: { path: 'x', content: 'λ' } });
    expect(result.raw.split('\n')).toHaveLength(3);
  });

  it.each([
    Buffer.from('{"secret":"NONSECRET_FRAMING_CANARY"}\xff\n'),
    Buffer.from('{"secret":"NONSECRET_FRAMING_CANARY",}\n'),
    Buffer.from('\n'),
  ])('terminates on corrupt framing and drops subsequent requests in the same and later chunks', async bad => {
    const result = await run([Buffer.concat([bad, line(call(2))]), line(call(3))]);
    expect(result.output).toEqual([{ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Invalid message framing' } }]);
    expect(result.invoke).not.toHaveBeenCalled();
    expect(result.raw).not.toContain('NONSECRET_FRAMING_CANARY');
  });

  it('refuses invalid UTF8, unterminated EOF, oversized frames, and depth/node census breaches', async () => {
    const cases: [Uint8Array[], Partial<SessionMcpLimits>][] = [
      [[Buffer.from([0xc3, 0x28, 10]), line(call(2))], {}],
      [[Buffer.from(JSON.stringify(call(1)))], {}],
      [[Buffer.alloc(513, 120), line(call(2))], { maxBytes: 512 }],
      [[line(call(1)), line(call(2))], { maxNodes: 5 }],
      [[line(call(1)), line(call(2))], { maxDepth: 1 }],
    ];
    for (const [input, limits] of cases) {
      const result = await run(input, undefined, limits);
      expect(result.output).toHaveLength(1);
      expect(result.output[0]).toMatchObject({ id: null, error: { code: -32700 } });
      expect(result.invoke).not.toHaveBeenCalled();
    }
  });

  it('caps blocked invocations at four and correlates replies even when they complete out of order', async () => {
    const blocked = Array.from({ length: 5 }, () => deferred<unknown>());
    const invoke = vi.fn((invocation: SessionMcpInvocation) => blocked[Number(invocation.input.offset)]!.promise);
    const output: string[] = [];
    const running = serveSessionMcp(chunks(Buffer.concat(blocked.map((_, index) => line(call(index, 'source_read', { path: 'x', offset: index }))))), async value => { output.push(value); }, invoke);
    await turn();
    expect(invoke).toHaveBeenCalledTimes(4);
    blocked[2]!.resolve({ ok: true, index: 2 });
    await turn();
    expect(invoke).toHaveBeenCalledTimes(5);
    for (const index of [4, 0, 3, 1]) { blocked[index]!.resolve({ ok: true, index }); await turn(); }
    await running;
    expect(output.map(value => JSON.parse(value).id)).toEqual([2, 4, 0, 3, 1]);
    expect(output.map(value => JSON.parse(JSON.parse(value).result.content[0].text).index)).toEqual([2, 4, 0, 3, 1]);
  });

  it('honors lower concurrency and never dispatches queued frames after a terminal input fault', async () => {
    const blocked = deferred<unknown>();
    const invoke = vi.fn(async () => blocked.promise);
    const output: string[] = [];
    const running = serveSessionMcp(chunks(line(call(1)), Buffer.concat([Buffer.from('not JSON\n'), line(call(2))]), line(call(3))), async value => { output.push(value); }, invoke, { maxInflight: 1 });
    await turn();
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(output.map(value => JSON.parse(value))).toEqual([{ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Invalid message framing' } }]);
    blocked.resolve({ ok: true });
    await running;
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(output).toHaveLength(1);
  });

  it('does not reuse capacity from timed-out underlying invocations that never settled', async () => {
    const blocked = Array.from({ length: 7 }, () => deferred<unknown>());
    let active = 0, peak = 0;
    const invoke = vi.fn(async () => {
      const index = active++;
      peak = Math.max(peak, active);
      try { return await blocked[index]!.promise; } finally { active--; }
    });
    const output: string[] = [];
    await serveSessionMcp(chunks(Buffer.concat(blocked.map((_, index) => line(call(index))))), async value => { output.push(value); }, invoke,
      { maxInflight: 2, timeoutMs: 5 });
    try {
      expect(invoke).toHaveBeenCalledTimes(2);
      expect(peak).toBe(2); expect(active).toBe(2);
      expect(output.length).toBeGreaterThan(0); expect(output.length).toBeLessThanOrEqual(2);
    } finally {
      for (const item of blocked) item.resolve({ ok: true });
      await turn();
    }
    expect(active).toBe(0);
  });

  it('terminates on an output failure without dispatching further queued requests', async () => {
    const invoke = vi.fn(async () => ({ ok: true }));
    await serveSessionMcp(chunks(Buffer.concat([line(call(1)), line(call(2)), line(call(3))])), async () => { throw new Error('NONSECRET_OUTPUT_ERROR_CANARY'); }, invoke, { maxInflight: 1 });
    expect(invoke).toHaveBeenCalledTimes(1);
  });


  it('ends after output failure even when the input has no next frame or EOF', async () => {
    const never = deferred<IteratorResult<Uint8Array>>();
    const input = {
      [Symbol.asyncIterator]() {
        let first = true;
        return { next: () => {
          if (first) { first = false; return Promise.resolve({ done: false as const, value: line(call(1)) }); }
          return never.promise;
        } };
      },
    };
    const invoke = vi.fn(async () => ({ ok: true }));
    await serveSessionMcp(input, async () => { throw new Error('NONSECRET_OUTPUT_ERROR_CANARY'); }, invoke);
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('bounds a stalled output write instead of holding the stream forever', async () => {
    vi.useFakeTimers();
    try {
      const invoke = vi.fn(async () => ({ ok: true }));
      const running = serveSessionMcp(chunks(Buffer.concat([line(call(1)), line(call(2))])), () => new Promise(() => {}), invoke, { timeoutMs: 10, maxInflight: 1 });
      await vi.advanceTimersByTimeAsync(10);
      await running;
      expect(invoke).toHaveBeenCalledTimes(1);
    } finally { vi.useRealTimers(); }
  });
});


class MemorySocket extends EventEmitter {
  write = vi.fn();
  end = vi.fn();
  destroy = vi.fn();
}

describe('bounded session broker transport', () => {
  it('uses the fixed UNIX path, sends exactly one invocation line and decodes a split reply at EOF', async () => {
    const socket = new MemorySocket();
    connect.mockReturnValueOnce(socket);
    const invoke = createSessionBrokerInvocation('/tmp/role-fixed.sock');
    const request: SessionMcpInvocation = { tool: 'source_read', input: { path: 'doc.md' } };
    const result = invoke(request);
    expect(connect).toHaveBeenLastCalledWith({ path: '/tmp/role-fixed.sock' });
    socket.emit('connect');
    expect(socket.end).toHaveBeenCalledExactlyOnceWith(JSON.stringify(request) + '\n');
    expect(socket.write).not.toHaveBeenCalled();
    const reply = Buffer.from('{"ok":true,"body":"λ"}\n');
    const split = reply.indexOf(Buffer.from('λ')) + 1;
    socket.emit('data', reply.subarray(0, split));
    socket.emit('data', reply.subarray(split));
    socket.emit('end');
    expect(await result).toEqual({ ok: true, body: 'λ' });
    expect(socket.destroy).toHaveBeenCalledTimes(1);
  });

  it.each([
    Buffer.from('{"ok":true}'),
    Buffer.from('{"ok":true}\n{"ok":true}\n'),
    Buffer.from('{"ok":true}\ntrailer'),
    Buffer.from('{bad-json}\n'),
    Buffer.from([0xff, 10]),
    Buffer.alloc(513, 120),
  ])('rejects incomplete, extra, malformed, invalid UTF8 or oversized broker frames', async reply => {
    const socket = new MemorySocket();
    connect.mockReturnValueOnce(socket);
    const result = createSessionBrokerInvocation('/tmp/role-fixed.sock', { maxBytes: 512 })( { tool: 'artifact_read', input: { path: 'x' } });
    const assertion = expect(result).rejects.toThrow('Session broker transport failed');
    socket.emit('data', reply);
    socket.emit('end');
    await assertion;
    expect(socket.destroy).toHaveBeenCalledTimes(1);
  });

  it('bounds the entire connection wall time, destroys the socket and releases its concurrency slot', async () => {
    vi.useFakeTimers();
    try {
      const first = new MemorySocket();
      const second = new MemorySocket();
      connect.mockReturnValueOnce(first).mockReturnValueOnce(second);
      const invoke = createSessionBrokerInvocation('/tmp/role-fixed.sock', { timeoutMs: 10, maxInflight: 1 });
      const waiting = invoke({ tool: 'artifact_read', input: { path: 'x' } });
      const assertion = expect(waiting).rejects.toThrow('Session broker transport failed');
      await vi.advanceTimersByTimeAsync(10);
      await assertion;
      expect(first.destroy).toHaveBeenCalledTimes(1);
      const next = invoke({ tool: 'artifact_read', input: { path: 'x' } });
      second.emit('data', Buffer.from('{"ok":true}\n'));
      second.emit('end');
      expect(await next).toEqual({ ok: true });
    } finally { vi.useRealTimers(); }
  });

  it('caps direct transport callers at four active sockets without queuing a fifth', async () => {
    const sockets = Array.from({ length: 4 }, () => new MemorySocket());
    for (const socket of sockets) connect.mockReturnValueOnce(socket);
    const invoke = createSessionBrokerInvocation('/tmp/role-fixed.sock');
    const calls = sockets.map(() => invoke({ tool: 'artifact_read', input: { path: 'x' } }));
    await expect(invoke({ tool: 'artifact_read', input: { path: 'x' } })).rejects.toThrow('Session broker concurrency limit');
    for (const socket of sockets) {
      socket.emit('data', Buffer.from('{"ok":true}\n'));
      socket.emit('end');
    }
    expect(await Promise.all(calls)).toEqual(sockets.map(() => ({ ok: true })));
  });

  it('does not expose underlying connection exception text or dispatch oversized requests', async () => {
    const socket = new MemorySocket();
    connect.mockReturnValueOnce(socket);
    const invoke = createSessionBrokerInvocation('/tmp/role-fixed.sock', { maxBytes: 512 });
    const result = invoke({ tool: 'artifact_read', input: { path: 'x' } });
    const assertion = expect(result).rejects.toThrow(/^Session broker transport failed$/);
    socket.emit('error', new Error('NONSECRET_UNSAFE_TRANSPORT_CANARY'));
    await assertion;
    const before = connect.mock.calls.length;
    await expect(invoke({ tool: 'artifact_write', input: { path: 'x', content: 'x'.repeat(512) } })).rejects.toThrow('Session MCP size limit');
    expect(connect.mock.calls).toHaveLength(before);
  });
});
