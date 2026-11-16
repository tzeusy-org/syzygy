import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { PassThrough, Writable } from 'node:stream';

import { afterAll, afterEach, beforeAll, describe, expect, it, vi, type RunnerTask } from 'vitest';

import type { DaemonOptions, DaemonStart, Route } from '@syzygy/http-host';
import { PocObservationError, type PocModel } from '@syzygy/three-surface-poc-core';

import type { GitObservation } from './git-observation.js';
import { pocObserverInputsAreClean } from './git-observation.js';
import { materializeRoutes } from './materialize-action.js';
import { main, type PocIo, type PocMainDeps } from './poc-main.js';
import { buildFixtureModel } from './test-model-fixture.js';
import { ADMITTING_AUTHORITY, PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC, projectShapeFixtureGit } from './test-project-shape-fixture.js';

// syzygy-bpyt.5.5: `main(argv, io)` is the entry point; `main.ts`, which
// `npm run poc` starts, only supplies the real process as `io`. This is the
// one behavior gate: it drives main with fake io and fake collaborators
// (no repository is read, no socket is opened) and pins what the operator
// sees, the exit code, and the order in which the gate, the observation and
// the daemon are reached. Expected strings are literals.
//
// syzygy-bpyt.5.8: it also pins where each repository-rooted argument comes
// from: the locator the P1 gate bound, never the path the operator typed and
// never the observer checkout.

// The one collaborator `main` reaches by import rather than through its deps
// is the Polaris blob reader; this records the root it is built for and the
// objects whose bodies it is asked for, and reads nothing unless a test sets
// `serve`, which answers by exact object id (and `afterEach` clears it).
const blobReader = vi.hoisted(() => ({
  roots: [] as string[],
  objectIds: [] as string[],
  serve: (_objectId: string): Uint8Array | undefined => undefined,
}));
vi.mock('./verbatim-route.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./verbatim-route.js')>()),
  gitBlobReaderFor: (root: string) => {
    blobReader.roots.push(root);
    // A Git runner: `cat-file -s` and `cat-file blob` by exact object id, recording each body read.
    return (args: readonly string[]) => {
      const objectId = args[2] ?? '';
      const body = args[0] === 'cat-file' ? blobReader.serve(objectId) : undefined;
      if (body === undefined) throw new Error(`fixture: git cannot serve ${args.join(' ')}`);
      if (args[1] === '-s') return new TextEncoder().encode(`${body.byteLength}\n`);
      blobReader.objectIds.push(objectId);
      return body;
    };
  },
}));

const NOW = '2026-10-22T09:00:00.000Z';
const OBSERVER_ROOT = '/observer/syzygy';
// Every wait in this file is bounded by WAIT_MS, and every test that waits
// has a timeout above two of them, so a slow host fails on the unmet
// expectation instead of on "Test timed out" (vitest's default is 5000 ms).
// The last test in the file checks that relation against the timeouts vitest
// registered, for each test that reached a bounded wait.
const WAIT_MS = 10_000;
const TEST_TIMEOUT_MS = 30_000;

/** The bound, in ms, summed per test (by full name) over its WAIT_MS waits. */
const waitBudgets = new Map<string, number>();

/** Charges one WAIT_MS wait to the running test. */
function chargeWait(): void {
  const test = expect.getState().currentTestName ?? '';
  waitBudgets.set(test, (waitBudgets.get(test) ?? 0) + WAIT_MS);
}

/** `vi.waitFor` bounded by, and charged as, one WAIT_MS wait. */
async function waitedFor(assertion: () => void): Promise<void> {
  chargeWait();
  await vi.waitFor(assertion, { timeout: WAIT_MS });
}

let repoRoot: string;
let scratch: string;
const fixtureDirectories: string[] = [];

beforeAll(() => {
  scratch = realpathSync(mkdtempSync(join(tmpdir(), 'poc-main-test-')));
  repoRoot = scratch;
});
afterEach(() => {
  blobReader.serve = () => undefined;
});
afterAll(() => {
  rmSync(scratch, { recursive: true, force: true });
  for (const directory of fixtureDirectories) rmSync(directory, { recursive: true, force: true });
});

function sink(onText: (text: string) => void): Writable {
  return new Writable({ write(chunk, _encoding, callback) { onText(String(chunk)); callback(); } });
}

function fakeIo(now: () => string = () => NOW) {
  let stdout = '';
  let stderr = '';
  const listeners = new Map<string, () => void>();
  const stdin = new PassThrough();
  const io: PocIo = {
    stdout: sink((text) => { stdout += text; }),
    stderr: sink((text) => { stderr += text; }),
    stdin,
    cwd: () => OBSERVER_ROOT,
    now,
    onSignal: (signal, listener) => { listeners.set(signal, listener); },
  };
  return {
    io,
    stdin,
    out: () => stdout,
    err: () => stderr,
    registered: () => listeners.size,
    signal: (name: 'SIGINT' | 'SIGTERM') => listeners.get(name)?.(),
  };
}

