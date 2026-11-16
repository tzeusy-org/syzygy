import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';

import { runGenerationPipeline, type PipelineRequest } from '@syzygy/polaris-generation-core';

import { createDurableScriptedLifecycle } from './durable-lifecycle.js';
import { syntheticGenerationSource } from './synthetic-source.js';

const scratch = (): string => tempDir('syzygy-generator-lifecycle-');
const request = (): PipelineRequest => ({
  requestId: 'run-one', projectId: 'project-one', snapshotId: 'snapshot-one', startedAt: Date.now(),
  routes: { inventory: 'route-inventory', plan: 'route-plan', author: 'route-author', edit: 'route-edit', fidelity: 'route-fidelity', repair: 'route-repair' },
  sources: [syntheticGenerationSource('project-one', 'a'.repeat(40), 'purpose', 'The declared purpose.')],
  readerQuestions: [{ id: 'why', topics: [], text: 'Why does it exist?' }], requestedAssets: [],
  budget: { maxCalls: 7, maxInputBytes: 100_000, maxOutputBytes: 100_000, maxUsageUnits: 100,
    maxElapsedMs: 30_000, maxRepairCycles: 1, accountingPolicy: 'synthetic-units' },
});

function fixture(stateDir: string, sends: string[], options: { readonly failFidelitySchema?: boolean; readonly permission?: () => string; readonly generate?: (stage: string) => Promise<void> } = {}) {
  return createDurableScriptedLifecycle({ stateDir, permissionIdentity: async () => options.permission?.() ?? 'effective-permission-v1',
    verifySources: async () => true, permitted: async () => true,
    responseSchema: stage => { if (stage === 'fidelity' && options.failFidelitySchema) throw new Error('scripted reviewer unavailable');
      return { version: 'fixture-schema-v1', schema: { stage } }; },
    validate: (stage, value) => { if ((value as { stage?: unknown }).stage !== stage) throw new Error('schema'); return value; },
    fidelity: () => ({ blocking: false, findings: [] }),
    scriptedGenerate: async input => { sends.push(input.stage); await options.generate?.(input.stage);
      return { body: JSON.stringify({ stage: input.stage }), model: 'scripted-v1', usageUnits: 1 }; },
  });
}

// Each test runs scripted pipelines over a journal that fsyncs every write
// (2-20 fsyncs, about 0.3 s alone); a loaded host stalled one to 6.3 s under
// the parallel-load protocol (syzygy-gb4l,
// docs/evidence/load-timeouts-gb4l-2026-10-03.json).
const JOURNAL_TIMEOUT_MS = 30_000;

