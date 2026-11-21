import { describe, expect, it } from 'vitest';
import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { sha256 } from '@syzygy/support';
import { createSessionController } from './session-controller.js';
import { createSessionProfile, DEFAULT_SESSION_MODEL, sessionProfileReminderText } from './session-profile.js';
import { SESSION_CONTENT_CLASSES, SESSION_POLICY_LIMITS, type SessionContentClass } from './session-egress-policy.js';
import type { SessionToolsReceipt } from './session-tools.js';

const canonical = (value: unknown): string => encodeCanonicalJson(value, SESSION_POLICY_LIMITS);
const encode = (value: unknown): Uint8Array => new TextEncoder().encode(JSON.stringify(value));
const binding = { run: 'own-fixture', role: 'author', sourceBinding: 'a'.repeat(64), policy: 'b'.repeat(64), provider: 'anthropic', model: DEFAULT_SESSION_MODEL };
const input = { path: 'README.md' };
const call = { type: 'tool_use', id: 'toolu_own_1', name: 'mcp__syzygy__source_read', input };
const result = { ok: true, text: 'NONSECRET-own-admitted-span' };
function fixture(classes: readonly SessionContentClass[] = SESSION_CONTENT_CLASSES, issued = call) {
  const compiled = createSessionProfile({ binding, sessionId: '12345678-1234-4234-8234-123456789012', systemPrompt: 'Use the four bounded tools.',
    initialPrompt: 'Read the own fixture.', utcDate: '2026-11-19', kernelRelease: '6.0.0-own' });
  if (!compiled.ok) throw new Error(compiled.code);
  const profile = compiled.value.profile;
  const controller = createSessionController({ profile, declaredClasses: classes, scanSecrets: value => value.includes('SYNTHETIC_SECRET_1907'),
    initialOrigin: { binding, id: 'initial:own', kind: 'initial-prompt', canonicalText: profile.input.initialPrompt,
      classes: ['project-documentation'], originIds: ['source:own'] },
    validateToolInput: (name, value) => name === issued.name && canonical(value) === canonical(issued.input) });
  const { tool_choice: _fixedProjection, ...wire } = profile.baseline;
  const request = (messages: unknown[] = [profile.initialMessage]) => encode({ ...wire,
    metadata: { user_id: JSON.stringify({ device_id: '0'.repeat(64), account_uuid: '', session_id: profile.input.sessionId }) }, messages });
  const response = (content: unknown[] = [issued]) => encode({ id: 'msg_own1', type: 'message', role: 'assistant', model: DEFAULT_SESSION_MODEL,
    content, stop_reason: content.some((b: unknown) => typeof b === 'object' && b !== null && 'type' in b && b.type === 'tool_use') ? 'tool_use' : 'end_turn', stop_sequence: null,
    usage: { input_tokens: 3, output_tokens: 5 } });
  const receipt = (extra: Partial<SessionToolsReceipt> = {}): SessionToolsReceipt => ({ binding, id: 'tool:own1', kind: 'tool-result', toolName: call.name as SessionToolsReceipt['toolName'],
    toolInput: input, canonicalText: canonical(result), digest: sha256(canonical(result)), bytes: Buffer.byteLength(canonical(result)),
    classes: ['project-documentation', 'code-structure'], originIds: ['blob:own1'], ...extra });
  const pending = () => {
    expect(controller.request(request()).ok).toBe(true);
    expect(controller.response(response(), 'application/json').ok).toBe(true);
  };
  return { profile, controller, request, response, receipt, pending };
}

