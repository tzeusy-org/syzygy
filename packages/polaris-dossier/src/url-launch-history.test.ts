import * as fs from 'node:fs';
import { mkdtemp, mkdir, open, readFile, realpath, rm, writeFile, type FileHandle } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { planOrderedDesignBytes, type OrderedDesignPlan } from './url-design-delivery.js';
import { isOrderedDesignSessionProfile, sessionProfileReminderText } from './session-profile.js';
import type { OrderedDesignAuditWriter } from './url-ordered-design-writer.js';
import type { OrderedDesignAuditReference } from './url-ordered-design-audit.js';
import { sha256 } from '@syzygy/support';
import { policyFixture } from './full-run.testkit.js';
import { parseRunConfig } from './run-config.js';
import { DOSSIER_CONTENT_CLASSES, NO_WORK_ITEM_REASON, recordRunConfig, readRunRecord, encodeRunRecord } from './run-record.js';
import { buildDossierScreen } from './screen.js';
import { URL_CLI_PROGRAM } from './session-launch.js';
import { prepareUrlRolePlans, prepareHistoricalUrlRolePlansTestPort, type UrlRolePlanningOptions, type UrlRolePlan } from './url-role-plan.js';
import { inspectUrlLaunchHistory, URL_HELPER_LAUNCH_FILES, writeUrlLaunchHistory, type UrlLaunchHistoryRole } from './url-launch-history.js';
import { assertUrlDesignDeliveryViewCurrent, assertUrlDesignReviewProofCurrent, createUrlSessionAudit,
  inspectCommittedUrlLaunchHistory, isIssuedUrlDesignDeliveryView } from './url-session-audit.js';
import * as sessionAudit from './url-session-audit.js';
import * as designProduct from './url-design-product.js';
import { URL_DESIGN_VIEW_ENCODING, URL_DESIGN_VIEW_FORMAT } from './url-design-view.js';
import { createUrlRunArtifacts } from './url-run-artifacts.js';
import { createUrlOriginLedger, type UrlOriginReceipt } from './url-origin-ledger.js';
import { SESSION_CONTENT_CLASSES } from './session-egress-policy.js';
import type { SessionAuditEvent } from './session-relay.js';
import { draftSchemaDocument } from './draft-schema.js';
import type { BriefReport } from './brief.js';
import type { StartSessionsReport } from './session-handover.js';
import { launchFormRefusal, writeLaunchedMarker } from './launched.js';
import { URL_RUN_SIDECAR, type EffectiveRunAuthority, type ProtectedUrlRunContext } from './effective-run-record.js';
import { createUrlRunDeclaration, URL_ORIGIN_POLICY_PATH, URL_PROFILE_ID, URL_ROLES, urlSourceTransportIdentity, type UrlRunDeclarationInput } from './url-run-record.js';
const cleanup: string[] = [];
afterAll(async () => { for (const root of cleanup) await rm(root, { recursive: true, force: true }); });
async function planningFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'urp-')); cleanup.push(root);
  const run = path.join(root, `run-${'d'.repeat(32)}`), parent = path.join(root, 'views'), hidden = path.join(root, 'protected'), support = path.join(root, 'support');
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
    sessionDirectories: { author: run, inventory: `${run}.sessions/session-1`, fidelity: `${run}.sessions/fidelity-1`, design: `${run}.sessions/design-1` },
    cliExecutable: await realpath(path.join(os.homedir(), '.local/share/claude/versions', URL_CLI_PROGRAM.version)), parent,
    protectedPaths: [run, hidden], canaries, current: () => true, audit: () => { throw new Error('planning may not launch a CLI'); }, now: Date.now(),
    runtime: { worker: { node, nodeSha256: sha256(await readFile(node)), bundle: path.join(hidden, 'unused-worker.mjs'), bundleSha256: 'b'.repeat(64) },
      peerProgram: { executable: path.join(hidden, 'unused-peer'), sha256: 'a'.repeat(64) },
      supportDirectory: support, supportSha256: hashes, inputTreeSha256: 'c'.repeat(64), manifestSha256: 'd'.repeat(64), profileRegistrySha256: 'e'.repeat(64) } };
  return { options, root, parent, hidden, basePolicyBytes: snapshot.bytes };
}
const H = 'a'.repeat(64), OTHER = 'b'.repeat(64), PIN = 'c'.repeat(40);
const RUN = `run-${'d'.repeat(32)}`;
const config = () => {
  const parsed = parseRunConfig(JSON.stringify({ operator: 'synthetic-operator', agentTool: 'claude-code', agentToolVersion: '2.1.327',
    agentProvider: 'anthropic', model: 'claude-sonnet-4-6', deadline: 'PT1H', agentTurnBudget: 300, maxRepairCycles: 3,
    maxQuestions: 1, audience: 'synthetic-reader', operatorIsOwner: false }));
  if (!parsed.ok) throw new Error('synthetic configuration refused');
  return parsed.config;
};
function ownRun(): string {
  const root = tempDir('effective-run-record-'), run = path.join(root, RUN);
  fs.mkdirSync(run);
  fs.writeFileSync(path.join(run, 'run.json'), encodeRunRecord(config(), {
    repository: { url: 'example.invalid/team/project', repositoryId: 'team-project', role: 'observed-source' },
    clone: { path: path.join(root, 'unused-synthetic-clone'), declaredBy: 'operator', label: 'Inferred', use: 'read' },
    pinnedRevision: { commit: PIN, label: 'synthetic pin selection', pinnedAt: '2026-10-07T12:00:00.000Z' },
    screeningPolicy: policyFixture().binding, contentClasses: DOSSIER_CONTENT_CLASSES,
    visibility: { value: 'private', source: 'conservative-default', declaredBy: 'synthetic default', label: 'Inferred' },
    governed: { kind: 'unstated', because: ['synthetic fixture has no project declaration'] },
    workItem: { identity: null, reason: NO_WORK_ITEM_REASON },
  }));
  return run;
}
function bindUrl(run: string, screenMetadata: (text: string) => boolean = () => true) {
  const baseText = fs.readFileSync(path.join(run, 'run.json'), 'utf8'), read = readRunRecord(baseText);
  if (!read.ok) throw new Error('synthetic compatible record invalid');
  const identity = urlSourceTransportIdentity(`https://${read.record.subject.repository.url}`);
  if (!identity.ok) throw new Error('synthetic source destination invalid');
  const runId = path.basename(run);
  const input: UrlRunDeclarationInput = { runId,
    originPolicy: { path: URL_ORIGIN_POLICY_PATH, commit: PIN, policyId: 'POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1', policyVersion: '1.0.0', sha256: OTHER },
    inference: { provider: 'anthropic', tool: 'claude-code', toolVersion: '2.1.327', model: 'claude-sonnet-4-6', modelSelection: 'supported-default', profile: { id: URL_PROFILE_ID, sha256: H } },
    sourceTransport: { originalLocator: identity.originalLocator, destination: identity.destination, providerId: identity.providerId,
      acquisitionId: 'acq-0123456789abcdef0123456789abcdef', metadataClasses: ['code-structure'], selectionOrigin: 'validated-destination-before-acquisition',
      commandSha256: H, protocolSha256: H, configurationSha256: H, executableSha256: H, environmentSha256: H },
    plannedOrigins: [
      { id: 'origin:metadata', species: 'structural-source-and-tool-metadata', sha256: H, classes: ['code-structure'], originIds: [] },
      { id: 'origin:scaffold', species: 'fixed-role-policy-and-cli-scaffold', sha256: H, classes: ['governance-text'], originIds: [] },
      { id: 'origin:body', species: 'pinned-repository-body', sha256: H, classes: ['code-content'], originIds: [] },
      { id: 'origin:packet', species: 'composed-role-input-or-broker-result', sha256: OTHER,
        classes: ['code-content', 'code-structure', 'derived-composites', 'governance-text'], originIds: ['origin:metadata', 'origin:scaffold', 'origin:body'] },
    ],
    roles: URL_ROLES.map((role, index) => ({ role, sessionId: `0000000${index}-0000-4000-8000-000000000000`, profileId: URL_PROFILE_ID,
      compiledProfileSha256: OTHER, commandSha256: H, instructionSha256: H, viewSha256: H, scaffoldSha256: H, mcpSha256: H,
      configurationSha256: H, executableSha256: H, inputPacketSha256: OTHER, inputOriginId: 'origin:packet',
      capture: { pid: 'Unknown', startedAt: 'Unknown', finishedAt: 'Unknown', outcome: 'Unknown' } })), protectedAudit: `url-audit:${runId}` };
  const context: ProtectedUrlRunContext = { runId, expectedBasePolicy: read.record.subject.screeningPolicy,
    expectedOriginPolicy: input.originPolicy, expectedSourceTransport: input.sourceTransport, expectedProfileSha256: H };
  const encoded = createUrlRunDeclaration(baseText, input, context);
  expect(encoded.ok).toBe(true);
  if (!encoded.ok) throw new Error('synthetic URL declaration invalid');
  fs.writeFileSync(path.join(run, URL_RUN_SIDECAR), encoded.text);
  const bound = { ...context, expectedSidecarSha256: encoded.sha256 };
  const authority: EffectiveRunAuthority = (canonical, id) => canonical === run && id === runId
    ? { kind: 'url', context: bound, screenMetadata } : { kind: 'refused' };
  return { ...encoded, authority, context: bound, core: read.record };
}

