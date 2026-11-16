import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';

import { runGenerationPipeline, type DispatchPermit, type PipelineRequest, type ProviderReply } from '@syzygy/polaris-generation-core';

import { createDurableLifecycle, type DurableLifecycleOptions } from './durable-lifecycle.js';
import { syntheticGenerationSource } from './synthetic-source.js';

const scratch = (): string => tempDir('syzygy-lifecycle-generate-');
const request = (overrides: Partial<PipelineRequest['budget']> = {}): PipelineRequest => ({
  requestId: 'live-run', projectId: 'project-one', snapshotId: 'snapshot-one', startedAt: Date.now(),
  routes: { inventory: 'r-inventory', plan: 'r-plan', author: 'r-author', edit: 'r-edit', fidelity: 'r-fidelity', repair: 'r-repair' },
  sources: [syntheticGenerationSource('project-one', 'a'.repeat(40), 'purpose', 'The declared purpose.')],
  readerQuestions: [{ id: 'core-ideas', topics: ['core-ideas'], text: 'Why does it exist?' }], requestedAssets: [],
  budget: { maxCalls: 7, maxInputBytes: 100_000, maxOutputBytes: 100_000, maxUsageUnits: 100, maxElapsedMs: 30_000, maxRepairCycles: 1, accountingPolicy: 'live-units', ...overrides },
});

interface Stub { readonly calls: { stage: string; permit: DispatchPermit; signal: AbortSignal }[] }
function lifecycle(stateDir: string, stub: Stub, generate: (stage: string, permit: DispatchPermit, signal: AbortSignal) => Promise<ProviderReply>, extra: Partial<DurableLifecycleOptions> = {}) {
  return createDurableLifecycle({ stateDir, permissionIdentity: async () => 'permission-v1', verifySources: async () => true, permitted: async () => true, maxAttemptUsageUnits: 5, maxAttemptOutputBytes: 10_000,
    responseSchema: stage => ({ version: 'schema-v1', schema: { stage } }),
    validate: (stage, value) => { if ((value as { stage?: unknown }).stage !== stage) throw new Error('schema'); return value; },
    fidelity: () => ({ blocking: false, findings: [] }),
    generate: async input => { stub.calls.push({ stage: input.stage, permit: input.permit, signal: input.signal }); return generate(input.stage, input.permit, input.signal); },
    ...extra });
}
const ok = (stage: string, usageUnits = 1): ProviderReply => ({ body: JSON.stringify({ stage }), model: 'stub-live-v1', usageUnits });
const journal = (stateDir: string): { state: string; permit: DispatchPermit }[] =>
  readdirSync(stateDir).filter(name => name.endsWith('.json')).map(name => JSON.parse(readFileSync(join(stateDir, name), 'utf8')));

