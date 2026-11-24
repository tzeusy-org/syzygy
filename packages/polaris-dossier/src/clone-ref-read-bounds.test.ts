import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tempDir } from '@syzygy/test-kit';
import { describe, expect, it } from 'vitest';
import { resolveCloneHead } from './clone-head.js';
import { patchFs } from './fs-patch.testkit.js';
import { readCloneSnapshot } from './launch-clone.js';
import { readVerifyText } from './verify-text-run.js';

// syzygy-3efd.83 (R-RUN-TREE-READ-BOUNDS-SPEC-1 finding 3): the three remaining stat-then-read readers of files an agent can write, the
// clone's HEAD, references, packed-refs and configuration (REQ-polaris-generation-033 init, REQ-polaris-generation-047 launch) and the
// `verify --text` file, read by the version 2.10 reader rule (`readBoundedFile`): one open without blocking, the type and size from that
// descriptor, at most one byte past the bound. The bounds are the code's own and no requirement states them yet (syzygy-nffo); each is
// written here as a literal: 4,096 bytes for a reference, 16,777,216 for packed-refs, 4,194,304 for the text. Every expected reason is a
// literal written from the reader's own words before this change, so a file within its bound reads as it did.

const A = 'a'.repeat(40);
const REF_BOUND = 4096;
const PACKED_BOUND = 16_777_216;
const TEXT_BOUND = 4_194_304;

/** A clone whose `.git` holds `files`, each planted by its function or written as text. */
function clone(files: Readonly<Record<string, string | ((file: string) => void)>>): { readonly root: string; readonly gitDir: string } {
  const root = path.join(tempDir('syzygy-clone-ref-bounds-'), 'clone');
  const gitDir = path.join(root, '.git');
  fs.mkdirSync(path.join(gitDir, 'refs', 'heads'), { recursive: true });
  for (const [rel, body] of Object.entries(files)) {
    const file = path.join(gitDir, ...rel.split('/'));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (typeof body === 'string') fs.writeFileSync(file, body); else body(file);
  }
  return { root, gitDir };
}

const fifo = (file: string) => execFileSync('mkfifo', [file]);
const directory = (file: string) => fs.mkdirSync(file);
const linkTo = (target: string) => (file: string) => fs.symlinkSync(target, file);
const sparse = (bytes: number) => (file: string) => { fs.writeFileSync(file, ''); fs.truncateSync(file, bytes); };

/** Runs `read` while every fstat of a descriptor whose size is `size` first appends one byte to `file`: the file grows past the bound
 * after its size was taken and before a byte is read. */
function grownAfterFstat<T>(file: string, size: number, read: () => T): T {
  const restore = patchFs('fstatSync', (original) => ((fd: number, ...rest: unknown[]) => {
    const stats = (original as (...args: unknown[]) => fs.Stats)(fd, ...rest);
    if (stats.isFile() && stats.size === size) fs.appendFileSync(file, 'x');
    return stats;
  }) as typeof original);
  try { return read(); } finally { restore(); }
}

describe('init: the clone HEAD resolver reads HEAD, a loose branch and packed-refs by the reader rule', () => {
  it('refuses a FIFO, a directory and a symbolic link at HEAD, never blocking and never following the link', () => {
    for (const plant of [fifo, directory, linkTo('/dev/zero')]) {
      const { root, gitDir } = clone({ HEAD: plant });
      expect(resolveCloneHead(root)).toEqual({ ok: false, reason: `${path.join(gitDir, 'HEAD')} is not a regular file` });
    }
  });

  it('refuses a symbolic link at HEAD even when it names a regular file holding a commit', () => {
    const target = path.join(tempDir('syzygy-clone-ref-target-'), 'HEAD');
    fs.writeFileSync(target, `${A}\n`);
    const { root, gitDir } = clone({ HEAD: linkTo(target) });
    expect(resolveCloneHead(root)).toEqual({ ok: false, reason: `${path.join(gitDir, 'HEAD')} is not a regular file` });
  });

  it('refuses a FIFO at the loose branch HEAD names, never blocking', () => {
    const { root, gitDir } = clone({ HEAD: 'ref: refs/heads/main\n', 'refs/heads/main': fifo });
    expect(resolveCloneHead(root)).toEqual({ ok: false, reason: `${path.join(gitDir, 'refs', 'heads', 'main')} is not a regular file` });
  });

  it('reads a HEAD of exactly 4,096 bytes and refuses one of 4,097', () => {
    const atBound = clone({ HEAD: 'x'.repeat(REF_BOUND) });
    expect(resolveCloneHead(atBound.root)).toEqual({ ok: false, reason: 'HEAD is neither a full commit identifier nor a branch reference' });
    const past = clone({ HEAD: 'x'.repeat(REF_BOUND + 1) });
    expect(resolveCloneHead(past.root)).toEqual({ ok: false, reason: `${path.join(past.gitDir, 'HEAD')} is larger than 4096 bytes` });
  });

  it('refuses a HEAD grown past 4,096 bytes after its size was taken', () => {
    const { root, gitDir } = clone({ HEAD: `${A}\n${'x'.repeat(REF_BOUND - 41)}` });
    const head = path.join(gitDir, 'HEAD');
    expect(fs.statSync(head).size).toBe(REF_BOUND);
    expect(grownAfterFstat(head, REF_BOUND, () => resolveCloneHead(root))).toEqual({ ok: false, reason: `${head} is larger than 4096 bytes` });
  });

  it('reads packed-refs of exactly 16,777,216 bytes and refuses one of 16,777,217 from its size', () => {
    const atBound = clone({ HEAD: 'ref: refs/heads/main\n', 'packed-refs': sparse(PACKED_BOUND) });
    expect(resolveCloneHead(atBound.root)).toEqual({ ok: false, reason: 'packed-refs holds 0 entries for refs/heads/main; exactly one is required' });
    const past = clone({ HEAD: 'ref: refs/heads/main\n', 'packed-refs': sparse(PACKED_BOUND + 1) });
    expect(resolveCloneHead(past.root)).toEqual({ ok: false, reason: `${path.join(past.gitDir, 'packed-refs')} is larger than 16777216 bytes` });
  });

  it('still resolves a branch within its bounds, loose or packed', () => {
    expect(resolveCloneHead(clone({ HEAD: 'ref: refs/heads/main\n', 'refs/heads/main': `${A}\n` }).root)).toMatchObject({ ok: true, commit: A, via: 'refs/heads/main' });
    expect(resolveCloneHead(clone({ HEAD: 'ref: refs/heads/main\n', 'packed-refs': `${A} refs/heads/main\n` }).root)).toMatchObject({ ok: true, commit: A, via: 'refs/heads/main' });
  });
});

