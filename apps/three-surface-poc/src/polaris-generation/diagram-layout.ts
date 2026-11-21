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
 * - On a spacing with a column limit, a plain chain longer than the limit
 *   continues on bands below; any other diagram longer than the limit is
 *   stacked top to bottom instead (`stackDiagram`).
 */

const NODE_WIDTH = 200;
const NODE_HEIGHT = 56;
const MARGIN = 24;
const BACK_EDGE_DROP = 40;
const BACK_LABEL_CLEARANCE = 30;
const SKIP_LABEL_DROP = 52;
const NODE_NOTE_HEIGHT = 24;
/** "No relationship supplied" in the note's 12 px monospace is about 173 px; a node narrower than this wraps it onto two lines, under it. */
const NOTE_ONE_LINE = 174;
const noteHeight = (nodeWidth: number): number => (nodeWidth < NOTE_ONE_LINE ? NODE_NOTE_HEIGHT + 16 : NODE_NOTE_HEIGHT);
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
  /** The label sits away from its line (a stacked diagram's lane edge): draw it a leader as if it had been moved. */
  readonly lead?: true;
}
/** `nodeWidth` is every node's width: `NODE_WIDTH`, except in a stacked diagram whose lanes leave less room in `STACK_COLUMN`. */
interface DiagramLayout { readonly width: number; readonly height: number; readonly nodeWidth: number; readonly nodes: readonly LaidOutNode[]; readonly edges: readonly LaidOutEdge[] }

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
  // or a tall column would put a line or a label on a node on a band break, so such a diagram is stacked top to bottom instead.
  const tooWide = Number.isFinite(maxColumns) && layerCount > maxColumns;
  const wraps = tooWide && !back.some(Boolean)
    && members.every(m => m.length === 1) && ends.every(end => layer[end.to]! === layer[end.from]! + 1);
  if (tooWide && !wraps) return stackDiagram(nodes, edges, ends, back, layer, row, members, spacing);
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
    nodeWidth: NODE_WIDTH,
    nodes: laidNodes,
    edges: laidEdges,
  };
}

/** How far apart two side lanes run, and how far the first runs from the nodes' edge, at most and at least: lanes draw closer, down to the
 * least, until the stacked form fits `STACK_COLUMN`. */
const LANE_STEP = 8;
const LANE_STEP_LEAST = 4;
/** The narrowest a stacked node gets when its lanes, at the least step, still outgrow `STACK_COLUMN`: past that the diagram scrolls. */
const NODE_WIDTH_LEAST = 120;
/** The narrowest box a dossier gives a diagram: 261 px on a 390 px screen, measured in Chrome on the reading fixture (syzygy-3efd.19). */
const STACK_COLUMN = 261;
/** Where a lane edge leaves its source's side and enters its target's, measured down from the node's top. */
const LANE_EXIT = 20;
const LANE_ENTRY = 36;

/**
 * A diagram wider than the readable column that is not a plain chain, stacked top to bottom one node to a row, so it is no wider than one
 * node and its side lanes: 248 px with up to two lanes a side, and inside `STACK_COLUMN` with up to twelve lanes in all, the lanes drawn
 * closer as they grow (syzygy-3efd.19). Past that the nodes narrow to fit, down to `NODE_WIDTH_LEAST` (syzygy-3efd.58), which no
 * graph of sixteen nodes reaches (at most sixteen lane groups a side, 68 px at the least step, leaving 125 px); only past that does it scroll in its own box, as any too-wide diagram does. Rows are in a topological
 * order of the forward edges, so every forward edge points down and every back edge up.
 * - A forward edge to the next row is a straight drop from the source's foot to the target's head.
 * - Any other forward edge leaves the source's left side, bulges into a lane left of every node and enters the target's left side; a back
 *   edge or a self-loop does the same on the right. A cubic whose two inner control points share an x outside the nodes never reaches
 *   the nodes' side, so no line crosses a node. Left-lane edges from one source share its lane, as right-lane edges into one target
 *   share theirs (they leave or enter at one point, so a fan-out costs one lane); a lane is reused by groups whose rows do not overlap,
 *   the shorter span inside.
 * - Each edge label wants a slot in the gap next to its target (above it for a forward edge, below for a back edge), centred on the node
 *   column, under the note of a node with no edges; a gap grows to hold its slots, so no label starts on a node, a note or another label.
 *   A lane edge's label is drawn a leader to its line, which runs beside the column, not through the label's gap.
 */
