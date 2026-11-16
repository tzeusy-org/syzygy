import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// RT6 — the system-test suite's own vitest config. Deliberately NOT
// part of the root `test.projects`: the default `npm test` unit suite must
// never spawn daemon processes. This suite runs only via
// `npm run test:system` (which builds first — the tests execute the
// COMPILED daemon at apps/syzygy/dist/main.js, never in-process code).
export default defineConfig({
  // Anchor the suite to this package whatever directory vitest is
  // invoked from (the root `test:system` script passes --config).
  root: dirname(fileURLToPath(import.meta.url)),
  test: {
    include: ['src/**/*.system.test.ts'],
    // Real process spawns and real filesystem fixtures: generous
    // timeouts. The fresh-clone test raises its own per-test timeout.
    testTimeout: 60_000, // every test without its own timeout: worst 10.7 s over 5 runs at load1 47-75 (docs/evidence/syzygy-bpyt-4-31/durations/cap1-system.hooks.json)
    hookTimeout: 60_000, // also each afterEach, which stops daemons and removes fixture trees inside tests of up to 77.5 s (docs/evidence/syzygy-bpyt-4-31/durations/cap1-system.hooks.json)
  },
});
