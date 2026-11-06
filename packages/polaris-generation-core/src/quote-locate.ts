import { QUOTE_LEAD_IN, QUOTE_NORMALISATION, normaliseForQuote, stepMatches } from './quote-fidelity.js';

/** Locating a quotation in a file's bytes (REQ-polaris-generation-034; design "Byte ranges from a normalised match").
 *
 * The comparison is the quote check's: `normaliseForQuote` applied to the quotation and the file alike, then one contiguous run on word
 * boundaries. That normalisation is lossy, so here the file runs through the same steps (`QUOTE_NORMALISATION`, written once) with an
 * origin kept for every character produced: the raw characters it came from. A match in the normalised text then maps back to a raw
 * range, and from it to a byte range in the file.
 *
 * The range is the span from the first raw character of the match to the last, so a character the normalisation dropped at either edge
 * (a backtick, an emphasis mark) is outside it and one dropped inside it is inside. A caller that renders the quotation locates it again
 * in the bytes it read itself, and never takes a stored range on trust. */

/** A normalised text and, for each of its UTF-16 code units, the raw code units `[start, end)` it came from. */
export interface TrackedText {
  readonly text: string;
  readonly start: readonly number[];
  readonly end: readonly number[];
}

/** `normaliseForQuote(raw)`, with the origin of every character. */
export function normaliseTracked(raw: string): TrackedText {
  let current: TrackedText = { text: raw, start: Array.from({ length: raw.length }, (_, i) => i), end: Array.from({ length: raw.length }, (_, i) => i + 1) };
  for (const step of QUOTE_NORMALISATION) {
    const text: string[] = [], start: number[] = [], end: number[] = [];
    const from = current;
    const copy = (a: number, b: number): void => {
      for (let i = a; i < b; i++) { text.push(from.text[i]!); start.push(from.start[i]!); end.push(from.end[i]!); }
    };
    let last = 0;
    for (const match of stepMatches(step, from.text)) {
      const at = match.index, after = at + match[0].length;
      copy(last, at);
      const spanStart = from.start[at]!, spanEnd = from.end[after - 1]!;
      for (const piece of step.replace(match)) {
        if (piece.keep !== undefined) { copy(piece.keep, piece.keep + piece.text.length); continue; }
        for (let k = 0; k < piece.text.length; k++) { text.push(piece.text[k]!); start.push(spanStart); end.push(spanEnd); }
      }
      last = after;
    }
    copy(last, from.text.length);
    current = { text: text.join(''), start, end };
  }
  const a = current.text.startsWith(' ') ? 1 : 0;
  const b = current.text.length - (current.text.length > a && current.text.endsWith(' ') ? 1 : 0);
  return { text: current.text.slice(a, b), start: current.start.slice(a, b), end: current.end.slice(a, b) };
}

const WORD = /[\p{L}\p{N}]/u;
/** An ellipsis in a quotation that the file does not carry at that spot is an elision. */
const ELLIPSIS = /\.{3}|…/u;

/** Every index where `piece` occurs in `source` on word boundaries, the quote check's rule. */
function occurrences(source: string, piece: string): number[] {
  const out: number[] = [];
  const startsWord = WORD.test(piece[0]!), endsWord = WORD.test(piece[piece.length - 1]!);
  for (let at = source.indexOf(piece); at !== -1; at = source.indexOf(piece, at + 1)) {
    if (startsWord && at > 0 && WORD.test(source[at - 1]!)) continue;
    const after = source[at + piece.length];
    if (endsWord && after !== undefined && WORD.test(after)) continue;
    out.push(at);
  }
  return out;
}

/** The raw offset where each 1-based line starts and where its content ends (before its terminator). */
function lineBounds(raw: string): { readonly starts: number[]; readonly ends: number[] } {
  if (raw.length === 0) return { starts: [], ends: [] };
  const starts = [0], ends: number[] = [];
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c !== '\n' && c !== '\r') continue;
    ends.push(i);
    if (c === '\r' && raw[i + 1] === '\n') i++;
    starts.push(i + 1);
  }
  ends.push(raw.length);
  // A final terminator ends the last line; it does not open another.
  if (starts.length > 1 && starts[starts.length - 1] === raw.length) { starts.pop(); ends.pop(); }
  return { starts, ends };
}

/** How many lines a text holds: a final line terminator ends the last line and opens none. */
export function lineCount(raw: string): number {
  return lineBounds(raw).starts.length;
}

