import { unconsentedClass } from './class-gate.js';
import { CENSUS_LISTED_LIMIT, shownPath } from './census.js';
import { secretOrUnder, vendoredOrGeneratedPath } from './derive.js';
import { GO_TEST_FUNCTION, JS_TEST_CALL, JUNIT_TEST_METHOD, PYTEST_TEST_NAME, TOP_LEVEL_UNIT, type DeriveRuleId } from './derive-rules.js';
import { BLOB_MODES, GitObjectReadRefusal, type TreeEntry, type VerifiedBlob } from './git-object-reader.js';
import { MANIFEST_BLOB_LIMIT, MANIFEST_PATH_LIMIT, MANIFEST_VALUE_LIMIT, type ManifestInputs } from './manifest-facts.js';
import {
  isGoTestPath, isJsTestPath, isJunitPath, isPytestPath, recognizeGoTests, recognizeJsTests, recognizeJunit, recognizePytest,
  type RecognizedNames, type TestNameKind,
} from './test-names-recognize.js';
import { secretPathOf } from './screen.js';

/** Declared test names (REQ-polaris-generation-034 version 2.38, syzygy-5dhm.45): what four versioned lexical recognizers read in the
 * test files of the pinned tree that the bound screening policy admits, one per framework (pytest, JavaScript and TypeScript test calls,
 * Go testing functions, JUnit methods), each name mapped to its unit by rule `top-level-unit`: the top-level directory its path begins
 * with, or the repository root. A name states only what one file declares, never that the test runs or passes, and is Inferred at this
 * version whatever evidence exists: the label is a constant here. Names only: no assertion, argument or statement of a test is taken.
 *
 * Each candidate takes the manifest recognizers' disposition, in the same order: a path a secret detector matches, or any of whose
 * directory prefixes it matches, is counted in `secretPathsLeftOut` and named nowhere; a vendored or generated path is counted in
 * `setApart` and named nowhere (every candidate is a test path, so the tests rule sets none apart); every other candidate is a named file,
 * Unknown and never read where its path is not citable, it is a symbolic link, the screen's path outcome excludes it, the class gate
 * withholds its class, or it is past `TEST_NAMES_READ_LIMIT`. Each remaining file is read alone, through the reader bound at 1 MiB, then
 * screened whole (`screenTargetBody`); only a body the screen admits whole is read for names, and each name passes the manifest value
 * checks or is left out and counted. Every input is the tree listing, the blobs read, the screen and the run's content classes. */

export const TEST_NAMES_FORMAT = 'polaris-dossier-test-names/1';
/** How many files a recognizer reads, and how many file entries it lists. */
export const TEST_NAMES_READ_LIMIT = 250;
/** How many names the member lists, over all recognizers. */
export const TEST_NAMES_LISTED = 2_000;

export type TestNamesUnknownReason =
  | 'path-not-citable' | 'symbolic-link' | 'denied-path' | 'unknown-extraction-class' | 'class-not-consented' | 'over-read-limit'
  | 'object-read-refused' | 'not-utf8-text' | 'too-large' | 'secret-detector-match' | 'active-content' | 'redacted-body' | 'unparsed';

export interface TestNamesFileEntry {
  readonly path: string;
  readonly epistemic: 'inferred' | 'unknown';
  readonly unknownReason: TestNamesUnknownReason | null;
  readonly parseFault: 'unterminated' | null;
  readonly names: number | null;
  readonly valuesLeftOut: number | null;
}
export interface TestNamesRecognizerEntry {
  readonly rule: string;
  readonly ruleVersion: number;
  readonly label: 'inferred';
  readonly candidates: number;
  readonly secretPathsLeftOut: number;
  readonly setApart: number;
  readonly inferred: number;
  readonly unknown: number;
  readonly valuesLeftOut: number;
  readonly names: number;
  readonly files: readonly TestNamesFileEntry[];
  readonly filesNotListed: number;
}
export interface TestName {
  readonly id: string;
  readonly name: string;
  readonly kind: TestNameKind;
  readonly rule: string;
  readonly ruleVersion: number;
  readonly path: string;
  readonly line: number;
  /** The top-level directory the path begins with, or null for the repository root. */
  readonly unit: string | null;
  readonly epistemic: 'inferred';
}
/** One unit's row: the files read for names under it and the names each rule took there. */
export interface TestNamesUnit { readonly unit: string | null; readonly files: number; readonly names: number; readonly byRule: Readonly<Record<string, number>> }
export type TestNames =
  | {
      readonly format: typeof TEST_NAMES_FORMAT;
      readonly state: 'derived';
      readonly screeningPolicy: { readonly policyId: string; readonly policyVersion: string; readonly sha256: string };
      readonly unitRule: { readonly rule: string; readonly ruleVersion: number };
      readonly recognizers: readonly TestNamesRecognizerEntry[];
      readonly units: readonly TestNamesUnit[];
      readonly unitsNotListed: number;
      readonly names: readonly TestName[];
      readonly namesNotListed: number;
    }
  | { readonly format: typeof TEST_NAMES_FORMAT; readonly state: 'unknown'; readonly why: string };

