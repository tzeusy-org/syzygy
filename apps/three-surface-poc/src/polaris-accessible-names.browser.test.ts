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

import { createDaemon, type Route, type RunningDaemon } from '@syzygy/http-host';
import { PWB_RESOURCE_LIMITS, type PocModel } from '@syzygy/three-surface-poc-core';
import { tempDir } from '@syzygy/test-kit';

import { findBrowserExecutable, launchBrowser, type Browser, type BrowserPage } from './cdp-browser.js';
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
import { buildFixtureModel, fixtureRepoWithGit } from './test-model-fixture.js';
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
const EVALUATION = {
  inputsDigest: 'a'.repeat(64),
  snapshot: 'synthetic|inputs:sha256:' + 'a'.repeat(64),
  asOf: '2026-08-30T12:00:00Z',
};
const EMPTY_MACHINE_SHAPE = { kind: 'not-admitted' };
const ENTRY_DOCUMENT = { kind: 'read', url: 'http://fixture.invalid/polaris', ...EVALUATION };
// Git blob identities from the fixed fixture bytes in literal path order.
const EXPECTED_BASELINE_PAGES = [
  'entry',
  'repository:butlers-configured-poc@4444444444444444444444444444444444444444:about/README.md#14fd6e025ebd486127572eb984fe0a51d8cbb83c',
  'repository:butlers-configured-poc@4444444444444444444444444444444444444444:about/craft-and-care/README.md#84ba0d5173fcde8df3ee7ca3a6c075ece89228b4',
  'repository:butlers-configured-poc@4444444444444444444444444444444444444444:about/craft-and-care/policies/cc-spec.md#37bc6555c7b885f26661cae7e57e7c48bcc540bd',
  'repository:butlers-configured-poc@4444444444444444444444444444444444444444:about/heart-and-soul/README.md#a8502a47e42ecdef5cbea221f0a52e268efd5d5c',
  'repository:butlers-configured-poc@4444444444444444444444444444444444444444:about/heart-and-soul/architecture.md#a2c838dcb993b52e56f5c1c7a7279388150371a5',
  'repository:butlers-configured-poc@4444444444444444444444444444444444444444:about/heart-and-soul/v1.md#cefaf1d04353c86592ffa3885429aa0959a0bbc3',
  'repository:butlers-configured-poc@4444444444444444444444444444444444444444:about/heart-and-soul/vision.md#4eef382feb42a39805fa39dadea07fd78c0dd246',
  'repository:butlers-configured-poc@4444444444444444444444444444444444444444:about/lay-and-land/README.md#976e7f1a6b0ab2c8b05094ab4fb5cb0e75f1878c',
  'repository:butlers-configured-poc@4444444444444444444444444444444444444444:about/lay-and-land/components.md#0482c460780bf6fef501b9fde9a96b861117d94d',
  'repository:butlers-configured-poc@4444444444444444444444444444444444444444:about/legends-and-lore/0001.md#d3a9d78c40ac7b9f3ca03caf4053fce330e5ecc3',
  'repository:butlers-configured-poc@4444444444444444444444444444444444444444:about/legends-and-lore/README.md#759b76a830b84285aaafc445c123258488dd9bda',
  'repository:butlers-configured-poc@4444444444444444444444444444444444444444:about/spec-and-spine/README.md#168bdad197aa8b8ba3f75282209abc7c1e0db4c7',
  'repository:butlers-configured-poc@4444444444444444444444444444444444444444:openspec/specs/alpha/spec.md#79b29601dc5b5d9f50ee44d569593e30f5384d99',
  'repository:butlers-configured-poc@4444444444444444444444444444444444444444:openspec/specs/switchboard-identity/spec.md#ffcbf1c2ab91c30ee33ff2bcd1844fc5f6132b38',
  'repository:butlers-configured-poc@4444444444444444444444444444444444444444:roster/atlas/butler.toml#f0ae05a00ffadce535bd36defaf110fd1a3a676b',
  'repository:butlers-configured-poc@4444444444444444444444444444444444444444:roster/bishop/butler.toml#fca3aa1590927b3273e1528b0fa4bfa442aaa621',
] as const;
const BASELINE_REFUSAL = EXPECTED_BASELINE_PAGES[13];
const BASELINE_BODY = EXPECTED_BASELINE_PAGES[14];