function observation(revision: string, changedPaths: readonly string[] = []): GitObservation {
  return {
    revision,
    committerInstant: '2026-10-20T00:00:00+00:00',
    worktreeMetadataDigest: `tree-of-${revision}`,
    clean: changedPaths.length === 0,
    changedPaths,
  };
}

function lightModel(revision: string, readiness: unknown): PocModel {
  return {
    evaluation: { snapshot: `snap:${revision}`, asOf: NOW },
    project: { revision },
    workItems: { kind: 'observed', provenance: { kind: 'dolt-revision', source: 'Beads Dolt database (bu)', revision: `dolt:${revision}` } },
    walkthroughReadiness: readiness,
  } as unknown as PocModel;
}

const NOT_EVALUATED = { kind: 'not-evaluated' };
const EVALUATED = { kind: 'evaluated', readiness: { expected: { surfaceVersion: 'surface-version-literal', evaluationIdentity: 'evaluation-identity-literal' } } };

type MaterializeOptions = Parameters<typeof materializeRoutes>[0];

interface Harness {
  readonly deps: PocMainDeps;
  readonly calls: string[];
  readonly daemonOptions: () => DaemonOptions | undefined;
  /** What `main` handed `materializeRoutes`; the routes themselves are the real ones. */
  readonly materializeOptions: () => MaterializeOptions | undefined;
  readonly closes: () => number;
  /** Replaces what the observer checkout reports from the next read on. */
  readonly setObserver: (next: GitObservation) => void;
}

/** `daemonMakesStateDir` has the fake daemon create its state directory the way the real one does, so a test can tell whether the daemon was reached.
 * `model` replaces the light stand-in with a real model for the pages that render one; it gets the 1-based build count. */
function harness(overrides: Partial<PocMainDeps> = {}, options: { observer?: GitObservation; readiness?: unknown; start?: DaemonStart; daemonMakesStateDir?: boolean; model?: (build: number) => PocModel } = {}): Harness {
  const calls: string[] = [];
  let daemonOptions: DaemonOptions | undefined;
  let materializeOptions: MaterializeOptions | undefined;
  let closes = 0;
  let builds = 0;
  let observer = options.observer ?? observation('observer-rev');
  const deps: PocMainDeps = {
    resolveBinding: (locator) => { calls.push(`bind ${locator}`); return { kind: 'bound', locator, gitCommonDirectory: join(locator, '.git') }; },
    observeGitRepository: (root) => {
      calls.push(`observe ${root}`);
      return root === OBSERVER_ROOT ? observer : observation('butlers-rev');
    },
    observeGitHorizon: (root, pinned) => {
      calls.push(`horizon ${root} ${pinned}`);
      return { pinnedRevision: pinned, currentRevision: pinned, currentCommitterInstant: '2026-10-20T00:00:00+00:00', changedSources: 0, addedSources: 0 };
    },
    observeRevisionChange: (root, from, to) => {
      calls.push(`change ${root} ${from} ${to}`);
      return { changedSources: 1, addedSources: 0 };
    },
    observeObservatoryDrift: (root, build) => {
      calls.push(`observatory ${root} ${build}`);
      return { buildRevision: build, currentRevision: build, commitsSinceBuild: 0 };
    },
    pocObserverInputsAreClean,
    buildProductionPocModel: (input) => {
      builds += 1;
      calls.push(`model ${builds} ${input.capture.repositoryRevision} ${input.repoRoot} ${input.observerRoot} ${input.capture.evidence.observationInstant}`);
      return options.model?.(builds) ?? lightModel(`${input.capture.repositoryRevision}-build-${builds}`, options.readiness ?? NOT_EVALUATED);
    },
    materializeRoutes: (materializeRouteOptions) => {
      materializeOptions = materializeRouteOptions;
      return materializeRoutes(materializeRouteOptions);
    },
    createDaemon: async (daemonStartOptions) => {
      daemonOptions = daemonStartOptions;
      calls.push('daemon');
      if (options.daemonMakesStateDir === true) mkdirSync(daemonStartOptions.stateDir, { recursive: true });
      return options.start ?? {
        started: true,
        daemon: {
          host: '127.0.0.1',
          port: 7478,
          credentialPath: '/state/machine-credential.token',
          credentialProvision: 'minted',
          close: async () => { closes += 1; },
        },
      };
    },
    ...overrides,
  };
  return { deps, calls, daemonOptions: () => daemonOptions, materializeOptions: () => materializeOptions, closes: () => closes, setObserver: (next) => { observer = next; } };
}

/** Resolves once `main` has registered both signal listeners, which it does
 * only after the daemon started. It throws, naming which, when `main`
 * finishes first or does not get there within `boundMs`; the poll stops on
 * either, so a failed run leaves no timer behind. */
