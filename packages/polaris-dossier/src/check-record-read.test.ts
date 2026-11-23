import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { NotARegularFileError, readBoundedFile, readCheckRecord } from './check-record-read.js';
import { patchFs } from './fs-patch.testkit.js';
import { cycleBreakdown, latestChecks } from './polaris.js';
import { latestPassedDraft } from './review.js';

// REQ-polaris-generation-034 version 2.8 (syzygy-3efd.72): every reader of a draft check record reads it as one JSON document of at most
// 16,777,216 bytes and 2,000,000 values, no value nested more than 16 levels below the root (the root at depth 0). A record past any bound
// cannot be read: never a passed draft, never a draft check refused. The bounds below are the spec's literals; each fixture record is built
// to sit exactly at a bound or one past it, and its size is checked against the literal before any reader runs.

const DRAFT_BYTES = '{}\n';
const DRAFT_SHA256 = createHash('sha256').update(DRAFT_BYTES).digest('hex');
/** A passed draft check record of revision 2, with `extra` members; its own values are the root, format, revision, outcome, draft,
 * draft.file and draft.sha256: seven. */
const passed = (extra: Record<string, unknown>) => ({ format: 'polaris-dossier-check/1', revision: 2, outcome: 'passed', draft: { file: 'drafts/rev-2.json', sha256: DRAFT_SHA256 }, ...extra });

/** Exactly `bytes` bytes: the passed record with an ASCII `pad` string sized to fill it. */
const ofBytes = (bytes: number): string => {
  const empty = JSON.stringify(passed({ pad: '' }));
  return JSON.stringify(passed({ pad: 'x'.repeat(bytes - empty.length) }));
};
/** Exactly `values` values: the record's seven, the `pad` array and `values - 8` zeros in it. */
const ofValues = (values: number): string => JSON.stringify(passed({ pad: new Array<number>(values - 8).fill(0) }));
/** A value nested `depth` levels below the root: `pad` (depth 1) holds `depth - 2` more arrays, the innermost holding a 0. */
const ofDepth = (depth: number): string => `${JSON.stringify(passed({})).slice(0, -1)},"pad":${'['.repeat(depth - 1)}0${']'.repeat(depth - 1)}}`;

/** A run whose checks/ holds a refused revision 1 and the record under test as revision 2, beside the frozen draft it names. */
const runWith = (record: string): string => {
  const run = tempDir('check-record-read-');
  fs.mkdirSync(path.join(run, 'checks'));
  fs.mkdirSync(path.join(run, 'drafts'));
  fs.writeFileSync(path.join(run, 'drafts', 'rev-2.json'), DRAFT_BYTES);
  fs.writeFileSync(path.join(run, 'checks', 'rev-1.json'), JSON.stringify({ format: 'polaris-dossier-check/1', revision: 1, outcome: 'findings' }));
  fs.writeFileSync(path.join(run, 'checks', 'rev-2.json'), record);
  return run;
};

const READ = { passed: { ok: true, revision: 2 }, breakdown: ' (1 on drafts check refused, 1 on drafts that passed check)', latest: { n: 2, outcome: 'passed' } };
const UNREADABLE = { passed: { ok: false, reason: 'the check result of draft revision 2 cannot be read' }, breakdown: ' (1 on drafts check refused, 0 on drafts that passed check)', latest: null };

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

const readers = (record: string) => readersAt(runWith(record));
const readersAt = (run: string) => {
  const draft = latestPassedDraft(run);
  const { draft: latest } = latestChecks(run);
  return {
    passed: draft.ok ? { ok: true, revision: draft.revision } : draft,
    breakdown: cycleBreakdown(run),
    latest: latest === null ? null : { n: latest.n, outcome: latest.doc['outcome'] },
  };
};

