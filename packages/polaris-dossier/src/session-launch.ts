import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { constants, type Stats } from 'node:fs';
import { chmod, lstat, open, opendir, readdir, realpath } from 'node:fs/promises';
import { createServer, type Server, type Socket } from 'node:net';
import path from 'node:path';
import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { deepFreeze, sha256 } from '@syzygy/support';
import type { SessionHost } from './session-host.js';
import { isNativeSessionProfile, isOrderedDesignSessionProfile, isSessionProfile, URL_CLI_PROGRAM, type NativeSessionProfile } from './session-profile.js';
import { probeUrlSessionView, URL_SESSION_BWRAP, urlSessionBwrapArgs, urlSessionCommand, urlSessionViewFor,
  verifyUrlSessionViewInputs, type UrlSessionViewInputs } from './session-url-view.js';

export { URL_CLI_PROGRAM };
export const URL_LAUNCH_LIMITS = Object.freeze({ milliseconds: 1_800_000, setupMilliseconds: 20_000, cleanupMilliseconds: 2500,
  cpuSeconds: 600, addressBytes: 68_719_476_736, fileBytes: 2_097_152, storageBytes: 16_777_216,
  entries: 16_384, processes: 64, outputBytes: 8_388_608, descriptors: 256, sampleMilliseconds: 200 });
export type UrlLaunchLimits = { readonly [K in keyof typeof URL_LAUNCH_LIMITS]: number };
const canonical = (value: unknown): string => encodeCanonicalJson(value, { maxBytes: 2_097_152, maxNodes: 65_536, maxDepth: 32 });
const TOOLS = ['source_read', 'artifact_read', 'artifact_write', 'dossier_step'] as const;
const refused = (): Error => new Error('url-session-launch-refused');
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));
/** Bounds waiting, not cancellation of an arbitrary caller-owned callback. */
async function bounded<T>(operation: () => T | Promise<T>, milliseconds: number): Promise<T> {
  const deadline = performance.now() + Math.max(1, milliseconds);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    const expire = (): void => {
      // A timer callback can arrive early when its clock rounds the delay.
      const remaining = deadline - performance.now();
      if (remaining <= 0) reject(refused());
      else timer = setTimeout(expire, Math.ceil(remaining));
    };
    expire();
  });
  try { return await Promise.race([Promise.resolve().then(operation), timeout]); }
  finally { clearTimeout(timer); }
}

