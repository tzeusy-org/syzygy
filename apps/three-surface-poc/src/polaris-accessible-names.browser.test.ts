// PWB-REQ-016 as amended by pwb-accessible-name-amendment v1.0 (P-99,
// syzygy-u05.22): distinct accessible names, heading order, and both checks
// over every Polaris page one whole-project evaluation serves.
//
// The oracle sits outside the renderer: a real headless Chrome/Chromium
// (`cdp-browser.ts`) enumerates the post-script DOM and computes every
// accessible name; the page list and each expected source path come from
// the machine answer (`GET /api/poc`), never from the rendered links.
// Expected values are hand-typed literals. Without a browser the browser
// suites are skipped, never passed.
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createDaemon, type RunningDaemon } from '@syzygy/http-host';
import { PWB_RESOURCE_LIMITS, type PocModel } from '@syzygy/three-surface-poc-core';
import { tempDir } from '@syzygy/test-kit';

import { findBrowserExecutable, launchBrowser, type Browser } from './cdp-browser.js';
import {
  checkNamesAndHeadings,
  coverageViolations,
  distinctNameViolations,
  exactSourceIdentity,
  headingOrderViolations,
  measurePage,
  polarisPagesFromMachineAnswer,
  sweepPolarisNamesAndHeadings,
  type HeadingElement,
  type InteractiveElement,
  type PageNameHeadingReport,
  type WholeSurfaceReport,
} from './polaris-accessible-names.js';
import { ACCESSIBILITY_VARIANTS, variantModel } from './polaris-accessibility-variants.js';
import { POLARIS_HUMAN_PATH } from './polaris.js';
import { POLARIS_SOURCE_PATH } from './polaris-source.js';
import { POC_MACHINE_PATH, pocRoutes } from './routes.js';
import { buildFixtureModel } from './test-model-fixture.js';
import { ADMITTING_AUTHORITY, PROJECT_SHAPE_FIXTURE_TEXTS, PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC, projectShapeFixtureGit } from './test-project-shape-fixture.js';
import { verbatimRouteReader } from './verbatim-route.js';

// ---------------------------------------------------------------------------
// The pure rules, against hand-typed populations.

const link = (index: number, href: string, label: string, name: string): InteractiveElement => ({ index, tag: 'a', target: { kind: 'href', value: href }, label, name });
const heading = (index: number, level: number): HeadingElement => ({ index, tag: `h${level}`, level, text: `Heading ${index}` });
const SOURCE_A = 'repo@rev:docs/a.md#aaaa';
const SOURCE_B = 'repo@rev:docs/b.md#bbbb';
const routeHref = (identity: string): string => `http://127.0.0.1:1/polaris/source?identity=${encodeURIComponent(identity)}`;
const PATHS = new Map([[SOURCE_A, 'docs/a.md'], [SOURCE_B, 'docs/b.md']]);

