import { isRecord, sha256 } from '@syzygy/support';
import { digestCanonicalJson } from './canonical-json.js';
import { parseBoundedJson } from './parse-json.js';
import { generationSourceTextAt, validateGenerationSources, type GenerationSource } from './generation-source.js';
import { inspectBlockQuotes, sourceTextById } from './quote-fidelity.js';
import { OWNER_TOPICS, READER_QUESTIONS_FORMAT, type OwnerTopic, type ReaderQuestion } from './topics.js';
import { DossierEvaluationError, type DossierManifest, EPISTEMIC, type Epistemic, JSON_LIMITS, onlyKeys, parseDossierManifest, parseReaderQuestions } from './dossier-manifest.js';
import { type ScannedPage, type ScannedQuote, scanDossierPage } from './dossier-page-scan.js';
import { type ReaderPortFactory, runReaderTest, topicCoverage } from './dossier-reader-test.js';
export { DOSSIER_FORMAT, DossierEvaluationError, isDossierPagePath, parseDossierManifest, parseReaderQuestions } from './dossier-manifest.js';
export type { DossierManifest } from './dossier-manifest.js';
export { decodeHtmlText, scanDossierPage } from './dossier-page-scan.js';
export type { ScannedSection, ScannedClaim, ScannedQuote, ScannedPage } from './dossier-page-scan.js';
export { scriptedAnswers, runReaderTest, topicCoverage } from './dossier-reader-test.js';
export type { ReaderLocation, ReaderAnswer, ReaderAnswerPort, ReaderPortFactory } from './dossier-reader-test.js';

/**
 * Evaluation harness for a generated static Polaris dossier (TRACKER G5,
 * gap #10). Pure: the caller supplies the dossier's bytes, the admitted
 * sources, the frozen reader questions and an answer port. It measures and
 * records; it never grades a reader's answer, awards acceptance or calls a
 * model. Absent evidence is reported as Unknown, never as a pass (VIS-2).
 *
 * Input format (`polaris-dossier-v1`), agreed with the multi-page output
 * (gap #8):
 * - `dossier.json`: `{ format, title, entryPage, pages: [{ path, depth }] }`.
 *   The entry page is the only page at depth 0.
 * - Page markup, read from the bytes, never from the manifest:
 *   `data-reading-level="n"` (0 is the first reading level);
 *   `<section id data-topics="…">` names the owner topics a section claims to
 *   answer; `data-claim-id` with `data-epistemic="observed|inferred|unknown"`;
 *   `data-quote-source`, `data-quote-start`, `data-quote-end` (UTF-8 byte
 *   offsets into the admitted body) on an element whose decoded text is
 *   exactly those bytes.
 */

export { OWNER_TOPICS, READER_QUESTIONS_FORMAT, type OwnerTopic, type ReaderQuestion } from './topics.js';
// ---------------------------------------------------------------------------
// Page scanning. A small tag scanner, not a general HTML parser: generated
// dossier pages are well-formed, and anything it cannot read is a finding.

// ---------------------------------------------------------------------------
// (a) Reader cost.

export interface PageBudget {
  readonly maxFirstLevelWords?: number;
  readonly maxFirstLevelBytes?: number;
  readonly maxPageBytes?: number;
  readonly maxTotalBytes?: number;
}
export type BoundOutcome = { readonly bound: number; readonly observed: number; readonly outcome: 'within' | 'over' }
  | { readonly outcome: 'unknown'; readonly reason: 'no-budget-declared' | 'not-measurable' };

export function parsePageBudget(text: string): PageBudget {
  let value: unknown;
  try { value = parseBoundedJson(text, JSON_LIMITS); } catch { throw new DossierEvaluationError('invalid-manifest'); }
  const keys = ['maxFirstLevelWords', 'maxFirstLevelBytes', 'maxPageBytes', 'maxTotalBytes'];
  if (!isRecord(value) || !onlyKeys(value, keys) || Object.values(value).some(bound => !Number.isSafeInteger(bound) || (bound as number) <= 0)) {
    throw new DossierEvaluationError('invalid-manifest');
  }
  return value as PageBudget;
}

