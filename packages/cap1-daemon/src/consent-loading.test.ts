import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  readDeclaration,
  resolveConsent,
  type ProjectId,
  type RepositoryId,
} from '@syzygy/cap1-core';

import {
  loadConsentReference,
  loadConsentReferences,
  resolveConsentReferencePath,
} from './consent-loading.js';

// RT2 tests — exact consent-reference loading (CAP1-REQ-010…016).
//
// Real filesystem, no mocks: every case writes real record files into a
// fresh temp directory and loads them back. Oracle independence: every
// expected value below is a hard-coded string literal — nothing is
// imported from a vocabulary module or re-derived from the
// implementation's own constants.

const PROJECT = 'prj-rt2' as ProjectId;

let tempDirs: string[] = [];

function decisionsDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'syzygy-rt2-consent-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  tempDirs = [];
});

function writeRecord(
  dir: string,
  name: string,
  fields: {
    id: string;
    project: string;
    repository: string;
    scope?: string;
    attribution?: string;
    grantState: string;
  },
): string {
  const path = join(dir, `${name}.yaml`);
  writeFileSync(
    path,
    [
      `id: ${fields.id}`,
      `project: ${fields.project}`,
      `repository: ${fields.repository}`,
      `scope: ${fields.scope ?? 'observe'}`,
      `attribution: ${fields.attribution ?? 'owner'}`,
      `grant_state: ${fields.grantState}`,
      '',
    ].join('\n'),
    'utf8',
  );
  return path;
}

