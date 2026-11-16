// Test support: exports with no non-test importer are consumed by tests only, by design.

import { lstatSync, readdirSync, readlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** The fixture helper's temp-directory names carry the pid of the process that made
 * them and the PID namespace that pid belongs to, `p<pid>-n<namespace>-` straight after
 * the prefix (or after `template-`), so a later run can tell a killed run's leftovers
 * from a live run's directories (syzygy-bpyt.4.10). */
export const FIXTURE_PREFIX = 'syzygy-poc-surface-fixture-';
export const ownedCopyPrefix = (): string => `${FIXTURE_PREFIX}p${process.pid}-n${pidNamespace() ?? '0'}-`;
export const ownedTemplatePrefix = (): string => `${FIXTURE_PREFIX}template-p${process.pid}-n${pidNamespace() ?? '0'}-`;

/**
 * A pid means something only inside its own PID namespace: a sandbox or container that
 * shares the temp directory sees a live run's pid as absent (ESRCH) or as another
 * process. The namespace is the inode `/proc/self/ns/pid` names (`pid:[4026531836]`).
 * Where that link cannot be read (no `/proc`, or a sandbox that mounts a tmpfs over it)
 * there is no reading, and no reading is no evidence: every such sandbox would read as
 * the same namespace, so names are still made, with `n0`, but the process sweeps nothing.
 * The inode identifies a namespace within one running kernel only.
 */
function pidNamespace(): string | undefined {
  try {
    return /\[(\d+)\]$/.exec(readlinkSync('/proc/self/ns/pid'))?.[1];
  } catch {
    return undefined;
  }
}

/** A name made before pids were added has the random suffix where the pid segment now
 * sits, and one made before the namespace was added has no `n<namespace>-` after the
 * pid, so neither matches. */
const FIXTURE_NAME_WITH_OWNER = /^syzygy-poc-surface-fixture-(?:template-)?p(\d+)-n(\d+)-/;

/**
 * A run killed before its teardown hooks run (SIGKILL, SIGTERM, a CI timeout, a closed
 * terminal) leaves its fixture directories behind. Called once per run, from the app
 * project's global setup and at the start of the accessibility CLI, this removes the ones
 * whose owner process is gone. It lists `directory` (the temp directory) and nothing else.
 * An entry is removed only if all of these hold:
 * - this process can read its own PID namespace (otherwise it removes nothing, and does not
 *   list the directory);
 * - its name carries a pid and a PID namespace, and the namespace is this process's own;
 * - the pid answers ESRCH to signal 0;
 * - `lstat` says it is a directory (so a symlink or a file is never followed or removed);
 * - on a system with user ids, it belongs to the user running the sweep, so the sweep
 *   never descends into a directory it did not make.
 * A pid that answers, or fails with anything but ESRCH (EPERM, a pid out of range), may be
 * alive and is kept, as is every name without a pid and namespace segment and every name
 * from another namespace. A directory that cannot be listed or removed is left: a sweep
 * must not fail the run that starts it.
 */
export function removeFixturesOfDeadProcesses(directory: string = tmpdir()): void {
  const namespace = pidNamespace();
  if (namespace === undefined) return;
  let names: string[];
  try {
    names = readdirSync(directory);
  } catch {
    return;
  }
  const user = typeof process.getuid === 'function' ? process.getuid() : undefined;
  for (const name of names) {
    const owner = FIXTURE_NAME_WITH_OWNER.exec(name);
    if (owner === null || owner[2] !== namespace || ownerMayBeAlive(Number(owner[1]))) continue;
    const entry = join(directory, name);
    try {
      const stat = lstatSync(entry);
      if (stat.isDirectory() && (user === undefined || stat.uid === user)) rmSync(entry, { recursive: true, force: true });
    } catch {
      // Left for the next run.
    }
  }
}

function ownerMayBeAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== 'ESRCH';
  }
}
