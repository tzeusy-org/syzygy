// PWB-REQ-002 — the nine item classes' literal extraction grammar.
//
// One function per class, each implementing the spec's "Reader definitions"
// exactly over a classified source body. The parsers are small, inert and
// line-based: ATX headings, top-level list items, pipe tables, a leading
// bold or code span, a Markdown link, and one `[butler].name` TOML key.
// They never produce HTML, never resolve links, never follow anything.
//
// Identity is `(item class, declared key)`; the repository-relative path and
// line are anchor state. Keys and statements are NFC-normalized; line-wrapped
// label whitespace is collapsed to one semantic space. There is no case
// folding, stemming or punctuation rewriting.
//
// Any grammar failure — a missing heading, a malformed row/list/TOML, a
// duplicate key within the source, an ambiguous leading label — makes the
// whole source's item denominator Unknown. A source never yields a partial
// item set.
//
// The root index (PWB-REQ-004 as amended by the 2026-09-05
// truth-and-readiness amendment; registry `observationGrammar.rootSummary`
// and `observationGrammar.precedence`) mints no item. Its own grammar, at
// the end of this file, emits exactly two stated count declarations and the
// seven-row layer precedence table, or nothing.

import { posixBasename } from './git-tree.js';
import { isFencedAt, recognizeCodeContexts } from './markdown-code-context.js';
import { EXTRACTION_CLASSES, type ExtractionClass, type ManifestSource, type SourceRule } from './project-shape-manifest.js';
import type { ResourceLimitBreach } from './project-shape-observation.js';
import { ParsePassBudgetExceeded, type ParsePassCharge, type ParsePassIdentity } from './resource-ledger.js';

// ---------------------------------------------------------------------
// Vocabulary.

export const EXTRACTION_FAILURES = [
  'unsupported-source',
  'missing-heading',
  'malformed-list',
  'malformed-row',
  'malformed-toml',
  'duplicate-key',
  'ambiguous-leading-label',
] as const;
export type ExtractionFailure = (typeof EXTRACTION_FAILURES)[number];

// The six aggregate keys `project-account-section` mints, and the file that
// mints each.
export const PROJECT_ACCOUNT_KEYS = ['purpose', 'promises', 'refusals', 'architecture', 'v1-scope', 'v1-success'] as const;
export type ProjectAccountKey = (typeof PROJECT_ACCOUNT_KEYS)[number];

export const VISION_HEADINGS = {
  purpose: 'What Butlers Is',
  promises: 'What Success Looks Like',
  refusals: 'What Butlers Is Not',
  principles: 'Non-Negotiable Rules',
} as const;
export const V1_HEADINGS = { ships: 'What v1 Ships', defers: 'What v1 Defers', success: 'Success Criteria' } as const;
export const CATALOG_HEADINGS = [
  'Core Infrastructure',
  'Staffers',
  'Butlers',
  'Modules',
  'Connectors',
  'Dashboard',
  'Identity System',
  'Situational Awareness',
  'Observability',
] as const;
export const DESIGN_CONTRACT_HEADING = 'Index';
export const CRAFT_POLICY_HEADING = 'Reading Order';
export const CRAFT_POLICY_FILE_COLUMN = 'File';

export interface ExtractedItem {
  readonly class: ExtractionClass;
  readonly key: string;
  // Anchor state, never identity.
  readonly path: string;
  readonly line: number;
  // The declared statement (a section's body, a list item's own text), NFC.
  readonly statement?: string;
  // Literal context the grammar names: the catalog H3, the topology H2
  // ordinal, the roster `[butler].name`.
  readonly context?: string;
}

export interface ExtractionFailureRecord {
  readonly reason: ExtractionFailure;
  readonly class: ExtractionClass;
  readonly line?: number;
  // A heading or key the grammar expected or found twice — grammar words,
  // never body prose beyond the key itself.
  readonly detail?: string;
}

// One literal V1 catalog heading and the line it sits on: the anchor of the
// derived `catalog-count:<catalog-key>` declaration.
export interface CatalogHeading {
  readonly key: (typeof CATALOG_HEADINGS)[number];
  readonly line: number;
}

export type ClassExtraction =
  | { readonly kind: 'items'; readonly class: ExtractionClass; readonly items: readonly ExtractedItem[]; readonly catalogHeadings?: readonly CatalogHeading[] }
  | { readonly kind: 'failed'; readonly failure: ExtractionFailureRecord };

