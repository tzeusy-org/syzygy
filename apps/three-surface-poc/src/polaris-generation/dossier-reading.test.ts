import { beforeAll, describe, expect, it } from 'vitest';
import { generationAnchorId, gitBlobObjectId, pageSinkCspFinding, type GenerationSource } from '@syzygy/polaris-generation-core';
import { READING_QUOTE, READING_SOURCE, readingInput } from './dossier-reading.testkit.js';
import { DOSSIER_THEME_CSS, renderLocalDossier } from './dossier-site.js';

// syzygy-pdja.1: the owner's review of the Redis dossier. Expected values are literals, never read from the renderer.
const render = () => renderLocalDossier(readingInput()).files;
const main = (html: string): string => html.slice(html.indexOf('<main'));
const ID = READING_SOURCE.sourceId;

describe('Poles: a landing page with the why section and a map, then one page per Pole (dossier spec v1.5)', () => {
  type Poles = NonNullable<ReturnType<typeof readingInput>['local']['poles']>;
  const withPoles = (poles: Poles) => { const input = readingInput(); return renderLocalDossier({ ...input, local: { ...input.local, poles } }).files; };
  const claims = (files: ReadonlyMap<string, string>) => (JSON.parse(files.get('machine.json')!) as { claims: { id: string; page: string }[] }).claims;
  const sectionsOn = (html: string) => [...html.matchAll(/<section id="section-([a-z]+)"/gu)].map(m => m[1]);
  const SPEC: Poles = { whySection: 'one', poles: [
    { label: 'Why it exists', sections: ['one'] },
    { label: 'Words', sections: ['two', 'three', 'four'] },
    { label: 'The rest', sections: ['five', 'six', 'seven', 'nine', 'eight'] },
  ] };

  it('draws the why section and the map on the landing page, each other Pole on its own page, and a why-only Pole on none', () => {
    const files = withPoles(SPEC);
    const order = (JSON.parse(files.get('dossier.json')!) as { pages: { path: string }[] }).pages.map(page => page.path);
    expect(order.slice(0, 3)).toEqual(['index.html', 'poles/2.html', 'poles/3.html']);
    expect(files.has('poles/1.html')).toBe(false);
    const index = files.get('index.html')!;
    expect(sectionsOn(index)).toEqual(['one']);
    expect(sectionsOn(files.get('poles/2.html')!)).toEqual(['two', 'three', 'four']);
    expect(sectionsOn(files.get('poles/3.html')!)).toEqual(['five', 'six', 'seven', 'nine', 'eight']);
    expect(index).toContain('<nav class="pole-map" aria-label="The parts of this dossier"><h2>The parts of this dossier</h2><ol><li data-hue="1"><a href="index.html#section-one">Why it exists</a><ul><li><a href="index.html#section-one">One</a></li></ul></li><li data-hue="2"><a href="poles/2.html">Words</a><ul><li><a href="poles/2.html#section-two">Two</a></li>');
    // Every page's navigation reaches each Pole page, and the contents send a section to its Pole's page.
    for (const [path, html] of files) if (path.endsWith('.html')) expect(html, path).toContain(`<li data-hue="3"><a href="${path.includes('/') ? '../' : ''}poles/3.html">The rest</a></li>`);
    expect(files.get('contents.html')!).toContain('<li><a href="poles/2.html#section-two">Two</a>');
    // A Pole page is a narrative page: it opens in the reading view with the legend.
    expect(files.get('poles/2.html')!.split('class="reading-legend"').length - 1).toBe(1);
  });

  it('colours a Pole page by its Pole, its diagrams included, and a diagram on the landing page by its own hue (syzygy-pdja.14)', () => {
    const files = withPoles(SPEC);
    const pole = files.get('poles/2.html')!;
    expect(pole).toContain('<section id="pole" data-reading-level="1" data-pole="poles/2.html" data-hue="2">');
    expect(pole).toContain('<figure><figcaption>Loop</figcaption>');
    expect(files.get('index.html')!).toContain('<figure data-hue="1"><figcaption>Flow</figcaption>');
  });

  it('loses and repeats no claim against the page division with no Poles', () => {
    const flat = claims(renderLocalDossier(readingInput()).files);
    const poled = claims(withPoles(SPEC));
    expect(poled.map(claim => claim.id).sort()).toEqual(flat.map(claim => claim.id).sort());
    expect(new Set(poled.map(claim => claim.id)).size).toBe(poled.length);
    expect(poled.find(claim => claim.id === 'plural')!.page).toBe('poles/2.html');
    expect(poled.find(claim => claim.id === 'forms')!.page).toBe('index.html');
  });

  it('links a Pole page holding the why section back to it rather than repeating it', () => {
    const files = withPoles({ whySection: 'one', poles: [{ label: 'Start', sections: ['one', 'two'] }, { label: 'Rest', sections: ['three', 'four', 'five', 'six', 'seven', 'nine', 'eight'] }] });
    const start = files.get('poles/1.html')!;
    expect(sectionsOn(start)).toEqual(['two']);
    expect(start).toContain('<p class="pole-why"><a href="../index.html#section-one">One</a> is on the overview.</p>');
    expect(files.get('index.html')!).toContain('<li data-hue="1"><a href="poles/1.html">Start</a><ul><li><a href="index.html#section-one">One</a></li><li><a href="poles/1.html#section-two">Two</a></li></ul></li>');
  });

  it.each<[string, Poles]>([
    ['a section in no Pole', { whySection: 'one', poles: [{ label: 'A', sections: ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'nine'] }] }],
    ['a section in two Poles', { whySection: 'one', poles: [{ label: 'A', sections: ['one', 'two', 'three', 'four'] }, { label: 'B', sections: ['four', 'five', 'six', 'seven', 'nine', 'eight'] }] }],
    ['an empty Pole', { whySection: 'one', poles: [...SPEC.poles, { label: 'Empty', sections: [] }] }],
    ['a why section that is no section', { ...SPEC, whySection: 'ten' }],
  ])('refuses to draw %s', (_name, poles) => {
    expect(() => withPoles(poles)).toThrow(expect.objectContaining({ code: 'invalid-poles' }));
  });
});

