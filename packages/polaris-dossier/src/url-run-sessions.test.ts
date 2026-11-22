import { mkdtemp, mkdir, readFile, realpath, rm, writeFile, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sha256 } from '@syzygy/support';
import { policyFixture } from './full-run.testkit.js';
import { parseRunConfig } from './run-config.js';
import { DOSSIER_CONTENT_CLASSES, NO_WORK_ITEM_REASON, encodeRunRecord, recordRunConfig } from './run-record.js';
import { buildDossierScreen } from './screen.js';
import { URL_CLI_PROGRAM, URL_LAUNCH_LIMITS, type UrlSessionLaunchOutcome } from './session-launch.js';
import type { SessionHostOptions } from './session-host.js';
import type { ViewRole } from './session-view.js';
import { URL_ROLES } from './url-run-record.js';
import { prepareHistoricalUrlRolePlansTestPort, type UrlRolePlanningOptions } from './url-role-plan.js';
import { inspectCommittedUrlLaunchHistory } from './url-session-audit.js';
import { startUrlRunSessions, urlRunSessionsTestPort, type UrlRunSessionsOptions } from './url-run-sessions.js';
const cleanup: string[] = [];
afterAll(async () => { for (const root of cleanup) await rm(root, { recursive: true, force: true }); });
async function planningFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'urp-')); cleanup.push(root);
  const run = path.join(root, `run-${'a'.repeat(32)}`), parent = path.join(root, 'views'), hidden = path.join(root, 'protected'), support = path.join(root, 'support');
  for (const directory of [run, parent, hidden, support]) await mkdir(directory, { mode: 0o700 });
  const snapshot = policyFixture(), built = buildDossierScreen(snapshot.bytes, true, null, 'private'); if (!built.ok) throw new Error();
  const config = parseRunConfig(JSON.stringify({ operator: 'own-operator', agentTool: 'claude-code', agentToolVersion: '2.1.327', agentProvider: 'anthropic',
    model: 'claude-sonnet-4-6', deadline: 'PT1H', agentTurnBudget: 20, maxRepairCycles: 2, maxQuestions: 1, audience: 'own readers', operatorIsOwner: false }));
  if (!config.ok) throw new Error();
  const record = recordRunConfig(config.config, { repository: { url: 'example.invalid/own/source', repositoryId: 'own-source', role: 'observed-source' },
    clone: { path: path.join(hidden, 'not-read-source'), declaredBy: 'operator', label: 'Inferred', use: 'read' },
    pinnedRevision: { commit: 'a'.repeat(40), label: 'own fixture', pinnedAt: '2026-11-19T00:00:00.000Z' }, screeningPolicy: snapshot.binding,
    contentClasses: DOSSIER_CONTENT_CLASSES, visibility: { value: 'private', source: 'conservative-default', declaredBy: 'conservative default', label: 'Inferred' },
    governed: { kind: 'unstated', because: ['own fixture'] }, workItem: { identity: null, reason: NO_WORK_ITEM_REASON } });
  const sourceRoot = new URL('../../../', import.meta.url);
  const { compileDossierSessionSupport } = await import(new URL('scripts/compile_dossier_session_support.mjs', sourceRoot).href) as {
    compileDossierSessionSupport: (read: (name: string) => Promise<Buffer>) => Promise<ReadonlyMap<string, Buffer>>;
  };
  const compiled = await compileDossierSessionSupport(name => readFile(new URL(name, sourceRoot)));
  await mkdir(path.join(root, 'design-support'), { mode: 0o700 });
  for (const [name, bytes] of compiled) await writeFile(path.join(root, name), bytes, { mode: 0o600 });
  const hashes = { 'session-bridge.js': sha256(compiled.get('support/session-bridge.js')!),
    'session-mcp.js': sha256(compiled.get('support/session-mcp.js')!) };
  const node = await realpath(process.execPath), canaries = ['source', 'auth', 'audit'].map(name => path.join(hidden, name));
  for (const file of canaries) await writeFile(file, 'OWN SYNTHETIC CANARY', { mode: 0o600 });
  const options: UrlRolePlanningOptions = { run, record, screen: built.screen,
    sessionDirectories: { author: run, inventory: path.join(`${run}.sessions`, 'session-1'),
      fidelity: path.join(`${run}.sessions`, 'fidelity-1'), design: path.join(`${run}.sessions`, 'design-1') },
    cliExecutable: await realpath(path.join(os.homedir(), '.local/share/claude/versions', URL_CLI_PROGRAM.version)), parent,
    protectedPaths: [run, hidden], canaries, current: () => true, audit: () => { throw new Error('planning may not launch a CLI'); }, now: Date.now(),
    runtime: { worker: { node, nodeSha256: sha256(await readFile(node)), bundle: path.join(hidden, 'unused-worker.mjs'), bundleSha256: 'b'.repeat(64) },
      peerProgram: { executable: path.join(hidden, 'unused-peer'), sha256: 'a'.repeat(64) },
      supportDirectory: support, supportSha256: hashes, inputTreeSha256: 'c'.repeat(64), manifestSha256: 'd'.repeat(64), profileRegistrySha256: 'e'.repeat(64) } };
  return { options, root, parent, hidden };
}


