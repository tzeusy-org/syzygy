import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { deflateSync } from 'node:zlib';
import ts from 'typescript';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { decodeGitMemoryPack, validateGitMemoryClosure, type DecodedGitMemoryPack, type GitMemoryFormat,
  type GitMemoryObjectType, type GitMemoryPackLimits } from './git-memory-pack.js';

const temporary: string[] = [];
afterEach(async () => { for (const directory of temporary.splice(0)) await rm(directory, { recursive: true, force: true }); });
type Raw = { type: GitMemoryObjectType; body: Buffer; oid: string };
function raw(type: GitMemoryObjectType, body: string | Uint8Array, format: GitMemoryFormat = 'sha1'): Raw {
  const bytes = Buffer.from(body); return { type, body: bytes, oid: createHash(format).update(`${type} ${bytes.length}\0`).update(bytes).digest('hex') };
}
function header(kind: number, size: number): Buffer {
  const parts = [(kind << 4) | (size & 15)]; size = Math.floor(size / 16);
  while (size > 0) { parts[parts.length - 1]! |= 128; parts.push(size & 127); size = Math.floor(size / 128); }
  return Buffer.from(parts);
}
const kind = { commit: 1, tree: 2, blob: 3 } as const;
const entry = (object: Raw): Buffer => Buffer.concat([header(kind[object.type], object.body.length), deflateSync(object.body)]);
function finish(prefix: Uint8Array, format: GitMemoryFormat = 'sha1'): Buffer { return Buffer.concat([prefix, createHash(format).update(prefix).digest()]); }
function wire(entries: readonly Buffer[], format: GitMemoryFormat = 'sha1', count = entries.length): Buffer {
  const initial = Buffer.alloc(12); initial.write('PACK'); initial.writeUInt32BE(2, 4); initial.writeUInt32BE(count, 8);
  return finish(Buffer.concat([initial, ...entries]), format);
}
const packed = (objects: readonly Raw[], format: GitMemoryFormat = 'sha1'): Buffer => wire(objects.map(entry), format);
function decode(bytes: Uint8Array, format: GitMemoryFormat = 'sha1', lower?: Partial<GitMemoryPackLimits>): DecodedGitMemoryPack {
  const result = decodeGitMemoryPack({ pack: bytes, objectFormat: format, ...(lower === undefined ? {} : { limits: lower }) });
  expect(result.ok).toBe(true); if (!result.ok) throw new Error(result.code); return result.pack;
}
function tree(entries: readonly { mode: string; name: string | Uint8Array; object: Raw }[], format: GitMemoryFormat = 'sha1'): Raw {
  return raw('tree', Buffer.concat(entries.map(item => Buffer.concat([Buffer.from(`${item.mode} `), typeof item.name === 'string' ? Buffer.from(item.name) : item.name,
    Buffer.from([0]), Buffer.from(item.object.oid, 'hex')]))), format);
}
function commit(root: Raw, format: GitMemoryFormat = 'sha1', extra = '', message = 'Own synthetic message\n'): Raw {
  return raw('commit', `tree ${root.oid}\nauthor Synthetic Fixture <fixture@example.invalid> 946684800 +0000\ncommitter Synthetic Fixture <fixture@example.invalid> 946684800 +0000${extra}\n\n${message}`, format);
}
function closure(objects: readonly Raw[], pin: Raw, format: GitMemoryFormat = 'sha1', lower?: Partial<GitMemoryPackLimits>) {
  return validateGitMemoryClosure({ pack: decode(packed(objects, format), format), selectedCommit: pin.oid, shallow: [pin.oid], ...(lower === undefined ? {} : { limits: lower }) });
}
async function gitFixture(format: GitMemoryFormat, similar = false) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'memory-pack-')); temporary.push(root);
  const home = path.join(root, 'home'), repo = path.join(root, 'own.git'); await mkdir(home);
  const env = { PATH: '/usr/bin:/bin', HOME: home, XDG_CONFIG_HOME: path.join(home, 'xdg'), LANG: 'C', LC_ALL: 'C', GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null', GIT_TERMINAL_PROMPT: '0', GIT_AUTHOR_NAME: 'Synthetic Fixture', GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
    GIT_COMMITTER_NAME: 'Synthetic Fixture', GIT_COMMITTER_EMAIL: 'fixture@example.invalid', GIT_AUTHOR_DATE: '2000-01-01T00:00:00Z', GIT_COMMITTER_DATE: '2000-01-01T00:00:00Z' };
  const git = (args: readonly string[], input?: Uint8Array | string): Buffer => execFileSync('/usr/bin/git', [...args], { env, input, timeout: 5000, maxBuffer: 16_777_216 });
  git(['init', '--bare', '--initial-branch=fixture', '--template=', `--object-format=${format}`, repo]);
  const run = (args: readonly string[], input?: Uint8Array | string) => git([`--git-dir=${repo}`, ...args], input);
  const put = (type: GitMemoryObjectType, body: Uint8Array | string): Raw => {
    const oid = run(['hash-object', '-w', '--stdin', '-t', type], body).toString('utf8').trim(); return { oid, type, body: Buffer.from(body) };
  };
  const text = Array.from({ length: 500 }, (_, index) => `Own fixture line ${index}: shared repeated content.\n`).join('');
  const first = put('blob', similar ? text : 'hello\n'); const second = put('blob', similar ? text.replace('line 250:', 'line changed:') : 'Own executable fixture.\n');
  const subtree = put('tree', tree([{ mode: '100644', name: 'README.md', object: first }], format).body);
  const rootTree = put('tree', tree([{ mode: '40000', name: 'a', object: subtree }, { mode: '40000', name: 'b', object: subtree },
    { mode: '100644', name: 'regular.md', object: first }, { mode: '100755', name: 'script.ts', object: second }], format).body);
  const parentId = run(['commit-tree', rootTree.oid], 'Own parent omitted from depth-one pack.\n').toString('utf8').trim();
  const pin = run(['commit-tree', rootTree.oid, '-p', parentId], 'Own selected tip.\n').toString('utf8').trim();
  const tip = { type: 'commit' as const, oid: pin, body: run(['cat-file', 'commit', pin]) };
  const objects = [tip, rootTree, subtree, first, second];
  const pack = (offset = false) => run(['pack-objects', '--stdout', '--no-reuse-delta', '--no-reuse-object', `--window=${similar ? 50 : 0}`, '--depth=20', ...(offset ? ['--delta-base-offset'] : [])], objects.map(object => object.oid).join('\n') + '\n');
  return { format, objects, rootTree, parentId, first, second, tip, pin, pack };
}
function refDelta(base: string, instructions: Uint8Array): Buffer { return Buffer.concat([header(7, instructions.length), Buffer.from(base, 'hex'), deflateSync(instructions)]); }
function offset(back: number): Buffer {
  const parts = [back & 127]; while ((back = Math.floor(back / 128)) > 0) { back--; parts.unshift(128 | (back & 127)); } return Buffer.from(parts);
}

