import { describe, expect, it } from 'vitest';
import { decodeSessionResponse } from './session-response.js';

const MODEL = 'claude-sonnet-4-6';
const USAGE = { inputTokens: 3, outputTokens: 4, cacheCreationInputTokens: 0, cacheReadInputTokens: 0 };
const bytes = (text: string): Uint8Array => new TextEncoder().encode(text);
const excluded = (text: string): boolean => text.includes('SYNTHETIC_SECRET_1907');
const event = (type: string, value: Record<string, unknown>): string => `event: ${type}\ndata: ${JSON.stringify({ type, ...value })}\n\n`;
const start = () => event('message_start', { message: { id: 'msg_fixture1907', type: 'message', role: 'assistant', model: MODEL,
  content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 3, output_tokens: 0,
    cache_creation_input_tokens: 0, cache_read_input_tokens: 0, cache_creation: { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 0 }, service_tier: 'standard' } } });
const blockStart = (content_block: unknown, index = 0) => event('content_block_start', { index, content_block });
const delta = (value: unknown, index = 0) => event('content_block_delta', { index, delta: value });
const stop = (index = 0) => event('content_block_stop', { index });
const end = (stop_reason = 'end_turn') => event('message_delta', { delta: { stop_reason, stop_sequence: null }, usage: { output_tokens: 4 } }) + event('message_stop', {});
const textStream = (parts: readonly string[] = ['Good ', 'answer']) => start() + blockStart({ type: 'text', text: '' })
  + parts.map(text => delta({ type: 'text_delta', text })).join('') + stop() + end();
const decode = (text: string, detector = excluded) => decodeSessionResponse(bytes(text), 'text/event-stream', MODEL, detector);

