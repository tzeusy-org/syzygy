import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

// The test tiers (syzygy-bpyt.4.3). Every `*.test.ts` under a workspace's `src/` is in exactly one tier, and a file in none of the
// three lists below is a unit test:
//
//   unit         hermetic: starts no process (git, node, python, a browser), opens no socket, binds no server. The unit setup
//                (vitest.unit-guard.setup.ts) refuses each of those at the call, so a test that needs one fails there and
//                names this file. `npm test`, and `npm run check`, run this tier.
//   integration  git, a real tree, a local server, a python recorder or another child process, but no browser, no install
//                and no network beyond loopback. `npm run test:integration`.
//   e2e          a browser (Chrome), an `npm ci` or a build in a clone, strace, or the compiled daemon. `npm run test:e2e`; the
//                `*.system.test.ts` files of packages/cap1-system belong here too and run through their own config
//                (`npm run test:system`), which builds first.
//   live         skips unless the operator points it at a real repository. `npm run test:live`; no workflow runs it.
//
// A new test is a unit test until it needs more; list it under the lowest tier that holds what it uses. `partitionProblems`
// (below) is the one place that checks the lists against the tree; it runs whenever vitest loads the config and in
// `npm run test:tiers` (scripts/check_test_tiers.mjs, which also prints the denominator).
export const TIERS = ['unit', 'integration', 'e2e', 'live'] as const;
export type Tier = (typeof TIERS)[number];

