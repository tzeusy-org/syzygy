/**
 * Deterministic quote fidelity. A generated block may quote its sources, and
 * a quotation is a claim about bytes: every quoted span must be a substring of
 * one of the sources the block cites, after a normalisation applied identically
 * to the quote and to the source. A model review cannot waive this; a failure
 * is a blocking finding on the block, which therefore renders Unknown or does
 * not render as supported (it never passes silently).
 *
 * Normalisation, in order, on both sides:
 *   1. comment leaders at line starts (block-comment open and close marks, a
 *      bare star, double slash, hash) and a block-comment close at a line end
 *      are dropped;
 *   2. markdown links and images keep their text and lose url and brackets;
 *   3. HTML entities are decoded and markdown backslash escapes removed;
 *   4. backticks (code spans) and the emphasis characters `*` and `_` are dropped;
 *   5. curly quotes and apostrophes become straight, and the ellipsis
 *      character becomes three periods;
 *   6. every whitespace run, line breaks included, becomes one space; ends trimmed.
 * A quote is one contiguous run of one source (never two sources joined) and
 * matches only on word boundaries, so a quote of "ed" does not match inside
 * "Redis". Elision is not allowed: an ellipsis is ordinary text and must be
 * in the source at that spot. For a file split into pieces, a block that cites any piece
 * is checked against the whole file's text.
 * A quotation opens with the lead-in and a straight quote and runs to the
 * last straight quote before the next lead-in (or the end of the block), so
 * it may contain quotes and cannot carry an unverified tail; a stray quote in
 * prose after it is part of the span and fails the check. Outside a lead-in,
 * straight and curly (`“ ”`) double quotes still delimit a span to check: a
 * straight span containing straight quotes takes the longest reading, from
 * its opening quote to a later quote that ends a word or sentence, whose
 * normalised text occurs in a cited source; curly quotes nest by depth. A
 * span with no verifying reading is a failure.
 */

import { quotableGenerationSources, type GenerationSource } from './generation-source.js';

/** The lead-in the dossier prompts ask for before a verbatim quotation: `The project states: "..."`. */
export const QUOTE_LEAD_IN = 'The project states:';

export type QuoteFindingKind = 'quote-not-in-cited-sources' | 'unterminated-quote' | 'empty-quote' | 'quote-without-cited-source' | 'lead-in-without-quote' | 'elided-quote';
export interface QuoteFinding {
  readonly blockId: string;
  readonly kind: QuoteFindingKind;
  /** The quoted text as written (at most 200 characters); empty for a lead-in with no quote. */
  readonly quote: string;
}
export interface QuoteBlock { readonly id: string; readonly text: string; readonly sourceIds: readonly string[] }

const NAMED_ENTITIES: Readonly<Record<string, string>> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' };

/** Kept apart from dossier-page-scan.ts `decodeHtmlText` on purpose (syzygy-bpyt.8.41, GP-Q0): it normalises source and quotation text for
 * quote location, so no digit cap (leading zeros still decode) and `&#0;` stays literal, keeping NUL out of a located quote.
 * `entity-decoder-divergence.test.ts` pins where they differ. */
function decodeEntity(whole: string, body: string): string {
  if (body[0] !== '#') return NAMED_ENTITIES[body] ?? whole;
  const code = body[1] === 'x' || body[1] === 'X' ? Number.parseInt(body.slice(2), 16) : Number.parseInt(body.slice(1), 10);
  return Number.isInteger(code) && code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : whole;
}

/** One piece a normalisation step puts in place of a match: `keep` is the index, in the step's input, of text carried over unchanged;
 * a piece without it is new text standing for the whole match. */
export interface NormalisationPiece { readonly text: string; readonly keep?: number }
/** One step of the normalisation: a global pattern that never matches the empty string, and the pieces each match becomes. */
export interface NormalisationStep { readonly pattern: RegExp; readonly replace: (match: RegExpExecArray) => readonly NormalisationPiece[] }

