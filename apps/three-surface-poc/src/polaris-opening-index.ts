/**
 * The Polaris opening index (PWB-REQ-010 as amended by
 * `pwb-opening-index-amendment` v1.0, P-98; syzygy-u05.23).
 *
 * The first reading level begins with nine rows, one per PWB-REQ-021 answer
 * identity, in the order and to the targets the requirement's table
 * declares. A row whose target renders links to the target's first element
 * (its heading, or for the exact-requirement row the first link in document
 * order to an exact requirement's text) and shows the target's word offset;
 * a row whose target does not render says so and links nowhere.
 *
 * Offsets, the total and the one stopping line are presentation
 * measurements counted in the page after load, at the viewport the page has
 * when it loads (owner answer Q10, "The opening window"): the server cannot
 * know that viewport. They carry no tuple, enter no parity family or
 * walkthrough record, and state nothing about whether a prompt is answered.
 *
 * The index sits before the PWB-REQ-014 narrative tree and is not one of its
 * units, so its elements carry a copy role (PWB-REQ-012) and no claim role.
 */
import { copyText, type PolarisCopyId } from './polaris-copy.js';
import { sourceRouteHref } from './polaris-source.js';

/** The one marker the page shell's body carries for the index. */
export const OPENING_INDEX_PLACEHOLDER = '<!--polaris-opening-index-->';

/** Id given to the first exact-source link when it carries none. */
const FIRST_EXACT_REQUIREMENT_ID = 'polaris-first-exact-requirement';

type OpeningIndexIdentity =
  | 'why'
  | 'promises'
  | 'refusals-and-rule'
  | 'capabilities-and-fit'
  | 'exact-requirement'
  | 'unknown-or-contradiction'
  | 'claim-strength'
  | 'architecture-and-groups'
  | 'v1-success';

/** Where a row's target begins: a fixed element id, or the first link in
 * document order to the exact-source route. */
type OpeningIndexTarget = { readonly kind: 'id'; readonly id: string } | { readonly kind: 'first-exact-source' };

interface OpeningIndexRow {
  readonly identity: OpeningIndexIdentity;
  readonly name: PolarisCopyId;
  readonly target: OpeningIndexTarget;
}

const id = (value: string): OpeningIndexTarget => ({ kind: 'id', id: value });

/** The requirement's table, in its order. Each fixed id is the heading the
 * same render emits for that target: the purpose, promise, non-goal
 * ("Deliberate limits") and architecture account statements, the capability
 * catalog ("Declared capabilities"), the opening Unknown aggregate, the
 * claim-state legend's heading, and the V1 scope statement, which is the
 * first of the V1 scope and success-criteria statements. */
const OPENING_INDEX_ROWS: readonly OpeningIndexRow[] = [
  { identity: 'why', name: 'index.why', target: id('polaris-account-purpose') },
  { identity: 'promises', name: 'index.promises', target: id('polaris-account-promises') },
  { identity: 'refusals-and-rule', name: 'index.refusals-and-rule', target: id('polaris-account-refusals') },
  { identity: 'capabilities-and-fit', name: 'index.capabilities-and-fit', target: id('polaris-class-catalog-entry') },
  { identity: 'exact-requirement', name: 'index.exact-requirement', target: { kind: 'first-exact-source' } },
  { identity: 'unknown-or-contradiction', name: 'index.unknown-or-contradiction', target: id('polaris-opening-unknowns') },
  { identity: 'claim-strength', name: 'index.claim-strength', target: id('polaris-claim-states-heading') },
  { identity: 'architecture-and-groups', name: 'index.architecture-and-groups', target: id('polaris-account-architecture') },
  { identity: 'v1-success', name: 'index.v1-success', target: id('polaris-account-v1-scope') },
];

const ACTION = ' data-copy-role="action-label"';
const SCOPE = ' data-copy-role="scope-instruction"';
const DISCLOSURE = ' data-copy-role="epistemic-disclosure"';

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** The first `<a>` start tag, in document order, whose `href` is the
 * exact-source route under this mount, and the id it can be routed to. */
function firstExactSourceLink(html: string, mountPrefix: string): { readonly start: number; readonly tag: string } | undefined {
  const route = escapeAttr(sourceRouteHref(mountPrefix, ''));
  for (const match of html.matchAll(/<a\s[^>]*>/g)) {
    const href = /\shref="([^"]*)"/.exec(match[0])?.[1];
    if (href !== undefined && href.startsWith(route)) return { start: match.index as number, tag: match[0] };
  }
  return undefined;
}

function rowHtml(row: OpeningIndexRow, targetId: string | undefined): string {
  const name = escapeAttr(copyText(row.name));
  return targetId === undefined
    ? `<li data-opening-row="${row.identity}"><span${ACTION}>${name}</span> <span${DISCLOSURE}>— ${escapeAttr(copyText('index.not-rendered'))}</span></li>`
    : `<li data-opening-row="${row.identity}"><a href="#${escapeAttr(targetId)}"${ACTION}>${name}</a> <span data-opening-offset${SCOPE}></span></li>`;
}

/** Replaces the placeholder with the index over the final page. Whether a
 * target renders is a fact about the final HTML, so this runs last; the
 * first exact-source link is given an id when it has none. */