describe('the reading view clips what Syzygy adds to a block (dossier spec v1.5)', () => {
  // Visible text: every element of the renderer's visually-hidden class removed, with whatever it nests.
  const visible = (html: string): string => {
    const opener = '<span class="visually-hidden ev">';
    let out = html;
    for (let at = out.indexOf(opener); at !== -1; at = out.indexOf(opener)) {
      let depth = 0, end = at;
      for (const m of out.slice(at).matchAll(/<span\b|<\/span>/gu)) {
        depth += m[0] === '</span>' ? -1 : 1;
        if (depth === 0) { end = at + m.index! + m[0].length; break; }
      }
      out = out.slice(0, at) + out.slice(end);
    }
    return out.replace(/<[^>]+>/gu, '');
  };
  it('clips the self-reported aside and the reason code, keeps the commands and the reason in words', () => {
    const input = readingInput();
    const blocks = new Map(input.local.blocks);
    blocks.set('late', { ...blocks.get('late')!, executions: [{ id: 'run-1', command: 'make check-kestrel' }] });
    blocks.set('shown', { ...blocks.get('shown')!, marking: 'unknown', unknownReason: 'missing-evidence', basis: 'no file states the replica count' });
    const index = renderLocalDossier({ ...input, local: { ...input.local, blocks } }).files.get('index.html')!;
    const body = index.slice(index.indexOf('<main'), index.indexOf('</main>'));
    const shown = visible(body);
    expect(shown).toContain('make check-kestrel');
    expect(shown).toContain('Not established.');
    expect(shown).toContain('(no file states the replica count)');
    expect(shown).not.toContain('self-reported');
    expect(shown).not.toContain('missing-evidence');
    // Kept in DOM text, where plain-text extraction and the evidence view read them.
    expect(body).toContain('<span class="visually-hidden ev"> (Inferred, self-reported)</span>');
    expect(body).toContain('<span class="visually-hidden ev"> <span class="unknown-reason">(missing-evidence)</span></span>');
    expect(body).toMatch(/<span class="evidence-note">Evidence: label Unknown; claim-block kind anchored; reason missing-evidence; editorial draft\.<\/span>/u);
  });
});

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
    expect(reading).toEqual(['index.html', 'contents.html', 'glossary.html', 'sources/index.html', 'understanding.html', 'appendix.html', 'size-report.html']);
    for (const page of reading) expect(text(files.get(page)!), page).not.toContain(ID);
    // The open questions sit in the appendix (dossier spec v1.5), their references numbered as any citation is.
    expect(main(files.get('appendix.html')!)).toContain(`<span class="asset-references">(<span class="sources"><a class="cite" href="sources/`);
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

