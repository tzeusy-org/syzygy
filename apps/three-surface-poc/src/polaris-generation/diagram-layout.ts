import type { EpistemicMarking } from '@syzygy/polaris-generation-core/live';

/**
 * Deterministic layered left-to-right layout for draft-preview diagrams. No
 * dependency, no randomness: the same nodes and edges in the same order always
 * give the same coordinates.
 *
 * - DFS in node order, following each node's edges in edge order, marks every
 *   edge into a node still on the stack as a back edge (self-loops included).
 *   The remaining forward edges form a DAG.
 * - Each node's layer is its longest forward path from a source.
 * - Within a layer, nodes sort by the mean row of their forward predecessors,
 *   then by input position; each layer is centred vertically.
 * - Forward edges are cubic curves from the source's right side to the target's
 *   left side. Back edges are curves drawn below the layers, each one lower
 *   than the last.
 */

const NODE_WIDTH = 200;
const NODE_HEIGHT = 56;
const MARGIN = 24;
const BACK_EDGE_DROP = 40;
const BACK_LABEL_CLEARANCE = 30;
const SKIP_LABEL_DROP = 52;
const NODE_NOTE_HEIGHT = 24;
const LABEL_CLEARANCE = 4;
const LABEL_STEP = 8;
const LEADER_SAMPLES = 64;
const LEADER_MIN_RUN = 6;
const LEADER_SHARED = 1.5;
const LEADER_EDGE_STOPS = 16;
/** An arrowhead as drawn: the marker's 10-unit triangle at `markerWidth` 8 in stroke units, on an edge stroked 2 wide (1.6 px a unit),
 * its tip one unit past the line's end (`refX` 9). The hover's wider stroke draws it larger; at rest it is this size. */
const ARROW_UNIT = 1.6;

/** How much room a diagram gets. The default is the draft preview's and the provider mode's form, whose bytes are pinned. */
export interface DiagramSpacing {
  readonly gapX: number; readonly gapY: number;
  /** Columns before the layers continue on a band below; the vertical gap between bands; both unused while every layer fits on one band. */
  readonly maxColumns: number; readonly bandGap: number;
  /** An edge label's wrap and the width one of its characters is assumed to take. */
  readonly edgeChars: number; readonly edgeLines: number; readonly charWidth: number;
  /** Draw edge labels above everything, lines still behind the nodes, so at rest a line never strikes through a node's text or a label; a label under the pointer draws its line above both. */
  readonly labelsOnTop: boolean;
  /** How much lower each further back edge runs. */
  readonly backEdgeStep: number;
}
export const DEFAULT_SPACING: DiagramSpacing = { gapX: 120, gapY: 40, maxColumns: Number.POSITIVE_INFINITY, bandGap: 0, edgeChars: 18, edgeLines: 2, charWidth: 7.4, labelsOnTop: false, backEdgeStep: 30 };
/** An operator-agent dossier's diagrams: the widest edge label (22 characters: 186 px) fits its 198 px gap, three-line labels on adjacent
 * rows of a fan-out stay clear of each other, and a long plain chain continues on the next band instead of scrolling sideways (syzygy-pdja.1). */
export const READABLE_SPACING: DiagramSpacing = { gapX: 200, gapY: 64, maxColumns: 3, bandGap: 88, edgeChars: 22, edgeLines: 3, charWidth: 7.9, labelsOnTop: true, backEdgeStep: 56 };

interface LayoutNodeInput { readonly id: string }
interface LayoutEdgeInput { readonly id: string; readonly from: string; readonly to: string }
interface LaidOutNode { readonly id: string; readonly layer: number; readonly row: number; readonly x: number; readonly y: number }
interface LaidOutEdge {
  readonly id: string; readonly from: string; readonly to: string; readonly back: boolean;
  readonly d: string; readonly labelX: number; readonly labelY: number;
}
interface DiagramLayout { readonly width: number; readonly height: number; readonly nodes: readonly LaidOutNode[]; readonly edges: readonly LaidOutEdge[] }