const keepGroup = (match: RegExpExecArray, index: number): NormalisationPiece => ({ text: match[index]!, keep: match.indices![index]![0] });
const dropMatch = (): readonly NormalisationPiece[] => [];
/** Emphasis only as a pair at word edges (`*x*`, `_x_`, `**x**`, `__x__`) on one line: an unpaired or intraword `*` or `_` (`active_expire`, `*p`) is the source's own character. */
const EMPHASIS = /(?<![\p{L}\p{N}])(\*\*|__|\*|_)([^\n]*?[^\s])\1(?![\p{L}\p{N}])/dgu;

/** The normalisation of the file comment, in order, written once: `normaliseForQuote` applies it to text, and the byte-range locator
 * (`quote-locate.ts`) applies the same steps while keeping where each character came from. Line edges are lookarounds on LF, never the
 * `m` flag, whose `^` and `$` also break at U+2028 and U+2029; line breaks are LF from the first step on. After the last step, one
 * leading and one trailing space are trimmed. */
export const QUOTE_NORMALISATION: readonly NormalisationStep[] = Object.freeze<NormalisationStep[]>([
  { pattern: /\r\n|\r/gu, replace: () => [{ text: '\n' }] },
  // One comment leader per line start, then one block-comment close per line end.
  { pattern: /(?<![^\n])[ \t]*(?:\/\*+|\*+\/|\*+(?![^ \t\n])|\/\/+|#+)[ \t]?/gu, replace: dropMatch },
  { pattern: /[ \t]*\*+\/[ \t]*(?![^\n])/gu, replace: dropMatch },
  { pattern: /!?\[([^\]\n]*)\]\([^)\n]*\)/dgu, replace: (m) => [keepGroup(m, 1)] },
  { pattern: /!?\[([^\]\n]*)\]\[[^\]\n]*\]/dgu, replace: (m) => [keepGroup(m, 1)] },
  { pattern: /&(#[0-9]+|#[xX][0-9a-fA-F]+|[a-zA-Z]+);/gu, replace: (m) => {
    const decoded = decodeEntity(m[0], m[1]!);
    return decoded === m[0] ? [{ text: m[0], keep: m.index }] : [{ text: decoded }];
  } },
  { pattern: /\\([!-/:-@[-`{-~])/dgu, replace: (m) => [keepGroup(m, 1)] },
  { pattern: /`/gu, replace: dropMatch },
  { pattern: EMPHASIS, replace: (m) => [keepGroup(m, 2)] },
  { pattern: EMPHASIS, replace: (m) => [keepGroup(m, 2)] },
  { pattern: /[\u2018\u2019]/gu, replace: () => [{ text: "'" }] },
  { pattern: /[\u201c\u201d]/gu, replace: () => [{ text: '"' }] },
  { pattern: /\u2026/gu, replace: () => [{ text: '...' }] },
  { pattern: /\s+/gu, replace: () => [{ text: ' ' }] },
]);

/** Every match of a step in `text`, in order; a step that matches the empty string is a defect, never a loop. */
export function* stepMatches(step: NormalisationStep, text: string): Generator<RegExpExecArray> {
  const pattern = new RegExp(step.pattern.source, step.pattern.flags);
  for (let match = pattern.exec(text); match !== null; match = pattern.exec(text)) {
    if (match[0].length === 0) throw new Error('quote normalisation: a step matched the empty string');
    yield match;
  }
}

/** The comparison form of a quote or a source; see the file comment. */
export function normaliseForQuote(text: string): string {
  let out = text;
  for (const step of QUOTE_NORMALISATION) {
    let next = '', last = 0;
    for (const match of stepMatches(step, out)) {
      next += out.slice(last, match.index) + step.replace(match).map(piece => piece.text).join('');
      last = match.index + match[0].length;
    }
    out = next + out.slice(last);
  }
  const from = out.startsWith(' ') ? 1 : 0;
  return out.slice(from, out.length - (out.length > from && out.endsWith(' ') ? 1 : 0));
}
const NORMALISED = new Map<string, string>();
/** `normaliseForQuote` of a source, memoised: one draft checks many blocks against the same few texts. */
function normaliseSource(text: string): string {
  let out = NORMALISED.get(text);
  if (out === undefined) {
    if (NORMALISED.size >= 64) NORMALISED.clear();
    out = normaliseForQuote(text);
    NORMALISED.set(text, out);
  }
  return out;
}

/** An ellipsis or a bracketed one inside a quotation that is not in the source verbatim: an elision, which can splice a meaning together. */
const ELLIPSIS = /\.{3}|\u2026/u;
const WORD = /[\p{L}\p{N}]/u;

/** First index at or after `from` where `piece` occurs on word boundaries, or -1. */
function findPiece(source: string, piece: string, from: number): number {
  const startsWord = WORD.test(piece[0]!), endsWord = WORD.test(piece[piece.length - 1]!);
  for (let at = source.indexOf(piece, from); at !== -1; at = source.indexOf(piece, at + 1)) {
    if (startsWord && at > 0 && WORD.test(source[at - 1]!)) continue;
    const after = source[at + piece.length];
    if (endsWord && after !== undefined && WORD.test(after)) continue;
    return at;
  }
  return -1;
}

/** Whether the normalised `wanted` is one contiguous run of the normalised `source`, on word boundaries. An ellipsis is ordinary text: it matches only where the source has it. */
function occursIn(source: string, wanted: string): boolean {
  return wanted.length > 0 && findPiece(source, wanted, 0) !== -1;
}

const OPEN_CURLY = '“', CLOSE_CURLY = '”';
const BOUNDARY_AFTER = /^$|^[\s.,;:!?)\]}—–-]/u;
const clip = (text: string): string => (text.length > 200 ? text.slice(0, 200) : text);

