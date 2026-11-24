import { deepFreeze } from '@syzygy/support';
import type { OrderedDesignTransferBounds } from './url-ordered-design-bounds.js';
import type { UrlOrderedCpuReservation } from './url-run-cpu-budget.js';

const REQUEST_BYTES = 2_097_152;
const RESPONSE_BYTES = 8_388_608;
const NODES = 65_536;
const OPERATIONS = ['request', 'response', 'tool', 'audit', 'terminal'] as const;
const BRANCHES = ['raw', 'received', 'prepared', 'logicalReceived', 'logicalPrepared'] as const;
const COUNTS = { request: 4, response: 4, tool: 4, audit: 24, terminal: 1 } as const;
type Operation = typeof OPERATIONS[number];
type Branch = typeof BRANCHES[number];
type Failure = 'clock' | 'expired' | 'cpu-limit' | 'operation-wall-limit' | 'operation-cpu-limit'
  | 'invalid-operation' | 'detector-limit' | 'transform-limit' | 'audit-read-limit' | 'retired';
const plans = new WeakSet<object>();
const positive = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) > 0;
const nonnegative = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;
const digest = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);

/** CPU and wall ceilings include worker startup, serialization, protected I/O
 * and supervisor overhead; they are not detector throughput predictions. */
export interface OrderedDesignOperationEnvelope {
  readonly cpuMicroseconds: number;
  readonly wallMilliseconds: number;
  /** Whole protected-store reads, including rechecks of retained prefixes. */
  readonly auditReadBytes: number;
  readonly inputCodeUnits: number;
  /** Other first-party checks inside this operation must publish these bounds. */
  readonly secretCodeUnits: number;
  readonly secretCalls: number;
  readonly activeCodeUnits: number;
  readonly activeCalls: number;
}

/** An independently checked runtime must enforce each operation's envelope.
 * The ledger below checks measured boundaries and cannot preempt a synchronous
 * detector. Its worker identity is a binding to that separate enforcement. */
export interface OrderedDesignWorkEnforcement {
  readonly runtimeSha256: string;
  readonly workerSha256: string;
  readonly operations: Readonly<Record<Operation, OrderedDesignOperationEnvelope>>;
  readonly relayMilliseconds: number;
  readonly brokerMilliseconds: number;
}

/** The same finite future CPU requirement drives reservation and planning. */
export function calculateOrderedDesignCpuRequirement(enforcement: OrderedDesignWorkEnforcement): number | null {
  let cpu = 0;
  for (const operation of OPERATIONS) {
    const capacity = enforcement.operations[operation].cpuMicroseconds;
    if (!positive(capacity)) return null;
    cpu += COUNTS[operation] * capacity;
    if (!positive(cpu)) return null;
  }
  return cpu;
}

interface DetectorBound {
  readonly secretCodeUnits: number;
  readonly secretCalls: number;
  readonly activeCodeUnits: number;
  readonly activeCalls: number;
  readonly inputCodeUnits: number;
}
interface Turn {
  readonly branches: Readonly<Record<Branch, DetectorBound>>;
  readonly inversePasses: 2;
  readonly inverseCodeUnits: number;
  readonly response: DetectorBound;
}
export interface OrderedDesignWorkPlan {
  readonly manifestSha256: string;
  readonly profileSha256: string;
  readonly enforcement: OrderedDesignWorkEnforcement;
  readonly turns: readonly Turn[];
  readonly startsAt: number;
  readonly expiresAt: number;
  readonly originalDeadline: number;
  readonly cpuMicroseconds: number;
  readonly remainingRunCpuMicroseconds: number;
  readonly auditReadBytes: number;
}

export interface OrderedDesignWorkStart {
  readonly wallMilliseconds: number;
  readonly monotonicMilliseconds: number;
  readonly cpuMicroseconds: number;
}
const admissionStarts = new WeakMap<OrderedDesignWorkStart, { plan: OrderedDesignWorkPlan; consumed: boolean }>();

/** Compile conservative work counts for the fixed four-result profile. Every
 * actual and logical branch keeps its own allowance. Byte maxima also bound
 * UTF-16 code units for valid UTF-8. No model usage is estimated here. */
