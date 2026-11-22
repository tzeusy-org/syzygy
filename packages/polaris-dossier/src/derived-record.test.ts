import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { GIT_ENV, tempDir } from '@syzygy/test-kit';
import { deriveTreeFacts } from './derive.js';
import { currencyPolicyOf, derivedStructureAt, encodeDerivedRecord, readCurrencyPolicy, readDerivedRecord } from './derived-record.js';
import { patchFs } from './fs-patch.testkit.js';
import { GitObjectReadRefusal } from './git-object-reader.js';

// syzygy-3efd.27: the derived-structure record and its currency (REQ-polaris-generation-034 version 2.3). Expected facts are literals
// worked out by hand from the fixture's paths and modes; the adopted digest is the literal the requirement states.

const REAL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const POLICY_PATH = '.syzygy/governance/policies/POLARIS-DOSSIER-DERIVED-FACT-CURRENCY-POLICY-v1.json';
const ADOPTED = fs.readFileSync(path.join(REAL_ROOT, POLICY_PATH));
const ADOPTED_SHA256 = '95a3aa132041aa5dd8f860e8ce4c92b3e3c3380ebef4b1ada19bee6b8f50865e';
const REV = 'a'.repeat(40), OTHER = 'b'.repeat(40);
const hex = (bytes: Uint8Array | string): string => createHash('sha256').update(bytes).digest('hex');

/** Blob, symlink, executable, submodule and tree entries; secret paths by name (`token=`) and by a directory prefix (`keys`). */
const TREE = [
  { path: 'README.md', mode: '100644' }, { path: 'run.sh', mode: '100755' }, { path: 'link', mode: '120000' }, { path: 'vendor-sub', mode: '160000' },
  { path: 'lib/a.ts', mode: '100644' }, { path: 'lib/b/c.ts', mode: '100644' }, { path: 'lib/sub', mode: '160000' }, { path: 'docs', mode: '040000' },
  { path: 'Zeta/x', mode: '100644' }, { path: 'secrets/token=abcdefghijk', mode: '100644' }, { path: 'keys/ok.txt', mode: '100644' },
  { path: 'mixed/token=abcdefghijk', mode: '100644' }, { path: 'mixed/fine.txt', mode: '100644' },
];
const isSecret = (p: string): boolean => p.includes('token=') || p === 'keys';
const EXPECT = { repositoryId: 'kestrel', isSecretPath: isSecret };
const R = { rule: 'top-level-unit', ruleVersion: 1 };
const FACTS = [
  { id: '_tree-root', fact: 'tree-root', ...R, path: '.', rootFiles: 3 },
  { id: '_tree-unit-1', fact: 'top-level-unit', ...R, path: 'Zeta', files: 1 },
  { id: '_tree-unit-2', fact: 'top-level-unit', ...R, path: 'lib', files: 2 },
  { id: '_tree-unit-3', fact: 'top-level-unit', ...R, path: 'mixed', files: 1 },
  { id: '_tree-contains-1', fact: 'contains', ...R, path: 'Zeta', from: '_tree-root', to: '_tree-unit-1' },
  { id: '_tree-contains-2', fact: 'contains', ...R, path: 'lib', from: '_tree-root', to: '_tree-unit-2' },
  { id: '_tree-contains-3', fact: 'contains', ...R, path: 'mixed', from: '_tree-root', to: '_tree-unit-3' },
];

