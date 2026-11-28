import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256 } from '@syzygy/support';
import { beforeAll, describe, expect, it } from 'vitest';
import { GitObjectReadRefusal, type VerifiedBlob } from './git-object-reader.js';
import { deriveImportFacts, importFactsUnknown, listWithinBudget, listedEntrySize, type ImportFacts } from './import-facts.js';
import { deriveManifestFacts } from './manifest-facts.js';
import { lineCountOf } from './manifest-model.js';
import { buildDossierScreen, type DossierScreen } from './screen.js';

// syzygy-3efd.89 (REQ-polaris-generation-034 version 2.39): the importFacts member, from a tree listing, the bound screen, a reader double
// and the manifestFacts member the same listing gives. Expected members, counts, outcomes, reasons and line pairs are literals written from
// the requirement's scenarios before the driver ran. The reader double records every TypeScript path it is asked for, refuses a blob past
// the 262,144-byte object bound as the pinned reader does (`corrupt-object` with `overBound`), and fails the test on a path the listing does
// not hold as a blob. Planted secret values are fake and assembled from pieces.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const POLICY_V2 = new Uint8Array(readFileSync(path.join(ROOT, '.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v2.json')));
const SUBJECT = { repository: 'repository:o-r', commit: 'a'.repeat(40) };
const TOKEN = ['gh', 'p_', '0123456789abcdefghijklmnopqrstuvwxyzAB'].join('');
const SECRET_DIR = ['gh', 'p_', 'k'.repeat(24)].join('');

let V2: DossierScreen;
beforeAll(() => {
  const load = buildDossierScreen(POLICY_V2, true, SUBJECT, 'public');
  if (!load.ok) throw new Error(load.why);
  V2 = load.screen;
});

const idOf = (p: string): string => createHash('sha1').update(p).digest('hex');
type Tree = Record<string, string | Uint8Array | { readonly mode: string }>;
const bytesOf = (v: string | Uint8Array): Uint8Array => (typeof v === 'string' ? new TextEncoder().encode(v) : v);

/** The member over `tree` (mode 100644 unless given), with the manifest facts the same listing gives, and the TypeScript paths read. */
async function importsOf(tree: Tree, screen: DossierScreen = V2) {
  const asked: string[] = [];
  const entries = Object.entries(tree).map(([p, v]) => ({ path: p, mode: typeof v === 'object' && 'mode' in v ? v.mode : '100644', id: idOf(p) }));
  const blob = (p: string): VerifiedBlob => {
    const v = tree[p];
    if (v === undefined || (typeof v === 'object' && 'mode' in v)) throw new Error(`the reader double was asked for ${JSON.stringify(p)}, no blob of the listing`);
    return { path: p, mode: '100644', id: idOf(p), bytes: bytesOf(v) };
  };
  const manifestFacts = await deriveManifestFacts({ entries, screen, consented: null, read: async (p) => blob(p) });
  const member = await deriveImportFacts({
    entries, screen, consented: null, manifestFacts,
    read: async (p) => {
      asked.push(p);
      const read = blob(p);
      if (read.bytes.byteLength > 262_144) throw new GitObjectReadRefusal('corrupt-object', 'fixture: over the bound', idOf(p), p, true);
      return read;
    },
  });
  return { member: derived(member), asked };
}
const derived = (m: ImportFacts) => { if (m.state !== 'derived') throw new Error('expected a derived member'); return m; };
const outcomes = (m: ReturnType<typeof derived>) => m.facts.map((f) => [f.path, f.lines, f.form, f.outcome, f.from, f.to, f.unknownReason]);
const scannedFile = (p: string, statements: number, outsideGrammar = 0) => ({ path: p, outcome: 'scanned', unknownReason: null, statements, outsideGrammar });
const unknownFile = (p: string, unknownReason: string) => ({ path: p, outcome: 'unknown', unknownReason, statements: null, outsideGrammar: null });

