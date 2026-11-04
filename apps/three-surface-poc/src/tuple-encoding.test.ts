import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createDaemon, type RunningDaemon } from '@syzygy/http-host';
import { tempDir } from '@syzygy/test-kit';
import type { PocModel } from '@syzygy/three-surface-poc-core';

import { TAILNET_HOST } from './browser-origin.js';
import { findBrowserExecutable, withBrowserPage, type BrowserPage } from './cdp-browser.js';
import { CHALLENGE_ENCODING, DESIGN_TOKENS_CSS, EPISTEMIC_ENCODING, FRESHNESS_ENCODING, TIER_ABSENCE_ENCODING, TIER_ENCODING } from './design-tokens.js';
import { ORRERY_HUMAN_PATH } from './orrery.js';
import { copyText } from './polaris-copy.js';
import { POLARIS_HUMAN_PATH, renderPolarisPage } from './polaris.js';
import { POC_HUMAN_PATH, pocRoutes } from './routes.js';
import { fetchWithHost } from './test-http-client.js';
import { SHARED_FIXTURE_TIMEOUT_MS, buildFixtureModel, sharedFixtureModels } from './test-model-fixture.js';
import {
  ADMITTING_AUTHORITY,
  PROJECT_SHAPE_FIXTURE_TEXTS_WITH_SECRET,
  PROJECT_SHAPE_FIXTURE_TEXTS_WITHOUT_PRECEDENCE,
  REJECTING_AUTHORITY,
  projectShapeFixtureGit,
  projectShapeItemStateFixture,
} from './test-project-shape-fixture.js';
import { TRAJECTORY_HUMAN_PATH } from './trajectory.js';

// syzygy-dov.3.2 (P-70 M3 slice 5): the tier, freshness and challenge
// encoding tables. Everything below is the hand-typed oracle; nothing is
// derived from the declaration under test except where a test compares
// against it.

const TIERS = ['gate-backed', 'report-fact', 'reduced-fidelity', 'asserted-by-worker', 'declared-only', 'suspended'] as const;
const FRESHNESS = ['fresh', 'stale', 'broken', 'superseded'] as const;
const CHALLENGE = ['unchallenged'] as const;

/** value → [class, symbol, token]; `unstated` is the tier slot's absence. */
const TREATMENTS: Readonly<Record<string, readonly [string, string, '--ink' | '--muted']>> = {
  'gate-backed': ['tt-gate-backed', '◆', '--ink'],
  'report-fact': ['tt-report-fact', '◇', '--ink'],
  'reduced-fidelity': ['tt-reduced-fidelity', '◒', '--muted'],
  'asserted-by-worker': ['tt-asserted-by-worker', '✎', '--muted'],
  'declared-only': ['tt-declared-only', '○', '--muted'],
  suspended: ['tt-suspended', '‖', '--muted'],
  unstated: ['tt-unstated', '∅', '--muted'],
  fresh: ['tt-fresh', '▲', '--ink'],
  stale: ['tt-stale', '△', '--muted'],
  broken: ['tt-broken', '✕', '--muted'],
  superseded: ['tt-superseded', '»', '--muted'],
  unchallenged: ['tt-unchallenged', '◌', '--ink'],
};
/** Where each family's mark renders on a served tuple: its attribute and
 * pseudo-element (the tuple's ::before is the M3.1 label symbol). */
const SLOTS = {
  tier: ['data-epistemic-tier', '::after'],
  freshness: ['data-epistemic-freshness', ' + i::before'],
  challenge: ['data-challenge-state', ' + i::after'],
} as const;
/** The two tokens' computed colours (--ink #dfe9e7, --muted #8ca3a4). */
const RGB = { '--ink': 'rgb(223, 233, 231)', '--muted': 'rgb(140, 163, 164)' } as const;

const running: RunningDaemon[] = [];
const browserExecutable = findBrowserExecutable();

afterEach(async () => {
  for (const daemon of running.splice(0)) await daemon.close().catch(() => undefined);
});

function attribute(tag: string, name: string): string | undefined {
  return new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];
}

