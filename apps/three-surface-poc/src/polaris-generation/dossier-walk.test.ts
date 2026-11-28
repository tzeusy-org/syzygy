import { describe, expect, it } from 'vitest';
import type { LocalRenderInput } from '@syzygy/polaris-generation-core';
import { walkableWidth } from './diagram-layout.js';
import { readingInput, walkInput } from './dossier-reading.testkit.js';
import { renderLocalDossier } from './dossier-site.js';

// Figure walks at the render (REQ-polaris-generation-034 version 2.40, syzygy-3efd.88). Every expected box, id, link, item and style rule is
// a literal written from the requirement's text and the layout's constants before the renderer ran: the reading flow is a chain of five
// nodes stacked one to a row, each box 200 x 56 at x 24 (the margin), its rows 122 px apart from y 24. Nothing is imported from the module
// under test but the renderer and the fixture.

const SOURCE_PAGE = 'sources/6e042a3d943e7663eb4d591e.html';
const LAYER = '<div class="walk-layer">'
  + `<span class="walk-node" style="left:24px;top:24px;width:200px;height:56px"><a class="walk-source" href="${SOURCE_PAGE}#exact-text"><span class="visually-hidden">Node a: cited lines</span></a></span>`
  + `<span class="walk-node" style="left:24px;top:146px;width:200px;height:56px" id="walk-flow-1"><span class="walk-badge" aria-hidden="true">1</span><a class="walk-source" href="${SOURCE_PAGE}#L1"><span class="visually-hidden">Node b: cited lines</span></a></span>`
  + `<span class="walk-node" style="left:24px;top:268px;width:200px;height:56px"><a class="walk-source" href="${SOURCE_PAGE}#exact-text"><span class="visually-hidden">Node c: cited lines</span></a></span>`
  + '<span class="walk-node" style="left:24px;top:390px;width:200px;height:56px" id="walk-flow-3"><span class="walk-badge" aria-hidden="true">3</span></span>'
  + `<span class="walk-node" style="left:24px;top:512px;width:200px;height:56px" id="walk-flow-2"><span class="walk-badge" aria-hidden="true">2</span><a class="walk-source" href="${SOURCE_PAGE}#exact-text"><span class="visually-hidden">Node e: cited lines</span></a></span>`
  + '</div>';
const LIST = '<ol class="figure-walk" aria-label="Walk through this figure">'
  + '<li><a href="#walk-flow-1">Node b</a> <a class="walk-text" href="#block-forms">Read step 1</a></li>'
  + '<li><a href="#walk-flow-2">Node e</a> <a class="walk-text" href="#block-forms">Read step 2</a></li>'
  + '<li><a href="#walk-flow-3">Node d</a> <a class="walk-text" href="#block-forms">Read step 3</a></li></ol>';
const STYLE = '.walk-figure{position:relative;width:max-content}.walk-layer{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none}'
  + '.walk-node{position:absolute;box-sizing:border-box;pointer-events:auto;border-radius:6px}.walk-node:hover{outline:3px solid var(--accent)}'
  + '.walk-node:target{outline:3px dashed var(--ink);outline-offset:2px}'
  + '.walk-badge{position:absolute;left:0;top:0;font-size:13px;font-weight:600;line-height:1.4;padding:0 .25em;background:var(--panel);color:var(--ink);border:1px solid var(--accent)}'
  + '.walk-source{position:absolute;left:0;top:0;width:100%;height:100%;cursor:pointer}';

const site = (input: ReturnType<typeof readingInput>): Map<string, string> => new Map(renderLocalDossier(input).files);
const withoutWalk = (): ReturnType<typeof readingInput> => { const { local, sources } = walkInput(); const { walks: _walks, ...rest } = local; return { sources, local: rest }; };
const figureOf = (page: string, id: string): string => {
  const at = page.indexOf(`<figure data-visual-provenance="curated" id="figure-${id}">`);
  if (at < 0) throw new Error(`no figure ${id}`);
  return page.slice(at, page.indexOf('</figure>', at) + '</figure>'.length);
};
const ids = (page: string): string[] => [...page.matchAll(/\sid="([^"]*)"/gu)].map((match) => match[1]!);

