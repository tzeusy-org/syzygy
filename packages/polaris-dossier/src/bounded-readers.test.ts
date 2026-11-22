import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { briefIssuedAt } from './check.js';
import { storedBriefArm } from './credential-probe.js';
import { briefStandardsOf } from './design-review.js';
import { patchFs } from './fs-patch.testkit.js';
import { authoringSessionIds } from './inventory.js';
import { listStoredDrafts } from './rerender-measure.js';
import { latestPassedDraft } from './review.js';
import { readRunAdvice } from './run-advice.js';
import { readBriefRecord } from './run-dir.js';

// REQ-polaris-generation-034 (syzygy-3efd.76): the version 2.10 reader rule extended to the frozen draft revisions, the brief
// record and the run file `run-advice.json`. Every reader opens the path once without blocking, refuses anything whose descriptor is not a
// regular file, or gives a size past the bound, before reading a byte, and reads at most one byte past the bound, so a file grown after its
// size was taken is refused too. The bounds and the words are the spec's literals. (The draft check is given, the inventory submission and
// the reverification's brief read go through `check` and `inventory-check`; their tests are in check.test.ts and inventory.test.ts.)
//
// A FIFO at the path blocks a reader that opens it without O_NONBLOCK forever, inside a synchronous call no test timeout can interrupt:
// the mutation runner (docs/evidence/syzygy-3efd-76/) bounds each run by a process timeout instead.

const DRAFT_BOUND = 4_194_304;
const BRIEF_BOUND = 262_144;
const RUN_FILE_BOUND = 16_777_216;

/** `json` followed by spaces to exactly `bytes` bytes: still one JSON document. */
const padded = (json: string, bytes: number): string => {
  const text = json + ' '.repeat(bytes - Buffer.byteLength(json));
  if (Buffer.byteLength(text) !== bytes) throw new Error('fixture: padding missed its size');
  return text;
};
const sha256 = (text: string): string => createHash('sha256').update(text).digest('hex');

/** The bytes `run` reads from `subject`, one total per time it opens it. */
const bytesReadFrom = (subject: string, run: () => void): number[] => {
  const opened = new Map<number, number>();
  const totals: number[] = [];
  const restoreOpen = patchFs('openSync', (original) => ((file: fs.PathLike, ...rest: unknown[]) => {
    const fd = (original as (...args: unknown[]) => number)(file, ...rest);
    opened.delete(fd);
    if (file === subject) { opened.set(fd, totals.length); totals.push(0); }
    return fd;
  }) as typeof original);
  const restoreRead = patchFs('readSync', (original) => ((fd: number, ...rest: unknown[]) => {
    const read = (original as (...args: unknown[]) => number)(fd, ...rest);
    const index = opened.get(fd);
    if (index !== undefined) totals[index]! += read;
    return read;
  }) as typeof original);
  try { run(); } finally { restoreRead(); restoreOpen(); }
  return totals;
};

/** Runs `run` while `subject` grows by a mebibyte once a descriptor's size is taken at exactly `bound` bytes. */
const grownAfterSize = (subject: string, bound: number, run: () => void): void => {
  let grown = false;
  const restore = patchFs('fstatSync', (original) => ((fd: number, ...rest: unknown[]) => {
    const stats = (original as (...args: unknown[]) => fs.Stats)(fd, ...rest);
    if (!grown && stats.isFile() && stats.size === bound) { grown = true; fs.appendFileSync(subject, ' '.repeat(1_048_576)); }
    return stats;
  }) as typeof original);
  try { run(); } finally { restore(); }
};

const PLANTS: readonly [string, (file: string) => void][] = [
  ['a FIFO', (file) => execFileSync('mkfifo', [file])],
  ['a symbolic link to /dev/zero', (file) => fs.symlinkSync('/dev/zero', file)],
  ['a directory', (file) => fs.mkdirSync(file)],
];

/** One reader under test: where its file lies in a fresh run, a file it reads at its bound, and what it gives for each case. */
interface Reader {
  readonly name: string;
  readonly bound: number;
  /** A fresh run directory, and the path of the file under test inside it (not yet written). */
  readonly fresh: () => { run: string; subject: string };
  /** The file's bytes at exactly `bound`; `write` may also write what the reader needs beside it. */
  readonly atBound: (run: string, bytes: number) => string;
  readonly read: (run: string) => unknown;
  readonly readAtBound: unknown;
  readonly pastBound: unknown;
  readonly notRegular: unknown;
}

const PINNED = 'a'.repeat(40);
const ISSUED = '2026-11-22T12:00:00.000Z';
const NO_BRIEF = 'the run holds no readable brief.json: no brief was issued, so the deadline clock has not started and no draft is checked';

