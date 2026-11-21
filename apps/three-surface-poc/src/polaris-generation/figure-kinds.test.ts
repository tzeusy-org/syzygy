import { beforeAll, describe, expect, it } from 'vitest';
import { figureToMermaid, type DraftFigure } from '@syzygy/polaris-generation-core/live';
import { layoutSequence, layoutSwimlane } from './diagram-layout.js';
import { figureKindsInput, readingInput } from './dossier-reading.testkit.js';
import { figureLaidOutWidth, renderLocalDossier } from './dossier-site.js';

// Figure kinds (REQ-polaris-generation-034 version 2.5, syzygy-3efd.30). Every expected coordinate is worked by hand from the requirement's
// constants: column i at x = 24 + 184 i, W = 40 + 184 n; a sequence's box at y = 24, 56 high, message k at y = 128 + 72 k, H = 104 + 72 m;
// a swimlane's step k at y = 104 + 88 k, H = 96 + 88 s.
const ids = (...names: string[]) => names.map(id => ({ id }));

describe('sequence layout', () => {
  it('lays out three participants and four messages at 592 x 392, a self-message as a loop 32 px right and 24 px lower', () => {
    expect(layoutSequence(ids('a', 'b', 'c'), [{ id: 'm0', from: 'a', to: 'b' }, { id: 'm1', from: 'b', to: 'c' }, { id: 'm2', from: 'b', to: 'b' }, { id: 'm3', from: 'b', to: 'a' }])).toEqual({
      width: 592, height: 392,
      participants: [{ id: 'a', x: 24, y: 24 }, { id: 'b', x: 208, y: 24 }, { id: 'c', x: 392, y: 24 }],
      lifelines: [{ id: 'a', x: 112, y1: 80, y2: 392 }, { id: 'b', x: 296, y1: 80, y2: 392 }, { id: 'c', x: 480, y1: 80, y2: 392 }],
      messages: [
        { id: 'm0', y: 128, self: false, d: 'M 112 128 L 294 128', labelX: 204, labelBottom: 125 },
        { id: 'm1', y: 200, self: false, d: 'M 296 200 L 478 200', labelX: 388, labelBottom: 197 },
        { id: 'm2', y: 272, self: true, d: 'M 296 272 L 328 272 L 328 296 L 298 296', labelX: 296, labelBottom: 269 },
        { id: 'm3', y: 344, self: false, d: 'M 296 344 L 114 344', labelX: 204, labelBottom: 341 },
      ],
    });
  });

  it('is 408, 776 and 960 px wide for two, four and five participants', () => {
    const chain = (n: number) => Array.from({ length: n - 1 }, (_, i) => ({ id: `m${i}`, from: `p${i}`, to: `p${i + 1}` }));
    const people = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `p${i}` }));
    expect([2, 4, 5].map(n => [layoutSequence(people(n), chain(n)).width, layoutSequence(people(n), chain(n)).height])).toEqual([[408, 176], [776, 320], [960, 392]]);
  });

  it.each<[string, () => unknown, string]>([
    ['an unknown participant', () => layoutSequence(ids('a', 'b'), [{ id: 'm', from: 'a', to: 'z' }]), 'unknown-node'],
    ['a participant no message names', () => layoutSequence(ids('a', 'b', 'c'), [{ id: 'm', from: 'a', to: 'b' }]), 'figure-unused'],
    ['one participant', () => layoutSequence(ids('a'), [{ id: 'm', from: 'a', to: 'a' }]), 'figure-count'],
    ['six participants', () => layoutSequence(ids('a', 'b', 'c', 'd', 'e', 'f'), [{ id: 'm', from: 'a', to: 'b' }]), 'figure-count'],
    ['no message', () => layoutSequence(ids('a', 'b'), []), 'figure-count'],
    ['a repeated participant', () => layoutSequence(ids('a', 'a'), [{ id: 'm', from: 'a', to: 'a' }]), 'duplicate-node'],
  ])('refuses %s', (_name, build, message) => {
    expect(build).toThrow(message);
  });
});

