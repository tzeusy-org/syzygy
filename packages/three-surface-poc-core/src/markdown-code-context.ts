// Markdown code-context mask — the policy's `closed-pwb-code-context-v1`
// profile (2026-09-05 policy amendment, `activeContentClassification.
// markdownProfile`; PWB-REQ-006 as amended by the truth-and-readiness
// amendment).
//
// The mask exists for one consumer: active-content detection. Bytes wholly
// inside a syntactically closed inline code span or fenced code block are
// inert Markdown contexts — markup-like examples there never alone exclude
// a source and are never interpreted as markup or a link. Secret detectors
// never see the mask: they scan the complete transient text (the policy's
// `precedence` clause and PWB-REQ-006 "the context mask SHALL affect only
// active-content detection, never secret scans").
//
// The profile is UTF-8 line-oriented and closed:
//
//   line end       CRLF, CR or LF, each one line end; the mask keeps every
//                  terminator where it stands (the owner's ruling on
//                  syzygy-bpyt.1.14, implemented by syzygy-bpyt.16), so a
//                  CRLF or CR text gets exactly the decision its LF form gets;
//   fenced opener  zero to three spaces, then at least three identical
//                  backticks or tildes; a backtick opener's info string
//                  contains no backtick (else malformed);
//   fenced closer  zero to three spaces, the opener character repeated at
//                  least the opener length, then spaces only; the first
//                  qualifying closer ends the fence;
//   inline opener  outside a fence, a run of one or more backticks;
//   inline closer  the next run of exactly the opener length; runs of a
//                  different length are content and a backslash does not
//                  escape a delimiter;
//   precedence     fenced context is recognized before inline context;
//   not inert      indented code, HTML `<code>` elements and every other
//                  construct — they are ordinary text to the scan.
//
// An unclosed fence, an unclosed inline span or a backtick fence whose
// info string contains a backtick is a malformed context; the policy's
// `malformedContextAction` is exclude-whole-artifact, which the reader
// reports as its own active-content form. This module decides the code
// contexts (`recognizeCodeContexts`, which finds where each fence and span
// starts and ends), the mask built from them and the malformation reason; it
// retains nothing. The extractor, the index-link reader and the root-index
// reader use the recognizer, never the mask (syzygy-bpyt.55, the owner's
// GP-B2 Q2 answer C: the link reader alone also uses its spans).

export const MALFORMED_CODE_CONTEXTS = [
  'unclosed-fence',
  'unclosed-inline-span',
  'backtick-fence-with-backtick-in-info-string',
] as const;
export type MalformedCodeContext = (typeof MALFORMED_CODE_CONTEXTS)[number];

export type CodeContextMask =
  | {
      readonly kind: 'masked';
      // `text` with every byte inside a closed code context (delimiters
      // included) replaced by a space; every line terminator (CRLF, CR or
      // LF) is kept, so the masked text has the original's length and every
      // offset, and every line/column position equals the original's.
      readonly masked: string;
      readonly fences: number;
      readonly spans: number;
    }
  | {
      readonly kind: 'malformed';
      readonly reason: MalformedCodeContext;
      // 1-based line where the malformed context opened; CRLF, CR and LF
      // each end one line.
      readonly line: number;
    };

const FENCE_OPENER = /^ {0,3}(`{3,}|~{3,})(.*)$/; // the PWB-REQ-006 profile, the one fence rule of the profile, the extractor and both index readers; the consent reader and the Polaris renderer keep their own: docs/evidence/syzygy-bpyt-6-3/dc3-fence-rules-addendum-2026-10-29.json

function fenceCloser(line: string, char: string, length: number): boolean {
  const match = /^ {0,3}(`{3,}|~{3,}) *$/.exec(line);
  if (match === null) return false;
  const run = match[1] ?? '';
  return run[0] === char && run.length >= length;
}

// A line ends at CRLF, CR or LF: CommonMark's line ending, and the split the
// Polaris renderer already makes. The extractor and the link reader keep their
// own LF-only line model and ask the recognizer which of their lines a fence
// holds (syzygy-bpyt.55). The terminators are returned beside the lines, so
// no offset moves; normalizing the text first would renumber a bare-CR file.
const LINE_END = /\r\n|\r|\n/g;

function splitLines(text: string): { readonly lines: string[]; readonly terminators: string[] } {
  const lines: string[] = [];
  const terminators: string[] = [];
  let start = 0;
  for (const end of text.matchAll(LINE_END)) {
    lines.push(text.slice(start, end.index));
    terminators.push(end[0]);
    start = end.index + end[0].length;
  }
  lines.push(text.slice(start));
  terminators.push('');
  return { lines, terminators };
}

// What the recognizer finds, as offset ranges into the text it was given. Both lists are sorted and disjoint (no span lies inside a
// fence), and a range is half open: [start, end). A fence range runs from the first character of its opener line to the end of its
// closer line, before that line's terminator, so it holds the terminators between its lines; a span range runs from the first
// backtick of its opener run to the last of its closer run, and may cross a line end.
//
// The recognizer is total: it reads the whole text and reports a malformed context beside the ranges instead of stopping at it
// (syzygy-bpyt.55, D1). Its recovery is fixed and is not the profile's decision, which stays exclude-whole-artifact: an unclosed fence runs
// to the end of the text, a backtick opener whose info string holds a backtick still opens a fence, and an inline span that is still
// open at a fence opener or at the end of the text is dropped (no range). `malformed` is the first malformation in scan order, with
// the reason and line the mask reports; a caller that is handed a text with `malformed` set has to treat the text as excluded and
// must not act on the ranges. `fences` and `spans` count the contexts that closed, so an unclosed fence has a range and no count.
export type CodeContextRange = readonly [start: number, end: number];