/** Fixed CLI controls, four bounded MCP schemas and no shell or interactive stdin. */
export function restrictedSessionCliArgs(profile: NativeSessionProfile): readonly string[] {
  if (!isNativeSessionProfile(profile)) throw refused();
  const config = { mcpServers: { syzygy: { type: 'stdio', command: '/tool/node', args: ['/tool/support/session-mcp.js'] } } };
  return Object.freeze(['--restricted', '--print', '--permission-mode', 'dontAsk', '--tools', '', '--disable-slash-commands',
    '--strict-mcp-config', '--mcp-config', canonical(config), '--setting-sources', '', '--no-session-persistence',
    '--output-format', 'json', '--model', profile.input.binding.model, '--system-prompt', profile.input.systemPrompt,
    '--session-id', profile.input.sessionId, '--allowedTools', ...TOOLS.map(tool => `mcp__syzygy__${tool}`),
    '--settings', '{"alwaysThinkingEnabled":false}', '--', profile.input.initialPrompt]);
}
export interface UrlSessionLaunchOptions {
  readonly view: UrlSessionViewInputs;
  readonly profile: NativeSessionProfile;
  readonly expected: { readonly nodeSha256: string; readonly supportSha256: Readonly<Record<'session-bridge.js' | 'session-mcp.js', string>> };
  readonly current: () => boolean | Promise<boolean>;
  readonly audit: (event: { readonly event: 'session-launch-attempt'; readonly profileSha256: string;
    readonly commandSha256: string; readonly viewSha256: string }) => void | Promise<void>;
  readonly limits?: Partial<UrlLaunchLimits>;
  readonly canaries: readonly string[];
  readonly hostLoopbackPort: number;
}
export interface UrlSessionPreparation {
  readonly profileSha256: string; readonly commandSha256: string; readonly viewSha256: string;
  readonly probe: 'owned-synthetic-namespace-probe-passed';
}
interface Prepared {
  readonly view: ReturnType<typeof urlSessionViewFor>; readonly profile: NativeSessionProfile;
  readonly expected: UrlSessionLaunchOptions['expected']; readonly limits: UrlLaunchLimits;
  readonly current: UrlSessionLaunchOptions['current']; readonly audit: UrlSessionLaunchOptions['audit'];
  readonly args: readonly string[]; readonly expires: number; readonly directories: readonly string[];
}
const preparations = new WeakMap<UrlSessionPreparation, Prepared>();
export interface UrlSessionLaunchOutcome {
  readonly outcome: 'exited' | 'launch-refused' | 'stopped' | 'wall-limit' | 'output-limit' | 'storage-limit' | 'process-limit' | 'inspection-failed';
  readonly exitCode: number | null; readonly signal: string | null;
  readonly viewTermination: 'view-exited' | 'Unknown'; readonly groupTermination: 'confirmed' | 'Unknown';
  readonly toolTermination: 'settled' | 'Unknown'; readonly pendingInvocations: number | null;
  readonly stdout: { readonly bytes: number; readonly sha256: string }; readonly stderr: { readonly bytes: number; readonly sha256: string };
  readonly sampledStorageBytes: number | null; readonly peakProcesses: number | null;
  readonly aggregateEnforcement: 'sampled-stop-only'; readonly betweenSamples: 'Unknown';
}
export interface UrlSessionProcess {
  readonly pid: number; readonly commandSha256: string; readonly finished: Promise<UrlSessionLaunchOutcome>;
  /** Wait for the sample already in progress. False if shutdown has begun. */
  waitForSample(): Promise<boolean>;
  stop(): Promise<UrlSessionLaunchOutcome>;
}
const launchedProcesses = new WeakMap<object, () => boolean>();
/** A copied PID/outcome tuple cannot stand in for a live launch the supervisor
 * actually prepared and started. Peer lifetime is checked independently too. */
export function isUrlSessionProcess(value: unknown): value is UrlSessionProcess {
  return value !== null && typeof value === 'object' && launchedProcesses.get(value)?.() === true;
}
async function fileDigest(file: string, maxBytes: number, check: () => void): Promise<{ readonly bytes: number; readonly sha256: string }> {
  if (await realpath(file) !== file) throw refused(); check();
  const handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const before = await handle.stat(); check();
    if (!before.isFile() || before.nlink !== 1 || (before.mode & 0o022) !== 0 || before.size > maxBytes) throw refused();
    const hash = createHash('sha256'), buffer = Buffer.alloc(1_048_576); let count = 0;
    for (;;) { check(); const { bytesRead } = await handle.read(buffer, 0, buffer.length, null); check(); if (!bytesRead) break;
      count += bytesRead; if (count > maxBytes) throw refused(); hash.update(buffer.subarray(0, bytesRead)); }
    const after = await handle.stat(), named = await lstat(file); check();
    if (count !== before.size || ['dev', 'ino', 'size', 'mtimeMs', 'ctimeMs'].some(key => before[key as keyof typeof before] !== after[key as keyof typeof after]
      || before[key as keyof typeof before] !== named[key as keyof typeof named])) throw refused();
    return { bytes: count, sha256: hash.digest('hex') };
  } finally { await handle.close(); }
}
/** Metadata/bytes only: suitable before source acquisition. Never execute a
 * version probe, consult CLI configuration or read authentication to identify it. */
