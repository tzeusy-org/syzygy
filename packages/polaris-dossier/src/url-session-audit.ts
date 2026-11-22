import { closeSync, constants, fstatSync, lstatSync, openSync, readSync, realpathSync } from 'node:fs';
import { lstat, open, realpath, type FileHandle } from 'node:fs/promises';
import path from 'node:path';
import { encodeCanonicalJson, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { deepFreeze, isRecord, sha256 } from '@syzygy/support';
import { RUN_LAYOUT } from './state-directory.js';
import { CLARIFICATION_ANSWER_KINDS } from './draft-schema.js';
import { SESSION_CONTENT_CLASSES, SESSION_TOOLS, type SessionAdmission, type SessionBinding, type SessionContentClass } from './session-egress-policy.js';
import { isNativeSessionProfile, isOrderedDesignSessionProfile, type NativeSessionProfile } from './session-profile.js';
import type { DossierScreen } from './screen.js';
import type { UrlSessionControlAudit } from './session-control.js';
import { readVerifiedUrlAuditLaunches, type UrlSessionAuditHistoryExpected } from './url-session-audit-history.js';
import { isClaimedStoppedUrlRun, type verifyStoppedUrlRun } from './url-recovery.js';
import { snapshotProductFile } from './url-product-reads.js';
import type { UrlLaunchLimits, UrlSessionLaunchOptions, UrlSessionLaunchOutcome } from './session-launch.js';
import { isSessionTokenCount, SESSION_COUNT_RESPONSE_MAX_BYTES, SESSION_COUNT_TOKENS_PATH, SESSION_RELAY_EVENTS,
  type SessionAuditEvent } from './session-relay.js';
import type { SessionResponseUsage } from './session-response.js';
import type { ViewRole } from './session-view.js';
import { inspectUrlDesignProduct, isUrlDesignProductLeaseOpen, readInertUrlDesignProduct, recheckUrlDesignProductInputs, sameReproducedUrlDesignProduct,
  type UrlDesignProductBinding, type UrlDesignProductMetadata, type UrlInertDesignProduct, type ValidatedUrlDesignProduct } from './url-design-product.js';
import { checkStoredUrlRender, readStoredUrlRenderWithAuthority } from './url-stored-render.js';
import { inspectUrlLaunchHistory, isUrlHelperLaunchFile, URL_HELPER_LAUNCH_FILES, type UrlLaunchHistoryCapability, type UrlLaunchHistoryRole } from './url-launch-history.js';
import { isOrderedDesignPlanFor, orderedDesignPlanInputForDelivery, planOrderedDesignBytes, type OrderedDesignPlan } from './url-design-delivery.js';
import type { UrlMachinePeerAudit } from './url-machine-peer.js';
import { verifyOrderedDesignAuditPrefix, verifyOrderedDesignTerminalEvidence, type OrderedDesignAuditReference, type OrderedDesignAuditEvent, type OrderedDesignTerminalEvidence } from './url-ordered-design-audit.js';
import type { UrlOrderedDesignHistoryExpected } from './url-ordered-design-audit-history.js';
import { hasReadOrderedDesignTerminal, isIssuedOrderedDesignTerminal, createOrderedDesignAuditWriter, type OrderedDesignAuditWriter, type OrderedDesignStoredRecord } from './url-ordered-design-writer.js';

export const URL_SESSION_AUDIT_FORMAT = 'url-session-audit/2' as const;
export const URL_SESSION_AUDIT_LIMITS = Object.freeze({ events: 4096, eventBytes: 65_536, bytes: 16_777_216, pending: 8, milliseconds: 5000 });
type Limits = { readonly [K in keyof typeof URL_SESSION_AUDIT_LIMITS]: number };
export interface UrlSessionAuditScope {
  readonly binding: SessionBinding; readonly originPolicySha256: string; readonly profileSha256: string;
}
export interface UrlSessionToolReceiptMetadata {
  readonly id: string; readonly toolName: 'mcp__syzygy__source_read' | 'mcp__syzygy__artifact_read' | 'mcp__syzygy__artifact_write' | 'mcp__syzygy__dossier_step';
  readonly inputSha256: string; readonly digest: string; readonly bytes: number;
  readonly classes: readonly SessionContentClass[]; readonly originIds: readonly string[];
}
type Envelope<K, P> = { readonly kind: K; readonly role: ViewRole; readonly scope: UrlSessionAuditScope; readonly payload: P };
export type UrlSessionAuditEvent = Envelope<'relay', SessionAuditEvent>
  | Envelope<'control', UrlSessionControlAudit>
  | Envelope<'launch-attempt', Parameters<UrlSessionLaunchOptions['audit']>[0]>
  | Envelope<'before-tool', { readonly tool: 'source_read' | 'artifact_read' | 'artifact_write' | 'dossier_step'; readonly inputSha256: string }>
  | Envelope<'tool-receipt', UrlSessionToolReceiptMetadata>
  | Envelope<'usage', SessionResponseUsage>
  | Envelope<'launch-terminal', UrlSessionLaunchOutcome>;
type LaunchHistoryEvent = Envelope<'launch-history', {
  readonly file: string; readonly recordSha256: string; readonly recordBytes: number;
  readonly promptRecordSha256: string; readonly promptSha256: string; readonly sessionId: string;
}>;
export interface UrlDesignDeliveryAuditInput extends UrlDesignProductBinding {
  readonly product: ValidatedUrlDesignProduct;
  readonly expectedProduct: UrlDesignProductMetadata;
  readonly launch: UrlCommittedLaunchHistory;
  readonly sitePath: string;
  readonly round: number;
}
interface DesignDeliveryIdentity {
  readonly state: 'prepared';
  readonly site: number;
  readonly round: number;
  readonly sessionId: string;
  readonly draftRevision: number;
  readonly original: UrlDesignProductMetadata['original'];
  readonly payload: UrlDesignProductMetadata['payload'];
  readonly view: UrlDesignProductMetadata['view'];
  readonly files: number;
  readonly pages: number;
  readonly rendererSha256: string;
  readonly basePolicySha256: string;
  readonly originPolicySha256: string;
  readonly registryProfileSha256: string;
  readonly policyBindingsSha256: string;
  readonly launchEventSha256: string;
  readonly parentCount: number;
  readonly parentsSha256: string;
  readonly inputsSha256: string;
  readonly semanticParentsSha256: string;
  readonly semanticInputsSha256: string;
  readonly storedPopulationSha256: string;
}
type DesignDeliveryEvent = Envelope<'design-delivery', DesignDeliveryIdentity>;
export interface UrlCheckedDesignVerdict {
  readonly number: number;
  readonly checkSha256: string;
  readonly verdictSha256: string;
}
type DesignVerdictEvent = Envelope<'design-verdict', {
  readonly deliverySha256: string;
  readonly artifactReadId: string;
  readonly relayResponseSha256: string;
  readonly verdictCallId: string;
  readonly checked: UrlCheckedDesignVerdict;
  readonly toolReceipt: UrlSessionToolReceiptMetadata;
}>;
type OrderedDesignEvent = Envelope<'design-ordered', OrderedDesignStoredRecord>;
type MachinePeerEvent = Envelope<'machine-peer', UrlMachinePeerAudit>;
type OrderedDesignVerdictEvent = Envelope<'ordered-design-verdict', { readonly deliverySha256: string; readonly terminal: OrderedDesignTerminalEvidence; readonly checked: UrlCheckedDesignVerdict }>;
type CapturedAuditEvent = UrlSessionAuditEvent | LaunchHistoryEvent | DesignDeliveryEvent | DesignVerdictEvent | OrderedDesignEvent | MachinePeerEvent | OrderedDesignVerdictEvent;
type PrivateEventKind = LaunchHistoryEvent['kind'] | DesignDeliveryEvent['kind'] | DesignVerdictEvent['kind'] | OrderedDesignEvent['kind'] | MachinePeerEvent['kind'] | OrderedDesignVerdictEvent['kind'];
declare const designAuditBrand: unique symbol;
export interface UrlDesignDeliveryAuditRecord {
  readonly [designAuditBrand]: true;
  readonly eventSha256: string;
  readonly identity: DesignDeliveryIdentity;
}
export interface UrlDesignDeliveryView {
  readonly receipt: UrlDesignDeliveryAuditRecord;
  readonly view: Uint8Array;
  readonly parents: UrlInertDesignProduct['parents'];
}
const authenticatedDesignViews = new WeakMap<UrlDesignDeliveryView, {
  readonly current: () => void; readonly product: WeakRef<ValidatedUrlDesignProduct>;
}>();

/** Establish that the audit issued this exact envelope before accessing its fields. */
export function isIssuedUrlDesignDeliveryView(delivery: UrlDesignDeliveryView): boolean {
  return authenticatedDesignViews.has(delivery);
}

/** Check a protected, still-current handoff at its next local use. */
export function assertUrlDesignDeliveryViewCurrent(delivery: UrlDesignDeliveryView): void {
  const issued = authenticatedDesignViews.get(delivery);
  const product = issued?.product.deref();
  if (!issued || !product || delivery.view.byteLength !== delivery.receipt.identity.view.bytes
    || sha256(delivery.view) !== delivery.receipt.identity.view.sha256) throw refused();
  issued.current();
  if (!recheckUrlDesignProductInputs(product)) throw refused();
}
const designIdentityDigest = (value: unknown): string => sha256(encodeCanonicalJson(value, { maxBytes: 2_097_152, maxNodes: 65_536, maxDepth: 32 }));
export interface UrlDesignReviewProof {
  readonly run: string;
  readonly runId: string;
  readonly pinnedRevision: string;
  readonly round: number;
  readonly site: number;
  readonly sessionId: string;
  readonly artifactReadId: string | null;
  readonly ordered?: { readonly completion: OrderedDesignAuditReference; readonly manifestSha256: string };
  readonly relayResponseSha256: string;
  readonly verdictCallId: string;
  readonly verdictInputSha256: string;
  readonly packet: { readonly sha256: string; readonly files: readonly string[]; readonly pages: readonly string[] };
}
const orderedDesignReviewInputs = new WeakMap<UrlDesignReviewProof, { readonly writer: OrderedDesignAuditWriter; readonly parents: UrlInertDesignProduct['parents']; readonly terminal: (checked: UrlCheckedDesignVerdict, terminal: OrderedDesignTerminalEvidence) => void }>();
export function orderedUrlDesignReviewParents(proof: UrlDesignReviewProof): UrlInertDesignProduct['parents'] {
  assertUrlDesignReviewProofCurrent(proof);
  const issued = orderedDesignReviewInputs.get(proof);
  if (!issued) throw refused();
  return issued.parents;
}
export function assertUrlOrderedDesignVerdictTerminal(proof: UrlDesignReviewProof, checked: UrlCheckedDesignVerdict, terminal: OrderedDesignTerminalEvidence): void {
  assertUrlDesignReviewProofCurrent(proof);
  const issued = orderedDesignReviewInputs.get(proof);
  if (!issued) throw refused();
  issued.terminal(checked, terminal);
}
const designReviewProofs = new WeakMap<UrlDesignReviewProof, () => void>();
export function assertUrlDesignReviewProofCurrent(proof: UrlDesignReviewProof): void {
  const current = designReviewProofs.get(proof);
  if (!current) throw refused();
  current();
}
export interface UrlDesignRenderContinuation {
  readonly binding: UrlDesignProductBinding;
  readonly checked: UrlCheckedDesignVerdict;
  readonly delivery: UrlDesignDeliveryAuditRecord;
  readonly verdictEventSha256: string;
  readonly original: UrlDesignProductMetadata;
  readonly earlierRounds: readonly number[];
  readonly deadline: number;
}
const designRenderContinuations = new WeakMap<UrlDesignRenderContinuation, () => void>();
export function assertUrlDesignRenderContinuationCurrent(continuation: UrlDesignRenderContinuation): void {
  const current = designRenderContinuations.get(continuation);
  if (!current) throw refused();
  current();
}

export type UrlDesignRenderContinuationFactory = (input: { readonly deadline: number; readonly packetSha256: string }) => UrlDesignRenderContinuation | null;

/** Hold the checked subject without keeping its read context or granting a
 * continuation. A single later use must recheck the exact durable subject. */
function makeDesignRenderContinuationFactory(subject: Omit<UrlDesignRenderContinuation, 'deadline'>, readDeadline: number,
  verify: (deadline: number) => void): UrlDesignRenderContinuationFactory {
  let used = false;
  return input => {
    if (used) return null;
    used = true;
    const deadline = Math.min(readDeadline, input.deadline, Date.now() + URL_SESSION_AUDIT_LIMITS.milliseconds);
    if (!Number.isSafeInteger(deadline) || Date.now() >= deadline || input.packetSha256 !== subject.original.original.sha256) return null;
    try {
      const result = deepFreeze({ ...subject, deadline });
      const current = (): void => verify(deadline);
      current();
      designRenderContinuations.set(result, current);
      return result;
    } catch { return null; }
  };
}

/** A genuine consumed stop claim plus its independently checked cold audit
 * may continue only the final render. Fresh product inspection and physical
 * site/report checks replace expired process/transport capabilities. No old
 * receipt is entered in the live delivery or ordered-writer registries. */
export async function prepareRecoveredUrlDesignRenderContinuation(input: {
  readonly verified: Extract<Awaited<ReturnType<typeof verifyStoppedUrlRun>>, { ok: true }>;
  readonly claim: unknown; readonly product: ValidatedUrlDesignProduct;
  readonly number: number; readonly site: number;
}): Promise<UrlDesignRenderContinuationFactory | null> {
  try {
    const { verified, claim, product, number, site } = input;
    if (!isClaimedStoppedUrlRun(verified, claim)) return null;
    const context = verified.checkedContext;
    const binding = { run: verified.boundary.record.run, runId: verified.boundary.record.runId,
      pinnedRevision: verified.boundary.record.sourcePin };
    const histories = verified.verifiedAudits.map(readVerifiedUrlAuditLaunches);
    if (histories.some(history => history === null)) return null;
    const attempts = histories.flatMap(history => history!.ordered);
    const last = attempts.at(-1);
    if (!last || last.disposition.kind !== 'eligible' || last.disposition.checked.number !== number
      || last.receipt.identity.site !== site) return null;
    const disposition = last.disposition, receipt = last.receipt;
    const original = await inspectUrlDesignProduct(product, binding);
    if (!original || !isClaimedStoppedUrlRun(verified, claim) || !isUrlDesignProductLeaseOpen(product)) return null;
    const identity = receipt.identity;
    const same = (left: unknown, right: unknown): boolean => designIdentityDigest(left) === designIdentityDigest(right);
    if (original.products.operation !== 'render' || original.rawActive.status !== 'failed'
      || original.draftRevision !== identity.draftRevision || !same(original.original, identity.original)
      || !same(original.payload, identity.payload) || !same(original.view, identity.view)
      || original.output.files !== identity.files || original.output.pages !== identity.pages
      || designIdentityDigest(original.renderer) !== identity.rendererSha256
      || original.basePolicy.sha256 !== identity.basePolicySha256 || original.originPolicy.sha256 !== identity.originPolicySha256
      || original.profile.sha256 !== identity.registryProfileSha256
      || designIdentityDigest([original.basePolicy, original.originPolicy]) !== identity.policyBindingsSha256
      || original.parents.length !== identity.parentCount || original.semanticParentsSha256 !== identity.semanticParentsSha256
      || original.semanticInputsSha256 !== identity.semanticInputsSha256
      || designIdentityDigest(original.output) !== identity.storedPopulationSha256) return null;
    const current = (): boolean => isClaimedStoppedUrlRun(verified, claim) && context.current();
    const check = (deadline: number): void => {
      const checkedSite = readStoredUrlRenderWithAuthority(deadline, current, withinDeadline => {
        const checked = disposition.checked;
        for (const [file, digest] of [[`reviews/checks/design-verdict-${number}.json`, checked.checkSha256],
          [`reviews/design-verdict-${number}.json`, checked.verdictSha256]] as const) {
          const snapshot = snapshotProductFile(binding.run, file, 2_097_152, () => { if (!withinDeadline()) throw refused(); });
          if (snapshot.bytes === null || sha256(snapshot.bytes) !== digest) return null;
        }
        return checkStoredUrlRender(binding.run, path.join(binding.run, RUN_LAYOUT.site, String(site)), original.output, withinDeadline);
      });
      if (checkedSite !== site) throw refused();
    };
    const subject = deepFreeze({ binding, checked: disposition.checked,
      delivery: receipt as UrlDesignDeliveryAuditRecord, verdictEventSha256: disposition.verdictEventSha256,
      original, earlierRounds: attempts.filter(attempt => attempt.receipt.identity.round < identity.round)
        .map(attempt => attempt.receipt.identity.round) });
    const deadline = Math.min(context.deadline, original.products.deadline);
    check(Math.min(deadline, Date.now() + URL_SESSION_AUDIT_LIMITS.milliseconds));
    return makeDesignRenderContinuationFactory(subject, deadline, check);
  } catch { return null; }
}

/** A final render adds its checked design records to the already reviewed
 * source and product population. The original design packet covers every
 * file and excludes only the review-status region. */
export function assertUrlFinalDesignProduct(continuation: UrlDesignRenderContinuation, product: UrlDesignProductMetadata): void {
  const original = continuation.original;
  const same = (left: unknown, right: unknown): boolean => designIdentityDigest(left) === designIdentityDigest(right);
  const designRecord = (file: string): boolean =>
    /^reviews\/(?:checks\/)?design-verdict-(?:0|[1-9][0-9]*)\.json$/u.test(file)
    || file === 'reviews/design-session-1.json' || file === URL_HELPER_LAUNCH_FILES.design;
  const designSelection = (selector: string): boolean => selector === 'design-checks' || selector === 'design-verdicts';
  const additional = new Set([
    ...product.products.records.filter(record => designRecord(record.path)).map(record => record.originId),
    ...product.products.selections.filter(selection => designSelection(selection.selector)).map(selection => selection.originId),
  ]);
  const checkedFile = `design-verdict-${continuation.checked.number}.json`;
  const recordedDigest = (file: string) => product.products.records.find(record => record.path === file)?.sha256;
  if (product.run !== original.run || product.runId !== original.runId || product.pinnedRevision !== original.pinnedRevision
    || product.draftRevision !== original.draftRevision || product.products.operation !== original.products.operation
    || !same(product.renderer, original.renderer) || !same(product.basePolicy, original.basePolicy)
    || !same(product.originPolicy, original.originPolicy) || !same(product.profile, original.profile)
    || !same(product.original, original.original) || !same(product.view, original.view)
    || !same(product.payload, original.payload) || !same(product.rawActive, original.rawActive)
    || product.output.pages !== original.output.pages || product.output.files !== original.output.files
    || !same(product.output.population.map(file => file.path), original.output.population.map(file => file.path))
    || recordedDigest(`reviews/checks/${checkedFile}`) !== continuation.checked.checkSha256
    || recordedDigest(`reviews/${checkedFile}`) !== continuation.checked.verdictSha256
    || !same(product.products.records.filter(record => !designRecord(record.path)), original.products.records)
    || !same(product.products.selections.filter(selection => !designSelection(selection.selector)), original.products.selections)
    || !same(product.parents.filter(parent => !additional.has(parent.id)), original.parents)) throw refused();
  assertUrlDesignRenderContinuationCurrent(continuation);
}
declare const committedLaunchBrand: unique symbol;
export interface UrlCommittedLaunchHistory { readonly [committedLaunchBrand]: true }
interface CommittedLaunchHistoryIdentity {
  readonly history: ReturnType<typeof inspectUrlLaunchHistory>; readonly scope: UrlSessionAuditScope;
  readonly eventSha256: string; readonly project: string;
}
const committedLaunches = new WeakMap<UrlCommittedLaunchHistory, () => CommittedLaunchHistoryIdentity>();
export function inspectCommittedUrlLaunchHistory(capability: UrlCommittedLaunchHistory): CommittedLaunchHistoryIdentity {
  try { const inspect = committedLaunches.get(capability); if (inspect) return inspect(); } catch { /* Unavailable. */ }
  throw refused();
}
export interface UrlSessionAuditOptions {
  /** Canonical owned0700 parent outside every role view; a fresh name prefix. */
  readonly parent: string; readonly name: string; readonly binding: Omit<SessionBinding, 'role'>;
  readonly originPolicySha256: string; readonly project: string; readonly pin: string; readonly principal: string;
  /** Genuine independently compiled profiles, one per role. Never event-learned. */
  readonly profiles: readonly NativeSessionProfile[]; readonly declaredClasses: readonly SessionContentClass[];
  readonly screen: DossierScreen; readonly current: () => boolean | Promise<boolean>;
  readonly limits?: Partial<Limits>;
  readonly deadline?: number;
  readonly firstDesignRound?: number;
}
const ROLES: readonly ViewRole[] = ['author', 'inventory', 'fidelity', 'design'];
const KINDS = ['relay', 'control', 'launch-attempt', 'before-tool', 'tool-receipt', 'usage', 'launch-terminal', 'launch-history', 'design-delivery', 'design-verdict', 'design-ordered', 'machine-peer', 'ordered-design-verdict'] as const;
const RELAY_TRANSITIONS: Readonly<Record<SessionAuditEvent['event'], readonly SessionAuditEvent['event'][]>> = {
  'attempt-allowed': ['send-attempt', 'attempt-refused', 'transport-failed'],
  'send-attempt': ['send-outcome', 'transport-failed'],
  'send-outcome': ['response-admitted', 'response-refused', 'transport-failed'],
  'response-admitted': ['response-refused', 'transport-failed'],
  'attempt-refused': [], 'response-refused': [], 'transport-failed': [],
};
const TOOLS = ['source_read', 'artifact_read', 'artifact_write', 'dossier_step'] as const;
// Live launch evidence requires the selected values, including overrides. This
// writer never reopens historical segments or upgrades an old record to a grant.
const LAUNCH_LIMIT_KEYS = ['milliseconds', 'setupMilliseconds', 'cleanupMilliseconds', 'cpuSeconds', 'addressBytes',
  'fileBytes', 'storageBytes', 'entries', 'processes', 'outputBytes', 'descriptors', 'sampleMilliseconds', 'inspectionMilliseconds'] as const satisfies readonly (keyof UrlLaunchLimits)[];
const SIGNALS = ['SIGABRT', 'SIGALRM', 'SIGBUS', 'SIGCHLD', 'SIGCONT', 'SIGFPE', 'SIGHUP', 'SIGILL', 'SIGINT', 'SIGIO', 'SIGIOT',
  'SIGKILL', 'SIGPIPE', 'SIGPOLL', 'SIGPROF', 'SIGPWR', 'SIGQUIT', 'SIGSEGV', 'SIGSTKFLT', 'SIGSTOP', 'SIGSYS', 'SIGTERM', 'SIGTRAP',
  'SIGTSTP', 'SIGTTIN', 'SIGTTOU', 'SIGUNUSED', 'SIGURG', 'SIGUSR1', 'SIGUSR2', 'SIGVTALRM', 'SIGWINCH', 'SIGXCPU', 'SIGXFSZ'];
const exact = (v: unknown, keys: readonly string[]): v is Record<string, unknown> => isRecord(v)
  && Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k));
