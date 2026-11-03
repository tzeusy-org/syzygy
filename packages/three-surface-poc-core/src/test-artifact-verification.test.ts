import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';

import {
  buildOperatorReportedTestArtifactRecord,
  clearTestArtifactRecordFile,
  liveTestOperatorInstructions,
  MAX_JUNIT_ARTIFACT_BYTES,
  posixShellWord,
  parseJUnitRootTotals,
  readBoundedRegularFile,
  readTestArtifactRecordFile,
  resolveTestArtifactVerification,
  UNMARKED_RECORD_REASON,
  writeTestArtifactRecordFile,
  type UnmarkedTestArtifactRecord,
  type OperatorReportedTestArtifactRecord,
} from './test-artifact-verification.js';

/** CPU time so far: this thread's (`process.threadCpuUsage`, Node 23.9 and later) or, where `process.threadCpuUsage` is absent
 * (Node before 23.9), the whole process's (`process.cpuUsage`), which also counts the worker's other threads; each bound keeps
 * its 10x margins under both (docs/evidence/syzygy-bpyt-4-5/cpu-separation-node22.json). */
const cpuUsage = (from?: NodeJS.CpuUsage): NodeJS.CpuUsage =>
  (typeof process.threadCpuUsage === 'function' ? process.threadCpuUsage(from) : process.cpuUsage(from));
/** CPU milliseconds spent since `from`: the work done, which neither load on the host nor the pool running the file stretches. */
const cpuMsSince = (from: NodeJS.CpuUsage): number => { const { user, system } = cpuUsage(from); return (user + system) / 1000; };
// A CPU-time bound sits at least 10x from the slowest head run of its region and from the fastest run of the quadratic
// mutant it names (docs/evidence/syzygy-bpyt-4-5/cpu-separation.json, syzygy-bpyt.4.5). Each was set at the geometric
// mean of the two at 3fc3709f and is kept, not refitted to each re-measurement, while both margins hold.
const TAG_SCAN_CPU_MS = 1_500; // the `<testsuite\s+([^>]*?)\/?>` scan 169e38db replaced
const ATTRIBUTE_SCAN_CPU_MS = 3_000; // the `(\w+)="…"` attribute scan 169e38db replaced

function stateDir(): string {
  const dir = tempDir('syzygy-poc-test-artifact-');
  return dir;
}

const PASSING_JUNIT = `<?xml version="1.0" encoding="utf-8"?>
<testsuites tests="3" failures="0" errors="0" skipped="0" time="0.421">
  <testsuite name="pytest" tests="3" failures="0" errors="0" skipped="0" time="0.421">
    <testcase classname="tests.connectors.test_whatsapp_user_client" name="test_mapped_lid" time="0.1">
      <system-out>this body content must never be indexed: SECRET-abc123</system-out>
    </testcase>
  </testsuite>
</testsuites>`;

const FAILING_JUNIT = `<?xml version="1.0" encoding="utf-8"?>
<testsuites tests="3" failures="1" errors="0" skipped="0" time="0.5">
  <testsuite name="pytest" tests="3" failures="1" errors="0" skipped="0" time="0.5">
    <testcase classname="tests.connectors.test_whatsapp_user_client" name="test_mapped_lid" time="0.1">
      <failure message="raw exception content that must never be indexed">Traceback...</failure>
    </testcase>
  </testsuite>
</testsuites>`;

// The real shape pytest 9.0.2 emits: the outer `<testsuites>` wrapper
// carries only `name`, never totals — all real numbers live on the
// nested `<testsuite>` tag. Captured against a real Butlers focused run
// (tests/connectors/test_whatsapp_user_client.py at commit c13894238)
// during this bead's manual end-to-end verification.
const REAL_PYTEST_JUNIT_SHAPE = `<?xml version="1.0" encoding="utf-8"?><testsuites name="pytest tests"><testsuite name="pytest" errors="0" failures="0" skipped="0" tests="83" time="14.727" timestamp="2026-08-30T15:40:16.644522+08:00" hostname="Tzeusy"><testcase classname="tests.connectors.test_whatsapp_user_client" name="test_single_event_envelope_contract" time="0.003" /></testsuite></testsuites>`;

