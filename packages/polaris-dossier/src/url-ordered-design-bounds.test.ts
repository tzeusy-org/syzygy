import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { sha256 } from '@syzygy/support';
import { describe, expect, it } from 'vitest';
import { handleSessionMcpRequest } from './session-mcp.js';
import { createOrderedDesignSessionProfile, DEFAULT_SESSION_MODEL, matchesOrderedDesignTerminalResponse } from './session-profile.js';
import { decodeSessionResponse } from './session-response.js';
import { materializeOrderedDesignPart, planOrderedDesignBytes } from './url-design-delivery.js';
import { boundOrderedDesignTransfer, type OrderedDesignJsonBound } from './url-ordered-design-bounds.js';
import { projectOrderedDesignRequest } from './url-ordered-design-request.js';

const canonical = (value: unknown) => encodeCanonicalJson(value, { maxBytes: 2_097_152, maxNodes: 65_536, maxDepth: 32 });
const bytes = (text: string) => Buffer.byteLength(text, 'utf8');
const run = 'owned-shape', sessionId = '12345678-1234-4234-8234-123456789012';
const ids = Array.from({ length: 4 }, (_, index) => `toolu_${String(index).repeat(250)}`);
const pollInput = { argv: ['dossier', 'poll', run] };
const call = (index: number, tool: string, input: object) => ({ type: 'tool_use', id: ids[index]!, name: `mcp__syzygy__${tool}`, input });
const assistant = (block: object) => ({ role: 'assistant', content: [block] });

