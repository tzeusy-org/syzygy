import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { PinnedObjectReader, TreeEntry } from './git-object-reader.js';
import { tempDir } from '@syzygy/test-kit';
import { runDossierCli } from './cli.js';
import { buildDossierScreen } from './screen.js';
import { annotateText, extractClaims, quotationsIn, referencesIn, verifyText } from './verify-text.js';

// syzygy-5dhm.23 (R2 S1): free-form Markdown checked through the dossier check's own derivation. The screen is the real
// `buildDossierScreen` over this checkout's detectors and denied paths with a fixture code-content scope (as check.test.ts builds it);
// the tree is held in memory by a reader that records every path whose bytes it hands out, so the test stays in the unit tier.
// Every expected outcome, tally and path is a literal written before the checker ran, never taken from the module under test.

const REAL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const LIVE_POLICY = JSON.parse(fs.readFileSync(path.join(REAL_ROOT, '.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json'), 'utf8'));
const POLICY = new TextEncoder().encode(JSON.stringify({
  policyId: 'fixture-public-source', policyVersion: '1', detectors: LIVE_POLICY.detectors, sourceAdmission: LIVE_POLICY.sourceAdmission,
  publicSourceScope: { contentClassification: { rules: [{ class: 'code-content', sourceExtensions: ['.c', '.h', '.txt'] }] } },
}));
const SCREEN = ((load) => { if (!load.ok) throw new Error(load.why); return load.screen; })(buildDossierScreen(POLICY));
const PINNED = 'a'.repeat(40);

const KESTREL = '/* Kestrel keeps every key in memory.\n * Each command runs to completion before\n * the next one starts. */\nint main(void) { return 0; }\n';
const WITHHELD_BODY = 'GUIDE-BODY-MUST-NEVER-BE-READ\n';
/** A path a secret detector matches (check.test.ts's form): withheld, and never named by the checker. */
const SECRET_PATH = `docs/${['gh', 'p_'].join('')}${'k'.repeat(24)}.txt`;
const FILES: Readonly<Record<string, string>> = {
  'src/kestrel.c': KESTREL,
  'src/util/kestrel.h': '#define KESTREL 1\n',
  'lib/kestrel.h': '#define KESTREL 2\n',
  'docs/guide.md': WITHHELD_BODY,
  '.env': 'TOKEN=never-read\n',
  [SECRET_PATH]: 'Plain words.\n',
};

/** An in-memory pinned tree whose reader records every path it reads. */
function treeReader(): { reader: PinnedObjectReader; read: string[] } {
  const read: string[] = [];
  const entries: TreeEntry[] = Object.keys(FILES).map((file, i) => ({ path: file, mode: '100644', id: String(i).padStart(40, '0') }));
  const reader = {
    revision: PINNED, algorithm: 'sha1',
    listTree: async () => entries,
    readBlobs: async (paths: readonly string[]) => paths.map((wanted) => {
      read.push(wanted);
      const entry = entries.find((candidate) => candidate.path === wanted);
      if (entry === undefined) throw new Error(`no blob ${wanted}`);
      return { ...entry, bytes: new TextEncoder().encode(FILES[wanted]!) };
    }),
  } as unknown as PinnedObjectReader;
  return { reader, read };
}

const check = async (markdown: string) => {
  const { reader, read } = treeReader();
  const result = await verifyText(markdown, { pinned: PINNED, screen: SCREEN, reader }, 'answer.md');
  return { ...result, read };
};

const SIX = [
  'Kestrel holds data in memory: "keeps every key in memory" (`src/kestrel.c:1-3`).',
  '',
  '- The entry point is `src/kestrel.c:4`.',
  '- Persistence lives in `src/persist.c:10-20`.',
  '- The loop "keeps no key in memory" (src/kestrel.c lines 1-3).',
  '',
  'Kestrel is "fast" and simple, with no file named.',
  '',
  'The guide (`docs/guide.md`) explains setup.',
].join('\n');

