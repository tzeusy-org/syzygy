import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';

import { inspectPocPort, listenerPidFromSs, restartOnePocListener, RestartRefusal, type PocListener } from './restart.js';

const fixture = resolve('apps/three-surface-poc/src/test-fixtures/restart-listener.mjs');
const roots: string[] = [];
const pids: number[] = [];
interface CleanupObservation {
  readonly remaining: number[];
  readonly livePids: number[];
}
const cleanupObservations: CleanupObservation[] = [];

// Two kinds of wall-clock bound live in this file, and they are kept apart
// (syzygy-ve8n: three tests failed under a full suite at load average 60-90).
//
// LIVENESS_MS bounds a wait for a state the test goes on to assert: a fixture
// binding, a marker file, a process exit, a successor listener. It never
// decides an outcome, so it is generous; under load it only waits longer.
// The same budget is passed as `timeoutMs` wherever the restart is expected
// to finish before its deadline (30 s is restart.ts's own ceiling).
//
// An outcome deadline (100 ms, 150 ms) is kept short only where the test makes
// the deadline the sole possible exit: a held listener that cannot close, an
// inspection that never reports socket absence, or a cleanup scan whose
// injected reader can never succeed. No scheduling delay can let
// any other outcome win there, so no clock injection is needed.
//
// TEST_MS is vitest's per-test and afterEach budget: several fixture spawns at LIVENESS_MS
// each must fit inside it (b48d86fa: two tests hit the 5 s default at load 60-90).
const LIVENESS_MS = 30_000;
const TEST_MS = 180_000;
let startedTests = 0;
const ownerUid = process.getuid?.();

interface ProcessIdentity {
  readonly pid: number;
  readonly uid: number;
  readonly started: string | undefined;
  readonly argv: readonly string[] | undefined;
  readonly cwd: string | undefined;
}

interface ProcessProvenance {
  readonly pid: number;
  readonly uid: number;
  readonly started: string | undefined;
  readonly state: string | undefined;
  readonly ppid: number | undefined;
  readonly processGroup: number | undefined;
  readonly session: number | undefined;
}

interface ProcessReaders {
  readonly stat: (path: string) => { readonly uid: number };
  readonly readFile: (path: string) => string;
  readonly readlink: (path: string) => string;
}

const defaultProcessReaders: ProcessReaders = {
  stat: path => statSync(path),
  readFile: path => readFileSync(path, 'utf8'),
  readlink: path => readlinkSync(path),
};

class PrivateFixtureCleanupRefusal extends Error {
  constructor(readonly code: 'private-process-identity-unreadable' | 'private-process-identity-changed', message: string) {
    super(message);
  }
}

function scratch(): string {
  const root = mkdtempSync(join(tmpdir(), 'syzygy-private-restart-'));
  roots.push(root);
  return root;
}

async function freePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('test port missing');
  await new Promise<void>(resolveClose => server.close(() => resolveClose()));
  return address.port;
}