describe('the check-record read bound (version 2.8)', () => {
  it('reads a record of 16,777,216 bytes and refuses one of 16,777,217, in every reader', () => {
    const at = ofBytes(16_777_216), past = ofBytes(16_777_217);
    expect([Buffer.byteLength(at), Buffer.byteLength(past)]).toEqual([16_777_216, 16_777_217]);
    expect(readers(at)).toEqual(READ);
    expect(readers(past)).toEqual(UNREADABLE);
  });

  it('refuses a record over 16,777,216 bytes from its size alone, never reading a byte of it, and reads one at the bound', () => {
    const readsOf = (record: string): number[] => {
      const run = runWith(record);
      return bytesReadFrom(path.join(run, 'checks', 'rev-2.json'), () => { latestPassedDraft(run); cycleBreakdown(run); latestChecks(run); });
    };
    expect(readsOf(ofBytes(16_777_217))).toEqual([0, 0, 0]);
    // Each reader opens the record once, and reads it to its end plus the one byte that shows the end: 16,777,216 bytes each.
    expect(readsOf(ofBytes(16_777_216))).toEqual([16_777_216, 16_777_216, 16_777_216]);
    // A record a gigabyte long, which no test writes whole: a sparse file whose descriptor's size alone refuses it.
    const run = runWith('{}');
    const sparse = path.join(run, 'checks', 'rev-2.json');
    fs.truncateSync(sparse, 1_073_741_824);
    let seen: ReturnType<typeof readersAt> | undefined;
    expect(bytesReadFrom(sparse, () => { seen = readersAt(run); })).toEqual([0, 0, 0]);
    expect(seen).toEqual(UNREADABLE);
  });

  // syzygy-8dzi: building and reading 2,000,001 values measured 5.4-7.2 s alone on a loaded host, past the 5 s default.
  it('reads a record of 2,000,000 values and refuses one of 2,000,001, in every reader', () => {
    const at = ofValues(2_000_000), past = ofValues(2_000_001);
    // Counted outside the reader: every value is a `0` in the pad array, or one of the eight others.
    expect([at.split(/[,[]0(?=[,\]])/u).length - 1 + 8, past.split(/[,[]0(?=[,\]])/u).length - 1 + 8]).toEqual([2_000_000, 2_000_001]);
    expect(readers(at)).toEqual(READ);
    expect(readers(past)).toEqual(UNREADABLE);
  }, 30_000);

  it('reads a record with a value nested 16 levels below the root and refuses one nested 17, in every reader', () => {
    const at = ofDepth(16), past = ofDepth(17);
    expect([at.split('[').length - 1, past.split('[').length - 1]).toEqual([15, 16]);
    expect(readers(at)).toEqual(READ);
    expect(readers(past)).toEqual(UNREADABLE);
  });

  it('reads a passed record over the draft\'s own 4 MiB bound: review, render and close no longer refuse it', () => {
    const record = ofBytes(4_194_305);
    expect(Buffer.byteLength(record)).toBe(4_194_305);
    expect(readers(record)).toEqual(READ);
  });

  it('counts a record that does not parse, or is not one JSON object, in neither figure of the end screen', () => {
    for (const record of ['{', '[1, 2]', 'null', '"passed"']) {
      expect(readers(record), record).toEqual({ ...UNREADABLE, latest: null });
    }
  });
});

