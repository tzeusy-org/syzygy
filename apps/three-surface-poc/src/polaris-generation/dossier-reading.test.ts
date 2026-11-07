import { beforeAll, describe, expect, it } from 'vitest';
import { pageSinkCspFinding } from '@syzygy/polaris-generation-core';
import { READING_QUOTE, READING_SOURCE, readingInput } from './dossier-reading.testkit.js';
import { DOSSIER_THEME_CSS, renderLocalDossier } from './dossier-site.js';

// syzygy-pdja.1: the owner's review of the Redis dossier. Expected values are literals, never read from the renderer.
const render = () => renderLocalDossier(readingInput()).files;
const main = (html: string): string => html.slice(html.indexOf('<main'));
const ID = READING_SOURCE.sourceId;

describe('an operator-agent dossier page reads without its machinery', () => {
  // In beforeAll: a throw at describe time reports zero tests.
  let files: ReadonlyMap<string, string>, index: string, sourcePage: string;
  beforeAll(() => {
    files = render();
    index = files.get('index.html')!;
    sourcePage = [...files].find(([path]) => path.startsWith('sources/') && path !== 'sources/index.html')![1];
  });

  it('shows a source identifier only in the source page identity details and the machine view', () => {
    // Not in the text of the open questions, the sources list or the size report; the attribute that carries it is not reading text.
    const text = (html: string): string => main(html).replace(/<[^>]+>/gu, ' ');
    const reading = [...files.keys()].filter(path => path.endsWith('.html') && (!path.startsWith('sources/') || path === 'sources/index.html'));
    expect(reading).toEqual(['index.html', 'contents.html', 'glossary.html', 'sources/index.html', 'understanding.html', 'size-report.html']);
    for (const page of reading) expect(text(files.get(page)!), page).not.toContain(ID);
    expect(main(index)).toContain(`<span class="asset-references">(<span class="sources"><a class="cite" href="sources/`);
    expect(sourcePage).toContain(`<details class="source-identity"><summary>Source identity</summary><p>${ID}</p><dl class="evidence-anchor"`);
    expect(sourcePage).toContain(`<p class="source-anchor">bytes 0–`);
    // Outside its identity details a source page's text does not name the identifier.
    expect(text(sourcePage.replace(/<details class="source-identity">.*?<\/details>/su, ''))).not.toContain(ID);
    expect(files.get('machine.json')!).toContain(ID);
  });

  it('names a size-report source page by its file, not its hashed route', () => {
    const row = /<tr><td><a href="(sources\/(?!index)[^"]+)">([^<]+)<\/a>/u.exec(files.get('size-report.html')!)!;
    expect(row[2]).toBe(READING_SOURCE.path);
    expect(row[1]).not.toBe(row[2]);
  });

  it('folds the desktop navigation with no script, and the page stays under the policy CSP', () => {
    expect(index).toContain('<div class="layout"><details class="contents desktop-contents nav-panel" open><summary>Contents</summary><nav aria-label="Dossier">');
    expect(DOSSIER_THEME_CSS).toContain('.layout:has(>.nav-panel:not([open])){grid-template-columns:auto minmax(0,1fr)}');
    for (const [path, html] of files) {
      if (!path.endsWith('.html')) continue;
      expect(pageSinkCspFinding(html), path).toBeNull();
      expect(html, path).not.toContain('<script');
    }
  });

  it('uses a system sans stack and downloads no font', () => {
    expect(DOSSIER_THEME_CSS).toContain(':root{--font-serif:ui-sans-serif,system-ui,');
    expect(DOSSIER_THEME_CSS).toContain('--font-mono:ui-monospace,');
    expect(DOSSIER_THEME_CSS).not.toContain('@font-face');
    expect(DOSSIER_THEME_CSS).not.toContain('url(');
  });
});

