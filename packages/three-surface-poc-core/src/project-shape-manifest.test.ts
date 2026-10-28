// PWB-REQ-001 phase A: the revision-bound source manifest.
//
// Oracle independence: the expected source population below is hand-typed
// from the fixture tree and the fixture index texts, never derived from the
// module's own output. The fixture is Butlers-shaped but is not Butlers;
// no Butlers body is read in this slice.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import type { GitTreeEntry } from './git-tree.js';
import { maskMarkdownCodeContexts } from './markdown-code-context.js';
import {
  PILLAR_KEYS,
  PWB_DISCOVERY_VERSION,
  PWB_INDEX_DEPTH,
  PWB_ROOT_INDEX_PATH,
  canonicalManifestJson,
  deriveProjectShapeManifest,
  indexLinkTargets,
  manifestIdentity,
  rootIndexPillarRoots,
  type ManifestSource,
  type ProjectShapeSourceManifest,
  type SeedRead,
} from './project-shape-manifest.js';

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const REVISION = 'f'.repeat(40);

function oid(n: number): string {
  return n.toString(16).padStart(40, '0');
}

function blob(path: string, n: number, mode = '100644'): GitTreeEntry {
  return { mode, type: 'blob', objectId: oid(n), sizeBytes: 100 + n, path };
}

// The fixture tree, in deliberately non-sorted order.
const TREE: readonly GitTreeEntry[] = [
  blob('README.md', 1),
  blob('src/main.py', 2),
  blob('about/README.md', 3),
  blob('about/heart-and-soul/v1.md', 4),
  blob('about/heart-and-soul/README.md', 5),
  blob('about/heart-and-soul/vision.md', 6),
  blob('about/heart-and-soul/architecture.md', 7),
  blob('about/heart-and-soul/notes.md', 8),
  { mode: '160000', type: 'commit', objectId: oid(9), path: 'about/heart-and-soul/vendored' },
  blob('about/legends-and-lore/README.md', 10),
  blob('about/legends-and-lore/rfcs/0001-example.md', 11),
  blob('about/spec-and-spine/README.md', 12),
  blob('about/lay-and-land/README.md', 13),
  blob('about/lay-and-land/components.md', 14),
  blob('about/lay-and-land/diagrams/topology.png', 15),
  blob('about/craft-and-care/README.md', 16),
  blob('about/craft-and-care/policies/testing.md', 17),
  blob('about/craft-and-care/policies/link', 18, '120000'),
  blob('openspec/specs/beta/spec.md', 19),
  blob('openspec/specs/alpha/spec.md', 20),
  blob('openspec/specs/gamma/README.md', 21),
  blob('openspec/changes/x/specs/y/spec.md', 22),
  blob('roster/bravo/butler.toml', 23),
  blob('roster/atlas/MANIFESTO.md', 24),
  blob('roster/atlas/butler.toml', 25),
  blob('roster/charlie/notes.md', 26),
  blob('roster/nested/deep/butler.toml', 27),
];

const INDEXES: Readonly<Record<string, string>> = {
  'about/README.md': [
    '# Butlers',
    '',
    'Read [Heart and Soul](heart-and-soul/) first, then [Legends and Lore](legends-and-lore/README.md),',
    '[Spec and Spine](./spec-and-spine), [Lay and Land](lay-and-land/README.md#top) and',
    '[Craft and Care](craft-and-care "the craft").',
    '',
    'Narrative: the [vision](heart-and-soul/vision.md), a [site](https://example.com/x),',
    '![diagram](lay-and-land/diagrams/topology.png), [up](../README.md), [gone](nowhere/), [top](#top).',
    '',
    '```md',
    '[fenced](heart-and-soul/notes.md)',
    '```',
    'Inline `[code](heart-and-soul/notes.md)` link.',
    '',
  ].join('\n'),
  'about/heart-and-soul/README.md': [
    '- [Vision](vision.md)',
    '- [Architecture](./architecture.md#arch)',
    '- [V1](v1.md?x=1)',
    '- [Vision again](vision.md)',
    '- [Lore](../legends-and-lore/README.md)',
    '- [Missing](missing.md)',
    '- [Vendored](vendored)',
    '- [Self](README.md)',
    '- [Escape](../../../outside.md)',
    '- [Dir](sub/)',
    '',
  ].join('\n'),
  'about/legends-and-lore/README.md': ['See [RFC 0001][rfc1] and [rfcs](rfcs).', '', '[rfc1]: rfcs/0001-example.md "RFC"', ''].join('\n'),
  'about/spec-and-spine/README.md': 'Specs live in [openspec](../../openspec/specs/alpha/spec.md).\n',
  'about/lay-and-land/README.md': '[Components](components.md) and ![img](diagrams/topology.png)\n',
  'about/craft-and-care/README.md': '[Testing](policies/testing.md) · [Link](policies/link)\n',
};

