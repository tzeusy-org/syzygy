// The batched blob reader (syzygy-svoj): a strict parser, the two seams that
// use it, and an oracle over the real tree. The oracle reads every object
// with its own `git cat-file blob` call written here, never the module's
// reader, and requires the batched loaders to read the same objects and
// return the same bytes and the same evaluation as single reads.

import { execFile, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';

import { evaluateBodyReadAuthority } from '@syzygy/three-surface-poc-core';

import { parseGitCatFileBatch, readGitBlobsBatch, type GitBlobBatch } from './git-blob-batch.js';
import { PWB_ACT_RECORDS, PWB_GOVERNANCE_ROOT, batchReaderFor, gitTreeReaders, lifecycleFor, loadBodyReadAuthorityInputs } from './governance-inputs.js';
import { readSelfCorpus } from './polaris-generation/self-corpus.js';

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url)).replace(/\/$/, '');
const PINNED_MAIN = '133106eb0f2564f1cefddd19d11985f1b2619397';
const EVALUATION_INSTANT = '2026-10-03T00:00:00Z';
// Real-tree reads spawn git, once per single read: the three real-tree
// tests took up to 28.4 s over 5 alone runs at load1 60-88
// (docs/evidence/syzygy-bpyt-4-31/durations/git-blob-batch.test.tests.json),
// so they carry an explicit budget.
const REAL_TREE_TIMEOUT_MS = 120_000;

const bytes = (text: string): Uint8Array => new TextEncoder().encode(text);
const text = (value: Uint8Array | Error | undefined): string =>
  value instanceof Uint8Array ? new TextDecoder().decode(value) : `error: ${value?.message ?? 'absent'}`;
const OID_A = 'a'.repeat(40);
const OID_B = 'b'.repeat(40);

function singleRead(object: string): Uint8Array {
  return new Uint8Array(execFileSync('git', ['-C', REPO_ROOT, 'cat-file', 'blob', object], { maxBuffer: 64 * 1024 * 1024 }));
}

// The same single reads, awaited one at a time. A synchronous loop over every
// self-corpus object blocked the worker's event loop for 68 s under load, past
// vitest's fixed 60 s worker RPC timeout, and failed a run whose tests all
// passed (syzygy-w90k).
const run = promisify(execFile);
// A failed read is kept and thrown where the synchronous read would have
// thrown; an object the run did not read first fails the test.
async function singleReads(objects: Iterable<string>): Promise<(object: string) => Uint8Array> {
  const reads = new Map<string, Uint8Array | Error>();
  for (const object of new Set(objects)) {
    try {
      const { stdout } = await run('git', ['-C', REPO_ROOT, 'cat-file', 'blob', object], { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 });
      reads.set(object, new Uint8Array(stdout));
    } catch (cause) {
      reads.set(object, cause instanceof Error ? cause : new Error(String(cause)));
    }
  }
  return (object) => {
    const value = reads.get(object);
    if (value === undefined) throw new Error(`not read before the run: ${object}`);
    if (value instanceof Error) throw value;
    return value;
  };
}