describe('launch: the clone snapshot reads HEAD, references, packed-refs and the configuration by the reader rule', () => {
  it('refuses a FIFO, a directory and a symbolic link at HEAD, never blocking and never following the link', () => {
    for (const plant of [fifo, directory, linkTo('/dev/zero')]) {
      const { root, gitDir } = clone({ HEAD: plant });
      expect(readCloneSnapshot(root)).toEqual({ ok: false, reason: `${path.join(gitDir, 'HEAD')} is not a regular file; it is refused, never followed` });
    }
  });

  it('refuses a FIFO swapped in after the lstat that found the entry, never blocking', () => {
    const { root, gitDir } = clone({ HEAD: fifo });
    const head = path.join(gitDir, 'HEAD');
    const regular = path.join(tempDir('syzygy-clone-ref-regular-'), 'file');
    fs.writeFileSync(regular, 'ref: refs/heads/main\n');
    // The race, staged: the lstat sees a regular file, as it would had the FIFO been swapped in just after it.
    const restore = patchFs('lstatSync', (lstatSync) => ((p: fs.PathLike, ...rest: unknown[]) =>
      (lstatSync as (...args: unknown[]) => fs.Stats)(path.resolve(String(p)) === head ? regular : p, ...rest)) as typeof fs.lstatSync);
    let read: ReturnType<typeof readCloneSnapshot>;
    try { read = readCloneSnapshot(root); } finally { restore(); }
    expect(read).toEqual({ ok: false, reason: `${head} is not a regular file; it is refused, never followed` });
  });

  it('reads a HEAD of exactly 4,096 bytes and refuses one of 4,097', () => {
    const atBound = clone({ HEAD: 'x'.repeat(REF_BOUND) });
    expect(readCloneSnapshot(atBound.root)).toEqual({ ok: false, reason: 'HEAD is neither a full commit identifier nor a reference' });
    const past = clone({ HEAD: 'x'.repeat(REF_BOUND + 1) });
    expect(readCloneSnapshot(past.root)).toEqual({ ok: false, reason: `${path.join(past.gitDir, 'HEAD')} is larger than 4096 bytes` });
  });

  it('refuses a HEAD grown past 4,096 bytes after its size was taken', () => {
    const { root, gitDir } = clone({ HEAD: `${A}\n${'x'.repeat(REF_BOUND - 41)}` });
    const head = path.join(gitDir, 'HEAD');
    expect(grownAfterFstat(head, REF_BOUND, () => readCloneSnapshot(root))).toEqual({ ok: false, reason: `${head} is larger than 4096 bytes` });
  });

  it('refuses packed-refs of 16,777,217 bytes from its size, and a directory there', () => {
    const past = clone({ HEAD: `${A}\n`, 'packed-refs': sparse(PACKED_BOUND + 1) });
    expect(readCloneSnapshot(past.root)).toEqual({ ok: false, reason: `${path.join(past.gitDir, 'packed-refs')} is larger than 16777216 bytes` });
    const dir = clone({ HEAD: `${A}\n`, 'packed-refs': directory });
    expect(readCloneSnapshot(dir.root)).toEqual({ ok: false, reason: `${path.join(dir.gitDir, 'packed-refs')} is not a regular file; it is refused, never followed` });
  });

  it('refuses a configuration that is a FIFO or past 16,777,216 bytes', () => {
    for (const [plant, words] of [[fifo, 'is not a regular file; it is refused, never followed'], [sparse(PACKED_BOUND + 1), 'is larger than 16777216 bytes']] as const) {
      const { root, gitDir } = clone({ HEAD: `${A}\n`, config: plant });
      expect(readCloneSnapshot(root)).toEqual({ ok: false, reason: `${path.join(gitDir, 'config')} ${words}` });
    }
  });

  // R83 review note 1: before this reader read by the rule it refused a file that grew while it was read, within its limit too; it still does.
  it('refuses a HEAD grown within 4,096 bytes after its size was taken, as grown while being read', () => {
    const { root, gitDir } = clone({ HEAD: `${A}\n` });
    const head = path.join(gitDir, 'HEAD');
    expect(grownAfterFstat(head, 41, () => readCloneSnapshot(root))).toEqual({ ok: false, reason: `${head} grew while being read` });
  });

  // R83 review note 3: a file removed between the existence look and the open is absent, never a refusal.
  it('treats packed-refs removed after the lstat that found it as absent', () => {
    const { root, gitDir } = clone({ HEAD: `${A}\n`, config: '[core]\n' });
    const packed = path.join(gitDir, 'packed-refs');
    const regular = path.join(tempDir('syzygy-clone-ref-regular-'), 'file');
    fs.writeFileSync(regular, `${A} refs/heads/main\n`);
    // The race, staged: the lstat sees a regular file, as it would had packed-refs been removed just after it.
    const restore = patchFs('lstatSync', (lstatSync) => ((p: fs.PathLike, ...rest: unknown[]) =>
      (lstatSync as (...args: unknown[]) => fs.Stats)(path.resolve(String(p)) === packed ? regular : p, ...rest)) as typeof fs.lstatSync);
    let read: ReturnType<typeof readCloneSnapshot>;
    try { read = readCloneSnapshot(root); } finally { restore(); }
    expect(read).toMatchObject({ ok: true });
  });

  it('treats an absent packed-refs as none, opening nothing for it', () => {
    const { root } = clone({ HEAD: `${A}\n`, config: '[core]\n' });
    expect(readCloneSnapshot(root)).toMatchObject({ ok: true });
  });
});

