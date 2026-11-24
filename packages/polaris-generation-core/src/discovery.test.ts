import { randomBytes } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

import { COMMENT_BONUS_MAX, CONFIGURATION_PENALTY, BUILD_PENALTY, HISTORY_PENALTY, SOURCE_ROOT_BONUS, DEFAULT_DISCOVERY_BUDGET, DEFERRED_BY_BUDGET, DOSSIER_DISCOVERY_BUDGET, DOSSIER_MAX_SELECTED_BYTES, MAP_CLAIMS_PER_ITEM, discoverAndSelect, DiscoveryRefusal, heuristicScore, partitionSubsystems, reportFromReceipts, type DiscoveryPorts, type DiscoveryReceipt } from './discovery.js';
import { digestCanonicalJson } from './canonical-json.js';
import { generationSourcesForBody, gitBlobObjectId, quotableGenerationSources, validateGenerationSources, type GenerationSource } from './generation-source.js';

const make = (path: string, body: string, sourceId?: string): readonly GenerationSource[] =>
  generationSourcesForBody({ sourceId: sourceId ?? `s-${path.replace(/[^A-Za-z0-9]/gu, '_')}`.slice(0, 90), repositoryId: 'repository:fixture', revision: 'a'.repeat(40),
    path, objectId: gitBlobObjectId(body), evaluationId: 'evaluation:fixture', body });
const population = (files: number, subsystems = 25): GenerationSource[] => {
  const out: GenerationSource[] = [];
  for (let i = 0; i < files; i++) out.push(...make(`src/mod${i % subsystems}/file${i}.c`, `int f${i}(void) { return ${i}; }\n`));
  return out;
};
const budget = DEFAULT_DISCOVERY_BUDGET;
/** One key for a live run and its replay, so the keyed deferred ids compare equal. */
const RUN_KEY = randomBytes(32);
const allow = async () => true;
type Item = { readonly blobId: string; readonly path: string; readonly excerpt: string };
const mapOf = (relevance: (item: Item) => number) => async (input: { items: readonly Item[] }) => ({
  claims: input.items.map(item => ({ blobId: item.blobId, claim: `claim ${item.path}`, relevance: relevance(item) })), usageUnits: 1 });
const model = (extra: Partial<DiscoveryPorts> = {}): DiscoveryPorts & { receipts: DiscoveryReceipt[] } => {
  const receipts: DiscoveryReceipt[] = [];
  return { permitted: allow, receipt: async r => { receipts.push(r); }, runKey: RUN_KEY, ...extra, receipts };
};
const Q = ['What are the core ideas?'];