describe('parseGitCatFileBatch', () => {
  it('returns each found blob, including an empty one, in request order', () => {
    const out = parseGitCatFileBatch([OID_A, 'HEAD:x y'], bytes(`${OID_A} blob 5\nhello\n${OID_B} blob 0\n\n`));
    expect(text(out.get(OID_A))).toBe('hello');
    expect(text(out.get('HEAD:x y'))).toBe('');
  });

  it('keeps bytes that contain newlines and header-like text', () => {
    const body = `line\n${OID_B} blob 3\nabc\n`;
    const out = parseGitCatFileBatch([OID_A], bytes(`${OID_A} blob ${bytes(body).length}\n${body}\n`));
    expect(text(out.get(OID_A))).toBe(body);
  });

  it('answers a missing, ambiguous or non-blob object with that object’s own error', () => {
    const out = parseGitCatFileBatch(['HEAD:gone', 'abc', 'HEAD:dir', OID_A],
      bytes(`HEAD:gone missing\nabc ambiguous\n${OID_B} tree 2\nxx\n${OID_A} blob 1\nz\n`));
    expect(text(out.get('HEAD:gone'))).toBe('error: git object missing: HEAD:gone');
    expect(text(out.get('abc'))).toBe('error: git object ambiguous: abc');
    expect(text(out.get('HEAD:dir'))).toBe('error: git object is a tree, not a blob: HEAD:dir');
    expect(text(out.get(OID_A))).toBe('z');
  });

  it('fails the whole batch on a short body', () => {
    expect(() => parseGitCatFileBatch([OID_A], bytes(`${OID_A} blob 9\nhello\n`))).toThrow('short read');
  });

  it('fails the whole batch when a body is not followed by its newline', () => {
    expect(() => parseGitCatFileBatch([OID_A], bytes(`${OID_A} blob 4\nhello\n`))).toThrow('short read');
  });

  it('fails the whole batch when the output ends before a header', () => {
    expect(() => parseGitCatFileBatch([OID_A, OID_B], bytes(`${OID_A} blob 1\nz\n`))).toThrow('ends before the header');
  });

  it('fails the whole batch on an unexpected header', () => {
    expect(() => parseGitCatFileBatch([OID_A], bytes(`${OID_A} blob five\nhello\n`))).toThrow('unexpected header');
    expect(() => parseGitCatFileBatch(['HEAD:x'], bytes('HEAD:y missing\n'))).toThrow('unexpected header');
  });

  it('fails the whole batch when a full object id is answered by another object', () => {
    expect(() => parseGitCatFileBatch([OID_A], bytes(`${OID_B} blob 1\nz\n`))).toThrow(`answered ${OID_B}`);
  });

  it('fails the whole batch on output past the last requested object', () => {
    expect(() => parseGitCatFileBatch([OID_A], bytes(`${OID_A} blob 1\nz\n${OID_B} blob 1\nq\n`))).toThrow('continues past');
  });
});

describe('readGitBlobsBatch', () => {
  it('refuses an object name that is not one line, before spawning git', () => {
    expect(() => readGitBlobsBatch('/nonexistent-repository', ['HEAD:a\nHEAD:b'])).toThrow('one non-empty line');
    expect(() => readGitBlobsBatch('/nonexistent-repository', [''])).toThrow('one non-empty line');
  });

  it('reads nothing for no objects', () => {
    expect(readGitBlobsBatch('/nonexistent-repository', []).size).toBe(0);
  });
});

