// A minimal Chrome DevTools Protocol driver — task 4.4 (syzygy-1z3.20).
//
// PWB-REQ-016's oracle independence asks that DOM/accessibility-tree
// enumeration and input events come from a browser driver outside the
// renderer. This module is that driver with no new dependency: it launches
// a locally installed Chrome/Chromium in headless mode, speaks the DevTools
// protocol over Node's own WebSocket, and exposes exactly what the
// accessibility checks need — navigate, evaluate, real key presses and the
// full accessibility tree. It never touches a Butlers repository and only
// ever opens the `file://` pages the caller writes.

import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync, lstatSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, rmSync, statSync, type BigIntStats } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';

import { removeTemporaryDirectory, type TemporaryDirectoryCleanupOptions } from './temporary-directory.js';

interface AxNode {
  readonly nodeId: string;
  readonly ignored: boolean;
  readonly role: string;
  readonly name: string;
  readonly backendDOMNodeId?: number;
  readonly childIds: readonly string[];
}

type KeyName = 'Tab' | 'Enter' | 'Space';

export interface BrowserPage {
  navigate(url: string): Promise<void>;
  setViewport(width: number, height: number): Promise<void>;
  /** Evaluates `expression` in the page and returns its JSON value. */
  evaluate<T>(expression: string): Promise<T>;
  /** Dispatches a real key press (down + up) through the browser's input pipeline. */
  press(key: KeyName, modifiers?: { readonly shift?: boolean }): Promise<void>;
  axTree(): Promise<readonly AxNode[]>;
  /** The browser-computed accessible name of each element of the array
   * `expression` evaluates to, in order (PWB-REQ-016 distinct names). The
   * name comes from the browser's own accessibility computation for that
   * DOM node, never from page script. */
  accessibleNames(expression: string): Promise<readonly string[]>;
  /** Closes this page's target; the browser stays open for other pages. */
  close(): Promise<void>;
}

// Test seam: exported type the tests name; production code uses it only inside this file.
export interface Browser {
  readonly executable: string;
  readonly version: string;
  newPage(): Promise<BrowserPage>;
  close(): Promise<void>;
}

const CANDIDATE_EXECUTABLES = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'] as const;

/** The browser executable to drive: `SYZYGY_POC_BROWSER` if set, else the
 * first Chrome/Chromium on PATH; `undefined` when none is installed. */
export function findBrowserExecutable(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const named = env['SYZYGY_POC_BROWSER'];
  if (named !== undefined && named !== '') return named;
  for (const candidate of CANDIDATE_EXECUTABLES) {
    const probe = spawnSync('which', [candidate], { encoding: 'utf8' });
    if (probe.status === 0 && probe.stdout.trim() !== '') return probe.stdout.trim();
  }
  return undefined;
}

interface CdpMessage {
  readonly id?: number;
  readonly method?: string;
  readonly params?: unknown;
  readonly result?: unknown;
  readonly error?: { readonly message: string };
  readonly sessionId?: string;
}

const COMMAND_TIMEOUT_MS = 30_000;

class CdpConnection {
  private nextId = 1;
  private readonly pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  private readonly listeners = new Set<(message: CdpMessage) => void>();

