import * as fs from 'node:fs';
import { BoundedJsonError, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { isRecord } from '@syzygy/support';
import { CHECK_RECORD_FORMAT } from './check-model.js';

/** The one read bound of every reader of a draft check record (REQ-polaris-generation-034 version 2.8, syzygy-3efd.72): one JSON document
 * of at most 16,777,216 bytes and 2,000,000 values, no value nested more than 16 levels below the root (the root at depth 0, as
 * `parseBoundedJson` counts). Review, render and close (through `latestPassedDraft`), the reading difference, the run's end screen and the
 * supervisor's latest draft check all read under it; a record past any bound cannot be read, and is never counted as passed or refused. */
export const CHECK_RECORD_LIMITS = Object.freeze({ maxBytes: 16_777_216, maxNodes: 2_000_000, maxDepth: 16 });

/** The draft check record at `file`, parsed under `CHECK_RECORD_LIMITS`; throws where it cannot be read, does not parse or is past a bound.
 * A file larger than the byte bound is refused from its size alone, before any byte of it is read. */
export function readCheckRecord(file: string): unknown {
  if (fs.statSync(file).size > CHECK_RECORD_LIMITS.maxBytes) throw new BoundedJsonError('byte-limit');
  return parseBoundedJson(fs.readFileSync(file, 'utf8'), CHECK_RECORD_LIMITS);
}

/** Whether a parsed check record reads as the draft check record of `revision`: one object of the check record format, naming the revision
 * its file name gives. The one test `latestPassedDraft` and the end screen share; anything else is a record that cannot be read. */
export const isCheckRecordOf = (record: unknown, revision: number): record is Readonly<Record<string, unknown>> =>
  isRecord(record) && record['format'] === CHECK_RECORD_FORMAT && record['revision'] === revision;
