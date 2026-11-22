import { mkdir, readFile, readdir, writeFile, unlink, link } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { sha256 } from '@syzygy/support';
import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { identifyUrlMachineLifecycleRecord, publishUrlMachineLifecycle } from './url-machine-lifecycle.js';
import * as machineStore from './url-machine-store.js';
import { initializeUrlMachineStore, openUrlMachineStore, readUrlMachineStoreHistory, type UrlMachineStore } from './url-machine-store.js';
import { encodeUrlMachineArchive, urlMachineArchiveCapacity, URL_MACHINE_ARCHIVE_LIMITS } from './url-machine-archive.js';
import { URL_MACHINE_CLIENT_LIMITS, type UrlMachineClientContext, type UrlMachineClientRecord } from './url-machine-instance.js';
import { captureUrlMachinePeerHistory, isUrlMachinePeerHistoryMatch, isUrlMachinePeerHistorySnapshot, verifyUrlMachinePeerHistoryRow, verifyUrlMachinePeerHistory, type UrlMachinePeerHistoryOptions } from './url-machine-peer-history.js';

const NOW = Date.parse('2026-11-22T01:00:00.000Z');
const id = () => randomBytes(32).toString('hex');
const canon = (v: unknown) => Buffer.from(encodeCanonicalJson(v, URL_MACHINE_CLIENT_LIMITS));
const close: (() => Promise<unknown>)[] = [];
afterEach(async () => { vi.restoreAllMocks(); for (const fn of close.splice(0).reverse()) await fn(); });

async function fixture(revoke = true) {
  const root = tempDir('url-peer-history-'), governanceRoot = path.join(root, 'observing/.syzygy');
  const canonicalRoot = path.join(governanceRoot, 'governance/policies/dossier-machine-clients'); await mkdir(canonicalRoot, { recursive: true });
  let now = NOW, current = true;
  const storeOptions = { governanceRoot, protectedRoot: path.join(root, 'protected'), deadline: NOW + 60_000,
    now: () => now, current: () => current };
  const writer = await initializeUrlMachineStore(storeOptions); if (!writer) throw new Error('owned store refused'); close.push(() => writer.close());
  const slot = await writer.allocateClient(storeOptions.deadline); if (!slot) throw new Error('owned slot refused');
  const context: UrlMachineClientContext = { clientId: slot.clientId, policySha256: id(), profileSha256: id(), sourcePin: 'a'.repeat(40),
    runId: `run-${'b'.repeat(32)}`, role: 'design', kind: 'mcp-shim', allowedScopes: ['artifact_read', 'dossier_step'], now: NOW, deadline: storeOptions.deadline };
  const record: UrlMachineClientRecord = { format: 'polaris-dossier-local-machine-client/1', clientId: context.clientId, issuanceId: id(),
    revision: 1, projectId: 'project:syzygy', policySha256: context.policySha256, sourcePin: context.sourcePin, runId: context.runId,
    role: context.role, kind: context.kind, scopes: ['artifact_read'], issuedAt: new Date(NOW - 1000).toISOString(),
    expiresAt: new Date(storeOptions.deadline).toISOString(), revokedAt: null, instances: [{ instanceId: id(), generation: 1,
      issuedAt: new Date(NOW - 1000).toISOString(), expiresAt: new Date(storeOptions.deadline).toISOString(), retiredAt: null, revokedAt: null,
      verifier: { mechanism: 'rfc5-7d', profileSha256: context.profileSha256, processIdentitySha256: id(), channelIdentitySha256: id() } }] };
  const binding = { parentBindingSha256: id(), controllerSha256: id() };
  const publish = async (next: UrlMachineClientRecord, previous: UrlMachineClientRecord | null) => {
    const result = await publishUrlMachineLifecycle({ context: { ...context, now }, binding, next: canon(next),
      expected: previous === null ? null : { revision: previous.revision, sha256: sha256(canon(previous)) } }, writer);
    if (!result.ok) throw new Error(`owned publication refused: ${result.code}`); return result.receipt;
  };
  const firstHead = await publish(record, null); now += 1000;
  const rotated: UrlMachineClientRecord = { ...record, revision: 2, instances: [
    { ...record.instances[0]!, retiredAt: new Date(now).toISOString() },
    { ...record.instances[0]!, instanceId: id(), generation: 2, issuedAt: new Date(now).toISOString(),
      verifier: { ...record.instances[0]!.verifier, processIdentitySha256: id(), channelIdentitySha256: id() } },
  ] };
  const rotatedHead = await publish(rotated, record); now += 1000;
  const revoked: UrlMachineClientRecord = { ...rotated, revision: 3, revokedAt: new Date(now).toISOString() };
  const head = revoke ? await publish(revoked, rotated) : rotatedHead; now += 1000;
  await writer.close();
  const store = await openUrlMachineStore(storeOptions, writer.identitySha256); if (!store) throw new Error('owned reopen refused'); close.push(() => store.close());
  const options: UrlMachinePeerHistoryOptions = { store, expectedIdentitySha256: writer.identitySha256, expectedHead: head, context,
    row: { event: 'machine-peer-effect', clientId: record.clientId, instanceId: record.instances[0]!.instanceId, revision: 1,
      runId: record.runId, role: record.role, operation: 'artifact_read', processIdentitySha256: record.instances[0]!.verifier.processIdentitySha256,
      channelIdentitySha256: record.instances[0]!.verifier.channelIdentitySha256, at: NOW + 500 }, revisionBytes: canon(record) };
  const files = [path.join(storeOptions.protectedRoot, 'identity.json'), path.join(storeOptions.protectedRoot, 'state.json'),
    path.join(storeOptions.protectedRoot, `projection-${record.clientId}.json`), path.join(canonicalRoot, `${record.clientId}.json`), path.join(storeOptions.protectedRoot, 'canonical-history.json')];
  return { options, storeOptions, record, rotated, revoked, firstHead, files, withdraw: () => { current = false; } };
}

