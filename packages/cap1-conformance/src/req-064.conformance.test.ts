import { beforeAll, describe, expect, it } from 'vitest';
import {
  extractDistinctions,
  extractProposalDistinctions,
  extractAuthorityDistinctions,
  extractDiscoverabilityDistinctions,
  extractConsentDistinction,
  sweepDistinctions,
  CAPABILITY_1_DISTINCTIONS,
  type ServedFact,
  type ProposalRendering,
  type AuthorityExposure,
  type DiscoverabilityFinding,
  type RepositoryId,
  computeDiscoverability,
  discoverabilityRow,
} from '@syzygy/cap1-core';

// CAP1-REQ-064 — Machine-readable distinctions.
//
// Every distinction Capability 1 draws is machine-readable and
// recoverable without vision (colour, position, or layout). Oracle:
// each extractor returns distinctions as name-value text attributes or
// structure, all nine named distinctions are covered when all
// extractors run on representative fixtures. Oracle independence:
// expected values are hard-coded below.

const OBSERVED_FACT: ServedFact = {
  name: 'registration-status',
  value: 'registered',
  epistemic: {
    label: 'Observed',
    tier: 'gate-backed',
    freshness: 'fresh',
  },
};

const UNKNOWN_FACT: ServedFact = {
  name: 'observable-coverage',
  value: 'Unknown',
  epistemic: {
    label: 'Unknown',
    reasons: {
      primary: 'unconsented-source-or-provider',
      secondary: [],
    },
    tier: 'declared-only',
    freshness: 'stale',
  },
};

const PROPOSAL_RENDERING: ProposalRendering = {
  proposalId: 'prop-entry-link',
  kind: 'code-change-set',
  subject: 'Add link to .syzygy/intent/OVERVIEW.md in repository README',
  exclusivityGroup: 'entry-link-repo-01',
  marking: 'proposed',
  plane: 'proposed',
  adopted: false,
  statusAuthority: 'none',
};

const AUTHORITY_EXPOSURE: AuthorityExposure = {
  artifactId: 'policy:governance/policies/example.md',
  owningAuthority: {
    authority: 'governance/policies/example.md',
    governingRevision: 'sha256:abc123',
  },
  selfDeclaredStamp: 'accepted',
  effectiveStatus: 'unadopted',
  effectiveBasis: 'no-owner-act-record-at-this-digest',
  disagreement: {
    disclosed: true,
    stamp: 'accepted',
    effectiveStatus: 'unadopted',
  },
  governs: 'effective-status',
};

const DISCOVERABILITY_FINDING: DiscoverabilityFinding = {
  repositoryId: 'repo-01' as RepositoryId,
  value: 'yes',
  epistemic: { label: 'Observed' },
  basis: {
    kind: 'readme-captured',
    relativePath: 'README.md',
    digest: 'sha256:5555555555555555555555555555555555555555555555555555555555555555',
    linksToEntry: true,
  },
};

