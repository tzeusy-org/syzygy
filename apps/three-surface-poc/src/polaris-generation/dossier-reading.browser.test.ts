import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { findBrowserExecutable, launchBrowser, type Browser } from '../cdp-browser.js';
import { readingInput } from './dossier-reading.testkit.js';
import { renderLocalDossier } from './dossier-site.js';

const executable = findBrowserExecutable();
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
        // The three-column chain shrinks no further than 860 px, so its 13 px text stays at least 10.7 px; below that it scrolls.
        const chainWidth = await page.evaluate<number>('Math.round(document.querySelector(".diagram-scroll svg").getBoundingClientRect().width)');
        if (width === 390) expect(chainWidth).toBe(860);
        else expect(chainWidth).toBeGreaterThanOrEqual(860);
      }
      await page.setViewport(1440, 900);
      await page.navigate(pathToFileURL(join(directory, 'index.html')).href);
      // Body text is the system sans, not the old serif.
      for (const selector of ['body', '.contents a', '.contents .eyebrow', '.pipeline-notice', '.marking', 'a.cite']) {
        expect(await page.evaluate(`getComputedStyle(document.querySelector(${JSON.stringify(selector)})).fontFamily.startsWith("ui-sans-serif")`), selector).toBe(true);
      }
      // A diagram wider than the column keeps its size and scrolls; its text is never shrunk.
      expect(await page.evaluate('[...document.querySelectorAll(".diagram-scroll svg")].map(svg => Math.round(svg.getBoundingClientRect().width))')).toEqual([expect.any(Number), 1848]);
      // The focus ring is inside the panel that clips it, reached by real Tabs.
      for (let i = 0; i < 6 && !await page.evaluate<boolean>('document.activeElement.matches(".nav-panel > summary")'); i++) await page.press('Tab');
      expect(await page.evaluate('document.activeElement.matches(".nav-panel > summary:focus-visible") && getComputedStyle(document.activeElement).outlineOffset')).toBe('-3px');
      // Folding gives the column back.
      const mainWidth = 'document.querySelector("main").getBoundingClientRect().width';
      const open = await page.evaluate(mainWidth) as number;
      await page.evaluate('document.querySelector(".nav-panel > summary").click()');
      expect(await page.evaluate('document.querySelector(".nav-panel").open')).toBe(false);
      expect(await page.evaluate(mainWidth) as number).toBeGreaterThan(open + 100);
      // A long chain fits without scrolling sideways at this width once the navigation has folded.
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
      // A pointer leaving a term far along its line crosses plain text before it reaches the entry, which opens from the block's left edge.
      await page.setViewport(1440, 4000);
      await page.navigate(pathToFileURL(join(directory, 'index.html')).href);
      const far = `[...document.querySelectorAll("a.term")].map(a => ({ a, r: a.getClientRects()[0] })).sort((p, q) => q.r.left - p.r.left)[0]`;
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
      // A label under the pointer draws its line, on the first diagram's first label.
      const echo = 'document.querySelector("g.edge-text path.edge-echo")';
      expect(await page.evaluate(`getComputedStyle(${echo}).display`)).toBe('none');
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
