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
      const popup = 'getComputedStyle(document.querySelector("a.term > .term-pop")).display';
      expect(await page.evaluate(popup)).toBe('none');
      await page.evaluate('document.querySelector("a.term").focus()');
      expect(await page.evaluate(popup)).toBe('block');
      // An open entry stays on the page, at the width that used to overflow.
      // At the narrow width the first navigation stop is the mobile panel's summary, with the same clipped ring to avoid.
      await page.setViewport(390, 900);
      await page.navigate(pathToFileURL(join(directory, 'index.html')).href);
      for (let i = 0; i < 6 && !await page.evaluate<boolean>('document.activeElement.matches(".mobile-contents > summary")'); i++) await page.press('Tab');
      expect(await page.evaluate('document.activeElement.matches(".mobile-contents > summary:focus-visible") && getComputedStyle(document.activeElement).outlineOffset')).toBe('-3px');
      await page.setViewport(500, 900);
      await page.navigate(pathToFileURL(join(directory, 'index.html')).href);
      const terms = await page.evaluate('document.querySelectorAll("a.term").length') as number;
      expect(terms).toBeGreaterThan(5);
      for (let term = 0; term < terms; term++) {
        await page.evaluate(`document.querySelectorAll("a.term")[${term}].focus()`);
        expect(await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), `term ${term}`).toBe(true);
      }
    } finally {
      await page.close();
    }
  } finally {
    await browser?.close();
    await rm(directory, { recursive: true, force: true });
  }
}, 60_000);
