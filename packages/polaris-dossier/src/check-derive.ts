import * as path from 'node:path';
import { UNKNOWN_REASONS } from '@syzygy/cap1-core';
import { checkShape, handle, leadInQuotations, lineCount, locateQuote, normaliseTracked, retainedWithMarkers, spanTouchesWithheld, verifiedRedactedBody, type VerifiedRedactedBody, type TrackedText, type Schema } from '@syzygy/polaris-generation-core/live';
import { isRecord } from '@syzygy/support';
import { FIGURE_MEMBERS, LOCAL_DRAFT_SCHEMA_VERSION, LOCAL_DRAFT_SCHEMA_VERSION_V4, LOCAL_DRAFT_SCHEMA_VERSION_V8, RELATION_FIELD, UNIT_FIELD, hasRelationForm, LOCAL_DRAFT_SCHEMA_VERSION_V5, LOCAL_DRAFT_SCHEMA_VERSION_V6, LOCAL_DRAFT_SCHEMA_VERSION_V7, INVENTORY_OMISSIONS_SINCE, PRE_V5_SCHEMA_VERSIONS, SUBSECTIONS_FIELD, TASK_ROUTE_FIELD, UNDERSTANDING_ITEMS, V4_FIELDS, V7_FIGURE_MEMBERS, hasFigureKindForm, hasHomeForm, hasSubsectionForm, hasThesisBasisForm, hasV4Forms, checkDraftShape, localDraftSchema, membersOfKind, type DraftSchemaWithDefs } from './draft-schema.js';
import { isEntryPoint } from './derive.js';
import { UNIT_FAULT_WORDS, UNIT_TEXT_LIMIT, decideWitness, unitFault, unitOf, type EdgeEnd, type RelationType, type UnitFault, type UnitTree, type WitnessDecision, type WitnessInputs } from './relation-witness.js';
import { BLOB_MODES, type PinnedObjectReader, type TreeEntry } from './git-object-reader.js';
import { secretPathOf, type DossierScreen, type ScreenExclusion } from './screen.js';
import { DEFAULT_POLE_LIMIT } from './run-config.js';
import { type CheckFinding, type CitedBlob, type ExcludedQuotation, type VerifiedQuotation, blobRedaction, line, list, text } from './check-model.js';

/** `deriveFindings` and the draft's rules and walkers; split out of `check.ts` unchanged. */

/** What one derivation found. `admitted` holds the text of every cited blob this step read, re-hashed and screening admitted, by path:
 * the only bytes a render may quote or put on a source page. */
/** The most lines a code excerpt may name (REQ-polaris-generation-034, v1.3). */
export const CODE_EXCERPT_MAX_LINES = 60;

/** Markup a short label may not carry (v1.3 "Short label carries no claim"): an angle bracket, an ampersand, a backtick, a Markdown link
 * or image, or an emphasis mark at a word edge. A label renders as plain text, so any of these would show as written or mislead. */
