import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

/** The copy step of a copy-class run (REQ-polaris-generation-047; registry entry v1.1, `fetch`, `tags` and `stateDirectoryWrites`).
 *
 * "It SHALL create an empty directory of its own for the copy, never derived from the operator's clone's path, never inside any working
 * tree of the governance home's repository, its linked worktrees included, nor inside its Git directory or common Git directory, and never
 * inside the operator's clone's working tree, Git directory or common Git directory, or any working tree of its repository, its linked
 * worktrees included; a run for which Syzygy would create it in any of these SHALL be refused before its copy step starts". The directory
 * is a fresh `copy-<random>` under the copy root `init` gives (`<state root>/copies`), outside the run's state directory.
 *
 * "In that directory it SHALL make an empty repository with an empty template and with the object format the operator's clone's
 * configuration records, SHA-1 where it records none … It SHALL fetch into that repository, from the operator's clone over Git's local file
 * transport, the object the named identifier names alone, by its full object identifier, at a depth of one, with no tags and no
 * submodules, and SHALL then check that object out detached. Every Git process it starts for the copy SHALL run with the system and global
 * Git configuration disabled, with no other Git variable of the operator's environment, with every transport but the local file transport
 * refused, with lazy fetching of missing objects disabled and with no hook path".
 *
 * Three processes, in order: `git init --template= --object-format=<format>`, `git fetch --depth=1 --no-tags --no-recurse-submodules
 * file://<clone> <id>` and `git checkout --detach <id>`. Each runs with every `GIT_*` variable of the environment removed, then
 * `GIT_CONFIG_NOSYSTEM=1`, `GIT_CONFIG_GLOBAL=/dev/null`, `GIT_ALLOW_PROTOCOL=file`, `GIT_NO_LAZY_FETCH=1`, `GIT_TERMINAL_PROMPT=0`
 * and `GIT_ATTR_NOSYSTEM=1`, and `COPY_GIT_OPTIONS` (no hook path, no global attributes file, a fixed identity, no automatic
 * maintenance). Whether the object is a commit is told only from where the checkout leaves the copy's `HEAD` (a file
 * of the copy, read as data). Syzygy reads nothing of what Git read of the operator's clone. That Git starts no program the operator's
 * clone's own configuration or hooks name while it serves the copy is relied on, not checked [Inferred]. */

export interface GitResult { readonly status: number; readonly stderr: string }
/** One Git process for the copy: the arguments after `git`, run in `cwd` with `env`. Injected only by tests. */
export type CopyGitRun = (args: readonly string[], options: { readonly cwd: string; readonly env: Readonly<Record<string, string>> }) => GitResult;

const defaultRun: CopyGitRun = (args, options) => {
  const r = spawnSync('git', args, { cwd: options.cwd, env: options.env, stdio: ['ignore', 'ignore', 'pipe'], maxBuffer: 16 * 1024 * 1024 });
  return { status: r.status ?? -1, stderr: (r.stderr ?? Buffer.alloc(0)).toString('utf8') };
};

/** The environment every Git process for the copy runs with: the operator's environment with no `GIT_*` variable, then the copy's own. */
export function copyEnvironment(base: NodeJS.ProcessEnv = process.env): Readonly<Record<string, string>> {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(base)) if (!k.startsWith('GIT_') && v !== undefined) env[k] = v;
  env['GIT_CONFIG_NOSYSTEM'] = '1';
  env['GIT_CONFIG_GLOBAL'] = '/dev/null';
  env['GIT_ALLOW_PROTOCOL'] = 'file';
  env['GIT_NO_LAZY_FETCH'] = '1';
  env['GIT_TERMINAL_PROMPT'] = '0';
  // Syzygy's own setting, not a variable of the operator's environment: no system attributes file (R-PDJA-33-SLICE-B-1 finding 4).
  env['GIT_ATTR_NOSYSTEM'] = '1';
  return env;
}

/** The options before every Git command for the copy, each Syzygy's own setting (R-PDJA-33-SLICE-B-1 findings 4 and 5):
 * - no hook path (047);
 * - no global attributes file, so the operator's `$XDG_CONFIG_HOME/git/attributes` cannot rewrite the checked-out files (end-of-line
 *   conversion, `ident`, `working-tree-encoding`) away from the pinned commit's blobs;
 * - a fixed identity for the checkout's reflog entry, so Git never canonicalises the host name, a lookup that can reach DNS ("so that no
 *   network request is made");
 * - no automatic maintenance, so the fetch starts no `git maintenance run` (registry entry v1.1 `fetch`: "no other process is started").
 * None changes the copy's form. */
