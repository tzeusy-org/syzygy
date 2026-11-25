import { bodyLines, generationSourceIdentity, generationSpanRange, type GenerationSource } from '@syzygy/polaris-generation-core/live';

interface SourceLine {
  readonly number: number;
  readonly start: number;
  readonly text: string;
}

interface SourceSpan {
  readonly sourceId: string;
  readonly start: number;
  readonly end: number;
  readonly firstLine: number;
  readonly text: string;
}

export interface CitationRange {
  readonly start: number;
  readonly end: number;
}

export function citationLabel(ranges: readonly CitationRange[] | undefined): string | undefined {
  return ranges?.map(range => range.start === range.end ? `line ${range.start}` : `lines ${range.start}\u2013${range.end}`).join(', ');
}

/** Number only admitted bytes. Join contiguous spans before finding line endings, since a source piece can end inside a line or CRLF.
 * Withheld intervals leave a byte gap and the next span already supplies its original first line. */
export function sourceLines(sources: readonly GenerationSource[]): ReadonlyMap<string, ReadonlyMap<number, readonly SourceLine[]>> {
  const byFile = new Map<string, SourceSpan[]>();
  for (const source of sources) {
    const identity = generationSourceIdentity({ ...source, objectId: source.objectId! });
    const file = byFile.get(identity) ?? [];
    for (const span of source.spans) {
      const [start, end] = generationSpanRange(source, span);
      file.push({ sourceId: source.sourceId, start, end, firstLine: span.original?.startLine ?? 1, text: span.text });
    }
    byFile.set(identity, file);
  }
  const result = new Map<string, Map<number, SourceLine[]>>();
  for (const file of byFile.values()) {
    file.sort((a, b) => a.start - b.start);
    let run: SourceSpan[] = [];
    for (const span of file) {
      if (run.length > 0 && run.at(-1)!.end !== span.start) {
        numberRun(run, result);
        run = [];
      }
      run.push(span);
    }
    if (run.length > 0) numberRun(run, result);
  }
  return result;
}

function numberRun(run: readonly SourceSpan[], result: Map<string, Map<number, SourceLine[]>>): void {
  const lines = bodyLines(run.map(span => span.text).join(''));
  let number = run[0]!.firstLine, lineStart = run[0]!.start, spanIndex = 0;
  for (const line of lines) {
    const bytes = Buffer.from(line);
    const lineEnd = lineStart + bytes.length;
    for (let at = lineStart; at < lineEnd;) {
      const span = run[spanIndex]!;
      const end = Math.min(lineEnd, span.end);
      const spans = result.get(span.sourceId) ?? new Map<number, SourceLine[]>();
      const rows = spans.get(span.start) ?? [];
      rows.push({ number, start: at, text: bytes.subarray(at - lineStart, end - lineStart).toString('utf8') });
      spans.set(span.start, rows);
      result.set(span.sourceId, spans);
      if (end === span.end) spanIndex++;
      at = end;
    }
    lineStart = lineEnd;
    number++;
  }
}

export function rangesOnSource(
  spans: ReadonlyMap<number, readonly SourceLine[]> | undefined, ranges: readonly CitationRange[],
): readonly CitationRange[] {
  if (spans === undefined) return [];
  return ranges.flatMap(range => [...spans.values()].flatMap(rows => {
    const start = Math.max(range.start, rows[0]!.number), end = Math.min(range.end, rows.at(-1)!.number);
    return start > end ? [] : [{ start, end }];
  }));
}

export function sourceByteRange(spans: ReadonlyMap<number, readonly SourceLine[]> | undefined, start: number, end: number): CitationRange | undefined {
  const rows = [...(spans?.values() ?? [])].find(lines => lines.length > 0 && start >= lines[0]!.start
    && end <= lines.at(-1)!.start + Buffer.byteLength(lines.at(-1)!.text));
  if (rows === undefined || end <= start) return undefined;
  return { start: sourceLineAt(rows, start), end: sourceLineAt(rows, end - 1) };
}

function sourceLineAt(rows: readonly SourceLine[], byte: number): number {
  let low = 0, high = rows.length;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (rows[middle]!.start <= byte) low = middle;
    else high = middle;
  }
  return rows[low]!.number;
}

export function drawSourceLines(
  rows: readonly SourceLine[], cited: ReadonlyMap<number, readonly CitationRange[]> | undefined, escape: (text: string) => string,
): { readonly markup: string; readonly styles: readonly string[] } {
  const styles: string[] = [];
  const first = rows[0]!, last = rows.at(-1)!.number;
  const coverage = new Int32Array(rows.length + 1);
  for (const [target, ranges] of cited ?? []) {
    for (const range of ranges) {
      const start = Math.max(range.start, first.number);
      const end = Math.min(range.end, last);
      if (start > end) continue;
      const from = start - first.number, through = end - first.number + 1;
      coverage[from]!++;
      coverage[through]!--;
      styles.push(`#exact-text:has(#L${target}:target) [data-quote-start="${first.start}"]>.cited-span:nth-child(n+${from + 1}):nth-child(-n+${through})`);
    }
  }
  let citedCount = 0;
  const markup = rows.map((row, index) => {
    citedCount += coverage[index]!;
    return `<span class="source-line${citedCount > 0 ? ' cited-span' : ''}" id="L${row.number}" data-line="${row.number}">${escape(row.text).replace(/\r/gu, '&#13;')}</span>`;
  }).join('');
  return { markup, styles };
}
