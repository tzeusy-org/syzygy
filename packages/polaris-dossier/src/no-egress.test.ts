import * as fs from 'node:fs';
import * as path from 'node:path';
import { build, type Plugin } from 'esbuild';
import { beforeAll, describe, expect, it } from 'vitest';
import { entryModules } from '../../polaris-generation-core/src/workspace-reach.testkit.js';
import { exited } from './child-process.testkit.js';
import { FULL_RUN_ROOT_ENV, REAL_ROOT, makeClone } from './full-run.testkit.js';
import { tempDir } from '@syzygy/test-kit';

/** The no-egress proof (REQ-polaris-generation-033, scenario "No provider call and no egress record"; tasks "Prove no provider call and no
 * transmission"; syzygy-qkea.11). A full fixture run, every dossier command from preflight to close and status, runs in a child process
 * under strace, which records every network-class system call of that process and of every process it starts. The capture is the
 * operating system's account, not the run record. The run must create no Internet-family socket at all (AF_INET, AF_INET6), so it can
 * have resolved no name, called no provider and transmitted nothing off the host. A canary run that sends one loopback datagram first
 * shows the capture sees a transmission when one is made. Without strace, or where the host forbids tracing, the proof is skipped and
 * says so: it is never reported as passed. */

const STRACE = await exited('strace', ['-V']);
const HAVE_STRACE = STRACE.status === 0;
const INTERNET_FAMILY = /\bAF_INET6?\b/u;
// The checkout's real path: esbuild resolves through symbolic links, so the guard below compares real paths.
const SOURCE_ROOT = fs.realpathSync(REAL_ROOT);

/** The bundle's alias map, derived from each workspace package's own `exports` (or its `main`, where it has no `exports`) by the island
 * guards' resolver, which reads `./dist/X.js` as `src/X.ts`. So the proof bundles the source of the module Node loads for each
 * specifier, whatever its entry is named. An entry that resolver cannot read, or one with a `/../` segment, throws here
 * (syzygy-bpyt.6.14, the PR 530 round-2 review's N10; `entryModules`, syzygy-bpyt.46). */
function workspaceAliases(): Record<string, string> {
  return Object.fromEntries(Object.entries(entryModules()).map(([specifier, module]) => [specifier, path.join(SOURCE_ROOT, module)]));
}

const SOURCES_ONLY = 'resolving within the workspace sources';
/** Fails the bundle when an `@syzygy/` specifier resolves outside every workspace package's `src` (`packages/<name>/src`,
 * `apps/<name>/src`). One the alias map does not name reads its package's `dist` through `node_modules`, which is not the source
 * this proof is about (syzygy-bpyt.6.14, N10). */
function sourcesOnly(root: string): Plugin {
  return {
    name: 'workspace-sources-only',
    setup(bundler) {
      bundler.onResolve({ filter: /^@syzygy\// }, async (args) => {
        if (args.pluginData === SOURCES_ONLY) return undefined;
        const resolved = await bundler.resolve(args.path, { kind: args.kind, importer: args.importer, resolveDir: args.resolveDir, pluginData: SOURCES_ONLY });
        if (resolved.errors.length > 0) return { errors: resolved.errors };
        const relative = path.relative(root, resolved.path).split(path.sep).join('/');
        if (resolved.external || !/^(?:packages|apps)\/[^/]+\/src\//u.test(relative)) {
          return { errors: [{ text: `${args.path} resolves outside packages/*/src and apps/*/src: ${relative}` }] };
        }
        return { path: resolved.path, namespace: resolved.namespace, sideEffects: resolved.sideEffects };
      });
    },
  };
}

/** Bundles the driver into `outfile`, every `@syzygy/*` specifier by the derived aliases and inside the workspace sources. */
async function bundleDriver(outfile: string, aliases: Record<string, string> = workspaceAliases()): Promise<void> {
  await build({
    entryPoints: [path.join(REAL_ROOT, 'packages/polaris-dossier/test-support/no-egress-driver.ts')],
    bundle: true, platform: 'node', format: 'esm', target: 'node22', outfile, logLevel: 'silent',
    banner: { js: 'import { createRequire as __createRequire } from \'node:module\'; const require = __createRequire(import.meta.url);' },
    alias: aliases,
    plugins: [sourcesOnly(SOURCE_ROOT)],
  });
}

let dir: string;
let bundle: string;
let clone: string;
let commit: string;
beforeAll(async () => {
  if (!HAVE_STRACE) return;
  dir = tempDir('dossier-no-egress-');
  ({ clone, commit } = makeClone(path.join(dir, 'repo')));
  bundle = path.join(dir, 'driver.mjs');
  await bundleDriver(bundle);
});