describe('durable scripted lifecycle port', () => {
  it('reuses four verified checkpoints and sends only the missing fidelity stage after restart', async () => {
    const stateDir = scratch();
    const sends: string[] = [];
    const input = request();
    const first = await runGenerationPipeline(input, fixture(stateDir, sends, { failFidelitySchema: true }), new AbortController().signal);
    expect(first).toMatchObject({ status: 'stopped', reason: 'adapter-failure' });
    expect(sends).toEqual(['inventory', 'plan', 'author', 'edit']);
    const resumed = await runGenerationPipeline(input, fixture(stateDir, sends), new AbortController().signal);
    expect(resumed.status).toBe('awaiting-rendered-review');
    expect(sends).toEqual(['inventory', 'plan', 'author', 'edit', 'fidelity']);
    expect(resumed.receipts.map(receipt => receipt.reused)).toEqual([true, true, true, true, false]);
    expect(resumed.receipts.map(receipt => receipt.providerRoute)).toEqual(['route-inventory', 'route-plan', 'route-author', 'route-edit', 'route-fidelity']);
    expect(resumed.receipts.map(receipt => receipt.model)).toEqual(Array(5).fill('scripted-v1'));
  }, JOURNAL_TIMEOUT_MS);

  // Expected names: 'attempt-' plus the SHA-256 of request id, stage and ordinal joined by NUL, for run-one and the five stages; the
  // ordinal is the pipeline's count of calls so far (inventory 0, plan 1, author 2, edit 3, fidelity 4). Taken with hashlib
  // (docs/evidence/syzygy-bpyt-6-13/derive-literals.py), typed in stage order. The name is the dispatch claim: a different derivation
  // finds no prior record, so a crash after a claim would no longer refuse the replay (review R-GP-IMPL-SUPPORT-LEAF-1 N2, mutant R9).
  it('names each dispatch claim by the SHA-256 of its request, stage and ordinal', async () => {
    const stateDir = scratch();
    expect((await runGenerationPipeline(request(), fixture(stateDir, []), new AbortController().signal)).status).toBe('awaiting-rendered-review');
    const claims = [
      'attempt-2d73d341dd806d637cda3d16ea17971e3eb0b3df269be93af23b0195e4e9083b', // inventory
      'attempt-4b08f68df0a8e991bfd9d15524d628b465673ec61326ff8347668c60f7f76b19', // plan
      'attempt-34c4e90aa2d760f16dccf424cac01292deaa4a5edec50ade7213a18ca710e039', // author
      'attempt-ffd130e87e2d4fcd4b436d3fb65d4a7f2135e6179a3b1a6598ecd2389735b697', // edit
      'attempt-ce7b75ceb155b4a2460d6953f938c8d2674bb3ed6245a0d3e5e57a9c066cec88', // fidelity
    ];
    expect(readdirSync(stateDir).filter(name => name.endsWith('.json')).sort()).toEqual(claims.map(claim => `${claim}.json`).sort());
  }, JOURNAL_TIMEOUT_MS);

  it('refuses changed request, route or current permission and a forged completed artifact', async () => {
    const stateDir = scratch();
    const sends: string[] = [];
    const original = request();
    expect((await runGenerationPipeline(original, fixture(stateDir, sends), new AbortController().signal)).status).toBe('awaiting-rendered-review');
    const wrong = [
      { ...original, projectId: 'another-project' },
      { ...original, snapshotId: 'another-snapshot' },
      { ...original, routes: { ...original.routes, inventory: 'another-route' } },
      { ...original, sources: [syntheticGenerationSource('project-one', 'a'.repeat(40), 'purpose', 'A changed purpose.')] },
    ];
    for (const changed of wrong) expect(await runGenerationPipeline(changed, fixture(stateDir, sends), new AbortController().signal))
      .toMatchObject({ status: 'stopped', reason: 'admission-refused' });
    expect(await runGenerationPipeline(original, fixture(stateDir, sends, { permission: () => 'withdrawn-permission-v2' }), new AbortController().signal))
      .toMatchObject({ status: 'stopped', reason: 'admission-refused' });
    const file = join(stateDir, readdirSync(stateDir).find(name => name.endsWith('.json'))!);
    const entry = JSON.parse(readFileSync(file, 'utf8')) as { outcome: { outputDigest: string } };
    entry.outcome.outputDigest = 'f'.repeat(64);
    writeFileSync(file, JSON.stringify(entry));
    expect(await runGenerationPipeline(original, fixture(stateDir, sends), new AbortController().signal))
      .toMatchObject({ status: 'stopped', reason: 'admission-refused' });
    expect(sends).toHaveLength(5);
  }, JOURNAL_TIMEOUT_MS);

  it('keeps uncertain maximum reserved despite missing receipts and an expired lease field', async () => {
    const stateDir = scratch();
    const sends: string[] = [];
    const original = request();
    const first = await runGenerationPipeline(original, fixture(stateDir, sends, { generate: async stage => { if (stage === 'inventory') throw new Error('synthetic transport uncertainty'); } }), new AbortController().signal);
    expect(first).toMatchObject({ status: 'stopped', reason: 'effect-uncertain' });
    expect(sends).toEqual(['inventory']);
    const file = join(stateDir, readdirSync(stateDir).find(name => name.endsWith('.json'))!);
    const entry = JSON.parse(readFileSync(file, 'utf8')) as { state: string; permit: { maxUsageUnits: number; maxOutputBytes: number } } & Record<string, unknown>;
    expect(entry.state).toBe('uncertain');
    expect(entry.permit).toMatchObject({ maxUsageUnits: 5, maxOutputBytes: 10_000 });
    writeFileSync(file, JSON.stringify({ ...entry, late: undefined, leaseExpiresAt: 0 }));
    expect(await runGenerationPipeline(original, fixture(stateDir, sends), new AbortController().signal))
      .toMatchObject({ status: 'stopped', reason: 'effect-uncertain' });
    expect(sends).toHaveLength(1);
  }, JOURNAL_TIMEOUT_MS);

  it('admits at most one concurrent dispatch and keeps distinct run artifacts separate', async () => {
    const stateDir = scratch();
    const sends: string[] = [];
    let release!: () => void;
    let started!: () => void;
    const observedStart = new Promise<void>(resolve => { started = resolve; });
    const hold = new Promise<void>(resolve => { release = resolve; });
    const original = request();
    const first = runGenerationPipeline(original, fixture(stateDir, sends, { generate: async stage => { if (stage === 'inventory') { started(); await hold; } } }), new AbortController().signal);
    await observedStart;
    expect(await runGenerationPipeline(original, fixture(stateDir, sends), new AbortController().signal))
      .toMatchObject({ status: 'stopped', reason: 'admission-refused' });
    expect(sends).toEqual(['inventory']);
    release();
    expect((await first).status).toBe('awaiting-rendered-review');
    const another = { ...original, requestId: 'run-two' };
    expect((await runGenerationPipeline(another, fixture(stateDir, sends), new AbortController().signal)).status).toBe('awaiting-rendered-review');
    expect(readdirSync(stateDir).filter(name => name.endsWith('.json'))).toHaveLength(10);
  }, JOURNAL_TIMEOUT_MS);
});