function seedReader(overrides: Readonly<Record<string, SeedRead>> = {}) {
  const asked: { path: string; objectId: string }[] = [];
  const read = (seed: { readonly path: string; readonly objectId: string }): SeedRead => {
    asked.push(seed);
    const override = overrides[seed.path];
    if (override !== undefined) return override;
    const text = INDEXES[seed.path];
    return text === undefined ? { kind: 'unavailable', reason: 'fixture has no index text' } : { kind: 'text', text };
  };
  return { read, asked };
}

function derive(options: { tree?: readonly GitTreeEntry[]; overrides?: Readonly<Record<string, SeedRead>>; rootText?: string } = {}) {
  const overrides = { ...(options.overrides ?? {}) };
  if (options.rootText !== undefined) overrides['about/README.md'] = { kind: 'text', text: options.rootText };
  const reader = seedReader(overrides);
  const result = deriveProjectShapeManifest({
    repositoryId: 'repository:butlers-configured-poc',
    revision: REVISION,
    tree: options.tree ?? TREE,
    readSeed: reader.read,
  });
  if (result.kind !== 'manifest') throw new Error(`unexpected ${result.kind}: ${result.reason}`);
  return { manifest: result.manifest, asked: reader.asked };
}

const ROOT = 'about/README.md';
const HS = 'about/heart-and-soul';
const LL = 'about/legends-and-lore';
const SS = 'about/spec-and-spine';
const LA = 'about/lay-and-land';
const CC = 'about/craft-and-care';

const b = (n: number, mode = '100644') => ({ kind: 'blob', mode, objectId: oid(n) }) as const;

// Hand-typed expected population, sorted by path (code-unit order).
const EXPECTED_SOURCES: readonly ManifestSource[] = [
  { path: 'about/README.md', rule: 'root-index', extractionClasses: [], anchor: b(3) },
  { path: `${CC}/README.md`, rule: 'pillar-index', pillar: 'craft-and-care', declaredBy: ROOT, extractionClasses: ['craft-policy'], anchor: b(16) },
  { path: `${CC}/policies/link`, rule: 'pillar-named-file', pillar: 'craft-and-care', declaredBy: `${CC}/README.md`, extractionClasses: [], anchor: b(18, '120000') },
  { path: `${CC}/policies/testing.md`, rule: 'pillar-named-file', pillar: 'craft-and-care', declaredBy: `${CC}/README.md`, extractionClasses: [], anchor: b(17) },
  { path: `${HS}/README.md`, rule: 'pillar-index', pillar: 'heart-and-soul', declaredBy: ROOT, extractionClasses: [], anchor: b(5) },
  { path: `${HS}/architecture.md`, rule: 'pillar-named-file', pillar: 'heart-and-soul', declaredBy: `${HS}/README.md`, extractionClasses: ['project-account-section'], anchor: b(7) },
  { path: `${HS}/missing.md`, rule: 'pillar-named-file', pillar: 'heart-and-soul', declaredBy: `${HS}/README.md`, extractionClasses: [], anchor: { kind: 'missing-at-revision' } },
  { path: `${HS}/v1.md`, rule: 'pillar-named-file', pillar: 'heart-and-soul', declaredBy: `${HS}/README.md`, extractionClasses: ['project-account-section', 'success-criterion', 'catalog-entry'], anchor: b(4) },
  { path: `${HS}/vendored`, rule: 'pillar-named-file', pillar: 'heart-and-soul', declaredBy: `${HS}/README.md`, extractionClasses: [], anchor: { kind: 'not-a-blob', mode: '160000', type: 'commit' } },
  { path: `${HS}/vision.md`, rule: 'pillar-named-file', pillar: 'heart-and-soul', declaredBy: `${HS}/README.md`, extractionClasses: ['project-account-section', 'principle', 'success-criterion'], anchor: b(6) },
  { path: `${LA}/README.md`, rule: 'pillar-index', pillar: 'lay-and-land', declaredBy: ROOT, extractionClasses: [], anchor: b(13) },
  { path: `${LA}/components.md`, rule: 'pillar-named-file', pillar: 'lay-and-land', declaredBy: `${LA}/README.md`, extractionClasses: ['topology-component'], anchor: b(14) },
  { path: `${LL}/README.md`, rule: 'pillar-index', pillar: 'legends-and-lore', declaredBy: ROOT, extractionClasses: ['design-contract'], anchor: b(10) },
  { path: `${LL}/rfcs/0001-example.md`, rule: 'pillar-named-file', pillar: 'legends-and-lore', declaredBy: `${LL}/README.md`, extractionClasses: [], anchor: b(11) },
  { path: `${SS}/README.md`, rule: 'pillar-index', pillar: 'spec-and-spine', declaredBy: ROOT, extractionClasses: [], anchor: b(12) },
  { path: 'openspec/specs/alpha/spec.md', rule: 'baseline-spec-tree', extractionClasses: ['baseline-spec'], anchor: b(20) },
  { path: 'openspec/specs/beta/spec.md', rule: 'baseline-spec-tree', extractionClasses: ['baseline-spec'], anchor: b(19) },
  { path: 'roster/atlas/MANIFESTO.md', rule: 'roster-tree', extractionClasses: [], anchor: b(24) },
  { path: 'roster/atlas/butler.toml', rule: 'roster-tree', extractionClasses: ['roster-identity'], anchor: b(25) },
  { path: 'roster/bravo/butler.toml', rule: 'roster-tree', extractionClasses: ['roster-identity'], anchor: b(23) },
];