  private constructor(private readonly socket: WebSocket) {
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data)) as CdpMessage;
      if (message.id !== undefined) {
        const waiter = this.pending.get(message.id);
        if (waiter === undefined) return;
        this.pending.delete(message.id);
        if (message.error !== undefined) waiter.reject(new Error(`CDP: ${message.error.message}`));
        else waiter.resolve(message.result);
        return;
      }
      for (const listener of this.listeners) listener(message);
    });
  }

  static open(url: string): Promise<CdpConnection> {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(url);
      socket.addEventListener('open', () => resolve(new CdpConnection(socket)), { once: true });
      socket.addEventListener('error', () => reject(new Error(`CDP: cannot connect to ${url}`)), { once: true });
    });
  }

  send<T>(method: string, params: unknown = {}, sessionId?: string, timeoutMs = COMMAND_TIMEOUT_MS): Promise<T> {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP: ${method} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value as T);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
      try { this.socket.send(JSON.stringify({ id, method, params, ...(sessionId === undefined ? {} : { sessionId }) })); }
      catch (error) {
        this.pending.delete(id);
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  waitFor(method: string, sessionId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.listeners.delete(listener);
        reject(new Error(`CDP: no ${method} event within ${COMMAND_TIMEOUT_MS}ms`));
      }, COMMAND_TIMEOUT_MS);
      const listener = (message: CdpMessage): void => {
        if (message.method === method && message.sessionId === sessionId) {
          clearTimeout(timer);
          this.listeners.delete(listener);
          resolve();
        }
      };
      this.listeners.add(listener);
    });
  }

  close(): void {
    for (const [id, waiter] of this.pending) {
      this.pending.delete(id);
      waiter.reject(new Error('CDP connection closed'));
    }
    this.socket.close();
  }
}

const KEYS: Record<KeyName, { readonly key?: string; readonly code: string; readonly keyCode: number; readonly text?: string }> = {
  Tab: { code: 'Tab', keyCode: 9 },
  Enter: { code: 'Enter', keyCode: 13, text: '\r' },
  Space: { key: ' ', code: 'Space', keyCode: 32, text: ' ' },
};

interface EvaluateResult {
  readonly result: { readonly value?: unknown };
  readonly exceptionDetails?: { readonly text: string; readonly exception?: { readonly description?: string } };
}

interface RawAxNode {
  readonly nodeId: string;
  readonly ignored: boolean;
  readonly role?: { readonly value?: unknown };
  readonly name?: { readonly value?: unknown };
  readonly backendDOMNodeId?: number;
  readonly childIds?: readonly string[];
}

class CdpPage implements BrowserPage {
  constructor(private readonly connection: CdpConnection, private readonly sessionId: string, private readonly targetId: string) {}

  async close(): Promise<void> {
    await this.connection.send('Target.closeTarget', { targetId: this.targetId });
  }

