import { isRecord } from '@syzygy/support';
import { PRE_V5_SCHEMA_VERSIONS } from './draft-schema.js';
import { compareInventoryCoverage, type UncoveredEntry } from './inventory-coverage.js';
import type { PacketSpan } from './review-model.js';
import { standingBySubject } from './review-verdict.js';
import { isWithheldItem } from './withheld-items.js';

/** The fidelity review waits until every listed inventory entry has an outcome (syzygy-5dhm.29, pursuit 2026-11-21b move R4 slice 2;
 * REQ-polaris-generation-035 version 2.28).
 *
 * Syzygy issues no fidelity packet, by `review-packet` or by a review `session-prompt` (and so by the launched run's delivery), while an
 * entry of the inventory of record has no outcome in the passed draft. An entry has an outcome when the coverage rule of version 2.12
 * (`inventory-coverage.ts`, `overlap-or-path-named`) finds a block of the draft covering it, or when the draft's `inventoryOmissions`
 * records it with a reason. An entry screening withholds (every span it cites withheld, or a quotation from one) has its outcome from
 * Syzygy (`withheld`) and never holds the review. Only a draft whose schema has `inventoryOmissions` (v5 and later) is held: an earlier
 * draft could record no omission, so its packet is issued as before.
 *
 * The hold settles bookkeeping, never truth: the reviewer still judges every entry, every omission's reason and every claim. It changes
 * no packet byte, no verdict rule and no screen, and `review-check` and the review of record rebuild the packet without it, so a verdict
 * already written for an older packet is read as before. */

/** At most this many entries are named in the refusal's one-paragraph reason; every entry is in its `reasons`. */
export const HELD_ENTRIES_NAMED = 12;

export interface CoverageRevisionPair {
  readonly draftRevision: number;
  readonly inventoryRevision: number;
}

export interface CoverageHold {
  readonly pair: CoverageRevisionPair;
  readonly entries: readonly UncoveredEntry[];
  /** One paragraph: what waits, why, the entries (up to `HELD_ENTRIES_NAMED`), and what the author does next. */
  readonly reason: string;
  /** One line per entry without an outcome, every one. */
  readonly reasons: readonly string[];
}

/** Whether a draft of this schema version is held: one that can carry `inventoryOmissions`. */
export const heldSchema = (schemaVersion: unknown): boolean => typeof schemaVersion === 'string' && !PRE_V5_SCHEMA_VERSIONS.includes(schemaVersion);

/** How one entry is named: its identifier and the paths it cites, each a JSON string (both are the inventory session's text), never its
 * statement; a path a secret detector matches is counted, never named. */
export function heldEntryLine(entry: UncoveredEntry): string {
  const id = entry.entryId === null ? 'an entry with no identifier' : JSON.stringify(entry.entryId);
  const named = entry.paths.map((cited) => JSON.stringify(cited));
  const unnamed = entry.unnamedPaths === 0 ? [] : [`${entry.unnamedPaths} path${entry.unnamedPaths === 1 ? '' : 's'} not named because a secret detector matches ${entry.unnamedPaths === 1 ? 'it' : 'them'}`];
  const cites = [...named, ...unnamed];
  return `${id} (${cites.length === 0 ? 'cites no path' : cites.join(', ')})`;
}

