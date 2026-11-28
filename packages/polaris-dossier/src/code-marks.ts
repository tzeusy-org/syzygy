import { checkShape, type LocalCodeMarks } from '@syzygy/polaris-generation-core/live';
import { isRecord } from '@syzygy/support';
import { CODE_EXCERPT_MAX_LINES, type CheckFinding, list } from './check-model.js';
import {
  HIGHLIGHTS_FIELD, HIGHLIGHTS_SCHEMA, LOCAL_DRAFT_SCHEMA_VERSIONS, LOCAL_DRAFT_SCHEMA_VERSION_V2, LOCAL_DRAFT_SCHEMA_VERSION_V18, NOTES_FIELD, NOTES_SCHEMA,
  hasExcerptMarkForm,
} from './draft-schema.js';
import { paragraphsOf } from './walk.js';

/** A code excerpt's highlights and margin notes in a schema-v18 draft (REQ-polaris-generation-034 version 2.54, syzygy-3efd.33).
 *
 * A code excerpt may carry `highlights`, 1 to 12 ranges of its lines, and `notes`, 1 to 12 `{"line", "block"}`, each tying one of its lines
 * to a cited paragraph of its place in the form in which a walk step ties an element to one. Both are presentation: check reads them here
 * alone, after every other finding, and hands every other reader the draft without them (`withoutCodeMarks`), so no record, count, ledger,
 * packet or machine view moves for them; the render reads them once more (`codeMarksAt`) to number, band and annotate a verified excerpt.
 * The findings compare the draft's own numbers and identities with one another and read no blob, so they are alike whatever screening
 * decides, and no detail names a byte, a path or a line count of a blob. */

type Doc = Readonly<Record<string, unknown>>;
const MEMBERS = [HIGHLIGHTS_FIELD, NOTES_FIELD] as const;
/** The places a note's paragraph belongs to. */
type Part = 'sections' | 'deepDives';

export const CODE_MARK_DETAIL = Object.freeze({
  backwards: (k: number): string => `\`highlights[${k}]\` runs from \`startLine\` to \`endLine\`, never backwards`,
  highlightOutside: (k: number, s: number, t: number): string => `\`highlights[${k}]\` lies outside the excerpt's lines ${s} to ${t}`,
  overlap: (k: number): string => `\`highlights[${k}]\` starts after the highlight before it ends`,
  noteOutside: (k: number, s: number, t: number): string => `\`notes[${k}].line\` lies outside the excerpt's lines ${s} to ${t}`,
  noteOrder: (k: number): string => `\`notes[${k}].line\` comes after the line of the note before it`,
  unresolved: (k: number): string => `\`notes[${k}].block\` names no paragraph of this section or deep dive`,
  uncited: (block: string): string => `${block}: a note's paragraph cites its sources`,
  fieldVersion: `\`${HIGHLIGHTS_FIELD}\` and \`${NOTES_FIELD}\` need draft schema ${LOCAL_DRAFT_SCHEMA_VERSION_V18}`,
});

interface Excerpt { readonly element: Doc; readonly at: string; readonly place: Doc | undefined; readonly part: Part | undefined }

/** Every code element of a draft, in the order a depth-first reading of the draft as submitted meets its path (list entries in index order,
 * an object's members in the order the draft writes them), with the section or deep dive that holds it, if any. */
function excerptsOf(doc: Doc): Excerpt[] {
  const out: Excerpt[] = [];
  const visit = (value: unknown, at: string, place: Doc | undefined, part: Part | undefined): void => {
    if (Array.isArray(value)) { value.forEach((entry, i) => visit(entry, `${at}[${i}]`, place, part)); return; }
    if (!isRecord(value)) return;
    if (value['kind'] === 'code') out.push({ element: value, at, place, part });
    for (const [key, member] of Object.entries(value)) {
      if (at === '$' && (key === 'sections' || key === 'deepDives')) {
        list(member).forEach((entry, i) => visit(entry, `$.${key}[${i}]`, isRecord(entry) ? entry : undefined, key));
      } else visit(member, `${at}.${key}`, place, part);
    }
  };
  visit(doc, '$', undefined, undefined);
  return out;
}

