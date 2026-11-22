import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { access, open, readFile, realpath, writeFile } from 'node:fs/promises';
import { connect } from 'node:net';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { sha256 } from '@syzygy/support';
import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { createOrderedDesignSessionProfile, DEFAULT_SESSION_MODEL } from './session-profile.js';
import { createSessionMachineTransport } from './session-machine-transport.js';
import { prepareUrlMachineListener } from './url-machine-peer.js';
import { planOrderedDesignBytes } from './url-design-delivery.js';
import { startOrderedDesignHost, type OrderedDesignHost } from './url-ordered-design-host.js';
import { createOrderedDesignSession, isProductionOrderedDesignSession } from './url-ordered-design-session.js';
import { createOrderedDesignAuditWriter } from './url-ordered-design-writer.js';
import { createUrlSessionBudget } from './url-session-budget.js';
import type { OrderedScreenProgram } from './url-ordered-design-screen.js';
import { V8 } from './screening-v8.testkit.js';

const directory = tempDir('odh-'), repository = new URL('../../../', import.meta.url);
const canonical = (value: unknown) => encodeCanonicalJson(value, { maxBytes: 2_097_152, maxNodes: 131_072, maxDepth: 48 });
const cleanup: (() => unknown | Promise<unknown>)[] = [];
afterEach(async () => { for (const close of cleanup.splice(0).reverse()) await close(); });
let program: OrderedScreenProgram, reader: { executable: string; sha256: string }, sequence = 0;
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
});

async function fixture() {
  const suffix = ++sequence, deadline = Date.now() + 60_000;
  const compiled = createOrderedDesignSessionProfile({ binding: { run: 'owned-host', role: 'design', sourceBinding: sha256(`owned source ${suffix}`),
    policy: sha256(V8), provider: 'anthropic', model: DEFAULT_SESSION_MODEL }, sessionId: '12345678-1234-4234-8234-123456789012',
    systemPrompt: 'Review owned material.', initialPrompt: 'Inspect every ordered part.', utcDate: '2026-11-22', kernelRelease: '7.0.0-owned' });
  if (!compiled.ok) throw new Error('owned profile refused');
  const profile = compiled.value.profile, originalText = 'Owned text. '.repeat(3000);
  const original = { bytes: Buffer.byteLength(originalText), sha256: sha256(originalText) };
  const envelope = Buffer.from(canonical({ format: 'polaris-dossier-url-design-inert-view/1', encoding: 'html-entities-five/1',
    originalSha256: original.sha256, originalBytes: original.bytes, payload: originalText, payloadSha256: original.sha256, payloadBytes: original.bytes }));
  const { algorithm: _algorithm, ...limits } = profile.transcript.partition;
  const planInput = { envelopeSha256: sha256(envelope), original, fileCount: 1, pageCount: 1, limits,
    parents: [sha256('owned parent')], instructionProfileSha256: sha256(profile.input.systemPrompt),
    binding: { basePolicySha256: profile.input.binding.policy, originPolicySha256: sha256('owned origin'), originalReceiptSha256: sha256('owned receipt'),
      producerSha256: sha256('owned producer'), profileSha256: profile.digest, encoding: 'html-entities-five/1' as const,
      project: 'project:owned', provider: 'anthropic', role: 'design' as const, round: 1, run: 'owned-host', session: profile.input.sessionId,
      transferEpoch: 1, pin: 'a'.repeat(40), deadline: new Date(deadline).toISOString() } };
  const plan = planOrderedDesignBytes({ ...planInput, envelope }), stored: string[] = [];
  let controller: ReturnType<typeof createOrderedDesignSession>, host: OrderedDesignHost | undefined;
  const writer = createOrderedDesignAuditWriter({ profile, plan, principal: 'owned-operator' }, {
    current: async () => true,
    append: async record => {
      const file = path.join(directory, `audit-${suffix}-${stored.length}.json`), handle = await open(file, 'wx', 0o600);
      try { await handle.writeFile(canonical(record)); await handle.sync(); } finally { await handle.close(); }
      stored.push(file); return () => readFileSync(file);
    },
  }, bytes => controller.chargeAuditRead(bytes));
  const operation = { cpuMicroseconds: 10_000_000, wallMilliseconds: 10_000, auditReadBytes: 500_000_000,
    inputCodeUnits: 8_388_608, secretCodeUnits: 103_000_000, secretCalls: 524_361, activeCodeUnits: 16_777_216, activeCalls: 32 };
  controller = createOrderedDesignSession({ profile, plan, principal: 'owned-operator', writer,
    budget: createUrlSessionBudget({ deadline, now: Date.now, turnBudget: 5, tokenBudget: null }),
    screening: { kind: 'bounded-worker', program, policyBytes: Buffer.from(V8), planInput },
    work: { runtimeSha256: sha256('owned runtime'), enforcement: { runtimeSha256: sha256('owned runtime'), workerSha256: program.worker.sha256,
      operations: { request: operation, response: operation, tool: operation, audit: operation, terminal: operation }, relayMilliseconds: 180_000, brokerMilliseconds: 85_000 },
      cpuMicroseconds: () => 0, remainingRunCpuMicroseconds: () => 1_000_000_000, chargeScreenCpuMicroseconds: () => {} },
    relay: () => host?.relay, envelope: () => envelope, current: () => true, assertCurrent: () => {}, stageVerdict: async () => null });
  expect(isProductionOrderedDesignSession(controller)).toBe(true);
  let activate!: (value: typeof controller) => void, reject!: (reason: Error) => void, callbacks = 0, accepts = 0;
  const activation = new Promise<typeof controller>((resolve, fail) => { activate = resolve; reject = fail; });
  // These owned endpoints intentionally issue no peer. Listener metadata setup
  // is native; a same-UID connection must never become an authenticated effect.
  const machine = createSessionMachineTransport({ prepare: server => prepareUrlMachineListener(server, reader) !== null,
    accept: async () => { accepts++; return null; } });
  if (!machine) throw new Error('owned transport refused');
  const brokerSocket = path.join(directory, `b${suffix}`), relaySocket = path.join(directory, `r${suffix}`);
  const start = async (activationDeadline = deadline, current: () => boolean | Promise<boolean> = () => true) => {
    host = await startOrderedDesignHost({ controller: activation, activationDeadline, profile,
      subject: { binding: profile.input.binding, project: 'project:owned', pin: 'a'.repeat(40), principal: 'owned-operator' },
      brokerSocket, relaySocket, brokerMachine: machine, relayMachine: machine, current,
      credential: { source: 'api-key-environment', credentialIdentity: 'Unknown', expiresAt: null,
        headers: () => { callbacks++; return null; }, close: () => {} },
      admit: () => { callbacks++; throw new Error('unexpected admission'); }, audit: () => { callbacks++; } });
    cleanup.push(() => host!.close()); return host;
  };
  return { controller, activate, reject, start, stored, brokerSocket, relaySocket, callbacks: () => callbacks, accepts: () => accepts };
}

async function absent(file: string) { await expect.poll(async () => { try { await access(file); return false; } catch { return true; } }, { timeout: 5000 }).toBe(true); }
describe('production ordered host activation', () => {
  it('binds native prepared listeners before activation and gates terminal access until the genuine bounded controller arrives', async () => {
    const f = await fixture(), host = await f.start();
    await access(f.brokerSocket); await access(f.relaySocket);
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
