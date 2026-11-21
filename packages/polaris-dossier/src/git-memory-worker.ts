import { spawn, execFile } from 'node:child_process';
import { constants } from 'node:fs';
import { lstat, open, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomBytes } from 'node:crypto';
import { encodeCanonicalJson, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { isRecord, sha256 } from '@syzygy/support';
import { decodeGitMemoryPack, GIT_MEMORY_PACK_LIMITS, type GitMemoryFormat } from './git-memory-pack.js';
import { admitGitMemoryClosure, gitMemoryAdmissionExclusions, type GitAdmissionReceipt, type GitAcquisitionExclusion } from './git-memory-admission.js';
import { persistAdmittedGitObjects, type GitMemoryStoreResult } from './git-memory-store.js';
import { buildDossierScreen } from './screen.js';
import { SESSION_CONTENT_CLASSES } from './session-egress-policy.js';

/** esbuild ESM compatibility for the two statically observed YAML builtin requires.
 * No filesystem/package lookup or general createRequire is available. */
export const GIT_MEMORY_WORKER_BUNDLE_BANNER = "import process from 'node:process'; import * as buffer from 'node:buffer'; const require = id => { if (id === 'process') return process; if (id === 'buffer') return buffer; throw new Error('unsupported-worker-module'); };";

export const GIT_MEMORY_WORKER_PROFILE = 'node24.6.0-linux-memory-pack/1' as const;
const NODE_VERSION = 'v24.6.0';

export interface GitMemoryWorkerLimits {
  readonly wallMilliseconds: number; readonly cpuSeconds: number;
  /** V8 old-space ceiling; young space and native allocations also face RLIMIT_AS. */
  readonly heapMiB: number;
  readonly addressSpaceBytes: number; readonly fileBytes: number; readonly directoryBytes: number;
  readonly directoryEntries: number; readonly sampleMilliseconds: number; readonly outputBytes: number;
}
export const GIT_MEMORY_WORKER_LIMITS: GitMemoryWorkerLimits = Object.freeze({
  wallMilliseconds: 30_000, cpuSeconds: 10, heapMiB: 128, addressSpaceBytes: 2_147_483_648,
  fileBytes: 2_162_688, directoryBytes: 67_108_864, directoryEntries: 32_768, sampleMilliseconds: 250, outputBytes: 4_194_304,
});
export interface GitMemoryWorkerBinding {
  readonly run: string; readonly acquisition: string; readonly sourceBinding: string;
  readonly policySha256: string; readonly originPolicySha256: string;
}
export interface GitMemoryWorkerProgram {
  /** Independently prepared trusted standalone ESM bundle. Never a source/role-supplied program. */
  readonly bundle: string; readonly bundleSha256: string;
  readonly node: string; readonly nodeSha256: string;
}
export interface GitMemoryWorkerAudit {
  readonly stage: 'whole-closure-admitted' | 'acquisition-excluded' | 'worker-refused';
  readonly outcome?: 'worker-refused' | 'worker-limit' | 'worker-binding-stale' | 'worker-audit-failed' | 'worker-unavailable' | 'worker-termination-unknown' | 'invalid-worker-input';
  readonly binding: GitMemoryWorkerBinding; readonly contextSha256: string;
  readonly profile: typeof GIT_MEMORY_WORKER_PROFILE; readonly program: { readonly nodeSha256: string; readonly bundleSha256: string };
  readonly limits: GitMemoryWorkerLimits;
  readonly receipt: GitAdmissionReceipt | null; readonly exclusions: readonly GitAcquisitionExclusion[];
}
export interface GitMemoryWorkerRequest {
  readonly program: GitMemoryWorkerProgram;
  readonly binding: GitMemoryWorkerBinding;
  readonly pack: Uint8Array; readonly objectFormat: GitMemoryFormat; readonly selectedCommit: string;
  /** Actual validated depth-one boundary captured by the wire transport. */
  readonly shallow: readonly string[];
  readonly policyBytes: Uint8Array; readonly visibility: 'private' | 'public';
  /** Independently bound repository identity for committed owner-placement rules. */
  readonly repository?: string;
  /** Fresh, canonical, empty, owner-private scratch directory; outside governed/role reach. */
  readonly parent: string;
  readonly limits?: Partial<GitMemoryWorkerLimits>;
  readonly current: (binding: GitMemoryWorkerBinding, receipt: GitAdmissionReceipt | null) => boolean | Promise<boolean>;
  /** Protected durable safe evidence. Exclusion provenance must never be projected into public failures. */
  readonly audit: (event: GitMemoryWorkerAudit) => void | Promise<void>;
  readonly signal?: AbortSignal;
}
export interface GitMemoryWorkerSummary {
  readonly limits: GitMemoryWorkerLimits; readonly stage: 'not-started' | 'processing' | 'admitted' | 'persisting' | 'finished';
  readonly termination: 'not-started' | 'confirmed' | 'Unknown';
  readonly exitCode: number | null; readonly signal: NodeJS.Signals | null;
  readonly stdoutBytes: number; readonly stderrBytes: number;
  readonly samples: number; readonly lastCensus: 'complete' | 'Unknown'; readonly peakBytes: number | null; readonly peakEntries: number | null;
  readonly aggregateEnforcement: 'sampled-stop-only'; readonly betweenSamples: 'Unknown';
  readonly processProfile: 'single-node-no-child-or-worker-permission';
  readonly storage: 'not-started' | 'admitted-possible';
}
export type GitMemoryWorkerResult = { readonly ok: true; readonly store: Extract<GitMemoryStoreResult, { ok: true }>; readonly summary: GitMemoryWorkerSummary }
  | { readonly ok: false; readonly code: 'invalid-worker-input' | 'worker-unavailable' | 'worker-refused' | 'worker-limit' | 'worker-binding-stale' | 'worker-audit-failed' | 'worker-termination-unknown'; readonly summary: GitMemoryWorkerSummary };
const JSON_BOUNDS = { maxBytes: 4_194_304, maxNodes: 65_536, maxDepth: 32 };
const canonical = (v: unknown): string => encodeCanonicalJson(v, JSON_BOUNDS);
const digest = (v: unknown): string => sha256(canonical(v));
const hex = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/u.test(v);
const keys = (v: unknown, names: readonly string[]): v is Record<string, unknown> => isRecord(v)
  && Object.keys(v).length === names.length && names.every(k => Object.hasOwn(v, k));
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));
async function within<T>(operation: Promise<T>, milliseconds: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([operation, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error()), Math.max(1, milliseconds)); })]); }
  finally { clearTimeout(timer); }
}
function bounds(lower: Partial<GitMemoryWorkerLimits> = {}): GitMemoryWorkerLimits {
  if (!isRecord(lower) || Object.entries(lower).some(([k, v]) => !Object.hasOwn(GIT_MEMORY_WORKER_LIMITS, k)
    || !Number.isSafeInteger(v) || Number(v) < 1 || Number(v) > GIT_MEMORY_WORKER_LIMITS[k as keyof GitMemoryWorkerLimits])) throw new Error('invalid-worker-input');
  return Object.freeze({ ...GIT_MEMORY_WORKER_LIMITS, ...lower });
}
function bindingValid(v: unknown): v is GitMemoryWorkerBinding {
  return keys(v, ['run', 'acquisition', 'sourceBinding', 'policySha256', 'originPolicySha256'])
    && ['run', 'acquisition'].every(k => typeof v[k] === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(v[k] as string))
    && ['sourceBinding', 'policySha256', 'originPolicySha256'].every(k => hex(v[k]));
}
function receiptValid(v: unknown, binding: GitMemoryWorkerBinding, pin: string, format: GitMemoryFormat): v is GitAdmissionReceipt {
  return keys(v, ['commit', 'objectFormat', 'objectCount', 'retainedBytes', 'policySha256', 'originPolicySha256', 'classes', 'identitiesSha256'])
    && v.commit === pin && v.objectFormat === format && v.policySha256 === binding.policySha256 && v.originPolicySha256 === binding.originPolicySha256
    && Number.isSafeInteger(v.objectCount) && Number(v.objectCount) > 0 && Number(v.objectCount) <= GIT_MEMORY_PACK_LIMITS.maxObjects
    && Number.isSafeInteger(v.retainedBytes) && Number(v.retainedBytes) >= 0 && Number(v.retainedBytes) <= GIT_MEMORY_PACK_LIMITS.maxResolvedBytes
    && hex(v.identitiesSha256) && Array.isArray(v.classes) && v.classes.length > 0 && v.classes.length <= SESSION_CONTENT_CLASSES.length
    && new Set(v.classes).size === v.classes.length && v.classes.every(c => SESSION_CONTENT_CLASSES.includes(c));
}
function exclusionsValid(v: unknown, binding: GitMemoryWorkerBinding): v is readonly GitAcquisitionExclusion[] {
  return Array.isArray(v) && v.length <= GIT_MEMORY_PACK_LIMITS.maxEntries && v.every(item =>
    keys(item, ['species', 'locationSha256', 'contentSha256', 'policySha256', 'originPolicySha256', 'outcome'])
    && ['commit', 'tree-alias', 'blob-alias'].includes(String(item.species))
    && hex(item.locationSha256) && hex(item.contentSha256) && item.policySha256 === binding.policySha256
    && item.originPolicySha256 === binding.originPolicySha256
    && ['denied-path', 'secret-detector-match', 'unknown-extraction-class', 'not-utf8-text', 'active-content', 'redacted-span', 'screening-failed'].includes(String(item.outcome)));
}
async function trustedFile(file: string, expected: string): Promise<void> {
  if (!path.isAbsolute(file) || path.resolve(file) !== file || !hex(expected) || await realpath(file) !== file) throw new Error('worker-unavailable');
  const handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > 134_217_728 || (stat.mode & 0o022) !== 0 || sha256(await handle.readFile()) !== expected) throw new Error('worker-unavailable');
  } finally { await handle.close(); }
}