let planning: Awaited<ReturnType<typeof planningFixture>>, plans: readonly UrlRolePlan[], historicalPlans: readonly UrlRolePlan[], orderedPlans: readonly UrlRolePlan[];
const promptText = 'Own actual issued compatibility prompt, distinct from the native initial input.';
const promptPath = (role: string) => path.join(planning.options.run, role === 'inventory' ? 'inventory/session-1.json' : `reviews/${role}-session-1.json`);
const historyPath = (role: string) => promptPath(role).replace(/\.json$/u, '.launch.json');
beforeAll(async () => {
  planning = await planningFixture(); const result = await prepareHistoricalUrlRolePlansTestPort(planning.options);
  expect(result.ok).toBe(true); if (!result.ok) throw Error('own preparation refused'); plans = result.roles; historicalPlans = plans; cleanup.push(result.socketRoot);
  const ordered = await prepareUrlRolePlans(planning.options);
  if (!ordered.ok) throw Error('own ordered preparation refused');
  orderedPlans = ordered.roles; cleanup.push(ordered.socketRoot);
  for (const child of ['inventory', 'reviews']) fs.mkdirSync(path.join(planning.options.run, child));
}, 90_000);
beforeEach(() => {
  plans = historicalPlans;
  fs.writeFileSync(path.join(planning.options.run, 'run.json'), encodeRunRecord(planning.options.record.declared, planning.options.record.subject));
  for (const role of ['inventory', 'fidelity', 'design']) {
    fs.rmSync(historyPath(role), { force: true });
    fs.writeFileSync(promptPath(role), JSON.stringify({ format: 'polaris-dossier-session-prompt/2', role: role === 'inventory' ? 'inventory' : 'review',
      ...(role === 'inventory' ? {} : { kind: role }), runId: path.basename(planning.options.run), pinnedRevision: planning.options.record.subject.pinnedRevision.commit,
      session: 1, prompt: promptText, promptSha256: sha256(promptText),
      directory: path.relative(path.dirname(planning.options.run), planning.options.sessionDirectories[role as 'inventory' | 'fidelity' | 'design']) }));
  }
});
const options = (role: string = 'inventory') => ({ run: planning.options.run, runId: path.basename(planning.options.run),
  plan: plans.find(plan => plan.role === role)!, compatiblePromptSha256: sha256(promptText), capture: { pid: 1234, startedAt: Date.UTC(2026, 10, 19) },
  screen: planning.options.screen, current: () => true });

const helperRoles = ['inventory', 'fidelity', 'design'] as const;

function productFixture(orderedDesign = false) {
  const { run, record, screen, runtime, sessionDirectories } = planning.options;
  const runId = path.basename(run), pin = record.subject.pinnedRevision.commit;
  const originBytes = fs.readFileSync(new URL(`../../../${URL_ORIGIN_POLICY_PATH}`, import.meta.url));
  const originPolicy = { path: URL_ORIGIN_POLICY_PATH, commit: pin, policyId: 'POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1', policyVersion: '1.0.0', sha256: sha256(originBytes) };
  const fixed = [{ id: 'origin:policy', kind: 'policy', bytes: Buffer.from('Own role policy.') },
    { id: 'origin:control', kind: 'run-control', bytes: Buffer.from('Own run control.') },
    { id: 'origin:metadata', kind: 'structure', bytes: Buffer.from('Own tool metadata.') }] as const;
  const current = vi.fn(() => true);
  const ledger = createUrlOriginLedger({ runId, record, screen, basePolicyBytes: planning.basePolicyBytes,
    originPolicy: { binding: originPolicy, bytes: originBytes }, current, fixed,
    schemas: { draft: () => false, inventory: () => false, 'fidelity-verdict': () => false, 'design-verdict': value => orderedDesign && typeof value === 'object' && value !== null && (value as Record<string, unknown>)['own'] === 'checked verdict' } });
  const rolePolicy = ledger.fixed(fixed[0].id, fixed[0].bytes), runControl = ledger.fixed(fixed[1].id, fixed[1].bytes);
  const toolMetadata = ledger.fixed(fixed[2].id, fixed[2].bytes);
  const initialReceipts = {} as Record<typeof URL_ROLES[number], ReturnType<typeof ledger.compose>>;
  const aliases = new Map<string, string>();
  for (const plan of plans) {
    const receipt = ledger.compose(Buffer.from(plan.profile.input.initialPrompt), [rolePolicy, runControl, toolMetadata]);
    initialReceipts[plan.role] = receipt; aliases.set(ledger.metadata(receipt).id, plan.declaration.inputOriginId);
  }
  const originList = ledger.plannedOrigins().map(origin => ({ ...origin, id: aliases.get(origin.id) ?? origin.id }));
  const baseText = fs.readFileSync(path.join(run, 'run.json'), 'utf8');
  const source = urlSourceTransportIdentity(`https://${record.subject.repository.url}`);
  if (!source.ok) throw Error('fixture source identity');
  const sourceTransport = { originalLocator: source.originalLocator, destination: source.destination, providerId: source.providerId,
    acquisitionId: 'acq-0123456789abcdef0123456789abcdef', metadataClasses: ['code-structure'] as const, selectionOrigin: 'validated-destination-before-acquisition' as const,
    commandSha256: H, protocolSha256: H, configurationSha256: H, executableSha256: H, environmentSha256: H };
  const context = { runId, expectedBasePolicy: record.subject.screeningPolicy, expectedOriginPolicy: originPolicy,
    expectedSourceTransport: sourceTransport, expectedProfileSha256: runtime.profileRegistrySha256 };
  const declaration = createUrlRunDeclaration(baseText, { runId, originPolicy, inference: { provider: 'anthropic',
    tool: 'claude-code', toolVersion: '2.1.327', model: 'claude-sonnet-4-6', modelSelection: 'supported-default',
    profile: { id: URL_PROFILE_ID, sha256: context.expectedProfileSha256 } }, sourceTransport, plannedOrigins: originList,
    roles: plans.map(plan => plan.declaration), protectedAudit: `url-audit:${runId}` }, context);
  if (!declaration.ok) throw Error('fixture declaration');
  const schema = Buffer.from(JSON.stringify(draftSchemaDocument({ pinnedRevision: pin, maxQuestions: record.declared.maxQuestions })));
  const artifactOptions = { run, record, roles: plans, current, helpText: 'syzygy dossier',
    runDossier: () => async () => { throw Error('fixture must not execute'); }, initializedCoreBytes: Buffer.from(baseText),
    origins: { ledger, roots: { rolePolicy, runControl, toolMetadata }, initialReceipts,
      schemaDocuments: { draft: schema, inventory: schema, fidelity: schema, design: schema } },
    effectiveDeclaration: { declaration: declaration.declaration, bytes: Buffer.from(declaration.text),
      context: { ...context, expectedSidecarSha256: declaration.sha256 } } };
  const bridge = createUrlRunArtifacts(artifactOptions);
  const briefText = 'Own issued brief.', issuedAt = '2026-11-19T00:00:00.000Z', inventoryBrief = 'Own issued inventory brief.';
  fs.writeFileSync(path.join(run, 'draft.schema.json'), schema);
  fs.writeFileSync(path.join(run, 'brief.md'), briefText);
  fs.writeFileSync(path.join(run, 'brief.json'), JSON.stringify({ format: 'polaris-dossier-brief/1', role: 'authoring', runId, pinnedRevision: pin, issuedAt,
    files: { brief: { name: 'brief.md', sha256: sha256(briefText) }, draftSchema: { name: 'draft.schema.json', sha256: sha256(schema) } } }));
  fs.mkdirSync(sessionDirectories.inventory, { recursive: true }); fs.writeFileSync(path.join(sessionDirectories.inventory, 'inventory-brief.md'), inventoryBrief);
  const inventoryPrompt = JSON.parse(fs.readFileSync(promptPath('inventory'), 'utf8'));
  fs.writeFileSync(promptPath('inventory'), JSON.stringify({ ...inventoryPrompt, brief: { name: 'inventory-brief.md', sha256: sha256(inventoryBrief) } }));
  const initial = { brief: { command: 'brief', outcome: 'issued', run, brief: path.join(run, 'brief.md'), draftSchema: path.join(run, 'draft.schema.json'),
    pinnedRevision: pin, issuedAt, executionRule: { arm: 'sec-3' } } as BriefReport,
    sessions: { command: 'session-prompt', outcome: 'issued', role: 'all', run, sessions: helperRoles.map(role => ({
      role: role === 'inventory' ? 'inventory' : 'review', ...(role === 'inventory' ? {} : { kind: role }), session: 1, directory: sessionDirectories[role],
      prompt: promptText, promptSha256: sha256(promptText) })) } as unknown as StartSessionsReport };
  bridge.registerInitial(initial);
  return { bridge, ledger, originPolicy, artifactOptions, initial, current };
}

async function auditFixture(originPolicySha256: string, name: string, parent = planning.hidden) {
  const { role: _role, ...binding } = plans[0]!.profile.input.binding;
  const audit = await createUrlSessionAudit({ parent, name, binding, originPolicySha256, project: 'project:syzygy',
    pin: planning.options.record.subject.pinnedRevision.commit, principal: 'operator:own-fixture',
    profiles: plans.map(plan => plan.profile), declaredClasses: SESSION_CONTENT_CLASSES, screen: planning.options.screen, current: () => true });
  if (!audit.ok) throw Error('fixture audit');
  const attempt = async (role: UrlLaunchHistoryRole, changes: { commandSha256?: string; viewSha256?: string } = {}) => {
    const { commandSha256, viewSha256, compiledProfileSha256 } = options(role).plan.declaration;
    await audit.append({ kind: 'launch-attempt', role, scope: audit.scope(role),
      payload: { event: 'session-launch-attempt', commandSha256, viewSha256, profileSha256: compiledProfileSha256, ...changes } });
  };
  return { audit, attempt, segment: (role: UrlLaunchHistoryRole) => path.join(parent, `${name}-${role}.jsonl`) };
}

