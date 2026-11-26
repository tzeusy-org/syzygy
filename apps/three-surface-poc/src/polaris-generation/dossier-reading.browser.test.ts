import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { generationAnchorId } from '@syzygy/polaris-generation-core';
import { expect, it } from 'vitest';
import { findBrowserExecutable, launchBrowser, type Browser, type BrowserPage } from '../cdp-browser.js';
import { lineCitationInput, navigationInput, readingInput, splitLineCitationInput } from './dossier-reading.testkit.js';
import { renderLocalDossier } from './dossier-site.js';

const executable = findBrowserExecutable();
/** Per figure: its drawn width, its laid-out width (the SVG's width attribute), whether its box holds it with no sideways scroll, and the
 * box's width. */
const FIGURES = '[...document.querySelectorAll(".diagram-scroll")].map(s => { const svg = s.querySelector("svg"); return [Math.round(svg.getBoundingClientRect().width), Number(svg.getAttribute("width")), s.scrollWidth <= s.clientWidth, s.clientWidth]; })';
const INTERSECTIONS = `(() => {
  const box = el => el.getBoundingClientRect();
  const nodes = [...document.querySelectorAll('g.node > rect')].map(box);
  return [...document.querySelectorAll('rect.edge-label')].map(box).filter(l => nodes.some(n => l.left < n.right && n.left < l.right && l.top < n.bottom && n.top < l.bottom)).length;
})()`;

/** Where a pointer can rest on a citation, sampled once the page has stopped moving (syzygy-jetr). */
interface SettledHitPoint {
  readonly still: boolean;
  readonly point: { readonly x: number; readonly y: number } | null;
  readonly left: number;
  readonly scrollY: number;
  readonly box: readonly number[];
}
/** What the page saw of the last pointer move: its target, whether the browser marked it trusted, and the scroll and the link's box
 * at that moment. */
interface DeliveredMove {
  readonly target: string;
  readonly onLink: boolean;
  readonly trusted: boolean;
  readonly x: number;
  readonly y: number;
  readonly scrollY: number;
  readonly box: readonly number[];
}
/**
 * Brings `link` (a page expression) to the middle of the view with an instant scroll, waits until the scroll position and the link's
 * box hold still across two frames, then samples a point in its live hit band (syzygy-jetr). The pages set
 * `html{scroll-behavior:smooth}`. Chrome 120 animated the old `scrollIntoView({ behavior: 'instant' })` under it (observed
 * 2026-11-26), and a Chrome 157 replay showed a scroll moving between sampling and the trusted move, which then landed beside the
 * link. An explicit instant `scrollTo` followed by two still frames is meant to leave no scroll in flight when the point is
 * sampled [Inferred: a running smooth scroll moves the box every frame, so two equal frames mean none ran]. A citation inside a
 * sources run is an inline-block with zero leading, so its box is zero pixels tall; its label's glyph boxes are tried first as
 * a margin against a point on that edge, though on Chrome 120 the settled box centre also hit the link.
 */
const settledHitPoint = (link: string): string => `(async () => {
  const link = ${link};
  const frame = () => new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
  const state = () => { const r = link.getBoundingClientRect(); return JSON.stringify([scrollX, scrollY, r.left, r.top, r.right, r.bottom]); };
  const start = link.getBoundingClientRect();
  window.scrollTo({ left: 0, top: scrollY + (start.top + start.bottom) / 2 - innerHeight / 2, behavior: 'instant' });
  let previous = state(), still = 0;
  for (let n = 0; n < 120 && still < 2; n++) {
    await frame();
    const now = state();
    still = now === previous ? still + 1 : 0;
    previous = now;
  }
  const inside = element => element !== null && link.contains(element) && element.closest('.cite-pop') === null;
  const candidates = [];
  for (const node of link.childNodes) {
    if (node.nodeType !== Node.TEXT_NODE) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    candidates.push(...range.getClientRects());
  }
  candidates.push(...link.getClientRects());
  const point = candidates.map(r => ({ x: Math.floor((r.left + r.right) / 2), y: Math.floor((r.top + r.bottom) / 2) }))
    .find(p => p.x >= 0 && p.x < innerWidth && p.y >= 0 && p.y < innerHeight && inside(document.elementFromPoint(p.x, p.y)));
  const box = link.getBoundingClientRect();
  return { still: still >= 2, point: point ?? null, left: box.left, scrollY, box: [box.left, box.top, box.right, box.bottom] };
})()`;
/** Starts a record of the pointer moves the page sees, judged against `link`; one recorder at a time. */
const recordMoves = (link: string): string => `(() => {
  const link = ${link};
  if (window.__citationMoves) document.removeEventListener('mousemove', window.__citationMoves.listener, true);
  const moves = [];
  const listener = event => {
    const target = event.target, r = link.getBoundingClientRect();
    moves.push({
      target: target.tagName.toLowerCase() + (target.id ? '#' + target.id : '') + (typeof target.className === 'string' && target.className ? '.' + target.className.split(' ').join('.') : ''),
      onLink: link.contains(target) && target.closest('.cite-pop') === null, trusted: event.isTrusted,
      x: event.clientX, y: event.clientY, scrollY, box: [r.left, r.top, r.right, r.bottom],
    });
  };
  window.__citationMoves = { listener, moves };
  document.addEventListener('mousemove', listener, true);
})()`;
/** The last move the recorder saw, waiting for the one just sent to arrive; the move itself is never sent again. */
async function deliveredMove(page: BrowserPage): Promise<DeliveredMove | null> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const move = await page.evaluate<DeliveredMove | null>('(m => m.length === 0 ? null : m[m.length - 1])(window.__citationMoves.moves)');
    if (move !== null) return move;
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  return null;
}

