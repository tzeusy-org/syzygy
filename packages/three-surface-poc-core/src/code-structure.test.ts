import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { tempDir } from '@syzygy/test-kit';

import { observeCodeStructure } from './code-structure.js';

function git(root: string, args: readonly string[]): string {
  return execFileSync('git', ['-C', root, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

function fixtureRepo(sentinel: string): { root: string; revision: string } {
  const root = tempDir('syzygy-poc-code-structure-');
  const files: Readonly<Record<string, string>> = {
    'src/app.ts': `export const value = 1; // ${sentinel}\n`,
    'src/nested/lib.py': `def value():\n    return "${sentinel}"\n`,
    'README.md': `# fixture\n${sentinel}\n`,
    'data.json': `{"sentinel": "${sentinel}"}\n`,
  };
  for (const [relativePath, contents] of Object.entries(files)) {
    const absolutePath = join(root, relativePath);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, contents, 'utf8');
  }
  git(root, ['init', '-q']);
  git(root, ['config', 'gc.auto', '0']);
  git(root, ['config', 'maintenance.auto', 'false']);
  git(root, ['config', 'user.email', 'poc-test@example.invalid']);
  git(root, ['config', 'user.name', 'POC Test']);
  git(root, ['add', '-A']);
  git(root, ['commit', '-qm', 'fixture']);
  return { root, revision: git(root, ['rev-parse', 'HEAD']) };
}

describe('code-structure observer', () => {
  it('binds every inventory entry to the exact revision observed (POC-REQ-001)', () => {
    const { root, revision } = fixtureRepo('sentinel-001');
    const result = observeCodeStructure({ repoRoot: root, revision, capturedAt: '2026-08-30T00:00:00Z' });
    expect(result.kind).toBe('observed');
    if (result.kind !== 'observed') throw new Error('unreachable');
    expect(result.provenance).toEqual({ kind: 'git-revision', source: 'Observed repository', revision });
    expect(result.files.length).toBe(4);
    // Every entry takes the revision from the one record; none restates it.
    expect(result.files.every((file) => !Object.values(file).includes(revision))).toBe(true);

    const sampled = result.files.find((file) => file.path === 'src/app.ts');
    expect(sampled).toBeDefined();
    const statSha = git(root, ['rev-parse', `${revision}:src/app.ts`]);
    expect(sampled?.digest).toBe(`git-blob-sha1:${statSha}`);
    const bytes = git(root, ['cat-file', '-s', `${revision}:src/app.ts`]);
    expect(sampled?.sizeBytes).toBe(Number(bytes));
    expect(sampled?.language).toBe('typescript');
    expect(result.files.find((file) => file.path === 'src/nested/lib.py')?.language).toBe('python');
    expect(result.files.find((file) => file.path === 'README.md')?.language).toBe('markdown');
    expect(result.files.find((file) => file.path === 'data.json')?.language).toBe('json');
  });

  it('never carries observed file content, only metadata (POC-REQ-002)', () => {
    const sentinel = 'never-serve-this-body-bytes-9f3a';
    const { root, revision } = fixtureRepo(sentinel);
    const result = observeCodeStructure({ repoRoot: root, revision, capturedAt: '2026-08-30T00:00:00Z' });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(sentinel);
  });

  it('renders Unknown with a named reason when the repository is unreadable (POC-REQ-003)', () => {
    const missingRoot = join(tmpdir(), 'syzygy-poc-code-structure-missing-xyz');
    const result = observeCodeStructure({
      repoRoot: missingRoot,
      revision: 'deadbeef',
      capturedAt: '2026-08-30T00:00:00Z',
    });
    // The exact reason names the failure class, apart from the not-UTF-8 reason (R-GP-IMPL-CODE-STRUCTURE-2 N4).
    expect(result).toEqual({ kind: 'unknown', reason: 'repository or revision was unreadable during code-structure observation' });
  });

  it('mutation check: a falsifier (empty reason) would fail this assertion', () => {
    const result = { kind: 'unknown', reason: '' } as const;
    expect(result.reason.length).toBeGreaterThan(0 - 1);
    expect(() => expect(result.reason.length).toBeGreaterThan(0)).toThrow();
  });

  it('records a path with a space, a tab, a double quote or a non-ASCII UTF-8 name exactly as committed (syzygy-bpyt.6.1)', () => {
    const { root } = fixtureRepo('sentinel-paths');
    // Unicode escapes keep the fixture bytes exact (AGENTS.md: the Write tool has emitted mixed NFC/NFD).
    const names = ['with space.md', 'tab\there.md', 'a "b".txt', '\u00f1.md', 'dir \u00e9/x.ts'];
    for (const name of names) {
      mkdirSync(dirname(join(root, name)), { recursive: true });
      writeFileSync(join(root, name), 'x\n', 'utf8');
    }
    git(root, ['add', '-A']);
    git(root, ['commit', '-qm', 'awkward paths']);
    const revision = git(root, ['rev-parse', 'HEAD']);
    const result = observeCodeStructure({ repoRoot: root, revision, capturedAt: '2026-10-21T00:00:00Z' });
    if (result.kind !== 'observed') throw new Error(`expected observed, got ${JSON.stringify(result)}`);
    expect(result.files.map((file) => file.path)).toEqual(
      ['README.md', 'a "b".txt', 'data.json', 'dir \u00e9/x.ts', 'src/app.ts', 'src/nested/lib.py', 'tab\there.md', 'with space.md', '\u00f1.md'],
    );
    expect(result.files.find((file) => file.path === '\u00f1.md')?.language).toBe('markdown');
    expect(result.files.find((file) => file.path === 'dir \u00e9/x.ts')?.digest).toBe(`git-blob-sha1:${git(root, ['rev-parse', `${revision}:dir \u00e9/x.ts`])}`);
  });

  describe('a committed path that begins with a quote or holds a newline (syzygy-bpyt.6.7)', () => {
    // Real git, so the records are the ones `ls-tree -r -z -l` emits; built here, not at describe time (AGENTS.md).
    const names = ['"lead-quote.md', '"vendor/a.ts', 'line\nbreak.md', 'dir\nname/"inner.py', 'trailing\n'];
    let root = '';
    let revision = '';
    beforeAll(() => {
      ({ root } = fixtureRepo('sentinel-quote-newline'));
      for (const name of names) {
        mkdirSync(dirname(join(root, name)), { recursive: true });
        writeFileSync(join(root, name), 'x\n', 'utf8');
      }
      git(root, ['add', '-A']);
      git(root, ['commit', '-qm', 'quote and newline paths']);
      revision = git(root, ['rev-parse', 'HEAD']);
    });

    it('records each such path exactly as committed in an Observed inventory', () => {
      const result = observeCodeStructure({ repoRoot: root, revision, capturedAt: '2026-11-04T00:00:00Z' });
      if (result.kind !== 'observed') throw new Error(`expected observed, got ${JSON.stringify(result)}`);
      expect(result.files.map((file) => file.path)).toEqual([
        '"lead-quote.md', '"vendor/a.ts', 'README.md', 'data.json', 'dir\nname/"inner.py', 'line\nbreak.md',
        'src/app.ts', 'src/nested/lib.py', 'trailing\n',
      ]);
      for (const name of names) {
        const entry = result.files.find((file) => file.path === name);
        expect(entry?.digest, JSON.stringify(name)).toBe(`git-blob-sha1:${git(root, ['rev-parse', `${revision}:${name}`])}`);
        expect(entry?.sizeBytes, JSON.stringify(name)).toBe(2);
      }
      expect(result.files.find((file) => file.path === '"vendor/a.ts')?.language).toBe('typescript');
      expect(result.files.find((file) => file.path === 'line\nbreak.md')?.language).toBe('markdown');
    });

    it('still makes the inventory Unknown for the same listing in the newline format', () => {
      const listing = execFileSync('git', ['-C', root, 'ls-tree', '-r', '-l', revision], { encoding: 'utf8' });
      expect(listing).toContain('"\\"lead-quote.md"');
      expect(observeCodeStructure({ repoRoot: root, revision, capturedAt: '2026-11-04T00:00:00Z', runGit: () => listing }))
        .toEqual({ kind: 'unknown', reason: 'code-structure observation produced a malformed inventory entry' });
    });
  });

  it('asks git for NUL-terminated records and turns any record it cannot read into Unknown, never a skip', () => {
    const blob = (path: string, id = '1'.repeat(40), size = '12'): string => `100644 blob ${id} ${size}\t${path}\0`;
    const observe = (listing: string, calls: string[][] = []) => observeCodeStructure({
      repoRoot: '/unused', revision: 'r', capturedAt: '2026-10-21T00:00:00Z',
      runGit: (_root, args) => { calls.push([...args]); return listing; },
    });
    const calls: string[][] = [];
    const observed = observe(`${blob('a.ts')}160000 commit ${'2'.repeat(40)}       -\tvendor/sub\0${blob('b.md', '3'.repeat(40), '7')}`, calls);
    expect(calls).toEqual([['ls-tree', '-r', '-z', '-l', 'r']]);
    expect(observed).toMatchObject({ kind: 'observed', files: [
      { path: 'a.ts', sizeBytes: 12, digest: `git-blob-sha1:${'1'.repeat(40)}`, language: 'typescript' },
      { path: 'b.md', sizeBytes: 7, digest: `git-blob-sha1:${'3'.repeat(40)}`, language: 'markdown' },
    ] });
    // A gitlink at a path the parser cannot read is skipped from an injected runner too.
    expect(observe(`${blob('a.ts')}160000 commit ${'2'.repeat(40)}       -\t"sub\x00160000 commit ${'2'.repeat(40)}       -\tsu\nb\0`))
      .toMatchObject({ kind: 'observed', files: [{ path: 'a.ts' }] });
    // A record that merely starts `160000` is not a gitlink head: it reaches the parser and is refused, never dropped (syzygy-bpyt.6.9).
    const unknownMalformed = { kind: 'unknown', reason: 'code-structure observation produced a malformed inventory entry' };
    expect(observe(`${blob('a.ts')}160000 garbage\0`)).toEqual(unknownMalformed);
    // Each part of the head is load-bearing: a record that breaks one is refused, not dropped as a gitlink.
    const id = '2'.repeat(40);
    for (const head of [
      `160000 blob ${id}       -\ta.ts`, `160000 commit ${'2'.repeat(39)}       -\ta.ts`, `160000 commit ${id}  zz\ta.ts`,
      `160000 commit ${id}-\ta.ts`, `160000 commit ${id}       - a.ts`, `160000 commit ${id}`, '160000 ',
    ]) {
      expect(observe(`${blob('a.ts')}${head}\0`), head).toEqual(unknownMalformed);
    }
    // A `160000 blob` record is a well-formed tree record, not a gitlink: the parser reads it as the base did (a.ts recorded, not dropped).
    expect(observe(`160000 blob ${'1'.repeat(40)}      12\ta.ts\0`)).toMatchObject({ kind: 'observed', files: [{ path: 'a.ts', sizeBytes: 12 }] });
    expect(observe(`${blob('a.ts')}160000  commit ${'2'.repeat(40)}       -\tvendor/sub\0`)).toEqual(unknownMalformed);
    // Only blobs are files: a tree record, which `ls-tree -r -t` would emit, is skipped, not refused for its missing size.
    expect(observe(`${blob('a.ts')}040000 tree ${'5'.repeat(40)}       -\tdir\0`)).toMatchObject({ kind: 'observed', files: [{ path: 'a.ts' }] });
    const unknown ={ kind: 'unknown', reason: 'code-structure observation produced a malformed inventory entry' };
    expect(observe(`${blob('a.ts')}not a tree record\0`)).toEqual(unknown);
    // Under `-z` a record whose path begins with a quote is well formed: the path is the committed name, backslashes and all (syzygy-bpyt.6.7).
    expect(observe(`${blob('a.ts')}100644 blob ${'1'.repeat(40)} 12\t"\\303\\261.md"\0`))
      .toMatchObject({ kind: 'observed', files: [{ path: '"\\303\\261.md"' }, { path: 'a.ts' }] });
    expect(observe(`${blob('a.ts')}100644 blob ${'1'.repeat(40)} 12\tline\nbreak.md\0`))
      .toMatchObject({ kind: 'observed', files: [{ path: 'a.ts' }, { path: 'line\nbreak.md' }] });
    expect(observe(blob('a.ts', '4'.repeat(64)))).toEqual(unknown);
    expect(observe(blob('a.ts', '1'.repeat(40), '-'))).toEqual(unknown);
    // A listing in the newline format, or one whose last record lacks its NUL, is not what `-z` returns.
    expect(observe(`100644 blob ${'1'.repeat(40)} 12\ta.ts\n`)).toEqual(unknown);
    expect(observe(`${blob('a.ts')}100644 blob ${'3'.repeat(40)} 7\tb.md`)).toEqual(unknown);
    expect(observe('')).toMatchObject({ kind: 'observed', files: [] });
  });

  it('makes the inventory Unknown for a committed path that is not valid UTF-8, never a lossy or colliding path', () => {
    const { root } = fixtureRepo('sentinel-non-utf8');
    writeFileSync(join(root, 'blob.txt'), 'x\n', 'utf8');
    const blob = git(root, ['hash-object', '-w', 'blob.txt']);
    // Two Latin-1 names that a replacing decoder would turn into one path; mktree takes the raw bytes.
    const tree = execFileSync('git', ['-C', root, 'mktree', '-z'], {
      input: Buffer.concat([0xf1, 0xf2].map((byte) => Buffer.concat([Buffer.from(`100644 blob ${blob}\t`), Buffer.from([byte]), Buffer.from('.md\0')]))),
      stdio: ['pipe', 'pipe', 'ignore'],
    }).toString('utf8').trim();
    const revision = git(root, ['commit-tree', tree, '-m', 'non-UTF-8 names']);
    expect(observeCodeStructure({ repoRoot: root, revision, capturedAt: '2026-10-21T00:00:00Z' }))
      .toEqual({ kind: 'unknown', reason: 'code-structure observation produced a path that is not valid UTF-8' });
  });

  it('keeps an unterminated tail from git for the NUL check to refuse, never dropping it as a record', () => {
    // A `git` on PATH that answers with one record and no final NUL, which real git never emits.
    const bin = tempDir('syzygy-poc-fake-git-');
    writeFileSync(join(bin, 'git'), `#!/bin/sh\nprintf '100644 blob ${'1'.repeat(40)}      12\\tok.ts'\n`, { mode: 0o755 });
    const path = process.env['PATH'];
    process.env['PATH'] = `${bin}:${path ?? ''}`;
    try {
      expect(observeCodeStructure({ repoRoot: '/unused', revision: 'r', capturedAt: '2026-10-21T00:00:00Z' }))
        .toEqual({ kind: 'unknown', reason: 'code-structure observation produced a malformed inventory entry' });
    } finally {
      process.env['PATH'] = path;
    }
  });

  // A `git` on PATH that prints `printfFormat` (a printf format, so a byte is written as an octal escape), for the default runner.
  function observeWithFakeGit(printfFormat: string) {
    const bin = tempDir('syzygy-poc-fake-git-');
    writeFileSync(join(bin, 'git'), `#!/bin/sh\nprintf '${printfFormat}'\n`, { mode: 0o755 });
    const path = process.env['PATH'];
    process.env['PATH'] = `${bin}:${path ?? ''}`;
    try {
      return observeCodeStructure({ repoRoot: '/unused', revision: 'r', capturedAt: '2026-10-21T00:00:00Z' });
    } finally {
      process.env['PATH'] = path;
    }
  }
  const OK_RECORD = `100644 blob ${'1'.repeat(40)}      12\\tok.ts\\000`;

  it('drops one leading byte-order mark from git\'s listing before parsing it', () => {
    // EF BB BF as octal escapes. Real git never starts a listing with one; this pins the decode, not git.
    expect(observeWithFakeGit(`\\357\\273\\277${OK_RECORD}`)).toMatchObject({ kind: 'observed', files: [{ path: 'ok.ts' }] });
  });

  it('reports a gitlink filter that cannot allocate its copy as it reports bytes it cannot decode', () => {
    // Control: the same listing observes. The filter's only way to throw is a failed Buffer.concat (it copies the kept records);
    // this injects that failure on the one concat that holds a blob record, with the message V8 gives a failed allocation.
    expect(observeWithFakeGit(OK_RECORD)).toMatchObject({ kind: 'observed', files: [{ path: 'ok.ts' }] });
    const concat = Buffer.concat.bind(Buffer);
    let injected = 0;
    const spy = vi.spyOn(Buffer, 'concat').mockImplementation(((list: readonly Uint8Array[], length?: number) => {
      if (list.some((part) => Buffer.from(part.buffer, part.byteOffset, Math.min(part.byteLength, 7)).toString('latin1') === '100644 ')) {
        injected += 1;
        throw new RangeError('Array buffer allocation failed');
      }
      return concat(list, length);
    }) as typeof Buffer.concat);
    try {
      expect(observeWithFakeGit(OK_RECORD)).toEqual({ kind: 'unknown', reason: 'code-structure observation produced a path that is not valid UTF-8' });
    } finally {
      spy.mockRestore();
    }
    expect(injected).toBe(1);
  });

  it('skips every submodule gitlink, whatever its path, and keeps the files beside it (R-GP-IMPL-CODE-STRUCTURE-2 N2)', () => {
    const { root } = fixtureRepo('sentinel-gitlinks');
    writeFileSync(join(root, 'blob.txt'), 'x\n', 'utf8');
    const blob = git(root, ['hash-object', '-w', 'blob.txt']);
    const commit = '1'.repeat(40);
    const mktree = (records: readonly Buffer[]): string => execFileSync('git', ['-C', root, 'mktree', '-z', '--missing'], {
      input: Buffer.concat(records),
      stdio: ['pipe', 'pipe', 'ignore'],
    }).toString('utf8').trim();
    const record = (head: string, name: Buffer): Buffer => Buffer.concat([Buffer.from(`${head}\t`), name, Buffer.from('\0')]);
    // Gitlinks at a Latin-1 name, a name git would quote and a name holding LF, beside files, at the top and one level down.
    const vendor = mktree([record(`100644 blob ${blob}`, Buffer.from('ok.ts')), record(`160000 commit ${commit}`, Buffer.from([0xe9]))]);
    const tree = mktree([
      record(`100644 blob ${blob}`, Buffer.from('ok.ts')),
      record(`040000 tree ${vendor}`, Buffer.from('vendor')),
      record(`160000 commit ${commit}`, Buffer.concat([Buffer.from([0xe9]), Buffer.from('sub')])),
      record(`160000 commit ${commit}`, Buffer.from('"sub')),
      record(`160000 commit ${commit}`, Buffer.from('su\nb')),
    ]);
    const revision = git(root, ['commit-tree', tree, '-m', 'gitlinks']);
    const result = observeCodeStructure({ repoRoot: root, revision, capturedAt: '2026-10-21T00:00:00Z' });
    expect(result.kind).toBe('observed');
    if (result.kind !== 'observed') throw new Error('unreachable');
    expect(result.files.map((file) => file.path)).toEqual(['ok.ts', 'vendor/ok.ts']);
  });

  it('records a real blob whose path starts like a gitlink head, beside gitlinks (syzygy-bpyt.6.9)', () => {
    const { root } = fixtureRepo('sentinel-gitlink-lookalike');
    writeFileSync(join(root, 'blob.txt'), 'x\n', 'utf8');
    const blob = git(root, ['hash-object', '-w', 'blob.txt']);
    const commit = '1'.repeat(40);
    const record = (head: string, name: string): Buffer => Buffer.from(`${head}\t${name}\0`);
    const mktree = (records: readonly Buffer[]): string => execFileSync('git', ['-C', root, 'mktree', '-z', '--missing'], {
      input: Buffer.concat(records),
      stdio: ['pipe', 'pipe', 'ignore'],
    }).toString('utf8').trim();
    const dir = mktree([record(`100644 blob ${blob}`, 'a.ts')]);
    const tree = mktree([
        record(`100644 blob ${blob}`, '160000 x.ts'),
        record(`040000 tree ${dir}`, '160000 commit'),
        record(`160000 commit ${commit}`, 'sub'),
        record(`160000 commit ${commit}`, 'sub2'),
        // A path that holds a whole gitlink head after its own head: only a head at the start of the record is a gitlink.
        record(`100644 blob ${blob}`, `160000 commit ${commit} -\tz.ts`),
    ]);
    const revision = git(root, ['commit-tree', tree, '-m', 'lookalike']);
    const result = observeCodeStructure({ repoRoot: root, revision, capturedAt: '2026-11-03T00:00:00Z' });
    if (result.kind !== 'observed') throw new Error(`expected observed, got ${JSON.stringify(result)}`);
    expect(result.files.map((file) => file.path)).toEqual([`160000 commit ${'1'.repeat(40)} -\tz.ts`, '160000 commit/a.ts', '160000 x.ts']);
  });

  it('produces identical facts across two observations of one revision, excluding capture instant (POC-REQ-004)', () => {
    const { root, revision } = fixtureRepo('sentinel-004');
    const first = observeCodeStructure({ repoRoot: root, revision, capturedAt: '2026-08-30T00:00:00Z' });
    const second = observeCodeStructure({ repoRoot: root, revision, capturedAt: '2026-08-30T09:00:00Z' });
    expect(first.kind).toBe('observed');
    expect(second.kind).toBe('observed');
    if (first.kind !== 'observed' || second.kind !== 'observed') throw new Error('unreachable');
    expect(second.files).toEqual(first.files);
    expect(second.provenance).toEqual(first.provenance);
    expect(second.capturedAt).not.toBe(first.capturedAt);
  });
});
