// Test support: Vitest's global setup for the app project, run once per run in the main
// process before any worker starts (vitest.config.ts). It sweeps the temp directory the
// workers will use, which they inherit from this process.

import { removeFixturesOfDeadProcesses } from './fixture-directories.js';

export default function removeFixturesOfKilledRuns(): void {
  removeFixturesOfDeadProcesses();
}
