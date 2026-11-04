import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readlinkSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PocModel } from '@syzygy/three-surface-poc-core';

import { FIXTURE_PREFIX } from './fixture-directories.js';
import { fixtureRepoWithGit, frozenFixture, sharedFixtureModels } from './test-model-fixture.js';

/** The inode of this process's PID namespace, read independently of the helper under test; `0` without /proc. */
function ownNamespace(): string {
  try {
    return /\[(\d+)\]$/.exec(readlinkSync('/proc/self/ns/pid'))?.[1] ?? '0';
  } catch {
    return '0';
  }
}

describe('fixture repositories (syzygy-jsyi)', () => {
  const git = (root: string, args: readonly string[]): string => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();

  it('gives each call its own clean copy at the revision a fresh pinned commit mints, and keeps a write in its own copy', () => {
    const cleanups: string[] = [];
    try {
      const first = fixtureRepoWithGit(cleanups);
      const second = fixtureRepoWithGit(cleanups);
      expect(first.repoRoot).not.toBe(second.repoRoot);
      expect(cleanups).toEqual([first.repoRoot, second.repoRoot]);
      // Committed by hand from the same eight files, author and pinned instants.
      expect([first.revision, second.revision]).toEqual(['2ade4e966635973c82defd6bbeb21bfe6e69fdc3', '2ade4e966635973c82defd6bbeb21bfe6e69fdc3']);
      expect(git(first.repoRoot, ['rev-parse', 'HEAD'])).toBe(first.revision);
      expect(git(first.repoRoot, ['status', '--porcelain'])).toBe('');
      writeFileSync(join(first.repoRoot, 'README.md'), 'changed\n');
      expect(git(first.repoRoot, ['status', '--porcelain'])).toBe('M README.md');
      expect(git(second.repoRoot, ['status', '--porcelain'])).toBe('');
      // Git state is per copy too: a stage, a commit and a new ref in one copy
      // reach neither a sibling nor the template a later copy comes from.
      const refs = git(second.repoRoot, ['for-each-ref', '--format=%(refname) %(objectname)']);
      const index = git(second.repoRoot, ['ls-files', '--stage']);
      git(first.repoRoot, ['add', 'README.md']);
      git(first.repoRoot, ['-c', 'commit.gpgsign=false', '-c', 'user.name=Writer', '-c', 'user.email=writer@example.invalid', 'commit', '-qm', 'write']);
      git(first.repoRoot, ['update-ref', 'refs/heads/written', 'HEAD']);
      expect(git(first.repoRoot, ['rev-parse', 'HEAD'])).not.toBe(first.revision);
      for (const copy of [second, fixtureRepoWithGit(cleanups)]) {
        expect(git(copy.repoRoot, ['rev-parse', 'HEAD'])).toBe(first.revision);
        expect(git(copy.repoRoot, ['for-each-ref', '--format=%(refname) %(objectname)'])).toBe(refs);
        expect(git(copy.repoRoot, ['ls-files', '--stage'])).toBe(index);
        expect(git(copy.repoRoot, ['status', '--porcelain'])).toBe('');
      }
      rmSync(first.repoRoot, { recursive: true, force: true });
      const third = fixtureRepoWithGit(cleanups);
      expect(git(third.repoRoot, ['rev-parse', 'HEAD'])).toBe(third.revision);
      expect(git(third.repoRoot, ['status', '--porcelain'])).toBe('');
    } finally {
      for (const directory of cleanups) rmSync(directory, { recursive: true, force: true });
    }
  });
});