const one = (v: unknown, values: readonly string[]): v is string => typeof v === 'string' && values.includes(v);
const hex = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/u.test(v);
const count = (v: unknown, max = Number.MAX_SAFE_INTEGER): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && v <= max;
const id = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/u.test(v);
const providerToolId = (v: unknown): v is string => typeof v === 'string' && /^toolu_[A-Za-z0-9_-]{0,250}$/u.test(v);
const canonical = (v: unknown, maxBytes: number = URL_SESSION_AUDIT_LIMITS.eventBytes): string => encodeCanonicalJson(v, { maxBytes, maxNodes: 4096, maxDepth: 12 });
const copy = <T>(v: T, maxBytes?: number): T => deepFreeze(parseBoundedJson(canonical(v, maxBytes), { maxBytes: maxBytes ?? URL_SESSION_AUDIT_LIMITS.eventBytes, maxNodes: 4096, maxDepth: 12 })) as T;
const equal = (a: unknown, b: unknown): boolean => canonical(a) === canonical(b);
const refused = (): Error => new Error('url-session-audit-refused');
const zeroUsage = (): SessionResponseUsage => ({ inputTokens: 0, outputTokens: 0, cacheCreationInputTokens: 0, cacheReadInputTokens: 0 });
const zeroKinds = () => Object.fromEntries(KINDS.map(k => [k, 0])) as Record<typeof KINDS[number], number>;
interface Totals { records: number; bytes: number; tipSha256: string | null; usageReports: number; usage: SessionResponseUsage }
export interface UrlSessionAuditSummary {
  readonly format: typeof URL_SESSION_AUDIT_FORMAT; readonly closed: boolean; readonly poisoned: boolean;
  readonly durableRecords: number; readonly durableBytes: number; readonly declarations: number;
  readonly captured: Readonly<Record<typeof KINDS[number], number>>;
  readonly relayEvents: Readonly<Record<SessionAuditEvent['event'], number>>; readonly tipSha256: string | null;
  readonly roles: Readonly<Record<ViewRole, Readonly<Totals>>>;
  readonly usageReports: number; readonly capturedUsage: SessionResponseUsage;
  readonly pendingAppends: number; readonly pendingFilesystemOperations: number; readonly pendingCallbacks: number;
  readonly tail: 'durable-prefix' | 'Unknown'; readonly termination: 'open' | 'closed' | 'Unknown';
  readonly providerReceipts: 'Unknown'; readonly nativeSendCensus: 'Unknown'; readonly completeness: 'Unknown'; readonly hostileSameUidIsolation: 'Unknown';
  readonly limits: Limits;
}
export type UrlSessionAuditResult = { readonly ok: true; readonly scope: (role: ViewRole) => UrlSessionAuditScope;
  readonly append: (event: UrlSessionAuditEvent) => Promise<void>;
  readonly appendMachinePeer: (event: UrlMachinePeerAudit) => Promise<void>;
  readonly beginOrderedDesignAudit: (plan: OrderedDesignPlan, current: () => boolean | Promise<boolean>, observeRead?: (bytes: number) => void) => OrderedDesignAuditWriter;
  readonly commitLaunchHistory: (history: UrlLaunchHistoryCapability) => Promise<UrlCommittedLaunchHistory>;
  readonly commitDesignDelivery: (input: UrlDesignDeliveryAuditInput, waitForSample?: () => Promise<boolean>) => Promise<UrlDesignDeliveryView>;
  readonly revalidateDesignDelivery: (record: UrlDesignDeliveryAuditRecord, product: ValidatedUrlDesignProduct) => Promise<void>;
  readonly readDesignDeliveryView: (record: UrlDesignDeliveryAuditRecord, product: ValidatedUrlDesignProduct, observeRead?: (bytes: number) => void) => Promise<UrlDesignDeliveryView>;
  readonly commitDesignArtifactRead: (view: UrlDesignDeliveryView, receipt: UrlSessionToolReceiptMetadata) => Promise<void>;
  readonly readDesignReviewProof: (record: UrlDesignDeliveryAuditRecord, product: ValidatedUrlDesignProduct,
    admission: SessionAdmission) => Promise<UrlDesignReviewProof>;
  readonly readOrderedDesignReviewProof: (record: UrlDesignDeliveryAuditRecord, product: ValidatedUrlDesignProduct, writer: OrderedDesignAuditWriter, completion: OrderedDesignAuditReference) => Promise<UrlDesignReviewProof>;
  readonly commitOrderedDesignVerdict: (proof: UrlDesignReviewProof, checked: UrlCheckedDesignVerdict, terminal: OrderedDesignTerminalEvidence) => Promise<void>;
  readonly commitDesignVerdict: (proof: UrlDesignReviewProof, checked: UrlCheckedDesignVerdict, receipt: UrlSessionToolReceiptMetadata) => Promise<void>;
  readonly readDesignRenderContinuation: (record: UrlDesignDeliveryAuditRecord, product: ValidatedUrlDesignProduct,
    number: number) => Promise<UrlDesignRenderContinuation>;
  readonly prepareDesignRenderContinuation: (record: UrlDesignDeliveryAuditRecord, product: ValidatedUrlDesignProduct,
    number: number) => Promise<UrlDesignRenderContinuationFactory>;
  readonly close: () => Promise<UrlSessionAuditSummary>;
  readonly closedHistory: () => UrlSessionAuditHistoryExpected | null;
  readonly summary: () => UrlSessionAuditSummary }
  | { readonly ok: false; readonly code: 'url-session-audit-unavailable'; readonly summary: () => UrlSessionAuditSummary };