  async setViewport(width: number, height: number): Promise<void> {
    await this.connection.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false }, this.sessionId);
  }

  async navigate(url: string): Promise<void> {
    const loaded = this.connection.waitFor('Page.loadEventFired', this.sessionId);
    await this.connection.send('Page.navigate', { url }, this.sessionId);
    await loaded;
  }

  async evaluate<T>(expression: string): Promise<T> {
    const outcome = await this.connection.send<EvaluateResult>('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, this.sessionId);
    if (outcome.exceptionDetails !== undefined) {
      throw new Error(`page script failed: ${outcome.exceptionDetails.exception?.description ?? outcome.exceptionDetails.text}`);
    }
    return outcome.result.value as T;
  }

  async press(key: KeyName, modifiers: { readonly shift?: boolean } = {}): Promise<void> {
    const spec = KEYS[key];
    const modifierBits = modifiers.shift === true ? 8 : 0;
    const base = { key: spec.key ?? key, code: spec.code, windowsVirtualKeyCode: spec.keyCode, nativeVirtualKeyCode: spec.keyCode, modifiers: modifierBits };
    await this.connection.send('Input.dispatchKeyEvent', { type: spec.text === undefined ? 'rawKeyDown' : 'keyDown', ...base, ...(spec.text === undefined ? {} : { text: spec.text }) }, this.sessionId);
    await this.connection.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base }, this.sessionId);
  }

  async axTree(): Promise<readonly AxNode[]> {
    const tree = await this.connection.send<{ readonly nodes: readonly RawAxNode[] }>('Accessibility.getFullAXTree', {}, this.sessionId);
    return tree.nodes.map((node) => ({
      nodeId: node.nodeId,
      ignored: node.ignored,
      role: typeof node.role?.value === 'string' ? node.role.value : '',
      name: typeof node.name?.value === 'string' ? node.name.value : '',
      ...(node.backendDOMNodeId === undefined ? {} : { backendDOMNodeId: node.backendDOMNodeId }),
      childIds: node.childIds ?? [],
    }));
  }

  async accessibleNames(expression: string): Promise<readonly string[]> {
    const array = await this.connection.send<{ readonly result: { readonly objectId?: string }; readonly exceptionDetails?: { readonly text: string } }>('Runtime.evaluate', { expression, returnByValue: false }, this.sessionId);
    if (array.exceptionDetails !== undefined || array.result.objectId === undefined) throw new Error(`page script failed: ${array.exceptionDetails?.text ?? 'no element array'}`);
    const properties = await this.connection.send<{ readonly result: readonly { readonly name: string; readonly value?: { readonly objectId?: string } }[] }>('Runtime.getProperties', { objectId: array.result.objectId, ownProperties: true }, this.sessionId);
    const elements = properties.result
      .filter((property) => /^[0-9]+$/.test(property.name))
      .sort((a, b) => Number(a.name) - Number(b.name));
    const names: string[] = [];
    for (const element of elements) {
      const objectId = element.value?.objectId;
      if (objectId === undefined) throw new Error(`array entry ${element.name} is not an element`);
      const partial = await this.connection.send<{ readonly nodes: readonly RawAxNode[] }>('Accessibility.getPartialAXTree', { objectId, fetchRelatives: false }, this.sessionId);
      const node = partial.nodes[0];
      names.push(typeof node?.name?.value === 'string' ? node.name.value : '');
    }
    await this.connection.send('Runtime.releaseObject', { objectId: array.result.objectId }, this.sessionId);
    return names;
  }
}

function waitForDevToolsUrl(child: ChildProcess): Promise<string> {
  return new Promise((resolve, reject) => {
    let buffered = '';
    const timer = setTimeout(() => reject(new Error(`browser did not announce a DevTools endpoint within ${COMMAND_TIMEOUT_MS}ms:\n${buffered.slice(-2000)}`)), COMMAND_TIMEOUT_MS);
    child.stderr?.on('data', (chunk: Buffer) => {
      buffered += chunk.toString('utf8');
      const match = /DevTools listening on (ws:\/\/\S+)/.exec(buffered);
      if (match !== null) {
        clearTimeout(timer);
        resolve(match[1] as string);
      }
    });
    child.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`browser exited with ${code ?? 'signal'} before announcing a DevTools endpoint:\n${buffered.slice(-2000)}`));
    });
  });
}

/** Chrome keeps its process singleton's socket outside the profile, in a directory of its
 * own directly under the temp directory, and links `<profile>/SingletonSocket` to the
 * socket in it. The name is `<product>.<random>`, with a leading dot in Chrome 120
 * (`.com.google.Chrome.<random>`) and none in Chrome 155 (`com.google.Chrome.<random>`)
 * or the Chrome for Testing builds 145 to 154 (`org.chromium.Chromium.<random>`); where
 * the dot went between 120 and 145 is not known.
 * A Chrome that exits cleanly removes the directory. One that is killed, as
 * closeDisposableBrowser does when the leader misses its close grace, leaves it behind the
 * profile (syzygy-bpyt.4.11). Chrome unlinks the profile's link as it starts to shut down,
 * so the directory is read from the link while Chrome runs, and again at removal for a
 * Chrome that was killed before it announced itself. */
const CHROME_SINGLETON_DIRECTORY = /^\.?(?:com\.google\.Chrome|org\.chromium\.Chromium)\.[A-Za-z0-9]+$/;

function isChromeSingletonDirectory(directory: string): boolean {
  return dirname(directory) === tmpdir() && CHROME_SINGLETON_DIRECTORY.test(basename(directory));
}

