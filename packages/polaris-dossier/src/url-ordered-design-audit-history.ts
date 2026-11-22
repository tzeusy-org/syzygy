import { encodeCanonicalJson, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { decodeUtf8, deepFreeze, isRecord, sha256 } from '@syzygy/support';
import { createOrderedDesignSessionProfile, isOrderedDesignSessionProfile, type SessionProfileInput, type OrderedDesignSessionProfile } from './session-profile.js';
import { isOrderedDesignPlanFor, type OrderedDesignPlan } from './url-design-delivery.js';
import type { UrlDesignProductMetadata } from './url-design-product.js';
import { URL_ARTIFACT_LIMITS } from './url-run-artifacts.js';
import {
  ORDERED_DESIGN_AUDIT_FORMAT, ORDERED_DESIGN_AUDIT_RECORD_LIMITS, verifyOrderedDesignAuditPrefix,
  verifyOrderedDesignTerminalEvidence, verifyHistoricalOrderedDesignAuditPrefix, verifyHistoricalOrderedDesignTerminalEvidence, type OrderedDesignAuditReference, type OrderedDesignTerminalEvidence,
} from './url-ordered-design-audit.js';
import {
  assertUrlDesignDeliveryViewCurrent, assertUrlDesignRenderContinuationCurrent, assertUrlOrderedDesignVerdictTerminal,
  URL_SESSION_AUDIT_LIMITS, type UrlCheckedDesignVerdict, type UrlDesignDeliveryAuditRecord, type UrlDesignDeliveryView,
  type UrlDesignRenderContinuation, type UrlDesignReviewProof, type UrlSessionAuditScope,
} from './url-session-audit.js';

interface SealInput {
  readonly profile: OrderedDesignSessionProfile;
  readonly plan: OrderedDesignPlan;
  readonly principal: string;
  readonly delivery: UrlDesignDeliveryView;
  readonly product: Pick<UrlDesignProductMetadata, 'renderer' | 'parents'>;
  readonly disposition:
    | { readonly kind: 'retired'; readonly terminal: OrderedDesignAuditReference }
    | { readonly kind: 'eligible'; readonly terminal: OrderedDesignTerminalEvidence; readonly proof: UrlDesignReviewProof;
        readonly continuation: UrlDesignRenderContinuation; readonly verdictBytes: Uint8Array; readonly checkBytes: Uint8Array };
}
declare const sealBrand: unique symbol;
export interface SealedOrderedDesignHistoryAttempt { readonly [sealBrand]: true }
type CheckedDisposition =
  | { readonly kind: 'retired'; readonly terminal: OrderedDesignAuditReference }
  | { readonly kind: 'stopped'; readonly tip: OrderedDesignAuditReference | null }
  | { readonly kind: 'eligible'; readonly terminal: OrderedDesignTerminalEvidence;
      readonly verdictEventSha256: string; readonly checked: UrlCheckedDesignVerdict;
      readonly verdictCall: { readonly id: string; readonly name: string; readonly inputSha256: string } };
interface SealedAttempt {
  readonly profile: OrderedDesignSessionProfile;
  readonly plan: OrderedDesignPlan;
  readonly principal: string;
  readonly scope: UrlSessionAuditScope;
  readonly receipt: Pick<UrlDesignDeliveryAuditRecord, 'eventSha256' | 'identity'>;
  readonly disposition: CheckedDisposition;
}
const seals = new WeakMap<SealedOrderedDesignHistoryAttempt, SealedAttempt>();

/** Plain expected metadata captured by the protected audit producer. It grants
 * no authority. The outer stop seal must authenticate it independently. */
export interface UrlOrderedDesignHistoryExpected extends Omit<SealedAttempt, 'profile'> {
  readonly profileInput: SessionProfileInput;
}
export function captureSealedOrderedDesignHistoryAttempt(seal: SealedOrderedDesignHistoryAttempt): UrlOrderedDesignHistoryExpected | null {
  const found = seals.get(seal);
  if (!found) return null;
  const { profile, ...rest } = found;
  return snapshot({ ...rest, profileInput: profile.input });
}


/** Outer rows in their already verified session-chain order. The caller owns
 * the independent global and per-role seals and supplies the complete ordered
 * event population, including delivery rows without a finished attempt. */
export interface OrderedDesignHistoryRow {
  readonly sha256: string;
  readonly event: Readonly<Record<string, unknown>>;
}

const evidenceBrand = Symbol('verified-ordered-design-audit-history');
export interface VerifiedOrderedDesignAuditHistory {
  readonly [evidenceBrand]: true;
  readonly kind: 'verified-ordered-design-audit-history';
  readonly authorization: 'none';
  readonly replay: 'forbidden';
  readonly attempts: readonly { readonly epoch: number; readonly attemptSha256: string;
    readonly disposition: 'eligible' | 'retired' | 'stopped'; readonly recordCount: number }[];
}

const PRODUCT_LIMITS = { maxBytes: 2_097_152, maxNodes: 65_536, maxDepth: 32 };
const recordText = (value: unknown): string => encodeCanonicalJson(value, ORDERED_DESIGN_AUDIT_RECORD_LIMITS);
const productDigest = (value: unknown): string => sha256(encodeCanonicalJson(value, PRODUCT_LIMITS));
const snapshot = <T>(value: T): T => deepFreeze(parseBoundedJson(recordText(value), ORDERED_DESIGN_AUDIT_RECORD_LIMITS)) as T;
const equal = (left: unknown, right: unknown): boolean => recordText(left) === recordText(right);
const hex = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/u.exec(value)?.[0] === value;
const reference = (value: OrderedDesignAuditReference): boolean =>
  typeof value.id === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/u.exec(value.id)?.[0] === value.id
  && hex(value.sha256) && equal(value, { id: value.id, sha256: value.sha256 });
function checkedBytes(bytes: Uint8Array, max: number): Uint8Array {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0 || bytes.byteLength > max) throw new Error('ordered-design-history-unavailable');
  return Uint8Array.from(bytes);
}

