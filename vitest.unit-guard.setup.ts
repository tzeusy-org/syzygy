import childProcess from 'node:child_process';
import dgram from 'node:dgram';
import dns from 'node:dns';
import inspector from 'node:inspector';
import inspectorPromises from 'node:inspector/promises';
import { syncBuiltinESMExports } from 'node:module';
import net from 'node:net';
import workerThreads from 'node:worker_threads';
import { afterAll, afterEach, expect } from 'vitest';

// The unit tier is hermetic (syzygy-bpyt.4.3): no test in it starts a process (git, node, python, a browser), opens a socket or
// binds a server. Every route to a process or a socket goes through one of the functions patched here, so a unit test that
// reaches one throws at the call and the file fails at the end of the test even where the test caught the throw. Such a test
// belongs in the integration or e2e tier (vitest.tiers.ts). The patch is per worker and idempotent; the module cache of a
// worker that reuses its process keeps one copy.
const INSTALLED = Symbol.for('syzygy.unitTierGuard');
const attempts: string[] = [];

function refuse(what: string, command?: unknown): never {
  const named = typeof command === 'string' ? `${what} ${JSON.stringify(command.slice(0, 80))}` : what;
  attempts.push(named);
  throw new Error(`unit tier refuses ${named}: a unit test starts no process and opens no socket; list this file in vitest.tiers.ts under INTEGRATION_TESTS or E2E_TESTS`);
}

/** Replace `target[name]` with a refusing function the test cannot put back. The property becomes a non-configurable accessor whose
 * getter returns the refuser and whose setter is itself refused and recorded: a test that reassigns a route (to a mock, or to an
 * original it kept) throws there, and the file fails even where the test caught the throw. A route stays reachable only through a
 * function the setup did not patch. Stated residuals (syzygy-e8lv), not refused because no cheap hook exists or the work is not a
 * process or a socket: `--expose-internals` (NODE_OPTIONS or execArgv) exposes `internalBinding` and the unpatched originals; a native
 * addon a test loads before the setup; `process.binding('fs_event_wrap')` and `fs` (local file work, allowed in the unit tier);
 * `process.kill` and signals to an existing pid; `node:wasi`, `node:quic` and other flag-gated experimental modules; a handle wrapped
 * on an inherited fd (`new net.Socket({ fd })`), which opens nothing new. */
function lock(target: object, name: string, label: string, refuser: (...args: unknown[]) => never): void {
  Object.defineProperty(target, name, {
    configurable: false,
    enumerable: true,
    get: () => refuser,
    set: () => refuse(`reassignment of ${label}.${name} (the unit tier's refusal is not restorable or replaceable)`),
  });
}

