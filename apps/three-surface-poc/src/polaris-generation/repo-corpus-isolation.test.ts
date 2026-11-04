import { execFileSync as realExecFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { readGitBlobsBatch } from '../git-blob-batch.js';
import { ISOLATED_GIT_ENV_KEYS, ISOLATED_GIT_FLAGS, isolatedGit, isolatedGitEnv } from './isolated-git.js';
import { readRepoCorpus, type CorpusAdmissionPort } from './repo-corpus.js';
import { tempDir } from '@syzygy/test-kit';

const spy = vi.hoisted(() => ({ calls: [] as { file: string; args: string[]; env: Record<string, string | undefined> | undefined }[] }));
vi.mock('node:child_process', async importOriginal => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return { ...actual, execFileSync: ((file: string, args: string[], options?: { env?: Record<string, string | undefined> }) => {
    spy.calls.push({ file, args: [...args], env: options?.env === undefined ? undefined : { ...options.env } });
    return (actual.execFileSync as (...a: unknown[]) => unknown)(file, args, options);
  }) as typeof actual.execFileSync };
});

const allow: CorpusAdmissionPort = { decide: async () => ({ allowed: true, permissionIdentity: 'fixture-consent-v1' }) };

interface Fixture { readonly dir: string; readonly commit: string; readonly run: (...args: string[]) => string }
function makeRepo(files: Record<string, string | Buffer>, init: string[] = []): Fixture {
  const dir = tempDir('syzygy-iso-');
  const run = (...args: string[]): string => realExecFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' }).trim();
  run('init', '-q', ...init); run('config', 'gc.auto', '0'); run('config', 'maintenance.auto', 'false'); run('config', 'user.email', 'f@example.invalid'); run('config', 'user.name', 'F');
  for (const [path, body] of Object.entries(files)) { mkdirSync(dirname(join(dir, path)), { recursive: true }); writeFileSync(join(dir, path), body); }
  run('add', '-A'); run('commit', '-qm', 'fixture');
  return { dir, commit: run('rev-parse', 'HEAD'), run };
}
const cfg = (commit: string) => ({ repositoryId: 'repository:fixture', revision: commit, include: ['**'], exclude: [] as string[], oversize: 'split' as const });

let small: Fixture;
beforeAll(() => { small = makeRepo({ 'a.txt': 'alpha\n', 'dir/b.txt': 'beta\n' }); });

describe('every git call of the reader is isolated', () => {
  it('passes the isolation flags first and an allowlisted environment to ls-tree, cat-file -t and cat-file --batch', async () => {
    spy.calls.length = 0;
    await readRepoCorpus(small.dir, cfg(small.commit), { admission: allow });
    const gits = spy.calls.filter(call => call.file === 'git');
    const subcommands = gits.map(call => call.args.slice(ISOLATED_GIT_FLAGS.length + 2, ISOLATED_GIT_FLAGS.length + 4).join(' '));
    expect(subcommands.some(text => text.startsWith('cat-file -t'))).toBe(true);
    expect(subcommands.some(text => text.startsWith('ls-tree -r'))).toBe(true);
    expect(subcommands.some(text => text.startsWith('cat-file --batch'))).toBe(true);
    expect(gits).toHaveLength(3);
    for (const call of gits) {
      expect(call.args.slice(0, ISOLATED_GIT_FLAGS.length)).toEqual([...ISOLATED_GIT_FLAGS]);
      expect(call.args.slice(ISOLATED_GIT_FLAGS.length, ISOLATED_GIT_FLAGS.length + 2)).toEqual(['-C', small.dir]);
      expect(Object.keys(call.env ?? {}).sort()).toEqual([...ISOLATED_GIT_ENV_KEYS].sort());
      expect(call.env).toMatchObject({ GIT_NO_REPLACE_OBJECTS: '1', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_TERMINAL_PROMPT: '0' });
    }
    expect(ISOLATED_GIT_FLAGS).toContain('--no-replace-objects');
  });

  it('gives the shared batch reader the same flags and environment', () => {
    spy.calls.length = 0;
    readGitBlobsBatch(small.dir, ['4a58007052a65fbc2fc3f910f2855f45a4058e74']);
    const call = spy.calls.find(entry => entry.file === 'git')!;
    expect(call.args.slice(0, ISOLATED_GIT_FLAGS.length)).toEqual([...ISOLATED_GIT_FLAGS]);
    expect(Object.keys(call.env ?? {}).sort()).toEqual([...ISOLATED_GIT_ENV_KEYS].sort());
  });

  it('builds the environment from the allowlist only', () => {
    const saved = { ...process.env };
    const token = '/syzygy-poison-7f3a';
    const poisoned = ['GIT_DIR', 'GIT_EXEC_PATH', 'GIT_SSH_COMMAND', 'GIT_ASKPASS', 'GIT_CONFIG_COUNT', 'HOME', 'SECRET_TOKEN'];
    try {
      for (const key of poisoned) process.env[key] = `${token}-${key}`;
      const env = isolatedGitEnv();
      expect(Object.keys(env).sort()).toEqual([...ISOLATED_GIT_ENV_KEYS].sort());
      for (const key of poisoned) expect(Object.hasOwn(env, key), key).toBe(false);
      expect(Object.values(env).some(value => String(value).includes(token))).toBe(false);
    } finally { for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key]; Object.assign(process.env, saved); }
  });
});

