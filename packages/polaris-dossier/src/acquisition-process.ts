import { spawn } from 'node:child_process';
import { constants } from 'node:fs';
import { access, lstat, mkdir, open, opendir } from 'node:fs/promises';
import path from 'node:path';

export interface AcquisitionProcessLimits {
  readonly processMilliseconds: number;
  readonly outputBytes: number;
  readonly fileBytes: number;
  readonly directoryBytes: number;
  readonly directoryEntries: number;
  readonly sampleMilliseconds: number;
}
export const DEFAULT_ACQUISITION_LIMITS: AcquisitionProcessLimits = Object.freeze({
  processMilliseconds: 120_000, outputBytes: 2 * 1024 * 1024, fileBytes: 256 * 1024 * 1024,
  directoryBytes: 512 * 1024 * 1024, directoryEntries: 262_144, sampleMilliseconds: 100,
});
export interface AcquisitionProcessRequest {
  /** Trusted acquisition orchestration constructs these arguments after screening source metadata. Never arbitrary user argv. */
  readonly args: readonly string[];
  readonly cwd: string;
  /** Caller-created, empty, separately owned directory; one fresh directory for each invocation. */
  readonly home: string;
  readonly transport: 'none' | 'https' | 'ssh';
  readonly limits?: Partial<AcquisitionProcessLimits>;
  readonly monitorRoot?: string;
}
export type AcquisitionProcessFailure = 'invalid-request' | 'limiter-unavailable' | 'spawn-failed' | 'process-deadline'
  | 'output-limit' | 'git-failed' | 'invalid-output' | 'directory-byte-limit' | 'directory-entry-limit'
  | 'census-incomplete' | 'termination-unconfirmed';
export interface AcquisitionProcessSummary {
  readonly limits: AcquisitionProcessLimits;
  readonly stdoutBytes: number;
  readonly stderrBytes: number;
  readonly exitCode: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly groupTermination: 'confirmed' | 'unconfirmed' | 'not-started';
  readonly durationMilliseconds: number;
  readonly census: {
    readonly samples: number;
    readonly lastSampleStartedAt: string | null;
    readonly lastSampleFinishedAt: string | null;
    readonly peakBytes: number | null;
    readonly peakEntries: number | null;
    readonly residualBytes: number | null;
    readonly residualEntries: number | null;
    readonly aggregateEnforcement: 'sampled-stop-only';
    readonly byteMeasure: 'logical-files-and-symlinks-excluding-directory-metadata';
    readonly betweenSamples: 'Unknown';
  };
}
export type AcquisitionProcessResult = { readonly ok: true; readonly stdout: string; readonly summary: AcquisitionProcessSummary }
  | { readonly ok: false; readonly code: AcquisitionProcessFailure; readonly reason: string; readonly summary: AcquisitionProcessSummary };

const REASONS: Record<AcquisitionProcessFailure, string> = {
  'invalid-request': 'Acquisition requires valid bounded inputs and a fresh owned configuration directory.',
  'limiter-unavailable': 'Hard per-file limiting is unavailable; supply an existing clone instead.',
  'spawn-failed': 'The trusted Git process could not start; supply an existing clone instead.',
  'process-deadline': 'The acquisition process exceeded its wall deadline; supply an existing clone instead.',
  'output-limit': 'The acquisition process exceeded its combined output limit; supply an existing clone instead.',
  'git-failed': 'The trusted Git operation failed; check transport access or supply an existing clone instead.',
  'invalid-output': 'Git metadata was not strict UTF-8; supply an existing clone instead.',
  'directory-byte-limit': 'The sampled acquisition directory exceeded its byte budget; supply an existing clone instead.',
  'directory-entry-limit': 'The sampled acquisition directory exceeded its entry budget; supply an existing clone instead.',
  'census-incomplete': 'The acquisition directory census was incomplete; supply an existing clone instead.',
  'termination-unconfirmed': 'Acquisition process-group termination could not be confirmed; inspect local processes before retrying.',
};
const delay = (milliseconds: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, milliseconds));
const CONFIG_VALUES: Readonly<Record<string, readonly string[]>> = {
  'core.repositoryformatversion': ['0', '1'], 'core.filemode': ['true', 'false'], 'core.bare': ['false'],
  'core.logallrefupdates': ['true'], 'extensions.objectformat': ['sha1', 'sha256'],
};