export async function verifySupportedUrlCli(executable: string): Promise<boolean> {
  const began = performance.now(); let live = true;
  const check = (): void => { if (!live || performance.now() - began >= URL_LAUNCH_LIMITS.setupMilliseconds) throw refused(); };
  try {
    if (typeof executable !== 'string' || !path.isAbsolute(executable) || path.resolve(executable) !== executable) return false;
    return await bounded(async () => {
      const actual = await fileDigest(executable, URL_CLI_PROGRAM.bytes, check); check();
      return actual.bytes === URL_CLI_PROGRAM.bytes && actual.sha256 === URL_CLI_PROGRAM.sha256;
    }, URL_LAUNCH_LIMITS.setupMilliseconds);
  } catch { return false; } finally { live = false; }
}
async function directories(view: Prepared['view']): Promise<readonly string[]> {
  const identities: string[] = [];
  for (const dir of [view.inputs.supportDirectory, view.inputs.homeDirectory, view.inputs.workDirectory,
    view.inputs.brokerSocketDirectory, view.inputs.relaySocketDirectory]) {
    const stat = await lstat(dir);
    if (await realpath(dir) !== dir || !stat.isDirectory() || stat.uid !== process.getuid?.() || (stat.mode & 0o077) !== 0) throw refused();
    identities.push(`${stat.dev}:${stat.ino}`);
  }
  return identities;
}
async function verify(state: Omit<Prepared, 'directories'> & { readonly directories?: readonly string[] }, check: () => void): Promise<void> {
  const checked = await verifyUrlSessionViewInputs(state.view.inputs); check();
  const ids = await directories(state.view); check();
  if (!checked.ok || canonical(checked.supportSha256) !== canonical(state.expected.supportSha256)
    || (state.directories !== undefined && canonical(ids) !== canonical(state.directories))) throw refused();
  if (canonical(await fileDigest(state.view.inputs.cliExecutable, URL_CLI_PROGRAM.bytes, check)) !== canonical({ bytes: URL_CLI_PROGRAM.bytes, sha256: URL_CLI_PROGRAM.sha256 })
    || (await fileDigest(state.view.inputs.nodeExecutable, 134_217_728, check)).sha256 !== state.expected.nodeSha256) throw refused();
  if (await state.current() !== true) throw refused(); check();
}

/** Mandatory production preparation. Only this function issues a one-use live
 * capability. Its inert endpoints are removed before the real host can bind;
 * the namespace probe's empty connections never touch a policy cursor. */
