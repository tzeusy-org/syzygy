// POC-REQ-014 "Every work item's governing intent renders as a counted
// Unknown" (three-surface-poc-governing-intent-amendment-v1.0, syzygy-u05.20).
//
// The machine answer is `GET /api/poc`'s body, `JSON.stringify(model)`
// (routes.ts); the human channel is the served Trajectory page. Both
// denominators are this checker's own enumerations: the served items read
// from the answer, and the cards read from the page. The reason and its
// route are typed here from RFC2-24 (`RFC-0002/rendering-vocabularies.md`,
// row 10); the expected encoding is POC-REQ-060's checked-in table, pinned
// to its literal class below; the fixture title is this file's own.
//
// `violations()` is the signed oracle as one predicate per falsifier limb;
// the "falsifier" cases put each limb's counterexample into a copy of a
// passing answer or page and require the oracle to name it (rule 6 at the
// predicate). The narrowed board is the set of cards the narrowing keeps:
// cards marked Unknown. `trajectory-narrowing.browser.test.ts` drives the
// real toggle in Chrome.
import { rmSync } from 'node:fs';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { BUTLERS_POC_SEEDS, buildPocModel, countGoverningIntentUnknown, governingIntentUnknown, type PocModel, type WorkItemFact } from '@syzygy/three-surface-poc-core';

import { EPISTEMIC_ENCODING } from './design-tokens.js';
import { buildFixtureModel, fixtureRepoWithGit, fixtureWorkItemRow } from './test-model-fixture.js';
import { renderTrajectoryPage } from './trajectory.js';

const REASON = 'source-uncaptured-or-unreachable';
const ROUTE = 'Repair the observer/source; new snapshot';
const UNKNOWN_CLASS = 'epistemic-unknown';
const OTHER_STATE_CLASSES = ['epistemic-observed'];
const TITLE_IDENTIFIER = 'POC-REQ-010';
const TITLED_ITEM = 'bu-titled';
const FIXTURE_TITLES: ReadonlyMap<string, string> = new Map([[TITLED_ITEM, `Implement ${TITLE_IDENTIFIER}`]]);

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Obj = { [key: string]: Json };

function isObj(value: Json | undefined): value is Obj {
  return value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value);
}

function leaves(value: Json, path = ''): [string, Json][] {
  if (Array.isArray(value)) return value.flatMap((member, index) => leaves(member, `${path}[${index}]`));
  if (isObj(value)) return Object.entries(value).flatMap(([key, member]) => leaves(member, path === '' ? key : `${path}.${key}`));
  return [[path, value]];
}

function text(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
}

interface Card { readonly id: string; readonly governedBy: string | undefined; readonly body: string }

/** Every rendered card, read from the page's own `<li class="wi-card …">` tags. */
function cards(html: string): Card[] {
  const out: Card[] = [];
  for (const open of html.matchAll(/<li\b([^>]*\sclass="wi-card\b[^"]*"[^>]*)>/g)) {
    const attrs = open[1]!;
    const id = /\sdata-work-item-id="([^"]*)"/.exec(attrs)?.[1];
    if (id === undefined) continue;
    const start = open.index! + open[0].length;
    const end = html.indexOf('</li>', start);
    out.push({ id, governedBy: /\sdata-governed-by="([^"]*)"/.exec(attrs)?.[1], body: html.slice(start, end) });
  }
  return out;
}

/** The narrowed board: the cards the narrowing keeps, those marked Unknown. */
function narrowed(html: string): string[] {
  return cards(html).filter((card) => card.governedBy === 'Unknown').map((card) => card.id);
}

function region(html: string): string | undefined {
  return /<p\b[^>]*\sdata-parity-field="work-item-governed-by-count"[^>]*>([\s\S]*?)<\/p>/.exec(html)?.[1];
}

function figure(regionHtml: string, field: string): number | undefined {
  const match = new RegExp(`data-parity-field="${field}">(\\d+)<`).exec(regionHtml);
  return match === null ? undefined : Number(match[1]);
}

