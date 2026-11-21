import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { access, lstat, mkdir, open, readdir, readFile, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { prepareGitSelection, gitLsRefsWire, selectGitLsRefs, type GitSelectionRequest, type GitSelectionOperation, type GitSelectionMetadata, type GitSelectionResult, type GitSelectionPlanFailure, type GitIncomingAdmission, type GitIncomingMetadata, type GitIncomingUnit, decodeGitIncomingUnit, GitMetadataUnitBuffer, GIT_INCOMING_METADATA_LIMITS } from './git-memory-selection.js';
import { sha256 } from '@syzygy/support';
import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';

/** Experimental native-helper API: deliberately pinned, with no disk-fetch fallback. */
export const GIT_MEMORY_HELPER_PROFILE = Object.freeze({
  id: 'git-2.53.0-remote-http-stateless-v2/1',
  path: '/usr/lib/git-core/git-remote-http',
  sha256: '8cedc48ce7cf873cceb6c170535dcf7a434928c1d6ae997dc286f69df1e91702',
});
export interface GitMemoryLimits {
  readonly milliseconds: number; readonly wireBytes: number; readonly packBytes: number;
  readonly stderrBytes: number; readonly advertisementBytes: number; readonly advertisementLines: number;
  readonly lineBytes: number;
}
export const GIT_MEMORY_LIMITS: GitMemoryLimits = Object.freeze({
  milliseconds: 120_000, wireBytes: 66 * 1024 * 1024, packBytes: 64 * 1024 * 1024,
  stderrBytes: 65_536, advertisementBytes: 65_536, advertisementLines: 128, lineBytes: 1024,
});
export interface GitMemoryRequest {
  /** Independently selected and policy-validated locator and exact commit; never returned in diagnostics. */
  readonly url: string; readonly pin: string; readonly objectFormat: 'sha1' | 'sha256';
  /** Caller-created empty owned real directory, protected from concurrent modification by the host. */
  readonly home: string;
  readonly limits?: Partial<GitMemoryLimits>;
  /** A declared source-transport provider, distinct from an inference provider. */
  readonly sourceProvider: string;
  /** Host independently verifies declaration/destination, screens all metadata, and durably
   * audits the safe binding identity before true. A caller string or first request is no grant. */
  readonly admitMetadata: (request: GitMemoryMetadata) => boolean | Promise<boolean>;
  readonly admitIncomingMetadata: GitIncomingAdmission;
}
export interface GitMemoryMetadata {
  readonly stage: 'connect' | 'fetch'; readonly sourceProvider: string; readonly url: string;
  readonly destination: { readonly scheme: string; readonly host: string; readonly port: number; readonly service: 'git-upload-pack' };
  readonly pin: string; readonly objectFormat: 'sha1' | 'sha256'; readonly classes: readonly ['code-structure'];
  readonly protocol: 'git-v2-stateless'; readonly wire: Uint8Array; readonly digest: string; readonly bytes: number;
  readonly config: Readonly<Record<string, unknown>>; readonly configDigest: string; readonly bindingDigest: string;
}
export type GitMemoryFailure = 'invalid-request' | 'unsupported-transport' | 'helper-profile-unavailable'
  | 'metadata-unavailable' | 'metadata-changed' | 'spawn-failed' | 'process-failed' | 'process-deadline'
  | 'wire-limit' | 'pack-limit' | 'protocol-refused' | 'pack-refused' | 'termination-unconfirmed' | 'metadata-admission-refused' | 'incoming-metadata-refused';
export interface GitMemoryEvidence {
  readonly profile: string;
  readonly helper: { readonly path: string; readonly resolvedPath: string; readonly sha256: string } | null;
  readonly limits: GitMemoryLimits;
  readonly stdoutBytes: number; readonly stderrBytes: number; readonly sentBytes: number; readonly packBytes: number;
  readonly protocolVersion: 2 | null; readonly advertisementLines: number;
  readonly stage: string; readonly responsePackets: number; readonly responseState: string;
  readonly incomingMetadata: readonly { readonly unit: GitIncomingUnit; readonly bindingDigest: string; readonly digest: string; readonly bytes: number }[];
  readonly configDigest: string | null; readonly admittedMetadata: readonly { readonly stage: 'connect' | 'fetch' | 'ls-refs'; readonly bindingDigest: string }[];
  readonly exitCode: number | null; readonly signal: NodeJS.Signals | null;
  readonly groupTermination: 'not-started' | 'confirmed' | 'unconfirmed';
  readonly metadataUnchanged: boolean | null;
  readonly durationMilliseconds: number;
  readonly childRegularFileWriteLimit: 0;
  readonly childCoreLimit: 0;
  /** Caller must establish enclosing runtime guarantees; this module makes no swap/dump claim. */
  readonly externalMemorySpillSwapDump: 'Unknown';
}
export type GitMemoryResult = { readonly ok: true; readonly pack: Uint8Array; readonly shallow: readonly [string]; readonly evidence: GitMemoryEvidence }
  | { readonly ok: false; readonly code: GitMemoryFailure; readonly reason: string; readonly evidence: GitMemoryEvidence };
const REASONS: Record<GitMemoryFailure, string> = {
  'invalid-request': 'Memory transport requires bounded validated inputs and a fresh protected HOME.',
  'unsupported-transport': 'This memory transport supports HTTPS only; this transport has no disk fallback.',
  'helper-profile-unavailable': 'The exact supported native helper or hard limiter is unavailable.',
  'metadata-unavailable': 'Fresh inert bare metadata could not be prepared.',
  'metadata-changed': 'The recipient metadata population changed during reception.',
  'spawn-failed': 'The trusted memory transport process could not start.',
  'process-failed': 'The trusted memory transport process failed.',
  'process-deadline': 'The memory transport process exceeded its wall deadline.',
  'wire-limit': 'The memory transport exceeded its protocol or diagnostic byte bound.',
  'pack-limit': 'The memory transport exceeded its in-memory PACK byte bound.',
  'protocol-refused': 'The native helper or Git wire response is outside the supported protocol profile.',
  'pack-refused': 'The received PACK envelope or checksum is invalid.',
  'termination-unconfirmed': 'Transport process-group termination could not be confirmed.',
  'incoming-metadata-refused': 'The incoming source protocol metadata was not classified, screened and admitted.',
  'metadata-admission-refused': 'The declared source destination or prepared protocol metadata was not admitted and audited.',
};
interface Tools {
  readonly helper: string; readonly digest: string; readonly prlimit: string;
  readonly allowLoopbackHttp?: boolean;
}
const PRODUCTION: Tools = { helper: GIT_MEMORY_HELPER_PROFILE.path, digest: GIT_MEMORY_HELPER_PROFILE.sha256, prlimit: '/usr/bin/prlimit' };
class Refusal { constructor(readonly code: GitMemoryFailure) {} }
function refuse(code: GitMemoryFailure): never { throw new Refusal(code); }
const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const packet = (text: string): Buffer => {
  const bytes = Buffer.from(text, 'ascii');
  return Buffer.concat([Buffer.from((bytes.length + 4).toString(16).padStart(4, '0'), 'ascii'), bytes]);
};

/** A bounded queue, consumed once. No response, progress or diagnostic text is logged/returned. */
class Input {
  private chunks: Buffer[] = [];
  private offset = 0;
  private available = 0;
  private ended = false;
  private failure: GitMemoryFailure | null = null;
  private waiting: (() => void) | null = null;
  push(chunk: Buffer): void { this.chunks.push(chunk); this.available += chunk.length; this.wake(); }
  end(): void { this.ended = true; this.wake(); }
  abort(code: GitMemoryFailure): void { this.failure ??= code; this.wake(); }
  private wake(): void { const wake = this.waiting; this.waiting = null; wake?.(); }
  get remaining(): number { return this.available; }
  async exact(size: number): Promise<Buffer> {
    while (this.available < size) {
      if (this.failure) refuse(this.failure);
      if (this.ended) refuse('protocol-refused');
      await new Promise<void>(resolve => { this.waiting = resolve; });
    }
    if (this.failure) refuse(this.failure);
    const out = Buffer.allocUnsafe(size);
    let written = 0;
    while (written < size) {
      const first = this.chunks[0]!;
      const count = Math.min(first.length - this.offset, size - written);
      first.copy(out, written, this.offset, this.offset + count);
      written += count; this.offset += count; this.available -= count;
      if (this.offset === first.length) { this.chunks.shift(); this.offset = 0; }
    }
    return out;
  }
  async line(max: number): Promise<string> {
    const bytes: number[] = [];
    while (bytes.length < max) {
      const byte = (await this.exact(1))[0]!;
      if (byte === 10) return Buffer.from(bytes).toString('ascii');
      if (byte < 32 || byte > 126) refuse('protocol-refused');
      bytes.push(byte);
    }
    refuse('protocol-refused');
  }
  async pkt(): Promise<Buffer | 0 | 1 | 2> {
    const header = await this.exact(4);
    if (!header.every(byte => (byte >= 48 && byte <= 57) || (byte >= 97 && byte <= 102))) refuse('protocol-refused');
    const size = Number.parseInt(header.toString('ascii'), 16);
    if (size <= 2) return size as 0 | 1 | 2;
    if (size < 5 || size > 65_520) refuse('protocol-refused');
    return this.exact(size - 4);
  }
  clear(): void { for (const chunk of this.chunks) chunk.fill(0); this.chunks = []; this.available = 0; }
}

/** Fixed metadata only; no Git command is run to create it. */
async function prepare(home: string, format: 'sha1' | 'sha256'): Promise<Map<string, string>> {
  const stat = await lstat(home);
  if (!stat.isDirectory() || stat.isSymbolicLink() || (process.getuid && stat.uid !== process.getuid()) || await realpath(home) !== home || (await readdir(home)).length !== 0) refuse('invalid-request');
  for (const directory of ['xdg', 'tmp', 'metadata.git', 'metadata.git/objects', 'metadata.git/refs']) await mkdir(path.join(home, directory), { mode: 0o700 });
  const files = new Map([
    ['metadata.git/HEAD', 'ref: refs/heads/memory-receive\n'],
    ['metadata.git/config', `[core]\n\trepositoryformatversion = ${format === 'sha256' ? 1 : 0}\n\tbare = true\n${format === 'sha256' ? '[extensions]\n\tobjectformat = sha256\n' : ''}`],
  ]);
  for (const [name, content] of files) await writeFile(path.join(home, name), content, { flag: 'wx', mode: 0o600 });
  return files;
}
async function unchanged(home: string, files: ReadonlyMap<string, string>): Promise<boolean> {
  const expectedDirectories = new Set(['xdg', 'tmp', 'metadata.git', 'metadata.git/objects', 'metadata.git/refs']);
  const seen = new Set<string>();
  const walk = async (directory: string, prefix = ''): Promise<boolean> => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const name = prefix + entry.name;
      if (seen.has(name) || entry.isSymbolicLink()) return false;
      seen.add(name);
      if (entry.isDirectory()) { if (!expectedDirectories.has(name) || !(await walk(path.join(directory, entry.name), name + '/'))) return false; }
      else if (entry.isFile() && files.has(name)) {
        const handle = await open(path.join(directory, entry.name), constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
        try {
          const expected = Buffer.from(files.get(name)!, 'utf8');
          const stat = await handle.stat();
          if (!stat.isFile() || stat.size !== expected.length) return false;
          const buffer = Buffer.alloc(expected.length + 1);
          const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
          if (bytesRead !== expected.length || !buffer.subarray(0, bytesRead).equals(expected)) return false;
        } finally { await handle.close(); }
      } else return false;
    }
    return true;
  };
  return await walk(home) && seen.size === expectedDirectories.size + files.size;
}
function environment(home: string, allowHttp: boolean): NodeJS.ProcessEnv {
  const settings = {
    'protocol.version': '2', 'credential.helper': '', 'credential.interactive': 'false', 'core.askPass': '/bin/false', 'core.hooksPath': '/dev/null',
    'http.sslVerify': 'true', 'http.followRedirects': 'false', 'http.proxy': '', 'http.extraHeader': '', 'http.cookieFile': '', 'http.saveCookies': 'false',
    'protocol.allow': 'never', 'protocol.https.allow': 'always', 'protocol.http.allow': allowHttp ? 'always' : 'never', 'protocol.file.allow': 'never',
    'gc.auto': '0', 'maintenance.auto': 'false', 'fetch.recurseSubmodules': 'false', 'submodule.recurse': 'false',
  };
  const result: NodeJS.ProcessEnv = {
    PATH: '/usr/bin:/bin', HOME: home, XDG_CONFIG_HOME: path.join(home, 'xdg'), TMPDIR: path.join(home, 'tmp'), LANG: 'C', LC_ALL: 'C',
    GIT_DIR: path.join(home, 'metadata.git'), GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_SYSTEM: '/dev/null', GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_TERMINAL_PROMPT: '0', GIT_ASKPASS: '/bin/false', SSH_ASKPASS: '/bin/false', GIT_PROTOCOL: 'version=2',
    GIT_ATTR_NOSYSTEM: '1', GIT_NO_REPLACE_OBJECTS: '1', GIT_NO_LAZY_FETCH: '1', GIT_OPTIONAL_LOCKS: '0',
    GIT_CONFIG_COUNT: String(Object.keys(settings).length),
  };
  Object.entries(settings).forEach(([key, value], index) => { result[`GIT_CONFIG_KEY_${index}`] = key; result[`GIT_CONFIG_VALUE_${index}`] = value; });
  return result;
}

