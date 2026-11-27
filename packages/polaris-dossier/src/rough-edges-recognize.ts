import { ROUGH_EDGE_MARKER } from './derive-rules.js';
import { scanCLike, scanPython, type Scanned } from './test-names-lexer.js';

/** The rough-edge marker recognizer (REQ-polaris-generation-034 version 2.43, syzygy-5dhm.46), version 1: a path rule saying which blobs
 * are candidates and in which language, and a lexical reading of one body that returns every marker it writes, each with its line and
 * that line's text. Pure.
 *
 * The body goes through the test-name lexer (`test-names-lexer.ts`) first. TODO, FIXME, HACK, the comment deprecation forms and issue
 * references are matched in comment content alone; two deprecation forms that are code (Java's `@Deprecated` annotation, Python's
 * `DeprecationWarning` and `PendingDeprecationWarning`) are matched in the code text, in which comments and string interiors are blanks.
 * So no marker is ever read inside a string, and a Python docstring is a string. An issue reference is a reference only: nothing it names is
 * read or fetched. */

export type MarkerLanguage = keyof typeof ROUGH_EDGE_MARKER.languages;
export type MarkerKind = (typeof ROUGH_EDGE_MARKER.kinds)[number];
export interface RawMarker {
  readonly kind: MarkerKind;
  /** The matched text exactly, for example `TODO`, `@deprecated` or `#123`. */
  readonly marker: string;
  readonly line: number;
  /** The line's text with its terminator, its leading and trailing spaces and tabs, and on line 1 a leading byte-order mark removed. */
  readonly quote: string;
}
export type RecognizedMarkers = { readonly ok: true; readonly markers: readonly RawMarker[] } | { readonly ok: false; readonly parseFault: 'unterminated' };

/** The language whose lexer reads a path, by its basename's extension, or undefined where the path is no candidate. */
export function markerLanguageOf(path: string): MarkerLanguage | undefined {
  const base = path.slice(path.lastIndexOf('/') + 1);
  for (const [language, extensions] of Object.entries(ROUGH_EDGE_MARKER.languages) as [MarkerLanguage, readonly string[]][]) {
    // A basename that is only the extension (`.py`) is no candidate.
    if (extensions.some((e) => base.endsWith(e) && base.length > e.length)) return language;
  }
  return undefined;
}

const W = 'A-Za-z0-9_';
/** The patterns matched in a comment's content, published verbatim in the requirement. Each is global; matches of one pattern never overlap. */
export const COMMENT_PATTERNS: readonly { readonly kind: MarkerKind; readonly pattern: RegExp }[] = [
  { kind: 'todo', pattern: new RegExp(`(?<![${W}])TODO(?![${W}])`, 'g') },
  { kind: 'fixme', pattern: new RegExp(`(?<![${W}])FIXME(?![${W}])`, 'g') },
  { kind: 'hack', pattern: new RegExp(`(?<![${W}])HACK(?![${W}])`, 'g') },
  { kind: 'deprecation', pattern: new RegExp(`(?<![${W}@])@deprecated(?![${W}])|(?<![${W}])DEPRECATED(?![${W}])|(?<![${W}@])Deprecated:`, 'g') },
];
/** The issue-reference patterns, in precedence order: a match overlapping one an earlier pattern took is dropped. */
export const ISSUE_PATTERNS: readonly RegExp[] = [
  /https?:\/\/(?:www\.)?github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/(?:issues|pull)\/[0-9]+(?![0-9])/g,
  /https?:\/\/gitlab\.com\/[A-Za-z0-9_.\/-]+?\/-\/(?:issues|merge_requests)\/[0-9]+(?![0-9])/g,
  /(?<![A-Za-z0-9_.\/-])[A-Za-z0-9][A-Za-z0-9_.-]*\/[A-Za-z0-9_.-]+#[0-9]{1,7}(?![A-Za-z0-9_])/g,
  /(?<![A-Za-z0-9_])GH-[0-9]{1,7}(?![A-Za-z0-9_])/g,
  /(?<![A-Za-z0-9_&#\/.-])#[0-9]{1,7}(?![A-Za-z0-9_])/g,
];
/** The deprecation forms matched in the code text, by language. */
export const CODE_PATTERNS: Readonly<Partial<Record<MarkerLanguage, RegExp>>> = {
  java: /(?<![A-Za-z0-9_$.@])@Deprecated(?![A-Za-z0-9_$])/g,
  python: /(?<![A-Za-z0-9_])(?:Pending)?DeprecationWarning(?![A-Za-z0-9_])/g,
};

const scan = (text: string, language: MarkerLanguage): Scanned =>
  language === 'python' ? scanPython(text) : scanCLike(text, language === 'javascript' ? { javascript: true } : language === 'go' ? { go: true } : { java: true });

/** The offset each line starts at, under the line rule that ends a line at CRLF, CR or LF. */
function lineStarts(text: string): number[] {
  const starts = [0];
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c === 0x0d && text.charCodeAt(i + 1) === 0x0a) { i++; starts.push(i + 1); } else if (c === 0x0d || c === 0x0a) starts.push(i + 1);
  }
  return starts;
}

interface Hit { readonly kind: MarkerKind; readonly start: number; readonly end: number }

export function recognizeMarkers(text: string, language: MarkerLanguage): RecognizedMarkers {
  const scanned = scan(text, language);
  if (!scanned.ok) return { ok: false, parseFault: scanned.fault };
  const hits: Hit[] = [];
  for (const comment of scanned.comments) {
    const content = text.slice(comment.contentStart, comment.contentEnd);
    for (const { kind, pattern } of COMMENT_PATTERNS) {
      for (const m of content.matchAll(pattern)) hits.push({ kind, start: comment.contentStart + m.index, end: comment.contentStart + m.index + m[0].length });
    }
    const taken: Hit[] = [];
    for (const pattern of ISSUE_PATTERNS) {
      for (const m of content.matchAll(pattern)) {
        const start = comment.contentStart + m.index, end = start + m[0].length;
        if (!taken.some((t) => start < t.end && t.start < end)) taken.push({ kind: 'issue-reference', start, end });
      }
    }
    for (const t of taken) hits.push(t);
  }
  const code = CODE_PATTERNS[language];
  if (code !== undefined) for (const m of scanned.code.matchAll(code)) hits.push({ kind: 'deprecation', start: m.index, end: m.index + m[0].length });

  hits.sort((a, b) => a.start - b.start || a.end - b.end);
  const starts = lineStarts(text);
  const lineOf = (offset: number): number => {
    let lo = 0, hi = starts.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid]! <= offset) lo = mid; else hi = mid - 1; }
    return lo;
  };
  const markers: RawMarker[] = [];
  for (const hit of hits) {
    const index = lineOf(hit.start);
    // A byte-order mark opening the body is no part of line 1's text (R-ROUGH-EDGES-1 F9).
    const raw = text.slice(index === 0 && text.startsWith('\uFEFF') ? 1 : starts[index]!, index + 1 < starts.length ? starts[index + 1]! : text.length).replace(/(?:\r\n|\r|\n)$/u, '');
    markers.push({ kind: hit.kind, marker: text.slice(hit.start, hit.end), line: index + 1, quote: raw.replace(/^[ \t]+|[ \t]+$/gu, '') });
  }
  return { ok: true, markers };
}