function stackDiagram(
  nodes: readonly LayoutNodeInput[], edges: readonly LayoutEdgeInput[], ends: readonly { readonly from: number; readonly to: number }[],
  back: readonly boolean[], layer: readonly number[], row: readonly number[], members: readonly (readonly number[])[], spacing: DiagramSpacing,
): DiagramLayout {
  // Rows follow a topological order that continues from the row just placed where it can, so a run of steps stays a run of straight drops;
  // otherwise the next row is the first remaining node in layered order.
  const layered = members.flat();
  const indegree = nodes.map(() => 0);
  ends.forEach((end, e) => { if (!back[e]) indegree[end.to]!++; });
  const order: number[] = [];
  const placed = nodes.map(() => false);
  while (order.length < nodes.length) {
    const last = order[order.length - 1];
    const follow = last === undefined ? undefined
      : ends.find((end, e) => !back[e] && end.from === last && !placed[end.to] && indegree[end.to] === 0)?.to;
    const pick = follow ?? layered.find(i => !placed[i] && indegree[i] === 0)!;
    placed[pick] = true;
    order.push(pick);
    ends.forEach((end, e) => { if (!back[e] && end.from === pick) indegree[end.to]!--; });
  }
  const position = nodes.map(() => 0);
  order.forEach((i, p) => { position[i] = p; });
  const straight = ends.map((end, e) => !back[e] && position[end.to]! === position[end.from]! + 1);
  const side = ends.map((_, e) => straight[e] ? 'none' : back[e] ? 'right' : 'left');

  // Lanes: a left-lane edge is grouped by its source, a right-lane edge by its target; groups take lanes shorter span first, each into
  // the innermost lane none of whose groups shares a row with it.
  const lane = ends.map(() => 0);
  const laneCount = { left: 0, right: 0 };
  for (const which of ['left', 'right'] as const) {
    const groups = new Map<number, { members: number[]; low: number; high: number; first: number }>();
    ends.forEach((end, e) => {
      if (side[e] !== which) return;
      const key = which === 'left' ? end.from : end.to;
      const low = Math.min(position[end.from]!, position[end.to]!), high = Math.max(position[end.from]!, position[end.to]!);
      const group = groups.get(key);
      if (group === undefined) groups.set(key, { members: [e], low, high, first: e });
      else { group.members.push(e); group.low = Math.min(group.low, low); group.high = Math.max(group.high, high); }
    });
    const spans = [...groups.values()].sort((a, b) => (a.high - a.low) - (b.high - b.low) || a.first - b.first);
    const taken: { low: number; high: number }[][] = [];
    for (const span of spans) {
      let k = 0;
      while (taken[k]?.some(other => span.low <= other.high && other.low <= span.high)) k++;
      (taken[k] ??= []).push(span);
      for (const e of span.members) lane[e] = k;
    }
    laneCount[which] = taken.length;
  }
  const gutterAt = (count: number, step: number): number => Math.max(MARGIN, count * step + 4);
  let step = LANE_STEP;
  while (step > LANE_STEP_LEAST && gutterAt(laneCount.left, step) + NODE_WIDTH + gutterAt(laneCount.right, step) > STACK_COLUMN) step--;
  const gutter = (count: number): number => gutterAt(count, step);
  // Still too wide at the least step: the nodes narrow, never below `NODE_WIDTH_LEAST` (syzygy-3efd.58).
  const nodeWidth = Math.min(NODE_WIDTH, Math.max(NODE_WIDTH_LEAST, STACK_COLUMN - gutter(laneCount.left) - gutter(laneCount.right)));
  const nodeX = gutter(laneCount.left);

  // Label slots: gap g sits above row g (g = order.length is the space under the last row).
  const slotHeight = spacing.edgeLines * 15 + 6 + LABEL_CLEARANCE + 1;
  const connected = new Set(ends.flatMap(end => [end.from, end.to]));
  // The note under a node with no edges takes the top of the gap below it.
  const noteAbove = Array.from({ length: order.length + 1 }, (_, g) => g > 0 && !connected.has(order[g - 1]!) ? noteHeight(nodeWidth) : 0);
  const slots = Array.from({ length: order.length + 1 }, () => 0);
  const slotOf = ends.map((end, e) => {
    const gap = back[e] ? position[end.to]! + 1 : position[end.to]!;
    return { gap, k: slots[gap]!++ };
  });
  const gapHeight = slots.map((count, g) => g === 0 ? 0
    : Math.max(g === order.length ? 0 : spacing.gapY, noteAbove[g]! + (count === 0 ? 0 : count * slotHeight + 2 * LABEL_CLEARANCE + 2)));
  const top: number[] = [];
  let next = MARGIN;
  for (let p = 0; p < order.length; p++) { next += gapHeight[p]!; top.push(next); next += NODE_HEIGHT; }
  const bottom = next + gapHeight[order.length]!;

  const laidNodes: LaidOutNode[] = nodes.map((node, i) => ({ id: node.id, layer: layer[i]!, row: row[i]!, x: nodeX, y: top[position[i]!]! }));
  const centre = nodeX + nodeWidth / 2;
  const laidEdges: LaidOutEdge[] = edges.map((edge, e) => {
    const from = laidNodes[ends[e]!.from]!, to = laidNodes[ends[e]!.to]!;
    const { gap, k } = slotOf[e]!;
    const gapTop = gap === 0 ? MARGIN : top[gap - 1]! + NODE_HEIGHT;
    const label = { labelX: centre, labelY: gapTop + noteAbove[gap]! + LABEL_CLEARANCE + 1 + (k + 0.5) * slotHeight };
    if (straight[e]) {
      const y1 = from.y + NODE_HEIGHT, y2 = to.y - 2, dy = (y2 - y1) / 2;
      return { id: edge.id, from: edge.from, to: edge.to, back: false, d: `M ${num(centre)} ${num(y1)} C ${num(centre)} ${num(y1 + dy)}, ${num(centre)} ${num(y2 - dy)}, ${num(centre)} ${num(y2)}`, ...label };
    }
    const left = side[e] === 'left';
    const x0 = left ? nodeX : nodeX + nodeWidth, x3 = left ? nodeX - 2 : nodeX + nodeWidth + 2;
    const y0 = from.y + (left ? LANE_EXIT : LANE_ENTRY), y3 = to.y + (left ? LANE_ENTRY : LANE_EXIT);
    // The curve's farthest point, at t = 1/2, lies three quarters of the way to the control x: put it on the lane.
    const reach = (lane[e]! + 1) * step / 0.75;
    const c = left ? x0 - reach : x0 + reach;
    return { id: edge.id, from: edge.from, to: edge.to, back: back[e]!, d: `M ${num(x0)} ${num(y0)} C ${num(c)} ${num(y0)}, ${num(c)} ${num(y3)}, ${num(x3)} ${num(y3)}`, ...label, lead: true };
  });
  return { width: nodeX + nodeWidth + gutter(laneCount.right), height: Math.ceil(bottom + MARGIN), nodeWidth, nodes: laidNodes, edges: laidEdges };
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
  return againstOwnLine(own, label) ? undefined : runFromEnds(leaderEnds(own, otherCurves, otherHeads), label, others);
}

