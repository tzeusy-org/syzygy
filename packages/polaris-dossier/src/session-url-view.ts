import { spawn } from 'node:child_process';
import { constants } from 'node:fs';
import { lstat, open, readdir, readlink, realpath } from 'node:fs/promises';
import path from 'node:path';
import { deepFreeze, sha256 } from '@syzygy/support';
import type { ViewRole } from './session-view.js';

export const URL_SESSION_BWRAP = '/usr/bin/bwrap';
const SUPPORT_FILES = ['session-bridge.js', 'session-mcp.js'] as const;
const PROBE_MILLISECONDS = 5000;
const PROBE_BYTES = 16_384;
const ENV = Object.freeze({ PATH: '/usr/bin:/bin', LANG: 'C.UTF-8', SHELL: '/usr/bin/zsh', TZ: 'UTC',
  HOME: '/home/synthetic', CLAUDE_CONFIG_DIR: '/home/synthetic/.claude',
  SYZYGY_SESSION_MCP_SOCKET: '/sockets/broker/b.sock', CLAUDE_CODE_OAUTH_TOKEN: 'NONSECRET-SYNTHETIC-OAUTH-TOKEN-ONLY',
  MAX_THINKING_TOKENS: '0', CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING: '1', ENABLE_TOOL_SEARCH: 'false',
  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1', DISABLE_TELEMETRY: '1', DISABLE_ERROR_REPORTING: '1' });
export const URL_DESIGN_MCP_OUTPUT_TOKENS = 490_000;
const DESIGN_ENV = Object.freeze({ ...ENV, MAX_MCP_OUTPUT_TOKENS: String(URL_DESIGN_MCP_OUTPUT_TOKENS) });
export interface UrlSessionViewInputs {
  readonly role: ViewRole;
  readonly cliExecutable: string;
  readonly nodeExecutable: string;
  readonly supportDirectory: string;
  readonly homeDirectory: string;
  readonly workDirectory: string;
  readonly brokerSocketDirectory: string;
  readonly relaySocketDirectory: string;
  /** Required enumerated roots that must never be mounted or contain a mounted source. */
  readonly protectedPaths: readonly string[];
}
export interface UrlSessionMount { readonly source: string; readonly target: string; readonly writable: boolean }
export interface UrlSessionView {
  readonly inputs: UrlSessionViewInputs;
  readonly role: ViewRole;
  readonly mounts: readonly UrlSessionMount[];
  readonly cwd: '/work';
  readonly env: typeof ENV | typeof DESIGN_ENV;
  readonly claim: 'URL role view; no observed-code execution profile';
}
export type UrlSessionViewRefusal = 'invalid-input' | 'unverified-path' | 'unsupported-runtime' | 'support-unavailable'
  | 'nonempty-directory' | 'socket-unavailable' | 'probe-unavailable' | 'probe-bound-exceeded' | 'probe-failed';
export type UrlSessionVerification = { readonly ok: true; readonly supportSha256: Readonly<Record<typeof SUPPORT_FILES[number], string>> }
  | { readonly ok: false; readonly code: UrlSessionViewRefusal };
export type UrlSessionProbe = { readonly ok: true; readonly facts: {
  readonly canariesAbsent: number; readonly namespacesDistinct: readonly ['net', 'pid', 'mnt', 'user'];
  readonly interfaces: readonly ['lo']; readonly nonLoopbackRoutes: 0; readonly hostLoopbackReachable: false;
  readonly brokerReachable: true; readonly relayReachable: true; readonly isolatedLoopbackReachable: true;
} } | { readonly ok: false; readonly code: UrlSessionViewRefusal };
const canonical = (value: unknown): value is string => typeof value === 'string' && Buffer.byteLength(value) <= 4096
  && path.isAbsolute(value) && path.normalize(value) === value && value !== '/' && !/[\u0000-\u001f\u007f]/u.test(value)
  && Buffer.from(value).toString('utf8') === value;
const contains = (ancestor: string, child: string): boolean => ancestor === child || child.startsWith(`${ancestor}/`);
const overlap = (left: string, right: string): boolean => contains(left, right) || contains(right, left);
const invalid = (): never => { throw new Error('invalid-url-session-view'); };

/** Pure fixed-mount design. The host verifies trusted files and fresh owned directories separately.
 * This is a no-execution role view, not a SEC-3 observed-code execution profile. */
export function urlSessionViewFor(input: UrlSessionViewInputs): UrlSessionView {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) return invalid();
  const fields = ['role', 'cliExecutable', 'nodeExecutable', 'supportDirectory', 'homeDirectory', 'workDirectory', 'brokerSocketDirectory', 'relaySocketDirectory', 'protectedPaths'];
  if (Object.keys(input).length !== fields.length || Object.keys(input).some(key => !fields.includes(key))
    || !['author', 'inventory', 'fidelity', 'design'].includes(input.role) || !Array.isArray(input.protectedPaths)
    || input.protectedPaths.length < 1 || input.protectedPaths.length > 64 || !input.protectedPaths.every(canonical)) return invalid();
  const sources = [input.cliExecutable, input.nodeExecutable, input.supportDirectory, input.homeDirectory, input.workDirectory, input.brokerSocketDirectory, input.relaySocketDirectory];
  const dangerous = ['/', '/usr', '/bin', '/sbin', '/lib', '/lib64', '/etc', '/opt', '/home', '/root', '/proc', '/sys', '/dev', '/run', '/tmp', '/var'];
  if (!sources.every(canonical) || sources.some(source => dangerous.includes(source))) return invalid();
  for (let index = 0; index < sources.length; index++) {
    if (sources.slice(index + 1).some(other => overlap(sources[index]!, other))) return invalid();
    if (input.protectedPaths.some(protectedPath => overlap(sources[index]!, protectedPath))) return invalid();
  }
  if (new Set(input.protectedPaths).size !== input.protectedPaths.length || input.protectedPaths.some(root => overlap(root, '/usr'))) return invalid();
  // Executables are exact file mounts; directory sources cannot disclose system or credential trees.
  const directories = sources.slice(2);
  const excludedTrees = ['/usr', '/bin', '/sbin', '/lib', '/lib64', '/etc', '/opt', '/root', '/proc', '/sys', '/dev'];
  if (directories.some(directory => excludedTrees.some(root => contains(root, directory)))) return invalid();
  const mounts = [
    { source: input.cliExecutable, target: '/tool/claude', writable: false },
    { source: input.nodeExecutable, target: '/tool/node', writable: false },
    { source: input.supportDirectory, target: '/tool/support', writable: false },
    { source: input.homeDirectory, target: '/home/synthetic', writable: true },
    { source: input.workDirectory, target: '/work', writable: true },
    { source: input.brokerSocketDirectory, target: '/sockets/broker', writable: false },
    { source: input.relaySocketDirectory, target: '/sockets/relay', writable: false },
  ];
  return deepFreeze({ inputs: { ...input, protectedPaths: [...input.protectedPaths] }, role: input.role, mounts,
    cwd: '/work' as const, env: input.role === 'design' ? DESIGN_ENV : ENV, claim: 'URL role view; no observed-code execution profile' as const });
}

/** Setup only, ending before the command. Untrusted values can select no flags, environment or targets. */
export function urlSessionBwrapArgs(spec: UrlSessionView): string[] {
  const checked = urlSessionViewFor(spec.inputs);
  const args = ['--unshare-all', '--die-with-parent', '--new-session', '--cap-drop', 'ALL', '--clearenv',
    '--hostname', 'syzygy-role', '--ro-bind', '/usr', '/usr', '--dev', '/dev', '--proc', '/proc', '--tmpfs', '/tmp',
    '--symlink', 'usr/bin', '/bin', '--symlink', 'usr/sbin', '/sbin', '--symlink', 'usr/lib', '/lib', '--symlink', 'usr/lib64', '/lib64'];
  for (const mount of checked.mounts) args.push(mount.writable ? '--bind' : '--ro-bind', mount.source, mount.target);
  for (const [key, value] of Object.entries(checked.env)) args.push('--setenv', key, value);
  args.push('--chdir', checked.cwd);
  return args;
}
export function urlSessionCommand(cliArgs: readonly string[]): readonly string[] {
  if (!Array.isArray(cliArgs) || cliArgs.length > 128 || cliArgs.some(arg => typeof arg !== 'string'
    || Buffer.byteLength(arg) > 1_048_576 || /\u0000/u.test(arg) || Buffer.from(arg).toString('utf8') !== arg)
    || cliArgs.reduce((total, arg) => total + Buffer.byteLength(arg), 0) > 2_097_152) return invalid();
  return Object.freeze(['/tool/node', '/tool/support/session-bridge.js', '--socket', '/sockets/relay/r.sock', '--', '/tool/claude', ...cliArgs]);
}

async function regularBytes(file: string, maxBytes: number): Promise<Uint8Array> {
  const handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.nlink !== 1 || stat.size > maxBytes) throw new Error('invalid-trusted-file');
    const bytes = Buffer.alloc(maxBytes + 1); let length = 0;
    while (length < bytes.length) {
      const result = await handle.read(bytes, length, bytes.length - length, null);
      if (!result.bytesRead) break; length += result.bytesRead;
    }
    if (length > maxBytes) throw new Error('invalid-trusted-file');
    return bytes.subarray(0, length);
  } finally { await handle.close(); }
}
async function directory(file: string): Promise<void> {
  const stat = await lstat(file);
  if (await realpath(file) !== file || !stat.isDirectory() || stat.uid !== process.getuid?.()) throw new Error('invalid-directory');
}
/** These are already host-trusted compiled scripts. The import census rejects external static imports,
 * dynamic imports and require; it is a bounded admission check, not a verifier for arbitrary JavaScript. */
