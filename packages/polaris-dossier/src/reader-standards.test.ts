import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { designCriteria } from './design-review.js';
import { DEEP_DIVE_LIMIT, SECTION_WORD_LIMIT, codeSymbolInTitle, readerAdvice } from './reader-advice.js';
import { READER_STANDARDS, READER_STANDARDS_SHA256, READER_STANDARDS_VERSION, readerStandardsSection } from './reader-standards.js';

/** The reader standards (syzygy-pdja.17): the bytes the skill ships equal the bytes the brief and the design packet carry, the version
 * moves with them, and the counted standards' advice fires on each case it names and on nothing else. */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const COPIES = ['.claude/skills/polaris-dossier/references/reader-standards.md', '.codex/skills/polaris-dossier/references/reader-standards.md'];
const sha = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');

describe('reader standards: one text', () => {
  it.each(COPIES.map((copy) => [copy]))('%s holds exactly the bytes the brief and the packet carry', (copy) => {
    expect(fs.readFileSync(path.join(ROOT, copy), 'utf8')).toBe(READER_STANDARDS);
  });

  it('names its version in its own text, digests to the recorded value and numbers RS-1 to RS-25 once each, in order', () => {
    expect(READER_STANDARDS_VERSION).toBe('polaris-reader-standards-v1');
    expect(READER_STANDARDS.split('\n')[2]).toBe('Version: `polaris-reader-standards-v1`');
    expect(READER_STANDARDS_SHA256).toBe(sha(READER_STANDARDS));
    expect(READER_STANDARDS.endsWith('\n') && !READER_STANDARDS.endsWith('\n\n')).toBe(true);
    expect([...READER_STANDARDS.matchAll(/\*\*RS-(\d+) /gu)].map((match) => Number(match[1]))).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
    expect([...READER_STANDARDS].every((ch) => ch.charCodeAt(0) < 0x80)).toBe(true);
  });

  it('nests under one heading naming the version and digest when carried in a larger text', () => {
    const section = readerStandardsSection();
    expect(section.split('\n').slice(0, 3)).toEqual([`## Polaris dossier reader standards (\`polaris-reader-standards-v1\`; sha256 of \`references/reader-standards.md\`: \`${sha(READER_STANDARDS)}\`)`, '', 'A good Polaris dossier lets someone open one place and understand what a']);
    expect(section.split('\n').filter((line) => /^#{1,2} /u.test(line))).toHaveLength(1);
    expect(section.split('\n').filter((line) => line.startsWith('### '))).toHaveLength(9);
    expect(section).not.toContain('Version: ');
  });

  it('is carried, with its version and digest, in the design review\'s criteria', () => {
    const criteria = designCriteria('/r', 'an operator');
    expect(criteria).toContain(READER_STANDARDS);
    const lead = criteria[criteria.indexOf(READER_STANDARDS) - 1]!;
    expect(lead).toContain(`(polaris-reader-standards-v1, sha256 ${sha(READER_STANDARDS)})`);
    expect(lead).toContain('whose message begins with the standard\'s identifier (RS-1 to RS-25)');
  });
});

const section = (id: string, words: number, title = 'How a write reaches the replicas') =>
  ({ id, title, paragraphs: [{ text: Array.from({ length: words }, () => 'w').join(' '), children: [] }] });
const diagram = (sectionId: string) => ({ id: `d-${sectionId}`, sectionId });

describe('reader advice: the counted standards', () => {
  it('gives no advice on a draft that meets every counted standard, and none on a draft that is not an object', () => {
    const doc = { sections: [section('a', 300)], deepDives: [{ ...section('dd', 10), sectionId: 'a' }], diagrams: [diagram('a')] };
    expect(readerAdvice(doc)).toEqual({ standards: 'polaris-reader-standards-v1', note: expect.stringContaining('sets no outcome'), advisories: [] });
    expect(readerAdvice('x').advisories).toEqual([]);
    expect([DEEP_DIVE_LIMIT, SECTION_WORD_LIMIT]).toEqual([3, 300]);
  });

  it('RS-19: counts a block and its children past 300 words, in sections and deep dives, and never an element\'s words', () => {
    const doc = {
      sections: [{ id: 'a', title: 'Why', paragraphs: [{ text: Array.from({ length: 200 }, () => 'w').join(' '), children: [{ text: Array.from({ length: 101 }, () => 'w').join('  \n ') }] }] }],
      deepDives: [{ ...section('dd', 301), sectionId: 'a' }, { id: 'e', title: 'Options', sectionId: 'a', paragraphs: [
        { kind: 'table', rows: [{ cells: [{ text: Array.from({ length: 400 }, () => 'w').join(' ') }] }] },
        { kind: 'callout', tone: 'note', title: 'Mind this', text: 'w', children: [{ text: Array.from({ length: 400 }, () => 'w').join(' ') }] },
      ] }],
      diagrams: [diagram('a')],
    };
    expect(readerAdvice(doc).advisories).toEqual([
      { standard: 'RS-19', at: '$.sections[0].paragraphs', detail: expect.stringMatching(/^301 words of its own prose, past about 300:/u) },
      { standard: 'RS-19', at: '$.deepDives[0].paragraphs', detail: expect.stringMatching(/^301 words/u) },
    ]);
  });

  it('RS-19: counts a v8 section\'s subsection answers and paragraphs as its own prose, and an earlier draft\'s subsections never (version 2.16)', () => {
    const w = (n: number) => Array.from({ length: n }, () => 'w').join(' ');
    const sub = (answer: number, paragraph: number) => ({ id: 'q', title: 'Q', answer: { text: w(answer) }, paragraphs: [{ text: w(paragraph), children: [{ text: 'w' }] }, { kind: 'table', rows: [] }] });
    const doc = (schemaVersion: string) => ({ schemaVersion, sections: [{ ...section('a', 100), subsections: [sub(50, 49), sub(50, 50)] }],
      deepDives: [{ ...section('dd', 10), sectionId: 'a', subsections: [sub(400, 0), sub(0, 0)] }], diagrams: [diagram('a')] });
    expect(readerAdvice(doc('polaris-dossier-local-draft-v8')).advisories).toEqual([
      { standard: 'RS-19', at: '$.sections[0].paragraphs', detail: expect.stringMatching(/^301 words of its own prose, past about 300:/u) },
    ]);
    for (const version of ['polaris-dossier-local-draft-v7', 'polaris-dossier-local-draft-v2', undefined]) expect(readerAdvice(doc(version as string)).advisories, String(version)).toEqual([]);
  });

  it('RS-17: reads a sequence\'s messages in a v8 draft as in a v7 one, and never in an earlier draft (version 2.16)', () => {
    const at = (file: string) => [{ path: file }];
    const doc = (schemaVersion: string) => ({ schemaVersion, sections: [section('a', 5)], deepDives: [], diagrams: [{ id: 'seq-1', home: { kind: 'section', target: 'a' }, kind: 'sequence',
      participants: [{ id: 'pt1', citations: at('src/a.c') }, { id: 'pt2', citations: at('src/a.c') }], messages: [{ id: 'msg1', from: 'pt1', to: 'pt2', citations: at('src/b.c') }] }] });
    const rs17 = (version: string) => readerAdvice(doc(version)).advisories.filter((a) => a.standard === 'RS-17').map((a) => a.at);
    expect(rs17('polaris-dossier-local-draft-v8')).toEqual(['$.diagrams[0].messages[0]']);
    expect(rs17('polaris-dossier-local-draft-v7')).toEqual(['$.diagrams[0].messages[0]']);
    expect(rs17('polaris-dossier-local-draft-v6')).toEqual([]);
  });

  it('RS-14: more than three deep dives, at the list', () => {
    const dives = (n: number) => Array.from({ length: n }, (_, i) => ({ ...section(`d${i}`, 5), sectionId: 'a' }));
    expect(readerAdvice({ sections: [section('a', 5)], diagrams: [diagram('a')], deepDives: dives(3) }).advisories).toEqual([]);
    expect(readerAdvice({ sections: [section('a', 5)], diagrams: [diagram('a')], deepDives: dives(4) }).advisories).toEqual([
      { standard: 'RS-14', at: '$.deepDives', detail: expect.stringMatching(/^4 deep dives, past 3:/u) },
    ]);
  });

  it('RS-16: a section no diagram is drawn for, and never a deep dive', () => {
    const doc = { sections: [section('a', 5), section('b', 5)], deepDives: [{ ...section('dd', 5), sectionId: 'b' }], diagrams: [diagram('a'), { id: 'x', sectionId: 'dd' }] };
    expect(readerAdvice(doc).advisories).toEqual([{ standard: 'RS-16', at: '$.sections[1]', detail: expect.stringContaining('"b"') }]);
  });

  // syzygy-3efd.18: a v5 diagram draws the section its `home` names; one homed on the overview or a deep dive draws no section.
  it('RS-16 with v5 homes: a section-home draws its section, an overview or deep-dive home draws none', () => {
    const doc = { sections: [section('a', 5), section('b', 5), section('c', 5)], deepDives: [{ ...section('dd', 5), sectionId: 'c' }],
      diagrams: [{ id: 'x', home: { kind: 'section', target: 'a' } }, { id: 'y', home: { kind: 'overview' } }, { id: 'z', home: { kind: 'deep-dive', target: 'dd' } }] };
    expect(readerAdvice(doc).advisories.map(({ standard, at }) => ({ standard, at }))).toEqual([{ standard: 'RS-16', at: '$.sections[1]' }, { standard: 'RS-16', at: '$.sections[2]' }]);
  });

  // syzygy-3efd.17: an edge whose cited files touch neither endpoint's.
  it('RS-17 locality: an edge citing no file either endpoint cites, and never one that shares a file with an end', () => {
    const cite = (path: string, line = 1) => ({ id: `c-${path}-${line}`, path, startLine: line, endLine: line });
    const node = (id: string, ...paths: string[]) => ({ id, label: id, epistemic: 'inferred', citations: paths.map((p) => cite(p)) });
    const edge = (id: string, from: string, to: string, ...paths: string[]) => ({ id, from, to, label: id, epistemic: 'inferred', citations: paths.map((p) => cite(p, 9)) });
    const doc = { sections: [section('a', 5)], diagrams: [{ id: 'd', sectionId: 'a',
      nodes: [node('client', 'src/client.c'), node('server', 'src/server.c'), node('aof', 'src/aof.c', 'src/server.c')],
      edges: [
        edge('far', 'client', 'server', 'src/networking.c'),
        edge('to-end', 'client', 'server', 'src/server.c'),
        edge('from-end', 'client', 'aof', 'src/client.c', 'src/networking.c'),
        edge('shared-file-other-lines', 'server', 'aof', 'src/aof.c'),
        // Touches an end only through that end's second cited file.
        edge('second-file', 'client', 'aof', 'src/server.c'),
        edge('dangling', 'client', 'nowhere', 'src/elsewhere.c'),
      ] }] };
    expect(readerAdvice(doc).advisories).toEqual([{
      standard: 'RS-17', at: '$.diagrams[0].edges[0]',
      detail: 'the edge "far" cites no file that its node "client" or its node "server" cites: cite where the source shows these two connect, or check that the edge joins the right nodes (polaris-reader-standards-v1 does not yet mark RS-17 counted; this is its locality alone)',
    }]);
  });

  it('RS-13: a title naming a code symbol, in a section or a deep dive', () => {
    const doc = { sections: [section('a', 5, 'Inside handleRequest')], deepDives: [{ ...section('dd', 5, 'The aof.c rewrite'), sectionId: 'a' }], diagrams: [diagram('a')] };
    expect(readerAdvice(doc).advisories).toEqual([
      { standard: 'RS-13', at: '$.sections[0].title', detail: expect.stringContaining('camelCase') },
      { standard: 'RS-13', at: '$.deepDives[0].title', detail: expect.stringContaining('names a file') },
    ]);
  });

  it.each([
    ['How `run()` starts', 'it holds a code span'], ['What dispatch() hands on', 'it names a call'],
    ['Inside src/server/networking', 'it names a path'], ['What src/ holds', 'it names a path'], ['The /etc/redis tree', 'it names a path'],
    ['Running ./configure first', 'it names a path'],
    ['The config.toml keys', 'it names a file'], ['Inside App.tsx', 'it names a file'], ['The loader.js hook', 'it names a file'],
    ['Where Node.js reads server.js', 'it names a file'],
    ['Inside processCommand', 'it holds a camelCase identifier'], ['What toString returns', 'it holds a camelCase identifier'],
    ['The RedisModuleCtx hooks', 'it holds a PascalCase identifier'], ['What max_clients limits', 'it holds a snake_case identifier'],
    ['Where MAX_CLIENTS applies', 'it holds a snake_case identifier'],
  ])('flags %j: %s', (title, why) => { expect(codeSymbolInTitle(title)).toBe(why); });

  it.each(['How a write reaches the replicas', 'Why the project exists', 'Trade-offs (and their costs)', 'Persistence: snapshots and the log', 'Version 7.2 and later'])(
    'leaves %j alone', (title) => { expect(codeSymbolInTitle(title)).toBeUndefined(); });

  // R-PDJA-17-STANDARDS-1 note 2: the reviewer's proper names and prose pairs, each a title the advice once flagged.
  it.each([
    'Node.js and Deno', 'Next.js rendering', 'Why PostgreSQL', 'GitHub Actions', 'The iPhone client', 'gRPC transport', 'Read/write paths',
    'I/O scheduling', 'TCP/IP', 'Builds for macOS', 'Why JavaScript',
  ])('leaves the proper name or prose pair in %j alone', (title) => { expect(codeSymbolInTitle(title)).toBeUndefined(); });

  // syzygy-pdja.25 (R-PDJA-P3-NOTES-1 finding 1): the four classes of real code symbols the pdja.18 narrowing stopped flagging, each
  // flagged again where a named list tells it from a product name or a prose pair, and the names each list keeps unflagged.
  it.each([
    ['Inside RedisModule', 'it holds a PascalCase identifier'], ['How HttpServer accepts', 'it holds a PascalCase identifier'],
    ['The EventLoop', 'it holds a PascalCase identifier'], ['What ClientState holds', 'it holds a PascalCase identifier'],
    ['A ByteBuffer grows', 'it holds a PascalCase identifier'], ['Where GitHub calls WebhookHandler', 'it holds a PascalCase identifier'],
  ])('flags the two-part PascalCase type in %j: %s', (title, why) => { expect(codeSymbolInTitle(title)).toBe(why); });
  it.each(['GitHub Actions', 'Why JavaScript', 'TypeScript types', 'The YouTube embed', 'Builds on GitLab', 'WebSocket transport', 'What McCarthy proposed', 'Why PostgreSQL'])(
    'leaves the listed product or surname in %j alone', (title) => { expect(codeSymbolInTitle(title)).toBeUndefined(); });

  it.each([['Inside src/server', 'it names a path'], ['How net/http serves', 'it names a path'], ['What lib/utils offers', 'it names a path']])(
    'flags the single-slash source path in %j: %s', (title, why) => { expect(codeSymbolInTitle(title)).toBe(why); });
  it.each(['Read/write paths', 'I/O scheduling', 'TCP/IP', 'The client/server split', 'Input/output and/or errors', 'Running on OS/2'])(
    'leaves the prose pair in %j alone', (title) => { expect(codeSymbolInTitle(title)).toBeUndefined(); });

  it.each([['Inside App.js', 'it names a file'], ['What Server.js starts', 'it names a file'], ['The Index.js entry', 'it names a file'], ['The UserList.js view', 'it names a file']])(
    'flags the capitalised .js file in %j: %s', (title, why) => { expect(codeSymbolInTitle(title)).toBe(why); });
  it.each(['Node.js and Deno', 'Next.js rendering', 'Charts with d3.js', 'Scenes in three.js', 'Vue.js components'])(
    'leaves the JavaScript project name in %j alone', (title) => { expect(codeSymbolInTitle(title)).toBeUndefined(); });

  it.each([
    ['What parseURL accepts', 'it holds a camelCase identifier'], ['Why toJSON exists', 'it holds a camelCase identifier'],
    ['Where getID reads', 'it holds a camelCase identifier'], ['Setting innerHTML', 'it holds a camelCase identifier'],
  ])('flags the camelCase identifier ending in an initialism in %j: %s', (title, why) => { expect(codeSymbolInTitle(title)).toBe(why); });
  it.each(['Builds for macOS', 'Running on tvOS and watchOS', 'Packages for openSUSE', 'The iOS client', 'gRPC transport'])(
    'leaves the product name in %j alone', (title) => { expect(codeSymbolInTitle(title)).toBeUndefined(); });
});

// Version 2.26 (syzygy-5dhm.41): the worth-knowing count advice, on a schema-v13 draft only. Literals from the specification.
describe('reader advice: the worth-knowing count (version 2.26)', () => {
  const V13 = 'polaris-dossier-local-draft-v13';
  const block = (id: string, worthKnowing?: boolean) => ({ id, label: 'inferred', text: 'w', ...(worthKnowing === undefined ? {} : { worthKnowing }) });
  const sec = (id: string, marks: number, plain = 1) => ({ id, title: id, paragraphs: [...Array.from({ length: marks }, (_, k) => block(`${id}-m${k}`, true)), ...Array.from({ length: plain }, (_, k) => block(`${id}-p${k}`, false))] });
  const NONE = (name: string) => `${name} marks no block worth knowing: mark one to 3 cited facts a newcomer would not guess from the kind of project this is, or, where none meets that test, say why in its \`worthKnowingNone\``;
  const doc = (sections: unknown[], poles?: unknown[], schemaVersion = V13) => ({ schemaVersion, sections, deepDives: [], diagrams: [], ...(poles === undefined ? {} : { poles, whySection: 'a' }) });

  it('advises a Pole that marks none without a reason, and one that marks more than three, at the Pole', () => {
    const advice = readerAdvice(doc([sec('a', 0), sec('b', 2), sec('c', 2), sec('d', 0), sec('e', 3)], [
      { label: 'Why', sections: ['a'] }, { label: 'Core', sections: ['b', 'c'] }, { label: 'Quiet', sections: ['d'], worthKnowingNone: 'Nothing here.' }, { label: 'Edge', sections: ['e'] }]));
    expect(advice.worthKnowing).toEqual([
      { at: '$.poles[0]', marked: 0, detail: NONE('the Pole "Why"') },
      { at: '$.poles[1]', marked: 4, detail: 'the Pole "Core" marks 4 blocks worth knowing, past 3: keep the ones a newcomer would least guess and drop the mark from the rest' },
    ]);
    expect(advice.advisories).toEqual(readerAdvice(doc([sec('a', 0), sec('b', 2), sec('c', 2), sec('d', 0), sec('e', 3)], undefined, 'polaris-dossier-local-draft-v10')).advisories);
  });

  it('counts a draft with no Poles as one, a mark only when true and only on a section\'s own paragraph, and a section once', () => {
    const nested = { id: 'n', title: 'n', paragraphs: [{ ...block('n1'), children: [block('n1a', true)] }, { kind: 'callout', id: 'k', children: [block('k1', true)] }] };
    // A draft with no Poles has nowhere to give a reason, so its advice names none.
    expect(readerAdvice(doc([sec('a', 0), nested])).worthKnowing).toEqual([{ at: '$.sections', marked: 0, detail: 'the draft marks no block worth knowing: mark one to 3 cited facts a newcomer would not guess from the kind of project this is, where any meets that test; a draft with no Poles has no place to say why none does, so this advice stands until one is marked' }]);
    expect(readerAdvice(doc([sec('a', 3)])).worthKnowing).toEqual([]);
    expect(readerAdvice(doc([sec('a', 4)])).worthKnowing).toEqual([{ at: '$.sections', marked: 4, detail: 'the draft marks 4 blocks worth knowing, past 3: keep the ones a newcomer would least guess and drop the mark from the rest' }]);
    expect(readerAdvice(doc([sec('a', 2), sec('b', 0)], [{ label: 'One', sections: ['a', 'b'] }, { label: 'Two', sections: ['a'] }])).worthKnowing)
      .toEqual([{ at: '$.poles[1]', marked: 0, detail: NONE('the Pole "Two"') }]);
  });

  it('gives an earlier draft no worth-knowing member at all, so its advice keeps its bytes', () => {
    for (const version of ['polaris-dossier-local-draft-v12', 'polaris-dossier-local-draft-v11', 'polaris-dossier-local-draft-v10', 'polaris-dossier-local-draft-v8', 'polaris-dossier-local-draft-v2']) {
      expect(Object.keys(readerAdvice(doc([sec('a', 0)], undefined, version))), version).toEqual(['standards', 'note', 'advisories']);
    }
  });
});

// Version 2.33 (syzygy-5dhm.43): the choice floor, on a schema-v13 draft only. Literals from the specification.
describe('reader advice: the choice floor (version 2.33)', () => {
  const V13 = 'polaris-dossier-local-draft-v13';
  const cite = (path: string) => ({ id: `c-${path}`, path, startLine: 1, endLine: 1 });
  const claim = (id: string, path: string) => ({ id, label: 'inferred', text: 'w', citations: [cite(path)] });
  const sec = (id: string, path: string) => ({ id, title: id, paragraphs: [claim(`${id}-p`, path)] });
  const item = (id: string, path: string, label = 'inferred') => (label === 'inferred'
    ? { id, label, statement: 's', scope: 'here', citations: [cite(path)] } : { id, label, reason: 'not-found', statement: 's', scope: 'here', citations: [] });
  const doc = (choices: unknown[], tradeOffs: unknown[], poles?: unknown[], schemaVersion = V13) => ({
    schemaVersion, deepDives: [], diagrams: [], understanding: { choices, tradeOffs },
    sections: [sec('a', 'src/a.c'), sec('b', 'src/b.c'), { id: 'c', title: 'c', paragraphs: [{ kind: 'code', id: 'x', citation: cite('src/c.c') }] }],
    ...(poles === undefined ? {} : { poles, whySection: 'a' }) });
  const POLES = [{ label: 'Core', sections: ['a'] }, { label: 'Edge', sections: ['b', 'c'] }];
  const TWO = 'the Pole "Core" has 2 choices or trade-offs on record, fewer than 3: where its source shows a decision this part makes, the alternative it passes over or what it costs, record each as a cited Inferred item of the understanding record\'s `choices` or `tradeOffs` citing a file its sections cite; never record one its source does not show';

  it('advises a Pole with two choices or trade-offs on record and not one with three', () => {
    const advice = readerAdvice(doc([item('ch1', 'src/a.c'), item('ch2', 'src/b.c')], [item('t1', 'src/a.c'), item('t2', 'src/b.c'), item('t3', 'src/c.c')], POLES));
    expect(advice.choiceFloor).toEqual([{ at: '$.poles[0]', onRecord: 2, detail: TWO }]);
    expect(advice.advisories).toEqual(readerAdvice(doc([], [], POLES, 'polaris-dossier-local-draft-v10')).advisories);
  });

  it('counts only Inferred items, by a file the Pole\'s sections cite, each section in the first Pole naming it', () => {
    const one = readerAdvice(doc([item('ch1', 'src/a.c'), item('u1', '', 'unknown'), item('o1', 'docs/other.md')], [], [{ label: 'Core', sections: ['a'] }, { label: 'Again', sections: ['a'] }]));
    expect(one.choiceFloor).toEqual([
      { at: '$.poles[0]', onRecord: 1, detail: 'the Pole "Core" has 1 choice or trade-off on record, fewer than 3: where its source shows a decision this part makes, the alternative it passes over or what it costs, record each as a cited Inferred item of the understanding record\'s `choices` or `tradeOffs` citing a file its sections cite; never record one its source does not show' },
      { at: '$.poles[1]', onRecord: 0, detail: 'the Pole "Again" has 0 choices or trade-offs on record, fewer than 3: where its source shows a decision this part makes, the alternative it passes over or what it costs, record each as a cited Inferred item of the understanding record\'s `choices` or `tradeOffs` citing a file its sections cite; never record one its source does not show' },
    ]);
  });

  it('counts every Inferred item for a draft with no Poles', () => {
    // An Unknown item is not on record even where nothing attributes it: a draft with no Poles counts the Inferred items alone.
    expect(readerAdvice(doc([item('ch1', 'x/1'), item('ch2', 'x/2'), item('u1', '', 'unknown')], [])).choiceFloor).toEqual([{ at: '$.sections', onRecord: 2,
      detail: 'the draft has 2 choices or trade-offs on record, fewer than 3: where its source shows a decision this part makes, the alternative it passes over or what it costs, record each as a cited Inferred item of the understanding record\'s `choices` or `tradeOffs`; never record one its source does not show' }]);
    expect(readerAdvice(doc([item('ch1', 'x/1'), item('ch2', 'x/2')], [item('t1', 'x/3')])).choiceFloor).toEqual([]);
  });

  it('gives an earlier draft no choice-floor member at all', () => {
    for (const version of ['polaris-dossier-local-draft-v12', 'polaris-dossier-local-draft-v10', 'polaris-dossier-local-draft-v2']) {
      expect(Object.keys(readerAdvice(doc([], [], POLES, version))), version).toEqual(['standards', 'note', 'advisories']);
    }
  });
});