/** A singleton directory as it was when it was read: its path and the identity of the
 * directory (device and inode). Chrome removes the directory itself on a clean exit, and
 * another Chrome in the same temp directory can then make one under the same name before
 * this one is removed. The identity makes a mistaken removal unlikely, not impossible: a file
 * system may reuse an inode number, so a directory made under the same name that happens to
 * take the freed device and inode passes for the one that was read. */
export interface ChromeSingletonDirectory {
  readonly path: string;
  readonly dev: bigint;
  readonly ino: bigint;
}

/** How an entry is read: without following a link, and with exact numbers (an inode can
 * exceed what a number holds exactly, and a neighbouring inode is the likely one to clash). */
type ReadEntry = (path: string) => BigIntStats;
const readEntry: ReadEntry = (path) => lstatSync(path, { bigint: true });

/** Whether an entry is the running user's; where the system has no user ids there is no
 * user to check. */
function ownedByRunningUser(entry: BigIntStats): boolean {
  const user = process.getuid?.();
  return user === undefined || entry.uid === BigInt(user);
}

/** The singleton directory the profile's Chrome made, if the profile's link names a socket
 * in a directory of that name directly under the temp directory. The link is read only if
 * the profile and the link are the running user's: in a shared temp directory another user
 * can make a profile path first and link it to a directory of ours.
 *
 * Scope of the guarantee: it is for a private profile (`mkdtemp`, mode 0700) in a sticky or
 * private temp directory. Each owner check holds at the instant of its `lstat`, and the
 * profile is judged as the entry itself (a symlink another user made is theirs, whatever it
 * points at), never after resolving it. Two windows for a same-user racer stay open: between
 * the owner `lstat` and `readlink` of the link, and between the identity `lstat` and the
 * `rmSync` in removeChromeSingletonDirectory (the latter measured: a same-user racer
 * removed the replacement in 12 of 1000 trials). Another account cannot use either in a
 * private or sticky temp directory. Refusing a group- or world-writable profile is not
 * done (syzygy-bpyt.4.28 item 3): mkdtemp makes the profile 0700 and a writable one is
 * already not private, so the owner checks above are the whole rule. */
function chromeSingletonDirectory(profile: string, lstat: ReadEntry = readEntry): ChromeSingletonDirectory | undefined {
  const link = join(profile, 'SingletonSocket');
  try {
    if (!ownedByRunningUser(lstat(profile)) || !ownedByRunningUser(lstat(link))) return undefined;
    const path = dirname(readlinkSync(link));
    if (!isChromeSingletonDirectory(path)) return undefined;
    const { dev, ino } = lstat(path);
    return { path, dev, ino };
  } catch { return undefined; }
}

/** Removes the directory only if it is named like Chrome's, directly under the temp
 * directory, a real directory (never a link), the running user's and the very directory that
 * was read. A failure leaves it: tidying must not fail the run. */
function removeChromeSingletonDirectory(recorded: ChromeSingletonDirectory, lstat: ReadEntry = readEntry): void {
  if (!isChromeSingletonDirectory(recorded.path)) return;
  try {
    const entry = lstat(recorded.path);
    if (entry.isDirectory() && ownedByRunningUser(entry) && entry.dev === recorded.dev && entry.ino === recorded.ino) rmSync(recorded.path, { recursive: true, force: true });
  } catch { /* left for the temp directory's owner */ }
}

export interface BrowserProfileRemoval extends TemporaryDirectoryCleanupOptions {
  /** The singleton directory read while Chrome ran; read from the profile's link if absent. */
  readonly singleton?: ChromeSingletonDirectory;
  /** How entries are read, `lstatSync` with exact numbers by default. A test answers another
   * owner or device for one path, which a file system cannot be made to do without privilege. */
  readonly lstat?: (path: string) => BigIntStats;
}

// Test seam: exported for the tests; production code reaches it only inside this file.
/** Removes the throwaway profile after Chrome has released its files, and the Chrome
 * singleton directory that profile's Chrome made beside it. */
