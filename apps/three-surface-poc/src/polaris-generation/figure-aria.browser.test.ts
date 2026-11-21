import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { findBrowserExecutable, launchBrowser, type Browser } from '../cdp-browser.js';
import { figureKindsInput, readingInput } from './dossier-reading.testkit.js';
import { renderLocalDossier } from './dossier-site.js';

const executable = findBrowserExecutable();
/** Per drawing on the page: whether each id its aria references name resolves in the DOM, and the element it resolves to. */
const RESOLVED = `[...document.querySelectorAll("svg[role=img]")].map(svg => ["aria-labelledby", "aria-describedby"].map(attribute => {
  const target = document.getElementById(svg.getAttribute(attribute));
  return target === null ? "nothing" : target.tagName.toLowerCase() + (target.closest("figure") === svg.closest("figure") ? "" : " elsewhere");
}))`;

// syzygy-3efd.70: in Chrome, opened from disk as a reader opens a dossier, each figure's drawing takes its accessible name from its
// caption, as the browser computes it, and its description reference resolves to the figure's own list.
it.skipIf(executable === undefined)('names each drawing by its caption in the browser\'s accessibility tree, graph, sequence and swimlane', async () => {
  if (!executable) throw Error('Browser required');
  let browser: Browser | undefined;
  const directories: string[] = [];
  try {
    browser = await launchBrowser(executable);
    for (const [name, files, names] of [
      ['graph', renderLocalDossier(readingInput()).files, ['Flow', 'Loop', 'Pair']],
      ['kinds', renderLocalDossier(figureKindsInput()).files, ['Handshake', 'Release']],
    ] as const) {
      const directory = await mkdtemp(join(tmpdir(), `polaris-figure-aria-${name}-`));
      directories.push(directory);
      for (const [path, content] of files) {
        await mkdir(dirname(join(directory, path)), { recursive: true });
        await writeFile(join(directory, path), content);
      }
      const page = await browser.newPage();
      try {
        await page.setViewport(1440, 900);
        await page.navigate(pathToFileURL(join(directory, 'index.html')).href);
        expect(await page.evaluate(RESOLVED), name).toEqual(names.map(() => ['figcaption', 'details']));
        expect(await page.accessibleNames('[...document.querySelectorAll("svg[role=img]")]'), name).toEqual(names);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser?.close();
    for (const directory of directories) await rm(directory, { recursive: true, force: true });
  }
}, 60_000);
