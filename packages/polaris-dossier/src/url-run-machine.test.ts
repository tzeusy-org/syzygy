import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import * as fs from 'node:fs/promises';
import { createServer, type AddressInfo, type Server, type Socket } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import type { Duplex } from 'node:stream';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { sha256 } from '@syzygy/support';
import { policyFixture } from './full-run.testkit.js';
import { parseRunConfig } from './run-config.js';
import { DOSSIER_CONTENT_CLASSES, NO_WORK_ITEM_REASON, recordRunConfig } from './run-record.js';
import { buildDossierScreen } from './screen.js';
import { launchRestrictedUrlSession, prepareRestrictedUrlSession, URL_CLI_PROGRAM, type UrlSessionProcess } from './session-launch.js';
import { openSessionMachineConnection, prepareSessionMachineTransport, sessionMachineEffectContext, type SessionMachineTransport } from './session-machine-transport.js';
import { prepareHistoricalUrlRolePlansTestPort } from './url-role-plan.js';
import { createUrlRunMachine, isUrlRunMachineClosedHistory, readUrlRunMachineClosedHistory, type UrlRunMachineOptions } from './url-run-machine.js';
import { readUrlRuntime, type UrlRuntime } from './url-runtime.js';
import { URL_ORIGIN_POLICY_PATH } from './url-run-record.js';
import type { UrlMachineClientRecord } from './url-machine-instance.js';

const exec = promisify(execFile), opaque = () => randomBytes(32).toString('hex');
const sourceRoot = fileURLToPath(new URL('../../../', import.meta.url));
const cleanup: (() => Promise<unknown>)[] = [];
const request = (stream: Duplex): Promise<Buffer> => new Promise((resolve, reject) => {
  const chunks: Buffer[] = [];
  stream.on('data', (chunk: Buffer) => chunks.push(chunk));
  stream.once('end', () => resolve(Buffer.concat(chunks))); stream.once('error', reject);
});
let installedRoot: string, runtime: UrlRuntime;
afterEach(async () => { for (const close of cleanup.splice(0).reverse()) await close(); });
afterAll(async () => { await fs.rm(installedRoot, { recursive: true, force: true }); });

/** An owned installation, loaded by the real verifier. Only the author support
 * payloads are synthetic; C helpers and ordered-design support are compiled from
 * actual first-party sources. Unused worker/render images are never executed. */
