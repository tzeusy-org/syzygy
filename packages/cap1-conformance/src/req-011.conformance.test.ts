import { describe, expect, it } from 'vitest';
import {
  computeCoverage,
  readDeclaration,
  resolveConsent,
  type ConsentRecord,
  type ObservationOutcome,
  type ProjectDeclaration,
  type ProjectId,
  type RepositoryId,
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
  admittedDecision,
  decisionsFor,
  consent,
  consentArtifactText,
  DECISIONS_PATH,
  MemoryTree,
  ownerActText,
  projectYaml,
  refusedDecision,
  sha256Hex,
  type ArtifactFields,
} from './fixtures/index.js';

// CAP1-REQ-011 — Consent is a visible recorded fact, never an
// assumption.
//
// Sweep (the requirement's own case): for each declared (project,
// repository) pair, join the served coverage state to the consent
// records — denominator: the declared pair count. Oracle: every pair
// served as observed joins to an in-force consent record; every pair
// without one is served as unconsented. Oracle independence: the consent
// records are the checker's own fixture artifacts; the oracle joins
// against them directly, never consulting the implementation's consent
// logic.

const PROJECT = 'prj-consent-b2' as ProjectId;

const SOURCE = projectYaml({
  id: PROJECT,
  name: 'Consent Fixture',
  repositories: [
    { id: 'repo-inforce', role: 'governance-root', consent: 'consent-inforce' },
    { id: 'repo-withdrawn', role: 'observed-source', consent: 'consent-withdrawn' },
    { id: 'repo-recordless', role: 'observed-source', consent: 'consent-missing' },
  ],
  consents: ['consent-inforce', 'consent-withdrawn'],
});

function declaration(): ProjectDeclaration {
  const read = readDeclaration(SOURCE);
  if (!read.ok) throw new Error('fixture must be valid');
  return read.declaration;
}

const IN_FORCE = consent({
  id: 'consent-inforce',
  projectId: PROJECT,
  repositoryId: 'repo-inforce' as RepositoryId,
});

const WITHDRAWN = consent({
  id: 'consent-withdrawn',
  projectId: PROJECT,
  repositoryId: 'repo-withdrawn' as RepositoryId,
  grantState: 'withdrawn',
});

const CONSENTS: ConsentRecord[] = [IN_FORCE, WITHDRAWN];

// Every repository has a capture outcome — so any repository that
// renders unconsented does so on consent grounds alone.
const OBSERVATIONS: ObservationOutcome[] = (
  ['repo-inforce', 'repo-withdrawn', 'repo-recordless'] as const
).map((id) => ({
  repositoryId: id as RepositoryId,
  outcome: 'captured',
  capturedScope: 'full-tree',
}));

describe('CAP1-REQ-011 — consent is a visible recorded fact, never an assumption', () => {
  it('scenario: consent state joins to a record — the served state cites the record with scope, attribution, and grant state', () => {
    const resolution = resolveConsent(CONSENTS, PROJECT, 'repo-inforce' as RepositoryId);
    expect(resolution.consented).toBe(true);
    if (resolution.consented) {
      expect(resolution.record.id).toBe('consent-inforce');
      expect(resolution.record.scope).toBe('observe');
      expect(resolution.record.attribution).toBe('owner');
      expect(resolution.record.grantState).toBe('in-force');
    }
    // And the coverage answer renders that record's facts, citing it.
    const result = computeCoverage(
      declaration(),
      decisionsFor(declaration(), CONSENTS),
      OBSERVATIONS,
    );
    const observed = result.repositories.find((e) => e.state === 'observed');
    expect(observed).toBeDefined();
    if (observed?.state === 'observed') {
      expect(observed.consent.recordId).toBe('consent-inforce');
      expect(observed.consent.scope).toBe('observe');
      expect(observed.consent.attribution).toBe('owner');
      expect(observed.consent.grantState).toBe('in-force');
    }
  });

  it('absence of a resolvable in-force record renders as absence of consent — never implied consent', () => {
    const resolution = resolveConsent(CONSENTS, PROJECT, 'repo-recordless' as RepositoryId);
    expect(resolution.consented).toBe(false);
    if (!resolution.consented) {
      expect(resolution.basis).toBe('no-resolvable-in-force-record');
    }
  });

  it('a withdrawn record is not consent — and the withdrawal is distinguishable from record absence', () => {
    const resolution = resolveConsent(CONSENTS, PROJECT, 'repo-withdrawn' as RepositoryId);
    expect(resolution.consented).toBe(false);
    if (!resolution.consented) {
      expect(resolution.basis).toBe('withdrawn');
    }
  });

  it('sweep over every declared pair: observed ⇔ joins to an in-force record; no record ⇒ unconsented — denominator = declared pair count', () => {
    const decl = declaration();
    const result = computeCoverage(decl, decisionsFor(decl, CONSENTS), OBSERVATIONS);
    expect(result.repositories).toHaveLength(decl.repositories.length); // denominator

    for (const entry of result.repositories) {
      // The join is against the checker's own record set, not the
      // implementation's consent logic.
      const inForce = CONSENTS.find(
        (record) =>
          record.projectId === PROJECT &&
          record.repositoryId === entry.repositoryId &&
          record.grantState === 'in-force',
      );
      if (entry.state === 'observed' || entry.state === 'degraded-partial') {
        expect(inForce).toBeDefined();
        expect(entry.consent.recordId).toBe(inForce?.id);
      } else {
        expect(inForce).toBeUndefined();
        expect(entry.state).toBe('unconsented');
      }
    }
  });

  it('falsifier: a repository is never observed (no content served) without an in-force record, even when a capture outcome exists', () => {
    // Both repo-withdrawn and repo-recordless HAVE captured outcomes in
    // the fixture; neither may surface any captured content.
    const result = computeCoverage(
      declaration(),
      decisionsFor(declaration(), CONSENTS),
      OBSERVATIONS,
    );
    for (const id of ['repo-withdrawn', 'repo-recordless']) {
      const entry = result.repositories.find((e) => e.repositoryId === (id as RepositoryId));
      expect(entry?.state).toBe('unconsented');
      expect(entry !== undefined && 'capturedScope' in entry).toBe(false);
    }
  });

  it('falsifier: absence of consent is never absence of the repository', () => {
    const result = computeCoverage(
      declaration(),
      decisionsFor(declaration(), CONSENTS),
      OBSERVATIONS,
    );
    expect(
      result.repositories.some((e) => e.repositoryId === ('repo-recordless' as RepositoryId)),
    ).toBe(true);
  });
});