const LABEL_MARKUP = /[<>&`]|!?\[[^\]\n]*\]\(|(?:^|[\s(])(?:\*{1,2}|_{1,2})(?=\S)|(?<=\S)(?:\*{1,2}|_{1,2})(?:$|[\s).,;:!?])/u;

/** The JSON path of every presentation element in the draft. */
const ELEMENT_KINDS = new Set(['table', 'callout', 'steps', 'definitions', 'cards', 'details', 'code']);
function elementEntries(doc: Readonly<Record<string, unknown>>): string[] {
  const out: string[] = [];
  walk(doc, '$', (value, at) => { if (ELEMENT_KINDS.has(text(value['kind']) ?? '') && /\.(?:paragraphs|elements|children)\[\d+\]$/u.test(at)) out.push(at); });
  return out;
}

/** Every short label of the draft's presentation elements, with its JSON path. */
export function elementLabels(doc: Readonly<Record<string, unknown>>): { at: string; value: string }[] {
  const out: { at: string; value: string }[] = [];
  const keys: Readonly<Record<string, readonly string[]>> = { table: ['caption'], callout: ['title'], details: ['summary'], code: ['language'] };
  walk(doc, '$', (value, at) => {
    const kind = text(value['kind']);
    if (kind === undefined) return;
    for (const key of keys[kind] ?? []) if (typeof value[key] === 'string') out.push({ at: `${at}.${key}`, value: value[key] as string });
    if (kind === 'table') list(value['columns']).forEach((column, i) => { if (typeof column === 'string') out.push({ at: `${at}.columns[${i}]`, value: column }); });
    if (kind === 'definitions') list(value['entries']).forEach((entry, i) => { if (isRecord(entry) && typeof entry['term'] === 'string') out.push({ at: `${at}.entries[${i}].term`, value: entry['term'] }); });
    if (kind === 'cards') list(value['items']).forEach((item, i) => { if (isRecord(item) && typeof item['label'] === 'string') out.push({ at: `${at}.items[${i}].label`, value: item['label'] }); });
  });
  // A Pole's label follows the rules for an element's short label (dossier spec v1.5).
  list(doc['poles']).forEach((pole, i) => { if (isRecord(pole) && typeof pole['label'] === 'string') out.push({ at: `$.poles[${i}].label`, value: pole['label'] }); });
  // So does a task route's task (the index-and-task-routes change): a short label that claims nothing; the claims are its steps.
  list(doc[TASK_ROUTE_FIELD]).forEach((route, i) => { if (isRecord(route) && typeof route['task'] === 'string') out.push({ at: `$.${TASK_ROUTE_FIELD}[${i}].task`, value: route['task'] }); });
  // And so does a v8 subsection's title (version 2.16); in an earlier draft the member is field-version and nothing in it is read.
  subsectionsOf(doc, (subsection, at) => { if (typeof subsection['title'] === 'string') out.push({ at: `${at}.title`, value: subsection['title'] }); });
  return out;
}

export function labelMarkup(value: string): boolean { return LABEL_MARKUP.test(value); }

/** A quotation a short label may not carry: a quotation mark of any kind, or the quotation lead-in (R-MEA10-RICH-ELEMENTS-e06b-1 F2). A
 * label is never verified against a file, so a quotation in one would render as the agent's unverified copy. */
const LABEL_QUOTATION = /["\u201C\u201D\u201E\u00AB\u00BB]|\bstates:/iu;
export function labelQuotation(value: string): boolean { return LABEL_QUOTATION.test(value); }

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
  /** The schema a subject of an earlier version is checked against, where it differs (a draft before v5 names its diagram's section in
   * `sectionId`; one before v6 has no `thesisBasis`), and the later-version fields it may not carry, which the structure reports as
   * field-version findings instead; undefined for a subject of the current version. */
  readonly earlier?: (subject: unknown) => { readonly schema: DraftSchemaWithDefs; readonly reported: { readonly test: (path: string) => boolean };
    /** The schema faults that stand in place of one, at its place in the order: a v7 diagram naming no kind (version 2.5). */
    readonly replaced?: (error: { readonly path: string; readonly detail: string }) => readonly { readonly path: string; readonly detail: string }[] | undefined } | undefined;
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
  /** `lines` only where Syzygy read the body before excluding it (content screening, not UTF-8): never a path-excluded body. */
  | { readonly state: 'excluded'; readonly outcome: ScreenExclusion; readonly lines?: number }
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
  const earlier = rules.earlier?.(subject);
  for (const error of checkDraftShape(earlier?.schema ?? rules.schema, subject)) {
    for (const fault of earlier?.replaced?.(error) ?? [error]) {
      if (earlier === undefined || !earlier.reported.test(fault.path)) add({ kind: 'schema', at: fault.path, detail: fault.detail });
    }
  }
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

  // A presentation element's short labels are plain text that claims nothing: markup in one is a finding at its path.
  for (const label of elementLabels(doc)) {
    if (labelQuotation(label.value)) add({ kind: 'label-quotation', at: label.at, detail: 'a short label carries no quotation: no quotation mark and no lead-in; quote in a claim block, where Syzygy verifies it' });
    else if (labelMarkup(label.value)) add({ kind: 'label-markup', at: label.at, detail: 'a short label is plain text: no angle bracket (< or >), ampersand, backtick, Markdown link or image, or * or _ at a word edge' });
  }
  // A v2 draft predates the elements: it uses none (design, v1.3 migration).
  if (doc['schemaVersion'] === 'polaris-dossier-local-draft-v2') {
    for (const label of elementEntries(doc)) add({ kind: 'element-version', at: label, detail: 'a presentation element needs draft schema polaris-dossier-local-draft-v3' });
  }
  // Only a v4 or later draft has the judgement mark and a list's repeated diagram (dossier spec v1.5); in an earlier draft each is a
  // finding at its path, so an uncited block in one is never excused by a mark its version does not define.
  const v4 = hasV4Forms(doc['schemaVersion']);
  if (rules.noun === 'draft' && !v4) {
    walk(doc, '$', (value, at) => {
      for (const field of V4_FIELDS) if (Object.hasOwn(value, field)) add({ kind: 'field-version', at: `${at}.${field}`, detail: `\`${field}\` needs draft schema ${LOCAL_DRAFT_SCHEMA_VERSION_V4}` });
    });
  }

  // The justified-omission record is a field of v5 and later (dossier spec 2.12): in an earlier draft it is a finding at its path.
  if (rules.noun === 'draft' && Object.hasOwn(doc, 'inventoryOmissions') && PRE_V5_SCHEMA_VERSIONS.includes(doc['schemaVersion'] as string)) {
    add({ kind: 'field-version', at: '$.inventoryOmissions', detail: `\`inventoryOmissions\` needs draft schema ${INVENTORY_OMISSIONS_SINCE}` });
  }

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
    // A v4 Inferred block may cite nothing only when it carries the judgement mark: the session's own assessment, asserting no project
    // fact. A block with the mark is counted, never a finding; whether it asserts a fact is the fidelity review's question.
    const judged = v4 && value['judgement'] === true;
    if (label === 'inferred' && (citations === null || citations.length === 0) && !judged) {
      add({ kind: 'citation-by-kind', at: `${at}.citations`, ...about, detail: v4 ? 'an inferred block cites at least one source, unless it is your own judgement of the project, asserting no fact about it, and carries "judgement": true' : 'an inferred block cites at least one source' });
    }
    if (Object.hasOwn(value, 'judgement') && label !== 'inferred') add({ kind: 'judgement-mark', at: `${at}.judgement`, ...about, detail: 'only an inferred block carries the judgement mark' });
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
    try { raw = decoder.decode(blob.bytes); } catch { blobs.set(blob.path, { state: 'excluded', outcome: 'not-utf8-text', lines: lineCount(Buffer.from(blob.bytes).toString('latin1')) }); continue; }
    // A retained body (policy version 4) keeps only its retained text: a withheld line is never used to verify a quotation.
    const screened = inputs.screen.screenTargetBody(raw, blob.path);
    blobs.set(blob.path, screened.kind === 'excluded' ? { state: 'excluded', outcome: screened.outcome, lines: lineCount(raw) }
      : screened.kind === 'redacted' ? { state: 'admitted', entry: blob, raw: retainedWithMarkers(screened.retainedLines, screened.withheld), lines: screened.retainedLines.length,
        tracked: null, withheld: screened.withheld, detectorIds: screened.detectorIds, retainedLines: screened.retainedLines, lineByteOffsets: screened.lineByteOffsets,
        originalBytes: screened.originalBytes, contentSha256: screened.contentSha256, projection: verifiedRedactedBody(raw, blob.id, blob.path, inputs.screen.screenTargetBody),
        activeContentAsBefore: inputs.screen.activeContentAsBefore(raw) }
        : { state: 'admitted', entry: blob, raw, lines: lineCount(raw), tracked: null });
  }
  const firstCited = [...new Set(citations.flatMap(({ value }) => (text(value['path']) === undefined ? [] : [text(value['path'])!])))];
  const isSecretPath = secretPathOf(inputs.screen);
  const citedBlobs: CitedBlob[] = firstCited.map((cited) => [cited, blobs.get(cited)!] as const).flatMap(([cited, state]): CitedBlob[] => {
    if (state.state === 'absent') return [];
    if (state.state === 'admitted') {
      return [{ path: cited, objectId: state.entry.id, read: true, outcome: 'admitted', ...(state.withheld === undefined ? {} : { redaction: blobRedaction(state.withheld, state.detectorIds!) }) }];
    }
    // The outcome stays what screening gave (`denied-path` for a path a denied-path rule also names); only the name is withheld.
    const pathSecret = isSecretPath(cited);
    return [{ path: pathSecret ? null : cited, objectId: pathSecret ? null : tree.get(cited)!.id, read: toRead.some((entry) => entry.path === cited), outcome: state.outcome }];
  });

  const pathLabel = (cited: string): string => (isSecretPath(cited) ? 'the cited path' : JSON.stringify(cited));
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
    // The limit holds whatever screening decides: only the exclusion itself is no finding (R-MEA10-RICH-ELEMENTS-e06b-1 F1).
    if (at.endsWith('.citation') && end - start + 1 > CODE_EXCERPT_MAX_LINES) {
      add({ kind: 'code-excerpt-too-long', at, ...about, detail: `a code excerpt names 1 to ${CODE_EXCERPT_MAX_LINES} lines; this one names ${end - start + 1}` });
      continue;
    }
    // Every citation's range is checked against a body Syzygy read and then excluded, without naming its length; a path-excluded body is
    // never read, so its range is not checked (R-MEA10-RICH-ELEMENTS-720d-2 F1).
    if (state.state === 'excluded' && state.lines !== undefined && end > state.lines) {
      add({ kind: 'range-beyond-blob', at: `${at}.endLine`, ...about, detail: `the range ends past the last line of ${pathLabel(cited)} at the pinned revision` });
      continue;
    }
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

