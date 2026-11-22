import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { access, mkdir, open, readFile, realpath, writeFile } from 'node:fs/promises';
import { connect, createServer, type AddressInfo } from 'node:net';
import os from 'node:os';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { sha256 } from '@syzygy/support';
import { encodeCanonicalJson, REVIEW_STATUS_REGION_OPEN } from '@syzygy/polaris-generation-core/live';
import { createOrderedDesignSessionProfile, DEFAULT_SESSION_MODEL } from './session-profile.js';
import { assertSessionMachineEffectCurrent, createSessionMachineTransport } from './session-machine-transport.js';
import * as nativePeer from './url-machine-peer.js';
import { captureUrlMachinePeer, closeUrlMachinePeer, prepareUrlMachineListenerAsync, type UrlMachinePeer, type UrlMachineListener } from './url-machine-peer.js';
import { planOrderedDesignBytes } from './url-design-delivery.js';
import { isOrderedDesignHostFor, orderedDesignHostTestPort, startOrderedDesignHost, type OrderedDesignHost } from './url-ordered-design-host.js';
import { createOrderedDesignSession, isProductionOrderedDesignSession } from './url-ordered-design-session.js';
import { createOrderedDesignAuditWriter } from './url-ordered-design-writer.js';
import { createUrlSessionBudget } from './url-session-budget.js';
import type { OrderedScreenProgram } from './url-ordered-design-screen.js';
import * as screenRunner from './url-ordered-design-screen.js';
import { sessionRelayTestPort, type SessionAuditEvent } from './session-relay.js';
import { launchRestrictedUrlSession, prepareRestrictedUrlSession, URL_CLI_PROGRAM, type UrlSessionProcess } from './session-launch.js';
import * as peerCapture from './session-peer.js';
import { initializeUrlMachineStore } from './url-machine-store.js';
import { publishUrlMachineLifecycle } from './url-machine-lifecycle.js';
import { buildDesignPacket, validateDesignVerdict } from './design-review.js';
import { buildDossierScreen } from './screen.js';
import { createUrlDesignView } from './url-design-view.js';
import type { UrlMachineClientRecord, UrlMachineClientContext } from './url-machine-instance.js';
import { V8 } from './screening-v8.testkit.js';

const RUN = `run-${'a'.repeat(32)}`;
const directory = tempDir('odh-'), repository = new URL('../../../', import.meta.url);
const canonical = (value: unknown) => encodeCanonicalJson(value, { maxBytes: 2_097_152, maxNodes: 131_072, maxDepth: 48 });
const cleanup: (() => unknown | Promise<unknown>)[] = [];
afterEach(async () => { for (const close of cleanup.splice(0).reverse()) await close(); });
let program: OrderedScreenProgram, reader: { executable: string; sha256: string }, peerProgram: typeof reader;
let support: ReadonlyMap<string, Buffer>, runtimeSha256: string, controllerSha256: string, sequence = 0;
beforeAll(async () => {
  const { compileDossierOrderedScreen } = await import(new URL('scripts/compile_dossier_ordered_screen.mjs', repository).href) as {
    compileDossierOrderedScreen(root: string): Promise<{ outputFiles: { contents: Uint8Array }[] }> };
  const built = await compileDossierOrderedScreen(repository.pathname), worker = path.join(directory, 'screen.mjs');
  await writeFile(worker, built.outputFiles[0]!.contents);
  const selected = async (file: string) => { const bytes = await readFile(file); return { path: await realpath(file), bytes: bytes.length, sha256: sha256(bytes) }; };
  program = { node: await selected(process.execPath), worker: await selected(worker) };
  const executable = path.join(directory, 'reader');
  await promisify(execFile)('/usr/bin/cc', ['-std=c11', '-Wall', '-Wextra', '-Werror', '-O2',
    new URL('./url-machine-peer.c', import.meta.url).pathname, '-o', executable],
  { env: { PATH: '/usr/bin:/bin', LANG: 'C' }, timeout: 10_000, maxBuffer: 65_536 });
  reader = { executable, sha256: sha256(await readFile(executable)) };
  const peerExecutable = path.join(directory, 'peer');
  await promisify(execFile)('/usr/bin/cc', ['-std=c11', '-Wall', '-Wextra', '-Werror', '-O2',
    new URL('./session-peer.c', import.meta.url).pathname, '-o', peerExecutable],
  { env: { PATH: '/usr/bin:/bin', LANG: 'C' }, timeout: 10_000, maxBuffer: 65_536 });
  peerProgram = { executable: peerExecutable, sha256: sha256(await readFile(peerExecutable)) };
  const { compileDossierSessionSupport } = await import(new URL('scripts/compile_dossier_session_support.mjs', repository).href) as {
    compileDossierSessionSupport(read: (name: string) => Promise<Buffer>): Promise<ReadonlyMap<string, Buffer>> };
  support = await compileDossierSessionSupport(name => readFile(new URL(name, repository)));
  controllerSha256 = sha256(await readFile(new URL('./url-ordered-design-session.ts', import.meta.url)));
  runtimeSha256 = sha256(canonical({ node: program.node, worker: program.worker, reader, peerProgram, controllerSha256,
    hostSha256: sha256(await readFile(new URL('./url-ordered-design-host.ts', import.meta.url))), policySha256: sha256(V8),
    bridgeSha256: sha256(support.get('support/session-bridge.js')!), mcpSha256: sha256(support.get('design-support/session-mcp.js')!) }));
});