// R-S2 non-blocking finding #4: a consented-but-capture-failed/stale
// repository's in-force record was never cited, and a withdrawn pair
// never named WHICH withdrawal record defeated it. This fixture pairs a
// consented repository with each of 'unreachable' and 'stale' outcomes,
// so both failure states carry an in-force record to cite.

const CITATION_PROJECT = 'prj-citation-blo' as ProjectId;

const CITATION_SOURCE = projectYaml({
  id: CITATION_PROJECT,
  name: 'Citation Fixture',
  repositories: [
    { id: 'repo-capture-failed', role: 'observed-source', consent: 'consent-capture-failed' },
    { id: 'repo-stale', role: 'observed-source', consent: 'consent-stale' },
  ],
  consents: ['consent-capture-failed', 'consent-stale'],
});

function citationDeclaration(): ProjectDeclaration {
  const read = readDeclaration(CITATION_SOURCE);
  if (!read.ok) throw new Error('fixture must be valid');
  return read.declaration;
}

const CAPTURE_FAILED_RECORD = consent({
  id: 'consent-capture-failed',
  projectId: CITATION_PROJECT,
  repositoryId: 'repo-capture-failed' as RepositoryId,
});

const STALE_RECORD = consent({
  id: 'consent-stale',
  projectId: CITATION_PROJECT,
  repositoryId: 'repo-stale' as RepositoryId,
});

const CITATION_CONSENTS: ConsentRecord[] = [CAPTURE_FAILED_RECORD, STALE_RECORD];

const CITATION_OBSERVATIONS: ObservationOutcome[] = [
  { repositoryId: 'repo-capture-failed' as RepositoryId, outcome: 'unreachable' },
  { repositoryId: 'repo-stale' as RepositoryId, outcome: 'stale' },
];

describe('CAP1-REQ-011 R-S2 finding #4 — capture-failed and stale cite their in-force record', () => {
  it('consented + capture-failed cites the in-force record that stands behind the failed capture', () => {
    const result = computeCoverage(
      citationDeclaration(),
      decisionsFor(citationDeclaration(), CITATION_CONSENTS),
      CITATION_OBSERVATIONS,
    );
    const entry = result.repositories.find(
      (e) => e.repositoryId === ('repo-capture-failed' as RepositoryId),
    );
    expect(entry?.state).toBe('capture-failed');
    if (entry?.state === 'capture-failed') {
      expect(entry.consent.recordId).toBe('consent-capture-failed');
      expect(entry.consent.scope).toBe('observe');
      expect(entry.consent.attribution).toBe('owner');
      expect(entry.consent.grantState).toBe('in-force');
    }
  });

  it('consented + stale cites the in-force record that stands behind the stale capture', () => {
    const result = computeCoverage(
      citationDeclaration(),
      decisionsFor(citationDeclaration(), CITATION_CONSENTS),
      CITATION_OBSERVATIONS,
    );
    const entry = result.repositories.find((e) => e.repositoryId === ('repo-stale' as RepositoryId));
    expect(entry?.state).toBe('stale');
    if (entry?.state === 'stale') {
      expect(entry.consent.recordId).toBe('consent-stale');
      expect(entry.consent.scope).toBe('observe');
      expect(entry.consent.attribution).toBe('owner');
      expect(entry.consent.grantState).toBe('in-force');
    }
  });
});

// Conflict fixture: ONE pair carrying BOTH an in-force grant and a
// withdrawal. Records are append-only (RFC2-23 "Consent withdrawn":
// prior records remain, immutable, with the withdrawal visible), so
// grant-then-withdraw presents exactly this record set — and the record
// shape carries no ordering, so resolution may not decide the conflict
// by list position. The falsifier pins the fail-closed answer:
// withdrawal defeats grant, in EITHER list order.