// REQ-polaris-generation-034 version 2.10 (syzygy-3efd.74, review finding F1): every reader opens the path once without blocking, refuses
// anything whose descriptor is not a regular file, or gives a size past the bound, before reading a byte, and reads at most one byte past
// the bound. Each case below would block (a FIFO) or exhaust memory (a device) under a stat-then-read reader.
describe('the check-record reader rule (version 2.10)', () => {
  const plantAt = (plant: (file: string) => void): { run: string; subject: string } => {
    const run = runWith('{}');
    const subject = path.join(run, 'checks', 'rev-2.json');
    fs.rmSync(subject);
    plant(subject);
    return { run, subject };
  };
  const plants: [string, (file: string) => void][] = [
    ['a FIFO', (file) => execFileSync('mkfifo', [file])],
    ['a symbolic link to /dev/zero', (file) => fs.symlinkSync('/dev/zero', file)],
    ['a directory', (file) => fs.mkdirSync(file)],
  ];

  it('refuses a FIFO, a device and a directory at a check record\'s path in every reader, reading no byte and never blocking', () => {
    for (const [what, plant] of plants) {
      const { run, subject } = plantAt(plant);
      let seen: ReturnType<typeof readersAt> | undefined;
      expect(bytesReadFrom(subject, () => { seen = readersAt(run); }), what).toEqual([0, 0, 0]);
      expect(seen, what).toEqual(UNREADABLE);
    }
  });

  it('refuses each by its own error before reading a byte, and reads a regular file through a symbolic link', () => {
    for (const [what, plant] of plants) {
      const { subject } = plantAt(plant);
      expect(() => readBoundedFile(subject, 16), what).toThrow(NotARegularFileError);
    }
    const { subject } = plantAt((file) => { fs.writeFileSync(`${file}.target`, '{"a":1}'); fs.symlinkSync(`${file}.target`, file); });
    expect(readCheckRecord(subject)).toEqual({ a: 1 });
  });

  it('reads a file of exactly the bound and refuses one byte more, and a file far past it from its size alone', () => {
    const { subject } = plantAt((file) => fs.writeFileSync(file, 'x'.repeat(16)));
    expect(readBoundedFile(subject, 16).toString('utf8')).toBe('x'.repeat(16));
    fs.writeFileSync(subject, 'x'.repeat(17));
    expect(() => readBoundedFile(subject, 16)).toThrow(expect.objectContaining({ name: 'BoundedJsonError', code: 'byte-limit' }));
    fs.truncateSync(subject, 1_073_741_824);
    expect(bytesReadFrom(subject, () => expect(() => readBoundedFile(subject, 16)).toThrow(expect.objectContaining({ code: 'byte-limit' })))).toEqual([0]);
  });

  it('refuses a record grown past the bound after its size was taken, reading at most one byte past the bound, in every reader', () => {
    const run = runWith(ofBytes(16_777_216));
    const subject = path.join(run, 'checks', 'rev-2.json');
    // After each reader takes the descriptor's size, the file grows by a mebibyte before a byte is read.
    const restore = patchFs('fstatSync', (original) => ((fd: number, ...rest: unknown[]) => {
      const stats = (original as (...args: unknown[]) => fs.Stats)(fd, ...rest);
      if (stats.size === 16_777_216) fs.appendFileSync(subject, ' '.repeat(1_048_576));
      return stats;
    }) as typeof original);
    let seen: ReturnType<typeof readersAt> | undefined;
    let reads: number[];
    try {
      reads = bytesReadFrom(subject, () => { seen = readersAt(run); });
    } finally { restore(); }
    // The first reader saw the file at 16,777,216 bytes and read 16,777,217 of it; the file was then larger, so the others read none.
    expect(reads).toEqual([16_777_217, 0, 0]);
    expect(seen).toEqual(UNREADABLE);
  });

  it('refuses, by its own byte bound, a file grown past the bound after its size was taken, before any parse', () => {
    const { subject } = plantAt((file) => fs.writeFileSync(file, 'x'.repeat(16)));
    const restore = patchFs('fstatSync', (original) => ((fd: number, ...rest: unknown[]) => {
      const stats = (original as (...args: unknown[]) => fs.Stats)(fd, ...rest);
      fs.appendFileSync(subject, 'x');
      return stats;
    }) as typeof original);
    let reads: number[];
    try {
      reads = bytesReadFrom(subject, () => expect(() => readBoundedFile(subject, 16)).toThrow(expect.objectContaining({ name: 'BoundedJsonError', code: 'byte-limit' })));
    } finally { restore(); }
    expect(reads).toEqual([17]);
  });

  // Review note 7: a terminal device at the path must never become the reader's controlling terminal. That outcome is observable only in
  // a process with no controlling terminal opening a pseudo-terminal, which node cannot allocate without a native module, so this pins the
  // open's flags instead: read-only, non-blocking and no controlling terminal, and nothing else.
  it('opens the path read-only, without blocking and never as a controlling terminal', () => {
    const { subject } = plantAt((file) => fs.writeFileSync(file, '{}'));
    const flags: unknown[] = [];
    const restore = patchFs('openSync', (original) => ((file: fs.PathLike, ...rest: unknown[]) => {
      if (file === subject) flags.push(rest[0]);
      return (original as (...args: unknown[]) => number)(file, ...rest);
    }) as typeof original);
    try { readCheckRecord(subject); } finally { restore(); }
    expect(flags).toEqual([fs.constants.O_RDONLY | fs.constants.O_NONBLOCK | fs.constants.O_NOCTTY]);
    // On Linux: 0, 0o4000 and 0o400.
    expect(flags).toEqual([0o4400]);
  });
});