describe('verify a free-form text: the six outcomes', () => {
  it('gives each fixture claim its outcome, with a literal tally', async () => {
    const { verified } = await check(SIX);
    expect(verified.claims.map((claim) => claim.outcome)).toEqual([
      'quotation-verified', 'reference-unverified', 'path-missing', 'quotation-not-found', 'unanchored', 'withheld',
    ]);
    expect(verified.tally).toEqual({
      'quotation-verified': 1, 'reference-unverified': 1, 'path-missing': 1, 'quotation-not-found': 1, unanchored: 1, withheld: 1,
    });
    expect(verified.items).toEqual({
      references: { resolves: 3, missing: 1, 'lines-missing': 0, withheld: 1 },
      quotations: { verified: 1, 'not-found': 1, withheld: 0, 'no-file': 0, unanchored: 1 },
    });
  });

  it('never reads a withheld path, and never prints its body', async () => {
    const { read, annotated, verified } = await check(`${SIX}\n\nSettings sit in \`.env\` per "TOKEN".\n\nAnd in ${SECRET_PATH}:1.`);
    expect(new Set(read)).toEqual(new Set(['src/kestrel.c']));
    expect(annotated).not.toContain('GUIDE-BODY-MUST-NEVER-BE-READ');
    expect(annotated).not.toContain('never-read');
    expect(annotated).not.toContain('Plain words.');
    expect(verified.claims[6]).toMatchObject({ outcome: 'withheld', references: [{ written: '.env', path: '.env', state: 'withheld' }], quotations: ['withheld'] });
    // A path a secret detector matches is withheld and not named in the closing section (only the text's own line carries it).
    expect(verified.claims[7]).toMatchObject({ outcome: 'withheld', references: [{ written: null, path: null, ranges: [{ start: 1, end: 1 }], state: 'withheld' }] });
    expect(annotated).toContain('  - reference (a path screening withholds by name), line 1: withheld');
    expect(annotated.split(SECRET_PATH).length - 1).toBe(1);
    expect(verified.claims[5]!.references).toEqual([{ written: 'docs/guide.md', path: 'docs/guide.md', ranges: [], state: 'withheld' }]);
  });

  it('flips a verified quotation to not found when one quoted character is mutated', async () => {
    const before = await check('It "keeps every key in memory" (`src/kestrel.c:1`).');
    const after = await check('It "keeps everY key in memory" (`src/kestrel.c:1`).');
    expect(before.verified.claims[0]!.outcome).toBe('quotation-verified');
    expect(after.verified.claims[0]!.outcome).toBe('quotation-not-found');
  });

  it('reports lines past the end of a file as path-missing, not as resolving', async () => {
    const { verified } = await check('See `src/kestrel.c:3-9`.');
    expect(verified.claims[0]).toMatchObject({ outcome: 'path-missing', references: [{ path: 'src/kestrel.c', state: 'lines-missing' }] });
  });

  it('resolves a bare or partial name to the one blob ending with it, and leaves an ambiguous one missing', async () => {
    const { verified } = await check('See kestrel.c here.\n\nAnd util/kestrel.h here.\n\nAnd kestrel.h here.');
    expect(verified.claims.map((claim) => claim.references[0])).toEqual([
      { written: 'kestrel.c', path: 'src/kestrel.c', ranges: [], state: 'resolves' },
      { written: 'util/kestrel.h', path: 'src/util/kestrel.h', ranges: [], state: 'resolves' },
      { written: 'kestrel.h', path: null, ranges: [], state: 'missing' },
    ]);
  });

  it('checks a quotation against every file its claim names, verified when any holds it', async () => {
    const { verified } = await check('Both `lib/kestrel.h` and `src/kestrel.c` matter: "the next one starts".');
    expect(verified.claims[0]).toMatchObject({ outcome: 'quotation-verified', quotations: ['verified'] });
  });
});