const VARIANT_NAMES = ['unevaluated', 'rejected', 'observed', 'secret', 'degraded', 'missing-freshness'] as const;
const shared = sharedFixtureModels<(typeof VARIANT_NAMES)[number]>((cleanups) => {
  const base = buildFixtureModel(cleanups, { projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit() } });
  return {
    unevaluated: buildFixtureModel(cleanups),
    rejected: buildFixtureModel(cleanups, { projectShape: { authority: REJECTING_AUTHORITY, runGit: projectShapeFixtureGit() } }),
    observed: base,
    secret: buildFixtureModel(cleanups, { projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit(PROJECT_SHAPE_FIXTURE_TEXTS_WITH_SECRET) } }),
    degraded: buildFixtureModel(cleanups, { projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit(PROJECT_SHAPE_FIXTURE_TEXTS_WITHOUT_PRECEDENCE) } }),
    'missing-freshness': withoutFreshness(projectShapeItemStateFixture(base, 'unknown')),
  };
});
beforeAll(shared.prepare, SHARED_FIXTURE_TIMEOUT_MS);
afterAll(shared.remove);

function variants(): readonly { readonly name: string; readonly model: PocModel }[] {
  return VARIANT_NAMES.map((name) => ({ name, model: shared.get(name) }));
}

/** One Unknown item with no freshness: the absence the slot must not hold. */
function withoutFreshness(model: PocModel): PocModel {
  const shape = model.projectShape;
  if (shape.kind !== 'observed') throw new Error('fixture shape unavailable');
  const item = shape.items.find((candidate) => candidate.state === 'unknown');
  if (item === undefined) throw new Error('unknown item missing');
  const absent = { ...item, claim: { ...item.claim, epistemic: { ...item.claim.epistemic, freshness: undefined } } };
  return { ...model, projectShape: { ...shape, items: shape.items.map((candidate) => candidate === item ? absent : candidate) } };
}

/** The observed fixture with one item's tier replaced by `tier`. */
function withTier(model: PocModel, tier: string): PocModel {
  const shape = model.projectShape;
  if (shape.kind !== 'observed') throw new Error('fixture shape unavailable');
  const item = shape.items[0];
  if (item === undefined) throw new Error('fixture item missing');
  const changed = { ...item, claim: { ...item.claim, epistemic: { ...item.claim.epistemic, tier } } } as typeof item;
  return { ...model, projectShape: { ...shape, items: shape.items.map((candidate) => candidate === item ? changed : candidate) } };
}

interface Census {
  readonly tuples: number;
  readonly histogram: Record<string, Record<string, number>>;
  readonly absences: number;
}

/** The served rule that renders one family value's mark on a tuple. */
function markRule(family: keyof typeof SLOTS, value: string): string {
  const [symbolText, token] = [TREATMENTS[value]?.[1], TREATMENTS[value]?.[2]];
  return `.claim-tuple[${SLOTS[family][0]}="${value}"]${SLOTS[family][1]} { content: "${symbolText} " / ""; color: var(${token}); }`;
}

/** Server-body census: every claim tuple, the one empty mark element after
 * it, the served rule for each of its values, and the absence disclosure
 * where its freshness slot is empty. `omit` drops one family to prove the
 * denominator check is not vacuous. */
