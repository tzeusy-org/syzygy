import { spanTouchesWithheld } from '@syzygy/polaris-generation-core/live';
import { isRecord } from '@syzygy/support';
import { unconsentedClass } from './class-gate.js';
import type { Derived } from './check-derive.js';
import { collectBlocks } from './check-derive.js';
import type { CitedBlob } from './check-model.js';
import type { DossierScreen } from './screen.js';
import { citationIdsOf, isWithheldItem, type SpanStanding } from './withheld-items.js';

/** Which claim blocks the fidelity review can never confirm, told to the author at check time (syzygy-pdja.20). `reviewVisibility` names
 * the cited files the review will not see; this names the blocks every cited span of which it will not see, so the author does not spend
 * a repair cycle on a block no verdict can call supported. Advice, like `readerAdvice`: it is on `check`'s report only, never a finding,
 * the outcome, the exit code or the stored check record, and it changes nothing a gate or a verdict's validation accepts. Pure.
 *
 * A block falls in one of two classes, read as the fidelity packet reads its spans (`review-packet.ts`) and the verdict's validation
 * reads withheld items (`withheld-items.ts`, REQ-polaris-generation-034 and 035):
 * - `withheld-item`: every cited span is withheld by screening (or the block quotes a withheld span). Its verdict entry is `withheld`,
 *   never `supported`; it renders Unknown with `excluded-content` in Syzygy's words, and none of its text renders.
 * - `unconfirmable`: an `inferred` block that is not a withheld item, every cited span of which the review cannot see, at least one
 *   because the class gate keeps its file from the review. `withheld` does not fit it, so its entry is unresolved and blocks readiness. */

/** How one cited span reaches the review: `withheld` by screening as the withheld-item rule reads it, `class-gated` (screening admits
 * its file but the run's consent does not cover the file's class), or `reaches-review`. A span no check would pass (an absent path, a
 * range past the file's end) counts as `reaches-review` here: `check` reports it as a finding already. */
export type CitationReach = 'reaches-review' | 'withheld' | 'class-gated';

export interface ReachInputs {
  readonly citedBlobs: readonly CitedBlob[];
  readonly admitted: Derived['admitted'];
  readonly screen: Pick<DossierScreen, 'screenPath' | 'screenBody' | 'contentClass'>;
  /** The classes the run's per-project statement lists, or null where it relies on none (`class-gate.ts`). */
  readonly consented: readonly string[] | null;
}

export function citationReach(citation: Readonly<Record<string, unknown>>, inputs: ReachInputs): CitationReach {
  const cited = typeof citation['path'] === 'string' ? citation['path'] : undefined;
  if (cited === undefined) return 'reaches-review';
  const blob = inputs.admitted.get(cited);
  if (blob === undefined) {
    // Excluded whole by path or body screening, or not UTF-8: every such outcome withholds the span. A secret-matching path is in
    // `citedBlobs` without its path, so the path screen answers for it.
    const outcome = inputs.citedBlobs.find((entry) => entry.path === cited)?.outcome ?? inputs.screen.screenPath(cited);
    return outcome === undefined || outcome === 'admitted' ? 'reaches-review' : 'withheld';
  }
  // The packet applies the class gate to a body screening admitted, before any redaction.
  if (unconsentedClass(inputs.screen.contentClass(cited), inputs.consented) !== undefined) return 'class-gated';
  if (blob.withheld === undefined || blob.retainedLines === undefined) return 'reaches-review';
  const startLine = citation['startLine'], endLine = citation['endLine'];
  if (typeof startLine !== 'number' || typeof endLine !== 'number') return 'reaches-review';
  if (spanTouchesWithheld(blob.withheld, startLine, endLine)) return 'withheld';
  return inputs.screen.screenBody(blob.retainedLines.slice(startLine - 1, endLine).join('')) === 'secret-detector-match' ? 'withheld' : 'reaches-review';
}

export type UnseenConsequence = 'withheld-item' | 'unconfirmable';

export interface UnseenBlock {
  /** A JSON path into the draft. */
  readonly at: string;
  readonly blockId: string | null;
  readonly consequence: UnseenConsequence;
  readonly detail: string;
}

export interface ReviewReachAdvice {
  readonly note: string;
  readonly counts: { readonly unconfirmable: number; readonly withheldItems: number };
  readonly blocks: readonly UnseenBlock[];
}

const NOTE = 'Advice: it sets no outcome and is not stored in the check record. Each block listed cites only spans the fidelity review will not be given. An `unconfirmable` block can never be judged supported, and its unresolved row blocks readiness: cite an admitted file that states the same fact, as well or instead, or state it as `unknown`. A `withheld-item` block is never judged supported either; it blocks nothing, but it renders Unknown in Syzygy\'s words and none of its text renders. Resubmitting such a block unchanged spends a repair cycle and changes neither.';

const DETAIL: Readonly<Record<UnseenConsequence, string>> = {
  unconfirmable: 'every span it cites is kept from the review, at least one by the class gate (the run\'s consent does not cover its file\'s class), so the review cannot confirm it and its row stays unresolved, blocking readiness',
  'withheld-item': 'every span it cites, or a span it quotes, is withheld by screening, so the review cannot confirm it: its entry is `withheld`, it renders Unknown and none of its text renders',
};

const list = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);

/** The claim blocks of a parsed draft that no fidelity verdict can confirm; a draft that is not an object yields none. */
export function reviewReachAdvice(doc: unknown, inputs: ReachInputs): ReviewReachAdvice {
  const blocks: UnseenBlock[] = [];
  if (isRecord(doc)) {
    for (const block of collectBlocks(doc)) {
      // The fidelity verdict carries an entry for each claim block (`textKey` text), not for the understanding record's items.
      if (block.textKey !== 'text') continue;
      const reach = new Map(list(block.value['citations']).filter(isRecord).flatMap((citation) =>
        (typeof citation['id'] === 'string' ? [[citation['id'], citationReach(citation, inputs)] as const] : [])));
      const standing = (id: string): SpanStanding => {
        const value = reach.get(id);
        return value === 'withheld' ? 'withheld' : value === 'reaches-review' ? 'admitted' : 'other';
      };
      const { cited } = citationIdsOf(block.value);
      const consequence: UnseenConsequence | undefined = isWithheldItem(block.value, standing) ? 'withheld-item'
        : block.value['label'] === 'inferred' && cited.length > 0 && cited.every((id) => reach.get(id) === 'withheld' || reach.get(id) === 'class-gated') ? 'unconfirmable'
          : undefined;
      if (consequence === undefined) continue;
      const id = block.value['id'];
      blocks.push({ at: block.at, blockId: typeof id === 'string' ? id : null, consequence, detail: DETAIL[consequence] });
    }
  }
  return {
    note: NOTE,
    counts: { unconfirmable: blocks.filter((b) => b.consequence === 'unconfirmable').length, withheldItems: blocks.filter((b) => b.consequence === 'withheld-item').length },
    blocks,
  };
}
