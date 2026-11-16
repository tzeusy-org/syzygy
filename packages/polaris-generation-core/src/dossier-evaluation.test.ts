import { describe, expect, it } from 'vitest';

import {
  DossierEvaluationError, evaluateDossier, parseDossierManifest, parseReaderQuestions, readerCost, scanDossierPage,
  admittedSourcesDigest, scriptedAnswers, type ReaderAnswerPort, type ReaderPortFactory,
} from './dossier-evaluation.js';
import { generationAnchorId, generationSourcesForBody, gitBlobObjectId, type GenerationSource } from './generation-source.js';

// Synthetic dossier: a two-page "Kv" store. Every expected value below is a
// hand-counted literal or a byte count taken from the fixture text itself,
// never derived from the module under test.

const REVISION = 'a'.repeat(40);
function bodySource(sourceId: string, path: string, body: string): GenerationSource {
  const objectId = gitBlobObjectId(body);
  const end = Buffer.byteLength(body, 'utf8');
  return {
    sourceId, repositoryId: 'project:kv', revision: REVISION, path, objectId, evaluationId: 'eval-1',
    classificationBasis: 'body', exclusion: { excluded: false }, body,
    spans: [{ anchorId: generationAnchorId({ repositoryId: 'project:kv', revision: REVISION, path, objectId }, 0, end), start: 0, end, text: body }],
  };
}
// "Café " is 6 UTF-8 bytes, so the quoted sentence runs from byte 6 to 32.
const README = bodySource('readme', 'README.md', 'Café keeps every key in memory.\nWrites are appended to a log.');
const DURABILITY = bodySource('durability', 'docs/durability.md', 'Use "fsync" & <wait>.');
const SECRET_ID = `s-${'5'.repeat(24)}`;
const SECRET: GenerationSource = {
  sourceId: SECRET_ID, repositoryId: 'project:kv', revision: REVISION, path: 'config/secret.toml', objectId: null, evaluationId: 'eval-1',
  classificationBasis: 'path-only', exclusion: { excluded: true, reason: 'active-content' }, spans: [],
};
const SOURCES = [README, DURABILITY, SECRET];

const INDEX = [
  '<!doctype html><html lang="en"><head><title>Kv dossier title words</title><style>p{color:red}</style></head><body>',
  '<header data-reading-level="0"><h1>Kv store</h1><p data-claim-id="thesis" data-epistemic="observed">Kv keeps data in memory. <q data-quote-source="readme" data-quote-start="6" data-quote-end="32">keeps every key in memory.</q></p></header>',
  '<main><section id="ideas" data-topics="core-ideas" data-reading-level="0"><h2>Core ideas</h2><p data-claim-id="idea-1" data-epistemic="inferred">Memory first.</p>',
  '<details data-reading-level="1"><summary>More</summary><p data-claim-id="idea-2" data-epistemic="unknown">Durability is unclear.</p></details></section>',
  '<section id="trade" data-topics="trade-offs mechanisms"><p data-claim-id="trade-1" data-epistemic="observed">Speed costs durability. <q data-quote-source="durability" data-quote-start="0" data-quote-end="21">Use &quot;fsync&quot; &amp; &lt;wait&gt;.</q></p></section></main>',
  '<footer>Draft notice here</footer><script>var a = "not words at all";</script></body></html>',
].join('\n');
const DEEP = '<!doctype html><html><body><main data-reading-level="0"><section id="storage" data-topics="mechanisms"><h2>Storage</h2><p data-claim-id="storage-1" data-epistemic="observed">Pages are copied on write.</p></section></main></body></html>';
// The pages' UTF-8 lengths, and INDEX's through the close of its last level-0 element: the `ideas` section, closed
// right after its level-1 details.
const INDEX_BYTES = Buffer.byteLength(INDEX), DEEP_BYTES = Buffer.byteLength(DEEP);
const INDEX_FIRST_LEVEL_BYTES = Buffer.byteLength(INDEX.slice(0, INDEX.indexOf('</details></section>') + '</details></section>'.length));
const MANIFEST = JSON.stringify({ format: 'polaris-dossier-v1', title: 'Kv', entryPage: 'index.html', pages: [{ path: 'index.html', depth: 0 }, { path: 'deep-dives/storage.html', depth: 1 }] });
const QUESTIONS = JSON.stringify({
  format: 'polaris-reader-questions-v1',
  questions: [
    { id: 'q-ideas', topics: ['core-ideas'], text: 'What is the central idea?' },
    { id: 'q-trade', topics: ['trade-offs', 'mechanisms'], text: 'What does speed cost?' },
    { id: 'q-purpose', topics: [], text: 'Who is it for?' },
  ],
});