const EXPECTED_PHASE_A_READS = [ROOT, `${HS}/README.md`, `${LL}/README.md`, `${SS}/README.md`, `${LA}/README.md`, `${CC}/README.md`];

describe('deriveProjectShapeManifest — complete population at one revision', () => {
  it('recognizes the real-shaped five-row root table and all seven Heart and Soul sources', () => {
    const rootText = [
      '| Pillar | Purpose | Directory | Start here |',
      '| --- | --- | --- | --- |',
      '| Heart and Soul | why | `about/heart-and-soul/` | [Vision](heart-and-soul/vision.md) |',
      '| Legends and Lore | design | `about/legends-and-lore/` | [Index](legends-and-lore/README.md) |',
      '| Spec and Spine | behavior | `openspec/` | OpenSpec |',
      '| Lay and Land | map | `about/lay-and-land/` | [Index](lay-and-land/README.md) |',
      '| Craft and Care | quality | `about/craft-and-care/` | [Index](craft-and-care/README.md) |',
      '',
    ].join('\n');
    const heartIndex = [
      '[Vision](vision.md)',
      '[Architecture](architecture.md)',
      '[Design language](design-language.md)',
      '[Development](development.md)',
      '[Security](security.md)',
      '[V1](v1.md)',
      '',
    ].join('\n');
    const extra = [blob(`${HS}/design-language.md`, 60), blob(`${HS}/development.md`, 61), blob(`${HS}/security.md`, 62)];
    const realTree = [...TREE.filter((entry) => entry.path !== `${SS}/README.md`), ...extra];
    const { manifest } = derive({
      tree: realTree,
      rootText,
      overrides: { [`${HS}/README.md`]: { kind: 'text', text: heartIndex } },
    });
    expect(manifest.pillars.map((pillar) => [pillar.key, pillar.root])).toEqual([
      ['heart-and-soul', HS],
      ['legends-and-lore', LL],
      ['spec-and-spine', 'openspec'],
      ['lay-and-land', LA],
      ['craft-and-care', CC],
    ]);
    expect(manifest.sources.filter((source) => source.path.startsWith(`${HS}/`)).map((source) => source.path)).toEqual([
      `${HS}/README.md`,
      `${HS}/architecture.md`,
      `${HS}/design-language.md`,
      `${HS}/development.md`,
      `${HS}/security.md`,
      `${HS}/v1.md`,
      `${HS}/vision.md`,
    ]);
    expect(manifest.pillars[2]).toMatchObject({ key: 'spec-and-spine', state: 'unknown', reason: 'index-missing-at-revision', root: 'openspec' });
  });

  it('takes roots only from the exact Pillar and Directory table columns', () => {
    const prose = '| Name | Location |\n| --- | --- |\n| Heart and Soul | `somewhere/heart-and-soul/` |\n';
    expect([...rootIndexPillarRoots(prose)]).toEqual([]);
    const malformed = '| Pillar | Directory |\n| --- | --- |\n| Heart and Soul | about/heart-and-soul/ |\n';
    expect([...rootIndexPillarRoots(malformed)]).toEqual([]);
  });

  it('emits exactly the hand-typed source set, sorted, each anchored at the one revision', () => {
    const { manifest } = derive();
    expect(manifest.sources).toEqual(EXPECTED_SOURCES);
    expect(manifest.sources.map((source) => source.path)).toEqual([...EXPECTED_SOURCES.map((s) => s.path)].sort());
    expect(new Set(manifest.sources.map((source) => source.path)).size).toBe(EXPECTED_SOURCES.length);
    expect(manifest.revision).toBe(REVISION);
    expect(manifest.repositoryId).toBe('repository:butlers-configured-poc');
    expect(manifest.discoveryVersion).toBe('pwb-discovery-v2-candidate.1');
    expect(manifest.indexDepth).toBe(3);
    expect(manifest.rootIndex).toEqual({ path: ROOT, state: 'read', anchor: b(3) });
  });

  it('every blob anchor is the fixture tree entry for that path at the revision (independent Git listing)', () => {
    const { manifest } = derive();
    const byPath = new Map(TREE.map((entry) => [entry.path, entry]));
    for (const source of manifest.sources) {
      const entry = byPath.get(source.path);
      if (source.anchor.kind === 'missing-at-revision') {
        expect(entry).toBeUndefined();
        continue;
      }
      expect(entry).toBeDefined();
      if (source.anchor.kind === 'blob') {
        expect(entry?.type).toBe('blob');
        expect(source.anchor.objectId).toBe(entry?.objectId);
        expect(source.anchor.mode).toBe(entry?.mode);
      } else {
        expect(entry?.type).toBe(source.anchor.type);
      }
    }
  });

  it('excludes every arbitrary file: unlinked, image-linked, fenced, code-span, non-baseline, nested roster, non-roster', () => {
    const { manifest } = derive();
    const paths = new Set(manifest.sources.map((source) => source.path));
    for (const excluded of [
      'README.md',
      'src/main.py',
      `${HS}/notes.md`,
      `${LA}/diagrams/topology.png`,
      'openspec/specs/gamma/README.md',
      'openspec/changes/x/specs/y/spec.md',
      'roster/charlie/notes.md',
      'roster/nested/deep/butler.toml',
      'about/nowhere',
    ]) {
      expect(paths.has(excluded), excluded).toBe(false);
    }
  });

  it('phase A reads exactly the root index and the five pillar indexes, by tree object id, and nothing else', () => {
    const { manifest, asked } = derive();
    expect(manifest.phaseAReads).toEqual(EXPECTED_PHASE_A_READS);
    expect(asked.map((seed) => seed.path)).toEqual(EXPECTED_PHASE_A_READS);
    expect(asked.map((seed) => seed.objectId)).toEqual([oid(3), oid(5), oid(10), oid(12), oid(13), oid(16)]);
  });

  it('records each pillar’s discovery with its root, index, named count and ignored links in link order', () => {
    const { manifest } = derive();
    expect(manifest.pillars.map((pillar) => pillar.key)).toEqual([...PILLAR_KEYS]);
    expect(manifest.pillars).toEqual([
      {
        key: 'heart-and-soul',
        state: 'discovered',
        root: HS,
        indexPath: `${HS}/README.md`,
        namedSources: 5,
        ignoredLinks: [
          { target: '../legends-and-lore/README.md', reason: 'outside-pillar-root' },
          { target: 'README.md', reason: 'self' },
          { target: '../../../outside.md', reason: 'escapes-repository' },
          { target: 'sub/', reason: 'names-a-directory' },
        ],
      },
      {
        key: 'legends-and-lore',
        state: 'discovered',
        root: LL,
        indexPath: `${LL}/README.md`,
        namedSources: 1,
        ignoredLinks: [{ target: 'rfcs', reason: 'names-a-directory' }],
      },
      {
        key: 'spec-and-spine',
        state: 'discovered',
        root: SS,
        indexPath: `${SS}/README.md`,
        namedSources: 0,
        ignoredLinks: [{ target: '../../openspec/specs/alpha/spec.md', reason: 'outside-pillar-root' }],
      },
      { key: 'lay-and-land', state: 'discovered', root: LA, indexPath: `${LA}/README.md`, namedSources: 1, ignoredLinks: [] },
      { key: 'craft-and-care', state: 'discovered', root: CC, indexPath: `${CC}/README.md`, namedSources: 2, ignoredLinks: [] },
    ]);
  });
});