const CONFLICT_PROJECT = 'prj-conflict-b2' as ProjectId;
const CONFLICT_REPO = 'repo-conflict' as RepositoryId;

const CONFLICT_SOURCE = projectYaml({
  id: CONFLICT_PROJECT,
  name: 'Conflict Fixture',
  repositories: [
    { id: 'repo-conflict', role: 'governance-root', consent: 'consent-conflict-grant' },
  ],
  consents: ['consent-conflict-grant', 'consent-conflict-withdrawal'],
});

function conflictDeclaration(): ProjectDeclaration {
  const read = readDeclaration(CONFLICT_SOURCE);
  if (!read.ok) throw new Error('fixture must be valid');
  return read.declaration;
}

const CONFLICT_GRANT = consent({
  id: 'consent-conflict-grant',
  projectId: CONFLICT_PROJECT,
  repositoryId: CONFLICT_REPO,
});

const CONFLICT_WITHDRAWAL = consent({
  id: 'consent-conflict-withdrawal',
  projectId: CONFLICT_PROJECT,
  repositoryId: CONFLICT_REPO,
  grantState: 'withdrawn',
});

// Content WAS captured — so only the consent decision stands between the
// conflicted pair and its content being served.
const CONFLICT_OBSERVATIONS: ObservationOutcome[] = [
  { repositoryId: CONFLICT_REPO, outcome: 'captured', capturedScope: 'full-tree' },
];

describe('CAP1-REQ-011 falsifier — a pair holding both a grant and a withdrawal resolves closed', () => {
  it('in-force listed FIRST, withdrawal after: the withdrawal still defeats the grant — and names the withdrawal record', () => {
    const resolution = resolveConsent(
      [CONFLICT_GRANT, CONFLICT_WITHDRAWAL],
      CONFLICT_PROJECT,
      CONFLICT_REPO,
    );
    expect(resolution.consented).toBe(false);
    if (!resolution.consented) {
      expect(resolution.basis).toBe('withdrawn');
      if (resolution.basis === 'withdrawn') {
        expect(resolution.withdrawnRecord.id).toBe('consent-conflict-withdrawal');
      }
    }
  });

  it('withdrawal listed FIRST, in-force after: same answer, same cited record — list order never decides the conflict or its citation', () => {
    const resolution = resolveConsent(
      [CONFLICT_WITHDRAWAL, CONFLICT_GRANT],
      CONFLICT_PROJECT,
      CONFLICT_REPO,
    );
    expect(resolution.consented).toBe(false);
    if (!resolution.consented) {
      expect(resolution.basis).toBe('withdrawn');
      if (resolution.basis === 'withdrawn') {
        expect(resolution.withdrawnRecord.id).toBe('consent-conflict-withdrawal');
      }
    }
  });

  it('coverage over the conflicted pair renders unconsented with the verbatim reason, citing the withdrawal record — no captured content surfaces, in either record order', () => {
    for (const records of [
      [CONFLICT_GRANT, CONFLICT_WITHDRAWAL],
      [CONFLICT_WITHDRAWAL, CONFLICT_GRANT],
    ]) {
      const result = computeCoverage(
        conflictDeclaration(),
        decisionsFor(conflictDeclaration(), records),
        CONFLICT_OBSERVATIONS,
      );
      const entry = result.repositories.find((e) => e.repositoryId === CONFLICT_REPO);
      expect(entry?.state).toBe('unconsented');
      if (entry?.state === 'unconsented') {
        // Verbatim spelling hard-coded — the oracle never consults the
        // implementation's vocabulary module.
        expect(entry.reason).toBe('unconsented-source-or-provider');
        expect(entry.basis).toBe('withdrawn');
        // R-S2 finding #4: the withdrawal record IS the one cited —
        // never the in-force record it defeated, whatever list order.
        if (entry.basis === 'withdrawn') {
          expect(entry.consent.recordId).toBe('consent-conflict-withdrawal');
          expect(entry.consent.grantState).toBe('withdrawn');
        }
      }
      expect(entry !== undefined && 'capturedScope' in entry).toBe(false);
      expect(JSON.stringify(entry)).not.toContain('full-tree');
    }
  });
});

// --- CAP1-REQ-011 v1.0: owner-act admission before any dependent read ------
//
// Each case is one controlled input difference against a valid bootstrap
// baseline, run through the real capture with an intercepting reader. The
// expected (authorization, diagnostic, dependent-read count) tuple is a
// literal per case; the denominator is the enumerated case list below,
// never the implementation's accepted subset. Both channels are compared
// against the same literals. Fixture acts are synthetic, never owner acts.

const V1_PROJECT = 'prj-req011-v1';
const GOV: ArtifactFields = { id: 'c-gov', project: V1_PROJECT, repository: 'repo-gov' };
const SRC: ArtifactFields = { id: 'c-src', project: V1_PROJECT, repository: 'repo-src' };
const AS_OF = '2026-09-01T00:00:00Z';