/** The thesis basis (REQ-polaris-generation-034 version 2.4, syzygy-3efd.56). A v6 draft's `thesisBasis` must fit its introduction:
 * `stated`, an Inferred block citing at least one source; `code-reading`, an Inferred block resting on sources that quotes nothing (no
 * `quotations` and no lead-in in its text) and cites two different entry points (`isEntryPoint`); `none`, an Unknown or non-normative
 * block. A `thesisBasis` in an earlier draft is a field-version finding. Whether a cited file is where a user or a program enters the
 * project, or whether the repository truly states no purpose, is not tested here: the fidelity review judges the introduction. */
function thesisStructure(doc: Readonly<Record<string, unknown>>, add: (finding: CheckFinding) => void): void {
  if (!hasThesisBasisForm(doc['schemaVersion'])) {
    if (Object.hasOwn(doc, 'thesisBasis')) add({ kind: 'field-version', at: '$.thesisBasis', detail: `\`thesisBasis\` needs draft schema ${LOCAL_DRAFT_SCHEMA_VERSION_V6}` });
    return;
  }
  const basis = doc['thesisBasis'];
  if (basis !== 'stated' && basis !== 'code-reading' && basis !== 'none') return;
  const intro = isRecord(doc['introduction']) ? doc['introduction'] : {};
  const label = intro['label'];
  const cited = list(intro['citations']).filter(isRecord).flatMap((citation) => (text(citation['path']) === undefined ? [] : [text(citation['path'])!]));
  const finding = (detail: string): void => add({ kind: 'thesis-basis', at: '$.thesisBasis', detail });
  if (basis === 'stated') {
    if (label !== 'inferred' || cited.length === 0) finding('a `stated` thesis rests on a statement of the project\'s purpose by its maintainers: make the introduction an inferred block that cites that statement');
    return;
  }
  if (basis === 'none') {
    if (label !== 'unknown' && label !== 'non-normative') finding('a `none` thesis establishes nothing: make the introduction an unknown block, or a non-normative one that makes no claim');
    return;
  }
  const quotes = list(intro['quotations']).length > 0 || leadInQuotations(text(intro['text']) ?? '').length > 0;
  const entryPoints = new Set(cited.filter(isEntryPoint));
  if (label !== 'inferred' || intro['basis'] !== 'source' || quotes || entryPoints.size < 2) {
    finding(`a \`code-reading\` thesis says what the code does: make the introduction an inferred block resting on sources (\`basis: source\`) that quotes nothing and cites at least two entry points, two different code files outside documentation, test, vendored, generated and example paths; it cites ${entryPoints.size === 1 ? '1 such file' : `${entryPoints.size} such files`}${quotes ? ' and quotes' : ''}`);
  }
}

/** A diagram as a finding names it (version 2.5): by its identity, or by its path where it has no well-formed one. */
function diagramName(diagram: Readonly<Record<string, unknown>>, i: number): string {
  const id = diagram['id'];
  return typeof id === 'string' && checkShape({ root: handle, defs: {} }, id).length === 0 ? `the diagram ${JSON.stringify(id)}` : `the diagram $.diagrams[${i}]`;
}

const membersWords = (members: readonly string[]): string => `\`${members[0]}\` and \`${members[1]}\``;

/** The `figure-kind` findings of a v7 draft (REQ-polaris-generation-034 version 2.5): one at `$.diagrams[<i>].<member>` for each member a
 * diagram carries that its kind does not take, and one at `$.diagrams[<i>]` naming each member its kind takes that it lacks. `member` is the
 * member's own path, where the schema check reports no finding. A diagram whose kind is none of the eight takes nothing known: its kind is
 * the schema's finding alone. */
export function figureKindFindings(doc: Readonly<Record<string, unknown>>): readonly (CheckFinding & { readonly member: string })[] {
  const out: (CheckFinding & { readonly member: string })[] = [];
  list(doc['diagrams']).forEach((diagram, i) => {
    if (!isRecord(diagram)) return;
    const takes = membersOfKind(diagram['kind']);
    if (takes === undefined) return;
    const kind = diagram['kind'] as string;
    const name = diagramName(diagram, i);
    const what = (DIAGRAM_GRAPH_KINDS.has(kind) ? `a ${kind} diagram` : `a ${kind}`);
    for (const member of FIGURE_MEMBERS) {
      const at = `$.diagrams[${i}]`;
      if (Object.hasOwn(diagram, member) && !takes.includes(member)) {
        out.push({ kind: 'figure-kind', at: `${at}.${member}`, member: `${at}.${member}`, detail: `${name}: ${what} takes ${membersWords(takes)}, not \`${member}\`` });
      } else if (!Object.hasOwn(diagram, member) && takes.includes(member)) {
        out.push({ kind: 'figure-kind', at, member: `${at}.${member}`, detail: `${name}: ${what} takes ${membersWords(takes)}; it lacks \`${member}\`` });
      }
    }
  });
  return out;
}

/** The paths at which a draft of schema v6 or earlier carries a v7 kind or member, each a field-version finding (version 2.5). */
function figureFieldVersionPaths(doc: Readonly<Record<string, unknown>>): string[] {
  const out: string[] = [];
  list(doc['diagrams']).forEach((diagram, i) => {
    if (!isRecord(diagram)) return;
    if (diagram['kind'] === 'sequence' || diagram['kind'] === 'swimlane') out.push(`$.diagrams[${i}].kind`);
    for (const member of V7_FIGURE_MEMBERS) if (Object.hasOwn(diagram, member)) out.push(`$.diagrams[${i}].${member}`);
  });
  return out;
}

const DIAGRAM_GRAPH_KINDS: ReadonlySet<string> = new Set(['flow', 'lifecycle', 'state-machine', 'boundary', 'dependency', 'placement']);

/** The figure kinds (REQ-polaris-generation-034 version 2.5). In a v7 draft: `figure-kind` for members that do not fit the kind;
 * `unresolved-reference` for a sequence's message whose `from` or `to`, or a swimlane's step whose `lane`, names nothing in its own
 * diagram; and `figure-unused` for a participant no message names or a lane no step names, which would draw an empty column. In an
 * earlier draft: `field-version` for a v7 kind and for each v7 member, in place of the schema finding at that path. */