/** Whether a label already sits against its own line, so a leader would say nothing more. */
function againstOwnLine(own: readonly Point[], label: LabelBox): boolean {
  const gap = (at: Point): number => Math.hypot(Math.max(label.left - at.x, 0, at.x - label.right), Math.max(label.top - at.y, 0, at.y - label.bottom));
  return own.some(at => gap(at) < LEADER_MIN_RUN);
}

/** The points of a line where a leader may end: where no other line runs and outside every other arrowhead. They do not depend on where the
 * label sits, so a label that tries several spots computes them once. */
function leaderEnds(own: readonly Point[], otherCurves: readonly (readonly Point[])[], otherHeads: readonly Triangle[]): readonly Point[] {
  return own.filter(at => otherCurves.every(curve => curve.every((a, i) => i === 0 || distanceToSegment(at, curve[i - 1]!, a) >= LEADER_SHARED))
    && otherHeads.every(head => distanceToTriangle(at, head) >= LEADER_SHARED));
}

function runFromEnds(ends: readonly Point[], label: LabelBox, others: readonly LabelBox[]): { readonly from: Point; readonly to: Point } | undefined {
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
  // A node's label wraps to 22 characters at the full width, fewer in a narrowed stacked node (8 px a character, 12 px padding a side).
  const nodeWidth = layout.nodeWidth, nodeChars = Math.min(22, Math.floor((nodeWidth - 24) / 8));
  const nodes = diagram.nodes.map((node, i) => {
    const at = layout.nodes[i]!;
    const lines = shown(node.label, node.epistemic, nodeChars, 2);
    const baseline = at.y + NODE_HEIGHT / 2 + 5 - (lines.length - 1) * 8;
    const noteX = num(at.x + nodeWidth / 2);
    const note = connected.has(node.id) ? '' : nodeWidth < NOTE_ONE_LINE
      ? `<text class="note" x="${noteX}" y="${num(at.y + NODE_HEIGHT + 18)}" text-anchor="middle"><tspan x="${noteX}" dy="0">No relationship</tspan><tspan x="${noteX}" dy="16">supplied</tspan></text>`
      : `<text class="note" x="${noteX}" y="${num(at.y + NODE_HEIGHT + 18)}" text-anchor="middle">No relationship supplied</text>`;
    return `<g class="node ${node.epistemic}"><title>${escape(node.label)} (${node.epistemic})</title><rect x="${num(at.x)}" y="${num(at.y)}" width="${nodeWidth}" height="${NODE_HEIGHT}" rx="6"/>${textLines(lines, at.x + nodeWidth / 2, baseline, 16)}${note}</g>`;
  }).join('');
  const edgeLines = diagram.edges.map(edge => shown(edge.label, edge.epistemic, spacing.edgeChars, spacing.edgeLines));
  const wanted = edgeLines.map((lines, i) => ({
    x: layout.edges[i]!.labelX, y: layout.edges[i]!.labelY, back: layout.edges[i]!.back,
    width: Math.max(...lines.map(line => [...line].length)) * spacing.charWidth + 12, height: lines.length * 15 + 6,
  }));
  const standing = diagram.nodes.map((node, i) => {
    const at = layout.nodes[i]!;
    return { left: at.x, top: at.y, right: at.x + nodeWidth, bottom: at.y + NODE_HEIGHT + (connected.has(node.id) ? 0 : noteHeight(nodeWidth)) };
  });
  const placed: { x: number; y: number }[] = [...(spacing.labelsOnTop ? placeEdgeLabels(wanted, standing, layout.width) : wanted)].map(({ x, y }) => ({ x, y }));
  const curves = spacing.labelsOnTop ? layout.edges.map(edge => curveSamples(edge.d)) : [];
  const heads = spacing.labelsOnTop ? layout.edges.map(edge => arrowheadOf(edge.d)) : [];
  const boxOf = (i: number): LabelBox => {
    const { width, height } = wanted[i]!, { x, y } = placed[i]!;
    return { left: x - width / 2, top: y - height / 2, right: x + width / 2, bottom: y + height / 2 };
  };
  // A label the search moved keeps a thin leader to its own line where one can be seen, in the line's layer: without one, it can read as
  // another line's label. So does a stacked lane edge's label, which sits in the column, away from its line (`lead`).
  const moved = (i: number): boolean => placed[i]!.x !== layout.edges[i]!.labelX || placed[i]!.y !== layout.edges[i]!.labelY || layout.edges[i]!.lead === true;
  const endsCache = new Map<number, readonly Point[]>();
  const endsOf = (i: number): readonly Point[] => {
    let ends = endsCache.get(i);
    if (ends === undefined) {
      ends = leaderEnds(curves[i]!, curves.filter((_, j) => layout.edges[j]!.d !== layout.edges[i]!.d), heads.filter((_, j) => layout.edges[j]!.d !== layout.edges[i]!.d));
      endsCache.set(i, ends);
    }
    return ends;
  };
  const runOf = (i: number) => (moved(i) && !againstOwnLine(curves[i]!, boxOf(i))
    ? runFromEnds(endsOf(i), boxOf(i), [...standing, ...wanted.flatMap((_, j) => j === i ? [] : [boxOf(j)])])
    : undefined);
  const runs = layout.edges.map((_, i) => runOf(i));
  // A lane edge's label with no clear leader where it sits slides across its own gap, a step at a time and nearer first, to the first spot
  // that clears every node, label and other leader and gives it one; it never leaves its gap, so no row moves (syzygy-3efd.58). A leader
  // depends on other labels only through the boxes it must not enter, so a slide that enters no other leader keeps every other leader. A label
  // already against its own line needs none and stays. A second pass retries the labels still without one, since a slide may clear a way.
  const slide = (at: LaidOutEdge, i: number): boolean => {
    if (at.lead !== true || !spacing.labelsOnTop || runs[i] !== undefined || againstOwnLine(curves[i]!, boxOf(i))) return false;
    const home = placed[i]!, { width, height } = wanted[i]!;
    const others = [...standing, ...wanted.flatMap((_, j) => j === i ? [] : [boxOf(j)])];
    for (let k = 1; (k - 1) * LABEL_STEP < layout.width; k++) {
      for (const dx of [k * LABEL_STEP, -k * LABEL_STEP]) {
        const box = { left: home.x + dx - width / 2, top: home.y - height / 2, right: home.x + dx + width / 2, bottom: home.y + height / 2 };
        if (box.left < 0 || box.right > layout.width
          || others.some(o => box.left < o.right + LABEL_CLEARANCE && o.left < box.right + LABEL_CLEARANCE && box.top < o.bottom + LABEL_CLEARANCE && o.top < box.bottom + LABEL_CLEARANCE)
          || runs.some((run, j) => j !== i && run !== undefined && segmentEntersBox(run.from.x, run.from.y, run.to.x, run.to.y, box))) continue;
        placed[i] = { x: home.x + dx, y: home.y };
        runs[i] = runOf(i);
        if (runs[i] !== undefined) return true;
      }
    }
    placed[i] = home;
    return false;
  };
  for (let pass = 0; pass < 2; pass++) if (!layout.edges.map((at, i) => slide(at, i)).some(Boolean)) break;
  const edges = diagram.edges.map((edge, i) => {
    const at = layout.edges[i]!, lines = edgeLines[i]!, { x, y, width, height } = { ...wanted[i]!, ...placed[i]! };
    const top = y - height / 2;
    const run = runs[i];
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
