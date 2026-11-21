import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { NO_PROVIDER_STATEMENTS, type GateSources } from './gate-sources.js';
import { compareInventoryCoverage, inventoryCoverageAdvice, spansOverlap, type InventoryOfRecordReader } from './inventory-coverage.js';

// syzygy-5dhm.28 (pursuit 2026-11-21b, R4 slice 1): which inventory entries no draft block covers. Every expected value below is a
// literal written from the rule's statement (same path with overlapping closed line ranges, or the path named in a claim block's
// text), never read from the module under test.

type Doc = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const cite = (id: string, file: string, startLine: number, endLine: number) => ({ id, path: file, startLine, endLine });
const block = (id: string, text: string, citations: unknown[]) => ({ id, label: 'inferred', basis: 'source', text, citations, quotations: [], children: [] });
const entry = (id: string, citations: unknown[], statement = `STATEMENT-OF-${id}`) => ({ id, kind: 'capability', label: 'inferred', statement, citations, quotations: [] });

const draft = (over: Doc = {}): Doc => ({
  schemaVersion: 'polaris-dossier-local-draft-v5',
  introduction: { id: 'intro', label: 'inferred', basis: 'source', text: 'The server keeps keys in memory.', citations: [cite('c-intro', 'src/server.c', 10, 20)], quotations: [] },
  understanding: { purpose: [{ id: 'u-1', label: 'inferred', statement: 'Stated in docs/ledger.md.', scope: 'All.', citations: [cite('c-u', 'docs/ledger.md', 1, 9)] }] },
  sections: [{ id: 's1', title: 'One', paragraphs: [block('p1', 'Persistence is described in docs/persistence.md at length.', [cite('c-p1', 'src/rdb.c', 100, 120)])], disposition: { kind: 'produced', assetIds: ['s1'] } }],
  diagrams: [],
  deepDives: [],
  unresolved: [],
  discovery: { inspected: ['src/acl.c'], selected: [{ path: 'src/acl.c', reason: 'Read.' }], excluded: [], unresolved: [], deferred: [], stoppingReason: 'Done.' },
  clarifications: [],
  executions: [],
  ...over,
});
const inventory = (entries: unknown[]): Doc => ({ schemaVersion: 'polaris-dossier-local-inventory-v1', sessionId: 'inventory-1', entries, coverage: {} });
const never = (): boolean => false;
const listed = (d: unknown, i: unknown, secret: (p: string) => boolean = never) => compareInventoryCoverage(d, i, secret).uncovered;