const carries = (element: Doc): boolean => MEMBERS.some((member) => Object.hasOwn(element, member));

/** A v18 draft without its excerpts' `highlights` and `notes`, which every reader but this module's findings and the render's excerpts is
 * handed; any other draft unchanged, so either member in it stays one the schema check reads (and reports as field-version). */
export function withoutCodeMarks<T>(doc: T): T {
  if (!isRecord(doc) || !hasExcerptMarkForm(doc['schemaVersion']) || !excerptsOf(doc).some((excerpt) => carries(excerpt.element))) return doc;
  const strip = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(strip);
    if (!isRecord(value)) return value;
    const code = value['kind'] === 'code';
    return Object.fromEntries(Object.entries(value).flatMap(([key, member]) => (code && (key === HIGHLIGHTS_FIELD || key === NOTES_FIELD) ? [] : [[key, strip(member)]])));
  };
  return strip(doc) as T;
}

/** `highlights` and `notes` in a draft of schema v3 to v17: a field-version finding at each member carried, in place of the schema finding
 * there. A v2 draft admits no code excerpt and takes none; nor does a v18 draft, or one of an unknown version. */
export function codeMarkFieldVersionPaths(doc: Doc): string[] {
  const version = doc['schemaVersion'];
  if (hasExcerptMarkForm(version) || version === LOCAL_DRAFT_SCHEMA_VERSION_V2 || !LOCAL_DRAFT_SCHEMA_VERSIONS.some((known) => known === version)) return [];
  return excerptsOf(doc).flatMap(({ element, at }) => MEMBERS.flatMap((member) => (Object.hasOwn(element, member) ? [`${at}.${member}`] : [])));
}
export const codeMarkFieldVersionFindings = (doc: Doc): CheckFinding[] =>
  codeMarkFieldVersionPaths(doc).map((at) => ({ kind: 'field-version', at, detail: CODE_MARK_DETAIL.fieldVersion }));

/** An integer from 1, or undefined. */
const lineOf = (value: unknown): number | undefined => (typeof value === 'number' && Number.isSafeInteger(value) && value >= 1 ? value : undefined);

/** The excerpt's cited range where it is well formed, not reversed and 1 to 60 lines, and its citation draws no `range-invalid` or
 * `code-excerpt-too-long` finding; otherwise undefined, and no finding of kinds `code-highlight`, `code-note` or `unresolved-reference` at
 * its lists is computed. */
function rangeOf(element: Doc, at: string, prior: readonly CheckFinding[]): { readonly s: number; readonly t: number } | undefined {
  const citation = element['citation'];
  if (!isRecord(citation)) return undefined;
  const s = lineOf(citation['startLine']), t = lineOf(citation['endLine']);
  if (s === undefined || t === undefined || s > t || t - s + 1 > CODE_EXCERPT_MAX_LINES) return undefined;
  const refused = prior.some((finding) => (finding.kind === 'range-invalid' || finding.kind === 'code-excerpt-too-long') && finding.at === `${at}.citation`);
  return refused ? undefined : { s, t };
}

/** The findings of a v18 draft's highlights and notes (version 2.54), reported after every finding version 2.53 reports (`prior`): each
 * excerpt in depth-first order, its `schema` findings at either list first, then its highlight findings, then its note findings. */
