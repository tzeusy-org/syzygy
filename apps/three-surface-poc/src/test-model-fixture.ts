// Test support: exports with no non-test importer are consumed by tests only, by design.

import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { BUTLERS_POC_SEEDS, buildPocModel, walkthroughAcceptance, type PocEvaluationEvidence, type PocModel, type ProjectShapeModelInput, type WalkthroughJudgmentInputs } from '@syzygy/three-surface-poc-core';

import { ownedCopyPrefix, ownedTemplatePrefix } from './fixture-directories.js';
import { pwbReadinessTraversal } from './walkthrough-inputs.js';

function git(root: string, args: readonly string[]): string {
  return execFileSync('git', ['-C', root, ...args], {
    // Pinned commit instants: two fixture builds in one test must mint the
    // same revision, or a slice-identity comparison that straddles a
    // wall-clock second boundary fails for a reason unrelated to the page
    // (seen once in hosted CI at ca6b28f).
    // No global or system config either: a host's commit.gpgsign, hooks or
    // templates would change the pinned revision or fail the commit.
    env: { ...process.env, GIT_AUTHOR_DATE: '2026-08-24T00:00:00Z', GIT_COMMITTER_DATE: '2026-08-24T00:00:00Z', GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

interface FixtureRepo {
  readonly repoRoot: string;
  readonly revision: string;
}

/**
 * A committed fixture repository carrying the five artifacts the intent
 * graph requires, plus enough extra tree shape for code-structure and
 * work-item projections to have something real to group.
 *
 * Each call gets its own copy of one repository committed once per test
 * file (syzygy-jsyi). Committing it took six git processes, 0.2-0.7 s
 * under load, and the Polaris suites build a model, and so a repository,
 * in nearly every test: 30 in polaris-reachability alone. The commit
 * instants are pinned, so every copy carries the revision a fresh commit
 * would, and a test that writes to its copy cannot reach another's.
 */
export function fixtureRepoWithGit(cleanups: string[]): FixtureRepo {
  template ??= committedFixtureRepo();
  const root = mkdtempSync(join(tmpdir(), ownedCopyPrefix()));
  cleanups.push(root);
  cpSync(template.repoRoot, root, { recursive: true });
  return { repoRoot: root, revision: template.revision };
}

let template: FixtureRepo | undefined;

/** Removes the template when the test file ends, through the hook
 * `vitest.setup.ts` installs; outside Vitest (the accessibility CLI imports
 * this module) the process's own exit does. */
function removeAtEndOfFile(root: string): void {
  const remove = (): void => {
    rmSync(root, { recursive: true, force: true });
    if (template?.repoRoot === root) template = undefined;
  };
  const afterTestFile = (globalThis as { syzygyAfterTestFile?: (teardown: () => void) => void }).syzygyAfterTestFile;
  if (afterTestFile === undefined) process.once('exit', remove);
  else afterTestFile(remove);
}

function committedFixtureRepo(): FixtureRepo {
  const root = mkdtempSync(join(tmpdir(), ownedTemplatePrefix()));
  removeAtEndOfFile(root);
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
    'apps/other/thing2.py': 'x = 1\n',
    'README.md': '# fixture repo\n',
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

export function fixtureWorkItemRow(
  id: string,
  status: string,
  createdAt: string,
  updatedAt: string,
  closedAt: string | null,
): Record<string, unknown> {
  return workItemRow(id, status, createdAt, updatedAt, closedAt, FIXTURE_DOLT_REVISION);
}

const FIXTURE_DOLT_REVISION = 'dolt-fixture-revision';

function workItemRow(
  id: string,
  status: string,
  createdAt: string,
  updatedAt: string,
  closedAt: string | null,
  revision: string,
): Record<string, unknown> {
  return {
    revision,
    id,
    title: `fixture item ${id}`,
    status,
    issue_type: 'task',
    priority: 1,
    created_at: createdAt,
    updated_at: updatedAt,
    closed_at: closedAt,
  };
}

/** Builds one shared model with real, observed code-structure and
 * work-item regions, using an injected work-item query so the fixture
 * needs no live Dolt server. */
interface FixtureModelOptions {
  /** Supplied → the model's `projectShape` is built through the P1 gate and
   * the injected runner; absent → `not-evaluated`, as the pre-PWB fixture. */
  readonly projectShape?: ProjectShapeModelInput;
  /** Supplied → the model's `walkthroughJudgment` is evaluated from the
   * pair; absent → `not-evaluated`. */
  readonly walkthroughJudgment?: WalkthroughJudgmentInputs;
  /** Override the evaluation instant for determinism counterexamples. */
  readonly evaluationAsOf?: string;
  /** Reuse one repository so two evaluations differ only where the test asks. */
  readonly fixtureRepo?: FixtureRepo;
  /** Replace the five default work-item rows (built with `fixtureWorkItemRow`). */
  readonly workItemRows?: readonly Record<string, unknown>[];
}

export function buildFixtureModel(cleanups: string[], options: FixtureModelOptions = {}): PocModel {
  const { repoRoot, revision } = options.fixtureRepo ?? fixtureRepoWithGit(cleanups);
  const doltRevision = FIXTURE_DOLT_REVISION;
  const rows = options.workItemRows ?? [
    workItemRow('bu-open1', 'open', '2026-08-01T00:00:00Z', '2026-08-02T00:00:00Z', null, doltRevision),
    workItemRow(
      'bu-progress1',
      'in_progress',
      '2026-08-03T00:00:00Z',
      '2026-08-04T00:00:00Z',
      null,
      doltRevision,
    ),
    workItemRow(
      'bu-blocked1',
      'blocked',
      '2026-08-05T00:00:00Z',
      '2026-08-05T12:00:00Z',
      null,
      doltRevision,
    ),
    workItemRow(
      'bu-closed-recent',
      'closed',
      '2026-08-06T00:00:00Z',
      '2026-08-07T00:00:00Z',
      '2026-08-07T00:00:00Z',
      doltRevision,
    ),
    workItemRow(
      'bu-closed-old',
      'closed',
      '2026-07-01T00:00:00Z',
      '2026-07-02T00:00:00Z',
      '2026-07-02T00:00:00Z',
      doltRevision,
    ),
  ];

  return buildPocModel({
    seeds: BUTLERS_POC_SEEDS,
    repoRoot,
    repositoryRevision: revision,
    observerRevision: revision,
    evaluation: { snapshot: 'butlers@fixture', asOf: options.evaluationAsOf ?? '2026-08-30T12:00:00Z' },
    evidence: fixtureEvidence(revision),
    runWorkItemQuery: (_repoRoot, sql) =>
      sql.includes('WHERE id LIKE') ? JSON.stringify(rows) : JSON.stringify([{ revision: doltRevision }]),
    ...(options.projectShape === undefined ? {} : { projectShape: options.projectShape }),
    // The production traversal predicate: readiness is assessed whenever a
    // pair is supplied, exactly as the daemon does.
    acceptance: walkthroughAcceptance({ judgment: options.walkthroughJudgment, traversal: pwbReadinessTraversal() }),
  });
}

function fixtureEvidence(revision: string): PocEvaluationEvidence {
  const observationInstant = '2026-08-30T12:00:00Z';
  return {
    pinnedRevision: revision,
    pinnedCommitterInstant: '2026-08-24T00:00:00Z',
    observationInstant,
    probe: {
      claimId: 'claim:currency-probe',
      evaluationId: `evaluation:pwb-currency-probe:${observationInstant}`,
      evaluationInstant: observationInstant,
      epistemic: { label: 'Observed', tier: 'report-fact', challenge: 'unchallenged' },
      pinnedRevision: revision,
      currentRevision: revision,
      changedSources: 0,
      addedSources: 0,
    },
    currencyBounds: [],
  };
}

/**
 * Freezes a fixture model shared by several tests in a file, so a test that
 * mutates it throws instead of leaking its change into the next test.
 * Byte arrays stay as they are: a typed array with elements cannot be frozen.
 */
export function frozenFixture<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value) || ArrayBuffer.isView(value)) return value;
  for (const key of Reflect.ownKeys(value)) frozenFixture((value as Record<PropertyKey, unknown>)[key]);
  return Object.freeze(value);
}

/**
 * Builds each named fixture model once per file and freezes it (syzygy-k66p).
 * A model build makes and observes a fixture repository (~0.5 s unloaded);
 * rebuilding the same five models in every test pushed single tests past the
 * 5 s default under full-suite load. The repositories live until `remove`.
 */
/**
 * Budget for building a file's shared fixture models once. Five or six
 * builds took 4.1-10.9 s across five full-suite runs under eight CPU burners
 * (docs/evidence/shared-fixture-models-k66p-2026-10-03.json), past the 10 s
 * hook default at the top.
 */
export const SHARED_FIXTURE_TIMEOUT_MS = 60_000;

export function sharedFixtureModels<K extends string>(
  build: (cleanups: string[]) => Readonly<Record<K, PocModel>>,
): { readonly prepare: () => void; readonly get: (name: K) => PocModel; readonly remove: () => void } {
  const cleanups: string[] = [];
  let models: Readonly<Record<K, PocModel>> | undefined;
  return {
    prepare: () => { models ??= frozenFixture(build(cleanups)); },
    get: (name) => {
      if (models === undefined) throw new Error('shared fixture models used before prepare');
      return models[name];
    },
    remove: () => {
      models = undefined;
      for (const directory of cleanups.splice(0)) rmSync(directory, { recursive: true, force: true });
    },
  };
}
