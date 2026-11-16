import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { sha256 } from '@syzygy/support';

/** Session views for launched runs (candidate REQ-polaris-generation-042).
 *
 * Each launched session runs inside a bubblewrap view built for its role, so the session and every process it starts reach only what the
 * role needs. The view separates the sessions from each other and from the gate records. It is not a containment of observed code, not a
 * sandbox under SEC-3 and not an execution profile: launched runs execute nothing (REQ-044). Network is left to the agent tool. There is no
 * `--new-session`: the sessions are interactive and need their terminal as a controlling terminal; TIOCSTI injection is off by default on
 * kernels from 6.2 (dev.tty.legacy_tiocsti). */

export type ViewRole = 'author' | 'inventory' | 'fidelity' | 'design';

export interface ViewSpec {
  readonly role: ViewRole;
  /** Paths bound read-only at the same path inside the view. */
  readonly readOnly: readonly string[];
  /** Paths bound read-write at the same path inside the view. Later entries win over earlier read-only ones beneath them. */
  readonly readWrite: readonly string[];
  /** Read-only binds applied after the read-write ones, to protect a subtree of a writable bind. */
  readonly readOnlyOver: readonly string[];
  readonly cwd: string;
  readonly env: Readonly<Record<string, string>>;
}

export interface ViewInputs {
  readonly role: ViewRole;
  readonly clone: string;
  readonly runDir: string;
  /** The session's own directory: the run directory for the author, its session directory for a helper. */
  readonly sessionDir: string;
  /** The session's private home: agent-tool configuration, credentials copy and its broker socket. */
  readonly agentHome: string;
  /** The Syzygy checkout, bound read-only. */
  readonly checkout: string;
  /** Directories holding the agent tool and node, bound read-only. */
  readonly toolPaths: readonly string[];
  /** The directory holding the `syzygy` shim, bound read-only and put first on PATH. */
  readonly shimDir: string;
  readonly brokerSocket: string;
  /** The directory holding the session's broker socket, bound read-write into this session's view alone. */
  readonly socketDir: string;
  readonly term?: string;
}

const SYSTEM_READ_ONLY = ['/usr', '/etc', '/opt', '/run/systemd/resolve'];

/** The view for one role. Pure: the same inputs give the same spec, and its digest goes in the launch record. */
export function viewFor(inputs: ViewInputs): ViewSpec {
  const common = [inputs.checkout, inputs.shimDir, ...inputs.toolPaths];
  const env = {
    HOME: inputs.agentHome,
    CLAUDE_CONFIG_DIR: path.join(inputs.agentHome, '.claude'),
    PATH: `${inputs.shimDir}:/usr/local/bin:/usr/bin:/bin`,
    TERM: inputs.term ?? 'xterm-256color',
    LANG: 'C.UTF-8',
    SYZYGY_BROKER_SOCKET: inputs.brokerSocket,
  };
  switch (inputs.role) {
    case 'author':
      return {
        role: 'author', env, cwd: inputs.runDir,
        readOnly: [...common, inputs.clone, inputs.runDir],
        readWrite: [inputs.agentHome, inputs.socketDir, path.join(inputs.runDir, 'drafts')],
        readOnlyOver: [],
      };
    case 'inventory':
      return { role: 'inventory', env, cwd: inputs.sessionDir, readOnly: [...common, inputs.clone], readWrite: [inputs.agentHome, inputs.socketDir, inputs.sessionDir], readOnlyOver: [] };
    case 'fidelity':
    case 'design':
      return { role: inputs.role, env, cwd: inputs.sessionDir, readOnly: common, readWrite: [inputs.agentHome, inputs.socketDir, inputs.sessionDir], readOnlyOver: [] };
  }
}

export const viewSha256 = (spec: ViewSpec): string => sha256(JSON.stringify(spec));

/** The bubblewrap argument list that builds the view, ending before the command it runs. */
export function bwrapArgs(spec: ViewSpec): string[] {
  const args = ['--unshare-all', '--share-net', '--die-with-parent', '--clearenv',
    '--dev', '/dev', '--proc', '/proc', '--tmpfs', '/tmp',
    '--symlink', 'usr/bin', '/bin', '--symlink', 'usr/lib', '/lib', '--symlink', 'usr/lib64', '/lib64', '--symlink', 'usr/sbin', '/sbin'];
  for (const dir of SYSTEM_READ_ONLY) args.push('--ro-bind-try', dir, dir);
  for (const dir of spec.readOnly) args.push('--ro-bind', dir, dir);
  for (const dir of spec.readWrite) args.push('--bind', dir, dir);
  for (const dir of spec.readOnlyOver) args.push('--ro-bind', dir, dir);
  for (const [key, value] of Object.entries(spec.env)) args.push('--setenv', key, value);
  args.push('--chdir', spec.cwd);
  return args;
}

/** Why this host cannot build session views, or null when it can. Builds a throwaway view and probes that a read-only bind refuses a write,
 * a writable bind accepts one, and an unbound path is absent. */
export function viewProbeRefusal(): string | null {
  const which = spawnSync('bwrap', ['--version'], { encoding: 'utf8' });
  if (which.error !== undefined || which.status !== 0) return 'bubblewrap (bwrap) is not installed or cannot run; install it, or use `syzygy dossier init` for an operator-started run';
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'polaris-view-probe-'));
  try {
    const ro = path.join(base, 'ro'), rw = path.join(base, 'rw'), hidden = path.join(base, 'hidden');
    for (const dir of [ro, rw, hidden]) fs.mkdirSync(dir);
    fs.writeFileSync(path.join(hidden, 'secret'), 'x');
    const spec: ViewSpec = { role: 'inventory', readOnly: [ro], readWrite: [rw], readOnlyOver: [], cwd: rw, env: { PATH: '/usr/bin:/bin' } };
    const script = `touch ${ro}/w 2>/dev/null && echo ro-writable; touch ${rw}/w || echo rw-unwritable; test -e ${hidden}/secret && echo hidden-visible; echo done`;
    const result = spawnSync('bwrap', [...bwrapArgs(spec), '/bin/sh', '-c', script], { encoding: 'utf8' });
    if (result.status !== 0) return `bubblewrap could not build a view on this host (exit ${result.status}): ${(result.stderr || '').trim().slice(0, 300)}`;
    const out = result.stdout.trim().split('\n');
    const faults = out.filter((line) => line !== 'done');
    if (faults.length > 0 || !out.includes('done')) return `a probe view did not isolate as required: ${faults.join(', ') || 'no result'}`;
    return null;
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
}
