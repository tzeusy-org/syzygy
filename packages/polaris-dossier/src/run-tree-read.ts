import { lstatSync } from 'node:fs';
import { BoundedJsonError } from '@syzygy/polaris-generation-core/live';
import { NotARegularFileError, PastBoundError, readBoundedFile } from './check-record-read.js';

/** The bounds of version 2.18 (REQ-polaris-generation-033, -035 and -048, syzygy-3efd.80): every run-tree file those requirements state is
 * read by the reader rule of version 2.10 (`readBoundedFile`) under the bound named here. Each is a bound of the readers, as the spec words
 * it, never one derived from what a writer may have written. */
export const RUN_TREE_BOUNDS = Object.freeze({
  /** `run.json`: every reader parses it under 65,536 bytes (`run-record.ts`). */
  runRecord: 65_536,
  /** `steps.jsonl` and `credential-breaches.jsonl`: close carries at most their first 10,000 lines. */
  log: 16_777_216,
  /** The credential list the run's credential probe reads. */
  credentialList: 65_536,
  /** `execution-choice.json`. */
  executionChoice: 8_192,
  /** The close record, `record.json`. */
  closeRecord: 16_777_216,
  /** A verdict submitted to review check, and every frozen verdict and frozen inventory revision. */
  verdict: 4_194_304,
  inventory: 4_194_304,
  /** The review check, prompt, launch-form and delivery records Syzygy writes under `inventory/` and `reviews/`. */
  record: 262_144,
  /** A round's `delivery.json` in a session's directory. */
  roundDelivery: 65_536,
  /** A round's `packet.sha256`: 64 digest characters, two spaces, `packet.json` and a newline. */
  packetDigestLine: 78,
  /** The URL supervisor's own state, `<state root>/<run id>.supervisor.json`. */
  supervisorState: 16_777_216,
});

/** The words for why a bounded read failed, in the place where a reader's words name the failed read's error code: `not a regular file`,
 * `larger than <bound> bytes` (the bound in digits, without separators), or the error code itself. */
export function readCause(cause: unknown, bound?: number): string {
  if (cause instanceof NotARegularFileError) return 'not a regular file';
  if (cause instanceof PastBoundError) return `larger than ${cause.bound} bytes`;
  if (cause instanceof BoundedJsonError && cause.code === 'byte-limit') return `larger than ${bound} bytes`;
  return (cause as NodeJS.ErrnoException | undefined)?.code ?? 'unknown-error';
}

export const isNotFound = (cause: unknown): boolean => (cause as NodeJS.ErrnoException | undefined)?.code === 'ENOENT';

/** Distinguish a missing directory entry from a link whose target could not be opened. */
export function isMissingEntry(file: string, cause: unknown): boolean {
  if (!isNotFound(cause)) return false;
  try {
    return lstatSync(file, { throwIfNoEntry: false }) === undefined;
  } catch {
    return false;
  }
}

/** The text of the regular file at `file`, read by the rule of version 2.10 under `bound` and decoded as UTF-8 as `readFileSync(file,
 * 'utf8')` decodes it, so a regular file within its bound yields exactly the text it yielded before. Throws as `readBoundedFile` does. */
export const readBoundedText = (file: string, bound: number): string => readBoundedFile(file, bound).toString('utf8');
