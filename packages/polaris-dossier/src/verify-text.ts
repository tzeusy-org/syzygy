import { QUOTE_LEAD_IN, lineCount, object } from '@syzygy/polaris-generation-core/live';
import type { DraftSchemaWithDefs } from './draft-schema.js';
import { deriveFindings, type DeriveInputs, type Derived, type SubjectRules } from './check-derive.js';
import { BLOB_MODES } from './git-object-reader.js';
import { secretPathOf } from './screen.js';

/** Checking free-form Markdown about a pinned repository (syzygy-5dhm.23, move R2 slice 1).
 *
 * A text written by anyone (a plain session's synthesis, a dossier page as text, a pasted note) is split into claims: a paragraph, a
 * list item or a table row. From each claim this module extracts the path references it carries (a path, with or without lines) and
 * the double-quoted spans it carries, and checks every one against the pinned tree with the dossier check's own derivation
 * (`deriveFindings`): the same tree listing, the same screen (a path the screen excludes is never read), the same retained text for a
 * redacted body, the same range rule and the same quotation locator. No second filter is written here: each reference and quotation is
 * handed to `deriveFindings` as a citation and a quotation of a synthetic subject, and its findings are read back by identity.
 *
 * Each claim gets one of six outcomes, in this precedence: `path-missing` (a reference names no file at the pinned revision, or lines
 * past its end), `quotation-not-found` (a quotation is no contiguous run of any file the claim names), `withheld` (a reference or a
 * quotation rests on a path or lines screening withholds), `quotation-verified` (every quotation located in a file the claim names),
 * `reference-unverified` (every reference resolves, and the claim quotes nothing), `unanchored` (no reference at all; a quotation in an
 * unanchored claim is not checked).
 *
 * What it measures is whether a claim can be checked and whether its quotation is real, never whether an unquoted claim is true. */

export const VERIFY_TEXT_FORMAT = 'polaris-dossier-verify-text-v1';

export const CLAIM_OUTCOMES = ['quotation-verified', 'reference-unverified', 'path-missing', 'quotation-not-found', 'unanchored', 'withheld'] as const;
export type ClaimOutcome = typeof CLAIM_OUTCOMES[number];

/** File name extensions a bare name (no directory) must carry to count as a path: a bare `server.c` is a reference, `e.g.` is not. */
/** Extensions a bare name carries in prose as often as in a file name (`Node.js`, `Vue.js`): a bare name with one needs code marks or lines. */
const WEAK_EXTENSIONS: ReadonlySet<string> = new Set(['js', 'ts', 'in']);
const BARE_EXTENSIONS: ReadonlySet<string> = new Set([
  'c', 'h', 'cc', 'cpp', 'cxx', 'hpp', 'hh', 'md', 'markdown', 'txt', 'rst', 'conf', 'cfg', 'ini', 'json', 'yaml', 'yml', 'toml', 'xml',
  'py', 'tcl', 'js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx', 'rs', 'go', 'sh', 'bash', 'lua', 'rb', 'java', 'kt', 'mk', 'cmake', 'html', 'css',
  'sql', 'proto', 'lock', 'in',
]);

const QUOTATION_FORM = 'A quotation holds at least one letter or digit and may wrap across lines of its claim; a straight-quoted span inside a curly-quoted one is part of it. Backslash escapes are not interpreted.';

export const VERIFY_TEXT_DISCLOSURES: readonly string[] = [
  'The checker measures whether a claim can be checked and whether its quotation is real, not whether an unquoted claim is true: a reference that resolves says only that the file and lines exist at the pinned revision.',
  'A claim is a paragraph, a list item or a table row outside fenced code; a reference is a repository path, optionally with lines (path:N, path:N-M, path#LN-LM, "path, lines N-M"); a quotation is a double-quoted span (straight or curly) outside code spans.',
  'A quotation is checked only against the files its own claim names; a quotation in a claim that names no file is counted unanchored, never searched for.',
  'A path the screen withholds is reported withheld and never read; a quotation resting on withheld lines of a redacted file is withheld too, and so is a quotation found in no resolving file of a claim that also names a withheld path.',
  `Not a reference: an absolute path, a URL, a host, a glob, a name that is only an extension, or a slashed name with neither an extension nor lines. A bare name without a slash is one only with lines, as a dotfile in code marks, or with one of these extensions: ${[...BARE_EXTENSIONS].join(', ')}; with ${[...WEAK_EXTENSIONS].join(', ')} (\`Node.js\` in prose) only in code marks or with lines. A path written both with lines and alone is checked for both. Lines below 1 or past ${Number.MAX_SAFE_INTEGER} name nothing.`,
  `${QUOTATION_FORM} A quotation that itself contains the dossier lead-in ("The project states:") cannot be checked and counts as not found.`,
];