describe('inventory coverage: the overlap-or-path-named rule', () => {
  it('counts a cited path found inside a longer path in a claim block as named, and never a path in an understanding item', () => {
    // The draft's paragraph names docs/persistence.md; `persistence.md` is a plain substring of it. docs/ledger.md is named by an understanding item only.
    expect(listed(draft(), inventory([entry('e-short', [cite('x', 'persistence.md', 1, 5)]), entry('e-ledger-named', [cite('y', 'docs/ledger.md', 50, 60)])])))
      .toEqual([{ entryId: 'e-ledger-named', paths: ['docs/ledger.md'], unnamedPaths: 0 }]);
  });

  it('reports unmatched omissions in the record\'s order of first mention and covered ones in the inventory\'s order, each once', () => {
    const d = draft({ inventoryOmissions: [{ entryId: 'z-gone', reason: 'r' }, { entryId: 'e-b', reason: 'r' }, { entryId: 'a-gone', reason: 'r' }, { entryId: 'z-gone', reason: 'again' }, { entryId: 'e-a', reason: 'r' }] });
    const out = compareInventoryCoverage(d, inventory([entry('e-a', [cite('x', 'src/server.c', 20, 40)]), entry('e-b', [cite('y', 'src/rdb.c', 120, 130)])]), never);
    expect(out.omissions).toEqual({ recorded: 4, unmatched: ['z-gone', 'a-gone'], alsoCovered: ['e-a', 'e-b'] });
    expect(out.counts).toEqual({ entries: 2, covered: 2, omitted: 0, uncovered: 0 });
  });

  it('reads two closed line ranges on one path as overlapping when they share a line, and never across paths', () => {
    const span = (file: string, start: number, end: number) => ({ path: file, start, end });
    expect(spansOverlap(span('a', 10, 20), span('a', 20, 30))).toBe(true);
    expect(spansOverlap(span('a', 10, 20), span('a', 21, 30))).toBe(false);
    expect(spansOverlap(span('a', 10, 20), span('a', 1, 9))).toBe(false);
    expect(spansOverlap(span('a', 10, 20), span('a', 1, 10))).toBe(true);
    expect(spansOverlap(span('a', 10, 20), span('a', 12, 13))).toBe(true);
    expect(spansOverlap(span('a', 10, 20), span('b', 10, 20))).toBe(false);
  });

  it('covers an entry a draft block cites on the same path with overlapping lines', () => {
    expect(listed(draft(), inventory([entry('e-overlap', [cite('x', 'src/server.c', 20, 40)])]))).toEqual([]);
  });

  it('lists an entry whose path the draft cites only on disjoint lines', () => {
    expect(listed(draft(), inventory([entry('e-disjoint', [cite('x', 'src/server.c', 21, 40)])]))).toEqual([{ entryId: 'e-disjoint', paths: ['src/server.c'], unnamedPaths: 0 }]);
  });

  it('covers an entry whose cited path a claim block names in its text', () => {
    expect(listed(draft(), inventory([entry('e-named', [cite('x', 'docs/persistence.md', 1, 5)])]))).toEqual([]);
  });

  it('lists an entry the draft neither cites nearby nor names', () => {
    expect(listed(draft(), inventory([entry('e-none', [cite('x', 'src/cluster.c', 1, 5), cite('y', 'src/cluster.h', 2, 3), cite('z', 'src/cluster.c', 9, 9)])])))
      .toEqual([{ entryId: 'e-none', paths: ['src/cluster.c', 'src/cluster.h'], unnamedPaths: 0 }]);
  });

  it('covers an entry when any one of its citations is covered', () => {
    expect(listed(draft(), inventory([entry('e-any', [cite('x', 'src/cluster.c', 1, 5), cite('y', 'src/rdb.c', 120, 130)])]))).toEqual([]);
  });

  it('counts only reading content: the understanding record, the discovery account and the omission record cover nothing', () => {
    const inv = inventory([entry('e-ledger', [cite('x', 'docs/ledger.md', 1, 9)]), entry('e-read', [cite('y', 'src/acl.c', 1, 2)])]);
    expect(listed(draft(), inv).map((e) => e.entryId)).toEqual(['e-ledger', 'e-read']);
    // The same two citations in a section paragraph cover both.
    const cited = draft();
    cited['sections'][0].paragraphs.push(block('p2', 'More.', [cite('c-a', 'docs/ledger.md', 9, 9), cite('c-b', 'src/acl.c', 2, 2)]));
    expect(listed(cited, inv)).toEqual([]);
  });

  it('counts a diagram node, a deep-dive block, a table cell, a code excerpt and an unresolved item as reading content', () => {
    const d = draft({
      diagrams: [{ id: 'd1', nodes: [{ id: 'n1', label: 'Node', epistemic: 'inferred', citations: [cite('c-n', 'src/node.c', 5, 5)] }], edges: [] }],
      deepDives: [{ id: 'dd1', sectionId: 's1', paragraphs: [
        block('dp1', 'Deep.', [cite('c-d', 'src/deep.c', 1, 3)]),
        { kind: 'table', id: 't1', caption: 'T', columns: ['A'], rows: [{ id: 'r1', cells: [{ id: 'cell', label: 'inferred', basis: 'source', text: 'Cell.', citations: [cite('c-t', 'src/table.c', 7, 8)], quotations: [] }] }] },
        { kind: 'code', id: 'k1', citation: cite('c-k', 'src/code.c', 30, 40) },
      ] }],
      unresolved: [{ id: 'q1', question: 'Why?', reason: 'Not stated.', citations: [cite('c-q', 'src/open.c', 2, 2)] }],
    });
    const inv = inventory([
      entry('e-node', [cite('1', 'src/node.c', 1, 5)]), entry('e-deep', [cite('2', 'src/deep.c', 3, 9)]), entry('e-cell', [cite('3', 'src/table.c', 8, 8)]),
      entry('e-code', [cite('4', 'src/code.c', 40, 41)]), entry('e-open', [cite('5', 'src/open.c', 1, 2)]), entry('e-far', [cite('6', 'src/code.c', 41, 41)]),
    ]);
    expect(listed(d, inv)).toEqual([{ entryId: 'e-far', paths: ['src/code.c'], unnamedPaths: 0 }]);
  });

  it('lists an entry that cites nothing, with no path', () => {
    const unknownEntry = { id: 'e-unknown', kind: 'other', label: 'unknown', reason: 'missing-evidence', statement: 'Nothing says.', citations: [] };
    expect(listed(draft(), inventory([unknownEntry]))).toEqual([{ entryId: 'e-unknown', paths: [], unnamedPaths: 0 }]);
  });

  it('leaves out an entry the draft records as a justified omission, and reports the record against the inventory', () => {
    const inv = inventory([entry('e-kept', [cite('1', 'src/cluster.c', 1, 5)]), entry('e-dropped', [cite('2', 'src/sentinel.c', 1, 5)]), entry('e-covered', [cite('3', 'src/server.c', 10, 10)])]);
    const d = draft({ inventoryOmissions: [{ entryId: 'e-dropped', reason: 'Sentinel is out of this dossier.' }, { entryId: 'e-covered', reason: 'Too small.' }, { entryId: 'e-gone', reason: 'An earlier inventory had it.' }] });
    expect(compareInventoryCoverage(d, inv, never)).toEqual({
      counts: { entries: 3, covered: 1, omitted: 1, uncovered: 1 },
      uncovered: [{ entryId: 'e-kept', paths: ['src/cluster.c'], unnamedPaths: 0 }],
      omissions: { recorded: 3, unmatched: ['e-gone'], alsoCovered: ['e-covered'] },
    });
    expect(compareInventoryCoverage(draft(), inv, never).counts).toEqual({ entries: 3, covered: 1, omitted: 0, uncovered: 2 });
  });

  it('counts a path a secret detector matches and never names it', () => {
    const secret = 'docs/TOKEN-PATH.txt';
    const out = compareInventoryCoverage(draft(), inventory([entry('e-secret', [cite('1', secret, 1, 1), cite('2', 'src/cluster.c', 1, 1)]), entry('e-only', [cite('3', secret, 2, 2)])]), (p) => p === secret);
    expect(out.uncovered).toEqual([{ entryId: 'e-secret', paths: ['src/cluster.c'], unnamedPaths: 1 }, { entryId: 'e-only', paths: [], unnamedPaths: 1 }]);
    expect(JSON.stringify(out)).not.toContain('TOKEN-PATH');
  });

  it('carries no entry text, kind, line range or citation identifier', () => {
    const inv = inventory([{ id: 'e-text', kind: 'qualification', label: 'inferred', statement: 'SENTINEL-STATEMENT the project states: "SENTINEL-QUOTE"', citations: [cite('SENTINEL-CITATION-ID', 'src/cluster.c', 4242, 4343)], quotations: ['SENTINEL-CITATION-ID'] }]);
    const out = compareInventoryCoverage(draft(), inv, never);
    expect(out.uncovered).toEqual([{ entryId: 'e-text', paths: ['src/cluster.c'], unnamedPaths: 0 }]);
    const printed = JSON.stringify(out);
    for (const absent of ['SENTINEL', 'qualification', '4242', '4343', 'statement']) expect(printed).not.toContain(absent);
  });

  it('treats a citation with no well-formed range as its whole file, and tolerates subjects of the wrong shape', () => {
    const d = draft();
    d['introduction'].citations = [{ id: 'c', path: 'src/server.c', startLine: 9, endLine: 2 }];
    expect(listed(d, inventory([entry('e-whole', [cite('1', 'src/server.c', 900, 901)])]))).toEqual([]);
    expect(listed(draft(), inventory([entry('e-bad', [{ id: '1', path: 'src/server.c' }])]))).toEqual([]);
    expect(compareInventoryCoverage('x', null, never)).toEqual({ counts: { entries: 0, covered: 0, omitted: 0, uncovered: 0 }, uncovered: [], omissions: { recorded: 0, unmatched: [], alsoCovered: [] } });
    expect(compareInventoryCoverage({ inventoryOmissions: 'x', sections: 7 }, { entries: [3, { citations: 'y' }] }, never).uncovered).toEqual([{ entryId: null, paths: [], unnamedPaths: 0 }]);
  });
});