describe('PWB-REQ-016 distinct-name rules (pure)', () => {
  it('passes different names for different targets and a shared name for one target', () => {
    const result = distinctNameViolations([
      link(1, 'http://h/x', 'Overview', 'Overview'),
      link(2, 'http://h/y', 'Catalog', 'Catalog'),
      link(3, 'http://h/x', 'Overview again', 'Overview'),
    ], PATHS);
    expect(result).toEqual({ violations: [], sharedLabelGroups: 0, exactSourceTargets: 0 });
  });

  it('fails two different targets sharing one name', () => {
    const result = distinctNameViolations([link(1, 'http://h/x', 'Open', 'Open'), link(2, 'http://h/y', 'Go', 'Open')], PATHS);
    expect(result.violations.map((violation) => violation.kind)).toEqual(['shared-name-different-targets']);
  });

  it('treats a summary\'s details and a control\'s aria-controls as targets', () => {
    const summary = (index: number, details: string, name: string): InteractiveElement => ({ index, tag: 'summary', target: { kind: 'details', value: details }, label: 'More', name });
    expect(distinctNameViolations([summary(1, '10', 'More'), summary(2, '20', 'More')], PATHS).violations.map((violation) => violation.kind))
      .toEqual(['shared-name-different-targets']);
    const button = (index: number, controls: string): InteractiveElement => ({ index, tag: 'button', target: { kind: 'controls', value: controls }, label: 'Expand', name: 'Expand' });
    expect(distinctNameViolations([button(1, 'panel'), button(2, 'panel')], PATHS).violations).toEqual([]);
  });

  it('requires each differently targeted element sharing a visible label to have a name beginning with it', () => {
    const result = distinctNameViolations([
      link(1, 'http://h/x', 'Read', 'Read the overview'),
      link(2, 'http://h/y', 'Read', 'Open the catalog'),
    ], PATHS);
    expect(result.sharedLabelGroups).toBe(1);
    expect(result.violations.map((violation) => [violation.kind, violation.where])).toEqual([['shared-label-name-does-not-begin-with-label', 'a[2] "Read"']]);
    // Containing the label is not beginning with it.
    const inside = distinctNameViolations([
      link(1, 'http://h/x', 'Read', 'Read the overview'),
      link(2, 'http://h/y', 'Read', 'Then Read the catalog'),
    ], PATHS);
    expect(inside.violations.map((violation) => [violation.kind, violation.where])).toEqual([['shared-label-name-does-not-begin-with-label', 'a[2] "Read"']]);
  });

  it('requires the machine answer\'s source path after a shared label on an exact-source target', () => {
    const passing = distinctNameViolations([
      link(1, routeHref(SOURCE_A), 'Source', 'Source docs/a.md'),
      link(2, routeHref(SOURCE_B), 'Source', 'Source — docs/b.md'),
    ], PATHS);
    expect(passing).toEqual({ violations: [], sharedLabelGroups: 1, exactSourceTargets: 2 });
    const failing = distinctNameViolations([
      link(1, routeHref(SOURCE_A), 'Source', 'Source docs/a.md'),
      link(2, routeHref(SOURCE_B), 'Source', 'Source second'),
    ], PATHS);
    expect(failing.violations.map((violation) => [violation.kind, violation.where])).toEqual([['shared-label-exact-source-name-omits-path', 'a[2] "Source"']]);
    // The path must sit after the label, not inside it.
    const inLabel = distinctNameViolations([
      link(1, routeHref(SOURCE_A), 'docs/a.md', 'docs/a.md'),
      link(2, routeHref(SOURCE_B), 'docs/a.md', 'docs/a.md docs/b.md'),
    ], PATHS);
    expect(inLabel.violations.map((violation) => violation.kind)).toEqual(['shared-label-exact-source-name-omits-path']);
  });

  it('binds no element whose label no differently targeted element shares', () => {
    expect(distinctNameViolations([link(1, routeHref(SOURCE_A), 'Only', 'Unrelated name')], PATHS).violations).toEqual([]);
  });

  it('recognises the exact-source route under either mount and nothing else', () => {
    expect(exactSourceIdentity(routeHref(SOURCE_A))).toBe(SOURCE_A);
    expect(exactSourceIdentity(`http://h/three-surface-poc/polaris/source?identity=${encodeURIComponent(SOURCE_B)}`)).toBe(SOURCE_B);
    expect(exactSourceIdentity('http://h/polaris#polaris-source-x')).toBeUndefined();
    expect(exactSourceIdentity('not a url')).toBeUndefined();
  });
});

describe('PWB-REQ-016 heading-order rules (pure)', () => {
  it('passes one h1 with no skipped level, including returns to shallower levels', () => {
    expect(headingOrderViolations([heading(1, 1), heading(2, 2), heading(3, 3), heading(4, 2), heading(5, 3), heading(6, 4), heading(7, 2)])).toEqual([]);
  });

  it('fails a skipped level', () => {
    expect(headingOrderViolations([heading(1, 1), heading(2, 2), heading(3, 4)]).map((violation) => [violation.kind, violation.where]))
      .toEqual([['heading-level-skipped', 'h4[3] "Heading 3"']]);
  });

  it('fails a second level-1 heading and a missing one', () => {
    expect(headingOrderViolations([heading(1, 1), heading(2, 2), heading(3, 1)]).map((violation) => violation.kind)).toEqual(['level-one-heading-count']);
    expect(headingOrderViolations([heading(1, 2), heading(2, 3)]).map((violation) => violation.kind)).toEqual(['level-one-heading-count']);
  });
});

