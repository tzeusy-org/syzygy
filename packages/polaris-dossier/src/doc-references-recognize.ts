import { isFencedAt, recognizeCodeContexts, spanRangesWithin } from '@syzygy/three-surface-poc-core/screening';
import { DOC_REFERENCE } from './derive-rules.js';
import { MANIFEST_VALUE_LIMIT } from './manifest-facts.js';

/** The document-reference recognizer (REQ-polaris-generation-034 version 2.48, syzygy-5dhm.119), version 1: which paths and identifiers
 * one Markdown body names, read lexically. Pure.
 *
 * Code contexts are read by the PWB-REQ-006 profile's recognizer (`recognizeCodeContexts`), never by the mask: a body it reports malformed
 * is not read. Two places are read: the content of every inline code span outside a fence, and the destination of every inline link
 * `[text](destination)` or image `![text](destination)` whose opening bracket is outside a fence and a span and whose destination lies in
 * no span. Nothing else in the prose is read, and nothing in a fence. Each reading is classed by its written form alone; what the form
 * names is resolved against the tree by `doc-references.ts`. */

export type ReferenceWritten = 'code-span' | 'link';
export type DocCandidate =
  | {
      readonly form: 'path';
      readonly written: ReferenceWritten;
      /** The span's content or the link's destination, as written. */
      readonly value: string;
      readonly line: number;
      readonly quote: string;
      readonly quoteExcerpt: boolean;
      readonly offset: number;
      /** The repository paths to try, in order, each normalised (no `.` or `..` segment, no trailing slash). */
      readonly tryPaths: readonly string[];
      /** For a code span that neither starts `./` or `../` nor climbs: the path text any listed path may end with, after a `/` or whole
       * (a bare name is then a basename). Null for a link and a relative span, which resolve from the document's directory alone. */
      readonly tail: string | null;
      /** Written with a trailing slash: only a directory resolves it. */
      readonly directory: boolean;
      /** A form as often a name in prose as a path: it resolves or is Unknown, never document-only. */
      readonly ambiguous: boolean;
      /** A relative path that climbs above the repository root. */
      readonly outside: boolean;
    }
  | { readonly form: 'identifier'; readonly written: 'code-span'; readonly value: string; readonly name: string; readonly line: number; readonly quote: string; readonly quoteExcerpt: boolean; readonly offset: number };

export type RecognizedReferences =
  | { readonly ok: true; readonly candidates: readonly DocCandidate[]; readonly spansNotChecked: number; readonly linksNotChecked: number }
  | { readonly ok: false; readonly parseFault: string };

/** A path form: segments of these characters joined by `/`, with an optional trailing slash. */
const PATH_FORM = /^[A-Za-z0-9_@+.-]+(?:\/[A-Za-z0-9_@+.-]+)*\/?$/;
/** A trailing line or line range, `:N` or `:N-M`, written after a path. */
const LINE_SUFFIX = /:[0-9]+(?:-[0-9]+)?$/;
/** A last segment with an extension (a non-empty stem, a dot, letters or digits), or a dotfile. */
const EXTENSION = /^(?:[^.].*\.([A-Za-z0-9]+)|\.[A-Za-z0-9_][A-Za-z0-9_.-]*)$/;
/** An identifier form: names joined by `.` or `::`, optionally followed by `()`. */
const IDENTIFIER_FORM = /^[A-Za-z_$][A-Za-z0-9_$]*(?:(?:\.|::)[A-Za-z_$][A-Za-z0-9_$]*)*(?:\(\))?$/;
/** What marks an identifier form as code rather than a word: `_` or `$`, a lowercase letter or digit before a capital, a separator, or
 * `()`. `build`, `Server` and `API` carry none and are not read. */
const CODE_MARK = /[_$]|[a-z0-9][A-Z]|\.|::|\(\)$/;
/** An inline link or image: its destination has no space, parenthesis or angle bracket, and an optional quoted title follows it. */
const LINK = /!?\[[^\]\r\n]*\]\(([^()\s<>]+)(?:[ \t]+(?:"[^"\r\n]*"|'[^'\r\n]*'))?\)/g;
const SCHEME = /^[A-Za-z][A-Za-z0-9+.-]*:/;
/** The longest quote, the manifest value limit; a longer line is quoted by an excerpt that starts this many code units before the reading. */
const QUOTE_LIMIT = MANIFEST_VALUE_LIMIT;
const EXCERPT_BEFORE = 64;

const BARE = new Set<string>(DOC_REFERENCE.bareExtensions);
const WEAK = new Set<string>(DOC_REFERENCE.weakExtensions);

/** Segments joined onto a base directory with `.` and `..` resolved; `outside` where a `..` climbs above the root. */
export function normalise(base: string, relative: string): { readonly path: string; readonly outside: boolean } {
  const out = base === '' ? [] : base.split('/');
  for (const segment of relative.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') { if (out.length === 0) return { path: '', outside: true }; out.pop(); continue; }
    out.push(segment);
  }
  return { path: out.join('/'), outside: false };
}

/** A code span's value as a path, or undefined where its form is no path. */
function spanPath(value: string, directoryOf: string): Omit<Extract<DocCandidate, { form: 'path' }>, 'line' | 'quote' | 'quoteExcerpt' | 'offset' | 'written' | 'value'> | undefined {
  const bare = value.replace(LINE_SUFFIX, '');
  if (!PATH_FORM.test(bare)) return undefined;
  const directory = bare.endsWith('/');
  const trimmed = directory ? bare.slice(0, -1) : bare;
  const segments = trimmed.split('/');
  const relative = segments[0] === '.' || segments[0] === '..';
  // `.` and `..` only as a leading run; elsewhere the form is no path.
  const firstOther = segments.findIndex((s) => s !== '.' && s !== '..');
  if (firstOther < 0 || segments.slice(firstOther).some((s) => s === '.' || s === '..')) return undefined;
  const last = segments[segments.length - 1]!;
  const extension = EXTENSION.exec(last);
  if (segments.length === 1 && !directory) {
    if (extension === null) return undefined;
    const ext = extension[1]?.toLowerCase();
    // A dotfile (`.gitignore`) has no captured extension and is a path.
    if (ext !== undefined && !BARE.has(ext) && !WEAK.has(ext)) return undefined;
    return { form: 'path', tryPaths: [], tail: trimmed, directory, ambiguous: ext !== undefined && WEAK.has(ext), outside: false };
  }
  const tries: string[] = [];
  let outside = false;
  for (const base of relative ? [directoryOf] : directoryOf === '' ? [''] : ['', directoryOf]) {
    const n = normalise(base, trimmed);
    if (n.outside) { outside = true; continue; }
    if (!tries.includes(n.path)) tries.push(n.path);
  }
  return { form: 'path', tryPaths: tries, tail: relative || tries.length === 0 ? null : tries[0]!, directory, ambiguous: !(directory || relative || extension !== null), outside: tries.length === 0 && outside };
}

/** The offset each line starts at, under the line rule that ends a line at CRLF, CR or LF. */
function lineStarts(text: string): number[] {
  const starts = [0];
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c === 0x0d && text.charCodeAt(i + 1) === 0x0a) { i++; starts.push(i + 1); } else if (c === 0x0d || c === 0x0a) starts.push(i + 1);
  }
  return starts;
}

