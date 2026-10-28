// PWB-REQ-001 phase A: the deterministic, injectable observer.
//
// Oracle independence: the Git runner is a fixture that answers exactly the
// commands the observer may issue; expected object ids, paths, stamps and
// call ledgers are hand-typed from the fixture, never read back from the
// module. No Butlers repository is touched; the composed-gate test proves a
// non-admitting authority calls Git zero times.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import type { BodyReadAuthorityEvaluation } from './body-read-authority.js';
import { PWB_SECRET_POLICY, classifyPhaseASeed, compileDetectors } from './content-classification.js';
import { indexGitTree, type GitTreeEntry } from './git-tree.js';
import { observeProjectShape } from './project-shape-observer.js';
import { createResourceLedger, type ParsePassCharge } from './resource-ledger.js';
import {
  PWB_CONTENT_CLASS,
  PWB_FAILURE_STATES,
  PWB_OBSERVER_IDENTITY,
  PWB_RESOURCE_LIMITS,
  admitPhaseARead,
  createPhaseASeedReader,
  gitBlobObjectId,
  observeProjectShapeSources,
  resourceLimitsDigest,
  sourceIdentityOf,
  type ProjectShapeSourceObservation,
  type PwbResourceLimits,
} from './project-shape-observation.js';

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const REPOSITORY = 'repository:butlers-configured-poc';
const COMMIT = '3'.repeat(40);
const COMMITTED_AT = '2026-08-15T10:00:00+00:00';
const CAPTURED_AT = '2026-09-03T12:34:56.000Z';
const PHASE_A_DETECTORS = compileDetectors(PWB_SECRET_POLICY);
const classifyPhaseA = (text: string) => classifyPhaseASeed(PHASE_A_DETECTORS, text);

// ---------------------------------------------------------------------
// Fixture repository: Butlers-shaped, not Butlers.

const TEXTS: Readonly<Record<string, string>> = {
  'about/README.md': [
    '# Fixture',
    '',
    '[Heart and Soul](heart-and-soul/) · [Legends and Lore](legends-and-lore/README.md) ·',
    '[Spec and Spine](spec-and-spine) · [Lay and Land](lay-and-land/) · [Craft and Care](craft-and-care/)',
    '',
    'Updated 2020-01-01 (a source-claimed date, not the capture instant).',
    '',
  ].join('\n'),
  'about/heart-and-soul/README.md': '- [Vision](vision.md)\n- [Missing](missing.md)\n',
  'about/heart-and-soul/vision.md': '# Vision\n',
  'about/legends-and-lore/README.md': '[RFC](rfcs/0001.md)\n',
  'about/legends-and-lore/rfcs/0001.md': '# RFC\n',
  'about/spec-and-spine/README.md': 'Specs.\n',
  'about/lay-and-land/README.md': '[Components](components.md)\n',
  'about/lay-and-land/components.md': '# Components\n',
  'about/craft-and-care/README.md': '[Testing](policies/testing.md)\n',
  'about/craft-and-care/policies/testing.md': '# Testing\n',
  'README.md': '# Root\n',
  'openspec/specs/alpha/spec.md': '# Alpha\n',
  'openspec/README.md': '[Specs](specs/)\n',
  'roster/atlas/butler.toml': '[butler]\nname = "atlas"\n',
  'roster/atlas/MANIFESTO.md': '# Atlas\n',
};

const encoder = new TextEncoder();
const BYTES: ReadonlyMap<string, Uint8Array> = new Map(Object.entries(TEXTS).map(([path, text]) => [path, encoder.encode(text)]));

function sha1Blob(bytes: Uint8Array): string {
  return createHash('sha1').update(`blob ${bytes.byteLength}\0`).update(bytes).digest('hex');
}

function oidOf(path: string): string {
  const bytes = BYTES.get(path);
  if (bytes === undefined) throw new Error(`fixture has no bytes for ${path}`);
  return sha1Blob(bytes);
}

function blob(path: string, mode = '100644'): GitTreeEntry {
  const bytes = BYTES.get(path);
  if (bytes === undefined) throw new Error(`fixture has no bytes for ${path}`);
  return { mode, type: 'blob', objectId: sha1Blob(bytes), sizeBytes: bytes.byteLength, path };
}

const TREE: readonly GitTreeEntry[] = [
  blob('roster/atlas/butler.toml'),
  blob('about/README.md'),
  blob('about/heart-and-soul/README.md'),
  blob('about/heart-and-soul/vision.md'),
  blob('about/legends-and-lore/README.md'),
  blob('about/legends-and-lore/rfcs/0001.md'),
  blob('about/spec-and-spine/README.md'),
  blob('about/lay-and-land/README.md'),
  blob('about/lay-and-land/components.md'),
  blob('about/craft-and-care/README.md'),
  blob('about/craft-and-care/policies/testing.md'),
  blob('README.md'),
  blob('openspec/specs/alpha/spec.md'),
  blob('roster/atlas/MANIFESTO.md'),
];

function serializeTree(entries: readonly GitTreeEntry[]): string {
  return entries
    .map((entry) => `${entry.mode} ${entry.type} ${entry.objectId} ${entry.type === 'blob' ? String(entry.sizeBytes ?? 0).padStart(7) : '      -'}\t${entry.path}\x00`)
    .join('');
}

interface RunnerOptions {
  readonly tree?: readonly GitTreeEntry[];
  readonly listing?: string;
  readonly failRevParse?: boolean;
  readonly failShow?: boolean;
  readonly failLsTree?: boolean;
  readonly committedAt?: string;
  readonly blobOverrides?: Readonly<Record<string, Uint8Array | 'throw'>>;
}

function runner(options: RunnerOptions = {}) {
  const calls: string[][] = [];
  const tree = options.tree ?? TREE;
  const byOid = new Map<string, Uint8Array>();
  for (const entry of tree) {
    const bytes = BYTES.get(entry.path);
    if (bytes !== undefined) byOid.set(entry.objectId, bytes);
  }
  const runGit = (args: readonly string[]): Uint8Array => {
    calls.push([...args]);
    const [command] = args;
    if (command === 'rev-parse') {
      if (options.failRevParse === true) throw new Error('fatal: Needed a single revision');
      return encoder.encode(`${COMMIT}\n`);
    }
    if (command === 'show') {
      if (options.failShow === true) throw new Error('fatal: bad object');
      return encoder.encode(`${options.committedAt ?? COMMITTED_AT}\n`);
    }
    if (command === 'ls-tree') {
      if (options.failLsTree === true) throw new Error('fatal: not a tree object');
      return encoder.encode(options.listing ?? serializeTree(tree));
    }
    if (command === 'cat-file') {
      const oid = args[2] ?? '';
      const override = options.blobOverrides?.[oid];
      if (override === 'throw') throw new Error('fatal: Not a valid object name');
      if (override !== undefined) return override;
      const bytes = byOid.get(oid);
      if (bytes === undefined) throw new Error(`fixture has no object ${oid}`);
      return bytes;
    }
    throw new Error(`unexpected git command ${args.join(' ')}`);
  };
  return { runGit, calls };
}

function observe(options: RunnerOptions & { capturedAt?: string; revision?: string; limits?: PwbResourceLimits; authority?: BodyReadAuthorityEvaluation } = {}) {
  const git = runner(options);
  const result = observeProjectShapeSources({
    repositoryId: REPOSITORY,
    revision: options.revision ?? 'main',
    capturedAt: options.capturedAt ?? CAPTURED_AT,
    runGit: git.runGit,
    classifyPhaseA,
    ...(options.limits === undefined ? {} : { resourceLimits: options.limits }),
    ...(options.authority === undefined ? {} : { authority: options.authority }),
  });
  return { result, calls: git.calls };
}

