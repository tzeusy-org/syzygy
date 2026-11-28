import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { findBrowserExecutable, launchBrowser, type Browser } from '../cdp-browser.js';
import { walkInput } from './dossier-reading.testkit.js';
import { renderLocalDossier } from './dossier-site.js';

const executable = findBrowserExecutable();

// syzygy-3efd.88 (REQ-polaris-generation-034 version 2.40): the walked reading flow opened from disk with the pages' own CSP, which admits
// no script, as a reader opens a dossier. Following a step's link makes that step's box, and no other, the page's target, outlined by the
// stylesheet's `:target` rule in a dashed line (a shape, not a colour alone); the next Tab reaches that box's own source link.
it.skipIf(executable === undefined)('highlights a step\'s box by :target with no script, and the next Tab reaches its source link', async () => {
  if (!executable) throw Error('Browser required');
  const directory = await mkdtemp(join(tmpdir(), 'polaris-walk-browser-'));
  let browser: Browser | undefined;
  try {
    for (const [path, content] of renderLocalDossier(walkInput()).files) {
      await mkdir(dirname(join(directory, path)), { recursive: true });
      await writeFile(join(directory, path), content);
    }
    browser = await launchBrowser(executable);
    const page = await browser.newPage();
    try {
      await page.setViewport(1440, 900);
      await page.navigate(pathToFileURL(join(directory, 'index.html')).href);
      expect(await page.evaluate('document.scripts.length')).toBe(0);
      // Tab order: the boxes' source links in the drawing's node order, then the walk's list in step order.
      expect(await page.evaluate(`[...document.querySelectorAll("#figure-flow a")].filter(a => !a.closest("details")).map(a => a.getAttribute("href"))`)).toEqual([
        'sources/6e042a3d943e7663eb4d591e.html#exact-text', 'sources/6e042a3d943e7663eb4d591e.html#L1', 'sources/6e042a3d943e7663eb4d591e.html#exact-text',
        'sources/6e042a3d943e7663eb4d591e.html#exact-text', '#walk-flow-1', '#block-forms', '#walk-flow-2', '#block-forms', '#walk-flow-3', '#block-forms']);
      // From the first item's paragraph link, one Tab reaches the second item's first link; Enter follows it.
      await page.evaluate('document.querySelector(".figure-walk li:nth-child(1) .walk-text").focus()');
      await page.press('Tab');
      expect(await page.evaluate('document.activeElement.getAttribute("href")')).toBe('#walk-flow-2');
      await page.press('Enter');
      await page.evaluate('new Promise(resolve => setTimeout(resolve, 100))');
      expect(await page.evaluate('location.hash')).toBe('#walk-flow-2');
      expect(await page.evaluate('[...document.querySelectorAll(":target")].map(e => e.id)')).toEqual(['walk-flow-2']);
      expect(await page.evaluate(`(() => { const box = getComputedStyle(document.querySelector("#walk-flow-2")), other = getComputedStyle(document.querySelector("#walk-flow-1"));
        return [box.outlineStyle, box.outlineWidth, other.outlineStyle]; })()`)).toEqual(['dashed', '3px', 'none']);
      // The box lies over its node's rect, and the drawing shows through it.
      expect(await page.evaluate(`(() => { const box = document.querySelector("#walk-flow-2").getBoundingClientRect(), rect = [...document.querySelectorAll("#figure-flow svg g.node rect")][4].getBoundingClientRect();
        return [box.left === rect.left, box.top === rect.top, box.width, box.height, getComputedStyle(document.querySelector("#walk-flow-2")).backgroundColor]; })()`)).toEqual([true, true, 200, 56, 'rgba(0, 0, 0, 0)']);
      await page.press('Tab');
      expect(await page.evaluate('[document.activeElement.className, document.activeElement.parentElement.id]')).toEqual(['walk-source', 'walk-flow-2']);
      // No fragment target the walk adds or links lies in a collapsible section.
      expect(await page.evaluate('[...document.querySelectorAll("[id^=walk-], #block-forms")].filter(e => e.closest("details")).length')).toBe(0);
    } finally {
      await page.close();
    }
  } finally {
    await browser?.close();
    await rm(directory, { recursive: true, force: true });
  }
}, 60_000);
