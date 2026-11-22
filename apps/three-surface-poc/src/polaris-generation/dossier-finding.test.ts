import { describe, expect, it } from 'vitest';
import { generationAnchorId, type LocalRenderInput } from '@syzygy/polaris-generation-core';
import { buildNameIndex, identifiersIn, indexLinkCount, renderNameIndex, type IndexedBlock, type NameIndexInput } from './dossier-finding.js';
import { READING_SOURCE, readingInput } from './dossier-reading.testkit.js';
import { renderLocalDossier } from './dossier-site.js';

// syzygy-5dhm.70 and syzygy-5dhm.71: the generated index and the find-by-task page (REQ-polaris-generation-034, the index-and-task-routes change).
// Every expected value is a literal written from the fixture's own text, never read from the renderer.

const SOURCE_PAGE = 'sources/6e042a3d943e7663eb4d591e.html';
const claim = (text: string) => ({ marking: 'inferred' as const, unknownReason: null, basis: 'fixture', executions: [], segments: [{ kind: 'prose' as const, text }] });

/** The reading fixture with two task routes: three steps, one naming a section, one naming a deep dive the draft does not hold. */
function routed(): ReturnType<typeof readingInput> {
  const input = readingInput();
  const id = input.sources[0]!.sourceId;
  const blocks = new Map(input.local.blocks);
  blocks.set('s1', claim('Register it in `commandTable`, beside the replica.') as never);
  blocks.set('s2', claim('Then read docs/reading.md again.') as never);
  blocks.set('s3', claim('Change the `aofWrite` call.') as never);
  const step = (stepId: string, see?: { kind: 'section' | 'deep-dive'; id: string }) => ({ paragraph: { id: stepId, text: 'x', sourceIds: [id] }, ...(see === undefined ? {} : { see }) });
  const taskRoutes: LocalRenderInput['taskRoutes'] = [
    { id: 'add-command', task: 'Add a command', steps: [step('s1', { kind: 'section', id: 'two' }), step('s2')] },
    { id: 'persist', task: 'Change how data is persisted', steps: [step('s3', { kind: 'deep-dive', id: 'gone' })] },
  ];
  const citationLines = new Map(input.local.citationLines);
  citationLines.set('s1', new Map([[id, 'lines 1\u20131']]));
  return { ...input, local: { ...input.local, blocks, taskRoutes, citationLines } };
}
const region = (html: string, id: string): string => {
  const at = html.indexOf(`<section id="${id}"`);
  return html.slice(at, html.indexOf('<aside class="review-status"', at));
};
type Machine = { taskRoutes: unknown; nameIndex: { page: string; entries: number; links: number; names: { kind: string; name: string; home: { page: string; fragment: string } | null; blocks: { page: string; fragment: string }[] }[] } };
const machineOf = (files: ReadonlyMap<string, string>): Machine => JSON.parse(files.get('machine.json')!) as Machine;
const row = (entry: Machine['nameIndex']['names'][number]): string => `${entry.kind} | ${entry.name} | ${entry.home === null ? '-' : `${entry.home.page}#${entry.home.fragment}`} | ${entry.blocks.map(b => `${b.page}#${b.fragment}`).join(' ')}`;

/** Every `href` inside `html`, resolved from the page `from`. */
const links = (html: string, from: string): { page: string; fragment: string }[] => [...html.matchAll(/ href="([^"]*)"/gu)].map(match => {
  const [file, fragment = ''] = match[1]!.replace(/&amp;/gu, '&').split('#');
  const base = from.includes('/') ? from.slice(0, from.lastIndexOf('/') + 1) : '';
  return { page: file === '' ? from : new URL(file!, `https://site.invalid/${base}`).pathname.slice(1), fragment };
});
/** How many `details` elements are open at `at`. */
const detailsDepth = (html: string, at: number): number => html.slice(0, at).split('<details').length - html.slice(0, at).split('</details>').length;

