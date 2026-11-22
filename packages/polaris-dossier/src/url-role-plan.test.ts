import { mkdtemp, mkdir, readFile, readdir, realpath, rm, writeFile, lstat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { sha256 } from '@syzygy/support';
import { makeClone, policyFixture } from './full-run.testkit.js';
import { parseRunConfig } from './run-config.js';
import { DOSSIER_CONTENT_CLASSES, NO_WORK_ITEM_REASON, recordRunConfig, encodeRunRecord } from './run-record.js';
import { buildDossierScreen } from './screen.js';
import { createSessionProfile, isOrderedDesignSessionProfile } from './session-profile.js';
import { screenOrderedDesignInitialRequest } from './session-egress-policy.js';
import { createSessionController } from './session-controller.js';
import { URL_CLI_PROGRAM } from './session-launch.js';
import { URL_ROLES, URL_ORIGIN_POLICY_PATH, URL_PROFILE_ID, createUrlRunDeclaration, urlSourceTransportIdentity } from './url-run-record.js';
import { createUrlRunOrigins } from './url-run-origins.js';
import { captureUrlRolePlans, restoreUrlRolePlans, isPreparedUrlRolePlan, prepareUrlRolePlans, type UrlRolePlanningOptions } from './url-role-plan.js';

const cleanup: string[] = [];
afterEach(async () => { for (const root of cleanup.splice(0)) await rm(root, { recursive: true, force: true }); });
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'urp-')); cleanup.push(root);
  const run = path.join(root, 'own-run'), parent = path.join(root, 'views'), hidden = path.join(root, 'protected'), support = path.join(root, 'support');
  for (const directory of [run, parent, hidden, support]) await mkdir(directory, { mode: 0o700 });
  const { clone, commit } = makeClone(root);
  const snapshot = policyFixture(), built = buildDossierScreen(snapshot.bytes, true, null, 'private'); if (!built.ok) throw new Error();
  const config = parseRunConfig(JSON.stringify({ operator: 'own-operator', agentTool: 'claude-code', agentToolVersion: '2.1.327', agentProvider: 'anthropic',
    model: 'claude-sonnet-4-6', deadline: 'PT1H', agentTurnBudget: 20, maxRepairCycles: 2, maxQuestions: 1, audience: 'own readers', operatorIsOwner: false }));
  if (!config.ok) throw new Error();
  const record = recordRunConfig(config.config, { repository: { url: 'example.invalid/own/source', repositoryId: 'own-source', role: 'observed-source' },
    clone: { path: clone, declaredBy: 'operator', label: 'Inferred', use: 'read' },
    pinnedRevision: { commit, label: 'own fixture', pinnedAt: '2026-11-19T00:00:00.000Z' }, screeningPolicy: snapshot.binding,
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
    sessionDirectories: { author: run, inventory: path.join(root, 'inventory'), fidelity: path.join(root, 'fidelity'), design: path.join(root, 'design') },
    cliExecutable: await realpath(path.join(os.homedir(), '.local/share/claude/versions', URL_CLI_PROGRAM.version)), parent,
    protectedPaths: [run, hidden, clone], canaries, current: () => true, audit: () => { throw new Error('planning may not launch a CLI'); }, now: Date.now(),
    runtime: { worker: { node, nodeSha256: sha256(await readFile(node)), bundle: path.join(hidden, 'unused-worker.mjs'), bundleSha256: 'b'.repeat(64) },
      peerProgram: { executable: path.join(hidden, 'unused-peer'), sha256: 'a'.repeat(64) },
      supportDirectory: support, supportSha256: hashes, inputTreeSha256: 'c'.repeat(64), manifestSha256: 'd'.repeat(64), profileRegistrySha256: 'e'.repeat(64) } };
  return { options, root, parent };
}

