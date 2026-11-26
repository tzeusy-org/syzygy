import { afterEach, describe, expect, it, vi } from 'vitest';
import { runGenerationPipeline, type AttemptInput, type AttemptOutcome, type PipelinePorts, type PipelineRequest, type ProviderReply } from './pipeline.js';
import { createHash } from 'node:crypto';
import { promptForStage, type GenerationStage } from './prompts.js';
import { generationAnchorId, generationSourcesForBody, gitBlobObjectId, type GenerationSource } from './generation-source.js';

const fixtureSource = (): GenerationSource => {
  const body = 'Reduce recurring mental labor.';
  const base = { repositoryId: 'synthetic:project-a', revision: 'a'.repeat(40), path: 'synthetic/purpose.md', objectId: gitBlobObjectId(body) };
  const end = Buffer.byteLength(body);
  return { ...base, sourceId: 'purpose', evaluationId: 'evaluation:fixture', classificationBasis: 'body', exclusion: { excluded: false }, body,
    spans: [{ anchorId: generationAnchorId(base, 0, end), start: 0, end, text: body }] };
};

const request = (): PipelineRequest => ({
  requestId: 'request-1', projectId: 'project-a', snapshotId: 'snapshot-1',
  routes: { inventory: 'synthetic', plan: 'synthetic', author: 'synthetic', edit: 'synthetic', fidelity: 'synthetic', repair: 'synthetic' }, startedAt: Date.now(),
  budget: { maxCalls: 10, maxInputBytes: 200_000, maxOutputBytes: 20_000, maxUsageUnits: 100, maxElapsedMs: 10_000, maxRepairCycles: 1, accountingPolicy: 'synthetic-units-v1' },
  sources: [fixtureSource()], readerQuestions: [{ id: 'why', topics: [], text: 'Why does this project exist?' }], requestedAssets: [],
});

function scriptedReply(stage: GenerationStage, input: string, draft: unknown, blockIds: readonly string[] = []): ProviderReply {
  const edit = { draft, changes: blockIds.map(blockId => ({ blockId, action: 'kept', reason: 'Fixture block.', newBlockIds: [] })) };
  let value = draft;
  if (stage === 'edit') value = edit;
  if (stage === 'repair') {
    const { findings } = JSON.parse(input).inputs as { findings: { id: string }[] };
    value = { ...edit, findingDispositions: findings.map(({ id }) => ({ findingId: id, action: 'repaired', reason: 'Fixture repair.' })) };
  }
  return { body: JSON.stringify(value), model: 'synthetic-v1', usageUnits: 1 };
}

function harness() {
  const sends: { stage: string; input: string }[] = [];
  const outcomes: string[] = [];
  const fullOutcomes: AttemptOutcome[] = [];
  const late: unknown[] = [];
  const attempts: AttemptInput[] = [];
  const admitted = new Set<string>();
  const ports: PipelinePorts = {
    now: () => Date.now(), verifySources: async () => true,
    permissionIdentity: async () => 'fixture-permission-v1',
    admit: async input => {
      attempts.push(input);
      const id = `${input.requestId}:${input.ordinal}`;
      if (admitted.has(id)) return { kind: 'refused', reason: 'in-flight' };
      admitted.add(id);
      return { kind: 'reserved', permit: { attemptId: id, maxUsageUnits: 5, maxOutputBytes: 1000 } };
    },
    permitted: async () => true, releaseUnsent: async () => undefined,
    responseSchema: stage => ({ version: 'test-record-v1', schema: { type: 'object', properties: { stage: { const: stage } }, required: ['stage'], additionalProperties: false } }),
    generate: async input => { sends.push(input); return scriptedReply(input.stage, input.input, { stage: input.stage }); },
    validate: (stage, data) => {
      const value = (stage === 'edit' || stage === 'repair') ? (data as { draft?: unknown }).draft : data;
      if (!value || typeof value !== 'object' || Object.keys(value).length !== 1 || (value as { stage?: unknown }).stage !== stage) throw Error('schema');
      return data;
    },
    record: async (_, outcome) => { outcomes.push(outcome.kind); fullOutcomes.push(outcome); },
    lateReceipt: async (_, receipt) => { late.push(receipt); },
    fidelity: () => ({ blocking: false, findings: [] }),
  };
  return { ports, sends, outcomes, fullOutcomes, late, attempts };
}
const signal = () => new AbortController().signal;
afterEach(() => vi.useRealTimers());