const bytes = (text: string): Uint8Array => new TextEncoder().encode(text);
const input = (overrides: { index?: string; deep?: string; sources?: readonly GenerationSource[] } = {}) => ({
  manifestText: MANIFEST,
  pages: new Map([['index.html', bytes(overrides.index ?? INDEX)], ['deep-dives/storage.html', bytes(overrides.deep ?? DEEP)]]),
  sources: overrides.sources ?? SOURCES,
  questionsText: QUESTIONS,
});
const signal = new AbortController().signal;

describe('dossier input format', () => {
  it('accepts the agreed manifest and refuses every malformed shape', () => {
    expect(parseDossierManifest(MANIFEST).pages).toEqual([{ path: 'index.html', depth: 0 }, { path: 'deep-dives/storage.html', depth: 1 }]);
    const refuse = (value: unknown) => expect(() => parseDossierManifest(JSON.stringify(value))).toThrow(DossierEvaluationError);
    const base = JSON.parse(MANIFEST);
    refuse({ ...base, format: 'polaris-dossier-v0' });
    refuse({ ...base, extra: true });
    refuse({ ...base, entryPage: 'deep-dives/storage.html' });
    refuse({ ...base, pages: [{ path: 'index.html', depth: 0 }, { path: 'other.html', depth: 0 }] });
    refuse({ ...base, pages: [{ path: 'index.html', depth: 0 }, { path: '../escape.html', depth: 1 }] });
    refuse({ ...base, pages: [{ path: 'index.html', depth: 0 }, { path: '/abs.html', depth: 1 }] });
    refuse({ ...base, pages: [{ path: 'index.html', depth: 0 }, { path: 'index.html', depth: 1 }] });
    refuse({ ...base, pages: [{ path: 'index.html', depth: 0 }, { path: 'a.html', depth: -1 }] });
    expect(() => parseDossierManifest('{"format":"polaris-dossier-v1","format":"x"}')).toThrow(DossierEvaluationError);
  });

  it('refuses reader questions with an unknown topic, a duplicate id or no text', () => {
    expect(parseReaderQuestions(QUESTIONS).map(q => q.id)).toEqual(['q-ideas', 'q-trade', 'q-purpose']);
    const refuse = (questions: unknown[]) => expect(() => parseReaderQuestions(JSON.stringify({ format: 'polaris-reader-questions-v1', questions }))).toThrow(DossierEvaluationError);
    refuse([{ id: 'a', topics: ['marketing'], text: 'x' }]);
    refuse([{ id: 'a', topics: [], text: 'x' }, { id: 'a', topics: [], text: 'y' }]);
    refuse([{ id: 'a', topics: [], text: '  ' }]);
    refuse([{ id: 'a', topics: ['trade-offs', 'trade-offs'], text: 'x' }]);
    refuse([]);
  });

  it('refuses a questions file that no longer hashes to its frozen digest', async () => {
    await expect(evaluateDossier({ ...input(), expectedQuestionsSha256: '0'.repeat(64) }, signal)).rejects.toThrow('questions-not-frozen');
  });

  it('refuses when a manifest page is missing from the supplied bytes', async () => {
    const partial = { ...input(), pages: new Map([['index.html', bytes(INDEX)]]) };
    await expect(evaluateDossier(partial, signal)).rejects.toThrow('missing-page');
  });
});

