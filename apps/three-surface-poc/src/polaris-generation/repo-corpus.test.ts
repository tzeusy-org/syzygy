import { execFileSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';

import { chmodSync, existsSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { DOSSIER_READER_QUESTIONS, DOSSIER_REQUESTED_ASSETS, quotableGenerationSources, validateGenerationSources } from '@syzygy/polaris-generation-core';
import { tempDir } from '@syzygy/test-kit';

import { main } from './repo-corpus-main.js';
import { isolatedGit } from './isolated-git.js';
import { buildPipelineRequest, CorpusRefusal, globToRegExp, parseReaderConfig, readRepoCorpus, refusingAdmission, type CorpusAdmissionPort } from './repo-corpus.js';

const allow: CorpusAdmissionPort = { decide: async () => ({ allowed: true, permissionIdentity: 'fixture-consent-v1' }) };
const budget = { maxCalls: 7, maxInputBytes: 5_000_000, maxOutputBytes: 1_000_000, maxUsageUnits: 100, maxElapsedMs: 30_000, maxRepairCycles: 1, accountingPolicy: 'fixture-v1' };
const configText = (extra: Record<string, unknown> = {}): string => JSON.stringify({ repositoryId: 'repository:fixture', revision: 'a'.repeat(40), readerQuestions: [{ id: 'what', topics: [], text: 'What is it?' }],
  requestedAssets: [{ id: 'overview', kind: 'section', required: true }], budget, ...extra });

let root = '', commit = '';
const big = `${'int line_of_code = 42; /* padding */\n'.repeat(3000)}end\n`;
beforeAll(() => {
  root = tempDir('syzygy-repo-corpus-');
  const run = (...args: string[]): string => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
  run('init', '-q'); run('config', 'gc.auto', '0'); run('config', 'maintenance.auto', 'false'); run('config', 'user.email', 'f@example.invalid'); run('config', 'user.name', 'F');
  const files: Record<string, string | Buffer> = { 'src/a.c': 'int a(void) { return 1; }\n', 'src/big.c': big, 'docs/readme.md': '# Readme\n',
    'vendor/dep/x.c': 'VENDOR\n', 'assets/logo.bin': Buffer.from([0, 1, 2, 3]), 'assets/latin1.txt': Buffer.from([0xe9, 0x0a]) };
  for (const [path, body] of Object.entries(files)) { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), body); }
  symlinkSync('a.c', join(root, 'src/link.c'));
  run('add', '-A'); run('commit', '-qm', 'fixture');
  commit = run('rev-parse', 'HEAD');
  writeFileSync(join(root, 'src/a.c'), 'LOCAL-EDIT-SENTINEL\n');
  writeFileSync(join(root, 'src/untracked.c'), 'UNTRACKED-SENTINEL\n');
});

const cfg = (extra: Partial<Parameters<typeof readRepoCorpus>[1]> = {}) => ({ repositoryId: 'repository:fixture', revision: commit, include: ['**'], exclude: ['vendor/**'], oversize: 'split' as const, ...extra });

const expectAccounted = (corpus: Awaited<ReturnType<typeof readRepoCorpus>>): void => {
  const c = corpus.count;
  expect(c.listed).toBe(c.notBlob + c.outsideInclude + c.excludedByGlob + c.unquotablePath + c.selected);
  expect(new Set(corpus.sources.map(source => source.path)).size).toBe(c.selected);
  expect(corpus.unrepresentable).toHaveLength(c.unquotablePath);
};

