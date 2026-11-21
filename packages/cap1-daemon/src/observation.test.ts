import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  computeCoverage,
  designateRoots,
  registerProject,
  type ConsentRecord,
  type PreObservationConsentDecision,
  type ProjectId,
  type RepositoryId,
} from '@syzygy/cap1-core';

import {
  observeDeclaration,
  observeRepositorySnapshot,
  observeRootCandidate,
} from './observation.js';

// RT1 observation adapter tests — REAL temp directories under
// os.tmpdir(), never mocks. Oracle independence: every expected value
// below is a hard-coded string literal authored in this file, never
// imported from a vocabulary module. The core functions are imported
// only to run the observed inputs through the same pipeline the
// conformance suite exercises — the EXPECTATIONS stay literal.

// chmod-based unreadability is meaningless as root (root reads anything).
const runningAsRoot =
  typeof process.getuid === 'function' && process.getuid() === 0;

// The checker-authored declaration. Expected identity values are the
// literals used here.
const DECLARED_PROJECT_ID = 'prj-obs-7c21';
const DECLARED_DISPLAY_NAME = 'Observation Fixture';
const DECLARED_REPO_ID = 'repo-obs-01';

const VALID_DECLARATION = `
schema_version: "1"
project:
  id: ${DECLARED_PROJECT_ID}
  name: ${DECLARED_DISPLAY_NAME}
owner: uniquosity@gmail.com
repositories:
  - id: ${DECLARED_REPO_ID}
    role: governance-root
    consent: consent-record-01
consents:
  - consent-record-01
declarations:
  spec_root: openspec/
relations: []
profiles: []
`;

const REPO_ID = DECLARED_REPO_ID as RepositoryId;

// Temp fixtures, cleaned up per test. chmod'd paths are re-opened before
// removal so rmSync can traverse them.
const created: { path: string; reopen: string[] }[] = [];

function makeRepo(): string {
  const root = mkdtempSync(join(tmpdir(), 'syzygy-rt1-'));
  created.push({ path: root, reopen: [] });
  return root;
}

function lockDown(path: string): void {
  chmodSync(path, 0o000);
  const entry = created[created.length - 1];
  if (entry) entry.reopen.push(path);
}

afterEach(() => {
  for (const { path, reopen } of created.splice(0)) {
    for (const locked of reopen) chmodSync(locked, 0o700);
    rmSync(path, { recursive: true, force: true });
  }
});

function writeDeclaration(root: string, source: string): void {
  mkdirSync(join(root, '.syzygy'), { recursive: true });
  writeFileSync(join(root, '.syzygy', 'project.yaml'), source, 'utf8');
}

describe('observeDeclaration — valid repository fixture', () => {
  it('reads the on-disk declaration at the fixed path and core accepts it', async () => {
    const root = makeRepo();
    writeDeclaration(root, VALID_DECLARATION);

    const observation = await observeDeclaration(root);
    expect(observation.kind).toBe('declaration-read');
    expect(observation.relativePath).toBe('.syzygy/project.yaml');
    if (observation.kind !== 'declaration-read') return;
    expect(observation.result.ok).toBe(true);
    if (!observation.result.ok) return;
    expect(observation.result.declaration.project.id).toBe('prj-obs-7c21');
    expect(observation.result.declaration.project.name).toBe('Observation Fixture');
    expect(observation.result.declaration.repositories).toHaveLength(1);
    expect(observation.result.declaration.repositories[0]?.id).toBe('repo-obs-01');
    expect(observation.result.declaration.repositories[0]?.role).toBe('governance-root');
  });

  it('feeds registerProject unchanged — same shapes the conformance suite exercises (CAP1-REQ-001)', async () => {
    const root = makeRepo();
    writeDeclaration(root, VALID_DECLARATION);

    const observation = await observeDeclaration(root);
    if (observation.kind !== 'declaration-read') throw new Error('expected declaration-read');
    const result = registerProject(observation.result, 'rev-1');
    expect(result.status).toBe('registered');
    if (result.status !== 'registered') return;
    expect(result.facts.projectId).toBe('prj-obs-7c21');
    expect(result.facts.displayName).toBe('Observation Fixture');
    expect(result.facts.rootDesignation).toBe('declared-location');
  });

  it('is deterministic: two observations of the same fixture are deeply equal (CAP1-REQ-005)', async () => {
    const root = makeRepo();
    writeDeclaration(root, VALID_DECLARATION);

    const first = await observeDeclaration(root);
    const second = await observeDeclaration(root);
    expect(second).toEqual(first);
  });
});

