import * as fs from 'node:fs';
import * as path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { patchFs } from './fs-patch.testkit.js';
import { createRunDirectory, resolvePathIntent, stateRootViolation } from './state-directory.js';
import { tempDir } from '@syzygy/test-kit';

// REQ-polaris-generation-033: Syzygy writes only to its own state directory for the run, never into
// the clone and never to a location derived from the clone's path.
let base: string;
let clone: string;
beforeEach(() => {
  base = tempDir('dossier-state-');
  clone = path.join(base, 'clone');
  fs.mkdirSync(path.join(clone, '.git'), { recursive: true });
  fs.writeFileSync(path.join(clone, 'README.md'), '# clone\n');
});
const isRoot = process.getuid?.() === 0;

/** Every path under `dir`, with its kind and mode: the harness's own record of what was written. */
const sweep = (dir: string): string[] => fs.readdirSync(dir, { recursive: true, withFileTypes: true })
  .map((entry) => {
    const full = path.join(entry.parentPath, entry.name);
    return `${entry.isDirectory() ? 'd' : 'f'} ${(fs.statSync(full).mode & 0o777).toString(8)} ${path.relative(dir, full)}`;
  }).sort();

describe('state root placement', () => {
  it('accepts a state root outside the clone', () => {
    expect(stateRootViolation(path.join(base, 'state'), clone)).toBe(null);
  });

  it('refuses a state root inside the clone', () => {
    expect(stateRootViolation(path.join(clone, '.dossier'), clone)).toMatch(/inside the clone/);
  });

  it('refuses the clone itself as the state root', () => {
    expect(stateRootViolation(clone, clone)).toMatch(/inside the clone/);
  });

  it('refuses a state root inside the clone\'s .git directory', () => {
    expect(stateRootViolation(path.join(clone, '.git', 'dossier'), clone)).toMatch(/inside the clone/);
  });

  it('refuses a state root that contains the clone', () => {
    expect(stateRootViolation(base, clone)).toMatch(/contains the clone/);
  });

  it('refuses a symbolic link that lands inside the clone, judged by where it resolves', () => {
    const link = path.join(base, 'innocent');
    fs.symlinkSync(path.join(clone, 'hidden'), link);
    expect(stateRootViolation(path.join(link, 'state'), clone)).toMatch(/inside the clone/);
  });

  it('refuses a relative state root', () => {
    expect(stateRootViolation('state', clone)).toMatch(/absolute/);
  });

  it('refuses a symbolic link cycle', () => {
    fs.symlinkSync(path.join(base, 'b'), path.join(base, 'a'));
    fs.symlinkSync(path.join(base, 'a'), path.join(base, 'b'));
    expect(stateRootViolation(path.join(base, 'a', 'state'), clone)).toMatch(/cycle/);
  });
});