let hostile = '', hostileCommit = '', hostileTree = '', hostileTag = '';
const sentinel = join(tmpdir(), `syzygy-fsmonitor-sentinel-${process.pid}`);
beforeAll(() => {
  hostile = tempDir('syzygy-repo-hostile-');
  const run = (...args: string[]): string => execFileSync('git', ['-C', hostile, ...args], { encoding: 'utf8' }).trim();
  run('init', '-q'); run('config', 'gc.auto', '0'); run('config', 'maintenance.auto', 'false'); run('config', 'user.email', 'f@example.invalid'); run('config', 'user.name', 'F');
  const files: Record<string, string | Buffer> = { 'bom.txt': Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('hello\n')]), 'empty/__init__.py': '', 'we\\ird.txt': 'odd name\n', 'ok.md': '# ok\n' };
  for (const [path, body] of Object.entries(files)) { mkdirSync(dirname(join(hostile, path)), { recursive: true }); writeFileSync(join(hostile, path), body); }
  run('add', '-A');
  run('update-index', '--add', '--cacheinfo', `160000,${'d'.repeat(40)},vendor/sub`);
  run('commit', '-qm', 'hostile'); hostileCommit = run('rev-parse', 'HEAD'); hostileTree = run('rev-parse', 'HEAD^{tree}');
  run('tag', '-a', 'v1', '-m', 'annotated'); hostileTag = run('rev-parse', 'v1');
  // A repo-local config that would run a program if any git call honoured it.
  const script = join(hostile, '.git', 'fsmonitor.sh');
  writeFileSync(script, `#!/bin/sh\ntouch '${sentinel}'\n`); chmodSync(script, 0o755);
  run('config', 'core.fsmonitor', script); run('config', 'core.hooksPath', join(hostile, '.git', 'evil-hooks'));
});
afterAll(() => { rmSync(sentinel, { force: true }); });

describe('hostile tree entries never fail the run', () => {
  const hcfg = (extra: Partial<Parameters<typeof readRepoCorpus>[1]> = {}) => ({ ...cfg({ exclude: [] }), revision: hostileCommit, ...extra });

  it('counts a BOM file, an empty file, a backslash name and a gitlink instead of throwing', async () => {
    const corpus = await readRepoCorpus(hostile, hcfg(), { admission: allow });
    expect(corpus.count).toMatchObject({ listed: 5, notBlob: 1, unquotablePath: 1, selected: 3, emptyFiles: 1, binaryOrNonUtf8: 0 });
    expectAccounted(corpus);
    const bom = corpus.sources.find(source => source.path === 'bom.txt')!;
    expect(bom.body!.startsWith('\uFEFF')).toBe(true);
    expect(corpus.sources.find(source => source.path === 'empty/__init__.py')).toMatchObject({ exclusion: { excluded: true, reason: 'empty-file' } });
    expect(corpus.unrepresentable[0]).toMatchObject({ reason: 'unquotable-path', pathHmac: expect.stringMatching(/^[0-9a-f]{64}$/u) });
    expect(JSON.stringify(corpus.sources)).not.toContain('ird.txt');
  });

  it('never asks for the gitlink object', async () => {
    const asked: string[] = [];
    await readRepoCorpus(hostile, hcfg(), { admission: allow, readBlobs: (_root, objects) => { asked.push(...objects); return new Map(objects.map(o => [o, new Uint8Array(0)])); } }).catch(() => undefined);
    expect(asked).not.toContain('d'.repeat(40));
  });

  it('accepts only a commit: a tree id or an annotated tag id is refused', async () => {
    await expect(readRepoCorpus(hostile, hcfg({ revision: hostileTree }), { admission: allow })).rejects.toThrow('invalid-pinned-commit');
    await expect(readRepoCorpus(hostile, hcfg({ revision: hostileTag }), { admission: allow })).rejects.toThrow('invalid-pinned-commit');
  });

  it('refuses bytes that do not hash to the listed object', async () => {
    const tamper = (_root: string, objects: readonly string[]) => new Map(objects.map(o => [o, new TextEncoder().encode('tampered\n')]));
    await expect(readRepoCorpus(hostile, hcfg(), { admission: allow, readBlobs: tamper })).rejects.toThrow('corpus-object-mismatch');
  });

  it('runs git with the repo-local program hooks overridden', async () => {
    expect(execFileSync('git', ['-C', hostile, 'config', '--get', 'core.fsmonitor'], { encoding: 'utf8' }).trim()).toContain('fsmonitor.sh');
    expect(isolatedGit(hostile, ['config', '--get', 'core.fsmonitor']).toString().trim()).toBe('false');
    expect(isolatedGit(hostile, ['config', '--get', 'core.hooksPath']).toString().trim()).toBe('/dev/null');
    await readRepoCorpus(hostile, hcfg(), { admission: allow });
    expect(existsSync(sentinel)).toBe(false);
  });
});