/** Refuse repository configuration that could introduce helpers, includes, filters or a different worktree.
 * Only the small configuration written by an owned `git init` is admitted. No remote config is imported. */
async function ownedConfigIsInert(cwd: string, required: boolean): Promise<boolean> {
  try {
    const gitDirectory = await lstat(path.join(cwd, '.git'));
    if (!gitDirectory.isDirectory() || gitDirectory.isSymbolicLink()) return false;
    const file = await open(path.join(cwd, '.git/config'), constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    try {
      const stat = await file.stat();
      if (!stat.isFile() || stat.size > 16_384) return false;
      const bytes = Buffer.alloc(16_385);
      const read = await file.read(bytes, 0, bytes.length, 0);
      if (read.bytesRead > 16_384) return false;
      const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, read.bytesRead));
      let section = '';
      const seen = new Set<string>();
      for (const line of text.split(/\r?\n/)) {
        if (/^\s*(?:[#;].*)?$/.test(line)) continue;
        const heading = /^\s*\[(core|extensions)\]\s*$/.exec(line);
        if (heading) { section = heading[1]!; continue; }
        const entry = /^\s*([a-zA-Z]+)\s*=\s*([a-zA-Z0-9]+)\s*$/.exec(line);
        if (!entry) return false;
        const key = `${section}.${entry[1]!.toLowerCase()}`;
        if (seen.has(key) || !CONFIG_VALUES[key]?.includes(entry[2]!)) return false;
        seen.add(key);
      }
      return seen.has('core.repositoryformatversion') && seen.has('core.bare');
    } finally { await file.close(); }
  } catch (error) { return !required && (error as NodeJS.ErrnoException).code === 'ENOENT'; }
}

async function isEmptyDirectory(directory: string): Promise<boolean> {
  const iterator = await opendir(directory);
  try { return await iterator.read() === null; } finally { await iterator.close(); }
}

interface TrustedTools {
  readonly git: string;
  readonly prlimit: string;
  readonly allowFixtureFileTransport?: boolean;
  /** Synthetic OS-failure seam. Production always uses process.kill. */
  readonly signalGroup?: (group: number, signal: NodeJS.Signals) => void;
}
const PRODUCTION_TOOLS: TrustedTools = { git: '/usr/bin/git', prlimit: '/usr/bin/prlimit' };

/** Linux-only trusted Git transport primitive, never an observed-project execution API.
 * Raw diagnostics and argv are never returned. A failure discards captured stdout as well as stderr.
 * The hard RLIMIT_FSIZE is inherited by helpers; a helper may catch EFBIG instead of dying.
 * Aggregate enforcement sums logical file and symlink byte sizes, sampled, not a disk quota (directory metadata is excluded). Same-user interference, hard links and writes outside
 * the owned root are not isolated by this primitive. It establishes no observed-code execution profile. */
export const runAcquisitionGit = (request: AcquisitionProcessRequest): Promise<AcquisitionProcessResult> => run(request, PRODUCTION_TOOLS);

/** Internal synthetic-fixture seam, deliberately absent from the workspace barrel and user configuration.
 * The caller supplies only trusted test programs and its own local fixture; production never permits file transport. */
export function acquisitionGitTestPort(tools: TrustedTools): (request: AcquisitionProcessRequest) => Promise<AcquisitionProcessResult> {
  return (request) => run(request, tools);
}

async function run(request: AcquisitionProcessRequest, tools: TrustedTools): Promise<AcquisitionProcessResult> {
  const start = performance.now();
  const requestedLimits = { ...DEFAULT_ACQUISITION_LIMITS, ...request.limits };
  const invalidLimits = Object.values(requestedLimits).some((value) => !Number.isSafeInteger(value) || value <= 0);
  // Invalid runtime input is never copied verbatim into a diagnostic record.
  const limits = invalidLimits ? { ...DEFAULT_ACQUISITION_LIMITS } : requestedLimits;
  let stdoutBytes = 0, stderrBytes = 0;
  let exitCode: number | null = null;
  let signal: NodeJS.Signals | null = null;
  let groupTermination: AcquisitionProcessSummary['groupTermination'] = 'not-started';
  const census = { samples: 0, lastSampleStartedAt: null as string | null, lastSampleFinishedAt: null as string | null,
    peakBytes: null as number | null, peakEntries: null as number | null, residualBytes: null as number | null, residualEntries: null as number | null,
    aggregateEnforcement: 'sampled-stop-only' as const, byteMeasure: 'logical-files-and-symlinks-excluding-directory-metadata' as const, betweenSamples: 'Unknown' as const };
  const summary = (): AcquisitionProcessSummary => ({ limits, stdoutBytes, stderrBytes, exitCode, signal, groupTermination,
    durationMilliseconds: performance.now() - start, census: { ...census } });
  const failure = (code: AcquisitionProcessFailure): AcquisitionProcessResult => ({ ok: false, code, reason: REASONS[code], summary: summary() });
  const verb = request.args[0];
  if (invalidLimits
    || limits.processMilliseconds > 2_147_483_647 || limits.sampleMilliseconds > 2_147_483_647
    || !['init', 'ls-remote', 'fetch', 'checkout', 'rev-parse'].includes(verb ?? '')
    || !['none', 'https', 'ssh'].includes(request.transport)
    || request.args.some((arg) => typeof arg !== 'string' || /[\0\r\n]/.test(arg))
    || !path.isAbsolute(request.cwd) || !path.isAbsolute(request.home)
    || (request.monitorRoot !== undefined && !path.isAbsolute(request.monitorRoot))) return failure('invalid-request');
  if (process.platform !== 'linux') return failure('limiter-unavailable');
  try { await access(tools.prlimit, constants.X_OK); await access(tools.git, constants.X_OK); }
  catch { return failure('limiter-unavailable'); }
  try {
    const homeStat = await lstat(request.home);
    if (!homeStat.isDirectory() || homeStat.isSymbolicLink() || !(await isEmptyDirectory(request.home))
      || !(await ownedConfigIsInert(request.cwd, verb !== 'init' && verb !== 'ls-remote'))) return failure('invalid-request');
    await mkdir(path.join(request.home, 'xdg'));
    await mkdir(path.join(request.home, 'tmp'));
    await mkdir(path.join(request.home, 'template'));
  } catch { return failure('invalid-request'); }

  let stopping = false;
  let refusal: AcquisitionProcessFailure | null = null;
  let stopProcess: (() => void) | undefined;
  const refuse = (code: AcquisitionProcessFailure): void => { refusal ??= code; stopProcess?.(); };
  // Each scan holds stable O_NOFOLLOW directory descriptors. Descendant lookup uses the descriptor,
  // so replacing a previously opened directory by a symlink cannot redirect the walk.
  let lastSampleBegan = performance.now();
  const sample = async (): Promise<void> => {
    if (!request.monitorRoot) return;
    const began = performance.now();
    lastSampleBegan = began;
    census.lastSampleStartedAt = new Date().toISOString();
    census.residualBytes = null; census.residualEntries = null;
    let bytes = 0, entries = 0;
    const deadline = setTimeout(() => refuse('census-incomplete'), limits.sampleMilliseconds);
    const walk = async (directory: string): Promise<void> => {
      const handle = await open(directory, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
      try {
        const base = `/proc/self/fd/${handle.fd}`;
        const iterator = await opendir(base);
        try {
          for await (const entry of iterator) {
            if (performance.now() - began >= limits.sampleMilliseconds) throw new Error('scan-deadline');
            entries++;
            census.peakEntries = Math.max(census.peakEntries ?? 0, entries);
            if (entries > limits.directoryEntries) { refuse('directory-entry-limit'); throw new Error('entries'); }
            const child = path.join(base, entry.name);
            const stat = await lstat(child);
            if (stat.isDirectory()) await walk(child);
            else if (stat.isFile() || stat.isSymbolicLink()) {
              bytes += stat.size;
              census.peakBytes = Math.max(census.peakBytes ?? 0, bytes);
              if (!Number.isSafeInteger(bytes) || bytes > limits.directoryBytes) {
                refuse('directory-byte-limit'); throw new Error('bytes');
              }
            } else throw new Error('special-entry');
          }
        } finally { /* for-await closes the directory, including on a thrown census refusal. */ }
      } finally { await handle.close(); }
    };
    try {
      await walk(request.monitorRoot);
      if (performance.now() - began >= limits.sampleMilliseconds) throw new Error('scan-deadline');
      census.samples++;
      census.peakBytes = Math.max(census.peakBytes ?? 0, bytes);
      census.peakEntries = Math.max(census.peakEntries ?? 0, entries);
      census.residualBytes = bytes; census.residualEntries = entries;
      census.lastSampleFinishedAt = new Date().toISOString();
    } catch { refuse('census-incomplete'); }
    finally { clearTimeout(deadline); census.lastSampleFinishedAt = new Date().toISOString(); }
  };
  await sample();
  if (refusal) return failure(refusal);

  const config = [
    'credential.helper=', 'credential.interactive=false', 'core.askPass=/bin/false', 'core.hooksPath=/dev/null',
    'core.attributesFile=/dev/null', 'core.fsmonitor=false', 'core.untrackedCache=false',
    'protocol.allow=never', `protocol.https.allow=${request.transport === 'https' ? 'always' : 'never'}`,
    `protocol.ssh.allow=${request.transport === 'ssh' ? 'always' : 'never'}`,
    `protocol.file.allow=${tools.allowFixtureFileTransport ? 'always' : 'never'}`,
    'http.sslVerify=true', 'http.followRedirects=false', 'http.proxy=',
    'fetch.recurseSubmodules=false', 'submodule.recurse=false', 'fetch.writeCommitGraph=false',
    'maintenance.auto=false', 'gc.auto=0', 'transfer.fsckObjects=true',
    `init.templateDir=${path.join(request.home, 'template')}`,
  ];
  const environment: NodeJS.ProcessEnv = {
    PATH: '/usr/bin:/bin', LANG: 'C', LC_ALL: 'C', HOME: request.home, XDG_CONFIG_HOME: path.join(request.home, 'xdg'),
    TMPDIR: path.join(request.home, 'tmp'), GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_SYSTEM: '/dev/null',
    GIT_CONFIG_GLOBAL: '/dev/null', GIT_CEILING_DIRECTORIES: path.dirname(request.cwd), GIT_TERMINAL_PROMPT: '0', GIT_ASKPASS: '/bin/false', SSH_ASKPASS: '/bin/false',
    GIT_ATTR_NOSYSTEM: '1', GIT_NO_REPLACE_OBJECTS: '1', GIT_NO_LAZY_FETCH: '1', GIT_OPTIONAL_LOCKS: '0',
    GIT_SSH_COMMAND: '/usr/bin/ssh -F /dev/null -oBatchMode=yes -oStrictHostKeyChecking=yes -oUpdateHostKeys=no -oControlMaster=no -oControlPath=none -oControlPersist=no -oProxyCommand=none -oProxyJump=none -oPermitLocalCommand=no -oLocalCommand=none -oClearAllForwardings=yes -oForwardAgent=no -oForwardX11=no',
    GIT_SSH_VARIANT: 'ssh',
  };
  // The agent socket may flow only to trusted SSH. Its value is never copied into records or diagnostics.
  if (request.transport === 'ssh' && process.env.SSH_AUTH_SOCK) environment.SSH_AUTH_SOCK = process.env.SSH_AUTH_SOCK;
  const child = spawn(tools.prlimit, [`--fsize=${limits.fileBytes}:${limits.fileBytes}`, '--', tools.git,
    ...config.flatMap((value) => ['-c', value]), ...request.args], {
    cwd: request.cwd, env: environment, detached: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  const chunks: Buffer[] = [];
  let spawnedError = false;
  let exited = false;
  let killSent = false;
  const groupExists = (): boolean => {
    if (child.pid === undefined) return false;
    try { process.kill(-child.pid, 0); return true; }
    catch (error) { return (error as NodeJS.ErrnoException).code !== 'ESRCH'; }
  };
  const killGroup = (value: NodeJS.Signals): void => {
    if (child.pid === undefined) return;
    try {
      if (tools.signalGroup) tools.signalGroup(-child.pid, value);
      else process.kill(-child.pid, value);
    } catch { /* Confirmation below decides whether cleanup succeeded. */ }
  };
  let cleanupStartedAt: number | null = null;
  let cleanupTimer: ReturnType<typeof setTimeout> | undefined;
  let releaseCleanupWait: () => void = () => {};
  const cleanupWait = new Promise<void>((resolve) => { releaseCleanupWait = resolve; });
  stopProcess = () => {
    if (!killSent) {
      killSent = true; cleanupStartedAt = performance.now(); killGroup('SIGTERM');
      // Even an unkillable process must not leave this supervisor waiting without a bound.
      cleanupTimer = setTimeout(releaseCleanupWait, 1_250);
    }
  };
  const finished = new Promise<void>((resolve) => {
    child.once('error', () => { spawnedError = true; exited = true; resolve(); });
    child.once('exit', (code, endedBy) => { exitCode = code; signal = endedBy; exited = true; resolve(); });
  });
  child.stdout.on('data', (chunk: Buffer) => {
    stdoutBytes += chunk.length;
    if (stdoutBytes + stderrBytes > limits.outputBytes) refuse('output-limit');
    else if (refusal === null) chunks.push(Buffer.from(chunk));
  });
  child.stderr.on('data', (chunk: Buffer) => {
    stderrBytes += chunk.length;
    if (stdoutBytes + stderrBytes > limits.outputBytes) refuse('output-limit');
  });
  const wall = setTimeout(() => refuse('process-deadline'), Math.max(1, limits.processMilliseconds - (performance.now() - start)));
  const monitor = (async (): Promise<void> => {
    while (!stopping && request.monitorRoot !== undefined) {
      const untilSample = Math.max(1, lastSampleBegan + limits.sampleMilliseconds - performance.now());
      await delay(Math.min(untilSample, 100));
      if (!stopping && performance.now() >= lastSampleBegan + limits.sampleMilliseconds) await sample();
    }
  })();
  // Cleanup deadlines are fixed, independently of caller budgets. An uncooperative helper is killed.
  const escalation = setInterval(() => { if (killSent && !exited) killGroup('SIGKILL'); }, 250);
  await Promise.race([finished, cleanupWait]);
  clearTimeout(wall);
  stopProcess();
  await delay(Math.max(0, cleanupStartedAt! + 250 - performance.now()));
  killGroup('SIGKILL');
  const cleanupDeadline = cleanupStartedAt! + 1_250;
  while (groupExists() && performance.now() < cleanupDeadline) await delay(20);
  groupTermination = groupExists() ? 'unconfirmed' : child.pid === undefined ? 'not-started' : 'confirmed';
  clearInterval(escalation);
  clearTimeout(cleanupTimer);
  stopping = true;
  await monitor;
  child.stdout.destroy(); child.stderr.destroy();
  await sample();
  if (groupTermination === 'unconfirmed') return failure('termination-unconfirmed');
  if (refusal) return failure(refusal);
  if (spawnedError) return failure('spawn-failed');
  if (exitCode !== 0 || signal !== null) return failure('git-failed');
  try {
    const stdout = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
    return { ok: true, stdout, summary: summary() };
  } catch { return failure('invalid-output'); }
}
