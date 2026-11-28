import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { findBrowserExecutable, launchBrowser, type Browser, type BrowserPage } from '../cdp-browser.js';
import { POOL_LINES, codeExcerptInput } from './dossier-reading.testkit.js';
import { renderLocalDossier } from './dossier-site.js';

const executable = findBrowserExecutable();

// syzygy-3efd.33 (REQ-polaris-generation-034 version 2.54, "The numbers and bands sit on their lines, and copying takes the code alone"):
// the reading dossier's section one holds `src/pool.ts` lines 10 to 20, highlighted on 12 to 13 and 18, its line 10 (shown line 1) not
// highlighted, and noted on 12 and 18. Opened from disk with the pages' own CSP, which admits no script, at 390 and 1440 px, before and after
// the frame is scrolled to its end, and again with the excerpt's bytes in two quotation parts, the first ending inside line 15.

interface Line { readonly top: number; readonly height: number }
interface Measure {
  readonly lineHeight: number; readonly overflow: boolean; readonly lines: number;
  readonly numbers: Line[]; readonly bands: (Line & { readonly left: number; readonly right: number; readonly banded: boolean })[];
  readonly text: Line[]; readonly boxes: Line[]; readonly pre: { readonly left: number; readonly right: number };
}
/** Every line's number, band, text and line box, read from the page's own layout. A line's text box is the rect of a range over its first
 * character; its line box is the excerpt `<pre>`'s content top plus its index times the line height. */
const MEASURE = `(() => {
  const frame = document.querySelector("#element-x .code-frame");
  const [gutter, pre, bands] = frame.querySelectorAll(":scope > pre");
  const style = getComputedStyle(pre);
  const lineHeight = parseFloat(style.lineHeight);
  const top = pre.getBoundingClientRect().top + parseFloat(style.paddingTop) + parseFloat(style.borderTopWidth);
  const walker = document.createTreeWalker(pre, NodeFilter.SHOW_TEXT);
  const starts = []; let atStart = true;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    for (let i = 0; i < node.data.length; i++) { if (atStart && node.data[i] !== "\\n") { starts.push([node, i]); atStart = false; } if (node.data[i] === "\\n") atStart = true; }
  }
  const text = starts.map(([node, i]) => { const r = document.createRange(); r.setStart(node, i); r.setEnd(node, i + 1); const b = r.getBoundingClientRect(); return { top: b.top, height: b.height }; });
  const box = (e) => e.getBoundingClientRect();
  const p = box(pre);
  return {
    lineHeight, overflow: frame.scrollWidth > frame.clientWidth, lines: Math.round((p.height - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)) / lineHeight),
    numbers: [...gutter.querySelectorAll(".code-number")].map((e) => ({ top: box(e).top, height: box(e).height })),
    bands: [...bands.children].map((e) => ({ top: box(e).top, height: box(e).height, left: box(e).left, right: box(e).right, banded: e.className === "code-band" })),
    text, boxes: text.map((_, k) => ({ top: top + k * lineHeight, height: lineHeight })), pre: { left: p.left, right: p.right },
  };
})()`;

const near = (a: number, b: number): boolean => Math.abs(a - b) < 0.5;

/** Each number and band on its line, and each band across the excerpt's whole width. */
async function aligned(page: BrowserPage, label: string): Promise<Measure> {
  const m = await page.evaluate<Measure>(MEASURE);
  expect(m.lines, label).toBe(11);
  expect([m.numbers.length, m.bands.length, m.text.length], label).toEqual([11, 11, 11]);
  expect(m.bands.map((b) => b.banded), label).toEqual([false, false, true, true, false, false, false, false, true, false, false]);
  for (let k = 0; k < 11; k++) {
    // A number is set in the excerpt's font, size and line height: its box is its line's text box.
    expect([near(m.numbers[k]!.top, m.text[k]!.top), near(m.numbers[k]!.height, m.text[k]!.height)], `${label}: number of shown line ${k + 1}`).toEqual([true, true]);
    // A band is its line's whole line box, across the excerpt's whole width; an unbanded line's empty element draws nothing.
    if (!m.bands[k]!.banded) { expect(m.bands[k]!.left === m.bands[k]!.right, `${label}: unbanded shown line ${k + 1}`).toBe(true); continue; }
    expect([near(m.bands[k]!.top, m.boxes[k]!.top), near(m.bands[k]!.height, m.boxes[k]!.height)], `${label}: band of shown line ${k + 1}`).toEqual([true, true]);
    expect([near(m.bands[k]!.left, m.pre.left), near(m.bands[k]!.right, m.pre.right)], `${label}: band width of shown line ${k + 1}`).toEqual([true, true]);
  }
  return m;
}

/** The elements at a point between the 4th and 5th characters of shown line `k`, topmost first, with the bands made hit-testable for the
 * reading (the page sets them aside from the pointer): what each is and whether it paints a background there. */
const STACK = (k: number) => `(() => {
  const pre = document.querySelector("#element-x .code-frame > pre:not([class])");
  const walker = document.createTreeWalker(pre, NodeFilter.SHOW_TEXT);
  let line = 0, found;
  for (let node = walker.nextNode(); node && !found; node = walker.nextNode()) for (let i = 0; i < node.data.length; i++) {
    if (line === ${k}) { found = [node, i + 4]; break; } if (node.data[i] === "\\n") line++; }
  const r = document.createRange(); r.setStart(found[0], found[1]); r.setEnd(found[0], found[1]); const at = r.getBoundingClientRect();
  const probe = document.createElement("style"); probe.textContent = ".code-bands{pointer-events:auto!important}"; document.head.append(probe);
  const stack = document.elementsFromPoint(at.left, at.top + at.height / 2).map((e) => [e.tagName.toLowerCase() + (e.className ? "." + e.className.split(" ")[0] : ""), getComputedStyle(e).backgroundColor !== "rgba(0, 0, 0, 0)"]);
  probe.remove();
  return stack;
})()`;