export type SourceExtraction =
  | {
      readonly kind: 'extracted';
      readonly path: string;
      readonly classes: readonly ExtractionClass[];
      readonly items: readonly ExtractedItem[];
      // Per class, the number of items this source declares (D).
      readonly denominators: Readonly<Partial<Record<ExtractionClass, number>>>;
      // Present only when `catalog-entry` was extracted: the nine literal
      // catalog headings, each the anchor of one derived catalog count.
      readonly catalogHeadings?: readonly CatalogHeading[];
      // Present only for the root index: its stated counts and precedence
      // table under the registry grammar.
      readonly rootIndex?: RootIndexExtraction;
    }
  | {
      readonly kind: 'unknown';
      readonly path: string;
      readonly classes: readonly ExtractionClass[];
      readonly failure: ExtractionFailureRecord;
    }
  | {
      // The source's parse-pass budget ran out before `pass` ran: not a
      // grammar failure, a registry resource breach. `class` names the
      // extraction class that never ran; the root-index pass has none.
      readonly kind: 'over-limit';
      readonly path: string;
      readonly classes: readonly ExtractionClass[];
      readonly pass: ParsePassIdentity;
      readonly class?: ExtractionClass;
      readonly breach: ResourceLimitBreach;
    };

// ---------------------------------------------------------------------
// Inert line parsing.

const nfc = (s: string): string => s.normalize('NFC');

interface Doc {
  readonly lines: readonly string[];
  // true for lines inside a fenced code block (fence lines included).
  readonly fenced: readonly boolean[];
  readonly headings: readonly Heading[];
}

interface Heading {
  readonly level: number;
  readonly text: string;
  // 0-based index into `lines`.
  readonly index: number;
}

const ATX = /^(#{1,6})[ \t]+(.*?)[ \t]*(?:[ \t]#+[ \t]*)?$/;
// Which lines sit inside a fence is the PWB-REQ-006 profile's rule (`recognizeCodeContexts`), not a rule of this module (syzygy-bpyt.55).
// The line model stays this module's: the text splits at LF and one trailing CR is dropped, and a line is fenced when the profile
// marks its first character fenced. In a text with bare CRs a fence that opens inside an LF line therefore reaches the lines after it.
function parseDoc(text: string): Doc {
  const recognition = recognizeCodeContexts(text);
  const lines: string[] = [];
  const fenced: boolean[] = [];
  const headings: Heading[] = [];
  let offset = 0;
  for (const raw of text.split('\n')) {
    const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
    const index = lines.length;
    lines.push(line);
    const inside = isFencedAt(recognition, offset);
    offset += raw.length + 1;
    fenced.push(inside);
    if (inside) continue;
    const h = ATX.exec(line);
    if (h) headings.push({ level: (h[1] as string).length, text: nfc((h[2] as string).trim()), index });
  }
  return { lines, fenced, headings };
}

interface Range {
  readonly start: number; // first body line (0-based), exclusive of the heading
  readonly end: number; // exclusive
}

// The body of a heading: the lines after it up to the next heading whose
// level is at or above it.
function sectionOf(doc: Doc, heading: Heading): Range {
  const next = doc.headings.find((h) => h.index > heading.index && h.level <= heading.level);
  return { start: heading.index + 1, end: next === undefined ? doc.lines.length : next.index };
}

function headingsOf(doc: Doc, level: number, text: string): readonly Heading[] {
  return doc.headings.filter((h) => h.level === level && h.text === nfc(text));
}

function bodyText(doc: Doc, range: Range): string {
  return nfc(
    doc.lines
      .slice(range.start, range.end)
      .join('\n')
      .trim(),
  );
}

interface ListItem {
  readonly ordered: boolean;
  readonly text: string; // NFC, the complete inert item including continuations
  readonly line: number; // 1-based
}

const ORDERED_ITEM = /^(\d+)[.)][ \t]+(.*)$/;
const UNORDERED_ITEM = /^[-*+][ \t]+(.*)$/;

// Top-level list items in a range. The item patterns are anchored at column
// 0, so indented continuations and nested lists mint nothing of their own.
// Indented continuation lines remain part of the declaration instead of
// truncating a wrapped project statement to its marker line.
function topLevelListItems(doc: Doc, range: Range): readonly ListItem[] {
  const items: ListItem[] = [];
  for (let i = range.start; i < range.end; i += 1) {
    if (doc.fenced[i]) continue;
    const line = doc.lines[i] as string;
    const ordered = ORDERED_ITEM.exec(line);
    if (ordered) {
      const continuation: string[] = [];
      let cursor = i + 1;
      while (cursor < range.end && !doc.fenced[cursor]) {
        const next = doc.lines[cursor] as string;
        if (ORDERED_ITEM.test(next) || UNORDERED_ITEM.test(next)) break;
        if (next.trim() === '' || /^[ \t]+\S/.test(next)) {
          continuation.push(next.trim());
          cursor += 1;
          continue;
        }
        break;
      }
      items.push({ ordered: true, text: nfc([(ordered[2] as string).trim(), ...continuation].join('\n').trim()), line: i + 1 });
      i = cursor - 1;
      continue;
    }
    const unordered = UNORDERED_ITEM.exec(line);
    if (unordered) {
      const continuation: string[] = [];
      let cursor = i + 1;
      while (cursor < range.end && !doc.fenced[cursor]) {
        const next = doc.lines[cursor] as string;
        if (ORDERED_ITEM.test(next) || UNORDERED_ITEM.test(next)) break;
        if (next.trim() === '' || /^[ \t]+\S/.test(next)) {
          continuation.push(next.trim());
          cursor += 1;
          continue;
        }
        break;
      }
      items.push({ ordered: false, text: nfc([(unordered[1] as string).trim(), ...continuation].join('\n').trim()), line: i + 1 });
      i = cursor - 1;
    }
  }
  return items;
}

