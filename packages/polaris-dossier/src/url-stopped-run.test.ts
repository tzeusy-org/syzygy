import * as fs from 'node:fs';
import path from 'node:path';
import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { sha256 } from '@syzygy/support';
import { describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { acquireUrlRecoveryClaim, isUrlRecoveryClaim, readUrlStoppedBoundary, readUrlStoppedBoundaryChain } from './url-stopped-run.js';

const canonical = (value: unknown) => encodeCanonicalJson(value, { maxBytes: 262_144, maxNodes: 32_768, maxDepth: 16 });

const stoppedFixture = () => {
  const parent = tempDir('url-stopped-boundary-');
  const root = path.join(parent, 'host');
  const runId = `run-${'d'.repeat(32)}`;
  const run = path.join(parent, runId);
  fs.mkdirSync(root, { mode: 0o700 });
  fs.mkdirSync(run);
  const expected = { run, runId, generation: 'a'.repeat(32), coreSha256: 'b'.repeat(64),
    declarationSha256: 'c'.repeat(64), sourcePin: '1'.repeat(40), deadline: 5000 };
  const record = { ...expected, format: 'polaris-url-stopped-boundary/2', sourceStore: 'owned-loose',
    attempt: 'attempt-own111', machineAttempt: 'attempt-own111', predecessor: null as { generation: string; sha256: string } | null,
    roles: [{}, {}, {}, {}], stoppedAt: 1000, audit: {}, machine: {}, products: {},
    spend: { requestReservations: 2, completeUsageReports: 1, reportedTokens: 15 } };
  const slot = (generation: string) => path.join(root, `${sha256(run)}.${generation}.stopped.json`);
  const file = slot(expected.generation);
  const write = (value: typeof record = record) => fs.writeFileSync(slot(value.generation),
    `${canonical({ record: value, sha256: sha256(canonical(value)) })}\n`, { mode: 0o600 });
  return { root, run, expected, record, file, slot, write, load: () => readUrlStoppedBoundary(root, expected, 2000) };
};

describe('retained URL stop expectation', () => {
  it('reads the exact private stopped slot before the original deadline', () => {
    const f = stoppedFixture();
    expect(f.load()).toBeNull();
    f.write();
    const result = f.load();
    expect(result).toEqual({ record: f.record, sha256: sha256(canonical(f.record)) });
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

  it('keeps repeat stops in distinct immutable generations and rejects broken links, changed subjects and cycles', () => {
    const f = stoppedFixture(); f.write();
    const firstBytes = fs.readFileSync(f.file), first = f.load()!;
    const next = { ...f.record, generation: '2'.repeat(32), attempt: 'attempt-own222', stoppedAt: 1500,
      predecessor: { generation: f.expected.generation, sha256: first.sha256 },
      spend: { requestReservations: 3, completeUsageReports: 2, reportedTokens: 25 } };
    f.write(next);
    const expected = { ...f.expected, generation: next.generation };
    expect(readUrlStoppedBoundaryChain(f.root, expected, 2000)?.map(value => value.record.generation))
      .toEqual([f.expected.generation, next.generation]);
    expect(fs.readFileSync(f.file)).toEqual(firstBytes);
    f.write({ ...next, predecessor: { ...next.predecessor, sha256: 'f'.repeat(64) } });
    expect(readUrlStoppedBoundaryChain(f.root, expected, 2000)).toBeNull();
    f.write({ ...next, machineAttempt: 'attempt-own333' });
    expect(readUrlStoppedBoundaryChain(f.root, expected, 2000)).toBeNull();
    f.write({ ...next, attempt: f.record.attempt });
    expect(readUrlStoppedBoundaryChain(f.root, expected, 2000)).toBeNull();
    f.write({ ...next, sourcePin: '2'.repeat(40) });
    expect(readUrlStoppedBoundaryChain(f.root, expected, 2000)).toBeNull();
    f.write({ ...next, predecessor: { generation: next.generation, sha256: first.sha256 } });
    expect(readUrlStoppedBoundaryChain(f.root, expected, 2000)).toBeNull();
    let previous = first;
    for (let ordinal = 1; ordinal <= 64; ordinal++) {
      const generation = ordinal.toString(16).padStart(32, '0');
      const record = { ...f.record, generation, attempt: `attempt-o${ordinal.toString().padStart(5, '0')}`,
        predecessor: { generation: previous.record.generation, sha256: previous.sha256 } };
      f.write(record);
      previous = readUrlStoppedBoundary(f.root, { ...f.expected, generation }, 2000)!;
      const chain = readUrlStoppedBoundaryChain(f.root, { ...f.expected, generation }, 2000);
      if (ordinal === 63) expect(chain).toHaveLength(64);
      if (ordinal === 64) expect(chain).toBeNull();
    }
  });

  it('holds a real protected exclusive recovery lease, consumes once and permits a later generation without replay', () => {
    const f = stoppedFixture(); f.write(); const boundary = f.load()!;
    let live = true;
    const input = { root: f.root, expected: f.expected, sha256: boundary.sha256, now: () => 2000, current: () => live };
    let claim = acquireUrlRecoveryClaim(input)!;
    expect(claim).not.toBeNull(); expect(isUrlRecoveryClaim(claim)).toBe(true); expect(isUrlRecoveryClaim({ ...claim })).toBe(false);
    expect(claim.current()).toBe(false); expect(acquireUrlRecoveryClaim(input)).toBeNull();
    expect(claim.release()).toBe(true);
    claim = acquireUrlRecoveryClaim(input)!;
    expect(claim).not.toBeNull();
    expect(claim.consume()).toBe(true); expect(claim.consume()).toBe(true);
    expect(claim.current()).toBe(true);
    live = false; expect(claim.current()).toBe(false); expect(claim.release()).toBe(true); expect(claim.current()).toBe(false);
    live = true; expect(acquireUrlRecoveryClaim(input)).toBeNull();
    const next = { ...f.record, generation: '2'.repeat(32), attempt: 'attempt-own222', stoppedAt: 1500,
      predecessor: { generation: f.expected.generation, sha256: boundary.sha256 } };
    f.write(next);
    const expected = { ...f.expected, generation: next.generation };
    const sealed = readUrlStoppedBoundary(f.root, expected, 2000)!;
    const successor = acquireUrlRecoveryClaim({ ...input, expected, sha256: sealed.sha256 })!;
    expect(successor).not.toBeNull(); expect(successor.consume()).toBe(true); expect(successor.release()).toBe(true);
    expect(fs.readFileSync(f.file, 'utf8')).toContain(boundary.sha256);
  });

  it('never steals a stale or replaced lock, and invalidates a holder when its stop bytes change', () => {
    const f = stoppedFixture(); f.write(); const boundary = f.load()!;
    const input = { root: f.root, expected: f.expected, sha256: boundary.sha256, now: () => 2000, current: () => true };
    const claim = acquireUrlRecoveryClaim(input)!;
    const lock = path.join(f.root, `${sha256(f.run)}.recovery.lock`), old = `${lock}.old`;
    fs.renameSync(lock, old); fs.mkdirSync(lock, { mode: 0o700 });
    expect(claim.current()).toBe(false); expect(claim.consume()).toBe(false); expect(claim.release()).toBe(false);
    expect(acquireUrlRecoveryClaim(input)).toBeNull(); expect(fs.lstatSync(lock).isDirectory()).toBe(true);
    const g = stoppedFixture(); g.write(); const original = g.load()!;
    const other = acquireUrlRecoveryClaim({ ...input, root: g.root, expected: g.expected, sha256: original.sha256 })!;
    g.write({ ...g.record, stoppedAt: 1100 });
    expect(other.current()).toBe(false); expect(other.consume()).toBe(false); expect(other.release()).toBe(true);
  });
});
