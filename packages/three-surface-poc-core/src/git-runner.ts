import { execFileSync } from 'node:child_process';

interface GitTransportOptions {
  readonly prefix: readonly string[];
  readonly maxBuffer?: number;
  readonly stdio: readonly ['ignore', 'pipe', 'ignore' | 'pipe'];
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
  const { prefix, encoding, maxBuffer, stdio } = profile;
  return (args: readonly string[]) => {
    const argv = [...prefix, ...args];
    // The live-observer source guard requires literal, inspectable option keys.
    // Separate branches preserve omission as well as Node's native error payloads.
    if (encoding === 'utf8') {
      if (maxBuffer === undefined) return execFileSync('git', argv, { encoding, stdio: [...stdio] });
      return execFileSync('git', argv, { encoding, maxBuffer, stdio: [...stdio] });
    }
    if (maxBuffer === undefined) return execFileSync('git', argv, { stdio: [...stdio] });
    return execFileSync('git', argv, { maxBuffer, stdio: [...stdio] });
  };
}
