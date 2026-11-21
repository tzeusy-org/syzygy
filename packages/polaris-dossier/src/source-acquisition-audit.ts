import { constants } from 'node:fs';
import { lstat, open, realpath, type FileHandle } from 'node:fs/promises';
import path from 'node:path';
import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { isRecord, sha256 } from '@syzygy/support';
import { buildDossierScreen, type DossierScreen } from './screen.js';
import { urlSourceTransportIdentity } from './url-run-record.js';
import { planUrlRevision } from './url-revision.js';
import { GIT_MEMORY_WORKER_LIMITS, GIT_MEMORY_WORKER_PROFILE } from './git-memory-worker.js';
import { GIT_MEMORY_PACK_LIMITS } from './git-memory-pack.js';
import { SESSION_CONTENT_CLASSES } from './session-egress-policy.js';
import type { UrlMemoryAudit, UrlMemoryPolicy } from './url-memory-acquisition.js';

export const SOURCE_ACQUISITION_AUDIT_FORMAT = 'source-acquisition-audit/1' as const;
export interface SourceAcquisitionAuditLimits {
  readonly events: number; readonly eventBytes: number; readonly segmentBytes: number;
  readonly milliseconds: number; readonly exclusions: number;
}
export const SOURCE_ACQUISITION_AUDIT_LIMITS: SourceAcquisitionAuditLimits = Object.freeze({
  events: 1024, eventBytes: 262_144, segmentBytes: 16_777_216, milliseconds: 5000, exclusions: 512,
});
export interface SourceAcquisitionAuditRequest {
  /** Canonical, owned, owner-private parent outside role/private-view reach. */
  readonly parent: string; readonly name: string;
  /** Independently validated host inputs, never learned from an event. */
  readonly locator: string; readonly selector?: string; readonly policy: UrlMemoryPolicy;
  readonly program: { readonly nodeSha256: string; readonly bundleSha256: string };
  /** Independently verifies the current committed/adopted policy bindings. */
  readonly current: () => boolean | Promise<boolean>;
  readonly limits?: Partial<SourceAcquisitionAuditLimits>;
}
export interface SourceAcquisitionAuditSummary {
  readonly format: typeof SOURCE_ACQUISITION_AUDIT_FORMAT; readonly closed: boolean; readonly poisoned: boolean;
  readonly durableEvents: number; readonly durableBytes: number; readonly tipSha256: string | null;
  readonly tail: 'complete' | 'Unknown'; readonly limits: SourceAcquisitionAuditLimits;
  readonly hostileSameUidIsolation: 'Unknown';
}
export type SourceAcquisitionAuditResult = {
  readonly ok: true; readonly audit: (event: UrlMemoryAudit) => Promise<void>;
  readonly close: () => Promise<SourceAcquisitionAuditSummary>; readonly summary: () => SourceAcquisitionAuditSummary;
} | { readonly ok: false; readonly code: 'source-audit-unavailable' };

const hex = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
const exact = (value: unknown, names: readonly string[]): value is Record<string, unknown> => isRecord(value)
  && Object.keys(value).length === names.length && names.every(name => Object.hasOwn(value, name));
const canonical = (value: unknown, bytes = SOURCE_ACQUISITION_AUDIT_LIMITS.eventBytes): string => encodeCanonicalJson(value, { maxBytes: bytes, maxNodes: 16_384, maxDepth: 20 });
const hash = (value: unknown): string => sha256(canonical(value));
const oid = (value: unknown): value is string => typeof value === 'string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(value);
const integer = (value: unknown, max: number, min = 0): value is number => Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max;
const equal = (a: unknown, b: unknown): boolean => canonical(a) === canonical(b);
const oneOf = (value: unknown, choices: readonly string[]): value is string => typeof value === 'string' && choices.includes(value);
function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (typeof value === 'number' || typeof value === 'boolean') out.push(String(value));
  else if (Array.isArray(value)) for (const item of value) strings(item, out);
  else if (isRecord(value)) for (const [key, item] of Object.entries(value)) { out.push(key); strings(item, out); }
  return out;
}
function screenAll(screen: DossierScreen, value: unknown, encoded: string): void {
  const fields = strings(value);
  if (fields.some(field => Buffer.from(field).toString('utf8') !== field || screen.screenBody(field) !== undefined)
    || screen.screenBody(fields.join('')) !== undefined || screen.screenBody(encoded) !== undefined) throw new Error();
}
function limitsOf(given: Partial<SourceAcquisitionAuditLimits> = {}): SourceAcquisitionAuditLimits {
  if (!isRecord(given) || Object.entries(given).some(([key, value]) => !Object.hasOwn(SOURCE_ACQUISITION_AUDIT_LIMITS, key)
    || !integer(value, SOURCE_ACQUISITION_AUDIT_LIMITS[key as keyof SourceAcquisitionAuditLimits], 1))) throw new Error();
  return Object.freeze({ ...SOURCE_ACQUISITION_AUDIT_LIMITS, ...given });
}

