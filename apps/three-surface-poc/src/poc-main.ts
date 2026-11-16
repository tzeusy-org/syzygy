import { realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { Readable, Writable } from 'node:stream';

import { closeOnSignal, createDaemon } from '@syzygy/http-host';
import {
  PocObservationError,
  type PocModel,
} from '@syzygy/three-surface-poc-core';
import { sha256 } from '@syzygy/support';

import { parsePocCli, type PocCliConfig } from './cli.js';
import {
  observeGitHorizon,
  observeGitRepository,
  observeObservatoryDrift,
  observeRevisionChange,
  pocObserverInputsAreClean,
  resolvePwbRepositoryBinding,
} from './git-observation.js';
import { launchAfterPwbRepositoryBinding } from './launcher.js';
import { materializeRoutes } from './materialize-action.js';
import { buildPocEvaluationEvidence, buildProductionPocModel, type PocRuntimeCapture } from './production-reobserve.js';
import { reobserveRoutes } from './reobserve-action.js';
import { createReobserveSession } from './reobserve-session.js';
import { pocRoutes } from './routes.js';
import { ServedResponseRecorder } from './served-response-recorder.js';
import { daemonStartDetail, gitObservationDetail, unexpectedObservationDetail } from './startup-detail.js';
import { gitBlobReaderFor, verbatimRouteReader } from './verbatim-route.js';

/** The exact binding a PWB-WALKTHROUGH-001 record must name for this
 * evaluation, printed so the recording session copies it rather than
 * invents it; absent lines mean readiness could not be evaluated. */
function walkthroughBindingLines(model: PocModel): readonly string[] {
  const readiness = model.walkthroughReadiness;
  if (readiness.kind !== 'evaluated') return [];
  const { expected } = readiness.readiness;
  return [
    `Walkthrough surface version: ${expected.surfaceVersion}`,
    `Walkthrough evaluation identity: ${expected.evaluationIdentity}`,
  ];
}

const USAGE = `syzygy three-surface POC (local, non-release)

Usage: npm run poc -- --repo <absolute-path-to-butlers> [options]

Options:
  --repo <path>       one explicit Butlers repository (required)
  --state-dir <path>  credential/state directory (default: OS temp directory)
  --port <n>          loopback TCP port; 0 selects an ephemeral port (default: 7478)
  --watch             re-observe each time Enter is pressed on this console, and only then
  --help              print this usage and exit
`;

// Test seam: exported type the tests name; production code uses it only inside this file.
/** The process surface `main` touches, so a test can drive it with fakes.
 * `main.ts`, the entry, is the one place that reads the real process and
 * the real clock. */
export interface PocIo {
  readonly stdout: Writable;
  readonly stderr: Writable;
  readonly stdin: Readable;
  readonly cwd: () => string;
  /** The observation instant, ISO 8601. */
  readonly now: () => string;
  readonly onSignal: (signal: 'SIGINT' | 'SIGTERM', listener: () => void) => void;
}

// Test seam: exported type the tests name; production code uses it only inside this file.
/** The effectful collaborators `main` composes; defaults are the real ones.
 * The tests inject fakes so no repository is read and no socket is opened. */
export interface PocMainDeps {
  readonly resolveBinding: typeof resolvePwbRepositoryBinding;
  readonly observeGitRepository: typeof observeGitRepository;
  readonly observeGitHorizon: typeof observeGitHorizon;
  readonly observeRevisionChange: typeof observeRevisionChange;
  readonly observeObservatoryDrift: typeof observeObservatoryDrift;
  readonly pocObserverInputsAreClean: typeof pocObserverInputsAreClean;
  readonly buildProductionPocModel: typeof buildProductionPocModel;
  readonly createDaemon: typeof createDaemon;
  readonly materializeRoutes: typeof materializeRoutes;
}

const REAL_DEPS: PocMainDeps = {
  resolveBinding: resolvePwbRepositoryBinding,
  observeGitRepository,
  observeGitHorizon,
  observeRevisionChange,
  observeObservatoryDrift,
  pocObserverInputsAreClean,
  buildProductionPocModel,
  createDaemon,
  materializeRoutes,
};

/** Runs the POC and resolves to the process exit code. A binding the P1
 * authority gate rejects never reaches repository observation: the serving
 * continuation is only ever called by `launchAfterPwbRepositoryBinding`.
 * `main.ts` is the one production caller; the tests drive it with a fake
 * `PocIo`. */
export async function main(argv: readonly string[], io: PocIo, deps: PocMainDeps = REAL_DEPS): Promise<number> {
  const parsed = parsePocCli(argv);
  if (parsed.kind === 'help') {
    io.stdout.write(USAGE);
    return 0;
  }
  if (parsed.kind === 'invalid') {
    io.stderr.write(`syzygy POC: ${parsed.detail}\n\n${USAGE}`);
    return 1;
  }
  let repoRoot: string;
  try {
    repoRoot = realpathSync(resolve(parsed.config.repoRoot));
  } catch {
    io.stderr.write('syzygy POC: configured repository is not readable\n');
    return 1;
  }
  const launch = await launchAfterPwbRepositoryBinding(
    repoRoot,
    deps.resolveBinding,
    (boundRepoRoot) => serveBoundRepository(boundRepoRoot, parsed.config, io, deps),
  );
  if (launch.kind === 'rejected') {
    io.stderr.write(`syzygy POC: configured repository authority rejected (${launch.reason})\n`);
    return 1;
  }
  return launch.result;
}

async function serveBoundRepository(repoRoot: string, config: PocCliConfig, io: PocIo, deps: PocMainDeps): Promise<number> {
  const observeCheckouts = (dirtyRefusal: string) => {
    const repository = deps.observeGitRepository(repoRoot);
    const observer = deps.observeGitRepository(io.cwd());
    if (!deps.pocObserverInputsAreClean(observer)) throw new Error(dirtyRefusal);
    return { repository, observer };
  };
  // The horizon read and the clock read sit outside the checkout try below,
  // as they did when this was written twice: only a checkout failure is
  // reported as a named startup refusal.
  const observeCapture = ({ repository, observer }: ReturnType<typeof observeCheckouts>): PocRuntimeCapture => {
    const horizon = deps.observeGitHorizon(repoRoot, repository.revision);
    return {
      repositoryRevision: repository.revision,
      observerRevision: observer.revision,
      workingTreeDigest: repository.worktreeMetadataDigest,
      evidence: buildPocEvaluationEvidence(io.now(), repository.revision, repository.committerInstant, horizon),
    };
  };

  let observed: ReturnType<typeof observeCheckouts>;
  try {
    observed = observeCheckouts('observer-checkout-dirty');
  } catch (cause) {
    io.stderr.write(`syzygy POC: ${gitObservationDetail(cause)}\n`);
    return 1;
  }
  const capture = observeCapture(observed);
  const stateDir = resolve(config.stateDir ?? join(
    tmpdir(),
    'syzygy-three-surface-poc',
    sha256(repoRoot).slice(0, 16),
  ));
  const buildModel = (currentCapture: PocRuntimeCapture): PocModel => deps.buildProductionPocModel({
    capture: currentCapture,
    repoRoot,
    stateDir,
    observerRoot: io.cwd(),
  });

  try {
    const servedResponses = new ServedResponseRecorder();
    let credentialProvision: 'minted' | 'reused' | undefined;
    // syzygy-u05.2: every evaluation is a named re-evaluation result
    // carrying the identity it supersedes, the three clocks and the
    // two staleness limbs. The observatory limb counts Syzygy commits
    // since the revision this daemon was started from.
    const buildRevision = capture.observerRevision;
    const session = createReobserveSession({
      capture,
      build: buildModel,
      observe: async () => observeCapture(observeCheckouts('POC runtime inputs are dirty; re-observation was refused')),
      observeHorizon: (pinned) => deps.observeGitHorizon(repoRoot, pinned),
      observeRevisionChange: (from, to) => deps.observeRevisionChange(repoRoot, from, to),
      observeObservatory: () => deps.observeObservatoryDrift(io.cwd(), buildRevision),
      now: io.now,
    });
    const start = await deps.createDaemon({
      stateDir,
      port: config.port,
      routes: [
        // PWB-REQ-011 (amended): Polaris's transient exact-requirement
        // route — the observed shape's own admitted baseline-spec object,
        // read at render and never stored.
        ...pocRoutes(session.model, undefined, (current) => ({ verbatim: verbatimRouteReader(current, gitBlobReaderFor(repoRoot)) }), servedResponses, () => credentialProvision, session.latest),
        ...deps.materializeRoutes({
          getModel: session.model,
          targetRepoRoot: repoRoot,
          stateDir: () => stateDir,
          onMaterialized: session.afterMaterialized,
        }),
        ...reobserveRoutes({ reobserve: session.reobserve }),
      ],
    });
    if (!start.started) {
      io.stderr.write(`syzygy POC: daemon did not start (${start.failure.kind}: ${daemonStartDetail(start.failure)})\n`);
      return 1;
    }
    const daemon = start.daemon;
    credentialProvision = daemon.credentialProvision;
    io.stdout.write(
      [
        `Syzygy Three-Surface POC: http://${daemon.host}:${daemon.port}/`,
        `Observed repository: ${repoRoot}`,
        `Observed revision: ${capture.repositoryRevision}`,
        ...walkthroughBindingLines(session.model()),
        `Machine endpoint: http://${daemon.host}:${daemon.port}/api/poc`,
        `Machine credential (${daemon.credentialProvision}) at: ${daemon.credentialPath}`,
        'Credential value is never printed. POC is local, experimental, and non-release.',
        '',
      ].join('\n'),
    );
    void session.startConsole(config.watch, { input: io.stdin, output: io.stdout });

    await closeOnSignal(daemon, {
      onSignal: (signal, listener) => { io.onSignal(signal, listener); },
      announce: (signal) => { io.stdout.write(`syzygy POC: ${signal} received, shutting down\n`); },
    });
    return 0;
  } catch (cause) {
    if (cause instanceof PocObservationError) {
      const suffix = [cause.artifactPath, cause.detail]
        .filter((part): part is string => part !== undefined)
        .map((part) => `: ${part}`)
        .join('');
      io.stderr.write(`syzygy POC: observation failed (${cause.kind})${suffix}\n`);
    } else {
      io.stderr.write(`syzygy POC: observation failed (${unexpectedObservationDetail(cause)})\n`);
    }
    return 1;
  }
}
