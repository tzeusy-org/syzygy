import * as fs from 'node:fs';
import * as path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { declaredSubjectFixture } from './full-run.testkit.js';
import type { FigureFit } from './figure-fit.js';
import { readerAdvice } from './reader-advice.js';
import { compareLedgers, readingDifference, readingLedger, type ReadingLedger } from './reading-ledger.js';
import { parseRunConfig } from './run-config.js';
import { NO_WORK_ITEM_REASON, encodeRunRecord, type RunSubject } from './run-record.js';

// REQ-polaris-generation-034 version 2.4 (syzygy-3efd.21): the reading ledger and its difference from the previous run of the same
// repository. Every expected number below was computed by hand from the fixture by the requirement's stated rules, never from the code.

type Draft = Record<string, unknown>;
const words = (n: number): string => Array.from({ length: n }, () => 'word').join(' ');
const block = (id: string, text: string, children: unknown[] = []) => ({ id, label: 'non-normative', text, children });
const cite = (file: string) => [{ id: `c-${file}`, path: file, startLine: 1, endLine: 1 }];
const figure = (id: string, home: unknown, kind = 'produced', edgeFile = 'src/a.c') => ({
  id, title: 'A figure', home, kind: 'flow', relationship: 'Order.', disposition: kind === 'produced' ? { kind: 'produced', assetIds: [id] } : { kind: 'omitted', reason: 'No.', citations: [] },
  nodes: [{ id: `${id}-n1`, label: 'One', epistemic: 'inferred', citations: cite('src/a.c') }, { id: `${id}-n2`, label: 'Two', epistemic: 'inferred', citations: cite('src/a.c') }],
  edges: [{ id: `${id}-e1`, from: `${id}-n1`, to: `${id}-n2`, label: 'to', epistemic: 'inferred', citations: cite(edgeFile) }],
});
const section = (id: string, title: string, paragraphs: unknown[], produced = true) => ({ id, title, paragraphs, disposition: produced ? { kind: 'produced', assetIds: [id] } : { kind: 'omitted', reason: 'No.', citations: [] } });
const dive = (id: string, title: string, sectionId: string, paragraphs: unknown[], produced = true) => ({ ...section(id, title, paragraphs, produced), sectionId });

/** The scenario "Reading ledger stored with the check": two Poles, a why section, two produced deep dives, deep dives that are not produced,
 * a section no Pole lists, and figures homed in sections, a produced deep dive, an unproduced deep dive and the overview. */
const DRAFT: Draft = {
  schemaVersion: 'polaris-dossier-local-draft-v5',
  introduction: { id: 'intro', label: 'non-normative', text: 'Kestrel is a small server.' },
  sections: [
    section('why', 'Why it exists', [block('w1', 'Why this exists.', [block('w1a', 'It is small.')])]),
    section('core', 'Core ideas', [block('k1', 'One two three four five'), { kind: 'steps', id: 'st', items: [block('st1', 'Not counted at all here.'), block('st2', 'Nor here.')] }]),
    section('flow', 'Flow', [block('f1', words(301))]),
    section('loose', 'Inside handleRequest', [block('l1', 'Loose words go here')]),
    section('gone', 'Gone', [block('g1', 'Seven words that no page ever holds')], false),
  ],
  poles: [{ label: 'A', sections: ['why', 'core'] }, { label: 'B', sections: ['flow'] }],
  whySection: 'why',
  deepDives: [
    dive('dive-a', 'A closer look', 'core', [block('da1', 'Dive words.')]),
    dive('dive-b', 'The `run` loop', 'flow', [block('db1', 'Three dive words.')]),
    dive('dive-c', 'Not written', 'flow', [block('dc1', 'Never counted.')], false),
    dive('dive-d', 'Not written either', 'why', [block('dd1', 'Never counted either.')], false),
  ],
  diagrams: [
    figure('g0', { kind: 'section', target: 'core' }),
    figure('g1', { kind: 'deep-dive', target: 'dive-a' }, 'produced', 'src/b.c'),
    figure('g2', { kind: 'deep-dive', target: 'dive-c' }),
    figure('g3', { kind: 'overview' }),
    figure('g4', { kind: 'section', target: 'loose' }),
    figure('g5', { kind: 'section', target: 'core' }, 'omitted'),
  ],
};
const fitted = (diagram: string, viewportPx: number) => ({ diagram, viewportPx, laidOutPx: 1048, drawnPx: 860, columnPx: viewportPx === 390 ? 261 : 966, textPx: 10.67, minTextPx: 11, failed: ['width' as const] });
const FIT: FigureFit = {
  textPx: 13, minTextPx: 11, viewports: [{ viewportPx: 1440, columnPx: 966 }, { viewportPx: 390, columnPx: 261 }], examined: 5,
  entries: [fitted('g0', 390), fitted('g2', 1440), fitted('g2', 390), { diagram: 'g3', unknown: 'x' }, { diagram: 'g4', unknown: 'x' }],
};
const zero = { 'RS-13': 0, 'RS-14': 0, 'RS-16': 0, 'RS-17': 0, 'RS-19': 0 };
const noFit = { notFittingAt1440: 0, notFittingAt390: 0, unknown: 0 };