describe('observeDeclaration — missing declaration (CAP1-REQ-006 zero-root)', () => {
  it('an observable root with no declaration file is the named missing arm', async () => {
    const root = makeRepo();
    // No .syzygy/project.yaml written.

    const observation = await observeDeclaration(root);
    expect(observation.kind).toBe('declaration-missing');
    if (observation.kind !== 'declaration-missing') return;
    expect(observation.label).toBe('Unknown');
    expect(observation.reason).toBe('missing-declaration');
  });

  it('drives designateRoots to the workspace-level Unknown with reason missing-declaration', async () => {
    const root = makeRepo();

    const candidate = await observeRootCandidate(REPO_ID, root);
    expect(candidate.kind).toBe('candidate');
    if (candidate.kind !== 'candidate') return;
    expect(candidate.candidate.hasDeclaration).toBe(false);

    const designation = designateRoots([candidate.candidate]);
    expect(designation.status).toBe('unknown');
    if (designation.status !== 'unknown') return;
    expect(designation.scope).toBe('workspace');
    expect(designation.reason).toBe('missing-declaration');
  });

  it('a declaring repository yields a hasDeclaration candidate and a designated root', async () => {
    const root = makeRepo();
    writeDeclaration(root, VALID_DECLARATION);

    const candidate = await observeRootCandidate(REPO_ID, root);
    expect(candidate.kind).toBe('candidate');
    if (candidate.kind !== 'candidate') return;
    expect(candidate.candidate.hasDeclaration).toBe(true);

    const designation = designateRoots([candidate.candidate]);
    expect(designation.status).toBe('designated');
    if (designation.status !== 'designated') return;
    expect(designation.root).toBe('repo-obs-01');
  });
});

describe('observeDeclaration — unreadable path is a named failure, never missing, never green', () => {
  it.skipIf(runningAsRoot)('a permission-denied declaration file is declaration-unreachable', async () => {
    const root = makeRepo();
    writeDeclaration(root, VALID_DECLARATION);
    lockDown(join(root, '.syzygy', 'project.yaml'));

    const observation = await observeDeclaration(root);
    expect(observation.kind).toBe('declaration-unreachable');
    if (observation.kind !== 'declaration-unreachable') return;
    expect(observation.label).toBe('Unknown');
    expect(observation.reason).toBe('source-uncaptured-or-unreachable');
    expect(observation.detail.code).toBe('EACCES');
    expect(observation.detail.relativePath).toBe('.syzygy/project.yaml');
  });

  it('a nonexistent repository root is declaration-unreachable, not declaration-missing', async () => {
    const root = join(makeRepo(), 'does-not-exist');

    const observation = await observeDeclaration(root);
    expect(observation.kind).toBe('declaration-unreachable');
    if (observation.kind !== 'declaration-unreachable') return;
    expect(observation.reason).toBe('source-uncaptured-or-unreachable');
  });

  it.skipIf(runningAsRoot)('an unreachable repository yields NO root candidate — the unobservable arm', async () => {
    const root = makeRepo();
    writeDeclaration(root, VALID_DECLARATION);
    lockDown(join(root, '.syzygy', 'project.yaml'));

    const candidate = await observeRootCandidate(REPO_ID, root);
    expect(candidate.kind).toBe('unobservable');
    if (candidate.kind !== 'unobservable') return;
    expect(candidate.label).toBe('Unknown');
    expect(candidate.reason).toBe('source-uncaptured-or-unreachable');
  });
});

describe('observeDeclaration — malformed declaration passes through core named failures', () => {
  it('unparseable YAML surfaces core’s unparseable failure (CAP1-REQ-002)', async () => {
    const root = makeRepo();
    writeDeclaration(root, 'project: [unclosed\n  sequence: {');

    const observation = await observeDeclaration(root);
    expect(observation.kind).toBe('declaration-read');
    if (observation.kind !== 'declaration-read') return;
    expect(observation.result.ok).toBe(false);
    if (observation.result.ok) return;
    expect(observation.result.failures.some((f) => f.kind === 'unparseable')).toBe(true);
  });

  it('an omitted required field surfaces core’s missing-field failure naming it (CAP1-REQ-003)', async () => {
    const root = makeRepo();
    writeDeclaration(root, VALID_DECLARATION.replace(/^owner: .*$/m, ''));

    const observation = await observeDeclaration(root);
    if (observation.kind !== 'declaration-read') throw new Error('expected declaration-read');
    expect(observation.result.ok).toBe(false);
    if (observation.result.ok) return;
    expect(
      observation.result.failures.some((f) => f.kind === 'missing-field' && f.field === 'owner'),
    ).toBe(true);
  });

  it('a malformed read still marks the location as declaring for root designation (RFC3-4)', async () => {
    const root = makeRepo();
    writeDeclaration(root, 'not: [valid');

    const candidate = await observeRootCandidate(REPO_ID, root);
    expect(candidate.kind).toBe('candidate');
    if (candidate.kind !== 'candidate') return;
    expect(candidate.candidate.hasDeclaration).toBe(true);
  });
});

