import { unconsentedClass } from './class-gate.js';
import { CENSUS_LISTED_LIMIT, shownPath } from './census.js';
import { secretOrUnder, vendoredOrGeneratedPath } from './derive.js';
import { LIMIT_DEFAULT, TOP_LEVEL_UNIT } from './derive-rules.js';
import { BLOB_MODES, GitObjectReadRefusal, type TreeEntry, type VerifiedBlob } from './git-object-reader.js';
import { limitCandidateOf, recognizeConfig, recognizeConstants, type LimitCandidate, type LimitKind, type ValueType } from './limits-recognize.js';
import { MANIFEST_BLOB_LIMIT, MANIFEST_PATH_LIMIT, MANIFEST_VALUE_LIMIT, type ManifestInputs } from './manifest-facts.js';
import { secretPathOf } from './screen.js';

/** Limits and defaults (REQ-polaris-generation-034 version 2.49, syzygy-5dhm.116): every named limit constant that recognizer
 * `limit-default` v1 reads defined in the admitted source files of the pinned tree, and every entry it reads set in the admitted
 * configuration files, each a row whose line is quoted from the blob read, with its value as written and that value's type, and per-unit
 * counts by rule `top-level-unit`. A row with a value is Observed: the blob at that path sets that name to that text on that line. A row
 * whose value no form takes is Unknown: the name is defined there, and what it is set to is not read. Nothing is evaluated, and no row says
 * a limit is reached, enforced or right.
 *
 * Each candidate takes the rough-edge markers' disposition, in the same order: a path a secret detector matches, or any of whose
 * directory prefixes it matches, is counted in `secretPathsLeftOut` and named nowhere; a vendored or generated path is counted in `setApart`
 * and named nowhere; every other candidate is a named file, Unknown and never read where its path is not citable, it is a symbolic link,
 * the screen's path outcome excludes it, the class gate withholds its class, or it is past its form's read limit. Each remaining file is
 * read through the reader bound at 1 MiB, `LIMITS_READ_BATCH` paths to a call (a refused call is read again one path to a call, so each
 * file's outcome is its own), then screened whole (`screenTargetBody`); only a body the screen admits whole is read, and each quoted line
 * passes the manifest value checks or its row is left out and counted. */

export const LIMITS_FORMAT = 'polaris-dossier-limits-and-defaults/1';
/** How many source files, and how many configuration files, the recognizer reads; the file entries it lists. */
export const LIMITS_CODE_READ_LIMIT = 1_000;
export const LIMITS_CONFIG_READ_LIMIT = 250;
/** How many rows the member lists. */
export const LIMITS_LISTED = 2_000;
/** How many paths one reader call reads. */
export const LIMITS_READ_BATCH = 64;

export type LimitsUnknownReason =
  | 'path-not-citable' | 'symbolic-link' | 'denied-path' | 'unknown-extraction-class' | 'class-not-consented' | 'over-read-limit'
  | 'object-read-refused' | 'not-utf8-text' | 'too-large' | 'secret-detector-match' | 'active-content' | 'redacted-body' | 'unparsed';

