import * as fs from 'node:fs';
import { open, type FileHandle } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { sha256 } from '@syzygy/support';
import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { fileURLToPath } from 'node:url';
import { DOSSIER_POLICY_PATH } from './policy-snapshot.js';
import { buildDossierScreen } from './screen.js';
import { SESSION_CONTENT_CLASSES } from './session-egress-policy.js';
import { createOrderedDesignSessionProfile, createSessionProfile, DEFAULT_SESSION_MODEL } from './session-profile.js';
import { createUrlSessionAudit, type UrlSessionAuditEvent, type UrlSessionAuditOptions, type UrlSessionAuditResult } from './url-session-audit.js';
import { planOrderedDesignBytes } from './url-design-delivery.js';
import { URL_LAUNCH_LIMITS } from './session-launch.js';
import type { ViewRole } from './session-view.js';

type Writer = Extract<UrlSessionAuditResult, { ok: true }>;
const ROLES = ['author', 'inventory', 'fidelity', 'design'] as const;
const writers: Writer[] = [];
afterEach(async () => { vi.restoreAllMocks(); for (const writer of writers.splice(0)) await writer.close(); });
const flush = async () => { for (let n = 0; n < 30; n++) await Promise.resolve(); };
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
function fixture(extraDetector?: { id: string; kind: string; [key: string]: unknown }) {
  const root = tempDir('url-session-audit-'), parent = path.join(root, 'protected'); fs.mkdirSync(parent, { mode: 0o700 });
  let policy: Uint8Array = fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..', DOSSIER_POLICY_PATH));
  if (extraDetector) { const value = JSON.parse(Buffer.from(policy).toString('utf8')); value.detectors.push(extraDetector); policy = Buffer.from(JSON.stringify(value)); }
  const loaded = buildDossierScreen(policy, true, null, 'private'); if (!loaded.ok) throw new Error('own fixture policy refused');
  const screen = loaded.screen;
  const binding = { run: 'own-run', sourceBinding: 'a'.repeat(64), policy: screen.policySha256, provider: 'anthropic', model: DEFAULT_SESSION_MODEL };
  const profiles = ROLES.map((role, index) => {
    const compiled = createSessionProfile({ binding: { ...binding, role }, sessionId: `12345678-1234-4234-8234-12345678901${index}`,
      systemPrompt: 'Use only the four fixed own tools.', initialPrompt: 'Read the own synthetic fixture.', utcDate: '2026-11-19', kernelRelease: '6.0.0-own' });
    if (!compiled.ok) throw new Error('own profile refused'); return compiled.value.profile;
  });
  let current = true;
  const options: UrlSessionAuditOptions = { parent, name: 'host', binding, originPolicySha256: 'b'.repeat(64), project: 'project:own-fixture',
    pin: 'c'.repeat(40), principal: 'own-operator', profiles, declaredClasses: SESSION_CONTENT_CLASSES, screen, current: () => current };
  const create = async (changes: Partial<UrlSessionAuditOptions> = {}): Promise<Writer> => {
    const result = await createUrlSessionAudit({ ...options, ...changes }); expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('own audit setup refused'); writers.push(result); return result;
  };
  const file = (role: ViewRole = 'author', prefix = 'host') => path.join(parent, `${prefix}-${role}.jsonl`);
  const event = (writer: Writer, kind: UrlSessionAuditEvent['kind'] = 'before-tool', role: ViewRole = 'author'): UrlSessionAuditEvent => {
    const scope = writer.scope(role);
    const payloads: Record<UrlSessionAuditEvent['kind'], unknown> = {
      relay: { event: 'attempt-allowed', subject: { binding: scope.binding, project: options.project, pin: options.pin, principal: options.principal },
        requestId: '12345678-1234-4234-8234-123456789012', at: '2026-11-19T00:00:00.000Z', credentialIdentity: 'Unknown', exposureMode: 'private-local-cli',
        governingRule: 'GOVERNANCE-SIMPLIFICATION-D10', admission: { digest: 'd'.repeat(64), bytes: 100, classes: ['project-documentation'], originIds: ['source:own'] },
        received: { digest: 'e'.repeat(64), bytes: 101 }, route: 'messages', consumedToolResults: [], response: null, outcome: 'allowed', status: null },
      control: { event: 'clarification-question', questionSha256: '1'.repeat(64), questionBytes: 100, nonceSha256: '2'.repeat(64), questionNumber: 1 },
      'launch-attempt': { event: 'session-launch-attempt', profileSha256: scope.profileSha256, commandSha256: '3'.repeat(64), viewSha256: '4'.repeat(64), limits: URL_LAUNCH_LIMITS },
      'before-tool': { tool: 'source_read', inputSha256: '5'.repeat(64) },
      'tool-receipt': { id: 'tool:own', toolName: 'mcp__syzygy__source_read', inputSha256: '5'.repeat(64), digest: '6'.repeat(64), bytes: 42,
        classes: ['project-documentation', 'work-history'], originIds: ['blob:own', 'provider-response:1'] },
      usage: { inputTokens: 3, outputTokens: 5, cacheCreationInputTokens: 7, cacheReadInputTokens: 11 },
      'launch-terminal': { outcome: 'stopped', exitCode: null, signal: 'SIGTERM', viewTermination: 'view-exited', groupTermination: 'Unknown',
        toolTermination: 'Unknown', pendingInvocations: 1, stdout: { bytes: 9, sha256: '7'.repeat(64) }, stderr: { bytes: 0, sha256: sha256('') },
        sampledStorageBytes: null, peakProcesses: 3, aggregateEnforcement: 'sampled-stop-only', betweenSamples: 'Unknown' },
    };
    return { kind, role, scope, payload: payloads[kind] } as UrlSessionAuditEvent;
  };
  return { root, parent, options, profiles, file, create, event, revoke: () => { current = false; } };
}
async function prototype(): Promise<Record<string, any>> {
  const file = path.join(tempDir('url-audit-prototype-'), 'own-probe'), handle = await open(file, 'wx+', 0o600);
  const result = Object.getPrototypeOf(handle); await handle.close(); return result;
}
const stable = (v: any): any => Array.isArray(v) ? v.map(stable) : v !== null && typeof v === 'object'
  ? Object.fromEntries(Object.keys(v).sort().map(k => [k, stable(v[k])])) : v;
