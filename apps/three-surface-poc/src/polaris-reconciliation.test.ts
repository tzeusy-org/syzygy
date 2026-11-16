// M14 slices 3 and 4 (P-81 Q3, Q4): the source-identity legend and the
// catalog reconciliation line.
//
// Expected figures are hand-typed literals taken from the fixture, never
// derived through the module under test; the marker count is re-derived
// here by its own regex over the final HTML.
import { createHash } from 'node:crypto';
import { rmSync } from 'node:fs';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { SOURCE_RULES, sourceIdentityOf, type PocModel, type ProjectShape, type ProjectShapeSource } from '@syzygy/three-surface-poc-core';

import { copyText } from './polaris-copy.js';
import {
  RECONCILIATION_PLACEHOLDER,
  catalogReconciliation,
  renderCatalogReconciliation,
  substituteCatalogReconciliation,
} from './polaris-reconciliation.js';
import { renderPolarisPage } from './polaris.js';
import { buildFixtureModel } from './test-model-fixture.js';
import {
  ADMITTING_AUTHORITY,
  PROJECT_SHAPE_FIXTURE_TEXTS,
  PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC,
  PROJECT_SHAPE_FIXTURE_TEXTS_WITH_SECRET,
  REJECTING_AUTHORITY,
  projectShapeFixtureGit,
} from './test-project-shape-fixture.js';

type Variant = 'unevaluated' | 'rejected' | 'observation-failed' | 'observed' | 'observed-with-secret' | 'observed-with-baseline-spec' | 'observed-degraded';

const cleanups: string[] = [];
const MODELS = new Map<Variant, PocModel>();
const PAGES = new Map<Variant, string>();

function build(variant: Variant): PocModel {
  const observed = (texts: Readonly<Record<string, string>>, runGit = projectShapeFixtureGit(texts)): PocModel =>
    buildFixtureModel(cleanups, { projectShape: { authority: ADMITTING_AUTHORITY, runGit } });
  switch (variant) {
    case 'unevaluated':
      return buildFixtureModel(cleanups);
    case 'rejected':
      return buildFixtureModel(cleanups, { projectShape: { authority: REJECTING_AUTHORITY, runGit: projectShapeFixtureGit() } });
    case 'observation-failed': {
      const inner = projectShapeFixtureGit();
      return observed(PROJECT_SHAPE_FIXTURE_TEXTS, (args) => {
        if (args[0] === 'ls-tree') throw new Error('fixture: tree listing refused');
        return inner(args);
      });
    }
    case 'observed':
      return observed(PROJECT_SHAPE_FIXTURE_TEXTS);
    case 'observed-with-secret':
      return observed(PROJECT_SHAPE_FIXTURE_TEXTS_WITH_SECRET);
    case 'observed-with-baseline-spec':
      return observed(PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC);
    case 'observed-degraded': {
      // One body read refused: that source stays in the population as
      // unavailable (the parity sweep's degraded fixture).
      const inner = projectShapeFixtureGit();
      const body = new TextEncoder().encode(PROJECT_SHAPE_FIXTURE_TEXTS['about/heart-and-soul/vision.md'] as string);
      const refused = createHash('sha1').update(`blob ${body.byteLength}\0`).update(body).digest('hex');
      return observed(PROJECT_SHAPE_FIXTURE_TEXTS, (args) => {
        if (args[0] === 'cat-file' && args[2] === refused) throw new Error('fixture: body read refused');
        return inner(args);
      });
    }
  }
}

const VARIANTS: readonly Variant[] = ['unevaluated', 'rejected', 'observation-failed', 'observed', 'observed-with-secret', 'observed-with-baseline-spec', 'observed-degraded'];

beforeAll(() => {
  for (const variant of VARIANTS) {
    const model = build(variant);
    MODELS.set(variant, model);
    PAGES.set(variant, renderPolarisPage(model));
  }
});

afterAll(() => {
  for (const directory of cleanups.splice(0)) rmSync(directory, { recursive: true, force: true });
});

function page(variant: Variant): string {
  const html = PAGES.get(variant);
  if (html === undefined) throw new Error(`no page for ${variant}`);
  return html;
}

function decode(text: string): string {
  return text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
}