/** Snapshot metadata from genuine live producer bindings. Keep the result
 * in trusted host memory. This is usable after the live leases close. A
 * retired attempt also needs its independent protected retirement pointer.
 * This function has no persisted-seal decoder or writer. */
export function sealOrderedDesignHistoryAttempt(input: SealInput): SealedOrderedDesignHistoryAttempt | null {
  try {
    const { profile, plan, principal, delivery, product, disposition } = input;
    if (!isOrderedDesignSessionProfile(profile) || !isOrderedDesignPlanFor(plan, profile.transcript.partition)
      || verifyOrderedDesignAuditPrefix({ profile, plan, principal, asOf: Date.now(), records: [] }) === null) return null;
    assertUrlDesignDeliveryViewCurrent(delivery);
    const receipt = delivery.receipt, delivered = receipt.identity, binding = plan.manifest.binding;
    if (binding.originalReceiptSha256 !== receipt.eventSha256 || binding.round !== delivered.round
      || binding.transferEpoch !== delivered.round || binding.session !== delivered.sessionId
      || binding.encoding !== delivered.view.encoding || binding.basePolicySha256 !== delivered.basePolicySha256
      || binding.originPolicySha256 !== delivered.originPolicySha256 || plan.manifest.originalBytes !== delivered.original.bytes
      || plan.manifest.originalSha256 !== delivered.original.sha256 || plan.manifest.envelopeBytes !== delivered.view.bytes
      || plan.manifest.envelopeSha256 !== delivered.view.sha256 || plan.prepared.fileCount !== delivered.files
      || plan.prepared.pageCount !== delivered.pages || binding.producerSha256 !== product.renderer.programSha256
      || delivered.rendererSha256 !== productDigest(product.renderer) || product.parents.length !== delivered.parentCount
      || delivered.parentsSha256 !== productDigest(product.parents)
      || binding.parentSetSha256 !== productDigest(product.parents.map(productDigest))) return null;
    let checkedDisposition: CheckedDisposition;
    if (disposition.kind === 'retired') {
      if (!reference(disposition.terminal)) return null;
      checkedDisposition = { kind: 'retired', terminal: snapshot(disposition.terminal) };
    } else {
      const { proof, continuation, terminal, verdictBytes, checkBytes } = disposition;
      assertUrlDesignRenderContinuationCurrent(continuation);
      const actualVerdict = checkedBytes(verdictBytes, profile.transcript.maxVerdictBytes);
      const actualCheck = checkedBytes(checkBytes, URL_ARTIFACT_LIMITS.itemBytes);
      if (continuation.delivery !== receipt || continuation.binding.runId !== binding.run
        || continuation.binding.pinnedRevision !== binding.pin || !proof.ordered
        || proof.ordered.manifestSha256 !== plan.manifestSha256 || proof.round !== binding.round
        || proof.packet.sha256 !== plan.manifest.originalSha256 || proof.sessionId !== binding.session
        || !reference(terminal.terminal)
        || !equal(terminal.verdict, { bytes: actualVerdict.byteLength, sha256: sha256(actualVerdict) })
        || continuation.checked.verdictSha256 !== terminal.verdict.sha256
        || continuation.checked.checkSha256 !== sha256(actualCheck)) return null;
      const stdin = decodeUtf8(actualVerdict);
      const argv = ['dossier', profile.transcript.verdict.operation, '/work', '--submit', `round-${binding.round}/verdict.json`, '--stdin'];
      if (stdin === undefined || proof.verdictInputSha256 !== productDigest({ argv, stdin })) return null;
      assertUrlOrderedDesignVerdictTerminal(proof, continuation.checked, terminal);
      checkedDisposition = { kind: 'eligible', terminal: snapshot(terminal),
        verdictEventSha256: continuation.verdictEventSha256, checked: snapshot(continuation.checked),
        verdictCall: { id: proof.verdictCallId, name: profile.transcript.verdict.tool, inputSha256: proof.verdictInputSha256 } };
    }
    const seal = Object.freeze({}) as SealedOrderedDesignHistoryAttempt;
    const scope = deepFreeze({ binding: profile.input.binding, profileSha256: profile.digest, originPolicySha256: binding.originPolicySha256 });
    seals.set(seal, { profile, plan, principal, scope, receipt: snapshot(receipt), disposition: checkedDisposition });
    return seal;
  } catch { return null; }
}