export async function prepareRestrictedUrlSession(input: UrlSessionLaunchOptions): Promise<UrlSessionPreparation> {
  const profile = input.profile, current = input.current, audit = input.audit;
  if (!isNativeSessionProfile(profile) || typeof current !== 'function' || typeof audit !== 'function') throw refused();
  const view = urlSessionViewFor(input.view), expected = deepFreeze(JSON.parse(canonical(input.expected))) as UrlSessionLaunchOptions['expected'];
  const limits: UrlLaunchLimits = Object.freeze({ ...URL_LAUNCH_LIMITS, ...input.limits });
  const canaries = Object.freeze([...input.canaries]), port = input.hostLoopbackPort;
  if (profile.input.binding.role !== view.role || Object.keys(limits).length !== Object.keys(URL_LAUNCH_LIMITS).length
    || Object.entries(limits).some(([key, value]) => !Object.hasOwn(URL_LAUNCH_LIMITS, key) || !Number.isSafeInteger(value) || value <= 0
      || value > URL_LAUNCH_LIMITS[key as keyof UrlLaunchLimits])
    || Object.keys(expected).sort().join(',') !== 'nodeSha256,supportSha256'
    || Object.keys(expected.supportSha256).sort().join(',') !== 'session-bridge.js,session-mcp.js'
    || [expected.nodeSha256, ...Object.values(expected.supportSha256)].some(value => typeof value !== 'string' || !/^[a-f0-9]{64}$/u.test(value))
    || (isOrderedDesignSessionProfile(profile) && canonical(expected.supportSha256) !== canonical(profile.transcript.supportSha256))) throw refused();
  const mountArgs = urlSessionBwrapArgs(view), temporaryMount = mountArgs.indexOf('--tmpfs');
  if (temporaryMount < 0 || mountArgs[temporaryMount + 1] !== '/tmp') throw refused();
  // Bound private temporary byte allocation too. HOME/work remain separately
  // sampled; neither this tmpfs size nor their census is a global inode quota.
  mountArgs.splice(temporaryMount, 0, '--size', String(limits.storageBytes));
  const args = Object.freeze([...mountArgs, '--remount-ro', '/dev', '--remount-ro', '/', '--',
    ...urlSessionCommand(restrictedSessionCliArgs(profile))]);
  const receipt = deepFreeze({ profileSha256: profile.digest, commandSha256: sha256(canonical({ program: '/usr/bin/prlimit', args: processArgs(args, limits) })),
    viewSha256: sha256(canonical(view)), probe: 'owned-synthetic-namespace-probe-passed' as const });
  const began = performance.now(); let live = true;
  const check = (): void => { if (!live || performance.now() - began >= limits.setupMilliseconds) throw refused(); };
  const servers: Server[] = [], sockets = new Set<Socket>();
  let ids: readonly string[] | undefined;
  const state = { view, expected, limits, profile, current, audit, args, expires: began + limits.setupMilliseconds };
  try {
    await bounded(async () => {
      await directories(view); check();
      for (const [dir, name] of [[view.inputs.brokerSocketDirectory, 'b.sock'], [view.inputs.relaySocketDirectory, 'r.sock']] as const) {
        if ((await readdir(dir)).length !== 0) throw refused(); check();
        const server = createServer(socket => { sockets.add(socket); socket.on('error', () => {}); socket.once('close', () => sockets.delete(socket)); socket.end(); });
        servers.push(server); server.on('error', () => {});
        await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(path.join(dir, name), resolve); }); check();
        await chmod(path.join(dir, name), 0o600); check();
      }
      await verify(state, check);
      const probe = await probeUrlSessionView(view.inputs, canaries, port); check(); if (!probe.ok) throw refused();
      await verify(state, check);
    }, limits.setupMilliseconds);
    check();
  } catch { throw refused(); }
  finally {
    live = false;
    for (const socket of sockets) socket.destroy();
    await bounded(async () => {
      for (const server of servers) await new Promise<void>(resolve => server.close(() => resolve()));
      // Close removes only its own Unix socket; never unlink an unknown replacement.
      for (const dir of [view.inputs.brokerSocketDirectory, view.inputs.relaySocketDirectory]) if ((await readdir(dir)).length !== 0) throw refused();
      ids = await directories(view);
    }, limits.cleanupMilliseconds);
  }
  if (ids === undefined) throw refused();
  preparations.set(receipt, { ...state, directories: ids, expires: performance.now() + limits.setupMilliseconds });
  return receipt;
}

const STORAGE_STAT_BATCH = 4;
/** Descriptor-anchored, entry/depth/time bounded logical-file census. Symlink,
 * special and multiply linked entries fail closed; it is sampled, not a quota. */
