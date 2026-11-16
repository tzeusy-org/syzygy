import { fileURLToPath } from 'node:url';
import { configDefaults, defineConfig } from 'vitest/config';
import { E2E_TESTS, INTEGRATION_TESTS, LIVE_TESTS, SYSTEM_TEST_SUFFIX, partitionProblems, testFiles, workspaceDirectories } from './vitest.tiers.ts';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
// Each workspace's tests are in exactly one tier (vitest.tiers.ts); a list that disagrees with the tree fails every vitest run.
const problems = partitionProblems(testFiles(ROOT));
if (problems.length > 0) throw new Error(`vitest.tiers.ts disagrees with the tree:\n${problems.join('\n')}`);
const WORKSPACE_TESTS = workspaceDirectories(ROOT).map((directory) => `${directory}/src/**/*.test.ts`);

/** One tier: a project that inherits this config (and so the `source` condition) and runs only its own files. */
const tier = (name: string, test: Record<string, unknown>) => ({
  extends: true as const,
  test: {
    name,
    ...test,
    // Once per run: removes the fixture directories of killed runs (syzygy-bpyt.4.10).
    globalSetup: [fileURLToPath(new URL('./apps/three-surface-poc/src/test-fixture-sweep.global-setup.ts', import.meta.url))],
  },
});

export default defineConfig({
  // Tests load each workspace package from its source through the `source` export condition (syzygy-bpyt.4.2), never its
  // dist. Vitest runs test files through its server-side resolver, so the condition goes there (a top-level `resolve.conditions`
  // does not reach it); the others are Vite 7's `defaultServerConditions`, which a list given here replaces.
  ssr: { resolve: { conditions: ['source', 'module', 'node', 'development|production'] } },
  test: {
    // Half the cores (syzygy-w90k): several lanes run their suites on one
    // host, and a worker per core oversubscribed it. Vitest takes the bound
    // only here, for every project; a project may set no worker count.
    maxWorkers: '50%',
    setupFiles: [fileURLToPath(new URL('./vitest.setup.ts', import.meta.url))],
    projects: [
      tier('unit', {
        include: WORKSPACE_TESTS,
        exclude: [...configDefaults.exclude, `**/*${SYSTEM_TEST_SUFFIX}`, ...INTEGRATION_TESTS, ...E2E_TESTS, ...LIVE_TESTS],
        // Refuses a process or a socket at the call, so a unit test cannot grow one unnoticed (syzygy-bpyt.4.3).
        setupFiles: [fileURLToPath(new URL('./vitest.unit-guard.setup.ts', import.meta.url))],
      }),
      tier('integration', { include: [...INTEGRATION_TESTS] }),
      tier('e2e', { include: [...E2E_TESTS] }),
      tier('live', { include: [...LIVE_TESTS] }),
    ],
  },
});