const num = (value: number): string => String(Math.round(value * 10) / 10);

// Test seam: exported for the tests; production code reaches it only inside this file.
export function layoutDiagram(nodes: readonly LayoutNodeInput[], edges: readonly LayoutEdgeInput[], spacing: DiagramSpacing = DEFAULT_SPACING): DiagramLayout {
  const { gapX, gapY, maxColumns, bandGap } = spacing;
  if (nodes.length === 0) throw new Error('empty-diagram');
  const index = new Map<string, number>();
  nodes.forEach((node, i) => {
    if (index.has(node.id)) throw new Error('duplicate-node');
    index.set(node.id, i);
  });
  const ends = edges.map(edge => {
    const from = index.get(edge.from), to = index.get(edge.to);
    if (from === undefined || to === undefined) throw new Error('unknown-node');
    return { from, to };
  });
  const outgoing = nodes.map(() => [] as number[]);
  ends.forEach((end, e) => outgoing[end.from]!.push(e));

  const back = edges.map(() => false);
  const state = nodes.map(() => 0); // 0 unvisited, 1 on stack, 2 done
  const visit = (u: number): void => {
    state[u] = 1;
    for (const e of outgoing[u]!) {
      const v = ends[e]!.to;
      if (state[v] === 1) back[e] = true;
      else if (state[v] === 0) visit(v);
    }
    state[u] = 2;
  };
  nodes.forEach((_, i) => { if (state[i] === 0) visit(i); });

  const layer = nodes.map(() => 0);
  const indegree = nodes.map(() => 0);
  ends.forEach((end, e) => { if (!back[e]) indegree[end.to]!++; });
  const ready = nodes.flatMap((_, i) => indegree[i] === 0 ? [i] : []);
  let placed = 0;
  while (ready.length > 0) {
    ready.sort((a, b) => a - b);
    const u = ready.shift()!;
    placed++;
    for (const e of outgoing[u]!) {
      if (back[e]) continue;
      const v = ends[e]!.to;
      layer[v] = Math.max(layer[v]!, layer[u]! + 1);
      if (--indegree[v]! === 0) ready.push(v);
    }
  }
  if (placed !== nodes.length) throw new Error('layout-cycle'); // unreachable: back edges break every cycle

  const layerCount = Math.max(...layer) + 1;
  const row = nodes.map(() => 0);
  const members: number[][] = Array.from({ length: layerCount }, () => []);
  for (let l = 0; l < layerCount; l++) {
    const inLayer = nodes.flatMap((_, i) => layer[i] === l ? [i] : []);
    const barycenter = (i: number): number => {
      const rows = ends.flatMap((end, e) => !back[e] && end.to === i ? [row[end.from]!] : []);
      return rows.length === 0 ? Number.POSITIVE_INFINITY : rows.reduce((a, b) => a + b, 0) / rows.length;
    };
    const keyed = inLayer.map(i => ({ i, key: barycenter(i) }));
    keyed.sort((a, b) => a.key === b.key ? a.i - b.i : a.key < b.key ? -1 : 1);
    keyed.forEach(({ i }, r) => { row[i] = r; });
    members[l] = keyed.map(({ i }) => i);
  }
  // Bands are for a plain chain: one node to a layer and only one-layer steps, so a hand-off between bands crosses nothing. A loop, a skip
  // or a tall column would put a line or a label on a node, so such a diagram keeps one band and scrolls.
  const wraps = Number.isFinite(maxColumns) && layerCount > maxColumns && !back.some(Boolean)
    && members.every(m => m.length === 1) && ends.every(end => layer[end.to]! === layer[end.from]! + 1);
  const columns = wraps ? maxColumns : Number.POSITIVE_INFINITY;
  const bandOf = (l: number): number => Math.floor(l / columns);
  const columnHeight = (count: number): number => count * NODE_HEIGHT + (count - 1) * gapY;
  const bandHeight = new Map<number, number>();
  members.forEach((m, l) => bandHeight.set(bandOf(l), Math.max(bandHeight.get(bandOf(l)) ?? 0, columnHeight(m.length))));
  const bandTop = new Map<number, number>();
  let nextTop = MARGIN;
  for (const [band, height] of bandHeight) { bandTop.set(band, nextTop); nextTop += height + bandGap; }
  const contentBottom = nextTop - bandGap;
  const laidNodes: LaidOutNode[] = nodes.map((node, i) => {
    const band = bandOf(layer[i]!);
    const offset = (bandHeight.get(band)! - columnHeight(members[layer[i]!]!.length)) / 2;
    return { id: node.id, layer: layer[i]!, row: row[i]!, x: MARGIN + (layer[i]! % columns) * (NODE_WIDTH + gapX), y: bandTop.get(band)! + offset + row[i]! * (NODE_HEIGHT + gapY) };
  });

  let backCount = 0;
  const laidEdges: LaidOutEdge[] = edges.map((edge, e) => {
    const from = laidNodes[ends[e]!.from]!, to = laidNodes[ends[e]!.to]!;
    if (!back[e] && bandOf(from.layer) !== bandOf(to.layer)) {
      // The hand-off to a later band leaves the node's foot and enters the next node's head, its label in the gap between the bands.
      const x1 = from.x + NODE_WIDTH / 2, y1 = from.y + NODE_HEIGHT, x2 = to.x + NODE_WIDTH / 2, y2 = to.y - 2;
      const dy = (y2 - y1) / 2;
      return { id: edge.id, from: edge.from, to: edge.to, back: false,
        d: `M ${num(x1)} ${num(y1)} C ${num(x1)} ${num(y1 + dy)}, ${num(x2)} ${num(y2 - dy)}, ${num(x2)} ${num(y2)}`,
        labelX: (x1 + x2) / 2, labelY: (y1 + y2) / 2 };
    }
    if (!back[e]) {
      const x1 = from.x + NODE_WIDTH, y1 = from.y + NODE_HEIGHT / 2, x2 = to.x - 2, y2 = to.y + NODE_HEIGHT / 2;
      const dx = (x2 - x1) / 2;
      // A skip's midpoint can land on a node it passes, so on the readable form its label starts in the first gap, under the neighbouring
      // edge's label there; the renderer moves it if that is taken.
      const skips = spacing.labelsOnTop && to.layer > from.layer + 1;
      return { id: edge.id, from: edge.from, to: edge.to, back: false,
        d: `M ${num(x1)} ${num(y1)} C ${num(x1 + dx)} ${num(y1)}, ${num(x2 - dx)} ${num(y2)}, ${num(x2)} ${num(y2)}`,
        labelX: skips ? x1 + gapX / 2 : (x1 + x2) / 2, labelY: skips ? y1 + SKIP_LABEL_DROP : (y1 + y2) / 2 };
    }
    const lane = backCount++;
    const depth = contentBottom + BACK_EDGE_DROP + lane * spacing.backEdgeStep;
    const self = from.id === to.id;
    const sx = from.x + NODE_WIDTH / 2 + (self ? 30 : 0), sy = from.y + NODE_HEIGHT;
    const tx = to.x + NODE_WIDTH / 2 - (self ? 30 : 0), ty = to.y + NODE_HEIGHT + 2;
    return { id: edge.id, from: edge.from, to: edge.to, back: true,
      d: `M ${num(sx)} ${num(sy)} C ${num(sx)} ${num(depth)}, ${num(tx)} ${num(depth)}, ${num(tx)} ${num(ty)}`,
      // On the readable form a back edge's label sits in its own lane under every node, whichever row the edge leaves.
      labelX: (sx + tx) / 2, labelY: spacing.labelsOnTop ? contentBottom + BACK_LABEL_CLEARANCE + lane * spacing.backEdgeStep : (sy + ty + 6 * depth) / 8 };
  });
  const lowestBackEdge = backCount === 0 ? contentBottom + (spacing.labelsOnTop ? 32 : 24) : contentBottom + BACK_EDGE_DROP + (backCount - 1) * spacing.backEdgeStep;
  return {
    width: MARGIN * 2 + Math.min(layerCount, columns) * NODE_WIDTH + (Math.min(layerCount, columns) - 1) * gapX,
    height: Math.ceil(lowestBackEdge + MARGIN),
    nodes: laidNodes,
    edges: laidEdges,
  };
}