export function planOrderedDesignWork(input: {
  readonly shape: OrderedDesignTransferBounds;
  readonly view: { readonly envelopeBytes: number; readonly originalBytes: number };
  readonly enforcement: OrderedDesignWorkEnforcement;
  readonly expectedRuntimeSha256: string;
  readonly expectedWorkerSha256: string;
  readonly deadline: number;
  readonly now: number;
  readonly remainingRunCpuMicroseconds: number;
}): OrderedDesignWorkPlan | null {
  try {
    const { shape, view, enforcement, deadline, now, remainingRunCpuMicroseconds } = input;
    if (!digest(shape.profileSha256) || !digest(shape.manifestSha256) || !digest(shape.retainedMessagesSha256)
      || shape.turns.map(turn => turn.kind).join(',') !== 'prepared,part,part,verdict-acknowledgment'
      || !positive(view.envelopeBytes) || view.envelopeBytes > REQUEST_BYTES
      || !positive(view.originalBytes) || view.originalBytes > REQUEST_BYTES
      || !digest(input.expectedRuntimeSha256) || !digest(input.expectedWorkerSha256)
      || enforcement.runtimeSha256 !== input.expectedRuntimeSha256 || enforcement.workerSha256 !== input.expectedWorkerSha256
      || !positive(deadline) || !nonnegative(now) || deadline <= now || !positive(remainingRunCpuMicroseconds)
      || !positive(enforcement.relayMilliseconds) || enforcement.relayMilliseconds > 300_000
      || !positive(enforcement.brokerMilliseconds) || enforcement.brokerMilliseconds > 85_000) return null;
    const cpu = calculateOrderedDesignCpuRequirement(enforcement);
    if (cpu === null) return null;
    let wall = 4 * (enforcement.relayMilliseconds + enforcement.brokerMilliseconds), auditReadBytes = 0;
    for (const operation of OPERATIONS) {
      const envelope = enforcement.operations[operation];
      if (!positive(envelope.cpuMicroseconds) || !positive(envelope.wallMilliseconds)
        || !positive(envelope.inputCodeUnits) || envelope.inputCodeUnits > RESPONSE_BYTES
        || ![envelope.auditReadBytes, envelope.secretCodeUnits, envelope.secretCalls, envelope.activeCodeUnits, envelope.activeCalls].every(nonnegative)) return null;
      wall += COUNTS[operation] * envelope.wallMilliseconds;
      auditReadBytes += COUNTS[operation] * envelope.auditReadBytes;
    }
    if (![wall, cpu, auditReadBytes, now + wall].every(Number.isSafeInteger)
      || now + wall >= deadline || cpu > remainingRunCpuMicroseconds) return null;
    const plain = (bytes: number, nodes: number): DetectorBound => ({ secretCodeUnits: 5 * bytes, secretCalls: nodes + 4,
      activeCodeUnits: 0, activeCalls: 0, inputCodeUnits: bytes });
    const logical = (bytes: number, nodes: number): DetectorBound => ({
      // Five ordinary encoded/decoded/joined scans cost 5B. Receipt <=B,
      // text/inert/joined inert cost 3E, original/keyed fields cost 2O,
      // four whole-context substitution joins cost <=4B+E+3O.
      secretCodeUnits: 10 * bytes + 4 * view.envelopeBytes + 5 * view.originalBytes,
      secretCalls: nodes + 2 * NODES + 32,
      activeCodeUnits: bytes + 3 * view.envelopeBytes, activeCalls: 16, inputCodeUnits: REQUEST_BYTES,
    });
    const turns = shape.turns.map(turn => {
      for (const key of ['received', 'receivedCanonical', 'prepared', 'logicalReceived', 'logicalPrepared'] as const) {
        const bound = turn[key];
        if (!positive(bound.bytes) || bound.bytes > REQUEST_BYTES || !positive(bound.nodes) || bound.nodes > NODES
          || !positive(bound.depth) || bound.depth > 32) throw new Error('ordered-work-shape');
      }
      if (!positive(turn.responseWire.bytes) || turn.responseWire.bytes > RESPONSE_BYTES) throw new Error('ordered-work-shape');
      const branches = {
        raw: { secretCodeUnits: turn.received.bytes, secretCalls: 1, activeCodeUnits: 0, activeCalls: 0, inputCodeUnits: turn.received.bytes },
        received: plain(turn.receivedCanonical.bytes, turn.receivedCanonical.nodes), prepared: plain(turn.prepared.bytes, turn.prepared.nodes),
        logicalReceived: logical(turn.logicalReceived.bytes, turn.logicalReceived.nodes), logicalPrepared: logical(turn.logicalPrepared.bytes, turn.logicalPrepared.nodes),
      };
      return { branches, inversePasses: 2 as const, inverseCodeUnits: 2 * view.envelopeBytes,
        // Frame strings and parsed partial input total at most 2W. Final
        // reconstructed strings, canonical content and semantic payload are
        // separately capped at R. Individual and joined string scans add up
        // to raw W + 2*(2W+R) + R + R, without assuming canonical <= wire.
        response: { secretCodeUnits: 5 * turn.responseWire.bytes + 4 * RESPONSE_BYTES, secretCalls: NODES + 4, activeCodeUnits: 0, activeCalls: 0,
          inputCodeUnits: RESPONSE_BYTES } };
    });
    const fits = (bounds: readonly DetectorBound[], cap: OrderedDesignOperationEnvelope): boolean =>
      bounds.every(bound => bound.inputCodeUnits <= cap.inputCodeUnits)
      && (['secretCodeUnits', 'secretCalls', 'activeCodeUnits', 'activeCalls'] as const).every(key =>
        bounds.reduce((sum, bound) => sum + bound[key], 0) <= cap[key]);
    if (turns.some(turn => !fits(Object.values(turn.branches), enforcement.operations.request)
      || !fits([turn.response], enforcement.operations.response))) return null;
    const plan = deepFreeze({ manifestSha256: shape.manifestSha256, profileSha256: shape.profileSha256, enforcement,
      turns, startsAt: now, expiresAt: now + wall, originalDeadline: deadline, cpuMicroseconds: cpu,
      remainingRunCpuMicroseconds, auditReadBytes });
    plans.add(plan);
    return plan;
  } catch { return null; }
}

