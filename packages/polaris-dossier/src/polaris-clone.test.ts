import { describe, expect, it } from 'vitest';
import { resolveRevision, supervisorClone, urlSlug, type CloneDeps } from './polaris.js';

/** `syzygy polaris` without `--clone` makes its own one-commit clone, fetching from the URL with no credential and reading no record
 * (D10 F-3). Git and the file system are injected, so nothing here starts a process; each case records every git command the step
 * would have run. */

const COMMIT = 'a'.repeat(40);
const OTHER = 'b'.repeat(40);
const CHOSEN = { label: 'trunk', commit: COMMIT };
const URL = 'https://example.invalid/o/r';
const deps = (head: { status: number; stdout: string } = { status: 128, stdout: '' }, exists = false) => {
  const ran: string[][] = [];
  const d: CloneDeps = {
    git: args => { ran.push([...args]); return args.includes('rev-parse') ? { ...head, stderr: '' } : { status: 0, stdout: '', stderr: '' }; },
    exists: () => exists, mkdir: () => undefined, event: () => undefined,
  };
  return { d, ran, fetched: () => ran.some(args => args.includes('fetch')) };
};
const input = { url: URL, chosen: CHOSEN, clonesRoot: '/clones' };

describe('supervisorClone', () => {
  it('fetches with no record: init, a credential-free depth-1 fetch of the commit, a detached checkout', () => {
    const { d, ran } = deps();
    expect(supervisorClone(input, d)).toEqual({ clone: '/clones/o-r-trunk' });
    expect(ran).toEqual([
      ['-C', '/clones/o-r-trunk', 'rev-parse', 'HEAD'],
      ['init', '-q', '/clones/o-r-trunk'],
      ['-C', '/clones/o-r-trunk', '-c', 'credential.helper=', 'fetch', '-q', '--depth=1', URL, COMMIT],
      ['-C', '/clones/o-r-trunk', 'checkout', '-q', '--detach', 'FETCH_HEAD'],
    ]);
  });
  it('reuses a clone already at the commit and fetches nothing', () => {
    const { d, fetched } = deps({ status: 0, stdout: `${COMMIT}\n` });
    expect(supervisorClone(input, d)).toEqual({ clone: '/clones/o-r-trunk' });
    expect(fetched()).toBe(false);
  });
  it('refuses a clone at another commit, never reusing it, and fetches nothing', () => {
    const { d, fetched } = deps({ status: 0, stdout: `${OTHER}\n` }, true);
    expect(supervisorClone(input, d)).toBe(`/clones/o-r-trunk exists but is not a clone of ${COMMIT}; remove it or pass --clone`);
    expect(fetched()).toBe(false);
  });
  it('refuses a path that holds something else and fetches nothing', () => {
    const { d, fetched } = deps({ status: 128, stdout: '' }, true);
    expect(supervisorClone(input, d)).toBe(`/clones/o-r-trunk exists but is not a clone of ${COMMIT}; remove it or pass --clone`);
    expect(fetched()).toBe(false);
  });
  it('names the failing git step', () => {
    const d: CloneDeps = {
      git: args => (args.includes('fetch') ? { status: 128, stdout: '', stderr: 'not our ref' } : { status: args.includes('rev-parse') ? 128 : 0, stdout: '', stderr: '' }),
      exists: () => false, mkdir: () => undefined, event: () => undefined,
    };
    expect(supervisorClone(input, d)).toBe(`git -C /clones/o-r-trunk -c credential.helper= fetch -q --depth=1 ${URL} ${COMMIT} failed: not our ref`);
  });
});

describe('resolveRevision: the commit a run pins', () => {
  const git = (r: { status: number; stdout: string; stderr?: string }) => {
    const ran: string[][] = [];
    return { ran, deps: { git: (args: readonly string[]) => { ran.push([...args]); return { stderr: '', ...r }; } } };
  };
  it('pins trunk, the remote HEAD, with no --revision, reading with no credential helper (syzygy-pdja.36)', () => {
    const { ran, deps: d } = git({ status: 0, stdout: `${COMMIT}\tHEAD\n` });
    expect(resolveRevision(URL, undefined, d)).toEqual({ label: `trunk-${COMMIT.slice(0, 12)}`, commit: COMMIT });
    expect(ran).toEqual([['-c', 'credential.helper=', 'ls-remote', URL, 'HEAD']]);
  });
  it('resolves a branch name to its commit', () => {
    const { ran, deps: d } = git({ status: 0, stdout: `${OTHER}\trefs/heads/unstable\n` });
    expect(resolveRevision(URL, 'unstable', d)).toEqual({ label: `unstable-${OTHER.slice(0, 12)}`, commit: OTHER });
    expect(ran).toEqual([['-c', 'credential.helper=', 'ls-remote', URL, 'unstable']]);
  });
  it('resolves an annotated tag to the commit it peels to, never the tag object', () => {
    const out = resolveRevision(URL, '8.0.0', git({ status: 0, stdout: `${OTHER}\trefs/tags/8.0.0\n${COMMIT}\trefs/tags/8.0.0^{}\n` }).deps);
    expect(out).toEqual({ label: `8.0.0-${COMMIT.slice(0, 12)}`, commit: COMMIT });
  });
  it('takes a full commit as given, still proving the URL answers anonymously', () => {
    const { ran, deps: d } = git({ status: 0, stdout: `${OTHER}\tHEAD\n` });
    expect(resolveRevision(URL, COMMIT, d)).toEqual({ label: `commit-${COMMIT.slice(0, 12)}`, commit: COMMIT });
    expect(ran).toEqual([['-c', 'credential.helper=', 'ls-remote', URL, 'HEAD']]);
  });
  it('refuses a name that matches no ref, and one that matches two different commits', () => {
    expect(resolveRevision(URL, 'nope', git({ status: 0, stdout: '' }).deps)).toBe(`${URL} has no branch or tag named nope`);
    const both = resolveRevision(URL, 'x', git({ status: 0, stdout: `${COMMIT}\trefs/heads/x\n${OTHER}\trefs/tags/x\n` }).deps);
    expect(both).toBe(`x names more than one ref at ${URL} (refs/heads/x, refs/tags/x); give the full ref or a full commit`);
  });
  it('refuses a URL that does not answer without a credential, naming --clone', () => {
    const out = resolveRevision(URL, undefined, git({ status: 128, stdout: '', stderr: 'Authentication failed' }).deps);
    expect(typeof out === 'string' && out).toContain('Authentication failed');
    expect(typeof out === 'string' && out).toContain('--clone <dir>');
  });
  it('refuses an answer with no HEAD line', () => {
    expect(resolveRevision(URL, undefined, git({ status: 0, stdout: `${COMMIT}\trefs/heads/x\n` }).deps)).toBe(`${URL} names no HEAD commit`);
  });
});

describe('urlSlug', () => {
  it.each([
    ['https://github.com/tzeusy-org/butlers', 'tzeusy-org-butlers'],
    ['https://github.com/redis/redis.git', 'redis-redis'],
    ['git@github.com:o/r.git', 'o-r'],
  ])('%s → %s', (url, slug) => { expect(urlSlug(url)).toBe(slug); });
});
