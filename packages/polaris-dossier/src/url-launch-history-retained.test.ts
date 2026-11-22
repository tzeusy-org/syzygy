import * as fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { sha256 } from '@syzygy/support';
import { policyFixture } from './full-run.testkit.js';
import { parseRunConfig } from './run-config.js';
import { DOSSIER_CONTENT_CLASSES, encodeRunRecord, NO_WORK_ITEM_REASON } from './run-record.js';
import { buildDossierScreen } from './screen.js';
import { URL_CLI_PROGRAM, URL_LAUNCH_LIMITS } from './session-launch.js';
import { createUrlRunDeclaration, URL_ORIGIN_POLICY_PATH, URL_PROFILE_ID, URL_ROLES, urlSourceTransportIdentity } from './url-run-record.js';
import { isVerifiedRetainedUrlLaunchHistory, verifyRetainedUrlLaunchHistory,
  type UrlLaunchHistoryRole, type UrlRetainedLaunchHistoryOptions } from './url-launch-history.js';
import { verifyUrlSessionAuditHistory, type UrlSessionAuditHistoryExpected } from './url-session-audit-history.js';
import { URL_SESSION_AUDIT_FORMAT, URL_SESSION_AUDIT_LIMITS, type UrlSessionAuditScope } from './url-session-audit.js';

const PROMPT = 'Own previously issued compatible prompt.';
const PIN = 'c'.repeat(40);
const RUN = `run-${'d'.repeat(32)}`;
const REFUSED = /^url-launch-history-unavailable$/u;
const canonical = (value: unknown): string => encodeCanonicalJson(value, { maxBytes: 2_097_152, maxNodes: 65_536, maxDepth: 32 }) + '\n';
const paths = {
  inventory: 'inventory/session-1', fidelity: 'reviews/fidelity-session-1', design: 'reviews/design-session-1',
} as const;

