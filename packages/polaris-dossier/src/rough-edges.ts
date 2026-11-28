import { unconsentedClass } from './class-gate.js';
import { CENSUS_LISTED_LIMIT, shownPath } from './census.js';
import { secretOrUnder, vendoredOrGeneratedPath } from './derive.js';
import { ROUGH_EDGE_MARKER, TOP_LEVEL_UNIT } from './derive-rules.js';
import { BLOB_MODES, GitObjectReadRefusal, type TreeEntry, type VerifiedBlob } from './git-object-reader.js';
import { MANIFEST_BLOB_LIMIT, MANIFEST_PATH_LIMIT, MANIFEST_VALUE_LIMIT, type ManifestInputs } from './manifest-facts.js';
import { markerLanguageOf, recognizeMarkers, type MarkerKind, type MarkerLanguage } from './rough-edges-recognize.js';
import { secretPathOf } from './screen.js';

/** Rough-edge markers (REQ-polaris-generation-034 version 2.43, syzygy-5dhm.46): every TODO, FIXME and HACK marker, deprecation marker
 * and issue reference that recognizer `rough-edge-marker` v1 reads in the admitted source files of the pinned tree, each a row whose line
 * is quoted from the blob read, and per-unit counts by rule `top-level-unit`. A row is Observed: the blob at that path holds that line.
 * What a marker means is not stated, and what an issue reference names is Unknown: nothing is fetched.
 *
 * Each candidate takes the test-name recognizers' disposition, in the same order: a path a secret detector matches, or any of whose
 * directory prefixes it matches, is counted in `secretPathsLeftOut` and named nowhere; a vendored or generated path is counted in `setApart`
 * and named nowhere; every other candidate is a named file, Unknown and never read where its path is not citable, it is a symbolic link,
 * the screen's path outcome excludes it, the class gate withholds its class, or it is past `ROUGH_EDGES_READ_LIMIT`. Each remaining file is
 * read alone, through the reader bound at 1 MiB, then screened whole (`screenTargetBody`); only a body the screen admits whole is read for
 * markers, and each quoted line passes the manifest value checks or its marker is left out and counted. */

export const ROUGH_EDGES_FORMAT = 'polaris-dossier-rough-edges/1';
/** How many files the recognizer reads, and how many file entries it lists. */
export const ROUGH_EDGES_READ_LIMIT = 1_000;
/** How many markers the member lists. */
export const ROUGH_EDGES_LISTED = 2_000;

export type RoughEdgesUnknownReason =
  | 'path-not-citable' | 'symbolic-link' | 'denied-path' | 'unknown-extraction-class' | 'class-not-consented' | 'over-read-limit'
  | 'object-read-refused' | 'not-utf8-text' | 'too-large' | 'secret-detector-match' | 'active-content' | 'redacted-body' | 'unparsed';

export interface RoughEdgesFileEntry {
  readonly path: string;
  readonly epistemic: 'observed' | 'unknown';
  readonly unknownReason: RoughEdgesUnknownReason | null;
  readonly parseFault: 'unterminated' | null;
  readonly markers: number | null;
  readonly valuesLeftOut: number | null;
}
export interface RoughEdgesRecognizer {
  readonly rule: string;
  readonly ruleVersion: number;
  readonly label: 'observed';
  readonly candidates: number;
  readonly secretPathsLeftOut: number;
  readonly setApart: number;
  readonly observed: number;
  readonly unknown: number;
  readonly valuesLeftOut: number;
  readonly markers: number;
  readonly files: readonly RoughEdgesFileEntry[];
  readonly filesNotListed: number;
}
export interface RoughEdgeMarker {
  readonly id: string;
  readonly kind: MarkerKind;
  readonly marker: string;
  readonly path: string;
  readonly line: number;
  readonly unit: string | null;
  /** The object id of the blob the line was read from. */
  readonly blob: string;
  readonly quote: string;
  readonly epistemic: 'observed';
  /** For an issue reference, `unknown`: what it names lies outside the clone and is never fetched. Null for every other kind. */
  readonly referenceContent: 'unknown' | null;
}
export interface RoughEdgesUnit { readonly unit: string | null; readonly files: number; readonly markers: number; readonly byKind: Readonly<Record<string, number>> }
export type RoughEdges =
  | {
      readonly format: typeof ROUGH_EDGES_FORMAT;
      readonly state: 'derived';
      readonly screeningPolicy: { readonly policyId: string; readonly policyVersion: string; readonly sha256: string };
      readonly unitRule: { readonly rule: string; readonly ruleVersion: number };
      readonly recognizer: RoughEdgesRecognizer;
      readonly units: readonly RoughEdgesUnit[];
      readonly unitsNotListed: number;
      readonly markers: readonly RoughEdgeMarker[];
      readonly markersNotListed: number;
    }
  | { readonly format: typeof ROUGH_EDGES_FORMAT; readonly state: 'unknown'; readonly why: string };

