import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
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

const readers = (record: string) => {
  const run = runWith(record);
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
    const readsOf = (record: string): string[] => {
      const run = runWith(record);
      const subject = path.join(run, 'checks', 'rev-2.json');
      const reads: string[] = [];
      const restore = patchFs('readFileSync', (original) => ((file: fs.PathOrFileDescriptor, ...rest: unknown[]) => {
        if (file === subject) reads.push('rev-2.json');
        return (original as (...args: unknown[]) => unknown)(file, ...rest);
      }) as typeof original);
      try {
        latestPassedDraft(run); cycleBreakdown(run); latestChecks(run);
      } finally { restore(); }
      return reads;
    };
    expect(readsOf(ofBytes(16_777_217))).toEqual([]);
    expect(readsOf(ofBytes(16_777_216))).toEqual(['rev-2.json', 'rev-2.json', 'rev-2.json']);
  });

  it('reads a record of 2,000,000 values and refuses one of 2,000,001, in every reader', () => {
    const at = ofValues(2_000_000), past = ofValues(2_000_001);
    // Counted outside the reader: every value is a `0` in the pad array, or one of the eight others.
    expect([at.split(/[,[]0(?=[,\]])/u).length - 1 + 8, past.split(/[,[]0(?=[,\]])/u).length - 1 + 8]).toEqual([2_000_000, 2_000_001]);
    expect(readers(at)).toEqual(READ);
    expect(readers(past)).toEqual(UNREADABLE);
  });

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