/** Fails unless the move reached the link, trusted, at the scroll and box it was sampled at; the message carries both records
 * and the hint's state as read after the move. */
function expectDeliveredOnLink(move: DeliveredMove | null, sample: SettledHitPoint, hint: unknown, label: string): void {
  expect(move, `${label} hover delivery: ${JSON.stringify({ sampled: sample, delivered: move, hint })}`)
    .toMatchObject({ onLink: true, trusted: true, scrollY: sample.scrollY, box: sample.box });
}

// syzygy-pdja.1: what the owner saw in a browser. Opened from disk, as a reader opens a dossier, with the pages' own CSP in force.
it.skipIf(executable === undefined)('folds the navigation, keeps diagram labels clear of boxes and shows a glossary entry on focus, with no script', async () => {
  if (!executable) throw Error('Browser required');
  const directory = await mkdtemp(join(tmpdir(), 'polaris-reading-browser-'));
  let browser: Browser | undefined;
  try {
    for (const [path, content] of renderLocalDossier(readingInput()).files) {
      await mkdir(dirname(join(directory, path)), { recursive: true });
      await writeFile(join(directory, path), content);
    }
    browser = await launchBrowser(executable);
    const page = await browser.newPage();
    try {
      for (const width of [1440, 390]) {
        await page.setViewport(width, 900);
        await page.navigate(pathToFileURL(join(directory, 'index.html')).href);
        expect(await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')).toBe(true);
        expect(await page.evaluate(INTERSECTIONS)).toBe(0);
        // Every figure, the plain chain, the loop and the pair, is stacked top to bottom and drawn at its laid-out 248 px, never scaled, and
        // fits its box at both widths with no sideways scroll (syzygy-3efd.19, syzygy-3efd.66).
        expect(await page.evaluate(FIGURES), `${width} px`).toEqual([0, 1, 2].map(() => [248, 248, true, width === 390 ? 261 : 966]));
      }
      await page.setViewport(1440, 900);
      await page.navigate(pathToFileURL(join(directory, 'index.html')).href);
      // Body text is the system sans, not the old serif.
      for (const selector of ['body', '.contents a', '.contents .eyebrow', '.pipeline-notice', '.marking', 'a.cite']) {
        expect(await page.evaluate(`getComputedStyle(document.querySelector(${JSON.stringify(selector)})).fontFamily.startsWith("ui-sans-serif")`), selector).toBe(true);
      }
      // The focus ring is inside the panel that clips it, reached by real Tabs.
      for (let i = 0; i < 6 && !await page.evaluate<boolean>('document.activeElement.matches(".nav-panel > summary")'); i++) await page.press('Tab');
      expect(await page.evaluate('document.activeElement.matches(".nav-panel > summary:focus-visible") && getComputedStyle(document.activeElement).outlineOffset')).toBe('-3px');
      // Folding gives the column back.
      const mainWidth = 'document.querySelector("main").getBoundingClientRect().width';
      const open = await page.evaluate(mainWidth) as number;
      await page.evaluate('document.querySelector(".nav-panel > summary").click()');
      expect(await page.evaluate('document.querySelector(".nav-panel").open')).toBe(false);
      expect(await page.evaluate(mainWidth) as number).toBeGreaterThan(open + 100);
      // The chain still fits without scrolling sideways once the navigation has folded.
      expect(await page.evaluate('(() => { const s = document.querySelector(".diagram-scroll"); return s.scrollWidth <= s.clientWidth; })()')).toBe(true);
      // The entry is hidden until the term has focus.
      const popup = 'getComputedStyle(document.querySelector("a.term > .term-pop")).visibility';
      expect(await page.evaluate(popup)).toBe('hidden');
      await page.evaluate('document.querySelector("a.term").focus()');
      expect(await page.evaluate(popup)).toBe('visible');
      // At the narrow width the first navigation stop is the mobile panel's summary, with the same clipped ring to avoid.
      await page.setViewport(390, 900);
      await page.navigate(pathToFileURL(join(directory, 'index.html')).href);
      for (let i = 0; i < 6 && !await page.evaluate<boolean>('document.activeElement.matches(".mobile-contents > summary")'); i++) await page.press('Tab');
      expect(await page.evaluate('document.activeElement.matches(".mobile-contents > summary:focus-visible") && getComputedStyle(document.activeElement).outlineOffset')).toBe('-3px');
      // An open entry stays on the page, at the width that used to overflow.
      await page.setViewport(500, 900);
      await page.navigate(pathToFileURL(join(directory, 'index.html')).href);
      const terms = await page.evaluate('document.querySelectorAll("a.term").length') as number;
      expect(terms).toBeGreaterThan(5);
      for (let term = 0; term < terms; term++) {
        await page.evaluate(`document.querySelectorAll("a.term")[${term}].focus()`);
        expect(await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), `term ${term}`).toBe(true);
      }
      // Dossier spec v1.5, reading view: block text read by innerText on a clone without the visually-hidden elements holds no label
      // token, while textContent keeps every one; a citation mark shows its file and line on focus; the evidence view opens with no script.
      const intro = 'document.querySelector("[data-claim-id=\\"introduction\\"] a.cite")';
      const blocks = `[...document.querySelectorAll("main [data-claim-id]")].filter(e => !e.closest("[data-review-status-region]"))`;
      const reading = await page.evaluate<string[]>(`${blocks}.map(e => { const c = e.cloneNode(true); c.querySelectorAll(".visually-hidden").forEach(h => h.remove()); document.body.append(c); const t = c.innerText; c.remove(); return t; })`);
      expect(reading.length).toBeGreaterThan(2);
      for (const text of reading) expect(text).not.toMatch(/\[(Observed|Inferred|Unknown|Non-normative)\]/u);
      expect(await page.evaluate(`${blocks}.map(e => e.textContent).join(" ")`)).toMatch(/\[Inferred\]/u);
      expect(await page.evaluate('getComputedStyle(document.querySelector("a.cite .cite-pop")).display')).toBe('none');
      await page.evaluate('document.querySelector("a.cite").focus()');
      expect(await page.evaluate('getComputedStyle(document.querySelector("a.cite .cite-pop")).display')).toBe('block');
      expect(await page.evaluate('document.querySelector("a.cite .cite-pop").textContent')).toMatch(/, (lines? \d+|bytes \d+|whole file)/u);
      expect(await page.evaluate('document.querySelector(".evidence-note").parentElement.getBoundingClientRect().width')).toBeLessThanOrEqual(1);
      // The page's own link opens it, as a reader would follow it.
      await page.evaluate('document.querySelector(\'a[href="#evidence-view"]\').click()');
      expect(await page.evaluate('document.querySelector(".evidence-note").parentElement.getBoundingClientRect().width')).toBeGreaterThan(50);
      // A pointer leaving a term far along its line crosses plain text before it reaches the entry, which opens from the block's left edge.
      await page.setViewport(1440, 900);
      await page.navigate(pathToFileURL(join(directory, 'index.html')).href);
      const far = `[...document.querySelectorAll("a.term")].map(a => ({ a, r: a.getClientRects()[0] })).sort((p, q) => q.r.left - p.r.left)[0]`;
      // The reading legend lengthens the page, so the term is brought to the middle of the view before anything is measured.
      await page.evaluate(`(() => { const { r } = ${far}; window.scrollTo({ top: scrollY + r.top - innerHeight / 2, behavior: 'instant' }); return scrollY; })()`);
      const term = await page.evaluate<{ x: number; y: number; left: number; bottom: number }>(`(() => { const { r } = ${far}; return { x: r.left + r.width / 2, y: r.top + r.height / 2, left: r.left, bottom: r.bottom }; })()`);
      const farPopup = `${far}.a.querySelector(".term-pop")`;
      await page.mouseMove(term.x, term.y);
      expect(await page.evaluate(`getComputedStyle(${farPopup}).visibility`)).toBe('visible');
      const entry = await page.evaluate<{ x: number; y: number; right: number }>(`(() => { const r = ${farPopup}.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, right: r.right }; })()`);
      // The fixture is the case: the term lies right of its entry, and the path out of the term runs through neither.
      expect(term.left).toBeGreaterThan(entry.right);
      await page.mouseMove(term.left - 4, term.y);
      expect(await page.evaluate(`${far}.a.matches(":hover")`)).toBe(false);
      await page.mouseMove(entry.x, entry.y);
      expect(await page.evaluate(`document.elementFromPoint(${entry.x}, ${entry.y}).closest(".term-pop") !== null`), 'the entry was still open when the pointer arrived').toBe(true);
      expect(await page.evaluate(`${far}.a.matches(":hover")`)).toBe(true);
      await new Promise(resolve => setTimeout(resolve, 600));
      expect(await page.evaluate(`getComputedStyle(${farPopup}).visibility`), 'held open by the pointer').toBe('visible');
      // Off the entry it closes, a moment later.
      await page.mouseMove(entry.x, entry.y + 400);
      await new Promise(resolve => setTimeout(resolve, 600));
      expect(await page.evaluate(`getComputedStyle(${farPopup}).visibility`)).toBe('hidden');
      // A moved label's leader is drawn, thinner than its line and in the line's colour.
      const leader = await page.evaluate<{ stroke: string; line: string; width: string; length: number }>(`(() => { const l = document.querySelector("path.edge-leader"); return { stroke: getComputedStyle(l).stroke, line: getComputedStyle(l.parentElement.querySelector("path[marker-end]")).stroke, width: getComputedStyle(l).strokeWidth, length: l.getTotalLength() }; })()`);
      expect(leader.stroke).toBe(leader.line);
      expect(leader.stroke).not.toBe('none');
      expect(leader.width).toBe('1px');
      expect(leader.length).toBeGreaterThan(0);
      // A label under the pointer draws its line, on the first diagram's first label.
      const echo = 'document.querySelector("g.edge-text path.edge-echo")';
      expect(await page.evaluate(`getComputedStyle(${echo}).display`)).toBe('none');
      await page.evaluate(`(() => { const r = document.querySelector("g.edge-text rect.edge-label").getBoundingClientRect(); window.scrollTo({ top: scrollY + r.top - innerHeight / 2, behavior: 'instant' }); })()`);
      const label = await page.evaluate<{ x: number; y: number }>(`(() => { const r = document.querySelector("g.edge-text rect.edge-label").getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
      await page.mouseMove(label.x, label.y);
      expect(await page.evaluate(`getComputedStyle(${echo}).display`)).toBe('inline');
    } finally {
      await page.close();
    }
  } finally {
    await browser?.close();
    await rm(directory, { recursive: true, force: true });
  }
}, 60_000);

it.skipIf(executable === undefined)('keeps every dossier reading page oriented and linked in the same scriptless order', async () => {
  if (!executable) throw Error('Browser required');
  const directory = await mkdtemp(join(tmpdir(), 'polaris-wayfinding-'));
  const order = [
    'index.html', 'find-by-task.html', 'name-index.html', 'deep-dives/why-detail.html',
    'poles/2.html', 'deep-dives/words-detail.html', 'poles/3.html', 'contents.html', 'glossary.html',
    'sources/index.html', 'maps/directories.html', 'maps/units.html', 'maps/ci.html', 'maps/infrastructure.html',
    'understanding.html', 'size-report.html', 'appendix.html',
  ];
  const url = (path: string): string => pathToFileURL(join(directory, path)).href;
  const urls = order.map(url);
  const inspectPageTurn = `(() => {
    const main = document.querySelector('main');
    const nav = document.querySelector('nav.reading-order');
    if (!nav) return null;
    const { left, right, top } = nav.getBoundingClientRect();
    const content = main.getBoundingClientRect();
    return { name: nav.getAttribute('aria-label'), afterMain: main.nextElementSibling === nav,
      insideDetails: nav.closest('details') !== null,
      inReadingColumn: left >= content.left - 1 && right <= content.right + 1 && top >= content.bottom,
      previous: nav.querySelector('a[rel="prev"]')?.href ?? null, next: nav.querySelector('a[rel="next"]')?.href ?? null };
  })()`;
  const files = renderLocalDossier(navigationInput()).files;
  const htmlPaths = [...files.keys()].filter(path => path.endsWith('.html'));
  const sourcePages = htmlPaths.filter(path => path.startsWith('sources/') && path !== 'sources/index.html');
  expect(sourcePages).toHaveLength(1);
  expect(htmlPaths.filter(path => !sourcePages.includes(path)).sort()).toEqual([...order].sort());
  let browser: Browser | undefined;
  try {
    for (const path of htmlPaths) {
      await mkdir(dirname(join(directory, path)), { recursive: true });
      await writeFile(join(directory, path), files.get(path)!.replace(/<script\b[^>]*>.*?<\/script>/gisu, ''));
    }
    browser = await launchBrowser(executable);
    const page = await browser.newPage();
    try {
      await page.setViewport(1440, 900);
      for (const [index, path] of order.entries()) {
        await page.navigate(url(path));
        const navs = await page.evaluate<{ name: string; links: string[]; current: string[]; marked: boolean }[]>(`
          [...document.querySelectorAll('.contents > nav')].map(nav => {
            const current = [...nav.querySelectorAll('a[aria-current="page"]')];
            return { name: nav.getAttribute('aria-label'), links: [...nav.querySelectorAll('a')].map(a => a.href),
              current: current.map(a => a.href), marked: current.every(a => getComputedStyle(a).textDecorationLine === 'underline') };
          })
        `);
        expect(navs, path).toEqual(['Dossier', 'Dossier (mobile)'].map(name => ({ name, links: urls, current: [url(path)], marked: true })));
        expect(await page.evaluate(inspectPageTurn), path).toEqual({
          name: 'Reading order', afterMain: true, insideDetails: false, inReadingColumn: true,
          previous: urls[index - 1] ?? null, next: urls[index + 1] ?? null,
        });
      }
      await page.navigate(url('index.html'));
      expect(await page.evaluate(`
        [...document.querySelectorAll('.contents > nav')].map(nav => [...nav.querySelectorAll('.pole-dive-links')].map(list => [
          list.previousSibling.textContent, ...[...list.querySelectorAll('a')].map(a => a.textContent),
        ]))
      `)).toEqual(Array.from({ length: 2 }, () => [['Why it exists', 'Purpose detail'], ['Words', 'Words detail']]));
      expect(await page.evaluate('getComputedStyle(document.querySelector(".desktop-contents.nav-panel")).position')).toBe('sticky');
      expect(await page.evaluate('getComputedStyle(document.querySelector("nav.reading-order")).position')).toBe('static');
      await page.evaluate('document.querySelector(".reading-order [rel=next]").focus()');
      expect(await page.evaluate('document.activeElement.matches(".reading-order [rel=next]:focus-visible")')).toBe(true);
      await page.press('Enter');
      await expect.poll(() => page.evaluate('document.querySelector("main")?.dataset.page')).toBe('find-by-task.html');
      await page.setViewport(390, 844);
      await page.navigate(url('deep-dives/words-detail.html'));
      expect(await page.evaluate('getComputedStyle(document.querySelector(".mobile-contents")).position')).toBe('static');
      await page.evaluate('document.querySelector(".mobile-contents > summary").focus()');
      await page.press('Enter');
      expect(await page.evaluate('document.querySelector(".mobile-contents").open')).toBe(true);
      expect(await page.evaluate('document.querySelector(".mobile-contents [aria-current=page]").href')).toBe(url('deep-dives/words-detail.html'));
      expect(await page.evaluate(inspectPageTurn)).toEqual({
        name: 'Reading order', afterMain: true, insideDetails: false, inReadingColumn: true,
        previous: url('poles/2.html'), next: url('poles/3.html'),
      });
      await page.navigate(url(sourcePages[0]!));
      expect(await page.evaluate('document.querySelector(".reading-order, .contents [aria-current=page]") === null')).toBe(true);
    } finally {
      await page.close();
    }
  } finally {
    await browser?.close();
    await rm(directory, { recursive: true, force: true });
  }
}, 60_000);

it.skipIf(executable === undefined)('fits every dossier page at 390 by 844 and shows both counted packet digests on Review', async () => {
  if (!executable) throw Error('Browser required');
  const { sources, local } = navigationInput();
  const fidelityDigest = '0123456789abcdef'.repeat(4);
  const designDigest = 'fedcba9876543210'.repeat(4);
  const fidelityGroups = '01234567 89abcdef 01234567 89abcdef 01234567 89abcdef 01234567 89abcdef';
  const designGroups = 'fedcba98 76543210 fedcba98 76543210 fedcba98 76543210 fedcba98 76543210';
  const longStatusWord = 'longrunreferenceword'.repeat(10);
  const reviewStatus = [
    { id: 'review-status/fidelity', text: `Fidelity review: one counts, bound to packet ${fidelityDigest} rebuilt at this render. ${longStatusWord}`, label: 'Inferred' },
    { id: 'review-status/design', text: `Rendered-design review: one counts, bound to packet ${designDigest}, rebuilt from these pages.`, label: 'Inferred' },
  ] as const;
  const longPath = `src/${'selectedSourceSegment'.repeat(4)}.ts`;
  const codePath = `src/${'quotedSourceSegment'.repeat(4)}.c`;
  const revision = '73c810edba'.repeat(4);
  const sampleSource = sources[0]!;
  const { body: _body, ...sourceIdentity } = sampleSource;
  const pathOnlySource = { ...sourceIdentity, sourceId: 'long-path-census', path: longPath, classificationBasis: 'path-only', spans: [] } as const;
  const quotedIdentity = { ...sampleSource, sourceId: 'long-quoted-source', path: codePath, objectId: sampleSource.objectId! };
  const sampleSpan = sampleSource.spans[0]!;
  const { start, end, text } = sampleSpan;
  const quotedSource = { ...quotedIdentity, spans: [{ start, end, text, anchorId: generationAnchorId(quotedIdentity, start, end) }] };
  const sourceAnchor = { ...local.sourceAnchors.get(sampleSource.sourceId)!, pathLabel: codePath };
  const quotedCode: (typeof local.draft.sections)[number]['paragraphs'][number] = {
    id: 'local-reflow-code', text: '', sourceIds: [quotedSource.sourceId], children: [],
    element: { kind: 'code', language: 'C', path: codePath, startLine: 1, endLine: 1,
      parts: [{ kind: 'quotation', sourceId: quotedSource.sourceId, start, end, text, anchor: { ...sourceAnchor, fragment: { start, end } } }] },
  };
  const inlineCitation = { id: 'local-reflow-inline', text: 'Readers can compare the complete screened file here.',
    sourceIds: [quotedSource.sourceId], children: [] };
  const blocks = new Map(local.blocks);
  blocks.set(inlineCitation.id, { marking: 'inferred', unknownReason: null, basis: 'fixture', executions: [],
    segments: [{ kind: 'prose', text: inlineCitation.text }] });
  const citationLines = new Map(local.citationLines);
  citationLines.set(inlineCitation.id, new Map([[quotedSource.sourceId, [{ start: 1, end: 1 }]]]));
  const draft = { ...local.draft, sections: local.draft.sections.map(section => section.id !== 'one' ? section
    : { ...section, paragraphs: [...section.paragraphs, inlineCitation, quotedCode] }) };
  const sourceAnchors = new Map(local.sourceAnchors);
  sourceAnchors.set(quotedSource.sourceId, sourceAnchor);
  const reportedGroup = (id: string, heading: string, title: string, details: readonly string[]) => ({
    id, heading, note: 'Self-reported.', empty: 'None.', items: [{
      id: `${id}/path`, marking: 'inferred' as const, unknownReason: null, title, text: 'The fixture names one source path.', details, sourceIds: [],
    }],
  });
  const reportedPaths = ['selected', 'excluded', 'unresolved', 'deferred'] as const;
  const discoveryPage = { path: 'discovery.html', title: 'Discovery', intro: 'Source reads at this render.', groups: [
    { id: 'discovery-inspected', heading: 'Inspected, as the agent reports', note: 'Self-reported.', empty: 'None.', items: [{
      id: 'discovery/inspected', marking: 'inferred', unknownReason: null, title: null, text: 'One path inspected.', details: [longPath], sourceIds: [],
    }] },
    ...reportedPaths.map(part => ({ id: `discovery-${part}`, heading: `${part}, as the agent reports`, note: 'Self-reported.', empty: 'None.', items: [{
      id: `discovery/${part}/1`, marking: 'inferred' as const, unknownReason: null, title: longPath, text: 'Fixture path.', details: [], sourceIds: [],
    }] })),
    { id: 'discovery-read', heading: 'Read by this render', note: `Read at revision ${revision}.`, empty: 'None.', items: [{
      id: 'discovery/read/1', marking: 'observed', unknownReason: null, title: longPath, text: 'Admitted by screening.',
      details: [`object sha1:${revision}`, `revision ${revision}`], sourceIds: [],
    }] },
  ] } as const;
  const reviewPage = { path: 'review.html', title: 'Review', intro: 'The fixture’s review of record.', groups: [{
    id: 'review-fidelity', heading: 'Fidelity review', note: 'Rebuilt at this render.', empty: 'None.', items: [{
      id: 'review/fidelity/binding', marking: 'observed', unknownReason: null, title: 'Packet binding',
      text: `The rebuilt packet digest is ${fidelityDigest}, and the verdict names it.`, details: [], sourceIds: [],
    }],
  }] } as const;
  const disclosure = [...local.disclosure, { id: 'run/screened-path', text: `Screened source ${longPath}`, label: 'Inferred' }] as const;
  const executionsPage = { path: 'executions.html', title: 'Executions', intro: 'Reported commands.', groups: [
    reportedGroup('executions-reported', 'Reported commands', `cat ${longPath}`, [`Working directory: ${longPath}`]),
  ] };
  const clarificationsPage = { path: 'clarifications.html', title: 'Clarifications', intro: 'Operator questions and answers.', groups: [
    reportedGroup('clarifications-asked', 'Questions and answers', `Is ${longPath} in scope?`, [`Consequence: ${longPath}`]),
  ] };
  const existingPages = local.pages.map(page => page.path !== 'understanding.html' ? page : { ...page, groups: [...page.groups,
    reportedGroup('understanding-purpose', 'Purpose', 'Source scope', [`Scope: ${longPath}`]),
  ] });
  const layoutFixture = { ...local, draft, blocks, citationLines, sourceAnchors, disclosure, reviewStatus,
    pages: [...existingPages, discoveryPage, reviewPage, executionsPage, clarificationsPage] };
  const longText = new Map<string, ReadonlyArray<readonly [selector: string, text: string]>>([
    ['appendix.html', [['#appendix-disclosure > ul > li', longPath]]],
    ['clarifications.html', [['#clarifications-asked strong', longPath], ['#clarifications-asked ul.item-details > li', longPath]]],
    ['discovery.html', [
      ['#discovery-inspected ul.item-details > li', longPath],
      ...reportedPaths.map(part => [`#discovery-${part} > ul.local-items > li`, longPath] as const),
      ['#discovery-read > ul.local-items > li', longPath],
      ['#discovery-read .group-note', revision],
    ]],
    ['executions.html', [['#executions-reported strong', longPath], ['#executions-reported ul.item-details > li', longPath]]],
    ['index.html', [['#element-local-reflow-code .code-path', codePath]]],
    ['review.html', [['#review-fidelity > ul.local-items > li', fidelityDigest]]],
    ['sources/index.html', [['#sources > ul > li', longPath], ['#sources > ul > li > a', codePath]]],
    ['understanding.html', [['#understanding-purpose ul.item-details > li', longPath]]],
  ] as const);
  const { files } = renderLocalDossier({ sources: [...sources, pathOnlySource, quotedSource], local: layoutFixture });
  const pages = [...files].filter(([path]) => path.endsWith('.html'));
  expect(pages).toHaveLength(23);
  expect(pages.map(([path]) => path)).toEqual(expect.arrayContaining([...longText.keys()]));
  expect(JSON.parse(files.get('machine.json')!).reviewStatus).toEqual(reviewStatus);
  const directory = await mkdtemp(join(tmpdir(), 'polaris-review-reflow-'));
  let browser: Browser | undefined;
  try {
    for (const [path, html] of pages) {
      await mkdir(dirname(join(directory, path)), { recursive: true });
      await writeFile(join(directory, path), html.replace(/<script\b[^>]*>.*?<\/script>/gisu, ''));
    }
    browser = await launchBrowser(executable);
    const page = await browser.newPage();
    try {
      await page.setViewport(390, 844);
      const overflows: Array<{ path: string; scrollWidth: number }> = [];
      const longTextOverflows: string[] = [];
      for (const [path] of pages) {
        await page.navigate(pathToFileURL(join(directory, path)).href);
        const layout = await page.evaluate<{ width: number; height: number; scrollWidth: number; statuses: string[] }>(`({
          width: innerWidth,
          height: innerHeight,
          scrollWidth: document.documentElement.scrollWidth,
          statuses: [...document.querySelectorAll('[data-review-status-region]')].map(region => region.innerText),
        })`);
        expect([layout.width, layout.height], path).toEqual([390, 844]);
        expect(layout.statuses, path).toHaveLength(1);
        const status = layout.statuses[0]!;
        expect(status, path).not.toMatch(/[0-9a-f]{64}/i);
        expect(status, path).toContain('Fidelity review: one counts');
        expect(status, path).toContain('Rendered-design review: one counts');
        expect(status, path).toContain(longStatusWord);
        if (path === 'review.html') {
          expect(status, path).toContain(fidelityGroups);
          expect(status, path).toContain(designGroups);
        } else {
          expect(status, path).toContain('bound to the packet shown on the review page');
          expect(status, path).not.toContain(fidelityGroups);
          expect(status, path).not.toContain(designGroups);
        }
        if (layout.scrollWidth > layout.width) overflows.push({ path, scrollWidth: layout.scrollWidth });
        for (const [selector, text] of longText.get(path) ?? []) {
          const textFits = await page.evaluate<boolean>(`(() => {
            const text = ${JSON.stringify(text)};
            const node = [...document.querySelectorAll(${JSON.stringify(selector)})].find(item => item.innerText.includes(text));
            if (node === undefined) return false;
            const range = document.createRange();
            range.selectNodeContents(node);
            const rects = [...range.getClientRects()];
            return rects.length > 0 && rects.every(rect => rect.left >= 0 && rect.right <= innerWidth);
          })()`);
          if (!textFits) longTextOverflows.push(`${path} ${selector}`);
        }
      }
      expect({ overflows, longTextOverflows }).toEqual({ overflows: [], longTextOverflows: [] });
      await page.setViewport(1440, 844);
      for (const [path] of pages) {
        await page.navigate(pathToFileURL(join(directory, path)).href);
        expect(await page.evaluate('document.documentElement.scrollWidth <= innerWidth'), path).toBe(true);
      }
      await page.setViewport(390, 844);
      await page.navigate(pathToFileURL(join(directory, 'index.html')).href);
      expect(await page.evaluate('document.scripts.length')).toBe(0);
      const exactPage = pages.find(([path, html]) => path.startsWith('sources/') && html.includes(`<h1 class="source-path">${codePath}</h1>`));
      expect(exactPage).toBeDefined();
      const exactHref = `${pathToFileURL(join(directory, exactPage![0])).href}#L1`;
      const citations = [
        { selector: '#block-local-reflow-inline a.cite', suffix: 'line 1', leftRange: [260, 390] as const },
        { selector: '#element-local-reflow-code a.cite', suffix: `bytes ${start}–${end}`, leftRange: [0, 120] as const },
      ];
      for (const { selector, suffix, leftRange } of citations) {
        const citation = `document.querySelector(${JSON.stringify(selector)})`;
        expect(await page.accessibleNames(`[${citation}]`)).toEqual([`Source 2: ${codePath}, ${suffix}`]);
        expect(await page.evaluate(`${citation}.href`)).toBe(exactHref);
        const inspect = `(() => {
          const link = ${citation};
          const popup = link.querySelector('.cite-pop');
          const box = popup.getBoundingClientRect();
          const range = document.createRange();
          range.selectNodeContents(popup);
          const text = [...range.getClientRects()];
          return { hidden: getComputedStyle(popup).display === 'none', focus: link.matches(':focus-visible'), hovered: link.matches(':hover'),
            contents: popup.textContent, fitsPage: document.documentElement.scrollWidth <= innerWidth,
            contained: box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight
              && text.length > 0 && text.every(rect => rect.left >= box.left && rect.right <= box.right
                && rect.top >= box.top && rect.bottom <= box.bottom) };
        })()`;
        expect(await page.evaluate(inspect)).toMatchObject({ hidden: true });
        await page.evaluate(`(() => {
          const link = ${citation};
          const stops = [...document.querySelectorAll('a[href], summary, [tabindex="0"]')].filter(el => el.getClientRects().length > 0);
          stops[stops.indexOf(link) - 1].focus();
        })()`);
        for (let step = 0; step < 4; step++) {
          await page.press('Tab');
          if (await page.evaluate(`document.activeElement === ${citation}`)) break;
        }
        expect(await page.evaluate(inspect), `${selector} keyboard`).toMatchObject({
          hidden: false, focus: true, contents: `${codePath}, ${suffix}`, contained: true, fitsPage: true,
        });
        await page.evaluate(`${citation}.blur()`);
        expect(await page.evaluate(inspect)).toMatchObject({ hidden: true });
        // syzygy-jetr: one trusted move to a point sampled from settled geometry. A move that lands anywhere else fails with what
        // was sampled, what the page saw and the hint's state; it is never sent again.
        const sample = await page.evaluate<SettledHitPoint>(settledHitPoint(citation));
        expect(sample, `${selector} settled hit point`).toMatchObject({ still: true, point: { x: expect.any(Number), y: expect.any(Number) } });
        expect(sample.left, selector).toBeGreaterThanOrEqual(leftRange[0]);
        expect(sample.left, selector).toBeLessThanOrEqual(leftRange[1]);
        await page.evaluate(recordMoves(citation));
        await page.mouseMove(sample.point!.x, sample.point!.y);
        const move = await deliveredMove(page);
        const hint = await page.evaluate(inspect);
        expectDeliveredOnLink(move, sample, hint, selector);
        // The same move, had the page scrolled five pixels or the link moved after sampling, is a miss (the bead's replay); so is
        // an untrusted one.
        expect(() => expectDeliveredOnLink({ ...move!, trusted: false }, sample, hint, selector)).toThrow(/hover delivery/u);
        expect(() => expectDeliveredOnLink({ ...move!, scrollY: move!.scrollY + 5 }, sample, hint, selector)).toThrow(/hover delivery/u);
        expect(() => expectDeliveredOnLink({ ...move!, box: move!.box.map(edge => edge - 5) }, sample, hint, selector)).toThrow(/hover delivery/u);
        await expect.poll(() => page.evaluate(inspect), { message: `${selector} hover: ${JSON.stringify({ sampled: sample, delivered: move })}` }).toMatchObject({
          hidden: false, hovered: true, contents: `${codePath}, ${suffix}`, contained: true, fitsPage: true,
        });
        await page.mouseMove(0, 0);
        await expect.poll(() => page.evaluate(inspect)).toMatchObject({ hidden: true });
      }
      // The delivery check's own control (syzygy-jetr): the page moves 40 pixels between sampling and the trusted move, past the
      // label's glyph band, as the smooth scroll once did. The check must read it as a miss, with the moved scroll in its record,
      // and the hint stays hidden.
      const inline = 'document.querySelector("#block-local-reflow-inline a.cite")';
      const displaced = await page.evaluate<SettledHitPoint>(settledHitPoint(inline));
      expect(displaced).toMatchObject({ still: true, point: { x: expect.any(Number), y: expect.any(Number) } });
      await page.evaluate(recordMoves(inline));
      await page.evaluate("window.scrollBy({ top: 40, behavior: 'instant' })");
      await page.mouseMove(displaced.point!.x, displaced.point!.y);
      const missed = await deliveredMove(page);
      expect(missed).toMatchObject({ onLink: false, trusted: true, scrollY: displaced.scrollY + 40 });
      const missedHint = await page.evaluate(`(link => ({ display: getComputedStyle(link.querySelector('.cite-pop')).display, hovered: link.matches(':hover') }))(${inline})`);
      expect(() => expectDeliveredOnLink(missed, displaced, missedHint, 'displaced'))
        .toThrow(/^displaced hover delivery: \{"sampled":.*"delivered":.*"hint":\{"display":"none","hovered":false\}/u);
      // The recorder reads trust from the event itself: a script-made move on the link records untrusted.
      await page.evaluate(recordMoves(inline));
      await page.evaluate(`${inline}.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }))`);
      expect(await deliveredMove(page)).toMatchObject({ onLink: true, trusted: false });
    } finally {
      await page.close();
    }
  } finally {
    if (browser !== undefined) await browser.close();
    await rm(directory, { recursive: true, force: true });
  }
}, 60_000);

