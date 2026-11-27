import { isRecord } from '@syzygy/support';
import { CONTAINMENT_BOUNDS, CONTAINMENT_KIND, FIGURE_BOUNDS, figureMembersOf, hasContainmentForm, hasFigureKindForm, membersOfKind } from './draft-schema.js';

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

type Marking = 'observed' | 'inferred' | 'unknown';
interface ShapeElement { readonly id: string; readonly label: string; readonly epistemic: Marking }
/** What the layout reads of a figure: a graph figure's nodes and edges, as the draft states them; or a v7 sequence's participants and
 * messages, or a swimlane's lanes and steps (REQ-polaris-generation-034 version 2.5), tagged by `kind`. */
export type FigureShape =
  | { readonly kind?: undefined; readonly nodes: readonly ShapeElement[]; readonly edges: readonly (ShapeElement & { readonly from: string; readonly to: string })[] }
  | { readonly kind: 'sequence'; readonly participants: readonly ShapeElement[]; readonly messages: readonly (ShapeElement & { readonly from: string; readonly to: string })[] }
  | { readonly kind: 'swimlane'; readonly lanes: readonly ShapeElement[]; readonly steps: readonly (ShapeElement & { readonly lane: string })[] }
  | { readonly kind: typeof CONTAINMENT_KIND; readonly groups: readonly ShapeGroup[] };
/** A v11 containment's group (version 2.23): an element with the groups drawn inside it. */
export interface ShapeGroup extends ShapeElement { readonly children: readonly ShapeGroup[] }
/** The laid-out width of a figure, in CSS pixels, as the renderer would draw it; throws when the layout cannot be computed. A sequence's or
 * swimlane's throws too where a reference names nothing in its own diagram, a participant or lane is named by nothing, or a count is out of
 * its bounds. */
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
const marking = (value: unknown): Marking => (MARKINGS.has(value as string) ? value as Marking : 'unknown');
const element = (value: Readonly<Record<string, unknown>>): ShapeElement => ({ id: str(value['id']), label: str(value['label']), epistemic: marking(value['epistemic']) });

/** A v7 sequence's or swimlane's shape, or undefined where its members do not fit its kind (a `figure-kind` finding) or a count is out of its
 * bounds (a schema finding): such a figure's layout cannot be computed, so its fit is Unknown. */
function figureShape(diagram: Readonly<Record<string, unknown>>, version: unknown): FigureShape | undefined {
  const takes = membersOfKind(diagram['kind'], version)!;
  if (figureMembersOf(version).some((member) => Object.hasOwn(diagram, member) !== takes.includes(member))) return undefined;
  if (diagram['kind'] === CONTAINMENT_KIND) return containmentShape(diagram['groups']);
  const records = (member: keyof typeof FIGURE_BOUNDS): readonly Readonly<Record<string, unknown>>[] | undefined => {
    const value = diagram[member];
    const [least, most] = FIGURE_BOUNDS[member];
    return Array.isArray(value) && value.length >= least && value.length <= most && value.every(isRecord) ? value : undefined;
  };
  if (diagram['kind'] === 'sequence') {
    const participants = records('participants'), messages = records('messages');
    if (participants === undefined || messages === undefined) return undefined;
    return { kind: 'sequence', participants: participants.map(element), messages: messages.map((message) => ({ ...element(message), from: str(message['from']), to: str(message['to']) })) };
  }
  const lanes = records('lanes'), steps = records('steps');
  if (lanes === undefined || steps === undefined) return undefined;
  return { kind: 'swimlane', lanes: lanes.map(element), steps: steps.map((step) => ({ ...element(step), lane: str(step['lane']) })) };
}

/** A v11 containment's shape (version 2.23), or undefined where its layout cannot be computed: a `groups` or `children` list out of its
 * bounds or holding a non-record (schema findings), or a group at level 4, more than 40 groups or none nested in another (the
 * `containment-depth`, `-size` and `-flat` findings). */
function containmentShape(groups: unknown): FigureShape | undefined {
  let total = 0, nested = false, fault = false;
  const shape = (values: unknown, level: number, [least, most]: readonly [number, number]): ShapeGroup[] => {
    if (!Array.isArray(values) || values.length < least || values.length > most || !values.every(isRecord)) { fault = true; return []; }
    if (level > CONTAINMENT_BOUNDS.levels && values.length > 0) { fault = true; return []; }
    if (level > 1 && values.length > 0) nested = true;
    total += values.length;
    return values.map((group) => ({ ...element(group), children: shape(group['children'], level + 1, CONTAINMENT_BOUNDS.children) }));
  };
  const top = shape(groups, 1, CONTAINMENT_BOUNDS.groups);
  return fault || !nested || total > CONTAINMENT_BOUNDS.total ? undefined : { kind: CONTAINMENT_KIND, groups: top };
}