export const INTEGRATION_TESTS: readonly string[] = [
  'apps/three-surface-poc/src/block-provenance-sweep.test.ts',
  'apps/three-surface-poc/src/capture-test-artifact-main.test.ts',
  'apps/three-surface-poc/src/cross-cutting.test.ts',
  'apps/three-surface-poc/src/evaluation-footer.test.ts',
  'apps/three-surface-poc/src/fixture-directories.test.ts',
  'apps/three-surface-poc/src/git-blob-batch.test.ts',
  'apps/three-surface-poc/src/git-observation.test.ts',
  'apps/three-surface-poc/src/governance-inputs.test.ts',
  'apps/three-surface-poc/src/governing-intent-sweep.test.ts',
  'apps/three-surface-poc/src/keyboard-sweep-record.test.ts',
  'apps/three-surface-poc/src/main.test.ts',
  'apps/three-surface-poc/src/materialize-action.test.ts',
  'apps/three-surface-poc/src/orrery.test.ts',
  'apps/three-surface-poc/src/page-size-delta.test.ts',
  'apps/three-surface-poc/src/polaris-anchor-resolution.test.ts',
  'apps/three-surface-poc/src/polaris-authority-sweep.test.ts',
  'apps/three-surface-poc/src/polaris-capability-detail.test.ts',
  'apps/three-surface-poc/src/polaris-copy.test.ts',
  'apps/three-surface-poc/src/polaris-epistemic-tuples.test.ts',
  'apps/three-surface-poc/src/polaris-first-reading.test.ts',
  'apps/three-surface-poc/src/polaris-generation/dossier-cap-measure.test.ts',
  'apps/three-surface-poc/src/polaris-generation/dossier-evaluation-main.test.ts',
  'apps/three-surface-poc/src/polaris-generation/dossier-render.test.ts',
  'apps/three-surface-poc/src/polaris-generation/dossier-trigger-isolation.test.ts',
  'apps/three-surface-poc/src/polaris-generation/dossier-trigger.test.ts',
  'apps/three-surface-poc/src/polaris-generation/generator-install-check.test.ts',
  'apps/three-surface-poc/src/polaris-generation/public-source-screening.test.ts',
  'apps/three-surface-poc/src/polaris-generation/redis-shaped-discovery.test.ts',
  'apps/three-surface-poc/src/polaris-generation/repo-corpus-isolation.test.ts',
  'apps/three-surface-poc/src/polaris-generation/repo-corpus.test.ts',
  'apps/three-surface-poc/src/polaris-generation/self-corpus.test.ts',
  'apps/three-surface-poc/src/polaris-narrative.test.ts',
  'apps/three-surface-poc/src/polaris-parity-sweep.test.ts',
  'apps/three-surface-poc/src/polaris-presentation-route.test.ts',
  'apps/three-surface-poc/src/polaris-project-shape.test.ts',
  'apps/three-surface-poc/src/polaris-proposed-work.test.ts',
  'apps/three-surface-poc/src/polaris-reachability.test.ts',
  'apps/three-surface-poc/src/polaris-reconciliation.test.ts',
  'apps/three-surface-poc/src/polaris-source-route.test.ts',
  'apps/three-surface-poc/src/polaris-walkthrough-readiness.test.ts',
  'apps/three-surface-poc/src/polaris.test.ts',
  'apps/three-surface-poc/src/production-reobserve.test.ts',
  'apps/three-surface-poc/src/response-identity-independent.test.ts',
  'apps/three-surface-poc/src/response-limits.test.ts',
  'apps/three-surface-poc/src/restart.test.ts',
  'apps/three-surface-poc/src/routes.test.ts',
  'apps/three-surface-poc/src/surface-render-fractions.test.ts',
  'apps/three-surface-poc/src/sync-child-process-guard.test.ts',
  'apps/three-surface-poc/src/test-model-fixture.test.ts',
  'apps/three-surface-poc/src/trajectory.test.ts',
  'apps/three-surface-poc/src/unit-tier-guard-file.test.ts',
  'apps/three-surface-poc/src/unknown-route-sweep.test.ts',
  'apps/three-surface-poc/src/verbatim-route.test.ts',
  'apps/three-surface-poc/src/walkthrough-inputs.test.ts',
  'apps/three-surface-poc/src/walkthrough-preflight.test.ts',
  'packages/cap1-daemon/src/routes-human.test.ts',
  'packages/cap1-daemon/src/routes-machine.test.ts',
  'packages/cap1-daemon/src/server.test.ts',
  'packages/polaris-dossier/src/brief.test.ts',
  'packages/polaris-dossier/src/check.test.ts',
  'packages/polaris-dossier/src/close.test.ts',
  'packages/polaris-dossier/src/execution-flags.test.ts',
  'packages/polaris-dossier/src/gate-acts.test.ts',
  'packages/polaris-dossier/src/gate-parts.test.ts',
  'packages/polaris-dossier/src/git-object-reader.test.ts',
  'packages/polaris-dossier/src/inventory.test.ts',
  'packages/polaris-dossier/src/launched.test.ts',
  'packages/polaris-dossier/src/render.test.ts',
  'packages/polaris-dossier/src/review.test.ts',
  'packages/polaris-dossier/src/run-evidence.test.ts',
  'packages/polaris-dossier/src/screen.test.ts',
  'packages/polaris-dossier/src/session-view.test.ts',
  'packages/polaris-dossier/src/start-gates.test.ts',
  'packages/polaris-dossier/src/waiting-sessions.test.ts',
  'packages/polaris-generation-consent/src/act-families.test.ts',
  'packages/polaris-generation-consent/src/decisions-sweep.test.ts',
  'packages/polaris-generation-consent/src/digest-bound-act.test.ts',
  'packages/polaris-generation-consent/src/package-reader.test.ts',
  'packages/polaris-generation-core/src/public-source-exemption.test.ts',
  'packages/polaris-generation-core/src/secret-redaction.test.ts',
  'packages/test-kit/src/git-repo.test.ts',
  'packages/three-surface-poc-core/src/code-structure.test.ts',
  'packages/three-surface-poc-core/src/model-observations.test.ts',
  'packages/three-surface-poc-core/src/model.test.ts',
  'packages/three-surface-poc-core/src/owner-act-record.test.ts',
  'packages/three-surface-poc-core/src/work-items.test.ts',
  'packages/three-surface-poc-core/src/worker-change-observation.test.ts',
];
export const E2E_TESTS: readonly string[] = [
  'apps/three-surface-poc/src/cdp-browser.browser.test.ts',
  'apps/three-surface-poc/src/orrery.browser.test.ts',
  'apps/three-surface-poc/src/polaris-accessibility.browser.test.ts',
  'apps/three-surface-poc/src/polaris-accessible-names.browser.test.ts',
  'apps/three-surface-poc/src/polaris-generation/draft-preview.browser.test.ts',
  'apps/three-surface-poc/src/polaris-generation/pipeline-demo.test.ts',
  'apps/three-surface-poc/src/polaris-opening-index.browser.test.ts',
  'apps/three-surface-poc/src/product-build.test.ts',
  'apps/three-surface-poc/src/proposal-disclosure.test.ts',
  'apps/three-surface-poc/src/surface-routes.test.ts',
  'apps/three-surface-poc/src/trajectory-narrowing.browser.test.ts',
  'apps/three-surface-poc/src/tuple-encoding.test.ts',
  'packages/polaris-dossier/src/no-egress.test.ts',
];
export const LIVE_TESTS: readonly string[] = [
  'apps/three-surface-poc/src/project-shape-discovery.live.test.ts',
  'packages/three-surface-poc-core/src/test-artifact-verification.live.test.ts',
  'packages/three-surface-poc-core/src/work-items.live.test.ts',
];

