import { encodeCanonicalJson, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { deepFreeze, isRecord, sha256 } from '@syzygy/support';
import { readUrlMachineClient, URL_MACHINE_CLIENT_LIMITS, type UrlMachineClientRecord } from './url-machine-instance.js';
import { identifyUrlMachineLifecycleRecord, type UrlMachineLifecycleStep } from './url-machine-lifecycle.js';

type Audit = Extract<UrlMachineLifecycleStep, { kind: 'audit' }>['event'];
export const URL_MACHINE_ARCHIVE_LIMITS = Object.freeze({ bytes: 10_000_000, records: 4096, nodes: 1_048_576, depth: 32, terminalBytes: 66_000 });
export interface UrlMachineArchivePointer {
  readonly sha256: string; readonly bytes: number; readonly records: number;
  /** Frozen legacy prefix: those exact old bytes were never archived. */
  readonly legacy: readonly { readonly clientId: string; readonly revision: number; readonly sha256: string }[];
}
export interface UrlMachineArchive {
  readonly format: 'url-machine-canonical-history/1'; readonly rootId: string;
  readonly entries: readonly { readonly clientId: string; readonly revision: number; readonly sha256: string; readonly record: UrlMachineClientRecord }[];
}
const exact = (v: unknown, keys: readonly string[]): v is Record<string, unknown> => isRecord(v)
  && Object.keys(v).length === keys.length && keys.every(key => Object.hasOwn(v, key));
const digest = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/u.test(v);
const count = (v: unknown, max: number): v is number => Number.isSafeInteger(v) && Number(v) >= 0 && Number(v) <= max;
const same = (a: unknown, b: unknown) => encodeCanonicalJson(a, URL_MACHINE_CLIENT_LIMITS) === encodeCanonicalJson(b, URL_MACHINE_CLIENT_LIMITS);
export const encodeUrlMachineArchive = (v: unknown): Buffer => Buffer.from(encodeCanonicalJson(v, {
  maxBytes: URL_MACHINE_ARCHIVE_LIMITS.bytes, maxNodes: URL_MACHINE_ARCHIVE_LIMITS.nodes, maxDepth: URL_MACHINE_ARCHIVE_LIMITS.depth,
}));
export function isUrlMachineArchivePointer(v: unknown): v is UrlMachineArchivePointer {
  return exact(v, ['sha256', 'bytes', 'records', 'legacy']) && digest(v.sha256) && count(v.bytes, URL_MACHINE_ARCHIVE_LIMITS.bytes) && v.bytes > 0
    && count(v.records, URL_MACHINE_ARCHIVE_LIMITS.records) && Array.isArray(v.legacy) && v.legacy.length <= 256
    && v.legacy.every(item => exact(item, ['clientId', 'revision', 'sha256']) && digest(item.clientId) && digest(item.sha256)
      && count(item.revision, URL_MACHINE_ARCHIVE_LIMITS.records) && item.revision > 0)
    && new Set(v.legacy.map(item => item.clientId)).size === v.legacy.length;
}
/** The reservation is consumed only by client-wide revocation. Ordinary grants
 * cannot spend the last bytes/event slots required for each issued client. */
export function urlMachineArchiveCapacity(bytes: number, records: number, activeClients: number): boolean {
  return count(bytes, URL_MACHINE_ARCHIVE_LIMITS.bytes) && count(records, URL_MACHINE_ARCHIVE_LIMITS.records) && count(activeClients, 256)
    && bytes + activeClients * URL_MACHINE_ARCHIVE_LIMITS.terminalBytes <= URL_MACHINE_ARCHIVE_LIMITS.bytes
    && records + activeClients <= URL_MACHINE_ARCHIVE_LIMITS.records;
}
export function readUrlMachineArchive(bytes: Uint8Array, pointer: UrlMachineArchivePointer, rootId: string,
  clients: readonly { readonly clientId: string; readonly audit: readonly Audit[] }[], now: number): UrlMachineArchive | null {
  try {
    if (!isUrlMachineArchivePointer(pointer) || bytes.byteLength !== pointer.bytes || sha256(bytes) !== pointer.sha256) return null;
    const value = parseBoundedJson(new TextDecoder('utf-8', { fatal: true }).decode(bytes), {
      maxBytes: URL_MACHINE_ARCHIVE_LIMITS.bytes, maxNodes: URL_MACHINE_ARCHIVE_LIMITS.nodes, maxDepth: URL_MACHINE_ARCHIVE_LIMITS.depth,
    });
    if (!exact(value, ['format', 'rootId', 'entries']) || value.format !== 'url-machine-canonical-history/1' || value.rootId !== rootId
      || !Array.isArray(value.entries) || value.entries.length !== pointer.records || !encodeUrlMachineArchive(value).equals(Buffer.from(bytes))) return null;
    const needed = new Map<string, Audit>();
    for (const legacy of pointer.legacy) {
      const client = clients.find(item => item.clientId === legacy.clientId), prior = client?.audit[legacy.revision - 1];
      if (!prior || prior.next.revision !== legacy.revision || prior.next.sha256 !== legacy.sha256) return null;
    }
    for (const client of clients) {
      const boundary = pointer.legacy.find(item => item.clientId === client.clientId)?.revision ?? 0;
      for (const audit of client.audit) if (audit.next.revision > boundary) needed.set(`${client.clientId}/${audit.next.revision}`, audit);
    }
    if (needed.size !== pointer.records) return null;
    for (const entry of value.entries) {
      if (!exact(entry, ['clientId', 'revision', 'sha256', 'record']) || !digest(entry.clientId) || !digest(entry.sha256)
        || !count(entry.revision, URL_MACHINE_ARCHIVE_LIMITS.records) || entry.revision === 0) return null;
      const key = `${entry.clientId}/${entry.revision}`, audit = needed.get(key); if (!audit) return null;
      const canonical = Buffer.from(encodeCanonicalJson(entry.record, URL_MACHINE_CLIENT_LIMITS));
      // Historical schema validation grants no authority. Original deadline
      // admissibility remains the cold consumer's independently supplied input.
      const read = readUrlMachineClient(canonical, { clientId: entry.clientId, policySha256: audit.policySha256, profileSha256: audit.profileSha256,
        sourcePin: audit.sourcePin, runId: audit.runId, role: audit.role, kind: audit.kind, allowedScopes: audit.scopes, now, deadline: 8_640_000_000_000_000 });
      if (audit.at > now || !read.ok || read.sha256 !== entry.sha256 || !same(identifyUrlMachineLifecycleRecord(read.record, read.sha256), audit.next)) return null;
      needed.delete(key);
    }
    return needed.size === 0 ? deepFreeze(value as unknown as UrlMachineArchive) : null;
  } catch { return null; }
}
