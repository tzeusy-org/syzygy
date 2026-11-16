/**
 * The catalog reconciliation (M14 slice 4; P-81 Q4, under PWB-REQ-007 and
 * PWB-REQ-016): one line beside the catalog relating the sources, the nine
 * extraction classes, the items and the item markers the page renders.
 *
 * Each figure carries its epistemic state as visible text and as
 * `data-figure-state`: counts read straight off the machine answer are
 * Observed; arithmetic over them, and the count of the page's own markers,
 * are Inferred; the markers-minus-items remainder is Unknown, because a
 * count alone cannot say which claim a surplus or missing marker belongs to.
 *
 * The marker count is taken from the final HTML, so the line is rendered as
 * a single placeholder and substituted after the whole page exists. Nothing
 * here is cached or stored: the figures are derived per render.
 */
import { escapeHtml } from '@syzygy/http-host';
import { EXTRACTION_CLASSES, UNKNOWN_REASON_ROUTES, type ExtractionClass, type ProjectShape, type ProjectShapeClaim } from '@syzygy/three-surface-poc-core';

import { copyAttr, copyText, roleAttr, type PolarisCopyId } from './polaris-copy.js';

/** The one placeholder the page body carries; its opening is checked
 * separately so a truncated copy is malformed rather than ignored. */
export const RECONCILIATION_PLACEHOLDER = '<!--polaris-catalog-reconciliation-->';
const PLACEHOLDER_OPENING = '<!--polaris-catalog-reconciliation';

/** The occurrence predicate: every `data-polaris-item="…"` attribute in the
 * HTML, counted per occurrence — never per distinct claim id. */
const ITEM_MARKER = /\sdata-polaris-item="/g;

function countItemMarkers(html: string): number {
  return [...html.matchAll(ITEM_MARKER)].length;
}

/** The reason and route of the remainder: the mapping from markers to
 * machine items is not established by a count, and the route is to make it
 * by claim identity. */
const REMAINDER_REASON = 'mapping-coverage-absent';

type CatalogReconciliation =
  | {
      readonly kind: 'observed';
      readonly sources: number;
      readonly items: number;
      readonly classes: readonly { readonly cls: ExtractionClass; readonly count: number }[];
      readonly nineClassSum: number;
      readonly eightClassSum: number;
      readonly markers: number;
      readonly remainder: number;
    }
  | { readonly kind: 'unobserved'; readonly reason: string; readonly route: string };

/** `unknownRoute` gives an unobserved shape claim's reason and route, the
 * same pair the page states beside that claim. */
export function catalogReconciliation(shape: ProjectShape, markers: number, unknownRoute: (claim: ProjectShapeClaim) => { readonly reason: string; readonly route: string }): CatalogReconciliation {
  if (shape.kind !== 'observed') return { kind: 'unobserved', ...unknownRoute(shape.claim) };
  const classes = EXTRACTION_CLASSES.map((cls) => ({ cls, count: shape.items.filter((item) => item.class === cls).length }));
  const nineClassSum = classes.reduce((sum, entry) => sum + entry.count, 0);
  const eightClassSum = classes.filter((entry) => entry.cls !== 'project-account-section').reduce((sum, entry) => sum + entry.count, 0);
  return {
    kind: 'observed',
    sources: shape.sources.length,
    items: shape.items.length,
    classes,
    nineClassSum,
    eightClassSum,
    markers,
    remainder: markers - shape.items.length,
  };
}

function figure(name: string, state: 'Observed' | 'Inferred' | 'Unknown', value: string): string {
  return `<span data-figure="${escapeHtml(name)}" data-figure-state="${state}">${escapeHtml(value)}</span>`;
}

function label(id: PolarisCopyId): string {
  return `<span${copyAttr(id)}>${escapeHtml(copyText(id))}</span>`;
}

function signed(value: number): string {
  return value < 0 ? `−${-value}` : String(value);
}

export function renderCatalogReconciliation(figures: CatalogReconciliation): string {
  if (figures.kind === 'unobserved') {
    return `<p class="catalog-reconciliation" data-polaris-reconciliation="unobserved"${roleAttr('epistemic-disclosure')}>${label('reconciliation.label')} ${figure('reconciliation', 'Unknown', copyText('label.unknown'))} — ${escapeHtml(figures.reason)}. ${escapeHtml(copyText('label.route'))} ${escapeHtml(figures.route)}. ${label('sentence.reconciliation-unobserved')}</p>`;
  }
  const classes = figures.classes.map((entry) => `${escapeHtml(copyText(`class.${entry.cls}`))} ${figure(`class:${entry.cls}`, 'Observed', String(entry.count))}`).join(', ');
  return `<p class="catalog-reconciliation" data-polaris-reconciliation="observed"${roleAttr('project-fact')}>${label('reconciliation.label')} `
    + `${label('figure.observed')} ${figure('sources', 'Observed', String(figures.sources))} sources and ${figure('items', 'Observed', String(figures.items))} items; by class, ${classes}. `
    + `${label('figure.inferred')} the nine classes sum to ${figure('sum:nine-classes', 'Inferred', String(figures.nineClassSum))}, and the eight outside the project account to ${figure('sum:eight-classes', 'Inferred', String(figures.eightClassSum))}. `
    + `${label('figure.markers')} ${figure('markers', 'Inferred', String(figures.markers))} item markers, ${label('figure.marker-predicate')} `
    + `<span${roleAttr('epistemic-disclosure')}>${label('figure.unknown')} markers minus machine items is ${figure('remainder', 'Unknown', signed(figures.remainder))} — ${escapeHtml(REMAINDER_REASON)}. ${escapeHtml(copyText('label.route'))} ${escapeHtml(UNKNOWN_REASON_ROUTES[REMAINDER_REASON])}: ${label('figure.remainder-route')}</span></p>`;
}

/** Replaces the one placeholder with the line rendered from the final
 * HTML's marker count. A missing, repeated or truncated placeholder aborts
 * the render, as does a line that would itself add a marker or a
 * placeholder. */
export function substituteCatalogReconciliation(html: string, render: (markers: number) => string): string {
  const exact = html.split(RECONCILIATION_PLACEHOLDER).length - 1;
  const openings = html.split(PLACEHOLDER_OPENING).length - 1;
  if (exact !== 1 || openings !== 1) throw new Error(`catalog reconciliation placeholder must occur exactly once (found ${exact} exact, ${openings} opening)`);
  const line = render(countItemMarkers(html));
  if (countItemMarkers(line) !== 0 || line.includes(PLACEHOLDER_OPENING)) throw new Error('catalog reconciliation line must carry no item marker and no placeholder');
  return html.replace(RECONCILIATION_PLACEHOLDER, () => line);
}
