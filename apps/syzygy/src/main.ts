// syzygy — the Capability 1 local daemon entry point (RT3).
//
// Starts from a fresh clone with no prior state: observes the given
// repository root, assembles the observation → consent → evaluation
// pipeline (packages/cap1-daemon), and serves HTTP on 127.0.0.1 with
// credential-classed admission. Prints the bound address and the
// credential file's LOCATION — never the credential value.
//
// Configuration (flags win over environment; defaults last):
//   --root <dir>        observed repository root
//                       (env SYZYGY_OBSERVED_ROOT; default: cwd)
//   --state-dir <dir>   daemon state directory — the only startup
//                       write location; must NOT lie inside the
//                       observed root's `openspec/` or `.syzygy/`
//                       (env SYZYGY_STATE_DIR;
//                        default: <root>/.syzygy-daemon-state — a
//                        SIBLING of `.syzygy/`, deliberately outside
//                        the governed plane)
//   --port <n>          TCP port; 0 = ephemeral
//                       (env SYZYGY_PORT; default: 7477)
//   --help              print usage and exit
//
// One exception to all of the above: an exact first argument `dossier`
// hands the rest of argv to the dossier command family instead
// (packages/polaris-dossier), which starts no daemon.
//
// This file is the composition root: the ONE place a clock is read (the
// evaluation's as-of instant, injected into the pipeline — RFC2-3) and
// the one place process signals are handled (clean shutdown on
// SIGINT/SIGTERM).

import * as path from 'node:path';
import {
  evaluateProject,
  humanRoutes,
  machineRoutes,
  DAEMON_CAPTURE_VERSIONS,
} from '@syzygy/cap1-daemon';
import { closeOnSignal, createDaemon } from '@syzygy/http-host';
import { isArgvFault, readArgv } from '@syzygy/polaris-dossier/argv';
import { resolvePathIntent } from '@syzygy/polaris-dossier/state-directory';

const DEFAULT_PORT = 7477;
const DEFAULT_STATE_DIR_NAME = '.syzygy-daemon-state';

const USAGE = `syzygy — Capability 1 local daemon

Usage: node apps/syzygy/dist/main.js [options]

Options:
  --root <dir>        observed repository root (env SYZYGY_OBSERVED_ROOT; default: cwd)
  --state-dir <dir>   daemon state directory (env SYZYGY_STATE_DIR;
                      default: <root>/${DEFAULT_STATE_DIR_NAME});
                      refused if inside <root>/openspec or <root>/.syzygy
  --port <n>          TCP port, 0 for ephemeral (env SYZYGY_PORT; default: ${DEFAULT_PORT})
  --help              print this usage and exit
`;

interface CliConfig {
  readonly root: string;
  readonly stateDir: string;
  readonly port: number;
}

type CliParse =
  | { readonly kind: 'run'; readonly config: CliConfig }
  | { readonly kind: 'help' }
  | { readonly kind: 'invalid'; readonly detail: string };

function parseCli(argv: readonly string[], env: NodeJS.ProcessEnv): CliParse {
  const read = readArgv(argv, {
    valued: ['--root', '--state-dir', '--port'],
    stopAt: ['--help', '-h'],
    dashValue: 'take',
    repeat: 'last',
    positionals: false,
  });
  if (isArgvFault(read)) {
    const detail =
      read.fault === 'missing-value'
        ? `${read.arg} requires a value`
        : `unknown argument: ${read.arg}`;
    return { kind: 'invalid', detail };
  }
  if (read.stoppedAt !== undefined) {
    return { kind: 'help' };
  }
  const flags = read.values;

  const root = path.resolve(
    flags.get('--root') ?? env['SYZYGY_OBSERVED_ROOT'] ?? process.cwd(),
  );
  const stateDir = path.resolve(
    flags.get('--state-dir') ??
      env['SYZYGY_STATE_DIR'] ??
      path.join(root, DEFAULT_STATE_DIR_NAME),
  );

  const portText = flags.get('--port') ?? env['SYZYGY_PORT'] ?? String(DEFAULT_PORT);
  const port = Number(portText);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    return { kind: 'invalid', detail: `port must be an integer in [0, 65535]; got \`${portText}\`` };
  }

  // The state directory may never lie inside the governed plane: the
  // daemon's state writes are outside `openspec/**` and `.syzygy/**`
  // by construction, so pointing state INTO them is refused, named.
  // This lexical pass keeps parseCli pure (no filesystem); symlink
  // reality is judged by `governedPlaneViolation` in main() (RTF-1).
  for (const governed of ['openspec', '.syzygy']) {
    const governedRoot = path.join(root, governed);
    if (stateDir === governedRoot || stateDir.startsWith(governedRoot + path.sep)) {
      return {
        kind: 'invalid',
        detail: `state directory ${stateDir} lies inside the governed plane (${governedRoot}); choose a location outside openspec/ and .syzygy/`,
      };
    }
  }

  return { kind: 'run', config: { root, stateDir, port } };
}

// --- Governed-plane containment by symlink reality (RTF-1) ---------------
//
// resolvePathIntent is the dossier state directory's, the one copy
// (syzygy-bpyt.8.2): links are resolved component by component without
// requiring the target to exist, so a dangling link is judged by where it
// would land, and a loop or an unreadable component is a named failure.

/**
 * Judge the state directory's REAL location against the REAL governed
 * roots. The lexical pass in parseCli is not enough: an
 * operator-supplied symlink (`ln -s <root>/.syzygy/x /tmp/sd;
 * --state-dir /tmp/sd`) resolves lexically outside the governed plane
 * while its real target lies inside it — the credential write would
 * land in the governed plane via the link (RTF-1). Returns the named
 * refusal detail, or null when the real state dir is outside both real
 * governed roots. Read-only: no write, no directory creation.
 */
