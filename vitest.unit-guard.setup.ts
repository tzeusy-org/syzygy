import childProcess from 'node:child_process';
import dgram from 'node:dgram';
import { syncBuiltinESMExports } from 'node:module';
import net from 'node:net';
import { afterAll, afterEach } from 'vitest';

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
  // The named exports of a builtin are copies until synced; a test file imports them after this setup runs.
  syncBuiltinESMExports();
}

const slot = globalThis as { [INSTALLED]?: true };
if (slot[INSTALLED] !== true) {
  slot[INSTALLED] = true;
  install();
}

/** What the guard refused since the last call, then forgotten. Only the guard's own test reads it, to prove each route is refused. */
const takeAttempts = (): string[] => attempts.splice(0);
Object.assign(globalThis, { syzygyUnitTierGuardTake: takeAttempts });

const complain = (): void => {
  if (attempts.length > 0) throw new Error(`unit tier refused ${attempts.splice(0).join('; ')} (a test may have caught the error; the file still fails)`);
};
afterEach(complain);
afterAll(complain);
