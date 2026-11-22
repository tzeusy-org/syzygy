import path from 'node:path';
import { encodeCanonicalJson, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { deepFreeze, isRecord, sha256 } from '@syzygy/support';
import { bindUrlSourceReader } from './url-source-reader.js';
import { checkDraftShape, draftSchemaDocument, inventorySchemaDocument, verdictSchemaDocument, designVerdictSchemaDocument,
  localDraftSchema, localInventorySchema, localVerdictSchema, localDesignVerdictSchema } from './draft-schema.js';
import { sourceBindingSha256 } from './run-record.js';
import { createUrlOriginLedger, type UrlOriginLedgerOptions, type UrlOriginReceipt } from './url-origin-ledger.js';
import { isPreparedUrlRolePlan, urlRoleInputOriginId, type UrlRolePlan } from './url-role-plan.js';
import { URL_ROLES, type UrlPlannedOrigin } from './url-run-record.js';
import type { UrlLoadedRenderer } from './url-runtime.js';

type Role = typeof URL_ROLES[number];
type BaseClass = 'code-content' | 'project-documentation' | 'governance-text';
const BASE_CLASSES: readonly BaseClass[] = ['code-content', 'project-documentation', 'governance-text'];
const BOUNDS = { maxBytes: 2_097_152, maxNodes: 65_536, maxDepth: 32 } as const;
const INITIAL_CLASSES = ['code-structure', 'derived-composites', 'governance-text', 'work-history'];
const ROOT_IDS = ['origin:role-policy', 'origin:run-control', 'origin:tool-metadata'];
export const URL_RUN_ORIGIN_LIMITS = Object.freeze({ treeEntries: 16_384, milliseconds: 5000 });
export interface UrlRunOriginsOptions extends Pick<UrlOriginLedgerOptions, 'runId' | 'record' | 'screen' | 'basePolicyBytes' | 'originPolicy' | 'current' | 'sourceStore'> {
  /** Genuine results of a completed four-role prepareUrlRolePlans call, in URL_ROLES order. */
  readonly roles: readonly UrlRolePlan[];
  readonly renderer?: UrlLoadedRenderer;
  readonly limits?: Partial<{ readonly treeEntries: number; readonly milliseconds: number }>;
}
export interface UrlNativePreparationCheck {
  readonly format: 'polaris-url-native-preparation-check/1'; readonly label: 'Inferred';
  readonly runId: string; readonly sourceBindingSha256: string; readonly pinnedCommit: string;
  readonly policies: { readonly baseSha256: string; readonly originSha256: string };
  readonly roles: readonly { readonly role: Role; readonly profileSha256: string; readonly commandSha256: string;
    readonly viewSha256: string; readonly probe: 'owned-synthetic-namespace-probe-passed' }[];
  readonly providerSends: 'Unknown'; readonly providerReceipts: 'Unknown'; readonly modelServed: 'Unknown'; readonly sessionTermination: 'Unknown';
}
const canonical = (value: unknown): string => encodeCanonicalJson(value, BOUNDS);
const copy = <T>(value: T): T => deepFreeze(parseBoundedJson(canonical(value), BOUNDS)) as T;
const bytes = (value: unknown): Uint8Array => Buffer.from(canonical(value));
function refuse(): never { throw new Error('url-run-origins-unavailable'); }
const relative = (value: string): boolean => value.length > 0 && Buffer.byteLength(value) <= 4096 && !/[\\\u0000-\u0020\u007f]/u.test(value)
  && !value.startsWith('/') && value.split('/').every(part => part !== '' && part !== '.' && part !== '..');

/** Build provenance from actual host producers. This does not launch, deliver, persist or adopt
 * anything. The genuine preparation token proves only that its own four local probes completed;
 * stored report history remains Inferred and says nothing about later launches/provider service. */
export async function createUrlRunOrigins(given: UrlRunOriginsOptions) {
  try { return await create(given); } catch { return refuse(); }
}
async function create(given: UrlRunOriginsOptions) {
  if (!isRecord(given) || Object.keys(given).some(key => !['runId', 'record', 'screen', 'basePolicyBytes', 'originPolicy', 'current', 'roles', 'renderer', 'limits', 'sourceStore'].includes(key))) refuse();
  if (given.limits !== undefined && !isRecord(given.limits)) refuse();
  const limits = Object.freeze({ ...URL_RUN_ORIGIN_LIMITS, ...given.limits });
  if (Object.keys(limits).length !== Object.keys(URL_RUN_ORIGIN_LIMITS).length || Object.entries(limits).some(([key, value]) => !Object.hasOwn(URL_RUN_ORIGIN_LIMITS, key)
    || !Number.isSafeInteger(value) || value < 1 || value > URL_RUN_ORIGIN_LIMITS[key as keyof typeof limits]) || typeof given.current !== 'function') refuse();
  const current = given.current, runId = given.runId, record = copy(given.record), screen = Object.freeze({ ...given.screen });
  const live = (): void => { if (current() !== true) refuse(); };
  live();
  if (!Array.isArray(given.roles) || given.roles.length !== URL_ROLES.length) refuse();
  const roles: readonly UrlRolePlan[] = Object.freeze([...given.roles]);
  const bindingSha256 = sourceBindingSha256(record.subject), pin = record.subject.pinnedRevision.commit;
  for (const [index, plan] of roles.entries()) {
    if (!isPreparedUrlRolePlan(plan) || plan.role !== URL_ROLES[index] || plan.probe !== 'owned-synthetic-namespace-probe-passed') refuse();
    const binding = plan.profile.input.binding, declaration = plan.declaration;
    if (binding.role !== plan.role || binding.run !== runId || binding.sourceBinding !== bindingSha256 || binding.policy !== record.subject.screeningPolicy.sha256
      || binding.provider !== record.declared.agentProvider || binding.model !== record.declared.model || declaration.role !== plan.role
      || declaration.sessionId !== plan.profile.input.sessionId || declaration.compiledProfileSha256 !== plan.profile.digest
      || declaration.instructionSha256 !== sha256(plan.profile.input.systemPrompt) || declaration.inputPacketSha256 !== sha256(plan.profile.input.initialPrompt)
      || declaration.inputOriginId !== urlRoleInputOriginId(plan.role) || plan.initialOrigin.id !== declaration.inputOriginId
      || plan.initialOrigin.canonicalText !== plan.profile.input.initialPrompt || canonical(plan.initialOrigin.binding) !== canonical(binding)
      || canonical([...plan.initialOrigin.classes].sort()) !== canonical(INITIAL_CLASSES) || canonical([...plan.initialOrigin.originIds].sort()) !== canonical([...ROOT_IDS].sort())) refuse();
  }
  if (new Set(roles.map(role => role.profile.input.sessionId)).size !== URL_ROLES.length) refuse();
  const preparation: UrlNativePreparationCheck = copy({ format: 'polaris-url-native-preparation-check/1', label: 'Inferred', runId,
    sourceBindingSha256: bindingSha256, pinnedCommit: pin, policies: { baseSha256: record.subject.screeningPolicy.sha256, originSha256: given.originPolicy.binding.sha256 },
    roles: roles.map(plan => ({ role: plan.role, profileSha256: plan.profile.digest, commandSha256: plan.declaration.commandSha256,
      viewSha256: plan.declaration.viewSha256, probe: plan.probe })), providerSends: 'Unknown', providerReceipts: 'Unknown', modelServed: 'Unknown', sessionTermination: 'Unknown' });
  const preparationBytes = bytes(preparation), preparationText = canonical(preparation);
  const rolePolicyBytes = bytes({ format: 'polaris-url-role-policies/1', policies: roles.map(plan => ({ role: plan.role, system: plan.profile.input.systemPrompt })) });
  const runControlBytes = bytes({ format: 'polaris-url-run-control/1', runId, sourceBindingSha256: bindingSha256, pinnedCommit: pin,
    provider: record.declared.agentProvider, model: record.declared.model, deadline: record.declared.deadline,
    roles: roles.map(plan => ({ role: plan.role, sessionId: plan.profile.input.sessionId })) });
  const toolMetadataBytes = bytes({ format: 'polaris-url-tool-metadata/1', roles: roles.map(plan => ({ role: plan.role, tools: plan.profile.baseline.tools,
    mcpSha256: plan.declaration.mcpSha256, configurationSha256: plan.declaration.configurationSha256 })) });
  const schemaParameters = { pinnedRevision: pin }, draftParameters = { ...schemaParameters, maxQuestions: record.declared.maxQuestions };
  const schemaDocuments = { draft: bytes(draftSchemaDocument(draftParameters)), inventory: bytes(inventorySchemaDocument(schemaParameters)),
    fidelity: bytes(verdictSchemaDocument(schemaParameters)), design: bytes(designVerdictSchemaDocument(schemaParameters)) };
  const roleSession = new Map(roles.map(plan => [plan.role, plan.profile.input.sessionId]));
  const validate = (schema: ReturnType<typeof localDraftSchema>, role: Role, value: unknown): boolean => isRecord(value)
    && value['sessionId'] === roleSession.get(role) && checkDraftShape(schema, value).length === 0;
  const sourceStore = given.sourceStore ?? 'owned-loose';
  const ledger = createUrlOriginLedger({ sourceStore, runId, record, screen, basePolicyBytes: given.basePolicyBytes, originPolicy: given.originPolicy, current,
    fixed: [{ id: ROOT_IDS[0]!, kind: 'policy', bytes: rolePolicyBytes }, { id: ROOT_IDS[1]!, kind: 'run-control', bytes: runControlBytes },
      { id: ROOT_IDS[2]!, kind: 'structure', bytes: toolMetadataBytes },
      ...Object.entries(schemaDocuments).map(([kind, value]) => ({ id: `origin:${kind}-schema`, kind: 'schema' as const, bytes: value }))],
    schemas: { draft: (value, role) => role === 'author' && validate(localDraftSchema(draftParameters), role, value),
      inventory: (value, role) => role === 'inventory' && validate(localInventorySchema(schemaParameters), role, value),
      'fidelity-verdict': (value, role) => role === 'fidelity' && validate(localVerdictSchema(schemaParameters), role, value),
      'design-verdict': (value, role) => role === 'design' && validate(localDesignVerdictSchema(schemaParameters), role, value),
      // Exact independently derived preparation record only; an arbitrary dossier quality check is not this species instance.
      check: (value, role) => role === 'author' && canonical(value) === preparationText } });
  const roots = Object.freeze({ rolePolicy: ledger.fixed(ROOT_IDS[0]!, rolePolicyBytes), runControl: ledger.fixed(ROOT_IDS[1]!, runControlBytes),
    toolMetadata: ledger.fixed(ROOT_IDS[2]!, toolMetadataBytes) });
  const rootParents = Object.freeze([roots.rolePolicy, roots.runControl, roots.toolMetadata]);
  const preparationReceipt = ledger.report({ role: 'author', kind: 'check', bytes: preparationBytes, parents: rootParents });
  const initialReceipts = {} as Record<Role, UrlOriginReceipt>, aliases = new Map<string, string>();
  for (const role of roles) {
    const receipt = ledger.compose(Buffer.from(role.profile.input.initialPrompt), rootParents), metadata = ledger.metadata(receipt);
    if (canonical(metadata.classes) !== canonical([...role.initialOrigin.classes].sort()) || metadata.digest !== role.declaration.inputPacketSha256) refuse();
    initialReceipts[role.role] = receipt; aliases.set(metadata.id, role.declaration.inputOriginId);
  }
  let active = true, timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => { timer = setTimeout(() => { active = false; reject(new Error('url-run-origins-unavailable')); }, limits.milliseconds); });
  const readTree = async () => {
    const check = (): void => { live(); if (!active) refuse(); };
    check();
    const openReader = bindUrlSourceReader({ clone: record.subject.clone.path, revision: pin, store: sourceStore,
      current: () => { check(); return true; }, callObjects: limits.treeEntries });
    const reader = openReader({ gitDir: path.join(record.subject.clone.path, '.git'), revision: pin });
    const listed = await reader.listTree(); check(); if (listed.length > limits.treeEntries) refuse(); return listed;
  };
  let tree;
  try { tree = await Promise.race([readTree(), deadline]); } finally { active = false; clearTimeout(timer); }
  live();
  const candidates = new Map<BaseClass, string>(); let eligibleRegularPaths = 0;
  for (const entry of tree) {
    if (!['100644', '100755'].includes(entry.mode) || !relative(entry.path) || screen.screenBody(entry.path) !== undefined || screen.screenPath(entry.path) !== undefined) continue;
    const contentClass = screen.contentClass(entry.path);
    if (!BASE_CLASSES.includes(contentClass as BaseClass)) continue;
    eligibleRegularPaths++; if (!candidates.has(contentClass as BaseClass)) candidates.set(contentClass as BaseClass, entry.path);
  }
  const representatives = {} as Partial<Record<BaseClass, UrlOriginReceipt>>;
  for (const contentClass of BASE_CLASSES) {
    const file = candidates.get(contentClass); if (file === undefined) continue;
    // Only one whole-body verification per discovered base class. Failed/oversized/corrupt input
    // refuses the helper; it cannot manufacture a class declaration or record a false absence.
    const receipt = await ledger.sourceSpan({ path: file, offset: 0, limit: 2000 }); live();
    if (canonical(ledger.metadata(receipt).classes) !== canonical([contentClass, 'code-structure'].sort())) refuse();
    representatives[contentClass] = receipt;
  }
  const sourceReport = copy({ format: 'polaris-url-source-representatives/1', label: 'Inferred', scope: 'representatives only; not a complete body census',
    treeEntries: tree.length, eligibleRegularPaths, representedClasses: BASE_CLASSES.filter(value => representatives[value] !== undefined),
    noCandidatePathClasses: BASE_CLASSES.filter(value => !candidates.has(value)), bodyVerification: 'one whole verified body per represented class',
    unexaminedBodies: 'Unknown', sourceBodiesStoredHere: false });
  const sourceReportBytes = bytes(sourceReport), sourceReceipt = ledger.compose(sourceReportBytes, [roots.toolMetadata, ...Object.values(representatives)]);
  const rendererScaffold = given.renderer === undefined ? null : await ledger.planRendererScaffold(given.renderer);
  const plannedOrigins: readonly UrlPlannedOrigin[] = copy(ledger.plannedOrigins().map(entry => ({ ...entry, id: aliases.get(entry.id) ?? entry.id,
    originIds: entry.originIds.map(parent => aliases.get(parent) ?? parent) })));
  const ids = new Set<string>();
  for (const entry of plannedOrigins) { if (ids.has(entry.id) || entry.originIds.some(parent => !ids.has(parent))) refuse(); ids.add(entry.id); }
  live();
  return Object.freeze({ ledger, roots, initialReceipts: Object.freeze(initialReceipts), plannedOrigins,
    rendererScaffold,
    preparation: Object.freeze({ report: preparation, bytes: preparationBytes, receipt: preparationReceipt }),
    source: Object.freeze({ report: sourceReport, bytes: sourceReportBytes, receipt: sourceReceipt, representatives: Object.freeze(representatives) }),
    schemaDocuments: Object.freeze(schemaDocuments) });
}
