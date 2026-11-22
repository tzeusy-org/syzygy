import * as fs from 'node:fs';
import * as net from 'node:net';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { createSessionBrokerInvocation } from './session-mcp.js';
import { SESSION_BROKER_LIMITS, sessionBrokerTestPort, type SessionBroker } from './session-broker.js';
import { createOrderedDesignWorkBudget, reserveOrderedDesignWork } from './url-ordered-design-work-budget.js';
import type { OrderedDesignTransferBounds } from './url-ordered-design-bounds.js';
import { createUrlRunCpuBudget } from './url-run-cpu-budget.js';

const cleanup: (() => void | Promise<unknown>)[] = [];
afterEach(async () => { for (const close of cleanup.splice(0).reverse()) await close(); });
const pause = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const address = () => path.join(tempDir('session-broker-'), 'b.sock');
async function fixture(invoke: Parameters<typeof sessionBrokerTestPort>[1], lower: Partial<typeof SESSION_BROKER_LIMITS> = {}) {
  let faults = 0;
  const broker = await sessionBrokerTestPort(address(), invoke, () => { faults++; }, { ...SESSION_BROKER_LIMITS, milliseconds: 500, ...lower });
  cleanup.push(() => broker.close());
  return { broker, faults: () => faults };
}
function connect(broker: SessionBroker) {
  const socket = net.createConnection(broker.socket), chunks: Buffer[] = [];
  const done = new Promise<string>(resolve => {
    socket.on('data', (chunk: Buffer) => chunks.push(chunk));
    socket.on('error', () => undefined);
    socket.once('close', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
  cleanup.push(() => { socket.destroy(); });
  return { socket, done };
}
const invocation = { tool: 'artifact_read', input: { path: 'status.json' } } as const;

function orderedTool() {
  const bytes = { bytes: 100, nodes: 10, depth: 3 };
  const turn = { received: bytes, receivedCanonical: bytes, prepared: bytes, logicalReceived: bytes, logicalPrepared: bytes,
    history: { ...bytes, messages: 4 }, nativeWrapper: bytes, brokerRequest: bytes, brokerReply: bytes,
    mcpRequest: bytes, mcpReply: bytes, responseWire: { ...bytes, frames: 6 }, responseContent: bytes };
  const shape: OrderedDesignTransferBounds = { profileSha256: 'a'.repeat(64), manifestSha256: 'b'.repeat(64),
    retainedMessagesSha256: 'c'.repeat(64), totals: turn,
    turns: (['prepared', 'part', 'part', 'verdict-acknowledgment'] as const).map(kind => ({ ...turn, kind })) };
  const envelope = { cpuMicroseconds: 10, wallMilliseconds: 30_000, auditReadBytes: 100, inputCodeUnits: 8_388_608,
    secretCodeUnits: 103_000_000, secretCalls: 524_361, activeCodeUnits: 16_777_216, activeCalls: 32 };
  const enforcement = { runtimeSha256: 'd'.repeat(64), workerSha256: 'e'.repeat(64),
    operations: { request: envelope, response: envelope, tool: envelope, audit: envelope, terminal: envelope },
    relayMilliseconds: 20, brokerMilliseconds: 30 };
  let wall = 1, monotonic = 1, cpu = 0;
  const pool = createUrlRunCpuBudget(1000, () => cpu), held = pool.holdOrdered(390)!;
  const clocks = { now: () => wall, monotonicMilliseconds: () => monotonic, cpuMicroseconds: held.cpuMicroseconds };
  const reserved = reserveOrderedDesignWork({ shape, view: { envelopeBytes: 80, originalBytes: 50 }, enforcement,
    expectedRuntimeSha256: enforcement.runtimeSha256, expectedWorkerSha256: enforcement.workerSha256,
    deadline: 2_000_000, now: 1 }, held.reserveRemainingOnce, clocks)!;
  const budget = createOrderedDesignWorkBudget(reserved.plan, clocks, reserved.start);
  const ticket = budget.begin('tool', 0)!;
  return { budget, ticket, advance: (elapsed: number, measuredCpu: number) => { wall = 1 + elapsed; monotonic = 1 + elapsed; cpu = measuredCpu; } };
}

describe('complete bounded host broker frames', () => {
  it('interoperates with the actual half-closing MCP client and allows a repairable tool refusal', async () => {
    const seen: unknown[] = [];
    const f = await fixture(async value => { seen.push(value); return { ok: false, reason: 'fixture-repairable' }; });
    const invoke = createSessionBrokerInvocation(f.broker.socket);
    expect(await invoke(invocation)).toEqual({ ok: false, reason: 'fixture-repairable' });
    expect(await invoke(invocation)).toEqual({ ok: false, reason: 'fixture-repairable' });
    expect(seen).toEqual([invocation, invocation]); expect(f.faults()).toBe(0);
    expect(fs.statSync(f.broker.socket).mode & 0o777).toBe(0o600);
    expect(await f.broker.close()).toEqual({ pendingInvocations: 0, termination: 'settled' });
    expect(await f.broker.close()).toEqual({ pendingInvocations: 0, termination: 'settled' });
  });

  it('starts no effect at a newline until EOF and refuses an additional frame arriving later', async () => {
    let calls = 0;
    const f = await fixture(async () => { calls++; return { ok: true }; });
    const c = connect(f.broker);
    c.socket.write(JSON.stringify(invocation) + '\n');
    await pause(25); expect(calls).toBe(0);
    c.socket.end('{"extra":"NONSECRET-late-frame"}\n');
    expect(await c.done).toContain('session-broker-unavailable');
    expect(calls).toBe(0); expect(f.faults()).toBeGreaterThan(0);
  });

  it('rejects duplicate keys, invalid UTF-8, missing terminators and oversized frames before invocation', async () => {
    const frames = [Buffer.from('{"path":1,"path":2}\n'), Buffer.from([0xff, 10]), Buffer.from('{"x":1}'), Buffer.alloc(257, 120)];
    for (const frame of frames) {
      let calls = 0;
      const f = await fixture(async () => { calls++; return { ok: true }; }, { maxBytes: 256 });
      const c = connect(f.broker); c.socket.end(frame);
      const result = await c.done;
      expect(result === '' || result === '{"ok":false,"reason":"session-broker-unavailable"}\n').toBe(true);
      expect(calls).toBe(0); expect(f.faults()).toBeGreaterThan(0);
    }
  });

  it('bounds incomplete frames and preserves invocation uncertainty after a deadline', async () => {
    let calls = 0;
    const incomplete = await fixture(async () => { calls++; return {}; }, { milliseconds: 50 });
    const c = connect(incomplete.broker); c.socket.write('{}\n');
    await c.done; expect(calls).toBe(0); expect(incomplete.faults()).toBeGreaterThan(0);

    let settle: ((value: unknown) => void) | undefined;
    const hung = await fixture(() => { calls++; return new Promise(resolve => { settle = resolve; }); }, { milliseconds: 50, invocations: 1 });
    const first = connect(hung.broker); first.socket.end('{}\n'); await first.done;
    const next = connect(hung.broker); next.socket.end('{}\n'); await next.done;
    expect(calls).toBe(1); expect(hung.faults()).toBeGreaterThan(0);
    expect(await hung.broker.close()).toEqual({ pendingInvocations: 1, termination: 'Unknown' });
    settle?.({ ok: true }); await pause(0);
  });

  it('rechecks capacity after simultaneous complete frames and never releases a hung slot on disconnect', async () => {
    let calls = 0;
    let settle: ((value: unknown) => void) | undefined;
    const f = await fixture(() => { calls++; return new Promise(resolve => { settle = resolve; }); }, { invocations: 1 });
    const first = connect(f.broker), second = connect(f.broker);
    first.socket.end('{}\n'); second.socket.end('{}\n');
    await pause(25); expect(calls).toBe(1);
    first.socket.destroy(); second.socket.destroy();
    const third = connect(f.broker); third.socket.end('{}\n'); await third.done;
    expect(calls).toBe(1);
    expect(await f.broker.close()).toEqual({ pendingInvocations: 1, termination: 'Unknown' });
    settle?.({ ok: true }); await pause(0);
  });

  it('bounds reply bytes and suppresses parser, invocation and serialization diagnostics', async () => {
    for (const invoke of [async () => { throw new Error('NONSECRET-PRIVATE-ERROR'); }, async () => ({ text: 'NONSECRET-PRIVATE-ERROR'.repeat(50) })]) {
      const f = await fixture(invoke, { maxBytes: 128 });
      const c = connect(f.broker); c.socket.end('{}\n');
      const result = await c.done;
      expect(result).toBe('{"ok":false,"reason":"session-broker-unavailable"}\n');
      expect(result).not.toContain('NONSECRET-PRIVATE-ERROR'); expect(f.faults()).toBeGreaterThan(0);
    }
  });

  it('revalidates a guarded reply only after bounded encoding and withholds its bytes if the guard refuses', async () => {
    const reply = { ok: true, text: 'Own protected view' };
    for (const [maxBytes, current, expected, checks] of [
      [128, true, reply, 1],
      [128, false, { ok: false, reason: 'session-broker-unavailable' }, 1],
      [16, true, { ok: false, reason: 'session-broker-unavailable' }, 0],
    ] as const) {
      let checked = 0;
      const f = await fixture(async (_input, release) => {
        release(reply, () => {
          checked++;
          if (!current) throw new Error('operation expired');
        });
        return { ok: false, reason: 'already released' };
      }, { maxBytes });
      const client = connect(f.broker); client.socket.end('{}\n');
      expect(JSON.parse(await client.done)).toEqual(expected);
      expect(checked).toBe(checks);
    }
  });

  it.each([
    { elapsed: 0, cpu: 10, reason: null },
    { elapsed: 0, cpu: 11, reason: 'operation-cpu-limit' },
    { elapsed: 29_999, cpu: 0, reason: null },
    { elapsed: 30_000, cpu: 0, reason: 'operation-wall-limit' },
  ] as const)('checks the ordered tool after the final authority guard: $elapsed ms, $cpu CPU', async ({ elapsed, cpu, reason }) => {
    const tool = orderedTool(), order: string[] = [], reply = { ok: true, text: 'NONSECRET-protected-prepared-reply' };
    expect(tool.budget.current()).toBe(true);
    const f = await fixture(async (_input, release) => {
      release(reply, () => {
        order.push('authority');
        // Nothing crosses the cap until this last synchronous authority check.
        expect(tool.budget.current()).toBe(true);
        tool.advance(elapsed, cpu);
      }, () => {
        order.push('tool-budget');
        if (!tool.budget.current()) throw new Error('ordered tool expired');
      });
      // A successfully consumed release cannot write a second reply.
      expect(() => release({ text: 'NONSECRET-second-reply' })).toThrow('session-broker-unavailable');
      return { text: 'NONSECRET-implicit-second-reply' };
    });
    const client = connect(f.broker); client.socket.end('{}\n');
    const wire = await client.done;
    expect(order).toEqual(['authority', 'tool-budget']);
    expect(JSON.parse(wire)).toEqual(reason === null ? reply : { ok: false, reason: 'session-broker-unavailable' });
    expect(tool.budget.snapshot().reason).toBe(reason);
    if (reason !== null) {
      expect(wire).not.toContain(reply.text);
      expect(f.faults()).toBeGreaterThan(0);
    } else {
      expect(f.faults()).toBe(0);
      expect(tool.budget.finish(tool.ticket)).toBe(true);
    }
  });

  it('does not replace authority or encoding refusal with an ordered budget grant', async () => {
    for (const maxBytes of [16, 128]) {
      const order: string[] = [];
      const f = await fixture(async (_input, release) => {
        release({ ok: true, text: 'NONSECRET-protected-prepared-reply' }, () => {
          order.push('authority'); throw new Error('revoked');
        }, () => { order.push('tool-budget'); });
      }, { maxBytes });
      const client = connect(f.broker); client.socket.end('{}\n');
      expect(await client.done).toBe('{"ok":false,"reason":"session-broker-unavailable"}\n');
      expect(order).toEqual(maxBytes === 16 ? [] : ['authority']);
    }
  });

  it('keeps a whole-connection deadline while a peer refuses to read a large response', async () => {
    const f = await fixture(async () => ({ content: 'x'.repeat(1_500_000) }), { milliseconds: 75 });
    const c = connect(f.broker); c.socket.pause(); c.socket.end('{}\n');
    await pause(150); expect(f.faults()).toBeGreaterThan(0);
    c.socket.resume(); await c.done;
    expect(await f.broker.close()).toEqual({ pendingInvocations: 0, termination: 'settled' });
  });

  it('refuses existing endpoints or invalid configuration without replacing existing bytes', async () => {
    const socket = address(); fs.writeFileSync(socket, 'NONSECRET-prior-endpoint');
    await expect(sessionBrokerTestPort(socket, async () => ({}), () => undefined)).rejects.toThrow('session-broker-start-failed');
    expect(fs.readFileSync(socket, 'utf8')).toBe('NONSECRET-prior-endpoint');
    await expect(sessionBrokerTestPort('/NONSECRET-absent-parent/b.sock', async () => ({}), () => undefined)).rejects.toThrow('invalid-session-broker');
    await expect(sessionBrokerTestPort(address(), async () => ({}), () => undefined, { ...SESSION_BROKER_LIMITS, invocations: 0 })).rejects.toThrow('invalid-session-broker');
  });
});