export interface LimitsFileEntry {
  readonly path: string;
  readonly source: 'code' | 'config';
  readonly epistemic: 'observed' | 'unknown';
  readonly unknownReason: LimitsUnknownReason | null;
  readonly parseFault: 'unterminated' | 'outside-grammar' | null;
  readonly rows: number | null;
  readonly valuesLeftOut: number | null;
}
export interface LimitsRecognizer {
  readonly rule: string;
  readonly ruleVersion: number;
  readonly candidates: number;
  readonly secretPathsLeftOut: number;
  readonly setApart: number;
  readonly observed: number;
  readonly unknown: number;
  readonly valuesLeftOut: number;
  /** Sequence items a `yaml` file holds, skipped with every line under them. */
  readonly sequenceItemsNotRead: number;
  readonly rows: number;
  readonly files: readonly LimitsFileEntry[];
  readonly filesNotListed: number;
}
export interface LimitRow {
  readonly id: string;
  readonly source: 'code' | 'config';
  readonly kind: LimitKind | 'entry';
  readonly name: string;
  readonly value: string | null;
  readonly valueType: ValueType | null;
  readonly path: string;
  readonly line: number;
  readonly unit: string | null;
  /** The object id of the blob the line was read from. */
  readonly blob: string;
  readonly quote: string;
  readonly epistemic: 'observed' | 'unknown';
  readonly unknownReason: 'value-not-literal' | null;
}
export interface LimitsUnit { readonly unit: string | null; readonly files: number; readonly constants: number; readonly entries: number; readonly valuesUnknown: number }
export type LimitsAndDefaults =
  | {
      readonly format: typeof LIMITS_FORMAT;
      readonly state: 'derived';
      readonly screeningPolicy: { readonly policyId: string; readonly policyVersion: string; readonly sha256: string };
      readonly unitRule: { readonly rule: string; readonly ruleVersion: number };
      readonly recognizer: LimitsRecognizer;
      readonly units: readonly LimitsUnit[];
      readonly unitsNotListed: number;
      readonly rows: readonly LimitRow[];
      readonly rowsNotListed: number;
    }
  | { readonly format: typeof LIMITS_FORMAT; readonly state: 'unknown'; readonly why: string };

export interface LimitsInputs extends Omit<ManifestInputs, 'read'> {
  /** Read blobs at the pinned revision in one call of the pinned reader whose object bound is `MANIFEST_BLOB_LIMIT`, in the order given;
   * a refusal of any path refuses the call. */
  readonly readMany: (paths: readonly string[]) => Promise<readonly VerifiedBlob[]>;
}

const byCodeUnit = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
const CONTROL = /[\u0000-\u001f\u007f]/u;
const STRICT_UTF8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

type Entry = Pick<TreeEntry, 'path' | 'mode' | 'id'>;
interface Pending { readonly row: Omit<LimitRow, 'id' | 'unit'>; readonly order: number }
interface Outcome { readonly entry: LimitsFileEntry; readonly read: boolean; readonly rows: readonly Pending[]; readonly sequenceItems: number }

const sourceOf = (candidate: LimitCandidate): 'code' | 'config' => candidate.source;
const unknownFile = (path: string, source: 'code' | 'config', reason: LimitsUnknownReason, read: boolean, parseFault: LimitsFileEntry['parseFault'] = null): Outcome => ({
  entry: { path: reason === 'path-not-citable' ? shownPath(path) : path, source, epistemic: 'unknown', unknownReason: reason, parseFault, rows: null, valuesLeftOut: null },
  read, rows: [], sequenceItems: 0,
});

/** Rule `top-level-unit`'s unit for a path: its first segment, or null at the root. */
const unitOf = (path: string): string | null => { const slash = path.indexOf('/'); return slash < 0 ? null : path.slice(0, slash); };

