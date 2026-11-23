import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { decodeUtf8, isRecord, sha256 } from '@syzygy/support';
import { draftRules } from './check-derive.js';
import { DRAFT_JSON_LIMITS, DRAFT_MAX_BYTES } from './check-model.js';
import { NotARegularFileError, readBoundedFile } from './check-record-read.js';
import { LOCAL_DRAFT_SCHEMA_VERSIONS, checkDraftShape } from './draft-schema.js';
import { FIGURE_MIN_TEXT_PX, FIGURE_TEXT_PX, FIGURE_VIEWPORTS, figureFit, type FigureLayout } from './figure-fit.js';
import { readerAdvice } from './reader-advice.js';
import {
  LEDGER_STANDARDS, READING_LEDGER_FORMAT, WORDS_PER_MINUTE, compareLedgers, readingLedger, storedLedger,
  type AdvisoryCounts, type FigureFitCounts, type LedgerDraft, type LedgerNumbers, type PageChange, type ReadingLedger,
} from './reading-ledger.js';
import { REVISION_FILE, RUN_ID, RUN_LAYOUT } from './state-directory.js';

/** The stored-draft re-render measurement (syzygy-3efd.22): every frozen draft revision under a dossier state root, measured again with
 * the current reading ledger (syzygy-3efd.21) and figure fit (syzygy-3efd.20) through the figure layout the site renderer draws with, and
 * compared with a committed baseline record. An operator's instrument: it changes no dossier behaviour, writes nothing into the state
 * root, and gates nothing.
 *
 * What it reads: the names in the state root; for each entry named exactly as a run directory (`RUN_ID`, so never a `run-*.agents`
 * directory, which it neither lists nor opens), the names in its `drafts/`; and the bytes of each `drafts/rev-<n>.json` there. It reads
 * no run record, check record, brief, clone or repository, and no other file of `drafts/` (`next.json` is counted, never read).
 *
 * What it keeps: numbers and draft identities (run identity, revision, digest, byte length, schema version, page names), never draft
 * text, never a finding's wording and never quoted source. */

export const RERENDER_RECORD_FORMAT = 'polaris-dossier-rerender-measure/1';
export const RERENDER_COMPARISON_FORMAT = 'polaris-dossier-rerender-comparison/1';

/** The question limit applied to the schema: none. The run's own limit is in its run record, which this instrument does not read. */
const NO_QUESTION_LIMIT = Number.MAX_SAFE_INTEGER;
const COMMIT = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;

// --- Listing --------------------------------------------------------------------------------------------------------------------

/** A frozen revision: its bytes, or, where they could not be read, the error code (counted as a refusal, `unreadable`). */
export type StoredDraft = { readonly run: string; readonly revision: number } & ({ readonly bytes: Uint8Array } | { readonly bytes: null; readonly readError: string });
export interface DraftListing {
  /** Entries of the state root named as a run directory. */
  readonly runsListed: number;
  /** Of those, the ones with no `drafts/` directory. */
  readonly runsWithoutDrafts: number;
  /** Entries named as a run directory that are not a directory, a `drafts/` that is not a directory, and a `drafts/` that could not be
   * listed. No link is followed. */
  readonly unlistable: readonly { readonly run: string; readonly why: string }[];
  /** Files of a `drafts/` not named `rev-<n>.json` (the working `next.json`): counted, never read. */
  readonly otherDraftFiles: number;
  readonly drafts: readonly StoredDraft[];
}

const code = (cause: unknown): string => (cause as NodeJS.ErrnoException).code ?? 'unknown-error';