describe('reading ledger', () => {
  it('places the advice it counts at the paths the reader advice gives', () => {
    expect(readerAdvice(DRAFT).advisories.map((a) => [a.standard, a.at])).toEqual([
      ['RS-19', '$.sections[2].paragraphs'], ['RS-13', '$.sections[3].title'], ['RS-13', '$.deepDives[1].title'], ['RS-14', '$.deepDives'],
      ['RS-16', '$.sections[0]'], ['RS-16', '$.sections[2]'], ['RS-16', '$.sections[4]'], ['RS-17', '$.diagrams[1].edges[0]'],
    ]);
  });

  it('counts every page by the stated rules, and the draft once', () => {
    const ledger = readingLedger(DRAFT, FIT, readerAdvice(DRAFT));
    expect(ledger).toEqual({
      format: 'polaris-dossier-reading-ledger/1', wordsPerMinute: 200,
      pages: [
        { page: 'index.html', units: ['introduction', 'section:why'], proseWords: 11, readingMinutes: 1, figures: 1, advisories: { ...zero, 'RS-16': 1 }, figureFit: { ...noFit, unknown: 1 } },
        { page: 'poles/1.html', units: ['section:core'], proseWords: 5, readingMinutes: 1, figures: 1, advisories: zero, figureFit: { ...noFit, notFittingAt390: 1 } },
        { page: 'poles/2.html', units: ['section:flow'], proseWords: 301, readingMinutes: 2, figures: 1, advisories: { ...zero, 'RS-16': 1, 'RS-19': 1 }, figureFit: { notFittingAt1440: 1, notFittingAt390: 1, unknown: 0 } },
        { page: 'deep-dives/dive-a.html', units: ['deep-dive:dive-a'], proseWords: 2, readingMinutes: 1, figures: 1, advisories: { ...zero, 'RS-17': 1 }, figureFit: noFit },
        { page: 'deep-dives/dive-b.html', units: ['deep-dive:dive-b'], proseWords: 3, readingMinutes: 1, figures: 0, advisories: { ...zero, 'RS-13': 1 }, figureFit: noFit },
      ],
      draft: { proseWords: 326, readingMinutes: 2, figures: 5, advisories: { 'RS-13': 2, 'RS-14': 1, 'RS-16': 3, 'RS-17': 1, 'RS-19': 1 }, figureFit: { notFittingAt1440: 1, notFittingAt390: 2, unknown: 2 }, unplacedUnits: 1 },
    });
  });

  it('without Poles keeps every produced section on the landing page; an earlier schema places a figure by sectionId', () => {
    const v4 = { ...DRAFT, schemaVersion: 'polaris-dossier-local-draft-v4', poles: undefined, whySection: undefined,
      diagrams: [{ ...figure('h0', undefined), home: undefined, sectionId: 'loose' }, { ...figure('h1', undefined), home: undefined, sectionId: 'gone' }] };
    const ledger = readingLedger(v4, { ...FIT, entries: [] }, { standards: 'polaris-reader-standards-v1', note: '', advisories: [] });
    expect(ledger.pages.map((p) => [p.page, p.units, p.proseWords, p.figures])).toEqual([
      ['index.html', ['introduction', 'section:why', 'section:core', 'section:flow', 'section:loose'], 321, 1],
      ['deep-dives/dive-a.html', ['deep-dive:dive-a'], 2, 0],
      ['deep-dives/dive-b.html', ['deep-dive:dive-b'], 3, 0],
    ]);
    expect(ledger.draft).toMatchObject({ proseWords: 326, figures: 2, unplacedUnits: 0 });
  });

  it('gives a Pole holding only the why section no page, places a section two Poles list by the first, and shares one entry between colliding deep-dive names', () => {
    const doc = { ...DRAFT, poles: [{ label: 'A', sections: ['why'] }, { label: 'B', sections: ['flow', 'core'] }, { label: 'C', sections: ['core', 'loose'] }],
      deepDives: [dive('a b', 'One', 'core', [block('x1', 'One.')]), dive('a:b', 'Two', 'core', [block('x2', 'Two words.')])], diagrams: [] };
    const ledger = readingLedger(doc, { ...FIT, entries: [] }, { standards: 'polaris-reader-standards-v1', note: '', advisories: [] });
    expect(ledger.pages.map((p) => [p.page, p.units, p.proseWords])).toEqual([
      ['index.html', ['introduction', 'section:why'], 11],
      ['poles/2.html', ['section:core', 'section:flow'], 306],
      ['poles/3.html', ['section:loose'], 4],
      ['deep-dives/a_b.html', ['deep-dive:a b', 'deep-dive:a:b'], 3],
    ]);
    expect(ledger.draft.unplacedUnits).toBe(0);
  });

  it('counts nothing in a part that is not of the expected form, and holds only the landing page for a draft that is not an object', () => {
    expect(readingLedger([1, 2], { ...FIT, entries: [] }, { standards: 'polaris-reader-standards-v1', note: '', advisories: [] })).toEqual({
      format: 'polaris-dossier-reading-ledger/1', wordsPerMinute: 200,
      pages: [{ page: 'index.html', units: [], proseWords: 0, readingMinutes: 0, figures: 0, advisories: zero, figureFit: noFit }],
      draft: { proseWords: 0, readingMinutes: 0, figures: 0, advisories: zero, figureFit: noFit, unplacedUnits: 0 },
    });
  });
});