export async function deriveLimits(inputs: LimitsInputs): Promise<LimitsAndDefaults> {
  const { screen } = inputs;
  const isSecretPath = secretPathOf(screen);
  const refusedValue = (value: string): boolean => value.length === 0 || value.length > MANIFEST_VALUE_LIMIT || CONTROL.test(value) || screen.screenBody(value) === 'secret-detector-match';
  const blobs = [...inputs.entries].filter((entry) => BLOB_MODES.has(entry.mode)).sort((a, b) => byCodeUnit(a.path, b.path));

  let secretPathsLeftOut = 0, setApart = 0;
  const readable = { code: 0, config: 0 };
  const limitOf = { code: LIMITS_CODE_READ_LIMIT, config: LIMITS_CONFIG_READ_LIMIT };
  const outcomes: Outcome[] = [];
  const candidates = blobs.flatMap((entry) => { const candidate = limitCandidateOf(entry.path); return candidate === undefined ? [] : [{ entry, candidate }]; });
  const toRead: { entry: Entry; candidate: LimitCandidate }[] = [];
  for (const item of candidates) {
    const { path, mode } = item.entry;
    const source = sourceOf(item.candidate);
    if (secretOrUnder(path.split('/'), isSecretPath)) { secretPathsLeftOut++; continue; }
    if (vendoredOrGeneratedPath(path)) { setApart++; continue; }
    if (path.length > MANIFEST_PATH_LIMIT || CONTROL.test(path)) { outcomes.push(unknownFile(path, source, 'path-not-citable', false)); continue; }
    if (mode === '120000') { outcomes.push(unknownFile(path, source, 'symbolic-link', false)); continue; }
    const excluded = screen.screenPath(path);
    if (excluded === 'denied-path' || excluded === 'unknown-extraction-class') { outcomes.push(unknownFile(path, source, excluded, false)); continue; }
    if (excluded !== undefined) throw new Error(`limits: the path screen gave ${excluded} for a path the secret test passed`);
    if (unconsentedClass(screen.contentClass(path), inputs.consented) !== undefined) { outcomes.push(unknownFile(path, source, 'class-not-consented', false)); continue; }
    if (readable[source] >= limitOf[source]) { outcomes.push(unknownFile(path, source, 'over-read-limit', false)); continue; }
    readable[source]++;
    toRead.push(item);
  }
  for (let start = 0; start < toRead.length; start += LIMITS_READ_BATCH) {
    const batch = toRead.slice(start, start + LIMITS_READ_BATCH);
    const read = await readBatch(batch.map((item) => item.entry), inputs);
    batch.forEach((item, k) => outcomes.push(examine(item.entry, item.candidate, read[k]!, inputs, refusedValue)));
  }

  const files = [...outcomes.filter((o) => o.read), ...outcomes.filter((o) => !o.read)].map((o) => o.entry);
  const pending: Pending[] = [];
  const unitFiles = new Map<string | null, number>();
  let observed = 0, unknown = 0, valuesLeftOut = 0, sequenceItemsNotRead = 0;
  for (const outcome of outcomes) {
    if (outcome.entry.epistemic === 'observed') {
      observed++;
      const unit = unitOf(outcome.entry.path);
      unitFiles.set(unit, (unitFiles.get(unit) ?? 0) + 1);
    } else unknown++;
    valuesLeftOut += outcome.entry.valuesLeftOut ?? 0;
    sequenceItemsNotRead += outcome.sequenceItems;
    for (const row of outcome.rows) pending.push(row);
  }

  pending.sort((a, b) => byCodeUnit(a.row.path, b.row.path) || a.row.line - b.row.line || a.order - b.order);
  const listed: LimitRow[] = pending.slice(0, LIMITS_LISTED).map((p, index) => ({ id: `_limit-${index + 1}`, ...p.row, unit: unitOf(p.row.path) }));
  const units = unitsOf(pending, unitFiles);
  return {
    format: LIMITS_FORMAT, state: 'derived',
    screeningPolicy: { policyId: screen.policyId, policyVersion: screen.policyVersion, sha256: screen.policySha256 },
    unitRule: { rule: TOP_LEVEL_UNIT.id, ruleVersion: TOP_LEVEL_UNIT.version },
    recognizer: {
      rule: LIMIT_DEFAULT.id, ruleVersion: LIMIT_DEFAULT.version,
      candidates: candidates.length, secretPathsLeftOut, setApart, observed, unknown, valuesLeftOut, sequenceItemsNotRead, rows: pending.length,
      files: files.slice(0, LIMITS_CODE_READ_LIMIT), filesNotListed: Math.max(0, files.length - LIMITS_CODE_READ_LIMIT),
    },
    units: units.slice(0, CENSUS_LISTED_LIMIT), unitsNotListed: Math.max(0, units.length - CENSUS_LISTED_LIMIT),
    rows: listed, rowsNotListed: pending.length - listed.length,
  };
}

/** One row per unit with a file read: the root first, then each top-level directory in code-unit order; every row is counted, listed or
 * not. */
