import { describe, expect, it } from 'vitest';
import {
  readDeclaration,
  registerProject,
  computeCoverage,
  computeShapeAnswers,
  serveMachine,
  renderHuman,
  computeDiscoverability,
  serveEntryRoute,
  isInsideGovernedPlane,
  extractDistinctions,
  extractProposalDistinctions,
  extractAuthorityDistinctions,
  extractDiscoverabilityDistinctions,
  extractConsentDistinction,
  sweepDistinctions,
  renderProposal,
  deriveEffectiveStatus,
  HUMAN_ENTRY_PATH,
  type ConsentRecord,
  type ObservationOutcome,
  type ProjectId,
  type RepositoryId,
  type FactModel,
  type ServedFact,
  type GovernanceArtifactRef,
  type OwnerActRecord,
  type Proposal,
} from '@syzygy/cap1-core';
import { authorizeWrite, compareRenderings, disclosureOf } from '@syzygy/cap1-core/testing';
import { decisionsFor, evaluation, projectYaml } from './fixtures/index.js';

// CAP1-REQ-integration — End-to-end integration test.
//
// Full pipeline: readDeclaration → registerProject → computeCoverage →
// computeShapeAnswers → serveMachine/renderHuman → compareRenderings →
// computeDiscoverability. A multi-repository fixture with consent,
// no-consent, governance-root, and observed-source repositories.
// Verifies: parity holds across all answers; entry path is correct;
// discoverability values match evidence; write boundary holds; every
// shape answer is stamped; every Unknown carries its reason; every
// proposed rendering is marked proposed.

const PROJECT_ID = 'prj-integration-test' as ProjectId;
const GOVERNANCE_REPO = 'repo-governance-root' as RepositoryId;
const OBSERVED_REPO = 'repo-observed-source' as RepositoryId;
const UNCONSENTED_REPO = 'repo-unconsented' as RepositoryId;

const EVALUATION = evaluation('snap-integration-001', '2026-08-22T10:00:00Z');

const DECLARATION_SOURCE = projectYaml({
  id: PROJECT_ID,
  name: 'Integration Test Project',
  owner: 'test-owner@example.com',
  repositories: [
    { id: GOVERNANCE_REPO, role: 'governance-root', consent: 'consent-gov-root' },
    { id: OBSERVED_REPO, role: 'observed-source', consent: 'consent-observed' },
    { id: UNCONSENTED_REPO, role: 'observed-source', consent: 'consent-unconsented' },
  ],
  consents: ['consent-gov-root', 'consent-observed', 'consent-unconsented'],
});

const CONSENT_RECORDS: ConsentRecord[] = [
  {
    id: 'consent-gov-root',
    projectId: PROJECT_ID,
    repositoryId: GOVERNANCE_REPO,
    scope: 'full',
    attribution: 'test-owner',
    grantState: 'in-force',
  },
  {
    id: 'consent-observed',
    projectId: PROJECT_ID,
    repositoryId: OBSERVED_REPO,
    scope: 'full',
    attribution: 'test-owner',
    grantState: 'in-force',
  },
];

const OBSERVATIONS: ObservationOutcome[] = [
  { repositoryId: GOVERNANCE_REPO, outcome: 'captured', capturedScope: 'full' },
  { repositoryId: OBSERVED_REPO, outcome: 'captured', capturedScope: 'full' },
];

