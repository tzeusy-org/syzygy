import { randomUUID } from 'node:crypto';
import { lstat, mkdir, mkdtemp, readFile, realpath, rm } from 'node:fs/promises';
import path from 'node:path';
import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { isRecord, sha256 } from '@syzygy/support';
import { dossierLocator } from './launch-identity.js';
import { urlSourceTransportIdentity, type UrlSourceDestination } from './url-run-record.js';
import { buildDossierScreen, type DossierScreen } from './screen.js';
import { planUrlRevision, selectUrlRevision, type UrlRevisionPlan, type UrlRevisionSelection } from './url-revision.js';
import { GIT_MEMORY_HELPER_PROFILE, GIT_MEMORY_LIMITS, receiveGitPackInMemory, selectGitRevisionOverHttps, type GitMemoryLimits, type GitMemoryMetadata, type GitMemoryResult } from './git-memory-transport.js';
import { GIT_MEMORY_SSH_PROFILE, receiveGitPackOverSsh, selectGitRevisionOverSsh, type GitSshAuthentication, type GitSshMetadata } from './git-memory-ssh.js';
import { decodeGitIncomingUnit, gitLsRefsWire, selectGitLsRefs, type GitIncomingMetadata, type GitSelectionMetadata, type GitSelectionResult } from './git-memory-selection.js';
import { runGitMemoryWorker, type GitMemoryWorkerAudit, type GitMemoryWorkerBinding, type GitMemoryWorkerLimits, type GitMemoryWorkerProgram, type GitMemoryWorkerResult, type GitMemoryWorkerSummary } from './git-memory-worker.js';
import { resolveCloneHead } from './clone-head.js';

const canonical = (value: unknown): string => encodeCanonicalJson(value, { maxBytes: 2_097_152, maxNodes: 32_768, maxDepth: 20 });
const hash = (value: unknown): string => sha256(canonical(value));
const same = (a: unknown, b: unknown): boolean => canonical(a) === canonical(b);
const wireSnapshot = (value: unknown): string => {
  if (!isRecord(value)) throw new Error();
  return hash({ ...value, ...(value['wire'] instanceof Uint8Array ? { wire: Buffer.from(value['wire']).toString('base64') } : {}),
    ...(value['rawWire'] instanceof Uint8Array ? { rawWire: Buffer.from(value['rawWire']).toString('base64') } : {}) });
};
const hex = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
const packet = (text: string): Buffer => { const bytes = Buffer.from(text); return Buffer.concat([Buffer.from((bytes.length + 4).toString(16).padStart(4, '0')), bytes]); };
const fetchWire = (pin: string, format: string): Buffer => Buffer.concat([packet('command=fetch\n'), packet(`object-format=${format}\n`), Buffer.from('0001'), packet('no-progress\n'), packet(`want ${pin}\n`), packet('deepen 1\n'), packet('done\n'), Buffer.from('0000')]);