/** Complete plan validation before reserving. All subsequent bookkeeping is
 * charged from the genuine pool's atomic spent/remaining snapshot as first-tool
 * work. Neither the ledger nor that operation may select a later baseline. */
export function reserveOrderedDesignWork(
  input: Omit<Parameters<typeof planOrderedDesignWork>[0], 'remainingRunCpuMicroseconds'>,
  reserveRemaining: (required: number) => UrlOrderedCpuReservation | null,
  clocks: { readonly now: () => number; readonly monotonicMilliseconds: () => number },
): { readonly plan: OrderedDesignWorkPlan; readonly start: OrderedDesignWorkStart } | null {
  const required = calculateOrderedDesignCpuRequirement(input.enforcement);
  if (required === null) return null;
  const plan = planOrderedDesignWork({ ...input, remainingRunCpuMicroseconds: required });
  if (plan === null) return null;
  const wallMilliseconds = clocks.now(), monotonicMilliseconds = clocks.monotonicMilliseconds();
  if (!nonnegative(wallMilliseconds) || !Number.isFinite(monotonicMilliseconds) || monotonicMilliseconds < 0
    || wallMilliseconds < plan.startsAt || wallMilliseconds >= plan.expiresAt) return null;
  const reservation = reserveRemaining(required);
  if (reservation === null || !nonnegative(reservation.cpuMicroseconds)
    || !positive(reservation.remainingCpuMicroseconds) || reservation.remainingCpuMicroseconds < required) return null;
  const start = Object.freeze({ wallMilliseconds, monotonicMilliseconds, cpuMicroseconds: reservation.cpuMicroseconds });
  admissionStarts.set(start, { plan, consumed: false });
  return Object.freeze({ plan, start });
}

interface Ticket { readonly operation: Operation; readonly turn: number }
interface Spent { secretCodeUnits: number; secretCalls: number; activeCodeUnits: number; activeCalls: number }
const empty = (): Spent => ({ secretCodeUnits: 0, secretCalls: 0, activeCodeUnits: 0, activeCalls: 0 });

/** A single-use boundary ledger. The clocks must measure the complete host and
 * enforced worker population. CPU charges accumulate monotonically; charge
 * an enforced full child cap when complete process CPU cannot be measured,
 * retaining any separately measured worker CPU independently. Even after a
 * refusal, current() samples final charges without reopening the reservation.
 * The returned ticket and successful accounting supply no effect authority. */