function v1Tree(extraConsents: readonly string[] = [], extraFirst = false): MemoryTree {
  const tree = new MemoryTree();
  tree.roots.add('/src');
  tree.put(
    '/gov',
    '.syzygy/project.yaml',
    projectYaml({
      id: V1_PROJECT,
      name: 'REQ-011 v1.0 fixture',
      repositories: [
        { id: 'repo-gov', role: 'governance-root', consent: 'c-gov' },
        { id: 'repo-src', role: 'observed-source', consent: 'c-src' },
      ],
      consents: extraFirst ? [...extraConsents, 'c-gov', 'c-src'] : ['c-gov', 'c-src', ...extraConsents],
    }),
  );
  tree.put('/gov', '.syzygy/intent/OVERVIEW.md', '# overview\n');
  putConsent(tree, GOV);
  return tree;
}

function putConsent(
  tree: MemoryTree,
  artifact: ArtifactFields,
  act: Readonly<Record<string, unknown>> | false = {},
  artifactOverride?: string,
): void {
  const text = artifactOverride ?? consentArtifactText(artifact);
  tree.put('/gov', `${DECISIONS_PATH}/${artifact.id}.yaml`, text);
  if (act !== false) {
    tree.put('/gov', `${DECISIONS_PATH}/${artifact.id}.act.yaml`, ownerActText(artifact, text, act));
  }
}

interface CaseResult {
  readonly gov: readonly [string, string];
  readonly src: readonly [string, string];
  readonly srcRootReads: number;
  readonly entryReads: number;
  readonly machine: readonly (readonly [string, string, string])[];
  readonly human: string;
}

async function runCase(tree: MemoryTree, extra: Partial<CaptureDependencies> = {}): Promise<CaseResult> {
  const captured = await captureProjectInputs('/gov', {
    asOf: AS_OF,
    versions: DAEMON_CAPTURE_VERSIONS,
    repositoryRoots: { 'repo-gov': '/gov', 'repo-src': '/src' },
    reader: tree.reader(),
    ...extra,
  });
  if ('kind' in captured) throw new Error(`capture failed: ${captured.kind}`);
  const evaluation = evaluateCapturedProject(captured);
  if (evaluation.kind !== 'project-evaluated') throw new Error(evaluation.kind);
  const tuple = (repositoryId: string): readonly [string, string] => {
    const decision = evaluation.consentDecisions.find((d) => d.repositoryId === repositoryId);
    if (decision === undefined) throw new Error(repositoryId);
    return decision.authorization === 'admitted'
      ? ['admitted', decision.provenance]
      : ['Unknown', decision.diagnostic];
  };
  const body = machineProjectBody(evaluation);
  if (body.kind !== 'project-evaluated') throw new Error(body.kind);
  const [page] = humanRoutes({ getEvaluation: () => evaluation });
  const human = page === undefined ? '' : (await page.handle({} as never)).body;
  return {
    gov: tuple('repo-gov'),
    src: tuple('repo-src'),
    srcRootReads: tree.count('list|/src'),
    entryReads: tree.count('/gov|.syzygy/intent/OVERVIEW.md'),
    machine: body.consentDecisions.map((d) => [
      d.repositoryId,
      d.authorization,
      d.authorization === 'admitted' ? (d.provenance ?? '') : (d.diagnostic ?? ''),
    ]),
    human,
  };
}

const BOOT = 'owner-adopted (bootstrap, uncorrelated)';
const ADMITTED_GOV = ['admitted', BOOT] as const;

// [case, arrange, expected src tuple]. Every case leaves repo-gov valid.
const INVALID_CASES: readonly (readonly [string, (tree: MemoryTree) => void, string])[] = [
  ['missing owner-act record', (t) => putConsent(t, SRC, false), 'owner-act-missing'],
  ['machine-only submission (caller flag, no act)', (t) => putConsent(t, SRC, false, consentArtifactText({ ...SRC, extra: ['verified: true'] })), 'owner-act-missing'],
  ['known non-human act', (t) => putConsent(t, SRC, { actor: 'machine' }), 'actor-non-human'],
  ['malformed binding', (t) => putConsent(t, SRC, { act_type: 'grant' }), 'owner-act-malformed'],
  ['unparseable act', (t) => { putConsent(t, SRC, false); t.put('/gov', `${DECISIONS_PATH}/c-src.act.yaml`, 'act: [unclosed\n'); }, 'owner-act-malformed'],
  ['omitted audit field', (t) => putConsent(t, SRC, { a1_audit_record: undefined }), 'audit-identity-omitted'],
  ['digest mismatch', (t) => putConsent(t, SRC, { artifact_digest: `sha256:${'0'.repeat(64)}` }), 'artifact-digest-mismatch'],
  ['wrong artifact identity', (t) => putConsent(t, SRC, { artifact: 'c-other' }), 'artifact-identity-mismatch'],
  ['wrong project', (t) => putConsent(t, SRC, { project: 'prj-other' }), 'project-mismatch'],
  ['wrong act type', (t) => putConsent(t, SRC, { act_type: 'revoke' }), 'act-type-mismatch'],
  ['wrong scope (act differs from artifact)', (t) => putConsent(t, SRC, { scope: 'observe write' }), 'scope-mismatch'],
  ['wrong scope (no observe token)', (t) => putConsent(t, { ...SRC, scope: 'write' }), 'scope-excludes-observation'],
  ['legacy free-text scope', (t) => putConsent(t, { ...SRC, scope: 'full' }), 'scope-excludes-observation'],
  ['missing owner (omitted)', (t) => putConsent(t, SRC, { owner: undefined }), 'owner-attribution-missing'],
  ['missing owner (null)', (t) => putConsent(t, SRC, { owner: null }), 'owner-attribution-missing'],
  ['missing instant', (t) => putConsent(t, SRC, { instant: undefined }), 'act-instant-missing'],
  ['future instant', (t) => putConsent(t, SRC, { instant: '2026-09-01T00:00:00.001Z' }), 'act-instant-future'],
  ['declared expiry', (t) => putConsent(t, SRC, { expires: '2026-09-01T00:00:00Z' }), 'act-expired'],
  ['state 1 carrying an A1 identity', (t) => putConsent(t, SRC, { a1_audit_record: { id: 'a1-x', digest: `sha256:${'a'.repeat(64)}` } }), 'provenance-state-inconsistent'],
  ['state 2 with explicit absence', (t) => putConsent(t, SRC, { provenance: 'syzygy-verified' }), 'provenance-state-inconsistent'],
  ['supersession', (t) => { putConsent(t, SRC); putConsent(t, { ...SRC, id: 'c-new' }, { supersedes: 'act-c-src' }); }, 'act-superseded'],
  ['self-supersession', (t) => putConsent(t, SRC, { supersedes: 'act-c-src' }), 'act-superseded'],
  ['revocation', (t) => { putConsent(t, SRC); putConsent(t, { ...SRC, id: 'c-w', grantState: 'withdrawn' }, { supersedes: 'act-c-src' }); }, 'act-revoked'],
  ['duplicate act identity', (t) => { putConsent(t, SRC); putConsent(t, { ...SRC, id: 'c-dup', scope: 'observe' }, { act: 'act-c-src' }); }, 'act-identity-duplicate'],
];

