import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildRecord, compareRecords, listStoredDrafts, measureDraft, populationDigest } from './rerender-measure.js';

const COMMIT = 'c'.repeat(40);
const RUN_A = `run-${'a'.repeat(32)}`;
const RUN_B = `run-${'b'.repeat(32)}`;
const cite = (id: string) => ({ id, path: 'src/kestrel.c', startLine: 1, endLine: 3 });
const UNDERSTANDING = ['purpose', 'beneficiary', 'proposition', 'capabilities', 'components', 'choices', 'tradeOffs', 'limits', 'terminology', 'contradictions', 'openQuestions'];
/** A small draft of schema v2 (the `sectionId` form): one produced section and one produced figure on it. */
const draft = (): Record<string, unknown> => ({
  schemaVersion: 'polaris-dossier-local-draft-v2',
  pinnedRevision: COMMIT,
  sessionId: 'authoring-session-1',
  title: 'Kestrel',
  introduction: { id: 'intro', label: 'inferred', basis: 'source', text: 'Kestrel keeps every key in memory.', citations: [cite('c-intro')], quotations: [] },
  understanding: Object.fromEntries(UNDERSTANDING.map((key) => [key, [{ id: `u-${key}`, label: 'inferred', statement: `Understanding of ${key}.`, scope: 'The server.', citations: [cite(`u-${key}-c`)] }]])),
  sections: [{
    id: 'core-ideas', title: 'Core ideas',
    paragraphs: [{ id: 'p1', label: 'inferred', basis: 'source', text: 'Each command runs to completion before the next one starts.', citations: [cite('c-p1')], quotations: [], children: [] }],
    disposition: { kind: 'produced', assetIds: ['core-ideas'] },
  }],
  diagrams: [{
    id: 'd1', title: 'Command flow', sectionId: 'core-ideas', kind: 'flow', relationship: 'A command passes from the client to the server.',
    nodes: [{ id: 'n1', label: 'Client', epistemic: 'inferred', citations: [cite('c-n1')] }, { id: 'n2', label: 'Server', epistemic: 'inferred', citations: [cite('c-n2')] }],
    edges: [{ id: 'e1', from: 'n1', to: 'n2', label: 'sends', epistemic: 'inferred', citations: [cite('c-e1')] }],
    disposition: { kind: 'produced', assetIds: ['d1'] },
  }],
  deepDives: [],
  unresolved: [],
  discovery: { inspected: ['src/kestrel.c'], selected: [], excluded: [], unresolved: [], deferred: [], stoppingReason: 'Read the server first.' },
  clarifications: [],
  executions: [],
});
const bytes = (value: unknown): Uint8Array => new TextEncoder().encode(JSON.stringify(value));
const { title: _title, ...untitled } = draft();

