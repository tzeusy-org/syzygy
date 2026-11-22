import * as fs from 'node:fs';
import * as http from 'node:http';
import * as net from 'node:net';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { createSessionAuditSegment, decodeSessionCountResponse, readSessionRelayAuditEvidence, sessionRelayTestPort, SESSION_COUNT_TOKENS_PATH, SESSION_RELAY_LIMITS, type SessionAuditEvent,
  type SessionRelay, type SessionRelayPorts, type SessionRelaySubject } from './session-relay.js';

const BODY = '{"messages":[{"role":"user","content":"NONSECRET-admitted"}]}';
const RESPONSE = 'event: message_stop\ndata: {"type":"message_stop"}\n\n';
const SUBJECT: SessionRelaySubject = {
  binding: { run: 'run-fixture', role: 'author', sourceBinding: 'a'.repeat(64), policy: 'b'.repeat(64), provider: 'anthropic', model: 'fixture-model' },
  project: 'repository:fixture', pin: 'c'.repeat(40), principal: 'fixture-operator',
};
const ADMISSION = { digest: createHash('sha256').update(BODY).digest('hex'), bytes: Buffer.byteLength(BODY), originIds: ['prompt-fixture'], classes: ['governance-text'] as const };
const ACCEPTED = { ok: true, observation: { stopReason: 'end_turn', textBlocks: 1, tool: null } } as const;
const close: (() => void | Promise<void>)[] = [];
afterEach(async () => { for (const stop of close.splice(0).reverse()) await stop(); });
function request(relay: SessionRelay, body = BODY, route = '/v1/messages?beta=true'): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const incoming = http.request({ socketPath: relay.socket, path: route, method: 'POST', agent: false,
      headers: { 'content-type': 'application/json', authorization: 'Bearer NONSECRET-fixture', 'content-length': Buffer.byteLength(body) },
    }, response => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode!, body: Buffer.concat(chunks).toString('utf8') }));
      response.on('error', reject);
    });
    incoming.on('error', reject); incoming.end(body);
  });
}
async function fixture(overrides: Partial<SessionRelayPorts> = {}, options: { response?: string; responseType?: string; countResponse?: string; expectedRoute?: string; hang?: boolean; flushed?: boolean; milliseconds?: number; expectedAuthorization?: string; expectedBody?: string; observe?: (server: http.Server) => void } = {}) {
  const calls: string[] = [], audit: SessionAuditEvent[] = [];
  let forwarded = 0;
  const start = sessionRelayTestPort(async input => {
    calls.push('forward'); forwarded++;
    expect(Buffer.from(input.body).toString('utf8')).toBe(options.expectedBody ?? BODY);
    expect(input.headers.authorization).toBe(options.expectedAuthorization ?? 'Bearer NONSECRET-fixture');
    if (options.expectedRoute !== undefined) expect(input.route).toBe(options.expectedRoute);
    if (options.hang) return new Promise(() => undefined);
    if (input.route === SESSION_COUNT_TOKENS_PATH && options.countResponse !== undefined) {
      return { status: 200, contentType: 'application/json', body: Buffer.from(options.countResponse), requestFlushed: true };
    }
    return { status: 200, contentType: options.responseType ?? 'text/event-stream', body: Buffer.from(options.response ?? RESPONSE), requestFlushed: options.flushed ?? true };
  }, options.observe);
  const ports: SessionRelayPorts = {
    current: () => { calls.push('current'); return true; },
    request: bytes => { calls.push('request'); expect(Buffer.from(bytes).toString('utf8')).toBe(BODY); return { ok: true, body: bytes, admission: ADMISSION, consumedToolResults: [] }; },
    providerHeaders: headers => headers,
    response: () => { calls.push('response'); return ACCEPTED; },
    audit: event => { calls.push(`audit:${event.event}`); audit.push(event); }, ...overrides,
  };
  const relay = await start(path.join(tempDir('session-relay-'), 'r.sock'), SUBJECT, ports,
    { ...SESSION_RELAY_LIMITS, ...(options.milliseconds === undefined ? {} : { milliseconds: options.milliseconds }) });
  close.push(() => relay.close());
  return { relay, calls, audit, forwarded: () => forwarded };
}