// Test seam: exported for the tests; production code reaches it only inside this file.
/** Greedy word wrap; words longer than a line are split; overflow ends in `…`. */
export function wrapLabel(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.replace(/\s+/gu, ' ').trim().split(' ').flatMap(word => {
    const chars = [...word];
    const parts: string[] = [];
    for (let i = 0; i < chars.length; i += maxChars) parts.push(chars.slice(i, i + maxChars).join(''));
    return parts;
  });
  const lines: string[] = [];
  for (const word of words) {
    const last = lines[lines.length - 1];
    if (last !== undefined && [...last].length + 1 + [...word].length <= maxChars) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  if (lines.length <= maxLines) return lines.length === 0 ? [''] : lines;
  const kept = lines.slice(0, maxLines);
  const last = [...kept[maxLines - 1]!];
  kept[maxLines - 1] = `${last.slice(0, Math.max(0, maxChars - 1)).join('')}…`;
  return kept;
}

interface LabelBox { readonly left: number; readonly top: number; readonly right: number; readonly bottom: number }
/** Whether the segment from (x0, y0) to (x1, y1) enters the box, by clipping it to the box's two slabs. */
function segmentEntersBox(x0: number, y0: number, x1: number, y1: number, box: LabelBox): boolean {
  let enter = 0, leave = 1;
  for (const [from, delta, low, high] of [[x0, x1 - x0, box.left, box.right], [y0, y1 - y0, box.top, box.bottom]] as const) {
    if (delta === 0) { if (from <= low || from >= high) return false; continue; }
    const a = (low - from) / delta, b = (high - from) / delta;
    enter = Math.max(enter, Math.min(a, b));
    leave = Math.min(leave, Math.max(a, b));
  }
  return enter < leave;
}

interface Point { readonly x: number; readonly y: number }

function curveSamples(d: string): readonly Point[] {
  const [x0, y0, x1, y1, x2, y2, x3, y3] = [...d.matchAll(/-?[\d.]+/gu)].map(m => Number(m[0])) as [number, number, number, number, number, number, number, number];
  return Array.from({ length: LEADER_SAMPLES + 1 }, (_, i) => {
    const t = i / LEADER_SAMPLES, u = 1 - t;
    return {
      x: u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
      y: u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
    };
  });
}

type Triangle = readonly [Point, Point, Point];

/** An edge's arrowhead triangle, pointing along the curve's end tangent (the marker's `orient="auto"`). */
// Test seam: exported for the tests; production code reaches it only inside this file.
export function arrowheadOf(d: string): Triangle {
  const [x0, y0, x1, y1, x2, y2, x3, y3] = [...d.matchAll(/-?[\d.]+/gu)].map(m => Number(m[0])) as [number, number, number, number, number, number, number, number];
  // The end tangent runs from the last control point that differs from the end.
  const [fromX, fromY] = x2 !== x3 || y2 !== y3 ? [x2, y2] : x1 !== x3 || y1 !== y3 ? [x1, y1] : [x0, y0];
  const length = Math.hypot(x3 - fromX, y3 - fromY) || 1;
  const ux = (x3 - fromX) / length, uy = (y3 - fromY) / length;
  const at = (along: number, across: number): Point => ({ x: x3 + (ux * along - uy * across) * ARROW_UNIT, y: y3 + (uy * along + ux * across) * ARROW_UNIT });
  return [at(1, 0), at(-9, -5), at(-9, 5)];
}

// Test seam: exported for the tests; production code reaches it only inside this file.
export function distanceToTriangle(at: Point, [a, b, c]: Triangle): number {
  const side = (p: Point, q: Point): number => (q.x - p.x) * (at.y - p.y) - (q.y - p.y) * (at.x - p.x);
  const ab = side(a, b), bc = side(b, c), ca = side(c, a);
  if ((ab >= 0 && bc >= 0 && ca >= 0) || (ab <= 0 && bc <= 0 && ca <= 0)) return 0;
  return Math.min(distanceToSegment(at, a, b), distanceToSegment(at, b, c), distanceToSegment(at, c, a));
}

function distanceToSegment(at: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y, length = dx * dx + dy * dy;
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((at.x - a.x) * dx + (at.y - a.y) * dy) / length));
  return Math.hypot(at.x - (a.x + t * dx), at.y - (a.y + t * dy));
}

