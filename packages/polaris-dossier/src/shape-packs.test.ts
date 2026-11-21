import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildDesignPacket } from './design-review.js';
import { composeReaderStandards } from './reader-standards.js';
import { composeDimensions, DEFAULT_PACK, encodeShapePack, selectShapePacks, SERVER_PACK, shapePackRefusal, SHIPPED_PACKS } from './shape-packs.js';

// REQ-polaris-generation-034 version 2.4 (syzygy-3efd.43): the shape packs, their selection and composition, and the design packet's
// recomposition. Expected values are literals (CC-TEST-3); digests were computed outside the module under test.
const sha = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');
const DEFAULT_PACK_SHA = 'c39168876618f95c57c5cf3f638e8e3b30ab2d8fe546b7ed156bf375df2eb59a';
const SERVER_PACK_SHA = 'f45ae36cd165439b78d59b906ac78d3b6c1f6cd15b77d7e18629fb03f71baa76';
const V1_SHA = 'ede073f11ee7eaf5832cba4b8c7addd0bb9ae1cb3b058b7f0ef502aefb7e9555';
const DEFAULT_COMPOSED_SHA = '623c8b83e2c2573502e15a02b33347c7f3f886da09b2e6356e65558ea480f2b4';
const packFile = (name: string): string => fs.readFileSync(new URL(`./shape-packs/${name}.json`, import.meta.url), 'utf8');

describe('shape packs: the shipped data', () => {
  it('each pack file is its pack\'s encoding byte for byte, and its digest is the literal', () => {
    expect(packFile('default')).toBe(encodeShapePack(DEFAULT_PACK));
    expect(packFile('server')).toBe(encodeShapePack(SERVER_PACK));
    expect([sha(packFile('default')), sha(packFile('server'))]).toEqual([DEFAULT_PACK_SHA, SERVER_PACK_SHA]);
    expect([...SHIPPED_PACKS.keys()]).toEqual(['default@1', 'server@1']);
  });

  it('holds the dimensions the requirement names, with their orders', () => {
    const shape = (text: string) => (JSON.parse(text) as { id: string; version: number; selectedBy: unknown; dimensions: { id: string; order: number }[] });
    const d = shape(packFile('default')), s = shape(packFile('server'));
    expect([d.id, d.version, d.selectedBy, d.dimensions.map((x) => [x.id, x.order])]).toEqual(['default', 1, null,
      [['language-and-runtime', 10], ['architecture', 20], ['interfaces', 60], ['platforms-and-dependencies', 70]]]);
    expect([s.id, s.version, s.selectedBy, s.dimensions.map((x) => [x.id, x.order])]).toEqual(['server', 1, { trait: 'server-entry' },
      [['architecture', 20], ['networking', 30], ['state-and-persistence', 40], ['concurrency', 50]]]);
  });

  it('refuses a document that is not a pack of this format', () => {
    const good = (): Record<string, unknown> => JSON.parse(packFile('server'));
    const mutate = (edit: (doc: Record<string, unknown>) => void): string | undefined => { const doc = good(); edit(doc); return shapePackRefusal(doc); };
    expect(shapePackRefusal(good())).toBeUndefined();
    expect(shapePackRefusal([])).toBe('a shape pack is a JSON object');
    expect(mutate((doc) => { doc['extra'] = 1; })).toBe('a shape pack has exactly the members format, id, version, selectedBy, dimensions, in that order');
    expect(mutate((doc) => { doc['format'] = 'polaris-dossier-shape-pack/2'; })).toBe('a shape pack\'s format is polaris-dossier-shape-pack/1');
    expect(mutate((doc) => { doc['id'] = 'Server'; })).toBe('a shape pack\'s id is lower-case letters, digits and hyphens, starting with a letter');
    expect(mutate((doc) => { doc['version'] = 0; })).toBe('a shape pack\'s version is a positive integer');
    expect(mutate((doc) => { doc['version'] = 1.5; })).toBe('a shape pack\'s version is a positive integer');
    expect(mutate((doc) => { doc['selectedBy'] = { trait: 'server-entry', also: 1 }; })).toBe('a shape pack\'s selectedBy is null or {"trait": <trait id>}');
    expect(mutate((doc) => { doc['dimensions'] = []; })).toBe('a shape pack holds at least one dimension');
    const dims = (edit: (d: Record<string, unknown>[]) => void) => mutate((doc) => edit(doc['dimensions'] as Record<string, unknown>[]));
    expect(dims((d) => { d[1]!['id'] = 'architecture'; })).toBe('dimension 1\'s id is a unique identity of lower-case letters, digits and hyphens');
    expect(dims((d) => { d[0]!['order'] = -1; })).toBe('dimension 0\'s order is a positive integer');
    expect(dims((d) => { delete d[0]!['lines']; })).toBe('dimension 0 has exactly the members id, order, lines, in that order');
    expect(dims((d) => { d[0]!['lines'] = ['- Architecture: no indent']; })).toBe('dimension 0\'s lines are one RS-11 bullet: a first line opening "  - " and continuation lines indented four spaces');
    expect(dims((d) => { d[0]!['lines'] = ['  - Architecture: x', '  continued at two spaces']; })).toBe('dimension 0\'s lines are one RS-11 bullet: a first line opening "  - " and continuation lines indented four spaces');
  });
});