export interface CodeContextRecognition {
  readonly fenceRanges: readonly CodeContextRange[];
  readonly spanRanges: readonly CodeContextRange[];
  readonly fences: number;
  readonly spans: number;
  readonly malformed?: { readonly reason: MalformedCodeContext; readonly line: number };
}

export function recognizeCodeContexts(text: string): CodeContextRecognition {
  const { lines, terminators } = splitLines(text);
  const fenceRanges: CodeContextRange[] = [];
  const spanRanges: CodeContextRange[] = [];
  let malformed: { readonly reason: MalformedCodeContext; readonly line: number } | undefined;
  const note = (reason: MalformedCodeContext, line: number): void => {
    malformed ??= { reason, line };
  };
  let fence: { readonly char: string; readonly length: number; readonly line: number; readonly start: number } | undefined;
  let span: { readonly length: number; readonly line: number; readonly start: number } | undefined;
  let offset = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const lineNumber = index + 1;
    const lineStart = offset;
    offset += line.length + (terminators[index] ?? '').length;

    if (fence !== undefined) {
      if (fenceCloser(line, fence.char, fence.length)) {
        fenceRanges.push([fence.start, lineStart + line.length]);
        fence = undefined;
      }
      continue;
    }

    // Fenced context is recognized before inline context: a fence opener
    // line is a fence even while an inline span is open, which leaves that
    // span unclosed (malformed) rather than swallowing the fence.
    const opener = FENCE_OPENER.exec(line);
    if (opener !== null) {
      if (span !== undefined) {
        note('unclosed-inline-span', span.line);
        span = undefined;
      }
      const run = opener[1] ?? '';
      const info = opener[2] ?? '';
      if (run[0] === '`' && info.includes('`')) note('backtick-fence-with-backtick-in-info-string', lineNumber);
      fence = { char: run[0] ?? '`', length: run.length, line: lineNumber, start: lineStart };
      continue;
    }

    // Inline scan over this line, continuing an open span from a previous
    // line if any.
    let cursor = 0;
    while (cursor < line.length) {
      if (line[cursor] !== '`') {
        cursor += 1;
        continue;
      }
      let end = cursor;
      while (end < line.length && line[end] === '`') end += 1;
      const runLength = end - cursor;
      if (span === undefined) {
        span = { length: runLength, line: lineNumber, start: lineStart + cursor };
      } else if (runLength === span.length) {
        spanRanges.push([span.start, lineStart + end]);
        span = undefined;
      }
      cursor = end;
    }
  }

  const fences = fenceRanges.length;
  const spans = spanRanges.length;
  if (fence !== undefined) {
    note('unclosed-fence', fence.line);
    fenceRanges.push([fence.start, text.length]);
  }
  if (span !== undefined) note('unclosed-inline-span', span.line);
  return { fenceRanges, spanRanges, fences, spans, ...(malformed === undefined ? {} : { malformed }) };
}

// The index of the first range in a sorted, disjoint list whose end is after `offset`.
function firstEndingAfter(ranges: readonly CodeContextRange[], offset: number): number {
  let low = 0;
  let high = ranges.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if ((ranges[mid] as CodeContextRange)[1] > offset) high = mid;
    else low = mid + 1;
  }
  return low;
}

// Whether `offset` lies inside a fence of the recognition (opener and closer lines included).
export function isFencedAt(recognition: CodeContextRecognition, offset: number): boolean {
  const range = recognition.fenceRanges[firstEndingAfter(recognition.fenceRanges, offset)];
  return range !== undefined && range[0] <= offset;
}

// The span ranges that overlap [start, end), each clipped to it, in order.
export function spanRangesWithin(recognition: CodeContextRecognition, start: number, end: number): readonly CodeContextRange[] {
  const out: CodeContextRange[] = [];
  for (let at = firstEndingAfter(recognition.spanRanges, start); at < recognition.spanRanges.length; at += 1) {
    const range = recognition.spanRanges[at] as CodeContextRange;
    if (range[0] >= end) break;
    out.push([Math.max(range[0], start), Math.min(range[1], end)]);
  }
  return out;
}

export function maskMarkdownCodeContexts(text: string): CodeContextMask {
  const recognition = recognizeCodeContexts(text);
  if (recognition.malformed !== undefined) return { kind: 'malformed', ...recognition.malformed };
  // The two lists are disjoint; merged by start, each range's characters become spaces and every CR and LF stays where it stands.
  const ranges = [...recognition.fenceRanges, ...recognition.spanRanges].sort((a, b) => a[0] - b[0]);
  const pieces: string[] = [];
  let at = 0;
  for (const [start, end] of ranges) {
    pieces.push(text.slice(at, start), text.slice(start, end).replace(/[^\r\n]/g, ' '));
    at = end;
  }
  pieces.push(text.slice(at));
  return { kind: 'masked', masked: pieces.join(''), fences: recognition.fences, spans: recognition.spans };
}