export interface UrlMemoryContext {
  /** A provisional acquisition identity, never evidence that a dossier run exists. */
  readonly provisionalRun: string; readonly acquisition: string;
  readonly sourceProvider: string; readonly destination: UrlSourceDestination;
  readonly locatorSha256: string; readonly selectorSha256: string | null;
  readonly selectedCommit: string | null; readonly sourceBinding: string;
  readonly policySha256: string; readonly originPolicySha256: string;
}
export type UrlMemoryStage = 'declared-attempt' | 'selection' | 'receive' | 'whole-closure' | 'supplied-clone' | 'complete';
export interface UrlMemoryAudit {
  readonly stage: UrlMemoryStage; readonly direction: 'local' | 'presend' | 'ingest';
  readonly state: 'attempted' | 'admitted' | 'refused' | 'Unknown';
  readonly context: UrlMemoryContext; readonly metadataSha256: string | null;
  /** Closed, protected worker evidence; never project exclusion hashes into a role or public failure. */
  readonly worker?: GitMemoryWorkerAudit;
}
export interface UrlMemoryPolicy {
  readonly bytes: Uint8Array; readonly sha256: string;
  readonly originBytes: Uint8Array; readonly originSha256: string;
  readonly visibility: 'private' | 'public'; readonly repository?: string;
}
export interface UrlMemoryAcquisitionRequest {
  readonly locator: string; readonly selector?: string; readonly scratchParent: string;
  readonly suppliedClone?: string;
  readonly ssh?: { readonly knownHostsPath: string; readonly authentication: GitSshAuthentication };
  readonly policy: UrlMemoryPolicy; readonly program: GitMemoryWorkerProgram;
  readonly limits?: Partial<GitMemoryLimits>; readonly workerLimits?: Partial<GitMemoryWorkerLimits>;
  readonly signal?: AbortSignal;
  readonly host: {
    /** Trusted host verifies current adopted policy bytes/digests and independent source context. */
    readonly current: (context: UrlMemoryContext) => boolean | Promise<boolean>;
    /** Completion acknowledges a durable protected append, outside private views. */
    readonly audit: (event: UrlMemoryAudit) => void | Promise<void>;
  };
}
export interface UrlMemoryHistory {
  readonly stage: UrlMemoryStage; readonly state: 'attempted' | 'admitted' | 'refused' | 'Unknown';
  readonly direction: 'local' | 'presend' | 'ingest'; readonly metadataSha256: string | null;
}
export interface UrlMemoryMetadataProof {
  readonly operation: 'selection' | 'receive'; readonly configSha256: string;
  readonly commandSha256: string; readonly environmentSha256: string; readonly executableSha256: string;
  readonly protocolSha256: string;
}
export type UrlMemoryAcquisitionResult = {
  readonly ok: true; readonly originalLocator: string; readonly normalizedLocator: string;
  readonly context: UrlMemoryContext; readonly selection: UrlRevisionSelection;
  readonly clone: string; readonly workspace: string | null; readonly supplied: boolean;
  readonly metadata: readonly UrlMemoryMetadataProof[]; readonly history: readonly UrlMemoryHistory[];
  readonly worker: GitMemoryWorkerSummary | null;
} | {
  readonly ok: false; readonly code: 'invalid-input' | 'policy-unavailable' | 'binding-stale' | 'audit-failed' | 'metadata-refused' | 'selection-refused' | 'receive-refused' | 'worker-refused' | 'clone-refused' | 'operation-failed';
  readonly history: readonly UrlMemoryHistory[];
  readonly cleanup: 'not-needed' | 'removed' | 'Unknown'; readonly retainedWorkspace?: string;
};
type Outgoing = GitSelectionMetadata | GitMemoryMetadata | GitSshMetadata;
interface Prepared {
  readonly config: Readonly<Record<string, unknown>>; readonly destination: Readonly<Record<string, string | number>>;
  readonly protocol: 'git-v2-stateless' | 'git-v2-ssh'; readonly profile: string;
  readonly connect: Buffer;
}
interface AcquisitionPorts {
  readonly selectHttps: typeof selectGitRevisionOverHttps; readonly selectSsh: typeof selectGitRevisionOverSsh;
  readonly receiveHttps: typeof receiveGitPackInMemory; readonly receiveSsh: typeof receiveGitPackOverSsh;
  readonly worker: typeof runGitMemoryWorker;
}
const NATIVE: AcquisitionPorts = Object.freeze({ selectHttps: selectGitRevisionOverHttps, selectSsh: selectGitRevisionOverSsh,
  receiveHttps: receiveGitPackInMemory, receiveSsh: receiveGitPackOverSsh, worker: runGitMemoryWorker });