describe('(a) reader cost', () => {
  it('counts words by reading level from the page bytes, skipping title, script and style', () => {
    const scan = scanDossierPage(INDEX);
    // Level 0: "Kv store" 2 + "Kv keeps data in memory." 5 + quote 5 + "Core ideas" 2 + "Memory first." 2.
    // Level 1: "More" 1 + "Durability is unclear." 3. Unlabelled: trade section 3 + 4, footer 3.
    expect(scan.words).toEqual({ byLevel: { 0: 16, 1: 4 }, unlabelled: 10 });
    expect(scan.findings).toEqual([]);
  });

  it('measures bytes to the close of the last level-0 element and totals per page depth', () => {
    const scan = scanDossierPage(INDEX);
    expect(scan.bytes).toBe(INDEX_BYTES);
    expect(scan.bytesThroughFirstLevel).toBe(INDEX_FIRST_LEVEL_BYTES);
    const manifest = parseDossierManifest(MANIFEST);
    const cost = readerCost(manifest, new Map([['index.html', scan], ['deep-dives/storage.html', scanDossierPage(DEEP)]]));
    expect(cost.perPageDepth).toEqual([{ depth: 0, pages: 1, bytes: INDEX_BYTES, words: 30 }, { depth: 1, pages: 1, bytes: DEEP_BYTES, words: 6 }]);
    expect(cost.perReadingLevel).toEqual({ 0: 22, 1: 4 });
    expect(cost.totalBytes).toBe(INDEX_BYTES + DEEP_BYTES);
  });

  it('reports each budget bound as within, over, or Unknown when none is declared', () => {
    const manifest = parseDossierManifest(MANIFEST);
    const scanned = new Map([['index.html', scanDossierPage(INDEX)], ['deep-dives/storage.html', scanDossierPage(DEEP)]]);
    const none = readerCost(manifest, scanned);
    expect(none.firstReadingLevel.wordBudget).toEqual({ outcome: 'unknown', reason: 'no-budget-declared' });
    expect(none.totalBudget).toEqual({ outcome: 'unknown', reason: 'no-budget-declared' });
    const set = readerCost(manifest, scanned, { maxFirstLevelWords: 16, maxFirstLevelBytes: INDEX_FIRST_LEVEL_BYTES - 1, maxPageBytes: 1000, maxTotalBytes: 2000 });
    expect(set.firstReadingLevel.wordBudget).toEqual({ bound: 16, observed: 16, outcome: 'within' });
    expect(set.firstReadingLevel.byteBudget).toEqual({ bound: INDEX_FIRST_LEVEL_BYTES - 1, observed: INDEX_FIRST_LEVEL_BYTES, outcome: 'over' });
    expect(set.pages.map(page => page.pageBudget.outcome)).toEqual(['over', 'within']);
    expect(set.totalBudget).toEqual({ bound: 2000, observed: INDEX_BYTES + DEEP_BYTES, outcome: 'within' });
  });

  it('reports first-level words as null and its bounds as Unknown when the entry page marks no level 0', () => {
    const unmarked = INDEX.replaceAll('data-reading-level="0"', '');
    const manifest = parseDossierManifest(MANIFEST);
    const cost = readerCost(manifest, new Map([['index.html', scanDossierPage(unmarked)], ['deep-dives/storage.html', scanDossierPage(DEEP)]]), { maxFirstLevelWords: 100, maxFirstLevelBytes: 100 });
    expect(cost.firstReadingLevel.words).toBeNull();
    expect(cost.firstReadingLevel.bytesThroughFirstLevel).toBeNull();
    expect(cost.firstReadingLevel.wordBudget).toEqual({ outcome: 'unknown', reason: 'not-measurable' });
    expect(cost.firstReadingLevel.byteBudget).toEqual({ outcome: 'unknown', reason: 'not-measurable' });
  });
});