/** One serialized host writer, four new segments. Fsync proves only the checked
 * local prefix; it is neither a provider receipt nor a complete send census. */
export async function createUrlSessionAudit(given: UrlSessionAuditOptions): Promise<UrlSessionAuditResult> {
  let poisoned = false, closing = false, pending = 0, filesystem = 0, callbacks = 0, records = 0, durableBytes = 0, declarations = 0;
  let tip: string | null = null, limits: Limits = URL_SESSION_AUDIT_LIMITS;
  const relayEvents = Object.fromEntries(SESSION_RELAY_EVENTS.map(event => [event, 0])) as Record<SessionAuditEvent['event'], number>;
  const captured = zeroKinds(), totals = Object.fromEntries(ROLES.map(role => [role, { records: 0, bytes: 0, tipSha256: null, usageReports: 0, usage: zeroUsage() }])) as Record<ViewRole, Totals>;
  const handles = new Set<FileHandle>(), shutting = new Map<FileHandle, Promise<void>>();
  const summary = (): UrlSessionAuditSummary => copy({ format: URL_SESSION_AUDIT_FORMAT, closed: closing && handles.size === 0 && filesystem === 0 && callbacks === 0 && pending === 0,
    poisoned, durableRecords: records, durableBytes, declarations, captured, relayEvents, tipSha256: tip, roles: totals,
    usageReports: ROLES.reduce((n, r) => n + totals[r].usageReports, 0), capturedUsage: Object.fromEntries(Object.keys(zeroUsage()).map(k => [k, ROLES.reduce((n, r) => n + totals[r].usage[k as keyof SessionResponseUsage], 0)])) as unknown as SessionResponseUsage,
    pendingAppends: pending, pendingFilesystemOperations: filesystem, pendingCallbacks: callbacks, tail: poisoned ? 'Unknown' : 'durable-prefix',
    termination: closing ? (handles.size || filesystem || callbacks || pending ? 'Unknown' : 'closed') : 'open',
    providerReceipts: 'Unknown', nativeSendCensus: 'Unknown', completeness: 'Unknown', hostileSameUidIsolation: 'Unknown', limits });
  function poison(): never { poisoned = true; throw refused(); }
  const guard = (deadline: number): void => { if (poisoned || closing || performance.now() >= deadline) poison(); };
  const track = <T>(kind: 'filesystem' | 'callback', fn: () => Promise<T> | T): Promise<T> => {
    if (kind === 'filesystem') filesystem++; else callbacks++;
    return Promise.resolve().then(fn).finally(() => { if (kind === 'filesystem') filesystem--; else callbacks--; });
  };
  const wait = async <T>(operation: Promise<T>, deadline: number): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try { return await Promise.race([operation, new Promise<never>((_, reject) => {
      timer = setTimeout(() => { poisoned = true; reject(refused()); }, Math.max(1, deadline - performance.now()));
    })]); } finally { clearTimeout(timer); }
  };
  const shut = (handle: FileHandle): Promise<void> => {
    const old = shutting.get(handle); if (old) return old;
    const operation = track('filesystem', () => handle.close()).then(() => { handles.delete(handle); }, () => { poisoned = true; });
    shutting.set(handle, operation); return operation;
  };
  let queue = Promise.resolve();
  let verifyOnClose: ((deadline: number) => Promise<void>) | undefined;
  let closeOperation: Promise<UrlSessionAuditSummary> | undefined;
  const close = (): Promise<UrlSessionAuditSummary> => {
    if (closing && handles.size === 0 && filesystem === 0 && callbacks === 0 && pending === 0) return Promise.resolve(summary());
    if (closeOperation) return closeOperation;
    closing = true; const deadline = performance.now() + limits.milliseconds;
    closeOperation = (async () => {
      try { await wait(queue, deadline); if (!poisoned && verifyOnClose) await verifyOnClose(deadline); } catch { poisoned = true; }
      try { await wait(Promise.all([...handles].map(shut)), deadline); } catch { poisoned = true; }
      return summary();
    })().finally(() => { closeOperation = undefined; });
    return closeOperation;
  };
  try {
    // Retain genuine profile identity for history binding. Snapshot the audit
    // options and callback ports before the first await.
    if (!Array.isArray(given.profiles) || given.profiles.length !== ROLES.length) poison();
    const profiles = [given.profiles[0]!, given.profiles[1]!, given.profiles[2]!, given.profiles[3]!];
    const input = copy({ parent: given.parent, name: given.name, binding: given.binding, originPolicySha256: given.originPolicySha256,
      project: given.project, pin: given.pin, principal: given.principal, declaredClasses: given.declaredClasses, limits: given.limits ?? {},
      ...(given.deadline === undefined ? {} : { deadline: given.deadline }),
      ...(given.firstDesignRound === undefined ? {} : { firstDesignRound: given.firstDesignRound }) });
    const current = given.current, screenBody = given.screen.screenBody, screenSecrets = given.screen.screenSecrets, policy = given.screen.policySha256;
    if (!exact(given, ['parent', 'name', 'binding', 'originPolicySha256', 'project', 'pin', 'principal', 'profiles', 'declaredClasses', 'screen', 'current', ...(given.limits === undefined ? [] : ['limits']), ...(given.deadline === undefined ? [] : ['deadline']), ...(given.firstDesignRound === undefined ? [] : ['firstDesignRound'])])
      || !exact(input.binding, ['run', 'sourceBinding', 'policy', 'provider', 'model']) || !Object.values(input.binding).every(id)
      || (input.deadline !== undefined && (!Number.isSafeInteger(input.deadline) || input.deadline <= Date.now()))
      || (input.firstDesignRound !== undefined && (!count(input.firstDesignRound, 999_999) || input.firstDesignRound < 1))
      || !hex(input.binding.sourceBinding) || !hex(input.binding.policy) || input.binding.policy !== policy || !hex(input.originPolicySha256)
      || !id(input.project) || !id(input.principal) || typeof input.pin !== 'string' || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(input.pin)
      || typeof input.parent !== 'string' || !path.isAbsolute(input.parent) || path.resolve(input.parent) !== input.parent
      || typeof input.name !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/u.test(input.name)
      || !Array.isArray(input.declaredClasses) || !input.declaredClasses.length || input.declaredClasses.length > SESSION_CONTENT_CLASSES.length
      || new Set(input.declaredClasses).size !== input.declaredClasses.length || input.declaredClasses.some(c => !one(c, SESSION_CONTENT_CLASSES))
      || [current, screenBody, screenSecrets].some(f => typeof f !== 'function') || !exact(input.limits, Object.keys(input.limits))
      || Object.entries(input.limits).some(([key, value]) => !Object.hasOwn(URL_SESSION_AUDIT_LIMITS, key) || !count(value, URL_SESSION_AUDIT_LIMITS[key as keyof Limits]) || value === 0)) poison();
    limits = Object.freeze({ ...URL_SESSION_AUDIT_LIMITS, ...input.limits });
    const safe = (value: unknown): void => {
      const fields: string[] = [], values: string[] = [];
      const field = (s: string): void => { if (Buffer.from(s).toString('utf8') !== s || /[\u0000-\u001f\u007f]/u.test(s)
        || screenBody(s) !== undefined || screenSecrets(s) !== undefined) poison(); fields.push(s); };
      const walk = (v: unknown): void => {
        if (typeof v === 'string') { field(v); values.push(v); }
        else if (typeof v === 'number' || typeof v === 'boolean') values.push(JSON.stringify(v));
        else if (Array.isArray(v)) for (const child of v) walk(child);
        else if (isRecord(v)) for (const [key, child] of Object.entries(v)) { field(key); walk(child); }
      };
      field(canonical(value)); walk(value);
      for (const joined of [fields.join(''), values.join('')]) if (screenBody(joined) !== undefined || screenSecrets(joined) !== undefined) poison();
    };
    safe(input);
    const scopes = new Map<ViewRole, UrlSessionAuditScope>();
    const roleProfiles = new Map<ViewRole, NativeSessionProfile>();
    if (profiles.length !== ROLES.length) poison();
    for (const profile of profiles) {
      if (!isNativeSessionProfile(profile) || !one(profile.input.binding.role, ROLES) || scopes.has(profile.input.binding.role as ViewRole)
        || !equal(profile.input.binding, { ...input.binding, role: profile.input.binding.role }) || !hex(profile.digest)) poison();
      const role = profile.input.binding.role as ViewRole;
      roleProfiles.set(role, profile);
      scopes.set(role, copy({ binding: profile.input.binding, originPolicySha256: input.originPolicySha256, profileSha256: profile.digest }));
    }
    const designProfile = roleProfiles.get('design');
    const orderedDesignProfile = isOrderedDesignSessionProfile(designProfile) ? designProfile : null;
    const checkCurrent = async (deadline: number): Promise<void> => {
      guard(deadline); if (await wait(track('callback', current), deadline) !== true) poison(); guard(deadline);
    };
    const io = async <T>(deadline: number, fn: () => Promise<T>, cleanup = false): Promise<T> => {
      // Closing verifies the historical physical prefix only; it grants no new
      // act and must still release descriptors after the run becomes stale.
      if (!cleanup) await checkCurrent(deadline);
      const result = await wait(track('filesystem', fn), deadline);
      if (!cleanup) { guard(deadline); await checkCurrent(deadline); }
      else if (poisoned || performance.now() >= deadline) poison();
      return result;
    };
    const acquire = (deadline: number, fn: () => Promise<FileHandle>): Promise<FileHandle> => io(deadline, async () => {
      const handle = await fn(); handles.add(handle);
      if (poisoned || closing) { void shut(handle); throw refused(); } return handle;
    });
    const began = performance.now() + limits.milliseconds;
    await checkCurrent(began); if (await io(began, () => realpath(input.parent)) !== input.parent) poison();
    const directory = await acquire(began, () => open(input.parent, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW));
    const directoryStat = await io(began, () => directory.stat({ bigint: true }));
    if (!directoryStat.isDirectory() || directoryStat.uid !== BigInt(process.getuid?.() ?? -1) || (directoryStat.mode & 0o777n) !== 0o700n) poison();
    type Stat = typeof directoryStat;
    interface Segment { readonly file: FileHandle; readonly name: string; readonly initial: Stat; prefix: Buffer; modified: bigint; changed: bigint }
    const segments = new Map<ViewRole, Segment>();
    const sameDirectory = (s: Stat): boolean => s.isDirectory() && s.dev === directoryStat.dev && s.ino === directoryStat.ino && s.uid === directoryStat.uid && s.mode === directoryStat.mode;
    type SegmentPrefix = Pick<Segment, 'prefix' | 'modified' | 'changed'>;
    interface ManagedAppend {
      readonly role: ViewRole; readonly prefix: Buffer; full: SegmentPrefix | null;
    }
    let managedAppend: ManagedAppend | undefined;
    const sameSegmentIdentity = (segment: Segment, stat: Stat): boolean => stat.isFile() && stat.dev === segment.initial.dev
      && stat.ino === segment.initial.ino && stat.uid === segment.initial.uid && stat.mode === segment.initial.mode && stat.nlink === 1n;
    const sameSegment = (segment: Segment, expected: SegmentPrefix, stat: Stat): boolean => sameSegmentIdentity(segment, stat)
      && stat.size === BigInt(expected.prefix.length) && stat.mtimeNs === expected.modified && stat.ctimeNs === expected.changed;
    // The caller brackets a complete read-only prefix check with currentness.
    const inspectIdentities = async (deadline: number, changed?: SegmentPrefix & { readonly role: ViewRole }, cleanup = false): Promise<void> => {
      const inspect = async <T>(fn: () => Promise<T>): Promise<T> => {
        const value = await fn();
        if (cleanup) { if (poisoned || performance.now() >= deadline) poison(); }
        else guard(deadline);
        return value;
      };
      if (await inspect(() => realpath(input.parent)) !== input.parent
        || !sameDirectory(await inspect(() => lstat(input.parent, { bigint: true })))
        || !sameDirectory(await inspect(() => directory.stat({ bigint: true })))) poison();
      for (const [role, segment] of segments) {
        const expected = changed?.role === role ? changed : segment;
        for (const stat of [await inspect(() => segment.file.stat({ bigint: true })), await inspect(() => lstat(path.join(input.parent, segment.name), { bigint: true }))]) {
          if (!sameSegment(segment, expected, stat)) poison();
        }
        const buffer = Buffer.alloc(Math.min(65_536, Math.max(1, expected.prefix.length))); let offset = 0;
        while (offset < expected.prefix.length) {
          const wanted = Math.min(buffer.length, expected.prefix.length - offset);
          const read = await inspect(() => segment.file.read(buffer, 0, wanted, offset));
          if (read.bytesRead !== wanted || !buffer.subarray(0, wanted).equals(expected.prefix.subarray(offset, offset + wanted))) poison();
          offset += wanted;
        }
      }
    };
    for (const role of ROLES) {
      const name = `${input.name}-${role}.jsonl`;
      const file = await acquire(began, () => open(`/proc/self/fd/${directory.fd}/${name}`, constants.O_RDWR | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW | constants.O_APPEND, 0o600));
      const stat = await io(began, () => file.stat({ bigint: true }));
      if (!stat.isFile() || stat.uid !== directoryStat.uid || (stat.mode & 0o777n) !== 0o600n || stat.nlink !== 1n || stat.size !== 0n) poison();
      segments.set(role, { file, name, initial: stat, prefix: Buffer.alloc(0), modified: stat.mtimeNs, changed: stat.ctimeNs });
    }
    await io(began, () => directory.sync()); await io(began, () => inspectIdentities(began));
    verifyOnClose = deadline => io(deadline, () => inspectIdentities(deadline, undefined, true), true);
    const classes = (v: unknown): void => {
      if (!Array.isArray(v) || v.length === 0 || v.length > SESSION_CONTENT_CLASSES.length || new Set(v).size !== v.length
        || v.some(c => !one(c, SESSION_CONTENT_CLASSES) || !input.declaredClasses.includes(c as SessionContentClass))) poison();
    };
    const origins = (v: unknown): void => { if (!Array.isArray(v) || !v.length || v.length > 128 || new Set(v).size !== v.length || v.some(s => !id(s))) poison(); };
    const admission = (v: unknown): void => {
      if (!exact(v, ['digest', 'bytes', 'classes', 'originIds']) || !hex(v.digest) || !count(v.bytes, 2_097_152)) poison(); classes(v.classes); origins(v.originIds);
    };
    const toolReceipt = (p: unknown): void => {
      if (!exact(p, ['id', 'toolName', 'inputSha256', 'digest', 'bytes', 'classes', 'originIds']) || !id(p.id)
        || !one(p.toolName, TOOLS.map(tool => `mcp__syzygy__${tool}`)) || !hex(p.inputSha256) || !hex(p.digest) || !count(p.bytes, 2_097_152)) poison();
      classes(p.classes); origins(p.originIds);
    };
    const usage = (v: unknown): void => { if (!exact(v, Object.keys(zeroUsage())) || Object.values(v).some(n => !count(n))) poison(); };
    const project = (event: unknown, privateKind: PrivateEventKind | null): CapturedAuditEvent => {
      if (!exact(event, ['kind', 'role', 'scope', 'payload']) || !one(event.kind, KINDS) || !one(event.role, ROLES)
        || !equal(event.scope, scopes.get(event.role as ViewRole))) poison();
      const p = event.payload, role = event.role as ViewRole;
      switch (event.kind) {
        case 'relay': {
          if (!exact(p, ['event', 'subject', 'requestId', 'at', 'credentialIdentity', 'exposureMode', 'governingRule', 'admission', 'received',
            'route', 'consumedToolResults', 'response', 'outcome', 'status'])
            || !one(p.event, SESSION_RELAY_EVENTS)
            || !exact(p.subject, ['binding', 'project', 'pin', 'principal']) || !equal(p.subject.binding, scopes.get(role)!.binding)
            || p.subject.project !== input.project || p.subject.pin !== input.pin || p.subject.principal !== input.principal
            || typeof p.requestId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u.test(p.requestId)
            || typeof p.at !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(p.at) || new Date(p.at).toISOString() !== p.at
            || p.credentialIdentity !== 'Unknown' || p.exposureMode !== 'private-local-cli' || p.governingRule !== 'GOVERNANCE-SIMPLIFICATION-D10'
            || (p.status !== null && (!count(p.status, 599) || p.status < 100))
            || (p.route !== null && !one(p.route, ['messages', SESSION_COUNT_TOKENS_PATH]))) poison();
          if (p.admission !== null) admission(p.admission);
          if (p.received !== null && (!exact(p.received, ['digest', 'bytes']) || !hex(p.received.digest) || !count(p.received.bytes, 2_097_152))) poison();
          const tokenCount = p.route === SESSION_COUNT_TOKENS_PATH;
          if (!Array.isArray(p.consumedToolResults) || p.consumedToolResults.length > (tokenCount ? 0 : 1)) poison();
          if (tokenCount && role === 'design' && orderedDesignProfile !== null && p.event !== 'attempt-refused' && p.event !== 'transport-failed') poison();
          for (const result of p.consumedToolResults as unknown[]) {
            if (!exact(result, ['receiptId', 'toolUseId', 'digest', 'bytes']) || typeof result.receiptId !== 'string' || !/^tool-[0-9a-f]{64}$/u.test(result.receiptId)
              || !providerToolId(result.toolUseId) || !hex(result.digest) || !count(result.bytes, 2_097_152) || result.bytes === 0
              || !isRecord(p.admission) || !Array.isArray(p.admission.originIds) || !p.admission.originIds.includes(result.receiptId)) poison();
          }
          const expected = { 'attempt-allowed': 'allowed', 'attempt-refused': 'refused', 'send-attempt': 'attempted',
            'send-outcome': 'local-request-flushed', 'transport-failed': 'Unknown', 'response-refused': 'refused', 'response-admitted': 'response-admitted' };
          if (p.outcome !== expected[p.event as keyof typeof expected] || !p.event.startsWith('response-') && p.status !== null
            || (p.event === 'attempt-allowed' || p.event.startsWith('send-') || p.event.startsWith('response-'))
              && (p.admission === null || p.received === null || p.route === null)
            || p.event !== 'response-admitted' && p.response !== null) poison();
          if (p.event === 'response-admitted') {
            const response = p.response;
            if (p.status !== 200) poison();
            if (tokenCount) {
              if (!exact(response, ['digest', 'bytes', 'content', 'estimatedInputTokens']) || !hex(response.digest)
                || !count(response.bytes, SESSION_COUNT_RESPONSE_MAX_BYTES) || response.bytes === 0
                || response.content !== 'count-tokens-json' || !isSessionTokenCount(response.estimatedInputTokens)) poison();
              break;
            }
            if (!exact(response, ['digest', 'bytes', 'content', 'stopReason', 'textBlocks', 'tool'])
              || !hex(response.digest) || !count(response.bytes, 8_388_608) || response.bytes === 0
              || !one(response.content, ['messages-json', 'messages-event-stream'])
              || !one(response.stopReason, ['end_turn', 'tool_use', 'max_tokens', 'stop_sequence'])
              || !count(response.textBlocks, 64) || (response.tool === null ? response.textBlocks === 0 : response.textBlocks >= 64)
              || (response.stopReason === 'tool_use') !== (response.tool !== null)) poison();
            if (response.tool !== null && (!exact(response.tool, ['id', 'name', 'inputSha256'])
              || !providerToolId(response.tool.id) || !one(response.tool.name, SESSION_TOOLS) || !hex(response.tool.inputSha256))) poison();
          }
          break;
        }
        case 'control': {
          if (!isRecord(p) || !one(p.event, ['control-published', 'clarification-question', 'clarification-answer'])) poison();
          if (p.event === 'control-published') {
            if (!exact(p, ['event', 'role', 'eventSha256', 'eventBytes']) || p.role !== role || !hex(p.eventSha256) || !count(p.eventBytes, 65_536)) poison();
          } else {
            if (role !== 'author' || !hex(p.questionSha256) || !hex(p.nonceSha256)) poison();
            if (p.event === 'clarification-question') {
              if (!exact(p, ['event', 'questionSha256', 'questionBytes', 'nonceSha256', 'questionNumber']) || !count(p.questionBytes, 65_536) || !count(p.questionNumber, 1000) || p.questionNumber === 0) poison();
            } else if (!exact(p, ['event', 'questionSha256', 'answerSha256', 'answerBytes', 'nonceSha256', 'answerKind']) || !hex(p.answerSha256)
              || !count(p.answerBytes, 8192) || !one(p.answerKind, CLARIFICATION_ANSWER_KINDS)) poison();
          } break;
        }
        case 'launch-attempt':
          if (!exact(p, ['event', 'profileSha256', 'commandSha256', 'viewSha256', 'limits']) || p.event !== 'session-launch-attempt'
            || p.profileSha256 !== scopes.get(role)!.profileSha256 || !hex(p.commandSha256) || !hex(p.viewSha256)
            || !exact(p.limits, LAUNCH_LIMIT_KEYS) || Object.values(p.limits).some(value => !count(value) || value === 0)) poison(); break;
        case 'launch-history':
          if (privateKind !== 'launch-history' || role === 'author' || !exact(p, ['file', 'recordSha256', 'recordBytes', 'promptRecordSha256', 'promptSha256', 'sessionId'])
            || !isUrlHelperLaunchFile(role, p.file) || !hex(p.recordSha256) || !count(p.recordBytes, 2_097_152) || p.recordBytes === 0
            || !hex(p.promptRecordSha256) || !hex(p.promptSha256) || !id(p.sessionId)) poison();
          break;
        case 'design-delivery':
          if (privateKind !== 'design-delivery' || role !== 'design') poison();
          break;
        case 'design-ordered':
          // Only the ordered writer can enqueue a prefix-verified record.
          if (privateKind !== 'design-ordered' || role !== 'design' || orderedDesignProfile === null) poison();
          break;
        case 'before-tool':
          if (!exact(p, ['tool', 'inputSha256']) || !one(p.tool, TOOLS) || !hex(p.inputSha256)) poison(); break;
        case 'machine-peer':
          if (privateKind !== 'machine-peer' || !exact(p, ['event', 'clientId', 'instanceId', 'revision', 'runId', 'role', 'operation', 'processIdentitySha256', 'channelIdentitySha256', 'at'])
            || p.event !== 'machine-peer-effect' || !id(p.clientId) || !id(p.instanceId) || !count(p.revision) || p.revision === 0 || p.runId !== input.binding.run || p.role !== role
            || !one(p.operation, ['source_read', 'artifact_read', 'artifact_write', 'dossier_step', 'inference-forward'])
            || !hex(p.processIdentitySha256) || !hex(p.channelIdentitySha256) || !count(p.at) || p.at > Date.now()) poison();
          break;
        case 'ordered-design-verdict':
          if (privateKind !== 'ordered-design-verdict' || role !== 'design' || !exact(p, ['deliverySha256', 'terminal', 'checked'])
            || !hex(p.deliverySha256) || !isRecord(p.terminal) || !exact(p.checked, ['number', 'checkSha256', 'verdictSha256'])
            || !count(p.checked.number, 999_999) || !hex(p.checked.checkSha256) || !hex(p.checked.verdictSha256)) poison();
          break;
        case 'design-verdict':
          if (privateKind !== 'design-verdict' || role !== 'design'
            || !exact(p, ['deliverySha256', 'artifactReadId', 'relayResponseSha256', 'verdictCallId', 'checked', 'toolReceipt'])
            || !hex(p.deliverySha256) || typeof p.artifactReadId !== 'string' || !/^tool-[a-f0-9]{64}$/u.test(p.artifactReadId)
            || !hex(p.relayResponseSha256) || !providerToolId(p.verdictCallId)
            || !exact(p.checked, ['number', 'checkSha256', 'verdictSha256']) || !count(p.checked.number, 999_999)
            || !hex(p.checked.checkSha256) || !hex(p.checked.verdictSha256)
            || !isRecord(p.toolReceipt) || p.toolReceipt['toolName'] !== 'mcp__syzygy__dossier_step') poison();
          toolReceipt(p.toolReceipt); break;
        case 'tool-receipt': toolReceipt(p); break;
        case 'usage': usage(p); break;
        case 'launch-terminal': {
          if (!exact(p, ['outcome', 'exitCode', 'signal', 'viewTermination', 'groupTermination', 'toolTermination', 'pendingInvocations', 'stdout', 'stderr', 'sampledStorageBytes', 'peakProcesses', 'aggregateEnforcement', 'betweenSamples'])
            || !one(p.outcome, ['exited', 'launch-refused', 'stopped', 'wall-limit', 'output-limit', 'storage-limit', 'process-limit', 'inspection-failed'])
            || (p.exitCode !== null && !count(p.exitCode, 255)) || (p.signal !== null && !one(p.signal, SIGNALS))
            || !one(p.viewTermination, ['view-exited', 'Unknown']) || !one(p.groupTermination, ['confirmed', 'Unknown']) || !one(p.toolTermination, ['settled', 'Unknown'])
            || p.toolTermination === 'settled' && p.pendingInvocations !== 0
            || p.exitCode !== null && p.signal !== null || (p.pendingInvocations !== null && !count(p.pendingInvocations)) || (p.sampledStorageBytes !== null && !count(p.sampledStorageBytes))
            || (p.peakProcesses !== null && !count(p.peakProcesses)) || p.aggregateEnforcement !== 'sampled-stop-only' || p.betweenSamples !== 'Unknown') poison();
          for (const stream of [p.stdout, p.stderr]) if (!exact(stream, ['bytes', 'sha256']) || !count(stream.bytes) || !hex(stream.sha256)) poison();
          break;
        }
        default: poison();
      }
      safe(event); return event as unknown as CapturedAuditEvent;
    };
    const attempts = new Map<ViewRole, { readonly commandSha256: string; readonly viewSha256: string }>();
    const historyRoles = new Set<UrlLaunchHistoryRole>();
    const relayRequests = new Set<string>();
    type DurableEvent = { readonly offset: number; readonly bytes: Buffer; readonly digest: string };
    const relayLatest = new Map<ViewRole, { readonly payload: SessionAuditEvent; readonly events: readonly DurableEvent[] }>();
    const commit = async (event: unknown, role: ViewRole, deadline: number, declaration: boolean,
      checkEffectCurrent = checkCurrent): Promise<DurableEvent> => {
      guard(deadline); if (!declaration && records - declarations >= limits.events) poison();
      const segment = segments.get(role)!;
      const body = { format: URL_SESSION_AUDIT_FORMAT, sequence: records + 1, roleSequence: totals[role].records + 1,
        previousSha256: tip, previousRoleSha256: totals[role].tipSha256, event };
      const digest = sha256(canonical(body, limits.eventBytes)); const encoded = canonical({ ...body, sha256: digest }, limits.eventBytes); safe({ ...body, sha256: digest });
      const offset = segment.prefix.length, bytes = Buffer.from(encoded + '\n'); if (durableBytes + bytes.length > limits.bytes) poison();
      let nextUsage: SessionResponseUsage | undefined;
      if (isRecord(event) && event.kind === 'usage') {
        const reported = event.payload as SessionResponseUsage;
        nextUsage = Object.fromEntries(Object.keys(zeroUsage()).map(k => [k, totals[role].usage[k as keyof SessionResponseUsage] + reported[k as keyof SessionResponseUsage]])) as unknown as SessionResponseUsage;
        usage(nextUsage);
        for (const key of Object.keys(zeroUsage()) as (keyof SessionResponseUsage)[]) if (!count(ROLES.reduce((n, r) => n + (r === role ? nextUsage![key] : totals[r].usage[key]), 0))) poison();
      }
      const intent: ManagedAppend = { role, prefix: Buffer.concat([segment.prefix, bytes]), full: null };
      try {
        const tail = await io(deadline, async (): Promise<SegmentPrefix> => {
          // Each sample after a filesystem stage also admits the next stage.
          await inspectIdentities(deadline);
          await checkEffectCurrent(deadline);
          const writerFd = segment.file.fd, name = `/proc/self/fd/${directory.fd}/${segment.name}`;
          if (!sameSegment(segment, segment, fstatSync(writerFd, { bigint: true }))
            || !sameSegment(segment, segment, lstatSync(name, { bigint: true }))) poison();
          // Stage the exact append before the underlying write can change the
          // extent. The new event becomes durable only after both syncs.
          managedAppend = intent;
          const wrote = await segment.file.write(bytes, 0, bytes.length, null);
          guard(deadline);
          if (wrote.bytesWritten !== bytes.length) poison();
          const stat = fstatSync(writerFd, { bigint: true });
          if (!sameSegmentIdentity(segment, stat) || stat.size !== BigInt(intent.prefix.length)
            || (intent.full !== null && !sameSegment(segment, intent.full, stat))) poison();
          const full = { prefix: intent.prefix, modified: stat.mtimeNs, changed: stat.ctimeNs };
          intent.full = full;
          await checkEffectCurrent(deadline);
          await segment.file.sync();
          await checkEffectCurrent(deadline);
          await directory.sync();
          await checkEffectCurrent(deadline);
          await inspectIdentities(deadline, { ...full, role });
          if (checkEffectCurrent !== checkCurrent) await checkEffectCurrent(deadline);
          return full;
        });
        guard(deadline);
        segment.prefix = tail.prefix; segment.modified = tail.modified; segment.changed = tail.changed;
      } finally { managedAppend = undefined; }
      records++; durableBytes += bytes.length; tip = digest; totals[role].records++; totals[role].bytes += bytes.length; totals[role].tipSha256 = digest;
      if (declaration) declarations++; else {
        const capturedEvent = event as CapturedAuditEvent; captured[capturedEvent.kind]++;
        if (capturedEvent.kind === 'relay') relayEvents[capturedEvent.payload.event]++;
        if (capturedEvent.kind === 'launch-attempt') attempts.set(role, capturedEvent.payload);
      }
      if (nextUsage) { totals[role].usageReports++; totals[role].usage = nextUsage; }
      return { offset, bytes, digest };
    };
    async function commitRelay(snapshot: Extract<UrlSessionAuditEvent, { kind: 'relay' }>, deadline: number) {
      const { payload, role } = snapshot;
      const previous = relayLatest.get(role);
      let earlierEvents: readonly DurableEvent[] = [];
      if (previous?.payload.requestId === payload.requestId) {
        if (!RELAY_TRANSITIONS[previous.payload.event].includes(payload.event)
          || !equal(previous.payload.admission, payload.admission) || !equal(previous.payload.received, payload.received)
          || !equal(previous.payload.consumedToolResults, payload.consumedToolResults) || previous.payload.route !== payload.route) poison();
        earlierEvents = previous.events;
      } else if (relayRequests.has(payload.requestId) || !['attempt-allowed', 'attempt-refused', 'transport-failed'].includes(payload.event)
        || (previous && ['attempt-allowed', 'send-attempt', 'send-outcome'].includes(previous.payload.event))) {
        poison();
      }
      const linked = { ...snapshot, payload: { ...payload, previousExchangeSha256: earlierEvents.at(-1)?.digest ?? null } };
      const record = await commit(linked, role, deadline, false);
      relayRequests.add(payload.requestId);
      relayLatest.set(role, { payload, events: [...earlierEvents, record] });
      return record;
    }
    const declarationsByRole = Object.fromEntries(ROLES.map(role => [role, {
      scope: scopes.get(role)!,
      payload: { project: input.project, pin: input.pin, principal: input.principal, declaredClasses: input.declaredClasses,
        profile: roleProfiles.get(role)!.id, limits, capture: 'host-callbacks-only', providerReceipts: 'Unknown', nativeSendCensus: 'Unknown' },
    }])) as UrlSessionAuditHistoryExpected['declarations'];
    for (const role of ROLES) await commit({ kind: 'declaration', role, ...declarationsByRole[role] }, role, began, true);
    const unstartedOrdered = new Map<string, UrlOrderedDesignHistoryExpected>();
    const stoppedOrderedHistory: (() => UrlOrderedDesignHistoryExpected | null)[] = [];
    const closedHistory = (): UrlSessionAuditHistoryExpected | null => {
      const captured = summary();
      if (!captured.closed || captured.poisoned || captured.tail !== 'durable-prefix' || captured.tipSha256 === null
        || captured.declarations !== ROLES.length || ROLES.some(role => captured.roles[role].tipSha256 === null)) return null;
      const roles = Object.fromEntries(ROLES.map(role => {
        const { records, bytes, tipSha256 } = captured.roles[role];
        return [role, { records, bytes, tipSha256: tipSha256! }];
      })) as UrlSessionAuditHistoryExpected['roles'];
      const ordered: UrlOrderedDesignHistoryExpected[] = [...unstartedOrdered.values()];
      for (const read of stoppedOrderedHistory) {
        const item = read();
        if (item === null) return null;
        ordered.push(item);
      }
      ordered.sort((left, right) => left.plan.manifest.binding.transferEpoch - right.plan.manifest.binding.transferEpoch);
      return deepFreeze({ durableRecords: captured.durableRecords, durableBytes: captured.durableBytes, tipSha256: captured.tipSha256,
        roles, declarations: declarationsByRole, ...(ordered.length === 0 ? {} : { ordered }) });
    };
    const enqueue = (event: CapturedAuditEvent, privateKind: PrivateEventKind | null, checkEffectCurrent = checkCurrent) => {
      const deadline = performance.now() + limits.milliseconds;
      let snapshot: CapturedAuditEvent;
      try { guard(deadline); if (pending >= limits.pending) poison(); snapshot = project(copy(event, limits.eventBytes), privateKind); }
      catch { poisoned = true; return Promise.reject(refused()); }
      pending++;
      const operation = queue.then(() => snapshot.kind === 'relay' ? commitRelay(snapshot, deadline)
        : commit(snapshot, snapshot.role, deadline, false, checkEffectCurrent)).catch(() => poison());
      queue = operation.then(() => {}, () => {}).finally(() => { pending--; });
      return wait(operation, deadline).then(result => { guard(deadline); return result; }, () => poison());
    };
    // A pending write may expose the unchanged prefix or its exact complete
    // append. A short write has no supported intermediate extent. An event
    // can authenticate a product only inside the already durable prefix.
    const verifyDurableEvent = (role: ViewRole, event: DurableEvent, observeRead?: (bytes: number) => void): Buffer => {
      if (poisoned) throw refused();
      const intent = managedAppend, writer = intent && segments.get(intent.role)!;
      let extent: SegmentPrefix | undefined;
      if (intent && writer) {
        const stat = fstatSync(writer.file.fd, { bigint: true });
        if (intent.full) extent = intent.full;
        else if (sameSegment(writer, writer, stat)) extent = writer;
        else {
          if (!sameSegmentIdentity(writer, stat) || stat.size !== BigInt(intent.prefix.length)) throw refused();
          extent = { prefix: intent.prefix, modified: stat.mtimeNs, changed: stat.ctimeNs };
        }
      }
      const expected = (name: ViewRole, segment: Segment): SegmentPrefix => intent?.role === name && extent ? extent : segment;
      const fd = openSync(input.parent, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
      try {
        const anchor = `/proc/self/fd/${fd}`;
        const verifyDirectory = (): void => {
          if (!sameDirectory(fstatSync(fd, { bigint: true })) || !sameDirectory(lstatSync(input.parent, { bigint: true }))
            || realpathSync(input.parent) !== input.parent) throw refused();
        };
        const verifyNames = (): void => {
          for (const [name, segment] of segments) {
            if (!sameSegment(segment, expected(name, segment), lstatSync(path.join(anchor, segment.name), { bigint: true }))) throw refused();
          }
        };
        verifyDirectory(); verifyNames();
        if (writer && extent) {
          const writerFd = writer.file.fd;
          if (!sameSegment(writer, extent, fstatSync(writerFd, { bigint: true }))) throw refused();
          const chunk = Buffer.alloc(Math.min(65_536, extent.prefix.length));
          for (let offset = 0; offset < extent.prefix.length; offset += chunk.length) {
            const end = Math.min(offset + chunk.length, extent.prefix.length), length = end - offset;
            const read = readSync(writerFd, chunk, 0, length, offset); observeRead?.(read);
            if (read !== length
              || !chunk.subarray(0, length).equals(extent.prefix.subarray(offset, end))) throw refused();
          }
          if (!sameSegment(writer, extent, fstatSync(writerFd, { bigint: true }))) throw refused();
        }
        const segment = segments.get(role)!;
        if (event.offset + event.bytes.length > segment.prefix.length) throw refused();
        const file = openSync(path.join(anchor, segment.name), constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
        try {
          const bytes = Buffer.alloc(event.bytes.length), prefix = expected(role, segment);
          if (!sameSegment(segment, prefix, fstatSync(file, { bigint: true }))) throw refused();
          const read = readSync(file, bytes, 0, bytes.length, event.offset); observeRead?.(read);
          if (read !== bytes.length || !bytes.equals(event.bytes)
            || !sameSegment(segment, prefix, fstatSync(file, { bigint: true }))) throw refused();
          verifyNames(); verifyDirectory();
          // A checked full extent fixes its stamp while the write promise is
          // outstanding. A later read or completion cannot accept new drift.
          if (intent && extent?.prefix === intent.prefix) intent.full = extent;
          return bytes;
        } finally { closeSync(file); }
      } finally { closeSync(fd); }
    };
    // Fresh repair rounds use distinct monotonic attempt cursors; no uncertain
    // provider call is replayed and no durable cursor is reopened after loss.
    const firstDesignRound = input.firstDesignRound ?? 1;
    let nextOrderedEpoch = firstDesignRound;
    let previousOrdered: OrderedDesignAuditWriter | undefined;
    const capturedDeliveries = new Map<string, UrlDesignDeliveryAuditRecord>();
    const eligibleOrdered = new WeakMap<OrderedDesignAuditWriter, UrlOrderedDesignHistoryExpected>();
    const orderedWriters = new WeakMap<OrderedDesignAuditWriter, { plan: OrderedDesignPlan; records: Array<{ record: OrderedDesignStoredRecord; read: (charge?: boolean) => Uint8Array }>; observeRead?: (bytes: number) => void }>();
    const beginOrderedDesignAudit: Extract<UrlSessionAuditResult, { ok: true }>['beginOrderedDesignAudit'] = (plan, attemptCurrent, observeRead) => {
      if (poisoned || closing || orderedDesignProfile === null || typeof attemptCurrent !== 'function'
        || !isOrderedDesignPlanFor(plan, orderedDesignProfile.transcript.partition)) throw refused();
      const { binding } = plan.manifest;
      if (binding.project !== input.project || binding.pin !== input.pin || binding.originPolicySha256 !== input.originPolicySha256
        || binding.transferEpoch !== nextOrderedEpoch || binding.round !== nextOrderedEpoch
        || (previousOrdered !== undefined && !(hasReadOrderedDesignTerminal(previousOrdered)
          || orderedWriters.get(previousOrdered)!.records.at(-1)?.record.kind === 'retired'))) throw refused();
      const scope = scopes.get('design')!;
      const attemptDeadline = Date.parse(binding.deadline);
      const checkAttemptCurrent = async (deadline: number): Promise<void> => {
        if (!(Date.now() < attemptDeadline)) throw refused();
        await checkCurrent(deadline);
        const allowed = await wait(track('callback', attemptCurrent), deadline);
        await checkCurrent(deadline);
        if (allowed !== true || !(Date.now() < attemptDeadline)) throw refused();
      };
      const held: Array<{ record: OrderedDesignStoredRecord; read: (charge?: boolean) => Uint8Array }> = [];
      const writer = createOrderedDesignAuditWriter({ profile: orderedDesignProfile, plan, principal: input.principal }, {
        current: async () => { await checkAttemptCurrent(performance.now() + limits.milliseconds); return true; },
        append: async record => {
          const event = await enqueue({ kind: 'design-ordered', role: 'design', scope, payload: record }, 'design-ordered', checkAttemptCurrent);
          const read = () => {
            const bytes = verifyDurableEvent('design', event, observeRead);
            const row = parseBoundedJson(bytes.toString('utf8'), { maxBytes: limits.eventBytes + 1, maxNodes: 4096, maxDepth: 12 });
            if (!isRecord(row) || !isRecord(row.event) || row.event.kind !== 'design-ordered') throw refused();
            return Buffer.from(canonical(row.event.payload, limits.eventBytes));
          };
          // Keep a separate protected reader for subsequent normal producer/render checks.
          held.push({ record, read: charge => {
            const bytes = verifyDurableEvent('design', event, charge ? observeRead : undefined);
            const row = parseBoundedJson(bytes.toString('utf8'), { maxBytes: limits.eventBytes + 1, maxNodes: 4096, maxDepth: 12 });
            if (!isRecord(row) || !isRecord(row.event) || row.event.kind !== 'design-ordered') throw refused();
            return Buffer.from(canonical(row.event.payload, limits.eventBytes));
          } });
          return read;
        },
      }, observeRead);
      orderedWriters.set(writer, { plan, records: held, observeRead });
      unstartedOrdered.delete(binding.originalReceiptSha256);
      stoppedOrderedHistory.push(() => {
        const eligible = eligibleOrdered.get(writer);
        if (eligible) return eligible;
        const receipt = capturedDeliveries.get(binding.originalReceiptSha256);
        if (!receipt) return null;
        const last = held.at(-1)?.record;
        const tip = last === undefined ? null : { id: last.id, sha256: sha256(canonical(last, limits.eventBytes)) };
        return copy({ profileInput: orderedDesignProfile.input, plan, principal: input.principal, scope, receipt,
          disposition: last?.kind === 'retired' && tip !== null ? { kind: 'retired' as const, terminal: tip }
            : { kind: 'stopped' as const, tip } });
      });
      previousOrdered = writer; nextOrderedEpoch++;
      return writer;
    };
    const ownLaunches = new WeakSet<UrlCommittedLaunchHistory>();
    const commitLaunchHistory = async (capability: UrlLaunchHistoryCapability): Promise<UrlCommittedLaunchHistory> => {
      if (poisoned || closing) throw refused();
      let history: ReturnType<typeof inspectUrlLaunchHistory>;
      try { history = inspectUrlLaunchHistory(capability); } catch { throw refused(); }
      const { role, plan } = history, scope = scopes.get(role), attempt = attempts.get(role);
      const containedBy = (parent: string, child: string): boolean => {
        const relative = path.relative(parent, child);
        return !path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`);
      };
      if (!scope || historyRoles.has(role) || history.pin !== input.pin || history.runId !== input.binding.run
        || !profiles.includes(plan.profile) || scope.profileSha256 !== plan.declaration.compiledProfileSha256
        || !equal(scope.binding, plan.profile.input.binding) || attempt?.commandSha256 !== plan.declaration.commandSha256
        || attempt.viewSha256 !== plan.declaration.viewSha256
        || !plan.view.protectedPaths.some(parent => containedBy(parent, input.parent))
        || containedBy(history.run, input.parent) || containedBy(`${history.run}.sessions`, input.parent)) throw refused();
      historyRoles.add(role);
      const event = await enqueue({ kind: 'launch-history', role, scope, payload: { file: history.file, recordSha256: history.sha256,
        recordBytes: history.bytes.length, promptRecordSha256: history.promptRecordSha256, promptSha256: history.promptSha256,
        sessionId: plan.declaration.sessionId } }, 'launch-history');
      const inspect = (): CommittedLaunchHistoryIdentity => {
        verifyDurableEvent(role, event);
        const latest = inspectUrlLaunchHistory(capability);
        return Object.freeze({ history: latest, scope, eventSha256: event.digest, project: input.project });
      };
      inspect();
      const committed = Object.freeze({}) as UrlCommittedLaunchHistory;
      committedLaunches.set(committed, inspect);
      ownLaunches.add(committed);
      return committed;
    };
    let nextDesignRound = firstDesignRound, designPending = false, designRetired = false;
    const designReads = new WeakMap<UrlDesignDeliveryAuditRecord, {
      readonly receipt: UrlSessionToolReceiptMetadata; readonly event: DurableEvent; readonly product: WeakRef<ValidatedUrlDesignProduct>;
    }>();
    const firstDesignReads = new Map<number, Awaited<ReturnType<typeof commit>>>();
    const usedDesignProducts = new WeakSet<ValidatedUrlDesignProduct>();
    const designRecords = new WeakMap<UrlDesignDeliveryAuditRecord, {
      readonly binding: UrlDesignProductBinding;
      readonly prepared: WeakRef<ValidatedUrlDesignProduct>;
      readonly verify: (product: ValidatedUrlDesignProduct, material?: UrlDesignProductMetadata, observeRead?: (bytes: number) => void) => Promise<() => void>;
      readonly verifyStored: (current: () => boolean, observeRead?: (bytes: number) => void) => void;
    }>();
    const designReviewDeliveries = new WeakMap<UrlDesignReviewProof, UrlDesignDeliveryAuditRecord>();
    const committedDesignReviews = new WeakSet<UrlDesignReviewProof>();
    const pendingDesignVerdicts = new WeakSet<UrlDesignDeliveryAuditRecord>();
    const designVerdicts = new WeakMap<UrlDesignDeliveryAuditRecord, {
      readonly checked: UrlCheckedDesignVerdict;
      readonly verify: () => void;
      readonly eventSha256: string;
    }>();
    function currentDesignRecord(receipt: UrlDesignDeliveryAuditRecord) {
      const record = designRecords.get(receipt);
      if (!record || poisoned || closing || designPending || designRetired || receipt.identity.round !== nextDesignRound - 1) throw refused();
      return record;
    }
    const revalidateDesignDelivery: Extract<UrlSessionAuditResult, { ok: true }>['revalidateDesignDelivery'] = async (receipt, product) => {
      await currentDesignRecord(receipt).verify(product);
    };
    function deliveryView(receipt: UrlDesignDeliveryAuditRecord, material: UrlInertDesignProduct): UrlDesignDeliveryView {
      if (material.parents.length !== receipt.identity.parentCount || material.view.byteLength !== receipt.identity.view.bytes
        || sha256(material.view) !== receipt.identity.view.sha256) throw refused();
      return Object.freeze({ receipt, view: material.view, parents: Object.freeze([...material.parents]) });
    }
    // Only the host receives the inert bytes and their parent handles. The
    // prepared audit event itself grants no role or outbound request access.
    const readDesignDeliveryView: Extract<UrlSessionAuditResult, { ok: true }>['readDesignDeliveryView'] = async (receipt, product, observeRead) => {
      const record = currentDesignRecord(receipt);
      const material = await readInertUrlDesignProduct(product, record.binding);
      if (!material) throw refused();
      const delivery = deliveryView(receipt, material);
      const current = await record.verify(product, material.metadata, observeRead);
      currentDesignRecord(receipt);
      if (!isUrlDesignProductLeaseOpen(product)) throw refused();
      authenticatedDesignViews.set(delivery, { current, product: new WeakRef(product) });
      return delivery;
    };
    const commitDesignArtifactRead: Extract<UrlSessionAuditResult, { ok: true }>['commitDesignArtifactRead'] = async (view, given) => {
      assertUrlDesignDeliveryViewCurrent(view);
      const product = authenticatedDesignViews.get(view)!.product;
      if (product.deref() === currentDesignRecord(view.receipt).prepared.deref()) throw refused();
      const receipt = copy(given), identity = view.receipt.identity;
      const file = `round-${identity.round}/design-view.json`;
      const text = new TextDecoder('utf-8', { fatal: true }).decode(view.view);
      const reply = encodeCanonicalJson({ ok: true, kind: 'artifact', path: file, sha256: identity.view.sha256, text },
        { maxBytes: 2_097_152, maxNodes: 65_536, maxDepth: 32 });
      if (receipt.toolName !== 'mcp__syzygy__artifact_read' || receipt.inputSha256 !== sha256(canonical({ path: file }))
        || receipt.digest !== sha256(reply) || receipt.bytes !== Buffer.byteLength(reply)) throw refused();
      const event = await enqueue({ kind: 'tool-receipt', role: 'design', scope: scopes.get('design')!, payload: receipt }, null);
      assertUrlDesignDeliveryViewCurrent(view);
      verifyDurableEvent('design', event);
      designReads.set(view.receipt, { receipt, event, product });
      const validated = product.deref();
      if (validated) usedDesignProducts.add(validated);
      if (!firstDesignReads.has(identity.round)) firstDesignReads.set(identity.round, event);
    };
    const readDesignReviewProof: Extract<UrlSessionAuditResult, { ok: true }>['readDesignReviewProof'] = async (receipt, product, given) => {
      const admission = copy(given);
      const record = currentDesignRecord(receipt), read = designReads.get(receipt);
      const relay = relayLatest.get('design');
      const call = relay?.payload.response?.tool;
      const consumed = relay?.payload.consumedToolResults[0];
      // The durable exchange must have carried the actual read reply and
      // admitted the dossier call for this proof. An origin inherited from
      // message history cannot establish that exchange.
      if (!read || product === record.prepared.deref() || product === read.product.deref()
        || relay?.payload.event !== 'response-admitted' || relay.payload.route !== 'messages'
        || !equal(admission, relay.payload.admission) || call?.name !== 'mcp__syzygy__dossier_step'
        || relay.payload.consumedToolResults.length !== 1 || consumed?.receiptId !== read.receipt.id
        || consumed.digest !== read.receipt.digest || consumed.bytes !== read.receipt.bytes) throw refused();
      const metadata = await inspectUrlDesignProduct(product, record.binding);
      if (!metadata) throw refused();
      const validate = await record.verify(product, metadata);
      const check = (): void => {
        if (currentDesignRecord(receipt) !== record || designReads.get(receipt) !== read || relayLatest.get('design') !== relay)
          throw refused();
        verifyDurableEvent('design', read.event);
        for (const event of relay.events) verifyDurableEvent('design', event);
        validate();
      };
      const files = metadata.output.population.map(file => file.path);
      const proof = deepFreeze({ ...record.binding, round: receipt.identity.round,
        site: receipt.identity.site, sessionId: receipt.identity.sessionId, artifactReadId: read.receipt.id,
        relayResponseSha256: relay.events.at(-1)!.digest, verdictCallId: call.id, verdictInputSha256: call.inputSha256,
        packet: { sha256: metadata.original.sha256, files, pages: files.filter(file => file.endsWith('.html')) } });
      check();
      designReviewProofs.set(proof, check);
      designReviewDeliveries.set(proof, receipt);
      usedDesignProducts.add(product);
      return proof;
    };
    const readOrderedDesignReviewProof: Extract<UrlSessionAuditResult, { ok: true }>['readOrderedDesignReviewProof'] = async (receipt, product, writer, completion) => {
      completion = copy(completion);
      const record = currentDesignRecord(receipt), held = orderedWriters.get(writer);
      if (!held || orderedDesignProfile === null || product === record.prepared.deref() || usedDesignProducts.has(product)) throw refused();
      const { manifest } = held.plan, binding = manifest.binding;
      if (binding.round !== receipt.identity.round || binding.session !== receipt.identity.sessionId
        || manifest.originalSha256 !== receipt.identity.original.sha256 || manifest.originalBytes !== receipt.identity.original.bytes
        || manifest.envelopeSha256 !== receipt.identity.view.sha256 || manifest.envelopeBytes !== receipt.identity.view.bytes
        || held.plan.prepared.fileCount !== receipt.identity.files || held.plan.prepared.pageCount !== receipt.identity.pages) throw refused();
      const material = await readInertUrlDesignProduct(product, record.binding);
      if (!material) throw refused();
      if (binding.originalReceiptSha256 !== receipt.eventSha256 || binding.producerSha256 !== material.metadata.renderer.programSha256
        || binding.parentSetSha256 !== designIdentityDigest(material.metadata.parents.map(parent => designIdentityDigest(parent)))) throw refused();
      const validate = await record.verify(product, material.metadata, held.observeRead);
      const inspect = (charge: boolean) => {
        const records = held.records.map(item => { const bytes = item.read(charge); if (charge) held.observeRead?.(bytes.byteLength); return bytes; });
        const prefix = verifyOrderedDesignAuditPrefix({ profile: orderedDesignProfile, plan: held.plan, principal: input.principal, asOf: Date.now(), records });
        if (!prefix) throw refused();
        const index = held.records.findIndex(item => item.record.kind === 'delivery-completed');
        if (index < 0) throw refused();
        const bytes = records[index]!, event = held.records[index]!.record as OrderedDesignAuditEvent<'delivery-completed'>;
        if (!equal(completion, { id: event.id, sha256: sha256(bytes) })) throw refused();
        return { records, event };
      };
      const { event } = inspect(true);
      const check = (): void => { if (!(Date.now() < Date.parse(binding.deadline))) throw refused(); currentDesignRecord(receipt); validate(); inspect(true); };
      const files = material.metadata.output.population.map(file => file.path), call = event.payload.verdictCall;
      const proof = deepFreeze({ ...record.binding, round: receipt.identity.round, site: receipt.identity.site,
        sessionId: receipt.identity.sessionId, artifactReadId: null, ordered: { completion, manifestSha256: held.plan.manifestSha256 },
        relayResponseSha256: event.payload.verdictResponse.sha256, verdictCallId: call.id, verdictInputSha256: call.inputSha256,
        packet: { sha256: material.metadata.original.sha256, files, pages: files.filter(file => file.endsWith('.html')) } });
      check();
      designReviewProofs.set(proof, check); designReviewDeliveries.set(proof, receipt); usedDesignProducts.add(product);
      orderedDesignReviewInputs.set(proof, { writer, parents: Object.freeze([...material.parents]), terminal: (checked, terminal) => {
        check();
        if (!isIssuedOrderedDesignTerminal(writer, terminal) || !equal(terminal.completion, completion)
          || terminal.packetSha256 !== proof.packet.sha256 || terminal.verdict.sha256 !== checked.verdictSha256
          || terminal.checkedVerdictSha256 !== sha256(canonical(checked))) throw refused();
        const { records } = inspect(true);
        if (!equal(verifyOrderedDesignTerminalEvidence({ profile: orderedDesignProfile, plan: held.plan, principal: input.principal,
          asOf: Date.now(), records, terminal: terminal.terminal }), terminal)) throw refused();
      } });
      return proof;
    };
    const commitOrderedDesignVerdict: Extract<UrlSessionAuditResult, { ok: true }>['commitOrderedDesignVerdict'] = async (proof, checked, terminal) => {
      const delivery = designReviewDeliveries.get(proof);
      if (!delivery || !proof.ordered || committedDesignReviews.has(proof) || pendingDesignVerdicts.has(delivery)) throw refused();
      const frozen = copy(checked);
      const held = orderedWriters.get(orderedDesignReviewInputs.get(proof)!.writer)!;
      assertUrlOrderedDesignVerdictTerminal(proof, frozen, terminal);
      const previous = designVerdicts.get(delivery);
      if (previous && frozen.number <= previous.checked.number) throw refused();
      committedDesignReviews.add(proof); pendingDesignVerdicts.add(delivery); designVerdicts.delete(delivery);
      try {
        const event = await enqueue({ kind: 'ordered-design-verdict', role: 'design', scope: scopes.get('design')!,
          payload: { deliverySha256: delivery.eventSha256, terminal, checked: frozen } }, 'ordered-design-verdict');
        assertUrlOrderedDesignVerdictTerminal(proof, frozen, terminal);
        verifyDurableEvent('design', event, held.observeRead);
        const verify = (): void => {
          const records = held.records.map(item => item.read());
          if (!equal(verifyOrderedDesignTerminalEvidence({ profile: orderedDesignProfile!, plan: held.plan, principal: input.principal,
            asOf: Date.now(), records, terminal: terminal.terminal }), terminal)) throw refused();
          verifyDurableEvent('design', event);
        };
        designVerdicts.set(delivery, { checked: frozen, eventSha256: event.digest, verify });
        eligibleOrdered.set(orderedDesignReviewInputs.get(proof)!.writer, copy({ profileInput: orderedDesignProfile!.input,
          plan: held.plan, principal: input.principal, scope: scopes.get('design')!, receipt: delivery,
          disposition: { kind: 'eligible' as const, terminal, verdictEventSha256: event.digest, checked: frozen,
            verdictCall: { id: proof.verdictCallId, name: orderedDesignProfile!.transcript.verdict.tool, inputSha256: proof.verdictInputSha256 } } }));
        if (!firstDesignReads.has(delivery.identity.round)) firstDesignReads.set(delivery.identity.round, event);
      } finally { pendingDesignVerdicts.delete(delivery); }
    };
    const commitDesignVerdict: Extract<UrlSessionAuditResult, { ok: true }>['commitDesignVerdict'] = async (proof, checked, receipt) => {
      const delivery = designReviewDeliveries.get(proof);
      if (delivery === undefined || pendingDesignVerdicts.has(delivery) || committedDesignReviews.has(proof)
        || receipt.toolName !== 'mcp__syzygy__dossier_step') throw refused();
      assertUrlDesignReviewProofCurrent(proof);
      const read = designReads.get(delivery), previous = designVerdicts.get(delivery);
      const frozen = copy(checked);
      const relay = relayLatest.get('design');
      if (proof.ordered !== undefined || read?.receipt.id !== proof.artifactReadId || !relay || relay.events.at(-1)?.digest !== proof.relayResponseSha256
        || receipt.inputSha256 !== proof.verdictInputSha256 || (previous && frozen.number <= previous.checked.number)) throw refused();
      committedDesignReviews.add(proof);
      // Stop issuing continuations while a successor is becoming durable.
      designVerdicts.delete(delivery);
      pendingDesignVerdicts.add(delivery);
      // The checked bridge supplies only the exact frozen verdict, check and
      // command reply identities. The role's verdict text stays out of audit.
      try {
        const event = await enqueue({ kind: 'design-verdict', role: 'design', scope: scopes.get('design')!,
          payload: { deliverySha256: delivery.eventSha256, artifactReadId: proof.artifactReadId,
            relayResponseSha256: proof.relayResponseSha256, verdictCallId: proof.verdictCallId, checked: frozen, toolReceipt: receipt } }, 'design-verdict');
        assertUrlDesignReviewProofCurrent(proof);
        verifyDurableEvent('design', event);
        designVerdicts.set(delivery, { checked: frozen, eventSha256: event.digest, verify: () => {
          verifyDurableEvent('design', read.event);
          for (const prior of relay.events) verifyDurableEvent('design', prior);
          verifyDurableEvent('design', event);
        } });
      } finally { pendingDesignVerdicts.delete(delivery); }
    };
    const checkedDesignRender = async (delivery: UrlDesignDeliveryAuditRecord, product: ValidatedUrlDesignProduct, number: number) => {
      const record = currentDesignRecord(delivery), verdict = designVerdicts.get(delivery);
      if (!verdict || verdict.checked.number !== number || product === record.prepared.deref() || usedDesignProducts.has(product)) throw refused();
      const original = await inspectUrlDesignProduct(product, record.binding);
      if (!original) throw refused();
      const revalidate = await record.verify(product, original);
      const readDeadline = Math.min(input.deadline ?? Number.MAX_SAFE_INTEGER, original.products.deadline);
      const deadline = Math.min(readDeadline, Date.now() + URL_SESSION_AUDIT_LIMITS.milliseconds);
      const current = (endsAt: number): boolean => Date.now() < endsAt
        && currentDesignRecord(delivery) === record && designVerdicts.get(delivery) === verdict;
      const check = (endsAt: number): void => {
        if (!current(endsAt)) throw refused();
        record.verifyStored(() => current(endsAt));
        verdict.verify();
        if (!current(endsAt)) throw refused();
      };
      revalidate();
      verdict.verify();
      const earlierRounds: number[] = [];
      for (const [round, event] of firstDesignReads) {
        if (round >= delivery.identity.round) continue;
        if (!current(deadline)) throw refused();
        verifyDurableEvent('design', event);
        earlierRounds.push(round);
      }
      if (!current(deadline) || usedDesignProducts.has(product) || !isUrlDesignProductLeaseOpen(product)) throw refused();
      const subject = deepFreeze({ binding: record.binding, checked: verdict.checked, delivery,
        verdictEventSha256: verdict.eventSha256, original, earlierRounds });
      usedDesignProducts.add(product);
      return { factory: makeDesignRenderContinuationFactory(subject, readDeadline, check), deadline };
    };
    const prepareDesignRenderContinuation: Extract<UrlSessionAuditResult, { ok: true }>['prepareDesignRenderContinuation'] = async (...args) =>
      (await checkedDesignRender(...args)).factory;
    const readDesignRenderContinuation: Extract<UrlSessionAuditResult, { ok: true }>['readDesignRenderContinuation'] = async (delivery, product, number) => {
      const { factory, deadline } = await checkedDesignRender(delivery, product, number);
      const continuation = factory({ deadline, packetSha256: delivery.identity.original.sha256 });
      if (continuation === null) throw refused();
      return continuation;
    };
    /** Record identities only. A checked append can be cited by a later delivery
     * verifier independently reproducing the subject under its own live read. */
    const commitDesignDelivery: Extract<UrlSessionAuditResult, { ok: true }>['commitDesignDelivery'] = async (request, waitForSample) => {
      if (poisoned || closing || designPending || designRetired
        || !exact(request, ['product', 'expectedProduct', 'launch', 'run', 'runId', 'pinnedRevision', 'sitePath', 'round'])
        || !count(request.round, 999_999) || request.round !== nextDesignRound
        || !ownLaunches.has(request.launch) || request.runId !== input.binding.run || request.pinnedRevision !== input.pin) throw refused();
      const { product, expectedProduct, launch, round, sitePath, run, runId, pinnedRevision } = request;
      const binding = { run, runId, pinnedRevision }, scope = scopes.get('design')!;
      const attempt = inspectCommittedUrlLaunchHistory(launch);
      if (attempt.history.role !== 'design' || attempt.history.run !== run || !equal(scope, attempt.scope)) throw refused();

      function capture(productIdentity: UrlDesignProductMetadata | null): { identity: DesignDeliveryIdentity; deadline: number; output: UrlDesignProductMetadata['output'] } {
        if (!productIdentity || productIdentity.products.operation !== 'render' || productIdentity.rawActive.status !== 'failed'
          || productIdentity.basePolicy.sha256 !== scope.binding.policy || productIdentity.originPolicy.sha256 !== scope.originPolicySha256
          || productIdentity.profile.sha256 !== attempt.history.plan.declaration.configurationSha256) throw refused();
        const { deadline, ...inputs } = productIdentity.products;
        const current = (): boolean => !poisoned && !closing && Date.now() < deadline;
        const site = checkStoredUrlRender(run, sitePath, productIdentity.output, current);
        if (site === null) throw refused();
        const identity: DesignDeliveryIdentity = {
          state: 'prepared', site, round, sessionId: attempt.history.plan.declaration.sessionId, draftRevision: productIdentity.draftRevision,
          original: productIdentity.original, payload: productIdentity.payload, view: productIdentity.view,
          files: productIdentity.output.files, pages: productIdentity.output.pages,
          rendererSha256: designIdentityDigest(productIdentity.renderer),
          basePolicySha256: productIdentity.basePolicy.sha256, originPolicySha256: productIdentity.originPolicy.sha256,
          registryProfileSha256: productIdentity.profile.sha256, launchEventSha256: attempt.eventSha256,
          policyBindingsSha256: designIdentityDigest([productIdentity.basePolicy, productIdentity.originPolicy]),
          parentCount: productIdentity.parents.length, parentsSha256: designIdentityDigest(productIdentity.parents),
          inputsSha256: designIdentityDigest(inputs), storedPopulationSha256: designIdentityDigest(productIdentity.output),
          semanticParentsSha256: productIdentity.semanticParentsSha256, semanticInputsSha256: productIdentity.semanticInputsSha256,
        };
        if (!current()) throw refused();
        return { identity, deadline, output: productIdentity.output };
      }
      const checkSample = async (): Promise<void> => {
        if (waitForSample !== undefined && !(await waitForSample())) throw refused();
        if (poisoned || closing || !isUrlDesignProductLeaseOpen(product)) throw refused();
      };
      designPending = true;
      let appended = false;
      try {
        await checkSample();
        const reproduced = await inspectUrlDesignProduct(product, binding);
        if (!reproduced || !sameReproducedUrlDesignProduct(expectedProduct, reproduced)) throw refused();
        await checkSample();
        const before = capture(reproduced);
        if (Date.now() >= before.deadline) throw refused();
        const event = await enqueue({ kind: 'design-delivery', role: 'design', scope, payload: before.identity }, 'design-delivery');
        appended = true;
        await checkSample();
        const material = await readInertUrlDesignProduct(product, binding);
        if (!material) throw refused();
        await checkSample();
        const after = capture(material.metadata);
        if (before.deadline !== after.deadline || !equal(before.identity, after.identity)) throw refused();
        const result = copy({ eventSha256: event.digest, identity: after.identity }) as UrlDesignDeliveryAuditRecord;
        const delivery = deliveryView(result, material);
        const verifyStored = (current: () => boolean, observeRead?: (bytes: number) => void): void => {
          if (!current()) throw refused();
          try {
            if (inspectCommittedUrlLaunchHistory(launch).eventSha256 !== attempt.eventSha256
              || checkStoredUrlRender(run, sitePath, after.output, current) !== after.identity.site) throw refused();
            verifyDurableEvent('design', event, observeRead);
          } catch {
            if (current()) designRetired = true;
            throw refused();
          }
          if (!current()) throw refused();
        };
        const verify = (checked: typeof after, candidate: ValidatedUrlDesignProduct, observeRead?: (bytes: number) => void): void =>
          verifyStored(() => !poisoned && !closing && !designRetired && Date.now() < checked.deadline && isUrlDesignProductLeaseOpen(candidate), observeRead);
        await checkSample();
        verify(after, product);
        const preparedProduct = new WeakRef(product);
        function checkDelivery(checked: typeof after, candidate: ValidatedUrlDesignProduct, observeRead?: (bytes: number) => void): () => void {
          const ref = new WeakRef(candidate);
          return () => {
            currentDesignRecord(result);
            const active = ref.deref();
            if (!active) throw refused();
            verify(checked, active, observeRead);
          };
        }
        designRecords.set(result, { binding, prepared: preparedProduct, verifyStored, verify: async (candidate, material, observeRead) => {
          // The receipt survives its operation lease. A later act needs a newly
          // validated product whose full identity still matches the recorded one.
          const currentMaterial = material ?? (candidate === preparedProduct.deref()
            ? undefined : await inspectUrlDesignProduct(candidate, binding));
          const checked = currentMaterial === undefined ? after : capture(currentMaterial);
          currentDesignRecord(result);
          if (!equal(after.identity, checked.identity)) { designRetired = true; throw refused(); }
          verify(checked, candidate, observeRead);
          return checkDelivery(checked, candidate, observeRead);
        } });
        authenticatedDesignViews.set(delivery, { current: checkDelivery(after, product), product: preparedProduct });
        capturedDeliveries.set(result.eventSha256, result);
        if (orderedDesignProfile !== null && input.deadline !== undefined) {
          const plan = planOrderedDesignBytes({ ...orderedDesignPlanInputForDelivery(orderedDesignProfile, result,
            material.metadata, input.pin, input.deadline, input.project), envelope: material.view });
          unstartedOrdered.set(result.eventSha256, copy({ profileInput: orderedDesignProfile.input, plan, principal: input.principal,
            scope, receipt: result, disposition: { kind: 'stopped' as const, tip: null } }));
        }
        nextDesignRound++;
        return delivery;
      } catch {
        // A durable unconfirmed event must remain visible and block continuation.
        if (appended) designRetired = true;
        throw refused();
      } finally { designPending = false; }
    };
    const appendMachinePeer = async (event: UrlMachinePeerAudit): Promise<void> => {
      if (!ROLES.includes(event.role)) throw refused();
      await enqueue({ kind: 'machine-peer', role: event.role, scope: scopes.get(event.role)!, payload: event }, 'machine-peer');
    };
    const append = async (event: UrlSessionAuditEvent): Promise<void> => { await enqueue(event, null); };
    return Object.freeze({ ok: true as const, scope: (role: ViewRole) => { const scope = scopes.get(role); if (!scope) poison(); return scope!; },
      append, appendMachinePeer, beginOrderedDesignAudit, commitLaunchHistory, commitDesignDelivery, revalidateDesignDelivery, readDesignDeliveryView,
      commitDesignArtifactRead, readDesignReviewProof, readOrderedDesignReviewProof, commitOrderedDesignVerdict, commitDesignVerdict,
      readDesignRenderContinuation, prepareDesignRenderContinuation, close, closedHistory, summary });
  } catch {
    poisoned = true; await close(); return Object.freeze({ ok: false as const, code: 'url-session-audit-unavailable' as const, summary });
  }
}