async function orderedDeliveryPrefix(writer: OrderedDesignAuditWriter, plan: OrderedDesignPlan,
  profile: UrlRolePlan['profile'], run: string) {
  if (!isOrderedDesignSessionProfile(profile)) throw Error('own ordered profile');
  const encode = (value: unknown) => encodeCanonicalJson(value, { maxBytes: 65_536, maxNodes: 4096, maxDepth: 12 });
  const identify = (text: string) => ({ bytes: Buffer.byteLength(text), sha256: sha256(text) });
  const call = (id: string, name: 'mcp__syzygy__dossier_step' | 'mcp__syzygy__artifact_read', args: unknown) => ({ id: `toolu_${id}`, name, inputSha256: sha256(encode(args)) });
  const step = 'mcp__syzygy__dossier_step', artifact = 'mcp__syzygy__artifact_read';
  const refs: Array<{ receipt: OrderedDesignAuditReference; wrapper: ReturnType<typeof identify> }> = [];
  const prepared = await writer.append('prepared', { call: call('poll', step, { argv: ['dossier', 'poll', run] }), prepared: identify(plan.preparedText),
    reply: identify(encode({ kind: 'session-control', ok: true, state: 'events', events: [{ event: profile.transcript.prepared.event, ...plan.prepared }] })) });
  refs.push({ receipt: prepared, wrapper: identify('own prepared wrapper') });
  const usage = { inputTokens: 3, outputTokens: 4, cacheCreationInputTokens: 0, cacheReadInputTokens: 0 };
  let count = 0;
  const exchange = async (next: ReturnType<typeof call> | null) => {
    count++;
    const request = { requestId: `00000000-0000-4000-8000-${String(count).padStart(12, '0')}`, route: 'messages' as const,
      received: identify(`own received ${count}`), forwarded: identify(`own forwarded ${count}`) };
    const admission = await writer.append('request-admitted', { ...request, logical: identify(`own logical ${count}`), results: refs, transcriptSha256: sha256(`own transcript ${count}`) });
    const sendAttempt = await writer.append('send-attempt', { ...request, admission, outcome: 'attempted' });
    const sendOutcome = await writer.append('send-outcome', { ...request, admission, sendAttempt, outcome: 'local-request-flushed' });
    const native = next ? { ...identify(`own SSE ${count}`), content: 'messages-event-stream' as const, stopReason: 'tool_use' as const, textBlocks: 0 as const, tool: next }
      : { ...identify(`own SSE ${count}`), content: 'messages-event-stream' as const, stopReason: 'end_turn' as const, textBlocks: 1 as const, tool: null };
    const response = await writer.append('response-admitted', { ...request, admission, sendAttempt, sendOutcome, outcome: 'response-admitted', status: 200, usage, native });
    return { admission, sendAttempt, sendOutcome, response };
  };
  let currentCall = call('part_1', artifact, { path: plan.manifest.parts[0]!.path });
  const preparedExchange = await exchange(currentCall), parts = [];
  let previous = preparedExchange;
  const stdin = encode({ own: 'checked verdict', packetSha256: plan.manifest.originalSha256 });
  const submit = call('submit', step, { argv: ['dossier', 'await', '/work', '--submit', 'round-1/verdict.json', '--stdin'], stdin });
  for (const [index, part] of plan.manifest.parts.entries()) {
    const reply = plan.replies[index]!;
    const receipt = await writer.append('part-receipt', { ordinal: index + 1, issuedBy: previous.response, call: currentCall, reply: { bytes: reply.bytes, sha256: reply.sha256 } });
    refs.push({ receipt, wrapper: identify(`own part wrapper ${index}`) });
    currentCall = index + 1 === plan.manifest.partCount ? submit : call(`part_${index + 2}`, artifact, { path: plan.manifest.parts[index + 1]!.path });
    previous = await exchange(currentCall); parts.push({ receipt, ...previous });
  }
  const completion = await writer.append('delivery-completed', { prepared, preparedExchange, parts,
    finalAdmission: previous.admission, verdictResponse: previous.response, verdictCall: submit });
  return { completion, stdin, finish: async (checked: sessionAudit.UrlCheckedDesignVerdict) => {
    const stage = await writer.append('verdict-staged', { completion, issuedBy: previous.response, verdictCall: submit,
      packet: { bytes: plan.manifest.originalBytes, sha256: plan.manifest.originalSha256 }, checkedVerdictSha256: sha256(encode(checked)), verdict: identify(stdin) });
    const text = encode({ kind: 'dossier-result', ok: true, exit: 0, stderr: '', stdout: encode({ outcome: profile.transcript.verdict.stagedOutcome,
      eligibility: profile.transcript.verdict.eligibility, packetSha256: plan.manifest.originalSha256 }) });
    const acknowledgment = await writer.append('acknowledgment-receipt', { stage, call: submit, reply: identify(text) });
    const wrapper = identify(encode({ role: 'user', content: [{ type: 'tool_result', tool_use_id: submit.id, cache_control: { type: 'ephemeral', ttl: '1h' },
      content: [{ type: 'text', text: text + '\n' }, { type: 'text', text: sessionProfileReminderText(14_999_993) }] }] }));
    refs.push({ receipt: acknowledgment, wrapper });
    await writer.append('eligible', { completion, stage, acknowledgment, wrapper, ...await exchange(null) });
  } };
}