describe('shape packs: selection and composition', () => {
  it('selects the default pack, then server where its trait holds, and the default alone for an unknown profile', () => {
    const ids = (traits: Parameters<typeof selectShapePacks>[0]) => selectShapePacks(traits).map((pack) => `${pack.id}@${pack.version}`);
    expect(ids({ serverEntry: true })).toEqual(['default@1', 'server@1']);
    expect(ids({ serverEntry: false })).toEqual(['default@1']);
    expect(ids(null)).toEqual(['default@1']);
    expect(ids({ serverEntry: true })).toEqual(ids({ serverEntry: true }));
  });

  it('composes by order then id, a later pack replacing a dimension of the same id', () => {
    expect(composeDimensions([DEFAULT_PACK, SERVER_PACK]).map((d) => d.id)).toEqual(['language-and-runtime', 'architecture', 'networking', 'state-and-persistence', 'concurrency', 'interfaces', 'platforms-and-dependencies']);
    expect(composeDimensions([DEFAULT_PACK, SERVER_PACK])[1]!.lines[0]).toBe('  - Architecture: how the product is deployed and divided (server and');
    expect(composeDimensions([DEFAULT_PACK])[1]!.lines[0]).toBe('  - Architecture: how the product is divided into parts (modules,');
    const tie = { ...DEFAULT_PACK, id: 'tie', dimensions: [{ id: 'b-dim', order: 5, lines: ['  - B.'] }, { id: 'a-dim', order: 5, lines: ['  - A.'] }] };
    expect(composeDimensions([tie]).map((d) => d.id)).toEqual(['a-dim', 'b-dim']);
  });

  it('default@1 with server@1 composes version 1 itself; default@1 alone composes a text with its own version line and digest', () => {
    const both = composeReaderStandards([DEFAULT_PACK, SERVER_PACK]);
    expect([both.sha256, both.packs, sha(both.text)]).toEqual([V1_SHA, null, V1_SHA]);
    const alone = composeReaderStandards([DEFAULT_PACK]);
    expect([alone.sha256, alone.packs, sha(alone.text)]).toEqual([DEFAULT_COMPOSED_SHA, ['default@1'], DEFAULT_COMPOSED_SHA]);
    expect(alone.text).toContain('Version: `polaris-reader-standards-v1`, technology dimensions from shape packs `default@1`\n');
    expect(alone.text.endsWith('\n') && !alone.text.endsWith('\n\n')).toBe(true);
    for (const absent of ['Networking:', 'State and persistence:', 'Concurrency:', 'deployed and divided', '(server and']) expect(alone.text).not.toContain(absent);
  });
});

describe('the design packet carries the standards the brief carried', () => {
  const input = { run: '/runs/run-x', runId: 'run-x', pinnedRevision: 'a'.repeat(40), audience: 'an operator', files: new Map([['machine.json', `${JSON.stringify({ reviewStatus: [] }, null, 2)}\n`]]) };
  const criteriaOf = (standards?: { sha256?: unknown; packs?: unknown }) => {
    const built = buildDesignPacket({ ...input, ...(standards === undefined ? {} : { standards }) });
    if (!built.ok) throw new Error(built.reason);
    return (JSON.parse(built.bytes).criteria as string[]).join('\n');
  };

  it('carries version 1 when the brief record names no packs, and the composed text, named by packs and digest, when it does', () => {
    expect(criteriaOf()).toContain('(polaris-reader-standards-v1, sha256 ede073f11ee7eaf5832cba4b8c7addd0bb9ae1cb3b058b7f0ef502aefb7e9555)');
    expect(criteriaOf({ sha256: V1_SHA })).toBe(criteriaOf());
    const composed = criteriaOf({ sha256: DEFAULT_COMPOSED_SHA, packs: ['default@1'] });
    expect(composed).toContain('(polaris-reader-standards-v1, technology dimensions from shape packs default@1, sha256 623c8b83e2c2573502e15a02b33347c7f3f886da09b2e6356e65558ea480f2b4)');
    expect(composed).toContain('Version: `polaris-reader-standards-v1`, technology dimensions from shape packs `default@1`');
    expect(composed).not.toContain('Networking:');
  });

  it('refuses, never falling back to version 1, a pack this Syzygy does not ship or a digest the recomposed text does not have', () => {
    const refusal = (standards: { sha256?: unknown; packs?: unknown }) => buildDesignPacket({ ...input, standards });
    expect(refusal({ sha256: DEFAULT_COMPOSED_SHA, packs: ['default@1', 'gpu@1'] })).toEqual({ ok: false, stage: 'standards', reason: 'the reader standards the brief carried cannot be recomposed (gpu@1 is not shipped)' });
    expect(refusal({ sha256: V1_SHA, packs: ['default@1'] })).toEqual({ ok: false, stage: 'standards', reason: 'the reader standards the brief carried cannot be recomposed (the recomposed digest differs from the brief record\'s)' });
    expect(refusal({ sha256: DEFAULT_COMPOSED_SHA, packs: [] })).toEqual({ ok: false, stage: 'standards', reason: 'the reader standards the brief carried cannot be recomposed (the recomposed digest differs from the brief record\'s)' });
  });
});