function verifyRetirement(
  last: unknown, terminal: OrderedDesignAuditReference, records: readonly Uint8Array[],
  context: Omit<Parameters<typeof verifyOrderedDesignAuditPrefix>[0], 'records'>, lastPrefixTime: number, historical: boolean,
): string | null {
  if (!isRecord(last) || !isRecord(last.payload) || typeof last.at !== 'string') return null;
  const { reason } = last.payload;
  if (!['refused', 'transport-uncertain', 'interrupted', 'exhausted'].some(allowed => allowed === reason)) return null;
  const at = Date.parse(last.at);
  if (!Number.isSafeInteger(at) || new Date(at).toISOString() !== last.at || at < lastPrefixTime || at > context.asOf
    || at >= Date.parse(context.plan.manifest.binding.deadline) || sha256(recordText(last)) !== terminal.sha256) return null;
  const prefix = (historical ? verifyHistoricalOrderedDesignAuditPrefix : verifyOrderedDesignAuditPrefix)({ ...context, records });
  if (prefix === null || prefix.next === null || !equal(last, {
    format: ORDERED_DESIGN_AUDIT_FORMAT, kind: 'retired', id: terminal.id, previous: prefix.tip,
    attemptSha256: prefix.attemptSha256, at: last.at, payload: { reason },
  })) return null;
  return prefix.attemptSha256;
}

/** Verify the ordered semantic phase after the outer session chains pass.
 * Evidence is historical. No cursor, live grant, or recovered product is issued. */
export function verifySealedOrderedDesignAuditHistory(input: {
  readonly rows: readonly OrderedDesignHistoryRow[];
  readonly attempts: readonly SealedOrderedDesignHistoryAttempt[];
  /** Expected from the protected run and declaration, independently of rows. */
  readonly subject: { readonly project: string; readonly pin: string; readonly principal: string; readonly deadline: string };
  readonly asOf: number;
}): VerifiedOrderedDesignAuditHistory | null {
  const attempts = input.attempts.map(seal => seals.get(seal));
  if (attempts.some(item => item === undefined)) return null;
  return verifyHistory({ ...input, attempts: attempts as SealedAttempt[] }, false);
}

/** Read-only cold verification against independently sealed producer metadata.
 * Never recreates a live delivery, cursor, grant or eligible product. */