/** The same disclosures in the words the neutral page shows a blind grader (verify-text-page.ts): the lead-in rule is stated without
 * naming the dossier or the lead-in's words, which would tell a grader which arm a text whose body carries them came from. */
export const VERIFY_TEXT_GRADER_DISCLOSURES: readonly string[] = [
  ...VERIFY_TEXT_DISCLOSURES.slice(0, -1),
  `${QUOTATION_FORM} A quotation that itself contains a fixed lead-in phrase the checker reserves cannot be checked and counts as not found.`,
];

/** A line range, 1-based and inclusive, as written. */
export interface LineRange { readonly start: number; readonly end: number }

export interface TextReference {
  readonly path: string;
  /** The ranges written after the path; empty for a reference to the whole file. */
  readonly ranges: readonly LineRange[];
  /** Present when the path is written with lines and also alone: the whole file is checked as well as the ranges. */
  readonly wholeFile?: true;
}

export interface TextClaim {
  /** 1-based, in text order. */
  readonly index: number;
  /** The claim's first and last line in the text, 1-based. */
  readonly startLine: number;
  readonly endLine: number;
  readonly references: readonly TextReference[];
  /** The inner text of each quotation, in order. */
  readonly quotations: readonly string[];
}

export interface ExtractedText {
  readonly claims: readonly TextClaim[];
  /** Lines that are no claim: headings, fenced code (fences included), table header rows and table separator rows. */
  readonly skipped: { readonly headingLines: number; readonly fencedLines: number; readonly tableHeaderLines: number; readonly tableSeparatorLines: number };
}

export type ReferenceState = 'resolves' | 'missing' | 'lines-missing' | 'withheld';
export type QuotationState = 'verified' | 'not-found' | 'withheld' | 'no-file';

export interface CheckedReference {
  /** The path as the text writes it, or null where the path is one whose name screening withholds. */
  readonly written: string | null;
  /** The path at the pinned revision the written one resolves to (itself, or the one blob whose path ends with it); null where it is
   * withheld by name or resolves to no single blob. */
  readonly path: string | null;
  readonly ranges: readonly LineRange[];
  /** Present when the text also names the whole file beside its ranges. */
  readonly wholeFile?: true;
  readonly state: ReferenceState;
}

export interface CheckedClaim {
  readonly index: number;
  readonly startLine: number;
  readonly endLine: number;
  readonly outcome: ClaimOutcome;
  readonly references: readonly CheckedReference[];
  /** Each quotation's state, in order; `unanchored` claims list none. */
  readonly quotations: readonly QuotationState[];
  /** Quotations in an unanchored claim, which are not checked. */
  readonly uncheckedQuotations: number;
}

export interface VerifiedText {
  readonly claims: readonly CheckedClaim[];
  readonly tally: Readonly<Record<ClaimOutcome, number>>;
  readonly items: {
    readonly references: Readonly<Record<ReferenceState, number>>;
    readonly quotations: Readonly<Record<QuotationState | 'unanchored', number>>;
  };
  readonly skipped: ExtractedText['skipped'];
}

// ---- extraction ----

const FENCE = /^ {0,3}(`{3,}|~{3,})/u;
const HEADING = /^ {0,3}#{1,6}(\s|$)/u;
const LIST_ITEM = /^\s*(?:[-*+]|\d{1,9}[.)])\s+/u;
const TABLE_ROW = /^\s*\|/u;
const TABLE_SEPARATOR = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/u;
/** A run of path characters; `:` and `#` end it, so a line suffix can follow. */
const PATH_RUN = /[A-Za-z0-9_./+-]+/gu;
const DASH = '[-–—]';
const COLON_LINES = new RegExp(`^:(\\d+)(?:${DASH}(\\d+))?(?!\\w|\\.\\d)`, 'u');
const ANCHOR_LINES = /^#L(\d+)(?:-L?(\d+))?/u;
const WORD_LINES = new RegExp(`^,?\\s*\\(?\\s*lines?\\s+(\\d+)(?:\\s*${DASH}\\s*(\\d+))?\\)?`, 'u');
const STRAIGHT_QUOTE = /"([^"]+)"/gu;
const CURLY_QUOTE = /“([^”]+)”/gu;
const HAS_WORD = /[\p{L}\p{N}]/u;