function install(): void {
  for (const name of ['spawnSync', 'execSync', 'execFileSync']) lock(childProcess, name, 'child_process', (command: unknown) => refuse(`child_process.${name}`, command));
  // spawn, exec, execFile and fork all end in ChildProcess.prototype.spawn.
  lock(childProcess.ChildProcess.prototype, 'spawn', 'ChildProcess.prototype', (options: unknown) => refuse('child_process (async spawn, exec, execFile or fork)', (options as { file?: string } | undefined)?.file));
  lock(net.Socket.prototype, 'connect', 'net.Socket.prototype', () => refuse('net.Socket.connect (any TCP, TLS, HTTP or fetch client)'));
  lock(net.Server.prototype, 'listen', 'net.Server.prototype', () => refuse('net.Server.listen (any TCP, HTTP or IPC server)'));
  for (const name of ['bind', 'connect', 'send'] as const) lock(dgram.Socket.prototype, name, 'dgram.Socket.prototype', () => refuse(`dgram.Socket.${name}`));
  // DNS leaves the machine without touching `dgram` or `net` (c-ares opens its own UDP socket; getaddrinfo runs on the libuv pool).
  const refuseAll = (target: object, label: string, pick: (name: string) => boolean): void => {
    for (const name of Object.getOwnPropertyNames(target)) {
      if (pick(name) && typeof (target as Record<string, unknown>)[name] === 'function') lock(target, name, label, () => refuse(`${label}.${name}`));
    }
  };
  const resolving = (name: string): boolean => /^(resolve|reverse|lookup)/.test(name);
  refuseAll(dns, 'dns', resolving);
  refuseAll(dns.promises, 'dns.promises', resolving);
  refuseAll(dns.Resolver.prototype, 'dns.Resolver', resolving);
  refuseAll(dns.promises.Resolver.prototype, 'dns.promises.Resolver', resolving);
  // `inspector.open()` binds a LISTEN socket for the debugger from native code, through none of the functions above; the promise API is a
  // second export object holding the same function.
  for (const target of [inspector, inspectorPromises]) lock(target, 'open', 'inspector', () => refuse('inspector.open'));
  // A worker thread is a second isolate this guard is not installed in, and it may start a process or open a socket there.
  lock(workerThreads, 'Worker', 'worker_threads', function Worker() { return refuse('worker_threads.Worker'); });
  // The raw bindings behind child_process, net, dgram, dns, the debugger and a terminal, reachable without any of the patched functions.
  // `process.binding` allows only a fixed list of names; those listed here are the ones that start a process, open a socket or a debugger,
  // wrap a stream handle, or open a TTY. The rest (fs, os, zlib, buffer, constants, util, uv, natives, icu, contextify, config,
  // fs_event_wrap) do file or in-process work a unit test may do.
  const RAW = new Set(['spawn_sync', 'process_wrap', 'tcp_wrap', 'pipe_wrap', 'udp_wrap', 'cares_wrap', 'tls_wrap', 'inspector', 'tty_wrap', 'stream_wrap', 'js_stream']);
  const binding = process.binding.bind(process);
  lock(process, 'binding', 'process', (name: unknown) => (RAW.has(name as string) ? refuse('process.binding', name) : binding(name as string)));
  lock(process, '_linkedBinding', 'process', (name: unknown) => refuse('process._linkedBinding', name));
  lock(process, 'dlopen', 'process', (_module: unknown, name: unknown) => refuse('process.dlopen', name));
  // `process.execve` replaces the worker's image with another program (Node 23.11 and later).
  if (typeof (process as unknown as { execve?: unknown }).execve === 'function') lock(process, 'execve', 'process', (file: unknown) => refuse('process.execve', file));
  // The named exports of a builtin are copies until synced; a test file imports them after this setup runs.
  syncBuiltinESMExports();
}

// Without isolation one process runs every file and this setup file runs for the first file only, so the hooks below would not be
// registered for a later file and its swallowed refusal would pass. Refuse the run instead (`--no-isolate`, `isolate: false`).
const workerState = (globalThis as { __vitest_worker__?: { config?: { isolate?: boolean } } }).__vitest_worker__;
if (workerState?.config?.isolate === false) throw new Error('unit tier refuses a run without isolation: the guard hooks are registered per file (use the default isolated pool)');

const slot = globalThis as { [INSTALLED]?: true };
if (slot[INSTALLED] !== true) {
  slot[INSTALLED] = true;
  install();
}

const GUARD_TEST = /[\\/]unit-tier-guard\.test\.ts$/;
/** What the guard refused since the last call, then forgotten. Only the guard's own test may read it, to prove each route is refused:
 * from any other file it throws and leaves the record, so a test cannot drain what the hooks would fail the file for. */
const takeAttempts = (): string[] => {
  const file = expect.getState().testPath ?? '';
  if (!GUARD_TEST.test(file)) return refuse('syzygyUnitTierGuardTake from', file);
  return attempts.splice(0);
};
/** The module object whose synchronous calls are locked, for the guard's own reassignment rows. The test imports no namespace itself:
 * sync-child-process-guard.test.ts fails a bare `child_process` namespace value as a re-binding. Same reader restriction as above. */
const lockedChildProcess = (): typeof childProcess => {
  const file = expect.getState().testPath ?? '';
  if (!GUARD_TEST.test(file)) return refuse('syzygyUnitTierGuardChildProcess from', file);
  return childProcess;
};
Object.assign(globalThis, { syzygyUnitTierGuardTake: takeAttempts, syzygyUnitTierGuardChildProcess: lockedChildProcess });

const complain = (): void => {
  if (attempts.length > 0) throw new Error(`unit tier refused ${attempts.splice(0).join('; ')} (a test may have caught the error; the file still fails)`);
};
afterEach(complain);
afterAll(complain);