describe('protected URL design delivery audit', () => {
  it.each(['valid', 'ordered', 'ordered-mutated', 'ordered-extra', 'expiry', 'launch-drift', 'sample-refusal'] as const)(
    'keeps a metadata-only event and rechecks after durability (%s)', async mode => {
    if (mode.startsWith('ordered')) plans = orderedPlans;
    const { originPolicy, ledger, artifactOptions, initial } = productFixture(mode.startsWith('ordered'));
    const { audit, attempt, segment } = await auditFixture(originPolicy.sha256, `design-proof-${mode}`);
    const other = await auditFixture(originPolicy.sha256, `other-proof-${mode}`);
    const run = planning.options.run, runId = path.basename(run), pinnedRevision = planning.options.record.subject.pinnedRevision.commit;
    const site = 50, sitePath = path.join(run, 'site', String(site));
    const content = '<!doctype html><title>OWN UNEXPOSED RENDER</title>';
    fs.mkdirSync(sitePath, { recursive: true });
    fs.writeFileSync(path.join(sitePath, 'index.html'), content);
    const deadline = Date.now() + (mode.startsWith('ordered') ? 20_000 : 4500);
    const renderer = { format: 'polaris-url-installed-renderer/1', sourceEntry: 'first-party-renderer',
      programSha256: '1'.repeat(64), programBytes: 42, inputTreeSha256: '2'.repeat(64),
      manifestSha256: '3'.repeat(64), profileRegistrySha256: planning.options.runtime.profileRegistrySha256 } as const;
    const originalText = 'Own bounded design packet. '.repeat(1600);
    const view = Uint8Array.from(Buffer.from(mode.startsWith('ordered') ? encodeCanonicalJson({ format: URL_DESIGN_VIEW_FORMAT, encoding: URL_DESIGN_VIEW_ENCODING,
      originalSha256: sha256(originalText), originalBytes: Buffer.byteLength(originalText), payload: originalText, payloadSha256: sha256(originalText), payloadBytes: Buffer.byteLength(originalText) }, { maxBytes: 2_097_152, maxNodes: 65_536, maxDepth: 32 }) : 'OWN INERT VIEW'));
    const parent = mode.startsWith('ordered') ? ledger.compose(Buffer.from('Own checked design input.'), [artifactOptions.origins.roots.rolePolicy]) : Object.freeze({}) as UrlOriginReceipt;
    const metadata: designProduct.UrlDesignProductMetadata = {
      format: 'polaris-url-design-product-validation/1', lifetime: 'active-render-operation-only',
      run, runId, pinnedRevision, draftRevision: 7, renderer,
      original: mode.startsWith('ordered') ? { sha256: sha256(originalText), bytes: Buffer.byteLength(originalText) } : { sha256: '4'.repeat(64), bytes: 11 }, payload: { sha256: '5'.repeat(64), bytes: 22 },
      view: { sha256: sha256(view), bytes: view.byteLength, format: URL_DESIGN_VIEW_FORMAT, encoding: URL_DESIGN_VIEW_ENCODING },
      basePolicy: planning.options.record.subject.screeningPolicy, originPolicy,
      profile: { id: URL_PROFILE_ID, sha256: renderer.profileRegistrySha256 },
      products: { operation: 'render', deadline, snapshotBytes: 0, records: [], selections: [] },
      parents: mode.startsWith('ordered') ? [JSON.parse(JSON.stringify(ledger.metadata(parent)))] : [{ id: 'origin:OWN_RAW_PARENT_ID', digest: '7'.repeat(64), bytes: 9, classes: ['code-content'], originIds: [] }],
      output: { files: 1, pages: 1, bytes: Buffer.byteLength(content),
        population: [{ path: 'index.html', sha256: sha256(content), bytes: Buffer.byteLength(content) }] },
      rawActive: { status: 'failed', finding: 'active-content' },
    };
    const token = {} as designProduct.ValidatedUrlDesignProduct;
    const reproduced = {} as designProduct.ValidatedUrlDesignProduct;
    const reviewed = {} as designProduct.ValidatedUrlDesignProduct;
    const reproducedForReceipt = {} as designProduct.ValidatedUrlDesignProduct;
    let reproducedMetadata = { ...metadata, products: { ...metadata.products, deadline: deadline + 250 } };
    let originalOpen = true, reviewOpen = true, inputCurrent = true;
    const lease = vi.spyOn(designProduct, 'isUrlDesignProductLeaseOpen').mockImplementation(product =>
      product === token ? originalOpen && Date.now() < deadline
        : (product === reproduced || product === reproducedForReceipt || product === reviewed && reviewOpen)
          && Date.now() < reproducedMetadata.products.deadline);
    const inputs = vi.spyOn(designProduct, 'recheckUrlDesignProductInputs')
      .mockImplementation(product => inputCurrent && designProduct.isUrlDesignProductLeaseOpen(product));
    const inspect = vi.spyOn(designProduct, 'inspectUrlDesignProduct');
    inspect.mockImplementation(async (product, address) => {
      if (address.run !== run || address.runId !== runId || address.pinnedRevision !== pinnedRevision) return null;
      if (product === reproduced || product === reviewed || product === reproducedForReceipt) return structuredClone(reproducedMetadata);
      if (product !== token || Date.now() >= deadline) return null;
      return structuredClone(metadata);
    });
    let readView = view;
    const read = vi.spyOn(designProduct, 'readInertUrlDesignProduct').mockImplementation(async (product, address) => {
      if (address.run !== run || address.runId !== runId || address.pinnedRevision !== pinnedRevision
        || !designProduct.isUrlDesignProductLeaseOpen(product)) return null;
      if (mode === 'expiry') return null;
      if (mode === 'launch-drift') fs.utimesSync(historyPath('design'), 1, 1);
      return { metadata: structuredClone(product === token ? metadata : reproducedMetadata), view: readView.slice(), parents: [parent] };
    });
    try {
      await attempt('design');
      const history = await writeUrlLaunchHistory(options('design'));
      const launch = await audit.commitLaunchHistory(history.capability!);
      const expectedProduct = { ...metadata, products: { ...metadata.products, deadline: deadline - 4500 } };
      const request = { product: token, expectedProduct, launch, run, runId, pinnedRevision, sitePath, round: 1 };
      const before = audit.summary().durableRecords;
      await expect(other.audit.commitDesignDelivery(request)).rejects.toThrow('url-session-audit-refused');
      await expect(audit.commitDesignDelivery({ ...request, round: 2 })).rejects.toThrow('url-session-audit-refused');
      await expect(audit.commitDesignDelivery({ ...request, product: { ...token } })).rejects.toThrow('url-session-audit-refused');
      await expect(audit.commitDesignDelivery({ ...request, expectedProduct: { ...expectedProduct, draftRevision: 8 } }))
        .rejects.toThrow('url-session-audit-refused');
      expect(audit.summary().durableRecords).toBe(before);
      const beforeAppend = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      await expect(audit.commitDesignDelivery(request, beforeAppend)).rejects.toThrow('url-session-audit-refused');
      expect(beforeAppend).toHaveBeenCalledTimes(2);
      expect(audit.summary().durableRecords).toBe(before);
      expect(read).not.toHaveBeenCalled();

      const sampledDurability: number[] = [];
      const first = audit.commitDesignDelivery(request, async () => {
        const count = audit.summary().captured['design-delivery'];
        sampledDurability.push(count);
        return mode !== 'sample-refusal' || count === 0;
      });
      const duplicate = audit.commitDesignDelivery(request);
      await expect(duplicate).rejects.toThrow('url-session-audit-refused');
      if (mode !== 'valid' && !mode.startsWith('ordered')) {
        await expect(first).rejects.toThrow('url-session-audit-refused');
        if (mode === 'sample-refusal') {
          expect(sampledDurability).toEqual([0, 0, 1]);
          expect(read).not.toHaveBeenCalled();
        }
        await expect(audit.commitDesignDelivery(request)).rejects.toThrow('url-session-audit-refused');
        await expect(audit.commitDesignDelivery({ ...request, round: 2 })).rejects.toThrow('url-session-audit-refused');
      } else {
        const delivered = await first;
        expect(sampledDurability).toEqual([0, 0, 1, 1, 1]);
        const sealed = delivered.receipt;
        if (mode.startsWith('ordered')) {
          const profile = plans.find(plan => plan.role === 'design')!.profile;
          if (!isOrderedDesignSessionProfile(profile)) throw Error('own ordered profile missing');
          const plan = planOrderedDesignBytes({ envelope: view, envelopeSha256: sha256(view), original: metadata.original,
            fileCount: 1, pageCount: 1, instructionProfileSha256: sha256(profile.input.systemPrompt), limits: { partBytes: profile.transcript.partition.partBytes, partCount: profile.transcript.partition.partCount, replyBytes: profile.transcript.partition.replyBytes, preparedBytes: profile.transcript.partition.preparedBytes },
            parents: metadata.parents.map(parent => sha256(encodeCanonicalJson(parent, { maxBytes: 2_097_152, maxNodes: 65_536, maxDepth: 32 }))), binding: {
              basePolicySha256: metadata.basePolicy.sha256, deadline: new Date(Date.now() + 30_000).toISOString(), encoding: URL_DESIGN_VIEW_ENCODING,
              originPolicySha256: originPolicy.sha256, originalReceiptSha256: sealed.eventSha256, pin: pinnedRevision,
              producerSha256: metadata.renderer.programSha256, profileSha256: profile.digest, project: 'project:syzygy', provider: 'anthropic', role: 'design',
              round: 1, run: runId, session: profile.input.sessionId, transferEpoch: 1 } });
          let observedReadBytes = 0;
          const writer = audit.beginOrderedDesignAudit(plan, () => true, bytes => { observedReadBytes += bytes; }), otherWriter = other.audit.beginOrderedDesignAudit(plan, () => true);
          const protocol = await orderedDeliveryPrefix(writer, plan, profile, runId);
          const deliveryReads = vi.fn();
          const refreshedView = await audit.readDesignDeliveryView(sealed, reproduced, deliveryReads);
          expect(deliveryReads).toHaveBeenCalled();
          const previousReads = deliveryReads.mock.calls.length;
          assertUrlDesignDeliveryViewCurrent(refreshedView);
          expect(deliveryReads.mock.calls.length).toBeGreaterThan(previousReads);
          await expect(audit.readOrderedDesignReviewProof(sealed, reviewed, { ...writer }, protocol.completion)).rejects.toThrow('url-session-audit-refused');
          await expect(audit.readOrderedDesignReviewProof(sealed, reviewed, otherWriter, protocol.completion)).rejects.toThrow('url-session-audit-refused');
          await expect(audit.readOrderedDesignReviewProof(sealed, token, writer, protocol.completion)).rejects.toThrow('url-session-audit-refused');
          await expect(audit.readOrderedDesignReviewProof(sealed, reviewed, writer, { ...protocol.completion, sha256: '0'.repeat(64) })).rejects.toThrow('url-session-audit-refused');
          const proof = await audit.readOrderedDesignReviewProof(sealed, reviewed, writer, protocol.completion);
          expect(proof.artifactReadId).toBeNull();
          expect(observedReadBytes).toBeGreaterThan(0);
          expect(sessionAudit.orderedUrlDesignReviewParents(proof)).toEqual([parent]);
          expect(() => sessionAudit.orderedUrlDesignReviewParents({ ...proof })).toThrow('url-session-audit-refused');
          const actualRunner = vi.fn(async (argv: readonly string[], bytes: Uint8Array | null) => {
            expect(argv).toEqual(['dossier', 'await', `${planning.options.sessionDirectories.design}/`, '--submit', 'round-1/verdict.json', '--stdin', '--json']);
            if (!bytes) throw Error('own missing verdict');
            const file = 'reviews/design-verdict-0.json', checkFile = 'reviews/checks/design-verdict-0.json';
            fs.mkdirSync(path.join(run, 'reviews/checks'), { recursive: true });
            fs.writeFileSync(path.join(run, file), bytes);
            const check = { format: 'polaris-dossier-review-check/1', runId, kind: 'design', number: 0, checkedAt: new Date().toISOString(), outcome: 'validated',
              verdict: { file, sha256: sha256(bytes), bytes: bytes.length, packetSha256Named: metadata.original.sha256 },
              packet: { sha256: metadata.original.sha256, site }, session: { number: 1, sessionId: profile.input.sessionId,
                declaredBy: 'the review session', label: 'Inferred', distinctFrom: 'own author' }, problems: [],
              readiness: { declared: 'ready', blocking: false, basis: 'own checked fixture', declaredBy: 'the review session', label: 'Inferred' },
              counts: 'own fixture', label: 'Inferred' };
            fs.writeFileSync(path.join(run, checkFile), JSON.stringify(check));
            const report = { ...check, command: 'review-check', run, checkFile: path.join(run, checkFile), disclosures: [],
              observed: { packetSha256: metadata.original.sha256, verdictNamesPacket: true, label: 'Observed' }, inferred: { basis: [], label: 'Inferred' } };
            return { stdout: JSON.stringify({ command: 'await', format: 'polaris-dossier-await/1', outcome: 'submitted', role: 'review', kind: 'design',
              session: 1, next: 'own checked', disclosures: [], passed: true, check: report }), stderr: '', exit: 0 };
          });
          const producer = createUrlRunArtifacts({ ...artifactOptions, runDossier: () => actualRunner });
          producer.registerInitial(initial);
          const nativeArgv = ['dossier', 'await', '/work', '--submit', 'round-1/verdict.json', '--stdin'];
          const staged = await producer.stageOrderedDesignVerdict(nativeArgv, Buffer.from(protocol.stdin), proof);
          expect(actualRunner).toHaveBeenCalledTimes(1);
          const checked = staged.checked;
          expect(producer.hasCommittedProduct('reviews/checks/design-verdict-0.json', checked.checkSha256)).toBe(false);
          const selection = () => {
            const context = producer.beginRead({ operation: 'render', deadline: Date.now() + 4000 });
            try {
              const result = producer.selectProductGroups(context, ['design-checks', 'design-verdicts']);
              producer.revalidateRead(context);
              return result;
            } finally { producer.cancelRead(context); }
          };
          expect(selection()).toEqual([[], []]);
          expect(producer.latestStageCheck('design')).toBeNull();
          if (mode === 'ordered-mutated' || mode === 'ordered-extra') {
            if (mode === 'ordered-mutated') fs.appendFileSync(path.join(run, 'reviews/design-verdict-0.json'), ' ');
            else fs.writeFileSync(path.join(run, 'reviews/design-verdict-999.json'), '{}');
            expect(selection).toThrow('url-run-artifacts-unavailable');
            expect(() => producer.latestStageCheck('design')).toThrow('url-run-artifacts-unavailable');
            expect(producer.hasCommittedProduct('reviews/checks/design-verdict-0.json', checked.checkSha256)).toBe(false);
            expect(audit.summary().captured['ordered-design-verdict']).toBe(0);
            return;
          }
          await expect(audit.commitOrderedDesignVerdict(proof, checked, {} as never)).rejects.toThrow('url-session-audit-refused');
          expect(() => producer.commitOrderedDesignVerdict(staged, proof, {} as never)).toThrow('url-run-artifacts-unavailable');
          await protocol.finish(checked);
          const terminal = await writer.readTerminal();
          const fresh = await audit.readOrderedDesignReviewProof(sealed, reproducedForReceipt, writer, protocol.completion);
          await expect(audit.commitOrderedDesignVerdict(fresh, checked, { ...terminal })).rejects.toThrow('url-session-audit-refused');
          await expect(audit.commitOrderedDesignVerdict(fresh, { ...checked, checkSha256: '0'.repeat(64) }, terminal)).rejects.toThrow('url-session-audit-refused');
          expect(() => producer.commitOrderedDesignVerdict({ ...staged }, fresh, terminal)).toThrow('url-run-artifacts-unavailable');
          await audit.commitOrderedDesignVerdict(fresh, checked, terminal);
          producer.commitOrderedDesignVerdict(staged, fresh, terminal);
          expect(producer.hasCommittedProduct('reviews/checks/design-verdict-0.json', checked.checkSha256)).toBe(true);
          expect(() => producer.commitOrderedDesignVerdict(staged, fresh, terminal)).toThrow('url-run-artifacts-unavailable');
          await expect(audit.commitOrderedDesignVerdict(fresh, checked, terminal)).rejects.toThrow('url-session-audit-refused');
          const continuation = await audit.readDesignRenderContinuation(sealed, reproduced, checked.number);
          expect(continuation.checked).toEqual(checked);
          expect(audit.summary()).toMatchObject({ captured: { 'ordered-design-verdict': 1, 'design-ordered': 23, 'tool-receipt': 0 } });
          fs.appendFileSync(segment('design'), '\n');
          expect(() => sessionAudit.assertUrlDesignRenderContinuationCurrent(continuation)).toThrow('url-session-audit-refused');
          return;
        }

        expect(sealed).toMatchObject({ eventSha256: expect.stringMatching(/^[0-9a-f]{64}$/u),
          identity: { state: 'prepared', site, round: 1, draftRevision: 7, sessionId: options('design').plan.declaration.sessionId,
            original: metadata.original, payload: metadata.payload, view: metadata.view, files: 1, pages: 1, parentCount: 1 } });
        const event = JSON.parse(fs.readFileSync(segment('design'), 'utf8').trimEnd().split('\n').at(-1)!);
        expect(event.sha256).toBe(sealed.eventSha256);
        expect(event.event.payload).toEqual(sealed.identity);
        const validate = (writer: typeof audit, record: typeof sealed, product: typeof token) =>
          Promise.resolve().then(() => writer.revalidateDesignDelivery(record, product));
        await expect(validate(audit, sealed, token)).resolves.toBeUndefined();
        await expect(validate(other.audit, sealed, reproduced)).rejects.toThrow('url-session-audit-refused');
        await expect(validate(audit, { ...sealed }, reproduced)).rejects.toThrow('url-session-audit-refused');
        await expect(validate(audit, sealed, { ...reproduced })).rejects.toThrow('url-session-audit-refused');
        const expected = { receipt: sealed, view, parents: [parent] };
        expect(delivered).toStrictEqual(expected);
        expect(isIssuedUrlDesignDeliveryView(delivered)).toBe(true);
        expect(isIssuedUrlDesignDeliveryView({ ...delivered })).toBe(false);
        expect(() => assertUrlDesignDeliveryViewCurrent(delivered)).not.toThrow();
        expect(() => assertUrlDesignDeliveryViewCurrent({ ...delivered })).toThrow('url-session-audit-refused');
        delivered.view[0] = delivered.view[0]! ^ 1;
        expect(() => assertUrlDesignDeliveryViewCurrent(delivered)).toThrow('url-session-audit-refused');
        delivered.view[0] = view[0]!;
        await expect(audit.readDesignDeliveryView(sealed, token)).resolves.toStrictEqual(expected);
        await expect(other.audit.readDesignDeliveryView(sealed, reproduced)).rejects.toThrow('url-session-audit-refused');
        await expect(audit.readDesignDeliveryView({ ...sealed }, reproduced)).rejects.toThrow('url-session-audit-refused');
        await expect(audit.readDesignDeliveryView(sealed, { ...reproduced })).rejects.toThrow('url-session-audit-refused');
        originalOpen = false;
        expect(() => assertUrlDesignDeliveryViewCurrent(delivered)).toThrow('url-session-audit-refused');
        await expect(validate(audit, sealed, token)).rejects.toThrow('url-session-audit-refused');
        await expect(audit.readDesignDeliveryView(sealed, token)).rejects.toThrow('url-session-audit-refused');
        const clock = vi.spyOn(Date, 'now').mockReturnValue(deadline + 1);
        try {
          await expect(validate(audit, sealed, token)).rejects.toThrow('url-session-audit-refused');
          await expect(validate(audit, sealed, reproduced)).resolves.toBeUndefined();
          readView = view.map(byte => byte ^ 1);
          await expect(audit.readDesignDeliveryView(sealed, reproduced)).rejects.toThrow('url-session-audit-refused');
          readView = view;
          const exactView = await audit.readDesignDeliveryView(sealed, reproduced);
          expect(exactView).toStrictEqual(expected);
          expect(audit.summary().durableRecords).toBe(before + 1);
          const file = 'round-1/design-view.json', id = `tool-${'a'.repeat(64)}`;
          const reply = JSON.stringify({ kind: 'artifact', ok: true, path: file, sha256: metadata.view.sha256, text: Buffer.from(view).toString() });
          const tool = { id, toolName: 'mcp__syzygy__artifact_read' as const, inputSha256: sha256(JSON.stringify({ path: file })),
            digest: sha256(reply), bytes: Buffer.byteLength(reply), classes: ['work-history'] as const, originIds: ['origin:fixture'] };
          const admission = { digest: 'a'.repeat(64), bytes: 9, classes: ['work-history'] as const, originIds: [id] };
          await expect(audit.readDesignReviewProof(sealed, reviewed, admission)).rejects.toThrow('url-session-audit-refused');
          await expect(audit.commitDesignArtifactRead({ ...exactView }, tool)).rejects.toThrow('url-session-audit-refused');
          await expect(audit.commitDesignArtifactRead(exactView, { ...tool, digest: '9'.repeat(64) })).rejects.toThrow('url-session-audit-refused');
          inputCurrent = false;
          await expect(audit.commitDesignArtifactRead(exactView, tool)).rejects.toThrow('url-session-audit-refused');
          expect(audit.summary().captured['tool-receipt']).toBe(0);
          inputCurrent = true;
          await audit.commitDesignArtifactRead(exactView, tool);
          expect(audit.summary().captured['tool-receipt']).toBe(1);
          await expect(audit.readDesignReviewProof(sealed, reviewed, admission)).rejects.toThrow('url-session-audit-refused');
          const submission = { ...tool, id: `tool-${'b'.repeat(64)}`, toolName: 'mcp__syzygy__dossier_step' as const,
            inputSha256: '8'.repeat(64) };
          const scope = audit.scope('design');
          const response = { digest: '7'.repeat(64), bytes: 109, content: 'messages-json', stopReason: 'tool_use', textBlocks: 0,
            tool: { id: 'toolu_own_verdict_call', name: submission.toolName, inputSha256: submission.inputSha256 } } as const;
          const appendRelay = (payload: SessionAuditEvent) => audit.append({ kind: 'relay', role: 'design', scope, payload });
          const appendExchange = async (requestId: string, consumedToolResults: SessionAuditEvent['consumedToolResults']) => {
            const exchange = { subject: { binding: scope.binding, project: 'project:syzygy', pin: pinnedRevision, principal: 'operator:own-fixture' },
              requestId, at: '2026-11-19T00:00:00.000Z', credentialIdentity: 'Unknown', exposureMode: 'private-local-cli',
              governingRule: 'GOVERNANCE-SIMPLIFICATION-D10', admission, received: { digest: '9'.repeat(64), bytes: 95 },
              route: 'messages', consumedToolResults, response: null, status: null } as const;
            await appendRelay({ ...exchange, event: 'attempt-allowed', outcome: 'allowed' });
            await appendRelay({ ...exchange, event: 'send-attempt', outcome: 'attempted' });
            await appendRelay({ ...exchange, event: 'send-outcome', outcome: 'local-request-flushed' });
            await appendRelay({ ...exchange, event: 'response-admitted', outcome: 'response-admitted', response, status: 200 });
            return exchange;
          };
          await appendExchange('00000000-0000-4000-8000-000000000001', []);
          await expect(audit.readDesignReviewProof(sealed, reviewed, admission)).rejects.toThrow('url-session-audit-refused');
          const exchange = await appendExchange('00000000-0000-4000-8000-000000000002',
            [{ receiptId: id, toolUseId: 'toolu_own_read', digest: tool.digest, bytes: tool.bytes }]);
          const relayResponse = JSON.parse(fs.readFileSync(segment('design'), 'utf8').trimEnd().split('\n').at(-1)!);
          await expect(audit.readDesignReviewProof(sealed, reproduced, admission)).rejects.toThrow('url-session-audit-refused');
          await expect(audit.readDesignReviewProof(sealed, reviewed, { ...admission, originIds: ['origin:absent'] })).rejects.toThrow('url-session-audit-refused');
          await expect(audit.readDesignReviewProof(sealed, reviewed, { ...admission, digest: '3'.repeat(64) })).rejects.toThrow('url-session-audit-refused');
          const proof = await audit.readDesignReviewProof(sealed, reviewed, admission);
          expect(proof).toMatchObject({ run, runId, pinnedRevision, round: 1, site, artifactReadId: id,
            relayResponseSha256: relayResponse.sha256, verdictCallId: response.tool.id, verdictInputSha256: response.tool.inputSha256,
            packet: { sha256: metadata.original.sha256, files: ['index.html'], pages: ['index.html'] } });
          expect(() => assertUrlDesignReviewProofCurrent(proof)).not.toThrow();
          expect(() => assertUrlDesignReviewProofCurrent({ ...proof })).toThrow('url-session-audit-refused');
          const checked = { number: 0, checkSha256: 'f'.repeat(64), verdictSha256: 'e'.repeat(64) };
          await expect(other.audit.commitDesignVerdict(proof, checked, submission)).rejects.toThrow('url-session-audit-refused');
          await expect(audit.commitDesignVerdict({ ...proof }, checked, submission)).rejects.toThrow('url-session-audit-refused');
          await expect(audit.commitDesignVerdict(proof, checked, tool)).rejects.toThrow('url-session-audit-refused');
          await expect(audit.commitDesignVerdict(proof, checked, { ...submission, inputSha256: tool.inputSha256 }))
            .rejects.toThrow('url-session-audit-refused');
          reviewOpen = false;
          expect(() => assertUrlDesignReviewProofCurrent(proof)).toThrow('url-session-audit-refused');
          await expect(audit.commitDesignVerdict(proof, checked, submission)).rejects.toThrow('url-session-audit-refused');
          expect(audit.summary().captured['design-verdict']).toBe(0);
          const receiptProof = await audit.readDesignReviewProof(sealed, reproducedForReceipt, admission);
          expect(receiptProof).not.toBe(proof);
          expect(receiptProof).toEqual(proof);
          await expect(audit.commitDesignVerdict(receiptProof, checked, submission)).resolves.toBeUndefined();
          await expect(audit.commitDesignVerdict(receiptProof, checked, submission)).rejects.toThrow('url-session-audit-refused');
          expect(audit.summary().captured['design-verdict']).toBe(1);
          const recordedVerdict = JSON.parse(fs.readFileSync(segment('design'), 'utf8').trimEnd().split('\n').at(-1)!);
          expect(recordedVerdict.event).toMatchObject({ kind: 'design-verdict', role: 'design',
            payload: { deliverySha256: sealed.eventSha256, artifactReadId: id, relayResponseSha256: relayResponse.sha256,
              verdictCallId: response.tool.id, checked, toolReceipt: submission } });
          expect(() => assertUrlDesignReviewProofCurrent(receiptProof)).not.toThrow();
          await appendRelay({ ...exchange, event: 'response-refused', outcome: 'refused', status: 200 });
          expect(() => assertUrlDesignReviewProofCurrent(receiptProof)).toThrow('url-session-audit-refused');
          const exact = reproducedMetadata;
          reproducedMetadata = { ...exact, view: { ...exact.view, sha256: '8'.repeat(64) } };
          await expect(validate(audit, sealed, reproduced)).rejects.toThrow('url-session-audit-refused');
          reproducedMetadata = exact;
          await expect(validate(audit, sealed, reproduced)).rejects.toThrow('url-session-audit-refused');
        } finally { clock.mockRestore(); }
      }
      expect(audit.summary().captured['design-delivery']).toBe(1);
      const bytes = fs.readFileSync(segment('design'), 'utf8');
      expect(bytes).not.toContain('OWN UNEXPOSED RENDER');
      expect(bytes).not.toContain('OWN_RAW_PARENT_ID');
      expect(bytes).not.toContain(run);
    } finally {
      read.mockRestore();
      inspect.mockRestore();
      inputs.mockRestore();
      lease.mockRestore();
      await audit.close();
      await other.audit.close();
      fs.rmSync(sitePath, { recursive: true, force: true });
      if (mode.startsWith('ordered')) for (const file of ['reviews/checks/design-verdict-0.json', 'reviews/design-verdict-0.json', 'reviews/design-verdict-999.json']) fs.rmSync(path.join(run, file), { force: true });
    }
  });
});