async function started(run: Promise<number>, fake: ReturnType<typeof fakeIo>, boundMs: number = WAIT_MS): Promise<void> {
  if (boundMs === WAIT_MS) chargeWait(); // the two bounds the tests of `started` itself pass are not waits of theirs
  let exitCode: number | undefined;
  void run.then((code) => { exitCode = code; }, () => { exitCode = -1; });
  const deadline = Date.now() + boundMs;
  while (fake.registered() < 2 && exitCode === undefined && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 5));
  if (fake.registered() >= 2) return;
  if (exitCode !== undefined) throw new Error(`main finished with exit code ${exitCode} before it served`);
  throw new Error(`main was not serving within ${boundMs} ms`);
}

/** The route `main` registered for a method and path, called as the daemon would. */
function routeOf(h: Harness, method: Route['method'], path: string): Route {
  const route = (h.daemonOptions()?.routes ?? []).find((candidate) => candidate.method === method && candidate.path === path);
  if (route === undefined) throw new Error(`no route ${method} ${path}`);
  return route;
}

const LOCAL_BROWSER = { host: '127.0.0.1:7478', origin: 'http://127.0.0.1:7478' };

async function get(route: Route): Promise<{ readonly status: number; readonly body: string }> {
  return route.handle({ request: { method: route.method, path: route.path, query: new URLSearchParams(), headers: LOCAL_BROWSER } });
}

describe('main(argv, io): early exits', () => {
  it('prints the usage on --help and exits 0 without touching a collaborator', async () => {
    const fake = fakeIo();
    const h = harness();
    expect(await main(['--help'], fake.io, h.deps)).toBe(0);
    expect(fake.out()).toContain('Usage: npm run poc -- --repo <absolute-path-to-butlers> [options]');
    expect(fake.out()).toContain('--watch             re-observe each time Enter is pressed on this console, and only then');
    expect(fake.err()).toBe('');
    expect(h.calls).toEqual([]);
  });

  it('refuses an unknown argument with the usage on stderr and exits 1', async () => {
    const fake = fakeIo();
    const h = harness();
    expect(await main(['--frobnicate'], fake.io, h.deps)).toBe(1);
    expect(fake.out()).toBe('');
    expect(fake.err()).toMatch(/^syzygy POC: .+\n\nsyzygy three-surface POC \(local, non-release\)\n/);
    expect(h.calls).toEqual([]);
  });

  it('refuses a repository path that cannot be resolved before the gate is consulted', async () => {
    const fake = fakeIo();
    const h = harness();
    expect(await main(['--repo', join(scratch, 'does', 'not', 'exist')], fake.io, h.deps)).toBe(1);
    expect(fake.err()).toBe('syzygy POC: configured repository is not readable\n');
    expect(h.calls).toEqual([]);
  });
});

describe('main(argv, io): the P1 authority gate', () => {
  it('a rejected binding exits 1 and reaches no observation, model, daemon or state directory', async () => {
    const fake = fakeIo();
    const stateDir = join(scratch, 'never-created-state');
    // The fake daemon refuses to start after creating its state directory, so a
    // bypassed gate ends the run at once instead of serving, and the directory
    // shows the daemon was reached.
    const h = harness(
      { resolveBinding: (locator) => { h.calls.push(`bind ${locator}`); return { kind: 'rejected', reason: 'locator-mismatched' }; } },
      { daemonMakesStateDir: true, start: { started: false, failure: { kind: 'duplicate-route', detail: 'unused' } } },
    );
    expect(await main(['--repo', repoRoot, '--state-dir', stateDir], fake.io, h.deps)).toBe(1);
    expect(fake.err()).toBe('syzygy POC: configured repository authority rejected (locator-mismatched)\n');
    expect(fake.out()).toBe('');
    expect(h.calls).toEqual([`bind ${repoRoot}`]);
    expect(existsSync(stateDir)).toBe(false);
  });

  it('the shipped collaborators reject a directory that is not the registered repository', async () => {
    const fake = fakeIo();
    expect(await main(['--repo', repoRoot], fake.io)).toBe(1);
    expect(fake.err()).toMatch(/^syzygy POC: configured repository authority rejected \((locator-mismatched|binding-unreadable)\)\n$/);
    expect(fake.out()).toBe('');
  });
});