function unitsOf(pending: readonly Pending[], unitFiles: ReadonlyMap<string | null, number>): LimitsUnit[] {
  const rows = new Map<string | null, { constants: number; entries: number; valuesUnknown: number }>();
  for (const unit of unitFiles.keys()) rows.set(unit, { constants: 0, entries: 0, valuesUnknown: 0 });
  for (const { row: p } of pending) {
    const row = rows.get(unitOf(p.path))!;
    if (p.source === 'code') row.constants++; else row.entries++;
    if (p.epistemic === 'unknown') row.valuesUnknown++;
  }
  return [...rows].sort(([a], [b]) => (a === null ? -1 : b === null ? 1 : byCodeUnit(a, b)))
    .map(([unit, row]) => ({ unit, files: unitFiles.get(unit)!, ...row }));
}

/** Each path's blob or its refusal: the batch in one call, and where that call is refused, each path in a call of its own. */
async function readBatch(entries: readonly Entry[], inputs: LimitsInputs): Promise<readonly (VerifiedBlob | GitObjectReadRefusal)[]> {
  try {
    return await inputs.readMany(entries.map((entry) => entry.path));
  } catch (cause) {
    if (!(cause instanceof GitObjectReadRefusal)) throw cause;
  }
  const out: (VerifiedBlob | GitObjectReadRefusal)[] = [];
  for (const entry of entries) {
    try {
      out.push((await inputs.readMany([entry.path]))[0]!);
    } catch (cause) {
      if (!(cause instanceof GitObjectReadRefusal)) throw cause;
      out.push(cause);
    }
  }
  return out;
}

function examine({ path, id }: Entry, candidate: LimitCandidate, read: VerifiedBlob | GitObjectReadRefusal, inputs: LimitsInputs, refusedValue: (value: string) => boolean): Outcome {
  const source = sourceOf(candidate);
  if (read instanceof GitObjectReadRefusal) return unknownFile(path, source, read.overBound && read.objectId === id ? 'too-large' : 'object-read-refused', true);
  if (read.bytes.byteLength > MANIFEST_BLOB_LIMIT) return unknownFile(path, source, 'too-large', true);
  let text: string;
  try { text = STRICT_UTF8.decode(read.bytes); } catch { return unknownFile(path, source, 'not-utf8-text', true); }
  const screened = inputs.screen.screenTargetBody(text, path);
  if (screened.kind === 'excluded') {
    if (screened.outcome !== 'secret-detector-match' && screened.outcome !== 'active-content') throw new Error(`limits: the body screen gave ${screened.outcome}`);
    return unknownFile(path, source, screened.outcome, true);
  }
  if (screened.kind === 'redacted') return unknownFile(path, source, 'redacted-body', true);
  const recognized = candidate.source === 'code' ? recognizeConstants(text, candidate.language) : recognizeConfig(text, candidate.form);
  if (!recognized.ok) return unknownFile(path, source, 'unparsed', true, recognized.parseFault);
  const kept: Pending[] = [];
  let leftOut = 0;
  recognized.limits.forEach((found, order) => {
    if (refusedValue(found.quote)) { leftOut++; return; }
    kept.push({
      row: {
        source: found.source, kind: found.kind, name: found.name, value: found.value, valueType: found.valueType, path, line: found.line, blob: read.id, quote: found.quote,
        epistemic: found.valueType === null ? 'unknown' : 'observed', unknownReason: found.valueType === null ? 'value-not-literal' : null,
      },
      order,
    });
  });
  return { entry: { path, source, epistemic: 'observed', unknownReason: null, parseFault: null, rows: kept.length, valuesLeftOut: leftOut }, read: true, rows: kept, sequenceItems: recognized.sequenceItems };
}

/** The member when the pinned tree cannot be listed: Unknown, with the reader's refusal reason, and no file or row. */
export const limitsUnknown = (reason: string): LimitsAndDefaults => ({
  format: LIMITS_FORMAT, state: 'unknown', why: `the pinned tree could not be listed (${reason})`,
});
