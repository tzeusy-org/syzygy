import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import * as http from 'node:http';
import * as net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { sha256 } from '@syzygy/support';
import { policyFixture } from './full-run.testkit.js';
import { parseRunConfig } from './run-config.js';
import { DOSSIER_CONTENT_CLASSES, NO_WORK_ITEM_REASON, recordRunConfig, sourceBindingSha256 } from './run-record.js';
import { DOSSIER_POLICY_PATH } from './policy-snapshot.js';
import { buildDossierScreen } from './screen.js';
import { loadSessionCredential } from './session-credential.js';
import { SESSION_CONTENT_CLASSES } from './session-egress-policy.js';
import { sessionHostTestPort, type SessionHost, type SessionHostOptions } from './session-host.js';
import { createSessionProfile, DEFAULT_SESSION_MODEL, SESSION_PROFILE_BETA, SESSION_PROFILE_SYNTHETIC_AUTHORIZATION,
  sessionProfileReminderText } from './session-profile.js';
import { sessionRelayTestPort } from './session-relay.js';

const cleanup: (() => Promise<unknown> | void)[] = [];
afterEach(async () => { for (const stop of cleanup.splice(0).reverse()) await stop(); });
const call = { type: 'tool_use', id: 'toolu_own_artifact', name: 'mcp__syzygy__artifact_read', input: { path: 'brief.md' } };
const body = 'Own synthetic brief.\n';
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'session-host-'));
  cleanup.push(() => rm(root, { force: true, recursive: true }));
  const run = path.join(root, 'own-run'); await mkdir(run); await writeFile(path.join(run, 'brief.md'), body);
  const compiledScreen = buildDossierScreen(policyFixture().bytes, true, null, 'private');
  if (!compiledScreen.ok) throw new Error('own policy fixture refused');
  const screen = compiledScreen.screen;
  const config = parseRunConfig(JSON.stringify({ operator: 'own-operator', agentTool: 'claude-code', agentToolVersion: '2.1.327',
    agentProvider: 'anthropic', model: DEFAULT_SESSION_MODEL, deadline: 'PT1H', agentTokenBudget: 100_000,
    agentTurnBudget: 20, maxRepairCycles: 2, maxQuestions: 1, audience: 'own fixture readers', operatorIsOwner: false }));
  if (!config.ok) throw new Error('own config fixture refused');
  const pin = 'c'.repeat(40);
  const record = recordRunConfig(config.config, {
    repository: { url: 'example.invalid/own/source', repositoryId: 'own-source', role: 'observed-source' },
    clone: { path: path.join(root, 'not-read-source'), declaredBy: 'operator', label: 'Inferred', use: 'read' },
    pinnedRevision: { commit: pin, label: 'own fixture', pinnedAt: '2026-11-19T00:00:00.000Z' },
    screeningPolicy: { path: DOSSIER_POLICY_PATH, policyId: screen.policyId, policyVersion: screen.policyVersion,
      sha256: screen.policySha256, commit: 'a'.repeat(40) }, contentClasses: DOSSIER_CONTENT_CLASSES,
    visibility: { value: 'private', source: 'conservative-default', declaredBy: 'conservative default', label: 'Inferred' },
    governed: { kind: 'non-governed', because: ['Own synthetic fixture.'] }, workItem: { identity: null, reason: NO_WORK_ITEM_REASON },
  });
  const binding = { run: 'own-run', role: 'author', sourceBinding: sourceBindingSha256(record.subject),
    policy: screen.policySha256, provider: 'anthropic', model: DEFAULT_SESSION_MODEL };
  const compiled = createSessionProfile({ binding, sessionId: '12345678-1234-4234-8234-123456789012',
    systemPrompt: 'Use only the four bounded tools.', initialPrompt: 'Read the own synthetic brief.', utcDate: '2026-11-19', kernelRelease: '6.0.0-own' });
  if (!compiled.ok) throw new Error('own session profile refused');
  const profile = compiled.value.profile;
  const loaded = await loadSessionCredential({ environment: { CLAUDE_CODE_OAUTH_TOKEN: 'NONSECRET-own-host-token' },
    credentialFile: path.join(root, '.credentials.json'), now: () => 1000 });
  if (!loaded.ok) throw new Error('own synthetic credential refused'); cleanup.push(() => loaded.credential.close());
  let current = true, artifactReads = 0, forwards = 0, responses = 0, reservations = 0;
  const events: string[] = [];
  const exchanges: Parameters<SessionHostOptions['audit']>[0][] = [];
  let relayClosed!: () => void;
  const actualRelayClose = new Promise<void>(resolve => { relayClosed = resolve; });
  let failRelayServer!: () => void;
  const options: SessionHostOptions = {
    tools: { role: 'author', run, sessionDir: run, record, screen,
      runDossier: async () => { throw new Error('unexpected dossier operation'); },
      artifactOrigins: (file, bytes) => {
        artifactReads++; expect(file).toBe('brief.md'); expect(Buffer.from(bytes).toString()).toBe(body);
        return { digest: sha256(bytes), classes: ['governance-text'], originIds: ['artifact:own-brief'] };
      } }, profile,
    initialOrigin: { binding, id: 'initial:own', kind: 'initial-prompt', canonicalText: profile.input.initialPrompt,
      classes: ['governance-text'], originIds: ['host:own-input'] }, declaredClasses: SESSION_CONTENT_CLASSES,
    subject: { binding, project: 'project:syzygy', pin, principal: 'own-operator' },
    current: () => current, credential: loaded.credential,
    brokerSocket: path.join(root, 'b.sock'), relaySocket: path.join(root, 'r.sock'),
    audit: event => { events.push(`audit:${event.event}`); exchanges.push(event); },
    beforeTool: event => { expect(event).toEqual({ tool: 'artifact_read', inputSha256: sha256('{"path":"brief.md"}') }); events.push('tool-attempt'); },
    toolReceipt: receipt => { events.push('tool-receipt'); expect(receipt.originIds).toContain('artifact:own-brief'); },
    reserveRequest: () => { reservations++; events.push('reserve'); return true; },
    observeUsage: usage => { responses++; expect(usage).toMatchObject({ inputTokens: 3, outputTokens: 5 }); events.push('usage'); return true; },
  };
  const response = (content: unknown[]) => Buffer.from(JSON.stringify({ id: 'msg_own_fixture', type: 'message', role: 'assistant', model: DEFAULT_SESSION_MODEL,
    content, stop_reason: content.some(value => typeof value === 'object' && value !== null && 'type' in value && value.type === 'tool_use') ? 'tool_use' : 'end_turn',
    stop_sequence: null, usage: { input_tokens: 3, output_tokens: 5 } }));
  const relay = sessionRelayTestPort(async input => {
    forwards++; events.push('forward'); expect(events.at(-2)).toBe('audit:attempt-allowed');
    expect(input.headers.authorization).toBe('Bearer NONSECRET-own-host-token');
    expect(JSON.parse(Buffer.from(input.body).toString()).metadata.user_id).toBe(`syzygy:own-run:author:${profile.input.sessionId}`);
    return { status: 200, contentType: 'application/json', requestFlushed: true, body: response(forwards === 1 ? [call] : [{ type: 'text', text: 'Own fixture complete.' }]) };
  }, server => {
    server.on('request', (_request, response) => { response.once('close', relayClosed); });
    failRelayServer = () => { server.emit('error', new Error('NONSECRET-own-relay-server-failure')); };
  });
  const start = async (changes: Partial<SessionHostOptions> = {}) => {
    const host = await sessionHostTestPort(relay)({ ...options, ...changes }); cleanup.push(() => host.close()); return host;
  };
  const { tool_choice: _projection, ...baseline } = profile.baseline;
  const request = (messages: readonly unknown[] = [profile.initialMessage]) => JSON.stringify({ ...baseline,
    metadata: { user_id: JSON.stringify({ device_id: '0'.repeat(64), account_uuid: '', session_id: profile.input.sessionId }) }, messages });
  return { root, options, profile, events, exchanges, request, start, actualRelayClose, failRelayServer: () => failRelayServer(), setCurrent: (value: boolean) => { current = value; },
    counts: () => ({ artifactReads, forwards, responses, reservations }) };
}
async function send(host: SessionHost, body: string, signal?: AbortSignal): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const request = http.request({ socketPath: host.relaySocket, path: '/v1/messages?beta=true', method: 'POST', agent: false, signal,
      headers: { authorization: SESSION_PROFILE_SYNTHETIC_AUTHORIZATION, 'anthropic-version': '2023-06-01', 'anthropic-beta': SESSION_PROFILE_BETA,
        'content-type': 'application/json', 'user-agent': 'claude-cli/2.1.327 (external, sdk-cli)', 'x-app': 'cli' } }, response => {
      const chunks: Buffer[] = []; response.on('data', (chunk: Buffer) => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode!, body: Buffer.concat(chunks).toString() })); response.on('error', reject);
    }); request.on('error', reject); request.end(body);
  });
}
async function invoke(host: SessionHost, value: unknown): Promise<any> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(host.brokerSocket); let text = '';
    socket.once('connect', () => socket.end(`${JSON.stringify(value)}\n`)); socket.on('data', chunk => { text += chunk.toString(); });
    socket.once('end', () => { try { resolve(JSON.parse(text)); } catch (error) { reject(error); } }); socket.once('error', reject);
  });
}