export function createOrderedDesignWorkBudget(plan: OrderedDesignWorkPlan, clocks: {
  readonly now: () => number;
  readonly monotonicMilliseconds: () => number;
  readonly cpuMicroseconds: () => number;
}, start?: OrderedDesignWorkStart) {
  if (!plans.has(plan)) throw new Error('ordered-design-work-budget-refused');
  if (start !== undefined) {
    const admission = admissionStarts.get(start);
    if (admission?.plan !== plan || admission.consumed) throw new Error('ordered-design-work-budget-refused');
    admission.consumed = true;
  }
  const used = { request: 0, response: 0, tool: 0, audit: 0, terminal: 0 };
  const tickets = new WeakSet<object>();
  const turns = { request: new Set<number>(), response: new Set<number>(), tool: new Set<number>() };
  let state: 'open' | 'stopped' | 'complete' = 'open', active: Ticket | null = null;
  let reason: Failure | null = null;
  let wall = clocks.now(), monotonic = clocks.monotonicMilliseconds(), cpu = clocks.cpuMicroseconds();
  const cpuStart = start?.cpuMicroseconds ?? cpu, monotonicStart = start?.monotonicMilliseconds ?? monotonic;
  if (!nonnegative(wall) || !Number.isFinite(monotonic) || monotonic < 0 || !nonnegative(cpu) || wall < plan.startsAt || wall >= plan.expiresAt)
    throw new Error('ordered-design-work-budget-refused');
  if (cpu < cpuStart || monotonic < monotonicStart || start !== undefined && wall < start.wallMilliseconds)
    throw new Error('ordered-design-work-budget-refused');
  let operationBegan = monotonicStart, operationCpu = cpuStart, inversePasses = 0, inverseCodeUnits = 0, auditBytes = 0;
  let admissionToolPending = start !== undefined;
  if (admissionToolPending) {
    active = Object.freeze({ operation: 'tool', turn: 0 });
    tickets.add(active); turns.tool.add(0); used.tool = 1;
  }
  let branchSpent = Object.fromEntries(BRANCHES.map(branch => [branch, empty()])) as Record<Branch, Spent>;
  let otherSpent = empty();
  const parents: Array<{ ticket: Ticket; began: number; cpu: number; inversePasses: number; inverseCodeUnits: number;
    auditBytes: number; branchSpent: Record<Branch, Spent>; otherSpent: Spent }> = [];
  const stop = (why: Failure = 'invalid-operation'): false => {
    if (state === 'open') { state = 'stopped'; reason = why; }
    return false;
  };
  const current = (): boolean => {
    if (state === 'complete') return false;
    try {
      const nextWall = clocks.now(), nextMono = clocks.monotonicMilliseconds(), nextCpu = clocks.cpuMicroseconds();
      if (!nonnegative(nextWall) || !Number.isFinite(nextMono) || !nonnegative(nextCpu)
        || nextWall < wall || nextMono < monotonic || nextCpu < cpu) return stop('clock');
      wall = nextWall; monotonic = nextMono; cpu = nextCpu;
      if (state === 'stopped') return false;
      if (wall >= plan.expiresAt || monotonic - monotonicStart >= plan.expiresAt - plan.startsAt) return stop('expired');
      if (cpu - cpuStart > plan.cpuMicroseconds || cpu - cpuStart > plan.remainingRunCpuMicroseconds) return stop('cpu-limit');
      for (const entry of [...parents, ...(active === null ? [] : [{ ticket: active, began: operationBegan, cpu: operationCpu }])]) {
        const cap = plan.enforcement.operations[entry.ticket.operation];
        if (monotonic - entry.began >= cap.wallMilliseconds) return stop('operation-wall-limit');
        if (cpu - entry.cpu > cap.cpuMicroseconds) return stop('operation-cpu-limit');
      }
      return true;
    } catch { return stop('clock'); }
  };
  const selected = (ticket: Ticket): boolean => tickets.has(ticket) && active === ticket && current();
  const detectors = (ticket: Ticket, branch: Branch | 'operation', measured: Spent & { readonly maximumInputCodeUnits: number }): boolean => {
    if (!selected(ticket) || measured === null || typeof measured !== 'object' || ![measured.secretCodeUnits, measured.secretCalls, measured.activeCodeUnits, measured.activeCalls,
      measured.maximumInputCodeUnits].every(nonnegative)
      || (measured.secretCalls === 0 && measured.secretCodeUnits > 0) || (measured.activeCalls === 0 && measured.activeCodeUnits > 0)) return stop('detector-limit');
    const work = plan.turns[ticket.turn]!;
    let cap: DetectorBound | OrderedDesignOperationEnvelope | undefined;
    if (branch === 'operation' && ticket.operation !== 'request') cap = ticket.operation === 'response' ? work.response : plan.enforcement.operations[ticket.operation];
    else if (branch !== 'operation' && ticket.operation === 'request' && BRANCHES.includes(branch)) cap = work.branches[branch];
    if (cap === undefined || measured.maximumInputCodeUnits > cap.inputCodeUnits) return stop('detector-limit');
    const spent = branch === 'operation' ? otherSpent : branchSpent[branch];
    for (const key of ['secretCodeUnits', 'secretCalls', 'activeCodeUnits', 'activeCalls'] as const) {
      spent[key] += measured[key];
      if (!Number.isSafeInteger(spent[key]) || spent[key] > cap[key]) return stop('detector-limit');
    }
    return current();
  };
  if (start !== undefined && !current()) throw new Error('ordered-design-work-budget-refused');
  return Object.freeze({
    current,
    begin: (operation: Operation, turn: number): Ticket | null => {
      if (admissionToolPending) {
        admissionToolPending = false;
        if (!current() || operation !== 'tool' || turn !== 0) { stop(); return null; }
        return active;
      }
      if (!current() || (active !== null && !(active.operation === 'tool' && operation === 'audit' && parents.length === 0)) || !OPERATIONS.includes(operation) || !nonnegative(turn) || turn >= 4
        || used[operation] >= COUNTS[operation]) { stop(); return null; }
      if ((operation === 'request' || operation === 'response' || operation === 'tool') && turns[operation].has(turn)) { stop(); return null; }
      if (operation === 'request' || operation === 'response' || operation === 'tool') turns[operation].add(turn);
      if (active !== null) parents.push({ ticket: active, began: operationBegan, cpu: operationCpu, inversePasses, inverseCodeUnits, auditBytes, branchSpent, otherSpent });
      used[operation]++;
      active = Object.freeze({ operation, turn });
      tickets.add(active);
      operationBegan = monotonic; operationCpu = cpu;
      inversePasses = 0; inverseCodeUnits = 0; auditBytes = 0;
      branchSpent = Object.fromEntries(BRANCHES.map(branch => [branch, empty()])) as Record<Branch, Spent>;
      otherSpent = empty();
      return active;
    },
    detectors,
    detector: (ticket: Ticket, branch: Branch | 'operation', kind: 'secret' | 'active', codeUnits: number): boolean => {
      if (kind !== 'secret' && kind !== 'active') return stop('detector-limit');
      return detectors(ticket, branch, { ...empty(), maximumInputCodeUnits: codeUnits,
        [kind === 'secret' ? 'secretCalls' : 'activeCalls']: 1,
        [kind === 'secret' ? 'secretCodeUnits' : 'activeCodeUnits']: codeUnits });
    },
    inverse: (ticket: Ticket, codeUnits: number): boolean => {
      if (!selected(ticket) || ticket.operation !== 'request' || !positive(codeUnits) || codeUnits > REQUEST_BYTES) return stop('transform-limit');
      inversePasses++; inverseCodeUnits += codeUnits;
      const cap = plan.turns[ticket.turn]!;
      return inversePasses <= cap.inversePasses && inverseCodeUnits <= cap.inverseCodeUnits || stop('transform-limit');
    },
    auditRead: (ticket: Ticket, bytes: number): boolean => {
      if (!selected(ticket) || !nonnegative(bytes)) return stop('audit-read-limit');
      auditBytes += bytes;
      return Number.isSafeInteger(auditBytes) && auditBytes <= plan.enforcement.operations[ticket.operation].auditReadBytes || stop('audit-read-limit');
    },
    finish: (ticket: Ticket): boolean => {
      if (!selected(ticket)) return stop();
      tickets.delete(ticket);
      const parent = parents.pop();
      active = parent?.ticket ?? null;
      if (parent) { operationBegan = parent.began; operationCpu = parent.cpu; inversePasses = parent.inversePasses;
        inverseCodeUnits = parent.inverseCodeUnits; auditBytes = parent.auditBytes; branchSpent = parent.branchSpent; otherSpent = parent.otherSpent; }
      return current();
    },
    complete: (): boolean => {
      if (!current() || active !== null || used.request !== 4 || used.response !== 4 || used.tool !== 4 || used.audit !== 23 || used.terminal !== 1) return false;
      state = 'complete';
      return true;
    },
    retire: (): void => { stop('retired'); },
    snapshot: () => deepFreeze({ state, reason, used: { ...used }, cpuMicroseconds: cpu - cpuStart,
      wallMilliseconds: monotonic - monotonicStart, expiresAt: plan.expiresAt,
      enforcement: 'measured-operation-boundary; hard worker limits required separately' as const }),
  });
}