describe('deriveProjectShapeManifest — a declared home over tree-rule files (syzygy-1z3.29 review)', () => {
  // The root index declares Spec and Spine at `openspec/` and Lay and Land at
  // `roster/`, and each home's index links a file Rules 3 and 4 own. Expected
  // sources are hand-typed: the tree rule keeps the file and its class, the
  // link still counts as named, and no class-less duplicate shadows it.
  const ROOT_TEXT = [
    '| Pillar | Directory |',
    '| --- | --- |',
    '| Spec and Spine | `openspec/` |',
    '| Lay and Land | `roster/` |',
    '',
  ].join('\n');
  const TREE_WITH_HOMES: readonly GitTreeEntry[] = [
    ...TREE.filter((entry) => !entry.path.startsWith('about/spec-and-spine/') && !entry.path.startsWith('about/lay-and-land/')),
    blob('openspec/README.md', 50),
    blob('roster/README.md', 51),
  ];
  const overrides: Readonly<Record<string, SeedRead>> = {
    'openspec/README.md': { kind: 'text', text: '[Alpha](specs/alpha/spec.md) · [Gamma](specs/gamma/README.md) · [Specs](specs/)\n' },
    'roster/README.md': { kind: 'text', text: '[Atlas](atlas/butler.toml) · [Atlas manifesto](atlas/MANIFESTO.md)\n' },
  };

  it('retains absent and non-blob named targets that the tree rules cannot supply', () => {
    const { manifest } = derive({
      rootText: ROOT_TEXT,
      tree: [...TREE_WITH_HOMES, { mode: '160000', type: 'commit', objectId: oid(60), path: 'roster/vendor/butler.toml' }],
      overrides: {
        'openspec/README.md': { kind: 'text', text: '[Missing](specs/missing/spec.md)' },
        'roster/README.md': { kind: 'text', text: '[Missing](missing/butler.toml) [Vendor](vendor/butler.toml)' },
      },
    });
    expect(manifest.sources.filter((source) => source.rule === 'pillar-named-file' && (source.path.startsWith('openspec/') || source.path.startsWith('roster/')))).toEqual([
      { path: 'openspec/specs/missing/spec.md', rule: 'pillar-named-file', pillar: 'spec-and-spine', declaredBy: 'openspec/README.md', extractionClasses: [], anchor: { kind: 'missing-at-revision' } },
      { path: 'roster/missing/butler.toml', rule: 'pillar-named-file', pillar: 'lay-and-land', declaredBy: 'roster/README.md', extractionClasses: [], anchor: { kind: 'missing-at-revision' } },
      { path: 'roster/vendor/butler.toml', rule: 'pillar-named-file', pillar: 'lay-and-land', declaredBy: 'roster/README.md', extractionClasses: [], anchor: { kind: 'not-a-blob', mode: '160000', type: 'commit' } },
    ]);
  });

  it('reuses the screened root derivation without traversing its text again', () => {
    const { manifest } = derive({
      tree: TREE_WITH_HOMES,
      overrides: {
        ...overrides,
        [ROOT]: {
          kind: 'text',
          get text(): string { throw new Error('root text traversed again'); },
          pillarRoots: new Map([['spec-and-spine', { root: 'openspec', ambiguous: false }]]),
        },
      },
    });
    expect(manifest.pillars[2]).toMatchObject({ state: 'discovered', root: 'openspec' });
  });

  it('a baseline spec named by the Spec and Spine index keeps its tree rule and its baseline-spec class', () => {
    const { manifest } = derive({ rootText: ROOT_TEXT, tree: TREE_WITH_HOMES, overrides });
    expect(manifest.pillars[2]).toEqual({
      key: 'spec-and-spine',
      state: 'discovered',
      root: 'openspec',
      indexPath: 'openspec/README.md',
      namedSources: 2,
      ignoredLinks: [{ target: 'specs/', reason: 'names-a-directory' }],
    });
    expect(manifest.sources.find((source) => source.path === 'openspec/specs/alpha/spec.md')).toEqual({
      path: 'openspec/specs/alpha/spec.md',
      rule: 'baseline-spec-tree',
      extractionClasses: ['baseline-spec'],
      anchor: b(20),
    });
    expect(manifest.sources.find((source) => source.path === 'openspec/specs/gamma/README.md')).toEqual({
      path: 'openspec/specs/gamma/README.md',
      rule: 'pillar-named-file',
      pillar: 'spec-and-spine',
      declaredBy: 'openspec/README.md',
      extractionClasses: [],
      anchor: b(21),
    });
    expect(manifest.sources.filter((source) => source.extractionClasses.includes('baseline-spec')).map((source) => source.path)).toEqual([
      'openspec/specs/alpha/spec.md',
      'openspec/specs/beta/spec.md',
    ]);
  });

  it('a butler.toml named by an index at a roster home keeps its tree rule and its roster-identity class', () => {
    const { manifest } = derive({ rootText: ROOT_TEXT, tree: TREE_WITH_HOMES, overrides });
    expect(manifest.pillars[3]).toEqual({
      key: 'lay-and-land',
      state: 'discovered',
      root: 'roster',
      indexPath: 'roster/README.md',
      namedSources: 2,
      ignoredLinks: [],
    });
    expect(manifest.sources.find((source) => source.path === 'roster/atlas/butler.toml')).toEqual({
      path: 'roster/atlas/butler.toml',
      rule: 'roster-tree',
      extractionClasses: ['roster-identity'],
      anchor: b(25),
    });
    expect(manifest.sources.filter((source) => source.extractionClasses.includes('roster-identity')).map((source) => source.path)).toEqual([
      'roster/atlas/butler.toml',
      'roster/bravo/butler.toml',
    ]);
  });
});

