import type { DossierDraft, EpistemicMarking } from './draft-model.js';

/**
 * What the multi-page dossier renderer takes for an operator-agent run
 * (REQ-polaris-generation-034, 036; design "Command surface", `render`).
 * Types only. `packages/polaris-dossier` derives every value at the render
 * step from objects it re-reads and re-hashes; the renderer lays them out,
 * escaped, in the human pages and the machine view alike, and decides no
 * label itself.
 */

/** The one named region of every page that a later render may change without retiring a rendered-design review. */
export const REVIEW_STATUS_REGION = 'review-status';
/** The region's opening tag, exactly as the renderer writes it. */
export const REVIEW_STATUS_REGION_OPEN = `<aside class="review-status" data-review-status-region="${REVIEW_STATUS_REGION}" aria-label="Review status">`;

/**
 * The page with its review-status region removed, or undefined unless the page
 * holds exactly one. The region's items are escaped text, so its first
 * `</aside>` closes it.
 */
export function withoutReviewStatusRegion(html: string): string | undefined {
  const start = html.indexOf(REVIEW_STATUS_REGION_OPEN);
  if (start === -1 || html.indexOf(REVIEW_STATUS_REGION_OPEN, start + 1) !== -1) return undefined;
  const close = html.indexOf('</aside>', start);
  if (close === -1) return undefined;
  return html.slice(0, start) + html.slice(close + '</aside>'.length);
}

/** RFC7-10's anchor of a quotation or a source page: an evidence artifact identifier with integrity digest. */
export interface EvidenceAnchor {
  readonly targetClass: 'evidence-artifact-identifier-with-integrity-digest';
  /** The blob's object identifier as Syzygy recomputed it from the bytes it read: the owning identifier and the integrity digest at once. */
  readonly identifier: string;
  /** The hash algorithm the consented revision's identifier is written in. */
  readonly algorithm: 'sha1' | 'sha256';
  /** The span's UTF-8 byte range in the blob, `[start, end)`; null for the whole blob. */
  readonly fragment: { readonly start: number; readonly end: number } | null;
  /** The pinned revision. */
  readonly targetState: string;
  /** The repository path, shown beside the anchor as a label, never as its identity. */
  readonly pathLabel: string;
}

export type LocalSegment =
  | { readonly kind: 'prose'; readonly text: string }
  /** A quotation Syzygy located at this render in a blob it read and verified: Syzygy's own bytes, never the agent's copy. `sourceId`
   * names the source (or piece) the span starts in; `start` and `end` are UTF-8 byte offsets into the whole blob. */
  | { readonly kind: 'quotation'; readonly sourceId: string; readonly start: number; readonly end: number; readonly text: string; readonly anchor: EvidenceAnchor }
  /** A quotation from a blob screening excluded: not verified, and none of its text is shown. */
  | { readonly kind: 'withheld'; readonly reason: 'excluded-content' };

/** One claim block of the draft as it renders: its marking, decided by the caller, and its text as segments. */
export interface LocalBlock {
  readonly marking: EpistemicMarking | 'non-normative';
  /** The RFC2-24 reason of an Unknown block; null otherwise. */
  readonly unknownReason: string | null;
  /** Why the block carries its marking. */
  readonly basis: string;
  readonly segments: readonly LocalSegment[];
  /** The commands a claim resting on execution names, as the agent reported them (Inferred, self-reported). */
  readonly executions: readonly { readonly id: string; readonly command: string }[];
  /** Dossier spec v1.5: `uncited` for an Inferred block the draft marks as a judgement and that cites nothing, `cited` for a marked block
   * that cites; absent for an unmarked block. */
  readonly judgement?: 'uncited' | 'cited';
  /** A withheld item (v1.5): every span it cites, or a span it quotes, is withheld. Its segments are Syzygy's words, never the agent's. */
  readonly withheld?: WithheldNote;
  /** A block citing both admitted and withheld spans, not a withheld item: how many of its cited spans are withheld. */
  readonly withheldSpans?: number;
}

/** What Syzygy says of a withheld item: how many withheld sources it rests on, and those it may name. A path a secret detector matches is
 * counted and never named. */
export interface WithheldNote {
  readonly sources: number;
  readonly named: readonly string[];
}

/** Dossier spec v1.5's counts, disclosed in the appendix and the machine form. `null` where the count rests on a record that does not
 * count at this render (the withheld inventory entries, while no fidelity review counts). */