const WORKSPACE: Tree = {
  'package.json': '{ "name": "w", "private": true, "workspaces": ["units/*"] }\n',
  'units/a/package.json': '{ "name": "@w/a" }\n',
  'units/b/package.json': '{ "name": "@w/b" }\n',
  'units/a/src/index.ts': "import { b } from '@w/b';\nimport type { T } from '../../b/src/types.js';\nimport './local.js';\nimport fs from 'node:fs';\n",
  'units/a/src/local.ts': 'export const local = 1;\n',
  'units/b/src/types.ts': 'export type T = string;\n',
};

describe('importFacts: a workspace\'s unit graph (scenario "Import facts give a workspace\'s unit graph")', () => {
  it('derives the member: three files scanned, two edge statements joining the two units, one same-unit, one external', async () => {
    const { member, asked } = await importsOf(WORKSPACE);
    expect(member).toEqual({
      format: 'polaris-dossier-import-facts/1', state: 'derived',
      screeningPolicy: { policyId: 'polaris-butlers-project-shape-secrets', policyVersion: 'dossier-declared-source/2.0.0', sha256: sha256(POLICY_V2) },
      rules: [{ rule: 'typescript-relative-import', ruleVersion: 1 }, { rule: 'typescript-package-import', ruleVersion: 1 }],
      label: 'inferred',
      languages: [{ language: 'typescript', state: 'assessed' }, { language: 'python', state: 'unevaluated' }],
      coverage: 'complete', candidates: 3, secretPathsLeftOut: 0, setApart: 0, scanned: 3, incomplete: 0, unknown: 0,
      statements: { edge: 2, sameUnit: 1, external: 1, noUnit: 0, unknown: 0 }, outsideGrammar: 0,
      edges: [{ from: 'units/a/package.json', to: 'units/b/package.json', statements: 2 }], edgesNotListed: 0,
      files: [scannedFile('units/a/src/index.ts', 4), scannedFile('units/a/src/local.ts', 0), scannedFile('units/b/src/types.ts', 0)], filesNotListed: 0,
      facts: [
        { id: '_import-1', rule: 'typescript-package-import', ruleVersion: 1, path: 'units/a/src/index.ts', lines: [1, 1], form: 'import', outcome: 'edge', from: 'units/a/package.json', to: 'units/b/package.json', unknownReason: null, epistemic: 'inferred' },
        { id: '_import-2', rule: 'typescript-relative-import', ruleVersion: 1, path: 'units/a/src/index.ts', lines: [2, 2], form: 'import-type', outcome: 'edge', from: 'units/a/package.json', to: 'units/b/package.json', unknownReason: null, epistemic: 'inferred' },
        { id: '_import-3', rule: 'typescript-relative-import', ruleVersion: 1, path: 'units/a/src/index.ts', lines: [3, 3], form: 'side-effect', outcome: 'same-unit', from: 'units/a/package.json', to: 'units/a/package.json', unknownReason: null, epistemic: 'inferred' },
        { id: '_import-4', rule: 'typescript-package-import', ruleVersion: 1, path: 'units/a/src/index.ts', lines: [4, 4], form: 'import', outcome: 'external', from: 'units/a/package.json', to: null, unknownReason: null, epistemic: 'inferred' },
      ],
      factsNotListed: 0,
    });
    expect(asked).toEqual(['units/a/src/index.ts', 'units/a/src/local.ts', 'units/b/src/types.ts']);
  });

  it('carries no operand text, and every line pair is a range of its file', async () => {
    const { member } = await importsOf(WORKSPACE);
    const text = JSON.stringify(member);
    for (const operand of ['@w/b', '../../b/src/types.js', './local.js', 'node:fs']) expect(text).not.toContain(operand);
    const lines = lineCountOf(WORKSPACE['units/a/src/index.ts'] as string);
    for (const fact of member.facts) expect(fact.lines[0] >= 1 && fact.lines[0] <= fact.lines[1] && fact.lines[1] <= lines).toBe(true);
  });

  it('is Unknown, with the reader\'s reason alone, where the tree cannot be listed', () => {
    expect(importFactsUnknown('object-missing')).toEqual({ format: 'polaris-dossier-import-facts/1', state: 'unknown', why: 'the pinned tree could not be listed (object-missing)' });
  });
});