/** The signed oracle and falsifier, one message per violated limb. */
function violations(answer: Obj, html: string): string[] {
  const found: string[] = [];
  const work = answer.workItems;
  if (!isObj(work) || work.kind !== 'observed' || !Array.isArray(work.items)) return ['workItems is not an observed observation'];
  const items = work.items.filter(isObj);
  let unknowns = 0;
  for (const item of items) {
    const governedBy = item.governedBy;
    const id = String(item.id);
    if (!isObj(governedBy)) { found.push(`${id}: no governedBy`); continue; }
    const routes = Array.isArray(governedBy.resolutionRoutes) ? governedBy.resolutionRoutes.filter(isObj) : [];
    const isUnknown = governedBy.label === 'Unknown' && governedBy.closedReason === REASON;
    if (governedBy.label !== 'Unknown') found.push(`${id}: governedBy is ${String(governedBy.label)}, not Unknown`);
    if (governedBy.closedReason !== REASON) found.push(`${id}: reason ${String(governedBy.closedReason)}`);
    if (routes.length !== 1 || routes[0]?.reason !== REASON || routes[0]?.route !== ROUTE) found.push(`${id}: route is not RFC2-24's for ${REASON}`);
    // The title is the checker's own fixture row's: the answer serves none
    // (SEC-5, syzygy-jytt).
    const title = FIXTURE_TITLES.get(id) ?? '';
    for (const identifier of title.match(/\b[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+\b/g) ?? []) {
      if (JSON.stringify(governedBy).includes(identifier)) found.push(`${id}: governedBy names ${identifier} from its title`);
    }
    if (isUnknown) unknowns += 1;
  }
  if (unknowns !== items.length) found.push(`machine: ${unknowns} of ${items.length} served items carry the Unknown`);
  if (work.governedByUnknownCount !== unknowns) found.push(`machine count ${String(work.governedByUnknownCount)} differs from the enumerated ${unknowns}`);
  // No title is served, so no served field may hold the title's identifier.
  const titleHolders = leaves(answer).filter(([, value]) => typeof value === 'string' && value.includes(TITLE_IDENTIFIER)).map(([path]) => path);
  for (const path of titleHolders) found.push(`${path} names ${TITLE_IDENTIFIER}`);

  const rendered = cards(html);
  const regionHtml = region(html);
  if (regionHtml === undefined) {
    found.push('no count region');
  } else {
    const count = figure(regionHtml, 'governed-by-unknown-count');
    const inside = figure(regionHtml, 'governed-by-unknown-inside');
    const outside = figure(regionHtml, 'governed-by-unknown-outside');
    if (count !== unknowns) found.push(`Trajectory count ${String(count)} differs from the enumerated ${unknowns}`);
    if (count !== work.governedByUnknownCount) found.push(`the channels serve different counts: ${String(count)} and ${String(work.governedByUnknownCount)}`);
    if (inside !== rendered.length) found.push(`inside ${String(inside)} differs from the ${rendered.length} rendered cards`);
    if (inside === undefined || outside === undefined || inside + outside !== count) found.push(`inside ${String(inside)} plus outside ${String(outside)} differs from ${String(count)}`);
    const words = text(regionHtml);
    if (!words.includes(REASON)) found.push('count region lacks the reason');
    if (!words.includes(ROUTE)) found.push('count region lacks the route');
    if (!/\bSupplying\b[^.]*\bwarrant\b[^.]*\bresolves\b/.test(words)) found.push('count region lacks the warrant resolution statement');
  }
  for (const card of rendered) {
    const marks = [...card.body.matchAll(/<span class="([^"]*)" data-parity-field="work-item-governed-by"([^>]*)>([^<]*)/g)];
    if (marks.length !== 1) { found.push(`${card.id}: ${marks.length} governing-intent marks`); continue; }
    const [, classes = '', attrs = '', label = ''] = marks[0]!;
    const classList = classes.split(/\s+/);
    if (!classList.includes(UNKNOWN_CLASS)) found.push(`${card.id}: mark lacks the Unknown encoding`);
    for (const other of OTHER_STATE_CLASSES) if (classList.includes(other)) found.push(`${card.id}: mark carries ${other}`);
    if (!/\sdata-unknown-reason="source-uncaptured-or-unreachable"/.test(attrs)) found.push(`${card.id}: mark lacks the reason`);
    if (!label.startsWith('Governing intent: Unknown')) found.push(`${card.id}: mark reads "${label}"`);
  }
  const all = rendered.map((card) => card.id);
  if (narrowed(html).join() !== all.join()) found.push(`narrowed board [${narrowed(html).join()}] differs from [${all.join()}]`);
  return found;
}

// Two open items (one titled with a requirement identifier) and 52 closed:
// the selection keeps the 50 most recently closed, so two fall outside it.
function rows(): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [
    { ...fixtureWorkItemRow(TITLED_ITEM, 'open', '2026-08-01T00:00:00Z', '2026-08-02T00:00:00Z', null), title: FIXTURE_TITLES.get(TITLED_ITEM) },
    fixtureWorkItemRow('bu-open2', 'in_progress', '2026-08-03T00:00:00Z', '2026-08-04T00:00:00Z', null),
  ];
  for (let day = 1; day <= 52; day += 1) {
    const instant = `2026-07-${String(Math.ceil(day / 2)).padStart(2, '0')}T${day % 2 === 0 ? '12' : '00'}:00:00Z`;
    out.push(fixtureWorkItemRow(`bu-closed${String(day).padStart(2, '0')}`, 'closed', '2026-06-01T00:00:00Z', instant, instant));
  }
  return out;
}