export const COPY_GIT_OPTIONS: readonly string[] = [
  '-c', 'core.hooksPath=/dev/null', '-c', 'core.attributesFile=/dev/null', '-c', 'user.name=Syzygy', '-c', 'user.email=syzygy@invalid', '-c', 'maintenance.auto=false',
];

/** A location, its real path where it exists, else its nearest existing ancestor's real path with the rest appended. */
export function realOfNearest(p: string): string {
  let at = path.resolve(p);
  const rest: string[] = [];
  for (;;) {
    try { return path.join(fs.realpathSync(at), ...rest.reverse()); } catch {
      const up = path.dirname(at);
      if (up === at) return path.resolve(p);
      rest.push(path.basename(at));
      at = up;
    }
  }
}

const within = (inner: string, outer: string): boolean => inner === outer || inner.startsWith(outer.endsWith(path.sep) ? outer : `${outer}${path.sep}`);

/** Where the copy's directory may not be: each place the clause names, and what it is, as real paths. */
export interface ForbiddenPlace { readonly path: string; readonly what: string }

/** Why the copy root may not hold the copy, or null: the root (and so any directory made in it) lies inside a forbidden place. */
export function copyRootViolation(copyRoot: string, forbidden: readonly ForbiddenPlace[]): string | null {
  const root = realOfNearest(copyRoot);
  for (const place of forbidden) {
    const real = realOfNearest(place.path);
    if (within(root, real)) return `the copy's directory would be made under ${root}, inside ${place.what} (${real}); give a state root outside it`;
  }
  return null;
}

export type CopyFailure =
  | { readonly kind: 'process'; readonly process: 'init' | 'fetch'; readonly status: number; readonly stderr: string }
  | { readonly kind: 'checkout'; readonly status: number; readonly stderr: string }
  | { readonly kind: 'not-commit' }
  /** `fetchStarted`: Syzygy had started the fetch process; `fetchEnded`: that process had succeeded, so the failure came after it. */
  | { readonly kind: 'directory'; readonly reason: string; readonly fetchStarted?: boolean; readonly fetchEnded?: boolean };

export type CopyResult =
  | { readonly ok: true; readonly dir: string; readonly gitDir: string }
  | { readonly ok: false; readonly dir: string | null; readonly failure: CopyFailure };

/** A process-level interrupt (Ctrl-C) from a copy-class run's copy step to its outcome (R-PDJA-33-SLICE-C-1 finding 3). Armed when the copy
 * step starts, it records a SIGINT instead of letting the process die with the copy left unremoved and unnamed; each checkpoint the launch
 * and init pass before asking, before writing and before the run directory throws `Interrupted`, which their failure path turns into a
 * refusal that removes the copy and says so. Disarmed once the run's outcome is returned, when the default action returns. */
export interface InterruptWatch {
  arm(): void; check(): void; disarm(): void;
  /** Whether an interrupt arrived since the watch was armed, without throwing: for one that arrives after the last check. */
  held?(): boolean;
}

export class Interrupted extends Error {
  constructor() { super('the run was interrupted (SIGINT)'); this.name = 'Interrupted'; }
}

export function interruptWatch(signals: Pick<NodeJS.EventEmitter, 'on' | 'removeListener'> = process): InterruptWatch {
  let armed = false, hit = false;
  const onInterrupt = (): void => { hit = true; };
  return {
    arm: () => { if (!armed) { armed = true; signals.on('SIGINT', onInterrupt); } },
    check: () => { if (hit) throw new Interrupted(); },
    held: () => hit,
    disarm: () => { if (armed) { armed = false; signals.removeListener('SIGINT', onInterrupt); } },
  };
}

/** Git's own report, trimmed and bounded, for a refusal to quote. */
export const gitReport = (stderr: string): string => {
  const text = stderr.trim().replace(/\s+/g, ' ');
  return text === '' ? 'no message' : text.length > 500 ? `${text.slice(0, 500)}…` : text;
};

/** Make the copy: its directory (which starts the copy step), then init, fetch and checkout; then tell from the copy's HEAD whether the
 * named object is a commit. A failure after the directory exists returns that directory for the caller to remove. */
