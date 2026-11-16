// Task 4.4 (syzygy-1z3.20) — keyboard / non-visual navigation and WCAG AA
// contrast, measured in a real browser (PWB-REQ-016, PWB-REQ-011; RFC7-31,
// RFC7-34).
//
// The oracle lives outside the renderer: a headless Chrome/Chromium driven
// through `cdp-browser.ts` enumerates the focusable population from the
// live DOM, presses real Tab / Shift+Tab / Enter keys, reads its own
// accessibility tree and reports computed colours. This file only asserts
// on what the browser reports. Without a browser the suite is *skipped*,
// never passed: `npm run poc:accessibility-check` records the evidence
// with the browser identity it ran on.
import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { findBrowserExecutable, launchBrowser, type Browser, type BrowserPage } from './cdp-browser.js';
import { aaThreshold, candidateBackdrops, checkPolarisAccessibility, composite, contrastRatio, relativeLuminance } from './polaris-accessibility.js';
import { renderProjectReading } from './polaris.js';
import { ACCESSIBILITY_VARIANTS, renderVariant, type AccessibilityVariant } from './polaris-accessibility-variants.js';
import { tempDir } from '@syzygy/test-kit';

const cleanups: string[] = [];
afterEach(() => {
  for (const directory of cleanups.splice(0)) rmSync(directory, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// The contrast arithmetic, against hand-typed WCAG reference values.

describe('WCAG contrast arithmetic (pure)', () => {
  it('computes the reference luminances and ratios', () => {
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 6);
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 6);
    expect(contrastRatio({ r: 255, g: 255, b: 255 }, { r: 0, g: 0, b: 0 })).toBeCloseTo(21, 6);
    // #777777 on white is the canonical "just fails AA" pair: 4.48:1.
    expect(contrastRatio({ r: 119, g: 119, b: 119 }, { r: 255, g: 255, b: 255 })).toBeCloseTo(4.48, 2);
    // #767676 on white passes: 4.54:1.
    expect(contrastRatio({ r: 118, g: 118, b: 118 }, { r: 255, g: 255, b: 255 })).toBeCloseTo(4.54, 2);
    // Order does not matter.
    expect(contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBeCloseTo(21, 6);
  });

  it('applies the AA thresholds by size and weight', () => {
    expect(aaThreshold(16, 400)).toBe(4.5);
    expect(aaThreshold(23.9, 400)).toBe(4.5);
    expect(aaThreshold(24, 400)).toBe(3);
    expect(aaThreshold(18.66, 700)).toBe(3);
    expect(aaThreshold(18.66, 600)).toBe(4.5);
    expect(aaThreshold(18.5, 700)).toBe(4.5);
  });

  it('composites alpha over the backdrop and forks candidates at gradients', () => {
    expect(composite({ r: 0, g: 0, b: 0, a: 0.5 }, { r: 255, g: 255, b: 255 })).toEqual({ r: 128, g: 128, b: 128 });
    expect(composite({ r: 10, g: 20, b: 30, a: 1 }, { r: 255, g: 255, b: 255 })).toEqual({ r: 10, g: 20, b: 30 });
    const opaque = candidateBackdrops({ layers: [{ r: 7, g: 16, b: 18, a: 1 }], gradients: [] });
    expect(opaque).toEqual([{ r: 7, g: 16, b: 18 }]);
    const withGradient = candidateBackdrops({ layers: [{ r: 7, g: 16, b: 18, a: 1 }], gradients: [[{ r: 23, g: 50, b: 56, a: 1 }]] });
    expect(withGradient).toEqual([
      { r: 7, g: 16, b: 18 },
      { r: 23, g: 50, b: 56 },
    ]);
    // A translucent panel over a gradient body keeps both candidates.
    const stacked = candidateBackdrops({ layers: [{ r: 7, g: 16, b: 18, a: 1 }, { r: 12, g: 24, b: 27, a: 0.5 }], gradients: [[{ r: 23, g: 50, b: 56, a: 1 }]] });
    expect(stacked).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// The browser-measured checks.

const executable = findBrowserExecutable();

describe.skipIf(executable === undefined)('Polaris keyboard, non-visual and contrast checks in a real browser', () => {
  let browser: Browser;
  let pages: string;
  const rendered = new Map<string, { readonly url: string; readonly expectedTargets: readonly string[] }>();

  beforeAll(async () => {
    browser = await launchBrowser(executable as string);
    pages = tempDir('syzygy-poc-a11y-');
    // A fresh Chrome's first render of the page carries cold costs (model
    // build, first renderer and layout) that the first test used to pay
    // inside its 5 s budget: over 203 CI attempts that test ran at p50
    // 1003 ms against 467-623 ms for its siblings, and once timed out at
    // 5011 ms (syzygy-c46a). Pay them here, under this hook's budget.
    const warm = await browser.newPage();
    try { await warm.navigate(pageUrl(ACCESSIBILITY_VARIANTS[0] as AccessibilityVariant).url); }
    finally { await warm.close(); }
  }, 60_000); // launches Chrome and loads one page: up to 2.8 s in 10 alone runs, but a full-suite run at load1 56-58 left up to 8.0 s of its file's time to its hooks (docs/evidence/syzygy-bpyt-4-31/full-runs.json)

  afterAll(async () => {
    await browser?.close();
  });

  function pageUrl(variant: AccessibilityVariant): { readonly url: string; readonly expectedTargets: readonly string[] } {
    const cached = rendered.get(variant.id);
    if (cached !== undefined) return cached;
    const page = renderVariant(variant, cleanups);
    const file = join(pages, `${variant.id}.html`);
    writeFileSync(file, page.html);
    const result = { url: pathToFileURL(file).href, expectedTargets: page.expectedTargets };
    rendered.set(variant.id, result);
    return result;
  }

  it('keeps a separate desktop section rail and an in-flow mobile drawer', async () => {
    const { url } = pageUrl(ACCESSIBILITY_VARIANTS[0] as AccessibilityVariant);
    const page = await browser.newPage();
    try {
      await page.setViewport(1440, 1000);
      await page.navigate(url);
      const wide = await page.evaluate<{ open: boolean; separate: boolean; fits: boolean }>(`(() => {
        const rail = document.querySelector('.reading-sidebar').getBoundingClientRect();
        const main = document.querySelector('main').getBoundingClientRect();
        return { open: document.querySelector('.contents-list').open,
          separate: rail.right < main.left, fits: document.documentElement.scrollWidth <= innerWidth };
      })()`);
      expect(wide).toEqual({ open: true, separate: true, fits: true });
      await page.evaluate(`document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, 1600)`);
      const pinned = await page.evaluate<boolean>(`(() => {
        const rail = document.querySelector('.reading-sidebar').getBoundingClientRect();
        const nav = document.querySelector('.site-nav').getBoundingClientRect();
        return rail.top >= nav.bottom && rail.bottom <= innerHeight;
      })()`);
      expect(pinned).toBe(true);
      await page.setViewport(390, 844);
      await page.navigate('about:blank');
      await page.navigate(url);
      expect(await page.evaluate<boolean>(`!document.querySelector('.contents-list').open && getComputedStyle(document.querySelector('.reading-sidebar')).position === 'static' && document.documentElement.scrollWidth <= innerWidth`)).toBe(true);
      await page.evaluate(`document.querySelector('.contents-list summary').focus()`);
      await page.press('Enter');
      expect(await page.evaluate<boolean>(`document.querySelector('.contents-list').open`)).toBe(true);
      await page.evaluate(`document.documentElement.style.scrollBehavior = 'auto'; const rail = document.querySelector('.reading-sidebar'); scrollTo(0, rail.offsetTop + rail.offsetHeight + 100)`);
      expect(await page.evaluate<boolean>(`document.querySelector('.reading-sidebar').getBoundingClientRect().bottom <= 0`)).toBe(true);
      await page.evaluate(`document.querySelector('.quick-links a').click()`);
      const destination = await page.evaluate<{ top: number; navBottom: number }>(`({ top: document.querySelector('#polaris-group-v1').getBoundingClientRect().top, navBottom: document.querySelector('.site-nav').getBoundingClientRect().bottom })`);
      expect(destination.top).toBeGreaterThanOrEqual(destination.navBottom);
    } finally { await page.close(); }
  });

  it('keeps diagram labels legible and flow order unambiguous across widths', async () => {
    const rendered = renderVariant(ACCESSIBILITY_VARIANTS[0] as AccessibilityVariant, cleanups);
    const short = '```flow\nReceive --> Classify --> Route --> Spawn --> Act --> Log\n```';
    const long = '```flow\n' + Array.from({ length: 12 }, (_, index) => 'Stage ' + (index + 1)).join(' --> ') + '\n```';
    const relation = '```relations\n' + JSON.stringify([{ from: 'External clients', to: 'Module tools', description: 'Clients call the declared tool interface.' }]) + '\n```';
    const diagrams = renderProjectReading({ summary: short + '\n\n' + long + '\n\n' + relation, full: '', condensed: false,
      figures: [{ id: 'runtime', title: 'Inside the runtime', nodes: ['Daemon', 'Sessions', 'Tools'], explanation: 'Daemon spawns sessions. Sessions call tools.' }] });
    const file = join(pages, 'diagram-layout.html');
    writeFileSync(file, rendered.html.replace('</main>', `<div data-copy-role="project-fact">${diagrams}</div></main>`));
    const page = await browser.newPage();
    try {
      for (const width of [1440, 390]) {
        await page.setViewport(width, 1000);
        await page.navigate('about:blank');
        await page.navigate(pathToFileURL(file).href);
        const report = await page.evaluate<{ fits: boolean; legible: boolean; shortOrdered: boolean; longOrdered: boolean; figureVisible: boolean }>(`(() => {
          const flows = [...document.querySelectorAll('.source-flow')].filter(flow => !flow.closest('.source-figure')).map(flow => [...flow.querySelectorAll('.flow-node')].map(node => node.getBoundingClientRect()));
          const vertical = nodes => nodes.every((node, index) => index === 0 || node.top > nodes[index - 1].bottom);
          const labels = [...document.querySelectorAll('.flow-node, .relationship-nodes strong')];
          return { fits: document.documentElement.scrollWidth <= innerWidth,
            legible: labels.every(node => parseFloat(getComputedStyle(node).fontSize) >= 12 && node.getBoundingClientRect().width >= 40),
            shortOrdered: innerWidth > 800 ? flows[0].every(node => Math.abs(node.top - flows[0][0].top) < 1) : vertical(flows[0]),
            longOrdered: vertical(flows[1]),
            figureVisible: document.querySelector('[data-diagram-id="runtime"]').closest('details') === null && document.querySelectorAll('[data-diagram-id="runtime"] .flow-node').length === 3 };
        })()`);
        expect(report).toEqual({ fits: true, legible: true, shortOrdered: true, longOrdered: true, figureVisible: true });
      }
    } finally { await page.close(); }
  });

  it('opens a linked component guide and can reveal the complete declaration', async () => {
    const rendered = renderVariant(ACCESSIBILITY_VARIANTS[0] as AccessibilityVariant, cleanups);
    const guides = renderProjectReading({ summary: 'The two components have separate responsibilities.',
      full: 'Runtime\n\nKeeps time.\n\nTools\n\nExpose actions.', condensed: true,
      chapters: [{ id: 'test-runtime', title: 'Runtime', body: 'Keeps time.' }, { id: 'test-tools', title: 'Tools', body: 'Expose actions.' }] });
    const file = join(pages, 'component-guides.html');
    writeFileSync(file, rendered.html.replace('</main>', `<a id="guide-test-link" href="#polaris-guide-test-tools">Read tools</a><div data-copy-role="project-fact">${guides}</div></main>`));
    const page = await browser.newPage();
    try {
      await page.setViewport(390, 844);
      await page.navigate(pathToFileURL(file).href);
      expect(await page.evaluate<number>(`document.querySelectorAll('[data-component-guide] details[open]').length`)).toBe(0);
      // Native hashchange is queued after click. A fast collapse must survive it.
      expect(await page.evaluate<number>(`(async () => {
        const navigation = new Promise(resolve => addEventListener('hashchange', resolve, { once: true }));
        document.querySelector('#guide-test-link').click();
        const button = document.querySelector('.expand-declaration');
        button.click();
        button.click();
        await navigation;
        return document.querySelectorAll('[data-component-guide] details[open]').length;
      })()`)).toBe(0);
      await page.evaluate(`document.querySelector('#guide-test-link').focus()`);
      await page.press('Enter');
      expect(await page.evaluate<boolean>(`document.querySelector('#polaris-guide-test-tools details').open && document.querySelector('#polaris-guide-test-tools').closest('details') === null`)).toBe(true);
      await page.evaluate(`document.querySelector('.expand-declaration').focus()`);
      await page.press('Enter');
      expect(await page.evaluate<number>(`document.querySelectorAll('[data-component-guide] details[open]').length`)).toBe(2);
      expect(await page.evaluate<string>(`document.querySelector('.expand-declaration').getAttribute('aria-expanded')`)).toBe('true');
      await page.press('Enter');
      expect(await page.evaluate<number>(`document.querySelectorAll('[data-component-guide] details[open]').length`)).toBe(0);
      // Leaving the guide and returning through browser history is a new navigation.
      await page.evaluate(`new Promise(resolve => {
        addEventListener('hashchange', resolve, { once: true });
        location.hash = '#polaris-group-architecture';
      })`);
      expect(await page.evaluate<boolean>(`new Promise(resolve => {
        addEventListener('hashchange', () => resolve(document.querySelector('#polaris-guide-test-tools details').open), { once: true });
        history.back();
      })`)).toBe(true);
    } finally { await page.close(); }
  });

  it('keeps complete source columns visible while citation targets remain keyboard-reachable', async () => {
    const { url } = pageUrl(ACCESSIBILITY_VARIANTS[0] as AccessibilityVariant);
    const page = await browser.newPage();
    try {
      await page.navigate(url);
      expect(await page.evaluate<boolean>(`(() => { const index = document.querySelector('[data-source-index]'); return index.scrollHeight > index.clientHeight && index.clientHeight <= innerHeight; })()`)).toBe(true);
      const id = await page.evaluate<string>(`document.querySelector('tr[data-polaris-source]').id`);
      await page.navigate('about:blank');
      await page.navigate(url + '#' + id);
      const record = await page.evaluate<{ columns: number; identityVisible: boolean; labelVisible: boolean; targetOutsideDisclosure: boolean; noRowDisclosure: boolean }>(`(() => {
        const row = document.getElementById(${JSON.stringify(id)});
        return { columns: row.querySelectorAll('td').length,
          identityVisible: row.querySelector('[data-parity-field="shape-source-identity"]').checkVisibility(),
          labelVisible: row.querySelector('.source-record-label').checkVisibility(),
          targetOutsideDisclosure: row.closest('details') === null,
          noRowDisclosure: row.querySelector('details') === null };
      })()`);
      expect(record).toEqual({ columns: 6, identityVisible: true, labelVisible: true, targetOutsideDisclosure: true, noRowDisclosure: true });
      await page.evaluate(`document.getElementById(${JSON.stringify(id)}).closest('.table-scroll').focus()`);
      expect(await page.evaluate<boolean>(`document.activeElement.classList.contains('table-scroll')`)).toBe(true);
      await page.press('Tab');
      expect(await page.evaluate<boolean>(`document.activeElement !== document.body && document.activeElement.closest('details') === null`)).toBe(true);
    } finally { await page.close(); }
  });

  it('gives seven early native shortcuts and a complete no-script outline with a truthful live hidden count', async () => {
    const rendered = renderVariant(ACCESSIBILITY_VARIANTS[0] as AccessibilityVariant, cleanups);
    const file = join(pages, 'm13-outline.html');
    writeFileSync(file, rendered.html);
    const page = await browser.newPage();
    try {
      await page.setViewport(390, 844);
      await page.navigate(pathToFileURL(file).href);
      const initial = await page.evaluate<{ headings: string[]; targets: string[]; hidden: string; outside: boolean }>(`(() => {
        const headings = [...document.querySelectorAll('main h2, main h3')];
        const targets = [...document.querySelectorAll('.contents-list a[href^="#"]')].map(link => link.getAttribute('href').slice(1));
        return { headings: headings.map(heading => heading.id), targets,
          hidden: document.querySelector('[data-outline-hidden-count]').textContent,
          outside: headings.every(heading => !!heading.id && !heading.closest('details')) };
      })()`);
      expect(initial.outside).toBe(true);
      expect(initial.headings.length).toBeGreaterThan(15);
      for (const id of initial.headings) expect(initial.targets.filter(target => target === id), id).toHaveLength(1);
      expect(initial.hidden).toBe(`${initial.targets.length} links hidden`);
      const firstTabs: (string | null)[] = [];
      for (let index = 0; index < 8; index += 1) {
        await page.press('Tab');
        firstTabs.push(await page.evaluate<string | null>(`document.activeElement.getAttribute('href')`));
      }
      expect(firstTabs).toEqual(['#main-content', '#polaris-group-overview', '#polaris-group-boundaries', '#polaris-group-v1',
        '#polaris-group-architecture', '#polaris-group-catalog', '#polaris-group-capability-detail', '#polaris-group-evidence-and-gaps']);
      await page.evaluate(`new Promise(resolve => { const drawer = document.querySelector('.contents-list'); drawer.addEventListener('toggle', resolve, { once: true }); drawer.querySelector('summary').click(); })`);
      expect(await page.evaluate<string>(`document.querySelector('[data-outline-hidden-count]').textContent`)).toBe('0 links hidden');
      await page.evaluate(`new Promise(resolve => { const drawer = document.querySelector('.contents-list'); drawer.addEventListener('toggle', resolve, { once: true }); drawer.querySelector('summary').click(); })`);
      expect(await page.evaluate<string>(`document.querySelector('[data-outline-hidden-count]').textContent`)).toBe(`${initial.targets.length} links hidden`);

      const noScriptFile = join(pages, 'm13-outline-no-script.html');
      writeFileSync(noScriptFile, rendered.html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, ''));
      await page.navigate(pathToFileURL(noScriptFile).href);
      const fallback = await page.evaluate<{ headings: number; targets: number; rows: number; count: string }>(`({
        headings: document.querySelectorAll('main h2[id], main h3[id]').length,
        targets: document.querySelectorAll('.contents-list a[href^="#"]').length,
        rows: document.querySelectorAll('tr[data-polaris-source]').length,
        count: document.querySelector('[data-outline-hidden-count]').textContent,
      })`);
      expect(fallback).toEqual({ headings: initial.headings.length, targets: initial.targets.length,
        rows: 15, count: `${initial.targets.length} links in outline` });
    } finally { await page.close(); }
  });

  it('activates more fragment links than Chrome\'s navigation budget, including a second link to the current hash', async () => {
    // syzygy-1z3.30: the live /polaris sweep failed every activation after
    // the 600th, stuck on the hash of a target linked twice. The cause was
    // Chrome's limit of 200 same-document navigations per ten seconds, not
    // the repeated link; this page crosses that budget and repeats links to
    // the hash already current, so both shapes stay pinned.
    const targets = 260;
    const links = Array.from({ length: targets }, (_, index) => {
      const link = `<a href="#t${index}">Target ${index}</a>`;
      return index % 50 === 7 ? `${link} <a href="#t${index}">Target ${index} again</a>` : link;
    }).join(' ');
    const rows = Array.from({ length: targets }, (_, index) => `<p id="t${index}">Row ${index}</p>`).join('');
    const directory = tempDir('syzygy-poc-a11y-budget-');
    const file = join(directory, 'budget.html');
    writeFileSync(file, `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Fragment budget</title><style>body{color:#000;background:#fff}a:focus{outline:2px solid #000}</style></head><body><main><h1>Fragment budget</h1><nav aria-label="Targets"><p>${links}</p></nav>${rows}</main></body></html>`);
    const page = await browser.newPage();
    try {
      const report = await checkPolarisAccessibility(page, pathToFileURL(file).href, 'fragment-budget');
      expect(report.activations).toHaveLength(targets + 6);
      expect(report.activations.filter((activation, index) => index > 0 && activation.href === report.activations[index - 1]?.href)).toHaveLength(6);
      expect(report.violations).toEqual([]);
    } finally { await page.close(); }
  }, 240_000); // over two hundred fragment activations in a real browser: worst 74.6 s over 5 alone runs at load1 20-91 (docs/evidence/syzygy-bpyt-4-31/durations/polaris-accessibility.browser.test.tests.json)

  for (const variant of ACCESSIBILITY_VARIANTS) {
    it(`${variant.id}: every distinction is keyboard-operable, named for assistive technology, and AA-contrasting`, async () => {
      const { url, expectedTargets } = pageUrl(variant);
      const page: BrowserPage = await browser.newPage();
      const report = await checkPolarisAccessibility(page, url, variant.id, { expectedTargets });
      await page.close();

      // The denominators must be real before a zero can mean anything.
      expect(report.focusTrace.population).toBeGreaterThan(10);
      expect(report.focusTrace.reached).toBe(report.focusTrace.population);
      expect(report.focusTrace.reverse).toHaveLength(report.focusTrace.forward.length);
      expect(report.activations.length).toBeGreaterThan(5);
      expect(report.accessibilityTree.nodes).toBeGreaterThan(50);
      expect(report.accessibilityTree.byRole['heading'] ?? 0).toBeGreaterThan(5);
      expect(report.accessibilityTree.byRole['link']).toBeGreaterThan(5);
      expect(report.contrast.measured).toBeGreaterThan(50);
      expect(report.contrast.minimumRatio).toBeGreaterThanOrEqual(4.5);
      expect(expectedTargets.length).toBeGreaterThan(0);

      expect(report.violations).toEqual([]);
    }, 240_000); // a full keyboard, accessibility-tree and contrast sweep of one page: worst 77.4 s over 30 alone runs (6 variants) at load1 20-91 (docs/evidence/syzygy-bpyt-4-31/durations/polaris-accessibility.browser.test.tests.json)
  }
});