/** Every frozen draft revision under `stateRoot`, by run identity then revision. Throws when the state root itself cannot be listed. */
export function listStoredDrafts(stateRoot: string): DraftListing {
  const entries = fs.readdirSync(stateRoot, { withFileTypes: true }).filter((entry) => RUN_ID.test(entry.name)).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  let runsWithoutDrafts = 0, otherDraftFiles = 0;
  const unlistable: { run: string; why: string }[] = [];
  const drafts: StoredDraft[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) { unlistable.push({ run: entry.name, why: 'not a directory' }); continue; }
    const dir = path.join(stateRoot, entry.name, RUN_LAYOUT.drafts);
    let names: fs.Dirent[];
    try {
      if (!fs.lstatSync(dir).isDirectory()) { unlistable.push({ run: entry.name, why: 'drafts/ is not a directory' }); continue; }
      names = fs.readdirSync(dir, { withFileTypes: true });
    } catch (cause) {
      if (code(cause) === 'ENOENT') { runsWithoutDrafts += 1; continue; }
      unlistable.push({ run: entry.name, why: `drafts/ could not be listed (${code(cause)})` });
      continue;
    }
    const revisions: number[] = [];
    for (const name of names) {
      const match = REVISION_FILE.exec(name.name);
      if (match === null || !name.isFile()) { otherDraftFiles += 1; continue; }
      revisions.push(Number(match[1]));
    }
    for (const revision of revisions.sort((a, b) => a - b)) {
      let bytes: Uint8Array;
      // The reader rule under the draft's 4,194,304 bytes (syzygy-3efd.76): a revision past it, or one that is not a regular
      // file when opened, is a revision this measurement could not read.
      try { bytes = readBoundedFile(path.join(dir, `rev-${revision}.json`), DRAFT_MAX_BYTES); } catch (cause) {
        drafts.push({ run: entry.name, revision, bytes: null, readError: cause instanceof NotARegularFileError ? 'not-a-regular-file' : code(cause) });
        continue;
      }
      drafts.push({ run: entry.name, revision, bytes });
    }
  }
  return { runsListed: entries.length, runsWithoutDrafts, unlistable, otherDraftFiles, drafts };
}

// --- Measuring one draft --------------------------------------------------------------------------------------------------------

export type RefusalWhy = 'unreadable' | 'not-utf8' | 'not-json' | 'unknown-schema-version' | 'no-pinned-revision' | 'schema';
export const REFUSAL_REASONS: readonly RefusalWhy[] = ['unreadable', 'not-utf8', 'not-json', 'unknown-schema-version', 'no-pinned-revision', 'schema'];

/** A ledger page as the record keeps it: its numbers, never its units. */
export interface MeasuredPage extends LedgerNumbers { readonly page: string }
export interface Measured { readonly figuresExamined: number; readonly draft: LedgerDraft; readonly pages: readonly MeasuredPage[] }
export type DraftMeasure =
  | { readonly outcome: 'measured'; readonly schemaVersion: string; readonly measured: Measured }
  | { readonly outcome: 'refused'; readonly schemaVersion: string | null; readonly why: RefusalWhy; readonly schemaFindings: number };

/** One stored draft through the current schema, then the ledger and figure fit `check` computes, with `layout` as its figure layout. A
 * draft the current schema refuses (as `check` applies it, by the draft's own version) is refused here and measured no further. */
