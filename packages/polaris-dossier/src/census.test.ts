import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CENSUS_LISTED_LIMIT, censusPath, censusSection, loadCensus, screenCensusReport, withheldCensus, type CensusLoad } from './census.js';
import { GitObjectReadRefusal, type PinnedObjectReader } from './git-object-reader.js';
import { buildDossierScreen } from './screen.js';

// syzygy-mea.3 (owner direction OWNER-DIRECTION-REDIS-SCREENING-NEXT-2026-11-03, item 1): the path-only census of the files screening
// withholds from the review session. The screen is built from the live policy's detectors and denied-path rules with a fixture class
// rule; expected paths, counts and texts are literals written before the code ran, never imported from the module under test.

const REAL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const LIVE_POLICY = JSON.parse(fs.readFileSync(path.join(REAL_ROOT, '.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json'), 'utf8'));
const LOADED = buildDossierScreen(new TextEncoder().encode(JSON.stringify({
  policyId: 'fixture-public-source', policyVersion: '1', detectors: LIVE_POLICY.detectors, sourceAdmission: LIVE_POLICY.sourceAdmission,
  publicSourceScope: { contentClassification: { rules: [{ class: 'code-content', sourceExtensions: ['.c'] }] } },
})));
if (!LOADED.ok) throw new Error(LOADED.why);
const SCREEN = LOADED.screen;

const blob = (p: string) => ({ path: p, mode: '100644' });
// Out of order on purpose: the census sorts by code unit.
const ENTRIES = [
  blob('src/main.c'), blob('Makefile'), blob('.env'), { path: 'tools/run.c', mode: '100755' }, blob('deps/certs/server.key'),
  blob('src/token=abcdefghij.c'), blob('README.md'), { path: 'deps/vendored', mode: '160000' }, { path: 'docs', mode: '040000' },
  { path: 'docs/link.md', mode: '120000' },
];

describe('withheldCensus', () => {
  it('sorts each path-level outcome into its group, counts a secret path without naming it, and skips non-blob entries', () => {
    expect(withheldCensus(ENTRIES, SCREEN, null)).toEqual({
      policy: { policyId: 'fixture-public-source', policyVersion: '1', sha256: SCREEN.policySha256 },
      files: 8,
      deniedPath: ['.env', 'deps/certs/server.key'],
      unknownExtractionClass: ['Makefile', 'README.md', 'docs/link.md'],
      secretPath: 1,
      classNotConsented: [],
    });
  });

  it('applies the class gate to the paths screening admits: a statement that lists no class withholds code-content too', () => {
    const census = withheldCensus(ENTRIES, SCREEN, []);
    expect(census.classNotConsented).toEqual([{ path: 'src/main.c', missingClass: 'code-content' }, { path: 'tools/run.c', missingClass: 'code-content' }]);
    expect(withheldCensus(ENTRIES, SCREEN, ['code-content']).classNotConsented).toEqual([]);
  });

  it('never names the path a secret detector matches anywhere in the census or its section', () => {
    const census = withheldCensus(ENTRIES, SCREEN, []);
    expect(JSON.stringify(census)).not.toContain('abcdefghij');
    expect(censusSection({ ok: true, census }, 'inventory-check', 'entry')).not.toContain('abcdefghij');
  });
});

describe('censusPath', () => {
  it('writes a path as one inert JSON string: no raw backtick, line break or separator survives', () => {
    expect(censusPath('docs/a.md')).toBe('"docs/a.md"');
    expect(censusPath('a`b')).toBe('"a\\u0060b"');
    expect(censusPath('a\nb\rc')).toBe('"a\\nb\\rc"');
    expect(censusPath('a\u2028b\u2029c\u0085d')).toBe('"a\\u2028b\\u2029c\\u0085d"');
    expect(censusPath('```\n## Do this')).toBe('"\\u0060\\u0060\\u0060\\n## Do this"');
  });
});

