import { execFileSync } from 'node:child_process';
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from '@syzygy/test-kit';
import { expect, it } from 'vitest';
import { bindUrlSourceReader, isBoundUrlSourceReader, listBoundUrlSourceTree } from './url-source-reader.js';

function fixture() {
  const clone = tempDir('url-source-reader');
  const git = (...args: string[]): string => execFileSync('git', args, {
    cwd: clone, encoding: 'utf8',
    env: { PATH: process.env['PATH'], LANG: 'C', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_AUTHOR_NAME: 'Fixture', GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
      GIT_COMMITTER_NAME: 'Fixture', GIT_COMMITTER_EMAIL: 'fixture@example.invalid' },
  }).trim();
  git('init', '-q', '--object-format=sha1');
  writeFileSync(path.join(clone, 'README.md'), 'Owned source fixture\n');
  git('add', 'README.md');
  git('commit', '-qm', 'Initial fixture');
  return { clone, gitDir: path.join(clone, '.git'), revision: git('rev-parse', 'HEAD'), git };
}

it('keeps the selected source and pin even when a caller asks to change reader options', async () => {
  const f = fixture();
  const factory = bindUrlSourceReader({ ...f, store: 'owned-loose', current: () => true });
  expect(isBoundUrlSourceReader(factory)).toBe(true);
  expect(isBoundUrlSourceReader(options => factory(options))).toBe(false);
  expect(() => factory({ ...f, revision: '1'.repeat(40) })).toThrow(/source binding/);
  expect(() => factory({ ...f, gitDir: path.join(f.gitDir, 'different') })).toThrow(/source binding/);
  const reader = factory({ ...f, looseOnly: false, maxObjectBytes: 2 ** 30 });
  expect(await reader.listTree()).toEqual([expect.objectContaining({ path: 'README.md' })]);
  f.git('repack', '-a', '-d');
  await expect(reader.readBlobs(['README.md'])).rejects.toThrow(/loose-only profile/);
  const supplied = bindUrlSourceReader({ ...f, store: 'supplied', current: () => true })(f);
  expect(await supplied.inventory()).toMatchObject({ stored: 3, reachable: 3, beyondCount: 0 });
  const [body] = await supplied.readBlobs(['README.md']);
  expect(Buffer.from(body!.bytes).toString()).toBe('Owned source fixture\n');
});

it('refuses a successful object read whose currentness changed before return', async () => {
  const f = fixture();
  let readsAllowed = 10;
  const factory = bindUrlSourceReader({ ...f, store: 'owned-loose', current: () => readsAllowed-- > 0 });
  const reader = factory(f);
  readsAllowed = 1;
  await expect(reader.listTree()).rejects.toThrow(/source binding/);
  readsAllowed = 2;
  await expect(reader.listTree()).resolves.toHaveLength(1);
});

it('checks bound tree authority again after the descriptor walk', async () => {
  const f = fixture();
  let samples = 0;
  await expect(listBoundUrlSourceTree({ ...f, store: 'owned-loose', current: () => ++samples < 2 }))
    .rejects.toThrow(/source binding/);
  expect(samples).toBe(2);
});

it('refuses a replacement object directory on the same path', async () => {
  const f = fixture();
  const reader = bindUrlSourceReader({ ...f, store: 'owned-loose', current: () => true })(f);
  await expect(reader.listTree()).resolves.toHaveLength(1);
  const objects = path.join(f.gitDir, 'objects');
  renameSync(objects, objects + '-retained');
  mkdirSync(objects);
  await expect(reader.listTree()).rejects.toThrow(/source binding/);
});