async function storage(roots: readonly string[], limits: UrlLaunchLimits, check: () => void): Promise<number> {
  let bytes = 0, entries = 0;
  const entryDisappeared = Symbol();
  const walk = async (file: string, depth: number): Promise<void> => {
    check(); if (depth > 32 || ++entries > limits.entries) throw refused();
    const handle = await open(file, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW).catch((error: NodeJS.ErrnoException) => {
      // An enumerated child can disappear between lstat and open. Roots
      // must remain available, and other open errors still stop inspection.
      if (depth > 0 && error.code === 'ENOENT') throw entryDisappeared;
      throw error;
    });
    try {
      const base = `/proc/self/fd/${handle.fd}`, iterator = await opendir(base);
      const batch: string[] = [];
      const inspect = async (): Promise<void> => {
        if (batch.length === 0) return;
        check();
        const samples = await Promise.allSettled(batch.map(child => lstat(child)));
        check();
        const disappeared = (sample: PromiseSettledResult<Stats>): boolean =>
          sample.status === 'rejected' && (sample.reason as NodeJS.ErrnoException).code === 'ENOENT';
        for (const [index, sample] of samples.entries()) {
          check();
          if (sample.status === 'rejected') {
            if (!disappeared(sample)) throw sample.reason;
            // A second observed disappearance exhausts the retry even if
            // both names vanished from the same batch.
            if (samples.slice(index + 1).some(disappeared)) throw refused();
            throw entryDisappeared;
          }
          const stat = sample.value;
          if (stat.isDirectory()) await walk(batch[index]!, depth + 1);
          else if (stat.isFile() && stat.nlink === 1) bytes += stat.size;
          else throw refused();
          if (!Number.isSafeInteger(bytes) || bytes > limits.storageBytes) return;
        }
        batch.length = 0;
      };
      for await (const item of iterator) {
        check();
        // Recurse in directory order. Dirent type only schedules reads.
        // The descriptor-relative lstat still decides the entry's type.
        if (!item.isFile()) {
          await inspect();
          if (bytes > limits.storageBytes) return;
        }
        if (++entries > limits.entries) throw refused();
        batch.push(path.join(base, item.name));
        if (!item.isFile() || batch.length === STORAGE_STAT_BATCH || entries === limits.entries) {
          await inspect();
          if (bytes > limits.storageBytes) return;
        }
      }
      if (batch.length !== 0) await inspect();
    } finally { await handle.close(); }
  };
  const measure = async (): Promise<number> => {
    for (const root of roots) {
      await walk(root, 0);
      if (bytes > limits.storageBytes) break;
    }
    return bytes;
  };
  try { return await measure(); }
  catch (error) {
    if (error !== entryDisappeared) throw error;
    // Discard the partial count. Both walks share the original time and entry budgets.
    bytes = 0;
    return measure();
  }
}
async function taskChildren(task: string, check: () => void): Promise<readonly string[]> {
  check();
  try {
    const file = await open(task, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      check();
      const bytes = Buffer.alloc(65_537), n = (await file.read(bytes, 0, bytes.length, 0)).bytesRead;
      check();
      if (n > 65_536) throw refused();
      const content = bytes.subarray(0, n).toString('ascii');
      if (!/^(?:[0-9]+\s*)*$/u.test(content)) throw refused();
      return content.trim().split(/\s+/u);
    } finally { await file.close(); }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    return [];
  }
}
const TASK_READ_BATCH = 4;
async function descendants(pid: number, maximum: number, check: () => void): Promise<number> {
  const pending = [pid], seen = new Set<number>(); let taskEntries = 0;
  const collect = async (tasks: readonly string[]): Promise<void> => {
    const children = await Promise.all(tasks.map(task => taskChildren(task, check)));
    check();
    for (const group of children) {
      for (const child of group) if (child) pending.push(Number(child));
    }
  };
  while (pending.length) {
    check(); const next = pending.pop()!; if (seen.has(next)) continue; seen.add(next); if (seen.size > maximum) return seen.size;
    const taskRoot = `/proc/${next}/task`, batch: string[] = [];
    try {
      const tasks = await opendir(taskRoot);
      // Each thread may own children. Read a bounded group at a time and
      // apply the results in enumeration order under the same deadline.
      for await (const task of tasks) {
        check(); if (!/^[0-9]+$/u.test(task.name) || ++taskEntries > 4096) throw refused();
        batch.push(`${taskRoot}/${task.name}/children`);
        if (batch.length === TASK_READ_BATCH) { await collect(batch); batch.length = 0; }
      }
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    if (batch.length !== 0) await collect(batch);
  }
  return seen.size;
}

function processArgs(args: readonly string[], limits: UrlLaunchLimits): string[] {
  return [`--core=0:0`, `--cpu=${limits.cpuSeconds}:${limits.cpuSeconds}`, `--as=${limits.addressBytes}:${limits.addressBytes}`,
    `--fsize=${limits.fileBytes}:${limits.fileBytes}`, `--nofile=${limits.descriptors}:${limits.descriptors}`, '--', URL_SESSION_BWRAP, ...args];
}

/** Launches only from a genuine consumed preparation, after the real host binds.
 * Raw role output is drained and hashed, never persisted or exposed. Callbacks
 * and underlying IO are not claimed cancelled by a supervisor wait deadline. */
export async function launchRestrictedUrlSession(input: { readonly preparation: UrlSessionPreparation; readonly host: SessionHost }): Promise<UrlSessionProcess> {
  const state = preparations.get(input.preparation), host = input.host;
  if (!state) throw refused(); preparations.delete(input.preparation);
  // Ordered preparation is independently pinned for offline conformance.
  // The native production host still implements only ordinary admission.
  if (!isSessionProfile(state.profile)) throw refused();
  const { view, limits } = state;
  if (!host || typeof host.close !== 'function' || host.brokerSocket !== path.join(view.inputs.brokerSocketDirectory, 'b.sock')
    || host.relaySocket !== path.join(view.inputs.relaySocketDirectory, 'r.sock')) throw refused();
  const closeHost = host.close.bind(host), began = performance.now(); let active = true;
  const check = (): void => { if (!active || performance.now() >= state.expires || performance.now() - began >= limits.setupMilliseconds) throw refused(); };
  try {
    await bounded(async () => {
      check(); await verify(state, check);
      await state.audit({ event: 'session-launch-attempt', profileSha256: state.profile.digest,
        commandSha256: input.preparation.commandSha256, viewSha256: input.preparation.viewSha256 }); check();
      await verify(state, check);
    }, Math.min(limits.setupMilliseconds, Math.max(1, state.expires - performance.now())));
    check();
  } catch { active = false; await bounded(closeHost, limits.cleanupMilliseconds).catch(() => {}); throw refused(); }
  active = false;
  let child: ReturnType<typeof spawn>;
  try { child = spawn('/usr/bin/prlimit', processArgs(state.args, limits),
    { env: { PATH: '/usr/bin:/bin', LANG: 'C.UTF-8' }, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
  } catch { await bounded(closeHost, limits.cleanupMilliseconds).catch(() => {}); throw refused(); }
  const stdout = createHash('sha256'), stderr = createHash('sha256'); let outBytes = 0, errBytes = 0;
  let reason: UrlSessionLaunchOutcome['outcome'] = 'exited', finishedCapture = false, exited = false, closed = false;
  let exitCode: number | null = null, signalName: string | null = null, sampledStorageBytes: number | null = null, peakProcesses: number | null = null;
  let wake!: () => void; const terminal = new Promise<void>(resolve => { wake = resolve; });
  let killTimer: ReturnType<typeof setTimeout> | undefined, endTimer: ReturnType<typeof setTimeout> | undefined;
  const signal = (name: NodeJS.Signals): void => { try { if (child.pid !== undefined) process.kill(-child.pid, name); } catch { /* Independent verification below. */ } };
  const stop = (why: UrlSessionLaunchOutcome['outcome']): void => {
    if (finishedCapture || reason !== 'exited') return; reason = why; signal('SIGTERM');
    killTimer = setTimeout(() => signal('SIGKILL'), Math.min(250, limits.cleanupMilliseconds));
    endTimer = setTimeout(wake, limits.cleanupMilliseconds);
  };
  const capture = (bytes: Buffer, out: boolean): void => {
    if (finishedCapture) return;
    if (out) { outBytes += bytes.length; stdout.update(bytes); } else { errBytes += bytes.length; stderr.update(bytes); }
    if (outBytes + errBytes > limits.outputBytes) stop('output-limit');
  };
  child.stdout!.on('data', (bytes: Buffer) => capture(bytes, true)); child.stderr!.on('data', (bytes: Buffer) => capture(bytes, false));
  child.once('error', () => { reason = 'launch-refused'; wake(); });
  child.once('exit', (code, sig) => { exited = true; exitCode = code; signalName = sig; });
  child.once('close', () => { closed = true; wake(); });
  let pendingSample: Promise<void> | undefined;
  const sample = setInterval(() => {
    if (finishedCapture || pendingSample !== undefined || reason !== 'exited') return;
    let sampleActive = true;
    const sampleBegan = performance.now();
    const checkSample = (): void => {
      if (!sampleActive || finishedCapture || reason !== 'exited' || performance.now() - sampleBegan >= limits.sampleMilliseconds) throw refused();
    };
    pendingSample = bounded(async () => {
      // The walks share a deadline. Keep storage's earlier refusal and
      // publication order even if the process walk completes first.
      const processCount = child.pid === undefined ? undefined : descendants(child.pid, limits.processes, checkSample).catch(() => null);
      const storageBytes = await storage([view.inputs.homeDirectory, view.inputs.workDirectory], limits, checkSample);
      checkSample();
      sampledStorageBytes = storageBytes;
      if (sampledStorageBytes > limits.storageBytes) { stop('storage-limit'); return; }
      if (processCount !== undefined) {
        const count = await processCount;
        checkSample();
        if (count === null) throw refused();
        peakProcesses = Math.max(peakProcesses ?? 0, count);
        if (count > limits.processes) { stop('process-limit'); return; }
      }
      if (await state.current() !== true) stop('inspection-failed'); checkSample();
    }, limits.sampleMilliseconds).catch(() => { if (!finishedCapture) stop('inspection-failed'); })
      .finally(() => { sampleActive = false; pendingSample = undefined; });
  }, limits.sampleMilliseconds);
  const wall = setTimeout(() => stop('wall-limit'), limits.milliseconds);
  const finished = (async (): Promise<UrlSessionLaunchOutcome> => {
    await terminal; finishedCapture = true; clearTimeout(wall); clearTimeout(killTimer); clearTimeout(endTimer); clearInterval(sample);
    signal('SIGKILL');
    const cleanupUntil = performance.now() + limits.cleanupMilliseconds;
    const groupExists = (): boolean => { if (child.pid === undefined) return false; try { process.kill(-child.pid, 0); return true; }
      catch (error) { return (error as NodeJS.ErrnoException).code !== 'ESRCH'; } };
    while (groupExists() && performance.now() < cleanupUntil) await delay(20);
    child.stdout!.destroy(); child.stderr!.destroy();
    const candidate = await bounded(closeHost, limits.cleanupMilliseconds).catch(() => null);
    const tool = candidate && ['settled', 'Unknown'].includes(candidate.termination)
      && Number.isSafeInteger(candidate.pendingInvocations) && candidate.pendingInvocations >= 0
      && (candidate.termination !== 'settled' || candidate.pendingInvocations === 0) ? candidate : null;
    return deepFreeze({ outcome: reason, exitCode, signal: signalName, viewTermination: exited && closed ? 'view-exited' : 'Unknown',
      groupTermination: !groupExists() ? 'confirmed' : 'Unknown', toolTermination: tool?.termination ?? 'Unknown', pendingInvocations: tool?.pendingInvocations ?? null,
      stdout: { bytes: outBytes, sha256: stdout.digest('hex') }, stderr: { bytes: errBytes, sha256: stderr.digest('hex') },
      sampledStorageBytes, peakProcesses, aggregateEnforcement: 'sampled-stop-only', betweenSamples: 'Unknown' });
  })();
  if (child.pid === undefined) { await finished; throw refused(); }
  const launched: UrlSessionProcess = Object.freeze({ pid: child.pid, commandSha256: input.preparation.commandSha256, finished,
    waitForSample: async () => {
      await pendingSample;
      return !exited && !finishedCapture && reason === 'exited';
    },
    stop: () => { stop('stopped'); return finished; } });
  launchedProcesses.set(launched, () => !exited && !closed && !finishedCapture && child.exitCode === null && child.signalCode === null);
  return launched;
}