describe('(b) fidelity', () => {
  it('resolves every quote exactly, including multibyte offsets and decoded entities, and finds every claim labelled', async () => {
    const report = await evaluateDossier(input(), signal);
    expect(report.fidelity.quotes).toEqual({ denominator: 2, exact: 2, failures: [], outcome: 'all-resolved' });
    expect(report.fidelity.claims).toMatchObject({ denominator: 5, labelled: 5, byLabel: { observed: 3, inferred: 1, unknown: 1 }, unlabelled: [], duplicateClaimIds: [], outcome: 'all-labelled' });
    // thesis and trade-1 carry their own quotes; storage-1 is Observed with none.
    expect(report.fidelity.claims.observedWithoutQuote).toEqual([{ page: 'deep-dives/storage.html', claimId: 'storage-1' }]);
  });

  it.each([
    ['one changed character', INDEX.replace('keeps every key in memory.</q>', 'keeps every key in memory!</q>'), 'text-mismatch'],
    ['an added space', INDEX.replace('>keeps every key', '> keeps every key'), 'text-mismatch'],
    ['a range one byte short', INDEX.replace('data-quote-end="32"', 'data-quote-end="31"'), 'text-mismatch'],
    ['a range past the body', INDEX.replace('data-quote-end="21"', 'data-quote-end="22"'), 'out-of-range'],
    ['a start inside a multibyte character', INDEX.replace('data-quote-start="6" data-quote-end="32"', 'data-quote-start="4" data-quote-end="32"'), 'not-utf8-boundary'],
    ['an empty range', INDEX.replace('data-quote-end="32"', 'data-quote-end="6"'), 'invalid-offsets'],
    ['a non-numeric offset', INDEX.replace('data-quote-start="6"', 'data-quote-start="six"'), 'invalid-offsets'],
    ['an unadmitted source', INDEX.replace('data-quote-source="readme"', 'data-quote-source="unlisted"'), 'unknown-source'],
    ['an excluded source', INDEX.replace('data-quote-source="readme"', `data-quote-source="${SECRET_ID}"`), 'unquotable-source'],
  ])('fails a quote with %s', async (_, index, outcome) => {
    const report = await evaluateDossier(input({ index }), signal);
    expect(report.fidelity.quotes.outcome).toBe('failures');
    expect(report.fidelity.quotes.failures.map(failure => failure.outcome)).toEqual([outcome]);
  });

  it('fails a claim with no label, an out-of-vocabulary label, or a reused id', async () => {
    const missing = await evaluateDossier(input({ deep: DEEP.replace(' data-epistemic="observed"', '') }), signal);
    expect(missing.fidelity.claims.unlabelled).toEqual([{ page: 'deep-dives/storage.html', claimId: 'storage-1', label: 'missing-label' }]);
    expect(missing.fidelity.claims.outcome).toBe('failures');
    const invalid = await evaluateDossier(input({ deep: DEEP.replace('data-epistemic="observed"', 'data-epistemic="verified"') }), signal);
    expect(invalid.fidelity.claims.unlabelled.map(claim => claim.label)).toEqual(['invalid-label']);
    const reused = await evaluateDossier(input({ deep: DEEP.replace('data-claim-id="storage-1"', 'data-claim-id="thesis"') }), signal);
    expect(reused.fidelity.claims.duplicateClaimIds).toEqual(['thesis']);
    expect(reused.fidelity.claims.outcome).toBe('failures');
  });

  it('reports Unknown, not a pass, when the pages carry no quotes or no claims', async () => {
    const bare = '<html><body><main data-reading-level="0"><p>Nothing cited.</p></main></body></html>';
    const report = await evaluateDossier(input({ index: bare, deep: bare }), signal);
    expect(report.fidelity.quotes.outcome).toBe('unknown');
    expect(report.fidelity.claims.outcome).toBe('unknown');
  });
});

