import { describe, expect, it } from 'vitest';
import { readDeclaration, registerProject } from '@syzygy/cap1-core';
import { corrupt, projectYaml } from './fixtures/index.js';

// CAP1-REQ-004 — Syzygy never silently invents, repairs, or infers a
// declaration field (prohibition).
//
// Oracle: every served declaration-derived fact matches the declaration
// bytes the checker authored — the declaration bytes are the authority,
// and the oracle never consults the implementation's own logic. Sweep:
// compare every served declaration-derived fact against the input; the
// denominator is the served fact set.

const VALID_SOURCE = projectYaml({
  id: 'prj-opaque-7f3a',
  name: 'Orbital Mechanics',
  repositories: [
    { id: 'repo-opaque-01', role: 'governance-root', consent: 'consent-record-01' },
  ],
  consents: ['consent-record-01'],
  relations: [{ type: 'depends-on', project: 'prj-opaque-b2c4' }],
  profiles: ['portfolio'],
});

describe('CAP1-REQ-004 — no silent invention, repair, or inference', () => {
  it('a field with an unknown (typo) name fails, naming that field — the set is closed (RFC3-5)', () => {
    const typoed = VALID_SOURCE.replace('owner:', 'ownerr:');
    const read = readDeclaration(typoed);
    expect(read.ok).toBe(false);
    if (!read.ok) {
      // The typoed field is surfaced by name, never silently dropped or
      // reinterpreted as the field it resembles...
      expect(
        read.failures.some((f) => f.kind === 'unknown-field' && f.field === 'ownerr'),
      ).toBe(true);
      // ...and the field it displaced is named missing, not inferred.
      expect(
        read.failures.some((f) => f.kind === 'missing-field' && f.field === 'owner'),
      ).toBe(true);
    }
  });

  it('a missing field is never defaulted: the read fails instead of producing a declaration', () => {
    const withoutOwner = corrupt(VALID_SOURCE, 'owner: uniquosity@gmail.com\n', '');
    const read = readDeclaration(withoutOwner);
    expect(read.ok).toBe(false);
    // No declaration object exists on the failed arm — nothing to carry
    // an invented value.
    expect('declaration' in read).toBe(false);
  });

  it('sweep: every declaration-derived value in the served facts appears in the input', () => {
    const result = registerProject(readDeclaration(VALID_SOURCE), 'rev-1');
    expect(result.status).toBe('registered');
    if (result.status === 'registered') {
      // Denominator: the full served fact set for this registration.
      const declarationDerived = {
        projectId: result.facts.projectId,
        displayName: result.facts.displayName,
      };
      for (const value of Object.values(declarationDerived)) {
        expect(VALID_SOURCE).toContain(value);
      }
      // The remaining facts are caller-supplied or classifications, not
      // declaration field values: revision comes verbatim from the
      // caller; validation/rootDesignation are the closed classifier
      // spellings, not field values.
      expect(result.facts.revision).toBe('rev-1');
      expect(Object.keys(result.facts).sort()).toEqual([
        'displayName',
        'projectId',
        'revision',
        'rootDesignation',
        'validation',
      ]);
    }
  });

  it('sweep: a successful read carries only values the input carried', () => {
    const read = readDeclaration(VALID_SOURCE);
    expect(read.ok).toBe(true);
    if (read.ok) {
      const d = read.declaration;
      const leafValues = [
        d.schemaVersion,
        d.project.id,
        d.project.name,
        d.owner,
        ...d.repositories.flatMap((r) => [r.id, r.role, r.consent]),
        ...d.consents,
        ...Object.values(d.declarations).map(String),
        ...d.relations.flatMap((r) => [r.type, r.project]),
        ...d.profiles,
      ];
      for (const value of leafValues) {
        expect(VALID_SOURCE).toContain(value);
      }
    }
  });

  it('falsifier: an invalid declaration is never repaired into a registration', () => {
    // A guessed repository role or defaulted owner would surface here as
    // a registered result; assert the prohibition holds (RFC3-9: the
    // only repair path is a Proposal through the owner gate — this pure
    // layer drafts nothing).
    const corrupted = VALID_SOURCE.replace('role: governance-root', 'role: guess-me');
    const result = registerProject(readDeclaration(corrupted), 'rev-1');
    expect(result.status).toBe('failed');
    expect('facts' in result).toBe(false);
  });
});
