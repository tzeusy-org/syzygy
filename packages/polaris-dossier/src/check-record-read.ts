import * as fs from 'node:fs';
import { parseBoundedJson } from '@syzygy/polaris-generation-core/live';

/** The one read bound of every reader of a draft check record (REQ-polaris-generation-034 version 2.8, syzygy-3efd.72): one JSON document
 * of at most 16,777,216 bytes and 2,000,000 values, no value nested more than 16 levels below the root (the root at depth 0, as
 * `parseBoundedJson` counts). Review, render and close (through `latestPassedDraft`), the reading difference, the run's end screen and the
 * supervisor's latest draft check all read under it; a record past any bound cannot be read, and is never counted as passed or refused. */
export const CHECK_RECORD_LIMITS = Object.freeze({ maxBytes: 16_777_216, maxNodes: 2_000_000, maxDepth: 16 });

/** The draft check record at `file`, parsed under `CHECK_RECORD_LIMITS`; throws where it cannot be read, does not parse or is past a bound. */
export const readCheckRecord = (file: string): unknown => parseBoundedJson(fs.readFileSync(file, 'utf8'), CHECK_RECORD_LIMITS);
