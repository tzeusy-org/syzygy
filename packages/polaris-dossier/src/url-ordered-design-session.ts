import { encodeCanonicalJson, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { deepFreeze, isRecord, sha256 } from '@syzygy/support';
import type { ReleaseReply } from './session-broker.js';
import { screenOrderedDesignInitialRequest, screenOrderedDesignRequest, type OrderedDesignRequestChecks } from './session-egress-policy.js';
import { isOrderedDesignSessionProfile, matchesOrderedDesignContinuationResponse, matchesOrderedDesignTerminalResponse,
  sessionProfileRemainingTokens, type OrderedDesignSessionProfile } from './session-profile.js';
import { readSessionRelayAuditEvidence, type SessionAuditEvent, type SessionRelay, type SessionMessageResponseDecision,
  type SessionResponseObservation } from './session-relay.js';
import { decodeSessionResponse, type SessionResponseUsage } from './session-response.js';
import { isOrderedDesignPlanFor, materializeOrderedDesignPart, type OrderedDesignPlan } from './url-design-delivery.js';
import { boundOrderedDesignTransfer, type OrderedDesignTransferBounds } from './url-ordered-design-bounds.js';
import type { OrderedDesignAuditPayloads, OrderedDesignAuditReference } from './url-ordered-design-audit.js';
import { hasOrderedDesignReadObserver, type OrderedDesignAuditWriter } from './url-ordered-design-writer.js';
import { runOrderedDesignScreen, type OrderedScreenProgram } from './url-ordered-design-screen.js';
import { ORDERED_SCREEN_LIMITS, type OrderedScreenInput, type OrderedScreenObservation } from './url-ordered-design-screen-protocol.js';
import { createOrderedDesignWorkBudget, reserveOrderedDesignWork, type OrderedDesignWorkEnforcement, type OrderedDesignWorkStart } from './url-ordered-design-work-budget.js';
import type { UrlOrderedCpuReservation } from './url-run-cpu-budget.js';
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

export interface OrderedDesignSessionWork {
  readonly enforcement: OrderedDesignWorkEnforcement;
  readonly runtimeSha256: string;
  readonly remainingRunCpuMicroseconds: () => number;
  readonly reserveRemainingCpuMicroseconds: (required: number) => UrlOrderedCpuReservation | null;
  readonly cpuMicroseconds: () => number;
  readonly chargeScreenCpuMicroseconds: (value: number) => void;
}
export type OrderedDesignSessionScreening = { readonly kind: 'bounded-worker'; readonly program: OrderedScreenProgram;
  readonly policyBytes: Uint8Array; readonly planInput: Omit<Parameters<typeof import('./url-design-delivery.js').planOrderedDesignBytes>[0], 'envelope'> }
  | { readonly kind: 'test-only-detectors'; readonly detectors: Parameters<typeof screenOrderedDesignRequest>[2] };

interface Options {
  readonly screening: OrderedDesignSessionScreening;
  readonly work: OrderedDesignSessionWork;
  readonly profile: OrderedDesignSessionProfile;
  readonly plan: OrderedDesignPlan;
  readonly principal: string;
  /** A lower host request cap, when selected before this transfer. */
  readonly requestMaxBytes?: number;
  readonly relay: () => SessionRelay | undefined;
  readonly writer: OrderedDesignAuditWriter;
  readonly budget: Pick<ReturnType<typeof createUrlSessionBudget>, 'current' | 'reserve' | 'observeUsage' | 'uncertainAttempt' | 'holdOrderedDesignTurns'>;
  /** Private exact sealed bytes. This port must revalidate the current input. */
  readonly envelope: () => Uint8Array;
  /** Fully validate the current protected product, renewing only through genuine reproduction. */
  readonly current: () => boolean | Promise<boolean>;
  /** Recheck protected authority and any held input lease at the send/release edge. */
  readonly assertCurrent: () => void;
  /** Cheap revocation and machine guard while the trusted worker processes held
   * immutable bytes. Full protected-input validation still gates its entry and
   * result. Omit to use assertCurrent throughout. */
  readonly assertProcessingCurrent?: () => void;
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

const issuedSessions = new WeakSet<object>(), productionSessions = new WeakMap<object, OrderedDesignSessionProfile>();
export const isOrderedDesignSession = (value: unknown): boolean =>
  value !== null && typeof value === 'object' && issuedSessions.has(value);
export const isProductionOrderedDesignSession = (value: unknown, expectedProfile?: OrderedDesignSessionProfile): boolean =>
  value !== null && typeof value === 'object' && productionSessions.has(value) && (expectedProfile === undefined || productionSessions.get(value) === expectedProfile);

/** Host-only cursor for one exact sealed transfer. A role supplies an invocation,
 * and only the selected relay contributes admitted request/response evidence. */
export function createOrderedDesignSession(options: Options) {
  const { profile, plan, principal, relay, writer, budget, envelope, current, assertCurrent, stageVerdict } = options;
  if (!hasOrderedDesignReadObserver(writer) || !isOrderedDesignSessionProfile(profile) || !isOrderedDesignPlanFor(plan, profile.transcript.partition)) throw refused();
  const { transcript } = profile;
  const { work, screening } = options;
  const policy = screening.kind === 'bounded-worker' ? Uint8Array.from(screening.policyBytes) : null;
  if (work.enforcement.runtimeSha256 !== work.runtimeSha256 || screening.kind === 'bounded-worker' && (sha256(policy!) !== profile.input.binding.policy
    || screening.program.worker.sha256 !== work.enforcement.workerSha256
    || (['request', 'response'] as const).some(kind => work.enforcement.operations[kind].cpuMicroseconds <= 2 * (ORDERED_SCREEN_LIMITS.cpuSeconds + 1) * 1_000_000
      || work.enforcement.operations[kind].wallMilliseconds <= ORDERED_SCREEN_LIMITS.wallMilliseconds))) throw refused();
  type WorkBudget = ReturnType<typeof createOrderedDesignWorkBudget>;
  let workBudget: WorkBudget | null = null;
  let activeRead: ((bytes: number) => void) | null = null;
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
  let admittedInitial = false, transferBounds: OrderedDesignTransferBounds | null = null;
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
  const requireAuthority = (): void => {
    if (stopped || (workBudget !== null && !workBudget.current()) || !selected().healthy() || !(Date.now() < deadline)
      || !(budgetReservation === null ? budget.current() : budgetReservation.current())) throw refused();
  };
  const requireLive = (): void => { requireAuthority(); assertCurrent(); };
  const requireProcessingCurrent = (): void => {
    requireAuthority();
    (options.assertProcessingCurrent ?? assertCurrent)();
  };
  const requireCurrent = async (): Promise<void> => {
    requireAuthority();
    // The genuine current port may reproduce an expired short-lived product.
    // No result is released until its replacement passes the full check.
    if (await current() !== true) throw refused();
    // current() already performed the full protected-product check. Recheck
    // continuous authority after its await; synchronous release guards stay full.
    requireAuthority();
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
    workBudget?.retire();
    response = null;
    request = null;
    checkedResponse = null;
    submission = null;
  };
  const flushRetirement = () => retirement === null ? Promise.resolve() : retiring ??= auditOperation('audit', () => writer.retire(retirement!));
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

  const openOperation = (operation: 'request' | 'response' | 'tool' | 'audit' | 'terminal', turn: number, start?: OrderedDesignWorkStart) => {
    const cap = work.enforcement.operations[operation];
    const began = start?.monotonicMilliseconds ?? performance.now(), cpu = start?.cpuMicroseconds ?? work.cpuMicroseconds();
    const expires = Math.min(deadline, workBudget?.snapshot().expiresAt ?? deadline, (start?.wallMilliseconds ?? Date.now()) + cap.wallMilliseconds);
    const ledger = stopped ? null : workBudget;
    const ticket = ledger?.begin(operation, turn) ?? null;
    const remaining = work.remainingRunCpuMicroseconds();
    if (!Object.values(cap).every(value => Number.isSafeInteger(value) && value >= 0) || cap.cpuMicroseconds <= 0 || cap.wallMilliseconds <= 0
      || !Number.isSafeInteger(cpu) || cpu < 0 || !Number.isSafeInteger(remaining) || remaining < cap.cpuMicroseconds
      || (ledger !== null && ticket === null) || !(Date.now() < expires)) throw refused();
    let reads = 0;
    const check = (): void => {
      const actualCpu = work.cpuMicroseconds(), available = work.remainingRunCpuMicroseconds();
      if (!Number.isSafeInteger(actualCpu) || actualCpu < cpu || !Number.isSafeInteger(available) || available < 0 || !(Date.now() < expires) || performance.now() - began >= cap.wallMilliseconds
        || actualCpu - cpu > cap.cpuMicroseconds
        || (ledger !== null && !ledger.current())) throw refused();
    };
    const priorRead = activeRead;
    const boundary = { ticket, expires, check, read: (bytes: number): void => {
      reads += bytes;
      if (!Number.isSafeInteger(bytes) || bytes < 0 || !Number.isSafeInteger(reads) || reads > cap.auditReadBytes
        || (ticket !== null && ledger?.auditRead(ticket, bytes) !== true)) throw refused();
      check();
    }, finish: (): void => { try { check(); if (ticket !== null && ledger?.finish(ticket) !== true) throw refused(); } finally { activeRead = priorRead; } } };
    activeRead = boundary.read;
    return boundary;
  };
  const waitOperation = async <T>(boundary: ReturnType<typeof openOperation>, operation: () => Promise<T>): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([operation(), new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => { stop('refused'); reject(refused()); }, Math.max(1, boundary.expires - Date.now()));
      })]);
    } finally { if (timer !== undefined) clearTimeout(timer); }
  };
  const auditOperation = async <T>(kind: 'audit' | 'terminal', operation: () => Promise<T>): Promise<T> => {
    const boundary = openOperation(kind, Math.max(0, receipts.length - 1));
    try { return await waitOperation(boundary, operation); }
    finally { boundary.finish(); }
  };
  const append: OrderedDesignAuditWriter['append'] = (kind, payload) => auditOperation('audit', () => writer.append(kind, payload));
  type ScreenInput = OrderedScreenInput | Omit<Extract<OrderedScreenInput, { operation: 'request' }>, 'planInput'>;
  const screen = async (input: ScreenInput, boundary: ReturnType<typeof openOperation>): Promise<OrderedScreenObservation> => {
    if (screening.kind === 'bounded-worker') {
      if (input.operation === 'request' && !('planInput' in input)) throw refused();
      const result = await runOrderedDesignScreen({ program: screening.program, input, deadlineEpochMilliseconds: boundary.expires,
        current: () => { try { requireProcessingCurrent(); boundary.check(); return true; } catch { return false; } },
        imageReadCurrent: () => { try { requireAuthority(); boundary.check(); return true; } catch { return false; } },
        chargeCpuMicroseconds: value => { work.chargeScreenCpuMicroseconds(value); workBudget?.current(); boundary.check(); } });
      workBudget?.current();
      boundary.check();
      if (!result.ok) throw refused();
      return result.observation;
    }
    const empty = () => ({ secretCalls: 0, secretCodeUnits: 0, activeCalls: 0, activeCodeUnits: 0, maximumInputCodeUnits: 0 });
    const counts = empty(), branches = { raw: empty(), received: empty(), prepared: empty(), logicalReceived: empty(), logicalPrepared: empty() };
    const inverseInputs: number[] = [];
    let branch: keyof typeof branches = 'raw';
    const detectors = { observeBranch: (value: typeof branch) => { branch = value; }, observeInverse: (units: number) => { inverseInputs.push(units); },
      scanSecrets: (text: string): boolean => { for (const value of [counts, branches[branch]]) { value.secretCalls++; value.secretCodeUnits += text.length; value.maximumInputCodeUnits = Math.max(value.maximumInputCodeUnits, text.length); } return screening.detectors.scanSecrets(text); },
      scanDesignView: (text: string): boolean => { for (const value of [counts, branches[branch]]) { value.activeCalls++; value.activeCodeUnits += text.length; value.maximumInputCodeUnits = Math.max(value.maximumInputCodeUnits, text.length); } return screening.detectors.scanDesignView?.(text) ?? true; } };
    const bytes = Buffer.from(input.receivedBase64, 'base64');
    const outcome: OrderedScreenObservation['outcome'] = input.operation === 'response'
      ? { operation: 'response', result: decodeSessionResponse(bytes, input.contentType, profile.input.binding.model, detectors.scanSecrets) }
      : { operation: input.operation, result: input.operation === 'initial' ? screenOrderedDesignInitialRequest(bytes, profile, detectors)
        : screenOrderedDesignRequest(bytes, { ...input.bindings, profile, plan, envelope: envelope() }, detectors) };
    return { format: 'ordered-design-screen/1', policySha256: profile.input.binding.policy, profileSha256: profile.digest,
      counts, branches, inverseInputs, selfCpuMicrosecondsBeforeOutput: 0, outcome };
  };
  const screenOperation = async (input: ScreenInput): Promise<OrderedScreenObservation> => {
    const boundary = openOperation(input.operation === 'response' ? 'response' : 'request', Math.max(0, receipts.length - 1));
    try {
      const observed = await screen(input, boundary);
      await requireCurrent();
      if (observed.outcome.operation !== input.operation || !Array.isArray(observed.inverseInputs) || observed.inverseInputs.length > 2) throw refused();
      if (input.operation === 'request' && observed.outcome.result.ok && observed.inverseInputs.length !== 2) throw refused();
      const cap = work.enforcement.operations[input.operation === 'response' ? 'response' : 'request'];
      for (const key of ['secretCalls', 'secretCodeUnits', 'activeCalls', 'activeCodeUnits', 'maximumInputCodeUnits'] as const) {
        const value = observed.counts[key], maximum = key === 'maximumInputCodeUnits' ? cap.inputCodeUnits : cap[key];
        if (!Number.isSafeInteger(value) || value < 0 || value > maximum) throw refused();
      }
      if (boundary.ticket !== null) {
        if (input.operation === 'request') {
          for (const branch of ['raw', 'received', 'prepared', 'logicalReceived', 'logicalPrepared'] as const)
            if (workBudget?.detectors(boundary.ticket, branch, observed.branches[branch]) !== true) throw refused();
          for (const units of observed.inverseInputs) if (workBudget?.inverse(boundary.ticket, units) !== true) throw refused();
        } else if (workBudget?.detectors(boundary.ticket, 'operation', observed.counts) !== true) throw refused();
      }
      return observed;
    } finally { boundary.finish(); }
  };
  const common = (bytes: Uint8Array) => ({ policyBase64: policy === null ? '' : Buffer.from(policy).toString('base64'),
    policySha256: profile.input.binding.policy, profileInput: profile.input, profileSha256: profile.digest,
    receivedBase64: Buffer.from(bytes).toString('base64') });
  const checkRequest = async (bytes: Uint8Array): Promise<ReturnType<typeof screenOrderedDesignRequest>> => {
    if (stopped || eligible || busy || request !== null || pending !== null) throw refused();
    busy = true;
    try {
    // Peer mediation can outlast the product held at relay preflight. Check
    // and renew it within this effect before reading the screening input.
    await requireCurrent();
    requireLive();
    if (initial) {
      if (admittedInitial || receipts.length !== 0) throw refused();
      const observed = await screenOperation({ ...common(bytes), operation: 'initial' });
      if (observed.outcome.operation !== 'initial') throw refused();
      const checks = observed.outcome.result;
      if (checks.ok) request = checks.value;
      return checks;
    }
    if (transferBounds === null || receipts.length !== exchanges.length + 1) throw refused();
    // This controller supports exactly the preflighted native history. The
    // general detector projector may preserve additional registered context;
    // such context has no capacity reservation in this transfer.
    const actual = parseBoundedJson(new TextDecoder('utf-8', { fatal: true }).decode(bytes), transcript.requestLimits);
    const messages = isRecord(actual) ? actual.messages : undefined;
    if (!Array.isArray(messages) || messages.length !== 1 + 2 * receipts.length
      || (!equal(messages[0], profile.initialMessage) && !equal(messages[0], profile.historicalInitialMessage))) throw refused();
    for (const [index, receipt] of receipts.entries()) {
      const assistant = messages[1 + index * 2], result = messages[2 + index * 2];
      const block = isRecord(assistant) && Array.isArray(assistant.content) ? assistant.content[0] : null;
      if (!isRecord(block) || !isRecord(block.input) || sha256(canonical(block.input)) !== receipt.call.inputSha256
        || !equal(assistant, { role: 'assistant', content: [{ type: 'tool_use', id: receipt.call.id, name: receipt.call.name, input: block.input }] })
        || !isRecord(result) || Object.keys(result).length !== 2 || result.role !== 'user'
        || !Array.isArray(result.content) || result.content.length !== 1) throw refused();
    }
    const prepared = receipts[0]!;
    const asResult = ({ call, usage }: Receipt) => ({ toolUseId: call.id, usage });
    const observed = await screenOperation({ ...common(bytes), operation: 'request', envelopeUtf8: new TextDecoder('utf-8', { fatal: true }).decode(envelope()),
      ...(screening.kind === 'bounded-worker' ? { planInput: screening.planInput } : {}), manifestSha256: plan.manifestSha256,
      bindings: { prepared: asResult(prepared), parts: receipts.slice(1, parts.length + 1).map(asResult),
        ...(submission === null ? {} : { acknowledgment: { ...asResult(receipts.at(-1)!), input: submission } }) } });
    if (observed.outcome.operation !== 'request') throw refused();
    const checks = observed.outcome.result;
    if (checks.ok) request = checks.value;
    return checks;
    } finally { busy = false; }
  };

  const checkResponse = async (bytes: Uint8Array, contentType: string): Promise<SessionMessageResponseDecision> => {
    let held = false;
    try {
      if (busy || eligible || checkedResponse !== null || pending?.step !== 'response-admitted'
        || !/^text\/event-stream(?:\s*;\s*charset=utf-8)?$/iu.test(contentType))
        throw refused();
      busy = true; held = true;
      await requireCurrent();
      requireLive();
      const observed = await screenOperation({ ...common(bytes), operation: 'response', contentType });
      if (observed.outcome.operation !== 'response') throw refused();
      const decoded = observed.outcome.result;
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
    finally { if (held) busy = false; }
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
          const checked = request;
          request = null;
          if (admittedInitial || checked === null || !equal(checked.received, scope.received) || !equal(checked.forwarded, scope.forwarded)
            || event.consumedToolResults.length !== 0 || !budget.reserve('design', event.admission)) throw refused();
          admittedInitial = true;
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
        const admission = await append('request-admitted', { ...scope, results, logical: checked.logical, transcriptSha256: checked.transcriptSha256 });
        pending = { scope, admission, wrapper: results.at(-1)!.wrapper, step: 'send-attempt' };
        await requireCurrent();
        return;
      }
      const active = pending;
      if (!active || active.step !== event.event || !equal(active.scope, scope)) throw refused();
      if (event.event === 'send-attempt' && event.outcome === 'attempted') {
        if (active.admission) active.sendAttempt = await append('send-attempt', { ...scope, admission: active.admission, outcome: event.outcome });
        active.step = 'send-outcome';
      } else if (event.event === 'send-outcome' && event.outcome === 'local-request-flushed') {
        if (active.admission && active.sendAttempt) active.sendOutcome = await append('send-outcome',
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
          const admitted = await append('response-admitted',
            { ...scope, admission, sendAttempt, sendOutcome, native: exactResponse, usage, outcome: event.outcome, status: event.status });
          const exchange = { admission, sendAttempt, sendOutcome, response: admitted };
          exchanges.push(exchange);
          if (native.tool) response = { call: native.tool, usage };
          else {
            if (!completion || !stage || submission === null || budgetReservation?.complete() !== true) throw refused();
            await requireCurrent();
            await append('eligible', { ...exchange, completion, stage, acknowledgment: receipts.at(-1)!.receipt, wrapper });
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
    const toolInput = invocation.input;
    response = null;
    const ordinal = receipts.length;
    let reply: string, receipt: OrderedDesignAuditReference, firstToolStart: OrderedDesignWorkStart | undefined;
    if (ordinal === 0) {
      if (!admittedInitial || transferBounds !== null) throw refused();
      transferBounds = boundOrderedDesignTransfer({ profile, plan, envelope: envelope(),
        retainedMessages: canonical([profile.initialMessage, { role: 'assistant', content: [{ type: 'tool_use',
          id: issued.call.id, name: issued.call.name, input: pollInput }] }]),
        ...(options.requestMaxBytes === undefined ? {} : { requestMaxBytes: options.requestMaxBytes }) });
      if (transferBounds === null) throw refused();
      const reserved = reserveOrderedDesignWork({ shape: transferBounds, view: { envelopeBytes: plan.manifest.envelopeBytes, originalBytes },
        enforcement: work.enforcement, expectedRuntimeSha256: work.runtimeSha256,
        expectedWorkerSha256: screening.kind === 'bounded-worker' ? screening.program.worker.sha256 : work.enforcement.workerSha256,
        deadline, now: Date.now() }, work.reserveRemainingCpuMicroseconds, { now: Date.now, monotonicMilliseconds: () => performance.now() });
      if (reserved === null) throw refused();
      firstToolStart = reserved.start;
      workBudget = createOrderedDesignWorkBudget(reserved.plan, { now: Date.now, monotonicMilliseconds: () => performance.now(), cpuMicroseconds: work.cpuMicroseconds }, firstToolStart);
      budgetReservation = budget.holdOrderedDesignTurns(transcript.resultTurns.length, reserved.plan.expiresAt);
      requireNextSend();
    }
    const tool = openOperation('tool', ordinal, firstToolStart);
    try { await waitOperation(tool, async () => {
      if (ordinal === 0) {
        reply = canonical({ kind: 'session-control', ok: true, state: 'events', events: [{ event: transcript.prepared.event, ...plan.prepared }] });
        receipt = await append('prepared', { call: issued.call, prepared: identify(plan.preparedText), reply: identify(reply) });
      } else if (ordinal <= parts.length) {
        requireNextSend();
        const prior = exchanges[ordinal - 1]!;
        reply = materializeOrderedDesignPart(plan, envelope(), parts[ordinal - 1]!.path);
        receipt = await append('part-receipt', { ordinal, issuedBy: prior.response, call: issued.call, reply: identify(reply) });
      } else {
        requireNextSend();
        const prior = exchanges.at(-1)!;
        if (ordinal !== parts.length + 1 || exchanges.length !== ordinal || completion !== null || !Array.isArray(toolInput.argv)
          || typeof toolInput.stdin !== 'string'
          || Buffer.byteLength(toolInput.stdin) > transcript.maxVerdictBytes
          || !equal(toolInput, { argv: verdictArgv, stdin: toolInput.stdin })) throw refused();
        const stdin = toolInput.stdin;
        const checkedVerdictSha256 = await auditOperation('audit', async () => {
          completion = await writer.append('delivery-completed', { prepared: receipts[0]!.receipt, preparedExchange: exchanges[0]!,
            parts: receipts.slice(1).map(({ receipt }, index) => ({ receipt, ...exchanges[index + 1]! })),
            finalAdmission: prior.admission, verdictResponse: prior.response, verdictCall: issued.call });
          await requireCurrent();
          requireNextSend();
          return stageVerdict({ stdin, call: issued.call, completion, assertCurrent: requireNextSend });
        });
        if (checkedVerdictSha256 === null) throw refused();
        await requireCurrent();
        stage = await append('verdict-staged', { completion: completion!, issuedBy: prior.response, verdictCall: issued.call,
          packet: { bytes: originalBytes, sha256: originalSha256 }, checkedVerdictSha256, verdict: identify(stdin) });
        reply = canonical({ kind: 'dossier-result', ok: true, exit: 0, stderr: '',
          stdout: canonical({ outcome: transcript.verdict.stagedOutcome, eligibility: transcript.verdict.eligibility, packetSha256: originalSha256 }) });
        receipt = await append('acknowledgment-receipt', { stage, call: issued.call, reply: identify(reply) });
        submission = Object.freeze({ argv: Object.freeze([...verdictArgv]), stdin });
      }
      await requireCurrent();
      release(parseBoundedJson(reply, transcript.requestLimits), requireNextSend);
      receipts.push({ ...issued, receipt, reply: identify(reply) });
    }); } finally { tool.finish(); }
  });
  const readTerminal = async (consume?: (evidence: import('./url-ordered-design-audit.js').OrderedDesignTerminalEvidence) => Promise<void>) => {
    if (!eligible || stopped || busy) throw refused();
    busy = true;
    try {
      await requireCurrent();
      const terminal = await auditOperation('terminal', async () => {
        const evidence = await writer.readTerminal();
        if (consume !== undefined) await consume(evidence);
        return evidence;
      });
      await requireCurrent();
      if (workBudget?.complete() !== true) throw refused();
      return terminal;
    } catch {
      stopped = true;
      throw refused();
    } finally { busy = false; }
  };
  const session = Object.freeze({ checkRequest, checkResponse, observe, issueReply, retire, readTerminal,
    reportAuditRead: (bytes: number): boolean => { if (activeRead === null) return false; activeRead(bytes); return true; },
    chargeAuditRead: (bytes: number): void => { if (activeRead === null) throw refused(); activeRead(bytes); },
    workSnapshot: () => workBudget?.snapshot() ?? null });
  issuedSessions.add(session);
  if (screening.kind === 'bounded-worker') productionSessions.set(session, profile);
  return session;
}
