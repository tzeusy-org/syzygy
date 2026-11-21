import { encodeCanonicalJson, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { deepFreeze, isRecord } from '@syzygy/support';

const LIMITS = { maxBytes: 8_388_608, maxNodes: 65_536, maxDepth: 32 };
type RecordValue = Record<string, unknown>;
export interface SessionResponseUsage {
  readonly inputTokens: number; readonly outputTokens: number;
  readonly cacheCreationInputTokens: number; readonly cacheReadInputTokens: number;
}
const STOP_REASONS = ['end_turn', 'tool_use', 'max_tokens', 'stop_sequence'] as const;
export type SessionResponseStopReason = typeof STOP_REASONS[number];
export type SessionResponseResult = { readonly ok: true; readonly content: readonly unknown[]; readonly usage: SessionResponseUsage;
  readonly stopReason: SessionResponseStopReason }
  | { readonly ok: false; readonly reason: 'provider-response-refused' };
function fail(): never { throw new Error('provider-response-refused'); }
function record(value: unknown): RecordValue { if (!isRecord(value)) fail(); return value; }
function keys(value: RecordValue, required: readonly string[], optional: readonly string[] = []): void {
  if (required.some(key => !Object.hasOwn(value, key)) || Object.keys(value).some(key => !required.includes(key) && !optional.includes(key))) fail();
}
function identifier(value: unknown, prefix: string): void {
  if (typeof value !== 'string' || value.length > 256 || !value.startsWith(prefix) || !/^[A-Za-z0-9_-]+$/u.test(value)) fail();
}
function count(value: unknown): void { if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) fail(); }
function usage(value: unknown, initial: boolean): Partial<SessionResponseUsage> {
  const v = record(value);
  keys(v, initial ? ['input_tokens', 'output_tokens'] : ['output_tokens'],
    ['input_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens', 'cache_creation', 'service_tier']);
  for (const [key, member] of Object.entries(v)) {
    if (key === 'cache_creation') {
      const cache = record(member); keys(cache, ['ephemeral_5m_input_tokens', 'ephemeral_1h_input_tokens']);
      for (const n of Object.values(cache)) count(n);
    } else if (key === 'service_tier') { if (member !== 'standard' && member !== 'priority') fail(); }
    else count(member);
  }
  if (v.cache_creation !== undefined && v.cache_creation_input_tokens !== undefined) {
    const cache = record(v.cache_creation);
    if (Number(cache.ephemeral_5m_input_tokens) + Number(cache.ephemeral_1h_input_tokens) !== v.cache_creation_input_tokens) fail();
  }
  return {
    ...(v.input_tokens === undefined ? {} : { inputTokens: v.input_tokens as number }), outputTokens: v.output_tokens as number,
    ...(v.cache_creation_input_tokens === undefined ? {} : { cacheCreationInputTokens: v.cache_creation_input_tokens as number }),
    ...(v.cache_read_input_tokens === undefined ? {} : { cacheReadInputTokens: v.cache_read_input_tokens as number }),
  };
}
function endReason(value: unknown, content: readonly unknown[]): SessionResponseStopReason {
  const reason = STOP_REASONS.find(candidate => candidate === value);
  if (reason === undefined) fail();
  const hasTool = content.some(block => record(block).type === 'tool_use');
  if ((reason === 'tool_use') !== hasTool) fail();
  return reason;
}
function message(value: unknown, model: string, streaming: boolean): RecordValue {
  const v = record(value);
  keys(v, ['id', 'type', 'role', 'model', 'content', 'stop_reason', 'stop_sequence', 'usage']);
  identifier(v.id, 'msg_');
  if (v.type !== 'message' || v.role !== 'assistant' || v.model !== model || !Array.isArray(v.content)) fail();
  usage(v.usage, true);
  if (streaming) { if (v.content.length !== 0 || v.stop_reason !== null || v.stop_sequence !== null) fail(); }
  return v;
}
function block(value: unknown): RecordValue {
  const v = record(value);
  if (v.type === 'text') { keys(v, ['type', 'text']); if (typeof v.text !== 'string') fail(); }
  else if (v.type === 'tool_use') {
    keys(v, ['type', 'id', 'name', 'input']); identifier(v.id, 'toolu_');
    if (typeof v.name !== 'string' || !/^mcp__syzygy__(source_read|artifact_read|artifact_write|dossier_step)$/u.test(v.name) || !isRecord(v.input)) fail();
  } else fail(); // Thinking, signatures, server tools and opaque blocks are excluded.
  return v;
}

/** Complete-buffer decoder for the explicitly supported text/tool-use Messages
 * profile. No partial SSE body is released. Unknown protocol fields/events are
 * refused, even when a general-purpose SDK would ignore them. The caller must
 * still register the reconstructed content against its provenance/history gate.
 */