function plain(html: string): string {
  return decode(html.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
}

/** The `<details>` elements open at `offset` (a fragment or describedby
 * target inside one strands keyboard readers). */
function detailsDepthAt(html: string, offset: number): number {
  const before = html.slice(0, offset);
  return (before.match(/<details\b/g) ?? []).length - (before.match(/<\/details>/g) ?? []).length;
}

/** Figures as `name|state|text`, in document order. */
function figures(html: string): string[] {
  return [...html.matchAll(/<span data-figure="([^"]+)" data-figure-state="([^"]+)">([^<]*)<\/span>/g)].map((match) => `${match[1]}|${match[2]}|${decode(match[3] as string)}`);
}

function reconciliationLines(html: string): string[] {
  return [...html.matchAll(/<p class="catalog-reconciliation"[\s\S]*?<\/p>/g)].map((match) => match[0]);
}

// ---------------------------------------------------------------------------
// Slice 3: the legend.

const LEGEND_ID = 'polaris-source-legend';

// The five source rules, restated by hand (PWB-REQ-001 manifest rules).
const RULES = ['root-index', 'pillar-index', 'pillar-named-file', 'baseline-spec-tree', 'roster-tree'] as const;
// The legend words for each anchor kind and each rendered outcome. Keyed by
// the model's own unions, so a new anchor kind or outcome fails typecheck
// until the legend and this table name it.
const ANCHOR_WORDS: Readonly<Record<ProjectShapeSource['anchor']['kind'], string>> = {
  'blob': 'a blob with its object id',
  'not-a-blob': 'a tree or commit',
  'missing-at-revision': 'missing at revision',
};
const NOT_A_BLOB_TYPES: Readonly<Record<Extract<ProjectShapeSource['anchor'], { kind: 'not-a-blob' }>['type'], true>> = { tree: true, commit: true };
type RenderedOutcome = Exclude<ProjectShapeSource['record']['outcome'], 'classified'> | 'body-classified' | 'path-only';
const OUTCOMES: Readonly<Record<RenderedOutcome, true>> = { 'body-classified': true, 'path-only': true, excluded: true, unavailable: true };

interface SourceRowCells {
  readonly path: string;
  readonly rule: string;
  readonly outcome: string;
  readonly anchor: string;
  readonly digest: boolean;
  readonly routed: boolean;
}

function sourceRows(html: string): SourceRowCells[] {
  return [...html.matchAll(/<tr id="polaris-source-[^"]*"[^>]*>([\s\S]*?)<\/tr>/g)].map((row) => {
    const cells = [...(row[1] as string).matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((cell) => cell[1] as string);
    const [outcome, anchor] = plain(cells[4] as string).split(' · ');
    return {
      path: plain(/<code data-parity-field="shape-source-path">([^<]*)<\/code>/.exec(cells[1] as string)?.[1] ?? ''),
      rule: plain(cells[3] as string).split(' · ')[0] as string,
      outcome: outcome as string,
      anchor: anchor as string,
      digest: (cells[4] as string).includes('data-parity-field="shape-source-digest"'),
      routed: (cells[1] as string).includes('/polaris/source?identity='),
    };
  });
}

function legendOf(html: string): string {
  const legends = [...html.matchAll(new RegExp(`<p id="${LEGEND_ID}"[^>]*>([^<]*)</p>`, 'g'))];
  expect(legends).toHaveLength(1);
  return decode(legends[0]?.[1] as string);
}

describe('M14 slice 3: one legend sentence for the source-identity grammar', () => {
  it('renders the legend once beside the sources table, which it describes, as a scope instruction outside any disclosure', () => {
    for (const variant of ['observed', 'observed-with-secret', 'observed-with-baseline-spec', 'observed-degraded'] as const) {
      const html = page(variant);
      const tag = new RegExp(`<p id="${LEGEND_ID}"([^>]*)>`).exec(html);
      expect(tag, variant).not.toBeNull();
      expect(tag?.[1]).toContain('data-copy-role="scope-instruction"');
      expect(html.split(`id="${LEGEND_ID}"`).length - 1).toBe(1);
      expect(html.split(`aria-describedby="${LEGEND_ID}"`).length - 1).toBe(1);
      // Adjacent: the legend's closing tag is followed by the table region
      // that names it, with nothing but whitespace between.
      const start = tag?.index as number;
      const after = html.slice(html.indexOf('</p>', start) + 4);
      expect(after).toMatch(new RegExp(`^\\s*<div class="table-scroll" role="region" tabindex="0" aria-labelledby="polaris-shape-sources" data-source-index aria-describedby="${LEGEND_ID}"><table>`));
      expect(detailsDepthAt(html, start), variant).toBe(0);
      expect(legendOf(html)).toBe(copyText('legend.sources'));
    }
    // An unobserved shape renders no table, so no legend and no reference.
    for (const variant of ['unevaluated', 'rejected', 'observation-failed'] as const) {
      expect(page(variant)).not.toContain(LEGEND_ID);
    }
  });

  it('names every identity part and field, and says the digest is neither permission nor verification', () => {
    const legend = legendOf(page('observed'));
    for (const part of ['the repository', 'the evaluated revision', 'the repository-relative path', 'Rule ', 'Anchor ', 'Outcome ', 'Digest ']) {
      expect(legend, part).toContain(part);
    }
    expect(legend).toContain('neither permission to read those bytes nor a verification of them');
    expect(legend).toContain('shown only where it read one');
  });

  it('names the identity suffix for each of the three anchor kinds sourceIdentityOf writes (syzygy-ccqk)', () => {
    const legend = legendOf(page('observed'));
    expect(legend).toContain(
      'its identity joins the repository, the evaluated revision, the repository-relative path and what the path held: the Git object id for a blob, not-a-blob for a tree or commit, or missing;',
    );
    // The suffix each anchor kind actually produces, against the legend's
    // word for it; expected suffixes are hand-typed literals.
    const base = { path: 'p/q.md', rule: 'root-index' as const, extractionClasses: [] };
    const objectId = 'a'.repeat(40);
    const cases = [
      { anchor: { kind: 'blob' as const, mode: '100644', objectId }, suffix: `#${objectId}`, word: 'the Git object id for a blob' },
      { anchor: { kind: 'not-a-blob' as const, mode: '040000', type: 'tree' as const }, suffix: '#not-a-blob', word: 'not-a-blob for a tree or commit' },
      { anchor: { kind: 'missing-at-revision' as const }, suffix: '#missing', word: 'or missing;' },
    ];
    for (const { anchor, suffix, word } of cases) {
      expect(sourceIdentityOf('repository:x', 'b'.repeat(40), { ...base, anchor })).toBe(`repository:x@${'b'.repeat(40)}:p/q.md${suffix}`);
      expect(legend, anchor.kind).toContain(word);
    }
  });

  it('holds the legend to the five rules, the anchor union and the outcomes the table renders (drift)', () => {
    expect([...SOURCE_RULES]).toEqual([...RULES]);
    const legend = legendOf(page('observed'));
    const named = (term: string): boolean => new RegExp(`(^|[\\s(,;])${term.replace(/[-]/g, '\\-')}([\\s),;]|$)`).test(legend);
    for (const rule of SOURCE_RULES) expect(named(rule), `rule ${rule}`).toBe(true);
    for (const words of Object.values(ANCHOR_WORDS)) expect(legend, words).toContain(words);
    for (const type of Object.keys(NOT_A_BLOB_TYPES)) expect(named(type), `anchor type ${type}`).toBe(true);
    for (const outcome of Object.keys(OUTCOMES)) expect(named(outcome), `outcome ${outcome}`).toBe(true);
    // Every rule, outcome and anchor kind a rendered row carries is named.
    const rows = (['observed', 'observed-with-secret', 'observed-with-baseline-spec', 'observed-degraded'] as const).flatMap((variant) => sourceRows(page(variant)));
    expect(rows.length).toBe(15 + 14 + 16 + 15);
    for (const row of rows) {
      expect(named(row.rule), row.rule).toBe(true);
      expect(Object.keys(OUTCOMES), row.outcome).toContain(row.outcome);
      expect(row.anchor.startsWith('blob ') || row.anchor.startsWith('tree ') || row.anchor.startsWith('commit ') || row.anchor === 'missing at revision', row.anchor).toBe(true);
    }
    // The fixtures reach every rendered outcome.
    expect([...new Set(rows.map((row) => row.outcome))].sort()).toEqual(['body-classified', 'excluded', 'path-only', 'unavailable']);
  });

  it('shows a digest only where a body was read, and leaves the withheld sources unread and unlinked', () => {
    const rows = (['observed', 'observed-with-secret', 'observed-with-baseline-spec', 'observed-degraded'] as const).flatMap((variant) => sourceRows(page(variant)));
    for (const row of rows) {
      expect(row.digest, `${row.path} ${row.outcome}`).toBe(row.outcome === 'body-classified' || row.outcome === 'excluded');
    }
    const secret = sourceRows(page('observed-with-secret'));
    const withheld = secret.filter((row) => row.outcome === 'excluded');
    expect(withheld.map((row) => row.path)).toEqual(['about/craft-and-care/README.md']);
    for (const row of withheld) expect(row.routed, row.path).toBe(false);
    // The legend itself carries no link and no route.
    expect(legendOf(page('observed-with-secret'))).not.toMatch(/https?:|\/polaris\/source/);
    expect(new RegExp(`<p id="${LEGEND_ID}"[^>]*>[^<]*</p>`).test(page('observed-with-secret'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Slice 4: the catalog reconciliation.

const MARKER = /\sdata-polaris-item="/g;

describe('M14 slice 4: the catalog reconciliation line', () => {
  it('labels the machine counts Observed and gives the hard-coded fixture values', () => {
    const html = page('observed');
    const lines = reconciliationLines(html);
    expect(lines).toHaveLength(1);
    expect(figures(lines[0] as string).filter((entry) => entry.includes('|Observed|'))).toEqual([
      'sources|Observed|15',
      'items|Observed|20',
      'class:project-account-section|Observed|6',
      'class:principle|Observed|2',
      'class:success-criterion|Observed|3',
      'class:catalog-entry|Observed|3',
      'class:design-contract|Observed|1',
      'class:baseline-spec|Observed|1',
      'class:topology-component|Observed|1',
      'class:craft-policy|Observed|1',
      'class:roster-identity|Observed|2',
    ]);
  });

  it('labels both class sums Inferred, each the arithmetic of the Observed counts', () => {
    const all = figures(reconciliationLines(page('observed'))[0] as string);
    expect(all.filter((entry) => entry.includes('|Inferred|') && entry.startsWith('sum:'))).toEqual(['sum:nine-classes|Inferred|20', 'sum:eight-classes|Inferred|14']);
    // Independently: 6+2+3+3+1+1+1+1+2 and the same less the account's 6.
    const counts = all.filter((entry) => entry.startsWith('class:')).map((entry) => Number(entry.split('|')[2]));
    expect(counts.reduce((sum, value) => sum + value, 0)).toBe(20);
    expect(counts.slice(1).reduce((sum, value) => sum + value, 0)).toBe(14);
    expect(all.filter((entry) => entry.startsWith('sum:') && !entry.includes('|Inferred|'))).toEqual([]);
  });

  it('counts item markers by occurrence in the final HTML, states the predicate, and labels the remainder Unknown with its reason and claim-identity route', () => {
    const html = page('observed');
    const line = reconciliationLines(html)[0] as string;
    const occurrences = [...html.matchAll(MARKER)].length;
    expect(occurrences).toBe(14);
    expect(figures(line).filter((entry) => entry.startsWith('markers') || entry.startsWith('remainder'))).toEqual(['markers|Inferred|14', 'remainder|Unknown|−6']);
    const text = plain(line);
    expect(text).toContain('Inferred from this page’s own markup: 14 item markers, counted as every occurrence of the data-polaris-item attribute in the final HTML, so an item rendered twice counts twice.');
    expect(text).toContain('Unknown from these counts alone: markers minus machine items is −6 — mapping-coverage-absent. Route: Run or declare the mapping: match each marker’s claim identity to exactly one machine item.');
    // The line adds no marker and leaves no placeholder behind.
    expect([...line.matchAll(MARKER)]).toHaveLength(0);
    expect(html).not.toContain('<!--polaris-catalog-reconciliation');
  });

  it('reproduces the funnel capture: 417 markers over 415 items, 409 outside the account, an Unknown remainder of 2', () => {
    const CLASS_COUNTS: Readonly<Record<string, number>> = {
      'project-account-section': 6, principle: 7, 'success-criterion': 13, 'catalog-entry': 65, 'design-contract': 32,
      'baseline-spec': 192, 'topology-component': 87, 'craft-policy': 7, 'roster-identity': 6,
    };
    const shape = {
      kind: 'observed',
      sources: Array.from({ length: 278 }, (_, index) => ({ path: `s${index}` })),
      items: Object.entries(CLASS_COUNTS).flatMap(([cls, count]) => Array.from({ length: count }, (_, index) => ({ class: cls, claim: { claimId: `${cls}:${index}` } }))),
    } as unknown as ProjectShape;
    const markers = Array.from({ length: 417 }, (_, index) => `<li data-polaris-item="m${index % 415}"></li>`).join('');
    const out = substituteCatalogReconciliation(`<main>${RECONCILIATION_PLACEHOLDER}${markers}</main>`, (count) => renderCatalogReconciliation(catalogReconciliation(shape, count, () => { throw new Error('observed'); })));
    const values = new Map(figures(out).map((entry) => [entry.split('|')[0], entry.split('|').slice(1).join('|')]));
    expect(values.get('sources')).toBe('Observed|278');
    expect(values.get('items')).toBe('Observed|415');
    expect(values.get('sum:nine-classes')).toBe('Inferred|415');
    expect(values.get('sum:eight-classes')).toBe('Inferred|409');
    expect(values.get('markers')).toBe('Inferred|417');
    expect(values.get('remainder')).toBe('Unknown|2');
  });

  it('a duplicated marker placement moves only the marker count and the remainder', () => {
    const shape = MODELS.get('observed')?.projectShape as ProjectShape;
    const render = (html: string): string[] => figures(substituteCatalogReconciliation(html, (count) => renderCatalogReconciliation(catalogReconciliation(shape, count, () => { throw new Error('observed'); }))));
    const base = `<main>${RECONCILIATION_PLACEHOLDER}<li data-polaris-item="a"></li><li data-polaris-item="b"></li></main>`;
    const duplicated = base.replace('</main>', '<li data-polaris-item="a"></li></main>');
    const before = render(base);
    const after = render(duplicated);
    const changed = before.map((entry, index) => [entry, after[index]] as const).filter(([left, right]) => left !== right);
    expect(changed).toEqual([['markers|Inferred|2', 'markers|Inferred|3'], ['remainder|Unknown|−18', 'remainder|Unknown|−17']]);
  });

  it('renders an unobserved shape as Unknown with its reason and route, and never a number', () => {
    const expected: Readonly<Record<'unevaluated' | 'rejected' | 'observation-failed', string>> = {
      unevaluated: 'Catalog reconciliation. Unknown — unconsented-source-or-provider. Route: Record consent. No project shape was observed, so no source, item or item marker is counted.',
      rejected: 'Catalog reconciliation. Unknown — unconsented-source-or-provider. Route: Record consent. No project shape was observed, so no source, item or item marker is counted.',
      'observation-failed': 'Catalog reconciliation. Unknown — source-uncaptured-or-unreachable. Route: Repair the observer/source; new snapshot. No project shape was observed, so no source, item or item marker is counted.',
    };
    for (const [variant, text] of Object.entries(expected) as [keyof typeof expected, string][]) {
      const lines = reconciliationLines(page(variant));
      expect(lines, variant).toHaveLength(1);
      expect(lines[0]).toContain('data-polaris-reconciliation="unobserved"');
      expect(figures(lines[0] as string)).toEqual(['reconciliation|Unknown|Unknown']);
      expect(plain(lines[0] as string)).toBe(text);
      expect(plain(lines[0] as string)).not.toMatch(/\d/);
    }
  });

  it('aborts on a missing, repeated or truncated placeholder, and on a line that would add a marker', () => {
    const ok = (count: number): string => `<p>${count}</p>`;
    expect(() => substituteCatalogReconciliation('<main></main>', ok)).toThrow(/exactly once/);
    expect(() => substituteCatalogReconciliation(`${RECONCILIATION_PLACEHOLDER}${RECONCILIATION_PLACEHOLDER}`, ok)).toThrow(/exactly once/);
    expect(() => substituteCatalogReconciliation(`${RECONCILIATION_PLACEHOLDER}<!--polaris-catalog-reconciliation`, ok)).toThrow(/exactly once/);
    expect(() => substituteCatalogReconciliation(`<!--polaris-catalog-reconciliation->`, ok)).toThrow(/exactly once/);
    expect(() => substituteCatalogReconciliation(RECONCILIATION_PLACEHOLDER, () => '<li data-polaris-item="x"></li>')).toThrow(/no item marker/);
    expect(substituteCatalogReconciliation(`a${RECONCILIATION_PLACEHOLDER}b`, ok)).toBe('a<p>0</p>b');
  });

  it('places the line once, at the head of the catalog group and outside any class section or disclosure, with each state readable as text and the render deterministic', () => {
    for (const variant of VARIANTS) {
      const html = page(variant);
      const lines = reconciliationLines(html);
      expect(lines, variant).toHaveLength(1);
      const start = html.indexOf(lines[0] as string);
      const group = html.indexOf('<header class="group" data-polaris-group="catalog">');
      const next = html.indexOf('<header class="group" data-polaris-group="capability-detail">');
      expect(start).toBeGreaterThan(group);
      expect(start).toBeLessThan(next);
      expect(html.slice(group, start)).not.toContain('data-polaris-class=');
      expect(detailsDepthAt(html, start), variant).toBe(0);
    }
    // Styles off, the state words precede the figures they qualify.
    const text = plain(reconciliationLines(page('observed'))[0] as string);
    const order = ['Observed in the machine answer: 15 sources', 'Inferred by arithmetic over those counts: the nine classes sum to 20', 'Inferred from this page’s own markup: 14 item markers', 'Unknown from these counts alone: markers minus machine items is −6'];
    const positions = order.map((fragment) => text.indexOf(fragment));
    expect(positions.every((position) => position >= 0), JSON.stringify(positions)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(renderPolarisPage(MODELS.get('observed') as PocModel)).toBe(page('observed'));
  });
});