describe('the generated index of the reading fixture', () => {
  const files = renderLocalDossier(readingInput()).files;
  const index = files.get('name-index.html')!;

  it('lists every glossary term, cited file and figure title, each with its home and every block that names it', () => {
    const machine = machineOf(files);
    expect(machine.nameIndex.names.map(row)).toEqual([
      'term | aof | glossary.html#term-glossary/aof | index.html#block-plural',
      'term | C++ | glossary.html#term-glossary/C++ | index.html#block-literal',
      'term | event-loop | glossary.html#term-glossary/event-loop | index.html#block-forms index.html#block-plural index.html#block-quoted',
      'term | mystery | glossary.html#term-glossary/mystery | index.html#block-unknown',
      'term | R&D | glossary.html#term-glossary/R&D | index.html#block-literal',
      // The block folded inside a details element is reached through that element, never by a target inside it.
      'term | replica | glossary.html#term-glossary/replica | index.html#block-forms index.html#block-plural index.html#block-near index.html#block-quoted index.html#block-aside index.html#element-collapse index.html#block-shown index.html#block-late index.html#block-cell',
      `path | docs/reading.md | ${SOURCE_PAGE}#exact-text | index.html#block-introduction index.html#block-forms index.html#block-plural index.html#block-literal index.html#block-near index.html#block-quoted index.html#block-unknown index.html#block-aside index.html#element-collapse index.html#block-shown index.html#block-late index.html#block-cell`,
      'figure | Flow | index.html#figure-flow | ',
      'figure | Loop | index.html#figure-loop | ',
      'figure | Pair | index.html#figure-pair | ',
    ]);
    expect({ page: machine.nameIndex.page, entries: machine.nameIndex.entries, links: machine.nameIndex.links }).toEqual({ page: 'name-index.html', entries: 10, links: 38 });
  });

  it('draws the page from those entries: counts, one section per kind, and a plain sentence where a kind is empty', () => {
    const page = region(index, 'name-index');
    expect(page.startsWith('<section id="name-index" data-topics="" data-index-entries="10" data-index-links="38"><h1>Index</h1><p class="index-note">Every name this dossier shows, on one page, so the browser\'s own find works over it. Syzygy built it at this render by matching each name against the text of the dossier\'s blocks; no model was called. It is navigation and makes no claim: a name with no block beside it is written out by no block, which says nothing about the project.</p>'
      + '<p class="index-counts">10 names and 38 links: glossary terms 6, top-level directories 0, files 1, identifiers 0, figures 3.</p>')).toBe(true);
    expect(page).toContain('<section id="index-term" data-index-kind="term" data-index-count="6"><h2>Glossary terms</h2><ul class="name-index"><li data-index-name="aof"><span class="index-name">aof</span> <a class="index-home" href="glossary.html#term-glossary/aof">Glossary entry</a> <span class="index-blocks"><a href="index.html#block-plural">Two</a></span></li>');
    expect(page).toContain('<li data-index-name="R&amp;D"><span class="index-name">R&amp;D</span> <a class="index-home" href="glossary.html#term-glossary/R&amp;D">Glossary entry</a> <span class="index-blocks"><a href="index.html#block-literal">Three</a></span></li>');
    // Two blocks of one section are told apart by a number.
    expect(page).toContain('<a href="index.html#element-collapse">Seven</a>, <a href="index.html#block-shown">Seven (2)</a>');
    expect(page).toContain('<section id="index-unit" data-index-kind="unit" data-index-count="0"><h2>Top-level directories</h2><p class="index-empty">No top-level directory is listed: the derived structure is not established at this render, or the tree has none.</p></section>');
    expect(page).toContain(`<section id="index-path" data-index-kind="path" data-index-count="1"><h2>Files</h2><ul class="name-index"><li data-index-name="docs/reading.md"><span class="index-name"><code>docs/reading.md</code></span> <a class="index-home" href="${SOURCE_PAGE}#exact-text">Source text</a> <span class="index-blocks"><a href="index.html#block-introduction">Overview</a>, `);
    expect(page).toContain('<section id="index-identifier" data-index-kind="identifier" data-index-count="0"><h2>Identifiers</h2><p class="index-empty">No block writes an identifier in backticks.</p></section>');
    expect(page).toContain('<li data-index-name="Loop"><span class="index-name">Loop</span> <a class="index-home" href="index.html#figure-loop">Figure</a> <span class="index-unnamed">named by no block</span></li>');
    expect(page.match(/<li data-index-name=/gu)).toHaveLength(10);
  });

  it('resolves every link of the index page: 43 of 43 in its region, and every link of the site\'s navigation', () => {
    const drawn = links(region(index, 'name-index'), 'name-index.html');
    // 38 index links and 5 links to the kinds.
    expect(drawn).toHaveLength(43);
    const resolved = drawn.filter(link => files.has(link.page) && (link.fragment === '' || files.get(link.page)!.includes(` id="${link.fragment.replace(/&/gu, '&amp;')}"`)));
    expect(resolved).toHaveLength(43);
    // A canary for the predicate: a fragment no page holds does not resolve.
    expect(files.get('index.html')!.includes(' id="block-hidden"')).toBe(false);
    for (const [path, html] of files) {
      if (!path.endsWith('.html')) continue;
      const open = '<details class="contents desktop-contents nav-panel" open><summary>Contents</summary><nav aria-label="Dossier">';
      expect(html.indexOf(open), path).toBeGreaterThan(-1);
      const nav = html.slice(html.indexOf(open), html.indexOf('</nav>', html.indexOf(open)));
      const named = links(nav, path).map(link => link.page);
      expect(named.slice(0, 2), path).toEqual(['index.html', 'find-by-task.html']);
      expect(named, path).toContain('name-index.html');
      expect(named.indexOf('name-index.html'), path).toBe(named.indexOf('glossary.html') + 1);
    }
  });

  it('puts no link target inside a details element, and no script on any page', () => {
    const machine = machineOf(files);
    const targets = machine.nameIndex.names.flatMap(entry => [...(entry.home === null ? [] : [entry.home]), ...entry.blocks]);
    expect(targets).toHaveLength(38);
    for (const target of targets) {
      const html = files.get(target.page)!;
      const at = html.indexOf(` id="${target.fragment.replace(/&/gu, '&amp;')}"`);
      expect(at, `${target.page}#${target.fragment}`).toBeGreaterThan(-1);
      // Measured where the target's own tag opens: a folded element is itself the target, never something inside it.
      expect(detailsDepth(html, html.lastIndexOf('<', at)), `${target.page}#${target.fragment}`).toBe(0);
    }
    // The folded block exists, inside a details element, and carries no target of its own.
    const landing = files.get('index.html')!;
    const hidden = landing.indexOf('data-claim-id="hidden"');
    expect(hidden).toBeGreaterThan(-1);
    expect(detailsDepth(landing, hidden)).toBe(1);
    expect(landing.slice(hidden, landing.indexOf('>', hidden))).not.toContain(' id=');
    for (const [path, html] of files) if (path.endsWith('.html')) expect(html.toLowerCase(), path).not.toContain('<script');
  });

  it('carries the two pages\' style rules on those two pages and on no other', () => {
    const styled = [...files].filter(([path, html]) => path.endsWith('.html') && html.includes('.name-index{list-style:none')).map(([path]) => path).sort();
    expect(styled).toEqual(['find-by-task.html', 'name-index.html']);
    expect([...files].filter(([path, html]) => path.endsWith('.html') && html.includes('.route-where,.route-see{')).map(([path]) => path).sort()).toEqual(['find-by-task.html', 'name-index.html']);
  });

  it('gives no page two elements with one id: 10 pages, each id once', () => {
    let pages = 0;
    for (const [path, html] of renderLocalDossier(routed()).files) {
      if (!path.endsWith('.html')) continue;
      pages += 1;
      const ids = [...html.matchAll(/ id="([^"]*)"/gu)].map(match => match[1]!);
      expect(ids.filter((id, i) => ids.indexOf(id) !== i), path).toEqual([]);
    }
    expect(pages).toBe(10);
  });

  it('places the two pages in the reading order: find by task after the overview, the index after the glossary', () => {
    const order = (JSON.parse(files.get('dossier.json')!) as { pages: { path: string }[] }).pages.map(page => page.path);
    expect(order.slice(0, 2)).toEqual(['index.html', 'find-by-task.html']);
    expect(order[order.indexOf('glossary.html') + 1]).toBe('name-index.html');
    expect(files.get('contents.html')!).toContain('<ol><li><a href="find-by-task.html">Find by task</a></li>');
    expect(files.get('contents.html')!).toContain('<li><a href="glossary.html">Glossary</a></li><li><a href="name-index.html">Index</a></li>');
  });

  it('indexes no name of the agent\'s while the draft layer is Unknown', () => {
    const input = readingInput();
    const unknown = renderLocalDossier({ ...input, local: { ...input.local, draftLayer: { state: 'unknown', reason: 'missing-declaration', why: ['fixture'] } } }).files;
    expect(machineOf(unknown).nameIndex).toEqual({ page: 'name-index.html', entries: 0, links: 0, names: [] });
    expect(region(unknown.get('name-index.html')!, 'name-index')).toContain('<section id="index-term" data-index-kind="term" data-index-count="0"><h2>Glossary terms</h2><p class="index-empty">Not indexed: the draft layer is Unknown, so none of the agent&#39;s names is shown.</p></section>');
    expect(region(unknown.get('find-by-task.html')!, 'find-by-task')).toBe('<section id="find-by-task" data-topics="" data-task-route-count="0"><h1>Find by task</h1><p class="no-routes" data-task-routes="withheld">The draft layer is Unknown, so the agent&#39;s task routes are not shown.</p></section>');
  });
});