describe('main(argv, io): startup refusals after the gate', () => {
  it('names a dirty observer checkout and starts no daemon', async () => {
    const fake = fakeIo();
    const h = harness({}, { observer: observation('observer-rev', ['apps/three-surface-poc/src/main.ts']) });
    expect(await main(['--repo', repoRoot], fake.io, h.deps)).toBe(1);
    expect(fake.err()).toBe('syzygy POC: POC runtime inputs have uncommitted changes\n');
    expect(h.calls).toEqual([`bind ${repoRoot}`, `observe ${repoRoot}`, `observe ${OBSERVER_ROOT}`]);
  });

  it('names a git failure with its exit status, never its message', async () => {
    const fake = fakeIo();
    const h = harness({ observeGitRepository: () => { throw Object.assign(new Error('fatal: secret path'), { status: 128 }); } });
    expect(await main(['--repo', repoRoot], fake.io, h.deps)).toBe(1);
    expect(fake.err()).toBe('syzygy POC: a required git revision could not be observed (git exit 128)\n');
  });

  it('lets a horizon failure at startup reject, as the script it replaced did', async () => {
    const fake = fakeIo();
    const h = harness({ observeGitHorizon: () => { throw new Error('horizon exploded'); } });
    await expect(main(['--repo', repoRoot], fake.io, h.deps)).rejects.toThrow('horizon exploded');
    expect(fake.err()).toBe('');
  });

  it('reports a model failure by its observation kind and exits 1', async () => {
    const fake = fakeIo();
    const h = harness({ buildProductionPocModel: () => { throw new PocObservationError('required-artifact-missing', 'a/b.md', 'gone'); } });
    expect(await main(['--repo', repoRoot], fake.io, h.deps)).toBe(1);
    expect(fake.err()).toBe('syzygy POC: observation failed (required-artifact-missing): a/b.md: gone\n');
  });

  it('reports a bare observation error by its kind alone', async () => {
    const fake = fakeIo();
    const h = harness({ buildProductionPocModel: () => { throw new PocObservationError('required-artifact-unreadable'); } });
    expect(await main(['--repo', repoRoot], fake.io, h.deps)).toBe(1);
    expect(fake.err()).toBe('syzygy POC: observation failed (required-artifact-unreadable)\n');
  });

  it('reports an observation error with a detail and no artifact path without a placeholder', async () => {
    const fake = fakeIo();
    const h = harness({ buildProductionPocModel: () => { throw new PocObservationError('invalid-seed-graph', undefined, 'two roots'); } });
    expect(await main(['--repo', repoRoot], fake.io, h.deps)).toBe(1);
    expect(fake.err()).toBe('syzygy POC: observation failed (invalid-seed-graph): two roots\n');
  });

  it('reports an unexpected failure by its class only', async () => {
    const fake = fakeIo();
    const h = harness({ buildProductionPocModel: () => { throw new TypeError('/private/path leaked'); } });
    expect(await main(['--repo', repoRoot], fake.io, h.deps)).toBe(1);
    expect(fake.err()).toBe('syzygy POC: observation failed (unexpected observation failure (TypeError))\n');
  });

  it('reports a daemon that did not start with its named kind and exits 1', async () => {
    const fake = fakeIo();
    const h = harness({}, { start: { started: false, failure: { kind: 'duplicate-route', detail: 'two routes registered for `GET /polaris`' } } });
    expect(await main(['--repo', repoRoot], fake.io, h.deps)).toBe(1);
    expect(fake.err()).toBe('syzygy POC: daemon did not start (duplicate-route: two routes registered for `GET /polaris`)\n');
    expect(fake.out()).toBe('');
  });
});

