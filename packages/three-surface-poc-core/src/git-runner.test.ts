import { describe, expect, it, vi } from 'vitest';

const boundary = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock('node:child_process', () => ({ execFileSync: boundary.run }));

import { createGitRunner } from './git-runner.js';

// Literal profiles frozen at f5487c1; no options/expected values imported from the implementation.
const profiles = [
  { name: 'worker text', prefix: ['--no-optional-locks', '-C', '/one'], encoding: 'utf8', maxBuffer: 67_108_864, stdio: ['ignore', 'pipe', 'pipe'] },
  { name: 'governance strict-text input', prefix: ['--no-optional-locks', '-C', '/one'], stdio: ['ignore', 'pipe', 'ignore'] },
  { name: 'governance raw blob', prefix: ['--no-optional-locks', '-C', '/two'], stdio: ['ignore', 'pipe', 'ignore'] },
  { exception: true, name: 'repository text (integration oracle)', prefix: ['--no-optional-locks', '-C', '/two'], encoding: 'utf8', env: () => ({ GIT_OPTIONAL_LOCKS: '0', G5_SENTINEL: sentinel }), stdio: ['ignore', 'pipe', 'ignore'] },
  { name: 'code-structure strict-text input', prefix: ['--no-optional-locks', '-C', '/one'], maxBuffer: 268_435_456, stdio: ['ignore', 'pipe', 'ignore'] },
  { name: 'canonical raw', prefix: ['--no-optional-locks', '-C', '/two'], maxBuffer: 268_435_456, stdio: ['ignore', 'pipe', 'ignore'] },
  { exception: true, name: 'verbatim raw (integration oracle)', prefix: [], cwd: '/one', maxBuffer: 1_048_576, stdio: ['ignore', 'pipe', 'pipe'] },
] as const;
let sentinel = 'first';
// Rows 4 and 7 remain direct adapters: their env/cwd keys are forbidden by the unchanged core live-source guard.
// Their existing integration suites exercise them, and the differential retains both profiles.

describe('Git transport boundary', () => {
  it.each(profiles.filter((row) => !('exception' in row)))('$name preserves options, result representation and unmodified failures per invocation', (row) => {
    const { name: _name, ...profile } = row;
    // The union of the literal rows is safe for either overload; the branch retains its precise result type.
    const run = 'encoding' in profile ? createGitRunner(profile) : createGitRunner(profile);
    const { prefix, ...expected } = profile;
    const expectedOptions = () => expected;
    const backing = Buffer.from([0, 0xef, 0xbb, 0xbf, 0x61, 0, 0xff, 0xc3, 0xa9, 0, 0]);
    const raw = backing.subarray(1, -1);
    const output = 'encoding' in profile ? raw.toString('utf8') : raw;
    boundary.run.mockReset().mockReturnValue(output);
    sentinel = 'first';
    const first = run(['ls-tree', '-z', 'ref with space']);
    expect(first).toBe(output);
    expect(typeof first === 'string' ? typeof first : first.constructor.name).toBe('encoding' in profile ? 'string' : 'Buffer');
    expect(boundary.run).toHaveBeenLastCalledWith('git', [...prefix, 'ls-tree', '-z', 'ref with space'], expectedOptions());
    const other = createGitRunner({ prefix: ['--no-optional-locks', '-C', '/interleaved'], stdio: ['ignore', 'pipe', 'ignore'] });
    boundary.run.mockReturnValueOnce(Buffer.from('other root'));
    expect(other(['rev-parse', 'HEAD'])).toEqual(Buffer.from('other root'));
    expect(boundary.run).toHaveBeenLastCalledWith('git', ['--no-optional-locks', '-C', '/interleaved', 'rev-parse', 'HEAD'], { stdio: ['ignore', 'pipe', 'ignore'] });
    sentinel = 'second';
    run(['cat-file', 'blob', 'exact-object']);
    expect(boundary.run).toHaveBeenLastCalledWith('git', [...prefix, 'cat-file', 'blob', 'exact-object'], expectedOptions());
    // These represent the actual consumed payload shapes. Transport must not catch, decode or replace the error.
    for (const code of ['NONZERO', 'ENOBUFS', 'STDERR_PRESSURE', 'ENOENT']) {
      const stderr = profile.stdio[2] === 'pipe' ? output : null;
      const failure = Object.assign(new Error(code), { code, status: code === 'NONZERO' ? 7 : null, signal: code === 'ENOBUFS' ? 'SIGTERM' : null, stdout: output, stderr });
      boundary.run.mockImplementationOnce(() => { throw failure; });
      let caught: unknown;
      try { run(['failing']); } catch (error) { caught = error; }
      expect(caught).toBe(failure);
      try { run(['successful-after-failure']); } catch { expect.unreachable(); }
    }
  });
});
