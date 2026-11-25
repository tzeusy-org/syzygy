import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const made = new Set<string>();

/** A new empty directory under the temp directory, by its real path (a symlinked temp directory would otherwise
 * make a path compare unequal to what git or the daemon print). Removed synchronously by `removeTempDirs`
 * or asynchronously by Vitest's file teardown once the file's tests finish. */
export function tempDir(prefix: string): string {
  if (made.size === 0) registerTeardown();
  const directory = realpathSync(mkdtempSync(join(tmpdir(), prefix)));
  made.add(directory);
  return directory;
}

/** Removes every directory `tempDir` made in this process; safe to call more than once. */
export function removeTempDirs(): void {
  for (const directory of made) {
    rmSync(directory, { recursive: true, force: true });
    made.delete(directory);
  }
}

// One removal at a time bounds filesystem work without blocking the event loop.
// Keep failed and not-yet-removed directories tracked if removal rejects. Iterate
// the live Set so a directory registered during an await is removed too.
async function removeTempDirsAsync(): Promise<void> {
  for (const directory of made) {
    await rm(directory, { recursive: true, force: true });
    made.delete(directory);
  }
}

function registerTeardown(): void {
  const hook = (globalThis as { syzygyAfterTestFile?: (teardown: () => void | Promise<void>) => void }).syzygyAfterTestFile;
  if (hook !== undefined) hook(removeTempDirsAsync);
  else process.once('exit', removeTempDirs);
}
