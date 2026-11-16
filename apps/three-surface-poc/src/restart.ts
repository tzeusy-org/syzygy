import { spawn, execFileSync } from 'node:child_process';
import { closeSync, constants, openSync, readFileSync, readlinkSync, realpathSync, statSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';
import { sha256 } from '@syzygy/support';

// Test seam: exported type the tests name; production code uses it only inside this file.
export interface PocListener {
  readonly pid: number;
  readonly started: string;
  readonly argv: readonly string[];
  readonly cwd: string;
}

export class RestartRefusal extends Error {
  constructor(readonly code: string) { super(`POC restart refused: ${code}`); }
}

interface RestartOptions {
  readonly port: number;
  readonly timeoutMs?: number;
  /** Production requires the built POC main; fixture system tests pass their
   * isolated listener script explicitly. */
  readonly expectedScript?: string;
  readonly expectedCwd?: string;
  readonly inspect?: (port: number) => PocListener | null;
}

function requiredFlag(argv: readonly string[], flag: string): string {
  const positions = argv.flatMap((arg, index) => arg === flag ? [index] : []);
  if (positions.length !== 1 || !argv[positions[0]! + 1]) throw new RestartRefusal('listener-arguments-invalid');
  return argv[positions[0]! + 1] as string;
}

function fingerprint(listener: PocListener): string {
  return JSON.stringify([listener.pid, listener.started, listener.cwd, listener.argv]);
}

function sameListener(first: PocListener, second: PocListener): boolean {
  return fingerprint(first) === fingerprint(second);
}

// Test seam: exported for the tests; production code reaches it only inside this file.
export function listenerPidFromSs(output: string, port: number): number | null {
  const rows = output.split('\n').filter(line => line.includes(`127.0.0.1:${port}`));
  if (rows.length === 0) return null;
  if (rows.length !== 1) throw new RestartRefusal('multiple-listeners');
  const pids = [...rows[0]!.matchAll(/pid=(\d+)/g)].map(match => Number(match[1]));
  if (pids.length !== 1 || !Number.isSafeInteger(pids[0])) throw new RestartRefusal('listener-owner-ambiguous');
  return pids[0] as number;
}

// Test seam: exported for the tests; production code reaches it only inside this file.
/** `ss` supplies the socket's process owner; /proc binds it to a process
 * generation and command. A missing owner or multiple owners fails closed. */
export function inspectPocPort(port: number): PocListener | null {
  let output: string;
  try {
    output = execFileSync('ss', ['-H', '-ltnp', `sport = :${port}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch { throw new RestartRefusal('listener-inspection-failed'); }
  const pid = listenerPidFromSs(output, port);
  if (pid === null) return null;
  try {
    if (statSync(`/proc/${pid}`).uid !== process.getuid?.()) throw new RestartRefusal('listener-owner-mismatch');
    const argv = readFileSync(`/proc/${pid}/cmdline`, 'utf8').split('\0').filter(Boolean);
    const cwd = realpathSync(readlinkSync(`/proc/${pid}/cwd`));
    const stat = readFileSync(`/proc/${pid}/stat`, 'utf8');
    const fields = stat.slice(stat.lastIndexOf(')') + 2).trim().split(/\s+/);
    const started = fields[19];
    if (argv.length < 2 || started === undefined) throw new RestartRefusal('listener-identity-incomplete');
    return { pid, started, argv, cwd };
  } catch (error) {
    if (error instanceof RestartRefusal) throw error;
    throw new RestartRefusal('listener-identity-unreadable');
  }
}

function targetOf(listener: PocListener, options: RestartOptions): { readonly stateDir: string; readonly credentialPath: string } {
  const expectedScript = realpathSync(options.expectedScript ?? resolve('apps/three-surface-poc/dist/main.js'));
  const actualScript = realpathSync(resolve(listener.cwd, listener.argv[1] as string));
  if (actualScript !== expectedScript || (options.expectedCwd !== undefined && listener.cwd !== realpathSync(options.expectedCwd))) {
    throw new RestartRefusal('not-the-requested-poc-listener');
  }
  if (requiredFlag(listener.argv, '--port') !== String(options.port)) throw new RestartRefusal('listener-port-mismatch');
  const repo = requiredFlag(listener.argv, '--repo');
  const stateDir = requiredFlag(listener.argv, '--state-dir');
  if (!isAbsolute(repo) || !isAbsolute(stateDir)) throw new RestartRefusal('listener-arguments-invalid');
  return { stateDir: realpathSync(stateDir), credentialPath: join(realpathSync(stateDir), 'machine-credential.token') };
}

function credentialDigest(path: string): string {
  try { return sha256(readFileSync(path)); }
  catch { throw new RestartRefusal('credential-unreadable'); }
}

const pause = (milliseconds: number): Promise<void> => new Promise(resolvePause => setTimeout(resolvePause, milliseconds));

/** One bounded replacement. The lock is outside the daemon state directory
 * and contains no PID or secret. A stale lock requires operator inspection;
 * the script never guesses that it is safe to remove one. */
export async function restartOnePocListener(options: RestartOptions): Promise<{ readonly oldPid: number; readonly newPid: number; readonly port: number; readonly stateDir: string }> {
  if (!Number.isSafeInteger(options.port) || options.port < 1 || options.port > 65535) throw new RestartRefusal('invalid-port');
  const timeoutMs = options.timeoutMs ?? 10_000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30_000) throw new RestartRefusal('invalid-timeout');
  const lockPath = join(tmpdir(), `syzygy-poc-restart-${process.getuid?.() ?? 'unknown'}-${options.port}.lock`);
  try {
    const fd = openSync(lockPath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
    closeSync(fd);
  } catch { throw new RestartRefusal('restart-already-in-progress'); }
  const inspect = options.inspect ?? inspectPocPort;
  try {
    const first = inspect(options.port);
    if (first === null) throw new RestartRefusal('listener-absent');
    const target = targetOf(first, options);
    const credentialBefore = credentialDigest(target.credentialPath);
    const second = inspect(options.port);
    if (second === null || !sameListener(first, second)) throw new RestartRefusal('listener-changed-before-signal');
    process.kill(first.pid, 'SIGTERM');
    const deadline = Date.now() + timeoutMs;
    while (true) {
      let current: PocListener | null;
      try { current = inspect(options.port); }
      catch (error) {
        // Linux may retain a closing socket after its process descriptor
        // vanishes. `ss` may still report the PID just as /proc removes it.
        // Neither unreadable or incomplete identity nor missing owner proves socket absence:
        // wait for the next inspection, bounded by the original deadline.
        if (!(error instanceof RestartRefusal)
          || (error.code !== 'listener-owner-ambiguous'
            && error.code !== 'listener-identity-unreadable'
            && error.code !== 'listener-identity-incomplete')) throw error;
        if (Date.now() >= deadline) throw new RestartRefusal('listener-close-timeout');
        await pause(25);
        continue;
      }
      if (current === null) break;
      if (!sameListener(first, current)) throw new RestartRefusal('listener-changed-after-signal');
      if (Date.now() >= deadline) throw new RestartRefusal('listener-close-timeout');
      await pause(25);
    }
    let child: ReturnType<typeof spawn>;
    try { child = spawn(first.argv[0] as string, first.argv.slice(1), { cwd: first.cwd, env: process.env, detached: true, stdio: 'ignore' }); }
    catch { throw new RestartRefusal('successor-spawn-failed'); }
    let childFailed = false;
    child.once('error', () => { childFailed = true; });
    child.once('exit', () => { childFailed = true; });
    child.unref();
    if (child.pid === undefined) throw new RestartRefusal('successor-spawn-failed');
    while (true) {
      let current: PocListener | null;
      try { current = inspect(options.port); }
      catch (error) {
        if (!(error instanceof RestartRefusal) || error.code !== 'listener-owner-ambiguous') throw error;
        if (Date.now() >= deadline) throw new RestartRefusal('successor-start-timeout');
        await pause(25);
        continue;
      }
      if (current !== null) {
        if (current.pid !== child.pid || current.argv.join('\0') !== first.argv.join('\0') || current.cwd !== first.cwd) throw new RestartRefusal('successor-identity-mismatch');
        targetOf(current, options);
        if (credentialDigest(target.credentialPath) !== credentialBefore) throw new RestartRefusal('credential-changed');
        return { oldPid: first.pid, newPid: child.pid, port: options.port, stateDir: target.stateDir };
      }
      if (childFailed || child.exitCode !== null) throw new RestartRefusal('successor-failed');
      if (Date.now() >= deadline) throw new RestartRefusal('successor-start-timeout');
      await pause(25);
    }
  } finally {
    unlinkSync(lockPath);
  }
}