const lines = (f: ReturnType<typeof fixture>, role: ViewRole = 'author') => fs.readFileSync(f.file(role), 'utf8').trim().split('\n').map(s => JSON.parse(s));
function relayTrace(f: ReturnType<typeof fixture>, writer: Writer) {
  const relay = f.event(writer, 'relay', 'design');
  if (relay.kind !== 'relay') throw new Error('own relay fixture refused');
  const payload = relay.payload;
  const send = { ...relay, payload: { ...payload, event: 'send-attempt', outcome: 'attempted' } } as const;
  const flush = { ...relay, payload: { ...payload, event: 'send-outcome', outcome: 'local-request-flushed' } } as const;
  const response = { ...relay, payload: { ...payload, event: 'response-admitted', outcome: 'response-admitted', status: 200,
    response: { digest: '8'.repeat(64), bytes: 120, content: 'messages-event-stream', stopReason: 'end_turn', textBlocks: 1, tool: null } } } as const;
  return [relay, send, flush, response] as const;
}

async function orderedFixture() {
  const f = fixture();
  const compiled = createOrderedDesignSessionProfile(f.profiles[3]!.input);
  if (!compiled.ok) throw new Error('own ordered profile refused');
  const profile = compiled.value.profile;
  const { binding, originPolicySha256, pin, project } = f.options;
  const canonical = (value: unknown) => encodeCanonicalJson(value, { maxBytes: 2_097_152, maxNodes: 4096, maxDepth: 12 });
  const identify = (value: string) => ({ sha256: sha256(value), bytes: Buffer.byteLength(value, 'utf8') });
  const originalText = 'Own ordered audit fixture. '.repeat(25_000);
  const original = identify(originalText);
  const envelope = Buffer.from(canonical({ encoding: 'html-entities-five/1', format: 'polaris-dossier-url-design-inert-view/1',
    originalSha256: original.sha256, originalBytes: original.bytes, payload: originalText,
    payloadSha256: original.sha256, payloadBytes: original.bytes }));
  const { partBytes, partCount, replyBytes, preparedBytes } = profile.transcript.partition;
  const plan = planOrderedDesignBytes({ envelope, envelopeSha256: sha256(envelope), original, fileCount: 1, pageCount: 1,
    instructionProfileSha256: sha256(profile.input.systemPrompt), limits: { partBytes, partCount, replyBytes, preparedBytes },
    parents: [sha256('own parent')],
    binding: { basePolicySha256: binding.policy, deadline: new Date(Date.now() + 60_000).toISOString(), encoding: 'html-entities-five/1',
      originPolicySha256, originalReceiptSha256: sha256('own original receipt'), pin, producerSha256: sha256('own producer'),
      profileSha256: profile.digest, project, provider: binding.provider, role: 'design', round: 1, run: binding.run,
      session: profile.input.sessionId, transferEpoch: 1 } });
  const prepared = { call: { id: 'toolu_poll_owned', name: profile.transcript.prepared.tool,
    inputSha256: sha256(canonical({ argv: ['dossier', 'poll', binding.run] })) },
    prepared: identify(plan.preparedText), reply: identify(canonical({ kind: 'session-control', ok: true, state: 'events',
      events: [{ event: profile.transcript.prepared.event, ...plan.prepared }] })) };
  const host = await f.create({ profiles: [...f.profiles.slice(0, 3), profile] });
  return { f, profile, host, plan, prepared, canonical };
}