/** Strict validation precedes projection. Raw paths and object identifiers are
 * deliberately replaced by hashes in the persistent schema below. */
function project(event: unknown, expected: {
  readonly source: Extract<ReturnType<typeof urlSourceTransportIdentity>, { ok: true }>;
  readonly selector: string | null; readonly policy: UrlMemoryPolicy;
  readonly program: SourceAcquisitionAuditRequest['program']; readonly limits: SourceAcquisitionAuditLimits;
}): { readonly record: Record<string, unknown>; readonly acquisition: string; readonly pin: string | null } {
  const withWorker = isRecord(event) && Object.hasOwn(event, 'worker');
  if (!exact(event, ['stage', 'direction', 'state', 'context', 'metadataSha256', ...(withWorker ? ['worker'] : [])])
    || !oneOf(event['stage'], ['declared-attempt', 'selection', 'receive', 'whole-closure', 'supplied-clone', 'complete'])
    || !oneOf(event['direction'], ['local', 'presend', 'ingest']) || !oneOf(event['state'], ['attempted', 'admitted', 'refused', 'Unknown'])
    || (event['metadataSha256'] !== null && !hex(event['metadataSha256']))) throw new Error();
  if (event['direction'] !== 'local' && (!oneOf(event['stage'], ['selection', 'receive']) || event['state'] !== 'admitted' || !hex(event['metadataSha256']))) throw new Error();
  const context = event['context'];
  if (!exact(context, ['provisionalRun', 'acquisition', 'sourceProvider', 'destination', 'locatorSha256', 'selectorSha256', 'selectedCommit', 'sourceBinding', 'policySha256', 'originPolicySha256'])
    || typeof context['acquisition'] !== 'string' || !/^acq-[a-f0-9]{32}$/u.test(context['acquisition']) || context['provisionalRun'] !== `provisional-${context['acquisition']}`
    || context['sourceProvider'] !== expected.source.providerId || !equal(context['destination'], expected.source.destination)
    || context['locatorSha256'] !== sha256(expected.source.originalLocator) || context['selectorSha256'] !== (expected.selector === null ? null : sha256(expected.selector))
    || (context['selectedCommit'] !== null && !oid(context['selectedCommit'])) || context['policySha256'] !== expected.policy.sha256 || context['originPolicySha256'] !== expected.policy.originSha256) throw new Error();
  const pin = context['selectedCommit'];
  if (context['sourceBinding'] !== hash({ destination: expected.source.destination, provider: expected.source.providerId, selectedCommit: pin,
    policySha256: expected.policy.sha256, originPolicySha256: expected.policy.originSha256 })) throw new Error();
  const binding = { acquisitionSha256: sha256(context['acquisition']), provisionalRunSha256: sha256(String(context['provisionalRun'])),
    sourceProvider: expected.source.providerId, destinationSha256: hash(expected.source.destination), locatorSha256: context['locatorSha256'], selectorSha256: context['selectorSha256'],
    selectedCommitSha256: pin === null ? null : sha256(pin), sourceBinding: context['sourceBinding'], policySha256: expected.policy.sha256, originPolicySha256: expected.policy.originSha256 };
  let worker: Record<string, unknown> | null = null;
  if (withWorker) {
    const value = event['worker'], outcome = isRecord(value) && Object.hasOwn(value, 'outcome');
    if (event['stage'] !== 'whole-closure' || event['direction'] !== 'local' || pin === null
      || !exact(value, ['stage', 'binding', 'contextSha256', 'profile', 'program', 'limits', 'receipt', 'exclusions', ...(outcome ? ['outcome'] : [])])
      || !oneOf(value['stage'], ['whole-closure-admitted', 'acquisition-excluded', 'worker-refused'])
      || value['profile'] !== GIT_MEMORY_WORKER_PROFILE || !hex(value['contextSha256']) || !equal(value['program'], expected.program)
      || !exact(value['binding'], ['run', 'acquisition', 'sourceBinding', 'policySha256', 'originPolicySha256'])
      || !equal(value['binding'], { run: context['provisionalRun'], acquisition: context['acquisition'], sourceBinding: context['sourceBinding'], policySha256: context['policySha256'], originPolicySha256: context['originPolicySha256'] })
      || !exact(value['limits'], Object.keys(GIT_MEMORY_WORKER_LIMITS)) || Object.entries(value['limits']).some(([key, limit]) => !integer(limit, GIT_MEMORY_WORKER_LIMITS[key as keyof typeof GIT_MEMORY_WORKER_LIMITS], 1))
      || !Array.isArray(value['exclusions']) || value['exclusions'].length > expected.limits.exclusions) throw new Error();
    if (outcome && (value['stage'] !== 'worker-refused' || !oneOf(value['outcome'], ['worker-refused', 'worker-limit', 'worker-binding-stale', 'worker-audit-failed', 'worker-unavailable', 'worker-termination-unknown', 'invalid-worker-input']))) throw new Error();
    if (event['state'] !== (value['stage'] === 'whole-closure-admitted' ? 'admitted' : 'refused') || event['metadataSha256'] !== value['contextSha256']) throw new Error();
    let receipt: Record<string, unknown> | null = null;
    if (value['receipt'] !== null) {
      const raw = value['receipt'];
      if (!exact(raw, ['commit', 'objectFormat', 'objectCount', 'retainedBytes', 'policySha256', 'originPolicySha256', 'classes', 'identitiesSha256'])
        || raw['commit'] !== pin || raw['objectFormat'] !== (pin.length === 40 ? 'sha1' : 'sha256') || raw['policySha256'] !== expected.policy.sha256 || raw['originPolicySha256'] !== expected.policy.originSha256
        || !integer(raw['objectCount'], GIT_MEMORY_PACK_LIMITS.maxObjects, 1) || !integer(raw['retainedBytes'], GIT_MEMORY_PACK_LIMITS.maxResolvedBytes) || !hex(raw['identitiesSha256'])
        || !Array.isArray(raw['classes']) || raw['classes'].length === 0 || raw['classes'].length > SESSION_CONTENT_CLASSES.length || new Set(raw['classes']).size !== raw['classes'].length
        || raw['classes'].some(item => !SESSION_CONTENT_CLASSES.includes(item))) throw new Error();
      const { commit: _commit, ...safe } = raw; receipt = { ...safe, commitSha256: sha256(pin) };
    }
    if (value['stage'] === 'whole-closure-admitted' && (receipt === null || value['exclusions'].length !== 0)) throw new Error();
    if (value['stage'] === 'acquisition-excluded' && receipt !== null) throw new Error();
    const exclusions = value['exclusions'].map(item => {
      if (!exact(item, ['species', 'locationSha256', 'contentSha256', 'policySha256', 'originPolicySha256', 'outcome'])
        || !oneOf(item['species'], ['commit', 'tree-alias', 'blob-alias']) || !hex(item['locationSha256']) || !hex(item['contentSha256'])
        || item['policySha256'] !== expected.policy.sha256 || item['originPolicySha256'] !== expected.policy.originSha256
        || !oneOf(item['outcome'], ['denied-path', 'secret-detector-match', 'unknown-extraction-class', 'not-utf8-text', 'active-content', 'redacted-span', 'screening-failed'])) throw new Error();
      return { ...item };
    });
    worker = { stage: value['stage'], outcome: outcome ? value['outcome'] : null, contextSha256: value['contextSha256'], profile: value['profile'], program: { ...expected.program }, limits: { ...value['limits'] }, receipt, exclusions };
  }
  return { record: { stage: event['stage'], direction: event['direction'], state: event['state'], binding, metadataSha256: event['metadataSha256'], worker }, acquisition: context['acquisition'], pin };
}

