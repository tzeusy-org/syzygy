import { encodeCanonicalJson, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { deepFreeze, isRecord, sha256 } from '@syzygy/support';
import { isOrderedDesignSessionProfile, sessionProfileRemainingTokens, sessionProfileReminderText, type OrderedDesignSessionProfile } from './session-profile.js';
import type { SessionResponseObservation } from './session-relay.js';
import type { SessionResponseUsage } from './session-response.js';
import { isOrderedDesignPlanFor, verifyHistoricalOrderedDesignPlanMetadata, type OrderedDesignPlan } from './url-design-delivery.js';

export const ORDERED_DESIGN_AUDIT_FORMAT = 'url-ordered-design-audit/1';
export const ORDERED_DESIGN_AUDIT_RECORD_LIMITS = Object.freeze({ maxBytes: 65_536, maxNodes: 4096, maxDepth: 12 });
const REQUEST_BYTES = 2_097_152;
const RESPONSE_BYTES = 8_388_608;

export interface OrderedDesignAuditReference {
  readonly id: string;
  readonly sha256: string;
}
interface ByteIdentity {
  readonly bytes: number;
  readonly sha256: string;
}
type ToolCall = NonNullable<SessionResponseObservation['tool']>;
interface ConsumedResult {
  readonly receipt: OrderedDesignAuditReference;
  readonly wrapper: ByteIdentity;
}
interface VerifiedExchange {
  readonly admission: OrderedDesignAuditReference;
  readonly sendAttempt: OrderedDesignAuditReference;
  readonly sendOutcome: OrderedDesignAuditReference;
  readonly response: OrderedDesignAuditReference;
}
interface ExchangeRequest {
  readonly requestId: string;
  readonly route: 'messages';
  readonly received: ByteIdentity;
  readonly forwarded: ByteIdentity;
}
interface AttemptedExchange extends ExchangeRequest {
  readonly admission: OrderedDesignAuditReference;
}
interface SentExchange extends AttemptedExchange {
  readonly sendAttempt: OrderedDesignAuditReference;
}
type NativeResponse = ByteIdentity & { readonly content: 'messages-event-stream' } & (
  | { readonly stopReason: 'tool_use'; readonly textBlocks: 0; readonly tool: ToolCall }
  | { readonly stopReason: 'end_turn'; readonly textBlocks: 1; readonly tool: null });

/** Safe projections for the protected writer. The reader checks all fields
 * and exact links again after canonical encoding. */
export interface OrderedDesignAuditPayloads {
  readonly prepared: { readonly call: ToolCall; readonly prepared: ByteIdentity; readonly reply: ByteIdentity };
  readonly 'part-receipt': { readonly ordinal: number; readonly issuedBy: OrderedDesignAuditReference; readonly call: ToolCall; readonly reply: ByteIdentity };
  readonly 'request-admitted': ExchangeRequest & { readonly logical: ByteIdentity; readonly results: readonly ConsumedResult[];
    readonly transcriptSha256: string };
  readonly 'send-attempt': AttemptedExchange & { readonly outcome: 'attempted' };
  readonly 'send-outcome': SentExchange & { readonly outcome: 'local-request-flushed' };
  readonly 'response-admitted': SentExchange & { readonly sendOutcome: OrderedDesignAuditReference; readonly outcome: 'response-admitted';
    readonly status: 200; readonly usage: SessionResponseUsage; readonly native: NativeResponse };
  readonly 'delivery-completed': { readonly prepared: OrderedDesignAuditReference; readonly preparedExchange: VerifiedExchange;
    readonly parts: readonly (VerifiedExchange & { readonly receipt: OrderedDesignAuditReference })[];
    readonly finalAdmission: OrderedDesignAuditReference; readonly verdictResponse: OrderedDesignAuditReference; readonly verdictCall: ToolCall };
  readonly 'verdict-staged': { readonly completion: OrderedDesignAuditReference; readonly issuedBy: OrderedDesignAuditReference;
    readonly verdictCall: ToolCall; readonly packet: ByteIdentity; readonly checkedVerdictSha256: string; readonly verdict: ByteIdentity };
  readonly 'acknowledgment-receipt': { readonly stage: OrderedDesignAuditReference; readonly call: ToolCall; readonly reply: ByteIdentity };
  readonly eligible: VerifiedExchange & { readonly completion: OrderedDesignAuditReference; readonly stage: OrderedDesignAuditReference;
    readonly acknowledgment: OrderedDesignAuditReference; readonly wrapper: ByteIdentity };
}
export type OrderedDesignAuditKind = keyof OrderedDesignAuditPayloads;
export type OrderedDesignAuditEvent<K extends OrderedDesignAuditKind = OrderedDesignAuditKind> = {
  [Kind in K]: { readonly format: typeof ORDERED_DESIGN_AUDIT_FORMAT; readonly id: string; readonly attemptSha256: string;
    readonly previous: OrderedDesignAuditReference | null; readonly at: string; readonly kind: Kind;
    readonly payload: OrderedDesignAuditPayloads[Kind] };
}[K];
interface RecordBytes {
  readonly payload: Readonly<Record<string, unknown>>;
  readonly ref: OrderedDesignAuditReference;
}
export interface OrderedDesignAuditPrefixInput {
  /** Independently rederived installed profile and authenticated sealed plan. */
  readonly profile: OrderedDesignSessionProfile;
  readonly plan: OrderedDesignPlan;
  readonly principal: string;
  /** Checked clock instant for this evidence read. Live authority is checked separately. */
  readonly asOf: number;
  /** Reread protected records and, for pre-append validation, the exact proposed next record. */
  readonly records: readonly Uint8Array[];
}
export interface OrderedDesignAuditInput extends OrderedDesignAuditPrefixInput {
  /** Unique terminal pointer read from the protected attempt transaction, independently of records. */
  readonly terminal: OrderedDesignAuditReference;
}
export interface OrderedDesignTerminalEvidence {
  readonly terminal: OrderedDesignAuditReference;
  readonly completion: OrderedDesignAuditReference;
  readonly stage: OrderedDesignAuditReference;
  readonly checkedVerdictSha256: string;
  readonly verdict: ByteIdentity;
  readonly packetSha256: string;
}
export type OrderedDesignAuditPrefix = { readonly attemptSha256: string } & (
  | { readonly tip: OrderedDesignAuditReference | null; readonly next: OrderedDesignAuditKind;
      readonly nextPartOrdinal: number | null; readonly terminalCandidate: null }
  | { readonly tip: OrderedDesignAuditReference; readonly next: null; readonly nextPartOrdinal: null;
      /** Checked candidate before commit. Stored eligibility needs the independent terminal pointer. */
      readonly terminalCandidate: OrderedDesignTerminalEvidence });

const refused = (): never => { throw new Error('url-ordered-design-audit-refused'); };
const canonical = (value: unknown): string => encodeCanonicalJson(value, ORDERED_DESIGN_AUDIT_RECORD_LIMITS);
const equal = (actual: unknown, expected: unknown): boolean => canonical(actual) === canonical(expected);
const requireEqual = (actual: unknown, expected: unknown): void => { if (!equal(actual, expected)) refused(); };
const exact = (value: unknown, keys: readonly string[]): value is Record<string, unknown> =>
  isRecord(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const matches = (pattern: RegExp, value: unknown): value is string => typeof value === 'string' && pattern.exec(value)?.[0] === value;
const digest = (value: unknown): value is string => matches(/^[a-f0-9]{64}$/u, value);
const identifier = (value: unknown): value is string => matches(/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/u, value);
const providerCallId = (value: unknown): value is string => matches(/^toolu_[A-Za-z0-9_-]{1,250}$/u, value);
function positiveBytes(value: unknown, maximum: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= maximum;
}
function byteIdentity(value: unknown, maxBytes: number): ByteIdentity {
  if (!exact(value, ['bytes', 'sha256']) || !positiveBytes(value.bytes, maxBytes) || !digest(value.sha256)) return refused();
  return { bytes: value.bytes, sha256: value.sha256 };
}
function textIdentity(text: string): ByteIdentity {
  return { bytes: Buffer.byteLength(text, 'utf8'), sha256: sha256(text) };
}

/** The grammar stops cleanly only after completely validating the preceding
 * records. An invalid or missing array entry goes through the refusal path. */
class EndOfPrefix {
  constructor(readonly result: OrderedDesignAuditPrefix) {}
}

/** Check the exact next append against the reread prefix. A complete
 * candidate has passed structural checks before the writer's transaction.
 * The writer still authenticates native observations and checks live authority. */
export function verifyOrderedDesignAuditPrefix(input: OrderedDesignAuditPrefixInput): OrderedDesignAuditPrefix | null {
  return verifyPrefix(input, false);
}

/** Historical evidence only. The plan metadata must come from an independent
 * protected stop seal, never from these rows. No cursor or grant is issued. */
export function verifyHistoricalOrderedDesignAuditPrefix(input: OrderedDesignAuditPrefixInput): OrderedDesignAuditPrefix | null {
  return verifyPrefix(input, true);
}
function verifyPrefix(input: OrderedDesignAuditPrefixInput, historical: boolean): OrderedDesignAuditPrefix | null {
  try {
    const { profile, plan, principal, asOf, records } = input;
    if (!isOrderedDesignSessionProfile(profile) || !(historical ? verifyHistoricalOrderedDesignPlanMetadata(plan, profile.transcript.partition) : isOrderedDesignPlanFor(plan, profile.transcript.partition))
      || !identifier(principal) || !Number.isSafeInteger(asOf)) return refused();
    const { manifest, manifestText, manifestSha256, prepared, preparedText, replies } = plan;
    const binding = manifest.binding;
    const deadline = Date.parse(binding.deadline);
    const partCount = profile.transcript.resultTurns.filter(turn => turn === 'part').length;
    if (!Number.isFinite(deadline) || new Date(deadline).toISOString() !== binding.deadline
      || !Number.isSafeInteger(binding.transferEpoch) || binding.transferEpoch < 1
      || binding.profileSha256 !== profile.digest || binding.session !== profile.input.sessionId
      || binding.basePolicySha256 !== profile.input.binding.policy || binding.run !== profile.input.binding.run
      || binding.provider !== profile.input.binding.provider || binding.role !== 'design'
      || manifest.partCount !== partCount || manifest.parts.length !== partCount || replies.length !== partCount
      || manifestText !== canonical(manifest) || sha256(manifestText) !== manifestSha256
      || preparedText !== canonical(prepared) || prepared.manifestSha256 !== manifestSha256
      || prepared.round !== binding.round || prepared.originalSha256 !== manifest.originalSha256
      || prepared.originalBytes !== manifest.originalBytes || prepared.envelopeSha256 !== manifest.envelopeSha256
      || prepared.envelopeBytes !== manifest.envelopeBytes || prepared.encoding !== binding.encoding || prepared.partCount !== partCount
      || prepared.instructionProfileSha256 !== sha256(profile.input.systemPrompt)
      || !Array.isArray(records) || records.length > 13 + partCount * 5) return refused();
    const attemptSha256 = sha256(canonical({ manifestSha256, sourceBinding: profile.input.binding.sourceBinding, principal }));
    const recordCount = records.length;
    const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
    const eventIds = new Set<string>(), requestIds = new Set<string>(), callIds = new Set<string>();
    let cursor = 0, previous: OrderedDesignAuditReference | null = null, previousTime = -Infinity;
    const read = (kind: OrderedDesignAuditKind, ordinal: number | null = null): RecordBytes => {
      if (cursor === recordCount) throw new EndOfPrefix({ attemptSha256, tip: previous, next: kind, nextPartOrdinal: ordinal, terminalCandidate: null });
      const supplied = records[cursor++];
      if (!(supplied instanceof Uint8Array) || !positiveBytes(supplied.byteLength, ORDERED_DESIGN_AUDIT_RECORD_LIMITS.maxBytes)) return refused();
      const bytes = Uint8Array.from(supplied);
      const text = decoder.decode(bytes);
      const value = parseBoundedJson(text, ORDERED_DESIGN_AUDIT_RECORD_LIMITS);
      if (!exact(value, ['format', 'id', 'attemptSha256', 'previous', 'at', 'kind', 'payload'])
        || value.format !== ORDERED_DESIGN_AUDIT_FORMAT || value.kind !== kind || value.attemptSha256 !== attemptSha256
        || !identifier(value.id) || eventIds.has(value.id) || typeof value.at !== 'string' || !isRecord(value.payload)
        || !equal(value.previous, previous) || canonical(value) !== text) return refused();
      const at = Date.parse(value.at);
      if (!Number.isFinite(at) || new Date(at).toISOString() !== value.at || at < previousTime || at >= deadline || at > asOf) return refused();
      previousTime = at;
      eventIds.add(value.id);
      previous = { id: value.id, sha256: sha256(bytes) };
      return { payload: value.payload, ref: previous };
    };
    const call = (value: unknown, name: ToolCall['name'], inputSha256?: string): ToolCall => {
      if (!exact(value, ['id', 'name', 'inputSha256']) || !providerCallId(value.id) || callIds.has(value.id)
        || value.id === profile.transcript.logical.toolUseId || value.name !== name || !digest(value.inputSha256)
        || (inputSha256 !== undefined && value.inputSha256 !== inputSha256)) return refused();
      callIds.add(value.id);
      return { id: value.id, name, inputSha256: value.inputSha256 };
    };

    const { transcript } = profile;
    const preparedEvent = read('prepared');
    const poll = call(preparedEvent.payload.call, transcript.prepared.tool,
      sha256(canonical({ argv: ['dossier', transcript.prepared.operation, binding.run] })));
    const preparedReply = textIdentity(canonical({ kind: 'session-control', ok: true, state: 'events', events: [{ event: transcript.prepared.event, ...prepared }] }));
    requireEqual(preparedEvent.payload, { call: poll, prepared: textIdentity(preparedText), reply: preparedReply });
    if (preparedReply.bytes > transcript.partition.preparedBytes) return refused();

    const consumed: OrderedDesignAuditReference[] = [];
    const exchange = (receipt: OrderedDesignAuditReference,
      continuation: { readonly tool: ToolCall['name']; readonly inputSha256?: string } | { readonly acknowledgmentWrapper: ByteIdentity }) => {
      consumed.push(receipt);
      const admission = read('request-admitted');
      const { requestId, received, forwarded, logical, results, transcriptSha256 } = admission.payload;
      if (!matches(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u, requestId)
        || requestIds.has(requestId) || !digest(transcriptSha256) || !Array.isArray(results) || results.length !== consumed.length) return refused();
      requestIds.add(requestId);
      const checkedResults: ConsumedResult[] = results.map((value: unknown, index: number) => {
        if (!exact(value, ['receipt', 'wrapper'])) return refused();
        requireEqual(value.receipt, consumed[index]);
        return { receipt: consumed[index]!, wrapper: byteIdentity(value.wrapper, REQUEST_BYTES) };
      });
      const scope = { requestId, received: byteIdentity(received, REQUEST_BYTES), forwarded: byteIdentity(forwarded, REQUEST_BYTES),
        route: 'messages' };
      requireEqual(admission.payload, { ...scope, logical: byteIdentity(logical, REQUEST_BYTES), results: checkedResults, transcriptSha256 });
      const wrapper = checkedResults.at(-1)!.wrapper;
      if ('acknowledgmentWrapper' in continuation) requireEqual(wrapper, continuation.acknowledgmentWrapper);
      const sendAttempt = read('send-attempt');
      const attempt = { ...scope, admission: admission.ref };
      requireEqual(sendAttempt.payload, { ...attempt, outcome: 'attempted' });
      const sendOutcome = read('send-outcome');
      const send = { ...attempt, sendAttempt: sendAttempt.ref };
      requireEqual(sendOutcome.payload, { ...send, outcome: 'local-request-flushed' });
      const response = read('response-admitted');
      const native = response.payload.native;
      if (!isRecord(native)) return refused();
      const usage = response.payload.usage;
      if (!exact(usage, ['inputTokens', 'outputTokens', 'cacheCreationInputTokens', 'cacheReadInputTokens'])) return refused();
      const remaining = sessionProfileRemainingTokens(usage);
      if (!remaining.ok) return refused();
      const next = 'tool' in continuation ? call(native.tool, continuation.tool, continuation.inputSha256) : null;
      const { stopReason, textBlocks } = next === null ? transcript.terminal : transcript.continuation;
      requireEqual(response.payload, { ...send, sendOutcome: sendOutcome.ref, outcome: 'response-admitted', status: 200, usage, native: {
        ...byteIdentity({ bytes: native.bytes, sha256: native.sha256 }, RESPONSE_BYTES), content: 'messages-event-stream', stopReason, textBlocks, tool: next,
      } });
      const events: VerifiedExchange = { admission: admission.ref, sendAttempt: sendAttempt.ref, sendOutcome: sendOutcome.ref, response: response.ref };
      return { events, next, wrapper, remaining: remaining.value.remaining };
    };

    const parts: Array<{ readonly receipt: OrderedDesignAuditReference } & VerifiedExchange> = [];
    const selectorSha256 = (index: number): string => sha256(canonical({ path: manifest.parts[index]!.path }));
    const preparedExchange = exchange(preparedEvent.ref, { tool: transcript.numbered.tool, inputSha256: selectorSha256(0) });
    let prior = preparedExchange;
    for (let index = 0; index < manifest.partCount; index++) {
      const entry = manifest.parts[index]!, reply = replies[index]!;
      if (entry.ordinal !== index + 1 || reply.manifestSha256 !== manifestSha256 || reply.ordinal !== entry.ordinal
        || entry.path !== `round-${binding.round}/design-view-part-${entry.ordinal}.json`) return refused();
      const receipt = read('part-receipt', index + 1);
      requireEqual(receipt.payload, { ordinal: entry.ordinal, issuedBy: prior.events.response, call: prior.next,
        reply: byteIdentity({ bytes: reply.bytes, sha256: reply.sha256 }, transcript.partition.replyBytes) });
      const last = index + 1 === manifest.partCount;
      prior = exchange(receipt.ref, last ? { tool: transcript.verdict.tool } : { tool: transcript.numbered.tool, inputSha256: selectorSha256(index + 1) });
      parts.push({ receipt: receipt.ref, ...prior.events });
    }
    if (prior.next === null) return refused();
    const completion = read('delivery-completed');
    requireEqual(completion.payload, { prepared: preparedEvent.ref, preparedExchange: preparedExchange.events, parts,
      finalAdmission: prior.events.admission, verdictResponse: prior.events.response, verdictCall: prior.next });

    const stage = read('verdict-staged');
    const verdict = byteIdentity(stage.payload.verdict, transcript.maxVerdictBytes);
    const checkedVerdictSha256 = stage.payload.checkedVerdictSha256;
    if (!digest(checkedVerdictSha256)) return refused();
    requireEqual(stage.payload, { completion: completion.ref, issuedBy: prior.events.response, verdictCall: prior.next,
      packet: byteIdentity({ bytes: manifest.originalBytes, sha256: manifest.originalSha256 }, REQUEST_BYTES), checkedVerdictSha256, verdict });
    const acknowledgment = read('acknowledgment-receipt');
    const stagedText = canonical({ kind: 'dossier-result', ok: true, stdout: canonical({
      outcome: transcript.verdict.stagedOutcome, eligibility: transcript.verdict.eligibility, packetSha256: manifest.originalSha256,
    }), stderr: '', exit: 0 });
    const stagedReply = textIdentity(stagedText);
    if (stagedReply.bytes > transcript.maxAcknowledgmentBytes) return refused();
    requireEqual(acknowledgment.payload, { stage: stage.ref, call: prior.next, reply: stagedReply });
    const wrapper = transcript.wrapper;
    const stagedMessage = { role: wrapper.resultRole, content: [{ type: wrapper.resultType, tool_use_id: prior.next.id,
      cache_control: wrapper.cache, content: [{ type: wrapper.textBlockType, text: wrapper.leading + stagedText + wrapper.trailing },
        { type: wrapper.textBlockType, text: sessionProfileReminderText(prior.remaining) }] }] };
    const ack = exchange(acknowledgment.ref, { acknowledgmentWrapper: textIdentity(canonical(stagedMessage)) });
    const eligibility = read('eligible');
    requireEqual(eligibility.payload, { completion: completion.ref, stage: stage.ref, acknowledgment: acknowledgment.ref,
      wrapper: ack.wrapper, ...ack.events });
    if (cursor !== recordCount) return refused();
    return deepFreeze({ attemptSha256, tip: eligibility.ref, next: null, nextPartOrdinal: null, terminalCandidate: {
      terminal: eligibility.ref, completion: completion.ref, stage: stage.ref, checkedVerdictSha256, verdict, packetSha256: manifest.originalSha256,
    } });
  } catch (error) { return error instanceof EndOfPrefix ? deepFreeze(error.result) : null; }
}

/** Reverify the fully stored linkage against the independently read terminal
 * pointer. The protected store authenticates provenance and the unique
 * disposition. Part bodies stay in protected input, with their independently
 * checked wrapper and actual/logical request identities linked here. */
export function verifyOrderedDesignTerminalEvidence(input: OrderedDesignAuditInput): OrderedDesignTerminalEvidence | null {
  return verifyTerminal(input, false);
}
export function verifyHistoricalOrderedDesignTerminalEvidence(input: OrderedDesignAuditInput): OrderedDesignTerminalEvidence | null {
  return verifyTerminal(input, true);
}
function verifyTerminal(input: OrderedDesignAuditInput, historical: boolean): OrderedDesignTerminalEvidence | null {
  try {
    const terminal = input.terminal;
    if (!exact(terminal, ['id', 'sha256']) || !identifier(terminal.id) || !digest(terminal.sha256)) return refused();
    const result = verifyPrefix(input, historical);
    if (result === null || result.next !== null || !equal(result.tip, terminal)) return refused();
    return result.terminalCandidate;
  } catch { return null; }
}