interface Capture { readonly status: number | null; readonly stdout: string; readonly stderr: string; readonly calls: readonly string[]; readonly tasks: number }

/** Run the driver under strace; every network-class call of the process tree, one per line, and how many tasks (processes and threads) made one. */
async function captured(name: string, canary: boolean): Promise<Capture> {
  const log = path.join(dir, `${name}.strace`);
  const stateRoot = path.join(dir, `${name}-state`);
  const result = await exited('strace', ['-f', '-qq', '-e', 'trace=%network,execve,clone,clone3,fork,vfork', '-e', 'signal=none', '-o', log, process.execPath, bundle, clone, commit, stateRoot, ...(canary ? ['canary'] : [])], {
    env: { PATH: process.env['PATH'] ?? '/usr/bin:/bin', HOME: dir, [FULL_RUN_ROOT_ENV]: REAL_ROOT }, timeout: 240_000,
  });
  const lines = fs.existsSync(log) ? fs.readFileSync(log, 'utf8').split('\n').filter((line) => line !== '') : [];
  const call = (line: string): string => line.replace(/^\d+\s+/u, '');
  const network = lines.map(call).filter((line) => !/^(execve|clone3?|v?fork)\(/u.test(line) && /^[a-z_0-9]+\(/u.test(line));
  return { status: result.status, stdout: result.stdout, stderr: result.stderr, calls: network, tasks: new Set(lines.map((line) => line.split(/\s+/u)[0])).size };
}

describe.skipIf(!HAVE_STRACE)('no provider call and no transmission (S10): an operating-system capture of a full fixture run', () => {
  it('creates no Internet-family socket over the whole run, from preflight to close', async () => {
    const run = await captured('run', false);
    expect(run.stderr).toBe('');
    expect(run.status).toBe(0);
    const summary = JSON.parse(run.stdout) as { run: string; steps: { command: string; exit: number }[] };
    expect(summary.steps.map((step) => step.command)).toEqual([
      'preflight', 'init', 'brief', 'check', 'session-prompt', 'inventory-check', 'launch-form', 'session-prompt', 'review-check', 'launch-form',
      'render', 'session-prompt', 'review-check', 'launch-form', 'render', 'close', 'status',
    ]);
    expect(summary.steps.every((step) => step.exit === 0)).toBe(true);
    expect(fs.existsSync(path.join(summary.run, 'record.json'))).toBe(true);
    expect(run.tasks).toBeGreaterThan(0);
    // The population: every network-class call the capture recorded, which is not empty (the runtime's own local sockets are in it).
    // None names an Internet address family.
    expect(run.calls.length).toBeGreaterThan(0);
    expect(run.calls.filter((line) => INTERNET_FAMILY.test(line))).toEqual([]);
    // One line in the test log saying the proof ran, and over what population.
    console.log(`no-egress proof ran under strace: ${run.calls.length} network-class calls, traced calls from ${run.tasks} task(s), 0 Internet-family`);
  }, 240_000); // a full fixture run under strace: timed out at the 5 s default in 1 of 5 full-suite runs at load1 38-71, up to 4.8 s in the others (docs/evidence/syzygy-bpyt-4-31/full-runs.json)

  it('sees the canary: one loopback datagram sent before the same run is in the capture', async () => {
    const run = await captured('canary', true);
    expect(run.status).toBe(0);
    const internet = run.calls.filter((line) => INTERNET_FAMILY.test(line));
    expect(internet.some((line) => line.startsWith('socket(AF_INET'))).toBe(true);
    expect(internet.some((line) => /^(sendto|sendmsg)\(.*inet_addr\("127\.0\.0\.1"\)/u.test(line))).toBe(true);
  }, 240_000); // the same run with the canary: timed out at the 5 s default in 3 of 5 full-suite runs at load1 38-71, up to 3.5 s in the others (docs/evidence/syzygy-bpyt-4-31/full-runs.json)
});

// What the capture runs is bundled from the workspace sources the packages' own entries name; this needs no strace.
describe('the S10 bundle takes each workspace package from the source its entry names (syzygy-bpyt.6.14)', () => {
  it('aliases every workspace package entry to the src module its exports, or its main, names', () => {
    const relative = Object.fromEntries(Object.entries(workspaceAliases()).map(([specifier, target]) => [specifier, path.relative(SOURCE_ROOT, target).split(path.sep).join('/')]));
    expect(relative).toEqual({
      '@syzygy/app': 'apps/syzygy/src/main.ts',
      '@syzygy/three-surface-poc-app': 'apps/three-surface-poc/src/main.ts',
      '@syzygy/three-surface-poc-app/dossier-render': 'apps/three-surface-poc/src/polaris-generation/dossier-render.ts',
      '@syzygy/three-surface-poc-app/dossier-site': 'apps/three-surface-poc/src/polaris-generation/dossier-site.ts',
      '@syzygy/cap1-core': 'packages/cap1-core/src/index.ts',
      '@syzygy/cap1-core/testing': 'packages/cap1-core/src/testing.ts',
      '@syzygy/cap1-daemon': 'packages/cap1-daemon/src/index.ts',
      '@syzygy/http-host': 'packages/http-host/src/index.ts',
      '@syzygy/polaris-dossier': 'packages/polaris-dossier/src/index.ts',
      '@syzygy/polaris-dossier/argv': 'packages/polaris-dossier/src/argv.ts',
      '@syzygy/polaris-dossier/check': 'packages/polaris-dossier/src/check.ts',
      '@syzygy/polaris-dossier/cli': 'packages/polaris-dossier/src/cli.ts',
      '@syzygy/polaris-dossier/clone-shape': 'packages/polaris-dossier/src/clone-shape.ts',
      '@syzygy/polaris-dossier/full-run.testkit': 'packages/polaris-dossier/src/full-run.testkit.ts',
      '@syzygy/polaris-dossier/gate-sources': 'packages/polaris-dossier/src/gate-sources.ts',
      '@syzygy/polaris-dossier/git-object-reader': 'packages/polaris-dossier/src/git-object-reader.ts',
      '@syzygy/polaris-dossier/init': 'packages/polaris-dossier/src/init.ts',
      '@syzygy/polaris-dossier/inventory': 'packages/polaris-dossier/src/inventory.ts',
      '@syzygy/polaris-dossier/review': 'packages/polaris-dossier/src/review.ts',
      '@syzygy/polaris-dossier/screen': 'packages/polaris-dossier/src/screen.ts',
      '@syzygy/polaris-dossier/state-directory': 'packages/polaris-dossier/src/state-directory.ts',
      '@syzygy/polaris-generation-consent': 'packages/polaris-generation-consent/src/index.ts',
      '@syzygy/polaris-generation-consent/live': 'packages/polaris-generation-consent/src/live.ts',
      '@syzygy/polaris-generation-consent/testing': 'packages/polaris-generation-consent/src/testing.ts',
      '@syzygy/polaris-generation-core': 'packages/polaris-generation-core/src/index.ts',
      '@syzygy/polaris-generation-core/live': 'packages/polaris-generation-core/src/live.ts',
      '@syzygy/support': 'packages/support/src/index.ts',
      '@syzygy/test-kit': 'packages/test-kit/src/index.ts',
      '@syzygy/three-surface-poc-core': 'packages/three-surface-poc-core/src/index.ts',
    });
  });

  it('bundles the driver with every @syzygy specifier inside packages/*/src or apps/*/src', async () => {
    const out = tempDir('dossier-no-egress-bundle-');
    try {
      await expect(bundleDriver(path.join(out, 'driver.mjs'))).resolves.toBeUndefined();
    } finally {
      fs.rmSync(out, { recursive: true, force: true });
    }
  });

  it('bundles the driver only under the guard: an alias that leaves the sources fails it', async () => {
    const out = tempDir('dossier-no-egress-bundle-');
    try {
      const outside = { ...workspaceAliases(), '@syzygy/support': path.join(SOURCE_ROOT, 'packages/support/package.json') };
      await expect(bundleDriver(path.join(out, 'driver.mjs'), outside))
        .rejects.toThrow('@syzygy/support resolves outside packages/*/src and apps/*/src: packages/support/package.json');
    } finally {
      fs.rmSync(out, { recursive: true, force: true });
    }
  });

  it('fails the bundle when an @syzygy specifier resolves outside them', async () => {
    const outside = build({
      stdin: { contents: "import '@syzygy/support';", resolveDir: SOURCE_ROOT, loader: 'ts' }, bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent',
      alias: { '@syzygy/support': path.join(SOURCE_ROOT, 'packages/support/package.json') }, plugins: [sourcesOnly(SOURCE_ROOT)],
    });
    await expect(outside).rejects.toThrow('@syzygy/support resolves outside packages/*/src and apps/*/src: packages/support/package.json');
  });
});

// Under CI the proof is required: node-ci installs strace, so its absence there is a failure, never a skip.
const IN_CI = process.env['CI'] === 'true';
describe.skipIf(HAVE_STRACE)('no provider call and no transmission (S10), without strace', () => {
  if (IN_CI) it('is required under CI, where strace is installed: its absence fails the proof', () => { expect.fail('strace is unavailable under CI=true, so the no-egress proof did not run'); });
  else it.skip('is not proved on this host: strace is unavailable, so the capture is skipped, never reported as passed', () => {});
});
