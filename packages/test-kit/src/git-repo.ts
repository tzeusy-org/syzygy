import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tempDir } from './temp-dir.js';

/** No user, system or global configuration and fixed dates, so a fixture commit has the same identifier on every host. */
export const GIT_ENV = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null', GIT_AUTHOR_DATE: '2026-10-01T00:00:00Z', GIT_COMMITTER_DATE: '2026-10-01T00:00:00Z' };
/** `GIT_ENV` with no automatic gc or maintenance: a detached `git maintenance run --auto` can still be writing when the
 * fixture is removed (syzygy-y733). */
export const GIT_ENV_NO_MAINTENANCE = { ...GIT_ENV, GIT_CONFIG_COUNT: '2', GIT_CONFIG_KEY_0: 'gc.auto', GIT_CONFIG_VALUE_0: '0', GIT_CONFIG_KEY_1: 'maintenance.auto', GIT_CONFIG_VALUE_1: 'false' };

/** Runs git in `cwd` under `GIT_ENV` and returns trimmed standard output. */
export function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', env: GIT_ENV }).trim();
}

export interface GitRepoOptions {
  readonly files: Readonly<Record<string, string>>;
  readonly branch?: string;
  readonly message?: string;
}

export interface GitRepo {
  /** The commit every copy holds. */
  readonly commit: string;
  /** A new working copy (history included) under its own temp directory; no git process runs. */
  copy(): string;
}

/** Commits `files` once, in a template directory, and hands out byte copies of it: a test file that needs a fresh
 * repository per test pays for one `git init`, `add` and `commit`, not one per test (syzygy-jsyi: 180 git calls to 6). */
export function gitRepo(options: GitRepoOptions): GitRepo {
  const template = tempDir('syzygy-test-kit-template-');
  git(template, 'init', '-q', '-b', options.branch ?? 'main');
  for (const [file, body] of Object.entries(options.files)) {
    const target = join(template, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, body);
  }
  git(template, 'add', '-A');
  git(template, '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-q', '-m', options.message ?? 'fixture');
  const commit = git(template, 'rev-parse', 'HEAD');
  return { commit, copy: () => { const directory = tempDir('syzygy-test-kit-copy-'); cpSync(template, directory, { recursive: true }); return directory; } };
}