describe('session relay choke point ordering', () => {
  it('authenticates immutable issued callbacks to their specific relay and snapshots response usage', async () => {
    const mutableUsage = { inputTokens: 11, outputTokens: 12, cacheCreationInputTokens: 0, cacheReadInputTokens: 4 };
    const other = await fixture();
    const callbacks: SessionAuditEvent[] = [];
    const own = await fixture({
      response: () => ({ ...ACCEPTED, usage: mutableUsage }),
      audit: event => { callbacks.push(event); },
    });
    expect((await request(own.relay)).status).toBe(200);
    expect((await request(other.relay)).status).toBe(200);
    expect(callbacks.map(event => event.event)).toEqual(['attempt-allowed', 'send-attempt', 'send-outcome', 'response-admitted']);
    expect(readSessionRelayAuditEvidence(own.relay, callbacks[0]!)).toEqual({ usage: null });
    const response = callbacks.at(-1)!;
    mutableUsage.inputTokens = 999;
    expect(readSessionRelayAuditEvidence(own.relay, response)).toEqual({
      usage: { inputTokens: 11, outputTokens: 12, cacheCreationInputTokens: 0, cacheReadInputTokens: 4 },
    });
    expect(Object.isFrozen(response)).toBe(true);
    expect(Object.isFrozen(response.admission?.classes)).toBe(true);
    expect(readSessionRelayAuditEvidence(own.relay, structuredClone(response))).toBeNull();
    expect(readSessionRelayAuditEvidence({ ...own.relay }, response)).toBeNull();
    expect(readSessionRelayAuditEvidence(other.relay, response)).toBeNull();
    expect(readSessionRelayAuditEvidence(own.relay, other.audit[0]!)).toBeNull();
  });

  it('audits the exact count route and releases a screened estimate without inference usage or tool authorization', async () => {
    const response = '{"input_tokens":123}';
    const seenRoutes: string[] = [];
    const f = await fixture({
      request: (bytes, _context, route) => {
        seenRoutes.push(route);
        return { ok: true, body: bytes, admission: ADMISSION, consumedToolResults: [] };
      },
      providerHeaders: (headers, _context, route) => { seenRoutes.push(route); return headers; },
      response: (bytes, contentType, _context, route) => {
        seenRoutes.push(route);
        return decodeSessionCountResponse(bytes, contentType, () => false);
      },
    }, { response, responseType: 'application/json', expectedRoute: SESSION_COUNT_TOKENS_PATH });
    expect(await request(f.relay, BODY, SESSION_COUNT_TOKENS_PATH)).toEqual({ status: 200, body: response });
    expect(f.forwarded()).toBe(1);
    expect(seenRoutes).toEqual(Array<string>(4).fill('/v1/messages/count_tokens?beta=true'));
    expect(f.audit.map(event => event.event)).toEqual(['attempt-allowed', 'send-attempt', 'send-outcome', 'response-admitted']);
    expect(f.audit.map(event => event.route)).toEqual(seenRoutes);
    const admitted = f.audit.at(-1)!;
    expect(admitted.response).toEqual({ content: 'count-tokens-json', bytes: Buffer.byteLength(response),
      digest: createHash('sha256').update(response).digest('hex'), estimatedInputTokens: 123 });
    expect(readSessionRelayAuditEvidence(f.relay, admitted)).toEqual({ usage: null });
    expect(f.relay.responseFlushed()).toBe(false);
  });

  it('preserves the preceding Messages completion during and after a count exchange', async () => {
    const countResponse = '{"input_tokens":1}';
    const f = await fixture({
      response: (bytes, type, _context, route) => {
        if (route !== SESSION_COUNT_TOKENS_PATH) return ACCEPTED;
        expect(f.relay.responseFlushed()).toBe(true);
        return decodeSessionCountResponse(bytes, type, () => false);
      },
    }, { countResponse });
    expect(await request(f.relay)).toEqual({ status: 200, body: RESPONSE });
    expect(f.relay.responseFlushed()).toBe(true);
    expect(await request(f.relay, BODY, '/v1/messages/count_tokens?beta=true')).toEqual({ status: 200, body: countResponse });
    expect(f.relay.responseFlushed()).toBe(true);
  });

  it.each(['/v1/messages/count_tokens', '/v1/messages/count_tokens?beta=false', '/v1/messages/count_tokens?beta=true&extra=1',
    '/v1/messages/count%5ftokens?beta=true'])('refuses unpinned count route %s before inference admission', async alternateRoute => {
    const alternate = await fixture();
    expect((await request(alternate.relay, BODY, alternateRoute)).status).toBe(400);
    expect(alternate.forwarded()).toBe(0);
    expect(alternate.calls).toEqual(['audit:attempt-refused']);
  });

  it('refuses a Messages-shaped response decision for the exact count route', async () => {
    const wrongResponse = await fixture({}, { response: '{"input_tokens":2}', responseType: 'application/json',
      expectedRoute: SESSION_COUNT_TOKENS_PATH });
    expect((await request(wrongResponse.relay, BODY, SESSION_COUNT_TOKENS_PATH)).status).toBe(502);
    expect(wrongResponse.audit.at(-1)).toMatchObject({ event: 'response-refused', response: null });
  });

  it('accepts only complete bounded UTF-8 token count objects that pass secret screening', () => {
    const decode = (body: string | Uint8Array, type = 'application/json', scan = (_value: string) => false) =>
      decodeSessionCountResponse(typeof body === 'string' ? Buffer.from(body) : body, type, scan);
    expect(decode('{"input_tokens":0}', 'application/json; charset=utf-8')).toEqual({ ok: true, kind: 'token-count', estimatedInputTokens: 0 });
    expect(decode('{"input_tokens":15000000}')).toMatchObject({ ok: true, estimatedInputTokens: 15_000_000 });
    const refused = ['{"input_tokens":15000001}', '{"input_tokens":9007199254740992}', '{"input_tokens":-1}', '{"input_tokens":1.5}',
      '{"input_tokens":1.0000000000000001}', '{"input_tokens":1e0}', '{"input_tokens":"1"}', '{"input_tokens":1,"input_tokens":2}', '{"input_tokens":1,"context_management":null}', '{}',
      '{"input_tokens":1} extra', '{"input_tokens":1}' + ' '.repeat(1024)];
    for (const body of refused) expect(decode(body), body).toEqual({ ok: false });
    expect(decode(Uint8Array.of(0xff))).toEqual({ ok: false });
    expect(decode('{"input_tokens":0}', 'text/event-stream')).toEqual({ ok: false });
    expect(decode('{ "input_tokens": 0 }', 'application/json', text => text === '{"input_tokens":0}')).toEqual({ ok: false });
  });

  it('rejects missing, expanded or nonfinite limits before opening the endpoint', async () => {
    const start = sessionRelayTestPort(async () => { throw new Error('unexpected provider call'); });
    const ports: SessionRelayPorts = { current: () => true, request: () => ({ ok: true, body: Buffer.from(BODY), admission: ADMISSION, consumedToolResults: [] }),
      providerHeaders: headers => headers, response: () => ACCEPTED, audit: () => undefined };
    const { responseBytes: _required, ...missing } = SESSION_RELAY_LIMITS;
    for (const limits of [missing, { ...SESSION_RELAY_LIMITS, milliseconds: Infinity },
      { ...SESSION_RELAY_LIMITS, requestBytes: 2_097_153 }, { ...SESSION_RELAY_LIMITS, unexpected: 1 }]) {
      const socket = path.join(tempDir('relay-invalid-bounds-'), 'r.sock');
      await expect(start(socket, SUBJECT, ports, limits as typeof SESSION_RELAY_LIMITS)).rejects.toThrow('invalid-session-relay-configuration');
      expect(fs.existsSync(socket)).toBe(false);
    }
  });
  it('revalidates bindings and expiring headers after the awaited pre-send audit', async () => {
    let current = true;
    const stale = await fixture({ current: () => current, audit: async event => {
      if (event.event === 'attempt-allowed') { await Promise.resolve(); current = false; }
    } });
    expect((await request(stale.relay)).status).toBe(409); expect(stale.forwarded()).toBe(0);
    expect((await request(stale.relay)).status).toBe(503);
    let credential = true;
    const expired = await fixture({ providerHeaders: headers => credential ? headers : null, audit: async event => {
      if (event.event === 'attempt-allowed') { await Promise.resolve(); credential = false; }
    } });
    expect((await request(expired.relay)).status).toBe(403); expect(expired.forwarded()).toBe(0);
  });

  it('revalidates bindings after the response audit before releasing any admitted body', async () => {
    let current = true;
    const f = await fixture({ current: () => current, audit: async event => {
      if (event.event === 'response-admitted') { await Promise.resolve(); current = false; }
    } });
    const result = await request(f.relay);
    expect(result.status).toBe(409); expect(result.body).not.toContain(RESPONSE); expect(f.forwarded()).toBe(1);
    expect((await request(f.relay)).status).toBe(503);
  });

  it('marks a response flushed only after the post-audit check and complete local write', async () => {
    let checks = 0;
    let waiting!: () => void, release!: () => void;
    const postAudit = new Promise<void>(resolve => { waiting = resolve; });
    const check = new Promise<boolean>(resolve => { release = () => resolve(true); });
    const f = await fixture({ current: () => {
      if (++checks !== 4) return true;
      waiting();
      return check;
    } });
    const response = request(f.relay);
    try {
      await Promise.race([postAudit, response.then(() => { throw new Error('response completed before final check'); })]);
      expect(f.audit.at(-1)?.event).toBe('response-admitted');
      expect(f.relay.responseFlushed()).toBe(false);
    } finally { release(); await response; }
    expect(await response).toEqual({ status: 200, body: RESPONSE });
    expect(f.relay.responseFlushed()).toBe(true);
    await f.relay.close();
    expect(f.relay.responseFlushed()).toBe(false);
  });

  it('refuses a stale binding before committing a returned provider response', async () => {
    let checks = 0, responses = 0;
    const f = await fixture({ current: () => ++checks < 3, response: () => { responses++; return ACCEPTED; } });
    expect((await request(f.relay)).status).toBe(409); expect(f.forwarded()).toBe(1); expect(responses).toBe(0);
    expect(f.audit.some(event => event.event === 'response-admitted')).toBe(false);
  });

  it('keeps the admitted output independent of a callback-held buffer across asynchronous audit', async () => {
    let checked: Uint8Array | undefined;
    const f = await fixture({ response: bytes => { checked = bytes; return ACCEPTED; }, audit: async event => {
      if (event.event === 'response-admitted') { await Promise.resolve(); checked!.fill(120); }
    } });
    expect(await request(f.relay)).toEqual({ status: 200, body: RESPONSE });
  });

  it('destroys host-side queued response buffers by the deadline when the peer stops reading', async () => {
    let hostSocket: net.Socket | undefined, responseAudited = false;
    const f = await fixture({ audit: event => {
      if (event.event === 'response-admitted') responseAudited = true;
    } }, { response: 'x'.repeat(7_000_000), milliseconds: 60, observe: server => { server.once('connection', socket => { hostSocket = socket; }); } });
    // Observe only this fixture's server socket, without a process-global
    // active-handle census or reliance on the paused client's local buffer.
    const client = net.createConnection(f.relay.socket); client.on('error', () => undefined); client.pause();
    close.push(() => { client.destroy(); });
    await new Promise<void>(resolve => client.once('connect', resolve));
    client.write(`POST /v1/messages HTTP/1.1\r\nHost: own-fixture\r\nContent-Type: application/json\r\nAuthorization: Bearer NONSECRET-fixture\r\nContent-Length: ${Buffer.byteLength(BODY)}\r\n\r\n${BODY}`);
    await new Promise(resolve => setTimeout(resolve, 180));
    expect(responseAudited).toBe(true); expect(hostSocket).toBeDefined();
    expect(hostSocket!.destroyed).toBe(true);
    // destroy() runs at the deadline; Node releases its queued write after
    // the native close callback, which can follow this timer under load.
    await expect.poll(() => hostSocket!.closed, { timeout: 1000 }).toBe(true);
    expect(hostSocket!.writableLength).toBe(0);
  });
  it('admits the complete request, persists the attempt, then sends; admits response before release', async () => {
    const f = await fixture();
    expect(await request(f.relay)).toEqual({ status: 200, body: RESPONSE });
    expect(f.calls).toEqual(['current', 'request', 'audit:attempt-allowed', 'current', 'forward', 'audit:send-attempt', 'audit:send-outcome', 'current', 'response', 'audit:response-admitted', 'current']);
    expect(f.forwarded()).toBe(1);
    expect(f.audit.map(event => [event.event, event.outcome, event.credentialIdentity])).toEqual([
      ['attempt-allowed', 'allowed', 'Unknown'], ['send-attempt', 'attempted', 'Unknown'],
      ['send-outcome', 'local-request-flushed', 'Unknown'], ['response-admitted', 'response-admitted', 'Unknown'],
    ]);
    expect(new Set(f.audit.map(event => event.requestId)).size).toBe(1);
    for (const event of f.audit) expect(event).toMatchObject({ admission: ADMISSION, route: 'messages', consumedToolResults: [] });
    expect(f.audit.at(-1)?.response).toEqual({
      digest: createHash('sha256').update(RESPONSE).digest('hex'), bytes: Buffer.byteLength(RESPONSE),
      content: 'messages-event-stream', stopReason: 'end_turn', textBlocks: 1, tool: null,
    });
    expect(JSON.stringify(f.audit)).not.toContain('NONSECRET-fixture');
  });

  it('forwards no rejected request bytes and poisons the session instead of retrying an unadmitted history', async () => {
    const f = await fixture({ request: () => ({ ok: false }) });
    expect((await request(f.relay)).status).toBe(403); expect(f.forwarded()).toBe(0);
    expect(f.audit).toMatchObject([{ event: 'attempt-refused', admission: null }]);
    expect((await request(f.relay)).status).toBe(503); expect(f.forwarded()).toBe(0);
  });

  it('sends nothing when the pre-send audit fails, even after policy admission', async () => {
    const f = await fixture({ audit: () => { throw new Error('NONSECRET-unsafe-diagnostic'); } });
    const result = await request(f.relay);
    expect(result.status).toBe(502); expect(result.body).not.toContain('NONSECRET-unsafe-diagnostic'); expect(f.forwarded()).toBe(0);
  });

  it('requires independent header admission and substitutes host-owned values before forwarding', async () => {
    const denied = await fixture({ providerHeaders: () => null });
    expect((await request(denied.relay)).status).toBe(403); expect(denied.forwarded()).toBe(0);
    const projected = await fixture({ providerHeaders: incoming => {
      expect(incoming.authorization).toBe('Bearer NONSECRET-fixture');
      return { 'content-type': 'application/json', authorization: 'Bearer NONSECRET-host-owned' };
    } }, { expectedAuthorization: 'Bearer NONSECRET-host-owned' });
    expect((await request(projected.relay)).status).toBe(200); expect(projected.forwarded()).toBe(1);
    expect(JSON.stringify(projected.audit)).not.toContain('NONSECRET-host-owned');
    const redirect = await fixture({ providerHeaders: () => ({ authorization: 'Bearer NONSECRET-fixture', host: 'elsewhere.invalid' }) });
    expect((await request(redirect.relay)).status).toBe(403); expect(redirect.forwarded()).toBe(0);
  });

  it('sends only the admitted projected bytes and audits received and sent identities separately', async () => {
    const prepared = '{"messages":[{"role":"user","content":"NONSECRET-host-selected"}]}';
    const admission = { ...ADMISSION, digest: createHash('sha256').update(prepared).digest('hex'), bytes: Buffer.byteLength(prepared) };
    const projected = await fixture({ request: () => ({ ok: true, body: Buffer.from(prepared), admission, consumedToolResults: [] }) }, { expectedBody: prepared });
    expect((await request(projected.relay)).status).toBe(200); expect(projected.forwarded()).toBe(1);
    expect(projected.audit[0]).toMatchObject({ admission, received: { digest: ADMISSION.digest, bytes: ADMISSION.bytes } });
    const mismatch = await fixture({ request: () => ({ ok: true, body: Buffer.from(prepared), admission: ADMISSION, consumedToolResults: [] }) });
    expect((await request(mismatch.relay)).status).toBe(403); expect(mismatch.forwarded()).toBe(0);
  });

  it('refuses stale run binding before the request gate and send', async () => {
    const f = await fixture({ current: () => false });
    expect((await request(f.relay)).status).toBe(409);
    expect(f.calls).toEqual(['audit:attempt-refused']); expect(f.forwarded()).toBe(0);
  });

  it('does not release an unadmitted provider response or treat it as an admitted receipt', async () => {
    const f = await fixture({ response: () => ({ ok: false }) }, { response: 'NONSECRET-excluded-response' });
    const result = await request(f.relay);
    expect(result.status).toBe(502); expect(result.body).not.toContain('NONSECRET-excluded-response'); expect(f.forwarded()).toBe(1);
    expect(f.audit.map(event => event.event)).toEqual(['attempt-allowed', 'send-attempt', 'send-outcome', 'response-refused']);
    expect((await request(f.relay)).status).toBe(503); expect(f.forwarded()).toBe(1);
  });
  it('refuses a supported response when the transport did not confirm the matching request flush', async () => {
    const f = await fixture({}, { flushed: false });
    expect((await request(f.relay)).status).toBe(502);
    expect(f.forwarded()).toBe(1);
    expect(f.audit.map(event => event.event)).toEqual(['attempt-allowed', 'send-attempt', 'transport-failed']);
    expect(f.audit.at(-1)).toMatchObject({ outcome: 'Unknown', response: null });
    expect(f.calls).not.toContain('response');
  });

  it('bounds an upstream without a result and records uncertainty rather than a receipt', async () => {
    const f = await fixture({}, { hang: true, milliseconds: 100 });
    const start = performance.now(); const result = await request(f.relay).catch(() => ({ status: 0, body: '' }));
    expect([0, 504]).toContain(result.status); expect(performance.now() - start).toBeLessThan(3000);
    expect(f.audit.some(event => event.event === 'response-admitted')).toBe(false);
    expect(f.audit.some(event => event.event === 'transport-failed' && event.outcome === 'Unknown')).toBe(true);
  });
});