function bound(limit: number | undefined, observed: number | null): BoundOutcome {
  if (limit === undefined) return { outcome: 'unknown', reason: 'no-budget-declared' };
  if (observed === null) return { outcome: 'unknown', reason: 'not-measurable' };
  return { bound: limit, observed, outcome: observed <= limit ? 'within' : 'over' };
}

export function readerCost(manifest: DossierManifest, scanned: ReadonlyMap<string, ScannedPage>, budget: PageBudget = {}) {
  const entry = scanned.get(manifest.entryPage)!;
  const firstLevelWords = entry.words.byLevel['0'] ?? null;
  const pages = manifest.pages.map(page => {
    const scan = scanned.get(page.path)!;
    return { path: page.path, depth: page.depth, bytes: scan.bytes, wordsByReadingLevel: scan.words.byLevel, unlabelledWords: scan.words.unlabelled, pageBudget: bound(budget.maxPageBytes, scan.bytes) };
  });
  const depths = [...new Set(manifest.pages.map(page => page.depth))].sort((a, b) => a - b);
  const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0);
  const totalBytes = sum(pages.map(page => page.bytes));
  return {
    firstReadingLevel: {
      page: manifest.entryPage,
      entryPageBytes: entry.bytes,
      bytesThroughFirstLevel: entry.bytesThroughFirstLevel,
      // Null, not zero, when the entry page marks no level-0 content (VIS-2).
      words: firstLevelWords,
      wordBudget: bound(budget.maxFirstLevelWords, firstLevelWords),
      byteBudget: bound(budget.maxFirstLevelBytes, entry.bytesThroughFirstLevel),
    },
    perPageDepth: depths.map(depth => {
      const atDepth = pages.filter(page => page.depth === depth);
      return { depth, pages: atDepth.length, bytes: sum(atDepth.map(page => page.bytes)), words: sum(atDepth.map(page => sum(Object.values(page.wordsByReadingLevel)) + page.unlabelledWords)) };
    }),
    perReadingLevel: Object.fromEntries([...new Set(pages.flatMap(page => Object.keys(page.wordsByReadingLevel)))].sort((a, b) => Number(a) - Number(b))
      .map(level => [level, sum(pages.map(page => page.wordsByReadingLevel[level] ?? 0))])),
    unlabelledWords: sum(pages.map(page => page.unlabelledWords)),
    pages,
    totalBytes,
    totalBudget: bound(budget.maxTotalBytes, totalBytes),
  };
}

// ---------------------------------------------------------------------------
// (b) Fidelity: quotes resolve exactly to admitted bytes; every claim is labelled.

export type QuoteOutcome = 'exact' | 'text-mismatch' | 'unknown-source' | 'unquotable-source' | 'invalid-offsets' | 'out-of-range' | 'crosses-piece-boundary' | 'not-utf8-boundary';

function admittedBody(source: GenerationSource): string | null {
  if (source.exclusion.excluded || source.classificationBasis !== 'body') return null;
  if (source.body !== undefined) return source.body;
  const only = source.spans.length === 1 ? source.spans[0]! : undefined;
  return only !== undefined && only.start === 0 ? only.text : null;
}

/** Quote offsets are blob-absolute UTF-8 byte offsets, the same base as the
 * anchors: a piece of a segmented blob resolves them by subtracting its
 * `segment.start`, and a quote must lie wholly inside the named piece. */
export function resolveQuote(quote: ScannedQuote, sources: ReadonlyMap<string, GenerationSource>): QuoteOutcome {
  const source = quote.sourceId === null ? undefined : sources.get(quote.sourceId);
  if (source === undefined) return 'unknown-source';
  const body = admittedBody(source);
  if (body === null) return 'unquotable-source';
  if (quote.start === null || quote.end === null || !/^(?:0|[1-9]\d{0,9})$/u.test(quote.start) || !/^(?:0|[1-9]\d{0,9})$/u.test(quote.end)) return 'invalid-offsets';
  const start = Number(quote.start);
  const end = Number(quote.end);
  if (source.redaction !== undefined) {
    if (end <= start) return 'invalid-offsets';
    const text = generationSourceTextAt(source, start, end);
    return text === undefined ? 'out-of-range' : text === quote.text ? 'exact' : 'text-mismatch';
  }
  const bytes = Buffer.from(body, 'utf8');
  if (end <= start) return 'invalid-offsets';
  const base = source.segment?.start ?? 0;
  if (source.segment !== undefined && (start < base || end > source.segment.end)) {
    return start < source.segment.end && end > base ? 'crosses-piece-boundary' : 'out-of-range';
  }
  if (end - base > bytes.length) return 'out-of-range';
  let decoded: string;
  try { decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(start - base, end - base)); }
  catch { return 'not-utf8-boundary'; }
  return decoded === quote.text ? 'exact' : 'text-mismatch';
}