describe('parseJUnitRootTotals', () => {
  it('reads only the outermost root-tag attributes', () => {
    const totals = parseJUnitRootTotals(PASSING_JUNIT);
    expect(totals).toEqual({ tests: 3, failures: 0, errors: 0, skipped: 0, time: 0.421 });
  });

  it('returns null for content with no testsuite root', () => {
    expect(parseJUnitRootTotals('<not-junit/>')).toBeNull();
  });

  it('falls back to the nested <testsuite> totals when the <testsuites> wrapper carries none (real pytest shape)', () => {
    const totals = parseJUnitRootTotals(REAL_PYTEST_JUNIT_SHAPE);
    expect(totals).toEqual({ tests: 83, failures: 0, errors: 0, skipped: 0, time: 14.727 });
  });

  it('matches the tag name in any ASCII case and keeps indices aligned past a non-ASCII character', () => {
    expect(parseJUnitRootTotals('İİ<TestSuite tests="2" failures="1">')).toEqual({ tests: 2, failures: 1, errors: 0, skipped: 0, time: null });
  });

  it('refuses input over the ceiling without scanning it', () => {
    const oversized = '<testsuite tests="1">'.padEnd(MAX_JUNIT_ARTIFACT_BYTES + 1, ' ');
    expect(parseJUnitRootTotals(oversized)).toBeNull();
  });

  // Round-1 finding 2: the old `/<testsuite\s+([^>]*?)\/?>/i` took 30.7 s
  // on 960 KB of unterminated tags, and `(\w+)="…"` is quadratic over a
  // long word run. Each crafted input below sits just under the ceiling.
  // The near-miss tag-names case has no mutant of its own under TAG_SCAN_CPU_MS: the replaced scan is linear on it too
  // (docs/evidence/syzygy-bpyt-4-5/cpu-separation.json), so its bound is the other two cases' (syzygy-bpyt.4.5).
  it.each([
    ['unterminated opening tags', '<testsuite a'],
    ['unterminated plural tags', '<testsuites a'],
    ['near-miss tag names', '<testsuitex '],
  ])('scans %s at the ceiling in linear time', (_label, unit) => {
    const crafted = unit.repeat(Math.floor(MAX_JUNIT_ARTIFACT_BYTES / unit.length));
    const cpu = cpuUsage();
    expect(parseJUnitRootTotals(crafted)).toBeNull();
    expect(cpuMsSince(cpu)).toBeLessThan(TAG_SCAN_CPU_MS);
  });

  it('scans one tag body that is a single word run at the ceiling in linear time', () => {
    const crafted = `<testsuite ${'a'.repeat(MAX_JUNIT_ARTIFACT_BYTES - 32)} tests="1">`;
    const cpu = cpuUsage();
    expect(parseJUnitRootTotals(crafted)).toEqual({ tests: 1, failures: 0, errors: 0, skipped: 0, time: null });
    expect(cpuMsSince(cpu)).toBeLessThan(ATTRIBUTE_SCAN_CPU_MS);
  });

  // Round-2 note 6: last-wins let `failures="1" … failures="0"` read as 0.
  it.each([
    ['a repeated count', '<testsuite tests="2" failures="1" failures="0">'],
    ['a repeated total', '<testsuite tests="0" tests="2">'],
    ['a repeated attribute on the wrapper', '<testsuites tests="2" tests="2">'],
  ])('refuses %s rather than reading either value', (_label, xml) => {
    expect(parseJUnitRootTotals(xml)).toBeNull();
  });

  it('refuses a repeated attribute on the nested suite even when the wrapper carries totals', () => {
    expect(parseJUnitRootTotals('<testsuites tests="2"><testsuite tests="2" failures="1" failures="0">')).toBeNull();
  });
});

const OBSERVED_COMMIT = 'c13894238989d3bebb24094730992970b31fe546';
const SCOPE = 'tests/connectors/test_whatsapp_user_client.py';