interface Span { readonly inner: string; readonly end: number; readonly candidates: readonly string[] }

/** Where the quote opened at `open` could end: one candidate per plausible closing quote, longest first. */
function straightCandidates(text: string, open: number): { inner: string; end: number }[] {
  const out: { inner: string; end: number }[] = [];
  for (let j = open + 1; j < text.length; j++) {
    if (text[j] !== '"') continue;
    if (BOUNDARY_AFTER.test(text.slice(j + 1, j + 2))) out.push({ inner: text.slice(open + 1, j), end: j });
  }
  return out.reverse();
}

function curlySpan(text: string, open: number): { inner: string; end: number } | undefined {
  let depth = 0;
  for (let j = open; j < text.length; j++) {
    if (text[j] === OPEN_CURLY) depth++;
    else if (text[j] === CLOSE_CURLY && --depth === 0) return { inner: text.slice(open + 1, j), end: j };
  }
  return undefined;
}

/** Every quoted span of `text`: a lead-in quotation runs to the last straight quote before the next lead-in, any other span takes the reading that verifies when one exists. */
function quotedSpans(text: string, leadIn: string, verifies: (inner: string) => boolean): { inner: string; ok: boolean; terminated: boolean; end: number }[] {
  const out: { inner: string; ok: boolean; terminated: boolean; end: number }[] = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (leadIn.length > 0 && text.startsWith(leadIn, i)) {
      const open = /^\s*"/u.exec(text.slice(i + leadIn.length));
      if (open !== null) {
        const start = i + leadIn.length + open[0].length - 1;
        const next = text.indexOf(leadIn, start);
        const limit = next === -1 ? text.length : next;
        const last = text.lastIndexOf('"', limit - 1);
        if (last <= start) { out.push({ inner: text.slice(start + 1, limit), ok: false, terminated: false, end: limit }); i = limit - 1; continue; }
        const inner = text.slice(start + 1, last);
        out.push({ inner, ok: verifies(inner), terminated: true, end: last });
        i = last;
        continue;
      }
      i += leadIn.length - 1;
      continue;
    }
    if (c === OPEN_CURLY) {
      const span = curlySpan(text, i);
      if (span === undefined) { out.push({ inner: text.slice(i + 1), ok: false, terminated: false, end: text.length }); break; }
      out.push({ inner: span.inner, ok: verifies(span.inner), terminated: true, end: span.end });
      i = span.end;
    } else if (c === '"') {
      const candidates = straightCandidates(text, i);
      if (candidates.length === 0) { out.push({ inner: text.slice(i + 1), ok: false, terminated: false, end: text.length }); break; }
      const verified = candidates.find(candidate => verifies(candidate.inner));
      const chosen = verified ?? candidates[candidates.length - 1]!;
      out.push({ inner: chosen.inner, ok: verified !== undefined, terminated: true, end: chosen.end });
      i = chosen.end;
    }
  }
  return out;
}

