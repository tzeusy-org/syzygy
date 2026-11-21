import * as fs from 'node:fs';
import { open, type FileHandle } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildSync } from 'esbuild';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { sha256 } from '@syzygy/support';
import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { policyFixture } from './full-run.testkit.js';
import { urlSourceTransportIdentity } from './url-run-record.js';
import { GIT_MEMORY_WORKER_BUNDLE_BANNER, GIT_MEMORY_WORKER_LIMITS, GIT_MEMORY_WORKER_PROFILE } from './git-memory-worker.js';
import { createSourceAcquisitionAudit, type SourceAcquisitionAuditRequest } from './source-acquisition-audit.js';
import { buildDossierScreen } from './screen.js';
import type { UrlMemoryAudit } from './url-memory-acquisition.js';

const hash = (value: unknown): string => sha256(encodeCanonicalJson(value, { maxBytes: 262_144, maxNodes: 16_384, maxDepth: 20 }));
afterEach(() => vi.restoreAllMocks());
function fixture(detector?: { readonly kind: string; readonly [key: string]: unknown }, locator = 'https://own.example.invalid/private/source-path.git') {
  const root = tempDir('source-audit-fixture-'), parent = path.join(root, 'protected'); fs.mkdirSync(parent, { mode: 0o700 });
  let bytes = policyFixture().bytes;
  if (detector) { const parsed = JSON.parse(Buffer.from(bytes).toString()); parsed.detectors.push({ id: 'own-audit-detector', ...detector }); bytes = Buffer.from(JSON.stringify(parsed)); }
  const origin = Buffer.from('{"own":"origin-policy-fixture"}');
  const request: SourceAcquisitionAuditRequest = { parent, name: 'acquisition.jsonl', locator,
    policy: { bytes, sha256: sha256(bytes), originBytes: origin, originSha256: sha256(origin), visibility: 'private' },
    program: { nodeSha256: 'c'.repeat(64), bundleSha256: 'd'.repeat(64) }, current: () => true };
  const source = urlSourceTransportIdentity(request.locator); if (!source.ok) throw new Error();
  const make = (pin: string | null = null): UrlMemoryAudit => ({ stage: 'declared-attempt', direction: 'local', state: 'attempted', metadataSha256: null,
    context: { acquisition: 'acq-' + '1'.repeat(32), provisionalRun: 'provisional-acq-' + '1'.repeat(32), sourceProvider: source.providerId, destination: source.destination,
      locatorSha256: sha256(request.locator), selectorSha256: null, selectedCommit: pin,
      sourceBinding: hash({ destination: source.destination, provider: source.providerId, selectedCommit: pin, policySha256: request.policy.sha256, originPolicySha256: request.policy.originSha256 }),
      policySha256: request.policy.sha256, originPolicySha256: request.policy.originSha256 } });
  const worker = (): UrlMemoryAudit => {
    const event = make('e'.repeat(40));
    return { ...event, stage: 'whole-closure', state: 'refused', metadataSha256: 'f'.repeat(64), worker: { stage: 'acquisition-excluded',
      binding: { run: event.context.provisionalRun, acquisition: event.context.acquisition, sourceBinding: event.context.sourceBinding, policySha256: event.context.policySha256, originPolicySha256: event.context.originPolicySha256 },
      contextSha256: 'f'.repeat(64), profile: GIT_MEMORY_WORKER_PROFILE, program: request.program, limits: GIT_MEMORY_WORKER_LIMITS, receipt: null,
      exclusions: [{ species: 'blob-alias', locationSha256: 'a'.repeat(64), contentSha256: 'b'.repeat(64), policySha256: request.policy.sha256, originPolicySha256: request.policy.originSha256, outcome: 'secret-detector-match' }] } };
  };
  return { root, parent, request, make, worker, file: path.join(parent, request.name) };
}
async function handlePrototype(): Promise<Record<string, any>> {
  const file = path.join(tempDir('source-audit-prototype-'), 'own-probe'), handle = await open(file, 'wx+', 0o600);
  const prototype = Object.getPrototypeOf(handle); await handle.close(); return prototype;
}
const sortJson = (value: any): any => Array.isArray(value) ? value.map(sortJson) : value !== null && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, sortJson(value[key])])) : value;