/** Trusted code only. Node permissions deny child/worker creation and addons; no
 * acquired code is executed. RLIMIT_AS bounds virtual memory, V8 bounds its heap,
 * and CPU/core/FD limits are inherited. Aggregate storage is sampled, never a hard
 * quota. This does not isolate same-UID interference or establish swap/crash safety.
 */
export async function runGitMemoryWorker(request: GitMemoryWorkerRequest): Promise<GitMemoryWorkerResult> {
  const began = performance.now(), program = Object.freeze({ ...request.program }), current = request.current, audit = request.audit, signal = request.signal;
  let limits = GIT_MEMORY_WORKER_LIMITS;
  const state = { stage: 'not-started' as GitMemoryWorkerSummary['stage'], termination: 'not-started' as GitMemoryWorkerSummary['termination'],
    exitCode: null as number | null, signal: null as NodeJS.Signals | null, stdoutBytes: 0, stderrBytes: 0,
    samples: 0, lastCensus: 'Unknown' as 'complete' | 'Unknown', peakBytes: null as number | null, peakEntries: null as number | null, storage: 'not-started' as GitMemoryWorkerSummary['storage'] };
  const summary = (): GitMemoryWorkerSummary => ({ ...state, limits, aggregateEnforcement: 'sampled-stop-only', betweenSamples: 'Unknown', processProfile: 'single-node-no-child-or-worker-permission' });
  const fail = (code: Extract<GitMemoryWorkerResult, { ok: false }>['code']): GitMemoryWorkerResult => ({ ok: false, code, summary: summary() });
  let input: { profile: typeof GIT_MEMORY_WORKER_PROFILE; program: { nodeSha256: string; bundleSha256: string }; binding: GitMemoryWorkerBinding; parent: string; policyBase64: string; visibility: 'private' | 'public'; repository: string | null; objectFormat: GitMemoryFormat; selectedCommit: string; shallow: readonly string[]; packSha256: string; packBytes: number; limits: GitMemoryWorkerLimits; nonce: string };
  let pack: Buffer;
  try {
    limits = bounds(request.limits);
    if (!bindingValid(request.binding) || !(request.pack instanceof Uint8Array) || request.pack.byteLength < 32 || request.pack.byteLength > GIT_MEMORY_PACK_LIMITS.maxPackBytes
      || !(request.policyBytes instanceof Uint8Array) || request.policyBytes.byteLength === 0 || request.policyBytes.byteLength > 2_097_152
      || sha256(request.policyBytes) !== request.binding.policySha256 || !['private', 'public'].includes(request.visibility)
      || !['sha1', 'sha256'].includes(request.objectFormat) || !new RegExp(`^[a-f0-9]{${request.objectFormat === 'sha1' ? 40 : 64}}$`, 'u').test(request.selectedCommit)
      || !Array.isArray(request.shallow) || request.shallow.length !== 1 || request.shallow[0] !== request.selectedCommit
      || typeof request.current !== 'function' || typeof request.audit !== 'function' || (signal !== undefined && !(signal instanceof AbortSignal))
      || (request.repository !== undefined && !/^repository:[a-z0-9][a-z0-9._-]{0,127}$/u.test(request.repository)) || !path.isAbsolute(request.parent) || path.resolve(request.parent) !== request.parent
      || await realpath(request.parent) !== request.parent || (await readdir(request.parent)).length !== 0) return fail('invalid-worker-input');
    const stat = await lstat(request.parent);
    if (!stat.isDirectory() || stat.uid !== process.getuid?.() || (stat.mode & 0o077) !== 0) return fail('invalid-worker-input');
    const binding = Object.freeze({ ...request.binding });
    input = { profile: GIT_MEMORY_WORKER_PROFILE, program: { nodeSha256: program.nodeSha256, bundleSha256: program.bundleSha256 }, binding, parent: request.parent, policyBase64: Buffer.from(request.policyBytes).toString('base64'), visibility: request.visibility,
      repository: request.repository ?? null, objectFormat: request.objectFormat, selectedCommit: request.selectedCommit, shallow: Object.freeze([...request.shallow]), packSha256: sha256(request.pack), packBytes: request.pack.byteLength, limits, nonce: randomBytes(16).toString('hex') };
    pack = Buffer.from(request.pack);
    if (signal?.aborted) return fail('worker-refused');
    if (process.platform !== 'linux') return fail('worker-unavailable');
    if (path.extname(program.bundle) !== '.mjs') return fail('worker-unavailable');
    await trustedFile(program.bundle, program.bundleSha256); await trustedFile(program.node, program.nodeSha256);
    if ((await within(Promise.resolve(current(binding, null)), limits.wallMilliseconds)) !== true) return fail('worker-binding-stale');
  } catch { return fail('invalid-worker-input'); }
  const contextSha256 = digest(input), binding = input.binding;
  const auditContext = Object.freeze({ binding, contextSha256, profile: GIT_MEMORY_WORKER_PROFILE, program: Object.freeze({ ...input.program }), limits });
  let refusal: Extract<GitMemoryWorkerResult, { ok: false }>['code'] | null = null;
  let receipt: GitAdmissionReceipt | null = null, result: Extract<GitMemoryStoreResult, { ok: true }> | null = null;
  let exclusionAudited = false;
  let exited = false, done = false, handling = Promise.resolve(), partial = Buffer.alloc(0);
  const child = spawn('/usr/bin/prlimit', [`--fsize=0:${limits.fileBytes}`, '--core=0:0', `--cpu=${limits.cpuSeconds}:${limits.cpuSeconds}`,
    `--as=${limits.addressSpaceBytes}:${limits.addressSpaceBytes}`, '--nofile=64:64', '--', program.node,
    '--jitless', '--disallow-code-generation-from-strings', '--permission', '--no-addons', '--v8-pool-size=1',
    `--max-old-space-size=${limits.heapMiB}`, '--max-semi-space-size=4', '--stack-size=512',
    `--allow-fs-read=${program.bundle}`, `--allow-fs-read=${input.parent}`, '--allow-fs-read=/proc/self/fd',
    `--allow-fs-write=${input.parent}`, '--allow-fs-write=/proc/self/fd', '--input-type=module', '--eval',
    `import { gitMemoryWorkerMain } from ${JSON.stringify(pathToFileURL(program.bundle).href)}; await gitMemoryWorkerMain();`],
  { cwd: input.parent, env: { PATH: '/usr/bin:/bin', LANG: 'C', LC_ALL: 'C', UV_THREADPOOL_SIZE: '1' }, detached: true, stdio: ['pipe', 'pipe', 'pipe'] });
  state.stage = 'processing'; state.termination = 'Unknown';
  const stop = (code: typeof refusal): void => { refusal ??= code; if (child.pid) try { process.kill(-child.pid, 'SIGKILL'); } catch { /* Confirmation below. */ } };
  const ended = new Promise<void>(resolve => { child.once('error', () => { stop('worker-unavailable'); exited = true; resolve(); }); child.once('exit', (code, signal) => { state.exitCode = code; state.signal = signal; exited = true; resolve(); }); });
  child.stdin.on('error', () => stop('worker-refused'));
  const reply = (v: unknown): void => { if (!refusal && !exited) child.stdin.write(canonical(v) + '\n'); };
  const handle = async (line: string): Promise<void> => {
    if (refusal) return;
    const message: unknown = parseBoundedJson(line, JSON_BOUNDS);
    if (!isRecord(message) || message.contextSha256 !== contextSha256) throw new Error();
    if (message.kind === 'admitted' && keys(message, ['kind', 'contextSha256', 'receipt']) && state.stage === 'processing'
      && receiptValid(message.receipt, binding, input.selectedCommit, input.objectFormat)) {
      receipt = Object.freeze({ ...message.receipt, classes: Object.freeze([...message.receipt.classes]) }); state.stage = 'admitted';
      if ((await current(binding, receipt)) !== true || refusal || exited) { stop('worker-binding-stale'); return; }
      try { await audit({ stage: 'whole-closure-admitted', ...auditContext, receipt, exclusions: [] }); }
      catch { stop('worker-audit-failed'); return; }
      if ((await current(binding, receipt)) !== true || refusal || exited) { stop('worker-binding-stale'); return; }
      await new Promise<void>((resolve, reject) => execFile('/usr/bin/prlimit', ['--pid', String(child.pid), `--fsize=${limits.fileBytes}:${limits.fileBytes}`],
        { timeout: 1000, maxBuffer: 4096, env: { PATH: '/usr/bin:/bin', LANG: 'C' } }, error => error ? reject(new Error()) : resolve()));
      if ((await current(binding, receipt)) !== true || refusal || exited) { stop('worker-binding-stale'); return; }
      state.stage = 'persisting'; state.storage = 'admitted-possible'; reply({ kind: 'ack', contextSha256, receiptSha256: digest(receipt) });
    } else if (message.kind === 'current' && keys(message, ['kind', 'contextSha256', 'receiptSha256']) && receipt && state.stage === 'persisting' && message.receiptSha256 === digest(receipt)) {
      const ok = (await current(binding, receipt)) === true; if (refusal || exited) return; reply({ kind: 'current', contextSha256, ok }); if (!ok) stop('worker-binding-stale');
    } else if (message.kind === 'excluded' && keys(message, ['kind', 'contextSha256', 'exclusions']) && state.stage === 'processing' && exclusionsValid(message.exclusions, binding)) {
      try { await audit({ stage: 'acquisition-excluded', ...auditContext, receipt: null, exclusions: message.exclusions }); }
      catch { stop('worker-audit-failed'); return; } exclusionAudited = true; stop('worker-refused');
    } else if (message.kind === 'stored' && keys(message, ['kind', 'contextSha256', 'store']) && state.stage === 'persisting' && isRecord(message.store)) {
      const store = message.store;
      if (!keys(store, ['ok', 'clone', 'objectCount', 'storedBytes', 'worktree', 'objectsReverified']) || store.ok !== true || typeof store.clone !== 'string'
        || path.dirname(store.clone) !== input.parent || !/^clone-[a-f0-9]{32}$/u.test(path.basename(store.clone)) || store.objectCount !== receipt?.objectCount
        || !Number.isSafeInteger(store.storedBytes) || Number(store.storedBytes) < 0 || Number(store.storedBytes) > limits.directoryBytes || store.worktree !== 'not-materialized' || store.objectsReverified !== true) throw new Error();
      result = store as unknown as Extract<GitMemoryStoreResult, { ok: true }>; state.stage = 'finished'; child.stdin.end();
    } else if (message.kind === 'failed' && keys(message, ['kind', 'contextSha256'])) stop('worker-refused');
    else throw new Error();
  };
  child.stdout.on('data', (chunk: Buffer) => {
    state.stdoutBytes += chunk.length;
    if (state.stdoutBytes + state.stderrBytes > limits.outputBytes) { stop('worker-limit'); return; }
    partial = Buffer.concat([partial, chunk]);
    let at: number;
    while ((at = partial.indexOf(10)) !== -1) {
      const line = partial.subarray(0, at); partial = partial.subarray(at + 1);
      handling = handling.then(() => handle(new TextDecoder('utf-8', { fatal: true }).decode(line))).catch(() => stop('worker-refused'));
    }
  });
  child.stderr.on('data', (chunk: Buffer) => { state.stderrBytes += chunk.length; if (state.stdoutBytes + state.stderrBytes > limits.outputBytes) stop('worker-limit'); });
  const sample = async (): Promise<void> => {
    let bytes = 0, entries = 0; const started = performance.now(); state.lastCensus = 'Unknown';
    const walk = async (root: string): Promise<void> => {
      for (const name of await readdir(root)) {
        if (performance.now() - started > limits.sampleMilliseconds) throw new Error();
        entries++; state.peakEntries = Math.max(state.peakEntries ?? 0, entries); if (entries > limits.directoryEntries) throw new Error();
        const file = path.join(root, name), stat = await lstat(file);
        if (stat.isSymbolicLink() || (!stat.isDirectory() && !stat.isFile())) throw new Error();
        if (stat.isDirectory()) await walk(file); else { bytes += stat.size; state.peakBytes = Math.max(state.peakBytes ?? 0, bytes); if (bytes > limits.directoryBytes || stat.size > limits.fileBytes) throw new Error(); }
      }
    };
    try { await walk(input.parent); state.lastCensus = 'complete'; state.samples++; state.peakBytes = Math.max(state.peakBytes ?? 0, bytes); state.peakEntries = Math.max(state.peakEntries ?? 0, entries); }
    catch { stop('worker-limit'); }
  };
  const monitor = (async () => { while (!done) { await sample(); await delay(limits.sampleMilliseconds); } })();
  const timer = setTimeout(() => stop('worker-limit'), limits.wallMilliseconds);
  const abort = (): void => stop('worker-refused'); signal?.addEventListener('abort', abort, { once: true }); if (signal?.aborted) abort();
  child.stdin.write(canonical(input) + '\n'); child.stdin.write(pack, () => pack.fill(0));
  // A kill failure never creates an unbounded supervisor wait or a false cancellation claim.
  await within(ended, limits.wallMilliseconds + 1500).catch(() => undefined);
  if (!exited) stop('worker-termination-unknown');
  done = true; clearTimeout(timer); signal?.removeEventListener('abort', abort);
  await monitor; await sample();
  // Audit callbacks may remain unresolved; do not wait beyond the process wall bound.
  await within(handling, limits.wallMilliseconds - (performance.now() - began)).catch(() => { refusal ??= 'worker-audit-failed'; });
  child.stdin.destroy(); child.stdout.destroy(); child.stderr.destroy();
  let exists = false;
  if (child.pid) try { process.kill(-child.pid, 0); exists = true; } catch (error) { exists = (error as NodeJS.ErrnoException).code !== 'ESRCH'; }
  state.termination = exited && !exists ? 'confirmed' : 'Unknown';
  if (state.termination === 'Unknown') refusal = 'worker-termination-unknown';
  if (!result || state.exitCode !== 0 || state.signal !== null || partial.length !== 0) refusal ??= 'worker-refused';
  if (!refusal) {
    try { if ((await within(Promise.resolve(current(binding, receipt)), limits.wallMilliseconds - (performance.now() - began))) !== true) refusal = 'worker-binding-stale'; }
    catch { refusal = 'worker-limit'; }
  }
  if (refusal) {
    if (!exclusionAudited) {
      try { await within(Promise.resolve().then(() => audit({ stage: 'worker-refused', outcome: refusal!, ...auditContext, receipt, exclusions: [] })), 1000); }
      catch { refusal = 'worker-audit-failed'; }
    }
    return fail(refusal);
  }
  return { ok: true, store: result!, summary: summary() };
}

