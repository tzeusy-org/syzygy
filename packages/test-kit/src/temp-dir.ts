import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const made = new Set<string>();

/** A new empty directory under the temp directory, by its real path (a symlinked temp directory would otherwise
 * make a path compare unequal to what git or the daemon print). Removed by `removeTempDirs`, which the Vitest
 * setup's `syzygyAfterTestFile` hook runs once the file's tests finish. */
export function tempDir(prefix: string): string {
  if (made.size === 0) registerTeardown();
  const directory = realpathSync(mkdtempSync(join(tmpdir(), prefix)));
  made.add(directory);
  return directory;
}

/** Removes every directory `tempDir` made in this process; safe to call more than once. */
export function removeTempDirs(): void {
  for (const directory of made) rmSync(directory, { recursive: true, force: true });
  made.clear();
}

function registerTeardown(): void {
  const hook = (globalThis as { syzygyAfterTestFile?: (teardown: () => void) => void }).syzygyAfterTestFile;
  if (hook !== undefined) hook(removeTempDirs);
  else process.once('exit', removeTempDirs);
}
