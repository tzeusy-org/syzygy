import { isRecord } from '@syzygy/support';

/**
 * Figure fit (REQ-polaris-generation-034, dossier figure homes and fit 2.2; syzygy-3efd.20): whether each produced figure of a draft
 * fits the dossier's content column at two viewports, computed with no browser from the laid-out width of the pure layout the renderer
 * draws that figure with. Inferred, a computation over the stylesheet constants below; advice, never a finding, and it gates nothing.
 *
 * The layout lives in the app (`diagram-layout.ts`), which this package may not import, so the app hands it in as a port, as it hands
 * in the renderer. Without the port no figure's width is known: each produced figure is Unknown, never fitting.
 */

/** The size the pages' stylesheet sets for a figure's node and edge text, and the least size it may be drawn at on the screen. */
export const FIGURE_TEXT_PX = 13;
export const FIGURE_MIN_TEXT_PX = 11;
/** The width the pages give a figure's box, with the navigation open, at each viewport (measured in Chrome, syzygy-3efd.19). */
export const FIGURE_VIEWPORTS: readonly { readonly viewportPx: number; readonly columnPx: number }[] = [{ viewportPx: 1440, columnPx: 966 }, { viewportPx: 390, columnPx: 261 }];
/** The readable layout's three-column width: the one width the stylesheet lets shrink, to its box but to no less than the floor. */
export const SHRINKING_WIDTH_PX = 1048;
export const SHRINK_FLOOR_PX = 860;

/** What the layout reads of a figure: its nodes and edges, as the draft states them. */
export interface FigureShape {
  readonly nodes: readonly { readonly id: string; readonly label: string; readonly epistemic: 'observed' | 'inferred' | 'unknown' }[];
  readonly edges: readonly { readonly id: string; readonly from: string; readonly to: string; readonly label: string; readonly epistemic: 'observed' | 'inferred' | 'unknown' }[];
}
/** The laid-out width of a figure, in CSS pixels, as the renderer would draw it; throws when the layout cannot be computed. */
export type FigureLayout = (figure: FigureShape) => number;

export type FigureFitEntry =
  | { readonly diagram: string; readonly viewportPx: number; readonly laidOutPx: number; readonly drawnPx: number; readonly columnPx: number; readonly textPx: number; readonly minTextPx: number; readonly failed: readonly ('width' | 'text-size')[] }
  | { readonly diagram: string; readonly unknown: string };

export interface FigureFit {
  readonly textPx: number;
  readonly minTextPx: number;
  readonly viewports: readonly { readonly viewportPx: number; readonly columnPx: number }[];
  readonly examined: number;
  readonly entries: readonly FigureFitEntry[];
}

export const NO_LAYOUT = 'no figure layout was supplied to this check, so its width is not known';
export const LAYOUT_FAILED = 'the figure could not be laid out';

const MARKINGS = new Set(['observed', 'inferred', 'unknown']);
const list = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);
const str = (value: unknown): string => (typeof value === 'string' ? value : '');
const marking = (value: unknown): 'observed' | 'inferred' | 'unknown' => (MARKINGS.has(value as string) ? value as 'observed' | 'inferred' | 'unknown' : 'unknown');

/** Rounded half away from zero to two places; the fit itself compares the unrounded size. */
const twoPlaces = (value: number): number => Math.sign(value) * Math.round(Math.abs(value) * 100) / 100;

/** The width the stylesheet draws a figure of laid-out width `laidOut` at, in a box `column` wide. */
export function drawnWidth(laidOut: number, column: number): number {
  return laidOut === SHRINKING_WIDTH_PX ? Math.min(laidOut, Math.max(column, SHRINK_FLOOR_PX)) : laidOut;
}

/** Figure fit over a parsed draft: depends only on its bytes, the constants above and the layout, so it is the same for the same draft. */
export function figureFit(doc: unknown, layout: FigureLayout | undefined): FigureFit {
  const entries: FigureFitEntry[] = [];
  let examined = 0;
  for (const diagram of list(isRecord(doc) ? doc['diagrams'] : undefined)) {
    if (!isRecord(diagram) || !isRecord(diagram['disposition']) || diagram['disposition']['kind'] !== 'produced') continue;
    examined += 1;
    const id = str(diagram['id']);
    if (layout === undefined) { entries.push({ diagram: id, unknown: NO_LAYOUT }); continue; }
    const shape: FigureShape = {
      nodes: list(diagram['nodes']).filter(isRecord).map((node) => ({ id: str(node['id']), label: str(node['label']), epistemic: marking(node['epistemic']) })),
      edges: list(diagram['edges']).filter(isRecord).map((edge) => ({ id: str(edge['id']), from: str(edge['from']), to: str(edge['to']), label: str(edge['label']), epistemic: marking(edge['epistemic']) })),
    };
    let laidOut: number;
    try {
      laidOut = layout(shape);
    } catch {
      entries.push({ diagram: id, unknown: LAYOUT_FAILED });
      continue;
    }
    if (!Number.isFinite(laidOut) || laidOut <= 0) { entries.push({ diagram: id, unknown: LAYOUT_FAILED }); continue; }
    for (const { viewportPx, columnPx } of FIGURE_VIEWPORTS) {
      const drawnPx = drawnWidth(laidOut, columnPx);
      const text = FIGURE_TEXT_PX * drawnPx / laidOut;
      const failed: ('width' | 'text-size')[] = [];
      if (drawnPx > columnPx) failed.push('width');
      if (text < FIGURE_MIN_TEXT_PX) failed.push('text-size');
      if (failed.length > 0) entries.push({ diagram: id, viewportPx, laidOutPx: laidOut, drawnPx, columnPx, textPx: twoPlaces(text), minTextPx: FIGURE_MIN_TEXT_PX, failed });
    }
  }
  return { textPx: FIGURE_TEXT_PX, minTextPx: FIGURE_MIN_TEXT_PX, viewports: FIGURE_VIEWPORTS, examined, entries };
}