const cleanups: string[] = [];
let model: PocModel;
let answer: Obj;
let html: string;

beforeAll(() => {
  model = buildFixtureModel(cleanups, { workItemRows: rows() });
  answer = JSON.parse(JSON.stringify(model)) as Obj;
  html = renderTrajectoryPage(model);
});

afterAll(() => {
  for (const directory of cleanups.splice(0)) rmSync(directory, { recursive: true, force: true });
});

function copy(): Obj {
  return JSON.parse(JSON.stringify(answer)) as Obj;
}

function items(target: Obj): Obj[] {
  return (target.workItems as Obj).items as Obj[];
}

describe('POC-REQ-014: every work item\'s governing intent renders as a counted Unknown', () => {
  it('the encoding the oracle expects is the POC-REQ-060 table\'s Unknown row', () => {
    expect(EPISTEMIC_ENCODING.find((entry) => entry.label === 'Unknown')?.className).toBe(UNKNOWN_CLASS);
    expect(EPISTEMIC_ENCODING.filter((entry) => entry.label !== 'Unknown').map((entry) => entry.className)).toEqual(OTHER_STATE_CLASSES);
  });

  it('serves 54 of 54 with the Unknown on both channels; Trajectory shows 52 inside and 2 outside', () => {
    expect(items(answer)).toHaveLength(54);
    expect(cards(html)).toHaveLength(52);
    const regionHtml = region(html) ?? '';
    expect(figure(regionHtml, 'governed-by-unknown-count')).toBe(54);
    expect(figure(regionHtml, 'governed-by-unknown-inside')).toBe(52);
    expect(figure(regionHtml, 'governed-by-unknown-outside')).toBe(2);
    expect(violations(answer, html)).toEqual([]);
  });

  it('each served governedBy is the Unknown with RFC2-24\'s reason and route', () => {
    for (const item of items(answer)) {
      expect(item.governedBy).toEqual({
        label: 'Unknown',
        closedReason: 'source-uncaptured-or-unreachable',
        resolutionRoutes: [{ reason: 'source-uncaptured-or-unreachable', route: 'Repair the observer/source; new snapshot', actor: 'operator', verb: 'repair', target: 'evaluation' }],
      });
    }
  });

  // SEC-5 (syzygy-jytt): the read row carries the title, the observation
  // never selects or serves it, so the counterexample now shows nothing
  // served naming the identifier at all, on either channel.
  it('a read row titled "Implement POC-REQ-010" yields the same Unknown, and nothing served names POC-REQ-010', () => {
    const titled = items(answer).find((item) => item.id === TITLED_ITEM);
    expect(titled).toBeDefined();
    expect(titled).not.toHaveProperty('title');
    expect(titled?.governedBy).toEqual(items(answer).find((item) => item.id === 'bu-open2')?.governedBy);
    expect(JSON.stringify(answer)).not.toContain('POC-REQ-010');
    const card = cards(html).find((entry) => entry.id === TITLED_ITEM);
    expect(card?.body).toBeDefined();
    expect(html).not.toContain('POC-REQ-010');
  });

  it('the count region reads, as text alone, the reason, the route and the warrant statement', () => {
    const words = text(region(html) ?? '');
    expect(words).toContain('Reason: source-uncaptured-or-unreachable.');
    expect(words).toContain('Route: Repair the observer/source; new snapshot.');
    expect(words).toContain("Supplying an item's warrant resolves its governing intent.");
  });

  it('the narrowed board lists exactly the 52 rendered cards', () => {
    expect(narrowed(html)).toEqual(cards(html).map((card) => card.id));
    expect(narrowed(html)).toHaveLength(52);
    expect(html).toContain('<input type="checkbox" class="narrow-toggle" id="narrow-governing-intent-unknown">');
  });

  it('counts the Unknown over the served set, never assuming every item carries it', () => {
    const facts = (items(answer) as unknown as WorkItemFact[]).slice(0, 3);
    expect(countGoverningIntentUnknown(facts)).toBe(3);
    const observed: WorkItemFact = { ...facts[0]!, governedBy: { ...governingIntentUnknown(), label: 'Observed' } as unknown as WorkItemFact['governedBy'] };
    expect(countGoverningIntentUnknown([observed, facts[1]!, facts[2]!])).toBe(2);
    const otherReason: WorkItemFact = { ...facts[0]!, governedBy: { ...governingIntentUnknown(), closedReason: 'missing-evidence' } };
    expect(countGoverningIntentUnknown([otherReason, facts[1]!])).toBe(1);
  });

  // R-IMPL-P100-GOVERNING-INTENT-1 finding 1 asked about an Unknown board
  // beside observed work items. The model never produces that pair: the board
  // is Unknown only when the work-item read is. With no served item set, neither channel serves a count.
  it('an Unknown board never sits beside a served item set, so neither channel counts one', () => {
    const { repoRoot, revision } = fixtureRepoWithGit(cleanups);
    const evaluation = { snapshot: 'butlers@states', asOf: '2026-08-30T12:00:00Z' };
    const states: Readonly<Record<string, PocModel>> = {
      'unreachable Dolt': buildPocModel({ seeds: BUTLERS_POC_SEEDS, repoRoot, repositoryRevision: revision, observerRevision: revision, evaluation, runWorkItemQuery: () => { throw new Error('connection refused'); } }),
    };
    for (const [name, state] of Object.entries(states)) {
      const served = JSON.parse(JSON.stringify(state)) as Obj;
      expect.soft([name, (served.workItems as Obj).kind, (served.trajectory as Obj).kind]).toEqual([name, 'unknown', 'unknown']);
      expect.soft(leaves(served).filter(([path]) => /governedBy/.test(path))).toEqual([]);
      const page = renderTrajectoryPage(state);
      expect.soft(page).not.toContain('data-parity-field="work-item-governed-by-count"');
      expect.soft(page).toContain('data-unknown-disclosure="region:work-items"');
    }
    expect(model.workItems.kind === 'observed' && model.trajectory.kind === 'observed').toBe(true);
  });

  describe('falsifier: the oracle names each limb', () => {
    const cases: readonly [string, (target: Obj) => Obj, RegExp][] = [
      ['a served item with no governedBy', (t) => { delete items(t)[0]!.governedBy; return t; }, /: no governedBy$/],
      ['a governedBy that is not Unknown (green)', (t) => { (items(t)[0]!.governedBy as Obj).label = 'Observed'; return t; }, /governedBy is Observed, not Unknown/],
      ['an identifier from the title', (t) => { const g = items(t).find((item) => item.id === TITLED_ITEM)!.governedBy as Obj; g.reason = 'Governed by POC-REQ-010'; return t; }, /governedBy names POC-REQ-010 from its title/],
      ['another reason', (t) => { (items(t)[1]!.governedBy as Obj).closedReason = 'missing-declaration'; return t; }, /reason missing-declaration/],
      ['another route', (t) => { (((items(t)[1]!.governedBy as Obj).resolutionRoutes as Obj[])[0]!).route = 'Repair the observer or source; new snapshot'; return t; }, /route is not RFC2-24's/],
      ['a machine miscount', (t) => { (t.workItems as Obj).governedByUnknownCount = 53; return t; }, /machine count 53 differs/],
      ['a served identifier from the title', (t) => { (t.workItems as Obj).governingIntent = 'POC-REQ-010'; return t; }, /workItems.governingIntent names POC-REQ-010$/],
      ['a served title', (t) => { items(t).find((item) => item.id === TITLED_ITEM)!.title = 'Implement POC-REQ-010'; return t; }, /workItems.items\[\d+\].title names POC-REQ-010$/],
    ];
    for (const [name, mutate, expected] of cases) {
      it(name, () => {
        expect(violations(mutate(copy()), html).some((message) => expected.test(message))).toBe(true);
      });
    }

    const pageCases: readonly [string, (page: string) => string, RegExp][] = [
      ['a Trajectory miscount', (p) => p.replace('data-parity-field="governed-by-unknown-count">54<', 'data-parity-field="governed-by-unknown-count">53<'), /Trajectory count 53 differs/],
      ['channels that disagree', (p) => p.replace('data-parity-field="governed-by-unknown-count">54<', 'data-parity-field="governed-by-unknown-count">55<'), /the channels serve different counts/],
      ['an inside figure that is not the rendered selection', (p) => p.replace('data-parity-field="governed-by-unknown-inside">52<', 'data-parity-field="governed-by-unknown-inside">54<'), /inside 54 differs from the 52 rendered cards/],
      ['inside plus outside that misses the count', (p) => p.replace('data-parity-field="governed-by-unknown-outside">2<', 'data-parity-field="governed-by-unknown-outside">0<'), /plus outside 0 differs from 54/],
      ['a region missing the reason', (p) => p.replace('Reason: <code>source-uncaptured-or-unreachable</code>.', 'Reason: none.'), /lacks the reason$/],
      ['a region missing the route', (p) => p.replace(/(data-parity-field="work-item-governed-by-count"[\s\S]*?)Repair the observer\/source; new snapshot/, '$1Repair it'), /lacks the route$/],
      ['a region missing the resolution statement', (p) => p.replace("Supplying an item's warrant resolves its governing intent.", ''), /warrant resolution statement/],
      ['no count region', (p) => p.replace('data-parity-field="work-item-governed-by-count"', 'data-parity-field="other"'), /no count region/],
      ['a rendered item without the Unknown encoding', (p) => p.replace(/<span class="epistemic epistemic-unknown" data-parity-field="work-item-governed-by"/, '<span class="epistemic" data-parity-field="work-item-governed-by"'), /mark lacks the Unknown encoding/],
      ['a rendered item with an encoding for another state', (p) => p.replace(/<span class="epistemic epistemic-unknown" data-parity-field="work-item-governed-by"/, '<span class="epistemic epistemic-unknown epistemic-observed" data-parity-field="work-item-governed-by"'), /mark carries epistemic-observed/],
      ['a rendered item with no mark', (p) => p.replace(/<span class="epistemic epistemic-unknown" data-parity-field="work-item-governed-by"/, '<span class="epistemic epistemic-unknown" data-parity-field="other"'), /0 governing-intent marks/],
      ['a narrowed board that drops an item', (p) => p.replace(/ data-governed-by="Unknown"/, ' data-governed-by="Observed"'), /narrowed board .* differs/],
    ];
    for (const [name, mutate, expected] of pageCases) {
      it(name, () => {
        const mutated = mutate(html);
        expect(mutated).not.toBe(html);
        expect(violations(copy(), mutated).some((message) => expected.test(message))).toBe(true);
      });
    }
  });
});