describe('single host cursor across request, response and broker effects', () => {
  it('screens a tool result composed with the admitted call before registering or releasing it', async () => {
    for (const prefix of ['SYNTHETIC_', 'ORDINARY_']) {
      const issued = { ...call, input: { path: prefix } };
      const f = fixture(SESSION_CONTENT_CLASSES, issued); f.pending();
      expect(f.controller.beginTool({ tool: 'source_read', input: issued.input })).toBe(true);
      const reply = { ok: true, text: 'SECRET_1907' }, text = canonical(reply);
      const receipt = f.receipt({ toolInput: issued.input, canonicalText: text, digest: sha256(text), bytes: Buffer.byteLength(text) });
      if (prefix === 'SYNTHETIC_') {
        await expect(f.controller.onReceipt(receipt)).rejects.toThrow('session-receipt-refused');
        expect(f.controller.completeTool(reply)).toBe(false);
        expect(f.controller.beginTool({ tool: 'source_read', input: issued.input })).toBe(false);
      } else {
        await f.controller.onReceipt(receipt); expect(f.controller.completeTool(reply)).toBe(true);
        const messages = [f.profile.historicalInitialMessage, { role: 'assistant', content: [issued] }, { role: 'user', content: [{
          type: 'tool_result', tool_use_id: issued.id, content: [{ type: 'text', text: text + '\n' },
            { type: 'text', text: sessionProfileReminderText(14_999_992) }], cache_control: { type: 'ephemeral', ttl: '1h' } }] }];
        expect(f.controller.request(f.request(messages)).ok).toBe(true);
      }
    }
  });
  it('binds the actual issued call and canonical result/reminder before admitting the next request', async () => {
    const f = fixture(); f.pending();
    expect(f.controller.beginTool({ tool: 'source_read', input })).toBe(true);
    await f.controller.onReceipt(f.receipt()); expect(f.controller.completeTool(result)).toBe(true);
    const messages = [f.profile.historicalInitialMessage, { role: 'assistant', content: [call] }, { role: 'user', content: [{ type: 'tool_result', tool_use_id: call.id,
      content: [{ type: 'text', text: canonical(result) + '\n' }, { type: 'text', text: sessionProfileReminderText(14_999_992) }], cache_control: { type: 'ephemeral', ttl: '1h' } }] }];
    const next = f.controller.request(f.request(messages));
    expect(next.ok).toBe(true); if (!next.ok) return;
    expect(next.admission.originIds).toEqual(expect.arrayContaining(['blob:own1', 'provider-response:1', 'source:own']));
    expect(next.admission.classes).toEqual(expect.arrayContaining(['derived-composites', 'project-documentation', 'code-structure', 'work-history']));
    expect(JSON.parse(Buffer.from(next.body).toString('utf8')).tool_choice).toEqual({ type: 'auto', disable_parallel_tool_use: true });
    expect(f.controller.response(f.response([{ type: 'text', text: 'Own fixture complete.' }]), 'application/json')).toEqual({ ok: true });
  });

  it('starts no unsolicited or altered tool and poisons later admissions rather than resetting', () => {
    for (const altered of [{ tool: 'source_read', input: { path: 'elsewhere.md' } }, { tool: 'artifact_write', input }, { tool: 'source_read', input, role: 'author' }]) {
      const f = fixture(); f.pending();
      expect(f.controller.beginTool(altered)).toBe(false);
      expect(f.controller.beginTool({ tool: 'source_read', input })).toBe(false);
      expect(f.controller.request(f.request())).toEqual({ ok: false });
    }
    const f = fixture(); expect(f.controller.beginTool({ tool: 'source_read', input })).toBe(false);
  });

  it('cannot reuse an issued effect after disconnect, duplicate invocation or unregistered reply', async () => {
    const duplicate = fixture(); duplicate.pending();
    expect(duplicate.controller.beginTool({ tool: 'source_read', input })).toBe(true);
    expect(duplicate.controller.beginTool({ tool: 'source_read', input })).toBe(false);
    await expect(duplicate.controller.onReceipt(duplicate.receipt())).rejects.toThrow('session-receipt-refused');
    const missing = fixture(); missing.pending(); missing.controller.beginTool({ tool: 'source_read', input });
    expect(missing.controller.completeTool(result)).toBe(false);
    expect(missing.controller.beginTool({ tool: 'source_read', input })).toBe(false);
    const changed = fixture(); changed.pending(); changed.controller.beginTool({ tool: 'source_read', input }); await changed.controller.onReceipt(changed.receipt());
    expect(changed.controller.completeTool({ ...result, text: 'NONSECRET-altered' })).toBe(false);
  });

  it('refuses a request racing an executing effect and never rewinds after a transport failure', async () => {
    const f = fixture(); f.pending(); f.controller.beginTool({ tool: 'source_read', input });
    expect(f.controller.request(f.request())).toEqual({ ok: false });
    await expect(f.controller.onReceipt(f.receipt())).rejects.toThrow('session-receipt-refused');
    const failedSend = fixture(); expect(failedSend.controller.request(failedSend.request()).ok).toBe(true);
    failedSend.controller.poison();
    expect(failedSend.controller.response(failedSend.response(), 'application/json')).toEqual({ ok: false });
    expect(failedSend.controller.request(failedSend.request())).toEqual({ ok: false });
  });

  it('discards pending receipt registration if the host stops during a poll', async () => {
    const f = fixture();
    f.pending();
    expect(f.controller.beginTool({ tool: 'source_read', input })).toBe(true);
    const stopped = new Promise<void>(resolve => setImmediate(() => {
      f.controller.poison();
      resolve();
    }));
    const registration = f.controller.onReceipt(f.receipt());
    await Promise.all([stopped, expect(registration).rejects.toThrow('session-receipt-refused')]);
    expect(f.controller.completeTool(result)).toBe(false);
  });

  it('retires the controller cursor when the supplied registration sample fails', async () => {
    const f = fixture();
    f.pending();
    expect(f.controller.beginTool({ tool: 'source_read', input })).toBe(true);
    let checked = false;
    const registration = f.controller.onReceipt(f.receipt(), async () => {
      checked = true;
      throw new Error('resource sample expired');
    });
    await expect(registration).rejects.toThrow('session-receipt-refused');
    expect(checked).toBe(true);
    expect(f.controller.completeTool(result)).toBe(false);
    expect(f.controller.request(f.request()).ok).toBe(false);
  });

  it('refuses receipt binding, class, input, byte identity and composed secret violations before release', async () => {
    const variants: Partial<SessionToolsReceipt>[] = [{ binding: { ...binding, role: 'fidelity' } }, { classes: [] }, { toolInput: { path: 'elsewhere.md' } },
      { digest: 'f'.repeat(64) }, { bytes: 0 }, { canonicalText: canonical({ text: 'SYNTHETIC_SECRET_1907' }), digest: sha256(canonical({ text: 'SYNTHETIC_SECRET_1907' })), bytes: Buffer.byteLength(canonical({ text: 'SYNTHETIC_SECRET_1907' })) }];
    for (const variant of variants) {
      const f = fixture(); f.pending(); f.controller.beginTool({ tool: 'source_read', input });
      await expect(f.controller.onReceipt(f.receipt(variant))).rejects.toThrow('session-receipt-refused');
      expect(f.controller.completeTool(result)).toBe(false);
    }
    const noDerived = fixture(SESSION_CONTENT_CLASSES.filter(value => value !== 'derived-composites'));
    expect(noDerived.controller.request(noDerived.request()).ok).toBe(true);
    expect(noDerived.controller.response(noDerived.response(), 'application/json')).toEqual({ ok: false });
    expect(noDerived.controller.beginTool({ tool: 'source_read', input })).toBe(false);
  });

  it('derives submitted payload origins only from the exact admitted provider call, never a CLI digest claim', () => {
    const payload = '{"NONSECRET":"own-generated-artifact"}';
    const write = { ...call, name: 'mcp__syzygy__artifact_write', input: { path: 'drafts/next.json', content: payload } };
    const f = fixture(SESSION_CONTENT_CLASSES, write); f.pending();
    expect(f.controller.beginTool({ tool: 'artifact_write', input: write.input })).toBe(true);
    expect(f.controller.inputOrigins('artifact_write', write.input, new TextEncoder().encode(payload))).toMatchObject({
      digest: sha256(payload), classes: expect.arrayContaining(['derived-composites', 'project-documentation']),
      originIds: expect.arrayContaining(['source:own', 'provider-response:1']),
    });
    expect(f.controller.inputOrigins('artifact_write', write.input, new TextEncoder().encode('NONSECRET-changed'))).toBeNull();
    expect(f.controller.inputOrigins('artifact_write', write.input, new TextEncoder().encode(payload))).toBeNull();
  });
});
