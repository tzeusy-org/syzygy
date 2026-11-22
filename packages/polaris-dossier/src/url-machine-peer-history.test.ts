import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { sha256 } from '@syzygy/support';
import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { publishUrlMachineLifecycle } from './url-machine-lifecycle.js';
import { initializeUrlMachineStore, openUrlMachineStore, readUrlMachineStoreHistory, type UrlMachineStore } from './url-machine-store.js';
import { URL_MACHINE_CLIENT_LIMITS, type UrlMachineClientContext, type UrlMachineClientRecord } from './url-machine-instance.js';
import { verifyUrlMachinePeerHistory, type UrlMachinePeerHistoryOptions } from './url-machine-peer-history.js';

const NOW = Date.parse('2026-11-22T01:00:00.000Z');
const id = () => randomBytes(32).toString('hex');
const canon = (v: unknown) => Buffer.from(encodeCanonicalJson(v, URL_MACHINE_CLIENT_LIMITS));
const close: (() => Promise<unknown>)[] = [];
afterEach(async () => { for (const fn of close.splice(0).reverse()) await fn(); });

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
    path.join(storeOptions.protectedRoot, `projection-${record.clientId}.json`), path.join(canonicalRoot, `${record.clientId}.json`)];
  return { options, storeOptions, record, rotated, revoked, firstHead, files, withdraw: () => { current = false; } };
}

describe('cold historical machine-peer joins', () => {
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
    expect((await readdir(f.storeOptions.protectedRoot)).sort()).toEqual(['identity.json', `projection-${f.record.clientId}.json`, 'state.json'].sort());
  });

  it('explicitly refuses absent old revision bytes rather than deriving them from final lifecycle values', async () => {
    const f = await fixture(); expect(await verifyUrlMachinePeerHistory({ ...f.options, revisionBytes: undefined })).toEqual({ ok: false, code: 'revision-bytes-unavailable' });
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
