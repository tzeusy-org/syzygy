import { describe, expect, it } from 'vitest';
import {
  artifactInForce,
  deriveEffectiveStatus,
  type GovernanceArtifactRef,
  type OwnerActRecord,
} from '@syzygy/cap1-core';
import {
  captureProjectInputs,
  DAEMON_CAPTURE_VERSIONS,
  evaluateCapturedProject,
  humanRoutes,
  machineProjectBody,
  type CaptureDependencies,
} from '@syzygy/cap1-daemon';
import {
  consentArtifactText,
  DECISIONS_PATH,
  MemoryTree,
  ownerActText,
  projectYaml,
  sha256Hex,
  type ArtifactFields,
} from './fixtures/index.js';

// CAP1-REQ-046 — Owning authority and effective status are exposed,
// stamp and record readable apart (state projection/query).
//
// Case: a checker presents an artifact whose stamp says `accepted` with
// no owner-act record, and queries an answer resting on it. Oracle: the
// served effective status is unadopted; both values are separately
// readable in the fact set. Bounded: one artifact, one fact set. Oracle
// independence: the fixture controls the stamp and the absence of a
// record; the rule is RFC3-16's. Falsifier: a stamped-but-unrecorded
// artifact served as effectively accepted, or stamp and effective
// status merged into one indistinguishable field.

const DIGEST = 'sha256:0f2e6c1a9b3d5e7f';

function artifact(stamp: string): GovernanceArtifactRef {
  return {
    artifactId: 'policy:governance/policies/example-policy.md',
    digest: DIGEST,
    selfDeclaredStamp: stamp,
    owningAuthority: {
      authority: 'governance/policies/example-policy.md',
      governingRevision: DIGEST,
    },
  };
}

const RECORD: OwnerActRecord = {
  recordId: 'act-record-17',
  artifactDigest: DIGEST,
  act: 'accepted',
  provenanceState: 'owner-adopted-bootstrap',
};

describe('CAP1-REQ-046 — stamp is not status; owning authority and effective status exposed', () => {
  it('scenario: a stamp claiming `accepted` with no owner-act record serves effective status unadopted, both readable apart', () => {
    const exposure = deriveEffectiveStatus(artifact('accepted'), []);
    // Hard-coded spellings: the served effective status is unadopted
    // whatever the stamp claims...
    expect(exposure.effectiveStatus).toBe('unadopted');
    // ...the untrusted stamp stays separately readable...
    expect(exposure.selfDeclaredStamp).toBe('accepted');
    // ...the disagreement renders as a disclosed fact...
    expect(exposure.disagreement).toEqual({
      disclosed: true,
      stamp: 'accepted',
      effectiveStatus: 'unadopted',
    });
    // ...the effective status governs...
    expect(exposure.governs).toBe('effective-status');
    expect(exposure.effectiveBasis).toBe('no-owner-act-record-at-this-digest');
    // ...and the answer treats the artifact as unadopted.
    expect(artifactInForce(exposure)).toBe(false);
  });

  it('falsifier: stamp and effective status are never merged — both fields exist on every exposure, independently valued', () => {
    const exposure = deriveEffectiveStatus(artifact('accepted'), []);
    const keys = Object.keys(exposure);
    expect(keys).toContain('selfDeclaredStamp');
    expect(keys).toContain('effectiveStatus');
    expect(exposure.selfDeclaredStamp).not.toBe(exposure.effectiveStatus);
  });

  it('an owner-act record at the exact digest makes the artifact effectively accepted, carrying the record and its two-valued provenance', () => {
    const exposure = deriveEffectiveStatus(artifact('accepted'), [RECORD]);
    expect(exposure.effectiveStatus).toBe('accepted');
    expect(exposure.effectiveBasis).toEqual({
      recordId: 'act-record-17',
      provenanceState: 'owner-adopted-bootstrap',
    });
    // Stamp and effective agree here — no disagreement is minted.
    expect(exposure.disagreement).toBeUndefined();
    expect(artifactInForce(exposure)).toBe(true);
  });

  it('a draft-stamped artifact whose exact digest carries a record is effectively accepted, with the disagreement disclosed', () => {
    const exposure = deriveEffectiveStatus(artifact('draft'), [RECORD]);
    expect(exposure.effectiveStatus).toBe('accepted');
    expect(exposure.selfDeclaredStamp).toBe('draft');
    // The self-declaration reads as authoring-time state; the
    // difference is disclosed, never silently reconciled (RFC3-16).
    expect(exposure.disagreement).toEqual({
      disclosed: true,
      stamp: 'draft',
      effectiveStatus: 'accepted',
    });
  });

  it('falsifier: a record naming a different digest binds nothing — an edit after the act destroys it', () => {
    const editedArtifact: GovernanceArtifactRef = {
      ...artifact('accepted'),
      digest: 'sha256:EDITED-after-the-act',
    };
    const exposure = deriveEffectiveStatus(editedArtifact, [RECORD]);
    expect(exposure.effectiveStatus).toBe('unadopted');
    expect(exposure.effectiveBasis).toBe('no-owner-act-record-at-this-digest');
    expect(artifactInForce(exposure)).toBe(false);
  });

  it('the owning authority and governing revision are exposed on every answer resting on the artifact', () => {
    const exposure = deriveEffectiveStatus(artifact('accepted'), [RECORD]);
    expect(exposure.owningAuthority).toEqual({
      authority: 'governance/policies/example-policy.md',
      governingRevision: DIGEST,
    });
    expect(exposure.artifactId).toBe('policy:governance/policies/example-policy.md');
  });

  it('with several records at one digest, the last appended governs — records are appended, never edited', () => {
    const adopted: OwnerActRecord = {
      recordId: 'act-record-16',
      artifactDigest: DIGEST,
      act: 'adopted',
      provenanceState: 'owner-adopted-bootstrap',
    };
    const exposure = deriveEffectiveStatus(artifact('accepted'), [adopted, RECORD]);
    expect(exposure.effectiveStatus).toBe('accepted');
    expect(exposure.effectiveBasis).toEqual({
      recordId: 'act-record-17',
      provenanceState: 'owner-adopted-bootstrap',
    });
  });

  it('the syzygy-verified provenance state travels unconflated', () => {
    const verified: OwnerActRecord = { ...RECORD, provenanceState: 'syzygy-verified' };
    const exposure = deriveEffectiveStatus(artifact('accepted'), [verified]);
    expect(exposure.effectiveBasis).toEqual({
      recordId: 'act-record-17',
      provenanceState: 'syzygy-verified',
    });
  });

  it('an empty stamp is still readable apart, and force still derives from the record set alone', () => {
    const exposure = deriveEffectiveStatus(artifact(''), []);
    expect(exposure.selfDeclaredStamp).toBe('');
    expect(exposure.effectiveStatus).toBe('unadopted');
    expect(exposure.disagreement).toEqual({
      disclosed: true,
      stamp: '',
      effectiveStatus: 'unadopted',
    });
  });
});