describe('PWB-REQ-016 distinct-name rules (pure)', () => {
  it('passes different names for different targets and a shared name for one target', () => {
    const result = distinctNameViolations([
      link(1, 'http://h/x', 'Overview', 'Overview'),
      link(2, 'http://h/y', 'Catalog', 'Catalog'),
      link(3, 'http://h/x', 'Overview again', 'Overview'),
    ], PATHS);
    expect(result).toEqual({ violations: [], sharedLabelGroups: 0, exactSourceTargets: 0, exactSourceTargetsWithoutMachinePath: 0 });
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
    expect(passing).toEqual({ violations: [], sharedLabelGroups: 1, exactSourceTargets: 2, exactSourceTargetsWithoutMachinePath: 0 });
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

  it('counts a missing or unlisted identity without guessing the path from the name', () => {
    for (const unresolved of [routeHref(SOURCE_B), 'http://127.0.0.1:1/polaris/source']) {
      const actual = distinctNameViolations([
        link(1, routeHref(SOURCE_A), 'Source', 'Source docs/a.md'),
        link(2, unresolved, 'Source', 'Source docs/b.md'),
      ], new Map([[SOURCE_A, 'docs/a.md']]));
      expect(actual).toMatchObject({ sharedLabelGroups: 1, exactSourceTargets: 2, exactSourceTargetsWithoutMachinePath: 1 });
      expect(actual.violations.map(({ kind, where }) => [kind, where])).toEqual([
        ['shared-label-exact-source-path-unknown', 'a[2] "Source"'],
      ]);
    }
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

  it('collects complete large page and coverage populations in order', async () => {
    const population = 140_000;
    // Confirm that this population exceeds the engine's argument limit in this run.
    expect(() => Reflect.apply(Array.prototype.push, [], new Array(population).fill(null))).toThrow(RangeError);

    const headings = [heading(0, 1)];
    for (let index = 0; index < population; index += 1) {
      headings.push(heading(2 * index + 1, 2), heading(2 * index + 2, 4));
    }
    const sources = Array.from({ length: population }, (_, index) => ({ identity: `source-${index}`, path: `docs/source-${index}.md` }));
    const evaluations: unknown[] = [ENTRY_DOCUMENT, [], headings, 0, null, ENTRY_DOCUMENT];
    const unexpected = async (): Promise<never> => { throw new Error('unexpected browser operation in this fixture'); };
    const page: BrowserPage = {
      navigate: async () => {},
      evaluate: async <T>() => evaluations.shift() as T,
      accessibleNames: async () => [],
      setViewport: unexpected,
      press: unexpected,
      mouseMove: unexpected,
      axTree: unexpected,
      close: unexpected,
    };
    const sweep = sweepPolarisNamesAndHeadings(
      page, 'http://fixture.invalid', { evaluation: EVALUATION, projectShape: { kind: 'observed', sources } }, '/polaris', '/polaris/source',
      async (url) => url === 'http://fixture.invalid/polaris' ? 200 : 404,
    );

    await expect(sweep).resolves.toMatchObject({ pagesListed: population + 1, pagesSwept: 1, interactive: 0, headings: 2 * population + 1 });
    const report = await sweep;
    expect(report.violations).toHaveLength(3 * population);
    const lastSource = `source-${population - 1}`;
    for (const [offset, kind, first, last] of [
      [0, 'heading-level-skipped', 'entry: h4[2] "Heading 2"', `entry: h4[${2 * population}] "Heading ${2 * population}"`],
      [population, 'page-not-served', 'source-0', lastSource],
      [2 * population, 'page-not-swept', 'source-0', lastSource],
    ] as const) {
      const group = report.violations.slice(offset, offset + population);
      expect(group.every((violation) => violation.kind === kind)).toBe(true);
      expect(group[0]?.where).toBe(first);
      expect(group.at(-1)?.where).toBe(last);
    }
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
    cleanups.push(pages);
  });

  afterAll(async () => {
    await browser?.close();
    for (const daemon of daemons.splice(0)) await daemon.close().catch(() => undefined);
    for (const directory of cleanups.splice(0)) rmSync(directory, { recursive: true, force: true });
  });

  /** Serves `model` through the real routes on a private fixture daemon. */
  async function serve(model: PocModel, texts: Readonly<Record<string, string>>, amendRoutes: (routes: readonly Route[]) => readonly Route[] = (routes) => routes) {
    return serveRoutes(amendRoutes(pocRoutes(() => model, PWB_RESOURCE_LIMITS, (m) => ({ verbatim: verbatimRouteReader(m, projectShapeFixtureGit(texts)) }))));
  }

  async function serveRoutes(routes: readonly Route[]): Promise<{ readonly baseUrl: string; readonly token: string }> {
    const stateDir = tempDir('syzygy-poc-names-daemon-');
    cleanups.push(stateDir);
    const start = await createDaemon({ stateDir: join(stateDir, 'state'), routes, port: 0 });
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

  const footer = (snapshot = EVALUATION.snapshot, asOf = EVALUATION.asOf): string =>
    `<footer>Evaluation <code>${snapshot}</code> as of <code>${asOf}</code>.</footer>`;

  it('counts one unmatched exact-source target in the ordinary whole-page sweep', async () => {
    const first = '/polaris/source?identity=' + encodeURIComponent(SOURCE_A);
    const second = '/polaris/source?identity=' + encodeURIComponent(SOURCE_B);
    const html = `<h1>Sources</h1><a href="${first}" aria-label="Source docs/a.md">Source</a><a href="${second}" aria-label="Source docs/b.md">Source</a>${footer()}`;
    const { baseUrl } = await serveRoutes([
      { method: 'GET', path: '/polaris', credentialClass: 'human-open', handle: () => ({ status: 200, contentType: 'text/html', body: html }) },
      { method: 'GET', path: '/polaris/source', credentialClass: 'human-open', handle: () => ({ status: 200, contentType: 'text/html', body: '<h1>Source</h1>' + footer() }) },
    ]);
    const tab = await browser.newPage();
    try {
      const sweep = (sources: readonly { identity: string; path: string }[]) =>
        sweepPolarisNamesAndHeadings(tab, baseUrl, { evaluation: EVALUATION, projectShape: { kind: 'observed', sources } },
          '/polaris', '/polaris/source', async (url) => (await fetch(url)).status);
      const firstSource = { identity: SOURCE_A, path: 'docs/a.md' };
      const incomplete = await sweep([firstSource]);
      expect(incomplete).toMatchObject({ pagesListed: 2, pagesSwept: 2, exactSourceTargetsWithoutMachinePath: 1 });
      expect(incomplete.pages[0]).toMatchObject({ exactSourceTargets: 2, exactSourceTargetsWithoutMachinePath: 1 });
      expect(incomplete.violations.map(({ kind }) => kind)).toEqual(['shared-label-exact-source-path-unknown']);

      const complete = await sweep([firstSource, { identity: SOURCE_B, path: 'docs/b.md' }]);
      expect(complete).toMatchObject({ pagesListed: 3, pagesSwept: 3, exactSourceTargetsWithoutMachinePath: 0, violations: [] });
      expect(complete.pages[0]).toMatchObject({ exactSourceTargets: 2, exactSourceTargetsWithoutMachinePath: 0 });
    } finally { await tab.close(); }
  });

  it('refuses a missing, malformed, duplicate, or different evaluation footer', async () => {
    let shell: string;
    const { baseUrl } = await serveRoutes([
      { method: 'GET', path: '/polaris', credentialClass: 'human-open', handle: () => ({ status: 200, contentType: 'text/html', body: '<h1>Fixture</h1>' + shell }) },
    ]);
    const tab = await browser.newPage();
    try {
      for (const [markup, reason] of [
        [`<main>${footer()}</main>`, 'missing-footer'],
        [footer(EVALUATION.snapshot.slice(0, -1)), 'malformed-footer'],
        [footer(EVALUATION.snapshot, '2026-02-30T12:00:00Z'), 'malformed-footer'],
        [footer() + footer(), 'ambiguous-footer'],
        [footer('other|inputs:sha256:' + EVALUATION.inputsDigest), 'snapshot-mismatch'],
        [footer('synthetic|inputs:sha256:' + 'b'.repeat(64)), 'snapshot-mismatch'],
      ] as const) {
        shell = markup;
        const report = await sweepPolarisNamesAndHeadings(
          tab, baseUrl, { evaluation: EVALUATION, projectShape: EMPTY_MACHINE_SHAPE }, '/polaris', '/polaris/source', async (url) => (await fetch(url)).status,
        );
        expect(report).toMatchObject({ pagesListed: 1, pagesSwept: 0, unboundPages: [{ page: 'entry', reason }] });
        expect(report.violations.map(({ kind }) => kind)).toEqual(['page-evaluation-unbound', 'page-not-swept']);
      }
      shell = footer();
      const invalid = await sweepPolarisNamesAndHeadings(tab, baseUrl, {
        evaluation: { ...EVALUATION, inputsDigest: 'b'.repeat(64) }, projectShape: EMPTY_MACHINE_SHAPE,
      }, '/polaris', '/polaris/source', async (url) => (await fetch(url)).status);
      expect(invalid).toMatchObject({ pagesSwept: 0, machineEvaluationValid: false, unboundPages: [{ page: 'entry', reason: 'invalid-machine-evaluation' }] });
      const valid = await sweepPolarisNamesAndHeadings(tab, baseUrl, { evaluation: EVALUATION, projectShape: EMPTY_MACHINE_SHAPE }, '/polaris', '/polaris/source', async (url) => (await fetch(url)).status);
      expect(valid).toMatchObject({ pagesSwept: 1, machineEvaluationValid: true, unboundPages: [], violations: [] });
    } finally { await tab.close(); }
  });

  it('refuses a document replaced during measurement even at the same URL and evaluation', async () => {
    const { baseUrl } = await serveRoutes([
      { method: 'GET', path: '/polaris', credentialClass: 'human-open', handle: () => ({
        status: 200, contentType: 'text/html', body: '<h1>Fixture</h1><a href="#fixture">Fixture link</a>' + footer(),
      }) },
    ]);
    const tab = await browser.newPage();
    try {
      const reloading: BrowserPage = {
        navigate: tab.navigate.bind(tab),
        evaluate: tab.evaluate.bind(tab),
        accessibleNames: async (expression) => {
          const names = await tab.accessibleNames(expression);
          expect(names).toEqual(['Fixture link']);
          await tab.navigate(baseUrl + '/polaris');
          return names;
        },
        setViewport: tab.setViewport.bind(tab),
        press: tab.press.bind(tab),
        mouseMove: tab.mouseMove.bind(tab),
        axTree: tab.axTree.bind(tab),
        close: tab.close.bind(tab),
      };
      const answer = { evaluation: EVALUATION, projectShape: EMPTY_MACHINE_SHAPE };
      const report = await sweepPolarisNamesAndHeadings(reloading, baseUrl, answer, '/polaris', '/polaris/source', async (url) => (await fetch(url)).status);
      expect(report).toMatchObject({ pagesListed: 1, pagesSwept: 0, unboundPages: [{ page: 'entry', reason: 'document-replaced' }] });
    } finally { await tab.close(); }
  });

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
    expect(report.pages.map((swept) => swept.page)).toEqual(EXPECTED_BASELINE_PAGES);
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

  it('moves only the one literal identity when one listed fixture blob changes', async () => {
    const path = 'openspec/specs/alpha/spec.md';
    const texts = { ...PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC, [path]: '# Alpha\n\n' };
    const model = buildFixtureModel(cleanups, { projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit(texts) } });
    const report = await sweepServed(model, texts);
    const expected = [...EXPECTED_BASELINE_PAGES] as string[];
    expected[13] = 'repository:butlers-configured-poc@4444444444444444444444444444444444444444:openspec/specs/alpha/spec.md#5ee2b763b92e83e33230d29ea405d0cc5f61de13';
    expect(report).toMatchObject({ pagesListed: 17, pagesSwept: 17, violations: [] });
    expect(report.pages.map(({ page }) => page)).toEqual(expected);
  }, 240_000);

  it('checks the evaluation actually loaded by the browser for the entry, exact body, and listed refusal', async () => {
    const texts = PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC;
    const fixtureRepo = fixtureRepoWithGit(cleanups);
    const options = { fixtureRepo, projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit(texts) } };
    const first = buildFixtureModel(cleanups, { ...options, evaluationAsOf: '2026-08-30T12:00:00Z' });
    const second = buildFixtureModel(cleanups, { ...options, evaluationAsOf: '2026-08-30T12:00:01Z' });
    expect(second.evaluation.inputsDigest).toBe(first.evaluation.inputsDigest);
    expect(second.evaluation.snapshot).toBe(first.evaluation.snapshot);
    expect(second.evaluation.asOf).not.toBe(first.evaluation.asOf);

    const alternate = pocRoutes(() => second, PWB_RESOURCE_LIMITS, (m) => ({ verbatim: verbatimRouteReader(m, projectShapeFixtureGit(texts)) }));
    let victim: string | undefined;
    const changed: { page: string; response: string }[] = [];
    const { baseUrl, token } = await serve(first, texts, (routes) => routes.map((route) => ({
      ...route,
      async handle(context) {
        const { request } = context;
        const target = request.path === POLARIS_HUMAN_PATH ? 'entry' : request.path === POLARIS_SOURCE_PATH ? request.query.get('identity') : null;
        if (victim === undefined || target !== victim || request.headers['sec-fetch-dest'] !== 'document') return route.handle(context);
        const competingRoute = alternate.find(({ path, method }) => path === route.path && method === route.method);
        if (!competingRoute) throw new Error('fixture lost the competing route');
        const response = await competingRoute.handle(context);
        changed.push({ page: victim, response: response.body });
        victim = undefined;
        return response;
      },
    })));
    const machine = async (): Promise<PocModel> => {
      const response = await fetch(`${baseUrl}${POC_MACHINE_PATH}`, { headers: { authorization: `Bearer ${token}` } });
      expect(response.status).toBe(200);
      return response.json() as Promise<PocModel>;
    };
    const answer = await machine();
    expect(answer.evaluation).toEqual(first.evaluation);
    const tab = await browser.newPage();
    try {
      for (const [target, arm] of [
        ['entry', '<main'], [BASELINE_BODY, 'data-verbatim="rendered"'], [BASELINE_REFUSAL, 'data-verbatim="not-rendered"'],
      ] as const) {
        victim = target;
        const probes: string[] = [];
        const report = await sweepPolarisNamesAndHeadings(tab, baseUrl, answer, POLARIS_HUMAN_PATH, POLARIS_SOURCE_PATH, async (url) => {
          const response = await fetch(url);
          if (target === 'entry' ? new URL(url).pathname === POLARIS_HUMAN_PATH : new URL(url).searchParams.get('identity') === target) {
            probes.push(await response.text());
          }
          return response.status;
        });
        expect(probes).toHaveLength(1);
        expect(probes[0]).toContain(first.evaluation.asOf);
        expect(probes[0]).toContain(arm);
        expect(changed.at(-1)?.page).toBe(target);
        expect(changed.at(-1)?.response).toContain(second.evaluation.asOf);
        expect(changed.at(-1)?.response).toContain(arm);
        expect(report).toMatchObject({ pagesListed: 17, pagesSwept: 16, unboundPages: [{ page: target, reason: 'observation-time-mismatch' }] });
        expect(report.pages.map(({ page }) => page)).toEqual(EXPECTED_BASELINE_PAGES.filter((page) => page !== target));
        expect(report.violations.map(({ kind }) => kind)).toEqual(['page-evaluation-unbound', 'page-not-swept']);
      }
      expect(changed.map(({ page }) => page)).toEqual(['entry', BASELINE_BODY, BASELINE_REFUSAL]);
      expect((await machine()).evaluation).toEqual(first.evaluation);
      const restored = await sweepPolarisNamesAndHeadings(tab, baseUrl, answer, POLARIS_HUMAN_PATH, POLARIS_SOURCE_PATH, async (url) => (await fetch(url)).status);
      expect(restored).toMatchObject({ pagesSwept: 17, unboundPages: [], violations: [] });
    } finally { await tab.close(); }
  }, 240_000);

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