async function fixture(guards: Partial<Pick<Parameters<typeof createOrderedDesignSession>[0], 'current' | 'assertCurrent' | 'assertProcessingCurrent'>> = {}, authority: () => boolean = () => true) {
  const suffix = ++sequence, deadline = Date.now() + 3_600_000;
  const compiled = createOrderedDesignSessionProfile({ binding: { run: RUN, role: 'design', sourceBinding: sha256(`owned source ${suffix}`),
    policy: sha256(V8), provider: 'anthropic', model: DEFAULT_SESSION_MODEL }, sessionId: '12345678-1234-4234-8234-123456789012',
    systemPrompt: 'Review owned material.', initialPrompt: 'Inspect every ordered part.', utcDate: new Date().toISOString().slice(0, 10), kernelRelease: os.release() });
  if (!compiled.ok) throw new Error('owned profile refused');
  const profile = compiled.value.profile;
  const packet = buildDesignPacket({ run: '/owned/owned-host', runId: RUN, pinnedRevision: 'a'.repeat(40), audience: 'Owned reviewers',
    files: new Map([['index.html', `<p>${'Owned review text. '.repeat(35_000)}</p>\n${REVIEW_STATUS_REGION_OPEN}Review pending</aside>\n`], ['machine.json', `${JSON.stringify({ title: 'Owned review', reviewStatus: [] }, null, 2)}\n`]]) });
  if (!packet.ok) throw new Error('owned packet refused');
  const builtScreen = buildDossierScreen(Buffer.from(V8), true, null, 'private');
  if (!builtScreen.ok) throw new Error('owned screen refused');
  const view = createUrlDesignView({ original: Buffer.from(packet.bytes), screen: builtScreen.screen,
    expected: { runId: RUN, pinnedRevision: 'a'.repeat(40), bytes: packet.bytes.length, sha256: packet.sha256 } });
  const original = { bytes: packet.bytes.length, sha256: packet.sha256 }, envelope = Buffer.from(view.bytes);
  const { algorithm: _algorithm, ...limits } = profile.transcript.partition;
  const planInput = { envelopeSha256: sha256(envelope), original, fileCount: packet.files.length, pageCount: packet.pages.length, limits,
    parents: [sha256('owned parent')], instructionProfileSha256: sha256(profile.input.systemPrompt),
    binding: { basePolicySha256: profile.input.binding.policy, originPolicySha256: sha256('owned origin'), originalReceiptSha256: sha256('owned receipt'),
      producerSha256: sha256('owned producer'), profileSha256: profile.digest, encoding: 'html-entities-five/1' as const,
      project: 'project:syzygy', provider: 'anthropic', role: 'design' as const, round: 1, run: RUN, session: profile.input.sessionId,
      transferEpoch: 1, pin: 'a'.repeat(40), deadline: new Date(deadline).toISOString() } };
  const plan = planOrderedDesignBytes({ ...planInput, envelope }), stored: string[] = [];
  let controller: ReturnType<typeof createOrderedDesignSession>, host: OrderedDesignHost | undefined, workerCpu = 0, nativeCpu = 0, staged = 0;
  let beforeStageWrite: (() => void | Promise<void>) | undefined, stageWriteReached = false;
  let onRetire: (() => void) | undefined;
  const stagedFile = path.join(directory, `staged-${suffix}.json`);
  const cpuBound = (deadline - Date.now()) * 1000, parentCpuStart = process.cpuUsage();
  const workCpu = () => { const used = process.cpuUsage(parentCpuStart); return used.user + used.system + workerCpu; };
  const chargedCpu = () => workCpu() + nativeCpu;
  const chargeNative = (capacity: number) => { if (!Number.isSafeInteger(capacity) || capacity <= 0 || chargedCpu() + capacity > cpuBound) throw new Error('owned native CPU capacity unavailable'); nativeCpu += capacity; };
  const writer = createOrderedDesignAuditWriter({ profile, plan, principal: 'owned-operator' }, {
    current: async () => true,
    append: async record => {
      const file = path.join(directory, `audit-${suffix}-${stored.length}.json`), handle = await open(file, 'wx', 0o600);
      try { await handle.writeFile(canonical(record)); await handle.sync(); } finally { await handle.close(); }
      stored.push(file);
      if (record.kind === 'retired') onRetire?.();
      return () => readFileSync(file);
    },
  }, bytes => controller.chargeAuditRead(bytes));
  const operation = { cpuMicroseconds: 32_000_000, wallMilliseconds: 30_000, auditReadBytes: 500_000_000,
    inputCodeUnits: 8_388_608, secretCodeUnits: 103_000_000, secretCalls: 524_361, activeCodeUnits: 16_777_216, activeCalls: 32 };
  const budget = createUrlSessionBudget({ deadline, now: Date.now, turnBudget: 5, tokenBudget: null });
  controller = createOrderedDesignSession({ profile, plan, principal: 'owned-operator', writer,
    budget: { ...budget, current: () => authority() && budget.current() },
    screening: { kind: 'bounded-worker', program, policyBytes: Buffer.from(V8), planInput },
    work: { runtimeSha256, enforcement: { runtimeSha256, workerSha256: program.worker.sha256,
      operations: { request: operation, response: operation, tool: operation, audit: operation, terminal: operation }, relayMilliseconds: 180_000, brokerMilliseconds: 85_000 },
      cpuMicroseconds: workCpu,
      remainingRunCpuMicroseconds: () => cpuBound - chargedCpu(), chargeScreenCpuMicroseconds: value => { if (chargedCpu() + value > cpuBound) throw new Error('owned screen CPU capacity unavailable'); workerCpu += value; } },
    relay: () => host?.relay, envelope: () => envelope, current: () => true, assertCurrent: () => {}, ...guards, stageVerdict: async ({ stdin, assertCurrent }) => {
      assertCurrent();
      const verdict = JSON.parse(stdin);
      if (validateDesignVerdict(verdict, packet, 'a'.repeat(40), new Set()).length !== 0) return null;
      assertSessionMachineEffectCurrent();
      const file = stagedFile, handle = await open(file, 'wx', 0o600);
      stageWriteReached = true;
      try {
        await beforeStageWrite?.();
        assertCurrent(); assertSessionMachineEffectCurrent();
        await handle.writeFile(stdin);
        assertCurrent(); assertSessionMachineEffectCurrent();
        await handle.sync();
      } finally { await handle.close(); }
      assertCurrent();
      if (await readFile(file, 'utf8') !== stdin) return null;
      staged++; return sha256(stdin);
    } });
  expect(isProductionOrderedDesignSession(controller)).toBe(true);
  let activate!: (value: typeof controller) => void, reject!: (reason: Error) => void, callbacks = 0, accepts = 0;
  const activation = new Promise<typeof controller>((resolve, fail) => { activate = resolve; reject = fail; });
  // These owned endpoints intentionally issue no peer. Listener metadata setup
  // is native; a same-UID connection must never become an authenticated effect.
  const machine = createSessionMachineTransport({ prepare: async server => await prepareUrlMachineListenerAsync(server, reader) !== null,
    accept: async () => { accepts++; return null; } });
  if (!machine) throw new Error('owned transport refused');
  const brokerSocket = path.join(directory, `b${suffix}`), relaySocket = path.join(directory, `r${suffix}`);
  const start = async (activationDeadline = deadline, current: () => boolean | Promise<boolean> = () => true) => {
    host = await startOrderedDesignHost({ controller: activation, activationDeadline, profile,
      subject: { binding: profile.input.binding, project: 'project:syzygy', pin: 'a'.repeat(40), principal: 'owned-operator' },
      brokerSocket, relaySocket, brokerMachine: machine, relayMachine: machine, current,
      credential: { source: 'api-key-environment', credentialIdentity: 'Unknown', expiresAt: null,
        headers: () => { callbacks++; return null; }, close: () => {} },
      admit: () => { callbacks++; throw new Error('unexpected admission'); }, audit: () => { callbacks++; } });
    cleanup.push(() => host!.close()); return host;
  };
  return { controller, profile, plan, packet, envelope, deadline, activation, activate, reject, start, stored, brokerSocket, relaySocket,
    setHost: (value: OrderedDesignHost) => { host = value; }, setOnRetire: (value: () => void) => { onRetire = value; }, stagedFile, stageWriteReached: () => stageWriteReached, staged: () => staged, setBeforeStageWrite: (value: () => void | Promise<void>) => { beforeStageWrite = value; }, workerCpu: () => workerCpu, chargeNative, nativeCpu: () => nativeCpu, cpuBound, callbacks: () => callbacks, accepts: () => accepts };
}