export function substituteOpeningIndex(html: string, mountPrefix: string): string {
  const parts = html.split(OPENING_INDEX_PLACEHOLDER);
  if (parts.length !== 2) throw new Error(`opening index placeholder must occur exactly once, found ${parts.length - 1}`);
  let page = html;
  let exactId: string | undefined;
  const link = firstExactSourceLink(page, mountPrefix);
  if (link !== undefined) {
    const existing = /\sid="([^"]*)"/.exec(link.tag)?.[1];
    if (existing !== undefined) {
      exactId = existing;
    } else {
      exactId = FIRST_EXACT_REQUIREMENT_ID;
      if (page.includes(` id="${exactId}"`)) throw new Error(`${exactId} already in use`);
      // The id goes last, so the `href` stays the tag's first attribute.
      page = `${page.slice(0, link.start)}${link.tag.slice(0, -1)} id="${exactId}">${page.slice(link.start + link.tag.length)}`;
    }
  }
  const rows = OPENING_INDEX_ROWS.map((row) => {
    if (row.target.kind === 'first-exact-source') return rowHtml(row, exactId);
    return rowHtml(row, page.includes(` id="${row.target.id}"`) ? row.target.id : undefined);
  });
  const label = escapeAttr(copyText('index.landmark'));
  const index = `<nav class="opening-index" data-polaris-opening-index aria-label="${label}"${SCOPE}><ol>${rows.join('')}</ol></nav>${OPENING_INDEX_SCRIPT}`;
  return page.replace(OPENING_INDEX_PLACEHOLDER, index);
}

/**
 * The declared word count, run once on `load`.
 *
 * A word is a maximal run of non-whitespace characters (`\S+`, JavaScript's
 * whitespace class) in a text node under `body`, in document order. A text
 * node is left out when its parent element's computed `visibility` is not
 * `visible`, or when it or any ancestor is: inside `script`, `style`,
 * `template` or `noscript`; under an element with `hidden`,
 * `aria-hidden="true"` or computed `display: none`; inside a `details`
 * closed at load other than in that details' own `summary`; or inside the
 * index. The stopping line is inserted after counting, so it is never
 * counted. A row's offset is the number of counted words in text nodes that
 * precede its target's first element.
 */
const OPENING_INDEX_SCRIPT = `<script>
addEventListener('load', () => {
  const index = document.querySelector('[data-polaris-opening-index]');
  if (!index) return;
  const closed = new Set(Array.from(document.querySelectorAll('details')).filter((details) => !details.open));
  const skipped = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT']);
  const ownSummary = (details) => Array.from(details.children).find((child) => child.tagName === 'SUMMARY');
  const counted = (text) => {
    if (!text.parentElement || getComputedStyle(text.parentElement).visibility !== 'visible') return false;
    for (let node = text; node.parentElement; node = node.parentElement) {
      const parent = node.parentElement;
      if (parent === index || skipped.has(parent.tagName) || parent.hasAttribute('hidden') || parent.getAttribute('aria-hidden') === 'true' || getComputedStyle(parent).display === 'none') return false;
      if (closed.has(parent) && node !== ownSummary(parent)) return false;
    }
    return true;
  };
  const runs = [];
  let total = 0;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let text = walker.nextNode(); text; text = walker.nextNode()) {
    if (!counted(text)) continue;
    const words = (text.data.match(/\\S+/g) || []).length;
    if (words > 0) { runs.push([text, words]); total += words; }
  }
  const offsetOf = (element) => runs.reduce((sum, [text, words]) => sum + (element.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_PRECEDING ? words : 0), 0);
  let setter;
  for (const link of index.querySelectorAll('a[href^="#"]')) {
    const target = document.getElementById(decodeURIComponent(link.getAttribute('href').slice(1)));
    if (!target) continue;
    const offset = offsetOf(target);
    const slot = link.parentElement.querySelector('[data-opening-offset]');
    if (slot) slot.textContent = 'after ' + offset + ' words';
    if (!setter || offset > setter.offset || (offset === setter.offset && setter.target.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING)) setter = { target, offset };
  }
  const line = document.createElement('p');
  line.className = 'reach-line';
  line.setAttribute('data-polaris-reach-line', '');
  line.setAttribute('data-copy-role', 'scope-instruction');
  if (!setter) {
    line.textContent = total + ' words';
    index.after(line);
    return;
  }
  let place = setter.target;
  for (let node = setter.target; node && node !== document.body; node = node.parentElement) {
    if (closed.has(node) || /^(P|H[1-6]|UL|OL|DL|TABLE)$/.test(node.tagName)) place = node;
  }
  line.textContent = setter.offset + ' / ' + total + ' words';
  place.after(line);
});
</script>`;

export const OPENING_INDEX_STYLE = `
  .opening-index { max-width: 74ch; margin: 0 auto 1.5rem; }
  .opening-index ol { margin: 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: .25rem 1.25rem; font: .85rem/1.5 var(--font-mono); }
  .opening-index li { color: var(--muted); }
  .reach-line { max-width: 74ch; margin: .5rem auto; padding-top: .25rem; border-top: 1px dashed var(--line); color: var(--muted); font: .8rem/1.4 var(--font-mono); }
`;