/** Independent expected profile, never learned from the first metadata envelope. */
async function prepareProfile(url: string, home: string, ssh: UrlMemoryAcquisitionRequest['ssh'], milliseconds: number): Promise<Prepared> {
  const https = /^https:\/\//iu.test(url), profile = https ? GIT_MEMORY_HELPER_PROFILE : GIT_MEMORY_SSH_PROFILE;
  const resolvedPath = await realpath(profile.path);
  if (sha256(await readFile(resolvedPath)) !== profile.sha256) throw new Error();
  const helper = { path: profile.path, resolvedPath, sha256: profile.sha256 };
  if (https) {
    const destinationUrl = new URL(url), settings = {
      'protocol.version': '2', 'credential.helper': '', 'credential.interactive': 'false', 'core.askPass': '/bin/false', 'core.hooksPath': '/dev/null',
      'http.sslVerify': 'true', 'http.followRedirects': 'false', 'http.proxy': '', 'http.extraHeader': '', 'http.cookieFile': '', 'http.saveCookies': 'false',
      'protocol.allow': 'never', 'protocol.https.allow': 'always', 'protocol.http.allow': 'never', 'protocol.file.allow': 'never', 'gc.auto': '0', 'maintenance.auto': 'false', 'fetch.recurseSubmodules': 'false', 'submodule.recurse': 'false',
    };
    const environment: Record<string, string> = { PATH: '/usr/bin:/bin', HOME: home, XDG_CONFIG_HOME: path.join(home, 'xdg'), TMPDIR: path.join(home, 'tmp'), LANG: 'C', LC_ALL: 'C', GIT_DIR: path.join(home, 'metadata.git'), GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_SYSTEM: '/dev/null', GIT_CONFIG_GLOBAL: '/dev/null', GIT_TERMINAL_PROMPT: '0', GIT_ASKPASS: '/bin/false', SSH_ASKPASS: '/bin/false', GIT_PROTOCOL: 'version=2', GIT_ATTR_NOSYSTEM: '1', GIT_NO_REPLACE_OBJECTS: '1', GIT_NO_LAZY_FETCH: '1', GIT_OPTIONAL_LOCKS: '0', GIT_CONFIG_COUNT: String(Object.keys(settings).length) };
    Object.entries(settings).forEach(([key, value], index) => { environment[`GIT_CONFIG_KEY_${index}`] = key; environment[`GIT_CONFIG_VALUE_${index}`] = value; });
    return { profile: profile.id, protocol: 'git-v2-stateless', destination: { scheme: 'https', host: destinationUrl.hostname.toLowerCase(), port: Number(destinationUrl.port || 443), service: 'git-upload-pack' },
      connect: Buffer.from('capabilities\nstateless-connect git-upload-pack\n'), config: { profile: profile.id, helper, limiter: '/usr/bin/prlimit', args: ['--core=0:0', '--fsize=0:0', '--', profile.path, 'syzygy-memory', url], environment } };
  }
  if (!ssh) throw new Error();
  let user: string, host: string, port: number, repository: string;
  if (url.startsWith('ssh://')) { const parsed = new URL(url); user = parsed.username; host = parsed.hostname; port = Number(parsed.port || 22); repository = parsed.pathname; }
  else { const parsed = /^([^@/:]+)@([^/:]+):(.+)$/u.exec(url); if (!parsed) throw new Error(); user = parsed[1]!; host = parsed[2]!; repository = parsed[3]!; port = 22; }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u.test(user) || !/^[A-Za-z0-9][A-Za-z0-9.-]{0,252}$/u.test(host)
    || host.includes('..') || host.endsWith('.') || !/^[A-Za-z0-9_./@+-]+$/u.test(repository) || repository.startsWith('-') || repository.endsWith('/') || repository.split('/').some(p => p === '.' || p === '..')) throw new Error();
  host = host.toLowerCase();
  const auth = ssh.authentication, filePaths = [ssh.knownHostsPath, auth.path, ...(auth.kind === 'agent-socket' ? [auth.publicIdentityPath] : [])];
  const authenticationMetadata = [];
  for (const [index, file] of filePaths.entries()) {
    if (typeof file !== 'string' || file.length > 4096 || !/^\/[A-Za-z0-9_./+-]+$/u.test(file)
      || !path.isAbsolute(file) || path.resolve(file) !== file || await realpath(file) !== file || file.startsWith(home + '/')) throw new Error();
    const stat = await lstat(file);
    const socket = index === 1 && auth.kind === 'agent-socket', privateKey = index === 1 && auth.kind === 'identity-file';
    if (stat.uid !== process.getuid?.() || (socket ? !stat.isSocket() : !stat.isFile()) || (stat.mode & 0o022) !== 0
      || (privateKey && (stat.mode & 0o077) !== 0) || (!socket && (stat.size === 0 || stat.size > 1_048_576))) throw new Error();
    authenticationMetadata.push({ path: file, device: stat.dev, inode: stat.ino, uid: stat.uid, mode: stat.mode, bytes: stat.size, modified: stat.mtimeMs });
  }
  const environment = { PATH: '/usr/bin:/bin', HOME: home, ZDOTDIR: home, XDG_CONFIG_HOME: path.join(home, 'xdg'), TMPDIR: path.join(home, 'tmp'), LC_ALL: 'C', LANG: 'C', GIT_PROTOCOL: 'version=2', SSH_ASKPASS: '/bin/false', SSH_ASKPASS_REQUIRE: 'never' };
  const options = { BatchMode: 'yes', StrictHostKeyChecking: 'yes', UserKnownHostsFile: ssh.knownHostsPath, GlobalKnownHostsFile: '/dev/null', KnownHostsCommand: 'none', VerifyHostKeyDNS: 'no', CheckHostIP: 'no', UpdateHostKeys: 'no', CanonicalizeHostname: 'no', IdentitiesOnly: 'yes', IdentityAgent: auth.kind === 'identity-file' ? 'none' : auth.path, IdentityFile: auth.kind === 'identity-file' ? auth.path : auth.publicIdentityPath, AddKeysToAgent: 'no', CertificateFile: 'none', PKCS11Provider: 'none', PasswordAuthentication: 'no', KbdInteractiveAuthentication: 'no', HostbasedAuthentication: 'no', GSSAPIAuthentication: 'no', PubkeyAuthentication: 'yes', PreferredAuthentications: 'publickey', NumberOfPasswordPrompts: '0', ProxyCommand: 'none', ProxyJump: 'none', ControlMaster: 'no', ControlPath: 'none', ControlPersist: 'no', ClearAllForwardings: 'yes', ForwardAgent: 'no', ForwardX11: 'no', Tunnel: 'no', PermitLocalCommand: 'no', RequestTTY: 'no', EscapeChar: 'none', Compression: 'no', TCPKeepAlive: 'no', ConnectionAttempts: '1', ConnectTimeout: String(Math.max(1, Math.ceil(milliseconds / 1000))), LogLevel: 'ERROR', SendEnv: 'GIT_PROTOCOL' };
  const command = `git-upload-pack '${repository}'`;
  return { profile: profile.id, protocol: 'git-v2-ssh', destination: { scheme: 'ssh', host: host.toLowerCase(), port, user, repository, service: 'git-upload-pack' }, connect: Buffer.from(command),
    config: { profile: profile.id, helper, limiter: '/usr/bin/prlimit', args: ['--core=0:0', '--fsize=0:0', '--', profile.path, '-F', '/dev/null', '-T', ...Object.entries(options).flatMap(([key, value]) => ['-o', `${key}=${value}`]), '-p', String(port), '-l', user, '--', host, command], environment, authenticationMetadata } };
}