interface Table {
  readonly header: readonly string[];
  readonly rows: readonly { readonly cells: readonly string[]; readonly line: number }[];
  readonly line: number; // 1-based header line
  readonly malformedRowLine?: number;
}

const DELIMITER_ROW = /^\|?[ \t]*:?-+:?[ \t]*(\|[ \t]*:?-+:?[ \t]*)*\|?$/;

function splitCells(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i] as string;
    if (ch === '\\' && line[i + 1] === '|') {
      current += '|';
      i += 1;
    } else if (ch === '|') {
      cells.push(current);
      current = '';
    } else current += ch;
  }
  cells.push(current);
  if (line.trimStart().startsWith('|')) cells.shift();
  if (line.trimEnd().endsWith('|') && !line.trimEnd().endsWith('\\|')) cells.pop();
  return cells.map((c) => nfc(c.trim()));
}

// Pipe tables in a range: a header row, a delimiter row, then body rows
// until the first non-table line. A body row whose cell count differs from
// the header's marks the table malformed.
function tablesOf(doc: Doc, range: Range): readonly Table[] {
  const tables: Table[] = [];
  let i = range.start;
  while (i < range.end) {
    const line = doc.lines[i] as string;
    const next = doc.lines[i + 1];
    if (!doc.fenced[i] && line.trimStart().startsWith('|') && i + 1 < range.end && next !== undefined && DELIMITER_ROW.test(next.trim())) {
      const header = splitCells(line);
      const rows: { cells: string[]; line: number }[] = [];
      let malformedRowLine: number | undefined;
      let j = i + 2;
      while (j < range.end && !doc.fenced[j] && (doc.lines[j] as string).trimStart().startsWith('|')) {
        const cells = splitCells(doc.lines[j] as string);
        if (cells.length !== header.length && malformedRowLine === undefined) malformedRowLine = j + 1;
        rows.push({ cells, line: j + 1 });
        j += 1;
      }
      tables.push(malformedRowLine === undefined ? { header, rows, line: i + 1 } : { header, rows, line: i + 1, malformedRowLine });
      i = j;
      continue;
    }
    i += 1;
  }
  return tables;
}