describe('admission gate', () => {
  it('requires a non-empty permission identity from an allowing port', async () => {
    for (const permissionIdentity of ['', undefined, 7]) {
      await expect(readRepoCorpus(root, cfg(), { admission: { decide: async () => ({ allowed: true, permissionIdentity }) as never } })).rejects.toThrow('admission-without-permission-identity');
    }
  });

  it('refuses by default before any git access', async () => {
    const readBlobs = vi.fn();
    await expect(readRepoCorpus('/nonexistent/never-touched', cfg(), { readBlobs })).rejects.toThrow(CorpusRefusal);
    await expect(readRepoCorpus('/nonexistent/never-touched', cfg(), { admission: refusingAdmission, readBlobs })).rejects.toThrow(/no-admission-port/);
    expect(readBlobs).not.toHaveBeenCalled();
  });

  it('refuses unless the port answers exactly allowed: true, and passes it the request', async () => {
    const decide = vi.fn(async () => ({ allowed: 'yes', permissionIdentity: 'id' }) as never);
    await expect(readRepoCorpus(root, cfg(), { admission: { decide } })).rejects.toThrow(CorpusRefusal);
    expect(decide).toHaveBeenCalledWith({ repositoryId: 'repository:fixture', revision: commit, include: ['**'], exclude: ['vendor/**'] });
  });
});

