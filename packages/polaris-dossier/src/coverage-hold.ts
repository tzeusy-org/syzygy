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

export interface CoverageHold {
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
    + `Next: in drafts/next.json, either represent each entry in a block that cites what it states, or add {"entryId": ..., "reason": ...} to \`inventoryOmissions\` saying why a reader of this dossier does not need it; then run syzygy dossier check ${subject.run} again. `
    + 'The packet is issued once a passed draft revision leaves no entry without an outcome; the reviewer still judges each entry and each reason.';
  return { entries: uncovered, reason, reasons };
}