describe('importFacts: forms outside the grammar (scenario "Forms outside the grammar are counted and never resolved")', () => {
  const FORMS = [
    "import('./a');", "require('./b');", "import c = require('./c');", "import d from './d\\u0041';", "import e from './e.json';",
    "import f from '/abs/f';", "declare module 'm' { import g from './g'; }", "import h from '.';", "import i from '..';",
    "import j from '#internal';", "import k from '';", "import l from './dir/';", "import m from './m' with { type: 'json' };",
  ];
  const NOT_FORMS = ["obj.require('./n');", 'function require(p) { return p; }', 'const u = import.meta.url;', 'import o = N.o;'];
  const TREE = (body: string): Tree => ({ 'package.json': '{ "name": "r" }\n', 'src/f.ts': body, 'src/a.ts': '', 'src/b.ts': '', 'src/e.ts': '', 'src/g.ts': '', 'src/m.ts': '' });

  it('counts thirteen forms, states no statement, and leaves coverage partial', async () => {
    const { member } = await importsOf(TREE([...FORMS, ...NOT_FORMS].join('\n')));
    expect(member.files.find((f) => f.path === 'src/f.ts')).toEqual(scannedFile('src/f.ts', 0, 13));
    expect(member.outsideGrammar).toBe(13);
    expect(member.statements).toEqual({ edge: 0, sameUnit: 0, external: 0, noUnit: 0, unknown: 0 });
    expect(member.facts).toEqual([]);
    expect(member.coverage).toBe('partial');
  });

  it('gives coverage complete for the same file without the thirteen forms', async () => {
    const { member } = await importsOf(TREE(NOT_FORMS.join('\n')));
    expect(member.files.find((f) => f.path === 'src/f.ts')).toEqual(scannedFile('src/f.ts', 0, 0));
    expect(member.coverage).toBe('complete');
  });
});

describe('importFacts: only a whole body the screen admits (scenario "Only a whole body the screen admits is scanned")', () => {
  const BASE: Tree = { 'package.json': '{ "name": "r" }\n', 'src/ok.ts': "import './a';\n", 'src/a.ts': '' };
  const PLANTED: Tree = {
    ...BASE,
    'src/planted.ts': `export const k = '${TOKEN}';\n`,
    [`${SECRET_DIR}/x.ts`]: "import './y';\n",
    'tests/t.ts': "import './z';\n",
  };

  it('names the body a detector matches Unknown, counts the secret path and the tests path alone, and is never complete', async () => {
    const { member, asked } = await importsOf(PLANTED);
    expect([member.candidates, member.secretPathsLeftOut, member.setApart, member.scanned, member.unknown]).toEqual([5, 1, 1, 2, 1]);
    expect(member.files).toEqual([scannedFile('src/a.ts', 0), scannedFile('src/ok.ts', 1), unknownFile('src/planted.ts', 'secret-detector-match')]);
    expect(member.coverage).toBe('partial');
    expect(asked).toEqual(['src/a.ts', 'src/ok.ts', 'src/planted.ts']);
    const text = JSON.stringify(member);
    for (const hidden of [TOKEN, SECRET_DIR, 'tests/t.ts']) expect(text).not.toContain(hidden);
  });

  it('is complete once the planted body and the secret path are removed', async () => {
    const { [`${SECRET_DIR}/x.ts`]: _secret, 'src/planted.ts': _planted, ...rest } = PLANTED;
    const { member } = await importsOf(rest);
    expect([member.coverage, member.setApart, member.unknown]).toEqual(['complete', 1, 0]);
  });
});

