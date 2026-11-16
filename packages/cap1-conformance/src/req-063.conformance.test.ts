import { describe, expect, it } from 'vitest';
import {
  computeCoverage,
  readDeclaration,
  registerProject,
  renderProposal,
  renderState,
  type ConsentRecord,
  type ProjectId,
  type Proposal,
  type RepositoryId,
} from '@syzygy/cap1-core';
import { corrupt, decisionsFor, projectYaml } from './fixtures/index.js';

// CAP1-REQ-063 — Proposed material never renders as current state
// (prohibition).
//
// Case: every rendering of proposed material in Capability 1 fixtures;
// sweep: enumerate proposal renderings and diff status values with and
// without the proposal — denominator: the rendering set and the status
// set. Oracle: every proposal rendering carries the proposed marking;
// status values are identical with and without the open proposal.
// Falsifier: a drafted repair shown as the declaration's content, or
// any answer improved by an unadopted proposal.

const PROJECT = 'prj-proposal-3e' as ProjectId;
const REPO = 'repo-proposal-01' as RepositoryId;

const SOURCE = projectYaml({
  id: PROJECT,
  name: 'Proposal Fixture',
  repositories: [
    { id: 'repo-proposal-01', role: 'governance-root', consent: 'consent-p1' },
  ],
  consents: ['consent-p1'],
});

const CONSENTS: readonly ConsentRecord[] = [
  {
    id: 'consent-p1',
    projectId: PROJECT,
    repositoryId: REPO,
    scope: 'observe',
    attribution: 'uniquosity@gmail.com',
    grantState: 'in-force',
  },
];

// The proposal fixture set — one of each of the spec's named examples:
// a drafted declaration repair, a drafted entry, a proposed
// repository-entry link. The sweep's rendering-set denominator.
const PROPOSALS: readonly Proposal[] = [
  {
    id: 'prop-repair-1',
    kind: 'spec-delta',
    subject: 'drafted declaration repair: owner field',
    exclusivityGroup: 'grp-declaration',
    plane: 'proposed',
  },
  {
    id: 'prop-entry-1',
    kind: 'governance-delta',
    subject: 'drafted entry: new topology row',
    exclusivityGroup: 'grp-topology',
    plane: 'proposed',
  },
  {
    id: 'prop-link-1',
    kind: 'spec-delta',
    subject: 'proposed repository-entry link: repo-proposal-02',
    exclusivityGroup: 'grp-declaration',
    plane: 'proposed',
  },
];

// The current-state query the proposal is diffed against: an UNCONSENTED
// coverage answer — an unfavourable status a proposal might be imagined
// to improve. Built without and with the open proposals.
function currentCoverage() {
  const read = readDeclaration(SOURCE);
  if (!read.ok) throw new Error('fixture must parse');
  // No consent record handed in — the repository renders unconsented,
  // an unfavourable state.
  return computeCoverage(read.declaration, decisionsFor(read.declaration, []), []);
}

describe('CAP1-REQ-063 — proposed material never renders as current state', () => {
  it('sweep: every proposal rendering carries the proposed marking, machine-readably — denominator: the rendering set', () => {
    expect(PROPOSALS.length).toBe(3); // denominator disclosed
    for (const proposal of PROPOSALS) {
      const rendering = renderProposal(proposal);
      // Expected spellings hard-coded, never imported.
      expect(rendering.marking).toBe('proposed');
      expect(rendering.plane).toBe('proposed');
      expect(rendering.adopted).toBe(false);
      expect(rendering.statusAuthority).toBe('none');
      expect(rendering.proposalId).toBe(proposal.id);
    }
  });

  it('scenario: the same query with and without an open proposal serves identical status values', () => {
    const without = renderState(currentCoverage(), []);
    const withProposals = renderState(currentCoverage(), PROPOSALS);

    // The status set: every per-repository (state, label, reason)
    // triple in the coverage answer — enumerated, then diffed.
    const statusValues = (rendering: typeof without) =>
      rendering.current.repositories.map((entry) => ({
        state: entry.state,
        label: 'label' in entry ? entry.label : undefined,
        reason: 'reason' in entry ? entry.reason : undefined,
      }));
    expect(statusValues(without).length).toBe(1); // denominator disclosed
    expect(JSON.stringify(statusValues(withProposals))).toBe(JSON.stringify(statusValues(without)));
    // The whole current layer is byte-identical, not only the sampled
    // status fields.
    expect(JSON.stringify(withProposals.current)).toBe(JSON.stringify(without.current));
  });

  it('the current value is the caller\'s own, untouched by reference — no code path folds a proposal into it', () => {
    const current = currentCoverage();
    const rendered = renderState(current, PROPOSALS);
    expect(rendered.current).toBe(current);
  });

  it('falsifier: an unfavourable answer is never improved by an open proposal', () => {
    const registration = registerProject(
      readDeclaration(corrupt(SOURCE, 'owner: uniquosity@gmail.com', 'owner: ""')),
      'rev-1',
    );
    expect(registration.status).toBe('failed');
    const rendered = renderState(registration, [
      {
        id: 'prop-fix-owner',
        kind: 'spec-delta',
        subject: 'drafted declaration repair: restore owner',
        exclusivityGroup: 'grp-declaration',
        plane: 'proposed',
      },
    ]);
    // The drafted repair exists — and the registration still fails.
    expect(rendered.current.status).toBe('failed');
    expect(rendered.proposed.length).toBe(1);
  });

  it('falsifier: a drafted repair renders only as proposed material, never as the declaration\'s content', () => {
    const rendered = renderState(currentCoverage(), PROPOSALS);
    // Nothing in the current layer mentions any proposal subject.
    const currentBytes = JSON.stringify(rendered.current);
    for (const proposal of PROPOSALS) {
      expect(currentBytes.includes(proposal.subject)).toBe(false);
      expect(currentBytes.includes(proposal.id)).toBe(false);
    }
    // The proposals appear, each in the proposed layer, each marked.
    expect(rendered.proposed.map((p) => p.marking)).toEqual(['proposed', 'proposed', 'proposed']);
  });

  it('competing proposals in one exclusivity group render as distinct candidates, never one merged rendering (RFC1-27)', () => {
    const rendered = renderState(currentCoverage(), PROPOSALS);
    const declarationGroup = rendered.proposed.filter(
      (p) => p.exclusivityGroup === 'grp-declaration',
    );
    expect(declarationGroup.length).toBe(2);
    expect(new Set(declarationGroup.map((p) => p.proposalId)).size).toBe(2);
  });
});