describe('deriveProjectShapeManifest — the population never shrinks on failure', () => {
  it('root index unavailable: five pillars Unknown, tree rules still populate, the root index stays counted', () => {
    const { manifest, asked } = derive({ overrides: { [ROOT]: { kind: 'unavailable', reason: 'read guard rejected' } } });
    expect(manifest.rootIndex).toEqual({ path: ROOT, state: 'unavailable', reason: 'read guard rejected', anchor: b(3) });
    for (const pillar of manifest.pillars) {
      expect(pillar).toEqual({ key: pillar.key, state: 'unknown', reason: 'root-index-unavailable', ignoredLinks: [] });
    }
    expect(manifest.sources.map((source) => source.path)).toEqual([
      ROOT,
      'openspec/specs/alpha/spec.md',
      'openspec/specs/beta/spec.md',
      'roster/atlas/MANIFESTO.md',
      'roster/atlas/butler.toml',
      'roster/bravo/butler.toml',
    ]);
    expect(asked.map((seed) => seed.path)).toEqual([ROOT]);
  });

  it('root index absent from the tree: nothing is read at all', () => {
    const { manifest, asked } = derive({ tree: TREE.filter((entry) => entry.path !== ROOT) });
    expect(asked).toEqual([]);
    expect(manifest.phaseAReads).toEqual([]);
    expect(manifest.rootIndex).toEqual({ path: ROOT, state: 'missing-at-revision', anchor: { kind: 'missing-at-revision' } });
    expect(manifest.pillars.every((pillar) => pillar.state === 'unknown' && pillar.reason === 'root-index-missing-at-revision')).toBe(true);
    expect(manifest.sources[0]).toEqual({ path: ROOT, rule: 'root-index', extractionClasses: [], anchor: { kind: 'missing-at-revision' } });
  });

  it('a pillar the root index does not name is Unknown while the other four are discovered', () => {
    const rootText = INDEXES[ROOT]?.replace('[Lay and Land](lay-and-land/README.md#top) and', 'and') ?? '';
    const { manifest } = derive({ rootText });
    const lay = manifest.pillars.find((pillar) => pillar.key === 'lay-and-land');
    expect(lay).toEqual({ key: 'lay-and-land', state: 'unknown', reason: 'not-named-in-root-index', ignoredLinks: [] });
    expect(manifest.pillars.filter((pillar) => pillar.state === 'discovered').map((pillar) => pillar.key)).toEqual([
      'heart-and-soul',
      'legends-and-lore',
      'spec-and-spine',
      'craft-and-care',
    ]);
    expect(manifest.sources.some((source) => source.path.startsWith(`${LA}/`))).toBe(false);
  });

  it('two different roots named for one pillar key is Unknown (ambiguous), not a pick', () => {
    const rootText = `${INDEXES[ROOT] ?? ''}\nAlso [Heart](../alt/heart-and-soul/README.md).\n`;
    const { manifest } = derive({ rootText, tree: [...TREE, blob('alt/heart-and-soul/README.md', 40)] });
    expect(manifest.pillars[0]).toEqual({ key: 'heart-and-soul', state: 'unknown', reason: 'named-root-ambiguous', ignoredLinks: [] });
    expect(manifest.sources.some((source) => source.path.startsWith(`${HS}/`))).toBe(false);
  });

  it('a named pillar root with no entries at the revision is Unknown', () => {
    const { manifest } = derive({ tree: TREE.filter((entry) => !entry.path.startsWith(`${SS}/`)) });
    expect(manifest.pillars[2]).toEqual({ key: 'spec-and-spine', state: 'unknown', reason: 'root-missing-at-revision', root: SS, ignoredLinks: [] });
  });

  it('a pillar root whose README index is not a blob at the revision is Unknown', () => {
    const { manifest, asked } = derive({ tree: TREE.filter((entry) => entry.path !== `${LL}/README.md`) });
    expect(manifest.pillars[1]).toEqual({
      key: 'legends-and-lore',
      state: 'unknown',
      reason: 'index-missing-at-revision',
      root: LL,
      indexPath: `${LL}/README.md`,
      ignoredLinks: [],
    });
    expect(asked.some((seed) => seed.path === `${LL}/README.md`)).toBe(false);
    expect(manifest.sources.some((source) => source.path === `${LL}/rfcs/0001-example.md`)).toBe(false);
  });

  it('an unreadable pillar index is Unknown with the reader’s reason, and the index itself stays a counted source', () => {
    const { manifest } = derive({ overrides: { [`${CC}/README.md`]: { kind: 'unavailable', reason: 'over limit' } } });
    expect(manifest.pillars[4]).toEqual({
      key: 'craft-and-care',
      state: 'unknown',
      reason: 'index-unavailable',
      detail: 'over limit',
      root: CC,
      indexPath: `${CC}/README.md`,
      ignoredLinks: [],
    });
    expect(manifest.sources.find((source) => source.path === `${CC}/README.md`)).toEqual(EXPECTED_SOURCES[1]);
    expect(manifest.sources.some((source) => source.path === `${CC}/policies/testing.md`)).toBe(false);
  });
});