describe('the sources list says why each file is there (syzygy-pdja.15)', () => {
  it('names the pages citing each source with a count, and says so of a source no page cites', () => {
    const input = readingInput();
    const body = 'Unused.\n';
    const base = { repositoryId: 'synthetic:reading', revision: READING_SOURCE.revision, path: 'docs/unused.md', objectId: gitBlobObjectId(body) };
    const unused: GenerationSource = { ...base, sourceId: 'src-fedcba9876543210fedcba98', evaluationId: 'synthetic-evaluation:reading',
      classificationBasis: 'body', exclusion: { excluded: false }, body,
      spans: [{ anchorId: generationAnchorId(base, 0, Buffer.byteLength(body)), start: 0, end: Buffer.byteLength(body), text: body }] };
    const anchor = { targetClass: 'evidence-artifact-identifier-with-integrity-digest' as const, identifier: unused.objectId!, algorithm: 'sha1' as const, fragment: null, targetState: unused.revision, pathLabel: unused.path };
    const local = { ...input.local, sourceAnchors: new Map([...input.local.sourceAnchors, [unused.sourceId, anchor]]) };
    const list = main(renderLocalDossier({ local, sources: [...input.sources, unused] }).files.get('sources/index.html')!);
    expect(list).toContain('<p>2 sources counted, 2 with admitted text. 1 cited by the dossier\'s pages; each says where.</p>');
    expect(list).toContain('>docs/reading.md</a> <span class="cited-on">Cited on <a href="../index.html">Overview</a> (32 times).</span></li>');
    expect(list).toContain('>docs/unused.md</a> <span class="cited-on">Not cited on the dossier\'s pages.</span></li>');
  });

  it('adds the agent\'s own reason for choosing a source where it reports one, marked Inferred', () => {
    const input = readingInput();
    const excluded: GenerationSource = { repositoryId: 'synthetic:reading', revision: READING_SOURCE.revision, path: 'docs/held.md', objectId: gitBlobObjectId('Held.\n'),
      sourceId: 's-aaaabbbbccccddddeeeeffff', evaluationId: 'synthetic-evaluation:reading', classificationBasis: 'body', exclusion: { excluded: true, reason: 'body-not-retained-for-generation' }, spans: [] };
    const local = { ...input.local, selectionReasons: new Map([['docs/reading.md', 'zq-reason: it explains the reading order.'], ['docs/held.md', 'zq-held-reason.']]) };
    const list = main(renderLocalDossier({ local, sources: [...input.sources, excluded] }).files.get('sources/index.html')!);
    // Never beside an excluded or withheld file: the agent's words there may derive from what screening kept out.
    expect(list).toContain('<li>docs/held.md — counted; exact text unavailable: body-not-retained-for-generation.</li>');
    expect(list).not.toContain('zq-held-reason');
    expect(list).toContain('(32 times).</span> <span class="selected-why">Why the agent chose it, as it reports: zq-reason: it explains the reading order. <span class="marking inferred">[Inferred]</span></span></li>');
    expect(main(renderLocalDossier(input).files.get('sources/index.html')!)).not.toContain('selected-why');
  });
});

describe('colour: six hues for Poles, diagrams and cards, none carrying a claim (syzygy-pdja.14)', () => {
  const luminance = (hex: string): number => {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  };
  const contrast = (a: string, b: string): number => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => p - q); return (y! + 0.05) / (x! + 0.05); };
  const tokens = (css: string): Record<string, string> => Object.fromEntries([...css.matchAll(/--([a-z0-9-]+):(#[0-9a-f]{6})/gu)].map(match => [match[1]!, match[2]!]));

  it('defines every hue and its tint in both themes, with ink, muted text and links at 4.5:1 or more on each tint, and each line colour at 3:1', () => {
    // The light theme is what the light-scheme blocks set; the dark theme, the default, is everything outside them.
    const parts = DOSSIER_THEME_CSS.split('@media (prefers-color-scheme:light){');
    const inside = parts.slice(1).map(part => part.slice(0, part.indexOf('}}') + 1));
    const outside = [parts[0]!, ...parts.slice(1).map(part => part.slice(part.indexOf('}}') + 2))];
    const dark = tokens(outside.join(''));
    const light = { ...dark, ...tokens(inside.join('')) };
    for (const theme of [dark, light]) {
      for (let hue = 1; hue <= 6; hue++) {
        const line = theme[`h${hue}`], tint = theme[`h${hue}t`];
        expect(line, `h${hue}`).toMatch(/^#[0-9a-f]{6}$/u);
        expect(tint, `h${hue}t`).toMatch(/^#[0-9a-f]{6}$/u);
        for (const text of ['ink', 'muted', 'cyan']) expect(contrast(theme[text]!, tint!), `${text} on h${hue}t`).toBeGreaterThanOrEqual(4.5);
        expect(contrast(line!, tint!), `h${hue} on h${hue}t`).toBeGreaterThanOrEqual(3);
      }
    }
    expect(light.h1).toBe('#3a64b8');
    expect(dark.h1).toBe('#8fb0f0');
    for (let hue = 1; hue <= 6; hue++) expect(DOSSIER_THEME_CSS).toContain(`[data-hue="${hue}"],ul.cards>li.card:nth-child(6n+${hue % 6}){--accent:var(--h${hue});--accent-tint:var(--h${hue}t)}`);
  });

  it('gives each diagram outside a Pole page a hue in turn, and a diagram on a Pole page its Pole\'s', () => {
    const files = render();
    const figures = [...files].flatMap(([path, html]) => path.endsWith('.html') ? [...html.matchAll(/<figure( data-hue="(\d)")?><figcaption>[^<]*<\/figcaption><p class="diagram-relationship">/gu)].map(match => ({ path, hue: match[2] })) : []);
    expect(figures.length).toBeGreaterThan(0);
    expect(figures[0]).toEqual({ path: 'index.html', hue: '1' });
    for (const figure of figures) expect(figure.hue === undefined, figure.path).toBe(figure.path.startsWith('poles/'));
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

  it('shows the entry as prose with its marking clipped in the reading view, its machine attributes, and lists it in the machine view', () => {
    expect(index).toContain('<span class="term-pop" data-glossary-entry="glossary/event-loop" data-epistemic="inferred">The loop that serves <code>clients</code>. <span class="visually-hidden ev"><span class="marking inferred">[Inferred]</span></span></span>');
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