describe('swimlane layout', () => {
  it('lays out three lanes and five steps at 592 x 536, arrows straight within a lane and curved between two', () => {
    expect(layoutSwimlane(ids('a', 'b', 'c'), [{ id: 's0', lane: 'a' }, { id: 's1', lane: 'a' }, { id: 's2', lane: 'b' }, { id: 's3', lane: 'c' }, { id: 's4', lane: 'c' }])).toEqual({
      width: 592, height: 536,
      lanes: [{ id: 'a', x: 24, y: 24 }, { id: 'b', x: 208, y: 24 }, { id: 'c', x: 392, y: 24 }],
      steps: [{ id: 's0', x: 24, y: 104 }, { id: 's1', x: 24, y: 192 }, { id: 's2', x: 208, y: 280 }, { id: 's3', x: 392, y: 368 }, { id: 's4', x: 392, y: 456 }],
      order: [
        { from: 's0', to: 's1', straight: true, d: 'M 112 160 L 112 190' },
        { from: 's1', to: 's2', straight: false, d: 'M 112 248 C 112 263, 296 263, 296 278' },
        { from: 's2', to: 's3', straight: false, d: 'M 296 336 C 296 351, 480 351, 480 366' },
        { from: 's3', to: 's4', straight: true, d: 'M 480 424 L 480 454' },
      ],
    });
  });

  it.each<[string, () => unknown, string]>([
    ['an unknown lane', () => layoutSwimlane(ids('a', 'b'), [{ id: 's0', lane: 'a' }, { id: 's1', lane: 'z' }]), 'unknown-node'],
    ['a lane no step names', () => layoutSwimlane(ids('a', 'b'), [{ id: 's0', lane: 'a' }, { id: 's1', lane: 'a' }]), 'figure-unused'],
    ['one step', () => layoutSwimlane(ids('a', 'b'), [{ id: 's0', lane: 'a' }]), 'figure-count'],
    ['twenty-one steps', () => layoutSwimlane(ids('a', 'b'), Array.from({ length: 21 }, (_, k) => ({ id: `s${k}`, lane: k % 2 === 0 ? 'a' : 'b' }))), 'figure-count'],
  ])('refuses %s', (_name, build, message) => {
    expect(build).toThrow(message);
  });
});

describe('figure kinds on the operator-agent site', () => {
  let files: ReadonlyMap<string, string>, graphFiles: ReadonlyMap<string, string>;
  beforeAll(() => {
    files = renderLocalDossier(figureKindsInput()).files as ReadonlyMap<string, string>;
    graphFiles = renderLocalDossier(readingInput()).files as ReadonlyMap<string, string>;
  });

  it('draws the sequence with its lifelines, a wrapped message label, a loop and an escaped Unknown label', () => {
    const index = files.get('index.html')!;
    expect(index).toContain('<figure data-hue="1" data-visual-provenance="curated" data-figure-kind="sequence"><figcaption>Handshake</figcaption><p class="diagram-relationship"><span class="eyebrow">sequence</span> who asks whom</p><div class="figure-forms" data-figure-width="592"><div class="diagram-scroll figure-drawing"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 592 392" width="592" height="392"');
    expect(index).toContain('<g class="lifeline inferred"><path d="M 112 80 L 112 392"/></g>');
    expect(index).toContain('<tspan x="388" dy="0">reads the stored</tspan><tspan x="388" dy="15">record for the key it…</tspan>');
    expect(index).toContain('<g class="edge unknown"><title>checks its cache (unknown)</title><path d="M 296 272 L 328 272 L 328 296 L 298 296" marker-end="url(#arrow-0)"/>');
    expect(index).toContain('<tspan x="480" dy="0">Store &lt;disk&gt;</tspan>');
  });

  it('draws the swimlane with lane bands, order arrows and step boxes in their lanes', () => {
    const index = files.get('index.html')!;
    expect(index).toContain('<div class="figure-forms" data-figure-width="592"><div class="diagram-scroll figure-drawing"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 592 536" width="592" height="536"');
    expect(index).toContain('<rect class="lane-band" x="24" y="0" width="176" height="536"/><rect class="lane-band" x="208" y="0" width="176" height="536"/><rect class="lane-band" x="392" y="0" width="176" height="536"/>');
    expect(index).toContain('<path class="step-order" d="M 112 248 C 112 263, 296 263, 296 278" marker-end="url(#arrow-1)"/>');
    expect(index).toContain('<g class="node unknown"><title>tags a release (unknown)</title><rect x="392" y="368" width="176" height="56" rx="6"/>');
  });

  it('writes the phone forms whole and escaped, with no identity, citation or label token', () => {
    const index = files.get('index.html')!;
    const steppers = index.match(/<ol class="figure-stepper">.*?<\/ol>/gu);
    expect(steppers).toEqual([
      '<ol class="figure-stepper"><li class="inferred"><span class="stepper-head">Client → Server</span> opens a connection</li><li class="inferred"><span class="stepper-head">Server → Store &lt;disk&gt;</span> reads the stored record for the key it was asked about</li><li class="unknown"><span class="stepper-head">Server → Server</span> checks its cache ?</li><li class="inferred"><span class="stepper-head">Server → Client</span> replies</li></ol>',
      '<ol class="figure-stepper"><li class="inferred"><span class="stepper-head">Developer</span> writes the change</li><li class="inferred"><span class="stepper-head">Developer</span> opens a pull request</li><li class="inferred"><span class="stepper-head">CI</span> runs the tests</li><li class="unknown"><span class="stepper-head">Operator</span> tags a release ?</li><li class="inferred"><span class="stepper-head">Operator</span> watches the rollout</li></ol>',
    ]);
    for (const stepper of steppers!) expect(stepper).not.toMatch(/data-claim-id|data-anchor|href=|\[(?:Observed|Inferred|Unknown)\]/u);
  });

  it('tallies each figure in its own nouns and lists every element once, then its declarative source', () => {
    const index = files.get('index.html')!;
    expect(index).toContain('<p class="diagram-tally">3 participants and 4 messages, as marked: 0 observed, 6 inferred, 1 unknown.</p>');
    expect(index).toContain('<p class="diagram-tally">3 lanes and 5 steps, as marked: 0 observed, 7 inferred, 1 unknown.</p>');
    expect(index).toContain('<li data-claim-id="m2" data-epistemic="inferred">Server → Store &lt;disk&gt;: reads the stored record for the key it was asked about <span');
    expect(index).toContain('<li data-claim-id="s4" data-epistemic="unknown">Operator: tags a release <span');
    for (const id of ['client', 'server', 'store', 'm1', 'm2', 'm3', 'm4', 'dev', 'ci', 'ops', 's1', 's2', 's3', 's4', 's5']) {
      expect(index.split(`data-claim-id="${id}"`).length - 1, id).toBe(1);
    }
  });

  it('carries the figure-kind style on the page holding such a figure alone, and none on the graph-only dossier', () => {
    expect([...files].filter(([, page]) => page.includes('.figure-stepper{')).map(([file]) => file)).toEqual(['index.html']);
    expect([...graphFiles.values()].some(page => page.includes('figure-stepper') || page.includes('@container'))).toBe(false);
    expect(files.get('index.html')).toContain('@container (width < 592px){.figure-forms[data-figure-width="592"]>.figure-drawing{display:none}.figure-forms[data-figure-width="592"]>.figure-stepper{display:block}}');
    for (const page of files.values()) expect(page).not.toMatch(/<script/u);
  });

  it('lists figureStructures in machine.json in draft order; the graph-only machine view has no such member', () => {
    expect(JSON.parse(files.get('machine.json')!).figureStructures).toEqual([
      { diagram: 'handshake', kind: 'sequence', page: 'index.html', laidOutPx: 592, participants: ['client', 'server', 'store'],
        messages: [{ id: 'm1', from: 'client', to: 'server' }, { id: 'm2', from: 'server', to: 'store' }, { id: 'm3', from: 'server', to: 'server' }, { id: 'm4', from: 'server', to: 'client' }] },
      { diagram: 'release', kind: 'swimlane', page: 'index.html', laidOutPx: 592, lanes: ['dev', 'ci', 'ops'],
        steps: [{ id: 's1', lane: 'dev' }, { id: 's2', lane: 'dev' }, { id: 's3', lane: 'ci' }, { id: 's4', lane: 'ops' }, { id: 's5', lane: 'ops' }] }]);
    expect(Object.hasOwn(JSON.parse(graphFiles.get('machine.json')!), 'figureStructures')).toBe(false);
  });

  it('measures each kind by its own layout for figure fit', () => {
    const el = (id: string) => ({ id, label: id, epistemic: 'inferred' as const });
    expect(figureLaidOutWidth({ kind: 'sequence', participants: [el('a'), el('b')], messages: [{ ...el('m'), from: 'a', to: 'b' }] })).toBe(408);
    expect(figureLaidOutWidth({ kind: 'swimlane', lanes: [el('a'), el('b'), el('c'), el('d'), el('e')], steps: ['a', 'b', 'c', 'd', 'e'].map((lane, k) => ({ ...el(`s${k}`), lane })) })).toBe(960);
    expect(() => figureLaidOutWidth({ kind: 'swimlane', lanes: [el('a'), el('b')], steps: [{ ...el('s0'), lane: 'a' }, { ...el('s1'), lane: 'q' }] })).toThrow('unknown-node');
  });
});

