import { initializeUrlMachineStore } from './url-machine-store.js';
import { reconstructColdUrlRunMachineHistory } from './url-machine-cold-history.js';
import { verifyUrlRecoveryProducts, type UrlVerifiedRecoveryProducts } from './url-recovery-products.js';
import { urlHelperLaunchFile } from './url-launch-history.js';
import type { UrlRolePlan } from './url-role-plan.js';
import type { inspectCommittedUrlLaunchHistory } from './url-session-audit.js';
import type { UrlRunMachineClosedHistory } from './url-run-machine.js';
import * as fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { describe, expect, it, vi } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { sha256 } from '@syzygy/support';
import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { buildDossierScreen } from './screen.js';
import { parseRunConfig } from './run-config.js';
import { DOSSIER_CONTENT_CLASSES, NO_WORK_ITEM_REASON, recordRunConfig, sourceBindingSha256, encodeRunRecord } from './run-record.js';
import { checkDraftShape, draftSchemaDocument, inventorySchemaDocument, verdictSchemaDocument, designVerdictSchemaDocument,
  localDraftSchema, localInventorySchema, localVerdictSchema, localDesignVerdictSchema, UNDERSTANDING_ITEMS } from './draft-schema.js';
import { createSessionProfile } from './session-profile.js';
import { createUrlOriginLedger } from './url-origin-ledger.js';
import { createUrlRunArtifacts, verifyUrlFrozenProductHistory, type UrlRunArtifactsOptions } from './url-run-artifacts.js';
import * as productReads from './url-product-reads.js';
import type { SessionToolsReceipt } from './session-tools.js';
import type { BrokerResponse } from './broker.js';
import type { StartSessionsReport } from './session-handover.js';
import type { SessionAdmission } from './session-egress-policy.js';
import { runStatus } from './status.js';
import { buildDesignPacket } from './design-review.js';
import type { DossierRenderer } from './render.js';
import type { FigureLayout } from './figure-fit.js';
import { generationSourcesForBody } from '@syzygy/polaris-generation-core/live';
import { createUrlRunDeclaration, urlSourceTransportIdentity, URL_PROFILE_ID } from './url-run-record.js';
import { bindUrlSourceReader } from './url-source-reader.js';
import { beginRunProductReads } from './url-operation-products.js';
import { reverifyPinnedRevision } from './reverify.js';
import { checkDraft } from './check.js';
import { buildFidelityPacket } from './review-packet.js';
import { reviewOfRecord } from './review.js';
import { inventoryOfRecord } from './inventory.js';
import { fixtureSources } from './full-run.testkit.js';
import { issueBrief, shapePackSelection, type BriefReport } from './brief.js';

// Alias component tests substitute only the upstream audit capability check.
// Actual protected files, immutable physical records, profile/prompt bindings,
// receipt isolation and read-context revalidation run. No native process or
// old process authority is created by this explicit unit substitution.
const committedLaunches = vi.hoisted(() => new WeakMap<object, unknown>());
vi.mock('./url-session-audit.js', async original => ({ ...await original<typeof import('./url-session-audit.js')>(),
  inspectCommittedUrlLaunchHistory: (value: object) => { const found = committedLaunches.get(value); if (!found) throw Error('own unissued audit capability'); return found; },
}));