export interface LocalCounts {
  readonly uncitedJudgements: number;
  readonly withheldItems: number;
  readonly withheldExcerpts: number;
  readonly withheldInventoryEntries: number | null;
}

/** A line of the run disclosure or of the review-status region, with the label its content carries (null for a plain statement of
 * what Syzygy did or did not do). */
export interface LocalDisclosureItem {
  readonly id: string;
  readonly text: string;
  readonly label: 'Observed' | 'Inferred' | 'Unknown' | null;
}

/** A labelled record on one of the run's own pages (understanding, discovery, clarifications, executions, review). Its `id` carries a
 * `/`, so it never equals a draft block's. */
export interface LocalPageItem {
  readonly id: string;
  readonly marking: EpistemicMarking;
  readonly unknownReason: string | null;
  readonly title: string | null;
  readonly text: string;
  readonly details: readonly string[];
  /** Sources with a page that the item cites. */
  readonly sourceIds: readonly string[];
}

export interface LocalPageGroup {
  readonly id: string;
  readonly heading: string;
  /** What the group is and how it is labelled, stated above it. */
  readonly note: string;
  readonly items: readonly LocalPageItem[];
  /** Shown when the group holds no item. */
  readonly empty: string;
}

export interface LocalPage {
  /** A `isDossierPagePath` at depth 1 (one segment). */
  readonly path: string;
  readonly title: string;
  readonly intro: string;
  readonly groups: readonly LocalPageGroup[];
}

/** RFC7-20 as the owner's reading applies it to an operator-computed draft: the editorial-draft state only while every condition holds. */
export type LocalDraftLayer =
  | {
    readonly state: 'editorial-draft';
    /** The in-force record of the owner's reading the run relies on. */
    readonly ruling: string;
    /** The generated prose's inference provenance: the operator-declared model identity and version. */
    readonly inferenceProvenance: { readonly modelIdentity: string; readonly modelVersion: string | null; readonly declaredBy: 'operator'; readonly label: 'Inferred' };
  }
  | { readonly state: 'unknown'; readonly reason: 'unconsented-source-or-provider'; readonly why: readonly string[] };

export interface LocalRenderInput {
  /** The checked draft in the renderer's shape. `sourceIds` name only sources Syzygy read and screening admitted, and may be empty. No
   * part of it renders while the draft layer is Unknown. */
  readonly draft: DossierDraft;
  /** The dossier's title while the draft layer is Unknown, when the draft's own title is draft content and is not shown. */
  readonly withheldTitle: string;
  readonly draftLayer: LocalDraftLayer;
  /** Every claim block of the draft (introduction, section and deep-dive paragraphs and children), by id. */
  readonly blocks: ReadonlyMap<string, LocalBlock>;
  /** The glossary: the understanding record's terminology. */
  readonly glossary: readonly LocalPageItem[];
  /** The run disclosure, on every page and in the machine view. */
  readonly disclosure: readonly LocalDisclosureItem[];
  /** The RFC7-10 anchor of each source page, by source id. */
  readonly sourceAnchors: ReadonlyMap<string, EvidenceAnchor>;
  readonly pages: readonly LocalPage[];
  /** The one named review-status region of every page: the only part a later render may change without retiring a rendered-design review. */
  readonly reviewStatus: readonly LocalDisclosureItem[];
  /** Diagram nodes and edges, and understanding items, that are withheld items (v1.5), by claim id; blocks carry their own note. */
  readonly withheldElements?: ReadonlyMap<string, WithheldNote>;
  readonly counts?: LocalCounts;
  /** The cited lines behind each citation mark, by claim id, then source id: shown on the mark's hover and focus (v1.5). */
  readonly citationLines?: ReadonlyMap<string, ReadonlyMap<string, string>>;
  /** The operator-declared agent tool and model, named in the one sentence every page carries (v1.5). */
  readonly authoring?: { readonly tool: string; readonly model: string };
  /** A schema-v4 draft's Poles (dossier spec v1.5): page boundaries that carry no claim, each a short label and its sections in order,
   * with the section that answers why the project exists. Absent when the draft declares none: its sections then stay on one page. */
  readonly poles?: { readonly whySection: string; readonly poles: readonly { readonly label: string; readonly sections: readonly string[] }[] };
}
