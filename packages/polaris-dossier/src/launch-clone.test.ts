import * as fs from 'node:fs';
import * as path from 'node:path';
import { tempDir } from '@syzygy/test-kit';
import { describe, expect, it } from 'vitest';
import { installReadLog, patchFs, sealExcept } from './fs-patch.testkit.js';
import { parseConfig, readCloneSnapshot, type CloneSnapshotRead } from './launch-clone.js';

/** REQ-polaris-generation-047's closed list of launch reads (registry entry v1.1, reads (1) to (4)), against `.git` layouts written by
 * hand here, outside the code under test. The oracle has two halves, neither depending on which API the reader uses
 * (R-PDJA-33-SLICE-A-1 finding 1): a read-logging layer over every content-read and path-examining entry point of `node:fs` and
 * `node:fs/promises` (`installReadLog`, fs-patch.testkit.ts), and fixtures whose files outside the expected reads are mode 000
 * (`sealExcept`), so that any read of one fails whatever makes it. Every expected open, name, value and refusal is a literal written from
 * the clause. */

const A = 'a'.repeat(40), B = 'b'.repeat(40), C = 'c'.repeat(40), D = 'd'.repeat(40), E = 'e'.repeat(40), F = 'f'.repeat(40);

function layout(files: Readonly<Record<string, string>>): string {
  const clone = path.join(tempDir('syzygy-launch-clone-unit-'), 'clone');
  for (const [rel, body] of Object.entries(files)) {
    const file = path.join(clone, '.git', ...rel.split('/'));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, body);
  }
  fs.mkdirSync(path.join(clone, '.git', 'refs'), { recursive: true });
  return clone;
}

/** The snapshot, every file under the clone's `.git` whose content the reader asked for (by any API), relative, distinct and sorted,
 * and every path it examined without reading. With `sealed`, every file under `.git` but those named is first made unreadable. */
function logged(clone: string, revision?: string, sealed?: readonly string[]): { readonly read: CloneSnapshotRead; readonly opened: readonly string[]; readonly examined: readonly string[] } {
  const gitDir = path.join(clone, '.git');
  if (sealed !== undefined) sealExcept(gitDir, sealed);
  // Rooted at the clone, so a read outside .git is seen too ("../x"); paths are given relative to .git (R-PDJA-33-SLICE-B-1 finding 3).
  const fromGitDir = (rel: string) => rel === '.git' ? '.' : rel.startsWith('.git/') ? rel.slice('.git/'.length) : rel === '.' ? '..' : `../${rel}`;
  const { log, restore } = installReadLog(clone);
  try {
    const read = readCloneSnapshot(clone, revision === undefined ? {} : { revision });
    return { read, opened: [...new Set(log.opened.map(fromGitDir))].sort(), examined: [...new Set(log.examined.map(fromGitDir))].sort() };
  } finally {
    restore();
  }
}

/** A full clone's references: history on several branches, tags, a stash, two remotes, packed and loose. */
const FULL: Readonly<Record<string, string>> = {
  HEAD: 'ref: refs/heads/feature\n',
  config: '[core]\n\tbare = false\n[remote "origin"]\n\turl = https://example.org/group/repo.git\n[remote "up"]\n\turl = git@example.org:up/repo.git\n',
  'packed-refs': `# pack-refs with: peeled fully-peeled sorted \n${E} refs/tags/old\n^${F}\n${C} refs/remotes/origin/main\n`,
  'refs/heads/feature': `${A}\n`,
  'refs/heads/main': `${B}\n`,
  'refs/heads/other': `${D}\n`,
  'refs/tags/v1': `${D}\n`,
  'refs/stash': `${D}\n`,
  'refs/remotes/origin/HEAD': 'ref: refs/remotes/origin/main\n',
  'refs/remotes/origin/dev': `${D}\n`,
  'refs/remotes/up/HEAD': 'ref: refs/remotes/up/trunk\n',
  'refs/remotes/up/trunk': `${D}\n`,
};
const FULL_NAMES = ['refs/heads/feature', 'refs/heads/main', 'refs/heads/other', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/dev', 'refs/remotes/origin/main',
  'refs/remotes/up/HEAD', 'refs/remotes/up/trunk', 'refs/stash', 'refs/tags/old', 'refs/tags/v1'];

