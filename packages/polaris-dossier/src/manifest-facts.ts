import { unconsentedClass } from './class-gate.js';
import { shownPath } from './census.js';
import { secretOrUnder, setApartPath } from './derive.js';
import { CARGO_MANIFEST, GITHUB_ACTIONS_WORKFLOW, GO_MODULE_MANIFEST, NPM_PACKAGE_MANIFEST, PYTHON_PROJECT_MANIFEST, type DeriveRuleId } from './derive-rules.js';
import { BLOB_MODES, GitObjectReadRefusal, type TreeEntry, type VerifiedBlob } from './git-object-reader.js';
import { isCargoManifestPath, recognizeCargoManifest } from './manifest-cargo.js';
import { isGoModulePath, recognizeGoModule } from './manifest-go.js';
import { FACT_KIND_ORDER, FACT_MEMBERS, type FactKind, type ParseFault, type RawFact, type Recognized } from './manifest-model.js';
import { isNpmManifestPath, recognizeNpmManifest } from './manifest-npm.js';
import { isPythonProjectPath, recognizePythonProject } from './manifest-python.js';
import { isWorkflowPath, recognizeWorkflow } from './manifest-workflow.js';
import type { DossierScreen } from './screen.js';

/** Declared manifest facts (REQ-polaris-generation-034 version 2.7, syzygy-3efd.25): what five versioned recognizers read in the manifest
 * files of the pinned tree that the bound screening policy admits, stored as the draft check record's last member, `manifestFacts`. A fact
 * states only what one file declares, never what code does, and is Inferred at this version whatever evidence exists: the label is a
 * constant here. They are not derived structural facts: no page, `machine.json`, brief, packet or published file carries them, and no
 * trait or pack rule reads them.
 *
 * Each candidate (a blob entry whose path a recognizer's rule names) takes one disposition, in order: a path a secret detector matches, or
 * any of whose directory prefixes it matches, is counted in `secretPathsLeftOut` and named nowhere; for the four package recognizers, a
 * vendored, generated or test path is counted in `setApart` and named nowhere; every other candidate is a named file, Unknown and never read
 * where its path is not citable, it is a symbolic link, the screen's path outcome excludes it, the class gate withholds its class, or it is
 * past the 250th readable file. Each remaining file is read alone, through the reader `check` opens with its object bound at 1 MiB, then
 * screened whole (`screenTargetBody`); only a body the screen admits whole is parsed. Every input is the tree listing, the blobs read, the
 * screen and the run's content classes, so two checks in which no read is refused write the same bytes, whatever their drafts. */

export const MANIFEST_FACTS_FORMAT = 'polaris-dossier-manifest-facts/1';
/** The reader's object bound for a manifest blob: one byte more is refused before it is inflated whole (`too-large`). */
export const MANIFEST_BLOB_LIMIT = 1_048_576;
export const MANIFEST_READ_LIMIT = 250;
export const MANIFEST_FILES_LISTED = 250;
export const MANIFEST_FACTS_LISTED = 1_000;
export const MANIFEST_PATH_LIMIT = 512;
export const MANIFEST_VALUE_LIMIT = 256;

export type ManifestUnknownReason =
  | 'path-not-citable' | 'symbolic-link' | 'denied-path' | 'unknown-extraction-class' | 'class-not-consented' | 'over-read-limit'
  | 'object-read-refused' | 'not-utf8-text' | 'too-large' | 'secret-detector-match' | 'active-content' | 'redacted-body' | 'unparsed';

export interface ManifestFileEntry {
  readonly path: string;
  readonly epistemic: 'inferred' | 'unknown';
  readonly unknownReason: ManifestUnknownReason | null;
  readonly parseFault: ParseFault | null;
  readonly facts: number | null;
  readonly valuesLeftOut: number | null;
}
export interface ManifestRecognizerEntry {
  readonly rule: string;
  readonly ruleVersion: number;
  readonly label: 'inferred';
  readonly candidates: number;
  readonly secretPathsLeftOut: number;
  readonly setApart: number;
  readonly inferred: number;
  readonly unknown: number;
  readonly valuesLeftOut: number;
  readonly facts: number;
  readonly files: readonly ManifestFileEntry[];
  readonly filesNotListed: number;
}
export type ManifestFact = { readonly id: string; readonly fact: FactKind; readonly rule: string; readonly ruleVersion: number; readonly path: string; readonly lines: readonly [number, number] }
  & Readonly<Record<string, string | number | null | readonly [number, number]>> & { readonly epistemic: 'inferred' };
export type ManifestFacts =
  | {
      readonly format: typeof MANIFEST_FACTS_FORMAT;
      readonly state: 'derived';
      readonly screeningPolicy: { readonly policyId: string; readonly policyVersion: string; readonly sha256: string };
      readonly recognizers: readonly ManifestRecognizerEntry[];
      readonly facts: readonly ManifestFact[];
      readonly factsNotListed: number;
    }
  | { readonly format: typeof MANIFEST_FACTS_FORMAT; readonly state: 'unknown'; readonly why: string };