async function readRevision(port: number, timeoutMs = LIVENESS_MS): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`);
      if (response.ok) return response.text();
    } catch { /* fixture has not bound yet */ }
    await new Promise(resolveWait => setTimeout(resolveWait, 25));
  }
  throw new Error('private fixture listener did not start');
}

async function waitForMarker(marker: string, timeoutMs = LIVENESS_MS): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!existsSync(marker)) {
    if (Date.now() >= deadline) throw new Error(`private fixture did not write ${marker}`);
    await new Promise(resolveWait => setTimeout(resolveWait, 10));
  }
}

async function waitForExit(pid: number, timeoutMs = LIVENESS_MS): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (readProcessProvenance(pid) !== undefined) {
    if (Date.now() >= deadline) throw new Error(`private fixture process ${pid} did not exit`);
    await new Promise(resolveWait => setTimeout(resolveWait, 10));
  }
}

async function startedFixture(mode: 'normal' | 'slow' | 'held' = 'normal'): Promise<{ root: string; repo: string; stateDir: string; port: number; pid: number }> {
  const root = scratch();
  const repo = join(root, 'repo');
  const stateDir = join(root, 'state');
  mkdirSync(repo);
  writeFileSync(join(repo, 'revision'), 'old-revision');
  if (mode === 'slow') writeFileSync(join(repo, 'slow-stop'), 'yes');
  if (mode === 'held') writeFileSync(join(repo, 'hold-stop'), 'yes');
  const port = await freePort();
  const child = spawn(process.execPath, [fixture, '--repo', repo, '--state-dir', stateDir, '--port', String(port)], {
    cwd: process.cwd(), stdio: 'ignore',
  });
  if (child.pid === undefined) throw new Error('fixture process missing');
  pids.push(child.pid);
  expect(await readRevision(port)).toBe('old-revision');
  return { root, repo, stateDir, port, pid: child.pid };
}

function readProcessProvenance(pid: number, readers: ProcessReaders = defaultProcessReaders): ProcessProvenance | undefined {
  const proc = `/proc/${pid}`;
  let stat;
  try {
    stat = readers.stat(proc);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw new PrivateFixtureCleanupRefusal('private-process-identity-unreadable', `cannot stat ${proc}`);
  }
  if (ownerUid === undefined || stat.uid !== ownerUid) {
    return { pid, uid: stat.uid, started: undefined, state: undefined, ppid: undefined, processGroup: undefined, session: undefined };
  }
  try {
    const statText = readers.readFile(`${proc}/stat`);
    const fields = statText.slice(statText.lastIndexOf(')') + 2).trim().split(/\s+/);
    const state = fields[0];
    const started = fields[19];
    const ppid = Number(fields[1]);
    const processGroup = Number(fields[2]);
    const session = Number(fields[3]);
    if (state === undefined || started === undefined
      || !Number.isSafeInteger(ppid) || !Number.isSafeInteger(processGroup) || !Number.isSafeInteger(session)) {
      throw new Error('process provenance incomplete');
    }
    if (state === 'Z') return undefined;
    return { pid, uid: stat.uid, started, state, ppid, processGroup, session };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    if (error instanceof PrivateFixtureCleanupRefusal) throw error;
    throw new PrivateFixtureCleanupRefusal('private-process-identity-unreadable', `cannot read provenance for ${proc}`);
  }
}

function readPrivateChildPids(): number[] {
  try {
    return readFileSync(`/proc/${process.pid}/task/${process.pid}/children`, 'utf8')
      .trim().split(/\s+/).filter(Boolean).map(Number).filter(Number.isSafeInteger);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw new PrivateFixtureCleanupRefusal('private-process-identity-unreadable', 'cannot read private child provenance');
  }
}

function readProcessIdentity(pid: number, readers: ProcessReaders = defaultProcessReaders): ProcessIdentity | undefined {
  const proc = `/proc/${pid}`;
  let stat: { readonly uid: number };
  try {
    stat = readers.stat(proc);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw new PrivateFixtureCleanupRefusal('private-process-identity-unreadable', `cannot stat ${proc}`);
  }
  if (ownerUid === undefined || stat.uid !== ownerUid) return { pid, uid: stat.uid, started: undefined, argv: undefined, cwd: undefined };
  try {
    const argv = readers.readFile(`${proc}/cmdline`).split('\0').filter(Boolean);
    if (argv.length === 0) {
      const statText = readers.readFile(`${proc}/stat`);
      const fields = statText.slice(statText.lastIndexOf(')') + 2).trim().split(/\s+/);
      if (fields[0] === 'Z') return undefined;
      throw new Error('process command line is empty while process is live');
    }
    if (argv[1] !== fixture) return { pid, uid: stat.uid, started: undefined, argv, cwd: undefined };
    const statText = readers.readFile(`${proc}/stat`);
    const fields = statText.slice(statText.lastIndexOf(')') + 2).trim().split(/\s+/);
    const started = fields[19];
    if (started === undefined) throw new Error('process identity incomplete');
    if (fields[0] === 'Z') return undefined;
    const cwd = readers.readlink(`${proc}/cwd`);
    if (cwd === undefined) throw new Error('process identity incomplete');
    return { pid, uid: stat.uid, started, argv, cwd };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    if (error instanceof PrivateFixtureCleanupRefusal) throw error;
    throw new PrivateFixtureCleanupRefusal('private-process-identity-unreadable', `cannot read identity for ${proc}`);
  }
}

function exactPrivateFixtureProcesses(options: {
  readonly knownPids?: readonly number[];
  readonly childPids?: readonly number[];
  readonly readIdentity?: (pid: number) => ProcessIdentity | undefined;
  readonly readProvenance?: (pid: number) => ProcessProvenance | undefined;
} = {}): ProcessIdentity[] {
  if (ownerUid === undefined) throw new PrivateFixtureCleanupRefusal('private-process-identity-unreadable', 'process UID is unavailable');
  const knownPids = new Set(options.knownPids ?? pids);
  const readProvenance = options.readProvenance ?? readProcessProvenance;
  const candidatePids = new Set(knownPids);
  for (const pid of options.childPids ?? readPrivateChildPids()) {
    if (knownPids.has(pid)) continue;
    const provenance = readProvenance(pid);
    if (provenance === undefined || provenance.uid !== ownerUid) continue;
    if (provenance.ppid === process.pid && provenance.processGroup === pid && provenance.session === pid) candidatePids.add(pid);
  }
  const readIdentity = options.readIdentity ?? readProcessIdentity;
  const matches: ProcessIdentity[] = [];
  for (const pid of candidatePids) {
    const identity = readIdentity(pid);
    if (identity === undefined || identity.uid !== ownerUid || identity.argv === undefined || identity.cwd === undefined || identity.started === undefined) continue;
    if (identity.argv[1] !== fixture || identity.cwd !== process.cwd()) continue;
    const repoIndex = identity.argv.indexOf('--repo');
    const stateIndex = identity.argv.indexOf('--state-dir');
    const repo = repoIndex >= 0 ? identity.argv[repoIndex + 1] : undefined;
    const stateDir = stateIndex >= 0 ? identity.argv[stateIndex + 1] : undefined;
    if (repo === undefined || stateDir === undefined) continue;
    if (roots.some(root => repo === join(root, 'repo') && stateDir === join(root, 'state'))) matches.push(identity);
  }
  return matches;
}

function sameProcessIdentity(first: ProcessIdentity, second: ProcessIdentity): boolean {
  return first.pid === second.pid
    && first.uid === second.uid
    && first.started === second.started
    && first.cwd === second.cwd
    && JSON.stringify(first.argv) === JSON.stringify(second.argv);
}

async function drainPrivateFixtureProcesses(options: {
  readonly scan?: () => ProcessIdentity[];
  readonly readIdentity?: (pid: number) => ProcessIdentity | undefined;
  readonly signal?: (pid: number, signal: NodeJS.Signals) => void;
  readonly sleep?: () => Promise<void>;
  readonly timeoutMs?: number;
  readonly readProvenance?: (pid: number) => ProcessProvenance | undefined;
} = {}): Promise<void> {
  const scan = options.scan ?? (() => exactPrivateFixtureProcesses());
  const readProvenance = options.readProvenance ?? readProcessProvenance;
  const readIdentity = options.readIdentity ?? readProcessIdentity;
  const signal = options.signal ?? ((pid, value) => process.kill(pid, value));
  const sleep = options.sleep ?? (() => new Promise(resolveWait => setTimeout(resolveWait, 25)));
  const deadline = Date.now() + (options.timeoutMs ?? LIVENESS_MS);
  const seen = new Map<number, ProcessIdentity>();
  while (true) {
    try {
      const remaining = scan();
      // An empty scan is not an exit (syzygy-exj7). A process in the kernel's
      // exit path reads as gone to the scan once its cwd link is released, then
      // as live and unreadable once its command line empties, and only then
      // becomes a zombie. Return only when every process this drain saw and
      // every registered PID is a zombie or absent, the two states that never
      // revert, so the strict observation after the drain cannot see one mid-exit.
      if (remaining.length === 0) {
        if ([...new Set([...pids, ...seen.keys()])].every(pid => readProvenance(pid) === undefined)) return;
      }
      for (const candidate of remaining) {
        const previous = seen.get(candidate.pid);
        if (previous !== undefined && !sameProcessIdentity(previous, candidate)) {
          throw new PrivateFixtureCleanupRefusal('private-process-identity-changed', `PID ${candidate.pid} changed generation during cleanup`);
        }
        seen.set(candidate.pid, candidate);
        const current = readIdentity(candidate.pid);
        if (current === undefined) continue;
        if (!sameProcessIdentity(candidate, current)) {
          throw new PrivateFixtureCleanupRefusal('private-process-identity-changed', `PID ${candidate.pid} changed generation before signal`);
        }
        try { signal(candidate.pid, 'SIGTERM'); }
        catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
        }
      }
    } catch (error) {
      if (!(error instanceof PrivateFixtureCleanupRefusal) || error.code !== 'private-process-identity-unreadable') throw error;
      if (Date.now() >= deadline) throw error;
      await sleep();
      continue;
    }
    if (Date.now() >= deadline) throw new Error('private fixture processes did not drain');
    await sleep();
  }
}

beforeEach(() => {
  startedTests += 1;
});

afterEach(async () => {
  for (const root of roots) {
    const repo = join(root, 'repo');
    const release = join(repo, 'release-stop');
    if (existsSync(join(repo, 'hold-stop')) && !existsSync(release)) writeFileSync(release, 'release');
  }
  await drainPrivateFixtureProcesses();
  // The observation comes from the live process table and /proc liveness of
  // every PID this test registered, so it cannot pass for any behaviour.
  const observation: CleanupObservation = {
    remaining: exactPrivateFixtureProcesses().map(({ pid }) => pid),
    livePids: pids.filter(pid => readProcessProvenance(pid) !== undefined),
  };
  cleanupObservations.push(observation);
  expect(observation.remaining).toEqual([]);
  expect(observation.livePids).toEqual([]);
  pids.splice(0);
  for (const root of roots) rmSync(root, { recursive: true, force: true });
}, TEST_MS);

afterAll(() => {
  // Denominator: every test that started was observed once, so an empty or
  // short observation list cannot pass the emptiness check below.
  expect(cleanupObservations.length).toBe(startedTests);
  expect(cleanupObservations.every(({ remaining, livePids }) => remaining.length === 0 && livePids.length === 0)).toBe(true);
  expect(exactPrivateFixtureProcesses()).toEqual([]);
});

describe('one-listener POC restart on private fixture sockets', { timeout: TEST_MS }, () => {
  it('waits through one vanished post-SIGTERM identity, then starts exactly one successor after socket absence', async () => {
    const f = await startedFixture('slow');
    const credentialBefore = readFileSync(join(f.stateDir, 'machine-credential.token'));
    writeFileSync(join(f.repo, 'revision'), 'new-revision');
    expect(await readRevision(f.port)).toBe('old-revision');
    let inspections = 0;
    const result = await restartOnePocListener({
      port: f.port, expectedScript: fixture, timeoutMs: LIVENESS_MS,
      inspect: port => {
        inspections += 1;
        if (inspections === 3) throw new RestartRefusal('listener-identity-unreadable');
        if (inspections === 4) throw new RestartRefusal('listener-identity-incomplete');
        return inspectPocPort(port);
      },
    });
    pids.push(result.newPid);
    expect(inspections).toBeGreaterThan(4);
    expect(result.oldPid).toBe(f.pid);
    expect(result.newPid).not.toBe(f.pid);
    expect(await readRevision(f.port)).toBe('new-revision');
    expect(readFileSync(join(f.stateDir, 'machine-credential.token'))).toEqual(credentialBefore);
    expect(readdirSync(f.stateDir)).toEqual(['machine-credential.token']);
  });

  it.each(['listener-identity-unreadable', 'listener-identity-incomplete'])(
    'refuses a %s identity before SIGTERM and leaves the old listener serving', async code => {
      const f = await startedFixture();
      let inspections = 0;
      await expect(restartOnePocListener({
        port: f.port, expectedScript: fixture, timeoutMs: LIVENESS_MS,
        inspect: port => {
          inspections += 1;
          if (inspections === 2) throw new RestartRefusal(code);
          return inspectPocPort(port);
        },
      })).rejects.toMatchObject({ code });
      expect(inspections).toBe(2);
      expect(await readRevision(f.port)).toBe('old-revision');
    },
  );

  it.each(['listener-identity-unreadable', 'listener-identity-incomplete'])(
    'times out with no successor while post-SIGTERM identity stays %s', async code => {
      const f = await startedFixture();
      let inspections = 0;
      await expect(restartOnePocListener({
        port: f.port, expectedScript: fixture, timeoutMs: 150,
        inspect: port => {
          inspections += 1;
          if (inspections > 2) throw new RestartRefusal(code);
          return inspectPocPort(port);
        },
      })).rejects.toMatchObject({ code: 'listener-close-timeout' });
      expect(inspections).toBeGreaterThan(2);
      // SIGTERM was sent; the closed socket is a state, so wait for the exit
      // rather than racing the fixture's shutdown, then assert no successor.
      await waitForExit(f.pid);
      await expect(fetch(`http://127.0.0.1:${f.port}/`)).rejects.toThrow();
      expect(exactPrivateFixtureProcesses()).toEqual([]);
      expect(readdirSync(f.stateDir)).toEqual(['machine-credential.token']);
    },
  );

  it.each(['listener-owner-mismatch', 'listener-changed-after-signal'])(
    'hard-refuses %s after SIGTERM without spawning a successor', async code => {
      // Held: the listener cannot close before the third inspection, so the
      // changed-identity probe always sees a live socket under any load.
      const f = await startedFixture('held');
      const credentialBefore = readFileSync(join(f.stateDir, 'machine-credential.token'));
      let inspections = 0;
      await expect(restartOnePocListener({
        port: f.port, expectedScript: fixture, timeoutMs: LIVENESS_MS,
        inspect: port => {
          inspections += 1;
          if (inspections === 3) {
            if (code === 'listener-owner-mismatch') throw new RestartRefusal(code);
            const current = inspectPocPort(port);
            if (current === null) throw new Error('private listener closed before changed-identity inspection');
            return { ...current, started: `${current.started}-changed` };
          }
          return inspectPocPort(port);
        },
      })).rejects.toMatchObject({ code });
      expect(inspections).toBe(3);
      expect(readFileSync(join(f.stateDir, 'machine-credential.token'))).toEqual(credentialBefore);
      expect(readdirSync(f.stateDir)).toEqual(['machine-credential.token']);
    },
  );

  it('closes one listener, reuses credential bytes and state dir, and serves only the new fixture revision', async () => {
    const f = await startedFixture();
    const credentialPath = join(f.stateDir, 'machine-credential.token');
    const credentialBefore = readFileSync(credentialPath);
    writeFileSync(join(f.repo, 'revision'), 'new-revision');
    expect(await readRevision(f.port)).toBe('old-revision');
    const result = await restartOnePocListener({ port: f.port, expectedScript: fixture, expectedCwd: process.cwd(), timeoutMs: LIVENESS_MS });
    pids.push(result.newPid);
    expect(result.oldPid).toBe(f.pid);
    expect(result.newPid).not.toBe(f.pid);
    expect(result.stateDir).toBe(f.stateDir);
    expect(await readRevision(f.port)).toBe('new-revision');
    expect(readFileSync(credentialPath)).toEqual(credentialBefore);
    expect(readdirSync(f.stateDir)).toEqual(['machine-credential.token']);
  });

  it('refuses an absent listener and ambiguous owner rows without signaling anyone', async () => {
    const port = await freePort();
    await expect(restartOnePocListener({ port, expectedScript: fixture, timeoutMs: LIVENESS_MS })).rejects.toMatchObject({ code: 'listener-absent' });
    const row = `LISTEN 0 511 127.0.0.1:${port} 0.0.0.0:* users:(("node",pid=123,fd=9))`;
    expect(() => listenerPidFromSs(`${row}\n${row}`, port)).toThrow('multiple-listeners');
    expect(() => listenerPidFromSs(row.replace('pid=123', 'fd=123'), port)).toThrow('listener-owner-ambiguous');
  });

  it('refuses unreadable same-UID process identity and retains the scratch root', async () => {
    const uid = ownerUid;
    if (uid === undefined) throw new Error('process UID is unavailable');
    const root = scratch();
    const unreadable = Object.assign(new Error('permission denied'), { code: 'EACCES' });
    let signals = 0;
    const readers: ProcessReaders = {
      stat: () => ({ uid }),
      readFile: () => { throw unreadable; },
      readlink: () => process.cwd(),
    };
    await expect(drainPrivateFixtureProcesses({
      scan: () => exactPrivateFixtureProcesses({ knownPids: [4242], childPids: [], readIdentity: pid => readProcessIdentity(pid, readers) }),
      signal: () => { signals += 1; },
      timeoutMs: 100,
    })).rejects.toMatchObject({ code: 'private-process-identity-unreadable' });
    expect(signals).toBe(0);
    expect(existsSync(root)).toBe(true);
  });

  it('ignores unreadable out-of-scope child churn before cmdline inspection', () => {
    const uid = ownerUid;
    if (uid === undefined) throw new Error('process UID is unavailable');
    let identityReads = 0;
    const outOfScope = exactPrivateFixtureProcesses({
      knownPids: [],
      childPids: [4243],
      readProvenance: () => ({
        pid: 4243, uid, started: 'unrelated-generation', state: 'S', ppid: process.pid,
        processGroup: process.pid, session: process.pid,
      }),
      readIdentity: () => {
        identityReads += 1;
        throw new PrivateFixtureCleanupRefusal('private-process-identity-unreadable', 'out-of-scope cmdline churn');
      },
    });
    expect(outOfScope).toEqual([]);
    expect(identityReads).toBe(0);
  });

  it('waits for a process that left the scan mid-exit to become a zombie or vanish before draining (syzygy-exj7)', async () => {
    const uid = ownerUid;
    if (uid === undefined) throw new Error('process UID is unavailable');
    // The kernel exit path, as /proc showed it: the scan matches the process,
    // then its cwd link is gone (the identity reads as absent), while its
    // provenance still says live for two reads before the zombie.
    const exiting: ProcessIdentity = {
      pid: 4244, uid, started: 'exiting-generation',
      argv: [process.execPath, fixture, '--repo', '/tmp/private-repo', '--state-dir', '/tmp/private-state', '--port', '4244'],
      cwd: process.cwd(),
    };
    let scans = 0;
    let provenanceReads = 0;
    let signals = 0;
    await drainPrivateFixtureProcesses({
      scan: () => (++scans === 1 ? [exiting] : []),
      readIdentity: () => undefined,
      readProvenance: pid => {
        provenanceReads += 1;
        return provenanceReads <= 2
          ? { pid, uid, started: 'exiting-generation', state: 'R', ppid: process.pid, processGroup: pid, session: pid }
          : undefined;
      },
      signal: () => { signals += 1; },
      sleep: async () => {},
      timeoutMs: LIVENESS_MS,
    });
    expect(provenanceReads).toBe(3);
    expect(scans).toBe(4);
    expect(signals).toBe(0);
  });

  it('refuses PID reuse before signaling a changed process generation', async () => {
    const uid = ownerUid;
    if (uid === undefined) throw new Error('process UID is unavailable');
    const original: ProcessIdentity = {
      pid: 4242,
      uid,
      started: 'generation-one',
      argv: [process.execPath, fixture, '--repo', '/tmp/private-repo', '--state-dir', '/tmp/private-state', '--port', '4242'],
      cwd: process.cwd(),
    };
    const reused: ProcessIdentity = { ...original, started: 'generation-two' };
    let signals = 0;
    await expect(drainPrivateFixtureProcesses({
      scan: () => [original],
      readIdentity: () => reused,
      signal: () => { signals += 1; },
      sleep: async () => {},
      timeoutMs: 100,
    })).rejects.toMatchObject({ code: 'private-process-identity-changed' });
    expect(signals).toBe(0);
  });

  it('refuses a listener generation changed between inspection and SIGTERM', async () => {
    const f = await startedFixture();
    const argv = [process.execPath, fixture, '--repo', f.repo, '--state-dir', f.stateDir, '--port', String(f.port)];
    const first: PocListener = { pid: f.pid, started: '1', argv, cwd: process.cwd() };
    const second: PocListener = { ...first, started: '2' };
    let calls = 0;
    await expect(restartOnePocListener({ port: f.port, expectedScript: fixture, timeoutMs: LIVENESS_MS, inspect: () => ++calls === 1 ? first : second }))
      .rejects.toMatchObject({ code: 'listener-changed-before-signal' });
    expect(await readRevision(f.port)).toBe('old-revision');
  });

  it('times out without SIGKILL or spawning a successor when SIGTERM close is slow', async () => {
    // Held: the listener cannot close until release-stop exists, so the 100 ms
    // deadline is always the winner; every later wait is a state marker.
    const f = await startedFixture('held');
    await expect(restartOnePocListener({ port: f.port, expectedScript: fixture, timeoutMs: 100 }))
      .rejects.toMatchObject({ code: 'listener-close-timeout' });
    await waitForMarker(join(f.repo, 'shutdown-started'));
    expect(exactPrivateFixtureProcesses().map(({ pid }) => pid)).toEqual([f.pid]);
    expect(await readRevision(f.port)).toBe('old-revision');
    writeFileSync(join(f.repo, 'release-stop'), 'release');
    await waitForExit(f.pid);
    expect(exactPrivateFixtureProcesses()).toEqual([]);
    expect(readdirSync(f.stateDir)).toEqual(['machine-credential.token']);
  });

  it('discovers an unreturned successor after a post-spawn identity refusal', async () => {
    const f = await startedFixture();
    let successorPid: number | undefined;
    await expect(restartOnePocListener({
      port: f.port, expectedScript: fixture, timeoutMs: LIVENESS_MS,
      inspect: port => {
        const current = inspectPocPort(port);
        if (current === null || current.pid === f.pid) return current;
        successorPid = current.pid;
        return { ...current, argv: [...current.argv, '--unexpected-successor-argument'] };
      },
    })).rejects.toMatchObject({ code: 'successor-identity-mismatch' });
    expect(successorPid).toBeDefined();
    expect(exactPrivateFixtureProcesses().map(({ pid }) => pid)).toContain(successorPid);
  });

  it('reports a failed successor and lets a concurrent loser fail before signaling', async () => {
    const failed = await startedFixture();
    writeFileSync(join(failed.repo, 'fail-next'), 'yes');
    await expect(restartOnePocListener({ port: failed.port, expectedScript: fixture, timeoutMs: LIVENESS_MS }))
      .rejects.toMatchObject({ code: 'successor-failed' });
    const concurrent = await startedFixture('held');
    writeFileSync(join(concurrent.repo, 'revision'), 'new-revision');
    const first = restartOnePocListener({ port: concurrent.port, expectedScript: fixture, timeoutMs: LIVENESS_MS })
      .then(result => ({ kind: 'succeeded' as const, result }), error => ({ kind: 'failed' as const, error }));
    let winner: Awaited<ReturnType<typeof restartOnePocListener>> | undefined;
    try {
      await waitForMarker(join(concurrent.repo, 'shutdown-started'));
      writeFileSync(join(concurrent.repo, 'hold-probe'), 'probe');
      await waitForMarker(join(concurrent.repo, 'hold-ack'));
      expect(await readRevision(concurrent.port)).toBe('old-revision');
      const second = await restartOnePocListener({ port: concurrent.port, expectedScript: fixture, timeoutMs: LIVENESS_MS })
        .then(result => { pids.push(result.newPid); return { kind: 'succeeded' as const, result }; },
          error => ({ kind: 'refused' as const, error }));
      expect(second.kind).toBe('refused');
      if (second.kind === 'refused') expect(second.error).toMatchObject({ code: 'restart-already-in-progress' });
      expect(await readRevision(concurrent.port)).toBe('old-revision');
    } finally {
      writeFileSync(join(concurrent.repo, 'release-stop'), 'release');
      const outcome = await first;
      if (outcome.kind === 'failed') throw outcome.error;
      winner = outcome.result;
      pids.push(winner.newPid);
    }
    expect(winner.oldPid).toBe(concurrent.pid);
    expect(winner.newPid).not.toBe(concurrent.pid);
    expect(await readRevision(concurrent.port)).toBe('new-revision');
    expect(readdirSync(concurrent.stateDir)).toEqual(['machine-credential.token']);
  });
});