function governedPlaneViolation(root: string, stateDir: string): string | null {
  const rootResolution = resolvePathIntent(root);
  if (!rootResolution.resolved) {
    return `observed root is invalid (${rootResolution.reason}): ${rootResolution.detail}`;
  }
  const stateResolution = resolvePathIntent(stateDir);
  if (!stateResolution.resolved) {
    return `state directory is invalid (${stateResolution.reason}): ${stateResolution.detail}`;
  }

  const realRoot = rootResolution.realPath;
  const realStateDir = stateResolution.realPath;
  for (const governed of ['openspec', '.syzygy']) {
    const governedResolution = resolvePathIntent(path.join(realRoot, governed));
    if (!governedResolution.resolved) {
      return `governed root is invalid (${governedResolution.reason}): ${governedResolution.detail}`;
    }
    const governedRoot = governedResolution.realPath;
    if (realStateDir === governedRoot || realStateDir.startsWith(governedRoot + path.sep)) {
      return `state directory ${stateDir} really resolves to ${realStateDir}, inside the governed plane (${governedRoot}); choose a location outside openspec/ and .syzygy/`;
    }
  }
  return null;
}

async function main(): Promise<number> {
  // `syzygy dossier …` is the operator-agent dossier command family
  // (packages/polaris-dossier; REQ-polaris-generation-033): a local
  // program that serves no route and starts no daemon. Only an exact
  // first argument `dossier` reaches it; every other argv takes the
  // daemon path below unchanged.
  const argv = process.argv.slice(2);
  if (argv[0] === 'dossier') {
    const { runDossierCli } = await import('@syzygy/polaris-dossier');
    // `render` draws through the existing multi-page dossier renderer, injected
    // here and loaded only on this branch, so the daemon path never loads the
    // POC app. Its operator-agent entry imports nothing from the parked
    // provider island (island-boundary.test.ts in polaris-generation-core).
    // TODO(syzygy-qkea.19): import it from a renderer package once
    // the renderer stack moves out of apps/three-surface-poc.
    const { renderLocalDossier } = await import('@syzygy/three-surface-poc-app/dossier-site');
    return runDossierCli(argv.slice(1), {
      stdout: (text) => process.stdout.write(text),
      stderr: (text) => process.stderr.write(text),
    }, { renderer: renderLocalDossier });
  }

  // `syzygy polaris <url>` is the one-command launched run (prototype under
  // owner direction POLARIS-DOSSIER-ONE-COMMAND-RUN-2026-10-14): it runs the
  // `dossier` steps in process and starts the agent sessions in views.
  if (argv[0] === 'polaris') {
    const { runPolarisCli } = await import('@syzygy/polaris-dossier');
    const { renderLocalDossier } = await import('@syzygy/three-surface-poc-app/dossier-site');
    return runPolarisCli(argv.slice(1), { renderer: renderLocalDossier });
  }

  let parsed = parseCli(process.argv.slice(2), process.env);
  if (parsed.kind === 'run') {
    // Symlink reality (RTF-1): the pure lexical check in parseCli
    // cannot see links; judge the real locations here, where fs is
    // available — same named 'invalid' arm, before anything starts.
    const violation = governedPlaneViolation(parsed.config.root, parsed.config.stateDir);
    if (violation !== null) {
      parsed = { kind: 'invalid', detail: violation };
    }
  }
  if (parsed.kind === 'help') {
    process.stdout.write(USAGE);
    return 0;
  }
  if (parsed.kind === 'invalid') {
    process.stderr.write(`syzygy daemon: ${parsed.detail}\n\n${USAGE}`);
    return 1;
  }
  const { root, stateDir, port } = parsed.config;

  // The one clock read: the evaluation's as-of instant. The snapshot
  // coordinate is NOT supplied here: it is the digest of the canonical
  // manifest of everything the capture read (CAP1-REQ-042/060).
  const asOf = new Date().toISOString();

  const projectEvaluation = await evaluateProject(root, {
    asOf,
    versions: DAEMON_CAPTURE_VERSIONS,
  });

  // Both channels serve from this ONE evaluation — parity by construction
  // (CAP1-REQ-041/043): the human page, the entry document and the machine
  // endpoint share the same capture, never a request-time read.
  const getEvaluation = () => projectEvaluation;

  const start = await createDaemon({
    stateDir,
    port,
    routes: [
      ...humanRoutes({ getEvaluation }),
      ...machineRoutes({ getEvaluation }),
    ],
  });
  if (!start.started) {
    process.stderr.write(
      `syzygy daemon: failed to start (${start.failure.kind}): ${start.failure.detail}\n`,
    );
    return 1;
  }
  const daemon = start.daemon;

  process.stdout.write(
    [
      `syzygy daemon listening at http://${daemon.host}:${daemon.port}/`,
      `observed root: ${root}`,
      `machine credential (${daemon.credentialProvision}) at: ${daemon.credentialPath}`,
      'the credential value is never printed; read the file to authenticate machine requests.',
      '',
    ].join('\n'),
  );

  await closeOnSignal(daemon, {
    onSignal: (signal, listener) => { process.on(signal, listener); },
    announce: (signal) => { process.stdout.write(`syzygy daemon: ${signal} received, shutting down\n`); },
    closeFailed: (cause) => {
      process.stderr.write(
        `syzygy daemon: close failed: ${cause instanceof Error ? cause.message : String(cause)}\n`,
      );
    },
  });
  return 0;
}

process.exitCode = await main();