describe('cold historical machine-peer joins', () => {
  it('checks 220 exact captured rows using one genuine protected read and no per-row filesystem work', async () => {
    const f = await fixture(), before = await Promise.all(f.files.map(file => readFile(file)));
    const read = vi.spyOn(machineStore, 'readUrlMachineStoreHistory');
    const captured = await captureUrlMachinePeerHistory(f.options); expect(captured.ok).toBe(true); if (!captured.ok) return;
    expect(isUrlMachinePeerHistorySnapshot(captured.snapshot)).toBe(true);
    expect(Object.isFrozen(captured.snapshot)).toBe(true);
    const results = [];
    for (let index = 0; index < 220; index++) {
      const row = { ...f.options.row, at: NOW + 500 + index };
      const match = verifyUrlMachinePeerHistoryRow(captured.snapshot, row);
      expect(match).toMatchObject({ ok: true, authorization: 'none', replay: 'forbidden', revision: 1 });
      expect(isUrlMachinePeerHistoryMatch(match, row)).toBe(true); results.push(match);
    }
    expect(results).toHaveLength(220); expect(read).toHaveBeenCalledTimes(1);
    expect(await Promise.all(f.files.map(file => readFile(file)))).toEqual(before);
    // Closing the live adapter does not turn a retained historical match into a
    // live grant, and the pure checker neither reopens it nor changes history.
    await f.options.store.close();
    expect(verifyUrlMachinePeerHistoryRow(captured.snapshot, f.options.row)).toMatchObject({ ok: true, authorization: 'none' });
    expect(read).toHaveBeenCalledTimes(1);
    expect(await verifyUrlMachinePeerHistory(f.options)).toMatchObject({ ok: false, code: 'store-unavailable' });
  });

  it('refuses snapshot copies, successful-result copies and genuine result substitution for another row', async () => {
    const f = await fixture(), captured = await captureUrlMachinePeerHistory(f.options); if (!captured.ok) throw new Error('owned capture refused');
    const snapshot = captured.snapshot, match = verifyUrlMachinePeerHistoryRow(snapshot, f.options.row);
    expect(isUrlMachinePeerHistoryMatch(match, f.options.row)).toBe(true); expect(Object.isFrozen(match)).toBe(true);
    for (const copy of [{ ...snapshot }, JSON.parse(JSON.stringify(snapshot))]) {
      expect(isUrlMachinePeerHistorySnapshot(copy)).toBe(false);
      expect(verifyUrlMachinePeerHistoryRow(copy, f.options.row)).toEqual({ ok: false, code: 'input' });
    }
    for (const copy of [{ ...match }, JSON.parse(JSON.stringify(match))]) expect(isUrlMachinePeerHistoryMatch(copy, f.options.row)).toBe(false);
    const nextRow = { ...f.options.row, at: f.options.row.at + 1 };
    const nextMatch = verifyUrlMachinePeerHistoryRow(snapshot, nextRow);
    expect(nextMatch).toMatchObject({ ok: true }); expect(isUrlMachinePeerHistoryMatch(nextMatch, nextRow)).toBe(true);
    expect(isUrlMachinePeerHistoryMatch(match, nextRow)).toBe(false);
    expect(isUrlMachinePeerHistoryMatch(nextMatch, f.options.row)).toBe(false);
  });

  it('retains exact hash, process, scope and temporal checks after caches have been populated', async () => {
    const f = await fixture(), captured = await captureUrlMachinePeerHistory(f.options); if (!captured.ok) throw new Error('owned capture refused');
    const snapshot = captured.snapshot;
    expect(verifyUrlMachinePeerHistoryRow(snapshot, f.options.row)).toMatchObject({ ok: true });
    expect(verifyUrlMachinePeerHistoryRow(snapshot, f.options.row, canon({ ...f.record, issuanceId: id() }))).toEqual({ ok: false, code: 'revision' });
    expect(verifyUrlMachinePeerHistoryRow(snapshot, { ...f.options.row, processIdentitySha256: id() })).toEqual({ ok: false, code: 'binding' });
    expect(verifyUrlMachinePeerHistoryRow(snapshot, { ...f.options.row, operation: 'dossier_step' })).toEqual({ ok: false, code: 'binding' });
    expect(verifyUrlMachinePeerHistoryRow(snapshot, { ...f.options.row, at: NOW + 1500 })).toEqual({ ok: false, code: 'time' });
    expect(isUrlMachinePeerHistoryMatch({ ok: false, code: 'time' }, f.options.row)).toBe(false);
  });

  it('reads exact protected revisions from a genuine reopened store and joins retained old bytes without reviving revocation', async () => {
    const f = await fixture(), before = await Promise.all(f.files.map(file => readFile(file)));
    const history = await readUrlMachineStoreHistory(f.options.store, f.record.clientId, f.options.expectedHead, f.options.context.deadline);
    expect(history).toMatchObject({ identitySha256: f.options.expectedIdentitySha256, head: f.options.expectedHead, events: [
      { next: { revision: 1, sha256: sha256(canon(f.record)) } }, { next: { revision: 2 } }, { next: { revision: 3 } },
    ] });
    expect(await verifyUrlMachinePeerHistory(f.options)).toMatchObject({ ok: true, kind: 'matched-historical-machine-record', auditCapture: 'independent-proof-required', authorization: 'none',
      effectCompletion: 'Unknown', replay: 'forbidden', revision: 1, recordSha256: sha256(canon(f.record)) });
    expect(await Promise.all(f.files.map(file => readFile(file)))).toEqual(before);
    expect(JSON.parse((await readFile(f.files[3]!)).toString()).revokedAt).toBe(f.revoked.revokedAt);
    expect((await readdir(f.storeOptions.protectedRoot)).sort()).toEqual(['identity.json', `projection-${f.record.clientId}.json`, 'state.json', 'canonical-history.json'].sort());
  });

  it('joins exact archived old bytes after cold reopen without caller-supplied canonical text', async () => {
    const f = await fixture(); expect(await verifyUrlMachinePeerHistory({ ...f.options, revisionBytes: undefined })).toMatchObject({ ok: true, revision: 1, replay: 'forbidden' });
  });

  it('keeps historical legacy bytes explicitly unavailable and archives only the next real publication', async () => {
    const f = await fixture(false); await f.options.store.close();
    const state = JSON.parse((await readFile(f.files[1]!)).toString());
    state.format = 'url-machine-store-state/1'; delete state.archive;
    await writeFile(f.files[1]!, encodeCanonicalJson(state, { maxBytes: 8_388_608, maxNodes: 524_288, maxDepth: 32 })); await unlink(f.files[4]!);
    const store = await openUrlMachineStore(f.storeOptions, f.options.expectedIdentitySha256); if (!store) throw new Error('legacy reopen refused'); close.push(() => store.close());
    expect(await verifyUrlMachinePeerHistory({ ...f.options, store, revisionBytes: undefined })).toEqual({ ok: false, code: 'revision-bytes-unavailable' });
    const next = { ...f.rotated, revision: 3, revokedAt: new Date(NOW + 3000).toISOString() };
    const publication = await publishUrlMachineLifecycle({ context: { ...f.options.context, now: NOW + 3000 }, binding: f.options.expectedHead.binding,
      next: canon(next), expected: { revision: 2, sha256: sha256(canon(f.rotated)) } }, store);
    expect(publication.ok).toBe(true);
    if (!publication.ok) return;
    const history = await readUrlMachineStoreHistory(store, f.record.clientId, publication.receipt, f.options.context.deadline);
    expect(history?.revisions.map(value => value.revision)).toEqual([3]);
    expect(await verifyUrlMachinePeerHistory({ ...f.options, store, expectedHead: publication.receipt, revisionBytes: undefined })).toEqual({ ok: false, code: 'revision-bytes-unavailable' });
  });

  it.each(['missing', 'mutated', 'extra-entry', 'orphan-file', 'relinked', 'interrupted-pack', 'coherent-drop', 'coherent-extra', 'coherent-mutation', 'reordered'] as const)('refuses %s archive without repair on reopen', async fault => {
    const f = await fixture(); await f.options.store.close();
    const archive = f.files[4]!, original = await readFile(archive);
    if (fault === 'missing') await unlink(archive);
    if (fault === 'mutated') await writeFile(archive, Buffer.concat([original.subarray(0, original.length - 1), Buffer.from(' ')]));
    if (fault === 'extra-entry') {
      const pack = JSON.parse(original.toString()); pack.entries.push(pack.entries[0]);
      await writeFile(archive, JSON.stringify(pack));
    }
    if (fault === 'reordered') { const pack = JSON.parse(original.toString()); pack.entries.reverse(); await writeFile(archive, encodeUrlMachineArchive(pack)); }
    if (fault === 'orphan-file') await writeFile(`${archive}.new-orphan`, original);
    if (fault === 'relinked') await link(archive, path.join(f.storeOptions.protectedRoot, 'alias'));
    if (fault === 'interrupted-pack') {
      // A durable new pack without its state-pointer publication cannot open.
      const pack = JSON.parse(original.toString()); pack.entries.pop();
      await writeFile(archive, JSON.stringify(pack));
    }
    if (fault.startsWith('coherent-')) {
      const pack = JSON.parse(original.toString());
      if (fault === 'coherent-drop') pack.entries.shift();
      if (fault === 'coherent-extra') pack.entries.push(pack.entries[0]);
      if (fault === 'coherent-mutation') pack.entries[0].record.instances[0].verifier.processIdentitySha256 = id();
      const bytes = encodeUrlMachineArchive(pack), state = JSON.parse(await readFile(f.files[1]!, 'utf8'));
      state.archive = { ...state.archive, sha256: sha256(bytes), bytes: bytes.length, records: pack.entries.length };
      await writeFile(archive, bytes);
      await writeFile(f.files[1]!, encodeCanonicalJson(state, { maxBytes: 8_388_608, maxNodes: 524_288, maxDepth: 32 }));
    }
    expect(await openUrlMachineStore(f.storeOptions, f.options.expectedIdentitySha256)).toBeNull();
    if (fault !== 'missing') expect(await readFile(archive)).not.toHaveLength(0);
  });

  it('refuses capacity before reservation while retaining room for client-wide terminal cleanup', async () => {
    const f = await fixture(false); await f.options.store.close();
    const state = JSON.parse((await readFile(f.files[1]!)).toString());
    const pack = JSON.parse((await readFile(f.files[4]!)).toString());
    const template = state.clients[0].audit[0];
    let active = 1;
    // Owned synthetic persisted state uses the actual writer schema and exact
    // record encoder. Fill to the real byte/reservation boundary without
    // repeatedly executing hundreds of unrelated setup transactions.
    for (let ordinal = 1; ordinal < 256; ordinal++) {
      const record: UrlMachineClientRecord = { ...f.record, clientId: id(), issuanceId: id(), runId: `run-${ordinal.toString(16).padStart(32, '0')}`,
        instances: [{ ...f.record.instances[0]!, instanceId: id() }] };
      const bytes = canon(record), next = identifyUrlMachineLifecycleRecord(record, sha256(bytes));
      const witnessSha256 = id(), event = { ...template, runId: record.runId, next, neverIssuedSha256: witnessSha256 };
      const head = { record: next, binding: event.binding, auditSha256: sha256(canon(event)) };
      const entry = { clientId: record.clientId, revision: 1, sha256: next.sha256, record };
      const proposed = encodeUrlMachineArchive({ ...pack, entries: [...pack.entries, entry] });
      if (proposed.length + (active + 1) * 66_000 > 10_000_000 || pack.entries.length + active + 2 > 4096) break;
      active++; pack.entries.push(entry);
      state.clients.push({ clientId: record.clientId, witnessSha256, anchor: { kind: 'committed', head }, audit: [event] });
      state.used.push(record.clientId, record.issuanceId, record.instances[0]!.instanceId);
      state.runs.push({ runId: record.runId, clients: [record.clientId] });
      await writeFile(path.join(path.dirname(f.files[3]!), `${record.clientId}.json`), bytes);
      await writeFile(path.join(f.storeOptions.protectedRoot, `projection-${record.clientId}.json`), canon(next));
    }
    const archive = encodeUrlMachineArchive(pack);
    expect(active).toBeGreaterThan(100); expect(archive.length + active * URL_MACHINE_ARCHIVE_LIMITS.terminalBytes).toBeLessThanOrEqual(URL_MACHINE_ARCHIVE_LIMITS.bytes);
    state.archive = { ...state.archive, sha256: sha256(archive), bytes: archive.length, records: pack.entries.length };
    await writeFile(f.files[4]!, archive);
    await writeFile(f.files[1]!, encodeCanonicalJson(state, { maxBytes: 8_388_608, maxNodes: 524_288, maxDepth: 32 }));
    const store = await openUrlMachineStore(f.storeOptions, f.options.expectedIdentitySha256); if (!store) throw new Error('capacity fixture refused'); close.push(() => store.close());
    const slot = await store.allocateClient(f.options.context.deadline); if (!slot) throw new Error('capacity slot refused');
    const context = { ...f.options.context, clientId: slot.clientId, runId: `run-${'e'.repeat(32)}`, now: NOW + 3000 };
    const record: UrlMachineClientRecord = { ...f.record, clientId: slot.clientId, issuanceId: id(), runId: context.runId,
      instances: [{ ...f.record.instances[0]!, instanceId: id() }] };
    const before = await readFile(f.files[1]!);
    expect((await publishUrlMachineLifecycle({ context, binding: f.options.expectedHead.binding, next: canon(record), expected: null }, store)).ok).toBe(false);
    expect(await readFile(f.files[1]!)).toEqual(before);
    expect((await readdir(f.storeOptions.protectedRoot)).includes('lock')).toBe(false);
    const revoked = { ...f.rotated, revision: 3, revokedAt: new Date(NOW + 3000).toISOString() };
    expect((await publishUrlMachineLifecycle({ context: { ...f.options.context, now: NOW + 3000 }, binding: f.options.expectedHead.binding,
      next: canon(revoked), expected: { revision: 2, sha256: sha256(canon(f.rotated)) } }, store)).ok).toBe(true);
  });

  it('uses only the exact current canonical bytes when the requested revision is still the latest', async () => {
    const f = await fixture(false), active = f.rotated.instances.at(-1)!;
    expect(await verifyUrlMachinePeerHistory({ ...f.options, revisionBytes: undefined, row: { ...f.options.row, revision: 2,
      instanceId: active.instanceId, processIdentitySha256: active.verifier.processIdentitySha256,
      channelIdentitySha256: active.verifier.channelIdentitySha256, at: NOW + 1500 } })).toMatchObject({ ok: true,
      authorization: 'none', replay: 'forbidden', revision: 2, recordSha256: sha256(canon(f.rotated)) });
  });

  it.each(['canonical-hash', 'process', 'channel', 'scope', 'instance', 'role', 'run', 'parent', 'store-identity', 'future-revision', 'after-next-revision'] as const)('refuses changed %s', async fault => {
    const f = await fixture();
    const row = { ...f.options.row }, context = { ...f.options.context }, expectedHead = { ...f.options.expectedHead, binding: { ...f.options.expectedHead.binding } };
    let revisionBytes = f.options.revisionBytes, expectedIdentitySha256 = f.options.expectedIdentitySha256;
    if (fault === 'canonical-hash') revisionBytes = canon({ ...f.record, issuanceId: id() });
    if (fault === 'process') row.processIdentitySha256 = id();
    if (fault === 'channel') row.channelIdentitySha256 = id();
    if (fault === 'scope') row.operation = 'dossier_step';
    if (fault === 'instance') row.instanceId = f.rotated.instances[1]!.instanceId;
    if (fault === 'role') row.role = 'author';
    if (fault === 'run') row.runId = `run-${'c'.repeat(32)}`;
    if (fault === 'parent') expectedHead.binding.parentBindingSha256 = id();
    if (fault === 'store-identity') expectedIdentitySha256 = id();
    if (fault === 'future-revision') row.revision = 4;
    if (fault === 'after-next-revision') row.at = NOW + 1500;
    expect(await verifyUrlMachinePeerHistory({ ...f.options, row, context, expectedHead, revisionBytes, expectedIdentitySha256 })).toMatchObject({ ok: false });
  });

  it('refuses a captured claim against the revoked latest revision even when all verifier fields match', async () => {
    const f = await fixture(), active = f.revoked.instances.at(-1)!;
    expect(await verifyUrlMachinePeerHistory({ ...f.options, revisionBytes: undefined, row: { ...f.options.row, revision: 3,
      instanceId: active.instanceId, processIdentitySha256: active.verifier.processIdentitySha256,
      channelIdentitySha256: active.verifier.channelIdentitySha256, at: NOW + 2500 } })).toEqual({ ok: false, code: 'time' });
  });

  it('refuses store-shaped copies, stale exact heads and withdrawn parent authority', async () => {
    const f = await fixture(), copy: UrlMachineStore = { ...f.options.store };
    expect(await readUrlMachineStoreHistory(copy, f.record.clientId, f.options.expectedHead, f.options.context.deadline)).toBeNull();
    const stale = { ...f.options.expectedHead, record: { ...f.options.expectedHead.record, revision: 2 } };
    expect(await readUrlMachineStoreHistory(f.options.store, f.record.clientId, stale, f.options.context.deadline)).toBeNull();
    expect(await readUrlMachineStoreHistory(f.options.store, f.record.clientId, f.options.expectedHead, f.options.context.deadline)).not.toBeNull();
    f.withdraw(); expect(await verifyUrlMachinePeerHistory(f.options)).toMatchObject({ ok: false });
  });

  it('refuses canonical plus ordinary projection rollback against the independent protected high-water history', async () => {
    const f = await fixture();
    await writeFile(f.files[3]!, canon(f.record));
    await writeFile(f.files[2]!, canon(f.firstHead.record));
    expect(await verifyUrlMachinePeerHistory(f.options)).toMatchObject({ ok: false, code: 'store-unavailable' });
    expect(await readFile(f.files[3]!)).toEqual(canon(f.record));
  });
});
