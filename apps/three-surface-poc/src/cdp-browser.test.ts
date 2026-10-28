import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, renameSync, rmSync, symlinkSync, writeFileSync, type BigIntStats } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { closeDisposableBrowser, killPrivateBrowserMembers, removeBrowserProfile, withBrowserPage, type BrowserPage, type ChromeSingletonDirectory } from './cdp-browser.js';

const privateGroup = { id: 123, uid: process.getuid?.() ?? 0, leaderStart: '1' };

describe('disposable browser shutdown', () => {
  it('closes an unresponsive protocol socket, kills the child, then removes its profile', async () => {
    const events: string[] = [];
    let onExit: (() => void) | undefined;
    let signalCode: NodeJS.Signals | null = null;
    let requestedTimeout: number | undefined;
    const connection = {
      close: () => { events.push('socket-closed'); },
      send: (_method: string, _params?: unknown, _sessionId?: string, timeoutMs?: number) => {
        events.push('protocol-close-requested');
        requestedTimeout = timeoutMs;
        return new Promise<never>((_resolve, reject) => setTimeout(() => reject(new Error('no acknowledgement')), timeoutMs ?? 0));
      },
    };
    const child: Parameters<typeof closeDisposableBrowser>[1] = {
      exitCode: null,
      get signalCode() { return signalCode; },
      once: (event, listener) => { expect(event).toBe('exit'); onExit = listener; },
      kill: (signal) => {
        events.push(signal);
        queueMicrotask(() => { signalCode = signal; onExit?.(); });
        return true;
      },
    };
    await closeDisposableBrowser(connection, child, '/tmp/private-browser-profile', privateGroup, {
      removeProfile: () => { events.push('profile-removed'); }, closeGraceMs: 5, groupProcesses: () => [],
    });
    expect(requestedTimeout).toBe(5);
    expect(events).toEqual(['protocol-close-requested', 'socket-closed', 'SIGKILL', 'profile-removed']);
  });

  it('lets an acknowledged close exit before removing the profile without a hard kill', async () => {
    const events: string[] = [];
    let onExit: (() => void) | undefined;
    let signalCode: NodeJS.Signals | null = null;
    const child: Parameters<typeof closeDisposableBrowser>[1] = {
      exitCode: null,
      get signalCode() { return signalCode; },
      once: (_event, listener) => { onExit = listener; },
      kill: () => { throw new Error('graceful child must not be killed'); },
    };
    const connection = {
      send: async () => {
        events.push('protocol-close-acknowledged');
        queueMicrotask(() => { signalCode = 'SIGTERM'; onExit?.(); events.push('child-exited'); });
        return {};
      },
      close: () => { events.push('socket-closed'); },
    };
    await closeDisposableBrowser(connection, child, '/tmp/private-browser-profile', privateGroup, {
      removeProfile: () => { events.push('profile-removed'); }, closeGraceMs: 100, groupProcesses: () => [],
    });
    expect(events).toEqual(['protocol-close-acknowledged', 'child-exited', 'socket-closed', 'profile-removed']);
  });

  it('cleans a child whose signal exit was already observed without waiting for a second exit event', async () => {
    const events: string[] = [];
    const child: Parameters<typeof closeDisposableBrowser>[1] = {
      exitCode: null,
      signalCode: 'SIGKILL',
      once: () => { throw new Error('exit already observed'); },
      kill: () => { throw new Error('child already exited'); },
    };
    await closeDisposableBrowser({ close: () => { events.push('socket-closed'); }, send: async () => ({}) }, child,
      '/tmp/private-browser-profile', privateGroup, { removeProfile: () => { events.push('profile-removed'); }, groupProcesses: () => [] });
    expect(events).toEqual(['socket-closed', 'profile-removed']);
  });

  it('waits for private Chrome group members before removal and retains the profile on drain timeout', async () => {
    const events: string[] = [];
    const exited: Parameters<typeof closeDisposableBrowser>[1] = {
      exitCode: 0, signalCode: null,
      once: () => { throw new Error('child already exited'); },
      kill: () => { throw new Error('child already exited'); },
    };
    let scans = 0;
    const connection = { close: () => { events.push('socket-closed'); }, send: async () => ({}) };
    // The drain clock advances 25 ms per scan, the loop's own sleep, so the 100 ms deadline is a count of scans and a loaded
    // host cannot overrun it on the wall clock (syzygy-bpyt.4.19), as the timeout and late-empty cases below already do.
    await closeDisposableBrowser(connection, exited, '/tmp/private-browser-profile', privateGroup, {
      closeGraceMs: 5, profileDrainMs: 100,
      now: () => scans * 25,
      groupProcesses: () => ++scans === 1 ? [123] : [],
      removeProfile: () => { events.push('profile-removed'); },
    });
    expect(scans).toBe(3);
    expect(events).toEqual(['socket-closed', 'profile-removed']);
    let timeoutScans = 0;
    await expect(closeDisposableBrowser(connection, exited, '/tmp/private-browser-profile', privateGroup, {
      closeGraceMs: 5, profileDrainMs: 1000,
      now: () => timeoutScans * 400,
      groupProcesses: () => { timeoutScans += 1; return [123]; },
      removeProfile: () => { events.push('wrong-removal'); },
    })).rejects.toThrow('private browser profile still held');
    expect(timeoutScans).toBe(3);
    expect(events).not.toContain('wrong-removal');
    let lateEmptyScans = 0;
    await expect(closeDisposableBrowser(connection, exited, '/tmp/private-browser-profile', privateGroup, {
      profileDrainMs: 1000,
      now: () => lateEmptyScans * 600,
      groupProcesses: () => { lateEmptyScans += 1; return []; },
      removeProfile: () => { events.push('wrong-removal'); },
    })).rejects.toThrow('did not verify two empty scans before deadline');
    expect(lateEmptyScans).toBe(2);
    expect(events).not.toContain('wrong-removal');
    await expect(closeDisposableBrowser(connection, exited, '/tmp/private-browser-profile', privateGroup, {
      groupProcesses: () => { throw new Error('cannot verify private browser process identity'); },
      removeProfile: () => { events.push('wrong-removal'); },
    })).rejects.toThrow('cannot verify private browser process identity');
    expect(events).not.toContain('wrong-removal');
  });

  it('retains an already-exited parent profile through a late descendant beyond the former one-second drain', async () => {
    const events: string[] = [];
    const exited: Parameters<typeof closeDisposableBrowser>[1] = {
      exitCode: 0, signalCode: null,
      once: () => { throw new Error('parent exit already observed'); },
      kill: () => { throw new Error('only the disposable parent may be signaled'); },
    };
    const members = [[], [456], [456], [], []];
    let scans = 0;
    await closeDisposableBrowser({ close: () => events.push('socket-closed'), send: async () => ({}) }, exited,
      '/tmp/private-browser-profile', privateGroup, {
        groupProcesses: group => {
          expect(group).toBe(privateGroup);
          return members[scans++] ?? [];
        },
        removeProfile: () => { expect(scans).toBe(5); events.push('profile-removed'); },
        now: () => scans * 400,
      });
    expect(events).toEqual(['socket-closed', 'profile-removed']);
  });

  it('stops helpers orphaned by a killed leader with their group, then drains before removal', async () => {
    // syzygy-za9v: under load the leader misses its grace and is killed
    // alone; its helpers outlived the three-second drain. Here they exit
    // only when stopped, so the drain passes only if teardown stops them.
    const events: string[] = [];
    const killed: Parameters<typeof closeDisposableBrowser>[1] = {
      exitCode: null, signalCode: 'SIGKILL',
      once: () => { throw new Error('exit already observed'); },
      kill: () => { throw new Error('leader already exited'); },
    };
    let alive: readonly number[] = [456, 457, 458];
    let scans = 0;
    await closeDisposableBrowser({ close: () => events.push('socket-closed'), send: async () => ({}) }, killed,
      '/tmp/private-browser-profile', privateGroup, {
        profileDrainMs: 1000,
        now: () => scans * 300,
        groupProcesses: () => { scans += 1; return alive; },
        stopMembers: (group, live) => {
          expect(group).toBe(privateGroup);
          events.push(`stopped ${live.join(',')}`);
          alive = [];
        },
        removeProfile: () => { events.push('profile-removed'); },
      });
    expect(events).toEqual(['socket-closed', 'stopped 456,457,458', 'profile-removed']);
    expect(scans).toBe(3);
  });

  it('kills the whole private group first, then each live member, tolerating members already gone', () => {
    const signals: string[] = [];
    killPrivateBrowserMembers(privateGroup, [456, 457], (pid, signal) => {
      signals.push(`${pid} ${signal}`);
      if (pid === 457) throw Object.assign(new Error('gone'), { code: 'ESRCH' });
    });
    expect(signals).toEqual(['-123 SIGKILL', '456 SIGKILL', '457 SIGKILL']);
    expect(() => killPrivateBrowserMembers(privateGroup, [456], () => { throw Object.assign(new Error('not ours'), { code: 'EPERM' }); }))
      .toThrow('not ours');
  });
});

