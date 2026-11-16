// RT9 repair test (RTF-1) — the state-dir governed-plane startup check
// judged by SYMLINK REALITY, observed externally. The lexical check
// alone let an operator-supplied symlink (`ln -s <root>/.syzygy/x
// /tmp/sd; --state-dir /tmp/sd`) pass and land the credential write
// inside the governed plane via the link. Oracle here is external:
// the spawned process's exit code and stderr, plus the harness's own
// filesystem sweep of the fixture's governed tree — never the
// daemon's self-report.

import {
  chmodSync,
  existsSync,
  mkdirSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
} from 'node:fs';
import { join, relative } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { observeProcessEffects } from './effect-observer.js';
import {
  daemonEntry,
  REPO_ROOT,
  snapshotTree,
  startDaemon,
  tempBase,
  writeCompleteFixture,
} from './harness.js';

const cleanups: (() => Promise<void> | void)[] = [];
const isRoot = process.getuid?.() === 0;

afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) {
    await cleanup();
  }
});

interface ObservedEffects {
  readonly entryExecveCount: number;
  readonly filesystemMutations: readonly string[];
  readonly networkCalls: readonly string[];
  readonly processSpawns: readonly string[];
}

const FILE_MUTATION_SYSCALLS = new Set([
  'chmod',
  'chown',
  'fchmod',
  'fchmodat',
  'fchown',
  'fchownat',
  'ftruncate',
  'futimesat',
  'lchown',
  'link',
  'linkat',
  'mkdir',
  'mkdirat',
  'mknod',
  'mknodat',
  'rename',
  'renameat',
  'renameat2',
  'rmdir',
  'symlink',
  'symlinkat',
  'truncate',
  'unlink',
  'unlinkat',
  'utime',
  'utimensat',
  'utimes',
]);
const NETWORK_SYSCALLS = new Set([
  'accept',
  'accept4',
  'bind',
  'connect',
  'listen',
  'recvfrom',
  'recvmmsg',
  'recvmsg',
  'sendmmsg',
  'sendmsg',
  'sendto',
  'shutdown',
  'socket',
  'socketpair',
]);