describe('deriveProjectShapeManifest — determinism and identity', () => {
  it('same inputs produce byte-equal canonical JSON and the same digest; tree order does not matter', () => {
    const first = derive().manifest;
    const second = derive().manifest;
    const shuffled = derive({ tree: [...TREE].reverse() }).manifest;
    expect(canonicalManifestJson(first)).toBe(canonicalManifestJson(second));
    expect(first.digest).toBe(second.digest);
    expect(shuffled.digest).toBe(first.digest);
    expect(first.digest).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(manifestIdentity(first)).toBe(`repository:butlers-configured-poc@${REVISION}/pwb-discovery-v2-candidate.1/${first.digest}`);
  });

  // Expected value derived outside this module: Python's json.dumps(sort_keys=True, separators=(',', ':'), ensure_ascii=False) over
  // the manifest without its digest, then SHA-256 (docs/evidence/syzygy-bpyt-6-13/derive-literals.py). A change to the fixture tree,
  // the seed texts or the manifest shape moves it, on purpose: the manifest digest is an identity (class 3).
  it('digests the canonical manifest JSON: the fixture manifest has this digest', () => {
    expect(derive().manifest.digest).toBe('sha256:ef8f9f0a722c28406e434ffe3d0706565c02dd5b9f56c4a5d05aead1fffc1373');
  });

  it('an unlinked extra file leaves the digest unchanged; a changed source blob, revision or discovery version changes it', () => {
    const base = derive().manifest;
    expect(derive({ tree: [...TREE, blob('about/heart-and-soul/extra.md', 50)] }).manifest.digest).toBe(base.digest);
    const changedBlob = TREE.map((entry) => (entry.path === `${HS}/vision.md` ? { ...entry, objectId: oid(60) } : entry));
    expect(derive({ tree: changedBlob }).manifest.digest).not.toBe(base.digest);
    const otherRevision = deriveProjectShapeManifest({ repositoryId: 'repository:butlers-configured-poc', revision: 'e'.repeat(40), tree: TREE, readSeed: seedReader().read });
    expect(otherRevision.kind === 'manifest' && otherRevision.manifest.digest).not.toBe(base.digest);
    const otherDiscovery = deriveProjectShapeManifest({
      repositoryId: 'repository:butlers-configured-poc',
      revision: REVISION,
      discoveryVersion: 'pwb-discovery-v2',
      tree: TREE,
      readSeed: seedReader().read,
    });
    expect(otherDiscovery.kind === 'manifest' && otherDiscovery.manifest.digest).not.toBe(base.digest);
  });

  it('the manifest is deeply frozen', () => {
    const { manifest } = derive();
    expect(Object.isFrozen(manifest)).toBe(true);
    expect(Object.isFrozen(manifest.sources)).toBe(true);
    expect(Object.isFrozen(manifest.sources[0])).toBe(true);
    expect(Object.isFrozen(manifest.pillars[0])).toBe(true);
  });

  it('a missing deterministic input identity is rejected, never defaulted', () => {
    const readSeed = seedReader().read;
    expect(deriveProjectShapeManifest({ repositoryId: '', revision: REVISION, tree: TREE, readSeed })).toEqual({ kind: 'invalid-input', reason: 'repositoryId is empty' });
    expect(deriveProjectShapeManifest({ repositoryId: 'r', revision: ' ', tree: TREE, readSeed })).toEqual({ kind: 'invalid-input', reason: 'revision is empty' });
    expect(deriveProjectShapeManifest({ repositoryId: 'r', revision: REVISION, discoveryVersion: '', tree: TREE, readSeed })).toEqual({
      kind: 'invalid-input',
      reason: 'discoveryVersion is empty',
    });
  });
});