function fixture(role: UrlLaunchHistoryRole = 'inventory') {
  const root = fs.realpathSync(tempDir('retained-url-launch-')), run = path.join(root, RUN);
  fs.mkdirSync(run, { mode: 0o700 });
  const policy = policyFixture(), screen = buildDossierScreen(policy.bytes, true, null, 'private');
  const config = parseRunConfig(JSON.stringify({ operator: 'own-operator', agentTool: 'claude-code', agentToolVersion: '2.1.327', agentProvider: 'anthropic',
    model: 'claude-sonnet-4-6', deadline: 'PT1H', agentTurnBudget: 20, maxRepairCycles: 2, maxQuestions: 1, audience: 'own readers', operatorIsOwner: false }));
  const locator = urlSourceTransportIdentity('https://example.invalid/team/project');
  if (!screen.ok || !config.ok || !locator.ok) throw new Error('Retained launch fixture refused.');
  const core = encodeRunRecord(config.config, {
    repository: { url: 'example.invalid/team/project', repositoryId: 'team-project', role: 'observed-source' },
    clone: { path: path.join(root, 'unused-source'), declaredBy: 'operator', label: 'Inferred', use: 'read' },
    pinnedRevision: { commit: PIN, label: 'own fixture pin', pinnedAt: '2026-10-07T12:00:00.000Z' },
    screeningPolicy: policy.binding, contentClasses: DOSSIER_CONTENT_CLASSES,
    visibility: { value: 'private', source: 'conservative-default', declaredBy: 'own fixture', label: 'Inferred' },
    governed: { kind: 'unstated', because: ['own fixture'] }, workItem: { identity: null, reason: NO_WORK_ITEM_REASON },
  });
  const hash = (description: string): string => sha256(`own pinned fixture ${description}`);
  const roles = URL_ROLES.map((name, index) => ({
    role: name, sessionId: `0000000${index}-0000-4000-8000-000000000000`, profileId: URL_PROFILE_ID,
    compiledProfileSha256: hash(name + ' profile'), commandSha256: hash(name + ' command'), instructionSha256: hash(name + ' instructions'),
    viewSha256: hash(name + ' view'), scaffoldSha256: hash(name + ' scaffold'), mcpSha256: hash(name + ' mcp'),
    configurationSha256: hash(name + ' config'), executableSha256: URL_CLI_PROGRAM.sha256, inputPacketSha256: hash('packet'),
    inputOriginId: 'origin:packet', capture: { pid: 'Unknown', startedAt: 'Unknown', finishedAt: 'Unknown', outcome: 'Unknown' } as const,
  }));
  const sidecar = createUrlRunDeclaration(core, { runId: RUN,
    originPolicy: { path: URL_ORIGIN_POLICY_PATH, commit: PIN, policyId: 'POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1', policyVersion: '1.0.0', sha256: hash('policy') },
    inference: { provider: 'anthropic', tool: 'claude-code', toolVersion: '2.1.327', model: 'claude-sonnet-4-6', modelSelection: 'supported-default',
      profile: { id: URL_PROFILE_ID, sha256: hash('registry') } },
    sourceTransport: { originalLocator: locator.originalLocator, destination: locator.destination, providerId: locator.providerId,
      acquisitionId: 'acq-0123456789abcdef0123456789abcdef', metadataClasses: ['code-structure'], selectionOrigin: 'validated-destination-before-acquisition',
      commandSha256: hash('source command'), protocolSha256: hash('protocol'), configurationSha256: hash('source config'),
      executableSha256: hash('source executable'), environmentSha256: hash('environment') },
    plannedOrigins: [
      { id: 'origin:metadata', species: 'structural-source-and-tool-metadata', sha256: hash('metadata'), classes: ['code-structure'], originIds: [] },
      { id: 'origin:scaffold', species: 'fixed-role-policy-and-cli-scaffold', sha256: hash('scaffold'), classes: ['governance-text'], originIds: [] },
      { id: 'origin:body', species: 'pinned-repository-body', sha256: hash('body'), classes: ['code-content'], originIds: [] },
      { id: 'origin:packet', species: 'composed-role-input-or-broker-result', sha256: hash('packet'),
        classes: ['code-content', 'code-structure', 'derived-composites', 'governance-text'], originIds: ['origin:metadata', 'origin:scaffold', 'origin:body'] },
    ], roles, protectedAudit: `url-audit:${RUN}` }, { runId: RUN });
  if (!sidecar.ok) throw new Error(`Retained declaration fixture refused (${sidecar.code}).`);
  const declaration = roles.find(item => item.role === role)!;
  const roleFields = role === 'inventory' ? { role: 'inventory' } : { role: 'review', kind: role };
  const directory = `${run}.sessions/${role === 'inventory' ? 'session' : role}-1`;
  const executable = path.join(root, 'never-opened', 'claude');
  const prompt = { format: 'polaris-dossier-session-prompt/2', runId: RUN, ...roleFields, session: 1, pinnedRevision: PIN,
    directory: path.relative(root, directory), prompt: PROMPT, promptSha256: sha256(PROMPT), mode: 'waiting', label: 'Inferred' };
  const launch = {
    format: 'polaris-dossier-url-launch-history/1', runId: RUN, ...roleFields, session: 1,
    form: { value: 'syzygy-launched', declaredBy: 'syzygy', label: 'Inferred' }, promptSha256: sha256(PROMPT),
    actualInputPacketSha256: declaration.inputPacketSha256, sessionId: declaration.sessionId,
    binding: { run: RUN, role, sourceBinding: sidecar.declaration.sourceBindingSha256, policy: policy.binding.sha256,
      provider: 'anthropic', model: 'claude-sonnet-4-6' },
    executable, executableSha256: declaration.executableSha256, commandSha256: declaration.commandSha256,
    instructionSha256: declaration.instructionSha256, viewSha256: declaration.viewSha256, compiledProfileSha256: declaration.compiledProfileSha256,
    scaffoldSha256: declaration.scaffoldSha256, mcpSha256: declaration.mcpSha256, configurationSha256: declaration.configurationSha256, directory,
    capture: { pid: 4321, startedAt: '2026-10-07T12:00:01.000Z', unknownReason: null, label: 'Inferred' }, label: 'Inferred',
  };
  const file = `${paths[role]}.launch.json`, promptFile = path.join(run, `${paths[role]}.json`), launchFile = path.join(run, file);
  fs.mkdirSync(path.dirname(launchFile), { mode: 0o700 });
  const cores = { core: path.join(run, 'run.json'), declaration: path.join(run, 'url-declaration.json'), launch: launchFile, prompt: promptFile };
  const promptText = JSON.stringify(prompt, null, 2) + '\n', launchText = canonical(launch);
  for (const [name, text] of [[cores.core, core], [cores.declaration, sidecar.text], [cores.prompt, promptText], [cores.launch, launchText]] as const)
    fs.writeFileSync(name, text, { mode: 0o600 });
  const input: UrlRetainedLaunchHistoryOptions = { run, runId: RUN, role, executable, coreSha256: sha256(core),
    declarationSha256: sidecar.sha256, pin: PIN, roleDeclaration: declaration, screen: screen.screen, current: () => true,
    expected: { file, recordSha256: sha256(launchText), recordBytes: Buffer.byteLength(launchText),
      promptRecordSha256: sha256(promptText), promptSha256: sha256(PROMPT), sessionId: declaration.sessionId } };
  const replaceLaunch = (text: string): UrlRetainedLaunchHistoryOptions => {
    fs.writeFileSync(launchFile, text);
    return { ...input, expected: { ...input.expected, recordSha256: sha256(text), recordBytes: Buffer.byteLength(text) } };
  };
  const replacePrompt = (text: string): UrlRetainedLaunchHistoryOptions => {
    fs.writeFileSync(promptFile, text);
    return { ...input, expected: { ...input.expected, promptRecordSha256: sha256(text) } };
  };
  return { input, cores, launch, prompt, replaceLaunch, replacePrompt };
}