/** Split a Markdown text into claims and extract each claim's references and quotations. */
export function extractClaims(markdown: string): ExtractedText {
  const lines = markdown.split(/\r\n|\r|\n/u);
  const units: { start: number; end: number; text: string[] }[] = [];
  let open: { start: number; end: number; text: string[] } | null = null;
  let fence: string | null = null;
  let headingLines = 0, fencedLines = 0, tableHeaderLines = 0, tableSeparatorLines = 0;
  const close = (): void => { if (open !== null) units.push(open); open = null; };
  const tableBody = new Set<{ start: number; end: number; text: string[] }>();
  lines.forEach((line, i) => {
    const number = i + 1;
    const fenceMatch = FENCE.exec(line);
    if (fence !== null) {
      fencedLines += 1;
      if (fenceMatch !== null && fenceMatch[1]![0] === fence[0] && fenceMatch[1]!.length >= fence.length && line.trim() === fenceMatch[1]) fence = null;
      return;
    }
    if (fenceMatch !== null) { close(); fence = fenceMatch[1]!; fencedLines += 1; return; }
    if (line.trim() === '') { close(); return; }
    if (HEADING.test(line)) { close(); headingLines += 1; return; }
    if (TABLE_ROW.test(line)) {
      close();
      if (TABLE_SEPARATOR.test(line)) {
        tableSeparatorLines += 1;
        // The row right above a separator is the table's header: labels, not a claim.
        const header = units[units.length - 1];
        if (header !== undefined && header.end === number - 1 && TABLE_ROW.test(header.text[0]!) && !tableBody.has(header)) { units.pop(); tableHeaderLines += 1; }
        tableBody.add(units[units.length - 1]!);
        return;
      }
      units.push({ start: number, end: number, text: [line] });
      return;
    }
    // A list marker starts a new claim, unless it is a wrapped line that closes a quotation the open claim left open. An unpaired mark
    // (an inch mark, a stray quote) that this line does not close starts no merge: the item is its own claim, as before.
    if (LIST_ITEM.test(line) && !(open !== null && quotationOpen(open.text.join('\n')) && !quotationOpen(`${open.text.join('\n')}\n${line}`))) close();
    if (open === null) open = { start: number, end: number, text: [line] };
    else { open.end = number; open.text.push(line); }
  });
  close();
  return {
    claims: units.map((unit, k) => {
      const text = unit.text.join('\n');
      return { index: k + 1, startLine: unit.start, endLine: unit.end, references: referencesIn(text), quotations: quotationsIn(text) };
    }),
    skipped: { headingLines, fencedLines, tableHeaderLines, tableSeparatorLines },
  };
}

/** Code spans of a line of Markdown, as `[start, end)` offsets including their backticks (a run of n backticks closes on a run of n). */
function codeSpans(text: string): [number, number][] {
  const spans: [number, number][] = [];
  const ticks = /`+/gu;
  let match: RegExpExecArray | null;
  while ((match = ticks.exec(text)) !== null) {
    const run = match[0];
    const after = match.index + run.length;
    const closeAt = new RegExp(`(?<!\`)${run}(?!\`)`, 'u').exec(text.slice(after));
    if (closeAt === null) continue;
    const end = after + closeAt.index + run.length;
    spans.push([match.index, end]);
    ticks.lastIndex = end;
  }
  return spans;
}

const inside = (spans: readonly [number, number][], at: number): boolean => spans.some(([a, b]) => at >= a && at < b);

/** The text with every code span blanked to spaces of the same UTF-16 length, so offsets keep their meaning; one pass over the spans. */
function maskSpans(text: string, spans: readonly [number, number][]): string {
  let out = '', from = 0;
  for (const [a, b] of spans) { out += text.slice(from, a) + ' '.repeat(b - a); from = b; }
  return out + text.slice(from);
}

