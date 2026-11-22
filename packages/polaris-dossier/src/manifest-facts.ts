import { unconsentedClass } from './class-gate.js';
import { CENSUS_LISTED_LIMIT, shownPath } from './census.js';
import { secretOrUnder, setApartPath } from './derive.js';
import {
  CARGO_MANIFEST, CMAKE_LISTS, COMPOSE_FILE, GITHUB_ACTIONS_WORKFLOW, GO_MODULE_MANIFEST, KUBERNETES_MANIFEST, MAKEFILE, NPM_PACKAGE_MANIFEST,
  PYTHON_PROJECT_MANIFEST, TERRAFORM_CONFIGURATION, type DeriveRuleId,
} from './derive-rules.js';
import { BLOB_MODES, GitObjectReadRefusal, type TreeEntry, type VerifiedBlob } from './git-object-reader.js';
import { isCargoManifestPath, recognizeCargoManifest } from './manifest-cargo.js';
import { isCMakeListsPath, recognizeCMakeLists } from './manifest-cmake.js';
import { isComposePath, recognizeCompose } from './manifest-compose.js';
import { isGoModulePath, recognizeGoModule } from './manifest-go.js';
import { isKubernetesPath, recognizeKubernetes } from './manifest-kubernetes.js';
import { isMakefilePath, recognizeMakefile } from './manifest-make.js';
import { FACT_KIND_ORDER, FACT_MEMBERS, type FactKind, type ParseFault, type RawFact, type Recognized } from './manifest-model.js';
import { isNpmManifestPath, recognizeNpmManifest } from './manifest-npm.js';
import { isPythonProjectPath, recognizePythonProject } from './manifest-python.js';
import { isTerraformPath, recognizeTerraform } from './manifest-terraform.js';
import { isWorkflowPath, recognizeWorkflow } from './manifest-workflow.js';
import type { DossierScreen } from './screen.js';

/** Declared manifest facts (REQ-polaris-generation-034 version 2.7, syzygy-3efd.25; version 2.12, syzygy-3efd.26): what ten versioned
 * recognizers read in the manifest and infrastructure files of the pinned tree that the bound screening policy admits, stored as the draft
 * check record's last member, `manifestFacts`. A fact states only what one file declares, never what code does or what is deployed, and
 * is Inferred at this version whatever evidence exists: the label is a constant here. They are not derived structural facts: no page but
 * the computed maps renders them, and no trait or pack rule reads them.
 *
 * Each candidate (a blob entry whose path a recognizer's rule names) takes one disposition, in order: a path a secret detector matches, or
 * any of whose directory prefixes it matches, is counted in `secretPathsLeftOut` and named nowhere; for the four package recognizers and
 * the five of version 2.12, a
 * vendored, generated or test path is counted in `setApart` and named nowhere; every other candidate is a named file, Unknown and never read
 * where its path is not citable, it is a symbolic link, the screen's path outcome excludes it, the class gate withholds its class, or it is
 * past its recognizer's read limit (250, or 100 for one of version 2.12), which is also how many file entries it lists. Each remaining file is read alone, through the reader `check` opens with its object bound at 1 MiB, then
 * screened whole (`screenTargetBody`); only a body the screen admits whole is parsed. Every input is the tree listing, the blobs read, the
 * screen and the run's content classes, so two checks in which no read is refused write the same bytes, whatever their drafts.
 *
 * Since version 2.12 the member also states its coverage remainder: every blob entry no recognizer names as a candidate, counted by place
 * (the root and each top-level directory), with the secret test rule `top-level-unit` applies, so that its counts sum to the tree's. */

