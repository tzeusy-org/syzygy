import { constants, type BigIntStats } from 'node:fs';
import { lstat, open, realpath, type FileHandle } from 'node:fs/promises';
import path from 'node:path';
import { encodeCanonicalJson, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { decodeUtf8, deepFreeze, isRecord, sha256 } from '@syzygy/support';
import type { SessionContentClass } from './session-egress-policy.js';
import type { ViewRole } from './session-view.js';
import { URL_SESSION_AUDIT_FORMAT, URL_SESSION_AUDIT_LIMITS, type UrlSessionAuditScope } from './url-session-audit.js';

const ROLES = ['author', 'inventory', 'fidelity', 'design'] as const;
type Limits = typeof URL_SESSION_AUDIT_LIMITS;
interface Declaration {
  readonly scope: UrlSessionAuditScope;
  readonly payload: {
    readonly project: string; readonly pin: string; readonly principal: string;
    readonly declaredClasses: readonly SessionContentClass[]; readonly profile: string;
    readonly limits: { readonly [K in keyof Limits]: number };
    readonly capture: 'host-callbacks-only'; readonly providerReceipts: 'Unknown'; readonly nativeSendCensus: 'Unknown';
  };
}
export interface UrlSessionAuditHistoryExpected {
  readonly durableRecords: number; readonly durableBytes: number; readonly tipSha256: string;
  readonly roles: Readonly<Record<ViewRole, { readonly records: number; readonly bytes: number; readonly tipSha256: string }>>;
  /** Supplied from independent protected expectations, never learned from these files. */
  readonly declarations: Readonly<Record<ViewRole, Declaration>>;
}
export interface UrlSessionAuditHistoryOptions {
  readonly parent: string; readonly name: string; readonly expected: UrlSessionAuditHistoryExpected;
  readonly current: () => boolean;
}
export interface VerifiedUrlSessionAuditHistory {
  readonly kind: 'verified-local-audit-history'; readonly authorization: 'none'; readonly replay: 'forbidden';
  readonly completeness: 'Unknown'; readonly records: number; readonly bytes: number; readonly tipSha256: string;
  readonly capturedLaunchTerminals: number; readonly capturedCompleteExchanges: number;
}
function fail(): never { throw new Error('url-session-audit-history-unavailable'); }
const hex = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/u.test(v);
const count = (v: unknown, max = Number.MAX_SAFE_INTEGER): v is number => Number.isSafeInteger(v) && Number(v) >= 0 && Number(v) <= max;
const exact = (v: unknown, keys: readonly string[]): v is Record<string, unknown> => isRecord(v)
  && Object.keys(v).length === keys.length && keys.every(key => Object.hasOwn(v, key));
const canonical = (v: unknown, maxBytes: number = URL_SESSION_AUDIT_LIMITS.eventBytes): string =>
  encodeCanonicalJson(v, { maxBytes, maxNodes: 32_768, maxDepth: 16 });
const equal = (a: unknown, b: unknown): boolean => canonical(a) === canonical(b);
type Stat = BigIntStats;
const same = (a: Stat, b: Stat): boolean => a.dev === b.dev && a.ino === b.ino && a.uid === b.uid && a.mode === b.mode
  && a.nlink === b.nlink && a.size === b.size && a.mtimeNs === b.mtimeNs && a.ctimeNs === b.ctimeNs;
interface Row { readonly sequence: number; readonly sha256: string; readonly previousSha256: unknown; readonly event: Record<string, unknown> }

/** Read-only, bounded verification of a captured boundary. No files are created,
 * no old writer/capability is reopened and no statement of current cleanup,
 * provider receipt, complete send census or authorization is issued.
 * The independent expected tips are essential: a chain alone permits truncation.
 * Whole protected-store rollback by a privileged host remains outside this proof.
 */
export async function verifyUrlSessionAuditHistory(given: UrlSessionAuditHistoryOptions): Promise<VerifiedUrlSessionAuditHistory | null> {
  let active = true, timer: ReturnType<typeof setTimeout> | undefined;
  const handles = new Set<FileHandle>();
  const began = performance.now(), current = given.current;
  const check = (): void => {
    if (!active || performance.now() - began >= URL_SESSION_AUDIT_LIMITS.milliseconds || current() !== true) fail();
  };
  const acquire = async (name: string, flags: number): Promise<FileHandle> => {
    check(); const file = await open(name, flags);
    if (!active) { void file.close().catch(() => {}); return fail(); }
    handles.add(file); check(); return file;
  };
  const work = async (): Promise<VerifiedUrlSessionAuditHistory> => {
    // Snapshot trusted metadata before the first await. It is not a persisted
    // checkpoint format and accepting it does not establish its provenance.
    const parent = given.parent, name = given.name;
    const expected = deepFreeze(parseBoundedJson(canonical(given.expected, 262_144), { maxBytes: 262_144, maxNodes: 32_768, maxDepth: 16 })) as unknown as UrlSessionAuditHistoryExpected;
    check();
    if (!path.isAbsolute(parent) || path.resolve(parent) !== parent || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/u.test(name)
      || !exact(expected, ['durableRecords', 'durableBytes', 'tipSha256', 'roles', 'declarations'])
      || !count(expected.durableRecords, URL_SESSION_AUDIT_LIMITS.events + 4) || expected.durableRecords < 4
      || !count(expected.durableBytes, URL_SESSION_AUDIT_LIMITS.bytes) || !hex(expected.tipSha256)
      || !exact(expected.roles, ROLES) || !exact(expected.declarations, ROLES)) fail();
    let recordCount = 0, byteCount = 0;
    const reference = expected.declarations.author;
    for (const role of ROLES) {
      const tip = expected.roles[role], declaration = expected.declarations[role];
      if (!exact(tip, ['records', 'bytes', 'tipSha256']) || !count(tip.records, expected.durableRecords) || tip.records < 1
        || !count(tip.bytes, expected.durableBytes) || tip.bytes < 1 || !hex(tip.tipSha256)
        || !exact(declaration, ['scope', 'payload']) || !exact(declaration.scope, ['binding', 'originPolicySha256', 'profileSha256'])
        || !exact(declaration.scope.binding, ['run', 'role', 'sourceBinding', 'policy', 'provider', 'model'])
        || declaration.scope.binding.role !== role || !hex(declaration.scope.profileSha256) || !hex(declaration.scope.originPolicySha256)
        || !hex(declaration.scope.binding.sourceBinding) || !hex(declaration.scope.binding.policy)
        || !exact(declaration.payload, ['project', 'pin', 'principal', 'declaredClasses', 'profile', 'limits', 'capture', 'providerReceipts', 'nativeSendCensus'])
        || declaration.payload.capture !== 'host-callbacks-only' || declaration.payload.providerReceipts !== 'Unknown'
        || declaration.payload.nativeSendCensus !== 'Unknown' || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(declaration.payload.pin)
        || !exact(declaration.payload.limits, Object.keys(URL_SESSION_AUDIT_LIMITS))
        || Object.entries(declaration.payload.limits).some(([key, value]) => !count(value, URL_SESSION_AUDIT_LIMITS[key as keyof Limits]) || value === 0)
        || !equal({ ...declaration.scope.binding, role: 'author' }, reference.scope.binding)
        || declaration.scope.originPolicySha256 !== reference.scope.originPolicySha256
        || !equal({ ...declaration.payload, profile: reference.payload.profile }, reference.payload)) fail();
      recordCount += tip.records; byteCount += tip.bytes;
    }
    if (recordCount !== expected.durableRecords || byteCount !== expected.durableBytes) fail();
    if (await realpath(parent) !== parent) fail(); check();
    const directory = await acquire(parent, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
    const directoryStat = await directory.stat({ bigint: true });
    if (!directoryStat.isDirectory() || directoryStat.uid !== BigInt(process.getuid?.() ?? -1) || (directoryStat.mode & 0o7777n) !== 0o700n) fail();
    const rootCurrent = async (): Promise<void> => {
      check(); const named = await lstat(parent, { bigint: true }), held = await directory.stat({ bigint: true }); check();
      if (await realpath(parent) !== parent || !same(directoryStat, named) || !same(directoryStat, held)) fail(); check();
    };
    const rows: Row[] = [];
    const files: { file: FileHandle; name: string; stat: Stat }[] = [];
    for (const role of ROLES) {
      await rootCurrent();
      const fileName = path.join(parent, `${name}-${role}.jsonl`);
      const file = await acquire(`/proc/self/fd/${directory.fd}/${name}-${role}.jsonl`, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
      const before = await file.stat({ bigint: true }); check();
      if (!before.isFile() || before.uid !== directoryStat.uid || (before.mode & 0o7777n) !== 0o600n || before.nlink !== 1n
        || before.size !== BigInt(expected.roles[role].bytes) || !same(before, await lstat(fileName, { bigint: true }))) fail(); check();
      const bytes = Buffer.alloc(Number(before.size) + 1); let offset = 0;
      while (offset < bytes.length) {
        check(); const result = await file.read(bytes, offset, Math.min(65_536, bytes.length - offset), offset); check();
        if (result.bytesRead === 0) break; offset += result.bytesRead;
      }
      if (offset !== Number(before.size) || !same(before, await file.stat({ bigint: true })) || !same(before, await lstat(fileName, { bigint: true }))) fail(); check();
      const text = decodeUtf8(bytes.subarray(0, offset));
      if (text === undefined || !text.endsWith('\n')) fail();
      const lines = text.slice(0, -1).split('\n');
      if (lines.length !== expected.roles[role].records) fail();
      let previous: string | null = null;
      for (const [index, line] of lines.entries()) {
        check();
        const row: unknown = parseBoundedJson(line, { maxBytes: URL_SESSION_AUDIT_LIMITS.eventBytes, maxNodes: 4096, maxDepth: 12 });
        if (!exact(row, ['format', 'sequence', 'roleSequence', 'previousSha256', 'previousRoleSha256', 'event', 'sha256'])
          || row.format !== URL_SESSION_AUDIT_FORMAT || !count(row.sequence, expected.durableRecords) || row.sequence === 0
          || row.roleSequence !== index + 1 || row.previousRoleSha256 !== previous || !hex(row.sha256)
          || canonical(row) !== line || !exact(row.event, ['kind', 'role', 'scope', 'payload'])
          || row.event.role !== role || !equal(row.event.scope, expected.declarations[role].scope)) fail();
        const { sha256: digest, ...body } = row;
        if (sha256(canonical(body)) !== digest) fail();
        if (index === 0 && !equal(row.event, { kind: 'declaration', role, ...expected.declarations[role] })) fail();
        if (index > 0 && row.event.kind === 'declaration') fail();
        previous = digest; rows.push({ sequence: row.sequence, sha256: digest, previousSha256: row.previousSha256, event: row.event });
      }
      if (previous !== expected.roles[role].tipSha256) fail();
      files.push({ file, name: fileName, stat: before });
    }
    rows.sort((a, b) => a.sequence - b.sequence);
    let previous: string | null = null;
    for (const [index, row] of rows.entries()) {
      if (row.sequence !== index + 1 || row.previousSha256 !== previous) fail(); previous = row.sha256;
    }
    if (previous !== expected.tipSha256) fail();
    const captured = verifyCapturedBoundary(rows, expected);
    await rootCurrent();
    for (const { file, name, stat } of files) if (!same(stat, await file.stat({ bigint: true })) || !same(stat, await lstat(name, { bigint: true }))) fail();
    check();
    return deepFreeze({ kind: 'verified-local-audit-history', authorization: 'none', replay: 'forbidden', completeness: 'Unknown',
      records: rows.length, bytes: expected.durableBytes, tipSha256: expected.tipSha256, ...captured });
  };
  try {
    return await Promise.race([work(), new Promise<null>(resolve => { timer = setTimeout(() => { active = false; resolve(null); }, URL_SESSION_AUDIT_LIMITS.milliseconds); })]);
  } catch { return null; }
  finally {
    active = false; clearTimeout(timer);
    // A stalled kernel read may finish later. Late acquisitions close themselves;
    // no late result can issue authority or alter any file.
    for (const file of handles) void file.close().catch(() => {});
  }
}

function verifyCapturedBoundary(rows: readonly Row[], expected: UrlSessionAuditHistoryExpected) {
  let capturedLaunchTerminals = 0, capturedCompleteExchanges = 0;
  for (const role of ROLES) {
    let launched = false, exchange: { id: unknown; stage: string; digest: string; usage: boolean; identity: string } | null = null;
    let tool: string | null = null, question: unknown = null;
    const requests = new Set<unknown>();
    for (const row of rows.filter(row => row.event.role === role)) {
      const { kind, payload: p } = row.event;
      if (!isRecord(p)) fail();
      switch (kind) {
        case 'declaration': break;
        case 'launch-attempt':
          if (launched || p.event !== 'session-launch-attempt' || p.profileSha256 !== expected.declarations[role].scope.profileSha256
            || !hex(p.commandSha256) || !hex(p.viewSha256)) fail(); launched = true; break;
        case 'launch-terminal':
          if (!launched || !['exited', 'stopped'].includes(String(p.outcome)) || p.viewTermination !== 'view-exited'
            || p.groupTermination !== 'confirmed' || p.toolTermination !== 'settled' || p.pendingInvocations !== 0) fail();
          launched = false; capturedLaunchTerminals++; break;
        case 'before-tool':
          if (tool !== null || typeof p.tool !== 'string' || !hex(p.inputSha256)) fail(); tool = `${p.tool}:${p.inputSha256}`; break;
        case 'tool-receipt':
          if (tool === null || tool !== `${String(p.toolName).replace('mcp__syzygy__', '')}:${p.inputSha256}`) fail(); tool = null; break;
        case 'usage':
          if (exchange === null || exchange.usage || exchange.stage !== 'send-outcome'
            || !exact(p, ['inputTokens', 'outputTokens', 'cacheCreationInputTokens', 'cacheReadInputTokens']) || Object.values(p).some(v => !count(v))) fail();
          exchange.usage = true; break;
        case 'relay': {
          if (!exact(p, ['event', 'subject', 'requestId', 'at', 'credentialIdentity', 'exposureMode', 'governingRule', 'admission', 'received',
            'route', 'consumedToolResults', 'response', 'outcome', 'status', 'previousExchangeSha256'])
            || !equal(p.subject, { binding: expected.declarations[role].scope.binding, project: expected.declarations[role].payload.project,
              pin: expected.declarations[role].payload.pin, principal: expected.declarations[role].payload.principal })) fail();
          const identity = canonical({ admission: p.admission, received: p.received, route: p.route, consumedToolResults: p.consumedToolResults });
          if (p.event === 'attempt-allowed') {
            if (exchange !== null || requests.has(p.requestId) || p.previousExchangeSha256 !== null || p.outcome !== 'allowed') fail();
            requests.add(p.requestId); exchange = { id: p.requestId, stage: 'attempt-allowed', digest: row.sha256, usage: false, identity };
          } else {
            if (exchange === null || p.requestId !== exchange.id || p.previousExchangeSha256 !== exchange.digest || identity !== exchange.identity) fail();
            if (p.event === 'send-attempt' && exchange.stage === 'attempt-allowed' && p.outcome === 'attempted') exchange.stage = 'send-attempt';
            else if (p.event === 'send-outcome' && exchange.stage === 'send-attempt' && p.outcome === 'local-request-flushed') exchange.stage = 'send-outcome';
            else if (p.event === 'response-admitted' && exchange.stage === 'send-outcome' && exchange.usage && p.outcome === 'response-admitted'
              && p.status === 200 && isRecord(p.response) && p.response.tool === null && p.response.stopReason === 'end_turn') {
              exchange = null; capturedCompleteExchanges++; break;
            } else fail();
            exchange.digest = row.sha256;
          }
          break;
        }
        case 'control':
          if (p.event === 'clarification-question' && question === null && hex(p.nonceSha256)) question = p.nonceSha256;
          else if (p.event === 'clarification-answer' && question !== null && p.nonceSha256 === question) question = null;
          else if (p.event !== 'control-published') fail(); break;
        // Ordered/product provenance needs independent sealed subjects and a
        // terminal pointer. This physical reader cannot recover either from a
        // self-consistent record, so these kinds remain explicitly unsupported.
        default: fail();
      }
    }
    if (launched || exchange !== null || tool !== null || question !== null) fail();
  }
  return { capturedLaunchTerminals, capturedCompleteExchanges };
}