export function recognizeDocReferences(text: string, documentPath: string): RecognizedReferences {
  const recognition = recognizeCodeContexts(text);
  if (recognition.malformed !== undefined) return { ok: false, parseFault: recognition.malformed.reason };
  const slash = documentPath.lastIndexOf('/');
  const directoryOf = slash < 0 ? '' : documentPath.slice(0, slash);
  const starts = lineStarts(text);
  const lineOf = (offset: number): { line: number; quote: string; quoteExcerpt: boolean } => {
    let lo = 0, hi = starts.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid]! <= offset) lo = mid; else hi = mid - 1; }
    const from = lo === 0 && text.startsWith('\uFEFF') ? 1 : starts[lo]!;
    const raw = text.slice(from, lo + 1 < starts.length ? starts[lo + 1]! : text.length).replace(/(?:\r\n|\r|\n)$/u, '');
    const lead = raw.length - raw.replace(/^[ \t]+/u, '').length;
    const quote = raw.replace(/^[ \t]+|[ \t]+$/gu, '');
    if (quote.length <= QUOTE_LIMIT) return { line: lo + 1, quote, quoteExcerpt: false };
    // A line past the limit is quoted by an exact excerpt of QUOTE_LIMIT code units that holds the reading's start, never a split pair.
    const column = offset - from - lead;
    let start = Math.max(0, Math.min(column - EXCERPT_BEFORE, quote.length - QUOTE_LIMIT));
    let end = start + QUOTE_LIMIT;
    if (start > 0 && (quote.charCodeAt(start) & 0xfc00) === 0xdc00) start++;
    if (end < quote.length && (quote.charCodeAt(end - 1) & 0xfc00) === 0xd800) end--;
    return { line: lo + 1, quote: quote.slice(start, end), quoteExcerpt: true };
  };

  const candidates: DocCandidate[] = [];
  let spansNotChecked = 0, linksNotChecked = 0;
  for (const [start, end] of recognition.spanRanges) {
    let run = 0;
    while (text[start + run] === '`') run++;
    let value = text.slice(start + run, end - run);
    // CommonMark: one space is stripped from each end when both ends hold one and the content is not all spaces.
    if (value.length >= 2 && value.startsWith(' ') && value.endsWith(' ') && value.trim() !== '') value = value.slice(1, -1);
    const at = lineOf(start);
    const path = /[\r\n]/.test(value) ? undefined : spanPath(value, directoryOf);
    if (path !== undefined) { candidates.push({ ...path, written: 'code-span', value, offset: start, ...at }); continue; }
    if (!/[\r\n]/.test(value) && IDENTIFIER_FORM.test(value) && CODE_MARK.test(value)) {
      const parts = value.replace(/\(\)$/, '').split(/\.|::/);
      const name = parts[parts.length - 1]!;
      if (name.length >= 2 && /[A-Za-z0-9]/.test(name)) { candidates.push({ form: 'identifier', written: 'code-span', value, name, offset: start, ...at }); continue; }
    }
    spansNotChecked++;
  }

  for (const m of text.matchAll(LINK)) {
    const destination = m[1]!;
    const destStart = m.index + m[0].indexOf('](') + 2;
    if (isFencedAt(recognition, m.index) || spanRangesWithin(recognition, m.index, m.index + 1).length > 0
      || spanRangesWithin(recognition, destStart, destStart + destination.length).length > 0) continue;
    const at = lineOf(m.index);
    const target = destination.replace(/[#?].*$/s, '');
    let decoded: string | undefined;
    try { decoded = decodeURIComponent(target); } catch { decoded = undefined; }
    if (SCHEME.test(destination) || destination.startsWith('/') || target === '' || decoded === undefined || /[\u0000-\u001f\u007f]/u.test(decoded)) { linksNotChecked++; continue; }
    const n = normalise(directoryOf, decoded);
    candidates.push({
      form: 'path', written: 'link', value: destination, offset: destStart, ...at, tryPaths: n.outside ? [] : [n.path], tail: null,
      directory: decoded.endsWith('/'), ambiguous: false, outside: n.outside,
    });
  }
  candidates.sort((a, b) => a.offset - b.offset);
  return { ok: true, candidates, spansNotChecked, linksNotChecked };
}