export function removeBrowserProfile(
  profile: string,
  options: BrowserProfileRemoval = {},
): void {
  const singleton = options.singleton ?? chromeSingletonDirectory(profile, options.lstat);
  removeTemporaryDirectory(profile, options);
  if (singleton !== undefined) removeChromeSingletonDirectory(singleton, options.lstat);
}

interface DisposableBrowserProcess {
  readonly exitCode: number | null;
  readonly signalCode: NodeJS.Signals | null;
  kill(signal: NodeJS.Signals): boolean;
  once(event: 'exit', listener: () => void): unknown;
}

const BROWSER_CLOSE_GRACE_MS = 1_000;
const BROWSER_PROFILE_DRAIN_MS = 3_000;

interface PrivateBrowserGroup {
  readonly id: number;
  readonly uid: number;
  readonly leaderStart: string;
}

function processStat(value: string): { readonly state: string; readonly group: number; readonly session: number; readonly started: string } {
  const end = value.lastIndexOf(')');
  const fields = end < 0 ? [] : value.slice(end + 2).trim().split(/\s+/);
  const group = Number(fields[2]);
  const session = Number(fields[3]);
  if (fields.length < 20 || !Number.isSafeInteger(group) || !Number.isSafeInteger(session) || !fields[19]) {
    throw new Error('cannot verify private browser process group');
  }
  return { state: fields[0] as string, group, session, started: fields[19] as string };
}

/** detached:true gives this Chrome a new session and process group. Capture
 * the launched leader before any cleanup; a later PID alone is insufficient. */
function privateBrowserGroup(child: ChildProcess): PrivateBrowserGroup {
  const id = child.pid;
  const uid = process.getuid?.();
  if (id === undefined || uid === undefined) throw new Error('cannot verify private browser group identity');
  let owner: number;
  let identity: ReturnType<typeof processStat>;
  try {
    owner = statSync(`/proc/${id}`).uid;
    identity = processStat(readFileSync(`/proc/${id}/stat`, 'utf8'));
  } catch { throw new Error('cannot verify private browser group identity'); }
  if (owner !== uid || identity.group !== id || identity.session !== id || identity.state === 'Z') {
    throw new Error('browser did not enter its private process group');
  }
  return { id, uid, leaderStart: identity.started };
}

function vanished(cause: unknown): boolean {
  const code = cause !== null && typeof cause === 'object' && 'code' in cause ? String(cause.code) : '';
  return code === 'ENOENT' || code === 'ESRCH';
}

/** Browser helpers can omit --user-data-dir or rewrite their entire argv into
 * one field. Session membership, including a changed child process group,
 * is the observable boundary of this one detached Chrome launch. */
function livePrivateBrowserMembers(group: PrivateBrowserGroup): number[] {
  const live: number[] = [];
  // Plain names, not Dirents: withFileTypes may lstat each entry, and a
  // process exiting mid-scan then surfaced as a raw ENOENT (syzygy-za9v).
  // A numeric /proc entry is always a process directory.
  for (const name of readdirSync('/proc')) {
    if (!/^\d+$/.test(name)) continue;
    const proc = `/proc/${name}`;
    let identity: ReturnType<typeof processStat>;
    try { identity = processStat(readFileSync(`${proc}/stat`, 'utf8')); }
    catch (cause) {
      if (vanished(cause) || !existsSync(proc)) continue;
      try { if (statSync(proc).uid !== group.uid) continue; }
      catch (statCause) { if (vanished(statCause)) continue; }
      throw new Error('cannot verify private browser process identity');
    }
    // A dead entry holds no files, and while it is reaped the kernel may
    // already report its session as 0 beside its old group: gone, not moved.
    if (identity.state === 'Z' || identity.state === 'X') continue;
    if (identity.group !== group.id && identity.session !== group.id) continue;
    let owner: number;
    try { owner = statSync(proc).uid; }
    catch (cause) { if (vanished(cause)) continue; throw new Error('cannot verify private browser process owner'); }
    if (owner !== group.uid || identity.session !== group.id) throw new Error('private browser group membership changed');
    if (Number(name) === group.id && identity.started !== group.leaderStart) {
      throw new Error('private browser group leader identity changed');
    }
    live.push(Number(name));
  }
  return live;
}