export const receiveGitPackInMemory = (request: GitMemoryRequest): Promise<GitMemoryResult> => receive(request, PRODUCTION);
/** Internal own-fixture seam, absent from package exports and operator options. */
export const gitMemoryTransportTestPort = (tools: Tools) => (request: GitMemoryRequest): Promise<GitMemoryResult> => receive(request, tools);

export const selectGitRevisionOverHttps = (request: GitSelectionRequest): Promise<GitSelectionResult> => select(request, PRODUCTION);
export const gitMemorySelectionTestPort = (tools: Tools) => (request: GitSelectionRequest): Promise<GitSelectionResult> => select(request, tools);
async function select(input: GitSelectionRequest, tools: Tools): Promise<GitSelectionResult> {
  const planned = prepareGitSelection(input);
  // Parser failures carry no incoming text or process evidence; receive constructs the common safe envelope.
  return receive({ ...input, admitIncomingMetadata: input.admitIncomingMetadata ?? (() => false), home: input.home ?? '', pin: '0'.repeat(40), objectFormat: 'sha1', admitMetadata: () => false }, tools,
    planned.ok ? planned.value : { failure: planned });
}
function receive(request: GitMemoryRequest, tools: Tools): Promise<GitMemoryResult>;
function receive(request: GitMemoryRequest, tools: Tools, selection: GitSelectionOperation | { failure: GitSelectionPlanFailure }): Promise<GitSelectionResult>;
async function receive(request: GitMemoryRequest, tools: Tools, selection?: GitSelectionOperation | { failure: GitSelectionPlanFailure }): Promise<GitMemoryResult | GitSelectionResult> {
  const started = performance.now();
  // No awaited admission can change the selected locator, pin, executable or bounds.
  request = Object.freeze({ ...request, limits: request.limits === undefined ? undefined : Object.freeze({ ...request.limits }) });
  tools = Object.freeze({ ...tools });
  const overrides = request.limits ?? {};
  const invalidLimits = typeof overrides !== 'object' || Array.isArray(overrides)
    || Object.entries(overrides).some(([key, value]) => !Object.hasOwn(GIT_MEMORY_LIMITS, key) || !Number.isSafeInteger(value) || value <= 0 || value > GIT_MEMORY_LIMITS[key as keyof GitMemoryLimits]);
  // Refused options cannot introduce arbitrary keys/values into safe evidence.
  const limits: GitMemoryLimits = invalidLimits ? { ...GIT_MEMORY_LIMITS } : { ...GIT_MEMORY_LIMITS, ...overrides };
  let helper: GitMemoryEvidence['helper'] = null, stdoutBytes = 0, stderrBytes = 0, sentBytes = 0, packBytes = 0;
  let protocolVersion: 2 | null = null, advertisementLines = 0, exitCode: number | null = null, signal: NodeJS.Signals | null = null;
  let stage = 'validation', responsePackets = 0, responseState = 'not-started';
  let configDigest: string | null = null;
  const admittedMetadata: { stage: 'connect' | 'fetch' | 'ls-refs'; bindingDigest: string }[] = [];
  const incomingMetadata: GitMemoryEvidence['incomingMetadata'][number][] = [];
  let cumulativeText = '', cumulativeComposition = '';

  let groupTermination: GitMemoryEvidence['groupTermination'] = 'not-started', metadataUnchanged: boolean | null = null;
  const evidence = (): GitMemoryEvidence => ({ profile: GIT_MEMORY_HELPER_PROFILE.id, helper, limits, stdoutBytes, stderrBytes, sentBytes, packBytes, protocolVersion,
    advertisementLines, stage, responsePackets, responseState, configDigest, incomingMetadata: incomingMetadata.map(value => ({ ...value })), admittedMetadata: admittedMetadata.map(value => ({ ...value })), exitCode, signal, groupTermination, metadataUnchanged, durationMilliseconds: performance.now() - started,
    childRegularFileWriteLimit: 0, childCoreLimit: 0, externalMemorySpillSwapDump: 'Unknown' });
  const failure = (code: GitMemoryFailure): GitMemoryResult => ({ ok: false, code, reason: REASONS[code], evidence: evidence() });
  if (selection && 'failure' in selection) return { ...selection.failure, evidence: evidence() };
  const operation = selection && !('failure' in selection) ? selection : undefined;
  if (operation?.plan.kind === 'full-commit') { const result = selectGitLsRefs(operation.plan, 'sha1', []); return result.ok ? { ok: true, selection: result.value, evidence: evidence() } : { ...result, evidence: evidence() }; }
  if (typeof (operation ? operation.admitIncomingMetadata : request.admitIncomingMetadata) !== 'function') return failure('invalid-request');
  if (operation && typeof operation.admitMetadata !== 'function') return failure('invalid-request');
  if (invalidLimits
    || typeof request.url !== 'string' || request.url.length > 8192 || !/^[\x21-\x7e]+$/.test(request.url) || /[?#\\]/.test(request.url)
    || !['sha1', 'sha256'].includes(request.objectFormat) || typeof request.pin !== 'string' || !(request.objectFormat === 'sha1' ? /^[0-9a-f]{40}$/ : /^[0-9a-f]{64}$/).test(request.pin)
    || typeof request.home !== 'string' || !path.isAbsolute(request.home) || path.resolve(request.home) !== request.home || process.platform !== 'linux') return failure('invalid-request');
  if (typeof request.sourceProvider !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/.test(request.sourceProvider) || typeof request.admitMetadata !== 'function') return failure('invalid-request');
  let url: URL;
  try { url = new URL(request.url); } catch { return failure('unsupported-transport'); }
  const loopback = tools.allowLoopbackHttp && url.protocol === 'http:' && url.hostname === '127.0.0.1' && url.port !== '';
  if (url.username !== '' || url.password !== '' || request.url.split('/')[2]?.includes('@') || (url.protocol !== 'https:' && !loopback)) return failure('unsupported-transport');
  try {
    stage = 'helper-capabilities';
    await access(tools.prlimit, constants.X_OK); await access(tools.helper, constants.X_OK);
    const resolvedPath = await realpath(tools.helper), digest = sha256(await readFile(resolvedPath));
    if (digest !== tools.digest) return failure('helper-profile-unavailable');
    helper = { path: tools.helper, resolvedPath, sha256: digest };
  } catch { return failure('helper-profile-unavailable'); }
  let files: Map<string, string>;
  try { files = await prepare(request.home, request.objectFormat); }
  catch (error) { return failure(error instanceof Refusal ? error.code : 'metadata-unavailable'); }
  const env = Object.freeze(environment(request.home, Boolean(loopback)));
  const helperArgs = Object.freeze(['--core=0:0', '--fsize=0:0', '--', tools.helper, 'syzygy-memory', request.url]);
  const config = Object.freeze({ profile: GIT_MEMORY_HELPER_PROFILE.id, helper: Object.freeze(helper!), limiter: tools.prlimit, args: helperArgs, environment: env });
  const canonical = (value: unknown): string => encodeCanonicalJson(value, { maxBytes: 65_536, maxNodes: 1024, maxDepth: 8 });
  configDigest = sha256(canonical(config));
  const destination = Object.freeze({ scheme: url.protocol.slice(0, -1), host: url.hostname.toLowerCase(), port: Number(url.port || (url.protocol === 'https:' ? 443 : 80)), service: 'git-upload-pack' as const });
  let selectedFormat: 'sha1' | 'sha256' | null = operation ? null : request.objectFormat;
  const admit = async (part: 'connect' | 'fetch' | 'ls-refs', bytes: Buffer): Promise<void> => {
    const identity = { stage: part, sourceProvider: request.sourceProvider, url: request.url, destination, pin: request.pin, objectFormat: request.objectFormat,
      classes: Object.freeze(['code-structure'] as const), protocol: 'git-v2-stateless' as const, digest: sha256(bytes), bytes: bytes.length, configDigest: configDigest! };
    const selectedIdentity = operation ? { ...identity, pin: undefined, selector: operation.selector, plan: operation.plan, objectFormat: selectedFormat } : identity;
    if (operation) delete (selectedIdentity as { pin?: string }).pin;
    const metadata = Object.freeze({ ...selectedIdentity, wire: Uint8Array.from(bytes), config, bindingDigest: sha256(canonical(selectedIdentity)) });
    let timer: ReturnType<typeof setTimeout> | undefined;
    let allowed = false;
    try {
      allowed = await Promise.race([Promise.resolve().then(() => operation ? operation.admitMetadata(metadata as GitSelectionMetadata) : request.admitMetadata(metadata as GitMemoryMetadata)), new Promise<boolean>(resolve => { timer = setTimeout(() => resolve(false), Math.max(1, limits.milliseconds - (performance.now() - started))); })]);
    } catch { /* No diagnostic or excluded metadata is returned. */ }
    finally { clearTimeout(timer); }
    if (allowed !== true || sha256(bytes) !== identity.digest) refuse('metadata-admission-refused');
    admittedMetadata.push({ stage: part, bindingDigest: metadata.bindingDigest });
  };
  const metadataBuffer = () => new GitMetadataUnitBuffer(limits.advertisementBytes, limits.advertisementLines + 4);
  const appendMetadata = (buffer: GitMetadataUnitBuffer, value: Uint8Array | 0 | 1 | 2): void => { if (!buffer.append(value)) refuse('wire-limit'); };
  const incomingPort = operation ? operation.admitIncomingMetadata : request.admitIncomingMetadata;
  if (typeof incomingPort !== 'function') refuse('invalid-request');
  const admitIncoming = async (unit: GitIncomingUnit, wire: Buffer) => {
    if (incomingMetadata.length >= GIT_INCOMING_METADATA_LIMITS.units) refuse('wire-limit');
    const decoded = decodeGitIncomingUnit(unit, 'git-v2-stateless', selectedFormat, wire);
    if (!decoded) refuse('protocol-refused');
    if (Buffer.byteLength(cumulativeText) + Buffer.byteLength(decoded.payloadText) > GIT_INCOMING_METADATA_LIMITS.cumulativeBytes
      || Buffer.byteLength(cumulativeComposition) + Buffer.byteLength(decoded.composition) > GIT_INCOMING_METADATA_LIMITS.cumulativeBytes) refuse('wire-limit');
    const nextText = cumulativeText + decoded.payloadText, nextComposition = cumulativeComposition + decoded.composition;
    const context = { stage: unit === 'advertisement' ? 'advertisement' as const : unit === 'ls-refs' ? 'ls-refs' as const : 'fetch-metadata' as const,
      unit, operation: operation ? 'selection' as const : 'receive' as const, protocol: 'git-v2-stateless' as const,
      sourceProvider: request.sourceProvider, url: request.url, destination: destination, pin: operation ? null : request.pin,
      selector: operation?.selector ?? null, plan: operation?.plan ?? null, objectFormat: selectedFormat,
      classes: Object.freeze(['code-structure'] as const), profile: GIT_MEMORY_HELPER_PROFILE.id, configDigest: configDigest! };
    const digest = sha256(wire), bytes = wire.length, previousBindingDigest = incomingMetadata.at(-1)?.bindingDigest ?? null;
    const decodedDigest = sha256(encodeCanonicalJson(decoded, { maxBytes: 524_288, maxNodes: 4096, maxDepth: 16 }));
    const bindingDigest = sha256(canonical({ ...context, digest, bytes, decodedDigest, previousBindingDigest,
      cumulativeTextDigest: sha256(nextText), cumulativeCompositionDigest: sha256(nextComposition) }));
    const metadata: GitIncomingMetadata = Object.freeze({ ...decoded, ...context, rawWire: Uint8Array.from(wire), digest, bytes,
      previousBindingDigest, cumulativeText: nextText, cumulativeComposition: nextComposition, bindingDigest });
    let timer: ReturnType<typeof setTimeout> | undefined, allowed = false;
    try { allowed = await Promise.race([Promise.resolve().then(() => incomingPort(metadata)), new Promise<boolean>(resolve => { timer = setTimeout(() => resolve(false), Math.max(1, limits.milliseconds - (performance.now() - started))); })]); } catch { /* No peer or policy diagnostic escapes. */ } finally { clearTimeout(timer); }
    if (allowed !== true || sha256(wire) !== digest) refuse('incoming-metadata-refused');
    cumulativeText = nextText; cumulativeComposition = nextComposition;
    incomingMetadata.push({ unit, bindingDigest, digest, bytes });
    return decoded;
  };
  const connectWire = Buffer.from('capabilities\nstateless-connect git-upload-pack\n');
  stage = 'connect-admission';
  try { await admit('connect', connectWire); }
  catch { metadataUnchanged = await unchanged(request.home, files).catch(() => false); return failure('metadata-admission-refused'); }
  const reader = new Input(), parts: Buffer[] = [];
  let refusal: GitMemoryFailure | null = null;
  const child = spawn(tools.prlimit, helperArgs, {
    cwd: request.home, env, detached: true, stdio: ['pipe', 'pipe', 'pipe'],
  });
  const groupExists = (): boolean => {
    if (child.pid === undefined) return false;
    try { process.kill(-child.pid, 0); return true; } catch (error) { return (error as NodeJS.ErrnoException).code !== 'ESRCH'; }
  };
  const kill = (value: NodeJS.Signals): void => { if (child.pid !== undefined) { try { process.kill(-child.pid, value); } catch { /* Confirmation below is authoritative. */ } } };
  let cleanupPromise: Promise<void> | null = null;
  const cleanup = (): Promise<void> => cleanupPromise ??= (async () => {
    kill('SIGTERM');
    const began = performance.now();
    while (groupExists() && performance.now() - began < 150) await delay(10);
    kill('SIGKILL');
    while (groupExists() && performance.now() - began < 1250) await delay(10);
    groupTermination = groupExists() ? 'unconfirmed' : child.pid === undefined ? 'not-started' : 'confirmed';
  })();
  const stop = (code: GitMemoryFailure): void => { refusal ??= code; reader.abort(refusal); void cleanup(); };
  let finish: () => void = () => {};
  const finished = new Promise<void>(resolve => { finish = resolve; });
  child.once('error', () => { stop('spawn-failed'); reader.end(); finish(); });
  child.once('exit', (code, endedBy) => { exitCode = code; signal = endedBy; });
  child.once('close', () => { reader.end(); finish(); });
  child.stdin.on('error', () => stop('process-failed'));
  child.stdout.on('error', () => stop('process-failed'));
  child.stderr.on('error', () => stop('process-failed'));
  child.stdout.on('data', (chunk: Buffer) => {
    stdoutBytes += chunk.length;
    if (stdoutBytes + stderrBytes > limits.wireBytes) stop('wire-limit');
    else if (refusal === null) reader.push(chunk);
  });
  child.stderr.on('data', (chunk: Buffer) => {
    stderrBytes += chunk.length;
    if (stderrBytes > limits.stderrBytes || stdoutBytes + stderrBytes > limits.wireBytes) stop('wire-limit');
  });
  const wall = setTimeout(() => stop('process-deadline'), Math.max(1, limits.milliseconds - (performance.now() - started)));
  const send = (bytes: Buffer): void => { sentBytes += bytes.length; if (sentBytes > 16_384) refuse('protocol-refused'); child.stdin.write(bytes); };
  let pack: Buffer | null = null;
  let selectedRevision: ReturnType<typeof selectGitLsRefs> | null = null;
  try {
    send(Buffer.from('capabilities\n'));
    const capabilities: string[] = [];
    while (true) {
      const value = await reader.line(limits.lineBytes);
      if (value === '') break;
      capabilities.push(value);
      if (capabilities.length > 16) refuse('protocol-refused');
    }
    const expected = ['stateless-connect', 'fetch', 'get', 'option', 'push', 'check-connectivity', 'object-format'];
    if (capabilities.length !== expected.length || new Set(capabilities).size !== expected.length || capabilities.some(value => !expected.includes(value))) refuse('protocol-refused');
    stage = 'stateless-connect'; send(Buffer.from('stateless-connect git-upload-pack\n'));
    if (await reader.line(limits.lineBytes) !== '') refuse('protocol-refused');
    stage = 'advertisement'; const advertisementMetadata = metadataBuffer(); let advertisementBytes = 0, sawFetch = false, sawFormat = false, sawLsRefs = false;
    const seen = new Set<string>();
    while (true) {
      const pkt = await reader.pkt();
      appendMetadata(advertisementMetadata, pkt);
      if (pkt === 0) break;
      if (typeof pkt === 'number') refuse('protocol-refused');
      advertisementBytes += pkt.length + 4; advertisementLines++;
      if (advertisementBytes > limits.advertisementBytes || advertisementLines > limits.advertisementLines) refuse('wire-limit');
      const value = pkt.toString('latin1');
      if (!/^[\x20-\x7e]+\n$/.test(value)) refuse('protocol-refused');
      if (advertisementLines === 1) { if (value !== 'version 2\n') refuse('protocol-refused'); continue; }
      const key = value.split('=')[0]!;
      if (seen.has(key)) refuse('protocol-refused'); seen.add(key);
      if (key === 'agent') { if (!/^agent=[A-Za-z0-9./_+-]{1,200}\n$/.test(value)) refuse('protocol-refused'); }
      else if (key === 'ls-refs') { if (!/^ls-refs=(?:unborn)?\n$/.test(value)) refuse('protocol-refused'); sawLsRefs = true; }
      else if (key === 'fetch') {
        const features = value.slice(6, -1).split(' ');
        if (!features.includes('shallow') || features.some(feature => !['shallow', 'wait-for-done'].includes(feature))) refuse('protocol-refused');
        sawFetch = true;
      } else if (value === 'server-option\n') { /* No option is sent. */ }
      else if (operation && (value === 'object-format=sha1\n' || value === 'object-format=sha256\n')) { sawFormat = true; }
      else if (!operation && value === `object-format=${request.objectFormat}\n`) sawFormat = true;
      else refuse('protocol-refused');
    }
    if (!sawFetch || !sawFormat) refuse('protocol-refused');
    stage = 'incoming-advertisement'; const admittedAdvertisement = await admitIncoming('advertisement', advertisementMetadata.wire());
    if (admittedAdvertisement.parsed.kind !== 'advertisement') refuse('protocol-refused');
    protocolVersion = 2; if (operation) selectedFormat = admittedAdvertisement.parsed.objectFormat;
    if (operation) {
      if (!sawLsRefs || selectedFormat === null) refuse('protocol-refused');
      const wire = gitLsRefsWire(operation.plan, selectedFormat);
      stage = 'ls-refs-admission'; await admit('ls-refs', wire); if (refusal !== null) refuse(refusal); send(wire);
      stage = 'ls-refs-response'; const referenceMetadata = metadataBuffer(), rows: Buffer[] = []; let bytes = 0, ended = false;
      while (true) {
        const pkt = await reader.pkt(); responsePackets++; appendMetadata(referenceMetadata, pkt);
        if (pkt === 2 && rows.length === 0 && !ended) { ended = true; continue; }
        if (pkt === 0) break; if (typeof pkt === 'number') refuse('protocol-refused');
        bytes += pkt.length + 4; if (bytes > limits.advertisementBytes || rows.length >= limits.advertisementLines) refuse('wire-limit'); rows.push(pkt);
      }
      const referenceEnd = await reader.pkt(); appendMetadata(referenceMetadata, referenceEnd); if (referenceEnd !== 2) refuse('protocol-refused');
      stage = 'incoming-ls-refs'; await admitIncoming('ls-refs', referenceMetadata.wire());
      selectedRevision = selectGitLsRefs(operation.plan, selectedFormat, rows);
    } else {
    const fetchWire = Buffer.concat([packet('command=fetch\n'), packet(`object-format=${request.objectFormat}\n`), Buffer.from('0001'), packet('no-progress\n'), packet(`want ${request.pin}\n`), packet('deepen 1\n'), packet('done\n'), Buffer.from('0000')]);
    stage = 'fetch-admission'; await admit('fetch', fetchWire);
    if (refusal !== null) refuse(refusal);
    send(fetchWire);
    stage = 'fetch-response'; const fetchMetadata = metadataBuffer(); let phase: 'shallow-header' | 'shallow' | 'pack-header' | 'pack' | 'end' = 'shallow-header';
    let shallow = false, initialEnd = false;
    while (true) {
      const pkt = await reader.pkt();
      if (typeof pkt === 'number' || phase !== 'pack') appendMetadata(fetchMetadata, pkt);
      responsePackets++; responseState = phase + ':' + (typeof pkt === 'number' ? pkt : 'data-' + pkt.length);
      if (pkt === 2) {
        if (phase === 'shallow-header' && !initialEnd) { initialEnd = true; continue; }
        if (phase !== 'end') refuse('protocol-refused');
        break;
      }
      if (pkt === 0) { if (phase !== 'pack') refuse('protocol-refused'); phase = 'end'; continue; }
      if (pkt === 1) { if (phase !== 'shallow' || !shallow) refuse('protocol-refused'); phase = 'pack-header'; continue; }
      if (phase === 'shallow-header' && pkt.equals(Buffer.from('shallow-info\n'))) phase = 'shallow';
      else if (phase === 'shallow' && !shallow && (pkt.equals(Buffer.from(`shallow ${request.pin}`)) || pkt.equals(Buffer.from(`shallow ${request.pin}\n`)))) shallow = true;
      else if (phase === 'pack-header' && pkt.equals(Buffer.from('packfile\n'))) { stage = 'incoming-fetch-header'; await admitIncoming('fetch-header', fetchMetadata.wire()); phase = 'pack'; stage = 'fetch-response'; }
      else if (phase === 'pack') {
        if (pkt[0] === 1) {
          packBytes += pkt.length - 1;
          if (packBytes > limits.packBytes) refuse('pack-limit');
          parts.push(pkt.subarray(1));
        } else refuse('protocol-refused');
      } else refuse('protocol-refused');
    }
    stage = 'incoming-fetch-end'; await admitIncoming('fetch-end', fetchMetadata.wire());
    }
    stage = 'process-close'; child.stdin.end();
    await Promise.race([finished, new Promise<void>(resolve => { const poll = setInterval(() => { if (refusal !== null) { clearInterval(poll); resolve(); } }, 10); finished.then(() => clearInterval(poll)); })]);
    if (refusal !== null) refuse(refusal);
    if (reader.remaining !== 0 || exitCode !== 0 || signal !== null) refuse('process-failed');
    if (!operation) {
    stage = 'pack-check'; pack = Buffer.concat(parts, packBytes);
    const trailer = request.objectFormat === 'sha1' ? 20 : 32;
    if (pack.length < 12 + trailer || !pack.subarray(0, 4).equals(Buffer.from('PACK')) || ![2, 3].includes(pack.readUInt32BE(4))
      || !createHash(request.objectFormat).update(pack.subarray(0, -trailer)).digest().equals(pack.subarray(-trailer))) refuse('pack-refused');
    }
  } catch (error) { stop(error instanceof Refusal ? error.code : 'protocol-refused'); }
  finally {
    await cleanup(); clearTimeout(wall);
    child.stdin.destroy(); child.stdout.destroy(); child.stderr.destroy(); reader.clear();
    for (const part of parts) part.fill(0);
    try { metadataUnchanged = await unchanged(request.home, files); } catch { metadataUnchanged = false; }
  }
  if (evidence().groupTermination === 'unconfirmed') { pack?.fill(0); return failure('termination-unconfirmed'); }
  if (!metadataUnchanged) { pack?.fill(0); return failure('metadata-changed'); }
  if (operation && refusal === null && selectedRevision !== null) return selectedRevision.ok ? { ok: true, selection: selectedRevision.value, evidence: evidence() } : { ...selectedRevision, evidence: evidence() };
  if (refusal !== null || pack === null) { pack?.fill(0); return failure(refusal ?? 'protocol-refused'); }
  return { ok: true, pack, shallow: [request.pin], evidence: evidence() };
}
