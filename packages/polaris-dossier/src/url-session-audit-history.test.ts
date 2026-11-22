import * as fs from 'node:fs';
import { open, type FileHandle } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { sha256 } from '@syzygy/support';
import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { DOSSIER_POLICY_PATH } from './policy-snapshot.js';
import { buildDossierScreen } from './screen.js';
import { createSessionProfile, DEFAULT_SESSION_MODEL } from './session-profile.js';
import { URL_LAUNCH_LIMITS } from './session-launch.js';
import { SESSION_COUNT_TOKENS_PATH } from './session-relay.js';
import { createUrlSessionAudit, URL_SESSION_AUDIT_LIMITS, type UrlSessionAuditEvent } from './url-session-audit.js';
import { verifyUrlSessionAuditHistory } from './url-session-audit-history.js';

const ROLES = ['author', 'inventory', 'fidelity', 'design'] as const;
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
const canonical = (v: unknown): string => encodeCanonicalJson(v, { maxBytes: 65_536, maxNodes: 4096, maxDepth: 12 });
type ToolHistory = 'complete-tool' | 'count-without-continuation' | 'count-repeated' | 'count-with-usage' | 'count-wrong-origin' | 'different-consumed-receipt';
async function fixture(fault?: 'incomplete-send' | 'uncertain-send' | 'unknown-cleanup' | 'missing-usage' | 'missing-terminal' | 'unfinished-tool' | 'unsupported-kind',
  toolHistory?: ToolHistory) {
  const root = tempDir('url-audit-history-'), parent = path.join(root, 'protected'); fs.mkdirSync(parent, { mode: 0o700 });
  const loaded = buildDossierScreen(fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..', DOSSIER_POLICY_PATH)), true, null, 'private');
  if (!loaded.ok) throw new Error('owned policy unavailable');
  const binding = { run: 'own-run', sourceBinding: 'a'.repeat(64), policy: loaded.screen.policySha256, provider: 'anthropic', model: DEFAULT_SESSION_MODEL };
  const profiles = ROLES.map((role, index) => {
    const result = createSessionProfile({ binding: { ...binding, role }, sessionId: `12345678-1234-4234-8234-12345678901${index}`,
      systemPrompt: 'Use only the four fixed own tools.', initialPrompt: 'Read own synthetic input.', utcDate: '2026-11-19', kernelRelease: '6.0.0-own' });
    if (!result.ok) throw new Error('owned profile unavailable'); return result.value.profile;
  });
  const fixed = { parent, name: 'host', binding, originPolicySha256: 'b'.repeat(64), project: 'project:own-fixture',
    pin: 'c'.repeat(40), principal: 'own-operator', profiles, declaredClasses: ['project-documentation'] as const,
    screen: loaded.screen, current: () => true };
  const writer = await createUrlSessionAudit(fixed); if (!writer.ok) throw new Error('owned writer unavailable');
  try {
    expect(writer.closedHistory()).toBeNull();
    for (const role of ROLES) {
      const scope = writer.scope(role);
      await writer.append({ kind: 'launch-attempt', role, scope, payload: { event: 'session-launch-attempt', profileSha256: scope.profileSha256,
        commandSha256: '3'.repeat(64), viewSha256: '4'.repeat(64), limits: URL_LAUNCH_LIMITS } });
      if (role === 'author') {
        const initial = { subject: { binding: scope.binding, project: fixed.project, pin: fixed.pin, principal: fixed.principal },
          requestId: '12345678-1234-4234-8234-123456789012', at: '2026-11-19T00:00:00.000Z', credentialIdentity: 'Unknown',
          exposureMode: 'private-local-cli', governingRule: 'GOVERNANCE-SIMPLIFICATION-D10',
          admission: { digest: 'd'.repeat(64), bytes: 100, classes: ['project-documentation'], originIds: ['source:own'] },
          received: { digest: 'e'.repeat(64), bytes: 101 }, route: 'messages', consumedToolResults: [], response: null, status: null };
        const relay = (event: string, outcome: string, extra = {}) => writer.append({ kind: 'relay', role, scope,
          payload: { ...initial, event, outcome, ...extra } } as UrlSessionAuditEvent);
        const usage = () => writer.append({ kind: 'usage', role, scope,
          payload: { inputTokens: 1, outputTokens: 2, cacheCreationInputTokens: 0, cacheReadInputTokens: 0 } });
        const call = { id: 'toolu_own_read', name: 'mcp__syzygy__source_read', inputSha256: '5'.repeat(64) };
        const completeResponse = { digest: '8'.repeat(64), bytes: 120, content: 'messages-event-stream', stopReason: 'end_turn', textBlocks: 1, tool: null };
        await relay('attempt-allowed', 'allowed'); await relay('send-attempt', 'attempted');
        if (fault === 'uncertain-send') await relay('transport-failed', 'Unknown');
        else if (fault !== 'incomplete-send') {
          await relay('send-outcome', 'local-request-flushed');
          if (fault !== 'missing-usage') await usage();
          await relay('response-admitted', 'response-admitted', { status: 200,
            response: toolHistory === undefined ? completeResponse : { ...completeResponse, stopReason: 'tool_use', tool: call } });
        }
        if (toolHistory !== undefined) {
          const receipt = { id: `tool-${'1'.repeat(64)}`, toolName: call.name as 'mcp__syzygy__source_read',
            inputSha256: call.inputSha256, digest: '2'.repeat(64), bytes: 84, classes: fixed.declaredClasses, originIds: ['source:own'] };
          await writer.append({ kind: 'before-tool', role, scope, payload: { tool: 'source_read', inputSha256: call.inputSha256 } });
          await writer.append({ kind: 'tool-receipt', role, scope, payload: receipt });
          const exchange = async (request: object, response: object, captureUsage: boolean) => {
            await relay('attempt-allowed', 'allowed', request);
            await relay('send-attempt', 'attempted', request);
            await relay('send-outcome', 'local-request-flushed', request);
            if (captureUsage) await usage();
            await relay('response-admitted', 'response-admitted', { ...request, status: 200, response });
          };
          const countRequest = { requestId: '12345678-1234-4234-8234-123456789013', route: SESSION_COUNT_TOKENS_PATH,
            admission: { ...initial.admission, originIds: toolHistory === 'count-wrong-origin' ? ['source:own'] : [receipt.id] },
            received: { bytes: initial.admission.bytes, digest: initial.admission.digest } };
          const countResponse = { digest: '6'.repeat(64), bytes: 24, content: 'count-tokens-json', estimatedInputTokens: 25 };
          await exchange(countRequest, countResponse, toolHistory === 'count-with-usage');
          if (toolHistory === 'count-repeated') await exchange({ ...countRequest, requestId: '12345678-1234-4234-8234-123456789014' }, countResponse, false);
          if (toolHistory !== 'count-without-continuation') await exchange({
            requestId: '12345678-1234-4234-8234-123456789015',
            admission: { ...initial.admission, originIds: [receipt.id] },
            consumedToolResults: [{ receiptId: receipt.id, toolUseId: call.id,
              bytes: receipt.bytes, digest: toolHistory === 'different-consumed-receipt' ? '9'.repeat(64) : receipt.digest }],
          }, completeResponse, true);
        }
        if (fault === 'unsupported-kind') await writer.appendMachinePeer({ event: 'machine-peer-effect', clientId: 'own-client', instanceId: 'own-instance', revision: 1,
          runId: binding.run, role, operation: 'source_read', processIdentitySha256: '1'.repeat(64), channelIdentitySha256: '2'.repeat(64), at: Date.now() });
        if (fault === 'unfinished-tool') await writer.append({ kind: 'before-tool', role, scope, payload: { tool: 'source_read', inputSha256: '5'.repeat(64) } });
      }
      if (!(fault === 'missing-terminal' && role === 'author')) await writer.append({ kind: 'launch-terminal', role, scope, payload: {
        outcome: 'stopped', exitCode: null, signal: 'SIGTERM', viewTermination: 'view-exited', groupTermination: fault === 'unknown-cleanup' ? 'Unknown' : 'confirmed',
        toolTermination: 'settled', pendingInvocations: 0, stdout: { bytes: 0, sha256: sha256('') }, stderr: { bytes: 0, sha256: sha256('') },
        sampledStorageBytes: 0, peakProcesses: 1, aggregateEnforcement: 'sampled-stop-only', betweenSamples: 'Unknown' } });
    }
    // Expectations come from the genuine retained writer, not a reread of files.
    const closed = await writer.close(); expect(closed).toMatchObject({ closed: true, poisoned: false });
    const expected = writer.closedHistory();
    if (expected === null) throw new Error('owned history unavailable');
    expect(expected).toMatchObject({ durableRecords: closed.durableRecords, durableBytes: closed.durableBytes, tipSha256: closed.tipSha256 });
    expect(expected.declarations.author).toMatchObject({ scope: writer.scope('author'), payload: {
      project: fixed.project, pin: fixed.pin, principal: fixed.principal, declaredClasses: fixed.declaredClasses, profile: profiles[0]!.id,
      limits: URL_SESSION_AUDIT_LIMITS, capture: 'host-callbacks-only', providerReceipts: 'Unknown', nativeSendCensus: 'Unknown' } });
    const file = (role: typeof ROLES[number] = 'author') => path.join(parent, `host-${role}.jsonl`);
    return { parent, file, expected, options: { parent, name: 'host', expected, current: () => true } };
  } finally { await writer.close(); }
}

describe('read-only protected audit history', () => {
  it('verifies actual closed writer segments against independently retained global and role anchors, without issuing authority', async () => {
    const f = await fixture(), before = ROLES.map(role => fs.readFileSync(f.file(role)));
    expect(await verifyUrlSessionAuditHistory(f.options)).toEqual({ kind: 'verified-local-audit-history', authorization: 'none', replay: 'forbidden',
      completeness: 'Unknown', records: 17, bytes: f.expected.durableBytes, tipSha256: f.expected.tipSha256,
      capturedLaunchTerminals: 4, capturedCompleteExchanges: 1, capturedCountExchanges: 0 });
    expect(ROLES.map(role => fs.readFileSync(f.file(role)))).toEqual(before);
  });

  it('joins a checked count estimate to its completed tool and separately verifies the Messages continuation', async () => {
    const f = await fixture(undefined, 'complete-tool');
    expect(await verifyUrlSessionAuditHistory(f.options)).toMatchObject({ authorization: 'none', replay: 'forbidden', completeness: 'Unknown',
      capturedLaunchTerminals: 4, capturedCompleteExchanges: 2, capturedCountExchanges: 1 });
  });

  it.each(['count-without-continuation', 'count-repeated', 'count-with-usage', 'count-wrong-origin', 'different-consumed-receipt'] as const)
  ('refuses a captured tool exchange with %s', async toolHistory => {
    const f = await fixture(undefined, toolHistory);
    expect(await verifyUrlSessionAuditHistory(f.options)).toBeNull();
  });

  it.each(['dropped', 'truncated', 'appended', 'relinked', 'symlink', 'hardlink', 'public-mode'] as const)('refuses %s physical bytes without repairing them', async fault => {
    const f = await fixture(), file = f.file();
    const bytes = fs.readFileSync(file), lines = bytes.toString().trimEnd().split('\n');
    if (fault === 'dropped') fs.writeFileSync(file, `${lines.slice(0, -1).join('\n')}\n`);
    if (fault === 'truncated') fs.truncateSync(file, bytes.length - 1);
    if (fault === 'appended') fs.appendFileSync(file, '\n');
    if (fault === 'relinked') {
      const row = JSON.parse(lines.at(-1)!); row.event.payload.peakProcesses = 2;
      const { sha256: _digest, ...body } = row; row.sha256 = sha256(canonical(body)); lines[lines.length - 1] = canonical(row);
      fs.writeFileSync(file, `${lines.join('\n')}\n`);
    }
    if (fault === 'symlink') { fs.renameSync(file, `${file}.owned`); fs.symlinkSync(`${file}.owned`, file); }
    if (fault === 'hardlink') fs.linkSync(file, `${file}.alias`);
    if (fault === 'public-mode') fs.chmodSync(file, 0o644);
    const changed = fs.readFileSync(file);
    expect(await verifyUrlSessionAuditHistory(f.options)).toBeNull(); expect(fs.readFileSync(file)).toEqual(changed);
  });

  it.each(['global-tip', 'role-tip', 'global-count', 'role-count', 'bytes', 'scope', 'pin', 'declaration'] as const)('refuses independent %s disagreement', async fault => {
    const f = await fixture(), expected = structuredClone(f.expected) as any;
    if (fault === 'global-tip') expected.tipSha256 = 'f'.repeat(64);
    if (fault === 'role-tip') expected.roles.author.tipSha256 = 'f'.repeat(64);
    if (fault === 'global-count') expected.durableRecords--;
    if (fault === 'role-count') expected.roles.author.records--;
    if (fault === 'bytes') expected.roles.author.bytes--;
    if (fault === 'scope') expected.declarations.author.scope.profileSha256 = 'f'.repeat(64);
    if (fault === 'pin') for (const role of ROLES) expected.declarations[role].payload.pin = 'f'.repeat(40);
    if (fault === 'declaration') for (const role of ROLES) expected.declarations[role].payload.limits.events--;
    expect(await verifyUrlSessionAuditHistory({ ...f.options, expected })).toBeNull();
  });

  it.each(['global-link', 'global-sequence', 'role-sequence', 'record-hash', 'noncanonical'] as const)('refuses %s even when supplied tips match the altered archive', async fault => {
    const f = await fixture(), expected = structuredClone(f.expected) as any;
    const rows = ROLES.flatMap(role => fs.readFileSync(f.file(role), 'utf8').trimEnd().split('\n').map(line => JSON.parse(line)))
      .sort((a, b) => a.sequence - b.sequence);
    let global: string | null = null;
    const exchanges = new Map<string, string>();
    const roles = Object.fromEntries(ROLES.map(role => [role, { tip: null as string | null, lines: [] as string[] }]));
    for (const [index, row] of rows.entries()) {
      const role = row.event.role as typeof ROLES[number], state = roles[role]!;
      row.previousSha256 = fault === 'global-link' && index === 4 ? 'f'.repeat(64) : global;
      row.previousRoleSha256 = state.tip;
      row.roleSequence = fault === 'role-sequence' && index === 4 ? 99 : state.lines.length + 1;
      if (fault === 'global-sequence' && index === 4) row.sequence++;
      if (row.event.kind === 'relay') row.event.payload.previousExchangeSha256 = exchanges.get(row.event.payload.requestId) ?? null;
      const { sha256: _digest, ...body } = row;
      row.sha256 = fault === 'record-hash' && index === 4 ? 'f'.repeat(64) : createHash('sha256').update(canonical(body)).digest('hex');
      global = row.sha256; state.tip = row.sha256;
      if (row.event.kind === 'relay') exchanges.set(row.event.payload.requestId, row.sha256);
      state.lines.push((fault === 'noncanonical' && index === 4 ? ' ' : '') + canonical(row));
    }
    expected.tipSha256 = global; expected.durableBytes = 0;
    for (const role of ROLES) {
      const bytes = Buffer.from(`${roles[role]!.lines.join('\n')}\n`); fs.writeFileSync(f.file(role), bytes);
      expected.roles[role].bytes = bytes.length; expected.roles[role].tipSha256 = roles[role]!.tip; expected.durableBytes += bytes.length;
    }
    expect(await verifyUrlSessionAuditHistory({ ...f.options, expected })).toBeNull();
  });

  it.each(['incomplete-send', 'uncertain-send', 'unknown-cleanup', 'missing-usage', 'missing-terminal', 'unfinished-tool', 'unsupported-kind'] as const)('refuses genuine closed writer history with %s', async fault => {
    const f = await fixture(fault); expect(await verifyUrlSessionAuditHistory(f.options)).toBeNull();
  });

  it('refuses withdrawal during an actual held descriptor read', async () => {
    const f = await fixture(), probe = await open(f.file(), 'r'), prototype = Object.getPrototypeOf(probe); await probe.close();
    const read = prototype.read; let current = true;
    vi.spyOn(prototype, 'read').mockImplementation(async function(this: FileHandle, ...args: unknown[]) {
      const result = await read.apply(this, args); current = false; return result;
    });
    expect(await verifyUrlSessionAuditHistory({ ...f.options, current: () => current })).toBeNull();
  });

  it('bounds a delayed kernel read and cannot publish a late successful result', async () => {
    const f = await fixture(), probe = await open(f.file(), 'r'), prototype = Object.getPrototypeOf(probe); await probe.close();
    let began!: () => void, release!: () => void;
    const entered = new Promise<void>(resolve => { began = resolve; }), held = new Promise<void>(resolve => { release = resolve; });
    const read = prototype.read;
    vi.spyOn(prototype, 'read').mockImplementationOnce(async function(this: FileHandle, ...args: unknown[]) {
      began(); await held; return read.apply(this, args);
    });
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const verification = verifyUrlSessionAuditHistory(f.options); await entered;
    try {
      await vi.advanceTimersByTimeAsync(URL_SESSION_AUDIT_LIMITS.milliseconds);
      expect(await verification).toBeNull();
    } finally { release(); vi.useRealTimers(); }
    await new Promise(resolve => setImmediate(resolve));
    expect(await verification).toBeNull();
  });
});