export const MANIFEST_FACTS_FORMAT = 'polaris-dossier-manifest-facts/2';
/** The reader's object bound for a manifest blob: one byte more is refused before it is inflated whole (`too-large`). */
export const MANIFEST_BLOB_LIMIT = 1_048_576;
/** How many files a recognizer of version 2.7 reads and lists; a recognizer of version 2.12 reads and lists `INFRA_READ_LIMIT`. */
export const MANIFEST_READ_LIMIT = 250;
export const INFRA_READ_LIMIT = 100;
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
export interface ManifestRemainderPlace { readonly place: string | null; readonly files: number; readonly notCandidates: number }
/** The coverage remainder (version 2.12): `files` = `secretPathsLeftOut` + `candidates` + `notCandidates`; the listed places' `files` and
 * `filesInPlacesNotListed` sum to `files` less `secretPathsLeftOut`, and their `notCandidates` and `notCandidatesInPlacesNotListed` to
 * `notCandidates`. */
export interface ManifestRemainder {
  readonly files: number;
  readonly secretPathsLeftOut: number;
  readonly candidates: number;
  readonly notCandidates: number;
  readonly places: readonly ManifestRemainderPlace[];
  readonly placesNotListed: number;
  readonly filesInPlacesNotListed: number;
  readonly notCandidatesInPlacesNotListed: number;
}
export type ManifestFacts =
  | {
      readonly format: typeof MANIFEST_FACTS_FORMAT;
      readonly state: 'derived';
      readonly screeningPolicy: { readonly policyId: string; readonly policyVersion: string; readonly sha256: string };
      readonly recognizers: readonly ManifestRecognizerEntry[];
      readonly facts: readonly ManifestFact[];
      readonly factsNotListed: number;
      readonly remainder: ManifestRemainder;
    }
  | { readonly format: typeof MANIFEST_FACTS_FORMAT; readonly state: 'unknown'; readonly why: string };

interface Recognizer {
  readonly rule: DeriveRuleId;
  readonly matches: (path: string) => boolean;
  /** Whether vendored, generated and test paths are set apart (the four package recognizers and the five of version 2.12; never a
   * workflow path). */
  readonly setsApart: boolean;
  /** How many files it reads, and how many file entries it lists. */
  readonly readLimit: number;
  readonly recognize: (text: string) => Recognized;
}

/** The ten recognizers, in the order the requirement names them and the member lists them. No path is a candidate of two. */
export const MANIFEST_RECOGNIZERS: readonly Recognizer[] = [
  { rule: NPM_PACKAGE_MANIFEST, matches: isNpmManifestPath, setsApart: true, readLimit: MANIFEST_READ_LIMIT, recognize: recognizeNpmManifest },
  { rule: CARGO_MANIFEST, matches: isCargoManifestPath, setsApart: true, readLimit: MANIFEST_READ_LIMIT, recognize: recognizeCargoManifest },
  { rule: PYTHON_PROJECT_MANIFEST, matches: isPythonProjectPath, setsApart: true, readLimit: MANIFEST_READ_LIMIT, recognize: recognizePythonProject },
  { rule: GO_MODULE_MANIFEST, matches: isGoModulePath, setsApart: true, readLimit: MANIFEST_READ_LIMIT, recognize: recognizeGoModule },
  { rule: GITHUB_ACTIONS_WORKFLOW, matches: isWorkflowPath, setsApart: false, readLimit: MANIFEST_READ_LIMIT, recognize: recognizeWorkflow },
  { rule: COMPOSE_FILE, matches: isComposePath, setsApart: true, readLimit: INFRA_READ_LIMIT, recognize: recognizeCompose },
  { rule: KUBERNETES_MANIFEST, matches: isKubernetesPath, setsApart: true, readLimit: INFRA_READ_LIMIT, recognize: recognizeKubernetes },
  { rule: TERRAFORM_CONFIGURATION, matches: isTerraformPath, setsApart: true, readLimit: INFRA_READ_LIMIT, recognize: recognizeTerraform },
  { rule: MAKEFILE, matches: isMakefilePath, setsApart: true, readLimit: INFRA_READ_LIMIT, recognize: recognizeMakefile },
  { rule: CMAKE_LISTS, matches: isCMakeListsPath, setsApart: true, readLimit: INFRA_READ_LIMIT, recognize: recognizeCMakeLists },
];