describe('source to editorial draft pipeline', () => {
  it('binds each stage route and model to its own receipt, including a repair, while equal routes remain valid', async () => {
    const h = harness();
    const routed = { ...request(), routes: { inventory: 'route-inventory', plan: 'route-plan', author: 'route-author', edit: 'route-edit', fidelity: 'route-review', repair: 'route-repair' } };
    let reviews = 0;
    const result = await runGenerationPipeline(routed, { ...h.ports, fidelity: () => ({ blocking: ++reviews === 1, findings: ['fix'] }) }, signal());
    expect(result.status).toBe('awaiting-rendered-review');
    expect(result.receipts.map(receipt => [receipt.stage, receipt.providerRoute, receipt.model])).toEqual([
      ['inventory', 'route-inventory', 'synthetic-v1'], ['plan', 'route-plan', 'synthetic-v1'],
      ['author', 'route-author', 'synthetic-v1'], ['edit', 'route-edit', 'synthetic-v1'],
      ['fidelity', 'route-review', 'synthetic-v1'], ['repair', 'route-repair', 'synthetic-v1'],
      ['fidelity', 'route-review', 'synthetic-v1'],
    ]);
    const equal = await runGenerationPipeline(request(), harness().ports, signal());
    expect(equal.status).toBe('awaiting-rendered-review');
    expect(new Set(equal.receipts.map(receipt => receipt.providerRoute))).toEqual(new Set(['synthetic']));
  });

  it('rejects a missing stage route before dispatch', async () => {
    const h = harness();
    const malformed = { ...request(), routes: { inventory: 'only-inventory' } as PipelineRequest['routes'] };
    expect(await runGenerationPipeline(malformed, h.ports, signal())).toMatchObject({ status: 'stopped', reason: 'invalid-request' });
    expect(h.sends).toEqual([]);
  });

  it('keeps the author plan out of the canonically encoded fidelity and repair envelopes', async () => {
    const h = harness();
    const sentinel = 'PLAN-HANDLE-NO-FIDELITY-LEAK-8e21';
    const ports = { ...h.ports, validate: (stage: string, value: unknown) => stage === 'plan' ? { ...(value as object), sentinel } : value,
      fidelity: (() => { let n = 0; return () => ({ blocking: ++n === 1, findings: ['repair'] }); })() };
    expect((await runGenerationPipeline(request(), ports, signal())).status).toBe('awaiting-rendered-review');
    expect(h.sends.find(send => send.stage === 'author')?.input).toContain(sentinel);
    for (const stage of ['fidelity', 'repair']) {
      const encoded = h.sends.find(send => send.stage === stage)?.input;
      expect(encoded).toBeDefined();
      expect(encoded).not.toContain(sentinel);
      const contaminated = JSON.stringify({ ...JSON.parse(encoded!).inputs, plan: { sentinel } });
      expect(contaminated).toContain(sentinel);
    }
  });

  it('sends full corpus once and downstream only the spans cited by their inputs', async () => {
    const h = harness();
    const secondBody = 'SECOND-SOURCE-UNSELECTED-1f6b'.repeat(40);
    const first = fixtureSource();
    const secondBase = { repositoryId: first.repositoryId, revision: first.revision, path: 'synthetic/other.md', objectId: gitBlobObjectId(secondBody) };
    const second: GenerationSource = { ...first, ...secondBase, sourceId: 'other', body: secondBody,
      spans: [{ anchorId: generationAnchorId(secondBase, 0, Buffer.byteLength(secondBody)), start: 0, end: Buffer.byteLength(secondBody), text: secondBody }] };
    const input = { ...request(), sources: [first, second] };
    const ports = { ...h.ports, validate: (stage: string, value: unknown) => stage === 'plan' ? { ...(value as object), sourceIds: ['purpose'] } : value };
    expect((await runGenerationPipeline(input, ports, signal())).status).toBe('awaiting-rendered-review');
    expect(h.sends[0]?.input).toContain(secondBody);
    expect(h.sends[1]?.input).not.toContain(secondBody);
    expect(h.sends.find(send => send.stage === 'author')?.input).toContain('Reduce recurring mental labor.');
    expect(h.sends.slice(1).every(send => !send.input.includes(secondBody))).toBe(true);
    expect(h.attempts.map(attempt => attempt.inputBytes)).toEqual(h.sends.map(send => Buffer.byteLength(send.input)));
    const leaked = h.sends[1]!.input.replace('"sources":', `"sources":[{"text":"${secondBody}"}],"unrelated":`);
    expect(leaked).toContain(secondBody);
  });

  it('counts a path-only source in inventory but never offers its body or support handle to the provider', async () => {
    const h = harness();
    const first = fixtureSource();
    const { body: _body, ...withoutBody } = first;
    const pathOnly: GenerationSource = { ...withoutBody, sourceId: 'path-only', path: 'synthetic/path-only.md',
      spans: [], classificationBasis: 'path-only' };
    const result = await runGenerationPipeline({ ...request(), sources: [first, pathOnly] }, h.ports, signal());
    expect(result.status, result.status === 'stopped' ? result.reason : '').toBe('awaiting-rendered-review');
    const inventory = JSON.parse(h.sends[0]!.input).inputs;
    expect(inventory.sourcePopulation).toHaveLength(2);
    expect(inventory.sourcePopulation[1]).toMatchObject({ sourceId: 'path-only', classificationBasis: 'path-only' });
    expect(inventory.sources).toEqual([{ sourceId: 'purpose', text: 'Reduce recurring mental labor.' }]);
  });

  it('stops on malformed reader questions before any dispatch', async () => {
    for (const readerQuestions of ['Why?', ['Why?'], [], [{ id: 'q', topics: ['nope'], text: 'x' }], [{ id: 'q', topics: [], text: 'x', extra: true }]]) {
      const h = harness();
      expect(await runGenerationPipeline({ ...request(), readerQuestions }, h.ports, signal())).toMatchObject({ status: 'stopped', reason: 'invalid-request' });
      expect(h.sends).toHaveLength(0);
    }
  });

  it('refuses a 201st quotable source instead of silently truncating the corpus', async () => {
    const h = harness();
    const sources = Array.from({ length: 201 }, (_, i): GenerationSource => {
      const first = fixtureSource();
      const base = { repositoryId: first.repositoryId, revision: first.revision, path: `synthetic/source-${i}.md`, objectId: first.objectId as string };
      return { ...first, ...base, sourceId: `source-${i}`,
        spans: [{ ...first.spans[0]!, anchorId: generationAnchorId(base, 0, Buffer.byteLength(first.body!)) }] };
    });
    expect(await runGenerationPipeline({ ...request(), sources, budget: { ...request().budget, maxInputBytes: 1_000_000 } }, h.ports, signal()))
      .toMatchObject({ status: 'stopped', reason: 'source-refused' });
    expect(h.sends).toHaveLength(0);
  });

  it('refuses a population that segmentation tips over the 200 cap', async () => {
    const h = harness();
    const whole = Array.from({ length: 199 }, (_, i): GenerationSource => {
      const first = fixtureSource();
      const base = { repositoryId: first.repositoryId, revision: first.revision, path: `synthetic/source-${i}.md`, objectId: first.objectId as string };
      return { ...first, ...base, sourceId: `source-${i}`, spans: [{ ...first.spans[0]!, anchorId: generationAnchorId(base, 0, Buffer.byteLength(first.body!)) }] };
    });
    const first = fixtureSource();
    const big = `${'a long line of source text\n'.repeat(4000)}`;
    const pieces = generationSourcesForBody({ sourceId: 'big', repositoryId: first.repositoryId, revision: first.revision, path: 'synthetic/big.c',
      objectId: gitBlobObjectId(big), evaluationId: first.evaluationId, body: big });
    expect(pieces.length).toBeGreaterThan(1);
    const sources = [...whole, ...pieces];
    expect(whole.length + 1).toBeLessThanOrEqual(200);
    expect(sources.length).toBeGreaterThan(200);
    expect(await runGenerationPipeline({ ...request(), sources, budget: { ...request().budget, maxInputBytes: 4_000_000 } }, h.ports, signal()))
      .toMatchObject({ status: 'stopped', reason: 'source-refused' });
    expect(h.sends).toHaveLength(0);
  });

  it('executes independent inventory, planning, authoring, editing and source review with bound recipes', async () => {
    const h = harness();
    const result = await runGenerationPipeline(request(), h.ports, signal());
    expect(result.status).toBe('awaiting-rendered-review');
    expect(h.sends.map(x => x.stage)).toEqual(['inventory', 'plan', 'author', 'edit', 'fidelity']);
    const inventory = JSON.parse(h.sends[0]!.input);
    expect(Object.keys(inventory.inputs).sort()).toEqual(['readerQuestions', 'requestedAssets', 'sourcePopulation', 'sources']);
    expect(inventory.responseSchemaVersion).toBe('test-record-v1');
    const fidelity = JSON.parse(h.sends[4]!.input).inputs;
    expect(fidelity.sources).toEqual([]);
    expect(fidelity.inventory).toEqual({ stage: 'inventory' });
    expect(fidelity.draft).toEqual({ stage: 'edit' });
    expect(fidelity).not.toHaveProperty('plan');
    expect(result.receipts).toHaveLength(5);
    expect(h.outcomes).toEqual(Array(5).fill('validated'));
  });

  it('repairs named findings then independently re-reviews, without treating source review as rendered readiness', async () => {
    const h = harness();
    let reviews = 0;
    const ports = { ...h.ports, fidelity: () => ({ blocking: ++reviews === 1, findings: ['unsupported edge'] }) };
    const result = await runGenerationPipeline(request(), ports, signal());
    expect(result.status).toBe('awaiting-rendered-review');
    expect(h.sends.map(x => x.stage)).toEqual(['inventory', 'plan', 'author', 'edit', 'fidelity', 'repair', 'fidelity']);
    expect(JSON.parse(h.sends[5]!.input).inputs.findings).toEqual([{ id: 'finding-1-1', finding: 'unsupported edge' }]);
  });

  it('refuses a bare edit reply before marking the attempt complete', async () => {
    const h = harness();
    const result = await runGenerationPipeline(request(), { ...h.ports, validate: (_stage, value) => value,
      generate: async input => input.stage === 'edit' ? { body: '{"stage":"edit"}', model: 'synthetic-v1', usageUnits: 1 } : h.ports.generate(input),
    }, signal());
    expect(result).toMatchObject({ status: 'stopped', reason: 'invalid-output' });
    expect(result.artifacts.map(artifact => artifact.stage)).toEqual(['inventory', 'plan', 'author']);
    expect(h.fullOutcomes.at(-1)).toMatchObject({ kind: 'invalid-output', reason: 'schema-rejected', detail: 'missing-editorial-account' });
  });

  it('retains an unchanged repair and its blocking disposition despite a clear subsequent review', async () => {
    const h = harness();
    let reviews = 0;
    const finding = { target: 'body', severity: 'blocking', message: 'An omitted qualification is still unsupported.' };
    const unchangedDraft = { stage: 'edit' };
    const disposition = { findingId: 'finding-1-1', action: 'unrepairable', reason: 'The supplied sources do not support the qualification.' };
    const result = await runGenerationPipeline(request(), { ...h.ports, validate: (_stage, value) => value,
      fidelity: () => ++reviews === 1 ? { blocking: true, findings: [finding] } : { blocking: false, findings: [] },
      generate: async input => input.stage === 'repair'
        ? { body: JSON.stringify({ draft: unchangedDraft, changes: [], findingDispositions: [disposition] }), model: 'synthetic-v1', usageUnits: 1 }
        : h.ports.generate(input),
    }, signal());
    expect(result).toMatchObject({ status: 'stopped', reason: 'repair-exhausted' });
    expect(result.receipts.map(receipt => receipt.stage)).toEqual(['inventory', 'plan', 'author', 'edit', 'fidelity', 'repair', 'fidelity']);
    expect(result.artifacts.find(artifact => artifact.stage === 'repair')).toEqual({ stage: 'repair',
      value: { draft: unchangedDraft, changes: [], findingDispositions: [disposition] },
      repairFindings: [{ id: 'finding-1-1', finding }],
    });
    expect(h.outcomes).toEqual(Array(7).fill('validated'));
  });

  it('refuses source failure, duplicate admissions and absent effect permission without sending', async () => {
    for (const field of ['verifySources', 'permitted'] as const) {
      const h = harness();
      const ports = { ...h.ports, [field]: async () => false };
      expect((await runGenerationPipeline(request(), ports, signal())).status).toBe('stopped');
      expect(h.sends).toHaveLength(0);
    }
    const h = harness(); const r = request();
    await runGenerationPipeline(r, h.ports, signal());
    expect(await runGenerationPipeline(r, h.ports, signal())).toMatchObject({ status: 'stopped', reason: 'admission-refused' });
    expect(h.sends).toHaveLength(5);
  });

  it('rejects duplicate or malformed trusted asset requests before provider dispatch', async () => {
    for (const requestedAssets of [
      [{ id: 'diagram', kind: 'diagram', required: true }, { id: 'diagram', kind: 'diagram', required: false }],
      [{ id: 'diagram', kind: 'diagram', required: 'yes' }],
    ]) {
      const h = harness();
      expect(await runGenerationPipeline({ ...request(), requestedAssets: requestedAssets as PipelineRequest['requestedAssets'] }, h.ports, signal()))
        .toMatchObject({ status: 'stopped', reason: 'invalid-request' });
      expect(h.sends).toHaveLength(0);
    }
  });

  it('rejects duplicate-key output before schema validation and never records its body', async () => {
    const h = harness();
    const validate = vi.fn(h.ports.validate);
    const ports = { ...h.ports, validate, generate: async () => ({ body: '{"stage":"inventory","stage":"injected"}', model: null, usageUnits: 1 }) };
    expect(await runGenerationPipeline(request(), ports, signal())).toMatchObject({ status: 'stopped', reason: 'invalid-output' });
    expect(validate).not.toHaveBeenCalled();
    expect(h.outcomes).toEqual(['invalid-output']);
    // The failure code is carried out of the catch, typed to the step that rejected the reply,
    // rather than swallowed into a bare 'invalid-output' with no further detail.
    expect(h.fullOutcomes).toEqual([{ kind: 'invalid-output', usageUnits: 1, reason: 'parse-failed', detail: 'Bounded JSON rejected: duplicate-key' }]);
  });

  it('carries the schema-rejection reason and message out of the bare catch, typed', async () => {
    const h = harness();
    const ports = { ...h.ports, validate: () => { throw Error('schema violation: missing field'); } };
    expect(await runGenerationPipeline(request(), ports, signal())).toMatchObject({ status: 'stopped', reason: 'invalid-output' });
    expect(h.fullOutcomes).toEqual([{ kind: 'invalid-output', usageUnits: 1, reason: 'schema-rejected', detail: 'schema violation: missing field' }]);
  });

  it('carries the canonical-encode rejection reason and message out of the bare catch, typed', async () => {
    const h = harness();
    // A validated value the encoder cannot represent (a Map has no canonical JSON form).
    const ports = { ...h.ports, validate: () => new Map() };
    expect(await runGenerationPipeline(request(), ports, signal())).toMatchObject({ status: 'stopped', reason: 'invalid-output' });
    expect(h.fullOutcomes).toEqual([{ kind: 'invalid-output', usageUnits: 1, reason: 'encode-failed', detail: 'Canonical JSON rejected: unsupported-object' }]);
  });

  it('stops when calls or repairs are exhausted and when usage is unknown', async () => {
    const h = harness(); const r = request();
    expect(await runGenerationPipeline({ ...r, budget: { ...r.budget, maxCalls: 2 } }, h.ports, signal())).toMatchObject({ reason: 'budget-exhausted' });
    expect(h.sends).toHaveLength(2);
    // A stopped run retains only previously validated stages for inspection.
    const partial = await runGenerationPipeline({ ...r, requestId: 'partial', budget: { ...r.budget, maxCalls: 2 } }, harness().ports, signal());
    expect(partial.artifacts.map(a => a.stage)).toEqual(['inventory', 'plan']);
    const h2 = harness();
    expect(await runGenerationPipeline({ ...r, budget: { ...r.budget, maxRepairCycles: 0 } }, { ...h2.ports, fidelity: () => ({ blocking: true, findings: [] }) }, signal())).toMatchObject({ reason: 'repair-exhausted' });
    const h3 = harness();
    expect(await runGenerationPipeline(r, { ...h3.ports, generate: async () => ({ body: '{}', model: null, usageUnits: null }) }, signal())).toMatchObject({ reason: 'usage-uncertain' });
  });

  it('cancellation during permission evaluation prevents dispatch', async () => {
    const h = harness(); const c = new AbortController();
    const release = vi.fn(async () => undefined);
    const result = await runGenerationPipeline(request(), { ...h.ports, releaseUnsent: release, permitted: async () => { c.abort(); return true; } }, c.signal);
    expect(result).toMatchObject({ status: 'stopped', reason: 'cancelled' });
    expect(h.sends).toHaveLength(0);
  });

  it.each(['verifySources', 'admit', 'permitted', 'record'] as const)('deadline bounds a stalled %s adapter', async field => {
    vi.useFakeTimers();
    const h = harness(); const r = request();
    const pending = runGenerationPipeline(r, { ...h.ports, [field]: () => new Promise(() => undefined) }, signal());
    await vi.advanceTimersByTimeAsync(r.budget.maxElapsedMs);
    expect(await pending).toMatchObject({ status: 'stopped', reason: 'deadline' });
  });

  it('dispatches the exact schema bound before asynchronous admission', async () => {
    const h = harness();
    const schema = { type: 'object', title: 'original' };
    const seen: unknown[] = [];
    const result = await runGenerationPipeline(request(), {
      ...h.ports,
      responseSchema: () => ({ version: 'fixture-v1', schema }),
      admit: async input => { schema.title = 'changed'; return h.ports.admit(input); },
      generate: async input => { seen.push(input.responseSchema); return h.ports.generate(input); },
    }, signal());
    expect(result.status).toBe('awaiting-rendered-review');
    expect(seen[0]).toEqual({ type: 'object', title: 'original' });
  });

  it('retains late usage capture even when recording the interruption fails', async () => {
    const h = harness(); const c = new AbortController();
    let complete!: (r: ProviderReply) => void;
    let started!: () => void;
    const start = new Promise<void>(resolve => { started = resolve; });
    const pending = runGenerationPipeline(request(), {
      ...h.ports,
      generate: () => { started(); return new Promise(resolve => { complete = resolve; }); },
      record: async () => { throw Error('recorder unavailable'); },
    }, c.signal);
    await start; c.abort();
    expect((await pending).status).toBe('stopped');
    complete({ body: '{}', model: 'late-model', usageUnits: 2 });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(h.late).toEqual([{ model: 'late-model', usageUnits: 2 }]);
  });
  describe('deterministic quote fidelity joins the reviewer verdict', () => {
    const draftWith = (quote: string) => ({ introduction: { id: 'intro', text: `The project states: "${quote}"`, sourceIds: ['purpose'], children: [] } });
    const quoting = (quotes: () => string) => {
      const h = harness();
      const ports: PipelinePorts = { ...h.ports, validate: (_stage, data) => data,
        generate: async input => { h.sends.push(input); const stage = input.stage;
          return ['author', 'edit', 'repair'].includes(stage)
            ? scriptedReply(stage, input.input, { stage, ...draftWith(quotes()) }, ['intro'])
            : scriptedReply(stage, input.input, { stage }); } };
      return { h, ports };
    };

    it('lets a verbatim quotation through without a repair', async () => {
      const { h, ports } = quoting(() => 'Reduce recurring mental labor.');
      const result = await runGenerationPipeline(request(), ports, signal());
      expect(result.status).toBe('awaiting-rendered-review');
      expect(h.sends.map(x => x.stage)).toEqual(['inventory', 'plan', 'author', 'edit', 'fidelity']);
    });

    it('blocks a quotation absent from the cited source even when the reviewer finds nothing, and hands the repair stage the finding', async () => {
      let drafts = 0;
      const { h, ports } = quoting(() => (++drafts <= 2 ? 'Remove recurring mental labor.' : 'Reduce recurring mental labor.'));
      const result = await runGenerationPipeline(request(), ports, signal());
      expect(result.status).toBe('awaiting-rendered-review');
      expect(h.sends.map(x => x.stage)).toEqual(['inventory', 'plan', 'author', 'edit', 'fidelity', 'repair', 'fidelity']);
      const repair = JSON.parse(h.sends[5]!.input).inputs;
      expect(repair.findings).toEqual([{ id: 'finding-1-1', finding: expect.objectContaining({ severity: 'blocking', target: 'intro', message: expect.stringContaining('quote-not-in-cited-sources') }) }]);
    });

    it('retains a prior unrepairable quote disposition and marks only defects in the final quote', async () => {
      let drafts = 0;
      const { ports } = quoting(() => (++drafts <= 2 ? 'Remove recurring mental labor.' : 'Reduce recurring mental labor.'));
      const disposition = { findingId: 'finding-1-1', action: 'unrepairable', reason: 'The original words cannot be verified.' };
      const result = await runGenerationPipeline(request(), { ...ports, generate: async input => {
        const reply = await ports.generate(input);
        if (input.stage !== 'repair') return reply;
        return { ...reply, body: JSON.stringify({ ...JSON.parse(reply.body), findingDispositions: [disposition] }) };
      } }, signal());

      expect(result).toMatchObject({ status: 'awaiting-rendered-review', quoteFindings: [] });
      expect(result.artifacts.find(artifact => artifact.stage === 'repair')).toMatchObject({
        value: { findingDispositions: [disposition] },
        repairFindings: [{ id: 'finding-1-1', finding: { target: 'intro' } }],
      });
    });

    it('does not stop the run when a misquote survives the last repair: it returns the finding for that block, and keeps the reviewer\'s own findings first in the repair input', async () => {
      const { h, ports } = quoting(() => 'Remove recurring mental labor.');
      const result = await runGenerationPipeline(request(), { ...ports, fidelity: () => ({ blocking: false, findings: ['reviewer note'] }) }, signal());
      expect(result).toMatchObject({ status: 'awaiting-rendered-review', quoteFindings: [{ blockId: 'intro', kind: 'quote-not-in-cited-sources', quote: 'Remove recurring mental labor.' }] });
      const repair = JSON.parse(h.sends.find(x => x.stage === 'repair')!.input).inputs;
      expect(repair.findings[0]).toEqual({ id: 'finding-1-1', finding: 'reviewer note' });
      expect(repair.findings).toHaveLength(2);
    });

    it('returns no quote findings for a clean draft', async () => {
      const { ports } = quoting(() => 'Reduce recurring mental labor.');
      expect(await runGenerationPipeline(request(), ports, signal())).toMatchObject({ status: 'awaiting-rendered-review', quoteFindings: [] });
    });

    it('still stops as repair-exhausted when the reviewer\'s own verdict blocks after the last repair', async () => {
      const { ports } = quoting(() => 'Remove recurring mental labor.');
      const stopped = await runGenerationPipeline(request(), { ...ports, fidelity: () => ({ blocking: true, findings: ['reviewer blocks'] }) }, signal());
      expect(stopped).toMatchObject({ status: 'stopped', reason: 'repair-exhausted' });
    });

    it('keeps a blocking reviewer verdict blocking, and a non-array reviewer finding is carried', async () => {
      const { h, ports } = quoting(() => 'Remove recurring mental labor.');
      let n = 0;
      await runGenerationPipeline(request(), { ...ports, fidelity: () => ({ blocking: ++n === 1, findings: 'single note' }) }, signal());
      const repair = JSON.parse(h.sends.find(x => x.stage === 'repair')!.input).inputs;
      expect(repair.findings[0]).toEqual({ id: 'finding-1-1', finding: 'single note' });
      expect(repair.findings[1]).toMatchObject({ id: 'finding-1-2', finding: { target: 'intro' } });
    });
  });

  describe('prompt profile', () => {
    const stages = ['inventory', 'plan', 'author', 'edit', 'fidelity'] as const;
    const run = async (promptProfile?: 'manifesto' | 'dossier' | 'other') => {
      const h = harness();
      const result = await runGenerationPipeline({ ...request(), ...(promptProfile === undefined ? {} : { promptProfile: promptProfile as 'dossier' }) }, { ...h.ports, validate: (_stage, data) => data }, signal());
      return { h, result };
    };
    const digest = (text: string) => createHash('sha256').update(text).digest('hex');

    it('sends the dossier prompts for a dossier request, and records the profile, version and digest of each stage', async () => {
      const { h, result } = await run('dossier');
      expect(result.status).toBe('awaiting-rendered-review');
      for (const [index, stage] of stages.entries()) {
        const sent = JSON.parse(h.sends[index]!.input);
        const expected = promptForStage(stage, 'dossier');
        expect(h.sends[index]!.stage).toBe(stage);
        expect(sent.system).toBe(expected.system);
        expect(sent.promptVersion).toBe(expected.version);
        expect(sent.system).not.toBe(promptForStage(stage, 'manifesto').system);
        expect(result.receipts[index]).toMatchObject({ stage, promptProfile: 'dossier', promptVersion: expected.version, promptDigest: digest(expected.system) });
      }
    });

    it('sends the dossier prompts on repair and on the second fidelity review too', async () => {
      const h = harness();
      let n = 0;
      const result = await runGenerationPipeline({ ...request(), promptProfile: 'dossier' }, { ...h.ports, validate: (_stage, data) => data, fidelity: () => ({ blocking: ++n === 1, findings: ['fix it'] }) }, signal());
      expect(result.status).toBe('awaiting-rendered-review');
      expect(h.sends.map(x => x.stage)).toEqual(['inventory', 'plan', 'author', 'edit', 'fidelity', 'repair', 'fidelity']);
      for (const index of [5, 6]) {
        const stage = h.sends[index]!.stage as 'repair' | 'fidelity';
        const expected = promptForStage(stage, 'dossier');
        expect(JSON.parse(h.sends[index]!.input).system).toBe(expected.system);
        expect(expected.system).not.toBe(promptForStage(stage, 'manifesto').system);
        expect(result.receipts[index]).toMatchObject({ stage, promptProfile: 'dossier', promptDigest: digest(expected.system) });
      }
    });

    it('sends the manifesto prompts when no profile is named', async () => {
      const { h, result } = await run();
      for (const [index, stage] of stages.entries()) {
        expect(JSON.parse(h.sends[index]!.input).system).toBe(promptForStage(stage, 'manifesto').system);
        expect(result.receipts[index]).toMatchObject({ promptProfile: 'manifesto', promptDigest: digest(promptForStage(stage, 'manifesto').system) });
      }
    });

    it('refuses an unknown profile before any call', async () => {
      const { h, result } = await run('other');
      expect(result).toMatchObject({ status: 'stopped', reason: 'invalid-request' });
      expect(h.sends).toEqual([]);
    });
  });
});