export function decodeSessionResponse(bytes: Uint8Array, contentType: string, model: string,
  scanSecrets: (text: string) => boolean): SessionResponseResult {
  try {
    if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0 || bytes.byteLength > LIMITS.maxBytes) fail();
    const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
    const decodedStrings: string[] = [];
    let nodes = 0;
    const inspect = (value: unknown, depth = 0): void => {
      if (++nodes > LIMITS.maxNodes || depth > LIMITS.maxDepth) fail();
      if (typeof value === 'string') { if (scanSecrets(value)) fail(); decodedStrings.push(value); }
      else if (Array.isArray(value)) for (const item of value) inspect(item, depth + 1);
      else if (isRecord(value)) for (const [key, member] of Object.entries(value)) { inspect(key, depth + 1); inspect(member, depth + 1); }
    };
    const parse = (body: string): unknown => { const result: unknown = parseBoundedJson(body, LIMITS); inspect(result); return result; };
    if (scanSecrets(text)) fail();
    let content: unknown[];
    let stopReason: SessionResponseStopReason | undefined;
    let counted: Partial<SessionResponseUsage> = {};
    if (/^application\/json(?:\s*;\s*charset=utf-8)?$/iu.test(contentType)) {
      const full = message(parse(text), model, false);
      counted = usage(full.usage, true);
      content = (full.content as unknown[]).map(block);
      if (content.length === 0 || content.length > 64) fail();
      stopReason = endReason(full.stop_reason, content);
      if (full.stop_sequence !== null) fail(); // This profile declares no stop sequences.
    } else if (/^text\/event-stream(?:\s*;\s*charset=utf-8)?$/iu.test(contentType)) {
      if (/\r(?!\n)/u.test(text)) fail();
      const frames = text.replace(/\r\n/gu, '\n').split('\n\n');
      if (frames.pop() !== '' || frames.length > 4096) fail();
      content = [];
      let started = false, finalDelta = false, stopped = false;
      let active: { block: RecordValue; input: string } | null = null;
      for (const frame of frames) {
        if (frame === '') continue;
        const lines = frame.split('\n');
        if (!lines[0]?.startsWith('event: ') || lines.length < 2 || lines.slice(1).some(line => !line.startsWith('data: '))) fail();
        const name = lines[0].slice(7);
        const event = record(parse(lines.slice(1).map(line => line.slice(6)).join('\n')));
        if (event.type !== name || stopped) fail();
        if (name === 'ping') { keys(event, ['type']); continue; }
        if (name === 'message_start') {
          keys(event, ['type', 'message']); if (started) fail();
          const initial = message(event.message, model, true); counted = usage(initial.usage, true); started = true;
        } else {
          if (!started) fail();
          if (name === 'content_block_start') {
            keys(event, ['type', 'index', 'content_block']);
            if (active !== null || finalDelta || event.index !== content.length || content.length >= 64) fail();
            const next = block(event.content_block);
            if (next.type === 'text' ? next.text !== '' : Object.keys(record(next.input)).length !== 0) fail();
            active = { block: { ...next }, input: '' };
          } else if (name === 'content_block_delta') {
            keys(event, ['type', 'index', 'delta']); if (active === null || event.index !== content.length) fail();
            const delta = record(event.delta);
            if (active.block.type === 'text') {
              keys(delta, ['type', 'text']); if (delta.type !== 'text_delta' || typeof delta.text !== 'string') fail();
              active.block.text = String(active.block.text) + delta.text;
            } else {
              keys(delta, ['type', 'partial_json']); if (delta.type !== 'input_json_delta' || typeof delta.partial_json !== 'string') fail();
              active.input += delta.partial_json;
            }
          } else if (name === 'content_block_stop') {
            keys(event, ['type', 'index']); if (active === null || event.index !== content.length) fail();
            if (active.block.type === 'tool_use') active.block.input = record(parse(active.input || '{}'));
            content.push(active.block); active = null;
          } else if (name === 'message_delta') {
            keys(event, ['type', 'delta', 'usage']);
            if (active !== null || finalDelta || content.length === 0) fail();
            const delta = record(event.delta); keys(delta, ['stop_reason', 'stop_sequence']);
            stopReason = endReason(delta.stop_reason, content); if (delta.stop_sequence !== null) fail();
            counted = { ...counted, ...usage(event.usage, false) }; finalDelta = true;
          } else if (name === 'message_stop') {
            keys(event, ['type']); if (!finalDelta || active !== null) fail(); stopped = true;
          } else fail();
        }
      }
      if (!stopped) fail();
    } else fail();
    const encoded = encodeCanonicalJson(content, LIMITS);
    // Inspect reconstructed partial-JSON/text compositions before returning any
    // body. The history gate additionally checks this against earlier messages.
    inspect(content);
    const payload: string[] = [];
    const strings = (v: unknown): void => {
      if (typeof v === 'string') payload.push(v);
      else if (Array.isArray(v)) for (const item of v) strings(item);
      else if (isRecord(v)) for (const item of Object.values(v)) strings(item);
    };
    for (const item of content) { const b = record(item); strings(b.type === 'text' ? b.text : b.input); }
    if (scanSecrets(encoded) || scanSecrets(decodedStrings.join('')) || scanSecrets(payload.join(''))) fail();
    const normalized = { inputTokens: counted.inputTokens!, outputTokens: counted.outputTokens!,
      cacheCreationInputTokens: counted.cacheCreationInputTokens ?? 0, cacheReadInputTokens: counted.cacheReadInputTokens ?? 0 };
    if (stopReason === undefined || !Number.isSafeInteger(Object.values(normalized).reduce((total, value) => total + value, 0))) fail();
    return deepFreeze({ ok: true, content, usage: normalized, stopReason });
  } catch { return { ok: false, reason: 'provider-response-refused' }; }
}
