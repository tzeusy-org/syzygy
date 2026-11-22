import { describe, expect, it, vi } from 'vitest';
import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { sha256 } from '@syzygy/support';
import { createOrderedDesignSessionProfile } from './session-profile.js';
import { planOrderedDesignBytes } from './url-design-delivery.js';
import { verifyOrderedDesignAuditPrefix, verifyOrderedDesignTerminalEvidence, type OrderedDesignAuditEvent, type OrderedDesignAuditReference } from './url-ordered-design-audit.js';
import { isIssuedOrderedDesignTerminal, createOrderedDesignAuditWriter } from './url-ordered-design-writer.js';

const encode = (value: unknown): string => encodeCanonicalJson(value, { maxBytes: 65_536, maxNodes: 4096, maxDepth: 12 });
const bytes = (value: string) => ({ sha256: sha256(value), bytes: Buffer.byteLength(value, 'utf8') });
const digest = (value: unknown) => sha256(encode(value));
const artifact = 'mcp__syzygy__artifact_read';
const step = 'mcp__syzygy__dossier_step';
const deadline = '2026-11-22T00:30:00.000Z';
const start = Date.parse('2026-11-22T00:00:00.000Z');
const originalText = 'Own audit fixture. '.repeat(2100);
const packet = bytes(originalText);
const input = {
  binding: { policy: sha256('own base policy'), run: 'own-run', role: 'design', sourceBinding: sha256('own source binding'),
    provider: 'anthropic', model: 'claude-sonnet-4-6' },
  sessionId: '12345678-1234-4234-8234-123456789012', initialPrompt: 'Read the whole owned packet.',
  systemPrompt: 'Inspect all owned parts in order.', utcDate: '2026-11-22', kernelRelease: '6.12.0-fixture',
};
const usage = { inputTokens: 3, outputTokens: 4, cacheCreationInputTokens: 0, cacheReadInputTokens: 0 };
interface Event {
  id: string;
  at: string;
  format: string;
  attemptSha256: string;
  previous: OrderedDesignAuditReference | null;
  kind: string;
  payload: Record<string, unknown>;
}

/** Synthetic held archive of safe metadata, built independently of the reader.
 * Hashing a mutation and its descendants keeps them canonical and correctly
 * chained, so failures exercise protocol verification instead of hash drift. */