describe('browser page lifetime', () => {
  it('closes the private browser when newPage rejects before a page exists', async () => {
    const events: string[] = [];
    const browser = {
      executable: 'fixture', version: 'fixture',
      newPage: async () => { events.push('new-page-failed'); throw new Error('target-creation-failed'); },
      close: async () => { events.push('browser-closed'); },
    };
    await expect(withBrowserPage('fixture', async () => undefined, async () => browser))
      .rejects.toThrow('target-creation-failed');
    expect(events).toEqual(['new-page-failed', 'browser-closed']);
  });

  it('closes the private browser even when page.close rejects', async () => {
    const events: string[] = [];
    const page = { close: async () => { events.push('page-close-failed'); throw new Error('target-close-failed'); } } as unknown as BrowserPage;
    const browser = {
      executable: 'fixture', version: 'fixture',
      newPage: async () => page,
      close: async () => { events.push('browser-closed'); },
    };
    await expect(withBrowserPage('fixture', async () => { events.push('assertions-complete'); }, async () => browser))
      .rejects.toThrow('target-close-failed');
    expect(events).toEqual(['assertions-complete', 'page-close-failed', 'browser-closed']);
  });
});

describe('browser profile cleanup', () => {
  // The injected `remove` touches nothing, but removeBrowserProfile also reads `<profile>/SingletonSocket` and removes
  // the directory that link names. So the profile is a path that does not exist, in a private root these tests make
  // and remove, never a fixed name in the shared temp directory where another user could have planted a link.
  const roots: string[] = [];
  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  });
  function privateRoot(): string {
    const root = mkdtempSync(join(tmpdir(), 'syzygy-profile-'));
    roots.push(root);
    return root;
  }
  const missingProfile = (): string => join(privateRoot(), 'profile');

  it('retries transient ENOTEMPTY failures and succeeds within the bound', () => {
    let attempts = 0;
    removeBrowserProfile(missingProfile(), {
      remove: () => {
        attempts += 1;
        if (attempts < 3) throw Object.assign(new Error('profile still changing'), { code: 'ENOTEMPTY' });
      },
    });
    expect(attempts).toBe(3);
  });

  it('does not retry a permanent profile cleanup failure', () => {
    let attempts = 0;
    expect(() => removeBrowserProfile(missingProfile(), {
      maxAttempts: 2,
      remove: () => {
        attempts += 1;
        throw Object.assign(new Error('profile permission denied'), { code: 'EACCES' });
      },
    })).toThrow('profile permission denied');
    expect(attempts).toBe(1);
  });

  it('preserves a retryable failure at the exact total-call bound', () => {
    let attempts = 0;
    const failure = Object.assign(new Error('profile remains busy'), { code: 'ENOTEMPTY' });
    expect(() => removeBrowserProfile(missingProfile(), {
      maxAttempts: 2,
      remove: () => {
        attempts += 1;
        throw failure;
      },
    })).toThrow(failure);
    expect(attempts).toBe(2);
  });

  it('stays bounded across repeated transient profile cleanup races', () => {
    const runs = 128;
    let totalAttempts = 0;
    const root = privateRoot();
    for (let run = 0; run < runs; run += 1) {
      const transientFailures = run % 4;
      let attempts = 0;
      removeBrowserProfile(join(root, `profile-${run}`), {
        remove: () => {
          attempts += 1;
          totalAttempts += 1;
          if (attempts <= transientFailures) throw Object.assign(new Error('profile still changing'), { code: 'ENOTEMPTY' });
        },
      });
      expect(attempts).toBe(transientFailures + 1);
    }
    expect(totalAttempts).toBe(320);
  });
});