async function absent(file: string) { await expect.poll(async () => { try { await access(file); return false; } catch { return true; } }, { timeout: 5000 }).toBe(true); }
describe('bounded processing and protected result validation', () => {
  it('rechecks continuous authority after the full currentness port awaits', async () => {
    let valid = true;
    const f = await fixture({ current: async () => { await Promise.resolve(); valid = false; return true; } }, () => valid);
    await f.start(); f.activate(f.controller);
    const { tool_choice: _toolChoice, ...baseline } = f.profile.baseline;
    const initial = Buffer.from(canonical({ ...baseline,
      metadata: { user_id: JSON.stringify({ device_id: 'b'.repeat(64), account_uuid: '', session_id: f.profile.input.sessionId }) },
      messages: [f.profile.initialMessage] }));
    await expect(f.controller.checkRequest(initial)).rejects.toThrow('url-ordered-design-session-refused');
    expect(f.workerCpu()).toBe(0);
    expect(f.callbacks()).toBe(0);
  });

  it.each(['renewed', 'changed', 'revoked', 'unavailable', 'expired-at-entry'] as const)('requires a current product before and after processing: %s', async scenario => {
    let fullChecks = 0, processingChecks = 0, refreshes = 0, proofCurrent = false;
    const f = await fixture({
      current: () => {
        refreshes++;
        if (scenario === 'unavailable' || (scenario === 'changed' && processingChecks > 0)) return false;
        // The proof can expire between this observation and the caller's guard.
        proofCurrent = scenario !== 'expired-at-entry';
        return true;
      },
      assertCurrent: () => { fullChecks++; if (!proofCurrent) throw new Error('owned product proof expired'); },
      assertProcessingCurrent: () => {
        processingChecks++;
        proofCurrent = false;
        if (scenario === 'revoked' && processingChecks >= 20) throw new Error('owned processing authority revoked');
      },
    });
    await f.start(); f.activate(f.controller);
    const { tool_choice: _toolChoice, ...baseline } = f.profile.baseline;
    const initial = Buffer.from(canonical({ ...baseline,
      metadata: { user_id: JSON.stringify({ device_id: 'b'.repeat(64), account_uuid: '', session_id: f.profile.input.sessionId }) },
      messages: [f.profile.initialMessage] }));
    const checked = f.controller.checkRequest(initial);
    if (scenario === 'renewed') {
      expect(await checked).toMatchObject({ ok: true });
      expect(proofCurrent).toBe(true);
      expect(refreshes).toBeGreaterThanOrEqual(2);
      expect(f.workerCpu()).toBe(18_000_000);
    } else {
      await expect(checked).rejects.toThrow(scenario === 'expired-at-entry'
        ? 'owned product proof expired' : 'url-ordered-design-session-refused');
      expect(f.workerCpu()).toBe(scenario === 'changed' ? 18_000_000 : 0);
    }
    if (scenario === 'unavailable' || scenario === 'expired-at-entry') {
      expect(processingChecks).toBe(0);
      expect(refreshes).toBe(1);
      expect(fullChecks).toBe(scenario === 'expired-at-entry' ? 1 : 0);
    } else expect(processingChecks).toBeGreaterThan(10);
    // Full physical product validation belongs at the operation boundaries,
    // rather than once for every 65 KiB of the trusted runtime image.
    expect(fullChecks).toBeLessThan(10);
    expect(f.callbacks()).toBe(0);
  });
});