describe('importFacts: an interrupted scan (scenario "An interrupted scan keeps what closed before it")', () => {
  it('keeps the statement before an unterminated template, and is partial', async () => {
    const { member } = await importsOf({ 'y/f.ts': "import { a } from '../x/a';\n\nconst t = `open\nimport { b } from '../x/b';\n", 'x/a.ts': '', 'x/b.ts': '' });
    expect(member.files).toEqual([scannedFile('x/a.ts', 0), scannedFile('x/b.ts', 0), { path: 'y/f.ts', outcome: 'incomplete', unknownReason: null, statements: 1, outsideGrammar: 0 }]);
    expect(outcomes(member)).toEqual([['y/f.ts', [1, 1], 'import', 'no-unit', null, null, null]]);
    expect(member.coverage).toBe('partial');
  });

  it('keeps nothing where the template opens first, and alone in its tree is unknown', async () => {
    const { member } = await importsOf({ 'y/f.ts': "const t = `open\nimport { a } from '../x/a';\n" });
    expect(member.files).toEqual([{ path: 'y/f.ts', outcome: 'incomplete', unknownReason: null, statements: 0, outsideGrammar: 0 }]);
    expect([member.coverage, member.facts.length, member.edges.length]).toEqual(['unknown', 0, 0]);
  });
});

describe('importFacts: an undecidable target address (scenario "An undecidable target address is Unknown, never passed over")', () => {
  /** The bound screen, except that `lib/y.ts` takes the path outcome `unknown-extraction-class`. */
  const screened = (): DossierScreen => ({ ...V2, screenPath: (p: string) => (p === 'lib/y.ts' ? 'unknown-extraction-class' : V2.screenPath(p)) });
  const TREE = (y: Tree[string] | undefined): Tree => ({
    'app/package.json': '{ "name": "app" }\n', 'lib/y/package.json': '{ "name": "y" }\n',
    'app/m.ts': "import { y } from '../lib/y';\n", 'lib/y/index.ts': '', ...(y === undefined ? {} : { 'lib/y.ts': y }),
  });
  const first = async (tree: Tree, screen?: DossierScreen) => (await importsOf(tree, screen)).member.facts[0];

  it('is target-undecidable where the first address is held but not admitted, naming neither address', async () => {
    const { member, asked } = await importsOf(TREE(''), screened());
    expect(outcomes(member)).toEqual([['app/m.ts', [1, 1], 'import', 'unknown', null, null, 'target-undecidable']]);
    expect(member.facts[0]!.epistemic).toBe('unknown');
    expect(asked).toEqual(['app/m.ts', 'lib/y/index.ts']);
  });

  it('passes an absent address or a tree over, and resolves to lib/y/index.ts\'s unit', async () => {
    for (const y of [undefined, { mode: '040000' }]) {
      expect(await first(TREE(y)), JSON.stringify(y)).toMatchObject({ outcome: 'edge', from: 'app/package.json', to: 'lib/y/package.json', unknownReason: null });
    }
  });

  it('is target-undecidable where the address is a symbolic link, or the path runs through one', async () => {
    expect(await first(TREE({ mode: '120000' }))).toMatchObject({ outcome: 'unknown', to: null, unknownReason: 'target-undecidable' });
    const { member, asked } = await importsOf({ 'app/package.json': '{ "name": "app" }\n', 'app/link': { mode: '120000' }, 'app/m.ts': "import { w } from './link/../w';\n", 'app/w.ts': '' });
    expect(member.facts[0]).toMatchObject({ outcome: 'unknown', unknownReason: 'target-undecidable' });
    expect(asked).toEqual(['app/m.ts', 'app/w.ts']);
  });
});