export interface ManifestInputs {
  readonly entries: readonly Pick<TreeEntry, 'path' | 'mode' | 'id'>[];
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
    const toRead: (typeof candidates)[number][] = [];
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
      if (readable >= recognizer.readLimit) { outcomes.push(unknownFile(path, 'over-read-limit', false)); continue; }
      readable++;
      toRead.push(candidate);
    }
    // One read per file, in path order, one after another: a refused read makes that file Unknown and no other.
    for (const entry of toRead) outcomes.push(await readOne(entry, recognizer, inputs, screen, refusedValue));

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
      files: files.slice(0, recognizer.readLimit), filesNotListed: Math.max(0, files.length - recognizer.readLimit),
    });
  }

  pending.sort(compareFacts);
  const listed = pending.slice(0, MANIFEST_FACTS_LISTED).map((p, index) => factOf(p, index + 1));
  return {
    format: MANIFEST_FACTS_FORMAT, state: 'derived',
    screeningPolicy: { policyId: screen.policyId, policyVersion: screen.policyVersion, sha256: screen.policySha256 },
    recognizers, facts: listed, factsNotListed: pending.length - listed.length,
    remainder: remainderOf(blobs, isSecretPath),
  };
}

/** The coverage remainder (version 2.12): every blob entry by place, those the secret test leaves in, and those of them that are a
 * candidate of no recognizer. A place is the root (null) or a top-level directory's raw first segment, in the census's shown form where
 * it is not citable; the first `CENSUS_LISTED_LIMIT` directories, in code-unit order, are listed and the rest summed. */
function remainderOf(blobs: readonly Pick<TreeEntry, 'path'>[], isSecretPath: (path: string) => boolean): ManifestRemainder {
  let secretPathsLeftOut = 0, candidates = 0, notCandidates = 0;
  const root = { files: 0, notCandidates: 0 };
  const directories = new Map<string, { files: number; notCandidates: number }>();
  for (const { path } of blobs) {
    const segments = path.split('/');
    if (secretOrUnder(segments, isSecretPath)) { secretPathsLeftOut++; continue; }
    const candidate = MANIFEST_RECOGNIZERS.some((recognizer) => recognizer.matches(path));
    if (candidate) candidates++; else notCandidates++;
    let place = root;
    if (segments.length > 1) {
      place = directories.get(segments[0]!) ?? { files: 0, notCandidates: 0 };
      directories.set(segments[0]!, place);
    }
    place.files++;
    if (!candidate) place.notCandidates++;
  }
  const ordered = [...directories].sort(([a], [b]) => byCodeUnit(a, b));
  const listed = ordered.slice(0, CENSUS_LISTED_LIMIT), rest = ordered.slice(CENSUS_LISTED_LIMIT);
  const shown = (segment: string): string => (segment.length > MANIFEST_PATH_LIMIT || CONTROL.test(segment) ? shownPath(segment) : segment);
  let filesInPlacesNotListed = 0, notCandidatesInPlacesNotListed = 0;
  for (const [, counts] of rest) { filesInPlacesNotListed += counts.files; notCandidatesInPlacesNotListed += counts.notCandidates; }
  return {
    files: secretPathsLeftOut + candidates + notCandidates, secretPathsLeftOut, candidates, notCandidates,
    places: [{ place: null, ...root }, ...listed.map(([segment, counts]) => ({ place: shown(segment), files: counts.files, notCandidates: counts.notCandidates }))],
    placesNotListed: rest.length, filesInPlacesNotListed, notCandidatesInPlacesNotListed,
  };
}

async function readOne({ path, id }: Pick<TreeEntry, 'path' | 'id'>, recognizer: Recognizer, inputs: ManifestInputs, screen: ManifestInputs['screen'], refusedValue: (value: string) => boolean): Promise<Outcome> {
  let blob: VerifiedBlob;
  try {
    blob = await inputs.read(path);
  } catch (cause) {
    if (!(cause instanceof GitObjectReadRefusal)) throw cause;
    // `too-large` is the listed blob's own size alone: a tree or delta base over the bound on the way is a refused read like any other.
    return unknownFile(path, cause.overBound && cause.objectId === id ? 'too-large' : 'object-read-refused', true);
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