describe('main(argv, io): serving', () => {
  it('prints the banner, registers the three route groups, and closes once on the first signal', async () => {
    const fake = fakeIo();
    const h = harness({}, { readiness: EVALUATED });
    const stateDir = join(scratch, 'state');
    const run = main(['--repo', repoRoot, '--state-dir', stateDir, '--port', '0'], fake.io, h.deps);
    await started(run, fake);

    expect(fake.out()).toBe([
      'Syzygy Three-Surface POC: http://127.0.0.1:7478/',
      `Observed repository: ${repoRoot}`,
      'Observed revision: butlers-rev',
      'Walkthrough surface version: surface-version-literal',
      'Walkthrough evaluation identity: evaluation-identity-literal',
      'Machine endpoint: http://127.0.0.1:7478/api/poc',
      'Machine credential (minted) at: /state/machine-credential.token',
      'Credential value is never printed. POC is local, experimental, and non-release.',
      '',
    ].join('\n'));
    expect(h.daemonOptions()?.stateDir).toBe(stateDir);
    expect(h.daemonOptions()?.port).toBe(0);
    const routes = (h.daemonOptions()?.routes ?? []).map((route) => `${route.method} ${route.path}`);
    for (const expected of ['GET /polaris', 'GET /trajectory', 'GET /orrery', 'GET /api/poc', 'POST /trajectory/materialize', 'POST /polaris/reobserve']) {
      expect(routes).toContain(expected);
    }
    expect(h.calls).toEqual([
      `bind ${repoRoot}`,
      `observe ${repoRoot}`,
      `observe ${OBSERVER_ROOT}`,
      `horizon ${repoRoot} butlers-rev`,
      `model 1 butlers-rev ${repoRoot} ${OBSERVER_ROOT} ${NOW}`,
      `observatory ${OBSERVER_ROOT} observer-rev`,
      'daemon',
    ]);

    fake.signal('SIGINT');
    expect(await run).toBe(0);
    fake.signal('SIGTERM');
    expect(h.closes()).toBe(1);
    expect(fake.out().endsWith('syzygy POC: SIGINT received, shutting down\n')).toBe(true);
    expect(fake.out().split('received, shutting down').length - 1).toBe(1);
    expect(fake.err()).toBe('');
  }, TEST_TIMEOUT_MS);

  it('prints no walkthrough binding while readiness is not evaluated', async () => {
    const fake = fakeIo();
    const h = harness();
    const run = main(['--repo', repoRoot, '--state-dir', join(scratch, 'state')], fake.io, h.deps);
    await started(run, fake);
    expect(fake.out()).not.toContain('Walkthrough');
    expect(h.daemonOptions()?.port).toBe(7478);
    fake.signal('SIGTERM');
    expect(await run).toBe(0);
    expect(fake.out().endsWith('syzygy POC: SIGTERM received, shutting down\n')).toBe(true);
  }, TEST_TIMEOUT_MS);

  it('defaults the state directory to a per-repository directory under the OS temp directory', async () => {
    const fake = fakeIo();
    const h = harness();
    const run = main(['--repo', repoRoot, '--port', '0'], fake.io, h.deps);
    await started(run, fake);
    const digest = createHash('sha256').update(repoRoot).digest('hex').slice(0, 16);
    expect(h.daemonOptions()?.stateDir).toBe(join(tmpdir(), 'syzygy-three-surface-poc', digest));
    fake.signal('SIGINT');
    await run;
  }, TEST_TIMEOUT_MS);

  it('attaches the Enter console to io only with --watch, and a dirty re-observation keeps the prior evaluation', async () => {
    const fake = fakeIo();
    const h = harness();
    const run = main(['--repo', repoRoot, '--state-dir', join(scratch, 'state'), '--port', '0', '--watch'], fake.io, h.deps);
    await started(run, fake);
    expect(fake.out()).toContain('Press Enter to re-observe. Nothing re-observes on its own;');
    const before = fake.out().length;
    // The next observer read reports a runtime input changed.
    h.setObserver(observation('observer-rev', ['packages/cap1-daemon/src/server.ts']));
    fake.stdin.write('\n');
    const refusal = 'Re-observation unavailable: Unknown — POC runtime inputs are dirty; re-observation was refused. The prior complete evaluation remains served.\n';
    await waitedFor(() => expect(fake.out().slice(before)).toContain(refusal));
    expect(fake.out().slice(before)).toContain('Re-observing…\n');
    fake.signal('SIGINT');
    expect(await run).toBe(0);
  }, TEST_TIMEOUT_MS);

  it('prints no console prompt and ignores Enter without --watch', async () => {
    const fake = fakeIo();
    const h = harness();
    const run = main(['--repo', repoRoot, '--state-dir', join(scratch, 'state'), '--port', '0'], fake.io, h.deps);
    await started(run, fake);
    const before = fake.out();
    expect(before).not.toContain('Press Enter');
    fake.stdin.write('\n');
    // Nothing is listening to the console, and every fake resolves in the same
    // turn: a console that acted on Enter would have written by now.
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
    expect(fake.out()).toBe(before);
    expect(h.calls).toHaveLength(7);
    fake.signal('SIGINT');
    await run;
  }, TEST_TIMEOUT_MS);
});