describe('PWB-REQ-016 whole-surface page list (pure)', () => {
  it('lists the entry page and one route response per machine-answer source', () => {
    const { pages, sourcePaths } = polarisPagesFromMachineAnswer({ projectShape: { kind: 'observed', sources: [{ identity: SOURCE_A, path: 'docs/a.md' }, { identity: SOURCE_B, path: 'docs/b.md' }] } }, '/polaris', '/polaris/source');
    expect(pages).toEqual([
      { page: 'entry', path: '/polaris' },
      { page: SOURCE_A, path: '/polaris/source?identity=repo%40rev%3Adocs%2Fa.md%23aaaa' },
      { page: SOURCE_B, path: '/polaris/source?identity=repo%40rev%3Adocs%2Fb.md%23bbbb' },
    ]);
    expect([...sourcePaths]).toEqual([[SOURCE_A, 'docs/a.md'], [SOURCE_B, 'docs/b.md']]);
    expect(polarisPagesFromMachineAnswer({ projectShape: { kind: 'not-admitted' } }, '/polaris', '/polaris/source').pages).toEqual([{ page: 'entry', path: '/polaris' }]);
  });

  it('fails a listed page missing from the sweep and an extra one', () => {
    const listed = [{ page: 'entry', path: '/polaris' }, { page: SOURCE_A, path: '/x' }];
    expect(coverageViolations(listed, ['entry', SOURCE_A])).toEqual([]);
    expect(coverageViolations(listed, ['entry']).map((violation) => [violation.kind, violation.where])).toEqual([['page-not-swept', SOURCE_A]]);
    expect(coverageViolations(listed, ['entry', SOURCE_A, 'other']).map((violation) => [violation.kind, violation.where])).toEqual([['page-not-in-machine-answer', 'other']]);
  });
});

// ---------------------------------------------------------------------------
// The browser-measured checks.

const executable = findBrowserExecutable();