describe('complete provider response admission', () => {
  it('reconstructs text across deltas and admits bounded usage and ping metadata', () => {
    const stream = textStream().replace(stop(), event('ping', {}) + stop());
    expect(decode(stream)).toEqual({ ok: true, content: [{ type: 'text', text: 'Good answer' }], usage: USAGE, stopReason: 'end_turn' });
    expect(decode(stream.replace(/\n/gu, '\r\n'))).toEqual(decode(stream));
  });
  it('reconstructs split tool JSON before checking decoded strings, without changing numeric keys', () => {
    const tool = (parts: string[]) => start() + blockStart({ type: 'tool_use', id: 'toolu_fixture1907', name: 'mcp__syzygy__artifact_write', input: {} })
      + parts.map(partial_json => delta({ type: 'input_json_delta', partial_json })).join('') + stop() + end('tool_use');
    expect(decode(tool(['{"path":"drafts/next.json",', '"content":"{\\"10\\":true,\\"2\\":false}"}']))).toEqual({ ok: true, usage: USAGE, stopReason: 'tool_use',
      content: [{ type: 'tool_use', id: 'toolu_fixture1907', name: 'mcp__syzygy__artifact_write', input: { path: 'drafts/next.json', content: '{"10":true,"2":false}' } }] });
    expect(decode(tool(['{"content":"SYNTHETIC_', 'SECRET_1907"}']))).toEqual({ ok: false, reason: 'provider-response-refused' });
    expect(decode(tool(['{"path":"x","path":"y"}']))).toEqual({ ok: false, reason: 'provider-response-refused' });
  });
  it('screens reconstructed text and cross-block compositions before returning content', () => {
    expect(decode(textStream(['SYNTHETIC_', 'SECRET_1907']))).toEqual({ ok: false, reason: 'provider-response-refused' });
    const two = start() + blockStart({ type: 'text', text: '' }) + delta({ type: 'text_delta', text: 'SYNTHETIC_' }) + stop()
      + blockStart({ type: 'text', text: '' }, 1) + delta({ type: 'text_delta', text: 'SECRET_1907' }, 1) + stop(1) + end();
    expect(decode(two)).toEqual({ ok: false, reason: 'provider-response-refused' });
    expect(decode(two.replace('SECRET_1907', 'SAFE_1907')).ok).toBe(true);
  });
  it('retains independently parsed latest-context usage including cached input', () => {
    const stream = textStream().replace('"cache_creation_input_tokens":0', '"cache_creation_input_tokens":19')
      .replace('"ephemeral_1h_input_tokens":0', '"ephemeral_1h_input_tokens":19').replace('"cache_read_input_tokens":0', '"cache_read_input_tokens":31');
    expect(decode(stream)).toMatchObject({ ok: true, usage: { inputTokens: 3, outputTokens: 4, cacheCreationInputTokens: 19, cacheReadInputTokens: 31 } });
    expect(decode(stream.replace('"cache_creation_input_tokens":19', '"cache_creation_input_tokens":18')).ok).toBe(false);
    expect(decode(stream.replace('"output_tokens":4', '"output_tokens":9007199254740991')).ok).toBe(false);
  });
  it.each([
    ['truncated transport', (s: string) => s.slice(0, -1)],
    ['missing stop', (s: string) => s.replace(event('message_stop', {}), '')],
    ['trailing event', (s: string) => s + event('ping', {})],
    ['out-of-order block', (s: string) => s.replace('"index":0', '"index":1')],
    ['duplicate start', (s: string) => start() + s],
    ['unknown field', (s: string) => s.replace('"text":"Good "', '"text":"Good ","opaque":"x"')],
    ['event type disagreement', (s: string) => s.replace('event: message_start', 'event: ping')],
    ['model drift', (s: string) => s.replace(MODEL, 'claude-opus-5-5')],
    ['server fallback', (s: string) => s.replace('"type":"text","text":""', '"type":"fallback","model":"x"')],
    ['thinking', (s: string) => s.replace('"type":"text","text":""', '"type":"thinking","thinking":"","signature":"opaque"')],
    ['SSE error', (s: string) => s.replace(stop(), event('error', { error: { type: 'overloaded_error', message: 'busy' } }))],
    ['nonfinite usage', (s: string) => s.replace('"output_tokens":4', '"output_tokens":1e100')],
    ['tool reason without tool', (s: string) => s.replace('"stop_reason":"end_turn"', '"stop_reason":"tool_use"')],
    ['bare CR', (s: string) => s.replace('Good ', 'Good\r ')],
  ])('refuses %s with a safe fixed outcome', (_name, mutate) => {
    expect(decode(mutate(textStream()))).toEqual({ ok: false, reason: 'provider-response-refused' });
  });
  it('accepts the corresponding complete JSON form and refuses opaque or excluded members', () => {
    const full = { id: 'msg_fixture1907', type: 'message', role: 'assistant', model: MODEL,
      content: [{ type: 'text', text: 'Good answer' }], stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 3, output_tokens: 4 } };
    const json = (value: unknown) => decodeSessionResponse(bytes(JSON.stringify(value)), 'application/json; charset=utf-8', MODEL, excluded);
    expect(json(full)).toEqual({ ok: true, content: full.content, usage: USAGE, stopReason: 'end_turn' });
    expect(json({ ...full, signature: 'opaque' })).toEqual({ ok: false, reason: 'provider-response-refused' });
    expect(json({ ...full, content: [{ type: 'thinking', thinking: '', signature: 'opaque' }] })).toEqual({ ok: false, reason: 'provider-response-refused' });
    expect(json({ ...full, content: [{ type: 'text', text: 'SYNTHETIC_SECRET_1907' }] }).ok).toBe(false);
    expect(json({ ...full, content: [] }).ok).toBe(false);
  });
  it('refuses malformed UTF8, duplicate keys, wrong media and failed detectors', () => {
    expect(decodeSessionResponse(new Uint8Array([0xc0, 0xaf]), 'text/event-stream', MODEL, excluded).ok).toBe(false);
    expect(decode(textStream().replace('"index":0', '"index":0,"index":0')).ok).toBe(false);
    expect(decodeSessionResponse(bytes(textStream()), 'text/plain', MODEL, excluded).ok).toBe(false);
    expect(decode(textStream(), () => { throw new Error('NONSECRET detector unavailable'); })).toEqual({ ok: false, reason: 'provider-response-refused' });
  });
  it('bounds the whole body, event census and accumulated decoded-node population', () => {
    expect(decode(' '.repeat(8_388_609)).ok).toBe(false);
    expect(decode(start() + event('ping', {}).repeat(4097) + textStream().slice(start().length)).ok).toBe(false);
    const withInputMembers = (members: number) => start()
      + blockStart({ type: 'tool_use', id: 'toolu_census1907', name: 'mcp__syzygy__source_read', input: {} })
      + delta({ type: 'input_json_delta', partial_json: JSON.stringify(Object.fromEntries(Array.from({ length: members }, (_, i) => [`key${i}`, i]))) })
      + stop() + end('tool_use');
    expect(decode(withInputMembers(20_000)).ok).toBe(false);
    expect(decode(withInputMembers(1000)).ok).toBe(true);
  });
});
