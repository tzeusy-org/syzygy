import { mkdtemp, mkdir, readFile, readdir, realpath, rm, writeFile, lstat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { sha256 } from '@syzygy/support';
import { policyFixture } from './full-run.testkit.js';
import { parseRunConfig } from './run-config.js';
import { DOSSIER_CONTENT_CLASSES, NO_WORK_ITEM_REASON, recordRunConfig } from './run-record.js';
import { buildDossierScreen } from './screen.js';
import { isOrderedDesignSessionProfile } from './session-profile.js';
import { screenOrderedDesignInitialRequest } from './session-egress-policy.js';
import { createSessionController } from './session-controller.js';
import { URL_CLI_PROGRAM } from './session-launch.js';
import { URL_ROLES } from './url-run-record.js';
import { isPreparedUrlRolePlan, prepareUrlRolePlans, type UrlRolePlanningOptions } from './url-role-plan.js';

const cleanup: string[] = [];
afterEach(async () => { for (const root of cleanup.splice(0)) await rm(root, { recursive: true, force: true }); });
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'urp-')); cleanup.push(root);
  const run = path.join(root, 'own-run'), parent = path.join(root, 'views'), hidden = path.join(root, 'protected'), support = path.join(root, 'support');
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
    sessionDirectories: { author: run, inventory: path.join(root, 'inventory'), fidelity: path.join(root, 'fidelity'), design: path.join(root, 'design') },
    cliExecutable: await realpath(path.join(os.homedir(), '.local/share/claude/versions', URL_CLI_PROGRAM.version)), parent,
    protectedPaths: [run, hidden], canaries, current: () => true, audit: () => { throw new Error('planning may not launch a CLI'); }, now: Date.now(),
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
      const { tool_choice: _projected, ...baseline } = plan.profile.baseline;
      const request = Buffer.from(JSON.stringify({ ...baseline, metadata: { user_id: JSON.stringify({ device_id: '0'.repeat(64), account_uuid: '', session_id: plan.profile.input.sessionId }) }, messages: [plan.profile.initialMessage] }));
      if (isOrderedDesignSessionProfile(plan.profile)) {
        expect(plan.role).toBe('design');
        expect(screenOrderedDesignInitialRequest(request, plan.profile, { scanSecrets: () => false, scanDesignView: () => false }).ok).toBe(true);
        expect(sha256(await readFile(path.join(plan.view.supportDirectory, 'session-mcp.js')))).toBe(plan.profile.transcript.supportSha256['session-mcp.js']);
      } else {
        expect(plan.role).not.toBe('design');
        const controller = createSessionController({ profile: plan.profile, initialOrigin: plan.initialOrigin,
          declaredClasses: ['governance-text', 'code-structure', 'work-history', 'derived-composites'], scanSecrets: () => false, validateToolInput: () => false });
        expect(controller.request(request).ok).toBe(true);
      }
      for (const other of result.roles.filter(other => other !== plan)) expect(plan.view.protectedPaths).toContain(other.view.workDirectory);
    }
    expect(await readdir(result.viewRoot)).toEqual(expect.arrayContaining([...URL_ROLES, 'support']));
    expect(await readdir(f.options.run)).toEqual([]);
  }, 30_000);
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