interface Recognizer {
  readonly rule: DeriveRuleId;
  readonly matches: (path: string) => boolean;
  /** Whether vendored, generated and test paths are set apart (the four package recognizers; never a workflow path). */
  readonly setsApart: boolean;
  readonly recognize: (text: string) => Recognized;
}

/** The five recognizers, in the order the requirement names them and the member lists them. */
export const MANIFEST_RECOGNIZERS: readonly Recognizer[] = [
  { rule: NPM_PACKAGE_MANIFEST, matches: isNpmManifestPath, setsApart: true, recognize: recognizeNpmManifest },
  { rule: CARGO_MANIFEST, matches: isCargoManifestPath, setsApart: true, recognize: recognizeCargoManifest },
  { rule: PYTHON_PROJECT_MANIFEST, matches: isPythonProjectPath, setsApart: true, recognize: recognizePythonProject },
  { rule: GO_MODULE_MANIFEST, matches: isGoModulePath, setsApart: true, recognize: recognizeGoModule },
  { rule: GITHUB_ACTIONS_WORKFLOW, matches: isWorkflowPath, setsApart: false, recognize: recognizeWorkflow },
];

export interface ManifestInputs {
  readonly entries: readonly Pick<TreeEntry, 'path' | 'mode'>[];
  readonly screen: Pick<DossierScreen, 'policyId' | 'policyVersion' | 'policySha256' | 'screenPath' | 'contentClass' | 'screenBody' | 'screenTargetBody'>;
  /** The classes the per-project statement the run relies on lists, or null when it relies on none (`class-gate.ts`). */
  readonly consented: readonly string[] | null;
  /** Read one blob at the pinned revision, in its own call of the pinned reader whose object bound is `MANIFEST_BLOB_LIMIT`. */
  readonly read: (path: string) => Promise<VerifiedBlob>;
}

const byCodeUnit = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
const CONTROL = /[\u0000-\u001f\u007f]/u;
const STRICT_UTF8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

interface Pending { readonly path: string; readonly rule: DeriveRuleId; readonly fact: RawFact }

/** A file's disposition and, for one that parsed, its facts that passed the value checks. */
interface Outcome { readonly entry: ManifestFileEntry; readonly read: boolean; readonly facts: readonly Pending[] }

const unknownFile = (path: string, reason: ManifestUnknownReason, read: boolean, parseFault: ParseFault | null = null): Outcome => ({
  entry: { path: reason === 'path-not-citable' ? shownPath(path) : path, epistemic: 'unknown', unknownReason: reason, parseFault, facts: null, valuesLeftOut: null },
  read, facts: [],
});

export async function deriveManifestFacts(inputs: ManifestInputs): Promise<ManifestFacts> {
  const { screen } = inputs;
  const isSecretPath = (path: string): boolean => screen.screenPath(path) === 'secret-detector-match' || screen.screenBody(path, path) === 'secret-detector-match';
  /** A body-taken value the value checks refuse: too long, a control character, or a detector match over text given with no path. */
  const refusedValue = (value: string): boolean => value.length > MANIFEST_VALUE_LIMIT || CONTROL.test(value) || screen.screenBody(value) === 'secret-detector-match';
  const recognizers: ManifestRecognizerEntry[] = [];
  const pending: Pending[] = [];
  const blobs = [...inputs.entries].filter((entry) => BLOB_MODES.has(entry.mode)).sort((a, b) => byCodeUnit(a.path, b.path));

  for (const recognizer of MANIFEST_RECOGNIZERS) {
    let secretPathsLeftOut = 0, setApart = 0, readable = 0;
    const outcomes: Outcome[] = [];
    const candidates = blobs.filter((entry) => recognizer.matches(entry.path));
    const toRead: string[] = [];
    for (const candidate of candidates) {
      const { path } = candidate;
      if (secretOrUnder(path.split('/'), isSecretPath)) { secretPathsLeftOut++; continue; }
      if (recognizer.setsApart && setApartPath(path)) { setApart++; continue; }
      if (path.length > MANIFEST_PATH_LIMIT || CONTROL.test(path)) { outcomes.push(unknownFile(path, 'path-not-citable', false)); continue; }
      if (candidate.mode === '120000') { outcomes.push(unknownFile(path, 'symbolic-link', false)); continue; }
      const excluded = screen.screenPath(path);
      if (excluded === 'denied-path' || excluded === 'unknown-extraction-class') { outcomes.push(unknownFile(path, excluded, false)); continue; }
      // A secret path was counted above; a body outcome never comes from a path screen. Either here would be a screen this code does not know.
      if (excluded !== undefined) throw new Error(`manifest facts: the path screen gave ${excluded} for a path the secret test passed`);
      if (unconsentedClass(screen.contentClass(path), inputs.consented) !== undefined) { outcomes.push(unknownFile(path, 'class-not-consented', false)); continue; }
      if (readable >= MANIFEST_READ_LIMIT) { outcomes.push(unknownFile(path, 'over-read-limit', false)); continue; }
      readable++;
      toRead.push(path);
    }
    // One read per file, in path order, one after another: a refused read makes that file Unknown and no other.
    for (const path of toRead) outcomes.push(await readOne(path, recognizer, inputs, screen, refusedValue));

    const files = [...outcomes.filter((o) => o.read), ...outcomes.filter((o) => !o.read)].map((o) => o.entry);
    let inferred = 0, unknown = 0, valuesLeftOut = 0, facts = 0;
    for (const outcome of outcomes) {
      if (outcome.entry.epistemic === 'inferred') inferred++; else unknown++;
      valuesLeftOut += outcome.entry.valuesLeftOut ?? 0;
      facts += outcome.facts.length;
      for (const fact of outcome.facts) pending.push(fact);
    }
    recognizers.push({
      rule: recognizer.rule.id, ruleVersion: recognizer.rule.version, label: 'inferred',
      candidates: candidates.length, secretPathsLeftOut, setApart, inferred, unknown, valuesLeftOut, facts,
      files: files.slice(0, MANIFEST_FILES_LISTED), filesNotListed: Math.max(0, files.length - MANIFEST_FILES_LISTED),
    });
  }

  pending.sort(compareFacts);
  const listed = pending.slice(0, MANIFEST_FACTS_LISTED).map((p, index) => factOf(p, index + 1));
  return {
    format: MANIFEST_FACTS_FORMAT, state: 'derived',
    screeningPolicy: { policyId: screen.policyId, policyVersion: screen.policyVersion, sha256: screen.policySha256 },
    recognizers, facts: listed, factsNotListed: pending.length - listed.length,
  };
}