describe('RT2 — exact consent-reference resolution', () => {
  it('a valid record loads from its exact referenced location and grants via the core', () => {
    const dir = decisionsDir();
    writeRecord(dir, 'consent-alpha', {
      id: 'consent-alpha',
      project: 'prj-rt2',
      repository: 'repo-alpha',
      grantState: 'in-force',
    });

    const load = loadConsentReference(dir, 'consent-alpha');
    expect(load.ok).toBe(true);
    if (load.ok) {
      expect(load.reference).toBe('consent-alpha');
      expect(load.path).toBe(join(dir, 'consent-alpha.yaml'));
      // The loaded record is exactly the core shape, field for field.
      expect(load.record).toEqual({
        id: 'consent-alpha',
        projectId: 'prj-rt2',
        repositoryId: 'repo-alpha',
        scope: 'observe',
        attribution: 'owner',
        grantState: 'in-force',
      });

      // Fed to the UNCHANGED core, it grants for exactly its pair.
      const resolution = resolveConsent([load.record], PROJECT, 'repo-alpha' as RepositoryId);
      expect(resolution.consented).toBe(true);
      if (resolution.consented) {
        expect(resolution.record.id).toBe('consent-alpha');
        expect(resolution.record.grantState).toBe('in-force');
      }
    }
  });

  it('loading is deterministic: two loads of the same bytes are deeply equal', () => {
    const dir = decisionsDir();
    writeRecord(dir, 'consent-alpha', {
      id: 'consent-alpha',
      project: 'prj-rt2',
      repository: 'repo-alpha',
      grantState: 'in-force',
    });
    expect(loadConsentReference(dir, 'consent-alpha')).toEqual(
      loadConsentReference(dir, 'consent-alpha'),
    );
  });

  it('an unresolvable reference is a named failure and NEVER a grant', () => {
    const dir = decisionsDir();

    const load = loadConsentReference(dir, 'consent-nowhere');
    expect(load.ok).toBe(false);
    if (!load.ok) {
      expect(load.failure.kind).toBe('reference-unresolvable');
      expect(load.failure.detail).toContain('consent-nowhere.yaml');
      // The failure arm carries no record at all — nothing to grant with.
      expect('record' in load).toBe(false);
    }

    // Through the batch loader and the unchanged core: no record loads,
    // so the pair resolves unconsented — absence, never implied consent.
    const report = loadConsentReferences(dir, ['consent-nowhere']);
    expect(report.records).toEqual([]);
    expect(report.failures).toHaveLength(1);
    expect(report.failures[0]?.kind).toBe('reference-unresolvable');
    const resolution = resolveConsent(report.records, PROJECT, 'repo-alpha' as RepositoryId);
    expect(resolution.consented).toBe(false);
    if (!resolution.consented) {
      expect(resolution.basis).toBe('no-resolvable-in-force-record');
    }
  });

  it('path-shaped references are refused as unresolvable before any filesystem access', () => {
    const dir = decisionsDir();
    for (const reference of ['../escape', 'a/b', 'a\\b', '/etc/passwd', '.', '..', '']) {
      const resolution = resolveConsentReferencePath(dir, reference);
      expect(resolution.ok).toBe(false);
      if (!resolution.ok) {
        expect(resolution.failure.kind).toBe('reference-unresolvable');
      }
      const load = loadConsentReference(dir, reference);
      expect(load.ok).toBe(false);
      if (!load.ok) {
        expect(load.failure.kind).toBe('reference-unresolvable');
      }
    }
  });

  it('a malformed record is a named failure, never a grant — unparseable bytes', () => {
    const dir = decisionsDir();
    writeFileSync(join(dir, 'consent-broken.yaml'), 'id: [unclosed\n', 'utf8');

    const load = loadConsentReference(dir, 'consent-broken');
    expect(load.ok).toBe(false);
    if (!load.ok) {
      expect(load.failure.kind).toBe('record-malformed');
    }
    const report = loadConsentReferences(dir, ['consent-broken']);
    expect(report.records).toEqual([]);
    expect(
      resolveConsent(report.records, PROJECT, 'repo-alpha' as RepositoryId).consented,
    ).toBe(false);
  });

  it('a malformed record is a named failure — missing fields and unknown grant state, never coerced', () => {
    const dir = decisionsDir();
    // Missing repository + attribution.
    writeFileSync(
      join(dir, 'consent-partial.yaml'),
      'id: consent-partial\nproject: prj-rt2\nscope: observe\ngrant_state: in-force\n',
      'utf8',
    );
    // An unknown grant state must fail, never lean toward granting.
    writeRecord(dir, 'consent-oddstate', {
      id: 'consent-oddstate',
      project: 'prj-rt2',
      repository: 'repo-alpha',
      grantState: 'granted-forever',
    });

    for (const reference of ['consent-partial', 'consent-oddstate']) {
      const load = loadConsentReference(dir, reference);
      expect(load.ok).toBe(false);
      if (!load.ok) {
        expect(load.failure.kind).toBe('record-malformed');
      }
    }
    const report = loadConsentReferences(dir, ['consent-partial', 'consent-oddstate']);
    expect(report.records).toEqual([]);
    expect(report.failures.map((f) => f.kind)).toEqual(['record-malformed', 'record-malformed']);
  });

  it('a record whose id differs from the reference is an identity mismatch, never substituted', () => {
    const dir = decisionsDir();
    writeRecord(dir, 'consent-alpha', {
      id: 'consent-other',
      project: 'prj-rt2',
      repository: 'repo-alpha',
      grantState: 'in-force',
    });

    const load = loadConsentReference(dir, 'consent-alpha');
    expect(load.ok).toBe(false);
    if (!load.ok) {
      expect(load.failure.kind).toBe('record-identity-mismatch');
      if (load.failure.kind === 'record-identity-mismatch') {
        expect(load.failure.recordId).toBe('consent-other');
      }
    }
    const report = loadConsentReferences(dir, ['consent-alpha']);
    expect(report.records).toEqual([]);
    expect(
      resolveConsent(report.records, PROJECT, 'repo-alpha' as RepositoryId).consented,
    ).toBe(false);
  });

  it('an unreadable record file is a named failure, never a grant', () => {
    const dir = decisionsDir();
    // A directory sitting where the record file should be is unreadable
    // as a file on every platform and needs no permission tricks.
    mkdirSync(join(dir, 'consent-dir.yaml'));

    const load = loadConsentReference(dir, 'consent-dir');
    expect(load.ok).toBe(false);
    if (!load.ok) {
      expect(load.failure.kind).toBe('record-unreadable');
    }

    // And a permission-denied file, where the platform can express one.
    if (process.getuid !== undefined && process.getuid() !== 0) {
      const path = writeRecord(dir, 'consent-locked', {
        id: 'consent-locked',
        project: 'prj-rt2',
        repository: 'repo-alpha',
        grantState: 'in-force',
      });
      chmodSync(path, 0o000);
      const locked = loadConsentReference(dir, 'consent-locked');
      chmodSync(path, 0o644); // restore so cleanup can remove the tree
      expect(locked.ok).toBe(false);
      if (!locked.ok) {
        expect(locked.failure.kind).toBe('record-unreadable');
      }
    }
  });

  it('conflicting records on disk (grant + withdrawal for one pair) evaluate fail-closed: withdrawn', () => {
    const dir = decisionsDir();
    writeRecord(dir, 'consent-conflict-grant', {
      id: 'consent-conflict-grant',
      project: 'prj-rt2',
      repository: 'repo-conflicted',
      grantState: 'in-force',
    });
    writeRecord(dir, 'consent-conflict-withdrawal', {
      id: 'consent-conflict-withdrawal',
      project: 'prj-rt2',
      repository: 'repo-conflicted',
      grantState: 'withdrawn',
    });

    // BOTH records load fully — the loader filters nothing.
    const report = loadConsentReferences(dir, [
      'consent-conflict-grant',
      'consent-conflict-withdrawal',
    ]);
    expect(report.failures).toEqual([]);
    expect(report.records.map((r) => r.id)).toEqual([
      'consent-conflict-grant',
      'consent-conflict-withdrawal',
    ]);

    // The unchanged core decides: withdrawal defeats grant.
    const resolution = resolveConsent(report.records, PROJECT, 'repo-conflicted' as RepositoryId);
    expect(resolution.consented).toBe(false);
    if (!resolution.consented) {
      expect(resolution.basis).toBe('withdrawn');
    }
  });

  it('batch loading dedupes repeated references and preserves first-occurrence order', () => {
    const dir = decisionsDir();
    writeRecord(dir, 'consent-a', {
      id: 'consent-a',
      project: 'prj-rt2',
      repository: 'repo-a',
      grantState: 'in-force',
    });
    writeRecord(dir, 'consent-b', {
      id: 'consent-b',
      project: 'prj-rt2',
      repository: 'repo-b',
      grantState: 'in-force',
    });

    const report = loadConsentReferences(dir, [
      'consent-a',
      'consent-b',
      'consent-a', // repeat — one reference names one record
    ]);
    expect(report.loads).toHaveLength(2);
    expect(report.records.map((r) => r.id)).toEqual(['consent-a', 'consent-b']);
  });
});

