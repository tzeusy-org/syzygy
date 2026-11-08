import { isRecord } from '@syzygy/support';
import { READER_STANDARDS_VERSION } from './reader-standards.js';

/** The counted reader standards (`reader-standards.ts`, syzygy-pdja.17): what `syzygy dossier check` can measure of RS-13, RS-14, RS-16
 * and RS-19 in a draft, reported to the author as advice. Advice is never a finding: it sets no outcome, is on the check's report only
 * (never the stored check record, like the screen census), and the rendered-design review still judges every page. Pure. */

export type ReaderStandardId = 'RS-13' | 'RS-14' | 'RS-16' | 'RS-19';

export interface ReaderAdvisory {
  readonly standard: ReaderStandardId;
  /** A JSON path into the draft. */
  readonly at: string;
  readonly detail: string;
}

export interface ReaderAdvice {
  readonly standards: typeof READER_STANDARDS_VERSION;
  readonly note: string;
  readonly advisories: readonly ReaderAdvisory[];
}

/** RS-14: at most this many deep dives. */
export const DEEP_DIVE_LIMIT = 3;
/** RS-19: about this many words of a section's own prose, outside its diagrams and elements. */
export const SECTION_WORD_LIMIT = 300;

const NOTE = `Advice from the counted reader standards (${READER_STANDARDS_VERSION}): it sets no outcome and is not stored in the check record; the design review still judges every page.`;

const list = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);
const text = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

/** Why a title may name a code symbol rather than what it explains, or undefined: a code span, a call, a path, a source file name, or an
 * identifier written in camelCase, PascalCase with an inner capital, snake_case or SCREAMING_CASE. */
export function codeSymbolInTitle(title: string): string | undefined {
  if (title.includes('`')) return 'it holds a code span';
  if (/\w\(/u.test(title)) return 'it names a call';
  if (/\S\/\S/u.test(title)) return 'it names a path';
  if (/\b[\w-]+\.(?:c|h|cc|cpp|hpp|rs|go|py|rb|java|kt|js|mjs|ts|tsx|jsx|cs|swift|php|lua|sh|json|ya?ml|toml|md|ini|conf|cfg)\b/iu.test(title)) return 'it names a file';
  if (/\b[a-z]+[A-Z][A-Za-z0-9]*\b/u.test(title)) return 'it holds a camelCase identifier';
  if (/\b[A-Z][a-z0-9]+[A-Z][A-Za-z0-9]*\b/u.test(title)) return 'it holds a PascalCase identifier';
  if (/\b[A-Za-z0-9]+_[A-Za-z0-9_]+\b/u.test(title)) return 'it holds a snake_case identifier';
  return undefined;
}

/** The words of an entry's own prose: a plain block's text and its children's; a presentation element (an entry with a `kind`) counts
 * none, since RS-19 counts prose outside the elements. */
function proseWords(entry: unknown): number {
  if (!isRecord(entry) || entry['kind'] !== undefined) return 0;
  const words = (value: unknown): number => (text(value)?.split(/\s+/u).filter((word) => word !== '').length ?? 0);
  return words(entry['text']) + list(entry['children']).reduce<number>((sum, child) => sum + (isRecord(child) ? words(child['text']) : 0), 0);
}

/** The advice for one parsed draft; a draft that is not an object yields none. */
export function readerAdvice(doc: unknown): ReaderAdvice {
  const advisories: ReaderAdvisory[] = [];
  if (isRecord(doc)) {
    const add = (standard: ReaderStandardId, at: string, detail: string): void => { advisories.push({ standard, at, detail }); };
    const deepDives = list(doc['deepDives']);
    for (const part of ['sections', 'deepDives'] as const) {
      list(doc[part]).forEach((container, i) => {
        if (!isRecord(container)) return;
        const at = `$.${part}[${i}]`;
        const title = text(container['title']);
        const why = title === undefined ? undefined : codeSymbolInTitle(title);
        if (why !== undefined) add('RS-13', `${at}.title`, `the title may name a code symbol (${why}); title it by what it explains to the reader, unless the word is a product or proper name`);
        const words = list(container['paragraphs']).reduce<number>((sum, entry) => sum + proseWords(entry), 0);
        if (words > SECTION_WORD_LIMIT) {
          add('RS-19', `${at}.paragraphs`, `${words} words of its own prose, past about ${SECTION_WORD_LIMIT}: move enumerations, comparisons and steps into elements or a diagram, depth a newcomer may skip into details, and cut the rest`);
        }
      });
    }
    if (deepDives.length > DEEP_DIVE_LIMIT) add('RS-14', '$.deepDives', `${deepDives.length} deep dives, past ${DEEP_DIVE_LIMIT}: keep those that answer a question their section cannot, and merge two that serve one question`);
    const drawn = new Set(list(doc['diagrams']).flatMap((diagram) => (isRecord(diagram) && text(diagram['sectionId']) !== undefined ? [text(diagram['sectionId'])!] : [])));
    list(doc['sections']).forEach((section, i) => {
      const id = isRecord(section) ? text(section['id']) : undefined;
      if (id !== undefined && !drawn.has(id)) add('RS-16', `$.sections[${i}]`, `no diagram is drawn for the section ${JSON.stringify(id)}: draw any workflow, mechanism or set of components that talk to each other it explains`);
    });
  }
  return { standards: READER_STANDARDS_VERSION, note: NOTE, advisories };
}