/** The hold for one packet build's subject, or undefined when the packet may be issued. Pure. */
export function fidelityCoverageHold(
  subject: { readonly run: string; readonly draftRevision: number; readonly draft: Readonly<Record<string, unknown>>; readonly inventoryRevision: number; readonly inventory: Readonly<Record<string, unknown>> },
  spans: readonly PacketSpan[], isSecretPath: (cited: string) => boolean,
): CoverageHold | undefined {
  if (!heldSchema(subject.draft['schemaVersion'])) return undefined;
  const standing = standingBySubject(spans).inventory;
  const entries = (Array.isArray(subject.inventory['entries']) ? subject.inventory['entries'] : []).filter(isRecord).filter((entry) => !isWithheldItem(entry, standing));
  const uncovered = compareInventoryCoverage(subject.draft, { entries }, isSecretPath).uncovered;
  if (uncovered.length === 0) return undefined;
  const reasons = uncovered.map(heldEntryLine);
  const n = uncovered.length;
  const listed = reasons.slice(0, HELD_ENTRIES_NAMED);
  const rest = n - listed.length;
  const reason = `The fidelity review waits, so no fidelity packet is issued: ${n} entr${n === 1 ? 'y' : 'ies'} of inventory revision ${subject.inventoryRevision} `
    + `ha${n === 1 ? 's' : 've'} no outcome in draft revision ${subject.draftRevision}. An entry has an outcome when a block of the draft cites a span on one of its paths `
    + 'with overlapping lines, or a claim block\'s text names one of its paths, or the draft\'s `inventoryOmissions` records it with a reason. '
    + `Without one: ${listed.join('; ')}${rest > 0 ? `; and ${rest} more (every one is in this refusal's reasons and in check's inventoryCoverageAdvice)` : ''}. `
    + `${coverageRepairSteps(subject.run)} `
    + 'The packet is issued once a passed draft revision leaves no entry without an outcome; the reviewer still judges each entry and each reason.';
  return { pair: { draftRevision: subject.draftRevision, inventoryRevision: subject.inventoryRevision }, entries: uncovered, reason, reasons };
}

/** The refusal shares the same frozen subject as the packet build on every issuance route. */
export function coverageRefusal(hold: CoverageHold): {
  readonly stage: 'coverage'; readonly reason: string; readonly reasons: readonly string[]; readonly coverage: CoverageRevisionPair;
} {
  return { stage: 'coverage', reason: hold.reason, reasons: hold.reasons, coverage: hold.pair };
}

/** The repair fits in the author-pane notice even if none of the entry descriptions do. */
export function coverageRepairSteps(run: string): string {
  return `Next: in drafts/next.json, either represent each entry in a block that cites what it states, or add {"entryId": ..., "reason": ...} to \`inventoryOmissions\` saying why a reader of this dossier does not need it; then run syzygy dossier check ${run} again.`;
}

/** The successful author-pane notice key for one frozen draft and inventory pair. */
export const coverageHoldKey = (draftRevision: number, inventoryRevision: number): string => `coverage-held-${draftRevision}/${inventoryRevision}`;

const COVERAGE_NOTICE_LIMIT = 4000;

export function coverageHoldMessage(pair: CoverageRevisionPair, reasons: readonly string[]): string {
  const beginning = `Syzygy: The fidelity review waits. Draft revision ${pair.draftRevision} leaves ${reasons.length} entr${reasons.length === 1 ? 'y' : 'ies'} from inventory revision ${pair.inventoryRevision} without an outcome. `;
  const ending = `${coverageRepairSteps('.')} This repair counts against the run's repair-cycle limit like any other draft revision.`;
  const omitted = (count: number): string => `${count} ${count === 1 ? 'entry description' : 'entry descriptions'} omitted; see check's inventoryCoverageAdvice. `;
  const listed: string[] = [];
  let used = beginning.length + ending.length + 'Entries: '.length + omitted(reasons.length).length;
  for (const reason of reasons.slice(0, HELD_ENTRIES_NAMED)) {
    const line = reason.replace(/\s+/gu, ' ').trim();
    if (used + line.length + 2 > COVERAGE_NOTICE_LIMIT) break;
    used += line.length + 2;
    listed.push(line);
  }
  const names = listed.length > 0 ? `Entries: ${listed.join('; ')}. ` : '';
  const rest = reasons.length - listed.length;
  return `${beginning}${names}${rest > 0 ? omitted(rest) : ''}${ending}`;
}