describe('production ordered host activation', () => {
  it('binds native prepared listeners before activation and gates terminal access until the genuine bounded controller arrives', async () => {
    const f = await fixture(), host = await f.start();
    await access(f.brokerSocket); await access(f.relaySocket);
    expect(isOrderedDesignHostFor(host, f.profile)).toBe(true);
    expect(isOrderedDesignHostFor({ ...host }, f.profile)).toBe(false);
    let settled = false;
    const terminal = host.readTerminal().finally(() => { settled = true; });
    void terminal.catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(settled).toBe(false); expect(f.callbacks()).toBe(0);
    f.activate(f.controller);
    await expect(terminal).rejects.toThrow('url-ordered-design-session-refused');
    expect(f.callbacks()).toBe(0);
  });

  it.each(['deadline', 'rejection', 'copied-controller', 'foreign-profile'] as const)('closes both endpoints on %s without granting a callback', async reason => {
    const f = await fixture(), host = await f.start(reason === 'deadline' ? Date.now() + 1500 : undefined);
    if (reason === 'rejection') f.reject(new Error('owned activation refused'));
    if (reason === 'copied-controller') f.activate({ ...f.controller });
    if (reason === 'foreign-profile') f.activate((await fixture()).controller);
    await absent(f.brokerSocket); await absent(f.relaySocket);
    await expect(host.readTerminal()).rejects.toThrow('url-ordered-design-host-unavailable');
    f.activate(f.controller);
    if (reason === 'deadline') {
      await expect.poll(() => f.stored.length).toBe(1);
      expect(JSON.parse(await readFile(f.stored[0]!, 'utf8')).kind).toBe('retired');
    } else expect(f.stored).toHaveLength(0);
    expect(f.callbacks()).toBe(0);
  });

  it('bounds startup currentness by the original activation deadline', async () => {
    const f = await fixture();
    await expect(f.start(Date.now() + 100, () => new Promise<boolean>(() => {}))).rejects.toThrow('url-ordered-design-host-unavailable');
    await absent(f.brokerSocket); await absent(f.relaySocket);
    expect(f.callbacks()).toBe(0);
  });

  it('refuses same-UID raw broker and HTTP connections without authenticated peer authority', async () => {
    const f = await fixture(), host = await f.start();
    expect(host.healthy?.()).toBe(true);
    for (const [socketPath, bytes] of [[f.brokerSocket, '{"tool":"dossier_step","input":{}}\n'],
      [f.relaySocket, 'POST /v1/messages HTTP/1.1\r\nHost: owned\r\nContent-Length: 2\r\n\r\n{}']] as const) {
      await new Promise<void>(resolve => { const socket = connect(socketPath); socket.on('error', () => {});
        socket.once('connect', () => socket.end(bytes)); socket.once('close', () => resolve()); });
    }
    expect(f.accepts()).toBe(2); expect(f.callbacks()).toBe(0); expect(f.stored).toHaveLength(0);
    expect(host.healthy?.()).toBe(false);
  });
});

