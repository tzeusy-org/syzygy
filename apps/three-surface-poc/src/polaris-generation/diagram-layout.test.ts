import { describe, expect, it } from 'vitest';
import { READABLE_SPACING, layoutDiagram, renderDiagramSvg, wrapLabel } from './diagram-layout.js';
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
        for (const l of labels) expect(l.bottom).toBeLessThanOrEqual(layout.height);
      });
    }
  });

  it('wraps labels by word, splits long words and ellipsizes overflow', () => {
    expect(wrapLabel('Care observations feed a seasonal plan', 22, 2)).toEqual(['Care observations feed', 'a seasonal plan']);
    expect(wrapLabel('abcdefghij', 4, 3)).toEqual(['abcd', 'efgh', 'ij']);
    expect(wrapLabel('one two three four five six', 9, 2)).toEqual(['one two', 'three…']);
    expect(wrapLabel('  line\nbreak ', 22, 2)).toEqual(['line break']);
  });
});