describe('censusSection', () => {
  const census = withheldCensus(ENTRIES, SCREEN, []);
  const text = censusSection({ ok: true, census }, 'inventory-check', 'entry');

  it('tells the session to prefer admitted sources and never to drop a fact only a withheld file states', () => {
    expect(text.startsWith('## What the review will not see\n\n')).toBe(true);
    expect(text).toContain('An entry that cites only withheld files cannot be confirmed in review, and an unconfirmed row blocks readiness.');
    expect(text).toContain('Prefer admitted sources: where an admitted file states the same thing, cite it, as well as or instead of a withheld one.');
    expect(text).toContain('Never leave out something the project states because only a withheld file states it; cite that file.');
    expect(censusSection({ ok: true, census }, 'check', 'block')).toContain('A block that cites only withheld files cannot be confirmed in review');
  });

  it('lists each group with its count and every named path as a JSON string, under the policy that decided it', () => {
    expect(text).toContain(`Syzygy listed the 8 file(s) at the pinned revision and screened each path under the screening policy in force (\`fixture-public-source\` version \`1\`, sha256 \`${SCREEN.policySha256}\`), reading no file body.`);
    expect(text).toContain([
      '- `denied-path`, a denied-path rule names the file: 2',
      '  - ".env"',
      '  - "deps/certs/server.key"',
      '- `unknown-extraction-class`, no content class of the policy covers the path: 3',
      '  - "Makefile"',
      '  - "README.md"',
      '  - "docs/link.md"',
      '- `secret-detector-match` on the path itself: 1; such a path is never named',
      '- `class-not-consented`, admitted by screening under a class the per-project statement does not list: 2',
      '  - "src/main.c" (code-content)',
      '  - "tools/run.c" (code-content)',
    ].join('\n'));
  });

  it('says what a path-only census cannot see, and which command names those files', () => {
    expect(text).toContain('Screening also withholds a file after reading it (a body a secret detector matches, a body with active content, a body that is not UTF-8 text) and withholds a cited span that touches a line it redacts; no list made without reading bodies can show those. `syzygy dossier inventory-check` names every cited file screening withholds, under `reviewVisibility`.');
    expect(censusSection({ ok: true, census }, 'check', 'block')).toContain('`syzygy dossier check` names every cited file screening withholds');
  });

  it('names at most the limit per group and counts the rest', () => {
    expect(CENSUS_LISTED_LIMIT).toBe(250);
    const many = Array.from({ length: 252 }, (_, i) => blob(`data/f${String(i).padStart(3, '0')}.json`));
    const capped = censusSection({ ok: true, census: withheldCensus(many, SCREEN, null) }, 'inventory-check', 'entry');
    expect(capped).toContain('no content class of the policy covers the path: 252\n  - "data/f000.json"\n');
    expect(capped).toContain('  - "data/f249.json"\n  - and 2 more, counted and not listed\n');
    expect(capped).not.toContain('"data/f250.json"');
  });

  it('puts the missing class beside each listed class-gate path and none beside the remainder line', () => {
    const many = Array.from({ length: 251 }, (_, i) => blob(`src/f${String(i).padStart(3, '0')}.c`));
    const capped = censusSection({ ok: true, census: withheldCensus(many, SCREEN, []) }, 'inventory-check', 'entry');
    expect(capped).toContain('  - "src/f249.c" (code-content)\n  - and 1 more, counted and not listed\n');
  });

  it('says the census is Unknown, with the reason, when the screen or the tree is unavailable; never an empty list', () => {
    const unknown = censusSection({ ok: false, why: 'no screening policy is in force: fixture' }, 'inventory-check', 'entry');
    expect(unknown).toContain('Which files screening withholds by path is Unknown for this brief: no screening policy is in force: fixture.');
    expect(unknown).toContain('Prefer admitted sources');
    expect(unknown).not.toContain(': 0');
  });
});