function fields(value: unknown, result: string[] = []): string[] {
  if (typeof value === 'string') result.push(value);
  else if (typeof value === 'number' || typeof value === 'boolean') result.push(String(value));
  else if (Array.isArray(value)) for (const item of value) fields(item, result);
  else if (isRecord(value)) for (const [key, item] of Object.entries(value)) { result.push(key); fields(item, result); }
  return result;
}
function metadataSafe(screen: DossierScreen, values: readonly string[], encoded: unknown = values): boolean {
  // Structural metadata has no source-file extension exemption. Screen every
  // decoded field and complete composition, then its encoded known envelope.
  return values.every(value => Buffer.from(value).toString('utf8') === value && screen.screenBody(value) === undefined)
    && screen.screenBody(values.join('')) === undefined && screen.screenBody(canonical(encoded)) === undefined;
}

/** Closed native composition. No conventional fetch/checkout fallback exists. */
export const acquireUrlSourceInMemory = (request: UrlMemoryAcquisitionRequest): Promise<UrlMemoryAcquisitionResult> => acquire(request, NATIVE);
/** Own-fixture dependency injection; production callers use acquireUrlSourceInMemory. */
export const urlMemoryAcquisitionTestPort = (ports: AcquisitionPorts) => (request: UrlMemoryAcquisitionRequest): Promise<UrlMemoryAcquisitionResult> => acquire(request, ports);
/** Own-fixture envelope construction only; independent profile assertions remain
 * in the host gate and installed binary hashes are still checked here. */
export const urlMemoryAcquisitionFixtureProfile = prepareProfile;

// Incoming raw metadata validation is completed against the transport's bounded
// protocol decoder below; PACK bytes are never accepted by this metadata path.

function validateIncoming(value: unknown, expected: {
  readonly kind: 'selection' | 'receive'; readonly prepared: Prepared; readonly configDigest: string;
  readonly context: UrlMemoryContext; readonly originalLocator: string; readonly selector: string | null; readonly plan: UrlRevisionPlan;
  readonly selection: UrlRevisionSelection | null; readonly outgoingCount: number; readonly incomingCount: number;
  readonly incomingPrevious: string | null; readonly incomingText: string; readonly incomingComposition: string;
}): GitIncomingMetadata | null {
  try {
    if (!isRecord(value) || !(value['rawWire'] instanceof Uint8Array)) return null;
    const unit = expected.incomingCount === 0 ? 'advertisement' : expected.kind === 'selection' ? 'ls-refs' : expected.incomingCount === 1 ? 'fetch-header' : 'fetch-end';
    if (expected.incomingCount >= (expected.kind === 'selection' ? 2 : 3)
      || expected.outgoingCount !== (expected.incomingCount === 0 ? 1 : 2)) return null;
    const format = unit === 'advertisement' && expected.kind === 'selection' ? null : value['objectFormat'];
    if (format !== null && format !== 'sha1' && format !== 'sha256') return null;
    if (expected.kind === 'receive' && format !== expected.selection?.objectFormat) return null;
    const decoded = decodeGitIncomingUnit(unit, expected.prepared.protocol, format, value['rawWire']);
    if (!decoded) return null;
    if (decoded.parsed.kind === 'fetch-header' && decoded.parsed.shallowIdentifier !== expected.selection?.identifier) return null;
    if (decoded.parsed.kind === 'fetch-end' && decoded.parsed.header.shallowIdentifier !== expected.selection?.identifier) return null;
    const cumulativeText = expected.incomingText + decoded.payloadText, cumulativeComposition = expected.incomingComposition + decoded.composition;
    if (Buffer.byteLength(cumulativeText) > 196_608 || Buffer.byteLength(cumulativeComposition) > 196_608) return null;
    const identity = { stage: unit === 'advertisement' ? 'advertisement' : unit === 'ls-refs' ? 'ls-refs' : 'fetch-metadata', unit,
      operation: expected.kind, protocol: expected.prepared.protocol, sourceProvider: expected.context.sourceProvider, url: expected.originalLocator,
      destination: expected.prepared.destination, pin: expected.kind === 'receive' ? expected.selection!.identifier : null,
      selector: expected.kind === 'selection' ? expected.selector : null, plan: expected.kind === 'selection' ? expected.plan : null,
      objectFormat: format, classes: ['code-structure'] as const, profile: expected.prepared.profile, configDigest: expected.configDigest,
      digest: sha256(value['rawWire']), bytes: value['rawWire'].byteLength,
      decodedDigest: hash(decoded), previousBindingDigest: expected.incomingPrevious,
      cumulativeTextDigest: sha256(cumulativeText), cumulativeCompositionDigest: sha256(cumulativeComposition) };
    const { decodedDigest: _decoded, cumulativeTextDigest: _text, cumulativeCompositionDigest: _composition, ...envelope } = identity;
    const complete = { ...envelope, ...decoded, rawWire: value['rawWire'], cumulativeText, cumulativeComposition, bindingDigest: hash(identity) };
    if (wireSnapshot(value) !== wireSnapshot(complete)) return null;
    return complete as GitIncomingMetadata;
  } catch { return null; }
}