/** Rounded half away from zero to two places; the fit itself compares the unrounded size. The product is first cut to twelve significant
 * digits, so a binary representation just under a true half (1.005 × 100 = 100.49999…) still rounds up. */
const twoPlaces = (value: number): number => Math.sign(value) * Math.round(Number((Math.abs(value) * 100).toPrecision(12))) / 100;

/** The width the stylesheet draws a figure of laid-out width `laidOut` at, in a box `column` wide. */
export function drawnWidth(laidOut: number, column: number): number {
  return laidOut === SHRINKING_WIDTH_PX ? Math.min(laidOut, Math.max(column, SHRINK_FLOOR_PX)) : laidOut;
}

/** Figure fit over a parsed draft: depends only on its bytes, the constants above and the layout, so it is the same for the same draft
 * wherever the same layout is supplied (the `syzygy` CLI supplies it to every check; without it every produced figure is Unknown). */
export function figureFit(doc: unknown, layout: FigureLayout | undefined): FigureFit {
  const entries: FigureFitEntry[] = [];
  let examined = 0;
  // Only a v7 or later draft has the figure kinds; in any other draft every diagram is laid out as a graph, as version 2.4 lays it out.
  const version = isRecord(doc) ? doc['schemaVersion'] : undefined;
  const v7 = hasFigureKindForm(version);
  for (const diagram of list(isRecord(doc) ? doc['diagrams'] : undefined)) {
    if (!isRecord(diagram) || !isRecord(diagram['disposition']) || diagram['disposition']['kind'] !== 'produced') continue;
    examined += 1;
    const id = str(diagram['id']);
    if (layout === undefined) { entries.push({ diagram: id, unknown: NO_LAYOUT }); continue; }
    // A v11 containment (version 2.23) is examined as a sequence or swimlane is: its drawing or its phone form.
    const kinded = v7 && (diagram['kind'] === 'sequence' || diagram['kind'] === 'swimlane' || (hasContainmentForm(version) && diagram['kind'] === CONTAINMENT_KIND));
    const shape: FigureShape | undefined = kinded ? figureShape(diagram, version) : {
      nodes: list(diagram['nodes']).filter(isRecord).map((node) => ({ id: str(node['id']), label: str(node['label']), epistemic: marking(node['epistemic']) })),
      edges: list(diagram['edges']).filter(isRecord).map((edge) => ({ id: str(edge['id']), from: str(edge['from']), to: str(edge['to']), label: str(edge['label']), epistemic: marking(edge['epistemic']) })),
    };
    let laidOut: number;
    try {
      if (shape === undefined) throw new Error('figure-kind');
      laidOut = layout(shape);
    } catch {
      entries.push({ diagram: id, unknown: LAYOUT_FAILED });
      continue;
    }
    if (!Number.isFinite(laidOut) || laidOut <= 0) { entries.push({ diagram: id, unknown: LAYOUT_FAILED }); continue; }
    for (const { viewportPx, columnPx } of FIGURE_VIEWPORTS) {
      // A sequence or swimlane shows the form its box can hold (version 2.5): its drawing where W <= C, drawn at W; its phone form
      // otherwise, which fills the box (D = C) and wraps, its text never scaled. Either way its text is the 13 px the stylesheet sets.
      const drawnPx = kinded ? Math.min(laidOut, columnPx) : drawnWidth(laidOut, columnPx);
      const text = kinded ? FIGURE_TEXT_PX : FIGURE_TEXT_PX * drawnPx / laidOut;
      const failed: ('width' | 'text-size')[] = [];
      if (drawnPx > columnPx) failed.push('width');
      if (text < FIGURE_MIN_TEXT_PX) failed.push('text-size');
      if (failed.length > 0) entries.push({ diagram: id, viewportPx, laidOutPx: kinded ? drawnPx : laidOut, drawnPx, columnPx, textPx: twoPlaces(text), minTextPx: FIGURE_MIN_TEXT_PX, failed });
    }
  }
  return { textPx: FIGURE_TEXT_PX, minTextPx: FIGURE_MIN_TEXT_PX, viewports: FIGURE_VIEWPORTS, examined, entries };
}
