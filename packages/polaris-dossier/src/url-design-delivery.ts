import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { deepFreeze, sha256 } from '@syzygy/support';
import { inspectUrlDesignEnvelope, URL_DESIGN_VIEW_ENCODING } from './url-design-view.js';

const FORMAT = 'polaris-dossier-url-design-ordered-delivery/1';
const PREPARED_FORMAT = 'polaris-dossier-url-design-prepared/1';
const MAX_BYTES = 2_097_152;
// The existing session cap is 1,024 tool calls. The preparation and verdict
// consume at least two of them before allowing smaller profile-specific caps.
const MAX_PARTS = 1022;
const BOUNDS = { maxBytes: MAX_BYTES, maxNodes: 65_536, maxDepth: 32 };
const HEX = /^[0-9a-f]{64}$/u;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/u;
const PIN = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;
const PART_PATH = /^round-([1-9][0-9]{0,5})\/design-view-part-([1-9][0-9]{0,3})\.json$/u;

/** Reserve this virtual namespace independently of ordinary artifact paths. */
export function isOrderedDesignPartPath(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = PART_PATH.exec(value);
  return match?.[0] === value && Number(match[2]) <= MAX_PARTS;
}

export interface OrderedDesignBinding {
  readonly basePolicySha256: string;
  readonly deadline: string;
  readonly encoding: typeof URL_DESIGN_VIEW_ENCODING;
  readonly originPolicySha256: string;
  readonly originalReceiptSha256: string;
  readonly parentSetSha256: string;
  readonly pin: string;
  readonly producerSha256: string;
  readonly profileSha256: string;
  readonly project: string;
  readonly provider: string;
  readonly role: 'design';
  readonly round: number;
  readonly run: string;
  readonly session: string;
  readonly transferEpoch: number;
}
interface DesignPart {
  readonly bytes: number;
  readonly offset: number;
  readonly ordinal: number;
  readonly path: string;
  readonly sha256: string;
}
interface Manifest {
  readonly binding: OrderedDesignBinding;
  readonly envelopeBytes: number;
  readonly envelopeSha256: string;
  readonly format: typeof FORMAT;
  readonly originalBytes: number;
  readonly originalSha256: string;
  readonly partCount: number;
  readonly parts: readonly DesignPart[];
}
export interface OrderedDesignPrepared {
  readonly encoding: typeof URL_DESIGN_VIEW_ENCODING;
  readonly envelopeBytes: number;
  readonly envelopeSha256: string;
  readonly fileCount: number;
  readonly format: typeof PREPARED_FORMAT;
  readonly instructionProfileSha256: string;
  readonly manifestSha256: string;
  readonly originalBytes: number;
  readonly originalSha256: string;
  readonly pageCount: number;
  readonly partCount: number;
  readonly round: number;
}
interface PlannedReply {
  readonly manifestSha256: string;
  readonly ordinal: number;
  readonly bytes: number;
  readonly sha256: string;
}
export interface OrderedDesignPlan {
  readonly manifest: Manifest;
  readonly manifestText: string;
  readonly manifestSha256: string;
  readonly prepared: OrderedDesignPrepared;
  readonly preparedText: string;
  readonly replies: readonly PlannedReply[];
}
const issuedPlans = new WeakMap<OrderedDesignPlan, PlanInput['limits']>();
interface PlanInput {
  /** Source already authenticated by the host's dedicated original/view receipt. */
  readonly envelope: Uint8Array;
  readonly envelopeSha256: string;
  readonly original: { readonly bytes: number; readonly sha256: string };
  readonly fileCount: number;
  readonly pageCount: number;
  readonly binding: Omit<OrderedDesignBinding, 'parentSetSha256'>;
  /** Exact full parent-receipt digests in the receipt's checked input order. */
  readonly parents: readonly string[];
  readonly instructionProfileSha256: string;
  /** Reduced bounds must come from the independently checked design profile. */
  readonly limits: { readonly partBytes: number; readonly partCount: number; readonly replyBytes: number; readonly preparedBytes: number };
}
const fail = (): never => { throw new Error('url-ordered-design-plan-refused'); };
const canonical = (value: unknown, maxBytes = MAX_BYTES): string => encodeCanonicalJson(value, { ...BOUNDS, maxBytes });
const positive = (value: number, max = Number.MAX_SAFE_INTEGER): boolean => Number.isSafeInteger(value) && value > 0 && value <= max;
const matches = (pattern: RegExp, value: unknown): boolean => typeof value === 'string' && pattern.exec(value)?.[0] === value;
const hash = (value: string): boolean => matches(HEX, value);
const identifier = (value: string): boolean => matches(ID, value);
const utc = (value: string): boolean => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const exactKeys = (value: object, names: readonly string[]): boolean =>
  Reflect.ownKeys(value).length === names.length && names.every(name => Object.hasOwn(value, name));