const LEADING_BOLD = /^(?:\*\*([\s\S]+?)\*\*|__([\s\S]+?)__)/;
const LEADING_CODE = /^`([^`\n]+?)`/;
const LINK = /^\[([^\]]*)\]\(([^)\s]*)(?:[ \t]+"[^"]*")?\)$/;
const DASH_AFTER_LABEL = /^\s*[-–—]/;
const declarationKey = (value: string): string => nfc(value.trim().replace(/\s+/g, ' '));

// ---------------------------------------------------------------------
// Failure helpers.

function failed(reason: ExtractionFailure, cls: ExtractionClass, line?: number, detail?: string): ClassExtraction {
  return {
    kind: 'failed',
    failure: { reason, class: cls, ...(line === undefined ? {} : { line }), ...(detail === undefined ? {} : { detail }) },
  };
}

function items(cls: ExtractionClass, list: readonly ExtractedItem[]): ClassExtraction {
  const seen = new Set<string>();
  for (const item of list) {
    if (seen.has(item.key)) return failed('duplicate-key', cls, item.line, item.key);
    seen.add(item.key);
  }
  return { kind: 'items', class: cls, items: list };
}

function oneHeading(doc: Doc, level: number, text: string, cls: ExtractionClass): Heading | ClassExtraction {
  const found = headingsOf(doc, level, text);
  if (found.length === 0) return failed('missing-heading', cls, undefined, text);
  if (found.length > 1) return failed('duplicate-key', cls, (found[1] as Heading).index + 1, text);
  return found[0] as Heading;
}

const isFailure = (v: Heading | ClassExtraction): v is ClassExtraction => 'kind' in v;

// ---------------------------------------------------------------------
// The nine classes.

export function extractProjectAccountSections(path: string, doc: Doc): ClassExtraction {
  const cls: ExtractionClass = 'project-account-section';
  const base = posixBasename(path);
  const out: ExtractedItem[] = [];
  const section = (key: ProjectAccountKey, headingText: string): ClassExtraction | undefined => {
    const h = oneHeading(doc, 2, headingText, cls);
    if (isFailure(h)) return h;
    out.push({ class: cls, key, path, line: h.index + 1, statement: bodyText(doc, sectionOf(doc, h)) });
    return undefined;
  };
  if (base === 'vision.md') {
    for (const [key, text] of [
      ['purpose', VISION_HEADINGS.purpose],
      ['promises', VISION_HEADINGS.promises],
      ['refusals', VISION_HEADINGS.refusals],
    ] as const) {
      const failure = section(key, text);
      if (failure !== undefined) return failure;
    }
    return items(cls, out);
  }
  if (base === 'architecture.md') {
    const h2s = doc.headings.filter((h) => h.level === 2);
    if (h2s.length === 0) return failed('missing-heading', cls, undefined, 'any H2');
    const statement = h2s.map((h) => `${h.text}\n\n${bodyText(doc, sectionOf(doc, h))}`.trim()).join('\n\n');
    return items(cls, [{ class: cls, key: 'architecture', path, line: (h2s[0] as Heading).index + 1, statement }]);
  }
  if (base === 'v1.md') {
    const ships = oneHeading(doc, 2, V1_HEADINGS.ships, cls);
    if (isFailure(ships)) return ships;
    const defers = oneHeading(doc, 2, V1_HEADINGS.defers, cls);
    if (isFailure(defers)) return defers;
    out.push({
      class: cls,
      key: 'v1-scope',
      path,
      line: ships.index + 1,
      statement: `${V1_HEADINGS.ships}\n\n${bodyText(doc, sectionOf(doc, ships))}\n\n${V1_HEADINGS.defers}\n\n${bodyText(doc, sectionOf(doc, defers))}`.trim(),
    });
    const failure = section('v1-success', V1_HEADINGS.success);
    if (failure !== undefined) return failure;
    return items(cls, out);
  }
  return failed('unsupported-source', cls, undefined, base);
}

export function extractPrinciples(path: string, doc: Doc): ClassExtraction {
  const cls: ExtractionClass = 'principle';
  if (posixBasename(path) !== 'vision.md') return failed('unsupported-source', cls, undefined, posixBasename(path));
  const h = oneHeading(doc, 2, VISION_HEADINGS.principles, cls);
  if (isFailure(h)) return h;
  const list = topLevelListItems(doc, sectionOf(doc, h));
  if (list.length === 0) return failed('malformed-list', cls, h.index + 1, 'no top-level decimal list');
  const out: ExtractedItem[] = [];
  for (const item of list) {
    if (!item.ordered) return failed('malformed-list', cls, item.line, 'not a decimal-list item');
    const bold = LEADING_BOLD.exec(item.text);
    const key = bold?.[1] ?? bold?.[2];
    if (key === undefined || key.trim().length === 0) return failed('ambiguous-leading-label', cls, item.line);
    out.push({ class: cls, key: declarationKey(key), path, line: item.line, statement: item.text });
  }
  return items(cls, out);
}

export function extractSuccessCriteria(path: string, doc: Doc): ClassExtraction {
  const cls: ExtractionClass = 'success-criterion';
  const base = posixBasename(path);
  const prefix = base === 'vision.md' ? 'vision' : base === 'v1.md' ? 'v1' : undefined;
  if (prefix === undefined) return failed('unsupported-source', cls, undefined, base);
  const h = oneHeading(doc, 2, prefix === 'vision' ? VISION_HEADINGS.promises : V1_HEADINGS.success, cls);
  if (isFailure(h)) return h;
  const list = topLevelListItems(doc, sectionOf(doc, h));
  if (list.length === 0) return failed('malformed-list', cls, h.index + 1, 'no top-level list');
  return items(
    cls,
    list.map((item, i) => ({ class: cls, key: `${prefix}:${i + 1}`, path, line: item.line, statement: item.text })),
  );
}

export function extractCatalogEntries(path: string, doc: Doc): ClassExtraction {
  const cls: ExtractionClass = 'catalog-entry';
  if (posixBasename(path) !== 'v1.md') return failed('unsupported-source', cls, undefined, posixBasename(path));
  const out: ExtractedItem[] = [];
  const catalogHeadings: CatalogHeading[] = [];
  for (const headingText of CATALOG_HEADINGS) {
    const h = oneHeading(doc, 3, headingText, cls);
    if (isFailure(h)) return h;
    catalogHeadings.push({ key: headingText, line: h.index + 1 });
    for (const item of topLevelListItems(doc, sectionOf(doc, h))) {
      if (item.ordered) return failed('malformed-list', cls, item.line, 'not an unordered-list item');
      const bold = LEADING_BOLD.exec(item.text);
      const code = LEADING_CODE.exec(item.text);
      const match = bold ?? code;
      const label = bold ? (bold[1] ?? bold[2]) : code?.[1];
      if (match === null || match === undefined || label === undefined || label.trim().length === 0) return failed('ambiguous-leading-label', cls, item.line);
      if (!DASH_AFTER_LABEL.test(item.text.slice(match[0].length))) return failed('ambiguous-leading-label', cls, item.line);
      out.push({ class: cls, key: declarationKey(label), path, line: item.line, statement: item.text, context: headingText });
    }
  }
  const result = items(cls, out);
  return result.kind === 'items' ? { ...result, catalogHeadings } : result;
}

function headedTable(doc: Doc, headingText: string, cls: ExtractionClass): Table | ClassExtraction {
  const found = doc.headings.filter((h) => h.text === nfc(headingText));
  if (found.length === 0) return failed('missing-heading', cls, undefined, headingText);
  if (found.length > 1) return failed('duplicate-key', cls, (found[1] as Heading).index + 1, headingText);
  const heading = found[0] as Heading;
  const tables = tablesOf(doc, sectionOf(doc, heading));
  const table = tables[0];
  if (table === undefined) return failed('malformed-row', cls, heading.index + 1, 'no table');
  if (table.malformedRowLine !== undefined) return failed('malformed-row', cls, table.malformedRowLine, 'column count');
  return table;
}

const isTableFailure = (v: Table | ClassExtraction): v is ClassExtraction => 'kind' in v;

export function extractDesignContracts(path: string, doc: Doc): ClassExtraction {
  const cls: ExtractionClass = 'design-contract';
  if (posixBasename(path) !== 'README.md') return failed('unsupported-source', cls, undefined, posixBasename(path));
  const table = headedTable(doc, DESIGN_CONTRACT_HEADING, cls);
  if (isTableFailure(table)) return table;
  const out: ExtractedItem[] = [];
  for (const row of table.rows) {
    const link = LINK.exec(row.cells[0] ?? '');
    const text = link?.[1]?.trim();
    if (text === undefined || text.length === 0) return failed('malformed-row', cls, row.line, 'first column is not a link');
    out.push({ class: cls, key: nfc(text), path, line: row.line });
  }
  return items(cls, out);
}

const BASELINE_SPEC = /^openspec\/specs\/([^/]+)\/spec\.md$/;

export function extractBaselineSpec(path: string): ClassExtraction {
  const cls: ExtractionClass = 'baseline-spec';
  const m = BASELINE_SPEC.exec(path);
  if (!m) return failed('unsupported-source', cls, undefined, path);
  return items(cls, [{ class: cls, key: nfc(m[1] as string), path, line: 1 }]);
}

const ORDINAL_H2 = /^(\d+[a-z]?)(?![\w])/;

export function extractTopologyComponents(path: string, doc: Doc): ClassExtraction {
  const cls: ExtractionClass = 'topology-component';
  if (posixBasename(path) !== 'components.md') return failed('unsupported-source', cls, undefined, posixBasename(path));
  const ordinalH2s = doc.headings.filter((h) => h.level === 2 && ORDINAL_H2.test(h.text));
  if (ordinalH2s.length === 0) return failed('missing-heading', cls, undefined, 'H2 beginning with a decimal ordinal');
  const out: ExtractedItem[] = [];
  for (const h of ordinalH2s) {
    const ordinal = (ORDINAL_H2.exec(h.text) as RegExpExecArray)[1] as string;
    for (const table of tablesOf(doc, sectionOf(doc, h))) {
      if (table.malformedRowLine !== undefined) return failed('malformed-row', cls, table.malformedRowLine, 'column count');
      for (const row of table.rows) {
        const cell = row.cells[0] ?? '';
        const bold = LEADING_BOLD.exec(cell);
        const label = bold?.[1] ?? bold?.[2];
        if (bold === null || label === undefined || label.trim().length === 0 || bold[0].length !== cell.length) {
          return failed('malformed-row', cls, row.line, 'first column is not a bold label');
        }
        out.push({ class: cls, key: `${ordinal}:${nfc(label.trim())}`, path, line: row.line, context: ordinal });
      }
    }
  }
  return items(cls, out);
}

export function extractCraftPolicies(path: string, doc: Doc): ClassExtraction {
  const cls: ExtractionClass = 'craft-policy';
  if (posixBasename(path) !== 'README.md') return failed('unsupported-source', cls, undefined, posixBasename(path));
  const table = headedTable(doc, CRAFT_POLICY_HEADING, cls);
  if (isTableFailure(table)) return table;
  const column = table.header.indexOf(CRAFT_POLICY_FILE_COLUMN);
  if (column < 0) return failed('malformed-row', cls, table.line, `no ${CRAFT_POLICY_FILE_COLUMN} column`);
  const out: ExtractedItem[] = [];
  for (const row of table.rows) {
    const link = LINK.exec(row.cells[column] ?? '');
    const target = link?.[2]?.split('#')[0] ?? '';
    const base = posixBasename(target);
    if (target.length === 0 || base.length === 0) return failed('malformed-row', cls, row.line, `${CRAFT_POLICY_FILE_COLUMN} column is not a link`);
    out.push({ class: cls, key: nfc(base), path, line: row.line });
  }
  return items(cls, out);
}

const ROSTER_TOML = /^roster\/([^/]+)\/butler\.toml$/;
const TOML_TABLE = /^\[([^\]]+)\][ \t]*(?:#.*)?$/;
const TOML_NAME = /^name[ \t]*=[ \t]*(?:"((?:[^"\\]|\\.)*)"|'([^']*)')[ \t]*(?:#.*)?$/;

export function extractRosterIdentity(path: string, doc: Doc): ClassExtraction {
  const cls: ExtractionClass = 'roster-identity';
  const m = ROSTER_TOML.exec(path);
  if (!m) return failed('unsupported-source', cls, undefined, path);
  let inButler = false;
  let seenButler = 0;
  let name: string | undefined;
  let nameLine: number | undefined;
  for (let i = 0; i < doc.lines.length; i += 1) {
    const line = (doc.lines[i] as string).trim();
    if (line.length === 0 || line.startsWith('#')) continue;
    const table = TOML_TABLE.exec(line);
    if (table) {
      inButler = (table[1] as string).trim() === 'butler';
      if (inButler) seenButler += 1;
      continue;
    }
    if (!inButler) continue;
    const n = TOML_NAME.exec(line);
    if (n) {
      if (name !== undefined) return failed('malformed-toml', cls, i + 1, 'name repeated');
      name = nfc((n[1] ?? n[2] ?? '').trim());
      nameLine = i + 1;
    }
  }
  if (seenButler === 0) return failed('malformed-toml', cls, undefined, 'no [butler] table');
  if (seenButler > 1) return failed('malformed-toml', cls, undefined, '[butler] table repeated');
  if (name === undefined || name.length === 0) return failed('malformed-toml', cls, nameLine, '[butler].name empty or missing');
  return items(cls, [{ class: cls, key: nfc(m[1] as string), path, line: nameLine ?? 1, context: name }]);
}

// ---------------------------------------------------------------------
// Dispatch.

export function extractClass(cls: ExtractionClass, path: string, text: string): ClassExtraction {
  if (!(EXTRACTION_CLASSES as readonly string[]).includes(cls)) return failed('unsupported-source', cls, undefined, String(cls));
  const doc = parseDoc(text);
  switch (cls) {
    case 'project-account-section':
      return extractProjectAccountSections(path, doc);
    case 'principle':
      return extractPrinciples(path, doc);
    case 'success-criterion':
      return extractSuccessCriteria(path, doc);
    case 'catalog-entry':
      return extractCatalogEntries(path, doc);
    case 'design-contract':
      return extractDesignContracts(path, doc);
    case 'baseline-spec':
      return extractBaselineSpec(path);
    case 'topology-component':
      return extractTopologyComponents(path, doc);
    case 'craft-policy':
      return extractCraftPolicies(path, doc);
    case 'roster-identity':
      return extractRosterIdentity(path, doc);
  }
}

// Extracts every class the manifest assigned to one classified source. Any
// class failing makes the whole source Unknown: no partial item set.
//
// With a ledger charge in force each class is one registry pass over the
// decoded source (its parse is the helper traversal charged to that named
// pass); a spent budget makes the whole source over-limit before the
// extractor that would have exceeded it runs.
export const EXTRACTION_PASSES: Readonly<Record<ExtractionClass, ParsePassIdentity>> = {
  'project-account-section': 'project-account-extraction',
  principle: 'declared-item-extraction',
  'success-criterion': 'declared-item-extraction',
  'catalog-entry': 'declared-item-extraction',
  'design-contract': 'declared-item-extraction',
  'baseline-spec': 'declared-item-extraction',
  'topology-component': 'declared-item-extraction',
  'craft-policy': 'declared-item-extraction',
  'roster-identity': 'declared-item-extraction',
};

export const ROOT_INDEX_PASS: ParsePassIdentity = 'fact-and-precedence-extraction';

export function extractSource(
  source: Pick<ManifestSource, 'path' | 'extractionClasses'> & Partial<Pick<ManifestSource, 'rule'>>,
  text: string,
  charge?: ParsePassCharge,
): SourceExtraction {
  const { path } = source;
  const classes = source.extractionClasses;
  const all: ExtractedItem[] = [];
  const denominators: Partial<Record<ExtractionClass, number>> = {};
  let catalogHeadings: readonly CatalogHeading[] | undefined;
  for (const cls of classes) {
    try {
      charge?.(EXTRACTION_PASSES[cls]);
    } catch (error) {
      if (error instanceof ParsePassBudgetExceeded) return { kind: 'over-limit', path, classes, pass: EXTRACTION_PASSES[cls], class: cls, breach: error.breach };
      throw error;
    }
    const result = extractClass(cls, path, text);
    if (result.kind === 'failed') return { kind: 'unknown', path, classes, failure: result.failure };
    // One item at a time: a spread argument list is bounded by the stack, and a class may hold any number of items.
    for (const item of result.items) all.push(item);
    denominators[cls] = result.items.length;
    if (result.catalogHeadings !== undefined) catalogHeadings = result.catalogHeadings;
  }
  const extracted: SourceExtraction = { kind: 'extracted', path, classes, items: all, denominators, ...(catalogHeadings === undefined ? {} : { catalogHeadings }) };
  if ((source.rule as SourceRule | undefined) !== 'root-index') return extracted;
  // The root index's own pass: one traversal for the stated counts and the
  // precedence table together, charged under the registry identity.
  try {
    charge?.(ROOT_INDEX_PASS);
  } catch (error) {
    if (error instanceof ParsePassBudgetExceeded) return { kind: 'over-limit', path, classes, pass: ROOT_INDEX_PASS, breach: error.breach };
    throw error;
  }
  return { ...extracted, rootIndex: extractRootIndex(text) };
}

// ---------------------------------------------------------------------
// The root index (PWB-REQ-004 as amended; registry `observationGrammar`).
//
// Two grammars, both closed. The root summary emits exactly two stated
// counts: under the exact H2 `Key Architectural Facts`, the one unordered
// item whose leading bold label is `<decimal> daemons` and whose own text
// carries the exact cardinal form `<decimal> staffers ... + <decimal>
// domain butlers` declares `catalog-count:Staffers` and
// `catalog-count:Butlers`. The precedence table under the exact H3
// `Precedence Order When Layers Disagree` is admitted only as the exact
// seven-row registry vocabulary. Nothing else in the root mints anything.