/**
 * A moved label's leader: the shortest straight run from the label's edge to a point of its own curve, clear of every other label and node,
 * ending where no other line runs and outside every other line's arrowhead, so the picture cannot tie the label to that line. Undefined when the label already sits against its own
 * line, since a leader says nothing more there, and when no such run exists: an absent leader leaves a reader unassisted, a wrong one misleads.
 */
// Test seam: exported for the tests; production code reaches it only inside this file.
export function leaderRun(own: readonly Point[], label: LabelBox, others: readonly LabelBox[], otherCurves: readonly (readonly Point[])[], otherHeads: readonly Triangle[]): { readonly from: Point; readonly to: Point } | undefined {
  const gap = (at: Point): number => Math.hypot(Math.max(label.left - at.x, 0, at.x - label.right), Math.max(label.top - at.y, 0, at.y - label.bottom));
  if (own.some(at => gap(at) < LEADER_MIN_RUN)) return undefined;
  const ends = own.filter(at => otherCurves.every(curve => curve.every((a, i) => i === 0 || distanceToSegment(at, curve[i - 1]!, a) >= LEADER_SHARED))
    && otherHeads.every(head => distanceToTriangle(at, head) >= LEADER_SHARED));
  const starts: Point[] = [];
  for (let k = 0; k <= LEADER_EDGE_STOPS; k++) {
    const across = label.left + (label.right - label.left) * k / LEADER_EDGE_STOPS, down = label.top + (label.bottom - label.top) * k / LEADER_EDGE_STOPS;
    starts.push({ x: across, y: label.top }, { x: across, y: label.bottom }, { x: label.left, y: down }, { x: label.right, y: down });
  }
  const runs = ends.flatMap(to => starts.map(from => ({ from, to, length: Math.hypot(to.x - from.x, to.y - from.y) })));
  runs.sort((a, b) => a.length - b.length);
  return runs.find(({ from, to }) => others.every(box => !segmentEntersBox(from.x, from.y, to.x, to.y, box)));
}

