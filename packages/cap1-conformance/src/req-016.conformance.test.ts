import { describe, expect, it } from 'vitest';
import {
  authorizeObservation,
  computeCoverage,
  readDeclaration,
  resolveConsent,
  type ConsentRecord,
  type ObservationOutcome,
  type ProjectDeclaration,
  type ProjectId,
  type RepositoryId,
} from '@syzygy/cap1-core';
import { decisionsFor, consent, projectYaml } from './fixtures/index.js';

// CAP1-REQ-016 — No source is inspected through authority the project
// did not grant.
//
// Sweep (the requirement's own case): repository R is consented to
// project A but not project B; enumerate B's served facts and check each
// fact's provenance against B's consent records — denominator: B's
// served fact set. Oracle: no fact in B's set carries provenance from R.
// Oracle independence: the consent records are the checker's fixture
// artifacts; provenance is checked against them, never against the
// implementation's own consent decision.

const PROJECT_A = 'prj-alpha-g7' as ProjectId;
const PROJECT_B = 'prj-beta-g7' as ProjectId;
const REPO_R = 'repo-shared-r' as RepositoryId;

// R carries an in-force consent record for project A — and for A only.
const CONSENT_A_FOR_R = consent({
  id: 'consent-a-r',
  projectId: PROJECT_A,
  repositoryId: REPO_R,
});

const ALL_CONSENTS: ConsentRecord[] = [CONSENT_A_FOR_R];

// Both projects declare R; each project's own declaration is its own
// governance artifact (RFC3-30: dual roles are lawful and per-pair).
function declarationFor(projectId: string, name: string): ProjectDeclaration {
  const source = projectYaml({
    id: projectId,
    name,
    repositories: [
      { id: 'repo-shared-r', role: 'observed-source', consent: 'consent-a-r' },
    ],
    consents: ['consent-a-r'],
  });
  const read = readDeclaration(source);
  if (!read.ok) throw new Error('fixture must be valid');
  return read.declaration;
}

// R was captured at the snapshot — content exists, so the only thing
// standing between B and R's content is consent.
const OBSERVATIONS: ObservationOutcome[] = [
  { repositoryId: REPO_R, outcome: 'captured', capturedScope: 'full-tree' },
];

describe('CAP1-REQ-016 — no source is inspected through authority the project did not grant', () => {
  it("scenario: consent is per project pair — A's answers may carry facts from R, B renders R Unknown with reason unconsented-source-or-provider", () => {
    const forA = computeCoverage(
      declarationFor('prj-alpha-g7', 'Alpha'),
      decisionsFor(declarationFor('prj-alpha-g7', 'Alpha'), ALL_CONSENTS),
      OBSERVATIONS,
    );
    const entryA = forA.repositories.find((e) => e.repositoryId === REPO_R);
    expect(entryA?.state).toBe('observed');

    const forB = computeCoverage(
      declarationFor('prj-beta-g7', 'Beta'),
      decisionsFor(declarationFor('prj-beta-g7', 'Beta'), ALL_CONSENTS),
      OBSERVATIONS,
    );
    const entryB = forB.repositories.find((e) => e.repositoryId === REPO_R);
    expect(entryB?.state).toBe('unconsented');
    if (entryB?.state === 'unconsented') {
      expect(entryB.label).toBe('Unknown');
      expect(entryB.reason).toBe('unconsented-source-or-provider');
    }
  });

  it("falsifier: cross-project consent never grants — A's record for R resolves nothing for project B", () => {
    const resolution = resolveConsent(ALL_CONSENTS, PROJECT_B, REPO_R);
    expect(resolution.consented).toBe(false);
    if (!resolution.consented) {
      // For B the pair (B, R) has no record at all — A's record is not a
      // withdrawn grant for B, it is simply not B's.
      expect(resolution.basis).toBe('no-resolvable-in-force-record');
    }
  });

  it("sweep: no fact in B's served set carries provenance from R — denominator: B's full served entry set", () => {
    const forB = computeCoverage(
      declarationFor('prj-beta-g7', 'Beta'),
      decisionsFor(declarationFor('prj-beta-g7', 'Beta'), ALL_CONSENTS),
      OBSERVATIONS,
    );
    // Denominator: every entry B serves.
    expect(forB.repositories).toHaveLength(1);
    for (const entry of forB.repositories) {
      // Provenance check against the checker's own record set: B holds
      // no in-force record for this repository...
      const inForceForB = ALL_CONSENTS.find(
        (r) =>
          r.projectId === PROJECT_B &&
          r.repositoryId === entry.repositoryId &&
          r.grantState === 'in-force',
      );
      expect(inForceForB).toBeUndefined();
      // ...so no captured content, structure, or derived fact may
      // appear: the entry carries no capturedScope and cites no consent.
      expect('capturedScope' in entry).toBe(false);
      expect('consent' in entry).toBe(false);
      expect(JSON.stringify(entry)).not.toContain('full-tree');
    }
  });

  it('per-repository authorization: a consent resolved for repository A never authorizes observation of repository B', () => {
    const siblingConsent = consent({
      id: 'consent-a-s',
      projectId: PROJECT_A,
      repositoryId: 'repo-sibling' as RepositoryId,
    });
    const resolution = resolveConsent([siblingConsent], PROJECT_A, 'repo-sibling' as RepositoryId);
    expect(resolution.consented).toBe(true);
    // Presenting that resolution with a request for a DIFFERENT
    // repository refuses.
    const refused = authorizeObservation(resolution, PROJECT_A, REPO_R);
    expect(refused.authorized).toBe(false);
    if (!refused.authorized) {
      expect(refused.render).toBe('unconsented-policy-state');
      expect(refused.basis).toBe('consent-not-for-this-repository');
    }
    // The matching request authorizes, citing the record.
    const granted = authorizeObservation(resolution, PROJECT_A, 'repo-sibling' as RepositoryId);
    expect(granted.authorized).toBe(true);
    if (granted.authorized) {
      expect(granted.consentRecordId).toBe('consent-a-s');
    }
  });

  it("falsifier: per-project authorization — a resolution obtained for project A, presented while serving project B, is refused", () => {
    // The resolution is genuine and consented — for project A.
    const resolution = resolveConsent(ALL_CONSENTS, PROJECT_A, REPO_R);
    expect(resolution.consented).toBe(true);
    // A caller reusing it with project B's identity is caught at this
    // layer: the record's own projectId contradicts the request.
    const refused = authorizeObservation(resolution, PROJECT_B, REPO_R);
    expect(refused.authorized).toBe(false);
    if (!refused.authorized) {
      expect(refused.render).toBe('unconsented-policy-state');
      expect(refused.basis).toBe('consent-not-for-this-project');
    }
    // The honest presentation — project A's own — still authorizes.
    const granted = authorizeObservation(resolution, PROJECT_A, REPO_R);
    expect(granted.authorized).toBe(true);
    if (granted.authorized) {
      expect(granted.consentRecordId).toBe('consent-a-r');
    }
  });

  it('an unconsented resolution never authorizes, and renders as the policy state — never as error', () => {
    const resolution = resolveConsent(ALL_CONSENTS, PROJECT_B, REPO_R);
    const refused = authorizeObservation(resolution, PROJECT_B, REPO_R);
    expect(refused.authorized).toBe(false);
    if (!refused.authorized) {
      expect(refused.render).toBe('unconsented-policy-state');
      expect(refused.basis).toBe('no-consent-for-pair');
    }
  });
});