async function readOne(path: string, recognizer: Recognizer, inputs: ManifestInputs, screen: ManifestInputs['screen'], refusedValue: (value: string) => boolean): Promise<Outcome> {
  let blob: VerifiedBlob;
  try {
    blob = await inputs.read(path);
  } catch (cause) {
    if (!(cause instanceof GitObjectReadRefusal)) throw cause;
    return unknownFile(path, cause.overBound ? 'too-large' : 'object-read-refused', true);
  }
  if (blob.bytes.byteLength > MANIFEST_BLOB_LIMIT) return unknownFile(path, 'too-large', true);
  let text: string;
  try { text = STRICT_UTF8.decode(blob.bytes); } catch { return unknownFile(path, 'not-utf8-text', true); }
  const screened = screen.screenTargetBody(text, path);
  if (screened.kind === 'excluded') {
    if (screened.outcome !== 'secret-detector-match' && screened.outcome !== 'active-content') throw new Error(`manifest facts: the body screen gave ${screened.outcome}`);
    return unknownFile(path, screened.outcome, true);
  }
  if (screened.kind === 'redacted') return unknownFile(path, 'redacted-body', true);
  const recognized = recognizer.recognize(text);
  if (!recognized.ok) return unknownFile(path, 'unparsed', true, recognized.parseFault);
  const kept: Pending[] = [];
  let leftOut = 0;
  for (const fact of recognized.facts) {
    const checked = FACT_MEMBERS[fact.fact].some((m, i) => m.fromBody && typeof fact.values[i] === 'string' && refusedValue(fact.values[i]!));
    if (checked) leftOut++; else kept.push({ path, rule: recognizer.rule, fact });
  }
  return { entry: { path, epistemic: 'inferred', unknownReason: null, parseFault: null, facts: kept.length, valuesLeftOut: leftOut }, read: true, facts: kept };
}

/** Path, first line, last line, kind in the stated order, then each member's value in order, null first, in code-unit order. */
function compareFacts(a: Pending, b: Pending): number {
  const byPath = byCodeUnit(a.path, b.path);
  if (byPath !== 0) return byPath;
  if (a.fact.lines.first !== b.fact.lines.first) return a.fact.lines.first - b.fact.lines.first;
  if (a.fact.lines.last !== b.fact.lines.last) return a.fact.lines.last - b.fact.lines.last;
  const byKind = FACT_KIND_ORDER.indexOf(a.fact.fact) - FACT_KIND_ORDER.indexOf(b.fact.fact);
  if (byKind !== 0) return byKind;
  for (let i = 0; i < a.fact.values.length; i++) {
    const x = a.fact.values[i] ?? null, y = b.fact.values[i] ?? null;
    if (x === y) continue;
    if (x === null) return -1;
    if (y === null) return 1;
    return byCodeUnit(x, y);
  }
  return 0;
}

function factOf(pending: Pending, k: number): ManifestFact {
  const { fact } = pending;
  const members: Record<string, string | null> = {};
  FACT_MEMBERS[fact.fact].forEach((m, i) => { members[m.name] = fact.values[i] ?? null; });
  return {
    id: `_manifest-${k}`, fact: fact.fact, rule: pending.rule.id, ruleVersion: pending.rule.version, path: pending.path,
    lines: [fact.lines.first, fact.lines.last], ...members, epistemic: 'inferred',
  } as ManifestFact;
}

/** The member when the pinned tree cannot be listed: Unknown, with the reader's refusal reason, and no recognizer or fact. */
export const manifestFactsUnknown = (reason: string): ManifestFacts => ({
  format: MANIFEST_FACTS_FORMAT, state: 'unknown', why: `the pinned tree could not be listed (${reason})`,
});
