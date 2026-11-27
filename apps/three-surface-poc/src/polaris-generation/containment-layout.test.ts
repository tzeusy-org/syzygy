import { describe, expect, it } from 'vitest';
import { figureToMermaid } from '@syzygy/polaris-generation-core/live';
import { layoutContainment, renderContainmentSvg, type ContainmentClaim } from './diagram-layout.js';
import { figureKindsCss } from './dossier-site.js';

// The containment figure (REQ-polaris-generation-034 version 2.23, syzygy-3efd.31). Every expected coordinate is worked by hand from the
// requirement's constants: column i at x = 24 + 184 i, W = 40 + 184 n; a group at level l is 176 - 24 (l - 1) wide at 12 (l - 1) right of its
// column; a leaf 48 high, a group with k children 40 + sum + 8 (k - 1) + 12; first child 40 below its parent's top, each further child 8 below
// the one before; H = 48 + the tallest top-level group.
const g = (id: string, ...children: ContainmentClaim[]): ContainmentClaim => ({ id, label: `Group ${id}`, epistemic: 'inferred', children });
const escape = (value: string): string => value.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');

describe('containment layout', () => {
  it('lays out the three-level scenario at 408 x 256', () => {
    expect(layoutContainment([g('a', g('a1', g('a11')), g('a2')), g('b')])).toEqual({ width: 408, height: 256, levels: 3, boxes: [
      { id: 'a', level: 1, x: 24, y: 24, width: 176, height: 208, leaf: false },
      { id: 'a1', level: 2, x: 36, y: 64, width: 152, height: 100, leaf: false },
      { id: 'a11', level: 3, x: 48, y: 104, width: 128, height: 48, leaf: true },
      { id: 'a2', level: 2, x: 36, y: 172, width: 152, height: 48, leaf: true },
      { id: 'b', level: 1, x: 208, y: 24, width: 176, height: 48, leaf: true },
    ] });
  });

  it('is 224, 408, 592, 776 and 960 px wide for one to five top-level groups', () => {
    const tops = (n: number): ContainmentClaim[] => [g('t0', g('c0')), ...Array.from({ length: n - 1 }, (_, i) => g(`t${i + 1}`))];
    expect([1, 2, 3, 4, 5].map(n => layoutContainment(tops(n)).width)).toEqual([224, 408, 592, 776, 960]);
  });

  it('throws where a count is out of its bounds, an identity repeats or nothing nests', () => {
    const many = (n: number, prefix: string): ContainmentClaim[] => Array.from({ length: n }, (_, i) => g(`${prefix}${i}`));
    expect(() => layoutContainment([])).toThrow('figure-count');
    expect(() => layoutContainment([g('a', g('b')), ...many(5, 'x')])).toThrow('figure-count');
    expect(() => layoutContainment([g('a', ...many(9, 'c'))])).toThrow('figure-count');
    expect(() => layoutContainment([g('a', g('b', g('c', g('d'))))])).toThrow('figure-count');
    expect(() => layoutContainment([g('a', ...many(8, 'p')), g('b', ...many(8, 'q')), g('c', ...many(8, 'r')), g('d', ...many(8, 's')), g('e', ...many(4, 'u'))])).toThrow('figure-count');
    expect(() => layoutContainment(many(3, 'f'))).toThrow('figure-count');
    expect(() => layoutContainment([g('a', g('a'))])).toThrow('duplicate-node');
    // 40 groups in all is the bound itself.
    expect(layoutContainment([g('a', ...many(8, 'p')), g('b', ...many(8, 'q')), g('c', ...many(8, 'r')), g('d', ...many(8, 's')), g('e', ...many(3, 'u'))]).boxes).toHaveLength(40);
  });

  it('wraps a label at 19, 16 and 13 characters by level, each to two lines, a cut label ending in an ellipsis', () => {
    const long = 'abcdefghij klmnopqrst uvwxyz';
    const svg = renderContainmentSvg([{ id: 'a', label: long, epistemic: 'inferred', children: [{ id: 'b', label: long, epistemic: 'unknown', children: [{ id: 'c', label: long, epistemic: 'inferred', children: [] }] }] }], 0, escape);
    const lines = [...svg.matchAll(/<text [^>]*>(.*?)<\/text>/gu)].map(m => [...m[1]!.matchAll(/<tspan[^>]*>([^<]*)<\/tspan>/gu)].map(t => t[1]));
    expect(lines).toEqual([['abcdefghij', 'klmnopqrst uvwxyz'], ['abcdefghij', 'klmnopqrst… ?'], ['abcdefghij', 'klmnopqrst…']]);
    expect(svg).not.toMatch(/<path|<line|marker/u);
  });

  it('fills a line to 19, 16 and 13 characters by level, no further', () => {
    const label = 'abcd efgh ijkl mnop';
    const svg = renderContainmentSvg([{ id: 'a', label, epistemic: 'inferred', children: [{ id: 'b', label, epistemic: 'inferred', children: [{ id: 'c', label, epistemic: 'inferred', children: [] }] }] }], 0, escape);
    const lines = [...svg.matchAll(/<text [^>]*>(.*?)<\/text>/gu)].map(m => [...m[1]!.matchAll(/<tspan[^>]*>([^<]*)<\/tspan>/gu)].map(t => t[1]));
    expect(lines).toEqual([['abcd efgh ijkl mnop'], ['abcd efgh ijkl', 'mnop'], ['abcd efgh', 'ijkl mnop']]);
  });
});

describe('containment source', () => {
  it('writes the record by position, nested two spaces a level, marks inferred then unknown', () => {
    expect(figureToMermaid({ kind: 'containment', groups: [
      { id: 'x', label: 'Outer', epistemic: 'inferred', sourceIds: [], children: [{ id: 'y', label: 'Inner', epistemic: 'unknown', sourceIds: [], children: [] }] },
      { id: 'z', label: 'Side', epistemic: 'inferred', sourceIds: [], children: [] },
    ] })).toBe('flowchart TB\n  subgraph g0["Outer"]\n    g1["Inner #40;unknown#41;"]\n  end\n  g2["Side"]\n  class g0,g2 inferred\n  class g1 unknown\n  classDef inferred stroke-dasharray:6 4\n  classDef unknown stroke-dasharray:2 4\n');
  });
});

describe('containment stylesheet', () => {
  it('carries the stepper rules alone, the outline rules alone, both, or neither, by the figures a page renders', () => {
    expect(figureKindsCss(false, false)).toBe('');
    const stepper = figureKindsCss(true, false), outline = figureKindsCss(false, true), both = figureKindsCss(true, true);
    expect(stepper).toContain('.figure-stepper{display:none');
    expect(stepper).not.toContain('.figure-outline');
    expect(outline.startsWith('.figure-forms{container-type:inline-size}')).toBe(true);
    expect(outline).not.toContain('.figure-stepper');
    expect(outline).toContain('.figure-outline ul{list-style:none;margin:0;padding-left:12px}');
    expect(outline).toContain('.figure-outline li.inferred{border-left-style:dashed}.figure-outline li.unknown{border-left-style:dotted}');
    expect(outline).toContain('@container (width < 224px){.figure-forms[data-figure-width="224"]>.figure-drawing{display:none}.figure-forms[data-figure-width="224"]>.figure-outline{display:block}}');
    expect(both.startsWith(stepper)).toBe(true);
    expect(both).toContain('@container (width < 224px){.figure-forms[data-figure-width="224"]>.figure-drawing{display:none}.figure-forms[data-figure-width="224"]>.figure-outline{display:block}}');
  });
});