/** A test file name that its own config runs, not the root vitest config (packages/cap1-system/vitest.config.ts). */
export const SYSTEM_TEST_SUFFIX = '.system.test.ts';
const TEST_SUFFIX = '.test.ts';

/** The workspace directories of the root package.json (`packages/*`, `apps/*`), as repository-relative paths. */
export function workspaceDirectories(root: string): string[] {
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { workspaces?: unknown };
  const patterns = Array.isArray(manifest.workspaces) ? (manifest.workspaces as unknown[]) : [];
  return patterns.flatMap((pattern) => {
    const match = /^([\w.-]+(?:\/[\w.-]+)*)\/\*$/.exec(String(pattern));
    if (match === null) throw new Error(`package.json: unrecognized workspaces pattern ${String(pattern)}`);
    const parent = match[1]!;
    return readdirSync(join(root, parent)).sort().map((name) => `${parent}/${name}`).filter((dir) => existsSync(join(root, dir, 'package.json')));
  });
}

/** Every test file under the `src/` of each workspace, as sorted repository-relative POSIX paths. */
export function testFiles(root: string): string[] {
  const found: string[] = [];
  const walk = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== 'dist') walk(path);
      } else if (entry.name.endsWith(TEST_SUFFIX) && statSync(path).isFile()) found.push(relative(root, path).split(sep).join('/'));
    }
  };
  for (const workspace of workspaceDirectories(root)) if (existsSync(join(root, workspace, 'src'))) walk(join(root, workspace, 'src'));
  return found.sort();
}

export interface TierLists { readonly integration: readonly string[]; readonly e2e: readonly string[]; readonly live: readonly string[] }
export const TIER_LISTS: TierLists = { integration: INTEGRATION_TESTS, e2e: E2E_TESTS, live: LIVE_TESTS };

/** The tier of one test file. A file named in two lists is a problem `partitionProblems` reports; this returns the first. */
export function tierOf(path: string, lists: TierLists = TIER_LISTS): Tier {
  if (lists.live.includes(path)) return 'live';
  if (lists.e2e.includes(path) || path.endsWith(SYSTEM_TEST_SUFFIX)) return 'e2e';
  if (lists.integration.includes(path)) return 'integration';
  return 'unit';
}

/** Every way the lists and the tree disagree; empty when each test file is in exactly one tier and every list entry names a file. */
export function partitionProblems(files: readonly string[], lists: TierLists = TIER_LISTS): string[] {
  const problems: string[] = [];
  const present = new Set(files);
  const named = new Map<string, string[]>();
  for (const [tier, paths] of Object.entries(lists) as [string, readonly string[]][]) {
    for (const path of paths) if (!named.get(path)?.includes(tier)) named.set(path, [...(named.get(path) ?? []), tier]);
    if (new Set(paths).size !== paths.length) problems.push(`${tier}: lists a path twice`);
    const sorted = [...paths].sort();
    if (paths.some((path, index) => path !== sorted[index])) problems.push(`${tier}: list is not sorted`);
  }
  for (const [path, tiers] of named) {
    if (!present.has(path)) problems.push(`${tiers.join(', ')}: ${path} names no test file under a workspace src/`);
    if (tiers.length > 1) problems.push(`${path} is in ${tiers.length} tiers (${tiers.join(', ')})`);
    if (path.endsWith(SYSTEM_TEST_SUFFIX)) problems.push(`${path} is a system test, which is e2e by its suffix and is not listed`);
  }
  return problems;
}

/** The test files of one tier, from the files present. */
export const filesOfTier = (files: readonly string[], tier: Tier, lists: TierLists = TIER_LISTS): string[] => files.filter((path) => tierOf(path, lists) === tier);
