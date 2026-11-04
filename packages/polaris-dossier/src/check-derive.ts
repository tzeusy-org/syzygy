import * as path from 'node:path';
import { UNKNOWN_REASONS } from '@syzygy/cap1-core';
import { leadInQuotations, lineCount, locateQuote, normaliseTracked, retainedWithMarkers, spanTouchesWithheld, verifiedRedactedBody, type VerifiedRedactedBody, type TrackedText } from '@syzygy/polaris-generation-core/live';
import { isRecord } from '@syzygy/support';
import { UNDERSTANDING_ITEMS, checkDraftShape, localDraftSchema, type DraftSchemaWithDefs } from './draft-schema.js';
import { BLOB_MODES, type PinnedObjectReader, type TreeEntry } from './git-object-reader.js';
import { type DossierScreen, type ScreenExclusion } from './screen.js';
import { type CheckFinding, type CitedBlob, type ExcludedQuotation, type VerifiedQuotation, blobRedaction, line, list, text } from './check-model.js';

/** `deriveFindings` and the draft's rules and walkers; split out of `check.ts` unchanged. */

/** What one derivation found. `admitted` holds the text of every cited blob this step read, re-hashed and screening admitted, by path:
 * the only bytes a render may quote or put on a source page. */
export interface Derived {
  readonly findings: CheckFinding[];
  readonly quotations: VerifiedQuotation[];
  readonly excludedContent: ExcludedQuotation[];
  readonly citedBlobs: CitedBlob[];
  /** Each admitted blob's text: the whole body, or for a body retained as `redacted-span` the retained text (every withheld line emptied,
   * its terminator kept) with the withheld line numbers. */
  readonly admitted: ReadonlyMap<string, { readonly objectId: string; readonly raw: string; readonly withheld?: readonly number[]; readonly detectorIds?: readonly string[];
    readonly retainedLines?: readonly string[]; readonly lineByteOffsets?: readonly number[]; readonly originalBytes?: number; readonly contentSha256?: string; readonly projection?: VerifiedRedactedBody;
    /** For a redacted body only: whether its complete body, scanned for active content as before, holds any (`DossierScreen.activeContentAsBefore`).
     * The complete body is not kept, so a page sink that cannot meet the renderCondition reads this instead of rescanning. */
    readonly activeContentAsBefore?: boolean }>;
}

export interface DeriveInputs {
  readonly pinned: string;
  readonly screen: DossierScreen;
  readonly reader: PinnedObjectReader;
}

/** A labelled block of a subject: a claim or understanding item of a draft, or an entry of an inventory. */
export interface SubjectBlock {
  readonly at: string;
  readonly value: Readonly<Record<string, unknown>>;
  /** The field holding the block's prose, where its quotations are. */
  readonly textKey: 'text' | 'statement';
  readonly allowed: readonly string[];
  /** The one label under which the block may carry quotations, or null where it never may. */
  readonly quotable: string | null;
  /** The finding's detail for a quotation in a block that may not carry one. */
  readonly unquotable: string;
}

/** What the shared derivation checks of one kind of subject beyond the rules every subject shares. */
export interface SubjectRules {
  readonly noun: 'draft' | 'inventory';
  readonly schema: DraftSchemaWithDefs;
  /** The declared clarification-question limit, where the subject records questions. */
  readonly maxQuestions: number | null;
  /** The subject's references and required records, after identities are checked. */
  readonly structural: (doc: Readonly<Record<string, unknown>>, add: (finding: CheckFinding) => void) => void;
  readonly blocks: (doc: Readonly<Record<string, unknown>>) => readonly SubjectBlock[];
  /** The self-reported account of what the session read: its key, and the parts other than `inspected` that list `{path, reason}`. */
  readonly account: { readonly key: string; readonly parts: readonly string[] };
}

type Block = SubjectBlock;
export type Citation = { readonly at: string; readonly value: Readonly<Record<string, unknown>> };
type BlobState =
  | { readonly state: 'absent' }
  | { readonly state: 'excluded'; readonly outcome: ScreenExclusion }
  | { readonly state: 'admitted'; readonly entry: TreeEntry; readonly raw: string; readonly lines: number; tracked: TrackedText | null; readonly withheld?: readonly number[];
      readonly detectorIds?: readonly string[]; readonly retainedLines?: readonly string[]; readonly lineByteOffsets?: readonly number[]; readonly originalBytes?: number; readonly contentSha256?: string; readonly projection?: VerifiedRedactedBody;
      readonly activeContentAsBefore?: boolean };