export function fidelity(manifest: DossierManifest, scanned: ReadonlyMap<string, ScannedPage>, sources: readonly GenerationSource[]) {
  validateGenerationSources(sources);
  const index = new Map(sources.map(source => [source.sourceId, source]));
  const quotes = manifest.pages.flatMap(page => scanned.get(page.path)!.quotes.map(quote => ({
    page: page.path, sourceId: quote.sourceId, start: quote.start, end: quote.end, outcome: resolveQuote(quote, index),
  })));
  const claimIds = new Map<string, number>();
  const claims = manifest.pages.flatMap(page => scanned.get(page.path)!.claims.map(claim => {
    claimIds.set(claim.id, (claimIds.get(claim.id) ?? 0) + 1);
    const label = claim.epistemic === null ? 'missing-label' as const
      : (EPISTEMIC as readonly string[]).includes(claim.epistemic) ? claim.epistemic as Epistemic : 'invalid-label' as const;
    return { page: page.path, claimId: claim.id, label, hasQuote: claim.hasQuote };
  }));
  // Quotation marks inside a cited block: every quoted span must occur, normalised, in a source that block cites. A claim naming no source is not a block.
  const sourceText = sourceTextById(sources);
  const checkedBlocks = manifest.pages.flatMap(page => scanned.get(page.path)!.claims.filter(claim => claim.citedSourceIds.length > 0).map(claim => ({ page: page.path, claim })));
  const inspected = checkedBlocks.map(({ page, claim }) => ({ page, ...inspectBlockQuotes({ id: claim.id, text: claim.text, sourceIds: claim.citedSourceIds }, sourceText) }));
  const quotesChecked = inspected.reduce((total, row) => total + row.quotes, 0);
  const quoteFailures = inspected.flatMap(row => row.findings.map(finding => ({ page: row.page, claimId: finding.blockId, kind: finding.kind, quote: finding.quote })));
  const failedQuotes = quotes.filter(quote => quote.outcome !== 'exact');
  const unlabelled = claims.filter(claim => claim.label === 'missing-label' || claim.label === 'invalid-label');
  const duplicateClaimIds = [...claimIds].filter(([, count]) => count > 1).map(([id]) => id).sort();
  const outcome = <T extends string>(population: number, failures: number, pass: T): T | 'failures' | 'unknown' =>
    failures > 0 ? 'failures' : population === 0 ? 'unknown' : pass;
  return {
    quotes: { denominator: quotes.length, exact: quotes.length - failedQuotes.length, failures: failedQuotes.map(({ page, sourceId, start, end, outcome: result }) => ({ page, sourceId, start, end, outcome: result })), outcome: outcome(quotes.length, failedQuotes.length, 'all-resolved') },
    inBlockQuotes: { denominator: checkedBlocks.length, quotesChecked, failures: quoteFailures,
      outcome: quoteFailures.length > 0 ? 'failures' as const : checkedBlocks.length === 0 ? 'unknown' as const : quotesChecked === 0 ? 'no-quotes' as const : 'all-verbatim' as const },
    claims: {
      denominator: claims.length,
      labelled: claims.length - unlabelled.length,
      byLabel: Object.fromEntries(EPISTEMIC.map(label => [label, claims.filter(claim => claim.label === label).length])),
      // A label is checked for presence and vocabulary only. An Observed claim
      // carrying no quote of its own has no exact-source check behind it here.
      observedWithoutQuote: claims.filter(claim => claim.label === 'observed' && !claim.hasQuote).map(({ page, claimId }) => ({ page, claimId })),
      unlabelled: unlabelled.map(({ page, claimId, label }) => ({ page, claimId, label })),
      duplicateClaimIds,
      outcome: outcome(claims.length, unlabelled.length + duplicateClaimIds.length, 'all-labelled'),
    },
  };
}