let prepared: Extract<Awaited<ReturnType<typeof prepareHistoricalUrlRolePlansTestPort>>, { ok: true }>;
let planning: Awaited<ReturnType<typeof planningFixture>>;
beforeAll(async () => {
  planning = await planningFixture(); const result = await prepareHistoricalUrlRolePlansTestPort(planning.options);
  expect(result.ok).toBe(true); if (!result.ok) throw new Error('own native role planning refused');
  prepared = result; cleanup.push(result.socketRoot);
}, 30_000);
async function runtimeFixture(failRole?: ViewRole, sampleForRole?: (role: ViewRole) => Promise<boolean>,
  healthyForRole: (role: ViewRole) => boolean = () => true, authorTerminal?: Partial<UrlSessionLaunchOutcome>) {
  const parent = await mkdtemp(path.join(planning.hidden, 'urs-audit-')); cleanup.push(parent);
  const committed: string[] = [];
  const calls: string[] = [], captured = new Map<ViewRole, SessionHostOptions>(), failures: string[] = [];
  let closedCredential = false;
  const outcome: UrlSessionLaunchOutcome = { outcome: 'stopped', exitCode: null, signal: 'SIGTERM', viewTermination: 'view-exited',
    groupTermination: 'confirmed', toolTermination: 'settled', pendingInvocations: 0,
    stdout: { bytes: 0, sha256: sha256('') }, stderr: { bytes: 0, sha256: sha256('') }, sampledStorageBytes: 0, peakProcesses: 1,
    aggregateEnforcement: 'sampled-stop-only', betweenSamples: 'Unknown' };
  const launchAudits = new Map<ViewRole, Parameters<Parameters<typeof urlRunSessionsTestPort>[0]['prepare']>[0]['audit']>();
  const start = urlRunSessionsTestPort({
    prepare: async input => {
      const role = input.profile.input.binding.role as ViewRole; calls.push(`prepare:${role}`);
      if (failRole === role) throw new Error('OWN_PREPARATION_FAILURE');
      const plan = prepared.roles.find(value => value.role === role)!; launchAudits.set(role, input.audit);
      return { profileSha256: plan.profile.digest, commandSha256: plan.declaration.commandSha256,
        viewSha256: plan.declaration.viewSha256, probe: 'owned-synthetic-namespace-probe-passed' };
    },
    host: async input => {
      const role = input.profile.input.binding.role as ViewRole; calls.push(`host:${role}`); captured.set(role, input);
      return { brokerSocket: input.brokerSocket, relaySocket: input.relaySocket, healthy: () => healthyForRole(role), close: async () => {
        calls.push(`host-close:${role}`); return { pendingInvocations: 0, termination: 'settled' }; } };
    },
    launch: async input => {
      const role = [...captured].find(([, value]) => value.brokerSocket === input.host.brokerSocket)![0];
      const plan = prepared.roles.find(value => value.role === role)!;
      await launchAudits.get(role)!({ event: 'session-launch-attempt', profileSha256: plan.profile.digest,
        commandSha256: plan.declaration.commandSha256, viewSha256: plan.declaration.viewSha256, limits: URL_LAUNCH_LIMITS });
      calls.push(`launch:${role}`);
      let resolve!: (value: UrlSessionLaunchOutcome) => void;
      const finished = new Promise<UrlSessionLaunchOutcome>(done => { resolve = done; });
      const terminal = role === 'author' ? { ...outcome, ...authorTerminal } : outcome;
      return { pid: 1000 + URL_ROLES.indexOf(role), commandSha256: plan.declaration.commandSha256, finished,
        waitForSample: async () => sampleForRole === undefined ? true : sampleForRole(role),
        stop: async () => { calls.push(`stop:${role}`); resolve(terminal); return terminal; } };
    },
  });
  const options: UrlRunSessionsOptions = { run: planning.options.run, record: planning.options.record, screen: planning.options.screen,
    plans: prepared.roles, runtime: planning.options.runtime, declaredClasses: ['governance-text', 'code-structure', 'work-history', 'derived-composites'],
    originPolicySha256: 'f'.repeat(64), auditParent: parent, auditName: 'own-session', principal: 'operator:own-fixture',
    sessionDirectories: planning.options.sessionDirectories, canaries: planning.options.canaries, current: () => true, now: Date.now,
    deadline: Date.now() + 60_000, credential: { source: 'api-key-environment', credentialIdentity: 'Unknown', expiresAt: null,
      headers: () => null, close: () => { closedCredential = true; } },
    runDossier: () => async () => { throw new Error('no dossier effect in lifecycle fixture'); },
    artifactOrigins: () => () => null, dossierOrigins: () => () => null,
    toolReceipt: (_role, _receipt, admission) => { expect(admission.digest).toBe('a'.repeat(64)); },
    toolReceiptCommitted: (role, id) => { committed.push(`${role}:${id}`); },
    ask: frame => ({ kind: 'declined', nonce: frame.nonce, questionSha256: frame.questionSha256 }),
    onFailure: reason => failures.push(reason) };
  return { start, options, parent, calls, captured, failures, committed, credentialClosed: () => closedCredential };
}