const EXTRA_REFS: Readonly<Record<string, readonly string[]>> = {
  supersession: ['c-new'],
  revocation: ['c-w'],
  'duplicate act identity': ['c-dup'],
};

describe('CAP1-REQ-011 v1.0 — invalid owner-act states refuse before any dependent read', () => {
  it('a valid explicit state-(1) act admits observation without an A1 provider', async () => {
    const tree = v1Tree();
    putConsent(tree, SRC);
    const result = await runCase(tree);
    expect(result.gov).toEqual(ADMITTED_GOV);
    expect(result.src).toEqual(['admitted', 'owner-adopted (bootstrap, uncorrelated)']);
    // One capture read plus one revalidation read; nothing more.
    expect(result.srcRootReads).toBe(2);
    expect(result.entryReads).toBe(2);
  });

  it.each(INVALID_CASES)('%s refuses with its own diagnostic and zero reads of the repository', async (name, arrange, diagnostic) => {
    const tree = v1Tree(EXTRA_REFS[name] ?? []);
    arrange(tree);
    const result = await runCase(tree);
    expect(result.src).toEqual(['Unknown', diagnostic]);
    expect(result.gov).toEqual(ADMITTED_GOV);
    expect(result.srcRootReads).toBe(0);
    // Both channels carry the same tuple for the refused pair.
    expect(result.machine).toContainEqual(['repo-src', 'Unknown', diagnostic]);
    expect(result.human).toContain(`data-consent-decision="repo-src"`);
    expect(result.human).toContain(`data-consent-diagnostic="${diagnostic}"`);
  });

  it('the case denominator is the enumerated matrix: 24 invalid cases, 24 distinct inputs', () => {
    expect(INVALID_CASES.length).toBe(24);
    expect(new Set(INVALID_CASES.map(([name]) => name)).size).toBe(24);
  });

  it('a missing consent record refuses its pair and, being unreadable evidence, every pair', async () => {
    const tree = v1Tree();
    const result = await runCase(tree);
    expect(result.src).toEqual(['Unknown', 'reference-unresolvable']);
    expect(result.gov).toEqual(['Unknown', 'consent-evidence-unresolved']);
    expect(result.srcRootReads).toBe(0);
    expect(result.entryReads).toBe(0);
  });

  it('an applicable declared currency bound refuses a stale act, one millisecond past the bound', async () => {
    const tree = v1Tree();
    putConsent(tree, SRC, { instant: '2026-08-31T23:59:58.999Z' });
    const result = await runCase(tree, {
      consentCurrencyBound: { maxAgeSeconds: 1, declaredBy: 'fixture-bound (synthetic)' },
    });
    expect(result.src).toEqual(['Unknown', 'act-stale']);
    expect(result.srcRootReads).toBe(0);
    const atBound = v1Tree();
    putConsent(atBound, SRC, { instant: '2026-08-31T23:59:59Z' });
    const ok = await runCase(atBound, {
      consentCurrencyBound: { maxAgeSeconds: 1, declaredBy: 'fixture-bound (synthetic)' },
    });
    expect(ok.src).toEqual(['admitted', 'owner-adopted (bootstrap, uncorrelated)']);
  });
});

