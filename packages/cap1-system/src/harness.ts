// RT6 — the system-test harness (CAP1-REQ-023/053/061 external
// verification). Everything here is EXTERNAL to the daemon: it spawns
// the real compiled entry point as a child process, builds real
// repository fixtures on disk, drives real HTTP with fetch, and
// observes the filesystem with its own recursive sweep. Nothing in
// this file imports daemon or core code — the observed population is
// the harness's own record, never the subject's self-report
// (CAP1-REQ-061 oracle independence).

import { spawn, type ChildProcess } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// The repository root this suite lives in — resolved from this file's
// own location (packages/cap1-system/src → three levels up).
export const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
);

// The COMPILED daemon entry (built by `npm run build` before this suite
// runs). Relative to a repo root so the fresh-clone test can point at
// its clone's own build.
export function daemonEntry(repoRoot: string): string {
  return path.join(repoRoot, 'apps', 'syzygy', 'dist', 'main.js');
}

// --- Fixture construction -------------------------------------------------

// One complete fixture repository: a valid declaration, an in-force
// consent record granting the one declared repository, and the human
// entry document at its fixed publication location. All inputs; every
// expected OUTPUT the tests assert is a hard-coded literal in the test
// files themselves (oracle independence).
export const FIXTURE_PROJECT_ID = 'prj-sys-fixture';
export const FIXTURE_ENTRY_TEXT =
  '# Syzygy system fixture overview\n\nThis is the fixture entry document.\n';

export const FIXTURE_DECLARATION = `schema_version: "1"
project:
  id: ${FIXTURE_PROJECT_ID}
  name: System Fixture
owner: owner@example.com
repositories:
  - id: repo-governance-root
    role: governance-root
    consent: consent-gov-root
consents:
  - consent-gov-root
declarations:
  spec_root: openspec/
relations: []
profiles: []
`;

export const FIXTURE_CONSENT_RECORD = `id: consent-gov-root
project: ${FIXTURE_PROJECT_ID}
repository: repo-governance-root
scope: observe
attribution: owner
grant_state: in-force
`;

// The synthetic cap1-owner-act/v1 record beside it: an explicit state-(1)
// bootstrap act bound to the consent record's exact bytes. A FIXTURE, never
// an owner act (syzygy-u2a.2); without it the consent admits nothing.
export const FIXTURE_OWNER_ACT = `schema: "cap1-owner-act/v1"
act: "act-consent-gov-root"
project: "${FIXTURE_PROJECT_ID}"
artifact: "consent-gov-root"
artifact_digest: "sha256:${createHash('sha256').update(FIXTURE_CONSENT_RECORD).digest('hex')}"
act_type: "consent"
owner: "fixture-owner (synthetic, not an owner act)"
instant: "2026-08-01T00:00:00Z"
scope: "observe"
supersedes: null
expires: null
actor: "human"
provenance: "owner-adopted-bootstrap"
a1_audit_record: null
`;

/** Write the complete fixture repository into `rootDir` (created). */
export function writeCompleteFixture(rootDir: string): void {
  const decisionsDir = path.join(rootDir, '.syzygy', 'governance', 'decisions');
  const intentDir = path.join(rootDir, '.syzygy', 'intent');
  const openspecDir = path.join(rootDir, 'openspec');
  mkdirSync(decisionsDir, { recursive: true });
  mkdirSync(intentDir, { recursive: true });
  mkdirSync(openspecDir, { recursive: true });
  writeFileSync(path.join(rootDir, '.syzygy', 'project.yaml'), FIXTURE_DECLARATION, 'utf8');
  writeFileSync(
    path.join(decisionsDir, 'consent-gov-root.yaml'),
    FIXTURE_CONSENT_RECORD,
    'utf8',
  );
  writeFileSync(path.join(decisionsDir, 'consent-gov-root.act.yaml'), FIXTURE_OWNER_ACT, 'utf8');
  writeFileSync(path.join(intentDir, 'OVERVIEW.md'), FIXTURE_ENTRY_TEXT, 'utf8');
  // Governed-plane content beyond .syzygy/**, so the write-boundary
  // sweep's governed denominator covers BOTH namespaces.
  writeFileSync(
    path.join(openspecDir, 'placeholder-spec.md'),
    '# governed placeholder\n',
    'utf8',
  );
  writeFileSync(path.join(rootDir, 'README.md'), '# fixture readme\n', 'utf8');
}

export function tempBase(prefix: string): string {
  return mkdtempSync(path.join(tmpdir(), prefix));
}

// --- Daemon process control ----------------------------------------------

export interface DaemonProcess {
  readonly child: ChildProcess;
  readonly port: number;
  readonly baseUrl: string;
  /** Credential PATH parsed from stdout (the value is never printed). */
  readonly credentialPath: string;
  readonly stdout: () => string;
  readonly stderr: () => string;
  /** SIGINT the process and await its exit; returns the exit code. */
  stop(): Promise<number | null>;
  /** Resolves with the exit code once the process exits. */
  exited: Promise<number | null>;
}

export interface StartDaemonOptions {
  readonly repoRoot?: string;
  readonly fixtureRoot: string;
  readonly stateDir: string;
}

/**
 * Spawn the REAL built daemon (`node apps/syzygy/dist/main.js`) on an
 * ephemeral port and wait until its stdout announces the bound address
 * and the credential path. Throws (with captured output) if the process
 * exits or stays silent past the deadline.
 */