describe('governance tree prefetch', () => {
  const COMMIT = 'c'.repeat(40);
  const ROOT = '/fake/root';
  const tree = (batch: (objects: readonly string[]) => GitBlobBatch, singles: string[]) => gitTreeReaders(
    (_root, args) => (args[0] === 'rev-parse' ? `${COMMIT}\n` : '.syzygy/governance/a.md\0.syzygy/governance/b.md\0.syzygy/governance/c.md\0'),
    (_root, object) => {
      singles.push(object);
      if (object.endsWith('b.md')) throw new Error('single read refused');
      return bytes(`single ${object}`);
    },
    ROOT,
    'HEAD',
    (_root, objects) => batch(objects),
  );

  it('requests only listed, uncached paths, by commit and path', () => {
    const requests: string[][] = [];
    const reader = tree((objects) => {
      requests.push([...objects]);
      return new Map(objects.map((object) => [object, bytes(`batch ${object}`)]));
    }, []);
    reader.read(`${ROOT}/.syzygy/governance/a.md`);
    reader.prefetch([`${ROOT}/.syzygy/governance/a.md`, `${ROOT}/.syzygy/governance/c.md`, `${ROOT}/.syzygy/governance/unlisted.md`]);
    expect(requests).toEqual([[`${COMMIT}:.syzygy/governance/c.md`]]);
    expect(text(reader.read(`${ROOT}/.syzygy/governance/c.md`))).toBe(`batch ${COMMIT}:.syzygy/governance/c.md`);
  });

  it('serves prefetched bytes without a single read and repeats a failed object as a single read', () => {
    const singles: string[] = [];
    const reader = tree((objects) => new Map(objects.map((object) => [object, object.endsWith('b.md') ? new Error('missing') : bytes(`batch ${object}`)])), singles);
    reader.prefetch([`${ROOT}/.syzygy/governance/a.md`, `${ROOT}/.syzygy/governance/b.md`]);
    expect(text(reader.read(`${ROOT}/.syzygy/governance/a.md`))).toBe(`batch ${COMMIT}:.syzygy/governance/a.md`);
    expect(() => reader.read(`${ROOT}/.syzygy/governance/b.md`)).toThrow('single read refused');
    expect(singles).toEqual([`${COMMIT}:.syzygy/governance/b.md`]);
  });

  it('propagates a failed batch rather than reading around it', () => {
    const reader = tree(() => { throw new Error('git blob batch: short read for x'); }, []);
    expect(() => reader.prefetch([`${ROOT}/.syzygy/governance/a.md`])).toThrow('short read');
  });

  it('prefetches exactly the records the lifecycle scan reads: markdown, without the act’s own record', () => {
    const decisions = `${ROOT}/${PWB_GOVERNANCE_ROOT}/decisions`;
    const own = `${PWB_GOVERNANCE_ROOT}/decisions/OWN-ACT.md`;
    const prefetched: string[][] = [];
    const read = (): Uint8Array => bytes('');
    lifecycleFor(read, () => ['EARLIER.md', 'OWN-ACT.md', 'notes.txt', 'LATER.md'], ROOT, own, 'ACT-ID', (paths) => { prefetched.push([...paths]); });
    expect(prefetched).toEqual([[`${decisions}/EARLIER.md`, `${decisions}/LATER.md`]]);
  });

  it('batches nothing when the caller supplies its own file reader', () => {
    const batched: string[] = [];
    loadBodyReadAuthorityInputs({
      repoRoot: ROOT,
      governanceRevision: 'HEAD',
      evaluationId: 'eval-readfile',
      evaluationInstant: EVALUATION_INSTANT,
      runGit: (_root, args) => {
        if (args[0] === 'rev-parse') {
          if (args.some((arg) => arg.startsWith('refs/tags/'))) throw new Error('no tags');
          return `${COMMIT}\n`;
        }
        return `${Object.values(PWB_ACT_RECORDS).join('\0')}\0${PWB_GOVERNANCE_ROOT}/decisions/OTHER.md\0`;
      },
      readGitBlob: () => { throw new Error('single read not expected'); },
      readGitBlobs: (_root, objects) => { batched.push(...objects); return new Map(); },
      readFile: (path) => bytes(path.endsWith('.md') ? 'Act identity: `X`\n' : ''),
    });
    expect(batched).toEqual([]);
  });

  it('never mixes an injected single reader with the real batch reader', () => {
    const single = (): Uint8Array => bytes('');
    expect(batchReaderFor({ readGitBlob: single })).toBeUndefined();
    expect(batchReaderFor({})).toBe(readGitBlobsBatch);
    const injected = (): GitBlobBatch => new Map();
    expect(batchReaderFor({ readGitBlob: single, readGitBlobs: injected })).toBe(injected);
  });
});