// Test seam: exported for the tests; production code reaches it only inside this file.
/** Stops every live member of the private group at once. A leader killed
 * alone orphans its helpers (the network service, renderers, and the `cat`
 * pipes the google-chrome wrapper forks), which then exit on their own
 * schedule: seconds under load, past the profile drain (syzygy-za9v). The
 * caller signals only after a scan found live members, so the group id is
 * still held by them and cannot have been reused. */
export function killPrivateBrowserMembers(
  group: PrivateBrowserGroup,
  live: readonly number[],
  kill: (pid: number, signal: NodeJS.Signals) => void = (pid, signal) => { process.kill(pid, signal); },
): void {
  // The group first (atomic, covers members forked after the scan), then any
  // session member that left the group.
  for (const pid of [-group.id, ...live]) {
    try { kill(pid, 'SIGKILL'); }
    catch (cause) { if (!vanished(cause)) throw cause; }
  }
}

interface BrowserCleanupOptions {
  readonly removeProfile?: (path: string) => void;
  readonly closeGraceMs?: number;
  readonly profileDrainMs?: number;
  readonly groupProcesses?: (group: PrivateBrowserGroup) => readonly number[];
  /** Signals live members; defaults to a real kill only with the real scan. */
  readonly stopMembers?: (group: PrivateBrowserGroup, live: readonly number[]) => void;
  readonly now?: () => number;
}

// Test seam: exported for the tests; production code reaches it only inside this file.
/** Browser.close may never acknowledge a protocol request. The browser is a
 * disposable local fixture, so a bounded graceful request is followed by a
 * hard stop when needed. Once the leader has exited, any member still alive
 * is stopped with the whole group. Remove the profile only after two empty
 * scans confirm that no member is left. */
export async function closeDisposableBrowser(
  connection: { close(): void; send(method: string, params?: unknown, sessionId?: string, timeoutMs?: number): Promise<unknown> },
  child: DisposableBrowserProcess,
  profile: string,
  group: PrivateBrowserGroup,
  options: BrowserCleanupOptions = {},
): Promise<void> {
  const closeGraceMs = options.closeGraceMs ?? BROWSER_CLOSE_GRACE_MS;
  const exited = new Promise<void>((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) resolve();
    else child.once('exit', () => resolve());
  });
  const deadline = Date.now() + closeGraceMs;
  let acknowledged = false;
  try {
    await connection.send('Browser.close', {}, undefined, closeGraceMs);
    acknowledged = true;
  } catch { /* a missing acknowledgement never blocks cleanup */ }
  const remaining = deadline - Date.now();
  if (acknowledged && remaining > 0 && child.exitCode === null && child.signalCode === null) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([exited, new Promise<void>(resolve => { timer = setTimeout(resolve, remaining); })]);
    if (timer !== undefined) clearTimeout(timer);
  }
  connection.close();
  if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
  await exited;
  const now = options.now ?? Date.now;
  const drainDeadline = now() + (options.profileDrainMs ?? BROWSER_PROFILE_DRAIN_MS);
  const groupProcesses = options.groupProcesses ?? livePrivateBrowserMembers;
  const stopMembers = options.stopMembers ?? (options.groupProcesses === undefined ? killPrivateBrowserMembers : () => undefined);
  let emptyScans = 0;
  while (true) {
    const live = groupProcesses(group);
    emptyScans = live.length === 0 ? emptyScans + 1 : 0;
    if (live.length > 0) stopMembers(group, live);
    // A second scan closes the /proc enumeration race with a child that is
    // being forked while the first scan walks entries.
    if (now() > drainDeadline) {
      if (live.length > 0) throw new Error(`private browser profile still held by ${live.length} process(es)`);
      throw new Error('private browser profile drain did not verify two empty scans before deadline');
    }
    if (emptyScans >= 2) break;
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  (options.removeProfile ?? removeBrowserProfile)(profile);
}