describe('observeRepositorySnapshot — coverage inputs from real directories', () => {
  const CONSENT: ConsentRecord = {
    id: 'consent-record-01',
    projectId: 'prj-obs-7c21' as ProjectId,
    repositoryId: REPO_ID,
    scope: 'read-repository',
    attribution: 'owner',
    grantState: 'in-force',
  };
  // The closed decision coverage consumes (syzygy-u2a.6): admitted for the
  // declaration's one entry, citing CONSENT. A synthetic fixture, never an
  // owner act.
  const DIGEST = `sha256:${'0'.repeat(64)}` as const;
  const ADMITTED: PreObservationConsentDecision = {
    authorization: 'admitted',
    repositoryId: REPO_ID,
    reference: 'consent-record-01',
    artifactDigest: DIGEST,
    record: CONSENT,
    act: {
      binding: {
        projectId: 'prj-obs-7c21' as ProjectId,
        repositoryId: REPO_ID,
        artifactId: 'consent-record-01',
        artifactDigest: DIGEST,
        actType: 'consent',
        owner: 'fixture-owner (synthetic, not an owner act)',
        instant: '2026-08-01T00:00:00Z',
        scope: 'read-repository',
        supersedes: null,
        expires: null,
        a1AuditRecord: null,
        actId: 'act-consent-record-01',
        actor: 'human',
        provenance: 'owner-adopted-bootstrap',
        actRecordDigest: DIGEST,
      },
      correlation: null,
    },
    provenance: 'owner-adopted (bootstrap, uncorrelated)',
  };

  it('an observable root is a full capture with the declared scope', async () => {
    const root = makeRepo();
    writeDeclaration(root, VALID_DECLARATION);

    const outcome = await observeRepositorySnapshot(REPO_ID, root);
    expect(outcome).toEqual({
      repositoryId: 'repo-obs-01',
      outcome: 'captured',
      capturedScope: 'repository-root',
    });
  });

  it('a nonexistent root is the named unreachable outcome', async () => {
    const outcome = await observeRepositorySnapshot(REPO_ID, join(makeRepo(), 'gone'));
    expect(outcome).toEqual({ repositoryId: 'repo-obs-01', outcome: 'unreachable' });
  });

  it.skipIf(runningAsRoot)('an unlistable root directory is unreachable, never an empty green capture', async () => {
    const root = makeRepo();
    const inner = join(root, 'repo');
    mkdirSync(inner);
    lockDown(inner);

    const outcome = await observeRepositorySnapshot(REPO_ID, inner);
    expect(outcome).toEqual({ repositoryId: 'repo-obs-01', outcome: 'unreachable' });
  });

  it('observed outcomes drive computeCoverage to the observed state (CAP1-REQ-010 pipeline)', async () => {
    const root = makeRepo();
    writeDeclaration(root, VALID_DECLARATION);

    const observation = await observeDeclaration(root);
    if (observation.kind !== 'declaration-read' || !observation.result.ok) {
      throw new Error('expected a valid declaration read');
    }
    const outcome = await observeRepositorySnapshot(REPO_ID, root);
    const coverage = computeCoverage(observation.result.declaration, [ADMITTED], [outcome]);
    expect(coverage.projectId).toBe('prj-obs-7c21');
    expect(coverage.repositories).toHaveLength(1);
    expect(coverage.repositories[0]?.state).toBe('observed');
  });

  it('an unreachable repository drives computeCoverage to capture-failed with its reason', async () => {
    const root = makeRepo();
    writeDeclaration(root, VALID_DECLARATION);

    const observation = await observeDeclaration(root);
    if (observation.kind !== 'declaration-read' || !observation.result.ok) {
      throw new Error('expected a valid declaration read');
    }
    const outcome = await observeRepositorySnapshot(REPO_ID, join(root, 'vanished'));
    const coverage = computeCoverage(observation.result.declaration, [ADMITTED], [outcome]);
    const repo = coverage.repositories[0];
    expect(repo?.state).toBe('capture-failed');
    if (repo?.state !== 'capture-failed') return;
    expect(repo.label).toBe('Unknown');
    expect(repo.reason).toBe('source-uncaptured-or-unreachable');
  });
});
