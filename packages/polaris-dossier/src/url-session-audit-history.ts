import { constants, type BigIntStats } from 'node:fs';
import { lstat, open, realpath, type FileHandle } from 'node:fs/promises';
import path from 'node:path';
import { encodeCanonicalJson, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { decodeUtf8, deepFreeze, isRecord, sha256 } from '@syzygy/support';
import { SESSION_TOOLS, type SessionContentClass } from './session-egress-policy.js';
import { isSessionTokenCount, SESSION_COUNT_RESPONSE_MAX_BYTES, SESSION_COUNT_TOKENS_PATH } from './session-relay.js';
import type { ViewRole } from './session-view.js';
import { isUrlMachinePeerHistoryMatch, isUrlMachinePeerHistorySnapshot, isUrlMachinePeerHistorySnapshotFor,
  verifyUrlMachinePeerHistoryRow, type UrlMachinePeerHistorySnapshot } from './url-machine-peer-history.js';
import type { UrlMachinePeerAudit } from './url-machine-peer.js';
import { isVerifiedRetainedUrlLaunchHistory, URL_HELPER_LAUNCH_FILES, verifyRetainedUrlLaunchHistory,
  type UrlLaunchHistoryRole, type UrlRetainedLaunchHistoryExpected, type UrlRetainedLaunchHistoryOptions } from './url-launch-history.js';
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
type RetainedLaunchSubject = Omit<UrlRetainedLaunchHistoryOptions, 'role' | 'pin' | 'expected' | 'current'>;
type RetainedLaunchSubjects = Readonly<Partial<Record<UrlLaunchHistoryRole, RetainedLaunchSubject>>>;
export interface UrlSessionAuditHistoryOptions {
  readonly parent: string; readonly name: string; readonly expected: UrlSessionAuditHistoryExpected;
  readonly current: () => boolean;
  /** Independently pinned input, role and executable identities for any retained helper launch row. */
  readonly retainedLaunches?: RetainedLaunchSubjects;
  /** Genuine snapshots made against independently retained store identity and client heads. */
  readonly machineHistory?: { readonly identitySha256: string; readonly snapshots: readonly UrlMachinePeerHistorySnapshot[] };
}
export interface VerifiedUrlSessionAuditHistory {
  readonly kind: 'verified-local-audit-history'; readonly authorization: 'none'; readonly replay: 'forbidden';
  readonly completeness: 'Unknown'; readonly records: number; readonly bytes: number; readonly tipSha256: string;
  readonly capturedLaunchTerminals: number; readonly capturedCompleteExchanges: number;
  readonly capturedCountExchanges: number; readonly capturedHelperLaunches: number; readonly capturedMachineEffects: number;
  readonly capturedReportedTokens: number | 'Unknown';
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
    const { parent, name, machineHistory } = given;
    const machineSnapshots = new Map<string, UrlMachinePeerHistorySnapshot>();
    if (machineHistory !== undefined) {
      const { identitySha256, snapshots } = machineHistory;
      if (!hex(identitySha256) || !Array.isArray(snapshots) || snapshots.length > ROLES.length * 2) fail();
      for (const snapshot of snapshots) {
        if (!isUrlMachinePeerHistorySnapshot(snapshot) || snapshot.storeIdentitySha256 !== identitySha256
          || machineSnapshots.has(snapshot.clientId)) fail();
        machineSnapshots.set(snapshot.clientId, snapshot);
      }
    }
    const retainedLaunches = { ...given.retainedLaunches };
    for (const role of Object.keys(retainedLaunches)) {
      if (!Object.hasOwn(URL_HELPER_LAUNCH_FILES, role)) fail();
      const subject = retainedLaunches[role as UrlLaunchHistoryRole];
      if (subject === undefined) fail();
      const roleDeclaration = deepFreeze(parseBoundedJson(canonical(subject.roleDeclaration),
        { maxBytes: 65_536, maxNodes: 4096, maxDepth: 12 })) as unknown as RetainedLaunchSubject['roleDeclaration'];
      retainedLaunches[role as UrlLaunchHistoryRole] = { ...subject, screen: { ...subject.screen }, roleDeclaration };
    }
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
    const captured = await verifyCapturedBoundary(rows, expected, retainedLaunches, machineSnapshots, check);
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

async function verifyCapturedBoundary(rows: readonly Row[], expected: UrlSessionAuditHistoryExpected,
  retainedLaunches: RetainedLaunchSubjects, machineSnapshots: ReadonlyMap<string, UrlMachinePeerHistorySnapshot>, check: () => void) {
  let capturedLaunchTerminals = 0, capturedCompleteExchanges = 0, capturedCountExchanges = 0;
  let capturedHelperLaunches = 0, capturedMachineEffects = 0, capturedReportedTokens = 0;
  for (const role of ROLES) {
    let attempt: { commandSha256: string; viewSha256: string } | null = null;
    let launchHistoryMatched = false;
    let exchange: { id: string; stage: string; digest: string; usage: number | null; identity: string; count: boolean } | null = null;
    let tool: { id: string; name: string; inputSha256: string; executing: boolean; counted: boolean;
      receipt?: { receiptId: string; toolUseId: string; digest: string; bytes: number } } | null = null;
    let question: unknown = null;
    const requests = new Set<unknown>();
    for (const row of rows.filter(row => row.event.role === role)) {
      check();
      const { kind, payload: p } = row.event;
      if (!isRecord(p)) fail();
      switch (kind) {
        case 'declaration': break;
        case 'launch-attempt':
          if (attempt !== null || p.event !== 'session-launch-attempt' || p.profileSha256 !== expected.declarations[role].scope.profileSha256
            || !hex(p.commandSha256) || !hex(p.viewSha256)) fail();
          attempt = { commandSha256: p.commandSha256, viewSha256: p.viewSha256 }; break;
        case 'launch-history': {
          if (role === 'author' || attempt === null || launchHistoryMatched) fail();
          const subject = retainedLaunches[role], file = URL_HELPER_LAUNCH_FILES[role];
          const { scope, payload } = expected.declarations[role];
          if (!subject || subject.runId !== scope.binding.run || subject.roleDeclaration.role !== role
            || subject.roleDeclaration.compiledProfileSha256 !== scope.profileSha256
            || subject.roleDeclaration.commandSha256 !== attempt.commandSha256 || subject.roleDeclaration.viewSha256 !== attempt.viewSha256
            || !exact(p, ['file', 'recordSha256', 'recordBytes', 'promptRecordSha256', 'promptSha256', 'sessionId'])
            || p.file !== file || !hex(p.recordSha256) || !count(p.recordBytes, 2_097_152) || p.recordBytes === 0
            || !hex(p.promptRecordSha256) || !hex(p.promptSha256) || typeof p.sessionId !== 'string') fail();
          const history: UrlRetainedLaunchHistoryExpected = { file, recordSha256: p.recordSha256, recordBytes: p.recordBytes,
            promptRecordSha256: p.promptRecordSha256, promptSha256: p.promptSha256, sessionId: p.sessionId };
          check();
          const result = await verifyRetainedUrlLaunchHistory({ ...subject, role, pin: payload.pin, expected: history, current: () => { check(); return true; } });
          check();
          if (!isVerifiedRetainedUrlLaunchHistory(result) || result.role !== role || result.runId !== scope.binding.run
            || result.sourceBindingSha256 !== scope.binding.sourceBinding || result.policySha256 !== scope.binding.policy || result.pin !== payload.pin
            || result.sessionId !== p.sessionId || result.recordSha256 !== p.recordSha256
            || result.promptRecordSha256 !== p.promptRecordSha256 || result.promptSha256 !== p.promptSha256) fail();
          launchHistoryMatched = true; capturedHelperLaunches++; break;
        }
        case 'launch-terminal':
          if (attempt === null || !['exited', 'stopped'].includes(String(p.outcome)) || p.viewTermination !== 'view-exited'
            || p.groupTermination !== 'confirmed' || p.toolTermination !== 'settled' || p.pendingInvocations !== 0) fail();
          attempt = null; capturedLaunchTerminals++; break;
        case 'machine-peer': {
          if (attempt === null || !hex(p.clientId)) fail();
          const snapshot = machineSnapshots.get(p.clientId);
          const { scope, payload } = expected.declarations[role];
          if (!isUrlMachinePeerHistorySnapshotFor(snapshot, { projectId: payload.project, policySha256: scope.originPolicySha256,
            profileSha256: scope.profileSha256, sourcePin: payload.pin, runId: scope.binding.run, role })) fail();
          const matched = verifyUrlMachinePeerHistoryRow(snapshot, p as unknown as UrlMachinePeerAudit);
          if (!isUrlMachinePeerHistoryMatch(matched, p)) fail();
          capturedMachineEffects++; break;
        }
        case 'before-tool':
          if (attempt === null || exchange !== null || tool === null || tool.executing || tool.receipt !== undefined
            || !exact(p, ['tool', 'inputSha256']) || `mcp__syzygy__${String(p.tool)}` !== tool.name || p.inputSha256 !== tool.inputSha256) fail();
          tool.executing = true; break;
        case 'tool-receipt':
          if (tool === null || !tool.executing || tool.receipt !== undefined
            || !exact(p, ['id', 'toolName', 'inputSha256', 'digest', 'bytes', 'classes', 'originIds'])
            || typeof p.id !== 'string' || !/^tool-[a-f0-9]{64}$/u.test(p.id) || p.toolName !== tool.name || p.inputSha256 !== tool.inputSha256
            || !hex(p.digest) || !count(p.bytes, 2_097_152) || p.bytes === 0) fail();
          tool.executing = false;
          tool.receipt = { receiptId: p.id, toolUseId: tool.id, digest: p.digest, bytes: p.bytes }; break;
        case 'usage': {
          if (exchange === null || exchange.count || exchange.usage !== null || exchange.stage !== 'send-outcome'
            || !exact(p, ['inputTokens', 'outputTokens', 'cacheCreationInputTokens', 'cacheReadInputTokens'])) fail();
          const values = Object.values(p);
          if (!values.every(value => count(value))) fail();
          const total = values.reduce((sum, value) => sum + value, 0);
          if (!count(total)) fail();
          exchange.usage = total; break;
        }
        case 'relay': {
          if (!exact(p, ['event', 'subject', 'requestId', 'at', 'credentialIdentity', 'exposureMode', 'governingRule', 'admission', 'received',
            'route', 'consumedToolResults', 'response', 'outcome', 'status', 'previousExchangeSha256'])
            || !equal(p.subject, { binding: expected.declarations[role].scope.binding, project: expected.declarations[role].payload.project,
              pin: expected.declarations[role].payload.pin, principal: expected.declarations[role].payload.principal })
            || attempt === null || typeof p.requestId !== 'string' || (p.route !== 'messages' && p.route !== SESSION_COUNT_TOKENS_PATH)
            || !Array.isArray(p.consumedToolResults)) fail();
          const identity = canonical({ admission: p.admission, received: p.received, route: p.route, consumedToolResults: p.consumedToolResults });
          if (p.event === 'attempt-allowed') {
            if (exchange !== null || requests.has(p.requestId) || p.previousExchangeSha256 !== null || p.outcome !== 'allowed') fail();
            const tokenCount = p.route === SESSION_COUNT_TOKENS_PATH;
            if (tokenCount) {
              if (role === 'design' || tool?.receipt === undefined || tool.counted || p.consumedToolResults.length !== 0
                || !isRecord(p.admission) || !exact(p.received, ['digest', 'bytes']) || p.received.digest !== p.admission.digest
                || p.received.bytes !== p.admission.bytes || !Array.isArray(p.admission.originIds)
                || !p.admission.originIds.includes(tool.receipt.receiptId)) fail();
              tool.counted = true;
            } else {
              if (tool !== null && tool.receipt === undefined
                || !equal(p.consumedToolResults, tool?.receipt === undefined ? [] : [tool.receipt])) fail();
              tool = null;
            }
            requests.add(p.requestId); exchange = { id: p.requestId, stage: 'attempt-allowed', digest: row.sha256, usage: null, identity, count: tokenCount };
          } else {
            if (exchange === null || p.requestId !== exchange.id || p.previousExchangeSha256 !== exchange.digest || identity !== exchange.identity) fail();
            if (p.event === 'send-attempt' && exchange.stage === 'attempt-allowed' && p.outcome === 'attempted') exchange.stage = 'send-attempt';
            else if (p.event === 'send-outcome' && exchange.stage === 'send-attempt' && p.outcome === 'local-request-flushed') exchange.stage = 'send-outcome';
            else if (p.event === 'response-admitted' && exchange.stage === 'send-outcome' && p.outcome === 'response-admitted' && p.status === 200) {
              const response = p.response;
              if (exchange.count) {
                if (!exact(response, ['digest', 'bytes', 'content', 'estimatedInputTokens']) || response.content !== 'count-tokens-json'
                  || !hex(response.digest) || !count(response.bytes, SESSION_COUNT_RESPONSE_MAX_BYTES) || response.bytes === 0
                  || !isSessionTokenCount(response.estimatedInputTokens)) fail();
                capturedCountExchanges++;
              } else {
                if (exchange.usage === null || !exact(response, ['digest', 'bytes', 'content', 'stopReason', 'textBlocks', 'tool'])
                  || !hex(response.digest) || !count(response.bytes, 8_388_608) || response.bytes === 0
                  || !['messages-json', 'messages-event-stream'].includes(String(response.content))) fail();
                if (response.stopReason === 'tool_use') {
                  const call = response.tool;
                  if (!exact(call, ['id', 'name', 'inputSha256']) || typeof call.id !== 'string' || !/^toolu_[A-Za-z0-9_-]{1,250}$/u.test(call.id)
                    || typeof call.name !== 'string' || !SESSION_TOOLS.some(name => name === call.name) || !hex(call.inputSha256)) fail();
                  tool = { id: call.id, name: call.name, inputSha256: call.inputSha256, executing: false, counted: false };
                } else if (response.stopReason !== 'end_turn' || response.tool !== null) fail();
                capturedReportedTokens += exchange.usage;
                if (!count(capturedReportedTokens)) fail();
                capturedCompleteExchanges++;
              }
              exchange = null; break;
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
    if (attempt !== null || exchange !== null || tool !== null || question !== null
      || (role !== 'author' && retainedLaunches[role] !== undefined && !launchHistoryMatched)) fail();
  }
  return { capturedLaunchTerminals, capturedCompleteExchanges, capturedCountExchanges, capturedHelperLaunches, capturedMachineEffects,
    capturedReportedTokens: capturedCompleteExchanges === 0 ? 'Unknown' as const : capturedReportedTokens };
}
