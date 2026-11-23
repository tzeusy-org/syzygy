import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { constants, lstatSync, realpathSync, type Stats } from 'node:fs';
import { chmod, lstat, open, opendir, readdir, realpath } from 'node:fs/promises';
import { createServer, type Server, type Socket } from 'node:net';
import path from 'node:path';
import { setImmediate as yieldToPoll } from 'node:timers/promises';
import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { deepFreeze, sha256 } from '@syzygy/support';
import type { SessionHost } from './session-host.js';
import { isOrderedDesignHostFor } from './url-ordered-design-host.js';
import { isNativeSessionProfile, isOrderedDesignSessionProfile, isSessionProfile, URL_CLI_PROGRAM, type NativeSessionProfile } from './session-profile.js';
import { probeUrlSessionView, URL_SESSION_BWRAP, urlSessionBwrapArgs, urlSessionCommand, urlSessionViewFor,
  verifyUrlSessionViewInputs, type UrlSessionViewInputs } from './session-url-view.js';

export { URL_CLI_PROGRAM };
export const URL_LAUNCH_LIMITS = Object.freeze({ milliseconds: 1_800_000, setupMilliseconds: 20_000, cleanupMilliseconds: 2500,
  cpuSeconds: 600, addressBytes: 68_719_476_736, fileBytes: 2_097_152, storageBytes: 16_777_216,
  entries: 16_384, processes: 64, outputBytes: 8_388_608, descriptors: 256, sampleMilliseconds: 200, inspectionMilliseconds: 2_000 });