export const ROOT_SUMMARY_HEADING = 'Key Architectural Facts';
export const PRECEDENCE_HEADING = 'Precedence Order When Layers Disagree';
export const PRECEDENCE_COLUMNS = ['#', 'Layer', 'Owns', 'Home'] as const;
export const LAYER_ORDINALS = [1, 2, 3, 4, 5, 6, 7] as const;
export type LayerOrdinal = (typeof LAYER_ORDINALS)[number];

export interface LayerRow {
  readonly ordinal: LayerOrdinal;
  readonly layer: string;
  readonly owns: string;
  readonly home: string;
}

// The registry's exact seven rows (`observationGrammar.precedence.rows`).
export const LAYER_ROWS: readonly LayerRow[] = [
  { ordinal: 1, layer: 'Heart and Soul', owns: 'Principles, scope boundaries, the 7 non-negotiable rules', home: 'about/heart-and-soul/' },
  { ordinal: 2, layer: 'Legends and Lore', owns: 'Wire contracts, state machines, data models, sanctioned rule exceptions', home: 'about/legends-and-lore/rfcs/' },
  { ordinal: 3, layer: 'Spec and Spine', owns: 'Feature behaviour, acceptance scenarios (WHEN/THEN), per-butler contracts', home: 'openspec/specs/' },
  { ordinal: 4, layer: 'Craft and Care', owns: 'Execution-quality standards, test scope, review gates, observability bar', home: 'about/craft-and-care/' },
  { ordinal: 5, layer: 'Lay and Land', owns: 'Topology snapshot \u2014 where components live, how they connect, stability levels', home: 'about/lay-and-land/' },
  { ordinal: 6, layer: 'Roster config', owns: 'Live butler identity: butler.toml, MANIFESTO.md, CLAUDE.md, skills, API routes', home: 'roster/{butler}/' },
  { ordinal: 7, layer: 'Code', owns: 'Runtime behaviour \u2014 executed source, migrations, tests', home: 'src/, alembic/, tests/' },
];
export const ROSTER_HOME_TEMPLATE = 'roster/{butler}/';
export const INERT_HOME = 'src/, alembic/, tests/';

