import { readFile, writeFile, realpath, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { sha256 } from '@syzygy/support';
import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { createOrderedDesignSessionProfile, DEFAULT_SESSION_MODEL } from './session-profile.js';
import { planOrderedDesignBytes } from './url-design-delivery.js';
import { runOrderedDesignScreen, type OrderedScreenProgram } from './url-ordered-design-screen.js';
import { ORDERED_SCREEN_LIMITS, type OrderedScreenInput } from './url-ordered-design-screen-protocol.js';
import { V8 } from './screening-v8.testkit.js';

const root = new URL('../../../', import.meta.url), directory = tempDir('ordered-screen-');
const canonical = (value: unknown) => encodeCanonicalJson(value, { maxBytes: 16_777_216, maxNodes: 131_072, maxDepth: 48 });
let program: OrderedScreenProgram, workerBytes: Buffer;
async function selected(path: string) { const bytes = await readFile(path); return { path: await realpath(path), bytes: bytes.length, sha256: sha256(bytes) }; }
beforeAll(async () => {
  const { compileDossierOrderedScreen } = await import(new URL('scripts/compile_dossier_ordered_screen.mjs', root).href) as {
    compileDossierOrderedScreen(root: string): Promise<{ outputFiles: { contents: Uint8Array }[] }> };
  const compiled = await compileDossierOrderedScreen(root.pathname);
  workerBytes = Buffer.from(compiled.outputFiles[0]!.contents);
  const worker = join(directory, 'worker.mjs'); await writeFile(worker, workerBytes, { mode: 0o600 });
  program = { node: await selected(process.execPath), worker: await selected(worker) };
});

function fixture(policy = V8) {
  const policySha256 = sha256(policy);
  const issued = createOrderedDesignSessionProfile({ binding: { run: 'owned-screen', role: 'design', sourceBinding: sha256('owned source'),
    policy: policySha256, provider: 'anthropic', model: DEFAULT_SESSION_MODEL }, sessionId: '12345678-1234-4234-8234-123456789012',
  systemPrompt: 'Review the owned dossier.', initialPrompt: 'Review every source.', utcDate: '2026-11-22', kernelRelease: '7.0.0-fixture' });
  if (!issued.ok) throw new Error('own profile refused');
  const { profile } = issued.value;
  const common = { policyBase64: Buffer.from(policy).toString('base64'), policySha256, profileInput: profile.input, profileSha256: profile.digest };
  const response = (text = 'Owned response.') => ({ ...common, operation: 'response' as const, contentType: 'application/json',
    receivedBase64: Buffer.from(JSON.stringify({ id: 'msg_owned', type: 'message', role: 'assistant', model: DEFAULT_SESSION_MODEL,
      content: [{ type: 'text', text }], stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } })).toString('base64') });
  const originalText = canonical({ format: 'polaris-dossier-design-packet/1', kind: 'design', runId: profile.input.binding.run, text: 'a'.repeat(656_000) });
  const original = { bytes: Buffer.byteLength(originalText), sha256: sha256(originalText) };
  const payload = originalText.replace(/[&<>"']/gu, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
  const envelopeUtf8 = canonical({ format: 'polaris-dossier-url-design-inert-view/1', encoding: 'html-entities-five/1',
    originalSha256: original.sha256, originalBytes: original.bytes, payload,
    payloadSha256: sha256(payload), payloadBytes: Buffer.byteLength(payload) });
  const { algorithm: _algorithm, ...limits } = profile.transcript.partition;
  const planInput = { envelopeSha256: sha256(envelopeUtf8), original, fileCount: 1, pageCount: 1,
    binding: { basePolicySha256: policySha256, originPolicySha256: sha256('origin'), originalReceiptSha256: sha256('receipt'),
      producerSha256: sha256('producer'), profileSha256: profile.digest, encoding: 'html-entities-five/1' as const, project: 'owned', provider: 'anthropic',
      role: 'design' as const, round: 1, run: profile.input.binding.run, session: profile.input.sessionId, transferEpoch: 1,
      pin: 'a'.repeat(40), deadline: '2099-01-01T00:00:00.000Z' }, parents: [sha256('parent')], instructionProfileSha256: sha256(profile.input.systemPrompt), limits };
  const plan = planOrderedDesignBytes({ ...planInput, envelope: Buffer.from(envelopeUtf8) });
  const toolUseId = 'toolu_owned', usage = { inputTokens: 4, outputTokens: 3, cacheCreationInputTokens: 0, cacheReadInputTokens: 0 };
  const reply = canonical({ kind: 'session-control', ok: true, state: 'events', events: [{ event: 'design-round-prepared', ...plan.prepared }] });
  const { tool_choice: _toolChoice, ...controls } = profile.baseline;
  const received = { ...controls, metadata: { user_id: JSON.stringify({ device_id: 'b'.repeat(64), account_uuid: '', session_id: profile.input.sessionId }) },
    messages: [profile.initialMessage, { role: 'assistant', content: [{ type: 'tool_use', id: toolUseId, name: 'mcp__syzygy__dossier_step',
      input: { argv: ['dossier', 'poll', profile.input.binding.run] } }] }, { role: 'user', content: [{ type: 'tool_result', tool_use_id: toolUseId,
      cache_control: { type: 'ephemeral', ttl: '1h' }, content: [{ type: 'text', text: `${reply}\n` },
        { type: 'text', text: '<system-reminder>\n<total_tokens>14999993 tokens left</total_tokens>\n</system-reminder>' }] }] }] };
  const request: OrderedScreenInput = { ...common, operation: 'request', receivedBase64: Buffer.from(canonical(received)).toString('base64'),
    envelopeUtf8, planInput, manifestSha256: plan.manifestSha256, bindings: { prepared: { toolUseId, usage }, parts: [] } };
  const initial: OrderedScreenInput = { ...common, operation: 'initial', receivedBase64: Buffer.from(canonical({ ...received,
    messages: [profile.initialMessage] })).toString('base64') };
  return { response, request, initial };
}
function run(input: OrderedScreenInput, overrides: Partial<Parameters<typeof runOrderedDesignScreen>[0]> = {}) {
  return runOrderedDesignScreen({ program, input, current: () => true, deadlineEpochMilliseconds: Date.now() + 30_000, ...overrides });
}

describe('preemptible ordered design screen', () => {
  it('reissues the exact profile and plan and returns request identities and response observations over a private pipe', async () => {
    const f = fixture();
    const request = await run(f.request);
    expect(request.ok).toBe(true);
    if (!request.ok) return;
    expect(request.observation.outcome).toMatchObject({ operation: 'request', result: { ok: true } });
    expect(JSON.stringify(request.observation).includes('a'.repeat(100))).toBe(false);
    expect(request.observation.counts.secretCalls).toBeGreaterThan(0);
    expect(request.observation.counts.activeCalls).toBeGreaterThan(0);
    expect(request.observation.inverseInputs).toEqual([Buffer.byteLength(f.request.envelopeUtf8), Buffer.byteLength(f.request.envelopeUtf8)]);
    for (const value of Object.values(request.observation.branches)) expect(value.secretCalls).toBeGreaterThan(0);
    expect(Object.values(request.observation.branches).reduce((sum, value) => sum + value.secretCalls, 0)).toBe(request.observation.counts.secretCalls);
    const initial = await run(f.initial);
    expect(initial.ok && initial.observation.outcome.result.ok).toBe(true);
    if (initial.ok) {
      expect(initial.observation.branches.raw.secretCalls).toBe(1);
      expect(initial.observation.branches.prepared.secretCalls).toBeGreaterThan(0);
      expect(initial.observation.branches.logicalReceived.secretCalls).toBe(0);
    }
    const response = await run(f.response());
    expect(response.ok).toBe(true);
    if (!response.ok) return;
    expect(response.observation.outcome).toMatchObject({ operation: 'response', result: { ok: true, content: [{ type: 'text', text: 'Owned response.' }] } });
    expect(response.charge).toMatchObject({ cpuAccounting: 'charged-hard-capacity', cpuMicroseconds: 18_000_000, enforcedWallMilliseconds: 20_000 });
    expect(response.observation.selfCpuMicrosecondsBeforeOutput).toBeGreaterThan(0);
  }, 30_000);

  it('keeps private no-path secret screening and refuses changed policy, profile, manifest, image and currentness', async () => {
    const f = fixture(), marker = `${['to', 'ken'].join('')} = "${'z'.repeat(12)}"`;
    const refused = await run(f.response(marker));
    expect(refused.ok).toBe(true);
    if (refused.ok) expect(refused.observation.outcome).toEqual({ operation: 'response', result: { ok: false, reason: 'provider-response-refused' } });
    expect(JSON.stringify(refused).includes(marker)).toBe(false);
    // Response parsing performs only secret screening; active-content semantics
    // remain with the caller's separate checked response registration.
    const html = await run(f.response('<script>owned()</script>'));
    expect(html.ok && html.observation.outcome.result.ok).toBe(true);
    for (const input of [{ ...f.response(), policySha256: '0'.repeat(64) }, { ...f.response(), profileSha256: '0'.repeat(64) },
      { ...f.request, manifestSha256: '0'.repeat(64) }]) expect((await run(input)).ok).toBe(false);
    expect((await run(f.response(), { current: () => false })).ok).toBe(false);
    expect((await run(f.response(), { deadlineEpochMilliseconds: Date.now() - 1 })).ok).toBe(false);
    expect((await run(f.response(), { program: { ...program, worker: { ...program.worker, sha256: '0'.repeat(64) } } })).ok).toBe(false);
    const changed = join(directory, 'changed.mjs'); await writeFile(changed, workerBytes, { mode: 0o600 });
    const pinned = await selected(changed); await writeFile(changed, Buffer.concat([workerBytes, Buffer.from(' ')]));
    expect((await run(f.response(), { program: { ...program, worker: pinned } })).ok).toBe(false);
  }, 30_000);

  it('kills a pathological unchanged detector, enforces output and address limits, and returns no private diagnostic', async () => {
    const policy = JSON.parse(V8); policy.detectors.push({ id: 'owned-exponential-fixture', kind: 'regular-expression', pattern: '(a+)+$', flags: '' });
    const f = fixture(JSON.stringify(policy));
    const started = performance.now();
    let heartbeats = 0, launched = false;
    const heartbeat = setInterval(() => { if (launched) heartbeats++; }, 20);
    let result;
    const charged = vi.fn();
    try { result = await run(f.response(`${'a'.repeat(40)}!`), { limits: { ...ORDERED_SCREEN_LIMITS, wallMilliseconds: 800, cpuSeconds: 1 }, chargeCpuMicroseconds: value => { charged(value); launched = true; } }); }
    finally { clearInterval(heartbeat); }
    expect(heartbeats).toBeGreaterThan(2);
    expect(charged).toHaveBeenCalledExactlyOnceWith(4_000_000);
    expect(result.ok).toBe(false);
    expect(performance.now() - started).toBeLessThan(3000);
    expect(result.charge.wallMilliseconds).toBeGreaterThanOrEqual(700);
    expect(result.charge.cpuMicroseconds).toBe(4_000_000);
    expect(Object.keys(result).sort()).toEqual(['charge', 'ok', 'program', 'reason']);
    for (const [name, source] of [['output', 'process.stdout.write("x".repeat(13000000));'],
      ['address', 'const blocks=[]; for(;;) blocks.push(Buffer.alloc(128000000,1));']] as const) {
      const worker = join(directory, `${name}.mjs`); await writeFile(worker, source, { mode: 0o600 });
      expect((await run(fixture().response(), { program: { ...program, worker: await selected(worker) } })).ok).toBe(false);
    }
  }, 30_000);

  it('stops an asynchronous worker when live authority is revoked and retains its charged capacity', async () => {
    const worker = join(directory, 'wait.mjs');
    await writeFile(worker, 'setTimeout(()=>{},10000);', { mode: 0o600 });
    const selectedWorker = await selected(worker);
    let current = true;
    const charged = vi.fn();
    const pending = run(fixture().response(), { program: { ...program, worker: selectedWorker }, current: () => current,
      chargeCpuMicroseconds: value => { charged(value); setTimeout(() => { current = false; }, 50); } });
    const result = await pending;
    expect(result.ok).toBe(false);
    expect(charged).toHaveBeenCalledExactlyOnceWith(18_000_000);
    expect(result.charge.cpuMicroseconds).toBe(18_000_000);
    expect(result.charge.wallMilliseconds).toBeLessThan(3000);
  }, 30_000);

  it('has no inherited canary, host-home access, child spawning or provider network route', async () => {
    const canary = join(directory, 'host-only'); await writeFile(canary, 'synthetic-only', { mode: 0o600 });
    const server = createServer(); await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address(); if (address === null || typeof address === 'string') throw new Error('owned server');
    const prefix = `import {readFileSync as probeRead} from 'node:fs';
import {spawn as probeSpawn} from 'node:child_process';
import {createConnection as probeConnect} from 'node:net';
if(process.env.ORDERED_SCREEN_SYNTHETIC_CANARY!==undefined)process.exit(1);
try{probeRead(${JSON.stringify(canary)});process.exit(1);}catch(e){if(e.code!=='ERR_ACCESS_DENIED')process.exit(1);}
try{probeSpawn('/bin/true');process.exit(1);}catch(e){if(e.code!=='ERR_ACCESS_DENIED')process.exit(1);}
await new Promise((resolve,reject)=>{const s=probeConnect({host:'127.0.0.1',port:${address.port}});s.on('connect',()=>reject(new Error('route')));s.on('error',resolve);s.setTimeout(200,()=>{s.destroy();resolve();});});
`;
    const worker = join(directory, 'confinement.mjs'); await writeFile(worker, Buffer.concat([Buffer.from(prefix), workerBytes]), { mode: 0o600 });
    vi.stubEnv('ORDERED_SCREEN_SYNTHETIC_CANARY', 'synthetic-only');
    try {
      const result = await run(fixture().response(), { program: { ...program, worker: await selected(worker) } });
      expect(result.ok).toBe(true);
    } finally { vi.unstubAllEnvs(); await new Promise<void>(resolve => server.close(() => resolve())); }
    expect((await stat(canary)).size).toBe(14);
  }, 30_000);
});