/** Provider bytes are owned synthetic input. Launch, fixed bridge/MCP images,
 * accepted sockets, per-chunk sender proofs, lifecycle files and effect leases
 * are the real production components. Provider receipt remains Unknown. */
async function nativeExchange(revoke: false | 'send' | 'stage' | 'proof-expiry' = false) {
  let proofExpired = false, responseProofRenewals = 0;
  const f = await fixture({
    current: () => {
      if (revoke === false && proofExpired) {
        assertSessionMachineEffectCurrent();
        proofExpired = false;
        responseProofRenewals++;
      }
      return true;
    },
    assertCurrent: () => { if (proofExpired) throw new Error('owned product proof expired'); },
  }), root = tempDir('ohn-');
  for (const name of ['support', 'home', 'work', 'broker', 'relay', 'hidden']) await mkdir(path.join(root, name), { mode: 0o700 });
  const canary = path.join(root, 'hidden/canary'); await writeFile(canary, 'OWN SYNTHETIC CANARY');
  const bridge = support.get('support/session-bridge.js')!, mcp = support.get('design-support/session-mcp.js')!;
  const bridgePath = path.join(root, 'support/session-bridge.js'), mcpPath = path.join(root, 'support/session-mcp.js');
  await writeFile(bridgePath, bridge); await writeFile(mcpPath, mcp);
  // The selected runtime already holds this observed identity. Preparation
  // and each peer capture still re-hash the actual installed Node image.
  const node = program.node.path, nodeSha256 = program.node.sha256;
  const governanceRoot = path.join(root, 'observing/.syzygy');
  await mkdir(path.join(governanceRoot, 'governance/policies/dossier-machine-clients'), { recursive: true });
  let current = true, launch: UrlSessionProcess | undefined, ready!: () => void, machineAudits = 0, captures = 0;
  const registered = new Promise<void>(resolve => { ready = resolve; });
  const store = await initializeUrlMachineStore({ governanceRoot, protectedRoot: path.join(root, 'hidden/store'),
    now: Date.now, deadline: f.deadline, current: () => current });
  if (!store) throw new Error('owned store refused'); cleanup.push(() => store.close());
  const opaque = () => randomBytes(32).toString('hex'), peers: UrlMachinePeer[] = [];
  cleanup.push(() => { for (const peer of peers) closeUrlMachinePeer(peer); });
  let refuseAuthentication!: () => void;
  const authenticationRefused = new Promise<void>(resolve => { refuseAuthentication = resolve; });
  // A durable refusal already defeats this owned fixture. Stop its real CLI
  // rather than spending the remainder of the lifetime on SDK retry delays.
  f.setOnRetire(refuseAuthentication);
  const peerChecks = { count: 0, maximumMilliseconds: 0 };
  const realCapture = peerCapture.captureKernelUnixPeerAsync;
  const captureSpy = vi.spyOn(peerCapture, 'captureKernelUnixPeerAsync').mockImplementation(async (...args) => {
    const started = performance.now(), result = await realCapture(...args);
    peerChecks.count++; peerChecks.maximumMilliseconds = Math.max(peerChecks.maximumMilliseconds, Math.ceil(performance.now() - started));
    return result;
  });
  cleanup.push(() => captureSpy.mockRestore());
  const eventLoop = monitorEventLoopDelay({ resolution: 1 });
  cleanup.push(() => eventLoop.disable());
  const stages: { stage: string; milliseconds: number; ok: boolean }[] = [];
  const reads = { count: 0, data: 0, end: 0, pending: 0, refused: 0, maximumMilliseconds: 0 };
  const realRead = nativePeer.readUrlMachinePeer;
  const readSpy = vi.spyOn(nativePeer, 'readUrlMachinePeer').mockImplementation(async peer => {
    const started = performance.now(), result = await realRead(peer);
    reads.count++; reads.maximumMilliseconds = Math.max(reads.maximumMilliseconds, Math.ceil(performance.now() - started));
    if (!result) { reads.refused++; refuseAuthentication(); } else reads[result.kind]++;
    return result;
  });
  cleanup.push(() => readSpy.mockRestore());
  const binding = { parentBindingSha256: sha256(canonical({ profile: f.profile.digest, policy: sha256(V8), packet: f.packet.sha256 })), controllerSha256 };
  const transport = async (kind: 'mcp-shim' | 'inference-bridge') => {
    const slot = await store.allocateClient(f.deadline); if (!slot) throw new Error('owned slot refused');
    const context: UrlMachineClientContext = { clientId: slot.clientId, policySha256: sha256('owned origin'), sourcePin: 'a'.repeat(40),
      runId: RUN, role: 'design', kind, profileSha256: f.profile.digest, now: Date.now(), deadline: f.deadline,
      allowedScopes: kind === 'mcp-shim' ? ['artifact_read', 'dossier_step'] : ['inference-forward'] };
    let listener: UrlMachineListener | null = null, previous: UrlMachineClientRecord | undefined;
    return createSessionMachineTransport({ prepare: async server => (listener = await prepareUrlMachineListenerAsync(server, reader, f.chargeNative)) !== null,
      accept: async socket => {
        await registered;
        let started = performance.now();
        const peer = listener && launch ? await captureUrlMachinePeer({ socket, listener, launch, profile: f.profile, context,
          store, binding, programs: { peer: peerProgram, reader }, installed: { executable: node, sha256: nodeSha256,
            script: kind === 'mcp-shim' ? mcpPath : bridgePath, scriptSha256: sha256(kind === 'mcp-shim' ? mcp : bridge) },
          protectedPaths: [path.join(root, 'hidden'), governanceRoot], now: Date.now,
          current: async () => current && launch !== undefined && await launch.waitForSample() && current,
          effectCurrent: () => current,
          audit: async record => {
            const handle = await open(path.join(root, 'hidden', `effect-${machineAudits}.json`), 'wx', 0o600);
            try { await handle.writeFile(canonical(record)); await handle.sync(); } finally { await handle.close(); }
            machineAudits++;
          }, chargeNativeCpuMicroseconds: f.chargeNative }) : null;
        stages.push({ stage: `${kind}:capture`, milliseconds: Math.ceil(performance.now() - started), ok: peer !== null });
        if (!peer) { refuseAuthentication(); return null; }
        peers.push(peer); captures++;
        const now = new Date().toISOString(), instance = { instanceId: opaque(), generation: (previous?.instances.length ?? 0) + 1,
          issuedAt: now, expiresAt: new Date(f.deadline).toISOString(), retiredAt: null, revokedAt: null, verifier: peer.verifier };
        const next: UrlMachineClientRecord = { format: 'polaris-dossier-local-machine-client/1', clientId: slot.clientId,
          issuanceId: previous?.issuanceId ?? opaque(), policySha256: context.policySha256, revision: (previous?.revision ?? 0) + 1,
          projectId: 'project:syzygy', sourcePin: context.sourcePin, runId: context.runId, role: 'design', kind,
          scopes: context.allowedScopes, issuedAt: previous?.issuedAt ?? now, expiresAt: instance.expiresAt, revokedAt: null,
          instances: [...(previous?.instances.map(value => ({ ...value, retiredAt: value.retiredAt ?? now })) ?? []), instance] };
        started = performance.now();
        const published = await publishUrlMachineLifecycle({ context: { ...context, now: Date.now() }, binding,
          expected: previous === undefined ? null : { revision: previous.revision, sha256: sha256(canonical(previous)) },
          next: Buffer.from(canonical(next)) }, store);
        stages.push({ stage: `${kind}:publish`, milliseconds: Math.ceil(performance.now() - started), ok: published.ok });
        if (!published.ok) { refuseAuthentication(); closeUrlMachinePeer(peer); return null; }
        previous = next; return peer;
      } })!;
  };
  const brokerMachine = await transport('mcp-shim'), relayMachine = await transport('inference-bridge');
  const verdict = { schemaVersion: 'polaris-dossier-local-design-verdict-v1', pinnedRevision: 'a'.repeat(40), packetSha256: f.packet.sha256,
    sessionId: f.profile.input.sessionId, readiness: 'ready', pageReview: f.packet.pages.map(page => ({ page, verdict: 'acceptable', reason: 'Owned review.' })), findings: [] };
  const calls = [{ type: 'tool_use', id: 'toolu_poll_owned', name: 'mcp__syzygy__dossier_step', input: { argv: ['dossier', 'poll', RUN] } },
    ...f.plan.manifest.parts.map(part => ({ type: 'tool_use', id: `toolu_part_owned_${part.ordinal}`, name: 'mcp__syzygy__artifact_read', input: { path: part.path } })),
    { type: 'tool_use', id: 'toolu_verdict_owned', name: 'mcp__syzygy__dossier_step', input: { argv: ['dossier', 'await', '/work', '--submit', 'round-1/verdict.json', '--stdin'], stdin: canonical(verdict) } }];
  const screenTimes: { operation: string; wallMilliseconds: number; ok: boolean }[] = [];
  const realScreen = screenRunner.runOrderedDesignScreen;
  const spy = vi.spyOn(screenRunner, 'runOrderedDesignScreen').mockImplementation(async input => {
    const started = performance.now(), result = await realScreen(input);
    screenTimes.push({ operation: input.input.operation, wallMilliseconds: Math.ceil(performance.now() - started), ok: result.ok });
    return result;
  });
  cleanup.push(() => spy.mockRestore());
  let forwards = 0, terminal: Awaited<ReturnType<typeof f.controller.readTerminal>> | undefined;
  const observed: SessionAuditEvent[] = [], requests: unknown[] = [];
  const event = (type: string, value: Record<string, unknown>) => `event: ${type}\ndata: ${JSON.stringify({ type, ...value })}\n\n`;
  const relay = sessionRelayTestPort(async input => {
    const ordinal = forwards++, call = calls[ordinal];
    requests.push(JSON.parse(Buffer.from(input.body).toString('utf8')));
    const body = Buffer.from(event('message_start', { message: { id: `msg_owned_${ordinal}`, type: 'message', role: 'assistant', model: DEFAULT_SESSION_MODEL,
      content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 3, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } } })
      + event('content_block_start', { index: 0, content_block: call ? { ...call, input: {} } : { type: 'text', text: '' } })
      + event('content_block_delta', { index: 0, delta: call ? { type: 'input_json_delta', partial_json: canonical(call.input) }
        : { type: 'text_delta', text: 'SYZYGY_DESIGN_TRANSFER_COMPLETE' } })
      + event('content_block_stop', { index: 0 })
      + event('message_delta', { delta: { stop_reason: call ? 'tool_use' : 'end_turn', stop_sequence: null }, usage: { output_tokens: 4 } })
      + event('message_stop', {}));
    return { status: 200, contentType: 'text/event-stream', requestFlushed: true, body };
  });
  const loopback = createServer(socket => socket.end());
  await new Promise<void>(resolve => loopback.listen(0, '127.0.0.1', resolve)); cleanup.push(() => new Promise<void>(resolve => loopback.close(() => resolve())));
  const preparation = await prepareRestrictedUrlSession({ profile: f.profile,
    view: { role: 'design', cliExecutable: await realpath(path.join(os.homedir(), '.local/share/claude/versions', URL_CLI_PROGRAM.version)),
      nodeExecutable: node, supportDirectory: path.join(root, 'support'), homeDirectory: path.join(root, 'home'), workDirectory: path.join(root, 'work'),
      brokerSocketDirectory: path.join(root, 'broker'), relaySocketDirectory: path.join(root, 'relay'), protectedPaths: [path.join(root, 'hidden')] },
    expected: { nodeSha256, supportSha256: { 'session-bridge.js': sha256(bridge), 'session-mcp.js': sha256(mcp) } },
    current: () => current, audit: () => {}, canaries: [canary], hostLoopbackPort: (loopback.address() as AddressInfo).port,
    limits: { milliseconds: 120_000 } });
  const host = await orderedDesignHostTestPort(relay)({ controller: f.activation, activationDeadline: Date.now() + 30_000,
    profile: f.profile, brokerSocket: path.join(root, 'broker/b.sock'), relaySocket: path.join(root, 'relay/r.sock'), brokerMachine, relayMachine,
    subject: { binding: f.profile.input.binding, project: 'project:syzygy', pin: 'a'.repeat(40), principal: 'owned-operator' }, current: () => current,
    credential: { source: 'api-key-environment', credentialIdentity: 'Unknown', expiresAt: null,
      headers: headers => ({ ...headers, authorization: 'Bearer NONSECRET-SYNTHETIC-ONLY' }), close: () => {} },
    admit: (checks, replies) => ({ digest: checks.forwarded.sha256, bytes: checks.forwarded.bytes, classes: ['derived-composites'], originIds: ['owned:packet', ...replies.map(reply => reply.id)] }),
    audit: async row => {
      observed.push(row);
      if (revoke === 'send' && row.event === 'attempt-allowed') current = false;
      // Expire the checked view after the controller finishes the first send
      // audit. The next controller operation is mediated response screening.
      if (revoke === false && row.event === 'send-outcome' && forwards === 1) proofExpired = true;
      if (row.event === 'response-admitted' && row.response?.stopReason === 'end_turn') {
        assertSessionMachineEffectCurrent();
        terminal = await f.controller.readTerminal();
        assertSessionMachineEffectCurrent();
      }
    } });
  f.setHost(host);
  if (revoke === 'stage') f.setBeforeStageWrite(() => { current = false; });
  if (revoke === 'proof-expiry') f.setBeforeStageWrite(() => { proofExpired = true; });
  cleanup.push(() => host.close());
  expect(isOrderedDesignHostFor(host, f.profile)).toBe(true);
  eventLoop.enable();
  launch = await launchRestrictedUrlSession({ preparation, host }); ready(); f.activate(f.controller); cleanup.push(() => launch!.stop());
  const outcome = await Promise.race([launch.finished, authenticationRefused.then(() => launch!.stop())]);
  eventLoop.disable();
  const recordKinds = await Promise.all(f.stored.map(async file => (JSON.parse(await readFile(file, 'utf8')) as { kind: string }).kind));
  return { f, outcome, forwards, observed, terminal, requests, recordKinds, captures, machineAudits, screenTimes, stages, reads, peerChecks,
    responseProofRenewals, maximumEventLoopMilliseconds: Math.ceil(eventLoop.max / 1_000_000) };
}