const replyText = (manifest: Manifest, manifestSha256: string, part: DesignPart, text: string, maxBytes: number): string => canonical({
  ...part, count: manifest.partCount, envelopeSha256: manifest.envelopeSha256, kind: 'design-view-part', manifestSha256, ok: true, text,
}, maxBytes);

function boundEnvelope(plan: OrderedDesignPlan, envelope: Uint8Array): Uint8Array {
  if (!issuedPlans.has(plan) || !(envelope instanceof Uint8Array)
    || envelope.byteLength !== plan.manifest.envelopeBytes) return fail();
  const bytes = Uint8Array.from(envelope);
  if (sha256(bytes) !== plan.manifest.envelopeSha256) return fail();
  return bytes;
}

/** The legacy whole representation, used only as a detector input for the
 * ordered profile. Its tool identity is separate from this byte plan. */
export function orderedDesignWholeReply(plan: OrderedDesignPlan, envelope: Uint8Array): string {
  const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(boundEnvelope(plan, envelope));
  return canonical({ ok: true, kind: 'artifact', path: `round-${plan.manifest.binding.round}/design-view.json`,
    text, sha256: plan.manifest.envelopeSha256 });
}

export function isOrderedDesignPlanFor(plan: OrderedDesignPlan, limits: PlanInput['limits']): boolean {
  const issued = issuedPlans.get(plan);
  return issued !== undefined && issued.partBytes === limits.partBytes && issued.partCount === limits.partCount
    && issued.replyBytes === limits.replyBytes && issued.preparedBytes === limits.preparedBytes;
}

/** Check only a protected historical plan's metadata. This creates no issued
 * plan, body receipt or release capability. The caller supplies its independent
 * protected expectation and later rereads the exact audit chain. */