function archive(mutate?: (event: Event, occurrence: number, index: number) => void) {
  const compiled = createOrderedDesignSessionProfile(input);
  if (!compiled.ok) throw new Error('own profile unavailable');
  const profile = compiled.value.profile, principal = 'operator:own';
  const envelope = Buffer.from(encode({
    encoding: 'html-entities-five/1', format: 'polaris-dossier-url-design-inert-view/1', originalBytes: packet.bytes,
    originalSha256: packet.sha256, payload: originalText, payloadBytes: packet.bytes, payloadSha256: packet.sha256,
  }));
  const plan = planOrderedDesignBytes({ envelope, envelopeSha256: sha256(envelope), original: packet,
    fileCount: 1, pageCount: 1, parents: [sha256('own parent')], instructionProfileSha256: sha256(input.systemPrompt),
    limits: { partBytes: 32768, partCount: 2, replyBytes: 45000, preparedBytes: 4096 },
    binding: { basePolicySha256: input.binding.policy, deadline, encoding: 'html-entities-five/1', originPolicySha256: sha256('own origin policy'),
      originalReceiptSha256: sha256('own original receipt'), pin: 'c'.repeat(40), producerSha256: sha256('own producer'),
      profileSha256: profile.digest, project: 'own-project', provider: 'anthropic', role: 'design', round: 1, run: input.binding.run,
      session: input.sessionId, transferEpoch: 1 } });
  const attemptSha256 = digest({ manifestSha256: plan.manifestSha256, sourceBinding: input.binding.sourceBinding, principal });
  const records: Buffer[] = [];
  const occurrences = new Map<string, number>();
  let previous: OrderedDesignAuditReference | null = null;
  const add = (kind: string, payload: Record<string, unknown>): OrderedDesignAuditReference => {
    const occurrence = 1 + (occurrences.get(kind) ?? 0);
    occurrences.set(kind, occurrence);
    const event: Event = { id: `own-event-${records.length + 1}`, format: 'url-ordered-design-audit/1',
      at: new Date(start + records.length).toISOString(), attemptSha256, previous, kind, payload: structuredClone(payload) };
    mutate?.(event, occurrence, records.length);
    const encoded = Buffer.from(encode(event));
    records.push(encoded);
    previous = { id: event.id, sha256: sha256(encoded) };
    return previous;
  };
  const tool = (id: string, name: string, args: unknown) => ({ id, name, inputSha256: digest(args) });
  const poll = tool('toolu_poll_owned', step, { argv: ['dossier', 'poll', 'own-run'] });
  const prepared = add('prepared', { call: poll, prepared: bytes(plan.preparedText),
    reply: bytes(encode({ kind: 'session-control', ok: true, state: 'events', events: [{ event: 'design-round-prepared', ...plan.prepared }] })) });
  const replies = [prepared];
  const wrappers: ReturnType<typeof bytes>[] = [];
  const exchange = (number: number, next: ReturnType<typeof tool> | null) => {
    const scope = { requestId: `11111111-1111-4111-8111-11111111111${number}`, received: bytes(`owned raw ${number}`),
      forwarded: bytes(`owned forwarded ${number}`), route: 'messages' };
    const admission = add('request-admitted', { ...scope, logical: bytes(`own logical ${number}`),
      results: replies.map((receipt, index) => ({ receipt, wrapper: wrappers[index] ?? bytes(`audited wrapper ${index} in ${number}`) })),
      transcriptSha256: sha256(`own independently checked transcript ${number}`) });
    const sendAttempt = add('send-attempt', { ...scope, admission, outcome: 'attempted' });
    const sendOutcome = add('send-outcome', { ...scope, admission, sendAttempt, outcome: 'local-request-flushed' });
    const response = add('response-admitted', { ...scope, admission, sendAttempt, sendOutcome, outcome: 'response-admitted', status: 200, usage,
      native: { ...bytes(`own complete SSE response ${number}`), content: 'messages-event-stream',
        stopReason: next === null ? 'end_turn' : 'tool_use', textBlocks: next === null ? 1 : 0, tool: next } });
    return { admission, sendAttempt, sendOutcome, response };
  };
  const first = tool('toolu_first_owned', artifact, { path: 'round-1/design-view-part-1.json' });
  const second = tool('toolu_second_owned', artifact, { path: 'round-1/design-view-part-2.json' });
  const verdictBody = bytes('{"owned":"verdict"}');
  const submit = tool('toolu_submit_owned', step, { argv: ['dossier', 'await', '/work', '--submit', 'round-1/verdict.json', '--stdin'], stdin: '{"owned":"verdict"}' });
  const preparedExchange = exchange(1, first);
  const firstReceipt = add('part-receipt', { ordinal: 1, issuedBy: preparedExchange.response, call: first,
    reply: { sha256: plan.replies[0]!.sha256, bytes: plan.replies[0]!.bytes } });
  replies.push(firstReceipt);
  const firstExchange = exchange(2, second);
  const secondReceipt = add('part-receipt', { ordinal: 2, issuedBy: firstExchange.response, call: second,
    reply: { sha256: plan.replies[1]!.sha256, bytes: plan.replies[1]!.bytes } });
  replies.push(secondReceipt);
  const secondExchange = exchange(3, submit);
  const completion = add('delivery-completed', { prepared, preparedExchange,
    parts: [{ receipt: firstReceipt, ...firstExchange }, { receipt: secondReceipt, ...secondExchange }],
    finalAdmission: secondExchange.admission, verdictResponse: secondExchange.response, verdictCall: submit });
  const checkedVerdictSha256 = sha256('own independently validated verdict record');
  const stage = add('verdict-staged', { completion, issuedBy: secondExchange.response, verdictCall: submit, packet,
    checkedVerdictSha256, verdict: verdictBody });
  const ackText = encode({ exit: 0, kind: 'dossier-result', ok: true, stderr: '',
    stdout: encode({ eligibility: 'pending', outcome: 'validated-and-staged', packetSha256: packet.sha256 }) });
  const acknowledgment = add('acknowledgment-receipt', { stage, call: submit, reply: bytes(ackText) });
  replies.push(acknowledgment);
  const wrapper = bytes(encode({ role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_submit_owned',
    cache_control: { type: 'ephemeral', ttl: '1h' }, content: [{ type: 'text', text: ackText + '\n' },
      { type: 'text', text: '<system-reminder>\n<total_tokens>14999993 tokens left</total_tokens>\n</system-reminder>' }] }] }));
  wrappers[3] = wrapper;
  const terminal = add('eligible', { completion, stage, acknowledgment, wrapper, ...exchange(4, null) });
  return { evidence: { profile, plan, principal, asOf: start + 50, records, terminal },
    expected: { terminal, completion, stage, checkedVerdictSha256, verdict: verdictBody, packetSha256: packet.sha256 } };
}
const changed = { id: 'other-event', sha256: sha256('other event') };
const fields = (value: unknown): Record<string, unknown> => value as Record<string, unknown>;

