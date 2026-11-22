import { lineCount, object } from '@syzygy/polaris-generation-core/live';
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

export const VERIFY_TEXT_DISCLOSURES: readonly string[] = [
  'The checker measures whether a claim can be checked and whether its quotation is real, not whether an unquoted claim is true: a reference that resolves says only that the file and lines exist at the pinned revision.',
  'A claim is a paragraph, a list item or a table row outside fenced code; a reference is a repository path, optionally with lines (path:N, path:N-M, path#LN-LM, "path, lines N-M"); a quotation is a double-quoted span (straight or curly) outside code spans.',
  'A quotation is checked only against the files its own claim names; a quotation in a claim that names no file is counted unanchored, never searched for.',
  'A path the screen withholds is reported withheld and never read; a quotation resting on withheld lines of a redacted file is withheld too.',
];

/** A line range, 1-based and inclusive, as written. */
export interface LineRange { readonly start: number; readonly end: number }

export interface TextReference {
  readonly path: string;
  /** The ranges written after the path; empty for a reference to the whole file. */
  readonly ranges: readonly LineRange[];
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
  /** Lines that are no claim: headings, fenced code (fences included) and table separator rows. */
  readonly skipped: { readonly headingLines: number; readonly fencedLines: number; readonly tableSeparatorLines: number };
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

/** File name extensions a bare name (no directory) must carry to count as a path: a bare `server.c` is a reference, `e.g.` is not. */
const BARE_EXTENSIONS: ReadonlySet<string> = new Set([
  'c', 'h', 'cc', 'cpp', 'cxx', 'hpp', 'hh', 'md', 'markdown', 'txt', 'rst', 'conf', 'cfg', 'ini', 'json', 'yaml', 'yml', 'toml', 'xml',
  'py', 'tcl', 'js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx', 'rs', 'go', 'sh', 'bash', 'lua', 'rb', 'java', 'kt', 'mk', 'cmake', 'html', 'css',
  'sql', 'proto', 'lock', 'in',
]);
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
const STRAIGHT_QUOTE = /"([^"\n]+)"/gu;
const CURLY_QUOTE = /“([^”\n]+)”/gu;
const HAS_WORD = /[\p{L}\p{N}]/u;