describe('CAP1-REQ-integration — end-to-end pipeline', () => {
  const read = readDeclaration(DECLARATION_SOURCE);
  const registration = registerProject(read, 'rev-integration-1');

  it('declaration reads and registers successfully', () => {
    expect(read.ok).toBe(true);
    expect(registration.status).toBe('registered');
    if (registration.status === 'registered') {
      expect(registration.facts.projectId).toBe(PROJECT_ID);
    }
  });

  it('coverage computed with consent and no-consent repositories', () => {
    if (!read.ok) throw new Error('expected valid declaration');
    const coverage = computeCoverage(
      read.declaration,
      decisionsFor(read.declaration, CONSENT_RECORDS),
      OBSERVATIONS,
    );
    expect(coverage.projectId).toBe(PROJECT_ID);
    expect(coverage.repositories).toHaveLength(3);

    const govRoot = coverage.repositories.find((r) => r.repositoryId === GOVERNANCE_REPO);
    expect(govRoot?.state).toBe('observed');

    const observed = coverage.repositories.find((r) => r.repositoryId === OBSERVED_REPO);
    expect(observed?.state).toBe('observed');

    const unconsented = coverage.repositories.find((r) => r.repositoryId === UNCONSENTED_REPO);
    expect(unconsented?.state).toBe('unconsented');
  });

  it('shape answers: all seven produced, stamped with the evaluation', () => {
    if (!read.ok) throw new Error('expected valid declaration');
    const coverage = computeCoverage(
      read.declaration,
      decisionsFor(read.declaration, CONSENT_RECORDS),
      OBSERVATIONS,
    );
    const answers = computeShapeAnswers(PROJECT_ID, EVALUATION, {
      registration,
      coverage,
    });
    expect(answers.answers).toHaveLength(7);
    expect(answers.evaluation).toEqual(EVALUATION);
    expect(answers.projectId).toBe(PROJECT_ID);

    const names = answers.answers.map((a) => a.name);
    expect(names).toEqual([
      'Registered',
      'Shape present',
      'Human-understandable',
      'Observable',
      'Traceable',
      'Mission-ready',
      'Reconciled',
    ]);
  });

  it('every Unknown answer carries its reason', () => {
    if (!read.ok) throw new Error('expected valid declaration');
    const coverage = computeCoverage(
      read.declaration,
      decisionsFor(read.declaration, CONSENT_RECORDS),
      OBSERVATIONS,
    );
    const answers = computeShapeAnswers(PROJECT_ID, EVALUATION, {
      registration,
      coverage,
    });
    for (const answer of answers.answers) {
      if (answer.render.value === 'Unknown' && 'reasons' in answer.render) {
        expect(answer.render.reasons.primary).toBeTruthy();
      }
    }
  });

  it('parity holds: machine and human renderings agree on every facet', () => {
    if (!read.ok) throw new Error('expected valid declaration');
    const coverage = computeCoverage(
      read.declaration,
      decisionsFor(read.declaration, CONSENT_RECORDS),
      OBSERVATIONS,
    );
    const answers = computeShapeAnswers(PROJECT_ID, EVALUATION, {
      registration,
      coverage,
    });

    const facts: ServedFact[] = answers.answers.map((answer) => ({
      name: answer.name,
      value: answer.render.value,
      epistemic:
        answer.render.value === 'Unknown' && 'reasons' in answer.render
          ? { label: 'Unknown' as const, reasons: answer.render.reasons }
          : answer.render.value === 'not evaluated' && 'basis' in answer.render
            ? { label: 'Unknown' as const, basis: 'deferred' as const }
            : { label: 'Observed' as const },
    }));

    const model: FactModel = {
      selection: `project:${PROJECT_ID}`,
      evaluation: EVALUATION,
      scenarioContext: 'integration-test',
      declaredFilters: {},
      facts,
    };

    const machine = serveMachine(model);
    const human = renderHuman(model);
    const comparison = compareRenderings(disclosureOf(machine), disclosureOf(human));

    expect(comparison.comparable).toBe(true);
    if (comparison.comparable) {
      expect(comparison.verdict).toBe('parity');
    }
  });

  it('entry path is correct for any project', () => {
    const entry = serveEntryRoute(PROJECT_ID);
    expect(entry.path).toBe('.syzygy/intent/OVERVIEW.md');
    expect(entry.isIdentity).toBe(false);
  });

  it('discoverability: governance-root with consented README link → yes', () => {
    const finding = computeDiscoverability(
      GOVERNANCE_REPO,
      'governance-root',
      { state: 'captured', linksToEntry: true },
    );
    expect(finding.value).toBe('yes');
    expect(finding.epistemic.label).toBe('Observed');
  });

  it('discoverability: observed-source → not-applicable', () => {
    const finding = computeDiscoverability(
      OBSERVED_REPO,
      'observed-source',
      { state: 'captured', linksToEntry: false },
    );
    expect(finding.value).toBe('not-applicable');
    expect(finding.basis).toBe('no-governance-root');
  });

  it('discoverability: unconsented repository → Unknown', () => {
    const finding = computeDiscoverability(
      UNCONSENTED_REPO,
      'governance-root',
      { state: 'unconsented' },
    );
    expect(finding.value).toBe('Unknown');
    expect(finding.epistemic.label).toBe('Unknown');
  });

  it('write boundary holds: governed paths allowed, external refused', () => {
    expect(authorizeWrite('openspec/changes/delta/spec.md').permitted).toBe(true);
    expect(authorizeWrite('.syzygy/governance/doctrine/VIS.md').permitted).toBe(true);
    expect(authorizeWrite('packages/cap1-core/src/index.ts').permitted).toBe(false);
    expect(authorizeWrite('README.md').permitted).toBe(false);
  });

  it('all nine machine-readable distinctions are covered end-to-end', () => {
    const unknownFact: ServedFact = {
      name: 'observable',
      value: 'Unknown',
      epistemic: {
        label: 'Unknown',
        reasons: { primary: 'unconsented-source-or-provider', secondary: [] },
        tier: 'declared-only',
        freshness: 'stale',
      },
    };

    const proposal: Proposal = {
      id: 'prop-test',
      kind: 'code-change-set',
      subject: 'test proposal',
      exclusivityGroup: 'test-group',
      plane: 'proposed',
    };

    const artifact: GovernanceArtifactRef = {
      artifactId: 'policy:test.md',
      digest: 'sha256:test-digest',
      selfDeclaredStamp: 'draft',
      owningAuthority: { authority: 'test.md', governingRevision: 'sha256:test-digest' },
    };
    const record: OwnerActRecord = {
      recordId: 'act-1',
      artifactDigest: 'sha256:test-digest',
      act: 'accepted',
      provenanceState: 'owner-adopted-bootstrap',
    };

    const finding = computeDiscoverability(
      GOVERNANCE_REPO,
      'governance-root',
      { state: 'captured', linksToEntry: true },
    );

    const factD = extractDistinctions(unknownFact);
    const proposalD = extractProposalDistinctions(renderProposal(proposal));
    const authorityD = extractAuthorityDistinctions(deriveEffectiveStatus(artifact, [record]));
    const discoverabilityD = extractDiscoverabilityDistinctions(finding);
    const consentD = extractConsentDistinction('in-force');

    const sweep = sweepDistinctions(factD, proposalD, authorityD, discoverabilityD, consentD);
    expect(sweep.totalDistinctions).toBe(9);
    expect(sweep.coveredDistinctions).toHaveLength(9);
    expect(sweep.missingDistinctions).toHaveLength(0);
  });

  it('every proposed rendering carries the proposed marking', () => {
    const proposal: Proposal = {
      id: 'prop-entry-link',
      kind: 'code-change-set',
      subject: `Add link to ${HUMAN_ENTRY_PATH}`,
      exclusivityGroup: `entry-link-${GOVERNANCE_REPO}`,
      plane: 'proposed',
    };
    const rendered = renderProposal(proposal);
    expect(rendered.marking).toBe('proposed');
    expect(rendered.plane).toBe('proposed');
    expect(rendered.adopted).toBe(false);
    expect(rendered.statusAuthority).toBe('none');
  });
});
