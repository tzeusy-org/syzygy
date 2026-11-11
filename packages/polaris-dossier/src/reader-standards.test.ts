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
    const criteria = designCriteria('/r');
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
  it('gives no advice on a draft that meets all four, and none on a draft that is not an object', () => {
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