export function measureDraft(bytes: Uint8Array, layout: FigureLayout | undefined): DraftMeasure {
  const decoded = decodeUtf8(bytes);
  if (decoded === undefined) return { outcome: 'refused', schemaVersion: null, why: 'not-utf8', schemaFindings: 0 };
  let doc: unknown;
  try { doc = parseBoundedJson(decoded, DRAFT_JSON_LIMITS); } catch { return { outcome: 'refused', schemaVersion: null, why: 'not-json', schemaFindings: 0 }; }
  const version = isRecord(doc) && typeof doc['schemaVersion'] === 'string' ? doc['schemaVersion'] : null;
  if (version === null || !(LOCAL_DRAFT_SCHEMA_VERSIONS as readonly string[]).includes(version)) return { outcome: 'refused', schemaVersion: version, why: 'unknown-schema-version', schemaFindings: 0 };
  const pinned = isRecord(doc) ? doc['pinnedRevision'] : undefined;
  if (typeof pinned !== 'string' || !COMMIT.test(pinned)) return { outcome: 'refused', schemaVersion: version, why: 'no-pinned-revision', schemaFindings: 0 };
  const rules = draftRules(pinned, NO_QUESTION_LIMIT);
  const earlier = rules.earlier?.(doc);
  // Measure only valid shapes. The check command replaces faults on the hero with its own findings.
  const findings = checkDraftShape(earlier?.schema ?? rules.schema, doc).filter((error) =>
    error.path === '$.hero' || earlier === undefined || !earlier.reported.test(error.path)).length;
  if (findings > 0) return { outcome: 'refused', schemaVersion: version, why: 'schema', schemaFindings: findings };
  const fit = figureFit(doc, layout);
  const ledger = readingLedger(doc, fit, readerAdvice(doc));
  return {
    outcome: 'measured', schemaVersion: version,
    measured: { figuresExamined: fit.examined, draft: ledger.draft, pages: ledger.pages.map(({ units: _units, ...numbers }) => numbers) },
  };
}

// --- The record -----------------------------------------------------------------------------------------------------------------

export interface DraftRow {
  readonly run: string;
  readonly revision: number;
  /** Null where the file could not be read; then `readError` names why and the result is refused, `unreadable`. */
  readonly sha256: string | null;
  readonly bytes: number | null;
  readonly readError?: string;
  readonly result: DraftMeasure;
}
export interface Totals extends LedgerNumbers { readonly unplacedUnits: number; readonly figuresExamined: number }
export interface RerenderRecord {
  readonly format: typeof RERENDER_RECORD_FORMAT;
  readonly measuredAt: string;
  readonly syzygy: { readonly commit: string; readonly trackedChanges: number };
  readonly subject: {
    readonly what: string;
    readonly populationSha256: string;
    readonly population: string;
    readonly runsListed: number;
    readonly runsWithoutDrafts: number;
    readonly unlistable: readonly { readonly run: string; readonly why: string }[];
    readonly otherDraftFiles: number;
  };
  readonly instrument: {
    /** SHA-256 over the script and the built modules it reaches (`moduleGraphDigest`): which code measured. */
    readonly sha256: string;
    readonly files: number;
    readonly externals: readonly string[];
    readonly ledgerFormat: string;
    readonly wordsPerMinute: number;
    readonly figureLayout: string;
    readonly figureTextPx: number;
    readonly figureMinTextPx: number;
    readonly viewports: readonly { readonly viewportPx: number; readonly columnPx: number }[];
    readonly schemaVersions: readonly string[];
    readonly questionLimit: string;
    readonly notRendered: string;
  };
  readonly counts: { readonly found: number; readonly measured: number; readonly refused: number; readonly refusedBy: Readonly<Record<RefusalWhy, number>> };
  readonly totals: Totals;
  readonly drafts: readonly DraftRow[];
}

const zeroAdvisories = (): Record<string, number> => Object.fromEntries(LEDGER_STANDARDS.map((standard) => [standard, 0]));
const zeroTotals = (): { proseWords: number; readingMinutes: number; figures: number; advisories: Record<string, number>; figureFit: { notFittingAt1440: number; notFittingAt390: number; unknown: number }; unplacedUnits: number; figuresExamined: number } => ({
  proseWords: 0, readingMinutes: 0, figures: 0, advisories: zeroAdvisories(), figureFit: { notFittingAt1440: 0, notFittingAt390: 0, unknown: 0 }, unplacedUnits: 0, figuresExamined: 0,
});

/** The digest the record names its subject by: SHA-256 over one line per draft, `<run>/drafts/rev-<n>.json <sha256>\n` (`unreadable` in
 * place of a digest that could not be taken), in the record's order. */
export const populationDigest = (rows: readonly Pick<DraftRow, 'run' | 'revision' | 'sha256'>[]): string => sha256(rows.map((row) => `${row.run}/drafts/rev-${row.revision}.json ${row.sha256 ?? 'unreadable'}\n`).join(''));