describe('(c) reader test scaffolding', () => {
  const answers = scriptedAnswers({
    'q-ideas': { kind: 'answered', text: 'Keep data in memory.', citations: [{ page: 'index.html', sectionId: 'ideas' }], attemptedPaths: ['index.html'] },
    'q-trade': { kind: 'answered', text: 'Durability.', citations: [{ page: 'index.html', sectionId: 'missing-section' }], attemptedPaths: ['index.html', 'nowhere.html'] },
  });

  it('gives each fresh reader only the question and the pages, and records answers ungraded', async () => {
    const seen: unknown[] = [];
    const instances = new Set<ReaderAnswerPort>();
    const recording: ReaderPortFactory = { kind: 'scripted', subjectSha256: answers.subjectSha256, create() {
      const inner = answers.create();
      const port: ReaderAnswerPort = { async answer(question, s) { expect(instances.has(port)).toBe(false); instances.add(port); seen.push(question); return inner.answer(question, s); } };
      return port;
    } };
    const report = await evaluateDossier({ ...input(), readers: recording }, signal);
    expect(instances.size).toBe(3);
    expect(seen).toHaveLength(3);
    for (const call of seen as { question: object; pages: { path: string; html: string }[] }[]) {
      expect(Object.keys(call).sort()).toEqual(['pages', 'question']);
      expect(Object.keys(call.question).sort()).toEqual(['id', 'text']);
      expect(call.pages.map(page => page.path)).toEqual(['index.html', 'deep-dives/storage.html']);
      expect(call.pages[0]!.html).toBe(INDEX);
    }
    expect(report.readerTest.run).toBe(true);
    const results = report.readerTest.run ? report.readerTest.results : [];
    expect(results.map(result => [result.questionId, result.kind, result.readerPort, result.accuracy])).toEqual([
      ['q-ideas', 'answered', 'scripted', 'not-evaluated'], ['q-trade', 'answered', 'scripted', 'not-evaluated'], ['q-purpose', 'cannot-answer', 'scripted', 'not-evaluated'],
    ]);
    expect(results[1]!.citations).toEqual([{ page: 'index.html', sectionId: 'missing-section', resolves: false }]);
    expect(results[1]!.attemptedPaths).toEqual([{ path: 'index.html', known: true }, { path: 'nowhere.html', known: false }]);
    expect(report.providerCallPerformed).toBe(false);
  });

  it('does not run without an answer port, and refuses a malformed answer', async () => {
    const report = await evaluateDossier(input(), signal);
    expect(report.readerTest).toEqual({ run: false, reason: 'no answer port supplied' });
    const malformed: ReaderPortFactory = { kind: 'scripted', subjectSha256: '0'.repeat(64), create: () => ({ async answer() { return { kind: 'answered', text: 'x', citations: [{ page: 'index.html' }], attemptedPaths: [] } as never; } }) };
    await expect(evaluateDossier({ ...input(), readers: malformed }, signal)).rejects.toThrow('invalid-answer');
  });

  it('stops before the next question once aborted', async () => {
    const controller = new AbortController();
    let calls = 0;
    const aborting: ReaderPortFactory = { kind: 'scripted', subjectSha256: '0'.repeat(64), create: () => ({ async answer() { calls++; controller.abort(); return { kind: 'cannot-answer', reason: 'x', attemptedPaths: [] }; } }) };
    await expect(evaluateDossier({ ...input(), readers: aborting }, controller.signal)).rejects.toThrow();
    expect(calls).toBe(1);
  });
});

describe('(d) coverage per owner topic', () => {
  it('separates scripted-answer-cited topics from page-declared ones and leaves the rest Unknown', async () => {
    const answers = scriptedAnswers({
      'q-ideas': { kind: 'answered', text: 'Memory.', citations: [{ page: 'index.html', sectionId: 'ideas' }], attemptedPaths: ['index.html'] },
      'q-trade': { kind: 'answered', text: 'Durability.', citations: [{ page: 'index.html', sectionId: 'missing-section' }], attemptedPaths: ['index.html'] },
    });
    const report = await evaluateDossier({ ...input(), readers: answers }, signal);
    expect(report.coverage.map(row => [row.topic, row.status])).toEqual([
      ['core-ideas', 'scripted-answer-cited'],
      ['end-to-end-workflows', 'unknown'],
      ['mechanisms', 'declared-only'],
      ['maintainer-stated-advantages', 'unknown'],
      ['trade-offs', 'declared-only'],
    ]);
    expect(report.coverage[2]!.declaredBy).toEqual([{ page: 'index.html', sectionId: 'trade' }, { page: 'deep-dives/storage.html', sectionId: 'storage' }]);
    expect(report.coverage[0]).toMatchObject({ readerPort: 'scripted', accuracy: 'not-evaluated', answerCitations: [{ questionId: 'q-ideas', page: 'index.html', sectionId: 'ideas' }] });
    expect(report.coverage[2]).not.toHaveProperty('readerPort');
  });

  it('never upgrades a declaration to answer-cited without a reader run', async () => {
    const report = await evaluateDossier(input(), signal);
    expect(report.coverage.filter(row => row.status === 'scripted-answer-cited')).toEqual([]);
  });
});