describe('an ambient environment or a replace ref cannot steer the pinned read', () => {
  const saved = { ...process.env };
  afterEach(() => { for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key]; Object.assign(process.env, saved); });

  it('ignores GIT_DIR, GIT_OBJECT_DIRECTORY and GIT_ALTERNATE_OBJECT_DIRECTORIES pointing elsewhere', async () => {
    const other = makeRepo({ 'other.txt': 'OTHER REPO\n' });
    const empty = tempDir('syzygy-iso-empty-');
    Object.assign(process.env, { GIT_DIR: join(other.dir, '.git'), GIT_OBJECT_DIRECTORY: empty, GIT_ALTERNATE_OBJECT_DIRECTORIES: join(other.dir, '.git', 'objects') });
    // Without isolation the ambient GIT_DIR wins over -C: the call answers from the other repository.
    expect(realExecFileSync('git', ['-C', small.dir, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()).toBe(other.commit);
    expect(isolatedGit(small.dir, ['rev-parse', 'HEAD']).toString().trim()).toBe(small.commit);
    const corpus = await readRepoCorpus(small.dir, cfg(small.commit), { admission: allow });
    expect(corpus.sources.map(source => source.path)).toEqual(['a.txt', 'dir/b.txt']);
    expect(corpus.sources.some(source => source.body?.includes('OTHER'))).toBe(false);
  });

  it('reads the real commit and blobs when refs/replace substitutes forged ones', async () => {
    const repo = makeRepo({ 'README.md': 'real readme\n', 'keep.txt': 'ok\n' });
    const realBlob = repo.run('rev-parse', 'HEAD:keep.txt');
    repo.run('checkout', '-q', '-b', 'forged');
    writeFileSync(join(repo.dir, 'README.md'), 'FORGED readme\n'); writeFileSync(join(repo.dir, 'extra.txt'), 'FORGED extra\n');
    repo.run('add', '-A'); repo.run('commit', '-qm', 'forged');
    const forgedCommit = repo.run('rev-parse', 'HEAD');
    const evil = realExecFileSync('git', ['-C', repo.dir, 'hash-object', '-w', '--stdin'], { input: 'EVIL\n', encoding: 'utf8' }).trim();
    repo.run('replace', repo.commit, forgedCommit); repo.run('replace', realBlob, evil);
    // The fixture bites: a plain read of the pinned commit now shows the forged tree.
    expect(repo.run('ls-tree', '-r', '--name-only', repo.commit).split('\n')).toContain('extra.txt');
    const corpus = await readRepoCorpus(repo.dir, cfg(repo.commit), { admission: allow });
    expect(corpus.sources.map(source => source.path).sort()).toEqual(['README.md', 'keep.txt']);
    expect(corpus.sources.find(source => source.path === 'README.md')!.body).toBe('real readme\n');
    expect(corpus.sources.find(source => source.path === 'keep.txt')!.body).toBe('ok\n');
  });
});

describe('measured accounting and identity', () => {
  it('counts raw bytes, batches blob reads by 200, and binds the identity digest to the exact population', async () => {
    const corpus = await readRepoCorpus(small.dir, cfg(small.commit), { admission: allow });
    expect(corpus.rawBytes).toBe(11);
    expect(corpus.identityDigest).toBe('259c0ec118d43338ad82ba56c7a64e47d797a5a4d30b8d3211edf96ada3ffe9c');
    const batches: number[] = [];
    await readRepoCorpus(small.dir, cfg(small.commit), { admission: allow, readBlobs: (root, objects) => { batches.push(objects.length); return readGitBlobsBatch(root, objects); } });
    expect(batches).toEqual([2]);
    const many = makeRepo(Object.fromEntries(Array.from({ length: 205 }, (_, i) => [`f/${String(i).padStart(3, '0')}.txt`, `file ${i}\n`])));
    batches.length = 0;
    const corpus205 = await readRepoCorpus(many.dir, cfg(many.commit), { admission: allow, readBlobs: (root, objects) => { batches.push(objects.length); return readGitBlobsBatch(root, objects); } });
    expect(batches).toEqual([200, 5]);
    expect(corpus205.count.selected).toBe(205);
  });

  it('reads a sha256 repository: 64-hex object ids are hashed with sha256', async () => {
    const repo = makeRepo({ 'a.txt': 'alpha\n', 'b.txt': 'beta\n' }, ['--object-format=sha256']);
    expect(repo.commit).toMatch(/^[0-9a-f]{64}$/u);
    const corpus = await readRepoCorpus(repo.dir, cfg(repo.commit), { admission: allow });
    expect(corpus.sources.map(source => source.objectId!.length)).toEqual([64, 64]);
    expect(corpus.sources.map(source => source.body)).toEqual(['alpha\n', 'beta\n']);
  });

  it('counts a path whose bytes are not UTF-8 as unquotable instead of reading it', async () => {
    const repo = makeRepo({ 'ok.txt': 'ok\n' });
    const name = Buffer.concat([Buffer.from(`${repo.dir}/bad-`), Buffer.from([0xff]), Buffer.from('.txt')]);
    writeFileSync(name, 'latin\n');
    repo.run('add', '-A'); repo.run('commit', '-qm', 'bad name');
    const commit = repo.run('rev-parse', 'HEAD');
    const corpus = await readRepoCorpus(repo.dir, cfg(commit), { admission: allow });
    expect(corpus.count).toMatchObject({ listed: 2, unquotablePath: 1, selected: 1 });
    expect(corpus.sources.map(source => source.path)).toEqual(['ok.txt']);
    expect(corpus.unrepresentable).toHaveLength(1);
  });

  it('counts tree entries named . and .. as unquotable, not as sources', async () => {
    const repo = makeRepo({ 'ok.txt': 'ok\n' });
    const blob = realExecFileSync('git', ['-C', repo.dir, 'hash-object', '-w', '--stdin'], { input: 'dot\n', encoding: 'utf8' }).trim();
    const okBlob = repo.run('rev-parse', 'HEAD:ok.txt');
    const tree = realExecFileSync('git', ['-C', repo.dir, 'mktree'], { input: `100644 blob ${blob}\t.\n100644 blob ${blob}\t..\n100644 blob ${okBlob}\tok.txt\n`, encoding: 'utf8' }).trim();
    const commit = repo.run('commit-tree', tree, '-m', 'dot entries');
    const corpus = await readRepoCorpus(repo.dir, cfg(commit), { admission: allow });
    expect(corpus.count).toMatchObject({ listed: 3, unquotablePath: 2, selected: 1 });
    expect(corpus.sources.map(source => source.path)).toEqual(['ok.txt']);
  });

  it('lists sources in canonical UTF-16 code-unit order, which differs from git\'s byte order', async () => {
    const repo = makeRepo({ 'a.txt': 'a\n', '\u{1F600}.txt': 'astral\n', '\uFF5E.txt': 'bmp\n' });
    expect(repo.run('-c', 'core.quotepath=false', 'ls-tree', '--name-only', repo.commit).split('\n')).toEqual(['a.txt', '\uFF5E.txt', '\u{1F600}.txt']);
    const corpus = await readRepoCorpus(repo.dir, cfg(repo.commit), { admission: allow });
    expect(corpus.sources.map(source => source.path)).toEqual(['a.txt', '\u{1F600}.txt', '\uFF5E.txt']);
  });
});