/** Every check over a parsed subject. Each walker tolerates a subject of the wrong shape, so one submission reports every finding it
 * carries, not only its schema faults. It freezes and writes nothing: `checkSubject` freezes, and `render` derives again from a frozen
 * revision with it. */
export async function deriveFindings(subject: unknown, inputs: DeriveInputs, rules: SubjectRules): Promise<Derived> {
  const findings: CheckFinding[] = [];
  const add = (finding: CheckFinding): void => { findings.push(finding); };
  const { noun } = rules;
  for (const error of checkDraftShape(rules.schema, subject)) add({ kind: 'schema', at: error.path, detail: error.detail });
  const doc: Readonly<Record<string, unknown>> = isRecord(subject) ? subject : {};

  if (doc['pinnedRevision'] !== inputs.pinned) add({ kind: 'wrong-revision', at: '$.pinnedRevision', detail: `the ${noun} must name the pinned revision ${inputs.pinned}; a ${noun} naming another revision is refused` });
  const asked = list(doc['clarifications']).length;
  if (rules.maxQuestions !== null && asked > rules.maxQuestions) add({ kind: 'question-limit', at: '$.clarifications', detail: `the ${noun} records ${asked} clarification questions; the declared limit is ${rules.maxQuestions}` });

  // Identities, across the whole subject.
  const seen = new Map<string, string>();
  walk(doc, '$', (value, at) => {
    const id = text(value['id']);
    if (id === undefined) return;
    const first = seen.get(id);
    if (first === undefined) seen.set(id, at);
    else add({ kind: 'duplicate-id', at, detail: `the identity ${JSON.stringify(id)} is already used at ${first}` });
  });

  rules.structural(doc, add);
  const executionIds = new Set(list(doc['executions']).flatMap((execution) => (isRecord(execution) && text(execution['id']) !== undefined ? [text(execution['id'])!] : [])));

  // Labels, citations by block kind and the execution marking.
  const blocks = rules.blocks(doc);
  const toVerify: { readonly block: Block; readonly blockId: string; readonly index: number; readonly citation: Citation; readonly inner: string }[] = [];
  for (const block of blocks) {
    const { value, at } = block;
    const blockId = text(value['id']);
    const about = blockId === undefined ? {} : { blockId };
    const label = value['label'];
    const { allowed } = block;
    if (typeof label === 'string' && label.toLowerCase() === 'observed') {
      add({ kind: 'label', at: `${at}.label`, ...about, detail: 'an agent cannot label its own claim Observed; Observed is reserved for a quotation Syzygy verified' });
    } else if (typeof label !== 'string' || !allowed.includes(label)) {
      add({ kind: 'label', at: `${at}.label`, ...about, detail: `every block carries exactly one label, ${allowed.join(', ')}` });
    }
    // The rules by kind apply to a block whose label is one its kind permits; any other label is already a finding.
    if (typeof label !== 'string' || !allowed.includes(label)) continue;
    const citations = Array.isArray(value['citations']) ? value['citations'] : null;
    if (label === 'inferred' && (citations === null || citations.length === 0)) add({ kind: 'citation-by-kind', at: `${at}.citations`, ...about, detail: 'an inferred block cites at least one source' });
    if (label === 'non-normative' && (Object.hasOwn(value, 'citations') || Object.hasOwn(value, 'quotations'))) {
      add({ kind: 'citation-by-kind', at, ...about, detail: 'a non-normative block carries no citation and no anchor' });
    }
    if (label === 'unknown' && !UNKNOWN_REASONS.includes(value['reason'] as never)) {
      add({ kind: 'unknown-reason', at: `${at}.reason`, ...about, detail: 'an unknown block names its reason from RFC2-24\'s closed list' });
    }
    if (label === 'inferred' && value['basis'] === 'execution') {
      const named = list(value['executionIds']);
      if (named.length === 0) add({ kind: 'execution-marking', at: `${at}.executionIds`, ...about, detail: 'a block marked as resting on execution names at least one command from executions' });
      named.forEach((executionId, k) => {
        if (typeof executionId !== 'string' || !executionIds.has(executionId)) add({ kind: 'execution-marking', at: `${at}.executionIds[${k}]`, ...about, detail: 'the block names a command that the draft\'s executions list does not report' });
      });
    }

    const prose = text(value[block.textKey]) ?? '';
    const leadIns = leadInQuotations(prose);
    if (leadIns.length === 0) continue;
    if (label !== block.quotable) {
      add({ kind: 'quotation-in-unquotable-block', at, ...about, detail: block.unquotable });
      continue;
    }
    // A lead-in with no quote after it promises bytes it does not show; it is not a quotation, so it takes no citation.
    const spans = leadIns.filter((span) => span.terminated || span.kind !== 'lead-in-without-quote');
    for (let bare = leadIns.length - spans.length; bare > 0; bare--) {
      add({ kind: 'lead-in-without-quote', at: `${at}.${block.textKey}`, ...about, detail: 'a lead-in is not followed by a straight double quote: a lead-in promises a verbatim quotation' });
    }
    const named = list(value['quotations']);
    if (named.length !== spans.length) add({ kind: 'quotation-count', at: `${at}.quotations`, ...about, detail: `the text carries ${spans.length} quotation(s) and quotations names ${named.length} citation(s); name one per quotation, in order` });
    spans.forEach((span, index) => {
      if (!span.terminated) { add({ kind: 'quotation-unterminated', at: `${at}.${block.textKey}`, ...about, detail: `quotation ${index + 1} is never closed` }); return; }
      const citationId = named[index];
      if (citationId === undefined) return;
      const citation = (citations ?? []).find((entry) => isRecord(entry) && entry['id'] === citationId);
      if (typeof citationId !== 'string' || !isRecord(citation)) {
        add({ kind: 'quotation-citation', at: `${at}.quotations[${index}]`, ...about, detail: 'the quotation names no citation of this block' });
        return;
      }
      if (blockId === undefined) return;
      const where = (citations ?? []).indexOf(citation);
      toVerify.push({ block, blockId, index, citation: { at: `${at}.citations[${where}]`, value: citation }, inner: span.inner });
    });
  }

  // Paths and ranges at the pinned revision; the screen; the reads.
  const tree = new Map<string, TreeEntry>();
  for (const entry of await inputs.reader.listTree()) if (BLOB_MODES.has(entry.mode)) tree.set(entry.path, entry);
  const citations = collectCitations(doc);
  const blobs = new Map<string, BlobState>();
  const toRead: TreeEntry[] = [];
  for (const { value } of citations) {
    const cited = text(value['path']);
    if (cited === undefined || blobs.has(cited)) continue;
    const entry = tree.get(cited);
    if (entry === undefined) { blobs.set(cited, { state: 'absent' }); continue; }
    const outcome = inputs.screen.screenPath(cited);
    if (outcome !== undefined) { blobs.set(cited, { state: 'excluded', outcome }); continue; }
    toRead.push(entry);
  }
  const read = toRead.length === 0 ? [] : await inputs.reader.readBlobs(toRead.map((entry) => entry.path));
  const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
  for (const blob of read) {
    let raw: string;
    try { raw = decoder.decode(blob.bytes); } catch { blobs.set(blob.path, { state: 'excluded', outcome: 'not-utf8-text' }); continue; }
    // A retained body (policy version 4) keeps only its retained text: a withheld line is never used to verify a quotation.
    const screened = inputs.screen.screenTargetBody(raw, blob.path);
    blobs.set(blob.path, screened.kind === 'excluded' ? { state: 'excluded', outcome: screened.outcome }
      : screened.kind === 'redacted' ? { state: 'admitted', entry: blob, raw: retainedWithMarkers(screened.retainedLines, screened.withheld), lines: screened.retainedLines.length,
        tracked: null, withheld: screened.withheld, detectorIds: screened.detectorIds, retainedLines: screened.retainedLines, lineByteOffsets: screened.lineByteOffsets,
        originalBytes: screened.originalBytes, contentSha256: screened.contentSha256, projection: verifiedRedactedBody(raw, blob.id, blob.path, inputs.screen.screenTargetBody),
        activeContentAsBefore: inputs.screen.activeContentAsBefore(raw) }
        : { state: 'admitted', entry: blob, raw, lines: lineCount(raw), tracked: null });
  }
  const firstCited = [...new Set(citations.flatMap(({ value }) => (text(value['path']) === undefined ? [] : [text(value['path'])!])))];
  const citedBlobs: CitedBlob[] = firstCited.map((cited) => [cited, blobs.get(cited)!] as const).flatMap(([cited, state]): CitedBlob[] => {
    if (state.state === 'absent') return [];
    if (state.state === 'admitted') {
      return [{ path: cited, objectId: state.entry.id, read: true, outcome: 'admitted', ...(state.withheld === undefined ? {} : { redaction: blobRedaction(state.withheld, state.detectorIds!) }) }];
    }
    const pathSecret = state.outcome === 'secret-detector-match' && inputs.screen.screenPath(cited) === 'secret-detector-match';
    return [{ path: pathSecret ? null : cited, objectId: pathSecret ? null : tree.get(cited)!.id, read: toRead.some((entry) => entry.path === cited), outcome: state.outcome }];
  });

  const pathLabel = (cited: string): string => (inputs.screen.screenPath(cited) === 'secret-detector-match' ? 'the cited path' : JSON.stringify(cited));
  const rangeOk = new Set<Citation['value']>();
  for (const citation of citations) {
    const { value, at } = citation;
    const citationId = text(value['id']);
    const about = citationId === undefined ? {} : { citationId };
    const cited = text(value['path']);
    const start = line(value['startLine']), end = line(value['endLine']);
    if (cited === undefined) continue;
    const state = blobs.get(cited)!;
    if (state.state === 'absent') { add({ kind: 'path-absent', at: `${at}.path`, ...about, detail: `${pathLabel(cited)} names no file at the pinned revision ${inputs.pinned}` }); continue; }
    if (start === undefined || end === undefined || start > end) { add({ kind: 'range-invalid', at, ...about, detail: 'a line range is two integers from 1, startLine not after endLine' }); continue; }
    if (state.state !== 'admitted') continue;
    if (end > state.lines) { add({ kind: 'range-beyond-blob', at: `${at}.endLine`, ...about, detail: `${pathLabel(cited)} has ${state.lines} line(s) at the pinned revision; the range ends at line ${end}` }); continue; }
    rangeOk.add(value);
  }

  // Quotations.
  const quotations: VerifiedQuotation[] = [];
  const excludedContent: ExcludedQuotation[] = [];
  for (const { block, blockId, index, citation, inner } of toVerify) {
    const cited = text(citation.value['path']);
    const citationId = citation.value['id'] as string;
    if (cited === undefined) continue;
    const state = blobs.get(cited);
    if (state === undefined || state.state === 'absent') continue;
    if (state.state === 'excluded') { excludedContent.push({ blockId, at: block.at, index, citationId, unknownReason: 'excluded-content' }); continue; }
    if (!rangeOk.has(citation.value)) continue;
    // A cited span that includes a withheld line is withheld whole, and the quotation that rests on it is Unknown (RFC5-17).
    if (state.withheld !== undefined && spanTouchesWithheld(state.withheld, citation.value['startLine'] as number, citation.value['endLine'] as number)) {
      excludedContent.push({ blockId, at: block.at, index, citationId, unknownReason: 'excluded-content' });
      continue;
    }
    const startLine = citation.value['startLine'] as number, endLine = citation.value['endLine'] as number;
    const source = state.retainedLines === undefined ? state.raw : state.retainedLines.slice(startLine - 1, endLine).join('');
    const tracked = state.retainedLines === undefined ? (state.tracked ??= normaliseTracked(source)) : normaliseTracked(source);
    const located = locateQuote(source, tracked, inner, state.retainedLines === undefined ? startLine : 1,
      state.retainedLines === undefined ? endLine : endLine - startLine + 1);
    if (!located.found) {
      add({ kind: located.kind, at: `${block.at}.${block.textKey}`, blockId, citationId, detail: `quotation ${index + 1} ${QUOTE_FAILURE[located.kind]} (citation ${JSON.stringify(citationId)})` });
      continue;
    }
    const base = state.lineByteOffsets?.[startLine - 1] ?? 0;
    quotations.push({ blockId, at: block.at, index, citationId, path: cited, objectId: state.entry.id, algorithm: inputs.reader.algorithm,
      byteRange: [base + located.byteStart, base + located.byteEnd] });
  }

  // The self-reported account of what the session read.
  const { key } = rules.account;
  const account = isRecord(doc[key]) ? doc[key] : {};
  list(account['inspected']).forEach((entry, i) => {
    if (typeof entry === 'string' && !tree.has(entry)) add({ kind: 'discovery-path-absent', at: `$.${key}.inspected[${i}]`, detail: `${pathLabel(entry)} names no file at the pinned revision` });
  });
  for (const part of rules.account.parts) {
    list(account[part]).forEach((entry, i) => {
      const reported = isRecord(entry) ? text(entry['path']) : undefined;
      if (reported !== undefined && !tree.has(reported)) add({ kind: 'discovery-path-absent', at: `$.${key}.${part}[${i}].path`, detail: `${pathLabel(reported)} names no file at the pinned revision` });
    });
  }

  const admitted = new Map([...blobs].flatMap(([cited, state]) => (state.state === 'admitted'
    ? [[cited, { objectId: state.entry.id, raw: state.raw, ...(state.withheld === undefined ? {} : { withheld: state.withheld, detectorIds: state.detectorIds!,
      retainedLines: state.retainedLines!, lineByteOffsets: state.lineByteOffsets!, originalBytes: state.originalBytes!, contentSha256: state.contentSha256!, projection: state.projection!,
      activeContentAsBefore: state.activeContentAsBefore! }) }] as const] : [])));
  return { findings, quotations, excludedContent, citedBlobs, admitted };
}