// --- the difference ---------------------------------------------------------------------------------------------------------------

const page = (name: string, proseWords: number, rs19 = 0) => ({ page: name, units: [], proseWords, readingMinutes: Math.ceil(proseWords / 200), figures: 1, advisories: { ...zero, 'RS-19': rs19 }, figureFit: noFit });
const ledgerOf = (pages: ReturnType<typeof page>[], unplaced = 0): ReadingLedger => ({
  format: 'polaris-dossier-reading-ledger/1', wordsPerMinute: 200, pages,
  draft: { proseWords: pages.reduce((n, p) => n + p.proseWords, 0), readingMinutes: 9, figures: pages.length, advisories: zero, figureFit: noFit, unplacedUnits: unplaced },
});
const EARLIER = ledgerOf([page('index.html', 100), page('poles/1.html', 250), page('deep-dives/old.html', 40)], 1);
const LATER = ledgerOf([page('index.html', 100), page('poles/1.html', 320, 1), page('poles/2.html', 60)], 0);
const PIN = 'b'.repeat(40);

const subject = (repositoryId: string): RunSubject => ({
  repository: { url: `github.com/example/${repositoryId}`, repositoryId, role: 'observed-source' },
  clone: { path: '/srv/clones/x', declaredBy: 'operator', label: 'Inferred', use: 'read' },
  pinnedRevision: { commit: PIN, label: 'x', pinnedAt: '2026-10-07T10:00:00.000Z' },
  ...declaredSubjectFixture(),
  governed: { kind: 'non-governed', because: ['fixture'] },
  workItem: { identity: null, reason: NO_WORK_ITEM_REASON },
});
let RUN_RECORD: (repositoryId: string) => string;
beforeAll(() => {
  const parsed = parseRunConfig(JSON.stringify({
    operator: 'Tzeusy', agentTool: 'claude-code', agentToolVersion: '2.1.0', agentProvider: 'anthropic', model: 'claude-opus-5-5',
    deadline: 'PT1H', agentTokenBudget: 100_000, maxRepairCycles: 3, maxQuestions: 2, audience: 'an operator', operatorIsOwner: true,
  }));
  if (!parsed.ok) throw new Error('fixture configuration refused');
  RUN_RECORD = (repositoryId) => encodeRunRecord(parsed.config, subject(repositoryId));
});
const id = (c: string): string => `run-${c.repeat(32)}`;
/** A run directory in `root` with its run record (or the given text) and check records. */
const runIn = (root: string, name: string, record: string, checks: Record<number, unknown> = {}): string => {
  const dir = path.join(root, name);
  fs.mkdirSync(path.join(dir, 'checks'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'run.json'), record);
  for (const [n, body] of Object.entries(checks)) fs.writeFileSync(path.join(dir, 'checks', `rev-${n}.json`), typeof body === 'string' ? body : JSON.stringify(body));
  return dir;
};
const checkRecord = (checkedAt: string, readingLedger: unknown, revision = 0) => ({ format: 'polaris-dossier-check/1', revision, pinnedRevision: PIN, checkedAt, readingLedger });
const NOW = '2026-11-22T12:00:00.000Z';

