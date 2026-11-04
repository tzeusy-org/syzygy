import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { tempDir } from '@syzygy/test-kit';

import { findBrowserExecutable, launchBrowser, type Browser } from './cdp-browser.js';
import { renderOrreryPage } from './orrery.js';
import { buildFixtureModel } from './test-model-fixture.js';

const executable = findBrowserExecutable();
const cleanups: string[] = [];

afterEach(() => {
  for (const directory of cleanups.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe.skipIf(executable === undefined)('Orrery rendered geometry', () => {
  let browser: Browser;

  beforeAll(async () => {
    browser = await launchBrowser(executable as string);
  });

  afterAll(async () => {
    await browser?.close();
  });

  it('preserves district size differences and readable labels (C3-3, POC-REQ-050)', async () => {
    const model = buildFixtureModel(cleanups);
    if (model.orrery.kind !== 'observed') throw new Error('fixture must contain observed structure');
    const directory = tempDir('syzygy-orrery-geometry-');
    const file = join(directory, 'orrery.html');
    const page = await browser.newPage();
    try {
      writeFileSync(file, renderOrreryPage(model));
      await page.navigate(pathToFileURL(file).href);
      const districts = await page.evaluate<readonly { height: number; minimum: number }[]>(`
        Array.from(document.querySelectorAll('[data-district-id]')).map(element => ({
          height: element.getBoundingClientRect().height,
          minimum: parseFloat(getComputedStyle(element).minHeight)
        }))
      `);
      expect(districts).toHaveLength(model.orrery.districts.length);
      expect(new Set(districts.map((district) => district.minimum)).size).toBeGreaterThan(1);
      for (const district of districts) expect.soft(district.height).toBeCloseTo(district.minimum, 0);

      const longLabels = {
        ...model,
        orrery: {
          ...model.orrery,
          districts: model.orrery.districts.map((district) => ({ ...district, path: 'long_directory_'.repeat(12) })),
        },
      };
      writeFileSync(file, renderOrreryPage(longLabels));
      await page.navigate(pathToFileURL(file).href);
      const labels = await page.evaluate<readonly { width: number; scrollWidth: number; bottom: number; blockBottom: number }[]>(`
        Array.from(document.querySelectorAll('[data-district-id] .block-label')).map(element => ({
          width: element.clientWidth,
          scrollWidth: element.scrollWidth,
          bottom: element.getBoundingClientRect().bottom,
          blockBottom: element.parentElement.getBoundingClientRect().bottom
        }))
      `);
      expect(labels).toHaveLength(districts.length);
      for (const label of labels) {
        expect.soft(label.scrollWidth).toBeLessThanOrEqual(label.width + 1);
        expect.soft(label.bottom).toBeLessThanOrEqual(label.blockBottom);
      }
      const legend = await page.evaluate<string>(`document.querySelector('.orrery-height-legend').textContent`);
      expect(legend).toContain('minimum height');
      expect(legend).toContain('grows with relative byte size');
    } finally {
      await page.close();
    }
  });
});