describe('importFacts: a package name (scenario "A package name resolves only against complete manifest facts")', () => {
  const units = (extra: Tree, body = "import { z } from '@w/z';\n"): Tree => ({ 'units/q/package.json': '{ "name": "@w/q" }\n', 'units/q/i.ts': body, ...extra });
  const one = async (tree: Tree) => (await importsOf(tree)).member.facts[0]!;

  it('gives edge, same-unit, ambiguous, external and undecidable by the manifest facts', async () => {
    expect(await one(units({ 'units/z/package.json': '{ "name": "@w/z" }\n' }))).toMatchObject({ outcome: 'edge', to: 'units/z/package.json' });
    expect(await one(units({ 'units/z/package.json': '{ "name": "@w/z" }\n' }, "import { z } from '@w/z/sub';\n"))).toMatchObject({ outcome: 'edge', to: 'units/z/package.json' });
    expect(await one({ 'units/z/package.json': '{ "name": "@w/z" }\n', 'units/z/i.ts': "import { z } from '@w/z';\n" })).toMatchObject({ outcome: 'same-unit', to: 'units/z/package.json' });
    expect(await one(units({ 'units/z/package.json': '{ "name": "@w/z" }\n', 'units/z2/package.json': '{ "name": "@w/z" }\n' }))).toMatchObject({ outcome: 'unknown', to: null, unknownReason: 'target-ambiguous' });
    expect(await one(units({}))).toMatchObject({ outcome: 'external', to: null, unknownReason: null });
    expect(await one(units({ 'units/u/package.json': '{ "name": ' }))).toMatchObject({ outcome: 'unknown', unknownReason: 'target-undecidable' });
  });

  it('is undecidable, never external or edge, beside a set-apart package.json or an Unknown one', async () => {
    expect(await one(units({ 'tests/fixture/package.json': '{ "name": "f" }\n' }))).toMatchObject({ outcome: 'unknown', unknownReason: 'target-undecidable' });
    expect(await one(units({ 'units/z/package.json': '{ "name": "@w/z" }\n', 'units/u/package.json': '{ "name": ' }))).toMatchObject({ outcome: 'unknown', unknownReason: 'target-undecidable' });
  });
});

describe('importFacts: the source unit (scenario "An undecidable source unit is Unknown")', () => {
  it('is source-unit-undecidable where the nearest package.json is a symbolic link; takes the root one where the directory holds none', async () => {
    const statement = "import { a } from './a';\n";
    expect((await importsOf({ 'package.json': '{ "name": "r" }\n', 'u/package.json': { mode: '120000' }, 'u/f.ts': statement, 'u/a.ts': '' })).member.facts.map((f) => [f.path, f.outcome, f.unknownReason]))
      .toEqual([['u/f.ts', 'unknown', 'source-unit-undecidable']]);
    expect((await importsOf({ 'package.json': '{ "name": "r" }\n', 'u/f.ts': statement, 'u/a.ts': '' })).member.facts[0]).toMatchObject({ outcome: 'same-unit', from: 'package.json', to: 'package.json' });
    const { member } = await importsOf({ 'u/f.ts': statement, 'u/a.ts': '' });
    expect([member.facts[0]!.outcome, member.facts[0]!.epistemic, member.statements.noUnit, member.statements.unknown, member.edges.length]).toEqual(['no-unit', 'inferred', 1, 0, 0]);
  });
});

describe('importFacts: read limits (scenario "Read limits are inclusive and stop in path order")', () => {
  const sized = (n: number): string => `//${'x'.repeat(n - 3)}\n`;

  it('scans a 262,144-byte file and names a 262,145-byte one too-large', async () => {
    const { member } = await importsOf({ 'a.ts': sized(262_144), 'b.ts': sized(262_145) });
    expect(member.files).toEqual([scannedFile('a.ts', 0), unknownFile('b.ts', 'too-large')]);
    expect([member.unknown, member.coverage]).toEqual([1, 'partial']);
  });

  it('reads 2,000 named files and names the 2,001st over-read-limit without reading it', async () => {
    const tree: Tree = {};
    for (let i = 0; i < 2_001; i++) tree[`f/${String(i).padStart(4, '0')}.ts`] = '';
    const { member, asked } = await importsOf(tree);
    expect([member.scanned, member.unknown, asked.length, asked.includes('f/2000.ts')]).toEqual([2_000, 1, 2_000, false]);
    expect(member.files[member.files.length - 1]).toEqual(unknownFile('f/2000.ts', 'over-read-limit'));
    expect(member.coverage).toBe('partial');
    delete tree['f/2000.ts'];
    expect((await importsOf(tree)).member.coverage).toBe('complete');
  });

  it('scans files whose bytes reach 16,777,216 exactly, and names the one that passes the total and every later file over-read-limit', async () => {
    const tree: Tree = {};
    for (let i = 0; i < 64; i++) tree[`f/${String(i).padStart(2, '0')}.ts`] = sized(262_144);
    expect((await importsOf(tree)).member.coverage).toBe('complete');
    tree['f/64.ts'] = '//\n';
    tree['f/65.ts'] = '';
    const { member, asked } = await importsOf(tree);
    expect([member.scanned, member.unknown, member.coverage]).toEqual([64, 2, 'partial']);
    expect(member.files.slice(-2)).toEqual([unknownFile('f/64.ts', 'over-read-limit'), unknownFile('f/65.ts', 'over-read-limit')]);
    expect(asked.includes('f/65.ts')).toBe(false);
  }, 60_000);
});