describe('REQ-030 hierarchical budgeted discovery', () => {
  it('narrows 1,000 files under the 200 cap and keeps every file in the denominator', async () => {
    const sources = population(1000);
    const { sources: out, report, receipts } = await discoverAndSelect(sources, Q, budget, { permitted: allow });
    expect(out).toHaveLength(1000);
    expect(quotableGenerationSources(out).length).toBe(200);
    expect(out.filter(s => s.exclusion.excluded && s.exclusion.reason === DEFERRED_BY_BUDGET)).toHaveLength(800);
    expect(report).toMatchObject({ selected: { blobs: 200, sources: 200 }, rankingBasis: 'heuristic', mapCalls: 0 });
    expect(report.deferred).toHaveLength(800);
    expect(report.deferred[0]!.detail).toContain('ranked below the selection cut');
    expect(report.boundary).toContain('does not claim whole-repository coverage');
    expect(report.basisNote).toContain('prior only');
    expect(receipts).toEqual([]);
    expect(new Set(out.map(s => s.path)).size).toBe(1000);
    expect(validateGenerationSources(out)).toBe(out);
  });

  it('says every candidate blob was selected only when none was deferred', async () => {
    expect((await discoverAndSelect(population(3), Q, budget, { permitted: allow })).report.boundary).toBe('every candidate blob was selected');
  });

  it('maps subsystems, reduces across them and selects by the model ranking', async () => {
    const sources = population(300, 6);
    const map = vi.fn(mapOf(item => item.path.endsWith('file7.c') ? 10 : 1));
    const target = sources.find(s => s.path.endsWith('/file7.c'))!;
    const reduce = vi.fn(async () => ({ ranked: [target.sourceId, 'not-a-blob', target.sourceId], usageUnits: 3 }));
    const ports = model({ map, reduce });
    const { sources: out, report } = await discoverAndSelect(sources, Q, { ...budget, maxSelected: 1, maxGroupBlobs: 20, maxMapCalls: 100 }, ports);
    expect(report).toMatchObject({ rankingBasis: 'model-reduce', reduceCalls: 1, droppedUnknownIds: 2, mapFailures: 0, reduceFailures: 0 });
    expect(report.basisNote).toContain('Inferred');
    expect(report.mapCalls).toBe(report.subsystems);
    expect(quotableGenerationSources(out).map(q => q.sourceId)).toEqual([target.sourceId]);
    expect(report.ledger.find(entry => entry.blobId === target.sourceId)).toMatchObject({ relevance: 10, claim: 'claim src/mod1/file7.c' });
    for (const call of map.mock.calls) expect(call[0].items.length).toBeLessThanOrEqual(20);
  });

  // The large synthetic corpus needs its own time budget on a shared unit worker.
  it('keeps ordered discovery results for a large accepted rank population', async () => {
    // Distribute the files to keep this case focused on collecting the ranking.
    const files = Array.from({ length: 150_000 }, (_, index) =>
      make(`fixture-${index % 1024}/source-${index}.c`, 'int fixture;\n')[0]!);
    const architecture = make('docs/architecture.md', 'Fixture architecture.')[0]!;
    const reference = make('docs/reference.md', 'Fixture reference.')[0]!;
    const sources = [...files, architecture, reference];
    const ranked = [reference.sourceId, architecture.sourceId, ...files.map(file => file.sourceId)];
    // The predecessor append must exceed this runtime's native argument limit.
    const canary: string[] = [];
    expect(() => canary.push(...ranked)).toThrow(RangeError);

    const selected = await discoverAndSelect(sources, Q, { ...budget, maxSelected: 2, maxMapCalls: 1 }, model({
      map: mapOf(() => 5),
      reduce: async () => ({ ranked, usageUnits: 1 }),
    }));
    expect(selected.report).toMatchObject({
      population: { sources: 150_002, alreadyExcluded: 0, candidateBlobs: 150_002 },
      rankingBasis: 'model-reduce',
      reduceCalls: 1,
      reduceFailures: 0,
      droppedUnknownIds: 0,
      selected: { blobs: 2, sources: 2 },
    });
    expect(selected.report.ledger.map(claim => claim.blobId)).toEqual([reference.sourceId, architecture.sourceId]);
    expect(quotableGenerationSources(selected.sources).map(source => source.sourceId)).toEqual([architecture.sourceId, reference.sourceId]);
    expect(selected.report.deferred).toHaveLength(150_000);
  }, 30_000);

  it('finds relevant material outside the conventional entry points', async () => {
    const sources = [...population(250, 5), ...make('internal/zz/q/r/s/obscure_notes.c', 'The real design lives here.\n')];
    const without = await discoverAndSelect(sources, Q, { ...budget, maxSelected: 3 }, { permitted: allow });
    const withMap = await discoverAndSelect(sources, Q, { ...budget, maxSelected: 3, maxMapCalls: 100 }, model({ map: mapOf(item => item.path.includes('obscure') ? 9 : 0) }));
    expect(quotableGenerationSources(without.sources).map(q => q.sourceId)).not.toContain(sources.at(-1)!.sourceId);
    expect(quotableGenerationSources(withMap.sources).map(q => q.sourceId)).toContain(sources.at(-1)!.sourceId);
    expect(withMap.report.rankingBasis).toBe('model-map');
  });

  it('prefers documentation over tests and vendored code by the prior alone', async () => {
    const sources = [...make('vendor/x/a.c', 'v\n'), ...make('tests/t.c', 't\n'), ...make('docs/ARCHITECTURE.md', 'a\n'), ...make('README.md', 'r\n')];
    const { sources: out } = await discoverAndSelect(sources, Q, { ...budget, maxSelected: 2 }, { permitted: allow });
    expect(quotableGenerationSources(out).map(q => q.sourceId).sort()).toEqual([sources[2]!.sourceId, sources[3]!.sourceId].sort());
  });

  it('ranks vendored code below every first-party file, even a vendored README, and still counts it deferred', async () => {
    const sources = [...make('deps/lib/README.md', 'vendored readme\n'), ...make('src/a.c', 'a\n'), ...make('tests/unit/t.tcl', 't\n'), ...make('third_party/z/docs/ARCHITECTURE.md', 'z\n')];
    const { sources: out, report } = await discoverAndSelect(sources, Q, { ...budget, maxSelected: 2 }, { permitted: allow });
    expect(quotableGenerationSources(out).map(q => q.sourceId).sort()).toEqual([sources[1]!.sourceId, sources[2]!.sourceId].sort());
    expect(report.deferred.map(entry => entry.path).sort()).toEqual(['deps/lib/README.md', 'third_party/z/docs/ARCHITECTURE.md']);
    expect(out.filter(s => s.exclusion.excluded && s.exclusion.reason === DEFERRED_BY_BUDGET).map(s => s.path).sort()).toEqual(['deps/lib/README.md', 'third_party/z/docs/ARCHITECTURE.md']);
    const roomy = await discoverAndSelect(sources, Q, { ...budget, maxSelected: 4 }, { permitted: allow });
    expect(roomy.report.deferred).toEqual([]);
  });

  it('demotes every vendored or generated directory name, as a whole path segment only', async () => {
    for (const segment of ['vendor', 'third_party', 'deps', 'node_modules', 'dist', 'build', 'DEPS']) {
      const sources = [...make(`${segment}/lib/README.md`, 'readme\n'), ...make('src/a.c', 'a\n')];
      const { sources: out } = await discoverAndSelect(sources, Q, { ...budget, maxSelected: 1 }, { permitted: allow });
      expect(quotableGenerationSources(out).map(q => q.sourceId), segment).toEqual([sources[1]!.sourceId]);
    }
    const sources = [...make('src/builder/README.md', 'readme\n'), ...make('src/depsx/a.c', 'a\n')];
    expect(sources.map(source => heuristicScore(source.path, [source])).every(score => score > -900)).toBe(true);
    // The file's own name is not a directory: a script called `build` or `deps` is first-party.
    for (const name of ['build', 'src/dist', 'deps']) { const [file] = make(name, 'x\n'); expect(heuristicScore(name, [file!]), name).toBeGreaterThan(-900); }
  });

  it('scores size by doublings of 1 KiB of quotable text, capped, and breaks a path tie by size rather than path order', () => {
    const score = (path: string, chars: number): number => heuristicScore(path, make(path, 'x'.repeat(chars)));
    const flat = score('src/a.c', 500);
    expect(score('src/a.c', 1023)).toBe(flat);
    expect(score('src/a.c', 2000)).toBe(flat);
    expect(score('src/a.c', 2048)).toBe(flat + 1);
    expect(score('src/a.c', 4096)).toBe(flat + 2);
    expect(score('src/a.c', 64 * 1024)).toBe(flat + 6);
    expect(score('src/a.c', 99_000)).toBe(flat + 6);
    expect(heuristicScore('src/a.c', make('src/a.c', 'x'.repeat(100_001)))).toBe(flat + 6 - 1);
    expect(heuristicScore('src/a.c', make('src/a.c', 'x'.repeat(300_000)))).toBe(flat + 8 - 2);
    expect(heuristicScore('src/a.c', make('src/a.c', 'x'.repeat(600_000)))).toBe(flat + 8 - 5);
    expect(score('deps/a/b.c', 500)).toBe(flat - 1002 - SOURCE_ROOT_BONUS);   // no source-root bonus under deps/
  });

  it('prefers the larger of two same-depth files when the cap fits one, whatever their path order', async () => {
    const sources = [...make('src/a_small.c', 'x'.repeat(200)), ...make('src/z_big.c', 'x'.repeat(40_000))];
    const { sources: out } = await discoverAndSelect(sources, Q, { ...budget, maxSelected: 1 }, { permitted: allow });
    expect(quotableGenerationSources(out).map(q => q.sourceId)).toEqual([sources[1]!.sourceId]);
  });

  it('records subsystems it had no map call for and counts failed calls without hiding them', async () => {
    const map = vi.fn(async () => { throw new Error('boom'); });
    const ports = model({ map });
    const { report } = await discoverAndSelect(population(120, 12), Q, { ...budget, maxMapCalls: 2, maxGroupBlobs: 10 }, ports);
    expect(report).toMatchObject({ mapCalls: 2, mapFailures: 2, rankingBasis: 'heuristic' });
    expect(report.unmappedSubsystems.length).toBe(report.subsystems);
    expect(ports.receipts.filter(r => r.outcome === 'failed').map(r => r.detail)).toEqual(['boom', 'boom']);
  });

  it('drops malformed or foreign claims instead of ranking on them, and keeps none of a rejected reply', async () => {
    const sources = population(6, 1);
    const [first, second, third, fourth] = sources;
    const map = async () => ({ usageUnits: 1, claims: [
      { blobId: 'foreign-blob', claim: 'c', relevance: 5 }, { blobId: first!.sourceId, claim: 'c', relevance: 99 }, null as never, { blobId: 7 as never, claim: 'c', relevance: 1 },
      { blobId: second!.sourceId, claim: '', relevance: 5 }, { blobId: third!.sourceId, claim: 'c', relevance: Number.NaN },
      { blobId: fourth!.sourceId, claim: 'fine', relevance: 3 }] });
    const { report } = await discoverAndSelect(sources, Q, { ...budget, maxMapCalls: 5, maxSelected: 1 }, model({ map }));
    expect(report.droppedUnknownIds).toBe(6);
    expect(report.ledger.map(entry => entry.blobId)).toEqual([fourth!.sourceId]);
    const rejected = model({ map: async () => ({ claims: 'nope' }) as never });
    const result = await discoverAndSelect(sources, Q, { ...budget, maxMapCalls: 5, maxSelected: 1 }, rejected);
    expect(result.report).toMatchObject({ mapFailures: 1, rankingBasis: 'heuristic', ledger: [] });
    expect(rejected.receipts.at(-1)).toMatchObject({ outcome: 'failed', detail: 'invalid-map-reply' });
  });

  it('truncates a claim to maxClaimChars', async () => {
    const sources = population(2, 1);
    const long = 'x'.repeat(5000);
    const { report } = await discoverAndSelect(sources, Q, { ...budget, maxMapCalls: 5, maxClaimChars: 40 }, model({
      map: async input => ({ usageUnits: null, claims: input.items.map(i => ({ blobId: i.blobId, claim: long, relevance: 5 })) }) }));
    expect(report.ledger.every(entry => entry.claim.length === 40)).toBe(true);
    expect(report.ledger.length).toBe(2);
  });

  it('bounds excerpts and the claims handed to the reduce call', async () => {
    const sources = [...make('a/one.md', 'x'.repeat(5000)), ...population(200, 20)];
    const seen: number[] = [];
    let reduceClaims = 0;
    await discoverAndSelect(sources, Q, { ...budget, maxExcerptChars: 100, maxMapCalls: 100, maxReduceClaims: 30, maxGroupBlobs: 10 }, model({
      map: async input => { seen.push(...input.items.map(i => i.excerpt.length)); return mapOf(() => 5)(input); },
      reduce: async input => { reduceClaims = input.subsystems.reduce((n, s) => n + s.claims.length, 0); return { ranked: [], usageUnits: null }; } }));
    expect(Math.max(...seen)).toBe(100);
    expect(reduceClaims).toBeLessThanOrEqual(30);
    expect(reduceClaims).toBeGreaterThan(0);
  });

  it('falls back to map relevance when the reduce throws, returns null, or returns a string, and counts it', async () => {
    const sources = population(40, 4);
    const target = sources.find(s => s.path.endsWith('file9.c'))!;
    for (const reduce of [async () => { throw new Error('reduce down'); }, async () => null, async () => ({ ranked: 'abc', usageUnits: 1 }), async () => ({ ranked: [1, 2], usageUnits: 1 })]) {
      const ports = model({ map: mapOf(item => item.path.endsWith('file9.c') ? 9 : 1), reduce: reduce as never });
      const { report, sources: out } = await discoverAndSelect(sources, Q, { ...budget, maxSelected: 1, maxMapCalls: 10 }, ports);
      expect(report).toMatchObject({ reduceCalls: 1, reduceFailures: 1, rankingBasis: 'model-map' });
      expect(quotableGenerationSources(out).map(q => q.sourceId)).toEqual([target.sourceId]);
      expect(ports.receipts.at(-1)).toMatchObject({ kind: 'reduce', outcome: 'failed' });
    }
    for (const ranked of ['abc', [1, 2], null, undefined]) {
      const ports = model({ map: mapOf(() => 5), reduce: (async () => ({ ranked, usageUnits: 1 })) as never });
      await discoverAndSelect(sources, Q, { ...budget, maxSelected: 1, maxMapCalls: 10 }, ports);
      expect(ports.receipts.at(-1), String(ranked)).toMatchObject({ kind: 'reduce', outcome: 'failed', detail: 'invalid-reduce-reply' });
    }
  });

  it('keeps the pieces of an oversize file together and bills each piece', async () => {
    const big = `${'int line_of_code = 42; /* padding */!\n'.repeat(3000)}end\n`;
    const bigPieces = make('src/big.c', big);
    expect(bigPieces.length).toBeGreaterThan(1);
    const sources = [...bigPieces, ...make('README.md', 'r\n'), ...make('docs/a.md', 'a\n')];
    const tight = await discoverAndSelect(sources, Q, { ...budget, maxSelected: 2 }, { permitted: allow });
    expect(tight.sources.filter(s => s.path === 'src/big.c')).toHaveLength(1);
    expect(tight.sources.find(s => s.path === 'src/big.c')).toMatchObject({ exclusion: { excluded: true, reason: DEFERRED_BY_BUDGET } });
    expect(tight.sources.find(s => s.path === 'src/big.c')!.segment).toBeUndefined();
    expect(tight.report.selected).toEqual({ blobs: 2, sources: 2 });
    expect(validateGenerationSources(tight.sources)).toHaveLength(3);
    const roomy = await discoverAndSelect(sources, Q, { ...budget, maxSelected: 200 }, { permitted: allow });
    expect(roomy.sources).toEqual(sources);
    expect(roomy.report.deferred).toEqual([]);
    expect(roomy.report.selected).toEqual({ blobs: 3, sources: bigPieces.length + 2 });
  });

  it('says "did not fit" only for a multi-piece blob skipped for the remaining cap', async () => {
    const big = `${'int line_of_code = 42; /* padding */!\n'.repeat(3000)}end\n`;
    const sources = [...make('README.md', 'r\n'), ...make('src/big.c', big), ...make('docs/z.md', 'z\n')];
    const { report } = await discoverAndSelect(sources, Q, { ...budget, maxSelected: 2 }, { permitted: allow });
    const bigRow = report.deferred.find(d => d.path === 'src/big.c')!;
    expect(bigRow.detail).toContain('did not fit');
    expect(report.deferred.every(d => d.path === 'src/big.c' || d.detail.includes('ranked below'))).toBe(true);
  });

  it('asks permission per provider call with a request digest, and a refused call is not made', async () => {
    const asked: string[] = [];
    const map = vi.fn(mapOf(() => 5));
    const ports = model({ map, permitted: async call => { asked.push(`${call.kind}:${call.subsystem ?? ''}:${call.itemCount}:${call.requestDigest.length}`); return call.subsystem !== 'src/mod0'; } });
    const { report } = await discoverAndSelect(population(40, 2), Q, { ...budget, maxMapCalls: 10, maxGroupBlobs: 20 }, ports);
    expect(asked.length).toBe(2);
    expect(asked.every(entry => entry.endsWith(':64'))).toBe(true);
    expect(map).toHaveBeenCalledTimes(1);
    expect(report.refusedCalls).toBe(1);
    expect(ports.receipts.filter(r => r.outcome === 'refused')).toHaveLength(1);
    expect(report.unmappedSubsystems).toEqual(['src/mod0']);
  });

  it('treats any permission answer other than true as a refusal', async () => {
    for (const answer of [1, 'yes', {}, undefined]) {
      const map = vi.fn(mapOf(() => 5));
      await discoverAndSelect(population(5), Q, budget, model({ map, permitted: (async () => answer) as never }));
      expect(map).not.toHaveBeenCalled();
    }
  });

  it('writes a dispatching receipt before each call and an outcome after, with digests that differ per request', async () => {
    const order: string[] = [];
    const ports = model({ map: async input => { order.push('call'); return mapOf(() => 5)(input); }, receipt: async r => { order.push(r.outcome); } });
    const { receipts } = await discoverAndSelect(population(40, 4), Q, { ...budget, maxMapCalls: 10, maxGroupBlobs: 20 }, ports);
    expect(order.slice(0, 3)).toEqual(['dispatching', 'call', 'accepted']);
    expect(new Set(receipts.filter(r => r.outcome === 'accepted').map(r => r.requestDigest)).size).toBe(receipts.filter(r => r.outcome === 'accepted').length);
    expect(receipts.filter(r => r.outcome === 'dispatching')).toHaveLength(receipts.filter(r => r.outcome === 'accepted').length);
  });

  it('stops when a receipt cannot be written, and when model ports have no receipt port', async () => {
    await expect(discoverAndSelect(population(5), Q, budget, { permitted: allow, map: mapOf(() => 1), receipt: async () => { throw new Error('disk'); } })).rejects.toThrow('receipt-write-failed');
    await expect(discoverAndSelect(population(5), Q, budget, { permitted: allow, map: mapOf(() => 1) })).rejects.toThrow('model-ports-need-a-receipt-port');
  });

  it('truncates failure detail and rebuilds an identical report from receipts alone', async () => {
    const sources = population(120, 6);
    let n = 0, asks = 0;
    const map = async (input: { items: readonly Item[] }) => {
      if (n++ === 1) throw new Error('x'.repeat(900));
      return { usageUnits: 2, claims: [...input.items.map(item => ({ blobId: item.blobId, claim: 'c', relevance: item.path.endsWith('3.c') ? 8 : 2 })), { blobId: 'foreign', claim: 'c', relevance: 1 }] };
    };
    const ports = model({ map, reduce: async () => ({ ranked: ['foreign', ...sources.slice(5, 9).map(s => s.sourceId)], usageUnits: 4 }), permitted: async () => ++asks !== 3 });
    const budgetHere = { ...budget, maxSelected: 10, maxMapCalls: 6, maxGroupBlobs: 10 };
    const live = await discoverAndSelect(sources, Q, budgetHere, ports);
    expect(live.receipts.find(r => r.outcome === 'failed')!.detail).toHaveLength(200);
    const replay = await reportFromReceipts(sources, Q, budgetHere, JSON.parse(JSON.stringify(live.receipts)), RUN_KEY);
    expect(replay.report).toEqual(live.report);
    expect(replay.sources).toEqual(live.sources);
    expect(live.report.mapFailures).toBeGreaterThan(0);
    expect(live.report.refusedCalls).toBeGreaterThan(0);
    expect(live.report.droppedUnknownIds).toBeGreaterThan(0);
  });

  const liveRun = async (ports: DiscoveryPorts & { receipts: DiscoveryReceipt[] }, sources = population(120, 6), questions = Q) => {
    const budgetHere = { ...budget, maxSelected: 10, maxMapCalls: 6, maxGroupBlobs: 10 };
    const live = await discoverAndSelect(sources, questions, budgetHere, ports);
    return { live, budgetHere, sources, saved: JSON.parse(JSON.stringify(ports.receipts)) as DiscoveryReceipt[] };
  };

  it('replays a map-only run and a no-port run to the live report, installing only the port kinds the receipts hold', async () => {
    const mapOnly = await liveRun(model({ map: mapOf(item => (item.path.endsWith('3.c') ? 8 : 2)) }));
    expect(mapOnly.live.report).toMatchObject({ rankingBasis: 'model-map', reduceCalls: 0, reduceFailures: 0 });
    const replayMap = await reportFromReceipts(mapOnly.sources, Q, mapOnly.budgetHere, mapOnly.saved, RUN_KEY);
    expect(replayMap.report).toEqual(mapOnly.live.report);
    expect(replayMap.sources).toEqual(mapOnly.live.sources);
    const none = await liveRun(model());
    expect(none.saved).toEqual([]);
    const replayNone = await reportFromReceipts(none.sources, Q, none.budgetHere, none.saved, RUN_KEY);
    expect(replayNone.report).toEqual(none.live.report);
    expect(replayNone.sources).toEqual(none.live.sources);
    expect(none.live.report).toMatchObject({ rankingBasis: 'heuristic', mapCalls: 0, reduceCalls: 0, refusedCalls: 0 });
  });

  it('fails a replay whose population or reader question differs from the recorded run', async () => {
    const run = await liveRun(model({ map: mapOf(() => 5), reduce: async () => ({ ranked: [], usageUnits: 1 }) }));
    await expect(reportFromReceipts(run.sources, Q, run.budgetHere, run.saved)).resolves.toBeDefined();
    await expect(reportFromReceipts(run.sources, ['A different question?'], run.budgetHere, run.saved)).rejects.toThrow('receipt-request-mismatch');
    const changed = [...run.sources.slice(1), ...make('src/mod0/changed.c', 'int changed(void) { return 1; }\n')];
    await expect(reportFromReceipts(changed, Q, run.budgetHere, run.saved)).rejects.toThrow('receipt-request-mismatch');
    await expect(reportFromReceipts(run.sources, Q, run.budgetHere, run.saved.filter(receipt => receipt.kind !== 'map' || receipt.ordinal !== 0))).rejects.toThrow('receipt-missing-for-call');
    const itemCountOnly = run.saved.map(receipt => (receipt.ordinal === 0 ? { ...receipt, itemCount: receipt.itemCount + 1 } : receipt));
    await expect(reportFromReceipts(run.sources, Q, run.budgetHere, itemCountOnly)).rejects.toThrow('receipt-request-mismatch');
  });

  it('keeps only a non-negative safe integer as usage, ignores a live reply\'s own dropped count, and cuts an overlong reply', async () => {
    const sources = population(6, 1);
    const usages = [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 60, '3', null, undefined, 0, 7];
    const seen: (number | null)[] = [];
    for (const usageUnits of usages) {
      const ports = model({ map: async input => ({ ...(await mapOf(() => 5)(input)), usageUnits }) as never });
      await discoverAndSelect(sources, Q, { ...budget, maxMapCalls: 5, maxSelected: 2 }, ports);
      seen.push(ports.receipts.find(receipt => receipt.outcome === 'accepted')!.usageUnits);
    }
    expect(seen).toEqual([null, null, null, null, null, null, null, null, 0, 7]);
    const lying = model({ map: async input => ({ ...(await mapOf(() => 5)(input)), dropped: 999 }) as never, reduce: async () => ({ ranked: [], usageUnits: 1, dropped: 500 }) as never });
    const { report } = await discoverAndSelect(sources, Q, { ...budget, maxMapCalls: 5, maxSelected: 2 }, lying);
    expect(report.droppedUnknownIds).toBe(0);
    expect(lying.receipts.every(receipt => receipt.dropped === 0)).toBe(true);
    const flood = model({ map: async input => ({ usageUnits: 1, claims: Array.from({ length: 40 }, (_, i) => ({ blobId: input.items[i % input.items.length]!.blobId, claim: 'c', relevance: 5 })) }) });
    const cut = await discoverAndSelect(sources, Q, { ...budget, maxMapCalls: 5, maxSelected: 2 }, flood);
    expect(cut.report.droppedUnknownIds).toBe(40 - 6 * MAP_CLAIMS_PER_ITEM);
    expect((flood.receipts.find(receipt => receipt.outcome === 'accepted')!.reply as { claims: unknown[] }).claims).toHaveLength(6 * MAP_CLAIMS_PER_ITEM);
    const floodRank = model({ map: mapOf(() => 5), reduce: async () => ({ ranked: Array.from({ length: 60 }, () => sources[0]!.sourceId), usageUnits: 1 }) });
    const ranked = await discoverAndSelect(sources, Q, { ...budget, maxMapCalls: 5, maxSelected: 2 }, floodRank);
    expect((floodRank.receipts.find(receipt => receipt.kind === 'reduce' && receipt.outcome === 'accepted')!.reply as { ranked: string[] }).ranked).toEqual([sources[0]!.sourceId]);
    expect(ranked.report.droppedUnknownIds).toBe(59);
    // A replay does honour the recorded drop count.
    const replay = await reportFromReceipts(sources, Q, { ...budget, maxMapCalls: 5, maxSelected: 2 }, JSON.parse(JSON.stringify(floodRank.receipts)), RUN_KEY);
    expect(replay.report).toEqual(ranked.report);
  });

  it('hands every port call the abort signal of the run', async () => {
    const controller = new AbortController();
    const signals: AbortSignal[] = [];
    const ports = model({ map: async (input, signal) => { signals.push(signal); return mapOf(() => 5)(input); }, reduce: async (_input, signal) => { signals.push(signal); return { ranked: [], usageUnits: 1 }; } });
    await discoverAndSelect(population(6, 1), Q, { ...budget, maxMapCalls: 5 }, ports, controller.signal);
    expect(signals).toHaveLength(2);
    expect(signals.every(signal => signal === controller.signal)).toBe(true);
    const mid = new AbortController();
    let observed = false;
    await expect(discoverAndSelect(population(6, 1), Q, budget, model({ map: async (input, signal) => { mid.abort(); observed = signal.aborted; return mapOf(() => 5)(input); } }), mid.signal)).rejects.toThrow('cancelled');
    expect(observed).toBe(true);
  });

  it('cancels between and during calls, including before the reduce', async () => {
    const sources = population(40, 4);
    const controller = new AbortController();
    let calls = 0;
    const map = async (input: { items: readonly Item[] }) => { if (++calls === 2) controller.abort(); return mapOf(() => 5)(input); };
    await expect(discoverAndSelect(sources, Q, { ...budget, maxMapCalls: 10, maxGroupBlobs: 10 }, model({ map }), controller.signal)).rejects.toThrow('cancelled');
    const late = new AbortController();
    const reduce = vi.fn(async () => ({ ranked: [], usageUnits: null }));
    await expect(discoverAndSelect(sources, Q, { ...budget, maxMapCalls: 1, maxGroupBlobs: 100 }, model({ map: async input => { late.abort(); return mapOf(() => 5)(input); }, reduce }), late.signal)).rejects.toThrow('cancelled');
    expect(reduce).not.toHaveBeenCalled();
    const hang = new AbortController();
    const pending = discoverAndSelect(sources, Q, budget, model({ map: () => new Promise<never>(() => undefined) }), hang.signal);
    setTimeout(() => hang.abort(), 20);
    await expect(pending).rejects.toThrow('cancelled');
  });

  it('never calls a port once the signal is already aborted', async () => {
    const done = new AbortController(); done.abort();
    const map = vi.fn(mapOf(() => 1)), permitted = vi.fn(async () => true);
    await expect(discoverAndSelect(population(10), Q, budget, model({ map, permitted }), done.signal)).rejects.toThrow('cancelled');
    expect(map).not.toHaveBeenCalled();
    expect(permitted).not.toHaveBeenCalled();
  });

  it('rejects an out-of-range budget', async () => {
    await expect(discoverAndSelect(population(5), Q, { ...budget, maxSelected: 201 }, { permitted: allow })).rejects.toThrow('invalid-budget');
    await expect(discoverAndSelect(population(5), Q, { ...budget, maxSelected: 0 }, { permitted: allow })).rejects.toThrow('invalid-budget');
    await expect(discoverAndSelect(population(5), Q, { ...budget, maxClaimChars: 0 }, { permitted: allow })).rejects.toThrow('invalid-budget');
    await expect(discoverAndSelect(population(5), Q, budget, { permitted: allow })).resolves.toBeDefined();
    expect(DiscoveryRefusal.name).toBe('DiscoveryRefusal');
  });

  it('passes already-excluded rows through untouched and partitions deterministically', async () => {
    const excluded: GenerationSource = { ...make('a/x.bin', 'b\n')[0]!, exclusion: { excluded: true, reason: 'binary-or-non-utf8' }, spans: [] };
    delete (excluded as { body?: string }).body;
    const sources = [excluded, ...population(10, 2)];
    const { sources: out, report } = await discoverAndSelect(sources, Q, { ...budget, maxSelected: 3 }, { permitted: allow });
    expect(out[0]).toBe(excluded);
    expect(report.population).toEqual({ sources: 11, alreadyExcluded: 1, candidateBlobs: 10 });
    const groups = (n: number) => partitionSubsystems(population(n, 3).map(s => ({ blobId: s.sourceId, path: s.path, pieces: [s], bytes: 0, heuristic: 0 })), 4).map(g => [g.name, g.blobs.length]);
    expect(groups(30)).toEqual(groups(30));
    expect(groups(30).every(([, n]) => (n as number) <= 4)).toBe(true);
    expect(groups(30).reduce((n, [, c]) => n + (c as number), 0)).toBe(30);
  });
});