describe.skipIf(executable === undefined)('PWB-REQ-016 names and headings in a real browser', () => {
  let browser: Browser;
  let pages: string;
  const cleanups: string[] = [];
  const daemons: RunningDaemon[] = [];

  beforeAll(async () => {
    browser = await launchBrowser(executable as string);
    pages = tempDir('syzygy-poc-names-');
  });

  afterAll(async () => {
    await browser?.close();
    for (const daemon of daemons.splice(0)) await daemon.close().catch(() => undefined);
    for (const directory of cleanups.splice(0)) rmSync(directory, { recursive: true, force: true });
  });

  /** Serves `model` through the real routes on a private fixture daemon. */
  async function serve(model: PocModel, texts: Readonly<Record<string, string>>): Promise<{ readonly baseUrl: string; readonly token: string }> {
    const stateDir = tempDir('syzygy-poc-names-daemon-');
    const start = await createDaemon({
      stateDir: join(stateDir, 'state'),
      routes: pocRoutes(() => model, PWB_RESOURCE_LIMITS, (m) => ({ verbatim: verbatimRouteReader(m, projectShapeFixtureGit(texts)) })),
      port: 0,
    });
    if (!start.started) throw new Error(`daemon failed to start: ${start.failure.kind}`);
    daemons.push(start.daemon);
    return { baseUrl: `http://${start.daemon.host}:${start.daemon.port}`, token: readFileSync(start.daemon.credentialPath, 'utf8').trim() };
  }

  /** The sweep over one served evaluation, the page list from its machine answer. */
  async function sweepServed(model: PocModel, texts: Readonly<Record<string, string>>): Promise<WholeSurfaceReport> {
    const { baseUrl, token } = await serve(model, texts);
    const answer = await fetch(`${baseUrl}${POC_MACHINE_PATH}`, { headers: { authorization: `Bearer ${token}` } }).then(async (response) => response.json() as Promise<PocModel>);
    const tab = await browser.newPage();
    try {
      return await sweepPolarisNamesAndHeadings(tab, baseUrl, answer, POLARIS_HUMAN_PATH, POLARIS_SOURCE_PATH, async (url) => (await fetch(url)).status);
    } finally { await tab.close(); }
  }

  async function page(html: string, name: string): Promise<string> {
    const file = join(pages, `${name}.html`);
    writeFileSync(file, `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${name}</title></head><body>${html}</body></html>`);
    return pathToFileURL(file).href;
  }

  it('enumerates the signed populations: closed details included; hidden, aria-hidden and display:none excluded', async () => {
    const url = await page(`<h1>One</h1>
      <details><summary>More</summary><a href="#a">Inside</a><h2>Inside heading</h2></details>
      <a href="#b" hidden>Hidden</a><div aria-hidden="true"><a href="#c">Aria hidden</a><h2>Aria</h2></div>
      <div style="display:none"><button>None</button><h3>None</h3></div>
      <button>Press</button><input aria-label="Field"><select aria-label="Pick"><option>x</option></select><textarea aria-label="Words"></textarea>
      <div role="heading" aria-level="2">Role heading</div>`, 'population');
    const tab = await browser.newPage();
    try {
      const report = await checkNamesAndHeadings(tab, url, 'population', new Map());
      expect({ interactive: report.interactive, headings: report.headings, levelOne: report.levelOneHeadings, violations: report.violations }).toEqual({ interactive: 6, headings: 3, levelOne: 1, violations: [] });
    } finally { await tab.close(); }
  });

  it('excludes an element carrying the hidden attribute even where CSS or until-found leaves it displayed', async () => {
    const url = await page(`<style>.shown[hidden]{display:inline}</style><h1>Hidden</h1>
      <a href="#a" class="shown" hidden>Overridden</a><div hidden="until-found"><a href="#b">Until found</a><h2>Found</h2></div><a href="#c">Kept</a>`, 'hidden-attribute');
    const tab = await browser.newPage();
    try {
      const measured = await measurePage(tab, url);
      expect({ links: measured.elements.map((element) => element.label), headings: measured.headings.map((heading) => heading.text) }).toEqual({ links: ['Kept'], headings: ['Hidden'] });
    } finally { await tab.close(); }
  });

  it('reads a role="heading" at its aria-level and treats each summary\'s details as its target', async () => {
    const tab = await browser.newPage();
    try {
      const deep = await checkNamesAndHeadings(tab, await page('<h1>T</h1><div role="heading" aria-level="3">Deep</div>', 'role-heading'), 'role-heading', new Map());
      expect(deep.violations.map((violation) => violation.kind)).toEqual(['heading-level-skipped']);
      const summaries = await checkNamesAndHeadings(tab, await page('<h1>T</h1><details><summary>More</summary>a</details><details><summary>More</summary>b</details>', 'summaries'), 'summaries', new Map());
      expect(summaries.violations.map((violation) => violation.kind)).toEqual(['shared-name-different-targets']);
    } finally { await tab.close(); }
  });

  it('computes the name of a link inside a closed details, as the browser would once it opens', async () => {
    const url = await page(`<h1>Closed</h1><details><summary>First</summary><a href="#a">Same</a></details><details><summary>Second</summary><a href="#b" aria-label="Same">Other</a></details>`, 'closed');
    const tab = await browser.newPage();
    try {
      const measured = await measurePage(tab, url);
      expect(measured.elements.map((element) => [element.tag, element.label, element.name])).toEqual([
        ['summary', 'First', 'First'], ['a', 'Same', 'Same'], ['summary', 'Second', 'Second'], ['a', 'Other', 'Same'],
      ]);
      const report = await checkNamesAndHeadings(tab, url, 'closed', new Map());
      expect(report.violations.map((violation) => violation.kind)).toEqual(['shared-name-different-targets']);
    } finally { await tab.close(); }
  });

  it('reads names from the browser: aria-label and aria-labelledby beat text content', async () => {
    const url = await page(`<h1>Names</h1><span id="l">Labelled elsewhere</span>
      <a href="#x" aria-label="Open x">Open</a><a href="#y" aria-labelledby="l">Open</a>`, 'names');
    const tab = await browser.newPage();
    try {
      const report = await checkNamesAndHeadings(tab, url, 'names', new Map());
      // Shared label "Open", different targets: both names must begin with it.
      expect(report.violations.map((violation) => [violation.kind, violation.where])).toEqual([['shared-label-name-does-not-begin-with-label', 'a[8] "Open"']]);
    } finally { await tab.close(); }
  });

  it('fails each falsifier limb in the browser', async () => {
    const tab = await browser.newPage();
    try {
      const shared = await checkNamesAndHeadings(tab, await page('<h1>T</h1><a href="#a" aria-label="Go">A</a><a href="#b" aria-label="Go">B</a>', 'shared'), 'shared', new Map());
      expect(shared.violations.map((violation) => violation.kind)).toEqual(['shared-name-different-targets']);
      const skipped = await checkNamesAndHeadings(tab, await page('<h1>T</h1><h2>A</h2><h4>B</h4>', 'skipped'), 'skipped', new Map());
      expect(skipped.violations.map((violation) => violation.kind)).toEqual(['heading-level-skipped']);
      const second = await checkNamesAndHeadings(tab, await page('<h1>T</h1><h2>A</h2><h1>U</h1>', 'second'), 'second', new Map());
      expect(second.violations.map((violation) => violation.kind)).toEqual(['level-one-heading-count']);
      const omits = await checkNamesAndHeadings(tab, await page(`<h1>T</h1><a href="${routeHref(SOURCE_A)}" aria-label="Source docs/a.md">Source</a><a href="${routeHref(SOURCE_B)}">Source</a>`, 'omits'), 'omits', PATHS);
      expect(omits.violations.map((violation) => violation.kind)).toEqual(['shared-label-exact-source-name-omits-path']);
    } finally { await tab.close(); }
  });

  it('passes every Polaris page one whole-project evaluation serves, the pages listed from the machine answer', async () => {
    const model = buildFixtureModel(cleanups, { projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit(PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC) } });
    const report = await sweepServed(model, PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC);
    // The evaluation lists 16 sources (the 15-row fixture tree plus one
    // baseline spec): the entry page and 16 route responses.
    expect({ listed: report.pagesListed, swept: report.pagesSwept }).toEqual({ listed: 17, swept: 17 });
    expect(report.pages.map((swept) => swept.page).slice(1)).toEqual(model.projectShape.kind === 'observed' ? model.projectShape.sources.map((source) => source.identity) : []);
    for (const swept of report.pages) {
      expect(swept.interactive, swept.page).toBeGreaterThan(0);
      expect(swept.headings, swept.page).toBeGreaterThan(0);
      expect(swept.levelOneHeadings, swept.page).toBe(1);
    }
    expect(report.interactive).toBe(report.pages.reduce((sum, swept) => sum + swept.interactive, 0));
    // Exact-source links share visible labels on the entry page, and every
    // one of them carries its source path (the rule is exercised, not vacuous).
    expect((report.pages[0] as PageNameHeadingReport).sharedLabelGroups).toBeGreaterThan(0);
    expect(report.violations).toEqual([]);
  }, 240_000); // a fixture model build and a browser sweep of every served page: worst 5.6 s over 5 alone runs at load1 35-42 (docs/evidence/syzygy-bpyt-4-31/durations/polaris-accessible-names.browser.test.tests.json)

  it('fails a listed page the daemon does not serve, never skipping it', async () => {
    const model = buildFixtureModel(cleanups, { projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit(PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC) } });
    const { baseUrl, token } = await serve(model, PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC);
    const answer = await fetch(`${baseUrl}${POC_MACHINE_PATH}`, { headers: { authorization: `Bearer ${token}` } }).then(async (response) => response.json() as Promise<PocModel>);
    const tab = await browser.newPage();
    try {
      // The status probe reports the last listed page as 404.
      let probes = 0;
      const report = await sweepPolarisNamesAndHeadings(tab, baseUrl, answer, POLARIS_HUMAN_PATH, POLARIS_SOURCE_PATH, async () => (probes += 1) === 17 ? 404 : 200);
      expect({ listed: report.pagesListed, swept: report.pagesSwept }).toEqual({ listed: 17, swept: 16 });
      expect(report.violations.map((violation) => violation.kind)).toEqual(['page-not-served', 'page-not-swept']);
    } finally { await tab.close(); }
  }, 240_000); // a fixture model build, a daemon and a browser sweep: worst 4.1 s over 5 alone runs at load1 35-42 (docs/evidence/syzygy-bpyt-4-31/durations/polaris-accessible-names.browser.test.tests.json)

  // Every shape and judgment state the task-4.4 variants render, each served
  // whole: a degraded or refused shape lists fewer sources, never none silently.
  const EXPECTED_PAGES: Readonly<Record<string, number>> = {
    'observed': 16, 'observed-lawful-state-1': 16, 'observed-degraded-unlawful': 16,
    'not-admitted': 1, 'observation-failed': 1, 'not-evaluated': 1,
  };
  for (const variant of ACCESSIBILITY_VARIANTS) {
    it(`${variant.id}: every served Polaris page passes both checks`, async () => {
      const report = await sweepServed(variantModel(variant, cleanups), PROJECT_SHAPE_FIXTURE_TEXTS);
      expect({ listed: report.pagesListed, swept: report.pagesSwept }).toEqual({ listed: EXPECTED_PAGES[variant.id], swept: EXPECTED_PAGES[variant.id] });
      for (const swept of report.pages) expect(swept.levelOneHeadings, swept.page).toBe(1);
      expect(report.violations).toEqual([]);
    }, 240_000); // a browser sweep of every served page: worst 5.0 s over 30 alone runs (6 variants) at load1 35-42 (docs/evidence/syzygy-bpyt-4-31/durations/polaris-accessible-names.browser.test.tests.json)
  }
});
