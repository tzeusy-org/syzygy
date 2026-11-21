import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { GIT_ENV, tempDir } from '@syzygy/test-kit';
import { deriveTreeFacts } from './derive.js';
import { currencyPolicyOf, derivedStructureAt, encodeDerivedRecord, readCurrencyPolicy, readDerivedRecord } from './derived-record.js';
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
    const read = readDerivedRecord(runWith(text), 0);
    expect(read).toMatchObject({ text, sha256: hex(text), revision: REV, state: 'derived', unitsNotListed: 0 });
    expect(read!.facts).toEqual(FACTS);
    expect(readDerivedRecord(runWith(null), 0)).toBeUndefined();
    expect(readDerivedRecord(runWith(text), 1)).toBeUndefined();
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
    for (const [what, edit] of malformed) expect(readDerivedRecord(runWith(kept(edit)), 0), what).toBeUndefined();
    expect(readDerivedRecord(runWith(new Uint8Array([0x7b, 0xff, 0x7d])), 0)).toBeUndefined();
    expect(readDerivedRecord(runWith('not json'), 0)).toBeUndefined();
    // A byte-order mark is never stripped, so bytes that are not the record's exact JSON do not read as a record.
    expect(readDerivedRecord(runWith(`\u{feff}${text}`), 0)).toBeUndefined();
  });

  describe('at a render', () => {
    const reader = (entries = TREE) => ({ listTree: async () => entries });
    const policy = currencyPolicyOf(ADOPTED);
    const at = (text: string | null, overrides: Partial<Parameters<typeof derivedStructureAt>[0]> = {}) =>
      derivedStructureAt({ run: runWith(text), revision: 0, pinned: REV, reader: reader(), isSecretPath: isSecret, policy, ...overrides });
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

    it('labels a fact of an undeclared rule version Unknown (no-currency-bound-declared), and the rest of a record it no longer matches stale', async () => {
      const structure = await at(kept((doc) => { doc['facts'][1].ruleVersion = 2; }));
      expect(outcomes(structure)).toEqual(FACTS.map((fact, i) => `${fact.id} unknown ${i === 1 ? 'no-currency-bound-declared' : 'stale-beyond-currency-bound'}`));
    });

    it('labels every fact Unknown (stale-beyond-currency-bound) for a record of another revision or with facts the render does not re-derive', async () => {
      expect(outcomes(await at(kept((doc) => { doc['revision'] = OTHER; })))).toEqual(FACTS.map((fact) => `${fact.id} unknown stale-beyond-currency-bound`));
      expect(outcomes(await at(kept((doc) => { doc['facts'][2].files = 9; })))).toEqual(FACTS.map((fact) => `${fact.id} unknown stale-beyond-currency-bound`));
      expect(outcomes(await at(kept(), { reader: reader([...TREE, { path: 'new/file', mode: '100644' }]) }))).toEqual(FACTS.map((fact) => `${fact.id} unknown stale-beyond-currency-bound`));
      expect(outcomes(await at(kept((doc) => { doc['unitsNotListed'] = 1; })))).toEqual(FACTS.map((fact) => `${fact.id} unknown stale-beyond-currency-bound`));
      // The render's own secret predicate: a path it holds secret is left out of its re-derivation, so a record naming it is not current.
      expect(outcomes(await at(kept(), { isSecretPath: (p) => isSecret(p) || p === 'mixed' }))).toEqual(FACTS.map((fact) => `${fact.id} unknown stale-beyond-currency-bound`));
    });

    it('states missing, or unknown, where there is no record, the record is Unknown, or the tree cannot be listed', async () => {
      expect(await at(null)).toEqual({ state: 'missing', revision: REV, unknownReason: 'missing-evidence' });
      const unknown = encodeDerivedRecord({ repositoryId: 'kestrel', revision: REV, capturedAt: '2026-11-21T00:00:00.000Z' }, { why: 'the pinned tree could not be listed (object-missing)' });
      expect(await at(unknown)).toEqual({ state: 'unknown', revision: REV, unknownReason: 'source-uncaptured-or-unreachable' });
      const refused = { listTree: async () => { throw new GitObjectReadRefusal('object-missing', 'gone'); } };
      expect(await at(kept(), { reader: refused })).toEqual({ state: 'unknown', revision: REV, unknownReason: 'source-uncaptured-or-unreachable' });
      await expect(at(kept(), { reader: { listTree: async () => { throw new Error('a fault, not a refusal'); } } })).rejects.toThrow('a fault, not a refusal');
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