function figureStructure(doc: Readonly<Record<string, unknown>>, add: (finding: CheckFinding) => void): void {
  if (!hasFigureKindForm(doc['schemaVersion'])) {
    list(doc['diagrams']).forEach((diagram, i) => {
      if (!isRecord(diagram)) return;
      const name = diagramName(diagram, i);
      if (diagram['kind'] === 'sequence' || diagram['kind'] === 'swimlane') add({ kind: 'field-version', at: `$.diagrams[${i}].kind`, detail: `${name}: the kind \`${diagram['kind']}\` needs draft schema ${LOCAL_DRAFT_SCHEMA_VERSION_V7}` });
      for (const member of V7_FIGURE_MEMBERS) {
        if (Object.hasOwn(diagram, member)) add({ kind: 'field-version', at: `$.diagrams[${i}].${member}`, detail: `${name}: \`${member}\` needs draft schema ${LOCAL_DRAFT_SCHEMA_VERSION_V7}` });
      }
    });
    return;
  }
  for (const { member: _member, ...finding } of figureKindFindings(doc)) add(finding);
  const idsOf = (values: unknown): Set<string> => new Set(list(values).flatMap((entry) => (isRecord(entry) && text(entry['id']) !== undefined ? [text(entry['id'])!] : [])));
  list(doc['diagrams']).forEach((diagram, i) => {
    if (!isRecord(diagram)) return;
    const name = diagramName(diagram, i);
    const [owners, uses, ends, owner, use] = diagram['kind'] === 'sequence' ? ['participants', 'messages', ['from', 'to'], 'participant', 'message'] as const
      : diagram['kind'] === 'swimlane' ? ['lanes', 'steps', ['lane'], 'lane', 'step'] as const : [];
    if (owners === undefined) return;
    const known = idsOf(diagram[owners]);
    const named = new Set<string>();
    list(diagram[uses]).forEach((entry, j) => {
      if (!isRecord(entry)) return;
      for (const end of ends) {
        const target = text(entry[end]);
        if (target === undefined) continue;
        named.add(target);
        if (!known.has(target)) add({ kind: 'unresolved-reference', at: `$.diagrams[${i}].${uses}[${j}].${end}`, detail: `${name}: no ${owner} of this diagram has the identity ${JSON.stringify(target)}` });
      }
    });
    // An unnamed column needs the other list to name it from: a missing list is the figure-kind finding's.
    if (!Array.isArray(diagram[uses])) return;
    list(diagram[owners]).forEach((entry, k) => {
      const id = isRecord(entry) ? text(entry['id']) : undefined;
      if (id === undefined || named.has(id)) return;
      add({ kind: 'figure-unused', at: `$.diagrams[${i}].${owners}[${k}]`, detail: owner === 'participant'
        ? `${name}: no message names the participant ${JSON.stringify(id)} as its sender or receiver; every participant sends or receives a message`
        : `${name}: no step names the lane ${JSON.stringify(id)}; every lane holds a step` });
    });
  });
}

const CLAIM_UNQUOTABLE = 'only an inferred claim block carries quotations; give this one its own inferred block with a citation';

/** Each subsection of one section of a v8 draft (version 2.16), with its JSON path; none in an earlier draft. */
function subsectionsOfSection(doc: Readonly<Record<string, unknown>>, section: Readonly<Record<string, unknown>>, at: string,
  visit: (subsection: Readonly<Record<string, unknown>>, at: string) => void): void {
  if (!hasSubsectionForm(doc['schemaVersion'])) return;
  list(section[SUBSECTIONS_FIELD]).forEach((subsection, j) => { if (isRecord(subsection)) visit(subsection, `${at}.${SUBSECTIONS_FIELD}[${j}]`); });
}

/** Every subsection of a v8 draft, in draft order, with its JSON path. */
export function subsectionsOf(doc: Readonly<Record<string, unknown>>, visit: (subsection: Readonly<Record<string, unknown>>, at: string) => void): void {
  list(doc['sections']).forEach((section, i) => { if (isRecord(section)) subsectionsOfSection(doc, section, `$.sections[${i}]`, visit); });
}

/** The paths at which a draft of schema v7 or earlier carries `subsections`, each a field-version finding (version 2.16). */
function subsectionFieldVersionPaths(doc: Readonly<Record<string, unknown>>): string[] {
  if (hasSubsectionForm(doc['schemaVersion'])) return [];
  return list(doc['sections']).flatMap((section, i) => (isRecord(section) && Object.hasOwn(section, SUBSECTIONS_FIELD) ? [`$.sections[${i}].${SUBSECTIONS_FIELD}`] : []));
}

/** Rule `one-sentence-answer`, version 1 (REQ-polaris-generation-034 version 2.16): whether a subsection answer's text is one sentence. It
 * reads the text alone. A terminator is U+002E, U+003F or U+0021; a closer U+0029, U+005D, U+0027 or U+2019; a quote U+0022; white space
 * the class `\s` of an ECMAScript regular expression with the `u` flag (the RS-19 word split). The characters between the first and second
 * quote, the third and fourth and so on are removed, the quotes kept and an unpaired last quote and what follows it left in place; leading
 * and trailing white space is removed. What remains is one sentence when it ends with a terminator and zero or more closers, or with a quote
 * that closes a pair, and holds no terminator that zero or more closers and then a white-space character follow. */
export function oneSentenceAnswer(value: string): boolean {
  const chars = [...value];
  const quotes = chars.flatMap((ch, i) => (ch === '"' ? [i] : []));
  const paired = quotes.length - (quotes.length % 2);
  const closing = new Set<number>();
  const removed = new Set<number>();
  for (let k = 0; k < paired; k += 2) {
    closing.add(quotes[k + 1]!);
    for (let i = quotes[k]! + 1; i < quotes[k + 1]!; i++) removed.add(i);
  }
  const kept = chars.flatMap((ch, i) => (removed.has(i) ? [] : [{ ch, closes: closing.has(i) }]));
  const white = /^\s$/u;
  while (kept.length > 0 && white.test(kept[0]!.ch)) kept.shift();
  while (kept.length > 0 && white.test(kept[kept.length - 1]!.ch)) kept.pop();
  const stripped = kept.map((entry) => entry.ch).join('');
  if (/[.?!][)\]'\u2019]*\s/u.test(stripped)) return false;
  return /[.?!][)\]'\u2019]*$/u.test(stripped) || (kept.length > 0 && kept[kept.length - 1]!.closes);
}

/** A subsection as a finding names it (version 2.16): by its identity, or by its path where it has no well-formed one. */
function subsectionName(subsection: Readonly<Record<string, unknown>>, at: string): string {
  const id = subsection['id'];
  return typeof id === 'string' && checkShape({ root: handle, defs: {} }, id).length === 0 ? `the subsection ${JSON.stringify(id)}` : `the subsection ${at}`;
}

/** Subsections (REQ-polaris-generation-034 version 2.16). In a v8 draft: `subsection-answer` at a subsection's `answer` that is
 * non-normative or whose `text` is not one sentence by rule `one-sentence-answer` version 1. In an earlier draft: `field-version` at a
 * section's `subsections`, in place of the schema finding at that path. */
