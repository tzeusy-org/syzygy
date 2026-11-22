import { encodeCanonicalJson, parseBoundedJson, type CanonicalJsonLimits } from '@syzygy/polaris-generation-core/live';
import { deepFreeze, isRecord, sha256 } from '@syzygy/support';
import { SESSION_BROKER_LIMITS } from './session-broker.js';
import { SESSION_POLICY_LIMITS } from './session-egress-policy.js';
import { isOrderedDesignSessionProfile, sessionProfileReminderText, type OrderedDesignSessionProfile } from './session-profile.js';
import { SESSION_RELAY_LIMITS } from './session-relay.js';
import { isOrderedDesignPlanFor, materializeOrderedDesignPart, orderedDesignWholeReply, type OrderedDesignPlan } from './url-design-delivery.js';

// These are the corresponding fixed decoder ceilings in session-mcp.ts and
// session-response.ts. The latter also counts decoded keys as nodes.
const MCP_MAX_BYTES = 8_388_608;
const SSE_MAX_FRAMES = 4096;
const SSE_MAX_NODES = 65_536;
const SSE_MAX_DEPTH = 32;
const RECEIVED_USER_ID_BYTES = 1024; // projectSessionProfileMetadata
const PROVIDER_TOOL_ID = /^toolu_[A-Za-z0-9_-]{0,250}$/u;

/** JSON root depth is zero. Wire frames include their delimiters. */
export interface OrderedDesignJsonBound { readonly bytes: number; readonly nodes: number; readonly depth: number }

export interface OrderedDesignTurnBounds {
  readonly kind: OrderedDesignSessionProfile['transcript']['resultTurns'][number];
  readonly received: OrderedDesignJsonBound;
  readonly receivedCanonical: OrderedDesignJsonBound;
  readonly prepared: OrderedDesignJsonBound;
  readonly logicalReceived: OrderedDesignJsonBound;
  readonly logicalPrepared: OrderedDesignJsonBound;
  readonly history: OrderedDesignJsonBound & { readonly messages: number };
  readonly nativeWrapper: OrderedDesignJsonBound;
  readonly brokerRequest: OrderedDesignJsonBound;
  readonly brokerReply: OrderedDesignJsonBound;
  /** Enforce this ingress ceiling at ordered MCP ingress before the broker effect. */
  readonly mcpRequest: OrderedDesignJsonBound;
  readonly mcpReply: OrderedDesignJsonBound;
  readonly responseWire: OrderedDesignJsonBound & { readonly frames: number };
  readonly responseContent: OrderedDesignJsonBound;
}

type BoundKey = Exclude<keyof OrderedDesignTurnBounds, 'kind'>;
export interface OrderedDesignTransferBounds {
  readonly profileSha256: string;
  readonly manifestSha256: string;
  readonly retainedMessagesSha256: string;
  readonly turns: readonly OrderedDesignTurnBounds[];
  /** Additive bytes and nodes by operation. Depth is the maximum of one value. */
  readonly totals: Readonly<Record<BoundKey, OrderedDesignJsonBound>>;
}

interface Input {
  readonly profile: OrderedDesignSessionProfile;
  readonly plan: OrderedDesignPlan;
  readonly envelope: Uint8Array;
  /** Independently checked canonical array: initial user entry and admitted poll call. */
  readonly retainedMessages: string;
  /** A smaller request cap already selected for this host and role. */
  readonly requestMaxBytes?: number;
}

function measure(value: unknown, limits: CanonicalJsonLimits, additionalBytes = 0): OrderedDesignJsonBound {
  if (additionalBytes >= limits.maxBytes) throw new Error('ordered-design-shape-limit');
  const bytes = Buffer.byteLength(encodeCanonicalJson(value, { ...limits, maxBytes: limits.maxBytes - additionalBytes })) + additionalBytes;
  let nodes = 0, depth = 0;
  const visit = (item: unknown, at: number): void => {
    nodes++;
    depth = Math.max(depth, at);
    if (Array.isArray(item)) for (const child of item) visit(child, at + 1);
    else if (isRecord(item)) for (const child of Object.values(item)) visit(child, at + 1);
  };
  visit(value, 0);
  return { bytes, nodes, depth };
}

/** One JSON string layer expands valid UTF-8 by at most six bytes per byte.
 * Reserve that expansion around an empty structural slot before encoding. */
const quotedGrowth = (bytes: number): number => bytes * 6;

/** Preflight shape only. The owner of the live attempt still checks actual
 * history, charges detector/transform work, and reserves time/run capacity. */
