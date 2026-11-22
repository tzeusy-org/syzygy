import * as fs from 'node:fs';
import path from 'node:path';
import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { sha256 } from '@syzygy/support';
import { describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { readUrlStoppedBoundary } from './url-stopped-run.js';

const stoppedFixture = () => {
  const parent = tempDir('url-stopped-boundary-');
  const root = path.join(parent, 'host');
  const runId = `run-${'d'.repeat(32)}`;
  const run = path.join(parent, runId);
  fs.mkdirSync(root, { mode: 0o700 });
  fs.mkdirSync(run);
  const expected = { run, runId, generation: 'a'.repeat(32), coreSha256: 'b'.repeat(64),
    declarationSha256: 'c'.repeat(64), sourcePin: '1'.repeat(40), deadline: 5000 };
  const record = { ...expected, format: 'polaris-url-stopped-boundary/1', sourceStore: 'owned-loose',
    attempt: 'attempt-own111', stoppedAt: 1000, audit: {}, machine: {}, products: {},
    spend: { requestReservations: 2, completeUsageReports: 1, reportedTokens: 15 } };
  const file = path.join(root, `${sha256(run)}.stopped.json`);
  const write = (value: typeof record = record) => fs.writeFileSync(file,
    `${encodeCanonicalJson({ record: value, sha256: sha256(encodeCanonicalJson(value)) })}\n`, { mode: 0o600 });
  return { root, run, expected, record, file, write, load: () => readUrlStoppedBoundary(root, expected, 2000) };
};

describe('retained URL stop expectation', () => {
  it('reads the exact private stopped slot before the original deadline', () => {
    const f = stoppedFixture();
    expect(f.load()).toBeNull();
    f.write();
    const result = f.load();
    expect(result).toEqual({ record: f.record, sha256: sha256(encodeCanonicalJson(f.record)) });
    expect(Object.isFrozen(result?.record)).toBe(true);
    expect(readUrlStoppedBoundary(f.root, { ...f.expected, generation: '2'.repeat(32) }, 2000)).toBeNull();
    expect(readUrlStoppedBoundary(f.root, f.expected, 999)).toBeNull();
    expect(readUrlStoppedBoundary(f.root, f.expected, 5000)).toBeNull();
    fs.chmodSync(f.root, 0o2700);
    expect(f.load()).toEqual(result);
  });

  it('refuses an inconsistent subject or spend and an invalid or aliased slot', () => {
    const f = stoppedFixture();
    f.write({ ...f.record, sourcePin: '2'.repeat(40) });
    expect(f.load()).toBeNull();
    f.write({ ...f.record, spend: { ...f.record.spend, completeUsageReports: 3 } });
    expect(f.load()).toBeNull();
    f.write();
    fs.appendFileSync(f.file, ' ');
    expect(f.load()).toBeNull();
    f.write();
    const alternate = `${f.file}.alternate`;
    fs.linkSync(f.file, alternate);
    expect(f.load()).toBeNull();
    fs.unlinkSync(f.file);
    fs.symlinkSync(alternate, f.file);
    expect(f.load()).toBeNull();
    fs.unlinkSync(f.file);
    f.write();
    fs.chmodSync(f.file, 0o640);
    expect(f.load()).toBeNull();
  });
});