it.skipIf(executable === undefined)('follows a ranged source citation and highlights only its line span with scripts removed', async () => {
  if (!executable) throw Error('Browser required');
  const directory = await mkdtemp(join(tmpdir(), 'line-citations-'));
  let browser: Browser | undefined;
  try {
    for (const [path, content] of renderLocalDossier(lineCitationInput()).files) {
      await mkdir(dirname(join(directory, path)), { recursive: true });
      await writeFile(join(directory, path), content.replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, ''));
    }
    browser = await launchBrowser(executable);
    const page = await browser.newPage();
    try {
      await page.setViewport(390, 844);
      await page.navigate(pathToFileURL(join(directory, 'index.html')).href);
      expect(await page.evaluate('document.scripts.length')).toBe(0);
      const link = 'document.querySelector(\'[data-claim-id="introduction"] a.cite\')';
      expect(await page.evaluate(`${link}.hash`)).toBe('#L1200');
      await page.evaluate(`${link}.focus()`);
      await page.press('Enter');
      await expect.poll(() => page.evaluate('location.hash')).toBe('#L1200');
      const inspect = `(() => {
        const target = document.querySelector('.source-line:target');
        const row = number => document.getElementById('L' + number);
        if (!target) return null;
        const background = el => getComputedStyle(el).backgroundColor;
        return { scripts: document.scripts.length, target: target.id, text: target.textContent.trim(),
          rowCount: document.querySelectorAll('.source-line').length, scrolled: window.scrollY > 844,
          onScreen: target.getBoundingClientRect().top >= 0 && target.getBoundingClientRect().bottom <= innerHeight,
          fits: document.documentElement.scrollWidth <= innerWidth,
          label: getComputedStyle(target, '::before').content,
          continuations: [1201, 1202, 1207, 1208].every(n => row(n).classList.contains('cited-span') && background(row(n)) === background(target)),
          unrelated: [1199, 1203, 1204, 1205].every(n => background(row(n)) !== background(target)),
          details: document.querySelectorAll('details .source-line').length };
      })()`;
      await expect.poll(() => page.evaluate(inspect)).toEqual({ scripts: 0, target: 'L1200', text: '# synthetic option 1200: local documentation',
        rowCount: 2100, scrolled: true, onScreen: true, fits: true, label: '"1200"', continuations: true, unrelated: true, details: 0 });
    } finally { await page.close(); }
  } finally {
    try { await browser?.close(); } finally { await rm(directory, { recursive: true, force: true }); }
  }
}, 30_000);