describe('inventory coverage: the advice at one check', () => {
  const sources = { providerStatements: NO_PROVIDER_STATEMENTS } as unknown as GateSources;
  const sha = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');
  const frozen = (doc: unknown): { run: string; reader: InventoryOfRecordReader; digest: string } => {
    const run = path.join(tempDir('dossier-coverage-'), `run-${'d'.repeat(32)}`);
    fs.mkdirSync(path.join(run, 'inventory'), { recursive: true });
    const body = JSON.stringify(doc);
    fs.writeFileSync(path.join(run, 'inventory', 'rev-2.json'), body);
    const digest = sha(body);
    const reader: InventoryOfRecordReader = async () => ({ counts: true, revision: 2, file: 'inventory/rev-2.json', sha256: digest }) as never;
    return { run, reader, digest };
  };
  const inv = inventory([entry('e-covered', [cite('1', 'src/server.c', 10, 10)]), entry('e-missed', [cite('2', 'src/cluster.c', 1, 5)])]);

  it('compares the draft with the inventory of record and names the revision and digest it read', async () => {
    const { run, reader, digest } = frozen(inv);
    const advice = await inventoryCoverageAdvice(run, draft(), { inventoryOfRecord: reader, sources, now: 0, isSecretPath: never });
    expect(advice).toEqual({
      state: 'compared',
      rule: { id: 'overlap-or-path-named', version: 1 },
      inventory: { revision: 2, sha256: digest, label: 'Inferred', basis: 'the highest-numbered checked inventory revision in the run directory, its check passed and its frozen bytes equal to the digest its check recorded; the run directory is within the agent sessions\' write reach' },
      counts: { entries: 2, covered: 1, omitted: 0, uncovered: 1 },
      uncovered: [{ entryId: 'e-missed', paths: ['src/cluster.c'], unnamedPaths: 0 }],
      omissions: { recorded: 0, unmatched: [], alsoCovered: [] },
      note: expect.stringContaining('it sets no outcome and is not stored in the check record'),
    });
    expect(JSON.stringify(advice)).not.toContain('STATEMENT-OF');
    for (const statement of ['it sets no outcome and is not stored in the check record', 'on the same path with overlapping lines as a citation of the entry', 'Only the entry\'s identifier and the paths it cites are given', 'An entry this draft does represent needs no record, even while it is listed', 'The rule is mechanical: a listed entry may be represented in words the rule cannot see'])
      expect((advice as { note: string }).note).toContain(statement);
    expect((advice as { note: string }).note).toContain('`inventoryOmissions` as `{"entryId": ..., "reason": ...}` (draft schema polaris-dossier-local-draft-v5 or later)');
  });

  it('is Unknown, never an empty list, where no reader is given, no inventory counts, or the frozen inventory is not what was counted', async () => {
    const { run, reader } = frozen(inv);
    const base = { sources, now: 0, isSecretPath: never };
    const none = await inventoryCoverageAdvice(run, draft(), base);
    expect(none).toEqual({ state: 'unknown', why: 'this check was given no reader of the inventory of record', note: expect.stringContaining('is Unknown at this check, not zero uncovered entries') });
    expect(none).not.toHaveProperty('uncovered');
    expect(await inventoryCoverageAdvice(run, draft(), { ...base, inventoryOfRecord: async () => ({ counts: false, why: 'no inventory revision has been checked' }) }))
      .toMatchObject({ state: 'unknown', why: 'no inventory counts: no inventory revision has been checked' });
    fs.appendFileSync(path.join(run, 'inventory', 'rev-2.json'), ' ');
    expect(await inventoryCoverageAdvice(run, draft(), { ...base, inventoryOfRecord: reader })).toMatchObject({ state: 'unknown', why: 'the frozen inventory inventory/rev-2.json changed after it was counted' });
  });

  it('never throws: a reader that fails, a missing file and an inventory that is not an object are each Unknown', async () => {
    const { run, reader } = frozen(inv);
    const base = { sources, now: 0, isSecretPath: never };
    expect(await inventoryCoverageAdvice(run, draft(), { ...base, inventoryOfRecord: async () => { throw new TypeError('SENTINEL-MESSAGE'); } }))
      .toEqual({ state: 'unknown', why: 'the inventory of record could not be read or compared (TypeError)', note: expect.any(String) });
    fs.rmSync(path.join(run, 'inventory', 'rev-2.json'));
    expect(await inventoryCoverageAdvice(run, draft(), { ...base, inventoryOfRecord: reader })).toMatchObject({ state: 'unknown', why: 'the inventory of record could not be read or compared (Error)' });
    const list = frozen([1, 2]);
    expect(await inventoryCoverageAdvice(list.run, draft(), { ...base, inventoryOfRecord: list.reader })).toMatchObject({ state: 'unknown', why: 'the frozen inventory inventory/rev-2.json is not one JSON object' });
  });
});