describe('CAP1-REQ-064 — machine-readable distinctions', () => {
  describe('extractDistinctions recovers epistemic attributes from ServedFact', () => {
    it('recovers epistemic label from an Observed fact', () => {
      const distinctions = extractDistinctions(OBSERVED_FACT);
      const labelD = distinctions.find((d) => d.name === 'epistemic-label');
      expect(labelD).toBeDefined();
      expect(labelD!.value).toBe('Observed');
      expect(labelD!.recoverableBy).toBe('text-attribute');
    });

    it('recovers rendering tier', () => {
      const distinctions = extractDistinctions(OBSERVED_FACT);
      const tierD = distinctions.find((d) => d.name === 'rendering-tier');
      expect(tierD).toBeDefined();
      expect(tierD!.value).toBe('gate-backed');
      expect(tierD!.recoverableBy).toBe('text-attribute');
    });

    it('recovers Unknown reason from an Unknown fact', () => {
      const distinctions = extractDistinctions(UNKNOWN_FACT);
      const reasonD = distinctions.find((d) => d.name === 'unknown-reason');
      expect(reasonD).toBeDefined();
      expect(reasonD!.value).toBe('unconsented-source-or-provider');
    });

    it('recovers freshness state', () => {
      const distinctions = extractDistinctions(OBSERVED_FACT);
      const freshnessD = distinctions.find((d) => d.name === 'freshness-state');
      expect(freshnessD).toBeDefined();
      expect(freshnessD!.value).toBe('fresh');
    });

    it('omits tier when absent', () => {
      const noTierFact: ServedFact = {
        name: 'simple-fact',
        value: 'ok',
        epistemic: { label: 'Observed' },
      };
      const distinctions = extractDistinctions(noTierFact);
      expect(distinctions.find((d) => d.name === 'rendering-tier')).toBeUndefined();
    });

    it('omits unknown-reason when label is not Unknown', () => {
      const distinctions = extractDistinctions(OBSERVED_FACT);
      expect(distinctions.find((d) => d.name === 'unknown-reason')).toBeUndefined();
    });
  });

  describe('extractProposalDistinctions recovers proposed/current and adopted/unadopted', () => {
    it('recovers proposed-vs-current marking', () => {
      const distinctions = extractProposalDistinctions(PROPOSAL_RENDERING);
      const proposedD = distinctions.find((d) => d.name === 'proposed-vs-current');
      expect(proposedD).toBeDefined();
      expect(proposedD!.value).toBe('proposed');
      expect(proposedD!.recoverableBy).toBe('text-attribute');
    });

    it('recovers adopted-vs-unadopted', () => {
      const distinctions = extractProposalDistinctions(PROPOSAL_RENDERING);
      const adoptedD = distinctions.find((d) => d.name === 'adopted-vs-unadopted');
      expect(adoptedD).toBeDefined();
      expect(adoptedD!.value).toBe('false');
    });
  });

  describe('extractAuthorityDistinctions recovers effective status vs stamp', () => {
    it('recovers effective status as text attribute', () => {
      const distinctions = extractAuthorityDistinctions(AUTHORITY_EXPOSURE);
      const statusD = distinctions.find(
        (d) => d.name === 'effective-status-vs-stamp' && d.recoverableBy === 'text-attribute',
      );
      expect(statusD).toBeDefined();
      expect(statusD!.value).toBe('unadopted');
    });

    it('recovers stamp-vs-effective comparison as structure', () => {
      const distinctions = extractAuthorityDistinctions(AUTHORITY_EXPOSURE);
      const structureD = distinctions.find(
        (d) => d.name === 'effective-status-vs-stamp' && d.recoverableBy === 'structure',
      );
      expect(structureD).toBeDefined();
      expect(structureD!.value).toBe('stamp:accepted vs effective:unadopted');
    });
  });

  describe('extractConsentDistinction R-S2 finding #4: an optional citation adds structure detail without minting a new distinction name', () => {
    it('with no citation, only the text-attribute consent-state entry is returned (unchanged shape)', () => {
      const distinctions = extractConsentDistinction('capture-failed');
      expect(distinctions).toEqual([
        { name: 'consent-state', value: 'capture-failed', recoverableBy: 'text-attribute' },
      ]);
    });

    it('with a citation, a second consent-state entry carries the record as structure', () => {
      const distinctions = extractConsentDistinction('capture-failed', {
        recordId: 'consent-xyz',
        scope: 'observe',
        attribution: 'owner',
        grantState: 'in-force',
      });
      expect(distinctions).toEqual([
        { name: 'consent-state', value: 'capture-failed', recoverableBy: 'text-attribute' },
        {
          name: 'consent-state',
          value: 'record:consent-xyz scope:observe attribution:owner grantState:in-force',
          recoverableBy: 'structure',
        },
      ]);
    });

    it('a cited withdrawal names the withdrawal record, not an in-force one', () => {
      const distinctions = extractConsentDistinction('unconsented', {
        recordId: 'consent-withdrawn-1',
        scope: 'observe',
        attribution: 'owner',
        grantState: 'withdrawn',
      });
      const structureD = distinctions.find((d) => d.recoverableBy === 'structure');
      expect(structureD?.value).toBe(
        'record:consent-withdrawn-1 scope:observe attribution:owner grantState:withdrawn',
      );
    });

    it('the closed nine-distinction set is unaffected: consent-state still counts once whether or not a citation is present', () => {
      const withoutCitation = sweepDistinctions([], [], [], [], extractConsentDistinction('stale'));
      const withCitation = sweepDistinctions(
        [],
        [],
        [],
        [],
        extractConsentDistinction('stale', {
          recordId: 'consent-xyz',
          scope: 'observe',
          attribution: 'owner',
          grantState: 'in-force',
        }),
      );
      expect(withoutCitation.totalDistinctions).toBe(9);
      expect(withCitation.totalDistinctions).toBe(9);
      expect(withoutCitation.coveredDistinctions).toEqual(['consent-state']);
      expect(withCitation.coveredDistinctions).toEqual(['consent-state']);
    });
  });

  describe('extractDiscoverabilityDistinctions recovers discoverability value', () => {
    it('recovers discoverability value as text attribute', () => {
      const distinctions = extractDiscoverabilityDistinctions(DISCOVERABILITY_FINDING);
      expect(distinctions).toHaveLength(1);
      expect(distinctions[0]!.name).toBe('discoverability-value');
      expect(distinctions[0]!.value).toBe('yes');
      expect(distinctions[0]!.recoverableBy).toBe('text-attribute');
    });
  });

  describe('sweep: all nine named distinctions covered', () => {
    it('all nine are covered when all extractors run on representative fixtures', () => {
      const factD = extractDistinctions(UNKNOWN_FACT);
      const proposalD = extractProposalDistinctions(PROPOSAL_RENDERING);
      const authorityD = extractAuthorityDistinctions(AUTHORITY_EXPOSURE);
      const discoverabilityD = extractDiscoverabilityDistinctions(DISCOVERABILITY_FINDING);
      const consentD = extractConsentDistinction('in-force');
      const sweep = sweepDistinctions(factD, proposalD, authorityD, discoverabilityD, consentD);
      expect(sweep.totalDistinctions).toBe(9);
      expect(sweep.missingDistinctions).toHaveLength(0);
      expect(sweep.coveredDistinctions).toHaveLength(9);
    });

    it('the nine distinction names are exactly the closed set', () => {
      expect(CAPABILITY_1_DISTINCTIONS).toEqual([
        'epistemic-label',
        'rendering-tier',
        'unknown-reason',
        'freshness-state',
        'consent-state',
        'adopted-vs-unadopted',
        'proposed-vs-current',
        'effective-status-vs-stamp',
        'discoverability-value',
      ]);
    });
  });

  describe('falsifier: no distinction relies only on colour, position, or layout', () => {
    it('every distinction is recoverable by text-attribute or structure', () => {
      const allDistinctions = [
        ...extractDistinctions(UNKNOWN_FACT),
        ...extractProposalDistinctions(PROPOSAL_RENDERING),
        ...extractAuthorityDistinctions(AUTHORITY_EXPOSURE),
        ...extractDiscoverabilityDistinctions(DISCOVERABILITY_FINDING),
        ...extractConsentDistinction('in-force'),
      ];
      for (const d of allDistinctions) {
        expect(['text-attribute', 'structure']).toContain(d.recoverableBy);
      }
    });
  });
});

describe('CAP1-REQ-064 — the discoverability row is recoverable as text (syzygy-u2a.7)', () => {
  it('every row field is a string, boolean or null — no distinction rides on structure alone', () => {
    const row = discoverabilityRow(
      computeDiscoverability('repo-64' as RepositoryId, 'governance-root', {
        state: 'uncaptured',
        relativePath: 'README.md',
        failure: 'missing',
      }),
      'not-produced',
    );
    expect(JSON.parse(JSON.stringify(row))).toStrictEqual({
      repositoryId: 'repo-64',
      value: 'Unknown',
      label: 'Unknown',
      primaryReason: 'source-uncaptured-or-unreachable',
      basis: { kind: 'readme-uncaptured', relativePath: 'README.md', failure: 'missing' },
      evidence: null,
      proposal: 'not-produced',
    });
    expect(extractDiscoverabilityDistinctions(
      computeDiscoverability('repo-64' as RepositoryId, 'governance-root', { state: 'unconsented' }),
    )).toStrictEqual([{ name: 'discoverability-value', value: 'Unknown', recoverableBy: 'text-attribute' }]);
  });
});
