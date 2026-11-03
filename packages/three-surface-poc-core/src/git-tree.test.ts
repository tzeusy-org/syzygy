import { describe, expect, it } from 'vitest';

import { indexGitTree, normalizeRepositoryPath, parseGitLsTree, posixBasename, posixDirname } from './git-tree.js';

const A = 'a'.repeat(40);
const B = 'b'.repeat(40);
const C = 'c'.repeat(40);

describe('parseGitLsTree', () => {
  it('parses NUL-separated records with and without the -l size column', () => {
    const withSize = `100644 blob ${A}     120\tabout/README.md\x00120000 blob ${B}      12\tlink\x00160000 commit ${C}       -\tvendor/sub\x00`;
    expect(parseGitLsTree(withSize)).toEqual({
      kind: 'parsed',
      entries: [
        { mode: '100644', type: 'blob', objectId: A, sizeBytes: 120, path: 'about/README.md' },
        { mode: '120000', type: 'blob', objectId: B, sizeBytes: 12, path: 'link' },
        { mode: '160000', type: 'commit', objectId: C, path: 'vendor/sub' },
      ],
    });
    const withoutSize = `100755 blob ${A}\tbin/run\x00040000 tree ${B}\tdir\x00`;
    expect(parseGitLsTree(withoutSize)).toEqual({
      kind: 'parsed',
      entries: [
        { mode: '100755', type: 'blob', objectId: A, path: 'bin/run' },
        { mode: '040000', type: 'tree', objectId: B, path: 'dir' },
      ],
    });
  });

  it('accepts newline-separated records but rejects a quoted (escaped) path', () => {
    expect(parseGitLsTree(`100644 blob ${A}\tplain.md\n`)).toEqual({
      kind: 'parsed',
      entries: [{ mode: '100644', type: 'blob', objectId: A, path: 'plain.md' }],
    });
    expect(parseGitLsTree(`100644 blob ${A}\t"caf\\303\\251.md"\n`)).toEqual({
      kind: 'malformed',
      record: `100644 blob ${A}\t"caf\\303\\251.md"`,
    });
  });

  it('in NUL-terminated mode takes a path that begins with a quote or holds a newline verbatim (syzygy-bpyt.6.7)', () => {
    const strict = { nulTerminated: true } as const;
    expect(parseGitLsTree(`100644 blob ${A}\t"lead.md\x00100644 blob ${B}\tline\nbreak.md\x00100644 blob ${C}\t"caf\\303\\251.md"\x00`, strict)).toEqual({
      kind: 'parsed',
      entries: [
        { mode: '100644', type: 'blob', objectId: A, path: '"lead.md' },
        { mode: '100644', type: 'blob', objectId: B, path: 'line\nbreak.md' },
        { mode: '100644', type: 'blob', objectId: C, path: '"caf\\303\\251.md"' },
      ],
    });
    // The default mode keeps refusing both, for the PWB readers.
    expect(parseGitLsTree(`100644 blob ${A}\t"lead.md\x00`)).toEqual({ kind: 'malformed', record: `100644 blob ${A}\t"lead.md` });
    expect(parseGitLsTree(`100644 blob ${B}\tline\nbreak.md\x00`)).toEqual({ kind: 'malformed', record: `100644 blob ${B}\tline\nbreak.md` });
  });

  it('in NUL-terminated mode refuses a newline-format listing and an unterminated last record', () => {
    const strict = { nulTerminated: true } as const;
    expect(parseGitLsTree(`100644 blob ${A}\tplain.md\n`, strict)).toEqual({ kind: 'malformed', record: `100644 blob ${A}\tplain.md\n` });
    expect(parseGitLsTree(`100644 blob ${A}\ta.md\x00100644 blob ${B}\tb.md`, strict)).toEqual({ kind: 'malformed', record: `100644 blob ${B}\tb.md` });
    expect(parseGitLsTree(`garbage\x00`, strict)).toEqual({ kind: 'malformed', record: 'garbage' });
    expect(parseGitLsTree('', strict)).toEqual({ kind: 'parsed', entries: [] });
  });

  it('rejects a malformed record instead of skipping it', () => {
    expect(parseGitLsTree(`100644 blob nothex\tx.md\x00`)).toEqual({ kind: 'malformed', record: `100644 blob nothex\tx.md` });
    expect(parseGitLsTree(`garbage\x00`)).toEqual({ kind: 'malformed', record: 'garbage' });
  });

  it('an empty listing is parsed as no entries', () => {
    expect(parseGitLsTree('')).toEqual({ kind: 'parsed', entries: [] });
  });
});

describe('indexGitTree', () => {
  it('looks up entries by exact path and infers directories from prefixes', () => {
    const tree = indexGitTree([
      { mode: '100644', type: 'blob', objectId: A, path: 'about/heart-and-soul/vision.md' },
      { mode: '100644', type: 'blob', objectId: B, path: 'README.md' },
    ]);
    expect(tree.entryAt('README.md')?.objectId).toBe(B);
    expect(tree.entryAt('about')).toBeUndefined();
    expect(tree.hasDirectory('about')).toBe(true);
    expect(tree.hasDirectory('about/heart-and-soul')).toBe(true);
    expect(tree.hasDirectory('about/heart-and-soul/vision.md')).toBe(false);
    expect(tree.hasDirectory('roster')).toBe(false);
  });
});

describe('normalizeRepositoryPath', () => {
  it('normalizes dot segments and rejects escapes, absolute and NUL paths', () => {
    expect(normalizeRepositoryPath('about/./heart-and-soul/../vision.md')).toBe('about/vision.md');
    expect(normalizeRepositoryPath('a//b/')).toBe('a/b');
    expect(normalizeRepositoryPath('../x')).toBeUndefined();
    expect(normalizeRepositoryPath('a/../../x')).toBeUndefined();
    expect(normalizeRepositoryPath('/etc/passwd')).toBeUndefined();
    expect(normalizeRepositoryPath('a\x00b')).toBeUndefined();
    expect(normalizeRepositoryPath('')).toBeUndefined();
    expect(normalizeRepositoryPath('.')).toBeUndefined();
  });

  it('dirname and basename are POSIX-literal', () => {
    expect(posixDirname('about/README.md')).toBe('about');
    expect(posixDirname('README.md')).toBe('');
    expect(posixBasename('about/x/README.md')).toBe('README.md');
    expect(posixBasename('README.md')).toBe('README.md');
  });
});