describe('measureDraft', () => {
  it('measures a draft the current schema admits, through the layout it is handed', () => {
    const wide = measureDraft(bytes(draft()), () => 2000);
    expect(wide.outcome).toBe('measured');
    if (wide.outcome !== 'measured') return;
    expect(wide.schemaVersion).toBe('polaris-dossier-local-draft-v2');
    expect(wide.measured.figuresExamined).toBe(1);
    expect(wide.measured.draft.figures).toBe(1);
    expect(wide.measured.draft.figureFit).toEqual({ notFittingAt1440: 1, notFittingAt390: 1, unknown: 0 });
    expect(wide.measured.pages.map((page) => page.page)).toEqual(['index.html']);
    expect(wide.measured.pages[0]!.figures).toBe(1);
    // A narrower layout fits the 966 px column but not the 261 px one: the spacing of the layout moves the numbers.
    const narrow = measureDraft(bytes(draft()), () => 500);
    expect(narrow.outcome === 'measured' && narrow.measured.draft.figureFit).toEqual({ notFittingAt1440: 0, notFittingAt390: 1, unknown: 0 });
    // With no layout every produced figure is Unknown, never fitting.
    const none = measureDraft(bytes(draft()), undefined);
    expect(none.outcome === 'measured' && none.measured.draft.figureFit).toEqual({ notFittingAt1440: 0, notFittingAt390: 0, unknown: 1 });
  });

  it('refuses, and names why, a draft the current schema refuses', () => {
    expect(measureDraft(bytes(untitled), () => 500)).toEqual({ outcome: 'refused', schemaVersion: 'polaris-dossier-local-draft-v2', why: 'schema', schemaFindings: 1 });
    expect(measureDraft(new TextEncoder().encode('{"schemaVersion":'), () => 500)).toEqual({ outcome: 'refused', schemaVersion: null, why: 'not-json', schemaFindings: 0 });
    expect(measureDraft(new Uint8Array([0xff, 0xfe]), () => 500)).toEqual({ outcome: 'refused', schemaVersion: null, why: 'not-utf8', schemaFindings: 0 });
    expect(measureDraft(bytes({ ...draft(), schemaVersion: 'polaris-dossier-local-draft-v1' }), () => 500)).toEqual({ outcome: 'refused', schemaVersion: 'polaris-dossier-local-draft-v1', why: 'unknown-schema-version', schemaFindings: 0 });
    expect(measureDraft(bytes({ ...draft(), pinnedRevision: 'main' }), () => 500)).toEqual({ outcome: 'refused', schemaVersion: 'polaris-dossier-local-draft-v2', why: 'no-pinned-revision', schemaFindings: 0 });
  });
});

describe('a state root listed and recorded', () => {
  let root: string;
  beforeAll(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'rerender-measure-'));
    const drafts = path.join(root, RUN_A, 'drafts');
    fs.mkdirSync(drafts, { recursive: true });
    fs.writeFileSync(path.join(drafts, 'rev-0.json'), bytes(draft()));
    fs.writeFileSync(path.join(drafts, 'rev-1.json'), bytes(untitled));
    fs.writeFileSync(path.join(drafts, 'rev-2.json'), '{"schemaVersion":');
    fs.writeFileSync(path.join(drafts, 'next.json'), bytes(draft()));
    fs.mkdirSync(path.join(root, RUN_B));
    // A session directory beside the run: named as no run directory, so neither listed nor opened. Its mode would make a listing throw.
    const agents = path.join(root, `${RUN_A}.agents`, 'drafts');
    fs.mkdirSync(agents, { recursive: true });
    fs.writeFileSync(path.join(agents, 'rev-0.json'), bytes(draft()));
    fs.chmodSync(path.join(root, `${RUN_A}.agents`), 0o000);
  });
  afterAll(() => {
    fs.chmodSync(path.join(root, `${RUN_A}.agents`), 0o700);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('counts a refused draft, never passing over it, and its counts sum to the drafts found', () => {
    const listing = listStoredDrafts(root);
    expect(listing.runsListed).toBe(2);
    expect(listing.runsWithoutDrafts).toBe(1);
    expect(listing.otherDraftFiles).toBe(1);
    expect(listing.unlistable).toEqual([]);
    expect(listing.drafts.map((d) => `${d.run}/rev-${d.revision}`)).toEqual([`${RUN_A}/rev-0`, `${RUN_A}/rev-1`, `${RUN_A}/rev-2`]);
    const record = buildRecord({ measuredAt: '2026-11-22T00:00:00.000Z', syzygy: { commit: COMMIT, trackedChanges: 0 }, population: 'fixture', figureLayout: 'fixture', listing, layout: () => 2000 });
    expect(record.counts).toEqual({ found: 3, measured: 1, refused: 2, refusedBy: { 'not-utf8': 0, 'not-json': 1, 'unknown-schema-version': 0, 'no-pinned-revision': 0, schema: 1 } });
    expect(record.drafts.filter((row) => row.result.outcome === 'refused').map((row) => row.revision)).toEqual([1, 2]);
    expect(record.totals.figureFit).toEqual({ notFittingAt1440: 1, notFittingAt390: 1, unknown: 0 });
    expect(record.subject.populationSha256).toBe(populationDigest(record.drafts));
    // The record keeps numbers and identities: no draft text reaches it.
    const written = JSON.stringify(record);
    for (const phrase of ['Kestrel', 'runs to completion', 'Command flow', 'Client', 'Read the server first']) expect(written).not.toContain(phrase);
  });
});