const briefRun = () => { const run = tempDir('bounded-brief-'); return { run, subject: path.join(run, 'brief.json') }; };
const READERS: readonly Reader[] = [
  {
    name: 'latestPassedDraft (review, render and close)', bound: DRAFT_BOUND,
    fresh: () => {
      const run = tempDir('bounded-frozen-');
      fs.mkdirSync(path.join(run, 'checks'));
      fs.mkdirSync(path.join(run, 'drafts'));
      return { run, subject: path.join(run, 'drafts', 'rev-0.json') };
    },
    atBound: (run, bytes) => {
      const text = padded('{"title":"x"}', bytes);
      fs.writeFileSync(path.join(run, 'checks', 'rev-0.json'), JSON.stringify({ format: 'polaris-dossier-check/1', revision: 0, outcome: 'passed', draft: { file: 'drafts/rev-0.json', sha256: sha256(text) } }));
      return text;
    },
    read: (run) => { const read = latestPassedDraft(run); return read.ok ? { ok: true, revision: read.revision, bytes: read.bytes.length } : read; },
    readAtBound: { ok: true, revision: 0, bytes: 4_194_304 },
    pastBound: { ok: false, reason: 'the frozen draft drafts/rev-0.json cannot be read (larger than 4194304 bytes)' },
    notRegular: { ok: false, reason: 'the frozen draft drafts/rev-0.json cannot be read (not a regular file)' },
  },
  {
    name: 'authoringSessionIds', bound: DRAFT_BOUND,
    fresh: () => { const run = tempDir('bounded-authoring-'); fs.mkdirSync(path.join(run, 'drafts')); return { run, subject: path.join(run, 'drafts', 'rev-0.json') }; },
    atBound: (_run, bytes) => padded('{"sessionId":"author-1","title":"x"}', bytes),
    read: (run) => { const read = authoringSessionIds(run); return { frozen: read.frozen, ids: [...read.ids] }; },
    readAtBound: { frozen: 1, ids: ['author-1'] },
    pastBound: { frozen: 1, ids: [] },
    notRegular: { frozen: 1, ids: [] },
  },
  {
    name: 'readRunAdvice', bound: RUN_FILE_BOUND,
    fresh: () => { const run = tempDir('bounded-run-advice-'); return { run, subject: path.join(run, 'run-advice.json') }; },
    // Padded, the file is not exactly what check writes, so even read it is null: the bytes read tell the cases apart.
    atBound: (_run, bytes) => padded('{"format":"polaris-dossier-run-advice/1"}', bytes),
    read: (run) => readRunAdvice(run),
    readAtBound: null,
    pastBound: null,
    notRegular: null,
  },
  {
    name: 'briefIssuedAt (check)', bound: BRIEF_BOUND, fresh: briefRun,
    atBound: (_run, bytes) => padded(JSON.stringify({ pinnedRevision: PINNED, issuedAt: ISSUED }), bytes),
    read: (run) => briefIssuedAt(run, PINNED),
    readAtBound: Date.UTC(2026, 10, 22, 12, 0, 0),
    pastBound: NO_BRIEF,
    notRegular: NO_BRIEF,
  },
  {
    name: 'storedBriefArm (the execution rule)', bound: BRIEF_BOUND, fresh: briefRun,
    atBound: (_run, bytes) => padded(JSON.stringify({ executionRule: { arm: 'sec-3' } }), bytes),
    read: (run) => storedBriefArm(run),
    readAtBound: 'sec-3',
    pastBound: null,
    notRegular: null,
  },
  {
    name: 'readBriefRecord (the render\'s run disclosure and close)', bound: BRIEF_BOUND, fresh: briefRun,
    atBound: (_run, bytes) => padded(JSON.stringify({ executionRule: { arm: 'permitting' } }), bytes),
    read: (run) => readBriefRecord(run),
    readAtBound: { executionRule: { arm: 'permitting' } },
    pastBound: undefined,
    notRegular: undefined,
  },
  {
    name: 'briefStandardsOf (the design packet)', bound: BRIEF_BOUND, fresh: briefRun,
    atBound: (_run, bytes) => padded(JSON.stringify({ readerStandards: { sha256: 'b'.repeat(64), packs: ['default@1'] } }), bytes),
    read: (run) => briefStandardsOf(run),
    readAtBound: { ok: true, standards: { sha256: 'b'.repeat(64), packs: ['default@1'] } },
    pastBound: { ok: false, reason: 'brief.json is not JSON within its bounds' },
    notRegular: { ok: false, reason: 'brief.json cannot be read (not a regular file)' },
  },
];