export function startDaemon(options: StartDaemonOptions): Promise<DaemonProcess> {
  const repoRoot = options.repoRoot ?? REPO_ROOT;
  const child = spawn(
    process.execPath,
    [
      daemonEntry(repoRoot),
      '--root',
      options.fixtureRoot,
      '--state-dir',
      options.stateDir,
      '--port',
      '0',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );

  const stdoutStream = child.stdout;
  const stderrStream = child.stderr;
  if (stdoutStream === null || stderrStream === null) {
    child.kill('SIGKILL');
    throw new Error('spawn returned no stdio pipes');
  }
  let out = '';
  let err = '';
  stdoutStream.setEncoding('utf8');
  stderrStream.setEncoding('utf8');
  stdoutStream.on('data', (chunk: string) => {
    out += chunk;
  });
  stderrStream.on('data', (chunk: string) => {
    err += chunk;
  });

  const exited = new Promise<number | null>((resolve) => {
    child.once('exit', (code) => resolve(code));
  });

  return new Promise<DaemonProcess>((resolve, reject) => {
    const deadline = setTimeout(() => {
      child.kill('SIGKILL');
      reject(
        new Error(`daemon did not announce its address in time.\nstdout:\n${out}\nstderr:\n${err}`),
      );
    }, 30_000);

    const tryResolve = (): void => {
      const portMatch = /listening at http:\/\/127\.0\.0\.1:(\d+)\//.exec(out);
      const credentialMatch = /machine credential \((?:minted|reused)\) at: (.+)/.exec(out);
      if (portMatch?.[1] === undefined || credentialMatch?.[1] === undefined) {
        return;
      }
      clearTimeout(deadline);
      const port = Number(portMatch[1]);
      resolve({
        child,
        port,
        baseUrl: `http://127.0.0.1:${port}`,
        credentialPath: credentialMatch[1].trim(),
        stdout: () => out,
        stderr: () => err,
        exited,
        stop: async () => {
          if (child.exitCode === null && child.signalCode === null) {
            child.kill('SIGINT');
          }
          return exited;
        },
      });
    };

    stdoutStream.on('data', tryResolve);
    void exited.then((code) => {
      clearTimeout(deadline);
      reject(
        new Error(
          `daemon exited (code ${String(code)}) before announcing its address.\nstdout:\n${out}\nstderr:\n${err}`,
        ),
      );
    });
    tryResolve();
  });
}

/** Read the machine credential from the state directory file. */
export function readCredential(credentialPath: string): string {
  return readFileSync(credentialPath, 'utf8').trim();
}

// --- External filesystem observation (CAP1-REQ-023/053/061) ---------------

export interface FileRecord {
  readonly size: number;
  readonly mtimeMs: number;
  readonly sha256: string;
}

/**
 * Recursive snapshot of a directory tree: relative path → size, mtime,
 * and content digest. THIS is the harness's own external write record —
 * never the daemon's self-report. A missing directory snapshots empty.
 */
export function snapshotTree(rootDir: string): Map<string, FileRecord> {
  const records = new Map<string, FileRecord>();
  const walk = (dir: string): void => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const absolute = path.join(dir, entry.name);
      const relative = path.relative(rootDir, absolute);
      if (entry.isDirectory()) {
        walk(absolute);
      } else if (entry.isFile()) {
        const stats = statSync(absolute);
        records.set(relative, {
          size: stats.size,
          mtimeMs: stats.mtimeMs,
          sha256: createHash('sha256').update(readFileSync(absolute)).digest('hex'),
        });
      }
    }
  };
  walk(rootDir);
  return records;
}

// --- HTML escaping oracle -------------------------------------------------

// The harness's OWN escaping (independent re-implementation of the
// standard five-character HTML escape) — used to locate served values
// inside HTML, never imported from the subject.
export function escapeForHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// --- Cross-channel parity from the wire (CAP1-REQ-041 at the transport) ----

export interface WireFact {
  readonly name: string;
  readonly value: string;
  readonly epistemic: { readonly label: string };
}

/**
 * The wire-level parity sweep: iterate EVERY fact served in the machine
 * JSON and assert its name, value, and epistemic label are present in
 * the served HTML — as a `data-fact-name` unit carrying the value and
 * `[label]` text. Returns the number of facts asserted (the sweep's
 * numerator); the caller compares it against the JSON fact count (the
 * denominator). Throws naming the first fact that fails.
 */
export function sweepWireParity(jsonFacts: readonly WireFact[], html: string): number {
  let asserted = 0;
  for (const fact of jsonFacts) {
    const name = escapeForHtml(fact.name);
    const value = escapeForHtml(fact.value);
    const label = escapeForHtml(fact.epistemic.label);
    const unitPattern = new RegExp(
      `<li[^>]*data-fact-name="${name}"[^>]*>(.*?)</li>`,
      'gs',
    );
    let found = false;
    for (const match of html.matchAll(unitPattern)) {
      const inner = match[1] ?? '';
      if (
        inner.includes(`<span class="fact-value">${value}</span>`) &&
        inner.includes(`[${label}]`)
      ) {
        found = true;
        break;
      }
    }
    if (!found) {
      throw new Error(
        `parity sweep: JSON fact \`${fact.name}\` = \`${fact.value}\` [${fact.epistemic.label}] has no matching HTML unit`,
      );
    }
    asserted += 1;
  }
  return asserted;
}
