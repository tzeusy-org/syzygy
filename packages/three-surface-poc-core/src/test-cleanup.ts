// Test support: only this package's tests call it (model.test.ts and
// test-cleanup.test.ts), and the package barrel does not export it. apps/three-surface-poc/src/temporary-directory.ts
// holds a near-duplicate for the app's own use.
import { rmSync } from 'node:fs';

interface CleanupRemoveOptions {
  /** Total remove calls, including the first attempt. */
  readonly maxAttempts?: number;
  readonly remove?: (path: string) => void;
}

const RETRYABLE_CODES = new Set(['EBUSY', 'EMFILE', 'ENFILE', 'ENOTEMPTY']);

/** Remove a temporary fixture with a small, bounded retry window. CI can
 * briefly observe ENOTEMPTY while a child Git process releases its last
 * directory entry; an unbounded retry would hide a real cleanup failure. */
export function removeFixtureDirectory(path: string, options: CleanupRemoveOptions = {}): void {
  const maxAttempts = options.maxAttempts ?? 4;
  const remove = options.remove ?? (() => rmSync(path, { recursive: true, force: true, maxRetries: 1, retryDelay: 25 }));
  let attempts = 0;
  while (attempts < maxAttempts) {
    attempts += 1;
    try {
      remove(path);
      return;
    } catch (cause: unknown) {
      const code = cause !== null && typeof cause === 'object' && 'code' in cause ? String((cause as { code?: unknown }).code) : '';
      if (!RETRYABLE_CODES.has(code) || attempts >= maxAttempts) throw cause;
    }
  }
}