describe('retained URL helper launch history', () => {
  it.each(['inventory', 'fidelity', 'design'] as const)('verifies only metadata for the %s role without a writer or a current grant', async role => {
    const f = fixture(role);
    const before = Object.values(f.cores).map(file => fs.readFileSync(file));
    const { recordSha256, promptRecordSha256, promptSha256, sessionId } = f.input.expected;
    const verified = await verifyRetainedUrlLaunchHistory(f.input);
    expect(isVerifiedRetainedUrlLaunchHistory(verified)).toBe(true);
    expect(isVerifiedRetainedUrlLaunchHistory({ ...verified })).toBe(false);
    expect(verified).toEqual({
      role, sessionId, recordSha256, promptRecordSha256, promptSha256, pin: PIN, runId: RUN, authorization: 'none', replay: 'forbidden',
      sourceBindingSha256: f.launch.binding.sourceBinding, policySha256: f.launch.binding.policy,
    });
    expect(Object.values(f.cores).map(file => fs.readFileSync(file))).toEqual(before);
    expect(fs.existsSync(f.input.executable)).toBe(false);
  });

  it('joins the exact independently anchored helper row and retained files without granting recovery', async () => {
    const f = fixture(), { role, run, runId, coreSha256, declarationSha256, roleDeclaration, executable, screen } = f.input;
    const parent = path.join(path.dirname(run), 'owned-audit');
    fs.mkdirSync(parent, { mode: 0o700 });
    let sequence = 0, globalTip: string | null = null, durableBytes = 0;
    const declarations = {} as Record<typeof URL_ROLES[number], UrlSessionAuditHistoryExpected['declarations']['inventory']>;
    const roleAnchors = {} as Record<typeof URL_ROLES[number], UrlSessionAuditHistoryExpected['roles']['inventory']>;
    for (const name of URL_ROLES) {
      const scope: UrlSessionAuditScope = { binding: { ...f.launch.binding, role: name }, originPolicySha256: '1'.repeat(64),
        profileSha256: name === role ? roleDeclaration.compiledProfileSha256 : '2'.repeat(64) };
      const payload = { project: 'project:own', pin: PIN, principal: 'own-operator', declaredClasses: ['code-structure'],
        profile: 'own-fixture-profile', limits: URL_SESSION_AUDIT_LIMITS, capture: 'host-callbacks-only',
        providerReceipts: 'Unknown', nativeSendCensus: 'Unknown' } as const;
      declarations[name] = { scope, payload };
      const lines: string[] = [];
      let roleTip: string | null = null;
      const append = (kind: string, fields: unknown) => {
        const body = { format: URL_SESSION_AUDIT_FORMAT, sequence: ++sequence, roleSequence: lines.length + 1,
          previousSha256: globalTip, previousRoleSha256: roleTip, event: { kind, role: name, scope, payload: fields } };
        const digest = sha256(canonical(body).slice(0, -1));
        globalTip = roleTip = digest;
        lines.push(canonical({ ...body, sha256: digest }));
      };
      append('declaration', payload);
      if (name === role) {
        append('launch-attempt', { event: 'session-launch-attempt', profileSha256: scope.profileSha256,
          commandSha256: roleDeclaration.commandSha256, viewSha256: roleDeclaration.viewSha256, limits: URL_LAUNCH_LIMITS });
        append('launch-history', f.input.expected);
        append('launch-terminal', { outcome: 'stopped', viewTermination: 'view-exited', groupTermination: 'confirmed',
          toolTermination: 'settled', pendingInvocations: 0 });
      }
      const bytes = Buffer.from(lines.join(''));
      fs.writeFileSync(path.join(parent, `own-${name}.jsonl`), bytes, { mode: 0o600 });
      if (!roleTip) throw new Error('owned role anchor missing');
      roleAnchors[name] = { records: lines.length, bytes: bytes.length, tipSha256: roleTip };
      durableBytes += bytes.length;
    }
    if (!globalTip) throw new Error('owned global anchor missing');
    const expected = { durableRecords: sequence, durableBytes, tipSha256: globalTip, roles: roleAnchors, declarations };
    const options = { parent, name: 'own', expected, current: () => true };
    expect(await verifyUrlSessionAuditHistory(options)).toBeNull();
    const subject = { run, runId, coreSha256, declarationSha256, roleDeclaration, executable, screen };
    const retainedLaunches = { [role]: subject };
    expect(await verifyUrlSessionAuditHistory({ ...options, retainedLaunches })).toMatchObject({ capturedHelperLaunches: 1,
      capturedLaunchTerminals: 1, authorization: 'none', replay: 'forbidden', completeness: 'Unknown' });
    expect(await verifyUrlSessionAuditHistory({ ...options, retainedLaunches: { [role]: { ...subject,
      roleDeclaration: { ...roleDeclaration, commandSha256: '0'.repeat(64) } } } })).toBeNull();
    fs.appendFileSync(f.cores.prompt, ' ');
    expect(await verifyUrlSessionAuditHistory({ ...options, retainedLaunches })).toBeNull();
  });

  it('refuses substituted protected payload fields and independently pinned subjects', async () => {
    const { input } = fixture();
    const other = 'a'.repeat(64);
    for (const patch of [{ file: 'reviews/design-session-1.launch.json' }, { recordBytes: input.expected.recordBytes + 1 },
      { recordSha256: other }, { promptRecordSha256: other }, { promptSha256: other }, { sessionId: '00000003-0000-4000-8000-000000000000' }]) {
      await expect(verifyRetainedUrlLaunchHistory({ ...input, expected: { ...input.expected, ...patch } })).rejects.toThrow(REFUSED);
    }
    for (const patch of [{ coreSha256: other }, { declarationSha256: other }, { pin: 'a'.repeat(40) },
      { roleDeclaration: { ...input.roleDeclaration, commandSha256: other } }]) {
      await expect(verifyRetainedUrlLaunchHistory({ ...input, ...patch })).rejects.toThrow(REFUSED);
    }
  });

  it('checks the complete canonical launch shape and independent role configuration even with matching audit bytes', async () => {
    const f = fixture('fidelity');
    for (const patch of [{ ...f.launch, extra: 'Own extra field' }, { ...f.launch, commandSha256: 'a'.repeat(64) },
      { ...f.launch, executable: '/wherever/claude' }, { ...f.launch, kind: 'design' },
      { ...f.launch, binding: { ...f.launch.binding, model: 'default' } },
      { ...f.launch, capture: { ...f.launch.capture, startedAt: '2026-10-07T12:00:01Z' } }]) {
      await expect(verifyRetainedUrlLaunchHistory(f.replaceLaunch(canonical(patch)))).rejects.toThrow(REFUSED);
    }
    await expect(verifyRetainedUrlLaunchHistory(f.replaceLaunch(JSON.stringify(f.launch)))).rejects.toThrow(REFUSED);
  });

  it('checks the compatible prompt subject and refuses unscreenable bodies with a fixed error', async () => {
    const f = fixture('design');
    for (const patch of [{ pinnedRevision: 'a'.repeat(40) }, { kind: 'fidelity' }, { runId: `run-${'a'.repeat(32)}` },
      { directory: 'another-session' }, { prompt: 'Own replaced compatible prompt.' }, { session: 2 }, { extra: 'Own extra field' }]) {
      await expect(verifyRetainedUrlLaunchHistory(f.replacePrompt(JSON.stringify({ ...f.prompt, ...patch })))).rejects.toThrow(REFUSED);
    }
    const retained = f.replacePrompt(JSON.stringify(f.prompt));
    await expect(verifyRetainedUrlLaunchHistory({ ...retained,
      screen: { ...retained.screen, screenSecrets: text => text.includes(PROMPT) ? 'secret-detector-match' : undefined } })).rejects.toThrow(REFUSED);
  });

  it.each(['launch', 'prompt', 'declaration'] as const)('refuses a same-byte %s replacement at the currentness boundary', async name => {
    const f = fixture(), target = f.cores[name], bytes = fs.readFileSync(target);
    let calls = 0;
    await expect(verifyRetainedUrlLaunchHistory({ ...f.input, current: async () => {
      if (++calls === 2) { fs.renameSync(target, target + '.previous'); fs.writeFileSync(target, bytes, { mode: 0o600 }); }
      return true;
    } })).rejects.toThrow(REFUSED);
    expect(calls).toBe(2);
  });

  it('refuses lost currentness and symlinked, nonprivate or oversized launch files', async () => {
    const f = fixture();
    for (const allowed of [0, 1]) {
      let calls = 0;
      await expect(verifyRetainedUrlLaunchHistory({ ...f.input, current: () => ++calls <= allowed })).rejects.toThrow(REFUSED);
    }
    fs.chmodSync(f.cores.launch, 0o640);
    await expect(verifyRetainedUrlLaunchHistory(f.input)).rejects.toThrow(REFUSED);
    fs.renameSync(f.cores.launch, f.cores.launch + '.original');
    fs.symlinkSync(f.cores.launch + '.original', f.cores.launch);
    await expect(verifyRetainedUrlLaunchHistory(f.input)).rejects.toThrow(REFUSED);
    fs.unlinkSync(f.cores.launch);
    fs.writeFileSync(f.cores.launch, Buffer.alloc(2_097_153), { mode: 0o600 });
    await expect(verifyRetainedUrlLaunchHistory(f.input)).rejects.toThrow(REFUSED);
  });
});
