import * as fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { build, buildSync, type BuildOptions, type Loader } from 'esbuild';
import { beforeAll, describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { sha256 } from '@syzygy/support';
import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { policyFixture } from './full-run.testkit.js';
import { acquireUrlSourceInMemory, urlMemoryAcquisitionTestPort, urlMemoryAcquisitionFixtureProfile, type UrlMemoryAcquisitionRequest, type UrlMemoryAudit } from './url-memory-acquisition.js';
import { runGitMemoryWorker, GIT_MEMORY_WORKER_BUNDLE_BANNER, type GitMemoryWorkerProgram } from './git-memory-worker.js';
import { decodeGitIncomingUnit, gitLsRefsWire, type GitIncomingMetadata, type GitIncomingUnit } from './git-memory-selection.js';
import { GIT_MEMORY_LIMITS, selectGitRevisionOverHttps } from './git-memory-transport.js';
import { planUrlRevision, selectUrlRevision } from './url-revision.js';
import { buildDossierScreen } from './screen.js';

const canonical = (value: unknown): string => encodeCanonicalJson(value, { maxBytes: 2_097_152, maxNodes: 32768, maxDepth: 20 });
const hash = (value: unknown): string => sha256(canonical(value));
const packet = (text: string): Buffer => { const bytes = Buffer.from(text); return Buffer.concat([Buffer.from((bytes.length + 4).toString(16).padStart(4, '0')), bytes]); };
async function capturedBuild(label: string, options: BuildOptions): Promise<void> {
  const capture = process.env['SYZYGY_URL_MEMORY_CAPTURE'];
  if (!capture) { buildSync(options); return; }
  expect(path.resolve(capture)).toBe(capture); expect(capture.startsWith('/home/orca/.tmp/')).toBe(true);
  const store = path.join(capture, 'inputs'); fs.mkdirSync(store, { recursive: true, mode: 0o700 });
  const inputs: { path: string; kind: 'file' | 'stdin'; sha256: string; bytes: number }[] = [];
  const retain = (file: string, bytes: Buffer, kind: 'file' | 'stdin') => {
    const digest = sha256(bytes); fs.writeFileSync(path.join(store, digest), bytes); inputs.push({ path: file, kind, sha256: digest, bytes: bytes.length });
  };
  if (options.stdin) retain(options.stdin.sourcefile!, Buffer.from(options.stdin.contents), 'stdin');
  const result = await build({ ...options, absWorkingDir: process.cwd(), metafile: true, plugins: [{ name: 'capture-exact-compiler-input', setup(builder) {
    builder.onLoad({ filter: /\.(mjs|cjs|js|jsx|ts|tsx|json)$/ }, args => {
      const bytes = fs.readFileSync(args.path); retain(args.path, bytes, 'file');
      const extension = path.extname(args.path).slice(1), loader: Loader = extension === 'mjs' || extension === 'cjs' ? 'js' : extension as Loader;
      return { contents: bytes, loader, resolveDir: path.dirname(args.path) };
    });
  } }] });
  fs.writeFileSync(path.join(capture, label + '-inputs.json'), JSON.stringify({ cwd: process.cwd(), inputs: inputs.sort((a, b) => a.path.localeCompare(b.path)) }, null, 2) + '\n');
  fs.writeFileSync(path.join(capture, label + '-metafile.json'), JSON.stringify(result.metafile, null, 2) + '\n');
  fs.copyFileSync(options.outfile!, path.join(capture, label + '.mjs'));
}
let program: GitMemoryWorkerProgram;
beforeAll(async () => {
  const bundle = path.join(tempDir('url-memory-program-'), 'worker.mjs');
  await capturedBuild('worker', { entryPoints: [fileURLToPath(new URL('./git-memory-worker.ts', import.meta.url))], bundle: true, platform: 'node', format: 'esm', conditions: ['source'], banner: { js: GIT_MEMORY_WORKER_BUNDLE_BANNER }, outfile: bundle });
  program = { bundle, bundleSha256: sha256(fs.readFileSync(bundle)), node: fs.realpathSync(process.execPath), nodeSha256: sha256(fs.readFileSync(process.execPath)) };
});
function closure(body = 'Own nonsecret documentation.\n') {
  const object = (type: 'commit' | 'tree' | 'blob', raw: string | Buffer) => {
    const bytes = Buffer.from(raw); return { type, bytes, oid: createHash('sha1').update(`${type} ${bytes.length}\0`).update(bytes).digest('hex') };
  };
  const blob = object('blob', body), tree = object('tree', Buffer.concat([Buffer.from('100644 README.md\0'), Buffer.from(blob.oid, 'hex')]));
  const commit = object('commit', `tree ${tree.oid}\nauthor Own Fixture <own@example.invalid> 946684800 +0000\ncommitter Own Fixture <own@example.invalid> 946684800 +0000\n\nSynthetic acquisition.\n`);
  const header = Buffer.alloc(12); header.write('PACK'); header.writeUInt32BE(2, 4); header.writeUInt32BE(3, 8);
  const entries = [commit, tree, blob].map(item => {
    let size = item.bytes.length; const bytes = [({ commit: 1, tree: 2, blob: 3 }[item.type] << 4) | (size & 15)]; size >>>= 4;
    while (size) { bytes[bytes.length - 1]! |= 128; bytes.push(size & 127); size >>>= 7; }
    return Buffer.concat([Buffer.from(bytes), deflateSync(item.bytes)]);
  });
  const prefix = Buffer.concat([header, ...entries]);
  return { pin: commit.oid, blob: blob.oid, pack: Buffer.concat([prefix, createHash('sha1').update(prefix).digest()]) };
}
type Ports = Parameters<typeof urlMemoryAcquisitionTestPort>[0];
function fixture(options: { body?: string; tamper?: string; agent?: string; reference?: string } = {}) {
  const objects = closure(options.body), events: UrlMemoryAudit[] = [], calls: string[] = [];
  const parent = path.join(tempDir('url-memory-input-'), 'scratch'); fs.mkdirSync(parent, { mode: 0o700 });
  const policyBytes = policyFixture().bytes, originBytes = Buffer.from('{"policyId":"own-origin-fixture","policyVersion":"1"}');
  let lastEnvelope: Record<string, unknown> | null = null;
  const request: UrlMemoryAcquisitionRequest = { locator: 'https://own.example.invalid/fixtures/repository.git', scratchParent: parent, program,
    policy: { bytes: policyBytes, sha256: sha256(policyBytes), originBytes, originSha256: sha256(originBytes), visibility: 'private' },
    host: { current: context => context.policySha256 === sha256(policyBytes) && context.originPolicySha256 === sha256(originBytes), audit: event => { events.push(event); } } };
  const evidence = { groupTermination: 'confirmed', limits: GIT_MEMORY_LIMITS } as never;
  const run = async (input: Record<string, any>, kind: 'selection' | 'receive'): Promise<any> => {
    calls.push(kind);
    const profile = await urlMemoryAcquisitionFixtureProfile(input.url, input.home, undefined, input.limits.milliseconds), configDigest = hash(profile.config);
    const planned = planUrlRevision(input.selector); if (!planned.ok) throw new Error();
    const plan = kind === 'selection' ? planned.value : null;
    let previous: string | null = null, cumulativeText = '', cumulativeComposition = '';
    const outgoing = async (stage: string, wire: Buffer, objectFormat: string | null): Promise<boolean> => {
      const identity = { stage, sourceProvider: input.sourceProvider, url: input.url, destination: profile.destination,
        ...(kind === 'selection' ? { selector: input.selector ?? null, plan } : { pin: input.pin }), objectFormat, classes: ['code-structure'], protocol: profile.protocol,
        digest: sha256(wire), bytes: wire.length, configDigest };
      const item = { ...identity, wire: Uint8Array.from(wire), config: structuredClone(profile.config), bindingDigest: hash(identity) };
      if (options.tamper === 'proxy' && stage === 'connect') { (item.config['environment'] as Record<string, string>)['HTTPS_PROXY'] = 'http://own.invalid'; }
      if (options.tamper === 'command' && stage === 'fetch') item.wire[0] = item.wire[0]! ^ 1;
      if (options.tamper === 'provider' && stage === 'connect') item.sourceProvider = 'git-source:' + 'f'.repeat(64);
      lastEnvelope = item;
      const allowed = await input.admitMetadata(item); if (allowed) calls.push(`send:${stage}`); return allowed;
    };
    const incoming = async (unit: GitIncomingUnit, rawWire: Buffer, objectFormat: 'sha1' | null): Promise<boolean> => {
      const decoded = decodeGitIncomingUnit(unit, profile.protocol, objectFormat, rawWire); if (!decoded) throw new Error('own-fixture-schema');
      cumulativeText += decoded.payloadText; cumulativeComposition += decoded.composition;
      const identity = { stage: unit === 'advertisement' ? 'advertisement' : unit === 'ls-refs' ? 'ls-refs' : 'fetch-metadata', unit, operation: kind, protocol: profile.protocol,
        sourceProvider: input.sourceProvider, url: input.url, destination: profile.destination, pin: kind === 'receive' ? input.pin : null,
        selector: kind === 'selection' ? input.selector ?? null : null, plan, objectFormat, classes: ['code-structure'] as const, profile: profile.profile, configDigest,
        digest: sha256(rawWire), bytes: rawWire.length, decodedDigest: hash(decoded), previousBindingDigest: previous, cumulativeTextDigest: sha256(cumulativeText), cumulativeCompositionDigest: sha256(cumulativeComposition) };
      const { decodedDigest: _decoded, cumulativeTextDigest: _text, cumulativeCompositionDigest: _composition, ...base } = identity;
      const item = { ...base, ...decoded, rawWire: Uint8Array.from(rawWire), cumulativeText, cumulativeComposition, bindingDigest: hash(identity) } as GitIncomingMetadata;
      if (options.tamper === 'parsed' && unit === 'advertisement') Object.assign(item, { parsed: { ...item.parsed, agent: 'asserted-safe' } });
      if (options.tamper === 'chain' && unit === 'ls-refs') Object.assign(item, { previousBindingDigest: null });
      lastEnvelope = item as unknown as Record<string, unknown>;
      const allowed = await input.admitIncomingMetadata(item); if (allowed) { previous = item.bindingDigest; calls.push(`ingest:${unit}`); } return allowed;
    };
    const refusal = () => ({ ok: false, code: 'metadata-admission-refused', reason: 'own-safe-refusal', evidence });
    if (!(await outgoing('connect', profile.connect, kind === 'selection' ? null : 'sha1'))) return refusal();
    const advertisement = Buffer.concat([packet('version 2\n'), packet(`agent=${options.agent ?? 'git/own-fixture'}\n`), packet('ls-refs=\n'), packet('fetch=shallow wait-for-done\n'), packet('object-format=sha1\n'), Buffer.from('0000')]);
    if (!(await incoming('advertisement', advertisement, kind === 'selection' ? null : 'sha1'))) return refusal();
    if (kind === 'selection') {
      if (!(await outgoing('ls-refs', gitLsRefsWire(plan!, 'sha1'), 'sha1'))) return refusal();
      const reference = options.reference ?? (plan!.kind === 'remote-ref' ? plan!.references[0]! : 'refs/heads/trunk');
      const defaultHead = plan!.kind === 'remote-default';
      const refs = Buffer.concat([Buffer.from('0002'), packet(defaultHead ? `${objects.pin} HEAD symref-target:${reference}\n` : `${objects.pin} ${reference}\n`), Buffer.from('00000002')]);
      if (!(await incoming('ls-refs', refs, 'sha1'))) return refusal();
      const selected = selectUrlRevision(plan!, defaultHead ? `ref: ${reference}\tHEAD\n${objects.pin}\tHEAD\n` : `${objects.pin}\t${reference}\n`); if (!selected.ok) return selected;
      return { ok: true, selection: options.tamper === 'selected-return' ? { ...selected.value, identifier: 'f'.repeat(40) } : selected.value, evidence };
    }
    const wire = Buffer.concat([packet('command=fetch\n'), packet('object-format=sha1\n'), Buffer.from('0001'), packet('no-progress\n'), packet(`want ${input.pin}\n`), packet('deepen 1\n'), packet('done\n'), Buffer.from('0000')]);
    if (!(await outgoing('fetch', wire, 'sha1'))) return refusal();
    const header = Buffer.concat([Buffer.from('0002'), packet('shallow-info\n'), packet(`shallow ${input.pin}\n`), Buffer.from('0001'), packet('packfile\n')]);
    if (!(await incoming('fetch-header', header, 'sha1'))) return refusal();
    if (options.tamper !== 'omit-end' && !(await incoming('fetch-end', Buffer.concat([header, Buffer.from('00000002')]), 'sha1'))) return refusal();
    return { ok: true, pack: objects.pack, shallow: options.tamper === 'shallow' ? [] : [input.pin], evidence };
  };
  const ports: Ports = { selectHttps: input => run(input as never, 'selection'), selectSsh: async () => { throw new Error('unexpected-ssh'); }, receiveHttps: input => run(input as never, 'receive'), receiveSsh: async () => { throw new Error('unexpected-ssh'); }, worker: input => { calls.push('worker'); return runGitMemoryWorker(input); } };
  return { request, events, calls, parent, objects, ports, run: () => urlMemoryAcquisitionTestPort(ports)(request), last: () => lastEnvelope };
}

describe('closed URL memory acquisition inputs', () => {
  it('refuses missing trusted policy/current/audit ports before any source operation', async () => {
    for (const input of [{}, { locator: 'https://example.invalid/own-fixture' }, { host: { current: () => true, audit: () => undefined } }]) {
      expect(await acquireUrlSourceInMemory(input as never)).toEqual({ ok: false, code: 'invalid-input', history: [], cleanup: 'not-needed' });
    }
  });
});

describe('URL metadata admission and whole-worker composition', () => {
  it('refuses an active HEAD reference before semantic selection, receive or worker use', async () => {
    const reference = 'refs/heads/<script>', f = fixture({ reference });
    const loaded = buildDossierScreen(f.request.policy.bytes, true, null, 'private'); if (!loaded.ok) throw new Error();
    for (const text of [reference, `${f.objects.pin} HEAD symref-target:${reference}\n`, canonical({ reference })]) {
      expect(loaded.screen.screenSecrets(text)).toBeUndefined(); expect(loaded.screen.screenBody(text)).toBe('active-content');
    }
    const result = await f.run();
    expect(result.ok).toBe(false); expect(f.calls).toContain('send:ls-refs'); expect(f.calls).not.toContain('ingest:ls-refs');
    expect(f.calls).not.toContain('receive'); expect(f.calls).not.toContain('worker'); expect(fs.readdirSync(f.parent)).toEqual([]);
    expect(JSON.stringify(result)).not.toContain(reference); expect(JSON.stringify(f.events)).not.toContain(reference);
  });
  it('refuses active selector and locator fields before a declared attempt or helper call', async () => {
    for (const kind of ['selector', 'locator'] as const) {
      const f = fixture(), reference = 'refs/heads/<script>';
      const request = kind === 'selector' ? { ...f.request, selector: reference } : { ...f.request, locator: 'git@own.example.invalid:private/<script>.git' };
      const result = await urlMemoryAcquisitionTestPort(f.ports)(request);
      expect(result).toMatchObject({ ok: false, code: 'metadata-refused' }); expect(f.calls).toEqual([]);
      expect(f.events.some(event => event.stage === 'declared-attempt' && event.state === 'attempted')).toBe(false);
      expect(f.events).toEqual([]);
      expect(JSON.stringify(result)).not.toContain('<script>');
      expect(fs.readdirSync(f.parent)).toEqual([]);
    }
  });
  it('withholds an initial detector-denied locator from refusal audit as well as helpers (SA-1)', async () => {
    const f = fixture(), canary = 'OWN_LOCATOR_DENY_CANARY', document = JSON.parse(Buffer.from(f.request.policy.bytes).toString());
    document.detectors.push({ id: 'own-denied-locator', kind: 'literal-fragment', values: [canary] });
    const bytes = Buffer.from(JSON.stringify(document));
    const result = await urlMemoryAcquisitionTestPort(f.ports)({ ...f.request, locator: `https://own.example.invalid/${canary}.git`,
      policy: { ...f.request.policy, bytes, sha256: sha256(bytes) }, host: { current: () => true, audit: f.request.host.audit } });
    expect(result).toMatchObject({ ok: false, code: 'metadata-refused', history: [] });
    expect(f.events).toEqual([]); expect(f.calls).toEqual([]); expect(fs.readdirSync(f.parent)).toEqual([]);
    expect(JSON.stringify(result)).not.toContain(canary);
  });
  it('admits an ordinary explicit trunk selector under the unchanged metadata policy', async () => {
    const f = fixture(), result = await urlMemoryAcquisitionTestPort(f.ports)({ ...f.request, selector: 'refs/heads/trunk' });
    expect(result, JSON.stringify(result)).toMatchObject({ ok: true, selection: { reference: 'refs/heads/trunk' } });
    expect(f.calls.filter(call => call === 'selection')).toHaveLength(1); expect(f.calls).toContain('worker');
  });
  it('uses the pure full-pin selector once and makes no selection protocol claim', async () => {
    const f = fixture();
    const result = await urlMemoryAcquisitionTestPort({ ...f.ports, selectHttps: input => { f.calls.push('pure-selection'); return selectGitRevisionOverHttps(input); } })({ ...f.request, selector: f.objects.pin });
    expect(result, JSON.stringify(result)).toHaveProperty('ok', true); if (!result.ok) return;
    expect(f.calls.filter(call => call === 'pure-selection')).toHaveLength(1); expect(f.calls).not.toContain('selection');
    expect(result.metadata.map(item => item.operation)).toEqual(['receive']); expect(result.selection.mode).toBe('full-commit');
  });
  it('derives the closed SSH profile from explicit own-fixture file metadata', async () => {
    const root = tempDir('url-memory-ssh-profile-'), knownHostsPath = path.join(root, 'known-hosts'), key = path.join(root, 'own-identity');
    fs.writeFileSync(knownHostsPath, 'Own synthetic known-host entry.\n', { mode: 0o600 }); fs.writeFileSync(key, 'Own synthetic noncredential identity fixture.\n', { mode: 0o600 });
    const home = path.join(root, 'home'); fs.mkdirSync(home, { mode: 0o700 });
    const profile = await urlMemoryAcquisitionFixtureProfile('git@Own.Example.Invalid:fixture/repository.git', home, { knownHostsPath, authentication: { kind: 'identity-file', path: key } }, 1500);
    expect(profile.destination).toEqual({ scheme: 'ssh', host: 'own.example.invalid', port: 22, user: 'git', repository: 'fixture/repository.git', service: 'git-upload-pack' });
    const args = profile.config['args'] as string[];
    expect(args).toContain('StrictHostKeyChecking=yes'); expect(args).toContain('ProxyCommand=none'); expect(args).toContain('IdentityAgent=none'); expect(args).toContain('PasswordAuthentication=no');
    expect(args.slice(-2)).toEqual(['own.example.invalid', "git-upload-pack 'fixture/repository.git'"]);
    fs.chmodSync(key, 0o644);
    await expect(urlMemoryAcquisitionFixtureProfile('git@own.example.invalid:fixture/repository.git', home, { knownHostsPath, authentication: { kind: 'identity-file', path: key } }, 1500)).rejects.toThrow();
  });
  it('selects once, admits complete metadata, and stores only after the durable closure audit', async () => {
    const f = fixture();
    const originalAudit = f.request.host.audit;
    const request = { ...f.request, host: { ...f.request.host, audit: async (event: UrlMemoryAudit) => {
      if (event.worker?.stage === 'whole-closure-admitted') {
        const worker = fs.readdirSync(f.parent).map(name => path.join(f.parent, name, 'worker')).find(name => fs.existsSync(name));
        expect(worker).toBeDefined(); expect(fs.readdirSync(worker!)).toEqual([]);
      }
      await originalAudit(event);
    } } };
    const result = await urlMemoryAcquisitionTestPort(f.ports)(request);
    expect(result, JSON.stringify(result)).toHaveProperty('ok', true); if (!result.ok) return;
    expect(f.calls.filter(call => call === 'selection')).toHaveLength(1); expect(f.calls.filter(call => call === 'receive')).toHaveLength(1);
    expect(f.calls.indexOf('worker')).toBeGreaterThan(f.calls.indexOf('ingest:fetch-end'));
    expect(fs.readdirSync(result.clone)).toEqual(['.git']); expect(fs.readFileSync(path.join(result.clone, '.git', 'HEAD'), 'utf8').trim()).toBe(f.objects.pin);
    expect(result.context.provisionalRun).toMatch(/^provisional-acq-[a-f0-9]{32}$/u); expect(result.metadata).toHaveLength(2);
    expect(f.objects.pack.every(byte => byte === 0)).toBe(true);
    expect(JSON.stringify(result)).not.toContain('Own nonsecret documentation');
  });
  it.each(['proxy', 'provider', 'parsed', 'chain', 'selected-return', 'command', 'shallow', 'omit-end'])('refuses %s tampering before worker persistence', async tamper => {
    const f = fixture({ tamper }), result = await f.run();
    expect(result.ok).toBe(false); expect(f.calls).not.toContain('worker'); expect(fs.readdirSync(f.parent)).toEqual([]);
    if (tamper === 'proxy' || tamper === 'provider') expect(f.calls).not.toContain('send:connect');
    if (tamper === 'parsed') expect(f.calls).not.toContain('send:ls-refs');
  });
  it('screens complete raw and decoded incoming fields and cross-field compositions', async () => {
    const secret = 'AKIA' + 'A'.repeat(16), f = fixture({ agent: secret });
    const result = await f.run(); expect(result.ok).toBe(false); expect(f.calls).not.toContain('send:ls-refs'); expect(f.calls).not.toContain('worker');
    expect(JSON.stringify(result)).not.toContain(secret); expect(JSON.stringify(f.events)).not.toContain(secret);
    // Neither lexical field is itself a detector match; concatenation is.
    for (const [agent, expected] of [['OWN_SAFE_AGENT', true], ['AKIA', false]] as const) {
      const decoded = fixture({ agent }), doc = JSON.parse(Buffer.from(decoded.request.policy.bytes).toString());
      doc.detectors.push({ id: 'own-decoded-field-composition', kind: 'regular-expression', pattern: 'AKIAls-refs', flags: '' });
      const bytes = Buffer.from(JSON.stringify(doc));
      const outcome = await urlMemoryAcquisitionTestPort(decoded.ports)({ ...decoded.request, policy: { ...decoded.request.policy, bytes, sha256: sha256(bytes) }, host: { current: () => true, audit: decoded.request.host.audit } });
      expect(outcome.ok).toBe(expected); if (!expected) { expect(decoded.calls).not.toContain('send:ls-refs'); expect(decoded.calls).not.toContain('worker'); }
    }
    const scoped = fixture(); const json = JSON.parse(Buffer.from(scoped.request.policy.bytes).toString());
    json.detectors.push({ id: 'own-locator-selector-composition', kind: 'regular-expression', pattern: '\\.gitOWN_SPLIT_CANARY', flags: '' });
    const scope = Buffer.from(JSON.stringify(json));
    const denied = await urlMemoryAcquisitionTestPort(scoped.ports)({ ...scoped.request, selector: 'OWN_SPLIT_CANARY', policy: { ...scoped.request.policy, bytes: scope, sha256: sha256(scope) }, host: { current: () => true, audit: scoped.request.host.audit } });
    expect(denied.ok).toBe(false); expect(scoped.calls).toEqual([]);
  });
  it('screens the encoded known outgoing envelope before its send effect', async () => {
    const f = fixture(), doc = JSON.parse(Buffer.from(f.request.policy.bytes).toString());
    doc.detectors.push({ id: 'own-encoded-envelope', kind: 'literal-fragment', values: ['"stage":"connect"'] });
    const bytes = Buffer.from(JSON.stringify(doc));
    const result = await urlMemoryAcquisitionTestPort(f.ports)({ ...f.request, policy: { ...f.request.policy, bytes, sha256: sha256(bytes) }, host: { current: () => true, audit: f.request.host.audit } });
    expect(result).toMatchObject({ ok: false, code: 'metadata-refused' }); expect(f.calls).not.toContain('send:connect'); expect(f.calls).not.toContain('worker');
  });
  it('compares a supplied clone with the once-selected remote pin without fetching or changing it', async () => {
    const made = fixture(), first = await made.run(); expect(first.ok).toBe(true); if (!first.ok) return;
    const census = (): string => hash(fs.readdirSync(first.clone, { recursive: true }).map(name => {
      const full = path.join(first.clone, String(name)), stat = fs.lstatSync(full);
      return { name, mode: stat.mode, digest: stat.isFile() ? sha256(fs.readFileSync(full)) : null };
    }));
    const before = census(), supplied = fixture();
    const result = await urlMemoryAcquisitionTestPort(supplied.ports)({ ...supplied.request, suppliedClone: first.clone });
    expect(result).toMatchObject({ ok: true, supplied: true, clone: first.clone, workspace: null, worker: null });
    expect(supplied.calls.filter(call => call === 'selection')).toHaveLength(1); expect(supplied.calls).not.toContain('receive'); expect(supplied.calls).not.toContain('worker');
    expect(census()).toBe(before); expect(fs.readdirSync(supplied.parent)).toEqual([]);
    const mismatch = fixture({ body: 'A different own fixture body.\n' });
    expect(await urlMemoryAcquisitionTestPort(mismatch.ports)({ ...mismatch.request, suppliedClone: first.clone })).toMatchObject({ ok: false, code: 'clone-refused', cleanup: 'removed' });
    expect(mismatch.calls).not.toContain('receive'); expect(census()).toBe(before);
  });
  it('bounds unacknowledged audit, refuses invalid bounds, and retains a unique workspace when termination is Unknown', async () => {
    const stalled = fixture(), began = performance.now();
    const stopped = await urlMemoryAcquisitionTestPort(stalled.ports)({ ...stalled.request, limits: { milliseconds: 30 }, host: { current: () => true, audit: () => new Promise(() => undefined) } });
    expect(stopped).toMatchObject({ ok: false, code: 'audit-failed', cleanup: 'not-needed' }); expect(performance.now() - began).toBeLessThan(1500); expect(stalled.calls).toEqual([]);
    for (const limits of [{ milliseconds: Infinity }, { packBytes: 0 }, { wireBytes: GIT_MEMORY_LIMITS.wireBytes + 1 }, { ownUnknown: 1 }]) {
      const bad = fixture(); expect((await urlMemoryAcquisitionTestPort(bad.ports)({ ...bad.request, limits: limits as never })).ok).toBe(false); expect(bad.calls).toEqual([]);
    }
    const unknown = fixture();
    const result = await urlMemoryAcquisitionTestPort({ ...unknown.ports, selectHttps: async () => { throw new Error('OWN_UNSAFE_PROCESS_STATE'); } })(unknown.request);
    expect(result).toMatchObject({ ok: false, code: 'operation-failed', cleanup: 'Unknown' }); if (result.ok || !result.retainedWorkspace) return;
    expect(fs.existsSync(result.retainedWorkspace)).toBe(true); expect(result.history.at(-1)?.state).toBe('Unknown'); expect(unknown.events.at(-1)?.state).toBe('Unknown');
    expect(JSON.stringify(result)).not.toContain('OWN_UNSAFE_PROCESS_STATE');
  });
  it('detects removed configuration, current, callback-byte, terminal-metadata and active-content guards', async () => {
    const sourcePath = fileURLToPath(new URL('./url-memory-acquisition.ts', import.meta.url)), source = fs.readFileSync(sourcePath, 'utf8');
    const evidenceRoot = process.env['SYZYGY_URL_MEMORY_EVIDENCE'];
    if (evidenceRoot !== undefined) {
      expect(path.resolve(evidenceRoot)).toBe(evidenceRoot); expect(evidenceRoot.startsWith('/home/orca/.tmp/')).toBe(true);
      fs.mkdirSync(evidenceRoot, { recursive: true, mode: 0o700 }); fs.writeFileSync(path.join(evidenceRoot, 'url-memory-acquisition.ts'), source);
    }
    const evidence: unknown[] = [];
    const changes = [
      { name: 'configuration', old: '|| wireSnapshot(item) !== wireSnapshot({ ...identity, wire: item.wire, config: prepared.config, bindingDigest: hash(identity) })', replacement: '', tamper: 'proxy' },
      { name: 'post-audit-current', old: "if (!(await current())) { code = 'binding-stale'; history.push({ ...item, state: 'Unknown' }); return false; }", replacement: '', tamper: 'stale' },
      { name: 'post-audit-bytes', old: '|| wireSnapshot(item) !== before', replacement: '', tamper: 'wire' },
      { name: 'terminal-metadata', old: "if (outgoingCount !== 2 || incomingCount !== (kind === 'selection' ? 2 : 3)) { code = 'metadata-refused'; return null; }", replacement: '', tamper: 'omit-end' },
      { name: 'active-content', old: 'screen.screenBody(', replacement: 'screen.screenSecrets(', tamper: 'active-reference' },
      { name: 'encoded-envelope', old: '&& screen.screenBody(canonical(encoded)) === undefined', replacement: '', tamper: 'encoded-envelope' },
    ];
    const cleanBundle = path.join(tempDir('url-memory-clean-'), 'clean.mjs');
    await capturedBuild('api', { stdin: { contents: source, resolveDir: path.dirname(sourcePath), sourcefile: sourcePath, loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', conditions: ['source'], banner: { js: GIT_MEMORY_WORKER_BUNDLE_BANNER }, outfile: cleanBundle });
    const clean = await import(pathToFileURL(cleanBundle).href) as typeof import('./url-memory-acquisition.js');
    for (const change of changes) {
      expect(source.split(change.old)).toHaveLength(change.name === 'active-content' ? 4 : change.name === 'post-audit-bytes' ? 3 : 2);
      const code = change.name === 'active-content' ? source.replaceAll(change.old, change.replacement) : source.replace(change.old, change.replacement), bundle = path.join(tempDir('url-memory-mutant-'), `${change.name}.mjs`);
      await capturedBuild(change.name, { stdin: { contents: code, resolveDir: path.dirname(sourcePath), sourcefile: sourcePath, loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', conditions: ['source'], banner: { js: GIT_MEMORY_WORKER_BUNDLE_BANNER }, outfile: bundle });
      const changed = await import(pathToFileURL(bundle).href) as typeof import('./url-memory-acquisition.js');
      const invoke = async (implementation: typeof urlMemoryAcquisitionTestPort) => {
        const f = fixture(change.tamper === 'active-reference' ? { reference: 'refs/heads/<script>' } : { tamper: change.tamper === 'stale' || change.tamper === 'wire' ? undefined : change.tamper }); let current = true;
        let policy = f.request.policy;
        if (change.tamper === 'encoded-envelope') {
          const doc = JSON.parse(Buffer.from(policy.bytes).toString()); doc.detectors.push({ id: 'own-encoded-envelope', kind: 'literal-fragment', values: ['"stage":"connect"'] });
          const bytes = Buffer.from(JSON.stringify(doc)); policy = { ...policy, bytes, sha256: sha256(bytes) };
        }
        const request = { ...f.request, policy, host: { current: () => current, audit: (event: UrlMemoryAudit) => {
          if (event.direction === 'presend') {
            if (change.tamper === 'stale') current = false;
            if (change.tamper === 'wire') (f.last()!['wire'] as Uint8Array)[0] = (f.last()!['wire'] as Uint8Array)[0]! ^ 1;
          }
        } } };
        return { fixture: f, result: await implementation(f.ports)(request) };
      };
      const control = await invoke(clean.urlMemoryAcquisitionTestPort), mutant = await invoke(changed.urlMemoryAcquisitionTestPort);
      expect(control.result.ok).toBe(false);
      const effect = change.name === 'terminal-metadata' || change.name === 'active-content' ? 'worker' : 'send:connect';
      expect(control.fixture.calls).not.toContain(effect); expect(mutant.fixture.calls).toContain(effect);
      if (change.name === 'configuration' || change.name === 'terminal-metadata' || change.name === 'active-content' || change.name === 'encoded-envelope') expect(mutant.result.ok).toBe(true);
      if (evidenceRoot !== undefined) {
        fs.writeFileSync(path.join(evidenceRoot, `${change.name}.ts`), code); fs.copyFileSync(bundle, path.join(evidenceRoot, `${change.name}.mjs`));
      }
      evidence.push({ name: change.name, old: change.old, new: change.replacement, subjectSha256: sha256(source), mutantSha256: sha256(code), bundleSha256: sha256(fs.readFileSync(bundle)),
        predicate: `No ${effect} effect when ${change.tamper} is refused`, control: { ok: control.result.ok, calls: control.fixture.calls }, mutant: { ok: mutant.result.ok, calls: mutant.fixture.calls } });
    }
    if (evidenceRoot !== undefined) fs.writeFileSync(path.join(evidenceRoot, 'mutations.json'), JSON.stringify(evidence, null, 2) + '\n');
  }, 15000);
  it('checks current bindings before and after audit, and detects actual callback buffer mutation', async () => {
    for (const mutation of ['stale', 'audit-throw', 'wire'] as const) {
      const f = fixture(); let current = true;
      const result = await urlMemoryAcquisitionTestPort(f.ports)({ ...f.request, host: { current: () => current, audit: event => {
        f.events.push(event);
        if (event.direction === 'presend') {
          if (mutation === 'stale') current = false;
          if (mutation === 'audit-throw') throw new Error('OWN_PRIVATE_AUDIT_DIAGNOSTIC');
          if (mutation === 'wire') (f.last()!['wire'] as Uint8Array)[0] = (f.last()!['wire'] as Uint8Array)[0]! ^ 1;
        }
      } } });
      expect(result.ok).toBe(false); expect(f.calls).not.toContain('send:connect'); expect(f.calls).not.toContain('worker'); expect(fs.readdirSync(f.parent)).toEqual([]);
      expect(JSON.stringify(result)).not.toContain('OWN_PRIVATE_AUDIT_DIAGNOSTIC');
    }
    const incoming = fixture();
    const result = await urlMemoryAcquisitionTestPort(incoming.ports)({ ...incoming.request, host: { current: () => true, audit: event => {
      if (event.direction === 'ingest') { const bytes = incoming.last()!['rawWire'] as Uint8Array; bytes[0] = bytes[0]! ^ 1; }
    } } });
    expect(result.ok).toBe(false); expect(incoming.calls).toContain('send:connect'); expect(incoming.calls).not.toContain('send:ls-refs'); expect(incoming.calls).not.toContain('worker');
  });
  it('records protected hash-only exclusions, refuses safely, wipes PACK, and cleans an admitted residual', async () => {
    const secret = 'AKIA' + 'A'.repeat(16), f = fixture({ body: secret }), result = await f.run();
    expect(result).toMatchObject({ ok: false, code: 'worker-refused', cleanup: 'removed' }); expect(fs.readdirSync(f.parent)).toEqual([]);
    expect(f.events.find(event => event.worker?.stage === 'acquisition-excluded')?.worker?.exclusions.length).toBeGreaterThan(0);
    expect(JSON.stringify(result)).not.toContain(secret); expect(JSON.stringify(result)).not.toContain(sha256(secret)); expect(f.objects.pack.every(byte => byte === 0)).toBe(true);
    const late = fixture(); const failed = await urlMemoryAcquisitionTestPort(late.ports)({ ...late.request, host: { ...late.request.host, audit: event => { if (event.stage === 'complete') throw new Error('own-late-failure'); } } });
    expect(failed).toMatchObject({ ok: false, code: 'audit-failed', cleanup: 'removed' }); expect(fs.readdirSync(late.parent)).toEqual([]);
  });
});