// --- The comparison over two small hand-written records -------------------------------------------------------------------------

const adv = (rs19 = 0) => ({ 'RS-13': 0, 'RS-14': 0, 'RS-16': 0, 'RS-17': 0, 'RS-19': rs19 });
const nums = (words: number, figures: number, at390: number, rs19 = 0) => ({ proseWords: words, readingMinutes: Math.ceil(words / 200), figures, advisories: adv(rs19), figureFit: { notFittingAt1440: 0, notFittingAt390: at390, unknown: 0 } });
const measured = (run: string, revision: number, sha: string, words: number, figures: number, at390: number, rs19 = 0) => ({
  run, revision, sha256: sha, bytes: 10,
  result: { outcome: 'measured', schemaVersion: 'polaris-dossier-local-draft-v6', measured: { figuresExamined: figures, draft: { ...nums(words, figures, at390, rs19), unplacedUnits: 0 }, pages: [{ page: 'index.html', ...nums(words, figures, at390, rs19) }] } },
});
const refused = (run: string, revision: number, sha: string) => ({ run, revision, sha256: sha, bytes: 10, result: { outcome: 'refused', schemaVersion: null, why: 'not-json', schemaFindings: 0 } });
const record = (commit: string, digest: string, drafts: readonly unknown[]) => ({ format: 'polaris-dossier-rerender-measure/1', measuredAt: '2026-11-22T00:00:00.000Z', syzygy: { commit, trackedChanges: 0 }, subject: { populationSha256: digest }, drafts });

const BASELINE = record('1'.repeat(40), 'p1', [
  measured(RUN_A, 0, 'sa0', 400, 2, 1),
  measured(RUN_A, 1, 'sa1', 900, 3, 0, 1),
  refused(RUN_A, 2, 'sa2'),
  measured(RUN_B, 0, 'sb0', 100, 1, 0),
  measured(RUN_B, 1, 'sb1', 100, 1, 0),
  measured(RUN_B, 2, 'sb2', 100, 1, 0),
]);
const CURRENT = record('2'.repeat(40), 'p2', [
  measured(RUN_A, 0, 'sa0', 400, 2, 1),
  measured(RUN_A, 1, 'sa1', 900, 3, 2, 3),
  measured(RUN_A, 2, 'sa2', 50, 0, 0),
  measured(RUN_B, 1, 'other-bytes', 100, 1, 0),
  refused(RUN_B, 2, 'sb2'),
  measured(RUN_B, 3, 'sb3', 100, 1, 0),
]);

