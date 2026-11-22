import type { UrlVerifiedRecoveryProducts } from './url-recovery-products.js';
import { URL_ARTIFACT_LIMITS, launchFiles, selectors, knownRecord, FROZEN_DRAFT_PATH, AUTHOR_FEEDBACK, PACKET_PATH,
  productPopulation, type UrlProductSelector, type UrlFrozenProductHistory, type FrozenProductIdentity } from './url-frozen-product-history.js';
export { URL_ARTIFACT_LIMITS, verifyUrlFrozenProductHistory } from './url-frozen-product-history.js';
export type { UrlProductSelector, UrlFrozenProductHistory } from './url-frozen-product-history.js';
import * as fs from 'node:fs';
import { urlStructureRecordShape, urlReadingLedgerShape, urlReadingDifferenceShape, urlManifestFactsShape } from './url-check-product-shape.js';
import type { ManifestFacts } from './manifest-facts.js';
import type { FigureFit } from './figure-fit.js';
import { figureFitClass } from './reader-advice.js';
import { SERVER_ENTRY } from './derive-rules.js';
import path from 'node:path';
import { setImmediate as yieldToPoll } from 'node:timers/promises';
import { encodeCanonicalJson, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { deepFreeze, isRecord, sha256 } from '@syzygy/support';
import type { BrokerResponse } from './broker.js';
import type { SessionAdmission, SessionContentClass } from './session-egress-policy.js';
import { isDesignRoundPrepared } from './session-control.js';
import type { SessionDesignArtifactRead, SessionToolsReceipt, SessionToolOrigins } from './session-tools.js';
import type { UrlOriginReceipt } from './url-origin-ledger.js';
import type { UrlRolePlan } from './url-role-plan.js';
import type { OrderedDesignTerminalEvidence } from './url-ordered-design-audit.js';
import { assertUrlOrderedDesignVerdictTerminal, orderedUrlDesignReviewParents, assertUrlDesignDeliveryViewCurrent, assertUrlDesignReviewProofCurrent, inspectCommittedUrlLaunchHistory,
  isIssuedUrlDesignDeliveryView, type UrlCommittedLaunchHistory,
  type UrlCheckedDesignVerdict, type UrlDesignDeliveryView, type UrlDesignReviewProof } from './url-session-audit.js';
import type { UrlRunDossier } from './url-run-sessions.js';
import { URL_HELPER_LAUNCH_FILES } from './url-launch-history.js';
import { URL_DESIGN_VIEW_ARTIFACT } from './url-design-view.js';
import type { createUrlRunOrigins } from './url-run-origins.js';
import type { RecordedRunConfig } from './run-record.js';
import type { effectiveUrlProjection } from './effective-run-record.js';
import { urlDossierReportExit } from './url-dossier-result.js';
import { isNativeSessionProfile } from './session-profile.js';
import { encodeRunRecord, readRunRecord } from './run-record.js';
import { readEffectiveRunDeclaration, type UrlRunDeclaration } from './url-run-record.js';
import type { ProtectedUrlRunContext } from './effective-run-record.js';
import { assertProductFileUnchanged, snapshotProductFile, snapshotProductNames, sameProductFile, sameProductPath, type ProductFileSnapshot, type ProductNameSnapshot } from './url-product-reads.js';

type Role = 'author' | 'inventory' | 'fidelity' | 'design';
interface InitialProductIdentities {
  readonly brief: { readonly command: string; readonly outcome: string; readonly run: string; readonly pinnedRevision: string;
    readonly brief: string; readonly draftSchema: string; readonly issuedAt: string; readonly executionRule: { readonly arm: string } };
  readonly sessions: { readonly command: string; readonly outcome: string; readonly role: string; readonly run: string;
    readonly sessions: readonly { readonly role: string; readonly kind?: string; readonly session: number; readonly directory: string;
      readonly prompt: string; readonly promptSha256: string }[] };
}

type Origins = Pick<Awaited<ReturnType<typeof createUrlRunOrigins>>, 'ledger' | 'roots' | 'initialReceipts' | 'schemaDocuments'>;
const ROLES: readonly Role[] = ['author', 'inventory', 'fidelity', 'design'];
const JSON_LIMITS = { maxBytes: 2_097_152, maxNodes: 65_536, maxDepth: 32 } as const;
type Limits = { readonly [K in keyof typeof URL_ARTIFACT_LIMITS]: number };
export interface UrlRunArtifactsOptions {
  readonly run: string; readonly record: RecordedRunConfig; readonly origins: Origins; readonly roles: readonly Pick<UrlRolePlan, 'role' | 'profile'>[];
  readonly current: () => boolean;
  /** Actual host-only runner, invoked after the controller authenticates the provider tool call.
   * Neither this factory nor its methods may be exposed as a role API. */
  readonly runDossier: (role: Role) => UrlRunDossier;
  /** Exact installed DOSSIER_USAGE bytes supplied by the root, never by a run file or role. */
  readonly helpText: string;
  readonly statusProjection?: ReturnType<typeof effectiveUrlProjection>;
  /** Exact bytes retained from the actual initialized core producer. If omitted,
   * only encodeRunRecord's exact standard serialization of the retained record is supported. */
  readonly initializedCoreBytes?: Uint8Array;
  /** Retained actual initialized declaration and protected host binding. A status
   * projection or a newly read self-consistent sidecar is insufficient. */
  readonly effectiveDeclaration?: { readonly declaration: UrlRunDeclaration; readonly bytes: Uint8Array;
    readonly context: ProtectedUrlRunContext & { readonly expectedSidecarSha256: string } };
  readonly limits?: Partial<Limits>;
}
export type UrlProductReadOperation = 'render' | 'review-packet' | 'review-check' | 'inventory-check' | 'author-check';
/** No object shape authenticates this token; each bridge owns its WeakMap. */
export interface UrlProductReadContext { readonly kind: 'url-product-read-context'; }
export interface UrlAuthenticatedProductRead {
  readonly kind: 'present' | 'absent'; readonly bytes: Uint8Array | null; readonly receipt: UrlOriginReceipt;
}
export interface UrlCommittedStageCheck {
  readonly revision: number;
  readonly record: Readonly<Record<string, unknown>>;
  readonly verdict: Readonly<Record<string, unknown>> | null;
}
export interface UrlProducedArtifact {
  readonly role: Role; readonly path: string; readonly sha256: string; readonly bytes: number;
  readonly originId: string; readonly classes: readonly SessionContentClass[];
}
export interface UrlRestoredFrozenProducts {
  readonly artifacts: readonly UrlProducedArtifact[];
  readonly initial: { readonly briefIssuedAt: string; readonly deadline: number;
    readonly helperPromptDigests: Readonly<Record<Exclude<Role, 'author'>, string>> };
}
export interface UrlOrderedDesignVerdictStage { readonly checked: UrlCheckedDesignVerdict; readonly sha256: string; }

interface Report {
  readonly role: Role; readonly digest: string; readonly projection: string; readonly receipt: UrlOriginReceipt;
  readonly packet: string | null; readonly token: string; committed: boolean;
}
interface Product {
  readonly path: string; readonly digest: string; readonly receipt: UrlOriginReceipt; committed: boolean;
}
interface Check extends Product {
  readonly revision: number; readonly token: string;
}
interface Pending {
  readonly argv: string; readonly receipt: UrlOriginReceipt; readonly payload?: Report;
  readonly checks: readonly Check[]; readonly products: readonly Product[]; readonly digest: string;
  readonly designVerdict?: UrlCheckedDesignVerdict;
}
const canonical = (value: unknown): string => encodeCanonicalJson(value, JSON_LIMITS);
const copy = <T>(value: T): T => deepFreeze(parseBoundedJson(canonical(value), JSON_LIMITS)) as T;
const asBytes = (value: unknown): Uint8Array => Buffer.from(canonical(value));
function refuse(): never { throw new Error('url-run-artifacts-unavailable'); }
const hex = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/u.test(v);
const text = (v: unknown): v is string => typeof v === 'string' && Buffer.byteLength(v) <= URL_ARTIFACT_LIMITS.itemBytes;
const integer = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && v <= 999_999;
const list = (v: unknown): v is unknown[] => Array.isArray(v) && v.length <= 4096;
const strings = (v: unknown): v is string[] => list(v) && v.every(text);
const relative = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && Buffer.byteLength(v) <= 4096
  && !/[\\\u0000-\u0020\u007f]/u.test(v) && !v.startsWith('/') && v.split('/').every(p => p !== '' && p !== '.' && p !== '..');
function keys(v: unknown, required: readonly string[], optional: readonly string[] = []): v is Record<string, unknown> {
  return isRecord(v) && required.every(k => Object.hasOwn(v, k)) && Object.keys(v).every(k => required.includes(k) || optional.includes(k));
}
const record = (v: unknown): Record<string, unknown> => { if (!isRecord(v)) refuse(); return v; };
const sameStat = (a: fs.Stats, b: fs.Stats): boolean => a.dev === b.dev && a.ino === b.ino && a.mode === b.mode && a.nlink === b.nlink
  && a.size === b.size && a.mtimeMs === b.mtimeMs && a.ctimeMs === b.ctimeMs;

type FidelityPacketRegistration = { readonly kind: 'fidelity'; readonly round: number; readonly packetSha256: string };

/** Trusted producer bridge. It reads fixed products and keeps opaque receipts plus metadata in
 * working memory; it writes nothing. A self-consistent stored hash is never producer authentication.
 * registerInitial/registerPacket must be called immediately after the actual trusted
 * producer succeeds. Same-UID replacement across that producer/read boundary remains Unknown. */
export function createUrlRunArtifacts(given: UrlRunArtifactsOptions) {
  try { return create(given); } catch { return refuse(); }
}
function create(given: UrlRunArtifactsOptions) {
  if (!keys(given, ['run', 'record', 'origins', 'roles', 'current', 'runDossier', 'helpText'], ['limits', 'statusProjection', 'effectiveDeclaration', 'initializedCoreBytes'])
    || !path.isAbsolute(given.run) || path.resolve(given.run) !== given.run || typeof given.current !== 'function'
    || typeof given.runDossier !== 'function' || !text(given.helpText) || !given.helpText.startsWith('syzygy dossier')
    || (given.limits !== undefined && !isRecord(given.limits))) refuse();
  const limits: Limits = Object.freeze({ ...URL_ARTIFACT_LIMITS, ...given.limits });
  if (Object.keys(limits).length !== Object.keys(URL_ARTIFACT_LIMITS).length || Object.entries(limits).some(([k, n]) => !Object.hasOwn(URL_ARTIFACT_LIMITS, k)
    || !Number.isSafeInteger(n) || n < 1 || n > URL_ARTIFACT_LIMITS[k as keyof Limits])) refuse();
  const run = given.run, runId = path.basename(run), config = copy(given.record), pin = config.subject.pinnedRevision.commit;
  const current = given.current, actualRunner = given.runDossier, helpText = given.helpText;
  const statusProjection = given.statusProjection === undefined ? undefined : copy(given.statusProjection);
  if (given.initializedCoreBytes !== undefined && !(given.initializedCoreBytes instanceof Uint8Array)) refuse();
  const coreBytes = given.initializedCoreBytes === undefined ? Buffer.from(encodeRunRecord(given.record.declared, given.record.subject)) : Buffer.from(given.initializedCoreBytes);
  if (coreBytes.length > limits.itemBytes) refuse();
  const coreRead = readRunRecord(new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(coreBytes));
  if (!coreRead.ok || canonical(coreRead.record) !== canonical(config)) refuse();
  let sidecarBytes: Uint8Array | null = null;
  let retainedDeclaration: UrlRunDeclaration | null = null;
  if (given.effectiveDeclaration !== undefined) {
    const supplied = given.effectiveDeclaration;
    if (!keys(supplied, ['declaration', 'bytes', 'context'])
      || !keys(supplied.context, ['runId', 'expectedBasePolicy', 'expectedOriginPolicy', 'expectedSourceTransport', 'expectedProfileSha256', 'expectedSidecarSha256'])
      || !(supplied.bytes instanceof Uint8Array) || supplied.bytes.length > limits.itemBytes
      || supplied.context.runId !== runId || supplied.context.expectedSidecarSha256 !== sha256(supplied.bytes)
      || canonical(supplied.context.expectedBasePolicy) !== canonical(config.subject.screeningPolicy)) refuse();
    const checked = readEffectiveRunDeclaration(coreBytes, supplied.bytes, supplied.context);
    if (!checked.ok || checked.effective.kind !== 'url' || canonical(checked.effective.declaration) !== canonical(supplied.declaration)
      || canonical(checked.core) !== canonical(config)) refuse();
    sidecarBytes = Uint8Array.from(supplied.bytes);
    retainedDeclaration = copy(checked.effective.declaration);
  }
  let recoveryFailed = false;
  const origins = given.origins, ledger = origins.ledger, live = (): void => { if (recoveryFailed || current() !== true) refuse(); };
  const schemaDocuments = Object.fromEntries(Object.entries(origins.schemaDocuments).map(([key, value]) => [key, Uint8Array.from(value)])) as Origins['schemaDocuments'];
  live();
  if (!Array.isArray(given.roles) || given.roles.length !== 4 || given.roles.some((p, i) => p.role !== ROLES[i] || !isNativeSessionProfile(p.profile) || p.profile.input.binding.run !== runId)) refuse();
  const rolePlans: readonly Pick<UrlRolePlan, 'role' | 'profile'>[] = given.roles;
  if (retainedDeclaration !== null && retainedDeclaration.roles.some((role, i) => role.role !== rolePlans[i]!.role
    || role.sessionId !== rolePlans[i]!.profile.input.sessionId || role.compiledProfileSha256 !== rolePlans[i]!.profile.digest
    || role.inputPacketSha256 !== sha256(rolePlans[i]!.profile.input.initialPrompt) || role.instructionSha256 !== sha256(rolePlans[i]!.profile.input.systemPrompt))) refuse();
  for (const plan of rolePlans) ledger.origins(origins.initialReceipts[plan.role], Buffer.from(plan.profile.input.initialPrompt));
  const plans = new Map(rolePlans.map(p => [p.role, p])), rootParents = [origins.roots.rolePolicy, origins.roots.runControl, origins.roots.toolMetadata];
  for (const [i, receipt] of rootParents.entries()) if (canonical(ledger.metadata(receipt).classes) !== canonical([["governance-text"], ["work-history"], ["code-structure"]][i])) refuse();
  const directories = new Map<Role, string>([['author', run], ['inventory', `${run}.sessions/session-1`], ['fidelity', `${run}.sessions/fidelity-1`], ['design', `${run}.sessions/design-1`]]);
  const history = new Map<Role, UrlOriginReceipt[]>(ROLES.map(role => [role, [origins.initialReceipts[role]]]));
  const reports = new Map<string, Report>(), checks = new Map<number, Check>(), pending = new Map<Role, Pending>();
  const checkedProducts = new Map<string, Product>();
  const authenticatedRecords = new Map<string, { readonly snapshot: ProductFileSnapshot; readonly receipt: UrlOriginReceipt; readonly committed: (check?: () => void) => boolean }>();
  const packetReceipts = new Map<string, UrlOriginReceipt>();
  const seen = new Map<Role, Set<string>>(ROLES.map(role => [role, new Set()]));
  const uncommitted = new Map<string, { role: Role; reports: Report[]; checks: Check[]; products: Product[];
    designRead?: UrlOriginReceipt; designVerdict?: UrlCheckedDesignVerdict; draftWriteSha256?: string }>();
  const designReads = new Map<string, UrlOriginReceipt>();
  const orderedPendingFiles = new Map<string, NonNullable<ReturnType<typeof authenticatedRecords.get>>>();
  const orderedStages = new WeakMap<UrlOrderedDesignVerdictStage, { captured: Pending; proof: UrlDesignReviewProof; consumed: boolean }>();
  const products: UrlProducedArtifact[] = [], productKeys = new Set<string>();
  const questions = new Map<string, readonly UrlOriginReceipt[]>();
  const adapters = new Map(ROLES.map(role => { let admission: SessionAdmission | null = null;
    return [role, { set: (next: SessionAdmission) => { admission = next; }, adapter: ledger.hostAdapter({ binding: plans.get(role)!.profile.input.binding, admittedRequest: () => admission }) }] as const; }));
  let readBytes = 0, registrations = 0, initial = false;
  let producersInFlight = 0, lastCommittedDraft: string | null = null;
  async function duringProducer<T>(work: () => Promise<T>): Promise<T> {
    producersInFlight++;
    try { return await work(); } finally { producersInFlight--; }
  }
  let activeDesign: { file: string; bytes: Uint8Array; origins: SessionToolOrigins; parents: readonly UrlOriginReceipt[]; current: () => void } | undefined;
  const roleOf = (role: Role): void => { live(); if (!ROLES.includes(role)) refuse(); };
  const roleParents = (role: Role) => {
    const receipts = [...new Set([...rootParents, ...history.get(role)!])];
    if (receipts.length > limits.parents) refuse();
    return { receipts, metadata: ledger.inspectMetadata(receipts.map(receipt => ({ receipt }))) };
  };
  const remember = (role: Role, receipt: UrlOriginReceipt): void => { ledger.metadata(receipt); const old = history.get(role)!;
    if (!old.includes(receipt)) { if (old.length >= limits.parents - rootParents.length) refuse(); old.push(receipt); } };
  const compose = (bytes: Uint8Array, inputs: readonly UrlOriginReceipt[]): UrlOriginReceipt => {
    live(); if (++registrations > limits.registrations || bytes.length > limits.itemBytes || inputs.length > limits.parents) refuse();
    return ledger.compose(bytes, [...new Set(inputs)]);
  };
  function openDesignArtifact(file: string, delivery: UrlDesignDeliveryView): SessionDesignArtifactRead {
    live();
    if (!isIssuedUrlDesignDeliveryView(delivery)) refuse();
    const identity = delivery.receipt.identity;
    if (!initial || activeDesign || retainedDeclaration === null || file !== `round-${identity.round}/design-view.json`
      || identity.sessionId !== plans.get('design')!.profile.input.sessionId
      || identity.basePolicySha256 !== config.subject.screeningPolicy.sha256
      || identity.originPolicySha256 !== retainedDeclaration.originPolicy.sha256
      || identity.registryProfileSha256 !== retainedDeclaration.inference.profile.sha256
      || delivery.view.byteLength > limits.itemBytes) refuse();
    const parents = ledger.inspectMetadata(delivery.parents.map(receipt => ({ receipt })));
    if (parents.length !== identity.parentCount || sha256(canonical(parents)) !== identity.parentsSha256) refuse();
    // Opening an audited view issues no general artifact receipt. The broker
    // screens the view and we issue provenance only for its exact reply.
    const bytes = Uint8Array.from(delivery.view);
    const issuedOrigins: SessionToolOrigins = { digest: identity.view.sha256, ...ledger.compositionOrigins(delivery.parents) };
    if (issuedOrigins.classes.some(kind => !retainedDeclaration!.plannedClasses.includes(kind))) refuse();
    const current = (): void => {
      if (activeDesign !== entry) refuse();
      live();
      assertUrlDesignDeliveryViewCurrent(delivery);
    };
    const entry = { file, bytes, parents: delivery.parents, origins: issuedOrigins, current };
    const close = (): void => { if (activeDesign === entry) activeDesign = undefined; };
    activeDesign = entry;
    try {
      // The entire opening is synchronous. Check the live inputs after
      // preparing the exact view and before returning its capability.
      current();
      return Object.freeze({ bytes: Uint8Array.from(bytes), origins: issuedOrigins, revalidate: current, close });
    } catch (error) { close(); throw error; }
  }
  /** Bracket synchronous snapshots with live checks and one descriptor deadline. */
  function snapshotWithAuthority<T>(read: (check: () => void) => T): T {
    const deadline = performance.now() + 5000;
    const check = (): void => { if (performance.now() >= deadline) refuse(); };
    live();
    const result = read(check);
    live();
    check();
    return result;
  }
  function snapshotRecord(root: string, file: string, maximum: number): ProductFileSnapshot {
    return snapshotWithAuthority(check => snapshotProductFile(root, file, maximum, check));
  }
  /** Prepare the authenticated record before publishing any registry entries. */
  function prepareRecord(file: string, bytes: Uint8Array, receipt: UrlOriginReceipt, committed: (check?: () => void) => boolean,
    snapshot = snapshotRecord(run, file, limits.itemBytes)) {
    live(); ledger.origins(receipt, bytes);
    if (snapshot.bytes === null || !Buffer.from(snapshot.bytes).equals(Buffer.from(bytes))) refuse();
    const old = authenticatedRecords.get(file);
    if (old && (!sameProductFile(old.snapshot, snapshot) || ledger.metadata(old.receipt).digest !== ledger.metadata(receipt).digest)) refuse();
    if (!old && authenticatedRecords.size >= limits.registrations) refuse();
    return { snapshot, receipt, committed };
  }
  function retainRecord(file: string, bytes: Uint8Array, receipt: UrlOriginReceipt, committed: (check?: () => void) => boolean,
    snapshot?: ProductFileSnapshot): void {
    authenticatedRecords.set(file, prepareRecord(file, bytes, receipt, committed, snapshot));
  }
  function prepareCheckRecords(product: Product, checkedBytes: Uint8Array, reportFile: string, reportBytes: Uint8Array, report: Report) {
    const files = [product.path, reportFile];
    if (authenticatedRecords.size + files.filter(file => !authenticatedRecords.has(file)).length > limits.registrations) refuse();
    const committed = (): boolean => product.committed && report.committed;
    return [
      [product.path, prepareRecord(product.path, checkedBytes, product.receipt, committed)],
      [reportFile, prepareRecord(reportFile, reportBytes, report.receipt, committed)],
    ] as const;
  }
  function read(root: string, file: string): Uint8Array {
    live(); if (!relative(file) || fs.realpathSync(root) !== root) refuse();
    const opened: { fd: number; name: string; stat: fs.Stats }[] = [];
    try {
      let fd = fs.openSync(root, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
      opened.push({ fd, name: root, stat: fs.fstatSync(fd) });
      const parts = file.split('/');
      for (const part of parts.slice(0, -1)) {
        const name = `/proc/self/fd/${fd}/${part}`;
        fd = fs.openSync(name, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
        opened.push({ fd, name, stat: fs.fstatSync(fd) });
      }
      const name = `/proc/self/fd/${fd}/${parts.at(-1)!}`;
      fd = fs.openSync(name, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
      const stat = fs.fstatSync(fd); opened.push({ fd, name, stat });
      if (!stat.isFile() || stat.nlink !== 1 || stat.size < 1 || stat.size > limits.itemBytes || readBytes + stat.size > limits.readBytes) refuse();
      const bytes = Buffer.alloc(stat.size); let offset = 0;
      while (offset < bytes.length) { const n = fs.readSync(fd, bytes, offset, bytes.length - offset, offset); if (!n) refuse(); offset += n; }
      if (fs.readSync(fd, Buffer.alloc(1), 0, 1, offset) !== 0) refuse();
      for (const item of opened) if (!sameStat(item.stat, fs.fstatSync(item.fd)) || !sameStat(item.stat, fs.lstatSync(item.name))) refuse();
      readBytes += bytes.length; live(); return bytes;
    } finally { for (const item of opened.reverse()) fs.closeSync(item.fd); }
  }
  const decode = (bytes: Uint8Array): string => { try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { return refuse(); } };
  const json = (bytes: Uint8Array): Record<string, unknown> => record(parseBoundedJson(decode(bytes), JSON_LIMITS));
  type ArtifactBinding = Parameters<typeof ledger.bindArtifact>[0];
  function bindAll(bindings: readonly ArtifactBinding[]): void {
    const staged = new Map<string, UrlProducedArtifact>();
    for (const item of bindings) {
      const { role, path: file, bytes, receipt } = item;
      const metadata = ledger.metadata(receipt), key = `${role}:${file}:${metadata.digest}`;
      if (!productKeys.has(key)) staged.set(key, copy({ role, path: file, sha256: metadata.digest, bytes: bytes.length,
        originId: metadata.id, classes: metadata.classes }));
    }
    if (products.length + staged.size > limits.registrations) refuse();
    ledger.bindArtifacts(bindings);
    for (const [key, item] of staged) { productKeys.add(key); products.push(item); }
  }
  function bind(role: Role, file: string, bytes: Uint8Array, receipt: UrlOriginReceipt): void {
    bindAll([{ role, path: file, bytes, receipt }]);
  }
  function reportPayload(role: Role, bytes: Uint8Array, inputParents: readonly UrlOriginReceipt[], token: string): Report {
    const value = json(bytes), kind = role === 'author' ? 'draft' : role === 'inventory' ? 'inventory' : `${role}-verdict` as const;
    const receipt = ledger.report({ role, kind, bytes, parents: inputParents });
    const projection = { ...value }; if (role === 'author') delete projection['discovery'];
    const result: Report = { role, digest: sha256(bytes), projection: sha256(canonical(projection)), receipt,
      packet: typeof value['packetSha256'] === 'string' ? value['packetSha256'] : null, token, committed: false };
    const old = reports.get(`${role}:${result.digest}`); if (old) return old;
    if (reports.size >= limits.registrations) refuse(); reports.set(`${role}:${result.digest}`, result); return result;
  }
  function admissionParents(role: Role, admission: SessionAdmission): readonly UrlOriginReceipt[] {
    if (!keys(admission, ['digest', 'bytes', 'classes', 'originIds']) || !hex(admission.digest) || !Number.isSafeInteger(admission.bytes)
      || admission.bytes < 1 || admission.bytes > JSON_LIMITS.maxBytes || !strings(admission.originIds) || admission.originIds.length < 1
      || admission.originIds.length > 128 || !strings(admission.classes) || admission.classes.length < 1 || new Set(admission.classes).size !== admission.classes.length) refuse();
    const { receipts, metadata } = roleParents(role), actual = new Set(metadata.flatMap(item => item.classes));
    // Root provides ONLY the actual reserveRequest admission. Scaffolding/provider/reminder IDs
    // are controller-issued metadata, not forgeable ledger capabilities; no payload tag is authority.
    if (admission.classes.some(c => !actual.has(c))) refuse(); return receipts;
  }
  function initialProducts(input: InitialProductIdentities): readonly UrlProducedArtifact[] {
    live(); if (initial || !keys(input, ['brief', 'sessions'])) refuse();
    const { brief, sessions } = input;
    if (brief.command !== 'brief' || brief.outcome !== 'issued' || brief.run !== run || brief.pinnedRevision !== pin || brief.executionRule.arm !== 'sec-3'
      || brief.brief !== path.join(run, 'brief.md') || brief.draftSchema !== path.join(run, 'draft.schema.json')
      || sessions.command !== 'session-prompt' || sessions.outcome !== 'issued' || sessions.role !== 'all' || sessions.run !== run
      || !Array.isArray(sessions.sessions) || sessions.sessions.length !== 3) refuse();
    const briefBytes = read(run, 'brief.md'), schemaBytes = read(run, 'draft.schema.json'), recordBytes = read(run, 'brief.json'), issued = json(recordBytes);
    const files = record(issued['files']), briefFile = record(files['brief']), schemaFile = record(files['draftSchema']);
    if (!keys(issued, ['format', 'role', 'runId', 'pinnedRevision', 'issuedAt', 'files'], ['briefVersion', 'sourceBindingSha256', 'schemaVersion', 'guidanceVersion',
      'readerStandards', 'shapePacks', 'deadline', 'executionRule', 'agent', 'effectiveRun', 'urlDeclarationSha256', 'copy', 'stageStatement', 'label'])
      || (issued['shapePacks'] !== undefined && !shape({
        traits: value => shape({ state: lit('unknown'), why: text })(value) || shape({ state: lit('derived'),
          serverEntry: shape({ rule: lit(SERVER_ENTRY.id), ruleVersion: lit(SERVER_ENTRY.version), holds: boolean,
            paths: value => strings(value) && (value as string[]).length <= 20, pathsNotListed: integer }) })(value),
        selected: array(shape({ id: text, version: integer, sha256: hex, because: text })),
      })(issued['shapePacks']))
      || !keys(files, ['brief', 'draftSchema']) || !keys(briefFile, ['name', 'sha256']) || !keys(schemaFile, ['name', 'sha256'])
      || issued['format'] !== 'polaris-dossier-brief/1' || issued['role'] !== 'authoring' || issued['runId'] !== runId || issued['pinnedRevision'] !== pin
      || issued['issuedAt'] !== brief.issuedAt || briefFile['name'] !== 'brief.md' || briefFile['sha256'] !== sha256(briefBytes)
      || schemaFile['name'] !== 'draft.schema.json' || schemaFile['sha256'] !== sha256(schemaBytes)
      || canonical(json(schemaBytes)) !== canonical(json(schemaDocuments.draft))) refuse();
    const bindings: ArtifactBinding[] = [];
    const records = new Map<string, ReturnType<typeof prepareRecord>>();
    for (const [file, bytes] of [['brief.md', briefBytes], ['draft.schema.json', schemaBytes], ['brief.json', recordBytes]] as const) {
      const receipt = compose(bytes, rootParents);
      bindings.push({ role: 'author', path: file, bytes, receipt });
      records.set(file, prepareRecord(file, bytes, receipt, () => initial));
    }
    for (const [role, reportRole, kind, file] of [
      ['inventory', 'inventory', undefined, 'inventory/session-1.json'],
      ['fidelity', 'review', 'fidelity', 'reviews/fidelity-session-1.json'],
      ['design', 'review', 'design', 'reviews/design-session-1.json'],
    ] as const) {
      const result = sessions.sessions.find(session => session.role === reportRole && session.kind === kind);
      if (!result || result.session !== 1 || result.directory !== directories.get(role) || !text(result.prompt) || result.promptSha256 !== sha256(result.prompt)) refuse();
      const promptBytes = read(run, file), prompt = json(promptBytes);
      if (!keys(prompt, ['format', 'role', 'runId', 'pinnedRevision', 'session', 'directory', 'prompt', 'promptSha256'], ['kind', 'mode', 'issuedAt', 'brief', 'executionRule',
        'stageStatement', 'packet', 'commands', 'context', 'label']) || prompt['format'] !== 'polaris-dossier-session-prompt/2' || prompt['runId'] !== runId || prompt['pinnedRevision'] !== pin || prompt['session'] !== 1
        || prompt['prompt'] !== result.prompt || prompt['promptSha256'] !== result.promptSha256 || prompt['directory'] !== path.relative(path.dirname(run), result.directory)
        || prompt['role'] !== reportRole || prompt['kind'] !== kind) refuse();
      if (role === 'inventory') {
        const bytes = read(result.directory, 'inventory-brief.md'), named = record(prompt['brief']);
        if (named['name'] !== 'inventory-brief.md' || named['sha256'] !== sha256(bytes)) refuse();
        bindings.push({ role, path: 'inventory-brief.md', bytes, receipt: compose(bytes, rootParents) });
      }
      records.set(file, prepareRecord(file, promptBytes, compose(promptBytes, rootParents), () => initial));
    }
    if (authenticatedRecords.size + records.size > limits.registrations) refuse();
    bindAll(bindings);
    for (const [file, prepared] of records) authenticatedRecords.set(file, prepared);
    initial = true;
    return copy(products);
  }
  async function registerLaunchHistory(committed: UrlCommittedLaunchHistory, waitForSamples?: () => Promise<boolean>): Promise<void> {
    live();
    const { history, scope, project, eventSha256 } = inspectCommittedUrlLaunchHistory(committed);
    const { role, file, bytes } = history, prompt = authenticatedRecords.get(history.promptFile);
    const declaredRole = retainedDeclaration?.roles.find(item => item.role === role);
    const promptStat = prompt?.snapshot.stat;
    if (!initial || !retainedDeclaration || !declaredRole || history.run !== run || history.runId !== runId
      || history.pin !== pin || history.coreSha256 !== sha256(coreBytes)
      || project !== retainedDeclaration.observingProject || scope.originPolicySha256 !== retainedDeclaration.originPolicy.sha256
      || plans.get(role)?.profile !== history.plan.profile || canonical(declaredRole) !== canonical(history.plan.declaration)
      || file !== URL_HELPER_LAUNCH_FILES[role] || authenticatedRecords.has(file)
      || !prompt?.committed() || !promptStat || !Number.isSafeInteger(promptStat.dev) || !Number.isSafeInteger(promptStat.ino)
      || BigInt(promptStat.dev) !== history.promptIdentity.device || BigInt(promptStat.ino) !== history.promptIdentity.inode
      || !prompt.snapshot.bytes || sha256(prompt.snapshot.bytes) !== history.promptRecordSha256
      || json(prompt.snapshot.bytes)['promptSha256'] !== history.promptSha256) refuse();
    const promptCurrent = (check?: () => void): boolean => {
      // Product batches already bracket this synchronous walk with live
      // authority checks. Use the enclosing lease during the nested read.
      const snapshot = check === undefined ? snapshotRecord(run, history.promptFile, limits.itemBytes)
        : snapshotProductFile(run, history.promptFile, limits.itemBytes, check);
      return sameProductFile(prompt.snapshot, snapshot);
    };
    const stillCommitted = (check?: () => void): boolean => {
      try {
        check?.();
        return inspectCommittedUrlLaunchHistory(committed).eventSha256 === eventSha256
          && prompt.committed(check) && promptCurrent(check);
      } catch { return false; }
    };
    // The initial inspection has already checked the exact durable audit
    // and issued files. Match the bridge's prompt snapshot before staging.
    if (!promptCurrent()) refuse();
    const audit = compose(asBytes({ format: 'url-session-audit-launch-history-binding/1',
      runId, role, file, recordSha256: history.sha256, eventSha256 }), [origins.roots.runControl]);
    // The private audit receipt has no product binding. Recheck the live
    // prompt, history and durable audit before publishing the product.
    await yieldToPoll();
    if (waitForSamples !== undefined && !(await waitForSamples())) refuse();
    const { receipt, snapshot } = snapshotWithAuthority(check => {
      if (authenticatedRecords.has(file) || !stillCommitted(check)) refuse();
      const receipt = compose(bytes, [...rootParents, prompt.receipt, origins.initialReceipts[role], audit]);
      const snapshot = snapshotProductFile(run, file, limits.itemBytes, check);
      return { receipt, snapshot };
    });
    retainRecord(file, bytes, receipt, stillCommitted, snapshot);
  }
  type Predicate = (v: unknown) => boolean;
  const lit = (...values: readonly unknown[]): Predicate => v => values.includes(v);
  const nullable = (test: Predicate): Predicate => v => v === null || test(v);
  const array = (test: Predicate): Predicate => v => list(v) && v.every(test);
  const shape = (required: Record<string, Predicate>, optional: Record<string, Predicate> = {}): Predicate => v => keys(v, Object.keys(required), Object.keys(optional))
    && Object.entries(required).every(([k, test]) => test(v[k])) && Object.entries(optional).every(([k, test]) => !Object.hasOwn(v, k) || test(v[k]));
  const boolean: Predicate = v => typeof v === 'boolean';
  const policy = shape({ policyId: text, policyVersion: text, sha256: hex });
  const finding = shape({ kind: text, at: text, detail: text }, { blockId: text, citationId: text });
  const range = (v: unknown): boolean => Array.isArray(v) && v.length === 2 && v.every(integer) && Number(v[1]) >= Number(v[0]);
  const redaction = shape({ redactionClass: lit('redacted-span'), withheldLines: integer, detectorIds: strings, withheldLineRanges: array(range) });
  const citedBlob = shape({ path: nullable(relative), objectId: nullable(text), read: boolean, outcome: text }, { redaction });
  const quotation = shape({ blockId: text, at: text, index: integer, citationId: text, path: relative, objectId: text, algorithm: text, byteRange: range });
  const excluded = shape({ blockId: text, at: text, index: integer, citationId: text, unknownReason: lit('excluded-content') });
  const credential = (v: unknown): boolean => shape({ required: lit(false), why: text })(v)
    || shape({ required: lit(true), passed: lit(true), checked: integer, source: text })(v)
    || shape({ required: lit(true), passed: lit(false), finding: shape({ kind: lit('adapter-credential-readable'), step: text, at: text, why: text, instruction: text }) })(v);
  const repairs = shape({ declared: integer, thisRevision: integer, label: lit('Inferred'), basis: text });
  const deadline = shape({ endsAt: text, label: lit('Inferred'), basis: text });
  const fileIdentity = shape({ file: relative, sha256: hex, bytes: integer });
  const census = (v: unknown): boolean => shape({ state: lit('unknown'), why: text, note: text })(v)
    || shape({ state: lit('listed'), policy, files: integer, secretDetectorPathMatches: integer, note: text,
      groups: array(shape({ outcome: text, count: integer, listed: strings, notListed: integer })) })(v);
  const advice = shape({ standards: text, note: text, advisories: array(shape({ standard: lit('RS-13', 'RS-14', 'RS-16', 'RS-17', 'RS-19'), at: text, detail: text })) });
  const pixels: Predicate = v => typeof v === 'number' && Number.isFinite(v) && v >= 0;
  const fitEntry = (v: unknown): boolean => shape({ diagram: text, unknown: text })(v)
    || shape({ diagram: text, viewportPx: pixels, laidOutPx: pixels, drawnPx: pixels, columnPx: pixels,
      textPx: pixels, minTextPx: pixels, failed: array(lit('width', 'text-size')) })(v);
  const figureFit = shape({ textPx: pixels, minTextPx: pixels, viewports: array(shape({ viewportPx: pixels, columnPx: pixels })),
    examined: integer, entries: array(fitEntry) });
  const reach = shape({ note: text, counts: shape({ unconfirmable: integer, withheldItems: integer, withheldElements: integer }),
    blocks: array(shape({ at: text, blockId: nullable(text), consequence: lit('withheld-item', 'unconfirmable'), detail: text })),
    elements: array(shape({ at: text, kind: lit('understanding-item', 'diagram-node', 'diagram-edge'), id: nullable(text), detail: text })) });
  const visibility = shape({ note: text, withheld: array(v => shape({ path: text, outcome: text })(v) || shape({ path: text, outcome: text, missingClass: text })(v)) });
  const execution = (v: unknown): boolean => shape({ applies: lit(false), why: text })(v) || shape({ applies: lit(true), clone: text, flagged: integer, label: lit('Inferred'), basis: text,
    commands: array(shape({ position: integer, id: nullable(text), scope: lit('within-scope', 'outside-scope', 'not-stated'),
      flags: array(shape({ kind: lit('no-working-directory', 'working-directory-outside-clone', 'stated-outside-scope'), detail: text, label: lit('Inferred') })) })) })(v);
  const commonCheck = { format: text, runId: lit(runId), revision: integer, supersedes: nullable(integer), pinnedRevision: lit(pin), checkedAt: text,
    outcome: lit('passed', 'findings'), findings: array(finding), quotations: array(quotation), excludedContent: array(excluded), citedBlobs: array(citedBlob),
    screeningPolicy: (v: unknown) => policy(v) && canonical(v) === canonical({ policyId: config.subject.screeningPolicy.policyId,
      policyVersion: config.subject.screeningPolicy.policyVersion, sha256: config.subject.screeningPolicy.sha256 }), credential, label: lit('Inferred') };
  const reportFields = { command: text, run: lit(run), checkFile: text, disclosures: strings };
  function checkShape(v: unknown, command: 'check' | 'inventory-check', report: boolean): boolean {
    const fields = { ...commonCheck, ...(command === 'check' ? { draft: fileIdentity,
      session: shape({ sessionId: nullable(text), declaredBy: lit('the authoring session'), label: lit('Inferred') }), executionFlags: execution,
      limits: shape({ repairCycles: repairs, questions: shape({ declared: integer, recorded: nullable(integer) }), deadline }) }
      : { inventory: fileIdentity, session: shape({ number: integer, sessionId: nullable(text), declaredBy: lit('the inventory session'), label: lit('Inferred'),
        distinctFrom: text }), limits: shape({ repairCycles: repairs, deadline }), counts: text, completeness: shape({ label: lit('Inferred'), basis: text }) }),
      ...(report ? reportFields : {}) };
    const optional = { ...(command === 'check' ? { figureFit, readingLedger: urlReadingLedgerShape, manifestFacts: urlManifestFactsShape } : {}),
      ...(report && command === 'check' ? { structureRecord: urlStructureRecordShape, readingDifference: urlReadingDifferenceShape,
        mechanismAdvice: shape({ file: nullable(lit('run-advice.json')), thisRevision: integer, inRun: integer }) } : {}),
      ...(report ? { screenCensus: census, readerAdvice: advice, reviewReach: reach, reviewVisibility: visibility } : {}) };
    return shape(fields, optional)(v)
      && record(v)['format'] === (command === 'check' ? 'polaris-dossier-check/1' : 'polaris-dossier-inventory-check/1')
      && (!report || record(v)['command'] === command);
  }
  function reviewShape(v: unknown, kind: 'fidelity' | 'design', report: boolean): boolean {
    return shape({ format: lit('polaris-dossier-review-check/1'), runId: lit(runId), kind: lit(kind), number: integer, checkedAt: text,
      outcome: lit('validated', 'refused'), verdict: shape({ file: relative, sha256: hex, bytes: integer, packetSha256Named: nullable(hex) }),
      packet: kind === 'fidelity' ? shape({ sha256: hex, draftRevision: integer, inventoryRevision: integer }) : shape({ sha256: hex, site: integer }),
      session: shape({ number: integer, sessionId: nullable(text), declaredBy: lit('the review session'), label: lit('Inferred'), distinctFrom: text }),
      problems: array(shape({ kind: text, at: text, detail: text })), readiness: shape({ declared: lit('ready', 'not-ready', null), blocking: nullable(boolean),
        basis: text, declaredBy: lit('the review session'), label: lit('Inferred') }), counts: text, label: lit('Inferred'),
      ...(report ? { ...reportFields, observed: shape({ packetSha256: hex, verdictNamesPacket: boolean, label: lit('Observed') }),
        inferred: shape({ basis: strings, label: lit('Inferred') }) } : {}) })(v) && (!report || record(v)['command'] === 'review-check');
  }
  async function sourceParents(rows: unknown, waitForCapture: () => Promise<void>): Promise<UrlOriginReceipt[]> {
    if (!list(rows)) refuse(); const result: UrlOriginReceipt[] = [];
    for (const row of rows) {
      if (!citedBlob(row)) refuse(); const blob = record(row);
      if (blob['outcome'] !== 'admitted' || blob['read'] !== true) continue;
      if (!relative(blob['path']) || typeof blob['objectId'] !== 'string' || blob['redaction'] !== undefined) refuse();
      await waitForCapture();
      const receipt = await ledger.sourceSpan({ path: blob['path'], offset: 0, limit: 2000, expectedObjectId: blob['objectId'] });
      live();
      if (result.length >= limits.parents - rootParents.length) refuse(); result.push(receipt);
    }
    return result;
  }
  async function captureCheck(document: Record<string, unknown>, inputParents: readonly UrlOriginReceipt[], token: string,
    waitForCapture: () => Promise<void>): Promise<Check> {
    if (!checkShape(document, 'check', true) || !integer(document['revision']) || document['checkFile'] !== path.join(run, `checks/rev-${document['revision']}.json`)) refuse();
    const stored = read(run, `checks/rev-${document['revision']}.json`), doc = json(stored);
    if (!checkShape(doc, 'check', false)) refuse();
    const base = { ...document }; for (const k of ['command', 'run', 'checkFile', 'disclosures', 'screenCensus', 'readerAdvice', 'reviewReach', 'reviewVisibility', 'structureRecord', 'readingDifference', 'mechanismAdvice']) delete base[k];
    const projected = { ...doc };
    if (document['mechanismAdvice'] !== undefined) {
      // The report alone drops mechanism advice; its receipt still binds the
      // complete frozen check. Count only the exact authenticated run census.
      const names = selectionNames(snapshotProductNames(run, 'checks', 4096, live), 'author-checks');
      const expected = [...checks.values()].map(prior => prior.path).concat(`checks/rev-${doc['revision']}.json`);
      if (names.length !== expected.length || expected.some(file => !names.includes(file))) refuse();
      const fit = doc['figureFit'] as FigureFit | undefined;
      const mechanismEntries = (value: Record<string, unknown>) => ((value['figureFit'] as FigureFit | undefined)?.entries ?? [])
        .filter(entry => figureFitClass(entry) === 'mechanism');
      const entries = mechanismEntries(doc);
      const uniqueCount = (value: Record<string, unknown>) => new Set(mechanismEntries(value).map(entry => canonical(entry))).size;
      let inRun = new Set(entries.map(entry => canonical(entry))).size;
      for (const prior of checks.values()) {
        if (!prior.committed || prior.revision >= Number(doc['revision'])) refuse();
        const storedPrior = packetRecord(prior.path);
        if (storedPrior.receipt !== prior.receipt || sha256(storedPrior.bytes) !== prior.digest) refuse();
        const record = json(storedPrior.bytes);
        if (!checkShape(record, 'check', false) || record['revision'] !== prior.revision) refuse();
        inRun += uniqueCount(record);
      }
      // file is the producer's Inferred advisory write report, shape-checked
      // only: no origin receipt attests that write or the sidecar's existence.
      const advice = record(document['mechanismAdvice']);
      if (advice['thisRevision'] !== entries.length || advice['inRun'] !== inRun) refuse();
      if (fit !== undefined) projected['figureFit'] = { ...fit, entries: fit.entries.filter(entry => figureFitClass(entry) === 'author') };
    }
    if (canonical(projected) !== canonical(base)) refuse();
    const subject = record(doc['draft']), report = reports.get(`author:${subject['sha256']}`);
    if (!report || !report.committed || subject['file'] !== `drafts/rev-${document['revision']}.json`) refuse();
    const frozen = read(run, subject['file']); if (sha256(frozen) !== report.digest || frozen.length !== subject['bytes']) refuse();
    const sources = await sourceParents(doc['citedBlobs'], waitForCapture);
    // The actual checker also derives manifest facts from bodies absent from
    // citedBlobs. Preserve their complete screened source lineage in the reply.
    const manifests = doc['manifestFacts'] as ManifestFacts | undefined;
    const manifestPaths = manifests?.state === 'derived'
      ? [...new Set(manifests.recognizers.flatMap(recognizer => recognizer.files.filter(file => file.epistemic === 'inferred').map(file => file.path)))] : [];
    if (new Set([...inputParents, report.receipt, ...sources]).size + manifestPaths.length > limits.parents) refuse();
    for (const file of manifestPaths) {
      await waitForCapture();
      sources.push(await ledger.sourceWhole({ path: file }));
      live();
    }
    await waitForCapture();
    const receipt = compose(stored, [...inputParents, report.receipt, ...sources]);
    const checked: Check = { path: `checks/rev-${document['revision']}.json`, revision: document['revision'], digest: sha256(stored), receipt, token, committed: false };
    // Let the supervisor service resource samples before the paired records
    // are re-read and published together under live authority.
    await waitForCapture();
    const records = prepareCheckRecords(checked, stored, subject['file'], frozen, report);
    bind('author', checked.path, stored, receipt);
    for (const [file, prepared] of records) authenticatedRecords.set(file, prepared);
    checkedProducts.set(`${checked.path}:${checked.digest}`, checked);
    checks.set(checked.revision, checked);
    return checked;
  }
  async function captureHelperCheck(role: Exclude<Role, 'author'>, document: Record<string, unknown>, submitted: Report,
    inputParents: readonly UrlOriginReceipt[], waitForCapture: () => Promise<void>, review?: UrlDesignReviewProof): Promise<Product> {
    const inventory = role === 'inventory';
    if (inventory ? !checkShape(document, 'inventory-check', true) : !reviewShape(document, role, true)) refuse();
    const number = document[inventory ? 'revision' : 'number']; if (!integer(number)) refuse();
    const file = inventory ? `inventory/checks/rev-${number}.json` : `reviews/checks/${role}-verdict-${number}.json`;
    const frozen = inventory ? `inventory/rev-${number}.json` : `reviews/${role}-verdict-${number}.json`;
    if (document['checkFile'] !== path.join(run, file)) refuse();
    const stored = read(run, file), doc = json(stored);
    if (inventory ? !checkShape(doc, 'inventory-check', false) : !reviewShape(doc, role, false)) refuse();
    const base = { ...document };
    for (const key of ['command', 'run', 'checkFile', 'disclosures', 'screenCensus', 'readerAdvice', 'reviewReach', 'reviewVisibility', 'observed', 'inferred', 'structureRecord', 'readingDifference']) delete base[key];
    if (canonical(doc) !== canonical(base)) refuse();
    const subject = record(doc[inventory ? 'inventory' : 'verdict']), bytes = read(run, frozen);
    if (subject['file'] !== frozen || subject['sha256'] !== submitted.digest || subject['bytes'] !== bytes.length || sha256(bytes) !== submitted.digest) refuse();
    if (!inventory) {
      const packet = record(doc['packet']);
      if (role === 'design') {
        if (!review || packet['sha256'] !== review.packet.sha256 || packet['site'] !== review.site
          || subject['packetSha256Named'] !== submitted.packet
          || (doc['outcome'] === 'validated' && (submitted.packet !== review.packet.sha256 || record(doc['session'])['sessionId'] !== review.sessionId))) refuse();
        // The checker holds its live proof through freezing. This product stays
        // pending until the host verifies a fresh proof and commits the audit.
      } else if (packet['sha256'] !== submitted.packet || !packetReceipts.has(`${role}:${submitted.packet}`)) refuse();
    }
    await waitForCapture();
    const receipt = compose(stored, [...inputParents, submitted.receipt]);
    const product: Product = { path: file, digest: sha256(stored), receipt, committed: false };
    await waitForCapture();
    if (review) assertUrlDesignReviewProofCurrent(review);
    if (checkedProducts.size >= limits.registrations) refuse();
    const records = prepareCheckRecords(product, stored, frozen, bytes, submitted);
    for (const [name, prepared] of records) authenticatedRecords.set(name, prepared);
    checkedProducts.set(`${file}:${product.digest}`, product);
    return product;
  }
  function statusShape(v: unknown): boolean {
    const projection = statusProjection;
    const subject = projection === undefined ? config.subject : { ...config.subject, workItem: projection.workItem };
    return shape({ command: lit('status'), outcome: lit('reported'), run: lit(run), label: lit('Inferred'), basis: text, mode: lit('operator-agent', 'URL-supervised local CLI through checked transport relay'),
      route: text, principal: item => canonical(item) === canonical(config.principal), subject: item => canonical(item) === canonical(subject),
      state: lit('configured', 'briefed', 'drafting', 'reviewing', 'rendered', 'closed'),
      configuration: shape({ declaredBy: lit('operator', 'URL run configuration'), label: lit('Inferred'), modelVersionProvider: text,
        values: item => keys(item, ['operator', 'agentTool', 'agentToolVersion', 'agentProvider', 'model', 'modelVersion', 'deadline', 'agentTurnBudget', 'maxRepairCycles', 'maxQuestions', 'audience', 'operatorIsOwner', 'agentTokenBudget'])
          && Object.values(item).every(value => typeof value === 'string' || typeof value === 'number' && Number.isFinite(value) || typeof value === 'boolean') }),
      steps: shape({ brief: lit('recorded', 'not recorded'), draftRevisions: integer, checkedRevisions: integer, inventory: lit('recorded', 'not recorded'),
        reviewPackets: integer, reviewVerdicts: integer, site: lit('recorded', 'not recorded'), closed: boolean }),
      limitsSpent: shape({ repairCycles: text, questions: text, deadline: text, agentUsage: text }), executionRecord: text, openFindings: text, reviewsStillRequired: strings, unrecognizedEntries: strings },
    projection === undefined ? {} : { effectiveRun: item => canonical(item) === canonical(projection) })(v)
      && (projection === undefined || canonical(record(v)['effectiveRun']) === canonical(projection));
  }
  function awaitShape(v: unknown, role: Exclude<Role, 'author'>): boolean {
    const common = { command: lit('await'), format: lit('polaris-dossier-await/1'), outcome: text, role: lit(role === 'inventory' ? 'inventory' : 'review'),
      session: lit(1), next: text, disclosures: strings, ...(role === 'inventory' ? {} : { kind: lit(role) }) };
    return shape({ ...common, outcome: lit('submitted'), passed: boolean,
      check: item => role === 'inventory' ? checkShape(item, 'inventory-check', true) : reviewShape(item, role, true) })(v)
      || shape({ ...common, outcome: lit('delivered'), round: integer, continuing: boolean, read: text, sha256: hex, label: lit('Inferred') })(v)
      || shape({ ...common, outcome: lit('waiting'), round: integer, waitedUntil: text, deadline: text })(v)
      || shape({ ...common, outcome: lit('ended'), round: integer, why: text })(v);
  }
  function normalize(argv: readonly string[], role: Role): string[] {
    roleOf(role); if (!Array.isArray(argv) || !argv.every(text)) refuse(); const args = [...argv];
    if (args.at(-1) === '--json') args.pop();
    if (args[0] !== 'dossier' || (role === 'author' ? !['help', 'status', 'check'].includes(args[1] ?? '') : args[1] !== 'await')) refuse();
    if (role === 'author') {
      if (args[1] === 'help' ? args.length !== 2 : args.length !== 3 || path.resolve(args[2]!) !== run) refuse();
      if (args.length === 3) args[2] = run;
    } else {
      if (typeof args[2] !== 'string' || path.resolve(args[2]) !== directories.get(role)) refuse(); args[2] = `${directories.get(role)!}/`;
      if (args[3] === '--submit') {
        if (args.length !== 6 || args[5] !== '--stdin' || (role === 'inventory' ? args[4] !== 'inventory.json' : !/^round-[1-9][0-9]{0,5}\/verdict\.json$/u.test(args[4] ?? ''))) refuse();
      } else {
        const used = new Set<string>();
        for (let i = 3; i < args.length; i += 2) { const key = args[i], value = args[i + 1];
          if (!key || used.has(key) || (key === '--round' ? !/^[1-9][0-9]{0,5}$/u.test(value ?? '') : key !== '--wait-minutes' || value !== '1')) refuse(); used.add(key); }
        // The broker adds this fixed bound before running a helper. Compare
        // its prepared argv with the same issued call when the option is omitted.
        if (!used.has('--wait-minutes')) args.push('--wait-minutes', '1');
      }
    }
    return args;
  }
  function runner(role: Role): UrlRunDossier {
    roleOf(role); const actual = actualRunner(role); if (typeof actual !== 'function') refuse();
    return (argv, stdin, review, awaitProductRead) => duringProducer(async () => {
      const waitForCapture = async (): Promise<void> => {
        await yieldToPoll();
        if (awaitProductRead !== undefined && !(await awaitProductRead())) refuse();
      };
      try {
        live(); if (!initial || pending.has(role)) refuse(); const args = normalize(argv, role), inputParents = [...roleParents(role).receipts], token = `runner:${role}:${registrations}`;
        const designSubmit = role === 'design' && args[3] === '--submit';
        if (designSubmit !== (review !== undefined)) refuse();
        let designOrigin: UrlOriginReceipt | undefined;
        if (review) {
          assertUrlDesignReviewProofCurrent(review);
          if (review.ordered) {
            const parents = orderedUrlDesignReviewParents(review);
            if (parents.length === 0) refuse();
            for (const parent of parents) { ledger.metadata(parent); if (!inputParents.includes(parent)) inputParents.push(parent); }
            if (inputParents.length > limits.parents) refuse();
            designOrigin = parents[0];
          } else { designOrigin = designReads.get(review.artifactReadId!); }
          if (!designOrigin || review.run !== run || review.pinnedRevision !== pin || review.sessionId !== plans.get('design')!.profile.input.sessionId
            || args[4] !== `round-${review.round}/verdict.json` || !inputParents.includes(designOrigin)) refuse();
        }
        let payload: Report | undefined;
        if (args[3] === '--submit') {
          if (!(stdin instanceof Uint8Array) || stdin.length > limits.itemBytes) refuse(); payload = reportPayload(role, Uint8Array.from(stdin), inputParents, token);
        } else if (stdin !== null) refuse();
        const response = copy(await actual(args[1] === 'help' ? args : [...args, '--json'], stdin, review, awaitProductRead));
        if (args[1] === 'check' || payload !== undefined) await waitForCapture();
        live();
        if (!keys(response, ['stdout', 'stderr', 'exit']) || typeof response.exit !== 'number' || !text(response.stdout) || response.stderr !== '') refuse();
        const extra: UrlOriginReceipt[] = payload ? [payload.receipt] : [];
        const capturedChecks: Check[] = [];
        const capturedProducts: Product[] = [];
        let designVerdict: UrlCheckedDesignVerdict | undefined;
        if (args[1] === 'help') { if (response.exit !== 0 || response.stdout !== helpText) refuse(); }
        else {
          const doc = json(Buffer.from(response.stdout));
          if (urlDossierReportExit(args[1]!, payload !== undefined, doc) !== response.exit) refuse();
          if (args[1] === 'check') capturedChecks.push(await captureCheck(doc, inputParents, token, waitForCapture));
          else if (args[1] === 'status') { if (!statusShape(doc)) refuse(); }
          else {
            if (role === 'author' || !awaitShape(doc, role)) refuse();
            const roundOption = args.indexOf('--round');
            const requestedRound = roundOption === -1 ? 1 : Number(args[roundOption + 1]);
            if (payload === undefined && (doc['round'] !== requestedRound
              || (role === 'inventory' && doc['outcome'] !== 'delivered'))) refuse();
            if (payload) {
              if (doc['outcome'] !== 'submitted') refuse(); const checked = record(doc['check']), named = record(checked[role === 'inventory' ? 'inventory' : 'verdict']);
              if (doc['passed'] !== (checked['outcome'] === (role === 'inventory' ? 'passed' : 'validated'))
                || named['sha256'] !== payload.digest || named['bytes'] !== stdin!.length) refuse();
              if (role === 'inventory') extra.push(...await sourceParents(checked['citedBlobs'], waitForCapture));
              else if (!designOrigin) { const packet = record(checked['packet']), parent = packetReceipts.get(`${role}:${packet['sha256']}`);
                if (!parent || payload.packet !== packet['sha256']) refuse(); extra.push(parent); }
              const product = await captureHelperCheck(role, checked, payload, [...inputParents, ...extra], waitForCapture, review);
              capturedProducts.push(product); extra.push(product.receipt);
              if (review && checked['outcome'] === 'validated') {
                const number = checked['number'];
                if (!integer(number)) refuse();
                designVerdict = Object.freeze({ number, checkSha256: product.digest, verdictSha256: payload.digest });
              }
            } else if (doc['outcome'] === 'delivered') {
              const directory = directories.get(role)!;
              const file = role === 'inventory' ? 'inventory-brief.md' : `round-${doc['round']}/packet.json`;
              const data = read(directory, file);
              if (doc['read'] !== path.join(directory, file) || doc['sha256'] !== sha256(data)
                || doc['continuing'] !== (requestedRound > 1) || !ledger.artifactOrigins(role, file, data)) refuse();
              if (role !== 'inventory') {
                const parent = packetReceipts.get(`${role}:${doc['sha256']}`);
                if (!parent) refuse();
                extra.push(parent);
              }
            }
          }
        }
        extra.push(...capturedChecks.map(c => c.receipt));
        if (capturedChecks.length > 0 || capturedProducts.length > 0) await yieldToPoll();
        const encoded = canonical(response), receipt = compose(Buffer.from(encoded), [...inputParents, ...extra]);
        pending.set(role, { argv: canonical(args), receipt, ...(payload ? { payload } : {}), checks: capturedChecks,
          products: [...capturedChecks, ...capturedProducts], digest: sha256(encoded), ...(designVerdict ? { designVerdict } : {}) });
        return response;
      } catch { pending.delete(role); return refuse(); }
    });
  }
  async function stageOrderedDesignVerdict(argv: readonly string[], stdin: Uint8Array, proof: UrlDesignReviewProof,
    awaitCurrent?: () => Promise<boolean>): Promise<UrlOrderedDesignVerdictStage> {
    live();
    if (!proof.ordered || pending.has('design') || orderedPendingFiles.size !== 0) refuse();
    assertUrlDesignReviewProofCurrent(proof);
    if (sha256(canonical({ argv, stdin: decode(stdin) })) !== proof.verdictInputSha256) refuse();
    if (argv[2] !== '/work') refuse();
    const hostArgv = [...argv]; hostArgv[2] = directories.get('design')!;
    await runner('design')(hostArgv, stdin, proof, awaitCurrent);
    const captured = pending.get('design');
    if (!captured?.payload || !captured.designVerdict || captured.checks.length !== 0 || captured.products.length !== 1) refuse();
    assertUrlDesignReviewProofCurrent(proof);
    const checked = copy(captured.designVerdict);
    const stage = Object.freeze({ checked, sha256: sha256(canonical(checked)) });
    pending.delete('design');
    const name = `design-verdict-${checked.number}.json`;
    for (const file of [`reviews/checks/${name}`, `reviews/${name}`]) {
      const expected = authenticatedRecords.get(file); if (!expected || expected.committed()) refuse();
      orderedPendingFiles.set(file, expected);
    }
    orderedStages.set(stage, { captured, proof, consumed: false });
    return stage;
  }
  function commitOrderedDesignVerdict(stage: UrlOrderedDesignVerdictStage, proof: UrlDesignReviewProof, terminal: OrderedDesignTerminalEvidence): void {
    live();
    const issued = orderedStages.get(stage);
    if (!issued || issued.consumed || proof === issued.proof || !proof.ordered || !issued.proof.ordered
      || canonical(proof.ordered) !== canonical(issued.proof.ordered) || proof.run !== issued.proof.run || proof.runId !== issued.proof.runId
      || proof.pinnedRevision !== issued.proof.pinnedRevision || proof.round !== issued.proof.round || proof.site !== issued.proof.site
      || proof.verdictCallId !== issued.proof.verdictCallId || proof.verdictInputSha256 !== issued.proof.verdictInputSha256
      || stage.sha256 !== sha256(canonical(stage.checked))) refuse();
    assertUrlOrderedDesignVerdictTerminal(proof, stage.checked, terminal);
    const { captured } = issued;
    const name = `design-verdict-${stage.checked.number}.json`;
    for (const { file, digest } of [{ file: `reviews/checks/${name}`, digest: stage.checked.checkSha256 },
      { file: `reviews/${name}`, digest: stage.checked.verdictSha256 }]) {
      const expected = authenticatedRecords.get(file), snapshot = snapshotRecord(run, file, limits.itemBytes);
      if (!expected || snapshot.bytes === null || !sameProductFile(expected.snapshot, snapshot) || sha256(snapshot.bytes) !== digest) refuse();
    }
    assertUrlOrderedDesignVerdictTerminal(proof, stage.checked, terminal);
    issued.consumed = true;
    bind('design', `round-${proof.round}/verdict.json`, read(run, `reviews/${name}`), captured.payload!.receipt);
    remember('design', captured.receipt);
    captured.payload!.committed = true;
    for (const product of captured.products) product.committed = true;
    for (const file of [`reviews/checks/${name}`, `reviews/${name}`]) orderedPendingFiles.delete(file);
  }
  function packetSnapshot(directory: string, file: string, check?: () => void): ProductFileSnapshot {
    const maximum = Math.min(limits.itemBytes, limits.readBytes - readBytes);
    if (maximum < 1) refuse();
    const snapshot = check === undefined ? snapshotRecord(directory, file, maximum) : snapshotProductFile(directory, file, maximum, check);
    readBytes += snapshot.bytes?.length ?? 0;
    return snapshot;
  }
  function packetRecord(file: string) {
    const expected = authenticatedRecords.get(file);
    if (!expected?.committed()) refuse();
    const snapshot = packetSnapshot(run, file);
    if (snapshot.bytes === null || !sameProductFile(expected.snapshot, snapshot)) refuse();
    ledger.origins(expected.receipt, snapshot.bytes);
    return { bytes: snapshot.bytes, receipt: expected.receipt };
  }
  function checkedPacketSubject(kind: 'author' | 'inventory', subject: Record<string, unknown>): readonly UrlOriginReceipt[] {
    const revision = subject['revision'], report = reports.get(`${kind}:${subject['sha256']}`);
    if (!report?.committed || !integer(revision) || report.projection !== sha256(canonical(subject['document']))) refuse();
    const author = kind === 'author';
    const checkPath = `${author ? 'checks' : 'inventory/checks'}/rev-${revision}.json`;
    const frozenPath = `${author ? 'drafts' : 'inventory'}/rev-${revision}.json`;
    const checked = packetRecord(checkPath), frozen = packetRecord(frozenPath), check = json(checked.bytes);
    const named = record(check[author ? 'draft' : 'inventory']);
    if (!checkShape(check, author ? 'check' : 'inventory-check', false) || check['outcome'] !== 'passed'
      || check['revision'] !== revision || named['file'] !== frozenPath || named['sha256'] !== report.digest
      || named['bytes'] !== frozen.bytes.length || frozen.receipt !== report.receipt) refuse();
    return [report.receipt, checked.receipt];
  }
  async function packet(input: FidelityPacketRegistration, waitForSamples?: () => Promise<boolean>): Promise<readonly UrlProducedArtifact[]> {
    live(); if (!initial || !keys(input, ['kind', 'round', 'packetSha256']) || input.kind !== 'fidelity'
      || !integer(input.round) || input.round < 1 || !hex(input.packetSha256)) refuse();
    const { kind: role, round, packetSha256 } = input;
    const directory = directories.get(role)!, prefix = `round-${round}`;
    const packetPath = `${prefix}/packet.json`, digestPath = `${prefix}/packet.sha256`;
    const deliveryPath = `${prefix}/delivery.json`, schemaPath = `${prefix}/verdict.schema.json`;
    const roleFiles = new Map<string, ProductFileSnapshot>();
    const waitForPacketReads = async (): Promise<void> => {
      await yieldToPoll();
      if (waitForSamples !== undefined && !(await waitForSamples())) refuse();
      live();
    };
    function capture(file: string): Uint8Array | null {
      const fileSnapshot = packetSnapshot(directory, file);
      roleFiles.set(file, fileSnapshot);
      return fileSnapshot.bytes;
    }
    const bytes = capture(packetPath), digestBytes = capture(digestPath);
    await waitForPacketReads();
    const deliveryBytes = capture(deliveryPath), schemaBytes = capture(schemaPath);
    if (bytes === null || digestBytes === null || deliveryBytes === null) refuse();
    const doc = json(bytes);
    if (sha256(bytes) !== packetSha256 || doc['runId'] !== runId || doc['pinnedRevision'] !== pin || doc['kind'] !== role
      || decode(digestBytes) !== `${packetSha256}  packet.json\n`) refuse();
    const delivery = json(deliveryBytes);
    if (!shape({ format: lit('polaris-dossier-delivery/1'), kind: lit(role), runId: lit(runId), session: lit(1), round: lit(round), packetSha256: lit(packetSha256) })(delivery)) refuse();
    const storedPath = `reviews/${role}-session-1.delivery-${round}.json`;
    const storedSnapshot = packetSnapshot(run, storedPath), storedBytes = storedSnapshot.bytes;
    if (storedBytes === null) refuse();
    const stored = json(storedBytes);
    if (!shape({ format: lit('polaris-dossier-delivery/1'), role: lit('review'), kind: lit(role), runId: lit(runId), session: lit(1), round: lit(round),
      packetSha256: lit(packetSha256), packetBytes: lit(bytes.length), packet: shape({ sha256: lit(packetSha256), draftRevision: integer, inventoryRevision: integer }), deliveredAt: text, continuing: lit(round > 1), earlierRounds: array(integer), label: lit('Inferred') })(stored)) refuse();
    const actualParents: UrlOriginReceipt[] = [...rootParents];
    if (!keys(doc, ['format', 'kind', 'runId', 'pinnedRevision', 'draft', 'inventory', 'spans', 'screeningPolicy', 'criteria', 'verdictSchema'])
      || doc['format'] !== 'polaris-dossier-fidelity-packet/1' || !strings(doc['criteria']) || !policy(doc['screeningPolicy']) || !list(doc['spans'])
      || canonical(doc['screeningPolicy']) !== canonical({ policyId: config.subject.screeningPolicy.policyId, policyVersion: config.subject.screeningPolicy.policyVersion, sha256: config.subject.screeningPolicy.sha256 })) refuse();
    const draft = record(doc['draft']), inventory = record(doc['inventory']);
    if (!keys(draft, ['revision', 'sha256', 'omitted', 'document']) || !integer(draft['revision']) || canonical(draft['omitted']) !== canonical(['discovery'])
      || !keys(inventory, ['revision', 'sha256', 'coverage', 'document']) || !integer(inventory['revision'])
      || !shape({ declaredBy: lit('the inventory session'), label: lit('Inferred'), basis: text })(inventory['coverage'])) refuse();
    const deliveredPacket = record(stored['packet']); if (deliveredPacket['draftRevision'] !== draft['revision'] || deliveredPacket['inventoryRevision'] !== inventory['revision']) refuse();
    const spanCitation = shape({ subject: lit('draft', 'inventory'), citationId: text });
    for (const givenSpan of doc['spans']) {
      const span = record(givenSpan);
      if (span['outcome'] === 'admitted') {
        if (!shape({ id: text, path: relative, startLine: integer, endLine: integer, objectId: text, outcome: lit('admitted'), text,
          citedBy: array(spanCitation) }, { redaction })(span)
          || Number(span['startLine']) < 1 || Number(span['endLine']) < Number(span['startLine']) || Number(span['endLine']) - Number(span['startLine']) >= 2000
          || span['redaction'] !== undefined) refuse();
        await waitForPacketReads();
        const receipt = await ledger.sourceSpan({ path: span['path'] as string, offset: Number(span['startLine']) - 1,
          limit: Number(span['endLine']) - Number(span['startLine']) + 1, expectedObjectId: span['objectId'] as string });
        ledger.origins(receipt, Buffer.from(span['text'] as string));
        live();
        actualParents.push(receipt);
      } else {
        const base = { id: text, path: nullable(relative), startLine: integer, endLine: integer, objectId: nullable(text), citedBy: array(spanCitation) };
        if (!shape({ ...base, outcome: lit('denied-path', 'secret-detector-match', 'unknown-extraction-class', 'not-utf8-text', 'active-content', 'absent', 'beyond-blob') })(span)
          && !shape({ ...base, path: relative, objectId: text, outcome: lit('class-not-consented'), missingClass: lit('code-content', 'governance-text', 'project-documentation') })(span)
          && !shape({ ...base, path: relative, objectId: text, outcome: lit('redacted-span'), redaction: shape({ redactionClass: lit('redacted-span'), withheldLines: integer }) })(span)) refuse();
      }
    }
    await waitForPacketReads();
    actualParents.push(...checkedPacketSubject('author', draft), ...checkedPacketSubject('inventory', inventory));
    if (actualParents.length > limits.parents || canonical(doc['verdictSchema']) !== canonical(json(schemaDocuments[role]))
      || (schemaBytes !== null && canonical(json(schemaBytes)) !== canonical(doc['verdictSchema']))) refuse();
    // All role files are re-read without yielding before publication. The
    // named file checks share one bounded walk and its authority bracket.
    const deadline = performance.now() + 5000;
    const check = (): void => { if (performance.now() >= deadline) refuse(); };
    live();
    for (const [file, original] of roleFiles)
      if (!sameProductFile(original, packetSnapshot(directory, file, check))) refuse();
    live();
    check();
    const receipt = compose(bytes, actualParents);
    const bindings: ArtifactBinding[] = [
      { role, path: packetPath, bytes, receipt },
      { role, path: digestPath, bytes: digestBytes, receipt: compose(digestBytes, [receipt]) },
    ];
    // Existing packets embed their schema; no schema file is invented or written here.
    if (schemaBytes !== null) bindings.push({ role, path: schemaPath, bytes: schemaBytes, receipt: compose(schemaBytes, [receipt]) });
    const finalStored = packetSnapshot(run, storedPath);
    if (!sameProductFile(storedSnapshot, finalStored)) refuse();
    const retained = prepareRecord(storedPath, storedBytes, compose(storedBytes, [receipt]), () => initial, finalStored);
    bindAll(bindings);
    authenticatedRecords.set(storedPath, retained);
    packetReceipts.set(`${role}:${packetSha256}`, receipt);
    return copy(products.filter(p => p.role === role && p.path.startsWith(`${prefix}/`)));
  }
  function controlShape(reply: Record<string, unknown>, role: Role): boolean {
    if (reply['kind'] === 'session-control') return shape({ ok: lit(true), kind: lit('session-control'), state: lit('pending', 'events'), events: array(event => {
      if (!isRecord(event) || !integer(event['sequence']) || Number(event['sequence']) < 1) return false;
      return shape({ event: lit('draft-ready', 'inventory-repair'), revision: integer, sequence: integer })(event)
        || shape({ event: lit('review-blocked'), review: lit('fidelity', 'design'), revision: integer, sequence: integer })(event)
        || shape({ event: lit('run-terminal'), outcome: lit('completed', 'refused', 'stopped', 'Unknown'), sequence: integer })(event)
        || role === 'design' && isDesignRoundPrepared(event, true);
    }) })(reply) && (reply['state'] === 'events') === ((reply['events'] as unknown[]).length > 0);
    const nonce = (v: unknown): boolean => typeof v === 'string' && /^[a-f0-9]{32}$/u.test(v);
    return shape({ ok: lit(true), kind: lit('session-clarification'), state: lit('pending'), nonce, questionSha256: hex })(reply)
      || shape({ ok: lit(true), kind: lit('session-clarification'), state: lit('answered'), nonce, questionSha256: hex,
        answerKind: lit('free-text', 'selected-interpretation', 'leave-unknown', 'defer'), answer: text, attribution: lit('operator'), label: lit('Inferred') })(reply);
  }
  async function toolReceipt(role: Role, givenReceipt: SessionToolsReceipt, latestAdmission: SessionAdmission | null,
    awaitReceiptCurrent?: () => Promise<boolean>): Promise<UrlCheckedDesignVerdict | undefined> {
    try {
      roleOf(role); if (!initial || !latestAdmission) refuse();
      const raw = copy(givenReceipt), admission = copy(latestAdmission), admittedParents = admissionParents(role, admission);
      if (!keys(raw, ['binding', 'id', 'kind', 'toolName', 'toolInput', 'canonicalText', 'classes', 'originIds', 'digest', 'bytes'])
        || canonical(raw.binding) !== canonical(plans.get(role)!.profile.input.binding) || raw.kind !== 'tool-result' || !/^tool-[a-f0-9]{64}$/u.test(raw.id)
        || seen.get(role)!.has(raw.id) || raw.digest !== sha256(raw.canonicalText) || raw.bytes !== Buffer.byteLength(raw.canonicalText)) refuse();
      const artifactPath = raw.toolInput['path'];
      const designArtifactRead = raw.toolName === 'mcp__syzygy__artifact_read' && typeof artifactPath === 'string'
        && URL_DESIGN_VIEW_ARTIFACT.test(artifactPath);
      const artifact = designArtifactRead ? activeDesign : undefined;
      if (designArtifactRead && (role !== 'design' || !artifact || !keys(raw.toolInput, ['path']) || artifact.file !== artifactPath)) refuse();
      const bytes = Buffer.from(raw.canonicalText);
      // The protected view determines the entire reply for this virtual path.
      const reply: Record<string, unknown> = artifact ? { ok: true, kind: 'artifact', path: artifact.file,
        sha256: artifact.origins.digest, text: new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(artifact.bytes) } : json(bytes);
      if (canonical(reply) !== raw.canonicalText || reply['ok'] !== true) refuse();
      const captured = pending.get(role); let receipt: UrlOriginReceipt, designRead: UrlOriginReceipt | undefined;
      const newReports: Report[] = [], newChecks: Check[] = [], newProducts: Product[] = [];
      let designVerdict: UrlCheckedDesignVerdict | undefined, draftWriteSha256: string | undefined;
      if (artifact) {
        if (canonical(raw.classes) !== canonical([...artifact.origins.classes].sort())
          || canonical(raw.originIds) !== canonical([...artifact.origins.originIds].sort())) refuse();
        artifact.current();
        receipt = compose(bytes, artifact.parents);
        designRead = receipt;
      } else if (raw.toolName === 'mcp__syzygy__dossier_step' && ['session-control', 'session-clarification'].includes(reply['kind'] as string)) {
        const args = raw.toolInput['argv']; if (!Array.isArray(args) || !args.every(text) || args[0] !== 'dossier' || args[2] !== run || !controlShape(reply, role)) refuse();
        const inherited = [...admittedParents];
        if (reply['kind'] === 'session-control') {
          if (!keys(raw.toolInput, ['argv']) || args.length !== 3 || args[1] !== 'poll') refuse();
        } else {
          if (role !== 'author' || !keys(raw.toolInput, ['argv', 'stdin']) || args.length !== 4 || args[1] !== 'clarify' || args[3] !== '--stdin' || !text(raw.toolInput['stdin'])) refuse();
          const question = json(Buffer.from(raw.toolInput['stdin']));
          const id = reply['questionSha256'] as string;
          if (question['kind'] === 'question') {
            if (!shape({ kind: lit('question'), question: text }, { options: strings, consequence: text, evidence: text })(question)
              || id !== sha256(canonical(question)) || reply['state'] !== 'pending' || questions.has(id)) refuse();
            if (questions.size >= config.declared.maxQuestions) refuse(); questions.set(id, Object.freeze([...admittedParents]));
          } else {
            if (!shape({ kind: lit('answer'), nonce: text, questionSha256: hex })(question) || question['questionSha256'] !== id || question['nonce'] !== reply['nonce']) refuse();
            const original = questions.get(id); if (!original) refuse(); inherited.push(...original); if (reply['state'] === 'answered') questions.delete(id);
          }
        }
        receipt = compose(bytes, [...new Set(inherited)]);
      } else if (raw.toolName === 'mcp__syzygy__dossier_step' && reply['kind'] === 'dossier-result') {
        const args = raw.toolInput['argv']; if (!Array.isArray(args) || !args.every(text) || !captured
          || canonical(normalize(args, role)) !== captured.argv || sha256(canonical({ stdout: reply['stdout'], stderr: reply['stderr'], exit: reply['exit'] })) !== captured.digest) refuse();
        if (captured.payload) {
          if (!keys(raw.toolInput, ['argv', 'stdin']) || !text(raw.toolInput['stdin']) || sha256(raw.toolInput['stdin']) !== captured.payload.digest) refuse();
          // The host adapter checks the actual pending call's authenticated admission again.
          const projected = copy({ ...raw, toolInput: { ...raw.toolInput, argv: normalize(args, role) } });
          // Let resource polls run before the adapter can issue or bind anything.
          await yieldToPoll();
          if (awaitReceiptCurrent !== undefined && !(await awaitReceiptCurrent())) refuse();
          if (pending.get(role) !== captured) refuse();
          const adapter = adapters.get(role)!;
          adapter.set(admission); await adapter.adapter.onToolReceipt(projected);
          newReports.push(captured.payload); bind(role, normalize(args, role)[4]!, Buffer.from(raw.toolInput['stdin']), captured.payload.receipt);
        } else if (!keys(raw.toolInput, ['argv'])) refuse();
        newChecks.push(...captured.checks); newProducts.push(...captured.products); receipt = compose(bytes, [captured.receipt, ...admittedParents]);
        designVerdict = captured.designVerdict;
        pending.delete(role);
      } else {
        const adapter = adapters.get(role)!;
        adapter.set(admission); receipt = await adapter.adapter.onToolReceipt(raw, awaitReceiptCurrent);
        if (raw.toolName === 'mcp__syzygy__artifact_write') {
          if (!text(raw.toolInput['content'])) refuse(); const payloadBytes = Buffer.from(raw.toolInput['content']);
          const report = reportPayload(role, payloadBytes, admittedParents, raw.id); newReports.push(report);
          bind(role, FROZEN_DRAFT_PATH, payloadBytes, report.receipt); draftWriteSha256 = report.digest;
        }
      }
      remember(role, receipt); seen.get(role)!.add(raw.id);
      if (uncommitted.size >= limits.registrations || uncommitted.has(raw.id)) refuse(); uncommitted.set(raw.id, { role,
        reports: newReports, checks: newChecks, products: newProducts,
        ...(designRead ? { designRead } : {}), ...(designVerdict ? { designVerdict } : {}),
        ...(draftWriteSha256 === undefined ? {} : { draftWriteSha256 }) }); live();
      return designVerdict;
    } catch { return refuse(); }
  }
  function feedback(input: { readonly review: 'fidelity' | 'design'; readonly number: number; readonly sha256: string;
    readonly recipients: readonly ('author' | 'inventory')[] }): readonly UrlProducedArtifact[] {
    live(); if (!initial || !keys(input, ['review', 'number', 'sha256', 'recipients']) || !['fidelity', 'design'].includes(input.review)
      || !integer(input.number) || !hex(input.sha256) || !Array.isArray(input.recipients) || input.recipients.length < 1 || input.recipients.length > 2
      || input.recipients.some(r => r !== 'author' && r !== 'inventory') || new Set(input.recipients).size !== input.recipients.length) refuse();
    const report = reports.get(`${input.review}:${input.sha256}`), frozen = read(run, `reviews/${input.review}-verdict-${input.number}.json`);
    if (!report?.committed || sha256(frozen) !== input.sha256) refuse(); ledger.origins(report.receipt, frozen);
    const checkFile = `reviews/checks/${input.review}-verdict-${input.number}.json`, checkBytes = read(run, checkFile);
    if (checkedProducts.get(`${checkFile}:${sha256(checkBytes)}`)?.committed !== true) refuse();
    const file = `feedback/${input.review}-verdict-${input.number}.json`, verified: { role: 'author' | 'inventory'; bytes: Uint8Array }[] = [];
    for (const role of input.recipients) {
      const bytes = read(directories.get(role)!, file); if (!Buffer.from(bytes).equals(Buffer.from(frozen))) refuse(); verified.push({ role, bytes });
    }
    for (const item of verified) bind(item.role, file, item.bytes, compose(item.bytes, [report.receipt]));
    return copy(products.filter(p => input.recipients.includes(p.role as 'author' | 'inventory') && p.path === file));
  }
  type KnownRecord = ReturnType<typeof authenticatedRecords.get>;
  interface ReadEntry { readonly snapshot: ProductFileSnapshot; readonly receipt: UrlOriginReceipt; readonly expected: KnownRecord; }
  interface ReadState {
    readonly operation: UrlProductReadOperation; readonly deadline: number; readonly signal: AbortSignal | undefined;
    readonly entries: Map<string, ReadEntry>;
    readonly excludedOrdered: ReadonlyMap<string, NonNullable<ReturnType<typeof authenticatedRecords.get>>>;
    readonly selections: Map<UrlProductSelector, { readonly snapshot: ProductNameSnapshot; readonly names: readonly string[]; readonly receipt: UrlOriginReceipt }>;
    cancelled: boolean; bytes: number; timer?: ReturnType<typeof setTimeout>; abort?: () => void;
  }
  const readContexts = new WeakMap<UrlProductReadContext, ReadState>(), activeReads = new Set<ReadState>();
  const readProofs = new Map<string, { readonly path: Pick<ProductFileSnapshot, 'chain' | 'missingAt'>;
    readonly digest: string; readonly parents: readonly UrlOriginReceipt[]; readonly receipt: UrlOriginReceipt }>();
  function readProof(key: string, snapshot: Pick<ProductFileSnapshot, 'chain' | 'missingAt'>,
    bytes: Uint8Array, parents: readonly UrlOriginReceipt[]): UrlOriginReceipt {
    const digest = sha256(bytes), prior = readProofs.get(key);
    if (prior?.digest === digest && sameProductPath(prior.path, snapshot)
      && parents.length === prior.parents.length && parents.every((parent, index) => parent === prior.parents[index])) {
      return prior.receipt;
    }
    // New proof identities use the same bounded issuance as other products.
    // The cache keeps path identity and lineage, never product file bytes.
    const receipt = compose(bytes, parents);
    readProofs.set(key, { path: { chain: snapshot.chain, missingAt: snapshot.missingAt }, digest, parents, receipt });
    return receipt;
  }
  let readContextCount = 0, activeReadBytes = 0;
  function closeRead(state: ReadState): void {
    if (!state.cancelled) { state.cancelled = true; activeReadBytes -= state.bytes; }
    clearTimeout(state.timer); if (state.abort) state.signal?.removeEventListener('abort', state.abort);
    state.entries.clear(); state.selections.clear(); activeReads.delete(state);
  }
  const readLease = (state: ReadState): void => {
    if (state.cancelled || state.signal?.aborted || Date.now() >= state.deadline) { closeRead(state); refuse(); }
  };
  const readLive = (state: ReadState): void => {
    readLease(state);
    try { live(); } catch { closeRead(state); refuse(); }
    readLease(state);
  };
  function contextState(context: UrlProductReadContext): ReadState {
    const state = readContexts.get(context); if (!state) refuse(); readLease(state); return state;
  }
  function beginRead(input: { readonly operation: UrlProductReadOperation; readonly deadline: number; readonly signal?: AbortSignal }): UrlProductReadContext {
    live(); const now = Date.now();
    if (!initial || !keys(input, ['operation', 'deadline'], ['signal']) || !['render', 'review-packet', 'review-check', 'inventory-check', 'author-check'].includes(input.operation)
      || !Number.isSafeInteger(input.deadline) || input.deadline <= now || input.deadline > now + 5000
      || (input.signal !== undefined && (!(input.signal instanceof AbortSignal) || input.signal.aborted))
      || activeReads.size >= 16 || ++readContextCount > limits.registrations) refuse();
    const context: UrlProductReadContext = Object.freeze({ kind: 'url-product-read-context' });
    const state: ReadState = { operation: input.operation, deadline: input.deadline, signal: input.signal, entries: new Map(), excludedOrdered: input.operation === 'render' ? new Map(orderedPendingFiles) : new Map(), selections: new Map(), cancelled: false, bytes: 0 };
    state.timer = setTimeout(() => closeRead(state), input.deadline - now); state.timer.unref();
    state.abort = () => closeRead(state); input.signal?.addEventListener('abort', state.abort, { once: true });
    readContexts.set(context, state); activeReads.add(state);
    return context;
  }
  const stageSelectors = {
    author: ['author-checks', 'author-drafts', 'revision', 'draft'],
    inventory: ['inventory-checks', 'inventory-revisions', 'revision', 'inventory'],
    fidelity: ['fidelity-checks', 'fidelity-verdicts', 'number', 'verdict'],
    design: ['design-checks', 'design-verdicts', 'number', 'verdict'],
  } as const;
  type StageSubject = { readonly receipt: UrlOriginReceipt; readonly bytes: Uint8Array };
  /** Read the selected stages in one bounded, synchronous authority bracket.
   * Polls issue no origin receipts and retain no read context. */
  function stageChecks<R extends Role>(roles: readonly R[]): Readonly<Record<R, UrlCommittedStageCheck | null>> {
    live();
    if (!initial) refuse();
    const deadline = performance.now() + 5000;
    const checkDeadline = (): void => { if (performance.now() >= deadline) refuse(); };
    const subjects: StageSubject[] = [];
    const selected = roles.map(role => {
      if (!ROLES.includes(role)) refuse();
      return [role, readStageCheck(role, checkDeadline, subjects)] as const;
    });
    const result = Object.fromEntries(selected) as Record<R, UrlCommittedStageCheck | null>;
    if (subjects.length > 0) ledger.verifySubjects(subjects);
    live();
    checkDeadline();
    return result;
  }
  function verifyExcludedOrdered(files: ReadonlyMap<string, NonNullable<ReturnType<typeof authenticatedRecords.get>>>, check: () => void): void {
    if (files.size !== 0 && files.size !== 2) refuse();
    for (const [file, expected] of files) {
      const actual = snapshotProductFile(run, file, limits.itemBytes, check);
      if (authenticatedRecords.get(file) !== expected || actual.bytes === null || !sameProductFile(expected.snapshot, actual)) refuse();
    }
  }
  function readStageCheck(role: Role, checkDeadline: () => void, subjects: StageSubject[]): UrlCommittedStageCheck | null {
    const [checkSelector, reportSelector, numberKey, reportKey] = stageSelectors[role];
    const excluded = role === 'design' ? new Map(orderedPendingFiles) : new Map();
    verifyExcludedOrdered(excluded, checkDeadline);
    function names(selector: UrlProductSelector) {
      const spec = selectors[selector], snapshot = snapshotProductNames(run, spec.directory, 4096, checkDeadline);
      const files = selectionNames(snapshot, selector, excluded);
      const known = [...authenticatedRecords.keys()].filter(file => file.startsWith(`${spec.directory}/`)
        && spec.pattern.test(file.slice(spec.directory.length + 1)) && !excluded.has(file));
      if (files.length !== known.length || known.some(file => !files.includes(file))) refuse();
      return { files, snapshot };
    }
    function committed(file: string) {
      const expected = authenticatedRecords.get(file), actual = snapshotProductFile(run, file, limits.itemBytes, checkDeadline);
      if (!expected?.committed() || actual.bytes === null || !sameProductFile(expected.snapshot, actual)) refuse();
      subjects.push({ receipt: expected.receipt, bytes: actual.bytes });
      return actual.bytes;
    }
    const checks = names(checkSelector), submitted = names(reportSelector);
    const checkNames = checks.files.map(file => path.basename(file));
    const reportNames = submitted.files.map(file => path.basename(file));
    if (checkNames.length !== reportNames.length || checkNames.some((file, index) => file !== reportNames[index])) refuse();
    let result: UrlCommittedStageCheck | null = null;
    const latest = checks.files.at(-1), reportPath = submitted.files.at(-1);
    if (latest !== undefined && reportPath !== undefined) {
      const number = Number(selectors[checkSelector].pattern.exec(path.basename(latest))?.[1]);
      const checked = json(committed(latest)), bytes = committed(reportPath), report = record(checked[reportKey]);
      const shapeAdmitted = role === 'author' ? checkShape(checked, 'check', false)
        : role === 'inventory' ? checkShape(checked, 'inventory-check', false)
          : reviewShape(checked, role, false);
      if (!integer(number) || !shapeAdmitted || checked[numberKey] !== number
        || report['file'] !== reportPath || report['sha256'] !== sha256(bytes) || report['bytes'] !== bytes.length
        || !reports.get(`${role}:${report['sha256']}`)?.committed) refuse();
      const verdict = reportKey === 'verdict' ? json(bytes) : null;
      result = copy({ revision: number, record: checked, verdict });
    }
    for (const [selector, before] of [[checkSelector, checks], [reportSelector, submitted]] as const) {
      const after = names(selector);
      if (!sameProductPath(before.snapshot, after.snapshot) || canonical(before.files) !== canonical(after.files)) refuse();
    }
    verifyExcludedOrdered(excluded, checkDeadline);
    return excluded.size === 0 ? result : null;
  }
  function expectedRecord(file: string, state: ReadState): KnownRecord {
    if ((file === 'run.json' || file === 'url-declaration.json') && !authenticatedRecords.has(file)) {
      const bytes = file === 'run.json' ? coreBytes : sidecarBytes;
      if (bytes === null) throw new Error('url-run-artifacts-unsupported-effective-declaration');
      const receipt = compose(bytes, rootParents);
      // The exact host-retained initialized bytes, not a sidecar read or claimed digest,
      // are the authority for these two fixed records.
      retainRecord(file, bytes, receipt, () => true); readLive(state);
    }
    return authenticatedRecords.get(file);
  }
  function captureRead(state: ReadState, file: string): ReadEntry {
    readLease(state);
    if (typeof file !== 'string' || !relative(file) || state.excludedOrdered.has(file)) refuse();
    if ((file === 'launched.json' || /\.launch\.json$/u.test(file)) && (!launchFiles.includes(file) || !authenticatedRecords.has(file)))
      throw new Error('url-run-artifacts-unsupported-launch');
    if (!knownRecord(file)) refuse();
    const check = (): void => readLease(state);
    const previous = state.entries.get(file);
    if (previous) {
      if (previous.expected !== authenticatedRecords.get(file) || previous.expected?.committed(check) === false) refuse();
      return previous;
    }
    if (state.entries.size >= limits.registrations) refuse();
    // A synchronous descriptor walk stays private until the enclosing read
    // validates current authority again. Sample the lease inside that walk.
    const expected = expectedRecord(file, state), snapshot = snapshotProductFile(run, file, limits.itemBytes, check);
    if (snapshot.bytes !== null) {
      if (state.bytes + snapshot.bytes.length > limits.readBytes || activeReadBytes + snapshot.bytes.length > limits.readBytes) refuse();
      state.bytes += snapshot.bytes.length; activeReadBytes += snapshot.bytes.length;
    }
    let receipt: UrlOriginReceipt;
    if (expected !== undefined) {
      if (!expected.committed(check) || !sameProductFile(expected.snapshot, snapshot) || snapshot.bytes === null) refuse();
      // Registration matched the receipt to the frozen bytes. The descriptor
      // comparison above matches those bytes before the enclosing live check.
      receipt = expected.receipt;
    } else {
      // An existing unknown record never becomes an absence or gets a class from its name.
      if (snapshot.bytes !== null) refuse();
      receipt = readProof(`absence:${state.operation}:${file}`, snapshot,
        asBytes({ format: 'polaris-url-record-absence/1', runId, operation: state.operation, path: file, state: 'absent' }),
        [origins.roots.runControl, origins.roots.toolMetadata]);
    }
    const entry = { snapshot, receipt, expected }; state.entries.set(file, entry); readLease(state); return entry;
  }
  function readProducts(context: UrlProductReadContext, files: readonly string[]): readonly UrlAuthenticatedProductRead[] {
    const state = contextState(context);
    try {
      if (!Array.isArray(files) || files.length > limits.registrations) refuse();
      const names = copy(files);
      // Bracket the whole synchronous descriptor walk. Every member checks
      // the same lease, and the caller receives nothing until the batch clears.
      if (names.some(file => !state.entries.has(file))) readLive(state);
      const result = names.map((file): UrlAuthenticatedProductRead => {
        const found = captureRead(state, file), bytes = found.snapshot.bytes;
        return Object.freeze({ kind: bytes === null ? 'absent' : 'present',
          bytes: bytes === null ? null : Uint8Array.from(bytes), receipt: found.receipt });
      });
      readLive(state); return result;
    }
    catch (error) { closeRead(state);
      if (error instanceof Error && ['url-run-artifacts-unsupported-launch', 'url-run-artifacts-unsupported-effective-declaration'].includes(error.message)) throw error;
      return refuse(); }
  }
  const readProduct = (context: UrlProductReadContext, file: string): UrlAuthenticatedProductRead => readProducts(context, [file])[0]!;
  function selectionNames(snapshot: ProductNameSnapshot, selector: UrlProductSelector, excluded: ReadonlyMap<string, unknown> = new Map()): readonly string[] {
    const spec = selectors[selector];
    return snapshot.names.filter(name => spec.pattern.test(name) && !excluded.has(`${spec.directory}/${name}`)).sort((a, b) => {
      const left = Number(spec.pattern.exec(a)![1]), right = Number(spec.pattern.exec(b)![1]);
      if (!Number.isSafeInteger(left) || !Number.isSafeInteger(right)) refuse(); return left - right;
    }).map(name => `${spec.directory}/${name}`);
  }
  function captureSelection(state: ReadState, selector: UrlProductSelector): readonly string[] {
    readLease(state);
    if (typeof selector !== 'string' || !Object.hasOwn(selectors, selector)) refuse();
    const previous = state.selections.get(selector); if (previous) return previous.names;
    const spec = selectors[selector], snapshot = snapshotProductNames(run, spec.directory, 4096, () => readLease(state));
    verifyExcludedOrdered(state.excludedOrdered, () => readLease(state));
    const names = Object.freeze([...selectionNames(snapshot, selector, state.excludedOrdered)]), selected = names.map(file => captureRead(state, file));
    if (selected.some(entry => entry.snapshot.bytes === null)) refuse();
    // Missing expected records cannot disappear from a selection, even when
    // the remaining names each match a genuine product.
    const expectedNames = [...authenticatedRecords.keys()].filter(file => file.startsWith(`${spec.directory}/`)
      && spec.pattern.test(file.slice(spec.directory.length + 1)) && !state.excludedOrdered.has(file));
    if (expectedNames.length !== names.length || expectedNames.some(file => !names.includes(file))) refuse();
    const receipt = readProof(`selection:${state.operation}:${selector}`, snapshot,
      asBytes({ format: 'polaris-url-record-selection/1', runId, operation: state.operation, selector,
        records: names.map((file, i) => ({ path: file, sha256: sha256(selected[i]!.snapshot.bytes!) })) }),
      [...new Set([origins.roots.runControl, origins.roots.toolMetadata, ...selected.map(entry => entry.receipt)])]);
    state.selections.set(selector, { snapshot, names, receipt }); return names;
  }
  function selectProductGroups(context: UrlProductReadContext, groups: readonly UrlProductSelector[]): readonly (readonly string[])[] {
    const state = contextState(context);
    try {
      if (!Array.isArray(groups) || groups.length > Object.keys(selectors).length) refuse();
      const given = copy(groups);
      if (given.some(selector => !state.selections.has(selector))) readLive(state);
      const result = given.map(selector => captureSelection(state, selector));
      readLive(state); return result;
    } catch { closeRead(state); return refuse(); }
  }
  const selectProducts = (context: UrlProductReadContext, selector: UrlProductSelector): readonly string[] => selectProductGroups(context, [selector])[0]!;
  function revalidateRead(context: UrlProductReadContext) {
    const state = contextState(context);
    try {
      readLive(state);
      const check = (): void => readLease(state);
      for (const [file, entry] of state.entries) {
        if (entry.expected !== authenticatedRecords.get(file) || entry.expected?.committed(check) === false) refuse();
        const snapshot = snapshotProductFile(run, file, limits.itemBytes, check);
        if (!sameProductFile(entry.snapshot, snapshot)) refuse();
      }
      for (const [selector, selection] of state.selections) {
        const spec = selectors[selector], snapshot = snapshotProductNames(run, spec.directory, 4096, () => readLease(state));
        if (!sameProductPath(selection.snapshot, snapshot) || canonical(selectionNames(snapshot, selector, state.excludedOrdered)) !== canonical(selection.names)) refuse();
        const expectedNames = [...authenticatedRecords.keys()].filter(file => file.startsWith(`${spec.directory}/`) && spec.pattern.test(file.slice(spec.directory.length + 1)) && !state.excludedOrdered.has(file));
        if (expectedNames.length !== selection.names.length || expectedNames.some(file => !selection.names.includes(file))) refuse();
      }
      const receipts = [...new Set([...state.entries.values(), ...state.selections.values()].map(entry => entry.receipt))];
      if (receipts.length > limits.parents) refuse(); readLease(state);
      verifyExcludedOrdered(state.excludedOrdered, () => readLease(state));
      const entries = [...state.entries], selections = [...state.selections];
      const metadata = ledger.inspectMetadata([
        ...entries.map(([, { receipt, snapshot }]) => ({ receipt, ...(snapshot.bytes === null ? {} : { bytes: snapshot.bytes }) })),
        ...selections.map(([, { receipt }]) => ({ receipt })),
      ]);
      const result = Object.freeze({ receipts: Object.freeze(receipts), metadata: copy({ operation: state.operation, deadline: state.deadline, snapshotBytes: state.bytes,
        records: entries.map(([file, entry], index) => {
          const { id, digest } = metadata[index]!;
          const bytes = entry.snapshot.bytes;
          return { path: file, state: bytes === null ? 'absent' : 'present',
            sha256: bytes === null ? null : digest, bytes: bytes?.length ?? null, originId: id };
        }),
        selections: selections.map(([selector, selection], index) => ({
          selector, records: selection.names, originId: metadata[entries.length + index]!.id,
        })) }) });
      readLive(state); return result;
    } catch { closeRead(state); return refuse(); }
  }
  /** Copy identities of settled, independently bound producer files. The
   * supervisor calls this only once its owned writers and callbacks are
   * confirmed stopped. The descriptor walk detects drift during the read. */
  function captureFrozenHistory(): UrlFrozenProductHistory {
    return snapshotWithAuthority(check => {
      if (!initial || sidecarBytes === null || producersInFlight || activeReads.size || pending.size || uncommitted.size || questions.size
        || orderedPendingFiles.size || activeDesign !== undefined) refuse();
      const records = new Map<string, Omit<FrozenProductIdentity, 'origin'>>();
      const recordReceipts = new Map<string, UrlOriginReceipt>();
      const observed = new Map<string, ProductFileSnapshot>();
      let totalBytes = 0;
      const readFrozen = (file: string): ProductFileSnapshot & { bytes: Uint8Array } => {
        if (observed.has(file) || totalBytes >= limits.readBytes) refuse();
        const actual = snapshotProductFile(run, file, Math.min(limits.itemBytes, limits.readBytes - totalBytes), check);
        if (actual.bytes === null) refuse();
        totalBytes += actual.bytes.length;
        observed.set(file, actual);
        records.set(file, { path: file, bytes: actual.bytes.length, sha256: sha256(actual.bytes) });
        let receipt = authenticatedRecords.get(file)?.receipt;
        if (receipt === undefined && (file === 'run.json' || file === 'url-declaration.json')) receipt = compose(actual.bytes, rootParents);
        const packet = PACKET_PATH.exec(file);
        if (receipt === undefined && packet !== null) {
          const packetReceipt = packetReceipts.get(`fidelity:${packet[1]!.slice('fidelity-packet-'.length)}`);
          if (!packetReceipt) refuse();
          receipt = packet[2] === 'packet.json' ? packetReceipt : compose(actual.bytes, [packetReceipt]);
        }
        receipt ??= ledger.boundArtifact('author', file, actual.bytes);
        ledger.origins(receipt, actual.bytes); recordReceipts.set(file, receipt);
        return { ...actual, bytes: actual.bytes };
      };
      for (const [file, expected] of authenticatedRecords) {
        if (!knownRecord(file) || !expected.committed(check)) refuse();
        const actual = readFrozen(file);
        if (!sameProductFile(expected.snapshot, actual)) refuse();
        ledger.origins(expected.receipt, actual.bytes);
      }
      for (const [file, bytes] of [['run.json', coreBytes], ['url-declaration.json', sidecarBytes]] as const) {
        const actual = observed.get(file) ?? readFrozen(file);
        if (actual.bytes === null || !Buffer.from(actual.bytes).equals(bytes)) refuse();
      }
      if (lastCommittedDraft !== null) {
        const draft = readFrozen(FROZEN_DRAFT_PATH);
        if (records.get(FROZEN_DRAFT_PATH)?.sha256 !== lastCommittedDraft
          || ledger.artifactOrigins('author', FROZEN_DRAFT_PATH, draft.bytes) === null) refuse();
      }
      for (const feedback of products) {
        if (feedback.role !== 'author' || !AUTHOR_FEEDBACK.test(feedback.path)) continue;
        const stored = readFrozen(feedback.path);
        if (records.get(feedback.path)?.sha256 !== feedback.sha256
          || ledger.artifactOrigins('author', feedback.path, stored.bytes) === null) refuse();
      }
      for (const [packet, receipt] of packetReceipts) {
        const digest = packet.slice('fidelity:'.length);
        if (packet !== `fidelity:${digest}` || !hex(digest)) refuse();
        const directory = `reviews/fidelity-packet-${digest}`, packetPath = `${directory}/packet.json`;
        const stored = readFrozen(packetPath);
        if (records.get(packetPath)?.sha256 !== digest) refuse();
        ledger.origins(receipt, stored.bytes);
        const digestFile = readFrozen(`${directory}/packet.sha256`);
        if (!Buffer.from(digestFile.bytes).equals(Buffer.from(`${digest}  packet.json\n`))) refuse();
      }
      const files = [...records.keys()].sort();
      if (files.length > limits.registrations) refuse();
      productPopulation(run, files, check);
      for (const [file, snapshot] of observed) assertProductFileUnchanged(run, file, snapshot, check);
      const artifacts = ledger.captureArtifactBindings().map(binding => {
        const directory = directories.get(binding.role)!;
        const snapshot = snapshotProductFile(directory, binding.path, Math.min(limits.itemBytes, limits.readBytes - totalBytes), check);
        if (snapshot.bytes === null) refuse(); totalBytes += snapshot.bytes.length;
        ledger.origins(binding.receipt, snapshot.bytes);
        return { ...binding, snapshot };
      });
      const provenance = ledger.captureProvenance([...files.map(file => recordReceipts.get(file)!), ...artifacts.map(binding => binding.receipt)]);
      for (const artifact of artifacts) assertProductFileUnchanged(directories.get(artifact.role)!, artifact.path, artifact.snapshot, check);
      return copy({ format: 'polaris-url-frozen-products/2', runId, coreSha256: sha256(coreBytes),
        declarationSha256: sha256(sidecarBytes), records: files.map((file, index) => ({ ...records.get(file)!, origin: provenance.keys[index]! })),
        artifacts: artifacts.map((artifact, index) => ({ role: artifact.role, path: artifact.path, sha256: sha256(artifact.snapshot.bytes!),
          bytes: artifact.snapshot.bytes!.length, origin: provenance.keys[files.length + index]! })), provenance: provenance.graph });
    });
  }
  /** Re-establish only authenticated historical product provenance. This
   * creates fresh ledger receipts and no launch, peer, provider or live proof. */
  async function restoreFrozenProducts(capability: UrlVerifiedRecoveryProducts, waitForSamples: () => Promise<boolean> = async () => true): Promise<UrlRestoredFrozenProducts> {
    live();
    if (initial || sidecarBytes === null || authenticatedRecords.size || pending.size || producersInFlight || activeReads.size) refuse();
    try {
      const recovered = await ledger.restoreFrozenOrigins(capability, { run, coreSha256: sha256(coreBytes), declarationSha256: sha256(sidecarBytes) }, waitForSamples);
      const saved = new Map<string, { bytes: Uint8Array; receipt: UrlOriginReceipt; snapshot: ProductFileSnapshot }>();
      for (const product of recovered.history.records) {
        if (!(await waitForSamples())) refuse(); live();
        const snapshot = snapshotRecord(run, product.path, product.bytes);
        if (snapshot.bytes === null || snapshot.bytes.length !== product.bytes || sha256(snapshot.bytes) !== product.sha256) refuse();
        saved.set(product.path, { bytes: snapshot.bytes, receipt: recovered.receipt(product.path, snapshot.bytes), snapshot });
      }
      const artifactBindings: ArtifactBinding[] = [];
      for (const product of recovered.history.artifacts) {
        if (!(await waitForSamples())) refuse(); live();
        const snapshot = snapshotRecord(directories.get(product.role)!, product.path, product.bytes);
        if (snapshot.bytes === null || snapshot.bytes.length !== product.bytes || sha256(snapshot.bytes) !== product.sha256) refuse();
        artifactBindings.push({ role: product.role, path: product.path, bytes: snapshot.bytes,
          receipt: recovered.receipt(product.path, snapshot.bytes, product.role) });
      }
      const stored = (file: string) => { const value = saved.get(file); if (!value) refuse(); return value; };
      const stagedReports = new Map<string, Report>();
      const stageReport = (role: Role, file: string): void => {
        const { bytes, receipt } = stored(file), value = json(bytes);
        const kind = role === 'author' ? 'draft' : role === 'inventory' ? 'inventory' : `${role}-verdict` as const;
        ledger.validateReport(role, kind, bytes);
        const projection = { ...value }; if (role === 'author') delete projection['discovery'];
        const digest = sha256(bytes), prior = stagedReports.get(`${role}:${digest}`);
        if (prior && prior.receipt !== receipt) refuse();
        stagedReports.set(`${role}:${digest}`, { role, digest, projection: sha256(canonical(projection)), receipt,
          packet: typeof value['packetSha256'] === 'string' ? value['packetSha256'] : null, token: 'recovered-frozen-product', committed: true });
      };
      for (const file of saved.keys()) {
        if (/^drafts\/rev-[0-9]+\.json$/u.test(file) || file === FROZEN_DRAFT_PATH) stageReport('author', file);
        else if (/^inventory\/rev-[0-9]+\.json$/u.test(file)) stageReport('inventory', file);
        else {
          const match = /^reviews\/(fidelity|design)-verdict-[0-9]+\.json$/u.exec(file);
          if (match) stageReport(match[1] as 'fidelity' | 'design', file);
        }
      }
      const stagedChecks: { role: Role; file: string; product: Check | Product }[] = [];
      for (const [file, value] of saved) {
        const author = /^checks\/rev-([0-9]+)\.json$/u.exec(file), inventory = /^inventory\/checks\/rev-([0-9]+)\.json$/u.exec(file);
        const review = /^reviews\/checks\/(fidelity|design)-verdict-([0-9]+)\.json$/u.exec(file);
        if (!author && !inventory && !review) continue;
        const role: Role = author ? 'author' : inventory ? 'inventory' : review![1] as 'fidelity' | 'design';
        const doc = json(value.bytes), number = Number(author?.[1] ?? inventory?.[1] ?? review![2]);
        if (!integer(number) || (role === 'author' || role === 'inventory' ? !checkShape(doc, role === 'author' ? 'check' : 'inventory-check', false)
          || doc['revision'] !== number : !reviewShape(doc, role, false) || doc['number'] !== number)) refuse();
        const subject = record(doc[author ? 'draft' : inventory ? 'inventory' : 'verdict']);
        const expectedFile = author ? `drafts/rev-${number}.json` : inventory ? `inventory/rev-${number}.json` : `reviews/${role}-verdict-${number}.json`;
        const report = stored(expectedFile), submitted = stagedReports.get(`${role}:${sha256(report.bytes)}`);
        if (!submitted || subject['file'] !== expectedFile || subject['sha256'] !== submitted.digest || subject['bytes'] !== report.bytes.length
          || submitted.receipt !== report.receipt || (review && (subject['packetSha256Named'] !== submitted.packet
            || (doc['outcome'] === 'validated' && record(doc['session'])['sessionId'] !== plans.get(role)!.profile.input.sessionId)))) refuse();
        const product = { path: file, digest: sha256(value.bytes), receipt: value.receipt, committed: true,
          ...(author ? { revision: number, token: 'recovered-frozen-product' } : {}) };
        stagedChecks.push({ role, file, product });
      }
      const briefRecord = json(stored('brief.json').bytes);
      const sessions = (['inventory', 'fidelity', 'design'] as const).map(role => {
        const file = role === 'inventory' ? 'inventory/session-1.json' : `reviews/${role}-session-1.json`, prompt = json(stored(file).bytes);
        if (!text(prompt['prompt']) || !hex(prompt['promptSha256'])) refuse();
        return { role: role === 'inventory' ? 'inventory' : 'review', ...(role === 'inventory' ? {} : { kind: role }),
          session: 1, directory: directories.get(role)!, prompt: prompt['prompt'], promptSha256: prompt['promptSha256'] };
      });
      // Reconstruct only the producer reports' exact identity fields from the
      // authenticated records. No producer-success JSON is accepted as proof.
      if (!text(briefRecord['issuedAt'])) refuse();
      initialProducts({ brief: { command: 'brief', outcome: 'issued', run, pinnedRevision: pin,
        brief: path.join(run, 'brief.md'), draftSchema: path.join(run, 'draft.schema.json'), issuedAt: briefRecord['issuedAt'],
        executionRule: { arm: 'sec-3' } },
        sessions: { command: 'session-prompt', outcome: 'issued', role: 'all', run, sessions } });
      for (const [key, value] of stagedReports) reports.set(key, value);
      for (const [file, value] of saved) {
        if (knownRecord(file)) authenticatedRecords.set(file, prepareRecord(file, value.bytes, value.receipt, () => initial, value.snapshot));
        const packet = PACKET_PATH.exec(file);
        if (packet?.[2] === 'packet.json') {
          const digest = packet[1]!.slice('fidelity-packet-'.length);
          if (sha256(value.bytes) !== digest) refuse(); packetReceipts.set(`fidelity:${digest}`, value.receipt);
        }
      }
      for (const item of stagedChecks) {
        checkedProducts.set(`${item.file}:${item.product.digest}`, item.product);
        if (item.role === 'author') checks.set((item.product as Check).revision, item.product as Check);
      }
      bindAll(artifactBindings);
      const draft = saved.get(FROZEN_DRAFT_PATH); lastCommittedDraft = draft === undefined ? null : sha256(draft.bytes);
      // Reuse the packet validator with the exact retained role files, checked
      // subjects and freshly re-observed source spans. No delivery is started.
      for (const file of saved.keys()) {
        const match = /^reviews\/fidelity-session-1\.delivery-([0-9]+)\.json$/u.exec(file);
        if (match) {
          const delivery = json(stored(file).bytes), digest = delivery['packetSha256']; if (!hex(digest)) refuse();
          await packet({ kind: 'fidelity', round: Number(match[1]), packetSha256: digest }, waitForSamples);
        }
      }
      // Every sealed subject has been restored explicitly, including design
      // check/verdict pairs whose old terminal was verified by the caller's
      // cold audit. No old ordered review proof is issued here.
      latestStageChecksAfterRestore();
      for (const [file, value] of saved) assertProductFileUnchanged(run, file, value.snapshot, live);
      if (!(await waitForSamples())) refuse(); live();
      recovered.revalidate();
      return copy({ artifacts: products, initial: { briefIssuedAt: briefRecord['issuedAt'], deadline: recovered.deadline,
        helperPromptDigests: { inventory: sessions[0]!.promptSha256, fidelity: sessions[1]!.promptSha256, design: sessions[2]!.promptSha256 } } });
    } catch { recoveryFailed = true; return refuse(); }
  }
  function latestStageChecksAfterRestore(): void { stageChecks(ROLES); }
  return Object.freeze({
    restoreFrozenProducts,
    beginRead, readProduct, readProducts, selectProducts, selectProductGroups, revalidateRead, openDesignArtifact, captureFrozenHistory,
    latestStageCheck: (role: Role) => stageChecks([role])[role],
    latestStageChecks: () => stageChecks(ROLES),
    isReadLeaseOpen: (context: UrlProductReadContext): boolean => {
      const state = readContexts.get(context);
      if (state === undefined) return false;
      try { readLease(state); return true; } catch { return false; }
    },
    cancelRead: (context: UrlProductReadContext): void => { const state = readContexts.get(context); if (!state) refuse(); closeRead(state); },
    registerInitial: (input: Parameters<typeof initialProducts>[0]) => { try { return initialProducts(input); } catch { return refuse(); } },
    registerLaunchHistory: (...args: Parameters<typeof registerLaunchHistory>) => duringProducer(async () => {
      try { await registerLaunchHistory(...args); } catch { return refuse(); }
    }),
    registerPacket: (input: FidelityPacketRegistration, waitForSamples?: () => Promise<boolean>) => duringProducer(async () => {
      try { return await packet(input, waitForSamples); } catch { return refuse(); }
    }),
    registerFeedback: (input: Parameters<typeof feedback>[0]) => { try { return feedback(input); } catch { return refuse(); } },
    runDossier: runner,
    stageOrderedDesignVerdict: (...args: Parameters<typeof stageOrderedDesignVerdict>) => duringProducer(() => stageOrderedDesignVerdict(...args)),
    commitOrderedDesignVerdict,
    artifactOrigins: (role: Role) => { roleOf(role); return (file: string, bytes: Uint8Array): SessionToolOrigins | null => {
      try { roleOf(role); if (!initial) return null; return ledger.artifactOrigins(role, file, bytes); } catch { return null; } }; },
    dossierOrigins: (role: Role) => { roleOf(role); return (argv: readonly string[], response: BrokerResponse): SessionToolOrigins | null => {
      try { const found = pending.get(role); if (!found || canonical(normalize(argv, role)) !== found.argv || sha256(canonical(response)) !== found.digest) return null;
        return ledger.origins(found.receipt, asBytes(response)); } catch { return null; } }; },
    toolReceipt: (...args: Parameters<typeof toolReceipt>) => duringProducer(() => toolReceipt(...args)),
    committed: (role: Role, id: string): void => { roleOf(role); const found = uncommitted.get(id); if (!found || found.role !== role) refuse();
      if (found.designVerdict) {
        const { number, checkSha256, verdictSha256 } = found.designVerdict;
        const name = `design-verdict-${number}.json`;
        for (const { file, digest } of [{ file: `reviews/checks/${name}`, digest: checkSha256 },
          { file: `reviews/${name}`, digest: verdictSha256 }]) {
          const expected = authenticatedRecords.get(file), snapshot = snapshotRecord(run, file, limits.itemBytes);
          if (!expected || snapshot.bytes === null || !sameProductFile(expected.snapshot, snapshot) || sha256(snapshot.bytes) !== digest) refuse();
        }
      }
      if (found.designRead) designReads.set(id, found.designRead);
      if (found.draftWriteSha256 !== undefined) lastCommittedDraft = found.draftWriteSha256;
      for (const report of found.reports) report.committed = true; for (const check of found.checks) check.committed = true;
      for (const product of found.products) product.committed = true; uncommitted.delete(id); },
    hasCommittedReport: (role: Role, digest: string): boolean => { try { roleOf(role); return hex(digest) && reports.get(`${role}:${digest}`)?.committed === true; } catch { return false; } },
    hasCommittedCheck: (revision: number, digest?: string): boolean => { try { live(); const found = checks.get(revision);
      return integer(revision) && found?.committed === true && (digest === undefined || found.digest === digest); } catch { return false; } },
    hasCommittedProduct: (file: string, digest: string): boolean => { try { live(); return relative(file) && hex(digest) && checkedProducts.get(`${file}:${digest}`)?.committed === true; } catch { return false; } },
    reportReceipt: (role: Role, digest: string): UrlOriginReceipt => { roleOf(role); const found = reports.get(`${role}:${digest}`); if (!found?.committed) refuse(); return found.receipt; },
    checkReceipt: (revision: number): UrlOriginReceipt => { live(); const found = checks.get(revision); if (!found?.committed) refuse(); return found.receipt; },
    metadata: () => { live(); return copy({ initialRegistered: initial, artifacts: products, readBytes, registrations, pendingToolAudits: uncommitted.size,
      reports: [...reports.values()].map(r => ({ role: r.role, sha256: r.digest, committed: r.committed })),
      checks: [...checks.values()].map(c => ({ revision: c.revision, sha256: c.digest, committed: c.committed })),
      products: [...checkedProducts.values()].map(p => ({ path: p.path, sha256: p.digest, committed: p.committed })),
      pendingQuestions: questions.size, sameUidProducerReadRace: 'Unknown', bodiesPersisted: false }); },
  });
}