describe('the find-by-task page', () => {
  it('says plainly that a draft with no routes has none, and writes no route of its own', () => {
    const files = renderLocalDossier(readingInput()).files;
    expect(region(files.get('find-by-task.html')!, 'find-by-task')).toBe('<section id="find-by-task" data-topics="" data-task-route-count="0"><h1>Find by task</h1><p class="no-routes" data-task-routes="none">This run&#39;s draft declares no task routes, so this page has none. Syzygy writes no route of its own: a route is the authoring agent&#39;s claim, checked like any other. To find where something is named, use <a href="name-index.html">the index</a>.</p></section>');
    expect(machineOf(files).taskRoutes).toEqual([]);
    expect(files.get('find-by-task.html')!).not.toContain('class="task-route"');
  });

  it('draws each route as cited steps: the label, the numbered source, the file and lines, and the part of the dossier that explains it', () => {
    const files = renderLocalDossier(routed()).files;
    const cite = (lines: string) => `<span class="sources"><a class="cite" href="${SOURCE_PAGE}#exact-text" data-source-id="src-0123456789abcdef01234567" aria-label="Source 1: docs/reading.md${lines}">[1]<span class="cite-pop" aria-hidden="true">docs/reading.md${lines}</span></a></span>`;
    expect(region(files.get('find-by-task.html')!, 'find-by-task')).toBe('<section id="find-by-task" data-topics="" data-task-route-count="2"><h1>Find by task</h1>'
      + '<p class="route-note">2 tasks a reader may bring to this project, each answered by a short route. Every step is the authoring agent\'s claim, labelled and checked like any block of this dossier: it cites the file and lines to read or change at the pinned revision. Names are listed on <a href="name-index.html">the index</a>.</p>'
      + '<nav class="route-list" aria-label="Tasks"><ol><li><a href="#route-add-command">Add a command</a></li><li><a href="#route-persist">Change how data is persisted</a></li></ol></nav>'
      + '<section id="route-add-command" class="task-route" data-task-route="add-command"><h2>Add a command</h2><ol class="steps route-steps">'
      + '<li data-claim-id="s1" data-epistemic="inferred" id="block-s1">Register it in <code>commandTable</code>, beside the <a class="term" href="glossary.html#term-glossary/replica" aria-label="replica, glossary entry">replica<span class="term-pop" data-glossary-entry="glossary/replica" data-epistemic="inferred">A server that copies another. <span class="marking inferred">[Inferred]</span></span></a>. <span class="marking inferred">[Inferred]</span> '
      + `${cite(', lines 1\u20131')}<span class="route-where">Read or change: <a href="${SOURCE_PAGE}#exact-text"><code>docs/reading.md</code></a>, lines 1\u20131</span><span class="route-see">In this dossier: <a href="index.html#section-two">Two</a></span></li>`
      + `<li data-claim-id="s2" data-epistemic="inferred" id="block-s2">Then read docs/reading.md again. <span class="marking inferred">[Inferred]</span> ${cite('')}<span class="route-where">Read or change: <a href="${SOURCE_PAGE}#exact-text"><code>docs/reading.md</code></a></span></li></ol></section>`
      + '<section id="route-persist" class="task-route" data-task-route="persist"><h2>Change how data is persisted</h2><ol class="steps route-steps">'
      // A step naming a deep dive the draft does not hold shows no link (check refuses such a draft before any render).
      + `<li data-claim-id="s3" data-epistemic="inferred" id="block-s3">Change the <code>aofWrite</code> call. <span class="marking inferred">[Inferred]</span> ${cite('')}<span class="route-where">Read or change: <a href="${SOURCE_PAGE}#exact-text"><code>docs/reading.md</code></a></span></li></ol></section></section>`);
    expect(machineOf(files).taskRoutes).toEqual([
      { id: 'add-command', page: 'find-by-task.html', steps: ['s1', 's2'] },
      { id: 'persist', page: 'find-by-task.html', steps: ['s3'] },
    ]);
  });

  it('counts each step among the claims and indexes what the steps name, every link resolving', () => {
    const files = renderLocalDossier(routed()).files;
    const machine = JSON.parse(files.get('machine.json')!) as Machine & { claims: { id: string; page: string }[] };
    expect(machine.claims.filter(c => ['s1', 's2', 's3'].includes(c.id)).map(c => `${c.id} ${c.page}`)).toEqual(['s1 find-by-task.html', 's2 find-by-task.html', 's3 find-by-task.html']);
    expect(machine.nameIndex.names.filter(entry => entry.kind === 'identifier').map(row)).toEqual([
      'identifier | aofWrite | - | find-by-task.html#block-s3',
      'identifier | commandTable | - | find-by-task.html#block-s1',
    ]);
    expect(machine.nameIndex.names.find(entry => entry.name === 'replica')!.blocks.at(-1)).toEqual({ page: 'find-by-task.html', fragment: 'block-s1' });
    expect(machine.nameIndex.names.find(entry => entry.name === 'docs/reading.md')!.blocks.slice(-3).map(b => b.fragment)).toEqual(['block-s1', 'block-s2', 'block-s3']);
    expect({ entries: machine.nameIndex.entries, links: machine.nameIndex.links }).toEqual({ entries: 12, links: 44 });
    const drawn = [...links(region(files.get('name-index.html')!, 'name-index'), 'name-index.html'), ...links(region(files.get('find-by-task.html')!, 'find-by-task'), 'find-by-task.html')];
    // 44 index links and 5 kind links; on the task page 1 index link, 2 route links, 1 term, 3 citations, 3 files and 1 section.
    expect(drawn).toHaveLength(60);
    expect(drawn.filter(link => files.has(link.page) && (link.fragment === '' || files.get(link.page)!.includes(` id="${link.fragment.replace(/&/gu, '&amp;')}"`)))).toHaveLength(60);
  });
});