describe('deferred-by-budget ids (syzygy-75ds)', () => {
  const deferredIds = async (runKey?: Buffer) => {
    const out = (await discoverAndSelect(population(5), Q, { ...budget, maxSelected: 2 }, { permitted: allow, ...(runKey === undefined ? {} : { runKey }) })).sources;
    return out.filter(source => source.exclusion.excluded && (source.exclusion as { reason: string }).reason === DEFERRED_BY_BUDGET).map(source => source.sourceId);
  };
  it('carry a keyed opaque id: valid, stable within a key, different across keys', async () => {
    const key = randomBytes(32);
    const a = await deferredIds(key);
    expect(a.length).toBeGreaterThan(0);
    for (const id of a) expect(id).toMatch(/^s-[0-9a-f]{24}$/u);
    expect(await deferredIds(key)).toEqual(a);
    expect(await deferredIds(randomBytes(32))).not.toEqual(a);
  });
});

describe('map excerpts are file bytes only; kind and ranges stay in the local receipt (syzygy-qyez)', () => {
  const licence = '/*\n * Copyright (c) 2024, Example\n * Redistribution and use in source and binary forms are permitted.\n */\n';
  const code = `${licence}/* Core loop. */\nint ae_run(int fd) {\n    return fd;\n}\n`;
  type Seen = { blobId: string; path: string; excerpt: string };
  const run = async (sources: readonly GenerationSource[], b = budget): Promise<{ seen: Seen[]; receipts: DiscoveryReceipt[] }> => {
    const seen: Seen[] = [];
    const ports = model({ map: async input => { seen.push(...input.items as Seen[]); return mapOf(() => 5)(input); } });
    await discoverAndSelect(sources, Q, { ...b, maxMapCalls: 5 }, ports);
    return { seen, receipts: ports.receipts };
  };

  it('sends exactly blobId, path and excerpt per item, and the excerpt is the file lines without the licence block', async () => {
    const { seen } = await run(make('src/ae.c', code));
    expect(Object.keys(seen[0]!).sort()).toEqual(['blobId', 'excerpt', 'path']);
    expect(seen[0]!.excerpt).toBe('/* Core loop. */\nint ae_run(int fd) {');
  });

  it('every line of an excerpt is a line of the admitted file: nothing the generator wrote', async () => {
    const { seen } = await run([...make('src/ae.c', code), ...make('README.md', 'readme\n'.repeat(10))]);
    const fileLines = new Set([...code.split('\n'), 'readme']);
    for (const item of seen) for (const line of item.excerpt.split('\n')) expect(fileLines.has(line), line).toBe(true);
  });

  it('bounds every kind at maxExcerptChars, README included', async () => {
    const { seen } = await run([...make('README.md', 'r'.repeat(9000)), ...make('Makefile', 'm'.repeat(9000)), ...make('src/a.c', `${licence}${'int f(int x) {\n    return x;\n}\n'.repeat(500)}`)], { ...budget, maxExcerptChars: 120 });
    expect(seen).toHaveLength(3);
    for (const item of seen) expect(item.excerpt.length, item.path).toBeLessThanOrEqual(120);
    expect(seen.find(i => i.path === 'README.md')!.excerpt).toHaveLength(120);
  });

  it('records the kind, the quoted byte ranges and the skipped licence range in the receipts of the call, as offsets only', async () => {
    const { receipts } = await run(make('src/ae.c', code));
    const mapReceipts = receipts.filter(r => r.kind === 'map');
    expect(mapReceipts.length).toBeGreaterThan(0);
    for (const receipt of mapReceipts) {
      expect(receipt.excerpts).toHaveLength(1);
      const [audit] = receipt.excerpts!;
      expect(audit).toMatchObject({ kind: 'code-declarations' });
      expect(audit!.licenceSkipped).toEqual([0, Buffer.byteLength(licence.trimEnd(), 'utf8')]);
      const bytes = Buffer.from(code, 'utf8');
      expect(audit!.ranges.map(([a, b]) => bytes.subarray(a, b).toString('utf8')).join('\n')).toBe('/* Core loop. */\nint ae_run(int fd) {');
      expect(JSON.stringify(audit)).not.toContain('Core loop');
    }
  });

  it('keeps the request digest a function of what is sent (subsystem, questions and three-field items): the audit does not move it', async () => {
    const inputs: unknown[] = [];
    const ports = model({ map: async input => { inputs.push(input); return mapOf(() => 5)(input); } });
    await discoverAndSelect(make('src/ae.c', code), Q, budget, ports);
    const receipt = ports.receipts.find(r => r.kind === 'map')!;
    expect(receipt.excerpts).toBeDefined();
    expect(receipt.requestDigest).toBe(digestCanonicalJson(inputs[0], { maxBytes: 50_000_000, maxNodes: 2_000_000, maxDepth: 16 }).digest);
  });

  it('never offers a screened-out source: its text is in no item and no receipt', async () => {
    const secret = make('src/secret.c', `${licence}int hidden_symbol(int x) {\n    return x;\n}\n`).map(source => ({
      ...source, body: undefined, spans: [], exclusion: { excluded: true as const, reason: 'secret-detector' as never } })) as unknown as GenerationSource[];
    const { seen, receipts } = await run([...make('src/ae.c', code), ...secret]);
    expect(seen.map(i => i.path)).toEqual(['src/ae.c']);
    expect(JSON.stringify(seen) + JSON.stringify(receipts)).not.toContain('hidden_symbol');
  });

  it('reads an oversize file from its first piece whatever order the pieces arrive in', async () => {
    const big = `${licence}int first_symbol(int x) {\n    return x;\n}\n${'/* filler */\n'.repeat(12_000)}int last_symbol(int x) {\n    return x;\n}\n`;
    const pieces = make('src/big.c', big);
    expect(pieces.length).toBeGreaterThan(1);
    for (const order of [pieces, [...pieces].reverse()]) {
      const { seen } = await run(order);
      expect(seen[0]!.excerpt).toContain('int first_symbol(int x) {');
      expect(seen[0]!.excerpt).not.toContain('last_symbol');
    }
  });

  it('is identical across two runs over the same population', async () => {
    const sources = [...make('src/ae.c', code), ...make('README.md', 'readme text'), ...population(6, 2)];
    expect((await run(sources)).seen).toEqual((await run(sources)).seen);
  });
});

