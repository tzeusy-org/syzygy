import * as fs from 'node:fs';
import * as path from 'node:path';
import { encodeCanonicalJson, type LocalDisclosureItem } from '@syzygy/polaris-generation-core/live';
import { sha256 } from '@syzygy/support';
import { readRunRecord, type RecordedRunConfig } from './run-record.js';
import type { RunConfigRefusal } from './run-config.js';
import { RUN_ID, RUN_LAYOUT } from './state-directory.js';
import { readEffectiveRunDeclaration, URL_DECLARATION_LIMITS, type EffectiveRunDeclaration,
  type UrlRunDeclaration, type UrlRunDeclarationContext } from './url-run-record.js';

export const URL_RUN_SIDECAR = 'url-declaration.json';
export const URL_MODE_MARKERS = Object.freeze(['launched.json', 'url-acquisition.json', 'url-supervisor.json', 'url-attempt.json'] as const);
export type ProtectedUrlRunContext = UrlRunDeclarationContext & Required<Pick<UrlRunDeclarationContext,
  'expectedBasePolicy' | 'expectedOriginPolicy' | 'expectedSourceTransport' | 'expectedProfileSha256'>>;
/** A stable authority identity that opens a screen for one full record read. */
export type CreateMetadataScreen = () => ((text: string) => boolean) | null;
export type EffectiveRunAuthority = (canonicalRun: string, runId: string) =>
  | { readonly kind: 'operator' }
  | { readonly kind: 'url'; readonly context: ProtectedUrlRunContext; readonly createMetadataScreen: CreateMetadataScreen }
  | { readonly kind: 'refused' };
export type EffectiveRunReadFailureCode = 'run-unreadable' | 'record-unreadable' | 'invalid-record' | 'mode-binding' | 'metadata-screen';
export type EffectiveRunReadResult =
  | { readonly ok: true; readonly run: string; readonly runId: string; readonly core: RecordedRunConfig;
    readonly effective: EffectiveRunDeclaration; readonly sidecarSha256: string | null }
  | { readonly ok: false; readonly code: EffectiveRunReadFailureCode; readonly reason: string;
    readonly legacy?: true; readonly refusals?: readonly RunConfigRefusal[] };
type VerifiedUrlRecord = {
  readonly core: RecordedRunConfig;
  readonly effective: Extract<EffectiveRunDeclaration, { kind: 'url' }>;
  readonly context: string;
  readonly createMetadataScreen: CreateMetadataScreen;
  readonly baseSha256: string;
  readonly sidecarSha256: string;
};

/** Small common projection for status, brief, pages and close. It preserves declared identity
 * and Unknown capture scope without copying prompts, transcripts or origin bodies. */
