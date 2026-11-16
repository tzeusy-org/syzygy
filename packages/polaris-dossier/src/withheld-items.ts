import { isRecord } from '@syzygy/support';

/** Withheld items and uncited judgements (dossier spec v1.5, REQ-polaris-generation-034 and 035). One reading, shared by the fidelity
 * verdict's validation and the render, so a review and a page never disagree on which item is withheld or which block is a judgement.
 *
 * A cited span is withheld when its blob is excluded whole by classification, path or body screening, when its bytes are not valid
 * UTF-8, or when its range touches a line screening redacts in a retained body. A span the run's consented content classes keep from an
 * agent-bound artifact is not withheld: it keeps its existing treatment. A withheld item is a claim block, understanding item, diagram
 * node or edge, or inventory entry that cites at least one span, every one of them withheld, or that relies on a quotation from a
 * withheld span. */

/** How one cited span stands: `withheld` as above, `admitted`, or `other` (a class-gated span, or one no check would pass). */
export type SpanStanding = 'admitted' | 'withheld' | 'other';

const list = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);

/** The identities of an item's citations and of the citations its quotations name, as the draft or inventory gives them. */
export function citationIdsOf(value: Readonly<Record<string, unknown>>): { readonly cited: readonly string[]; readonly quoted: readonly string[] } {
  const cited = list(value['citations']).flatMap((citation) => (isRecord(citation) && typeof citation['id'] === 'string' ? [citation['id']] : []));
  const quoted = list(value['quotations']).filter((id): id is string => typeof id === 'string');
  return { cited, quoted };
}

/** Whether an item is withheld: it relies on a quotation from a withheld span, or cites at least one span and only withheld spans. */
export function isWithheldItem(value: Readonly<Record<string, unknown>>, standing: (citationId: string) => SpanStanding): boolean {
  const { cited, quoted } = citationIdsOf(value);
  if (quoted.some((id) => standing(id) === 'withheld')) return true;
  return cited.length > 0 && cited.every((id) => standing(id) === 'withheld');
}

/** Whether a claim block is an uncited judgement: Inferred, marked `judgement: true`, citing nothing. Only a v4 draft has the mark, and
 * `check` refuses it elsewhere, so a block that passed check and carries it is a v4 block. */
export function isUncitedJudgement(value: Readonly<Record<string, unknown>>): boolean {
  return value['label'] === 'inferred' && value['judgement'] === true && list(value['citations']).length === 0;
}

/** Whether a claim block carries the judgement mark, cited or not. */
export function isJudgement(value: Readonly<Record<string, unknown>>): boolean {
  return value['label'] === 'inferred' && value['judgement'] === true;
}