export interface RecordInputs {
  readonly measuredAt: string;
  readonly syzygy: { readonly commit: string; readonly trackedChanges: number };
  readonly population: string;
  readonly figureLayout: string;
  readonly listing: DraftListing;
  readonly layout: FigureLayout | undefined;
  readonly instrument: InstrumentDigest;
}

/** The record of one measurement over a listing. Its counts sum: found = measured + refused. */
export function buildRecord(inputs: RecordInputs): RerenderRecord {
  const drafts: DraftRow[] = inputs.listing.drafts.map((draft) => (draft.bytes === null
    ? { run: draft.run, revision: draft.revision, sha256: null, bytes: null, readError: draft.readError, result: { outcome: 'refused', schemaVersion: null, why: 'unreadable', schemaFindings: 0 } }
    : { run: draft.run, revision: draft.revision, sha256: sha256(draft.bytes), bytes: draft.bytes.byteLength, result: measureDraft(draft.bytes, inputs.layout) }));
  const refusedBy = Object.fromEntries(REFUSAL_REASONS.map((why) => [why, 0])) as Record<RefusalWhy, number>;
  const totals = zeroTotals();
  let measured = 0;
  for (const row of drafts) {
    if (row.result.outcome === 'refused') { refusedBy[row.result.why] += 1; continue; }
    measured += 1;
    addInto(totals, { ...row.result.measured.draft, figuresExamined: row.result.measured.figuresExamined }, 1);
  }
  return {
    format: RERENDER_RECORD_FORMAT,
    measuredAt: inputs.measuredAt,
    syzygy: inputs.syzygy,
    subject: {
      what: 'every frozen draft revision (drafts/rev-<n>.json) of every run directory in the dossier state root',
      populationSha256: populationDigest(drafts),
      population: inputs.population,
      runsListed: inputs.listing.runsListed,
      runsWithoutDrafts: inputs.listing.runsWithoutDrafts,
      unlistable: inputs.listing.unlistable,
      otherDraftFiles: inputs.listing.otherDraftFiles,
    },
    instrument: {
      sha256: inputs.instrument.sha256,
      files: inputs.instrument.files.length,
      externals: inputs.instrument.externals,
      ledgerFormat: READING_LEDGER_FORMAT,
      wordsPerMinute: WORDS_PER_MINUTE,
      figureLayout: inputs.figureLayout,
      figureTextPx: FIGURE_TEXT_PX,
      figureMinTextPx: FIGURE_MIN_TEXT_PX,
      viewports: FIGURE_VIEWPORTS,
      schemaVersions: LOCAL_DRAFT_SCHEMA_VERSIONS,
      questionLimit: 'none: the run record holds the declared limit, and this instrument reads no run record',
      notRendered: 'no page HTML is rendered: a page needs the quoted sources, which come from the clone, and this instrument reads no repository. Each figure is laid out and drawn by the site renderer\'s own figure path; the ledger and figure fit are what check computes from the draft with that layout',
    },
    counts: { found: drafts.length, measured, refused: drafts.length - measured, refusedBy },
    totals: totals as Totals,
    drafts,
  };
}

type Mutable = ReturnType<typeof zeroTotals>;
function addInto(into: Mutable, value: LedgerNumbers & { readonly unplacedUnits: number; readonly figuresExamined: number }, sign: 1 | -1): void {
  into.proseWords += sign * value.proseWords;
  into.readingMinutes += sign * value.readingMinutes;
  into.figures += sign * value.figures;
  for (const standard of LEDGER_STANDARDS) into.advisories[standard] = (into.advisories[standard] ?? 0) + sign * value.advisories[standard];
  into.figureFit.notFittingAt1440 += sign * value.figureFit.notFittingAt1440;
  into.figureFit.notFittingAt390 += sign * value.figureFit.notFittingAt390;
  into.figureFit.unknown += sign * value.figureFit.unknown;
  into.unplacedUnits += sign * value.unplacedUnits;
  into.figuresExamined += sign * value.figuresExamined;
}

