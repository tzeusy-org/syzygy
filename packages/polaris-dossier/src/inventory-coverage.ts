import * as path from 'node:path';
import { parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { isRecord, sha256 } from '@syzygy/support';
import { collectBlocks, collectCitations } from './check-derive.js';
import { DRAFT_JSON_LIMITS, line, list, text } from './check-model.js';
import { INVENTORY_OMISSIONS_SINCE } from './draft-schema.js';
import type { GateSources } from './gate-sources.js';
import type { InventoryOfRecord } from './inventory.js';
import { protectedProduct, UrlProductReadRefusal, type RunProductReads } from './url-operation-products.js';
import { readBoundedFile } from './check-record-read.js';
import { RUN_TREE_BOUNDS } from './run-tree-read.js';

/** Which entries of the independent inventory no block of the draft covers, told to the author at check time, before any reviewer is
 * asked (syzygy-5dhm.28, pursuit 2026-11-21b move R4 slice 1; REQ-polaris-generation-034 version 2.12).
 *
 * The fidelity review asks of every inventory entry whether the draft represents it or omits it with a justification, and an entry that
 * is neither costs a review round. This compares the two mechanically first. An entry is covered when a citation in the draft's reading
 * content is on the same path with overlapping lines as one of the entry's citations, or a claim block's text names a path the entry
 * cites. An entry the draft records in `inventoryOmissions` is the author's justified omission and is not listed. Every other entry is
 * listed by its identifier and the paths it cites, never its statement, its kind or its line ranges, so the inventory stays independent
 * of the draft. A path a secret detector matches is counted and never named.
 *
 * Advice, like `readerAdvice` and `reviewReach`: on `check`'s report only, never a finding, the outcome, the exit code or the stored
 * check record. Where no inventory counts, or it cannot be read, the advice is Unknown with the reason, never an empty list. */

/** Version 2 (the index-and-task-routes change) is version 1 with a task route's steps counted: their citations are reading content
 * and their text is searched for a named path. For a draft without `taskRoutes` the two versions decide every entry alike. */
export const COVERAGE_RULE = Object.freeze({ id: 'overlap-or-path-named', version: 2 } as const);

/** The parts of a draft whose citations count as covering an entry: what a reader is shown, a task route's steps among them (rule
 * version 2). The understanding record, the discovery account, the clarifications and the omission record itself are the author's
 * ledger, not reading content. */
const READING_PARTS = /^\$\.(?:introduction|sections|diagrams|deepDives|unresolved|taskRoutes)(?:$|[.[])/u;

/** A cited span: a path and its closed line range. A citation without a well-formed range counts as its whole file, so a malformed
 * citation (already a finding of `check`) never makes an entry look uncovered. */
interface Span { readonly path: string; readonly start: number; readonly end: number }

function spanOf(citation: Readonly<Record<string, unknown>>): Span | undefined {
  const cited = text(citation['path']);
  if (cited === undefined) return undefined;
  const start = line(citation['startLine']), end = line(citation['endLine']);
  return start !== undefined && end !== undefined && start <= end ? { path: cited, start, end } : { path: cited, start: 1, end: Number.MAX_SAFE_INTEGER };
}

/** Same path and intersecting closed line ranges. */
export const spansOverlap = (a: Span, b: Span): boolean => a.path === b.path && a.start <= b.end && b.start <= a.end;

export interface UncoveredEntry {
  /** The entry's identifier in the inventory; null where it carries none. */
  readonly entryId: string | null;
  /** The distinct paths the entry cites, in its own order; a path a secret detector matches is left out and counted. */
  readonly paths: readonly string[];
  readonly unnamedPaths: number;
}

export interface CoverageComparison {
  readonly counts: { readonly entries: number; readonly covered: number; readonly omitted: number; readonly uncovered: number };
  readonly uncovered: readonly UncoveredEntry[];
  /** The draft's omission record against this inventory: `rows`, how many rows it has that carry an identifier and a reason;
   * `recorded`, how many distinct identifiers those rows name; `duplicated`, the identifiers more than one row names; `unmatched`,
   * those naming no entry of the inventory; `alsoCovered`, those naming an entry the rule finds covered anyway. Identifiers only, as
   * the draft wrote them. A row without a string identifier and a non-empty string reason records nothing. */
  readonly omissions: { readonly rows: number; readonly recorded: number; readonly duplicated: readonly string[]; readonly unmatched: readonly string[]; readonly alsoCovered: readonly string[] };
}

/** Compare a parsed draft with a parsed inventory. Pure; tolerates either of the wrong shape. */
export function compareInventoryCoverage(draft: unknown, inventory: unknown, isSecretPath: (cited: string) => boolean): CoverageComparison {
  const doc: Readonly<Record<string, unknown>> = isRecord(draft) ? draft : {};
  const drafted: Span[] = [];
  for (const citation of collectCitations(doc)) {
    if (!READING_PARTS.test(citation.at)) continue;
    const span = spanOf(citation.value);
    if (span !== undefined) drafted.push(span);
  }
  const prose = collectBlocks(doc).flatMap((block) => (block.textKey === 'text' ? [text(block.value['text']) ?? ''] : [])).join('\n');
  const omitted = new Set<string>();
  const duplicated = new Set<string>();
  let omissionRows = 0;
  for (const omission of list(doc['inventoryOmissions'])) {
    if (!isRecord(omission)) continue;
    const entryId = text(omission['entryId']), reason = text(omission['reason']);
    if (entryId === undefined || entryId === '' || reason === undefined || reason === '') continue;
    omissionRows++;
    if (omitted.has(entryId)) duplicated.add(entryId);
    omitted.add(entryId);
  }

  const entries = list(isRecord(inventory) ? inventory['entries'] : undefined).filter(isRecord);
  const known = new Set<string>();
  const uncovered: UncoveredEntry[] = [];
  const alsoCovered: string[] = [];
  let covered = 0, omittedCount = 0;
  for (const entry of entries) {
    const entryId = text(entry['id']) ?? null;
    if (entryId !== null) known.add(entryId);
    const cited: Span[] = [];
    for (const citation of list(entry['citations'])) {
      const span = isRecord(citation) ? spanOf(citation) : undefined;
      if (span !== undefined) cited.push(span);
    }
    const isCovered = cited.some((mine) => drafted.some((theirs) => spansOverlap(mine, theirs)) || (mine.path !== '' && prose.includes(mine.path)));
    const isOmitted = entryId !== null && omitted.has(entryId);
    if (isCovered) {
      covered++;
      if (isOmitted) alsoCovered.push(entryId);
    } else if (isOmitted) {
      omittedCount++;
    } else {
      const distinct = [...new Set(cited.map((span) => span.path))];
      const paths = distinct.filter((cited_) => !isSecretPath(cited_));
      uncovered.push({ entryId, paths, unnamedPaths: distinct.length - paths.length });
    }
  }
  return {
    counts: { entries: entries.length, covered, omitted: omittedCount, uncovered: uncovered.length },
    uncovered,
    omissions: { rows: omissionRows, recorded: omitted.size, duplicated: [...duplicated], unmatched: [...omitted].filter((entryId) => !known.has(entryId)), alsoCovered },
  };
}

/** The reader of the inventory of record (`inventoryOfRecord` in `inventory.ts`), passed in by the caller: `inventory.ts` imports the
 * check, so the check takes it as a port and does not import it back. */
export type InventoryOfRecordReader = (runDir: string, recheck: { readonly sources: GateSources; readonly now: number; readonly productReads?: RunProductReads }) => Promise<InventoryOfRecord>;

export type InventoryCoverageAdvice =
  | { readonly state: 'unknown'; readonly why: string; readonly note: string }
  | ({
    readonly state: 'compared';
    readonly rule: typeof COVERAGE_RULE;
    /** The inventory compared: the one of record at this check, read from the run directory, which the agent sessions can write. */
    readonly inventory: { readonly revision: number; readonly sha256: string; readonly label: 'Inferred'; readonly basis: string };
    readonly note: string;
  } & CoverageComparison);

const NOTE = `Advice: it sets no outcome and is not stored in the check record. Each entry listed is an entry of the independent inventory of record that no block of this draft covers by this rule: no citation in the draft's introduction, sections, diagrams, deep dives or unresolved list is on the same path with overlapping lines as a citation of the entry, and no claim block's text contains a path the entry cites (a path inside a longer path counts). Only the entry's identifier and the paths it cites are given, never its text, so the inventory stays independent of this draft. The fidelity review asks of every entry whether the draft represents it or omits it with a justification, and an entry that is neither is a blocking finding that costs a review round. Before asking for a review, read the listed paths and either represent what they state in a block that cites it, or record the omission in the draft's \`inventoryOmissions\` as \`{"entryId": ..., "reason": ...}\` (draft schema ${INVENTORY_OMISSIONS_SINCE} or later); a record needs both members, an entry so recorded is not listed again, and the reviewer is told of the record and still judges whether the omission is justified. An entry this draft does represent needs no record, even while it is listed: the record is for an entry the draft leaves out. The rule is mechanical: a listed entry may be represented in words the rule cannot see, and an entry not listed may still be judged unrepresented. An entry that cites nothing can be covered by no citation and is listed with no path. A path a secret detector matches is counted in \`unnamedPaths\` and never named.`;
const UNKNOWN_NOTE = 'Advice: it sets no outcome and is not stored in the check record. Whether this draft covers the independent inventory is Unknown at this check, not zero uncovered entries: check again once an inventory counts.';
const BASIS = 'the highest-numbered checked inventory revision in the run directory, its check passed and its frozen bytes equal to the digest its check recorded; the run directory is within the agent sessions\' write reach';

const unknown = (why: string): InventoryCoverageAdvice => ({ state: 'unknown', why, note: UNKNOWN_NOTE });

/** The same mechanical projection is independently checked by the protected product bridge. */
export function comparedInventoryCoverageAdvice(draft: unknown, inventory: unknown,
  binding: { readonly revision: number; readonly sha256: string }, isSecretPath: (cited: string) => boolean,
  protectedRead = false): InventoryCoverageAdvice {
  return { state: 'compared', rule: COVERAGE_RULE,
    inventory: { ...binding, label: 'Inferred', basis: protectedRead
      ? 'the highest-numbered authenticated checked inventory revision, its passed check and exact frozen bytes read under the current protected product lease'
      : BASIS }, ...compareInventoryCoverage(draft, inventory, isSecretPath), note: NOTE };
}

export interface CoverageAdviceInputs {
  readonly inventoryOfRecord?: InventoryOfRecordReader;
  readonly sources: GateSources;
  readonly now: number;
  readonly productReads?: RunProductReads;
  readonly isSecretPath: (cited: string) => boolean;
}

/** The advice for one parsed draft of one run. Ordinary read failures yield Unknown advice. A protected product refusal propagates so an unavailable authority cannot freeze a new check. */
export async function inventoryCoverageAdvice(runDir: string, draft: unknown, inputs: CoverageAdviceInputs): Promise<InventoryCoverageAdvice> {
  if (inputs.inventoryOfRecord === undefined) return unknown('this check was given no reader of the inventory of record');
  try {
    const counted = await inputs.inventoryOfRecord(runDir, { sources: inputs.sources, now: inputs.now, ...(inputs.productReads === undefined ? {} : { productReads: inputs.productReads }) });
    if (!counted.counts) return unknown(`no inventory counts: ${counted.why}`);
    if (inputs.productReads !== undefined && isRecord(draft) && draft['sessionId'] === counted.sessionId.value)
      return unknown(`no inventory counts: inventory revision ${counted.revision} declares the authoring session's identifier`);
    const bytes = inputs.productReads === undefined
      ? readBoundedFile(path.join(path.resolve(runDir), counted.file), RUN_TREE_BOUNDS.inventory)
      : protectedProduct(inputs.productReads, runDir, counted.file);
    if (bytes === null) throw new UrlProductReadRefusal();
    if (sha256(bytes) !== counted.sha256) {
      if (inputs.productReads !== undefined) throw new UrlProductReadRefusal();
      return unknown(`the frozen inventory ${counted.file} changed after it was counted`);
    }
    const inventory = parseBoundedJson(new TextDecoder('utf-8', { fatal: true }).decode(bytes), DRAFT_JSON_LIMITS);
    if (!isRecord(inventory)) {
      if (inputs.productReads !== undefined) throw new UrlProductReadRefusal();
      return unknown(`the frozen inventory ${counted.file} is not one JSON object`);
    }
    return comparedInventoryCoverageAdvice(draft, inventory, { revision: counted.revision, sha256: counted.sha256 }, inputs.isSecretPath, inputs.productReads !== undefined);
  } catch (cause) {
    if (inputs.productReads !== undefined) throw new UrlProductReadRefusal();
    return unknown(`the inventory of record could not be read or compared (${cause instanceof Error ? cause.name : 'unknown-error'})`);
  }
}
