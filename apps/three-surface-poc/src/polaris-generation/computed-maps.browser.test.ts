import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import type { LocalDerivedFact, LocalDerivedStructure, LocalManifestFacts } from '@syzygy/polaris-generation-core/live';
import { findBrowserExecutable, launchBrowser, type Browser } from '../cdp-browser.js';
import { readingInput } from './dossier-reading.testkit.js';
import { renderLocalDossier } from './dossier-site.js';

const executable = findBrowserExecutable();
const REV = 'c'.repeat(40);

/** A tree of 30 top-level directories, current, and one workflow of three jobs: the directory map draws three figures, the CI map one. */
function input() {
  const base = { rule: 'top-level-unit', ruleVersion: 1, epistemic: 'observed' as const, unknownReason: null };
  const units = Array.from({ length: 30 }, (_, i) => `directory-${String(i + 1).padStart(2, '0')}`);
  const facts: LocalDerivedFact[] = [
    { id: '_tree-root', fact: 'tree-root', ...base, path: '.', count: 1, to: null },
    ...units.map((path, i) => ({ id: `_tree-unit-${i + 1}`, fact: 'top-level-unit' as const, ...base, path, count: 3, to: null })),
    ...units.map((path, i) => ({ id: `_tree-contains-${i + 1}`, fact: 'contains' as const, ...base, path, count: null, to: `_tree-unit-${i + 1}` })),
  ];
  const derived: LocalDerivedStructure = { state: 'derived', revision: REV, recordRevision: REV, capturedAt: '2026-11-22T09:30:00.000Z', recordText: '{}\n', sha256: 'd'.repeat(64),
    currencyPolicy: null, facts, unitsNotListed: 0, countsMatch: true, tree: { files: 91, rootFiles: 1, unitsListed: 30, unitFiles: 90, unitsNotListed: 0, secretPathsLeftOut: 0, submodules: 0 } };
  const wf = '.github/workflows/ci.yml';
  const fact = (k: number, kind: string, line: number, members: Record<string, string>) => ({ id: `_manifest-${k}`, fact: kind, rule: 'github-actions-workflow', ruleVersion: 1, path: wf, lines: [line, line] as const, ...members, epistemic: 'inferred' as const });
  const manifestFacts: LocalManifestFacts = { format: 'polaris-dossier-manifest-facts/2', state: 'derived', screeningPolicy: { policyId: 'P', policyVersion: '2.0.0', sha256: 'a'.repeat(64) }, factsNotListed: 0,
    facts: [fact(1, 'workflow', 1, { name: 'CI' }), fact(2, 'job', 3, { job: 'build' }), fact(3, 'job', 5, { job: 'test' }), fact(4, 'job-needs', 6, { from: 'test', to: 'build' }), fact(5, 'job', 8, { job: 'deploy' }), fact(6, 'job-needs', 9, { from: 'deploy', to: 'test' })],
    remainder: { files: 91, secretPathsLeftOut: 0, candidates: 0, notCandidates: 91, places: [{ place: null, files: 1, notCandidates: 1 }, ...units.map((place) => ({ place, files: 3, notCandidates: 3 }))],
      placesNotListed: 0, filesInPlacesNotListed: 0, notCandidatesInPlacesNotListed: 0 },
    recognizers: ['npm-package-manifest', 'cargo-manifest', 'python-project-manifest', 'go-module-manifest', 'github-actions-workflow',
      'compose-file', 'kubernetes-manifest', 'terraform-configuration', 'makefile', 'cmake-lists'].map((rule) => ({ rule, ruleVersion: 1, label: 'inferred' as const,
      candidates: rule === 'github-actions-workflow' ? 1 : 0, secretPathsLeftOut: 0, setApart: 0, inferred: rule === 'github-actions-workflow' ? 1 : 0, unknown: 0, valuesLeftOut: 0, facts: rule === 'github-actions-workflow' ? 6 : 0,
      files: rule === 'github-actions-workflow' ? [{ path: wf, epistemic: 'inferred' as const, unknownReason: null, parseFault: null, facts: 6, valuesLeftOut: 0 }] : [], filesNotListed: 0 })) };
  const reading = readingInput();
  return { ...reading, local: { ...reading.local, derivedStructure: derived, manifestFacts } };
}

/** Per map figure: which form displays, the forms box's width, the drawing's rendered width, whether anything scrolls sideways, and the
 * text form's items where it shows. */
const FORMS = `[...document.querySelectorAll("figure.computed-map")].map(f => {
  const forms = f.querySelector(".map-forms"), drawing = f.querySelector(".map-drawing"), list = f.querySelector(".map-list");
  const shown = el => getComputedStyle(el).display !== "none";
  return { width: Number(forms.dataset.figureWidth), drawing: shown(drawing), list: shown(list), box: forms.clientWidth,
    svg: shown(drawing) ? Math.round(drawing.querySelector("svg").getBoundingClientRect().width) : null,
    overflow: forms.scrollWidth > forms.clientWidth || (shown(drawing) && drawing.scrollWidth > drawing.clientWidth) || (shown(list) && list.scrollWidth > list.clientWidth),
    items: shown(list) ? [...list.children].length : 0, font: getComputedStyle(list).fontSize };
})`;