// --- Reading a record back ------------------------------------------------------------------------------------------------------

/** The ledger a measured row keeps, as a reading ledger (pages with no units), or undefined where it is not of that form. */
function ledgerOf(measured: unknown): ReadingLedger | undefined {
  if (!isRecord(measured) || !Array.isArray(measured['pages'])) return undefined;
  return storedLedger({ format: READING_LEDGER_FORMAT, wordsPerMinute: WORDS_PER_MINUTE, pages: measured['pages'].map((page) => (isRecord(page) ? { ...page, units: [] } : page)), draft: measured['draft'] });
}
const count = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

interface Row {
  readonly key: string;
  readonly sha256: string | null;
  readonly outcome: 'measured' | 'refused';
  readonly why?: string;
  readonly ledger?: ReadingLedger;
  readonly figuresExamined?: number;
}
interface ReadRecord { readonly commit: string; readonly instrumentSha256: string; readonly populationSha256: string; readonly rows: ReadonlyMap<string, Row>; readonly order: readonly string[] }

/** A record read back for comparison; throws, naming what is wrong, where it is not a record of this format. */
function readRecord(value: unknown, name: string): ReadRecord {
  const fail = (why: string): never => { throw new Error(`the ${name} record ${why}`); };
  if (!isRecord(value) || value['format'] !== RERENDER_RECORD_FORMAT) return fail(`is not of format ${RERENDER_RECORD_FORMAT}`);
  const syzygy = value['syzygy'], subject = value['subject'], instrument = value['instrument'];
  if (!isRecord(syzygy) || typeof syzygy['commit'] !== 'string' || !isRecord(instrument) || typeof instrument['sha256'] !== 'string'
    || !isRecord(subject) || typeof subject['populationSha256'] !== 'string' || !Array.isArray(value['drafts'])) return fail('lacks its commit, instrument digest, subject digest or drafts');
  const rows = new Map<string, Row>();
  const order: string[] = [];
  for (const draft of value['drafts']) {
    if (!isRecord(draft) || typeof draft['run'] !== 'string' || !count(draft['revision']) || !(typeof draft['sha256'] === 'string' || draft['sha256'] === null) || !isRecord(draft['result'])) return fail('has a draft row of the wrong form');
    const key = `${draft['run']}/rev-${draft['revision']}`;
    if (rows.has(key)) return fail(`names ${key} twice`);
    const result = draft['result'];
    const digest = draft['sha256'] as string | null;
    if (result['outcome'] === 'refused') {
      if (typeof result['why'] !== 'string') return fail(`has a refused row for ${key} that names no reason`);
      rows.set(key, { key, sha256: digest, outcome: 'refused', why: result['why'] });
    } else if (result['outcome'] === 'measured' && digest !== null) {
      const ledger = ledgerOf(result['measured']);
      const examined = isRecord(result['measured']) ? result['measured']['figuresExamined'] : undefined;
      if (ledger === undefined || !count(examined)) return fail(`has a measured row for ${key} whose numbers are not of the ledger's form`);
      rows.set(key, { key, sha256: digest, outcome: 'measured', ledger, figuresExamined: examined });
    } else return fail(`has a row for ${key} with no outcome`);
    order.push(key);
  }
  return { commit: syzygy['commit'], instrumentSha256: instrument['sha256'], populationSha256: subject['populationSha256'], rows, order };
}

// --- The comparison -------------------------------------------------------------------------------------------------------------

