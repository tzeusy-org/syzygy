import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { sha256 } from '@syzygy/support';
import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { encodeUrlMachineArchive, readUrlMachineArchive, urlMachineArchiveCapacity, URL_MACHINE_ARCHIVE_LIMITS } from './url-machine-archive.js';
import { identifyUrlMachineLifecycleRecord, publishUrlMachineLifecycle, type UrlMachineLifecycleStep } from './url-machine-lifecycle.js';
import { initializeUrlMachineStore, openUrlMachineStore, URL_MACHINE_STORE_LIMITS } from './url-machine-store.js';
import { URL_MACHINE_CLIENT_LIMITS, type UrlMachineClientContext, type UrlMachineClientRecord, type UrlMachineOperation } from './url-machine-instance.js';

const NOW = Date.parse('2026-11-22T01:00:00.000Z');
const DEADLINE = NOW + 60_000;
const id = (n: number) => n.toString(16).padStart(64, '0');
const canon = (v: unknown) => Buffer.from(encodeCanonicalJson(v, URL_MACHINE_CLIENT_LIMITS));
type Audit = Extract<UrlMachineLifecycleStep, { kind: 'audit' }>['event'];
type Head = Extract<UrlMachineLifecycleStep, { kind: 'audit' }>['head'];
function production(rootId: string, terminal: boolean) {
  const entries: { clientId: string; revision: number; sha256: string; record: UrlMachineClientRecord }[] = [];
  const clients: { clientId: string; witnessSha256: string; anchor: { kind: 'committed'; head: Head }; audit: Audit[] }[] = [];
  const used: string[] = [];
  const contexts: UrlMachineClientContext[] = [];
  const records: UrlMachineClientRecord[] = [];
  let nextId = 10, maxRecordBytes = 0;
  const binding = { parentBindingSha256: id(1), controllerSha256: id(2) }, runId = `run-${'b'.repeat(32)}`;
  for (const role of ['author', 'inventory', 'fidelity', 'design'] as const) for (const kind of ['mcp-shim', 'inference-bridge'] as const) {
    // This is the current production eight-client distribution, with the
    // longest supported source pin and the actual selected role scopes.
    const scopes: UrlMachineOperation[] = kind === 'inference-bridge' ? ['inference-forward'] : role === 'author'
      ? ['source_read', 'artifact_read', 'artifact_write', 'dossier_step'] : role === 'inventory'
        ? ['source_read', 'artifact_read', 'dossier_step'] : ['artifact_read', 'dossier_step'];
    const clientId = id(nextId++), issuanceId = id(nextId++), witnessSha256 = id(nextId++);
    const context: UrlMachineClientContext = { clientId, policySha256: id(3), profileSha256: id(4), sourcePin: 'a'.repeat(64), runId,
      role, kind, allowedScopes: scopes, now: NOW + 1000, deadline: DEADLINE };
    contexts.push(context); used.push(clientId, issuanceId);
    let record: UrlMachineClientRecord = { format: 'polaris-dossier-local-machine-client/1', clientId, issuanceId, revision: 1,
      projectId: 'project:syzygy', policySha256: context.policySha256, sourcePin: context.sourcePin, runId, role, kind, scopes,
      issuedAt: new Date(NOW - 1000).toISOString(), expiresAt: new Date(DEADLINE).toISOString(), revokedAt: null, instances: [] };
    const audit: Audit[] = []; let previous: Head | null = null;
    const retain = (at: number) => {
      const bytes = canon(record), digest = sha256(bytes); maxRecordBytes = Math.max(maxRecordBytes, bytes.length);
      const next = identifyUrlMachineLifecycleRecord(record, digest);
      const event: Audit = { format: 'url-machine-lifecycle-audit/1', at, binding, projectId: record.projectId,
        policySha256: context.policySha256, profileSha256: context.profileSha256, sourcePin: context.sourcePin, runId,
        role, kind, scopes, previous, neverIssuedSha256: previous === null ? witnessSha256 : null, next };
      previous = { record: next, binding, auditSha256: sha256(canon(event)) }; audit.push(event);
      entries.push({ clientId, revision: record.revision, sha256: digest, record });
    };
    for (let generation = 1; generation <= 64; generation++) {
      const stamp = new Date(NOW + generation * 10).toISOString(), instanceId = id(nextId++); used.push(instanceId);
      record = { ...record, revision: generation, instances: [
        ...record.instances.map((instance, index) => index === record.instances.length - 1 ? { ...instance, retiredAt: stamp } : instance),
        { instanceId, generation, issuedAt: stamp, expiresAt: record.expiresAt, retiredAt: null, revokedAt: null,
          verifier: { mechanism: 'rfc5-7d', profileSha256: context.profileSha256, processIdentitySha256: id(nextId++), channelIdentitySha256: id(nextId++) } },
      ] }; retain(NOW + generation * 10);
    }
    if (terminal) { record = { ...record, revision: 65, revokedAt: new Date(NOW + 1000).toISOString() }; retain(NOW + 1000); }
    clients.push({ clientId, witnessSha256, anchor: { kind: 'committed', head: previous! }, audit }); records.push(record);
  }
  const value = { format: 'url-machine-canonical-history/1' as const, rootId, entries }, bytes = encodeUrlMachineArchive(value);
  const pointer = { sha256: sha256(bytes), bytes: bytes.length, records: entries.length, legacy: [] };
  return { value, bytes, pointer, clients, used, contexts, records, maxRecordBytes, binding, runId };
}

