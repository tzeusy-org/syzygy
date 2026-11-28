import { describe, expect, it } from 'vitest';
import type { LocalRenderInput } from '@syzygy/polaris-generation-core';
import { zoomContainmentInput, zoomInput } from './dossier-reading.testkit.js';
import { renderLocalDossier } from './dossier-site.js';

// View levels and zoom links at the render (REQ-polaris-generation-034 version 2.50, syzygy-3efd.39). Every expected box, link, attribute
// and style rule is a literal written from the requirement's text and the layout's constants before the renderer ran: the reading flow is a
// chain of five nodes stacked one to a row, each box 200 x 56 at x 24, its rows 122 px apart from y 24; the workspace containment's five
// groups sit at the boxes its layout draws (176 px columns, 12 px indents, a 40 px head). Nothing is imported from the module under test
// but the renderer and the fixtures.

type Input = ReturnType<typeof zoomInput>;
const site = (input: Input): Map<string, string> => new Map(renderLocalDossier(input).files);
const withoutLevels = (input: Input): Input => { const { viewLevels: _levels, ...rest } = input.local; return { sources: input.sources, local: rest }; };
const figureOf = (page: string, id: string): string => {
  const at = page.search(new RegExp(`<figure[^>]* id="figure-${id}">`, 'u'));
  if (at < 0) throw new Error(`no figure ${id}`);
  return page.slice(at, page.indexOf('</figure>', at) + '</figure>'.length);
};

const LINK = '<a class="zoom-link" href="deep-dives/runtime.html#figure-parts"><span aria-hidden="true">+</span><span class="visually-hidden">Zoom in to Node b: Parts of &lt;b&gt;</span></a>';
const TEXT = ' <a class="zoom-text" href="deep-dives/runtime.html#figure-parts">Zoom in: Parts of &lt;b&gt;</a></li>';
const box = (y: number, inner = ''): string => `<span class="walk-node" style="left:24px;top:${y}px;width:200px;height:56px">${inner}</span>`;
const ZOOM_ONLY_LAYER = `<div class="walk-layer">${box(24)}${box(146, LINK)}${box(268)}${box(390)}${box(512)}</div>`;
const POSITIONING = '.walk-figure{position:relative;width:max-content}.walk-layer{position:absolute;left:0;top:0;width:100%;height:100%}'
  + '.walk-node{position:absolute;box-sizing:border-box;border-radius:6px}';
const ZOOM = '.zoom-link{position:absolute;right:0;top:0;font-size:13px;font-weight:600;line-height:1.4;padding:0 .25em;background:var(--panel);color:var(--ink);'
  + 'border:1px solid var(--accent);text-decoration:none;cursor:pointer}.zoom-link:focus-visible{outline:3px solid var(--ink);outline-offset:2px}';
const PASS = '.zoom-only .walk-layer,.zoom-only .walk-node{pointer-events:none}.zoom-only .walk-node:hover,.zoom-only .walk-node:target{outline:none}'
  + '.zoom-only .zoom-link{pointer-events:auto}';
const WALK_STYLE = '.walk-figure{position:relative;width:max-content}.walk-layer{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none}'
  + '.walk-node{position:absolute;box-sizing:border-box;pointer-events:auto;border-radius:6px}.walk-node:hover{outline:3px solid var(--accent)}'
  + '.walk-node:target{outline:3px dashed var(--ink);outline-offset:2px}'
  + '.walk-badge{position:absolute;left:0;top:0;font-size:13px;font-weight:600;line-height:1.4;padding:0 .25em;background:var(--panel);color:var(--ink);border:1px solid var(--accent)}'
  + '.walk-source{position:absolute;left:0;top:0;width:100%;height:100%;cursor:pointer}';

