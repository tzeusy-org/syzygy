import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

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
      {
        extends: true,
        test: {
          name: '@syzygy/support',
          include: ['packages/support/src/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: '@syzygy/polaris-generation-core',
          include: ['packages/polaris-generation-core/src/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: '@syzygy/polaris-generation-consent',
          include: ['packages/polaris-generation-consent/src/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: '@syzygy/polaris-dossier',
          include: ['packages/polaris-dossier/src/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: '@syzygy/cap1-core',
          include: ['packages/cap1-core/src/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: '@syzygy/cap1-conformance',
          include: ['packages/cap1-conformance/src/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: '@syzygy/cap1-daemon',
          include: ['packages/cap1-daemon/src/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: '@syzygy/http-host',
          include: ['packages/http-host/src/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: '@syzygy/three-surface-poc-core',
          include: ['packages/three-surface-poc-core/src/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: '@syzygy/three-surface-poc-app',
          include: ['apps/three-surface-poc/src/**/*.test.ts'],
          // Once per run: removes the fixture directories of killed runs (syzygy-bpyt.4.10).
          globalSetup: [fileURLToPath(new URL('./apps/three-surface-poc/src/test-fixture-sweep.global-setup.ts', import.meta.url))],
        },
      },
    ],
  },
});