describe('blob-absolute quote offsets', () => {
  const withQuotes = (markup: string): string => INDEX.replace('</main>', `<section id="extra">${markup}</section></main>`);
  const report = (markup: string, extra: readonly GenerationSource[]) => evaluateDossier(input({ index: withQuotes(markup), sources: [...SOURCES, ...extra] }), signal);
  const outcomes = async (markup: string, extra: readonly GenerationSource[]) =>
    (await report(markup, extra)).fidelity.quotes.failures.map(failure => failure.outcome);

  // 2,400 numbered lines of 50 characters: 120,000 characters, so the blob
  // splits into two pieces at a line break.
  const line = (n: number): string => `line ${String(n).padStart(5, '0')} ${'x'.repeat(38)}\n`;
  const BIG = Array.from({ length: 2400 }, (_, n) => line(n)).join('');
  const pieces = generationSourcesForBody({ sourceId: 'big', repositoryId: 'project:kv', revision: REVISION, path: 'src/big.txt', objectId: gitBlobObjectId(BIG), evaluationId: 'eval-1', body: BIG });
  const second = pieces[1]!;
  const boundary = second.segment!.start;

  it('splits the fixture into two pieces, the second starting mid-blob', () => {
    expect(pieces.map(piece => piece.sourceId)).toEqual(['big-p1', 'big-p2']);
    expect(boundary).toBeGreaterThan(0);
  });

  it('resolves a quote in a later piece by its blob offsets and refuses its piece-relative offsets', async () => {
    const text = line(2300);
    const start = BIG.indexOf(text);
    expect(start).toBeGreaterThan(boundary);
    const absolute = `<q data-quote-source="big-p2" data-quote-start="${start}" data-quote-end="${start + text.length}">${text}</q>`;
    expect((await report(absolute, pieces)).fidelity.quotes).toMatchObject({ denominator: 3, exact: 3, outcome: 'all-resolved' });
    const relative = `<q data-quote-source="big-p2" data-quote-start="${start - boundary}" data-quote-end="${start - boundary + text.length}">${text}</q>`;
    expect(await outcomes(relative, pieces)).toEqual(['out-of-range']);
  });

  it('refuses a quote that crosses a piece boundary, whichever piece it names', async () => {
    const start = boundary - 10;
    const text = BIG.slice(start, boundary + 10);
    for (const piece of ['big-p1', 'big-p2']) {
      expect(await outcomes(`<q data-quote-source="${piece}" data-quote-start="${start}" data-quote-end="${boundary + 10}">${text}</q>`, pieces)).toEqual(['crosses-piece-boundary']);
    }
  });

  it('resolves a 4-byte emoji only on its code-point boundaries', async () => {
    // "Grow " is 5 bytes; U+1F331 occupies bytes 5-9.
    const emoji = bodySource('emoji', 'docs/emoji.md', 'Grow \u{1F331} slowly.');
    expect(await outcomes('<q data-quote-source="emoji" data-quote-start="5" data-quote-end="9">\u{1F331}</q>', [emoji])).toEqual([]);
    for (const [start, end] of [[6, 9], [5, 8], [7, 9]]) {
      expect(await outcomes(`<q data-quote-source="emoji" data-quote-start="${start}" data-quote-end="${end}">\u{1F331}</q>`, [emoji])).toEqual(['not-utf8-boundary']);
    }
  });

  it('reads a CRLF quote as a browser would: a raw CR is normalized away, a character reference survives', async () => {
    const crlf = bodySource('crlf', 'docs/crlf.txt', 'one\r\ntwo');
    expect(await outcomes('<q data-quote-source="crlf" data-quote-start="0" data-quote-end="8">one\r\ntwo</q>', [crlf])).toEqual(['text-mismatch']);
    expect(await outcomes('<q data-quote-source="crlf" data-quote-start="0" data-quote-end="8">one&#13;\ntwo</q>', [crlf])).toEqual([]);
  });
});