describe('REQ-polaris-generation-047: Syzygy\'s own reads of the operator\'s clone are the closed list', () => {
  it('a full clone: every name, and the values of HEAD\'s reference, origin\'s HEAD, the default and its local branch alone; another remote\'s HEAD is not read while origin records a default', () => {
    const expected = ['HEAD', 'config', 'packed-refs', 'refs/heads/feature', 'refs/heads/main', 'refs/remotes/origin/HEAD'];
    const { read, opened } = logged(layout(FULL), undefined, expected);
    expect(opened).toEqual(expected);
    if (!read.ok) throw new Error(read.reason);
    expect([...read.snapshot.names].sort()).toEqual(FULL_NAMES);
    expect(Object.fromEntries([...read.snapshot.refs].sort(([a], [b]) => a.localeCompare(b)))).toEqual({
      'refs/heads/feature': { kind: 'oid', oid: A },
      'refs/heads/main': { kind: 'oid', oid: B },
      'refs/remotes/origin/HEAD': { kind: 'symbolic', target: 'refs/remotes/origin/main' },
      'refs/remotes/origin/main': { kind: 'oid', oid: C },
    });
    expect(read.snapshot.remotes).toEqual([{ name: 'origin', url: 'https://example.org/group/repo.git' }, { name: 'up', url: 'git@example.org:up/repo.git' }]);
    expect(read.snapshot.objectFormat).toBe('sha1');
    expect(read.snapshot.alternates).toBe(false);
  });

  it('the reference --revision names is read too, and no other', () => {
    const expected = ['HEAD', 'config', 'packed-refs', 'refs/heads/feature', 'refs/heads/main', 'refs/remotes/origin/HEAD', 'refs/tags/v1'];
    const { read, opened } = logged(layout(FULL), 'v1', expected);
    expect(opened).toEqual(expected);
    expect(read.ok && read.snapshot.refs.get('refs/tags/v1')).toEqual({ kind: 'oid', oid: D });
  });

  it('--revision HEAD reads HEAD and its reference, already admitted, and nothing more', () => {
    const expected = ['HEAD', 'config', 'packed-refs', 'refs/heads/feature', 'refs/heads/main', 'refs/remotes/origin/HEAD'];
    const { read, opened } = logged(layout(FULL), 'HEAD', expected);
    expect(read.ok && read.snapshot.refs.get('refs/heads/feature')).toEqual({ kind: 'oid', oid: A });
    expect(opened).toEqual(expected);
  });

  it('a hexadecimal --revision names no reference, so it opens nothing more', () => {
    const expected = ['HEAD', 'config', 'packed-refs', 'refs/heads/feature', 'refs/heads/main', 'refs/remotes/origin/HEAD'];
    const { read, opened } = logged(layout(FULL), D, expected);
    expect(read.ok).toBe(true);
    expect(opened).toEqual(expected);
  });

  it('with no remote default, main and master are read; with one, neither is consulted', () => {
    const none = logged(layout({ HEAD: `${A}\n`, 'refs/heads/main': `${A}\n`, 'refs/heads/master': `${B}\n`, 'refs/heads/dev': `${C}\n` }));
    expect(none.opened).toEqual(['HEAD', 'refs/heads/main', 'refs/heads/master']);
    const one = logged(layout({ HEAD: `${A}\n`, 'refs/heads/master': `${B}\n`, 'refs/remotes/origin/HEAD': 'ref: refs/remotes/origin/trunk\n', 'refs/remotes/origin/trunk': `${A}\n` }));
    expect(one.opened).toEqual(['HEAD', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/trunk']);
  });

  it('origin\'s HEAD absent, or not symbolic: the other remotes\' HEADs are read to find the one default', () => {
    const absent = logged(layout({ HEAD: `${A}\n`, 'refs/remotes/origin/main': `${A}\n`, 'refs/remotes/up/HEAD': 'ref: refs/remotes/up/trunk\n', 'refs/remotes/up/trunk': `${B}\n` }),
      undefined, ['HEAD', 'refs/remotes/up/HEAD', 'refs/remotes/up/trunk']);
    expect(absent.opened).toEqual(['HEAD', 'refs/remotes/up/HEAD', 'refs/remotes/up/trunk']);
    const detached = logged(layout({ HEAD: `${A}\n`, 'refs/remotes/origin/HEAD': `${C}\n`, 'refs/remotes/up/HEAD': 'ref: refs/remotes/up/trunk\n', 'refs/remotes/up/trunk': `${B}\n` }),
      undefined, ['HEAD', 'refs/remotes/origin/HEAD', 'refs/remotes/up/HEAD', 'refs/remotes/up/trunk']);
    expect(detached.opened).toEqual(['HEAD', 'refs/remotes/origin/HEAD', 'refs/remotes/up/HEAD', 'refs/remotes/up/trunk']);
    expect(detached.read.ok && detached.read.snapshot.refs.get('refs/remotes/up/trunk')).toEqual({ kind: 'oid', oid: B });
  });

  it('several remote defaults and none origin: no branch value is read past the remote HEADs', () => {
    const { opened } = logged(layout({ HEAD: `${A}\n`, 'refs/heads/main': `${A}\n`, 'refs/remotes/a/HEAD': 'ref: refs/remotes/a/main\n', 'refs/remotes/a/main': `${A}\n`,
      'refs/remotes/b/HEAD': 'ref: refs/remotes/b/main\n', 'refs/remotes/b/main': `${A}\n` }));
    expect(opened).toEqual(['HEAD', 'refs/remotes/a/HEAD', 'refs/remotes/b/HEAD']);
  });

  it('a packed value is taken from its row; a loose file overrides it; other rows are used for nothing', () => {
    const { read } = logged(layout({ HEAD: 'ref: refs/heads/main\n', 'packed-refs': `${A} refs/heads/main\n${B} refs/heads/master\n${C} refs/tags/t\n`, 'refs/heads/main': `${D}\n` }));
    if (!read.ok) throw new Error(read.reason);
    // HEAD's reference, loose over its packed row; master, which the trunk rule consults with no remote default, from its row; never the tag.
    expect([...read.snapshot.refs]).toEqual([['refs/heads/main', { kind: 'oid', oid: D }], ['refs/heads/master', { kind: 'oid', oid: B }]]);
    expect([...read.snapshot.names].sort()).toEqual(['refs/heads/main', 'refs/heads/master', 'refs/tags/t']);
  });

  it('a symbolic value is followed only to a reference whose value is admitted', () => {
    const { read } = logged(layout({ HEAD: `${A}\n`, 'refs/heads/main': `${A}\n`, 'refs/heads/alias': 'ref: refs/heads/hidden\n', 'refs/heads/hidden': `${B}\n` }), 'alias');
    if (!read.ok) throw new Error(read.reason);
    expect(read.snapshot.refs.has('refs/heads/hidden')).toBe(false);
  });

  it('refuses a reftable clone by its HEAD placeholder alone: its reftable directory is never examined, nor anything in it read', () => {
    const { read, opened, examined } = logged(layout({ HEAD: 'ref: refs/heads/.invalid\n', 'reftable/tables.list': 'x\n', 'refs/heads': 'this repository uses the reftable format\n' }), undefined, ['HEAD']);
    expect(read).toEqual({ ok: false, reftable: true,
      reason: 'the clone stores its references in the reftable backend; Syzygy reads references only as loose files and packed-refs, so the run is refused before any Git process starts' });
    expect(opened).toEqual(['HEAD']);
    expect(examined.filter(p => p.startsWith('reftable'))).toEqual([]);
  });

  it('refuses a reftable clone by the HEAD placeholder Git writes for it, opening nothing past HEAD', () => {
    const { read, opened } = logged(layout({ HEAD: 'ref: refs/heads/.invalid\n' }));
    expect(read.ok === false && read.reftable).toBe(true);
    expect(opened).toEqual(['HEAD']);
  });

  it('tells whether objects/info/alternates exists without opening it', () => {
    const { read, opened, examined } = logged(layout({ HEAD: `${A}\n`, 'objects/info/alternates': '/elsewhere/objects\n' }), undefined, ['HEAD']);
    expect(read.ok && read.snapshot.alternates).toBe(true);
    expect(opened).toEqual(['HEAD']);
    expect(examined.includes('objects/info/alternates')).toBe(true);
  });

  it('refuses an admitted reference that is a symbolic link, never following it', () => {
    const clone = layout({ HEAD: 'ref: refs/heads/main\n' });
    fs.mkdirSync(path.join(clone, '.git', 'refs', 'heads'), { recursive: true });
    fs.symlinkSync('/etc/hostname', path.join(clone, '.git', 'refs', 'heads', 'main'));
    expect(logged(clone).read).toEqual({ ok: false, reason: `${path.join(clone, '.git', 'refs', 'heads', 'main')} is a symbolic link; it is refused, never followed` });
  });
});

describe('a link swapped in after the lstat is still not followed (R-PDJA-33-SLICE-A-1 finding 5)', () => {
  it('an admitted reference that lstat reports as a regular file but is a symbolic link: the open refuses it, never reading its target', () => {
    const clone = layout({ HEAD: 'ref: refs/heads/main\n' });
    const target = path.join(tempDir('syzygy-launch-link-target-'), 'value');
    fs.writeFileSync(target, `${B}\n`);
    const link = path.join(clone, '.git', 'refs', 'heads', 'main');
    fs.mkdirSync(path.dirname(link), { recursive: true });
    fs.symlinkSync(target, link);
    // The race, staged: the lstat sees the regular file the link names, as it would had the link been swapped in just after it.
    const restore = patchFs('lstatSync', lstatSync => ((p: fs.PathLike, ...rest: unknown[]) =>
      path.resolve(String(p)) === link ? fs.statSync(p) : (lstatSync as (...args: unknown[]) => fs.Stats)(p, ...rest)) as typeof fs.lstatSync);
    let read: CloneSnapshotRead;
    try { read = readCloneSnapshot(clone); } finally { restore(); }
    expect(read).toEqual({ ok: false, reason: `${link} cannot be read (ELOOP)` });
  });
});

describe('read (3): the configuration, as text, for remotes and the object format alone', () => {
  it('reads extensions.objectFormat in any case of section and key, SHA-1 where none is recorded', () => {
    expect(parseConfig('[core]\n\trepositoryformatversion = 1\n[extensions]\n\tobjectFormat = sha256\n').objectFormat).toBe('sha256');
    expect(parseConfig('[Extensions]\n\tOBJECTFORMAT = sha256\n').objectFormat).toBe('sha256');
    expect(parseConfig('[core]\n\tbare = false\n').objectFormat).toBe('sha1');
    expect(parseConfig('[core]\n\tobjectformat = sha256\n').objectFormat).toBe('sha1');   // only the extensions section records it
  });

  it('a remote\'s url, with the subsection name matched exactly; a remote with two urls is left out', () => {
    expect(parseConfig('[remote "origin"]\n\turl = https://h/a/b\n[remote "two"]\n\turl = x\n\turl = y\n[REMOTE "Up"]\n\tURL = ssh://h/c/d\n').remotes)
      .toEqual([{ name: 'origin', url: 'https://h/a/b' }, { name: 'Up', url: 'ssh://h/c/d' }]);
  });
});

describe('the read oracle is independent of the API the reader uses (R-PDJA-33-SLICE-A-1 finding 1)', () => {
  it('logs a content read through every entry point, the utf8 fast path and the promise API included', async () => {
    const dir = tempDir('syzygy-read-log-');
    for (const name of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm']) fs.writeFileSync(path.join(dir, name), 'x\n');
    const out = tempDir('syzygy-read-log-out-');
    const { log, restore } = installReadLog(dir);
    try {
      fs.readFileSync(path.join(dir, 'a'), 'utf8');
      fs.readFileSync(path.join(dir, 'b'));
      fs.closeSync(fs.openSync(path.join(dir, 'c'), 'r'));
      await fs.promises.readFile(path.join(dir, 'd'), 'utf8');
      await (await fs.promises.open(path.join(dir, 'e'), 'r')).close();
      await new Promise<void>((resolve, reject) => fs.createReadStream(path.join(dir, 'f')).on('close', resolve).on('error', reject).resume());
      await new Promise<void>((resolve, reject) => fs.readFile(path.join(dir, 'g'), 'utf8', e => (e ? reject(e) : resolve())));
      // The copy entry points read content too (R-PDJA-33-SLICE-B-1 finding 3, mutant O3).
      fs.copyFileSync(path.join(dir, 'h'), path.join(out, 'h'));
      fs.cpSync(path.join(dir, 'i'), path.join(out, 'i'));
      await fs.promises.copyFile(path.join(dir, 'j'), path.join(out, 'j'));
      await fs.promises.cp(path.join(dir, 'k'), path.join(out, 'k'));
      await new Promise<void>((resolve, reject) => fs.copyFile(path.join(dir, 'l'), path.join(out, 'l'), e => (e ? reject(e) : resolve())));
      await (await fs.openAsBlob(path.join(dir, 'm'))).text();
      fs.lstatSync(path.join(dir, 'a'));
      fs.existsSync(path.join(dir, 'b'));
    } finally {
      restore();
    }
    expect([...new Set(log.opened)].sort()).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm']);
    // cpSync examines its source (a stat) before it copies, so 'i' is examined too.
    expect([...new Set(log.examined)].sort()).toEqual(['a', 'b', 'i']);
  });

  it('a sealed fixture makes every read of an unlisted file fail, whatever API makes it', () => {
    const clone = layout(FULL);
    sealExcept(path.join(clone, '.git'), ['HEAD']);
    expect(() => fs.readFileSync(path.join(clone, '.git', 'refs', 'stash'), 'utf8')).toThrow(/EACCES/);
    expect(fs.readFileSync(path.join(clone, '.git', 'HEAD'), 'utf8')).toBe('ref: refs/heads/feature\n');
  });

  it('the unlisted loose references and the alternates file of a sealed full clone are never read', () => {
    const clone = layout({ ...FULL, 'objects/info/alternates': '/elsewhere/objects\n' });
    const expected = ['HEAD', 'config', 'packed-refs', 'refs/heads/feature', 'refs/heads/main', 'refs/remotes/origin/HEAD'];
    const { read, opened } = logged(clone, undefined, expected);
    if (!read.ok) throw new Error(read.reason);
    expect(read.snapshot.alternates).toBe(true);
    expect(opened).toEqual(expected);
  });
});