export function effectiveUrlProjection(core: Pick<RecordedRunConfig, 'subject'>, declaration: UrlRunDeclaration) {
  return {
    mode: declaration.mode, label: declaration.label, runId: declaration.runId,
    source: { pin: declaration.pinnedCommit, selectionLabel: core.subject.pinnedRevision.label,
      selectionCapturedAt: core.subject.pinnedRevision.pinnedAt, history: 'Inferred' as const },
    inference: declaration.inference,
    sourceTransport: { providerId: declaration.sourceTransport.providerId, destination: declaration.sourceTransport.destination,
      acquisitionId: declaration.sourceTransport.acquisitionId, metadataClasses: declaration.sourceTransport.metadataClasses,
      selectionOrigin: declaration.sourceTransport.selectionOrigin, label: 'Inferred' as const },
    plannedClasses: declaration.plannedClasses, plannedOriginDeclarations: declaration.plannedOrigins.length,
    policies: { base: declaration.basePolicy, origin: declaration.originPolicy },
    roles: declaration.roles, storage: declaration.storage, capture: declaration.capture,
    protectedAuditCapture: 'Unknown' as const, workItem: declaration.workItem, execution: declaration.execution,
  };
}
export function effectiveUrlDisclosures(core: Pick<RecordedRunConfig, 'subject'>, declaration: UrlRunDeclaration): readonly LocalDisclosureItem[] {
  const projected = effectiveUrlProjection(core, declaration), destination = projected.sourceTransport.destination;
  return [
    { id: 'mode', text: `Authoring mode: ${projected.mode}. The local CLI is the inference client; its supported requests use Syzygy's checked transport relay. This is stored configuration, not evidence of a completed send.`, label: 'Inferred' },
    { id: 'agent', text: `Agent tool ${projected.inference.tool} ${projected.inference.toolVersion}, inference provider ${projected.inference.provider}, configured model ${projected.inference.model}; model selection origin ${projected.inference.modelSelection}. Supported registry profile ${projected.inference.profile.id}, digest ${projected.inference.profile.sha256}. Served model/version is Unknown.`, label: 'Inferred' },
    { id: 'declared-content-classes', text: `Planned content classes: ${projected.plannedClasses.join(', ')}; justified by ${projected.plannedOriginDeclarations} typed origin declaration(s). This finite declaration is not an account of actual egress or an admission grant.`, label: 'Inferred' },
    { id: 'source-transport-provider', text: `Distinct Git source-transport provider ${projected.sourceTransport.providerId}; destination scheme ${destination.scheme}, host ${destination.host}, port ${destination.port}, repository ${JSON.stringify(destination.repository)}; acquisition ${projected.sourceTransport.acquisitionId}. Only code-structure metadata is declared for this source route; no source-body upload. Source selection history is Inferred.`, label: 'Inferred' },
    { id: 'source-screening-boundary', text: 'Source metadata and CLI inference requests require their distinct declared destination, current policies, provenance, unchanged detectors and protected pre-send audit. The Anthropic declaration does not authorize the Git route. Native serialization and uncaptured sends remain Unknown.', label: 'Inferred' },
    { id: 'execution-rule', text: 'The URL role instructions prohibit building, testing or running observed-project code. The private role view is a read and transport boundary; it grants no observed-code execution permission.', label: 'Inferred' },
    { id: 'records-within-reach', text: `Compatible history is writable history (${projected.storage.compatibleHistory.locator}); protected receipts/audit have a separate host identity ${projected.storage.protectedAudit.locator}, declared outside role write reach. Stored history remains Inferred. Actual protected audit captures are Unknown here.`, label: 'Inferred' },
    { id: 'unattributed-execution', text: `This run has no scheduler work item: ${projected.workItem.reason}.`, label: 'Inferred' },
    { id: 'url-capture-scope', text: 'Actual source-operation outcomes, sends, provider receipts, served model/version, provider usage and capture completeness are Unknown in this declaration. No missing count is zero, and no stored declaration is a live receipt.', label: 'Unknown' },
  ];
}

const BASE_BYTES = 65_536;
const refusal = (code: EffectiveRunReadFailureCode): Extract<EffectiveRunReadResult, { ok: false }> => ({ ok: false, code, reason: {
  'run-unreadable': 'The run directory is not a canonical readable directory; preserve it and check its location.',
  'record-unreadable': 'Run metadata is missing, changed, excessive or not a regular non-symlink UTF-8 file; preserve it and check the recorded files.',
  'invalid-record': 'The effective run declaration is invalid; preserve it and check its recorded bindings.',
  'mode-binding': 'The run mode cannot be matched to its protected URL binding; preserve the run and restore its checked host declaration or restart it.',
  'metadata-screen': 'The effective run metadata failed screening; preserve the run and inspect its safe host diagnostics.',
}[code] });
const stable = (left: fs.Stats, right: fs.Stats): boolean => left.dev === right.dev && left.ino === right.ino
  && left.size === right.size && left.mtimeMs === right.mtimeMs && left.ctimeMs === right.ctimeMs;
interface ReadFile { readonly bytes: Buffer; readonly stat: fs.Stats }
function entry(anchor: string, name: string): fs.Stats | null {
  try { return fs.lstatSync(path.join(anchor, name)); }
  catch (cause) { if ((cause as NodeJS.ErrnoException).code === 'ENOENT') return null; throw cause; }
}
function regularFile(anchor: string, name: string, maxBytes: number, optional: boolean): ReadFile | null {
  let fd: number;
  try { fd = fs.openSync(path.join(anchor, name), fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK); }
  catch (cause) { if (optional && (cause as NodeJS.ErrnoException).code === 'ENOENT') return null; throw cause; }
  try {
    const before = fs.fstatSync(fd);
    if (!before.isFile() || before.nlink !== 1 || before.size > maxBytes) throw new Error('metadata');
    const bytes = Buffer.alloc(before.size + 1);
    let length = 0;
    while (length < bytes.length) {
      const count = fs.readSync(fd, bytes, length, bytes.length - length, null);
      if (count === 0) break;
      length += count;
    }
    const after = fs.fstatSync(fd), current = entry(anchor, name);
    if (length > maxBytes || length !== after.size || !stable(before, after) || current === null
      || !current.isFile() || !stable(after, current)) throw new Error('metadata');
    return { bytes: bytes.subarray(0, length), stat: after };
  } finally { fs.closeSync(fd); }
}
function stillCurrent(anchor: string, name: string, read: ReadFile | null): boolean {
  const current = entry(anchor, name);
  return read === null ? current === null : current !== null && current.isFile() && stable(read.stat, current);
}
/** Convenience-log withdrawal guard only. A true result permits appending compatible history;
 * it grants no run mode, source admission, provider authority or projection. */