/** The path references of one claim, in order, each path once with every range written after any of its mentions. */
export function referencesIn(text: string): TextReference[] {
  const spans = codeSpans(text);
  const found = new Map<string, { ranges: LineRange[]; alone: boolean }>();
  for (const match of text.matchAll(PATH_RUN)) {
    let token = match[0];
    const at = match.index;
    // A host after `@` or `www.` is no repository path, and a glob (`*_test.c`) names no one file. An absolute path and a URL's
    // `//host/...` have an empty first segment, which the segment rule below drops.
    if (text[at - 1] === '@' || /^www\./iu.test(token) || /[*?]$/u.test(text.slice(0, at))) continue;
    while (/[.\-+]$/u.test(token)) token = token.slice(0, -1);
    const end = at + token.length;
    if (token.endsWith('/') || token.length === 0) continue;
    const pathText = token.startsWith('./') ? token.slice(2) : token;
    const segments = pathText.split('/');
    if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) continue;
    const extension = /\.([A-Za-z][A-Za-z0-9]{0,7})$/u.exec(pathText)?.[1];
    const slash = segments.length > 1;
    const ranges = rangesAfter(text.slice(end));
    // A name that is only an extension (`.c`) is a kind of file, not a file; a slashed name without an extension (`tests/unit`) is
    // usually a directory, so it is a reference only with lines written after it.
    const bareExtension = segments.length === 1 && pathText.startsWith('.') && extension !== undefined && pathText === `.${extension}` && BARE_EXTENSIONS.has(extension.toLowerCase());
    // A bare dotfile (`.env`, `.gitignore`) is a path when written as code.
    const dotfile = segments.length === 1 && pathText.startsWith('.') && inside(spans, at);
    const known = extension === undefined ? false : WEAK_EXTENSIONS.has(extension.toLowerCase()) ? inside(spans, at) : BARE_EXTENSIONS.has(extension.toLowerCase());
    const isPath = bareExtension ? false : dotfile || (extension !== undefined ? slash || known || ranges.length > 0 : slash && ranges.length > 0);
    if (!isPath) continue;
    const entry = found.get(pathText) ?? { ranges: [] as LineRange[], alone: false };
    found.set(pathText, entry);
    if (ranges.length === 0) entry.alone = true;
    for (const range of ranges) if (!entry.ranges.some((k) => k.start === range.start && k.end === range.end)) entry.ranges.push(range);
  }
  return [...found].map(([path, { ranges, alone }]) => (alone && ranges.length > 0 ? { path, ranges, wholeFile: true as const } : { path, ranges }));
}

/** The line ranges written right after a path: `:N`, `:N-M`, `#LN-LM`, or one or more `, lines N-M`. A closing backtick may sit between. */
function rangesAfter(rest: string): LineRange[] {
  const tail = rest.startsWith('`') ? rest.slice(1) : rest;
  const one = (a: string, b: string | undefined): LineRange => ({ start: Number(a), end: Number(b ?? a) });
  const colon = COLON_LINES.exec(tail) ?? ANCHOR_LINES.exec(tail);
  if (colon !== null) return [one(colon[1]!, colon[2])];
  const out: LineRange[] = [];
  let remaining = tail;
  for (let match = WORD_LINES.exec(remaining); match !== null; match = WORD_LINES.exec(remaining)) {
    out.push(one(match[1]!, match[2]));
    remaining = remaining.slice(match[0].length);
  }
  return out;
}

/** The double-quoted spans of one claim outside code spans, in order; a span with no letter or digit is not a quotation. */
export function quotationsIn(text: string): string[] {
  const spans = codeSpans(text);
  const masked = maskSpans(text, spans);
  const found: { at: number; inner: string }[] = [];
  const curly: [number, number][] = [];
  for (const match of masked.matchAll(CURLY_QUOTE)) {
    curly.push([match.index, match.index + match[0].length]);
    if (HAS_WORD.test(match[1]!)) found.push({ at: match.index, inner: match[1]! });
  }
  // A straight-quoted span inside a curly quotation is part of that quotation, not one of its own.
  const straight = masked.replace(CURLY_QUOTE, (whole) => ' '.repeat(whole.length));
  for (const match of straight.matchAll(STRAIGHT_QUOTE)) if (HAS_WORD.test(match[1]!)) found.push({ at: match.index, inner: match[1]! });
  return found.sort((a, b) => a.at - b.at).map((entry) => entry.inner);
}

