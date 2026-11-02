import { describe, expect, it } from 'vitest';
import {
  computeCoverage,
  readDeclaration,
  type ConsentRecord,
  type ObservationOutcome,
  type ProjectDeclaration,
  type ProjectId,
  type RepositoryId,
} from '@syzygy/cap1-core';
import { decisionsFor, consent, projectYaml } from './fixtures/index.js';

// CAP1-REQ-012 — Unconsented renders Unknown as a policy state, never as
// error or absence.
//
// Case: the checker declares a repository, withholds its consent record,
// and queries. Oracle: the served value for the unconsented portion is
// `Unknown` with the exact reason string
// `unconsented-source-or-provider`; string comparison decides. Oracle
// independence: the expected string below is written literally from
// RFC2-24's closed vocabulary (reason #6), outside the implementation —
// it is deliberately NOT imported from the implementation's vocabulary
// module.

const PROJECT = 'prj-policy-c3' as ProjectId;

const SOURCE = projectYaml({
  id: PROJECT,
  name: 'Policy State Fixture',
  repositories: [
    { id: 'repo-consented', role: 'governance-root', consent: 'consent-ok' },
    { id: 'repo-withheld', role: 'observed-source', consent: 'consent-withheld' },
  ],
  consents: ['consent-ok'],
});

function declaration(): ProjectDeclaration {
  const read = readDeclaration(SOURCE);
  if (!read.ok) throw new Error('fixture must be valid');
  return read.declaration;
}

const CONSENTS: ConsentRecord[] = [
  consent({
    id: 'consent-ok',
    projectId: PROJECT,
    repositoryId: 'repo-consented' as RepositoryId,
  }),
  // repo-withheld: consent record deliberately withheld.
];

const OBSERVATIONS: ObservationOutcome[] = [
  {
    repositoryId: 'repo-consented' as RepositoryId,
    outcome: 'captured',
    capturedScope: 'full-tree',
  },
];

describe('CAP1-REQ-012 — unconsented renders Unknown as a policy state, never as error or absence', () => {
  it('scenario: the unconsented portion renders Unknown with the verbatim reason and its resolution route', () => {
    const result = computeCoverage(
      declaration(),
      decisionsFor(declaration(), CONSENTS),
      OBSERVATIONS,
    );
    const withheld = result.repositories.find(
      (e) => e.repositoryId === ('repo-withheld' as RepositoryId),
    );
    expect(withheld?.state).toBe('unconsented');
    if (withheld?.state === 'unconsented') {
      expect(withheld.label).toBe('Unknown');
      // Exact string, fixed by RFC2-24 #6, written literally here.
      expect(withheld.reason).toBe('unconsented-source-or-provider');
      // RFC6-26: a standing policy state with its resolution route
      // (record consent).
      expect(withheld.resolutionRoute).toBe('record consent');
    }
  });

  it('the unconsented state is machine-readably a POLICY state, distinguishable from error/failure states', () => {
    const result = computeCoverage(
      declaration(),
      decisionsFor(declaration(), CONSENTS),
      OBSERVATIONS,
    );
    const withheld = result.repositories.find((e) => e.state === 'unconsented');
    expect(withheld?.state).toBe('unconsented');
    if (withheld?.state === 'unconsented') {
      expect(withheld.presentation).toBe('policy');
    }
    // No error-shaped rendering: nothing in the served entry claims a
    // failure, and the failure states carry different discriminants
    // ('capture-failed', 'stale') — see req-013 for the pairwise sweep.
    expect(JSON.stringify(withheld)).not.toMatch(/error|failed|broken/);
  });

  it('scenario: the consented remainder renders normally', () => {
    const result = computeCoverage(
      declaration(),
      decisionsFor(declaration(), CONSENTS),
      OBSERVATIONS,
    );
    const consented = result.repositories.find(
      (e) => e.repositoryId === ('repo-consented' as RepositoryId),
    );
    expect(consented?.state).toBe('observed');
    if (consented?.state === 'observed') {
      expect(consented.capturedScope).toBe('full-tree');
    }
  });

  it('falsifier: no invented reason spelling and no empty rendering — the portion is present, labeled, and reasoned', () => {
    const result = computeCoverage(
      declaration(),
      decisionsFor(declaration(), CONSENTS),
      OBSERVATIONS,
    );
    const withheld = result.repositories.find(
      (e) => e.repositoryId === ('repo-withheld' as RepositoryId),
    );
    // Present (not an empty region / absence)...
    expect(withheld).toBeDefined();
    // ...and carrying exactly the closed vocabulary's spelling.
    if (withheld?.state === 'unconsented') {
      expect(withheld.reason).toBe('unconsented-source-or-provider');
      expect(withheld.reason).not.toBe('unconsented');
      expect(withheld.reason).not.toBe('no-consent');
    }
  });
});