function builtinOnly(bytes: Uint8Array): boolean {
  let text: string;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { return false; }
  if (/\b(?:require|import)\s*\(/u.test(text) || /sourceMappingURL/u.test(text)) return false;
  const imports = [...text.matchAll(/\b(?:import|export)\s+(?:[^;'"\n]*?\s+from\s*)?['"]([^'"\n]+)['"]/gu)];
  return imports.every(found => /^node:[a-z][a-z0-9_]*(?:\/[a-z][a-z0-9_]*)?$/u.test(found[1]!));
}
export async function verifyUrlSessionViewInputs(input: UrlSessionViewInputs): Promise<UrlSessionVerification> {
  let checked: UrlSessionView;
  try { checked = urlSessionViewFor(input); } catch { return { ok: false, code: 'invalid-input' }; }
  input = checked.inputs;
  try {
    for (const executable of [input.cliExecutable, input.nodeExecutable, URL_SESSION_BWRAP]) {
      const stat = await lstat(executable);
      if (await realpath(executable) !== executable || !stat.isFile() || !(stat.mode & 0o111)) return { ok: false, code: 'unverified-path' };
    }
    for (const mount of checked.mounts.slice(2)) await directory(mount.source);
    for (const protectedPath of input.protectedPaths) {
      try { if (await realpath(protectedPath) !== protectedPath) return { ok: false, code: 'unverified-path' }; }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    }
  } catch { return { ok: false, code: 'unverified-path' }; }
  try {
    const names = (await readdir(input.supportDirectory)).sort();
    if (JSON.stringify(names) !== JSON.stringify(SUPPORT_FILES)) return { ok: false, code: 'support-unavailable' };
    const digests = {} as Record<typeof SUPPORT_FILES[number], string>;
    for (const name of SUPPORT_FILES) {
      const bytes = await regularBytes(path.join(input.supportDirectory, name), 262_144);
      if (!builtinOnly(bytes)) return { ok: false, code: 'support-unavailable' };
      digests[name] = sha256(bytes);
    }
    for (const fresh of [input.homeDirectory, input.workDirectory]) if ((await readdir(fresh)).length !== 0) return { ok: false, code: 'nonempty-directory' };
    for (const [dir, name] of [[input.brokerSocketDirectory, 'b.sock'], [input.relaySocketDirectory, 'r.sock']] as const) {
      if (JSON.stringify(await readdir(dir)) !== JSON.stringify([name]) || !(await lstat(path.join(dir, name))).isSocket() || (await lstat(path.join(dir, name))).uid !== process.getuid?.()) return { ok: false, code: 'socket-unavailable' };
    }
    return deepFreeze({ ok: true, supportSha256: digests });
  } catch { return { ok: false, code: 'support-unavailable' }; }
}

// Fixed trusted program: paths, namespace identities and the owned listener's numeric port are data.
const PROBE = String.raw`
const fs = require('node:fs'), net = require('node:net'), os = require('node:os');
const [canaries, hostNamespaces, hostPort] = JSON.parse(process.argv[1]);
const fail = () => { throw new Error('probe-failed'); };
const deadline = setTimeout(() => process.exit(2), 3500);
async function connects(options) {
  return new Promise(resolve => {
    const socket = net.createConnection(options); let done = false;
    const finish = value => { if (done) return; done = true; socket.destroy(); resolve(value); };
    socket.once('connect', () => finish(true)); socket.once('error', () => finish(false)); socket.setTimeout(200, () => finish(false));
  });
}
(async () => {
  for (const file of canaries) { try { fs.lstatSync(file); fail(); } catch (error) { if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error; } }
  for (const name of ['net','pid','mnt','user']) if (fs.readlinkSync('/proc/self/ns/' + name) === hostNamespaces[name]) fail();
  if (JSON.stringify(Object.keys(os.networkInterfaces()).sort()) !== '["lo"]') fail();
  if (fs.readFileSync('/proc/net/route','utf8').trim().split('\n').slice(1).some(row => row.trim().split(/\s+/)[0] !== 'lo')) fail();
  if (fs.readFileSync('/proc/net/ipv6_route','utf8').trim().split('\n').filter(Boolean).some(row => row.trim().split(/\s+/).at(-1) !== 'lo')) fail();
  if (await connects({host:'127.0.0.1',port:hostPort})) fail();
  if (!await connects({path:'/sockets/broker/b.sock'}) || !await connects({path:'/sockets/relay/r.sock'})) fail();
  const server = net.createServer(socket => socket.end()); await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  if (!await connects({host:'127.0.0.1',port:server.address().port})) fail();
  await new Promise(resolve => server.close(resolve)); clearTimeout(deadline); process.stdout.write('url-view-probe-ok\n');
})().catch(() => { clearTimeout(deadline); process.exitCode = 2; });`;

/** Call only with an enumerated owned synthetic canary population and its owned host-loopback listener.
 * No external connection is attempted. Proof is limited to these canaries and the captured namespace/route facts.
 * A deadline refusal does not confirm helper termination; the host retains ownership of any residual process. */
export async function probeUrlSessionView(input: UrlSessionViewInputs, canaries: readonly string[], hostLoopbackPort: number): Promise<UrlSessionProbe> {
  const control = { stopped: false, stop: () => {} };
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<UrlSessionProbe>(resolve => { timer = setTimeout(() => {
    control.stopped = true; control.stop(); resolve({ ok: false, code: 'probe-bound-exceeded' });
  }, PROBE_MILLISECONDS); });
  try { return await Promise.race([performProbe(input, canaries, hostLoopbackPort, control), deadline]); }
  finally { if (timer !== undefined) clearTimeout(timer); }
}
async function performProbe(input: UrlSessionViewInputs, canaries: readonly string[], hostLoopbackPort: number,
  control: { stopped: boolean; stop: () => void }): Promise<UrlSessionProbe> {
  if (!Array.isArray(canaries) || canaries.length < 1 || canaries.length > 64 || !canaries.every(canonical)
    || new Set(canaries).size !== canaries.length || !Number.isSafeInteger(hostLoopbackPort) || hostLoopbackPort < 1 || hostLoopbackPort > 65535) return { ok: false, code: 'invalid-input' };
  canaries = Object.freeze([...canaries]);
  try { input = urlSessionViewFor(input).inputs; } catch { return { ok: false, code: 'invalid-input' }; }
  const verified = await verifyUrlSessionViewInputs(input);
  if (control.stopped) return { ok: false, code: 'probe-bound-exceeded' };
  if (!verified.ok) return verified;
  try {
    if (canaries.some(canary => !input.protectedPaths.some(root => contains(root, canary)))) return { ok: false, code: 'invalid-input' };
    for (const canary of canaries) if (!(await lstat(canary)).isFile()) return { ok: false, code: 'unverified-path' };
    const namespaces: Record<string, string> = {};
    for (const name of ['net', 'pid', 'mnt', 'user']) namespaces[name] = await readlink(`/proc/self/ns/${name}`);
    if (control.stopped) return { ok: false, code: 'probe-bound-exceeded' };
    return await new Promise<UrlSessionProbe>(resolve => {
      let terminal = false, bytes = 0, stdout = '';
      const finish = (result: UrlSessionProbe): void => { if (terminal) return; terminal = true; resolve(result); };
      const child = spawn(URL_SESSION_BWRAP, [...urlSessionBwrapArgs(urlSessionViewFor(input)), '--', '/tool/node', '-e', PROBE, JSON.stringify([canaries, namespaces, hostLoopbackPort])],
        { env: { PATH: '/usr/bin:/bin', LANG: 'C.UTF-8' }, stdio: ['ignore', 'pipe', 'pipe'] });
      let breached = false;
      control.stop = () => { child.kill('SIGKILL'); };
      const capture = (chunk: Buffer, out: boolean): void => { bytes += chunk.length; if (bytes > PROBE_BYTES) { breached = true; control.stop(); finish({ ok: false, code: 'probe-bound-exceeded' }); } else if (out) stdout += chunk.toString('utf8'); };
      child.stdout.on('data', (chunk: Buffer) => capture(chunk, true)); child.stderr.on('data', (chunk: Buffer) => capture(chunk, false));
      child.once('error', () => finish({ ok: false, code: 'probe-unavailable' }));
      child.once('close', code => {
        if (breached) return finish({ ok: false, code: 'probe-bound-exceeded' });
        if (code !== 0 || stdout !== 'url-view-probe-ok\n') return finish({ ok: false, code: 'probe-failed' });
        finish(deepFreeze({ ok: true, facts: { canariesAbsent: canaries.length, namespacesDistinct: ['net', 'pid', 'mnt', 'user'],
          interfaces: ['lo'], nonLoopbackRoutes: 0, hostLoopbackReachable: false, brokerReachable: true, relayReachable: true, isolatedLoopbackReachable: true } }));
      });
    });
  } catch { return { ok: false, code: 'probe-unavailable' }; }
}