export function mayAppendCompatibleStepLog(runDir: string): boolean {
  const run = path.resolve(runDir);
  let directory: number;
  try {
    if (fs.realpathSync(run) !== run) return false;
    directory = fs.openSync(run, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
  } catch { return false; }
  try {
    const initial = fs.fstatSync(directory), anchor = `/proc/self/fd/${directory}`;
    const base = regularFile(anchor, RUN_LAYOUT.config, BASE_BYTES, false);
    if (base === null || !readRunRecord(new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(base.bytes)).ok) return false;
    return stillCurrent(anchor, RUN_LAYOUT.config, base) && stable(initial, fs.lstatSync(run)) && fs.realpathSync(run) === run;
  } catch { return false; }
  finally { fs.closeSync(directory); }
}
function screenAll(core: RecordedRunConfig, declaration: UrlRunDeclaration, screen: (text: string) => boolean): boolean {
  const projection = effectiveUrlProjection(core, declaration), disclosures = effectiveUrlDisclosures(core, declaration);
  const strings: string[] = [], pending: unknown[] = [core, declaration, projection, disclosures];
  while (pending.length) {
    const value = pending.pop();
    if (typeof value === 'string') strings.push(value);
    else if (Array.isArray(value)) for (const item of value) pending.push(item);
    else if (value !== null && typeof value === 'object') for (const [key, item] of Object.entries(value)) { strings.push(key); pending.push(item); }
  }
  // JSON escaping must not hide a decoded textual field or a cross-field composition.
  return [encodeCanonicalJson(core, URL_DECLARATION_LIMITS), encodeCanonicalJson(declaration, URL_DECLARATION_LIMITS),
    encodeCanonicalJson(projection, URL_DECLARATION_LIMITS), encodeCanonicalJson(disclosures, URL_DECLARATION_LIMITS),
    ...strings, strings.join(''), strings.join('\n'), strings.join(' ')].every(text => screen(text) === true);
}

/** Linux host IO boundary. Fixed child names are opened relative to an owned descriptor,
 * without following the final entry or waiting on a FIFO. Current inode/size/times and the
 * canonical directory are checked again before release; this is not an atomic filesystem
 * transaction or same-user tamperproof recovery evidence. The host serializes its writers.
 *
 * Production MUST supply the complete protected mode resolver across invocations. The absent
 * resolver path exists for legacy operator APIs only, and refuses every known URL marker.
 * Removing both writable markers and a protected registry cannot be detected by writable
 * history alone: the protected host resolver, not a first sidecar payload, owns that boundary. */
export function readEffectiveRunRecord(runDir: string, authority?: EffectiveRunAuthority): EffectiveRunReadResult {
  return readRunRecordFiles(runDir, authority);
}

/** A live supervisor already screened these exact bytes with its pinned
 * policy. Recheck the protected authority and exact files at every sample.
 * The caller must also recheck the bound screening policies. */
export function bindCurrentEffectiveUrlRun(runDir: string, authority: EffectiveRunAuthority,
  expected: { readonly baseSha256: string; readonly sidecarSha256: string },
): (() => boolean) | null {
  const captured: { host?: Extract<ReturnType<EffectiveRunAuthority>, { kind: 'url' }> } = {};
  const first = readEffectiveRunRecord(runDir, (run, id) => {
    const host = authority(run, id);
    if (host.kind === 'url') captured.host = host;
    return host;
  });
  if (!first.ok || first.effective.kind !== 'url' || captured.host === undefined
    || first.effective.declaration.baseRunSha256 !== expected.baseSha256 || first.sidecarSha256 !== expected.sidecarSha256) return null;
  try {
    const checked: VerifiedUrlRecord = {
      core: first.core, effective: first.effective, context: encodeCanonicalJson(captured.host.context, URL_DECLARATION_LIMITS),
      createMetadataScreen: captured.host.createMetadataScreen,
      baseSha256: expected.baseSha256, sidecarSha256: expected.sidecarSha256,
    };
    return () => readRunRecordFiles(first.run, authority, checked).ok;
  } catch { return null; }
}

function matchesVerifiedAuthority(host: ReturnType<EffectiveRunAuthority> | undefined, record: VerifiedUrlRecord): boolean {
  return host?.kind === 'url' && host.createMetadataScreen === record.createMetadataScreen
    && encodeCanonicalJson(host.context, URL_DECLARATION_LIMITS) === record.context;
}

function readRunRecordFiles(runDir: string, authority: EffectiveRunAuthority | undefined, checked?: VerifiedUrlRecord): EffectiveRunReadResult {
  const run = path.resolve(runDir), runId = path.basename(run);
  let directory: number;
  try {
    if (fs.realpathSync(run) !== run) return refusal('run-unreadable');
    directory = fs.openSync(run, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
  } catch { return refusal('run-unreadable'); }
  try {
    const initial = fs.fstatSync(directory);
    if (!initial.isDirectory()) return refusal('run-unreadable');
    const anchor = `/proc/self/fd/${directory}`;
    let host: ReturnType<EffectiveRunAuthority> | undefined;
    try { host = authority?.(run, runId); } catch { return refusal('mode-binding'); }
    if (authority !== undefined && host == null) return refusal('mode-binding');
    if (host?.kind === 'refused' || (host !== undefined && host.kind !== 'operator' && host.kind !== 'url')) return refusal('mode-binding');
    const base = regularFile(anchor, RUN_LAYOUT.config, BASE_BYTES, false);
    const sidecar = regularFile(anchor, URL_RUN_SIDECAR, URL_DECLARATION_LIMITS.maxBytes, true);
    if (base === null) return refusal('record-unreadable');
    const marker = URL_MODE_MARKERS.some(name => entry(anchor, name) !== null);
    if (host?.kind !== 'url' && (sidecar !== null || marker)) return refusal('mode-binding');
    if (host?.kind === 'url' && (!RUN_ID.test(runId) || sidecar === null || typeof host.createMetadataScreen !== 'function'
      || host.context?.runId !== runId || !host.context.expectedBasePolicy || !host.context.expectedOriginPolicy
      || !host.context.expectedSourceTransport || !host.context.expectedProfileSha256)) return refusal('mode-binding');
    let core: RecordedRunConfig, effective: EffectiveRunDeclaration;
    if (checked !== undefined) {
      if (!matchesVerifiedAuthority(host, checked) || base.stat.uid !== process.getuid?.()
        || sha256(base.bytes) !== checked.baseSha256 || sha256(sidecar!.bytes) !== checked.sidecarSha256
        || !matchesVerifiedAuthority(authority?.(run, runId), checked)) return refusal('mode-binding');
      core = checked.core;
      effective = checked.effective;
    } else if (host?.kind === 'url') {
      const baseText = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(base.bytes);
      const read = readEffectiveRunDeclaration(baseText, sidecar!.bytes, host.context);
      if (!read.ok || read.effective.kind !== 'url') return refusal('invalid-record');
      core = read.core; effective = read.effective;
      try {
        const screen = host.createMetadataScreen();
        if (screen === null || !screenAll(core, read.effective.declaration, screen)) return refusal('metadata-screen');
      } catch { return refusal('metadata-screen'); }
    } else {
      const baseText = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(base.bytes);
      const read = readRunRecord(baseText);
      if (!read.ok) return { ok: false, code: 'invalid-record', reason: read.detail,
        ...(read.legacy ? { legacy: true as const } : {}), ...(read.refusals ? { refusals: read.refusals } : {}) };
      core = read.record; effective = { kind: 'operator', declaration: core };
    }
    if (!stillCurrent(anchor, RUN_LAYOUT.config, base) || !stillCurrent(anchor, URL_RUN_SIDECAR, sidecar)
      || !stable(initial, fs.fstatSync(directory)) || !stable(initial, fs.lstatSync(run)) || fs.realpathSync(run) !== run) return refusal('record-unreadable');
    return { ok: true, run, runId, core, effective, sidecarSha256: sidecar === null ? null : sha256(sidecar.bytes) };
  } catch { return refusal('record-unreadable'); }
  finally { fs.closeSync(directory); }
}