function observed(options: Parameters<typeof observe>[0] = {}): { observation: ProjectShapeSourceObservation; calls: string[][] } {
  const { result, calls } = observe(options);
  if (result.kind !== 'observed') throw new Error(`expected observed, got ${result.kind}`);
  return { observation: result, calls };
}

// Hand-typed: the phase A allowlist for this fixture, in read order.
const PHASE_A = [
  'about/README.md',
  'about/heart-and-soul/README.md',
  'about/legends-and-lore/README.md',
  'about/spec-and-spine/README.md',
  'about/lay-and-land/README.md',
  'about/craft-and-care/README.md',
] as const;

// Hand-typed: the complete source population at the fixture revision.
const POPULATION = [
  'about/README.md',
  'about/craft-and-care/README.md',
  'about/craft-and-care/policies/testing.md',
  'about/heart-and-soul/README.md',
  'about/heart-and-soul/missing.md',
  'about/heart-and-soul/vision.md',
  'about/lay-and-land/README.md',
  'about/lay-and-land/components.md',
  'about/legends-and-lore/README.md',
  'about/legends-and-lore/rfcs/0001.md',
  'about/spec-and-spine/README.md',
  'openspec/specs/alpha/spec.md',
  'roster/atlas/MANIFESTO.md',
  'roster/atlas/butler.toml',
] as const;

const ABSENT_AUTHORITY: BodyReadAuthorityEvaluation = {
  evaluationId: 'evaluation:test-absent',
  evaluationInstant: '2026-09-03T00:00:00Z',
  admits: false,
  authorizationMode: 'rejected',
  consent: { kind: 'absent', what: 'artifact-missing', artifactDigest: undefined },
  policy: { kind: 'absent', what: 'artifact-missing', artifactDigest: undefined },
  registry: { kind: 'absent', what: 'artifact-missing', artifactDigest: undefined },
  contradiction: undefined,
};

const ADMITTING_AUTHORITY: BodyReadAuthorityEvaluation = {
  evaluationId: 'evaluation:test-admitting',
  evaluationInstant: '2026-09-03T00:00:00Z',
  admits: true,
  authorizationMode: 'owner-trusted-bootstrap',
  consent: { kind: 'valid', provenance: 'state-1', actIdentity: 'act:consent', artifactDigest: 'sha256:c'.padEnd(71, '0'), actInstant: '2026-09-02T00:00:00Z' },
  policy: { kind: 'valid', provenance: 'state-1', actIdentity: 'act:policy', artifactDigest: 'sha256:p'.padEnd(71, '0'), actInstant: '2026-09-02T00:00:00Z' },
  registry: { kind: 'valid', provenance: 'state-1', actIdentity: 'act:registry', artifactDigest: 'sha256:r'.padEnd(71, '0'), actInstant: '2026-09-02T00:00:00Z' },
  contradiction: undefined,
};

// ---------------------------------------------------------------------

