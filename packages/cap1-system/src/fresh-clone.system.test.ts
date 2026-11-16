// RT6 system test 6 — the fresh-clone demonstration: `git clone` this
// repository into a temp dir, `npm ci`, `npm run build`, spawn the
// clone's own built daemon against a fixture, and demonstrate the same
// facts through one human GET and one authenticated machine GET —
// wire-level parity, sweep with denominator. This is the epic's
// definition-of-done end to end, from bytes git carries.
//
// Guarded: runs only when SYZYGY_FRESH_CLONE=1 (a full clone + install
// + build is minutes, not seconds); skipped otherwise.

import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  readCredential,
  REPO_ROOT,
  startDaemon,
  sweepWireParity,
  tempBase,
  writeCompleteFixture,
  type WireFact,
} from './harness.js';

const RUN_FRESH_CLONE = process.env['SYZYGY_FRESH_CLONE'] === '1';

const cleanups: (() => Promise<void> | void)[] = [];

afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) {
    await cleanup();
  }
});

describe('RT6 — fresh-clone demonstration', () => {
  it.skipIf(!RUN_FRESH_CLONE)(
    'a fresh clone installs, builds, starts the daemon, and serves the same facts on both channels',
    async () => {
      const base = tempBase('syz-sys-clone-');
      cleanups.push(() => rmSync(base, { recursive: true, force: true }));
      const cloneDir = join(base, 'clone');

      // Fresh clone of THIS repository (committed bytes only).
      execFileSync('git', ['clone', '--quiet', REPO_ROOT, cloneDir], {
        stdio: 'pipe',
      });
      // Fresh install and build inside the clone — no prior state.
      execFileSync('npm', ['ci', '--no-audit', '--no-fund'], {
        cwd: cloneDir,
        stdio: 'pipe',
      });

      // The clone starts with no generated output. The package runtime
      // resolution proof below must therefore use the outputs of this build,
      // not an ignored local artifact carried into the clone.
      expect(existsSync(join(cloneDir, 'apps', 'syzygy', 'dist'))).toBe(false);

      execFileSync('npm', ['run', 'build'], { cwd: cloneDir, stdio: 'pipe' });

      // Node consumers resolve the workspace packages through their built
      // conditional exports, independently of the app's composition root.
      const resolvedExports = execFileSync(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          "console.log(await import.meta.resolve('@syzygy/cap1-core')); console.log(await import.meta.resolve('@syzygy/cap1-daemon'));",
        ],
        { cwd: cloneDir, encoding: 'utf8' },
      );
      expect(resolvedExports).toContain(
        join('packages', 'cap1-core', 'dist', 'index.js'),
      );
      expect(resolvedExports).toContain(
        join('packages', 'cap1-daemon', 'dist', 'index.js'),
      );

      // The clone's OWN built daemon over a fixture repository.
      const fixtureRoot = join(base, 'fixture');
      writeCompleteFixture(fixtureRoot);
      const daemon = await startDaemon({
        repoRoot: cloneDir,
        fixtureRoot,
        stateDir: join(base, 'state'),
      });
      cleanups.push(async () => {
        await daemon.stop();
      });

      // One browser-equivalent human GET.
      const humanResponse = await fetch(`${daemon.baseUrl}/`);
      expect(humanResponse.status).toBe(200);
      const html = await humanResponse.text();
      expect(html).toContain('Project prj-sys-fixture');
      expect(html).toContain('Why this answer?');

      // One authenticated machine GET, token read from the state dir.
      const token = readCredential(daemon.credentialPath);
      const machineResponse = await fetch(`${daemon.baseUrl}/api/project`, {
        headers: { authorization: `Bearer ${token}` },
      });
      expect(machineResponse.status).toBe(200);
      const body = (await machineResponse.json()) as {
        kind: string;
        state: { current: { facts: WireFact[] } };
      };
      expect(body.kind).toBe('project-evaluated');

      // Same-facts parity as the full-facts test: every JSON fact
      // appears in the HTML; denominator = the JSON fact set.
      const jsonFacts = body.state.current.facts;
      const asserted = sweepWireParity(jsonFacts, html);
      expect(asserted).toBe(jsonFacts.length);
      expect(jsonFacts.length).toBe(7);
    },
    600_000, // clones, installs and builds: worst 77.5 s over 5 runs at load1 47-75 (docs/evidence/syzygy-bpyt-4-31/durations/cap1-system.hooks.json); 12-19 s on the hosted runs in docs/evidence/syzygy-bpyt-4-31/ci-durations.json
  );
});