describe('batched reads over the real tree (oracle: one git cat-file blob per object)', () => {
  it('reads the same objects and returns the same inputs and evaluation for the governance load', async () => {
    const governanceRevision = execFileSync('git', ['-C', REPO_ROOT, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    const options = { repoRoot: REPO_ROOT, governanceRevision, evaluationId: 'eval-svoj', evaluationInstant: EVALUATION_INSTANT };

    const batchedObjects: string[] = [];
    const singlesWhileBatched: string[] = [];
    const batches: number[] = [];
    const batchedBytes = new Map<string, Uint8Array>();
    const batched = loadBodyReadAuthorityInputs({
      ...options,
      readGitBlob: (_root, object) => { singlesWhileBatched.push(object); return singleRead(object); },
      readGitBlobs: (root, objects) => {
        batches.push(objects.length);
        const out = readGitBlobsBatch(root, objects);
        for (const object of objects) {
          batchedObjects.push(object);
          const value = out.get(object);
          if (value instanceof Uint8Array) batchedBytes.set(object, value);
        }
        return out;
      },
    });

    const read = await singleReads([...batchedObjects, ...singlesWhileBatched]);
    for (const [object, value] of batchedBytes) expect(value, object).toEqual(read(object));
    const singleObjects: string[] = [];
    const single = loadBodyReadAuthorityInputs({ ...options, readGitBlob: (_root, object) => { singleObjects.push(object); return read(object); } });

    expect([...new Set([...batchedObjects, ...singlesWhileBatched])].sort()).toEqual([...new Set(singleObjects)].sort());
    expect(batchedObjects.length).toBeGreaterThan(100);
    expect(batches.length).toBe(1);
    expect(batched).toEqual(single);
    expect(evaluateBodyReadAuthority(batched)).toEqual(evaluateBodyReadAuthority(single));
    const viaDefault = loadBodyReadAuthorityInputs(options);
    expect(viaDefault).toEqual(single);
  }, REAL_TREE_TIMEOUT_MS);

  it('reads the same blobs with the same bytes for the self-corpus at the pinned commit', async () => {
    const batched = readSelfCorpus(REPO_ROOT, PINNED_MAIN);
    const read = await singleReads(batched.sources.flatMap((source) => (source.objectId === null ? [] : [source.objectId])));
    const requested: string[] = [];
    const single = readSelfCorpus(REPO_ROOT, PINNED_MAIN, (_root, objects) => {
      requested.push(...objects);
      return new Map(objects.map((object) => [object, read(object)]));
    });
    expect(batched).toEqual(single);
    expect(requested.sort()).toEqual(single.sources.map((source) => source.objectId).sort());
  }, REAL_TREE_TIMEOUT_MS);

  it('never requests a non-blob entry and refuses it as before', () => {
    const root = tempDir('syzygy-svoj-gitlink-');
    const run = (args: readonly string[]): string => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
    run(['init', '-q']);
    run(['config', 'gc.auto', '0']);
    run(['config', 'maintenance.auto', 'false']);
    run(['config', 'user.email', 'fixture@example.invalid']);
    run(['config', 'user.name', 'Fixture']);
    const tracked = '.syzygy/governance/doctrine/vision.md';
    mkdirSync(dirname(join(root, tracked)), { recursive: true });
    writeFileSync(join(root, tracked), '# Vision\n');
    run(['add', tracked]);
    const gitlink = 'c'.repeat(40);
    run(['update-index', '--add', '--cacheinfo', `160000,${gitlink},.syzygy/governance/doctrine/linked.md`]);
    run(['commit', '-qm', 'fixture with a gitlink at a markdown path']);
    const requested: string[] = [];
    expect(() => readSelfCorpus(root, run(['rev-parse', 'HEAD']), (repo, objects) => { requested.push(...objects); return readGitBlobsBatch(repo, objects); }))
      .toThrow('self-corpus-nonblob');
    expect(requested).not.toContain(gitlink);
    expect(requested.length).toBe(1);
  });

  it('fails the self-corpus read on a missing, unread or altered blob', async () => {
    const requested: string[] = [];
    readSelfCorpus(REPO_ROOT, PINNED_MAIN, (root, objects) => { requested.push(...objects); return readGitBlobsBatch(root, objects); });
    const read = await singleReads(requested);
    const answer = (change: (objects: readonly string[]) => Map<string, Uint8Array | Error>) => () => readSelfCorpus(REPO_ROOT, PINNED_MAIN, (_root, objects) => change(objects));
    expect(answer((objects) => new Map(objects.map((object, index) => [object, index === 3 ? new Error('git object missing: x') : read(object)])))).toThrow('git object missing');
    expect(answer((objects) => new Map(objects.slice(1).map((object) => [object, read(object)])))).toThrow('self-corpus-blob-unread');
    expect(answer((objects) => new Map(objects.map((object, index) => [object, index === 0 ? bytes('# altered\n') : read(object)])))).toThrow('self-corpus-object-mismatch');
  }, REAL_TREE_TIMEOUT_MS);
});