const canonical = (v: unknown): string => encodeCanonicalJson(v, { maxBytes: 2_097_152, maxNodes: 65_536, maxDepth: 32 });
const b = (v: unknown): Buffer => Buffer.from(canonical(v));
const roles = ['author', 'inventory', 'fidelity', 'design'] as const;
type Role = typeof roles[number];
function fixture(source = 'Own pinned source.\n', extraFiles: Readonly<Record<string, string>> = {}, policyVersion: 'v1' | 'v2' = 'v1', retainedUrl = false) {
  const root = tempDir('url-artifacts-'), runId = `run-${'c'.repeat(32)}`, run = path.join(root, runId), clone = path.join(root, 'own-source');
  fs.mkdirSync(run); const object = (kind: string, bytes: Buffer): string => {
    const raw = Buffer.concat([Buffer.from(`${kind} ${bytes.length}\0`), bytes]), id = createHash('sha1').update(raw).digest('hex');
    const file = path.join(clone, '.git/objects', id.slice(0, 2), id.slice(2)); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, deflateSync(raw)); return id;
  };
  const blob = object('blob', Buffer.from(source));
  const sourceObjects = new Map([['own.ts', blob], ...Object.entries(extraFiles).map(([file, text]) => [file, object('blob', Buffer.from(text))] as const)]);
  const tree = object('tree', Buffer.concat([...sourceObjects].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .flatMap(([file, id]) => [Buffer.from(`100644 ${file}\0`), Buffer.from(id, 'hex')])));
  const pin = object('commit', Buffer.from(`tree ${tree}\nauthor Own <own@example.invalid> 0 +0000\ncommitter Own <own@example.invalid> 0 +0000\n\nOwn.\n`));
  const policyPath = `.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-${policyVersion}.json`;
  const policyDoc = JSON.parse(fs.readFileSync(new URL(`../../../${policyPath}`, import.meta.url), 'utf8'));
  policyDoc.detectors.push({ id: 'own-marker', kind: 'literal-fragment', values: ['OWN_SECRET_CANARY'] });
  const basePolicyBytes = Buffer.from(JSON.stringify(policyDoc)), loaded = buildDossierScreen(basePolicyBytes, true, null, 'private'); if (!loaded.ok) throw Error(loaded.why);
  const parsed = parseRunConfig(JSON.stringify({ operator: 'own', agentTool: 'claude-code', agentToolVersion: '2.1.327', agentProvider: 'anthropic', model: 'claude-sonnet-4-6',
    deadline: 'PT1H', agentTokenBudget: 1000, agentTurnBudget: 10, maxRepairCycles: 2, maxQuestions: 1, audience: 'Own readers', operatorIsOwner: false })); if (!parsed.ok) throw Error('config');
  const policy = { path: policyPath, commit: 'a'.repeat(40), policyId: policyDoc.policyId, policyVersion: policyDoc.policyVersion, sha256: sha256(basePolicyBytes) };
  const record = recordRunConfig(parsed.config, { repository: { url: 'own.example.invalid/source', repositoryId: 'own', role: 'observed-source' }, clone: { path: clone, declaredBy: 'operator', label: 'Inferred', use: 'read' },
    pinnedRevision: { commit: pin, label: 'own', pinnedAt: '2026-11-19T00:00:00.000Z' }, screeningPolicy: policy, contentClasses: DOSSIER_CONTENT_CLASSES,
    visibility: { value: 'private', source: 'declaration', declaredBy: 'own', label: 'Inferred' }, governed: { kind: 'non-governed', because: ['own'] }, workItem: { identity: null, reason: NO_WORK_ITEM_REASON } });
  const originBytes = fs.readFileSync(new URL('../../../openspec/changes/dossier-url-declared-source-run/proposed/policies/POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1.json', import.meta.url));
  let current = true; const fixed = [{ id: 'origin:policy', kind: 'policy', bytes: Buffer.from('Own fixed policy.') }, { id: 'origin:control', kind: 'run-control', bytes: b({ runId, operation: 'own' }) },
    { id: 'origin:structure', kind: 'structure', bytes: b({ tools: ['source_read', 'artifact_read', 'artifact_write', 'dossier_step'] }) }] as const;
  const schemaDocuments = { draft: b(draftSchemaDocument({ pinnedRevision: pin, maxQuestions: 1 })), inventory: b(inventorySchemaDocument({ pinnedRevision: pin })),
    fidelity: b(verdictSchemaDocument({ pinnedRevision: pin })), design: b(designVerdictSchemaDocument({ pinnedRevision: pin })) };
  const sessionId = (role: Role): string => `00000000-0000-4000-8000-${String(roles.indexOf(role) + 1).padStart(12, '0')}`;
  const validate = (schema: ReturnType<typeof localDraftSchema>, role: Role, v: unknown): boolean => !!v && typeof v === 'object' && !Array.isArray(v)
    && (v as Record<string, unknown>)['sessionId'] === sessionId(role) && checkDraftShape(schema, v).length === 0;
  const verifyCurrent = vi.fn(() => current);
  const ledgerOptions: Parameters<typeof createUrlOriginLedger>[0] = { runId, record, screen: loaded.screen, basePolicyBytes,
    originPolicy: { binding: { path: '.syzygy/governance/policies/POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1.json', commit: 'a'.repeat(40), policyId: 'POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1', policyVersion: '1.0.0', sha256: sha256(originBytes) }, bytes: originBytes },
    current: verifyCurrent, fixed, schemas: { draft: v => validate(localDraftSchema({ pinnedRevision: pin, maxQuestions: 1 }, 'home', 'absent'), 'author', v),
      inventory: v => validate(localInventorySchema({ pinnedRevision: pin }), 'inventory', v), 'fidelity-verdict': v => validate(localVerdictSchema({ pinnedRevision: pin }), 'fidelity', v),
      'design-verdict': v => validate(localDesignVerdictSchema({ pinnedRevision: pin }), 'design', v) } };
  const ledger = createUrlOriginLedger(ledgerOptions);
  const [rolePolicy, runControl, toolMetadata] = fixed.map(f => ledger.fixed(f.id, f.bytes)), parents = [rolePolicy!, runControl!, toolMetadata!];
  const initialReceipts = Object.fromEntries(roles.map(role => [role, ledger.compose(Buffer.from(`Own ${role} initial prompt.`), parents)])) as Record<Role, ReturnType<typeof ledger.compose>>;
  const plans = roles.map(role => { const p = createSessionProfile({ binding: { run: runId, role, sourceBinding: sourceBindingSha256(record.subject), policy: policy.sha256, provider: 'anthropic', model: 'claude-sonnet-4-6' },
    sessionId: sessionId(role), systemPrompt: `Own ${role} system policy.`, initialPrompt: `Own ${role} initial prompt.`, utcDate: '2026-11-19', kernelRelease: 'own-linux' }); if (!p.ok) throw Error('profile'); return { role, profile: p.value.profile }; });
  const origins = { ledger, roots: { rolePolicy, runControl, toolMetadata }, initialReceipts, schemaDocuments } as UrlRunArtifactsOptions['origins'];
  const replyQueue: BrokerResponse[] = [], calls: string[][] = [];
  let options: UrlRunArtifactsOptions = { run, record, origins, roles: plans, current: verifyCurrent, helpText: 'syzygy dossier own fixed help\n',
    runDossier: () => async argv => { calls.push([...argv]); const next = replyQueue.shift(); if (!next) throw Error('no own response'); return next; } };
  const write = (relative: string, bytes: string | Uint8Array): void => { const file = path.join(run, relative); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes); };
  const dir = (role: Role): string => role === 'author' ? run : `${run}.sessions/${role === 'inventory' ? 'session' : role}-1`;
  const produceFixtureBrief = (): BriefReport => {
    const schema = `${JSON.stringify(draftSchemaDocument({ pinnedRevision: pin, maxQuestions: 1 }), null, 2)}\n`, briefText = 'Own actual host-issued no-execution brief.\n';
    write('draft.schema.json', schema); write('brief.md', briefText);
    const briefRecord = { format: 'polaris-dossier-brief/1', role: 'authoring', runId, pinnedRevision: pin, issuedAt: '2026-11-19T00:00:00.000Z',
      sourceBindingSha256: sourceBindingSha256(record.subject), shapePacks: shapePackSelection({ state: 'derived',
        serverEntry: { rule: 'server-entry', ruleVersion: 1, holds: false, paths: [], pathsNotListed: 0 } }).record, executionRule: { arm: 'sec-3' },
      agent: { tool: record.declared.agentTool, provider: record.declared.agentProvider },
      files: { brief: { name: 'brief.md', sha256: sha256(briefText) }, draftSchema: { name: 'draft.schema.json', sha256: sha256(schema) } } }; write('brief.json', b(briefRecord));
    return { command: 'brief', outcome: 'issued', run, brief: path.join(run, 'brief.md'), draftSchema: path.join(run, 'draft.schema.json'), pinnedRevision: pin,
      issuedAt: briefRecord.issuedAt, deadlineEndsAt: '2026-11-19T01:00:00.000Z', executionRule: { arm: 'sec-3' }, disclosures: [] } as unknown as BriefReport;
  };
  const produceInitial = (brief = produceFixtureBrief()): { brief: BriefReport; sessions: StartSessionsReport } => {
    const sessions = roles.filter(role => role !== 'author').map(role => {
      fs.mkdirSync(dir(role), { recursive: true }); const prompt = `Own fixed ${role} waiting prompt.`, promptSha256 = sha256(prompt);
      const item = { role: role === 'inventory' ? 'inventory' : 'review', ...(role === 'inventory' ? {} : { kind: role }), session: 1, directory: dir(role), prompt, promptSha256, commands: { terminal: 'Own', bang: null, note: 'Own' } };
      const inventory = 'Own actual inventory brief, paths are metadata.\n'; if (role === 'inventory') fs.writeFileSync(path.join(dir(role), 'inventory-brief.md'), inventory);
      write(role === 'inventory' ? 'inventory/session-1.json' : `reviews/${role}-session-1.json`, b({ format: 'polaris-dossier-session-prompt/2', role: item.role,
        ...(role === 'inventory' ? { brief: { name: 'inventory-brief.md', sha256: sha256(inventory) } } : { kind: role }), runId, pinnedRevision: pin, session: 1,
        directory: path.relative(path.dirname(run), dir(role)), prompt, promptSha256 })); return item;
    });
    return { brief, sessions: { command: 'session-prompt', outcome: 'issued', role: 'all', run, sessions } as unknown as StartSessionsReport };
  };
  const freshOrigins = (ledgerRunId = runId): UrlRunArtifactsOptions['origins'] => {
    const next = createUrlOriginLedger({ ...ledgerOptions, runId: ledgerRunId });
    const [rolePolicy, runControl, toolMetadata] = fixed.map(f => next.fixed(f.id, f.bytes));
    const roots = { rolePolicy: rolePolicy!, runControl: runControl!, toolMetadata: toolMetadata! };
    const initialReceipts = Object.fromEntries(roles.map(role => [role,
      next.compose(Buffer.from(`Own ${role} initial prompt.`), [roots.rolePolicy, roots.runControl, roots.toolMetadata])])) as Record<Role, ReturnType<typeof next.compose>>;
    return { ledger: next, roots, initialReceipts, schemaDocuments };
  };
  if (retainedUrl) {
    const H = 'e'.repeat(64), core = encodeRunRecord(record.declared, record.subject);
    const identity = urlSourceTransportIdentity('https://own.example.invalid/source'); if (!identity.ok) throw Error('own transport');
    const sourceTransport = { originalLocator: identity.originalLocator, destination: identity.destination, providerId: identity.providerId,
      acquisitionId: 'acq-0123456789abcdef0123456789abcdef', metadataClasses: ['code-structure'] as const, selectionOrigin: 'validated-destination-before-acquisition' as const,
      commandSha256: H, protocolSha256: H, configurationSha256: H, executableSha256: H, environmentSha256: H };
    const originPolicy = ledgerOptions.originPolicy.binding;
    const context = { runId, expectedBasePolicy: record.subject.screeningPolicy, expectedOriginPolicy: originPolicy, expectedSourceTransport: sourceTransport, expectedProfileSha256: H };
    const issued = createUrlRunDeclaration(core, { runId, originPolicy, sourceTransport, protectedAudit: `url-audit:${runId}`,
      inference: { provider: 'anthropic', tool: 'claude-code', toolVersion: '2.1.327', model: 'claude-sonnet-4-6', modelSelection: 'supported-default', profile: { id: URL_PROFILE_ID, sha256: H } },
      plannedOrigins: ledger.plannedOrigins(), roles: plans.map(p => ({ role: p.role, sessionId: p.profile.input.sessionId, profileId: URL_PROFILE_ID,
        compiledProfileSha256: p.profile.digest, commandSha256: H, instructionSha256: sha256(p.profile.input.systemPrompt), viewSha256: H,
        scaffoldSha256: H, mcpSha256: H, configurationSha256: H, executableSha256: H, inputPacketSha256: sha256(p.profile.input.initialPrompt),
        inputOriginId: ledger.metadata(initialReceipts[p.role]).id, capture: { pid: 'Unknown', startedAt: 'Unknown', finishedAt: 'Unknown', outcome: 'Unknown' } })) }, context);
    if (!issued.ok) throw Error(`own declaration ${issued.code}`);
    write('run.json', core); write('url-declaration.json', issued.text);
    options = { ...options, initializedCoreBytes: Buffer.from(core), effectiveDeclaration: { declaration: issued.declaration, bytes: Buffer.from(issued.text),
      context: { ...context, expectedSidecarSha256: issued.sha256 } } };
  }
  const bridge = createUrlRunArtifacts(options), initialize = () => bridge.registerInitial(produceInitial());
  const admission = (role: Role, classes = ledger.metadata(initialReceipts[role]).classes): SessionAdmission => ({ digest: 'd'.repeat(64), bytes: 10, classes, originIds: [...ledger.metadata(initialReceipts[role]).originIds, 'provider-response:1'] });
  const receipt = (role: Role, toolName: SessionToolsReceipt['toolName'], toolInput: Record<string, unknown>, reply: unknown): SessionToolsReceipt => {
    const canonicalText = canonical(reply); return { binding: plans.find(p => p.role === role)!.profile.input.binding, id: `tool-${sha256(canonical([role, toolInput, reply]))}`, kind: 'tool-result', toolName, toolInput,
      canonicalText, digest: sha256(canonicalText), bytes: Buffer.byteLength(canonicalText), classes: ['project-documentation'], originIds: ['FORGED_TAGS_HAVE_NO_AUTHORITY'] };
  };
  const draft = { schemaVersion: 'polaris-dossier-local-draft-v2', pinnedRevision: pin, sessionId: sessionId('author'), title: 'Own dossier',
    introduction: { id: 'intro', label: 'non-normative', text: 'Own introduction.' }, understanding: Object.fromEntries(UNDERSTANDING_ITEMS.map(key => [key, [{ id: `u-${key}`, label: 'unknown', reason: 'missing-evidence', statement: 'Own unknown.', scope: 'Own fixture.', citations: [] }]])),
    sections: [{ id: 'own-section', title: 'Own section', paragraphs: [{ id: 'own-p', label: 'non-normative', text: 'Own prose.', children: [] }], disposition: { kind: 'produced', assetIds: ['own-section'] } }],
    diagrams: [], deepDives: [], unresolved: [], discovery: { inspected: ['own.ts'], selected: [], excluded: [], unresolved: [], deferred: [], stoppingReason: 'Own scope.' }, clarifications: [], executions: [] };
  const inventory = { schemaVersion: 'polaris-dossier-local-inventory-v1', pinnedRevision: pin, sessionId: sessionId('inventory'),
    entries: [{ id: 'own-purpose', kind: 'purpose', label: 'inferred', statement: 'Own purpose.', citations: [{ id: 'own-cite', path: 'own.ts', startLine: 1, endLine: 1 }], quotations: [] }],
    coverage: { inspected: ['own.ts'], excluded: [], deferred: [], stoppingReason: 'Own scope.' } };
  const writeDraft = async () => { expect(checkDraftShape(localDraftSchema({ pinnedRevision: pin, maxQuestions: 1 }, 'home', 'absent'), draft)).toEqual([]); const bytes = b(draft); write('drafts/next.json', bytes); const raw = receipt('author', 'mcp__syzygy__artifact_write', { path: 'drafts/next.json', content: bytes.toString() },
    { ok: true, kind: 'artifact-written', path: 'drafts/next.json', sha256: sha256(bytes) }); await bridge.toolReceipt('author', raw, admission('author')); return { raw, bytes }; };
  const checkDoc = (draftBytes: Uint8Array) => ({ format: 'polaris-dossier-check/1', runId, revision: 0, supersedes: null, pinnedRevision: pin, checkedAt: '2026-11-19T00:00:01.000Z', outcome: 'passed',
    draft: { file: 'drafts/rev-0.json', sha256: sha256(draftBytes), bytes: draftBytes.length }, session: { sessionId: sessionId('author'), declaredBy: 'the authoring session', label: 'Inferred' }, findings: [],
    executionFlags: { applies: false, why: 'Own no execution.' }, quotations: [], excludedContent: [], citedBlobs: [{ path: 'own.ts', objectId: blob, read: true, outcome: 'admitted' }],
    screeningPolicy: { policyId: policy.policyId, policyVersion: policy.policyVersion, sha256: policy.sha256 }, credential: { required: false, why: 'Own no execution.' },
    limits: { repairCycles: { declared: 2, thisRevision: 0, label: 'Inferred', basis: 'Own' }, questions: { declared: 1, recorded: 0 }, deadline: { endsAt: '2026-11-19T01:00:00.000Z', label: 'Inferred', basis: 'Own' } }, label: 'Inferred' });
  const commitInventory = async (passed = true) => {
    const bytes = b(inventory), checked = { format: 'polaris-dossier-inventory-check/1', runId, revision: 0, supersedes: null, pinnedRevision: pin, checkedAt: '2026-11-19T00:00:01.000Z', outcome: passed ? 'passed' : 'findings',
      inventory: { file: 'inventory/rev-0.json', sha256: sha256(bytes), bytes: bytes.length }, session: { number: 1, sessionId: sessionId('inventory'), declaredBy: 'the inventory session', label: 'Inferred', distinctFrom: 'Own author.' },
      findings: [], quotations: [], excludedContent: [], citedBlobs: [{ path: 'own.ts', objectId: blob, read: true, outcome: 'admitted' }], screeningPolicy: { policyId: policy.policyId, policyVersion: policy.policyVersion, sha256: policy.sha256 },
      credential: { required: false, why: 'Own no execution.' }, limits: { repairCycles: { declared: 2, thisRevision: 0, label: 'Inferred', basis: 'Own' }, deadline: { endsAt: '2026-11-19T01:00:00.000Z', label: 'Inferred', basis: 'Own' } },
      counts: 'Own count.', completeness: { label: 'Inferred', basis: 'Own self report.' }, label: 'Inferred' };
    const result = { command: 'await', format: 'polaris-dossier-await/1', outcome: 'submitted', role: 'inventory', session: 1, passed,
      check: { command: 'inventory-check', run, checkFile: path.join(run, 'inventory/checks/rev-0.json'), ...checked, disclosures: [] }, next: 'Own next.', disclosures: [] };
    write('inventory/rev-0.json', bytes); const checkedBytes = `${JSON.stringify(checked, null, 2)}\n`; write('inventory/checks/rev-0.json', checkedBytes);
    const response = { stdout: JSON.stringify(result), stderr: '', exit: passed ? 0 : 1 }; replyQueue.push(response);
    const argv = ['dossier', 'await', dir('inventory'), '--submit', 'inventory.json', '--stdin', '--json'];
    await bridge.runDossier('inventory')(argv, bytes);
    const raw = receipt('inventory', 'mcp__syzygy__dossier_step', { argv, stdin: bytes.toString() }, { ok: true, kind: 'dossier-result', ...response });
    await bridge.toolReceipt('inventory', raw, admission('inventory')); expect(bridge.hasCommittedProduct('inventory/checks/rev-0.json', sha256(checkedBytes))).toBe(false);
    bridge.committed('inventory', raw.id); expect(bridge.hasCommittedProduct('inventory/checks/rev-0.json', sha256(checkedBytes))).toBe(true); return { bytes, checked, checkedBytes, raw, response, argv };
  };
  const commitCheck = async (commit = true) => {
    const draft = await writeDraft(); bridge.committed('author', draft.raw.id); write('drafts/rev-0.json', draft.bytes);
    const doc = checkDoc(draft.bytes), stored = `${JSON.stringify(doc, null, 2)}\n`; write('checks/rev-0.json', stored);
    const report = { command: 'check', run, checkFile: path.join(run, 'checks/rev-0.json'), ...doc, disclosures: [] }, response = { stdout: JSON.stringify(report), stderr: '', exit: 0 }, argv = ['dossier', 'check', run];
    replyQueue.push(response); await bridge.runDossier('author')(argv, null);
    const raw = receipt('author', 'mcp__syzygy__dossier_step', { argv }, { ok: true, kind: 'dossier-result', ...response }); await bridge.toolReceipt('author', raw, admission('author')); if (commit) bridge.committed('author', raw.id);
    return { ...draft, checkRaw: raw };
  };
  const producePacket = (draftBytes: Uint8Array, inventoryBytes: Uint8Array, mutate?: (doc: Record<string, unknown>) => void) => {
    const draftDoc = JSON.parse(Buffer.from(draftBytes).toString()); delete draftDoc.discovery;
    const doc = { format: 'polaris-dossier-fidelity-packet/1', kind: 'fidelity', runId, pinnedRevision: pin,
      draft: { revision: 0, sha256: sha256(draftBytes), omitted: ['discovery'], document: draftDoc },
      inventory: { revision: 0, sha256: sha256(inventoryBytes), coverage: { declaredBy: 'the inventory session', label: 'Inferred', basis: 'Own self report.' }, document: JSON.parse(Buffer.from(inventoryBytes).toString()) },
      spans: [{ id: 'span-1', path: 'own.ts', startLine: 1, endLine: 1, objectId: blob, outcome: 'admitted', text: source, citedBy: [{ subject: 'inventory', citationId: 'own-cite' }] }],
      screeningPolicy: { policyId: policy.policyId, policyVersion: policy.policyVersion, sha256: policy.sha256 }, criteria: ['Own fixed host criteria.'], verdictSchema: JSON.parse(schemaDocuments.fidelity.toString()) };
    mutate?.(doc); const bytes = `${JSON.stringify(doc, null, 2)}\n`, digest = sha256(bytes), round = 1, directory = path.join(dir('fidelity'), 'round-1'); fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, 'packet.json'), bytes); fs.writeFileSync(path.join(directory, 'packet.sha256'), `${digest}  packet.json\n`);
    fs.writeFileSync(path.join(directory, 'delivery.json'), b({ format: 'polaris-dossier-delivery/1', kind: 'fidelity', runId, session: 1, round, packetSha256: digest }));
    write('reviews/fidelity-session-1.delivery-1.json', b({ format: 'polaris-dossier-delivery/1', role: 'review', kind: 'fidelity', runId, session: 1, round, packetSha256: digest, packetBytes: Buffer.byteLength(bytes),
      packet: { sha256: digest, draftRevision: 0, inventoryRevision: 0 }, deliveredAt: '2026-11-19T00:00:02.000Z', continuing: false, earlierRounds: [], label: 'Inferred' })); return { bytes, digest };
  };
  const prepareFidelity = async (packet: { bytes: string; digest: string }) => {
    const origin = bridge.artifactOrigins('fidelity')('round-1/packet.json', Buffer.from(packet.bytes))!;
    const read = receipt('fidelity', 'mcp__syzygy__artifact_read', { path: 'round-1/packet.json' }, { ok: true, kind: 'artifact', path: 'round-1/packet.json', text: packet.bytes, sha256: packet.digest });
    await bridge.toolReceipt('fidelity', read, admission('fidelity')); bridge.committed('fidelity', read.id);
    const verdict = { schemaVersion: 'polaris-dossier-local-fidelity-verdict-v2', pinnedRevision: pin, packetSha256: packet.digest, sessionId: sessionId('fidelity'),
      inventoryCoverage: [{ entryId: 'own-purpose', disposition: 'represented', blockIds: ['intro'], reason: 'Own report.', quotations: [] }],
      inventoryAccuracy: [{ entryId: 'own-purpose', accuracy: 'accurate', spanIds: ['span-1'], reason: 'Own report.', quotations: [] }],
      blockSupport: [{ blockId: 'intro', verdict: 'supported', spanIds: ['span-1'], reason: 'Own report.', quotations: [] }], findings: [], readiness: 'ready' };
    const bytes = b(verdict), checked = { format: 'polaris-dossier-review-check/1', runId, kind: 'fidelity', number: 0, checkedAt: '2026-11-19T00:00:03.000Z', outcome: 'validated',
      verdict: { file: 'reviews/fidelity-verdict-0.json', sha256: sha256(bytes), bytes: bytes.length, packetSha256Named: packet.digest }, packet: { sha256: packet.digest, draftRevision: 0, inventoryRevision: 0 },
      session: { number: 1, sessionId: sessionId('fidelity'), declaredBy: 'the review session', label: 'Inferred', distinctFrom: 'Own other roles.' }, problems: [],
      readiness: { declared: 'ready', blocking: false, basis: 'Own report.', declaredBy: 'the review session', label: 'Inferred' }, counts: 'Own count.', label: 'Inferred' };
    const checkedBytes = `${JSON.stringify(checked, null, 2)}\n`; write('reviews/fidelity-verdict-0.json', bytes); write('reviews/checks/fidelity-verdict-0.json', checkedBytes);
    const report = { command: 'review-check', run, checkFile: path.join(run, 'reviews/checks/fidelity-verdict-0.json'), ...checked,
      observed: { packetSha256: packet.digest, verdictNamesPacket: true, label: 'Observed' }, inferred: { basis: ['Own report.'], label: 'Inferred' }, disclosures: [] };
    const response = { stdout: JSON.stringify({ command: 'await', format: 'polaris-dossier-await/1', outcome: 'submitted', role: 'review', kind: 'fidelity', session: 1, passed: true, check: report, next: 'Own next.', disclosures: [] }), stderr: '', exit: 0 };
    const argv = ['dossier', 'await', dir('fidelity'), '--submit', 'round-1/verdict.json', '--stdin']; replyQueue.push(response); await bridge.runDossier('fidelity')(argv, bytes);
    const raw = receipt('fidelity', 'mcp__syzygy__dossier_step', { argv, stdin: bytes.toString() }, { ok: true, kind: 'dossier-result', ...response });
    return { bytes, checkedBytes, raw, admission: admission('fidelity', origin.classes) };
  };
  const submitFidelity = async (packet: { bytes: string; digest: string }) => {
    const prepared = await prepareFidelity(packet);
    await bridge.toolReceipt('fidelity', prepared.raw, prepared.admission);
    return prepared;
  };
  return { root, run, runId, pin, blob, source, sourceObjects, options, bridge, initialize, produceInitial, write, dir, ledger, admission, receipt, draft, inventory, writeDraft, checkDoc, replyQueue, calls, screen: loaded.screen, basePolicyBytes,
    commitInventory, commitCheck, producePacket, prepareFidelity, submitFidelity, freshOrigins, verifyCurrent, stale: () => { current = false; } };
}

/** Real protected files and genuinely cold-verified never-issued machine
 * anchors. The synthetic stop seal is independent fixture input, never a live
 * process/launch/provider claim. No native helper or CLI is invoked. */
