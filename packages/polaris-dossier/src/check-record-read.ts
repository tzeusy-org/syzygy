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
  const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
  try {
    const before = fs.fstatSync(fd, { bigint: true });
    if (!before.isFile() || before.nlink !== 1n || before.size > BigInt(CHECK_RECORD_LIMITS.maxBytes)) throw new BoundedJsonError('byte-limit');
    const buffer = Buffer.alloc(Number(before.size) + 1);
    let length = 0;
    while (length < buffer.length) {
      const count = fs.readSync(fd, buffer, length, buffer.length - length, null);
      if (count === 0) break;
      length += count;
    }
    const after = fs.fstatSync(fd, { bigint: true }), named = fs.lstatSync(file, { bigint: true });
    const same = (found: typeof before): boolean => found.isFile() && found.dev === before.dev && found.ino === before.ino
      && found.nlink === before.nlink && found.uid === before.uid && found.mode === before.mode && found.size === before.size
      && found.mtimeNs === before.mtimeNs && found.ctimeNs === before.ctimeNs;
    if (length !== Number(before.size) || !same(after) || !same(named)) throw new BoundedJsonError('byte-limit');
    const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(buffer.subarray(0, length));
    return parseBoundedJson(text, CHECK_RECORD_LIMITS);
  } finally { fs.closeSync(fd); }
}

/** Whether a parsed check record reads as the draft check record of `revision`: one object of the check record format, naming the revision
 * its file name gives. The one test `latestPassedDraft` and the end screen share; anything else is a record that cannot be read. */
export const isCheckRecordOf = (record: unknown, revision: number): record is Readonly<Record<string, unknown>> =>
  isRecord(record) && record['format'] === CHECK_RECORD_FORMAT && record['revision'] === revision;
