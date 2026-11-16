import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';

import { DEFAULT_DISCOVERY_BUDGET, gitBlobObjectId, generationSourcesForBody, validateGenerationSources, DEFERRED_BY_BUDGET, DOSSIER_DISCOVERY_BUDGET, discoverAndSelect, quotableGenerationSources } from '@syzygy/polaris-generation-core';

import { CORE_FILES, redisShapedFiles } from './redis-shaped-fixture.js';
import { main } from './redis-shaped-measure-main.js';
import { measureRedisShapedDiscovery } from './redis-shaped-measure.js';

let scratch = '', run: Awaited<ReturnType<typeof measureRedisShapedDiscovery>>;
beforeAll(async () => {
  scratch = tempDir('syzygy-redis-shaped-test-');
  run = await measureRedisShapedDiscovery(join(scratch, 'repo'));
}, 120_000);

const VENDORED = /^(?:deps|vendor|third_party)\//u;

describe('discovery on a synthetic tree shaped like a large C key-value server', () => {
  it('builds the shape the measurement is about, and says in its own README that it is synthetic', () => {
    const files = redisShapedFiles();
    const paths = [...files.keys()];
    expect(paths.filter(path => /^src\/[^/]+\.c$/u.test(path)).length).toBeGreaterThanOrEqual(150);
    expect(paths.filter(path => path.startsWith('deps/')).length).toBeGreaterThan(150);
    expect(paths.some(path => path.startsWith('tests/unit/')) && paths.some(path => path.startsWith('tests/integration/'))).toBe(true);
    for (const path of ['redis.conf', 'README.md', 'LICENSE.txt', '00-RELEASENOTES', 'modules/hello.c', 'utils/lru-test.sh']) expect(files.has(path), path).toBe(true);
    expect(files.get('README.md')).toContain('SYNTHETIC');
    expect(run.fixture.oversize.length).toBeGreaterThanOrEqual(3);
    expect(paths.length).toBeGreaterThan(400);
  });

  it('splits every oversize file into contiguous pieces that are all counted', () => {
    const { corpus, fixture } = run;
    expect(corpus.count.oversizeFiles).toBe(fixture.oversize.length);
    for (const path of fixture.oversize) {
      const pieces = corpus.sources.filter(source => source.path === path);
      expect(pieces.length, path).toBeGreaterThanOrEqual(2);
      expect(pieces.every(piece => piece.segment !== undefined && !piece.exclusion.excluded), path).toBe(true);
    }
    expect(corpus.sources.length).toBe(corpus.count.sourceRows);
    expect(corpus.count.sourceRows).toBe(fixture.files.size + fixture.oversize.length);
  });

  it('selects no vendored file while first-party files remain, and counts every vendored file as deferred', () => {
    const { measurement, result } = run;
    expect(measurement.selection.vendored).toBe(0);
    const vendoredCandidates = new Set(result.sources.filter(source => VENDORED.test(source.path)).map(source => source.path));
    expect(vendoredCandidates.size).toBeGreaterThan(150);
    const deferredPaths = new Set(result.report.deferred.map(entry => entry.path));
    for (const path of vendoredCandidates) expect(deferredPaths.has(path), path).toBe(true);
    expect(measurement.accounting.deferredVendored).toBe(vendoredCandidates.size);
  });

  it('selects the core mechanism files: event loop, persistence, replication and the data types', () => {
    for (const [role, paths] of Object.entries(CORE_FILES)) {
      expect(run.measurement.coreMechanisms[role]!.selected, role).toEqual([...paths]);
      expect(run.measurement.coreMechanisms[role]!.deferred, role).toEqual([]);
    }
  });

  it('closes the denominator: selected plus deferred is every candidate, and every deferred row keeps its path under an opaque id', () => {
    const { measurement, result, corpus } = run;
    expect(measurement.accounting.closes).toBe(true);
    // A deferred oversize file is one excluded row, not one per piece; its pieces are counted in the blob's single deferral.
    const piecesOf = (path: string): number => corpus.sources.filter(source => source.path === path).length;
    const collapsed = result.report.deferred.reduce((total, entry) => total + piecesOf(entry.path) - 1, 0);
    expect(result.sources).toHaveLength(corpus.sources.length - collapsed);
    expect(measurement.selection.selectedSources).toBeLessThanOrEqual(200);
    expect(quotableGenerationSources(result.sources)).toHaveLength(measurement.selection.selectedSources);
    const deferredRows = result.sources.filter(source => source.exclusion.excluded && source.exclusion.reason === DEFERRED_BY_BUDGET);
    expect(deferredRows).toHaveLength(measurement.accounting.deferredBlobs);
    expect(deferredRows.every(row => /^s-[0-9a-f]{24}$/u.test(row.sourceId) && row.spans.length === 0)).toBe(true);
    expect(measurement.accounting.deferredBlobs + measurement.selection.selectedBlobs).toBe(measurement.accounting.candidateBlobs);
    expect(result.report.boundary).toContain('does not claim whole-repository coverage');
  });

  it('keeps vendored files out of a much smaller selection too, and admits them once nothing first-party is left', async () => {
    const small = await discoverAndSelect(run.corpus.sources, ['q'], { ...DEFAULT_DISCOVERY_BUDGET, maxSelected: 30 }, { permitted: async () => true });
    expect(quotableGenerationSources(small.sources)).toHaveLength(30);
    expect(small.sources.filter(source => !source.exclusion.excluded && source.spans.length > 0 && VENDORED.test(source.path))).toEqual([]);
    const firstParty = run.corpus.sources.filter(source => !VENDORED.test(source.path)).length;
    const wide = await discoverAndSelect(run.corpus.sources.filter(source => !VENDORED.test(source.path) || source.path === 'deps/README.md'), ['q'], DEFAULT_DISCOVERY_BUDGET, { permitted: async () => true });
    expect(firstParty).toBeGreaterThan(200);
    expect(wide.report.selected.sources).toBeLessThanOrEqual(200);
  });

  it('gives the map call a declaration-bearing excerpt for every C file: before, the licence header was all it saw (syzygy-qyez)', () => {
    const { excerpts } = run.measurement;
    expect(excerpts.codeFiles).toBeGreaterThan(150);
    // Before: the first 1,500 characters of every C file are the licence block alone.
    expect(excerpts.before.codeFilesLicenceOnly).toBe(excerpts.codeFiles);
    expect(excerpts.before.codeFilesWithNoCodeLine).toBe(excerpts.codeFiles);
    // After: no code file's excerpt lacks a declaration line, and none repeats the licence comment.
    expect(excerpts.after.codeFilesWithNoCodeLine).toBe(0);
    expect(excerpts.after.licenceCommentInExcerpt).toBe(0);
    expect(excerpts.after.meanCodeLines).toBeGreaterThanOrEqual(8);
    expect(excerpts.after.licenceRangeRecorded).toBe(excerpts.codeFiles);
    expect(excerpts.byKind['code-declarations']).toBe(excerpts.codeFiles);
    for (const [role, row] of Object.entries(excerpts.coreMechanisms)) {
      expect(row.beforeWithCodeLine, role).toBe(0);
      expect(row.afterWithCodeLine, role).toBe(row.files);
      expect(row.files, role).toBe(CORE_FILES[role as keyof typeof CORE_FILES].length);
    }
  });

  it('the excerpt changes what the map call sees, not the ranking without a model: the heuristic selection holds every core file', () => {
    expect(run.measurement.selection.selectedBlobs).toBe(197);   // 196 before the role signals of the prior (syzygy-mea)
    for (const [role, paths] of Object.entries(CORE_FILES)) expect(run.measurement.coreMechanisms[role]!.selected, role).toEqual([...paths]);
  });

  it('shows the sample excerpt: overview comment, then declaration lines, all file bytes, with ranges inside the file', () => {
    const { sample } = run.measurement.excerpts;
    expect(sample.before).toContain('Copyright');
    expect(sample.after.startsWith('/* src/ae.c: synthetic overview.')).toBe(true);
    expect(sample.licenceSkipped![0]).toBe(0);
    expect(sample.after).not.toContain('[code excerpt');
    expect(sample.afterKind).toBe('code-declarations');
    const size = Buffer.byteLength(redisShapedFiles().get(sample.path)!, 'utf8');
    expect(sample.afterRanges.length).toBeGreaterThan(0);
    expect(sample.afterRanges.every(([a, b]) => a >= 0 && b > a && b <= size)).toBe(true);
  });

  describe('under the dossier byte cap (400,000 bytes of quotable text)', () => {
    const CORE = Object.values(CORE_FILES).flat() as string[];
    const inputBytes = (path: string): number => run.corpus.sources.filter(source => source.path === path && !source.exclusion.excluded)
      .reduce((n, source) => n + source.spans.reduce((m, span) => m + Buffer.byteLength(span.text, 'utf8'), 0), 0);
    const keptPaths = (result: Awaited<ReturnType<typeof discoverAndSelect>>): Set<string> =>
      new Set(result.sources.filter(source => !source.exclusion.excluded && source.spans.length > 0).map(source => source.path));
    const coreMap = async (input: { items: readonly { blobId: string; path: string }[] }) =>
      ({ claims: input.items.map(item => ({ blobId: item.blobId, claim: `claim ${item.path}`, relevance: CORE.includes(item.path) ? 10 : 1 })), usageUnits: 1 });

    it('keeps the selection inside the cap, with no vendored file, and closes the denominator and the byte totals', async () => {
      const capped = await discoverAndSelect(run.corpus.sources, ['q'], DOSSIER_DISCOVERY_BUDGET, { permitted: async () => true });
      const { bytes, selected, deferred, population } = capped.report;
      expect(bytes.cap).toBe(400_000);
      expect(bytes.selected).toBeLessThanOrEqual(400_000);
      // The fill is greedy: every deferred file that is not split holds more quotable bytes, counted from the input,
      // than the room the selection left, so none of them would have fit.
      const room = 400_000 - bytes.selected;
      const wholeDeferred = deferred.filter(({ path }) => run.corpus.sources.filter(source => source.path === path).length === 1);
      expect(wholeDeferred.length).toBeGreaterThan(0);
      for (const { path } of wholeDeferred) expect(inputBytes(path), path).toBeGreaterThan(room);
      expect([...keptPaths(capped)].filter(path => VENDORED.test(path))).toEqual([]);
      expect(selected.blobs + deferred.length).toBe(population.candidateBlobs);
      expect(bytes.selected + bytes.deferred).toBe(run.result.report.bytes.selected + run.result.report.bytes.deferred);
      expect(deferred.some(entry => entry.detail.includes('byte selection cap'))).toBe(true);
    });

    const bytesKept = (result: Awaited<ReturnType<typeof discoverAndSelect>>, path: string): number =>
      result.sources.filter(source => source.path === path && !source.exclusion.excluded).reduce((n, source) => n + source.spans.reduce((m, span) => m + Buffer.byteLength(span.text, 'utf8'), 0), 0);

    // The two [Observed] rows keep their exact byte totals (syzygy-bpyt.4.5): each reports what selection measured on this
    // fixed fixture corpus, so the totals are the observation itself, not a bound; the greedy fill is the row above's property.
    it('[Observed] with the path-and-size prior alone, the three files over 100,000 bytes each take their share and only 6 of 18 core files are read', async () => {
      const capped = await discoverAndSelect(run.corpus.sources, ['q'], DOSSIER_DISCOVERY_BUDGET, { permitted: async () => true });
      const kept = keptPaths(capped);
      expect(CORE.filter(path => kept.has(path))).toEqual(['src/ae.c', 'src/ae_epoll.c', 'src/ae_kqueue.c', 'src/server.c', 'src/aof.c', 'src/cluster_legacy.c']);
      expect(capped.report).toMatchObject({ partialBlobs: 3, selected: { blobs: 13, sources: 16 } });
      expect(capped.report.bytes).toEqual({ selected: 399_579, deferred: 3_471_698, cap: 400_000 });
    });

    it('[Observed] once a model ranking names the 18 core mechanism files, all 18 are read: server.c and cluster_legacy.c by their first piece', async () => {
      const capped = await discoverAndSelect(run.corpus.sources, ['q'], { ...DOSSIER_DISCOVERY_BUDGET, maxMapCalls: 100 },
        { permitted: async () => true, map: coreMap, receipt: async () => undefined });
      const kept = keptPaths(capped);
      expect(CORE).toHaveLength(18);
      expect(capped.report.rankingBasis).toBe('model-map');
      expect(CORE.filter(path => !kept.has(path))).toEqual([]);
      expect(capped.report).toMatchObject({ partialBlobs: 2, selected: { blobs: 21, sources: 23 } });
      expect(capped.report.bytes).toEqual({ selected: 399_913, deferred: 3_471_364, cap: 400_000 });
      expect(bytesKept(capped, 'src/server.c')).toBe(99_977);
      expect(bytesKept(capped, 'src/cluster_legacy.c')).toBe(99_983);
      const rest = capped.report.deferred.filter(entry => entry.path === 'src/server.c');
      expect(rest).toEqual([expect.objectContaining({ detail: expect.stringContaining('pieces 2..2 of 2 not read: bytes 99977..130118 of the file\'s 130118') })]);
      expect(() => validateGenerationSources(capped.sources)).not.toThrow();
    });

    it('a server.c over 400,000 bytes contributes its leading pieces, up to the per-file share, and the rest is one deferred row', async () => {
      const original = run.corpus.sources.find(source => source.path === 'src/server.c')!;
      const body = Array.from({ length: 5200 }, (_, i) => `/* line ${i} of a synthetic server.c longer than the whole selection cap */`.padEnd(79, ' ')).join('\n');
      expect(Buffer.byteLength(body)).toBeGreaterThan(400_000);
      const { sourceId: _id, spans: _s, body: _b, segment: _g, exclusion: _e, classificationBasis: _c, ...identity } = original;
      const big = generationSourcesForBody({ ...identity, sourceId: 's-synthetic-server', objectId: gitBlobObjectId(body), body });
      expect(big.length).toBeGreaterThanOrEqual(4);
      const population = [...run.corpus.sources.filter(source => source.path !== 'src/server.c'), ...big];
      const capped = await discoverAndSelect(population, ['q'], { ...DOSSIER_DISCOVERY_BUDGET, maxMapCalls: 100 }, { permitted: async () => true, map: coreMap, receipt: async () => undefined });
      const kept = capped.sources.filter(source => source.path === 'src/server.c' && !source.exclusion.excluded);
      expect(kept.length).toBeGreaterThanOrEqual(1);
      expect(kept.map(source => source.segment!.index)).toEqual(kept.map((_, index) => index));
      expect(bytesKept(capped, 'src/server.c')).toBeLessThanOrEqual(100_000);
      expect(bytesKept(capped, 'src/server.c')).toBeGreaterThan(79_000);
      const rows = capped.sources.filter(source => source.path === 'src/server.c' && source.exclusion.excluded);
      expect(rows).toHaveLength(1);
      const note = capped.report.deferred.find(entry => entry.path === 'src/server.c')!.detail;
      expect(note).toContain(`pieces ${kept.length + 1}..${big.length} of ${big.length} not read: bytes ${big[kept.length]!.segment!.start}..${big[0]!.segment!.blobBytes}`);
      const populationBytes = population.reduce((n, source) => n + source.spans.reduce((m, span) => m + Buffer.byteLength(span.text, 'utf8'), 0), 0);
      expect(capped.report.bytes.selected + capped.report.bytes.deferred).toBe(populationBytes);
      expect(capped.report.selected.blobs + capped.report.deferred.length).toBe(capped.report.population.candidateBlobs);
      expect(() => validateGenerationSources(capped.sources)).not.toThrow();
      expect(CORE.filter(path => !keptPaths(capped).has(path))).toEqual([]);
    });
  });

  it('writes the measurement through the command and refuses to overwrite it', async () => {
    const out = join(scratch, 'measurement.json');
    expect(await main(['--out', out])).toBe(0);
    const written = JSON.parse(readFileSync(out, 'utf8'));
    expect(written.selection.vendored).toBe(0);
    expect(written.accounting.closes).toBe(true);
    await expect(main(['--out', out])).rejects.toThrow();
    expect(await main(['--bogus'])).toBe(2);
  }, 120_000);
});