describe('rule top-level-unit version 1', () => {
  it('derives the root, each top-level directory and each containment from paths and modes alone, naming no secret path', () => {
    const derived = deriveTreeFacts(TREE, isSecret);
    expect(derived).toEqual({ files: 10, secretPathsLeftOut: 3, submodules: 2, facts: FACTS, unitsNotListed: 0 });
    // A directory holding only secret-matching paths (`secrets`, `keys`) has no fact, and no secret-matching name is anywhere.
    const text = JSON.stringify(derived);
    for (const name of ['secrets', 'keys', 'token=', 'abcdefghijk', 'vendor-sub', 'docs']) expect(text).not.toContain(name);
  });

  it('lists the first 250 directories by raw segment in code-unit order and counts the rest', () => {
    const names = Array.from({ length: 252 }, (_, i) => `d${String(i).padStart(3, '0')}`);
    const derived = deriveTreeFacts(names.map((name) => ({ path: `${name}/f`, mode: '100644' })), () => false);
    expect(derived.unitsNotListed).toBe(2);
    expect(derived.facts.length).toBe(1 + 250 + 250);
    expect(derived.facts[250]).toEqual({ id: '_tree-unit-250', fact: 'top-level-unit', ...R, path: 'd249', files: 1 });
    expect(derived.facts[500]).toEqual({ id: '_tree-contains-250', fact: 'contains', ...R, path: 'd249', from: '_tree-root', to: '_tree-unit-250' });
    expect(JSON.stringify(derived)).not.toContain('d250');
    expect(deriveTreeFacts(names.slice(0, 250).map((name) => ({ path: `${name}/f`, mode: '100644' })), () => false).unitsNotListed).toBe(0);
  });

  it('keeps a raw segment as it is, quotes and all, and tests every directory prefix against the detector', () => {
    const derived = deriveTreeFacts([{ path: 'a "b"/c/d', mode: '100644' }, { path: 'x/y/z', mode: '100644' }], (p) => p === 'x/y');
    expect(derived.facts.map((fact) => fact.path)).toEqual(['.', 'a "b"', 'a "b"']);
    expect(derived.secretPathsLeftOut).toBe(1);
  });
});