export const STATED_COUNT_FACTS = ['catalog-count:Staffers', 'catalog-count:Butlers'] as const;
export type StatedCountFact = (typeof STATED_COUNT_FACTS)[number];

export interface StatedCount {
  readonly fact: StatedCountFact;
  readonly value: string;
  // The list item's line.
  readonly line: number;
}

export type RootSummaryExtraction =
  | { readonly kind: 'emitted'; readonly line: number; readonly declarations: readonly StatedCount[] }
  | { readonly kind: 'absent'; readonly reason: ExtractionFailure; readonly line?: number; readonly detail?: string };

export interface AdmittedLayerRule extends LayerRow {
  // The table row's line.
  readonly line: number;
}

export type PrecedenceExtraction =
  | { readonly kind: 'admitted'; readonly line: number; readonly rules: readonly AdmittedLayerRule[] }
  | { readonly kind: 'absent'; readonly reason: ExtractionFailure; readonly line?: number; readonly detail?: string };

export interface RootIndexExtraction {
  readonly summary: RootSummaryExtraction;
  readonly precedence: PrecedenceExtraction;
}

const DAEMONS_LABEL = /^(\d+) daemons$/;
// `<decimal> staffers ... + <decimal> domain butlers`: the ellipsis is the
// item's own intervening text; the form must occur exactly once.
const CARDINAL_FORM = /(\d+) staffers\b[^+]*\+ (\d+) domain butlers\b/g;

