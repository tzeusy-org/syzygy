import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { access, lstat, mkdir, readFile, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { prepareGitSelection, gitLsRefsWire, selectGitLsRefs, type GitSelectionRequest, type GitSelectionOperation, type GitSelectionMetadata, type GitSelectionResult, type GitSelectionPlanFailure, type GitIncomingAdmission, type GitIncomingMetadata, type GitIncomingUnit, decodeGitIncomingUnit, GitMetadataUnitBuffer, GIT_INCOMING_METADATA_LIMITS } from './git-memory-selection.js';
import { sha256 } from '@syzygy/support';
import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { GIT_MEMORY_LIMITS, type GitMemoryLimits, type GitMemoryEvidence, type GitMemoryResult, type GitMemoryFailure } from './git-memory-transport.js';

export const GIT_MEMORY_SSH_PROFILE = Object.freeze({ id: 'openssh-10.2p1-git-v2-memory/1', path: '/usr/bin/ssh', sha256: 'af809334cc71603f0e27a53e2234e15bd3c36503b3af7d367d103d2db2ffc15f' });
export type GitSshAuthentication = { readonly kind: 'identity-file'; readonly path: string }
  | { readonly kind: 'agent-socket'; readonly path: string; readonly publicIdentityPath: string };
export interface GitSshMetadata {
  readonly stage: 'connect' | 'fetch'; readonly sourceProvider: string; readonly url: string;
  readonly destination: { readonly scheme: 'ssh'; readonly host: string; readonly port: number; readonly user: string; readonly repository: string; readonly service: 'git-upload-pack' };
  readonly pin: string; readonly objectFormat: 'sha1' | 'sha256'; readonly classes: readonly ['code-structure'];
  readonly protocol: 'git-v2-ssh'; readonly wire: Uint8Array; readonly digest: string; readonly bytes: number;
  readonly config: Readonly<Record<string, unknown>>; readonly configDigest: string; readonly bindingDigest: string;
}
export interface GitSshRequest {
  /** Host independently selects and validates the source provider, locator and full commit pin. */
  readonly url: string; readonly pin: string; readonly objectFormat: 'sha1' | 'sha256';
  /** Empty canonical owned directory; host protects it and explicit credential paths from races. */
  readonly home: string; readonly knownHostsPath: string; readonly authentication: GitSshAuthentication;
  readonly limits?: Partial<GitMemoryLimits>; readonly sourceProvider: string;
  /** Independently verifies declared destination, classifies/screens full metadata and durably
   * audits safe identities before true. Connect wire is the exact remote command, not SSH ciphertext. */
  readonly admitMetadata: (metadata: GitSshMetadata) => boolean | Promise<boolean>;
  readonly admitIncomingMetadata: GitIncomingAdmission;
}
interface Tools { readonly ssh: string; readonly digest: string; readonly prlimit: string }
const PRODUCTION: Tools = { ssh: GIT_MEMORY_SSH_PROFILE.path, digest: GIT_MEMORY_SSH_PROFILE.sha256, prlimit: '/usr/bin/prlimit' };
class Refusal { constructor(readonly code: GitMemoryFailure) {} }
function refuse(code: GitMemoryFailure): never { throw new Refusal(code); }
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const canonical = (value: unknown): string => encodeCanonicalJson(value, { maxBytes: 65_536, maxNodes: 2048, maxDepth: 10 });
const packet = (text: string): Buffer => { const bytes = Buffer.from(text, 'ascii'); return Buffer.concat([Buffer.from((bytes.length + 4).toString(16).padStart(4, '0')), bytes]); };
const REASONS: Record<GitMemoryFailure, string> = {
  'invalid-request': 'SSH memory transport requires bounded validated inputs and explicit protected authentication.',
  'unsupported-transport': 'This SSH profile refuses this locator form; no transport or protocol fallback is allowed.',
  'helper-profile-unavailable': 'The exact SSH executable or hard limiter is unavailable.',
  'metadata-unavailable': 'Fresh SSH HOME or explicit known-host/authentication metadata is unavailable.',
  'metadata-changed': 'SSH HOME or explicit authentication metadata changed during reception.',
  'spawn-failed': 'The trusted SSH process could not start.', 'process-failed': 'The trusted SSH process failed.',
  'process-deadline': 'SSH memory reception exceeded its wall deadline.',
  'wire-limit': 'SSH protocol or diagnostic bytes exceeded the bound.', 'pack-limit': 'SSH PACK bytes exceeded the bound.',
  'protocol-refused': 'The SSH server did not provide the supported Git protocol v2 profile.',
  'pack-refused': 'The SSH PACK envelope or checksum is invalid.',
  'termination-unconfirmed': 'SSH process-group termination could not be confirmed.',
  'incoming-metadata-refused': 'The incoming SSH protocol metadata was not classified, screened and admitted.',
  'metadata-admission-refused': 'The source provider or exact SSH protocol metadata was not admitted and audited.',
};

/** Single-consumer bounded packet queue. No protocol/progress/diagnostic bodies escape as evidence. */
class Input {
  private chunks: Buffer[] = []; private offset = 0; private size = 0; private ended = false;
  private failure: GitMemoryFailure | null = null; private waiter: (() => void) | null = null;
  push(bytes: Buffer): void { this.chunks.push(bytes); this.size += bytes.length; this.wake(); }
  end(): void { this.ended = true; this.wake(); }
  abort(code: GitMemoryFailure): void { this.failure ??= code; this.wake(); }
  private wake(): void { const waiter = this.waiter; this.waiter = null; waiter?.(); }
  get remaining(): number { return this.size; }
  async exact(size: number): Promise<Buffer> {
    while (this.size < size) { if (this.failure) refuse(this.failure); if (this.ended) refuse('protocol-refused'); await new Promise<void>(resolve => { this.waiter = resolve; }); }
    if (this.failure) refuse(this.failure);
    const bytes = Buffer.allocUnsafe(size); let written = 0;
    while (written < size) {
      const first = this.chunks[0]!, count = Math.min(first.length - this.offset, size - written);
      first.copy(bytes, written, this.offset, this.offset + count); written += count; this.offset += count; this.size -= count;
      if (this.offset === first.length) { this.chunks.shift(); this.offset = 0; }
    }
    return bytes;
  }
  async pkt(): Promise<Buffer | 0 | 1 | 2> {
    const bytes = await this.exact(4);
    if (!bytes.every(byte => (byte >= 48 && byte <= 57) || (byte >= 97 && byte <= 102))) refuse('protocol-refused');
    const size = Number.parseInt(bytes.toString('ascii'), 16);
    if (size <= 2) return size as 0 | 1 | 2;
    if (size < 5 || size > 65_520) refuse('protocol-refused');
    return this.exact(size - 4);
  }
  clear(): void { for (const bytes of this.chunks) bytes.fill(0); this.chunks = []; this.size = 0; }
}
function destination(url: string): GitSshMetadata['destination'] {
  let host: string, user: string, repository: string, port = 22;
  if (url.startsWith('ssh://')) {
    const match = /^ssh:\/\/([A-Za-z0-9][A-Za-z0-9._-]{0,63})@([A-Za-z0-9][A-Za-z0-9.-]{0,252})(?::([0-9]{1,5}))?(\/[A-Za-z0-9_./@+-]{1,4095})$/.exec(url);
    if (!match) refuse('unsupported-transport');
    user = match[1]!; host = match[2]!; port = match[3] === undefined ? 22 : Number(match[3]); repository = match[4]!;
  } else {
    const match = /^([A-Za-z0-9][A-Za-z0-9._-]{0,63})@([A-Za-z0-9][A-Za-z0-9.-]{0,252}):([A-Za-z0-9_./@+-]{1,4096})$/.exec(url);
    if (!match) refuse('unsupported-transport');
    user = match[1]!; host = match[2]!; repository = match[3]!;
  }
  if (port < 1 || port > 65535 || repository.startsWith('-') || repository.endsWith('/') || repository.split('/').some(part => part === '.' || part === '..') || host.includes('..') || host.endsWith('.')) refuse('unsupported-transport');
  return Object.freeze({ scheme: 'ssh', host: host.toLowerCase(), port, user, repository, service: 'git-upload-pack' });
}
interface FileIdentity { readonly path: string; readonly device: number; readonly inode: number; readonly uid: number; readonly mode: number; readonly bytes: number; readonly modified: number }
async function explicitFile(file: string, kind: 'private' | 'public' | 'socket'): Promise<FileIdentity> {
  // OpenSSH expands tokens and splits some path options; accept only literal paths.
  if (typeof file !== 'string' || file.length > 4096 || !/^\/[A-Za-z0-9_./+-]+$/.test(file) || path.resolve(file) !== file || await realpath(file) !== file) refuse('metadata-unavailable');
  const stat = await lstat(file);
  if ((process.getuid && stat.uid !== process.getuid()) || (kind === 'socket' ? !stat.isSocket() : !stat.isFile()) || (stat.mode & 0o022) !== 0 || (kind === 'private' && (stat.mode & 0o077) !== 0) || (kind !== 'socket' && (stat.size <= 0 || stat.size > 1024 * 1024))) refuse('metadata-unavailable');
  return Object.freeze({ path: file, device: stat.dev, inode: stat.ino, uid: stat.uid, mode: stat.mode, bytes: stat.size, modified: stat.mtimeMs });
}
async function filesUnchanged(files: readonly FileIdentity[]): Promise<boolean> {
  try {
    for (const file of files) {
      if (await realpath(file.path) !== file.path) return false;
      const stat = await lstat(file.path);
      const next = { path: file.path, device: stat.dev, inode: stat.ino, uid: stat.uid, mode: stat.mode, bytes: stat.size, modified: stat.mtimeMs };
      if (canonical(next) !== canonical(file)) return false;
    }
    return true;
  } catch { return false; }
}
async function emptyHome(home: string): Promise<void> {
  const stat = await lstat(home);
  if (!stat.isDirectory() || stat.isSymbolicLink() || (process.getuid && stat.uid !== process.getuid()) || await realpath(home) !== home || (await readdir(home)).length !== 0) refuse('invalid-request');
  for (const name of ['tmp', 'xdg']) await mkdir(path.join(home, name), { mode: 0o700 });
}
async function homeUnchanged(home: string): Promise<boolean> {
  try {
    const entries = await readdir(home, { withFileTypes: true });
    return entries.length === 2 && entries.every(entry => entry.isDirectory() && ['tmp', 'xdg'].includes(entry.name))
      && (await readdir(path.join(home, 'tmp'))).length === 0 && (await readdir(path.join(home, 'xdg'))).length === 0;
  } catch { return false; }
}

export const receiveGitPackOverSsh = (request: GitSshRequest): Promise<GitMemoryResult> => receive(request, PRODUCTION);
/** Internal synthetic seam; not an operator option or package export. */
export const gitMemorySshTestPort = (tools: Tools) => (request: GitSshRequest): Promise<GitMemoryResult> => receive(request, tools);
export type GitSshSelectionRequest = GitSelectionRequest & Partial<Pick<GitSshRequest, 'knownHostsPath' | 'authentication'>>;
export const selectGitRevisionOverSsh = (request: GitSshSelectionRequest): Promise<GitSelectionResult> => select(request, PRODUCTION);
export const gitMemorySshSelectionTestPort = (tools: Tools) => (request: GitSshSelectionRequest): Promise<GitSelectionResult> => select(request, tools);
async function select(input: GitSshSelectionRequest, tools: Tools): Promise<GitSelectionResult> {
  const planned = prepareGitSelection(input);
  return receive({ ...input, admitIncomingMetadata: input.admitIncomingMetadata ?? (() => false), home: input.home ?? '', knownHostsPath: input.knownHostsPath ?? '', authentication: input.authentication ?? { kind: 'identity-file', path: '' }, pin: '0'.repeat(40), objectFormat: 'sha1', admitMetadata: () => false }, tools, planned.ok ? planned.value : { failure: planned });
}
function receive(request: GitSshRequest, tools: Tools): Promise<GitMemoryResult>;
function receive(request: GitSshRequest, tools: Tools, selection: GitSelectionOperation | { failure: GitSelectionPlanFailure }): Promise<GitSelectionResult>;
async function receive(request: GitSshRequest, tools: Tools, selection?: GitSelectionOperation | { failure: GitSelectionPlanFailure }): Promise<GitMemoryResult | GitSelectionResult> {
  const started = performance.now();
  request = Object.freeze({ ...request, limits: request.limits === undefined ? undefined : Object.freeze({ ...request.limits }), authentication: Object.freeze({ ...request.authentication }) });
  tools = Object.freeze({ ...tools });
  const overrides = request.limits ?? {};
  const invalidLimits = typeof overrides !== 'object' || Array.isArray(overrides) || Object.entries(overrides).some(([key, value]) => !Object.hasOwn(GIT_MEMORY_LIMITS, key) || !Number.isSafeInteger(value) || value <= 0 || value > GIT_MEMORY_LIMITS[key as keyof GitMemoryLimits]);
  const limits = invalidLimits ? { ...GIT_MEMORY_LIMITS } : { ...GIT_MEMORY_LIMITS, ...overrides };
  let helper: GitMemoryEvidence['helper'] = null, stdoutBytes = 0, stderrBytes = 0, sentBytes = 0, packBytes = 0, advertisementLines = 0;
  let protocolVersion: 2 | null = null, stage = 'validation', responsePackets = 0, responseState = 'not-started', configDigest: string | null = null;
  let exitCode: number | null = null, signal: NodeJS.Signals | null = null, groupTermination: GitMemoryEvidence['groupTermination'] = 'not-started', metadataUnchanged: boolean | null = null;
  const admittedMetadata: { stage: 'connect' | 'fetch' | 'ls-refs'; bindingDigest: string }[] = [];
  const incomingMetadata: GitMemoryEvidence['incomingMetadata'][number][] = [];
  let cumulativeText = '', cumulativeComposition = '';

  const evidence = (): GitMemoryEvidence => ({ profile: GIT_MEMORY_SSH_PROFILE.id, helper, limits, stdoutBytes, stderrBytes, sentBytes, packBytes, protocolVersion, advertisementLines, stage, responsePackets, responseState, configDigest, incomingMetadata: incomingMetadata.map(value => ({ ...value })), admittedMetadata: admittedMetadata.map(value => ({ ...value })), exitCode, signal, groupTermination, metadataUnchanged, durationMilliseconds: performance.now() - started, childRegularFileWriteLimit: 0, childCoreLimit: 0, externalMemorySpillSwapDump: 'Unknown' });
  const failure = (code: GitMemoryFailure): GitMemoryResult => ({ ok: false, code, reason: REASONS[code], evidence: evidence() });
  if (selection && 'failure' in selection) return { ...selection.failure, evidence: evidence() };
  const operation = selection && !('failure' in selection) ? selection : undefined;
  if (operation?.plan.kind === 'full-commit') { const result = selectGitLsRefs(operation.plan, 'sha1', []); return result.ok ? { ok: true, selection: result.value, evidence: evidence() } : { ...result, evidence: evidence() }; }
  if (typeof (operation ? operation.admitIncomingMetadata : request.admitIncomingMetadata) !== 'function') return failure('invalid-request');
  if (operation && typeof operation.admitMetadata !== 'function') return failure('invalid-request');
  if (invalidLimits || process.platform !== 'linux' || typeof request.url !== 'string' || request.url.length > 8192 || !['sha1', 'sha256'].includes(request.objectFormat)
    || typeof request.pin !== 'string' || !(request.objectFormat === 'sha1' ? /^[a-f0-9]{40}$/ : /^[a-f0-9]{64}$/).test(request.pin)
    || typeof request.home !== 'string' || request.home.length > 4096 || !path.isAbsolute(request.home) || path.resolve(request.home) !== request.home
    || typeof request.sourceProvider !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/.test(request.sourceProvider) || typeof request.admitMetadata !== 'function') return failure('invalid-request');
  let selected: GitSshMetadata['destination'];
  try { selected = destination(request.url); } catch { return failure('unsupported-transport'); }
  const auth = request.authentication;
  if (auth.kind !== 'identity-file' && auth.kind !== 'agent-socket') return failure('invalid-request');
  if (Object.keys(auth).sort().join(',') !== (auth.kind === 'identity-file' ? 'kind,path' : 'kind,path,publicIdentityPath')) return failure('invalid-request');
  try {
    await access(tools.prlimit, constants.X_OK); await access(tools.ssh, constants.X_OK);
    const resolvedPath = await realpath(tools.ssh), digest = sha256(await readFile(resolvedPath));
    if (digest !== tools.digest) return failure('helper-profile-unavailable');
    helper = Object.freeze({ path: tools.ssh, resolvedPath, sha256: digest });
  } catch { return failure('helper-profile-unavailable'); }
  let files: FileIdentity[];
  try {
    files = [await explicitFile(request.knownHostsPath, 'public'), await explicitFile(auth.path, auth.kind === 'identity-file' ? 'private' : 'socket')];
    if (auth.kind === 'agent-socket') files.push(await explicitFile(auth.publicIdentityPath, 'public'));
    if (files.some(file => file.path === request.home || file.path.startsWith(request.home + '/'))) refuse('invalid-request');
    await emptyHome(request.home);
  } catch (error) { return failure(error instanceof Refusal ? error.code : 'metadata-unavailable'); }
  const env = Object.freeze({ PATH: '/usr/bin:/bin', HOME: request.home, ZDOTDIR: request.home, XDG_CONFIG_HOME: path.join(request.home, 'xdg'), TMPDIR: path.join(request.home, 'tmp'), LC_ALL: 'C', LANG: 'C', GIT_PROTOCOL: 'version=2', SSH_ASKPASS: '/bin/false', SSH_ASKPASS_REQUIRE: 'never' });
  const options = Object.freeze({ BatchMode: 'yes', StrictHostKeyChecking: 'yes', UserKnownHostsFile: request.knownHostsPath, GlobalKnownHostsFile: '/dev/null', KnownHostsCommand: 'none', VerifyHostKeyDNS: 'no', CheckHostIP: 'no', UpdateHostKeys: 'no', CanonicalizeHostname: 'no', IdentitiesOnly: 'yes', IdentityAgent: auth.kind === 'identity-file' ? 'none' : auth.path, IdentityFile: auth.kind === 'identity-file' ? auth.path : auth.publicIdentityPath, AddKeysToAgent: 'no', CertificateFile: 'none', PKCS11Provider: 'none', PasswordAuthentication: 'no', KbdInteractiveAuthentication: 'no', HostbasedAuthentication: 'no', GSSAPIAuthentication: 'no', PubkeyAuthentication: 'yes', PreferredAuthentications: 'publickey', NumberOfPasswordPrompts: '0', ProxyCommand: 'none', ProxyJump: 'none', ControlMaster: 'no', ControlPath: 'none', ControlPersist: 'no', ClearAllForwardings: 'yes', ForwardAgent: 'no', ForwardX11: 'no', Tunnel: 'no', PermitLocalCommand: 'no', RequestTTY: 'no', EscapeChar: 'none', Compression: 'no', TCPKeepAlive: 'no', ConnectionAttempts: '1', ConnectTimeout: String(Math.max(1, Math.ceil(limits.milliseconds / 1000))), LogLevel: 'ERROR', SendEnv: 'GIT_PROTOCOL' });
  const command = `git-upload-pack '${selected.repository}'`;
  const sshArgs = Object.freeze(['-F', '/dev/null', '-T', ...Object.entries(options).flatMap(([key, value]) => ['-o', `${key}=${value}`]), '-p', String(selected.port), '-l', selected.user, '--', selected.host, command]);
  const args = Object.freeze(['--core=0:0', '--fsize=0:0', '--', tools.ssh, ...sshArgs]);
  const config = Object.freeze({ profile: GIT_MEMORY_SSH_PROFILE.id, helper, limiter: tools.prlimit, args, environment: env, authenticationMetadata: Object.freeze(files.map(file => Object.freeze({ ...file }))) });
  try { configDigest = sha256(canonical(config)); } catch { return failure('invalid-request'); }
  let selectedFormat: 'sha1' | 'sha256' | null = operation ? null : request.objectFormat;
  const admit = async (part: 'connect' | 'fetch' | 'ls-refs', wire: Buffer): Promise<void> => {
    const identity = { stage: part, sourceProvider: request.sourceProvider, url: request.url, destination: selected, pin: request.pin, objectFormat: request.objectFormat, classes: Object.freeze(['code-structure'] as const), protocol: 'git-v2-ssh' as const, digest: sha256(wire), bytes: wire.length, configDigest: configDigest! };
    const selectedIdentity = operation ? { ...identity, pin: undefined, selector: operation.selector, plan: operation.plan, objectFormat: selectedFormat } : identity;
    if (operation) delete (selectedIdentity as { pin?: string }).pin;
    const metadata = Object.freeze({ ...selectedIdentity, wire: Uint8Array.from(wire), config, bindingDigest: sha256(canonical(selectedIdentity)) });
    let timer: ReturnType<typeof setTimeout> | undefined, allowed = false;
    try { allowed = await Promise.race([Promise.resolve().then(() => operation ? operation.admitMetadata(metadata as GitSelectionMetadata) : request.admitMetadata(metadata as GitSshMetadata)), new Promise<boolean>(resolve => { timer = setTimeout(() => resolve(false), Math.max(1, limits.milliseconds - (performance.now() - started))); })]); } catch { /* Never expose diagnostic text. */ } finally { clearTimeout(timer); }
    if (allowed !== true || sha256(wire) !== identity.digest) refuse('metadata-admission-refused');
    admittedMetadata.push({ stage: part, bindingDigest: metadata.bindingDigest });
  };
  const metadataBuffer = () => new GitMetadataUnitBuffer(limits.advertisementBytes, limits.advertisementLines + 4);
  const appendMetadata = (buffer: GitMetadataUnitBuffer, value: Uint8Array | 0 | 1 | 2): void => { if (!buffer.append(value)) refuse('wire-limit'); };
  const incomingPort = operation ? operation.admitIncomingMetadata : request.admitIncomingMetadata;
  if (typeof incomingPort !== 'function') refuse('invalid-request');
  const admitIncoming = async (unit: GitIncomingUnit, wire: Buffer) => {
    if (incomingMetadata.length >= GIT_INCOMING_METADATA_LIMITS.units) refuse('wire-limit');
    const decoded = decodeGitIncomingUnit(unit, 'git-v2-ssh', selectedFormat, wire);
    if (!decoded) refuse('protocol-refused');
    if (Buffer.byteLength(cumulativeText) + Buffer.byteLength(decoded.payloadText) > GIT_INCOMING_METADATA_LIMITS.cumulativeBytes
      || Buffer.byteLength(cumulativeComposition) + Buffer.byteLength(decoded.composition) > GIT_INCOMING_METADATA_LIMITS.cumulativeBytes) refuse('wire-limit');
    const nextText = cumulativeText + decoded.payloadText, nextComposition = cumulativeComposition + decoded.composition;
    const context = { stage: unit === 'advertisement' ? 'advertisement' as const : unit === 'ls-refs' ? 'ls-refs' as const : 'fetch-metadata' as const,
      unit, operation: operation ? 'selection' as const : 'receive' as const, protocol: 'git-v2-ssh' as const,
      sourceProvider: request.sourceProvider, url: request.url, destination: selected, pin: operation ? null : request.pin,
      selector: operation?.selector ?? null, plan: operation?.plan ?? null, objectFormat: selectedFormat,
      classes: Object.freeze(['code-structure'] as const), profile: GIT_MEMORY_SSH_PROFILE.id, configDigest: configDigest! };
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
  stage = 'connect-admission';
  try { await admit('connect', Buffer.from(command, 'ascii')); } catch { metadataUnchanged = await homeUnchanged(request.home); return failure('metadata-admission-refused'); }
  if (!(await homeUnchanged(request.home)) || !(await filesUnchanged(files))) return failure('metadata-changed');
  const input = new Input(), parts: Buffer[] = [];
  let selectedRevision: ReturnType<typeof selectGitLsRefs> | null = null;
  let refusal: GitMemoryFailure | null = null, pack: Buffer | null = null;
  const child = spawn(tools.prlimit, args, { cwd: request.home, env, detached: true, stdio: ['pipe', 'pipe', 'pipe'] });
  const exists = (): boolean => { if (child.pid === undefined) return false; try { process.kill(-child.pid, 0); return true; } catch (error) { return (error as NodeJS.ErrnoException).code !== 'ESRCH'; } };
  const kill = (value: NodeJS.Signals): void => { if (child.pid !== undefined) { try { process.kill(-child.pid, value); } catch { /* Verify group absence below. */ } } };
  let cleanupPromise: Promise<void> | null = null;
  const cleanup = (): Promise<void> => cleanupPromise ??= (async () => { kill('SIGTERM'); const began = performance.now(); while (exists() && performance.now() - began < 150) await sleep(10); kill('SIGKILL'); while (exists() && performance.now() - began < 1250) await sleep(10); groupTermination = exists() ? 'unconfirmed' : child.pid === undefined ? 'not-started' : 'confirmed'; })();
  const stop = (code: GitMemoryFailure): void => { refusal ??= code; input.abort(refusal); void cleanup(); };
  let finish: () => void = () => {}; const finished = new Promise<void>(resolve => { finish = resolve; });
  child.once('error', () => { stop('spawn-failed'); input.end(); finish(); });
  child.once('exit', (code, by) => { exitCode = code; signal = by; }); child.once('close', () => { input.end(); finish(); });
  child.stdin.on('error', () => stop('process-failed')); child.stdout.on('error', () => stop('process-failed')); child.stderr.on('error', () => stop('process-failed'));
  child.stdout.on('data', (bytes: Buffer) => { stdoutBytes += bytes.length; if (stdoutBytes + stderrBytes > limits.wireBytes) stop('wire-limit'); else if (refusal === null) input.push(bytes); });
  child.stderr.on('data', (bytes: Buffer) => { stderrBytes += bytes.length; if (stderrBytes > limits.stderrBytes || stdoutBytes + stderrBytes > limits.wireBytes) stop('wire-limit'); });
  const wall = setTimeout(() => stop('process-deadline'), Math.max(1, limits.milliseconds - (performance.now() - started)));
  try {
    stage = 'advertisement'; const advertisementMetadata = metadataBuffer(); let advertisementBytes = 0, sawFetch = false, sawFormat = false, sawLsRefs = false; const seen = new Set<string>();
    while (true) {
      const pkt = await input.pkt(); appendMetadata(advertisementMetadata, pkt); if (pkt === 0) break; if (typeof pkt === 'number') refuse('protocol-refused');
      advertisementLines++; advertisementBytes += pkt.length + 4;
      if (advertisementLines > limits.advertisementLines || advertisementBytes > limits.advertisementBytes) refuse('wire-limit');
      if (pkt.length > limits.lineBytes) refuse('protocol-refused');
      const value = pkt.toString('latin1'); if (!/^[\x20-\x7e]+\n$/.test(value)) refuse('protocol-refused');
      if (advertisementLines === 1) { if (value !== 'version 2\n') refuse('protocol-refused'); continue; }
      const key = value.split('=')[0]!; if (seen.has(key)) refuse('protocol-refused'); seen.add(key);
      if (key === 'agent') { if (!/^agent=[A-Za-z0-9./_+-]{1,200}\n$/.test(value)) refuse('protocol-refused'); }
      else if (key === 'ls-refs') { if (!/^ls-refs=(?:unborn)?\n$/.test(value)) refuse('protocol-refused'); sawLsRefs = true; }
      else if (key === 'fetch') { const features = value.slice(6, -1).split(' '); if (!features.includes('shallow') || new Set(features).size !== features.length || features.some(value => !['shallow', 'wait-for-done'].includes(value))) refuse('protocol-refused'); sawFetch = true; }
      else if (value === 'server-option\n') { /* No option is sent. */ }
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
      const wire = gitLsRefsWire(operation.plan, selectedFormat); stage = 'ls-refs-admission'; await admit('ls-refs', wire); if (refusal !== null) refuse(refusal);
      if (!(await homeUnchanged(request.home)) || !(await filesUnchanged(files))) refuse('metadata-changed');
      if (wire.length > 16384) refuse('protocol-refused'); sentBytes = wire.length; child.stdin.write(wire);
      stage = 'ls-refs-response'; const referenceMetadata = metadataBuffer(), rows: Buffer[] = []; let bytes = 0;
      while (true) {
        const pkt = await input.pkt(); responsePackets++; appendMetadata(referenceMetadata, pkt); if (pkt === 0) break; if (typeof pkt === 'number') refuse('protocol-refused');
        bytes += pkt.length + 4; if (bytes > limits.advertisementBytes || rows.length >= limits.advertisementLines) refuse('wire-limit'); rows.push(pkt);
      }
      stage = 'incoming-ls-refs'; await admitIncoming('ls-refs', referenceMetadata.wire());
      selectedRevision = selectGitLsRefs(operation.plan, selectedFormat, rows);
    } else {
    const wire = Buffer.concat([packet('command=fetch\n'), packet(`object-format=${request.objectFormat}\n`), Buffer.from('0001'), packet('no-progress\n'), packet(`want ${request.pin}\n`), packet('deepen 1\n'), packet('done\n'), Buffer.from('0000')]);
    stage = 'fetch-admission'; await admit('fetch', wire); if (refusal !== null) refuse(refusal);
    if (!(await homeUnchanged(request.home)) || !(await filesUnchanged(files))) refuse('metadata-changed');
    if (wire.length > 16384) refuse('protocol-refused'); sentBytes = wire.length; child.stdin.write(wire);
    stage = 'fetch-response'; const fetchMetadata = metadataBuffer(); let phase: 'shallow-header' | 'shallow' | 'pack-header' | 'pack' = 'shallow-header', shallow = false;
    while (true) {
      const pkt = await input.pkt(); if (typeof pkt === 'number' || phase !== 'pack') appendMetadata(fetchMetadata, pkt); responsePackets++; responseState = phase + ':' + (typeof pkt === 'number' ? pkt : 'data-' + pkt.length);
      if (pkt === 0) { if (phase !== 'pack') refuse('protocol-refused'); break; }
      if (pkt === 2) refuse('protocol-refused');
      if (pkt === 1) { if (phase !== 'shallow' || !shallow) refuse('protocol-refused'); phase = 'pack-header'; continue; }
      if (phase === 'shallow-header' && pkt.equals(Buffer.from('shallow-info\n'))) phase = 'shallow';
      else if (phase === 'shallow' && !shallow && (pkt.equals(Buffer.from(`shallow ${request.pin}`)) || pkt.equals(Buffer.from(`shallow ${request.pin}\n`)))) shallow = true;
      else if (phase === 'pack-header' && pkt.equals(Buffer.from('packfile\n'))) { stage = 'incoming-fetch-header'; await admitIncoming('fetch-header', fetchMetadata.wire()); phase = 'pack'; stage = 'fetch-response'; }
      else if (phase === 'pack') { if (pkt[0] === 1) { packBytes += pkt.length - 1; if (packBytes > limits.packBytes) refuse('pack-limit'); parts.push(pkt.subarray(1)); } else refuse('protocol-refused'); }
      else refuse('protocol-refused');
    }
    stage = 'incoming-fetch-end'; await admitIncoming('fetch-end', fetchMetadata.wire());
    }
    stage = 'process-close'; child.stdin.end();
    await Promise.race([finished, new Promise<void>(resolve => { const poll = setInterval(() => { if (refusal !== null) { clearInterval(poll); resolve(); } }, 10); finished.then(() => clearInterval(poll)); })]);
    if (refusal !== null) refuse(refusal); if (input.remaining !== 0 || exitCode !== 0 || signal !== null) refuse('process-failed');
    if (!operation) {
    stage = 'pack-check'; pack = Buffer.concat(parts, packBytes); const trailer = request.objectFormat === 'sha1' ? 20 : 32;
    if (pack.length < 12 + trailer || !pack.subarray(0, 4).equals(Buffer.from('PACK')) || ![2, 3].includes(pack.readUInt32BE(4)) || !createHash(request.objectFormat).update(pack.subarray(0, -trailer)).digest().equals(pack.subarray(-trailer))) refuse('pack-refused');
    }
  } catch (error) { stop(error instanceof Refusal ? error.code : 'protocol-refused'); }
  finally { await cleanup(); clearTimeout(wall); child.stdin.destroy(); child.stdout.destroy(); child.stderr.destroy(); input.clear(); for (const bytes of parts) bytes.fill(0); metadataUnchanged = await homeUnchanged(request.home) && await filesUnchanged(files); }
  if (evidence().groupTermination === 'unconfirmed') { pack?.fill(0); return failure('termination-unconfirmed'); }
  if (!metadataUnchanged) { pack?.fill(0); return failure('metadata-changed'); }
  if (operation && refusal === null && selectedRevision !== null) return selectedRevision.ok ? { ok: true, selection: selectedRevision.value, evidence: evidence() } : { ...selectedRevision, evidence: evidence() };
  if (refusal !== null || pack === null) { pack?.fill(0); return failure(refusal ?? 'protocol-refused'); }
  return { ok: true, pack, shallow: [request.pin], evidence: evidence() };
}