it.skipIf(executable === undefined)('continues a citation onto its next source piece using a native keyboard link', async () => {
  if (!executable) throw Error('Browser required');
  const directory = await mkdtemp(join(tmpdir(), 'continued-citations-'));
  let browser: Browser | undefined;
  try {
    for (const [path, content] of renderLocalDossier(splitLineCitationInput()).files) {
      await mkdir(dirname(join(directory, path)), { recursive: true });
      await writeFile(join(directory, path), content.replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, ''));
    }
    browser = await launchBrowser(executable);
    const page = await browser.newPage();
    try {
      await page.setViewport(390, 844);
      const index = pathToFileURL(join(directory, 'index.html')).href;
      const painted = `(() => {
        const target = document.querySelector('.source-line:target, .source-line:has(>.source-continuation-target:target)');
        if (!target) return [];
        const background = getComputedStyle(target).backgroundColor;
        return [...document.querySelectorAll('.source-line')].filter(line => getComputedStyle(line).backgroundColor === background).map(line => line.id);
      })()`;
      const selected = '[...document.querySelectorAll(".source-continuation a")].find(a => a.getClientRects().length > 0)';
      const destinations = new Set<string>();
      let firstPage = '';
      for (const [selector, start, firstLines, nextLines, label] of [
        ['[data-claim-id="introduction"] a.cite', '#L999', ['L999', 'L1000'], ['L1001', 'L1002'], 'Continue this citation: lines 1001–1002'],
        ['[data-claim-id="forms"] a.cite', '#L998', ['L998', 'L999', 'L1000'], ['L1001', 'L1002', 'L1003', 'L1004'], 'Continue this citation: lines 1001–1004'],
      ] as const) {
        await page.navigate(index);
        await page.evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
        await page.press('Enter');
        await expect.poll(() => page.evaluate('location.hash')).toBe(start);
        firstPage = await page.evaluate<string>("location.href.split('#')[0]");
        await expect.poll(() => page.evaluate(painted)).toEqual(firstLines);
        expect(await page.evaluate('document.scripts.length')).toBe(0);
        const destination = await page.evaluate<string>(`${selected}.hash`);
        expect(destination).toMatch(/^#continued-/u);
        destinations.add(destination);
        expect(await page.accessibleNames(`[${selected}]`)).toEqual([label]);
        await page.press('Tab');
        expect(await page.evaluate(`document.activeElement === ${selected}`)).toBe(true);
        await page.press('Enter');
        await expect.poll(() => page.evaluate('location.hash')).toBe(destination);
        expect(await page.evaluate("location.href.split('#')[0]")).not.toBe(firstPage);
        expect(await page.evaluate("document.querySelector(':target').closest('.source-line').id")).toBe('L1001');
        await expect.poll(() => page.evaluate(painted)).toEqual(nextLines);
        expect(await page.evaluate('document.querySelectorAll(".source-continuation a").length')).toBe(0);
      }
      expect(destinations.size).toBe(2);
      await page.navigate(`${firstPage}#L4`);
      expect(await page.evaluate(`${selected} === undefined`)).toBe(true);
    } finally { await page.close(); }
  } finally {
    try { await browser?.close(); } finally { await rm(directory, { recursive: true, force: true }); }
  }
}, 30_000);