export function makeCopy(input: { readonly clone: string; readonly named: string; readonly objectFormat: string; readonly copyRoot: string }, run: CopyGitRun = defaultRun): CopyResult {
  let dir: string;
  try {
    fs.mkdirSync(input.copyRoot, { recursive: true, mode: 0o700 });
    dir = fs.mkdtempSync(path.join(input.copyRoot, 'copy-'));
  } catch (cause) {
    return { ok: false, dir: null, failure: { kind: 'directory', reason: `the copy's directory could not be created under ${input.copyRoot} (${(cause as NodeJS.ErrnoException).code ?? 'unknown-error'})` } };
  }
  // Once the directory exists every outcome returns it, a thrown error included, so the caller can remove it, with whether the fetch process
  // had been started (047's statements differ on either side of it).
  const progress = { fetchStarted: false, fetchEnded: false };
  try { return copyInto(dir, input, run, progress); } catch (cause) {
    return { ok: false, dir, failure: { kind: 'directory', reason: `the copy step failed after its directory was made (${cause instanceof Error ? `${cause.name}: ${cause.message}` : String(cause)})`, fetchStarted: progress.fetchStarted, fetchEnded: progress.fetchEnded } };
  }
}

function copyInto(dir: string, input: { readonly clone: string; readonly named: string; readonly objectFormat: string }, run: CopyGitRun, progress: { fetchStarted: boolean; fetchEnded: boolean }): CopyResult {
  const env = copyEnvironment();
  const git = (args: readonly string[]) => run([...COPY_GIT_OPTIONS, ...args], { cwd: dir, env });
  const init = git(['init', '-q', '--template=', `--object-format=${input.objectFormat}`, dir]);
  if (init.status !== 0) return { ok: false, dir, failure: { kind: 'process', process: 'init', status: init.status, stderr: init.stderr } };
  progress.fetchStarted = true;
  const fetch = git(['-C', dir, 'fetch', '-q', '--depth=1', '--no-tags', '--no-recurse-submodules', pathToFileURL(input.clone).href, input.named]);
  if (fetch.status !== 0) return { ok: false, dir, failure: { kind: 'process', process: 'fetch', status: fetch.status, stderr: fetch.stderr } };
  progress.fetchEnded = true;
  const checkout = git(['-C', dir, 'checkout', '-q', '--detach', input.named]);
  if (checkout.status !== 0) return { ok: false, dir, failure: { kind: 'checkout', status: checkout.status, stderr: checkout.stderr } };
  const gitDir = path.join(dir, '.git');
  let head: string;
  try {
    const stats = fs.lstatSync(path.join(gitDir, 'HEAD'));
    if (!stats.isFile() || stats.size > 4096) return { ok: false, dir, failure: { kind: 'not-commit' } };
    head = fs.readFileSync(path.join(gitDir, 'HEAD'), 'utf8').replace(/\n$/, '');
  } catch {
    return { ok: false, dir, failure: { kind: 'not-commit' } };
  }
  if (head !== input.named) return { ok: false, dir, failure: { kind: 'not-commit' } };
  return { ok: true, dir, gitDir };
}

export type CopyEnd = { readonly state: 'removed'; readonly location: string } | { readonly state: 'not-removed'; readonly location: string; readonly failure: string };

/** Remove the copy, its directory included, where the run ends before its brief. */
export function removeCopy(dir: string, remove: (dir: string) => void = d => fs.rmSync(d, { recursive: true, force: false })): CopyEnd {
  try {
    remove(dir);
    return { state: 'removed', location: dir };
  } catch (cause) {
    const e = cause as NodeJS.ErrnoException;
    return { state: 'not-removed', location: dir, failure: `${e.code ?? 'unknown-error'}${e.message === undefined ? '' : `: ${e.message}`}` };
  }
}

/** The launch output's copy statement for a run that ends before its brief (047). */
export function copyEndStatement(end: CopyEnd | null): string {
  if (end === null) return 'No copy was made.';
  if (end.state === 'removed') return `The copy at ${end.location} was removed, its directory included.`;
  return `The copy at ${end.location} was not removed (${end.failure}); it is kept until the operator removes it.`;
}

/** The launch output's copy statement for a run that completes (047). */
export const copyKeptStatement = (dir: string): string =>
  `The copy of the pinned commit at ${dir} is the run's clone; it is kept after the run, outside the run's state directory, until the operator removes it.`;
