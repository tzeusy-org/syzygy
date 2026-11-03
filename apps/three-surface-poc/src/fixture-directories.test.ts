import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FIXTURE_PREFIX, removeFixturesOfDeadProcesses } from './fixture-directories.js';
import removeFixturesOfKilledRuns from './test-fixture-sweep.global-setup.js';

/** The inode of this process's PID namespace, read independently of the module under test; undefined without /proc. */
function ownNamespace(): string | undefined {
  try {
    return /\[(\d+)\]$/.exec(readlinkSync('/proc/self/ns/pid'))?.[1];
  } catch {
    return undefined;
  }
}
const NS = ownNamespace() ?? '0';
const OTHER_NS = String(Number(NS) + 1);
// A process that cannot read its namespace sweeps nothing, by design, so a test that needs a directory removed
// is skipped there (a host without /proc, or a sandbox with a tmpfs over it), never passed. Tests of what the
// sweep keeps, and the test of the unreadable case, run everywhere.
const sweeping = it.skipIf(ownNamespace() === undefined);

describe('fixture directories a killed run left behind (syzygy-bpyt.4.10)', () => {
  const privateTmp: string[] = [];
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    for (const directory of privateTmp.splice(0)) rmSync(directory, { recursive: true, force: true });
  });

  function newTmp(): string {
    const tmp = mkdtempSync(join(tmpdir(), 'syzygy-fixture-sweep-'));
    privateTmp.push(tmp);
    return tmp;
  }
  /** The pid of a process that has run and been reaped, checked to answer ESRCH. */
  async function deadPid(): Promise<number> {
    const child = spawn(process.execPath, ['-e', '']);
    await once(child, 'exit');
    const pid = child.pid!;
    expect(() => process.kill(pid, 0)).toThrow(expect.objectContaining({ code: 'ESRCH' }));
    return pid;
  }
  const entries = (tmp: string): string[] => readdirSync(tmp).sort();
  const make = (tmp: string, ...names: string[]): void => {
    for (const name of names) {
      mkdirSync(join(tmp, name, 'repo'), { recursive: true });
      writeFileSync(join(tmp, name, 'repo', 'README.md'), '# left behind\n');
    }
  };

  sweeping('removes the copy and the template of a process that is gone', async () => {
    const tmp = newTmp();
    const dead = await deadPid();
    make(tmp, `${FIXTURE_PREFIX}p${dead}-n${NS}-AbCdEf`, `${FIXTURE_PREFIX}template-p${dead}-n${NS}-AbCdEf`);
    removeFixturesOfDeadProcesses(tmp);
    expect(entries(tmp)).toEqual([]);
  });

  it('keeps the directories of a live process, the current one included', () => {
    const tmp = newTmp();
    const mine = [`${FIXTURE_PREFIX}p${process.pid}-n${NS}-AbCdEf`, `${FIXTURE_PREFIX}template-p${process.pid}-n${NS}-AbCdEf`];
    make(tmp, ...mine);
    removeFixturesOfDeadProcesses(tmp);
    expect(entries(tmp)).toEqual([...mine].sort());
  });

  it('keeps a name that carries no pid and namespace segment, whatever its suffix', async () => {
    const tmp = newTmp();
    const dead = await deadPid();
    const kept = [
      `${FIXTURE_PREFIX}AbCdEf`, // made before pids were added
      `${FIXTURE_PREFIX}template-AbCdEf`,
      `${FIXTURE_PREFIX}p${dead}-AbCdEf`, // made before the namespace was added
      `${FIXTURE_PREFIX}template-p${dead}-AbCdEf`,
      `${FIXTURE_PREFIX}p${dead}`, // pid with no hyphen after it
      `${FIXTURE_PREFIX}p${dead}-n${NS}`, // namespace with no hyphen after it
      `${FIXTURE_PREFIX}p${dead}-n-AbCdEf`, // empty namespace
      `${FIXTURE_PREFIX}p${dead}-m${NS}-AbCdEf`, // not an n segment
      `${FIXTURE_PREFIX}x-p${dead}-n${NS}-AbCdEf`, // pid segment not straight after the prefix
      `${FIXTURE_PREFIX}template-x-p${dead}-n${NS}-AbCdEf`,
      `other-fixture-p${dead}-n${NS}-AbCdEf`, // another prefix
      `copy-of-${FIXTURE_PREFIX}p${dead}-n${NS}-AbCdEf`, // the prefix inside a longer name
      `${FIXTURE_PREFIX.slice(0, -1)}p${dead}-n${NS}-AbCdEf`, // prefix without its last hyphen
    ];
    make(tmp, ...kept);
    removeFixturesOfDeadProcesses(tmp);
    expect(entries(tmp)).toEqual([...kept].sort());
  });

  it('keeps a directory whose pid fails with anything but ESRCH', async () => {
    const tmp = newTmp();
    const dead = await deadPid();
    const denied = `${FIXTURE_PREFIX}p${dead}-n${NS}-AbCdEf`;
    const outOfRange = `${FIXTURE_PREFIX}template-p99999999999999999999-n${NS}-AbCdEf`;
    make(tmp, denied, outOfRange);
    const kill = process.kill.bind(process);
    vi.spyOn(process, 'kill').mockImplementation((pid, signal) => {
      if (pid === dead) throw Object.assign(new Error('operation not permitted'), { code: 'EPERM' });
      return kill(pid, signal);
    });
    removeFixturesOfDeadProcesses(tmp);
    expect(entries(tmp)).toEqual([denied, outOfRange].sort());
  });

  sweeping('follows no symlink and removes no file: only a directory with a dead pid in its name goes', async () => {
    const tmp = newTmp();
    const dead = await deadPid();
    const outside = join(tmp, 'outside');
    mkdirSync(join(outside, 'precious'), { recursive: true });
    writeFileSync(join(outside, 'precious', 'keep.txt'), 'not a fixture\n');
    const swept = join(tmp, 'swept');
    mkdirSync(swept);
    const link = `${FIXTURE_PREFIX}p${dead}-n${NS}-LinkTo`;
    const file = `${FIXTURE_PREFIX}template-p${dead}-n${NS}-AFile1`;
    symlinkSync(outside, join(swept, link));
    writeFileSync(join(swept, file), 'a file\n');
    make(swept, `${FIXTURE_PREFIX}p${dead}-n${NS}-AbCdEf`);
    removeFixturesOfDeadProcesses(swept);
    expect(entries(swept)).toEqual([file, link].sort());
    expect(lstatSync(join(swept, link)).isSymbolicLink()).toBe(true);
    expect(existsSync(join(outside, 'precious', 'keep.txt'))).toBe(true);
  });

  sweeping('keeps the directories of a dead pid that belong to another PID namespace, whatever the neighbouring value', async () => {
    const tmp = newTmp();
    const dead = await deadPid();
    // The next inode, a proper prefix of this namespace's inode and an extension of it: a comparison that is not
    // an exact match would take the last two for this namespace's own.
    const foreign = [OTHER_NS, NS.slice(0, -1), `${NS}0`].flatMap((namespace, index) => [
      `${FIXTURE_PREFIX}p${dead}-n${namespace}-AbCdE${index}`,
      `${FIXTURE_PREFIX}template-p${dead}-n${namespace}-AbCdE${index}`,
    ]);
    make(tmp, ...foreign, `${FIXTURE_PREFIX}p${dead}-n${NS}-Own123`);
    removeFixturesOfDeadProcesses(tmp);
    expect(entries(tmp)).toEqual([...foreign].sort());
  });

  // A reading that is absent (no /proc, a tmpfs over it) and one that names no inode are the same to the sweep.
  it.each([
    ['cannot be read', (): string => { throw Object.assign(new Error('ENOENT: no such file or directory'), { code: 'ENOENT' }); }],
    ['names no inode', (): string => 'pid:[]'],
  ] as const)('removes nothing, and lists nothing, where the PID namespace %s, so a sandbox without /proc never sweeps another sandbox\'s live directories', async (_reading, readlink) => {
    const tmp = newTmp();
    const dead = await deadPid();
    // Names a sandbox without /proc makes (`n0`), and a dead pid of this namespace: with no reading of its own
    // namespace the sweep has no evidence about any of them.
    const unread = [
      `${FIXTURE_PREFIX}p${dead}-n0-AbCdEf`,
      `${FIXTURE_PREFIX}template-p${dead}-n0-AbCdEf`,
      `${FIXTURE_PREFIX}p${dead}-n${NS}-AbCdEf`,
    ];
    make(tmp, ...unread);
    const listings: string[] = [];
    vi.resetModules();
    vi.doMock('node:fs', async (importOriginal) => {
      const actual = await importOriginal<typeof import('node:fs')>();
      return {
        ...actual,
        readlinkSync: ((path: string, ...rest: never[]) => (
          path === '/proc/self/ns/pid' ? readlink() : (actual.readlinkSync as (...args: unknown[]) => unknown)(path, ...rest)
        )) as typeof actual.readlinkSync,
        readdirSync: ((path: string, ...rest: never[]) => {
          listings.push(String(path));
          return (actual.readdirSync as (...args: unknown[]) => unknown)(path, ...rest);
        }) as typeof actual.readdirSync,
      };
    });
    try {
      const unreadable = await import('./fixture-directories.js');
      unreadable.removeFixturesOfDeadProcesses(tmp);
      // Names are still made, so a process that can read its namespace recognises them.
      expect(unreadable.ownedCopyPrefix()).toBe(`${FIXTURE_PREFIX}p${process.pid}-n0-`);
      expect(unreadable.ownedTemplatePrefix()).toBe(`${FIXTURE_PREFIX}template-p${process.pid}-n0-`);
    } finally {
      vi.doUnmock('node:fs');
      vi.resetModules();
    }
    expect(entries(tmp)).toEqual([...unread].sort());
    expect(listings).toEqual([]);
  });

  it('keeps a directory that belongs to another user, the sweep never descending into it', async () => {
    const tmp = newTmp();
    const dead = await deadPid();
    const theirs = `${FIXTURE_PREFIX}p${dead}-n${NS}-Theirs1`;
    make(tmp, theirs);
    const posix = process as unknown as { getuid: () => number };
    vi.spyOn(posix, 'getuid').mockReturnValue(posix.getuid() + 1);
    removeFixturesOfDeadProcesses(tmp);
    expect(entries(tmp)).toEqual([theirs]);
    expect(existsSync(join(tmp, theirs, 'repo', 'README.md'))).toBe(true);
  });

  sweeping('checks no user where the system has no user ids, and removes the dead process\'s directory', async () => {
    const tmp = newTmp();
    const dead = await deadPid();
    make(tmp, `${FIXTURE_PREFIX}p${dead}-n${NS}-AbCdEf`);
    const original = process.getuid;
    Object.defineProperty(process, 'getuid', { value: undefined, configurable: true, writable: true });
    try {
      removeFixturesOfDeadProcesses(tmp);
    } finally {
      Object.defineProperty(process, 'getuid', { value: original, configurable: true, writable: true });
    }
    expect(entries(tmp)).toEqual([]);
  });

  it('does not fail the run when the temp directory cannot be listed', async () => {
    const tmp = newTmp();
    const dead = await deadPid();
    const stuck = `${FIXTURE_PREFIX}p${dead}-n${NS}-AbCdEf`;
    make(tmp, stuck);
    chmodSync(tmp, 0o333);
    try {
      expect(() => removeFixturesOfDeadProcesses(tmp)).not.toThrow();
      expect(() => removeFixturesOfDeadProcesses(join(tmp, 'absent'))).not.toThrow();
    } finally {
      chmodSync(tmp, 0o755);
    }
    expect(entries(tmp)).toEqual([stuck]);
  });

  it('lists only the directory it is given: nothing beside it, nothing below a non-fixture entry', async () => {
    const tmp = newTmp();
    const dead = await deadPid();
    const swept = join(tmp, 'swept');
    const beside = `${FIXTURE_PREFIX}p${dead}-n${NS}-Beside`;
    const below = join('somebody-elses', `${FIXTURE_PREFIX}p${dead}-n${NS}-Below`);
    mkdirSync(swept);
    make(tmp, beside);
    make(swept, below);
    removeFixturesOfDeadProcesses(swept);
    expect(existsSync(join(tmp, beside))).toBe(true);
    expect(existsSync(join(swept, below))).toBe(true);
  });

  sweeping('does not fail the run when a dead process\'s directory cannot be removed', async () => {
    const tmp = newTmp();
    const dead = await deadPid();
    const stuck = `${FIXTURE_PREFIX}p${dead}-n${NS}-AbCdEf`;
    make(tmp, stuck, `${FIXTURE_PREFIX}template-p${dead}-n${NS}-AbCdEf`);
    chmodSync(join(tmp, stuck), 0o555);
    try {
      expect(() => removeFixturesOfDeadProcesses(tmp)).not.toThrow();
      // The other directory is still removed: one failure does not end the sweep.
      expect(entries(tmp)).not.toContain(`${FIXTURE_PREFIX}template-p${dead}-n${NS}-AbCdEf`);
    } finally {
      chmodSync(join(tmp, stuck), 0o755);
    }
  });

  sweeping('sweeps the temp directory the process runs under when the global setup runs, and keeps the live and the legacy', async () => {
    const tmp = newTmp();
    const dead = await deadPid();
    const survivors = [`${FIXTURE_PREFIX}p${process.pid}-n${NS}-AbCdEf`, `${FIXTURE_PREFIX}AbCdEf`, `${FIXTURE_PREFIX}template-AbCdEf`];
    make(tmp, `${FIXTURE_PREFIX}p${dead}-n${NS}-AbCdEf`, `${FIXTURE_PREFIX}template-p${dead}-n${NS}-AbCdEf`, ...survivors);
    vi.stubEnv('TMPDIR', tmp);
    removeFixturesOfKilledRuns();
    expect(entries(tmp)).toEqual([...survivors].sort());
  });

  sweeping('asks the operating system for the temp directory, so it sweeps the same directory the copies are made in when TMPDIR is unset', async () => {
    const tmp = newTmp();
    const dead = await deadPid();
    const live = `${FIXTURE_PREFIX}p${process.pid}-n${NS}-AbCdEf`;
    make(tmp, `${FIXTURE_PREFIX}p${dead}-n${NS}-AbCdEf`, live);
    vi.stubEnv('TMPDIR', undefined);
    vi.resetModules();
    vi.doMock('node:os', async (importOriginal) => ({ ...(await importOriginal<typeof import('node:os')>()), tmpdir: () => tmp }));
    try {
      const { default: sweepOnce } = await import('./test-fixture-sweep.global-setup.js');
      sweepOnce();
    } finally {
      vi.doUnmock('node:os');
      vi.resetModules();
    }
    expect(entries(tmp)).toEqual([live]);
  });

  it('is registered as the one global setup of every tier project and of no other entry', async () => {
    const config = (await import(/* @vite-ignore */ new URL('../../../vitest.config.ts', import.meta.url).href)).default as {
      readonly test: { readonly globalSetup?: unknown; readonly projects: readonly { readonly test: { readonly name: string; readonly globalSetup?: readonly string[] } }[] };
    };
    const withSetup = config.test.projects.filter((project) => project.test.globalSetup !== undefined);
    expect(config.test.globalSetup).toBeUndefined();
    expect(withSetup.map((project) => project.test.name)).toEqual(['unit', 'integration', 'e2e', 'live']);
    expect(config.test.projects).toHaveLength(4);
    for (const { test } of withSetup) {
      expect(test.globalSetup, test.name).toHaveLength(1);
      expect(test.globalSetup?.[0]?.endsWith('/apps/three-surface-poc/src/test-fixture-sweep.global-setup.ts'), test.name).toBe(true);
    }
  }, 30_000); // importing the config timed out at the 5 s default at load 95 (3f08143c)
});
