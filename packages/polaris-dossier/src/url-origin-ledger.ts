import { takeUrlRecoveryProducts, type UrlVerifiedRecoveryProducts } from './url-recovery-products.js';
import { fingerprintUrlOriginProvenance } from './url-frozen-product-history.js';
import type { UrlOriginDerivation, UrlOriginProvenance, UrlOriginProvenanceNode, UrlOriginMetadata, UrlReportKind } from './url-origin-provenance.js';
import path from 'node:path';
import { setImmediate as yieldToPoll } from 'node:timers/promises';
import { encodeCanonicalJson, PAGE_SINK_CONTRACT, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { deepFreeze, isRecord, sha256 } from '@syzygy/support';
import { bindUrlSourceReader, isUrlWholeSourcePath, type UrlSourceStore } from './url-source-reader.js';
import { urlDossierReportExit } from './url-dossier-result.js';
import { encodeRunRecord, readRunRecord, sourceBindingSha256, type RecordedRunConfig } from './run-record.js';
import type { PolicyBinding } from './policy-snapshot.js';
import { deriveManifestRemainder, type ManifestRemainder } from './manifest-facts.js';
import type { DossierScreen } from './screen.js';
import type { SessionAdmission, SessionBinding, SessionContentClass } from './session-egress-policy.js';
import type { SessionToolsReceipt, SessionToolOrigins } from './session-tools.js';
import type { UrlPlannedOrigin } from './url-run-record.js';
import { isLoadedUrlRenderer, urlRendererCurrent, type UrlLoadedRenderer } from './url-runtime.js';

const JSON_LIMITS = { maxBytes: 2_097_152, maxNodes: 65_536, maxDepth: 32 } as const;
export const URL_ORIGIN_LEDGER_LIMITS = Object.freeze({ receipts: 1024, bytes: 8_388_608, artifactBindings: 1024, parents: 128, itemBytes: 1_048_576, readMilliseconds: 5000 });
type Limits = { readonly [K in keyof typeof URL_ORIGIN_LEDGER_LIMITS]: number };
type Role = 'author' | 'inventory' | 'fidelity' | 'design';
export type UrlRootOriginKind = 'policy' | 'schema' | 'structure' | 'run-control';
export type { UrlOriginMetadata, UrlReportKind } from './url-origin-provenance.js';
declare const receiptBrand: unique symbol;
/** An in-memory capability, never a serialized provenance assertion. */
export interface UrlOriginReceipt { readonly [receiptBrand]: true }
declare const wholeBodyBrand: unique symbol;
/** Host-only proof of a complete exact pinned body, never a source-span assertion. */
export interface UrlWholeSourceBody { readonly [wholeBodyBrand]: true }
export interface UrlWholeSourceBodyMetadata {
  readonly origin: UrlOriginReceipt; readonly runId: string; readonly sourceBindingSha256: string;
  readonly path: string; readonly objectId: string; readonly pinnedCommit: string;
  readonly policies: { readonly baseSha256: string; readonly originSha256: string };
  readonly range: { readonly start: 0; readonly end: number };
  readonly digest: string; readonly bytes: number; readonly classes: readonly SessionContentClass[];
}
export interface UrlOriginLedgerOptions {
  readonly runId: string; readonly record: RecordedRunConfig; readonly screen: DossierScreen;
  readonly basePolicyBytes: Uint8Array;
  readonly originPolicy: { readonly binding: PolicyBinding; readonly bytes: Uint8Array };
  /** Trusted host checks the committed policies, exact run/pin and deadline. Not a role callback. */
  readonly current: () => boolean;
  /** Pre-existing vetted host registry. Never populate it from an observed CLI/provider payload. */
  readonly fixed: readonly { readonly id: string; readonly kind: UrlRootOriginKind; readonly bytes: Uint8Array }[];
  /** Host schema validators own packet/role/output identities; true is not a truth/coverage verdict. */
  readonly schemas: Readonly<Partial<Record<UrlReportKind, (value: unknown, role: Role) => boolean>>>;
  readonly limits?: Partial<Limits>;
  readonly sourceStore?: UrlSourceStore;
}
const ROLES: readonly Role[] = ['author', 'inventory', 'fidelity', 'design'];
const CLASSES: readonly SessionContentClass[] = ['governance-text', 'code-structure', 'code-content', 'project-documentation', 'work-history', 'evidence-content', 'derived-composites'];
const ROOTS = { policy: ['fixed-role-policy-and-cli-scaffold', 'governance-text'], schema: ['fixed-role-policy-and-cli-scaffold', 'governance-text'],
  structure: ['structural-source-and-tool-metadata', 'code-structure'], 'run-control': ['typed-run-control-and-clarification', 'work-history'] } as const;
const REPORT_ROLES = { draft: 'author', inventory: 'inventory', 'fidelity-verdict': 'fidelity', 'design-verdict': 'design', check: 'author' } as const;
const canonical = (value: unknown): string => encodeCanonicalJson(value, JSON_LIMITS);
const copy = <T>(value: T): T => deepFreeze(parseBoundedJson(canonical(value), JSON_LIMITS)) as T;
const union = <T extends string>(values: readonly (readonly T[])[]): T[] => [...new Set(values.flat())].sort();
function fail(): never { throw new Error('url-origin-refused'); }
function guarded<T>(work: () => T): T { try { return work(); } catch { return fail(); } }
const hex = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
const id = (value: unknown): value is string => typeof value === 'string' && /^origin:[a-z0-9][a-z0-9._-]{0,127}$/u.test(value);
const relative = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && Buffer.byteLength(value) <= 4096
  && !/[\\\u0000-\u0020\u007f]/u.test(value) && !value.startsWith('/') && value.split('/').every(part => part !== '.' && part !== '..' && part !== '');
const exact = (value: unknown, keys: readonly string[]): value is Record<string, unknown> => isRecord(value)
  && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
interface Entry extends UrlOriginMetadata { readonly receipt: UrlOriginReceipt }

/** Host-owned working-memory provenance. This module neither persists bodies nor grants a provider route.
 * Opaque receipt authenticity covers this ledger's issuance only. Root registry/schema/current ports
 * remain trusted composition inputs and must never be exposed as a role API or read from run files. */
export function createUrlOriginLedger(given: UrlOriginLedgerOptions) {
  try { return create(given); } catch { return fail(); }
}
function create(given: UrlOriginLedgerOptions) {
  if (!isRecord(given) || Object.keys(given).some(key => !['runId', 'record', 'screen', 'basePolicyBytes', 'originPolicy', 'current', 'fixed', 'schemas', 'limits', 'sourceStore'].includes(key))) fail();
  const limits: Limits = Object.freeze({ ...URL_ORIGIN_LEDGER_LIMITS, ...given.limits });
  if (Object.keys(limits).length !== Object.keys(URL_ORIGIN_LEDGER_LIMITS).length || Object.entries(limits).some(([key, n]) => !Object.hasOwn(URL_ORIGIN_LEDGER_LIMITS, key)
    || !Number.isSafeInteger(n) || n < 1 || n > URL_ORIGIN_LEDGER_LIMITS[key as keyof Limits]) || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(given.runId)
    || typeof given.current !== 'function' || given.current() !== true || !Array.isArray(given.fixed) || given.fixed.length > limits.receipts || !isRecord(given.schemas)) fail();
  const runId = given.runId;
  const record = copy(given.record), screen = Object.freeze({ ...given.screen }), current = given.current, schemas = Object.freeze({ ...given.schemas });
  const parsed = readRunRecord(encodeRunRecord(record.declared, record.subject));
  if (!parsed.ok || canonical(parsed.record) !== canonical(record) || !path.isAbsolute(record.subject.clone.path)
    || path.resolve(record.subject.clone.path) !== record.subject.clone.path || screen.policySha256 !== record.subject.screeningPolicy.sha256
    || screen.visibility !== record.subject.visibility.value || !(given.basePolicyBytes instanceof Uint8Array) || given.basePolicyBytes.length > JSON_LIMITS.maxBytes || sha256(given.basePolicyBytes) !== screen.policySha256
    || Object.entries(schemas).some(([kind, validator]) => !Object.hasOwn(REPORT_ROLES, kind) || typeof validator !== 'function')) fail();
  const readerOptions = { gitDir: path.join(record.subject.clone.path, '.git'), revision: record.subject.pinnedRevision.commit };
  let reader: ReturnType<typeof bindUrlSourceReader> | undefined;
  const store = given.sourceStore ?? 'owned-loose';
  if (store !== 'owned-loose' && store !== 'supplied') fail();
  const openReader = () => {
    reader ??= bindUrlSourceReader({ clone: record.subject.clone.path, revision: readerOptions.revision,
      store, current, objectBytes: limits.itemBytes });
    return reader(readerOptions);
  };
  const origin = copy(given.originPolicy.binding), originBytes = snapshot(given.originPolicy.bytes, JSON_LIMITS.maxBytes);
  const policy = parseBoundedJson(decode(originBytes), JSON_LIMITS);
  if (!exact(given.originPolicy, ['binding', 'bytes']) || !exact(origin, ['path', 'commit', 'policyId', 'policyVersion', 'sha256'])
    || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(origin.commit) || origin.path !== '.syzygy/governance/policies/POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1.json'
    || origin.policyId !== 'POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1' || origin.policyVersion !== '1.0.0'
    || sha256(originBytes) !== origin.sha256 || !isRecord(policy) || policy['policyId'] !== origin.policyId || policy['policyVersion'] !== origin.policyVersion
    || policy['schemaVersion'] !== 1 || policy['observingProject'] !== 'project:syzygy') fail();
  const classification = policy['classification'];
  const entries = new WeakMap<UrlOriginReceipt, Entry>(), artifacts = new Map<string, Entry>(), plans: UrlPlannedOrigin[] = [];
  const wholeBodies = new WeakMap<UrlWholeSourceBody, UrlWholeSourceBodyMetadata>(), wholeIdentities = new Map<string, UrlWholeSourceBody>();
  const issuedById = new Map<string, UrlOriginReceipt>();
  const registry = new Map<string, { readonly kind: UrlRootOriginKind; readonly digest: string; readonly bytes: number }>();
  const lineage = new WeakMap<UrlOriginReceipt, { key: string; parents: readonly UrlOriginReceipt[]; derivation: UrlOriginDerivation | null; historical?: { readonly graph: UrlOriginProvenance; readonly key: string } }>();
  let count = 0, storedBytes = 0;
  const live = (): void => { if (current() !== true) fail(); };
  function snapshot(bytes: Uint8Array, maximum = limits.itemBytes): Uint8Array {
    if (!(bytes instanceof Uint8Array) || bytes.length > maximum) fail(); return Uint8Array.from(bytes);
  }
  function decode(bytes: Uint8Array): string { const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); if (/\u0000/u.test(text)) fail(); return text; }
  function safe(bytes: Uint8Array, sourcePath?: string): string {
    const text = decode(bytes);
    if (screen.screenSecrets(text) !== undefined || screen.screenBody(text, sourcePath) !== undefined) fail();
    if (sourcePath === undefined && /^\s*[\[{]/u.test(text)) {
      const parsed: unknown = parseBoundedJson(text, JSON_LIMITS), fields: string[] = [], values: string[] = [];
      const visit = (value: unknown): void => {
        if (typeof value === 'string') { if (screen.screenBody(value) !== undefined) fail(); fields.push(value); values.push(value); }
        else if (Array.isArray(value)) for (const child of value) visit(child);
        else if (isRecord(value)) for (const [key, child] of Object.entries(value)) { if (screen.screenBody(key) !== undefined) fail(); fields.push(key); visit(child); }
      };
      visit(parsed); if (screen.screenBody(fields.join('')) !== undefined || screen.screenBody(values.join('')) !== undefined) fail();
    }
    return text;
  }
  function lookup(receipt: UrlOriginReceipt): Entry { const value = entries.get(receipt); if (!value) return fail(); return value; }
  function entry(receipt: UrlOriginReceipt): Entry { live(); return lookup(receipt); }
  function parents(receipts: readonly UrlOriginReceipt[]): Entry[] {
    if (!Array.isArray(receipts) || receipts.length === 0 || receipts.length > limits.parents || new Set(receipts).size !== receipts.length) fail();
    // The derived operation checks current authority before reading the
    // private entries and again at issuance after screening and validation.
    return receipts.map(lookup);
  }
  function issue(bytes: Uint8Array, classes: readonly SessionContentClass[], originIds: readonly string[], plan?: { readonly id: string; readonly species: UrlPlannedOrigin['species'] },
    provenance?: { readonly parents: readonly UrlOriginReceipt[]; readonly derivation: UrlOriginDerivation }): UrlOriginReceipt {
    live(); if (bytes.length > limits.itemBytes) fail(); if (++count > limits.receipts || (storedBytes += bytes.length) > limits.bytes) fail();
    const receipt = Object.freeze({}) as UrlOriginReceipt;
    const receiptId = plan?.id ?? `origin:item-${sha256(canonical([runId, count, sha256(bytes)])).slice(0, 32)}`;
    const value: Entry = deepFreeze({ receipt, id: receiptId, digest: sha256(bytes), bytes: bytes.length, classes: union([classes]), originIds: union([originIds]) });
    if (plan) {
      const declaration = copy({ id: receiptId, species: plan.species, sha256: value.digest, classes: value.classes, originIds: value.originIds });
      const existing = plans.find(prior => prior.id === receiptId);
      if (existing && canonical(existing) !== canonical(declaration)) fail();
      if (!existing) plans.push(declaration);
    }
    entries.set(receipt, value); issuedById.set(value.id, receipt);
    lineage.set(receipt, { key: `node-${count}`, parents: provenance?.parents ?? [], derivation: provenance?.derivation ?? null });
    return receipt;
  }
  const references = (value: Entry): readonly string[] => plans.some(plan => plan.id === value.id) ? [value.id] : value.originIds;
  function inheritedOrigins(inherited: readonly Entry[], reportKind?: UrlReportKind): Pick<SessionToolOrigins, 'classes' | 'originIds'> {
    const outputClass = reportKind === undefined || reportKind === 'draft' ? 'derived-composites' : 'evidence-content';
    return { classes: union([inherited.flatMap(value => value.classes), [outputClass]]), originIds: union(inherited.map(references)) };
  }
  function derived(bytes: Uint8Array, givenParents: readonly UrlOriginReceipt[], reportKind?: UrlReportKind, role?: Role, declaration = true): UrlOriginReceipt {
    live(); const b = snapshot(bytes), inherited = parents(givenParents); const text = safe(b);
    if (reportKind !== undefined) {
      if (!Object.hasOwn(REPORT_ROLES, reportKind) || role !== REPORT_ROLES[reportKind] || typeof schemas[reportKind] !== 'function'
        || schemas[reportKind]!(parseBoundedJson(text, JSON_LIMITS), role) !== true) fail();
    }
    const { classes, originIds } = inheritedOrigins(inherited, reportKind);
    const nextId = `origin:item-${sha256(canonical([runId, count + 1, sha256(b)])).slice(0, 32)}`;
    return issue(b, classes, originIds, declaration && originIds.every(parent => plans.some(plan => plan.id === parent)) ? { id: nextId, species: reportKind === undefined || reportKind === 'draft' ? 'composed-role-input-or-broker-result' : 'role-report-or-verdict' } : undefined, { parents: givenParents,
      derivation: reportKind === undefined ? { kind: 'composition' } : { kind: 'report', report: reportKind, role: role! } });
  }
  const fixedReceipts = new Map<string, UrlOriginReceipt>();
  for (const fixed of given.fixed) {
    if (!exact(fixed, ['id', 'kind', 'bytes']) || !id(fixed.id) || registry.has(fixed.id) || typeof fixed.kind !== 'string' || !Object.hasOwn(ROOTS, fixed.kind)) fail();
    const bytes = snapshot(fixed.bytes as Uint8Array); safe(bytes); const kind = fixed.kind as UrlRootOriginKind;
    registry.set(fixed.id, { kind, digest: sha256(bytes), bytes: bytes.length });
    // Root entries have no parents; their own id is returned by origins(), not a self-edge in plannedOrigins.
    fixedReceipts.set(fixed.id, issue(bytes, [ROOTS[kind][1]], [], { id: fixed.id, species: ROOTS[kind][0] }, { parents: [], derivation: { kind: 'fixed', id: fixed.id } }));
  }
  async function planRendererScaffold(renderer: UrlLoadedRenderer): Promise<UrlOriginReceipt> {
    const species = 'authenticated-local-renderer-design-product-and-inert-view';
    if (!isRecord(classification) || !Array.isArray(classification['species'])
      || classification['species'].filter(item => isRecord(item) && item['species'] === species).length !== 1
      || !isLoadedUrlRenderer(renderer) || renderer.renderer.pageSinkContract !== PAGE_SINK_CONTRACT
      || !(await urlRendererCurrent(renderer))) return fail();
    live();
    const bytes = Buffer.from(canonical({ format: 'polaris-url-renderer-scaffold/1', renderer: renderer.identity,
      sink: PAGE_SINK_CONTRACT }));
    safe(bytes);
    return issue(bytes, ['code-content'], [], { id: 'origin:renderer-scaffold', species }, { parents: [], derivation: { kind: 'renderer' } });
  }
  const screenedMetadata = new WeakMap<Entry, UrlOriginMetadata>();
  const metadataOf = (entry: Entry): UrlOriginMetadata => {
    const previous = screenedMetadata.get(entry);
    if (previous !== undefined) return previous;
    // The ledger owns and freezes entries and the bound screen. A new read
    // still checks authority, and supplied subject bytes still hash to the receipt.
    const { receipt: _receipt, ...value } = entry;
    safe(Buffer.from(canonical(value)));
    const screened = copy(value);
    screenedMetadata.set(entry, screened);
    return screened;
  };
  const metadata = (receipt: UrlOriginReceipt): UrlOriginMetadata => metadataOf(entry(receipt));
  function assertSubject(value: Entry, bytes: Uint8Array): void {
    const subject = snapshot(bytes);
    if (subject.length !== value.bytes || sha256(subject) !== value.digest) fail();
  }
  /** This read-only batch issues nothing. Each receipt and optional exact
   * subject is verified before a final live authority check releases metadata. */
  function inspectMetadata(requests: readonly { readonly receipt: UrlOriginReceipt; readonly bytes?: Uint8Array }[]): readonly UrlOriginMetadata[] {
    live();
    if (requests.length > limits.artifactBindings + limits.parents) return fail();
    const result = requests.map(({ receipt, bytes }) => {
      const value = lookup(receipt);
      if (bytes !== undefined) assertSubject(value, bytes);
      return metadataOf(value);
    });
    live();
    return result;
  }
  function verifySubjects(requests: readonly { readonly receipt: UrlOriginReceipt; readonly bytes: Uint8Array }[]): void {
    live();
    if (requests.length > limits.artifactBindings + limits.parents) fail();
    for (const { receipt, bytes } of requests) assertSubject(lookup(receipt), bytes);
    live();
  }
  const origins = (receipt: UrlOriginReceipt, bytes: Uint8Array): SessionToolOrigins => {
    const value = entry(receipt); assertSubject(value, bytes);
    return copy({ digest: value.digest, classes: value.classes, originIds: references(value) });
  };
  type ArtifactBinding = { readonly role: Role; readonly path: string; readonly bytes: Uint8Array; readonly receipt: UrlOriginReceipt };
  function bindArtifacts(inputs: readonly ArtifactBinding[]): void {
    live();
    if (!Array.isArray(inputs as unknown) || inputs.length < 1 || inputs.length > limits.artifactBindings) fail();
    const staged = new Map<string, Entry>();
    let added = 0;
    for (const input of inputs) {
      if (!exact(input, ['role', 'path', 'bytes', 'receipt']) || !ROLES.includes(input.role) || !relative(input.path)) fail();
      // Validate the captured subject against its immutable receipt inside
      // the batch's authority checks. Publication follows the final check.
      const value = lookup(input.receipt), bytes = snapshot(input.bytes);
      safe(bytes);
      if (bytes.length !== value.bytes || sha256(bytes) !== value.digest) fail();
      const key = `${input.role}:${input.path}`;
      if (staged.has(key)) fail();
      if (!artifacts.has(key)) added++;
      staged.set(key, value);
    }
    if (artifacts.size + added > limits.artifactBindings) fail();
    live();
    for (const [key, value] of staged) artifacts.set(key, value);
  }
  const bindArtifact = (input: ArtifactBinding): void => bindArtifacts([input]);
  const artifactOrigins = (role: Role, file: string, bytes: Uint8Array): SessionToolOrigins | null => {
    try { live(); if (!ROLES.includes(role) || !relative(file)) return null; const value = artifacts.get(`${role}:${file}`); return value ? origins(value.receipt, bytes) : null; }
    catch { return null; }
  };
  // A wait deadline is not cancellation of filesystem IO; only the bounded read
  // result can reach issuance. A late reader cannot register a receipt or binding.
  async function sourceOperation<T>(work: (check: () => void) => Promise<T>): Promise<T> {
    let active = true, timer: ReturnType<typeof setTimeout> | undefined;
    const began = performance.now();
    const check = (): void => { live(); if (!active || performance.now() - began >= limits.readMilliseconds) fail(); };
    try {
      return await Promise.race([Promise.resolve().then(() => work(check)), new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => { active = false; reject(new Error('url-origin-refused')); }, limits.readMilliseconds);
      })]);
    } finally { active = false; clearTimeout(timer); }
  }
  function safeSourceReply(bytes: Uint8Array): void {
    const text = decode(bytes), reply = parseBoundedJson(text, JSON_LIMITS), fields: string[] = [], values: string[] = [];
    const visit = (value: unknown, source = false): void => {
      if (typeof value === 'string') {
        if (screen.screenSecrets(value) !== undefined || (!source && screen.screenBody(value) !== undefined)) fail();
        fields.push(value); values.push(value);
      } else if (Array.isArray(value)) for (const item of value) visit(item);
      else if (isRecord(value)) for (const [key, item] of Object.entries(value)) { fields.push(key); visit(item, key === 'text'); }
    };
    visit(reply);
    if (screen.screenSecrets(text) !== undefined || screen.screenSecrets(fields.join('')) !== undefined || screen.screenSecrets(values.join('')) !== undefined) fail();
  }
  async function verifiedSource(file: string, check: () => void) {
    check(); if (!isUrlWholeSourcePath(file) || screen.screenPath(file) !== undefined) fail();
    const contentClass = screen.contentClass(file);
    if (!contentClass || !['code-content', 'governance-text', 'project-documentation'].includes(contentClass)) fail();
    const reader = openReader();
    const blob = (await reader.readBlobs([file]))[0]; check();
    if (!blob || blob.path !== file || !['100644', '100755'].includes(blob.mode)) fail();
    const bytes = snapshot(blob.bytes), raw = decode(bytes), treatment = screen.screenTargetBody(raw, file);
    // Neither a span nor complete coverage can authenticate a redacted body under its original identity.
    if (treatment.kind !== 'admitted') fail(); safe(bytes, file); check();
    return { objectId: blob.id, bytes, raw, contentClass };
  }
  async function verifiedManifestRemainder(check: () => void): Promise<Buffer> {
    check();
    const entries = await openReader().listTree();
    check();
    // Reuse the check's bounded path-only projection. Neither the raw tree
    // listing nor a blob identifier or body enters this receipt's subject.
    const bytes = Buffer.from(canonical(deriveManifestRemainder(entries, screen)));
    if (bytes.length > limits.itemBytes) fail();
    safe(bytes);
    check();
    return bytes;
  }
  const manifestRemainderOriginId = (digest: string) =>
    `origin:manifest-remainder-${sha256(canonical([readerOptions.revision, screen.policySha256, digest])).slice(0, 32)}`;
  async function sourceManifestRemainder(remainder: ManifestRemainder): Promise<UrlOriginReceipt> {
    try {
      live();
      const supplied = Buffer.from(canonical(remainder));
      return await sourceOperation(async check => {
        const bytes = await verifiedManifestRemainder(check);
        if (!bytes.equals(supplied)) fail();
        const id = manifestRemainderOriginId(sha256(bytes));
        check();
        return issuedById.get(id) ?? issue(bytes, ['code-structure'], [], { id, species: 'structural-source-and-tool-metadata' },
          { parents: [], derivation: { kind: 'source-manifest-remainder' } });
      });
    } catch { return fail(); }
  }
  function issueWholeSourceBody(file: string, body: Awaited<ReturnType<typeof verifiedSource>>, check: () => void): UrlWholeSourceBody {
    const { objectId } = body;
    const digest = sha256(body.bytes), identity = canonical([file, objectId, digest]); check();
    // Reuse only after a fresh independent reread; an earlier capability cannot hide later object corruption.
    const prior = wholeIdentities.get(identity); if (prior) return prior;
    const bodyId = `origin:whole-body-${sha256(identity).slice(0, 32)}`;
    const structuralBytes = Buffer.from(canonical({ commit: record.subject.pinnedRevision.commit, path: file, objectId, start: 0, end: body.bytes.length }));
    safe(structuralBytes); check();
    const structureId = `origin:whole-structure-${sha256(structuralBytes).slice(0, 32)}`;
    issue(body.bytes, [body.contentClass], [], { id: bodyId, species: 'pinned-repository-body' }); check();
    issue(structuralBytes, ['code-structure'], [], { id: structureId, species: 'structural-source-and-tool-metadata' }); check();
    const receipt = issue(body.bytes, [body.contentClass, 'code-structure'], [bodyId, structureId], undefined,
      { parents: [], derivation: { kind: 'source-whole', path: file, objectId } });
    const metadata: UrlWholeSourceBodyMetadata = deepFreeze({ origin: receipt, runId, sourceBindingSha256: sourceBindingSha256(record.subject),
      path: file, objectId, pinnedCommit: record.subject.pinnedRevision.commit, policies: { baseSha256: screen.policySha256, originSha256: origin.sha256 },
      range: { start: 0, end: body.bytes.length }, digest, bytes: body.bytes.length, classes: entry(receipt).classes });
    check(); const capability = Object.freeze({}) as UrlWholeSourceBody;
    wholeBodies.set(capability, metadata); wholeIdentities.set(identity, capability); return capability;
  }
  async function verifyWholeSourceBody(input: { readonly path: string; readonly objectId: string; readonly bytes: Uint8Array }): Promise<UrlWholeSourceBody> {
    try {
      live(); if (!exact(input, ['path', 'objectId', 'bytes']) || !isUrlWholeSourcePath(input.path) || typeof input.objectId !== 'string'
        || input.objectId.length !== record.subject.pinnedRevision.commit.length || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(input.objectId)) fail();
      const file = input.path, objectId = input.objectId, supplied = snapshot(input.bytes);
      return await sourceOperation(async check => {
        const body = await verifiedSource(file, check);
        if (body.objectId !== objectId || !Buffer.from(supplied).equals(body.bytes)) fail();
        return issueWholeSourceBody(file, body, check);
      });
    } catch { return fail(); }
  }
  function inspectWholeSourceBody(capability: UrlWholeSourceBody): UrlWholeSourceBodyMetadata {
    live(); const value = wholeBodies.get(capability); if (!value) return fail(); entry(value.origin); return value;
  }
  async function verifiedSpan(input: { readonly path: string; readonly offset?: number; readonly limit?: number; readonly expectedObjectId?: string }) {
    try {
      live(); if (!isRecord(input) || Object.keys(input).some(key => !['path', 'offset', 'limit', 'expectedObjectId'].includes(key)) || !relative(input.path)) fail();
      const file = input.path, offset = input.offset ?? 0, limit = input.limit ?? 200, expectedObjectId = input.expectedObjectId;
      if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 2000) fail();
      const { raw, contentClass, objectId } = await sourceOperation(check => verifiedSource(file, check)); live();
      if (expectedObjectId !== undefined && expectedObjectId !== objectId) fail();
      const lines = raw.match(/[^\n]*(?:\n|$)/gu) ?? []; if (lines.at(-1) === '') lines.pop();
      const bytes = Buffer.from(lines.slice(offset, offset + limit).join(''));
      const bodyId = `origin:body-${sha256(canonical([record.subject.pinnedRevision.commit, file, objectId, offset, limit])).slice(0, 32)}`;
      const structureBytes = Buffer.from(canonical({ commit: record.subject.pinnedRevision.commit, path: file, objectId, offset, limit })); safe(structureBytes);
      const structureId = `origin:structure-${sha256(structureBytes).slice(0, 32)}`;
      if (!plans.some(plan => plan.id === bodyId)) {
        issue(bytes, [contentClass], [], { id: bodyId, species: 'pinned-repository-body' });
        issue(structureBytes, ['code-structure'], [], { id: structureId, species: 'structural-source-and-tool-metadata' });
      }
      return { receipt: issue(bytes, [contentClass, 'code-structure'], [bodyId, structureId], undefined,
        { parents: [], derivation: { kind: 'source-span', path: file, objectId, offset, limit } }), reply: { ok: true, kind: 'source-span', path: file, text: Buffer.from(bytes).toString('utf8'), offset,
        nextOffset: offset + limit < lines.length ? offset + limit : null, contentClass, redacted: false, provenance: { commit: record.subject.pinnedRevision.commit, objectId } } };
    } catch { return fail(); }
  }
  function hostAdapter(input: {
    readonly binding: SessionBinding;
    /** Root snapshots ONLY actual SessionHost.reserveRequest admission. This port, plus actual
     * Host.toolReceipt delivery, is the authenticity boundary; a shaped receipt is insufficient. */
    readonly admittedRequest: () => SessionAdmission | null;
  }) {
    if (!exact(input, ['binding', 'admittedRequest'])) fail();
    const binding = copy(input.binding), admittedRequest = input.admittedRequest;
    if (!exact(binding, ['run', 'role', 'sourceBinding', 'policy', 'provider', 'model']) || binding.run !== runId || !ROLES.includes(binding.role as Role)
      || binding.sourceBinding !== sourceBindingSha256(record.subject) || binding.policy !== screen.policySha256
      || binding.provider !== record.declared.agentProvider || binding.model !== record.declared.model || typeof admittedRequest !== 'function') fail();
    const role = binding.role as Role;
    const seen = new Set<string>();
    const onToolReceipt = async (raw: SessionToolsReceipt, awaitReceiptCurrent?: () => Promise<boolean>): Promise<UrlOriginReceipt> => {
      try {
        live(); const receipt = copy(raw);
        if (!exact(receipt, ['binding', 'id', 'kind', 'toolName', 'toolInput', 'canonicalText', 'classes', 'originIds', 'digest', 'bytes'])
          || canonical(receipt.binding) !== canonical(binding) || receipt.kind !== 'tool-result' || typeof receipt.canonicalText !== 'string'
          || receipt.digest !== sha256(receipt.canonicalText) || receipt.bytes !== Buffer.byteLength(receipt.canonicalText) || seen.has(receipt.id)
          || !/^tool-[a-f0-9]{64}$/u.test(receipt.id) || seen.size >= limits.receipts) fail();
        const reply = parseBoundedJson(receipt.canonicalText, JSON_LIMITS); if (canonical(reply) !== receipt.canonicalText || !isRecord(reply) || reply['ok'] !== true) fail();
        const bytes = Buffer.from(receipt.canonicalText); let result: UrlOriginReceipt;
        if (receipt.toolName === 'mcp__syzygy__source_read' && reply['kind'] === 'source-span') {
          if (role !== 'author' && role !== 'inventory') fail();
          const verified = await verifiedSpan(receipt.toolInput as { path: string; offset?: number; limit?: number });
          if (canonical(verified.reply) !== receipt.canonicalText) fail();
          safeSourceReply(bytes); const parent = entry(verified.receipt); result = issue(bytes, parent.classes, parent.originIds, undefined, { parents: [verified.receipt], derivation: { kind: 'source-reply' } });
        } else if (receipt.toolName === 'mcp__syzygy__source_read' && reply['kind'] === 'source-paths') {
          const request = receipt.toolInput, offset = request['offset'] ?? 0, limit = request['limit'] ?? 200;
          if ((role !== 'author' && role !== 'inventory') || !isRecord(request) || Object.keys(request).some(key => !['path', 'offset', 'limit'].includes(key))
            || !['', '.'].includes(request['path'] as string) || !Number.isSafeInteger(offset) || Number(offset) < 0 || !Number.isSafeInteger(limit) || Number(limit) < 1 || Number(limit) > 2000) fail();
          const reader = openReader();
          const { tree, listed } = await sourceOperation(async check => { check(); const tree = await reader.tree(); check(); return { tree, listed: await reader.listTree() }; }); live();
          const paths = listed.filter(item => ['100644', '100755'].includes(item.mode) && relative(item.path) && screen.screenBody(item.path) === undefined
            && screen.screenPath(item.path) === undefined && screen.contentClass(item.path) !== undefined).map(item => item.path).sort();
          const selected = paths.slice(Number(offset), Number(offset) + Number(limit));
          if (canonical({ ok: true, kind: 'source-paths', paths: selected, offset, nextOffset: Number(offset) + selected.length < paths.length ? Number(offset) + selected.length : null,
            scope: 'path-classification-only; bodies may still be excluded', provenance: { commit: record.subject.pinnedRevision.commit, tree } }) !== receipt.canonicalText) fail();
          safe(bytes); result = issue(bytes, ['code-structure'], [], { id: `origin:tree-${sha256(bytes).slice(0, 32)}`, species: 'structural-source-and-tool-metadata' },
            { parents: [], derivation: { kind: 'source-tree', offset: Number(offset), limit: Number(limit) } });
        } else if (receipt.toolName === 'mcp__syzygy__artifact_read' && reply['kind'] === 'artifact') {
          if (!exact(receipt.toolInput, ['path']) || !exact(reply, ['ok', 'kind', 'path', 'text', 'sha256']) || typeof reply['text'] !== 'string' || typeof reply['path'] !== 'string'
            || reply['path'] !== receipt.toolInput['path']) fail();
          const prior = artifacts.get(`${role}:${reply['path']}`); if (!prior || reply['sha256'] !== prior.digest) fail(); origins(prior.receipt, Buffer.from(reply['text'])); safe(bytes);
          result = derived(bytes, [prior.receipt]);
        } else {
          const admission = copy(admittedRequest());
          if (!admission || !exact(admission, ['digest', 'bytes', 'classes', 'originIds']) || !hex(admission.digest) || !Number.isSafeInteger(admission.bytes) || admission.bytes < 1 || admission.bytes > JSON_LIMITS.maxBytes
            || !Array.isArray(admission.classes) || admission.classes.length === 0 || admission.classes.length > CLASSES.length || admission.classes.some(c => !CLASSES.includes(c))
            || new Set(admission.classes).size !== admission.classes.length || !Array.isArray(admission.originIds) || admission.originIds.length === 0 || admission.originIds.length > limits.parents
            || admission.originIds.some(value => typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/u.test(value))) fail();
          // The captured actual request supplies parent classes. Receipt.class/originIds are never authority.
          const payload = receipt.toolName === 'mcp__syzygy__artifact_write' ? receipt.toolInput['content'] : receipt.toolName === 'mcp__syzygy__dossier_step' ? receipt.toolInput['stdin'] : undefined;
          if (typeof payload !== 'string') fail(); const payloadBytes = snapshot(Buffer.from(payload)); safe(payloadBytes); safe(bytes);
          let file: string, kind: UrlReportKind;
          if (receipt.toolName === 'mcp__syzygy__artifact_write') {
            if (!exact(receipt.toolInput, ['path', 'content']) || role !== 'author' || receipt.toolInput['path'] !== 'drafts/next.json' || !exact(reply, ['ok', 'kind', 'path', 'sha256'])
              || reply['kind'] !== 'artifact-written' || reply['path'] !== 'drafts/next.json' || reply['sha256'] !== sha256(payloadBytes)) fail();
            file = 'drafts/next.json'; kind = 'draft';
            // Nothing has been issued or bound. Give pending resource polls
            // a turn, then require the same admission and unused receipt.
            await yieldToPoll();
            if (awaitReceiptCurrent !== undefined && !(await awaitReceiptCurrent())) fail();
            if (seen.has(receipt.id) || seen.size >= limits.receipts || canonical(admittedRequest()) !== canonical(admission)) fail();
          } else {
            const argv = receipt.toolInput['argv'];
            if (!exact(receipt.toolInput, ['argv', 'stdin']) || !Array.isArray(argv) || argv.length !== 6 || argv[0] !== 'dossier' || argv[1] !== 'await' || typeof argv[2] !== 'string'
              || argv[3] !== '--submit' || argv[5] !== '--stdin' || !relative(argv[4]) || !exact(reply, ['ok', 'kind', 'stdout', 'stderr', 'exit'])
              || reply['kind'] !== 'dossier-result' || typeof reply['stdout'] !== 'string' || typeof reply['stderr'] !== 'string') fail();
            if (reply['exit'] !== 0 && (reply['exit'] !== 1 || reply['stderr'] !== ''
              || urlDossierReportExit('await', true, parseBoundedJson(reply['stdout'], JSON_LIMITS)) !== 1)) fail();
            file = argv[4]; kind = role === 'inventory' && file === 'inventory.json' ? 'inventory'
              : role === 'fidelity' && /^round-[1-9][0-9]{0,5}\/verdict\.json$/u.test(file) ? 'fidelity-verdict'
                : role === 'design' && /^round-[1-9][0-9]{0,5}\/verdict\.json$/u.test(file) ? 'design-verdict' : fail();
          }
          const provider = issue(payloadBytes, union([admission.classes, ['derived-composites']]), admission.originIds, undefined,
            { parents: [], derivation: { kind: 'authenticated-provider-output' } });
          const output = derived(payloadBytes, [provider], kind, role, false);
          result = derived(bytes, [output], undefined, undefined, false);
          bindArtifact({ role, path: file, bytes: payloadBytes, receipt: output });
        }
        seen.add(receipt.id); return result;
      } catch { return fail(); }
    };
    return Object.freeze({ onToolReceipt, artifactOrigins: (file: string, bytes: Uint8Array) => artifactOrigins(role, file, bytes) });
  }
  function captureProvenance(receipts: readonly UrlOriginReceipt[]): { readonly graph: UrlOriginProvenance; readonly keys: readonly string[] } {
    live();
    const nodes: UrlOriginProvenanceNode[] = [], seen = new Map<string | UrlOriginReceipt, string>();
    const historicalGraphs = new Map<UrlOriginProvenance, Map<string, string>>();
    const append = (metadata: UrlOriginMetadata, parents: readonly string[], derivation: UrlOriginDerivation,
      referenceMode: UrlOriginProvenanceNode['referenceMode']): string => {
      if (nodes.length >= limits.receipts) fail();
      const key = `node-${nodes.length + 1}`; nodes.push({ key, metadata, parents, derivation, referenceMode }); return key;
    };
    const historical = (graph: UrlOriginProvenance, key: string): string => {
      let aliases = historicalGraphs.get(graph);
      if (!aliases) { aliases = new Map(); historicalGraphs.set(graph, aliases); }
      const prior = aliases.get(key); if (prior) return prior;
      const node = graph.nodes.find(value => value.key === key); if (!node) fail();
      const result = append(node.metadata, node.parents.map(parent => historical(graph, parent)), node.derivation, node.referenceMode);
      aliases.set(key, result); return result;
    };
    const visit = (receipt: UrlOriginReceipt): string => {
      // The bounded traversal is private and synchronous. Sample authority
      // at capture and release while still authenticating each receipt.
      const value = lookup(receipt), provenance = lineage.get(receipt);
      if (!provenance) fail();
      const prior = seen.get(receipt); if (prior) return prior;
      const referenceMode = plans.some(plan => plan.id === value.id) ? 'declared' : 'inherited';
      let key: string;
      if (provenance.historical !== undefined) {
        key = historical(provenance.historical.graph, provenance.historical.key);
        const prior = nodes.find(node => node.key === key)!;
        // Preserve original internal references while describing the fresh
        // imported root's current reference encoding. No old plan is registered.
        if (prior.referenceMode !== referenceMode) key = append(prior.metadata, prior.parents, prior.derivation, referenceMode);
      } else key = provenance.derivation === null ? fail()
        : append(metadataOf(value), provenance.parents.map(visit), provenance.derivation, referenceMode);
      seen.set(receipt, key); return key;
    };
    const keys = receipts.map(visit);
    const captured = copy({ graph: { format: 'polaris-url-origin-provenance/2' as const, nodes }, keys });
    live();
    return captured;
  }
  async function restoreFrozenOrigins(capability: UrlVerifiedRecoveryProducts, expected: {
    readonly run: string; readonly coreSha256: string; readonly declarationSha256: string;
  }, waitForSamples: () => Promise<boolean>) {
    const transfer = takeUrlRecoveryProducts(capability, { ...expected, runId, sourcePin: record.subject.pinnedRevision.commit, originPolicySha256: origin.sha256, sourceBindingSha256: sourceBindingSha256(record.subject), basePolicySha256: screen.policySha256, current });
    const history = transfer.history, graph = history.provenance;
    const sameSubject = (receipt: UrlOriginReceipt, metadata: UrlOriginMetadata): void => {
      const value = entry(receipt);
      if (value.digest !== metadata.digest || value.bytes !== metadata.bytes
        || canonical(value.classes) !== canonical(metadata.classes) || canonical(value.originIds) !== canonical(metadata.originIds)) fail();
    };
    for (const node of graph.nodes) {
      const d = node.derivation;
      // These derivations are sealed history. They have no fresh receipt or
      // read to authorize here. The transfer still revalidates the full graph.
      if (d.kind === 'composition' || d.kind === 'source-reply' || d.kind === 'report'
        || d.kind === 'authenticated-provider-output') continue;
      if (!(await waitForSamples())) fail(); live();
      if (d.kind === 'fixed' || d.kind === 'renderer') {
        const receipt = d.kind === 'fixed' ? fixedReceipts.get(d.id) : issuedById.get('origin:renderer-scaffold');
        if (!receipt) fail(); sameSubject(receipt, node.metadata);
      } else if (d.kind === 'source-span') {
        const result = await verifiedSpan({ path: d.path, expectedObjectId: d.objectId, offset: d.offset, limit: d.limit });
        sameSubject(result.receipt, node.metadata);
      } else if (d.kind === 'source-whole') {
        const body = await sourceOperation(check => verifiedSource(d.path, check));
        if (body.objectId !== d.objectId) fail();
        const checked = await verifyWholeSourceBody({ path: d.path, objectId: d.objectId, bytes: body.bytes });
        sameSubject(inspectWholeSourceBody(checked).origin, node.metadata);
      } else if (d.kind === 'source-tree') {
        const result = await sourceOperation(async check => {
          const reader = openReader(), tree = await reader.tree(); check();
          const listed = await reader.listTree(); check();
          const paths = listed.filter(item => ['100644', '100755'].includes(item.mode) && relative(item.path)
            && screen.screenBody(item.path) === undefined && screen.screenPath(item.path) === undefined
            && screen.contentClass(item.path) !== undefined).map(item => item.path).sort();
          const selected = paths.slice(d.offset, d.offset + d.limit);
          return Buffer.from(canonical({ ok: true, kind: 'source-paths', paths: selected, offset: d.offset,
            nextOffset: d.offset + selected.length < paths.length ? d.offset + selected.length : null,
            scope: 'path-classification-only; bodies may still be excluded', provenance: { commit: record.subject.pinnedRevision.commit, tree } }));
        });
        safe(result);
        if (sha256(result) !== node.metadata.digest || result.length !== node.metadata.bytes || canonical(node.metadata.classes) !== canonical(['code-structure'])) fail();
      } else if (d.kind === 'source-manifest-remainder') {
        const bytes = await sourceOperation(verifiedManifestRemainder);
        const digest = sha256(bytes);
        if (digest !== node.metadata.digest || bytes.length !== node.metadata.bytes || manifestRemainderOriginId(digest) !== node.metadata.id) fail();
      }
    }
    if (!(await waitForSamples())) fail(); transfer.revalidate();
    const restored = new Map<string, UrlOriginReceipt>();
    return Object.freeze({ history, launches: transfer.launches, deadline: transfer.deadline, revalidate: transfer.revalidate,
      receipt: (file: string, bytes: Uint8Array, role?: Role): UrlOriginReceipt => guarded(() => {
        live(); const subject = role === undefined ? history.records.find(record => record.path === file)
          : history.artifacts.find(record => record.role === role && record.path === file);
        if (!subject || bytes.length !== subject.bytes || sha256(bytes) !== subject.sha256) fail();
        const prior = restored.get(subject.origin); if (prior) { assertSubject(entry(prior), bytes); return prior; }
        const node = graph.nodes.find(value => value.key === subject.origin); if (!node) fail();
        safe(snapshot(bytes));
        const receipt = issue(bytes, node.metadata.classes, node.metadata.originIds);
        const p = lineage.get(receipt)!;
        lineage.set(receipt, { ...p, historical: { graph, key: node.key } }); restored.set(subject.origin, receipt);
        return receipt;
      }),
    });
  }
  live();
  return Object.freeze({
    captureProvenance, restoreFrozenOrigins, sourceManifestRemainder,
    semanticProvenance: (receipts: readonly UrlOriginReceipt[]): string => guarded(() => {
      const captured = captureProvenance(receipts);
      const fingerprint = fingerprintUrlOriginProvenance(captured, { runId, sourceBindingSha256: sourceBindingSha256(record.subject),
        sourcePin: record.subject.pinnedRevision.commit, basePolicySha256: screen.policySha256, originPolicySha256: origin.sha256 });
      live(); return fingerprint;
    }),
    captureArtifactBindings: () => guarded(() => { live(); return Object.freeze([...artifacts].map(([key, value]) => {
      const colon = key.indexOf(':');
      return Object.freeze({ role: key.slice(0, colon) as Role, path: key.slice(colon + 1), receipt: value.receipt });
    })); }),
    validateReport: (role: Role, kind: UrlReportKind, bytes: Uint8Array): void => guarded(() => {
      live(); const text = safe(snapshot(bytes));
      if (role !== REPORT_ROLES[kind] || schemas[kind]?.(parseBoundedJson(text, JSON_LIMITS), role) !== true) fail();
    }),
    boundArtifact: (role: Role, file: string, bytes: Uint8Array): UrlOriginReceipt => guarded(() => {
      live(); const value = artifacts.get(`${role}:${file}`); if (!value) fail(); assertSubject(value, bytes); return value.receipt;
    }),
    fixed: (name: string, bytes: Uint8Array): UrlOriginReceipt => guarded(() => {
      live();
      const receipt = fixedReceipts.get(name);
      if (!registry.has(name) || receipt === undefined) return fail();
      assertSubject(lookup(receipt), bytes);
      return receipt;
    }),
    planRendererScaffold,
    sourceSpan: async (input: Parameters<typeof verifiedSpan>[0]): Promise<UrlOriginReceipt> => (await verifiedSpan(input)).receipt,
    // Host-only lineage for a producer that derives values from an uncited
    // complete blob. The path grants no role read or raw-composition exception.
    sourceWhole: async (input: { readonly path: string }): Promise<UrlOriginReceipt> => {
      try {
        live(); if (!exact(input, ['path']) || !isUrlWholeSourcePath(input.path)) fail();
        const file = input.path;
        return await sourceOperation(async check => {
          const body = await verifiedSource(file, check);
          const capability = issueWholeSourceBody(file, body, check);
          return inspectWholeSourceBody(capability).origin;
        });
      } catch { return fail(); }
    },
    // Host-only complete-body verification. This is not a role tool or a raw-composition exemption.
    verifyWholeSourceBody, inspectWholeSourceBody: (capability: UrlWholeSourceBody) => guarded(() => inspectWholeSourceBody(capability)),
    compose: (bytes: Uint8Array, receipts: readonly UrlOriginReceipt[]) => guarded(() => derived(bytes, receipts)),
    compositionOrigins: (receipts: readonly UrlOriginReceipt[]) => guarded(() => {
      live();
      return copy(inheritedOrigins(parents(receipts)));
    }),
    report: (input: { readonly role: Role; readonly kind: UrlReportKind; readonly bytes: Uint8Array; readonly parents: readonly UrlOriginReceipt[] }) => guarded(() => {
      if (!exact(input, ['role', 'kind', 'bytes', 'parents'])) return fail(); return derived(input.bytes, input.parents, input.kind, input.role);
    }),
    bindArtifact: (input: ArtifactBinding) => guarded(() => bindArtifact(input)),
    bindArtifacts: (inputs: readonly ArtifactBinding[]) => guarded(() => bindArtifacts(inputs)), artifactOrigins,
    origins: (receipt: UrlOriginReceipt, bytes: Uint8Array) => guarded(() => origins(receipt, bytes)), metadata: (receipt: UrlOriginReceipt) => guarded(() => metadata(receipt)),
    inspectMetadata: (requests: Parameters<typeof inspectMetadata>[0]) => guarded(() => inspectMetadata(requests)),
    verifySubjects: (requests: Parameters<typeof verifySubjects>[0]) => guarded(() => verifySubjects(requests)),
    hostAdapter: (input: Parameters<typeof hostAdapter>[0]) => guarded(() => hostAdapter(input)),
    // Only locally reconstructible declaration edges are projected. Authenticated provider request
    // capture remains separate runtime evidence; it never manufactures a root declaration.
    plannedOrigins: (): readonly UrlPlannedOrigin[] => guarded(() => { live(); return copy(plans); }),
  });
}
