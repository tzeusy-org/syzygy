import { execFileSync } from 'node:child_process';

interface GitTransportOptions {
  readonly prefix: readonly string[];
  readonly cwd?: string;
  readonly maxBuffer?: number;
  readonly stdio: readonly ['ignore', 'pipe', 'ignore' | 'pipe'];
  /** Evaluated for every invocation; omission leaves Node's inherited environment intact. */
  readonly env?: () => NodeJS.ProcessEnv;
}

interface GitTextOptions extends GitTransportOptions {
  readonly encoding: 'utf8';
}

interface GitByteOptions extends GitTransportOptions {
  readonly encoding?: never;
}

/** Transport only: callers retain their flags, limits, decoding and error policy.
 * Options/provenance: docs/evidence/syzygy-bpyt-6-20/README.md, profiles 1–7.
 * In particular, a text invocation stays a Node text invocation even on failure. */
export function createGitRunner(profile: GitTextOptions): (args: readonly string[]) => string;
export function createGitRunner(profile: GitByteOptions): (args: readonly string[]) => Buffer;
export function createGitRunner(profile: GitTextOptions | GitByteOptions): (args: readonly string[]) => string | Buffer {
  const { prefix, env, encoding, ...options } = profile;
  return (args: readonly string[]) => {
    const argv = [...prefix, ...args];
    const executionOptions = { ...options, stdio: [...options.stdio], ...(env === undefined ? {} : { env: env() }) };
    if (encoding === 'utf8') return execFileSync('git', argv, { ...executionOptions, encoding });
    return execFileSync('git', argv, executionOptions);
  };
}