describe('CAP1-REQ-011 v1.0 — state (2) needs successful correlation, with no downgrade', () => {
  const A1 = { id: 'a1-fixture-1', digest: `sha256:${sha256Hex('a1-fixture-1')}` };
  const claimState2 = (tree: MemoryTree): void =>
    putConsent(tree, SRC, { provenance: 'syzygy-verified', a1_audit_record: A1 });

  it('no provider refuses correlation-unavailable, never state (1)', async () => {
    const tree = v1Tree();
    claimState2(tree);
    const result = await runCase(tree);
    expect(result.src).toEqual(['Unknown', 'correlation-unavailable']);
    expect(result.srcRootReads).toBe(0);
  });

  it.each([
    ['not-found', 'correlation-not-found'],
    ['mismatch', 'correlation-mismatch'],
    ['indeterminate', 'correlation-indeterminate'],
    ['unavailable', 'correlation-unavailable'],
    ['throws', 'correlation-unavailable'],
  ] as const)('a %s correlation refuses %s with no fallback or retry', async (state, diagnostic) => {
    const tree = v1Tree();
    claimState2(tree);
    let calls = 0;
    const result = await runCase(tree, {
      correlation: {
        id: 'fixture-provider',
        correlate: async () => {
          calls += 1;
          if (state === 'throws') throw new Error('provider down');
          return { state };
        },
      },
    });
    expect(result.src).toEqual(['Unknown', diagnostic]);
    expect(result.srcRootReads).toBe(0);
    // Called once per act that passed the prechecks: c-gov and c-src.
    expect(calls).toBe(2);
  });

  it('a correlation whose binding digest does not match refuses correlation-mismatch', async () => {
    const tree = v1Tree();
    claimState2(tree);
    const result = await runCase(tree, {
      correlation: {
        id: 'fixture-provider',
        correlate: async () => ({
          state: 'correlated',
          auditRecordId: A1.id,
          auditRecordDigest: A1.digest as `sha256:${string}`,
          bindingDigest: `sha256:${'1'.repeat(64)}`,
        }),
      },
    });
    expect(result.src).toEqual(['Unknown', 'correlation-mismatch']);
  });

  it.each([
    ['an empty audit record id', { auditRecordId: '' }],
    ['a malformed audit record digest', { auditRecordDigest: 'sha256:not-a-digest' }],
    ['a malformed binding digest', { bindingDigest: 'deadbeef' }],
  ] as const)('a correlated answer with %s is unavailable, never a grant', async (_name, broken) => {
    const tree = v1Tree();
    claimState2(tree);
    const result = await runCase(tree, {
      correlation: {
        id: 'fixture-provider',
        correlate: async ({ bindingDigest }) =>
          ({
            state: 'correlated',
            auditRecordId: A1.id,
            auditRecordDigest: A1.digest,
            bindingDigest,
            ...broken,
          }) as never,
      },
    });
    expect(result.src).toEqual(['Unknown', 'correlation-unavailable']);
    expect(result.srcRootReads).toBe(0);
  });

  it('the correlated binding digest is the sha256 of the binding without the A1 identity and act-record digest (independent oracle)', async () => {
    const tree = v1Tree();
    claimState2(tree);
    // Hand-encoded canonical bytes: keys in UTF-16 code-unit order, no
    // a1AuditRecord, no actRecordDigest. The provider never echoes the
    // digest it is handed; it answers with its own.
    const oracle = (repositoryId: string, artifactId: string, provenance: string): string =>
      `sha256:${sha256Hex(
        `{"actId":"act-${artifactId}","actType":"consent","actor":"human",` +
          `"artifactDigest":"sha256:${sha256Hex(consentArtifactText(artifactId === 'c-src' ? SRC : GOV))}",` +
          `"artifactId":"${artifactId}","expires":null,"instant":"2026-08-01T00:00:00Z",` +
          `"owner":"fixture-owner (synthetic, not an owner act)","projectId":"prj-req011-v1",` +
          `"provenance":"${provenance}","repositoryId":"${repositoryId}","scope":"observe","supersedes":null}`,
      )}`;
    const result = await runCase(tree, {
      correlation: {
        id: 'fixture-provider',
        correlate: async ({ binding }) => ({
          state: 'correlated',
          auditRecordId: A1.id,
          auditRecordDigest: A1.digest as `sha256:${string}`,
          bindingDigest: (binding.repositoryId === 'repo-src'
            ? oracle('repo-src', 'c-src', 'syzygy-verified')
            : oracle('repo-gov', 'c-gov', 'owner-adopted-bootstrap')) as `sha256:${string}`,
        }),
      },
    });
    expect(result.src).toEqual(['admitted', 'Syzygy-verified']);
    expect(result.gov).toEqual(['admitted', 'Syzygy-verified']);
  });

  it('a matching correlation admits Syzygy-verified; a bootstrap act it correlates is upgraded only in this evaluation', async () => {
    const tree = v1Tree();
    claimState2(tree);
    const result = await runCase(tree, {
      correlation: {
        id: 'fixture-provider',
        correlate: async ({ bindingDigest }) => ({
          state: 'correlated',
          auditRecordId: A1.id,
          auditRecordDigest: A1.digest as `sha256:${string}`,
          bindingDigest,
        }),
      },
    });
    expect(result.src).toEqual(['admitted', 'Syzygy-verified']);
    expect(result.gov).toEqual(['admitted', 'Syzygy-verified']);
    expect(result.srcRootReads).toBe(2);
  });
});

