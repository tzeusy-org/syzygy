import * as fs from 'node:fs';
import { BoundedJsonError, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { isRecord } from '@syzygy/support';
import { CHECK_RECORD_FORMAT } from './check-model.js';

/** The one read bound of every reader of a draft or inventory check record (REQ-polaris-generation-034 versions 2.8 and 2.10,
 * syzygy-3efd.72, .73, .74): one JSON document of at most 16,777,216 bytes and 2,000,000 values, no value nested more than 16 levels below
 * the root (the root at depth 0, as `parseBoundedJson` counts). Review, render and close (through `latestPassedDraft`), the reading
 * difference, the run's end screen, the run file, Syzygy deciding whether an inventory counts and the supervisor's latest draft and
 * inventory checks all read under it; a record past any bound cannot be read, and is never counted as passed or refused. Since version 2.10
 * every check record `check` and `inventory-check` write lies within it (`check.ts`). */
export const CHECK_RECORD_LIMITS = Object.freeze({ maxBytes: 16_777_216, maxNodes: 2_000_000, maxDepth: 16 });

/** Why a path holds no file a bounded reader reads: anything whose opened descriptor is not a regular file. */
export class NotARegularFileError extends Error {
  constructor() {
    super('the path does not hold a regular file');
    this.name = 'NotARegularFileError';
  }
}

/** The bytes of the regular file at `file`, read under `maxBytes` by the rule of version 2.10: the path is opened once, without blocking
 * and following a symbolic link; anything whose descriptor is not a regular file (a directory, a device, a FIFO) is refused, and so is a
 * size past the bound, before any byte is read; and at most `maxBytes + 1` bytes are read from the descriptor, so a file grown after its
 * size was taken is refused too. Throws `NotARegularFileError`, `BoundedJsonError('byte-limit')` or the open's own error. */
export function readBoundedFile(file: string, maxBytes: number): Buffer {
  return readRegularFile(file, () => maxBytes);
}

/** The bytes of the regular file at `file`, read by the same rule with its own size, as its opened descriptor gives it, for the bound: for
 * a file no stated bound covers (close's digest of every stored file). A file grown after its size was taken is refused. */
export function readFileAsSized(file: string): Buffer {
  return readRegularFile(file, (size) => size);
}

function readRegularFile(file: string, boundOf: (size: number) => number): Buffer {
  // O_NOCTTY: a terminal device at the path never becomes this process's controlling terminal on open.
  const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NONBLOCK | fs.constants.O_NOCTTY);
  try {
    const stats = fs.fstatSync(fd);
    if (!stats.isFile()) throw new NotARegularFileError();
    const maxBytes = boundOf(stats.size);
    if (stats.size > maxBytes) throw new BoundedJsonError('byte-limit');
    const limit = maxBytes + 1;
    let buffer = Buffer.allocUnsafe(Math.min(stats.size + 1, limit));
    let total = 0;
    for (;;) {
      if (total === buffer.length) {
        if (buffer.length >= limit) break;
        const grown = Buffer.allocUnsafe(Math.min(limit, buffer.length * 2));
        buffer.copy(grown, 0, 0, total);
        buffer = grown;
      }
      const read = fs.readSync(fd, buffer, total, buffer.length - total, null);
      if (read === 0) break;
      total += read;
    }
    if (total > maxBytes) throw new BoundedJsonError('byte-limit');
    return buffer.subarray(0, total);
  } finally {
    fs.closeSync(fd);
  }
}

/** The draft or inventory check record at `file`, read by `readBoundedFile` and parsed under `CHECK_RECORD_LIMITS`; throws where it is no
 * regular file, cannot be read, does not parse or is past a bound. A file larger than the byte bound is refused from its descriptor's size,
 * before any byte of it is read. */
export function readCheckRecord(file: string): unknown {
  return parseBoundedJson(readBoundedFile(file, CHECK_RECORD_LIMITS.maxBytes).toString('utf8'), CHECK_RECORD_LIMITS);
}

/** Whether a parsed check record reads as the draft check record of `revision`: one object of the check record format, naming the revision
 * its file name gives. The one test `latestPassedDraft` and the end screen share; anything else is a record that cannot be read. */
export const isCheckRecordOf = (record: unknown, revision: number): record is Readonly<Record<string, unknown>> =>
  isRecord(record) && record['format'] === CHECK_RECORD_FORMAT && record['revision'] === revision;