const CLAIM_UNQUOTABLE = 'only an inferred claim block carries quotations; give this one its own inferred block with a citation';

/** The authoring draft's rules: its schema and question limit, references, understanding record, blocks and discovery account. */
export function draftRules(pinned: string, maxQuestions: number): SubjectRules {
  return {
    noun: 'draft',
    schema: localDraftSchema({ pinnedRevision: pinned, maxQuestions }),
    maxQuestions,
    structural: draftStructure,
    blocks: collectBlocks,
    account: { key: 'discovery', parts: ['selected', 'excluded', 'unresolved', 'deferred'] },
  };
}

function draftStructure(doc: Readonly<Record<string, unknown>>, add: (finding: CheckFinding) => void): void {
  // References.
  const sectionIds = new Set(list(doc['sections']).flatMap((section) => (isRecord(section) && text(section['id']) !== undefined ? [text(section['id'])!] : [])));
  for (const part of ['diagrams', 'deepDives'] as const) {
    list(doc[part]).forEach((asset, i) => {
      if (!isRecord(asset)) return;
      const sectionId = text(asset['sectionId']);
      if (sectionId !== undefined && !sectionIds.has(sectionId)) add({ kind: 'unresolved-reference', at: `$.${part}[${i}].sectionId`, detail: `no section has the identity ${JSON.stringify(sectionId)}` });
    });
  }
  list(doc['diagrams']).forEach((diagram, i) => {
    if (!isRecord(diagram)) return;
    const nodes = new Set(list(diagram['nodes']).flatMap((node) => (isRecord(node) && text(node['id']) !== undefined ? [text(node['id'])!] : [])));
    list(diagram['edges']).forEach((edge, j) => {
      if (!isRecord(edge)) return;
      for (const end of ['from', 'to'] as const) {
        const target = text(edge[end]);
        if (target !== undefined && !nodes.has(target)) add({ kind: 'unresolved-reference', at: `$.diagrams[${i}].edges[${j}].${end}`, detail: `no node of this diagram has the identity ${JSON.stringify(target)}` });
      }
    });
  });
  // A produced disposition names what its own asset produced, as in the provider draft: the asset, its paragraphs, or its nodes and edges.
  const idsOf = (values: unknown): string[] => list(values).flatMap((entry) => (isRecord(entry) && text(entry['id']) !== undefined ? [text(entry['id'])!] : []));
  for (const part of ['sections', 'diagrams', 'deepDives'] as const) {
    list(doc[part]).forEach((asset, i) => {
      if (!isRecord(asset) || !isRecord(asset['disposition']) || asset['disposition']['kind'] !== 'produced') return;
      // Its parts are every identity inside it: blocks, children, rich elements and their rows and claims, nodes and edges; never a citation.
      const own = new Set<string>();
      walk(asset, '$', (value, at) => { const id = text(value['id']); if (id !== undefined && !/\.(citations|evidence)\[/u.test(at)) own.add(id); });
      list(asset['disposition']['assetIds']).forEach((assetId, k) => {
        if (typeof assetId === 'string' && !own.has(assetId)) add({ kind: 'unresolved-reference', at: `$.${part}[${i}].disposition.assetIds[${k}]`, detail: `${JSON.stringify(assetId)} is not this asset or a part of it` });
      });
    });
  }

  // The understanding record.
  const understanding = isRecord(doc['understanding']) ? doc['understanding'] : {};
  for (const item of UNDERSTANDING_ITEMS) {
    if (list(understanding[item]).length === 0) add({ kind: 'understanding-missing', at: `$.understanding.${item}`, detail: `the understanding record has no entry for ${item}; an item that cannot be established is an unknown entry with its reason` });
  }
}

const QUOTE_FAILURE: Readonly<Record<'quotation-empty' | 'quotation-elided' | 'quotation-not-in-cited-file' | 'quotation-outside-range', string>> = {
  'quotation-empty': 'is empty after normalisation',
  'quotation-elided': 'carries an ellipsis the cited file does not carry there: an elision',
  'quotation-not-in-cited-file': 'is not one contiguous run of the cited file after normalisation: it is altered or joins separate spans',
  'quotation-outside-range': 'occurs in the cited file only outside the cited line range',
};

/** Call `visit` for every object in the document, with its JSON path. */
function walk(value: unknown, at: string, visit: (value: Readonly<Record<string, unknown>>, at: string) => void): void {
  if (Array.isArray(value)) { value.forEach((item, i) => walk(item, `${at}[${i}]`, visit)); return; }
  if (!isRecord(value)) return;
  visit(value, at);
  for (const [key, child] of Object.entries(value)) walk(child, `${at}.${key}`, visit);
}

/** Every claim form in one entry of a section's or deep dive's `paragraphs`, with its JSON path: a block and its children, or each
 * text-bearing cell or item of a v1.3 rich element (syzygy-mea.10.5). An element's labels are presentation and are no claim. */
export function contentClaims(at: string, entry: unknown, visit: (at: string, value: Readonly<Record<string, unknown>>) => void): void {
  if (!isRecord(entry)) return;
  const each = (key: string, inner: (item: Readonly<Record<string, unknown>>, at: string) => void): void =>
    list(entry[key]).forEach((item, k) => { if (isRecord(item)) inner(item, `${at}.${key}[${k}]`); });
  switch (entry['kind']) {
    case undefined:
      visit(at, entry);
      each('children', (child, childAt) => visit(childAt, child));
      return;
    case 'table':
      each('rows', (row, rowAt) => list(row['cells']).forEach((cell, c) => { if (isRecord(cell) && cell['kind'] !== 'empty') visit(`${rowAt}.cells[${c}]`, cell); }));
      return;
    case 'callout': each('children', (child, childAt) => contentClaims(childAt, child, visit)); return;
    case 'steps': each('items', (item, itemAt) => visit(itemAt, item)); return;
    case 'definitions': each('entries', (item, itemAt) => { if (isRecord(item['definition'])) visit(`${itemAt}.definition`, item['definition']); }); return;
    case 'cards': each('items', (item, itemAt) => { if (isRecord(item['body'])) visit(`${itemAt}.body`, item['body']); }); return;
    case 'details': each('elements', (item, itemAt) => contentClaims(itemAt, item, visit)); return;
    default: return;
  }
}

/** The claim blocks (introduction, section and deep-dive paragraphs and their children, and the claim forms of rich elements) and the
 * understanding record's items. */
export function collectBlocks(doc: Readonly<Record<string, unknown>>): Block[] {
  const out: Block[] = [];
  const claim = (at: string, value: Readonly<Record<string, unknown>>): Block =>
    ({ at, value, textKey: 'text', allowed: ['inferred', 'unknown', 'non-normative'], quotable: 'inferred', unquotable: CLAIM_UNQUOTABLE });
  if (isRecord(doc['introduction'])) out.push(claim('$.introduction', doc['introduction']));
  for (const part of ['sections', 'deepDives'] as const) {
    list(doc[part]).forEach((container, i) => {
      if (!isRecord(container)) return;
      list(container['paragraphs']).forEach((entry, j) => contentClaims(`$.${part}[${i}].paragraphs[${j}]`, entry, (at, value) => out.push(claim(at, value))));
    });
  }
  const understanding = isRecord(doc['understanding']) ? doc['understanding'] : {};
  for (const item of UNDERSTANDING_ITEMS) {
    list(understanding[item]).forEach((entry, i) => { if (isRecord(entry)) out.push({ at: `$.understanding.${item}[${i}]`, value: entry, textKey: 'statement', allowed: ['inferred', 'unknown'], quotable: null, unquotable: CLAIM_UNQUOTABLE }); });
  }
  return out;
}

/** Every citation in the draft: each object in a `citations` or `evidence` list. */
export function collectCitations(doc: Readonly<Record<string, unknown>>): Citation[] {
  const out: Citation[] = [];
  walk(doc, '$', (value, at) => {
    for (const key of ['citations', 'evidence'] as const) {
      list(value[key]).forEach((citation, i) => { if (isRecord(citation)) out.push({ at: `${at}.${key}[${i}]`, value: citation }); });
    }
  });
  return out;
}