async function recoveryFixture(withPacket = true) {
  const f = fixture(undefined, {}, 'v1', true); f.initialize();
  await f.commitCheck(); await f.commitInventory();
  fs.writeFileSync(path.join(f.dir('inventory'), 'inventory.json'), b(f.inventory));
  if (withPacket) {
    const packet = f.producePacket(b(f.draft), b(f.inventory));
    await f.bridge.registerPacket({ kind: 'fidelity', round: 1, packetSha256: packet.digest });
    const submitted = await f.submitFidelity(packet); f.bridge.committed('fidelity', submitted.raw.id);
    // Actual await --submit --stdin materializes these independent inputs.
    fs.writeFileSync(path.join(f.dir('fidelity'), 'round-1/verdict.json'), submitted.bytes);
    f.write(`reviews/fidelity-packet-${packet.digest}/packet.json`, packet.bytes);
    f.write(`reviews/fidelity-packet-${packet.digest}/packet.sha256`, `${packet.digest}  packet.json\n`);
  }
  const frozen = f.bridge.captureFrozenHistory();
  const now = Date.parse('2026-11-19T00:00:10.000Z'), deadline = now + 60_000;
  const governanceRoot = path.join(f.root, 'observing/.syzygy'), protectedRoot = path.join(f.root, 'machine-protected');
  fs.mkdirSync(path.join(governanceRoot, 'governance/policies/dossier-machine-clients'), { recursive: true });
  const store = await initializeUrlMachineStore({ governanceRoot, protectedRoot, deadline, now: () => now, current: f.options.current });
  if (!store) throw Error('own machine store');
  const binding = { controllerSha256: 'a'.repeat(64), parentBindingSha256: 'b'.repeat(64) };
  const clients: UrlRunMachineClosedHistory['clients'][number][] = [];
  for (const plan of f.options.roles) for (const kind of ['mcp-shim', 'inference-bridge'] as const) {
    const slot = await store.allocateClient(deadline); if (!slot) throw Error('own machine slot');
    clients.push({ context: { clientId: slot.clientId, policySha256: f.options.effectiveDeclaration!.declaration.originPolicy.sha256,
      sourcePin: f.pin, runId: f.runId, role: plan.role, kind, profileSha256: plan.profile.digest, now, deadline,
      allowedScopes: kind === 'inference-bridge' ? ['inference-forward'] : plan.role === 'author' ? ['source_read', 'artifact_read', 'artifact_write', 'dossier_step']
        : plan.role === 'inventory' ? ['source_read', 'artifact_read', 'dossier_step'] : ['artifact_read', 'dossier_step'] },
      terminal: { kind: 'never-issued', ...slot } });
  }
  const sealed: UrlRunMachineClosedHistory = { kind: 'closed-url-run-machine-history', authorization: 'none', replay: 'forbidden',
    identitySha256: store.identitySha256, binding, clients, observedAt: now };
  await store.close();
  const machine = await reconstructColdUrlRunMachineHistory({ governanceRoot, protectedRoot, sealed,
    expected: { identitySha256: sealed.identitySha256, binding, runId: f.runId, sourcePin: f.pin,
      originPolicySha256: f.options.effectiveDeclaration!.declaration.originPolicy.sha256,
      profiles: Object.fromEntries(f.options.roles.map(plan => [plan.role, plan.profile.digest])) as Record<Role, string>, deadline }, now: () => now, current: f.options.current });
  if (!machine) throw Error('own cold machine');
  const hostRoot = path.join(f.root, 'host'); fs.mkdirSync(hostRoot, { mode: 0o700 });
  const expected = { run: f.run, runId: f.runId, generation: 'c'.repeat(32), coreSha256: frozen.coreSha256,
    declarationSha256: frozen.declarationSha256, sourcePin: f.pin, deadline };
  const record = { ...expected, format: 'polaris-url-stopped-boundary/2', sourceStore: 'owned-loose',
    attempt: 'attempt-own111', machineAttempt: 'attempt-own111', predecessor: null, roles: [{}, {}, {}, {}],
    stoppedAt: now, audit: {}, machine: sealed, products: frozen, spend: { requestReservations: 0, completeUsageReports: 0, reportedTokens: 'Unknown' } };
  const canon = (value: unknown) => encodeCanonicalJson(value, { maxBytes: 4_194_304, maxNodes: 131_072, maxDepth: 40 });
  const boundarySha256 = sha256(canon(record)), boundaryFile = path.join(hostRoot, `${sha256(f.run)}.${expected.generation}.stopped.json`);
  fs.writeFileSync(boundaryFile, `${canon({ record, sha256: boundarySha256 })}\n`, { mode: 0o600 });
  const issue = () => verifyUrlRecoveryProducts({ hostRoot, expected, boundarySha256, machine, now: () => now, current: f.options.current });
  const capability = issue(); if (!capability) throw Error('own product capability');
  const fresh = (ledgerRunId?: string) => { const origins = f.freshOrigins(ledgerRunId); return { origins, bridge: createUrlRunArtifacts({ ...f.options, origins }) }; };
  return { ...f, frozen, boundaryFile, capability, issue, fresh };
}

