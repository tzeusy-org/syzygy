import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';

import { buildPocModel } from './model.js';
import { BUTLERS_POC_SEEDS } from './poc-seeds.js';

function git(root: string, args: readonly string[]): string {
  return execFileSync('git', ['-C', root, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

function butlersFixtureWithGit(): { repoRoot: string; revision: string } {
  const root = tempDir('syzygy-poc-model-obs-');
  const files: Readonly<Record<string, string>> = {
    'docs/plans/2026-08-24-whatsapp-identity-reconciliation-design.md':
      '# design\nStatus: Approved for implementation\n',
    'openspec/changes/repair-whatsapp-identity-reconciliation/proposal.md':
      '# proposal\n- Sign-off: owner approved the design and end-to-end implementation on 2026-08-24.\n',
    'openspec/changes/repair-whatsapp-identity-reconciliation/specs/switchboard-identity/spec.md':
      '# REQ-switchboard-identity-001\nwhatsapp_user_client -> whatsapp_jid\n',
    'src/butlers/identity.py': 'def canonical_identity(): pass\n',
    'tests/core/test_identity.py': 'def test_identity(): pass\n',
    'apps/other/thing.ts': 'export const x = 1;\n',
  };
  for (const [relativePath, contents] of Object.entries(files)) {
    const absolutePath = join(root, relativePath);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, contents, 'utf8');
  }
  git(root, ['init', '-q']);
  git(root, ['config', 'gc.auto', '0']);
  git(root, ['config', 'maintenance.auto', 'false']);
  git(root, ['config', 'user.email', 'poc-test@example.invalid']);
  git(root, ['config', 'user.name', 'POC Test']);
  git(root, ['add', '-A']);
  git(root, ['commit', '-qm', 'fixture']);
  return { repoRoot: root, revision: git(root, ['rev-parse', 'HEAD']) };
}

function writeSeamFiles(root: string, sourceContents: string): void {
  const seam = {
    source: 'src/butlers/connectors/whatsapp_user_client.py',
    test: 'tests/connectors/test_whatsapp_user_client.py',
  } as const;
  for (const [path, contents] of [
    [seam.source, sourceContents],
    [seam.test, 'def test_normalization(): pass\n'],
  ] as const) {
    const absolute = join(root, path);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, contents, 'utf8');
  }
}

describe('shared model observation wiring', () => {
  it('folds the worker-change lifecycle observation into the one shared model, scoped to the materialized Bead (AC3)', () => {
    const { repoRoot, revision } = butlersFixtureWithGit();
    writeSeamFiles(repoRoot, 'x = 1\n');
    git(repoRoot, ['add', '-A']);
    git(repoRoot, ['commit', '-qm', 'add bounded worker-change seam files']);
    const mergedRevision = git(repoRoot, ['rev-parse', 'HEAD']);
    git(repoRoot, ['update-ref', 'refs/remotes/origin/main', mergedRevision]);
    git(repoRoot, ['symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/main']);

    const materializationRecord = {
      beadId: 'bu-worker-change-1',
      externalRef: 'syzygy-poc:work:whatsapp-single-event-normalization',
      targetRepoRoot: repoRoot,
      createdAt: '2026-08-30T00:00:00Z',
      doltRevisionAtCreation: 'dolt-rev-1',
      attribution: 'test-actor',
    } as const;
    const confirmedRows = [
      {
        revision: 'dolt-rev-2',
        id: 'bu-worker-change-1',
        title: 'Single-event WhatsApp sender normalization (Syzygy POC materialization)',
        status: 'open',
        issue_type: 'task',
        priority: 2,
        created_at: '2026-08-30T00:00:00Z',
        updated_at: '2026-08-30T00:00:00Z',
        closed_at: null,
      },
    ];
    const runWorkItemQuery = (_repoRoot: string, sql: string): string =>
      sql.includes('WHERE id LIKE') ? JSON.stringify(confirmedRows) : JSON.stringify([{ revision: 'dolt-rev-2' }]);

    // Planned: bead is materialized (confirmed present) but no matching
    // git activity has landed yet on the bounded seam.
    const plannedModel = buildPocModel({
      seeds: BUTLERS_POC_SEEDS,
      repoRoot,
      repositoryRevision: mergedRevision,
      observerRevision: mergedRevision,
      evaluation: { snapshot: 'butlers@worker-change-planned', asOf: '2026-08-30T12:00:00Z' },
      materializationRecord,
      runWorkItemQuery,
    });
    expect(plannedModel.workerChange).toEqual({
      kind: 'observed',
      beadId: 'bu-worker-change-1',
      seam: {
        sourcePath: 'src/butlers/connectors/whatsapp_user_client.py',
        testPath: 'tests/connectors/test_whatsapp_user_client.py',
      },
      defaultBranch: 'main',
      defaultBranchRevision: mergedRevision,
      state: 'planned',
      verification: 'not-verified',
      commit: null,
      capturedAt: '2026-08-30T12:00:00Z',
    });

    // Changed-or-merged: a commit naming this exact Bead lands on the
    // default branch, but never renders verified (AC4/AC5).
    writeSeamFiles(repoRoot, 'x = 2\n');
    git(repoRoot, ['add', '-A']);
    git(repoRoot, ['commit', '-qm', 'fix(whatsapp): normalize single-event sender [bu-worker-change-1]']);
    const changedRevision = git(repoRoot, ['rev-parse', 'HEAD']);
    git(repoRoot, ['update-ref', 'refs/remotes/origin/main', changedRevision]);

    const changedModel = buildPocModel({
      seeds: BUTLERS_POC_SEEDS,
      repoRoot,
      repositoryRevision: changedRevision,
      observerRevision: changedRevision,
      evaluation: { snapshot: 'butlers@worker-change-merged', asOf: '2026-08-30T13:00:00Z' },
      materializationRecord,
      runWorkItemQuery,
    });
    expect(changedModel.workerChange.kind).toBe('observed');
    if (changedModel.workerChange.kind !== 'observed') throw new Error('unreachable');
    expect(changedModel.workerChange.state).toBe('changed-or-merged');
    expect(changedModel.workerChange.commit?.sha).toBe(changedRevision);
    expect(changedModel.workerChange.verification).toBe('not-verified');
    // production/runtime satisfaction remains a separate, still-Unknown claim (AC5)
    expect(
      changedModel.entities.find((entity) => entity.id === 'runtime:live-satisfaction')?.epistemic
        .label,
    ).toBe('Unknown');

    // No materialization at all: Unknown, distinct reason.
    const unmaterializedModel = buildPocModel({
      seeds: BUTLERS_POC_SEEDS,
      repoRoot,
      repositoryRevision: changedRevision,
      observerRevision: changedRevision,
      evaluation: { snapshot: 'butlers@worker-change-none', asOf: '2026-08-30T13:00:00Z' },
      runWorkItemQuery,
    });
    expect(unmaterializedModel.workerChange).toEqual({
      kind: 'unknown',
      reason: 'no materialized work item to observe git activity against',
    });
  });

  it('folds code-structure and work-item observations into the one shared model', () => {
    const { repoRoot, revision } = butlersFixtureWithGit();
    const runWorkItemQuery = (_repoRoot: string, sql: string): string =>
      sql.includes('WHERE id LIKE')
        ? JSON.stringify([
            {
              revision: 'dolt-rev-fixture',
              id: 'bu-1',
              title: 'fixture item',
              status: 'open',
              issue_type: 'task',
              priority: 1,
              created_at: '2026-08-30T00:00:00Z',
              updated_at: '2026-08-30T00:00:00Z',
              closed_at: null,
            },
          ])
        : JSON.stringify([{ revision: 'dolt-rev-fixture' }]);

    const model = buildPocModel({
      seeds: BUTLERS_POC_SEEDS,
      repoRoot,
      repositoryRevision: revision,
      observerRevision: revision,
      evaluation: { snapshot: 'butlers@fixture', asOf: '2026-08-30T12:00:00Z' },
      runWorkItemQuery,
    });

    expect(model.codeStructure.kind).toBe('observed');
    if (model.codeStructure.kind !== 'observed') throw new Error('unreachable');
    expect(model.codeStructure.provenance.revision).toBe(revision);
    expect(model.codeStructure.files.some((file) => file.path === 'src/butlers/identity.py')).toBe(true);

    expect(model.workItems.kind).toBe('observed');
    if (model.workItems.kind !== 'observed') throw new Error('unreachable');
    expect(model.workItems.provenance.revision).toBe('dolt-rev-fixture');
    expect(model.workItems.items).toHaveLength(1);

    expect(model.orrery.kind).toBe('observed');
    if (model.orrery.kind !== 'observed') throw new Error('unreachable');
    expect(model.orrery.mappedFileCount + model.orrery.unmappedFileCount).toBe(
      model.orrery.totalFileCount,
    );
    expect(model.orrery.mappedRegions.map((region) => region.id)).toContain(
      'code:identity-resolution',
    );

    expect(model.trajectory.kind).toBe('observed');
    if (model.trajectory.kind !== 'observed') throw new Error('unreachable');
    expect(model.trajectory.rendered.map((item) => item.id)).toContain('bu-1');

    // Full wire parity: the machine answer is exactly the model's own object
    // graph — no separate derivation path.
    expect(JSON.parse(JSON.stringify(model))).toEqual(model);
  });

  it('renders code-structure and work-item regions Unknown when their sources fail while the required intent artifacts remain present', () => {
    const { repoRoot, revision } = butlersFixtureWithGit();
    // Break git's ability to read the named revision without touching the
    // intent artifacts the earlier fail-closed checks require.
    const model = buildPocModel({
      seeds: BUTLERS_POC_SEEDS,
      repoRoot,
      repositoryRevision: '0000000000000000000000000000000000dead',
      observerRevision: revision,
      evaluation: { snapshot: 'butlers@unreadable-rev', asOf: '2026-08-30T12:00:00Z' },
      runWorkItemQuery: () => {
        throw new Error('connection refused');
      },
    });
    expect(model.codeStructure.kind).toBe('unknown');
    expect(model.workItems.kind).toBe('unknown');
    expect(model.orrery.kind).toBe('unknown');
    expect(model.trajectory.kind).toBe('unknown');
  });
});