export function verifyHistoricalOrderedDesignPlanMetadata(plan: OrderedDesignPlan, limits: PlanInput['limits']): boolean {
  try {
    if (!exactKeys(plan, ['manifest', 'manifestText', 'manifestSha256', 'prepared', 'preparedText', 'replies'])) return false;
    const { manifest, prepared } = plan;
    if (!exactKeys(manifest, ['binding', 'envelopeBytes', 'envelopeSha256', 'format', 'originalBytes', 'originalSha256', 'partCount', 'parts'])
      || manifest.format !== FORMAT || plan.manifestText !== canonical(manifest) || plan.manifestSha256 !== sha256(plan.manifestText)
      || !positive(manifest.envelopeBytes, MAX_BYTES) || !positive(manifest.originalBytes, MAX_BYTES)
      || !hash(manifest.envelopeSha256) || !hash(manifest.originalSha256)
      || !positive(manifest.partCount, limits.partCount) || !Array.isArray(manifest.parts) || manifest.parts.length !== manifest.partCount
      || !Array.isArray(plan.replies) || plan.replies.length !== manifest.partCount) return false;
    const { binding } = manifest;
    if (!exactKeys(binding, ['basePolicySha256', 'deadline', 'encoding', 'originPolicySha256', 'originalReceiptSha256', 'parentSetSha256',
      'pin', 'producerSha256', 'profileSha256', 'project', 'provider', 'role', 'round', 'run', 'session', 'transferEpoch'])
      || ![binding.basePolicySha256, binding.originPolicySha256, binding.originalReceiptSha256, binding.parentSetSha256,
        binding.producerSha256, binding.profileSha256].every(hash)
      || ![binding.project, binding.provider, binding.run, binding.session].every(identifier) || !matches(PIN, binding.pin)
      || !utc(binding.deadline) || binding.encoding !== URL_DESIGN_VIEW_ENCODING || binding.role !== 'design'
      || !positive(binding.round, 999_999) || !positive(binding.transferEpoch)) return false;
    if (!exactKeys(prepared, ['encoding', 'envelopeBytes', 'envelopeSha256', 'fileCount', 'format', 'instructionProfileSha256',
      'manifestSha256', 'originalBytes', 'originalSha256', 'pageCount', 'partCount', 'round'])
      || prepared.format !== PREPARED_FORMAT || prepared.encoding !== URL_DESIGN_VIEW_ENCODING
      || prepared.envelopeBytes !== manifest.envelopeBytes || prepared.envelopeSha256 !== manifest.envelopeSha256
      || prepared.originalBytes !== manifest.originalBytes || prepared.originalSha256 !== manifest.originalSha256
      || prepared.manifestSha256 !== plan.manifestSha256 || prepared.partCount !== manifest.partCount
      || prepared.round !== manifest.binding.round || !positive(prepared.fileCount, 4096) || !positive(prepared.pageCount, prepared.fileCount)
      || !hash(prepared.instructionProfileSha256) || plan.preparedText !== canonical(prepared, limits.preparedBytes)) return false;
    let offset = 0;
    for (const [index, part] of manifest.parts.entries()) {
      const reply = plan.replies[index]!;
      if (!exactKeys(part, ['bytes', 'offset', 'ordinal', 'path', 'sha256']) || part.offset !== offset || part.ordinal !== index + 1
        || part.path !== `round-${manifest.binding.round}/design-view-part-${part.ordinal}.json`
        || !isOrderedDesignPartPath(part.path) || !positive(part.bytes, limits.partBytes) || !hash(part.sha256)
        || !exactKeys(reply, ['manifestSha256', 'ordinal', 'bytes', 'sha256']) || reply.manifestSha256 !== plan.manifestSha256
        || reply.ordinal !== part.ordinal || !positive(reply.bytes, limits.replyBytes) || !hash(reply.sha256)) return false;
      offset += part.bytes;
    }
    return offset === manifest.envelopeBytes;
  } catch { return false; }
}

/**
 * Compile the exact host-private byte/receipt plan. This is a necessary
 * preflight only. It issues no role-release capability: native wrappers,
 * retained histories, two-sided screening and terminal budget still need
 * their observed profile and the protected attempt.
 */