export function verifyColdOrderedDesignAuditHistory(input: {
  readonly rows: readonly OrderedDesignHistoryRow[];
  readonly attempts: readonly UrlOrderedDesignHistoryExpected[];
  readonly profileSha256: string;
  readonly subject: { readonly project: string; readonly pin: string; readonly principal: string; readonly deadline: string };
  readonly asOf: number;
}): VerifiedOrderedDesignAuditHistory | null {
  try {
    const attempts: SealedAttempt[] = input.attempts.map(item => {
      const retained = snapshot(item);
      const compiled = createOrderedDesignSessionProfile(retained.profileInput);
      if (!compiled.ok || compiled.value.profile.digest !== input.profileSha256) throw new Error('ordered-history-profile');
      const { profileInput: _input, ...rest } = retained;
      const profile = compiled.value.profile;
      if (!equal(rest.scope, { binding: profile.input.binding, profileSha256: profile.digest,
        originPolicySha256: rest.plan.manifest.binding.originPolicySha256 })) throw new Error('ordered-history-scope');
      return { ...rest, profile };
    });
    return verifyHistory({ ...input, attempts }, true);
  } catch { return null; }
}
function verifyHistory(input: {
  readonly rows: readonly OrderedDesignHistoryRow[]; readonly attempts: readonly SealedAttempt[];
  readonly subject: { readonly project: string; readonly pin: string; readonly principal: string; readonly deadline: string };
  readonly asOf: number;
}, historical: boolean): VerifiedOrderedDesignAuditHistory | null {
  try {
    const { rows, attempts, asOf, subject } = input;
    if (!Array.isArray(rows) || rows.length < (historical ? 1 : 2) || rows.length > URL_SESSION_AUDIT_LIMITS.events
      || !Array.isArray(attempts) || attempts.length < 1 || attempts.length * (historical ? 1 : 2) > rows.length
      || !Number.isSafeInteger(asOf)) return null;
    const first = attempts[0];
    if (first === undefined) return null;
    const output: VerifiedOrderedDesignAuditHistory['attempts'][number][] = [];
    let cursor = 0, totalBytes = 0;
    const seen = new Set<string>();
    const take = (kind: string): OrderedDesignHistoryRow | null => {
      const row = rows[cursor++];
      if (!row || !hex(row.sha256) || seen.has(row.sha256) || row.event.kind !== kind
        || row.event.role !== 'design' || !equal(row.event.scope, first.scope)) return null;
      seen.add(row.sha256);
      return row;
    };
    for (const [index, seal] of attempts.entries()) {
      const expected = seal;
      if (expected === undefined) return null;
      const { plan, principal, profile, receipt, disposition } = expected;
      const binding = plan.manifest.binding;
      if (binding.transferEpoch !== index + 1 || principal !== subject.principal
        || binding.pin !== subject.pin || binding.project !== subject.project || binding.deadline !== subject.deadline
        || !equal(expected.scope, first.scope)) return null;
      const delivery = take('design-delivery');
      if (delivery === null || delivery.sha256 !== receipt.eventSha256 || !equal(delivery.event.payload, receipt.identity)) return null;
      const records: Uint8Array[] = [];
      const events: Record<string, unknown>[] = [];
      while (rows[cursor]?.event.kind === 'design-ordered') {
        const row = take('design-ordered');
        if (row === null || !isRecord(row.event.payload) || records.length === 13 + profile.transcript.partition.partCount * 5) return null;
        const encoded = Buffer.from(recordText(row.event.payload));
        totalBytes += encoded.byteLength;
        if (totalBytes > URL_SESSION_AUDIT_LIMITS.bytes) return null;
        records.push(encoded);
        events.push(row.event.payload);
      }
      if (records.length === 0 && disposition.kind !== 'stopped') return null;
      const context = { profile, plan, principal, asOf };
      const last = events.at(-1)!;
      let attemptSha256: string | null;
      if (disposition.kind === 'stopped') {
        if (!historical) return null;
        const prefix = verifyHistoricalOrderedDesignAuditPrefix({ ...context, records });
        if (prefix === null || prefix.next === null || !equal(prefix.tip, disposition.tip)) return null;
        attemptSha256 = prefix.attemptSha256;
      } else if (disposition.kind === 'retired') {
        if (events.slice(0, -1).some(event => event.id === disposition.terminal.id)) return null;
        const before = events.at(-2)?.at;
        attemptSha256 = verifyRetirement(last, disposition.terminal, records.slice(0, -1), context,
          typeof before === 'string' ? Date.parse(before) : -Infinity, historical);
      } else {
        const terminal = (historical ? verifyHistoricalOrderedDesignTerminalEvidence : verifyOrderedDesignTerminalEvidence)({ ...context, records, terminal: disposition.terminal.terminal });
        if (terminal === null || !equal(terminal, disposition.terminal)) return null;
        const stage = events.find(event => event.kind === 'verdict-staged');
        if (!isRecord(stage?.payload) || !equal(stage.payload.verdictCall, disposition.verdictCall)) return null;
        const verdict = take('ordered-design-verdict');
        if (verdict === null || verdict.sha256 !== disposition.verdictEventSha256 || !equal(verdict.event.payload,
          { deliverySha256: receipt.eventSha256, terminal, checked: disposition.checked })) return null;
        attemptSha256 = typeof last.attemptSha256 === 'string' ? last.attemptSha256 : null;
      }
      if (attemptSha256 === null) return null;
      output.push({ epoch: binding.transferEpoch, attemptSha256, disposition: disposition.kind, recordCount: records.length });
    }
    if (cursor !== rows.length) return null;
    return deepFreeze({ [evidenceBrand]: true, kind: 'verified-ordered-design-audit-history',
      authorization: 'none', replay: 'forbidden', attempts: output });
  } catch { return null; }
}
