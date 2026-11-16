import { execFileSync as realExecFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { gitLsRemote, gitMaterialize } from './dossier-trigger.js';
import { ISOLATED_GIT_FLAGS, NETWORK_GIT_ENV_KEYS } from './isolated-git.js';
import { tempDir } from '@syzygy/test-kit';

const spy = vi.hoisted(() => ({ calls: [] as { file: string; args: string[]; env: Record<string, string | undefined> | undefined }[] }));
vi.mock('node:child_process', async importOriginal => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return { ...actual, execFileSync: ((file: string, args: string[], options?: { env?: Record<string, string | undefined> }) => {
    spy.calls.push({ file, args: [...args], env: options?.env === undefined ? undefined : { ...options.env } });
    return (actual.execFileSync as (...a: unknown[]) => unknown)(file, args, options);
  }) as typeof actual.execFileSync };
});

let repo = '', commit = '';
beforeAll(() => {
  repo = tempDir('syzygy-trigger-iso-');
  const run = (...a: string[]): string => realExecFileSync('git', ['-C', repo, ...a], { encoding: 'utf8' }).trim();
  run('init', '-q'); run('config', 'gc.auto', '0'); run('config', 'maintenance.auto', 'false'); run('config', 'user.email', 'f@example.invalid'); run('config', 'user.name', 'F');
  writeFileSync(join(repo, 'a.txt'), 'a\n'); run('add', '-A'); run('commit', '-qm', 'x'); commit = run('rev-parse', 'HEAD');
});

describe('trigger git calls', () => {
  it('pass the isolation flags first and an allowlisted environment to ls-remote, init and fetch', async () => {
    spy.calls.length = 0;
    gitLsRemote(repo, 'file');
    const dir = join(tempDir('syzygy-trigger-iso-dst-'), 'src');
    mkdirSync(join(dir, '..'), { recursive: true });
    await gitMaterialize({ url: repo, revision: commit, dir }, 'file');
    const gits = spy.calls.filter(call => call.file === 'git');
    expect(gits.map(call => call.args.find(arg => ['ls-remote', 'init', 'fetch'].includes(arg)))).toEqual(['ls-remote', 'init', 'fetch']);
    for (const call of gits) {
      expect(call.args.slice(0, ISOLATED_GIT_FLAGS.length)).toEqual([...ISOLATED_GIT_FLAGS]);
      expect(Object.keys(call.env ?? {}).sort()).toEqual([...NETWORK_GIT_ENV_KEYS].sort());
      expect(call.env).toMatchObject({ GIT_NO_REPLACE_OBJECTS: '1', GIT_ALLOW_PROTOCOL: 'file', GIT_CONFIG_GLOBAL: '/dev/null' });
      expect(call.env!.HOME).not.toBe(process.env.HOME);
    }
  });
});