function subsectionStructure(doc: Readonly<Record<string, unknown>>, add: (finding: CheckFinding) => void): void {
  for (const at of subsectionFieldVersionPaths(doc)) {
    add({ kind: 'field-version', at, detail: `\`${SUBSECTIONS_FIELD}\` needs draft schema ${LOCAL_DRAFT_SCHEMA_VERSION_V8}` });
  }
  subsectionsOf(doc, (subsection, at) => {
    const answer = subsection['answer'];
    if (!isRecord(answer)) return;
    const name = subsectionName(subsection, at);
    // One finding per answer, by intent: a non-normative answer is not read for its sentence count, since the repair replaces it whole.
    if (answer['label'] === 'non-normative') {
      add({ kind: 'subsection-answer', at: `${at}.answer`, detail: `${name}: an answer is an inferred or unknown claim that answers the subsection's question, never non-normative` });
    } else if (typeof answer['text'] === 'string' && !oneSentenceAnswer(answer['text'])) {
      add({ kind: 'subsection-answer', at: `${at}.answer`, detail: `${name}: an answer is one sentence (rule one-sentence-answer version 1): it ends with a full stop, question mark or exclamation mark, and no such mark followed by a space stands inside it outside a quotation; write "for example", not "e.g."` });
    }
  });
}

/** Whether a diagram is drawn as a graph of `nodes` and `edges` at its draft's version: every diagram before v7, and from v7 one whose kind
 * is not `sequence` or `swimlane`. */
const graphDiagram = (doc: Readonly<Record<string, unknown>>, diagram: Readonly<Record<string, unknown>>): boolean =>
  !hasFigureKindForm(doc['schemaVersion']) || (diagram['kind'] !== 'sequence' && diagram['kind'] !== 'swimlane');

/** Each graph diagram's nodes and edges (records only), in draft order, with their JSON paths. */
function graphElements(doc: Readonly<Record<string, unknown>>, visit: (member: 'nodes' | 'edges', element: Readonly<Record<string, unknown>>, at: string, diagram: Readonly<Record<string, unknown>>, i: number) => void): void {
  list(doc['diagrams']).forEach((diagram, i) => {
    if (!isRecord(diagram) || !graphDiagram(doc, diagram)) return;
    for (const member of ['nodes', 'edges'] as const) {
      list(diagram[member]).forEach((element, j) => { if (isRecord(element)) visit(member, element, `$.diagrams[${i}].${member}[${j}]`, diagram, i); });
    }
  });
}

/** The paths at which a draft of schema v8 or earlier carries a graph edge's `relation` or a graph node's `unit`, each a field-version
 * finding (version 2.19), in draft order: each diagram's nodes, then its edges. */
function relationFieldVersionPaths(doc: Readonly<Record<string, unknown>>): string[] {
  if (hasRelationForm(doc['schemaVersion'])) return [];
  const out: string[] = [];
  graphElements(doc, (member, element, at) => {
    const field = member === 'nodes' ? UNIT_FIELD : RELATION_FIELD;
    if (Object.hasOwn(element, field)) out.push(`${at}.${field}`);
  });
  return out;
}

/** Relation types (REQ-polaris-generation-034 version 2.19). In an earlier draft: `field-version` at a graph edge's `relation` and a graph
 * node's `unit`, in place of the schema finding at that path. In a v9 draft: a `schema` finding at a unit's directory name, name, job key
 * or service key past 256 code units, which the schema's code-point bound passes. */
function relationStructure(doc: Readonly<Record<string, unknown>>, add: (finding: CheckFinding) => void): void {
  for (const at of relationFieldVersionPaths(doc)) {
    add({ kind: 'field-version', at, detail: `\`${at.endsWith(UNIT_FIELD) ? UNIT_FIELD : RELATION_FIELD}\` needs draft schema ${LOCAL_DRAFT_SCHEMA_VERSION}` });
  }
  if (!hasRelationForm(doc['schemaVersion'])) return;
  graphElements(doc, (member, element, at) => {
    if (member !== 'nodes' || !isRecord(element[UNIT_FIELD])) return;
    const unit = element[UNIT_FIELD];
    for (const key of ['path', 'name', 'job', 'service']) {
      const value = unit[key];
      if (key === 'path' && unit['kind'] !== 'top-level-directory') continue;
      if (typeof value === 'string' && value.length > UNIT_TEXT_LIMIT && [...value].length <= UNIT_TEXT_LIMIT) {
        add({ kind: 'schema', at: `${at}.${UNIT_FIELD}.${key}`, detail: `must be 1 to ${UNIT_TEXT_LIMIT} code units; is ${value.length}` });
      }
    }
  });
}

/** A node or edge as a finding names it (version 2.19): by its identity, or by its path where it has none. */
const elementName = (noun: 'node' | 'edge', element: Readonly<Record<string, unknown>>, at: string): string =>
  (typeof element['id'] === 'string' ? `the ${noun} ${JSON.stringify(element['id'])}` : `the ${noun} at ${at}`);

/** What rule `relation-witness` gives each edge of a v9 draft's produced graph diagrams, and which of its nodes' units name no unit of
 * their kind, in draft order. */
export interface RelationDecisions {
  readonly units: readonly { readonly at: string; readonly name: string; readonly kind: string; readonly fault: UnitFault }[];
  readonly edges: readonly { readonly at: string; readonly id: string; readonly name: string; readonly relation: RelationType; readonly decision: WitnessDecision }[];
}

/** Rule `relation-witness` version 1 over a v9 draft (version 2.19): `asserted` says whether the draft asserts an edge (labelled Inferred and
 * not a withheld item), `tree` is the blob test's view of the pinned tree (undefined where it could not be listed), and `facts` the facts
 * the caller derived. A unit is tested only where it is one of the six forms; an edge is decided only in a produced graph diagram. Empty for
 * any other draft. */
export function relationDecisions(doc: Readonly<Record<string, unknown>>, asserted: (edge: Readonly<Record<string, unknown>>) => boolean, tree: UnitTree | undefined, facts: WitnessInputs): RelationDecisions {
  const units: RelationDecisions['units'][number][] = [], edges: RelationDecisions['edges'][number][] = [];
  if (!hasRelationForm(doc['schemaVersion'])) return { units, edges };
  const ends = new Map<Readonly<Record<string, unknown>>, Map<string, EdgeEnd>>();
  graphElements(doc, (member, element, at, diagram) => {
    if (member !== 'nodes') return;
    const unit = unitOf(element[UNIT_FIELD]);
    const fault = unit === undefined ? undefined : unitFault(unit, tree);
    if (unit !== undefined && fault !== undefined) units.push({ at: `${at}.${UNIT_FIELD}`, name: elementName('node', element, at), kind: unit.kind, fault });
    const own = ends.get(diagram) ?? new Map<string, EdgeEnd>();
    if (typeof element['id'] === 'string' && !own.has(element['id'])) own.set(element['id'], unit === undefined ? undefined : { unit, invalid: fault !== undefined });
    ends.set(diagram, own);
  });
  graphElements(doc, (member, element, at, diagram) => {
    if (member !== 'edges' || !isRecord(diagram['disposition']) || diagram['disposition']['kind'] !== 'produced' || typeof element['id'] !== 'string') return;
    const relation = element[RELATION_FIELD] as RelationType;
    const own = ends.get(diagram);
    const end = (key: string): EdgeEnd => (typeof element[key] === 'string' ? own?.get(element[key] as string) : undefined);
    edges.push({ at, id: element['id'], name: elementName('edge', element, at), relation, decision: decideWitness({ asserted: asserted(element), relation, from: end('from'), to: end('to') }, facts) });
  });
  return { units, edges };
}