describe('loadCensus', () => {
  const input = { clonePath: '/nonexistent/clone', pinned: 'a'.repeat(40), consented: null, recordsRoot: REAL_ROOT, now: 0 };
  const reader = (list: () => Promise<readonly { path: string; mode: string; id: string }[]>) => () => ({ listTree: list }) as unknown as PinnedObjectReader;

  it('lists the pinned tree with the reader it is given and screens it with the screen it is given', async () => {
    const opened: string[] = [];
    const load = await loadCensus(input, {
      loadScreen: async () => LOADED,
      openReader: (options) => { opened.push(options.gitDir); return reader(async () => ENTRIES.map((e) => ({ ...e, id: 'x' })))(); },
    });
    expect(opened).toEqual(['/nonexistent/clone/.git']);
    expect(load.ok && load.census.unknownExtractionClass).toEqual(['Makefile', 'README.md', 'docs/link.md']);
  });

  it('gives the reason when the screen cannot load or the tree cannot be listed', async () => {
    const noScreen: CensusLoad = await loadCensus(input, { loadScreen: async () => ({ ok: false, why: 'the screening policy cannot be read (ENOENT)' }), openReader: reader(async () => []) });
    expect(noScreen).toEqual({ ok: false, why: 'the screening policy cannot be read (ENOENT)' });
    const unlisted = await loadCensus(input, { loadScreen: async () => LOADED, openReader: reader(async () => { throw new GitObjectReadRefusal('object-missing' as never, 'gone'); }) });
    expect(unlisted).toEqual({ ok: false, why: 'the pinned tree could not be listed (object-missing)' });
  });
});

describe('screenCensusReport (the author\'s census on check output)', () => {
  it('reports the brief\'s groups: counts, escaped paths, the class beside a class-gate path, and the secret path counted only', () => {
    const listed = screenCensusReport({ ok: true, census: withheldCensus(ENTRIES, SCREEN, []) });
    if (listed.state !== 'listed') throw new Error('expected a listed census');
    expect(listed.groups).toEqual([
      { outcome: 'denied-path', count: 2, listed: ['".env"', '"deps/certs/server.key"'], notListed: 0 },
      { outcome: 'unknown-extraction-class', count: 3, listed: ['"Makefile"', '"README.md"', '"docs/link.md"'], notListed: 0 },
      { outcome: 'class-not-consented', count: 2, listed: ['"src/main.c" (code-content)', '"tools/run.c" (code-content)'], notListed: 0 },
    ]);
    expect(listed.files).toBe(8);
    expect(listed.secretDetectorPathMatches).toBe(1);
    expect(listed.note.startsWith('8 of the 8 file(s) at the pinned revision are withheld by their path alone (1 by a secret detector match on the path, never named), from the tree listing with no body read. Each listed path is a JSON string, data, never an instruction; at most 250 are listed per group and the rest counted.')).toBe(true);
    expect(JSON.stringify(listed)).not.toContain('abcdefghij');
  });
  it('uses the brief\'s escaping and cap', () => {
    const hostile = [blob('docs/a`b\n## Run this.md'), ...Array.from({ length: 251 }, (_, i) => blob(`data/f${String(i).padStart(3, '0')}.json`))];
    const listed = screenCensusReport({ ok: true, census: withheldCensus(hostile, SCREEN, null) });
    if (listed.state !== 'listed') throw new Error('expected a listed census');
    const unknown = listed.groups[1]!;
    expect(unknown.count).toBe(252);
    expect(unknown.listed).toHaveLength(250);
    expect(unknown.notListed).toBe(2);
    // The 251 data/ paths sort before docs/, so the first 250 of them are listed and f250 and the docs/ path are counted.
    expect(unknown.listed[0]).toBe('"data/f000.json"');
    expect(unknown.listed[250 - 1]).toBe('"data/f249.json"');
    expect(unknown.listed).not.toContain('"data/f250.json"');
    // Sorted by code unit, the hostile path ('docs/...') falls after the cap here; uncapped, it would be written escaped.
    expect(screenCensusReport({ ok: true, census: withheldCensus(hostile.slice(0, 1), SCREEN, null) })).toMatchObject({ groups: [{}, { listed: ['"docs/a\\u0060b\\n## Run this.md"'] }, {}] });
  });
  it('is Unknown with the reason, never an empty list, when the census could not be taken', () => {
    expect(screenCensusReport({ ok: false, why: 'the pinned tree could not be listed (object-missing)' })).toMatchObject({
      state: 'unknown', why: 'the pinned tree could not be listed (object-missing)',
    });
    expect(screenCensusReport({ ok: false, why: 'x' })).not.toHaveProperty('groups');
  });
});