interface WantedLabel { readonly x: number; readonly y: number; readonly width: number; readonly height: number; readonly back: boolean }

/**
 * Moves each edge label to the first spot that clears every node and every label already placed, keeping a label that is clear where it
 * is. Back edges' labels go first, since each has its own lane under the nodes. The search widens one step at a time, counting steps across
 * plus steps down, so a diagonal spot counts as farther than a straight one the same distance away. Within a step it tries up, then down,
 * before sideways, and right before left. It stays on the canvas across and above, and may run below it (the caller grows the canvas). It ends whenever each label's own column fits the canvas, which every label does: the widest is 24 characters (201.6 px) on a canvas of at least 248.
 */
// Test seam: exported for the tests; production code reaches it only inside this file.
export function placeEdgeLabels(wanted: readonly WantedLabel[], nodes: readonly LabelBox[], canvasWidth: number): readonly { readonly x: number; readonly y: number }[] {
  const taken = [...nodes];
  const placed: { x: number; y: number }[] = wanted.map(({ x, y }) => ({ x, y }));
  const order = [...wanted.keys()].sort((a, b) => Number(wanted[b]!.back) - Number(wanted[a]!.back) || a - b);
  for (const i of order) {
    const label = wanted[i]!;
    const boxAt = (dx: number, dy: number): LabelBox => ({ left: label.x + dx - label.width / 2, top: label.y + dy - label.height / 2, right: label.x + dx + label.width / 2, bottom: label.y + dy + label.height / 2 });
    const clear = (box: LabelBox): boolean => box.left >= 0 && box.right <= canvasWidth && box.top >= LABEL_CLEARANCE
      && !taken.some(other => box.left < other.right + LABEL_CLEARANCE && other.left < box.right + LABEL_CLEARANCE && box.top < other.bottom + LABEL_CLEARANCE && other.top < box.bottom + LABEL_CLEARANCE);
    let found: LabelBox | undefined;
    for (let ring = 0; found === undefined; ring++) {
      for (let across = 0; across <= ring && found === undefined; across++) {
        for (const [dx, dy] of [[across, across - ring], [across, ring - across], [-across, across - ring], [-across, ring - across]] as const) {
          const box = boxAt(dx * LABEL_STEP, dy * LABEL_STEP);
          if (clear(box)) { found = box; placed[i] = { x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 }; break; }
        }
      }
    }
    taken.push(found);
  }
  return placed;
}

