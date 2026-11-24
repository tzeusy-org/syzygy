import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { findBrowserExecutable, launchBrowser, type Browser } from '../cdp-browser.js';
import { navigationInput, readingInput } from './dossier-reading.testkit.js';
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
