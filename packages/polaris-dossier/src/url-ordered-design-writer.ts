import { randomUUID } from 'node:crypto';
import { encodeCanonicalJson, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { deepFreeze } from '@syzygy/support';
import {
  ORDERED_DESIGN_AUDIT_FORMAT, ORDERED_DESIGN_AUDIT_RECORD_LIMITS, verifyOrderedDesignAuditPrefix,
  verifyOrderedDesignTerminalEvidence,
  type OrderedDesignAuditEvent, type OrderedDesignAuditKind, type OrderedDesignAuditPayloads,
  type OrderedDesignAuditPrefixInput, type OrderedDesignAuditReference, type OrderedDesignTerminalEvidence,
} from './url-ordered-design-audit.js';

const RETIREMENT_REASONS = ['refused', 'transport-uncertain', 'interrupted', 'exhausted'] as const;
type RetirementReason = typeof RETIREMENT_REASONS[number];
type RetiredRecord = Omit<OrderedDesignAuditEvent<'eligible'>, 'kind' | 'payload'> & {
  readonly kind: 'retired';
  readonly payload: { readonly reason: RetirementReason };
};
export type OrderedDesignStoredRecord = OrderedDesignAuditEvent<OrderedDesignAuditKind> | RetiredRecord;

export interface OrderedDesignAuditWriter {
  /** Return only after this exact record is durable and reread under the
   * protected cursor. The caller owns the authenticity of cited callbacks. */
  append<K extends OrderedDesignAuditKind>(kind: K, payload: OrderedDesignAuditPayloads[K]): Promise<OrderedDesignAuditReference>;
  retire(reason: RetirementReason): Promise<void>;
  readTerminal(): Promise<OrderedDesignTerminalEvidence>;
}

interface OrderedDesignAuditStore {
  /** The protected writer serializes, syncs and verifies its enclosing audit
   * segment. The returned reader must open and check the actual stored bytes. */
  append(record: OrderedDesignStoredRecord): Promise<() => Uint8Array>;
  current(): Promise<boolean>;
}

const refused = (): Error => new Error('url-ordered-design-audit-writer-refused');
const canonical = (value: unknown): Buffer => Buffer.from(encodeCanonicalJson(value, ORDERED_DESIGN_AUDIT_RECORD_LIMITS));

/**
 * A single live attempt over the URL session audit's protected append-only
 * segment. A failure with an uncertain write retires the in-memory cursor.
 * Reopening durable attempts after process loss is a separate operation.
 */
export function createOrderedDesignAuditWriter(
  context: Omit<OrderedDesignAuditPrefixInput, 'asOf' | 'records'>, store: OrderedDesignAuditStore,
): OrderedDesignAuditWriter {
  const { profile, plan, principal } = context;
  const deadline = Date.parse(plan.manifest.binding.deadline);
  const readPrefix = (records: readonly Uint8Array[], asOf: number) =>
    verifyOrderedDesignAuditPrefix({ profile, plan, principal, asOf, records });
  const startedAt = Date.now();
  if (!(startedAt < deadline) || !readPrefix([], startedAt)) throw refused();
  const readers: Array<() => Uint8Array> = [];
  let disposition: 'open' | 'invalid-prefix' | 'uncertain' | 'eligible' | 'retired' = 'open';
  let terminal: OrderedDesignTerminalEvidence['terminal'] | null = null;
  let busy = false;

  async function current(): Promise<number> {
    if (!(Date.now() < deadline) || await store.current() !== true) throw refused();
    const asOf = Date.now();
    if (!(asOf < deadline)) throw refused();
    return asOf;
  }
  const readRecords = (): Uint8Array[] => readers.map(read => read());

  const durable = async (record: OrderedDesignStoredRecord, bytes: Buffer): Promise<void> => {
    // The started write may have reached disk even if its wait rejects.
    disposition = 'uncertain';
    const read = await store.append(record);
    if (!bytes.equals(read())) throw refused();
    await current();
    if (!bytes.equals(read()) || !(Date.now() < deadline)) throw refused();
    readers.push(read);
  };
  const append: OrderedDesignAuditWriter['append'] = async (kind, payload) => {
    if (busy || disposition !== 'open') throw refused();
    busy = true;
    disposition = 'invalid-prefix';
    try {
      const snapshot = deepFreeze(parseBoundedJson(canonical(payload).toString('utf8'), ORDERED_DESIGN_AUDIT_RECORD_LIMITS));
      const asOf = await current();
      const records = readRecords();
      const prefix = readPrefix(records, asOf);
      if (!prefix || prefix.next !== kind) throw refused();
      const record = Object.freeze({ format: ORDERED_DESIGN_AUDIT_FORMAT, id: randomUUID(), attemptSha256: prefix.attemptSha256,
        previous: prefix.tip, at: new Date(asOf).toISOString(), kind, payload: snapshot });
      const bytes = canonical(record);
      const candidate = readPrefix([...records, bytes], asOf);
      if (!candidate?.tip || (kind === 'eligible') !== (candidate.terminalCandidate !== null)) throw refused();
      await durable(record as OrderedDesignStoredRecord, bytes);
      terminal = candidate.terminalCandidate?.terminal ?? null;
      disposition = terminal === null ? 'open' : 'eligible';
      return candidate.tip;
    } finally { busy = false; }
  };
  const retire: OrderedDesignAuditWriter['retire'] = async reason => {
    if (busy || (disposition !== 'open' && disposition !== 'invalid-prefix') || !RETIREMENT_REASONS.includes(reason)) throw refused();
    busy = true;
    disposition = 'invalid-prefix';
    try {
      const asOf = await current();
      const prefix = readPrefix(readRecords(), asOf);
      if (!prefix || prefix.next === null) throw refused();
      const record: RetiredRecord = { format: ORDERED_DESIGN_AUDIT_FORMAT, id: randomUUID(), attemptSha256: prefix.attemptSha256,
        previous: prefix.tip, at: new Date(asOf).toISOString(), kind: 'retired', payload: { reason } };
      await durable(record, canonical(record));
      disposition = 'retired';
    } finally { busy = false; }
  };
  const readTerminal: OrderedDesignAuditWriter['readTerminal'] = async () => {
    if (busy || disposition !== 'eligible' || terminal === null) throw refused();
    busy = true;
    disposition = 'uncertain';
    try {
      const asOf = await current();
      const evidence = verifyOrderedDesignTerminalEvidence({ profile, plan, principal, asOf, records: readRecords(), terminal });
      if (evidence === null || !(Date.now() < deadline)) throw refused();
      disposition = 'eligible';
      return evidence;
    } finally { busy = false; }
  };
  return Object.freeze({ append, retire, readTerminal });
}
