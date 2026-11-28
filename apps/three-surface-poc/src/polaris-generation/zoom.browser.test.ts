import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { findBrowserExecutable, launchBrowser, type Browser } from '../cdp-browser.js';
import { zoomInput } from './dossier-reading.testkit.js';
import { renderLocalDossier } from './dossier-site.js';

const executable = findBrowserExecutable();

// syzygy-3efd.39 (REQ-polaris-generation-034 version 2.50): the reading flow as a context view about node b, whose own view `parts` is on
// deep dive `runtime`, opened from disk with the pages' own CSP, which admits no script. Moving the keyboard focus forward from the start of
// the figure reaches the zoom link before any link of the figure's lists; it shows a solid outline; following it opens the deep dive with
// `figure-parts` as the target; and the zoom-only layer passes the pointer to the drawing everywhere but over the zoom link.
it.skipIf(executable === undefined)('reaches the zoom link first by keyboard, outlines it, follows it to its target, and passes the pointer through', async () => {
  if (!executable) throw Error('Browser required');
  const directory = await mkdtemp(join(tmpdir(), 'polaris-zoom-browser-'));
  let browser: Browser | undefined;
  try {
    for (const [path, content] of renderLocalDossier(zoomInput()).files) {
      await mkdir(dirname(join(directory, path)), { recursive: true });
      await writeFile(join(directory, path), content);
    }
    browser = await launchBrowser(executable);
    const page = await browser.newPage();
    try {
      await page.setViewport(1440, 900);
      await page.navigate(pathToFileURL(join(directory, 'index.html')).href);
      expect(await page.evaluate('document.scripts.length')).toBe(0);
      // Focus a tabbable placed just before the figure, then move forward: the first link reached in it is the zoom link.
      await page.evaluate(`(() => { const start = document.createElement("a"); start.href = "#start"; start.id = "start"; start.textContent = "start";
        const figure = document.querySelector("#figure-flow"); figure.parentNode.insertBefore(start, figure); start.focus(); })()`);
      await page.press('Tab');
      expect(await page.evaluate('[document.activeElement.className, document.activeElement.getAttribute("href")]')).toEqual(['zoom-link', 'deep-dives/runtime.html#figure-parts']);
      expect(await page.evaluate('document.activeElement.matches(":focus-visible")')).toBe(true);
      expect(await page.evaluate('(() => { const s = getComputedStyle(document.activeElement); return [s.outlineStyle, s.outlineWidth, s.cursor]; })()')).toEqual(['solid', '3px', 'pointer']);
      // The zoom link sits at its box's top right and leaves the rest of the box to the drawing.
      expect(await page.evaluate(`(() => { const link = document.activeElement.getBoundingClientRect(), box = document.activeElement.parentElement.getBoundingClientRect();
        return [link.right === box.right, link.top === box.top, link.width < box.width / 4, link.height < box.height / 2]; })()`)).toEqual([true, true, true, true]);
      // Over the centre of node a's box, which links nothing, the pointer reaches the drawing's own node, not the layer.
      const at = await page.evaluate<number[]>('(() => { const node = document.querySelectorAll("#figure-flow .walk-node")[0]; node.scrollIntoView({ block: "center", behavior: "instant" }); const r = node.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()');
      expect(await page.evaluate(`document.elementFromPoint(${at[0]}, ${at[1]}).closest("svg") !== null`)).toBe(true);
      await page.mouseMove(at[0]!, at[1]!);
      expect(await page.evaluate('getComputedStyle(document.querySelectorAll("#figure-flow .walk-node")[0]).outlineStyle')).toBe('none');
      await page.evaluate('document.querySelector("#figure-flow .zoom-link").focus()');
      await page.press('Enter');
      await page.evaluate('new Promise(resolve => setTimeout(resolve, 300))');
      expect(await page.evaluate('location.pathname.endsWith("/deep-dives/runtime.html")')).toBe(true);
      expect(await page.evaluate('location.hash')).toBe('#figure-parts');
      expect(await page.evaluate('[...document.querySelectorAll(":target")].map(e => e.id)')).toEqual(['figure-parts']);
      expect(await page.evaluate('document.scripts.length')).toBe(0);
    } finally {
      await page.close();
    }
  } finally {
    await browser?.close();
    await rm(directory, { recursive: true, force: true });
  }
}, 60_000);
