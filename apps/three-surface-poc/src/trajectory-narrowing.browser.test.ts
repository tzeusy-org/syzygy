// POC-REQ-014: the reader narrows the Trajectory board to the items marked
// with the governing-intent Unknown. Driven in Chrome over the served page:
// the checker enumerates the visible cards before and after checking the
// toggle. Every card carries the Unknown, so the narrowed board equals the
// un-narrowed one; a card this test injects without the mark proves the
// toggle narrows at all (a no-op toggle would pass the first half alone).
import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { tempDir } from '@syzygy/test-kit';

import { findBrowserExecutable, launchBrowser, type Browser } from './cdp-browser.js';
import { buildFixtureModel, fixtureWorkItemRow } from './test-model-fixture.js';
import { renderTrajectoryPage } from './trajectory.js';

const executable = findBrowserExecutable();
const cleanups: string[] = [];

afterEach(() => {
  for (const directory of cleanups.splice(0)) rmSync(directory, { recursive: true, force: true });
});

const VISIBLE_CARDS = `Array.from(document.querySelectorAll('li.wi-card')).filter(card => getComputedStyle(card).display !== 'none').map(card => card.dataset.workItemId)`;

describe.skipIf(executable === undefined)('Trajectory narrowing to the governing-intent Unknown (POC-REQ-014)', () => {
  let browser: Browser;

  beforeAll(async () => {
    browser = await launchBrowser(executable as string);
  });

  afterAll(async () => {
    await browser?.close();
  });

  it('the narrowed board lists exactly the cards the board renders, and hides an unmarked one', async () => {
    const model = buildFixtureModel(cleanups);
    const directory = tempDir('syzygy-trajectory-narrowing-');
    const file = join(directory, 'trajectory.html');
    writeFileSync(file, renderTrajectoryPage(model));
    const page = await browser.newPage();
    try {
      await page.navigate(pathToFileURL(file).href);
      const before = await page.evaluate<readonly string[]>(VISIBLE_CARDS);
      expect(before).toEqual(['bu-open1', 'bu-progress1', 'bu-blocked1', 'bu-closed-old', 'bu-closed-recent']);
      await page.evaluate(`(() => {
        const unmarked = document.querySelector('li.wi-card').cloneNode(true);
        unmarked.removeAttribute('data-governed-by');
        unmarked.dataset.workItemId = 'injected-unmarked';
        document.querySelector('ol.wi-list').appendChild(unmarked);
      })()`);
      expect(await page.evaluate<readonly string[]>(VISIBLE_CARDS)).toContain('injected-unmarked');
      await page.evaluate(`document.querySelector('label[for="narrow-governing-intent-unknown"]').click()`);
      expect(await page.evaluate<boolean>(`document.getElementById('narrow-governing-intent-unknown').checked`)).toBe(true);
      expect(await page.evaluate<readonly string[]>(VISIBLE_CARDS)).toEqual(before);
    } finally {
      await page.close();
    }
  });

  it('with items outside the selection, Space on the focused toggle keeps exactly the inside figure\'s cards', async () => {
    // Two open items and 52 closed: the selection keeps the 50 most recently
    // closed, so 52 render and 2 fall outside it.
    const rows = [
      fixtureWorkItemRow('bu-open1', 'open', '2026-08-01T00:00:00Z', '2026-08-02T00:00:00Z', null),
      fixtureWorkItemRow('bu-open2', 'in_progress', '2026-08-03T00:00:00Z', '2026-08-04T00:00:00Z', null),
      ...Array.from({ length: 52 }, (_, index) => {
        const day = index + 1;
        const instant = `2026-07-${String(Math.ceil(day / 2)).padStart(2, '0')}T${day % 2 === 0 ? '12' : '00'}:00:00Z`;
        return fixtureWorkItemRow(`bu-closed${String(day).padStart(2, '0')}`, 'closed', '2026-06-01T00:00:00Z', instant, instant);
      }),
    ];
    const model = buildFixtureModel(cleanups, { workItemRows: rows });
    const directory = tempDir('syzygy-trajectory-narrowing-');
    const file = join(directory, 'trajectory.html');
    writeFileSync(file, renderTrajectoryPage(model));
    const page = await browser.newPage();
    try {
      await page.navigate(pathToFileURL(file).href);
      const before = await page.evaluate<readonly string[]>(VISIBLE_CARDS);
      expect(before).toHaveLength(52);
      const figures = await page.evaluate<readonly string[]>(`['governed-by-unknown-count', 'governed-by-unknown-inside', 'governed-by-unknown-outside'].map(field => document.querySelector('[data-parity-field="' + field + '"]').textContent)`);
      expect(figures).toEqual(['54', '52', '2']);
      await page.evaluate(`document.getElementById('narrow-governing-intent-unknown').focus()`);
      await page.press('Space');
      expect(await page.evaluate<boolean>(`document.getElementById('narrow-governing-intent-unknown').checked`)).toBe(true);
      const after = await page.evaluate<readonly string[]>(VISIBLE_CARDS);
      expect(after).toEqual(before);
      expect(after).toHaveLength(Number(figures[1]));
    } finally {
      await page.close();
    }
  });
});