describe('bounded in-memory Git pack verification', () => {
  it('keeps the pure decoder outside filesystem, transport, process and dynamic-loader capabilities', async () => {
    const source = await readFile(new URL('./git-memory-pack.ts', import.meta.url), 'utf8');
    const file = ts.createSourceFile('git-memory-pack.ts', source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
    const imports: string[] = [], forbidden: string[] = [];
    const visit = (node: ts.Node): void => {
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
        if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) imports.push(node.moduleSpecifier.text);
      }
      if (ts.isIdentifier(node) && ['require', 'process', 'globalThis', 'global', 'eval', 'Function'].includes(node.text)) forbidden.push(node.text);
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) forbidden.push('dynamic-import');
      if (ts.isPropertyAccessExpression(node) && node.name.text === 'constructor') forbidden.push('dynamic-constructor');
      ts.forEachChild(node, visit);
    };
    visit(file);
    expect(imports.sort()).toEqual(['node:crypto', 'node:zlib']); expect(forbidden).toEqual([]);
  });

  it('agrees with real SHA-1/SHA-256 Git objects and retains every file and subtree alias without parent bodies', async () => {
    for (const format of ['sha1', 'sha256'] as const) {
      const f = await gitFixture(format); const pack = decode(f.pack(), format);
      expect(pack.objects.map(object => object.oid).sort()).toEqual(f.objects.map(object => object.oid).sort());
      for (const object of pack.objects) expect(Buffer.from(object.body)).toEqual(f.objects.find(expected => expected.oid === object.oid)!.body);
      if (format === 'sha1') expect(f.first.oid).toBe('ce013625030ba8dba906f756967f9e9ca394464a');
      const checked = validateGitMemoryClosure({ pack, selectedCommit: f.pin, shallow: [f.pin] }); expect(checked.ok).toBe(true);
      if (!checked.ok) throw new Error(checked.code);
      expect(checked.closure.parents).toEqual([f.parentId]);
      expect(checked.closure.trees).toEqual([{ path: '', oid: f.rootTree.oid }, { path: 'a', oid: f.objects[2]!.oid }, { path: 'b', oid: f.objects[2]!.oid }]);
      expect(checked.closure.paths).toEqual([{ path: 'a/README.md', mode: '100644', oid: f.first.oid }, { path: 'b/README.md', mode: '100644', oid: f.first.oid },
        { path: 'regular.md', mode: '100644', oid: f.first.oid }, { path: 'script.ts', mode: '100755', oid: f.second.oid }]);
      expect(checked.closure.objects.some(object => object.oid === f.parentId)).toBe(false);
      const object = pack.objects[0]!, original = object.body; original.fill(0);
      expect(Buffer.from(object.body)).toEqual(f.objects.find(expected => expected.oid === object.oid)!.body);
      expect(Object.isFrozen(object)).toBe(true); expect(Object.isFrozen(checked.closure.paths[0])).toBe(true);
    }
  });

  it('resolves actual Git delta packs in both formats plus a forward internal REF and exact OFS base', async () => {
    for (const format of ['sha1', 'sha256'] as const) {
      const f = await gitFixture(format, true);
      for (const ofs of [false, true]) {
        const pack = decode(f.pack(ofs), format); expect(pack.deltaCount).toBeGreaterThan(0);
        expect(pack.objects.map(object => object.oid).sort()).toEqual(f.objects.map(object => object.oid).sort());
        expect(validateGitMemoryClosure({ pack, selectedCommit: f.pin, shallow: [f.pin] }).ok).toBe(true);
      }
      const base = raw('blob', 'base\n', format), target = raw('blob', 'base extended\n', format);
      const instructions = Buffer.concat([Buffer.from([5, 14, 0x90, 4, 10]), Buffer.from(' extended\n')]);
      const forward = decode(wire([refDelta(base.oid, instructions), entry(base)], format), format);
      expect(forward.objects[0]!.oid).toBe(target.oid); expect(Buffer.from(forward.objects[0]!.body).toString('utf8')).toBe('base extended\n');
      const baseEntry = entry(base), ofsEntry = Buffer.concat([header(6, instructions.length), offset(baseEntry.length), deflateSync(instructions)]);
      expect(decode(wire([baseEntry, ofsEntry], format), format).objects[1]!.oid).toBe(target.oid);
    }
  });

  it('handles the special 65536-byte delta copy size and rejects mixed-format identities', () => {
    const base = raw('blob', Buffer.alloc(65_537, 65)), target = raw('blob', Buffer.alloc(65_536, 65));
    const instructions = Buffer.from([0x81, 0x80, 4, 0x80, 0x80, 4, 0x80]);
    const result = decode(wire([entry(base), refDelta(base.oid, instructions)]));
    expect(result.objects[1]!.oid).toBe(target.oid); expect(result.objects[1]!.size).toBe(65_536);
    const empty = raw('tree', ''), tip = commit(empty), pack = decode(packed([tip, empty]));
    expect(validateGitMemoryClosure({ pack, selectedCommit: tip.oid + '0'.repeat(24), shallow: [tip.oid] })).toMatchObject({ ok: false, code: 'pin-mismatch' });
  });

  it('rejects trailer, version, exact count/end, high-bit signature, duplicate, unsupported type and incomplete/lying streams safely', () => {
    const blob = raw('blob', 'Own bytes.'), good = packed([blob]);
    const badTrailer = Buffer.from(good); badTrailer[badTrailer.length - 1]! ^= 1;
    const high = Buffer.from(good.subarray(0, -20)); high[0]! |= 128;
    const version = Buffer.from(good.subarray(0, -20)); version.writeUInt32BE(3, 4);
    const cases: [Buffer, string][] = [[badTrailer, 'pack-trailer'], [finish(high), 'pack-framing'], [finish(version), 'pack-framing'],
      [wire([entry(blob)], 'sha1', 0), 'pack-framing'], [wire([entry(blob)], 'sha1', 2), 'pack-framing'], [wire([entry(blob), entry(raw('blob', 'extra'))], 'sha1', 1), 'pack-framing'],
      [finish(Buffer.concat([good.subarray(0, -20), Buffer.from([0])])), 'pack-framing'], [packed([blob, blob]), 'duplicate-object'],
      [wire([Buffer.concat([header(4, 3), deflateSync('tag')])]), 'object-type'],
      [wire([Buffer.concat([header(3, blob.body.length + 1), deflateSync(blob.body)])]), 'object-stream'],
      [wire([Buffer.concat([header(3, blob.body.length), deflateSync(blob.body).subarray(0, -1)])]), 'object-stream']];
    for (const [bytes, code] of cases) {
      const refused = decodeGitMemoryPack({ pack: bytes, objectFormat: 'sha1' }); expect(refused).toMatchObject({ ok: false, code });
      expect(JSON.stringify(refused)).not.toContain('Own bytes.'); expect(JSON.stringify(refused)).not.toContain(blob.oid);
    }
    expect(decodeGitMemoryPack({ pack: good, objectFormat: 'sha256' })).toMatchObject({ ok: false, code: 'pack-trailer' });
  });

  it('rejects missing/thin/self-dependent delta bases and malformed copy/literal/offset/size instructions', () => {
    const base = raw('blob', 'a');
    expect(decodeGitMemoryPack({ pack: wire([refDelta(base.oid, Buffer.from([1, 1, 0x90, 1]))]), objectFormat: 'sha1' })).toMatchObject({ ok: false, code: 'delta-unresolved' });
    for (const instructions of [ [2, 1, 1, 120], [1, 1, 0], [1, 0, 0], [1, 1, 0x91, 2, 1], [1, 2, 0x90, 2], [1, 1, 2, 120], [1, 2, 1, 120], [128, 0, 1, 1, 120], [1, 1, 0x91] ]) {
      expect(decodeGitMemoryPack({ pack: wire([entry(base), refDelta(base.oid, Buffer.from(instructions))]), objectFormat: 'sha1' })).toMatchObject({ ok: false, code: 'delta-invalid' });
    }
    expect(decodeGitMemoryPack({ pack: wire([Buffer.concat([header(6, 1), Buffer.from([1]), deflateSync(Buffer.from([0]))])]), objectFormat: 'sha1' }))
      .toMatchObject({ ok: false, code: 'delta-invalid' });
  });

  it('enforces byte/object/delta/memory/work/deadline bounds before expanding or returning objects', () => {
    const a = raw('blob', 'a'), b = raw('blob', 'ab'); const plain = packed([raw('blob', 'bounded bytes')]);
    for (const lower of [{ maxPackBytes: 1 }, { maxObjectBytes: 1 }, { maxInflatedBytes: 1 }, { maxResolvedBytes: 1 }, { maxWorkingBytes: 1 }, { maxWorkBytes: 1 }])
      expect(decodeGitMemoryPack({ pack: plain, objectFormat: 'sha1', limits: lower })).toMatchObject({ ok: false, code: 'budget-exceeded' });
    expect(decodeGitMemoryPack({ pack: packed([a, b]), objectFormat: 'sha1', limits: { maxObjects: 1 } })).toMatchObject({ ok: false, code: 'budget-exceeded' });
    const chain = wire([entry(a), refDelta(a.oid, Buffer.from([1, 2, 0x90, 1, 1, 98])), refDelta(b.oid, Buffer.from([2, 3, 0x90, 2, 1, 99]))]);
    expect(decodeGitMemoryPack({ pack: chain, objectFormat: 'sha1', limits: { maxDeltaDepth: 1 } })).toMatchObject({ ok: false, code: 'budget-exceeded' });
    for (const value of [0, -1, Infinity, NaN, 1.5, 999_999_999]) expect(decodeGitMemoryPack({ pack: plain, objectFormat: 'sha1', limits: { maxObjects: value } })).toMatchObject({ ok: false, code: 'invalid-limits' });
    const clock = vi.spyOn(performance, 'now'); let now = 0; clock.mockImplementation(() => now += 10);
    try { expect(decodeGitMemoryPack({ pack: plain, objectFormat: 'sha1', limits: { maxMilliseconds: 1 } })).toMatchObject({ ok: false, code: 'deadline-exceeded' }); }
    finally { clock.mockRestore(); }
  });

  it('requires genuine bundles, exact selected commit/shallow boundary, and no extra, missing, parent or wrongly typed closure', async () => {
    const f = await gitFixture('sha1'), pack = decode(f.pack());
    expect(validateGitMemoryClosure({ pack: { ...pack }, selectedCommit: f.pin, shallow: [f.pin] })).toMatchObject({ ok: false, code: 'invalid-input' });
    expect(validateGitMemoryClosure({ pack, selectedCommit: f.first.oid, shallow: [f.first.oid] })).toMatchObject({ ok: false, code: 'pin-mismatch' });
    for (const shallow of [[], [f.pin, f.pin], [f.parentId]]) expect(validateGitMemoryClosure({ pack, selectedCommit: f.pin, shallow })).toMatchObject({ ok: false, code: 'shallow-mismatch' });
    expect(validateGitMemoryClosure({ pack, selectedCommit: 'a'.repeat(40), shallow: ['a'.repeat(40)] })).toMatchObject({ ok: false, code: 'pin-mismatch' });
    expect(closure([...f.objects, raw('blob', 'unreachable')], f.tip)).toMatchObject({ ok: false, code: 'closure-mismatch' });
    expect(closure(f.objects.filter(object => object.oid !== f.first.oid), f.tip)).toMatchObject({ ok: false, code: 'closure-mismatch' });
    const wrongTree = tree([{ mode: '40000', name: 'dir', object: f.first }]); const wrongTip = commit(wrongTree);
    expect(closure([wrongTip, wrongTree, f.first], wrongTip)).toMatchObject({ ok: false, code: 'closure-mismatch' });
    const parent = commit(f.rootTree, 'sha1', '', 'Own extra parent body.\n');
    expect(closure([...f.objects, parent], f.tip)).toMatchObject({ ok: false, code: 'closure-mismatch' });
    for (const lower of [{ maxObjectBytes: 1 }, { maxResolvedBytes: 1 }, { maxEntries: 1 }, { maxPathBytes: 1 }, { maxWorkingBytes: 1 }])
      expect(validateGitMemoryClosure({ pack, selectedCommit: f.pin, shallow: [f.pin], limits: lower })).toMatchObject({ ok: false, code: 'budget-exceeded' });
  });

  it('refuses unsupported commit headers/encoding/signatures and malformed identities/text without stripping bytes', () => {
    const empty = raw('tree', '');
    for (const extra of ['\nencoding UTF-8', '\ngpgsig opaque\n continued', '\nunknown value', '\nauthor Second <second@example.invalid> 1 +0000']) {
      const tip = commit(empty, 'sha1', extra); expect(closure([tip, empty], tip)).toMatchObject({ ok: false, code: 'commit-invalid' });
    }
    for (const body of [commit(empty).body.toString().replace('+0000', '+2460'), commit(empty).body.toString().replace('author ', 'unknown '),
      Buffer.concat([commit(empty).body, Buffer.from([0])]), Buffer.concat([commit(empty).body, Buffer.from([255])])]) {
      const tip = raw('commit', body); expect(closure([tip, empty], tip)).toMatchObject({ ok: false, code: 'commit-invalid' });
    }
    const tip = commit(empty, 'sha1', '', 'Own SYNTHETIC_SECRET metadata must still be screened by caller.\n');
    const checked = closure([tip, empty], tip); expect(checked.ok).toBe(true);
    if (!checked.ok) throw new Error(checked.code);
    expect(Buffer.from(checked.closure.objects.find(object => object.oid === tip.oid)!.body).toString()).toContain('SYNTHETIC_SECRET');
  });

  it('refuses ambiguous/unsafe/malformed tree metadata and bounds traversal while preserving shared aliases', () => {
    const blob = raw('blob', 'own');
    for (const name of ['.', '..', '.git', '.GiT', 'git~1', '.git ', 'NUL.txt', 'a/b', 'a\\b', 'a:b', 'trailing.', 'x'.repeat(256), 'e\u0301', '\u2028name', '\u202egit', Buffer.from([255])]) {
      const root = tree([{ mode: '100644', name, object: blob }]); const tip = commit(root);
      expect(closure([tip, root, blob], tip)).toMatchObject({ ok: false, code: 'unsafe-path' });
    }
    for (const mode of ['120000', '160000', '100664', '0100644']) {
      const root = tree([{ mode, name: 'unsafe', object: blob }]); const tip = commit(root);
      expect(closure([tip, root, blob], tip)).toMatchObject({ ok: false, code: 'unsafe-path' });
    }
    for (const names of [['same', 'same'], ['A', 'a'], ['z', 'a']]) {
      const root = tree(names.map(name => ({ mode: '100644', name, object: blob }))); const tip = commit(root);
      expect(closure([tip, root, blob], tip)).toMatchObject({ ok: false, code: 'tree-invalid' });
    }
    const invalidMode = Buffer.concat([Buffer.from([0xb1]), Buffer.from('00644 file\0'), Buffer.from(blob.oid, 'hex')]);
    const malformed = raw('tree', invalidMode); const malformedTip = commit(malformed);
    expect(closure([malformedTip, malformed, blob], malformedTip)).toMatchObject({ ok: false, code: 'unsafe-path' });
    const empty = raw('tree', ''), nested = tree([{ mode: '40000', name: 'b', object: empty }]), root = tree([{ mode: '40000', name: 'a', object: nested }]), tip = commit(root);
    expect(closure([tip, root, nested, empty], tip, 'sha1', { maxTreeDepth: 1 })).toMatchObject({ ok: false, code: 'budget-exceeded' });
    const truncated = raw('tree', '100644 file\0'); const truncatedTip = commit(truncated);
    expect(closure([truncatedTip, truncated], truncatedTip)).toMatchObject({ ok: false, code: 'tree-invalid' });
  });
});