beforeAll(async () => {
  installedRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'urm-image-'));
  const runtimeSource = await fs.readFile(path.join(sourceRoot, 'packages/polaris-dossier/src/url-runtime.ts'), 'utf8');
  const profileList = runtimeSource.split('const PROFILE_SOURCES = [')[1]!.split(']\n  .map')[0]!;
  const names = [...profileList.matchAll(/'([^']+)'/gu)].map(match => `packages/polaris-dossier/src/${match[1]}.ts`);
  names.push('packages/polaris-dossier/src/git-memory-worker.ts', 'packages/polaris-dossier/src/session-bridge.ts',
    'packages/polaris-dossier/src/session-mcp.ts', 'packages/polaris-dossier/src/session-peer.c',
    'packages/polaris-dossier/src/url-machine-peer.c', 'apps/three-surface-poc/src/polaris-generation/dossier-site.ts',
    'scripts/build_dossier_runtime.mjs', 'scripts/compile_dossier_session_support.mjs', 'scripts/compile_dossier_ordered_screen.mjs',
    'package-lock.json', 'package.json', 'packages/polaris-dossier/package.json');
  const inputs = [];
  for (const name of [...new Set(names)].sort()) {
    const bytes = await fs.readFile(path.join(sourceRoot, name)), target = path.join(installedRoot, name);
    await fs.mkdir(path.dirname(target), { recursive: true }); await fs.writeFile(target, bytes);
    inputs.push({ path: name, bytes: bytes.length, sha256: sha256(bytes) });
  }
  const directory = path.join(installedRoot, 'packages/polaris-dossier/dist/runtime');
  for (const name of ['support', 'design-support', 'host']) await fs.mkdir(path.join(directory, name), { recursive: true });
  const { compileDossierSessionSupport } = await import(new URL('scripts/compile_dossier_session_support.mjs', new URL('../../../', import.meta.url)).href) as {
    compileDossierSessionSupport: (read: (name: string) => Promise<Buffer>) => Promise<ReadonlyMap<string, Buffer>>;
  };
  const support = await compileDossierSessionSupport(name => fs.readFile(path.join(sourceRoot, name)));
  const bridge = Buffer.from("import {spawn} from 'node:child_process'; const child=spawn('/tool/node',['/tool/support/session-mcp.js'],{stdio:'inherit'}); child.on('exit',()=>process.exit(0));");
  const mcp = Buffer.from("import net from 'node:net'; const sockets=[]; function open(){const s=net.connect('/sockets/broker/b.sock'); sockets.push(s); s.on('error',()=>{}); s.once('connect',()=>s.end('OWN_FRAME\\n')); s.on('data',()=>open());} open();");
  const outputs = new Map<string, Buffer>([['worker.mjs', Buffer.from('// unused owned worker')], ['renderer.mjs', Buffer.from('// unused owned renderer')],
    ['support/session-bridge.js', bridge], ['support/session-mcp.js', mcp],
    ['design-support/session-mcp.js', support.get('design-support/session-mcp.js')!], ['host/ordered-screen.mjs', Buffer.from('// unused owned screen')]]);
  for (const [source, target] of [['session-peer', 'host/session-peer'], ['url-machine-peer', 'host/machine-peer']] as const) {
    const executable = path.join(directory, target);
    await exec('/usr/bin/cc', ['-std=c11', '-Wall', '-Wextra', '-Werror', '-O2', path.join(sourceRoot, `packages/polaris-dossier/src/${source}.c`), '-o', executable],
      { env: { PATH: '/usr/bin:/bin', LANG: 'C' }, timeout: 10_000, killSignal: 'SIGKILL', maxBuffer: 65_536 });
    outputs.set(target, await fs.readFile(executable));
  }
  const files = [];
  for (const name of ['worker.mjs', 'renderer.mjs', 'support/session-bridge.js', 'support/session-mcp.js', 'host/session-peer',
    'design-support/session-mcp.js', 'host/ordered-screen.mjs', 'host/machine-peer']) {
    const bytes = outputs.get(name)!; await fs.writeFile(path.join(directory, name), bytes, { mode: 0o600 });
    files.push({ path: name, bytes: bytes.length, sha256: sha256(bytes) });
  }
  const node = await fs.readFile(await fs.realpath(process.execPath));
  await fs.writeFile(path.join(directory, 'manifest.json'), JSON.stringify({ format: 'polaris-url-runtime/1',
    node: { version: process.version, bytes: node.length, sha256: sha256(node) }, inputs, inputTreeSha256: sha256(JSON.stringify(inputs)), files }));
  const loaded = await readUrlRuntime(installedRoot); expect(loaded.ok).toBe(true); if (!loaded.ok) throw new Error('owned runtime refused'); runtime = loaded.runtime;
}, 30_000);

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'urm-')); cleanup.push(() => fs.rm(root, { recursive: true, force: true }));
  const runId = `run-${opaque().slice(0, 32)}`, run = path.join(root, runId), views = path.join(root, 'views'), hidden = path.join(root, 'hidden');
  for (const name of [run, views, hidden]) await fs.mkdir(name, { mode: 0o700 });
  const canary = path.join(hidden, 'canary'); await fs.writeFile(canary, 'OWN SYNTHETIC CANARY');
  const snapshot = policyFixture(), screen = buildDossierScreen(snapshot.bytes, true, null, 'private'); if (!screen.ok) throw new Error();
  const parsed = parseRunConfig(JSON.stringify({ operator: 'own-operator', agentTool: 'claude-code', agentToolVersion: '2.1.327', agentProvider: 'anthropic',
    model: 'claude-sonnet-4-6', deadline: 'PT1H', agentTurnBudget: 20, maxRepairCycles: 2, maxQuestions: 1, audience: 'own readers', operatorIsOwner: false }));
  if (!parsed.ok) throw new Error();
  const record = recordRunConfig(parsed.config, { repository: { url: 'example.invalid/own/source', repositoryId: 'own-source', role: 'observed-source' },
    clone: { path: path.join(hidden, 'never-read-source'), declaredBy: 'operator', label: 'Inferred', use: 'read' },
    pinnedRevision: { commit: 'a'.repeat(40), label: 'own fixture', pinnedAt: '2026-11-19T00:00:00.000Z' }, screeningPolicy: snapshot.binding,
    contentClasses: DOSSIER_CONTENT_CLASSES, visibility: { value: 'private', source: 'conservative-default', declaredBy: 'conservative default', label: 'Inferred' },
    governed: { kind: 'unstated', because: ['own fixture'] }, workItem: { identity: null, reason: NO_WORK_ITEM_REASON } });
  let now = Date.now(), current = true, effectsCurrent = true, launch: UrlSessionProcess | undefined, auditing = 0, nativeCapacity = 0;
  let block: Promise<void> | undefined, reached: (() => void) | undefined;
  // The existing historical fixture port permits an owned synthetic bridge;
  // production ordered profiles bind the real bridge's fixed transcript hash.
  // This tests the production provisioner, not ordered CLI/provider execution.
  const plans = await prepareHistoricalUrlRolePlansTestPort({ run, record, screen: screen.screen,
    sessionDirectories: { author: run, inventory: path.join(root, 'inventory'), fidelity: path.join(root, 'fidelity'), design: path.join(root, 'design') },
    cliExecutable: await fs.realpath(path.join(os.homedir(), '.local/share/claude/versions', URL_CLI_PROGRAM.version)), parent: views,
    protectedPaths: [run, hidden], canaries: [canary], current: () => current, audit: () => {}, now, runtime });
  expect(plans.ok, JSON.stringify(plans)).toBe(true); if (!plans.ok) throw new Error(); cleanup.push(() => fs.rm(plans.socketRoot, { recursive: true, force: true }));
  const options: UrlRunMachineOptions = { governanceRoot: path.join(root, 'observing/.syzygy'), protectedRoot: path.join(hidden, 'store'),
    parent: { rowId: 'A-1', landedCommit: 'a'.repeat(40), defaultCommit: 'a'.repeat(40), tagObject: 'b'.repeat(40), subjects: [{ path: URL_ORIGIN_POLICY_PATH, sha256: 'c'.repeat(64) }] },
    originPolicySha256: 'c'.repeat(64), pin: 'a'.repeat(40), runId, runtime, plans: plans.roles, deadline: now + 60_000, now: () => now,
    current: () => current, effectCurrent: () => effectsCurrent, reverify: async () => { if (block) { reached?.(); await block; } return current && (launch === undefined || await launch.waitForSample()); },
    launch: role => role === 'author' ? launch : undefined, audit: () => { auditing++; }, chargeNativeCpuMicroseconds: capacity => { nativeCapacity += capacity; } };
  const machine = await createUrlRunMachine(options); cleanup.push(() => machine.close());
  const canonicalRoot = path.join(options.governanceRoot, 'governance/policies/dossier-machine-clients');
  const records = async (): Promise<UrlMachineClientRecord[]> => Promise.all((await fs.readdir(canonicalRoot)).filter(name => name.endsWith('.json'))
    .map(async name => JSON.parse(await fs.readFile(path.join(canonicalRoot, name), 'utf8')) as UrlMachineClientRecord));
  const accepted: Promise<Awaited<ReturnType<typeof openSessionMachineConnection>>>[] = [];
  const sockets = new Set<Socket>(), servers: Server[] = [];
  const loopback = createServer(socket => socket.end());
  await new Promise<void>(resolve => loopback.listen(0, '127.0.0.1', resolve)); cleanup.push(() => new Promise<void>(resolve => loopback.close(() => resolve())));
  const plan = plans.roles[0]!;
  const start = async () => {
    const preparation = await prepareRestrictedUrlSession({ view: plan.view, profile: plan.profile,
      expected: { nodeSha256: runtime.worker.nodeSha256, supportSha256: runtime.supportSha256 }, current: () => current,
      audit: () => {}, canaries: [canary], hostLoopbackPort: (loopback.address() as AddressInfo).port, limits: { milliseconds: 60_000 } });
    for (const [kind, directory, name] of [['mcp-shim', plan.view.brokerSocketDirectory, 'b.sock'], ['inference-bridge', plan.view.relaySocketDirectory, 'r.sock']] as const) {
      const transport: SessionMachineTransport = machine.transport('author', kind);
      const server = createServer({ pauseOnConnect: true, allowHalfOpen: true }, socket => {
        sockets.add(socket); socket.on('error', () => {});
        const connection = openSessionMachineConnection(socket, transport, { bytes: 65_536, milliseconds: 60_000 }); accepted.push(connection);
      });
      await new Promise<void>(resolve => server.listen(path.join(directory, name), resolve)); servers.push(server);
      expect(await prepareSessionMachineTransport(transport, server)).toBe(true);
    }
    cleanup.push(async () => { for (const socket of sockets) socket.destroy(); for (const server of servers) await new Promise<void>(resolve => server.close(() => resolve())); });
    launch = await launchRestrictedUrlSession({ preparation, host: {
      brokerSocket: path.join(plan.view.brokerSocketDirectory, 'b.sock'), relaySocket: path.join(plan.view.relaySocketDirectory, 'r.sock'),
      close: async () => ({ pendingInvocations: 0, termination: 'settled' }) } });
    cleanup.push(() => launch!.stop());
  };
  const connection = async (index: number) => {
    const until = performance.now() + 10_000;
    while (accepted.length <= index && performance.now() < until) await new Promise(resolve => setTimeout(resolve, 5));
    expect(accepted.length).toBeGreaterThan(index); return accepted[index]!;
  };
  return { root, options, machine, start, connection, records, auditCount: () => auditing, nativeCapacity: () => nativeCapacity,
    withdrawEffects: () => { effectsCurrent = false; },
    expire: () => { now = options.deadline; }, revoke: () => { current = false; },
    blockAdmission: () => { let release!: () => void; block = new Promise<void>(resolve => { release = resolve; });
      const entered = new Promise<void>(resolve => { reached = resolve; }); return { entered, release }; } };
}