describe('any-repo reader', () => {
  it('accounts for every tree entry and reads only the pinned commit', async () => {
    const corpus = await readRepoCorpus(root, cfg(), { admission: allow });
    expect(corpus.count).toMatchObject({ listed: 7, notBlob: 1, outsideInclude: 0, excludedByGlob: 1, unquotablePath: 0, selected: 5, binaryOrNonUtf8: 2, emptyFiles: 0, oversizeFiles: 1, oversizeExcluded: 0 });
    expect(corpus.count.sourceRows).toBe(corpus.sources.length);
    expect(corpus.sources.length).toBeGreaterThan(corpus.count.selected);
    expectAccounted(corpus);
    const text = JSON.stringify(corpus);
    for (const sentinel of ['LOCAL-EDIT-SENTINEL', 'UNTRACKED-SENTINEL', 'VENDOR']) expect(text).not.toContain(sentinel);
    expect(corpus.permissionIdentity).toBe('fixture-consent-v1');
    expect(corpus.sources.filter(s => s.exclusion.excluded).map(s => [s.path, s.exclusion])).toEqual([
      ['assets/latin1.txt', { excluded: true, reason: 'binary-or-non-utf8' }], ['assets/logo.bin', { excluded: true, reason: 'binary-or-non-utf8' }]]);
    expect(corpus.sources.find(s => s.path === 'src/a.c')!.body).toBe('int a(void) { return 1; }\n');
    expect(validateGenerationSources(corpus.sources)).toBe(corpus.sources);
  });

  it('splits an oversize file into pieces, or excludes it with a reason', async () => {
    const split = await readRepoCorpus(root, cfg(), { admission: allow });
    const pieces = split.sources.filter(s => s.path === 'src/big.c');
    expect(pieces.length).toBeGreaterThan(1);
    expect(pieces.map(p => p.body).join('')).toBe(big);
    const excluded = await readRepoCorpus(root, cfg({ oversize: 'exclude' }), { admission: allow });
    expect(excluded.sources.filter(s => s.path === 'src/big.c')).toMatchObject([{ exclusion: { excluded: true, reason: 'oversize-source-excluded' } }]);
    expect(excluded.count.oversizeExcluded).toBe(1);
    expect(quotableGenerationSources(excluded.sources).map(q => q.sourceId)).not.toContain(pieces[0]!.sourceId);
  });

  it('applies include then exclude globs and counts what each removed', async () => {
    const corpus = await readRepoCorpus(root, cfg({ include: ['src/*.c', 'docs/**'], exclude: ['src/big.c'] }), { admission: allow });
    expect(corpus.sources.map(s => s.path)).toEqual(['docs/readme.md', 'src/a.c']);
    expect(corpus.count).toMatchObject({ listed: 7, outsideInclude: 3, excludedByGlob: 1, notBlob: 1, selected: 2 });
  });

  it('refuses an unpinned or unknown revision', async () => {
    await expect(readRepoCorpus(root, cfg({ revision: 'main' }), { admission: allow })).rejects.toThrow('invalid-pinned-commit');
    await expect(readRepoCorpus(root, cfg({ revision: '0'.repeat(40) }), { admission: allow })).rejects.toThrow();
    await expect(readRepoCorpus(root, cfg({ repositoryId: 'bad id!' }), { admission: allow })).rejects.toThrow('invalid-repository-id');
  });

  it('is deterministic for one commit', async () => {
    const a = await readRepoCorpus(root, cfg(), { admission: allow }), b = await readRepoCorpus(root, cfg(), { admission: allow });
    expect(a.identityDigest).toBe(b.identityDigest);
  });

  describe('keyed excluded ids (syzygy-75ds)', () => {
    const plain = (path: string) => `s-${createHash('sha256').update(path).digest('hex').slice(0, 24)}`;
    const excludedIds = (corpus: Awaited<ReturnType<typeof readRepoCorpus>>) => new Map(corpus.sources.filter(source => source.exclusion.excluded).map(source => [source.path, source.sourceId]));
    const read = (runKey?: Buffer) => readRepoCorpus(root, cfg({ oversize: 'exclude' }), { admission: allow, ...(runKey === undefined ? {} : { runKey }) });

    it('keys every excluded row, oversize included, away from the unkeyed path hash', async () => {
      const ids = excludedIds(await read());
      expect([...ids.keys()].sort()).toEqual(['assets/latin1.txt', 'assets/logo.bin', 'src/big.c']);
      for (const [path, id] of ids) { expect(id).toMatch(/^s-[0-9a-f]{24}$/u); expect(id).not.toBe(plain(path)); }
    });
    it('differs between runs and is stable within one key; admitted rows keep the unkeyed id', async () => {
      const key = randomBytes(32);
      const [a, b, c] = [await read(key), await read(key), await read(randomBytes(32))];
      expect(excludedIds(a)).toEqual(excludedIds(b));
      expect(excludedIds(a).get('src/big.c')).not.toBe(excludedIds(c).get('src/big.c'));
      expect(a.sources.find(source => source.path === 'src/a.c')!.sourceId).toBe(plain('src/a.c'));
    });
    it('keeps the identity digest (and so request and snapshot ids) stable across keys', async () => {
      const [a, c] = [await read(randomBytes(32)), await read(randomBytes(32))];
      expect(a.identityDigest).toBe(c.identityDigest);
    });
    it('keys the unrepresentable path digest: not the sha256, stable per key, different across keys', async () => {
      const key = randomBytes(32);
      const digest = async (runKey: Buffer) => (await readRepoCorpus(hostile, { ...cfg({ exclude: [] }), revision: hostileCommit }, { admission: allow, runKey })).unrepresentable[0]!.pathHmac;
      expect(await digest(key)).not.toBe(createHash('sha256').update('we\\ird.txt').digest('hex'));
      expect(await digest(key)).toBe(await digest(key));
      expect(await digest(key)).not.toBe(await digest(randomBytes(32)));
    });
  });
});