describe('index link grammar', () => {
  it('extracts inline links and reference definitions; skips images, fenced blocks and code spans', () => {
    const text = [
      '[a](one.md) ![i](img.png) [b](<two three.md> "t") [c](three.md \'t\')',
      '[ref]: four.md',
      '```',
      '[x](fenced.md)',
      '```',
      'and `[y](span.md)` then [d](five.md#frag)',
      '~~~',
      '[z](tilde.md)',
      '~~~',
      '[e][ref]',
    ].join('\n');
    expect(indexLinkTargets(text)).toEqual(['one.md', 'two three.md', 'three.md', 'four.md', 'five.md#frag']);
  });
});

// syzygy-bpyt.55 (the owner's GP-B2 Q2 answer C, G3): the index-link reader and the root-index reader recognize fences by the PWB-REQ-006
// profile, and the link reader alone its code spans, on its LF-split lines. Expected values are literals.
describe('index link grammar — the profile\'s fences and spans', () => {
  const B = '```';
  const links = (...lines: string[]): readonly string[] => indexLinkTargets(lines.join('\n'));

  it('a span that opens and closes on other lines hides the links between them', () => {
    expect(links('see `', '[a](a.md)', '` end', '[b](b.md)')).toEqual(['b.md']);
    expect(links('see ``', '[a](a.md)', '`` end', '[b](b.md)')).toEqual(['b.md']);
    expect(links('x `a', '[a](a.md)', 'b` y [c](c.md)')).toEqual(['c.md']);
  });

  it('a span closes only at a run of the same length, so a double-backtick span may hold a single backtick and its link', () => {
    expect(links('``[a](a.md)``', '[b](b.md)')).toEqual(['b.md']);
    expect(links('`` x ` [a](a.md) ` ``', '[b](b.md)')).toEqual(['b.md']);
    expect(links('`a` [c](c.md) `b`')).toEqual(['c.md']);
  });

  it('a span is deleted and not blanked: the characters around it join', () => {
    expect(links('[a](b`x`.md)')).toEqual(['b.md']);
    expect(links('[a`x`](a.md)')).toEqual(['a.md']);
  });

  it('a closer-shaped line with an info string or a trailing tab does not close a fence; the real closer does', () => {
    expect(links(B, '[a](a.md)', B + 'js', '[b](b.md)', B, '[c](c.md)')).toEqual(['c.md']);
    expect(links(B, '[a](a.md)', B + '\t', '[b](b.md)', B, '[c](c.md)')).toEqual(['c.md']);
    expect(links(B, '[a](a.md)', '````', '[b](b.md)')).toEqual(['b.md']);
  });

  it('an opener indented four spaces is not a fence; its backticks are a span', () => {
    expect(links('    ' + B, '[a](a.md)', '    ' + B, '[b](b.md)')).toEqual(['b.md']);
    // Never closed: the profile calls the text malformed and the reader excludes it, so no reader is handed it; recovery drops the span.
    expect(links('    ' + B, '[a](a.md)', '[b](b.md)')).toEqual(['a.md', 'b.md']);
  });

  it('a line inside a fence is dropped whole, in CRLF text too', () => {
    expect(indexLinkTargets(['[a](a.md)', B, '[b](b.md)', B, '[c](c.md)', ''].join('\r\n'))).toEqual(['a.md', 'c.md']);
    expect(indexLinkTargets(['see `', '[a](a.md)', '` end', '[b](b.md)', ''].join('\r\n'))).toEqual(['b.md']);
  });

  // RESIDUAL, named by the owner's Q2 answer C: two stray single backticks around a list of links make those links code, and the links drop
  // with no signal. The profile closes the span at the second backtick, so the text is well formed and the gate admits it.
  it('RESIDUAL: two stray single backticks around a list of links drop the links, and the text is well formed', () => {
    const text = ['Note: use the `foo flag.', '', '- [a](a.md)', '- [b](b.md)', '', 'and the bar` flag.', '- [c](c.md)', ''].join('\n');
    expect(maskMarkdownCodeContexts(text).kind).toBe('masked');
    expect(indexLinkTargets(text)).toEqual(['c.md']);
  });

  it('the root-index pillar table is read outside fences only, with its code-span directory cells intact', () => {
    const table = ['| Pillar | Directory |', '| --- | --- |', '| Heart and Soul | `about/heart-and-soul/` |', ''];
    expect([...rootIndexPillarRoots(table.join('\n'))]).toEqual([['heart-and-soul', ['about/heart-and-soul']]]);
    expect([...rootIndexPillarRoots(['  ' + B, ...table, '  ' + B].join('\n'))]).toEqual([]);
    // The info-string line does not close the fence, so the table stays inside it until the real closer.
    expect([...rootIndexPillarRoots([B, 'x', B + 'js', ...table, B].join('\n'))]).toEqual([]);
    expect([...rootIndexPillarRoots([B, 'x', B, ...table].join('\n'))]).toEqual([['heart-and-soul', ['about/heart-and-soul']]]);
  });

  it('phase A: a pillar link hidden by a code span names no pillar, and the pillar index is never read', () => {
    const base = INDEXES['about/README.md'] as string;
    for (const rootText of [
      base.replace('[Heart and Soul](heart-and-soul/)', '``[Heart and Soul](heart-and-soul/)``'),
      base.replace('Read [Heart and Soul](heart-and-soul/) first', 'Read `\n[Heart and Soul](heart-and-soul/)\n` first'),
    ]) {
      const { manifest, asked } = derive({ rootText });
      expect(manifest.pillars[0]).toEqual({ key: 'heart-and-soul', state: 'unknown', reason: 'not-named-in-root-index', ignoredLinks: [] });
      expect(asked.map((seed) => seed.path)).toEqual([ROOT, `${LL}/README.md`, `${SS}/README.md`, `${LA}/README.md`, `${CC}/README.md`]);
    }
    expect(derive({}).asked.map((seed) => seed.path)).toEqual(EXPECTED_PHASE_A_READS);
  });
});