interface Recognizer { readonly rule: DeriveRuleId; readonly matches: (path: string) => boolean; readonly recognize: (text: string) => RecognizedNames }

/** The four recognizers, in the order the requirement names them and the member lists them. No path is a candidate of two. */
export const TEST_NAME_RECOGNIZERS: readonly Recognizer[] = [
  { rule: PYTEST_TEST_NAME, matches: isPytestPath, recognize: recognizePytest },
  { rule: JS_TEST_CALL, matches: isJsTestPath, recognize: recognizeJsTests },
  { rule: GO_TEST_FUNCTION, matches: isGoTestPath, recognize: recognizeGoTests },
  { rule: JUNIT_TEST_METHOD, matches: isJunitPath, recognize: recognizeJunit },
];

const byCodeUnit = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
const CONTROL = /[\u0000-\u001f\u007f]/u;
const STRICT_UTF8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

interface Pending { readonly path: string; readonly rule: DeriveRuleId; readonly name: string; readonly kind: TestNameKind; readonly line: number }
interface Outcome { readonly entry: TestNamesFileEntry; readonly read: boolean; readonly names: readonly Pending[] }

const unknownFile = (path: string, reason: TestNamesUnknownReason, read: boolean, parseFault: 'unterminated' | null = null): Outcome => ({
  entry: { path: reason === 'path-not-citable' ? shownPath(path) : path, epistemic: 'unknown', unknownReason: reason, parseFault, names: null, valuesLeftOut: null },
  read, names: [],
});

/** Rule `top-level-unit`'s unit for a path: its first segment, or null at the root. */
const unitOf = (path: string): string | null => { const slash = path.indexOf('/'); return slash < 0 ? null : path.slice(0, slash); };

export async function deriveTestNames(inputs: ManifestInputs): Promise<TestNames> {
  const { screen } = inputs;
  const isSecretPath = secretPathOf(screen);
  const refusedValue = (value: string): boolean => value.length === 0 || value.length > MANIFEST_VALUE_LIMIT || CONTROL.test(value) || screen.screenBody(value) === 'secret-detector-match';
  const recognizers: TestNamesRecognizerEntry[] = [];
  const pending: Pending[] = [];
  const unitFiles = new Map<string | null, number>();
  const blobs = [...inputs.entries].filter((entry) => BLOB_MODES.has(entry.mode)).sort((a, b) => byCodeUnit(a.path, b.path));

  for (const recognizer of TEST_NAME_RECOGNIZERS) {
    let secretPathsLeftOut = 0, setApart = 0, readable = 0;
    const outcomes: Outcome[] = [];
    const candidates = blobs.filter((entry) => recognizer.matches(entry.path));
    const toRead: (typeof candidates)[number][] = [];
    for (const candidate of candidates) {
      const { path } = candidate;
      if (secretOrUnder(path.split('/'), isSecretPath)) { secretPathsLeftOut++; continue; }
      if (vendoredOrGeneratedPath(path)) { setApart++; continue; }
      if (path.length > MANIFEST_PATH_LIMIT || CONTROL.test(path)) { outcomes.push(unknownFile(path, 'path-not-citable', false)); continue; }
      if (candidate.mode === '120000') { outcomes.push(unknownFile(path, 'symbolic-link', false)); continue; }
      const excluded = screen.screenPath(path);
      if (excluded === 'denied-path' || excluded === 'unknown-extraction-class') { outcomes.push(unknownFile(path, excluded, false)); continue; }
      if (excluded !== undefined) throw new Error(`test names: the path screen gave ${excluded} for a path the secret test passed`);
      if (unconsentedClass(screen.contentClass(path), inputs.consented) !== undefined) { outcomes.push(unknownFile(path, 'class-not-consented', false)); continue; }
      if (readable >= TEST_NAMES_READ_LIMIT) { outcomes.push(unknownFile(path, 'over-read-limit', false)); continue; }
      readable++;
      toRead.push(candidate);
    }
    for (const entry of toRead) outcomes.push(await readOne(entry, recognizer, inputs, refusedValue));

    const files = [...outcomes.filter((o) => o.read), ...outcomes.filter((o) => !o.read)].map((o) => o.entry);
    let inferred = 0, unknown = 0, valuesLeftOut = 0, names = 0;
    for (const outcome of outcomes) {
      if (outcome.entry.epistemic === 'inferred') {
        inferred++;
        const unit = unitOf(outcome.entry.path);
        unitFiles.set(unit, (unitFiles.get(unit) ?? 0) + 1);
      } else unknown++;
      valuesLeftOut += outcome.entry.valuesLeftOut ?? 0;
      names += outcome.names.length;
      for (const name of outcome.names) pending.push(name);
    }
    recognizers.push({
      rule: recognizer.rule.id, ruleVersion: recognizer.rule.version, label: 'inferred',
      candidates: candidates.length, secretPathsLeftOut, setApart, inferred, unknown, valuesLeftOut, names,
      files: files.slice(0, TEST_NAMES_READ_LIMIT), filesNotListed: Math.max(0, files.length - TEST_NAMES_READ_LIMIT),
    });
  }

  pending.sort((a, b) => byCodeUnit(a.path, b.path) || a.line - b.line || byCodeUnit(a.name, b.name));
  const listed: TestName[] = pending.slice(0, TEST_NAMES_LISTED).map((p, index) => ({
    id: `_test-name-${index + 1}`, name: p.name, kind: p.kind, rule: p.rule.id, ruleVersion: p.rule.version, path: p.path, line: p.line, unit: unitOf(p.path), epistemic: 'inferred',
  }));
  const units = unitsOf(pending, unitFiles);
  return {
    format: TEST_NAMES_FORMAT, state: 'derived',
    screeningPolicy: { policyId: screen.policyId, policyVersion: screen.policyVersion, sha256: screen.policySha256 },
    unitRule: { rule: TOP_LEVEL_UNIT.id, ruleVersion: TOP_LEVEL_UNIT.version },
    recognizers, units: units.slice(0, CENSUS_LISTED_LIMIT), unitsNotListed: Math.max(0, units.length - CENSUS_LISTED_LIMIT),
    names: listed, namesNotListed: pending.length - listed.length,
  };
}