function passingRecord(overrides: Partial<UnmarkedTestArtifactRecord> = {}): UnmarkedTestArtifactRecord {
  return {
    command: ['python3', '-m', 'pytest', SCOPE, '-q'],
    exitCode: 0,
    capturedAt: '2026-08-30T08:00:00Z',
    repositoryCommit: OBSERVED_COMMIT,
    scope: SCOPE,
    digest: 'sha256:' + '0'.repeat(64),
    summary: '3 passed, 0 failed, 0 errored, 0 skipped in 0.42s',
    ...overrides,
  };
}

function reportedRecord(overrides: Partial<OperatorReportedTestArtifactRecord> = {}): OperatorReportedTestArtifactRecord {
  return {
    provenance: 'operator-reported',
    command: ['python3', '-m', 'pytest', SCOPE, '-q'],
    exitCode: 0,
    ingestedAt: '2026-08-30T08:00:00Z',
    repositoryCommit: OBSERVED_COMMIT,
    scope: SCOPE,
    digest: 'sha256:' + '0'.repeat(64),
    summary: '3 passed, 0 failed, 0 errored, 0 skipped in 0.42s',
    ...overrides,
  };
}

describe('buildOperatorReportedTestArtifactRecord', () => {
  const input = {
    command: ['python3', '-m', 'pytest', SCOPE, '-q'],
    reportedExitCode: 0,
    ingestedAt: '2026-08-30T08:00:00Z',
    repositoryCommit: OBSERVED_COMMIT,
    scope: SCOPE,
  };

  const bytes = (text: string): Buffer => Buffer.from(text, 'utf8');

  it('marks the record operator-reported, with an ingest time and no capture time, and never stores the body (AC5)', () => {
    const result = buildOperatorReportedTestArtifactRecord({ ...input, rawJUnit: bytes(PASSING_JUNIT) });
    expect(result.kind).toBe('built');
    if (result.kind !== 'built') throw new Error('unreachable');
    expect(result.record.provenance).toBe('operator-reported');
    expect(result.record.ingestedAt).toBe('2026-08-30T08:00:00Z');
    expect(result.record.summary).toBe('3 passed, 0 failed, 0 errored, 0 skipped in 0.421s');
    expect('capturedAt' in result.record).toBe(false);
    const serialized = JSON.stringify(result.record);
    expect(serialized).not.toContain('SECRET-abc123');
    expect(serialized).not.toContain('system-out');
  });

  it('rejects an artifact with no recognizable JUnit root, or a repeated count attribute', () => {
    expect(buildOperatorReportedTestArtifactRecord({ ...input, rawJUnit: bytes('not xml at all') }).kind).toBe('unparseable');
    expect(buildOperatorReportedTestArtifactRecord({ ...input, rawJUnit: bytes('<testsuite tests="2" failures="1" failures="0">') }).kind).toBe('unparseable');
  });

  it('refuses status 0 beside a failure, and beside zero tests', () => {
    expect(buildOperatorReportedTestArtifactRecord({ ...input, rawJUnit: bytes(FAILING_JUNIT) }).kind).toBe('inconsistent');
    expect(buildOperatorReportedTestArtifactRecord({ ...input, rawJUnit: bytes('<testsuite tests="0">') }).kind).toBe('inconsistent');
    expect(buildOperatorReportedTestArtifactRecord({ ...input, reportedExitCode: 5, rawJUnit: bytes('<testsuite tests="0">') }).kind).toBe('built');
  });

  // Round-2 note 5: the digest was taken over the UTF-8-decoded text, so a
  // file that is not valid UTF-8 recorded a digest `sha256sum` never gives.
  it('digests the file\'s own bytes, which equal sha256sum even when they are not valid UTF-8', () => {
    const dir = stateDir();
    const path = join(dir, 'a.xml');
    const raw = Buffer.concat([bytes('<testsuite tests="1" name="'), Buffer.from([0xff, 0xfe, 0xc3]), bytes('">')]);
    writeFileSync(path, raw);
    const result = buildOperatorReportedTestArtifactRecord({ ...input, reportedExitCode: 1, rawJUnit: readBoundedRegularFile(path) });
    expect(result.kind).toBe('built');
    if (result.kind !== 'built') throw new Error('unreachable');
    expect(result.record.digest).toBe(`sha256:${createHash('sha256').update(raw).digest('hex')}`);
    expect(result.record.digest).not.toBe(`sha256:${createHash('sha256').update(raw.toString('utf8'), 'utf8').digest('hex')}`);
  });

  it('measures the ceiling in bytes, not decoded characters', () => {
    // Two bytes per character: over the ceiling in bytes, half of it in text.
    const oversized = bytes(`<testsuite tests="1">${'é'.repeat(MAX_JUNIT_ARTIFACT_BYTES / 2)}`);
    expect(oversized.byteLength).toBeGreaterThan(MAX_JUNIT_ARTIFACT_BYTES);
    expect(buildOperatorReportedTestArtifactRecord({ ...input, reportedExitCode: 1, rawJUnit: oversized }).kind).toBe('unparseable');
  });
});