function observedEffects(trace: string): ObservedEffects {
  const filesystemMutations: string[] = [];
  const networkCalls: string[] = [];
  const processSpawns: string[] = [];
  let entryExecveCount = 0;

  for (const line of trace.split('\n').filter((candidate) => candidate.trim() !== '')) {
    const syscall = /^\d+\s+([a-zA-Z0-9_]+)\(/.exec(line)?.[1];
    if (syscall === undefined) {
      continue;
    }
    if (NETWORK_SYSCALLS.has(syscall)) {
      networkCalls.push(line);
    }
    if (
      FILE_MUTATION_SYSCALLS.has(syscall) ||
      (['open', 'openat', 'openat2'].includes(syscall) &&
        /\bO_(?:WRONLY|RDWR|CREAT|TRUNC|APPEND)\b/.test(line)) ||
      syscall === 'creat'
    ) {
      filesystemMutations.push(line);
    }
    if (syscall === 'execve' || syscall === 'execveat') {
      if (entryExecveCount === 0) {
        entryExecveCount += 1;
      } else {
        processSpawns.push(line);
      }
    } else if (
      syscall === 'fork' ||
      syscall === 'vfork' ||
      ((syscall === 'clone' || syscall === 'clone3') && !line.includes('CLONE_THREAD'))
    ) {
      processSpawns.push(line);
    }
  }

  return { entryExecveCount, filesystemMutations, networkCalls, processSpawns };
}

function expectNoExternalEffects(effects: ObservedEffects): void {
  // The harness starts the daemon with exactly one entry execve. It is the
  // observation boundary, not an effect caused by Capability 1 behavior.
  expect(effects.entryExecveCount).toBe(1);
  expect(effects.filesystemMutations).toEqual([]);
  expect(effects.networkCalls).toEqual([]);
  expect(effects.processSpawns).toEqual([]);
}

function expectNoSuccessfulExternalEffects(effects: ObservedEffects): void {
  expect(effects.entryExecveCount).toBe(1);
  expect(
    effects.filesystemMutations.filter((line) => !/= -1\s/.test(line)),
  ).toEqual([]);
  expect(effects.networkCalls).toEqual([]);
  expect(effects.processSpawns).toEqual([]);
}

/**
 * Spawn the built daemon under a harness-owned syscall observer and await
 * exit. The trace enumerates file mutation, network, and process interfaces;
 * it is produced by strace outside the daemon, never by Syzygy self-report.
 */
function runDaemonToExit(args: readonly string[]): Promise<{
  code: number | null;
  stdout: string;
  stderr: string;
  effects: ObservedEffects;
}> {
  return observeProcessEffects({
    targetExecutable: process.execPath,
    targetArgs: [daemonEntry(REPO_ROOT), ...args],
    parseTrace: observedEffects,
  }).then((observation) => ({
    code: observation.code,
    stdout: observation.stdout,
    stderr: observation.stderr,
    effects: observation.trace,
  }));
}

function expectTreeUnchanged(
  before: ReturnType<typeof snapshotTree>,
  after: ReturnType<typeof snapshotTree>,
): void {
  const additions = [...after.keys()].filter((key) => !before.has(key));
  expect(additions).toEqual([]);
  const deletions = [...before.keys()].filter((key) => !after.has(key));
  expect(deletions).toEqual([]);
  const modified = [...before].flatMap(([key, record]) => {
    const afterRecord = after.get(key);
    return afterRecord === undefined ||
      afterRecord.sha256 !== record.sha256 ||
      afterRecord.mtimeMs !== record.mtimeMs
      ? [key]
      : [];
  });
  expect(modified).toEqual([]);
  expect(after.size).toBe(before.size);
}

describe('RTF-1 — state-dir governed-plane check resolves symlink reality', () => {
  it('refuses (nonzero exit, named refusal) a --state-dir symlink whose REAL target lies inside .syzygy/, and writes nothing there', async () => {
    const base = tempBase('syz-sys-sd-');
    cleanups.push(() => rmSync(base, { recursive: true, force: true }));
    const fixtureRoot = join(base, 'fixture');
    writeCompleteFixture(fixtureRoot);

    // The attack from the finding: a symlink OUTSIDE the fixture whose
    // real target is a directory INSIDE the fixture's .syzygy/. The
    // lexical path (base/sd) is outside the governed plane; only
    // symlink reality reveals the real landing spot.
    const governedTarget = join(fixtureRoot, '.syzygy', 'sneaky-state');
    mkdirSync(governedTarget, { recursive: true });
    const linkPath = join(base, 'sd');
    symlinkSync(governedTarget, linkPath);

    // BEFORE: the harness's own external record of the governed tree.
    const before = snapshotTree(join(fixtureRoot, '.syzygy'));
    expect(before.size).toBeGreaterThan(0);

    const result = await runDaemonToExit([
      '--root',
      fixtureRoot,
      '--state-dir',
      linkPath,
      '--port',
      '0',
    ]);

    // The process EXITS nonzero with the named refusal on stderr,
    // mentioning the REAL location inside the governed plane.
    expect(result.code).not.toBe(0);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('inside the governed plane');
    expect(result.stderr).toContain(governedTarget);
    // It never announced an address — it refused before serving.
    expect(result.stdout).not.toContain('listening at');
    expectNoExternalEffects(result.effects);

    // AFTER (harness-external): nothing was written inside .syzygy/ —
    // no additions, no deletions, no modifications, full denominator.
    const after = snapshotTree(join(fixtureRoot, '.syzygy'));
    expectTreeUnchanged(before, after);
  });

  it('refuses a dangling --state-dir symlink whose intended target lies inside .syzygy/, before writes or a listener', async () => {
    const base = tempBase('syz-sys-sd-dangling-in-');
    cleanups.push(() => rmSync(base, { recursive: true, force: true }));
    const fixtureRoot = join(base, 'fixture');
    writeCompleteFixture(fixtureRoot);

    const governedTarget = join(fixtureRoot, '.syzygy', 'not-created-state');
    const linkPath = join(base, 'state-link');
    symlinkSync(governedTarget, linkPath);
    expect(existsSync(governedTarget)).toBe(false);
    const before = snapshotTree(join(fixtureRoot, '.syzygy'));

    const result = await runDaemonToExit([
      '--root',
      fixtureRoot,
      '--state-dir',
      linkPath,
      '--port',
      '0',
    ]);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('inside the governed plane');
    expect(result.stderr).toContain(governedTarget);
    expect(result.stdout).not.toContain('listening at');
    expectNoExternalEffects(result.effects);
    expect(existsSync(governedTarget)).toBe(false);
    expectTreeUnchanged(before, snapshotTree(join(fixtureRoot, '.syzygy')));
  });

  it('still starts and serves through a --state-dir symlink whose real target is OUTSIDE the governed plane', async () => {
    const base = tempBase('syz-sys-sd-ok-');
    cleanups.push(() => rmSync(base, { recursive: true, force: true }));
    const fixtureRoot = join(base, 'fixture');
    writeCompleteFixture(fixtureRoot);

    // A legitimate symlinked state dir: real target is a benign temp
    // directory outside the fixture entirely.
    const benignTarget = join(base, 'real-state');
    mkdirSync(benignTarget, { recursive: true });
    const linkPath = join(base, 'state-link');
    symlinkSync(benignTarget, linkPath);
    const before = snapshotTree(fixtureRoot);

    const daemon = await startDaemon({ fixtureRoot, stateDir: linkPath });
    cleanups.push(async () => {
      await daemon.stop();
    });

    // It serves, and the only state effect lands through the symlink at the
    // requested benign target with the credential's required owner-only mode.
    expect((await fetch(`${daemon.baseUrl}/`)).status).toBe(200);
    const realCredentialPath = realpathSync(daemon.credentialPath);
    expect(relative(benignTarget, realCredentialPath)).toBe('machine-credential.token');
    expect(readdirSync(benignTarget)).toEqual(['machine-credential.token']);
    expect((statSync(realCredentialPath).mode & 0o777).toString(8)).toBe('600');
    expect(await daemon.stop()).toBe(0);
    expectTreeUnchanged(before, snapshotTree(fixtureRoot));
  });

  it('keeps a dangling benign outside target credential-unprovisionable, with no listener or writes', async () => {
    const base = tempBase('syz-sys-sd-dangling-out-');
    cleanups.push(() => rmSync(base, { recursive: true, force: true }));
    const fixtureRoot = join(base, 'fixture');
    writeCompleteFixture(fixtureRoot);

    const benignTarget = join(base, 'not-created', 'state');
    const linkPath = join(base, 'state-link');
    symlinkSync(benignTarget, linkPath);
    const before = snapshotTree(base);

    const result = await runDaemonToExit([
      '--root',
      fixtureRoot,
      '--state-dir',
      linkPath,
      '--port',
      '0',
    ]);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('credential-unprovisionable');
    expect(result.stderr).not.toContain('inside the governed plane');
    expect(result.stdout).not.toContain('listening at');
    expectNoSuccessfulExternalEffects(result.effects);
    expect(existsSync(benignTarget)).toBe(false);
    expectTreeUnchanged(before, snapshotTree(base));
  });

  it('rejects a state-dir symlink loop as named invalid before writes or a listener', async () => {
    const base = tempBase('syz-sys-sd-loop-');
    cleanups.push(() => rmSync(base, { recursive: true, force: true }));
    const fixtureRoot = join(base, 'fixture');
    writeCompleteFixture(fixtureRoot);
    const first = join(base, 'state-a');
    const second = join(base, 'state-b');
    symlinkSync(second, first);
    symlinkSync(first, second);
    const before = snapshotTree(base);

    const result = await runDaemonToExit([
      '--root',
      fixtureRoot,
      '--state-dir',
      first,
      '--port',
      '0',
    ]);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('symlink-loop');
    expect(result.stdout).not.toContain('listening at');
    expectNoExternalEffects(result.effects);
    expectTreeUnchanged(before, snapshotTree(base));
  });

  // Root may search a mode-000 directory, so under root no EACCES arises and this refusal cannot occur (syzygy-bpyt.4.25).
  it.skipIf(isRoot)('rejects an unreadable state-dir path as named invalid before writes or a listener', async () => {
    const base = tempBase('syz-sys-sd-unreadable-');
    cleanups.push(() => rmSync(base, { recursive: true, force: true }));
    const fixtureRoot = join(base, 'fixture');
    writeCompleteFixture(fixtureRoot);
    const blocked = join(base, 'blocked');
    mkdirSync(blocked, { mode: 0o700 });
    const stateDir = join(blocked, 'state');
    chmodSync(blocked, 0o000);
    cleanups.push(() => chmodSync(blocked, 0o700));
    const before = snapshotTree(base);

    const result = await runDaemonToExit([
      '--root',
      fixtureRoot,
      '--state-dir',
      stateDir,
      '--port',
      '0',
    ]);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('path-unreadable');
    expect(result.stdout).not.toContain('listening at');
    expectNoExternalEffects(result.effects);
    expectTreeUnchanged(before, snapshotTree(base));
  });
});