describe('bounded canonical revision archive', () => {
  it('fits the actual eight-client maximum rotation distribution and terminal records', () => {
    const f = production(id(5), true);
    expect(f.value.entries).toHaveLength(520); expect(f.clients).toHaveLength(8);
    expect(f.bytes.length).toBe(9_523_319); expect(f.maxRecordBytes).toBe(34_650);
    expect(readUrlMachineArchive(f.bytes, f.pointer, id(5), f.clients, NOW + 2000)?.entries).toHaveLength(520);
    const active = production(id(5), false);
    expect(urlMachineArchiveCapacity(active.bytes.length, 512, 8)).toBe(true);
    expect(urlMachineArchiveCapacity(f.bytes.length, 520, 0)).toBe(true);
    expect(256 * 65_536 + 256 * 16_384 + 8_388_608 + 16_384 + 2 * URL_MACHINE_ARCHIVE_LIMITS.bytes).toBe(49_376_512);
    expect(49_376_512).toBeLessThan(URL_MACHINE_STORE_LIMITS.aggregateBytes);
  }, 15_000);

  it.each([
    [9_934_000, 4095, 1, true], [9_934_001, 4095, 1, false], [9_934_000, 4096, 1, false],
    [10_000_000, 4096, 0, true], [10_000_001, 4096, 0, false], [1, 1, Infinity, false],
  ] as const)('capacity(%s,%s,%s) is %s', (bytes, records, active, expected) => {
    expect(urlMachineArchiveCapacity(bytes, records, active)).toBe(expected);
  });

  it('publishes terminal cleanup at production maximum size under the unchanged store bounds', async () => {
    const root = tempDir('machine-archive-max-'), governanceRoot = path.join(root, 'observing/.syzygy');
    const canonicalRoot = path.join(governanceRoot, 'governance/policies/dossier-machine-clients'); await mkdir(canonicalRoot, { recursive: true });
    const protectedRoot = path.join(root, 'protected'), options = { governanceRoot, protectedRoot, deadline: DEADLINE, now: () => NOW + 1000, current: () => true };
    const initial = await initializeUrlMachineStore(options); if (!initial) throw new Error('owned initial store refused');
    const identitySha256 = initial.identitySha256; await initial.close();
    const identity = JSON.parse(await readFile(path.join(protectedRoot, 'identity.json'), 'utf8'));
    const f = production(identity.rootId, false);
    await writeFile(path.join(protectedRoot, 'canonical-history.json'), f.bytes);
    const state = { format: 'url-machine-store-state/2', rootId: identity.rootId, archive: f.pointer, used: f.used,
      runs: [{ runId: f.runId, clients: f.clients.map(value => value.clientId) }], clients: f.clients };
    await writeFile(path.join(protectedRoot, 'state.json'), encodeCanonicalJson(state, {
      maxBytes: URL_MACHINE_STORE_LIMITS.bytes, maxNodes: URL_MACHINE_STORE_LIMITS.nodes, maxDepth: URL_MACHINE_STORE_LIMITS.depth }));
    for (const [index, record] of f.records.entries()) {
      await writeFile(path.join(canonicalRoot, `${record.clientId}.json`), canon(record));
      await writeFile(path.join(protectedRoot, `projection-${record.clientId}.json`), canon(f.clients[index]!.anchor.head.record));
    }
    const store = await openUrlMachineStore(options, identitySha256); if (!store) throw new Error('owned maximum store refused');
    try {
      const reads: number[] = [];
      await store.exclusive(f.contexts[0]!.clientId, DEADLINE, async lease => {
        for (let sample = 0; sample < 3; sample++) { const began = performance.now(); expect(await lease.read()).not.toBeNull(); reads.push(performance.now() - began); }
      });
      expect(reads).toHaveLength(3);
      const record = f.records[0]!, revoked = { ...record, revision: 65, revokedAt: new Date(NOW + 1000).toISOString() };
      const result = await publishUrlMachineLifecycle({ context: f.contexts[0]!, binding: f.binding, next: canon(revoked),
        expected: { revision: 64, sha256: sha256(canon(record)) } }, store);
      expect(result.ok).toBe(true);
      expect(JSON.parse(await readFile(path.join(canonicalRoot, `${record.clientId}.json`), 'utf8')).revokedAt).toBe(revoked.revokedAt);
    } finally { await store.close(); }
  }, 20_000);
});