describe('trusted URL artifact producer bridge', () => {
  it('pins logical launch reads to the latest independently committed physical generation and retains old bytes', async () => {
    const f = fixture(undefined, {}, 'v1', true); f.initialize();
    const role = 'inventory', fixed = urlHelperLaunchFile(role), next = urlHelperLaunchFile(role, 'a'.repeat(64));
    const promptFile = 'inventory/session-1.json', promptBytes = fs.readFileSync(path.join(f.run, promptFile));
    const prompt = JSON.parse(promptBytes.toString()), stat = fs.statSync(path.join(f.run, promptFile));
    const plan = f.options.roles.find(value => value.role === role)!;
    const declaration = f.options.effectiveDeclaration!.declaration;
    const commit = (file: string, marker: string) => {
      const bytes = b({ format: 'own-synthetic-history', historicalCapture: marker }); f.write(file, bytes);
      const capability = Object.freeze({}), identity: ReturnType<typeof inspectCommittedUrlLaunchHistory> = {
        history: { run: f.run, runId: f.runId, role, file, bytes, sha256: sha256(bytes),
          plan: { ...plan, declaration: declaration.roles.find(value => value.role === role)! } as UrlRolePlan,
          pin: f.pin, coreSha256: sha256(f.options.initializedCoreBytes!), promptFile, promptSha256: prompt.promptSha256,
          promptRecordSha256: sha256(promptBytes), promptIdentity: { device: BigInt(stat.dev), inode: BigInt(stat.ino) } },
        project: declaration.observingProject, scope: { originPolicySha256: declaration.originPolicy.sha256 } as ReturnType<typeof inspectCommittedUrlLaunchHistory>['scope'],
        eventSha256: sha256(marker),
      };
      committedLaunches.set(capability, identity); return { capability, bytes };
    };
    const first = commit(fixed, 'Own historical first process');
    await f.bridge.registerLaunchHistory(first.capability as never);
    const oldRead = f.bridge.beginRead({ operation: 'inventory-check', deadline: Date.now() + 4000 });
    expect(Buffer.from(f.bridge.readProduct(oldRead, fixed).bytes!)).toEqual(first.bytes);
    const second = commit(next, 'Own historical fresh process');
    await f.bridge.registerLaunchHistory(second.capability as never);
    expect(fs.readFileSync(path.join(f.run, fixed))).toEqual(first.bytes);
    expect(() => f.bridge.revalidateRead(oldRead)).toThrow('url-run-artifacts-unavailable');
    const read = f.bridge.beginRead({ operation: 'inventory-check', deadline: Date.now() + 4000 });
    const logical = f.bridge.readProduct(read, fixed), physical = f.bridge.readProduct(read, next);
    expect(Buffer.from(logical.bytes!)).toEqual(second.bytes); expect(logical.receipt).toBe(physical.receipt);
    expect(f.bridge.revalidateRead(read).metadata.records).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: fixed, physicalPath: next, sha256: sha256(second.bytes) }),
    ]));
    f.bridge.cancelRead(read);
    const sealed = f.bridge.captureFrozenHistory(); expect(sealed.records.filter(record => record.path === fixed || record.path === next)).toHaveLength(2);
    const unknown = urlHelperLaunchFile(role, 'b'.repeat(64)); f.write(unknown, b({ unknown: true }));
    expect(() => f.bridge.captureFrozenHistory()).toThrow('url-run-artifacts-unavailable');
  });
  it('restores sealed product provenance into a genuinely fresh ledger and can freeze another stop', async () => {
    const f = await recoveryFixture(), next = f.fresh();
    const composed = f.frozen.provenance.nodes.find(node => node.derivation.kind === 'composition')!;
    const underclassified = { ...f.frozen, provenance: { ...f.frozen.provenance, nodes: f.frozen.provenance.nodes.map(node => node !== composed ? node
      : { ...node, metadata: { ...node.metadata, classes: ['work-history'] as const } }) } };
    expect(verifyUrlFrozenProductHistory(f.run, underclassified, f.options.current)).toBeNull();
    await expect(next.bridge.restoreFrozenProducts(f.capability)).resolves.toMatchObject({ artifacts: expect.arrayContaining([
      expect.objectContaining({ role: 'author', path: 'brief.md' }), expect.objectContaining({ role: 'inventory', path: 'inventory-brief.md' }),
      expect.objectContaining({ role: 'fidelity', path: 'round-1/packet.json' }),
    ]), initial: { briefIssuedAt: '2026-11-19T00:00:00.000Z', helperPromptDigests: expect.objectContaining({ inventory: expect.any(String) }) } });
    expect(next.bridge.latestStageChecks()).toMatchObject({ author: { revision: 0 }, inventory: { revision: 0 }, fidelity: { revision: 0 }, design: null });
    expect(next.bridge.hasCommittedReport('author', sha256(b(f.draft)))).toBe(true);
    const previous = f.bridge.checkReceipt(0), restored = next.bridge.checkReceipt(0);
    expect(restored).not.toBe(previous); expect(() => next.origins.ledger.metadata(previous)).toThrow('url-origin-refused');
    expect(next.origins.ledger.metadata(restored).classes).toEqual(f.ledger.metadata(previous).classes);
    const reads = next.bridge.beginRead({ operation: 'render', deadline: Date.now() + 4000 });
    expect(Buffer.from(next.bridge.readProduct(reads, 'drafts/rev-0.json').bytes!)).toEqual(b(f.draft)); next.bridge.cancelRead(reads);
    const frozen = next.bridge.captureFrozenHistory();
    expect(verifyUrlFrozenProductHistory(f.run, frozen, f.options.current)).toEqual({ kind: 'verified-frozen-products', authorization: 'none', records: frozen.records.length });
    expect(frozen.records.map(({ path, bytes, sha256 }) => ({ path, bytes, sha256 }))).toEqual(f.frozen.records.map(({ path, bytes, sha256 }) => ({ path, bytes, sha256 })));
    expect(frozen.artifacts.some(product => product.role === 'fidelity' && product.path === 'round-1/packet.json')).toBe(true);
    const third = f.fresh(); await expect(third.bridge.restoreFrozenProducts(f.capability)).rejects.toThrow('url-run-artifacts-unavailable');
  });
  it('takes a recovery capability before the first await so two fresh ledgers cannot race its transfer', async () => {
    const f = await recoveryFixture(), first = f.fresh(), second = f.fresh();
    let release = () => {}, arrived = () => {};
    const waiting = new Promise<void>(resolve => { arrived = resolve; }), hold = new Promise<void>(resolve => { release = resolve; });
    let once = false;
    const work = first.bridge.restoreFrozenProducts(f.capability, async () => { if (!once) { once = true; arrived(); await hold; } return true; });
    await waiting;
    try { await expect(second.bridge.restoreFrozenProducts(f.capability)).rejects.toThrow('url-run-artifacts-unavailable'); }
    finally { release(); }
    await expect(work).resolves.toMatchObject({ initial: { deadline: expect.any(Number) } });
  });
  it('refuses the first failed resource check before importing historical provenance', async () => {
    const f = await recoveryFixture(false), next = f.fresh(); let waits = 0;
    await expect(next.bridge.restoreFrozenProducts(f.capability, async () => ++waits !== 1)).rejects.toThrow('url-run-artifacts-unavailable');
    expect(waits).toBe(1); expect(() => next.bridge.latestStageChecks()).toThrow('url-run-artifacts-unavailable');
  });
  it('withdraws recovery on claim loss after an awaited resource check', async () => {
    const f = await recoveryFixture(), next = f.fresh(); let waits = 0;
    await expect(next.bridge.restoreFrozenProducts(f.capability, async () => { if (++waits === 2) f.stale(); return true; }))
      .rejects.toThrow('url-run-artifacts-unavailable');
    expect(waits).toBe(2); expect(() => next.bridge.latestStageChecks()).toThrow('url-run-artifacts-unavailable');
  });
  it.each(['copy', 'json', 'file', 'boundary', 'claim', 'source', 'ledger-run'] as const)('refuses %s drift during nominal product recovery', async fault => {
    const f = await recoveryFixture(fault !== 'source');
    if (fault === 'ledger-run') { expect(() => f.fresh(`run-${'d'.repeat(32)}`)).toThrow('url-run-artifacts-unavailable'); return; }
    const next = f.fresh(); let capability = f.capability;
    if (fault === 'copy') capability = { ...capability } as UrlVerifiedRecoveryProducts;
    if (fault === 'json') capability = JSON.parse(JSON.stringify(capability));
    if (fault === 'file') fs.appendFileSync(path.join(f.run, 'checks/rev-0.json'), ' ');
    if (fault === 'boundary') {
      const payload = JSON.parse(fs.readFileSync(f.boundaryFile, 'utf8'));
      payload.record.spend.requestReservations = 1;
      const canon = (v: unknown) => encodeCanonicalJson(v, { maxBytes: 4_194_304, maxNodes: 131_072, maxDepth: 40 });
      payload.sha256 = sha256(canon(payload.record)); fs.writeFileSync(f.boundaryFile, `${canon(payload)}\n`);
    }
    if (fault === 'claim') f.stale();
    if (fault === 'source') fs.writeFileSync(path.join(f.options.record.subject.clone.path, '.git/objects', f.blob.slice(0, 2), f.blob.slice(2)), 'corrupt');
    await expect(next.bridge.restoreFrozenProducts(capability)).rejects.toThrow('url-run-artifacts-unavailable');
    expect(() => next.bridge.latestStageChecks()).toThrow('url-run-artifacts-unavailable');
  });
  it('binds the broker one-minute helper default while refusing changed arguments or output', async () => {
    for (const explicit of [false, true]) {
      const f = fixture(); f.initialize();
      const argv = ['dossier', 'await', f.dir('inventory'), ...(explicit ? ['--wait-minutes', '1'] : [])];
      const brief = fs.readFileSync(path.join(f.dir('inventory'), 'inventory-brief.md'));
      const response = { stdout: canonical({ command: 'await', format: 'polaris-dossier-await/1', outcome: 'delivered', role: 'inventory',
        session: 1, round: 1, continuing: false, read: path.join(f.dir('inventory'), 'inventory-brief.md'), sha256: sha256(brief),
        next: 'Own exact helper instructions.', label: 'Inferred', disclosures: [] }), stderr: '', exit: 0 };
      f.replyQueue.push(response);
      // This is the argv prepared by session-tools.command for either issued form.
      await f.bridge.runDossier('inventory')(['dossier', 'await', f.dir('inventory'), '--wait-minutes', '1'], null);
      expect(f.calls.at(-1)).toEqual(['dossier', 'await', `${f.dir('inventory')}/`, '--wait-minutes', '1', '--json']);
      const reply = { ok: true, kind: 'dossier-result', ...response };
      for (const changed of [['dossier', 'await', f.dir('inventory'), '--wait-minutes', '2'],
        ['dossier', 'await', f.dir('inventory'), '--wait-minutes', '1', '--wait-minutes', '1'],
        ['dossier', 'await', f.dir('inventory'), '--round', '2']]) {
        await expect(f.bridge.toolReceipt('inventory', f.receipt('inventory', 'mcp__syzygy__dossier_step', { argv: changed }, reply), f.admission('inventory')))
          .rejects.toThrow('url-run-artifacts-unavailable');
      }
      await expect(f.bridge.toolReceipt('inventory', f.receipt('inventory', 'mcp__syzygy__dossier_step', { argv },
        { ...reply, stdout: response.stdout + ' ' }), f.admission('inventory'))).rejects.toThrow('url-run-artifacts-unavailable');
      const raw = f.receipt('inventory', 'mcp__syzygy__dossier_step', { argv }, reply);
      await f.bridge.toolReceipt('inventory', raw, f.admission('inventory'));
      expect(f.bridge.metadata().pendingToolAudits).toBe(1);
      f.bridge.committed('inventory', raw.id);
      expect(f.bridge.metadata().pendingToolAudits).toBe(0);
    }
  });

  it('authenticates actual initial/core reads once, isolates returned bytes and reports deduplicated metadata only', () => {
    const f = fixture(), initial = f.produceInitial();
    const issued = JSON.parse(fs.readFileSync(path.join(f.run, 'brief.json'), 'utf8'));
    const packs = issued.shapePacks;
    for (const shapePacks of [{ ...packs, extra: true }, { ...packs, traits: { ...packs.traits, extra: true } },
      { ...packs, traits: { ...packs.traits, serverEntry: { ...packs.traits.serverEntry, extra: true } } },
      { ...packs, selected: [{ ...packs.selected[0], extra: true }] },
      { ...packs, selected: [{ ...packs.selected[0], sha256: 'invalid-digest' }] }]) {
      f.write('brief.json', b({ ...issued, shapePacks }));
      expect(() => f.bridge.registerInitial(initial)).toThrow();
      expect(f.bridge.metadata().artifacts).toEqual([]);
    }
    f.write('brief.json', b(issued)); f.bridge.registerInitial(initial);
    const unavailable = fixture(), unavailableInitial = unavailable.produceInitial();
    const unavailableRecord = JSON.parse(fs.readFileSync(path.join(unavailable.run, 'brief.json'), 'utf8'));
    unavailableRecord.shapePacks = shapePackSelection({ state: 'unknown', why: 'Own unavailable trait profile.' }).record;
    unavailable.write('brief.json', b(unavailableRecord));
    expect(() => unavailable.bridge.registerInitial(unavailableInitial)).not.toThrow();
    f.write('run.json', encodeRunRecord(f.options.record.declared, f.options.record.subject));
    const ctx = f.bridge.beginRead({ operation: 'render', deadline: Date.now() + 4000 });
    for (const file of ['run.json', 'brief.json', 'inventory/session-1.json', 'reviews/fidelity-session-1.json', 'reviews/design-session-1.json'])
      expect(f.bridge.readProduct(ctx, file).kind).toBe('present');
    const first = f.bridge.readProduct(ctx, 'brief.json'); first.bytes!.fill(0);
    const again = f.bridge.readProduct(ctx, 'brief.json'); expect(again.receipt).toBe(first.receipt); expect(again.bytes![0]).toBe(123);
    const summary = f.bridge.revalidateRead(ctx); expect(summary.metadata.records).toHaveLength(5); expect(summary.receipts).toHaveLength(5);
    const metadata = JSON.stringify(summary.metadata); for (const body of ['Own actual', f.source, 'Own fixed']) expect(metadata).not.toContain(body);
    f.bridge.cancelRead(ctx); expect(() => f.bridge.revalidateRead(ctx)).toThrow();
    expect(() => createUrlRunArtifacts({ ...f.options, initializedCoreBytes: Buffer.from('{}') })).toThrow();
  });
  it('reverifies the exact retained initialized bytes and sidecar under the protected bindings', async () => {
    // Both facts lie past the source-span ceiling; bare CR is also a manifest
    // line terminator. A first-2000-LF-lines receipt cannot cover these values.
    const manifest = `{\n${'\n'.repeat(2000)}"name":"own-uncited-package",\r"dependencies":{"own-uncited-dependency":"1.0.0"}\r}\n`;
    const excludedManifest = '[package]\nname = "OWN_SECRET_CANARY"\n';
    const f = fixture(undefined, { 'README.md': 'Own documented purpose.\n', 'package.json': manifest, 'Cargo.toml': excludedManifest }, 'v2');
    Object.assign(f.draft.understanding, { purpose: [{ id: 'own-purpose', label: 'inferred', statement: 'Own documented purpose.', scope: 'Own fixture.',
      citations: [{ id: 'own-readme', path: 'README.md', startLine: 1, endLine: 1 }] }] });
    const site = await import(new URL('../../../apps/three-surface-poc/src/polaris-generation/dossier-site.ts', import.meta.url).href) as { figureLaidOutWidth: FigureLayout };
    const cite = (id: string) => ({ id, path: 'README.md', startLine: 1, endLine: 1 });
    Object.assign(f.draft, { schemaVersion: 'polaris-dossier-local-draft-v5', diagrams: [{ id: 'own-flow', title: 'Own flow',
      home: { kind: 'section', target: 'own-section' }, kind: 'flow', relationship: 'Own order.', disposition: { kind: 'produced', assetIds: ['own-flow'] },
      nodes: ['own-a', 'own-b'].map(id => ({ id, label: id, epistemic: 'inferred', citations: [cite(`cite-${id}`)] })),
      edges: [{ id: 'own-edge', from: 'own-a', to: 'own-b', label: 'then', epistemic: 'inferred', citations: [cite('cite-edge')] }] }] });
    const H = 'e'.repeat(64), core = encodeRunRecord(f.options.record.declared, f.options.record.subject);
    const identity = urlSourceTransportIdentity('https://own.example.invalid/source'); if (!identity.ok) throw Error('own transport');
    const sourceTransport = { originalLocator: identity.originalLocator, destination: identity.destination, providerId: identity.providerId,
      acquisitionId: 'acq-0123456789abcdef0123456789abcdef', metadataClasses: ['code-structure'] as const, selectionOrigin: 'validated-destination-before-acquisition' as const,
      commandSha256: H, protocolSha256: H, configurationSha256: H, executableSha256: H, environmentSha256: H };
    const originBytes = fs.readFileSync(new URL('../../../openspec/changes/dossier-url-declared-source-run/proposed/policies/POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1.json', import.meta.url));
    const originPolicy = { path: '.syzygy/governance/policies/POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1.json', policyId: 'POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1', policyVersion: '1.0.0', commit: 'a'.repeat(40), sha256: sha256(originBytes) };
    const context = { runId: f.runId, expectedBasePolicy: f.options.record.subject.screeningPolicy, expectedOriginPolicy: originPolicy, expectedSourceTransport: sourceTransport, expectedProfileSha256: H };
    const issued = createUrlRunDeclaration(core, { runId: f.runId, originPolicy, sourceTransport, protectedAudit: `url-audit:${f.runId}`,
      inference: { provider: 'anthropic', tool: 'claude-code', toolVersion: '2.1.327', model: 'claude-sonnet-4-6', modelSelection: 'supported-default', profile: { id: URL_PROFILE_ID, sha256: H } },
      plannedOrigins: f.ledger.plannedOrigins(), roles: f.options.roles.map(p => ({ role: p.role, sessionId: p.profile.input.sessionId, profileId: URL_PROFILE_ID,
        compiledProfileSha256: p.profile.digest, commandSha256: H, instructionSha256: sha256(p.profile.input.systemPrompt), viewSha256: H,
        scaffoldSha256: H, mcpSha256: H, configurationSha256: H, executableSha256: H, inputPacketSha256: sha256(p.profile.input.initialPrompt),
        inputOriginId: f.ledger.metadata(f.options.origins.initialReceipts[p.role]).id, capture: { pid: 'Unknown', startedAt: 'Unknown', finishedAt: 'Unknown', outcome: 'Unknown' } })) }, context);
    if (!issued.ok) throw Error(`own declaration ${issued.code}`);
    const effectiveDeclaration = { declaration: issued.declaration, bytes: Buffer.from(issued.text), context: { ...context, expectedSidecarSha256: issued.sha256 } };
    f.write('run.json', core);
    f.write('url-declaration.json', issued.text);
    const sources = { ...fixtureSources(f.pin),
      declaredPolicy: async () => ({ ok: true as const, bytes: f.basePolicyBytes, binding: f.options.record.subject.screeningPolicy }),
      effectiveRunDeclaration: () => ({ kind: 'url' as const, context: effectiveDeclaration.context, screenMetadata: () => true }),
    };
    const openReader = bindUrlSourceReader({ clone: f.options.record.subject.clone.path, revision: f.pin, store: 'owned-loose', current: f.options.current });
    const readAt = Date.parse('2026-11-19T00:00:09.000Z');
    const briefing = await issueBrief(f.run, { sources, openReader, now: () => readAt });
    expect(briefing).toMatchObject({ ok: true });
    if (!briefing.ok) throw Error('own URL brief refused');
    let holdProducer: Promise<void> | null = null;
    const bridge = createUrlRunArtifacts({ ...f.options, initializedCoreBytes: Buffer.from(core), effectiveDeclaration,
      runDossier: role => {
        const actual = f.options.runDossier(role);
        return async (...args) => {
          if (holdProducer !== null) await holdProducer;
          return actual(...args);
        };
      } });
    const schema = bridge.registerInitial(f.produceInitial(briefing.report)).find(artifact => artifact.path === 'draft.schema.json');
    if (!schema) throw Error('own complete schema missing');
    const schemaText = fs.readFileSync(path.join(f.run, schema.path), 'utf8');
    expect(JSON.parse(schemaText)).toEqual(draftSchemaDocument({ pinnedRevision: f.pin, maxQuestions: 1 }));
    const schemaReply = canonical({ ok: true, kind: 'artifact', path: schema.path, text: schemaText, sha256: sha256(schemaText) });
    expect(schemaReply.length).toBeLessThanOrEqual(50_000);
    const ctx = bridge.beginRead({ operation: 'render', deadline: Date.now() + 4000 });
    expect(bridge.readProduct(ctx, 'url-declaration.json').kind).toBe('present'); expect(bridge.revalidateRead(ctx).metadata.records).toHaveLength(1);
    expect(() => bridge.captureFrozenHistory()).toThrow('url-run-artifacts-unavailable');
    bridge.cancelRead(ctx);
    const products = beginRunProductReads(f.run, bridge, 'render', Date.now() + 4000);
    try {
      const snapshots = vi.spyOn(productReads, 'snapshotProductFile');
      try {
        for (const refuseOn of [1, 2]) {
          let gateCalls = 0;
          snapshots.mockClear();
          const guardedReads = beginRunProductReads(f.run, bridge, 'render', Date.now() + 4000,
            async () => ++gateCalls !== refuseOn);
          await expect(reverifyPinnedRevision(f.run, sources, readAt, { productReads: guardedReads, openReader }))
            .rejects.toThrow('the authenticated URL products are unavailable or changed');
          expect(guardedReads.isLeaseOpen()).toBe(false);
          expect(gateCalls).toBe(refuseOn);
          expect(snapshots.mock.calls.map(([, file]) => file)).toEqual(refuseOn === 1 ? [] : ['run.json', 'run.json', 'url-declaration.json']);
        }
      } finally { snapshots.mockRestore(); }
      const checked = await reverifyPinnedRevision(f.run, sources, readAt, { productReads: products, openReader });
      products.close();
      expect(checked).toMatchObject({ ok: true, revision: { commit: f.pin } });
      if (!checked.ok) throw Error('own run reverify');
      expect(encodeRunRecord(checked.record.declared, checked.record.subject)).not.toBe(core);
      f.write('drafts/next.json', b(f.draft));
      let checkWaits = 0;
      const checkReads = beginRunProductReads(f.run, bridge, 'author-check', Date.now() + 4000,
        async () => ++checkWaits < 4);
      try {
        const result = await checkDraft(f.run, {}, { sources, openReader, productReads: checkReads,
          now: () => readAt, loadScreen: async () => ({ ok: true, screen: f.screen }), layoutFigure: () => 648,
          probe: { probe: async () => { throw Error('own check permits no execution'); } } });
        expect(result).toMatchObject({ ok: false, refusal: { stage: 'reverify', reason: 'the authenticated URL products are unavailable or changed' } });
        expect(checkWaits).toBe(4);
        expect(checkReads.isLeaseOpen()).toBe(false);
        expect(fs.existsSync(path.join(f.run, 'drafts/rev-0.json'))).toBe(false);
        expect(fs.existsSync(path.join(f.run, 'checks/rev-0.json'))).toBe(false);
      } finally { checkReads.close(); }

      const draft = b(f.draft);
      expect(checkDraftShape(localDraftSchema({ pinnedRevision: f.pin, maxQuestions: 1 }, 'home', 'absent'), f.draft)).toEqual([]);
      expect(f.screen.screenBody(draft.toString())).toBeUndefined();
      const writeArgs = { path: 'drafts/next.json', content: draft.toString() };
      const written = f.receipt('author', 'mcp__syzygy__artifact_write', writeArgs,
        { ok: true, kind: 'artifact-written', path: writeArgs.path, sha256: sha256(draft) });
      await bridge.toolReceipt('author', written, f.admission('author'));
      bridge.committed('author', written.id);
      // A directory at the optional sidecar path causes its rename to fail;
      // the genuine producer still returns its checked result with file:null.
      fs.mkdirSync(path.join(f.run, 'run-advice.json'));
      const authorReads = beginRunProductReads(f.run, bridge, 'author-check', Date.now() + 4000);
      try {
        const result = await checkDraft(f.run, {}, { sources, openReader, productReads: authorReads,
          now: () => readAt, loadScreen: async () => ({ ok: true, screen: f.screen }), layoutFigure: () => 648,
          probe: { probe: async () => { throw Error('own check permits no execution'); } } });
        expect(result).toMatchObject({ ok: true, report: { outcome: 'passed', figureFit: { examined: 1, entries: [] },
          mechanismAdvice: { file: null, thisRevision: 1, inRun: 1 } } });
        if (!result.ok || result.report.outcome !== 'passed') throw Error('own protected check');
        expect(result.report.citedBlobs.map(blob => blob.path)).toEqual(['README.md']);
        expect(result.report.manifestFacts).toMatchObject({ state: 'derived', facts: expect.arrayContaining([
          expect.objectContaining({ path: 'package.json', fact: 'package', name: 'own-uncited-package' }),
          expect.objectContaining({ path: 'package.json', fact: 'dependency', name: 'own-uncited-dependency' }),
        ]) });
        if (result.report.manifestFacts?.state !== 'derived') throw Error('own manifest facts unavailable');
        expect(result.report.manifestFacts.facts.every(fact => fact.lines[0] > 2000)).toBe(true);
        expect(result.report.manifestFacts.recognizers.find(recognizer => recognizer.rule === 'cargo-manifest')?.files)
          .toEqual([expect.objectContaining({ path: 'Cargo.toml', epistemic: 'unknown', unknownReason: 'secret-detector-match' })]);
        const response = { stdout: JSON.stringify(result.report), stderr: '', exit: 0 };
        const argv = ['dossier', 'check', f.run];
        const storedBytes = fs.readFileSync(path.join(f.run, 'checks/rev-0.json'));
        const stored = JSON.parse(storedBytes.toString());
        expect(stored.figureFit.entries).toEqual([expect.objectContaining({ diagram: 'own-flow', viewportPx: 390, laidOutPx: 648 })]);
        expect(stored).not.toHaveProperty('mechanismAdvice');
        // An unknown check with no mechanism entries would leave these counts
        // unchanged; the bridge must still reject the unrecognized population.
        f.write('checks/rev-999.json', b({ ...stored, revision: 999, figureFit: { ...stored.figureFit, entries: [] } }));
        f.replyQueue.push(response);
        await expect(bridge.runDossier('author')(argv, null)).rejects.toThrow();
        fs.unlinkSync(path.join(f.run, 'checks/rev-999.json'));
        const mutants = [
          { ...result.report, mechanismAdvice: { ...result.report.mechanismAdvice, extra: true } },
          { ...result.report, mechanismAdvice: { ...result.report.mechanismAdvice, file: 'checks/rev-0.json' } },
          { ...result.report, mechanismAdvice: { ...result.report.mechanismAdvice, thisRevision: 0 } },
          { ...result.report, mechanismAdvice: { ...result.report.mechanismAdvice, inRun: 2 } },
          { ...result.report, figureFit: stored.figureFit },
          { ...result.report, figureFit: { ...result.report.figureFit, examined: 0 } },
          { ...result.report, figureFit: { ...result.report.figureFit, extra: true } },
        ];
        for (const mutant of mutants) {
          f.replyQueue.push({ ...response, stdout: JSON.stringify(mutant) });
          await expect(bridge.runDossier('author')(argv, null)).rejects.toThrow();
        }
        f.replyQueue.push(response);
        await expect(bridge.runDossier('author')(argv, null)).resolves.toEqual(response);
        const origins = bridge.dossierOrigins('author')(argv, response);
        expect(origins?.classes).toContain('code-content');
        const body = f.ledger.plannedOrigins().find(origin => origin.species === 'pinned-repository-body' && origin.sha256 === sha256(manifest));
        const structure = f.ledger.plannedOrigins().find(origin => origin.sha256 === sha256(canonical({ commit: f.pin, path: 'package.json',
          objectId: f.sourceObjects.get('package.json'), start: 0, end: Buffer.byteLength(manifest) })));
        expect(body).toMatchObject({ classes: ['code-content'] });
        expect(structure).toMatchObject({ species: 'structural-source-and-tool-metadata', classes: ['code-structure'] });
        expect(origins?.originIds).toEqual(expect.arrayContaining([body!.id, structure!.id]));
        expect(f.ledger.plannedOrigins().some(origin => origin.species === 'pinned-repository-body' && origin.sha256 === sha256(excludedManifest))).toBe(false);
        const receipt = f.receipt('author', 'mcp__syzygy__dossier_step', { argv }, { ok: true, kind: 'dossier-result', ...response });
        await bridge.toolReceipt('author', receipt, f.admission('author'));
        bridge.committed('author', receipt.id);
        expect(f.ledger.metadata(bridge.checkReceipt(0)).originIds).toEqual(expect.arrayContaining([body!.id, structure!.id]));
        expect(bridge.latestStageCheck('author')).toMatchObject({ revision: 0, record: { figureFit: stored.figureFit } });
        expect(f.ledger.origins(bridge.checkReceipt(0), storedBytes)).toBeDefined();
      } finally { authorReads.close(); }
      let releaseProducer = () => {};
      holdProducer = new Promise<void>(resolve => { releaseProducer = resolve; });
      const heldWork = bridge.runDossier('author')(['dossier', 'help'], null);
      try { expect(() => bridge.captureFrozenHistory()).toThrow('url-run-artifacts-unavailable'); }
      finally { holdProducer = null; releaseProducer(); }
      await expect(heldWork).rejects.toThrow('url-run-artifacts-unavailable');
      const history = bridge.captureFrozenHistory();
      expect(history).toMatchObject({ coreSha256: sha256(core), declarationSha256: issued.sha256,
        records: expect.arrayContaining([expect.objectContaining({ path: 'drafts/rev-0.json', sha256: sha256(draft) }),
          expect.objectContaining({ path: 'checks/rev-0.json' })]) });
      const verify = () => verifyUrlFrozenProductHistory(f.run, history, f.options.current);
      expect(verify()).toEqual({ kind: 'verified-frozen-products', authorization: 'none', records: history.records.length });
      f.write('checks/rev-999.json', '{}');
      expect(verify()).toBeNull();
      expect(() => bridge.captureFrozenHistory()).toThrow('url-run-artifacts-unavailable');
      fs.unlinkSync(path.join(f.run, 'checks/rev-999.json'));
      const changed = { ...history, records: history.records.map(record =>
        record.path === 'checks/rev-0.json' ? { ...record, sha256: '0'.repeat(64) } : record) };
      expect(verifyUrlFrozenProductHistory(f.run, changed, f.options.current)).toBeNull();
      expect(verifyUrlFrozenProductHistory(f.run, history, () => false)).toBeNull();
      const nextFile = path.join(f.run, 'drafts/next.json');
      expect(history.records.find(record => record.path === 'drafts/next.json')?.sha256).toBe(sha256(draft));
      fs.renameSync(nextFile, nextFile + '.held');
      try {
        expect(() => bridge.captureFrozenHistory()).toThrow('url-run-artifacts-unavailable');
        expect(verify()).toBeNull();
      } finally { fs.renameSync(nextFile + '.held', nextFile); }
      const snapshotActual = productReads.snapshotProductFile;
      const drifting = vi.spyOn(productReads, 'snapshotProductFile').mockImplementation((...args) => {
        const captured = snapshotActual(...args);
        if (args[1] === history.records.at(-1)?.path) fs.appendFileSync(nextFile, ' ');
        return captured;
      });
      try { expect(verify()).toBeNull(); }
      finally { drifting.mockRestore(); fs.writeFileSync(nextFile, draft); }
      const unidentifiedPacket = `reviews/fidelity-packet-${'0'.repeat(64)}/packet.json`;
      for (const file of ['feedback/fidelity-verdict-999.json', unidentifiedPacket]) {
        f.write(file, '{}');
        try {
          expect(() => bridge.captureFrozenHistory()).toThrow('url-run-artifacts-unavailable');
          expect(verify()).toBeNull();
        } finally {
          fs.unlinkSync(path.join(f.run, file));
          if (file === unidentifiedPacket) fs.rmdirSync(path.dirname(path.join(f.run, file)));
        }
      }
      fs.rmdirSync(path.join(f.run, 'run-advice.json'));
      for (const revision of [1, 2]) {
        f.draft.title = `Own dossier revision ${revision}`;
        const next = b(f.draft), args = { path: 'drafts/next.json', content: next.toString() };
        f.write(args.path, next);
        const writeReceipt = f.receipt('author', 'mcp__syzygy__artifact_write', args,
          { ok: true, kind: 'artifact-written', path: args.path, sha256: sha256(next) });
        await bridge.toolReceipt('author', writeReceipt, f.admission('author')); bridge.committed('author', writeReceipt.id);
        const reads = beginRunProductReads(f.run, bridge, 'author-check', Date.now() + 4000);
        try {
          const result = await checkDraft(f.run, {}, { sources, openReader, productReads: reads,
            now: () => readAt + revision * 1000, loadScreen: async () => ({ ok: true, screen: f.screen }), layoutFigure: () => 648,
            probe: { probe: async () => { throw Error('own check permits no execution'); } } });
          expect(result).toMatchObject({ ok: true, report: { revision, figureFit: { examined: 1, entries: [] },
            mechanismAdvice: { file: 'run-advice.json', thisRevision: 1, inRun: revision + 1 } } });
          if (!result.ok) throw Error('own protected later check');
          const response = { stdout: JSON.stringify(result.report), stderr: '', exit: 0 }, argv = ['dossier', 'check', f.run];
          if (revision === 2) {
            const previous = JSON.parse(fs.readFileSync(path.join(f.run, 'checks/rev-0.json'), 'utf8'));
            previous.figureFit.entries = [];
            f.write('checks/rev-0.json', b(previous));
            f.replyQueue.push(response);
            await expect(bridge.runDossier('author')(argv, null)).rejects.toThrow();
          } else {
            f.replyQueue.push({ ...response, stdout: JSON.stringify({ ...result.report,
              mechanismAdvice: { ...result.report.mechanismAdvice, inRun: 1 } }) });
            await expect(bridge.runDossier('author')(argv, null)).rejects.toThrow();
            f.replyQueue.push(response);
            await expect(bridge.runDossier('author')(argv, null)).resolves.toEqual(response);
            const receipt = f.receipt('author', 'mcp__syzygy__dossier_step', { argv }, { ok: true, kind: 'dossier-result', ...response });
            await bridge.toolReceipt('author', receipt, f.admission('author')); bridge.committed('author', receipt.id);
            expect(bridge.latestStageCheck('author')).toMatchObject({ revision, record: { figureFit: { entries: [expect.anything()] } } });
          }
        } finally { reads.close(); }
      }
    } finally { products.close(); }
    f.write('url-declaration.json', `${issued.text} `); expect(() => bridge.revalidateRead(ctx)).toThrow();
    expect(() => createUrlRunArtifacts({ ...f.options, effectiveDeclaration: { ...effectiveDeclaration, context: { ...effectiveDeclaration.context, expectedSidecarSha256: H } } })).toThrow();
    expect(() => createUrlRunArtifacts({ ...f.options, effectiveDeclaration: { ...effectiveDeclaration, context: { runId: f.runId } as never } })).toThrow();
    const changed = JSON.parse(issued.text); changed.pinnedCommit = 'b'.repeat(40); const bytes = b(changed);
    expect(() => createUrlRunArtifacts({ ...f.options, effectiveDeclaration: { declaration: changed, bytes, context: { ...effectiveDeclaration.context, expectedSidecarSha256: sha256(bytes) } } })).toThrow();
  });
  it('selects exact committed check/report sets and refuses missing, unknown higher, uncommitted or mutated products', async () => {
    const f = fixture(); f.initialize(); const draft = await f.commitCheck(false);
    const begin = () => f.bridge.beginRead({ operation: 'render', deadline: Date.now() + 4000 });
    expect(() => f.bridge.selectProducts(begin(), 'author-checks')).toThrow();
    f.bridge.committed('author', draft.checkRaw.id);
    const ctx = begin(); expect(f.bridge.selectProducts(ctx, 'author-checks')).toEqual(['checks/rev-0.json']);
    expect(f.bridge.selectProducts(ctx, 'author-drafts')).toEqual(['drafts/rev-0.json']);
    const checked = f.bridge.readProduct(ctx, 'checks/rev-0.json'), frozen = f.bridge.readProduct(ctx, 'drafts/rev-0.json');
    expect(frozen.receipt).toBe(f.bridge.reportReceipt('author', sha256(draft.bytes)));
    expect(f.bridge.revalidateRead(ctx).receipts).toHaveLength(4); expect(f.bridge.readProduct(ctx, 'checks/rev-0.json').receipt).toBe(checked.receipt);
    f.write('checks/ignored.txt', 'Own irrelevant name'); expect(f.bridge.selectProducts(begin(), 'author-checks')).toEqual(['checks/rev-0.json']);
    f.write('checks/rev-999.json', '{}'); expect(() => f.bridge.revalidateRead(ctx)).toThrow(); expect(() => f.bridge.selectProducts(begin(), 'author-checks')).toThrow();
    fs.unlinkSync(path.join(f.run, 'checks/rev-999.json')); fs.unlinkSync(path.join(f.run, 'checks/rev-0.json'));
    expect(() => f.bridge.selectProducts(begin(), 'author-checks')).toThrow();
  });
  it('captures verified absence but never treats unknown inserted records or unsupported species as absent', () => {
    const f = fixture(); f.initialize(); const begin = () => f.bridge.beginRead({ operation: 'review-check', deadline: Date.now() + 4000 });
    const ctx = begin(), absent = f.bridge.readProduct(ctx, 'reviews/checks/fidelity-verdict-0.json');
    expect(absent.kind).toBe('absent'); expect(absent.bytes).toBeNull(); expect(f.bridge.revalidateRead(ctx).metadata.records[0]!.state).toBe('absent');
    expect(f.bridge.selectProducts(begin(), 'fidelity-verdicts')).toEqual([]);
    f.write('reviews/checks/fidelity-verdict-0.json', '{}'); expect(() => f.bridge.revalidateRead(ctx)).toThrow();
    expect(() => f.bridge.readProduct(begin(), 'reviews/checks/fidelity-verdict-0.json')).toThrow();
    for (const file of ['launched.json', 'inventory/session-1.launch.json', 'reviews/fidelity-session-1.launch.json',
      'reviews/design-session-1.launch.json', 'reviews/design-session-2.launch.json']) {
      expect(() => f.bridge.readProduct(begin(), file)).toThrow('unsupported-launch');
      f.write(file, b({ format: 'polaris-dossier-url-launch-history/1', runId: path.basename(f.run), label: 'Inferred' }));
      expect(() => f.bridge.readProduct(begin(), file)).toThrow('unsupported-launch');
    }
    expect(() => f.bridge.readProduct(begin(), 'url-declaration.json')).toThrow('unsupported-effective-declaration');
    expect(() => f.bridge.readProduct(begin(), 'arbitrary.json')).toThrow();
  });
  it('reuses fresh proofs for the same render inputs and separates changed paths and read operations', async () => {
    const f = fixture(); f.initialize(); await f.commitCheck();
    const directory = path.join(f.run, 'reviews/checks');
    const absentPath = 'reviews/checks/design-verdict-3.json';
    fs.mkdirSync(directory, { recursive: true });
    const read = (operation: 'render' | 'review-check') => {
      const ctx = f.bridge.beginRead({ operation, deadline: Date.now() + 4000 });
      expect(f.bridge.readProduct(ctx, absentPath).kind).toBe('absent');
      expect(f.bridge.selectProducts(ctx, 'design-checks')).toEqual([]);
      expect(f.bridge.selectProducts(ctx, 'author-checks')).toEqual(['checks/rev-0.json']);
      const evidence = f.bridge.revalidateRead(ctx);
      f.bridge.cancelRead(ctx);
      return evidence;
    };
    const first = read('render'), repeated = read('render');
    expect(repeated.receipts).toHaveLength(first.receipts.length);
    for (const [index, receipt] of repeated.receipts.entries()) expect(receipt).toBe(first.receipts[index]);
    expect(repeated.metadata.records).toEqual(first.metadata.records);
    expect(repeated.metadata.selections).toEqual(first.metadata.selections);
    const review = read('review-check');
    expect(review.metadata.records[0]!.originId).not.toBe(first.metadata.records[0]!.originId);
    expect(review.metadata.selections[1]!.originId).not.toBe(first.metadata.selections[1]!.originId);

    fs.renameSync(directory, `${directory}.older`);
    fs.mkdirSync(directory);
    const changed = read('render');
    expect(changed.metadata.records[0]!.originId).not.toBe(first.metadata.records[0]!.originId);
    expect(changed.metadata.selections[0]!.originId).not.toBe(first.metadata.selections[0]!.originId);
    expect(changed.metadata.selections[1]!.originId).toBe(first.metadata.selections[1]!.originId);
    expect(read('render').metadata.selections).toEqual(changed.metadata.selections);
  });
  it('refuses changed bytes, hash rewrites, rename replacements and unsafe filesystem identities after an admitted read', () => {
    for (const mutate of [(f: ReturnType<typeof fixture>) => f.write('brief.json', '{}'),
      (f: ReturnType<typeof fixture>) => { const v = JSON.parse(fs.readFileSync(path.join(f.run, 'brief.json'), 'utf8')); v.files.brief.sha256 = 'a'.repeat(64); f.write('brief.json', b(v)); },
      (f: ReturnType<typeof fixture>) => { const p = path.join(f.run, 'brief.json'), bytes = fs.readFileSync(p); fs.renameSync(p, `${p}.old`); fs.writeFileSync(p, bytes); },
      (f: ReturnType<typeof fixture>) => { const p = path.join(f.run, 'brief.json'); fs.renameSync(p, `${p}.old`); fs.symlinkSync(`${p}.old`, p); },
      (f: ReturnType<typeof fixture>) => { const p = path.join(f.run, 'brief.json'); fs.linkSync(p, `${p}.alias`); },
      (f: ReturnType<typeof fixture>) => { const p = path.join(f.run, 'brief.json'); fs.unlinkSync(p); fs.mkdirSync(p); },
      (f: ReturnType<typeof fixture>) => { const p = path.join(f.run, 'brief.json'); fs.unlinkSync(p); execFileSync('mkfifo', [p], { timeout: 1000, stdio: 'ignore' }); }]) {
      const f = fixture(); f.initialize(); const ctx = f.bridge.beginRead({ operation: 'render', deadline: Date.now() + 4000 });
      f.bridge.readProduct(ctx, 'brief.json'); mutate(f); expect(() => f.bridge.revalidateRead(ctx)).toThrow();
      expect(() => f.bridge.readProduct(ctx, 'brief.json')).toThrow();
    }
  });
  it('binds helper check/report/delivery reads to actual committed producer lineage', async () => {
    const f = fixture(); f.initialize(); const draft = await f.commitCheck(), inventory = await f.commitInventory();
    const packet = f.producePacket(draft.bytes, inventory.bytes); await f.bridge.registerPacket({ kind: 'fidelity', round: 1, packetSha256: packet.digest });
    const verdict = await f.submitFidelity(packet), begin = () => f.bridge.beginRead({ operation: 'render', deadline: Date.now() + 4000 });
    expect(() => f.bridge.selectProducts(begin(), 'fidelity-verdicts')).toThrow(); f.bridge.committed('fidelity', verdict.raw.id);
    const ctx = begin();
    for (const selector of ['inventory-revisions', 'inventory-checks', 'fidelity-verdicts', 'fidelity-checks', 'fidelity-deliveries'] as const)
      expect(f.bridge.selectProducts(ctx, selector)).toHaveLength(1);
    const report = f.bridge.readProduct(ctx, 'reviews/fidelity-verdict-0.json'); expect(report.receipt).toBe(f.bridge.reportReceipt('fidelity', sha256(verdict.bytes)));
    expect(f.bridge.revalidateRead(ctx).metadata.records).toHaveLength(5);
    const delivery = path.join(f.run, 'reviews/fidelity-session-1.delivery-1.json'); fs.appendFileSync(delivery, ' ');
    expect(() => f.bridge.revalidateRead(ctx)).toThrow();
  });
  it('lets resource polls run before binding a submitted verdict and consumes its pending capture once', async () => {
    const f = fixture(); f.initialize(); const draft = await f.commitCheck(), inventory = await f.commitInventory();
    const packet = f.producePacket(draft.bytes, inventory.bytes);
    await f.bridge.registerPacket({ kind: 'fidelity', round: 1, packetSha256: packet.digest });
    const { raw, admission, bytes, checkedBytes } = await f.prepareFidelity(packet);
    const candidate = f.bridge.artifactOrigins('fidelity');
    const first = f.bridge.toolReceipt('fidelity', raw, admission);
    expect(candidate('round-1/verdict.json', bytes)).toBeNull();
    const duplicate = { ...raw, id: `tool-${'a'.repeat(64)}` };
    const second = f.bridge.toolReceipt('fidelity', duplicate, admission);
    await expect(first).resolves.toBeUndefined();
    await expect(second).rejects.toThrow('url-run-artifacts-unavailable');
    expect(candidate('round-1/verdict.json', bytes)?.digest).toBe(sha256(bytes));
    expect(f.bridge.hasCommittedProduct('reviews/checks/fidelity-verdict-0.json', sha256(checkedBytes))).toBe(false);
    f.bridge.committed('fidelity', raw.id);
    expect(f.bridge.hasCommittedProduct('reviews/checks/fidelity-verdict-0.json', sha256(checkedBytes))).toBe(true);
  });
  it('rejects fake/cross-bridge contexts, expired/aborted/current-lost reads, and bounded excess contexts', async () => {
    const f = fixture(), other = fixture(); f.initialize(); other.initialize();
    const begin = () => f.bridge.beginRead({ operation: 'render', deadline: Date.now() + 4000 });
    expect(() => f.bridge.readProduct({ kind: 'url-product-read-context' }, 'brief.json')).toThrow();
    const ctx = begin(); expect(() => other.bridge.readProduct(ctx, 'brief.json')).toThrow(); f.bridge.cancelRead(ctx);
    const abort = new AbortController(), aborted = f.bridge.beginRead({ operation: 'render', deadline: Date.now() + 4000, signal: abort.signal });
    f.bridge.readProduct(aborted, 'brief.json'); await Promise.resolve(); abort.abort(); expect(() => f.bridge.revalidateRead(aborted)).toThrow();
    vi.useFakeTimers(); try {
      const expiring = begin(); f.bridge.readProduct(expiring, 'brief.json'); vi.advanceTimersByTime(4001); expect(() => f.bridge.revalidateRead(expiring)).toThrow();
      const clockOnly = begin(); f.bridge.readProduct(clockOnly, 'brief.json'); vi.setSystemTime(Date.now() + 4001); expect(() => f.bridge.revalidateRead(clockOnly)).toThrow();
    } finally { vi.useRealTimers(); }
    for (const deadline of [NaN, Infinity, Date.now(), Date.now() + 6000]) expect(() => f.bridge.beginRead({ operation: 'render', deadline })).toThrow();
    const held = Array.from({ length: 16 }, begin); expect(() => begin()).toThrow(); for (const cap of held) f.bridge.cancelRead(cap);
    const stale = begin(); f.bridge.readProduct(stale, 'brief.json'); await Promise.resolve(); f.stale(); expect(() => f.bridge.revalidateRead(stale)).toThrow();
  });
  it.each(['record', 'record batch', 'selection', 'selection batch', 'revalidation'] as const)('checks current authority before and after the bounded %s read', (kind) => {
    const f = fixture(), current = vi.fn(() => true);
    const bridge = createUrlRunArtifacts({ ...f.options, current });
    bridge.registerInitial(f.produceInitial());
    fs.mkdirSync(path.join(f.run, 'checks'), { recursive: true });
    const groups = ['author-checks', 'author-drafts'] as const;
    if (kind === 'selection' || kind === 'selection batch') {
      const previous = bridge.beginRead({ operation: 'render', deadline: Date.now() + 4000 });
      bridge.selectProductGroups(previous, groups);
      bridge.cancelRead(previous);
    }
    const control = () => {
      const context = bridge.beginRead({ operation: 'render', deadline: Date.now() + 4000 });
      if (kind === 'revalidation') bridge.readProduct(context, 'brief.json');
      const read = () => kind === 'record' ? bridge.readProduct(context, 'brief.json')
        : kind === 'record batch' ? bridge.readProducts(context, ['brief.json', 'brief.md'])
          : kind === 'selection' ? bridge.selectProducts(context, 'author-checks')
            : kind === 'selection batch' ? bridge.selectProductGroups(context, groups) : bridge.revalidateRead(context);
      current.mockClear();
      return { context, read };
    };
    const accepted = control();
    expect(accepted.read()).toBeDefined();
    expect(current).toHaveBeenCalledTimes(2);
    bridge.cancelRead(accepted.context);
    const withdrawn = control();
    current.mockReturnValueOnce(true).mockReturnValueOnce(false);
    expect(withdrawn.read).toThrow('url-run-artifacts-unavailable');
    expect(current).toHaveBeenCalledTimes(2);
    current.mockReturnValue(true);
    expect(withdrawn.read).toThrow('url-run-artifacts-unavailable');
  });
  it('binds actual initial products, refuses unknown or changed bytes and retains metadata only', () => {
    const f = fixture(), products = f.initialize(); expect(products.map(p => `${p.role}:${p.path}`)).toEqual(['author:brief.md', 'author:draft.schema.json', 'author:brief.json', 'inventory:inventory-brief.md']);
    const read = f.bridge.artifactOrigins('author'); expect(read('brief.md', fs.readFileSync(path.join(f.run, 'brief.md')))?.classes).toEqual(['code-structure', 'derived-composites', 'governance-text', 'work-history']);
    expect(read('brief.md', Buffer.from('Own changed'))).toBeNull(); expect(read('unknown.json', b({ own: true }))).toBeNull();
    expect(() => f.bridge.registerInitial(f.produceInitial())).toThrow();
    const metadata = JSON.stringify(f.bridge.metadata()); expect(metadata).not.toContain('Own actual'); expect(metadata).not.toContain(f.source); expect(metadata).not.toContain('OWN_SECRET_CANARY');
    f.stale(); expect(read('brief.md', fs.readFileSync(path.join(f.run, 'brief.md')))).toBeNull(); expect(f.bridge.hasCommittedCheck(0)).toBe(false);
  });
  it('publishes no initial artifact when the last helper prompt fails verification', () => {
    const f = fixture(), produced = f.produceInitial();
    const designPath = 'reviews/design-session-1.json';
    const design = fs.readFileSync(path.join(f.run, designPath));
    f.write(designPath, b({ ...JSON.parse(design.toString('utf8')), pinnedRevision: 'd'.repeat(40) }));

    expect(() => f.bridge.registerInitial(produced)).toThrow('url-run-artifacts-unavailable');
    expect(f.bridge.metadata()).toMatchObject({ initialRegistered: false, artifacts: [] });
    const briefPath = path.join(f.run, 'brief.md');
    fs.renameSync(briefPath, `${briefPath}.original`);
    fs.copyFileSync(`${briefPath}.original`, briefPath);
    f.write(designPath, design);

    expect(f.bridge.registerInitial(produced)).toHaveLength(4);
    expect(f.bridge.metadata().initialRegistered).toBe(true);
  });
  it('refuses a helper whose issued report and record agree on the wrong role', () => {
    const f = fixture(), produced = f.produceInitial();
    const designPath = 'reviews/design-session-1.json';
    const design = JSON.parse(fs.readFileSync(path.join(f.run, designPath), 'utf8'));
    f.write(designPath, b({ ...design, role: 'inventory' }));
    const sessions = produced.sessions.sessions.map(session =>
      session.kind === 'design' ? { ...session, role: 'inventory' as const } : session);

    expect(() => f.bridge.registerInitial({ ...produced, sessions: { ...produced.sessions, sessions } }))
      .toThrow('url-run-artifacts-unavailable');
    expect(f.bridge.metadata()).toMatchObject({ initialRegistered: false, artifacts: [] });
  });
  it('refuses symlinks, hardlinks, oversized bytes, changed records and decoded secret/active products', () => {
    for (const mutate of [
      (f: ReturnType<typeof fixture>) => { const file = path.join(f.run, 'brief.md'); fs.renameSync(file, `${file}.own`); fs.symlinkSync(`${file}.own`, file); },
      (f: ReturnType<typeof fixture>) => fs.linkSync(path.join(f.run, 'brief.md'), path.join(f.run, 'own-hardlink')),
      (f: ReturnType<typeof fixture>) => f.write('brief.md', Buffer.alloc(1_048_577, 65)),
      (f: ReturnType<typeof fixture>) => { const doc = JSON.parse(fs.readFileSync(path.join(f.run, 'brief.json'), 'utf8')); doc.files.brief.sha256 = 'a'.repeat(64); f.write('brief.json', b(doc)); },
      (f: ReturnType<typeof fixture>) => { const text = 'OWN_SECRET_CANARY'; f.write('brief.md', text); const doc = JSON.parse(fs.readFileSync(path.join(f.run, 'brief.json'), 'utf8')); doc.files.brief.sha256 = sha256(text); f.write('brief.json', b(doc)); },
      (f: ReturnType<typeof fixture>) => { const text = '<script>Own</script>'; f.write('brief.md', text); const doc = JSON.parse(fs.readFileSync(path.join(f.run, 'brief.json'), 'utf8')); doc.files.brief.sha256 = sha256(text); f.write('brief.json', b(doc)); },
    ]) { const f = fixture(), produced = f.produceInitial(); mutate(f); expect(() => f.bridge.registerInitial(produced)).toThrow('url-run-artifacts-unavailable'); }
  });
  it('authenticates source bodies independently and admits draft reports only after actual receipt audit commit', async () => {
    const f = fixture(); f.initialize(); const ownSource = f.receipt('author', 'mcp__syzygy__source_read', { path: 'own.ts', offset: 0, limit: 1 },
      { ok: true, kind: 'source-span', path: 'own.ts', text: f.source, offset: 0, nextOffset: null, contentClass: 'code-content', redacted: false, provenance: { commit: f.pin, objectId: f.blob } });
    await f.bridge.toolReceipt('author', ownSource, f.admission('author')); f.bridge.committed('author', ownSource.id);
    const write = await f.writeDraft(); expect(f.bridge.hasCommittedReport('author', sha256(write.bytes))).toBe(false); f.bridge.committed('author', write.raw.id);
    expect(f.bridge.hasCommittedReport('author', sha256(write.bytes))).toBe(true);
    const actual = f.bridge.artifactOrigins('author')('drafts/next.json', write.bytes)!;
    expect(actual.classes).toContain('code-content'); expect(actual.classes).not.toContain('project-documentation'); expect(actual.classes).not.toContain('evidence-content');
    expect(() => f.bridge.committed('inventory', write.raw.id)).toThrow();
    const altered = { ...ownSource, id: `tool-${'a'.repeat(64)}`, canonicalText: ownSource.canonicalText.replace('Own pinned', 'Changed pinned') };
    await expect(f.bridge.toolReceipt('author', altered, f.admission('author'))).rejects.toThrow();
    const unknownClass = f.admission('author', ['project-documentation']);
    await expect(f.bridge.toolReceipt('author', { ...ownSource, id: `tool-${'b'.repeat(64)}` }, unknownClass)).rejects.toThrow();
  });
  it('never counts a stored check under an unrelated source-read audit commit', async () => {
    const f = fixture(); f.initialize(); const draft = await f.writeDraft(); f.bridge.committed('author', draft.raw.id);
    f.write('drafts/rev-0.json', draft.bytes); const checked = f.checkDoc(draft.bytes);
    const stored = `${JSON.stringify(checked, null, 2)}\n`; f.write('checks/rev-0.json', stored);
    const report = { command: 'check', run: f.run, checkFile: path.join(f.run, 'checks/rev-0.json'), ...checked, disclosures: [] };
    const source = f.receipt('author', 'mcp__syzygy__source_read', { path: 'own.ts', offset: 0, limit: 1 },
      { ok: true, kind: 'source-span', path: 'own.ts', text: f.source, offset: 0, nextOffset: null, contentClass: 'code-content', redacted: false,
        provenance: { commit: f.pin, objectId: f.blob } });
    await f.bridge.toolReceipt('author', source, f.admission('author'));
    // Exercise the retired trusted-root hook when replaying this regression against predecessor bytes.
    const externalRegistration: unknown = Reflect.get(f.bridge, 'registerCheck');
    if (typeof externalRegistration === 'function') await externalRegistration({ report, toolReceiptId: source.id });
    expect(f.bridge.hasCommittedCheck(0)).toBe(false);
    expect(f.bridge.hasCommittedProduct('checks/rev-0.json', sha256(stored))).toBe(false);
    f.bridge.committed('author', source.id);
    expect(f.calls).toEqual([]);
    expect(f.bridge.hasCommittedCheck(0)).toBe(false);
    expect(f.bridge.hasCommittedProduct('checks/rev-0.json', sha256(stored))).toBe(false);
  });
  it('captures real component bytes, checks source/payload identity, and refuses counting before durable commit', async () => {
    const f = fixture(); f.initialize(); const draft = await f.writeDraft(); f.bridge.committed('author', draft.raw.id);
    f.write('drafts/rev-0.json', draft.bytes); const doc = f.checkDoc(draft.bytes), stored = `${JSON.stringify(doc, null, 2)}\n`; f.write('checks/rev-0.json', stored);
    const report = { command: 'check', run: f.run, checkFile: path.join(f.run, 'checks/rev-0.json'), ...doc, disclosures: [] }, response = { stdout: JSON.stringify(report), stderr: '', exit: 0 };
    const argv = ['dossier', 'check', f.run];
    const snapshot = vi.spyOn(productReads, 'snapshotProductFile');
    try {
      for (const refusedWait of [1, 2, 3, 4]) {
        let waits = 0;
        f.replyQueue.push(response);
        await expect(f.bridge.runDossier('author')(argv, null, undefined, async () => ++waits !== refusedWait))
          .rejects.toThrow('url-run-artifacts-unavailable');
        expect(waits).toBe(refusedWait);
        expect(snapshot).not.toHaveBeenCalled();
        expect(f.bridge.dossierOrigins('author')(argv, response)).toBeNull();
        expect(f.bridge.hasCommittedCheck(0)).toBe(false);
      }
    } finally { snapshot.mockRestore(); }
    f.replyQueue.push(response);
    let waits = 0;
    const returned = await f.bridge.runDossier('author')(argv, null, undefined, async () => { waits++; return true; });
    expect(waits).toBe(4);
    expect(returned).toEqual(response); expect(f.calls[0]).toEqual([...argv, '--json']); expect(f.bridge.dossierOrigins('author')(argv, response)?.classes).toContain('code-content');
    expect(f.bridge.hasCommittedCheck(0)).toBe(false);
    const raw = f.receipt('author', 'mcp__syzygy__dossier_step', { argv }, { ok: true, kind: 'dossier-result', ...response });
    await f.bridge.toolReceipt('author', raw, f.admission('author')); expect(f.bridge.hasCommittedCheck(0)).toBe(false); f.bridge.committed('author', raw.id);
    expect(f.bridge.hasCommittedCheck(0, sha256(stored))).toBe(true); expect(f.bridge.hasCommittedCheck(0, 'f'.repeat(64))).toBe(false);
    expect(f.bridge.dossierOrigins('author')(argv, response)).toBeNull();
    const bad = { ...report, limits: { ...report.limits, hidden: 'Own unsupported field' } }; f.replyQueue.push({ stdout: JSON.stringify(bad), stderr: '', exit: 0 });
    await expect(f.bridge.runDossier('author')(argv, null)).rejects.toThrow();
    const forgedRecord = { ...doc, limits: bad.limits }; f.write('checks/rev-0.json', JSON.stringify(forgedRecord));
    f.replyQueue.push({ stdout: JSON.stringify(bad), stderr: '', exit: 0 }); await expect(f.bridge.runDossier('author')(argv, null)).rejects.toThrow();
    const wrongIdentity = { ...doc, draft: { ...doc.draft, file: 'drafts/own.json' } }; f.write('drafts/own.json', draft.bytes); f.write('checks/rev-0.json', JSON.stringify(wrongIdentity));
    f.replyQueue.push({ stdout: JSON.stringify({ ...report, ...wrongIdentity }), stderr: '', exit: 0 }); await expect(f.bridge.runDossier('author')(argv, null)).rejects.toThrow();
  });
  it('preserves checked findings and binds waiting reports to the requested helper round and exit', async () => {
    const f = fixture(); f.initialize();
    const draft = await f.writeDraft(); f.bridge.committed('author', draft.raw.id);
    const doc = { ...f.checkDoc(draft.bytes), outcome: 'findings',
      findings: [{ kind: 'fixture-finding', at: '$', detail: 'Own finding.' }] };
    f.write('drafts/rev-0.json', draft.bytes);
    const stored = `${JSON.stringify(doc, null, 2)}\n`;
    f.write('checks/rev-0.json', stored);
    const check = { stdout: JSON.stringify({ command: 'check', run: f.run, checkFile: path.join(f.run, 'checks/rev-0.json'), ...doc, disclosures: [] }), stderr: '', exit: 1 };
    const checkArgs = ['dossier', 'check', f.run];
    f.replyQueue.push({ ...check, exit: 0 }, check);
    await expect(f.bridge.runDossier('author')(checkArgs, null)).rejects.toThrow();
    await expect(f.bridge.runDossier('author')(checkArgs, null)).resolves.toEqual(check);
    const checked = f.receipt('author', 'mcp__syzygy__dossier_step', { argv: checkArgs }, { ok: true, kind: 'dossier-result', ...check });
    await f.bridge.toolReceipt('author', checked, f.admission('author'));
    expect(f.bridge.hasCommittedCheck(0)).toBe(false);
    f.bridge.committed('author', checked.id);
    expect(f.bridge.hasCommittedCheck(0, sha256(stored))).toBe(true);

    const inventory = await f.commitInventory(false);
    expect(f.bridge.hasCommittedProduct('inventory/checks/rev-0.json', sha256(inventory.checkedBytes))).toBe(true);
    expect(inventory.checked.outcome).toBe('findings');

    const awaitArgs = ['dossier', 'await', f.dir('fidelity'), '--round', '2'];
    const waiting = { command: 'await', format: 'polaris-dossier-await/1', outcome: 'waiting', role: 'review', kind: 'fidelity',
      session: 1, round: 2, waitedUntil: '2026-11-19T00:00:10.000Z', deadline: '2026-11-19T01:00:00.000Z', next: 'Own wait.', disclosures: [] };
    const reply = { stdout: JSON.stringify(waiting), stderr: '', exit: 3 };
    for (const candidate of [{ ...reply, exit: 0 }, { ...reply, stdout: JSON.stringify({ ...waiting, round: 1 }) },
      { ...reply, stdout: JSON.stringify({ ...waiting, outcome: 'refused' }) }]) {
      f.replyQueue.push(candidate);
      await expect(f.bridge.runDossier('fidelity')(awaitArgs, null)).rejects.toThrow();
    }
    f.replyQueue.push(reply);
    await expect(f.bridge.runDossier('fidelity')(awaitArgs, null)).resolves.toEqual(reply);
    expect(f.bridge.dossierOrigins('fidelity')(awaitArgs, reply)).not.toBeNull();
  });
  it('screens actual control replies and retains original question source classes without persisting the exchange', async () => {
    const f = fixture(); f.initialize(); const original = f.receipt('author', 'mcp__syzygy__source_read', { path: 'own.ts', offset: 0, limit: 1 },
      { ok: true, kind: 'source-span', path: 'own.ts', text: f.source, offset: 0, nextOffset: null, contentClass: 'code-content', redacted: false, provenance: { commit: f.pin, objectId: f.blob } });
    await f.bridge.toolReceipt('author', original, f.admission('author')); f.bridge.committed('author', original.id);
    const question = { kind: 'question', question: 'Own consequential question?', evidence: 'Own source context.' }, questionSha256 = sha256(canonical(question)), nonce = '1'.repeat(32);
    const pending = f.receipt('author', 'mcp__syzygy__dossier_step', { argv: ['dossier', 'clarify', f.run, '--stdin'], stdin: canonical(question) },
      { ok: true, kind: 'session-clarification', state: 'pending', nonce, questionSha256 });
    await f.bridge.toolReceipt('author', pending, f.admission('author')); f.bridge.committed('author', pending.id);
    const answer = f.receipt('author', 'mcp__syzygy__dossier_step', { argv: ['dossier', 'clarify', f.run, '--stdin'], stdin: canonical({ kind: 'answer', nonce, questionSha256 }) },
      { ok: true, kind: 'session-clarification', state: 'answered', nonce, questionSha256, answerKind: 'free-text', answer: 'Own private answer.', attribution: 'operator', label: 'Inferred' });
    await f.bridge.toolReceipt('author', answer, f.admission('author')); f.bridge.committed('author', answer.id);
    const metadata = JSON.stringify(f.bridge.metadata()); for (const secret of [question.question, 'Own private answer.', questionSha256, nonce]) expect(metadata).not.toContain(secret);
    expect(f.bridge.metadata().pendingQuestions).toBe(0);
    for (const reply of [{ ok: true, kind: 'session-control', state: 'pending', events: [], hidden: true },
      { ok: true, kind: 'session-control', state: 'events', events: [{ event: 'draft-ready', revision: 0, sequence: 1, hidden: true }] },
      { ok: true, kind: 'session-clarification', state: 'answered', nonce, questionSha256, answerKind: 'free-text', answer: '<script>Own</script>', attribution: 'operator', label: 'Inferred' }]) {
      const raw = f.receipt('author', 'mcp__syzygy__dossier_step', { argv: ['dossier', 'poll', f.run] }, reply);
      await expect(f.bridge.toolReceipt('author', raw, f.admission('author'))).rejects.toThrow();
    }
    const design = { event: 'design-round-prepared', round: 2, path: 'round-2/design-view.json',
      packetSha256: 'a'.repeat(64), viewSha256: 'b'.repeat(64), sequence: 2 };
    const poll = { argv: ['dossier', 'poll', f.run] };
    const designReply = (event: typeof design) => ({ ok: true, kind: 'session-control', state: 'events', events: [event] });
    for (const role of ['author', 'inventory', 'fidelity'] as const)
      await expect(f.bridge.toolReceipt(role, f.receipt(role, 'mcp__syzygy__dossier_step', poll, designReply(design)), f.admission(role))).rejects.toThrow();
    for (const forged of [{ ...design, path: 'round-2/packet.json' }, { ...design, sequence: 0 }, { ...design, round: 1 }])
      await expect(f.bridge.toolReceipt('design', f.receipt('design', 'mcp__syzygy__dossier_step', poll, designReply(forged)), f.admission('design'))).rejects.toThrow();
    const exact = f.receipt('design', 'mcp__syzygy__dossier_step', poll, designReply(design));
    await f.bridge.toolReceipt('design', exact, f.admission('design'));
    f.bridge.committed('design', exact.id);
  });
  it('captures genuine schema-bound submitted evidence and full packet source/report lineage, including trailing json normalization', async () => {
    const f = fixture(); f.initialize(); const draft = await f.commitCheck(), inventory = await f.commitInventory();
    expect(f.bridge.hasCommittedReport('inventory', sha256(inventory.bytes))).toBe(true);
    expect(f.calls.at(-1)?.filter(a => a === '--json')).toHaveLength(1);
    expect(f.calls.at(-1)?.[2]).toBe(`${f.dir('inventory')}/`);
    const packet = f.producePacket(draft.bytes, inventory.bytes); const products = await f.bridge.registerPacket({ kind: 'fidelity', round: 1, packetSha256: packet.digest });
    expect(products.map(p => p.path)).toEqual(['round-1/packet.json', 'round-1/packet.sha256']);
    const origin = f.bridge.artifactOrigins('fidelity')('round-1/packet.json', Buffer.from(packet.bytes))!;
    expect(origin.classes).toEqual(['code-content', 'code-structure', 'derived-composites', 'evidence-content', 'governance-text', 'work-history']);
    expect(origin.classes).not.toContain('project-documentation');
    const altered = f.producePacket(draft.bytes, inventory.bytes, doc => { (doc['spans'] as Record<string, unknown>[])[0]!['text'] = 'Own altered source.\n'; });
    await expect(f.bridge.registerPacket({ kind: 'fidelity', round: 1, packetSha256: altered.digest })).rejects.toThrow();
    const foreign = f.producePacket(draft.bytes, inventory.bytes, doc => { (doc['inventory'] as Record<string, unknown>)['sha256'] = 'f'.repeat(64); });
    await expect(f.bridge.registerPacket({ kind: 'fidelity', round: 1, packetSha256: foreign.digest })).rejects.toThrow();
    const alteredCheck = { ...inventory.checked, outcome: 'findings' }; f.write('inventory/checks/rev-0.json', JSON.stringify(alteredCheck));
    expect(f.bridge.hasCommittedProduct('inventory/checks/rev-0.json', sha256(JSON.stringify(alteredCheck)))).toBe(false);
  });
  it('preserves the committed author check if staging its paired draft fails', async () => {
    const f = fixture();
    f.initialize();
    const { checkRaw } = await f.commitCheck();
    const original = f.bridge.latestStageCheck('author');
    expect(original).toMatchObject({ revision: 0, record: { outcome: 'passed' } });
    const { stdout, stderr, exit } = JSON.parse(checkRaw.canonicalText) as BrokerResponse;
    f.replyQueue.push({ stdout, stderr, exit });

    const readFile = productReads.snapshotProductFile;
    const inspected: string[] = [];
    const snapshot = vi.spyOn(productReads, 'snapshotProductFile').mockImplementation((root, file, maximum, check) => {
      inspected.push(file);
      if (file === 'drafts/rev-0.json') throw new Error('owned fixture draft read failed');
      return readFile(root, file, maximum, check);
    });
    try {
      await expect(f.bridge.runDossier('author')(['dossier', 'check', f.run], null)).rejects.toThrow('url-run-artifacts-unavailable');
    } finally { snapshot.mockRestore(); }
    expect(inspected).toEqual(['checks/rev-0.json', 'drafts/rev-0.json']);
    expect(f.bridge.latestStageCheck('author')).toEqual(original);
    expect(f.bridge.hasCommittedCheck(0)).toBe(true);
  });
  it('polls only the latest exact paired committed product without issuing receipts', async () => {
    const f = fixture(); f.initialize();
    expect(f.bridge.latestStageCheck('author')).toBeNull();
    const draft = await f.commitCheck(false);
    expect(() => f.bridge.latestStageCheck('author')).toThrow('url-run-artifacts-unavailable');
    f.bridge.committed('author', draft.checkRaw.id);
    expect(f.bridge.latestStageCheck('author')).toMatchObject({ revision: 0, record: { outcome: 'passed' }, verdict: null });
    const inventory = await f.commitInventory(false);
    expect(f.bridge.latestStageCheck('inventory')).toMatchObject({ revision: 0, record: { outcome: 'findings' }, verdict: null });
    const author = f.bridge.latestStageCheck('author'), checkedInventory = f.bridge.latestStageCheck('inventory');
    f.verifyCurrent.mockClear();
    expect(f.bridge.latestStageChecks()).toEqual({ author, inventory: checkedInventory, fidelity: null, design: null });
    expect(f.verifyCurrent).toHaveBeenCalledTimes(4);
    const budget = f.bridge.metadata().registrations;
    for (let poll = 0; poll < 4; poll++) expect(f.bridge.latestStageCheck('inventory')?.revision).toBe(0);
    expect(f.bridge.metadata().registrations).toBe(budget);
    f.write('inventory/checks/rev-1.json', inventory.checkedBytes);
    expect(() => f.bridge.latestStageCheck('inventory')).toThrow('url-run-artifacts-unavailable');
    expect(() => f.bridge.latestStageChecks()).toThrow('url-run-artifacts-unavailable');
    fs.unlinkSync(path.join(f.run, 'inventory/checks/rev-1.json'));
    expect(f.bridge.latestStageCheck('inventory')?.revision).toBe(0);
    f.write('inventory/rev-0.replacement', inventory.bytes);
    fs.renameSync(path.join(f.run, 'inventory/rev-0.replacement'), path.join(f.run, 'inventory/rev-0.json'));
    expect(() => f.bridge.latestStageCheck('inventory')).toThrow('url-run-artifacts-unavailable');
  });

  it('stops fidelity packet construction before a protected population read when its sample fails', async () => {
    const f = fixture();
    f.initialize();
    await f.commitCheck();
    await f.commitInventory();
    const { subject, declared } = f.options.record;
    const opened = { ok: true as const, run: f.run, runId: f.runId, subject, declared,
      deadlineEnds: Date.parse('2026-11-19T01:00:00.000Z'), revision: { commit: f.pin, label: subject.pinnedRevision.label },
      contentClasses: subject.contentClasses };
    const census = vi.spyOn(productReads, 'snapshotProductNames');
    try {
      const groups = [[], ['checks', 'drafts'], ['checks', 'drafts', 'inventory/checks', 'inventory']];
      for (const [index, expected] of groups.entries()) {
        let waits = 0;
        census.mockClear();
        const reads = beginRunProductReads(f.run, f.bridge, 'review-packet', Date.now() + 4000, async () => ++waits <= index);
        try {
          await expect(buildFidelityPacket(opened, { sources: fixtureSources(f.pin), productReads: reads,
            now: () => Date.parse('2026-11-19T00:00:09.000Z') }))
            .rejects.toThrow('the authenticated URL products are unavailable or changed');
          expect(waits).toBe(index + 1);
          expect(census.mock.calls.map(([, directory]) => directory)).toEqual(expected);
          expect(reads.isLeaseOpen()).toBe(false);
        } finally { reads.close(); }
      }
      // A fresh inventory read has no cached author population.
      census.mockClear();
      const inventoryReads = beginRunProductReads(f.run, f.bridge, 'review-packet', Date.now() + 4000, async () => false);
      try {
        await expect(inventoryOfRecord(f.run, { sources: fixtureSources(f.pin), now: Date.parse('2026-11-19T00:00:09.000Z'),
          productReads: inventoryReads })).rejects.toThrow('the authenticated URL products are unavailable or changed');
        expect(census.mock.calls.map(([, directory]) => directory)).toEqual(['inventory/checks', 'inventory']);
      } finally { inventoryReads.close(); }
    } finally { census.mockRestore(); }
  });

  it('refuses render fidelity input reads before the verdict census when an active sample fails', async () => {
    const f = fixture();
    f.initialize();
    const { subject, declared } = f.options.record;
    const opened = { ok: true as const, run: f.run, runId: f.runId, subject, declared,
      deadlineEnds: Date.parse('2026-11-19T01:00:00.000Z'), revision: { commit: f.pin, label: subject.pinnedRevision.label },
      contentClasses: subject.contentClasses };
    const names = vi.spyOn(productReads, 'snapshotProductNames');
    const reads = beginRunProductReads(f.run, f.bridge, 'render', Date.now() + 4000, async () => false);
    try {
      await expect(reviewOfRecord(opened, { sources: fixtureSources(f.pin), now: () => Date.parse('2026-11-19T00:00:09.000Z'),
        productReads: reads })).rejects.toThrow('the authenticated URL products are unavailable or changed');
      expect(names).not.toHaveBeenCalled();
      expect(reads.isLeaseOpen()).toBe(false);
    } finally {
      reads.close();
      names.mockRestore();
    }
  });

  it('refuses a whole stage poll if authority changes during its last descriptor read', () => {
    const f = fixture();
    f.initialize();
    const snapshot = productReads.snapshotProductNames;
    const census = vi.spyOn(productReads, 'snapshotProductNames');
    try {
      expect(f.bridge.latestStageChecks()).toEqual({ author: null, inventory: null, fidelity: null, design: null });
      const descriptors = census.mock.calls.length;
      expect(descriptors).toBe(16);
      census.mockClear();
      census.mockImplementation((...args) => {
        const names = snapshot(...args);
        if (census.mock.calls.length === descriptors) f.stale();
        return names;
      });
      expect(() => f.bridge.latestStageChecks()).toThrow('url-run-artifacts-unavailable');
      expect(census).toHaveBeenCalledTimes(descriptors);
    } finally {
      census.mockRestore();
    }
  });

  it('stops packet registration before the next protected read when an active sample fails', async () => {
    const f = fixture();
    f.initialize();
    const draft = await f.commitCheck(), inventory = await f.commitInventory();
    const packet = f.producePacket(draft.bytes, inventory.bytes);
    const input = { kind: 'fidelity', round: 1, packetSha256: packet.digest } as const;
    const packetFiles = ['round-1/packet.json', 'round-1/packet.sha256'];
    const deliveryFiles = ['round-1/delivery.json', 'round-1/verdict.schema.json', 'reviews/fidelity-session-1.delivery-1.json'];
    const snapshot = vi.spyOn(productReads, 'snapshotProductFile');
    try {
      for (const refusedAt of [1, 2, 3]) {
        snapshot.mockClear();
        let waits = 0;
        const wait = vi.fn(async () => ++waits !== refusedAt);
        await expect(f.bridge.registerPacket(input, wait)).rejects.toThrow('url-run-artifacts-unavailable');
        expect(wait).toHaveBeenCalledTimes(refusedAt);
        expect(snapshot.mock.calls.map(([, file]) => file)).toEqual(refusedAt === 1 ? packetFiles : [...packetFiles, ...deliveryFiles]);
        expect(f.bridge.artifactOrigins('fidelity')('round-1/packet.json', Buffer.from(packet.bytes))).toBeNull();
        expect(f.bridge.metadata().artifacts.filter(item => item.path.startsWith('round-1/'))).toEqual([]);
      }
      const wait = vi.fn(async () => true);
      await expect(f.bridge.registerPacket(input, wait)).resolves.toHaveLength(2);
      expect(wait).toHaveBeenCalledTimes(3);
    } finally { snapshot.mockRestore(); }
  });
  it('keeps every round artifact unavailable when validating its schema file fails', async () => {
    const f = fixture(); f.initialize(); const draft = await f.commitCheck(), inventory = await f.commitInventory();
    const packet = f.producePacket(draft.bytes, inventory.bytes);
    const input = { kind: 'fidelity', round: 1, packetSha256: packet.digest } as const;
    const schema = path.join(f.dir('fidelity'), 'round-1', 'verdict.schema.json');
    fs.writeFileSync(schema, '{}');
    await expect(f.bridge.registerPacket(input)).rejects.toThrow('url-run-artifacts-unavailable');
    expect(f.bridge.artifactOrigins('fidelity')('round-1/packet.json', Buffer.from(packet.bytes))).toBeNull();
    expect(f.bridge.artifactOrigins('fidelity')('round-1/packet.sha256', Buffer.from(`${packet.digest}  packet.json\n`))).toBeNull();
    expect(f.bridge.metadata().artifacts.filter(item => item.path.startsWith('round-1/'))).toEqual([]);
    fs.unlinkSync(schema);
    await expect(f.bridge.registerPacket(input)).resolves.toHaveLength(2);
  });
  it('requires the exact committed passing inventory check for its packet revision', async () => {
    const f = fixture(); f.initialize(); const draft = await f.commitCheck(), inventory = await f.commitInventory(false);
    const packet = f.producePacket(draft.bytes, inventory.bytes);
    await expect(f.bridge.registerPacket({ kind: 'fidelity', round: 1, packetSha256: packet.digest }))
      .rejects.toThrow('url-run-artifacts-unavailable');
  });
  it('refuses a byte-identical packet replacement between capture and binding', async () => {
    const f = fixture();
    f.initialize();
    const draft = await f.commitCheck(), inventory = await f.commitInventory();
    const packet = f.producePacket(draft.bytes, inventory.bytes);
    const file = path.join(f.dir('fidelity'), 'round-1', 'packet.json');
    const replace = new Promise<void>((resolve, reject) => setImmediate(() => {
      try {
        fs.writeFileSync(file + '.replacement', packet.bytes);
        fs.renameSync(file + '.replacement', file);
        resolve();
      } catch (error) { reject(error); }
    }));
    const registering = f.bridge.registerPacket({ kind: 'fidelity', round: 1, packetSha256: packet.digest });
    await Promise.all([replace, expect(registering).rejects.toThrow('url-run-artifacts-unavailable')]);
    expect(f.bridge.artifactOrigins('fidelity')('round-1/packet.json', Buffer.from(packet.bytes))).toBeNull();
    expect(f.bridge.metadata().artifacts.filter(item => item.path.startsWith('round-1/'))).toEqual([]);
  });
  it('refuses a packet after replacement of an exact committed check, even with equal bytes', async () => {
    const f = fixture(); f.initialize(); const draft = await f.commitCheck(), inventory = await f.commitInventory();
    const packet = f.producePacket(draft.bytes, inventory.bytes);
    f.write('inventory/checks/rev-0.replacement', inventory.checkedBytes);
    fs.renameSync(path.join(f.run, 'inventory/checks/rev-0.replacement'), path.join(f.run, 'inventory/checks/rev-0.json'));
    await expect(f.bridge.registerPacket({ kind: 'fidelity', round: 1, packetSha256: packet.digest }))
      .rejects.toThrow('url-run-artifacts-unavailable');
  });
  it('refuses active content even in a verified source span embedded in an otherwise valid composition', async () => {
    const f = fixture('const own = "<script>Own</script>";\n'); f.initialize(); const draft = await f.commitCheck(), inventory = await f.commitInventory();
    const packet = f.producePacket(draft.bytes, inventory.bytes); await expect(f.bridge.registerPacket({ kind: 'fidelity', round: 1, packetSha256: packet.digest })).rejects.toThrow('url-run-artifacts-unavailable');
    expect(f.bridge.artifactOrigins('fidelity')('round-1/packet.json', Buffer.from(packet.bytes))).toBeNull();
  });
  it('accepts exact help and an actual own-run status report while bounding limits and refusing response drift', async () => {
    const f = fixture(); f.initialize(); f.write('run.json', encodeRunRecord(f.options.record.declared, f.options.record.subject));
    const status = runStatus(f.run, () => Date.UTC(2026, 10, 19, 0, 1)); if (!status.ok) throw Error(status.reason);
    for (const [argv, response] of [[['dossier', 'help'], { stdout: f.options.helpText, stderr: '', exit: 0 }],
      [['dossier', 'status', f.run], { stdout: JSON.stringify(status.report), stderr: '', exit: 0 }]] as const) {
      f.replyQueue.push(response); const returned = await f.bridge.runDossier('author')(argv, null);
      expect(f.bridge.dossierOrigins('author')(argv, { ...returned, stdout: `${returned.stdout} ` })).toBeNull();
      const raw = f.receipt('author', 'mcp__syzygy__dossier_step', { argv }, { ok: true, kind: 'dossier-result', ...returned });
      await f.bridge.toolReceipt('author', raw, f.admission('author')); f.bridge.committed('author', raw.id);
    }
    expect(() => createUrlRunArtifacts({ ...f.options, limits: [] as never })).toThrow();
    const limited = fixture(), bridge = createUrlRunArtifacts({ ...limited.options, limits: { readBytes: 1 } });
    expect(() => bridge.registerInitial(limited.produceInitial())).toThrow();
  });
  it('binds review feedback only from a committed exact verdict and matching committed check, to the two fixed recipient roots', async () => {
    const f = fixture(); f.initialize(); const draft = await f.commitCheck(), inventory = await f.commitInventory(), packet = f.producePacket(draft.bytes, inventory.bytes);
    await f.bridge.registerPacket({ kind: 'fidelity', round: 1, packetSha256: packet.digest }); const verdict = await f.submitFidelity(packet);
    for (const role of ['author', 'inventory'] as const) { const directory = path.join(f.dir(role), 'feedback'); fs.mkdirSync(directory); fs.writeFileSync(path.join(directory, 'fidelity-verdict-0.json'), verdict.bytes); }
    const input = { review: 'fidelity', number: 0, sha256: sha256(verdict.bytes), recipients: ['author', 'inventory'] } as const;
    expect(() => f.bridge.registerFeedback(input)).toThrow(); expect(f.bridge.hasCommittedProduct('reviews/checks/fidelity-verdict-0.json', sha256(verdict.checkedBytes))).toBe(false);
    f.bridge.committed('fidelity', verdict.raw.id);
    expect(f.bridge.hasCommittedProduct('reviews/checks/fidelity-verdict-0.json', sha256(verdict.checkedBytes))).toBe(true);
    expect(f.bridge.registerFeedback(input).map(p => p.role)).toEqual(['author', 'inventory']);
    const origin = f.bridge.artifactOrigins('inventory')('feedback/fidelity-verdict-0.json', verdict.bytes)!;
    expect(origin.classes).toContain('evidence-content'); expect(origin.classes).toContain('code-content'); expect(origin.classes).not.toContain('project-documentation');
    fs.writeFileSync(path.join(f.dir('inventory'), 'feedback/fidelity-verdict-0.json'), 'Own changed'); expect(() => f.bridge.registerFeedback(input)).toThrow();
    expect(() => f.bridge.registerFeedback({ ...input, recipients: ['fidelity'] as never })).toThrow();
    expect(() => f.bridge.registerFeedback({ ...input, number: 1 })).toThrow();
  });
  it('records the current policy refusal for an actual own fixture rendered by the installed renderer', async () => {
    const f = fixture(); f.initialize(); const author = await f.commitCheck();
    const module = await import(new URL('../../../apps/three-surface-poc/src/polaris-generation/dossier-site.ts', import.meta.url).href) as { renderLocalDossier: DossierRenderer };
    const sources = generationSourcesForBody({ sourceId: 'src-0123456789abcdef01234567', repositoryId: 'own-renderer', revision: f.pin, path: 'own.ts', objectId: f.blob, body: f.source, evaluationId: 'own-evaluation' });
    const rendered = module.renderLocalDossier({ sources, local: {
      draft: { title: 'Own dossier', introduction: { id: 'intro', text: 'Own introduction.', sourceIds: [] }, sections: [], diagrams: [], deepDives: [], unresolved: [] },
      withheldTitle: 'Own withheld dossier', draftLayer: { state: 'editorial-draft', inferenceProvenance: { modelIdentity: 'own-model', modelVersion: null, declaredBy: 'operator', label: 'Inferred' } },
      blocks: new Map([['intro', { marking: 'inferred', unknownReason: null, basis: 'Own fixture.', executions: [], segments: [{ kind: 'prose', text: 'Own introduction.' }] }]]),
      glossary: [], disclosure: [], sourceAnchors: new Map(sources.map(source => [source.sourceId, { targetClass: 'evidence-artifact-identifier-with-integrity-digest' as const,
        identifier: f.blob, algorithm: 'sha1', fragment: null, targetState: f.pin, pathLabel: 'own.ts' }])), pages: [], reviewStatus: [{ id: 'own-review-status', label: 'Unknown', text: 'Own review unknown.' }],
    } });
    const built = buildDesignPacket({ run: f.run, runId: f.runId, pinnedRevision: f.pin, audience: 'Own readers', files: rendered.files });
    if (!built.ok) throw Error(built.reason);
    expect(f.screen.screenBody(built.bytes)).toBe('active-content');
    const directory = path.join(f.dir('design'), 'round-1'); fs.mkdirSync(directory);
    fs.writeFileSync(path.join(directory, 'packet.json'), built.bytes); fs.writeFileSync(path.join(directory, 'packet.sha256'), `${built.sha256}  packet.json\n`);
    fs.writeFileSync(path.join(directory, 'delivery.json'), b({ format: 'polaris-dossier-delivery/1', kind: 'design', runId: f.runId, session: 1, round: 1, packetSha256: built.sha256 }));
    f.write('reviews/design-session-1.delivery-1.json', b({ format: 'polaris-dossier-delivery/1', role: 'review', kind: 'design', runId: f.runId, session: 1, round: 1,
      packetSha256: built.sha256, packetBytes: Buffer.byteLength(built.bytes), packet: { sha256: built.sha256, site: 1 }, deliveredAt: '2026-11-19T00:00:02.000Z', continuing: false, earlierRounds: [], label: 'Inferred' }));
    await expect(f.bridge.registerPacket({ kind: 'design', round: 1, packetSha256: built.sha256,
      parents: [f.bridge.reportReceipt('author', sha256(author.bytes)), f.bridge.checkReceipt(0)] } as never)).rejects.toThrow('url-run-artifacts-unavailable');
    await expect(f.bridge.registerPacket({ kind: 'design', round: 1, packetSha256: built.sha256 } as never)).rejects.toThrow('url-run-artifacts-unavailable');
    expect(f.bridge.artifactOrigins('design')('round-1/packet.json', Buffer.from(built.bytes))).toBeNull();
  });
});
