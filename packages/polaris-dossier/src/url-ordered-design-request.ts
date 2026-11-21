import { encodeCanonicalJson, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { isRecord, sha256 } from '@syzygy/support';
import {
  isOrderedDesignSessionProfile, matchesOrderedDesignResultMessage, sessionProfileReminderText,
  type OrderedDesignSessionProfile, type SessionProfileUsage,
} from './session-profile.js';
import {
  isOrderedDesignPartPath, materializeOrderedDesignPart, orderedDesignWholeReply, type OrderedDesignPlan,
} from './url-design-delivery.js';
import { URL_DESIGN_VIEW_ARTIFACT } from './url-design-view.js';

interface CheckedToolResult {
  readonly toolUseId: string;
  readonly usage: SessionProfileUsage;
}

/** Bindings from the host's checked prefix. The caller owns protected
 * currentness and the provenance of the corresponding response and receipt. */
export interface OrderedDesignRequestBindings {
  readonly profile: OrderedDesignSessionProfile;
  readonly plan: OrderedDesignPlan;
  readonly envelope: Uint8Array;
  readonly prepared: CheckedToolResult;
  readonly parts: readonly CheckedToolResult[];
  readonly acknowledgment?: CheckedToolResult & { readonly input: Readonly<Record<string, unknown>> };
}

/** The returned request and whole reply are private detector inputs only. */
export function projectOrderedDesignRequest(
  actual: Readonly<Record<string, unknown>>, bindings: OrderedDesignRequestBindings,
): { readonly request: Readonly<Record<string, unknown>>; readonly wholeReply: string } {
  const { profile, plan, envelope, prepared, parts, acknowledgment } = bindings;
  if (!isOrderedDesignSessionProfile(profile)) return refuse();
  const { transcript } = profile;
  const { binding, partCount } = plan.manifest;
  const { messageIndex, blockIndex } = transcript.prepared;
  if (binding.profileSha256 !== profile.digest || binding.run !== profile.input.binding.run
    || binding.session !== profile.input.sessionId || binding.provider !== profile.input.binding.provider
    || binding.basePolicySha256 !== profile.input.binding.policy || partCount !== transcript.partition.partCount
    || sha256(profile.input.systemPrompt) !== plan.prepared.instructionProfileSha256
    || parts.length > partCount || (acknowledgment !== undefined && parts.length !== partCount)) return refuse();
  const canonical = (value: unknown): string => encodeCanonicalJson(value, transcript.requestLimits);
  const same = (left: unknown, right: unknown): boolean => canonical(left) === canonical(right);
  const messages = actual.messages;
  if (!Array.isArray(messages) || messages.length <= messageIndex) return refuse();
  // Check the entire sealed source even for a request with zero released parts.
  const wholeReply = orderedDesignWholeReply(plan, envelope, transcript.partition);
  const preparedReply = canonical({ kind: 'session-control', ok: true, state: 'events',
    events: [{ event: transcript.prepared.event, ...plan.prepared }] });
  const partReplies = parts.map((_, index) => materializeOrderedDesignPart(plan, envelope, plan.manifest.parts[index]!.path));
  const acknowledgmentReply = canonical({ kind: 'dossier-result', ok: true, exit: 0, stderr: '',
    stdout: canonical({ outcome: transcript.verdict.stagedOutcome, eligibility: transcript.verdict.eligibility,
      packetSha256: plan.manifest.originalSha256 }) });
  const resultCount = 1 + parts.length + Number(acknowledgment !== undefined);
  const checked = [prepared, ...parts, ...(acknowledgment === undefined ? [] : [acknowledgment])];
  const ids = checked.map(result => result.toolUseId);
  if (new Set(ids).size !== ids.length || ids.includes(transcript.logical.toolUseId)) return refuse();
  const call = (result: CheckedToolResult, name: string, input: Readonly<Record<string, unknown>>) =>
    ({ type: 'tool_use', id: result.toolUseId, name, input });
  const resultMatches = (block: unknown, index: number, canonicalReply: string): boolean => {
    const result = checked[index]!;
    return matchesOrderedDesignResultMessage(profile, { actual: { role: 'user', content: [block] }, canonicalReply,
      toolUseId: result.toolUseId, usage: result.usage, resultIndex: index, resultCount });
  };

  const round = String(binding.round);
  if (acknowledgment !== undefined) {
    const { argv, stdin } = acknowledgment.input;
    if (Object.keys(acknowledgment.input).length !== 2 || !Array.isArray(argv) || typeof stdin !== 'string'
      || !same(argv, ['dossier', transcript.verdict.operation, '/work', '--submit', `round-${round}/verdict.json`, '--stdin'])
      || Buffer.byteLength(stdin) > transcript.maxVerdictBytes) return refuse();
  }
  const wholePath = transcript.logical.selector.replace('{round}', round);
  const logicalCall = { role: 'assistant', content: [call({ ...prepared, toolUseId: transcript.logical.toolUseId },
    transcript.logical.tool, { path: wholePath })] };
  const { wrapper } = transcript;
  // The detector carrier uses the pinned historical wrapper with the fixed
  // profile budget reminder. It contributes no live cache, usage or receipt.
  const logicalResult = { role: wrapper.resultRole, content: [{ type: wrapper.resultType, tool_use_id: transcript.logical.toolUseId,
    content: [{ type: wrapper.textBlockType, text: wrapper.leading + wholeReply + wrapper.trailing },
      { type: wrapper.textBlockType, text: sessionProfileReminderText(wrapper.tokenBudget) }] }] };

  const projected: unknown[] = [];
  const receivedParts: string[] = [];
  let preparedCallSeen = false, preparedResultSeen = false, next = 1, called = false;
  for (const [messageAt, message] of messages.entries()) {
    if (!isRecord(message) || (message.role !== 'assistant' && message.role !== 'user')
      || Object.keys(message).length !== 2 || !Object.hasOwn(message, 'content')) return refuse();
    if (typeof message.content === 'string' && message.role === 'user') { projected.push(message); continue; }
    if (!Array.isArray(message.content) || message.content.length === 0) return refuse();
    let kept: unknown[] = [];
    for (const [blockAt, block] of message.content.entries()) {
      if (!isRecord(block)) return refuse();
      const use = block.type === 'tool_use', result = block.type === 'tool_result';
      const id = use ? block.id : result ? block.tool_use_id : undefined;
      const slot = typeof id === 'string' ? ids.indexOf(id) : -1;
      const path = use && block.name === transcript.numbered.tool && isRecord(block.input) ? block.input.path : undefined;
      if (id === transcript.logical.toolUseId || (slot < 0 && (isOrderedDesignPartPath(path)
        || (typeof path === 'string' && URL_DESIGN_VIEW_ARTIFACT.test(path))))) return refuse();
      if (slot === 0) {
        if (use && messageAt === messageIndex - 1 && blockAt === blockIndex && message.role === 'assistant'
          && !preparedCallSeen && same(block, call(prepared, transcript.prepared.tool,
            { argv: ['dossier', transcript.prepared.operation, binding.run] }))) {
          preparedCallSeen = true;
        } else if (result && messageAt === messageIndex && blockAt === blockIndex && message.role === 'user'
          && preparedCallSeen && !preparedResultSeen && resultMatches(block, 0, preparedReply)) {
          preparedResultSeen = true;
          projected.push({ ...message, content: [...kept, block] }, logicalCall, logicalResult);
          kept = [];
          continue;
        } else return refuse();
      } else if (slot > 0) {
        if (!preparedResultSeen || slot !== next) return refuse();
        const part = plan.manifest.parts[slot - 1];
        const numbered = slot <= parts.length;
        const expected = numbered
          ? call(checked[slot]!, transcript.numbered.tool, { path: part!.path })
          : call(checked[slot]!, transcript.prepared.tool, acknowledgment!.input);
        if (use && message.role === 'assistant' && !called && same(block, expected)) {
          called = true;
        } else if (result && message.role === 'user' && called
          && resultMatches(block, slot, numbered ? partReplies[slot - 1]! : acknowledgmentReply)) {
          if (numbered) {
            // Read the exact verified result from the wire, including both
            // halves of the check when the full population is present.
            const content = block.content as readonly { readonly text: string }[];
            const reply = parseBoundedJson(content[0]!.text, transcript.requestLimits);
            if (!isRecord(reply) || typeof reply.text !== 'string') return refuse();
            receivedParts.push(reply.text);
          }
          called = false;
          next++;
        } else return refuse();
        if (numbered) continue;
      }
      kept.push(block);
    }
    if (kept.length > 0) projected.push({ ...message, content: kept });
  }
  if (!preparedResultSeen || called || next !== checked.length) return refuse();
  if (parts.length === partCount && receivedParts.join('') !== new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(envelope))
    return refuse();
  const request = { ...actual, messages: projected };
  canonical(request);
  return { request, wholeReply };
}

function refuse(): never { throw new Error('url-ordered-design-request-refused'); }