// --- CAP1-REQ-046 v1.0: the consent decision tuple, both channels ----------
//
// Expected tuples are literals; digests are recomputed here from the
// fixture's own bytes with node:crypto, never read from the module under
// test. Fixture acts are synthetic, never owner acts.

const P = 'prj-req046-v1';
const GOV: ArtifactFields = { id: 'c-gov', project: P, repository: 'repo-gov' };

function tree(act: Readonly<Record<string, unknown>> | false): { tree: MemoryTree; artifact: string; act: string } {
  const t = new MemoryTree();
  t.put('/gov', '.syzygy/project.yaml', projectYaml({
    id: P,
    name: 'REQ-046 v1.0 fixture',
    repositories: [{ id: 'repo-gov', role: 'governance-root', consent: 'c-gov' }],
    consents: ['c-gov'],
  }));
  const artifact = consentArtifactText(GOV);
  t.put('/gov', `${DECISIONS_PATH}/c-gov.yaml`, artifact);
  const actBytes = act === false ? '' : ownerActText(GOV, artifact, act);
  if (act !== false) t.put('/gov', `${DECISIONS_PATH}/c-gov.act.yaml`, actBytes);
  return { tree: t, artifact, act: actBytes };
}

async function channels(t: MemoryTree, extra: Partial<CaptureDependencies> = {}) {
  const captured = await captureProjectInputs('/gov', {
    asOf: '2026-09-01T00:00:00Z',
    versions: DAEMON_CAPTURE_VERSIONS,
    reader: t.reader(),
    ...extra,
  });
  if ('kind' in captured) throw new Error(captured.kind);
  const evaluation = evaluateCapturedProject(captured);
  const body = machineProjectBody(evaluation);
  if (body.kind !== 'project-evaluated') throw new Error(body.kind);
  const [page] = humanRoutes({ getEvaluation: () => evaluation });
  const html = page === undefined ? '' : (await page.handle({} as never)).body;
  return { snapshot: captured.snapshot, decision: body.consentDecisions[0], html };
}

