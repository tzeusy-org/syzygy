import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { findBrowserExecutable, launchBrowser, type Browser } from '../cdp-browser.js';
import { containmentInput } from './dossier-reading.testkit.js';
import { renderLocalDossier } from './dossier-site.js';

const executable = findBrowserExecutable();
/** Which of the containment's forms displays, its box's width, any sideways scroll, and the outline's items as nested text. */
const FORMS = `(() => { const f = document.querySelector("figure[data-figure-kind=containment]");
  const forms = f.querySelector(".figure-forms"), drawing = f.querySelector(".figure-drawing"), outline = f.querySelector(".figure-outline");
  const shown = el => getComputedStyle(el).display !== "none";
  const items = ul => [...ul.children].map(li => [li.firstChild.textContent, li.querySelector(":scope > ul") === null ? [] : items(li.querySelector(":scope > ul"))]);
  return { drawing: shown(drawing), outline: shown(outline), box: forms.clientWidth,
    overflow: forms.scrollWidth > forms.clientWidth || (shown(drawing) && drawing.scrollWidth > drawing.clientWidth) || (shown(outline) && outline.scrollWidth > outline.clientWidth),
    items: shown(outline) ? items(outline) : [] }; })()`;

// syzygy-3efd.31 (REQ-polaris-generation-034 version 2.23): opened from disk with the pages' own CSP. At 1440 px the containment shows its
// drawing at its laid-out width; at 390 px its phone form, a nested list at 13 px whose items' borders follow their marks, with no script and
// no sideways scroll.
it.skipIf(executable === undefined)('shows the boxes at 1440 px and the nested outline at 390 px, with no sideways scroll', async () => {
  if (!executable) throw Error('Browser required');
  const directory = await mkdtemp(join(tmpdir(), 'polaris-containment-browser-'));
  let browser: Browser | undefined;
  try {
    for (const [path, content] of renderLocalDossier(containmentInput()).files) {
      await mkdir(dirname(join(directory, path)), { recursive: true });
      await writeFile(join(directory, path), content);
    }
    browser = await launchBrowser(executable);
    const page = await browser.newPage();
    try {
      await page.setViewport(1440, 900);
      await page.navigate(pathToFileURL(join(directory, 'index.html')).href);
      expect(await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')).toBe(true);
      expect(await page.evaluate(FORMS)).toEqual({ drawing: true, outline: false, box: 966, overflow: false, items: [] });
      expect(await page.evaluate('Math.round(document.querySelector(".figure-drawing svg").getBoundingClientRect().width)')).toBe(408);
      expect(await page.evaluate('getComputedStyle(document.querySelector(".figure-drawing text")).fontSize')).toBe('13px');
      // The boundary: a forms box exactly W (408) wide shows the drawing, one 1 px narrower the outline. The test sets the box's width.
      for (const [boxPx, shown] of [[408, [true, false]], [407, [false, true]]] as const) {
        expect(await page.evaluate(`(() => { const forms = document.querySelector("figure[data-figure-kind=containment] .figure-forms"); forms.style.width = "${boxPx}px";
          return [forms.clientWidth, ...[".figure-drawing", ".figure-outline"].map(s => getComputedStyle(forms.querySelector(s)).display !== "none")]; })()`), `${boxPx} px`).toEqual([boxPx, ...shown]);
      }

      await page.setViewport(390, 900);
      await page.navigate(pathToFileURL(join(directory, 'index.html')).href);
      expect(await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')).toBe(true);
      expect(await page.evaluate(FORMS)).toEqual({ drawing: false, outline: true, box: 261, overflow: false,
        items: [['Applications', [['Web front end', [['Router ?', []]]], ['Command line', []]]], ['Packages', []]] });
      // The outline's text is the 13 px figure text; each nested list is indented 12 px; each item's left border follows its mark.
      expect(await page.evaluate(`(() => { const ul = document.querySelector(".figure-outline"); const all = [...ul.querySelectorAll("li")];
        return [getComputedStyle(ul).fontSize, getComputedStyle(ul.querySelector("ul")).paddingLeft, all.map(li => getComputedStyle(li).borderLeftStyle)]; })()`))
        .toEqual(['13px', '12px', ['dashed', 'dashed', 'dotted', 'dashed', 'dashed']]);
      // A label with no break opportunity still wraps within the box (overflow-wrap: anywhere): the test writes one into an item.
      expect(await page.evaluate(`(() => { const ul = document.querySelector(".figure-outline");
        ul.lastElementChild.append(" " + "x".repeat(120)); return ul.scrollWidth <= ul.clientWidth; })()`)).toBe(true);
      expect(await page.evaluate('document.scripts.length')).toBe(0);
    } finally {
      await page.close();
    }
  } finally {
    await browser?.close();
    await rm(directory, { recursive: true, force: true });
  }
}, 60_000);
