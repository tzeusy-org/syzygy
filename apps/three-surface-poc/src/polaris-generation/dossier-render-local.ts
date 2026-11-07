import { REVIEW_STATUS_REGION, REVIEW_STATUS_REGION_OPEN, type EvidenceAnchor, type LocalDisclosureItem } from '@syzygy/polaris-generation-core/live';

/**
 * Markup the multi-page dossier renderer adds for an operator-agent run
 * (syzygy-qkea.10): the run disclosure, the named review-status region and
 * RFC7-10 anchors. Pure; every string passes through the renderer's escape.
 */

/** The machine view of an operator-agent render, written beside `dossier.json`; not a manifest page. */
export const LOCAL_MACHINE_VIEW = 'machine.json';

export { REVIEW_STATUS_REGION };

export const LOCAL_CSS = '.run-disclosure{border-block:1px solid var(--line);padding:.5rem 1rem;font-size:.9rem}.run-disclosure ul{margin:.5rem 0}.review-status{border-top:1px solid var(--line);margin-top:2rem;font-size:.9rem}.verified-quote{font-style:normal}.anchor-link,.evidence-anchor{font:.8rem/1.5 var(--font-mono);overflow-wrap:anywhere}.evidence-anchor dt{font-weight:600}.non-normative{color:var(--muted)}.quote-withheld,.unknown-reason,.executions,.group-note,.read-note{color:var(--muted);font-size:.9rem}';

type Escape = (value: string) => string;

const labelled = (item: LocalDisclosureItem, escape: Escape): string =>
  `<li data-disclosure-id="${escape(item.id)}"${item.label === null ? '' : ` data-label="${escape(item.label)}"`}>${escape(item.text)}${item.label === null ? '' : ` <span class="marking ${escape(item.label.toLowerCase())}">[${escape(item.label)}]</span>`}</li>`;

/** The run disclosure as a list, for the appendix (dossier spec v1.5). */
export function disclosureList(items: readonly LocalDisclosureItem[], escape: Escape): string {
  return `<ul>${items.map(item => labelled(item, escape)).join('')}</ul>`;
}

/** The named review-status region. It holds no claim and no fragment target, so stripping it changes nothing else on the page. */
export function regionMarkup(items: readonly LocalDisclosureItem[], escape: Escape): string {
  return `${REVIEW_STATUS_REGION_OPEN}<h2>Review status</h2><ul>${items.map(item => labelled(item, escape)).join('')}</ul></aside>`;
}

/** The anchor as data attributes, for the inline link beside a quotation. */
export function anchorAttributes(anchor: EvidenceAnchor, escape: Escape): string {
  return ` data-anchor-class="${escape(anchor.targetClass)}" data-anchor-identifier="${escape(anchor.identifier)}" data-anchor-algorithm="${escape(anchor.algorithm)}"`
    + `${anchor.fragment === null ? '' : ` data-anchor-fragment="${anchor.fragment.start}-${anchor.fragment.end}"`} data-anchor-target-state="${escape(anchor.targetState)}"`;
}

/** The anchor as the source page states it: its class, the recomputed identifier with its algorithm, the byte range, the revision, and
 * the path as a label. */
export function anchorDetails(anchor: EvidenceAnchor, escape: Escape): string {
  return `<dl class="evidence-anchor"${anchorAttributes(anchor, escape)}><dt>Anchor class</dt><dd>evidence artifact identifier with integrity digest (RFC7-10)</dd>`
    + `<dt>Identifier and integrity digest</dt><dd><code>${escape(anchor.algorithm)}:${escape(anchor.identifier)}</code>, the blob's object identifier, recomputed by Syzygy from the bytes it read</dd>`
    + `<dt>Byte range</dt><dd>${anchor.fragment === null ? 'the whole blob' : `${anchor.fragment.start}–${anchor.fragment.end}`}</dd>`
    + `<dt>Target state</dt><dd>revision <code>${escape(anchor.targetState)}</code></dd>`
    + `<dt>Path</dt><dd>${escape(anchor.pathLabel)} (a label, not the anchor's identity)</dd></dl>`;
}