describe('actual composed host controller, broker and checked relay', () => {
  it('delivers an issued tool once, audits before effect/release and admits only its exact canonical continuation', async () => {
    const f = await fixture(), host = await f.start();
    expect((await send(host, f.request())).status).toBe(200);
    const result = await invoke(host, { tool: 'artifact_read', input: call.input });
    expect(result).toMatchObject({ ok: true, kind: 'artifact', path: 'brief.md', text: body });
    expect(f.events.indexOf('tool-attempt')).toBeLessThan(f.events.indexOf('tool-receipt'));
    const messages = [f.profile.historicalInitialMessage, { role: 'assistant', content: [call] }, { role: 'user', content: [{ type: 'tool_result',
      tool_use_id: call.id, content: [{ type: 'text', text: JSON.stringify(result) + '\n' }, { type: 'text', text: sessionProfileReminderText(14_999_992) }],
      cache_control: { type: 'ephemeral', ttl: '1h' } }] }];
    expect((await send(host, f.request(messages))).status).toBe(200);
    expect(f.counts()).toEqual({ artifactReads: 1, forwards: 2, responses: 2, reservations: 2 });
    const admitted = f.exchanges.filter(event => event.event === 'response-admitted');
    expect(admitted).toHaveLength(2);
    expect(admitted[0]).toMatchObject({ consumedToolResults: [], response: { stopReason: 'tool_use', textBlocks: 0,
      tool: { id: call.id, name: call.name, inputSha256: sha256('{"path":"brief.md"}') } } });
    expect(admitted[1]).toMatchObject({ consumedToolResults: [{ toolUseId: call.id,
      digest: sha256(JSON.stringify(result)), bytes: Buffer.byteLength(JSON.stringify(result)) }],
      response: { stopReason: 'end_turn', textBlocks: 1, tool: null } });
    const firstClose = host.close(); expect(host.close()).toBe(firstClose);
    expect(await firstClose).toEqual({ pendingInvocations: 0, termination: 'settled' });
  });

  it('starts no unissued or altered effect and poisons the following provider request', async () => {
    for (const initial of [false, true]) {
      const f = await fixture(), host = await f.start();
      if (initial) expect((await send(host, f.request())).status).toBe(200);
      expect((await invoke(host, { tool: 'artifact_read', input: { path: initial ? 'brief.json' : 'brief.md' } })).ok).toBe(false);
      expect(f.counts().artifactReads).toBe(0); expect(f.events).not.toContain('tool-attempt');
      expect((await send(host, f.request())).status).not.toBe(200); expect(f.counts().forwards).toBe(initial ? 1 : 0);
    }
  });

  it('starts no tool effect after failed audit or a binding becoming stale during that audit', async () => {
    for (const stale of [false, true]) {
      const f = await fixture(), host = await f.start({ beforeTool: () => { if (stale) f.setCurrent(false); else throw new Error('NONSECRET-unsafe-audit-diagnostic'); } });
      expect((await send(host, f.request())).status).toBe(200);
      const result = await invoke(host, { tool: 'artifact_read', input: call.input });
      expect(result.ok).toBe(false); expect(JSON.stringify(result)).not.toContain('NONSECRET-unsafe-audit-diagnostic');
      expect(f.counts().artifactReads).toBe(0); expect(f.events).not.toContain('tool-receipt');
    }
  });

  it('withholds the reply and receipt audit if currentness changes during screening', async () => {
    const f = await fixture();
    const original = f.options.tools.screen;
    let screenedReminder = false;
    const screen = { ...original, screenSecrets: (text: string) => {
      if (text.includes('<total_tokens>14999992 tokens left</total_tokens>')) {
        screenedReminder = true;
        f.setCurrent(false);
      }
      return original.screenSecrets(text);
    } };
    const host = await f.start({ tools: { ...f.options.tools, screen } });
    expect((await send(host, f.request())).status).toBe(200);
    const result = await invoke(host, { tool: 'artifact_read', input: call.input });
    expect(result.ok).toBe(false);
    expect(screenedReminder).toBe(true);
    expect(f.counts().artifactReads).toBe(1);
    expect(f.events).not.toContain('tool-receipt');
  });

  it('revokes a provider-issued tool when its durable response audit fails', async () => {
    const f = await fixture(), host = await f.start({ audit: async event => {
      await f.options.audit(event);
      if (event.event === 'response-admitted') throw new Error('NONSECRET-response-audit-failed');
    } });
    const response = await send(host, f.request());
    expect(response.status).not.toBe(200); expect(response.body).not.toContain(call.id);
    const reply = await invoke(host, { tool: 'artifact_read', input: call.input });
    expect(reply.ok).toBe(false); expect(f.counts().artifactReads).toBe(0);
    expect(f.events).not.toContain('tool-receipt');
  });

  it('withholds the exact issued tool while the durable response audit is still pending', async () => {
    const f = await fixture(); let release!: () => void, entered!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    const started = new Promise<void>(resolve => { entered = resolve; });
    const host = await f.start({ audit: async event => {
      await f.options.audit(event);
      if (event.event === 'response-admitted') { entered(); await held; }
    } });
    const response = send(host, f.request());
    try {
      await Promise.race([started, response.then(() => { throw new Error('own-provider-stopped-before-audit'); })]);
      const reply = await invoke(host, { tool: 'artifact_read', input: call.input });
      expect(reply.ok).toBe(false); expect(f.counts().artifactReads).toBe(0);
      expect(f.events).not.toContain('tool-receipt');
    } finally { release(); await response; }
  });

  it('never restores tool authority when the relay closes during its held response audit', async () => {
    for (const failure of ['peer-disconnect', 'server-error'] as const) {
      const f = await fixture(); let release!: () => void, entered!: () => void, audited!: () => void;
      const held = new Promise<void>(resolve => { release = resolve; });
      const started = new Promise<void>(resolve => { entered = resolve; });
      const completed = new Promise<void>(resolve => { audited = resolve; });
      const host = await f.start({ audit: async event => {
        await f.options.audit(event);
        if (event.event === 'response-admitted') { entered(); await held; audited(); }
      } });
      const abort = new AbortController();
      const response = send(host, f.request(), abort.signal).then(result => ({ result }), () => ({ disconnected: true }));
      try {
        await Promise.race([started, response.then(() => { throw new Error('own-provider-stopped-before-audit'); })]);
        if (failure === 'peer-disconnect') abort.abort(); else f.failRelayServer();
        await response;
        // Wait for the actual server close handler; elapsed time is not a proof.
        await f.actualRelayClose;
        release(); await completed;
        const reply = await invoke(host, { tool: 'artifact_read', input: call.input });
        expect(reply.ok).toBe(false); expect(f.counts().artifactReads).toBe(0);
        expect(f.events).not.toContain('tool-attempt'); expect(f.events).not.toContain('tool-receipt');
      } finally { release(); abort.abort(); await response; }
    }
  });

  it('revokes an already audited prospective tool after a later relay server failure', async () => {
    const f = await fixture(), host = await f.start();
    expect((await send(host, f.request())).status).toBe(200);
    f.failRelayServer();
    const reply = await invoke(host, { tool: 'artifact_read', input: call.input });
    expect(reply.ok).toBe(false); expect(f.counts().artifactReads).toBe(0);
    expect(f.events).not.toContain('tool-attempt'); expect(f.events).not.toContain('tool-receipt');
  });

  it('reserves before send and suppresses a response whose usage cannot be recorded', async () => {
    const denied = await fixture(), noSend = await denied.start({ reserveRequest: () => false });
    expect((await send(noSend, denied.request())).status).not.toBe(200); expect(denied.counts().forwards).toBe(0);
    const unknown = await fixture(), noRelease = await unknown.start({ observeUsage: () => false });
    const result = await send(noRelease, unknown.request()); expect(result.status).not.toBe(200);
    expect(result.body).not.toContain(call.id); expect(unknown.counts().forwards).toBe(1);
  });

  it('refuses startup for stale or mismatched subjects and forged compiled profiles', async () => {
    const f = await fixture();
    await expect(f.start({ current: () => false })).rejects.toThrow('session-host-unavailable');
    await expect(f.start({ subject: { ...f.options.subject, pin: 'f'.repeat(40) } })).rejects.toThrow('session-host-unavailable');
    await expect(f.start({ profile: { ...f.profile } })).rejects.toThrow('session-host-unavailable');
    expect(f.counts().forwards).toBe(0);
  });
});