describe('verify: the --text file is read by the reader rule', () => {
  const at = (plant: (file: string) => void): string => {
    const file = path.join(tempDir('syzygy-verify-text-bound-'), 'text.md');
    plant(file);
    return file;
  };

  it('refuses a FIFO, a directory and a symbolic link to a device, never blocking and reading no byte of the device', () => {
    for (const plant of [fifo, directory, linkTo('/dev/zero')]) {
      const file = at(plant);
      expect(readVerifyText(file)).toEqual({ reason: `${file} is not a regular file` });
    }
  });

  it('reads a regular file through a symbolic link, as it did when it took the size by stat', () => {
    const target = at((file) => fs.writeFileSync(file, 'plain words\n'));
    const link = at(linkTo(target));
    expect(readVerifyText(link)).toEqual({ bytes: new Uint8Array(Buffer.from('plain words\n')) });
  });

  it('reads a text of exactly 4,194,304 bytes and refuses one of 4,194,305 from its size', () => {
    const atBound = at(sparse(TEXT_BOUND));
    const read = readVerifyText(atBound);
    expect('bytes' in read && read.bytes.length).toBe(TEXT_BOUND);
    const past = at(sparse(TEXT_BOUND + 1));
    expect(readVerifyText(past)).toEqual({ reason: `${past} is larger than the 4194304-byte text bound` });
  });

  it('refuses a text grown past 4,194,304 bytes after its size was taken', () => {
    const file = at(sparse(TEXT_BOUND));
    expect(grownAfterFstat(file, TEXT_BOUND, () => readVerifyText(file))).toEqual({ reason: `${file} is larger than the 4194304-byte text bound` });
  });

  // R83 review note 2: a link that loops is the open's own ELOOP where the reader follows links; only a no-follow read makes it no regular file.
  it('names the open\'s own ELOOP for a link that loops, as the following reader always did', () => {
    const file = path.join(tempDir('syzygy-verify-text-bound-'), 'loop.md');
    fs.symlinkSync(file, file);
    expect(readVerifyText(file)).toEqual({ reason: `the text ${file} cannot be read (ELOOP)` });
  });

  it('names the open\'s own error for an absent text', () => {
    const file = path.join(tempDir('syzygy-verify-text-bound-'), 'absent.md');
    expect(readVerifyText(file)).toEqual({ reason: `the text ${file} cannot be read (ENOENT)` });
  });
});