const byCodeUnit = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
const CONTROL = /[\u0000-\u001f\u007f]/u;
const STRICT_UTF8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

interface Pending { readonly path: string; readonly kind: MarkerKind; readonly marker: string; readonly line: number; readonly quote: string; readonly blob: string; readonly order: number }
interface Outcome { readonly entry: RoughEdgesFileEntry; readonly read: boolean; readonly markers: readonly Pending[] }

const unknownFile = (path: string, reason: RoughEdgesUnknownReason, read: boolean, parseFault: 'unterminated' | null = null): Outcome => ({
  entry: { path: reason === 'path-not-citable' ? shownPath(path) : path, epistemic: 'unknown', unknownReason: reason, parseFault, markers: null, valuesLeftOut: null },
  read, markers: [],
});

/** Rule `top-level-unit`'s unit for a path: its first segment, or null at the root. */
const unitOf = (path: string): string | null => { const slash = path.indexOf('/'); return slash < 0 ? null : path.slice(0, slash); };

export async function deriveRoughEdges(inputs: ManifestInputs): Promise<RoughEdges> {
  const { screen } = inputs;
  const isSecretPath = secretPathOf(screen);
  const refusedValue = (value: string): boolean => value.length === 0 || value.length > MANIFEST_VALUE_LIMIT || CONTROL.test(value) || screen.screenBody(value) === 'secret-detector-match';
  const blobs = [...inputs.entries].filter((entry) => BLOB_MODES.has(entry.mode)).sort((a, b) => byCodeUnit(a.path, b.path));

  let secretPathsLeftOut = 0, setApart = 0, readable = 0;
  const outcomes: Outcome[] = [];
  const candidates = blobs.flatMap((entry) => { const language = markerLanguageOf(entry.path); return language === undefined ? [] : [{ entry, language }]; });
  const toRead: { entry: (typeof blobs)[number]; language: MarkerLanguage }[] = [];
  for (const candidate of candidates) {
    const { path, mode } = candidate.entry;
    if (secretOrUnder(path.split('/'), isSecretPath)) { secretPathsLeftOut++; continue; }
    if (vendoredOrGeneratedPath(path)) { setApart++; continue; }
    if (path.length > MANIFEST_PATH_LIMIT || CONTROL.test(path)) { outcomes.push(unknownFile(path, 'path-not-citable', false)); continue; }
    if (mode === '120000') { outcomes.push(unknownFile(path, 'symbolic-link', false)); continue; }
    const excluded = screen.screenPath(path);
    if (excluded === 'denied-path' || excluded === 'unknown-extraction-class') { outcomes.push(unknownFile(path, excluded, false)); continue; }
    if (excluded !== undefined) throw new Error(`rough edges: the path screen gave ${excluded} for a path the secret test passed`);
    if (unconsentedClass(screen.contentClass(path), inputs.consented) !== undefined) { outcomes.push(unknownFile(path, 'class-not-consented', false)); continue; }
    if (readable >= ROUGH_EDGES_READ_LIMIT) { outcomes.push(unknownFile(path, 'over-read-limit', false)); continue; }
    readable++;
    toRead.push(candidate);
  }
  for (const { entry, language } of toRead) outcomes.push(await readOne(entry, language, inputs, refusedValue));

  const files = [...outcomes.filter((o) => o.read), ...outcomes.filter((o) => !o.read)].map((o) => o.entry);
  const pending: Pending[] = [];
  const unitFiles = new Map<string | null, number>();
  let observed = 0, unknown = 0, valuesLeftOut = 0;
  for (const outcome of outcomes) {
    if (outcome.entry.epistemic === 'observed') {
      observed++;
      const unit = unitOf(outcome.entry.path);
      unitFiles.set(unit, (unitFiles.get(unit) ?? 0) + 1);
    } else unknown++;
    valuesLeftOut += outcome.entry.valuesLeftOut ?? 0;
    for (const marker of outcome.markers) pending.push(marker);
  }

  pending.sort((a, b) => byCodeUnit(a.path, b.path) || a.line - b.line || a.order - b.order);
  const listed: RoughEdgeMarker[] = pending.slice(0, ROUGH_EDGES_LISTED).map((p, index) => ({
    id: `_marker-${index + 1}`, kind: p.kind, marker: p.marker, path: p.path, line: p.line, unit: unitOf(p.path), blob: p.blob, quote: p.quote,
    epistemic: 'observed', referenceContent: p.kind === 'issue-reference' ? 'unknown' : null,
  }));
  const units = unitsOf(pending, unitFiles);
  return {
    format: ROUGH_EDGES_FORMAT, state: 'derived',
    screeningPolicy: { policyId: screen.policyId, policyVersion: screen.policyVersion, sha256: screen.policySha256 },
    unitRule: { rule: TOP_LEVEL_UNIT.id, ruleVersion: TOP_LEVEL_UNIT.version },
    recognizer: {
      rule: ROUGH_EDGE_MARKER.id, ruleVersion: ROUGH_EDGE_MARKER.version, label: 'observed',
      candidates: candidates.length, secretPathsLeftOut, setApart, observed, unknown, valuesLeftOut, markers: pending.length,
      files: files.slice(0, ROUGH_EDGES_READ_LIMIT), filesNotListed: Math.max(0, files.length - ROUGH_EDGES_READ_LIMIT),
    },
    units: units.slice(0, CENSUS_LISTED_LIMIT), unitsNotListed: Math.max(0, units.length - CENSUS_LISTED_LIMIT),
    markers: listed, markersNotListed: pending.length - listed.length,
  };
}