export type DraftChange = 'unchanged' | 'changed' | 'added' | 'removed' | 'bytes-changed' | 'now-refused' | 'now-measured' | 'refused-both' | 'refusal-changed';
export const DRAFT_CHANGES: readonly DraftChange[] = ['unchanged', 'changed', 'added', 'removed', 'bytes-changed', 'now-refused', 'now-measured', 'refused-both', 'refusal-changed'];
export interface DraftDelta {
  readonly proseWords: number;
  readonly readingMinutes: number;
  readonly figures: number;
  readonly advisories: AdvisoryCounts;
  readonly figureFit: FigureFitCounts;
  readonly unplacedUnits: number;
  readonly figuresExamined: number;
}
export interface DraftComparison {
  readonly draft: string;
  readonly change: DraftChange;
  readonly delta?: DraftDelta;
  /** The pages whose numbers moved, were added or were removed. */
  readonly pages?: readonly { readonly page: string; readonly change: Exclude<PageChange, 'unchanged'> }[];
  /** The refusal reason on each side that refused: `before` and `after` where both did, else the one side's. */
  readonly refusal?: { readonly before?: string; readonly after?: string };
}
export interface RerenderComparison {
  readonly format: typeof RERENDER_COMPARISON_FORMAT;
  readonly baseline: { readonly commit: string; readonly instrumentSha256: string; readonly populationSha256: string };
  readonly current: { readonly commit: string; readonly instrumentSha256: string; readonly populationSha256: string };
  /** Whether the same code measured both: at one commit an altered build differs here, and a moved number is then the build's. */
  readonly sameInstrument: boolean;
  readonly samePopulation: boolean;
  readonly counts: Readonly<Record<DraftChange, number>>;
  /** Summed over the drafts measured in both records with the same bytes (`unchanged` and `changed`). */
  readonly totalsDelta: DraftDelta;
  /** Every draft whose state is not `unchanged`, in the current record's order, then the baseline's removed drafts. */
  readonly moved: readonly DraftComparison[];
}

/** Two records compared draft by draft, by run identity and revision. Pure. A draft whose bytes differ is `bytes-changed` and its
 * numbers are not compared: the measurement is of the renderer, so a draft must be the same bytes on both sides. */
export function compareRecords(baselineValue: unknown, currentValue: unknown): RerenderComparison {
  const baseline = readRecord(baselineValue, 'baseline'), current = readRecord(currentValue, 'current');
  const counts = Object.fromEntries(DRAFT_CHANGES.map((change) => [change, 0])) as Record<DraftChange, number>;
  const totals = zeroTotals();
  const moved: DraftComparison[] = [];
  const note = (entry: DraftComparison): void => { counts[entry.change] += 1; if (entry.change !== 'unchanged') moved.push(entry); };
  for (const key of current.order) {
    const after = current.rows.get(key)!, before = baseline.rows.get(key);
    if (before === undefined) { note({ draft: key, change: 'added' }); continue; }
    if (before.sha256 !== after.sha256) { note({ draft: key, change: 'bytes-changed' }); continue; }
    if (before.outcome === 'refused' && after.outcome === 'refused') {
      note({ draft: key, change: before.why === after.why ? 'refused-both' : 'refusal-changed', refusal: { before: before.why!, after: after.why! } });
      continue;
    }
    if (before.outcome === 'refused') { note({ draft: key, change: 'now-measured', refusal: { before: before.why! } }); continue; }
    if (after.outcome === 'refused') { note({ draft: key, change: 'now-refused', refusal: { after: after.why! } }); continue; }
    const compared = compareLedgers(before.ledger!, after.ledger!);
    const d = compared.draft.delta;
    const delta: DraftDelta = { ...d, figuresExamined: after.figuresExamined! - before.figuresExamined! };
    addInto(totals, delta, 1);
    const pages = compared.pages.flatMap((page) => (page.change === 'unchanged' ? [] : [{ page: page.page, change: page.change }]));
    const still = pages.length === 0 && delta.figuresExamined === 0 && delta.unplacedUnits === 0 && delta.proseWords === 0 && delta.readingMinutes === 0 && delta.figures === 0
      && LEDGER_STANDARDS.every((standard) => delta.advisories[standard] === 0) && delta.figureFit.notFittingAt1440 === 0 && delta.figureFit.notFittingAt390 === 0 && delta.figureFit.unknown === 0;
    note(still ? { draft: key, change: 'unchanged' } : { draft: key, change: 'changed', delta, pages });
  }
  for (const key of baseline.order) if (!current.rows.has(key)) note({ draft: key, change: 'removed' });
  const summary = (record: ReadRecord) => ({ commit: record.commit, instrumentSha256: record.instrumentSha256, populationSha256: record.populationSha256 });
  return {
    format: RERENDER_COMPARISON_FORMAT,
    baseline: summary(baseline),
    current: summary(current),
    sameInstrument: baseline.instrumentSha256 === current.instrumentSha256,
    samePopulation: baseline.populationSha256 === current.populationSha256,
    counts,
    totalsDelta: totals as DraftDelta,
    moved,
  };
}