function fixture() {
  const profileResult = createOrderedDesignSessionProfile({ binding: { run, role: 'design', sourceBinding: sha256('own source'),
    policy: sha256('own policy'), provider: 'anthropic', model: DEFAULT_SESSION_MODEL }, sessionId,
  systemPrompt: 'Review the owned dossier.', initialPrompt: 'Keep the whole fixture.', utcDate: '2026-11-22', kernelRelease: '7.0.0-fixture' });
  if (!profileResult.ok) throw new Error(profileResult.reason);
  const { profile } = profileResult.value;
  const { algorithm: _algorithm, ...limits } = profile.transcript.partition;
  const text = `${'a'.repeat(32_500)}🌱${'t'.repeat(3800)}\n"\\<&`;
  const payload = text.replace(/["<&]/gu, c => ({ '"': '&quot;', '<': '&lt;', '&': '&amp;' })[c]!);
  const original = { bytes: bytes(text), sha256: sha256(text) };
  const encoding = 'html-entities-five/1';
  const envelope = Buffer.from(canonical({ format: 'polaris-dossier-url-design-inert-view/1', encoding,
    originalSha256: original.sha256, originalBytes: original.bytes, payload, payloadSha256: sha256(payload), payloadBytes: bytes(payload) }));
  const plan = planOrderedDesignBytes({ envelope, envelopeSha256: sha256(envelope), original, fileCount: 2, pageCount: 1,
    binding: { basePolicySha256: profile.input.binding.policy, originPolicySha256: sha256('own origin'), originalReceiptSha256: sha256('own receipt'),
      producerSha256: sha256('own producer'), profileSha256: profile.digest, encoding, project: 'own-project', provider: 'anthropic',
      role: 'design', round: 1, run, session: sessionId, transferEpoch: 1, pin: 'a'.repeat(40), deadline: '2099-01-01T00:00:00.000Z' },
    parents: [sha256('own parent')], instructionProfileSha256: sha256(profile.input.systemPrompt), limits });
  const retainedMessages = canonical([profile.historicalInitialMessage, assistant(call(0, 'dossier_step', pollInput))]);
  return { profile, plan, envelope, retainedMessages };
}

function observedShape(value: unknown, depth = 0): { nodes: number; depth: number } {
  const children = value !== null && typeof value === 'object' ? Object.values(value) : [];
  return children.reduce((shape, child) => {
    const member = observedShape(child, depth + 1);
    return { nodes: shape.nodes + member.nodes, depth: Math.max(shape.depth, member.depth) };
  }, { nodes: 1, depth });
}

function fits(bound: OrderedDesignJsonBound, value: unknown, text = canonical(value)): void {
  const shape = observedShape(value);
  expect(bytes(text)).toBeLessThanOrEqual(bound.bytes);
  expect(shape.nodes).toBeLessThanOrEqual(bound.nodes);
  expect(shape.depth).toBeLessThanOrEqual(bound.depth);
}

describe('ordered design whole-transfer shape', () => {
  it('bounds the actual wrapper, retained history and all request branches through maximally escaped verdict stdin', async () => {
    const input = fixture();
    const { profile, plan, envelope } = input;
    const bounds = boundOrderedDesignTransfer(input);
    expect(bounds).not.toBeNull();
    expect(bounds!.retainedMessagesSha256).toBe(sha256(input.retainedMessages));
    expect(bounds!.turns.map(turn => turn.kind)).toEqual(['prepared', 'part', 'part', 'verdict-acknowledgment']);
    expect(bounds!.turns.map(turn => turn.history.messages)).toEqual([4, 6, 8, 10]);
    expect(bounds!.totals.received.bytes).toBe(8_388_608);
    const verdictInput = { argv: ['dossier', 'await', '/work', '--submit', 'round-1/verdict.json', '--stdin'], stdin: '\u000b'.repeat(32_768) };
    const toolInputs = [pollInput, ...plan.manifest.parts.map(part => ({ path: part.path })), verdictInput];
    const tools = ['dossier_step', 'artifact_read', 'artifact_read', 'dossier_step'];
    const calls = tools.map((tool, index) => call(index, tool, toolInputs[index]!));
    const replies = [canonical({ kind: 'session-control', ok: true, state: 'events', events: [{ event: 'design-round-prepared', ...plan.prepared }] }),
      ...plan.manifest.parts.map(part => materializeOrderedDesignPart(plan, envelope, part.path)),
      canonical({ kind: 'dossier-result', ok: true, exit: 0, stderr: '', stdout: canonical({ outcome: 'validated-and-staged',
        eligibility: 'pending', packetSha256: plan.manifest.originalSha256 }) })];
    const usage = { inputTokens: 4, outputTokens: 3, cacheCreationInputTokens: 0, cacheReadInputTokens: 0 };
    const checked = ids.map(toolUseId => ({ toolUseId, usage }));
    const { tool_choice: _toolChoice, ...controls } = profile.baseline;
    const metadata = { user_id: JSON.stringify({ device_id: 'b'.repeat(64), account_uuid: '', session_id: sessionId }) };

    for (const [index, bound] of bounds!.turns.entries()) {
      const messages = [profile.initialMessage];
      for (let at = 0; at <= index; at++) messages.push(assistant(calls[at]!), { role: 'user', content: [{
        type: 'tool_result', tool_use_id: ids[at], ...(at === index ? { cache_control: { type: 'ephemeral', ttl: '1h' } } : {}),
        content: [{ type: 'text', text: `${replies[at]}\n` },
          { type: 'text', text: '<system-reminder>\n<total_tokens>14999993 tokens left</total_tokens>\n</system-reminder>' }],
      }] });
      const received = { ...controls, metadata, messages };
      const prepared = { ...profile.baseline, messages };
      const projected = projectOrderedDesignRequest(received, { profile, plan, envelope, prepared: checked[0]!,
        parts: checked.slice(1, Math.min(index + 1, 3)), ...(index === 3 ? { acknowledgment: { ...checked[3]!, input: verdictInput } } : {}) });
      fits(bound.received, received, JSON.stringify(received, null, 2));
      fits(bound.receivedCanonical, received);
      fits(bound.prepared, prepared);
      fits(bound.logicalReceived, projected.request);
      fits(bound.logicalPrepared, { ...profile.baseline, messages: projected.request.messages });
      fits(bound.nativeWrapper, messages.at(-1));
      const content = index === 3 ? [{ type: 'text', text: '\u000b'.repeat(4096) }] : [calls[index + 1]!];
      fits(bound.responseContent, content);
      fits(bound.history, [...messages, { role: 'assistant', content }]);

      const invocation = { tool: tools[index], input: toolInputs[index] };
      const reply: unknown = JSON.parse(replies[index]!);
      fits(bound.brokerRequest, invocation, `${canonical(invocation)}\n`);
      fits(bound.brokerReply, reply, `${replies[index]}\n`);
      const mcp = { jsonrpc: '2.0', id: Number.MIN_SAFE_INTEGER, method: 'tools/call',
        params: { name: tools[index], arguments: toolInputs[index] } };
      fits(bound.mcpRequest, mcp, `${JSON.stringify(mcp)}\n`);
      const mcpReply = await handleSessionMcpRequest(mcp, async () => reply);
      expect(mcpReply).toMatchObject({ result: { content: [{ type: 'text', text: replies[index] }], isError: false } });
      fits(bound.mcpReply, mcpReply, `${JSON.stringify(mcpReply)}\n`);
    }
  });

  it('refuses a history with unknown retained fields, a different seal, and a cap that fits only the prefix', () => {
    const input = fixture();
    const control = boundOrderedDesignTransfer(input)!;
    expect(control.turns[2]!.receivedCanonical.bytes).toBeLessThan(control.turns[3]!.receivedCanonical.bytes);
    const prefixCap = Math.max(...control.turns.slice(0, 3).flatMap(turn => [turn.receivedCanonical.bytes, turn.prepared.bytes,
      turn.logicalReceived.bytes, turn.logicalPrepared.bytes, turn.history.bytes]));
    const fullCap = Math.max(...control.turns.flatMap(turn => [turn.receivedCanonical.bytes, turn.prepared.bytes,
      turn.logicalReceived.bytes, turn.logicalPrepared.bytes, turn.history.bytes]));
    expect(boundOrderedDesignTransfer({ ...input, requestMaxBytes: fullCap })).not.toBeNull();
    expect(boundOrderedDesignTransfer({ ...input, requestMaxBytes: prefixCap })).toBeNull();
    expect(boundOrderedDesignTransfer({ ...input, retainedMessages: `${input.retainedMessages}\n` })).toBeNull();
    expect(boundOrderedDesignTransfer({ ...input, retainedMessages: canonical([input.profile.historicalInitialMessage,
      { ...assistant(call(0, 'dossier_step', pollInput)), callerHistory: 'unknown' }]) })).toBeNull();
    expect(boundOrderedDesignTransfer({ ...input, plan: structuredClone(input.plan) })).toBeNull();
    expect(boundOrderedDesignTransfer({ ...input, profile: structuredClone(input.profile) })).toBeNull();
    const changed = Buffer.from(input.envelope);
    changed[changed.length - 2] = changed[changed.length - 2]! ^ 1;
    expect(boundOrderedDesignTransfer({ ...input, envelope: changed })).toBeNull();
  });

  it('includes an echoed string JSON-RPC ID at the supported ordered MCP ingress cap', async () => {
    const input = fixture();
    const bounds = boundOrderedDesignTransfer(input)!;
    const firstPart = input.plan.manifest.parts[0]!;
    const partBound = bounds.turns[1]!;
    const request = { jsonrpc: '2.0', id: '', method: 'tools/call', params: { name: 'artifact_read', arguments: { path: firstPart.path } } };
    const emptyFrame = `${JSON.stringify(request)}\n`;
    request.id = 'a'.repeat(partBound.mcpRequest.bytes - bytes(emptyFrame));
    expect(bytes(`${JSON.stringify(request)}\n`)).toBe(partBound.mcpRequest.bytes);
    const reply = materializeOrderedDesignPart(input.plan, input.envelope, firstPart.path);
    const response = await handleSessionMcpRequest(request, async () => JSON.parse(reply));
    expect(response?.id).toBe(request.id);
    expect(bytes(`${JSON.stringify(response)}\n`)).toBeLessThanOrEqual(partBound.mcpReply.bytes);
  });

  it('quotes the independently exercised SSE frame ceiling and maximum terminal text', () => {
    const input = fixture();
    const bounds = boundOrderedDesignTransfer(input)!;
    const terminal = bounds.turns[3]!;
    const frame = (type: string, fields: object = {}) => `event: ${type}\ndata: ${JSON.stringify({ type, ...fields })}\n\n`;
    const tail = frame('message_start', { message: { id: 'msg_owned', type: 'message', role: 'assistant', model: DEFAULT_SESSION_MODEL,
      content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 0, output_tokens: 0 } } })
      + frame('content_block_start', { index: 0, content_block: { type: 'text', text: '' } })
      + frame('content_block_delta', { index: 0, delta: { type: 'text_delta', text: 'x'.repeat(4096) } })
      + frame('content_block_stop', { index: 0 }) + frame('message_delta', { delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 0 } })
      + frame('message_stop');
    const wire = frame('ping').repeat(4090) + tail;
    const decode = (message: string) => decodeSessionResponse(Buffer.from(message), 'text/event-stream', DEFAULT_SESSION_MODEL, () => false);
    const admitted = decode(wire);
    expect(terminal.responseWire.frames).toBe(4096);
    expect(terminal.responseWire.bytes).toBe(8_388_608);
    expect(admitted.ok).toBe(true);
    if (!admitted.ok) throw new Error(admitted.reason);
    expect(matchesOrderedDesignTerminalResponse(input.profile, admitted.stopReason, admitted.content)).toBe(true);
    expect(decode(frame('ping') + wire).ok).toBe(false);
  });
});
