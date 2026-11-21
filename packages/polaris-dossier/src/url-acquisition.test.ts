import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { chmod, lstat, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { acquisitionGitTestPort, type AcquisitionProcessRequest, type AcquisitionProcessResult } from './acquisition-process.js';
import { cloneGitDirShape, cloneStoreShape } from './clone-shape.js';
import { openPinnedObjectReader } from './git-object-reader.js';
import { acquireUrlSource, selectUrlSource, urlAcquisitionTestPort, type SelectedUrlSource } from './url-acquisition.js';

const SAFE_URL = 'https://fixture.invalid/Case/Project.git';
const screen = { screenBody: (text: string) => /SYNTHETIC_METADATA_SECRET|<script/iu.test(text) ? 'secret-detector-match' as const : undefined };
const LIMITS = { sampleMilliseconds: 1_000, processMilliseconds: 5_000 };
const roots: string[] = [];
let fixtureProgram = 0;
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }); });

async function fixture(format: 'sha1' | 'sha256' = 'sha1') {
  const root = await mkdtemp(path.join(os.tmpdir(), 'syzygy-url-acquisition-')); roots.push(root);
  const scratchRoot = path.join(root, 'scratch'); await mkdir(scratchRoot);
  const repository = path.join(root, 'own-source'); await mkdir(repository);
  const home = path.join(root, 'fixture-home'); await mkdir(home);
  const git = (...args: string[]): string => execFileSync('/usr/bin/git', ['-c', 'core.hooksPath=/dev/null', '-c', 'user.name=Synthetic Fixture',
    '-c', 'user.email=fixture@example.invalid', ...args], { cwd: repository, env: { PATH: '/usr/bin:/bin', LANG: 'C', HOME: home,
      GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  git('init', '--template=', `--object-format=${format}`, '--initial-branch=main', '.');
  await writeFile(path.join(repository, 'README'), 'first synthetic body\n'); git('add', '.'); git('commit', '-m', 'first own fixture');
  const first = git('rev-parse', 'HEAD').trim();
  await writeFile(path.join(repository, 'README'), 'second synthetic body\n'); git('add', '.'); git('commit', '-m', 'second own fixture');
  const commit = git('rev-parse', 'HEAD').trim();
  git('tag', '-a', 'release', '-m', 'own annotated fixture');
  const tag = git('rev-parse', 'refs/tags/release').trim();
  const requests: AcquisitionProcessRequest[] = [];
  const local = acquisitionGitTestPort({ git: '/usr/bin/git', prlimit: '/usr/bin/prlimit', allowFixtureFileTransport: true });
  const runner = async (request: AcquisitionProcessRequest): Promise<AcquisitionProcessResult> => {
    requests.push(request);
    return local({ ...request, transport: 'none', args: request.args.map(arg => arg === SAFE_URL ? `file://${repository}` : arg) });
  };
  const api = urlAcquisitionTestPort(runner);
  const select = (revision?: string) => api.selectUrlSource({ locator: SAFE_URL, scratchRoot, screen, limits: LIMITS,
    ...(revision === undefined ? {} : { revision }) });
  return { root, scratchRoot, repository, git, first, commit, tag, requests, runner, api, select };
}
function source(result: Awaited<ReturnType<typeof selectUrlSource>>): SelectedUrlSource {
  if (!result.ok) throw new Error(`${result.code}: ${result.reason}`);
  return result.source;
}
async function fakeGit(root: string, script: string) {
  const executable = path.join(root, `trusted-fixture-${fixtureProgram++}`);
  await writeFile(executable, `#!${process.execPath}\n${script}\n`); await chmod(executable, 0o755);
  return acquisitionGitTestPort({ git: executable, prlimit: '/usr/bin/prlimit' });
}

describe('URL source selection and owned acquisition', () => {
  it.each(['sha1', 'sha256'] as const)('selects and verifies a strict detached depth-one %s clone using fresh full-root monitored homes', async format => {
    const f = await fixture(format);
    const stages: { stage: string; processesAlreadyStarted: number }[] = [];
    const onStage = (stage: 'selection' | 'init' | 'fetch' | 'checkout', limits: { fileBytes: number }) => {
      expect(limits.fileBytes).toBe(268_435_456);
      expect(Object.isFrozen(limits)).toBe(true);
      stages.push({ stage, processesAlreadyStarted: f.requests.length });
    };
    const selection = await f.api.selectUrlSource({ locator: SAFE_URL, scratchRoot: f.scratchRoot, screen, limits: LIMITS, onStage });
    expect(selection).toMatchObject({ ok: true, source: { transportLocator: SAFE_URL, normalizedLocator: 'fixture.invalid/case/project',
      transport: 'https', selector: null, revision: { mode: 'remote-default', reference: 'refs/heads/main', identifier: f.commit, objectFormat: format },
      provenance: { classification: 'source-metadata', label: 'Inferred', advertisement: { bytes: expect.any(Number), sha256: expect.stringMatching(/^[0-9a-f]{64}$/u) } } },
    });
    expect(await readdir(f.scratchRoot)).toEqual([]);
    const acquired = await f.api.acquireUrlSource({ source: source(selection), scratchRoot: f.scratchRoot, screen, limits: LIMITS, onStage });
    expect(acquired.ok).toBe(true);
    if (!acquired.ok) throw new Error(acquired.code);
    expect(acquired.operations.map(operation => operation.stage)).toEqual(['init', 'fetch', 'checkout']);
    expect(stages).toEqual([{ stage: 'selection', processesAlreadyStarted: 0 }, { stage: 'init', processesAlreadyStarted: 1 },
      { stage: 'fetch', processesAlreadyStarted: 2 }, { stage: 'checkout', processesAlreadyStarted: 3 }]);
    for (const operation of acquired.operations) {
      expect(Number.isFinite(Date.parse(operation.startedAt))).toBe(true);
      expect(Number.isFinite(Date.parse(operation.finishedAt))).toBe(true);
    }
    expect(await readFile(path.join(acquired.clone, '.git/HEAD'), 'utf8')).toBe(`${f.commit}\n`);
    expect(await readFile(path.join(acquired.clone, 'README'), 'utf8')).toBe('second synthetic body\n');
    expect(cloneGitDirShape(path.join(acquired.clone, '.git'), f.commit, { objectFormatSetting: format === 'sha256' })).toEqual({ ok: true });
    const reader = openPinnedObjectReader({ gitDir: path.join(acquired.clone, '.git'), revision: f.commit });
    expect(cloneStoreShape(path.join(acquired.clone, '.git'), f.commit, await reader.inventory())).toEqual({ ok: true });
    expect(new Set(f.requests.map(request => request.home)).size).toBe(4);
    for (const request of f.requests) {
      expect(request.monitorRoot).toBe(path.dirname(request.home));
      expect(request.monitorRoot).not.toBe(acquired.clone);
    }
    expect(f.requests[2]!.args).toEqual(['fetch', '--depth=1', '--no-tags', '--no-recurse-submodules', '--', SAFE_URL, f.commit]);
    expect(f.requests[3]!.args).toEqual(['checkout', '--detach', f.commit]);
    expect(JSON.stringify(acquired.operations)).not.toContain('file://');
  });

  it('pins the selected default when remote HEAD later moves and makes each acquisition a new clone', async () => {
    const f = await fixture();
    const selected = source(await f.select());
    f.git('reset', '--hard', f.first);
    const first = await f.api.acquireUrlSource({ source: selected, scratchRoot: f.scratchRoot, screen, limits: LIMITS });
    const second = await f.api.acquireUrlSource({ source: selected, scratchRoot: f.scratchRoot, screen, limits: LIMITS });
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) throw new Error('own acquisition failed');
    expect(first.clone).not.toBe(second.clone);
    expect(await readFile(path.join(first.clone, '.git/HEAD'), 'utf8')).toBe(`${f.commit}\n`);
    expect(await readFile(path.join(second.clone, '.git/HEAD'), 'utf8')).toBe(`${f.commit}\n`);
    expect(f.requests.filter(request => request.args[0] === 'ls-remote')).toHaveLength(1);
    expect(source(await f.select()).revision.identifier).toBe(f.first);
  });

  it('uses no query or scratch directory for a full identifier and peels only a named remote tag', async () => {
    const f = await fixture();
    const explicit = source(await selectUrlSource({ locator: SAFE_URL, revision: f.commit.toUpperCase(), scratchRoot: '/unused-absent-fixture', screen, onStage: () => { throw new Error('full identifier must not query'); } }));
    expect(explicit.revision).toEqual({ mode: 'full-commit', reference: null, identifier: f.commit, objectFormat: 'sha1' });
    expect(explicit.provenance.advertisement).toBeNull();
    for (const locator of ['ssh://git@fixture.invalid:2222/Case/Project.git', 'git@fixture.invalid:Case/Project.git']) {
      const ssh = source(await selectUrlSource({ locator, revision: f.commit, scratchRoot: '/unused-absent-fixture', screen }));
      expect(ssh.transportLocator).toBe(locator);
      expect(ssh.transport).toBe('ssh');
      expect(ssh.normalizedLocator).toBe('fixture.invalid/case/project');
    }
    expect(f.requests).toHaveLength(0);
    const namedTag = source(await f.select('refs/tags/release'));
    expect(namedTag.revision.identifier).toBe(f.commit);
    expect((await f.api.acquireUrlSource({ source: namedTag, scratchRoot: f.scratchRoot, screen, limits: LIMITS })).ok).toBe(true);
    const tagObject = source(await f.select(f.tag));
    const refused = await f.api.acquireUrlSource({ source: tagObject, scratchRoot: f.scratchRoot, screen, limits: LIMITS });
    expect(refused).toMatchObject({ ok: false, code: 'object-not-commit', stage: 'verification' });
    expect(f.requests.at(-1)!.args[0]).toBe('fetch');
  });

  it('refuses ambiguous branch/tag names, absent defaults and conflicting raw advertisements without retaining metadata', async () => {
    const f = await fixture();
    f.git('branch', 'release', f.first);
    expect(await f.select('release')).toMatchObject({ ok: false, code: 'ref-ambiguous' });
    expect(source(await f.select('refs/heads/release')).revision.identifier).toBe(f.first);
    const advertised = await fakeGit(f.root, `process.stdout.write(${JSON.stringify(`${f.commit}\tHEAD\n`)})`);
    const api = urlAcquisitionTestPort(advertised);
    expect(await api.selectUrlSource({ locator: SAFE_URL, scratchRoot: f.scratchRoot, screen, limits: LIMITS }))
      .toMatchObject({ ok: false, code: 'default-missing' });
    const conflicting = await fakeGit(f.root, `process.stdout.write(${JSON.stringify(`ref: refs/heads/main\tHEAD\n${f.commit}\tHEAD\n${f.first}\tHEAD\n`)})`);
    expect(await urlAcquisitionTestPort(conflicting).selectUrlSource({ locator: SAFE_URL, scratchRoot: f.scratchRoot, screen, limits: LIMITS }))
      .toMatchObject({ ok: false, code: 'metadata-invalid' });
    expect(await readdir(f.scratchRoot)).toEqual([]);
  });

  it('screens original, normalized, derived and raw remote metadata before process or provenance use', async () => {
    const f = await fixture();
    const inputs = [
      { locator: 'https://fixture.invalid/SYNTHETIC_METADATA_SECRET/Project.git' },
      { locator: SAFE_URL, revision: 'refs/heads/SYNTHETIC_METADATA_SECRET' },
      { locator: SAFE_URL, revision: `refs/heads/${String.fromCharCode(0xd800)}` },
      { locator: 'https://fixture.invalid/<script>/Project.git' },
    ];
    for (const input of inputs) {
      const denied = await f.api.selectUrlSource({ ...input, scratchRoot: f.scratchRoot, screen, limits: LIMITS });
      expect(denied).toMatchObject({ ok: false, code: 'metadata-excluded', operations: [] });
      expect(JSON.stringify(denied)).not.toContain('SYNTHETIC_METADATA_SECRET');
    }
    expect(f.requests).toHaveLength(0);
    const callback = () => { throw new Error('synthetic stage-record failure'); };
    expect(await f.api.selectUrlSource({ locator: SAFE_URL, scratchRoot: f.scratchRoot, screen, onStage: callback }))
      .toMatchObject({ ok: false, code: 'operation-failed', operations: [] });
    const pinned = source(await f.select(f.commit));
    expect(await f.api.acquireUrlSource({ source: pinned, scratchRoot: f.scratchRoot, screen, onStage: callback }))
      .toMatchObject({ ok: false, code: 'operation-failed', operations: [] });
    expect(f.requests).toHaveLength(0);
    expect(await readdir(f.scratchRoot)).toEqual([]);
    const derived = { screenBody: (text: string) => text === f.commit ? 'secret-detector-match' as const : undefined };
    expect(await f.api.selectUrlSource({ locator: SAFE_URL, revision: f.commit.toUpperCase(), scratchRoot: f.scratchRoot, screen: derived }))
      .toMatchObject({ ok: false, code: 'metadata-excluded' });
    const unsafe = await fakeGit(f.root, `process.stdout.write(${JSON.stringify(`ref: refs/heads/SYNTHETIC_METADATA_SECRET\tHEAD\n${f.commit}\tHEAD\n`)})`);
    const raw = await urlAcquisitionTestPort(unsafe).selectUrlSource({ locator: SAFE_URL, scratchRoot: f.scratchRoot, screen, limits: LIMITS });
    expect(raw).toMatchObject({ ok: false, code: 'metadata-excluded' });
    expect(JSON.stringify(raw)).not.toContain('SYNTHETIC_METADATA_SECRET');
    const unrelated = await fakeGit(f.root, `process.stdout.write(${JSON.stringify(`ref: refs/heads/main\tHEAD\n${f.commit}\tHEAD\nSYNTHETIC_METADATA_SECRET\trefs/heads/unrequested\n`)})`);
    expect(await urlAcquisitionTestPort(unrelated).selectUrlSource({ locator: SAFE_URL, scratchRoot: f.scratchRoot, screen, limits: LIMITS }))
      .toMatchObject({ ok: false, code: 'metadata-excluded' });
    expect(await readdir(f.scratchRoot)).toEqual([]);
  });

  it('revalidates every selected transport, pin, mode and provenance field before any acquisition writes', async () => {
    const f = await fixture();
    for (const locator of ['file:///own-fixture', 'http://fixture.invalid/a/b', 'git://fixture.invalid/a/b',
      'https://user:synthetic-password@fixture.invalid/a/b', 'https://fixture.invalid/a/b?query', 'https://fixture.invalid/a/b#fragment']) {
      const denied = await f.api.selectUrlSource({ locator, scratchRoot: f.scratchRoot, screen });
      expect(denied).toMatchObject({ ok: false, code: 'locator-invalid', operations: [] });
      expect(JSON.stringify(denied)).not.toContain('synthetic-password');
    }
    const selected = source(await f.select(f.commit));
    const altered: SelectedUrlSource[] = [
      { ...selected, transportLocator: 'file:///synthetic-only' }, { ...selected, normalizedLocator: 'other.invalid/path' },
      { ...selected, transport: 'ssh' }, { ...selected, revision: { ...selected.revision, identifier: f.first } },
      { ...selected, revision: { ...selected.revision, objectFormat: 'sha256' } },
      { ...selected, revision: { ...selected.revision, mode: 'remote-default' } },
      { ...selected, revision: { ...selected.revision, reference: 'refs/heads/main' } },
      { ...selected, provenance: { ...selected.provenance, locatorSha256: '0'.repeat(64) } },
    ];
    for (const changed of altered) expect(await f.api.acquireUrlSource({ source: changed, scratchRoot: f.scratchRoot, screen, limits: LIMITS }))
      .toMatchObject({ ok: false, code: 'selection-invalid', operations: [] });
    expect(f.requests).toHaveLength(0);
    expect(await readdir(f.scratchRoot)).toEqual([]);
    expect(await acquireUrlSource({ source: selected, scratchRoot: f.scratchRoot, screen: { screenBody: () => 'secret-detector-match' } }))
      .toMatchObject({ ok: false, code: 'selection-invalid', operations: [] });
    const augmented = { ...selected, extra: 'SYNTHETIC_METADATA_SECRET',
      revision: { ...selected.revision, extra: 'SYNTHETIC_METADATA_SECRET' },
      provenance: { ...selected.provenance, extra: 'SYNTHETIC_METADATA_SECRET' } };
    const reconstructed = await f.api.acquireUrlSource({ source: augmented, scratchRoot: f.scratchRoot, screen, limits: LIMITS });
    expect(reconstructed.ok).toBe(true);
    expect(JSON.stringify(reconstructed)).not.toContain('SYNTHETIC_METADATA_SECRET');
  });

  it('rejects config drift, HEAD mismatch, extra objects and malformed commits after otherwise successful trusted Git steps', async () => {
    for (const defect of ['config', 'head', 'extra-object', 'commit'] as const) {
      const f = await fixture();
      const selected = source(await f.select(f.commit));
      const api = urlAcquisitionTestPort(async request => {
        const result = await f.runner(request);
        if (result.ok && request.args[0] === (defect === 'commit' || defect === 'config' ? 'fetch' : 'checkout')) {
          if (defect === 'config') await writeFile(path.join(request.cwd, '.git/config'), '[core]\nrepositoryformatversion = 0\nbare = false\n');
          if (defect === 'head') await writeFile(path.join(request.cwd, '.git/HEAD'), `${f.first}\n`);
          if (defect === 'extra-object') {
            await mkdir(path.join(request.cwd, '.git/objects/00'), { recursive: true });
            await writeFile(path.join(request.cwd, '.git/objects/00', '1'.repeat(38)), 'not an object');
          }
          if (defect === 'commit') {
            const object = path.join(request.cwd, '.git/objects', f.commit.slice(0, 2), f.commit.slice(2));
            // Create a corrupt loose object at the exact pin even when Git packed the own fixture.
            await mkdir(path.dirname(object), { recursive: true });
            await writeFile(object, 'corrupt own fixture');
          }
        }
        return result;
      });
      const result = await api.acquireUrlSource({ source: selected, scratchRoot: f.scratchRoot, screen, limits: LIMITS });
      expect(result).toMatchObject({ ok: false, code: defect === 'config' ? 'configuration-changed' : defect === 'head' ? 'pin-mismatch'
        : defect === 'extra-object' ? 'clone-shape' : 'object-verification' });
      expect(await readdir(f.scratchRoot)).toEqual([]);
    }
  });

  it('preserves confirmed resource refusals and removes scratch, while unknown process state retains its workspace', async () => {
    const f = await fixture();
    for (const [script, expected] of [
      ['setInterval(()=>{},1000)', 'process-deadline'],
      ['process.stdout.write("x".repeat(2048))', 'output-limit'],
      ['require("node:fs").writeFileSync("growth",Buffer.alloc(4096));setInterval(()=>{},1000)', 'directory-byte-limit'],
    ] as const) {
      const runner = await fakeGit(f.root, script);
      const refused = await urlAcquisitionTestPort(runner).selectUrlSource({ locator: SAFE_URL, scratchRoot: f.scratchRoot, screen,
        limits: { processMilliseconds: 250, sampleMilliseconds: 100, outputBytes: 1024, directoryBytes: 512 } });
      expect(refused).toMatchObject({ ok: false, code: expected, operations: [{ stage: 'selection', summary: { groupTermination: 'confirmed' } }] });
      expect(await readdir(f.scratchRoot)).toEqual([]);
    }
    const unconfirmed = await urlAcquisitionTestPort(async request => {
      const result = await f.runner(request);
      return { ok: false, code: 'termination-unconfirmed', reason: 'Synthetic unconfirmed group.',
        summary: { ...result.summary, groupTermination: 'unconfirmed' } };
    }).selectUrlSource({ locator: SAFE_URL, scratchRoot: f.scratchRoot, screen, limits: LIMITS });
    expect(unconfirmed).toMatchObject({ ok: false, code: 'termination-unconfirmed', retainedWorkspace: expect.any(String),
      operations: [{ stage: 'selection', summary: { groupTermination: 'unconfirmed' } }] });
    if (unconfirmed.ok || unconfirmed.retainedWorkspace === undefined) throw new Error('unconfirmed workspace not retained');
    expect((await lstat(unconfirmed.retainedWorkspace)).isDirectory()).toBe(true);
    const unknown = await urlAcquisitionTestPort(async () => { throw new Error('synthetic unknown child state'); })
      .selectUrlSource({ locator: SAFE_URL, scratchRoot: f.scratchRoot, screen, limits: LIMITS });
    expect(unknown).toMatchObject({ ok: false, code: 'termination-unconfirmed', retainedWorkspace: expect.any(String) });
    if (unknown.ok || unknown.retainedWorkspace === undefined) throw new Error('workspace not retained');
    expect((await lstat(unknown.retainedWorkspace)).isDirectory()).toBe(true);
    const selected = source(await f.select(f.commit));
    const acquireUnknown = await urlAcquisitionTestPort(async () => { throw new Error('synthetic unknown child state'); })
      .acquireUrlSource({ source: selected, scratchRoot: f.scratchRoot, screen, limits: LIMITS });
    expect(acquireUnknown).toMatchObject({ ok: false, code: 'termination-unconfirmed', retainedWorkspace: expect.any(String) });
  });
});
