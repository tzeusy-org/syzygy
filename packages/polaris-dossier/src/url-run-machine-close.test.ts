import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { sha256 } from '@syzygy/support';
import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { createUrlRunMachine, isUrlRunMachineClosedHistory, readUrlRunMachineClosedHistory, type UrlRunMachineOptions } from './url-run-machine.js';
import { openUrlMachineStore } from './url-machine-store.js';
import { publishUrlMachineLifecycle } from './url-machine-lifecycle.js';
import { URL_MACHINE_CLIENT_LIMITS, type UrlMachineClientContext, type UrlMachineClientRecord } from './url-machine-instance.js';
import { URL_ORIGIN_POLICY_PATH, URL_ROLES } from './url-run-record.js';
import type { UrlRolePlan } from './url-role-plan.js';
import type { UrlRuntime } from './url-runtime.js';

// Unit scope: upstream installation/plan admission is substituted. The actual
// provisioner, eight protected filesystem allocations and close/readback run.
// No socket, listener, helper, CLI or peer verifier is created or fabricated.
const admission = vi.hoisted(() => ({ runtimes: new WeakSet<object>(), plans: new WeakSet<object>() }));
vi.mock('./url-runtime.js', async original => ({ ...await original<typeof import('./url-runtime.js')>(),
  urlMachineReaderProgram: (value: object) => admission.runtimes.has(value) ? { executable: '/not-executed', sha256: 'a'.repeat(64) } : null,
}));
vi.mock('./url-role-plan.js', async original => ({ ...await original<typeof import('./url-role-plan.js')>(),
  isPreparedUrlRolePlan: (value: object) => admission.plans.has(value),
}));
const NOW = Date.parse('2026-11-22T01:00:00.000Z');
const id = (n: number) => n.toString(16).padStart(64, '0');
const canon = (value: unknown) => Buffer.from(encodeCanonicalJson(value, URL_MACHINE_CLIENT_LIMITS));
const cleanup: (() => Promise<unknown>)[] = [];
afterEach(async () => { for (const close of cleanup.splice(0).reverse()) await close(); });

async function fixture() {
  const root = tempDir('machine-close-'), runId = `run-${'b'.repeat(32)}`;
  let now = NOW, current = true, effects = true;
  const runtime = { inputTreeSha256: id(1) } as unknown as UrlRuntime; admission.runtimes.add(runtime);
  const plans = URL_ROLES.map((role, ordinal) => {
    const plan = { role, profile: { digest: id(10 + ordinal), input: { binding: { run: runId, role } } } } as unknown as UrlRolePlan;
    admission.plans.add(plan); return plan;
  });
  await mkdir(path.join(root, 'observing/.syzygy'), { recursive: true });
  const options: UrlRunMachineOptions = { governanceRoot: path.join(root, 'observing/.syzygy'), protectedRoot: path.join(root, 'protected'),
    runtime, plans, runId, originPolicySha256: id(2), pin: 'a'.repeat(40), deadline: NOW + 60_000, now: () => now,
    parent: { rowId: 'A-1', landedCommit: 'a'.repeat(40), defaultCommit: 'a'.repeat(40), tagObject: 'b'.repeat(40),
      subjects: [{ path: URL_ORIGIN_POLICY_PATH, sha256: id(2) }] }, current: () => current, effectCurrent: () => effects,
    reverify: () => true, launch: () => undefined, audit: () => {}, chargeNativeCpuMicroseconds: () => { throw new Error('unit closure invoked native helper'); } };
  const machine = await createUrlRunMachine(options); cleanup.push(() => machine.close());
  return { root, options, machine, expire: () => { now = options.deadline; }, withdraw: () => { current = false; }, withdrawEffects: () => { effects = false; } };
}