describe('constants bound to the adopted PWB artifacts', () => {
  it('discovery version, fixed seed path and index depth match the act-bound registry entry and policy', () => {
    const registry = JSON.parse(
      readFileSync(join(REPO_ROOT, '.syzygy/governance/declarations/adapter-registry/POLARIS-BUTLERS-PROJECT-SHAPE-OBSERVER-CANDIDATE.json'), 'utf8'),
    ) as { entries: { discoveryVersion: string; resourceLimits: { maxIndexDepth: number } }[] };
    const policy = JSON.parse(readFileSync(join(REPO_ROOT, '.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json'), 'utf8')) as {
      sourceAdmission: { phaseA: { fixedSeedPaths: string[] } };
    };
    expect(registry.entries[0]?.discoveryVersion).toBe(PWB_DISCOVERY_VERSION);
    expect(policy.sourceAdmission.phaseA.fixedSeedPaths).toEqual([PWB_ROOT_INDEX_PATH]);
    expect(PWB_INDEX_DEPTH).toBeLessThanOrEqual(registry.entries[0]?.resourceLimits.maxIndexDepth ?? 0);
  });
});

// Type-level guard: the manifest type is what the test file spells out.
const _manifestShape: (m: ProjectShapeSourceManifest) => string = (m) => m.digest;
void _manifestShape;