describe('resolveTestArtifactVerification', () => {
  // Round-2 note 2: a record with no provenance was written by the retired
  // spawning capture or by hand, and Syzygy cannot tell which.
  it('fails closed on a record with no provenance: Unknown, never Verified, even when it passes and binds', () => {
    const result = resolveTestArtifactVerification({
      record: passingRecord(),
      expectedScope: SCOPE,
      observedCommit: OBSERVED_COMMIT,
      commitAuthoredAt: '2026-08-30T07:00:00Z',
      evaluationAsOf: '2026-08-30T12:00:00Z',
    });
    expect(result).toEqual({ kind: 'unknown', reason: UNMARKED_RECORD_REASON });
  });

  it('fails closed on an unmarked record read back from the state file', () => {
    const dir = stateDir();
    writeTestArtifactRecordFile(dir, passingRecord());
    const result = resolveTestArtifactVerification({
      record: readTestArtifactRecordFile(dir),
      expectedScope: SCOPE,
      observedCommit: OBSERVED_COMMIT,
      commitAuthoredAt: '2026-08-30T07:00:00Z',
      evaluationAsOf: '2026-08-30T12:00:00Z',
    });
    expect(result).toEqual({ kind: 'unknown', reason: UNMARKED_RECORD_REASON });
  });

  it('renders Unknown when no artifact has been ingested (AC4)', () => {
    const result = resolveTestArtifactVerification({
      record: null,
      expectedScope: SCOPE,
      observedCommit: OBSERVED_COMMIT,
      commitAuthoredAt: null,
      evaluationAsOf: '2026-08-30T12:00:00Z',
    });
    expect(result.kind).toBe('unknown');
  });

  it('renders Unknown when there is no observed commit to bind against', () => {
    const result = resolveTestArtifactVerification({
      record: reportedRecord(),
      expectedScope: SCOPE,
      observedCommit: null,
      commitAuthoredAt: null,
      evaluationAsOf: '2026-08-30T12:00:00Z',
    });
    expect(result.kind).toBe('unknown');
  });

  it('renders Unknown on a commit mismatch — a stale or wrong-change artifact (AC4)', () => {
    const result = resolveTestArtifactVerification({
      record: passingRecord({ repositoryCommit: 'deadbeef' }),
      expectedScope: SCOPE,
      observedCommit: OBSERVED_COMMIT,
      commitAuthoredAt: null,
      evaluationAsOf: '2026-08-30T12:00:00Z',
    });
    expect(result.kind).toBe('unknown');
    if (result.kind !== 'unknown') throw new Error('unreachable');
    expect(result.reason).toContain('does not match the observed change commit');
  });

  it('renders Unknown on a scope mismatch', () => {
    const result = resolveTestArtifactVerification({
      record: reportedRecord({ scope: 'tests/unrelated/test_x.py' }),
      expectedScope: SCOPE,
      observedCommit: OBSERVED_COMMIT,
      commitAuthoredAt: null,
      evaluationAsOf: '2026-08-30T12:00:00Z',
    });
    expect(result.kind).toBe('unknown');
  });

  it('renders Unknown on a failing artifact — a fix must never be shown verified by a failing run (AC4)', () => {
    const failing = buildOperatorReportedTestArtifactRecord({
      rawJUnit: Buffer.from(FAILING_JUNIT, 'utf8'),
      command: ['python3', '-m', 'pytest', SCOPE, '-q'],
      reportedExitCode: 1,
      ingestedAt: '2026-08-30T08:00:00Z',
      repositoryCommit: OBSERVED_COMMIT,
      scope: SCOPE,
    });
    if (failing.kind !== 'built') throw new Error('unreachable');
    const result = resolveTestArtifactVerification({
      record: failing.record,
      expectedScope: SCOPE,
      observedCommit: OBSERVED_COMMIT,
      commitAuthoredAt: null,
      evaluationAsOf: '2026-08-30T12:00:00Z',
    });
    expect(result.kind).toBe('unknown');
  });

  it('renders Unknown on a future-dated capture (fail-closed staleness)', () => {
    const result = resolveTestArtifactVerification({
      record: passingRecord({ capturedAt: '2026-09-01T00:00:00Z' }),
      expectedScope: SCOPE,
      observedCommit: OBSERVED_COMMIT,
      commitAuthoredAt: null,
      evaluationAsOf: '2026-08-30T12:00:00Z',
    });
    expect(result.kind).toBe('unknown');
    if (result.kind !== 'unknown') throw new Error('unreachable');
    expect(result.reason).toContain('future-dated');
  });

  it('renders Unknown when capture predates the commit it claims to verify', () => {
    const result = resolveTestArtifactVerification({
      record: passingRecord({ capturedAt: '2026-08-30T06:00:00Z' }),
      expectedScope: SCOPE,
      observedCommit: OBSERVED_COMMIT,
      commitAuthoredAt: '2026-08-30T07:00:00Z',
      evaluationAsOf: '2026-08-30T12:00:00Z',
    });
    expect(result.kind).toBe('unknown');
    if (result.kind !== 'unknown') throw new Error('unreachable');
    expect(result.reason).toContain('before the commit');
  });

  it('never renders an operator-reported run as Verified: it caps at report-fact with its disclosure (RFC5-19)', () => {
    const result = resolveTestArtifactVerification({
      record: reportedRecord(),
      expectedScope: SCOPE,
      observedCommit: OBSERVED_COMMIT,
      commitAuthoredAt: '2026-08-30T07:00:00Z',
      evaluationAsOf: '2026-08-30T12:00:00Z',
    });
    expect(result.kind).toBe('reported');
    if (result.kind !== 'reported') throw new Error('unreachable');
    expect(result.tier).toBe('report-fact');
    expect(result.disclosure).toContain('Reported by the operator, not verified by Syzygy.');
    expect(result.disclosure).toContain('the working tree\'s state is not checked');
    expect(result.disclosure).toContain('RFC5-19: "an artifact of unverifiable origin caps at report-fact however retained, well-formed, and revision-bound it is."');
  });

  it('checks an operator-reported record against its ingest time, and says so', () => {
    const before = resolveTestArtifactVerification({
      record: reportedRecord({ ingestedAt: '2026-08-30T06:00:00Z' }),
      expectedScope: SCOPE,
      observedCommit: OBSERVED_COMMIT,
      commitAuthoredAt: '2026-08-30T07:00:00Z',
      evaluationAsOf: '2026-08-30T12:00:00Z',
    });
    expect(before).toEqual({ kind: 'unknown', reason: 'test artifact was ingested before the commit it claims to verify existed' });
    const future = resolveTestArtifactVerification({
      record: reportedRecord({ ingestedAt: '2026-09-01T00:00:00Z' }),
      expectedScope: SCOPE,
      observedCommit: OBSERVED_COMMIT,
      commitAuthoredAt: null,
      evaluationAsOf: '2026-08-30T12:00:00Z',
    });
    expect(future).toEqual({ kind: 'unknown', reason: 'test artifact ingest time is after this evaluation (future-dated evidence is treated as stale)' });
  });

  it('keeps an operator-reported non-zero exit status Unknown', () => {
    const result = resolveTestArtifactVerification({
      record: reportedRecord({ exitCode: 1 }),
      expectedScope: SCOPE,
      observedCommit: OBSERVED_COMMIT,
      commitAuthoredAt: null,
      evaluationAsOf: '2026-08-30T12:00:00Z',
    });
    expect(result.kind).toBe('unknown');
  });

  it('names the commit mismatch, not the missing provenance, when an unmarked record also mismatches', () => {
    const result = resolveTestArtifactVerification({
      record: passingRecord({ repositoryCommit: OBSERVED_COMMIT }),
      expectedScope: SCOPE,
      observedCommit: 'a-different-commit',
      commitAuthoredAt: null,
      evaluationAsOf: '2026-08-30T12:00:00Z',
    });
    expect(result.kind).toBe('unknown');
    if (result.kind !== 'unknown') throw new Error('unreachable');
    expect(result.reason).toContain('does not match the observed change commit');
  });
});