async function acquire(given: UrlMemoryAcquisitionRequest, ports: AcquisitionPorts): Promise<UrlMemoryAcquisitionResult> {
  const history: UrlMemoryHistory[] = [], metadata: UrlMemoryMetadataProof[] = [];
  let workspace: string | null = null, terminationUnknown = false;
  let activeStage: UrlMemoryStage = 'declared-attempt';
  let finalFailure: (() => Promise<void>) | null = null;
  let code: Extract<UrlMemoryAcquisitionResult, { ok: false }>['code'] = 'invalid-input';
  let request: UrlMemoryAcquisitionRequest, screen: DossierScreen, context: UrlMemoryContext;
  let limits: GitMemoryLimits, plan: UrlRevisionPlan, originalLocator: string, normalizedLocator: string;
  const fail = async (): Promise<UrlMemoryAcquisitionResult> => {
    if (finalFailure) { const record = finalFailure; finalFailure = null; await record(); }
    let cleanup: 'not-needed' | 'removed' | 'Unknown' = workspace === null ? 'not-needed' : 'Unknown';
    if (workspace && !terminationUnknown) try { await rm(workspace, { recursive: true, force: true }); cleanup = 'removed'; } catch { /* Preserve unique residual. */ }
    return { ok: false, code, history: history.map(item => ({ ...item })), cleanup,
      ...(cleanup === 'Unknown' && workspace ? { retainedWorkspace: workspace } : {}) };
  };
  try {
    if (!isRecord(given) || !isRecord(given.policy) || !isRecord(given.host) || typeof given.host.current !== 'function' || typeof given.host.audit !== 'function'
      || !(given.policy.bytes instanceof Uint8Array) || !(given.policy.originBytes instanceof Uint8Array)
      || given.policy.bytes.byteLength === 0 || given.policy.bytes.byteLength > 2_097_152 || given.policy.originBytes.byteLength === 0 || given.policy.originBytes.byteLength > 2_097_152
      || !hex(given.policy.sha256) || !hex(given.policy.originSha256)
      || sha256(given.policy.bytes) !== given.policy.sha256 || sha256(given.policy.originBytes) !== given.policy.originSha256
      || !['private', 'public'].includes(given.policy.visibility) || !isRecord(given.program)
      || (given.signal !== undefined && !(given.signal instanceof AbortSignal))) return fail();
    request = Object.freeze({ ...given, host: Object.freeze({ ...given.host }), program: Object.freeze({ ...given.program }),
      policy: Object.freeze({ ...given.policy, bytes: Uint8Array.from(given.policy.bytes), originBytes: Uint8Array.from(given.policy.originBytes) }),
      ...(given.ssh ? { ssh: Object.freeze({ ...given.ssh, authentication: Object.freeze({ ...given.ssh.authentication }) }) } : {}),
      limits: Object.freeze({ ...given.limits }), workerLimits: Object.freeze({ ...given.workerLimits }) });
    if (Object.entries(request.limits!).some(([key, value]) => !Object.hasOwn(GIT_MEMORY_LIMITS, key) || !Number.isSafeInteger(value) || value! < 1 || value! > GIT_MEMORY_LIMITS[key as keyof GitMemoryLimits])) return fail();
    limits = Object.freeze({ ...GIT_MEMORY_LIMITS, ...request.limits });
    const identity = urlSourceTransportIdentity(request.locator), normalized = dossierLocator(request.locator), planned = planUrlRevision(request.selector);
    if (!identity.ok || !normalized.ok || !planned.ok || !/^(?:https:\/\/|ssh:\/\/|[A-Za-z0-9][A-Za-z0-9._-]{0,63}@)/iu.test(request.locator)) return fail();
    originalLocator = identity.originalLocator; normalizedLocator = normalized.url; plan = planned.value;
    const acquisition = `acq-${randomUUID().replaceAll('-', '')}`;
    const makeContext = (selectedCommit: string | null): UrlMemoryContext => Object.freeze({ provisionalRun: `provisional-${acquisition}`, acquisition,
      sourceProvider: identity.providerId, destination: Object.freeze({ ...identity.destination }), locatorSha256: sha256(originalLocator), selectorSha256: request.selector === undefined ? null : sha256(request.selector),
      selectedCommit, sourceBinding: hash({ destination: identity.destination, provider: identity.providerId, selectedCommit, policySha256: request.policy.sha256, originPolicySha256: request.policy.originSha256 }),
      policySha256: request.policy.sha256, originPolicySha256: request.policy.originSha256 });
    context = makeContext(null);
    const bounded = async <T>(operation: Promise<T>): Promise<T> => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try { return await Promise.race([operation, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error()), Math.min(limits.milliseconds, 10_000)); })]); }
      finally { clearTimeout(timer); }
    };
    const current = async (): Promise<boolean> => {
      if (request.signal?.aborted) return false;
      try { return await bounded(Promise.resolve().then(() => request.host.current(context))) === true; } catch { return false; }
    };
    const acknowledge = async (stage: UrlMemoryStage, direction: UrlMemoryAudit['direction'], state: UrlMemoryAudit['state'], metadataSha256: string | null = null, worker?: GitMemoryWorkerAudit): Promise<boolean> => {
      activeStage = stage;
      const item = Object.freeze({ stage, direction, state, metadataSha256 });
      if (!(await current())) { code = 'binding-stale'; return false; }
      try { await bounded(Promise.resolve().then(() => request.host.audit(Object.freeze({ ...item, context, ...(worker ? { worker } : {}) })))); }
      catch { code = 'audit-failed'; history.push({ ...item, state: 'Unknown' }); return false; }
      if (!(await current())) { code = 'binding-stale'; history.push({ ...item, state: 'Unknown' }); return false; }
      history.push(item); return true;
    };
    // Committed/adopted policy verification precedes compiling policy regexes or
    // using the policy bytes to admit any source metadata.
    if (!(await current())) { code = 'binding-stale'; return fail(); }
    const loaded = buildDossierScreen(request.policy.bytes, true, null, request.policy.visibility);
    if (!loaded.ok || loaded.screen.policySha256 !== request.policy.sha256) { code = 'policy-unavailable'; return fail(); }
    screen = loaded.screen;
    if (!metadataSafe(screen, [originalLocator, request.selector ?? '', ...fields(identity.destination)], { url: originalLocator, selector: request.selector ?? null, destination: identity.destination })) { code = 'metadata-refused'; return fail(); }
    // Refusal audit carries the source context, so install it only after that
    // complete context has passed the unchanged metadata policy.
    finalFailure = async () => {
      let item: UrlMemoryHistory = { stage: activeStage, direction: 'local', state: terminationUnknown ? 'Unknown' : 'refused', metadataSha256: null };
      try { await bounded(Promise.resolve().then(() => request.host.audit(Object.freeze({ ...item, context })))); }
      catch { item = { ...item, state: 'Unknown' }; }
      history.push(Object.freeze(item));
    };
    if (!(await acknowledge('declared-attempt', 'local', 'attempted'))) return fail();
    if (!path.isAbsolute(request.scratchParent) || path.resolve(request.scratchParent) !== request.scratchParent || await realpath(request.scratchParent) !== request.scratchParent) return fail();
    const parent = await lstat(request.scratchParent);
    if (!parent.isDirectory() || parent.uid !== process.getuid?.() || (parent.mode & 0o077) !== 0) return fail();
    workspace = await mkdtemp(path.join(request.scratchParent, 'url-memory-'));
    let selection: UrlRevisionSelection | null = null;
    const operation = async (kind: 'selection' | 'receive'): Promise<GitSelectionResult | GitMemoryResult | null> => {
      const stage = kind === 'selection' ? 'selection' : 'receive';
      if (!(await acknowledge(stage, 'local', 'attempted'))) return null;
      const home = path.join(workspace!, kind); await mkdir(home, { mode: 0o700 });
      if (kind === 'selection' && plan.kind === 'full-commit') {
        // A full pin is a pure semantic selection. No helper/configuration is
        // claimed to have executed, and no remote fallback may run.
        const input = { url: originalLocator, home, selector: request.selector, sourceProvider: context.sourceProvider, limits,
          admitMetadata: () => false, admitIncomingMetadata: () => false };
        const result = /^https:\/\//iu.test(originalLocator) ? await ports.selectHttps(input) : await ports.selectSsh(input);
        const expected = selectUrlRevision(plan, '');
        if (!result.ok || !expected.ok || !same(result.selection, expected.value) || result.evidence.groupTermination !== 'not-started') { code = 'selection-refused'; return null; }
        if (!(await current())) { code = 'binding-stale'; return null; }
        return result;
      }
      const prepared = await prepareProfile(originalLocator, home, request.ssh, limits.milliseconds);
      const configDigest = hash(prepared.config);
      let outgoingCount = 0, incomingCount = 0, advertisedFormat: 'sha1' | 'sha256' | null = null;
      let incomingPrevious: string | null = null, incomingText = '', incomingComposition = '', headerDigest: string | null = null;
      let independentlySelected: UrlRevisionSelection | null = null;
      const configuration = { url: originalLocator, selector: request.selector ?? null, pin: selection?.identifier ?? null, sourceProvider: context.sourceProvider, destination: prepared.destination, config: prepared.config, protocol: prepared.protocol, classes: ['code-structure'] };
      const composition = fields(configuration);
      if (!metadataSafe(screen, composition, configuration)) { code = 'metadata-refused'; return null; }
      const outgoing = async (item: Outgoing): Promise<boolean> => {
        let admitted = false;
        try {
          if (outgoingCount > 1 || item.stage !== (outgoingCount === 0 ? 'connect' : kind === 'selection' ? 'ls-refs' : 'fetch')) return false;
          if (outgoingCount === 1 && incomingCount !== 1) return false;
          const format = kind === 'selection' ? outgoingCount === 0 ? null : advertisedFormat : selection!.objectFormat;
          if (outgoingCount === 1 && format === null) return false;
          const wire = outgoingCount === 0 ? prepared.connect : kind === 'selection' ? gitLsRefsWire(plan, format!) : fetchWire(selection!.identifier, format!);
          const identity = { stage: item.stage, sourceProvider: context.sourceProvider, url: originalLocator, destination: prepared.destination,
            ...(kind === 'selection' ? { selector: request.selector ?? null, plan } : { pin: selection!.identifier }), objectFormat: format, classes: ['code-structure'], protocol: prepared.protocol,
            digest: sha256(wire), bytes: wire.length, configDigest };
          if (!(item.wire instanceof Uint8Array) || !Buffer.from(item.wire).equals(wire)
            || wireSnapshot(item) !== wireSnapshot({ ...identity, wire: item.wire, config: prepared.config, bindingDigest: hash(identity) })) return false;
          const values = [...composition, wire.toString('utf8'), ...fields(identity)];
          if (!metadataSafe(screen, values, { ...identity, wire: wire.toString('utf8'), config: prepared.config })) return false;
          const before = wireSnapshot(item);
          if (!(await acknowledge(stage, 'presend', 'admitted', item.bindingDigest)) || wireSnapshot(item) !== before) return false;
          composition.push(wire.toString('utf8')); outgoingCount++; admitted = true; return true;
        } catch { return false; }
        finally { if (!admitted && code !== 'binding-stale' && code !== 'audit-failed') code = 'metadata-refused'; }
      };
      const incoming = async (item: unknown): Promise<boolean> => {
        // The closed decoder compares framing, semantic fields and cumulative
        // compositions. Its implementation is shared with the wire parser.
        const checked = validateIncoming(item, { kind, prepared, configDigest, context, originalLocator, selector: request.selector ?? null, plan,
          selection, outgoingCount, incomingCount, incomingPrevious, incomingText, incomingComposition });
        if (!checked) { code = 'metadata-refused'; return false; }
        if (checked.unit !== 'advertisement' && checked.objectFormat !== advertisedFormat) { code = 'metadata-refused'; return false; }
        if (checked.parsed.kind === 'fetch-end' && checked.parsed.headerDigest !== headerDigest) { code = 'metadata-refused'; return false; }
        const before = wireSnapshot(item);
        const { rawWire: _rawWire, ...encoded } = checked; // checked.text is its exact lossless framed text.
        if (!metadataSafe(screen, [...composition, checked.text, checked.payloadText, ...checked.decodedFields, checked.composition, checked.cumulativeText, checked.cumulativeComposition], encoded)) { code = 'metadata-refused'; return false; }
        if (checked.parsed.kind === 'ls-refs') {
          const semantic = selectGitLsRefs(plan, checked.parsed.objectFormat, checked.parsed.rows.map(row => Buffer.from(`${row.identifier} ${row.reference}${row.attributes.map(attribute => ` ${attribute.kind}:${attribute.value}`).join('')}\n`)));
          if (!semantic.ok) { code = 'metadata-refused'; return false; }
          independentlySelected = semantic.value;
        }
        if (!(await acknowledge(stage, 'ingest', 'admitted', checked.bindingDigest)) || wireSnapshot(item) !== before) return false;
        incomingPrevious = checked.bindingDigest; incomingText = checked.cumulativeText; incomingComposition = checked.cumulativeComposition;
        if (checked.unit === 'fetch-header') headerDigest = checked.digest;
        advertisedFormat = checked.parsed.objectFormat; incomingCount++; return true;
      };
      const common = { url: originalLocator, home, sourceProvider: context.sourceProvider, limits, admitMetadata: outgoing, admitIncomingMetadata: incoming };
      let result: GitSelectionResult | GitMemoryResult;
      try {
        if (kind === 'selection') {
          const input = { ...common, ...(request.selector === undefined ? {} : { selector: request.selector }) };
          result = prepared.protocol === 'git-v2-stateless' ? await ports.selectHttps(input) : await ports.selectSsh({ ...input, ...request.ssh });
        } else {
          const input = { ...common, pin: selection!.identifier, objectFormat: selection!.objectFormat };
          result = prepared.protocol === 'git-v2-stateless' ? await ports.receiveHttps(input) : await ports.receiveSsh({ ...input, ...request.ssh! });
        }
      } catch { terminationUnknown = true; code = 'operation-failed'; return null; }
      if (result.evidence.groupTermination === 'unconfirmed') terminationUnknown = true;
      if (!result.ok) { if (!['binding-stale', 'audit-failed', 'metadata-refused'].includes(code)) code = kind === 'selection' ? 'selection-refused' : 'receive-refused'; return null; }
      if (outgoingCount !== 2 || incomingCount !== (kind === 'selection' ? 2 : 3)) { code = 'metadata-refused'; return null; }
      if (kind === 'selection' && 'selection' in result) {
        if (!independentlySelected || !same(independentlySelected, result.selection)) { code = 'selection-refused'; return null; }
      }
      if (!(await current())) { code = 'binding-stale'; return null; }
      metadata.push(Object.freeze({ operation: kind, configSha256: configDigest, commandSha256: hash(prepared.config['args']), environmentSha256: hash(prepared.config['environment']), executableSha256: (prepared.config['helper'] as { sha256: string }).sha256,
        protocolSha256: hash({ protocol: prepared.protocol, outgoing: composition.slice(-outgoingCount), incoming: incomingPrevious }) }));
      return result;
    };
    const selected = await operation('selection');
    if (!selected || !selected.ok || !('selection' in selected)) return fail();
    selection = selected.selection;
    if ((selection.objectFormat !== 'sha1' && selection.objectFormat !== 'sha256') || !new RegExp(`^[a-f0-9]{${selection.objectFormat === 'sha1' ? 40 : 64}}$`, 'u').test(selection.identifier)
      || (plan.kind === 'full-commit' && selection.identifier !== plan.commit)) { code = 'selection-refused'; return fail(); }
    context = makeContext(selection.identifier);
    const selectedScreen = buildDossierScreen(request.policy.bytes, true, request.policy.repository ? { repository: request.policy.repository, commit: selection.identifier } : null, request.policy.visibility);
    if (!selectedScreen.ok) { code = 'policy-unavailable'; return fail(); }
    screen = selectedScreen.screen;
    if (!(await acknowledge('selection', 'local', 'admitted', hash(selection)))) return fail();
    if (request.suppliedClone !== undefined) {
      if (!(await acknowledge('supplied-clone', 'local', 'attempted'))) return fail();
      const head = resolveCloneHead(request.suppliedClone);
      if (!head.ok || head.commit !== selection.identifier) { code = 'clone-refused'; return fail(); }
      // Existing supplied-clone object validation and every-read source screening
      // remain mandatory at the dossier reader. This branch establishes only
      // equality with the once-selected pin; it reads no commit/tree/blob body.
      if (!(await acknowledge('supplied-clone', 'local', 'admitted')) || !(await acknowledge('complete', 'local', 'admitted'))) return fail();
      await rm(workspace!, { recursive: true, force: true }); workspace = null;
      const finalHead = resolveCloneHead(request.suppliedClone);
      if (!finalHead.ok || finalHead.commit !== selection.identifier) { code = 'clone-refused'; return fail(); }
      return { ok: true, originalLocator, normalizedLocator, context, selection, clone: request.suppliedClone, workspace: null, supplied: true, metadata, history, worker: null };
    }
    const received = await operation('receive');
    if (!received || !received.ok || !('pack' in received)) return fail();
    let worker: GitMemoryWorkerResult;
    try {
      if (!Array.isArray(received.shallow) || received.shallow.length !== 1 || received.shallow[0] !== selection.identifier) { code = 'receive-refused'; return fail(); }
      if (!(await acknowledge('whole-closure', 'local', 'attempted'))) return fail();
      const workerParent = path.join(workspace!, 'worker'); await mkdir(workerParent, { mode: 0o700 });
      const binding: GitMemoryWorkerBinding = { run: context.provisionalRun, acquisition: context.acquisition, sourceBinding: context.sourceBinding, policySha256: context.policySha256, originPolicySha256: context.originPolicySha256 };
      worker = await ports.worker({ program: request.program, binding, pack: received.pack, objectFormat: selection.objectFormat, selectedCommit: selection.identifier, shallow: received.shallow,
        policyBytes: request.policy.bytes, visibility: request.policy.visibility, ...(request.policy.repository ? { repository: request.policy.repository } : {}), parent: workerParent, limits: request.workerLimits,
        current: async (actual) => same(actual, binding) && await current(), audit: async event => { if (!(await acknowledge('whole-closure', 'local', event.stage === 'whole-closure-admitted' ? 'admitted' : 'refused', event.contextSha256, event))) throw new Error(); }, ...(request.signal ? { signal: request.signal } : {}) });
    } catch { terminationUnknown = true; code = 'operation-failed'; return fail(); }
    finally { received.pack.fill(0); }
    if (!worker.ok) { terminationUnknown ||= worker.summary.termination === 'Unknown'; code = 'worker-refused'; return fail(); }
    if (!(await acknowledge('complete', 'local', 'admitted'))) return fail();
    const finalHead = resolveCloneHead(worker.store.clone);
    if (!finalHead.ok || finalHead.commit !== selection.identifier) { code = 'clone-refused'; return fail(); }
    return { ok: true, originalLocator, normalizedLocator, context, selection, clone: worker.store.clone, workspace, supplied: false, metadata, history, worker: worker.summary };
  } catch { if (code === 'invalid-input') code = 'operation-failed'; return fail(); }
}