describe('protected URL session audit', () => {
  it('durably captures only the independently scoped machine peer effect metadata', async () => {
    const f = fixture(), audit = await f.create();
    const effect = { event: 'machine-peer-effect', clientId: 'own-client', instanceId: 'own-instance', revision: 1,
      runId: f.options.binding.run, role: 'design', operation: 'inference-forward', processIdentitySha256: '1'.repeat(64),
      channelIdentitySha256: '2'.repeat(64), at: Date.now() } as const;
    await audit.appendMachinePeer(effect);
    expect(lines(f, 'design').at(-1)!.event).toEqual({ kind: 'machine-peer', role: 'design', scope: audit.scope('design'), payload: effect });
    expect(audit.summary().captured['machine-peer']).toBe(1);
    f.revoke();
    await expect(audit.appendMachinePeer(effect)).rejects.toThrow('url-session-audit-refused');
    expect(audit.summary().captured['machine-peer']).toBe(1);
  });
  it.each(['foreign-run', 'unknown-role', 'unknown-operation', 'raw-extension', 'future', 'bad-digest', 'zero-revision'])(
    'refuses machine peer effect %s without persisting it', async fault => {
    const f = fixture(), audit = await f.create();
    const effect: Record<string, unknown> = { event: 'machine-peer-effect', clientId: 'own-client', instanceId: 'own-instance', revision: 1,
      runId: f.options.binding.run, role: 'design', operation: 'inference-forward', processIdentitySha256: '1'.repeat(64),
      channelIdentitySha256: '2'.repeat(64), at: Date.now() };
    if (fault === 'foreign-run') effect.runId = 'other-run';
    if (fault === 'unknown-role') effect.role = 'other';
    if (fault === 'unknown-operation') effect.operation = 'other';
    if (fault === 'raw-extension') effect.command = 'RAW UNEXPECTED COMMAND';
    if (fault === 'future') effect.at = Date.now() + 60_000;
    if (fault === 'bad-digest') effect.processIdentitySha256 = 'unknown';
    if (fault === 'zero-revision') effect.revision = 0;
    const before = fs.readFileSync(f.file('design'));
    await expect(audit.appendMachinePeer(effect as never)).rejects.toThrow('url-session-audit-refused');
    expect(fs.readFileSync(f.file('design'))).toEqual(before);
    expect(audit.summary().captured['machine-peer']).toBe(0);
  });
  it('records first-epoch ordered evidence and one retirement in the protected design segment', async () => {
    const { f, profile, host, plan, prepared, canonical } = await orderedFixture();
    expect(() => host.beginOrderedDesignAudit(structuredClone(plan), () => true)).toThrow('url-session-audit-refused');
    const writer = host.beginOrderedDesignAudit(plan, () => true);
    expect(() => host.beginOrderedDesignAudit(plan, () => true)).toThrow('url-session-audit-refused');
    const ref = await writer.append('prepared', prepared);
    await expect(writer.readTerminal()).rejects.toThrow('url-ordered-design-audit-writer-refused');
    await writer.retire('refused');
    await expect(writer.retire('exhausted')).rejects.toThrow('url-ordered-design-audit-writer-refused');
    await expect(writer.append('prepared', prepared)).rejects.toThrow('url-ordered-design-audit-writer-refused');
    const [declaration, first, retired] = lines(f, 'design');
    expect(declaration.event.payload.profile).toBe(profile.id);
    expect(first.event).toMatchObject({ kind: 'design-ordered', role: 'design', payload: { kind: 'prepared', payload: prepared } });
    expect(ref).toEqual({ id: first.event.payload.id, sha256: sha256(canonical(first.event.payload)) });
    expect(retired.event.payload).toMatchObject({ kind: 'retired', previous: ref, payload: { reason: 'refused' } });
    expect(host.summary()).toMatchObject({ captured: { 'design-ordered': 2 }, durableRecords: 6 });
  });

  it('rejects the ordered event through the ordinary append port', async () => {
    const { f, host } = await orderedFixture();
    const bytes = fs.readFileSync(f.file('design'));
    await expect(host.append({ kind: 'design-ordered', role: 'design', scope: host.scope('design'),
      payload: { kind: 'prepared' } } as never)).rejects.toThrow('url-session-audit-refused');
    expect(fs.readFileSync(f.file('design'))).toEqual(bytes);
  });

  it.each(['changed segment', 'revoked attempt'] as const)('refuses ordered continuation after %s', async fault => {
    const { f, host, plan, prepared } = await orderedFixture();
    let current = true;
    const writer = host.beginOrderedDesignAudit(plan, () => current);
    await writer.append('prepared', prepared);
    if (fault === 'changed segment') fs.appendFileSync(f.file('design'), '\n');
    else current = false;
    await expect(writer.retire('interrupted')).rejects.toThrow();
    expect(host.summary()).toMatchObject({ captured: { 'design-ordered': 1 }, durableRecords: 5 });
  });

  it('withholds an ordered append when attempt authority is revoked during segment sync', async () => {
    const { host, plan, prepared } = await orderedFixture();
    const p = await prototype(), sync = p.sync;
    let current = true;
    const writer = host.beginOrderedDesignAudit(plan, () => current);
    vi.spyOn(p, 'sync').mockImplementation(async function(this: FileHandle) {
      await sync.call(this);
      if (fs.fstatSync(this.fd).isFile()) current = false;
    });
    await expect(writer.append('prepared', prepared)).rejects.toThrow();
    expect(host.summary()).toMatchObject({ poisoned: true, tail: 'Unknown', captured: { 'design-ordered': 0 }, durableRecords: 4 });
    current = true;
    await expect(writer.append('prepared', prepared)).rejects.toThrow();
  });

  it('links the exact complete request exchange across interleaved accounting records', async () => {
    const f = fixture(), writer = await f.create();
    const [admission, send, flush, response] = relayTrace(f, writer);
    await writer.append(admission);
    await writer.append(send);
    await writer.append(f.event(writer, 'usage', 'design'));
    await writer.append(flush);
    await writer.append(response);
    const exchange = lines(f, 'design').filter(row => row.event.kind === 'relay');
    expect(exchange.map(row => row.event.payload.event)).toEqual(['attempt-allowed', 'send-attempt', 'send-outcome', 'response-admitted']);
    expect(exchange.map(row => row.event.payload.previousExchangeSha256)).toEqual([null, ...exchange.slice(0, -1).map(row => row.sha256)]);
    expect(exchange[2]!.previousRoleSha256).not.toEqual(exchange[2]!.event.payload.previousExchangeSha256);
    expect(exchange[3]!.event.payload.response).toEqual(response.payload.response);
    expect(writer.summary().providerReceipts).toBe('Unknown');
  });

  it('retains count evidence on its own route with no usage report or inference tool result', async () => {
    const f = fixture(), writer = await f.create();
    const relay = f.event(writer, 'relay');
    if (relay.kind !== 'relay') throw new Error('own relay fixture refused');
    const payload = { ...relay.payload, route: '/v1/messages/count_tokens?beta=true' } as const;
    await writer.append({ ...relay, payload });
    await writer.append({ ...relay, payload: { ...payload, event: 'send-attempt', outcome: 'attempted' } });
    await writer.append({ ...relay, payload: { ...payload, event: 'send-outcome', outcome: 'local-request-flushed' } });
    const response = { content: 'count-tokens-json', bytes: 19, digest: 'f'.repeat(64), estimatedInputTokens: 10 } as const;
    await writer.append({ ...relay, payload: { ...payload, event: 'response-admitted', response, outcome: 'response-admitted', status: 200 } });
    expect(lines(f).at(-1)?.event.payload).toMatchObject({ route: '/v1/messages/count_tokens?beta=true', response, consumedToolResults: [] });
    expect(writer.summary()).toMatchObject({ usageReports: 0, providerReceipts: 'Unknown', relayEvents: { 'response-admitted': 1 } });
  });

  it('refuses count evidence relabeled as an inference response', async () => {
    const f = fixture(), writer = await f.create();
    const [admission, send, flush, response] = relayTrace(f, writer);
    for (const event of [admission, send, flush]) await writer.append(event);
    await expect(writer.append({ ...response, payload: { ...response.payload,
      response: { content: 'count-tokens-json', bytes: 19, digest: 'f'.repeat(64), estimatedInputTokens: 10 } } }))
      .rejects.toThrow('url-session-audit-refused');
    expect(writer.summary()).toMatchObject({ relayEvents: { 'response-admitted': 0 } });
  });

  it.each(['missing flush', 'changed request', 'duplicate response'] as const)('refuses a response trace with %s', async fault => {
    const f = fixture(), writer = await f.create();
    const [admission, send, flush, response] = relayTrace(f, writer);
    await writer.append(admission);
    await writer.append(send);
    if (fault !== 'missing flush') await writer.append(flush);
    if (fault === 'duplicate response') await writer.append(response);
    const changed = fault === 'changed request' ? { ...response, payload: { ...response.payload,
      received: { digest: '1'.repeat(64), bytes: 101 } } } : response;
    await expect(writer.append(changed)).rejects.toThrow('url-session-audit-refused');
    expect(writer.summary()).toMatchObject({ poisoned: true, relayEvents: { 'response-admitted': fault === 'duplicate response' ? 1 : 0 } });
  });

  it('creates four exclusive0600 role segments with durable declarations distinct from captured events and an independently reproducible global/role chain', async () => {
    const f = fixture(), writer = await f.create();
    expect(writer.summary()).toMatchObject({ declarations: 4, durableRecords: 4, captured: { relay: 0, usage: 0 }, usageReports: 0,
      providerReceipts: 'Unknown', nativeSendCensus: 'Unknown', completeness: 'Unknown', hostileSameUidIsolation: 'Unknown' });
    const p = await prototype(), actual = p.sync, order: string[] = [];
    vi.spyOn(p, 'sync').mockImplementation(async function(this: FileHandle) { order.push(fs.fstatSync(this.fd).isDirectory() ? 'directory' : 'file'); return actual.call(this); });
    for (const kind of ['relay', 'control', 'launch-attempt', 'before-tool', 'tool-receipt', 'usage', 'launch-terminal'] as const) await writer.append(f.event(writer, kind));
    expect(order).toEqual(Array.from({ length: 7 }, () => ['file', 'directory']).flat());
    await writer.append(f.event(writer, 'usage', 'design'));
    const all = ROLES.flatMap(role => {
      expect(fs.statSync(f.file(role)).mode & 0o777).toBe(0o600);
      const records = lines(f, role); let previous: string | null = null;
      for (const [index, row] of records.entries()) { expect(row.roleSequence).toBe(index + 1); expect(row.previousRoleSha256).toBe(previous); previous = row.sha256; }
      return records;
    }).sort((a, b) => a.sequence - b.sequence);
    expect(all).toHaveLength(12); let previous: string | null = null;
    for (const [index, row] of all.entries()) {
      const { sha256: digest, ...body } = row;
      expect(row.sequence).toBe(index + 1); expect(row.previousSha256).toBe(previous);
      expect(createHash('sha256').update(JSON.stringify(stable(body))).digest('hex')).toBe(digest); previous = digest;
    }
    expect(writer.summary()).toMatchObject({ durableRecords: 12, declarations: 4, usageReports: 2,
      capturedUsage: { inputTokens: 6, outputTokens: 10, cacheCreationInputTokens: 14, cacheReadInputTokens: 22 }, captured: { relay: 1, 'launch-terminal': 1 } });
    expect(Object.isFrozen(writer.summary().roles.author)).toBe(true);
    expect(await writer.close()).toMatchObject({ closed: true, poisoned: false, tail: 'durable-prefix', termination: 'closed' });
  });

  it('refuses reader-shaped history tokens and a forged history event through ordinary append', async () => {
    const f = fixture(), writer = await f.create();
    await expect(writer.commitLaunchHistory({} as never)).rejects.toThrow('url-session-audit-refused');
    expect(writer.summary()).toMatchObject({ durableRecords: 4, captured: { 'launch-history': 0 } });
    await expect(writer.append({ kind: 'launch-history', role: 'inventory', scope: writer.scope('inventory'), payload: {
      file: 'inventory/session-1.launch.json', recordSha256: '1'.repeat(64), recordBytes: 1,
      promptRecordSha256: '2'.repeat(64), promptSha256: '3'.repeat(64), sessionId: 'own-fixture' } } as never)).rejects.toThrow('url-session-audit-refused');
    expect(lines(f, 'inventory')).toHaveLength(1);
    expect(writer.summary()).toMatchObject({ durableRecords: 4, captured: { 'launch-history': 0 } });
  });

  it('requires scoped capabilities for a design append and rejects it through ordinary audit append', async () => {
    const f = fixture(), writer = await f.create(), before = fs.readFileSync(f.file('design'));
    await expect(writer.commitDesignDelivery({ product: {}, expectedProduct: {}, launch: {}, run: f.root, runId: f.options.binding.run,
      pinnedRevision: f.options.pin, sitePath: path.join(f.root, 'site', '0'), round: 1 } as never))
      .rejects.toThrow('url-session-audit-refused');
    expect(writer.summary()).toMatchObject({ poisoned: false, durableRecords: 4, captured: { 'design-delivery': 0 } });
    await expect(writer.append({ kind: 'design-delivery', role: 'design', scope: writer.scope('design'),
      payload: { state: 'prepared', site: 0, round: 1, original: 'OWN_RAW_CANARY' } } as never))
      .rejects.toThrow('url-session-audit-refused');
    expect(before.equals(fs.readFileSync(f.file('design')))).toBe(true);
  });

  it('refuses absent, copied, duplicate, cross-bound or missing profile capabilities and unknown factory fields before creating role files', async () => {
    expect((await createUrlSessionAudit({} as never)).ok).toBe(false);
    const f = fixture();
    for (const changes of [{ profiles: [] }, { profiles: f.profiles.map(p => ({ ...p })) }, { profiles: [f.profiles[0]!, f.profiles[0]!, ...f.profiles.slice(2)] },
      { binding: { ...f.options.binding, sourceBinding: '0'.repeat(64) } }, { originPolicySha256: 'not-a-hash' }, { declaredClasses: [] }, { limits: { milliseconds: 0 } }, { rawBody: 'OWN_RAW_BODY' }]) {
      const result = await createUrlSessionAudit({ ...f.options, ...changes } as UrlSessionAuditOptions); expect(result.ok).toBe(false);
      expect(fs.readdirSync(f.parent)).toEqual([]);
    }
  });

  it.each(['kind', 'role', 'relay-event', 'relay-outcome', 'control-event', 'answer-kind', 'tool', 'tool-name', 'launch-event', 'launch-outcome', 'launch-signal', 'launch-group'])('requires an actual string rather than a structural array for %s', async field => {
    for (const nested of [false, true]) {
      const f = fixture(), writer = await f.create();
      const kind = field.startsWith('relay') ? 'relay' : field === 'control-event' || field === 'answer-kind' ? 'control'
        : field === 'tool-name' ? 'tool-receipt' : field.startsWith('launch') ? field === 'launch-event' ? 'launch-attempt' : 'launch-terminal' : 'before-tool';
      const event = structuredClone(f.event(writer, kind)) as any;
      if (field === 'answer-kind') event.payload = { event: 'clarification-answer', questionSha256: '1'.repeat(64), answerSha256: '2'.repeat(64), answerBytes: 10, nonceSha256: '3'.repeat(64), answerKind: 'free-text' };
      await writer.append(event); const before = writer.summary().durableBytes;
      const target = field === 'kind' || field === 'role' ? event : event.payload;
      const key = ({ 'relay-event': 'event', 'relay-outcome': 'outcome', 'control-event': 'event', 'answer-kind': 'answerKind', 'tool-name': 'toolName',
        'launch-event': 'event', 'launch-outcome': 'outcome', 'launch-signal': 'signal', 'launch-group': 'groupTermination' } as Record<string, string>)[field] ?? field;
      target[key] = nested ? [[target[key]]] : [target[key]];
      await expect(writer.append(event)).rejects.toThrow('url-session-audit-refused'); expect(writer.summary().durableBytes).toBe(before);
      expect(writer.summary()).toMatchObject({ poisoned: true, tail: 'Unknown' });
    }
  });

  it.each(['extra', 'scope', 'nested-binding', 'project', 'admission-class', 'origin', 'received', 'status', 'usage', 'receipt-text', 'receipt-input', 'question', 'answer', 'stream-text', 'pending', 'signal-pair'])('refuses %s binding/schema/raw-content substitution without persisting any supplied extension', async field => {
    const f = fixture(), writer = await f.create();
    const kind = field === 'usage' ? 'usage' : field.startsWith('receipt') || field === 'origin' ? 'tool-receipt' : field === 'question' || field === 'answer' ? 'control'
      : ['stream-text', 'pending', 'signal-pair'].includes(field) ? 'launch-terminal' : 'relay';
    const event = structuredClone(f.event(writer, kind)) as any;
    if (field === 'extra') event.raw = 'OWN_RAW_CANARY';
    if (field === 'scope') event.scope.originPolicySha256 = '0'.repeat(64);
    if (field === 'nested-binding') event.payload.subject.binding.role = 'design';
    if (field === 'project') event.payload.subject.project = 'project:other';
    if (field === 'admission-class') event.payload.admission.classes = [['project-documentation']];
    if (field === 'origin') event.payload.originIds = [['provider:claimed']];
    if (field === 'received') event.payload.received.bytes = '101';
    if (field === 'status') event.payload.status = 200;
    if (field === 'usage') event.payload.outputTokens = -1;
    if (field === 'receipt-text') event.payload.canonicalText = 'OWN_RAW_CANARY';
    if (field === 'receipt-input') event.payload.toolInput = { raw: 'OWN_RAW_CANARY' };
    if (field === 'question') event.payload.question = 'OWN_RAW_CANARY';
    if (field === 'answer') event.payload.answer = 'OWN_RAW_CANARY';
    if (field === 'stream-text') event.payload.stdout.text = 'OWN_RAW_CANARY';
    if (field === 'pending') { event.payload.toolTermination = 'settled'; event.payload.pendingInvocations = 1; }
    if (field === 'signal-pair') event.payload.exitCode = 0;
    await expect(writer.append(event)).rejects.toThrow('url-session-audit-refused');
    expect(writer.summary().durableRecords).toBe(4); expect(ROLES.map(r => fs.readFileSync(f.file(r), 'utf8')).join('')).not.toContain('OWN_RAW_CANARY');
    await expect(writer.append(f.event(writer, 'before-tool', 'design'))).rejects.toThrow();
  });

  it('records selected finite launch overrides as a durable snapshot without changing historical record format', async () => {
    const f = fixture(), writer = await f.create(), event = structuredClone(f.event(writer, 'launch-attempt')) as any;
    event.payload.limits.sampleMilliseconds = 100; event.payload.limits.outputBytes = 4096;
    const appended = writer.append(event); event.payload.limits.sampleMilliseconds = 50;
    await appended;
    expect(lines(f).at(-1)).toMatchObject({ format: 'url-session-audit/2', event: { payload: { limits: {
      sampleMilliseconds: 100, outputBytes: 4096,
    } } } });
  });

  it.each(['historical-no-limits', 'unknown', 'missing', 'zero', 'negative', 'fraction', 'unsafe', 'nan', 'infinity'])('refuses %s launch limits before persisting live evidence', async fault => {
    const f = fixture(), writer = await f.create(), event = structuredClone(f.event(writer, 'launch-attempt')) as any;
    if (fault === 'historical-no-limits') delete event.payload.limits;
    else if (fault === 'unknown') event.payload.limits.unbounded = 1;
    else if (fault === 'missing') delete event.payload.limits.sampleMilliseconds;
    else event.payload.limits.sampleMilliseconds = ({ zero: 0, negative: -1, fraction: 0.5, unsafe: Number.MAX_SAFE_INTEGER + 1,
      nan: Number.NaN, infinity: Number.POSITIVE_INFINITY } as Record<string, number>)[fault];
    const before = fs.readFileSync(f.file());
    await expect(writer.append(event)).rejects.toThrow();
    expect(fs.readFileSync(f.file()).equals(before)).toBe(true);
    expect(writer.summary()).toMatchObject({ poisoned: true, captured: { 'launch-attempt': 0 } });
  });

  it('retains exact launch refusal and Unknown termination fields and accepts only declared content classes', async () => {
    const f = fixture(), writer = await f.create({ declaredClasses: ['project-documentation'] });
    const event = structuredClone(f.event(writer, 'launch-terminal')) as any;
    Object.assign(event.payload, { outcome: 'launch-refused', signal: null, exitCode: null, viewTermination: 'Unknown', groupTermination: 'Unknown', toolTermination: 'Unknown', pendingInvocations: null, peakProcesses: null });
    await writer.append(event); expect(lines(f).at(-1).event.payload).toEqual(event.payload);
    await expect(writer.append(f.event(writer, 'tool-receipt'))).rejects.toThrow(); expect(writer.summary().captured['tool-receipt']).toBe(0);
  });

  it.each([['SYNTHETIC_SECRET_AUDIT', 'safe'], ['SYNTHETIC_', 'SECRET_AUDIT']])('screens complete metadata fields and origin compositions %j', async (left, right) => {
    const f = fixture({ id: 'own-audit-secret', kind: 'literal-fragment', values: ['SYNTHETIC_SECRET_AUDIT'] }), writer = await f.create();
    const control = structuredClone(f.event(writer, 'tool-receipt')) as any; control.payload.originIds = ['ORDINARY_', 'SECRET_AUDIT'];
    await writer.append(control); const prior = writer.summary().durableRecords;
    const event = structuredClone(f.event(writer, 'tool-receipt')) as any; event.payload.originIds = [left, right];
    await expect(writer.append(event)).rejects.toThrow(); expect(writer.summary().durableRecords).toBe(prior);
  });

  it('screens active content in otherwise valid factory metadata before creating any file', async () => {
    const f = fixture(), parent = path.join(f.root, '<script>own'); fs.mkdirSync(parent, { mode: 0o700 });
    expect((await createUrlSessionAudit({ ...f.options, parent })).ok).toBe(false); expect(fs.readdirSync(parent)).toEqual([]);
  });

  it.each(['append', 'truncate', 'replace-inode', 'hardlink', 'file-mode', 'parent-mode', 'parent-alias'])('checks every role segment and the parent before acknowledging another role after %s tamper', async kind => {
    const f = fixture(), writer = await f.create(), target = f.file('design');
    if (kind === 'append') fs.appendFileSync(target, 'OWN_TAMPER');
    if (kind === 'truncate') fs.truncateSync(target, 1);
    if (kind === 'replace-inode') { const data = fs.readFileSync(target); fs.renameSync(target, target + '.old'); fs.writeFileSync(target, data, { mode: 0o600 }); }
    if (kind === 'hardlink') fs.linkSync(target, target + '.link');
    if (kind === 'file-mode') fs.chmodSync(target, 0o640);
    if (kind === 'parent-mode') fs.chmodSync(f.parent, 0o750);
    if (kind === 'parent-alias') { fs.renameSync(f.parent, f.parent + '-old'); fs.symlinkSync(f.parent + '-old', f.parent); }
    await expect(writer.append(f.event(writer))).rejects.toThrow(); expect(writer.summary()).toMatchObject({ poisoned: true, durableRecords: 4, tail: 'Unknown' });
  });

  it('compares the actual descriptor prefix, not only size and inode metadata', async () => {
    const f = fixture(), writer = await f.create(), p = await prototype(), actual = p.read;
    vi.spyOn(p, 'read').mockImplementation(async function(this: FileHandle, ...args: any[]) {
      const result = await actual.apply(this, args); if (result.bytesRead) (args[0] as Buffer)[0] = ((args[0] as Buffer)[0] ?? 0) ^ 1; return result;
    });
    await expect(writer.append(f.event(writer))).rejects.toThrow(); expect(writer.summary().durableRecords).toBe(4);
  });

  it('refuses existing/symlink files and a non-private or aliased parent without overwriting owned fixtures', async () => {
    for (const kind of ['existing', 'symlink', 'parent-public', 'parent-alias']) {
      const f = fixture(), outside = path.join(f.root, 'own-outside'); fs.writeFileSync(outside, 'OWN_UNCHANGED');
      if (kind === 'existing') fs.writeFileSync(f.file(), 'OWN_UNCHANGED', { mode: 0o600 });
      if (kind === 'symlink') fs.symlinkSync(outside, f.file());
      if (kind === 'parent-public') fs.chmodSync(f.parent, 0o755);
      if (kind === 'parent-alias') fs.symlinkSync(f.parent, f.parent + '-alias');
      const result = await createUrlSessionAudit(kind === 'parent-alias' ? { ...f.options, parent: f.parent + '-alias' } : f.options);
      expect(result.ok).toBe(false); expect(fs.readFileSync(outside, 'utf8')).toBe('OWN_UNCHANGED');
    }
  });

  it('poisons globally on partial writes without retry, and retains the unacknowledged tail as Unknown', async () => {
    const f = fixture(), writer = await f.create(), p = await prototype(), actual = p.write;
    const synced = vi.spyOn(p, 'sync');
    const write = vi.spyOn(p, 'write').mockImplementation(function(this: FileHandle, ...args: any[]) { return actual.call(this, args[0], args[1], 9, args[3]); });
    await expect(writer.append(f.event(writer))).rejects.toThrow(); expect(write).toHaveBeenCalledTimes(1); expect(synced).not.toHaveBeenCalled();
    expect(writer.summary()).toMatchObject({ durableRecords: 4, poisoned: true, tail: 'Unknown' });
    await expect(writer.append(f.event(writer, 'usage', 'inventory'))).rejects.toThrow(); expect(writer.summary().usageReports).toBe(0);
  });

  it.each(['throw', 'stale'])('withholds acknowledgement/counters and permanently poisons if file fsync is %s', async fault => {
    const f = fixture(), writer = await f.create(), p = await prototype(), actual = p.sync;
    const sync = vi.spyOn(p, 'sync').mockImplementation(async function(this: FileHandle) { if (fault === 'throw') throw new Error('OWN_RAW_ERROR'); await actual.call(this); f.revoke(); });
    await expect(writer.append(f.event(writer))).rejects.toThrow('url-session-audit-refused');
    expect(sync).toHaveBeenCalledTimes(1);
    expect(writer.summary()).toMatchObject({ durableRecords: 4, poisoned: true, tail: 'Unknown', captured: { 'before-tool': 0 } });
  });

  it('rechecks authority after directory fsync before counting the durable append', async () => {
    const f = fixture(), writer = await f.create(), p = await prototype(), actual = p.sync;
    const sync = vi.spyOn(p, 'sync').mockImplementation(async function(this: FileHandle) {
      const directory = fs.fstatSync(this.fd).isDirectory();
      await actual.call(this);
      if (directory) f.revoke();
    });
    await expect(writer.append(f.event(writer))).rejects.toThrow('url-session-audit-refused');
    expect(sync).toHaveBeenCalledTimes(2);
    expect(writer.summary()).toMatchObject({ durableRecords: 4, poisoned: true, tail: 'Unknown', captured: { 'before-tool': 0 } });
  });

  it.each(['before', 'after'] as const)('checks authority again if withdrawn during the %s-append prefix read', async when => {
    const f = fixture(), writer = await f.create(), p = await prototype(), read = p.read;
    const initial = fs.readFileSync(f.file());
    const write = vi.spyOn(p, 'write');
    let revoked = false;
    vi.spyOn(p, 'read').mockImplementation(async function(this: FileHandle, ...args: any[]) {
      const result = await read.apply(this, args);
      if (!revoked && (write.mock.calls.length === 0) === (when === 'before')) {
        revoked = true;
        f.revoke();
      }
      return result;
    });
    await expect(writer.append(f.event(writer))).rejects.toThrow('url-session-audit-refused');
    expect(revoked).toBe(true);
    expect(write).toHaveBeenCalledTimes(when === 'before' ? 0 : 1);
    const retained = fs.readFileSync(f.file());
    expect(retained.subarray(0, initial.length)).toEqual(initial);
    expect(retained.length === initial.length).toBe(when === 'before');
    expect(writer.summary()).toMatchObject({ durableRecords: 4, poisoned: true, tail: 'Unknown', captured: { 'before-tool': 0 } });
  });

  it('waits for directory fsync before acknowledging a durable event', async () => {
    const f = fixture(), writer = await f.create(), p = await prototype(), actual = p.sync, held = deferred<void>(); let entered = false;
    vi.spyOn(p, 'sync').mockImplementation(async function(this: FileHandle) { if (fs.fstatSync(this.fd).isDirectory()) { entered = true; await held.promise; } return actual.call(this); });
    let done = false; const operation = writer.append(f.event(writer)).then(() => { done = true; });
    await vi.waitFor(() => { expect(entered).toBe(true); });
    expect(done).toBe(false); expect(writer.summary().durableRecords).toBe(4); held.resolve(); await operation;
    expect(writer.summary().durableRecords).toBe(5);
  });

  it.each(['events', 'bytes', 'eventBytes', 'pending'])('enforces finite %s capacity without acknowledging overflow', async kind => {
    const f = fixture(), writer = await f.create({ limits: { events: 1, pending: 1 } });
    if (kind === 'events') { await writer.append(f.event(writer)); await expect(writer.append(f.event(writer, 'usage'))).rejects.toThrow(); }
    if (kind === 'pending') {
      const first = writer.append(f.event(writer)); const rejected = expect(first).rejects.toThrow();
      await expect(writer.append(f.event(writer, 'usage'))).rejects.toThrow(); await rejected;
    }
    if (kind === 'eventBytes') {
      const other = fixture(), limited = await other.create({ limits: { eventBytes: 3500 } });
      const event = structuredClone(other.event(limited, 'tool-receipt')) as any; event.payload.originIds = Array.from({ length: 128 }, (_, n) => 'origin:' + n.toString().padStart(3, '0') + 'x'.repeat(180));
      await expect(limited.append(event)).rejects.toThrow(); expect(limited.summary().durableRecords).toBe(4);
    }
    if (kind === 'bytes') {
      const other = fixture(), probe = await other.create(); const bytes = probe.summary().durableBytes; await probe.close();
      const limited = await other.create({ name: 'limited', limits: { bytes } });
      await expect(limited.append(other.event(limited))).rejects.toThrow(); expect(limited.summary().durableRecords).toBe(4);
    }
  });

  it('bounds queue-inclusive waits and close, reporting an uncancelled filesystem operation as Unknown', async () => {
    const f = fixture(), writer = await f.create({ limits: { milliseconds: 500 } }), p = await prototype(), actual = p.sync, held = deferred<void>();
    let entered = false;
    vi.spyOn(p, 'sync').mockImplementation(async function(this: FileHandle) { entered = true; await held.promise; return actual.call(this); });
    const first = writer.append(f.event(writer)), refusal = expect(first).rejects.toThrow();
    await vi.waitFor(() => expect(entered).toBe(true)); await refusal;
    const closed = await writer.close(); expect(closed).toMatchObject({ poisoned: true, termination: 'Unknown', tail: 'Unknown' }); expect(closed.pendingFilesystemOperations).toBeGreaterThan(0);
    held.resolve(); await flush(); await vi.waitFor(() => expect(writer.summary().pendingFilesystemOperations).toBe(0));
    expect((await writer.close()).termination).toBe('closed'); expect(writer.summary().durableRecords).toBe(4);
  });

  it('snapshots callbacks/config/event input before awaiting a current check', async () => {
    const f = fixture(); let hold = false; const held = deferred<boolean>();
    let entered = false; const options = { ...f.options, current: () => { if (hold) { entered = true; return held.promise; } return true; } }; const writer = await createUrlSessionAudit(options); if (!writer.ok) throw new Error(); writers.push(writer);
    const event = structuredClone(f.event(writer)) as any; hold = true; const operation = writer.append(event);
    await vi.waitFor(() => expect(entered).toBe(true)); event.payload.tool = 'arbitrary';
    Object.assign(options, { current: () => false, binding: { ...options.binding, provider: 'other' } });
    hold = false; held.resolve(true); await operation; expect(lines(f).at(-1).event.payload.tool).toBe('source_read');
    expect(writer.summary()).toMatchObject({ poisoned: false, durableRecords: 5 });
  });

  it('serializes concurrent cross-role events into one global chain', async () => {
    const f = fixture(), writer = await f.create(); await Promise.all(ROLES.map(role => writer.append(f.event(writer, 'usage', role))));
    const all = ROLES.flatMap(role => lines(f, role)).sort((a, b) => a.sequence - b.sequence);
    expect(all.map(row => row.sequence)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    for (let index = 1; index < all.length; index++) expect(all[index].previousSha256).toBe(all[index - 1].sha256);
    expect(writer.summary()).toMatchObject({ usageReports: 4, capturedUsage: { inputTokens: 12, outputTokens: 20, cacheCreationInputTokens: 28, cacheReadInputTokens: 44 } });
  });

  it('refuses a close that overtakes an in-flight current callback without acknowledging its event', async () => {
    const f = fixture(), held = deferred<boolean>(); let hold = false, entered = false;
    const writer = await f.create({ current: () => { if (hold) { entered = true; return held.promise; } return true; } });
    hold = true; const operation = writer.append(f.event(writer)), refusal = expect(operation).rejects.toThrow();
    await vi.waitFor(() => expect(entered).toBe(true)); const closing = writer.close(); held.resolve(true); await refusal;
    expect(await closing).toMatchObject({ closed: true, poisoned: true, durableRecords: 4 });
  });

  it.each([
    { cost: 150, ok: true, declarations: 4, checks: 26 },
    { cost: 250, ok: false, declarations: 2, checks: 20 },
  ])('keeps one setup cutoff through all declarations at $cost ms per check', async ({ cost, ok, declarations, checks }) => {
    const f = fixture();
    let elapsed = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => elapsed);
    const current = vi.fn(() => { elapsed += cost; return true; });
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      const result = await createUrlSessionAudit({ ...f.options, current });
      if (result.ok) writers.push(result);
      expect(result.ok).toBe(ok);
      expect(result.summary()).toMatchObject({ declarations, durableRecords: declarations, limits: { milliseconds: 5_000 } });
      expect(current).toHaveBeenCalledTimes(checks);
    } finally { vi.useRealTimers(); }
  });

  it('does not open private audit files after initial authority refusal', async () => {
    const f = fixture();
    const result = await createUrlSessionAudit({ ...f.options, current: () => false });
    expect(result.ok).toBe(false);
    expect(fs.existsSync(f.file('author'))).toBe(false);
    expect(result.summary()).toMatchObject({ closed: true, poisoned: true, durableRecords: 0, declarations: 0 });
  });

  it.each(['empty setup', 'first declaration sync'] as const)('applies the original wall deadline during %s', async phase => {
    const f = fixture(), p = await prototype(), statFile = p.stat, sync = p.sync;
    let wall = Date.now(), expired = false;
    const deadline = wall + 60_000;
    vi.spyOn(Date, 'now').mockImplementation(() => wall);
    const expire = () => { wall = deadline; expired = true; };
    if (phase === 'empty setup') {
      vi.spyOn(p, 'stat').mockImplementation(async function(this: FileHandle, ...args: unknown[]) {
        const stat = await statFile.apply(this, args);
        if (stat.isFile() && !expired) expire();
        return stat;
      });
    } else {
      vi.spyOn(p, 'sync').mockImplementation(async function(this: FileHandle) {
        await sync.call(this);
        if (fs.fstatSync(this.fd).isFile() && !expired) expire();
      });
    }
    const write = vi.spyOn(p, 'write');
    const result = await createUrlSessionAudit({ ...f.options, deadline, current: () => true });
    if (result.ok) writers.push(result);
    expect(expired).toBe(true);
    expect(result.ok).toBe(false);
    expect(write).toHaveBeenCalledTimes(phase === 'empty setup' ? 0 : 1);
    expect(result.summary()).toMatchObject({ closed: true, poisoned: true, durableRecords: 0, declarations: 0 });
    if (phase === 'empty setup') expect(fs.existsSync(f.file('inventory'))).toBe(false);
    else expect(fs.statSync(f.file('inventory')).size).toBe(0);
  });

  it('writes no declaration when authority is withdrawn during empty setup', async () => {
    const f = fixture(), p = await prototype(), statFile = p.stat;
    let withdrawn = false;
    vi.spyOn(p, 'stat').mockImplementation(async function(this: FileHandle, ...args: unknown[]) {
      const stat = await statFile.apply(this, args);
      if (stat.isFile() && !withdrawn) { withdrawn = true; f.revoke(); }
      return stat;
    });
    const write = vi.spyOn(p, 'write');
    const screenBody = vi.fn(f.options.screen.screenBody);
    const result = await createUrlSessionAudit({ ...f.options, screen: { ...f.options.screen, screenBody } });
    if (result.ok) writers.push(result);
    expect(withdrawn).toBe(true);
    expect(result.ok).toBe(false);
    expect(screenBody.mock.calls.some(([body]) => body.includes('"kind":"declaration"'))).toBe(false);
    expect(write).not.toHaveBeenCalled();
    expect(result.summary()).toMatchObject({ closed: true, poisoned: true, durableRecords: 0, declarations: 0 });
  });

  it('checks the named empty segments before refreshing setup authority', async () => {
    const f = fixture(), p = await prototype(), sync = p.sync, statFile = p.stat;
    const target = f.file('design'), displaced = path.join(f.root, 'displaced');
    vi.spyOn(p, 'sync').mockImplementationOnce(async function(this: FileHandle) {
      await sync.call(this);
      const original = fs.statSync(target, { bigint: true });
      fs.renameSync(target, displaced);
      fs.writeFileSync(target, '', { flag: 'wx', mode: 0o600 });
      // Isolate the named check from the old descriptor's rename ctime.
      vi.spyOn(p, 'stat').mockImplementation(async function(this: FileHandle, ...args: unknown[]) {
        const stat = await statFile.apply(this, args);
        return stat.dev === original.dev && stat.ino === original.ino ? original : stat;
      });
    });
    const current = vi.fn(() => true), write = vi.spyOn(p, 'write');
    const result = await createUrlSessionAudit({ ...f.options, current });
    if (result.ok) writers.push(result);
    expect(fs.statSync(target).ino).not.toBe(fs.statSync(displaced).ino);
    expect(result.ok).toBe(false);
    expect(current).toHaveBeenCalledTimes(1);
    expect(write).not.toHaveBeenCalled();
    expect(result.summary()).toMatchObject({ closed: true, poisoned: true, durableRecords: 0, declarations: 0 });
  });

  it('bounds setup and retains honest Unknown for an uncancelled current callback', async () => {
    const f = fixture(), held = deferred<boolean>();
    const result = await createUrlSessionAudit({ ...f.options, current: () => held.promise, limits: { milliseconds: 15 } });
    expect(result.ok).toBe(false); expect(result.summary()).toMatchObject({ durableRecords: 0, pendingCallbacks: 1, termination: 'Unknown', tail: 'Unknown' });
    expect(fs.readdirSync(f.parent)).toEqual([]); held.resolve(true); await flush(); expect(result.summary().pendingCallbacks).toBe(0);
  });

  it('bounds setup filesystem work and closes a descriptor while retaining an unfinished operation as Unknown', async () => {
    const f = fixture(), p = await prototype(), actual = p.stat, held = deferred<void>(); let first = true;
    vi.spyOn(p, 'stat').mockImplementation(async function(this: FileHandle, ...args: any[]) { if (first) { first = false; await held.promise; } return actual.apply(this, args); });
    const result = await createUrlSessionAudit({ ...f.options, limits: { milliseconds: 25 } });
    expect(result.ok).toBe(false); expect(result.summary()).toMatchObject({ durableRecords: 0, termination: 'Unknown', tail: 'Unknown' });
    expect(result.summary().pendingFilesystemOperations).toBeGreaterThan(0); held.resolve(); await flush();
    await vi.waitFor(() => expect(result.summary().pendingFilesystemOperations).toBe(0)); expect(result.summary().closed).toBe(true);
  });

  it('withholds credential-shaped large usage before counting or persisting it', async () => {
    const f = fixture(), writer = await f.create(), event = structuredClone(f.event(writer, 'usage')) as any;
    event.payload.inputTokens = Number.MAX_SAFE_INTEGER;
    // The actual committed policy excludes this token-key numeric literal
    // before arithmetic; it cannot serve as an admitted overflow baseline.
    expect(f.options.screen.screenSecrets(JSON.stringify(event))).toBeDefined();
    await expect(writer.append(event)).rejects.toThrow();
    expect(writer.summary()).toMatchObject({ usageReports: 0, capturedUsage: { inputTokens: 0 } });
  });


  it('checks the final named prefix at close instead of sealing a segment tampered after its last append', async () => {
    const f = fixture(), writer = await f.create(); await writer.append(f.event(writer)); fs.appendFileSync(f.file('design'), 'OWN_LATE_TAMPER');
    expect(await writer.close()).toMatchObject({ closed: true, poisoned: true, durableRecords: 5, tail: 'Unknown' });
  });


  it('closes idempotently and shares concurrent close work without poisoning a clean prefix', async () => {
    const f = fixture(), writer = await f.create(); await writer.append(f.event(writer));
    const [first, second] = await Promise.all([writer.close(), writer.close()]);
    expect(first).toMatchObject({ closed: true, poisoned: false, tail: 'durable-prefix' }); expect(second).toEqual(first);
    expect(await writer.close()).toEqual(first);
  });

});