describe('CAP1-REQ-046 v1.0 — consent provenance disclosure', () => {
  it('a valid state-(1) act shows the same exact basis in both channels, labelled bootstrap with A1 explicitly absent', async () => {
    const f = tree({});
    const { snapshot, decision, html } = await channels(f.tree);
    const evaluationId = `${snapshot}@2026-09-01T00:00:00Z`;
    expect(decision).toEqual({
      repositoryId: 'repo-gov',
      reference: 'c-gov',
      authorization: 'admitted',
      provenance: 'owner-adopted (bootstrap, uncorrelated)',
      artifactId: 'c-gov',
      artifactDigest: `sha256:${sha256Hex(f.artifact)}`,
      actId: 'act-c-gov',
      actRecordDigest: `sha256:${sha256Hex(f.act)}`,
      owner: 'fixture-owner (synthetic, not an owner act)',
      actInstant: '2026-08-01T00:00:00Z',
      scope: 'observe',
      a1AuditRecord: 'explicitly absent',
      reason: null,
      diagnostic: null,
      diagnosticReference: null,
      route: null,
      untrustedRecord: null,
      evaluationId,
    });
    expect(html).toContain('data-consent-provenance="owner-adopted (bootstrap, uncorrelated)"');
    expect(html).toContain(`consent artifact c-gov (sha256:${sha256Hex(f.artifact)})`);
    expect(html).toContain(`owner act act-c-gov (sha256:${sha256Hex(f.act)})`);
    expect(html).toContain('A1 audit identity: explicitly absent');
    expect(html).toContain(`evaluation ${evaluationId}`);
    // No independent-verification claim and no effect-success claim.
    expect(html).not.toContain('Syzygy-verified');
    expect(html).toContain('Consent authorizes observation only; it is not evidence that any effect succeeded.');
  });

  it('an invalid act refuses with Unknown, the primary reason and the same diagnostic in both channels, inside a keyboard-reachable disclosure', async () => {
    const f = tree(false);
    const { decision, html } = await channels(f.tree);
    expect(decision?.authorization).toBe('Unknown');
    expect(decision?.reason).toBe('unconsented-source-or-provider');
    expect(decision?.diagnostic).toBe('owner-act-missing');
    expect(decision?.route).toBe('owner-adjudication');
    expect(decision?.untrustedRecord).toEqual({
      trust: 'untrusted content',
      recordId: 'c-gov',
      artifactDigest: `sha256:${sha256Hex(f.artifact)}`,
      projectId: P,
      repositoryId: 'repo-gov',
      scope: 'observe',
      attribution: 'test-owner',
      grantState: 'in-force',
    });
    expect(html).toContain('authorization Unknown — reason unconsented-source-or-provider; diagnostic owner-act-missing (reference c-gov); route owner-adjudication');
    expect(html).toContain('untrusted content, not honored');
    // The explanation sits in a native <details> drawer with a <summary>:
    // reachable by keyboard, readable as text.
    const drawer = html.slice(html.indexOf('<details data-explains="Registered"'));
    expect(drawer.indexOf('<summary>')).toBeGreaterThan(-1);
    expect(drawer.indexOf('data-consent-diagnostic="owner-act-missing"')).toBeGreaterThan(drawer.indexOf('<summary>'));
  });

  it('a later correlation reports Syzygy-verified only in the new evaluation; the earlier one keeps bootstrap provenance', async () => {
    const f = tree({});
    const earlier = await channels(f.tree);
    const later = await channels(f.tree, {
      correlation: {
        id: 'fixture-provider',
        correlate: async ({ bindingDigest }) => ({
          state: 'correlated',
          auditRecordId: 'a1-fixture-9',
          auditRecordDigest: `sha256:${sha256Hex('a1-fixture-9')}`,
          bindingDigest,
        }),
      },
    });
    expect(earlier.decision?.provenance).toBe('owner-adopted (bootstrap, uncorrelated)');
    expect(earlier.decision?.a1AuditRecord).toBe('explicitly absent');
    expect(later.decision?.provenance).toBe('Syzygy-verified');
    expect(later.decision?.a1AuditRecord).toEqual({ id: 'a1-fixture-9', digest: `sha256:${sha256Hex('a1-fixture-9')}` });
    expect(later.snapshot).not.toBe(earlier.snapshot);
    expect(later.html).toContain('Consent authorizes observation only; it is not evidence that any effect succeeded.');
  });
});