describe('live ordered design audit writer', () => {
  it('issues a terminal only after all 23 durable records and revokes the live result on currentness loss', async () => {
    const { evidence, expected } = archive();
    vi.spyOn(Date, 'now').mockReturnValue(evidence.asOf);
    let current = true;
    const stored: Buffer[] = [];
    try {
      const writer = createOrderedDesignAuditWriter(evidence, {
        current: async () => current,
        append: async record => {
          const index = stored.push(Buffer.from(encode(record))) - 1;
          return () => Buffer.from(stored[index]!);
        },
      });
      const refs = new Map<string, OrderedDesignAuditReference>();
      const replaceRefs = (value: unknown): unknown => {
        if (Array.isArray(value)) return value.map(replaceRefs);
        if (typeof value !== 'object' || value === null) return value;
        const object = fields(value);
        if (typeof object.id === 'string' && object.id.startsWith('own-event-')) return refs.get(object.id);
        return Object.fromEntries(Object.entries(object).map(([key, member]) => [key, replaceRefs(member)]));
      };
      for (const bytes of evidence.records) {
        const event: OrderedDesignAuditEvent = JSON.parse(bytes.toString('utf8'));
        await expect(writer.readTerminal()).rejects.toThrow('url-ordered-design-audit-writer-refused');
        refs.set(event.id, await writer.append(event.kind, replaceRefs(event.payload) as OrderedDesignAuditEvent['payload']));
      }
      expect(stored).toHaveLength(23);
      const terminal = refs.get(expected.terminal.id)!;
      const observed = await writer.readTerminal();
      expect(observed).toEqual(replaceRefs(expected));
      expect(isIssuedOrderedDesignTerminal(writer, observed)).toBe(true);
      expect(isIssuedOrderedDesignTerminal(writer, { ...observed })).toBe(false);
      expect(isIssuedOrderedDesignTerminal({ ...writer }, observed)).toBe(false);
      expect(verifyOrderedDesignTerminalEvidence({ ...evidence, records: stored, terminal })).toEqual(replaceRefs(expected));
      await expect(writer.retire('interrupted')).rejects.toThrow('url-ordered-design-audit-writer-refused');
      current = false;
      await expect(writer.readTerminal()).rejects.toThrow('url-ordered-design-audit-writer-refused');
      expect(isIssuedOrderedDesignTerminal(writer, observed)).toBe(false);
      current = true;
      await expect(writer.readTerminal()).rejects.toThrow('url-ordered-design-audit-writer-refused');
      expect(stored).toHaveLength(23);
    } finally { vi.restoreAllMocks(); }
  });

  it('admits only one append in flight and never retries a record with unconfirmed readback', async () => {
    const { evidence } = archive();
    const { payload } = JSON.parse(evidence.records[0]!.toString('utf8')) as OrderedDesignAuditEvent<'prepared'>;
    vi.spyOn(Date, 'now').mockReturnValue(evidence.asOf);
    const append = vi.fn(async () => () => Buffer.from('different persisted bytes'));
    try {
      const writer = createOrderedDesignAuditWriter(evidence, { current: async () => true, append });
      const first = writer.append('prepared', payload);
      await expect(writer.append('prepared', payload)).rejects.toThrow('url-ordered-design-audit-writer-refused');
      await expect(first).rejects.toThrow('url-ordered-design-audit-writer-refused');
      await expect(writer.append('prepared', payload)).rejects.toThrow('url-ordered-design-audit-writer-refused');
      await expect(writer.retire('transport-uncertain')).rejects.toThrow('url-ordered-design-audit-writer-refused');
      await expect(writer.readTerminal()).rejects.toThrow('url-ordered-design-audit-writer-refused');
      expect(append).toHaveBeenCalledTimes(1);
    } finally { vi.restoreAllMocks(); }
  });
});