export function boundOrderedDesignTransfer(input: Input): OrderedDesignTransferBounds | null {
  try {
    const { profile, plan, envelope, retainedMessages, requestMaxBytes = SESSION_RELAY_LIMITS.requestBytes } = input;
    if (!isOrderedDesignSessionProfile(profile) || !isOrderedDesignPlanFor(plan, profile.transcript.partition)) return null;
    if (!Number.isSafeInteger(requestMaxBytes) || requestMaxBytes <= 0 || requestMaxBytes > SESSION_RELAY_LIMITS.requestBytes) return null;
    const { transcript } = profile;
    const { binding, partCount } = plan.manifest;
    if (transcript.resultTurns.join(',') !== 'prepared,part,part,verdict-acknowledgment' || partCount !== 2
      || binding.profileSha256 !== profile.digest || binding.run !== profile.input.binding.run
      || binding.session !== profile.input.sessionId || binding.provider !== profile.input.binding.provider
      || binding.basePolicySha256 !== profile.input.binding.policy || binding.role !== 'design'
      || sha256(profile.input.systemPrompt) !== plan.prepared.instructionProfileSha256
      || transcript.prepared.messageIndex !== 2 || transcript.prepared.blockIndex !== 0) return null;

    const limits = { maxBytes: Math.min(transcript.requestLimits.maxBytes, SESSION_POLICY_LIMITS.maxBytes, requestMaxBytes),
      maxNodes: Math.min(transcript.requestLimits.maxNodes, SESSION_POLICY_LIMITS.maxNodes),
      maxDepth: Math.min(transcript.requestLimits.maxDepth, SESSION_POLICY_LIMITS.maxDepth) };
    const canonical = (value: unknown) => encodeCanonicalJson(value, limits);
    const retained = parseBoundedJson(retainedMessages, limits);
    if (!Array.isArray(retained) || retained.length !== 2 || canonical(retained) !== retainedMessages) return null;

    const assistant = (block: unknown) => ({ role: 'assistant', content: [block] });
    const call = (id: string, name: string, toolInput: unknown) => ({ type: 'tool_use', id, name, input: toolInput });
    const pollInput = { argv: ['dossier', transcript.prepared.operation, binding.run] };
    const poll = retained[1];
    const block = isRecord(poll) && Array.isArray(poll.content) ? poll.content[0] : null;
    if (!isRecord(block) || typeof block.id !== 'string' || PROVIDER_TOOL_ID.exec(block.id)?.[0] !== block.id
      || block.id === transcript.logical.toolUseId
      || canonical(poll) !== canonical(assistant(call(block.id, transcript.prepared.tool, pollInput)))) return null;
    const initial = canonical(retained[0]);
    if (initial !== canonical(profile.historicalInitialMessage) && initial !== canonical(profile.initialMessage)) return null;

    const verdictInput = { argv: ['dossier', transcript.verdict.operation, '/work', '--submit', `round-${binding.round}/verdict.json`, '--stdin'], stdin: '' };
    const maximumId = (index: number) => `toolu_${'a'.repeat(249)}${index}`;
    const calls = [call(block.id, transcript.prepared.tool, pollInput),
      ...plan.manifest.parts.map((part, index) => call(maximumId(index), transcript.numbered.tool, { path: part.path })),
      call(maximumId(2), transcript.verdict.tool, verdictInput)];
    const replies = [canonical({ kind: 'session-control', ok: true, state: 'events', events: [{ event: transcript.prepared.event, ...plan.prepared }] }),
      ...plan.manifest.parts.map(part => materializeOrderedDesignPart(plan, envelope, part.path)),
      canonical({ kind: 'dossier-result', ok: true, exit: 0, stderr: '', stdout: canonical({ outcome: transcript.verdict.stagedOutcome,
        eligibility: transcript.verdict.eligibility, packetSha256: plan.manifest.originalSha256 }) })];
    const replyCaps = [transcript.partition.preparedBytes, transcript.partition.replyBytes, transcript.partition.replyBytes, transcript.maxAcknowledgmentBytes];
    if (replies.some((reply, index) => Buffer.byteLength(reply) > replyCaps[index]!)) return null;

    const { wrapper } = transcript;
    // The longest possible reminder uses the widest allowed decimal count.
    // This is a size representative. The relay supplies real usage at each turn.
    const reminder = sessionProfileReminderText(wrapper.contextAllowance);
    const result = (id: string, reply: string, cached: boolean) => ({ role: wrapper.resultRole, content: [{
      type: wrapper.resultType, tool_use_id: id,
      content: [{ type: wrapper.textBlockType, text: wrapper.leading + reply + wrapper.trailing }, { type: wrapper.textBlockType, text: reminder }],
      ...(cached ? { cache_control: wrapper.cache } : {}),
    }] });
    const wholeCall = assistant(call(transcript.logical.toolUseId, transcript.logical.tool, {
      path: transcript.logical.selector.replace('{round}', String(binding.round)),
    }));
    const wholeResult = result(transcript.logical.toolUseId, orderedDesignWholeReply(plan, envelope), false);
    const { tool_choice: _toolChoice, ...controls } = profile.baseline;
    const receivedControls = { ...controls, metadata: { user_id: '' } };
    const metadataGrowth = quotedGrowth(RECEIVED_USER_ID_BYTES);
    const verdictGrowth = quotedGrowth(transcript.maxVerdictBytes);
    const brokerLimits = SESSION_BROKER_LIMITS;
    const mcpLimits = { maxBytes: MCP_MAX_BYTES, maxNodes: limits.maxNodes, maxDepth: limits.maxDepth };
    // The generic shim echoes a caller-provided JSON-RPC id. Bound its input
    // separately so that id plus the exact nested reply fits the output cap.
    const mcpIngress = { bytes: brokerLimits.maxBytes, nodes: mcpLimits.maxNodes, depth: mcpLimits.maxDepth };
    const responseWire = { bytes: SESSION_RELAY_LIMITS.responseBytes, nodes: SSE_MAX_NODES, depth: SSE_MAX_DEPTH, frames: SSE_MAX_FRAMES };

    const turns = transcript.resultTurns.map((kind, index): OrderedDesignTurnBounds => {
      const verdictTurn = kind === 'verdict-acknowledgment';
      const verdictBytes = verdictTurn ? verdictGrowth : 0;
      const activeCalls = calls.slice(0, index + 1);
      // The supported native serializer can carry cache control on the first
      // entry. Every older result is uncached and only this result is cached.
      const first = profile.initialMessage;
      const frames = activeCalls.map((active, at) => result(active.id, replies[at]!, at === index));
      const actual = [first, ...activeCalls.flatMap((active, at) => [assistant(active), frames[at]!])];
      const logical = [first, assistant(calls[0]), frames[0], wholeCall, wholeResult,
        ...(verdictTurn ? [assistant(calls[index]), frames[index]] : [])];
      const receivedCanonical = measure({ ...receivedControls, messages: actual }, limits, verdictBytes + metadataGrowth);
      const prepared = measure({ ...profile.baseline, messages: actual }, limits, verdictBytes);
      const logicalReceived = measure({ ...receivedControls, messages: logical }, limits, verdictBytes + metadataGrowth);
      const logicalPrepared = measure({ ...profile.baseline, messages: logical }, limits, verdictBytes);

      const response = verdictTurn ? [{ type: wrapper.textBlockType, text: '' }] : [calls[index + 1]!];
      const responseGrowth = verdictTurn ? quotedGrowth(transcript.terminal.maxTextBytes) : index === 2 ? verdictGrowth : 0;
      const responseContent = measure(response, limits, responseGrowth);
      const retainedAfter = [...actual, { role: 'assistant', content: response }];
      if (retainedAfter.length > SESSION_POLICY_LIMITS.maxHistoryMessages) throw new Error('ordered-design-history-limit');
      const history = { ...measure(retainedAfter, limits, verdictBytes + responseGrowth), messages: retainedAfter.length };

      const active = calls[index]!;
      const invocation = { tool: active.name.slice('mcp__syzygy__'.length), input: active.input };
      const brokerRequest = measure(invocation, brokerLimits, verdictBytes + 1);
      const reply = parseBoundedJson(replies[index]!, limits);
      const brokerReply = measure(reply, brokerLimits, 1);
      // Bound the JSON-RPC framing overhead separately from the raw ingress
      // guard, which covers the actual id, metadata, and any lexical expansion.
      measure({ jsonrpc: '2.0', id: Number.MIN_SAFE_INTEGER, method: 'tools/call',
        params: { name: invocation.tool, arguments: invocation.input } }, { ...mcpLimits, maxBytes: mcpIngress.bytes }, verdictBytes + 1);
      // Replace the four-byte null ID with the maximum echoed ID and add LF.
      const mcpReply = measure({ jsonrpc: '2.0', id: null,
        result: { content: [{ type: 'text', text: replies[index]! }], isError: false } }, mcpLimits, mcpIngress.bytes - 4 + 1);
      return { kind, received: { ...receivedCanonical, bytes: limits.maxBytes }, receivedCanonical, prepared, logicalReceived, logicalPrepared, history,
        nativeWrapper: measure(frames[index], limits), brokerRequest, brokerReply, mcpRequest: mcpIngress, mcpReply, responseWire, responseContent };
    });

    const totals = {} as Record<BoundKey, OrderedDesignJsonBound>;
    for (const key of Object.keys(turns[0]!) as (keyof OrderedDesignTurnBounds)[]) {
      if (key === 'kind') continue;
      totals[key] = turns.reduce((total, turn) => ({ bytes: total.bytes + turn[key].bytes, nodes: total.nodes + turn[key].nodes,
        depth: Math.max(total.depth, turn[key].depth) }), { bytes: 0, nodes: 0, depth: 0 });
    }
    return deepFreeze({ profileSha256: profile.digest, manifestSha256: plan.manifestSha256,
      retainedMessagesSha256: sha256(retainedMessages), turns, totals });
  } catch { return null; }
}