/** Split a Markdown text into claims and extract each claim's references and quotations. */
export function extractClaims(markdown: string): ExtractedText {
  const lines = markdown.split(/\r\n|\r|\n/u);
  const units: { start: number; end: number; text: string[] }[] = [];
  let open: { start: number; end: number; text: string[] } | null = null;
  let fence: string | null = null;
  let headingLines = 0, fencedLines = 0, tableSeparatorLines = 0;
  const close = (): void => { if (open !== null) units.push(open); open = null; };
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
      if (TABLE_SEPARATOR.test(line)) { tableSeparatorLines += 1; return; }
      units.push({ start: number, end: number, text: [line] });
      return;
    }
    if (LIST_ITEM.test(line)) close();
    if (open === null) open = { start: number, end: number, text: [line] };
    else { open.end = number; open.text.push(line); }
  });
  close();
  return {
    claims: units.map((unit, k) => {
      const text = unit.text.join('\n');
      return { index: k + 1, startLine: unit.start, endLine: unit.end, references: referencesIn(text), quotations: quotationsIn(text) };
    }),
    skipped: { headingLines, fencedLines, tableSeparatorLines },
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

/** The path references of one claim, in order, each path once with every range written after any of its mentions. */
export function referencesIn(text: string): TextReference[] {
  const spans = codeSpans(text);
  const found = new Map<string, LineRange[]>();
  for (const match of text.matchAll(PATH_RUN)) {
    let token = match[0];
    const at = match.index;
    // A URL, an e-mail address or a host name is no repository path.
    const before = text.slice(Math.max(0, at - 3), at);
    if (before.endsWith('://') || before.endsWith('@') || /^(?:www\.|https?)/iu.test(token) || token.includes('//')) continue;
    // An absolute path, or a glob (`*.c`), names no one file of the repository.
    if (token.startsWith('/') || /[*?]$/u.test(text.slice(0, at))) continue;
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
    const isPath = bareExtension ? false : dotfile || (extension !== undefined ? slash || BARE_EXTENSIONS.has(extension.toLowerCase()) || ranges.length > 0 : slash && ranges.length > 0);
    if (!isPath) continue;
    const known = found.get(pathText);
    if (known === undefined) found.set(pathText, [...ranges]);
    else for (const range of ranges) if (!known.some((k) => k.start === range.start && k.end === range.end)) known.push(range);
  }
  return [...found].map(([path, ranges]) => ({ path, ranges }));
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
  const masked = [...text].map((char, i) => (inside(spans, i) ? ' ' : char)).join('');
  const found: { at: number; inner: string }[] = [];
  for (const pattern of [STRAIGHT_QUOTE, CURLY_QUOTE]) {
    for (const match of masked.matchAll(pattern)) if (HAS_WORD.test(match[1]!)) found.push({ at: match.index, inner: match[1]! });
  }
  return found.sort((a, b) => a.at - b.at).map((entry) => entry.inner);
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
  const resolution = new Map<string, string>();
  const resolve = (written: string): string => {
    let found = resolution.get(written);
    if (found === undefined) {
      const candidates = listed.has(written) ? [written] : blobs.filter((blob) => blob.endsWith(`/${written}`));
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
  const blocks: SyntheticBlock[] = [];
  resolvedClaims.forEach((claim, c) => {
    claim.references.forEach((reference, r) => {
      if (stateOf(reference.path) !== 'admitted') return;
      const lines = linesOf.get(reference.path)!;
      const ranges = reference.ranges.length > 0 ? reference.ranges : lines === 0 ? [] : [{ start: 1, end: lines }];
      ranges.forEach((range, k) => {
        blocks.push({ id: `c${c}r${r}k${k}`, path: reference.path, start: range.start, end: range.end });
        claim.quotations.forEach((quote, q) => blocks.push({ id: `c${c}r${r}k${k}q${q}`, path: reference.path, start: range.start, end: range.end, quote }));
      });
    });
  });
  const second = blocks.length === 0 ? null : await derive(inputs.pinned, blocks, inputs);
  const faultOf = new Map<string, string>();
  for (const finding of second?.findings ?? []) {
    if (finding.citationId !== undefined && (finding.kind === 'range-invalid' || finding.kind === 'range-beyond-blob')) faultOf.set(finding.citationId.slice(0, -2), finding.kind);
    else if (finding.blockId !== undefined) faultOf.set(finding.blockId, finding.kind);
  }
  const verified = new Set((second?.quotations ?? []).map((quotation) => quotation.blockId));
  const excluded = new Set((second?.excludedContent ?? []).map((entry) => entry.blockId));

  const claims = resolvedClaims.map((claim, c): CheckedClaim => {
    const references = claim.references.map((reference, r): CheckedReference => {
      const state = stateOf(reference.path);
      const named = !(state === 'withheld' && isSecretPath(reference.path));
      const shown = { written: named ? reference.written : null, path: named && state !== 'missing' ? reference.path : null };
      if (state !== 'admitted') return { ...shown, ranges: reference.ranges, state };
      const beyond = reference.ranges.some((_, k) => faultOf.has(`c${c}r${r}k${k}`));
      return { ...shown, ranges: reference.ranges, state: beyond ? 'lines-missing' : 'resolves' };
    });
    if (claim.references.length === 0) {
      return { index: claim.index, startLine: claim.startLine, endLine: claim.endLine, outcome: 'unanchored', references, quotations: [], uncheckedQuotations: claim.quotations.length };
    }
    const quotations = claim.quotations.map((_, q): QuotationState => {
      let withheld = false, tried = false;
      for (const [r, reference] of claim.references.entries()) {
        if (references[r]!.state === 'withheld') { withheld = true; continue; }
        if (references[r]!.state !== 'resolves') continue;
        const ranges = reference.ranges.length > 0 ? reference.ranges.length : (linesOf.get(reference.path) ?? 0) === 0 ? 0 : 1;
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

/** The text with a marker `[verify C<n>: <outcome>]` at the end of every claim's last line (inside a table row's last cell), and a closing
 * section with the tally and, for each claim that names a file or quotes, what each reference and quotation came to. A withheld path
 * whose name screening withholds is never named in the section. */
export function annotateText(markdown: string, verified: VerifiedText, heading: { readonly pinned: string; readonly file: string }): string {
  const lines = markdown.split(/\r\n|\r|\n/u);
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
  for (const claim of verified.claims) {
    if (claim.references.length === 0 && claim.uncheckedQuotations === 0) continue;
    section.push(`- C${claim.index} (line ${claim.startLine}): ${claim.outcome}`);
    for (const reference of claim.references) {
      const where = reference.ranges.length === 0 ? 'whole file' : reference.ranges.map(describeRange).join(', ');
      const named = reference.written === null ? '(a path screening withholds by name)'
        : reference.path !== null && reference.path !== reference.written ? `\`${reference.written}\` (\`${reference.path}\`)` : `\`${reference.written}\``;
      section.push(`  - reference ${named}, ${where}: ${reference.state}`);
    }
    claim.quotations.forEach((state, q) => section.push(`  - quotation ${q + 1}: ${state}`));
    if (claim.uncheckedQuotations > 0) section.push(`  - ${claim.uncheckedQuotations} quotation(s) not checked: the claim names no file`);
  }
  return `${out.join('\n').replace(/\n*$/u, '')}\n${section.join('\n')}\n`;
}

/** Extract, verify and annotate one text. */
export async function verifyText(markdown: string, inputs: DeriveInputs, file: string): Promise<{ readonly verified: VerifiedText; readonly annotated: string }> {
  const verified = await verifyClaims(extractClaims(markdown), inputs);
  return { verified, annotated: annotateText(markdown, verified, { pinned: inputs.pinned, file }) };
}
