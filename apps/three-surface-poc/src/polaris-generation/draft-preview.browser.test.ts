import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import type { ProviderDraft } from '@syzygy/polaris-generation-core';
import { findBrowserExecutable, launchBrowser, type Browser } from '../cdp-browser.js';
import { renderDraftPreview } from './draft-preview.js';
import { runSyntheticProject, syntheticProjects } from './pipeline-demo.js';

const executable = findBrowserExecutable();
it.skipIf(executable === undefined)('renders the pipeline draft with working diagram, source and keyboard deep-dive paths at both widths', async () => {
  if (!executable) throw Error('Browser required for pipeline preview verification');
  const directory = await mkdtemp(join(tmpdir(), 'polaris-draft-browser-'));
  // The launch is inside the try: a launch that fails still removes the directory (syzygy-bpyt.4.11).
  let browser: Browser | undefined;
  try {
    browser = await launchBrowser(executable);
    const run = await runSyntheticProject(syntheticProjects[0]!);
    if (run.result.status !== 'awaiting-rendered-review') throw Error(run.result.reason);
    const file = join(directory, 'preview.html');
    await writeFile(file, renderDraftPreview(run.result.draft as ProviderDraft, run.sources));
    const page = await browser.newPage();
    try {
      for (const width of [1440, 390]) {
        await page.setViewport(width, 900);
        await page.navigate(pathToFileURL(file).href);
        expect(await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')).toBe(true);
        expect(await page.evaluate('document.querySelectorAll("svg[role=img]").length')).toBe(1);
        expect(await page.evaluate('Array.from(document.querySelectorAll("a[href^=\\\"#\\\"]")).every(a => document.getElementById(a.hash.slice(1)))')).toBe(true);
        await page.evaluate('document.querySelector(".deep-dive summary").focus()');
        await page.press('Enter');
        expect(await page.evaluate('document.querySelector(".deep-dive details").open')).toBe(true);
        await page.evaluate('document.querySelector("main .sources a").focus()');
        await page.press('Enter');
        expect(await page.evaluate('location.hash === document.querySelector("main .sources a").getAttribute("href")')).toBe(true);
        expect(await page.evaluate('location.hash')).not.toBe('#source-0');
        const tree = await page.axTree();
        expect(tree.some(node => !node.ignored && node.role === 'heading' && node.name === syntheticProjects[0]!.title)).toBe(true);
        expect(tree.some(node => !node.ignored && node.role === 'image' && node.name === 'From observation to useful context')).toBe(true);
      }
    } finally { await page.close(); }
  } finally {
    try { await browser?.close(); }
    finally { await rm(directory, { recursive: true, force: true }); }
  }
}, 30_000); // a pipeline draft in a real browser: timed out at the 5 s default in 1 of 5 full-suite runs at load1 38-71, up to 4.1 s in the others (docs/evidence/syzygy-bpyt-4-31/full-runs.json)
