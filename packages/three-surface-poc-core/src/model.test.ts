import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, afterEach, describe, expect, it } from 'vitest';

import {
  buildPocModel as buildPocModelWithDefaultRunners,
  PocObservationError,
  type PocEntity,
  type PocRelationship,
  walkthroughAcceptance,
} from './model.js';
import { BUTLERS_POC_SEEDS } from './poc-seeds.js';
import type { BodyReadAuthorityEvaluation } from './body-read-authority.js';
import type { OperatorReportedTestArtifactRecord } from './test-artifact-verification.js';
import { walkthroughEvaluationIdentity } from './walkthrough-readiness.js';
import { removeFixtureDirectory } from './test-cleanup.js';
import { frozenCensus } from './test-frozen.js';

const cleanups: string[] = [];

afterEach(() => {
  for (const directory of cleanups.splice(0)) {
    removeFixtureDirectory(directory);
  }
});

function butlersFixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'syzygy-poc-butlers-'));
  cleanups.push(root);
  const files: Readonly<Record<string, string>> = {
    'docs/superpowers/specs/2026-08-24-whatsapp-identity-reconciliation-design.md':
      '# WhatsApp identity design\nStatus: Approved for implementation\n',
    'openspec/changes/repair-whatsapp-identity-reconciliation/proposal.md':
      '# Repair WhatsApp identity reconciliation\n- Sign-off: owner approved the design and end-to-end implementation on 2026-08-24.\nowner-approved-intent-marker\n',
    'openspec/changes/repair-whatsapp-identity-reconciliation/specs/switchboard-identity/spec.md':
      '# switchboard identity\nREQ-switchboard-identity-001\nwhatsapp_user_client -> whatsapp_jid\n',
    'src/butlers/identity.py': 'def canonical_identity():\n    return "private-source-marker"\n',
    'tests/core/test_identity.py': 'def test_identity():\n    assert "private-test-marker"\n',
  };
  for (const [relativePath, contents] of Object.entries(files)) {
    const absolutePath = join(root, relativePath);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, contents, 'utf8');
  }
  return root;
}

/** What `bd` answers from a directory with no Beads project; the model
 * reads every failure of the work-item query the same way. */
function noBeadsProject(): string {
  throw new Error('fixture: no beads project found');
}

/**
 * The model under test with the work-item query answered in-process unless
 * a test supplies its own (syzygy-jsyi). The default runner spawns `bd`,
 * 0.3-0.6 s a call under load, once or twice per build in a file of thirty
 * builds; one test below keeps the spawned default and checks it yields the
 * same model.
 */
function buildPocModel(input: Parameters<typeof buildPocModelWithDefaultRunners>[0]): ReturnType<typeof buildPocModelWithDefaultRunners> {
  return buildPocModelWithDefaultRunners({ runWorkItemQuery: noBeadsProject, ...input });
}