// --- The instrument and the output path -----------------------------------------------------------------------------------------

export interface InstrumentDigest { readonly sha256: string; readonly files: readonly string[]; readonly externals: readonly string[] }
/** Resolves a bare specifier imported by `from` to a file, or null for a module outside the tree (a `node:` builtin or a dependency). */
export type BareResolver = (specifier: string, from: string) => string | null;

const IMPORT_FROM = /(?:^|[;\n}])\s*(?:import|export)\b[^'"`;]*?\bfrom\s*['"]([^'"\n]+)['"]/gu;
const IMPORT_BARE = /(?:^|[;\n])\s*import\s*['"]([^'"\n]+)['"]/gu;
const IMPORT_CALL = /\bimport\(\s*['"]([^'"\n]+)['"]\s*\)/gu;
/** What a module specifier may be spelled with; a match of another form is prose that reads like an import, and is passed over. */
const SPECIFIER = /^[A-Za-z0-9@._/:-]+$/u;

/** SHA-256 over the module graph the entry files reach: one line `<path relative to root> <sha256>\n` per file, sorted by path. Static
 * `import`/`export … from`, bare `import '…'` and `import('…')` with a literal are followed; a relative specifier resolves beside its
 * importer, a bare one through `resolveBare`, and one it leaves unresolved is listed by name in `externals` (and digested by name). */
export function moduleGraphDigest(root: string, entries: readonly string[], resolveBare: BareResolver): InstrumentDigest {
  const seen = new Map<string, string>();
  const externals = new Set<string>();
  const queue = entries.map((entry) => path.resolve(entry));
  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    const bytes = fs.readFileSync(file);
    seen.set(file, sha256(bytes));
    const text = bytes.toString('utf8');
    for (const pattern of [IMPORT_FROM, IMPORT_BARE, IMPORT_CALL]) {
      for (const match of text.matchAll(pattern)) {
        const specifier = match[1]!;
        if (!SPECIFIER.test(specifier)) continue;
        const target = specifier.startsWith('.') ? path.resolve(path.dirname(file), specifier) : resolveBare(specifier, file);
        if (target === null) externals.add(specifier);
        else queue.push(target);
      }
    }
  }
  const files = [...seen.keys()].map((file) => path.relative(root, file)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const byRelative = new Map([...seen].map(([file, digest]) => [path.relative(root, file), digest]));
  const sorted = [...externals].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const lines = [...files.map((file) => `${file} ${byRelative.get(file)!}\n`), ...sorted.map((name) => `external ${name}\n`)];
  return { sha256: sha256(lines.join('')), files, externals: sorted };
}

/** Whether `target` lies outside `root`, both taken through their real paths (a target that does not exist yet through its directory's
 * real path), so neither a link nor a `..` segment hides that it is inside. A target equal to the root is inside. */
export function outsideOf(root: string, target: string): boolean {
  const realRoot = fs.realpathSync(root);
  const resolved = path.resolve(target);
  let realTarget: string;
  try { realTarget = fs.realpathSync(resolved); } catch { realTarget = path.join(fs.realpathSync(path.dirname(resolved)), path.basename(resolved)); }
  const relative = path.relative(realRoot, realTarget);
  return relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative);
}