describe('test-artifact record file state', () => {
  it('round-trips a written record and treats absence as null, never as a false negative', () => {
    const dir = stateDir();
    expect(readTestArtifactRecordFile(dir)).toBeNull();
    const record = passingRecord();
    writeTestArtifactRecordFile(dir, record);
    expect(readTestArtifactRecordFile(dir)).toEqual(record);
    clearTestArtifactRecordFile(dir);
    expect(readTestArtifactRecordFile(dir)).toBeNull();
  });

  it('throws on a malformed record rather than silently treating it as uningested', () => {
    const dir = stateDir();
    writeTestArtifactRecordFile(dir, passingRecord());
    const path = join(dir, 'test-artifact-record.json');
    writeFileSync(path, '{"not":"a record"}', 'utf8');
    expect(() => readTestArtifactRecordFile(dir)).toThrow();
  });

  it('round-trips an operator-reported record and refuses one that mixes the two timings', () => {
    const dir = stateDir();
    writeTestArtifactRecordFile(dir, reportedRecord());
    expect(readTestArtifactRecordFile(dir)).toEqual(reportedRecord());
    const path = join(dir, 'test-artifact-record.json');
    // An operator-reported record carrying a capture time would let the
    // ingest instant pass for the run's; one without provenance but with an
    // ingest time would shed the mark.
    writeFileSync(path, JSON.stringify({ ...reportedRecord(), capturedAt: '2026-08-30T08:00:00Z' }), 'utf8');
    expect(() => readTestArtifactRecordFile(dir)).toThrow('malformed');
    const { provenance: _dropped, ...unmarked } = reportedRecord();
    writeFileSync(path, JSON.stringify(unmarked), 'utf8');
    expect(() => readTestArtifactRecordFile(dir)).toThrow('malformed');
  });
});