/** Bounded framing retains PACK only in process buffers; no temporary or reusable
 * body file. The parent is the sole writer of this pipe and owns the durable audit. */
class WorkerInput {
  private buffer = Buffer.alloc(0); private ended = false; private wake: (() => void) | undefined;
  constructor() {
    process.stdin.on('data', (chunk: Buffer) => {
      if (this.buffer.length + chunk.length > 21_000_000) { process.exit(1); return; }
      this.buffer = Buffer.concat([this.buffer, chunk]); this.wake?.();
    });
    process.stdin.on('end', () => { this.ended = true; this.wake?.(); });
    process.stdin.on('error', () => { this.ended = true; this.wake?.(); });
  }
  private async more(): Promise<void> { if (this.ended) throw new Error(); await new Promise<void>(r => { this.wake = r; }); this.wake = undefined; }
  async line(max = JSON_BOUNDS.maxBytes): Promise<unknown> {
    for (;;) { const at = this.buffer.indexOf(10); if (at >= 0) { if (at > max) throw new Error(); const b = this.buffer.subarray(0, at); this.buffer = this.buffer.subarray(at + 1); return parseBoundedJson(new TextDecoder('utf-8', { fatal: true }).decode(b), { ...JSON_BOUNDS, maxBytes: max }); } if (this.buffer.length > max) throw new Error(); await this.more(); }
  }
  async bytes(length: number): Promise<Buffer> { while (this.buffer.length < length) await this.more(); const b = Buffer.from(this.buffer.subarray(0, length)); this.buffer.fill(0, 0, length); this.buffer = this.buffer.subarray(length); return b; }
}
/** Fixed bootstrap target; not a role or CLI option and absent from workspace exports. */
export async function gitMemoryWorkerMain(): Promise<void> {
  process.stdout.on('error', () => process.exit(1));
  const input = new WorkerInput(); let contextSha256 = '';
  const emit = (v: unknown): Promise<void> => new Promise((resolve, reject) => process.stdout.write(canonical(v) + '\n', error => error ? reject(new Error()) : resolve()));
  try {
    const v = await input.line();
    if (!keys(v, ['profile', 'program', 'binding', 'parent', 'policyBase64', 'visibility', 'repository', 'objectFormat', 'selectedCommit', 'shallow', 'packSha256', 'packBytes', 'limits', 'nonce']) || v.profile !== GIT_MEMORY_WORKER_PROFILE || process.version !== NODE_VERSION
      || !keys(v.program, ['nodeSha256', 'bundleSha256']) || !hex(v.program.nodeSha256) || !hex(v.program.bundleSha256) || !bindingValid(v.binding)
      || typeof v.parent !== 'string' || !path.isAbsolute(v.parent) || typeof v.policyBase64 !== 'string' || typeof v.nonce !== 'string' || !/^[a-f0-9]{32}$/u.test(v.nonce)
      || (v.repository !== null && (typeof v.repository !== 'string' || !/^repository:[a-z0-9][a-z0-9._-]{0,127}$/u.test(v.repository)))
      || !['private', 'public'].includes(String(v.visibility)) || !['sha1', 'sha256'].includes(String(v.objectFormat)) || typeof v.selectedCommit !== 'string'
      || !new RegExp(`^[a-f0-9]{${v.objectFormat === 'sha1' ? 40 : 64}}$`, 'u').test(v.selectedCommit)
      || !Array.isArray(v.shallow) || v.shallow.length !== 1 || v.shallow[0] !== v.selectedCommit || !hex(v.packSha256)
      || !Number.isSafeInteger(v.packBytes) || Number(v.packBytes) < 32 || Number(v.packBytes) > GIT_MEMORY_PACK_LIMITS.maxPackBytes) throw new Error();
    const limits = bounds(v.limits as GitMemoryWorkerLimits); if (canonical(limits) !== canonical(v.limits)) throw new Error();
    contextSha256 = digest(v); const binding = v.binding;
    const policy = Buffer.from(v.policyBase64, 'base64');
    if (policy.byteLength > 2_097_152 || policy.toString('base64') !== v.policyBase64 || sha256(policy) !== binding.policySha256) throw new Error();
    const screen = buildDossierScreen(policy, true, v.repository === null ? null : { repository: v.repository as string, commit: v.selectedCommit }, v.visibility as 'private' | 'public'); if (!screen.ok) throw new Error();
    const packBytes = await input.bytes(Number(v.packBytes)); if (sha256(packBytes) !== v.packSha256) throw new Error();
    const decoded = decodeGitMemoryPack({ pack: packBytes, objectFormat: v.objectFormat as GitMemoryFormat }); packBytes.fill(0);
    if (!decoded.ok) throw new Error();
    const admitted = admitGitMemoryClosure({ pack: decoded.pack, selectedCommit: v.selectedCommit, shallow: v.shallow as string[],
      policy: { id: 'POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1', version: '1.0.0', sha256: binding.originPolicySha256, screen: screen.screen } });
    if (!admitted.ok) { await emit({ kind: 'excluded', contextSha256, exclusions: gitMemoryAdmissionExclusions(admitted) ?? [] }); process.stdin.destroy(); return; }
    const receipt = admitted.receipt; await emit({ kind: 'admitted', contextSha256, receipt });
    const ack = await input.line(4096);
    if (!keys(ack, ['kind', 'contextSha256', 'receiptSha256']) || ack.kind !== 'ack' || ack.contextSha256 !== contextSha256 || ack.receiptSha256 !== digest(receipt)) throw new Error();
    const store = await persistAdmittedGitObjects({ parent: v.parent, receipt, audit: () => undefined,
      current: async () => {
        await emit({ kind: 'current', contextSha256, receiptSha256: digest(receipt) }); const response = await input.line(4096);
        return keys(response, ['kind', 'contextSha256', 'ok']) && response.kind === 'current' && response.contextSha256 === contextSha256 && response.ok === true;
      } });
    if (!store.ok) throw new Error(); await emit({ kind: 'stored', contextSha256, store }); process.stdin.destroy();
  } catch { try { await emit({ kind: 'failed', contextSha256 }); } catch { /* Fixed safe failure only. */ } process.stdin.destroy(); process.exitCode = 1; }
}
