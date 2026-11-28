import type { LocalBase, LocalBaseLeftOut } from '@syzygy/polaris-generation-core/live';
import { escapeHtml as escape } from './draft-preview.js';
import { DOSSIER_STYLE as tokens } from './dossier-style-tokens.js';

/** A view's derived base on the page (REQ-polaris-generation-034 version 2.35, syzygy-3efd.38): the figure's chip, its hidden items, the
 * tally's computed clause, its notices where the base is not drawn, and its machine member. Every count and word is Syzygy's; the only draft
 * text is an author's reason, screened by the render and escaped here. Pure. */

type Drawn = Extract<LocalBase, { readonly state: 'drawn' }>;
type BaseMap = LocalBase['map'];
type Marking = 'observed' | 'inferred' | 'unknown';

const counted = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** The map's title, as its page and the figure name it. */
export const baseMapTitle = (map: BaseMap): string => (map === 'directories' ? 'Directory map' : 'Unit map');

/** The map's page written relative to the page holding the figure: `maps/…` from a page at the root, `../maps/…` from one a level down. */
export const baseMapHref = (from: string, map: BaseMap): string =>
  `${'../'.repeat(from.split('/').length - 1)}maps/${map === 'directories' ? 'directories' : 'units'}.html`;

/** The chip, immediately after the figure's caption: how many of the map's elements the figure shows, from which map, how many this dossier
 * hides, and what the map itself counts and does not list. */
export function baseChip(base: Drawn, from: string): string {
  const link = `<a href="${baseMapHref(from, base.map)}">${baseMapTitle(base.map)}</a>`;
  const hidden = base.total - base.shown;
  const tail = hidden === 0 ? 'none hidden.' : `${hidden} hidden by this dossier.`;
  const head = base.map === 'directories'
    ? `Showing ${base.shown} of ${counted(base.total, 'top-level directory', 'top-level directories')}, ${base.root === 'shown' ? 'with' : 'without'} the repository root, from the ${link}; ${tail}`
    : `Showing ${base.shown} of ${counted(base.total, 'package or module', 'packages and modules')} from the ${link}; ${tail}`;
  return `<p class="base-chip" data-visual-provenance="computed">${head}${notListedSentence(base)}</p>`;
}

function notListedSentence(base: Drawn): string {
  const n = base.notListed;
  if ('directories' in n) {
    if (n.directories === 0 && n.secretPathsLeftOut === 0 && n.submodules === 0) return '';
    return ` The map also counts ${counted(n.directories, 'more top-level directory', 'more top-level directories')} it does not list, ${counted(n.secretPathsLeftOut, 'file', 'files')} it leaves out and does not name because a secret detector matches their path, and ${counted(n.submodules, 'submodule', 'submodules')} it does not follow.`;
  }
  if (n.facts === 0 && n.unknownFiles === 0 && n.secretPathsLeftOut === 0) return '';
  return ` The map also counts ${counted(n.facts, 'fact', 'facts')} of the manifest files it does not list, ${counted(n.unknownFiles, 'manifest file', 'manifest files')} it read with no facts taken, and ${counted(n.secretPathsLeftOut, 'manifest file', 'manifest files')} it leaves out and does not name because a secret detector matches their path, so this figure may lack some.`;
}

/** How many names an item lists before it counts the rest. */
const NAMES_LISTED = 12;

/** One item per `hide` entry, or one for `restReason`, at the end of the figure's list: what it leaves out, in Syzygy's words, and the
 * author's screened reason. No anchor, label or citation: the author's words about the figure, never a claim. */
export function baseHiddenItems(base: Drawn): string {
  const items = base.restReason === null ? base.hides : [base.restReason];
  return items.filter((item) => item.count > 0).map((item) => hiddenItem(base.map, item)).join('');
}

function hiddenItem(map: BaseMap, item: LocalBaseLeftOut): string {
  const directories = item.count - (item.root ? 1 : 0);
  const what = map === 'units' ? counted(item.count, 'package or module', 'packages and modules')
    : item.root && directories === 0 ? 'the repository root'
      : `${item.root ? 'the repository root and ' : ''}${counted(directories, 'top-level directory', 'top-level directories')}`;
  const names = item.names.slice(0, NAMES_LISTED).join(', ') + (item.names.length > NAMES_LISTED ? `, and ${item.names.length - NAMES_LISTED} more` : '');
  return `<li class="base-hidden" data-hidden-count="${item.count}">Not shown here: ${what}: ${escape(names)}. This dossier's reason: ${escape(item.reason)}</li>`;
}