// #386 round 1, note 5: the printed command interpolated the checkout and the
// interpreter bare, so a path with a space or a quote pasted as another command.
describe('the live test\'s printed command', () => {
  it('quotes a word as one POSIX shell word, a quote inside it included', () => {
    expect(posixShellWord('plain')).toBe("'plain'");
    expect(posixShellWord("it's here")).toBe("'it'\\''s here'");
    expect(posixShellWord('$(touch x); `y`')).toBe("'$(touch x); `y`'");
  });

  it('quotes the checkout, the interpreter and the test path, with a space and a quote in each path', () => {
    const text = liveTestOperatorInstructions("/tmp/my repo/it's", "/opt/py 3/bin/python'", 'tests/a b.py');
    expect(text).toContain("\n  git -C '/tmp/my repo/it'\\''s' rev-parse HEAD\n");
    expect(text).toContain("\n  cd -- '/tmp/my repo/it'\\''s' && '/opt/py 3/bin/python'\\''' -m pytest 'tests/a b.py' -q --junitxml=<file>; echo \"exit $?\"\n");
    expect(text).toContain('Syzygy does not run the Butlers test suite.');
  });

  // #386 round 2, note 4: a checkout path that begins with `-` is not read as an option of cd.
  it('ends cd\'s options before a checkout path that begins with a dash', () => {
    expect(liveTestOperatorInstructions('-repo', 'python', 'tests')).toContain("\n  cd -- '-repo' && 'python' -m pytest");
  });
});