/** Check's findings of version 2.19, reported after every finding version 2.16 reports: a `unit-reference` finding per unit that names no
 * unit of its kind, in draft order of the nodes, then a `relation-challenged` finding per challenged edge, in draft order. No detail names a
 * unit's path or name. */
export function relationFindings(decisions: RelationDecisions): CheckFinding[] {
  return [
    ...decisions.units.map(({ at, name, kind, fault }): CheckFinding => ({ kind: 'unit-reference', at, detail: `${name}: its ${kind} unit names no unit of that kind: ${UNIT_FAULT_WORDS[fault]}` })),
    ...decisions.edges.flatMap(({ at, name, relation, decision }): CheckFinding[] => (decision.state !== 'challenged' ? [] : [{ kind: 'relation-challenged', at,
      detail: `${name}, relation ${relation}: no ${decision.factKind} fact joins this edge's two units in what rule ${decision.rule} version ${decision.ruleVersion} derived at the pinned revision; correct the arrow, its relation or its units` }])),
  ];
}

/** The authoring draft's rules: its schema and question limit, references, understanding record, blocks and discovery account. */
export function draftRules(pinned: string, maxQuestions: number, poleLimit: number = DEFAULT_POLE_LIMIT): SubjectRules {
  const parameters = { pinnedRevision: pinned, maxQuestions };
  const current = localDraftSchema(parameters);
  const v8 = localDraftSchema(parameters, 'home', 'required', 'taken', 'taken', 'absent');
  const v7 = localDraftSchema(parameters, 'home', 'required', 'taken', 'absent', 'absent');
  const v6 = localDraftSchema(parameters, 'home', 'required', 'absent', 'absent', 'absent');
  // The graph form with every kind permitted, with a v9 graph's `relation` and `unit` (version 2.19) or without them (v7 and v8).
  const unnamedOf = (relations: 'taken' | 'absent'): DraftSchemaWithDefs => ({
    root: (localDraftSchema(parameters, 'home', 'required', 'unnamed', 'taken', relations).root as { properties: Record<string, { items: Schema }> }).properties['diagrams']!.items, defs: current.defs });
  const unnamedV9 = unnamedOf('taken'), unnamedV8 = unnamedOf('absent');
  const v5 = localDraftSchema(parameters, 'home', 'absent', 'absent', 'absent', 'absent');
  const v4 = localDraftSchema(parameters, 'sectionId', 'absent', 'absent', 'absent', 'absent');
  const v5Reported = /^\$\.thesisBasis$/u, v4Reported = /^\$\.(?:diagrams\[\d+\]\.home|thesisBasis)$/u;
  return {
    noun: 'draft',
    schema: current,
    // A v7 draft: checked against v7's schema, with no schema finding where a figure-kind finding stands (version 2.5). A v6 draft: checked
    // against v6's schema, a v7 kind or member reported as field-version in place of its schema finding. A v5 draft: also its `thesisBasis`
    // (the one v6 field). A v4 or earlier draft: checked against the schema of its own form, also its `home` (the one v5 field).
    earlier: (subject) => {
      const version = isRecord(subject) ? subject['schemaVersion'] : undefined;
      const doc = isRecord(subject) ? subject : {};
      // A section's `subsections` in a v7 or earlier draft: a field-version finding in place of the schema finding at that path (version 2.16).
      const subsectionPaths = new Set(subsectionFieldVersionPaths(doc));
      // A graph edge's `relation` or a graph node's `unit` in a v8 or earlier draft: likewise (version 2.19).
      const relationPaths = new Set(relationFieldVersionPaths(doc));
      const fieldVersioned = (path: string): boolean => subsectionPaths.has(path) || relationPaths.has(path);
      if (hasFigureKindForm(version)) {
        const standing = new Set(figureKindFindings(doc).map((finding) => finding.member));
        // A diagram naming none of the eight kinds matches none of v7's forms, which would report one fault for all of it: its faults are
        // read against the graph form with every kind permitted instead, each at its own path, as v6 reports them.
        const diagrams = list(doc['diagrams']);
        const replaced = (error: { readonly path: string; readonly detail: string }) => {
          const match = /^\$\.diagrams\[(\d+)\]$/u.exec(error.path);
          if (match === null || !error.detail.startsWith('matches none of the permitted forms')) return undefined;
          const diagram = diagrams[Number(match[1])];
          if (isRecord(diagram) && membersOfKind(diagram['kind']) !== undefined) return undefined;
          return checkShape(hasRelationForm(version) ? unnamedV9 : unnamedV8, diagram).map((fault) => ({ path: `${error.path}${fault.path.slice(1)}`, detail: fault.detail }));
        };
        const schema = version === LOCAL_DRAFT_SCHEMA_VERSION ? current : version === LOCAL_DRAFT_SCHEMA_VERSION_V8 ? v8 : v7;
        return { schema, reported: { test: (path) => standing.has(path) || fieldVersioned(path) }, replaced };
      }
      const fieldVersion = new Set(figureFieldVersionPaths(doc));
      const [schema, also] = version === LOCAL_DRAFT_SCHEMA_VERSION_V6 ? [v6, null] : version === LOCAL_DRAFT_SCHEMA_VERSION_V5 ? [v5, v5Reported] : [v4, v4Reported];
      return { schema, reported: { test: (path) => fieldVersion.has(path) || fieldVersioned(path) || (also !== null && also.test(path)) } };
    },
    maxQuestions,
    structural: (doc, add) => { draftStructure(doc, add, poleLimit); thesisStructure(doc, add); figureStructure(doc, add); subsectionStructure(doc, add); relationStructure(doc, add); },
    blocks: collectBlocks,
    account: { key: 'discovery', parts: ['selected', 'excluded', 'unresolved', 'deferred'] },
  };
}