describe('reading difference', () => {
  it('compares with the previous run of the same repository: unchanged, changed, added and removed pages, and the draft', () => {
    const root = tempDir('reading-difference-');
    const self = runIn(root, id('c'), RUN_RECORD('kestrel'));
    // The same repository: revision 1 does not parse, so revision 0's ledger is its candidate and the unreadable record is counted.
    runIn(root, id('a'), RUN_RECORD('kestrel'), { 0: checkRecord('2026-11-22T10:00:00.000Z', EARLIER), 1: '{ not json' });
    // Another repository, checked later, is never compared; a run-form directory whose run record cannot be read is counted.
    runIn(root, id('b'), RUN_RECORD('other'), { 0: checkRecord('2026-11-22T11:00:00.000Z', LATER) });
    runIn(root, id('d'), '{ broken');
    fs.mkdirSync(path.join(root, 'not-a-run'));
    const difference = readingDifference(self, 'kestrel', NOW, LATER);
    const same = { proseWords: 100, readingMinutes: 1, figures: 1, advisories: zero, figureFit: noFit };
    expect(difference).toEqual({
      state: 'compared',
      against: { runId: id('a'), revision: 0, pinnedRevision: PIN, checkedAt: '2026-11-22T10:00:00.000Z' },
      pages: [
        { page: 'index.html', change: 'unchanged', before: same, after: same, delta: { proseWords: 0, readingMinutes: 0, figures: 0, advisories: zero, figureFit: noFit } },
        { page: 'poles/1.html', change: 'changed', before: { ...same, proseWords: 250, readingMinutes: 2 }, after: { ...same, proseWords: 320, readingMinutes: 2, advisories: { ...zero, 'RS-19': 1 } },
          delta: { proseWords: 70, readingMinutes: 0, figures: 0, advisories: { ...zero, 'RS-19': 1 }, figureFit: noFit } },
        { page: 'poles/2.html', change: 'added', before: null, after: { ...same, proseWords: 60 }, delta: null },
        { page: 'deep-dives/old.html', change: 'removed', before: { ...same, proseWords: 40 }, after: null, delta: null },
      ],
      draft: {
        before: { proseWords: 390, readingMinutes: 9, figures: 3, advisories: zero, figureFit: noFit, unplacedUnits: 1 },
        after: { proseWords: 480, readingMinutes: 9, figures: 3, advisories: zero, figureFit: noFit, unplacedUnits: 0 },
        delta: { proseWords: 90, readingMinutes: 0, figures: 0, advisories: zero, figureFit: noFit, unplacedUnits: -1 },
      },
      unreadableRuns: 1, unreadableCheckRecords: 1,
    });
    // Computed, never written: the state root holds only what the fixture wrote.
    expect(fs.readdirSync(path.join(self, 'checks'))).toEqual([]);
  });

  it('is Unknown, never zero, where no earlier run of the repository holds a ledger, and counts what it could not read', () => {
    const root = tempDir('reading-difference-');
    const self = runIn(root, id('c'), RUN_RECORD('kestrel'));
    runIn(root, id('b'), RUN_RECORD('other'), { 0: checkRecord('2026-11-22T11:00:00.000Z', EARLIER) });
    runIn(root, id('e'), RUN_RECORD('kestrel'), { 0: { ...checkRecord('2026-11-22T11:00:00.000Z', EARLIER), readingLedger: undefined } });
    runIn(root, id('d'), '{ broken');
    expect(readingDifference(self, 'kestrel', NOW, LATER)).toEqual({
      state: 'unknown', why: 'no earlier run of this repository in the state root holds a reading ledger that could be read', unreadableRuns: 1, unreadableCheckRecords: 0,
    });
  });

  it('takes the latest earlier check, a tie going to the greatest run identity, and skips a ledger checked after this check', () => {
    const root = tempDir('reading-difference-');
    const self = runIn(root, id('c'), RUN_RECORD('kestrel'));
    runIn(root, id('1'), RUN_RECORD('kestrel'), { 0: checkRecord('2026-11-22T09:00:00.000Z', EARLIER) });
    runIn(root, id('4'), RUN_RECORD('kestrel'), { 0: checkRecord('2026-11-22T09:00:00.000Z', EARLIER) });
    runIn(root, id('2'), RUN_RECORD('kestrel'), { 0: checkRecord('2026-11-22T08:00:00.000Z', EARLIER) });
    // A concurrent run checked later than this check: its earlier ledger counts, its later one does not hide it.
    runIn(root, id('f'), RUN_RECORD('kestrel'), { 0: checkRecord('2026-11-22T07:00:00.000Z', EARLIER), 1: checkRecord('2026-11-22T13:00:00.000Z', EARLIER, 1) });
    expect(readingDifference(self, 'kestrel', NOW, LATER)).toMatchObject({ state: 'compared', against: { runId: id('4'), checkedAt: '2026-11-22T09:00:00.000Z' } });
    runIn(root, id('0'), RUN_RECORD('kestrel'), { 0: checkRecord('2026-11-22T11:59:59.999Z', EARLIER, 0) });
    expect(readingDifference(self, 'kestrel', NOW, LATER)).toMatchObject({ state: 'compared', against: { runId: id('0') } });
  });

  it('counts a ledger of this format that is malformed as an unreadable check record', () => {
    const root = tempDir('reading-difference-');
    const self = runIn(root, id('c'), RUN_RECORD('kestrel'));
    runIn(root, id('a'), RUN_RECORD('kestrel'), { 0: checkRecord('2026-11-22T10:00:00.000Z', { ...EARLIER, pages: [{ page: 'index.html' }] }) });
    expect(readingDifference(self, 'kestrel', NOW, LATER)).toMatchObject({ state: 'unknown', unreadableRuns: 0, unreadableCheckRecords: 1 });
  });

  it('never takes a ledger checked at the same instant as this check', () => {
    const root = tempDir('reading-difference-');
    const self = runIn(root, id('c'), RUN_RECORD('kestrel'));
    runIn(root, id('a'), RUN_RECORD('kestrel'), { 0: checkRecord(NOW, EARLIER) });
    // A valid checkedAt not earlier than this check is passed over, not counted.
    expect(readingDifference(self, 'kestrel', NOW, LATER)).toEqual({
      state: 'unknown', why: 'no earlier run of this repository in the state root holds a reading ledger that could be read', unreadableRuns: 0, unreadableCheckRecords: 0,
    });
  });

  it('counts a check record whose checkedAt is missing or malformed as unreadable, and takes the next earlier record of that run', () => {
    const root = tempDir('reading-difference-');
    const self = runIn(root, id('c'), RUN_RECORD('kestrel'));
    runIn(root, id('a'), RUN_RECORD('kestrel'), {
      0: checkRecord('2026-11-22T08:00:00.000Z', EARLIER),
      1: checkRecord('2026-11-22 09:00', EARLIER, 1),
      2: { ...checkRecord('2026-11-22T10:00:00.000Z', EARLIER, 2), checkedAt: undefined },
    });
    expect(readingDifference(self, 'kestrel', NOW, LATER)).toMatchObject({
      state: 'compared', against: { runId: id('a'), revision: 0, checkedAt: '2026-11-22T08:00:00.000Z' }, unreadableRuns: 0, unreadableCheckRecords: 2,
    });
  });

  it('reports the record\'s own revision, and counts a record whose revision is not the one its file name says as unreadable', () => {
    const root = tempDir('reading-difference-');
    const self = runIn(root, id('c'), RUN_RECORD('kestrel'));
    runIn(root, id('a'), RUN_RECORD('kestrel'), {
      2: checkRecord('2026-11-22T08:00:00.000Z', EARLIER, 2),
      3: checkRecord('2026-11-22T09:00:00.000Z', EARLIER, 7),
      4: { ...checkRecord('2026-11-22T10:00:00.000Z', EARLIER), revision: '4' },
    });
    expect(readingDifference(self, 'kestrel', NOW, LATER)).toEqual(expect.objectContaining({
      state: 'compared', against: { runId: id('a'), revision: 2, pinnedRevision: PIN, checkedAt: '2026-11-22T08:00:00.000Z' }, unreadableRuns: 0, unreadableCheckRecords: 2,
    }));
  });

  it('counts a run with no run record as unreadable; a run with no checks directory holds no record, and a checks path it cannot list is counted', () => {
    const root = tempDir('reading-difference-');
    const self = runIn(root, id('c'), RUN_RECORD('kestrel'));
    fs.mkdirSync(path.join(root, id('d'))); // a run-form directory with no run.json
    const bare = path.join(root, id('e'));
    fs.mkdirSync(bare);
    fs.writeFileSync(path.join(bare, 'run.json'), RUN_RECORD('kestrel')); // no checks directory: nothing to count
    expect(readingDifference(self, 'kestrel', NOW, LATER)).toEqual({
      state: 'unknown', why: 'no earlier run of this repository in the state root holds a reading ledger that could be read', unreadableRuns: 1, unreadableCheckRecords: 0,
    });
    const notDir = path.join(root, id('f'));
    fs.mkdirSync(notDir);
    fs.writeFileSync(path.join(notDir, 'run.json'), RUN_RECORD('kestrel'));
    fs.writeFileSync(path.join(notDir, 'checks'), 'a file where the directory should be');
    expect(readingDifference(self, 'kestrel', NOW, LATER)).toMatchObject({ state: 'unknown', unreadableRuns: 1, unreadableCheckRecords: 1 });
  });

  it('says why where the state root cannot be listed or the draft does not parse', () => {
    expect(readingDifference(path.join(tempDir('reading-difference-'), 'gone', id('c')), 'kestrel', NOW, LATER)).toEqual({ state: 'unknown', why: 'the state root could not be listed', unreadableRuns: 0, unreadableCheckRecords: 0 });
    expect(readingDifference('/nowhere/run', 'kestrel', NOW, undefined)).toEqual({ state: 'unknown', why: 'this draft does not parse, so it has no reading ledger', unreadableRuns: 0, unreadableCheckRecords: 0 });
  });

  it('compares two ledgers with no page in common', () => {
    const compared = compareLedgers(ledgerOf([page('a.html', 1)]), ledgerOf([page('b.html', 2)]));
    expect(compared.pages.map((p) => [p.page, p.change])).toEqual([['b.html', 'added'], ['a.html', 'removed']]);
  });
});

