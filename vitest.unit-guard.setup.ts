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

function install(): void {
  const process_ = childProcess as unknown as Record<string, unknown>;
  for (const name of ['spawnSync', 'execSync', 'execFileSync']) process_[name] = (command: unknown) => refuse(`child_process.${name}`, command);
  // spawn, exec, execFile and fork all end in ChildProcess.prototype.spawn.
  childProcess.ChildProcess.prototype.spawn = function (this: unknown, options: { file?: string }) {
    return refuse('child_process (async spawn, exec, execFile or fork)', options?.file);
  };
  net.Socket.prototype.connect = () => refuse('net.Socket.connect (any TCP, TLS, HTTP or fetch client)');
  net.Server.prototype.listen = () => refuse('net.Server.listen (any TCP, HTTP or IPC server)');
  for (const name of ['bind', 'connect', 'send'] as const) dgram.Socket.prototype[name] = (() => refuse(`dgram.Socket.${name}`)) as never;
  // DNS leaves the machine without touching `dgram` or `net` (c-ares opens its own UDP socket; getaddrinfo runs on the libuv pool).
  const refuseAll = (target: object, label: string, pick: (name: string) => boolean): void => {
    for (const name of Object.getOwnPropertyNames(target)) {
      if (pick(name) && typeof (target as Record<string, unknown>)[name] === 'function') (target as Record<string, unknown>)[name] = () => refuse(`${label}.${name}`);
    }
  };
  const resolving = (name: string): boolean => /^(resolve|reverse|lookup)/.test(name);
  refuseAll(dns, 'dns', resolving);
  refuseAll(dns.promises, 'dns.promises', resolving);
  refuseAll(dns.Resolver.prototype, 'dns.Resolver', resolving);
  refuseAll(dns.promises.Resolver.prototype, 'dns.promises.Resolver', resolving);
  // `inspector.open()` binds a LISTEN socket for the debugger from native code, through none of the functions above; the promise API is a
  // second export object holding the same function.
  for (const target of [inspector, inspectorPromises]) (target as unknown as Record<string, unknown>).open = () => refuse('inspector.open');
  // A worker thread is a second isolate this guard is not installed in, and it may start a process or open a socket there.
  (workerThreads as { Worker: unknown }).Worker = function Worker() { return refuse('worker_threads.Worker'); };
  // The raw bindings behind child_process, net and dgram, reachable without any of the patched functions.
  const RAW = new Set(['spawn_sync', 'process_wrap', 'tcp_wrap', 'pipe_wrap', 'udp_wrap', 'cares_wrap', 'tls_wrap']);
  const binding = process.binding.bind(process);
  process.binding = ((name: string) => (RAW.has(name) ? refuse('process.binding', name) : binding(name))) as typeof process.binding;
  (process as unknown as Record<string, unknown>)._linkedBinding = (name: unknown) => refuse('process._linkedBinding', name);
  (process as unknown as Record<string, unknown>).dlopen = (_module: unknown, name: unknown) => refuse('process.dlopen', name);
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
Object.assign(globalThis, { syzygyUnitTierGuardTake: takeAttempts });

const complain = (): void => {
  if (attempts.length > 0) throw new Error(`unit tier refused ${attempts.splice(0).join('; ')} (a test may have caught the error; the file still fails)`);
};
afterEach(complain);
afterAll(complain);