function absentSummary(reason: ExtractionFailure, line?: number, detail?: string): RootSummaryExtraction {
  return { kind: 'absent', reason, ...(line === undefined ? {} : { line }), ...(detail === undefined ? {} : { detail }) };
}

export function extractRootSummary(doc: Doc): RootSummaryExtraction {
  const found = headingsOf(doc, 2, ROOT_SUMMARY_HEADING);
  if (found.length === 0) return absentSummary('missing-heading', undefined, ROOT_SUMMARY_HEADING);
  if (found.length > 1) return absentSummary('duplicate-key', (found[1] as Heading).index + 1, ROOT_SUMMARY_HEADING);
  const heading = found[0] as Heading;
  const labelled = topLevelListItems(doc, sectionOf(doc, heading)).filter((item) => {
    const bold = LEADING_BOLD.exec(item.text);
    const label = bold?.[1] ?? bold?.[2];
    return label !== undefined && DAEMONS_LABEL.test(declarationKey(label));
  });
  if (labelled.length === 0) return absentSummary('malformed-list', heading.index + 1, 'no item labelled <decimal> daemons');
  if (labelled.length > 1) return absentSummary('duplicate-key', (labelled[1] as ListItem).line, '<decimal> daemons');
  const item = labelled[0] as ListItem;
  if (item.ordered) return absentSummary('malformed-list', item.line, 'not an unordered-list item');
  // Wrapped label continuation lines are one semantic space apart.
  const own = item.text.replace(/\s+/g, ' ');
  const forms = [...own.matchAll(CARDINAL_FORM)];
  if (forms.length !== 1) return absentSummary('malformed-list', item.line, forms.length === 0 ? 'no cardinal form' : 'cardinal form repeated');
  const form = forms[0] as RegExpMatchArray;
  return {
    kind: 'emitted',
    line: item.line,
    declarations: [
      { fact: 'catalog-count:Staffers', value: form[1] as string, line: item.line },
      { fact: 'catalog-count:Butlers', value: form[2] as string, line: item.line },
    ],
  };
}