describe('declarative source of the figure kinds', () => {
  const el = (id: string, label: string, epistemic: 'inferred' | 'unknown' = 'inferred') => ({ id, label, sourceIds: [], epistemic });
  it('writes a sequence by position, with no class line', () => {
    const figure: DraftFigure = { kind: 'sequence', participants: [el('x', 'Client'), el('y', 'Server "main"')], messages: [{ ...el('m', 'asks', 'unknown'), from: 'x', to: 'y' }, { ...el('n', 'thinks'), from: 'y', to: 'y' }] };
    expect(figureToMermaid(figure)).toBe('sequenceDiagram\n  participant p0 as Client\n  participant p1 as Server #34;main#34;\n  p0-->>p1: asks #40;unknown#41;\n  p1-->>p1: thinks\n');
  });
  it('writes a swimlane as subgraphs with its order edges and class lines', () => {
    const figure: DraftFigure = { kind: 'swimlane', lanes: [el('a', 'Dev'), el('b', 'CI')], steps: [{ ...el('s', 'push'), lane: 'a' }, { ...el('t', 'test', 'unknown'), lane: 'b' }, { ...el('u', 'merge'), lane: 'a' }] };
    expect(figureToMermaid(figure)).toBe('flowchart TB\n  subgraph l0["Dev"]\n    s0["push"]\n    s2["merge"]\n  end\n  subgraph l1["CI"]\n    s1["test #40;unknown#41;"]\n  end\n  s0 --> s1\n  s1 --> s2\n  class s0,s2 inferred\n  class s1 unknown\n  classDef inferred stroke-dasharray:6 4\n  classDef unknown stroke-dasharray:2 4\n');
  });
});