function exchangeDiagnostic(result: Awaited<ReturnType<typeof nativeExchange>>): string {
  return JSON.stringify({ outcome: result.outcome.outcome, forwards: result.forwards, captures: result.captures,
    machineAudits: result.machineAudits, observed: result.observed.map(row => row.event), recordKinds: result.recordKinds,
    screenTimes: result.screenTimes, stages: result.stages, reads: result.reads, peerChecks: result.peerChecks,
    maximumEventLoopMilliseconds: result.maximumEventLoopMilliseconds, workerCapacityCpuMicroseconds: result.f.workerCpu(),
    nativeCapacityCpuMicroseconds: result.f.nativeCpu(), runCpuBoundMicroseconds: result.f.cpuBound });
}

describe('native authenticated ordered host', { timeout: 180_000 }, () => {
  it('transfers both sealed parts, validates and stages the verdict, consumes the acknowledgment and reaches eligible', async () => {
    const result = await nativeExchange();
    expect(result.outcome, exchangeDiagnostic(result)).toMatchObject({ outcome: 'exited', exitCode: 0 });
    expect(result.forwards).toBe(5); expect(result.captures).toBeGreaterThanOrEqual(9); expect(result.machineAudits).toBeGreaterThan(20);
    expect(result.responseProofRenewals).toBe(1);
    expect(result.f.staged()).toBe(1); expect(result.f.workerCpu()).toBeGreaterThan(0);
    expect(result.terminal).toMatchObject({ packetSha256: result.f.packet.sha256 });
    const last = result.requests.at(-1) as { messages: { content: string | { type: string; tool_use_id?: string; content: { text: string }[] }[] }[] };
    const parts = last.messages.flatMap(message => typeof message.content === 'string' ? [] : message.content
      .filter(block => block.type === 'tool_result' && block.tool_use_id?.startsWith('toolu_part_owned_'))
      .map(block => (JSON.parse(block.content[0]!.text) as { text: string }).text));
    expect(parts).toHaveLength(2);
    expect(sha256(parts.join(''))).toBe(sha256(result.f.envelope));
    const records = await Promise.all(result.f.stored.map(async file => JSON.parse(await readFile(file, 'utf8'))));
    expect(records.at(-1).kind).toBe('eligible'); expect(records.filter(record => record.kind === 'part-receipt')).toHaveLength(2);
    expect(records.filter(record => record.kind === 'acknowledgment-receipt')).toHaveLength(1);
    console.info(JSON.stringify({ observation: 'owned-ordered-native-composition', providerActualReceipt: 'Unknown',
      subject: 'packages/polaris-dossier/src/url-ordered-design-host.test.ts', subjectSha256: sha256(await readFile(new URL(import.meta.url))),
      runtimeSha256, workerSha256: program.worker.sha256, packetSha256: result.f.packet.sha256,
      receivedEnvelopeSha256: sha256(parts.join('')), checkedStageSha256: sha256(await readFile(result.f.stagedFile)),
      forwards: result.forwards, authenticatedConnections: result.captures, durableNativeEffectAudits: result.machineAudits,
      nativeAttestations: result.peerChecks.count, stagedVerdicts: result.f.staged(),
      partReceipts: records.filter(record => record.kind === 'part-receipt').length,
      acknowledgmentReceipts: records.filter(record => record.kind === 'acknowledgment-receipt').length, terminal: records.at(-1).kind,
      chargedWorkerCpuMicroseconds: result.f.workerCpu(), chargedNativeCpuMicroseconds: result.f.nativeCpu(),
      runCpuBoundMicroseconds: result.f.cpuBound }));
  });
  it('revokes actual peer authority after the pre-send audit and forwards no provider bytes', async () => {
    const result = await nativeExchange('send');
    expect(result.forwards, exchangeDiagnostic(result)).toBe(0); expect(result.f.staged()).toBe(0); expect(result.terminal).toBeUndefined();
    expect(result.observed.some(row => row.event === 'attempt-allowed')).toBe(true);
    expect(result.machineAudits).toBeGreaterThan(0);
  });
  it.each(['stage', 'proof-expiry'] as const)('refuses the protected write and acknowledgment after the stage await: %s', async boundary => {
    const result = await nativeExchange(boundary);
    expect(result.forwards, exchangeDiagnostic(result)).toBe(4); expect(result.f.stageWriteReached()).toBe(true);
    expect(await readFile(result.f.stagedFile)).toHaveLength(0);
    expect(result.f.staged()).toBe(0); expect(result.terminal).toBeUndefined();
    const records = await Promise.all(result.f.stored.map(async file => JSON.parse(await readFile(file, 'utf8'))));
    expect(records.some(record => record.kind === 'delivery-completed')).toBe(true);
    expect(records.some(record => ['verdict-staged', 'acknowledgment-receipt', 'eligible'].includes(record.kind))).toBe(false);
  });

});