describe('selection under a byte cap', () => {
  const doc = (name: string, bytes: number): GenerationSource[] => [...make(`docs/${name}.md`, `${'word '.repeat(Math.ceil(bytes / 5))}`.slice(0, bytes - 1) + '\n')];
  const files = [...doc('a', 5000), ...doc('b', 2000), ...doc('c', 300)];
  const capped = (cap: number, extra: Partial<typeof budget> = {}) => discoverAndSelect(files, Q, { ...budget, maxSelectedBytes: cap, ...extra }, { permitted: allow, runKey: RUN_KEY });
  const paths = (sources: readonly GenerationSource[]): string[] => [...new Set(sources.filter(source => !source.exclusion.excluded && source.spans.length > 0).map(source => source.path))];

  it('exports the dossier cap as 400,000 bytes, applied by the dossier budget only', () => {
    expect(DOSSIER_MAX_SELECTED_BYTES).toBe(400_000);
    expect(DOSSIER_DISCOVERY_BUDGET).toEqual({ ...DEFAULT_DISCOVERY_BUDGET, maxSelectedBytes: 400_000 });
    expect(DEFAULT_DISCOVERY_BUDGET.maxSelectedBytes).toBeUndefined();
  });

  it('skips a file that does not fit and still tries the smaller ones below it, naming every skip', async () => {
    const { sources, report } = await capped(2500);
    expect(paths(sources)).toEqual(['docs/b.md', 'docs/c.md']);
    expect(report.bytes).toEqual({ selected: 2300, deferred: 5000, cap: 2500 });
    expect(report.deferred).toEqual([expect.objectContaining({ path: 'docs/a.md', detail: '5000 bytes of quotable text did not fit the remaining 2500 of the 2500-byte selection cap' })]);
    const second = await capped(2100);
    expect(paths(second.sources)).toEqual(['docs/b.md']);
    expect(second.report.bytes).toEqual({ selected: 2000, deferred: 5300, cap: 2100 });
    expect(second.report.deferred.map(entry => [entry.path, entry.detail])).toEqual([
      ['docs/a.md', '5000 bytes of quotable text did not fit the remaining 2100 of the 2100-byte selection cap'],
      ['docs/c.md', '300 bytes of quotable text did not fit the remaining 100 of the 2100-byte selection cap']]);
  });

  it('fits exactly at the cap and defers one byte over it', async () => {
    expect(paths((await capped(7300)).sources)).toEqual(['docs/a.md', 'docs/b.md', 'docs/c.md']);
    expect(paths((await capped(7299)).sources)).toEqual(['docs/a.md', 'docs/b.md']);
    expect((await capped(7300)).report.bytes).toEqual({ selected: 7300, deferred: 0, cap: 7300 });
  });

  it('keeps the denominator: selected plus deferred rows are every candidate, and the byte totals close', async () => {
    const { sources, report } = await capped(2500);
    expect(sources).toHaveLength(files.length);
    expect(report.selected.blobs + report.deferred.length).toBe(report.population.candidateBlobs);
    expect(report.bytes.selected + report.bytes.deferred).toBe(7300);
    expect(sources.filter(source => source.exclusion.excluded && source.exclusion.reason === DEFERRED_BY_BUDGET)).toHaveLength(1);
  });

  it('reports no cap and the bytes kept when none is set', async () => {
    const { report } = await discoverAndSelect(files, Q, budget, { permitted: allow });
    expect(report.bytes).toEqual({ selected: 7300, deferred: 0, cap: null });
  });

  it('counts UTF-8 bytes, not characters', async () => {
    const wide = make('docs/wide.md', `${'\u00e9'.repeat(99)}\n`), narrow = make('docs/narrow.md', `${'e'.repeat(99)}\n`);
    const { sources, report } = await discoverAndSelect([...wide, ...narrow], Q, { ...budget, maxSelectedBytes: 150 }, { permitted: allow, runKey: RUN_KEY });
    expect(paths(sources)).toEqual(['docs/narrow.md']);
    expect(report.bytes).toEqual({ selected: 100, deferred: 199, cap: 150 });
  });

  it('defers a split file whole as one row, in its pieces, when its first piece does not fit the share', async () => {
    const line = 'x'.repeat(79) + '\n';
    const big = make('docs/big.md', line.repeat(2000));
    expect(big.length).toBeGreaterThan(1);
    const total = big.reduce((n, piece) => n + piece.spans.reduce((m, span) => m + Buffer.byteLength(span.text, 'utf8'), 0), 0);
    const small = make('docs/small.md', 'tiny\n');
    const tight = await discoverAndSelect([...big, ...small], Q, { ...budget, maxSelectedBytes: total - 1 }, { permitted: allow, runKey: RUN_KEY });
    expect(paths(tight.sources)).toEqual(['docs/small.md']);
    expect(tight.sources.filter(source => source.exclusion.excluded)).toHaveLength(1);
    expect(tight.report.deferred).toEqual([expect.objectContaining({ path: 'docs/big.md', detail: expect.stringContaining(`in ${big.length} pieces`) })]);
    expect(tight.report.bytes.deferred).toBe(total);
  });

  describe('a split file is admitted by its leading pieces (never a gap), up to a per-file share of the cap', () => {
    const line = 'x'.repeat(79) + '\n';
    const bytesOf = (pieces: readonly GenerationSource[]): number => pieces.reduce((n, piece) => n + piece.spans.reduce((m, span) => m + Buffer.byteLength(span.text, 'utf8'), 0), 0);
    const big = make('docs/big.md', line.repeat(4000));   // 320,000 bytes: four pieces
    const small = make('docs/small.md', 'tiny\n');
    const first = bytesOf(big.slice(0, 1)), total = bytesOf(big);
    const run = (cap: number, extra: Partial<typeof budget> = {}) => discoverAndSelect([...big, ...small], Q, { ...budget, maxSelectedBytes: cap, ...extra }, { permitted: allow, runKey: RUN_KEY });
    const keptPieces = (sources: readonly GenerationSource[]): number => sources.filter(source => source.path === 'docs/big.md' && !source.exclusion.excluded && source.spans.length > 0).length;

    it('has four pieces to work with', () => {
      expect(big).toHaveLength(4);
      expect(first).toBeGreaterThan(79_000);
    });

    it('keeps the whole file when the share holds it', async () => {
      const { sources, report } = await run(total * 4 + 100);
      expect(keptPieces(sources)).toBe(4);
      expect(report.partialBlobs).toBe(0);
      expect(report.selected).toEqual({ blobs: 2, sources: 5 });
      expect(report.deferred).toEqual([]);
      expect(() => validateGenerationSources(sources)).not.toThrow();
    });

    it('keeps the longest leading run that fits the per-file share, and defers the rest as one row naming the bytes not read', async () => {
      const cap = first * 2 * 4 + 10;   // share holds two pieces
      const { sources, report } = await run(cap);
      expect(sources.filter(source => source.path === 'docs/big.md' && source.segment !== undefined).map(source => source.segment!.index)).toEqual([0, 1]);
      expect(keptPieces(sources)).toBe(2);
      const rest = sources.filter(source => source.path === 'docs/big.md' && source.exclusion.excluded);
      expect(rest).toHaveLength(1);
      expect(rest[0]!.exclusion).toEqual({ excluded: true, reason: DEFERRED_BY_BUDGET });
      const from = big[2]!.segment!;
      expect(report.deferred).toEqual([expect.objectContaining({ path: 'docs/big.md', detail: expect.stringContaining(`pieces 3..4 of 4 not read: bytes ${from.start}..${from.blobBytes} of the file's ${from.blobBytes}`) })]);
      expect(report.partialBlobs).toBe(1);
      expect(report.selected).toEqual({ blobs: 1, sources: 3 });
      expect(report.bytes.selected).toBe(bytesOf(big.slice(0, 2)) + 5);
      expect(report.bytes.selected + report.bytes.deferred).toBe(total + 5);
      expect(report.selected.blobs + report.deferred.length).toBe(report.population.candidateBlobs);
      expect(sources).toHaveLength(big.length + small.length - 2 + 1);
      expect(() => validateGenerationSources(sources)).not.toThrow();
    });

    it('is limited by the room left as well as the share, and by the count cap', async () => {
      const room = (await run(first * 4 + 10)).report;   // share holds one piece
      expect(room.selected.sources).toBe(2);
      expect(room.deferred[0]!.detail).toContain('pieces 2..4 of 4 not read');
      const counted = await run(total * 4 + 100, { maxSelected: 2 });   // big ranks first and takes both places
      expect(keptPieces(counted.sources)).toBe(2);
      expect(counted.report.selected.sources).toBe(2);
      expect(counted.report.deferred.map(entry => entry.path).sort()).toEqual(['docs/big.md', 'docs/small.md']);
      expect(counted.report.deferred.find(entry => entry.path === 'docs/big.md')!.detail).toContain('pieces 3..4 of 4 not read');
    });

    it('stops at the room left when that is less than the share, and at the share exactly when it holds whole pieces', async () => {
      // cap 12 first-pieces: share 3, room after ten fillers 2 (+10 bytes).
      const cap = first * 12;
      const fillers = Array.from({ length: 10 }, (_, i) => make(`docs/filler${i}.md`, `${'z'.repeat(first - 2)}\n`)).flat();
      const ports = model({ map: mapOf(item => (item.path.includes('filler') ? 9 : 1)) });
      const limited = await discoverAndSelect([...fillers, ...big], Q, { ...budget, maxSelectedBytes: cap, maxSelected: 200, maxMapCalls: 100 }, ports);
      expect(fillers.every(filler => limited.sources.includes(filler))).toBe(true);
      expect(keptPieces(limited.sources)).toBe(2);
      expect(limited.report.deferred[0]!.detail).toContain('pieces 3..4 of 4 not read');
      // A share that equals the first two pieces exactly keeps both; one byte less keeps one.
      const two = bytesOf(big.slice(0, 2));
      expect(keptPieces((await run(two * 4)).sources)).toBe(2);
      expect(keptPieces((await run(two * 4 - 4)).sources)).toBe(1);
    });

    it('defers the whole file when not even its first piece fits, and counts a piece by its UTF-8 bytes', async () => {
      const none = await run(first * 4 - 8);
      expect(keptPieces(none.sources)).toBe(0);
      expect(none.report.partialBlobs).toBe(0);
      expect(none.report.deferred[0]!.detail).toContain('not even the first piece');
      expect(none.report.bytes.deferred).toBe(total);
      const wide = make('docs/wide.md', `${'\u00e9'.repeat(60)}\n`.repeat(2200));   // two-byte letters
      expect(wide.length).toBeGreaterThan(1);
      const w = await discoverAndSelect(wide, Q, { ...budget, maxSelectedBytes: 4 * bytesOf(wide.slice(0, 1)) - 4 }, { permitted: allow, runKey: RUN_KEY });
      expect(w.report.selected.sources).toBe(0);
    });

    it('never admits a gap: the kept pieces are always 1..k, and a count cap without a byte cap still defers the file whole', async () => {
      for (const cap of [first * 4 + 1, first * 8 + 1, first * 12 + 1]) {
        const { sources } = await run(cap);
        const kept = sources.filter(source => source.path === 'docs/big.md' && source.segment !== undefined).map(source => source.segment!.index);
        expect(kept).toEqual(kept.map((_, i) => i));
      }
      const noByteCap = await discoverAndSelect([...big, ...small], Q, { ...budget, maxSelected: 3 }, { permitted: allow, runKey: RUN_KEY });
      expect(keptPieces(noByteCap.sources)).toBe(0);
      expect(noByteCap.report.partialBlobs).toBe(0);
    });

    it('replays to the same report from receipts', async () => {
      const ports = model({ map: mapOf(() => 1) });
      const cap = first * 2 * 4 + 10;
      const live = await discoverAndSelect([...big, ...small], Q, { ...budget, maxSelectedBytes: cap }, ports);
      const replay = await reportFromReceipts([...big, ...small], Q, { ...budget, maxSelectedBytes: cap }, ports.receipts, RUN_KEY);
      expect(replay.report).toEqual(live.report);
      expect(replay.sources).toEqual(live.sources);
    });
  });

  describe('a prefix population validates only with its deferred row', () => {
    const big = make('docs/big.md', ('x'.repeat(79) + '\n').repeat(4000));
    const row = (): GenerationSource => { const { body: _b, segment: _s, spans: _p, ...bound } = big[2]!; return { ...bound, sourceId: 's-' + 'a'.repeat(24), exclusion: { excluded: true, reason: DEFERRED_BY_BUDGET }, spans: [] }; };
    it('accepts pieces 1..k with a deferred row for the rest, and refuses the same prefix without it, a gap, or a deferred row beside the complete file', () => {
      expect(() => validateGenerationSources([big[0]!, big[1]!, row()])).not.toThrow();
      expect(() => validateGenerationSources([big[0]!, big[1]!])).toThrow();
      expect(() => validateGenerationSources([big[0]!, big[2]!, row()])).toThrow();
      expect(() => validateGenerationSources([...big, row()])).toThrow();
      expect(() => validateGenerationSources([...big.slice(1), row()])).toThrow();
      expect(() => validateGenerationSources([big[0]!, big[1]!, { ...row(), exclusion: { excluded: true, reason: 'oversize-source-excluded' } }])).toThrow();
      // Pieces that run past a declared size are not a prefix: a forged blob size cannot make the full set look partial.
      expect(() => validateGenerationSources([...big.map(piece => ({ ...piece, segment: { ...piece.segment!, blobBytes: piece.segment!.blobBytes + 1 } })), row()])).toThrow();
    });
  });

  it('applies both caps: a count cap still holds when the bytes would allow more', async () => {
    const { sources, report } = await capped(1_000_000, { maxSelected: 2 });
    expect(paths(sources)).toHaveLength(2);
    expect(report.bytes.cap).toBe(1_000_000);
  });

  it('refuses a byte cap that is not a positive safe integer', async () => {
    for (const bad of [0, -1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1]) {
      await expect(capped(bad), String(bad)).rejects.toThrow(DiscoveryRefusal);
    }
  });

  it('replays to the same report from receipts', async () => {
    const ports = model({ map: mapOf(() => 1) });
    const live = await discoverAndSelect(files, Q, { ...budget, maxSelectedBytes: 2500 }, ports);
    const replay = await reportFromReceipts(files, Q, { ...budget, maxSelectedBytes: 2500 }, ports.receipts, RUN_KEY);
    expect(replay.report).toEqual(live.report);
    expect(replay.report.bytes).toEqual({ selected: 2300, deferred: 5000, cap: 2500 });
  });
});