// The gate returns the locator it bound, and PWB-REQ-001's binding holds only
// while everything after it reads that locator. These cases bind a locator
// that is not the configured --repo and not the observer checkout, so an
// argument taken from either is a different string.
describe('main(argv, io): the bound locator reaches every repository-rooted argument', () => {
  const BOUND = '/bound/butlers-checkout';
  const bindTo = (h: () => Harness) => (locator: string) => {
    h().calls.push(`bind ${locator}`);
    return { kind: 'bound' as const, locator: BOUND, gitCommonDirectory: join(BOUND, '.git') };
  };
  const digest16 = (path: string) => createHash('sha256').update(path).digest('hex').slice(0, 16);

  it('observes, builds, names, materializes and re-evaluates against the bound locator', async () => {
    let tick = 0;
    const fake = fakeIo(() => `2026-10-22T09:0${tick++}:00.000Z`);
    const h: Harness = harness({ resolveBinding: bindTo(() => h) });
    const run = main(['--repo', repoRoot, '--port', '0'], fake.io, h.deps);
    await started(run, fake);

    const stateDir = join(tmpdir(), 'syzygy-three-surface-poc', digest16(BOUND));
    expect(digest16(BOUND)).not.toBe(digest16(repoRoot));
    expect(fake.out()).toContain(`Observed repository: ${BOUND}\n`);
    expect(h.daemonOptions()?.stateDir).toBe(stateDir);
    expect(h.calls).toEqual([
      `bind ${repoRoot}`,
      `observe ${BOUND}`,
      `observe ${OBSERVER_ROOT}`,
      `horizon ${BOUND} butlers-rev`,
      `model 1 butlers-rev ${BOUND} ${OBSERVER_ROOT} 2026-10-22T09:00:00.000Z`,
      `observatory ${OBSERVER_ROOT} observer-rev`,
      'daemon',
    ]);

    // The materialize action writes to, and is told about, the bound repository.
    const materialize = h.materializeOptions();
    expect(materialize?.targetRepoRoot).toBe(BOUND);
    expect(materialize?.stateDir()).toBe(stateDir);

    // A materialize rebuilds the model at the bound repository's horizon, on
    // the injected clock, and names the change against that repository.
    const before = h.calls.length;
    materialize?.onMaterialized();
    expect(h.calls.slice(before)).toEqual([
      `horizon ${BOUND} butlers-rev`,
      `model 2 butlers-rev ${BOUND} ${OBSERVER_ROOT} 2026-10-22T09:01:00.000Z`,
      `change ${BOUND} butlers-rev-build-1 butlers-rev-build-2`,
      `observatory ${OBSERVER_ROOT} observer-rev`,
    ]);

    fake.signal('SIGINT');
    expect(await run).toBe(0);
  }, TEST_TIMEOUT_MS);

  it('serves the requirement text the bound repository returns for the object it asks for, and withholds the purpose prose', async () => {
    const fake = fakeIo();
    const model = buildFixtureModel(fixtureDirectories, {
      projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit(PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC) },
    });
    const h: Harness = harness({ resolveBinding: bindTo(() => h) }, { model: () => model });
    blobReader.roots.length = 0;
    blobReader.objectIds.length = 0;
    // The baseline spec's blob, served for its exact (SHA-1) object id only.
    blobReader.serve = (objectId) => objectId === 'ffcbf1c2ab91c30ee33ff2bcd1844fc5f6132b38'
      ? new TextEncoder().encode(PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC['openspec/specs/switchboard-identity/spec.md'])
      : undefined;
    const run = main(['--repo', repoRoot, '--state-dir', join(scratch, 'state'), '--port', '0'], fake.io, h.deps);
    await started(run, fake);

    const response = await get(routeOf(h, 'GET', '/polaris'));
    expect(response.status).toBe(200);
    expect(blobReader.roots).toEqual([BOUND]);
    expect(blobReader.objectIds).toEqual(['ffcbf1c2ab91c30ee33ff2bcd1844fc5f6132b38']);
    expect(response.body).toContain('The switchboard SHALL resolve the sender of every inbound message to an entity.');
    expect(response.body).toContain('The routing log SHALL carry the resolved entity.');
    expect(response.body).not.toContain('PURPOSE-PROSE-NEVER-RENDERED');

    fake.signal('SIGINT');
    expect(await run).toBe(0);
  }, TEST_TIMEOUT_MS);

  it('resolves a relative --state-dir for the daemon and for the materialize action alike', async () => {
    const fake = fakeIo();
    const h = harness();
    const run = main(['--repo', repoRoot, '--state-dir', join('relative', 'poc-state'), '--port', '0'], fake.io, h.deps);
    await started(run, fake);

    const stateDir = h.daemonOptions()?.stateDir ?? '';
    expect(isAbsolute(stateDir)).toBe(true);
    expect(stateDir).toBe(join(process.cwd(), 'relative', 'poc-state'));
    expect(h.materializeOptions()?.stateDir()).toBe(stateDir);

    fake.signal('SIGINT');
    expect(await run).toBe(0);
  }, TEST_TIMEOUT_MS);
});

describe('main(argv, io): the human pages carry what the daemon and the session know', () => {
  it('names the credential provision and the latest named re-evaluation, before and after a materialize', async () => {
    const fake = fakeIo();
    const base = buildFixtureModel(fixtureDirectories);
    // A rebuild must mint a new evaluation identity, as the real one does.
    const rebuilt = { ...base, evaluation: { ...base.evaluation, snapshot: `${base.evaluation.snapshot}-rebuilt` } };
    const h = harness({}, { model: (build) => (build === 1 ? base : rebuilt) });
    const run = main(['--repo', repoRoot, '--state-dir', join(scratch, 'state'), '--port', '0'], fake.io, h.deps);
    await started(run, fake);

    const page = routeOf(h, 'GET', '/');
    const first = (await get(page)).body;
    expect(first).toContain('credential minted;');
    expect(first).toContain('Observed-project limb: no prior evaluation this run; observatory limb: 0 Syzygy commits since build observer-rev;');

    h.materializeOptions()?.onMaterialized();
    const second = (await get(page)).body;
    expect(second).toContain('credential minted;');
    expect(second).toContain('Observed-project limb: 1 changed, 0 added since the superseded evaluation; observatory limb: 0 Syzygy commits since build observer-rev;');

    fake.signal('SIGINT');
    expect(await run).toBe(0);
  }, TEST_TIMEOUT_MS);
});