/** One row per unit with a file read for markers: the root first, then each top-level directory in code-unit order; every marker is
 * counted, listed or not, under its kind. */
function unitsOf(pending: readonly Pending[], unitFiles: ReadonlyMap<string | null, number>): RoughEdgesUnit[] {
  const rows = new Map<string | null, { markers: number; byKind: Record<string, number> }>();
  for (const unit of unitFiles.keys()) rows.set(unit, { markers: 0, byKind: Object.fromEntries(ROUGH_EDGE_MARKER.kinds.map((k) => [k, 0])) });
  for (const p of pending) {
    const row = rows.get(unitOf(p.path))!;
    row.markers++;
    row.byKind[p.kind]!++;
  }
  return [...rows].sort(([a], [b]) => (a === null ? -1 : b === null ? 1 : byCodeUnit(a, b)))
    .map(([unit, row]) => ({ unit, files: unitFiles.get(unit)!, markers: row.markers, byKind: row.byKind }));
}

async function readOne({ path, id }: Pick<TreeEntry, 'path' | 'id'>, language: MarkerLanguage, inputs: ManifestInputs, refusedValue: (value: string) => boolean): Promise<Outcome> {
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
    if (screened.outcome !== 'secret-detector-match' && screened.outcome !== 'active-content') throw new Error(`rough edges: the body screen gave ${screened.outcome}`);
    return unknownFile(path, screened.outcome, true);
  }
  if (screened.kind === 'redacted') return unknownFile(path, 'redacted-body', true);
  const recognized = recognizeMarkers(text, language);
  if (!recognized.ok) return unknownFile(path, 'unparsed', true, recognized.parseFault);
  const kept: Pending[] = [];
  let leftOut = 0;
  recognized.markers.forEach((found, order) => {
    if (refusedValue(found.quote)) leftOut++;
    else kept.push({ path, kind: found.kind, marker: found.marker, line: found.line, quote: found.quote, blob: blob.id, order });
  });
  return { entry: { path, epistemic: 'observed', unknownReason: null, parseFault: null, markers: kept.length, valuesLeftOut: leftOut }, read: true, markers: kept };
}

/** The member when the pinned tree cannot be listed: Unknown, with the reader's refusal reason, and no file or marker. */
export const roughEdgesUnknown = (reason: string): RoughEdges => ({
  format: ROUGH_EDGES_FORMAT, state: 'unknown', why: `the pinned tree could not be listed (${reason})`,
});