describe('shared fixture models (syzygy-k66p)', () => {
  it('freezes every nested object and array, so a test that writes to a shared model throws', () => {
    const value = frozenFixture({ shape: { items: [{ state: 'observed' }] }, bytes: new Uint8Array([1, 2]) });
    expect(() => { (value.shape.items[0] as { state: string }).state = 'unknown'; }).toThrow(TypeError);
    expect(() => { (value.shape.items as { state: string }[]).push({ state: 'extra' }); }).toThrow(TypeError);
    expect(() => { (value as { shape: unknown }).shape = {}; }).toThrow(TypeError);
    expect(value.shape.items[0]?.state).toBe('observed');
    expect(Object.isFrozen(value.bytes)).toBe(false);
  });

  it('builds once, refuses a read before prepare, and removes its repositories', () => {
    let builds = 0;
    let directory = '';
    const shared = sharedFixtureModels<'only'>((cleanups) => {
      builds += 1;
      directory = mkdtempSync(join(tmpdir(), 'syzygy-k66p-shared-'));
      cleanups.push(directory);
      return { only: { marker: builds } as unknown as PocModel };
    });
    expect(() => shared.get('only')).toThrow('shared fixture models used before prepare');
    shared.prepare();
    shared.prepare();
    expect(builds).toBe(1);
    expect(shared.get('only')).toBe(shared.get('only'));
    expect(Object.isFrozen(shared.get('only'))).toBe(true);
    expect(existsSync(directory)).toBe(true);
    shared.remove();
    expect(existsSync(directory)).toBe(false);
    expect(() => shared.get('only')).toThrow('shared fixture models used before prepare');
  });
});

describe('fixture directory names (syzygy-bpyt.4.10)', () => {
  const privateTmp: string[] = [];
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    for (const directory of privateTmp.splice(0)) rmSync(directory, { recursive: true, force: true });
  });

  /** A fresh copy of the helper module that sees only this test's own TMPDIR, so the
   * directories it makes can be counted without another test file's. */
  async function freshHelper(): Promise<{ readonly helper: typeof import('./test-model-fixture.js'); readonly tmp: string }> {
    const tmp = mkdtempSync(join(tmpdir(), 'syzygy-fixture-names-'));
    privateTmp.push(tmp);
    vi.stubEnv('TMPDIR', tmp);
    vi.resetModules();
    return { helper: await import('./test-model-fixture.js'), tmp };
  }

  it('names the template and each copy with the pid and PID namespace of the process that made them', async () => {
    const { helper, tmp } = await freshHelper();
    const copies = [helper.fixtureRepoWithGit([]), helper.fixtureRepoWithGit([])];
    const names = readdirSync(tmp).sort();
    const owner = `p${process.pid}-n${ownNamespace()}`;
    expect(names.filter((name) => new RegExp(`^${FIXTURE_PREFIX}template-${owner}-[A-Za-z0-9]{6}$`).test(name))).toHaveLength(1);
    expect(names.filter((name) => new RegExp(`^${FIXTURE_PREFIX}${owner}-[A-Za-z0-9]{6}$`).test(name))).toHaveLength(2);
    expect(names).toHaveLength(3);
    expect(copies.map((copy) => copy.repoRoot.startsWith(join(tmp, `${FIXTURE_PREFIX}${owner}-`)))).toEqual([true, true]);
  }, 30_000); // makes a template and two fixture copies with git: worst 3.5 s over 5 alone runs at load1 107-143 (docs/evidence/syzygy-bpyt-4-31/durations/test-model-fixture.test.tests.json)

  it('does not sweep when a file makes its template: the sweep is the global setup\'s, once per run', async () => {
    const { helper, tmp } = await freshHelper();
    const deadPid = 4_194_305; // above the largest pid Linux hands out, so never alive
    expect(() => process.kill(deadPid, 0)).toThrow(expect.objectContaining({ code: 'ESRCH' }));
    const leftover = `${FIXTURE_PREFIX}p${deadPid}-n${ownNamespace()}-AbCdEf`;
    mkdirSync(join(tmp, leftover));
    helper.fixtureRepoWithGit([]);
    expect(existsSync(join(tmp, leftover))).toBe(true);
    expect(readdirSync(tmp)).toHaveLength(3);
  }, 30_000); // makes a template and one fixture copy with git: worst 4.3 s over 5 alone runs at load1 107-143 (docs/evidence/syzygy-bpyt-4-31/durations/test-model-fixture.test.tests.json)
});
