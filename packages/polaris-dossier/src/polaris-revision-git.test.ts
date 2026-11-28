import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { anonymousGit, operatorCloneIsPublic, resolveRevision, supervisorClone } from './polaris.js';

/** `resolveRevision` and the one-commit clone against real git, over a file:// remote (R-K54O3-NO-RECORD-1 findings 1 and 7): a real
 * `ls-remote <name>` prints no peeled line unless asked, so only real git shows that an annotated tag pins its commit. */

let dir = '';
let url = '';
const commits: Record<string, string> = {};
const run = (args: string[], cwd = path.join(dir, 'src')) => {
  const r = spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.invalid', '-c', 'commit.gpgsign=false', '-c', 'tag.gpgsign=false', ...args], { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
};

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'polaris-revision-'));
  fs.mkdirSync(path.join(dir, 'src'));
  run(['init', '-q', '-b', 'main']);
  for (const name of ['one', 'two']) {
    fs.writeFileSync(path.join(dir, 'src', 'f.txt'), name);
    run(['add', 'f.txt']);
    run(['commit', '-q', '-m', name]);
    commits[name] = run(['rev-parse', 'HEAD']);
  }
  run(['tag', '-a', '-m', 'release', 'v1', commits['one']!]);
  run(['branch', 'old', commits['one']!]);
  run(['tag', '-a', '-m', 'shadow', 'main', commits['one']!]);
  url = `file://${path.join(dir, 'src')}`;
});
afterAll(() => { fs.rmSync(dir, { recursive: true, force: true }); });

describe('resolveRevision with real git', () => {
  it('pins trunk, the remote HEAD', () => {
    expect(resolveRevision(url, undefined, { git: anonymousGit })).toEqual({ label: `trunk-${commits['two']!.slice(0, 12)}`, commit: commits['two'] });
  });
  it('pins the commit an annotated tag peels to, never the tag object', () => {
    expect(resolveRevision(url, 'v1', { git: anonymousGit })).toEqual({ label: `v1-${commits['one']!.slice(0, 12)}`, commit: commits['one'] });
  });
  it('pins a branch', () => {
    expect(resolveRevision(url, 'old', { git: anonymousGit })).toEqual({ label: `old-${commits['one']!.slice(0, 12)}`, commit: commits['one'] });
  });
  it('refuses a branch and a tag of one name that name different commits', () => {
    expect(resolveRevision(url, 'main', { git: anonymousGit })).toMatch(/^main names more than one ref .*\(refs\/heads\/main, refs\/tags\/main\)/u);
  });
  it('fetches the tag\'s commit alone, and the clone holds that one commit', () => {
    const chosen = resolveRevision(url, 'v1', { git: anonymousGit });
    if (typeof chosen === 'string') throw new Error(chosen);
    const out = supervisorClone({ url, chosen, clonesRoot: path.join(dir, 'clones') }, {
      git: anonymousGit, exists: file => fs.existsSync(file), mkdir: d => { fs.mkdirSync(d, { recursive: true }); }, event: () => undefined,
    });
    if (typeof out === 'string') throw new Error(out);
    expect(run(['rev-list', '--all'], out.clone)).toBe(commits['one']);
    expect(run(['rev-parse', 'HEAD'], out.clone)).toBe(commits['one']);
  });
  it('declares an operator clone public only when its commit is the remote trunk', () => {
    expect(operatorCloneIsPublic(url, commits['two']!, { git: anonymousGit })).toBe(true);
    expect(operatorCloneIsPublic(url, commits['one']!, { git: anonymousGit })).toBe(false);
    expect(operatorCloneIsPublic(`${url}-missing`, commits['two']!, { git: anonymousGit })).toBe(false);
  });
  it('reads no global configuration: an insteadOf rewrite in the operator\'s config is ignored', () => {
    const home = path.join(dir, 'home');
    fs.mkdirSync(home, { recursive: true });
    fs.writeFileSync(path.join(home, '.gitconfig'), `[url "${url}"]\n\tinsteadOf = https://rewritten.invalid/r\n`);
    const before = process.env['HOME'];
    process.env['HOME'] = home;
    try {
      expect(typeof resolveRevision('https://rewritten.invalid/r', undefined, { git: anonymousGit })).toBe('string');
    } finally { process.env['HOME'] = before; }
  });
});

describe('the trunk default follows the remote (syzygy-pdja.36)', () => {
  let other = '';
  let otherUrl = '';
  const git = (args: string[]) => run(args, path.join(other, 'src'));
  const commit = (text: string) => { fs.writeFileSync(path.join(other, 'src', 'f.txt'), text); git(['add', 'f.txt']); git(['commit', '-q', '-m', text]); return git(['rev-parse', 'HEAD']); };
  beforeAll(() => {
    other = fs.mkdtempSync(path.join(os.tmpdir(), 'polaris-trunk-'));
    fs.mkdirSync(path.join(other, 'src'));
    git(['init', '-q', '-b', 'develop']);
    otherUrl = `file://${path.join(other, 'src')}`;
  });
  afterAll(() => { fs.rmSync(other, { recursive: true, force: true }); });

  it('pins the tip of a default branch that is not named main, and pins the new tip after the remote moves', () => {
    const first = commit('first');
    git(['branch', 'main', first]);
    const second = commit('second');
    expect(resolveRevision(otherUrl, undefined, { git: anonymousGit })).toEqual({ label: `trunk-${second.slice(0, 12)}`, commit: second });
    const third = commit('third');
    expect(resolveRevision(otherUrl, undefined, { git: anonymousGit })).toEqual({ label: `trunk-${third.slice(0, 12)}`, commit: third });
    // An explicit older revision is kept as given, never replaced by the moved trunk.
    expect(resolveRevision(otherUrl, 'main', { git: anonymousGit })).toEqual({ label: `main-${first.slice(0, 12)}`, commit: first });
  });
});