describe('extraction', () => {
  it('reads every reference form', () => {
    expect(referencesIn('a `src/a.c:12` b src/b.c:3-4 c src/c.c#L5-L6 d src/d.c, lines 7–9, lines 20–21 e src/e.c, line 8')).toEqual([
      { path: 'src/a.c', ranges: [{ start: 12, end: 12 }] },
      { path: 'src/b.c', ranges: [{ start: 3, end: 4 }] },
      { path: 'src/c.c', ranges: [{ start: 5, end: 6 }] },
      { path: 'src/d.c', ranges: [{ start: 7, end: 9 }, { start: 20, end: 21 }] },
      { path: 'src/e.c', ranges: [{ start: 8, end: 8 }] },
    ]);
  });
  it('takes no URL, absolute path, glob, bare extension, directory, abbreviation or unknown bare name as a path', () => {
    expect(referencesIn('see https://example.org/x/y.html, /etc/redis.conf, `*.c`, the `.c` files, `tests/unit`, e.g. this, and obj.encoding')).toEqual([]);
  });
  it('merges repeated mentions of one path', () => {
    expect(referencesIn('`src/a.c:1` and later src/a.c:2 and src/a.c')).toEqual([{ path: 'src/a.c', ranges: [{ start: 1, end: 1 }, { start: 2, end: 2 }] }]);
  });
  it('reads straight and curly quotations outside code spans', () => {
    expect(quotationsIn('It says "one two" and “three” but not `"four"` nor "--"')).toEqual(['one two', 'three']);
  });
  it('splits claims by paragraph, list item and table row, skipping headings, fences and separators', () => {
    const extracted = extractClaims('# Title\n\nPara one\ncontinues.\n- item a\n- item b\n\n| h | i |\n|---|---|\n| r | s |\n\n```\ncode src/x.c:1\n```\n');
    expect(extracted.claims.map((claim) => [claim.startLine, claim.endLine])).toEqual([[3, 4], [5, 5], [6, 6], [8, 8], [10, 10]]);
    expect(extracted.skipped).toEqual({ headingLines: 1, fencedLines: 3, tableSeparatorLines: 1 });
  });
});

describe('the annotated copy', () => {
  it('marks each claim in place, inside a table row, and closes with the tally', async () => {
    const markdown = 'One `src/kestrel.c:1`.\n\n| a | b |\n|---|---|\n| x | `src/none.c` |\n';
    const { reader } = treeReader();
    const { annotated } = await verifyText(markdown, { pinned: PINNED, screen: SCREEN, reader }, 'answer.md');
    const lines = annotated.split('\n');
    expect(lines.slice(0, 5)).toEqual([
      'One `src/kestrel.c:1`. [verify C1: reference-unverified]',
      '',
      '| a | b [verify C2: unanchored] |',
      '|---|---|',
      '| x | `src/none.c` [verify C3: path-missing] |',
    ]);
    expect(annotated).toContain('| path-missing | 1 |');
    expect(annotated).toContain('| total | 3 |');
    expect(annotated).toContain(`Checked against the pinned revision ${PINNED}; text answer.md.`);
  });
  it('is a pure function of the text and the result', () => {
    const empty = { claims: [], tally: { 'quotation-verified': 0, 'reference-unverified': 0, 'path-missing': 0, 'quotation-not-found': 0, unanchored: 0, withheld: 0 },
      items: { references: { resolves: 0, missing: 0, 'lines-missing': 0, withheld: 0 }, quotations: { verified: 0, 'not-found': 0, withheld: 0, 'no-file': 0, unanchored: 0 } },
      skipped: { headingLines: 0, fencedLines: 0, tableSeparatorLines: 0 } } as const;
    expect(annotateText('x', empty, { pinned: PINNED, file: 'f' })).toBe(annotateText('x', empty, { pinned: PINNED, file: 'f' }));
  });
});

describe('syzygy dossier verify', () => {
  const io = () => {
    const out: string[] = [], err: string[] = [];
    return { io: { stdout: (text: string) => out.push(text), stderr: (text: string) => err.push(text) }, out, err };
  };
  it('requires --text', async () => {
    const { io: ports, err } = io();
    expect(await runDossierCli(['verify', '/nowhere'], ports, { sources: {} as never })).toBe(2);
    expect(err.join('')).toContain('verify requires --text <file>');
  });
  it('refuses a directory that is not a run, before anything is read', async () => {
    const { io: ports, out } = io();
    expect(await runDossierCli(['verify', '/nowhere', '--text', '/nowhere.md', '--json'], ports, { sources: {} as never })).toBe(1);
    expect(JSON.parse(out.join(''))).toMatchObject({ command: 'verify', outcome: 'refused', stage: 'run' });
  });
  it('writes nothing into a run directory: an --out inside it is refused', async () => {
    const run = path.join(tempDir('verify-text-'), `run-${'b'.repeat(32)}`);
    fs.mkdirSync(run);
    fs.writeFileSync(path.join(run, 'run.json'), '{}');
    const { io: ports, out } = io();
    expect(await runDossierCli(['verify', run, '--text', '/nowhere.md', '--out', path.join(run, 'annotated.md'), '--json'], ports, { sources: {} as never })).toBe(1);
    expect(JSON.parse(out.join(''))).toMatchObject({ stage: 'out' });
    expect(fs.readdirSync(run)).toEqual(['run.json']);
  });
});