// syzygy-bpyt.5.9: reach of the two POST /polaris/reobserve
// handlers (the human path and the tailnet-mount path). reobserve-action.test.ts
// drives the handler with a stub `reobserve`; these drive the pair `main`
// registered, wired to its real session, so a handler that is dropped,
// pointed at the wrong session or stripped of its origin check fails here.
describe('main(argv, io): the POST /polaris/reobserve handlers main registers', () => {
  const TAILNET = { host: 'tzeusy.parrot-hen.ts.net', origin: 'https://tzeusy.parrot-hen.ts.net' };
  const OBSERVED_AT = '2026-08-30T12:00:00Z';
  const ID_TAIL = `\\|observed:${OBSERVED_AT}`;
  const BASE_ID = new RegExp(`repository:butlers-configured-poc@fixture\\|inputs:sha256:[0-9a-f]{64}${ID_TAIL}`);

  /** Build 1 is the fixture model; every later build is a distinct evaluation, as a real re-observation's is. */
  const distinctBuilds = (): ((build: number) => PocModel) => {
    const base = buildFixtureModel(fixtureDirectories);
    return (build) => (build === 1 ? base : { ...base, evaluation: { ...base.evaluation, snapshot: `${base.evaluation.snapshot}-build-${build}` } });
  };

  async function post(route: Route, headers: Record<string, string>): Promise<{ readonly status: number; readonly contentType: string; readonly body: string }> {
    return route.handle({ request: { method: 'POST', path: route.path, query: new URLSearchParams(), headers } });
  }

  const attributes = (body: string) => ({
    evaluation: /data-reobserve-evaluation="([^"]*)"/.exec(body)?.[1],
    supersedes: /data-reobserve-supersedes="([^"]*)"/.exec(body)?.[1],
  });
  const servedSnapshot = async (h: Harness): Promise<string> => (JSON.parse((await get(routeOf(h, 'GET', '/api/poc'))).body) as { evaluation: { snapshot: string } }).evaluation.snapshot;

  async function serve(options: Parameters<typeof harness>[1] = {}) {
    const fake = fakeIo();
    const h = harness({}, { model: distinctBuilds(), ...options });
    const run = main(['--repo', repoRoot, '--state-dir', join(scratch, 'state'), '--port', '0'], fake.io, h.deps);
    await started(run, fake);
    const stop = async (): Promise<void> => { fake.signal('SIGINT'); expect(await run).toBe(0); };
    return { h, stop };
  }

  it('the human path re-observes through the session, names the superseded evaluation and swaps the served model', async () => {
    const { h, stop } = await serve();
    const before = await servedSnapshot(h);
    expect(before).toMatch(/^repository:butlers-configured-poc@fixture\|inputs:sha256:[0-9a-f]{64}$/);

    const response = await post(routeOf(h, 'POST', '/polaris/reobserve'), LOCAL_BROWSER);

    expect(response.status).toBe(200);
    expect(response.contentType).toBe('text/html; charset=utf-8');
    const { evaluation, supersedes } = attributes(response.body);
    expect(evaluation).toMatch(new RegExp(`^repository:butlers-configured-poc@fixture\\|inputs:sha256:[0-9a-f]{64}-build-2${ID_TAIL}$`));
    expect(supersedes).toMatch(BASE_ID);
    expect(response.body).toContain('<h1>Re-observed</h1>');
    expect(response.body).toContain('<li>Butlers HEAD: 2ade4e966635973c82defd6bbeb21bfe6e69fdc3 (unchanged)</li>');
    expect(response.body).toContain('<li>Observed-project limb: 1 changed, 0 added since the superseded evaluation</li>');
    expect(response.body).toContain('<li>Observatory limb: 0 Syzygy commits since build observer-rev</li>');
    expect(response.body).toContain('<a href="/polaris">Back to Polaris</a>');
    expect(await servedSnapshot(h)).toBe(`${before}-build-2`);
    expect(h.calls.filter((call) => call.startsWith('model '))).toHaveLength(2);
    await stop();
  }, TEST_TIMEOUT_MS);

  it('the tailnet-mount path is the same handler, answering with mount-prefixed links', async () => {
    const { h, stop } = await serve();

    const response = await post(routeOf(h, 'POST', '/butlers-syzygy/polaris/reobserve'), TAILNET);

    expect(response.status).toBe(200);
    expect(attributes(response.body).evaluation).toMatch(new RegExp(`-build-2${ID_TAIL}$`));
    expect(attributes(response.body).supersedes).toMatch(BASE_ID);
    expect(response.body).toContain('<a href="/butlers-syzygy/polaris">Back to Polaris</a>');
    expect((await servedSnapshot(h)).endsWith('-build-2')).toBe(true);
    await stop();
  }, TEST_TIMEOUT_MS);

  it('both paths refuse a cross-origin request before any re-observation runs', async () => {
    const { h, stop } = await serve();
    const before = await servedSnapshot(h);
    const calls = h.calls.length;

    for (const [path, headers] of [
      ['/polaris/reobserve', { host: '127.0.0.1:7478', origin: 'http://poc.attacker.invalid' }],
      ['/butlers-syzygy/polaris/reobserve', { host: 'tzeusy.parrot-hen.ts.net', origin: 'https://poc.attacker.invalid' }],
    ] as const) {
      expect(await post(routeOf(h, 'POST', path), headers)).toEqual({ status: 403, contentType: 'application/json', body: '{"served":"nothing","reason":"browser-origin-refused"}' });
    }

    expect(h.calls).toHaveLength(calls);
    expect(await servedSnapshot(h)).toBe(before);
    await stop();
  }, TEST_TIMEOUT_MS);

  it('a refused re-observation answers 502 with the named reason and keeps the prior evaluation served', async () => {
    const { h, stop } = await serve();
    const before = await servedSnapshot(h);
    h.setObserver(observation('observer-rev', ['packages/cap1-daemon/src/server.ts']));

    const response = await post(routeOf(h, 'POST', '/polaris/reobserve'), LOCAL_BROWSER);

    expect(response.status).toBe(502);
    expect(response.body).toContain('<p data-reobserve-reason="POC runtime inputs are dirty; re-observation was refused">Unknown — POC runtime inputs are dirty; re-observation was refused. The prior complete evaluation remains served.</p>');
    expect(response.body).toContain('<a href="/polaris">Back to Polaris</a>');
    expect(await servedSnapshot(h)).toBe(before);
    expect(h.calls.filter((call) => call.startsWith('model '))).toHaveLength(1);
    await stop();
  }, TEST_TIMEOUT_MS);
});