/** One row per unit with a file read for names: the root first, then each top-level directory in code-unit order; every name is counted,
 * listed or not. */
function unitsOf(pending: readonly Pending[], unitFiles: ReadonlyMap<string | null, number>): TestNamesUnit[] {
  const rows = new Map<string | null, { names: number; byRule: Record<string, number> }>();
  for (const unit of unitFiles.keys()) rows.set(unit, { names: 0, byRule: Object.fromEntries(TEST_NAME_RECOGNIZERS.map((r) => [r.rule.id, 0])) });
  for (const p of pending) {
    const row = rows.get(unitOf(p.path))!;
    row.names++;
    row.byRule[p.rule.id]!++;
  }
  return [...rows].sort(([a], [b]) => (a === null ? -1 : b === null ? 1 : byCodeUnit(a, b)))
    .map(([unit, row]) => ({ unit, files: unitFiles.get(unit)!, names: row.names, byRule: row.byRule }));
}

async function readOne({ path, id }: Pick<TreeEntry, 'path' | 'id'>, recognizer: Recognizer, inputs: ManifestInputs, refusedValue: (value: string) => boolean): Promise<Outcome> {
  let blob: VerifiedBlob;
  try {
    blob = await inputs.read(path);
  } catch (cause) {
    if (!(cause instanceof GitObjectReadRefusal)) throw cause;
    return unknownFile(path, cause.overBound && cause.objectId === id ? 'too-large' : 'object-read-refused', true);
  }
  if (blob.bytes.byteLength > MANIFEST_BLOB_LIMIT) return unknownFile(path, 'too-large', true);
  let text: string;
  try { text = STRICT_UTF8.decode(blob.bytes); } catch { return unknownFile(path, 'not-utf8-text', true); }
  const screened = inputs.screen.screenTargetBody(text, path);
  if (screened.kind === 'excluded') {
    if (screened.outcome !== 'secret-detector-match' && screened.outcome !== 'active-content') throw new Error(`test names: the body screen gave ${screened.outcome}`);
    return unknownFile(path, screened.outcome, true);
  }
  if (screened.kind === 'redacted') return unknownFile(path, 'redacted-body', true);
  const recognized = recognizer.recognize(text);
  if (!recognized.ok) return unknownFile(path, 'unparsed', true, recognized.parseFault);
  const kept: Pending[] = [];
  let leftOut = 0;
  for (const found of recognized.names) {
    if (refusedValue(found.name)) leftOut++; else kept.push({ path, rule: recognizer.rule, ...found });
  }
  return { entry: { path, epistemic: 'inferred', unknownReason: null, parseFault: null, names: kept.length, valuesLeftOut: leftOut }, read: true, names: kept };
}

/** The member when the pinned tree cannot be listed: Unknown, with the reader's refusal reason, and no recognizer or name. */
export const testNamesUnknown = (reason: string): TestNames => ({
  format: TEST_NAMES_FORMAT, state: 'unknown', why: `the pinned tree could not be listed (${reason})`,
});