describe('role signals of the prior', () => {
  const score = (path: string, body = 'int x;\n'): number => heuristicScore(path, make(path, body));
  const same = (a: string, b: string): number => score(a) - score(b);

  it('ranks a source root above the rest of the tree at the same depth, and not a bare top-level file', () => {
    expect(same('src/a.c', 'extra/a.c')).toBe(SOURCE_ROOT_BONUS);
    expect(same('lib/a.c', 'extra/a.c')).toBe(SOURCE_ROOT_BONUS);
    expect(score('src')).toBe(score('other'));
  });

  it('ranks configuration, build and history files below source and prose', () => {
    expect(same('src/a.c', 'src/a.conf')).toBe(CONFIGURATION_PENALTY * -1);
    for (const name of ['a.toml', 'a.yaml', 'a.yml', 'a.json', 'a.ini', 'a.xml', 'a.lock']) expect(same('src/a.c', `src/${name}`), name).toBe(CONFIGURATION_PENALTY * -1);
    for (const name of ['Makefile', 'CMakeLists.txt', 'rules.mk', 'a.cmake', 'Dockerfile']) expect(same('src/a.c', `src/${name}`), name).toBe(BUILD_PENALTY * -1);
    for (const name of ['CHANGELOG', 'RELEASE-NOTES', 'HISTORY.txt', 'news.txt']) expect(score(name) - score('plain'), name).toBeLessThanOrEqual(HISTORY_PENALTY + 10);
    expect(score('docs/internals.md')).toBeGreaterThan(score('src/a.c'));
  });

  it('names more design documents: rationale, notes, implementation', () => {
    for (const name of ['RATIONALE.md', 'NOTES.md', 'IMPLEMENTATION.md', 'how-it-works.md']) expect(score(name) - score('zzz.md'), name).toBe(50);
  });

  it('adds a bonus that doubles with the size of the file\'s own opening comment, to a maximum, and ignores a licence block', () => {
    const comment = (chars: number): string => `/* ${'a'.repeat(chars)} */\nint x;\n`;
    const base = score('src/a.c', 'int x;\n');
    expect(score('src/a.c', comment(50)) - base).toBe(0);
    expect(score('src/a.c', comment(400)) - base).toBe(1);
    expect(score('src/a.c', comment(1600)) - base).toBe(3);
    expect(score('src/a.c', comment(10_000_00 / 10)) - base).toBeLessThanOrEqual(COMMENT_BONUS_MAX);
    // Controls of the same length whose comment is not the file's opening one.
    const licence = `/* Copyright (c) someone. ${'a'.repeat(3000)} */\nint x;\n`;
    expect(score('src/a.c', licence)).toBe(score('src/a.c', `int y;\n${licence}`));
    const after = `/* Copyright (c) someone. */\n${comment(1600)}`;
    expect(score('src/a.c', after) - score('src/a.c', `int y;\n${after}`)).toBe(3);
    // A comment that follows code is not the file's opening one.
    expect(score('src/a.c', `int y;\n${comment(3000)}`)).toBe(score('src/a.c', `int y;\nint ${'a'.repeat(3000)};\n`));
    expect(score('docs/a.md', comment(3000))).toBe(score('docs/a.md', `int y;\n${comment(3000)}`));
    expect(score('src/a.c', `// ${'a'.repeat(400)}\nint x;\n`) - base).toBe(1);
  });

  it('puts documented core code ahead of undocumented code and configuration under a byte cap', async () => {
    const documented = make('src/core.c', `/* ${'The core does this and that. '.repeat(60)} */\n${'int f(void);\n'.repeat(250)}`);
    const plain = make('src/plain.c', 'int f(void);\n'.repeat(400));
    const conf = make('server.conf', 'port 1\n'.repeat(900));
    const notes = make('RELEASE-NOTES', 'fixed a bug\n'.repeat(900));
    const { sources } = await discoverAndSelect([...conf, ...notes, ...plain, ...documented], Q, { ...budget, maxSelectedBytes: 6000 }, { permitted: allow, runKey: RUN_KEY });
    const kept = sources.filter(source => !source.exclusion.excluded && source.spans.length > 0).map(source => source.path);
    expect(kept).toEqual(['src/core.c']);
  });
});