describe('protected ordered design terminal evidence verifier', () => {
  it('reads the complete sealed two-part chain and returns only linked evidence identities', () => {
    const { evidence, expected } = archive();
    expect(evidence.records).toHaveLength(23);
    const confirmed = verifyOrderedDesignTerminalEvidence(evidence);
    expect(confirmed).toEqual(expected);
    expect(Object.isFrozen(confirmed?.terminal)).toBe(true);
    expect(verifyOrderedDesignTerminalEvidence({ ...evidence, asOf: Date.parse(deadline) + 1 })).toEqual(expected);
  });

  it('names the next event at each verified canonical prefix, including both part ordinals', () => {
    const { evidence, expected } = archive();
    const expectedNext = [
      'prepared', 'request-admitted', 'send-attempt', 'send-outcome', 'response-admitted',
      'part-receipt', 'request-admitted', 'send-attempt', 'send-outcome', 'response-admitted',
      'part-receipt', 'request-admitted', 'send-attempt', 'send-outcome', 'response-admitted',
      'delivery-completed', 'verdict-staged', 'acknowledgment-receipt', 'request-admitted',
      'send-attempt', 'send-outcome', 'response-admitted', 'eligible', null,
    ];
    const attemptSha256 = digest({ manifestSha256: evidence.plan.manifestSha256, sourceBinding: input.binding.sourceBinding, principal: evidence.principal });
    for (const [count, next] of expectedNext.entries()) {
      const records = evidence.records.slice(0, count);
      expect(verifyOrderedDesignAuditPrefix({ ...evidence, records })).toEqual({
        attemptSha256, tip: count === 0 ? null : { id: `own-event-${count}`, sha256: sha256(records[count - 1]!) },
        next, nextPartOrdinal: count === 5 ? 1 : count === 10 ? 2 : null, terminalCandidate: next === null ? expected : null,
      });
      if (next !== null) expect(verifyOrderedDesignTerminalEvidence({ ...evidence, records })).toBeNull();
    }
  });

  it('refuses a terminal proposal before the admitted acknowledgment response, even with a recomputed next-record link', () => {
    const { evidence } = archive();
    const eligible: Event = JSON.parse(evidence.records.at(-1)!.toString());
    for (const count of [17, 18, 19, 20, 21]) {
      const records = evidence.records.slice(0, count);
      const last = records.at(-1)!;
      const proposed = { ...eligible, previous: { id: `own-event-${count}`, sha256: sha256(last) } };
      expect(verifyOrderedDesignAuditPrefix({ ...evidence, records: [...records, Buffer.from(encode(proposed))] })).toBeNull();
    }
  });

  it('refuses absent entry slots, skipped events and extra records instead of accepting a shorter prefix', () => {
    const { evidence } = archive();
    const absent = evidence.records.slice(0, 4);
    delete absent[2];
    for (const records of [absent, [evidence.records[1]!], [...evidence.records, evidence.records.at(-1)!]]) {
      expect(verifyOrderedDesignAuditPrefix({ ...evidence, records })).toBeNull();
    }
    expect(verifyOrderedDesignAuditPrefix({ ...evidence, records: [], plan: structuredClone(evidence.plan) })).toBeNull();
    expect(verifyOrderedDesignAuditPrefix({ ...evidence, records: [], profile: structuredClone(evidence.profile) })).toBeNull();
  });

  it.each([
    ['wrong first-part selector', 'response-admitted', 1, (e: Event) => { fields(fields(e.payload.native).tool).inputSha256 = digest({ path: 'round-1/design-view-part-2.json' }); }],
    ['logical carrier reused as a real tool id', 'response-admitted', 1, (e: Event) => { fields(fields(e.payload.native).tool).id = 'toolu_syzygy_035_logical_view'; }],
    ['receipt linked to another response', 'part-receipt', 1, (e: Event) => { e.payload.issuedBy = changed; }],
    ['substituted planned reply', 'part-receipt', 2, (e: Event) => { e.payload.reply = bytes('other reply'); }],
    ['duplicated ordinal', 'part-receipt', 2, (e: Event) => { e.payload.ordinal = 1; }],
    ['unknown raw body member', 'part-receipt', 1, (e: Event) => { e.payload.raw = 'body'; }],
    ['earlier receipt omitted in final-part request', 'request-admitted', 3, (e: Event) => { (e.payload.results as unknown[]).shift(); }],
    ['logical proof unavailable', 'request-admitted', 4, (e: Event) => { delete e.payload.logical; }],
    ['mismatched received digest for actual send', 'send-attempt', 4, (e: Event) => { e.payload.received = bytes('other actual request'); }],
    ['unknown actual acknowledgment send outcome', 'send-outcome', 4, (e: Event) => { e.payload.outcome = 'Unknown'; }],
    ['transport refused instead of native response', 'response-admitted', 4, (e: Event) => { e.kind = 'response-refused'; }],
    ['terminal HTTP failure', 'response-admitted', 4, (e: Event) => { e.payload.status = 502; }],
    ['terminal response linked to another send', 'response-admitted', 4, (e: Event) => { e.payload.sendOutcome = changed; }],
    ['terminal response has a dependent tool', 'response-admitted', 4, (e: Event) => { fields(e.payload.native).tool = { id: 'toolu_more', name: step, inputSha256: sha256('extra') }; }],
    ['terminal response used the wrong stop reason', 'response-admitted', 4, (e: Event) => { fields(e.payload.native).stopReason = 'max_tokens'; }],
    ['terminal response contains extra text blocks', 'response-admitted', 4, (e: Event) => { fields(e.payload.native).textBlocks = 2; }],
    ['invalid authoritative usage', 'response-admitted', 3, (e: Event) => { fields(e.payload.usage).outputTokens = -1; }],
    ['wrong final-part request in completion', 'delivery-completed', 1, (e: Event) => { e.payload.finalAdmission = changed; }],
    ['stage points at another completion', 'verdict-staged', 1, (e: Event) => { e.payload.completion = changed; }],
    ['staged verdict names the envelope', 'verdict-staged', 1, (e: Event) => { e.payload.packet = bytes('transport envelope'); }],
    ['ack claims a counted verdict', 'acknowledgment-receipt', 1, (e: Event) => { e.payload.reply = bytes(encode({ eligibility: 'eligible' })); }],
    ['ack wrapper has a substituted digest', 'request-admitted', 4, (e: Event) => { fields((e.payload.results as unknown[])[3]).wrapper = bytes('incorrect wrapper'); }],
    ['eligible points at an older stage', 'eligible', 1, (e: Event) => { e.payload.stage = changed; }],
    ['eligible is recorded at the deadline', 'eligible', 1, (e: Event) => { e.at = deadline; }],
    ['attempt retires instead of becoming eligible', 'eligible', 1, (e: Event) => { e.kind = 'retired'; }],
    ['record scope changes across epoch', 'verdict-staged', 1, (e: Event) => { e.attemptSha256 = sha256('other epoch'); }],
    ['event ID is replayed', 'response-admitted', 4, (e: Event) => { e.id = 'own-event-1'; }],
  ] as const)('rejects a properly rehashed archive with %s at its first invalid record', (label, kind, ordinal, mutate) => {
    let invalidAt = -1;
    const { evidence } = archive((event, occurrence, index) => {
      if (event.kind === kind && occurrence === ordinal) { invalidAt = index; mutate(event); }
    });
    const asOf = label === 'eligible is recorded at the deadline' ? Date.parse(deadline) + 1 : evidence.asOf;
    expect(invalidAt).toBeGreaterThanOrEqual(0);
    expect(verifyOrderedDesignAuditPrefix({ ...evidence, asOf, records: evidence.records.slice(0, invalidAt) })).not.toBeNull();
    expect(verifyOrderedDesignAuditPrefix({ ...evidence, asOf, records: evidence.records.slice(0, invalidAt + 1) })).toBeNull();
    expect(verifyOrderedDesignTerminalEvidence({ ...evidence, asOf })).toBeNull();
  });

  it('refuses missing, repeated, unanchored, malformed and out-of-scope records', () => {
    const { evidence } = archive();
    const damaged = Array.from(evidence.records);
    damaged[0] = Buffer.concat([damaged[0]!, Buffer.from('\n')]);
    for (const changes of [
      { records: evidence.records.slice(0, -1) },
      { records: [...evidence.records, evidence.records.at(-1)!] },
      { records: damaged },
      { records: [Buffer.from([0xff]), ...evidence.records.slice(1)] },
      { records: [Buffer.alloc(65_537), ...evidence.records.slice(1)] },
      { terminal: { ...evidence.terminal, sha256: changed.sha256 } },
      { principal: 'operator:someone-else' },
      { asOf: start },
      { profile: structuredClone(evidence.profile) },
      { plan: structuredClone(evidence.plan) },
    ]) expect(verifyOrderedDesignTerminalEvidence({ ...evidence, ...changes })).toBeNull();
  });
});