describe('a figure walk (version 2.40)', () => {
  it('wraps the drawing, byte for byte, with a layer of one box per node in node order, and lists the steps after it', () => {
    const walked = figureOf(site(walkInput()).get('index.html')!, 'flow');
    const plain = figureOf(site(withoutWalk()).get('index.html')!, 'flow');
    const svg = plain.slice(plain.indexOf('<svg'), plain.indexOf('</svg>') + '</svg>'.length);
    expect(plain).toContain(`<div class="diagram-scroll">${svg}</div><ul class="diagram-legend"`);
    expect(walked).toContain(`<div class="diagram-scroll"><div class="walk-figure">${svg}${LAYER}</div></div>${LIST}<ul class="diagram-legend"`);
    // Each box covers its node's rect in the drawing.
    for (const [y, label] of [[24, 'a'], [146, 'b'], [268, 'c'], [390, 'd'], [512, 'e']] as const) {
      expect(svg).toContain(`<title>Node ${label} (inferred)</title><rect x="24" y="${y}" width="200" height="56" rx="6"/>`);
    }
    // The walked figure is the plain one with the wrapper, layer and list added and nothing else.
    expect(walked.replace('<div class="walk-figure">', '').replace(`${LAYER}</div>`, '').replace(LIST, '')).toBe(plain);
  });

  it('links a box to the address its node\'s first citation link carries in the figure\'s list, and gives a withheld node\'s box none', () => {
    const walked = figureOf(site(walkInput()).get('index.html')!, 'flow');
    expect(walked).toContain(`<li data-claim-id="b" data-epistemic="inferred">Node b <span class="visually-hidden ev"><span class="marking inferred">[Inferred]</span></span> <span class="sources"><a class="cite" href="${SOURCE_PAGE}#L1"`);
    expect(walked).toContain('<span class="walk-node" style="left:24px;top:390px;width:200px;height:56px" id="walk-flow-3"><span class="walk-badge" aria-hidden="true">3</span></span>');
  });

  it('moves only the page that draws the figure, and only by the wrapper, the layer, the list and the walk style rules', () => {
    const walked = site(walkInput()), plain = site(withoutWalk());
    expect([...walked.keys()].sort()).toEqual([...plain.keys()].sort());
    // `machine.json` and every other file keep their bytes; the size report measures the page.
    expect([...walked.keys()].filter((file) => walked.get(file) !== plain.get(file)).sort()).toEqual(['index.html', 'size-report.html', 'size-report.json']);
    const page = walked.get('index.html')!;
    expect(page.replace('<div class="walk-figure">', '').replace(`${LAYER}</div>`, '').replace(LIST, '').replace(STYLE, '')).toBe(plain.get('index.html'));
  });

  it('carries the walk style rules on the page holding a walk and on no other page', () => {
    const walked = site(walkInput());
    expect(walked.get('index.html')).toContain(STYLE);
    for (const [file, text] of walked) if (file !== 'index.html' && file.endsWith('.html')) expect(text, file).not.toContain('.walk-');
    for (const [file, text] of site(withoutWalk())) if (file.endsWith('.html')) expect(text, file).not.toContain('walk-');
  });

  it('gives each id on the page once, and every walk id is a step of the figure it names', () => {
    const page = site(walkInput()).get('index.html')!;
    const all = ids(page);
    expect(all.filter((id, k) => all.indexOf(id) !== k)).toEqual([]);
    expect(all.filter((id) => id.startsWith('walk-'))).toEqual(['walk-flow-1', 'walk-flow-3', 'walk-flow-2']);
    expect(page).toContain(' id="block-forms"');
    expect(page.includes('<script')).toBe(false);
  });

  it('keeps ids unique for two walked figures whose identities share a prefix, beside a paragraph named like a walk id', () => {
    const { local, sources } = walkInput();
    const draft = local.draft as unknown as { sections: { id: string; paragraphs: { id: string }[] }[]; diagrams: { id: string }[] };
    const two = draft.sections.find((section) => section.id === 'two')!;
    const blocks = new Map(local.blocks);
    blocks.set('walk-flow-1', blocks.get('plural')!);
    const input = { sources, local: { ...local, blocks,
      draft: { ...draft, sections: draft.sections.map((section) => (section === two ? { ...two, paragraphs: two.paragraphs.map((p) => ({ ...p, id: 'walk-flow-1' })) } : section)),
        diagrams: draft.diagrams.map((diagram) => (diagram.id === 'pair' ? { ...diagram, id: 'flow-1' } : diagram)) } as unknown as LocalRenderInput['draft'],
      walks: new Map([...local.walks!, ['flow-1', [{ node: 'pair-x', block: 'walk-flow-1' }, { node: 'pair-y', block: 'walk-flow-1' }]]]) } };
    const page = site(input).get('index.html')!;
    const all = ids(page);
    expect(all.filter((id, k) => all.indexOf(id) !== k)).toEqual([]);
    expect(all.filter((id) => id.startsWith('walk-'))).toEqual(['walk-flow-1', 'walk-flow-3', 'walk-flow-2', 'walk-flow-1-1', 'walk-flow-1-2']);
    expect(page).toContain(' id="block-walk-flow-1"');
    expect(page).toContain('<li><a href="#walk-flow-1-1">Stage x</a> <a class="walk-text" href="#block-walk-flow-1">Read step 1</a></li>');
  });

  it('renders no walk, and moves no byte, where its figure is not produced or a step names no node the figure draws', () => {
    const plain = site(withoutWalk());
    const { local, sources } = walkInput();
    const draft = local.draft as unknown as { diagrams: { id: string; disposition: unknown }[] };
    const omitted = { sources, local: { ...local, draft: { ...draft, diagrams: draft.diagrams.map((d) => (d.id === 'flow' ? { ...d, disposition: { kind: 'omitted', reason: 'Not drawn.' } } : d)) } as unknown as LocalRenderInput['draft'] } };
    const omittedPlain = { sources, local: { ...withoutWalk().local, draft: omitted.local.draft } };
    expect(site(omitted)).toEqual(site(omittedPlain));
    const stray = { sources, local: { ...local, walks: new Map([['flow', [{ node: 'b', block: 'forms' }, { node: 'nowhere', block: 'forms' }]]]) } };
    expect(site(stray)).toEqual(plain);
  });

  it('lays a walk over every drawing width but 1048 px, the one width that shrinks to its column', () => {
    expect([1047, 1048, 1049].map(walkableWidth)).toEqual([true, false, true]);
  });
});