describe('the record', () => {
  it('is two-space JSON with one trailing newline and its members in the stated order', () => {
    const text = encodeDerivedRecord({ repositoryId: 'kestrel', revision: REV, capturedAt: '2026-11-21T00:00:00.000Z' }, deriveTreeFacts([{ path: 'a/b', mode: '100644' }], () => false));
    expect(text).toBe(`{
  "format": "polaris-dossier-derived-structure/1",
  "repositoryId": "kestrel",
  "revision": "${REV}",
  "capturedAt": "2026-11-21T00:00:00.000Z",
  "scope": "tree-metadata: the paths and modes of the pinned tree's entries; no file body, size or object id",
  "producer": "syzygy dossier check",
  "rules": [
    {
      "id": "top-level-unit",
      "version": 1
    }
  ],
  "state": "derived",
  "files": 1,
  "secretPathsLeftOut": 0,
  "submodules": 0,
  "facts": [
    {
      "id": "_tree-root",
      "fact": "tree-root",
      "rule": "top-level-unit",
      "ruleVersion": 1,
      "path": ".",
      "rootFiles": 0
    },
    {
      "id": "_tree-unit-1",
      "fact": "top-level-unit",
      "rule": "top-level-unit",
      "ruleVersion": 1,
      "path": "a",
      "files": 1
    },
    {
      "id": "_tree-contains-1",
      "fact": "contains",
      "rule": "top-level-unit",
      "ruleVersion": 1,
      "path": "a",
      "from": "_tree-root",
      "to": "_tree-unit-1"
    }
  ],
  "unitsNotListed": 0
}
`);
    const unknown = JSON.parse(encodeDerivedRecord({ repositoryId: 'kestrel', revision: REV, capturedAt: '2026-11-21T00:00:00.000Z' }, { why: 'the pinned tree could not be listed (object-missing)' }));
    expect(Object.keys(unknown)).toEqual(['format', 'repositoryId', 'revision', 'capturedAt', 'scope', 'producer', 'rules', 'state', 'why']);
    expect(unknown).toMatchObject({ state: 'unknown', why: 'the pinned tree could not be listed (object-missing)' });
  });

  const runWith = (text: string | Uint8Array | null): string => {
    const run = tempDir('derived-record-run-');
    if (text !== null) { fs.mkdirSync(path.join(run, 'derived')); fs.writeFileSync(path.join(run, 'derived', 'rev-0.json'), text); }
    return run;
  };
  const kept = (edit: (doc: Record<string, any>) => void = () => {}): string => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const doc = JSON.parse(encodeDerivedRecord({ repositoryId: 'kestrel', revision: REV, capturedAt: '2026-11-21T00:00:00.000Z' }, deriveTreeFacts(TREE, isSecret)));
    edit(doc);
    return `${JSON.stringify(doc, null, 2)}\n`;
  };

  it('is read back with its exact text and the digest of its bytes, and refused where any member is malformed', () => {
    const text = kept();
    const read = readDerivedRecord(runWith(text), 0, EXPECT);
    expect(read).toMatchObject({ text, sha256: hex(text), revision: REV, state: 'derived', unitsNotListed: 0 });
    expect(read!.facts).toEqual(FACTS);
    expect(readDerivedRecord(runWith(null), 0, EXPECT)).toBeUndefined();
    expect(readDerivedRecord(runWith(text), 1, EXPECT)).toBeUndefined();
    const malformed: [string, (doc: Record<string, any>) => void][] = [ // eslint-disable-line @typescript-eslint/no-explicit-any
      ['format', (doc) => { doc['format'] = 'polaris-dossier-derived-structure/2'; }],
      ['revision', (doc) => { doc['revision'] = 7; }],
      ['capturedAt', (doc) => { delete doc['capturedAt']; }],
      ['state', (doc) => { doc['state'] = 'observed'; }],
      ['unitsNotListed', (doc) => { doc['unitsNotListed'] = -1; }],
      ['facts', (doc) => { doc['facts'] = {}; }],
      ['root first', (doc) => { doc['facts'].reverse(); }],
      ['unique ids', (doc) => { doc['facts'][2].id = '_tree-unit-1'; }],
      ['a count', (doc) => { doc['facts'][1].files = 1.5; }],
      ['a fact kind', (doc) => { doc['facts'][1].fact = 'depends-on'; }],
      ['a containment source', (doc) => { doc['facts'][4].from = '_tree-unit-2'; }],
      ['a containment target', (doc) => { doc['facts'][4].to = 3; }],
      ['the root identity', (doc) => { doc['facts'][0].id = '_tree-root-2'; }],
      ['the root path', (doc) => { doc['facts'][0].path = 'lib'; }],
      ['a rule', (doc) => { doc['facts'][1].rule = 1; }],
      ['a rule version', (doc) => { doc['facts'][1].ruleVersion = '1'; }],
      ['a path', (doc) => { doc['facts'][1].path = null; }],
    ];
    for (const [what, edit] of malformed) expect(readDerivedRecord(runWith(kept(edit)), 0, EXPECT), what).toBeUndefined();
    // Only exactly what check writes is a record: no member added, moved or respaced, and Syzygy's own forms for every value shown.
    const altered: [string, (doc: Record<string, any>) => void][] = [ // eslint-disable-line @typescript-eslint/no-explicit-any
      ['an added member', (doc) => { doc['sizes'] = { 'lib/a.ts': 120 }; }],
      ['an added fact member', (doc) => { doc['facts'][1].objectId = 'f'.repeat(40); }],
      ['a foreign repository', (doc) => { doc['repositoryId'] = 'someone-else'; }],
      ['another scope', (doc) => { doc['scope'] = 'the whole repository, bodies included'; }],
      ['another producer', (doc) => { doc['producer'] = 'the authoring session'; }],
      ['other rules', (doc) => { doc['rules'] = [{ id: 'top-level-unit', version: 2 }]; }],
      ['a revision that is no object id', (doc) => { doc['revision'] = 'see the README'; }],
      ['a capture time that is no instant', (doc) => { doc['capturedAt'] = 'yesterday <b>'; }],
      ['an identity of another form', (doc) => { doc['facts'][1].id = '_tree-unit-<b>&'; }],
      ['a containment target of another form', (doc) => { doc['facts'][4].to = '_tree-root'; }],
      ['a path of two segments', (doc) => { doc['facts'][1].path = 'lib/b'; }],
      ['an empty path', (doc) => { doc['facts'][1].path = ''; }],
      ['a rule of another form', (doc) => { doc['facts'][1].rule = 'Top level <b>'; }],
      ['a secret-matching path in a stale fact', (doc) => { doc['facts'][1].path = 'token=abcdefghijk'; doc['facts'][4].path = 'token=abcdefghijk'; }],
      ['a path under a secret-matching name', (doc) => { doc['facts'][2].path = 'keys'; }],
    ];
    for (const [what, edit] of altered) expect(readDerivedRecord(runWith(kept(edit)), 0, EXPECT), what).toBeUndefined();
    const doc = JSON.parse(text);
    expect(readDerivedRecord(runWith(`${JSON.stringify(doc, null, 2)}`), 0, EXPECT), 'no trailing newline').toBeUndefined();
    expect(readDerivedRecord(runWith(`${JSON.stringify(doc, null, 4)}\n`), 0, EXPECT), 'respaced').toBeUndefined();
    const { format, ...rest } = doc;
    expect(readDerivedRecord(runWith(`${JSON.stringify({ ...rest, format }, null, 2)}\n`), 0, EXPECT), 'members moved').toBeUndefined();
    expect(readDerivedRecord(runWith(text), 0, { ...EXPECT, repositoryId: 'someone-else' }), 'another run').toBeUndefined();
    expect(readDerivedRecord(runWith(text), 0, { ...EXPECT, isSecretPath: (p) => isSecret(p) || p === 'mixed' }), 'a path the screen holds secret').toBeUndefined();
    const unknown = encodeDerivedRecord({ repositoryId: 'kestrel', revision: REV, capturedAt: '2026-11-21T00:00:00.000Z' }, { why: 'the pinned tree could not be listed (object-missing)' });
    expect(readDerivedRecord(runWith(unknown), 0, EXPECT)).toMatchObject({ state: 'unknown', facts: [] });
    expect(readDerivedRecord(runWith(unknown.replace('"why"', '"files": 3,\n  "why"')), 0, EXPECT), 'an Unknown record with a member added').toBeUndefined();
    expect(readDerivedRecord(runWith(new Uint8Array([0x7b, 0xff, 0x7d])), 0, EXPECT)).toBeUndefined();
    expect(readDerivedRecord(runWith('not json'), 0, EXPECT)).toBeUndefined();
    // A byte-order mark is never stripped, so bytes that are not the record's exact JSON do not read as a record.
    expect(readDerivedRecord(runWith(`\u{feff}${text}`), 0, EXPECT)).toBeUndefined();
  });

  describe('at a render', () => {
    const reader = (entries = TREE) => ({ listTree: async () => entries });
    const policy = currencyPolicyOf(ADOPTED);
    const at = (text: string | null, overrides: Partial<Parameters<typeof derivedStructureAt>[0]> = {}) =>
      derivedStructureAt({ run: runWith(text), revision: 0, pinned: REV, repositoryId: 'kestrel', reader: reader(), isSecretPath: isSecret, policy, ...overrides });
    const outcomes = (structure: Awaited<ReturnType<typeof derivedStructureAt>>): string[] =>
      structure.state === 'derived' ? structure.facts.map((fact) => `${fact.id} ${fact.epistemic} ${fact.unknownReason}`) : [];

    it('labels every fact Observed while the adopted bound is declared and the record is current', async () => {
      const text = kept();
      const structure = await at(text);
      expect(structure).toMatchObject({
        state: 'derived', revision: REV, recordRevision: REV, capturedAt: '2026-11-21T00:00:00.000Z', recordText: text, sha256: hex(text), unitsNotListed: 0,
        currencyPolicy: { policyId: 'POLARIS-DOSSIER-DERIVED-FACT-CURRENCY-POLICY-v1', policyVersion: '1.0.0', sha256: ADOPTED_SHA256 },
      });
      expect(outcomes(structure)).toEqual(FACTS.map((fact) => `${fact.id} observed null`));
      expect(structure.state === 'derived' && structure.facts.map((fact) => [fact.count, fact.to])).toEqual([[3, null], [1, null], [2, null], [1, null], [null, '_tree-unit-1'], [null, '_tree-unit-2'], [null, '_tree-unit-3']]);
    });

    it('labels every fact Unknown (no-currency-bound-declared) with no policy, and names none', async () => {
      const structure = await at(kept(), { policy: null });
      expect(outcomes(structure)).toEqual(FACTS.map((fact) => `${fact.id} unknown no-currency-bound-declared`));
      expect(structure).toMatchObject({ currencyPolicy: null });
    });

    // Version 2.8 (syzygy-3efd.67): until then a fact of another rule version rendered Unknown (no-currency-bound-declared) beside the
    // rest stale; now a record naming a rule or version the render does not use, or a path it does not re-derive, is no readable record.
    // Version 2.10: such a record is an entry that is no readable record, so the state is `unusable`, never `missing`.
    it('states unusable for a record naming another rule or version, or a path the render does not re-derive (versions 2.8, 2.10)', async () => {
      const UNUSABLE = { state: 'unusable', revision: REV, unknownReason: 'missing-evidence' };
      const planted: [string, (doc: Record<string, any>) => void][] = [ // eslint-disable-line @typescript-eslint/no-explicit-any
        ['a unit fact of rule version 2', (doc) => { doc['facts'][1].ruleVersion = 2; }],
        ['the root of rule version 0', (doc) => { doc['facts'][0].ruleVersion = 0; }],
        ['a containment of another rule', (doc) => { doc['facts'][4].rule = 'zq-planted-rule'; }],
        ['the root of another rule', (doc) => { doc['facts'][0].rule = 'zq-planted-rule'; }],
        ['a non-secret directory the tree does not hold', (doc) => { doc['facts'][1].path = 'zq-planted-dir'; doc['facts'][4].path = 'zq-planted-dir'; }],
        ['a containment alone naming it', (doc) => { doc['facts'][4].path = 'zq-planted-dir'; }],
        ['a unit alone naming it', (doc) => { doc['facts'][3].path = 'zq-planted-dir'; }],
        ['a directory the tree holds only below the top level', (doc) => { doc['facts'][2].path = 'b'; doc['facts'][5].path = 'b'; }],
        ['a unit and containment naming the root path', (doc) => { doc['facts'][3].path = '.'; doc['facts'][6].path = '.'; }],
      ];
      for (const [what, edit] of planted) {
        const text = kept(edit);
        // Each planted record passes every reading rule of the record itself; only the render's own re-derivation refuses it.
        expect(readDerivedRecord(runWith(text), 0, EXPECT), what).toMatchObject({ state: 'derived' });
        const structure = await at(text);
        expect(structure, what).toEqual(UNUSABLE);
        expect(JSON.stringify(structure), what).not.toContain('zq-planted');
      }
      // Under no policy, and for a record of another revision, the same: the refusal does not wait on currency.
      expect(await at(kept((doc) => { doc['facts'][1].path = 'zq-planted-dir'; doc['facts'][4].path = 'zq-planted-dir'; }), { policy: null })).toEqual(UNUSABLE);
      expect(await at(kept((doc) => { doc['revision'] = OTHER; doc['facts'][4].rule = 'zq-planted-rule'; }))).toEqual(UNUSABLE);
      // A render that cannot list the tree says so, whatever the record names.
      const refused = { listTree: async () => { throw new GitObjectReadRefusal('object-missing', 'gone'); } };
      expect(await at(kept((doc) => { doc['facts'][4].rule = 'zq-planted-rule'; }), { reader: refused })).toEqual({ state: 'unknown', revision: REV, unknownReason: 'source-uncaptured-or-unreachable' });
    });

    it('states unusable for a record naming a directory the tree holds past the render\'s listing of 250, and reads one within it (versions 2.8, 2.10)', async () => {
      const names = Array.from({ length: 251 }, (_, i) => `d${String(i).padStart(3, '0')}`);
      const wide = names.map((name) => ({ path: `${name}/f`, mode: '100644' }));
      const record = (edit: (doc: Record<string, any>) => void): string => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const doc = JSON.parse(encodeDerivedRecord({ repositoryId: 'kestrel', revision: REV, capturedAt: '2026-11-21T00:00:00.000Z' }, deriveTreeFacts(wide, () => false)));
        edit(doc);
        return `${JSON.stringify(doc, null, 2)}\n`;
      };
      const wideAt = (text: string) => derivedStructureAt({ run: runWith(text), revision: 0, pinned: REV, repositoryId: 'kestrel', reader: reader(wide), isSecretPath: () => false, policy });
      // Facts 250 and 500 are the 250th unit (d249) and its containment; d250 is in the tree but counted, not listed.
      const within = await wideAt(record(() => {}));
      expect(within.state === 'derived' && within.facts.every((fact) => fact.epistemic === 'observed')).toBe(true);
      expect(await wideAt(record((doc) => { doc['facts'][250].path = 'd250'; doc['facts'][500].path = 'd250'; }))).toEqual({ state: 'unusable', revision: REV, unknownReason: 'missing-evidence' });
    });

    it('still renders stale, with the names this render derived, a record of other facts whose every path the render derives (version 2.8)', async () => {
      // A record that lists two of the three units the tree holds, and a record whose units are swapped between two paths.
      const fewer = kept((doc) => { doc['facts'] = [doc['facts'][0], doc['facts'][1], doc['facts'][2], doc['facts'][4], doc['facts'][5]]; });
      expect(outcomes(await at(fewer))).toEqual(['_tree-root', '_tree-unit-1', '_tree-unit-2', '_tree-contains-1', '_tree-contains-2'].map((id) => `${id} unknown stale-beyond-currency-bound`));
      const swapped = kept((doc) => { doc['facts'][1].path = 'lib'; doc['facts'][2].path = 'Zeta'; });
      const structure = await at(swapped);
      expect(outcomes(structure)).toEqual(FACTS.map((fact) => `${fact.id} unknown stale-beyond-currency-bound`));
      expect(structure.state === 'derived' && structure.facts.map((fact) => fact.path)).toEqual(['.', 'lib', 'Zeta', 'mixed', 'Zeta', 'lib', 'mixed']);
    });

    it('labels every fact Unknown (stale-beyond-currency-bound) for a record of another revision or with facts the render does not re-derive', async () => {
      expect(outcomes(await at(kept((doc) => { doc['revision'] = OTHER; })))).toEqual(FACTS.map((fact) => `${fact.id} unknown stale-beyond-currency-bound`));
      expect(outcomes(await at(kept((doc) => { doc['facts'][2].files = 9; })))).toEqual(FACTS.map((fact) => `${fact.id} unknown stale-beyond-currency-bound`));
      expect(outcomes(await at(kept(), { reader: reader([...TREE, { path: 'new/file', mode: '100644' }]) }))).toEqual(FACTS.map((fact) => `${fact.id} unknown stale-beyond-currency-bound`));
      expect(outcomes(await at(kept((doc) => { doc['unitsNotListed'] = 1; })))).toEqual(FACTS.map((fact) => `${fact.id} unknown stale-beyond-currency-bound`));
    });

    it('states missing, or unknown, where there is no record, the record is Unknown, or the tree cannot be listed', async () => {
      expect(await at(null)).toEqual({ state: 'missing', revision: REV, unknownReason: 'missing-evidence' });
      const unknown = encodeDerivedRecord({ repositoryId: 'kestrel', revision: REV, capturedAt: '2026-11-21T00:00:00.000Z' }, { why: 'the pinned tree could not be listed (object-missing)' });
      expect(await at(unknown)).toEqual({ state: 'unknown', revision: REV, unknownReason: 'source-uncaptured-or-unreachable' });
      const refused = { listTree: async () => { throw new GitObjectReadRefusal('object-missing', 'gone'); } };
      expect(await at(kept(), { reader: refused })).toEqual({ state: 'unknown', revision: REV, unknownReason: 'source-uncaptured-or-unreachable' });
      await expect(at(kept(), { reader: { listTree: async () => { throw new Error('a fault, not a refusal'); } } })).rejects.toThrow('a fault, not a refusal');
    });

    // Version 2.10 (syzygy-3efd.73 (b)): `missing` only where examining the path without following a link reports nothing there.
    it('states unusable for a record check wrote that a changed screen or Syzygy version cannot use, and missing only where nothing stands (version 2.10)', async () => {
      const UNUSABLE = { state: 'unusable', revision: REV, unknownReason: 'missing-evidence' };
      const MISSING = { state: 'missing', revision: REV, unknownReason: 'missing-evidence' };
      // The record check wrote, read under a screen that now matches one of its directories as a secret path.
      expect(await at(kept(), { isSecretPath: (p) => isSecret(p) || p === 'lib' })).toEqual(UNUSABLE);
      // The same record, under a later rule version the render derives other units by: a directory the render no longer derives.
      expect(await at(kept(), { reader: reader(TREE.filter((entry) => !entry.path.startsWith('Zeta/'))) })).toEqual(UNUSABLE);
      const at2 = (plant: (dir: string) => void) => {
        const run = tempDir('derived-record-run-');
        plant(path.join(run, 'derived'));
        return derivedStructureAt({ run, revision: 0, pinned: REV, repositoryId: 'kestrel', reader: reader(), isSecretPath: isSecret, policy });
      };
      const file = (dir: string): string => path.join(dir, 'rev-0.json');
      expect(await at2((dir) => { fs.mkdirSync(dir); fs.mkdirSync(file(dir)); }), 'a directory').toEqual(UNUSABLE);
      expect(await at2((dir) => { fs.mkdirSync(dir); execFileSync('mkfifo', [file(dir)]); }), 'a FIFO').toEqual(UNUSABLE);
      expect(await at2((dir) => { fs.mkdirSync(dir); fs.symlinkSync('/dev/zero', file(dir)); }), 'a device').toEqual(UNUSABLE);
      expect(await at2((dir) => { fs.mkdirSync(dir); fs.symlinkSync('nowhere', file(dir)); }), 'a dangling link').toEqual(UNUSABLE);
      expect(await at2((dir) => { fs.symlinkSync(dir, dir); }), 'a path that cannot be examined').toEqual(UNUSABLE);
      expect(await at2((dir) => { fs.mkdirSync(dir); fs.writeFileSync(file(dir), `${kept()}${' '.repeat(4_194_304)}`); }), 'past the bound').toEqual(UNUSABLE);
      expect(await at2(() => {}), 'no directory').toEqual(MISSING);
      expect(await at2((dir) => { fs.mkdirSync(dir); }), 'no entry').toEqual(MISSING);
      expect(await at2((dir) => { fs.writeFileSync(dir, 'a file\n'); }), 'a parent that is a file').toEqual(MISSING);
    });

    it('refuses a derived record past its 4,194,304-byte bound from its size alone, reading no byte of it (version 2.10)', async () => {
      const run = tempDir('derived-record-run-');
      fs.mkdirSync(path.join(run, 'derived'));
      const file = path.join(run, 'derived', 'rev-0.json');
      fs.writeFileSync(file, kept());
      // A sparse file of 64 MiB: its descriptor's size refuses it.
      fs.truncateSync(file, 67_108_864);
      const fds = new Set<number>();
      let bytes = 0;
      const restoreOpen = patchFs('openSync', (original) => ((target: fs.PathLike, ...rest: unknown[]) => {
        const fd = (original as (...args: unknown[]) => number)(target, ...rest);
        fds.delete(fd);
        if (target === file) fds.add(fd);
        return fd;
      }) as typeof original);
      const restoreRead = patchFs('readSync', (original) => ((fd: number, ...rest: unknown[]) => {
        const read = (original as (...args: unknown[]) => number)(fd, ...rest);
        if (fds.has(fd)) bytes += read;
        return read;
      }) as typeof original);
      let structure;
      try {
        expect(readDerivedRecord(run, 0, EXPECT)).toBeUndefined();
        structure = await derivedStructureAt({ run, revision: 0, pinned: REV, repositoryId: 'kestrel', reader: reader(), isSecretPath: isSecret, policy });
      } finally { restoreRead(); restoreOpen(); }
      expect(fds.size).toBe(1);
      expect(bytes).toBe(0);
      expect(structure).toEqual({ state: 'unusable', revision: REV, unknownReason: 'missing-evidence' });
    });
  });
});