function draftStructure(doc: Readonly<Record<string, unknown>>, add: (finding: CheckFinding) => void, poleLimit: number): void {
  // References.
  const sectionIds = new Set(list(doc['sections']).flatMap((section) => (isRecord(section) && text(section['id']) !== undefined ? [text(section['id'])!] : [])));
  const diveIds = new Set(list(doc['deepDives']).flatMap((dive) => (isRecord(dive) && text(dive['id']) !== undefined ? [text(dive['id'])!] : [])));
  // A diagram's page (syzygy-3efd.18): up to v4 the section it names in `sectionId`, checked exactly as before (diagrams, then deep
  // dives); from v5 its `home`, a section or a deep dive by `target`, or the overview. A home finding names the diagram's identity.
  const v5 = hasHomeForm(doc['schemaVersion']);
  const diagramFinding = (diagram: Readonly<Record<string, unknown>>, at: string, detail: string, kind: 'diagram-home' | 'unresolved-reference' | 'field-version' = 'diagram-home'): void => {
    const id = text(diagram['id']);
    add({ kind, at, detail: id === undefined ? detail : `the diagram ${JSON.stringify(id)}: ${detail}` });
  };
  if (!v5) {
    list(doc['diagrams']).forEach((diagram, i) => {
      if (!isRecord(diagram)) return;
      const sectionId = text(diagram['sectionId']);
      if (sectionId !== undefined && !sectionIds.has(sectionId)) add({ kind: 'unresolved-reference', at: `$.diagrams[${i}].sectionId`, detail: `no section has the identity ${JSON.stringify(sectionId)}` });
    });
  }
  list(doc['deepDives']).forEach((dive, i) => {
    if (!isRecord(dive)) return;
    const sectionId = text(dive['sectionId']);
    if (sectionId !== undefined && !sectionIds.has(sectionId)) add({ kind: 'unresolved-reference', at: `$.deepDives[${i}].sectionId`, detail: `no section has the identity ${JSON.stringify(sectionId)}` });
  });
  list(doc['diagrams']).forEach((diagram, i) => {
    if (!isRecord(diagram)) return;
    const at = `$.diagrams[${i}]`;
    const hasSection = Object.hasOwn(diagram, 'sectionId'), hasHome = Object.hasOwn(diagram, 'home');
    if (!v5) {
      if (hasHome) diagramFinding(diagram, `${at}.home`, `\`home\` needs draft schema ${LOCAL_DRAFT_SCHEMA_VERSION_V5}; an earlier draft names its diagram's section in \`sectionId\``, 'field-version');
      return;
    }
    if (hasSection) diagramFinding(diagram, `${at}.sectionId`, `a ${String(doc['schemaVersion'])} diagram names its page in \`home\`, not \`sectionId\`; it has exactly one home`);
    if (!hasHome) { diagramFinding(diagram, at, 'the diagram names no page; give it a `home`: a section or a deep dive by `target`, or the overview'); return; }
    const home = diagram['home'];
    if (!isRecord(home)) { diagramFinding(diagram, `${at}.home`, 'a home is an object: `{"kind": "section" or "deep-dive", "target": <identity>}` or `{"kind": "overview"}`'); return; }
    for (const key of Object.keys(home)) {
      if (key !== 'kind' && key !== 'target') diagramFinding(diagram, `${at}.home.${key}`, `a home has only \`kind\` and \`target\`; \`${key}\` is not one of them`);
    }
    const kind = text(home['kind']), target = text(home['target']);
    if (kind === 'overview') {
      if (Object.hasOwn(home, 'target')) diagramFinding(diagram, `${at}.home.target`, 'the overview is one page and takes no `target`');
    } else if (kind === 'section' || kind === 'deep-dive') {
      if (target === undefined) diagramFinding(diagram, `${at}.home`, `a ${kind} home names its ${kind === 'section' ? 'section' : 'deep dive'} in \`target\``);
      else if (!(kind === 'section' ? sectionIds : diveIds).has(target)) diagramFinding(diagram, `${at}.home.target`, `no ${kind === 'section' ? 'section' : 'deep dive'} has the identity ${JSON.stringify(target)}`, 'unresolved-reference');
    } else {
      diagramFinding(diagram, `${at}.home.kind`, 'a home\'s `kind` is `section`, `deep-dive` or `overview`');
    }
  });
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
      walk(asset, '$', (value, at) => { const id = text(value['id']); if (id !== undefined && !/\.(?:citations|evidence)\[|\.citation$/u.test(at)) own.add(id); });
      list(asset['disposition']['assetIds']).forEach((assetId, k) => {
        if (typeof assetId === 'string' && !own.has(assetId)) add({ kind: 'unresolved-reference', at: `$.${part}[${i}].disposition.assetIds[${k}]`, detail: `${JSON.stringify(assetId)} is not this asset or a part of it` });
      });
    });
  }

  // A list repeating a diagram names one in its own section (a deep dive's section is the one it belongs to); a v5 diagram homed on a
  // deep dive belongs to that deep dive's section too, and one on the overview to no section.
  const diveSections = new Map(list(doc['deepDives']).flatMap((dive) => (isRecord(dive) && text(dive['id']) !== undefined ? [[text(dive['id'])!, text(dive['sectionId'])] as const] : [])));
  const sectionOfDiagram = (diagram: Readonly<Record<string, unknown>>): string | undefined => {
    if (!v5 || !isRecord(diagram['home'])) return text(diagram['sectionId']);
    const home = diagram['home'];
    return home['kind'] === 'section' ? text(home['target']) : home['kind'] === 'deep-dive' ? diveSections.get(text(home['target']) ?? '') : undefined;
  };
  const diagramSections = new Map(list(doc['diagrams']).flatMap((diagram) => (isRecord(diagram) && text(diagram['id']) !== undefined ? [[text(diagram['id'])!, sectionOfDiagram(diagram)] as const] : [])));
  for (const part of ['sections', 'deepDives'] as const) {
    list(doc[part]).forEach((container, i) => {
      if (!isRecord(container)) return;
      const sectionId = part === 'sections' ? text(container['id']) : text(container['sectionId']);
      walk(container, `$.${part}[${i}]`, (value, at) => {
        if (!Object.hasOwn(value, 'repeatsDiagram')) return;
        const named = text(value['repeatsDiagram']);
        if (named === undefined) return;
        if (!diagramSections.has(named)) add({ kind: 'repeats-diagram', at: `${at}.repeatsDiagram`, detail: `no diagram has the identity ${JSON.stringify(named)}` });
        else if (diagramSections.get(named) !== sectionId) add({ kind: 'repeats-diagram', at: `${at}.repeatsDiagram`, detail: `the diagram ${JSON.stringify(named)} is not in this list's section; a list repeats a diagram of its own section` });
      });
    });
  }

  // Poles (dossier spec v1.5): at most the run's limit, every section in exactly one, none empty, and a named why section. Whether
  // that section answers why the project exists, and whether the Poles fit what the repository holds, are review judgements.
  // Only a v4 draft has Poles; in an earlier one the field is a field-version finding and nothing more.
  const v4 = hasV4Forms(doc['schemaVersion']);
  if (v4 && Object.hasOwn(doc, 'poles')) {
    const poles = list(doc['poles']);
    if (poles.length > poleLimit) add({ kind: 'pole', at: '$.poles', detail: `the draft declares ${poles.length} Poles; this run's Pole limit is ${poleLimit}` });
    const homes = new Map<string, number[]>();
    poles.forEach((pole, i) => {
      if (!isRecord(pole)) return;
      const sections = list(pole['sections']);
      if (sections.length === 0) add({ kind: 'pole', at: `$.poles[${i}].sections`, detail: 'a Pole holds at least one section' });
      sections.forEach((section, k) => {
        const id = text(section);
        if (id === undefined) return;
        if (!sectionIds.has(id)) add({ kind: 'unresolved-reference', at: `$.poles[${i}].sections[${k}]`, detail: `no section has the identity ${JSON.stringify(id)}` });
        else homes.set(id, [...(homes.get(id) ?? []), i]);
      });
    });
    list(doc['sections']).forEach((section, i) => {
      const id = isRecord(section) ? text(section['id']) : undefined;
      if (id === undefined) return;
      const home = homes.get(id) ?? [];
      if (home.length === 0) add({ kind: 'pole', at: `$.sections[${i}]`, detail: `the section ${JSON.stringify(id)} is in no Pole; with Poles, every section is in exactly one` });
      else if (home.length > 1) add({ kind: 'pole', at: `$.sections[${i}]`, detail: `the section ${JSON.stringify(id)} is in ${home.length} Poles (${home.map((n) => `$.poles[${n}]`).join(', ')}); every section is in exactly one` });
    });
    const why = text(doc['whySection']);
    if (why === undefined) add({ kind: 'pole', at: '$.whySection', detail: 'a draft with Poles names in `whySection` the section that answers why the project exists' });
    else if (!sectionIds.has(why)) add({ kind: 'pole', at: '$.whySection', detail: `\`whySection\` names ${JSON.stringify(why)}, which is no section of this draft` });
  } else if (v4 && text(doc['whySection']) !== undefined && !sectionIds.has(text(doc['whySection'])!)) {
    add({ kind: 'unresolved-reference', at: '$.whySection', detail: `no section has the identity ${JSON.stringify(text(doc['whySection']))}` });
  }

  // Task routes (the index-and-task-routes change): a member of a v5 or later draft. Each step is a claim block (`collectBlocks`), so its citations,
  // quotations and review entry are checked as any block's are; here only its place in the dossier, which must be one the draft has.
  if (Object.hasOwn(doc, TASK_ROUTE_FIELD)) {
    // The first schema that admits the member is v5 by name, whatever the latest schema is: every later one admits it too.
    if ((PRE_V5_SCHEMA_VERSIONS as readonly unknown[]).includes(doc['schemaVersion'])) add({ kind: 'field-version', at: `$.${TASK_ROUTE_FIELD}`, detail: `\`${TASK_ROUTE_FIELD}\` needs draft schema polaris-dossier-local-draft-v5` });
    routeSteps(doc, (step, at) => {
      const see = step['see'];
      if (!isRecord(see)) return;
      const kind = text(see['kind']), target = text(see['target']);
      if (target === undefined || (kind !== 'section' && kind !== 'deep-dive')) return;
      if (!(kind === 'section' ? sectionIds : diveIds).has(target)) add({ kind: 'unresolved-reference', at: `${at}.see.target`, detail: `no ${kind === 'section' ? 'section' : 'deep dive'} has the identity ${JSON.stringify(target)}` });
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

/** Every step of every task route, with its JSON path. */
function routeSteps(doc: Readonly<Record<string, unknown>>, visit: (step: Readonly<Record<string, unknown>>, at: string) => void): void {
  list(doc[TASK_ROUTE_FIELD]).forEach((route, i) => {
    if (!isRecord(route)) return;
    list(route['steps']).forEach((step, k) => { if (isRecord(step)) visit(step, `$.${TASK_ROUTE_FIELD}[${i}].steps[${k}]`); });
  });
}

/** The claim blocks (introduction, section and deep-dive paragraphs and their children, the claim forms of rich elements and the steps
 * of task routes) and the understanding record's items. */
export function collectBlocks(doc: Readonly<Record<string, unknown>>): Block[] {
  const out: Block[] = [];
  const claim = (at: string, value: Readonly<Record<string, unknown>>): Block =>
    ({ at, value, textKey: 'text', allowed: ['inferred', 'unknown', 'non-normative'], quotable: 'inferred', unquotable: CLAIM_UNQUOTABLE });
  if (isRecord(doc['introduction'])) out.push(claim('$.introduction', doc['introduction']));
  for (const part of ['sections', 'deepDives'] as const) {
    list(doc[part]).forEach((container, i) => {
      if (!isRecord(container)) return;
      list(container['paragraphs']).forEach((entry, j) => contentClaims(`$.${part}[${i}].paragraphs[${j}]`, entry, (at, value) => out.push(claim(at, value))));
      // A v8 section's subsections follow its own paragraphs (version 2.16): each answer, then that subsection's paragraphs. Their claims
      // are the section's for every rule; in an earlier draft the member is field-version and none of it is a block.
      if (part === 'sections') subsectionsOfSection(doc, container, `$.sections[${i}]`, (subsection, at) => {
        if (isRecord(subsection['answer'])) out.push(claim(`${at}.answer`, subsection['answer']));
        list(subsection['paragraphs']).forEach((entry, k) => contentClaims(`${at}.paragraphs[${k}]`, entry, (inner, value) => out.push(claim(inner, value))));
      });
    });
  }
  // A route step is a claim block and only ever Inferred: an unknown or non-normative step would send a reader nowhere.
  routeSteps(doc, (step, at) => out.push({ ...claim(at, step), allowed: ['inferred'] }));
  const understanding = isRecord(doc['understanding']) ? doc['understanding'] : {};
  for (const item of UNDERSTANDING_ITEMS) {
    list(understanding[item]).forEach((entry, i) => { if (isRecord(entry)) out.push({ at: `$.understanding.${item}[${i}]`, value: entry, textKey: 'statement', allowed: ['inferred', 'unknown'], quotable: null, unquotable: CLAIM_UNQUOTABLE }); });
  }
  return out;
}

/** Every citation in the draft: each object in a `citations` or `evidence` list, and a code excerpt's one `citation`. */
export function collectCitations(doc: Readonly<Record<string, unknown>>): Citation[] {
  const out: Citation[] = [];
  walk(doc, '$', (value, at) => {
    for (const key of ['citations', 'evidence'] as const) {
      list(value[key]).forEach((citation, i) => { if (isRecord(citation)) out.push({ at: `${at}.${key}[${i}]`, value: citation }); });
    }
    if (value['kind'] === 'code' && isRecord(value['citation'])) out.push({ at: `${at}.citation`, value: value['citation'] });
  });
  return out;
}