// ---------------------------------------------------------------------------
// The whole evaluation over one dossier.

export interface DossierEvaluationInput {
  readonly manifestText: string;
  /** Raw page bytes by manifest path; every manifest page must be present. */
  readonly pages: ReadonlyMap<string, Uint8Array>;
  readonly sources: readonly GenerationSource[];
  readonly questionsText: string;
  /** When set, the questions file must hash to this digest: the freeze. */
  readonly expectedQuestionsSha256?: string;
  readonly budget?: PageBudget;
  /** Absent: the reader test is not run and every topic stays declared-only or Unknown. */
  readonly readers?: ReaderPortFactory;
}

/** Canonical digest over the admitted population: each source's identity,
 * segment, exclusion and a SHA-256 of its body, in source-id order. */
export function admittedSourcesDigest(sources: readonly GenerationSource[]): { readonly count: number; readonly sha256: string } {
  if (sources.some(source => source.redaction !== undefined)) validateGenerationSources(sources);
  const rows = [...sources].sort((a, b) => (a.sourceId < b.sourceId ? -1 : a.sourceId > b.sourceId ? 1 : 0)).map(source => ({
    sourceId: source.sourceId, repositoryId: source.repositoryId, revision: source.revision, path: source.path, objectId: source.objectId,
    segment: source.segment === undefined ? null : { ...source.segment }, exclusion: { ...source.exclusion },
    ...(source.redaction === undefined ? {} : { redaction: source.redaction, spans: source.spans }),
    bodySha256: source.body === undefined ? null : sha256(source.body),
  }));
  return { count: rows.length, sha256: digestCanonicalJson(rows, { maxBytes: 64_000_000, maxNodes: 4_000_000, maxDepth: 8 }).digest };
}

export async function evaluateDossier(input: DossierEvaluationInput, signal: AbortSignal) {
  const manifest = parseDossierManifest(input.manifestText);
  const questions = parseReaderQuestions(input.questionsText);
  const questionsSha256 = sha256(input.questionsText);
  if (input.expectedQuestionsSha256 !== undefined && input.expectedQuestionsSha256 !== questionsSha256) throw new DossierEvaluationError('questions-not-frozen');
  const html = new Map<string, string>();
  const scanned = new Map<string, ScannedPage>();
  for (const page of manifest.pages) {
    const bytes = input.pages.get(page.path);
    if (bytes === undefined) throw new DossierEvaluationError('missing-page');
    const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    html.set(page.path, text);
    scanned.set(page.path, scanDossierPage(text));
  }
  const reader = input.readers === undefined ? null : await runReaderTest(questions, manifest, html, scanned, input.readers, signal);
  return {
    format: 'polaris-dossier-evaluation-v1',
    subject: {
      manifestSha256: sha256(input.manifestText),
      pages: manifest.pages.map(page => ({ path: page.path, sha256: sha256(input.pages.get(page.path)!) })),
      questionsSha256,
      sources: admittedSourcesDigest(input.sources),
      budgetSha256: input.budget === undefined ? null : digestCanonicalJson({ ...input.budget }, JSON_LIMITS).digest,
      readers: input.readers === undefined ? null : { kind: input.readers.kind, subjectSha256: input.readers.subjectSha256 },
    },
    title: manifest.title,
    scanFindings: manifest.pages.flatMap(page => scanned.get(page.path)!.findings.map(finding => ({ page: page.path, finding }))),
    readerCost: readerCost(manifest, scanned, input.budget),
    fidelity: fidelity(manifest, scanned, input.sources),
    readerTest: reader === null ? { run: false as const, reason: 'no answer port supplied' } : { run: true as const, readerPort: input.readers!.kind, results: reader },
    coverage: topicCoverage(manifest, scanned, questions, reader),
    providerCallPerformed: false,
  };
}