/** Findings for one block: every quoted span must occur, normalised, in a source the block cites. */
export type QuoteSourceText = string | readonly string[];
export function checkBlockQuotes(block: QuoteBlock, sourceText: ReadonlyMap<string, QuoteSourceText>, leadIn: string = QUOTE_LEAD_IN): QuoteFinding[] {
  return inspectBlockQuotes(block, sourceText, leadIn).findings;
}

/** Findings plus how many quoted spans the block carries, so a caller can tell a block with no quotes from one whose quotes all verified. */
export function inspectBlockQuotes(block: QuoteBlock, sourceText: ReadonlyMap<string, QuoteSourceText>, leadIn: string = QUOTE_LEAD_IN): { readonly quotes: number; readonly findings: QuoteFinding[] } {
  const findings: QuoteFinding[] = [];
  const cited = [...new Set(block.sourceIds)].flatMap(id => {
    const text = sourceText.get(id);
    return text === undefined ? [] : typeof text === 'string' ? [text] : [...text];
  }).map(normaliseSource);
  const verifies = (inner: string): boolean => {
    const wanted = normaliseForQuote(inner);
    return wanted.length > 0 && cited.some(source => occursIn(source, wanted));
  };
  const spans = quotedSpans(block.text, leadIn, verifies);
  for (const span of spans) {
    if (!span.terminated) findings.push({ blockId: block.id, kind: 'unterminated-quote', quote: clip(span.inner) });
    else if (normaliseForQuote(span.inner).length === 0) findings.push({ blockId: block.id, kind: 'empty-quote', quote: clip(span.inner) });
    else if (cited.length === 0) findings.push({ blockId: block.id, kind: 'quote-without-cited-source', quote: clip(span.inner) });
    else if (!span.ok) findings.push({ blockId: block.id, kind: ELLIPSIS.test(span.inner) ? 'elided-quote' : 'quote-not-in-cited-sources', quote: clip(span.inner) });
  }
  // A lead-in promises a verbatim quotation; one with no quote after it promises bytes it does not show.
  for (let at = block.text.indexOf(leadIn); at !== -1; at = block.text.indexOf(leadIn, at + leadIn.length)) {
    const rest = block.text.slice(at + leadIn.length);
    if (!/^\s*["“]/u.test(rest)) findings.push({ blockId: block.id, kind: 'lead-in-without-quote', quote: '' });
  }
  return { quotes: spans.length, findings };
}

/** The text a block's quote may be checked against, by cited source id: a quotable source's own text, or for a piece of a split file the whole file's text (a quote may cross a piece boundary). The quotable rule is `quotableGenerationSources`: one whole-body span. */
export function sourceTextById(sources: readonly GenerationSource[]): ReadonlyMap<string, QuoteSourceText> {
  const quotable = new Map(quotableGenerationSources(sources).map(source => [source.sourceId, source.text]));
  const out = new Map<string, QuoteSourceText>(quotable);
  const files = new Map<string, GenerationSource[]>();
  for (const source of sources) {
    if (source.redaction !== undefined || source.segment === undefined || !quotable.has(source.sourceId)) continue;
    const key = JSON.stringify([source.repositoryId, source.revision, source.path, source.objectId, source.segment.count]);
    files.set(key, [...(files.get(key) ?? []), source]);
  }
  for (const pieces of files.values()) {
    const ordered = [...pieces].sort((a, b) => a.segment!.index - b.segment!.index);
    // The pieces run from the first without a gap; a deferred tail (a prefix of the file was admitted) is simply not there to quote.
    if (ordered.some((piece, i) => piece.segment!.index !== i)) continue;
    const whole = ordered.map(piece => quotable.get(piece.sourceId)!).join('');
    for (const piece of ordered) out.set(piece.sourceId, whole);
  }
  const redacted = new Map<string, GenerationSource[]>();
  for (const source of sources) {
    if (source.redaction === undefined || source.exclusion.excluded) continue;
    const key = JSON.stringify([source.repositoryId, source.revision, source.path, source.objectId]);
    redacted.set(key, [...(redacted.get(key) ?? []), source]);
  }
  for (const pieces of redacted.values()) {
    const spans = pieces.flatMap(piece => piece.spans).sort((a, b) => a.original!.start - b.original!.start);
    const runs: { start: number; text: string }[] = [];
    for (const span of spans) {
      const last = runs.at(-1);
      if (last !== undefined && last.start + Buffer.byteLength(last.text) === span.original!.start) last.text += span.text;
      else runs.push({ start: span.original!.start, text: span.text });
    }
    // Separate candidates prevent a quotation from joining the two sides of a withheld run or quoting a presentation marker.
    for (const piece of pieces) out.set(piece.sourceId, runs.map(run => run.text));
  }
  return out;
}

/** Every block of a draft: any object with a string id, a string text and a sourceIds list (introduction, section and deep-dive blocks and their children). */
export function draftBlocks(draft: unknown): QuoteBlock[] {
  const out: QuoteBlock[] = [];
  const walk = (node: unknown, depth: number): void => {
    if (depth > 12 || node === null || typeof node !== 'object') return;
    if (Array.isArray(node)) { for (const item of node) walk(item, depth + 1); return; }
    const record = node as Record<string, unknown>;
    if (typeof record.id === 'string' && typeof record.text === 'string' && Array.isArray(record.sourceIds) && record.sourceIds.every(id => typeof id === 'string')) {
      out.push({ id: record.id, text: record.text, sourceIds: record.sourceIds as string[] });
    }
    for (const value of Object.values(record)) walk(value, depth + 1);
  };
  walk(draft, 0);
  return out;
}

/** Quote findings for a whole draft against the quotable sources. */
export function checkDraftQuotes(draft: unknown, byId: ReadonlyMap<string, QuoteSourceText>): QuoteFinding[] {
  return draftBlocks(draft).flatMap(block => checkBlockQuotes(block, byId));
}

/** The review finding a quote failure becomes, in the shape the repair stage and the reviewer already use. */
export function quoteFindingAsReviewFinding(finding: QuoteFinding): { severity: 'blocking'; message: string; target: string } {
  const what: Record<QuoteFindingKind, string> = {
    'quote-not-in-cited-sources': 'is not found, after normalisation, in any source this block cites',
    'unterminated-quote': 'opens a quotation that is never closed',
    'empty-quote': 'is an empty quotation',
    'quote-without-cited-source': 'quotes text but cites no source',
    'elided-quote': 'elides text with an ellipsis, which is not allowed (the ellipsis is not in the source at that spot)',
    'lead-in-without-quote': 'announces a verbatim quotation and gives none',
  };
  return { severity: 'blocking', message: `Quotation ${finding.quote === '' ? '' : `"${finding.quote}" `}${what[finding.kind]} (${finding.kind}). Give one quotation per lead-in, and quote it verbatim from a cited source, or remove the quotation marks and mark the sentence Inferred.`, target: finding.blockId };
}