describe('importFacts: the listing budget (scenario "Listing stops at the byte budget and counts the rest")', () => {
  it('lists edges, then files, then facts as the longest prefixes within 1,900,000 bytes and counts every statement', async () => {
    const body = "import './a';\n".repeat(8_000);
    const { member } = await importsOf({ 'package.json': '{ "name": "r" }\n', 'a.ts': '', 'f.ts': body });
    expect([member.statements.sameUnit, member.scanned, member.edges.length, member.files.length, member.filesNotListed]).toEqual([8_000, 2, 0, 2, 0]);
    expect(member.factsNotListed).toBeGreaterThan(0);
    expect(member.facts.length + member.factsNotListed).toBe(8_000);
    const used = [...member.files, ...member.facts].reduce((sum, entry) => sum + listedEntrySize(entry), 0);
    expect(used).toBeLessThanOrEqual(1_900_000);
    const next = { ...member.facts[0]!, id: `_import-${member.facts.length + 1}`, lines: [member.facts.length + 1, member.facts.length + 1] };
    expect(used + listedEntrySize(next)).toBeGreaterThan(1_900_000);
    expect(new TextEncoder().encode(JSON.stringify(member, null, 2)).length).toBeLessThan(2_000_000);
  }, 60_000);

  it('stops each list at the first entry past the budget, in list order', () => {
    const size = listedEntrySize({ k: 1 });
    expect(size).toBe(Buffer.byteLength('      {\n        "k": 1\n      },\n'));
    expect(listWithinBudget([[{ k: 1 }], [{ k: 1 }, { k: 1 }], [{ k: 1 }]], size * 2)).toEqual([[{ k: 1 }], [{ k: 1 }], []]);
  });
});

describe('importFacts: a byte-order mark and CRLF lines (scenario "A byte-order mark and CRLF lines keep line numbers citable")', () => {
  it('gives [2, 2] and [4, 6] with CRLF and U+FEFF, and the same facts with LF and none', async () => {
    const crlf = "\ufeff// head\r\nimport { a } from '../x/a';\r\n\r\nexport {\r\n  b,\r\n} from './b';\r\n";
    const lf = "// head\nimport { a } from '../x/a';\n\nexport {\n  b,\n} from './b';\n";
    const tree = (body: string): Tree => ({ 'y/f.ts': body, 'x/a.ts': '', 'y/b.ts': '' });
    const withCrlf = (await importsOf(tree(crlf))).member;
    expect(withCrlf.files.find((f) => f.path === 'y/f.ts')).toEqual(scannedFile('y/f.ts', 2));
    expect(withCrlf.facts.map((f) => [f.form, f.lines])).toEqual([['import', [2, 2]], ['re-export', [4, 6]]]);
    for (const fact of withCrlf.facts) expect(fact.lines[1]).toBeLessThanOrEqual(lineCountOf(crlf));
    expect((await importsOf(tree(lf))).member.facts).toEqual(withCrlf.facts);
  });
});