export function planOrderedDesignBytes(input: PlanInput): OrderedDesignPlan {
  try {
    const { binding, parents, envelope, envelopeSha256, original, fileCount, pageCount, instructionProfileSha256, limits } = input;
    if (!exactKeys(binding, ['basePolicySha256', 'deadline', 'encoding', 'originPolicySha256', 'originalReceiptSha256',
      'pin', 'producerSha256', 'profileSha256', 'project', 'provider', 'role', 'round', 'run', 'session', 'transferEpoch'])
      || ![binding.basePolicySha256, binding.originPolicySha256, binding.originalReceiptSha256,
        binding.producerSha256, binding.profileSha256, original.sha256, envelopeSha256, instructionProfileSha256].every(hash)
      || ![binding.project, binding.provider, binding.run, binding.session].every(identifier)
      || !matches(PIN, binding.pin)
      || !utc(binding.deadline) || binding.encoding !== URL_DESIGN_VIEW_ENCODING || binding.role !== 'design'
      || !positive(binding.round, 999_999) || !positive(binding.transferEpoch)
      || !Array.isArray(parents) || !positive(parents.length, 4096) || !parents.every(hash)
      || !exactKeys(original, ['bytes', 'sha256']) || !positive(original.bytes, MAX_BYTES)
      || !positive(fileCount, 4096) || !positive(pageCount, fileCount)
      || !exactKeys(limits, ['partBytes', 'partCount', 'replyBytes', 'preparedBytes']) || !positive(limits.partBytes, MAX_BYTES)
      || !positive(limits.partCount, MAX_PARTS) || !positive(limits.replyBytes, MAX_BYTES) || !positive(limits.preparedBytes, MAX_BYTES)
      || !(envelope instanceof Uint8Array) || !positive(envelope.byteLength, MAX_BYTES)
      || Math.ceil(envelope.byteLength / limits.partBytes) > limits.partCount) return fail();
    const bytes = Uint8Array.from(envelope);
    if (sha256(bytes) !== envelopeSha256) return fail();
    const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
    const exactView = inspectUrlDesignEnvelope(decoder.decode(bytes));
    if (exactView.originalSha256 !== original.sha256 || exactView.originalBytes !== original.bytes) return fail();
    const parts: DesignPart[] = [], texts: string[] = [];
    let offset = 0;
    while (offset < bytes.length) {
      const ordinal = parts.length + 1;
      if (ordinal > limits.partCount) return fail();
      let end = Math.min(offset + limits.partBytes, bytes.length);
      while (end < bytes.length && (bytes[end]! & 0xc0) === 0x80) end--;
      if (end <= offset) return fail();
      const part = bytes.subarray(offset, end);
      const text = decoder.decode(part);
      if (text.includes('\u0000') || (ordinal === 1 && text.startsWith('\ufeff'))) return fail();
      const path = `round-${binding.round}/design-view-part-${ordinal}.json`;
      if (!isOrderedDesignPartPath(path)) return fail();
      parts.push({ bytes: part.length, offset, ordinal, path, sha256: sha256(part) });
      texts.push(text);
      offset = end;
    }
    const manifest: Manifest = { binding: { ...binding, parentSetSha256: sha256(canonical(parents)) }, format: FORMAT, envelopeBytes: bytes.length, envelopeSha256,
      originalBytes: original.bytes, originalSha256: original.sha256, partCount: parts.length, parts };
    const manifestText = canonical(manifest), manifestSha256 = sha256(manifestText);
    const prepared: OrderedDesignPrepared = { format: PREPARED_FORMAT, encoding: binding.encoding, envelopeBytes: manifest.envelopeBytes,
      envelopeSha256, fileCount, instructionProfileSha256, manifestSha256, originalBytes: original.bytes, originalSha256: original.sha256,
      pageCount, partCount: parts.length, round: binding.round };
    const preparedText = canonical(prepared, limits.preparedBytes);
    const replies = parts.map((part, index): PlannedReply => {
      const reply = replyText(manifest, manifestSha256, part, texts[index]!, limits.replyBytes);
      return { ordinal: part.ordinal, manifestSha256, bytes: Buffer.byteLength(reply), sha256: sha256(reply) };
    });
    const plan = deepFreeze({ manifest, manifestText, manifestSha256, prepared, preparedText, replies });
    issuedPlans.set(plan, Object.freeze({ ...limits }));
    return plan;
  } catch { return fail(); }
}

/** Reconstruct a sealed reply from the complete reverified envelope. The
 * caller still owns transfer currentness, the next ordinal and release. */
export function materializeOrderedDesignPart(plan: OrderedDesignPlan, envelope: Uint8Array, path: string): string {
  try {
    if (!isOrderedDesignPartPath(path)) return fail();
    const bytes = boundEnvelope(plan, envelope);
    const part = plan.manifest.parts.find(candidate => candidate.path === path);
    if (part === undefined) return fail();
    const slice = bytes.subarray(part.offset, part.offset + part.bytes);
    if (sha256(slice) !== part.sha256) return fail();
    const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(slice);
    const expected = plan.replies[part.ordinal - 1]!;
    const reply = replyText(plan.manifest, plan.manifestSha256, part, text, expected.bytes);
    if (Buffer.byteLength(reply) !== expected.bytes || sha256(reply) !== expected.sha256) return fail();
    return reply;
  } catch { return fail(); }
}