describe('the currency policy', () => {
  it('declares pinned-revision for top-level-unit version 1 only, at the adopted digest only', () => {
    expect(hex(ADOPTED)).toBe(ADOPTED_SHA256);
    const policy = currencyPolicyOf(ADOPTED)!;
    expect(policy).toMatchObject({ policyId: 'POLARIS-DOSSIER-DERIVED-FACT-CURRENCY-POLICY-v1', policyVersion: '1.0.0', sha256: ADOPTED_SHA256 });
    expect([...policy.bounds]).toEqual([['top-level-unit@1', 'pinned-revision']]);
    // One byte more is another digest: no bound.
    expect(currencyPolicyOf(Buffer.concat([ADOPTED, Buffer.from(' ')]))).toBeNull();
    // The same declarations with another rule's bound added are other bytes, and declare nothing.
    const widened = JSON.parse(ADOPTED.toString('utf8'));
    widened.declarations.push({ rule: 'vendored-path', version: 1, currencyBound: 'pinned-revision' });
    expect(currencyPolicyOf(Buffer.from(JSON.stringify(widened, null, 2)))).toBeNull();
  });

  const root = (policy: Buffer | null, after?: Buffer | 'delete'): string => {
    const dir = tempDir('derived-currency-root-');
    const git = (...args: string[]): void => { execFileSync('git', ['-C', dir, ...args], { env: GIT_ENV, stdio: 'ignore' }); };
    git('init', '-q', '-b', 'main');
    fs.writeFileSync(path.join(dir, 'README.md'), 'x\n');
    if (policy !== null) { fs.mkdirSync(path.dirname(path.join(dir, POLICY_PATH)), { recursive: true }); fs.writeFileSync(path.join(dir, POLICY_PATH), policy); }
    git('add', '-A');
    git('-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-q', '-m', 'fixture');
    if (after === 'delete') fs.rmSync(path.join(dir, POLICY_PATH));
    else if (after !== undefined) { fs.mkdirSync(path.dirname(path.join(dir, POLICY_PATH)), { recursive: true }); fs.writeFileSync(path.join(dir, POLICY_PATH), after); }
    return dir;
  };

  it('is read from the committed bytes at the Syzygy checkout HEAD, and declares no bound where those bytes are absent, uncommitted or other', () => {
    expect(readCurrencyPolicy(root(ADOPTED))?.sha256).toBe(ADOPTED_SHA256);
    expect(readCurrencyPolicy(REAL_ROOT)?.sha256).toBe(ADOPTED_SHA256);
    expect(readCurrencyPolicy(root(null))).toBeNull();
    // Present in the working tree, never committed.
    expect(readCurrencyPolicy(root(null, ADOPTED))).toBeNull();
    // Committed, then changed or removed in the working tree.
    expect(readCurrencyPolicy(root(ADOPTED, Buffer.concat([ADOPTED, Buffer.from('\n')])))).toBeNull();
    expect(readCurrencyPolicy(root(ADOPTED, 'delete'))).toBeNull();
    // Committed bytes of another digest.
    expect(readCurrencyPolicy(root(Buffer.concat([ADOPTED, Buffer.from('\n')])))).toBeNull();
    // Not a Git checkout at all.
    expect(readCurrencyPolicy(tempDir('derived-currency-none-'))).toBeNull();
  });
});