describe('started(): the wait for main to serve', () => {
  it('reports a run that finished first, at once and by name', async () => {
    const fake = fakeIo();
    const run = main(['--help'], fake.io, harness().deps);
    // A bound past this test's own timeout: a report made at the bound, not at once, fails as "Test timed out".
    await expect(started(run, fake, 2 * TEST_TIMEOUT_MS)).rejects.toThrow('main finished with exit code 0 before it served');
  }, TEST_TIMEOUT_MS);

  it('gives up after its bound on a run that neither serves nor finishes', async () => {
    const fake = fakeIo();
    const h = harness({ createDaemon: () => new Promise(() => undefined) });
    const run = main(['--repo', repoRoot, '--state-dir', join(scratch, 'state'), '--port', '0'], fake.io, h.deps);
    await expect(started(run, fake, 50)).rejects.toThrow('main was not serving within 50 ms');
  }, 2_000); // its own bound is 50 ms
});

interface RegisteredTest {
  readonly name: string;
  readonly timeoutMs: number;
  readonly passed: boolean;
}

/** The tests, by full name, with the timeout vitest registered for each. */
function registeredTests(tasks: readonly RunnerTask[], prefix: readonly string[] = []): RegisteredTest[] {
  return tasks.flatMap((task) => {
    if (task.type === 'suite') return registeredTests(task.tasks, [...prefix, task.name]);
    if (task.type !== 'test') return [];
    return [{ name: [...prefix, task.name].join(' > '), timeoutMs: task.timeout, passed: task.result?.state === 'pass' }];
  });
}

/**
 * What breaks the bound relation: a test whose summed waits reach its timeout
 * (a slow host would then end it as "Test timed out"), and a passed test that
 * carries TEST_TIMEOUT_MS yet charged no wait (the charge would then have
 * gone missing, and with it the check).
 */
function boundViolations(budgets: ReadonlyMap<string, number>, tests: readonly RegisteredTest[]): string[] {
  const timeouts = new Map(tests.map((test) => [test.name, test.timeoutMs]));
  const outlasting = [...budgets].filter(([name, budget]) => budget >= (timeouts.get(name) ?? 0))
    .map(([name, budget]) => `${name}: waits up to ${budget} ms, timeout ${timeouts.get(name) ?? 'unregistered'} ms`);
  // The tests of `started` itself pass their own bounds, so they charge none.
  const uncharged = tests.filter((test) => test.passed && test.timeoutMs === TEST_TIMEOUT_MS && !budgets.has(test.name) && !test.name.startsWith('started(): '))
    .map((test) => `${test.name}: carries TEST_TIMEOUT_MS but charged no wait`);
  return [...outlasting, ...uncharged];
}

describe('the wait bounds of this file', () => {
  const GUARDED: RegisteredTest = { name: 'a > guarded', timeoutMs: 30_000, passed: true };

  it('flags a test whose waits reach its timeout, a default-timeout waiter, and a charge that went missing', () => {
    expect(boundViolations(new Map([['a > guarded', 20_000]]), [GUARDED])).toEqual([]);
    expect(boundViolations(new Map([['a > guarded', 30_000]]), [GUARDED])).toEqual(['a > guarded: waits up to 30000 ms, timeout 30000 ms']);
    expect(boundViolations(new Map([['a > guarded', 10_000]]), [{ ...GUARDED, timeoutMs: 5_000 }])).toEqual(['a > guarded: waits up to 10000 ms, timeout 5000 ms']);
    expect(boundViolations(new Map(), [GUARDED])).toEqual(['a > guarded: carries TEST_TIMEOUT_MS but charged no wait']);
    expect(boundViolations(new Map(), [{ ...GUARDED, passed: false }])).toEqual([]);
  });

  // Last in the file: it reads what the tests above charged.
  it('holds for every test that waited, with the timeout vitest registered', ({ task }) => {
    const tests = registeredTests(task.file.tasks);
    expect(tests.length).toBeGreaterThan(20);
    expect(boundViolations(waitBudgets, tests)).toEqual([]);
  });
});