const ONE_BOLD_SPAN = /^\*\*([^*\n]+)\*\*$/;
const COMPLETE_CODE_SPAN = /`([^`\n]*)`/g;

// `cellSyntax`: trim outer ASCII whitespace and unwrap only complete inline
// code spans; keep case, punctuation and internal whitespace.
export function semanticCellText(raw: string): string {
  return raw.replace(/^[ \t]+|[ \t]+$/g, '').replace(COMPLETE_CODE_SPAN, '$1');
}

function absentPrecedence(reason: ExtractionFailure, line?: number, detail?: string): PrecedenceExtraction {
  return { kind: 'absent', reason, ...(line === undefined ? {} : { line }), ...(detail === undefined ? {} : { detail }) };
}

export function extractPrecedenceTable(doc: Doc): PrecedenceExtraction {
  const found = headingsOf(doc, 3, PRECEDENCE_HEADING);
  if (found.length === 0) return absentPrecedence('missing-heading', undefined, PRECEDENCE_HEADING);
  if (found.length > 1) return absentPrecedence('duplicate-key', (found[1] as Heading).index + 1, PRECEDENCE_HEADING);
  const heading = found[0] as Heading;
  const tables = tablesOf(doc, sectionOf(doc, heading));
  if (tables.length !== 1) return absentPrecedence('malformed-row', heading.index + 1, tables.length === 0 ? 'no table' : 'more than one table');
  const table = tables[0] as Table;
  if (table.malformedRowLine !== undefined) return absentPrecedence('malformed-row', table.malformedRowLine, 'column count');
  const header = table.header.map(semanticCellText);
  if (header.length !== PRECEDENCE_COLUMNS.length || header.some((cell, i) => cell !== PRECEDENCE_COLUMNS[i])) {
    return absentPrecedence('malformed-row', table.line, 'columns');
  }
  if (table.rows.length !== LAYER_ROWS.length) return absentPrecedence('malformed-row', table.line, 'row count');
  const rules: AdmittedLayerRule[] = [];
  const seen = new Set<number>();
  for (const row of table.rows) {
    const [ordinalCell, layerCell, ownsCell, homeCell] = row.cells as [string, string, string, string];
    if (!/^[1-7]$/.test(semanticCellText(ordinalCell))) return absentPrecedence('malformed-row', row.line, '#');
    const ordinal = Number(semanticCellText(ordinalCell)) as LayerOrdinal;
    if (seen.has(ordinal)) return absentPrecedence('duplicate-key', row.line, String(ordinal));
    seen.add(ordinal);
    const bold = ONE_BOLD_SPAN.exec(layerCell.replace(/^[ \t]+|[ \t]+$/g, ''));
    if (bold === null) return absentPrecedence('malformed-row', row.line, 'Layer');
    const literal = LAYER_ROWS[ordinal - 1] as LayerRow;
    if (semanticCellText(bold[1] as string) !== literal.layer) return absentPrecedence('malformed-row', row.line, 'Layer');
    if (semanticCellText(ownsCell) !== literal.owns) return absentPrecedence('malformed-row', row.line, 'Owns');
    if (semanticCellText(homeCell) !== literal.home) return absentPrecedence('malformed-row', row.line, 'Home');
    rules.push({ ...literal, line: row.line });
  }
  rules.sort((a, b) => a.ordinal - b.ordinal);
  return { kind: 'admitted', line: table.line, rules };
}

export function extractRootIndex(text: string): RootIndexExtraction {
  const doc = parseDoc(text);
  return { summary: extractRootSummary(doc), precedence: extractPrecedenceTable(doc) };
}
