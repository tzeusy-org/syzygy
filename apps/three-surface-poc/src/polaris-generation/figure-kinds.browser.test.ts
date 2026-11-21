import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { findBrowserExecutable, launchBrowser, type Browser } from '../cdp-browser.js';
import { figureKindsInput } from './dossier-reading.testkit.js';
import { renderLocalDossier } from './dossier-site.js';

const executable = findBrowserExecutable();
/** Per figure kind: which form displays, the forms box's width, and whether the displayed form or the page scrolls sideways. */
const FORMS = `[...document.querySelectorAll("figure[data-figure-kind]")].map(f => {
  const forms = f.querySelector(".figure-forms"), drawing = f.querySelector(".figure-drawing"), stepper = f.querySelector(".figure-stepper");
  const shown = el => getComputedStyle(el).display !== "none";
  return { kind: f.dataset.figureKind, drawing: shown(drawing), stepper: shown(stepper), box: forms.clientWidth,
    overflow: forms.scrollWidth > forms.clientWidth || (shown(drawing) && drawing.scrollWidth > drawing.clientWidth) || (shown(stepper) && stepper.scrollWidth > stepper.clientWidth),
    items: shown(stepper) ? [...stepper.children].map(li => li.innerText.replace(/\\s+/g, " ").trim()) : [] };
})`;

// syzygy-3efd.30 (REQ-polaris-generation-034 version 2.5): opened from disk with the pages' own CSP, as a reader opens a dossier. At 1440 px
// each figure shows its drawing; at 390 px its phone form, a numbered list that wraps, with no script and no sideways scroll.
it.skipIf(executable === undefined)('shows the drawing at 1440 px and the numbered stepper at 390 px, with no sideways scroll', async () => {
  if (!executable) throw Error('Browser required');
  const directory = await mkdtemp(join(tmpdir(), 'polaris-figure-kinds-browser-'));
  let browser: Browser | undefined;
  try {
    for (const [path, content] of renderLocalDossier(figureKindsInput()).files) {
      await mkdir(dirname(join(directory, path)), { recursive: true });
      await writeFile(join(directory, path), content);
    }
    browser = await launchBrowser(executable);
    const page = await browser.newPage();
    try {
      await page.setViewport(1440, 900);
      await page.navigate(pathToFileURL(join(directory, 'index.html')).href);
      expect(await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')).toBe(true);
      expect(await page.evaluate(FORMS)).toEqual([
        { kind: 'sequence', drawing: true, stepper: false, box: 966, overflow: false, items: [] },
        { kind: 'swimlane', drawing: true, stepper: false, box: 966, overflow: false, items: [] }]);
      // The drawing is drawn at its laid-out width, its text at 13 px.
      expect(await page.evaluate('[...document.querySelectorAll(".figure-drawing svg")].map(svg => Math.round(svg.getBoundingClientRect().width))')).toEqual([592, 592]);

      await page.setViewport(390, 900);
      await page.navigate(pathToFileURL(join(directory, 'index.html')).href);
      expect(await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')).toBe(true);
      expect(await page.evaluate(FORMS)).toEqual([
        { kind: 'sequence', drawing: false, stepper: true, box: 261, overflow: false,
          items: ['Client → Server opens a connection', 'Server → Store <disk> reads the stored record for the key it was asked about', 'Server → Server checks its cache ?', 'Server → Client replies'] },
        { kind: 'swimlane', drawing: false, stepper: true, box: 261, overflow: false,
          items: ['Developer writes the change', 'Developer opens a pull request', 'CI runs the tests', 'Operator tags a release ?', 'Operator watches the rollout'] }]);
      // The swimlane reads as an ordered list, numbered, at the 13 px figure text, each item's left border styled by its mark.
      expect(await page.evaluate(`(() => { const ol = document.querySelector("figure[data-figure-kind=swimlane] .figure-stepper"); const li = [...ol.children];
        return [ol.tagName, getComputedStyle(li[0]).listStyleType, getComputedStyle(ol).fontSize, li.map(item => getComputedStyle(item).borderLeftStyle)]; })()`))
        .toEqual(['OL', 'decimal', '13px', ['dashed', 'dashed', 'dashed', 'dotted', 'dashed']]);
      // A label with no break opportunity still wraps within the box (overflow-wrap: anywhere): the test writes one into an item.
      expect(await page.evaluate(`(() => { const ol = document.querySelector("figure[data-figure-kind=swimlane] .figure-stepper");
        ol.lastElementChild.append(" " + "x".repeat(120)); return ol.scrollWidth <= ol.clientWidth; })()`)).toBe(true);
      expect(await page.evaluate('document.scripts.length')).toBe(0);
    } finally {
      await page.close();
    }
  } finally {
    await browser?.close();
    await rm(directory, { recursive: true, force: true });
  }
}, 60_000);