describe('CAP1-REQ-011 v1.0 — withdrawal and unresolved withdrawal stay fail closed', () => {
  const WITHDRAWAL: ArtifactFields = { ...SRC, id: 'c-w', grantState: 'withdrawn' };

  it.each([
    ['valid withdrawal', (t: MemoryTree) => putConsent(t, WITHDRAWAL), 'withdrawn'],
    ['malformed withdrawal act', (t: MemoryTree) => putConsent(t, WITHDRAWAL, { actor: 'robot' }), 'withdrawal-unresolved'],
    ['withdrawal with no act', (t: MemoryTree) => putConsent(t, WITHDRAWAL, false), 'withdrawal-unresolved'],
    ['malformed withdrawal record naming the pair', (t: MemoryTree) => t.put('/gov', `${DECISIONS_PATH}/c-w.yaml`, `project: ${V1_PROJECT}\nrepository: repo-src\ngrant_state: maybe\n`), 'withdrawal-unresolved'],
  ] as const)('%s keeps the pair refused, in either reference order', async (_name, arrange, diagnostic) => {
    for (const extraFirst of [false, true]) {
      const tree = v1Tree(['c-w'], extraFirst);
      putConsent(tree, SRC);
      arrange(tree);
      const result = await runCase(tree);
      expect(result.src).toEqual(['Unknown', diagnostic]);
      expect(result.srcRootReads).toBe(0);
    }
  });

  it('an unresolvable withdrawal reference refuses every pair, naming that reference', async () => {
    const tree = v1Tree(['c-w']);
    putConsent(tree, SRC);
    const result = await runCase(tree);
    expect(result.src).toEqual(['Unknown', 'consent-evidence-unresolved']);
    expect(result.gov).toEqual(['Unknown', 'consent-evidence-unresolved']);
    expect(result.srcRootReads).toBe(0);
  });
});

// syzygy-u2a.6 — coverage is a projection of the closed decisions. Each case
// hands `computeCoverage` an already-closed decision and checks the row
// against literals: the in-force citation on observed and capture-failed,
// the defeating record on a withdrawal, and Task 1's own basis and visible
// contradiction on an unresolved reference and on unverified provenance.
// No record set is passed: coverage cannot re-resolve what it is not given.
const MATRIX_PROJECT = 'prj-cov-matrix' as ProjectId;
const MATRIX_DIGEST_A = `sha256:${'a'.repeat(64)}` as const;
const MATRIX_DIGEST_B = `sha256:${'b'.repeat(64)}` as const;
const MATRIX_DIGEST_C = `sha256:${'c'.repeat(64)}` as const;

function matrixDeclaration(): ProjectDeclaration {
  const read = readDeclaration(
    projectYaml({
      id: MATRIX_PROJECT,
      name: 'Coverage Matrix',
      repositories: [
        { id: 'repo-m-observed', role: 'governance-root', consent: 'consent-m-observed' },
        { id: 'repo-m-failed', role: 'observed-source', consent: 'consent-m-failed' },
        { id: 'repo-m-withdrawn', role: 'observed-source', consent: 'consent-m-withdrawn' },
        { id: 'repo-m-dangling', role: 'observed-source', consent: 'consent-m-dangling' },
        { id: 'repo-m-unverified', role: 'observed-source', consent: 'consent-m-unverified' },
      ],
      consents: [],
    }),
  );
  if (!read.ok) throw new Error('fixture must be valid');
  return read.declaration;
}

const M = (id: string): { id: RepositoryId; consent: string } => ({
  id: `repo-m-${id}` as RepositoryId,
  consent: `consent-m-${id}`,
});

const MATRIX_DECISIONS = [
  admittedDecision(
    MATRIX_PROJECT,
    M('observed'),
    consent({ id: 'consent-m-observed', projectId: MATRIX_PROJECT, repositoryId: M('observed').id }),
    MATRIX_DIGEST_A,
  ),
  admittedDecision(
    MATRIX_PROJECT,
    M('failed'),
    consent({ id: 'consent-m-failed', projectId: MATRIX_PROJECT, repositoryId: M('failed').id }),
    MATRIX_DIGEST_B,
  ),
  refusedDecision(M('withdrawn'), 'withdrawn', {
    diagnosticReference: 'consent-m-withdrawal',
    untrustedRecord: {
      trust: 'untrusted content',
      recordId: 'consent-m-withdrawn',
      artifactDigest: MATRIX_DIGEST_A,
      projectId: MATRIX_PROJECT,
      repositoryId: M('withdrawn').id,
      scope: 'observe',
      attribution: 'owner',
      grantState: 'in-force',
    },
    withdrawal: {
      reference: 'consent-m-withdrawal',
      recordId: 'consent-m-withdrawal',
      artifactDigest: MATRIX_DIGEST_C,
      scope: 'observe',
      attribution: 'owner',
      grantState: 'withdrawn',
      provenance: 'owner-adopted (bootstrap, uncorrelated)',
    },
  }),
  refusedDecision(M('dangling'), 'reference-unresolvable'),
  refusedDecision(M('unverified'), 'correlation-unavailable', {
    untrustedRecord: {
      trust: 'untrusted content',
      recordId: 'consent-m-unverified',
      artifactDigest: MATRIX_DIGEST_B,
      projectId: MATRIX_PROJECT,
      repositoryId: M('unverified').id,
      scope: 'observe',
      attribution: 'claimed-owner',
      grantState: 'in-force',
    },
  }),
];