/** A fresh single segment only. The chain is local durable evidence, not a
 * provider receipt or a hostile same-UID/filesystem isolation guarantee. */
export async function createSourceAcquisitionAudit(given: SourceAcquisitionAuditRequest): Promise<SourceAcquisitionAuditResult> {
  let file: FileHandle | null = null, parent: FileHandle | null = null, poisoned = false, closed = false;
  let limits = SOURCE_ACQUISITION_AUDIT_LIMITS;
  let durableEvents = 0, durableBytes = 0, tipSha256: string | null = null, prefix = Buffer.alloc(0);
  let acquisition: string | null = null, pin: string | null = null, pending = 0;
  const seen = new Set<string>();
  const refuse = (): never => { poisoned = true; throw new Error('source-audit-refused'); };
  const guard = (): void => { if (poisoned || closed) refuse(); };
  const bounded = async <T>(operation: Promise<T>): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try { return await Promise.race([operation, new Promise<never>((_, reject) => { timer = setTimeout(() => { poisoned = true; reject(new Error('source-audit-refused')); }, limits.milliseconds); })]); }
    finally { clearTimeout(timer); }
  };
  const summary = (): SourceAcquisitionAuditSummary => ({ format: SOURCE_ACQUISITION_AUDIT_FORMAT, closed, poisoned, durableEvents, durableBytes, tipSha256, tail: poisoned ? 'Unknown' : 'complete', limits, hostileSameUidIsolation: 'Unknown' });
  try {
    limits = limitsOf(given.limits);
    if (typeof given.current !== 'function' || !exact(given.program, ['nodeSha256', 'bundleSha256']) || !hex(given.program.nodeSha256) || !hex(given.program.bundleSha256)
      || !path.isAbsolute(given.parent) || path.resolve(given.parent) !== given.parent || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,120}\.jsonl$/u.test(given.name)
      || !(given.policy.bytes instanceof Uint8Array) || given.policy.bytes.length === 0 || given.policy.bytes.length > 2_097_152
      || !(given.policy.originBytes instanceof Uint8Array) || given.policy.originBytes.length === 0 || given.policy.originBytes.length > 2_097_152
      || sha256(given.policy.bytes) !== given.policy.sha256 || !hex(given.policy.sha256) || sha256(given.policy.originBytes) !== given.policy.originSha256 || !hex(given.policy.originSha256)
      || !['private', 'public'].includes(given.policy.visibility) || (given.policy.repository !== undefined && !/^repository:[a-z0-9][a-z0-9._-]{0,127}$/u.test(given.policy.repository))) throw new Error();
    const request = Object.freeze({ ...given, policy: Object.freeze({ ...given.policy, bytes: Uint8Array.from(given.policy.bytes), originBytes: Uint8Array.from(given.policy.originBytes) }), program: Object.freeze({ ...given.program }), current: given.current });
    const source = urlSourceTransportIdentity(request.locator);
    if (!source.ok || !planUrlRevision(request.selector).ok || await bounded(Promise.resolve().then(request.current)) !== true) throw new Error();
    const loaded = buildDossierScreen(request.policy.bytes, true, null, request.policy.visibility);
    if (!loaded.ok) throw new Error();
    const screen = loaded.screen;
    screenAll(screen, [request.locator, request.selector ?? '', request.name], canonical([request.locator, request.selector ?? '', request.name]));
    if (await bounded(realpath(request.parent)) !== request.parent) throw new Error();
    parent = await bounded(open(request.parent, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW));
    const parentStat = await bounded(parent.stat({ bigint: true }));
    if (!parentStat.isDirectory() || parentStat.uid !== BigInt(process.getuid?.() ?? -1) || (parentStat.mode & 0o077n) !== 0n) throw new Error();
    const parentIdentity = (stat: typeof parentStat): boolean => stat.isDirectory() && stat.dev === parentStat.dev && stat.ino === parentStat.ino && stat.uid === parentStat.uid && stat.mode === parentStat.mode;
    const full = path.join(request.parent, request.name);
    file = await bounded(open(full, constants.O_RDWR | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW | constants.O_APPEND, 0o600));
    const fileStat = await bounded(file.stat({ bigint: true }));
    if (!fileStat.isFile() || fileStat.uid !== parentStat.uid || (fileStat.mode & 0o777n) !== 0o600n || fileStat.nlink !== 1n || fileStat.size !== 0n) throw new Error();
    let modified = fileStat.mtimeNs, changed = fileStat.ctimeNs;
    const identities = async (expectedPrefix = prefix, expectedModified = modified, expectedChanged = changed): Promise<void> => {
      guard();
      if (await realpath(request.parent) !== request.parent || !parentIdentity(await lstat(request.parent, { bigint: true })) || !parentIdentity(await parent!.stat({ bigint: true }))) refuse();
      for (const stat of [await file!.stat({ bigint: true }), await lstat(full, { bigint: true })]) {
        if (!stat.isFile() || stat.dev !== fileStat.dev || stat.ino !== fileStat.ino || stat.uid !== fileStat.uid || stat.mode !== fileStat.mode || stat.nlink !== 1n
          || stat.size !== BigInt(expectedPrefix.length) || stat.mtimeNs !== expectedModified || stat.ctimeNs !== expectedChanged) refuse();
      }
      const bytes = Buffer.alloc(expectedPrefix.length); let offset = 0;
      while (offset < bytes.length) { guard(); const read = await file!.read(bytes, offset, bytes.length - offset, offset); if (read.bytesRead === 0) refuse(); offset += read.bytesRead; }
      if (sha256(bytes) !== sha256(expectedPrefix)) refuse();
      guard();
    };
    await bounded(parent.sync()); await bounded(identities());
    if (await bounded(Promise.resolve().then(request.current)) !== true) throw new Error();
    let queue = Promise.resolve();
    const audit = (event: UrlMemoryAudit): Promise<void> => {
      if (poisoned || closed || pending >= 8) { poisoned = true; return Promise.reject(new Error('source-audit-refused')); }
      let snapshot: unknown;
      try { const raw = canonical(event, limits.eventBytes); snapshot = JSON.parse(raw) as unknown; screenAll(screen, snapshot, raw); }
      catch { poisoned = true; return Promise.reject(new Error('source-audit-refused')); }
      pending++;
      const append = async (): Promise<void> => {
        guard();
        const projected = project(snapshot, { source, selector: request.selector ?? null, policy: request.policy, program: request.program, limits });
        if ((acquisition !== null && acquisition !== projected.acquisition) || (pin !== null && pin !== projected.pin) || durableEvents >= limits.events) refuse();
        const identity = hash(projected.record); if (seen.has(identity)) refuse();
        const body = { format: SOURCE_ACQUISITION_AUDIT_FORMAT, sequence: durableEvents + 1, previousSha256: tipSha256, event: projected.record };
        const digest = hash(body), encoded = canonical({ ...body, sha256: digest }, limits.eventBytes), bytes = Buffer.from(encoded + '\n');
        screenAll(screen, projected.record, encoded);
        if (durableBytes + bytes.length > limits.segmentBytes) refuse();
        if (await request.current() !== true) refuse(); guard(); await identities(); guard();
        let offset = 0;
        while (offset < bytes.length) { guard(); const wrote = await file!.write(bytes, offset, bytes.length - offset, null); if (wrote.bytesWritten === 0) refuse(); offset += wrote.bytesWritten; }
        await file!.sync(); guard();
        const after = await file!.stat({ bigint: true });
        const next = Buffer.concat([prefix, bytes]);
        if (after.size !== BigInt(next.length)) refuse();
        await identities(next, after.mtimeNs, after.ctimeNs); guard();
        durableBytes = next.length; prefix = next; modified = after.mtimeNs; changed = after.ctimeNs;
        durableEvents++; tipSha256 = digest; acquisition = projected.acquisition; pin = projected.pin; seen.add(identity);
        if (await request.current() !== true) refuse(); guard();
      };
      const operation = queue.then(() => bounded(append())).catch(() => refuse());
      queue = operation.catch(() => undefined).finally(() => { pending--; });
      return operation;
    };
    const close = async (): Promise<SourceAcquisitionAuditSummary> => {
      if (closed) return summary();
      try { await bounded(queue); if (!poisoned) await bounded(identities()); } catch { poisoned = true; }
      try { if (file) { await bounded(file.close()); file = null; } } catch { poisoned = true; }
      try { if (parent) { await bounded(parent.close()); parent = null; } } catch { poisoned = true; }
      closed = file === null && parent === null;
      return summary();
    };
    return { ok: true, audit, close, summary };
  } catch {
    poisoned = true;
    try { if (file) await bounded(file.close()); } catch { /* Fixed public refusal only. */ }
    try { if (parent) await bounded(parent.close()); } catch { /* Caller owns any empty/partial segment. */ }
    return { ok: false, code: 'source-audit-unavailable' };
  }
}