/** Launches `executable` headless with a throwaway profile and connects. */
export async function launchBrowser(executable: string): Promise<Browser> {
  const profile = mkdtempSync(join(tmpdir(), 'syzygy-poc-browser-'));
  let singleton: ChromeSingletonDirectory | undefined;
  const cleanup: BrowserCleanupOptions = { removeProfile: (path) => removeBrowserProfile(path, { singleton }) };
  const child = spawn(
    executable,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--disable-background-networking',
      // Chrome drops every same-document navigation past 200 in a ten-second
      // window ("Throttling navigation to prevent the browser from hanging").
      // A scripted sweep presses Enter on hundreds of fragment links far
      // faster than a reader can, so without this flag every activation after
      // the 200th silently stays on the previous hash (syzygy-1z3.30).
      '--disable-ipc-flooding-protection',
      `--user-data-dir=${profile}`,
      '--remote-debugging-port=0',
      '--window-size=1280,2000',
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'], detached: true },
  );
  let group: PrivateBrowserGroup;
  try { group = privateBrowserGroup(child); }
  catch (error) {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    // The launched group's identity was not established. Retain its profile.
    throw error;
  }
  let connection: CdpConnection;
  try {
    connection = await CdpConnection.open(await waitForDevToolsUrl(child));
  } catch (error) {
    await closeDisposableBrowser({ close: () => undefined, send: async () => { throw new Error('CDP unavailable'); } }, child, profile, group, cleanup);
    throw error;
  }
  singleton = chromeSingletonDirectory(profile);
  let versionInfo: { readonly product: string };
  try { versionInfo = await connection.send<{ readonly product: string }>('Browser.getVersion'); }
  catch (error) { await closeDisposableBrowser(connection, child, profile, group, cleanup); throw error; }
  return {
    executable,
    version: versionInfo.product,
    async newPage(): Promise<BrowserPage> {
      const { targetId } = await connection.send<{ readonly targetId: string }>('Target.createTarget', { url: 'about:blank' });
      const { sessionId } = await connection.send<{ readonly sessionId: string }>('Target.attachToTarget', { targetId, flatten: true });
      await connection.send('Page.enable', {}, sessionId);
      await connection.send('Runtime.enable', {}, sessionId);
      await connection.send('DOM.enable', {}, sessionId);
      await connection.send('Accessibility.enable', {}, sessionId);
      // Keyboard focus must be real: without an emulated focus the page
      // never receives sequential focus navigation in headless mode.
      await connection.send('Emulation.setFocusEmulationEnabled', { enabled: true }, sessionId);
      return new CdpPage(connection, sessionId, targetId);
    },
    async close(): Promise<void> {
      await closeDisposableBrowser(connection, child, profile, group, cleanup);
    },
  };
}

// Test seam: exported for the tests; no production code uses it.
/** Own the complete page lifetime once Chrome has launched. A failed target
 * creation still closes the browser; a failed target close cannot skip the
 * private child/session drain in browser.close(). */
export async function withBrowserPage<T>(
  executable: string,
  use: (page: BrowserPage) => Promise<T>,
  launch: (path: string) => Promise<Browser> = launchBrowser,
): Promise<T> {
  const browser = await launch(executable);
  let page: BrowserPage | undefined;
  try {
    page = await browser.newPage();
    return await use(page);
  } finally {
    try { if (page !== undefined) await page.close(); }
    finally { await browser.close(); }
  }
}