const MATRIX_OBSERVATIONS: ObservationOutcome[] = [
  { repositoryId: M('observed').id, outcome: 'captured', capturedScope: 'full-tree' },
  { repositoryId: M('failed').id, outcome: 'unreachable' },
  // Outcomes wrongly supplied for refused pairs: discarded, never surfaced.
  { repositoryId: M('dangling').id, outcome: 'captured', capturedScope: 'full-tree' },
  { repositoryId: M('unverified').id, outcome: 'captured', capturedScope: 'full-tree' },
];

describe('CAP1-REQ-011 — coverage rows project the closed consent decisions exactly (syzygy-u2a.6)', () => {
  const rows = (): ReturnType<typeof computeCoverage>['repositories'] =>
    computeCoverage(matrixDeclaration(), MATRIX_DECISIONS, MATRIX_OBSERVATIONS).repositories;

  it('observed and capture-failed rows cite the exact verified in-force record', () => {
    const [observed, failed] = rows();
    expect(observed).toEqual({
      repositoryId: 'repo-m-observed',
      state: 'observed',
      capturedScope: 'full-tree',
      consent: {
        reference: 'consent-m-observed',
        recordId: 'consent-m-observed',
        artifactDigest: `sha256:${'a'.repeat(64)}`,
        scope: 'observe',
        attribution: 'owner',
        grantState: 'in-force',
        provenance: 'owner-adopted (bootstrap, uncorrelated)',
      },
    });
    expect(failed).toEqual({
      repositoryId: 'repo-m-failed',
      state: 'capture-failed',
      label: 'Unknown',
      reason: 'source-uncaptured-or-unreachable',
      consent: {
        reference: 'consent-m-failed',
        recordId: 'consent-m-failed',
        artifactDigest: `sha256:${'b'.repeat(64)}`,
        scope: 'observe',
        attribution: 'owner',
        grantState: 'in-force',
        provenance: 'owner-adopted (bootstrap, uncorrelated)',
      },
    });
  });

  it('a withdrawal row cites the defeating record and keeps the defeated grant visible as untrusted', () => {
    const withdrawn = rows()[2];
    expect(withdrawn).toEqual({
      repositoryId: 'repo-m-withdrawn',
      state: 'unconsented',
      label: 'Unknown',
      reason: 'unconsented-source-or-provider',
      presentation: 'policy',
      resolutionRoute: 'record consent',
      reference: 'consent-m-withdrawn',
      basis: 'withdrawn',
      consent: {
        reference: 'consent-m-withdrawal',
        recordId: 'consent-m-withdrawal',
        artifactDigest: `sha256:${'c'.repeat(64)}`,
        scope: 'observe',
        attribution: 'owner',
        grantState: 'withdrawn',
        provenance: 'owner-adopted (bootstrap, uncorrelated)',
      },
      route: 'owner-adjudication',
      untrustedRecord: {
        trust: 'untrusted content',
        recordId: 'consent-m-withdrawn',
        artifactDigest: `sha256:${'a'.repeat(64)}`,
        projectId: 'prj-cov-matrix',
        repositoryId: 'repo-m-withdrawn',
        scope: 'observe',
        attribution: 'owner',
        grantState: 'in-force',
      },
    });
  });

  it('an unresolved reference keeps reason #6 with its typed diagnostic, never reason #11, and masks nothing', () => {
    const dangling = rows()[3];
    expect(dangling).toEqual({
      repositoryId: 'repo-m-dangling',
      state: 'unconsented',
      label: 'Unknown',
      reason: 'unconsented-source-or-provider',
      presentation: 'policy',
      resolutionRoute: 'record consent',
      reference: 'consent-m-dangling',
      basis: 'no-resolvable-in-force-record',
      diagnostic: 'reference-unresolvable',
      diagnosticReference: 'consent-m-dangling',
      route: 'owner-adjudication',
      untrustedRecord: null,
    });
  });

  it('unverified owner-act provenance keeps the basis, effective Unknown and the unhonored record as a visible contradiction', () => {
    const unverified = rows()[4];
    expect(unverified).toEqual({
      repositoryId: 'repo-m-unverified',
      state: 'unconsented',
      label: 'Unknown',
      reason: 'unconsented-source-or-provider',
      presentation: 'policy',
      resolutionRoute: 'record consent',
      reference: 'consent-m-unverified',
      basis: 'no-resolvable-in-force-record',
      diagnostic: 'correlation-unavailable',
      diagnosticReference: 'consent-m-unverified',
      route: 'owner-adjudication',
      untrustedRecord: {
        trust: 'untrusted content',
        recordId: 'consent-m-unverified',
        artifactDigest: `sha256:${'b'.repeat(64)}`,
        projectId: 'prj-cov-matrix',
        repositoryId: 'repo-m-unverified',
        scope: 'observe',
        attribution: 'claimed-owner',
        grantState: 'in-force',
      },
    });
  });
});
