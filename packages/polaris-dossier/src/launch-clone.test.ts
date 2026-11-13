import * as fs from 'node:fs';
import * as path from 'node:path';
import { tempDir } from '@syzygy/test-kit';
import { describe, expect, it } from 'vitest';
import { patchFs } from './fs-patch.testkit.js';
import { parseConfig, readCloneSnapshot, type CloneSnapshotRead } from './launch-clone.js';

/** REQ-polaris-generation-047's closed list of launch reads (registry entry v1.1, reads (1) to (4)), against `.git` layouts written by
 * hand here, outside the code under test. Which files the reader opens is captured by a read-logging layer over `node:fs`'s `openSync`
 * (fs-patch.testkit.ts), outside the code under test; every expected open, name, value and refusal is a literal written from the clause. */

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

/** The snapshot and every file under the clone's `.git` the reader opened, relative, in sorted order. */
function logged(clone: string, revision?: string): { readonly read: CloneSnapshotRead; readonly opened: readonly string[] } {
  const gitDir = path.join(clone, '.git');
  const opened: string[] = [];
  const restore = patchFs('openSync', openSync => ((target: fs.PathLike, ...rest: unknown[]) => {
    const rel = path.relative(gitDir, path.resolve(String(target)));
    if (!rel.startsWith('..')) opened.push(rel.split(path.sep).join('/'));
    return (openSync as (...args: unknown[]) => number)(target, ...rest);
  }) as typeof fs.openSync);
  try {
    return { read: readCloneSnapshot(clone, revision === undefined ? {} : { revision }), opened: opened.sort() };
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
  it('a full clone: every name, and the values of HEAD\'s reference, the remote HEADs, the default and its local branch alone', () => {
    const { read, opened } = logged(layout(FULL));
    expect(opened).toEqual(['HEAD', 'config', 'packed-refs', 'refs/heads/feature', 'refs/heads/main', 'refs/remotes/origin/HEAD', 'refs/remotes/up/HEAD']);
    if (!read.ok) throw new Error(read.reason);
    expect([...read.snapshot.names].sort()).toEqual(FULL_NAMES);
    expect(Object.fromEntries([...read.snapshot.refs].sort(([a], [b]) => a.localeCompare(b)))).toEqual({
      'refs/heads/feature': { kind: 'oid', oid: A },
      'refs/heads/main': { kind: 'oid', oid: B },
      'refs/remotes/origin/HEAD': { kind: 'symbolic', target: 'refs/remotes/origin/main' },
      'refs/remotes/origin/main': { kind: 'oid', oid: C },
      'refs/remotes/up/HEAD': { kind: 'symbolic', target: 'refs/remotes/up/trunk' },
    });
    expect(read.snapshot.remotes).toEqual([{ name: 'origin', url: 'https://example.org/group/repo.git' }, { name: 'up', url: 'git@example.org:up/repo.git' }]);
    expect(read.snapshot.objectFormat).toBe('sha1');
    expect(read.snapshot.alternates).toBe(false);
  });

  it('the reference --revision names is read too, and no other', () => {
    const { read, opened } = logged(layout(FULL), 'v1');
    expect(opened).toEqual(['HEAD', 'config', 'packed-refs', 'refs/heads/feature', 'refs/heads/main', 'refs/remotes/origin/HEAD', 'refs/remotes/up/HEAD', 'refs/tags/v1']);
    expect(read.ok && read.snapshot.refs.get('refs/tags/v1')).toEqual({ kind: 'oid', oid: D });
  });

  it('a hexadecimal --revision names no reference, so it opens nothing more', () => {
    expect(logged(layout(FULL), D).opened).toEqual(['HEAD', 'config', 'packed-refs', 'refs/heads/feature', 'refs/heads/main', 'refs/remotes/origin/HEAD', 'refs/remotes/up/HEAD']);
  });

  it('with no remote default, main and master are read; with one, neither is consulted', () => {
    const none = logged(layout({ HEAD: `${A}\n`, 'refs/heads/main': `${A}\n`, 'refs/heads/master': `${B}\n`, 'refs/heads/dev': `${C}\n` }));
    expect(none.opened).toEqual(['HEAD', 'refs/heads/main', 'refs/heads/master']);
    const one = logged(layout({ HEAD: `${A}\n`, 'refs/heads/master': `${B}\n`, 'refs/remotes/origin/HEAD': 'ref: refs/remotes/origin/trunk\n', 'refs/remotes/origin/trunk': `${A}\n` }));
    expect(one.opened).toEqual(['HEAD', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/trunk']);
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

  it('refuses a reftable clone before reading its HEAD, by its reftable directory', () => {
    const { read, opened } = logged(layout({ HEAD: 'ref: refs/heads/.invalid\n', 'reftable/tables.list': 'x\n', 'refs/heads': 'this repository uses the reftable format\n' }));
    expect(read).toEqual({ ok: false, reftable: true,
      reason: 'the clone stores its references in the reftable backend; Syzygy reads references only as loose files and packed-refs, so the run is refused before any Git process starts' });
    expect(opened).toEqual([]);
  });

  it('refuses a reftable clone by the HEAD placeholder Git writes for it, opening nothing past HEAD', () => {
    const { read, opened } = logged(layout({ HEAD: 'ref: refs/heads/.invalid\n' }));
    expect(read.ok === false && read.reftable).toBe(true);
    expect(opened).toEqual(['HEAD']);
  });

  it('tells whether objects/info/alternates exists without opening it', () => {
    const { read, opened } = logged(layout({ HEAD: `${A}\n`, 'objects/info/alternates': '/elsewhere/objects\n' }));
    expect(read.ok && read.snapshot.alternates).toBe(true);
    expect(opened).toEqual(['HEAD']);
  });

  it('refuses an admitted reference that is a symbolic link, never following it', () => {
    const clone = layout({ HEAD: 'ref: refs/heads/main\n' });
    fs.mkdirSync(path.join(clone, '.git', 'refs', 'heads'), { recursive: true });
    fs.symlinkSync('/etc/hostname', path.join(clone, '.git', 'refs', 'heads', 'main'));
    expect(logged(clone).read).toEqual({ ok: false, reason: `${path.join(clone, '.git', 'refs', 'heads', 'main')} is a symbolic link; it is refused, never followed` });
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