// syzygy-3efd.36 (REQ-polaris-generation-034 version 2.9): a map page opened from disk with the pages' own CSP. At 1440 px each map figure
// shows its drawing unscaled; at 390 px a figure wider than the 261 px column shows its text form at 13 px, switched by the container
// query, and a narrower one its drawing, unscaled, with no script and no sideways scroll.
it.skipIf(executable === undefined)('switches each map figure to its text form below its laid-out width, never scaling the drawing', async () => {
  if (!executable) throw Error('Browser required');
  const directory = await mkdtemp(join(tmpdir(), 'polaris-computed-maps-browser-'));
  let browser: Browser | undefined;
  try {
    for (const [path, content] of renderLocalDossier(input()).files) {
      await mkdir(dirname(join(directory, path)), { recursive: true });
      await writeFile(join(directory, path), content);
    }
    browser = await launchBrowser(executable);
    const page = await browser.newPage();
    try {
      for (const map of ['directories', 'ci']) {
        const url = pathToFileURL(join(directory, 'maps', `${map}.html`)).href;
        await page.setViewport(1440, 900);
        await page.navigate(url);
        expect(await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), map).toBe(true);
        const wide = await page.evaluate(FORMS) as { width: number; drawing: boolean; list: boolean; box: number; svg: number | null; overflow: boolean }[];
        expect(wide.length, map).toBe(map === 'directories' ? 3 : 1);
        for (const figure of wide) expect(figure, map).toMatchObject({ drawing: true, list: false, box: 966, svg: figure.width, overflow: false });

        await page.setViewport(390, 900);
        await page.navigate(url);
        expect(await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), map).toBe(true);
        const narrow = await page.evaluate(FORMS) as { width: number; drawing: boolean; list: boolean; box: number; svg: number | null; overflow: boolean; items: number; font: string }[];
        // The CI map's plain chain of three jobs is stacked, 248 px wide, since syzygy-3efd.66, so at 390 px its drawing fits the column
        // and shows, unscaled; the directory map's figures (648 px) switch to their text form.
        expect(narrow.map((figure) => figure.width), map).toEqual(map === 'directories' ? [648, 648, 648] : [248]);
        for (const figure of narrow) {
          expect(figure, map).toMatchObject(figure.width <= 261 ? { drawing: true, list: false, box: 261, svg: figure.width, overflow: false }
            : { drawing: false, list: true, box: 261, overflow: false, font: '13px' });
        }
        expect(narrow.map((figure) => figure.items), map).toEqual(map === 'directories' ? [12, 12, 6] : [0]);
        expect(await page.evaluate('document.scripts.length'), map).toBe(0);
      }
      // The boundary on the directory map: a forms box exactly W wide shows the drawing, one 1 px narrower the text form.
      await page.setViewport(1440, 900);
      await page.navigate(pathToFileURL(join(directory, 'maps', 'directories.html')).href);
      for (const [boxPx, shown] of [[648, [true, false]], [647, [false, true]]] as const) {
        expect(await page.evaluate(`(() => { const forms = document.querySelector(".map-forms"); forms.style.width = "${boxPx}px";
          return [forms.clientWidth, ...[".map-drawing", ".map-list"].map(s => getComputedStyle(forms.querySelector(s)).display !== "none")]; })()`), `${boxPx} px`).toEqual([boxPx, ...shown]);
      }
      // The evidence view: the switch is a fragment link, so it works with no script. Before it, an entry's evidence is clipped; after it, the
      // entry's label and evidence are shown; back at the reading view they are clipped again.
      const EVIDENCE = `(() => { const ev = document.querySelector('#computed-map .derived-facts .ev'); const r = ev.getBoundingClientRect();
        return { width: Math.round(r.width) > 1, position: getComputedStyle(ev).position, text: ev.innerText.trim().slice(0, 40) }; })()`;
      expect(await page.evaluate(EVIDENCE)).toEqual({ width: false, position: 'absolute', text: 'Evidence: label Observed; derived by Syz' });
      // Activated as a reader activates it: the link in the switch (a same-document navigation, so no load event follows).
      expect(await page.evaluate(`(() => { document.querySelector('.view-switch a[href="#evidence-view"]').click(); return location.hash; })()`)).toBe('#evidence-view');
      expect(await page.evaluate(EVIDENCE)).toEqual({ width: true, position: 'static', text: 'Evidence: label Observed; derived by Syz' });
      expect(await page.evaluate(`(() => { document.querySelector('.view-switch a[href="#content"]').click(); return location.hash; })()`)).toBe('#content');
      expect(await page.evaluate(EVIDENCE)).toMatchObject({ width: false, position: 'absolute' });
      // Each text-form item's left border is styled by its mark: solid for an Observed arrow.
      expect(await page.evaluate('getComputedStyle(document.querySelector(".map-list > li")).borderLeftStyle')).toBe('solid');
    } finally {
      await page.close();
    }
  } finally {
    await browser?.close();
    await rm(directory, { recursive: true, force: true });
  }
}, 60_000);