describe('retained production machine closure evidence', () => {
  it('retains eight actual never-issued anchors and immutable selected contexts from the exact clean result', async () => {
    const f = await fixture(), stateFile = path.join(f.options.protectedRoot, 'state.json'), before = await readFile(stateFile);
    expect(f.machine.current()).toBe(true); expect(readUrlRunMachineClosedHistory({ lifecycle: 'retired' })).toBeNull();
    f.withdrawEffects();
    const closing = f.machine.close(); expect(f.machine.current()).toBe(false);
    const result = await closing; expect(result).toEqual({ lifecycle: 'retired' }); expect(await f.machine.close()).toBe(result);
    const evidence = readUrlRunMachineClosedHistory(result); expect(evidence).not.toBeNull(); if (!evidence) return;
    expect(isUrlRunMachineClosedHistory(evidence)).toBe(true); expect(isUrlRunMachineClosedHistory({ ...evidence })).toBe(false);
    expect(readUrlRunMachineClosedHistory({ ...result })).toBeNull(); expect(readUrlRunMachineClosedHistory(JSON.parse(JSON.stringify(result)))).toBeNull();
    expect(evidence).toMatchObject({ authorization: 'none', replay: 'forbidden', identitySha256: f.machine.identitySha256, observedAt: NOW });
    expect(evidence.clients).toHaveLength(8);
    const actual = JSON.parse(before.toString());
    for (const client of evidence.clients) {
      expect(client.terminal).toEqual(actual.clients.find((value: { clientId: string }) => value.clientId === client.context.clientId).anchor);
      expect(client.terminal.kind).toBe('never-issued');
      expect(client.context).toMatchObject({ policySha256: f.options.originPolicySha256, sourcePin: f.options.pin, runId: f.options.runId, deadline: f.options.deadline });
      expect(client.context.profileSha256).toBe(f.options.plans.find(plan => plan.role === client.context.role)!.profile.digest);
      expect(Object.isFrozen(client.context.allowedScopes)).toBe(true);
    }
    expect(Object.isFrozen(evidence.clients)).toBe(true); expect(await readFile(stateFile)).toEqual(before);
    expect(await readdir(path.join(f.options.governanceRoot, 'governance/policies/dossier-machine-clients'))).toEqual([]);
  });

  it.each(['expire', 'withdraw'] as const)('emits no clean evidence after %s', async fault => {
    const f = await fixture(); f[fault](); const result = await f.machine.close();
    expect(result).toEqual({ lifecycle: 'Unknown' }); expect(readUrlRunMachineClosedHistory(result)).toBeNull();
  });

  it.each(['committed', 'pending'] as const)('refuses clean closure when actual %s state contradicts in-memory never-issued state', async fault => {
    const f = await fixture(), state = JSON.parse(await readFile(path.join(f.options.protectedRoot, 'state.json'), 'utf8'));
    const clientId = state.clients[0].clientId;
    if (fault === 'pending') {
      state.clients[0].anchor = { kind: 'pending', clientId, intentSha256: id(50) };
      state.used.push(clientId, id(30), id(31)); state.runs.push({ runId: f.options.runId, clients: [clientId] });
      const bytes = Buffer.from(encodeCanonicalJson(state, { maxBytes: 8_388_608, maxNodes: 524_288, maxDepth: 32 }));
      const file = path.join(f.options.protectedRoot, 'state.json'); await writeFile(file, bytes);
      const result = await f.machine.close(); expect(result).toEqual({ lifecycle: 'Unknown' }); expect(readUrlRunMachineClosedHistory(result)).toBeNull();
      expect(await readFile(file)).toEqual(bytes); return;
    }
    const store = await openUrlMachineStore({ ...f.options }, f.machine.identitySha256); if (!store) throw new Error('owned store refused');
    const context: UrlMachineClientContext = { clientId, policySha256: f.options.originPolicySha256, profileSha256: f.options.plans[0]!.profile.digest,
      sourcePin: f.options.pin, runId: f.options.runId, role: 'author', kind: 'mcp-shim', allowedScopes: ['artifact_read'], now: NOW, deadline: f.options.deadline };
    // This independently written synthetic record tests a protected-store
    // contradiction; it is never presented as an actual captured peer.
    const record: UrlMachineClientRecord = { format: 'polaris-dossier-local-machine-client/1', clientId, issuanceId: id(30), revision: 1,
      projectId: 'project:syzygy', policySha256: context.policySha256, sourcePin: context.sourcePin, runId: context.runId, role: 'author', kind: 'mcp-shim',
      scopes: ['artifact_read'], issuedAt: new Date(NOW).toISOString(), expiresAt: new Date(context.deadline).toISOString(), revokedAt: null,
      instances: [{ instanceId: id(31), generation: 1, issuedAt: new Date(NOW).toISOString(), expiresAt: new Date(context.deadline).toISOString(), retiredAt: null, revokedAt: null,
        verifier: { mechanism: 'rfc5-7d', profileSha256: context.profileSha256, processIdentitySha256: id(32), channelIdentitySha256: id(33) } }] };
    const published = await publishUrlMachineLifecycle({ context, binding: { controllerSha256: id(1), parentBindingSha256: id(40) }, expected: null, next: canon(record) }, store);
    expect(published.ok).toBe(true); await store.close();
    const result = await f.machine.close(); expect(result).toEqual({ lifecycle: 'Unknown' }); expect(readUrlRunMachineClosedHistory(result)).toBeNull();
    const canonical = path.join(f.options.governanceRoot, 'governance/policies/dossier-machine-clients', `${clientId}.json`);
    expect(sha256(await readFile(canonical))).toBe(sha256(canon(record)));
  });
});