describe('durable lifecycle with an injected generate port', () => {
  it('runs the pipeline through the injected port with its permit and abort signal', async () => {
    const stateDir = scratch(), stub: Stub = { calls: [] };
    const result = await runGenerationPipeline(request(), lifecycle(stateDir, stub, async stage => ok(stage)), new AbortController().signal);
    expect(result.status).toBe('awaiting-rendered-review');
    expect(stub.calls.map(call => call.stage)).toEqual(['inventory', 'plan', 'author', 'edit', 'fidelity']);
    expect(stub.calls.every(call => call.permit.maxUsageUnits === 5 && call.permit.maxOutputBytes === 10_000 && call.signal instanceof AbortSignal)).toBe(true);
    expect(journal(stateDir).every(entry => entry.state === 'completed')).toBe(true);
  });

  it('reserves the configured per-attempt ceilings, capped by the request budget', async () => {
    const stateDir = scratch(), stub: Stub = { calls: [] };
    await runGenerationPipeline(request(), lifecycle(stateDir, stub, async stage => ok(stage, 20), { maxAttemptUsageUnits: 30, maxAttemptOutputBytes: 50_000 }), new AbortController().signal);
    expect(stub.calls[0]!.permit).toMatchObject({ maxUsageUnits: 30, maxOutputBytes: 50_000 });
    const capped: Stub = { calls: [] };
    await runGenerationPipeline(request({ maxUsageUnits: 12, maxOutputBytes: 8_000 }), lifecycle(scratch(), capped, async stage => ok(stage, 1), { maxAttemptUsageUnits: 30, maxAttemptOutputBytes: 50_000 }), new AbortController().signal);
    expect(capped.calls[0]!.permit).toMatchObject({ maxUsageUnits: 12, maxOutputBytes: 8_000 });
  });

  it('has no default ceilings: a missing or malformed one is refused at construction, before any state', () => {
    const dir = join(scratch(), 'state');
    const bare = { stateDir: dir, permissionIdentity: async () => 'p', verifySources: async () => true, permitted: async () => true, responseSchema: () => ({ version: 'v', schema: {} }),
      validate: (_stage: unknown, value: unknown) => value, fidelity: () => ({ blocking: false, findings: [] }), generate: async () => ok('x') } as never as DurableLifecycleOptions;
    expect(() => createDurableLifecycle(bare)).toThrow('invalid-lifecycle-option: maxAttemptUsageUnits');
    expect(() => createDurableLifecycle({ ...bare, maxAttemptUsageUnits: 5 })).toThrow('invalid-lifecycle-option: maxAttemptOutputBytes');
    expect(() => createDurableLifecycle({ ...bare, maxAttemptOutputBytes: 5 })).toThrow('invalid-lifecycle-option: maxAttemptUsageUnits');
    expect(existsSync(dir)).toBe(false);
    for (const bad of ['5', null]) expect(() => lifecycle(dir, { calls: [] }, async stage => ok(stage), { maxAttemptUsageUnits: bad as never })).toThrow('invalid-lifecycle-option');
  });

  it('refuses a malformed per-attempt ceiling before creating any state', () => {
    for (const bad of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const dir = join(scratch(), 'state');
      expect(() => lifecycle(dir, { calls: [] }, async stage => ok(stage), { maxAttemptUsageUnits: bad })).toThrow('invalid-lifecycle-option');
      expect(() => lifecycle(dir, { calls: [] }, async stage => ok(stage), { maxAttemptOutputBytes: bad })).toThrow('invalid-lifecycle-option');
    }
  });

  it('a generate failure after the claim leaves an uncertain record that a restart never replays', async () => {
    const stateDir = scratch(), first: Stub = { calls: [] }, same = request();
    const interrupted = await runGenerationPipeline(same, lifecycle(stateDir, first, async stage => { if (stage === 'plan') throw new Error('socket reset'); return ok(stage); }), new AbortController().signal);
    expect(interrupted).toMatchObject({ status: 'stopped', reason: 'effect-uncertain' });
    expect(first.calls.map(call => call.stage)).toEqual(['inventory', 'plan']);
    expect(journal(stateDir).map(entry => entry.state).sort()).toEqual(['completed', 'uncertain']);
    const second: Stub = { calls: [] };
    const resumed = await runGenerationPipeline(same, lifecycle(stateDir, second, async stage => ok(stage)), new AbortController().signal);
    expect(resumed).toMatchObject({ status: 'stopped', reason: 'effect-uncertain' });
    expect(second.calls).toEqual([]);
  });

  it('a crash while a call is in flight leaves a claim that refuses any replay, even by a fresh lifecycle', async () => {
    const stateDir = scratch(), first: Stub = { calls: [] }, same = request();
    let entered!: () => void;
    const inFlight = new Promise<void>(resolve => { entered = resolve; });
    const never = new Promise<ProviderReply>(() => undefined);
    const abort = new AbortController();
    const running = runGenerationPipeline(same, lifecycle(stateDir, first, async stage => { if (stage === 'inventory') { entered(); return never; } return ok(stage); }), abort.signal);
    await inFlight;
    // The process "dies" here: the claim file is on disk, nothing was recorded.
    expect(journal(stateDir)).toMatchObject([{ state: 'reserved' }]);
    const second: Stub = { calls: [] };
    const restarted = await runGenerationPipeline(same, lifecycle(stateDir, second, async stage => ok(stage)), new AbortController().signal);
    expect(restarted).toMatchObject({ status: 'stopped', reason: 'admission-refused' });
    expect(second.calls).toEqual([]);
    abort.abort();
    void running.catch(() => undefined);
  });

  it('reuses completed checkpoints after a restart and sends only the missing stage through the new port', async () => {
    const stateDir = scratch(), first: Stub = { calls: [] }, same = request();
    const stopped = await runGenerationPipeline(same, lifecycle(stateDir, first, async stage => ok(stage), { responseSchema: stage => { if (stage === 'fidelity') throw new Error('reviewer unavailable'); return { version: 'schema-v1', schema: { stage } }; } }), new AbortController().signal);
    expect(stopped).toMatchObject({ status: 'stopped', reason: 'adapter-failure' });
    expect(first.calls.map(call => call.stage)).toEqual(['inventory', 'plan', 'author', 'edit']);
    const second: Stub = { calls: [] };
    const done = await runGenerationPipeline(same, lifecycle(stateDir, second, async stage => ok(stage)), new AbortController().signal);
    expect(done.status).toBe('awaiting-rendered-review');
    expect(second.calls.map(call => call.stage)).toEqual(['fidelity']);
    expect(done.receipts.map(receipt => receipt.reused)).toEqual([true, true, true, true, false]);
  });

  it('releases an attempt whose per-call permission is withdrawn without calling generate, and only an exact true permits', async () => {
    for (const answer of [false, undefined, 'yes', 1]) {
      const stateDir = scratch(), stub: Stub = { calls: [] };
      const seen: string[] = [];
      const result = await runGenerationPipeline(request(), lifecycle(stateDir, stub, async stage => ok(stage), { permitted: (async (_input: unknown, permit: DispatchPermit) => { seen.push(permit.attemptId); return answer; }) as never }), new AbortController().signal);
      expect(result.status, String(answer)).toBe('stopped');
      expect(stub.calls).toEqual([]);
      expect(seen).toHaveLength(1);
      expect(journal(stateDir).map(entry => entry.state)).toEqual(['released']);
    }
  });
});