interface RenderableNode extends LayoutNodeInput { readonly label: string; readonly epistemic: EpistemicMarking }
interface RenderableEdge extends LayoutEdgeInput { readonly label: string; readonly epistemic: EpistemicMarking }

/**
 * Renders a laid-out diagram as static SVG. Every piece of text passes through
 * `escape`; every attribute value is a number, a path, or an id/class built here.
 * The caller must still pass the result through `assertInertSvg`.
 */
export function renderDiagramSvg(
  diagram: { readonly nodes: readonly RenderableNode[]; readonly edges: readonly RenderableEdge[] },
  index: number,
  escape: (value: string) => string,
  spacing: DiagramSpacing = DEFAULT_SPACING,
): string {
  const layout = layoutDiagram(diagram.nodes, diagram.edges, spacing);
  const markerId = `arrow-${index}`;
  const connected = new Set(diagram.edges.flatMap(edge => [edge.from, edge.to]));
  const shown = (label: string, marking: EpistemicMarking, maxChars: number, maxLines: number): string[] => {
    const lines = wrapLabel(label, maxChars, maxLines);
    if (marking === 'unknown') lines[lines.length - 1] = `${lines[lines.length - 1]} ?`;
    return lines;
  };
  const textLines = (lines: readonly string[], x: number, firstBaseline: number, lineHeight: number): string =>
    `<text x="${num(x)}" y="${num(firstBaseline)}" text-anchor="middle">${lines.map((line, i) => `<tspan x="${num(x)}" dy="${i === 0 ? 0 : lineHeight}">${escape(line)}</tspan>`).join('')}</text>`;
  const nodes = diagram.nodes.map((node, i) => {
    const at = layout.nodes[i]!;
    const lines = shown(node.label, node.epistemic, 22, 2);
    const baseline = at.y + NODE_HEIGHT / 2 + 5 - (lines.length - 1) * 8;
    const note = connected.has(node.id) ? '' : `<text class="note" x="${num(at.x + NODE_WIDTH / 2)}" y="${num(at.y + NODE_HEIGHT + 18)}" text-anchor="middle">No relationship supplied</text>`;
    return `<g class="node ${node.epistemic}"><title>${escape(node.label)} (${node.epistemic})</title><rect x="${num(at.x)}" y="${num(at.y)}" width="${NODE_WIDTH}" height="${NODE_HEIGHT}" rx="6"/>${textLines(lines, at.x + NODE_WIDTH / 2, baseline, 16)}${note}</g>`;
  }).join('');
  const edgeLines = diagram.edges.map(edge => shown(edge.label, edge.epistemic, spacing.edgeChars, spacing.edgeLines));
  const wanted = edgeLines.map((lines, i) => ({
    x: layout.edges[i]!.labelX, y: layout.edges[i]!.labelY, back: layout.edges[i]!.back,
    width: Math.max(...lines.map(line => [...line].length)) * spacing.charWidth + 12, height: lines.length * 15 + 6,
  }));
  const standing = diagram.nodes.map((node, i) => {
    const at = layout.nodes[i]!;
    return { left: at.x, top: at.y, right: at.x + NODE_WIDTH, bottom: at.y + NODE_HEIGHT + (connected.has(node.id) ? 0 : NODE_NOTE_HEIGHT) };
  });
  const placed = spacing.labelsOnTop ? placeEdgeLabels(wanted, standing, layout.width) : wanted;
  const curves = spacing.labelsOnTop ? layout.edges.map(edge => curveSamples(edge.d)) : [];
  const heads = spacing.labelsOnTop ? layout.edges.map(edge => arrowheadOf(edge.d)) : [];
  const boxOf = (i: number): LabelBox => {
    const { width, height } = wanted[i]!, { x, y } = placed[i]!;
    return { left: x - width / 2, top: y - height / 2, right: x + width / 2, bottom: y + height / 2 };
  };
  const edges = diagram.edges.map((edge, i) => {
    const at = layout.edges[i]!, lines = edgeLines[i]!, { x, y, width, height } = { ...wanted[i]!, ...placed[i]! };
    const top = y - height / 2;
    // A label the search moved keeps a thin leader to its own line where one can be seen, in the line's layer: without one, it can read as
    // another line's label.
    const moved = x !== at.labelX || y !== at.labelY;
    const run = moved
      ? leaderRun(curves[i]!, boxOf(i), [...standing, ...wanted.flatMap((_, j) => j === i ? [] : [boxOf(j)])], curves.filter((_, j) => layout.edges[j]!.d !== at.d),
        heads.filter((_, j) => layout.edges[j]!.d !== at.d))
      : undefined;
    const leader = run === undefined ? '' : `<path class="edge-leader" d="M ${num(run.from.x)} ${num(run.from.y)} L ${num(run.to.x)} ${num(run.to.y)}"/>`;
    const head = `<g class="edge ${edge.epistemic}${at.back ? ' back' : ''}"><title>${escape(edge.label)} (${edge.epistemic})</title><path d="${at.d}" marker-end="url(#${markerId})"/>${leader}`;
    const label = `<rect class="edge-label" x="${num(x - width / 2)}" y="${num(top)}" width="${num(width)}" height="${num(height)}" rx="3"/>${textLines(lines, x, top + 15, 15)}`;
    // A label's own copy of its line, hidden until the label is under the pointer: the line itself sits in a lower layer the label cannot reach without a script.
    return spacing.labelsOnTop ? { line: `${head}</g>`, label: `<g class="edge-text ${edge.epistemic}"><title>${escape(edge.label)} (${edge.epistemic})</title><path class="edge-echo" d="${at.d}"/>${label}</g>` } : { line: `${head}${label}</g>`, label: '' };
  });
  const height = Math.max(layout.height, ...(spacing.labelsOnTop ? placed.map((box, i) => Math.ceil(box.y + wanted[i]!.height / 2 + LABEL_STEP)) : []));
  const lines = edges.map(edge => edge.line).join(''), labels = edges.map(edge => edge.label).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${layout.width} ${height}" width="${layout.width}" height="${height}" role="img" aria-labelledby="diagram-title-${index}" aria-describedby="diagram-text-${index}"><defs><marker id="${markerId}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z"/></marker></defs>${lines}${nodes}${labels}</svg>`;
}
