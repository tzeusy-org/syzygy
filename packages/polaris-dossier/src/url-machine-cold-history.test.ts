import { mkdir, readFile, readdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { sha256 } from '@syzygy/support';
import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { reconstructColdUrlRunMachineHistory, isColdUrlRunMachineHistory, type ColdUrlRunMachineOptions } from './url-machine-cold-history.js';
import * as machineStore from './url-machine-store.js';
import { initializeUrlMachineStore } from './url-machine-store.js';
import { publishUrlMachineLifecycle, type UrlMachineLifecycleResult } from './url-machine-lifecycle.js';
import { isUrlMachinePeerHistoryMatch, isUrlMachinePeerHistorySnapshot, verifyUrlMachinePeerHistoryRow } from './url-machine-peer-history.js';
import { URL_MACHINE_CLIENT_LIMITS, type UrlMachineClientContext, type UrlMachineClientRecord, type UrlMachineOperation } from './url-machine-instance.js';
import type { UrlRunMachineClosedHistory } from './url-run-machine.js';
import { URL_ROLES } from './url-run-record.js';

const NOW = Date.parse('2026-11-22T01:00:00.000Z');
const id = (n: number) => n.toString(16).padStart(64, '0');
const canon = (v: unknown) => Buffer.from(encodeCanonicalJson(v, URL_MACHINE_CLIENT_LIMITS));
type Mutable<T> = T extends readonly (infer U)[] ? Mutable<U>[] : T extends object ? { -readonly [K in keyof T]: Mutable<T[K]> } : T;
const clone = <T>(v: T): Mutable<T> => JSON.parse(JSON.stringify(v)) as Mutable<T>;
const cleanup: (() => Promise<unknown>)[] = [];
afterEach(async () => { vi.restoreAllMocks(); for (const fn of cleanup.splice(0).reverse()) await fn(); });

/** Exact synthetic expectations retained independently of the actual store.
 * No live peer/capture claim is made; all lifecycle publications and cold reads
 * use real protected files. Serialized close data simulates a cold process. */
async function fixture(active = false, lateAudit = false, generations = 1) {
  const root = tempDir('machine-cold-'), governanceRoot = path.join(root, 'observing/.syzygy'), protectedRoot = path.join(root, 'protected');
  const canonicalRoot = path.join(governanceRoot, 'governance/policies/dossier-machine-clients'); await mkdir(canonicalRoot, { recursive: true });
  let now = NOW, current = true, nextId = 30;
  const deadline = NOW + 60_000, runId = `run-${'b'.repeat(32)}`, profiles = { author: id(10), inventory: id(11), fidelity: id(12), design: id(13) };
  const store = await initializeUrlMachineStore({ governanceRoot, protectedRoot, deadline, now: () => now, current: () => current });
  if (!store) throw new Error('owned initialization refused'); cleanup.push(() => store.close());
  const binding = { controllerSha256: id(1), parentBindingSha256: id(2) };
  const clients: { context: UrlMachineClientContext; terminal: UrlRunMachineClosedHistory['clients'][number]['terminal'] }[] = [];
  const issued: { client: typeof clients[number]; first: UrlMachineClientRecord; final: UrlMachineClientRecord; firstHead: Extract<UrlMachineLifecycleResult, { ok: true }>['receipt'] }[] = [];
  for (let generation = 0; generation < generations; generation++) for (const role of URL_ROLES) for (const kind of ['mcp-shim', 'inference-bridge'] as const) {
    const slot = await store.allocateClient(deadline); if (!slot) throw new Error('owned slot refused');
    const allowedScopes: UrlMachineOperation[] = kind === 'inference-bridge' ? ['inference-forward'] : role === 'author'
      ? ['source_read', 'artifact_read', 'artifact_write', 'dossier_step'] : role === 'inventory'
        ? ['source_read', 'artifact_read', 'dossier_step'] : ['artifact_read', 'dossier_step'];
    const context: UrlMachineClientContext = { clientId: slot.clientId, policySha256: id(3), profileSha256: profiles[role], sourcePin: 'a'.repeat(40),
      runId, role, kind, allowedScopes, now: NOW, deadline };
    clients.push({ context, terminal: { kind: 'never-issued', ...slot } });
  }
  for (const index of [0, 3]) {
    const client = clients[index]!, c = client.context;
    const first: UrlMachineClientRecord = { format: 'polaris-dossier-local-machine-client/1', clientId: c.clientId, issuanceId: id(nextId++), revision: 1,
      projectId: 'project:syzygy', policySha256: c.policySha256, sourcePin: c.sourcePin, runId, role: c.role, kind: c.kind,
      scopes: c.allowedScopes, issuedAt: new Date(NOW - 1000).toISOString(), expiresAt: new Date(deadline).toISOString(), revokedAt: null,
      instances: [{ instanceId: id(nextId++), generation: 1, issuedAt: new Date(NOW - 1000).toISOString(), expiresAt: new Date(deadline).toISOString(),
        retiredAt: null, revokedAt: null, verifier: { mechanism: 'rfc5-7d', profileSha256: c.profileSha256, processIdentitySha256: id(nextId++), channelIdentitySha256: id(nextId++) } }] };
    const result = await publishUrlMachineLifecycle({ context: { ...c, now }, binding, expected: null, next: canon(first) }, store);
    if (!result.ok) throw new Error('owned issuance refused');
    issued.push({ client, first, final: first, firstHead: result.receipt });
  }
  now = NOW + 100;
  const author = issued[0]!, firstInstance = author.first.instances[0]!;
  const rotated: UrlMachineClientRecord = { ...author.first, revision: 2, instances: [
    { ...firstInstance, retiredAt: new Date(now).toISOString() },
    { ...firstInstance, instanceId: id(nextId++), generation: 2, issuedAt: new Date(now).toISOString(),
      verifier: { ...firstInstance.verifier, processIdentitySha256: id(nextId++), channelIdentitySha256: id(nextId++) } },
  ] };
  const rotation = await publishUrlMachineLifecycle({ context: { ...author.client.context, now }, binding,
    expected: { revision: 1, sha256: sha256(canon(author.first)) }, next: canon(rotated) }, store);
  if (!rotation.ok) throw new Error('owned rotation refused'); author.final = rotated;
  now = NOW + (lateAudit ? 400 : 200);
  for (const entry of issued) {
    const final = active && entry === author ? entry.final : { ...entry.final, revision: entry.final.revision + 1, revokedAt: new Date(NOW + 200).toISOString() };
    const result = final === entry.final ? rotation : await publishUrlMachineLifecycle({ context: { ...entry.client.context, now }, binding,
      expected: { revision: entry.final.revision, sha256: sha256(canon(entry.final)) }, next: canon(final) }, store);
    if (!result.ok) throw new Error('owned retirement refused');
    entry.final = final; entry.client.terminal = { kind: 'revoked', head: result.receipt };
  }
  await store.close(); now = NOW + 500;
  const sealed: UrlRunMachineClosedHistory = clone({ kind: 'closed-url-run-machine-history', authorization: 'none', replay: 'forbidden',
    identitySha256: store.identitySha256, binding, observedAt: NOW + 300, clients });
  const options: ColdUrlRunMachineOptions = { governanceRoot, protectedRoot, sealed,
    expected: { identitySha256: store.identitySha256, binding: { ...binding }, runId, sourcePin: 'a'.repeat(40), originPolicySha256: id(3), profiles: { ...profiles }, deadline },
    now: () => now, current: () => current };
  const files = ['identity.json', 'state.json', 'canonical-history.json', ...issued.map(entry => `projection-${entry.client.context.clientId}.json`)]
    .map(file => path.join(protectedRoot, file));
  files.push(...issued.map(entry => path.join(canonicalRoot, `${entry.client.context.clientId}.json`)));
  const row = { event: 'machine-peer-effect' as const, clientId: author.first.clientId, instanceId: firstInstance.instanceId, revision: 1,
    runId, role: 'author' as const, operation: 'artifact_read' as const, processIdentitySha256: firstInstance.verifier.processIdentitySha256,
    channelIdentitySha256: firstInstance.verifier.channelIdentitySha256, at: NOW + 50 };
  return { options, issued, files, row, expire: () => { now = deadline; }, withdraw: () => { current = false; } };
}

describe('cold protected machine reconstruction', () => {
  it('reopens the exact independent cut, verifies eight terminals, and returns genuine row snapshots without writes or live authority', async () => {
    const f = await fixture(), before = await Promise.all(f.files.map(file => readFile(file)));
    const result = await reconstructColdUrlRunMachineHistory(f.options); expect(result).not.toBeNull(); if (!result) return;
    expect(result).toMatchObject({ authorization: 'none', replay: 'forbidden', observation: 'per-client-protected-cuts', closedAt: NOW + 300, observedAt: NOW + 500 });
    expect(result.clients).toEqual(f.options.sealed.clients); expect(result.clients).toHaveLength(8); expect(result.snapshots).toHaveLength(2);
    expect(isColdUrlRunMachineHistory(result)).toBe(true); expect(isColdUrlRunMachineHistory({ ...result })).toBe(false);
    expect(Object.isFrozen(result.clients[0]!.context.allowedScopes)).toBe(true);
    const snapshot = result.snapshots.find(value => value.clientId === f.row.clientId)!;
    expect(isUrlMachinePeerHistorySnapshot(snapshot)).toBe(true); expect(isUrlMachinePeerHistorySnapshot({ ...snapshot })).toBe(false);
    const matched = verifyUrlMachinePeerHistoryRow(snapshot, f.row); expect(isUrlMachinePeerHistoryMatch(matched, f.row)).toBe(true);
    expect(matched).toMatchObject({ ok: true, authorization: 'none', replay: 'forbidden', effectCompletion: 'Unknown' });
    expect(await Promise.all(f.files.map(file => readFile(file)))).toEqual(before);
    expect((await readdir(f.options.protectedRoot)).includes('lock')).toBe(false);
  });

  it('verifies both cleanly stopped generations within the same sixteen-client lifetime store', async () => {
    const f = await fixture(false, false, 2);
    const history = await reconstructColdUrlRunMachineHistory(f.options);
    expect(history?.clients).toHaveLength(16);
    expect(history?.snapshots).toHaveLength(2);
    const duplicate = clone(f.options.sealed);
    duplicate.clients[15] = duplicate.clients[0]!;
    expect(await reconstructColdUrlRunMachineHistory({ ...f.options, sealed: duplicate })).toBeNull();
    expect(await reconstructColdUrlRunMachineHistory({ ...f.options, sealed: { ...f.options.sealed,
      clients: [...f.options.sealed.clients, f.options.sealed.clients[0]!] } })).toBeNull();
  });

  it.each(['identity', 'controller', 'parent', 'run', 'pin', 'origin', 'profile', 'deadline', 'client-count', 'duplicate', 'role-cli', 'scope', 'witness', 'head', 'future-cut', 'early-cut', 'coherent-identity', 'wrong-slot', 'future-context'] as const)('refuses %s expectation drift', async fault => {
    const f = await fixture(), options = { ...f.options, expected: clone(f.options.expected), sealed: clone(f.options.sealed) };
    const expected = options.expected, sealed = options.sealed;
    if (fault === 'identity') expected.identitySha256 = id(80);
    if (fault === 'coherent-identity') { expected.identitySha256 = id(80); sealed.identitySha256 = id(80); }
    if (fault === 'wrong-slot') { sealed.clients[1]!.context.clientId = id(80); const terminal = sealed.clients[1]!.terminal; if (terminal.kind === 'never-issued') terminal.clientId = id(80); }
    if (fault === 'future-context') sealed.clients[1]!.context.now = NOW + 400;
    if (fault === 'controller') expected.binding.controllerSha256 = id(80);
    if (fault === 'parent') expected.binding.parentBindingSha256 = id(80);
    if (fault === 'run') expected.runId = `run-${'c'.repeat(32)}`;
    if (fault === 'pin') expected.sourcePin = 'c'.repeat(40);
    if (fault === 'origin') expected.originPolicySha256 = id(80);
    if (fault === 'profile') expected.profiles.design = id(80);
    if (fault === 'deadline') expected.deadline++;
    if (fault === 'client-count') sealed.clients = sealed.clients.slice(1);
    if (fault === 'duplicate') sealed.clients = [sealed.clients[0]!, ...sealed.clients.slice(0, 7)];
    if (fault === 'role-cli') sealed.clients[1]!.context.kind = 'role-cli';
    if (fault === 'scope') sealed.clients[1]!.context.allowedScopes = ['artifact_read'];
    if (fault === 'witness') { const terminal = sealed.clients[1]!.terminal; if (terminal.kind === 'never-issued') terminal.witnessSha256 = id(80); }
    if (fault === 'head') { const terminal = sealed.clients[0]!.terminal; if (terminal.kind === 'revoked') terminal.head.auditSha256 = id(80); }
    if (fault === 'future-cut') sealed.observedAt = NOW + 501;
    if (fault === 'early-cut') sealed.observedAt = NOW + 150;
    expect(await reconstructColdUrlRunMachineHistory(options)).toBeNull();
  });

  it('refuses an active actual canonical head even when a supplied seal labels it revoked', async () => {
    const f = await fixture(true); expect(await reconstructColdUrlRunMachineHistory(f.options)).toBeNull();
  });

  it('refuses a lifecycle event published after the sealed close even when its canonical revoke timestamp was backdated', async () => {
    const f = await fixture(false, true); expect(await reconstructColdUrlRunMachineHistory(f.options)).toBeNull();
  });

  it('refuses a later protected revision instead of silently advancing an independently retained closed head', async () => {
    const f = await fixture(), author = f.issued[0]!;
    const store = await machineStore.openUrlMachineStore({ governanceRoot: f.options.governanceRoot, protectedRoot: f.options.protectedRoot,
      deadline: f.options.expected.deadline, now: f.options.now, current: f.options.current }, f.options.expected.identitySha256);
    if (!store) throw new Error('owned reopen refused');
    const next = { ...author.final, revision: author.final.revision + 1,
      instances: author.final.instances.map((instance, index) => index === author.final.instances.length - 1 ? { ...instance, revokedAt: new Date(NOW + 400).toISOString() } : instance) };
    const published = await publishUrlMachineLifecycle({ context: { ...author.client.context, now: f.options.now() }, binding: f.options.expected.binding,
      expected: { revision: author.final.revision, sha256: sha256(canon(author.final)) }, next: canon(next) }, store);
    expect(published.ok).toBe(true); await store.close();
    expect(await reconstructColdUrlRunMachineHistory(f.options)).toBeNull();
  });

  it.each(['expire', 'withdraw'] as const)('refuses %s without renewing the original deadline', async fault => {
    const f = await fixture(); f[fault](); expect(await reconstructColdUrlRunMachineHistory(f.options)).toBeNull();
  });

  it('rechecks clean-stop exclusion after an awaited genuine store open', async () => {
    const f = await fixture(), open = machineStore.openUrlMachineStore;
    vi.spyOn(machineStore, 'openUrlMachineStore').mockImplementation(async (...args) => { const actual = await open(...args); f.withdraw(); return actual; });
    expect(await reconstructColdUrlRunMachineHistory(f.options)).toBeNull();
  });

  it.each(['canonical-projection-rollback', 'missing-archive'] as const)('refuses actual %s and leaves its bytes unrepaired', async fault => {
    const f = await fixture(), author = f.issued[0]!;
    const canonical = f.files[f.files.length - 2]!, projection = path.join(f.options.protectedRoot, `projection-${author.first.clientId}.json`);
    if (fault === 'canonical-projection-rollback') { await writeFile(canonical, canon(author.first)); await writeFile(projection, canon(author.firstHead.record)); }
    else await unlink(path.join(f.options.protectedRoot, 'canonical-history.json'));
    expect(await reconstructColdUrlRunMachineHistory(f.options)).toBeNull();
    if (fault === 'canonical-projection-rollback') expect(await readFile(canonical)).toEqual(canon(author.first));
  });
});