describe('Chrome singleton directory (syzygy-bpyt.4.11)', () => {
  // 30 s each, as in the neighbouring suites: these only touch a private temp directory, but a load average of
  // 70 took more than the 5 s default for plain file system calls in this repository's other suites.
  const roots: string[] = [];
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    for (const root of roots.splice(0)) {
      for (const name of readdirSync(root)) { try { chmodSync(join(root, name), 0o755); } catch { /* not a directory */ } }
      rmSync(root, { recursive: true, force: true });
    }
  });

  /** A private temp directory that `os.tmpdir()` answers for the rest of the test, with a profile in it. */
  function privateTemp(): { readonly root: string; readonly profile: string } {
    const root = mkdtempSync(join(tmpdir(), 'syzygy-singleton-'));
    roots.push(root);
    vi.stubEnv('TMPDIR', root);
    const profile = join(root, 'syzygy-poc-browser-AbCdEf');
    mkdirSync(profile);
    return { root, profile };
  }
  /** What Chrome makes: a directory holding the singleton socket. */
  function singletonDirectory(parent: string, name: string): string {
    const directory = join(parent, name);
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, 'SingletonSocket'), '');
    return directory;
  }
  const entries = (directory: string): string[] => readdirSync(directory).sort();
  /** What launchBrowser records when it reads the link while Chrome runs: the path and the directory's identity. */
  function recorded(path: string): ChromeSingletonDirectory {
    const { dev, ino } = lstatSync(path, { bigint: true });
    return { path, dev, ino };
  }
  /** An lstat that answers as the real one does, except that `path` has another owner or device than it has. */
  function lstatWith(path: string, change: { readonly uid?: bigint; readonly dev?: bigint }): (target: string) => BigIntStats {
    return (target) => {
      const entry = lstatSync(target, { bigint: true });
      return target === path ? Object.assign(Object.create(entry) as BigIntStats, change) : entry;
    };
  }
  /** A profile whose link names a directory with Chrome's name that the test made and the profile's Chrome did not. */
  function linkedProfile(): { readonly root: string; readonly profile: string; readonly victim: string } {
    const { root, profile } = privateTemp();
    const victim = singletonDirectory(root, '.com.google.Chrome.Victim1');
    symlinkSync(join(victim, 'SingletonSocket'), join(profile, 'SingletonSocket'));
    return { root, profile, victim };
  }

  it('removes the singleton directory read while Chrome ran, with the profile, and only that one', () => {
    const { root, profile } = privateTemp();
    const mine = singletonDirectory(root, '.com.google.Chrome.MyOwn1');
    singletonDirectory(root, '.com.google.Chrome.Another');
    removeBrowserProfile(profile, { singleton: recorded(mine) });
    expect(entries(root)).toEqual(['.com.google.Chrome.Another']);
  });

  it('reads the directory from the profile\'s link when none was read while Chrome ran', () => {
    const { root, profile } = privateTemp();
    const mine = singletonDirectory(root, '.com.google.Chrome.MyOwn1');
    singletonDirectory(root, '.com.google.Chrome.Another');
    symlinkSync(join(mine, 'SingletonSocket'), join(profile, 'SingletonSocket'));
    removeBrowserProfile(profile);
    expect(entries(root)).toEqual(['.com.google.Chrome.Another']);
  });

  it('removes the Chromium form of the name too', () => {
    const { root, profile } = privateTemp();
    const mine = singletonDirectory(root, '.org.chromium.Chromium.MyOwn1');
    removeBrowserProfile(profile, { singleton: recorded(mine) });
    expect(entries(root)).toEqual([]);
  });

  it('removes the name without a leading dot too, which Chrome 147 to 155 make, whether given or read from the link', () => {
    const { root, profile } = privateTemp();
    const given = singletonDirectory(root, 'com.google.Chrome.CCtKIQ');
    singletonDirectory(root, 'com.google.Chrome.Another');
    removeBrowserProfile(profile, { singleton: recorded(given) });
    expect(entries(root)).toEqual(['com.google.Chrome.Another']);
    mkdirSync(profile);
    const read = singletonDirectory(root, 'org.chromium.Chromium.vK2oLL');
    symlinkSync(join(read, 'SingletonSocket'), join(profile, 'SingletonSocket'));
    removeBrowserProfile(profile);
    expect(entries(root)).toEqual(['com.google.Chrome.Another']);
  });

  it('removes the profile and nothing else when Chrome left no singleton directory (a clean exit)', () => {
    const { root, profile } = privateTemp();
    singletonDirectory(root, '.com.google.Chrome.Another');
    removeBrowserProfile(profile);
    expect(entries(root)).toEqual(['.com.google.Chrome.Another']);
  });

  it('keeps a directory that is not directly under the temp directory, whether it was given or read from the link', () => {
    const { root, profile } = privateTemp();
    const nested = singletonDirectory(join(root, 'elsewhere'), '.com.google.Chrome.MyOwn1');
    removeBrowserProfile(profile, { singleton: recorded(nested) });
    expect(existsSync(join(nested, 'SingletonSocket'))).toBe(true);
    mkdirSync(profile);
    symlinkSync(join(nested, 'SingletonSocket'), join(profile, 'SingletonSocket'));
    removeBrowserProfile(profile);
    expect(existsSync(join(nested, 'SingletonSocket'))).toBe(true);
    expect(existsSync(profile)).toBe(false);
  });

  it('keeps a directory whose name is not exactly Chrome\'s: another prefix, no suffix, a longer name, a symbol in the suffix', () => {
    const { root, profile } = privateTemp();
    const names = [
      'important', '.com.google.Chrome', '.com.google.Chrome.', '.com.google.Chrome.ab-cd', 'x.com.google.Chrome.AbCdEf', '.com.google.Chromium.AbCdEf', '.org.chromium.Chrome.AbCdEf',
      // the dot is optional, not a wildcard: one dot at most, and the rest of the name is as strict without it
      '..com.google.Chrome.AbCdEf', 'com.google.Chrome', 'com.google.Chrome.', 'com.google.Chrome.ab-cd', 'xcom.google.Chrome.AbCdEf', 'com.google.Chromium.AbCdEf', 'org.chromium.Chrome.AbCdEf',
      'org.chromium.Chromium', 'org.chromium.Chromium.AbCd.Ef',
      // the match is case-sensitive: Chrome's spelling and no other
      '.COM.GOOGLE.CHROME.AbCdEf', 'com.google.chrome.AbCdEf', 'ORG.chromium.Chromium.AbCdEf',
    ];
    for (const name of names) {
      singletonDirectory(root, name);
      removeBrowserProfile(profile, { singleton: recorded(join(root, name)) });
      mkdirSync(profile);
    }
    expect(entries(root)).toEqual([...names, 'syzygy-poc-browser-AbCdEf'].sort());
  });

  it('follows no link and removes no file: a link to a directory and a plain file with Chrome\'s name both stay', () => {
    const { root, profile } = privateTemp();
    const outside = singletonDirectory(root, 'outside');
    symlinkSync(outside, join(root, '.com.google.Chrome.LinkTo'));
    writeFileSync(join(root, '.com.google.Chrome.AFile1'), 'a file');
    removeBrowserProfile(profile, { singleton: recorded(join(root, '.com.google.Chrome.LinkTo')) });
    mkdirSync(profile);
    // The same link recorded as the directory it leads to: only reading the entry without following it keeps it.
    removeBrowserProfile(profile, { singleton: { ...recorded(outside), path: join(root, '.com.google.Chrome.LinkTo') } });
    mkdirSync(profile);
    removeBrowserProfile(profile, { singleton: recorded(join(root, '.com.google.Chrome.AFile1')) });
    expect(lstatSync(join(root, '.com.google.Chrome.LinkTo')).isSymbolicLink()).toBe(true);
    expect(existsSync(join(outside, 'SingletonSocket'))).toBe(true);
    expect(existsSync(join(root, '.com.google.Chrome.AFile1'))).toBe(true);
  });

  it('keeps a directory that belongs to another user, never entering it', () => {
    const { root, profile } = privateTemp();
    const theirs = singletonDirectory(root, '.com.google.Chrome.TheirOw');
    const posix = process as unknown as { getuid: () => number };
    vi.spyOn(posix, 'getuid').mockReturnValue(posix.getuid() + 1);
    removeBrowserProfile(profile, { singleton: recorded(theirs) });
    expect(existsSync(join(theirs, 'SingletonSocket'))).toBe(true);
  });

  it('checks no user where the system has no user ids, and removes the directory', () => {
    const { root, profile } = privateTemp();
    const mine = singletonDirectory(root, '.com.google.Chrome.MyOwn1');
    const original = process.getuid;
    Object.defineProperty(process, 'getuid', { value: undefined, configurable: true, writable: true });
    try {
      removeBrowserProfile(profile, { singleton: recorded(mine) });
    } finally {
      Object.defineProperty(process, 'getuid', { value: original, configurable: true, writable: true });
    }
    expect(entries(root)).toEqual([]);
  });

  it('removes the directory a profile\'s link names when the profile and the link are the running user\'s, whatever removes the profile', () => {
    const { profile, victim } = linkedProfile();
    removeBrowserProfile(profile, { remove: () => undefined });
    expect(existsSync(victim)).toBe(false);
  });

  it('keeps the directory a link names when the profile is not the running user\'s, as in a shared temp directory where another user made it first', () => {
    const { profile, victim } = linkedProfile();
    removeBrowserProfile(profile, { remove: () => undefined, lstat: lstatWith(profile, { uid: lstatSync(profile, { bigint: true }).uid + 1n }) });
    expect(existsSync(join(victim, 'SingletonSocket'))).toBe(true);
  });

  it('keeps the directory a link names when the link is not the running user\'s', () => {
    const { profile, victim } = linkedProfile();
    const link = join(profile, 'SingletonSocket');
    removeBrowserProfile(profile, { remove: () => undefined, lstat: lstatWith(link, { uid: lstatSync(link, { bigint: true }).uid + 1n }) });
    expect(existsSync(join(victim, 'SingletonSocket'))).toBe(true);
  });

  it('keeps a directory made under the same name after the one that was read, as when Chrome exits cleanly and another Chrome follows', () => {
    const { root, profile } = privateTemp();
    const read = singletonDirectory(root, '.com.google.Chrome.MyOwn1');
    const atLaunch = recorded(read);
    // Chrome removes its directory on a clean exit and another Chrome makes one under the same name. The first is kept
    // under another name here so that the two cannot share an inode number, which a file system may reuse.
    renameSync(read, join(root, 'moved-aside'));
    const later = singletonDirectory(root, '.com.google.Chrome.MyOwn1');
    removeBrowserProfile(profile, { singleton: atLaunch });
    expect(existsSync(join(later, 'SingletonSocket'))).toBe(true);
  });

  it('keeps a directory with the recorded inode number on another device', () => {
    const { root, profile } = privateTemp();
    const mine = singletonDirectory(root, '.com.google.Chrome.MyOwn1');
    const atLaunch = recorded(mine);
    removeBrowserProfile(profile, { singleton: atLaunch, lstat: lstatWith(mine, { dev: atLaunch.dev + 1n }) });
    expect(existsSync(join(mine, 'SingletonSocket'))).toBe(true);
  });

  it('does not fail the run when the singleton directory cannot be removed', ({ skip }) => {
    // A process running as root ignores directory permission bits, so the removal below cannot be made to fail.
    skip(process.getuid?.() === 0, 'running as root');
    const { root, profile } = privateTemp();
    const stuck = singletonDirectory(root, '.com.google.Chrome.Stuck01');
    chmodSync(stuck, 0o555);
    expect(() => removeBrowserProfile(profile, { singleton: recorded(stuck) })).not.toThrow();
    expect(existsSync(profile)).toBe(false);
    expect(existsSync(join(stuck, 'SingletonSocket'))).toBe(true);
  });
});
