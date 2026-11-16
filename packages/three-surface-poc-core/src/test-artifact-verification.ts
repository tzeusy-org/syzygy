import { createHash } from 'node:crypto';
import {
  closeSync,
  constants,
  existsSync,
  fstatSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

// A real, durable focused-pytest artifact, captured outside Syzygy by an
// external operator (POC-REQ / syzygy-0r9 AC1). Only safe, structured
// fields are ever ingested — never a test body, secret, or raw exception
// content (AC5). The raw JUnit artifact bytes are hashed for provenance;
// their content is never stored or re-derivable from this record.

interface TestArtifactRecordFields {
  readonly command: readonly string[];
  readonly exitCode: number;
  readonly repositoryCommit: string;
  readonly scope: string;
  readonly digest: string;
  readonly summary: string;
}

/**
 * The shape the retired spawning capture wrote: a capture instant and no
 * `provenance`. Nothing produces it any more, and Syzygy cannot tell such a
 * file from one written by hand, so it is read and never believed: it
 * resolves Unknown, never Verified.
 */
export interface UnmarkedTestArtifactRecord extends TestArtifactRecordFields {
  readonly capturedAt: string;
}

/**
 * A run the operator performed and reported (owner direction
 * REDIS-LOCAL-AGENT-SITTING-2026-10-07 item 4). Syzygy observed only the
 * result file's digest and root totals and that HEAD equalled
 * `repositoryCommit` at `ingestedAt`; that the run happened, at that commit,
 * on a clean tree, with `exitCode`, is the operator's report. There is no
 * capture instant: `ingestedAt` is when Syzygy read the file, not when the
 * tests ran.
 */
export interface OperatorReportedTestArtifactRecord extends TestArtifactRecordFields {
  readonly provenance: 'operator-reported';
  readonly ingestedAt: string;
}

export type TestArtifactRecord = UnmarkedTestArtifactRecord | OperatorReportedTestArtifactRecord;

function isOperatorReported(record: TestArtifactRecord): record is OperatorReportedTestArtifactRecord {
  return 'provenance' in record && record.provenance === 'operator-reported';
}

// --- File-backed record state --------------------------------------------
//
// Same posture as the materialization record: one JSON file under the
// daemon's own state directory (0700 dir, 0600 file). A corrupt or
// unreadable record is never treated as "no artifact ingested" — it
// throws, and callers must render that as a named Unknown rather than
// silently risking a false-negative that masks a tampered record.

const TEST_ARTIFACT_RECORD_FILE_NAME = 'test-artifact-record.json' as const;
const TEST_ARTIFACT_STATE_DIR_MODE = 0o700;
const TEST_ARTIFACT_RECORD_FILE_MODE = 0o600;

function testArtifactRecordPath(stateDir: string): string {
  return join(stateDir, TEST_ARTIFACT_RECORD_FILE_NAME);
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function isTestArtifactRecord(value: unknown): value is TestArtifactRecord {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  const timing =
    record.provenance === undefined
      ? typeof record.capturedAt === 'string' && record.ingestedAt === undefined
      : record.provenance === 'operator-reported' && typeof record.ingestedAt === 'string' && record.capturedAt === undefined;
  return (
    timing &&
    isStringArray(record.command) &&
    typeof record.exitCode === 'number' &&
    typeof record.repositoryCommit === 'string' &&
    typeof record.scope === 'string' &&
    typeof record.digest === 'string' &&
    typeof record.summary === 'string'
  );
}

/** Reads the record; returns `null` only when no file exists yet. Throws
 * on an unreadable or malformed file — never silently treats corruption
 * as "not yet ingested". */
export function readTestArtifactRecordFile(stateDir: string): TestArtifactRecord | null {
  const path = testArtifactRecordPath(stateDir);
  if (!existsSync(path)) {
    return null;
  }
  const raw = readFileSync(path, 'utf8');
  const parsed: unknown = JSON.parse(raw);
  if (!isTestArtifactRecord(parsed)) {
    throw new Error('test artifact record file is malformed');
  }
  return parsed;
}

export function writeTestArtifactRecordFile(stateDir: string, record: TestArtifactRecord): void {
  mkdirSync(stateDir, { recursive: true, mode: TEST_ARTIFACT_STATE_DIR_MODE });
  writeFileSync(testArtifactRecordPath(stateDir), JSON.stringify(record, null, 2), {
    encoding: 'utf8',
    mode: TEST_ARTIFACT_RECORD_FILE_MODE,
  });
}

// Test seam: the tests clear the record file through it; no production code does.
export function clearTestArtifactRecordFile(stateDir: string): void {
  const path = testArtifactRecordPath(stateDir);
  if (existsSync(path)) {
    rmSync(path);
  }
}

// --- Building a safe record from a raw JUnit artifact ---------------------

interface JUnitRootTotals {
  readonly tests: number;
  readonly failures: number;
  readonly errors: number;
  readonly skipped: number;
  readonly time: number | null;
}

/** The largest JUnit artifact any reader accepts. The bytes come from
 * running observed code, so they are untrusted; a focused pytest scope's
 * report is a few kilobytes. */
export const MAX_JUNIT_ARTIFACT_BYTES = 4 * 1024 * 1024;

/**
 * The attribute text of the first opening tag named exactly `name`
 * (whitespace required right after the name, so `testsuite` never matches
 * the plural `testsuites` wrapper, which pytest emits with no totals of its
 * own around the real `<testsuite ...>` elements). One forward pass: a
 * candidate followed by anything but whitespace is skipped without looking
 * further, and the first candidate with no closing `>` ends the scan, since
 * no later candidate can close either. Linear in the input on any bytes.
 */
function firstOpeningTagBody(rawXml: string, lowerXml: string, name: string): string | null {
  const opener = `<${name}`;
  let from = 0;
  for (;;) {
    const start = lowerXml.indexOf(opener, from);
    if (start === -1) return null;
    const after = start + opener.length;
    if (!/\s/.test(rawXml.charAt(after))) {
      from = after;
      continue;
    }
    const end = rawXml.indexOf('>', after);
    if (end === -1) return null;
    const body = rawXml.slice(after, end);
    return body.endsWith('/') ? body.slice(0, -1) : body;
  }
}

/**
 * Reads a handed-in JUnit file only when it is a regular file no larger than
 * `maxBytes`. The bytes come from running observed code, so they are
 * untrusted: a FIFO would block forever and a device or huge file would
 * read until memory fails. `lstat` refuses a symlink, FIFO or device before
 * anything is opened; the open never follows a link and never blocks; and
 * the opened file must be the one `lstat` saw. At most `maxBytes + 1`
 * bytes are ever read, so a file that grows after the check is refused too.
 * Returns the bytes undecoded, so the recorded digest is the file's own.
 */
export function readBoundedRegularFile(path: string, maxBytes: number = MAX_JUNIT_ARTIFACT_BYTES): Buffer {
  const seen = lstatSync(path);
  if (!seen.isFile()) {
    throw new Error('it is not a regular file (a symlink, FIFO, device or directory is refused)');
  }
  if (seen.size > maxBytes) {
    throw new Error(`it is ${seen.size} bytes, over the ${maxBytes}-byte ceiling`);
  }
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const opened = fstatSync(fd);
    if (!opened.isFile() || opened.dev !== seen.dev || opened.ino !== seen.ino) {
      throw new Error('it changed between the check and the read');
    }
    const buffer = Buffer.alloc(maxBytes + 1);
    let length = 0;
    for (;;) {
      const read = readSync(fd, buffer, length, buffer.length - length, null);
      if (read === 0) break;
      length += read;
      if (length > maxBytes) {
        throw new Error(`it grew past the ${maxBytes}-byte ceiling while being read`);
      }
    }
    return buffer.subarray(0, length);
  } finally {
    closeSync(fd);
  }
}

const NAME_CHAR = /[A-Za-z0-9_:.-]/;

/** `name="value"` pairs in one tag body, by a single forward pass. A
 * repeated attribute makes the whole tag unreadable (null): last-wins would
 * let `failures="1" … failures="0"` read as zero. */
function parseTagAttrs(tagBody: string): Map<string, string> | null {
  const attrs = new Map<string, string>();
  let i = 0;
  while (i < tagBody.length) {
    if (!NAME_CHAR.test(tagBody.charAt(i))) {
      i += 1;
      continue;
    }
    const nameStart = i;
    while (i < tagBody.length && NAME_CHAR.test(tagBody.charAt(i))) i += 1;
    const name = tagBody.slice(nameStart, i);
    if (tagBody.charAt(i) !== '=' || tagBody.charAt(i + 1) !== '"') continue;
    const valueEnd = tagBody.indexOf('"', i + 2);
    if (valueEnd === -1) break;
    if (attrs.has(name)) return null;
    attrs.set(name, tagBody.slice(i + 2, valueEnd));
    i = valueEnd + 1;
  }
  return attrs;
}

const COUNT = /^(?:0|[1-9][0-9]{0,8})$/;

/** Every count present must be a non-negative integer, or the totals are
 * unreadable: a non-numeric or negative count never reads as zero. */
function totalsFromAttrs(attrs: Map<string, string>): JUnitRootTotals | null {
  const tests = attrs.get('tests');
  if (tests === undefined) {
    return null;
  }
  const counts = [tests, attrs.get('failures') ?? '0', attrs.get('errors') ?? '0', attrs.get('skipped') ?? '0'];
  if (!counts.every((count) => COUNT.test(count))) {
    return null;
  }
  const [total, failures, errors, skipped] = counts.map(Number) as [number, number, number, number];
  if (failures + errors + skipped > total) {
    return null;
  }
  const timeRaw = attrs.get('time');
  const time = timeRaw === undefined ? null : Number(timeRaw);
  return {
    tests: total,
    failures,
    errors,
    skipped,
    time: time !== null && Number.isFinite(time) ? time : null,
  };
}

/**
 * Reads only the attributes on one opening tag of a raw JUnit artifact
 * (the first `<testsuite>`, falling back to `<testsuites>` when only the
 * wrapper carries totals) — it never scans past that one tag, so a
 * `<testcase>` name, a `<failure>`/`<error>` message, or any other
 * test-body content is never parsed out of the raw artifact (AC5).
 */
export function parseJUnitRootTotals(rawXml: string): JUnitRootTotals | null {
  if (rawXml.length > MAX_JUNIT_ARTIFACT_BYTES) {
    return null;
  }
  // ASCII-only folding keeps every index equal between the two strings;
  // String#toLowerCase can change the length (U+0130 becomes two units).
  const lowerXml = rawXml.replace(/[A-Z]+/g, (run) => run.toLowerCase());
  for (const name of ['testsuite', 'testsuites']) {
    const body = firstOpeningTagBody(rawXml, lowerXml, name);
    if (body === null) continue;
    const attrs = parseTagAttrs(body);
    if (attrs === null) return null;
    const totals = totalsFromAttrs(attrs);
    if (totals !== null) {
      return totals;
    }
  }
  return null;
}

function summarizeJUnitTotals(totals: JUnitRootTotals): string {
  const passed = totals.tests - totals.failures - totals.errors - totals.skipped;
  const timeText = totals.time === null ? '' : ` in ${totals.time}s`;
  return `${passed} passed, ${totals.failures} failed, ${totals.errors} errored, ${totals.skipped} skipped${timeText}`;
}

const UNPARSEABLE_REASON =
  'the artifact does not contain a recognizable JUnit <testsuite> root element with non-negative integer counts';

/** The digest of the file's own bytes, so it equals `sha256sum` of the
 * handed-in file even when those bytes are not valid UTF-8. */
function junitDigest(rawJUnit: Uint8Array): string {
  return `sha256:${createHash('sha256').update(rawJUnit).digest('hex')}`;
}

interface BuildOperatorReportedRecordInput {
  /** The result file's bytes, undecoded. */
  readonly rawJUnit: Uint8Array;
  readonly command: readonly string[];
  readonly reportedExitCode: number;
  readonly ingestedAt: string;
  readonly repositoryCommit: string;
  readonly scope: string;
}

type BuildOperatorReportedRecordResult =
  | { readonly kind: 'built'; readonly record: OperatorReportedTestArtifactRecord }
  | { readonly kind: 'unparseable'; readonly reason: string }
  | { readonly kind: 'inconsistent'; readonly reason: string };

/**
 * The one seam that ever reads raw JUnit artifact bytes; everything past it
 * operates only on the resulting safe record. Builds an operator-reported
 * record, parsing the root totals once. The
 * reported exit status must agree with the file: status 0 beside a failure
 * or error, or beside zero tests (pytest exits 5 when it collects nothing),
 * is refused rather than recorded. The operator can edit the bytes, so this
 * is a consistency check, never a proof the run happened.
 */
export function buildOperatorReportedTestArtifactRecord(
  input: BuildOperatorReportedRecordInput,
): BuildOperatorReportedRecordResult {
  const totals =
    input.rawJUnit.byteLength > MAX_JUNIT_ARTIFACT_BYTES
      ? null
      : parseJUnitRootTotals(Buffer.from(input.rawJUnit).toString('utf8'));
  if (totals === null) {
    return { kind: 'unparseable', reason: UNPARSEABLE_REASON };
  }
  if (input.reportedExitCode === 0 && totals.failures + totals.errors > 0) {
    return {
      kind: 'inconsistent',
      reason: `exit status 0 was reported, but the result file records ${totals.failures} failed and ${totals.errors} errored`,
    };
  }
  if (input.reportedExitCode === 0 && totals.tests === 0) {
    return {
      kind: 'inconsistent',
      reason: 'exit status 0 was reported, but the result file records zero tests; a run that collected nothing verifies nothing',
    };
  }
  return {
    kind: 'built',
    record: {
      provenance: 'operator-reported',
      command: input.command,
      exitCode: input.reportedExitCode,
      ingestedAt: input.ingestedAt,
      repositoryCommit: input.repositoryCommit,
      scope: input.scope,
      digest: junitDigest(input.rawJUnit),
      summary: summarizeJUnitTotals(totals),
    },
  };
}

// --- Verification -----------------------------------------------------

/**
 * RFC5-19 (`.syzygy/governance/contracts/rfcs/RFC-0005/execution-profiles.md`
 * lines 140-150): "Consuming evidence produced outside Syzygy … is
 * observation, not execution — no profile is required to read a report" and
 * "This boundary governs whether a profile is required; it confers no tier.
 * … an artifact of unverifiable origin caps at `report-fact` however
 * retained, well-formed, and revision-bound it is. Reading is free; being
 * believed is not."
 */
export const OPERATOR_REPORTED_DISCLOSURE =
  'Reported by the operator, not verified by Syzygy. Syzygy observed the result file\'s digest and totals, and that HEAD was this commit when the file was ingested. That the tests ran, at this commit, on a clean working tree, with exit status 0, is the operator\'s report, and the working tree\'s state is not checked. RFC5-19: "an artifact of unverifiable origin caps at report-fact however retained, well-formed, and revision-bound it is."';

/**
 * One word for a POSIX shell: single-quoted, each `'` written `'\''`
 * (#386 round 1, note 5). For display only: Syzygy hands it to no shell.
 */
export function posixShellWord(word: string): string {
  return `'${word.replaceAll("'", `'\\''`)}'`;
}

/**
 * What the live verification test says when the operator's result is
 * missing: the commands to run in their own shell, with the checkout, the
 * interpreter and the test path each quoted as one shell word, so a path
 * with a space or a quote pastes as the command it names.
 *
 * Test seam: only the live verification test (and its tests) call it.
 */
export function liveTestOperatorInstructions(repoRoot: string, python: string, scope: string): string {
  const repo = posixShellWord(repoRoot);
  return (
    'Syzygy does not run the Butlers test suite. For the owner or a human operator: an agent session must not run ' +
    'the pytest command below unless the owner has recorded a SEC-3 choice for that run. In your own shell, run\n' +
    `  git -C ${repo} rev-parse HEAD\n` +
    `  cd -- ${repo} && ${posixShellWord(python)} -m pytest ${posixShellWord(scope)} -q --junitxml=<file>; echo "exit $?"\n` +
    'then set SYZYGY_POC_BUTLERS_JUNIT=<file>, SYZYGY_POC_BUTLERS_JUNIT_COMMIT=<commit> and ' +
    'SYZYGY_POC_BUTLERS_JUNIT_EXIT=<status>, and run this test again.'
  );
}

/**
 * There is no Verified result. Every record Syzygy can read was written
 * outside a run Syzygy launched or observed, so the best it supports is
 * `report-fact` (RFC5-19); a Verified result needs a producer whose
 * provenance Syzygy observes, and none exists.
 */
export type TestArtifactVerificationResult =
  | { readonly kind: 'unknown'; readonly reason: string }
  /** Never Verified: an operator-reported run caps at `report-fact` (RFC5-19). */
  | { readonly kind: 'reported'; readonly tier: 'report-fact'; readonly record: OperatorReportedTestArtifactRecord; readonly disclosure: string };

export const UNMARKED_RECORD_REASON =
  'test artifact record carries no provenance (written by the retired spawning capture, or by hand); Syzygy cannot tell who ran it, so it is not verified';

interface ResolveTestArtifactVerificationInput {
  readonly record: TestArtifactRecord | null;
  readonly expectedScope: string;
  readonly observedCommit: string | null;
  readonly commitAuthoredAt: string | null;
  readonly evaluationAsOf: string;
}

/**
 * An operator-reported artifact that passes and binds to the exact observed
 * changed-or-merged commit resolves `reported`, capped at `report-fact`.
 * Missing, mismatched, failed, future-dated, unmarked or unreadable evidence
 * renders Unknown; nothing upgrades a git-observed change into satisfaction
 * (AC4).
 */
export function resolveTestArtifactVerification(
  input: ResolveTestArtifactVerificationInput,
): TestArtifactVerificationResult {
  if (input.observedCommit === null) {
    return {
      kind: 'unknown',
      reason: 'no observed changed-or-merged commit exists to bind test evidence against',
    };
  }
  if (input.record === null) {
    return { kind: 'unknown', reason: 'no test artifact has been ingested for this evaluation' };
  }
  if (input.record.scope !== input.expectedScope) {
    return {
      kind: 'unknown',
      reason: `test artifact scope (${input.record.scope}) does not match the configured seam (${input.expectedScope})`,
    };
  }
  if (input.record.repositoryCommit !== input.observedCommit) {
    return {
      kind: 'unknown',
      reason: `test artifact commit (${input.record.repositoryCommit}) does not match the observed change commit (${input.observedCommit})`,
    };
  }
  if (input.record.exitCode !== 0) {
    return {
      kind: 'unknown',
      reason: `test artifact reports a non-zero exit status (${input.record.exitCode})`,
    };
  }
  // An operator-reported record has no capture instant, only the ingest
  // instant. The same two refusals apply to it (an ingest before the commit
  // existed, or after this evaluation, is impossible honest evidence), but
  // passing them says nothing about when the tests ran.
  const reported = isOperatorReported(input.record);
  const instantName = reported ? 'ingest time' : 'capture time';
  const instantMs = Date.parse(reported ? input.record.ingestedAt : input.record.capturedAt);
  if (Number.isNaN(instantMs)) {
    return { kind: 'unknown', reason: `test artifact ${instantName} is not a valid instant` };
  }
  const evaluationAsOfMs = Date.parse(input.evaluationAsOf);
  if (!Number.isNaN(evaluationAsOfMs) && instantMs > evaluationAsOfMs) {
    return {
      kind: 'unknown',
      reason: `test artifact ${instantName} is after this evaluation (future-dated evidence is treated as stale)`,
    };
  }
  if (input.commitAuthoredAt !== null) {
    const commitAuthoredAtMs = Date.parse(input.commitAuthoredAt);
    if (!Number.isNaN(commitAuthoredAtMs) && instantMs < commitAuthoredAtMs) {
      return {
        kind: 'unknown',
        reason: reported
          ? 'test artifact was ingested before the commit it claims to verify existed'
          : 'test artifact was captured before the commit it claims to verify existed',
      };
    }
  }
  if (isOperatorReported(input.record)) {
    return { kind: 'reported', tier: 'report-fact', record: input.record, disclosure: OPERATOR_REPORTED_DISCLOSURE };
  }
  // Round-2 note 2: an unmarked record fails closed, after the checks above
  // so a mismatched or failing one still names its own defect.
  return { kind: 'unknown', reason: UNMARKED_RECORD_REASON };
}