/** Whether a quotation opened in a claim's text so far is still open: an odd count of straight quotes, or a curly open without its close. */
function quotationOpen(text: string): boolean {
  const spans = codeSpans(text);
  const masked = maskSpans(text, spans);
  const curlyLeft = masked.replace(CURLY_QUOTE, '');
  if (curlyLeft.includes('“')) return true;
  return (curlyLeft.match(/"/gu)?.length ?? 0) % 2 === 1;
}

// ---- verification through the dossier check's derivation ----

const LEAD_IN = 'The project states: "';
const unbounded = { type: 'string', minLength: 0, maxLength: 1 << 24 } as const;
const line = { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER } as const;
/** The synthetic subject's closed schema: a pinned revision and a list of blocks, each with at most one quotation of its citations. */
const SUBJECT_SCHEMA: DraftSchemaWithDefs = {
  root: object({
    pinnedRevision: unbounded,
    blocks: { type: 'array', minItems: 0, maxItems: Number.MAX_SAFE_INTEGER, items: object({
      id: unbounded, label: unbounded, text: unbounded,
      citations: { type: 'array', minItems: 1, maxItems: 1, items: object({ id: unbounded, path: unbounded, startLine: line, endLine: line }) },
      quotations: { type: 'array', minItems: 0, maxItems: 1, items: unbounded },
    }) },
  }),
  defs: {},
};

const RULES: SubjectRules = {
  noun: 'draft',
  schema: SUBJECT_SCHEMA,
  maxQuestions: null,
  structural: () => undefined,
  blocks: (doc) => (Array.isArray(doc['blocks']) ? doc['blocks'] : []).map((value, i) => ({
    at: `$.blocks[${i}]`, value: value as Readonly<Record<string, unknown>>, textKey: 'text', allowed: ['inferred'], quotable: 'inferred', unquotable: '',
  })),
  account: { key: 'discovery', parts: [] },
};

interface SyntheticBlock { readonly id: string; readonly path: string; readonly start: number; readonly end: number; readonly quote?: string }

async function derive(pinned: string, blocks: readonly SyntheticBlock[], inputs: DeriveInputs): Promise<Derived> {
  const subject = {
    pinnedRevision: pinned,
    blocks: blocks.map((block) => ({
      id: block.id, label: 'inferred', text: block.quote === undefined ? '' : `${LEAD_IN}${block.quote}"`,
      citations: [{ id: `${block.id}-c`, path: block.path, startLine: block.start, endLine: block.end }],
      quotations: block.quote === undefined ? [] : [`${block.id}-c`],
    })),
  };
  const derived = await deriveFindings(subject, inputs, RULES);
  const unexpected = derived.findings.filter((finding) => !EXPECTED_FINDINGS.has(finding.kind));
  if (unexpected.length > 0) throw new Error(`the synthetic subject drew findings it never should: ${unexpected.map((finding) => finding.kind).join(', ')}`);
  return derived;
}

const validLine = (n: number): boolean => Number.isSafeInteger(n) && n >= 1;

/** The finding kinds a synthetic subject may draw: the reference and quotation faults this module reads back. */
const EXPECTED_FINDINGS: ReadonlySet<string> = new Set(['path-absent', 'range-invalid', 'range-beyond-blob',
  'quotation-empty', 'quotation-elided', 'quotation-not-in-cited-file', 'quotation-outside-range']);

/** Check every claim's references and quotations at the pinned revision, through `deriveFindings`. */
export async function verifyClaims(extracted: ExtractedText, inputs: DeriveInputs): Promise<VerifiedText> {
  const isSecretPath = secretPathOf(inputs.screen);
  // A written path names the blob at that path, or else the one blob whose path ends with `/<written>` (a bare `server.c` for
  // `src/server.c`); none or several leave it as written, which pass 1 reports absent. The listing reads no body.
  const blobs: string[] = [];
  for (const entry of await inputs.reader.listTree()) if (BLOB_MODES.has(entry.mode)) blobs.push(entry.path);
  const listed = new Set(blobs);
  // Blobs by base name, so a written name is compared only with the blobs that end in its own base name (one pass over the listing).
  const byBase = new Map<string, string[]>();
  for (const blob of blobs) {
    const base = blob.slice(blob.lastIndexOf('/') + 1);
    const known = byBase.get(base);
    if (known === undefined) byBase.set(base, [blob]); else known.push(blob);
  }
  const resolution = new Map<string, string>();
  const resolve = (written: string): string => {
    let found = resolution.get(written);
    if (found === undefined) {
      const candidates = listed.has(written) ? [written]
        : (byBase.get(written.slice(written.lastIndexOf('/') + 1)) ?? []).filter((blob) => blob.endsWith(`/${written}`));
      found = candidates.length === 1 ? candidates[0]! : written;
      resolution.set(written, found);
    }
    return found;
  };
  const resolvedClaims = extracted.claims.map((claim) => ({ ...claim, references: claim.references.map((reference) => ({ ...reference, written: reference.path, path: resolve(reference.path) })) }));
  // Pass 1: each distinct path once, to learn whether it is absent, withheld or admitted, and an admitted file's line count.
  const paths = [...new Set(resolvedClaims.flatMap((claim) => claim.references.map((reference) => reference.path)))];
  const first = paths.length === 0 ? null : await derive(inputs.pinned, paths.map((path, i) => ({ id: `p${i}`, path, start: 1, end: 1 })), inputs);
  const absent = new Set((first?.findings ?? []).filter((finding) => finding.kind === 'path-absent').map((finding) => paths[Number(finding.citationId!.slice(1, -2))]!));
  const linesOf = new Map<string, number>();
  for (const [path, body] of first?.admitted ?? []) linesOf.set(path, body.retainedLines?.length ?? lineCount(body.raw));
  const stateOf = (path: string): 'missing' | 'withheld' | 'admitted' => (absent.has(path) ? 'missing' : linesOf.has(path) ? 'admitted' : 'withheld');

  // Pass 2: every range of every admitted reference, and every quotation against every range of every admitted reference of its claim.
  // A range below line 1 or past the largest safe integer names no lines; it is a fault here and never reaches the derivation, whose
  // schema would refuse it. A quotation holding the lead-in would split the synthetic lead-in in two; it is not found, never derived.
  const blocks: SyntheticBlock[] = [];
  const faultOf = new Map<string, string>();
  const rangesOf = (reference: { readonly path: string; readonly ranges: readonly LineRange[]; readonly wholeFile?: true }): LineRange[] => {
    const lines = linesOf.get(reference.path) ?? 0;
    const whole = lines === 0 ? [] : [{ start: 1, end: lines }];
    return reference.ranges.length === 0 ? whole : reference.wholeFile === true ? [...reference.ranges, ...whole] : [...reference.ranges];
  };
  resolvedClaims.forEach((claim, c) => {
    claim.references.forEach((reference, r) => {
      if (stateOf(reference.path) !== 'admitted') return;
      rangesOf(reference).forEach((range, k) => {
        if (!validLine(range.start) || !validLine(range.end)) { faultOf.set(`c${c}r${r}k${k}`, 'range-invalid'); return; }
        blocks.push({ id: `c${c}r${r}k${k}`, path: reference.path, start: range.start, end: range.end });
        claim.quotations.forEach((quote, q) => {
          if (!quote.includes(QUOTE_LEAD_IN)) blocks.push({ id: `c${c}r${r}k${k}q${q}`, path: reference.path, start: range.start, end: range.end, quote });
        });
      });
    });
  });
  const second = blocks.length === 0 ? null : await derive(inputs.pinned, blocks, inputs);
  for (const finding of second?.findings ?? []) {
    if (finding.citationId !== undefined && (finding.kind === 'range-invalid' || finding.kind === 'range-beyond-blob')) faultOf.set(finding.citationId.slice(0, -2), finding.kind);
    else if (finding.blockId !== undefined) faultOf.set(finding.blockId, finding.kind);
  }
  const verified = new Set((second?.quotations ?? []).map((quotation) => quotation.blockId));
  const excluded = new Set((second?.excludedContent ?? []).map((entry) => entry.blockId));

  const claims = resolvedClaims.map((claim, c): CheckedClaim => {
    const references = claim.references.map((reference, r): CheckedReference => {
      const state = stateOf(reference.path);
      const named = !isSecretPath(reference.path) && !isSecretPath(reference.written);
      const shown = { written: named ? reference.written : null, path: named && state !== 'missing' ? reference.path : null,
        ranges: reference.ranges, ...(reference.wholeFile === true ? { wholeFile: true as const } : {}) };
      if (state !== 'admitted') return { ...shown, state };
      const beyond = reference.ranges.some((_, k) => faultOf.has(`c${c}r${r}k${k}`));
      return { ...shown, state: beyond ? 'lines-missing' : 'resolves' };
    });
    if (claim.references.length === 0) {
      return { index: claim.index, startLine: claim.startLine, endLine: claim.endLine, outcome: 'unanchored', references, quotations: [], uncheckedQuotations: claim.quotations.length };
    }
    const quotations = claim.quotations.map((quote, q): QuotationState => {
      if (quote.includes(QUOTE_LEAD_IN)) return 'not-found';
      let withheld = false, tried = false;
      for (const [r, reference] of claim.references.entries()) {
        if (references[r]!.state === 'withheld') { withheld = true; continue; }
        if (references[r]!.state !== 'resolves') continue;
        const ranges = rangesOf(reference).length;
        for (let k = 0; k < ranges; k++) {
          const id = `c${c}r${r}k${k}q${q}`;
          tried = true;
          if (verified.has(id)) return 'verified';
          if (excluded.has(id)) withheld = true;
        }
      }
      return withheld ? 'withheld' : tried ? 'not-found' : 'no-file';
    });
    const outcome: ClaimOutcome = references.some((reference) => reference.state === 'missing' || reference.state === 'lines-missing') ? 'path-missing'
      : quotations.some((state) => state === 'not-found' || state === 'no-file') ? 'quotation-not-found'
        : references.some((reference) => reference.state === 'withheld') || quotations.some((state) => state === 'withheld') ? 'withheld'
          : quotations.length > 0 ? 'quotation-verified' : 'reference-unverified';
    return { index: claim.index, startLine: claim.startLine, endLine: claim.endLine, outcome, references, quotations, uncheckedQuotations: 0 };
  });

  const tally = Object.fromEntries(CLAIM_OUTCOMES.map((outcome) => [outcome, claims.filter((claim) => claim.outcome === outcome).length])) as Record<ClaimOutcome, number>;
  const referenceStates: ReferenceState[] = ['resolves', 'missing', 'lines-missing', 'withheld'];
  const quotationStates: (QuotationState | 'unanchored')[] = ['verified', 'not-found', 'withheld', 'no-file', 'unanchored'];
  const allReferences = claims.flatMap((claim) => claim.references);
  const allQuotations = claims.flatMap((claim) => claim.quotations);
  return {
    claims,
    tally,
    items: {
      references: Object.fromEntries(referenceStates.map((state) => [state, allReferences.filter((reference) => reference.state === state).length])) as Record<ReferenceState, number>,
      quotations: Object.fromEntries(quotationStates.map((state) => [state, state === 'unanchored'
        ? claims.reduce((sum, claim) => sum + claim.uncheckedQuotations, 0) : allQuotations.filter((entry) => entry === state).length])) as Record<QuotationState | 'unanchored', number>,
    },
    skipped: extracted.skipped,
  };
}

// ---- the annotated copy ----

const describeRange = (range: LineRange): string => (range.start === range.end ? `line ${range.start}` : `lines ${range.start}-${range.end}`);

/** What the closing section says in place of a path whose name screening withholds. */
export const WITHHELD_BY_NAME = '(a path screening withholds by name)';
export const uncheckedWords = (count: number): string => `${count} quotation(s) not checked: the claim names no file`;

/** One reference as the results name it: the path as written and, where it differs, the blob it resolves to; null where screening
 * withholds the path by name, so no rendering of the results can name it. */
export interface ReferenceResult {
  readonly named: { readonly written: string; readonly resolved?: string } | null;
  /** The lines checked, as words: `whole file`, `line N`, `lines N-M`, comma-separated. */
  readonly where: string;
  readonly state: ReferenceState;
}
export interface ClaimResult {
  readonly index: number;
  readonly startLine: number;
  readonly outcome: ClaimOutcome;
  readonly references: readonly ReferenceResult[];
  readonly quotations: readonly QuotationState[];
  readonly uncheckedQuotations: number;
}

/** The results of each claim that names a file or quotes, in text order: what the annotated copy's closing section and the HTML page
 * (`verify-text-page.ts`) both list, so neither can name what the other withholds. */
export function claimResults(verified: VerifiedText): ClaimResult[] {
  return verified.claims.filter((claim) => claim.references.length > 0 || claim.uncheckedQuotations > 0).map((claim) => ({
    index: claim.index, startLine: claim.startLine, outcome: claim.outcome,
    references: claim.references.map((reference) => ({
      named: reference.written === null ? null
        : reference.path !== null && reference.path !== reference.written ? { written: reference.written, resolved: reference.path } : { written: reference.written },
      where: reference.ranges.length === 0 ? 'whole file' : [...reference.ranges.map(describeRange), ...(reference.wholeFile === true ? ['whole file'] : [])].join(', '),
      state: reference.state,
    })),
    quotations: claim.quotations, uncheckedQuotations: claim.uncheckedQuotations,
  }));
}

/** The text's lines without their terminators, and each line's terminator, as the annotated copy and the page split it. */
export function splitLines(markdown: string): { readonly lines: readonly string[]; readonly ends: readonly string[] } {
  const parts = markdown.split(/(\r\n|\r|\n)/u);
  return { lines: parts.filter((_, i) => i % 2 === 0), ends: parts.filter((_, i) => i % 2 === 1) };
}

/** The text with a marker `[verify C<n>: <outcome>]` at the end of every claim's last line (inside a table row's last cell), and a closing
 * section with the tally and, for each claim that names a file or quotes, what each reference and quotation came to. A withheld path
 * whose name screening withholds is never named in the section. */
export function annotateText(markdown: string, verified: VerifiedText, heading: { readonly pinned: string; readonly file: string }): string {
  // Each line keeps its own terminator (LF, CRLF or CR), so the copy differs from the text only by the markers and the section.
  const { lines, ends } = splitLines(markdown);
  const eol = ends[0] ?? '\n';
  const lastOf = new Map(verified.claims.map((claim) => [claim.endLine, claim]));
  const out = lines.map((text, i) => {
    const claim = lastOf.get(i + 1);
    if (claim === undefined) return text;
    const marker = ` [verify C${claim.index}: ${claim.outcome}]`;
    const trimmed = text.replace(/\s+$/u, '');
    return TABLE_ROW.test(text) && trimmed.endsWith('|') && !trimmed.endsWith('\\|') ? `${trimmed.slice(0, -1).replace(/\s+$/u, '')}${marker} |` : `${trimmed}${marker}`;
  });
  const section = [
    '', '---', '', '## Verification', '',
    `Checked against the pinned revision ${heading.pinned}; text ${heading.file}.`, '',
    ...VERIFY_TEXT_DISCLOSURES.map((line) => `- ${line}`), '',
    '| Outcome | Claims |', '|---|---|',
    ...CLAIM_OUTCOMES.map((outcome) => `| ${outcome} | ${verified.tally[outcome]} |`),
    `| total | ${verified.claims.length} |`, '',
  ];
  for (const result of claimResults(verified)) {
    section.push(`- C${result.index} (line ${result.startLine}): ${result.outcome}`);
    for (const reference of result.references) {
      const named = reference.named === null ? WITHHELD_BY_NAME
        : reference.named.resolved !== undefined ? `\`${reference.named.written}\` (\`${reference.named.resolved}\`)` : `\`${reference.named.written}\``;
      section.push(`  - reference ${named}, ${reference.where}: ${reference.state}`);
    }
    result.quotations.forEach((state, q) => section.push(`  - quotation ${q + 1}: ${state}`));
    if (result.uncheckedQuotations > 0) section.push(`  - ${uncheckedWords(result.uncheckedQuotations)}`);
  }
  const body = out.map((text, i) => text + (ends[i] ?? '')).join('').replace(/(\r\n|\r|\n)*$/u, '');
  return `${body}${eol}${section.join(eol)}${eol}`;
}

/** Extract, verify and annotate one text. */
export async function verifyText(markdown: string, inputs: DeriveInputs, file: string): Promise<{ readonly verified: VerifiedText; readonly annotated: string }> {
  const verified = await verifyClaims(extractClaims(markdown), inputs);
  return { verified, annotated: annotateText(markdown, verified, { pinned: inputs.pinned, file }) };
}
