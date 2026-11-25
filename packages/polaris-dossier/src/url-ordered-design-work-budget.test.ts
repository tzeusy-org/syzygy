import { describe, expect, it } from 'vitest';
import { encodeCanonicalJson, REVIEW_STATUS_REGION_OPEN } from '@syzygy/polaris-generation-core/live';
import { sha256 } from '@syzygy/support';
import { buildDesignPacket } from './design-review.js';
import { readFileSync } from 'node:fs';
import { buildDossierScreen } from './screen.js';
import { createOrderedDesignSessionProfile, DEFAULT_SESSION_MODEL } from './session-profile.js';
import { decodeSessionResponse } from './session-response.js';
import { screenOrderedDesignRequest } from './session-egress-policy.js';
import { createUrlDesignView } from './url-design-view.js';
import { materializeOrderedDesignPart, planOrderedDesignBytes } from './url-design-delivery.js';
import { boundOrderedDesignTransfer } from './url-ordered-design-bounds.js';
import type { OrderedDesignTransferBounds } from './url-ordered-design-bounds.js';
import { calculateOrderedDesignCpuRequirement, createOrderedDesignWorkBudget, planOrderedDesignWork, reserveOrderedDesignWork, type OrderedDesignWorkEnforcement } from './url-ordered-design-work-budget.js';
import { createUrlRunCpuBudget } from './url-run-cpu-budget.js';

const byteShape = { bytes: 100, nodes: 10, depth: 3 };
const turn = { received: byteShape, receivedCanonical: byteShape, prepared: byteShape, logicalReceived: byteShape,
  logicalPrepared: byteShape, history: { ...byteShape, messages: 4 }, nativeWrapper: byteShape, brokerRequest: byteShape,
  brokerReply: byteShape, mcpRequest: byteShape, mcpReply: byteShape, responseWire: { ...byteShape, frames: 6 }, responseContent: byteShape };
const shape: OrderedDesignTransferBounds = { profileSha256: 'a'.repeat(64), manifestSha256: 'b'.repeat(64), retainedMessagesSha256: 'c'.repeat(64),
  turns: (['prepared', 'part', 'part', 'verdict-acknowledgment'] as const).map(kind => ({ ...turn, kind })), totals: turn };
const envelope = { cpuMicroseconds: 10, wallMilliseconds: 10, auditReadBytes: 100, inputCodeUnits: 8_388_608,
  secretCodeUnits: 103_000_000, secretCalls: 524_361, activeCodeUnits: 16_777_216, activeCalls: 32 };
const enforcement: OrderedDesignWorkEnforcement = { runtimeSha256: 'd'.repeat(64), workerSha256: 'e'.repeat(64),
  operations: { request: envelope, response: envelope, tool: envelope, audit: envelope, terminal: envelope }, relayMilliseconds: 20, brokerMilliseconds: 30 };
const input = { shape, view: { envelopeBytes: 80, originalBytes: 50 }, enforcement,
  expectedRuntimeSha256: enforcement.runtimeSha256, expectedWorkerSha256: enforcement.workerSha256,
  deadline: 1000, now: 1, remainingRunCpuMicroseconds: 1000 };
const admissionClocks = { now: () => 1, monotonicMilliseconds: () => 1 };

describe('native mediation within the reserved broker span', () => {
  it('reserves the broker once and refuses a mediation envelope outside that parent', () => {
    const baseline = planOrderedDesignWork(input);
    expect(baseline).not.toBeNull();
    expect(planOrderedDesignWork({ ...input, nativeMediationMilliseconds: 30 })).toEqual(baseline);
    for (const nativeMediationMilliseconds of [0, -1, 30.5, 31, Infinity, NaN])
      expect(planOrderedDesignWork({ ...input, nativeMediationMilliseconds })).toBeNull();
    const capacity = { ...input, deadline: 2000, enforcement: { ...enforcement, brokerMilliseconds: 85,
      relayMilliseconds: 20 } };
    const plan = planOrderedDesignWork({ ...capacity, nativeMediationMilliseconds: 85 });
    expect(plan).not.toBeNull();
    expect(plan).toEqual(planOrderedDesignWork(capacity));
    expect(planOrderedDesignWork({ ...capacity, nativeMediationMilliseconds: 86 })).toBeNull();
    expect(planOrderedDesignWork({ ...capacity, nativeMediationMilliseconds: 85, deadline: plan!.expiresAt })).toBeNull();
  });
});