export type QuoteLocation =
  | { readonly found: true; readonly byteStart: number; readonly byteEnd: number }
  | { readonly found: false; readonly kind: 'quotation-empty' | 'quotation-elided' | 'quotation-not-in-cited-file' | 'quotation-outside-range' };

/** Locate `quote` in the file text `raw` within the inclusive 1-based line range. The first occurrence inside the range wins; its byte
 * range is in the file's UTF-8 bytes. `tracked` is `normaliseTracked(raw)`, passed in so one file is normalised once. */
export function locateQuote(raw: string, tracked: TrackedText, quote: string, startLine: number, endLine: number): QuoteLocation {
  const wanted = normaliseForQuote(quote);
  if (wanted.length === 0) return { found: false, kind: 'quotation-empty' };
  const hits = occurrences(tracked.text, wanted);
  if (hits.length === 0) return { found: false, kind: ELLIPSIS.test(quote) ? 'quotation-elided' : 'quotation-not-in-cited-file' };
  const lines = lineBounds(raw);
  const low = lines.starts[startLine - 1], high = lines.ends[endLine - 1];
  if (low !== undefined && high !== undefined) {
    for (const at of hits) {
      const rawStart = tracked.start[at]!, rawEnd = tracked.end[at + wanted.length - 1]!;
      if (rawStart >= low && rawEnd <= high) {
        const encoder = new TextEncoder();
        return { found: true, byteStart: encoder.encode(raw.slice(0, rawStart)).byteLength, byteEnd: encoder.encode(raw.slice(0, rawEnd)).byteLength };
      }
    }
  }
  return { found: false, kind: 'quotation-outside-range' };
}

export type LeadInQuotation =
  | { readonly terminated: true; readonly inner: string }
  | { readonly terminated: false; readonly kind: 'lead-in-without-quote' | 'quotation-unterminated' };

/** The quotations a block's text carries, in order: each `The project states: "…"` runs from the straight quote after the lead-in to the
 * last straight quote before the next lead-in or the end of the text, the quote check's lead-in rule. A lead-in not followed by a
 * straight quote, and one whose quote never closes, are reported in place. Quoted text without the lead-in is not a quotation here.
 * This is the local-agent interface (signed design, "The local-agent draft schema"): draft/inventory checking, fidelity verdicts and
 * rendering share these literal lead-in ordinals, even inside another quoted string or Markdown markup. It is deliberately separate
 * from quote-fidelity.ts's broader, source-dependent ordinary/curly quotation reader; see README.md "Quotation reader domains". */
export function leadInQuotations(text: string, leadIn: string = QUOTE_LEAD_IN): LeadInQuotation[] {
  return scanLeadIns(text, leadIn).map(({ found }) => found);
}

/** A terminated quotation with where it sits in the text: `inner` is `text.slice(open + 1, close)`, between the straight quotes at
 * `open` and `close`. */
export interface LeadInQuotationSpan { readonly inner: string; readonly open: number; readonly close: number }

/** The terminated quotations of `leadInQuotations`, in the same order and by the same rule, each with its position, so a renderer can
 * put Syzygy's own bytes where the agent's copy stood. A lead-in without a quote, or whose quote never closes, has no span. */
export function leadInQuotationSpans(text: string, leadIn: string = QUOTE_LEAD_IN): LeadInQuotationSpan[] {
  return scanLeadIns(text, leadIn).flatMap(({ found, open, close }) => (found.terminated ? [{ inner: found.inner, open, close }] : []));
}

function scanLeadIns(text: string, leadIn: string): { found: LeadInQuotation; open: number; close: number }[] {
  const out: { found: LeadInQuotation; open: number; close: number }[] = [];
  for (let at = text.indexOf(leadIn); at !== -1;) {
    const open = /^\s*"/u.exec(text.slice(at + leadIn.length));
    if (open === null) { out.push({ found: { terminated: false, kind: 'lead-in-without-quote' }, open: -1, close: -1 }); at = text.indexOf(leadIn, at + leadIn.length); continue; }
    const start = at + leadIn.length + open[0].length - 1;
    const next = text.indexOf(leadIn, start);
    const limit = next === -1 ? text.length : next;
    const last = text.lastIndexOf('"', limit - 1);
    out.push(last <= start ? { found: { terminated: false, kind: 'quotation-unterminated' }, open: start, close: -1 } : { found: { terminated: true, inner: text.slice(start + 1, last) }, open: start, close: last });
    at = next;
  }
  return out;
}
