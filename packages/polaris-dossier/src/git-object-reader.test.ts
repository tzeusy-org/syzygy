import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, closeSync, constants as fsConstants, cpSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { tempDir } from '@syzygy/test-kit';
import { beforeAll, describe, expect, it } from 'vitest';
import { GitObjectReadRefusal, hashAlgorithmOf, openPinnedObjectReader, type PinnedObjectReader, type PinnedObjectReaderOptions } from './git-object-reader.js';

// Fixture clones are built with the git CLI (the reader under test spawns nothing). Dates, names and content are fixed, so every
// object identifier below is a literal: these are the identifiers git computed for these bytes, written here by hand.
const C1 = '1446b80da43514833ddd07b6acf511f8e5d5587a';   // SHA-1, commit "one"
const C2 = 'c63b8bbd0774e8299ddf9b41ded0d067041167de';   // SHA-1, commit "two" (HEAD)
const TREE2 = 'ed0f1e7b2db8b64ce6a7fee8006117a861c0c2c4';
const TREE1 = '94e4861c38016e1a532f35f9f969ba1c887cc7db';
const QUOTED_ID = '346e451ab772ed0d99ba93b54f1d192e450644de';
const BIG1_ID = '37d6ac34282cd848af27777eeeb4f94c0d987bc7';
const S2 = '789f9d6ea0e958b4da950a97a49800ea5286050aa3158310f354e6fd766f1cd2';   // SHA-256, commit "two"
const QUOTED = 'The committed sentence, “quoted”.\n';
const BIG = (v: number): string => Array.from({ length: 400 }, (_, i) => `line ${i} of the large file${i === 200 ? `, version ${v}` : ''}\n`).join('');