function byId<T extends PocEntity | PocRelationship>(items: readonly T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

function git(root: string, args: readonly string[]): string {
  return execFileSync('git', ['-C', root, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

const WORKER_CHANGE_SOURCE_PATH = 'src/butlers/connectors/whatsapp_user_client.py';
const WORKER_CHANGE_TEST_PATH = 'tests/connectors/test_whatsapp_user_client.py';

interface ButlersGitFixture {
  readonly repoRoot: string;
  readonly changedCommit: string;
  readonly changedCommitAuthoredAt: string;
}

let butlersGitTemplate: ButlersGitFixture | undefined;

/** The same five required artifacts as {@link butlersFixture}, but as a
 * real committed git repository with a simulated fetched `origin/main`,
 * plus the bounded worker-change seam files — everything the test-artifact
 * verification wiring needs to observe a real changed-or-merged commit.
 * Each call copies one repository committed once per file (syzygy-jsyi):
 * committing it took twelve git processes. */
function butlersGitFixture(): ButlersGitFixture {
  butlersGitTemplate ??= committedButlersGitFixture();
  const root = mkdtempSync(join(tmpdir(), 'syzygy-poc-butlers-git-'));
  cleanups.push(root);
  cpSync(butlersGitTemplate.repoRoot, root, { recursive: true });
  return { ...butlersGitTemplate, repoRoot: root };
}

afterAll(() => {
  if (butlersGitTemplate !== undefined) removeFixtureDirectory(butlersGitTemplate.repoRoot);
  butlersGitTemplate = undefined;
});

function committedButlersGitFixture(): ButlersGitFixture {
  const root = mkdtempSync(join(tmpdir(), 'syzygy-poc-butlers-git-template-'));
  const files: Readonly<Record<string, string>> = {
    'docs/superpowers/specs/2026-08-24-whatsapp-identity-reconciliation-design.md':
      '# WhatsApp identity design\nStatus: Approved for implementation\n',
    'openspec/changes/repair-whatsapp-identity-reconciliation/proposal.md':
      '# Repair WhatsApp identity reconciliation\n- Sign-off: owner approved the design and end-to-end implementation on 2026-08-24.\n',
    'openspec/changes/repair-whatsapp-identity-reconciliation/specs/switchboard-identity/spec.md':
      '# switchboard identity\nREQ-switchboard-identity-001\nwhatsapp_user_client -> whatsapp_jid\n',
    'src/butlers/identity.py': 'def canonical_identity():\n    return "id"\n',
    'tests/core/test_identity.py': 'def test_identity():\n    assert True\n',
    [WORKER_CHANGE_SOURCE_PATH]: 'x = 1\n',
    [WORKER_CHANGE_TEST_PATH]: 'def test_normalization(): pass\n',
  };
  for (const [relativePath, contents] of Object.entries(files)) {
    const absolutePath = join(root, relativePath);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, contents, 'utf8');
  }
  git(root, ['init', '-q', '-b', 'main']);
  git(root, ['config', 'gc.auto', '0']);
  git(root, ['config', 'maintenance.auto', 'false']);
  git(root, ['config', 'user.email', 'poc-test@example.invalid']);
  git(root, ['config', 'user.name', 'POC Test']);
  git(root, ['add', '-A']);
  git(root, ['commit', '-qm', 'base']);
  writeFileSync(join(root, WORKER_CHANGE_SOURCE_PATH), 'x = 2\n', 'utf8');
  git(root, ['add', '-A']);
  git(root, ['commit', '-qm', 'fix(whatsapp): normalize single-event sender [bu-artifact-1]']);
  const changedCommit = git(root, ['rev-parse', 'HEAD']);
  const changedCommitAuthoredAt = git(root, ['log', '-1', '--format=%aI', changedCommit]);
  git(root, ['update-ref', 'refs/remotes/origin/main', changedCommit]);
  git(root, ['symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/main']);
  return { repoRoot: root, changedCommit, changedCommitAuthoredAt };
}

const WORK_ITEM_ROWS = [
  {
    revision: 'dolt-rev-artifact',
    id: 'bu-artifact-1',
    title: 'Materialized work item',
    status: 'in_progress',
    issue_type: 'task',
    priority: 2,
    created_at: '2026-08-30T00:00:00Z',
    updated_at: '2026-08-30T00:00:00Z',
    closed_at: null,
  },
];

function runWorkItemQueryFixture(_repoRoot: string, sql: string): string {
  return sql.includes('WHERE id LIKE')
    ? JSON.stringify(WORK_ITEM_ROWS)
    : JSON.stringify([{ revision: 'dolt-rev-artifact' }]);
}

const MATERIALIZATION_RECORD_FIXTURE = {
  beadId: 'bu-artifact-1',
  externalRef: 'syzygy-poc:work:whatsapp-single-event-normalization',
  targetRepoRoot: '',
  createdAt: '2026-08-30T00:00:00Z',
  doltRevisionAtCreation: 'dolt-rev-artifact',
  attribution: 'test-actor',
} as const;

function passingTestArtifactRecord(
  commit: string,
  ingestedAt: string,
  overrides: Partial<OperatorReportedTestArtifactRecord> = {},
): OperatorReportedTestArtifactRecord {
  return {
    provenance: 'operator-reported',
    command: ['python3', '-m', 'pytest', WORKER_CHANGE_TEST_PATH, '-q'],
    exitCode: 0,
    ingestedAt,
    repositoryCommit: commit,
    scope: WORKER_CHANGE_TEST_PATH,
    digest: 'sha256:' + '1'.repeat(64),
    summary: '3 passed, 0 failed, 0 errored, 0 skipped in 0.42s',
    ...overrides,
  };
}

describe('three-surface Butlers POC model', () => {
  it('reads a directory with no Beads project through the spawned default runner exactly as through the in-process one', () => {
    const input = {
      seeds: BUTLERS_POC_SEEDS,
      repoRoot: butlersFixture(),
      repositoryRevision: 'c13894238989d3bebb24094730992970b31fe546',
      observerRevision: 'bfdb7963e4ff5628d0d1ec0f59e831d7e8209abe',
      evaluation: { snapshot: 'butlers@c1389423', asOf: '2026-08-29T12:00:00Z' },
    } as const;
    const spawned = buildPocModelWithDefaultRunners(input);
    expect(JSON.stringify(spawned)).toContain('the Beads Dolt database was unreachable or unreadable during work-item observation');
    expect(buildPocModel(input)).toEqual(spawned);
  });

  it('builds one deterministic provenance-backed graph with honest Unknowns', () => {
    const repoRoot = butlersFixture();
    const input = {
      seeds: BUTLERS_POC_SEEDS,
      repoRoot,
      repositoryRevision: 'c13894238989d3bebb24094730992970b31fe546',
      observerRevision: 'bfdb7963e4ff5628d0d1ec0f59e831d7e8209abe',
      evaluation: {
        snapshot: 'butlers@c1389423',
        asOf: '2026-08-29T12:00:00Z',
      },
    } as const;

    const first = buildPocModel(input);
    const second = buildPocModel(input);

    expect(second).toEqual(first);
    expect(first.evaluation.snapshot).toMatch(
      /^repository:butlers-configured-poc@c1389423\|inputs:sha256:[0-9a-f]{64}$/,
    );
    // C3-5: both halves of the composite are structured fields of their
    // own — a machine consumer never splits the display string.
    expect(first.evaluation.snapshotLabel).toBe('repository:butlers-configured-poc@c1389423');
    expect(first.evaluation.inputsDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(first.evaluation.snapshot).toBe(
      `${first.evaluation.snapshotLabel}|inputs:sha256:${first.evaluation.inputsDigest}`,
    );
    expect(first.project.name).toBe('Butlers');
    expect(first.capabilityId).toBe('capability:whatsapp-transport-identity');
    expect(first.surfaces.map((surface) => surface.id)).toEqual([
      'polaris',
      'trajectory',
      'orrery',
    ]);
    expect(first.surfaces.map((surface) => surface.state)).toEqual([
      'desired', 'execution', 'observed',
    ]);

    const entities = byId(first.entities);
    expect(entities.get('capability:whatsapp-transport-identity')?.provenance.map((provenance) => provenance.source)).toEqual([
      'docs/superpowers/specs/2026-08-24-whatsapp-identity-reconciliation-design.md',
      'openspec/changes/repair-whatsapp-identity-reconciliation/specs/switchboard-identity/spec.md',
    ]);
    expect(entities.get('intent:req-switchboard-identity-001')?.epistemic.label).toBe(
      'Observed',
    );
    expect(
      entities
        .get('intent:req-switchboard-identity-001')
        ?.provenance.map((provenance) => provenance.source),
    ).toEqual([
      'docs/superpowers/specs/2026-08-24-whatsapp-identity-reconciliation-design.md',
      'openspec/changes/repair-whatsapp-identity-reconciliation/proposal.md',
      'openspec/changes/repair-whatsapp-identity-reconciliation/specs/switchboard-identity/spec.md',
    ]);
    expect(entities.get('work:whatsapp-single-event-normalization')?.epistemic).toEqual({
      label: 'Unknown',
      reason: 'No POC work item has been materialized.',
      closedReason: 'missing-evidence',
      resolutionRoutes: [{ reason: 'missing-evidence', route: 'Produce or capture evidence', actor: 'operator', verb: 'capture', target: 'evaluation' }],
    });
    expect(entities.get('evidence:focused-pytest')?.epistemic).toEqual({
      label: 'Unknown',
      reason: 'No test artifact has been captured for this evaluation.',
      closedReason: 'missing-evidence',
      resolutionRoutes: [{ reason: 'missing-evidence', route: 'Produce or capture evidence', actor: 'operator', verb: 'capture', target: 'evaluation' }],
    });
    expect(entities.get('runtime:live-satisfaction')?.epistemic).toEqual({
      label: 'Unknown',
      reason: 'No current runtime observation was supplied.',
      closedReason: 'missing-evidence',
      resolutionRoutes: [{ reason: 'missing-evidence', route: 'Produce or capture evidence', actor: 'operator', verb: 'capture', target: 'evaluation' }],
    });
    expect(entities.get('region:unmapped-code')?.epistemic.label).toBe('Unknown');

    // M4 slice 1 (P-71 Q1): the nine routeless disclosures, each with the
    // design's closed reason; only intent-to-work carries an action route.
    const closed = (item: { readonly epistemic: { readonly label: string } } | undefined): unknown =>
      item?.epistemic.label === 'Unknown' && 'closedReason' in item.epistemic ? [item.epistemic.closedReason, 'actionRoute' in item.epistemic ? item.epistemic.actionRoute : null] : null;
    const firstRelationships = byId(first.relationships);
    expect([
      'work:whatsapp-single-event-normalization', 'evidence:focused-pytest', 'runtime:live-satisfaction', 'region:unmapped-code',
    ].map((id) => closed(entities.get(id)))).toEqual([
      ['missing-evidence', null], ['missing-evidence', null], ['missing-evidence', null], ['mapping-coverage-absent', null],
    ]);
    expect([
      'relationship:intent-to-work', 'relationship:work-to-code', 'relationship:code-to-evidence', 'relationship:code-to-runtime', 'relationship:capability-to-unmapped-region',
    ].map((id) => closed(firstRelationships.get(id)))).toEqual([
      ['missing-evidence', { surface: 'trajectory', anchor: 'materialize-panel' }], ['missing-evidence', null], ['missing-evidence', null], ['missing-evidence', null], ['mapping-coverage-absent', null],
    ]);

    // C3-1: the code/test entities carry a sentence naming the path, not a
    // bare path constant for the renderer to show without context.
    expect(entities.get('code:identity-resolution')?.detail).toBe(
      'The manually mapped code file at src/butlers/identity.py implements sender-identity resolution.',
    );
    expect(entities.get('test:identity-regression-definition')?.detail).toBe(
      'The manually mapped test file at tests/core/test_identity.py defines the identity regression check.',
    );

    const relationships = byId(first.relationships);
    expect(relationships.get('relationship:intent-to-work')?.epistemic.label).toBe('Unknown');
    expect(relationships.get('relationship:code-to-evidence')?.epistemic.label).toBe(
      'Unknown',
    );
    expect(relationships.get('relationship:code-to-runtime')?.epistemic.label).toBe(
      'Unknown',
    );

    const positiveClaims = [...first.entities, ...first.relationships].filter(
      (item) => item.epistemic.label === 'Observed',
    );
    expect(positiveClaims.length).toBeGreaterThan(0);
    expect(positiveClaims.every((item) => item.provenance.length > 0)).toBe(true);

    const serialized = JSON.stringify(first);
    expect(serialized).not.toContain('private-source-marker');
    expect(serialized).not.toContain('private-test-marker');
    expect(serialized).not.toContain('owner-approved-intent-marker');

    writeFileSync(
      join(repoRoot, 'src/butlers/identity.py'),
      'def canonical_identity():\n    return "changed-working-tree-bytes"\n',
      'utf8',
    );
    const changedBytes = buildPocModel(input);
    expect(changedBytes.evaluation.snapshot).not.toBe(first.evaluation.snapshot);
  });

  // Expected values are SHA-256 of the five fixture files' bytes above, taken with hashlib and agreeing with `sha256sum` over the same
  // bytes (docs/evidence/syzygy-bpyt-6-13/derive-literals.py), never read back from the model (review R-GP-IMPL-SUPPORT-LEAF-1 N2).
  it('records each required artifact under the SHA-256 of its own bytes', () => {
    const model = buildPocModel({
      seeds: BUTLERS_POC_SEEDS,
      repoRoot: butlersFixture(),
      repositoryRevision: 'c13894238989d3bebb24094730992970b31fe546',
      observerRevision: 'bfdb7963e4ff5628d0d1ec0f59e831d7e8209abe',
      evaluation: { snapshot: 'butlers@c1389423', asOf: '2026-08-29T12:00:00Z' },
    });
    const digestsBySource = new Map<string, Set<string>>();
    for (const entity of model.entities) {
      for (const provenance of entity.provenance) {
        if (provenance.kind === 'repository-file') digestsBySource.set(provenance.source, (digestsBySource.get(provenance.source) ?? new Set<string>()).add(provenance.digest ?? '(no digest)'));
      }
    }
    expect(Object.fromEntries([...digestsBySource].map(([source, digests]) => [source, [...digests]]))).toEqual({
      'docs/superpowers/specs/2026-08-24-whatsapp-identity-reconciliation-design.md': ['sha256:2479e75d520a16460f9e3e1d01e16211d93d9e5d7f05a1f79792466bd7159c48'],
      'openspec/changes/repair-whatsapp-identity-reconciliation/proposal.md': ['sha256:964230e52c4cba3cc029e7f984d5230a1c3502ad5ae5a421d7126e4ef3c7aaea'],
      'openspec/changes/repair-whatsapp-identity-reconciliation/specs/switchboard-identity/spec.md': ['sha256:6eb3621053cab988df848b46e269a9e6dbd7779703a19404d6eb5a8762dd8ce9'],
      'src/butlers/identity.py': ['sha256:c17f6c25cbb53eba69017e09605aa474a8ce296313d13aceee622e753d950981'],
      'tests/core/test_identity.py': ['sha256:2c40033f352b040a0193ee8b2856e93a63cf0ae1c057a84a75f9887de42bc5e9'],
    });
  });

  it('hands out the resource headroom block frozen all the way down', () => {
    const model = buildPocModel({
      seeds: BUTLERS_POC_SEEDS,
      repoRoot: butlersFixture(),
      repositoryRevision: 'c13894238989d3bebb24094730992970b31fe546',
      observerRevision: 'bfdb7963e4ff5628d0d1ec0f59e831d7e8209abe',
      evaluation: { snapshot: 'butlers@c1389423', asOf: '2026-08-29T12:00:00Z' },
    });
    const { visited, unfrozen } = frozenCensus(model.resourceHeadroom);
    expect(unfrozen).toEqual([]);
    // The block, its entries list and one entry per declared limit (seven) at least; a census of nothing would also report no path.
    expect(visited).toBeGreaterThanOrEqual(9);
  });

  it('carries the project shape on the one model: not-evaluated without an authority evaluation, observed with an admitting one (PWB 2.7)', () => {
    const repoRoot = butlersFixture();
    const baseInput = {
      seeds: BUTLERS_POC_SEEDS,
      repoRoot,
      repositoryRevision: 'c13894238989d3bebb24094730992970b31fe546',
      observerRevision: 'bfdb7963e4ff5628d0d1ec0f59e831d7e8209abe',
      evaluation: { snapshot: 'butlers@c1389423', asOf: '2026-09-04T09:00:00.000Z' },
    } as const;

    const unevaluated = buildPocModel({ ...baseInput, projectShapeDetail: 'no governance tree in this test' });
    expect(unevaluated.projectShape.kind).toBe('not-evaluated');
    expect(unevaluated.projectShape.authority).toBeUndefined();
    expect(unevaluated.projectShape.claim.epistemic).toEqual({
      label: 'Unknown',
      reasons: { primary: 'unconsented-source-or-provider', secondary: [] },
      freshness: 'fresh',
    });
    if (unevaluated.projectShape.kind === 'not-evaluated') expect(unevaluated.projectShape.detail).toBe('no governance tree in this test');

    // A non-admitting evaluation reaches the gate and stops: no Git command.
    const gitCalls: string[][] = [];
    const rejecting: BodyReadAuthorityEvaluation = {
      evaluationId: 'evaluation:test-rejecting',
      evaluationInstant: '2026-09-04T00:00:00Z',
      admits: false,
      authorizationMode: 'rejected',
      consent: { kind: 'absent', what: 'artifact-missing', artifactDigest: undefined },
      policy: { kind: 'absent', what: 'artifact-missing', artifactDigest: undefined },
      registry: { kind: 'absent', what: 'artifact-missing', artifactDigest: undefined },
      contradiction: { clause: 'RFC3-16(a)', definedTerm: 'authorization-bearing governance artifact', statement: 'No effective act.', failing: [] },
    };
    const gated = buildPocModel({
      ...baseInput,
      projectShape: { authority: rejecting, runGit: (args) => { gitCalls.push([...args]); throw new Error('must not run'); } },
    });
    expect(gated.projectShape.kind).toBe('not-admitted');
    expect(gitCalls).toEqual([]);

    // An admitting evaluation observes through the injected runner; the
    // fixture has no `about/` tree, so the population is the root index
    // alone, named-but-absent, and the shape is honestly Unknown.
    const admitting: BodyReadAuthorityEvaluation = {
      evaluationId: 'evaluation:test-admitting',
      evaluationInstant: '2026-09-04T00:00:00Z',
      admits: true,
      authorizationMode: 'owner-trusted-bootstrap',
      consent: { kind: 'valid', provenance: 'state-1', actIdentity: 'act:consent', artifactDigest: 'sha256:c'.padEnd(71, '0'), actInstant: '2026-09-02T00:00:00Z' },
      policy: { kind: 'valid', provenance: 'state-1', actIdentity: 'act:policy', artifactDigest: 'sha256:p'.padEnd(71, '0'), actInstant: '2026-09-02T00:00:00Z' },
      registry: { kind: 'valid', provenance: 'state-1', actIdentity: 'act:registry', artifactDigest: 'sha256:r'.padEnd(71, '0'), actInstant: '2026-09-02T00:00:00Z' },
      contradiction: undefined,
    };
    const encoder = new TextEncoder();
    const runGit = (args: readonly string[]): Uint8Array => {
      switch (args[0]) {
        case 'rev-parse':
          return encoder.encode(`${'5'.repeat(40)}\n`);
        case 'show':
          return encoder.encode('2026-08-15T10:00:00+00:00\n');
        case 'ls-tree':
          return encoder.encode('');
        default:
          throw new Error(`unexpected git command ${args.join(' ')}`);
      }
    };
    const observed = buildPocModel({ ...baseInput, projectShape: { authority: admitting, runGit } });
    expect(observed.projectShape.kind).toBe('observed');
    // The walkthrough-judgment seam is handed this very evaluation's identity.
    const seen: string[] = [];
    buildPocModel({
      ...baseInput,
      projectShape: { authority: admitting, runGit },
      acceptance: walkthroughAcceptance({
        judgment: (binding) => {
          seen.push(binding.evaluationIdentity);
          throw new Error('stop here');
        },
        traversal: { polarisRoutes: ['/polaris'], isExactSourceRoute: () => false },
      }),
    });
    expect(seen).toEqual([walkthroughEvaluationIdentity(observed.projectShape)]);
    expect(seen[0]).toMatch(/^pwb-eval-[0-9a-f]{24}$/);
    if (observed.projectShape.kind === 'observed') {
      expect(observed.projectShape.identity.repositoryId).toBe('repository:butlers-configured-poc');
      expect(observed.projectShape.identity.revision).toBe('5'.repeat(40));
      expect(observed.projectShape.identity.capturedAt).toBe('2026-09-04T09:00:00.000Z');
      expect(observed.projectShape.sources.map((s) => [s.path, s.anchor.kind])).toEqual([['about/README.md', 'missing-at-revision']]);
      expect(observed.projectShape.claim.epistemic.label).toBe('Unknown');
    }

    // The machine answer is the model verbatim, so the shape rides along.
    const wire = JSON.parse(JSON.stringify(observed)) as { projectShape: { kind: string } };
    expect(wire.projectShape.kind).toBe('observed');
    expect(JSON.stringify(observed)).not.toContain('"text"');

    // The shape does not enter the inputs digest of the unrelated proving
    // slice (its own identity carries manifest and observation digests).
    expect(observed.evaluation.inputsDigest).toBe(unevaluated.evaluation.inputsDigest);
  });

  it('resolves walkthrough-judgment inputs through a callback bound to the shape\u2019s own evaluation identity, and fails closed when the loader throws', () => {
    const repoRoot = butlersFixture();
    const baseInput = {
      seeds: BUTLERS_POC_SEEDS,
      repoRoot,
      repositoryRevision: 'c13894238989d3bebb24094730992970b31fe546',
      observerRevision: 'bfdb7963e4ff5628d0d1ec0f59e831d7e8209abe',
      evaluation: { snapshot: 'butlers@c1389423', asOf: '2026-09-04T09:00:00.000Z' },
    } as const;
    const seen: string[] = [];
    const throwing = buildPocModel({
      ...baseInput,
      acceptance: walkthroughAcceptance({
        judgment: (binding) => {
          seen.push(binding.evaluationIdentity);
          throw new Error('governance tree unreadable');
        },
        traversal: { polarisRoutes: ['/polaris'], isExactSourceRoute: () => false },
      }),
    });
    // No shape was evaluated, so the identity names that state rather than
    // an evaluation; the loader saw exactly that identity.
    expect(seen).toEqual(['pwb-unobserved-not-evaluated']);
    expect(throwing.walkthroughJudgment.kind).toBe('not-evaluated');
    expect(throwing.walkthroughJudgment.kind === 'not-evaluated' && throwing.walkthroughJudgment.detail).toContain('governance tree unreadable');
    expect(throwing.walkthroughReadiness.kind).toBe('not-evaluated');
    expect(throwing.walkthroughReadiness.kind === 'not-evaluated' && throwing.walkthroughReadiness.detail).toContain('governance tree unreadable');
    expect(JSON.stringify(throwing.walkthroughJudgment)).not.toMatch(/"verdict"|"met"/);
  });

  it('shows the materialized work item Observed only once the recorded Bead is confirmed present (AC4)', () => {
    const repoRoot = butlersFixture();
    const baseInput = {
      seeds: BUTLERS_POC_SEEDS,
      repoRoot,
      repositoryRevision: 'c13894238989d3bebb24094730992970b31fe546',
      observerRevision: 'bfdb7963e4ff5628d0d1ec0f59e831d7e8209abe',
      evaluation: { snapshot: 'butlers@c1389423', asOf: '2026-08-29T12:00:00Z' },
    } as const;
    const materializationRecord = {
      beadId: 'bu-materialized1',
      externalRef: 'syzygy-poc:work:whatsapp-single-event-normalization',
      targetRepoRoot: repoRoot,
      createdAt: '2026-08-30T00:00:00Z',
      doltRevisionAtCreation: 'dolt-rev-1',
      attribution: 'test-actor',
    } as const;

    const confirmedRows = [
      {
        revision: 'dolt-rev-2',
        id: 'bu-materialized1',
        title: 'Single-event WhatsApp sender normalization (Syzygy POC materialization)',
        status: 'open',
        issue_type: 'task',
        priority: 2,
        created_at: '2026-08-30T00:00:00Z',
        updated_at: '2026-08-30T00:00:00Z',
        closed_at: null,
      },
    ];

    const confirmed = buildPocModel({
      ...baseInput,
      materializationRecord,
      runWorkItemQuery: (_repoRoot, sql) =>
        sql.includes('WHERE id LIKE') ? JSON.stringify(confirmedRows) : JSON.stringify([{ revision: 'dolt-rev-2' }]),
    });
    const confirmedEntities = byId(confirmed.entities);
    expect(confirmedEntities.get('work:whatsapp-single-event-normalization')?.epistemic.label).toBe(
      'Observed',
    );
    expect(
      confirmedEntities.get('work:whatsapp-single-event-normalization')?.detail,
    ).toContain('bu-materialized1');
    expect(
      confirmedEntities.get('work:whatsapp-single-event-normalization')?.provenance,
    ).toHaveLength(1);
    const confirmedRelationships = byId(confirmed.relationships);
    expect(confirmedRelationships.get('relationship:intent-to-work')?.epistemic.label).toBe(
      'Observed',
    );
    // the untouched follow-on relationship stays Unknown — this bead
    // materializes the Bead, not a code/test change
    expect(confirmedRelationships.get('relationship:work-to-code')?.epistemic.label).toBe(
      'Unknown',
    );
    expect(confirmed.dispatch).toMatchObject({
      dispatchState: 'dispatched',
      beadId: 'bu-materialized1',
      createdAt: '2026-08-30T00:00:00Z',
    });
    expect(confirmed.dispatch && Object.isFrozen(confirmed.dispatch)).toBe(true);
    expect(confirmed.dispatch && Object.isFrozen(confirmed.dispatch.packet)).toBe(true);

    // a record naming a Bead that is NOT present in the live-observed
    // work items must never be rendered as Observed (VIS-2, fail-closed)
    const stale = buildPocModel({
      ...baseInput,
      materializationRecord,
      runWorkItemQuery: (_repoRoot, sql) => (sql.includes('WHERE id LIKE') ? JSON.stringify([]) : JSON.stringify([{ revision: 'dolt-rev-3' }])),
    });
    const staleEntities = byId(stale.entities);
    expect(staleEntities.get('work:whatsapp-single-event-normalization')?.epistemic.label).toBe(
      'Unknown',
    );
    expect(stale.dispatch?.dispatchState).toBe('undispatched');

    // no record at all: unchanged from the pre-existing default behaviour
    const none = buildPocModel(baseInput);
    const noneEntities = byId(none.entities);
    expect(noneEntities.get('work:whatsapp-single-event-normalization')?.epistemic).toEqual({
      label: 'Unknown',
      reason: 'No POC work item has been materialized.',
      closedReason: 'missing-evidence',
      resolutionRoutes: [{ reason: 'missing-evidence', route: 'Produce or capture evidence', actor: 'operator', verb: 'capture', target: 'evaluation' }],
    });
    expect(none.dispatch?.dispatchState).toBe('undispatched');

    const alternate = buildPocModel({
      ...baseInput,
      seeds: {
        ...BUTLERS_POC_SEEDS,
        project: { ...BUTLERS_POC_SEEDS.project, repositoryId: 'repository:alternate' },
      },
    });
    expect(alternate.dispatch).toBeNull();
  });

  it('words the intent-to-work basis by the record origin: created, reused, or the honest legacy both (PRF-4)', () => {
    const repoRoot = butlersFixture();
    const baseInput = {
      seeds: BUTLERS_POC_SEEDS,
      repoRoot,
      repositoryRevision: 'c13894238989d3bebb24094730992970b31fe546',
      observerRevision: 'bfdb7963e4ff5628d0d1ec0f59e831d7e8209abe',
      evaluation: { snapshot: 'butlers@c1389423', asOf: '2026-08-29T12:00:00Z' },
    } as const;
    const record = {
      beadId: 'bu-materialized1',
      externalRef: 'syzygy-poc:work:whatsapp-single-event-normalization',
      targetRepoRoot: repoRoot,
      createdAt: '2026-08-30T00:00:00Z',
      doltRevisionAtCreation: 'dolt-rev-1',
      attribution: 'test-actor',
    } as const;
    const rows = [
      {
        revision: 'dolt-rev-2',
        id: 'bu-materialized1',
        title: 'Single-event WhatsApp sender normalization (Syzygy POC materialization)',
        status: 'open',
        issue_type: 'task',
        priority: 2,
        created_at: '2026-08-30T00:00:00Z',
        updated_at: '2026-08-30T00:00:00Z',
        closed_at: null,
      },
    ];
    const runWorkItemQuery = (_repoRoot: string, sql: string) =>
      sql.includes('WHERE id LIKE') ? JSON.stringify(rows) : JSON.stringify([{ revision: 'dolt-rev-2' }]);
    const basisFor = (materializationRecord: typeof record & { origin?: 'created' | 'reused' }) => {
      const model = buildPocModel({ ...baseInput, materializationRecord, runWorkItemQuery });
      const epistemic = byId(model.relationships).get('relationship:intent-to-work')?.epistemic;
      if (epistemic?.label !== 'Observed') throw new Error('expected Observed');
      return epistemic.basis;
    };

    expect(basisFor({ ...record, origin: 'created' })).toBe(
      'The human-triggered materialization step created Beads item bu-materialized1.',
    );
    expect(basisFor({ ...record, origin: 'reused' })).toBe(
      'The human-triggered materialization step reused the existing Beads item bu-materialized1.',
    );
    // a record written before the origin field existed must not guess
    expect(basisFor(record)).toBe(
      'The human-triggered materialization step created or reused Beads item bu-materialized1.',
    );
  });

  it('fails closed when a required mapped artifact is absent', () => {
    const repoRoot = butlersFixture();
    rmSync(join(repoRoot, 'tests/core/test_identity.py'));

    expect(() =>
      buildPocModel({
        seeds: BUTLERS_POC_SEEDS,
        repoRoot,
        repositoryRevision: 'c13894238989d3bebb24094730992970b31fe546',
        observerRevision: 'bfdb7963e4ff5628d0d1ec0f59e831d7e8209abe',
        evaluation: {
          snapshot: 'butlers@c1389423',
          asOf: '2026-08-29T12:00:00Z',
        },
      }),
    ).toThrowError(
      expect.objectContaining<Partial<PocObservationError>>({
        kind: 'required-artifact-missing',
        artifactPath: 'tests/core/test_identity.py',
      }),
    );
  });

  it('fails closed when the selected intent no longer carries its approval contract', () => {
    const mutations = [
      {
        path: 'docs/superpowers/specs/2026-08-24-whatsapp-identity-reconciliation-design.md',
        contents: '# WhatsApp identity design\nStatus: Draft\n',
      },
      {
        path: 'openspec/changes/repair-whatsapp-identity-reconciliation/proposal.md',
        contents: '# proposal without owner sign-off\n',
      },
      {
        path: 'openspec/changes/repair-whatsapp-identity-reconciliation/specs/switchboard-identity/spec.md',
        contents: '# unrelated requirement\n',
      },
    ] as const;

    for (const mutation of mutations) {
      const repoRoot = butlersFixture();
      writeFileSync(join(repoRoot, mutation.path), mutation.contents, 'utf8');
      expect(() =>
        buildPocModel({
          seeds: BUTLERS_POC_SEEDS,
          repoRoot,
          repositoryRevision: 'c13894238989d3bebb24094730992970b31fe546',
          observerRevision: 'bfdb7963e4ff5628d0d1ec0f59e831d7e8209abe',
          evaluation: {
            snapshot: 'butlers@c1389423',
            asOf: '2026-08-29T12:00:00Z',
          },
        }),
      ).toThrowError(
        expect.objectContaining({
          kind: 'required-artifact-semantic-mismatch',
          artifactPath: mutation.path,
        }),
      );
    }
  });

  it('caps an ingested, binding operator-reported artifact at report-fact and never shows Verified (AC3/AC4, syzygy-0r9, syzygy-4mbu)', () => {
    const { repoRoot, changedCommit, changedCommitAuthoredAt } = butlersGitFixture();
    const capturedAt = new Date(Date.parse(changedCommitAuthoredAt) + 60 * 60 * 1000).toISOString();
    const evaluationAsOf = new Date(Date.parse(capturedAt) + 60 * 60 * 1000).toISOString();
    const baseInput = {
      seeds: BUTLERS_POC_SEEDS,
      repoRoot,
      repositoryRevision: changedCommit,
      observerRevision: changedCommit,
      evaluation: { snapshot: 'butlers@artifact', asOf: evaluationAsOf },
      materializationRecord: { ...MATERIALIZATION_RECORD_FIXTURE, targetRepoRoot: repoRoot },
      runWorkItemQuery: runWorkItemQueryFixture,
    } as const;

    const withoutArtifact = buildPocModel(baseInput);
    expect(withoutArtifact.workerChange.kind).toBe('observed');
    if (withoutArtifact.workerChange.kind !== 'observed') throw new Error('unreachable');
    expect(withoutArtifact.workerChange.state).toBe('changed-or-merged');
    expect(withoutArtifact.testArtifactVerification.kind).toBe('unknown');

    // The identity-resolution entity graph (a different capability, a
    // different code file) must never be perturbed by this seam's
    // verification — it stays Unknown throughout this test regardless of
    // whether the worker-change seam's own evidence is verified.
    const identityEntities = byId(withoutArtifact.entities);
    expect(identityEntities.get('evidence:focused-pytest')?.epistemic.label).toBe('Unknown');
    const identityGraph = JSON.stringify({ entities: withoutArtifact.entities, relationships: withoutArtifact.relationships });
    expect(identityGraph).not.toContain(BUTLERS_POC_SEEDS.workerChangeSeam.sourcePath);
    expect(identityGraph).not.toContain(BUTLERS_POC_SEEDS.workerChangeSeam.testPath);

    const verified = buildPocModel({
      ...baseInput,
      testArtifactRecord: passingTestArtifactRecord(changedCommit, capturedAt),
    });
    expect(verified.testArtifactVerification.kind).toBe('reported');
    if (verified.testArtifactVerification.kind !== 'reported') throw new Error('unreachable');
    expect(verified.testArtifactVerification.tier).toBe('report-fact');
    expect(verified.testArtifactVerification.record.repositoryCommit).toBe(changedCommit);
    // still untouched — this is the honest boundary between the two
    // capabilities sharing this bounded POC model.
    expect(byId(verified.entities).get('evidence:focused-pytest')?.epistemic.label).toBe('Unknown');

    // The serialized model must never leak raw test body content — only
    // the safe numeric summary and commit (AC5).
    const serialized = JSON.stringify(verified);
    expect(serialized).not.toContain('Traceback');

    // Mismatch/failure case (AC4, AC6): a passing artifact bound to a
    // different commit must never render Verified.
    const mismatched = buildPocModel({
      ...baseInput,
      testArtifactRecord: passingTestArtifactRecord('a-different-commit-entirely', capturedAt),
    });
    expect(mismatched.testArtifactVerification.kind).toBe('unknown');

    // A failing exit status must never be shown Verified even when the
    // commit and scope both match (AC4).
    const failed = buildPocModel({
      ...baseInput,
      testArtifactRecord: passingTestArtifactRecord(changedCommit, capturedAt, { exitCode: 1 }),
    });
    expect(failed.testArtifactVerification.kind).toBe('unknown');
  });

  it('owns returned surface membership arrays and keeps the exported seed graph isolated', () => {
    const repoRoot = butlersFixture();
    const input = {
      seeds: BUTLERS_POC_SEEDS,
      repoRoot,
      repositoryRevision: 'c13894238989d3bebb24094730992970b31fe546',
      observerRevision: 'bfdb7963e4ff5628d0d1ec0f59e831d7e8209abe',
      evaluation: { snapshot: 'butlers@ownership', asOf: '2026-09-22T00:00:00Z' },
    } as const;
    const first = buildPocModel(input);
    const firstPolaris = first.surfaces.find((surface) => surface.id === 'polaris');
    if (firstPolaris === undefined) throw new Error('missing Polaris surface');
    // Orrery holds the whole graph; the other two keep their seeded members.
    expect(first.surfaces.find((surface) => surface.id === 'orrery')?.entityIds).toEqual(first.entities.map((entity) => entity.id));
    expect(first.surfaces.find((surface) => surface.id === 'orrery')?.relationshipIds).toEqual(first.relationships.map((relationship) => relationship.id));
    expect(firstPolaris.entityIds).toEqual(BUTLERS_POC_SEEDS.surfaces.find((surface) => surface.id === 'polaris')?.entityIds);
    expect(firstPolaris.entityIds.length).toBeLessThan(first.entities.length);
    expect(Object.isFrozen(firstPolaris.entityIds)).toBe(true);
    expect(Object.isFrozen(BUTLERS_POC_SEEDS.surfaces[0]?.entityIds)).toBe(true);
    expect(() => (firstPolaris.entityIds as string[]).push('entity:mutated-only-in-first-build')).toThrow();

    expect(BUTLERS_POC_SEEDS.surfaces[0]?.entityIds).not.toContain('entity:mutated-only-in-first-build');
    const second = buildPocModel(input);
    expect(second.surfaces.find((surface) => surface.id === 'polaris')?.entityIds).not.toContain(
      'entity:mutated-only-in-first-build',
    );
  });

  it('changes seeded display labels without changing graph identities or snapshot identity', () => {
    const repoRoot = butlersFixture();
    const baseInput = {
      repoRoot,
      repositoryRevision: 'c13894238989d3bebb24094730992970b31fe546',
      observerRevision: 'bfdb7963e4ff5628d0d1ec0f59e831d7e8209abe',
      evaluation: { snapshot: 'butlers@labels', asOf: '2026-09-22T00:00:00Z' },
    } as const;
    const renamedSeeds = {
      ...BUTLERS_POC_SEEDS,
      project: { ...BUTLERS_POC_SEEDS.project, displayName: 'Staffers' },
    } as const;
    const original = buildPocModel({ ...baseInput, seeds: BUTLERS_POC_SEEDS });
    const renamed = buildPocModel({ ...baseInput, seeds: renamedSeeds });

    expect(renamed.evaluation.snapshotLabel).toBe('repository:butlers-configured-poc@labels');
    expect(renamed.evaluation.snapshotLabel).toBe(original.evaluation.snapshotLabel);
    expect(renamed.entities.map((entity) => entity.id)).toEqual(original.entities.map((entity) => entity.id));
    expect(renamed.relationships.map((relationship) => relationship.id)).toEqual(original.relationships.map((relationship) => relationship.id));
    expect(renamed.project.name).toBe('Staffers');
    expect(renamed.entities.find((entity) => entity.id === 'project:butlers')?.title).toBe('Staffers');
    expect(renamed.entities.find((entity) => entity.id === 'region:unmapped-code')?.title).toBe('Unmapped Staffers code');
    expect(renamed.relationships.find((relationship) => relationship.id === 'relationship:project-to-capability')?.statement).toBe('Staffers declares the selected capability.');
  });

  it('derives snapshot identity from an opaque repository id for non-Butlers display labels', () => {
    const repoRoot = butlersFixture();
    const staffersSeeds = {
      ...BUTLERS_POC_SEEDS,
      project: {
        ...BUTLERS_POC_SEEDS.project,
        repositoryId: 'repository:staffers',
        displayName: 'Staffers',
      },
    } as const;
    const model = buildPocModel({
      seeds: staffersSeeds,
      repoRoot,
      repositoryRevision: 'c13894238989d3bebb24094730992970b31fe546',
      observerRevision: 'bfdb7963e4ff5628d0d1ec0f59e831d7e8209abe',
      evaluation: { snapshot: 'Staffers@rev', asOf: '2026-09-22T00:00:00Z' },
    });

    expect(model.evaluation.snapshotLabel).toBe('repository:staffers@rev');
  });

  it('preserves every production snapshot component for delimiter-rich opaque repository identities', () => {
    const repoRoot = butlersFixture();
    const repositoryRevision = 'a'.repeat(40);
    const observerRevision = 'b'.repeat(40);
    const workingTreeDigest = 'c'.repeat(64);
    const delimiterRichRepositoryId = 'repository:staffers|blue@v2';
    const seeds = {
      ...BUTLERS_POC_SEEDS,
      project: {
        ...BUTLERS_POC_SEEDS.project,
        repositoryId: delimiterRichRepositoryId,
        displayName: 'Staffers Blue',
      },
    } as const;
    const productionSnapshot = [
      `${delimiterRichRepositoryId}:${repositoryRevision}`,
      `working-tree:${workingTreeDigest}`,
      `observer:${observerRevision}`,
    ].join('|');

    const first = buildPocModel({
      seeds,
      repoRoot,
      repositoryRevision,
      observerRevision,
      evaluation: { snapshot: productionSnapshot, asOf: '2026-09-22T00:00:00Z' },
    });
    const second = buildPocModel({
      seeds,
      repoRoot,
      repositoryRevision,
      observerRevision,
      evaluation: {
        snapshot: productionSnapshot.replace(workingTreeDigest, 'd'.repeat(64)),
        asOf: '2026-09-22T00:00:00Z',
      },
    });

    expect(first.evaluation.snapshotLabel).toBe(productionSnapshot);
    expect(first.evaluation.snapshotLabel).toContain(`${delimiterRichRepositoryId}:${repositoryRevision}`);
    expect(first.evaluation.snapshotLabel).toContain(`working-tree:${workingTreeDigest}`);
    expect(first.evaluation.snapshotLabel).toContain(`observer:${observerRevision}`);
    expect(second.evaluation.snapshotLabel).not.toBe(first.evaluation.snapshotLabel);
    expect(second.evaluation.snapshot).not.toBe(first.evaluation.snapshot);
  });

  it('rejects invalid public seed graphs before observation with typed failures', () => {
    const baseInput = {
      repoRoot: '/does/not/exist',
      repositoryRevision: 'seed-validation-revision',
      observerRevision: 'seed-validation-observer',
      evaluation: { snapshot: 'seed-validation@rev', asOf: '2026-09-22T00:00:00Z' },
    } as const;
    const invalidSeeds = [
      {
        ...BUTLERS_POC_SEEDS,
        entities: [...BUTLERS_POC_SEEDS.entities, BUTLERS_POC_SEEDS.entities[0]!],
      },
      {
        ...BUTLERS_POC_SEEDS,
        relationships: [
          ...BUTLERS_POC_SEEDS.relationships,
          { ...BUTLERS_POC_SEEDS.relationships[0]!, id: 'relationship:dangling', to: 'entity:missing' },
        ],
      },
      {
        ...BUTLERS_POC_SEEDS,
        surfaces: BUTLERS_POC_SEEDS.surfaces.map((surface) =>
          surface.id === 'trajectory'
            ? { ...surface, entityIds: [...surface.entityIds, 'entity:missing'] }
            : surface,
        ),
      },
      {
        ...BUTLERS_POC_SEEDS,
        surfaces: BUTLERS_POC_SEEDS.surfaces.map((surface) =>
          surface.id === 'trajectory' ? { ...surface, state: 'observed' as const }
            : surface.id === 'orrery' ? { ...surface, state: 'execution' as const } : surface,
        ),
      },
      {
        ...BUTLERS_POC_SEEDS,
        surfaces: BUTLERS_POC_SEEDS.surfaces.map((surface) =>
          surface.id === 'polaris' ? { ...surface, state: undefined as unknown as 'desired' } : surface,
        ),
      },
      {
        ...BUTLERS_POC_SEEDS,
        surfaces: [...BUTLERS_POC_SEEDS.surfaces, BUTLERS_POC_SEEDS.surfaces[0]!],
      },
      {
        ...BUTLERS_POC_SEEDS,
        entities: BUTLERS_POC_SEEDS.entities.map((entity) =>
          entity.role === 'code' ? { ...entity, kind: 'runtime' as const } : entity,
        ),
      },
      {
        ...BUTLERS_POC_SEEDS,
        entities: BUTLERS_POC_SEEDS.entities.filter((entity) => entity.role !== 'capability'),
      },
    ] as const;

    for (const seeds of invalidSeeds) {
      expect(() => buildPocModel({ ...baseInput, seeds })).toThrowError(
        expect.objectContaining({ kind: 'invalid-seed-graph' }),
      );
    }
  });

  it('names a seed role the role tables do not carry', () => {
    const baseInput = {
      repoRoot: butlersFixture(),
      repositoryRevision: 'c13894238989d3bebb24094730992970b31fe546',
      observerRevision: 'bfdb7963e4ff5628d0d1ec0f59e831d7e8209abe',
      evaluation: { snapshot: 'butlers@unsupported-role', asOf: '2026-09-22T00:00:00Z' },
    } as const;
    const entityRole = {
      ...BUTLERS_POC_SEEDS,
      entities: BUTLERS_POC_SEEDS.entities.map((entity) =>
        entity.role === 'runtime' ? { ...entity, role: 'oracle' as unknown as 'runtime' } : entity,
      ),
    };
    const relationshipRole = {
      ...BUTLERS_POC_SEEDS,
      relationships: BUTLERS_POC_SEEDS.relationships.map((relationship) =>
        relationship.role === 'code-to-runtime' ? { ...relationship, role: 'oracle' as unknown as 'code-to-runtime' } : relationship,
      ),
    };
    expect(() => buildPocModel({ ...baseInput, seeds: entityRole })).toThrowError(/entity [^ ]+ has unsupported role oracle/);
    expect(() => buildPocModel({ ...baseInput, seeds: relationshipRole })).toThrowError(/relationship [^ ]+ has unsupported role oracle/);
  });

  it('rejects a seeded Orrery mapping that is absent from the observed inventory', () => {
    const { repoRoot, changedCommit } = butlersGitFixture();
    const seeds = {
      ...BUTLERS_POC_SEEDS,
      orreryMappings: [...BUTLERS_POC_SEEDS.orreryMappings, {
        id: 'code:unsupported',
        path: 'src/missing/not-observed.py',
        capabilityId: 'capability:whatsapp-transport-identity',
      }],
    } as const;
    const model = buildPocModel({
      repoRoot,
      repositoryRevision: changedCommit,
      observerRevision: changedCommit,
      evaluation: { snapshot: 'butlers@unsupported-map', asOf: '2026-09-22T00:00:00Z' },
      seeds,
    });
    expect(model.orrery.kind).toBe('unknown');
    if (model.orrery.kind !== 'unknown') throw new Error('unreachable');
    expect(model.orrery.reason).toContain('src/missing/not-observed.py');
    expect(model.orrery.mappedFileCount).toBe(0);
    expect(model.orrery.mappedFileCount! + model.orrery.unmappedFileCount!).toBe(model.orrery.totalFileCount);
  });
});