describe.each(READERS)('the reader rule (syzygy-3efd.76): $name', (reader) => {
  it('reads a file of exactly its bound, to its end and no further', () => {
    const { run, subject } = reader.fresh();
    fs.writeFileSync(subject, reader.atBound(run, reader.bound));
    let seen: unknown;
    expect(bytesReadFrom(subject, () => { seen = reader.read(run); })).toEqual([reader.bound]);
    expect(seen).toEqual(reader.readAtBound);
  });

  it('refuses a file one byte past its bound from its size alone, reading no byte of it', () => {
    const { run, subject } = reader.fresh();
    fs.writeFileSync(subject, reader.atBound(run, reader.bound + 1));
    let seen: unknown;
    expect(bytesReadFrom(subject, () => { seen = reader.read(run); })).toEqual([0]);
    expect(seen).toEqual(reader.pastBound);
  });

  it('refuses a file grown past its bound after its size was taken, reading at most one byte past the bound', () => {
    const { run, subject } = reader.fresh();
    fs.writeFileSync(subject, reader.atBound(run, reader.bound));
    let seen: unknown, reads: number[] = [];
    grownAfterSize(subject, reader.bound, () => { reads = bytesReadFrom(subject, () => { seen = reader.read(run); }); });
    expect(reads).toEqual([reader.bound + 1]);
    expect(seen).toEqual(reader.pastBound);
  });

  it.each(PLANTS)('refuses %s at its path without blocking or reading a byte', (_what, plant) => {
    const { run, subject } = reader.fresh();
    // What the reader needs beside the file (a passed check record naming it) is written for a regular file, then the file is replaced.
    fs.writeFileSync(subject, reader.atBound(run, 1024));
    fs.rmSync(subject);
    plant(subject);
    let seen: unknown;
    expect(bytesReadFrom(subject, () => { seen = reader.read(run); })).toEqual([0]);
    expect(seen).toEqual(reader.notRegular);
  });
});

// The stored-draft re-render measurement keeps its listing filter: a directory entry that is not a regular file is counted among the other
// files of drafts/ and never opened. A revision that is a regular file when listed and something else when opened, or past the bound, is a
// revision it could not read.
describe('the reader rule (syzygy-3efd.76): listStoredDrafts (the stored-draft re-render measurement)', () => {
  const RUN = `run-${'d'.repeat(32)}`;
  const fresh = (): { root: string; subject: string } => {
    const root = tempDir('bounded-rerender-');
    fs.mkdirSync(path.join(root, RUN, 'drafts'), { recursive: true });
    return { root, subject: path.join(root, RUN, 'drafts', 'rev-0.json') };
  };
  const drafts = (root: string) => listStoredDrafts(root).drafts.map((draft) => ('readError' in draft ? { readError: draft.readError } : { bytes: draft.bytes.length }));

  it('reads a revision of exactly 4,194,304 bytes and refuses one of 4,194,305 unread', () => {
    const { root, subject } = fresh();
    fs.writeFileSync(subject, padded('{}', DRAFT_BOUND));
    let seen: unknown;
    expect(bytesReadFrom(subject, () => { seen = drafts(root); })).toEqual([DRAFT_BOUND]);
    expect(seen).toEqual([{ bytes: 4_194_304 }]);
    fs.writeFileSync(subject, padded('{}', DRAFT_BOUND + 1));
    expect(bytesReadFrom(subject, () => { seen = drafts(root); })).toEqual([0]);
    expect(seen).toEqual([{ readError: 'byte-limit' }]);
  });

  it('refuses a revision grown past the bound after its size was taken, reading at most one byte past it', () => {
    const { root, subject } = fresh();
    fs.writeFileSync(subject, padded('{}', DRAFT_BOUND));
    let seen: unknown, reads: number[] = [];
    grownAfterSize(subject, DRAFT_BOUND, () => { reads = bytesReadFrom(subject, () => { seen = drafts(root); }); });
    expect(reads).toEqual([DRAFT_BOUND + 1]);
    expect(seen).toEqual([{ readError: 'byte-limit' }]);
  });

  it.each(PLANTS)('counts %s listed at a revision\'s name among the other files, never opening it', (_what, plant) => {
    const { root, subject } = fresh();
    plant(subject);
    let listing: ReturnType<typeof listStoredDrafts> | undefined;
    expect(bytesReadFrom(subject, () => { listing = listStoredDrafts(root); })).toEqual([]);
    expect({ otherDraftFiles: listing!.otherDraftFiles, drafts: listing!.drafts }).toEqual({ otherDraftFiles: 1, drafts: [] });
  });

  it.each(PLANTS)('refuses a revision that is %s when opened, though a regular file when listed, reading no byte', (_what, plant) => {
    const { root, subject } = fresh();
    fs.writeFileSync(subject, '{}');
    // Swapped between the listing and the open.
    let swapped = false;
    const restore = patchFs('openSync', (original) => ((file: fs.PathLike, ...rest: unknown[]) => {
      if (file === subject && !swapped) { swapped = true; fs.rmSync(subject); plant(subject); }
      return (original as (...args: unknown[]) => number)(file, ...rest);
    }) as typeof original);
    let seen: unknown, reads: number[] = [];
    try { reads = bytesReadFrom(subject, () => { seen = drafts(root); }); } finally { restore(); }
    expect(swapped).toBe(true);
    expect(reads).toEqual([0]);
    expect(seen).toEqual([{ readError: 'not-a-regular-file' }]);
  });
});