// REQ-polaris-generation-034 version 2.5 (syzygy-3efd.30): a sequence or swimlane is a figure for the ledger as any diagram is, and a v7
// sequence's message takes RS-17 as an edge does.
describe('reading ledger: the figure kinds of schema v7', () => {
  const part = (id: string, file: string) => ({ id, label: 'P', epistemic: 'inferred', citations: cite(file) });
  const V7: Draft = {
    schemaVersion: 'polaris-dossier-local-draft-v7',
    introduction: { id: 'intro', label: 'non-normative', text: 'Kestrel is a small server.' },
    sections: [section('core', 'Core ideas', [block('k1', 'One two three four five')])],
    deepDives: [],
    diagrams: [
      { id: 'seq', title: 'S', home: { kind: 'section', target: 'core' }, kind: 'sequence', relationship: 'R', disposition: { kind: 'produced', assetIds: ['seq'] },
        participants: [part('pa', 'src/a.c'), part('pb', 'src/b.c')],
        // The third message shares a file with its receiver alone, which is enough.
        messages: [{ ...part('ma', 'src/a.c'), from: 'pa', to: 'pb' }, { ...part('mb', 'src/c.c'), from: 'pb', to: 'pa' }, { ...part('mc', 'src/b.c'), from: 'pa', to: 'pb' }] },
      { id: 'lane', title: 'L', home: { kind: 'section', target: 'core' }, kind: 'swimlane', relationship: 'R', disposition: { kind: 'produced', assetIds: ['lane'] },
        lanes: [part('la', 'src/a.c'), part('lb', 'src/b.c')], steps: [{ ...part('sa', 'src/a.c'), lane: 'la' }, { ...part('sb', 'src/c.c'), lane: 'lb' }] },
    ],
  };
  const NO_FIT: FigureFit = { textPx: 13, minTextPx: 11, viewports: [{ viewportPx: 1440, columnPx: 966 }, { viewportPx: 390, columnPx: 261 }], examined: 2, entries: [] };

  it('advises RS-17 on a message citing no file its sender or receiver cites, and on nothing in a swimlane', () => {
    expect(readerAdvice(V7).advisories.filter((a) => a.standard === 'RS-17').map((a) => a.at)).toEqual(['$.diagrams[0].messages[1]']);
    expect(readerAdvice({ ...V7, schemaVersion: 'polaris-dossier-local-draft-v6' }).advisories.filter((a) => a.standard === 'RS-17')).toEqual([]);
  });

  it('counts both figures on their section\'s page', () => {
    const ledger = readingLedger(V7, NO_FIT, readerAdvice(V7));
    expect(ledger.pages).toEqual([{ page: 'index.html', units: ['introduction', 'section:core'], proseWords: 10, readingMinutes: 1, figures: 2, advisories: { ...zero, 'RS-17': 1 }, figureFit: noFit }]);
  });
});