describe('four restricted URL role plans before the brief', () => {
  it('probes four isolated native views and binds each initial host tool call before any CLI launch', async () => {
    const f = await fixture(), result = await prepareUrlRolePlans(f.options);
    expect(result, JSON.stringify(result)).toMatchObject({ ok: true }); if (!result.ok) return;
    cleanup.push(result.socketRoot);
    expect(result.roles.map(plan => plan.role)).toEqual(['author', 'inventory', 'fidelity', 'design']);
    expect(new Set(result.roles.map(plan => plan.profile.input.sessionId)).size).toBe(4);
    expect(new Set(result.roles.map(plan => plan.declaration.commandSha256)).size).toBe(4);
    for (const plan of result.roles) {
      expect(isPreparedUrlRolePlan(plan)).toBe(true); expect(isPreparedUrlRolePlan({ ...plan })).toBe(false);
      expect(plan.probe).toBe('owned-synthetic-namespace-probe-passed');
      expect(() => { (plan.initialOrigin.classes as string[]).push('code-content'); }).toThrow();
      expect(() => { (plan.initialOrigin.binding as unknown as { provider: string }).provider = 'other'; }).toThrow();
      expect(plan.declaration.compiledProfileSha256).toBe(sha256(plan.profile.canonicalText));
      expect(plan.declaration.inputPacketSha256).toBe(sha256(plan.profile.input.initialPrompt));
      expect(plan.profile.input.initialPrompt).toContain(`Your report sessionId is ${plan.profile.input.sessionId}.`);
      expect(plan.declaration.capture).toEqual({ pid: 'Unknown', startedAt: 'Unknown', finishedAt: 'Unknown', outcome: 'Unknown' });
      expect(plan.profile.input.initialPrompt).toContain(JSON.stringify(['dossier', 'poll', plan.role === 'design' ? path.basename(f.options.run) : f.options.run]));
      if (plan.role !== 'author' && plan.role !== 'design') expect(plan.profile.input.initialPrompt).toContain(JSON.stringify(['dossier', 'await', f.options.sessionDirectories[plan.role]]));
      if (plan.role === 'author') expect(plan.profile.input.initialPrompt).toContain('feedback/REVIEW-verdict-N.json');
      else if (plan.role === 'inventory') expect(plan.profile.input.initialPrompt).toContain('feedback/fidelity-verdict-N.json');
      else expect(plan.profile.input.initialPrompt).toContain('--submit round-N/verdict.json --stdin');
      if (plan.role === 'design') {
        expect(plan.profile.input.initialPrompt).toContain('receive the design-round-prepared manifest');
        expect(plan.profile.input.initialPrompt).toContain('packetSha256 from the manifest');
      }
      for (const directory of [plan.view.homeDirectory, plan.view.workDirectory, plan.view.brokerSocketDirectory, plan.view.relaySocketDirectory]) {
        expect(await readdir(directory)).toEqual([]); expect((await lstat(directory)).mode & 0o777).toBe(0o700);
      }
      const scanSecrets = (text: string) => f.options.screen.screenSecrets(text) !== undefined;
      expect(plan.initialOrigin.id).toBe(`origin:role-input-${URL_ROLES.indexOf(plan.role) + 1}`);
      const ordinary = isOrderedDesignSessionProfile(plan.profile) ? createSessionProfile(plan.profile.input) : { ok: true as const, value: { profile: plan.profile } };
      if (!ordinary.ok) throw new Error('own ordinary receipt compiler unavailable');
      const receiptController = () => createSessionController({ profile: ordinary.value.profile, initialOrigin: plan.initialOrigin,
        declaredClasses: ['governance-text', 'code-structure', 'work-history', 'derived-composites'], scanSecrets, validateToolInput: () => false });
      expect(receiptController).not.toThrow();
      if (plan.role === 'author') {
        expect(() => createSessionController({ profile: ordinary.value.profile, initialOrigin: { ...plan.initialOrigin, id: 'origin:author-initial' },
          declaredClasses: ['governance-text', 'code-structure', 'work-history', 'derived-composites'], scanSecrets, validateToolInput: () => false })).toThrow('invalid-session-controller');
      }
      const excluded = createSessionProfile({ ...plan.profile.input, initialPrompt: 'auth=OWN_SYNTHETIC_CREDENTIAL_123456' });
      if (!excluded.ok) throw new Error('own excluded prompt compiler unavailable');
      expect(() => createSessionController({ profile: excluded.value.profile,
        initialOrigin: { ...plan.initialOrigin, canonicalText: excluded.value.profile.input.initialPrompt },
        declaredClasses: ['governance-text', 'code-structure', 'work-history', 'derived-composites'], scanSecrets, validateToolInput: () => false })).toThrow('invalid-session-controller');
      const { tool_choice: _projected, ...baseline } = plan.profile.baseline;
      const request = Buffer.from(JSON.stringify({ ...baseline, metadata: { user_id: JSON.stringify({ device_id: '0'.repeat(64), account_uuid: '', session_id: plan.profile.input.sessionId }) }, messages: [plan.profile.initialMessage] }));
      if (isOrderedDesignSessionProfile(plan.profile)) {
        expect(plan.role).toBe('design');
        expect(screenOrderedDesignInitialRequest(request, plan.profile, { scanSecrets, scanDesignView: text => f.options.screen.screenBody(text) !== undefined }).ok).toBe(true);
        expect(sha256(await readFile(path.join(plan.view.supportDirectory, 'session-mcp.js')))).toBe(plan.profile.transcript.supportSha256['session-mcp.js']);
      } else {
        expect(plan.role).not.toBe('design');
        const controller = createSessionController({ profile: plan.profile, initialOrigin: plan.initialOrigin,
          declaredClasses: ['governance-text', 'code-structure', 'work-history', 'derived-composites'], scanSecrets, validateToolInput: () => false });
        expect(controller.request(request).ok).toBe(true);
      }
      for (const other of result.roles.filter(other => other !== plan)) expect(plan.view.protectedPaths).toContain(other.view.workDirectory);
    }
    const originBytes = await readFile(new URL(`../../../${URL_ORIGIN_POLICY_PATH}`, import.meta.url));
    const originDoc = JSON.parse(originBytes.toString()) as { policyId: string; policyVersion: string };
    const originPolicy = { bytes: originBytes, binding: { path: URL_ORIGIN_POLICY_PATH, commit: 'a'.repeat(40),
      policyId: originDoc.policyId, policyVersion: originDoc.policyVersion, sha256: sha256(originBytes) } };
    const origins = await createUrlRunOrigins({ runId: path.basename(f.options.run), record: f.options.record, screen: f.options.screen,
      basePolicyBytes: policyFixture().bytes, originPolicy, current: () => true, roles: result.roles });
    const identity = urlSourceTransportIdentity('https://example.invalid/own/source');
    if (!identity.ok) throw new Error('own source identity unavailable');
    const digest = sha256('own source selection');
    const sourceTransport = { originalLocator: identity.originalLocator, destination: identity.destination, providerId: identity.providerId,
      acquisitionId: 'acq-0123456789abcdef0123456789abcdef', metadataClasses: ['code-structure'] as const,
      selectionOrigin: 'validated-destination-before-acquisition' as const, commandSha256: digest, protocolSha256: digest,
      configurationSha256: digest, executableSha256: digest, environmentSha256: digest };
    const declaration = createUrlRunDeclaration(encodeRunRecord(f.options.record.declared, f.options.record.subject), { runId: path.basename(f.options.run), originPolicy: originPolicy.binding,
      sourceTransport, inference: { provider: 'anthropic', tool: 'claude-code', toolVersion: URL_CLI_PROGRAM.version, model: 'claude-sonnet-4-6',
        modelSelection: 'supported-default', profile: { id: URL_PROFILE_ID, sha256: f.options.runtime.profileRegistrySha256 } },
      roles: result.roles.map(plan => plan.declaration), plannedOrigins: origins.plannedOrigins, protectedAudit: 'url-audit:own-run' },
    { runId: path.basename(f.options.run), expectedBasePolicy: f.options.record.subject.screeningPolicy, expectedOriginPolicy: originPolicy.binding,
      expectedSourceTransport: sourceTransport, expectedProfileSha256: f.options.runtime.profileRegistrySha256 });
    expect(declaration, JSON.stringify(declaration)).toMatchObject({ ok: true });
    expect(await readdir(result.viewRoot)).toEqual(expect.arrayContaining([...URL_ROLES, 'support']));
    expect(await readdir(f.options.run)).toEqual([]);
  }, 30_000);
  it('restores exact declared logical profiles in fresh native views without replacing retained bytes', async () => {
    const f = await fixture(), made = await prepareUrlRolePlans(f.options);
    if (!made.ok) throw new Error('own role preparation unavailable');
    cleanup.push(made.socketRoot);
    const retained = captureUrlRolePlans(made.roles), declarations = made.roles.map(plan => plan.declaration);
    expect(() => captureUrlRolePlans(made.roles.map(plan => ({ ...plan })))).toThrow('url-role-plan-unavailable');
    for (const plan of made.roles) await writeFile(path.join(plan.view.homeDirectory, 'retained-marker'), 'original private view');
    const restore = { run: f.options.run, record: f.options.record, screen: f.options.screen, runtime: f.options.runtime,
      retained, declarations, generation: 'a'.repeat(32), sessionDirectories: f.options.sessionDirectories,
      canaries: f.options.canaries, current: () => true };
    expect(await restoreUrlRolePlans({ ...restore, retained: retained.map((plan, index) => index === 3
      ? { ...plan, input: { ...plan.input, sessionId: '00000000-0000-4000-8000-000000000000' } } : plan) })).toBeNull();
    for (const plan of made.roles) expect(await readFile(path.join(plan.view.homeDirectory, 'retained-marker'), 'utf8')).toBe('original private view');
    // A pre-existing generation target must survive an attempted recovery.
    const archive = `${made.roles[0]!.view.homeDirectory}.retired-${restore.generation}`;
    await mkdir(archive, { mode: 0o700 });
    expect(await restoreUrlRolePlans(restore)).toBeNull();
    expect(await lstat(archive)).toMatchObject({});
    await rm(archive, { recursive: true });
    const restored = await restoreUrlRolePlans(restore);
    expect(restored?.map(plan => plan.declaration)).toEqual(declarations);
    for (const [index, plan] of (restored ?? []).entries()) {
      expect(isPreparedUrlRolePlan(plan)).toBe(true);
      expect(plan.profile.digest).toBe(made.roles[index]!.profile.digest);
      expect(plan.profile.input.sessionId).toBe(made.roles[index]!.profile.input.sessionId);
      expect(await readdir(plan.view.homeDirectory)).toEqual([]);
      expect(await readFile(path.join(`${plan.view.homeDirectory}.retired-${restore.generation}`, 'retained-marker'), 'utf8')).toBe('original private view');
    }
    expect(restored).toHaveLength(4);
    expect(await restoreUrlRolePlans(restore)).toBeNull();
  }, 45_000);
  it('refuses withdrawn current binding and excluded metadata with no retained view or role launch', async () => {
    const f = await fixture(); let calls = 0;
    expect(await prepareUrlRolePlans({ ...f.options, current: () => ++calls < 2 }))
      .toEqual({ ok: false, code: 'url-role-plan-unavailable', stage: 'namespace-probe', cleanup: 'removed', retainedPaths: [] });
    expect(await readdir(f.parent)).toEqual([]);
    expect(await prepareUrlRolePlans({ ...f.options, canaries: [...f.options.canaries, path.join(f.root, '<script>')] }))
      .toEqual({ ok: false, code: 'url-role-plan-unavailable', stage: 'input', cleanup: 'removed', retainedPaths: [] });
    expect(await readdir(f.parent)).toEqual([]); expect(await readdir(f.options.run)).toEqual([]);
  }, 30_000);
});