describe('observeProjectShapeSources — identities, instants and scope', () => {
  it('binds the observation to the exact resolved commit and stamps the registry observer identity', () => {
    const { observation } = observed();
    expect(observation.requestedRevision).toBe('main');
    expect(observation.revision).toBe(COMMIT);
    expect(observation.manifest.revision).toBe(COMMIT);
    expect(observation.observer).toEqual({
      observerId: 'polaris-butlers-project-shape',
      observerVersion: '1.2.0-candidate.1',
      discoveryVersion: 'pwb-discovery-v2-candidate.1',
      implementationId: 'three-surface-poc-core/project-shape-observer',
      implementationVersion: '1.0.0',
    });
    expect(observation.scope).toEqual({ repositoryId: REPOSITORY, contentClass: 'declared-project-shape-text', phase: 'A' });
    expect(observation.manifestIdentity).toBe(`${REPOSITORY}@${COMMIT}/pwb-discovery-v2-candidate.1/${observation.manifest.digest}`);
  });

  it('keeps the capture instant distinct from the source-claimed (committer) instant', () => {
    const { observation } = observed();
    expect(observation.capturedAt).toBe(CAPTURED_AT);
    expect(observation.sourceClaimedInstant).toEqual({ kind: 'git-committer-instant', instant: COMMITTED_AT });
    expect(observation.sourceClaimedInstant.instant).not.toBe(observation.capturedAt);
    // The root index carries its own "Updated 2020-01-01" claim; nothing in
    // the observation adopts it as the capture instant.
    expect(JSON.stringify(observation)).not.toContain('2020-01-01T');
    expect(observation.capturedAt).not.toContain('2020');
  });

  it('records every deterministic input identity', () => {
    const { observation } = observed({ authority: ADMITTING_AUTHORITY });
    expect(observation.deterministicInputs).toEqual({
      repositoryId: REPOSITORY,
      revision: COMMIT,
      discoveryVersion: 'pwb-discovery-v2-candidate.1',
      observerId: 'polaris-butlers-project-shape',
      observerVersion: '1.2.0-candidate.1',
      implementationId: 'three-surface-poc-core/project-shape-observer',
      implementationVersion: '1.0.0',
      manifestDigest: observation.manifest.digest,
      resourceLimitsDigest: resourceLimitsDigest(PWB_RESOURCE_LIMITS),
      authority: {
        kind: 'evaluated',
        evaluationId: 'evaluation:test-admitting',
        consent: { kind: 'valid', provenance: 'state-1', actIdentity: 'act:consent', artifactDigest: 'sha256:c'.padEnd(71, '0') },
        policy: { kind: 'valid', provenance: 'state-1', actIdentity: 'act:policy', artifactDigest: 'sha256:p'.padEnd(71, '0') },
        registry: { kind: 'valid', provenance: 'state-1', actIdentity: 'act:registry', artifactDigest: 'sha256:r'.padEnd(71, '0') },
      },
    });
    expect(observation.deterministicInputs.manifestDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(observed().observation.deterministicInputs.authority).toEqual({ kind: 'not-evaluated' });
  });
});

describe('observeProjectShapeSources — reads only the phase A allowlist', () => {
  it('issues exactly rev-parse, show, ls-tree and one cat-file per phase A seed, in order', () => {
    const { observation, calls } = observed();
    expect(calls).toEqual([
      ['rev-parse', '--verify', 'main^{commit}'],
      ['show', '-s', '--format=%cI', COMMIT],
      ['ls-tree', '-r', '-z', '-l', COMMIT],
      ...PHASE_A.map((path) => ['cat-file', 'blob', oidOf(path)]),
    ]);
    expect(observation.manifest.phaseAReads).toEqual([...PHASE_A]);
    expect(observation.reads).toEqual(PHASE_A.map((path) => ({ path, objectId: oidOf(path), outcome: 'read', bytes: BYTES.get(path)?.byteLength })));
    // Nothing outside the allowlist was opened: every cat-file object id is
    // a phase A seed, and the named/tree sources were never read.
    const opened = calls.filter((call) => call[0] === 'cat-file').map((call) => call[2]);
    expect(new Set(opened)).toEqual(new Set(PHASE_A.map(oidOf)));
    for (const path of ['about/heart-and-soul/vision.md', 'roster/atlas/butler.toml', 'openspec/specs/alpha/spec.md', 'README.md']) {
      expect(opened).not.toContain(oidOf(path));
    }
  });

  it('exposes the complete population with a per-source identity and stamp', () => {
    const { observation } = observed();
    expect(observation.sources.map((source) => source.path)).toEqual([...POPULATION]);
    expect(observation.sources.map((source) => source.identity)).toEqual(
      POPULATION.map((path) => `${REPOSITORY}@${COMMIT}:${path}#${path === 'about/heart-and-soul/missing.md' ? 'missing' : oidOf(path)}`),
    );
    for (const source of observation.sources) {
      expect(source.stamp).toEqual({
        sourceIdentity: source.identity,
        scope: { repositoryId: REPOSITORY, contentClass: 'declared-project-shape-text', phase: 'A' },
        capturedAt: CAPTURED_AT,
        observerId: 'polaris-butlers-project-shape',
        observerVersion: '1.2.0-candidate.1',
      });
    }
    expect(observation.degradation).toEqual({
      failureState: 'someSourcesUncapturedOrOverLimit',
      degradationState: 'Partial snapshot',
      unknownReason: 'source-uncaptured-or-unreachable',
      detail: 'about/heart-and-soul/missing.md missing-at-revision',
    });
  });

  it('a fixture without the absent named file has no degradation', () => {
    const tree = TREE;
    const texts = { ...TEXTS, 'about/heart-and-soul/README.md': '- [Vision](vision.md)\n' };
    const bytes = encoder.encode(texts['about/heart-and-soul/README.md']);
    const entry: GitTreeEntry = { mode: '100644', type: 'blob', objectId: sha1Blob(bytes), sizeBytes: bytes.byteLength, path: 'about/heart-and-soul/README.md' };
    const patched = tree.map((item) => (item.path === entry.path ? entry : item));
    const { observation } = observed({ tree: patched, blobOverrides: { [entry.objectId]: bytes } });
    expect(observation.degradation).toBeUndefined();
    expect(observation.limitBreaches).toEqual([]);
    expect(observation.sources.map((source) => source.path)).toEqual(POPULATION.filter((path) => path !== 'about/heart-and-soul/missing.md'));
  });

  it('refuses a symlinked pillar index without opening it and leaves the pillar counted and Unknown', () => {
    const tree = TREE.map((entry) => (entry.path === 'about/craft-and-care/README.md' ? { ...entry, mode: '120000' } : entry));
    const { observation, calls } = observed({ tree });
    const oid = oidOf('about/craft-and-care/README.md');
    expect(calls.filter((call) => call[0] === 'cat-file').map((call) => call[2])).not.toContain(oid);
    expect(observation.reads).toContainEqual({ path: 'about/craft-and-care/README.md', objectId: oid, outcome: 'refused', bytes: 0, detail: 'not-a-regular-blob' });
    const pillar = observation.manifest.pillars.find((item) => item.key === 'craft-and-care');
    expect(pillar).toMatchObject({ state: 'unknown', reason: 'index-unavailable', detail: 'phase A read refused: not-a-regular-blob' });
    expect(observation.sources.map((source) => source.path)).toContain('about/craft-and-care/README.md');
    expect(observation.sources.map((source) => source.path)).not.toContain('about/craft-and-care/policies/testing.md');
    expect(observation.degradation?.degradationState).toBe('Partial snapshot');
  });

  it('does not open a seed over maxBytesPerSource and records the breach against the declared limit', () => {
    const limits: PwbResourceLimits = { ...PWB_RESOURCE_LIMITS, maxBytesPerSource: 60 };
    const { observation, calls } = observed({ limits });
    const big = PHASE_A.filter((path) => (BYTES.get(path)?.byteLength ?? 0) > 60);
    expect(big).toEqual(['about/README.md']);
    expect(calls.filter((call) => call[0] === 'cat-file').map((call) => call[2])).not.toContain(oidOf('about/README.md'));
    expect(observation.limitBreaches).toEqual([
      { limit: 'maxBytesPerSource', declared: 60, observed: BYTES.get('about/README.md')?.byteLength, path: 'about/README.md' },
    ]);
    expect(observation.reads[0]).toEqual({ path: 'about/README.md', objectId: oidOf('about/README.md'), outcome: 'over-limit', bytes: 0, detail: 'maxBytesPerSource' });
    expect(observation.manifest.rootIndex.state).toBe('unavailable');
    expect(observation.sources.map((source) => source.path)).toEqual(['about/README.md', 'openspec/specs/alpha/spec.md', 'roster/atlas/MANIFESTO.md', 'roster/atlas/butler.toml']);
    expect(observation.degradation).toMatchObject({ failureState: 'sourceMissingOrUnreadable', degradationState: 'Source unreachable' });
  });

  it('stops reading once maxTotalBytes would be exceeded, keeping the population', () => {
    const rootBytes = BYTES.get('about/README.md')?.byteLength ?? 0;
    const limits: PwbResourceLimits = { ...PWB_RESOURCE_LIMITS, maxTotalBytes: rootBytes + 5 };
    const { observation } = observed({ limits });
    expect(observation.reads.map((read) => read.outcome)).toEqual(['read', 'over-limit', 'over-limit', 'over-limit', 'over-limit', 'over-limit']);
    expect(observation.limitBreaches.map((breach) => breach.limit)).toEqual(Array(5).fill('maxTotalBytes'));
    expect(observation.manifest.pillars.every((pillar) => pillar.state === 'unknown' && pillar.reason === 'index-unavailable')).toBe(true);
    expect(observation.sources.map((source) => source.path)).toEqual(PHASE_A.map(String).sort().concat(['openspec/specs/alpha/spec.md', 'roster/atlas/MANIFESTO.md', 'roster/atlas/butler.toml']));
  });

  it('records maxIndexDepth and maxSources breaches without shrinking the population', () => {
    const limits: PwbResourceLimits = { ...PWB_RESOURCE_LIMITS, maxIndexDepth: 2, maxSources: 3 };
    const { observation } = observed({ limits });
    expect(observation.limitBreaches).toEqual([
      { limit: 'maxIndexDepth', declared: 2, observed: 3 },
      { limit: 'maxSources', declared: 3, observed: POPULATION.length },
    ]);
    expect(observation.sources).toHaveLength(POPULATION.length);
  });

  it('rejects bytes that are not the tree-named object, NUL-bearing bytes and non-UTF-8 bytes', () => {
    const ll = oidOf('about/legends-and-lore/README.md');
    const la = oidOf('about/lay-and-land/README.md');
    const cc = oidOf('about/craft-and-care/README.md');
    const nulBytes = encoder.encode('[x](a.md)\x00');
    const badUtf8 = new Uint8Array([0x23, 0x20, 0xff, 0xfe, 0x0a]);
    const { observation } = observed({
      blobOverrides: {
        [ll]: encoder.encode('[RFC](rfcs/0001.md)\n\n'),
        [la]: nulBytes,
        [cc]: badUtf8,
      },
    });
    const outcome = (path: string) => observation.reads.find((read) => read.path === path);
    expect(outcome('about/legends-and-lore/README.md')).toMatchObject({ outcome: 'object-id-mismatch' });
    // NUL and encoding are judged only on bytes that ARE the named object.
    expect(outcome('about/lay-and-land/README.md')).toMatchObject({ outcome: 'object-id-mismatch' });
    expect(outcome('about/craft-and-care/README.md')).toMatchObject({ outcome: 'object-id-mismatch' });
    const nulTree = TREE.map((entry) =>
      entry.path === 'about/lay-and-land/README.md' ? { ...entry, objectId: sha1Blob(nulBytes), sizeBytes: nulBytes.byteLength } : entry,
    );
    const nul = observed({ tree: nulTree, blobOverrides: { [sha1Blob(nulBytes)]: nulBytes } }).observation;
    expect(nul.reads.find((read) => read.path === 'about/lay-and-land/README.md')).toMatchObject({ outcome: 'contains-nul', bytes: nulBytes.byteLength });
    const utfTree = TREE.map((entry) =>
      entry.path === 'about/craft-and-care/README.md' ? { ...entry, objectId: sha1Blob(badUtf8), sizeBytes: badUtf8.byteLength } : entry,
    );
    const utf = observed({ tree: utfTree, blobOverrides: { [sha1Blob(badUtf8)]: badUtf8 } }).observation;
    expect(utf.reads.find((read) => read.path === 'about/craft-and-care/README.md')).toMatchObject({ outcome: 'not-utf-8' });
    for (const item of [observation, nul, utf]) {
      expect(item.manifest.pillars.filter((pillar) => pillar.state === 'unknown').length).toBeGreaterThan(0);
      expect(item.degradation?.degradationState).toBe('Partial snapshot');
    }
  });

  it('a failing cat-file leaves the seed ledgered as git-read-failed', () => {
    const hs = oidOf('about/heart-and-soul/README.md');
    const { observation } = observed({ blobOverrides: { [hs]: 'throw' } });
    expect(observation.reads.find((read) => read.path === 'about/heart-and-soul/README.md')).toMatchObject({ outcome: 'git-read-failed', bytes: 0 });
    expect(observation.manifest.pillars.find((pillar) => pillar.key === 'heart-and-soul')).toMatchObject({ state: 'unknown', reason: 'index-unavailable' });
    expect(observation.sources.map((source) => source.path)).not.toContain('about/heart-and-soul/vision.md');
  });

  it('screens a secret-bearing root seed before it can derive any child path', () => {
    const sentinel = `token=ghp_${'A'.repeat(20)}_PHASE_A_SENTINEL`;
    const bytes = encoder.encode(`${TEXTS['about/README.md'] ?? ''}\n${sentinel}\n`);
    const objectId = sha1Blob(bytes);
    const tree = TREE.map((entry) => entry.path === 'about/README.md' ? { ...entry, objectId, sizeBytes: bytes.byteLength } : entry);
    const { observation, calls } = observed({ tree, blobOverrides: { [objectId]: bytes } });
    expect(observation.reads).toEqual([{ path: 'about/README.md', objectId, outcome: 'secret-matched', bytes: bytes.byteLength, detail: 'known-token-formats' }]);
    expect(calls.filter((call) => call[0] === 'cat-file')).toHaveLength(1);
    expect(observation.manifest.pillars.every((pillar) => pillar.state === 'unknown')).toBe(true);
    expect(observation.sources.map((source) => source.path)).toEqual([
      'about/README.md',
      'openspec/specs/alpha/spec.md',
      'roster/atlas/MANIFESTO.md',
      'roster/atlas/butler.toml',
    ]);
    expect(observation.degradation).toMatchObject({ failureState: 'secretMatchedOrUnclassifiable', unknownReason: 'excluded-content' });
    expect(JSON.stringify(observation)).not.toContain(sentinel);
  });

  it('screens an active-content pillar seed before it can derive that pillar children', () => {
    const sentinel = '<script>PHASE_A_ACTIVE_SENTINEL</script>';
    const bytes = encoder.encode(`${TEXTS['about/heart-and-soul/README.md'] ?? ''}\n${sentinel}\n`);
    const objectId = sha1Blob(bytes);
    const tree = TREE.map((entry) => entry.path === 'about/heart-and-soul/README.md' ? { ...entry, objectId, sizeBytes: bytes.byteLength } : entry);
    const { observation } = observed({ tree, blobOverrides: { [objectId]: bytes } });
    expect(observation.reads.find((read) => read.path === 'about/heart-and-soul/README.md')).toEqual({
      path: 'about/heart-and-soul/README.md', objectId, outcome: 'active-content', bytes: bytes.byteLength, detail: '2',
    });
    expect(observation.sources.map((source) => source.path)).not.toContain('about/heart-and-soul/vision.md');
    expect(observation.sources.map((source) => source.path)).not.toContain('about/heart-and-soul/missing.md');
    expect(observation.manifest.pillars.find((pillar) => pillar.key === 'heart-and-soul')).toMatchObject({ state: 'unknown', reason: 'index-unavailable' });
    expect(JSON.stringify(observation)).not.toContain('PHASE_A_ACTIVE_SENTINEL');
  });
});

describe('observeProjectShapeSources — capture failures and invalid input', () => {
  it('rev-parse failure is Observer failed and stops before any other git call', () => {
    const { result, calls } = observe({ failRevParse: true });
    expect(result).toEqual({
      kind: 'unknown',
      observer: PWB_OBSERVER_IDENTITY,
      repositoryId: REPOSITORY,
      requestedRevision: 'main',
      capturedAt: CAPTURED_AT,
      failureState: 'gitCaptureFailed',
      degradationState: 'Observer failed',
      reason: 'source-uncaptured-or-unreachable',
      detail: 'git rev-parse failed: fatal: Needed a single revision',
    });
    expect(calls).toHaveLength(1);
  });

  it('show, ls-tree and malformed listings are Observer failed with no cat-file', () => {
    const show = observe({ failShow: true });
    expect(show.result).toMatchObject({ kind: 'unknown', degradationState: 'Observer failed', detail: 'git show failed: fatal: bad object' });
    expect(show.calls).toHaveLength(2);
    const lsTree = observe({ failLsTree: true });
    expect(lsTree.result).toMatchObject({ kind: 'unknown', degradationState: 'Observer failed' });
    expect(lsTree.calls).toHaveLength(3);
    const malformed = observe({ listing: `100644 blob ${'a'.repeat(40)}      10\t"quoted.md"\x00` });
    expect(malformed.result).toMatchObject({ kind: 'unknown', degradationState: 'Observer failed', detail: expect.stringContaining('malformed') });
    expect(malformed.calls).toHaveLength(3);
    const badInstant = observe({ committedAt: 'yesterday' });
    expect(badInstant.result).toMatchObject({ kind: 'unknown', degradationState: 'Observer failed', detail: expect.stringContaining('committer instant') });
  });

  it('rejects invalid input before any git call', () => {
    const git = runner();
    const base = { repositoryId: REPOSITORY, revision: 'main', capturedAt: CAPTURED_AT, runGit: git.runGit, classifyPhaseA };
    expect(observeProjectShapeSources({ ...base, repositoryId: ' ' })).toEqual({ kind: 'invalid-input', reason: 'repositoryId is empty' });
    expect(observeProjectShapeSources({ ...base, revision: '' })).toEqual({ kind: 'invalid-input', reason: 'revision is empty or option-shaped' });
    expect(observeProjectShapeSources({ ...base, revision: '--output=/tmp/x' })).toEqual({ kind: 'invalid-input', reason: 'revision is empty or option-shaped' });
    expect(observeProjectShapeSources({ ...base, capturedAt: 'now' })).toEqual({ kind: 'invalid-input', reason: 'capturedAt is not an ISO-8601 instant' });
    expect(observeProjectShapeSources({ ...base, capturedAt: '2026-09-03' })).toEqual({ kind: 'invalid-input', reason: 'capturedAt is not an ISO-8601 instant' });
    expect(git.calls).toEqual([]);
  });
});

describe('observeProjectShapeSources — determinism', () => {
  it('same exact inputs at different capture instants give the same observation digest', () => {
    const first = observed({ capturedAt: '2026-09-03T00:00:00Z' }).observation;
    const second = observed({ capturedAt: '2026-09-04T00:00:00Z' }).observation;
    expect(first.capturedAt).not.toBe(second.capturedAt);
    expect(first.observationDigest).toBe(second.observationDigest);
    expect(first.observationDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(first.manifest.digest).toBe(second.manifest.digest);
    const reordered = observed({ tree: [...TREE].reverse() }).observation;
    expect(reordered.observationDigest).toBe(first.observationDigest);
  });

  // Expected value derived outside this module: Python's json.dumps(sort_keys=True, separators=(',', ':'), ensure_ascii=False) over the
  // observation without `observationDigest`, its top-level `capturedAt` and each source stamp's `capturedAt`, then SHA-256
  // (docs/evidence/syzygy-bpyt-6-13/derive-literals.py). A change to the fixture, the observer identity, the limits or the
  // observation shape moves it, on purpose: the observation digest is an identity (class 3).
  it('digests the observation without its capture instants: the fixture observation has this digest', () => {
    expect(observed().observation.observationDigest).toBe('sha256:adeac2c5388357ea3b14ab865f65cb6864753a95f98553fe5fdce0b1f03cb428');
  });

  it('a changed seed body, revision or limit changes the digest', () => {
    const base = observed().observation;
    const changedBody = encoder.encode('- [Vision](vision.md)\n- [Missing](missing.md)\n\n');
    const tree = TREE.map((entry) =>
      entry.path === 'about/heart-and-soul/README.md' ? { ...entry, objectId: sha1Blob(changedBody), sizeBytes: changedBody.byteLength } : entry,
    );
    const changed = observed({ tree, blobOverrides: { [sha1Blob(changedBody)]: changedBody } }).observation;
    expect(changed.observationDigest).not.toBe(base.observationDigest);
    expect(observed({ limits: { ...PWB_RESOURCE_LIMITS, maxSources: 100 } }).observation.observationDigest).not.toBe(base.observationDigest);
    expect(observed({ committedAt: '2026-08-16T10:00:00+00:00' }).observation.observationDigest).not.toBe(base.observationDigest);
  });

  it('the observation is deeply frozen', () => {
    const { observation } = observed();
    expect(Object.isFrozen(observation)).toBe(true);
    expect(Object.isFrozen(observation.sources)).toBe(true);
    expect(Object.isFrozen(observation.sources[0]?.stamp)).toBe(true);
    expect(Object.isFrozen(observation.reads)).toBe(true);
  });
});

// The homes the default fixture's root index declares by its links.
const DECLARED_HOMES: ReadonlySet<string> = new Set([
  'about/heart-and-soul',
  'about/legends-and-lore',
  'about/spec-and-spine',
  'about/lay-and-land',
  'about/craft-and-care',
]);

describe('admitPhaseARead', () => {
  const tree = indexGitTree(TREE);
  it('admits only tree-matching regular blobs at the root index or a declared pillar index', () => {
    const root = oidOf('about/README.md');
    expect(admitPhaseARead(tree, { path: 'about/README.md', objectId: root }, DECLARED_HOMES)).toEqual({ kind: 'admitted', entry: TREE[1] });
    expect(admitPhaseARead(tree, { path: 'about/heart-and-soul/README.md', objectId: oidOf('about/heart-and-soul/README.md') }, DECLARED_HOMES)).toEqual({ kind: 'admitted', entry: TREE[2] });
    expect(admitPhaseARead(tree, { path: 'about/heart-and-soul/vision.md', objectId: oidOf('about/heart-and-soul/vision.md') }, DECLARED_HOMES)).toEqual({ kind: 'refused', reason: 'not-a-phase-a-seed-path' });
    expect(admitPhaseARead(tree, { path: 'roster/atlas/butler.toml', objectId: oidOf('roster/atlas/butler.toml') }, DECLARED_HOMES)).toEqual({ kind: 'refused', reason: 'not-a-phase-a-seed-path' });
    expect(admitPhaseARead(tree, { path: 'README.md', objectId: oidOf('README.md') }, DECLARED_HOMES)).toEqual({ kind: 'refused', reason: 'not-a-phase-a-seed-path' });
    expect(admitPhaseARead(tree, { path: 'docs/heart-and-soul/README.md', objectId: root }, new Set(['docs/heart-and-soul']))).toEqual({ kind: 'refused', reason: 'not-in-tree' });
    expect(admitPhaseARead(tree, { path: 'about/README.md', objectId: 'f'.repeat(40) }, DECLARED_HOMES)).toEqual({ kind: 'refused', reason: 'object-id-differs-from-tree' });
    const symlinked = indexGitTree(TREE.map((entry) => (entry.path === 'about/README.md' ? { ...entry, mode: '120000' } : entry)));
    expect(admitPhaseARead(symlinked, { path: 'about/README.md', objectId: root }, DECLARED_HOMES)).toEqual({ kind: 'refused', reason: 'not-a-regular-blob' });
    const submodule = indexGitTree([{ mode: '160000', type: 'commit', objectId: root, path: 'about/README.md' }]);
    expect(admitPhaseARead(submodule, { path: 'about/README.md', objectId: root }, DECLARED_HOMES)).toEqual({ kind: 'refused', reason: 'not-a-regular-blob' });
  });

  it('a declared home admits its index wherever it sits; a directory merely named for a pillar declares nothing (syzygy-1z3.29)', () => {
    const withIndex = indexGitTree([...TREE, blob('openspec/README.md')]);
    const openspecIndex = { path: 'openspec/README.md', objectId: oidOf('openspec/README.md') };
    expect(admitPhaseARead(withIndex, openspecIndex, new Set(['openspec']))).toEqual({ kind: 'admitted', entry: blob('openspec/README.md') });
    expect(admitPhaseARead(withIndex, openspecIndex, DECLARED_HOMES)).toEqual({ kind: 'refused', reason: 'not-a-phase-a-seed-path' });
    expect(admitPhaseARead(withIndex, openspecIndex, new Set())).toEqual({ kind: 'refused', reason: 'not-a-phase-a-seed-path' });
    const named = { path: 'about/heart-and-soul/README.md', objectId: oidOf('about/heart-and-soul/README.md') };
    expect(admitPhaseARead(withIndex, named, new Set())).toEqual({ kind: 'refused', reason: 'not-a-phase-a-seed-path' });
    expect(admitPhaseARead(withIndex, named, new Set(['about/heart-and-soul/']))).toEqual({ kind: 'refused', reason: 'not-a-phase-a-seed-path' });
    // The root index needs no declaration: it is the fixed seed.
    expect(admitPhaseARead(withIndex, { path: 'about/README.md', objectId: oidOf('about/README.md') }, new Set())).toEqual({ kind: 'admitted', entry: TREE[1] });
  });
});

// A root index in the real Butlers shape: the five-row table declares
// Spec and Spine's home as `openspec/`, a directory not named for the
// pillar, while `about/spec-and-spine/README.md` still exists undeclared.
const ROOT_DECLARING_OPENSPEC = [
  '# Fixture',
  '',
  '| Pillar | Purpose | Directory | Start here |',
  '| --- | --- | --- | --- |',
  '| Heart and Soul | why | `about/heart-and-soul/` | [Index](heart-and-soul/README.md) |',
  '| Legends and Lore | design | `about/legends-and-lore/` | [Index](legends-and-lore/README.md) |',
  '| Spec and Spine | behavior | `openspec/` | OpenSpec |',
  '| Lay and Land | map | `about/lay-and-land/` | [Index](lay-and-land/README.md) |',
  '| Craft and Care | quality | `about/craft-and-care/` | [Index](craft-and-care/README.md) |',
  '',
].join('\n');

function withRootIndex(text: string): { tree: readonly GitTreeEntry[]; blobOverrides: Readonly<Record<string, Uint8Array>> } {
  const bytes = encoder.encode(text);
  const objectId = sha1Blob(bytes);
  const tree = [...TREE.map((entry) => (entry.path === 'about/README.md' ? { ...entry, objectId, sizeBytes: bytes.byteLength } : entry)), blob('openspec/README.md')];
  return { tree, blobOverrides: { [objectId]: bytes } };
}

describe('declared pillar homes (syzygy-1z3.29)', () => {
  it('reads the pillar index at a declared home that is not named for the pillar', () => {
    const { observation } = observed(withRootIndex(ROOT_DECLARING_OPENSPEC));
    expect(observation.manifest.pillars.find((pillar) => pillar.key === 'spec-and-spine')).toMatchObject({
      state: 'discovered',
      indexPath: 'openspec/README.md',
    });
    expect(observation.reads.find((read) => read.path === 'openspec/README.md')).toMatchObject({ outcome: 'read', bytes: BYTES.get('openspec/README.md')?.byteLength });
    // The undeclared, pillar-named directory is asked for by nothing.
    expect(observation.reads.some((read) => read.path === 'about/spec-and-spine/README.md')).toBe(false);
    expect(observation.manifest.sources.some((source) => source.path === 'about/spec-and-spine/README.md')).toBe(false);
  });

  it('the other four declared homes read as before, with no refusal in the ledger', () => {
    const { observation } = observed(withRootIndex(ROOT_DECLARING_OPENSPEC));
    expect(observation.manifest.pillars.map((pillar) => [pillar.key, pillar.state])).toEqual([
      ['heart-and-soul', 'discovered'],
      ['legends-and-lore', 'discovered'],
      ['spec-and-spine', 'discovered'],
      ['lay-and-land', 'discovered'],
      ['craft-and-care', 'discovered'],
    ]);
    expect(observation.reads.filter((read) => read.outcome === 'refused')).toEqual([]);
  });
});

describe('the seed reader widens phase A only after a validated root index (syzygy-1z3.29 review)', () => {
  const seedOf = (path: string, tree: readonly GitTreeEntry[] = TREE) => {
    const entry = tree.find((candidate) => candidate.path === path);
    if (entry === undefined) throw new Error(`fixture lacks ${path}`);
    return { path, objectId: entry.objectId };
  };
  const reader = (options: RunnerOptions = {}) => {
    const tree = options.tree ?? TREE;
    const reads: Parameters<typeof createPhaseASeedReader>[0]['reads'] = [];
    return {
      read: createPhaseASeedReader({
        tree: indexGitTree(tree),
        limits: PWB_RESOURCE_LIMITS,
        ledger: createResourceLedger(PWB_RESOURCE_LIMITS),
        reads,
        runGit: runner(options).runGit,
        objectFormat: 'sha1',
        classifyPhaseA,
      }),
      reads,
    };
  };

  it('a declared pillar index asked for before the root index is refused, and read after it', () => {
    const { read, reads } = reader();
    expect(read(seedOf('about/heart-and-soul/README.md'))).toEqual({ kind: 'unavailable', reason: 'phase A read refused: not-a-phase-a-seed-path' });
    expect(read(seedOf('about/README.md'))).toMatchObject({ kind: 'text', text: TEXTS['about/README.md'], pillarRoots: expect.any(Map) });
    expect(read(seedOf('about/heart-and-soul/README.md'))).toEqual({ kind: 'text', text: TEXTS['about/heart-and-soul/README.md'] });
    expect(reads.map((record) => record.outcome)).toEqual(['refused', 'read', 'read']);
  });

  it('a root index the classifier excludes declares nothing: its pillar index stays refused', () => {
    const sentinel = `token=ghp_${'A'.repeat(20)}_PHASE_A_SENTINEL`;
    const bytes = encoder.encode(`${TEXTS['about/README.md'] ?? ''}\n${sentinel}\n`);
    const objectId = sha1Blob(bytes);
    const tree = TREE.map((entry) => entry.path === 'about/README.md' ? { ...entry, objectId, sizeBytes: bytes.byteLength } : entry);
    const { read, reads } = reader({ tree, blobOverrides: { [objectId]: bytes } });
    expect(read({ path: 'about/README.md', objectId })).toEqual({ kind: 'unavailable', reason: 'phase A source excluded: secret-matched' });
    expect(read(seedOf('about/heart-and-soul/README.md', tree))).toEqual({ kind: 'unavailable', reason: 'phase A read refused: not-a-phase-a-seed-path' });
    expect(reads.map((record) => record.outcome)).toEqual(['secret-matched', 'refused']);
  });

  // syzygy-bpyt.55 (D1): the recognizer recovers from a malformed context so that its ranges are total, but the profile's decision is to
  // exclude the whole artifact, and no reader behind the gate is handed such a text. A root index with an unclosed fence, with a backtick
  // opener whose info string holds a backtick, or with a span open at a fence opener declares nothing, whatever its recovered ranges would show.
  it.each([
    ['an unclosed fence', ['# Butlers', '', '[Heart and Soul](heart-and-soul/)', '', '```', '[Lore](legends-and-lore/)', '']],
    ['a backtick opener with a backtick in its info string', ['# Butlers', '```a`b', '[Heart and Soul](heart-and-soul/)', '```', '']],
    ['a span open at a fence opener', ['# Butlers', '`open', '```', '[Heart and Soul](heart-and-soul/)', '```', '']],
  ] as const)('a root index with %s declares nothing: its pillar index stays refused', (_name, lines) => {
    const bytes = encoder.encode(lines.join('\n'));
    const objectId = sha1Blob(bytes);
    const tree = TREE.map((entry) => entry.path === 'about/README.md' ? { ...entry, objectId, sizeBytes: bytes.byteLength } : entry);
    const { read, reads } = reader({ tree, blobOverrides: { [objectId]: bytes } });
    expect(read({ path: 'about/README.md', objectId })).toEqual({ kind: 'unavailable', reason: 'phase A source excluded: active-content' });
    expect(read(seedOf('about/heart-and-soul/README.md', tree))).toEqual({ kind: 'unavailable', reason: 'phase A read refused: not-a-phase-a-seed-path' });
    expect(reads.map((record) => record.outcome)).toEqual(['active-content', 'refused']);
  });

  it('a seed with a leading byte-order mark is read without it', () => {
    // EF BB BF is the UTF-8 byte-order mark; the decoded text starts at the byte after it.
    const bytes = Uint8Array.from([0xef, 0xbb, 0xbf, 0x61, 0x0a]);
    const objectId = sha1Blob(bytes);
    const tree = TREE.map((entry) => entry.path === 'about/README.md' ? { ...entry, objectId, sizeBytes: bytes.byteLength } : entry);
    const { read, reads } = reader({ tree, blobOverrides: { [objectId]: bytes } });
    expect(read({ path: 'about/README.md', objectId })).toMatchObject({ kind: 'text', text: 'a\n' });
    expect(reads).toEqual([{ path: 'about/README.md', objectId, outcome: 'read', bytes: 5 }]);
  });

  it('a seed whose bytes are not UTF-8 is refused with its reason and a not-utf-8 read record', () => {
    const bytes = Uint8Array.from([0x23, 0x20, 0xff, 0xfe, 0x0a]);
    const objectId = sha1Blob(bytes);
    const tree = TREE.map((entry) => entry.path === 'about/README.md' ? { ...entry, objectId, sizeBytes: bytes.byteLength } : entry);
    const { read, reads } = reader({ tree, blobOverrides: { [objectId]: bytes } });
    expect(read({ path: 'about/README.md', objectId })).toEqual({ kind: 'unavailable', reason: 'seed is not valid UTF-8' });
    expect(reads).toEqual([{ path: 'about/README.md', objectId, outcome: 'not-utf-8', bytes: 5 }]);
  });

  it('a root index that fails NUL validation declares nothing either', () => {
    const bytes = encoder.encode(`${TEXTS['about/README.md'] ?? ''}\u0000`);
    const objectId = sha1Blob(bytes);
    const tree = TREE.map((entry) => entry.path === 'about/README.md' ? { ...entry, objectId, sizeBytes: bytes.byteLength } : entry);
    const { read, reads } = reader({ tree, blobOverrides: { [objectId]: bytes } });
    expect(read({ path: 'about/README.md', objectId })).toEqual({ kind: 'unavailable', reason: 'seed contains NUL' });
    expect(read(seedOf('about/heart-and-soul/README.md', tree))).toEqual({ kind: 'unavailable', reason: 'phase A read refused: not-a-phase-a-seed-path' });
    expect(reads.map((record) => record.outcome)).toEqual(['contains-nul', 'refused']);
  });

  it('a pillar index naming a pillar-keyed directory declares no home: only the root index widens the set', () => {
    // A stray `legends-and-lore/README.md` at the repository root, undeclared
    // by the root index; heart-and-soul's index links it the way a root index
    // would. Hand-typed expectation: still refused after both reads.
    const stray = encoder.encode('# stray\n');
    const strayId = sha1Blob(stray);
    const hsIndex = encoder.encode('[Lore](../legends-and-lore/README.md)\n');
    const hsId = sha1Blob(hsIndex);
    const tree: GitTreeEntry[] = [
      ...TREE.map((entry) => entry.path === 'about/heart-and-soul/README.md' ? { ...entry, objectId: hsId, sizeBytes: hsIndex.byteLength } : entry),
      { mode: '100644', type: 'blob', objectId: strayId, sizeBytes: stray.byteLength, path: 'legends-and-lore/README.md' },
    ];
    const { read, reads } = reader({ tree, blobOverrides: { [strayId]: stray, [hsId]: hsIndex } });
    expect(read(seedOf('about/README.md', tree)).kind).toBe('text');
    expect(read({ path: 'about/heart-and-soul/README.md', objectId: hsId })).toEqual({ kind: 'text', text: '[Lore](../legends-and-lore/README.md)\n' });
    expect(read({ path: 'legends-and-lore/README.md', objectId: strayId })).toEqual({ kind: 'unavailable', reason: 'phase A read refused: not-a-phase-a-seed-path' });
    expect(reads.map((record) => [record.path, record.outcome])).toEqual([
      ['about/README.md', 'read'],
      ['about/heart-and-soul/README.md', 'read'],
      ['legends-and-lore/README.md', 'refused'],
    ]);
  });

  it('a pillar declared at two different homes admits neither index', () => {
    const rootText = `${TEXTS['about/README.md'] ?? ''}\nAlso [Heart](../alt/heart-and-soul/README.md).\n`;
    const rootBytes = encoder.encode(rootText);
    const rootId = sha1Blob(rootBytes);
    const alt = encoder.encode('# alt\n');
    const altId = sha1Blob(alt);
    const tree: GitTreeEntry[] = [
      ...TREE.map((entry) => entry.path === 'about/README.md' ? { ...entry, objectId: rootId, sizeBytes: rootBytes.byteLength } : entry),
      { mode: '100644', type: 'blob', objectId: altId, sizeBytes: alt.byteLength, path: 'alt/heart-and-soul/README.md' },
    ];
    const { read } = reader({ tree, blobOverrides: { [rootId]: rootBytes, [altId]: alt } });
    expect(read({ path: 'about/README.md', objectId: rootId })).toMatchObject({ kind: 'text', text: rootText, pillarRoots: expect.any(Map) });
    expect(read(seedOf('about/heart-and-soul/README.md', tree))).toEqual({ kind: 'unavailable', reason: 'phase A read refused: not-a-phase-a-seed-path' });
    expect(read({ path: 'alt/heart-and-soul/README.md', objectId: altId })).toEqual({ kind: 'unavailable', reason: 'phase A read refused: not-a-phase-a-seed-path' });
    // The unambiguous homes are unaffected.
    expect(read(seedOf('about/legends-and-lore/README.md', tree)).kind).toBe('text');
  });

  it('a pillar index that is read declares nothing: only the root index widens the set', () => {
    const { read } = reader();
    read(seedOf('about/README.md'));
    // heart-and-soul's own index links vision.md and missing.md; neither is
    // a README, and a README under a directory it names is not a home.
    expect(read(seedOf('about/heart-and-soul/README.md')).kind).toBe('text');
    expect(read(seedOf('about/heart-and-soul/vision.md'))).toEqual({ kind: 'unavailable', reason: 'phase A read refused: not-a-phase-a-seed-path' });
  });
});

describe('composition with the PWB-REQ-005 gate', () => {
  it('a non-admitting authority never reaches the observer: zero git calls', () => {
    const git = runner();
    const result = observeProjectShape({
      authority: ABSENT_AUTHORITY,
      read: ({ authority }) => observeProjectShapeSources({ repositoryId: REPOSITORY, revision: 'main', capturedAt: CAPTURED_AT, runGit: git.runGit, classifyPhaseA, authority }),
    });
    expect(result.kind).toBe('unknown');
    expect(git.calls).toEqual([]);
  });

  it('an admitting authority reaches the observer and is bound as a deterministic input', () => {
    const git = runner();
    const result = observeProjectShape({
      authority: ADMITTING_AUTHORITY,
      read: ({ authority }) => observeProjectShapeSources({ repositoryId: REPOSITORY, revision: 'main', capturedAt: CAPTURED_AT, runGit: git.runGit, classifyPhaseA, authority }),
    });
    expect(result.kind).toBe('admitted');
    if (result.kind !== 'admitted' || result.result.kind !== 'observed') throw new Error('expected an observation');
    expect(result.result.deterministicInputs.authority).toMatchObject({ kind: 'evaluated', evaluationId: 'evaluation:test-admitting' });
    expect(git.calls.filter((call) => call[0] === 'cat-file')).toHaveLength(PHASE_A.length);
  });
});

describe('registry-bound constants', () => {
  const registry = JSON.parse(
    readFileSync(join(REPO_ROOT, '.syzygy/governance/declarations/adapter-registry/POLARIS-BUTLERS-PROJECT-SHAPE-OBSERVER-CANDIDATE.json'), 'utf8'),
  ) as {
    entries: {
      observerId: string;
      observerVersion: string;
      discoveryVersion: string;
      implementationId: string;
      implementationVersion: string;
      resourceLimits: PwbResourceLimits;
      failureStates: Record<string, { degradationState: string; unknownReason: string }>;
      typedAuthority: { workingTreeRead: boolean; executeObservedCode: boolean };
    }[];
  };
  const entry = registry.entries[0];
  if (entry === undefined) throw new Error('registry has no entry');

  it('observer identity, limits and failure states are byte-equal to the act-bound registry entry', () => {
    expect(PWB_OBSERVER_IDENTITY).toEqual({
      observerId: entry.observerId,
      observerVersion: entry.observerVersion,
      discoveryVersion: entry.discoveryVersion,
      implementationId: entry.implementationId,
      implementationVersion: entry.implementationVersion,
    });
    // The 2026-09-30 registry act declares maxBriefingResponseBytes; the
    // owner's direction that day keeps it unread until its own
    // continuation, so the code carries every other limit and not that one.
    const { maxBriefingResponseBytes: briefingCeiling, ...consumedLimits } = entry.resourceLimits as PwbResourceLimits & { maxBriefingResponseBytes?: number };
    expect(typeof briefingCeiling).toBe('number');
    expect(PWB_RESOURCE_LIMITS).toEqual(consumedLimits);
    expect(Object.keys(PWB_RESOURCE_LIMITS)).not.toContain('maxBriefingResponseBytes');
    expect(PWB_FAILURE_STATES).toEqual(entry.failureStates);
    expect(entry.typedAuthority.workingTreeRead).toBe(false);
    expect(entry.typedAuthority.executeObservedCode).toBe(false);
  });

  it('the content class is the one the act-bound consent record names', () => {
    const consent = readFileSync(join(REPO_ROOT, '.syzygy/governance/decisions/BUTLERS-PROJECT-SHAPE-OBSERVATION-CONSENT.md'), 'utf8');
    expect(consent).toContain(`Observation content class: \`${PWB_CONTENT_CLASS}\``);
    expect(PWB_CONTENT_CLASS).toBe('declared-project-shape-text');
  });

  it('gitBlobObjectId matches Git for the empty blob and a known one', () => {
    expect(gitBlobObjectId(new Uint8Array())).toBe('e69de29bb2d1d6434b8b29ae775ad8c2e48c5391');
    expect(gitBlobObjectId(encoder.encode('hello\n'))).toBe('ce013625030ba8dba906f756967f9e9ca394464a');
    expect(gitBlobObjectId(new Uint8Array(), 'sha256')).toBe('473a0f4c3be8a93681a267e3b1e9a7dcda1185436fe141f7749120a303721813');
  });

  it('sourceIdentityOf follows the registry git-tree-entry scheme', () => {
    const anchor = { kind: 'blob', mode: '100644', objectId: 'a'.repeat(40) } as const;
    expect(sourceIdentityOf('repository:x', 'b'.repeat(40), { path: 'p/q.md', rule: 'root-index', extractionClasses: [], anchor })).toBe(
      `repository:x@${'b'.repeat(40)}:p/q.md#${'a'.repeat(40)}`,
    );
    expect(sourceIdentityOf('repository:x', 'b'.repeat(40), { path: 'p/q.md', rule: 'root-index', extractionClasses: [], anchor: { kind: 'missing-at-revision' } })).toBe(
      `repository:x@${'b'.repeat(40)}:p/q.md#missing`,
    );
  });
});

// ---------------------------------------------------------------------
// Phase A charges the evaluation-wide ledger (registry amendment
// 2026-09-05: `parsePassIdentities`, `resourceLimitSemantics`; PWB-REQ-006
// as amended). A seed is one utf8 validation, the seven guard passes of
// the phase-A classifier and one link discovery: nine registry passes.

describe('phase A charges one shared resource ledger', () => {
  const chargingClassifier = (text: string, charge: ParsePassCharge) => classifyPhaseASeed(PHASE_A_DETECTORS, text, charge);

  function observeWith(limits: Partial<PwbResourceLimits>) {
    const ledger = createResourceLedger({ ...PWB_RESOURCE_LIMITS, ...limits });
    const git = runner({});
    const result = observeProjectShapeSources({ repositoryId: REPOSITORY, revision: 'main', capturedAt: CAPTURED_AT, runGit: git.runGit, classifyPhaseA: chargingClassifier, ledger });
    if (result.kind !== 'observed') throw new Error(`expected observed, got ${result.kind}`);
    return { observation: result, ledger, calls: git.calls };
  }

  it('a safe seed costs exactly nine registry passes, each identity once, and its body counts once', () => {
    const { observation, ledger } = observeWith({});
    for (const path of PHASE_A) expect(ledger.passesFor(path), path).toBe(9);
    const summary = ledger.summary();
    expect(summary.passesByIdentity).toEqual({
      'utf8-and-nul-validation': 6,
      'secret-private-key-fragments': 6,
      'secret-known-token-formats': 6,
      'secret-credential-assignment': 6,
      'secret-credential-bearing-url': 6,
      'markdown-code-context-mask': 6,
      'active-html-svg-script-handler': 6,
      'unsafe-url-positions': 6,
      'phase-a-link-discovery': 6,
      'project-account-extraction': 0,
      'declared-item-extraction': 0,
      'fact-and-precedence-extraction': 0,
    });
    expect(summary.maxPassesOnOneSource).toBe(9);
    expect(summary.sourcesTraversed).toBe(6);
    expect(summary.bodiesCounted).toBe(6);
    expect(summary.totalBytes).toBe(PHASE_A.reduce((sum, path) => sum + (BYTES.get(path)?.byteLength ?? 0), 0));
    expect(observation.limitBreaches).toEqual([]);
    for (const path of PHASE_A) {
      const held = ledger.recall(path, oidOf(path));
      expect(held?.text, path).toBe(TEXTS[path]);
    }
  });

  it('maxParsePassesPerSource 8 stops the root closed at link discovery, so nothing below it is discovered; 9 reads every seed', () => {
    const under = observeWith({ maxParsePassesPerSource: 8 });
    const root = 'about/README.md';
    expect(under.observation.reads).toEqual([{ path: root, objectId: oidOf(root), outcome: 'over-limit', bytes: BYTES.get(root)?.byteLength, detail: 'maxParsePassesPerSource' }]);
    expect(under.observation.limitBreaches).toEqual([{ limit: 'maxParsePassesPerSource', declared: 8, observed: 9, path: root }]);
    expect(under.ledger.summary().passesByIdentity['phase-a-link-discovery']).toBe(0);
    expect(under.ledger.summary().passesByIdentity['unsafe-url-positions']).toBe(1);
    expect(under.ledger.passesFor(root)).toBe(8);
    // An unreadable root is the whole-observation failure state, as for any
    // other root read failure.
    expect(under.observation.degradation).toMatchObject({ failureState: 'sourceMissingOrUnreadable', unknownReason: 'source-uncaptured-or-unreachable' });
    // Nothing was discovered from a seed that never reached link discovery;
    // the root itself stays in the population.
    expect(under.observation.manifest.sources.map((source) => source.path).filter((path) => path.startsWith('about/'))).toEqual([root]);
    expect(under.ledger.recall(root, oidOf(root))).toBeUndefined();
    const at = observeWith({ maxParsePassesPerSource: 9 });
    expect(at.observation.reads.every((read) => read.outcome === 'read')).toBe(true);
    expect(at.observation.limitBreaches).toEqual([]);
  });

  it('maxParsePassesPerSource 1 stops a seed before its first classifier pass', () => {
    const { observation, ledger } = observeWith({ maxParsePassesPerSource: 1 });
    expect(observation.reads.map((read) => [read.outcome, read.detail])).toEqual([['over-limit', 'maxParsePassesPerSource']]);
    expect(ledger.summary().passesByIdentity['secret-private-key-fragments']).toBe(0);
    expect(ledger.summary().passesByIdentity['utf8-and-nul-validation']).toBe(1);
    expect(ledger.breaches).toEqual([{ limit: 'maxParsePassesPerSource', declared: 1, observed: 2, path: 'about/README.md' }]);
  });
});
