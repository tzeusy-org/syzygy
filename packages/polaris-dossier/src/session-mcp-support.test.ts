import { readFile } from 'node:fs/promises';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { sha256 } from '@syzygy/support';
import type { handleSessionMcpRequest, serveSessionMcp } from './session-mcp.js';

const REQUEST_BYTES = 2_097_152;
const RESPONSE_BYTES = 8_388_608;
const root = new URL('../../../', import.meta.url);
type McpSupport = { handleSessionMcpRequest: typeof handleSessionMcpRequest; serveSessionMcp: typeof serveSessionMcp };
type Compiler = { compileDossierSessionSupport: (read: (name: string) => Promise<Buffer>) => Promise<ReadonlyMap<string, Buffer>> };
const request = (id: string = '') => ({ jsonrpc: '2.0', id, method: 'tools/call', params: { name: 'artifact_read', arguments: { path: 'round-1/design-view-part-1.json' } } });
const line = (value: unknown) => Buffer.from(`${JSON.stringify(value)}\n`);
async function* chunks(...values: Uint8Array[]) { for (const value of values) yield value; }
let compile: Compiler['compileDossierSessionSupport'];
let design: McpSupport;
let ordinary: Buffer;

beforeAll(async () => {
  ({ compileDossierSessionSupport: compile } = await import(new URL('scripts/compile_dossier_session_support.mjs', root).href) as Compiler);
  const support = await compile(name => readFile(new URL(name, root)));
  ordinary = support.get('support/session-mcp.js')!;
  design = await import(`data:text/javascript;base64,${support.get('design-support/session-mcp.js')!.toString('base64')}`) as McpSupport;
});

describe('compiled ordered design MCP ingress', () => {
  it('preserves ordinary support bytes and refuses a compiler input missing each required ingress check', async () => {
    expect(sha256(ordinary)).toBe('7ab492fb6a69e8476049068b5bcf820a95cfcb1a1ea656f34f3c7bdaa6a2fd33');
    const name = 'packages/polaris-dossier/src/session-mcp.ts';
    const source = (await readFile(new URL(name, root))).toString('utf8');
    for (const target of ['boundedJson(request, limits)', 'chunk.byteLength + partial.length > limits.maxBytes', 'decode(bytes.subarray(start, end), limits)']) {
      expect(source.split(target)).toHaveLength(2);
      await expect(compile(async file => file === name ? Buffer.from(source.replace(target, 'undefined')) : readFile(new URL(file, root))))
        .rejects.toThrow(/unrecognized ordered MCP/);
    }
  });

  it('refuses oversized IDs, metadata and raw frames before a broker effect', async () => {
    const invoke = vi.fn(async () => ({ ok: true }));
    const tighter = await design.handleSessionMcpRequest(request('x'.repeat(512)), invoke, { maxBytes: 512 });
    expect(tighter?.id === null).toBe(true);
    expect(tighter?.error).toMatchObject({ code: -32600 });
    for (const value of [request('x'.repeat(REQUEST_BYTES)), { ...request(), params: { ...request().params, _meta: { padding: 'x'.repeat(REQUEST_BYTES) } } }]) {
      const direct = await design.handleSessionMcpRequest(value, invoke);
      expect(direct?.id === null).toBe(true);
      expect(direct?.error).toMatchObject({ code: -32600 });
      const output: string[] = [];
      await design.serveSessionMcp(chunks(line(value)), async text => { output.push(text); }, invoke);
      expect(output).toHaveLength(1);
      const refused = JSON.parse(output[0]!);
      expect(refused.id === null).toBe(true);
      expect(refused.error).toEqual({ code: -32700, message: 'Invalid message framing' });
    }
    const padded = Buffer.concat([line(request()).subarray(0, -1), Buffer.alloc(REQUEST_BYTES, 32), Buffer.from('\n')]);
    const output: string[] = [];
    await design.serveSessionMcp(chunks(padded.subarray(0, REQUEST_BYTES), padded.subarray(REQUEST_BYTES)), async text => { output.push(text); }, invoke);
    expect(output.map(text => JSON.parse(text))).toHaveLength(1);
    expect(JSON.parse(output[0]!)).toMatchObject({ id: null, error: { code: -32700 } });
    expect(invoke).not.toHaveBeenCalled();
  });

  it('declares an inline catalogue allowance covering the complete bounded part reply', async () => {
    const result = await design.handleSessionMcpRequest({ jsonrpc: '2.0', id: 'catalogue', method: 'tools/list' }, async () => ({}));
    expect(result).toMatchObject({ result: { tools: expect.arrayContaining([
      expect.objectContaining({ name: 'artifact_read', _meta: { 'anthropic/maxResultSizeChars': 500_000 } }),
    ]) } });
  });

  it('fits a maximally escaped near-limit echoed ID and a bounded part reply under the response ceiling', async () => {
    const id = '\u0000'.repeat(Math.floor((REQUEST_BYTES - line(request()).length) / 6));
    const frame = line(request(id));
    expect(frame.length).toBeGreaterThan(REQUEST_BYTES - 6);
    expect(frame.length).toBeLessThanOrEqual(REQUEST_BYTES);
    const reply = { kind: 'design-view-part', ok: true, text: '"'.repeat(240_000) };
    expect(Buffer.byteLength(JSON.stringify(reply))).toBeLessThanOrEqual(490_000);
    const invoke = vi.fn(async () => reply);
    const output: string[] = [];
    await design.serveSessionMcp(chunks(frame), async text => { output.push(text); }, invoke);
    expect(invoke).toHaveBeenCalledExactlyOnceWith({ tool: 'artifact_read', input: request().params.arguments });
    expect(output).toHaveLength(1);
    expect(Buffer.byteLength(output[0]!)).toBeGreaterThan(REQUEST_BYTES);
    expect(Buffer.byteLength(output[0]!)).toBeLessThanOrEqual(RESPONSE_BYTES);
    const decoded = JSON.parse(output[0]!);
    expect(decoded.id === id).toBe(true);
    expect(decoded.jsonrpc).toBe('2.0');
    expect(decoded.result).toEqual({ content: [{ type: 'text', text: JSON.stringify(reply) }], isError: false });
  });
});