describe('RT2 — per-repository coverage from records loaded off disk (CAP1-REQ-010…013)', () => {
  const DECLARATION_SOURCE = `
schema_version: "1"
project:
  id: prj-rt2
  name: RT2 Fixture
owner: owner@example.test
repositories:
  - id: repo-consented
    role: governance-root
    consent: consent-good
  - id: repo-dangling
    role: observed-source
    consent: consent-dangling
  - id: repo-withdrawn
    role: observed-source
    consent: consent-withdrawn
consents:
  - consent-good
  - consent-dangling
  - consent-withdrawn
declarations:
  spec_root: openspec/
relations: []
profiles: []
`;

  it('loading the declaration references names the dangling one and loads the other two', () => {
    const dir = decisionsDir();
    writeRecord(dir, 'consent-good', {
      id: 'consent-good',
      project: 'prj-rt2',
      repository: 'repo-consented',
      grantState: 'in-force',
    });
    // consent-dangling deliberately has NO file — a dangling reference.
    writeRecord(dir, 'consent-withdrawn', {
      id: 'consent-withdrawn',
      project: 'prj-rt2',
      repository: 'repo-withdrawn',
      grantState: 'withdrawn',
    });

    const read = readDeclaration(DECLARATION_SOURCE);
    expect(read.ok).toBe(true);
    if (!read.ok) return;

    // References come from the declaration itself — entry references
    // plus the manifest's consents[] list — resolved exactly, per entry.
    const references = [
      ...read.declaration.repositories.map((entry) => entry.consent),
      ...read.declaration.consents,
    ];
    const report = loadConsentReferences(dir, references);

    // The dangling reference is a NAMED failure with a visible identity.
    expect(report.failures).toHaveLength(1);
    expect(report.failures[0]?.kind).toBe('reference-unresolvable');
    expect(report.failures[0]?.reference).toBe('consent-dangling');

    // The loaded records name exactly the two resolvable references. The
    // records never feed coverage directly: coverage projects the closed
    // pre-observation decisions (syzygy-u2a.6; pipeline.test.ts).
    expect(report.records.map((record) => record.id)).toEqual(['consent-good', 'consent-withdrawn']);
  });
});