/** Writes the site of `input` to a fresh directory and opens its index at `width`. */
async function open(browser: Browser, directory: string, split: boolean, width: number): Promise<BrowserPage> {
  for (const [path, content] of renderLocalDossier(codeExcerptInput(split)).files) {
    await mkdir(dirname(join(directory, path)), { recursive: true });
    await writeFile(join(directory, path), content);
  }
  const page = await browser.newPage();
  await page.setViewport(width, 900);
  await page.navigate(pathToFileURL(join(directory, 'index.html')).href);
  return page;
}

it.skipIf(executable === undefined)('sets each number and band on its line at 390 and 1440 px, scrolled and not, in one quotation part or two', async () => {
  if (!executable) throw Error('Browser required');
  let browser: Browser | undefined;
  const directories: string[] = [];
  try {
    browser = await launchBrowser(executable);
    for (const split of [false, true]) {
      for (const width of [390, 1440]) {
        const directory = await mkdtemp(join(tmpdir(), 'polaris-code-excerpt-browser-'));
        directories.push(directory);
        const page = await open(browser, directory, split, width);
        try {
          const label = `${split ? 'two parts' : 'one part'} at ${width}`;
          expect(await page.evaluate('document.scripts.length'), label).toBe(0);
          expect(await page.evaluate('document.querySelectorAll("#element-x .code-frame > pre:not([class]) > code.verified-quote").length'), label).toBe(split ? 2 : 1);
          // Line 10, shown line 1, is not highlighted: the bands open with its empty element, and the parser has dropped no line feed.
          expect(await page.evaluate('(() => { const b = document.querySelector("#element-x .code-bands"); return [b.firstChild.nodeType, b.firstChild.className, b.childElementCount, b.textContent.split("\\n").length]; })()'), label)
            .toEqual([1, 'code-unbanded', 11, 11]);
          await page.evaluate('document.querySelector("#element-x").scrollIntoView({ block: "start", behavior: "instant" })');
          const before = await aligned(page, `${label}, unscrolled`);
          if (width === 390) expect(before.overflow, label).toBe(true);
          await page.evaluate('(() => { const f = document.querySelector("#element-x .code-frame"); f.scrollLeft = f.scrollWidth; })()');
          if (width === 390) expect(await page.evaluate<boolean>('document.querySelector("#element-x .code-frame").scrollLeft > 0'), label).toBe(true);
          await aligned(page, `${label}, scrolled to its end`);
          await page.evaluate('document.querySelector("#element-x .code-frame").scrollLeft = 0');
          // Shown line 3 (line 12) is banded: at a point between two of its characters the band is the topmost element painting a
          // background, and the excerpt's text lies above it, so no background hides the band and the band hides no character.
          const stack = await page.evaluate<[string, boolean][]>(STACK(2));
          const band = stack.findIndex(([name]) => name === 'span.code-band');
          expect(band, label).toBeGreaterThan(0);
          expect(stack.slice(0, band).some(([, painted]) => painted), `${label}: ${JSON.stringify(stack)}`).toBe(false);
          expect(stack[band]![1], label).toBe(true);
          expect(stack.slice(0, band).map(([name]) => name), label).toContain('code.verified-quote');
          // Shown line 1 (line 10) is not banded: its band line paints nothing.
          const plain = await page.evaluate<[string, boolean][]>(STACK(0));
          expect(plain.some(([name]) => name === 'span.code-band'), label).toBe(false);
          expect(plain.find(([name]) => name === 'span.code-unbanded')?.[1] ?? false, label).toBe(false);
          // Selecting the whole frame and copying takes the cited lines alone: no number, mark or band.
          const copied = await page.evaluate<string>(`(() => { const s = getSelection(); s.removeAllRanges(); const r = document.createRange();
            r.selectNodeContents(document.querySelector("#element-x .code-frame")); s.addRange(r); return s.toString(); })()`);
          // The browser's serialization drops a selection's final line feed, as it does for the excerpt's `<pre>` selected alone.
          const alone = await page.evaluate<string>(`(() => { const s = getSelection(); s.removeAllRanges(); const r = document.createRange();
            r.selectNodeContents(document.querySelector("#element-x .code-frame > pre:not([class])")); s.addRange(r); return s.toString(); })()`);
          expect([copied, alone], label).toEqual([POOL_LINES.slice(9, 20).join('\n'), POOL_LINES.slice(9, 20).join('\n')]);
          // Following `Read note 2` makes p-free's block the page's target.
          await page.evaluate('document.querySelectorAll("#element-x a.code-note")[1].focus()');
          await page.press('Enter');
          await page.evaluate('new Promise(resolve => setTimeout(resolve, 300))');
          expect(await page.evaluate('[...document.querySelectorAll(":target")].map(e => e.id)'), label).toEqual(['block-p-free']);
          expect(await page.evaluate('document.scripts.length'), label).toBe(0);
        } finally {
          await page.close();
        }
      }
    }
  } finally {
    await browser?.close();
    for (const directory of directories) await rm(directory, { recursive: true, force: true });
  }
}, 120_000);