describe('symbolic-link intent, the one copy the daemon judges its state directory with too', () => {
  // syzygy-bpyt.8.2: every answer resolvePathIntent gives, one row per arm, written out in full: the reason the daemon prints and
  // the detail both callers print. The rule-6 record kills one mutant per predicate here.
  const at = (relative: string): string => path.join(base, relative);
  beforeEach(() => {
    fs.mkdirSync(at('real/dir'), { recursive: true });
    fs.writeFileSync(at('real/file.txt'), 'file\n');
    fs.symlinkSync(at('nowhere/target'), at('dangling'));
    fs.symlinkSync('real/dir', at('relative'));
    fs.symlinkSync(at('chain-2'), at('chain-1'));
    fs.symlinkSync(at('real/dir'), at('chain-2'));
    fs.symlinkSync(at('loop'), at('loop'));
    fs.symlinkSync(at('loop-b'), at('loop-a'));
    fs.symlinkSync(at('loop-a'), at('loop-b'));
  });

  it('resolves the file system root to itself', () => {
    expect(resolvePathIntent('/')).toEqual({ resolved: true, realPath: '/' });
  });

  it('resolves a directory with no link to itself', () => {
    expect(resolvePathIntent(at('real/dir'))).toEqual({ resolved: true, realPath: at('real/dir') });
  });

  it('resolves a missing path to itself', () => {
    expect(resolvePathIntent(at('real/absent/child'))).toEqual({ resolved: true, realPath: at('real/absent/child') });
  });

  it('resolves a dangling link to where it would land', () => {
    expect(resolvePathIntent(at('dangling'))).toEqual({ resolved: true, realPath: at('nowhere/target') });
  });

  it('resolves a relative link target against the link\'s own directory', () => {
    expect(resolvePathIntent(at('relative/child'))).toEqual({ resolved: true, realPath: at('real/dir/child') });
  });

  it('follows a link that lands on another link', () => {
    expect(resolvePathIntent(at('chain-1/x'))).toEqual({ resolved: true, realPath: at('real/dir/x') });
  });

  it('refuses a link to itself as a loop', () => {
    expect(resolvePathIntent(at('loop/x'))).toEqual({ resolved: false, reason: 'symlink-loop', detail: `symbolic link cycle revisits ${at('loop')}` });
  });

  it('refuses two links to each other as a loop', () => {
    expect(resolvePathIntent(at('loop-a/x'))).toEqual({ resolved: false, reason: 'symlink-loop', detail: `symbolic link cycle revisits ${at('loop-a')}` });
  });

  it('refuses a component below a regular file as unreadable', () => {
    expect(resolvePathIntent(at('real/file.txt/child'))).toEqual({
      resolved: false, reason: 'path-unreadable', detail: `filesystem inspection failed at ${at('real/file.txt/child')} (ENOTDIR)`,
    });
  });

  // Root may search a mode-000 directory, so under root the path reads as missing and no EACCES arises (syzygy-bpyt.8.32).
  it.skipIf(isRoot)('refuses a component below a directory it may not search as unreadable', () => {
    fs.mkdirSync(at('blocked'));
    fs.chmodSync(at('blocked'), 0o000);
    try {
      expect(resolvePathIntent(at('blocked/state'))).toEqual({
        resolved: false, reason: 'path-unreadable', detail: `filesystem inspection failed at ${at('blocked/state')} (EACCES)`,
      });
    } finally {
      fs.chmodSync(at('blocked'), 0o700);
    }
  });

  it('refuses a link whose target cannot be read as unreadable', () => {
    // readlink fails after lstat only in a race, so the test makes it fail for this one link.
    const restore = patchFs('readlinkSync', (original) => ((target: fs.PathLike, ...rest: unknown[]) => {
      if (path.resolve(String(target)) === at('dangling')) throw Object.assign(new Error('permission denied'), { code: 'EACCES' });
      return (original as (...args: unknown[]) => string)(target, ...rest);
    }) as typeof fs.readlinkSync);
    try {
      expect(resolvePathIntent(at('dangling'))).toEqual({
        resolved: false, reason: 'path-unreadable', detail: `symbolic link target could not be read at ${at('dangling')} (EACCES)`,
      });
    } finally {
      restore();
    }
  });
});

describe('run directory creation', () => {
  it('writes only the run directory and its configuration, owner-only, and nothing in the clone', () => {
    const cloneBefore = sweep(clone);
    const stateRoot = path.join(base, 'state');
    const result = createRunDirectory(stateRoot, clone, '{}\n', { runId: () => 'run-0123456789abcdef0123456789abcdef' });
    expect(result).toEqual({ created: true, runId: 'run-0123456789abcdef0123456789abcdef', runDir: path.join(stateRoot, 'run-0123456789abcdef0123456789abcdef') });
    expect(sweep(stateRoot)).toEqual([
      'd 700 run-0123456789abcdef0123456789abcdef',
      'f 600 run-0123456789abcdef0123456789abcdef/run.json',
    ]);
    expect(sweep(clone)).toEqual(cloneBefore);
  });

  it('draws a random run id that does not depend on the clone path', () => {
    const stateRoot = path.join(base, 'state');
    const first = createRunDirectory(stateRoot, clone, '{}\n');
    const second = createRunDirectory(stateRoot, clone, '{}\n');
    expect(first.created && first.runId).toMatch(/^run-[0-9a-f]{32}$/);
    expect(second.created && second.runId).toMatch(/^run-[0-9a-f]{32}$/);
    expect(first.created && second.created && first.runId !== second.runId).toBe(true);
    expect(first.created && first.runId.includes('clone')).toBe(false);
  });

  it('never reuses an existing run directory', () => {
    const stateRoot = path.join(base, 'state');
    const id = (): string => 'run-ffffffffffffffffffffffffffffffff';
    expect(createRunDirectory(stateRoot, clone, '{"first":1}\n', { runId: id }).created).toBe(true);
    const again = createRunDirectory(stateRoot, clone, '{"second":2}\n', { runId: id });
    expect(again.created).toBe(false);
    expect(fs.readFileSync(path.join(stateRoot, id(), 'run.json'), 'utf8')).toBe('{"first":1}\n');
  });

  it('refuses a malformed run id', () => {
    const result = createRunDirectory(path.join(base, 'state'), clone, '{}\n', { runId: () => '../escape' });
    expect(result.created).toBe(false);
    expect(fs.existsSync(path.join(base, 'escape'))).toBe(false);
  });

  it('writes nothing when the state root is refused', () => {
    const before = sweep(base);
    const result = createRunDirectory(path.join(clone, 'state'), clone, '{}\n');
    expect(result.created).toBe(false);
    expect(sweep(base)).toEqual(before);
  });
});