describe('report subject (rule 11)', () => {
  it('binds the admitted sources by a canonical digest that ignores order and follows the bytes', async () => {
    const base = (await evaluateDossier(input(), signal)).subject;
    const reordered = (await evaluateDossier(input({ sources: [...SOURCES].reverse() }), signal)).subject;
    expect(reordered.sources).toEqual(base.sources);
    expect(base.sources.count).toBe(3);
    const changed = bodySource('durability', 'docs/durability.md', 'Use "fsync" & <wait>!');
    const other = (await evaluateDossier(input({ index: INDEX.replace('&lt;wait&gt;.', '&lt;wait&gt;!'), sources: [README, changed, SECRET] }), signal)).subject;
    expect(other.sources.sha256).not.toBe(base.sources.sha256);
    // The body is bound by its own hash, not through the declared object id alone.
    const sameIdentity = admittedSourcesDigest([README, { ...changed, objectId: DURABILITY.objectId }, SECRET]);
    expect(sameIdentity.sha256).not.toBe(base.sources.sha256);
  });

  // Expected value: SHA-256 of the QUESTIONS text above, taken with hashlib and agreeing with `sha256sum` over the same bytes
  // (docs/evidence/syzygy-bpyt-6-13/derive-literals.py), never read back from the module (review R-GP-IMPL-SUPPORT-LEAF-1 N2).
  it('binds the questions file by the SHA-256 of its own text, and takes that digest as the freeze', async () => {
    const questionsSha256 = '84d2e0366720f81cad6963e2c7777701dfa0bf37835a812b9ea0b768af675eeb';
    expect((await evaluateDossier(input(), signal)).subject.questionsSha256).toBe(questionsSha256);
    expect((await evaluateDossier({ ...input(), expectedQuestionsSha256: questionsSha256 }, signal)).subject.questionsSha256).toBe(questionsSha256);
  });

  it('binds the budget and the scripted answers, and records neither when absent', async () => {
    const none = (await evaluateDossier(input(), signal)).subject;
    expect(none.budgetSha256).toBeNull();
    expect(none.readers).toBeNull();
    const a = scriptedAnswers({ 'q-ideas': { kind: 'cannot-answer', reason: 'a', attemptedPaths: [] } });
    const b = scriptedAnswers({ 'q-ideas': { kind: 'cannot-answer', reason: 'b', attemptedPaths: [] } });
    const withA = (await evaluateDossier({ ...input(), budget: { maxTotalBytes: 10 }, readers: a }, signal)).subject;
    const withB = (await evaluateDossier({ ...input(), budget: { maxTotalBytes: 11 }, readers: b }, signal)).subject;
    expect(withA.readers).toEqual({ kind: 'scripted', subjectSha256: a.subjectSha256 });
    expect(withA.readers!.subjectSha256).not.toBe(withB.readers!.subjectSha256);
    expect(withA.budgetSha256).toMatch(/^[0-9a-f]{64}$/u);
    expect(withA.budgetSha256).not.toBe(withB.budgetSha256);
  });
  it('scans each claim\'s reader-visible text and the sources its anchors name, entities decoded, and no others', () => {
    const html = '<main><p data-claim-id="c1" data-epistemic="inferred">He said &quot;a &amp; b&quot; <span class="marking">[Inferred]</span> <span class="sources"><a href="x" aria-label="Read source src-a">[src-a]</a> <a href="y" aria-label="Read source src-b">[src-b]</a></span></p>'
      + '<p data-claim-id="c2" data-epistemic="unknown">No links here. <a href="z" aria-label="Open the glossary">[g]</a></p><p>outside <a aria-label="Read source src-c">[c]</a></p></main>';
    const scan = scanDossierPage(html);
    expect(scan.claims).toEqual([
      { id: 'c1', epistemic: 'inferred', hasQuote: false, text: 'He said "a & b" [Inferred] [src-a] [src-b]', citedSourceIds: ['src-a', 'src-b'] },
      { id: 'c2', epistemic: 'unknown', hasQuote: false, text: 'No links here. [g]', citedSourceIds: [] },
    ]);
  });
  it('reads a numbered citation\'s source from data-source-id, before any Read source label (R-MEA10-RENDER-READABILITY-9070-1 P6)', () => {
    const html = '<main><p data-claim-id="c1" data-epistemic="inferred">A claim. <a class="cite" href="x" data-source-id="src-a" aria-label="Source 1: README.md">[1]</a>'
      + ' <a class="cite" href="y" data-source-id="src-b" aria-label="Read source src-z">[2]</a> <a href="z" aria-label="Read source src-c">[src-c]</a></p></main>';
    expect(scanDossierPage(html).claims).toEqual([
      { id: 'c1', epistemic: 'inferred', hasQuote: false, text: 'A claim. [1] [2] [src-c]', citedSourceIds: ['src-a', 'src-b', 'src-c'] },
    ]);
  });
});