describe('URL stored launch history', () => {
  it('writes fixed exclusive0600 helper files with exact prompt/profile/command/session identities and Inferred captures', async () => {
    for (const role of ['inventory', 'fidelity', 'design']) {
      const input = options(role), result = await writeUrlLaunchHistory(input), record = JSON.parse(fs.readFileSync(result.file!, 'utf8'));
      expect(result.file).toBe(historyPath(role)); expect(fs.statSync(result.file!).mode & 0o777).toBe(0o600);
      expect(record.form).toEqual({ value: 'syzygy-launched', declaredBy: 'syzygy', label: 'Inferred' });
      expect(record).toMatchObject({ format: 'polaris-dossier-url-launch-history/1', promptSha256: sha256(promptText),
        actualInputPacketSha256: sha256(input.plan.profile.input.initialPrompt), commandSha256: input.plan.declaration.commandSha256,
        sessionId: input.plan.profile.input.sessionId, compiledProfileSha256: sha256(input.plan.profile.canonicalText),
        capture: { pid: 1234, startedAt: '2026-11-19T00:00:00.000Z', unknownReason: null, label: 'Inferred' }, label: 'Inferred' });
      expect(record.promptSha256).not.toBe(record.actualInputPacketSha256);
      const text = fs.readFileSync(result.file!, 'utf8'); expect(text).not.toContain('Observed'); expect(text).not.toContain(promptText); expect(text).not.toContain(input.plan.profile.input.initialPrompt);
      await expect(writeUrlLaunchHistory(input)).rejects.toThrow('url-launch-history-unavailable');
    }
  });
  it('issues an opaque capability for exact durable bytes and refuses a same-byte prompt replacement', async () => {
    const { capability, file } = await writeUrlLaunchHistory(options());
    expect(capability).not.toBeNull();
    const bytes = fs.readFileSync(file!);
    const identity = inspectUrlLaunchHistory(capability!);
    expect(identity).toMatchObject({ role: 'inventory', sha256: sha256(bytes), file: 'inventory/session-1.launch.json',
      promptRecordSha256: sha256(fs.readFileSync(promptPath('inventory'))), promptSha256: sha256(promptText) });
    expect(identity.plan).toBe(options().plan);
    identity.bytes.fill(0);
    expect(Buffer.from(inspectUrlLaunchHistory(capability!).bytes)).toEqual(bytes);
    expect(() => inspectUrlLaunchHistory({ ...capability! })).toThrow('url-launch-history-unavailable');
    const prompt = promptPath('inventory'), sibling = prompt + '.replacement';
    fs.writeFileSync(sibling, fs.readFileSync(prompt)); fs.renameSync(sibling, prompt);
    expect(() => inspectUrlLaunchHistory(capability!)).toThrow('url-launch-history-unavailable');
  });

  it('authenticates each exact helper history in product contexts after its own durable host audit', async () => {
    const fixture = productFixture(), { bridge, ledger } = fixture;
    const { audit, attempt, segment } = await auditFixture(fixture.originPolicy.sha256, 'history-products');
    try {
      const operations = { inventory: 'inventory-check', fidelity: 'review-check', design: 'review-packet' } as const;
      for (const role of helperRoles) {
        const relative = URL_HELPER_LAUNCH_FILES[role], begin = () => bridge.beginRead({ operation: operations[role], deadline: Date.now() + 2000 });
        const { capability, file } = await writeUrlLaunchHistory(options(role));
        const bytes = fs.readFileSync(file!);
        expect(() => bridge.readProduct(begin(), relative)).toThrow('unsupported-launch');
        await expect(bridge.registerLaunchHistory(capability! as never)).rejects.toThrow('url-run-artifacts-unavailable');
        await expect(audit.commitLaunchHistory(capability!)).rejects.toThrow('url-session-audit-refused');
        await attempt(role);
        const committed = await audit.commitLaunchHistory(capability!);
        await expect(audit.commitLaunchHistory(capability!)).rejects.toThrow('url-session-audit-refused');
        await expect(bridge.registerLaunchHistory({ ...committed })).rejects.toThrow('url-run-artifacts-unavailable');
        fixture.current.mockClear();
        const registration = bridge.registerLaunchHistory(committed);
        expect(fixture.current).toHaveBeenCalledTimes(6);
        await registration;
        expect(fixture.current).toHaveBeenCalledTimes(13);
        const entry = JSON.parse(fs.readFileSync(segment(role), 'utf8').trim().split('\n').at(-1)!);
        expect(entry.event).toEqual({ kind: 'launch-history', role, scope: audit.scope(role), payload: {
          file: relative, recordSha256: sha256(bytes), recordBytes: bytes.length, sessionId: options(role).plan.profile.input.sessionId,
          promptSha256: sha256(promptText), promptRecordSha256: sha256(fs.readFileSync(promptPath(role))) } });
        expect(inspectCommittedUrlLaunchHistory(committed).eventSha256).toBe(entry.sha256);
        const context = begin(), { current } = fixture;
        current.mockClear();
        const result = bridge.readProduct(context, relative);
        expect(result.kind).toBe('present'); expect(Buffer.from(result.bytes!)).toEqual(bytes);
        expect(current).toHaveBeenCalledTimes(2);
        const withdrawn = begin();
        current.mockClear().mockReturnValueOnce(true).mockReturnValueOnce(false);
        expect(() => bridge.readProduct(withdrawn, relative)).toThrow('url-run-artifacts-unavailable');
        expect(current).toHaveBeenCalledTimes(2);
        expect(() => bridge.readProduct(withdrawn, relative)).toThrow('url-run-artifacts-unavailable');
        expect(ledger.metadata(result.receipt).digest).toBe(sha256(bytes));
        expect(bridge.revalidateRead(context).metadata.records).toEqual([expect.objectContaining({ path: relative, sha256: sha256(bytes) })]);
        if (role === 'inventory') {
          const { effectiveDeclaration: _sidecar, ...base } = fixture.artifactOptions;
          const other = createUrlRunArtifacts(base);
          other.registerInitial(fixture.initial);
          await expect(other.registerLaunchHistory(committed)).rejects.toThrow('url-run-artifacts-unavailable');
        }
        if (role === 'fidelity') {
          const copy = file + '.replacement'; fs.writeFileSync(copy, bytes, { mode: 0o600 }); fs.renameSync(copy, file!);
          expect(() => bridge.revalidateRead(context)).toThrow('url-run-artifacts-unavailable');
        } else if (role === 'design') {
          expect(await audit.close()).toMatchObject({ closed: true, captured: { 'launch-history': 3 } });
          expect(bridge.revalidateRead(context).metadata.records[0]).toMatchObject({ path: relative, sha256: sha256(bytes) });
          fs.appendFileSync(segment(role), ' ');
          expect(() => bridge.revalidateRead(context)).toThrow('url-run-artifacts-unavailable');
        } else {
          const prompt = promptPath(role), replacement = prompt + '.registered-replacement';
          fs.writeFileSync(replacement, fs.readFileSync(prompt), { mode: fs.statSync(prompt).mode & 0o777 });
          fs.renameSync(replacement, prompt);
          expect(() => bridge.revalidateRead(context)).toThrow('url-run-artifacts-unavailable');
          expect(() => bridge.readProduct(begin(), relative)).toThrow('url-run-artifacts-unavailable');
        }
      }
    } finally { await audit.close(); }
  });

  it('refuses a later writer and audit against a byte-identical replacement of the registered prompt', async () => {
    const { bridge, originPolicy } = productFixture();
    const prompt = promptPath('inventory'), original = fs.readFileSync(prompt), originalInode = fs.statSync(prompt, { bigint: true }).ino;
    const replacement = prompt + '.issued-replacement';
    fs.writeFileSync(replacement, original, { mode: fs.statSync(prompt).mode & 0o777 }); fs.renameSync(replacement, prompt);
    expect(fs.statSync(prompt, { bigint: true }).ino).not.toBe(originalInode);
    expect(fs.readFileSync(prompt)).toEqual(original);
    const { audit, attempt } = await auditFixture(originPolicy.sha256, 'prior-prompt-identity');
    try {
      await attempt('inventory');
      const history = await writeUrlLaunchHistory(options());
      const committed = await audit.commitLaunchHistory(history.capability!);
      expect(inspectCommittedUrlLaunchHistory(committed).history.sha256).toBe(sha256(fs.readFileSync(history.file!)));
      await expect(bridge.registerLaunchHistory(committed)).rejects.toThrow('url-run-artifacts-unavailable');
    } finally { await audit.close(); }
  });

  it('keeps a launch history unpublished while resource polls run and registers each file once', async () => {
    const { bridge, originPolicy } = productFixture();
    const { audit, attempt } = await auditFixture(originPolicy.sha256, 'history-registration-poll');
    const inspect = vi.spyOn(sessionAudit, 'inspectCommittedUrlLaunchHistory');
    try {
      await attempt('inventory');
      const history = await writeUrlLaunchHistory(options());
      const committed = await audit.commitLaunchHistory(history.capability!);
      const file = URL_HELPER_LAUNCH_FILES.inventory;
      const begin = () => bridge.beginRead({ operation: 'inventory-check', deadline: Date.now() + 2000 });
      const first = bridge.registerLaunchHistory(committed);
      expect(inspect).toHaveBeenCalledExactlyOnceWith(committed);
      expect(() => bridge.readProduct(begin(), file)).toThrow('unsupported-launch');
      await Promise.all([
        expect(first).resolves.toBeUndefined(),
        expect(bridge.registerLaunchHistory(committed)).rejects.toThrow('url-run-artifacts-unavailable'),
      ]);
      expect(inspect.mock.calls).toEqual([[committed], [committed], [committed]]);
      expect(bridge.readProduct(begin(), file).bytes).toEqual(Uint8Array.from(fs.readFileSync(history.file!)));
      expect(inspect).toHaveBeenLastCalledWith(committed);
      expect(inspect).toHaveBeenCalledTimes(4);
    } finally { inspect.mockRestore(); await audit.close(); }
  });

  it('keeps helper history unpublished when the sample fails during registration', async () => {
    const { bridge, originPolicy } = productFixture();
    const { audit, attempt } = await auditFixture(originPolicy.sha256, 'history-registration-sample-failure');
    const inspect = vi.spyOn(sessionAudit, 'inspectCommittedUrlLaunchHistory');
    try {
      await attempt('inventory');
      const history = await writeUrlLaunchHistory(options());
      const committed = await audit.commitLaunchHistory(history.capability!);
      await expect(bridge.registerLaunchHistory(committed, async () => false)).rejects.toThrow('url-run-artifacts-unavailable');
      expect(inspect).toHaveBeenCalledExactlyOnceWith(committed);
      const context = bridge.beginRead({ operation: 'inventory-check', deadline: Date.now() + 2000 });
      expect(() => bridge.readProduct(context, URL_HELPER_LAUNCH_FILES.inventory)).toThrow('unsupported-launch');
    } finally { inspect.mockRestore(); await audit.close(); }
  });

  it('checks authority after yielding before reopening the launch audit', async () => {
    const { bridge, originPolicy, current } = productFixture();
    const { audit, attempt } = await auditFixture(originPolicy.sha256, 'history-registration-withdrawn');
    const inspect = vi.spyOn(sessionAudit, 'inspectCommittedUrlLaunchHistory');
    try {
      await attempt('inventory');
      const history = await writeUrlLaunchHistory(options());
      const committed = await audit.commitLaunchHistory(history.capability!);
      const withdrawn = new Promise<void>(resolve => setImmediate(() => { current.mockReturnValue(false); resolve(); }));
      await Promise.all([
        withdrawn,
        expect(bridge.registerLaunchHistory(committed)).rejects.toThrow('url-run-artifacts-unavailable'),
      ]);
      expect(inspect).toHaveBeenCalledExactlyOnceWith(committed);
      current.mockReturnValue(true);
      const context = bridge.beginRead({ operation: 'inventory-check', deadline: Date.now() + 2000 });
      expect(() => bridge.readProduct(context, URL_HELPER_LAUNCH_FILES.inventory)).toThrow('unsupported-launch');
    } finally { inspect.mockRestore(); await audit.close(); }
  });

  it('refuses launch history when its protected audit changes during registration', async () => {
    const { bridge, originPolicy } = productFixture();
    const { audit, attempt, segment } = await auditFixture(originPolicy.sha256, 'history-registration-audit');
    try {
      await attempt('inventory');
      const history = await writeUrlLaunchHistory(options());
      const committed = await audit.commitLaunchHistory(history.capability!);
      const changing = new Promise<void>((resolve, reject) => setImmediate(() => {
        try { fs.appendFileSync(segment('inventory'), ' '); resolve(); }
        catch (error) { reject(error); }
      }));
      await Promise.all([
        changing,
        expect(bridge.registerLaunchHistory(committed)).rejects.toThrow('url-run-artifacts-unavailable'),
      ]);
      const context = bridge.beginRead({ operation: 'inventory-check', deadline: Date.now() + 2000 });
      expect(() => bridge.readProduct(context, URL_HELPER_LAUNCH_FILES.inventory)).toThrow('unsupported-launch');
    } finally { await audit.close(); }
  });

  it.each([
    { role: 'inventory', phase: 'fsync', tamper: null },
    { role: 'design', phase: 'fsync', tamper: null },
    { role: 'design', phase: 'fsync', tamper: 'prefix' },
    { role: 'design', phase: 'fsync', tamper: 'tail' },
    { role: 'design', phase: 'fsync', tamper: 'unrelated-file' },
    { role: 'design', phase: 'before-write', tamper: null },
    { role: 'inventory', phase: 'after-write', tamper: null },
    { role: 'design', phase: 'after-write', tamper: null },
    { role: 'design', phase: 'after-write', tamper: 'tail' },
    { role: 'design', phase: 'after-write', tamper: 'short-write' },
    { role: 'design', phase: 'after-write', tamper: 'stamp' },
    { role: 'design', phase: 'after-write', tamper: 'mode' },
    { role: 'design', phase: 'after-write', tamper: 'hard-link' },
  ] as const)('checks already committed history during $role $phase with $tamper drift', async ({ role, phase, tamper }) => {
    const { bridge, originPolicy } = productFixture();
    const { audit, attempt, segment } = await auditFixture(originPolicy.sha256, `history-${phase}-${role}-${tamper ?? 'intact'}`);
    const file = segment(role), probe = await open(file, 'r');
    const proto = Object.getPrototypeOf(probe) as { sync: FileHandle['sync'];
      write: (this: FileHandle, buffer: Buffer, offset: number, length: number, position: null) => Promise<{ bytesWritten: number; buffer: Buffer }> };
    await probe.close();
    const sync = proto.sync, write = proto.write;
    let entered!: () => void, release!: () => void;
    const paused = new Promise<void>(resolve => { entered = resolve; }), gate = new Promise<void>(resolve => { release = resolve; });
    const pause = async (): Promise<void> => { entered(); await gate; };
    const target = (handle: FileHandle): boolean => fs.realpathSync(`/proc/self/fd/${handle.fd}`) === file;
    try {
      await attempt('inventory');
      const history = await writeUrlLaunchHistory(options());
      await bridge.registerLaunchHistory(await audit.commitLaunchHistory(history.capability!));
      const relative = URL_HELPER_LAUNCH_FILES.inventory, bytes = Uint8Array.from(fs.readFileSync(history.file!));
      const begin = () => bridge.beginRead({ operation: 'inventory-check', deadline: Date.now() + 2000 });
      const context = begin();
      expect(bridge.readProduct(context, relative).bytes).toEqual(bytes);
      const offset = fs.statSync(file).size;
      const syncSpy = vi.spyOn(proto, 'sync').mockImplementation(async function(this: FileHandle) {
        if (phase === 'fsync' && target(this)) await pause();
        await sync.call(this);
      });
      const writeSpy = vi.spyOn(proto, 'write').mockImplementation(async function(this: FileHandle, buffer, start, length, position) {
        const writingTarget = target(this);
        if (phase === 'before-write' && writingTarget) await pause();
        const result = await write.call(this, buffer, start, length, position);
        if (writingTarget) {
          if (tamper === 'prefix' || tamper === 'tail') {
            const external = fs.openSync(file, 'r+');
            try { fs.writeSync(external, Buffer.from(' '), 0, 1, tamper === 'prefix' ? 0 : offset); }
            finally { fs.closeSync(external); }
          } else if (tamper === 'short-write') fs.truncateSync(file, offset + length - 1);
          if (phase === 'after-write') await pause();
        }
        return result;
      });
      const writing = attempt(role).then(() => 'durable', () => 'refused');
      try {
        await Promise.race([paused, writing.then(() => { throw Error('fixture never reached the held step'); })]);
        const size = fs.statSync(file).size;
        if (phase === 'before-write') expect(size).toBe(offset);
        else expect(size).toBeGreaterThan(offset);
        expect(audit.summary()).toMatchObject({ poisoned: false, captured: { 'launch-attempt': 1, 'launch-history': 1 } });
        if (tamper === 'unrelated-file') {
          const before = segment('fidelity'), replacement = before + '.replacement';
          fs.writeFileSync(replacement, fs.readFileSync(before), { mode: 0o600 }); fs.renameSync(replacement, before);
        } else if (tamper === 'stamp') {
          expect(bridge.readProduct(begin(), relative).bytes).toEqual(bytes);
          fs.utimesSync(file, 1, 1);
        } else if (tamper === 'mode') fs.chmodSync(file, 0o700);
        else if (tamper === 'hard-link') fs.linkSync(file, file + '.alias');
        if (tamper) {
          expect(() => bridge.readProduct(begin(), relative)).toThrow('url-run-artifacts-unavailable');
          expect(() => bridge.revalidateRead(context)).toThrow('url-run-artifacts-unavailable');
        } else {
          expect(bridge.readProduct(begin(), relative).bytes).toEqual(bytes);
          expect(bridge.revalidateRead(context).metadata.records[0]!.sha256).toBe(sha256(bytes));
        }
      } finally { release(); await writing; syncSpy.mockRestore(); writeSpy.mockRestore(); }
      expect(await writing).toBe(tamper ? 'refused' : 'durable');
      expect(audit.summary().poisoned).toBe(tamper !== null);
      bridge.cancelRead(context);
    } finally { await audit.close(); }
  });

  it('refuses stale or incorrectly scoped audit registration with safe exact writer bytes', async () => {
    const { bridge } = productFixture(), capability = (await writeUrlLaunchHistory(options())).capability!;
    const { audit, attempt } = await auditFixture('f'.repeat(64), 'history-wrong-origin');
    try {
      await attempt('inventory', { viewSha256: '4'.repeat(64) });
      await expect(audit.commitLaunchHistory(capability)).rejects.toThrow('url-session-audit-refused');
      await attempt('inventory');
      const committed = await audit.commitLaunchHistory(capability);
      await expect(bridge.registerLaunchHistory(committed)).rejects.toThrow('url-run-artifacts-unavailable');
      const prompt = promptPath('inventory'), replacement = prompt + '.replacement';
      fs.writeFileSync(replacement, fs.readFileSync(prompt)); fs.renameSync(replacement, prompt);
      expect(() => inspectCommittedUrlLaunchHistory(committed)).toThrow('url-session-audit-refused');
    } finally { await audit.close(); }
  });

  it('refuses an exact audited attempt in a directory outside the genuine prepared view protections', async () => {
    const fixture = productFixture(), capability = (await writeUrlLaunchHistory(options())).capability!;
    const { audit, attempt } = await auditFixture(fixture.originPolicy.sha256, 'history-unprotected', planning.root);
    try {
      await attempt('inventory');
      await expect(audit.commitLaunchHistory(capability)).rejects.toThrow('url-session-audit-refused');
      expect(audit.summary()).toMatchObject({ durableRecords: 5, captured: { 'launch-history': 0 } });
    } finally { await audit.close(); }
  });

  it('returns author metadata without a helper file and discloses missing actual runtime captures', async () => {
    const result = await writeUrlLaunchHistory({ ...options('author'), capture: { pid: 'Unknown', startedAt: 'Unknown' } });
    expect(result.file).toBeNull(); expect(result.capability).toBeNull(); expect(result.record.capture).toEqual({ pid: 'Unknown', startedAt: 'Unknown', unknownReason: 'runtime-capture-unavailable', label: 'Inferred' });
  });
  it('refuses copied plans, foreign run bindings, mismatched issued prompts and invalid captured PID without creating history', async () => {
    const input = options();
    for (const change of [{ plan: { ...input.plan } }, { runId: `run-${'e'.repeat(32)}` }, { compatiblePromptSha256: 'f'.repeat(64) }, { capture: { pid: 0, startedAt: 1 } }])
      await expect(writeUrlLaunchHistory({ ...input, ...change })).rejects.toThrow('url-launch-history-unavailable');
    expect(fs.existsSync(historyPath('inventory'))).toBe(false);
  });
  it('refuses revoked current, a policy mismatch, and detector failures before writing', async () => {
    const input = options();
    for (const change of [{ current: () => false }, { screen: { ...input.screen, policySha256: 'f'.repeat(64) } },
      { screen: { ...input.screen, screenSecrets: (text: string) => text.includes('polaris-dossier-url-launch-history') ? 'own-detector' : undefined } }])
      await expect(writeUrlLaunchHistory({ ...input, ...change } as typeof input)).rejects.toThrow('url-launch-history-unavailable');
    expect(fs.existsSync(historyPath('inventory'))).toBe(false);
  });
  it('refuses a foreign directory with the same runId and byte-identical replaced prompt records', async () => {
    const input = options(), foreign = path.join(tempDir('foreign-launch-history-'), input.runId); fs.mkdirSync(foreign);
    fs.copyFileSync(path.join(input.run, 'run.json'), path.join(foreign, 'run.json'));
    await expect(writeUrlLaunchHistory({ ...options('author'), run: foreign })).rejects.toThrow('url-launch-history-unavailable');
    const prompt = promptPath('inventory'), bytes = fs.readFileSync(prompt); let calls = 0;
    await expect(writeUrlLaunchHistory({ ...input, current: () => { if (++calls === 2) { fs.renameSync(prompt, prompt + '-old'); fs.writeFileSync(prompt, bytes); } return true; } })).rejects.toThrow('url-launch-history-unavailable');
    expect(calls).toBe(2); expect(fs.existsSync(historyPath('inventory'))).toBe(false);
  });
  it('refuses a symlink destination and helper directory replaced while current is pending without writing through either', async () => {
    const input = options(), target = path.join(planning.root, 'foreign-owned-fixture'); fs.writeFileSync(target, 'KEEP OWN BYTES');
    fs.symlinkSync(target, historyPath('inventory')); await expect(writeUrlLaunchHistory(input)).rejects.toThrow(); expect(fs.readFileSync(target, 'utf8')).toBe('KEEP OWN BYTES'); fs.unlinkSync(historyPath('inventory'));
    const directory = path.join(input.run, 'inventory'), moved = directory + '-old'; let calls = 0;
    try {
      await expect(writeUrlLaunchHistory({ ...input, current: () => { if (++calls === 2) { fs.renameSync(directory, moved); fs.mkdirSync(directory); } return true; } })).rejects.toThrow();
      expect(fs.readdirSync(directory)).toEqual([]); expect(fs.existsSync(path.join(moved, 'session-1.launch.json'))).toBe(false);
    } finally { if (fs.existsSync(moved)) { fs.rmSync(directory, { recursive: true }); fs.renameSync(moved, directory); } }
  });
  it('requires Inferred URL history only under actual protected effective authority and preserves legacy marker Observed behavior', () => {
    const run = ownRun(), url = bindUrl(run), inferred = { value: 'syzygy-launched', declaredBy: 'syzygy', label: 'Inferred' }, observed = { ...inferred, label: 'Observed' };
    expect(launchFormRefusal(run, inferred, url.authority)).toBeNull(); expect(launchFormRefusal(run, observed, url.authority)).not.toBeNull();
    expect(launchFormRefusal(run, inferred, () => ({ kind: 'operator' }))).not.toBeNull();
    fs.appendFileSync(path.join(run, URL_RUN_SIDECAR), ' '); expect(launchFormRefusal(run, inferred, url.authority)).not.toBeNull();
    const legacy = tempDir('legacy-launched-'); writeLaunchedMarker(legacy, 'run-legacy', Date.UTC(2026, 10, 19));
    expect(launchFormRefusal(legacy, observed)).toBeNull(); expect(launchFormRefusal(legacy, inferred)).not.toBeNull();
    const operator = tempDir('operator-launched-'); expect(launchFormRefusal(operator, { value: 'terminal', declaredBy: 'operator', label: 'Inferred' })).toBeNull();
  });
});
