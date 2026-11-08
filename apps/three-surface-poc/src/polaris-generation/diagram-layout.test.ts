import { describe, expect, it } from 'vitest';
import { READABLE_SPACING, arrowheadOf, distanceToTriangle, layoutDiagram, leaderRun, placeEdgeLabels, renderDiagramSvg, wrapLabel } from './diagram-layout.js';
import { assertInertSvg } from './svg-inert.js';

const nodes = (...ids: string[]) => ids.map(id => ({ id }));
const edge = (id: string, from: string, to: string) => ({ id, from, to });
const place = (layout: ReturnType<typeof layoutDiagram>) => layout.nodes.map(({ id, layer, row, x, y }) => [id, layer, row, x, y]);

describe('layered left-to-right diagram layout', () => {
  it('lays a chain out one layer per node with horizontal cubic edges', () => {
    const layout = layoutDiagram(nodes('a', 'b', 'c'), [edge('ab', 'a', 'b'), edge('bc', 'b', 'c')]);
    expect(place(layout)).toEqual([['a', 0, 0, 24, 24], ['b', 1, 0, 344, 24], ['c', 2, 0, 664, 24]]);
    expect(layout.edges.map(e => [e.id, e.back, e.d, e.labelX, e.labelY])).toEqual([
      ['ab', false, 'M 224 52 C 283 52, 283 52, 342 52', 283, 52],
      ['bc', false, 'M 544 52 C 603 52, 603 52, 662 52', 603, 52],
    ]);
    expect([layout.width, layout.height]).toEqual([888, 128]);
  });

  it('fans out into one centred layer, keeping input order', () => {
    const layout = layoutDiagram(nodes('hub', 'x', 'y', 'z'), [edge('hx', 'hub', 'x'), edge('hy', 'hub', 'y'), edge('hz', 'hub', 'z')]);
    expect(place(layout)).toEqual([['hub', 0, 0, 24, 120], ['x', 1, 0, 344, 24], ['y', 1, 1, 344, 120], ['z', 1, 2, 344, 216]]);
    expect(layout.edges.map(e => e.d)).toEqual([
      'M 224 148 C 283 148, 283 52, 342 52',
      'M 224 148 C 283 148, 283 148, 342 148',
      'M 224 148 C 283 148, 283 244, 342 244',
    ]);
    expect([layout.width, layout.height]).toEqual([568, 320]);
  });

  it('takes the longest path, so a skip edge never pulls a node leftwards', () => {
    const layout = layoutDiagram(nodes('a', 'b', 'c'), [edge('ac', 'a', 'c'), edge('ab', 'a', 'b'), edge('bc', 'b', 'c')]);
    expect(layout.nodes.map(n => [n.id, n.layer])).toEqual([['a', 0], ['b', 1], ['c', 2]]);
  });

  it('breaks a cycle at the DFS back edge and draws it as a curve below the layers', () => {
    const layout = layoutDiagram(nodes('a', 'b', 'c'), [edge('ab', 'a', 'b'), edge('bc', 'b', 'c'), edge('ca', 'c', 'a')]);
    expect(place(layout)).toEqual([['a', 0, 0, 24, 24], ['b', 1, 0, 344, 24], ['c', 2, 0, 664, 24]]);
    expect(layout.edges.map(e => [e.id, e.back])).toEqual([['ab', false], ['bc', false], ['ca', true]]);
    expect(layout.edges[2]!.d).toBe('M 764 80 C 764 120, 124 120, 124 82');
    expect(layout.height).toBe(144);
  });

  it('draws a self-loop and a second back edge lower than the first', () => {
    const layout = layoutDiagram(nodes('a', 'b'), [edge('ab', 'a', 'b'), edge('bb', 'b', 'b'), edge('ba', 'b', 'a')]);
    expect(layout.edges.map(e => [e.id, e.back, e.d])).toEqual([
      ['ab', false, 'M 224 52 C 283 52, 283 52, 342 52'],
      ['bb', true, 'M 474 80 C 474 120, 414 120, 414 82'],
      ['ba', true, 'M 444 80 C 444 150, 124 150, 124 82'],
    ]);
    expect(layout.height).toBe(174);
  });

  it('is deterministic and refuses dangling endpoints and duplicate nodes', () => {
    const input = [nodes('a', 'b', 'c', 'd'), [edge('ab', 'a', 'b'), edge('cd', 'c', 'd'), edge('da', 'd', 'a')]] as const;
    expect(layoutDiagram(...input)).toEqual(layoutDiagram(structuredClone(input[0]), structuredClone(input[1])));
    expect(() => layoutDiagram(nodes('a'), [edge('ax', 'a', 'x')])).toThrow('unknown-node');
    expect(() => layoutDiagram(nodes('a', 'a'), [])).toThrow('duplicate-node');
    expect(() => layoutDiagram([], [])).toThrow('empty-diagram');
  });

  it('readable spacing continues a long chain on a lower band, its hand-off in the gap between the bands', () => {
    const layout = layoutDiagram(nodes('a', 'b', 'c', 'd', 'e'), [edge('ab', 'a', 'b'), edge('bc', 'b', 'c'), edge('cd', 'c', 'd'), edge('de', 'd', 'e')], READABLE_SPACING);
    expect(place(layout)).toEqual([['a', 0, 0, 24, 24], ['b', 1, 0, 424, 24], ['c', 2, 0, 824, 24], ['d', 3, 0, 24, 168], ['e', 4, 0, 424, 168]]);
    expect(layout.edges.map(e => [e.id, e.d, e.labelX, e.labelY])).toEqual([
      ['ab', 'M 224 52 C 323 52, 323 52, 422 52', 323, 52],
      ['bc', 'M 624 52 C 723 52, 723 52, 822 52', 723, 52],
      ['cd', 'M 924 80 C 924 123, 124 123, 124 166', 524, 123],
      ['de', 'M 224 196 C 323 196, 323 196, 422 196', 323, 196],
    ]);
    expect([layout.width, layout.height]).toEqual([1048, 280]);
  });

  it('the widest readable edge label fits its gap, draws over the nodes and stays inert', () => {
    const label = 'twenty-two characters plus more than fit in three lines of this width, which ends in an ellipsis';
    const svg = renderDiagramSvg({ nodes: [{ id: 'a', label: 'A', epistemic: 'inferred' }, { id: 'b', label: 'B', epistemic: 'inferred' }], edges: [{ id: 'ab', from: 'a', to: 'b', label, epistemic: 'inferred' }] }, 0, text => text, READABLE_SPACING);
    assertInertSvg(svg);
    const box = /<rect class="edge-label" x="([\d.]+)" y="[\d.]+" width="([\d.]+)"/u.exec(svg)!;
    const [left, width] = [Number(box[1]), Number(box[2])];
    expect(left).toBeGreaterThanOrEqual(224);
    expect(left + width).toBeLessThanOrEqual(422);
    expect(svg.indexOf('<g class="edge-text')).toBeGreaterThan(svg.indexOf('<g class="node'));
    expect(svg.match(/<tspan/gu)!.length).toBe(1 + 1 + 3);
  });

  describe('readable spacing keeps every edge label off every node', () => {
    const chainOf = (n: number) => Array.from({ length: n }, (_, i) => `n${i}`);
    const steps = (ids: string[]) => ids.slice(1).map((id, i) => edge(`${ids[i]}-${id}`, ids[i]!, id));
    const SHAPES: Record<string, { nodes: string[]; edges: ReturnType<typeof edge>[]; bands: number }> = {
      'plain chain': { nodes: chainOf(7), edges: steps(chainOf(7)), bands: 3 },
      'chain with a loop back': { nodes: chainOf(5), edges: [...steps(chainOf(5)), edge('n2-n0', 'n2', 'n0')], bands: 1 },
      'chain with two loops': { nodes: chainOf(5), edges: [...steps(chainOf(5)), edge('n3-n0', 'n3', 'n0'), edge('n4-n1', 'n4', 'n1')], bands: 1 },
      'chain with a skip': { nodes: chainOf(7), edges: [...steps(chainOf(7)), edge('n0-n6', 'n0', 'n6')], bands: 1 },
      'fan across a band break': { nodes: ['a', 'b', 'c', 'd1', 'd2', 'd3'], edges: [edge('ab', 'a', 'b'), edge('bc', 'b', 'c'), edge('cd1', 'c', 'd1'), edge('cd2', 'c', 'd2'), edge('cd3', 'c', 'd3')], bands: 1 },
      'loop over a tall middle layer': { nodes: ['a', 'm1', 'm2', 'm3', 'x'], edges: [edge('am1', 'a', 'm1'), edge('am2', 'a', 'm2'), edge('am3', 'a', 'm3'), edge('m1x', 'm1', 'x'), edge('m2x', 'm2', 'x'), edge('m3x', 'm3', 'x'), edge('xa', 'x', 'a')], bands: 1 },
      'tall column before a band break': { nodes: ['a', 'm1', 'm2', 'm3', 'x', 'y', 'z'], edges: [edge('am1', 'a', 'm1'), edge('am2', 'a', 'm2'), edge('am3', 'a', 'm3'), edge('m1x', 'm1', 'x'), edge('m2x', 'm2', 'x'), edge('m3x', 'm3', 'x'), edge('xy', 'x', 'y'), edge('yz', 'y', 'z')], bands: 1 },
      'fan inside one band': { nodes: ['hub', 'x', 'y', 'z'], edges: [edge('hx', 'hub', 'x'), edge('hy', 'hub', 'y'), edge('hz', 'hub', 'z')], bands: 1 },
      'two skips from one node': { nodes: ['a', 'b', 'c', 'd'], edges: [edge('ab', 'a', 'b'), edge('bc', 'b', 'c'), edge('cd', 'c', 'd'), edge('ac', 'a', 'c'), edge('ad', 'a', 'd')], bands: 1 },
      'fan plus a skip': { nodes: ['hub', 'x', 'y', 'z', 'end'], edges: [edge('hx', 'hub', 'x'), edge('hy', 'hub', 'y'), edge('hz', 'hub', 'z'), edge('xe', 'x', 'end'), edge('he', 'hub', 'end')], bands: 1 },
      'crossing edges': { nodes: ['a', 'b', 'x', 'y'], edges: [edge('ax', 'a', 'x'), edge('ay', 'a', 'y'), edge('bx', 'b', 'x'), edge('by', 'b', 'y')], bands: 1 },
      'parallel edges': { nodes: ['a', 'b'], edges: [edge('ab1', 'a', 'b'), edge('ab2', 'a', 'b'), edge('ab3', 'a', 'b')], bands: 1 },
      'parallel edges across a band break': { nodes: ['a', 'b', 'c', 'd'], edges: [edge('ab', 'a', 'b'), edge('bc', 'b', 'c'), edge('cd1', 'c', 'd'), edge('cd2', 'c', 'd')], bands: 2 },
    };
    const LONG = 'twenty-two characters plus more than fit in three lines of this width, which ends in an ellipsis';
    for (const [name, shape] of Object.entries(SHAPES)) {
      it(name, () => {
        const render = { nodes: shape.nodes.map(id => ({ id, label: id, epistemic: 'inferred' as const })), edges: shape.edges.map(e => ({ ...e, label: LONG, epistemic: 'inferred' as const })) };
        const svg = renderDiagramSvg(render, 0, text => text, READABLE_SPACING);
        const layout = layoutDiagram(shape.nodes.map(id => ({ id })), shape.edges, READABLE_SPACING);
        expect(new Set(layout.nodes.map(n => n.y - (n.y % 144))).size >= shape.bands, 'band count').toBe(true);
        if (shape.bands === 1) expect(layout.nodes.filter(n => n.layer > 0).every(n => n.x > 24), 'one band').toBe(true);
        const nodes = layout.nodes.map(n => ({ left: n.x, right: n.x + 200, top: n.y, bottom: n.y + 56 }));
        const labels = [...svg.matchAll(/<rect class="edge-label" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/gu)].map(m => ({ left: Number(m[1]), top: Number(m[2]), right: Number(m[1]) + Number(m[3]), bottom: Number(m[2]) + Number(m[4]) }));
        expect(labels).toHaveLength(shape.edges.length);
        const hits = labels.filter(l => nodes.some(n => l.left < n.right && n.left < l.right && l.top < n.bottom && n.top < l.bottom));
        expect(hits).toEqual([]);
        const overprinted = labels.filter((l, i) => labels.some((o, j) => j > i && l.left < o.right && o.left < l.right && l.top < o.bottom && o.top < l.bottom));
        expect(overprinted).toEqual([]);
        // Lines behind the nodes, labels above them.
        expect(svg.lastIndexOf('<path d="M')).toBeLessThan(svg.indexOf('<g class="node'));
        expect(svg.lastIndexOf('<g class="node')).toBeLessThan(svg.indexOf('<g class="edge-text'));
        const canvasHeight = Number(/ height="(\d+)"/u.exec(svg)![1]);
        expect(canvasHeight).toBeGreaterThanOrEqual(layout.height);
        for (const l of labels) expect(l.bottom).toBeLessThanOrEqual(canvasHeight);
      });
    }

    const placedLabels = (svg: string) => [...svg.matchAll(/<rect class="edge-label" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/gu)]
      .map(m => ({ left: Number(m[1]), top: Number(m[2]), right: Number(m[1]) + Number(m[3]), bottom: Number(m[2]) + Number(m[4]) }));
    const renderOf = (nodes: readonly string[], edges: readonly { id: string; from: string; to: string }[], label: string, lonely = false) => ({
      nodes: [...nodes, ...(lonely ? ['lonely'] : [])].map(id => ({ id, label: id, epistemic: 'inferred' as const })),
      edges: edges.map(e => ({ ...e, label, epistemic: 'inferred' as const })),
    });

    it('holds over dense random graphs: no label on a node, on another label, or off the canvas', () => {
      let seed = 20261107;
      const next = (bound: number): number => { seed = (seed * 1103515245 + 12345) % 2147483648; return Math.floor(seed / 65536) % bound; };
      let grown = 0;
      for (let graph = 0; graph < 400; graph++) {
        const ids = Array.from({ length: 2 + next(9) }, (_, i) => `n${i}`);
        const edges = Array.from({ length: 1 + next(ids.length * 2) }, (_, i) => ({ id: `e${i}`, from: ids[next(ids.length)]!, to: ids[next(ids.length)]! }));
        const svg = renderDiagramSvg(renderOf(ids, edges, LONG), graph, text => text, READABLE_SPACING);
        assertInertSvg(svg);
        const layout = layoutDiagram(ids.map(id => ({ id })), edges, READABLE_SPACING);
        const nodes = layout.nodes.map(n => ({ left: n.x, right: n.x + 200, top: n.y, bottom: n.y + 56 }));
        const labels = placedLabels(svg);
        const canvasHeight = Number(/ height="(\d+)"/u.exec(svg)![1]);
        expect(labels.filter(l => nodes.some(n => l.left < n.right && n.left < l.right && l.top < n.bottom && n.top < l.bottom)), `graph ${graph} on a node`).toEqual([]);
        // Touching counts as overprinted: a gap of 4 less the renderer's rounding to a tenth.
        expect(labels.filter((l, i) => labels.some((o, j) => j > i && l.left < o.right + 3.8 && o.left < l.right + 3.8 && l.top < o.bottom + 3.8 && o.top < l.bottom + 3.8)), `graph ${graph} overprinted`).toEqual([]);
        expect(labels.filter(l => l.left < 0 || l.right > layout.width || l.top < 0 || l.bottom > canvasHeight), `graph ${graph} off the canvas`).toEqual([]);
        if (canvasHeight > layout.height) grown++;
      }
      // The population reaches the pass: some graphs had to grow the canvas.
      expect(grown).toBeGreaterThan(0);
    });

    it('searches on an eight-pixel step, up before down, straight before diagonal before sideways at one count of steps, right before left', () => {
      const place1 = (label: { x: number; y: number; width: number; height: number }, walls: readonly { left: number; top: number; right: number; bottom: number }[]) =>
        placeEdgeLabels([{ ...label, back: false }], walls, 400);
      const wide = { x: 100, y: 100, width: 60, height: 20 };
      const pebble = { left: 90, top: 95, right: 110, bottom: 105 };
      expect(place1(wide, [pebble])).toEqual([{ x: 100, y: 76 }]);
      expect(place1(wide, [pebble, { left: 90, top: 40, right: 110, bottom: 80 }])).toEqual([{ x: 100, y: 124 }]);
      // Clear needs 9 px up, which only a step of 8 meets at 16.
      expect(place1(wide, [{ left: 95, top: 105, right: 105, bottom: 150 }])).toEqual([{ x: 100, y: 84 }]);
      // A small label clears a small pebble at the same count of steps straight up and straight across: up wins.
      const small = { x: 100, y: 100, width: 10, height: 10 };
      expect(place1(small, [{ left: 95, top: 95, right: 105, bottom: 105 }])).toEqual([{ x: 100, y: 84 }]);
      // A wall top to bottom leaves only sideways: right, the first of the two.
      expect(place1(small, [{ left: 95, top: 0, right: 105, bottom: 400 }])).toEqual([{ x: 116, y: 100 }]);
      // A wall and a bar leave only a diagonal.
      expect(place1({ x: 200, y: 200, width: 10, height: 10 }, [{ left: 180, top: 0, right: 220, bottom: 400 }, { left: 0, top: 180, right: 400, bottom: 220 }])).toEqual([{ x: 232, y: 168 }]);
    });

    const leadersIn = (svg: string) => [...svg.split('<g class="edge ').slice(1).entries()].map(([i, group]) => {
      const body = group.split('</g>')[0]!;
      const leader = /<path class="edge-leader" d="M ([\d.]+) ([\d.]+) L ([\d.]+) ([\d.]+)"/u.exec(body);
      return { i, curve: /<path d="(M [^"]+)" marker-end/u.exec(body)![1]!, leader: leader === null ? undefined : leader.slice(1).map(Number) as [number, number, number, number] };
    });
    const curvePoints = (d: string, pieces = 2000) => {
      const [x0, y0, x1, y1, x2, y2, x3, y3] = [...d.matchAll(/-?[\d.]+/gu)].map(m => Number(m[0])) as [number, number, number, number, number, number, number, number];
      return Array.from({ length: pieces + 1 }, (_, i) => {
        const t = i / pieces, u = 1 - t;
        return { x: u ** 3 * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t ** 3 * x3, y: u ** 3 * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t ** 3 * y3 };
      });
    };

    it('runs each leader from its own label to its own line, in plain sight of every other label and node', () => {
      let seed = 20261108, leaders = 0, sideways = 0, direct = 0, offCorner = 0, onSide = 0, offHalves = 0, ownHead = 0;
      const next = (bound: number): number => { seed = (seed * 1103515245 + 12345) % 2147483648; return Math.floor(seed / 65536) % bound; };
      for (let graph = 0; graph < 300; graph++) {
        const ids = Array.from({ length: 3 + next(8) }, (_, i) => `n${i}`);
        const edges = Array.from({ length: 2 + next(ids.length * 2) }, (_, i) => ({ id: `e${i}`, from: ids[next(ids.length)]!, to: ids[next(ids.length)]! }));
        const svg = renderDiagramSvg(renderOf(ids, edges, graph % 2 === 0 ? 'carries the request onward' : 'sends'), graph, text => text, READABLE_SPACING);
        const layout = layoutDiagram(ids.map(id => ({ id })), edges, READABLE_SPACING);
        const labels = placedLabels(svg);
        const blocks = [...labels, ...layout.nodes.map(n => ({ left: n.x, right: n.x + 200, top: n.y, bottom: n.y + 56 }))];
        const curvesIn = leadersIn(svg).map(group => group.curve);
        // Another line as the layout sees it: 64 straight pieces (a literal; the code's LEADER_SAMPLES).
        const sampled = new Map(curvesIn.map(d => [d, curvePoints(d, 64)]));
        const pointsOf = (d: string) => sampled.get(d)!;
        for (const { i, curve, leader } of leadersIn(svg)) {
          const own = labels[i]!;
          const natural = layout.edges[i]!;
          const centerX = (own.left + own.right) / 2, centerY = (own.top + own.bottom) / 2;
          if (leader !== undefined && Math.abs(centerY - natural.labelY) < 0.11) sideways++;
          const stayed = Math.abs(centerX - natural.labelX) < 0.11 && Math.abs(centerY - natural.labelY) < 0.11;
          if (leader === undefined) continue;
          leaders++;
          expect(stayed, `graph ${graph} edge ${i}: a leader on a label left in place`).toBe(false);
          const [fromX, fromY, toX, toY] = leader;
          // It starts on its own label's edge.
          const offEdge = Math.min(Math.abs(fromX - own.left), Math.abs(fromX - own.right), Math.abs(fromY - own.top), Math.abs(fromY - own.bottom));
          expect(offEdge, `graph ${graph} edge ${i} start`).toBeLessThan(0.2);
          expect(fromX >= own.left - 0.2 && fromX <= own.right + 0.2 && fromY >= own.top - 0.2 && fromY <= own.bottom + 0.2, `graph ${graph} edge ${i} start on its box`).toBe(true);
          // Where along its side it starts, as a fraction: the search tries 17 points down every side, not only the corners or halves.
          const atSide = (Math.abs(fromX - own.left) < 0.2 || Math.abs(fromX - own.right) < 0.2) && fromY > own.top + 0.2 && fromY < own.bottom - 0.2;
          const along = atSide ? (fromY - own.top) / (own.bottom - own.top) : (fromX - own.left) / (own.right - own.left);
          if (atSide) onSide++;
          if (along > 0.02 && along < 0.98) offCorner++;
          if ([0, 0.5, 1].every(half => Math.abs(along - half) > 0.02)) offHalves++;
          // No different line runs within 1.5 px of its end (1.4 here: the drawing rounds to a tenth), measured to each of that line's 64 straight
          // pieces, not only their ends.
          const toSegment = (a: { x: number; y: number }, b: { x: number; y: number }): number => {
            const dx = b.x - a.x, dy = b.y - a.y, length = dx * dx + dy * dy;
            const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((toX - a.x) * dx + (toY - a.y) * dy) / length));
            return Math.hypot(a.x + t * dx - toX, a.y + t * dy - toY);
          };
          for (const other of curvesIn) {
            if (other === curve) continue;
            const points = pointsOf(other);
            expect(Math.min(...points.slice(1).map((at, k) => toSegment(points[k]!, at))), `graph ${graph} edge ${i} ends on another line`).toBeGreaterThanOrEqual(1.4);
          }
          // Nor inside, or within 1.4 px of, another line's arrowhead: the marker's triangle, 16 px long and wide on a stroke of 2, its tip
          // 1.6 px past the line's end, pointing from the last control point that differs from the end.
          const toHead = (d: string): number => {
            const c = [...d.matchAll(/-?[\d.]+/gu)].map(m => Number(m[0]));
            const [ex, ey] = [c[6]!, c[7]!];
            const [bx, by] = c[4] !== ex || c[5] !== ey ? [c[4]!, c[5]!] : c[2] !== ex || c[3] !== ey ? [c[2]!, c[3]!] : [c[0]!, c[1]!];
            const n = Math.hypot(ex - bx, ey - by), ux = (ex - bx) / n, uy = (ey - by) / n;
            const corner = (along: number, across: number) => ({ x: ex + (ux * along - uy * across) * 1.6, y: ey + (uy * along + ux * across) * 1.6 });
            const head = [corner(1, 0), corner(-9, -5), corner(-9, 5)] as const;
            const cross = (a: { x: number; y: number }, b: { x: number; y: number }) => (b.x - a.x) * (toY - a.y) - (b.y - a.y) * (toX - a.x);
            const signs = [cross(head[0], head[1]), cross(head[1], head[2]), cross(head[2], head[0])];
            return signs.every(v => v >= 0) || signs.every(v => v <= 0) ? 0 : Math.min(toSegment(head[0], head[1]), toSegment(head[1], head[2]), toSegment(head[2], head[0]));
          };
          for (const other of curvesIn) {
            if (other !== curve) expect(toHead(other), `graph ${graph} edge ${i} ends in another line's arrowhead`).toBeGreaterThanOrEqual(1.4);
          }
          // Its own arrowhead is no other line's, so a leader may end there.
          if (toHead(curve) < 1.5) ownHead++;
          // Its end is on this edge's own curve.
          const onOwn = Math.min(...curvePoints(curve).map(at => Math.hypot(at.x - toX, at.y - toY)));
          expect(onOwn, `graph ${graph} edge ${i} end`).toBeLessThan(1);
          // A label against its own line needs none.
          const clearance = Math.min(...curvePoints(curve).map(at => Math.hypot(Math.max(own.left - at.x, 0, at.x - own.right), Math.max(own.top - at.y, 0, at.y - own.bottom))));
          expect(clearance, `graph ${graph} edge ${i} against its line`).toBeGreaterThan(5);
          // It is the shortest run to its end: where the straight run from the nearest point of its box is clear, the leader is no longer
          // than that run plus half the spacing of 16 starting points along the box's longer side.
          const nearX = Math.max(own.left, Math.min(toX, own.right)), nearY = Math.max(own.top, Math.min(toY, own.bottom));
          const clear = blocks.every((block, b) => b === i || Array.from({ length: 41 }, (_, step) => step / 40).every(t => {
            const x = nearX + (toX - nearX) * t, y = nearY + (toY - nearY) * t;
            return !(x > block.left + 0.2 && x < block.right - 0.2 && y > block.top + 0.2 && y < block.bottom - 0.2);
          }));
          if (clear) {
            direct++;
            const spacing = Math.max(own.right - own.left, own.bottom - own.top) / 16;
            expect(Math.hypot(toX - fromX, toY - fromY), `graph ${graph} edge ${i} shortest`).toBeLessThanOrEqual(Math.hypot(toX - nearX, toY - nearY) + spacing / 2 + 0.3);
          }
          for (const [b, block] of blocks.entries()) {
            if (b === i) continue;
            for (let step = 0; step <= 40; step++) {
              const x = fromX + (toX - fromX) * step / 40, y = fromY + (toY - fromY) * step / 40;
              expect(x > block.left + 0.2 && x < block.right - 0.2 && y > block.top + 0.2 && y < block.bottom - 0.2, `graph ${graph} edge ${i} runs under block ${b}`).toBe(false);
            }
          }
        }
      }
      expect(leaders).toBeGreaterThan(20);
      expect(direct, 'leaders whose shortest run is checked').toBeGreaterThan(10);
      expect(sideways, 'a label moved only sideways keeps its leader').toBeGreaterThan(0);
      expect(offCorner, 'leaders starting between a side\'s corners').toBeGreaterThan(0);
      expect(onSide, 'leaders starting on a label\'s left or right side').toBeGreaterThan(0);
      expect(offHalves, 'leaders starting off a side\'s corners and middle').toBeGreaterThan(0);
      expect(ownHead, 'leaders ending in their own line\'s arrowhead').toBeGreaterThan(0);
    });

    it('runs a leader the shortest way from its label\'s edge to a point of its own line that no other line runs through', () => {
      // `a` fans to `b` and `c`; the second parallel edge's label is pushed clear of the first's. Its leader's ends are literals.
      const fan = [edge('ab', 'a', 'b'), edge('ab2', 'a', 'b'), edge('ac', 'a', 'c')];
      const svg = renderDiagramSvg(renderOf(['a', 'b', 'c'], fan, 'to'), 0, text => text, READABLE_SPACING);
      const groups = leadersIn(svg);
      expect(groups[0]!.leader).toBeUndefined();
      expect(groups[1]!.leader).toEqual([336.9, 60.5, 341.9, 71]);
    });

    it('ends a leader clear of a back edge as of any other line', () => {
      // A random graph (seed 77, graph 1186) where a moved label's nearest end of its own line lies where a back edge's line runs.
      const pairs = [['n3', 'n4'], ['n7', 'n1'], ['n6', 'n7'], ['n1', 'n6'], ['n9', 'n7'], ['n1', 'n2'], ['n4', 'n6'], ['n9', 'n8'], ['n9', 'n6'], ['n3', 'n5']] as const;
      const edges = pairs.map(([from, to], i) => edge(`e${i}`, from, to));
      const ids = Array.from({ length: 10 }, (_, i) => `n${i}`);
      const layout = layoutDiagram(ids.map(id => ({ id })), edges, READABLE_SPACING);
      expect(layout.edges.some(e => e.back), 'the graph has a back edge').toBe(true);
      const groups = leadersIn(renderDiagramSvg(renderOf(ids, edges, 'a long label that wraps twice over'), 1186, text => text, READABLE_SPACING));
      const lines = groups.map(group => curvePoints(group.curve, 64));
      const ends = groups.flatMap(({ i, leader }) => leader === undefined ? [] : [{ i, x: leader[2], y: leader[3] }]);
      expect(ends.length).toBeGreaterThan(0);
      for (const end of ends) {
        for (const [j, points] of lines.entries()) {
          if (j === end.i) continue;
          // 1.4, not the layout's 1.5: the drawing rounds the line and the end to a tenth.
          const near = Math.min(...points.slice(1).map((b, k) => {
            const a = points[k]!, dx = b.x - a.x, dy = b.y - a.y, length = dx * dx + dy * dy;
            const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((end.x - a.x) * dx + (end.y - a.y) * dy) / length));
            return Math.hypot(a.x + t * dx - end.x, a.y + t * dy - end.y);
          }));
          expect(near, `edge ${end.i} ends on edge ${j}${layout.edges[j]!.back ? ' (a back edge)' : ''}`).toBeGreaterThanOrEqual(1.4);
        }
      }
    });

    it('models an arrowhead as drawn: 16 px long and wide on a stroke of 2, tip 1.6 px past the end, along the end tangent', () => {
      const close = (tri: readonly { x: number; y: number }[]) => tri.map(p => [Math.round(p.x * 100) / 100, Math.round(p.y * 100) / 100]);
      expect(close(arrowheadOf('M 0 0 C 10 0 20 0 100 0'))).toEqual([[101.6, 0], [85.6, -8], [85.6, 8]]);
      // The tangent runs from the last control point that differs from the end: here the second, (90, 0), not the start.
      expect(close(arrowheadOf('M 0 100 C 50 100 90 0 100 0'))).toEqual([[101.6, 0], [85.6, -8], [85.6, 8]]);
      // With the third control point on the end, from the second: (0, 50) towards (100, 0).
      const slant = close(arrowheadOf('M 0 0 C 0 50 100 0 100 0'));
      expect(slant[0]).toEqual([101.43, -0.72]);
    });

    it('measures a point to a triangle as 0 inside, whichever way the triangle winds, and to its nearest side outside', () => {
      const clockwise = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 }] as const;
      const counter = [{ x: 0, y: 0 }, { x: 0, y: 10 }, { x: 10, y: 0 }] as const;
      expect(distanceToTriangle({ x: 2, y: 2 }, clockwise)).toBe(0);
      expect(distanceToTriangle({ x: 2, y: 2 }, counter)).toBe(0);
      expect(distanceToTriangle({ x: 2, y: -1 }, counter)).toBe(1);
    });

    it('ends a leader 1.5 px or more from another line\'s arrowhead, not only outside it', () => {
      // A label left of a vertical line; the line's nearest point, (50, 50), sits 1 px outside another line's arrowhead, so the leader ends
      // at the next nearest, (50, 40).
      const own = Array.from({ length: 11 }, (_, k) => ({ x: 50, y: k * 10 }));
      const label = { left: 0, top: 45, right: 30, bottom: 55 };
      const head = [{ x: 51, y: 45 }, { x: 61, y: 45 }, { x: 51, y: 55 }] as const;
      expect(leaderRun(own, label, [], [], [])!.to).toEqual({ x: 50, y: 50 });
      expect(leaderRun(own, label, [], [], [head])!.to).toEqual({ x: 50, y: 40 });
    });

    it('draws no leader on the provider form, or where no label moved', () => {
      const parallel = [edge('ab1', 'a', 'b'), edge('ab2', 'a', 'b')];
      expect(renderDiagramSvg(renderOf(['a', 'b'], parallel, LONG), 0, text => text)).not.toContain('edge-leader');
      expect(renderDiagramSvg(renderOf(['a', 'b', 'c'], [edge('ab', 'a', 'b'), edge('bc', 'b', 'c')], LONG), 0, text => text, READABLE_SPACING)).not.toContain('edge-leader');
    });

    it('leaves a label that is already clear where its edge puts it', () => {
      const edges = [edge('ab', 'a', 'b'), edge('bc', 'b', 'c')];
      const layout = layoutDiagram(['a', 'b', 'c'].map(id => ({ id })), edges, READABLE_SPACING);
      const labels = placedLabels(renderDiagramSvg(renderOf(['a', 'b', 'c'], edges, LONG), 0, text => text, READABLE_SPACING));
      labels.forEach((l, i) => {
        expect((l.left + l.right) / 2).toBeCloseTo(layout.edges[i]!.labelX, 0);
        expect((l.top + l.bottom) / 2).toBeCloseTo(layout.edges[i]!.labelY, 0);
      });
    });

    it('keeps a back edge\'s label in its lane', () => {
      const edges = [edge('ab', 'a', 'b'), edge('ab2', 'a', 'b'), edge('ba', 'b', 'a')];
      const layout = layoutDiagram(['a', 'b'].map(id => ({ id })), edges, READABLE_SPACING);
      const labels = placedLabels(renderDiagramSvg(renderOf(['a', 'b'], edges, LONG), 0, text => text, READABLE_SPACING));
      expect((labels[2]!.top + labels[2]!.bottom) / 2).toBeCloseTo(layout.edges[2]!.labelY, 0);
    });

    it('moves a label off an unconnected node\'s note', () => {
      // The loop's lane starts right under the bottom row, where the note under the node below `a` sits.
      const noted = renderDiagramSvg(renderOf(['a'], [edge('aa', 'a', 'a')], LONG, true), 0, text => text, READABLE_SPACING);
      const noteAt = /<text class="note" x="([\d.]+)" y="([\d.]+)"/u.exec(noted)!;
      const note = { left: Number(noteAt[1]) - 80, right: Number(noteAt[1]) + 80, top: Number(noteAt[2]) - 14, bottom: Number(noteAt[2]) + 4 };
      expect(placedLabels(noted).filter(l => l.left < note.right && note.left < l.right && l.top < note.bottom && note.top < l.bottom)).toEqual([]);
    });

    it('never searches off the canvas across, and the provider form never moves a label', () => {
      // The nearest clear spot lies past the canvas's edge, nearer than any on the canvas.
      const [fromLeft] = placeEdgeLabels([{ x: 40, y: 200, width: 60, height: 20, back: false }], [{ left: 30, top: 0, right: 76, bottom: 400 }], 300);
      expect(fromLeft!.x - 30).toBeGreaterThanOrEqual(0);
      const [fromRight] = placeEdgeLabels([{ x: 260, y: 200, width: 60, height: 20, back: false }], [{ left: 224, top: 0, right: 270, bottom: 400 }], 300);
      expect(fromRight!.x + 30).toBeLessThanOrEqual(300);
      const parallel = [edge('ab1', 'a', 'b'), edge('ab2', 'a', 'b')];
      const provider = placedLabels(renderDiagramSvg(renderOf(['a', 'b'], parallel, 'to'), 0, text => text));
      expect(provider[0]).toEqual(provider[1]);
    });

    it('gives each readable label a copy of its line, drawn only under the pointer, and the provider form none', () => {
      const edges = [edge('ab', 'a', 'b')];
      const readable = renderDiagramSvg(renderOf(['a', 'b'], edges, 'to'), 0, text => text, READABLE_SPACING);
      const line = /<path d="(M [^"]+)" marker-end/u.exec(readable)![1]!;
      expect(readable).toContain(`<g class="edge-text inferred"><title>to (inferred)</title><path class="edge-echo" d="${line}"/><rect class="edge-label"`);
      expect(renderDiagramSvg(renderOf(['a', 'b'], edges, 'to'), 0, text => text)).not.toContain('edge-echo');
    });
  });

  it('wraps labels by word, splits long words and ellipsizes overflow', () => {
    expect(wrapLabel('Care observations feed a seasonal plan', 22, 2)).toEqual(['Care observations feed', 'a seasonal plan']);
    expect(wrapLabel('abcdefghij', 4, 3)).toEqual(['abcd', 'efgh', 'ij']);
    expect(wrapLabel('one two three four five six', 9, 2)).toEqual(['one two', 'three…']);
    expect(wrapLabel('  line\nbreak ', 22, 2)).toEqual(['line break']);
  });
});