export type UrlLaunchLimits = { readonly [K in keyof typeof URL_LAUNCH_LIMITS]: number };
const canonical = (value: unknown): string => encodeCanonicalJson(value, { maxBytes: 2_097_152, maxNodes: 65_536, maxDepth: 32 });
const TOOLS = ['source_read', 'artifact_read', 'artifact_write', 'dossier_step'] as const;
const refused = (): Error => new Error('url-session-launch-refused');
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));
/** Bounds waiting, not cancellation of an arbitrary caller-owned callback. */
async function bounded<T>(operation: () => T | Promise<T>, milliseconds: number, observeTimeout?: (error: Error) => void): Promise<T> {
  const deadline = performance.now() + Math.max(1, milliseconds);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    const expire = (): void => {
      // A timer callback can arrive early when its clock rounds the delay.
      const remaining = deadline - performance.now();
      if (remaining <= 0) {
        const error = refused();
        observeTimeout?.(error);
        reject(error);
      } else timer = setTimeout(expire, Math.ceil(remaining));
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
  readonly inspectionAuthority?: {
    readonly verify: () => boolean | Promise<boolean>;
    readonly confirm: (verified: boolean) => boolean;
  };
  readonly audit: (event: { readonly event: 'session-launch-attempt'; readonly profileSha256: string;
    readonly commandSha256: string; readonly viewSha256: string; readonly limits: UrlLaunchLimits }) => void | Promise<void>;
  readonly limits?: Partial<UrlLaunchLimits>;
  /** Keep a replaced preparation bound to the original physical view. */
  readonly expectedDirectoryIdentities?: readonly string[];
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
  readonly inspectionAuthority: UrlSessionLaunchOptions['inspectionAuthority'];
  readonly args: readonly string[]; readonly expires: number; readonly directories: readonly string[];
}
const preparations = new WeakMap<UrlSessionPreparation, Prepared>();

type InspectionPhase = 'storage' | 'process' | 'verify' | 'confirm' | 'current';
type InspectionPhaseOutcome = 'accepted' | 'refused' | 'rejected';
type InspectionRefusal = { readonly phase: InspectionPhase; readonly elapsedMs: number; readonly cause:
  'bounded-timeout' | 'sample-deadline' | 'sample-inactive' | 'operation-rejected' | 'authority-refused' | 'resource-limit' };
type InspectionSample = { ordinal: number; phases: Partial<Record<InspectionPhase, {
  startedMs: number; settledMs?: number; outcome?: InspectionPhaseOutcome;
}>>; refusal?: InspectionRefusal };
type InspectionTrace = { cadenceMs: number; inspectionMs: number; samples: number;
  latest?: InspectionSample; firstRefusal?: InspectionSample };
const inspectionTraces = new WeakMap<UrlSessionPreparation, InspectionTrace>();

/** Internal first-party test observation. The reader holds no launch or effect authority. */
export function observeUrlSessionInspectionForTest(preparation: UrlSessionPreparation): (() => InspectionTrace) | null {
  const prepared = preparations.get(preparation);
  if (prepared === undefined || inspectionTraces.has(preparation)) return null;
  const trace: InspectionTrace = { cadenceMs: prepared.limits.sampleMilliseconds,
    inspectionMs: prepared.limits.inspectionMilliseconds, samples: 0 };
  inspectionTraces.set(preparation, trace);
  return () => structuredClone(trace);
}

function beginInspectionTrace(trace: InspectionTrace, began: number) {
  const sample: InspectionSample = { ordinal: ++trace.samples, phases: {} };
  trace.latest = sample;
  const causes = new Map<unknown, InspectionRefusal>();
  const elapsed = (): number => performance.now() - began;
  const reason = (phase: InspectionPhase, cause: InspectionRefusal['cause']): InspectionRefusal => ({ phase, cause, elapsedMs: elapsed() });
  const settle = (phase: InspectionPhase, outcome: InspectionPhaseOutcome): void => {
    const entry = sample.phases[phase];
    if (sample.refusal === undefined && entry !== undefined && entry.outcome === undefined) Object.assign(entry, { settledMs: elapsed(), outcome });
  };
  const fail = (refusal: InspectionRefusal): void => {
    sample.refusal = refusal;
    trace.firstRefusal ??= sample;
  };
  return {
    begin: (phase: InspectionPhase): void => {
      if (sample.refusal === undefined) sample.phases[phase] = { startedMs: elapsed() };
    },
    settle,
    note: (error: Error, phase: InspectionPhase, cause: InspectionRefusal['cause']): void => { causes.set(error, reason(phase, cause)); },
    inherit: (error: Error, previous: unknown): void => {
      const cause = causes.get(previous);
      if (cause !== undefined) causes.set(error, cause);
    },
    refuse: (phase: InspectionPhase, cause: InspectionRefusal['cause']): void => { fail(reason(phase, cause)); },
    reject: (error: unknown, phase: InspectionPhase): void => {
      const cause = causes.get(error);
      if (cause === undefined) settle(phase, 'rejected');
      fail(cause ?? reason(phase, 'operation-rejected'));
    },
  };
}

export interface UrlSessionLaunchOutcome {
  readonly outcome: 'exited' | 'launch-refused' | 'stopped' | 'wall-limit' | 'output-limit' | 'storage-limit' | 'process-limit' | 'inspection-failed';
  readonly exitCode: number | null; readonly signal: string | null;
  readonly viewTermination: 'view-exited' | 'Unknown'; readonly groupTermination: 'confirmed' | 'Unknown';
  readonly toolTermination: 'settled' | 'Unknown'; readonly pendingInvocations: number | null;
  readonly stdout: { readonly bytes: number; readonly sha256: string }; readonly stderr: { readonly bytes: number; readonly sha256: string };
  readonly sampledStorageBytes: number | null; readonly peakProcesses: number | null;
  readonly aggregateEnforcement: 'sampled-stop-only'; readonly betweenSamples: 'Unknown';
}
/** Settled cleanup preserves the outcome. A limit, refusal or failed exit cannot count as completion. */
export function urlSessionStoppedCleanly(outcome: UrlSessionLaunchOutcome): boolean {
  return (outcome.outcome === 'stopped' || outcome.outcome === 'exited' && outcome.exitCode === 0 && outcome.signal === null)
    && outcome.viewTermination === 'view-exited' && outcome.groupTermination === 'confirmed'
    && outcome.toolTermination === 'settled' && outcome.pendingInvocations === 0;
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
      count += bytesRead; if (count > maxBytes) throw refused(); hash.update(buffer.subarray(0, bytesRead));
      // A hot image can finish each read in the same poll phase. Let already
      // running role samplers publish before hashing the next bounded chunk.
      await yieldToPoll(); }
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
const viewDirectories = ({ inputs }: Prepared['view']): readonly string[] =>
  [inputs.supportDirectory, inputs.homeDirectory, inputs.workDirectory, inputs.brokerSocketDirectory, inputs.relaySocketDirectory];
const physicalDirectory = (dir: string, stat: Stats, resolved: string): string => {
  if (resolved !== dir || !stat.isDirectory() || stat.uid !== process.getuid?.() || (stat.mode & 0o077) !== 0) throw refused();
  return `${stat.dev}:${stat.ino}`;
};
async function directories(view: Prepared['view']): Promise<readonly string[]> {
  const identities: string[] = [];
  for (const dir of viewDirectories(view)) {
    const stat = await lstat(dir);
    identities.push(physicalDirectory(dir, stat, await realpath(dir)));
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
  const expectedDirectories = input.expectedDirectoryIdentities === undefined
    ? undefined : Object.freeze([...input.expectedDirectoryIdentities]);
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
  const confirmReplacementDirectories = expectedDirectories === undefined ? undefined : () => {
    for (const [index, dir] of viewDirectories(view).entries()) {
      check();
      if (physicalDirectory(dir, lstatSync(dir), realpathSync(dir)) !== expectedDirectories[index]) throw refused();
    }
    check();
  };
  const servers: Server[] = [], sockets = new Set<Socket>();
  let ids: readonly string[] | undefined;
  const authority = input.inspectionAuthority;
  const inspectionAuthority = authority === undefined ? undefined : { verify: authority.verify, confirm: authority.confirm };
  const state = { view, expected, limits, profile, current, audit, inspectionAuthority, args, expires: began + limits.setupMilliseconds,
    ...(expectedDirectories === undefined ? {} : { directories: expectedDirectories }) };
  try {
    await bounded(async () => {
      const initialDirectories = await directories(view); check();
      if (expectedDirectories !== undefined && canonical(initialDirectories) !== canonical(expectedDirectories)) throw refused();
      for (const [dir, name] of [[view.inputs.brokerSocketDirectory, 'b.sock'], [view.inputs.relaySocketDirectory, 'r.sock']] as const) {
        if ((await readdir(dir)).length !== 0) throw refused(); check();
        const server = createServer(socket => { sockets.add(socket); socket.on('error', () => {}); socket.once('close', () => sockets.delete(socket)); socket.end(); });
        const socket = path.join(dir, name);
        servers.push(server); server.on('error', () => {});
        await new Promise<void>((resolve, reject) => {
          server.once('error', reject);
          confirmReplacementDirectories?.();
          server.listen(socket, resolve);
        }); check();
        await chmod(path.join(dir, name), 0o600); check();
      }
      await verify(state, check);
      const probe = await probeUrlSessionView(view.inputs, canaries, port, confirmReplacementDirectories); check(); if (!probe.ok) throw refused();
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
  if (ids === undefined || (expectedDirectories !== undefined && canonical(ids) !== canonical(expectedDirectories))) throw refused();
  preparations.set(receipt, { ...state, directories: ids, expires: performance.now() + limits.setupMilliseconds });
  return receipt;
}

/** Select an unused preparation before binding the real host. Reserve the
 * latter half of the setup window for host binding and launch verification.
 * A preparation with less time left gets a complete inert reprobe. */
export async function finishUrlSessionPreparation(earlier: UrlSessionPreparation,
  prepare: (expectedDirectoryIdentities: readonly string[]) => Promise<UrlSessionPreparation>): Promise<UrlSessionPreparation> {
  const prepared = preparations.get(earlier);
  if (prepared === undefined) throw refused();
  if (prepared.expires - performance.now() > prepared.limits.setupMilliseconds / 2) return earlier;
  preparations.delete(earlier);
  inspectionTraces.delete(earlier);
  const replacement = await prepare(prepared.directories);
  const fresh = preparations.get(replacement);
  if (fresh === undefined || fresh.profile !== prepared.profile || performance.now() >= fresh.expires
    || replacement.commandSha256 !== earlier.commandSha256 || replacement.viewSha256 !== earlier.viewSha256
    || canonical(fresh.expected) !== canonical(prepared.expected)
    || canonical(fresh.directories) !== canonical(prepared.directories)) {
    preparations.delete(replacement);
    inspectionTraces.delete(replacement);
    throw refused();
  }
  return replacement;
}

const STORAGE_STAT_BATCH = 4;
const STORAGE_CENSUS_RESTARTS = 2;
const STORAGE_MAX_DEPTH = 32;
/** Descriptor-anchored, entry/depth/time bounded logical-file census. Symlink,
 * special and multiply linked entries fail closed; it is sampled, not a quota. */
async function storage(roots: readonly string[], limits: UrlLaunchLimits, check: () => void): Promise<number> {
  let bytes = 0, entries = 0;
  const entryDisappeared = Symbol();
  const closing: Promise<void>[] = [];
  let closeFailed = false;
  const drainCloses = async (): Promise<void> => {
    await Promise.all(closing.splice(0));
    if (closeFailed) throw refused();
  };
  const checkCensus = (): void => {
    if (closeFailed) throw refused();
    check();
  };
  const walk = async (file: string, depth: number): Promise<void> => {
    checkCensus();
    if (depth > STORAGE_MAX_DEPTH || ++entries > limits.entries) throw refused();
    // At maximum depth the ancestors and the next anchor already use the
    // former descriptor bound. Drain a previous sibling before opening it.
    if (depth === STORAGE_MAX_DEPTH && closing.length !== 0) {
      await drainCloses();
      checkCensus();
    }
    const handle = await open(file, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW).catch((error: NodeJS.ErrnoException) => {
      // An enumerated child can disappear between lstat and open. Roots
      // must remain available, and other open errors still stop inspection.
      if (depth > 0 && error.code === 'ENOENT') throw entryDisappeared;
      throw error;
    });
    const batch: { file: string; sample: Promise<Stats> }[] = [];
    let listingClose: Promise<void> | undefined;
    try {
      checkCensus();
      const base = `/proc/self/fd/${handle.fd}`, iterator = await opendir(base);
      const inspect = async (): Promise<void> => {
        if (batch.length === 0) return;
        checkCensus();
        const children = batch.splice(0);
        const samples = await Promise.allSettled(children.map(child => child.sample));
        checkCensus();
        const disappeared = (sample: PromiseSettledResult<Stats>): boolean =>
          sample.status === 'rejected' && (sample.reason as NodeJS.ErrnoException).code === 'ENOENT';
        for (const [index, sample] of samples.entries()) {
          checkCensus();
          try {
            if (sample.status === 'rejected') throw disappeared(sample) ? entryDisappeared : sample.reason;
            const stat = sample.value;
            if (stat.isDirectory()) await walk(children[index]!.file, depth + 1);
            else if (stat.isFile() && stat.nlink === 1) bytes += stat.size;
            else throw refused();
          } catch (error) {
            if (error !== entryDisappeared) throw error;
            // A missing entry or nested directory can request a retry. Honor
            // any fatal result already settled for the rest of this batch.
            for (const later of samples.slice(index + 1)) {
              if (later.status === 'rejected') {
                if (disappeared(later)) throw refused();
                throw later.reason;
              }
              const stat = later.value;
              if (!stat.isDirectory() && (!stat.isFile() || stat.nlink !== 1)) throw refused();
            }
            throw error;
          }
          if (!Number.isSafeInteger(bytes) || bytes > limits.storageBytes) return;
        }
      };
      let reachedEnd = false, processingEntry = false, entryFailed = false;
      try {
        for (let item = await iterator.read(); item !== null; item = await iterator.read()) {
          processingEntry = true;
          // Recurse in directory order. Dirent type only schedules reads.
          // The descriptor-relative lstat still decides the entry's type.
          if (!item.isFile()) {
            await inspect();
            if (bytes > limits.storageBytes) return;
          }
          checkCensus();
          if (++entries > limits.entries) throw refused();
          const child = path.join(base, item.name), sample = lstat(child);
          void sample.catch(() => {}); // The batch handles failures after settling.
          batch.push({ file: child, sample });
          if (!item.isFile() || batch.length === STORAGE_STAT_BATCH || entries === limits.entries) {
            await inspect();
            if (bytes > limits.storageBytes) return;
          }
          processingEntry = false;
        }
        reachedEnd = true;
      } catch (error) {
        entryFailed = processingEntry;
        throw error;
      } finally {
        const close = iterator.close();
        // At EOF without a tail batch, the independent iterator and anchor
        // can close together. A tail stat can still require the held anchor.
        if (reachedEnd && batch.length === 0) listingClose = close.catch(() => { closeFailed = true; });
        else if (entryFailed) await close.catch(() => {}); // Preserve the existing entry refusal.
        else await close;
      }
      if (batch.length !== 0) await inspect();
    } finally {
      if (batch.length !== 0) await Promise.allSettled(batch.map(child => child.sample));
      // Its enumeration and anchored reads have settled. Start closing now
      // and let one other directory use the time before joining both closes.
      closing.push(handle.close().catch(() => { closeFailed = true; }));
      if (listingClose !== undefined) await listingClose;
      if (closing.length === 2) await drainCloses();
    }
  };
  const measure = async (): Promise<number> => {
    try {
      for (const root of roots) {
        await walk(root, 0);
        if (bytes > limits.storageBytes) break;
      }
      return bytes;
    } finally {
      // A failed close defeats even a complete count or a disappearance that
      // would otherwise be retried. All started closes are joined in either case.
      await drainCloses();
    }
  };
  for (let restart = 0; ; restart++) {
    try { return await measure(); }
    catch (error) {
      if (error !== entryDisappeared || restart === STORAGE_CENSUS_RESTARTS) throw error;
      // Use only a complete count. Every walk shares the original time and
      // entry budgets, including the attempts that observed a disappearance.
      bytes = 0;
    }
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
  const collect = async (reads: Promise<readonly string[]>[]): Promise<void> => {
    const children = await Promise.allSettled(reads.splice(0));
    check();
    for (const group of children) {
      if (group.status === 'rejected') throw group.reason;
      for (const child of group.value) if (child) pending.push(Number(child));
    }
  };
  while (pending.length) {
    check(); const next = pending.pop()!; if (seen.has(next)) continue; seen.add(next); if (seen.size > maximum) return seen.size;
    const taskRoot = `/proc/${next}/task`, batch: Promise<readonly string[]>[] = [];
    const tasks = await opendir(taskRoot).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    if (tasks === null) continue;
    try {
      // Each thread may own children. Open its file once enumerated, while the
      // task directory is still being read. Join the same fixed-size group and
      // apply its results in enumeration order under the shared deadline.
      for await (const task of tasks) {
        check(); if (!/^[0-9]+$/u.test(task.name) || ++taskEntries > 4096) throw refused();
        const read = taskChildren(`${taskRoot}/${task.name}/children`, check);
        void read.catch(() => {}); // The group checks settlement after enumeration.
        batch.push(read);
        if (batch.length === TASK_READ_BATCH) await collect(batch);
      }
    } catch (error) {
      // An already-open listing may have omitted children before it failed.
      // Join all started reads before refusing the incomplete census.
      await Promise.allSettled(batch);
      throw error;
    }
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
export async function launchRestrictedUrlSession(input: {
  readonly preparation: UrlSessionPreparation;
  readonly host: SessionHost;
  /** Synchronous guard after verification and before releasing the spawn. */
  readonly beforeSpawn?: () => boolean;
}): Promise<UrlSessionProcess> {
  const state = preparations.get(input.preparation), host = input.host;
  if (!state) throw refused(); preparations.delete(input.preparation);
  const trace = inspectionTraces.get(input.preparation);
  if (trace !== undefined) inspectionTraces.delete(input.preparation);
  // Ordered launches require this factory's exact selected host. Reject a
  // copied object before inspecting any caller-controlled host properties.
  if (!isSessionProfile(state.profile) && (!isOrderedDesignSessionProfile(state.profile)
    || !isOrderedDesignHostFor(host, state.profile))) throw refused();
  const { view, limits } = state;
  if (!host || typeof host.close !== 'function' || host.brokerSocket !== path.join(view.inputs.brokerSocketDirectory, 'b.sock')
    || host.relaySocket !== path.join(view.inputs.relaySocketDirectory, 'r.sock')) throw refused();
  const closeHost = host.close.bind(host), began = performance.now(); let active = true;
  const check = (): void => { if (!active || performance.now() >= state.expires || performance.now() - began >= limits.setupMilliseconds) throw refused(); };
  try {
    await bounded(async () => {
      check(); await verify(state, check);
      await state.audit(deepFreeze({ event: 'session-launch-attempt', profileSha256: state.profile.digest,
        commandSha256: input.preparation.commandSha256, viewSha256: input.preparation.viewSha256, limits })); check();
      await verify(state, check);
    }, Math.min(limits.setupMilliseconds, Math.max(1, state.expires - performance.now())));
    check();
    if (input.beforeSpawn !== undefined) {
      if (input.beforeSpawn() !== true) throw refused();
      check();
    }
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
    if (finishedCapture || reason !== 'exited') return;
    // Exit may already be known while the child's streams and process group
    // are still closing. A cleanup request must preserve that terminal result.
    if (why !== 'stopped' || !exited) reason = why;
    if (endTimer !== undefined) return;
    signal('SIGTERM');
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
    if (exited || finishedCapture || pendingSample !== undefined || reason !== 'exited') return;
    let sampleActive = true;
    const sampleBegan = performance.now();
    const observation = trace === undefined ? undefined : beginInspectionTrace(trace, sampleBegan);
    let phase: InspectionPhase = 'storage', processRejection: unknown;
    const checkSample = (source = phase): void => {
      const inactive = !sampleActive || exited || finishedCapture || reason !== 'exited';
      if (inactive || performance.now() - sampleBegan >= limits.inspectionMilliseconds) {
        const error = refused();
        observation?.note(error, source, inactive ? 'sample-inactive' : 'sample-deadline');
        throw error;
      }
    };
    // Cadence and completion are separate finite limits. Other native roles
    // and the shared host may delay descriptor IO; admit no partial census.
    pendingSample = bounded(async () => {
      // The walks share a deadline. Keep storage's earlier refusal and
      // publication order even if the process walk completes first.
      let processCount: Promise<number | null> | undefined;
      if (child.pid !== undefined) {
        if (observation === undefined) processCount = descendants(child.pid, limits.processes, checkSample).catch(() => null);
        else {
          observation.begin('process');
          processCount = descendants(child.pid, limits.processes, () => checkSample('process')).then(count => {
            observation.settle('process', 'accepted');
            return count;
          }, error => {
            processRejection = error;
            observation.settle('process', 'rejected');
            return null;
          });
        }
      }
      const authority = state.inspectionAuthority;
      // Verification reads authority only. Census refusal takes precedence and
      // the exact live guard runs when both the census and verification settle.
      if (authority !== undefined) observation?.begin('verify');
      const verification = authority === undefined ? undefined : Promise.resolve().then(authority.verify).then(result => {
        observation?.settle('verify', result === true ? 'accepted' : 'refused');
        return result === true;
      }, () => { observation?.settle('verify', 'rejected'); return false; });
      observation?.begin('storage');
      let storageBytes: number;
      try { storageBytes = await storage([view.inputs.homeDirectory, view.inputs.workDirectory], limits, checkSample); }
      catch (error) { observation?.settle('storage', 'rejected'); throw error; }
      observation?.settle('storage', 'accepted');
      checkSample();
      sampledStorageBytes = storageBytes;
      if (sampledStorageBytes > limits.storageBytes) {
        observation?.refuse('storage', 'resource-limit'); stop('storage-limit'); return;
      }
      if (processCount !== undefined) {
        phase = 'process';
        const count = await processCount;
        checkSample();
        if (count === null) {
          const error = refused();
          observation?.inherit(error, processRejection);
          throw error;
        }
        peakProcesses = Math.max(peakProcesses ?? 0, count);
        if (count > limits.processes) {
          observation?.refuse('process', 'resource-limit'); stop('process-limit'); return;
        }
      }
      phase = verification === undefined ? 'current' : 'verify';
      if (verification === undefined) observation?.begin('current');
      let stillCurrent = await (verification ?? state.current());
      if (verification === undefined) observation?.settle('current', stillCurrent === true ? 'accepted' : 'refused');
      checkSample();
      if (authority !== undefined) {
        phase = 'confirm';
        observation?.begin('confirm');
        stillCurrent = authority.confirm(stillCurrent === true);
        observation?.settle('confirm', stillCurrent === true ? 'accepted' : 'refused');
        checkSample();
      }
      if (stillCurrent !== true) {
        observation?.refuse(phase, 'authority-refused'); stop('inspection-failed');
      }
    }, limits.inspectionMilliseconds, observation === undefined ? undefined : error => {
      observation.note(error, phase, 'bounded-timeout');
    }).catch(error => {
      if (exited || finishedCapture) return;
      observation?.reject(error, phase);
      stop('inspection-failed');
    })
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
  launchedProcesses.set(launched, () => reason === 'exited' && !exited && !closed && !finishedCapture && child.exitCode === null && child.signalCode === null);
  return launched;
}