/** The clause the tally takes after its own counts: the boxes and arrows Syzygy computed from the map, by mark. */
export function baseTallyClause(map: BaseMap, markings: readonly Marking[], boxes: number, arrows: number): string {
  const count = (m: Marking): number => markings.filter((x) => x === m).length;
  return ` ${counted(boxes, 'box', 'boxes')} and ${counted(arrows, 'arrow', 'arrows')} computed by Syzygy from the ${baseMapTitle(map)}: ${count('observed')} observed, ${count('inferred')} inferred, ${count('unknown')} unknown.`;
}

/** The legend entry every figure with a base adds. */
export const baseLegendEntry = (map: BaseMap): string =>
  `<li><span class="legend-line double" aria-hidden="true"></span>Double border: computed by Syzygy from the ${baseMapTitle(map)}, in its words and marks.</li>`;

/** The notice in place of a figure whose base is not drawn: the map is Unknown at this render (`reason` and `words` the map's own), or it
 * was not read at check and the base does not resolve against it now. No element of the view is drawn. */
export function baseNotice(base: Exclude<LocalBase, Drawn>, from: string, unknown: { readonly reason: string; readonly words: string }): string {
  const see = `<a href="${baseMapHref(from, base.map)}">See the map</a>.`;
  return base.state === 'unknown'
    ? `<p class="figure-notice" data-epistemic="unknown" data-unknown-reason="${escape(unknown.reason)}">Not established. This figure starts from the ${baseMapTitle(base.map)}, which is Unknown at this render: ${escape(unknown.words)}. ${see}</p>`
    : `<p class="figure-notice" data-epistemic="unknown" data-unknown-reason="source-uncaptured-or-unreachable">Not established. This figure starts from the ${baseMapTitle(base.map)}, which this dossier's check could not read, and its base does not resolve against the map at this render. ${see}</p>`;
}

/** The figure entry's `base` member in `machine.json`: what the figure drew, its base elements in the figure's order. */
export function baseMachine(base: LocalBase, order: readonly string[], unknownReason: string): Record<string, unknown> {
  if (base.state !== 'drawn') return { map: base.map, established: false, reason: base.state === 'unknown' ? unknownReason : 'source-uncaptured-or-unreachable' };
  const byFact = new Map(base.elements.map((element) => [element.factId, element]));
  const nameOf = new Map(base.names.map((name) => [name.factId, name.id]));
  const leftOut = (item: LocalBaseLeftOut) => ({ paths: item.paths, reason: item.reason, count: item.count });
  return {
    map: base.map, established: true, shown: base.shown, total: base.total, hidden: base.total - base.shown, root: base.root, notListed: base.notListed,
    select: base.select, restReason: base.restReason === null ? null : { reason: base.restReason.reason, count: base.restReason.count },
    hides: base.hides.map(leftOut),
    elements: order.flatMap((factId) => { const element = byFact.get(factId); return element === undefined ? [] : [{ path: element.path, factId, provenance: 'derived', mark: element.epistemic, name: nameOf.get(factId) ?? null }]; }),
    names: base.names.map((name) => ({ id: name.id, path: name.path, label: name.label, epistemic: name.epistemic, citations: name.sourceIds, provenance: 'authored' })),
  };
}

/** The style rules a page carries only where it draws a figure with a base, so every other page keeps its bytes: the inner border, the
 * display-name line's 13 px italic text, the legend's double line, the chip and the hidden items. */
export const BASE_FIGURE_CSS = `.diagram-scroll rect.double-inner{fill:none}.diagram-scroll text.called{font-size:${tokens.type.baseCalled};font-style:italic}`
  + `.legend-line.double{border-top:${tokens.line.emphasis} double var(--line)}.base-chip{margin:${tokens.spacing.small} ${tokens.spacing.none}}`
  + '.base-hidden{list-style:none}.figure-notice{font-style:italic}';