describe('protected durable safe audit segments', () => {
  const event = (): SessionAuditEvent => ({ event: 'attempt-allowed', subject: SUBJECT, requestId: 'fixture-request', at: '2026-11-18T21:00:00Z',
    credentialIdentity: 'Unknown', exposureMode: 'private-local-cli', governingRule: 'GOVERNANCE-SIMPLIFICATION-D10', admission: ADMISSION,
    received: { digest: ADMISSION.digest, bytes: ADMISSION.bytes }, route: 'messages', consumedToolResults: [], response: null,
    outcome: 'allowed', status: null });
  it('stores only explicit safe fields and links successive fsynced records by their exact predecessor bytes', () => {
    const file = path.join(tempDir('session-audit-'), 'audit-author.jsonl');
    const segment = createSessionAuditSegment(file, () => false); close.push(() => segment.close());
    segment.append({ ...event(), unexpected: 'NONSECRET-unregistered-body' } as SessionAuditEvent);
    segment.append({ ...event(), event: 'response-admitted', outcome: 'response-admitted', status: 200 });
    const text = fs.readFileSync(file, 'utf8'); const lines = text.trimEnd().split('\n');
    expect(text).not.toContain('NONSECRET-unregistered-body'); expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]!)).toMatchObject({ sequence: 1, previousSha256: null });
    expect(JSON.parse(lines[1]!)).toMatchObject({ sequence: 2, previousSha256: createHash('sha256').update(lines[0]!).digest('hex') });
    expect(fs.statSync(file).mode & 0o777).toBe(0o600);
  });

  it('screens metadata before writing and refuses every later append after a failure', () => {
    const file = path.join(tempDir('session-audit-'), 'audit-author.jsonl');
    const segment = createSessionAuditSegment(file, value => value.includes('NONSECRET-EXCLUDED')); close.push(() => segment.close());
    segment.append(event()); const before = fs.readFileSync(file);
    expect(() => segment.append({ ...event(), subject: { ...SUBJECT, principal: 'NONSECRET-EXCLUDED' } })).toThrow('audit-write-failed');
    expect(fs.readFileSync(file)).toEqual(before);
    expect(() => segment.append(event())).toThrow('audit-segment-unavailable');
  });

  it('refuses an existing segment and symbolic alias without altering either target', () => {
    const root = tempDir('session-audit-'); const file = path.join(root, 'audit-existing.jsonl');
    fs.writeFileSync(file, 'NONSECRET-prior-evidence');
    expect(() => createSessionAuditSegment(file, () => false)).toThrow();
    const alias = path.join(root, 'audit-link.jsonl'); fs.symlinkSync(file, alias);
    expect(() => createSessionAuditSegment(alias, () => false)).toThrow();
    expect(fs.readFileSync(file, 'utf8')).toBe('NONSECRET-prior-evidence');
  });
});