describe('compareRecords', () => {
  it('reports what moved, draft by draft, with literal counts and deltas', () => {
    const comparison = compareRecords(BASELINE, CURRENT);
    expect(comparison.baseline).toEqual({ commit: '1'.repeat(40), populationSha256: 'p1' });
    expect(comparison.current).toEqual({ commit: '2'.repeat(40), populationSha256: 'p2' });
    expect(comparison.samePopulation).toBe(false);
    expect(comparison.counts).toEqual({ unchanged: 1, changed: 1, added: 1, removed: 1, 'bytes-changed': 1, 'now-refused': 1, 'now-measured': 1, 'refused-both': 0 });
    expect(comparison.moved).toEqual([
      {
        draft: `${RUN_A}/rev-1`, change: 'changed',
        delta: { proseWords: 0, readingMinutes: 0, figures: 0, advisories: { 'RS-13': 0, 'RS-14': 0, 'RS-16': 0, 'RS-17': 0, 'RS-19': 2 }, figureFit: { notFittingAt1440: 0, notFittingAt390: 2, unknown: 0 }, unplacedUnits: 0, figuresExamined: 0 },
        pages: [{ page: 'index.html', change: 'changed' }],
      },
      { draft: `${RUN_A}/rev-2`, change: 'now-measured' },
      { draft: `${RUN_B}/rev-1`, change: 'bytes-changed' },
      { draft: `${RUN_B}/rev-2`, change: 'now-refused' },
      { draft: `${RUN_B}/rev-3`, change: 'added' },
      { draft: `${RUN_B}/rev-0`, change: 'removed' },
    ]);
    expect(comparison.totalsDelta).toEqual({ proseWords: 0, readingMinutes: 0, figures: 0, advisories: { 'RS-13': 0, 'RS-14': 0, 'RS-16': 0, 'RS-17': 0, 'RS-19': 2 }, figureFit: { notFittingAt1440: 0, notFittingAt390: 2, unknown: 0 }, unplacedUnits: 0, figuresExamined: 0 });
  });

  it('finds nothing moved when a record is compared with itself', () => {
    const comparison = compareRecords(BASELINE, BASELINE);
    expect(comparison.samePopulation).toBe(true);
    expect(comparison.counts).toEqual({ unchanged: 5, changed: 0, added: 0, removed: 0, 'bytes-changed': 0, 'now-refused': 0, 'now-measured': 0, 'refused-both': 1 });
    expect(comparison.moved).toEqual([{ draft: `${RUN_A}/rev-2`, change: 'refused-both' }]);
  });

  it('notices a page added or removed, and a page-only move, even where the draft totals hold', () => {
    const moved = measured(RUN_A, 0, 'sa0', 400, 2, 1) as { result: { measured: { pages: unknown[] } } };
    moved.result.measured.pages = [{ page: 'poles/1.html', ...nums(400, 2, 1) }];
    const comparison = compareRecords(record('1'.repeat(40), 'p', [measured(RUN_A, 0, 'sa0', 400, 2, 1)]), record('2'.repeat(40), 'p', [moved]));
    expect(comparison.counts.changed).toBe(1);
    expect(comparison.moved).toEqual([{ draft: `${RUN_A}/rev-0`, change: 'changed', delta: { proseWords: 0, readingMinutes: 0, figures: 0, advisories: adv(), figureFit: { notFittingAt1440: 0, notFittingAt390: 0, unknown: 0 }, unplacedUnits: 0, figuresExamined: 0 }, pages: [{ page: 'poles/1.html', change: 'added' }, { page: 'index.html', change: 'removed' }] }]);
  });

  it('notices a move in the figures examined alone', () => {
    const more = measured(RUN_A, 0, 'sa0', 100, 1, 0) as { result: { measured: { figuresExamined: number } } };
    more.result.measured.figuresExamined = 3;
    const comparison = compareRecords(record('1'.repeat(40), 'p', [measured(RUN_A, 0, 'sa0', 100, 1, 0)]), record('2'.repeat(40), 'p', [more]));
    expect(comparison.moved).toEqual([{ draft: `${RUN_A}/rev-0`, change: 'changed', delta: { proseWords: 0, readingMinutes: 0, figures: 0, advisories: adv(), figureFit: { notFittingAt1440: 0, notFittingAt390: 0, unknown: 0 }, unplacedUnits: 0, figuresExamined: 2 }, pages: [] }]);
    expect(comparison.totalsDelta.figuresExamined).toBe(2);
  });

  it('refuses a record not of its form, naming which', () => {
    expect(() => compareRecords({ format: 'other' }, CURRENT)).toThrow('the baseline record is not of format polaris-dossier-rerender-measure/1');
    expect(() => compareRecords(BASELINE, record('2'.repeat(40), 'p', [measured(RUN_A, 0, 'x', 1, 1, 0), measured(RUN_A, 0, 'x', 1, 1, 0)]))).toThrow(`the current record names ${RUN_A}/rev-0 twice`);
    const broken = measured(RUN_A, 0, 'x', 1, 1, 0) as { result: { measured: { draft: Record<string, unknown> } } };
    broken.result.measured.draft['proseWords'] = -1;
    expect(() => compareRecords(BASELINE, record('2'.repeat(40), 'p', [broken]))).toThrow(`has a measured row for ${RUN_A}/rev-0 whose numbers are not of the ledger's form`);
  });
});