describe('glossary terms in agent prose', () => {
  let files: ReadonlyMap<string, string>, index: string;
  beforeAll(() => {
    files = render();
    index = main(files.get('index.html')!);
  });
  const links = (html: string): string[] => [...html.matchAll(/<a class="term" href="([^"]+)" aria-label="[^"]+">([^<]+)<span/gu)].map(match => `${match[2]} -> ${match[1]!.replace('glossary.html#term-glossary/', '')}`);
  const section = (id: string): string => {
    const start = index.indexOf(`<section id="section-${id}"`);
    return index.slice(start, index.indexOf('</section>', start));
  };

  it('links only the first use in a section, in a hyphen-free form', () => {
    expect(links(section('one'))).toEqual(['replica -> replica', 'event loop -> event-loop']);
  });

  it('links again in a new section, in plural, capitalised and upper-case forms', () => {
    expect(links(section('two'))).toEqual(['Replicas -> replica', 'AOF -> aof', 'event-loops -> event-loop']);
  });

  it('matches a term holding regex characters or an entity as written', () => {
    expect(links(section('three'))).toEqual(['C++ -> C++', 'R&amp;D -> R&amp;D']);
  });

  it('never links inline code, a longer word or a file name', () => {
    expect(links(section('four'))).toEqual([]);
    expect(section('four')).toContain('Only <code>replica</code> as code, then subreplica, replicated and replica.conf.');
  });

  it('never marks up a verified quotation, even as the only use of a term in its section', () => {
    expect(section('five')).toContain(`>${READING_QUOTE}</q>`);
    expect(links(section('five'))).toEqual([]);
  });

  it('links no term marked Unknown and nothing in a non-normative block', () => {
    expect(links(section('six'))).toEqual([]);
    expect(index).not.toContain('Unsettled.');
  });

  it('leaves a collapsed first use from using up the visible one', () => {
    expect(links(section('seven'))).toEqual(['replica -> replica', 'replica -> replica']);
  });

  it('links no term in a table, whose scrolling would clip the entry', () => {
    expect(links(section('eight'))).toEqual([]);
  });

  it('every link has its target on the glossary page, in no details', () => {
    const glossary = files.get('glossary.html')!;
    expect(glossary).toContain('<dt id="term-glossary/replica">');
    expect(glossary.slice(0, glossary.indexOf('<dt id="term-glossary/replica">'))).not.toContain('<details class="details"');
  });

  it('shows the entry as prose with its marking and machine attributes, and lists it in the machine view', () => {
    expect(index).toContain('<span class="term-pop" data-glossary-entry="glossary/event-loop" data-epistemic="inferred">The loop that serves <code>clients</code>. <span class="marking inferred">[Inferred]</span></span>');
    const machine = JSON.parse(files.get('machine.json')!) as { claims: { page: string; id: string }[]; glossaryShown: { page: string; id: string }[] };
    expect(machine.glossaryShown).toContainEqual({ page: 'index.html', id: 'glossary/replica' });
    expect(machine.claims.filter(claim => claim.id === 'glossary/replica').map(claim => claim.page)).toEqual(['glossary.html']);
  });

  it('adds no term to a source page or the glossary, and the size report does not count an entry', () => {
    for (const [path, html] of files) if (path.startsWith('sources/') || path === 'glossary.html') expect(html, path).not.toContain('class="term"');
    // The same page with every entry a hundred words longer measures the same: an entry shows only on hover or focus.
    const longer = readingInput();
    const glossary = longer.local.glossary.map(term => ({ ...term, text: `${term.text} ${'word '.repeat(100)}` }));
    const rendered = renderLocalDossier({ sources: longer.sources, local: { ...longer.local, glossary } }).files;
    const indexRow = (report: string) => (JSON.parse(report) as { pages: { path: string }[] }).pages.find(row => row.path === 'index.html');
    expect(indexRow(rendered.get('size-report.json')!)).toEqual(indexRow(files.get('size-report.json')!));
    expect(files.get('size-report.html')!).toContain('each page is measured without its review-status region and its glossary entries');
  });

  it('marks the diagram element under the pointer, and a label\'s line with it', () => {
    expect(DOSSIER_THEME_CSS).toContain('.diagram-scroll g.edge-text:hover rect.edge-label{stroke:var(--cyan);stroke-width:1.5}');
    expect(DOSSIER_THEME_CSS).toContain('.diagram-scroll path.edge-leader{stroke-width:1;fill:none}');
    expect(DOSSIER_THEME_CSS).toContain('.diagram-scroll path.edge-echo{display:none;fill:none;stroke:var(--cyan);stroke-width:3;pointer-events:none}.diagram-scroll g.edge-text:hover path.edge-echo{display:inline}');
  });

  it('opens an entry at once on hover and on focus, from its block, closes it a moment later, and dims a withheld marker', () => {
    expect(DOSSIER_THEME_CSS).toContain('a.term:hover>.term-pop,a.term:focus>.term-pop{visibility:visible;transition-delay:0s}');
    expect(DOSSIER_THEME_CSS).toContain('transition:visibility 0s .35s}');
    expect(DOSSIER_THEME_CSS).toContain('main [data-claim-id]{position:relative}');
    expect(DOSSIER_THEME_CSS).toContain('.term-pop::before{content:"";position:absolute;left:0;right:0;top:-.5rem;height:.5rem}');
    expect(DOSSIER_THEME_CSS).toContain('pre.redaction-note{margin:.25rem 0;padding:.1rem .75rem;border-left:4px solid var(--line);color:var(--muted);');
  });
});