describe('production URL run machine provisioner', { timeout: 60_000 }, () => {
  it('refuses changed numeric product limits before selecting a declared runtime', async () => {
    const file = path.join(installedRoot, 'packages/polaris-dossier/src/url-product-read-limits.ts');
    const original = await fs.readFile(file, 'utf8');
    expect(original).toContain('render: 30_000');
    try {
      await fs.writeFile(file, original.replace('render: 30_000', 'render: 30_001'));
      expect(await readUrlRuntime(installedRoot)).toEqual({ ok: false, code: 'url-runtime-unavailable' });
    } finally { await fs.writeFile(file, original); }
    const restored = await readUrlRuntime(installedRoot);
    expect(restored.ok && restored.runtime.profileRegistrySha256).toBe(runtime.profileRegistrySha256);
  });
  it.each(['close', 'withdraw-effects'] as const)('issues and rotates only actual peers; %s defeats awaited effects and permits durable retirement', async mode => {
    const f = await fixture(); expect(await f.records()).toEqual([]);
    await f.start(); const first = await f.connection(0); expect(first).not.toBeNull(); if (!first) return;
    expect(await request(first)).toEqual(Buffer.from('OWN_FRAME\n'));
    const firstContext = sessionMachineEffectContext(first)!;
    const initial = (await f.records())[0]!; expect(initial).toMatchObject({ revision: 1, role: 'author', kind: 'mcp-shim', scopes: ['source_read', 'artifact_read', 'artifact_write', 'dossier_step'] });
    expect(initial.instances).toHaveLength(1);
    expect(await firstContext.mediate('inference-forward', () => 'forbidden')).toEqual({ ok: false });
    const capacity = f.nativeCapacity();
    expect(await firstContext.mediate('artifact_read', boundary => { expect(boundary()).toBe(true); return 'owned'; })).toEqual({ ok: true, value: 'owned' });
    expect(f.nativeCapacity()).toBeGreaterThan(capacity);
    expect(await firstContext.mediate('artifact_read', () => new Promise<void>((resolve, reject) => first.write('rotate\n', error => error ? reject(error) : resolve())))).toEqual({ ok: true, value: undefined });
    const second = await f.connection(1); expect(second).not.toBeNull(); if (!second) return;
    expect(await request(second)).toEqual(Buffer.from('OWN_FRAME\n'));
    const rotated = (await f.records())[0]!; expect(rotated.revision).toBe(2); expect(rotated.issuanceId).toBe(initial.issuanceId);
    expect(rotated.instances).toHaveLength(2); expect(rotated.instances[0]!.retiredAt).not.toBeNull(); expect(rotated.instances[1]!.generation).toBe(2);
    expect(rotated.instances[1]!.verifier.channelIdentitySha256).not.toBe(rotated.instances[0]!.verifier.channelIdentitySha256);
    let effects = 0; expect(await firstContext.mediate('artifact_read', () => ++effects)).toEqual({ ok: false });
    expect(await sessionMachineEffectContext(second)!.mediate('artifact_read', () => ++effects)).toEqual({ ok: true, value: 1 });
    expect(f.auditCount()).toBe(3);
    let entered!: () => void, release!: () => void;
    const pending = new Promise<void>(resolve => { entered = resolve; }), released = new Promise<void>(resolve => { release = resolve; });
    const effectFile = path.join(f.root, 'withdrawn-effect');
    const effect = sessionMachineEffectContext(second)!.mediate('artifact_read', async boundary => {
      entered(); await released;
      if (boundary()) { await fs.writeFile(effectFile, 'OWN EFFECT'); effects++; }
    });
    await pending;
    const closing = mode === 'close' ? f.machine.close() : undefined;
    if (mode === 'withdraw-effects') f.withdrawEffects();
    release();
    expect(await effect).toEqual({ ok: false }); expect(effects).toBe(1);
    await expect(fs.stat(effectFile)).rejects.toMatchObject({ code: 'ENOENT' });
    expect(f.machine.current()).toBe(false);
    if (mode === 'withdraw-effects') {
      expect((await f.records())[0]!.revision).toBe(2);
      expect(() => f.machine.transport('author', 'mcp-shim')).toThrow('url-run-machine-unavailable');
    }
    if (closing !== undefined) expect(await closing).toEqual({ lifecycle: 'retired' });
    expect(await f.machine.close()).toEqual({ lifecycle: 'retired' });
    const retired = (await f.records())[0]!; expect(retired.revision).toBe(3); expect(retired.revokedAt).not.toBeNull();
    const closeResult = await f.machine.close(), evidence = readUrlRunMachineClosedHistory(closeResult);
    expect(evidence).not.toBeNull(); if (!evidence) return;
    expect(isUrlRunMachineClosedHistory(evidence)).toBe(true); expect(evidence.clients).toHaveLength(8);
    expect(readUrlRunMachineClosedHistory({ ...closeResult })).toBeNull();
    const issued = evidence.clients.filter(client => client.terminal.kind === 'revoked');
    expect(issued).toHaveLength(1); expect(evidence.clients.filter(client => client.terminal.kind === 'never-issued')).toHaveLength(7);
    const terminal = issued[0]!.terminal; if (terminal.kind !== 'revoked') throw new Error('owned revoked head absent');
    const persisted = JSON.parse(await fs.readFile(path.join(f.options.protectedRoot, 'state.json'), 'utf8'));
    expect(terminal.head).toEqual(persisted.clients.find((client: { clientId: string }) => client.clientId === retired.clientId).anchor.head);
    const exact = await fs.readFile(path.join(f.options.governanceRoot, 'governance/policies/dossier-machine-clients', `${retired.clientId}.json`));
    expect(terminal.head.record).toMatchObject({ clientId: retired.clientId, revision: 3, sha256: sha256(exact) });
    expect(issued[0]!.context).toMatchObject({ policySha256: f.options.originPolicySha256, profileSha256: f.options.plans[0]!.profile.digest,
      sourcePin: f.options.pin, runId: f.options.runId, role: 'author', kind: 'mcp-shim', deadline: f.options.deadline });
    expect(await sessionMachineEffectContext(second)!.mediate('artifact_read', () => ++effects)).toEqual({ ok: false }); expect(effects).toBe(1);
  });

  it.each(['close', 'withdraw-effects'] as const)('%s closes admission while a genuine socket awaits parent revalidation', async mode => {
    const f = await fixture(), barrier = f.blockAdmission(); await f.start(); await barrier.entered;
    if (mode === 'close') expect(await f.machine.close()).toEqual({ lifecycle: 'retired' });
    else f.withdrawEffects();
    barrier.release();
    expect(await f.connection(0)).toBeNull(); expect(await f.records()).toEqual([]); expect(f.machine.current()).toBe(false);
    expect(await f.machine.close()).toEqual({ lifecycle: 'retired' });
  });

  it('refuses copied capabilities before creating a store and reports expired retirement as Unknown', async () => {
    const f = await fixture(), separate = { ...f.options, protectedRoot: path.join(f.root, 'never-created') };
    await expect(createUrlRunMachine({ ...separate, runtime: { ...runtime } })).rejects.toThrow('url-run-machine-unavailable');
    await expect(createUrlRunMachine({ ...separate, plans: f.options.plans.map(plan => ({ ...plan })) })).rejects.toThrow('url-run-machine-unavailable');
    await expect(fs.stat(separate.protectedRoot)).rejects.toMatchObject({ code: 'ENOENT' });
    await f.start(); expect(await f.connection(0)).not.toBeNull(); f.expire();
    const result = await f.machine.close(); expect(result).toEqual({ lifecycle: 'Unknown' }); expect((await f.records())[0]!.revision).toBe(1);
    expect(readUrlRunMachineClosedHistory(result)).toBeNull();
  });
});