describe('the finding pages: withheld, folded and several-piece cases', () => {
  it('shows no route and lists none in machine.json while the draft layer is Unknown, whatever routes the draft carries', () => {
    const input = routed();
    const files = renderLocalDossier({ ...input, local: { ...input.local, draftLayer: { state: 'unknown', reason: 'missing-declaration', why: ['fixture'] } } }).files;
    expect(region(files.get('find-by-task.html')!, 'find-by-task')).toBe('<section id="find-by-task" data-topics="" data-task-route-count="0"><h1>Find by task</h1><p class="no-routes" data-task-routes="withheld">The draft layer is Unknown, so the agent&#39;s task routes are not shown.</p></section>');
    expect(machineOf(files).taskRoutes).toEqual([]);
    expect(machineOf(files).nameIndex.names).toEqual([]);
    for (const page of ['find-by-task.html', 'name-index.html']) for (const word of ['commandTable', 'aofWrite', 'Add a command']) expect(files.get(page)!, `${page} ${word}`).not.toContain(word);
  });

  it('draws a withheld step with no file and no dossier link beside it, and lists it under no name', () => {
    const input = routed();
    const blocks = new Map(input.local.blocks);
    // A withheld item: Syzygy's sentence stands in its segments, and its note counts the withheld source.
    blocks.set('s1', { ...claim('One cited source is withheld.'), withheld: { sources: 1, named: [] } } as never);
    const files = renderLocalDossier({ ...input, local: { ...input.local, blocks } }).files;
    const page = region(files.get('find-by-task.html')!, 'find-by-task');
    expect(page).not.toContain('commandTable');
    // Three steps, one withheld: the two shown steps carry their file, and the withheld one neither its file nor its section.
    expect(page.split('class="route-where"').length - 1).toBe(2);
    expect(page.split('class="route-see"').length - 1).toBe(0);
    const names = machineOf(files).nameIndex.names;
    expect(names.filter(entry => entry.kind === 'identifier').map(row)).toEqual(['identifier | aofWrite | - | find-by-task.html#block-s3']);
    expect(names.find(entry => entry.name === 'docs/reading.md')!.blocks.filter(b => b.page === 'find-by-task.html').map(b => b.fragment)).toEqual(['block-s2', 'block-s3']);
    expect(names.flatMap(entry => entry.blocks).filter(b => b.fragment === 'block-s1')).toEqual([]);
  });

  it('draws a step whose own text a secret detector matches with no file and no dossier link, and lists it under no name', () => {
    const input = routed();
    const blocks = new Map(input.local.blocks);
    // Syzygy's sentence stands in the segments; it happens to hold the glossary term "replica" and a backticked word.
    blocks.set('s1', { ...claim('Withheld beside the replica: a secret detector matches `zqHeldName`.'), marking: 'unknown', unknownReason: 'excluded-content', secretMatched: true } as never);
    const files = renderLocalDossier({ ...input, local: { ...input.local, blocks } }).files;
    const page = region(files.get('find-by-task.html')!, 'find-by-task');
    const held = page.slice(page.indexOf('data-claim-id="s1"'), page.indexOf('</li>', page.indexOf('data-claim-id="s1"')));
    expect(page.indexOf('data-claim-id="s1"')).toBeGreaterThan(-1);
    expect(held).not.toContain('route-where');
    expect(held).not.toContain('route-see');
    expect(page.split('class="route-where"').length - 1).toBe(2);
    expect(page.split('class="route-see"').length - 1).toBe(0);
    const names = machineOf(files).nameIndex.names;
    expect(names.flatMap(entry => entry.blocks).filter(b => b.fragment === 'block-s1')).toEqual([]);
    expect(names.filter(entry => entry.kind === 'identifier').map(entry => entry.name)).toEqual(['aofWrite']);
    expect(files.get('name-index.html')!).not.toContain('zqHeldName');
  });

  it('writes one route as "1 task", never "1 tasks"', () => {
    const input = routed();
    const files = renderLocalDossier({ ...input, local: { ...input.local, taskRoutes: input.local.taskRoutes!.slice(0, 1) } }).files;
    const page = region(files.get('find-by-task.html')!, 'find-by-task');
    expect(page).toContain('<p class="route-note">1 task a reader may bring to this project, each answered by a short route.');
    expect(region(renderLocalDossier(input).files.get('find-by-task.html')!, 'find-by-task')).toContain('<p class="route-note">2 tasks a reader may bring to this project, each answered by a short route.');
  });

  it('names a file once for a step that cites two pieces of it, linked at the first piece, with each piece\'s lines', () => {
    const input = routed();
    // The fixture's one file admitted as two pieces: bytes 0 to 15 under the fixture's source id, and the rest under a second.
    const body = 'The event loop reads each replica.\n';
    const base = { ...READING_SOURCE, objectId: READING_SOURCE.objectId! };
    const piece = (sourceId: string, index: number, start: number, end: number) => ({ ...READING_SOURCE, sourceId, body: body.slice(start, end), segment: { index, count: 2, start, end, blobBytes: 35 },
      spans: [{ anchorId: generationAnchorId(base, start, end), start: 0, end: end - start, text: body.slice(start, end) }] });
    const first = piece(READING_SOURCE.sourceId, 0, 0, 15), second = piece('src-89abcdef0123456789abcdef', 1, 15, 35);
    const taskRoutes = [{ id: 'both', task: 'Read both pieces', steps: [{ paragraph: { id: 's3', text: 'x', sourceIds: [READING_SOURCE.sourceId, second.sourceId] } }] }];
    const citationLines = new Map(input.local.citationLines);
    citationLines.set('s3', new Map([[READING_SOURCE.sourceId, 'lines 1\u20131'], [second.sourceId, 'lines 4\u20136']]));
    const sourceAnchors = new Map([...input.local.sourceAnchors, [second.sourceId, input.local.sourceAnchors.get(READING_SOURCE.sourceId)!]]);
    const files = renderLocalDossier({ sources: [first, second], local: { ...input.local, taskRoutes, citationLines, sourceAnchors } }).files;
    const page = region(files.get('find-by-task.html')!, 'find-by-task');
    expect(page.split('class="route-where"').length - 1).toBe(1);
    const where = page.slice(page.indexOf('<span class="route-where">'), page.indexOf('</span>', page.indexOf('<span class="route-where">')));
    expect(where.replace(/href="[^"]*"/u, 'href=""')).toBe('<span class="route-where">Read or change: <a href=""><code>docs/reading.md</code></a>, lines 1\u20131, lines 4\u20136');
    // The file's link is the first cited piece's page, the page the step's first citation mark opens.
    const marks = [...page.matchAll(/<a class="cite" href="([^"]*)" data-source-id="([^"]*)"/gu)].map(match => [match[2], match[1]]);
    expect(marks.map(mark => mark[0])).toEqual(['src-0123456789abcdef01234567', 'src-89abcdef0123456789abcdef']);
    expect(marks[0]![1]).not.toBe(marks[1]![1]);
    expect(where).toContain(`<a href="${marks[0]![1]}">`);
  });

  it('reaches a block folded twice, and a repeating list folded inside a collapsible section, through the outermost folded element', () => {
    const input = readingInput();
    const paragraph = (id: string) => ({ id, text: 'x', sourceIds: [READING_SOURCE.sourceId], children: [] });
    const blocks = new Map(input.local.blocks);
    blocks.set('inner', claim('Twice folded, it names `innerToken`.') as never);
    const nested = { id: 'ten', title: 'Ten', disposition: { kind: 'produced', assetIds: [] }, paragraphs: [
      { ...paragraph('outer'), element: { kind: 'details', summary: 'Outer', elements: [{ ...paragraph('rlist'), element: { kind: 'steps', items: [paragraph('inner')], repeatsDiagram: 'flow' } }] } },
    ] };
    const files = renderLocalDossier({ ...input, local: { ...input.local, blocks, draft: { ...input.local.draft, sections: [...input.local.draft.sections, nested] } as never } }).files;
    const names = machineOf(files).nameIndex.names;
    expect(names.filter(entry => entry.kind === 'identifier').map(row)).toEqual(['identifier | innerToken | - | index.html#element-outer']);
    // The figure the list repeats is named by the collapsible section's place, never by the list folded inside it.
    expect(row(names.find(entry => entry.kind === 'figure' && entry.name === 'Flow')!)).toBe('figure | Flow | index.html#figure-flow | index.html#element-outer');
    const index = files.get('index.html')!;
    const tagStart = (id: string): number => index.lastIndexOf('<', index.indexOf(` id="${id}"`));
    expect(detailsDepth(index, tagStart('element-outer'))).toBe(0);
    expect(detailsDepth(index, tagStart('element-rlist'))).toBe(1);
    expect(index).not.toContain(' id="block-inner"');
  });
});

describe('buildNameIndex', () => {
  const block = (id: string, prose: string, over: Partial<IndexedBlock> = {}): IndexedBlock => ({ id, page: 'index.html', fragment: `block-${id}`, label: 'Core', prose, quoted: '', sourceIds: [], ...over });
  const input = (over: Partial<NameIndexInput>): NameIndexInput => ({ blocks: [], terms: [], units: [], paths: [], figures: [], ...over });
  const places = (entry: { blocks: readonly { fragment: string }[] } | undefined): string[] => entry!.blocks.map(b => b.fragment);

  it('reads an identifier as one backticked token of 2 to 80 characters holding a letter', () => {
    expect(identifiersIn('Call `dictAdd` then `x`, `a b`, `42`, `--port` and `src/server.c`.')).toEqual(['dictAdd', '--port', 'src/server.c']);
    expect(identifiersIn(`\`${'a'.repeat(80)}\` \`${'b'.repeat(81)}\``)).toEqual(['a'.repeat(80)]);
  });

  it('leaves out an assignment and a single common lower-case word', () => {
    expect(identifiersIn('Build with `BUILD_TLS=yes`, then `make`, `call`, `client` and `Client`; `GET` and `maxmemory` stay, `a==b` does not.')).toEqual(['Client', 'GET', 'maxmemory']);
  });

  it('pairs backticks inside one line of prose, so an odd backtick on one line never pairs with the next line', () => {
    expect(identifiersIn('An odd ` tick.\n Then `zqAfter` here.')).toEqual(['zqAfter']);
  });

  it('collapses a file more than 24 blocks cite to a count and its source page, and lists 24 one by one', () => {
    const file = { path: 'src/server.c', sourceIds: ['s-1'], page: 'sources/a.html' };
    const citing = (n: number): IndexedBlock[] => Array.from({ length: n }, (_unused, i) => block(`b${i + 1}`, 'It serves.', { sourceIds: ['s-1'] }));
    const listed = buildNameIndex(input({ paths: [file], blocks: citing(24) }));
    expect(places(listed[0])).toHaveLength(24);
    expect([places(listed[0])[0], places(listed[0])[23]]).toEqual(['block-b1', 'block-b24']);
    expect(listed[0]!.namedBy).toBe(undefined);
    expect(indexLinkCount(listed)).toBe(25);
    const collapsed = buildNameIndex(input({ paths: [file], blocks: citing(25) }));
    expect(collapsed).toEqual([{ kind: 'path', name: 'src/server.c', home: { page: 'sources/a.html', fragment: 'exact-text', label: 'Source text' }, blocks: [], namedBy: 25 }]);
    expect(indexLinkCount(collapsed)).toBe(1);
    const html = renderNameIndex(collapsed, target => `${target.page}#${target.fragment}`, text => text, true);
    expect(html).toContain('<li data-index-name="src/server.c"><span class="index-name"><code>src/server.c</code></span> <a class="index-home" href="sources/a.html#exact-text">Source text</a> <span class="index-many">cited or named in 25 places, too many to list: open its source text</span></li>');
    expect(html).not.toContain('named by no block');
  });

  it('takes identifiers from a block\'s own prose alone, never from a quotation Syzygy located for it', () => {
    const entries = buildNameIndex(input({ blocks: [block('a', 'It calls `ownName`.', { quoted: 'The file says `quotedName` here.' })] }));
    expect(entries.map(entry => `${entry.kind} ${entry.name}`)).toEqual(['identifier ownName']);
  });

  it('matches a term as a whole word in any case, with a plural s and a spaced form of a hyphenated name', () => {
    const entries = buildNameIndex(input({
      terms: [{ id: 'glossary/event-loop', name: 'event-loop' }],
      blocks: [block('a', 'The Event Loops run.'), block('b', 'An event-looping thing.'), block('c', 'A subevent-loop.'), block('d', '', { quoted: 'the event-loop' })],
    }));
    expect(entries).toEqual([{ kind: 'term', name: 'event-loop', home: { page: 'glossary.html', fragment: 'term-glossary/event-loop', label: 'Glossary entry' },
      blocks: [{ page: 'index.html', fragment: 'block-a', label: 'Core' }, { page: 'index.html', fragment: 'block-d', label: 'Core (2)' }] }]);
  });

  it('lists a file a block cites or writes out whole, and never a file no block touches', () => {
    const entries = buildNameIndex(input({
      paths: [{ path: 'src/server.c', sourceIds: ['s-1', 's-2'], page: 'sources/a.html' }, { path: 'src/unused.c', sourceIds: ['s-3'], page: 'sources/b.html' }],
      blocks: [block('cited', 'It serves.', { sourceIds: ['s-2'] }), block('named', 'See src/server.c.'), block('longer', 'See lib/src/server.c and src/server.cc and src/server.c.bak.'), block('other', 'See src/client.c.')],
    }));
    expect(entries.map(entry => entry.name)).toEqual(['src/server.c']);
    expect(entries[0]!.home).toEqual({ page: 'sources/a.html', fragment: 'exact-text', label: 'Source text' });
    expect(places(entries[0])).toEqual(['block-cited', 'block-named']);
  });

  it('lists every derived top-level directory, named or not, by the paths written under it', () => {
    const entries = buildNameIndex(input({ units: ['src', 'docs'], blocks: [block('a', 'See `src/server.c`.'), block('b', 'The src tree and lib/src/x.')] }));
    expect(entries.filter(entry => entry.kind === 'unit').map(entry => [entry.name, entry.home!.page, entry.home!.fragment, places(entry)])).toEqual([
      ['docs/', 'index.html', 'derived-structure', []],
      ['src/', 'index.html', 'derived-structure', ['block-a']],
    ]);
    expect(entries.filter(entry => entry.kind === 'identifier').map(entry => [entry.name, entry.home, places(entry)])).toEqual([['src/server.c', null, ['block-a']]]);
  });

  it('keeps an identifier out when it is already a term, a file or a directory of the index', () => {
    const entries = buildNameIndex(input({
      terms: [{ id: 'glossary/AOF', name: 'AOF' }], units: ['src'], paths: [{ path: 'src/server.c', sourceIds: ['s-1'], page: 'sources/a.html' }],
      blocks: [block('a', 'The `aof`, `src/`, `src`, `src/server.c` and `dictAdd`; `dictAdd` again.', { sourceIds: ['s-1'] })],
    }));
    expect(entries.filter(entry => entry.kind === 'identifier').map(entry => [entry.name, places(entry)])).toEqual([['dictAdd', ['block-a']]]);
  });

  it('gives a figure its repeating list first, then the blocks that write its title exactly', () => {
    const list = { page: 'index.html', fragment: 'element-list', label: 'Core' };
    const entries = buildNameIndex(input({
      figures: [{ id: 'd1', title: 'Request path', home: { page: 'index.html', fragment: 'figure-d1', label: 'Figure' }, repeatedBy: [list] }],
      blocks: [block('a', 'See Request path.'), block('b', 'A request path.'), block('list', 'Request path', { fragment: 'element-list' })],
    }));
    expect(entries).toEqual([{ kind: 'figure', name: 'Request path', home: { page: 'index.html', fragment: 'figure-d1', label: 'Figure' }, blocks: [list, { page: 'index.html', fragment: 'block-a', label: 'Core (2)' }] }]);
    expect(indexLinkCount(entries)).toBe(3);
  });

  it('numbers places of the same words across a whole entry, and lists a repeating list once', () => {
    const list = { page: 'index.html', fragment: 'element-outer', label: 'Core' };
    const entries = buildNameIndex(input({
      figures: [{ id: 'd1', title: 'Request path', home: { page: 'index.html', fragment: 'figure-d1', label: 'Figure' }, repeatedBy: [list, list] }],
      blocks: [block('a', 'See Request path.'), block('c', 'Request path again.', { label: 'Storage' }), block('d', 'Request path.')],
    }));
    expect(entries[0]!.blocks.map(b => `${b.fragment} ${b.label}`)).toEqual(['element-outer Core', 'block-a Core (2)', 'block-c Storage', 'block-d Core (3)']);
  });

  it('never lists as an identifier a backticked span named as matching a secret detector', () => {
    const given = input({ blocks: [block('a', 'Read `conf/token.pem` and `dictAdd`.')] });
    expect(buildNameIndex(given).map(entry => entry.name)).toEqual(['conf/token.pem', 'dictAdd']);
    expect(buildNameIndex({ ...given, unindexed: ['conf/token.pem'] }).map(entry => entry.name)).toEqual(['dictAdd']);
  });

  it('orders entries by kind, then by name without regard to case, and is the same for the same input', () => {
    const file = (path: string) => ({ path, sourceIds: [`s-${path}`], page: 'sources/a.html' });
    const given = input({ terms: [{ id: 't/b', name: 'beta' }, { id: 't/A', name: 'Alpha' }], units: ['Zeta', 'alpha', 'a', 'a-b'], paths: [file('Beta.c'), file('alpha.c')],
      blocks: [block('x', 'Use `zeta` and `Eta`.', { sourceIds: ['s-Beta.c', 's-alpha.c'] })] });
    expect(buildNameIndex(given).map(entry => `${entry.kind} ${entry.name}`)).toEqual(['term Alpha', 'term beta', 'unit a-b/', 'unit a/', 'unit alpha/', 'unit Zeta/', 'path alpha.c', 'path Beta.c', 'identifier Eta', 'identifier zeta']);
    expect(buildNameIndex(given)).toEqual(buildNameIndex(given));
  });

  it('escapes every name and link it draws', () => {
    const entries = buildNameIndex(input({ blocks: [block('x', 'Use `a<b>&c`.', { label: 'A & B' })] }));
    const html = renderNameIndex(entries, target => `${target.page}#${target.fragment}`, text => text.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;'), true);
    expect(html).toContain('<li data-index-name="a&lt;b&gt;&amp;c"><span class="index-name"><code>a&lt;b&gt;&amp;c</code></span> <span class="index-blocks"><a href="index.html#block-x">A &amp; B</a></span></li>');
  });
});
