import * as fs from 'node:fs';
import * as http from 'node:http';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { SESSION_BRIDGE_LIMITS, startSessionBridge, type SessionBridge } from './session-bridge.js';

const cleanup: (() => Promise<void>)[] = [];
afterEach(async () => { for (const close of cleanup.splice(0).reverse()) await close(); });
const BODY = '{"model":"fixture","messages":[]}';
async function setup(handler: http.RequestListener, limits = SESSION_BRIDGE_LIMITS): Promise<SessionBridge> {
  const root = tempDir('session-bridge-');
  const socket = path.join(root, 'r.sock');
  const server = http.createServer(handler);
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(socket, resolve); });
  cleanup.push(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); fs.rmSync(socket, { force: true }); });
  const bridge = await startSessionBridge(socket, limits);
  cleanup.push(() => bridge.close());
  return bridge;
}
function send(bridge: SessionBridge, body = BODY, requestPath = '/v1/messages?beta=true', headers: http.OutgoingHttpHeaders = {}, method = 'POST'):
Promise<{ status: number; body: string; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const request = http.request(`${bridge.baseUrl}${requestPath}`, { method, headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body), ...headers }, agent: false }, response => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode!, body: Buffer.concat(chunks).toString('utf8'), headers: response.headers }));
      response.on('error', reject);
    });
    request.on('error', reject);
    request.end(body);
  });
}

describe('private-role HTTP to fixed Unix transport', () => {
  it('preserves request bytes and supported authentication between processes, stripping routing headers', async () => {
    const received: { path: string | undefined; body: string; auth: boolean; routed: boolean; host: string | undefined }[] = [];
    const bridge = await setup((request, response) => {
      const chunks: Buffer[] = [];
      request.on('data', (chunk: Buffer) => chunks.push(chunk));
      request.on('end', () => {
        received.push({ path: request.url, body: Buffer.concat(chunks).toString('utf8'), auth: request.headers.authorization === 'Bearer NONSECRET-fixture', routed: request.headers['x-forwarded-host'] !== undefined, host: request.headers.host });
        response.writeHead(200, { 'content-type': 'text/event-stream' });
        response.end('event: message_stop\ndata: {"type":"message_stop"}\n\n');
      });
    });
    const result = await send(bridge, BODY, '/v1/messages?beta=true', { authorization: 'Bearer NONSECRET-fixture', host: 'untrusted.invalid', 'x-forwarded-host': 'untrusted.invalid' });
    expect(result.status).toBe(200);
    expect(result.body).toBe('event: message_stop\ndata: {"type":"message_stop"}\n\n');
    expect(received).toEqual([{ path: '/v1/messages?beta=true', body: BODY, auth: true, routed: false, host: 'syzygy-session-relay' }]);
  });

  it('rejects unsupported routes, methods and compressed requests before contacting its Unix destination', async () => {
    let calls = 0;
    const bridge = await setup((_request, response) => { calls++; response.end(); });
    for (const route of ['/v1/messages?beta=false', '/v1/messages/else', '/oauth/refresh', '/https://outside.invalid/v1/messages']) {
      expect((await send(bridge, BODY, route)).status).toBe(400);
    }
    expect((await send(bridge, BODY, '/v1/messages', {}, 'GET')).status).toBe(400);
    expect((await send(bridge, BODY, '/v1/messages', { 'content-encoding': 'gzip' })).status).toBe(415);
    expect((await send(bridge, BODY, '/v1/messages', { 'content-type': 'application/octet-stream' })).status).toBe(415);
    expect(calls).toBe(0);
  });

  it('limits the complete incoming body before any byte reaches the destination', async () => {
    let calls = 0;
    const bridge = await setup((_request, response) => { calls++; response.end(); }, { ...SESSION_BRIDGE_LIMITS, requestBytes: 64 });
    expect((await send(bridge, 'x'.repeat(65))).status).toBe(413);
    expect(calls).toBe(0);
  });

  it('buffers response content so an over-limit partial response is never released to the CLI', async () => {
    const canary = 'NONSECRET-oversized-response';
    const bridge = await setup((_request, response) => {
      response.writeHead(200, { 'content-type': 'text/event-stream' });
      response.write(canary); response.end('x'.repeat(65));
    }, { ...SESSION_BRIDGE_LIMITS, responseBytes: 64 });
    const result = await send(bridge);
    expect(result.status).toBe(502);
    expect(result.body).not.toContain(canary);
  });

  it('refuses a redirect without following its Location or releasing its body', async () => {
    let calls = 0;
    const bridge = await setup((_request, response) => {
      calls++; response.writeHead(307, { location: 'https://outside.invalid/v1/messages', 'content-type': 'application/json' }); response.end('NONSECRET-redirect-body');
    });
    const result = await send(bridge);
    expect(result.status).toBe(502); expect(result.headers.location).toBeUndefined();
    expect(result.body).not.toContain('NONSECRET-redirect-body'); expect(calls).toBe(1);
  });

  it('expires a destination that never returns, without leaking its partial content', async () => {
    const bridge = await setup((_request, response) => { response.writeHead(200, { 'content-type': 'text/event-stream' }); response.write('NONSECRET-partial'); },
      { ...SESSION_BRIDGE_LIMITS, milliseconds: 100 });
    const start = performance.now();
    const result = await send(bridge);
    expect(result.status).toBe(504); expect(result.body).not.toContain('NONSECRET-partial');
    expect(performance.now() - start).toBeLessThan(3000);
  });

  it('refuses non-JSON/SSE or compressed destination responses without releasing their bytes', async () => {
    let variant = 0;
    const bridge = await setup((_request, response) => {
      response.writeHead(200, variant++ === 0 ? { 'content-type': 'text/html' } : { 'content-type': 'application/json', 'content-encoding': 'gzip' });
      response.end('NONSECRET-unsupported-body');
    });
    for (let i = 0; i < 2; i++) {
      const result = await send(bridge);
      expect(result.status).toBe(502); expect(result.body).not.toContain('NONSECRET-unsupported-body');
    }
    expect(variant).toBe(2);
  });
});