let T = '';
const env = {
  ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', HOME: '/nonexistent',
  GIT_AUTHOR_NAME: 'Fixture', GIT_AUTHOR_EMAIL: 'fixture@example.invalid', GIT_COMMITTER_NAME: 'Fixture', GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
};
const git = (cwd: string, args: readonly string[], extra: Record<string, string> = {}): string =>
  execFileSync('git', args, { cwd, env: { ...env, ...extra }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const at = (date: string): Record<string, string> => ({ GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date });

/** Two commits: the first with every file, the second changing one line of the large file. */
function build(dir: string, format: 'sha1' | 'sha256'): void {
  mkdirSync(dir, { recursive: true });
  git(dir, ['init', '-q', '-b', 'main', `--object-format=${format}`]);
  git(dir, ['config', 'gc.auto', '0']);
  git(dir, ['config', 'maintenance.auto', 'false']);
  mkdirSync(path.join(dir, 'src'));
  writeFileSync(path.join(dir, 'README.md'), 'hello\n');
  writeFileSync(path.join(dir, 'src/quoted.txt'), QUOTED);
  writeFileSync(path.join(dir, 'src/run.sh'), '#!/bin/sh\necho hi\n');
  chmodSync(path.join(dir, 'src/run.sh'), 0o755);
  symlinkSync('src/quoted.txt', path.join(dir, 'link'));
  writeFileSync(path.join(dir, 'big.txt'), BIG(1));
  git(dir, ['add', '-A']);
  git(dir, ['commit', '-q', '-m', 'one'], at('2026-10-06T00:00:00Z'));
  writeFileSync(path.join(dir, 'big.txt'), BIG(2));
  git(dir, ['commit', '-q', '-am', 'two'], at('2026-10-06T00:01:00Z'));
}
const copy = (from: string, name: string): string => { const to = path.join(T, name); cpSync(from, to, { recursive: true, verbatimSymlinks: true }); return to; };
const gitDir = (repo: string): string => path.join(repo, '.git');
const looseFile = (repo: string, id: string): string => path.join(repo, '.git/objects', id.slice(0, 2), id.slice(2));
const overwrite = (file: string, bytes: Buffer): void => { chmodSync(file, 0o644); writeFileSync(file, bytes); };
type Limits = Omit<PinnedObjectReaderOptions, 'gitDir' | 'revision'>;
const reader = (repo: string, revision: string, limits: Limits = {}): PinnedObjectReader => openPinnedObjectReader({ gitDir: gitDir(repo), revision, ...limits });
const text = (bytes: Uint8Array): string => Buffer.from(bytes).toString('utf8');
async function refusal(p: Promise<unknown>): Promise<{ reason: string; objectId: string | null; path: string | null; message: string }> {
  try { await p; } catch (e) { if (e instanceof GitObjectReadRefusal) return e.toJSON(); throw e; }
  throw new Error('expected a refusal, got a result');
}

let L = '', OFS = '', REF = '', S = '', SP = '';
/** Offsets of pack entries by object id, and how many are deltas, from `git verify-pack -v` (fixture inspection only). */
const packEntries = (repo: string): { offsets: Map<string, number>; deltas: number } => {
  const dir = path.join(repo, '.git/objects/pack'), idx = readdirSync(dir).find(n => n.endsWith('.idx'))!;
  const out = git(repo, ['verify-pack', '-v', path.join(dir, idx)]), offsets = new Map<string, number>();
  let deltas = 0;
  for (const line of out.split('\n')) {
    const m = /^([0-9a-f]{40,64}) (\w+) +(\d+) (\d+) (\d+)( \d+ [0-9a-f]+)?$/.exec(line);
    if (m === null) continue;
    offsets.set(m[1]!, Number(m[5]));
    if (m[6] !== undefined) deltas += 1;
  }
  return { offsets, deltas };
};
const packFile = (repo: string): string => {
  const dir = path.join(repo, '.git/objects/pack');
  return path.join(dir, readdirSync(dir).find(n => n.endsWith('.pack'))!);
};
let ofsEntries: { offsets: Map<string, number>; deltas: number }, refEntries: { offsets: Map<string, number>; deltas: number };
beforeAll(() => {
  T = tempDir('git-object-reader-');
  L = path.join(T, 'loose'); build(L, 'sha1');
  writeFileSync(path.join(L, 'src/quoted.txt'), 'An uncommitted working-tree edit.\n');   // the working tree differs from HEAD
  S = path.join(T, 'sha256'); build(S, 'sha256');
  OFS = copy(L, 'ofs'); git(OFS, ['repack', '-q', '-a', '-d', '-f', '--window=10', '--depth=10']); git(OFS, ['prune-packed']);
  REF = copy(L, 'ref'); git(REF, ['-c', 'repack.useDeltaBaseOffset=false', 'repack', '-q', '-a', '-d', '-f', '--window=10', '--depth=10']); git(REF, ['prune-packed']);
  SP = copy(S, 'sha256-packed'); git(SP, ['repack', '-q', '-a', '-d', '-f']); git(SP, ['prune-packed']);
  ofsEntries = packEntries(OFS); refEntries = packEntries(REF);
});

const ALL_PATHS = [
  { path: 'README.md', mode: '100644', id: 'ce013625030ba8dba906f756967f9e9ca394464a' },
  { path: 'big.txt', mode: '100644', id: '86eba436a1086aacef37e390ddc455d5f7c36d76' },
  { path: 'link', mode: '120000', id: 'a9b639a18cee797978c525478961c3ce5ffcddb4' },
  { path: 'src/quoted.txt', mode: '100644', id: QUOTED_ID },
  { path: 'src/run.sh', mode: '100755', id: '4163036efa65bd4a469e752267498f01ea36a55c' },
];

describe('hashAlgorithmOf: the algorithm is the one the consented identifier is written in', () => {
  it('40 hex digits are SHA-1 and 64 are SHA-256; anything else refuses', () => {
    expect(hashAlgorithmOf(C2)).toBe('sha1');
    expect(hashAlgorithmOf(S2)).toBe('sha256');
    for (const bad of ['', C2.toUpperCase(), C2.slice(1), `${C2}0`, S2.slice(1), `${S2}0`, `g${C2.slice(1)}`, ` ${C2}`, 'HEAD', 'main', 'refs/heads/main']) {
      expect(() => hashAlgorithmOf(bad), JSON.stringify(bad)).toThrow(GitObjectReadRefusal);
      expect(() => openPinnedObjectReader({ gitDir: '/nonexistent', revision: bad }), JSON.stringify(bad)).toThrow(/object identifier/);
    }
  });
});

describe('reads at the pinned revision, from loose objects and packs, every object re-hashed', () => {
  it('reads the committed bytes, never the working tree, from loose objects', async () => {
    const [blob] = await reader(L, C2).readBlobs(['src/quoted.txt']);
    expect(blob).toMatchObject({ path: 'src/quoted.txt', mode: '100644', id: QUOTED_ID });
    expect(text(blob!.bytes)).toBe(QUOTED);
    expect(readFileSync(path.join(L, 'src/quoted.txt'), 'utf8')).toBe('An uncommitted working-tree edit.\n');
  });
  it('reads every kind of entry and lists the tree, in tree order', async () => {
    const r = reader(L, C2);
    expect(r.algorithm).toBe('sha1');
    expect(await r.tree()).toBe(TREE2);
    expect(await r.listTree()).toEqual(ALL_PATHS);
    const blobs = await r.readBlobs(['README.md', 'src/run.sh', 'link', 'big.txt']);
    expect(blobs.map(b => [b.mode, text(b.bytes)])).toEqual([['100644', 'hello\n'], ['100755', '#!/bin/sh\necho hi\n'], ['120000', 'src/quoted.txt'], ['100644', BIG(2)]]);
  });
  it('reads at the pinned commit, not at HEAD: commit one has the first version', async () => {
    const [big] = await reader(L, C1).readBlobs(['big.txt']);
    expect(big!.id).toBe(BIG1_ID);
    expect(text(big!.bytes)).toBe(BIG(1));
  });
  it('resolves offset deltas and reference deltas in packs to the same bytes', async () => {
    expect(ofsEntries.offsets.size).toBe(11);
    expect(ofsEntries.deltas).toBeGreaterThan(0);   // the fixture has deltas to resolve
    expect(refEntries.deltas).toBeGreaterThan(0);
    expect(existsSync(looseFile(OFS, QUOTED_ID))).toBe(false);
    for (const repo of [OFS, REF]) for (const rev of [C1, C2]) {
      const blobs = await reader(repo, rev).readBlobs(['big.txt', 'src/quoted.txt', 'README.md']);
      expect(blobs.map(b => text(b.bytes)), `${path.basename(repo)} at ${rev}`).toEqual([BIG(rev === C1 ? 1 : 2), QUOTED, 'hello\n']);
      expect(await reader(repo, rev).listTree()).toHaveLength(5);
    }
  });
  it('reads a SHA-256 clone under its 64-digit identifier, loose and packed', async () => {
    for (const repo of [S, SP]) {
      const r = reader(repo, S2);
      expect(r.algorithm).toBe('sha256');
      const [q] = await r.readBlobs(['src/quoted.txt']);
      expect(text(q!.bytes)).toBe(QUOTED);
      expect(q!.id).toBe('c69f7c3c1175628f676a508c2035936b2f21527dd577deddade1eb25d3091048');
    }
  });
});

describe('the clone\'s .git is untrusted: what an agent can plant there is refused or ignored', () => {
  it('an overwritten loose object, valid but other bytes, refuses with the identifier it was reached by', async () => {
    const repo = copy(L, 'overwritten');
    overwrite(looseFile(repo, QUOTED_ID), deflateSync(Buffer.from('blob 14\0Other bytes.\n\n')));
    expect(await refusal(reader(repo, C2).readBlobs(['src/quoted.txt']))).toEqual({
      reason: 'identifier-mismatch', objectId: QUOTED_ID, path: 'src/quoted.txt',
      message: `the object read as ${QUOTED_ID} hashes to another identifier`,
    });
    // the other files still read: the refusal is the step's that needed the object
    expect(text((await reader(repo, C2).readBlobs(['README.md']))[0]!.bytes)).toBe('hello\n');
  });
  it('an overwritten tree or commit refuses every read below it', async () => {
    const repo = copy(L, 'overwritten-tree');
    overwrite(looseFile(repo, TREE2), readFileSync(looseFile(repo, TREE1)));
    expect((await refusal(reader(repo, C2).readBlobs(['README.md']))).reason).toBe('identifier-mismatch');
    expect((await refusal(reader(repo, C2).listTree())).objectId).toBe(TREE2);
    overwrite(looseFile(repo, C2), readFileSync(looseFile(repo, C1)));
    expect(await refusal(reader(repo, C2).tree())).toMatchObject({ reason: 'identifier-mismatch', objectId: C2 });
  });
  it('a corrupted loose object refuses as corrupt', async () => {
    const repo = copy(L, 'corrupt-loose');
    const file = looseFile(repo, QUOTED_ID), bytes = readFileSync(file);
    const k = bytes.length - 3;
    bytes[k] = bytes[k]! ^ 0xff;
    overwrite(file, bytes);
    expect(await refusal(reader(repo, C2).readBlobs(['src/quoted.txt']))).toEqual({ reason: 'corrupt-object', objectId: QUOTED_ID, path: 'src/quoted.txt', message: `loose object ${QUOTED_ID} does not inflate` });
    overwrite(file, deflateSync(Buffer.from(`blob 99\0${QUOTED}`)));   // a header whose size is not the body's
    expect((await refusal(reader(repo, C2).readBlobs(['src/quoted.txt']))).message).toBe(`loose object ${QUOTED_ID} has a malformed header`);
  });
  it('a corrupted pack entry refuses, for a whole object and for a delta', async () => {
    for (const [name, id] of [['corrupt-pack-whole', QUOTED_ID], ['corrupt-pack-delta', BIG1_ID]] as const) {
      const repo = copy(OFS, name), file = packFile(repo), bytes = readFileSync(file);
      const k = ofsEntries.offsets.get(id)! + 4;
      bytes[k] = bytes[k]! ^ 0x55;
      overwrite(file, bytes);
      const path_ = id === QUOTED_ID ? 'src/quoted.txt' : 'big.txt';
      expect(await refusal(reader(repo, id === QUOTED_ID ? C2 : C1).readBlobs([path_])), name).toMatchObject({ reason: 'corrupt-object', objectId: id });
    }
  });
  it('a pack entry that declares another size than it inflates to refuses, though its body would hash', async () => {
    const repo = copy(OFS, 'pack-size'), file = packFile(repo), bytes = readFileSync(file), at_ = ofsEntries.offsets.get(QUOTED_ID)!;
    expect([bytes[at_], bytes[at_ + 1]]).toEqual([0xb6, 0x02]);   // blob, 38 bytes: 6 + 2 * 16
    bytes[at_ + 1] = 0x03;   // declares 54
    overwrite(file, bytes);
    expect(await refusal(reader(repo, C2).readBlobs(['src/quoted.txt']))).toMatchObject({ reason: 'corrupt-object', message: `${QUOTED_ID}: pack entry inflates to 38 bytes, not the 54 it declares` });
  });
  it('a replace ref is never honoured: the original bytes are read', async () => {
    const repo = copy(L, 'replaced');
    writeFileSync(path.join(T, 'other.txt'), 'Replacement bytes.\n');
    const other = git(repo, ['hash-object', '-w', path.join(T, 'other.txt')]);
    git(repo, ['replace', QUOTED_ID, other]);
    git(repo, ['replace', '--graft', C2]);   // a parentless replacement commit for HEAD
    expect(git(repo, ['cat-file', 'blob', `${C2}:src/quoted.txt`])).toBe('Replacement bytes.');   // git itself honours it
    const [blob] = await reader(repo, C2).readBlobs(['src/quoted.txt']);
    expect([blob!.id, text(blob!.bytes)]).toEqual([QUOTED_ID, QUOTED]);
  });
  it('an alternates file is never followed: an object only an alternate holds refuses', async () => {
    const shared = path.join(T, 'shared');
    git(T, ['clone', '-q', '--shared', L, shared]);
    expect(readFileSync(path.join(shared, '.git/objects/info/alternates'), 'utf8')).toContain(path.join(L, '.git/objects'));
    expect(git(shared, ['cat-file', '-t', C2])).toBe('commit');   // git reads it through the alternate
    expect(await refusal(reader(shared, C2).tree())).toEqual({
      reason: 'object-missing', objectId: C2, path: null,
      message: `${C2} is in neither a loose object nor a pack of this clone; objects/info/alternates is present and is never followed`,
    });
  });
  it('grafts and a shallow file change nothing read: the walk never goes to a parent', async () => {
    const repo = copy(L, 'grafted');
    writeFileSync(path.join(repo, '.git/info/grafts'), `${C2}\n`);
    writeFileSync(path.join(repo, '.git/shallow'), `${C2}\n`);
    const r = reader(repo, C2);
    expect(await r.tree()).toBe(TREE2);
    expect(await r.listTree()).toEqual(ALL_PATHS);
  });
  it('repository-local configuration, hooks and attributes run nothing and change nothing', async () => {
    const repo = copy(L, 'configured'), marker = path.join(T, 'MARKER');
    const touch = `touch ${marker}`;
    writeFileSync(path.join(repo, '.git/config'), [
      '[core]', '\trepositoryformatversion = 1', `\tfsmonitor = ${touch}`, '\thooksPath = hooks', `\tsshCommand = ${touch}`, `\tpager = ${touch}`,
      '[extensions]', '\tobjectFormat = sha256', '[filter "evil"]', `\tsmudge = ${touch}`, `\ttextconv = ${touch}`, '[alias]', `\tcat-file = !${touch}`, '',
    ].join('\n'));
    writeFileSync(path.join(repo, '.git/info/attributes'), '* filter=evil diff=evil\n');
    mkdirSync(path.join(repo, 'hooks'), { recursive: true });
    for (const hook of ['post-checkout', 'pre-commit', 'reference-transaction', 'fsmonitor-watchman']) {
      for (const dir of [path.join(repo, 'hooks'), path.join(repo, '.git/hooks')]) { writeFileSync(path.join(dir, hook), `#!/bin/sh\n${touch}\n`); chmodSync(path.join(dir, hook), 0o755); }
    }
    const r = reader(repo, C2);
    expect(r.algorithm).toBe('sha1');   // extensions.objectFormat is not consulted
    expect(await r.listTree()).toEqual(ALL_PATHS);
    expect(text((await r.readBlobs(['src/quoted.txt']))[0]!.bytes)).toBe(QUOTED);
    expect(existsSync(marker)).toBe(false);
  });
  it('a .git file pointing elsewhere is never followed', async () => {
    const repo = path.join(T, 'gitfile');
    mkdirSync(repo);
    writeFileSync(path.join(repo, '.git'), `gitdir: ${path.join(L, '.git')}\n`);
    expect(await refusal(reader(repo, C2).tree())).toMatchObject({ reason: 'not-a-git-directory' });
  });
});

describe('the hash algorithm comes from the consented identifier, never from the clone', () => {
  it('a SHA-256 clone under a 40-digit identifier refuses, loose and packed', async () => {
    expect(await refusal(reader(S, C2).tree())).toMatchObject({ reason: 'object-missing', objectId: C2 });
    expect(await refusal(reader(S, S2.slice(0, 40)).tree())).toMatchObject({ reason: 'object-missing', objectId: S2.slice(0, 40) });
    expect(await refusal(reader(SP, S2.slice(0, 40)).tree())).toMatchObject({ reason: 'invalid-pack-index', message: expect.stringMatching(/^pack-[0-9a-f]+\.idx is not a version-2 sha1 pack index: size \d+ fits no \d+-entry index$/) });
  });
  it('a SHA-1 clone under a 64-digit identifier refuses', async () => {
    expect(await refusal(reader(L, S2).tree())).toMatchObject({ reason: 'object-missing', objectId: S2 });
    expect(await refusal(reader(OFS, S2).tree())).toMatchObject({ reason: 'invalid-pack-index', message: expect.stringMatching(/^pack-[0-9a-f]+\.idx is not a version-2 sha256 pack index: truncated$/) });   // 11 entries read 64 digits wide overrun the file
  });
});

describe('paths, types, and no state between calls', () => {
  it('a path that is absent, a directory, a submodule or malformed refuses', async () => {
    const r = reader(L, C2);
    expect(await refusal(r.readBlobs(['missing.txt']))).toMatchObject({ reason: 'path-not-found', path: 'missing.txt' });
    expect(await refusal(r.readBlobs(['README.md/x']))).toMatchObject({ reason: 'path-not-found', path: 'README.md/x' });
    expect(await refusal(r.readBlobs(['src']))).toMatchObject({ reason: 'not-a-blob', path: 'src' });
    const repo = copy(L, 'gitlink');
    git(repo, ['update-index', '--add', '--cacheinfo', `160000,${C1},vendor`]);
    git(repo, ['commit', '-q', '-m', 'three'], at('2026-10-06T00:02:00Z'));
    expect(await refusal(reader(repo, git(repo, ['rev-parse', 'HEAD'])).readBlobs(['vendor']))).toMatchObject({ reason: 'not-a-blob', objectId: C1, path: 'vendor' });
    expect(await reader(repo, git(repo, ['rev-parse', 'HEAD'])).listTree()).toContainEqual({ path: 'vendor', mode: '160000', id: C1 });
    for (const bad of ['', '/README.md', 'src//quoted.txt', './README.md', 'src/../README.md', 'README.md/']) {
      expect(await refusal(r.readBlobs([bad])), JSON.stringify(bad)).toMatchObject({ reason: 'malformed-path' });
    }
  });
  it('a pinned identifier that names a tree or a blob refuses as the wrong type', async () => {
    expect(await refusal(reader(L, TREE2).tree())).toMatchObject({ reason: 'type-mismatch', objectId: TREE2, message: `${TREE2} is a tree, not a commit` });
    expect(await refusal(reader(OFS, QUOTED_ID).tree())).toMatchObject({ reason: 'type-mismatch' });
  });
  it('one refused path refuses the whole call', async () => {
    expect(await refusal(reader(L, C2).readBlobs(['README.md', 'missing.txt']))).toMatchObject({ reason: 'path-not-found' });
  });
  it('re-reads on every call: an object overwritten after a good read refuses the next', async () => {
    const repo = copy(L, 'later'), r = reader(repo, C2);
    expect(text((await r.readBlobs(['src/quoted.txt']))[0]!.bytes)).toBe(QUOTED);
    overwrite(looseFile(repo, QUOTED_ID), deflateSync(Buffer.from('blob 14\0Other bytes.\n\n')));
    expect((await refusal(r.readBlobs(['src/quoted.txt']))).reason).toBe('identifier-mismatch');
  });
  it('the reader imports nothing that can start a process', () => {
    const source = readFileSync(fileURLToPath(new URL('./git-object-reader.ts', import.meta.url)), 'utf8');
    expect(source.match(/^import .*$/gm)).toEqual([
      "import { createHash } from 'node:crypto';",
      "import { constants, lstat, open, readdir, type FileHandle } from 'node:fs/promises';",
      "import path from 'node:path';",
      "import { inflateSync } from 'node:zlib';",
    ]);
    expect(source).not.toMatch(/child_process|\bspawn(Sync)?\(|(?<![.\w])exec(File)?(Sync)?\(|\bimport\(|\brequire\(|\bprocess\./);
  });
});

// Hand-built object stores, for malformations git itself never writes. Each object is written with its true SHA-1 identifier, so
// only the malformation can refuse it.
const raw = (type: string, body: Buffer): { id: string; type: string; body: Buffer } =>
  ({ id: createHash('sha1').update(`${type} ${body.length}\0`).update(body).digest('hex'), type, body });
interface PackRow { readonly id: string; readonly entry: Buffer; readonly offset?: number }
/** `offset` overrides where the index says a row's entry is; `idx` rewrites the finished index. */
function handBuilt(name: string, loose: ReadonlyArray<{ id: string; type: string; body: Buffer }>, pack: readonly PackRow[] = [], idx?: (bytes: Buffer, count: number) => Buffer): string {
  const repo = path.join(T, name), objects = path.join(repo, '.git/objects');
  mkdirSync(path.join(objects, 'pack'), { recursive: true });
  for (const o of loose) {
    mkdirSync(path.join(objects, o.id.slice(0, 2)), { recursive: true });
    writeFileSync(path.join(objects, o.id.slice(0, 2), o.id.slice(2)), deflateSync(Buffer.concat([Buffer.from(`${o.type} ${o.body.length}\0`), o.body])));
  }
  if (pack.length > 0) {
    const head = Buffer.alloc(12);
    head.write('PACK', 0, 'latin1'); head.writeUInt32BE(2, 4); head.writeUInt32BE(pack.length, 8);
    const offsets: number[] = [];
    let at = 12;
    for (const e of pack) { offsets.push(at); at += e.entry.length; }
    writeFileSync(path.join(objects, 'pack/pack-x.pack'), Buffer.concat([head, ...pack.map(e => e.entry), Buffer.alloc(20)]));
    const sorted = pack.map((e, k) => ({ id: e.id, offset: e.offset ?? offsets[k]! })).sort((a, b) => (a.id < b.id ? -1 : 1));
    const fanout = Buffer.alloc(1024);
    for (let b = 0; b < 256; b += 1) fanout.writeUInt32BE(sorted.filter(e => parseInt(e.id.slice(0, 2), 16) <= b).length, b * 4);
    const offs = Buffer.alloc(4 * sorted.length);
    sorted.forEach((e, k) => offs.writeUInt32BE(e.offset >>> 0, k * 4));
    const index = Buffer.concat([
      Buffer.from([0xff, 0x74, 0x4f, 0x63, 0, 0, 0, 2]), fanout, ...sorted.map(e => Buffer.from(e.id, 'hex')), Buffer.alloc(4 * sorted.length), offs, Buffer.alloc(40),
    ]);
    writeFileSync(path.join(objects, 'pack/pack-x.idx'), idx === undefined ? index : idx(index, sorted.length));
  }
  return repo;
}
const varint = (n: number): number[] => { const out: number[] = []; do { out.push((n & 0x7f) | (n > 0x7f ? 0x80 : 0)); n = Math.floor(n / 128); } while (n > 0); return out; };
const entryHead = (type: number, size: number): Buffer => {
  const out = [(type << 4) | (size & 0x0f) | (size > 0x0f ? 0x80 : 0)];
  for (let rest = Math.floor(size / 16); rest > 0; rest = Math.floor(rest / 128)) out.push((rest & 0x7f) | (rest > 0x7f ? 0x80 : 0));
  return Buffer.from(out);
};
const ofsBack = (n: number): Buffer => { const out = [n & 0x7f]; while ((n = Math.floor(n / 128)) > 0) { n -= 1; out.unshift(0x80 | (n & 0x7f)); } return Buffer.from(out); };
/** A pack holding BASE whole and TARGET as an offset delta over it, with the delta's declared sizes and base offset adjustable. */
function deltaRepo(name: string, over: { source?: number; target?: number; back?: (deltaAt: number) => number; ops?: readonly number[] } = {}): { repo: string; commit: string } {
  const base = raw('blob', Buffer.from('abcdefghij')), target = raw('blob', Buffer.from('abcdefghij!!'));
  const delta = Buffer.from([...varint(over.source ?? 10), ...varint(over.target ?? 12), ...(over.ops ?? [0x90, 10, 2, 0x21, 0x21])]);   // copy 10 from 0; insert "!!"
  const baseEntry = Buffer.concat([entryHead(3, 10), deflateSync(base.body)]), deltaAt = 12 + baseEntry.length;
  const deltaEntry = Buffer.concat([entryHead(6, delta.length), ofsBack(over.back?.(deltaAt) ?? deltaAt - 12), deflateSync(delta)]);
  const tree = raw('tree', Buffer.concat([Buffer.from('100644 f\0'), Buffer.from(target.id, 'hex')]));
  const commit = raw('commit', Buffer.from(`tree ${tree.id}\n\nm\n`));
  return { repo: handBuilt(name, [tree, commit], [{ id: base.id, entry: baseEntry }, { id: target.id, entry: deltaEntry }]), commit: commit.id };
}

describe('malformations git never writes, in hand-built stores', () => {
  it('a well-formed hand-built delta reads: the fixtures below differ from it only in the malformation', async () => {
    const { repo, commit } = deltaRepo('delta-good');
    expect(text((await reader(repo, commit).readBlobs(['f']))[0]!.bytes)).toBe('abcdefghij!!');
  });
  it('a delta whose declared base size is not its base\'s refuses, though its output would hash', async () => {
    const { repo, commit } = deltaRepo('delta-source', { source: 11 });
    expect(await refusal(reader(repo, commit).readBlobs(['f']))).toMatchObject({ reason: 'corrupt-object', message: '1ccd73aeacfd33cab1d9e1091d21860c1922ef53: delta expects a 11-byte base, got 10' });
  });
  it('a delta that yields fewer bytes than it declares refuses as corrupt', async () => {
    const { repo, commit } = deltaRepo('delta-target', { target: 13 });
    expect(await refusal(reader(repo, commit).readBlobs(['f']))).toMatchObject({ reason: 'corrupt-object', message: '1ccd73aeacfd33cab1d9e1091d21860c1922ef53: delta yields 12 bytes, not the 13 it declares' });
  });
  it('an offset delta whose base lies outside the pack\'s entries refuses', async () => {
    for (const back of [(at: number) => at, (at: number) => at - 4, () => 0]) {
      const { repo, commit } = deltaRepo('delta-back', { back });
      expect(await refusal(reader(repo, commit).readBlobs(['f']))).toMatchObject({ reason: 'corrupt-object', message: '1ccd73aeacfd33cab1d9e1091d21860c1922ef53: delta base offset out of range in pack-x' });
      rmSync(repo, { recursive: true });
    }
  });
  it('a commit whose tree line is in another hash width refuses', async () => {
    const commit = raw('commit', Buffer.from(`tree ${'a'.repeat(64)}\n\nm\n`));
    expect(await refusal(reader(handBuilt('wide-tree-line', [commit]), commit.id).tree())).toMatchObject({ reason: 'malformed-commit', objectId: commit.id });
  });
  it('a tree entry whose name holds a slash refuses', async () => {
    const blob = raw('blob', Buffer.from('x')), tree = raw('tree', Buffer.concat([Buffer.from('100644 a/b\0'), Buffer.from(blob.id, 'hex')]));
    const commit = raw('commit', Buffer.from(`tree ${tree.id}\n\nm\n`)), repo = handBuilt('slash-name', [blob, tree, commit]);
    expect(await refusal(reader(repo, commit.id).listTree())).toMatchObject({ reason: 'malformed-tree', objectId: tree.id });
    expect(await refusal(reader(repo, commit.id).readBlobs(['a/b']))).toMatchObject({ reason: 'malformed-tree' });
  });
});

/** One file `f` holding `content`, under a tree under a commit. */
const oneFile = (content: Buffer | string): { blob: ReturnType<typeof raw>; tree: ReturnType<typeof raw>; commit: ReturnType<typeof raw> } => {
  const blob = raw('blob', Buffer.from(content));
  const tree = raw('tree', Buffer.concat([Buffer.from('100644 f\0'), Buffer.from(blob.id, 'hex')]));
  return { blob, tree, commit: raw('commit', Buffer.from(`tree ${tree.id}\n\nm\n`)) };
};
const whole = (body: Buffer, type = 3): Buffer => Buffer.concat([entryHead(type, body.length), deflateSync(body)]);
/** `levels` offset deltas stacked over one whole blob of `size` bytes, each copying all of its base, so every level yields the
 * same bytes and the index points the blob's identifier at the top level (the reviewer's amplification construction). */
function chainRepo(name: string, levels: number, size: number): { repo: string; commit: string } {
  const { blob, tree, commit } = oneFile(Buffer.alloc(size, 0x61));
  const ops: number[] = [];
  for (let from = 0; from < size;) {
    const n = Math.min(0xffffff, size - from);
    ops.push(0xff, from & 255, (from >> 8) & 255, (from >> 16) & 255, (from >>> 24) & 255, n & 255, (n >> 8) & 255, (n >> 16) & 255);
    from += n;
  }
  const delta = Buffer.from([...varint(size), ...varint(size), ...ops]), stored = deflateSync(delta), entries = [whole(blob.body)];
  for (let k = 0; k < levels; k += 1) entries.push(Buffer.concat([entryHead(6, delta.length), ofsBack(entries[entries.length - 1]!.length), stored]));
  const top = 12 + entries.slice(0, -1).reduce((n, e) => n + e.length, 0);
  return { repo: handBuilt(name, [tree, commit], [{ id: blob.id, entry: Buffer.concat(entries), offset: top }]), commit: commit.id };
}
/** A tree of entries written byte for byte: [mode, name bytes, id]. */
const treeOf = (entries: ReadonlyArray<readonly [string, Buffer | string, string]>): ReturnType<typeof raw> =>
  raw('tree', Buffer.concat(entries.flatMap(([mode, name, id]) => [Buffer.from(`${mode} `), Buffer.from(name), Buffer.from([0]), Buffer.from(id, 'hex')])));
const onTree = (name: string, tree: ReturnType<typeof raw>, extra: ReadonlyArray<ReturnType<typeof raw>> = []): { repo: string; commit: string } => {
  const commit = raw('commit', Buffer.from(`tree ${tree.id}\n\nm\n`));
  return { repo: handBuilt(name, [...extra, tree, commit]), commit: commit.id };
};

describe('nothing under .git is read through a link or from a special file (R-POLARIS-DOSSIER-S2-READER-1 finding 2)', () => {
  it('a loose object that is a link to a FIFO, a FIFO, a directory or a link to a device refuses at once, never blocks', async () => {
    const { blob, tree, commit } = oneFile('abc'), fifo = path.join(T, 'the-fifo');
    execFileSync('mkfifo', [fifo]);
    try {
      const cases = [
        ['link-to-fifo', (at: string) => symlinkSync(fifo, at), 'is a symbolic link, never followed'],
        ['fifo', (at: string) => execFileSync('mkfifo', [at]), 'is not a regular file'],
        ['directory', (at: string) => mkdirSync(at), 'is not a regular file'],
        ['link-to-device', (at: string) => symlinkSync('/dev/zero', at), 'is a symbolic link, never followed'],
      ] as const;
      for (const [name, plant, says] of cases) {
        const repo = handBuilt(`special-${name}`, [tree, commit]), at = looseFile(repo, blob.id);
        mkdirSync(path.dirname(at), { recursive: true });
        plant(at);
        expect(await refusal(reader(repo, commit.id).readBlobs(['f'])), name).toEqual({
          reason: 'unsafe-store-entry', objectId: null, path: null, message: `objects/${blob.id.slice(0, 2)}/${blob.id.slice(2)} ${says}`,
        });
      }
    } finally {
      // a reader blocked on the FIFO (a mutant) is released, so the run ends
      try { closeSync(openSync(fifo, fsConstants.O_WRONLY | fsConstants.O_NONBLOCK)); } catch { /* no reader waiting */ }
    }
  });
  it('a linked objects, pack or fan-out directory refuses: another store is never read as this one (a de facto alternate)', async () => {
    const { blob, tree, commit } = oneFile('abc');
    const other = handBuilt('link-target', [blob, tree, commit]);
    expect(text((await reader(other, commit.id).readBlobs(['f']))[0]!.bytes)).toBe('abc');   // the linked-to store reads
    const objects = path.join(T, 'link-objects/.git');
    mkdirSync(objects, { recursive: true });
    symlinkSync(path.join(other, '.git/objects'), path.join(objects, 'objects'));
    expect(await refusal(reader(path.join(T, 'link-objects'), commit.id).tree())).toMatchObject({ reason: 'unsafe-store-entry', message: 'objects is not a directory; nothing under .git is read through a symbolic link' });
    const pack = handBuilt('link-pack', [blob, tree, commit]);
    rmSync(path.join(pack, '.git/objects/pack'), { recursive: true });
    symlinkSync(path.join(OFS, '.git/objects/pack'), path.join(pack, '.git/objects/pack'));
    expect(await refusal(reader(pack, commit.id).tree())).toMatchObject({ reason: 'unsafe-store-entry', message: 'objects/pack is not a directory; nothing under .git is read through a symbolic link' });
    const fan = handBuilt('link-fan', [tree, commit]);
    symlinkSync(path.join(other, '.git/objects', blob.id.slice(0, 2)), path.join(fan, '.git/objects', blob.id.slice(0, 2)));
    expect(await refusal(reader(fan, commit.id).readBlobs(['f']))).toMatchObject({ reason: 'unsafe-store-entry', message: `objects/${blob.id.slice(0, 2)} is not a directory; nothing under .git is read through a symbolic link` });
  });
  it('an .idx or .pack that is a link, a directory, or a .pack that is absent refuses', async () => {
    const { blob, tree, commit } = oneFile('abc');
    const dir = handBuilt('idx-dir', [blob, tree, commit]);   // every object loose
    mkdirSync(path.join(dir, '.git/objects/pack/pack-y.idx'));
    expect(await refusal(reader(dir, commit.id).readBlobs(['f']))).toEqual({ reason: 'unsafe-store-entry', objectId: null, path: null, message: 'objects/pack/pack-y.idx is not a regular file' });
    const packed = (name: string): string => handBuilt(name, [tree, commit], [{ id: blob.id, entry: whole(blob.body) }]);
    expect(text((await reader(packed('pack-good'), commit.id).readBlobs(['f']))[0]!.bytes)).toBe('abc');
    const idxLink = packed('idx-link'), idxAt = path.join(idxLink, '.git/objects/pack/pack-x.idx');
    rmSync(idxAt); symlinkSync(path.join(packed('idx-link-target'), '.git/objects/pack/pack-x.idx'), idxAt);
    expect(await refusal(reader(idxLink, commit.id).tree())).toMatchObject({ reason: 'unsafe-store-entry', message: 'objects/pack/pack-x.idx is a symbolic link, never followed' });
    const packLink = packed('pack-link'), packAt = path.join(packLink, '.git/objects/pack/pack-x.pack');
    rmSync(packAt); symlinkSync(path.join(packed('pack-link-target'), '.git/objects/pack/pack-x.pack'), packAt);
    expect(await refusal(reader(packLink, commit.id).readBlobs(['f']))).toMatchObject({ reason: 'unsafe-store-entry', message: 'objects/pack/pack-x.pack is a symbolic link, never followed' });
    const packGone = packed('pack-gone');
    rmSync(path.join(packGone, '.git/objects/pack/pack-x.pack'));
    expect(await refusal(reader(packGone, commit.id).readBlobs(['f']))).toEqual({ reason: 'invalid-pack-index', objectId: null, path: null, message: 'pack-x.idx has no readable pack' });
  });
});

describe('every malformed store ends in a typed refusal (finding 1)', () => {
  const { blob, tree, commit } = oneFile('abc');
  const offsetsAt = 8 + 1024 + 24;   // one SHA-1 entry: identifier and CRC before the offset table
  /** The one-entry index with its offset replaced by `small`, and `large` as its large-offset table. */
  const withOffset = (small: number, large: readonly bigint[] = []) => (idx: Buffer): Buffer => {
    const out = Buffer.from(idx.subarray(0, offsetsAt + 4));
    out.writeUInt32BE(small >>> 0, offsetsAt);
    return Buffer.concat([out, ...large.map(v => { const b = Buffer.alloc(8); b.writeBigUInt64BE(v); return b; }), Buffer.alloc(40)]);
  };
  it('an index offset outside its pack, small or large, refuses instead of throwing out of the read', async () => {
    const cases = [['past-end', withOffset(0x7fffffff)], ['inside-header', withOffset(4)], ['large-2^60', withOffset(0x80000000, [2n ** 60n])]] as const;
    for (const [name, idx] of cases) {
      const repo = handBuilt(`offset-${name}`, [tree, commit], [{ id: blob.id, entry: whole(blob.body) }], idx);
      expect(await refusal(reader(repo, commit.id).readBlobs(['f'])), name).toEqual({
        reason: 'invalid-pack-index', objectId: blob.id, path: 'f', message: `${blob.id}: pack-x.idx gives an offset outside its pack`,
      });
    }
    const past = handBuilt('offset-past-table', [tree, commit], [{ id: blob.id, entry: whole(blob.body) }], withOffset(0x80000005, [12n]));
    expect(await refusal(reader(past, commit.id).tree())).toMatchObject({ reason: 'invalid-pack-index', message: 'pack-x.idx is not a version-2 sha1 pack index: a large offset lies past the large-offset table' });
    const fine = handBuilt('offset-large-good', [tree, commit], [{ id: blob.id, entry: whole(blob.body) }], withOffset(0x80000000, [12n]));
    expect(text((await reader(fine, commit.id).readBlobs(['f']))[0]!.bytes)).toBe('abc');   // a large offset in range reads
  });
  it('an index with a bad header or truncated refuses, even beside an all-loose store', async () => {
    const junk = handBuilt('idx-junk', [blob, tree, commit]);
    writeFileSync(path.join(junk, '.git/objects/pack/pack-z.idx'), 'junk');
    expect(await refusal(reader(junk, commit.id).tree())).toMatchObject({ reason: 'invalid-pack-index', message: 'pack-z.idx is not a version-2 sha1 pack index: bad header' });
    const versionThree = handBuilt('idx-v3', [tree, commit], [{ id: blob.id, entry: whole(blob.body) }], idx => { const out = Buffer.from(idx); out.writeUInt32BE(3, 4); return out; });
    expect((await refusal(reader(versionThree, commit.id).tree())).message).toBe('pack-x.idx is not a version-2 sha1 pack index: bad header');
    const short = handBuilt('idx-short', [tree, commit], [{ id: blob.id, entry: whole(blob.body) }], idx => idx.subarray(0, 100));   // magic and version right, fan-out cut
    expect((await refusal(reader(short, commit.id).tree())).message).toBe('pack-x.idx is not a version-2 sha1 pack index: bad header');
    const truncated = handBuilt('idx-truncated', [tree, commit], [{ id: blob.id, entry: whole(blob.body) }], idx => idx.subarray(0, offsetsAt));
    expect((await refusal(reader(truncated, commit.id).tree())).message).toBe('pack-x.idx is not a version-2 sha1 pack index: truncated');
  });
  it.skipIf(process.getuid?.() === 0)('an unreadable store file refuses as store-unreadable, naming only the error code', async () => {
    const repo = handBuilt('unreadable', [blob, tree, commit]), file = looseFile(repo, blob.id);
    chmodSync(file, 0o000);
    try {
      expect(await refusal(reader(repo, commit.id).readBlobs(['f']))).toEqual({ reason: 'store-unreadable', objectId: null, path: null, message: 'the object store could not be read (EACCES)' });
    } finally { chmodSync(file, 0o644); }
  });
});

describe('tree entries are unambiguous: listTree emits only paths readBlobs resolves (finding 3)', () => {
  const one = raw('blob', Buffer.from('one')), two = raw('blob', Buffer.from('two'));
  it('names ., .., .git in any case, a repeated name and a name not UTF-8 refuse, in listTree and readBlobs', async () => {
    const cases: ReadonlyArray<readonly [string, ReadonlyArray<readonly [string, Buffer | string, string]>, string]> = [
      ['dotdot', [['100644', '..', one.id]], 'has an entry named ., .. or .git'],
      ['dot', [['100644', '.', one.id]], 'has an entry named ., .. or .git'],
      ['dotgit', [['100644', '.git', one.id]], 'has an entry named ., .. or .git'],
      ['dotgit-case', [['40000', '.GiT', one.id]], 'has an entry named ., .. or .git'],
      // the spellings git's fsck reads as .git on HFS+ and NTFS (R-POLARIS-DOSSIER-S2-READER-2 note 3)
      ['hfs-zwnj', [['40000', '.git\u200c', one.id]], 'has an entry named ., .. or .git'],
      ['hfs-zwj', [['40000', '.g\u200dit', one.id]], 'has an entry named ., .. or .git'],
      ['hfs-bom', [['40000', '\ufeff.GIT', one.id]], 'has an entry named ., .. or .git'],
      ['hfs-rlo', [['40000', '.gi\u202et', one.id]], 'has an entry named ., .. or .git'],
      ['hfs-iss', [['40000', '.git\u206a', one.id]], 'has an entry named ., .. or .git'],
      ['ntfs-short', [['40000', 'git~1', one.id]], 'has an entry named ., .. or .git'],
      ['ntfs-short-case', [['40000', 'GIT~1', one.id]], 'has an entry named ., .. or .git'],
      ['ntfs-dot', [['40000', '.git.', one.id]], 'has an entry named ., .. or .git'],
      ['ntfs-space', [['40000', '.git ', one.id]], 'has an entry named ., .. or .git'],
      ['ntfs-dots-spaces', [['40000', 'Git~1 . ', one.id]], 'has an entry named ., .. or .git'],
      ['ntfs-stream', [['40000', '.git::$INDEX_ALLOCATION', one.id]], 'has an entry named ., .. or .git'],
      ['ntfs-component', [['40000', 'a\\.git', one.id]], 'has an entry named ., .. or .git'],
      ['ntfs-component-first', [['40000', '.git\\a', one.id]], 'has an entry named ., .. or .git'],
      ['duplicate', [['100644', 'dup', one.id], ['100644', 'dup', two.id]], 'names one entry twice'],
      ['duplicate-file-and-dir', [['100644', 'dup', one.id], ['40000', 'dup', one.id]], 'names one entry twice'],
      ['not-utf8', [['100644', Buffer.from([0x61, 0xff]), one.id], ['100644', Buffer.from([0x61, 0xfe]), two.id]], 'has an entry name that is not UTF-8'],
      ['empty', [['100644', '', one.id]], 'has an entry name that is empty or holds a slash'],
    ];
    for (const [name, entries, says] of cases) {
      const tree = treeOf(entries), { repo, commit } = onTree(`name-${name}`, tree, [one, two]);
      expect(await refusal(reader(repo, commit).listTree()), name).toEqual({ reason: 'malformed-tree', objectId: tree.id, path: null, message: `tree ${tree.id} ${says}` });
      expect((await refusal(reader(repo, commit).readBlobs(['dup']))).reason, name).toBe('malformed-tree');
    }
    const near = ['aé', '.gitignore', '.git~1', 'git~2', 'git~10', 'xgit~1', '.git-x', '.gitx.', 'a\u200c.git', 'a\\b'];
    const fine = treeOf(near.map((n, k) => ['100644', n, (k % 2 === 0 ? one : two).id] as const)), { repo, commit } = onTree('name-fine', fine, [one, two]);
    expect((await reader(repo, commit).listTree()).map(e => e.path)).toEqual(near);
  });
  it('a mode git does not write refuses; the legacy group-writable file mode reads', async () => {
    for (const mode of ['100666', '040000', '120755', '0100644']) {
      const tree = treeOf([[mode, 'f', one.id]]), { repo, commit } = onTree(`mode-${mode.trim()}`, tree, [one]);
      expect(await refusal(reader(repo, commit).listTree()), mode).toMatchObject({ reason: 'malformed-tree', message: `tree ${tree.id} has an entry of a mode git does not write` });
    }
    const legacy = treeOf([['100664', 'f', one.id]]), { repo, commit } = onTree('mode-100664', legacy, [one]);
    expect(await reader(repo, commit).listTree()).toEqual([{ path: 'f', mode: '100664', id: one.id }]);
    expect(text((await reader(repo, commit).readBlobs(['f']))[0]!.bytes)).toBe('one');
  });
  it('a tree entry cut short refuses as truncated', async () => {
    const whole_ = treeOf([['100644', 'f', one.id]]), tree = raw('tree', whole_.body.subarray(0, whole_.body.length - 1));
    const { repo, commit } = onTree('truncated-entry', tree, [one]);
    expect(await refusal(reader(repo, commit).listTree())).toMatchObject({ reason: 'malformed-tree', message: `tree ${tree.id} has a truncated entry` });
  });
});

describe('each call is bounded: bytes inflated, delta depth, objects visited (finding 4)', () => {
  it('the reviewer\'s amplification shape, 100 levels over a 64 MiB base, refuses within the default per-call budget', async () => {
    const { repo, commit } = chainRepo('amp-default', 100, 64 * 2 ** 20);
    expect(await refusal(reader(repo, commit).readBlobs(['f']))).toMatchObject({ reason: 'budget-exceeded', message: expect.stringContaining('this call would inflate or produce more than 4294967296 bytes') });
  }, 60_000);
  it('the per-call byte budget is a parameter: the same chain reads under it and refuses one level over', async () => {
    const { repo, commit } = chainRepo('amp-small', 3, 2 ** 20);
    expect((await reader(repo, commit, { maxInflatedBytesPerCall: 5 * 2 ** 20 }).readBlobs(['f']))[0]!.bytes.length).toBe(2 ** 20);
    expect(await refusal(reader(repo, commit, { maxInflatedBytesPerCall: 4 * 2 ** 20 }).readBlobs(['f']))).toMatchObject({ reason: 'budget-exceeded' });
  });
  it('the budget is per call, summed over every path read', async () => {
    const a = raw('blob', Buffer.alloc(1000, 0x61)), b = raw('blob', Buffer.alloc(1000, 0x62));
    const tree = treeOf([['100644', 'a', a.id], ['100644', 'b', b.id]]), { repo, commit } = onTree('budget-sum', tree, [a, b]);
    expect(await reader(repo, commit, { maxInflatedBytesPerCall: 1500 }).readBlobs(['a'])).toHaveLength(1);
    expect(await refusal(reader(repo, commit, { maxInflatedBytesPerCall: 1500 }).readBlobs(['a', 'b']))).toMatchObject({ reason: 'budget-exceeded', objectId: b.id, path: 'b' });
  });
  it('a delta chain one past the depth cap refuses, by default (1,000) and as a parameter; at the cap it reads', async () => {
    const atCap = chainRepo('depth-1000', 1000, 1), over = chainRepo('depth-1001', 1001, 1);
    expect(text((await reader(atCap.repo, atCap.commit).readBlobs(['f']))[0]!.bytes)).toBe('a');
    expect(await refusal(reader(over.repo, over.commit).readBlobs(['f']))).toMatchObject({ reason: 'budget-exceeded', message: expect.stringContaining('has a delta chain longer than 1000') });
    const five = chainRepo('depth-5', 5, 1);
    expect(await reader(five.repo, five.commit, { maxDeltaChainDepth: 5 }).readBlobs(['f'])).toHaveLength(1);
    expect((await refusal(reader(five.repo, five.commit, { maxDeltaChainDepth: 4 }).readBlobs(['f']))).message).toContain('has a delta chain longer than 4');
  });
  it('a reference delta naming itself refuses at the depth cap, quickly', async () => {
    const { blob, tree, commit } = oneFile('x'), d = Buffer.from([1, 1, 0x90, 1]);
    const repo = handBuilt('ref-cycle', [tree, commit], [{ id: blob.id, entry: Buffer.concat([entryHead(7, d.length), Buffer.from(blob.id, 'hex'), deflateSync(d)]) }]);
    expect(await refusal(reader(repo, commit.id).readBlobs(['f']))).toMatchObject({ reason: 'budget-exceeded', objectId: blob.id });
  });
  it('a tree DAG that re-lists one subtree many times refuses past the objects-per-call cap', async () => {
    const leaf = raw('blob', Buffer.from('leaf'));
    const names = Array.from({ length: 16 }, (_, k) => `n${k.toString(16)}`);
    let tree = treeOf(names.map(n => ['100644', n, leaf.id] as const));
    const trees = [tree];
    for (let level = 0; level < 3; level += 1) { const below = tree; tree = treeOf(names.map(n => ['40000', n, below.id] as const)); trees.push(tree); }
    const { repo, commit } = onTree('dag', tree, [leaf, ...trees.slice(0, -1)]);
    expect(await reader(repo, commit).listTree()).toHaveLength(16 ** 4);   // 65,536 paths from five objects, under the default cap
    expect(await refusal(reader(repo, commit, { maxObjectsPerCall: 10_000 }).listTree())).toMatchObject({ reason: 'budget-exceeded', message: 'this call reads or lists more than 10000 objects and entries' });
  });
  it('an object larger than maxObjectBytes refuses: loose stored, loose inflated, packed, and delta output', async () => {
    let seed = Buffer.from('seed');
    const noise = Buffer.concat(Array.from({ length: 64 }, () => (seed = createHash('sha256').update(seed).digest())));   // 2,048 incompressible bytes
    const big = oneFile(noise), loose = handBuilt('loose-stored-big', [big.blob, big.tree, big.commit]);
    expect(await refusal(reader(loose, big.commit.id, { maxObjectBytes: 512 }).readBlobs(['f']))).toMatchObject({ reason: 'corrupt-object', message: `loose object ${big.blob.id} is larger stored than any object the reader holds` });
    const runs = oneFile(Buffer.alloc(4096, 0x61)), inflating = handBuilt('loose-inflated-big', [runs.blob, runs.tree, runs.commit]);
    expect(await refusal(reader(inflating, runs.commit.id, { maxObjectBytes: 512 }).readBlobs(['f']))).toMatchObject({ reason: 'corrupt-object', message: `loose object ${runs.blob.id} does not inflate` });
    expect(await reader(inflating, runs.commit.id, { maxObjectBytes: 4096 }).readBlobs(['f'])).toHaveLength(1);
    const packed = handBuilt('packed-big', [runs.tree, runs.commit], [{ id: runs.blob.id, entry: whole(runs.blob.body) }]);
    expect(await refusal(reader(packed, runs.commit.id, { maxObjectBytes: 4095 }).readBlobs(['f']))).toMatchObject({ reason: 'corrupt-object', message: `${runs.blob.id}: pack entry declares 4096 bytes` });
    const { repo, commit } = deltaRepo('delta-big');
    expect(await refusal(reader(repo, commit, { maxObjectBytes: 11 }).readBlobs(['f']))).toMatchObject({ reason: 'corrupt-object', message: '1ccd73aeacfd33cab1d9e1091d21860c1922ef53: delta declares 12 bytes' });
  });
});

describe('pack and delta malformations, each predicate (finding 5)', () => {
  const T1 = '1ccd73aeacfd33cab1d9e1091d21860c1922ef53';   // the delta fixture's target identifier
  it('a delta with a truncated header, an out-of-range copy or insert, or opcode 0 refuses', async () => {
    const cases: ReadonlyArray<readonly [string, { source?: number; target?: number; ops?: readonly number[] }, string]> = [
      ['copy-past-base', { ops: [0x91, 5, 10] }, 'delta copy out of range'],          // copy 10 from 5 of a 10-byte base
      ['copy-past-target', { target: 9, ops: [0x90, 10] }, 'delta copy out of range'],  // copy 10 into 9
      ['copy-operand-missing', { ops: [0x90] }, 'delta copy out of range'],             // copy whose size byte is absent
      ['insert-past-delta', { target: 15, ops: [0x90, 10, 5, 0x21, 0x21] }, 'delta insert out of range'],   // 5 to insert, 2 left
      ['insert-past-target', { target: 11, ops: [0x90, 10, 2, 0x21, 0x21] }, 'delta insert out of range'],
      ['opcode-0', { ops: [0x90, 10, 0, 2, 0x21, 0x21] }, 'delta opcode 0 is reserved'],
    ];
    for (const [name, over, says] of cases) {
      const { repo, commit } = deltaRepo(`delta-${name}`, over);
      expect(await refusal(reader(repo, commit).readBlobs(['f'])), name).toMatchObject({ reason: 'corrupt-object', message: `${T1}: ${says}` });
    }
  });
  it('a delta whose size header runs off its end refuses as truncated', async () => {
    const base = raw('blob', Buffer.from('abcdefghij')), { blob, tree, commit } = oneFile('abcdefghij!!');
    const d = Buffer.from([10, 0x8c]);   // the target size's continuation bit set, and nothing after it
    const deltaAt = 12 + whole(base.body).length;
    const repo = handBuilt('delta-header', [tree, commit], [{ id: base.id, entry: whole(base.body) }, { id: blob.id, entry: Buffer.concat([entryHead(6, d.length), ofsBack(deltaAt - 12), deflateSync(d)]) }]);
    expect(await refusal(reader(repo, commit.id).readBlobs(['f']))).toMatchObject({ reason: 'corrupt-object', message: `${blob.id}: truncated delta header` });
  });
  it('a pack entry with an endless size header, an endless base offset or an unknown type refuses', async () => {
    const { blob, tree, commit } = oneFile('abc');
    const cases = [
      ['size-header', Buffer.concat([Buffer.from([0xbf]), Buffer.alloc(60, 0xff)]), 'pack entry header too long in pack-x'],
      ['offset-header', Buffer.concat([entryHead(6, 4), Buffer.alloc(60, 0xff)]), 'delta offset too long in pack-x'],
      ['type-5', whole(blob.body, 5), 'pack entry of unknown type 5 in pack-x'],
      ['type-0', whole(blob.body, 0), 'pack entry of unknown type 0 in pack-x'],
    ] as const;
    for (const [name, entry, says] of cases) {
      const repo = handBuilt(`entry-${name}`, [tree, commit], [{ id: blob.id, entry: Buffer.concat([entry, Buffer.alloc(64)]) }]);
      expect(await refusal(reader(repo, commit.id).readBlobs(['f'])), name).toMatchObject({ reason: 'corrupt-object', message: `${blob.id}: ${says}` });
    }
  });
  it('a reference delta reads over a loose base and refuses when its base is absent', async () => {
    const base = raw('blob', Buffer.from('abcdefghij')), { blob, tree, commit } = oneFile('abcdefghij!!');
    const d = Buffer.from([10, 12, 0x90, 10, 2, 0x21, 0x21]);
    const entry = Buffer.concat([entryHead(7, d.length), Buffer.from(base.id, 'hex'), deflateSync(d)]);
    const withBase = handBuilt('ref-loose-base', [base, tree, commit], [{ id: blob.id, entry }]);
    expect(text((await reader(withBase, commit.id).readBlobs(['f']))[0]!.bytes)).toBe('abcdefghij!!');
    const without = handBuilt('ref-no-base', [tree, commit], [{ id: blob.id, entry }]);
    expect(await refusal(reader(without, commit.id).readBlobs(['f']))).toEqual({ reason: 'object-missing', objectId: blob.id, path: 'f', message: `${blob.id}: delta base ${base.id} is not in this clone` });
  });
  it('a packed substitution refuses: an index pointing at another object\'s entry, a reference delta over another base', async () => {
    const want = oneFile('the consented bytes'), other = raw('blob', Buffer.from('other bytes'));
    const swapped = handBuilt('swap', [want.tree, want.commit], [{ id: other.id, entry: whole(other.body) }, { id: want.blob.id, entry: Buffer.alloc(0), offset: 12 }]);
    expect(await refusal(reader(swapped, want.commit.id).readBlobs(['f']))).toEqual({ reason: 'identifier-mismatch', objectId: want.blob.id, path: 'f', message: `the object read as ${want.blob.id} hashes to another identifier` });
    const d = Buffer.from([...varint(other.body.length), ...varint(other.body.length), 0x90, other.body.length]);
    const rebased = handBuilt('ref-swap', [want.tree, want.commit, other], [{ id: want.blob.id, entry: Buffer.concat([entryHead(7, d.length), Buffer.from(other.id, 'hex'), deflateSync(d)]) }]);
    expect((await refusal(reader(rebased, want.commit.id).readBlobs(['f']))).reason).toBe('identifier-mismatch');
  });
});

/** A zlib stream of `body` (at most 65,535 bytes) that inflates exactly, padded with `blocks` empty non-final stored blocks of five
 * bytes each: 11 + 5 × `blocks` + `body.length` bytes in all (the reviewer's padding construction). */
function padded(body: Buffer, blocks: number): Buffer {
  const pad = Buffer.alloc(5 * blocks);
  for (let k = 0; k < blocks; k += 1) { pad[5 * k + 3] = 0xff; pad[5 * k + 4] = 0xff; }
  let a = 1, b = 0;
  for (const byte of body) { a = (a + byte) % 65521; b = (b + a) % 65521; }
  const last = Buffer.from([1, body.length & 255, body.length >> 8, ~body.length & 255, (~body.length >> 8) & 255]), adler = Buffer.alloc(4);
  adler.writeUInt32BE(((b << 16) | a) >>> 0);
  return Buffer.concat([Buffer.from([0x78, 0x01]), pad, last, body, adler]);
}

describe('stored bytes are bounded and charged: padding buys no work (R-POLARIS-DOSSIER-S2-READER-2 finding 1)', () => {
  const { blob, tree, commit } = oneFile('abc');
  // Exactly at the bound: 11 + 5 × 203 + n = storedBound(n) = n + ⌊n/8⌋ + 1024 holds for n from 16 to 23.
  it('a pack entry stored in exactly the bound git writes for its size (1,042 bytes for 16) reads; one block more refuses', async () => {
    const sixteen = oneFile('abcdefghijklmnop');
    const at = (blocks: number): string => handBuilt(`pad-pack-${blocks}`, [sixteen.tree, sixteen.commit], [{ id: sixteen.blob.id, entry: Buffer.concat([entryHead(3, 16), padded(sixteen.blob.body, blocks)]) }]);
    expect(padded(sixteen.blob.body, 203)).toHaveLength(1042);
    expect(text((await reader(at(203), sixteen.commit.id).readBlobs(['f']))[0]!.bytes)).toBe('abcdefghijklmnop');
    expect(await refusal(reader(at(204), sixteen.commit.id).readBlobs(['f']))).toEqual({
      reason: 'corrupt-object', objectId: sixteen.blob.id, path: 'f', message: `${sixteen.blob.id}: pack entry does not inflate within the 1042 stored bytes git writes for its size`,
    });
  });
  it('a loose object stored in exactly the bound for its inflated size (1,046 bytes for 20) reads; one block more refuses', async () => {
    const twelve = oneFile('x'.repeat(12)), inflated = Buffer.from(`blob 12\0${'x'.repeat(12)}`, 'latin1');   // 20 inflated
    const at = (blocks: number): string => {
      const repo = handBuilt(`pad-loose-${blocks}`, [twelve.blob, twelve.tree, twelve.commit]);
      overwrite(looseFile(repo, twelve.blob.id), padded(inflated, blocks));
      return repo;
    };
    expect(padded(inflated, 203)).toHaveLength(1046);
    expect(text((await reader(at(203), twelve.commit.id).readBlobs(['f']))[0]!.bytes)).toBe('x'.repeat(12));
    expect(await refusal(reader(at(204), twelve.commit.id).readBlobs(['f']))).toEqual({
      reason: 'corrupt-object', objectId: twelve.blob.id, path: 'f', message: `loose object ${twelve.blob.id} is stored in more bytes than git writes for its size`,
    });
  });
  it('a loose object with bytes after its zlib stream refuses', async () => {
    const repo = handBuilt('loose-trailing', [blob, tree, commit]), file = looseFile(repo, blob.id);
    overwrite(file, Buffer.concat([readFileSync(file), Buffer.from('x')]));
    expect(await refusal(reader(repo, commit.id).readBlobs(['f']))).toEqual({
      reason: 'corrupt-object', objectId: blob.id, path: 'f', message: `loose object ${blob.id} has bytes after its zlib stream`,
    });
  });
  it('the reviewer\'s padded pack base: 50 offset deltas over a base padded by 4 MiB refuse at once, under any budget', async () => {
    const base = raw('blob', Buffer.from('abcdefghij')), targets = Array.from({ length: 50 }, (_, k) => raw('blob', Buffer.from(`abcdefghij${k}`)));
    const entries = [Buffer.concat([entryHead(3, 10), padded(base.body, 838_861)])], rows: PackRow[] = [{ id: base.id, entry: entries[0]! }];
    let at = 12 + entries[0]!.length;
    for (const t of targets) {
      const add = Buffer.from(String(targets.indexOf(t))), d = Buffer.from([10, 10 + add.length, 0x90, 10, add.length, ...add]);
      const entry = Buffer.concat([entryHead(6, d.length), ofsBack(at - 12), deflateSync(d)]);
      rows.push({ id: t.id, entry }); at += entry.length;
    }
    const top = treeOf(targets.map((t, k) => ['100644', `t${k}`, t.id] as const)), c = raw('commit', Buffer.from(`tree ${top.id}\n\nm\n`));
    const repo = handBuilt('pad-pack-base', [top, c], rows), paths = targets.map((_, k) => `t${k}`);
    for (const limits of [{}, { maxInflatedBytesPerCall: 2 ** 20 }]) {
      expect(await refusal(reader(repo, c.id, limits).readBlobs(paths))).toMatchObject({
        reason: 'corrupt-object', objectId: targets[0]!.id, path: 't0', message: `${targets[0]!.id}: pack entry does not inflate within the 1035 stored bytes git writes for its size`,
      });
    }
  });
  it('the reviewer\'s padded loose base: reference deltas over a loose base padded by 4 MiB refuse at once', async () => {
    const base = raw('blob', Buffer.from('abcdefghij')), { blob: target, tree: t, commit: c } = oneFile('abcdefghij!!');
    const d = Buffer.from([10, 12, 0x90, 10, 2, 0x21, 0x21]);
    const repo = handBuilt('pad-loose-base', [t, c], [{ id: target.id, entry: Buffer.concat([entryHead(7, d.length), Buffer.from(base.id, 'hex'), deflateSync(d)]) }]);
    const file = looseFile(repo, base.id);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, padded(Buffer.from('blob 10\0abcdefghij', 'latin1'), 838_861));
    expect(await refusal(reader(repo, c.id).readBlobs(['f']))).toEqual({
      reason: 'corrupt-object', objectId: base.id, path: 'f', message: `loose object ${base.id} is stored in more bytes than git writes for its size`,
    });
    expect(await refusal(reader(repo, c.id, { maxInflatedBytesPerCall: 2 ** 20 }).readBlobs(['f']))).toMatchObject({ reason: 'budget-exceeded', objectId: base.id });
  });
  it('the stored bytes inflated are charged to the call, loose and packed, beside the bytes they inflate to', async () => {
    let seed = Buffer.from('seed');
    const noise = oneFile(Buffer.concat(Array.from({ length: 64 }, () => (seed = createHash('sha256').update(seed).digest()))));   // 2,048 incompressible bytes
    const loose = handBuilt('charge-loose', [noise.blob, noise.tree, noise.commit]);
    const packed = handBuilt('charge-packed', [noise.tree, noise.commit], [{ id: noise.blob.id, entry: whole(noise.blob.body) }]);
    for (const repo of [loose, packed]) {
      expect(await reader(repo, noise.commit.id, { maxInflatedBytesPerCall: 5000 }).readBlobs(['f']), repo).toHaveLength(1);   // about 4,300 with the stored bytes
      expect(await refusal(reader(repo, noise.commit.id, { maxInflatedBytesPerCall: 3000 }).readBlobs(['f'])), repo).toEqual({   // about 2,200 without
        reason: 'budget-exceeded', objectId: noise.blob.id, path: 'f', message: `${noise.blob.id}: this call would inflate or produce more than 3000 bytes`,
      });
    }
  });
});

describe('a large valid store lists, and a reader defect is not blamed on the store (R-POLARIS-DOSSIER-S2-READER-2 finding 2, note 6)', () => {
  it('a subdirectory of 200,000 entries lists: a subtree is never spread into call arguments', async () => {
    const leaf = raw('blob', Buffer.from('leaf')), leafId = Buffer.from(leaf.id, 'hex');
    const wide = raw('tree', Buffer.concat(Array.from({ length: 200_000 }, (_, k) => Buffer.concat([Buffer.from(`100644 f${k}\0`), leafId]))));
    const root = treeOf([['40000', 'd', wide.id]]), { repo, commit } = onTree('wide-nested', root, [leaf, wide]);
    const listed = await reader(repo, commit).listTree();
    expect(listed).toHaveLength(200_000);
    expect([listed[0], listed[199_999]]).toEqual([{ path: 'd/f0', mode: '100644', id: leaf.id }, { path: 'd/f199999', mode: '100644', id: leaf.id }]);
  }, 60_000);
  it('an error that is not a filesystem error refuses as reader-fault, never store-unreadable', async () => {
    const r = openPinnedObjectReader({ gitDir: gitDir(L), revision: C2, maxObjectBytes: 1n as unknown as number });   // a size the reader cannot do arithmetic on
    expect(await refusal(r.tree())).toEqual({ reason: 'reader-fault', objectId: null, path: null, message: 'the reader failed (TypeError), a defect of the reader and not of the store' });
  });
});

describe('paths are at most git\'s core.maxTreeDepth (4,096) segments deep (R-POLARIS-DOSSIER-S2-READER-3 note 1)', () => {
  /** A file `f` under `levels` nested trees each named `a`: one path of `levels + 1` segments. `trees[0]` holds `f`. */
  const chain = (name: string, levels: number): { repo: string; commit: string; path: string; trees: ReturnType<typeof raw>[]; leaf: ReturnType<typeof raw> } => {
    const leaf = raw('blob', Buffer.from('deep')), trees = [treeOf([['100644', 'f', leaf.id]])];
    for (let k = 0; k < levels; k += 1) trees.push(treeOf([['40000', 'a', trees[trees.length - 1]!.id]]));
    const { repo, commit } = onTree(name, trees[trees.length - 1]!, [leaf, ...trees.slice(0, -1)]);
    return { repo, commit, path: `${'a/'.repeat(levels)}f`, trees, leaf };
  };
  it('a path of 4,096 segments reads and lists; a missing path below names its full prefix', async () => {
    const { repo, commit, path: deep, leaf } = chain('depth-4096', 4095);
    expect(deep.split('/')).toHaveLength(4096);
    expect(text((await reader(repo, commit).readBlobs([deep]))[0]!.bytes)).toBe('deep');
    expect(await reader(repo, commit).listTree()).toEqual([{ path: deep, mode: '100644', id: leaf.id }]);
    expect(await refusal(reader(repo, commit).readBlobs(['a/a/x']))).toMatchObject({ reason: 'path-not-found', message: `a/a/x is not in the tree at ${commit}` });
  }, 240_000);
  it('a path of 4,097 segments refuses before any read, and listTree refuses the tree nested past the cap', async () => {
    const { repo, commit, path: deep, trees } = chain('depth-4097', 4096);
    expect(await refusal(reader(repo, commit).readBlobs([deep]))).toEqual({
      reason: 'malformed-path', objectId: null, path: deep, message: 'a path of 4097 segments is deeper than git\'s core.maxTreeDepth (4096)',
    });
    expect(await refusal(reader(repo, commit).listTree())).toEqual({
      reason: 'malformed-tree', objectId: trees[1]!.id, path: null, message: `tree ${trees[1]!.id} nests trees deeper than git's core.maxTreeDepth (4096)`,
    });
  }, 240_000);
});