describe('one root lifecycle for four restricted URL roles', () => {
  it('refuses the historical design profile before any native supervisor effects', async () => {
    const f = await runtimeFixture();
    const unexpected = (): never => { throw new Error('unexpected supervisor effect'); };
    await expect(startUrlRunSessions({ ...f.options, current: unexpected, onFailure: unexpected,
      launchHistory: { promptDigests: { inventory: 'a'.repeat(64), fidelity: 'b'.repeat(64), design: 'c'.repeat(64) },
        register: unexpected } })).rejects.toThrow('url-ordered-design-profile-unavailable');
    expect(await readdir(f.parent)).toEqual([]);
    expect(f.credentialClosed()).toBe(false);
  });
  it('rejects copied role-plan assertions before audit, host, credential or launch effects', async () => {
    const f = await runtimeFixture();
    await expect(f.start({ ...f.options, plans: prepared.roles.map(plan => ({ ...plan })) })).rejects.toThrow('url-run-sessions-unavailable');
    expect(f.calls).toEqual([]); expect(await readdir(f.parent)).toEqual([]); expect(f.credentialClosed()).toBe(false);
  });
  it('prepares before each actual host, captures safe receipts and usage, and closes each owned process before audit', async () => {
    const f = await runtimeFixture(), runtime = await f.start(f.options);
    try {
    expect(f.calls).toEqual(URL_ROLES.flatMap(role => [`prepare:${role}`, `host:${role}`, `launch:${role}`]));
    expect(await runtime.publish('design', { event: 'design-round-prepared', round: 1, path: 'round-1/design-view.json',
      packetSha256: 'a'.repeat(64), viewSha256: 'b'.repeat(64) } as never)).toBe(false);
    expect(runtime.summary().audit.captured.control).toBe(0);
    const host = f.captured.get('author')!;
    const admission = { digest: 'a'.repeat(64), bytes: 100, classes: ['code-structure'] as const, originIds: ['origin:own-request'] };
    expect(host.reserveRequest(admission)).toBe(true);
    const exchange = { subject: host.subject, requestId: '11111111-1111-4111-8111-111111111111', at: new Date().toISOString(),
      credentialIdentity: 'Unknown', exposureMode: 'private-local-cli', governingRule: 'GOVERNANCE-SIMPLIFICATION-D10', admission,
      received: { digest: 'a'.repeat(64), bytes: 100 }, route: 'messages', consumedToolResults: [], response: null, status: null } as const;
    await host.audit({ ...exchange, event: 'attempt-allowed', outcome: 'allowed' });
    await host.audit({ ...exchange, event: 'send-attempt', outcome: 'attempted' });
    await host.audit({ ...exchange, event: 'send-outcome', outcome: 'local-request-flushed' });
    expect(host.observeUsage({ inputTokens: 3, outputTokens: 5, cacheCreationInputTokens: 2, cacheReadInputTokens: 1 })).toBe(true);
    await host.audit({ ...exchange, event: 'response-admitted',
      response: { digest: 'b'.repeat(64), bytes: 80, content: 'messages-event-stream', stopReason: 'end_turn', textBlocks: 1, tool: null },
      outcome: 'response-admitted', status: 200 });
    const secretFreeText = 'OWN QUESTION TEXT MUST REMAIN EPHEMERAL';
    await host.toolReceipt({ binding: host.profile.input.binding, id: 'tool-own-receipt', kind: 'tool-result', toolName: 'mcp__syzygy__dossier_step',
      toolInput: { argv: ['dossier', 'clarify', f.options.run, '--stdin'], stdin: secretFreeText }, canonicalText: secretFreeText,
      classes: ['work-history'], originIds: ['origin:run-control'], digest: sha256(secretFreeText), bytes: Buffer.byteLength(secretFreeText) });
    expect(f.committed).toEqual(['author:tool-own-receipt']);
    expect(await runtime.waitForProductSamples()).toBe(true);
    const result = await runtime.stop(); expect(await runtime.stop()).toBe(result);
    expect(await runtime.waitForProductSamples()).toBe(false);
    expect(result.failure).toBe(null); expect(result.budget).toMatchObject({ requestReservations: 1, completeUsageReports: 1, reportedTokens: 11 });
    expect(result.audit).toMatchObject({ poisoned: false, declarations: 4, captured: { 'launch-attempt': 4, 'launch-terminal': 4, usage: 1, 'tool-receipt': 1 } });
    expect(result.roles.every(role => role.outcome !== 'Unknown')).toBe(true); expect(f.credentialClosed()).toBe(true);
    const logs = await Promise.all((await readdir(f.parent)).map(name => readFile(path.join(f.parent, name), 'utf8')));
    expect(logs.join('')).not.toContain(secretFreeText); expect(await runtime.current()).toBe(false);
    } finally { await runtime.stop(); }
  });
  it.each([
    { outcome: 'storage-limit' },
    { outcome: 'exited', exitCode: 1, signal: null },
    { groupTermination: 'Unknown' },
  ] as const)('retains terminal failure during supervisor stop (%o)', async terminal => {
    const f = await runtimeFixture(undefined, undefined, undefined, terminal), runtime = await f.start(f.options);
    const result = await runtime.stop();
    expect(result.failure).toBe('role-ended');
    expect(result.roles.find(role => role.role === 'author')?.outcome).toMatchObject(terminal);
    expect(result.audit).toMatchObject({ poisoned: false, termination: 'closed', captured: { 'launch-terminal': 4 } });
  });
  it.each(['failed sample', 'changed admission'] as const)('keeps receipt provenance and audit untouched after a %s', async condition => {
    let announceWait!: () => void, releaseSample!: (current: boolean) => void;
    const waiting = new Promise<void>(resolve => { announceWait = resolve; });
    const held = new Promise<boolean>(resolve => { releaseSample = resolve; });
    const f = await runtimeFixture(undefined, async role => {
      if (role !== 'author') return true;
      announceWait();
      return held;
    });
    let provenanceCalls = 0;
    const runtime = await f.start({ ...f.options, toolReceipt: () => { provenanceCalls++; } });
    try {
      const host = f.captured.get('author')!;
      const admission = { digest: 'a'.repeat(64), bytes: 100, classes: ['work-history'] as const, originIds: ['origin:own-request'] };
      expect(host.reserveRequest(admission)).toBe(true);
      const reply = 'Owned receipt fixture';
      const delivering = host.toolReceipt({ binding: host.profile.input.binding, id: 'tool-own-draft', kind: 'tool-result',
        toolName: 'mcp__syzygy__artifact_write', toolInput: { path: 'drafts/next.json' }, canonicalText: reply,
        classes: ['work-history'], originIds: admission.originIds, digest: sha256(reply), bytes: Buffer.byteLength(reply) });
      const refusal = expect(delivering).rejects.toThrow('url-run-sessions-unavailable');
      void refusal.catch(() => {});
      try {
        await Promise.race([waiting, delivering]);
        expect(provenanceCalls).toBe(0);
        if (condition === 'changed admission') {
          expect(host.observeUsage({ inputTokens: 1, outputTokens: 1, cacheCreationInputTokens: 0, cacheReadInputTokens: 0 })).toBe(true);
          expect(host.reserveRequest({ ...admission, digest: 'b'.repeat(64) })).toBe(true);
        }
      } finally { releaseSample(condition === 'changed admission'); await refusal; }
      expect(provenanceCalls).toBe(0);
      expect(f.committed).toEqual([]);
      expect(runtime.summary().audit.captured['tool-receipt']).toBe(0);
      expect(f.failures).toEqual(['provenance-unavailable']);
    } finally { await runtime.stop(); }
  });
  it('refuses protected product reads if the checked tool admission changes during the sample', async () => {
    let announceWait!: () => void, releaseSample!: (current: boolean) => void;
    const waiting = new Promise<void>(resolve => { announceWait = resolve; });
    const held = new Promise<boolean>(resolve => { releaseSample = resolve; });
    const f = await runtimeFixture(undefined, async role => {
      if (role !== 'author') return true;
      announceWait();
      return held;
    });
    let reads = 0;
    const runtime = await f.start({ ...f.options, runDossier: () => async (_argv, _stdin, _review, awaitProductRead) => {
      if (awaitProductRead === undefined || !(await awaitProductRead())) throw new Error('own product read refused');
      reads++;
      return { stdout: '', stderr: '', exit: 0 };
    } });
    try {
      const host = f.captured.get('author')!;
      const admission = { digest: 'a'.repeat(64), bytes: 100, classes: ['code-structure'] as const, originIds: ['origin:own-request'] };
      expect(host.reserveRequest(admission)).toBe(true);
      const running = host.tools.runDossier!(['dossier', 'check', f.options.run], null);
      const refused = expect(running).rejects.toThrow('own product read refused');
      void refused.catch(() => {});
      try {
        await Promise.race([waiting, running]);
        expect(reads).toBe(0);
        expect(host.observeUsage({ inputTokens: 1, outputTokens: 1, cacheCreationInputTokens: 0, cacheReadInputTokens: 0 })).toBe(true);
        expect(host.reserveRequest({ ...admission, digest: 'b'.repeat(64) })).toBe(true);
      } finally { releaseSample(true); await refused; }
      expect(reads).toBe(0);
    } finally { await runtime.stop(); }
  });
  it('refuses host health lost while the external authority check is awaiting', async () => {
    let healthy = true, authority: () => boolean | Promise<boolean> = () => true;
    const f = await runtimeFixture(undefined, undefined, () => healthy);
    const runtime = await f.start({ ...f.options, current: () => authority() });
    let entered!: () => void, release!: (value: boolean) => void;
    const checking = new Promise<void>(resolve => { entered = resolve; });
    const held = new Promise<boolean>(resolve => { release = resolve; });
    try {
      authority = () => { entered(); return held; };
      const pending = runtime.current();
      await checking;
      healthy = false; release(true);
      expect(await pending).toBe(false);
      expect(f.failures).toEqual(['transport-unavailable']);
      expect(runtime.summary().failure).toBe('transport-unavailable');
    } finally { release(true); await runtime.stop(); }
  });

  it('consumes one shared request budget across different roles without refunding an uncertain attempt', async () => {
    const f = await runtimeFixture(), runtime = await f.start({ ...f.options, record: { ...f.options.record,
      declared: { ...f.options.record.declared, agentTurnBudget: 1 } } });
    const admission = { digest: 'a'.repeat(64), bytes: 100, classes: ['code-structure'] as const, originIds: ['origin:own-request'] };
    expect(f.captured.get('author')!.reserveRequest(admission)).toBe(true);
    expect(f.captured.get('inventory')!.reserveRequest(admission)).toBe(false);
    expect(await runtime.current()).toBe(false); const result = await runtime.stop();
    expect(result.budget).toMatchObject({ state: 'stopped', reason: 'turn-budget', requestReservations: 1,
      completeUsageReports: 0, reportedTokens: 'Unknown', pendingRoles: ['author'] });
  });
  it('a later preparation failure closes earlier owned processes and host credentials without launching the failed role', async () => {
    const f = await runtimeFixture('inventory'); await expect(f.start(f.options)).rejects.toThrow('url-run-sessions-unavailable');
    expect(f.calls).toContain('stop:author'); expect(f.calls).not.toContain('host:inventory'); expect(f.calls).not.toContain('launch:inventory');
    expect(f.credentialClosed()).toBe(true); expect(f.failures).toEqual(['launch-unavailable']);
  });
  it('commits captured helper start history before the next role and closes owned processes on registration refusal', async () => {
    let beginWaiting!: () => void, releaseSample!: () => void;
    const waiting = new Promise<void>(resolve => { beginWaiting = resolve; });
    const held = new Promise<void>(resolve => { releaseSample = resolve; });
    const checked: ViewRole[] = [];
    const f = await runtimeFixture(undefined, async role => {
      checked.push(role);
      if (role === 'author') { beginWaiting(); await held; }
      return true;
    });
    const { run, record } = f.options;
    await writeFile(path.join(run, 'run.json'), encodeRunRecord(record.declared, record.subject), { mode: 0o600 });
    for (const name of ['inventory', 'reviews']) await mkdir(path.join(run, name), { mode: 0o700 });
    const prompt = 'Own compatible helper prompt';
    const promptSha256 = sha256(prompt);
    const helpers = ['inventory', 'fidelity', 'design'] as const;
    for (const role of helpers) {
      const inventory = role === 'inventory';
      const file = inventory ? 'inventory/session-1.json' : `reviews/${role}-session-1.json`;
      await writeFile(path.join(run, file), JSON.stringify({ format: 'polaris-dossier-session-prompt/2',
        role: inventory ? 'inventory' : 'review', ...(inventory ? {} : { kind: role }), runId: path.basename(run), session: 1,
        pinnedRevision: record.subject.pinnedRevision.commit, directory: path.relative(path.dirname(run), f.options.sessionDirectories[role]),
        prompt, promptSha256 }), { mode: 0o600 });
    }
    const registered: string[] = [];
    let registerCalls = 0;
    const starting = f.start({ ...f.options, launchHistory: { promptDigests: { inventory: promptSha256, fidelity: promptSha256, design: promptSha256 },
      register: async (capability, waitForSamples) => {
        registerCalls++;
        expect(await waitForSamples()).toBe(true);
        const { history } = inspectCommittedUrlLaunchHistory(capability);
        registered.push(history.role);
        expect(f.calls.at(-1)).toBe(`launch:${history.role}`);
        const report = JSON.parse(Buffer.from(history.bytes).toString('utf8'));
        expect(report).toMatchObject({ label: 'Inferred', form: { value: 'syzygy-launched', label: 'Inferred' },
          capture: { pid: 1000 + URL_ROLES.indexOf(history.role), label: 'Inferred' } });
        if (history.role === 'fidelity') throw new Error('owned registration refusal');
      } } });
    const refusal = expect(starting).rejects.toThrow('url-run-sessions-unavailable');
    try {
      await Promise.race([waiting, starting]);
      expect(checked).toEqual(['author', 'inventory']);
      expect(f.calls.at(-1)).toBe('launch:inventory');
      expect(registerCalls).toBe(0);
    } finally { releaseSample(); await refusal; }
    expect(registered).toEqual(['inventory', 'fidelity']);
    expect(f.calls).toContain('stop:fidelity');
    expect(f.calls).not.toContain('launch:design');
    expect(f.credentialClosed()).toBe(true);
    expect(f.failures).toEqual(['provenance-unavailable']);
  });
});
