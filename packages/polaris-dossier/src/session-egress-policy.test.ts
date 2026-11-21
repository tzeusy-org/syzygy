import { describe, expect, it } from 'vitest';
import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { sha256 } from '@syzygy/support';
import {
  createSessionEgressPolicy, registerSessionOrigin, registerSessionResponse, validateSessionRequest, sessionProfileToolReminder,
  SESSION_CONTENT_CLASSES, SESSION_POLICY_LIMITS, SESSION_TOOLS,
  type SessionBinding, type SessionEgressState, type SessionOrigin, type SessionPolicyOptions, type SessionPolicyResult,
} from './session-egress-policy.js';
import { createSessionProfile, DEFAULT_SESSION_MODEL, type SessionProfile, type SessionProfileUsage } from './session-profile.js';
import { URL_DESIGN_VIEW_ENCODING, URL_DESIGN_VIEW_FORMAT } from './url-design-view.js';

const BINDING: SessionBinding = { run: 'synthetic-run', role: 'author', sourceBinding: 'synthetic-pin', policy: 'synthetic-policy', provider: 'anthropic', model: 'claude-sonnet-4-5-20250929' };
const PROMPT = 'Use only the supplied synthetic source tool.';
// Exact nonsecret MCP receipt and wrapper captured by the isolated installed-CLI 2.1.327
// probe D10-F3-CLI-MCP-RESTRICTED-DELIMITED-PROBE.json (two calls, three requests).
const RECEIPT = '{"body":"NONSECRET_MCP_READ_CANARY_1907","format":"synthetic-source/1","origin":{"class":"project-documentation","pin":"NONSECRET_PIN","policy":"NONSECRET_POLICY"},"path":"admitted.txt"}';
const REMINDER = '<system-reminder>\n<total_tokens>14999998 tokens left</total_tokens>\n</system-reminder>';
const INPUT = { path: 'admitted.txt' };
const CALL = { type: 'tool_use', id: 'toolu_mcp_synthetic_1', name: 'mcp__syzygy__source_read', input: INPUT };
const CACHE = { ttl: '1h', type: 'ephemeral' };
const canonical = (value: unknown): string => encodeCanonicalJson(value, SESSION_POLICY_LIMITS);
function good<T>(result: SessionPolicyResult<T>): T {
  expect(result.ok, result.ok ? undefined : result.code).toBe(true);
  if (!result.ok) throw new Error(result.code);
  return result.value;
}
function denied(result: SessionPolicyResult<unknown>, code: string): void {
  expect(result).toEqual({ ok: false, code, reason: expect.any(String) });
}
function receipt(kind: SessionOrigin['kind'], id: string, text: string, extra: Partial<SessionOrigin> = {}): SessionOrigin {
  return { binding: BINDING, kind, id, canonicalText: text, classes: ['project-documentation'], originIds: [`origin:${id}`], ...extra };
}
function options(extra: Partial<SessionPolicyOptions> = {}): SessionPolicyOptions {
  // Observed CLI top-level shape. Scaffolding text, role tool names and schemas are
  // synthetic pinned fixtures; this test makes no live CLI/provider conformance claim.
  const baseline = {
    model: BINDING.model, stream: true, max_tokens: 16000, metadata: { user_id: 'synthetic-user' },
    context_management: { edits: [{ type: 'clear_thinking_20251015', keep: 'all' }] },
    thinking: { type: 'enabled', budget_tokens: 10000, display: 'summarized' },
    system: [{ type: 'text', text: 'Trusted pinned synthetic CLI system.' }, { type: 'text', text: 'Trusted run scaffolding.', cache_control: CACHE }],
    tools: SESSION_TOOLS.map(name => ({ name, description: `Trusted ${name}.`, input_schema: { type: 'object', additionalProperties: false, properties: { path: { type: 'string' } }, required: ['path'] } })),
  };
  return { binding: BINDING, baseline, baselineOrigin: receipt('scaffolding', 'pinned-scaffold', canonical(baseline)),
    declaredClasses: [...SESSION_CONTENT_CLASSES], limits: SESSION_POLICY_LIMITS,
    scanSecrets: text => text.includes('SYNTHETIC_SECRET_1907'),
    validateToolInput: (_name, input) => Object.keys(input).length === 1 && input.path === 'admitted.txt', ...extra };
}
function initial(config = options()): { state: SessionEgressState; messages: unknown[]; config: SessionPolicyOptions } {
  let state = good(createSessionEgressPolicy(config)).state;
  state = good(registerSessionOrigin(state, receipt('initial-prompt', 'initial-prompt', PROMPT, { binding: config.binding }))).state;
  return { state, messages: [{ role: 'user', content: [{ type: 'text', text: PROMPT }] }], config };
}
function send(state: SessionEgressState, messages: unknown[], config = options()) {
  return validateSessionRequest(state, new TextEncoder().encode(JSON.stringify({ ...config.baseline, messages })));
}
function pendingTool(config = options()) {
  const start = initial(config);
  const request = good(send(start.state, start.messages, config));
  const response = good(registerSessionResponse(request.state, BINDING, [CALL]));
  return { ...start, state: response.state, messages: [...start.messages, { role: 'assistant', content: [CALL] }] };
}
function withToolReceipts(state: SessionEgressState): SessionEgressState {
  state = good(registerSessionOrigin(state, receipt('reminder', 'budget-reminder-1', REMINDER, { toolUseId: CALL.id }))).state;
  return good(registerSessionOrigin(state, receipt('tool-result', 'broker-reply-1', RECEIPT, { toolUseId: CALL.id, toolName: 'mcp__syzygy__source_read', toolInput: INPUT, classes: ['code-content', 'project-documentation'] }))).state;
}
function toolResult(cache = true): Record<string, unknown> {
  return { type: 'tool_result', tool_use_id: CALL.id, content: [{ type: 'text', text: `${RECEIPT}\n` }, { type: 'text', text: REMINDER }], ...(cache ? { cache_control: CACHE } : {}) };
}

