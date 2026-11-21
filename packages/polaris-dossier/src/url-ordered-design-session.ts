import { encodeCanonicalJson, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { deepFreeze, isRecord, sha256 } from '@syzygy/support';
import type { ReleaseReply } from './session-broker.js';
import { screenOrderedDesignRequest, type OrderedDesignRequestChecks } from './session-egress-policy.js';
import { isOrderedDesignSessionProfile, matchesOrderedDesignContinuationResponse, matchesOrderedDesignTerminalResponse,
  sessionProfileRemainingTokens, type OrderedDesignSessionProfile } from './session-profile.js';
import { readSessionRelayAuditEvidence, type SessionAuditEvent, type SessionRelay, type SessionRelayPorts,
  type SessionResponseObservation } from './session-relay.js';
import { decodeSessionResponse, type SessionResponseUsage } from './session-response.js';
import { isOrderedDesignPlanFor, materializeOrderedDesignPart, type OrderedDesignPlan } from './url-design-delivery.js';
import type { OrderedDesignAuditPayloads, OrderedDesignAuditReference } from './url-ordered-design-audit.js';
import type { OrderedDesignAuditWriter } from './url-ordered-design-writer.js';
import type { createUrlSessionBudget, UrlOrderedDesignTurnReservation } from './url-session-budget.js';

type Call = OrderedDesignAuditPayloads['prepared']['call'];
type Admission = OrderedDesignAuditPayloads['request-admitted'];
type Exchange = Pick<OrderedDesignAuditPayloads['eligible'], 'admission' | 'sendAttempt' | 'sendOutcome' | 'response'>;
type Scope = Pick<Admission, 'requestId' | 'route' | 'received' | 'forwarded'>;
interface Receipt { readonly call: Call; readonly usage: SessionResponseUsage; readonly receipt: OrderedDesignAuditReference;
  readonly reply: Admission['results'][number]['wrapper'] }
interface Response { readonly call: Call; readonly usage: SessionResponseUsage }
interface InFlight {
  readonly scope: Scope;
  readonly admission: OrderedDesignAuditReference | null;
  readonly wrapper: Admission['results'][number]['wrapper'] | null;
  step: 'send-attempt' | 'send-outcome' | 'response-admitted';
  sendAttempt?: OrderedDesignAuditReference;
  sendOutcome?: OrderedDesignAuditReference;
}

interface Options {
  readonly profile: OrderedDesignSessionProfile;
  readonly plan: OrderedDesignPlan;
  readonly principal: string;
  readonly relay: () => SessionRelay | undefined;
  readonly writer: OrderedDesignAuditWriter;
  readonly budget: Pick<ReturnType<typeof createUrlSessionBudget>, 'current' | 'reserve' | 'observeUsage' | 'uncertainAttempt' | 'holdOrderedDesignTurns'>;
  /** Private exact sealed bytes. This port must revalidate the current input. */
  readonly envelope: () => Uint8Array;
  readonly current: () => boolean | Promise<boolean>;
  /** Recheck protected authority and any held input lease at the send/release edge. */
  readonly assertCurrent: () => void;
  /** Validate and stage this exact submission through the ordinary checked producer. */
  readonly stageVerdict: (input: { readonly stdin: string; readonly call: Call; readonly completion: OrderedDesignAuditReference;
    readonly assertCurrent: () => void }) => Promise<string | null>;
}

const refused = (): Error => new Error('url-ordered-design-session-refused');
const identify = (text: string) => ({ sha256: sha256(text), bytes: Buffer.byteLength(text, 'utf8') });
const byteIdentity = (value: { readonly digest: string; readonly bytes: number }) => ({ sha256: value.digest, bytes: value.bytes });
type RetireReason = 'refused' | 'transport-uncertain' | 'interrupted';

function nativeResponse(native: NonNullable<SessionAuditEvent['response']>): OrderedDesignAuditPayloads['response-admitted']['native'] {
  if (native.content !== 'messages-event-stream') throw refused();
  const identity = { ...byteIdentity(native), content: native.content } as const;
  if (native.stopReason === 'tool_use' && native.textBlocks === 0 && native.tool)
    return { ...identity, stopReason: 'tool_use', textBlocks: 0, tool: native.tool };
  if (native.stopReason === 'end_turn' && native.textBlocks === 1 && native.tool === null)
    return { ...identity, stopReason: 'end_turn', textBlocks: 1, tool: null };
  throw refused();
}

/** Host-only cursor for one exact sealed transfer. A role supplies an invocation,
 * and only the selected relay contributes admitted request/response evidence. */
export function createOrderedDesignSession(options: Options) {
  const { profile, plan, principal, relay, writer, budget, envelope, current, assertCurrent, stageVerdict } = options;
  if (!isOrderedDesignSessionProfile(profile) || !isOrderedDesignPlanFor(plan, profile.transcript.partition)) throw refused();
  const { transcript } = profile;
  const { binding, parts, originalBytes, originalSha256 } = plan.manifest;
  const canonical = (value: unknown) => encodeCanonicalJson(value, transcript.requestLimits);
  const equal = (left: unknown, right: unknown): boolean => canonical(left) === canonical(right);
  const subject = canonical({ binding: profile.input.binding, project: binding.project, pin: binding.pin, principal });
  const deadline = Date.parse(binding.deadline);
  const pollInput = { argv: ['dossier', transcript.prepared.operation, binding.run] };
  const verdictArgv = ['dossier', transcript.verdict.operation, '/work', '--submit', `round-${binding.round}/verdict.json`, '--stdin'];
  const receipts: Receipt[] = [], exchanges: Exchange[] = [];
  let selectedRelay: SessionRelay | undefined;
  let initial = true, stopped = false, busy = false, eligible = false;
  let initialBudgetPending = false, budgetReservation: UrlOrderedDesignTurnReservation | null = null;
  let request: OrderedDesignRequestChecks | null = null, pending: InFlight | null = null, response: Response | null = null;
  let checkedResponse: { readonly native: NonNullable<SessionAuditEvent['response']>; readonly usage: SessionResponseUsage } | null = null;
  let completion: OrderedDesignAuditReference | null = null, stage: OrderedDesignAuditReference | null = null;
  let submission: Readonly<Record<string, unknown>> | null = null;
  let retirement: RetireReason | null = null, retiring: Promise<void> | null = null;
  const selected = (): SessionRelay => {
    const actual = relay();
    if (actual === undefined || (selectedRelay !== undefined && actual !== selectedRelay)) throw refused();
    return selectedRelay ??= actual;
  };
  const requireLive = (): void => {
    if (stopped || !selected().healthy() || !(Date.now() < deadline)
      || !(budgetReservation === null ? budget.current() : budgetReservation.current())) throw refused();
    assertCurrent();
  };
  const requireCurrent = async (): Promise<void> => {
    requireLive();
    if (await current() !== true) throw refused();
    requireLive();
  };
  const requireNextSend = (): void => {
    requireLive();
    if (budgetReservation?.canSend() !== true) throw refused();
  };
  const stop = (reason: RetireReason): void => {
    if (stopped || eligible) return;
    stopped = true;
    retirement = reason;
    if (initialBudgetPending) budget.uncertainAttempt('design');
    budgetReservation?.retire();
    response = null;
    request = null;
    checkedResponse = null;
    submission = null;
  };
  const flushRetirement = () => retirement === null ? Promise.resolve() : retiring ??= writer.retire(retirement);
  const retire = async (reason: RetireReason): Promise<void> => {
    stop(reason);
    if (!busy) await flushRetirement();
  };
  const serialize = async <T>(operation: () => Promise<T>): Promise<T> => {
    if (busy || stopped || eligible) throw refused();
    busy = true;
    try { return await operation(); }
    catch {
      stop('refused');
      throw refused();
    } finally {
      try { await flushRetirement(); } catch { /* An uncertain write cannot authorize continuation. */ }
      busy = false;
    }
  };

  const checkRequest = (bytes: Uint8Array, detectors: Parameters<typeof screenOrderedDesignRequest>[2]): ReturnType<typeof screenOrderedDesignRequest> => {
    if (stopped || eligible || busy || initial || request !== null || pending !== null || receipts.length !== exchanges.length + 1) throw refused();
    requireLive();
    const prepared = receipts[0]!;
    const asResult = ({ call, usage }: Receipt) => ({ toolUseId: call.id, usage });
    const checks = screenOrderedDesignRequest(bytes, { profile, plan, envelope: envelope(), prepared: asResult(prepared),
      parts: receipts.slice(1, parts.length + 1).map(asResult),
      ...(submission === null ? {} : { acknowledgment: { ...asResult(receipts.at(-1)!), input: submission } }) }, detectors);
    if (checks.ok) request = checks.value;
    return checks;
  };

  const checkResponse = (bytes: Uint8Array, contentType: string, scanSecrets: (text: string) => boolean): ReturnType<SessionRelayPorts['response']> => {
    try {
      requireLive();
      if (busy || eligible || checkedResponse !== null || pending?.step !== 'response-admitted'
        || !/^text\/event-stream(?:\s*;\s*charset=utf-8)?$/iu.test(contentType))
        throw refused();
      const decoded = decodeSessionResponse(bytes, contentType, profile.input.binding.model, scanSecrets);
      if (!decoded.ok) throw refused();
      const charged = initial
        ? budget.observeUsage('design', decoded.usage)
        : budgetReservation?.observeUsage(decoded.usage);
      initialBudgetPending = false;
      if (charged !== true || !sessionProfileRemainingTokens(decoded.usage).ok) throw refused();
      const accept = (observation: SessionResponseObservation) => {
        const result = deepFreeze({ ok: true, usage: decoded.usage, observation } as const);
        checkedResponse = deepFreeze({ native: { ...result.observation, content: 'messages-event-stream',
          digest: sha256(bytes), bytes: bytes.byteLength }, usage: result.usage });
        return result;
      };
      if (receipts.length === transcript.resultTurns.length) {
        if (!matchesOrderedDesignTerminalResponse(profile, decoded.stopReason, decoded.content)) throw refused();
        return accept({ stopReason: 'end_turn', textBlocks: 1, tool: null });
      }
      const block = decoded.content[0], turn = transcript.resultTurns[receipts.length];
      if (!isRecord(block) || typeof block.id !== 'string' || block.id === transcript.logical.toolUseId
        || receipts.some(receipt => receipt.call.id === block.id)) throw refused();
      const id = block.id;
      let name: Call['name'], input: Readonly<Record<string, unknown>>;
      if (turn === 'prepared') { name = transcript.prepared.tool; input = pollInput; }
      else if (turn === 'part') { name = transcript.numbered.tool; input = { path: parts[receipts.length - 1]!.path }; }
      else {
        const stdin = isRecord(block.input) ? block.input.stdin : null;
        if (turn !== 'verdict-acknowledgment' || typeof stdin !== 'string' || Buffer.byteLength(stdin) > transcript.maxVerdictBytes) throw refused();
        name = transcript.verdict.tool;
        input = { argv: verdictArgv, stdin };
      }
      if (!matchesOrderedDesignContinuationResponse(profile, { content: decoded.content, stopReason: decoded.stopReason,
        resultIndex: receipts.length, expectedCall: { type: 'tool_use', id, name, input } })) throw refused();
      return accept({ stopReason: 'tool_use', textBlocks: 0, tool: { id, name, inputSha256: sha256(canonical(input)) } });
    } catch { return { ok: false }; }
  };

  const observe = async (event: SessionAuditEvent): Promise<void> => {
    const actual = selected();
    const evidence = readSessionRelayAuditEvidence(actual, event);
    if (evidence === null || canonical(event.subject) !== subject) throw refused();
    if (event.event === 'attempt-refused' || event.event === 'response-refused' || event.event === 'transport-failed') {
      await retire(event.event === 'transport-failed' ? 'transport-uncertain' : 'refused');
      return;
    }
    await serialize(async () => {
      await requireCurrent();
      if (event.route !== 'messages' || event.received === null || event.admission === null) throw refused();
      const scope: Scope = { requestId: event.requestId, route: event.route, received: byteIdentity(event.received), forwarded: byteIdentity(event.admission) };
      if (event.event === 'attempt-allowed') {
        if (pending !== null || response !== null) throw refused();
        if (initial) {
          if (event.consumedToolResults.length !== 0 || !budget.reserve('design', event.admission)) throw refused();
          initialBudgetPending = true;
          pending = { scope, admission: null, wrapper: null, step: 'send-attempt' };
          return;
        }
        const checked = request;
        request = null;
        const exactResult = event.consumedToolResults[0], latest = receipts.at(-1);
        if (checked === null || !equal(checked.received, scope.received) || !equal(checked.forwarded, scope.forwarded)
          || checked.resultWrappers.length !== receipts.length || event.consumedToolResults.length !== 1
          || !exactResult || !latest || exactResult.toolUseId !== latest.call.id || !equal(byteIdentity(exactResult), latest.reply)
          || budgetReservation?.reserve(event.admission) !== true)
          throw refused();
        const results = checked.resultWrappers.map(({ toolUseId, wrapper }, index) => {
          const receipt = receipts[index]!;
          if (toolUseId !== receipt.call.id) throw refused();
          return { receipt: receipt.receipt, wrapper };
        });
        const admission = await writer.append('request-admitted', { ...scope, results, logical: checked.logical, transcriptSha256: checked.transcriptSha256 });
        pending = { scope, admission, wrapper: results.at(-1)!.wrapper, step: 'send-attempt' };
        await requireCurrent();
        return;
      }
      const active = pending;
      if (!active || active.step !== event.event || !equal(active.scope, scope)) throw refused();
      if (event.event === 'send-attempt' && event.outcome === 'attempted') {
        if (active.admission) active.sendAttempt = await writer.append('send-attempt', { ...scope, admission: active.admission, outcome: event.outcome });
        active.step = 'send-outcome';
      } else if (event.event === 'send-outcome' && event.outcome === 'local-request-flushed') {
        if (active.admission && active.sendAttempt) active.sendOutcome = await writer.append('send-outcome',
          { ...scope, admission: active.admission, sendAttempt: active.sendAttempt, outcome: event.outcome });
        active.step = 'response-admitted';
      } else if (event.event === 'response-admitted' && event.outcome === 'response-admitted' && event.status === 200) {
        const native = event.response, { usage } = evidence;
        const checked = checkedResponse;
        checkedResponse = null;
        if (usage === null || native === null || checked === null || !equal(checked.native, native) || !equal(checked.usage, usage)) throw refused();
        pending = null;
        if (initial) {
          if (native.stopReason !== 'tool_use' || native.textBlocks !== 0 || native.tool?.name !== transcript.prepared.tool
            || native.tool.inputSha256 !== sha256(canonical(pollInput))) throw refused();
          initial = false;
          response = { call: native.tool, usage };
        } else {
          const { admission, sendAttempt, sendOutcome, wrapper } = active;
          if (!admission || !sendAttempt || !sendOutcome || !wrapper) throw refused();
          const exactResponse = nativeResponse(native);
          const admitted = await writer.append('response-admitted',
            { ...scope, admission, sendAttempt, sendOutcome, native: exactResponse, usage, outcome: event.outcome, status: event.status });
          const exchange = { admission, sendAttempt, sendOutcome, response: admitted };
          exchanges.push(exchange);
          if (native.tool) response = { call: native.tool, usage };
          else {
            if (!completion || !stage || submission === null || budgetReservation?.complete() !== true) throw refused();
            await requireCurrent();
            await writer.append('eligible', { ...exchange, completion, stage, acknowledgment: receipts.at(-1)!.receipt, wrapper });
            requireLive();
            eligible = true;
            submission = null;
          }
        }
      } else throw refused();
      await requireCurrent();
    });
  };

  const issueReply = (input: unknown, release: ReleaseReply): Promise<void> => serialize(async () => {
    const invocation = parseBoundedJson(canonical(input), transcript.requestLimits);
    await requireCurrent();
    const issued = response;
    if (initial || issued === null || !selected().responseFlushed() || !isRecord(invocation) || Object.keys(invocation).length !== 2
      || typeof invocation.tool !== 'string' || !isRecord(invocation.input)
      || issued.call.name !== `mcp__syzygy__${invocation.tool}` || issued.call.inputSha256 !== sha256(canonical(invocation.input))) throw refused();
    response = null;
    const ordinal = receipts.length;
    let reply: string, receipt: OrderedDesignAuditReference;
    if (ordinal === 0) {
      budgetReservation = budget.holdOrderedDesignTurns(transcript.resultTurns.length, deadline);
      requireNextSend();
      reply = canonical({ kind: 'session-control', ok: true, state: 'events', events: [{ event: transcript.prepared.event, ...plan.prepared }] });
      receipt = await writer.append('prepared', { call: issued.call, prepared: identify(plan.preparedText), reply: identify(reply) });
    } else if (ordinal <= parts.length) {
      requireNextSend();
      const prior = exchanges[ordinal - 1]!;
      reply = materializeOrderedDesignPart(plan, envelope(), parts[ordinal - 1]!.path);
      receipt = await writer.append('part-receipt', { ordinal, issuedBy: prior.response, call: issued.call, reply: identify(reply) });
    } else {
      requireNextSend();
      const prior = exchanges.at(-1)!;
      if (ordinal !== parts.length + 1 || exchanges.length !== ordinal || completion !== null || !Array.isArray(invocation.input.argv)
        || typeof invocation.input.stdin !== 'string'
        || Buffer.byteLength(invocation.input.stdin) > transcript.maxVerdictBytes
        || !equal(invocation.input, { argv: verdictArgv, stdin: invocation.input.stdin })) throw refused();
      const stdin = invocation.input.stdin;
      completion = await writer.append('delivery-completed', { prepared: receipts[0]!.receipt, preparedExchange: exchanges[0]!,
        parts: receipts.slice(1).map(({ receipt }, index) => ({ receipt, ...exchanges[index + 1]! })),
        finalAdmission: prior.admission, verdictResponse: prior.response, verdictCall: issued.call });
      await requireCurrent();
      requireNextSend();
      const checkedVerdictSha256 = await stageVerdict({ stdin, call: issued.call, completion, assertCurrent: requireNextSend });
      if (checkedVerdictSha256 === null) throw refused();
      await requireCurrent();
      stage = await writer.append('verdict-staged', { completion, issuedBy: prior.response, verdictCall: issued.call,
        packet: { bytes: originalBytes, sha256: originalSha256 }, checkedVerdictSha256, verdict: identify(stdin) });
      reply = canonical({ kind: 'dossier-result', ok: true, exit: 0, stderr: '',
        stdout: canonical({ outcome: transcript.verdict.stagedOutcome, eligibility: transcript.verdict.eligibility, packetSha256: originalSha256 }) });
      receipt = await writer.append('acknowledgment-receipt', { stage, call: issued.call, reply: identify(reply) });
      submission = Object.freeze({ argv: Object.freeze([...verdictArgv]), stdin });
    }
    await requireCurrent();
    release(parseBoundedJson(reply, transcript.requestLimits), requireNextSend);
    receipts.push({ ...issued, receipt, reply: identify(reply) });
  });
  const readTerminal = async () => {
    if (!eligible || stopped || busy) throw refused();
    busy = true;
    try {
      await requireCurrent();
      const terminal = await writer.readTerminal();
      await requireCurrent();
      return terminal;
    } catch {
      stopped = true;
      throw refused();
    } finally { busy = false; }
  };
  return Object.freeze({ checkRequest, checkResponse, observe, issueReply, retire, readTerminal });
}
