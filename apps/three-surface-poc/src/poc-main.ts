import { realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import type { Readable, Writable } from 'node:stream';

import { closeOnSignal, createDaemon } from '@syzygy/http-host';
import {
  PocObservationError,
  type PocModel,
} from '@syzygy/three-surface-poc-core';
import { sha256 } from '@syzygy/support';

import { parsePocCli, type PocCliConfig } from './cli.js';
import { authorizePwbLocator, type ConsentBinding } from './consent-locator.js';
import {
  observeGitHorizon,
  observeGitRepository,
  observeObservatoryDrift,
  observeRevisionChange,
  pocObserverInputsAreClean,
  resolvePwbRepositoryBinding,
  type PwbRepositoryBinding,
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
  readonly authorizePwbLocator: typeof authorizePwbLocator;
  readonly resolvePhysicalPath: (path: string) => string;
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
  authorizePwbLocator,
  resolvePhysicalPath: (path) => realpathSync(resolve(path)),
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
  let configuredLocator: string;
  try {
    configuredLocator = deps.resolvePhysicalPath(parsed.config.repoRoot);
  } catch {
    io.stderr.write('syzygy POC: configured repository is not readable\n');
    return 1;
  }
  let observer: ReturnType<typeof observeObserver>;
  try {
    observer = observeObserver(configuredLocator, io, deps, 'observer-checkout-dirty');
  } catch (cause) {
    io.stderr.write(`syzygy POC: ${gitObservationDetail(cause)}\n`);
    return 1;
  }
  if (observer.grant.kind === 'rejected') {
    io.stderr.write(`syzygy POC: configured repository authority rejected (${observer.grant.reason})\n`);
    return 1;
  }
  const grant = observer.grant;
  const launch = await launchAfterPwbRepositoryBinding(
    configuredLocator,
    (locator) => deps.resolveBinding(locator, { approvedLocator: grant.locator }),
    (binding) => serveBoundRepository(binding, { ...observer, grant }, parsed.config, io, deps),
  );
  if (launch.kind === 'rejected') {
    io.stderr.write(`syzygy POC: configured repository authority rejected (${launch.reason})\n`);
    return 1;
  }
  return launch.result;
}

function containsCheckout(parent: string, child: string): boolean {
  const remainder = relative(parent, child);
  return remainder !== '..' && !remainder.startsWith(`..${sep}`) && !isAbsolute(remainder);
}

function observeObserver(configuredLocator: string, io: PocIo, deps: PocMainDeps, dirtyRefusal: string) {
  const repoRoot = deps.resolvePhysicalPath(io.cwd());
  // Git searches upwards from a subdirectory. Keep the governance read on
  // a physically separate checkout even if --repo or cwd used an alias.
  if (containsCheckout(repoRoot, configuredLocator) || containsCheckout(configuredLocator, repoRoot)) {
    throw new Error('observer-checkout-overlaps-configured-repository');
  }
  const observer = deps.observeGitRepository(repoRoot);
  if (!deps.pocObserverInputsAreClean(observer)) throw new Error(dirtyRefusal);
  // Keep the governance revision and evaluation instant paired throughout a capture.
  const evaluationInstant = io.now();
  return {
    repoRoot,
    revision: observer.revision,
    evaluationInstant,
    grant: deps.authorizePwbLocator({ repoRoot, governanceRevision: observer.revision, evaluationInstant }),
  };
}

type AdmittedObserver = Omit<ReturnType<typeof observeObserver>, 'grant'> & {
  readonly grant: Extract<ConsentBinding, { readonly kind: 'admitted' }>;
};

async function serveBoundRepository(
  binding: Extract<PwbRepositoryBinding, { readonly kind: 'bound' }>,
  initialObserver: AdmittedObserver,
  config: PocCliConfig,
  io: PocIo,
  deps: PocMainDeps,
): Promise<number> {
  const repoRoot = binding.locator;
  // Only a checkout failure is reported as a named startup refusal.
  const observeCapture = (repository: ReturnType<typeof observeGitRepository>, observer: AdmittedObserver): PocRuntimeCapture => {
    const horizon = deps.observeGitHorizon(repoRoot, repository.revision);
    return {
      repositoryRevision: repository.revision,
      observerRevision: observer.revision,
      workingTreeDigest: repository.worktreeMetadataDigest,
      authority: observer.grant.authority,
      ...(observer.grant.briefingResponseLimit === undefined ? {} : { briefingResponseLimit: observer.grant.briefingResponseLimit }),
      evidence: buildPocEvaluationEvidence(observer.evaluationInstant, repository.revision, repository.committerInstant, horizon),
    };
  };

  let observed: ReturnType<typeof observeGitRepository>;
  try {
    observed = deps.observeGitRepository(repoRoot);
  } catch (cause) {
    io.stderr.write(`syzygy POC: ${gitObservationDetail(cause)}\n`);
    return 1;
  }
  const capture = observeCapture(observed, initialObserver);
  const stateDir = resolve(config.stateDir ?? join(
    tmpdir(),
    'syzygy-three-surface-poc',
    sha256(repoRoot).slice(0, 16),
  ));
  const buildModel = (currentCapture: PocRuntimeCapture): PocModel => deps.buildProductionPocModel({
    capture: currentCapture,
    repoRoot,
    stateDir,
    observerRoot: initialObserver.repoRoot,
  });

  try {
    const servedResponses = new ServedResponseRecorder();
    let credentialProvision: 'minted' | 'reused' | undefined;
    let admitsTransientReads = true;
    // syzygy-u05.2: every evaluation is a named re-evaluation result
    // carrying the identity it supersedes, the three clocks and the
    // two staleness limbs. The observatory limb counts Syzygy commits
    // since the revision this daemon was started from.
    const buildRevision = capture.observerRevision;
    const session = createReobserveSession({
      capture,
      build: buildModel,
      observe: async () => {
        admitsTransientReads = false;
        let configuredLocator: string;
        try {
          configuredLocator = deps.resolvePhysicalPath(config.repoRoot);
        } catch {
          throw new Error('configured repository is not readable');
        }
        const observer = observeObserver(configuredLocator, io, deps, 'POC runtime inputs are dirty; re-observation was refused');
        if (observer.repoRoot !== initialObserver.repoRoot) throw new Error('observer checkout changed; restart the POC to observe it');
        const { grant } = observer;
        if (grant.kind === 'rejected') throw new Error(`configured repository authority rejected (${grant.reason})`);
        const currentBinding = deps.resolveBinding(configuredLocator, { approvedLocator: grant.locator });
        if (currentBinding.kind === 'rejected') throw new Error(`configured repository authority rejected (${currentBinding.reason})`);
        if (currentBinding.locator !== repoRoot || currentBinding.gitCommonDirectory !== binding.gitCommonDirectory) {
          throw new Error('configured repository binding changed; restart the POC to observe it');
        }
        return observeCapture(deps.observeGitRepository(repoRoot), { ...observer, grant });
      },
      onReobserved: () => { admitsTransientReads = true; },
      observeHorizon: (pinned) => deps.observeGitHorizon(repoRoot, pinned),
      observeRevisionChange: (from, to) => deps.observeRevisionChange(repoRoot, from, to),
      observeObservatory: () => deps.observeObservatoryDrift(initialObserver.repoRoot, buildRevision),
      now: io.now,
    });
    const start = await deps.createDaemon({
      stateDir,
      port: config.port,
      routes: [
        // PWB-REQ-011 (amended): Polaris's transient exact-requirement
        // route — the observed shape's own admitted baseline-spec object,
        // read at render and never stored.
        ...pocRoutes(session.model, undefined, (current) => ({
          verbatim: admitsTransientReads
            ? verbatimRouteReader(current, gitBlobReaderFor(repoRoot))
            : () => ({ refused: 'unconsented-source-or-provider', detail: 'The current repository authority is unconfirmed. No source was read.' }),
        }), servedResponses, () => credentialProvision, session.latest, () => admitsTransientReads
          ? session.briefingResponseLimit()
          : undefined),
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