function designToolFixture(extra: Partial<SessionPolicyOptions> = {}, replyBody = 'OWN <RAW EDGE>', file = 'round-1/design-view.json') {
  const binding = { ...BINDING, role: 'design' };
  const base = options();
  const input = { path: file };
  const config = options({ binding, baselineOrigin: { ...base.baselineOrigin, binding },
    scanDesignView: text => text.includes('<RAW EDGE>'),
    validateToolInput: (name, value) => name === 'mcp__syzygy__artifact_read' && value.path === input.path, ...extra });
  const start = initial(config);
  const call = { type: 'tool_use', id: 'own-design-call', name: 'mcp__syzygy__artifact_read', input } as const;
  const sent = good(send(start.state, start.messages, config));
  const response = good(registerSessionResponse(sent.state, config.binding, [call]));
  // The egress fixture supplies synthetic host-registered text. The renderer
  // and the independent producer receipt are exercised by their own suites.
  const original = JSON.stringify({ format: 'polaris-dossier-design-packet/1', kind: 'design', runId: binding.run, sample: replyBody });
  const escapes: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const payload = original.replace(/[&<>"']/gu, char => escapes[char]!);
  const envelope = { format: URL_DESIGN_VIEW_FORMAT, encoding: URL_DESIGN_VIEW_ENCODING, originalBytes: Buffer.byteLength(original),
    originalSha256: sha256(original), payload, payloadBytes: Buffer.byteLength(payload), payloadSha256: sha256(payload) };
  const wrapper = (text: string) => canonical({ ok: true, kind: 'artifact', path: input.path, text, sha256: sha256(text) });
  const reply = (value = canonical(envelope)) => receipt('tool-result', 'own-design-reply', wrapper(value),
    { binding: config.binding, toolUseId: call.id, toolName: call.name, toolInput: call.input });
  const reminder = receipt('reminder', 'own-design-reminder', REMINDER, { binding: config.binding, toolUseId: call.id });
  const messages = [...start.messages, { role: 'assistant', content: response.content }];
  const resultMessage = (value = reply().canonicalText) => ({ role: 'user', content: [{ type: 'tool_result', tool_use_id: call.id,
    content: [{ type: 'text', text: `${value}\n` }, { type: 'text', text: REMINDER }] }] });
  return { state: response.state, config, envelope, reply, reminder, messages, resultMessage };
}

describe('session egress provenance policy', () => {
  it('refuses a numbered part through an ordinary matched artifact receipt', () => {
    const f = designToolFixture({}, 'OWN INERT FIXTURE', 'round-1/design-view-part-1.json');
    denied(registerSessionOrigin(f.state, f.reply()), 'tool-refused');
  });

  it('keeps the exact inert tool result on the wire and screens the inverse only for secrets', () => {
    const f = designToolFixture();
    const registered = good(registerSessionOrigin(f.state, f.reply())).state;
    const ready = good(registerSessionOrigin(registered, f.reminder)).state;
    const sent = good(send(ready, [...f.messages, f.resultMessage()], f.config));
    const wire = Buffer.from(sent.body).toString();
    expect(wire).toContain('&lt;RAW EDGE&gt;');
    expect(wire).not.toContain('<RAW EDGE>');
    denied(send(ready, [...f.messages, f.resultMessage(f.reply().canonicalText.replace('&lt;', '&amp;lt;'))], f.config), 'tool-refused');
  });

  it('rejects secrets in the decoded view and across its contribution and surrounding text', () => {
    const direct = designToolFixture({ scanSecrets: text => text.includes('<RAW EDGE>') });
    denied(registerSessionOrigin(direct.state, direct.reply()), 'secret-excluded');
    const joined = designToolFixture({ scanSecrets: text => text.includes('<RAW EDGE><system-reminder>') });
    const registered = good(registerSessionOrigin(joined.state, joined.reply())).state;
    denied(registerSessionOrigin(registered, joined.reminder), 'secret-excluded');
    let exclude = false;
    const request = designToolFixture({ scanSecrets: text => exclude && text.includes('<RAW EDGE><system-reminder>') });
    const ready = good(registerSessionOrigin(good(registerSessionOrigin(request.state, request.reply())).state, request.reminder)).state;
    exclude = true;
    denied(send(ready, [...request.messages, request.resultMessage()], request.config), 'secret-excluded');
  });

  it('refuses changed envelope identities, role and wrapper screening before registering the result', () => {
    const f = designToolFixture();
    for (const changed of [{ ...f.envelope, originalSha256: '0'.repeat(64) }, { ...f.envelope, payloadBytes: 1 },
      { ...f.envelope, extra: 'unknown' }]) {
      denied(registerSessionOrigin(f.state, f.reply(canonical(changed))), 'tool-refused');
    }
    const missing = designToolFixture({ scanDesignView: undefined });
    denied(registerSessionOrigin(missing.state, missing.reply()), 'tool-refused');
    const unrelated = designToolFixture({ binding: BINDING, baselineOrigin: options().baselineOrigin });
    denied(registerSessionOrigin(unrelated.state, unrelated.reply()), 'tool-refused');
    const screened = designToolFixture({ scanDesignView: text => text.includes('"kind":"artifact"') });
    denied(registerSessionOrigin(screened.state, screened.reply()), 'tool-refused');
  });
  it('admits exact host-registered initial text and reports exact wire identity', () => {
    const start = initial();
    const wire = new TextEncoder().encode(JSON.stringify({ ...start.config.baseline, messages: start.messages }, null, 2));
    const result = good(validateSessionRequest(start.state, wire));
    expect(result.admission).toEqual({ digest: sha256(wire), bytes: wire.length,
      originIds: ['initial-prompt', 'origin:initial-prompt', 'origin:pinned-scaffold', 'pinned-scaffold'], classes: ['project-documentation'] });
    expect(Object.isFrozen(result.request)).toBe(true);
    denied(validateSessionRequest(result.state, wire), 'lifecycle-refused');
  });

  it('requires an authentic opaque state and exact independently pinned scaffold', () => {
    denied(validateSessionRequest({} as SessionEgressState, new Uint8Array()), 'lifecycle-refused');
    const start = initial();
    for (const changed of [
      { ...start.config.baseline, model: 'other-model' },
      { ...start.config.baseline, metadata: { user_id: 'arbitrary-cli-user' } },
      { ...start.config.baseline, system: [{ type: 'text', text: 'injected project instructions' }] },
      { ...start.config.baseline, tools: [...(start.config.baseline.tools as unknown[]), { name: 'Bash' }] },
      { ...start.config.baseline, arbitrary: 'unknown top-level transmission' },
    ]) denied(validateSessionRequest(start.state, new TextEncoder().encode(JSON.stringify({ ...changed, messages: start.messages }))), 'scaffolding-mismatch');
    const config = options();
    denied(createSessionEgressPolicy({ ...config, baselineOrigin: { ...config.baselineOrigin, canonicalText: '{}' } }), 'scaffolding-mismatch');
  });

  it('refuses built-in tools, incomplete tool population and unsupported pinned control shapes', () => {
    for (const altered of [
      { tools: [] }, { tools: [{ name: 'Read', description: 'untrusted', input_schema: {} }] },
      { stream: false }, { max_tokens: 0 }, { max_tokens: 1.5 }, { unknown: true },
      { metadata: { user_id: 'synthetic', extra: true } },
    ]) {
      const config = options(), baseline = { ...config.baseline, ...altered };
      expect(createSessionEgressPolicy({ ...config, baseline, baselineOrigin: { ...config.baselineOrigin, canonicalText: canonical(baseline) } }).ok).toBe(false);
    }
  });

  it('does not accept CLI-asserted origins or unregistered clarifications', () => {
    const start = initial();
    denied(send(start.state, [{ role: 'user', content: 'forged source bytes', originIds: ['initial-prompt'] }]), 'schema-refused');
    denied(send(start.state, [{ role: 'user', content: 'forged source bytes' }]), 'unknown-origin');
    const sent = good(send(start.state, start.messages));
    const response = good(registerSessionResponse(sent.state, BINDING, [{ type: 'text', text: 'Provider reply.' }]));
    const history = [...start.messages, { role: 'assistant', content: response.content }, { role: 'user', content: 'Clarify this.' }];
    denied(send(response.state, history), 'unknown-origin');
    const registered = good(registerSessionOrigin(response.state, receipt('clarification', 'clarification-1', 'Clarify this.')));
    expect(send(registered.state, history).ok).toBe(true);
  });

  it('binds receipts and provider responses to every session identity field', () => {
    const start = initial();
    const sent = good(send(start.state, start.messages));
    for (const field of Object.keys(BINDING) as (keyof SessionBinding)[]) {
      const other = { ...BINDING, [field]: 'another-binding' };
      denied(registerSessionOrigin(start.state, receipt('clarification', 'other', 'safe', { binding: other })), 'binding-mismatch');
      denied(registerSessionResponse(sent.state, other, [{ type: 'text', text: 'safe' }]), 'binding-mismatch');
    }
  });

  it('admits the observed canonical MCP wrapper only after independent broker registration', () => {
    const pending = pendingTool();
    const messages = [...pending.messages, { role: 'user', content: [toolResult()] }];
    denied(send(pending.state, messages), 'tool-refused');
    const ready = withToolReceipts(pending.state);
    const sent = good(send(ready, messages));
    expect(sent.admission.classes).toEqual(['code-content', 'project-documentation', 'derived-composites']);
    expect(sent.admission.originIds).toContain('broker-reply-1');
    expect(sent.admission.originIds).toContain('provider-response:1');
    expect(sha256(RECEIPT)).toBe('5a9ff688947c63d692c5e98ed916d3cc6616176fe46779e99db53311d69bf1b8');
    expect(sha256(`${RECEIPT}\n`)).toBe('9bd7adf5de53125a8d5cbde652ec6d95e4582e0ef0e5e80e9c6e9f13550f6f58');
  });

  it('permits only the observed result cache marker to appear or disappear in history', () => {
    const pending = pendingTool(), ready = withToolReceipts(pending.state);
    const resultMessage = { role: 'user', content: [toolResult()] };
    const sent = good(send(ready, [...pending.messages, resultMessage]));
    const response = good(registerSessionResponse(sent.state, BINDING, [{ type: 'text', text: 'Finished.' }]));
    const registered = good(registerSessionOrigin(response.state, receipt('clarification', 'clarification-2', 'Continue.')));
    const next = [...pending.messages, { role: 'user', content: [toolResult(false)] }, { role: 'assistant', content: response.content }, { role: 'user', content: 'Continue.' }];
    expect(send(registered.state, next).ok).toBe(true);
    const changed = JSON.parse(JSON.stringify(next)) as Record<string, unknown>[];
    (changed[2]!.content as Record<string, unknown>[])[0]!.cache_control = { type: 'ephemeral', ttl: '5m' };
    denied(send(registered.state, changed), 'schema-refused');
  });

  it('refuses stale, mutated, augmented and differently wrapped tool result content', () => {
    const pending = pendingTool(), ready = withToolReceipts(pending.state);
    const variants = [
      { ...toolResult(), tool_use_id: 'stale-tool-id' },
      { ...toolResult(), is_error: false },
      { ...toolResult(), content: RECEIPT },
      { ...toolResult(), content: [{ type: 'text', text: RECEIPT }, { type: 'text', text: REMINDER }] },
      { ...toolResult(), content: [{ type: 'text', text: `${RECEIPT}\n\n` }, { type: 'text', text: REMINDER }] },
      { ...toolResult(), content: [{ type: 'text', text: `${RECEIPT.replace('1907', '1908')}\n` }, { type: 'text', text: REMINDER }] },
      { ...toolResult(), content: [{ type: 'text', text: `${RECEIPT}\n` }, { type: 'text', text: REMINDER.replace('14999998', '14999997') }] },
      { ...toolResult(), content: [{ type: 'text', text: `${RECEIPT}\n` }, { type: 'text', text: REMINDER }, { type: 'text', text: 'extra' }] },
    ];
    for (const changed of variants) expect(send(ready, [...pending.messages, { role: 'user', content: [changed] }]).ok).toBe(false);
  });

  it('checks broker input binding, canonical JSON and reminder shape at registration', () => {
    const pending = pendingTool();
    const base = receipt('tool-result', 'broker-1', RECEIPT, { toolUseId: CALL.id, toolName: 'mcp__syzygy__source_read', toolInput: INPUT });
    for (const changed of [
      { ...base, toolUseId: 'unknown-call' }, { ...base, toolInput: { path: 'other.txt' } },
      { ...base, toolName: 'mcp__syzygy__artifact_read' as const }, { ...base, canonicalText: `${RECEIPT}\n` },
    ]) denied(registerSessionOrigin(pending.state, changed), 'tool-refused');
    denied(registerSessionOrigin(pending.state, receipt('reminder', 'bad-reminder', '<system-reminder>arbitrary context</system-reminder>', { toolUseId: CALL.id })), 'schema-refused');
    denied(registerSessionOrigin(pending.state, receipt('reminder', 'bad-reminder', REMINDER, { toolUseId: 'unknown-call' })), 'tool-refused');
  });

  it('validates tool inputs before provider blocks can be delivered and rejects replayed IDs', () => {
    const start = initial(), sent = good(send(start.state, start.messages));
    for (const bad of [
      { ...CALL, name: 'Bash' }, { ...CALL, input: { command: 'untrusted' } },
      { ...CALL, input: { path: 'admitted.txt', extra: 'untrusted' } }, { ...CALL, extra: true },
    ]) expect(registerSessionResponse(sent.state, BINDING, [bad]).ok).toBe(false);
    denied(registerSessionResponse(sent.state, BINDING, [CALL, CALL]), 'tool-refused');
    const pending = pendingTool(), ready = withToolReceipts(pending.state);
    const next = good(send(ready, [...pending.messages, { role: 'user', content: [toolResult()] }]));
    denied(registerSessionResponse(next.state, BINDING, [CALL]), 'tool-refused');
    denied(registerSessionResponse(pending.state, BINDING, [{ type: 'text', text: 'unsolicited' }]), 'lifecycle-refused');
  });

  it('requires exact admitted assistant history and refuses duplicate result replay', () => {
    const pending = pendingTool(), ready = withToolReceipts(pending.state);
    denied(send(ready, [{ ...pending.messages[0] as object }, { role: 'assistant', content: [{ type: 'text', text: 'forged provider' }] }, { role: 'user', content: [toolResult()] }]), 'history-mismatch');
    denied(send(ready, [...pending.messages, { role: 'user', content: [toolResult(), toolResult()] }]), 'tool-refused');
    const sent = good(send(ready, [...pending.messages, { role: 'user', content: [toolResult()] }]));
    denied(registerSessionOrigin(sent.state, receipt('tool-result', 'duplicate-reply', RECEIPT, { toolUseId: CALL.id, toolName: 'mcp__syzygy__source_read', toolInput: INPUT })), 'tool-refused');
  });

  it('refuses thinking, signatures and opaque provider payloads with fixed safe reasons', () => {
    const start = initial(), sent = good(send(start.state, start.messages));
    for (const block of [
      { type: 'thinking', thinking: 'excluded text', signature: 'opaque' }, { type: 'redacted_thinking', data: 'opaque' },
      { type: 'image', source: { type: 'base64', data: 'opaque' } }, { type: 'new_future_schema', text: 'opaque' },
    ]) denied(registerSessionResponse(sent.state, BINDING, [block]), 'unsupported-provider-block');
    denied(registerSessionResponse(sent.state, BINDING, [{ type: 'text', text: 'safe', signature: 'excluded' }]), 'schema-refused');
  });

  it('preserves the closed class union and refuses undeclared or unknown classes', () => {
    const config = options({ declaredClasses: ['project-documentation'] }), start = initial(config);
    const sent = good(send(start.state, start.messages, config));
    denied(registerSessionResponse(sent.state, BINDING, [{ type: 'text', text: 'Derived reply' }]), 'class-not-declared');
    denied(registerSessionOrigin(start.state, receipt('clarification', 'class-forgery', 'safe', { classes: ['invented-highest'] as never })), 'unknown-class');
    denied(registerSessionOrigin(start.state, receipt('clarification', 'empty-class', 'safe', { classes: [] })), 'unknown-class');
    denied(registerSessionOrigin(start.state, receipt('clarification', 'undeclared-class', 'safe', { classes: ['code-content'] })), 'class-not-declared');
  });

  it('screens receipts, complete provider blocks and split decoded semantic fields', () => {
    const start = initial(), sent = good(send(start.state, start.messages));
    denied(registerSessionOrigin(start.state, receipt('clarification', 'secret', 'SYNTHETIC_SECRET_1907')), 'secret-excluded');
    denied(registerSessionResponse(sent.state, BINDING, [{ type: 'text', text: 'SYNTHETIC_SECRET_1907' }]), 'secret-excluded');
    const split = [{ type: 'text', text: 'SYNTHETIC_' }, { type: 'text', text: 'SECRET_1907' }];
    denied(registerSessionResponse(sent.state, BINDING, split), 'secret-excluded');
    // Negative control: neither separated field matches the declared exact detector.
    expect(start.config.scanSecrets('SYNTHETIC_')).toBe(false);
    expect(start.config.scanSecrets('SECRET_1907')).toBe(false);
    const pending = pendingTool();
    const hidden = canonical({ a: 'SYNTHETIC_', b: 'SECRET_1907' });
    denied(registerSessionOrigin(pending.state, receipt('tool-result', 'split-reply', hidden, { toolUseId: CALL.id, toolName: 'mcp__syzygy__source_read', toolInput: INPUT })), 'secret-excluded');
  });

  it('rescans an otherwise admitted full outgoing request and never includes rejected content in errors', () => {
    let enabled = false;
    const config = options({ scanSecrets: text => enabled && text.includes(PROMPT) });
    const start = initial(config);
    enabled = true;
    const result = send(start.state, start.messages, config);
    denied(result, 'secret-excluded');
    expect(JSON.stringify(result)).not.toContain(PROMPT);
    const throwing = options({ scanSecrets: () => { throw new Error('PRIVATE_DETECTOR_DETAILS'); } });
    const failure = createSessionEgressPolicy(throwing);
    denied(failure, 'detector-failed');
    expect(JSON.stringify(failure)).not.toContain('PRIVATE_DETECTOR_DETAILS');
  });

  it('refuses a secret assembled only across registered history and a new clarification', () => {
    const config = options();
    let state = good(createSessionEgressPolicy(config)).state;
    state = good(registerSessionOrigin(state, receipt('initial-prompt', 'split-initial', 'SYNTHETIC_'))).state;
    const first = [{ role: 'user', content: [{ type: 'text', text: 'SYNTHETIC_' }] }];
    state = good(send(state, first, config)).state;
    const response = good(registerSessionResponse(state, BINDING, [{ type: 'text', text: '' }]));
    state = good(registerSessionOrigin(response.state, receipt('clarification', 'split-clarification', 'SECRET_1907'))).state;
    denied(send(state, [...first, { role: 'assistant', content: response.content }, { role: 'user', content: [{ type: 'text', text: 'SECRET_1907' }] }], config), 'secret-excluded');
  });

  it('screens composed incoming history before returning or registering a provider response', () => {
    const config = options();
    for (const [prompt, expected] of [['SYNTHETIC_', 'secret-excluded'], ['Ordinary prompt', 'admitted']] as const) {
      let state = good(createSessionEgressPolicy(config)).state;
      state = good(registerSessionOrigin(state, receipt('initial-prompt', 'incoming-initial', prompt))).state;
      state = good(send(state, [{ role: 'user', content: [{ type: 'text', text: prompt }] }], config)).state;
      const incoming = registerSessionResponse(state, BINDING, [{ type: 'text', text: 'SECRET_1907' }]);
      if (expected === 'admitted') expect(good(incoming).content).toEqual([{ type: 'text', text: 'SECRET_1907' }]);
      else {
        denied(incoming, 'secret-excluded');
        expect(incoming).not.toHaveProperty('value');
        expect(JSON.stringify(incoming)).not.toContain('SECRET_1907');
      }
    }
  });

  it('rejects malformed UTF8, duplicate escaped keys, dangerous keys and resource excess', () => {
    const start = initial();
    const malformed = [new Uint8Array([0xff]), new TextEncoder().encode('{"messages":[],"model":"a","mo\\u0064el":"b"}'),
      new TextEncoder().encode('{"__proto__":{}}'), new TextEncoder().encode('\ufeff{}'), new Uint8Array(SESSION_POLICY_LIMITS.maxBytes + 1)];
    for (const wire of malformed) denied(validateSessionRequest(start.state, wire), 'invalid-input');
    const config = options({ limits: { ...SESSION_POLICY_LIMITS, maxReceipts: 2 } });
    const full = initial(config);
    denied(registerSessionOrigin(full.state, receipt('clarification', 'over-capacity', 'safe')), 'capacity-exhausted');
    denied(createSessionEgressPolicy(options({ limits: { ...SESSION_POLICY_LIMITS, maxHistoryMessages: 0 } })), 'invalid-config');
  });

  it('bounds retained history, aggregate state bytes and cumulative issued tool calls', () => {
    const smallHistory = options({ limits: { ...SESSION_POLICY_LIMITS, maxHistoryMessages: 1 } });
    const start = initial(smallHistory), sent = good(send(start.state, start.messages, smallHistory));
    denied(registerSessionResponse(sent.state, BINDING, [{ type: 'text', text: 'safe' }]), 'capacity-exhausted');
    denied(createSessionEgressPolicy(options({ limits: { ...SESSION_POLICY_LIMITS, maxStoredBytes: 1 } })), 'capacity-exhausted');
    const limited = options({ limits: { ...SESSION_POLICY_LIMITS, maxToolCalls: 1 } });
    const pending = pendingTool(limited), ready = withToolReceipts(pending.state);
    const next = good(send(ready, [...pending.messages, { role: 'user', content: [toolResult()] }], limited));
    denied(registerSessionResponse(next.state, BINDING, [{ ...CALL, id: 'toolu_mcp_synthetic_2' }]), 'capacity-exhausted');
  });

  it('copies trusted inputs so later host mutations cannot change an issued snapshot', () => {
    const config = options();
    const state = good(createSessionEgressPolicy(config)).state;
    (config.baseline.metadata as { user_id: string }).user_id = 'mutated-after-registration';
    const registered = good(registerSessionOrigin(state, receipt('initial-prompt', 'initial', PROMPT)));
    const original = options();
    expect(send(registered.state, [{ role: 'user', content: PROMPT }], original).ok).toBe(true);
    denied(send(registered.state, [{ role: 'user', content: PROMPT }], config), 'scaffolding-mismatch');
  });
});

const PROFILE_BINDING: SessionBinding = { ...BINDING, model: DEFAULT_SESSION_MODEL };
function profileStart(extra: Partial<SessionPolicyOptions> = {}, prompt = 'NONSECRET_FIXED_SYZYGY_INITIAL_1907') {
  const compiled = createSessionProfile({ binding: PROFILE_BINDING, sessionId: '00000000-0000-4000-8000-000000001907',
    systemPrompt: 'NONSECRET_FIXED_SYZYGY_SYSTEM_1907', initialPrompt: prompt, utcDate: '2026-11-18', kernelRelease: '7.0.0-43-generic' });
  if (!compiled.ok) throw new Error(compiled.code);
  const profile = compiled.value.profile;
  const config = options({ binding: PROFILE_BINDING, baseline: profile.baseline, baselineOrigin: profile.baselineOrigin, profile, ...extra });
  let state = good(createSessionEgressPolicy(config)).state;
  state = good(registerSessionOrigin(state, receipt('initial-prompt', 'profile-prompt', prompt, { binding: PROFILE_BINDING, classes: ['code-content', 'project-documentation'], originIds: ['classified-prompt-source'] }))).state;
  return { state, config, profile, messages: [profile.initialMessage] as unknown[] };
}
function profileWire(profile: SessionProfile, messages: unknown[], changes: Record<string, unknown> = {}): Uint8Array {
  const { tool_choice: hostControl, ...capturedControl } = profile.baseline;
  void hostControl;
  return new TextEncoder().encode(JSON.stringify({ ...capturedControl, metadata: { user_id: JSON.stringify({ device_id: 'd'.repeat(64), account_uuid: '', session_id: profile.input.sessionId }) }, messages, ...changes }));
}
function profileReceipts(state: SessionEgressState, call = CALL): { state: SessionEgressState; block: unknown } {
  const reminder = good(sessionProfileToolReminder(state, call.id));
  state = good(registerSessionOrigin(state, receipt('reminder', `profile-reminder:${call.id}`, reminder.text, { binding: PROFILE_BINDING, toolUseId: call.id, classes: reminder.classes, originIds: reminder.originIds }))).state;
  state = good(registerSessionOrigin(state, receipt('tool-result', `profile-result:${call.id}`, RECEIPT, { binding: PROFILE_BINDING, toolUseId: call.id, toolName: 'mcp__syzygy__source_read', toolInput: INPUT, classes: ['code-content', 'project-documentation'] }))).state;
  return { state, block: { type: 'tool_result', tool_use_id: call.id, content: [{ type: 'text', text: `${RECEIPT}\n` }, { type: 'text', text: reminder.text }], cache_control: CACHE } };
}

describe('explicit Sonnet4.6 egress profile extension', () => {
  it('projects metadata before forwarding and preserves separate actual prompt/scaffold class origins', () => {
    const start = profileStart(), wire = profileWire(start.profile, start.messages);
    const result = good(validateSessionRequest(start.state, wire));
    expect(result.request.metadata).toEqual(start.profile.baseline.metadata);
    expect(result.request.tool_choice).toEqual({ type: 'auto', disable_parallel_tool_use: true });
    expect(JSON.parse(new TextDecoder().decode(wire))).not.toHaveProperty('tool_choice');
    expect(new TextDecoder().decode(result.body)).not.toContain('d'.repeat(64));
    expect(result.admission.digest).toBe(sha256(result.body));
    expect(result.admission.bytes).toBe(result.body.byteLength);
    expect(result.received).toEqual({ digest: sha256(wire), bytes: wire.byteLength });
    expect(result.admission.digest).not.toBe(result.received.digest);
    expect(result.admission.classes).toEqual(['governance-text', 'code-structure', 'code-content', 'project-documentation', 'work-history']);
    expect(result.admission.originIds).toContain('classified-prompt-source');
    expect(result.admission.originIds).toContain('session-profile:initial-scaffolding');
    expect(JSON.parse(new TextDecoder().decode(result.body))).toEqual(result.request);
  });

  it('requires the compiled supported profile and baseline, never a first-request or forged-profile grant', () => {
    const start = profileStart();
    denied(createSessionEgressPolicy({ ...start.config, profile: { ...start.profile } }), 'invalid-config');
    denied(createSessionEgressPolicy({ ...start.config, baseline: { ...start.profile.baseline, temperature: 0 } }), 'invalid-config');
    for (const control of [{ type: 'auto' }, { type: 'auto', disable_parallel_tool_use: false }, { type: 'tool', name: 'Bash' }]) {
      denied(validateSessionRequest(start.state, profileWire(start.profile, start.messages, { tool_choice: control })), 'scaffolding-mismatch');
    }
    const wrong = good(createSessionEgressPolicy(start.config)).state;
    denied(validateSessionRequest(wrong, profileWire(start.profile, start.messages)), 'unknown-origin');
    denied(createSessionEgressPolicy({ ...start.config, declaredClasses: ['code-content', 'project-documentation'] }), 'class-not-declared');
    denied(createSessionEgressPolicy({ ...start.config, limits: { ...SESSION_POLICY_LIMITS, maxStoredBytes: 12_000 } }), 'capacity-exhausted');
  });

  it('checks all five initial blocks, order, date/model/budget, exact prompt and cache shape', () => {
    const start = profileStart();
    const initial = JSON.parse(JSON.stringify(start.profile.initialMessage)) as { role: string; content: { text: string; cache_control?: unknown }[] };
    for (let index = 0; index < initial.content.length; index++) {
      const changed = JSON.parse(JSON.stringify(initial)) as typeof initial;
      changed.content[index]!.text += 'NONSECRET_MUTANT';
      denied(validateSessionRequest(start.state, profileWire(start.profile, [changed])), 'scaffolding-mismatch');
    }
    for (const changed of [
      { ...initial, content: initial.content.slice(1) }, { ...initial, content: [...initial.content].reverse() },
      start.profile.historicalInitialMessage, { role: 'user', content: start.profile.input.initialPrompt },
      { ...initial, content: [...initial.content, { type: 'text', text: 'unregistered extra' }] },
    ]) denied(validateSessionRequest(start.state, profileWire(start.profile, [changed])), 'scaffolding-mismatch');
  });

  it('normalizes only the exact known initial prompt cache marker in subsequent history', () => {
    const start = profileStart(), sent = good(validateSessionRequest(start.state, profileWire(start.profile, start.messages)));
    const response = good(registerSessionResponse(sent.state, PROFILE_BINDING, [CALL], { inputTokens: 1, outputTokens: 1 }));
    const ready = profileReceipts(response.state);
    for (const initial of [start.profile.initialMessage, start.profile.historicalInitialMessage]) {
      expect(validateSessionRequest(ready.state, profileWire(start.profile, [initial, { role: 'assistant', content: [CALL] }, { role: 'user', content: [ready.block] }])).ok).toBe(true);
    }
    const altered = JSON.parse(JSON.stringify(start.profile.initialMessage)) as { content: Record<string, unknown>[] };
    altered.content[4]!.cache_control = { type: 'ephemeral', ttl: '5m' };
    denied(validateSessionRequest(ready.state, profileWire(start.profile, [altered, { role: 'assistant', content: [CALL] }, { role: 'user', content: [ready.block] }])), 'scaffolding-mismatch');
  });

  it('derives each tool reminder from latest complete usage and refuses numeric/class/source forgery', () => {
    const start = profileStart(), sent = good(validateSessionRequest(start.state, profileWire(start.profile, start.messages)));
    const response = good(registerSessionResponse(sent.state, PROFILE_BINDING, [CALL], { inputTokens: 13, outputTokens: 17, cacheCreationInputTokens: 19, cacheReadInputTokens: 0 }));
    const derived = good(sessionProfileToolReminder(response.state, CALL.id));
    expect(derived).toEqual({ text: '<system-reminder>\n<total_tokens>14999951 tokens left</total_tokens>\n</system-reminder>', classes: ['work-history'], originIds: ['provider-response:1'] });
    const base = receipt('reminder', 'typed-profile-reminder', derived.text, { binding: PROFILE_BINDING, toolUseId: CALL.id, classes: derived.classes, originIds: derived.originIds });
    for (const changed of [{ ...base, canonicalText: REMINDER }, { ...base, classes: ['project-documentation'] as const }, { ...base, originIds: ['unrelated-origin'] }]) denied(registerSessionOrigin(response.state, changed), 'tool-refused');
    denied(sessionProfileToolReminder(response.state, 'unknown-call'), 'lifecycle-refused');
    denied(sessionProfileToolReminder(sent.state, CALL.id), 'lifecycle-refused');
  });

  it('matches the three-response independent accounting fixture without accumulating spend', () => {
    const start = profileStart();
    let state = start.state, messages: unknown[] = [start.profile.initialMessage];
    const usages: SessionProfileUsage[] = [{ inputTokens: 3, outputTokens: 5 }, { inputTokens: 13, outputTokens: 17, cacheCreationInputTokens: 19, cacheReadInputTokens: 0 }, { inputTokens: 23, outputTokens: 29, cacheCreationInputTokens: 0, cacheReadInputTokens: 31 }];
    const remaining = [14999992, 14999951, 14999917];
    for (let index = 0; index < usages.length; index++) {
      const sent = good(validateSessionRequest(state, profileWire(start.profile, messages)));
      const call = { ...CALL, id: `toolu_profile_${index + 1}` };
      const response = good(registerSessionResponse(sent.state, PROFILE_BINDING, [call], usages[index]));
      expect(good(sessionProfileToolReminder(response.state, call.id)).text).toContain(`>${remaining[index]} tokens left<`);
      const ready = profileReceipts(response.state, call);
      messages = [start.profile.historicalInitialMessage, ...messages.slice(1), { role: 'assistant', content: [call] }, { role: 'user', content: [ready.block] }];
      state = ready.state;
    }
    expect(validateSessionRequest(state, profileWire(start.profile, messages)).ok).toBe(true);
  });

  it('refuses missing/unknown usage, unprobed parallel calls and unsupported provider blocks', () => {
    const start = profileStart(), sent = good(validateSessionRequest(start.state, profileWire(start.profile, start.messages)));
    denied(registerSessionResponse(sent.state, PROFILE_BINDING, [CALL]), 'usage-refused');
    denied(registerSessionResponse(sent.state, PROFILE_BINDING, [CALL], { inputTokens: 1, outputTokens: 1, unknown: 1 } as SessionProfileUsage), 'usage-refused');
    denied(registerSessionResponse(sent.state, PROFILE_BINDING, [CALL, { ...CALL, id: 'parallel-call' }], { inputTokens: 1, outputTokens: 1 }), 'tool-refused');
    denied(registerSessionResponse(sent.state, PROFILE_BINDING, [{ type: 'thinking', thinking: 'unsupported', signature: 'opaque' }], { inputTokens: 1, outputTokens: 1 }), 'unsupported-provider-block');
  });

  it('screens original metadata before discarding it and preserves composed-response ingest protection', () => {
    const original = profileStart({ scanSecrets: value => value.includes('d'.repeat(64)) });
    denied(validateSessionRequest(original.state, profileWire(original.profile, original.messages)), 'secret-excluded');
    const start = profileStart({}, 'SYNTHETIC_');
    const sent = good(validateSessionRequest(start.state, profileWire(start.profile, start.messages)));
    denied(registerSessionResponse(sent.state, PROFILE_BINDING, [{ type: 'text', text: 'SECRET_1907' }], { inputTokens: 1, outputTokens: 1 }), 'secret-excluded');
  });
});