function serverCensus(html: string, omit?: 'tier' | 'freshness' | 'challenge'): Census {
  const css = (/<style>([\s\S]*?)<\/style>/.exec(html)?.[1] ?? '').replace(/\/\*[\s\S]*?\*\//g, '');
  const body = html.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
  const histogram: Record<string, Record<string, number>> = { label: {}, tier: {}, freshness: {}, challenge: {} };
  let tuples = 0;
  let absences = 0;
  const bump = (family: string, value: string): void => {
    const counts = histogram[family] as Record<string, number>;
    counts[value] = (counts[value] ?? 0) + 1;
  };
  for (const match of body.matchAll(/<span class="claim-tuple"[^>]*>[^<]*<\/span>(<i><\/i>)?(<span class="freshness-absence"[^>]*>)?/g)) {
    tuples += 1;
    const tag = match[0];
    const label = attribute(tag, 'data-epistemic-label') as string;
    const tier = attribute(tag, 'data-epistemic-tier') as string;
    const freshness = attribute(tag, 'data-epistemic-freshness');
    const challenge = attribute(tag, 'data-challenge-state') as string;
    if (match[1] === undefined) throw new Error(`no mark element after the tuple ${tier}/${freshness ?? '-'}/${challenge}`);
    const fields = [['tier', tier], ...(freshness === undefined ? [] : [['freshness', freshness]]), ['challenge', challenge]] as [keyof typeof SLOTS, string][];
    for (const [family, value] of fields) {
      if (TREATMENTS[value] === undefined || !css.includes(markRule(family, value))) throw new Error(`no served ${family} mark rule resolves ${value}`);
    }
    bump('label', label);
    for (const [family, value] of fields) if (family !== omit) bump(family, value);
    if (freshness === undefined) {
      if (label !== 'Unknown') throw new Error('a positive claim has no freshness');
      if (match[2] === undefined) throw new Error('missing freshness is not disclosed beside the tuple');
      absences += 1;
    } else if (match[2] !== undefined) {
      throw new Error('absence disclosed beside a tuple that carries freshness');
    }
  }
  const independent = [...body.matchAll(/class="claim-tuple"/g)].length;
  if (independent !== tuples) throw new Error(`census reached ${tuples} of ${independent} tuples`);
  const sum = (family: string): number => Object.values(histogram[family] as Record<string, number>).reduce((a, b) => a + b, 0);
  if (sum('tier') !== tuples || sum('challenge') !== tuples || sum('freshness') + absences !== tuples) throw new Error('a family does not cover the tuple denominator');
  return { tuples, histogram, absences };
}

describe('tuple field encoding tables (syzygy-dov.3.2; P-70 M3 slice 5)', () => {
  it('closes six tiers, four freshness values and one challenge value, with unstated outside the tier registry', () => {
    expect(TIER_ENCODING.map((entry) => entry.value)).toEqual([...TIERS]);
    expect(FRESHNESS_ENCODING.map((entry) => entry.value)).toEqual([...FRESHNESS]);
    expect(CHALLENGE_ENCODING.map((entry) => entry.value)).toEqual([...CHALLENGE]);
    expect(TIER_ABSENCE_ENCODING.value).toBe('unstated');
    expect(TIER_ENCODING.map((entry) => entry.value)).not.toContain('unstated');
    const all = [...TIER_ENCODING, TIER_ABSENCE_ENCODING, ...FRESHNESS_ENCODING, ...CHALLENGE_ENCODING];
    expect(all.map((entry) => entry.value).sort()).toEqual(Object.keys(TREATMENTS).sort());
    for (const entry of all) {
      expect([entry.className, entry.symbol, entry.token], entry.value).toEqual(TREATMENTS[entry.value]);
      expect(copyText(entry.description).startsWith(`${entry.value} — `), entry.value).toBe(true);
      expect(DESIGN_TOKENS_CSS).toContain(`${entry.token}: `);
    }
    // No two treatments share a class or a symbol, and none reuses a label's symbol.
    expect(new Set(all.map((entry) => entry.className)).size).toBe(all.length);
    const symbols = [...all.map((entry) => entry.symbol), ...EPISTEMIC_ENCODING.map((entry) => entry.symbol)];
    expect(new Set(symbols).size).toBe(symbols.length);
    // Only the freshness slot declares a reachability note, each with a reason.
    for (const entry of FRESHNESS_ENCODING) expect(entry.unreachable).toMatch(/^Not reachable at this evaluation: .+/);
    for (const entry of [...TIER_ENCODING, TIER_ABSENCE_ENCODING, ...CHALLENGE_ENCODING]) expect(entry.unreachable).toBeUndefined();
  });

  it('generates one tuple mark rule and one glossary rule pair per declared value, and no other tuple-field rule', () => {
    const html = renderPolarisPage(variants()[2]?.model as PocModel);
    const css = (/<style>([\s\S]*?)<\/style>/.exec(html)?.[1] ?? '').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const [value, [className, symbol, token]] of Object.entries(TREATMENTS)) {
      expect(css, value).toContain(`.${className} { color: var(${token}); }`);
      expect(css, value).toContain(`.${className}::before { content: "${symbol} " / ""; }`);
    }
    const selectors = [...css.matchAll(/(\.tt-[a-z-]+)(?:::before)?\s*\{/g)].map((match) => match[1] as string);
    expect(new Set(selectors)).toEqual(new Set(Object.values(TREATMENTS).map(([className]) => `.${className}`)));
    expect(selectors.length).toBe(Object.keys(TREATMENTS).length * 2);
    const families: Record<string, keyof typeof SLOTS> = Object.fromEntries([...[...TIERS, 'unstated'].map((value) => [value, 'tier']), ...FRESHNESS.map((value) => [value, 'freshness']), ...CHALLENGE.map((value) => [value, 'challenge'])]);
    for (const value of Object.keys(TREATMENTS)) expect(css.split(markRule(families[value] as keyof typeof SLOTS, value)).length - 1, value).toBe(1);
    const markRules = [...css.matchAll(/\.claim-tuple\[(?:data-epistemic-tier|data-epistemic-freshness|data-challenge-state)=[^\]]*\][^{]*\{[^}]*\}/g)].map((match) => match[0]);
    expect(markRules.length).toBe(Object.keys(TREATMENTS).length);
  });

  it('generates the glossary rows from the declaration: every value once, in its class, with freshness reachability stated both ways', () => {
    for (const { name, model } of variants()) {
      const html = renderPolarisPage(model);
      const block = /<details id="polaris-claim-states"[^>]*>([\s\S]*?)<\/details>/.exec(html)?.[1] as string;
      expect(block, name).toBeDefined();
      const rows = [...block.matchAll(/<li class="(tt-[a-z-]+)"[^>]*>([^<]*)<\/li>/g)].map((match) => ({ className: match[1] as string, text: match[2] as string }));
      expect(rows.map((row) => row.className), name).toEqual([...TIERS, 'unstated', ...FRESHNESS, ...CHALLENGE].map((value) => TREATMENTS[value]?.[0]));
      // Every other row is the one proposal disclosure row (slice 6).
      expect(block.split('<li').length - 1, name).toBe(rows.length + 1);
      expect(block, name).toContain(copyText('states.strengthen'));
      const served = new Set([...html.matchAll(/<span class="claim-tuple"[^>]*\sdata-epistemic-freshness="([^"]*)"/g)].map((match) => match[1]));
      for (const value of FRESHNESS) {
        const row = rows.find((candidate) => candidate.className === TREATMENTS[value]?.[0]);
        expect(row?.text.startsWith(`${value} — `), `${name}: ${value}`).toBe(true);
        expect(row?.text.includes('Not reachable at this evaluation'), `${name}: ${value} reachability`).toBe(!served.has(value));
      }
    }
  });

  it('follows every served tuple with marks that resolve its declared values, keeps the freshness slot closed at four, and discloses its absence', () => {
    let total = 0;
    let absences = 0;
    for (const { name, model } of variants()) {
      const html = renderPolarisPage(model);
      const census = serverCensus(html);
      for (const value of Object.keys(census.histogram['freshness'] as object)) expect(FRESHNESS, `${name}: ${value}`).toContain(value);
      for (const value of Object.keys(census.histogram['tier'] as object)) expect([...TIERS, 'unstated'], `${name}: ${value}`).toContain(value);
      const attributes = [...html.matchAll(/\sdata-epistemic-freshness="([^"]*)"/g)].map((match) => match[1]);
      for (const value of attributes) expect(FRESHNESS).toContain(value);
      for (const absence of html.matchAll(/<span class="freshness-absence"[^>]*>([\s\S]*?)<\/span>/g)) {
        expect(absence[1]).toBe('Currency bound not declared; this claim remains Unknown. Route: Declare the bound in quality policy.');
        expect(absence[0]).not.toContain('href=');
      }
      total += census.tuples;
      absences += census.absences;
    }
    expect(total).toBeGreaterThan(150);
    expect(absences).toBe(1);
  });

  it('rejects a census that drops a family, a fifth freshness value, a positive claim with no freshness, or a mark that does not resolve, and refuses to render an undeclared tier', () => {
    const { model } = variants()[5] as { model: PocModel };
    const html = renderPolarisPage(model);
    expect(serverCensus(html).tuples).toBeGreaterThan(40);
    for (const family of ['tier', 'freshness', 'challenge'] as const) expect(() => serverCensus(html, family)).toThrow();
    const fifth = html.replace(/data-epistemic-freshness="fresh"/, 'data-epistemic-freshness="unrecorded"');
    expect(() => serverCensus(fifth)).toThrow();
    const positive = html.replace(/(<span class="claim-tuple"[^>]*data-epistemic-label=")Unknown("[^>]*>[^<]*<\/span><i><\/i><span class="freshness-absence")/, '$1Observed$2');
    expect(positive).not.toBe(html);
    expect(() => serverCensus(positive)).toThrow('a positive claim has no freshness');
    const swapped = html.replace('[data-epistemic-tier="report-fact"]::after { content: "◇ "', '[data-epistemic-tier="report-fact"]::after { content: "○ "');
    expect(swapped).not.toBe(html);
    expect(() => serverCensus(swapped)).toThrow('no served tier mark rule');
    const unmarked = html.replace(/(<span class="claim-tuple"[^>]*>[^<]*<\/span>)<i><\/i>/, '$1');
    expect(unmarked).not.toBe(html);
    expect(() => serverCensus(unmarked)).toThrow('no mark element');
    const observed = variants()[2]?.model as PocModel;
    expect(renderPolarisPage(withTier(observed, 'reduced-fidelity'))).toContain('data-epistemic-tier="reduced-fidelity"');
    expect(() => renderPolarisPage(withTier(observed, 'derived-fact'))).toThrow('no declared tier encoding for value: derived-fact');
  });

  it.skipIf(browserExecutable === undefined)('sweeps the post-JavaScript DOM of the three surfaces, Home apart: every tuple field and glossary row renders its declared symbol and token', async () => {
    const model = variants()[5]?.model as PocModel;
    const start = await createDaemon({ stateDir: join(tempDir('syzygy-dov32-state-'), 'state'), routes: pocRoutes(() => model), port: 0 });
    if (!start.started) throw new Error(`daemon failed to start: ${start.failure.kind}`);
    running.push(start.daemon);
    const baseUrl = `http://${start.daemon.host}:${start.daemon.port}`;
    const directory = tempDir('syzygy-dov32-pages-');
    await withBrowserPage(browserExecutable as string, async (page) => {
      for (const form of ['direct', 'tailnet'] as const) {
        const perPage: Record<string, BrowserTupleCensus> = {};
        for (const path of [POC_HUMAN_PATH, POLARIS_HUMAN_PATH, TRAJECTORY_HUMAN_PATH, ORRERY_HUMAN_PATH]) {
          const response = form === 'direct' ? await fetch(`${baseUrl}${path}`) : await fetchWithHost(`${baseUrl}${path}`, TAILNET_HOST, { origin: `https://${TAILNET_HOST}` });
          expect(response.status).toBe(200);
          const html = await response.text();
          const file = join(directory, `${form}-${path === '/' ? 'home' : path.slice(1)}.html`);
          writeFileSync(file, html);
          await page.navigate(pathToFileURL(file).href);
          const runtime = await browserTupleCensus(page);
          const server = serverCensus(html);
          expect(runtime.failures, `${form} ${path}`).toEqual([]);
          expect(runtime.queried, `${form} ${path}`).toBe(runtime.walked);
          expect(runtime.walked, `${form} ${path}`).toBe(server.tuples);
          expect(runtime.histogram, `${form} ${path}`).toEqual(server.histogram);
          perPage[path] = runtime;
        }
        // The page population is hand-typed: Home plus the three surfaces.
        expect(Object.keys(perPage).sort()).toEqual(['/', '/orrery', '/polaris', '/trajectory']);
        const surfaces = [POLARIS_HUMAN_PATH, TRAJECTORY_HUMAN_PATH, ORRERY_HUMAN_PATH].map((path) => perPage[path] as BrowserTupleCensus);
        expect(surfaces.length).toBe(3);
        const total = surfaces.reduce((sum, census) => sum + census.walked, 0);
        expect(total).toBe((perPage[POLARIS_HUMAN_PATH] as BrowserTupleCensus).walked);
        expect(total).toBeGreaterThan(40);
        expect((perPage[POC_HUMAN_PATH] as BrowserTupleCensus).walked).toBe(0);
        expect((perPage[POLARIS_HUMAN_PATH] as BrowserTupleCensus).glossaryRows).toBe(12);
      }
    });
  }, 60_000); // eight served-page loads in a real browser: worst 7.6 s over 5 alone runs at load1 62-71 (docs/evidence/syzygy-bpyt-4-31/durations/tuple-encoding.test.tests.json)
});

interface BrowserTupleCensus {
  readonly queried: number;
  readonly walked: number;
  readonly glossaryRows: number;
  readonly histogram: Record<string, Record<string, number>>;
  readonly failures: readonly string[];
}

/** Two methods over the runtime DOM: a selector count and a TreeWalker that
 * reads each tuple's values, the computed symbol and colour of the
 * pseudo-element that carries each one, and the glossary rows' treatment,
 * against the hand-typed table. */
async function browserTupleCensus(page: BrowserPage): Promise<BrowserTupleCensus> {
  return page.evaluate<BrowserTupleCensus>(`(() => {
    const TREATMENTS = ${JSON.stringify(TREATMENTS)};
    const RGB = ${JSON.stringify(RGB)};
    const failures = [];
    const histogram = { label: {}, tier: {}, freshness: {}, challenge: {} };
    const bump = (family, value) => { histogram[family][value] = (histogram[family][value] || 0) + 1; };
    const check = (element, pseudo, value, where) => {
      const expected = TREATMENTS[value];
      if (!expected) { failures.push(where + ': undeclared ' + value); return; }
      const symbol = getComputedStyle(element, pseudo).content;
      if (!symbol.includes(expected[1])) failures.push(where + ': symbol ' + symbol + ' for ' + value);
      const colour = getComputedStyle(element, pseudo).color;
      if (colour !== RGB[expected[2]]) failures.push(where + ': colour ' + colour + ' for ' + value);
    };
    const PSEUDO = { tier: '::after', freshness: '::before', challenge: '::after' };
    const queried = document.querySelectorAll('.claim-tuple').length;
    let walked = 0;
    const nodes = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    while (nodes.nextNode()) {
      const tuple = nodes.currentNode;
      if (!tuple.classList.contains('claim-tuple')) continue;
      walked++;
      const id = tuple.getAttribute('data-claim-id');
      const fields = [['tier', tuple.getAttribute('data-epistemic-tier')], ['freshness', tuple.getAttribute('data-epistemic-freshness')], ['challenge', tuple.getAttribute('data-challenge-state')]].filter((field) => field[1] !== null);
      bump('label', tuple.getAttribute('data-epistemic-label'));
      const mark = tuple.nextElementSibling;
      if (!mark || mark.tagName !== 'I' || mark.textContent !== '' || mark.attributes.length !== 0) { failures.push(id + ': no empty mark element'); continue; }
      for (const [family, value] of fields) {
        bump(family, value);
        check(family === 'tier' ? tuple : mark, PSEUDO[family], value, id + ' ' + family);
      }
      if (tuple.getAttribute('data-epistemic-freshness') === null) {
        const empty = getComputedStyle(mark, '::before').content;
        if (empty !== 'none' && empty !== 'normal') failures.push(id + ': freshness mark without a value ' + empty);
        if (!(mark.nextElementSibling && mark.nextElementSibling.classList.contains('freshness-absence'))) failures.push(id + ': absence not disclosed');
      }
    }
    const rows = [...document.querySelectorAll('#polaris-claim-states li[class^="tt-"]')];
    for (const row of rows) {
      const value = row.textContent.split(' — ')[0];
      if (!TREATMENTS[value] || !row.classList.contains(TREATMENTS[value][0])) failures.push('glossary: class ' + row.className + ' for ' + value);
      check(row, '::before', value, 'glossary');
      if (getComputedStyle(row).color !== RGB[TREATMENTS[value] ? TREATMENTS[value][2] : '']) failures.push('glossary: row colour for ' + value);
    }
    return { queried, walked, glossaryRows: rows.length, histogram, failures };
  })()`);
}