export function codeMarkFindings(doc: Doc, prior: readonly CheckFinding[]): CheckFinding[] {
  if (!hasExcerptMarkForm(doc['schemaVersion'])) return [];
  const out: CheckFinding[] = [];
  for (const { element, at, place, part } of excerptsOf(doc)) {
    if (!carries(element)) continue;
    // Each list read against its own schema: a fault is a `schema` finding at its path, and the list takes no finding of this version.
    const sound = new Map<string, boolean>();
    for (const [member, schema] of [[HIGHLIGHTS_FIELD, HIGHLIGHTS_SCHEMA], [NOTES_FIELD, NOTES_SCHEMA]] as const) {
      if (!Object.hasOwn(element, member)) continue;
      const faults = checkShape({ root: schema, defs: {} }, element[member]);
      for (const fault of faults) out.push({ kind: 'schema', at: `${at}.${member}${fault.path.slice(1)}`, detail: fault.detail });
      sound.set(member, faults.length === 0);
    }
    const range = rangeOf(element, at, prior);
    if (range === undefined) continue;
    const { s, t } = range;
    if (sound.get(HIGHLIGHTS_FIELD) === true) {
      const highlights = element[HIGHLIGHTS_FIELD] as readonly Doc[];
      highlights.forEach((highlight, k) => {
        const start = highlight['startLine'] as number, end = highlight['endLine'] as number;
        const entryAt = `${at}.${HIGHLIGHTS_FIELD}[${k}]`;
        if (start > end) out.push({ kind: 'code-highlight', at: entryAt, detail: CODE_MARK_DETAIL.backwards(k) });
        else if (start < s || end > t) out.push({ kind: 'code-highlight', at: entryAt, detail: CODE_MARK_DETAIL.highlightOutside(k, s, t) });
        // The comparison reads the entry before's numbers whatever findings that entry draws.
        else if (k > 0 && start <= (highlights[k - 1]!['endLine'] as number)) out.push({ kind: 'code-highlight', at: entryAt, detail: CODE_MARK_DETAIL.overlap(k) });
      });
    }
    if (sound.get(NOTES_FIELD) === true) {
      const notes = element[NOTES_FIELD] as readonly Doc[];
      const paragraphs = place === undefined || part === undefined ? new Map<string, Doc>() : paragraphsOf(place, part);
      notes.forEach((note, k) => {
        const line = note['line'] as number, block = note['block'] as string;
        const entryAt = `${at}.${NOTES_FIELD}[${k}]`;
        if (line < s || line > t) out.push({ kind: 'code-note', at: `${entryAt}.line`, detail: CODE_MARK_DETAIL.noteOutside(k, s, t) });
        else if (k > 0 && line <= (notes[k - 1]!['line'] as number)) out.push({ kind: 'code-note', at: `${entryAt}.line`, detail: CODE_MARK_DETAIL.noteOrder(k) });
        const paragraph = paragraphs.get(block);
        if (paragraph === undefined) out.push({ kind: 'unresolved-reference', at: `${entryAt}.block`, detail: CODE_MARK_DETAIL.unresolved(k) });
        else if (list(paragraph['citations']).length === 0) out.push({ kind: 'code-note', at: `${entryAt}.block`, detail: CODE_MARK_DETAIL.uncited(block) });
      });
    }
  }
  return out;
}

/** A v18 draft's code excerpts at a render (version 2.54), by element identity: each code element's highlights and notes, empty where it
 * carries neither, so every verified excerpt of the draft renders numbered. The draft passed check, so each list carried is well formed.
 * Empty for any other draft. */
export function codeMarksAt(doc: Doc): ReadonlyMap<string, LocalCodeMarks> {
  const out = new Map<string, LocalCodeMarks>();
  if (!hasExcerptMarkForm(doc['schemaVersion'])) return out;
  for (const { element } of excerptsOf(doc)) {
    const id = element['id'];
    if (typeof id !== 'string' || out.has(id)) continue;
    const highlights = list(element[HIGHLIGHTS_FIELD]).flatMap((entry) => (isRecord(entry) && lineOf(entry['startLine']) !== undefined && lineOf(entry['endLine']) !== undefined
      ? [{ startLine: entry['startLine'] as number, endLine: entry['endLine'] as number }] : []));
    const notes = list(element[NOTES_FIELD]).flatMap((entry) => (isRecord(entry) && lineOf(entry['line']) !== undefined && typeof entry['block'] === 'string'
      ? [{ line: entry['line'] as number, block: entry['block'] }] : []));
    out.set(id, { highlights, notes });
  }
  return out;
}