function fixture(overrides: Partial<typeof input> = {}) {
  const plan = planOrderedDesignWork({ ...input, ...overrides });
  if (!plan) throw new Error('owned work plan refused');
  let now = 1, monotonic = 1, cpu = 0;
  const budget = createOrderedDesignWorkBudget(plan, { now: () => now, monotonicMilliseconds: () => monotonic, cpuMicroseconds: () => cpu });
  return { plan, budget, clock: (wall: number, mono: number, measuredCpu: number) => { now = wall; monotonic = mono; cpu = measuredCpu; } };
}

describe('ordered design live work reservation', () => {
  it('reserves the same 37 future envelopes after bootstrap spending within the unchanged global cap', () => {
    const capacity = { ...envelope, cpuMicroseconds: 64_000_000 };
    const future = { ...enforcement, operations: { request: capacity, response: capacity, tool: capacity, audit: capacity, terminal: capacity } };
    const required = calculateOrderedDesignCpuRequirement(future);
    expect(required).toBe(2_368_000_000);
    for (const limit of [7_200_000_000, 2_496_000_000]) {
      let host = 0;
      const pool = createUrlRunCpuBudget(limit, () => host), held = pool.holdOrdered(2_496_000_000)!;
      held.chargeScreenCpuMicroseconds(18_000_000);
      held.chargeScreenCpuMicroseconds(18_000_000);
      host = 92_000_001;
      const before = held.remainingCpuMicroseconds();
      expect(before).toBe(2_367_999_999);
      expect(planOrderedDesignWork({ ...input, enforcement: future, remainingRunCpuMicroseconds: before })).toBeNull();
      let reservations = 0;
      const { remainingRunCpuMicroseconds: _remaining, ...planning } = { ...input, enforcement: future };
      const planned = reserveOrderedDesignWork(planning, value => {
        reservations++;
        expect(value).toBe(2_368_000_000);
        return held.reserveRemainingOnce(value);
      }, admissionClocks);
      expect(reservations).toBe(1);
      expect(pool.cpuMicroseconds()).toBe(128_000_001);
      if (limit === 2_496_000_000) {
        expect(planned).toBeNull();
        expect(held.remainingCpuMicroseconds()).toBe(before);
      } else {
        expect(planned).toMatchObject({ plan: { cpuMicroseconds: 2_368_000_000, originalDeadline: 1000, expiresAt: 571 },
          start: { cpuMicroseconds: 128_000_001, wallMilliseconds: 1, monotonicMilliseconds: 1 } });
        held.chargeScreenCpuMicroseconds(64_000_000);
        expect(pool.cpuMicroseconds()).toBe(192_000_001);
        expect(held.remainingCpuMicroseconds()).toBe(2_304_000_000);
        expect(held.reserveRemainingOnce(required!)).toBeNull();
      }
    }
  });
  it('refuses invalid or overflowing aggregate future CPU before a reservation', () => {
    for (const cpuMicroseconds of [0, -1, NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER]) {
      const invalid = { ...enforcement, operations: { ...enforcement.operations, terminal: { ...envelope, cpuMicroseconds } } };
      expect(calculateOrderedDesignCpuRequirement(invalid)).toBeNull();
      expect(planOrderedDesignWork({ ...input, enforcement: invalid })).toBeNull();
      let reservations = 0;
      expect(reserveOrderedDesignWork({ ...input, enforcement: invalid }, () => {
        reservations++; return { cpuMicroseconds: 0, remainingCpuMicroseconds: 1000 };
      }, admissionClocks)).toBeNull();
      expect(reservations).toBe(0);
    }
  });
  it('validates the complete shape, identity, detector and wall plan before touching the one-time hold', () => {
    for (const mutation of [{ shape: { ...shape, turns: shape.turns.slice(0, 3) } }, { deadline: 571 },
      { expectedWorkerSha256: 'f'.repeat(64) }, { enforcement: { ...enforcement, operations: { ...enforcement.operations,
        request: { ...envelope, secretCodeUnits: 1 } } } }]) {
      let reservations = 0;
      expect(reserveOrderedDesignWork({ ...input, ...mutation }, () => {
        reservations++; return { cpuMicroseconds: 0, remainingCpuMicroseconds: 1000 };
      }, admissionClocks)).toBeNull();
      expect(reservations).toBe(0);
    }
  });
  it('charges a one-microsecond admission drift to both the lifetime and first-tool baseline without resetting it', () => {
    let host = 0;
    const pool = createUrlRunCpuBudget(1000, () => host), held = pool.holdOrdered(390)!;
    host = 21; // exactly one below the 370 future requirement
    const reserved = reserveOrderedDesignWork(input, required => {
      const snapshot = held.reserveRemainingOnce(required);
      host++; // bookkeeping after the genuine atomic sample
      return snapshot;
    }, admissionClocks)!;
    expect(reserved.start.cpuMicroseconds).toBe(21);
    expect(held.remainingCpuMicroseconds()).toBe(369);
    const clocks = { ...admissionClocks, cpuMicroseconds: held.cpuMicroseconds };
    const budget = createOrderedDesignWorkBudget(reserved.plan, clocks, reserved.start);
    expect(budget.snapshot()).toMatchObject({ cpuMicroseconds: 1, used: { tool: 1 } });
    const first = budget.begin('tool', 0)!;
    expect(first).not.toBeNull();
    expect(budget.snapshot()).toMatchObject({ cpuMicroseconds: 1, used: { tool: 1 } });
    host = 31; // ten total first-tool units, including admission bookkeeping
    expect(budget.current()).toBe(true);
    host = 32;
    expect(budget.finish(first)).toBe(false);
    expect(budget.snapshot()).toMatchObject({ reason: 'operation-cpu-limit', cpuMicroseconds: 11 });
    expect(pool.cpuMicroseconds()).toBe(32);
  });
  it('refuses post-reservation CPU drift crossing the first-tool cap before a ledger can authorize release', () => {
    let host = 0;
    const pool = createUrlRunCpuBudget(1000, () => host), held = pool.holdOrdered(390)!;
    const reserved = reserveOrderedDesignWork(input, required => {
      const snapshot = held.reserveRemainingOnce(required);
      host = 11;
      return snapshot;
    }, admissionClocks)!;
    expect(() => createOrderedDesignWorkBudget(reserved.plan, { ...admissionClocks, cpuMicroseconds: held.cpuMicroseconds }, reserved.start)).toThrow();
    expect(pool.cpuMicroseconds()).toBe(11);
  });
  it('keeps the original first-tool wall start and rejects copied, replayed or cross-plan admission starts', () => {
    let now = 1, mono = 1;
    const clocks = { now: () => now, monotonicMilliseconds: () => mono, cpuMicroseconds: () => 0 };
    const reserve = () => ({ cpuMicroseconds: 0, remainingCpuMicroseconds: 370 });
    const reserved = reserveOrderedDesignWork(input, reserve, clocks)!;
    const another = reserveOrderedDesignWork(input, reserve, clocks)!;
    expect(() => createOrderedDesignWorkBudget(reserved.plan, clocks, { ...reserved.start })).toThrow();
    expect(() => createOrderedDesignWorkBudget(another.plan, clocks, reserved.start)).toThrow();
    now = 2; mono = 2; // admission bookkeeping may not move the first-tool start
    const budget = createOrderedDesignWorkBudget(reserved.plan, clocks, reserved.start);
    expect(() => createOrderedDesignWorkBudget(reserved.plan, clocks, reserved.start)).toThrow();
    now = 11; mono = 11;
    expect(budget.begin('tool', 0)).toBeNull();
    expect(budget.snapshot()).toMatchObject({ reason: 'operation-wall-limit', wallMilliseconds: 10 });
  });
  it('samples constructor expiry after a CPU join and preserves the reserved first-tool start', () => {
    const plan = planOrderedDesignWork(input)!;
    let now = 1, mono = 1;
    expect(() => createOrderedDesignWorkBudget(plan, { now: () => now, monotonicMilliseconds: () => mono,
      cpuMicroseconds: () => { now = plan.expiresAt; mono = plan.expiresAt; return 7; } })).toThrow('ordered-design-work-budget-refused');
    now = 1; mono = 1;
    const reserved = reserveOrderedDesignWork(input, () => ({ cpuMicroseconds: 0, remainingCpuMicroseconds: 370 }),
      { now: () => now, monotonicMilliseconds: () => mono })!;
    expect(() => createOrderedDesignWorkBudget(reserved.plan, { now: () => now, monotonicMilliseconds: () => mono,
      cpuMicroseconds: () => { now = 11; mono = 11; return 7; } }, reserved.start)).toThrow('ordered-design-work-budget-refused');
  });
  it.each(['wall', 'monotonic'] as const)('refuses expiry crossed inside the CPU sample using fresh %s time and retains its charge', axis => {
    const plan = planOrderedDesignWork(input)!;
    let now = 1, mono = 1, joining = false, cpu = 0;
    const budget = createOrderedDesignWorkBudget(plan, { now: () => now, monotonicMilliseconds: () => mono,
      cpuMicroseconds: () => {
        if (joining) { cpu = 7; if (axis === 'wall') now = plan.expiresAt; else mono = plan.expiresAt; }
        return cpu;
      } });
    joining = true;
    expect(budget.current()).toBe(false);
    expect(budget.snapshot()).toMatchObject({ reason: 'expired', cpuMicroseconds: 7 });
  });
  it('refuses operation expiry crossed inside CPU accounting before completing its ticket', () => {
    const plan = planOrderedDesignWork(input)!;
    let now = 1, mono = 1, joining = false;
    const budget = createOrderedDesignWorkBudget(plan, { now: () => now, monotonicMilliseconds: () => mono,
      cpuMicroseconds: () => { if (joining) { now = 11; mono = 11; } return joining ? 7 : 0; } });
    const ticket = budget.begin('tool', 0)!;
    joining = true;
    expect(budget.finish(ticket)).toBe(false);
    expect(budget.snapshot()).toMatchObject({ reason: 'operation-wall-limit', wallMilliseconds: 10, cpuMicroseconds: 7 });
  });
  it('keeps reservation spending while refusing a plan that expires during the one-time CPU reservation', () => {
    let now = 1, mono = 1, calls = 0;
    expect(reserveOrderedDesignWork(input, () => {
      calls++; now = 571; mono = 571;
      return { cpuMicroseconds: 7, remainingCpuMicroseconds: 370 };
    }, { now: () => now, monotonicMilliseconds: () => mono })).toBeNull();
    expect(calls).toBe(1);
  });
  it('holds the whole path, complete histories and both detector branches before the first operation', () => {
    const { plan } = fixture();
    // Four 50ms broker/relay waits and 37 operation envelopes of 10ms.
    expect(plan.expiresAt).toBe(571);
    const longerRelay = { ...enforcement, relayMilliseconds: 300_000 };
    const longer = planOrderedDesignWork({ ...input, enforcement: longerRelay, deadline: 1_200_492 });
    expect(longer?.enforcement.relayMilliseconds).toBe(300_000);
    expect(longer?.expiresAt).toBe(1_200_491);
    expect(longer?.originalDeadline).toBe(1_200_492);
    expect(planOrderedDesignWork({ ...input, enforcement: longerRelay, deadline: 1_200_491 })).toBeNull();
    expect(planOrderedDesignWork({ ...input, enforcement: { ...longerRelay, relayMilliseconds: 300_001 }, deadline: 2_000_000 })).toBeNull();
    expect(plan.cpuMicroseconds).toBe(370);
    expect(plan.auditReadBytes).toBe(3700);
    expect(plan.turns).toHaveLength(4);
    expect(plan.turns[3]!.branches.received).toEqual({ secretCodeUnits: 500, secretCalls: 14,
      activeCodeUnits: 0, activeCalls: 0, inputCodeUnits: 100 });
    expect(plan.turns[3]!.branches.logicalPrepared).toEqual({ secretCodeUnits: 1570, secretCalls: 131114,
      activeCodeUnits: 340, activeCalls: 16, inputCodeUnits: 2_097_152 });
    expect(plan.turns[3]!.inverseCodeUnits).toBe(160);
    expect(plan.turns[3]!.response.secretCodeUnits).toBe(33_554_932);
    expect(planOrderedDesignWork({ ...input, enforcement: { ...enforcement, operations: { ...enforcement.operations,
      request: { ...envelope, secretCodeUnits: 4239 } } } })).toBeNull();
    expect(planOrderedDesignWork({ ...input, enforcement: { ...enforcement, operations: { ...enforcement.operations,
      response: { ...envelope, inputCodeUnits: 100 } } } })).toBeNull();
    expect(planOrderedDesignWork({ ...input, deadline: 571 })).toBeNull();
    expect(planOrderedDesignWork({ ...input, remainingRunCpuMicroseconds: 369 })).toBeNull();
    expect(planOrderedDesignWork({ ...input, expectedWorkerSha256: 'f'.repeat(64) })).toBeNull();
    expect(planOrderedDesignWork({ ...input, shape: { ...shape, turns: shape.turns.slice(0, 3) } })).toBeNull();
    expect(planOrderedDesignWork({ ...input, enforcement: { ...enforcement, operations: { ...enforcement.operations,
      terminal: { ...envelope, wallMilliseconds: NaN } } } })).toBeNull();
    expect(() => createOrderedDesignWorkBudget(structuredClone(plan), { now: () => 1, monotonicMilliseconds: () => 1, cpuMicroseconds: () => 0 })).toThrow();
  });

  it('covers detector input emitted by the actual whole-view projection through acknowledgment', () => {
    const canonical = (value: unknown) => encodeCanonicalJson(value, { maxBytes: 2_097_152, maxNodes: 65_536, maxDepth: 32 });
    const builtScreen = buildDossierScreen(readFileSync(new URL('../../../.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json', import.meta.url)), true, null, 'private');
    if (!builtScreen.ok) throw new Error('owned screen unavailable');
    const run = 'owned-work', pin = 'a'.repeat(40), session = '12345678-1234-4234-8234-123456789012';
    const compiled = createOrderedDesignSessionProfile({ binding: { run, role: 'design', sourceBinding: sha256('owned source'),
      policy: builtScreen.screen.policySha256, provider: 'anthropic', model: DEFAULT_SESSION_MODEL }, sessionId: session,
      systemPrompt: 'Inspect the whole owned packet.', initialPrompt: 'Use the exact full view.', utcDate: '2026-11-22', kernelRelease: '7.0.0-owned' });
    if (!compiled.ok) throw new Error('owned profile unavailable');
    const { profile } = compiled.value;
    const packet = buildDesignPacket({ run: '/owned/owned-work', runId: run, pinnedRevision: pin, audience: 'Owned fixture readers', files: new Map([
      ['index.html', `<p>${'Owned review. '.repeat(47_000)}</p>${REVIEW_STATUS_REGION_OPEN}Pending</aside>`],
      ['machine.json', `${JSON.stringify({ reviewStatus: [] }, null, 2)}\n`],
    ]) });
    if (!packet.ok) throw new Error(packet.reason);
    const original = Buffer.from(packet.bytes);
    const { algorithm: _algorithm, ...limits } = profile.transcript.partition;
    const view = createUrlDesignView({ original, expected: { runId: run, pinnedRevision: pin, sha256: packet.sha256, bytes: original.length }, screen: builtScreen.screen });
    const plan = planOrderedDesignBytes({ envelope: view.bytes, envelopeSha256: view.sha256,
      original: { bytes: original.length, sha256: packet.sha256 }, fileCount: packet.files.length, pageCount: packet.pages.length,
      binding: { basePolicySha256: profile.input.binding.policy, originPolicySha256: sha256('owned origin'), originalReceiptSha256: sha256('owned receipt'),
        producerSha256: sha256('owned producer'), profileSha256: profile.digest, encoding: 'html-entities-five/1', project: 'project:syzygy',
        provider: 'anthropic', role: 'design', round: 1, run, session, transferEpoch: 1, pin, deadline: '2099-01-01T00:00:00.000Z' },
      parents: [sha256('owned parent')], instructionProfileSha256: sha256(profile.input.systemPrompt), limits });
    const poll = { argv: ['dossier', 'poll', run] };
    const submit = { argv: ['dossier', 'await', '/work', '--submit', 'round-1/verdict.json', '--stdin'], stdin: canonical({ packetSha256: packet.sha256 }) };
    const calls = [poll, ...plan.manifest.parts.map(part => ({ path: part.path })), submit].map((toolInput, index) => ({
      type: 'tool_use', id: `toolu_owned_${index}`, name: `mcp__syzygy__${index === 0 || index === 3 ? 'dossier_step' : 'artifact_read'}`, input: toolInput,
    }));
    const assistant = (call: object) => ({ role: 'assistant', content: [call] });
    const wholeShape = boundOrderedDesignTransfer({ profile, plan, envelope: view.bytes,
      retainedMessages: canonical([profile.historicalInitialMessage, assistant(calls[0]!)]) });
    if (!wholeShape) throw new Error('owned shape unavailable');
    const work = fixture({ shape: wholeShape, view: { envelopeBytes: view.bytes.length, originalBytes: original.length } }).plan;
    const replies = [canonical({ kind: 'session-control', ok: true, state: 'events', events: [{ event: 'design-round-prepared', ...plan.prepared }] }),
      ...plan.manifest.parts.map(part => materializeOrderedDesignPart(plan, view.bytes, part.path)),
      canonical({ kind: 'dossier-result', ok: true, exit: 0, stderr: '', stdout: canonical({ outcome: 'validated-and-staged', eligibility: 'pending', packetSha256: packet.sha256 }) })];
    const { tool_choice: _toolChoice, ...baseline } = profile.baseline;
    const checked = calls.map(call => ({ toolUseId: call.id, usage: { inputTokens: 3, outputTokens: 4 } }));
    for (let index = 0; index < 4; index++) {
      const messages = [profile.historicalInitialMessage];
      for (let at = 0; at <= index; at++) messages.push(assistant(calls[at]!), { role: 'user', content: [{ type: 'tool_result', tool_use_id: calls[at]!.id,
        ...(at === index ? { cache_control: { type: 'ephemeral', ttl: '1h' } } : {}), content: [{ type: 'text', text: `${replies[at]}\n` },
          { type: 'text', text: '<system-reminder>\n<total_tokens>14999993 tokens left</total_tokens>\n</system-reminder>' }] }] });
      const metrics = { secretCodeUnits: 0, secretCalls: 0, activeCodeUnits: 0, activeCalls: 0 };
      const decision = screenOrderedDesignRequest(Buffer.from(canonical({ ...baseline,
        metadata: { user_id: JSON.stringify({ device_id: '0'.repeat(64), account_uuid: '', session_id: session }) }, messages })),
      { profile, plan, envelope: view.bytes, prepared: checked[0]!, parts: checked.slice(1, Math.min(index + 1, 3)),
        ...(index === 3 ? { acknowledgment: { ...checked[3]!, input: submit } } : {}) }, {
        scanSecrets: text => { metrics.secretCalls++; metrics.secretCodeUnits += text.length; return false; },
        scanDesignView: text => { metrics.activeCalls++; metrics.activeCodeUnits += text.length; return false; },
      });
      expect(decision.ok).toBe(true);
      for (const metric of ['secretCodeUnits', 'secretCalls', 'activeCodeUnits', 'activeCalls'] as const)
        expect(metrics[metric]).toBeLessThanOrEqual(Object.values(work.turns[index]!.branches).reduce((sum, bound) => sum + bound[metric], 0));
      expect(metrics.activeCalls).toBeGreaterThan(0);
    }
  });

  it('charges actual streamed partial JSON and reconstructed content against the bounded response operation', () => {
    const event = (type: string, value: object) => `event: ${type}\ndata: ${JSON.stringify({ type, ...value })}\n\n`;
    const message = { id: 'msg_owned', type: 'message', role: 'assistant', model: DEFAULT_SESSION_MODEL,
      content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 3, output_tokens: 0 } };
    const wire = Buffer.from(event('message_start', { message })
      + event('content_block_start', { index: 0, content_block: { type: 'tool_use', id: 'toolu_owned', name: 'mcp__syzygy__artifact_read', input: {} } })
      + event('content_block_delta', { index: 0, delta: { type: 'input_json_delta', partial_json: '{"path":"own\\' } })
      + event('content_block_delta', { index: 0, delta: { type: 'input_json_delta', partial_json: '\\view.json"}' } })
      + event('content_block_stop', { index: 0 })
      + event('message_delta', { delta: { stop_reason: 'tool_use', stop_sequence: null }, usage: { output_tokens: 4 } })
      + event('message_stop', {}));
    const responseShape = { ...shape, turns: shape.turns.map(turn => ({ ...turn, responseWire: { ...turn.responseWire, bytes: wire.length } })) };
    const { budget } = fixture({ shape: responseShape });
    const ticket = budget.begin('response', 0)!;
    const result = decodeSessionResponse(wire, 'text/event-stream', DEFAULT_SESSION_MODEL,
      text => !budget.detector(ticket, 'operation', 'secret', text.length));
    expect(result.ok).toBe(true);
    expect(budget.finish(ticket)).toBe(true);
  });

  it('charges each actual detector branch and inverse separately and retires overspend permanently', () => {
    const { budget } = fixture();
    const request = budget.begin('request', 0)!;
    expect(budget.detector(request, 'raw', 'secret', 100)).toBe(true);
    expect(budget.detector(request, 'received', 'secret', 100)).toBe(true);
    expect(budget.detector(request, 'prepared', 'secret', 100)).toBe(true);
    expect(budget.detector(request, 'logicalReceived', 'active', 80)).toBe(true);
    expect(budget.detector(request, 'logicalPrepared', 'active', 80)).toBe(true);
    expect(budget.inverse(request, 80)).toBe(true);
    expect(budget.inverse(request, 80)).toBe(true);
    expect(budget.inverse(request, 1)).toBe(false);
    expect(budget.finish(request)).toBe(false);
    expect(budget.begin('request', 1)).toBeNull();
    expect(budget.snapshot()).toMatchObject({ state: 'stopped', reason: 'transform-limit' });

    const passes = fixture().budget;
    const passesRequest = passes.begin('request', 0)!;
    expect(passes.inverse(passesRequest, 1)).toBe(true);
    expect(passes.inverse(passesRequest, 1)).toBe(true);
    expect(passes.inverse(passesRequest, 1)).toBe(false);
    const units = fixture().budget;
    const unitsRequest = units.begin('request', 0)!;
    expect(units.inverse(unitsRequest, 81)).toBe(true);
    expect(units.inverse(unitsRequest, 80)).toBe(false);

    const raw = fixture().budget;
    const rawRequest = raw.begin('request', 0)!;
    expect(raw.detector(rawRequest, 'raw', 'secret', 100)).toBe(true);
    expect(raw.detector(rawRequest, 'raw', 'secret', 0)).toBe(false);
    const logical = fixture().budget;
    const logicalRequest = logical.begin('request', 0)!;
    expect(logical.detector(logicalRequest, 'logicalReceived', 'secret', 1570)).toBe(true);
    expect(logical.detector(logicalRequest, 'logicalPrepared', 'secret', 1570)).toBe(true);
    expect(logical.detector(logicalRequest, 'logicalReceived', 'secret', 1)).toBe(false);

    const other = fixture().budget;
    const response = other.begin('response', 0)!;
    expect(other.detector(response, 'operation', 'secret', 8_388_609)).toBe(false);
    expect(other.current()).toBe(false);
    const bytes = fixture().budget;
    const audit = bytes.begin('audit', 0)!;
    expect(bytes.auditRead(audit, 100)).toBe(true);
    expect(bytes.auditRead(audit, 1)).toBe(false);
  });

  it('retains measured CPU on a late result and refuses clock rollback, crossed wall or operation CPU', () => {
    const cpu = fixture();
    const request = cpu.budget.begin('request', 0)!;
    cpu.clock(2, 2, 11);
    expect(cpu.budget.finish(request)).toBe(false);
    expect(cpu.budget.snapshot()).toMatchObject({ state: 'stopped', reason: 'operation-cpu-limit', cpuMicroseconds: 11 });
    cpu.clock(2, 2, 0);
    expect(cpu.budget.current()).toBe(false);
    const wall = fixture();
    const ticket = wall.budget.begin('tool', 0)!;
    wall.clock(11, 11, 0);
    expect(wall.budget.finish(ticket)).toBe(false);
    const expiry = fixture();
    expiry.clock(571, 571, 0);
    expect(expiry.budget.current()).toBe(false);
    expiry.clock(572, 572, 25);
    expect(expiry.budget.current()).toBe(false);
    expect(expiry.budget.snapshot()).toMatchObject({ state: 'stopped', reason: 'expired', cpuMicroseconds: 25, wallMilliseconds: 571 });
    expiry.clock(1, 1, 0);
    expect(expiry.budget.current()).toBe(false);
    const cumulative = fixture();
    cumulative.clock(2, 2, 371);
    expect(cumulative.budget.current()).toBe(false);
    expect(cumulative.budget.snapshot()).toMatchObject({ reason: 'cpu-limit', cpuMicroseconds: 371 });
    const rollback = fixture();
    rollback.clock(2, 2, 1);
    expect(rollback.budget.current()).toBe(true);
    rollback.clock(1, 2, 1);
    expect(rollback.budget.current()).toBe(false);
  });

  it('charges nested durable audits inside the inclusive tool envelope and restores its parent', () => {
    const f = fixture(), tool = f.budget.begin('tool', 0)!;
    const audit = f.budget.begin('audit', 0)!;
    expect(f.budget.auditRead(audit, 100)).toBe(true);
    f.clock(2, 2, 2);
    expect(f.budget.finish(audit)).toBe(true);
    expect(f.budget.detector(tool, 'operation', 'secret', 1)).toBe(true);
    expect(f.budget.finish(tool)).toBe(true);
    expect(f.budget.snapshot()).toMatchObject({ used: { tool: 1, audit: 1 }, cpuMicroseconds: 2 });
    const inclusive = fixture();
    inclusive.budget.begin('tool', 0);
    inclusive.clock(9, 9, 0);
    const nested = inclusive.budget.begin('audit', 0)!;
    inclusive.clock(11, 11, 0);
    expect(inclusive.budget.finish(nested)).toBe(false);
    expect(inclusive.budget.snapshot()).toMatchObject({ reason: 'operation-wall-limit' });
    const wrong = fixture().budget;
    wrong.begin('request', 0);
    expect(wrong.begin('audit', 0)).toBeNull();
  });

  it('consumes each planned operation once and completes only after all 23 durable audit writes and the terminal read', () => {
    const { budget } = fixture();
    expect(budget.complete()).toBe(false);
    for (let turn = 0; turn < 4; turn++) {
      for (const operation of ['tool', 'request', 'response'] as const) {
        const ticket = budget.begin(operation, turn)!;
        expect(budget.finish(ticket)).toBe(true);
      }
    }
    for (let index = 0; index < 23; index++) expect(budget.finish(budget.begin('audit', 3)!)).toBe(true);
    expect(budget.complete()).toBe(false);
    expect(budget.finish(budget.begin('terminal', 3)!)).toBe(true);
    expect(budget.complete()).toBe(true);
    expect(budget.snapshot()).toMatchObject({ state: 'complete', used: { tool: 4, request: 4, response: 4, audit: 23, terminal: 1 } });
    expect(budget.begin('request', 0)).toBeNull();

    const copied = fixture().budget;
    const ticket = copied.begin('request', 0)!;
    expect(copied.finish({ ...ticket })).toBe(false);
    const replayed = fixture().budget;
    const first = replayed.begin('request', 0)!;
    expect(replayed.finish(first)).toBe(true);
    expect(replayed.begin('request', 0)).toBeNull();
    expect(replayed.current()).toBe(false);
  });
});