describe('globs and config', () => {
  it('matches ** across directories, * within one, and ? for one character', () => {
    expect(globToRegExp('**/*.c').test('a.c')).toBe(true);
    expect(globToRegExp('**/*.c').test('x/y/a.c')).toBe(true);
    expect(globToRegExp('src/*.c').test('src/deep/a.c')).toBe(false);
    expect(globToRegExp('src/**').test('src/deep/a.c')).toBe(true);
    expect(globToRegExp('a?.c').test('ab.c')).toBe(true);
    expect(globToRegExp('a?.c').test('a/.c')).toBe(false);
    expect(globToRegExp('a.c').test('abc')).toBe(false);
  });

  it('parses a strict config and lets flags override identity and globs', () => {
    const parsed = parseReaderConfig(configText(), { revision: 'b'.repeat(40), include: ['x/**'] });
    expect(parsed).toMatchObject({ repositoryId: 'repository:fixture', revision: 'b'.repeat(40), include: ['x/**'], exclude: [], oversize: 'split' });
    expect(() => parseReaderConfig(configText({ extra: 1 }))).toThrow('config-invalid');
    expect(() => parseReaderConfig(configText({ budget: { ...budget, maxCalls: -1 } }))).toThrow('config-invalid: budget');
    expect(() => parseReaderConfig(configText({ oversize: 'truncate' }))).toThrow('config-invalid: oversize');
    expect(() => parseReaderConfig(configText({ requestedAssets: [{ id: 'x' }] }))).toThrow();
    expect(() => parseReaderConfig(configText({ revision: 'main' }))).toThrow('invalid-pinned-commit');
    expect(() => parseReaderConfig(configText({ readerQuestions: ['a bare string'] }))).toThrow();
  });

  it('takes the dossier questions and assets from the profile unless the config overrides them', () => {
    const { readerQuestions: _q, requestedAssets: _a, ...bare } = JSON.parse(configText());
    const dossier = parseReaderConfig(JSON.stringify({ ...bare, profile: 'dossier' }));
    expect(dossier.readerQuestions).toEqual(DOSSIER_READER_QUESTIONS);
    expect(dossier.requestedAssets).toEqual(DOSSIER_REQUESTED_ASSETS);
    expect(parseReaderConfig(JSON.stringify({ ...bare, profile: 'dossier', readerQuestions: [{ id: 'own', topics: ['mechanisms'], text: 'Own question?' }] })).readerQuestions).toEqual([{ id: 'own', topics: ['mechanisms'], text: 'Own question?' }]);
    expect(() => parseReaderConfig(JSON.stringify(bare))).toThrow('config-invalid');
    expect(() => parseReaderConfig(JSON.stringify({ ...bare, profile: 'other' }))).toThrow('config-invalid: profile');
  });

  it('builds a pipeline request carrying the config questions, assets and budget', async () => {
    const config = parseReaderConfig(configText({ revision: commit }));
    const corpus = await readRepoCorpus(root, config, { admission: allow });
    const request = buildPipelineRequest(corpus, config, 1);
    expect(request).toMatchObject({ projectId: 'repository:fixture', readerQuestions: [{ id: 'what', topics: [], text: 'What is it?' }], budget, snapshotId: corpus.identityDigest });
    expect(request.routes.author).toBe('provider-author');
    expect(request.sources).toBe(corpus.sources);
  });
});

describe('cli', () => {
  it('exits 1 with the refusal under the default port and 0 with an allowing port', async () => {
    const dir = tempDir('syzygy-repo-cli-');
    writeFileSync(join(dir, 'c.json'), configText({ revision: commit }));
    const err = vi.spyOn(process.stderr, 'write').mockReturnValue(true), out = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    try {
      expect(await main(['--repo', root, '--config', join(dir, 'c.json')])).toBe(1);
      expect(String(err.mock.calls.at(-1)![0])).toContain('Corpus read refused');
      expect(await main(['--repo', root, '--config', join(dir, 'c.json'), '--exclude', 'vendor/**'], allow)).toBe(0);
      const report = JSON.parse(String(out.mock.calls.at(-1)![0]));
      expect(report).toMatchObject({ realProviderCalls: 0, count: { selected: 5 } });
      expect(JSON.stringify(report)).not.toContain('int a(void)');
      expect(await main(['--repo', root])).toBe(2);
    } finally { err.mockRestore(); out.mockRestore(); }
  });
});