export type CoverageSend = 'sent' | 'failed' | 'unsubmitted';

/** Enter is a second operation. A failure there leaves the already typed notice unsubmitted. */
export function submitCoverageNotice(sendLiteral: () => boolean, submit: () => boolean): CoverageSend {
  if (!sendLiteral()) return 'failed';
  return submit() ? 'sent' : 'unsubmitted';
}
export type CoverageNoticeAttempt = CoverageSend | 'exhausted' | 'unchanged';
interface PendingCoverageNotice { readonly message: string; attempts: number; exhausted: boolean }
interface FidelityStep { readonly exit: number; readonly doc: Record<string, unknown> | null; readonly stderr: string }
type FidelityAdvance =
  | { readonly kind: 'coverage'; readonly currentHeld: boolean; readonly pair: CoverageRevisionPair; readonly observed: boolean; readonly notice: CoverageNoticeAttempt }
  | { readonly kind: 'delivery'; readonly step: FidelityStep };
export const COVERAGE_NOTICE_ATTEMPTS = 5;

/** Keeps the observed hold separate from a sent notice. Retries use the saved, bounded text without rebuilding a held packet. */
export class CoverageHoldNotices {
  private readonly holds = new Map<string, PendingCoverageNotice>();
  private submissionUnknown = false;

  constructor(private readonly notified: string[]) {}

  async advance(current: CoverageRevisionPair, deliver: () => Promise<FidelityStep>, send: (message: string) => CoverageSend): Promise<FidelityAdvance> {
    const currentKey = coverageHoldKey(current.draftRevision, current.inventoryRevision);
    let pair = current;
    let observed = false;
    if (!this.knows(currentKey)) {
      const result = await deliver();
      const selected = result.exit === 0 ? undefined : this.observe(result.doc);
      if (selected === undefined) return { kind: 'delivery', step: result };
      pair = selected;
      observed = true;
    }
    const notice = this.send(coverageHoldKey(pair.draftRevision, pair.inventoryRevision), send);
    return { kind: 'coverage', currentHeld: this.knows(currentKey), pair, observed, notice };
  }

  private knows(key: string): boolean {
    return this.holds.has(key) || this.notified.includes(key);
  }

  private observe(document: unknown): CoverageRevisionPair | undefined {
    if (!isRecord(document) || document['command'] !== 'session-prompt' || document['outcome'] !== 'refused' || document['stage'] !== 'coverage') return undefined;
    const pair = document['coverage'];
    const reasons: unknown = document['reasons'];
    if (!isRecord(pair) || !Array.isArray(reasons) || reasons.length === 0 || !reasons.every((reason): reason is string => typeof reason === 'string')) return undefined;
    const { draftRevision, inventoryRevision } = pair;
    if (!isRevision(draftRevision) || !isRevision(inventoryRevision)) return undefined;
    const key = coverageHoldKey(draftRevision, inventoryRevision);
    if (!this.knows(key)) this.holds.set(key, { message: coverageHoldMessage({ draftRevision, inventoryRevision }, reasons), attempts: 0, exhausted: false });
    return { draftRevision, inventoryRevision };
  }

  private send(key: string, send: (message: string) => CoverageSend): CoverageNoticeAttempt {
    const pending = this.holds.get(key);
    if (pending === undefined || pending.exhausted || this.submissionUnknown) return 'unchanged';
    const outcome = send(pending.message);
    if (outcome === 'sent') {
      this.notified.push(key);
      this.holds.delete(key);
    } else if (outcome === 'unsubmitted') {
      // A later notice could append to the text still in this live pane. A fresh supervisor starts a new pane.
      this.submissionUnknown = true;
    } else {
      pending.attempts += 1;
      pending.exhausted = pending.attempts >= COVERAGE_NOTICE_ATTEMPTS;
      if (pending.exhausted) return 'exhausted';
    }
    return outcome;
  }
}

function isRevision(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}