describe('protected acquisition audit inputs', () => {
  it('refuses missing independent source/policy/program/current context with a fixed error', async () => {
    expect(await createSourceAcquisitionAudit({} as never)).toEqual({ ok: false, code: 'source-audit-unavailable' });
  });
});

describe('protected acquisition audit segment', () => {
  it('refuses active-content source metadata under the unchanged extension-independent screen', async () => {
    const f = fixture(), locator = 'git@own.example.invalid:private/<script>.git';
    expect(urlSourceTransportIdentity(locator).ok).toBe(true);
    const loaded = buildDossierScreen(f.request.policy.bytes, true, null, 'private'); if (!loaded.ok) throw new Error();
    expect(loaded.screen.screenSecrets(locator)).toBeUndefined(); expect(loaded.screen.screenBody(locator)).toBe('active-content');
    expect(await createSourceAcquisitionAudit({ ...f.request, locator })).toEqual({ ok: false, code: 'source-audit-unavailable' });
    expect(fs.existsSync(f.file)).toBe(false);
  });
  it('durably appends a hash chain with a closed projection and no raw path, commit or acquisition identifier', async () => {
    const f = fixture(), writer = await createSourceAcquisitionAudit(f.request); expect(writer.ok).toBe(true); if (!writer.ok) return;
    expect(fs.statSync(f.file).mode & 0o777).toBe(0o600);
    const prototype = await handlePrototype(), sync = vi.spyOn(prototype, 'sync');
    await writer.audit(f.make()); await writer.audit(f.worker());
    const excluded = f.worker(), admitted: UrlMemoryAudit = { ...excluded, state: 'admitted', metadataSha256: '9'.repeat(64), worker: { ...excluded.worker!,
      stage: 'whole-closure-admitted', contextSha256: '9'.repeat(64), exclusions: [], receipt: { commit: excluded.context.selectedCommit!, objectFormat: 'sha1', objectCount: 3, retainedBytes: 250,
        policySha256: f.request.policy.sha256, originPolicySha256: f.request.policy.originSha256, classes: ['code-structure', 'project-documentation'], identitiesSha256: '8'.repeat(64) } } };
    await writer.audit(admitted); expect(sync).toHaveBeenCalledTimes(3);
    const text = fs.readFileSync(f.file, 'utf8'), records = text.trim().split('\n').map(line => JSON.parse(line));
    expect(records).toHaveLength(3); expect(records[0].previousSha256).toBe(null); expect(records[1].previousSha256).toBe(records[0].sha256); expect(records[2].previousSha256).toBe(records[1].sha256);
    for (const [index, record] of records.entries()) {
      const { sha256: claimed, ...body } = record;
      expect(record.sequence).toBe(index + 1); expect(createHash('sha256').update(JSON.stringify(sortJson(body))).digest('hex')).toBe(claimed);
    }
    for (const raw of [f.request.locator, '/private/source-path.git', f.make().context.acquisition, 'e'.repeat(40)]) expect(text).not.toContain(raw);
    expect(records[1].event.worker.exclusions).toHaveLength(1); expect(records[1].event.worker.exclusions[0].contentSha256).toBe('b'.repeat(64));
    expect(records[2].event.worker.receipt.commitSha256).toBe(sha256('e'.repeat(40)));
    expect(await writer.close()).toMatchObject({ closed: true, poisoned: false, durableEvents: 3, durableBytes: Buffer.byteLength(text), tail: 'complete' });
    await expect(writer.audit(f.make())).rejects.toThrow('source-audit-refused');
  });
  it.each(['unknown-field', 'worker-path', 'wrong-provider', 'wrong-policy', 'wrong-program', 'wrong-pin', 'excluded-size'])('rejects %s and permanently poisons without persisting input', async kind => {
    const f = fixture(), writer = await createSourceAcquisitionAudit(f.request); if (!writer.ok) throw new Error();
    const event = structuredClone(kind.startsWith('worker') || kind === 'wrong-program' || kind === 'excluded-size' ? f.worker() : f.make());
    if (kind === 'unknown-field') Object.assign(event, { body: 'OWN_EXCLUDED_BODY_CANARY' });
    if (kind === 'worker-path') Object.assign(event.worker!, { path: '/OWN_EXCLUDED_PATH' });
    if (kind === 'wrong-provider') Object.assign(event.context, { sourceProvider: 'git-source:' + '0'.repeat(64) });
    if (kind === 'wrong-policy') Object.assign(event.context, { originPolicySha256: '0'.repeat(64) });
    if (kind === 'wrong-program') Object.assign(event.worker!.program, { bundleSha256: '0'.repeat(64) });
    if (kind === 'wrong-pin') Object.assign(event.context, { selectedCommit: '0'.repeat(40) });
    if (kind === 'excluded-size') Object.assign(event.worker!.exclusions[0]!, { bytes: 123 });
    await expect(writer.audit(event)).rejects.toThrow('source-audit-refused'); expect(fs.readFileSync(f.file, 'utf8')).toBe('');
    await expect(writer.audit(f.make())).rejects.toThrow('source-audit-refused'); expect(writer.summary()).toMatchObject({ poisoned: true, tail: 'Unknown', durableEvents: 0 }); await writer.close();
  });
  it.each(['stage', 'direction', 'state', 'worker-stage', 'worker-outcome', 'exclusion-species', 'exclusion-outcome'])('requires a string for the %s enum before any durable append (LA-1)', async field => {
    for (const nested of [false, true]) {
      const f = fixture();
      const event = field.startsWith('worker-') || field.startsWith('exclusion-') ? f.worker()
        : field === 'direction' ? { ...f.make(), stage: 'selection' as const, direction: 'presend' as const, state: 'admitted' as const, metadataSha256: 'a'.repeat(64) } : f.make();
      if (field === 'worker-outcome') Object.assign(event.worker!, { stage: 'worker-refused', outcome: 'worker-refused' });
      const control = await createSourceAcquisitionAudit({ ...f.request, name: `valid-${field}-${nested}.jsonl` });
      if (!control.ok) throw new Error();
      await control.audit(event); expect(await control.close()).toMatchObject({ poisoned: false, durableEvents: 1, tail: 'complete' });
      const writer = await createSourceAcquisitionAudit(f.request); if (!writer.ok) throw new Error();
      const changed = structuredClone(event);
      const target: Record<string, unknown> = field.startsWith('worker-') ? changed.worker! as unknown as Record<string, unknown>
        : field.startsWith('exclusion-') ? changed.worker!.exclusions[0]! as unknown as Record<string, unknown> : changed as unknown as Record<string, unknown>;
      const key = field.replace(/^(?:worker|exclusion)-/u, '');
      target[key] = nested ? [[target[key]]] : [target[key]];
      try {
        await expect(writer.audit(changed)).rejects.toThrow('source-audit-refused');
        expect(fs.readFileSync(f.file, 'utf8')).toBe('');
        await expect(writer.audit(event)).rejects.toThrow('source-audit-refused');
        expect(writer.summary()).toMatchObject({ poisoned: true, durableEvents: 0, tail: 'Unknown' });
      } finally { await writer.close(); }
    }
  });
  it('screens each decoded field, its composition and the final encoded record before append', async () => {
    for (const detector of [
      { kind: 'literal-fragment', values: ['a'.repeat(64)] },
      { kind: 'regular-expression', pattern: 'metadataSha256a{64}', flags: '' },
      { kind: 'literal-fragment', values: ['"format":"source-acquisition-audit/1"'] },
    ]) {
      const f = fixture(detector), writer = await createSourceAcquisitionAudit(f.request); expect(writer.ok).toBe(true); if (!writer.ok) return;
      await expect(writer.audit({ ...f.make(), stage: 'selection', direction: 'presend', state: 'admitted', metadataSha256: 'a'.repeat(64) })).rejects.toThrow('source-audit-refused');
      expect(fs.readFileSync(f.file, 'utf8')).toBe(''); await writer.close();
    }
  });
  it.each(['unlink-replace', 'same-size-overwrite', 'parent-replace', 'chmod'])('detects %s tampering before another acknowledgment', async mutation => {
    const f = fixture(), writer = await createSourceAcquisitionAudit(f.request); if (!writer.ok) throw new Error(); await writer.audit(f.make());
    if (mutation === 'unlink-replace') { fs.renameSync(f.file, f.file + '.old'); fs.writeFileSync(f.file, '', { mode: 0o600 }); }
    if (mutation === 'same-size-overwrite') { const bytes = fs.readFileSync(f.file); bytes[10] = bytes[10]! ^ 1; fs.writeFileSync(f.file, bytes); }
    if (mutation === 'parent-replace') { fs.renameSync(f.parent, f.parent + '-old'); fs.mkdirSync(f.parent, { mode: 0o700 }); }
    if (mutation === 'chmod') fs.chmodSync(f.file, 0o640);
    await expect(writer.audit({ ...f.make(), stage: 'selection' })).rejects.toThrow('source-audit-refused'); expect(writer.summary().durableEvents).toBe(1); await writer.close();
  });
  it('poisons partial writes and fsync failures and never reconnects or replays a valid event', async () => {
    for (const failure of ['partial', 'sync'] as const) {
      const f = fixture(), writer = await createSourceAcquisitionAudit(f.request); if (!writer.ok) throw new Error();
      const prototype = await handlePrototype();
      if (failure === 'partial') {
        const original = prototype['write']; vi.spyOn(prototype, 'write').mockImplementationOnce(async function(this: FileHandle, ...args: any[]) {
          await original.call(this, args[0], args[1], 12, args[3]); throw new Error('OWN_PRIVATE_WRITE_DIAGNOSTIC');
        });
      } else vi.spyOn(prototype, 'sync').mockRejectedValueOnce(new Error('OWN_PRIVATE_SYNC_DIAGNOSTIC'));
      await expect(writer.audit(f.make())).rejects.toThrow(/^source-audit-refused$/u);
      const before = fs.readFileSync(f.file); expect(before.length).toBeGreaterThan(0); expect(writer.summary()).toMatchObject({ durableEvents: 0, poisoned: true, tail: 'Unknown' });
      await expect(writer.audit(f.make())).rejects.toThrow('source-audit-refused'); expect(fs.readFileSync(f.file)).toEqual(before); vi.restoreAllMocks(); await writer.close();
    }
  });
  it('refuses stale or unacknowledged current policy, bounded capacity, duplicate events and pin rollback', async () => {
    const unavailable = fixture(); expect(await createSourceAcquisitionAudit({ ...unavailable.request, current: () => false })).toEqual({ ok: false, code: 'source-audit-unavailable' }); expect(fs.existsSync(unavailable.file)).toBe(false);
    const hanging = fixture(), began = performance.now(); expect((await createSourceAcquisitionAudit({ ...hanging.request, limits: { milliseconds: 20 }, current: () => new Promise(() => undefined) })).ok).toBe(false); expect(performance.now() - began).toBeLessThan(1500);
    for (const kind of ['events', 'bytes', 'duplicate', 'rollback']) {
      const f = fixture(), writer = await createSourceAcquisitionAudit({ ...f.request, limits: kind === 'events' ? { events: 1 } : kind === 'bytes' ? { segmentBytes: 10 } : {} }); if (!writer.ok) throw new Error();
      if (kind === 'bytes') await expect(writer.audit(f.make())).rejects.toThrow('source-audit-refused');
      else { await writer.audit(kind === 'rollback' ? f.make('e'.repeat(40)) : f.make()); await expect(writer.audit(kind === 'events' ? { ...f.make(), stage: 'selection' } : f.make())).rejects.toThrow('source-audit-refused'); }
      expect(writer.summary().poisoned).toBe(true); await writer.close();
    }
  });
  it('snapshots events and refuses a policy change after fsync or a saturated pending queue', async () => {
    const f = fixture(), writer = await createSourceAcquisitionAudit(f.request); if (!writer.ok) throw new Error();
    const event = structuredClone(f.make()), append = writer.audit(event); Object.assign(event.context, { sourceProvider: 'OWN_POST_CALL_MUTANT' });
    await append; expect(fs.readFileSync(f.file, 'utf8')).not.toContain('OWN_POST_CALL_MUTANT'); await writer.close();
    const stale = fixture(); let current = true;
    const changed = await createSourceAcquisitionAudit({ ...stale.request, current: () => current }); if (!changed.ok) throw new Error();
    const prototype = await handlePrototype(), sync = prototype['sync'];
    vi.spyOn(prototype, 'sync').mockImplementationOnce(async function(this: FileHandle) { await sync.call(this); current = false; });
    await expect(changed.audit(stale.make())).rejects.toThrow('source-audit-refused'); expect(changed.summary()).toMatchObject({ poisoned: true, durableEvents: 1 }); vi.restoreAllMocks(); await changed.close();
    const queued = fixture(); let calls = 0;
    const saturated = await createSourceAcquisitionAudit({ ...queued.request, limits: { milliseconds: 30 }, current: () => ++calls <= 2 ? true : new Promise(() => undefined) }); if (!saturated.ok) throw new Error();
    const results = await Promise.allSettled(Array.from({ length: 9 }, () => saturated.audit(queued.make())));
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(9); expect(fs.readFileSync(queued.file, 'utf8')).toBe(''); await saturated.close();
  });
  it('refuses an existing segment, symlink, nonprivate parent and over-limit event without replacing protected bytes', async () => {
    for (const kind of ['exists', 'symlink', 'parent']) {
      const f = fixture(), target = path.join(f.root, 'own-preserved'); fs.writeFileSync(target, 'OWN_PRESERVED_CANARY');
      if (kind === 'exists') fs.writeFileSync(f.file, 'OWN_EXISTING_SEGMENT');
      if (kind === 'symlink') fs.symlinkSync(target, f.file);
      if (kind === 'parent') fs.chmodSync(f.parent, 0o750);
      expect((await createSourceAcquisitionAudit(f.request)).ok).toBe(false); expect(fs.readFileSync(target, 'utf8')).toBe('OWN_PRESERVED_CANARY');
      if (kind === 'exists') expect(fs.readFileSync(f.file, 'utf8')).toBe('OWN_EXISTING_SEGMENT');
    }
    const huge = fixture(), writer = await createSourceAcquisitionAudit(huge.request); if (!writer.ok) throw new Error();
    await expect(writer.audit({ ...huge.make(), unexpected: 'x'.repeat(262_145) } as never)).rejects.toThrow('source-audit-refused'); expect(fs.readFileSync(huge.file, 'utf8')).toBe(''); await writer.close();
  });
  it('kills schema, fsync, named-file identity and composition guard mutations with corresponding clean controls', async () => {
    const sourcePath = fileURLToPath(new URL('./source-acquisition-audit.ts', import.meta.url)), source = fs.readFileSync(sourcePath, 'utf8');
    const identity = "for (const stat of [await file!.stat({ bigint: true }), await lstat(full, { bigint: true })]) {\n        if (!stat.isFile() || stat.dev !== fileStat.dev || stat.ino !== fileStat.ino || stat.uid !== fileStat.uid || stat.mode !== fileStat.mode || stat.nlink !== 1n\n          || stat.size !== BigInt(expectedPrefix.length) || stat.mtimeNs !== expectedModified || stat.ctimeNs !== expectedChanged) refuse();\n      }";
    const changes = [
      { name: 'closed-schema', old: "!exact(event, ['stage', 'direction', 'state', 'context', 'metadataSha256', ...(withWorker ? ['worker'] : [])])\n    || ", replacement: '' },
      { name: 'durable-fsync', old: 'await file!.sync(); guard();', replacement: 'guard();' },
      { name: 'named-file-identity', old: identity, replacement: '' },
      { name: 'decoded-composition', old: "|| screen.screenBody(fields.join('')) !== undefined", replacement: '' },
      { name: 'active-content', old: 'screen.screenBody(', replacement: 'screen.screenSecrets(' },
      { name: 'enum-typing', old: "typeof value === 'string' && choices.includes(value)", replacement: 'choices.includes(String(value))' },
    ];
    const evidenceRoot = process.env['SYZYGY_SOURCE_AUDIT_EVIDENCE'];
    if (evidenceRoot) { expect(path.resolve(evidenceRoot)).toBe(evidenceRoot); expect(evidenceRoot.startsWith('/home/orca/.tmp/')).toBe(true); fs.mkdirSync(evidenceRoot, { recursive: true, mode: 0o700 }); fs.writeFileSync(path.join(evidenceRoot, 'source-acquisition-audit.ts'), source); }
    const evidence: unknown[] = [];
    for (const change of changes) {
      expect(source.split(change.old)).toHaveLength(change.name === 'active-content' ? 4 : 2);
      const code = change.name === 'active-content' ? source.replaceAll(change.old, change.replacement) : source.replace(change.old, change.replacement), bundle = path.join(tempDir('source-audit-mutant-'), change.name + '.mjs');
      buildSync({ stdin: { contents: code, resolveDir: path.dirname(sourcePath), sourcefile: sourcePath, loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', conditions: ['source'], banner: { js: GIT_MEMORY_WORKER_BUNDLE_BANNER }, outfile: bundle });
      const mutant = await import(pathToFileURL(bundle).href) as typeof import('./source-acquisition-audit.js');
      const invoke = async (create: typeof createSourceAcquisitionAudit) => {
        const f = fixture(change.name === 'decoded-composition' ? { kind: 'regular-expression', pattern: 'metadataSha256a{64}', flags: '' } : undefined,
          change.name === 'active-content' ? 'git@own.example.invalid:private/<script>.git' : undefined);
        const writer = await create(f.request);
        if (!writer.ok && change.name === 'active-content') return { accepted: false, durableEvents: 0, namedBytes: 0 };
        if (!writer.ok) throw new Error('own-create-failed');
        let event = f.make();
        if (change.name === 'closed-schema') Object.assign(event, { body: 'OWN_UNCLASSIFIED_BODY' });
        if (change.name === 'durable-fsync') { const prototype = await handlePrototype(); vi.spyOn(prototype, 'sync').mockRejectedValueOnce(new Error('OWN_SYNC_FAILURE')); }
        if (change.name === 'named-file-identity') { await writer.audit(event); fs.renameSync(f.file, f.file + '.old'); fs.writeFileSync(f.file, '', { mode: 0o600 }); event = { ...event, stage: 'selection' }; }
        if (change.name === 'decoded-composition') event = { ...event, stage: 'selection', direction: 'presend', state: 'admitted', metadataSha256: 'a'.repeat(64) };
        if (change.name === 'enum-typing') Object.assign(event, { stage: [['declared-attempt']] });
        let accepted = true; try { await writer.audit(event); } catch { accepted = false; }
        vi.restoreAllMocks(); const summary = await writer.close(); return { accepted, durableEvents: summary.durableEvents, namedBytes: fs.statSync(f.file).size };
      };
      const control = await invoke(createSourceAcquisitionAudit), changed = await invoke(mutant.createSourceAcquisitionAudit);
      expect(control.accepted).toBe(false); expect(changed.accepted).toBe(true);
      if (evidenceRoot) { fs.writeFileSync(path.join(evidenceRoot, change.name + '.ts'), code); fs.copyFileSync(bundle, path.join(evidenceRoot, change.name + '.mjs')); }
      evidence.push({ name: change.name, old: change.old, new: change.replacement, subjectSha256: sha256(source), mutantSha256: sha256(code), bundleSha256: sha256(fs.readFileSync(bundle)), control, mutant: changed });
    }
    if (evidenceRoot) fs.writeFileSync(path.join(evidenceRoot, 'mutations.json'), JSON.stringify(evidence, null, 2) + '\n');
  });
});