describe('zoom links (version 2.50)', () => {
  it('links a box whose element has its own view to that view, in a zoom-only layer and in its list item, and gives the views their attributes', () => {
    const files = site(zoomInput()), plain = site(withoutLevels(zoomInput()));
    const fig = figureOf(files.get('index.html')!, 'flow'), was = figureOf(plain.get('index.html')!, 'flow');
    const svg = was.slice(was.indexOf('<svg'), was.indexOf('</svg>') + '</svg>'.length);
    expect(fig.startsWith('<figure data-visual-provenance="curated" data-view-level="context" data-view-scope="b" id="figure-flow">')).toBe(true);
    expect(fig).toContain(`<div class="diagram-scroll"><div class="walk-figure zoom-only">${svg}${ZOOM_ONLY_LAYER}</div></div><ul class="diagram-legend"`);
    expect(fig).toContain(`<li data-claim-id="b" data-epistemic="inferred">Node b <span class="visually-hidden ev"><span class="marking inferred">[Inferred]</span></span> <span class="sources">`);
    expect(fig.split(TEXT).length).toBe(2);
    // The flow is the views' figure with the wrapper, layer, item link and attributes added, and nothing else.
    expect(fig.replace(' data-view-level="context" data-view-scope="b"', '').replace('<div class="walk-figure zoom-only">', '').replace(`${ZOOM_ONLY_LAYER}</div>`, '')
      .replace(TEXT, '</li>')).toBe(was);
    // The target is the container view on the deep dive: it carries its attributes, and links nothing, not even to itself.
    const parts = figureOf(files.get('deep-dives/runtime.html')!, 'parts');
    expect(parts.startsWith('<figure data-visual-provenance="curated" data-view-level="container" data-view-scope="b" id="figure-parts">')).toBe(true);
    expect(parts).not.toContain('zoom-');
    expect(files.get('deep-dives/runtime.html')).not.toContain('zoom-');
    expect(files.get('deep-dives/runtime.html')).not.toContain('walk-');
  });

  it('carries the positioning, zoom and pass-through rules on the page holding a zoom link, and no other rule of a layer', () => {
    const files = site(zoomInput());
    const page = files.get('index.html')!;
    expect(page).toContain(`${POSITIONING}${ZOOM}${PASS}`);
    expect(page.split('.walk-figure{').length).toBe(2);
    expect(page).not.toContain('.walk-node:hover{');
    expect(page).not.toContain('.walk-badge{');
    for (const [file, text] of files) if (file !== 'index.html' && file.endsWith('.html')) expect(text, file).not.toContain('.zoom-');
  });

  it('moves the pages holding a levelled figure and the size report, and nothing else: no machine view, no other page', () => {
    const files = site(zoomInput()), plain = site(withoutLevels(zoomInput()));
    expect([...files.keys()].sort()).toEqual([...plain.keys()].sort());
    expect([...files.keys()].filter((file) => files.get(file) !== plain.get(file)).sort()).toEqual(['deep-dives/runtime.html', 'index.html', 'size-report.html', 'size-report.json']);
    expect(files.get('machine.json')).toBe(plain.get('machine.json'));
    expect(files.get('deep-dives/runtime.html')!.replace(' data-view-level="container" data-view-scope="b"', '')).toBe(plain.get('deep-dives/runtime.html'));
    expect(files.get('index.html')!.replace(`${POSITIONING}${ZOOM}${PASS}`, '').replace(' data-view-level="context" data-view-scope="b"', '')
      .replace('<div class="walk-figure zoom-only">', '').replace(`${ZOOM_ONLY_LAYER}</div>`, '').replace(TEXT, '</li>')).toBe(plain.get('index.html'));
  });

  it('shares one walked layer with a walk: the box holds its badge, its source link, then its zoom link, and the walk rules stay byte for byte', () => {
    const page = site(zoomInput(true)).get('index.html')!;
    const fig = figureOf(page, 'flow');
    expect(fig.split('<div class="walk-figure').length).toBe(2);
    expect(fig).toContain('<div class="diagram-scroll"><div class="walk-figure"><svg');
    expect(fig).toContain('<span class="walk-node" style="left:24px;top:146px;width:200px;height:56px" id="walk-flow-1"><span class="walk-badge" aria-hidden="true">1</span>'
      + `<a class="walk-source" href="sources/6e042a3d943e7663eb4d591e.html#L1"><span class="visually-hidden">Node b: cited lines</span></a>${LINK}</span>`);
    // The layer's links come before the walk's list and the list of every component and relationship.
    expect(fig.indexOf(LINK)).toBeLessThan(fig.indexOf('<ol class="figure-walk"'));
    expect(fig.indexOf('<ol class="figure-walk"')).toBeLessThan(fig.indexOf(TEXT));
    expect(page).toContain(`${WALK_STYLE}${ZOOM}${PASS}`);
    expect(page).not.toContain(POSITIONING);
  });

  it('gives a containment a zoom-only layer of one box per group in preorder, at the boxes its layout draws', () => {
    const files = site(zoomContainmentInput()), plain = site(withoutLevels(zoomContainmentInput()));
    const fig = figureOf(files.get('index.html')!, 'workspace'), was = figureOf(plain.get('index.html')!, 'workspace');
    const svg = was.slice(was.indexOf('<svg'), was.indexOf('</svg>') + '</svg>'.length);
    const layer = '<div class="walk-layer"><span class="walk-node" style="left:24px;top:24px;width:176px;height:208px"></span>'
      + '<span class="walk-node" style="left:36px;top:64px;width:152px;height:100px"><a class="zoom-link" href="#figure-inside-web"><span aria-hidden="true">+</span>'
      + '<span class="visually-hidden">Zoom in to Web front end: Inside the web front end</span></a></span>'
      + '<span class="walk-node" style="left:48px;top:104px;width:128px;height:48px"></span><span class="walk-node" style="left:36px;top:172px;width:152px;height:48px"></span>'
      + '<span class="walk-node" style="left:208px;top:24px;width:176px;height:48px"></span></div>';
    expect(fig).toContain(`<div class="diagram-scroll figure-drawing"><div class="walk-figure zoom-only">${svg}${layer}</div></div><ul class="figure-outline">`);
    // Each box is its group's rect in the drawing, in preorder: applications, web, router, cli, packages.
    for (const rect of ['x="24" y="24" width="176" height="208"', 'x="36" y="64" width="152" height="100"', 'x="48" y="104" width="128" height="48"',
      'x="36" y="172" width="152" height="48"', 'x="208" y="24" width="176" height="48"']) expect(svg).toContain(`<rect ${rect}`);
    expect(fig).toContain(' <a class="zoom-text" href="#figure-inside-web">Zoom in: Inside the web front end</a></li>');
    expect(fig.replace('<div class="walk-figure zoom-only">', '').replace(`${layer}</div>`, '')
      .replace(' <a class="zoom-text" href="#figure-inside-web">Zoom in: Inside the web front end</a></li>', '</li>')).toBe(was);
    expect(figureOf(files.get('index.html')!, 'inside-web').startsWith('<figure data-visual-provenance="curated" data-view-level="component" data-view-scope="web" id="figure-inside-web">')).toBe(true);
  });

  it('gives no zoom link where the element\'s own view is not produced, or the only view about it is a context view', () => {
    const { local, sources } = zoomInput();
    const draft = local.draft as unknown as { diagrams: Record<string, unknown>[] };
    const omitted = { sources, local: { ...local, draft: { ...draft, diagrams: draft.diagrams.map((d) => (d['id'] === 'parts' ? { ...d, disposition: { kind: 'omitted', reason: 'Not drawn.', references: [] } } : d)) } as unknown as LocalRenderInput['draft'] } };
    const contextOnly = { sources, local: { ...local, viewLevels: new Map([['flow', { level: 'context', scope: 'b' }], ['parts', { level: 'context', scope: 'b' }]]) } } as Input;
    for (const input of [omitted, contextOnly] as Input[]) {
      const files = site(input), plain = site(withoutLevels(input));
      for (const [file, text] of files) {
        // The size report measures the pages, which the two attributes lengthen.
        if (!file.endsWith('.html') || file === 'size-report.html') continue;
        expect(text, file).not.toContain('zoom-');
        expect(text, file).not.toContain('walk-');
        expect(text.replaceAll(/ data-view-level="[a-z]+" data-view-scope="b"/gu, ''), file).toBe(plain.get(file));
      }
    }
  });
});
