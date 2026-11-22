import { describe, expect, it } from 'vitest';
import type { LocalDerivedFact, LocalDerivedStructure, LocalRenderInput } from '@syzygy/polaris-generation-core/live';
import { readingInput } from './dossier-reading.testkit.js';
import { renderDerivedRegion, renderLocalDossier } from './dossier-site.js';

// syzygy-3efd.27: the derived-structure region of the landing page (REQ-polaris-generation-034 version 2.3). Inputs are built here;
// every expected string is a literal written from the requirement's words.

const REV = 'c'.repeat(40);
const SHA = 'd'.repeat(64);
const AT = '2026-11-21T09:30:00.000Z';
type Marking = Pick<LocalDerivedFact, 'epistemic' | 'unknownReason'>;
const OBSERVED: Marking = { epistemic: 'observed', unknownReason: null };
const NO_BOUND: Marking = { epistemic: 'unknown', unknownReason: 'no-currency-bound-declared' };

/** A derived structure over `units` ([path, files]), each fact marked by `mark(id)`. */
function structure(rootFiles: number, units: readonly (readonly [string, number])[], mark: (id: string) => Marking = () => OBSERVED, unitsNotListed = 0): LocalDerivedStructure {
  const base = { rule: 'top-level-unit', ruleVersion: 1 };
  const facts: LocalDerivedFact[] = [
    { id: '_tree-root', fact: 'tree-root', ...base, path: '.', count: rootFiles, to: null, ...mark('_tree-root') },
    ...units.map(([unit, files], i) => ({ id: `_tree-unit-${i + 1}`, fact: 'top-level-unit' as const, ...base, path: unit, count: files, to: null, ...mark(`_tree-unit-${i + 1}`) })),
    ...units.map(([unit], i) => ({ id: `_tree-contains-${i + 1}`, fact: 'contains' as const, ...base, path: unit, count: null, to: `_tree-unit-${i + 1}`, ...mark(`_tree-contains-${i + 1}`) })),
  ];
  const unitFiles = units.reduce((n, [, files]) => n + files, 0);
  const tree = { files: rootFiles + unitFiles, rootFiles, unitsListed: units.length, unitFiles, unitsNotListed, secretPathsLeftOut: 0, submodules: 0 };
  return { state: 'derived', revision: REV, recordRevision: REV, capturedAt: AT, recordText: '{}\n', sha256: SHA, currencyPolicy: null, facts, unitsNotListed, tree, countsMatch: true };
}

/** Every drawn group: its kind, its marking and the fact it draws. */
const drawn = (html: string): string[] => [...html.matchAll(/<g class="(node|edge|edge-text) (observed|inferred|unknown)(?: back)?" data-derived-id="([^"]+)">/gu)].map((m) => `${m[1]} ${m[2]} ${m[3]}`);
const legendOf = (html: string): string => html.match(/<ul class="diagram-legend"[^]*?<\/p>/u)?.[0] ?? '';

describe('the derived-structure region', () => {
  it('draws the root, each directory and each containment solid, each with its fact identity, in the stated order', () => {
    const html = renderDerivedRegion(structure(2, [['docs', 2], ['src', 3]]));
    expect(html.startsWith('<section id="derived-structure" data-reading-level="1" data-topics=""><h2>Derived by Syzygy: top-level directories</h2>'
      + `<figure class="derived-figure" data-visual-provenance="computed" data-derived-record="sha256:${SHA}"><figcaption id="diagram-title-derived">Derived by Syzygy from the pinned tree</figcaption>`
      + `<p class="derived-note">Derived by Syzygy from the paths and modes of the tree at revision ${REV}, listed at ${AT}, by rule top-level-unit version 1. No file body, size or object id was read. Current for that revision only.</p>`
      + '<div class="diagram-scroll"><svg ')).toBe(true);
    // Most files first: src before docs.
    expect(drawn(html).filter((g) => !g.startsWith('edge-text'))).toEqual([
      'edge observed _tree-contains-1', 'edge observed _tree-contains-2', 'node observed _tree-root', 'node observed _tree-unit-2', 'node observed _tree-unit-1',
    ]);
    expect(html).toContain('<title>Repository root (observed)</title>');
    expect(html).toContain('<title>src/ (3 files) (observed)</title>');
    expect(legendOf(html)).toBe('<ul class="diagram-legend" aria-label="Line styles"><li><span class="legend-line observed" aria-hidden="true"></span>Solid: observed</li></ul><p class="diagram-tally">3 boxes and 2 arrows, derived by Syzygy: 5 observed, 0 inferred, 0 unknown.</p>');
    expect(html).toContain(`<details><summary>Read every derived fact</summary><ul class="derived-facts" id="diagram-text-derived"><li data-derived-id="_tree-root" data-derived-fact="tree-root" data-epistemic="observed" data-derived-rule="top-level-unit" data-derived-rule-version="1" data-derived-path="." data-derived-record="sha256:${SHA}" data-derived-revision="${REV}">Repository root: 2 files at the root. <span class="derived-mark">Derived by Syzygy</span><span class="visually-hidden ev"> Evidence: label Observed; derived by Syzygy by rule top-level-unit version 1; source path .; record sha256:${SHA}; current for revision ${REV}.</span></li>`);
    expect(html).toContain(`<li data-derived-id="_tree-unit-2" data-derived-fact="top-level-unit" data-epistemic="observed" data-derived-rule="top-level-unit" data-derived-rule-version="1" data-derived-path="src" data-derived-record="sha256:${SHA}" data-derived-revision="${REV}">src/: 3 files. <span class="derived-mark">Derived by Syzygy</span>`);
    expect(html).toContain(`<li data-derived-id="_tree-contains-1" data-derived-fact="contains" data-epistemic="observed" data-derived-rule="top-level-unit" data-derived-rule-version="1" data-derived-path="docs" data-derived-record="sha256:${SHA}" data-derived-revision="${REV}">Repository root contains docs/. <span class="derived-mark">Derived by Syzygy</span><span class="visually-hidden ev"> Evidence: label Observed; derived by Syzygy by rule top-level-unit version 1; source path docs; record sha256:${SHA}; current for revision ${REV}.</span></li>`);
    expect(html.match(/<li data-derived-id=/gu)).toHaveLength(5);
    const order = ['<figcaption id="diagram-title-derived">', 'class="derived-note"', '<svg ', 'class="diagram-legend"', 'class="diagram-tally"', 'Read every derived fact'].map((s) => html.indexOf(s));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(html.endsWith('</ul></details></figure></section>')).toBe(true);
    expect(html).not.toContain('data-hue');
    expect(html).not.toContain('more top-level');
    // One record gives the same bytes.
    expect(renderDerivedRegion(structure(2, [['docs', 2], ['src', 3]]))).toBe(html);
  });

  it('draws an Unknown fact dotted with its label ending "?", legends only Dotted and counts 0 observed', () => {
    const html = renderDerivedRegion(structure(2, [['docs', 2], ['src', 3]], () => NO_BOUND));
    expect(drawn(html).filter((g) => !g.startsWith('edge-text')).every((g) => g.split(' ')[1] === 'unknown')).toBe(true);
    expect(html).not.toMatch(/class="(?:node|edge|edge-text|legend-line) observed|data-epistemic="observed"|Solid/u);
    expect(html).toMatch(/>Repository root \?<\/tspan>/u);
    expect(legendOf(html)).toBe('<ul class="diagram-legend" aria-label="Line styles"><li><span class="legend-line unknown" aria-hidden="true"></span>Dotted: unknown (label ends \u201c?\u201d)</li></ul><p class="diagram-tally">3 boxes and 2 arrows, derived by Syzygy: 0 observed, 0 inferred, 5 unknown.</p>');
    expect(html).toContain(`<li data-derived-id="_tree-unit-1" data-derived-fact="top-level-unit" data-epistemic="unknown" data-unknown-reason="no-currency-bound-declared" data-derived-rule="top-level-unit" data-derived-rule-version="1" data-derived-path="docs" data-derived-record="sha256:${SHA}" data-derived-revision="${REV}">docs/: 2 files. <span class="derived-mark">Derived by Syzygy</span><span class="visually-hidden ev"> Evidence: label Unknown; reason no-currency-bound-declared; derived by Syzygy by rule top-level-unit version 1; source path docs; record sha256:${SHA}.</span></li>`);
  });

  it('legends and tallies exactly what it draws when markings are mixed', () => {
    const stale: Marking = { epistemic: 'unknown', unknownReason: 'stale-beyond-currency-bound' };
    const html = renderDerivedRegion(structure(0, [['a', 1], ['b', 4], ['c', 2]], (id) => (id === '_tree-unit-1' || id === '_tree-contains-3' ? stale : OBSERVED)));
    const groups = drawn(html).filter((g) => !g.startsWith('edge-text'));
    const boxes = groups.filter((g) => g.startsWith('node')).length, arrows = groups.filter((g) => g.startsWith('edge')).length;
    const observed = groups.filter((g) => g.split(' ')[1] === 'observed').length, unknown = groups.filter((g) => g.split(' ')[1] === 'unknown').length;
    expect([boxes, arrows, observed, unknown]).toEqual([4, 3, 5, 2]);
    expect(legendOf(html)).toBe('<ul class="diagram-legend" aria-label="Line styles"><li><span class="legend-line observed" aria-hidden="true"></span>Solid: observed</li><li><span class="legend-line unknown" aria-hidden="true"></span>Dotted: unknown (label ends \u201c?\u201d)</li></ul><p class="diagram-tally">4 boxes and 3 arrows, derived by Syzygy: 5 observed, 0 inferred, 2 unknown.</p>');
    expect(html).toContain('data-epistemic="unknown" data-unknown-reason="stale-beyond-currency-bound"');
  });

  it('writes a count of one in the singular', () => {
    const html = renderDerivedRegion(structure(1, [['a', 1]]));
    expect(html).toContain('<p class="diagram-tally">2 boxes and 1 arrow, derived by Syzygy: 3 observed, 0 inferred, 0 unknown.</p>');
    expect(html).toContain('>Repository root: 1 file at the root. <span');
    expect(html).toContain('>a/: 1 file. <span');
    expect(html).toContain('<title>a/ (1 file) (observed)</title>');
    expect(renderDerivedRegion(structure(1, [], () => OBSERVED, 1))).toContain('<p class="derived-more">1 more top-level directory is counted and not listed.</p>');
    expect(renderDerivedRegion(structure(1, [], () => OBSERVED, 1))).toContain('<p class="diagram-tally">1 box and 0 arrows, derived by Syzygy: 1 observed, 0 inferred, 0 unknown.</p>');
  });

  it('draws the twelve directories with the most files, ties by path, and says how many more are listed and counted', () => {
    // Fourteen directories; `m` and `n` tie at 5 files with `l`, and the two with the fewest are left undrawn.
    const units: [string, number][] = [['a', 1], ['b', 9], ['c', 2], ['d', 8], ['e', 7], ['f', 6], ['g', 6], ['h', 3], ['i', 4], ['j', 10], ['k', 11], ['l', 5], ['m', 5], ['n', 5]];
    const html = renderDerivedRegion(structure(0, units, () => OBSERVED, 3));
    const nodes = drawn(html).filter((g) => g.startsWith('node')).map((g) => g.split(' ')[2]);
    // By files: k 11, j 10, b 9, d 8, e 7, f 6, g 6, l 5, m 5, n 5, i 4, h 3; then c 2 and a 1 not drawn.
    expect(nodes).toEqual(['_tree-root', '_tree-unit-11', '_tree-unit-10', '_tree-unit-2', '_tree-unit-4', '_tree-unit-5', '_tree-unit-6', '_tree-unit-7', '_tree-unit-12', '_tree-unit-13', '_tree-unit-14', '_tree-unit-9', '_tree-unit-8']);
    expect(drawn(html).filter((g) => g.startsWith('edge ')).map((g) => g.split(' ')[2]).sort()).toEqual(['2', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14'].map((k) => `_tree-contains-${k}`).sort());
    expect(html).toContain('<p class="derived-more">2 more top-level directories are listed below and not drawn.</p><p class="derived-more">3 more top-level directories are counted and not listed.</p>');
    expect(html).toContain('<p class="diagram-tally">13 boxes and 12 arrows, derived by Syzygy: 25 observed, 0 inferred, 0 unknown.</p>');
    expect(html.match(/<li data-derived-id="_tree-unit-/gu)).toHaveLength(14);
    expect(html.match(/<li data-derived-id="_tree-contains-/gu)).toHaveLength(14);
    expect(renderDerivedRegion(structure(0, units.slice(0, 13)))).toContain('<p class="derived-more">1 more top-level directory is listed below and not drawn.</p>');
    expect(renderDerivedRegion(structure(0, units.slice(0, 12)))).not.toContain('class="derived-more"');
  });

  it('escapes every path as text', () => {
    const html = renderDerivedRegion(structure(0, [['<b>&"x', 1]]));
    expect(html).not.toContain('<b>');
    expect(html).toContain('data-derived-path="&lt;b&gt;&amp;&quot;x"');
    expect(html).toContain('>&lt;b&gt;&amp;&quot;x/: 1 file. <span');
  });

  it('holds only its heading and the Unknown sentence where no record is in force', () => {
    expect(renderDerivedRegion({ state: 'missing', revision: REV, unknownReason: 'missing-evidence' })).toBe('<section id="derived-structure" data-reading-level="1" data-topics=""><h2>Derived by Syzygy: top-level directories</h2>'
      + `<p class="derived-unknown" data-epistemic="unknown" data-unknown-reason="missing-evidence"><span class="not-established">Not established.</span> The top-level directories of the tree at revision ${REV} are Unknown at this render: no derived record was kept when this draft revision was checked.</p></section>`);
    expect(renderDerivedRegion({ state: 'unknown', revision: REV, unknownReason: 'source-uncaptured-or-unreachable' })).toBe('<section id="derived-structure" data-reading-level="1" data-topics=""><h2>Derived by Syzygy: top-level directories</h2>'
      + `<p class="derived-unknown" data-epistemic="unknown" data-unknown-reason="source-uncaptured-or-unreachable"><span class="not-established">Not established.</span> The top-level directories of the tree at revision ${REV} are Unknown at this render: the pinned tree could not be listed.</p></section>`);
  });
});

describe('the derived structure on an operator-agent site', () => {
  const withDerived = (derived: LocalDerivedStructure, edit: (local: LocalRenderInput) => LocalRenderInput = (local) => local) => {
    const input = readingInput();
    return renderLocalDossier({ ...input, local: edit({ ...input.local, derivedStructure: derived }) }).files;
  };
  const RECORD = '{\n  "format": "polaris-dossier-derived-structure/1"\n}\n';
  const derived = (): LocalDerivedStructure => ({ ...structure(1, [['src', 2]]), recordText: RECORD, currencyPolicy: { policyId: 'P', policyVersion: '1.0.0', sha256: 'e'.repeat(64) } } as LocalDerivedStructure);

  it('ends the landing page\'s main content with the region, publishes the record unchanged and names it in the machine view', () => {
    const files = withDerived(derived());
    const index = files.get('index.html')!;
    const at = index.indexOf('<section id="derived-structure"');
    expect(at).toBeGreaterThan(index.indexOf('<section id="section-'));
    // Only the review-status region follows it inside main.
    const after = index.slice(index.indexOf('</figure></section>', at) + '</figure></section>'.length);
    expect(after.startsWith('<aside class="review-status"')).toBe(true);
    expect(after.indexOf('</main>')).toBe(after.indexOf('</aside>') + '</aside>'.length);
    for (const [file, html] of files) if (file !== 'index.html' && file.endsWith('.html')) expect(html, file).not.toContain('derived-structure');
    expect(files.get('derived-structure.json')).toBe(RECORD);
    const machine = JSON.parse(files.get('machine.json')!) as Record<string, unknown>;
    const keys = Object.keys(machine);
    expect(keys[keys.indexOf('reviewStatus') + 1]).toBe('derivedStructure');
    expect(machine['derivedStructure']).toEqual({
      file: 'derived-structure.json', sha256: SHA, revision: REV, state: 'derived', currencyPolicy: { policyId: 'P', policyVersion: '1.0.0', sha256: 'e'.repeat(64) },
      facts: [
        { id: '_tree-root', fact: 'tree-root', epistemic: 'observed', unknownReason: null, rule: 'top-level-unit', ruleVersion: 1, path: '.' },
        { id: '_tree-unit-1', fact: 'top-level-unit', epistemic: 'observed', unknownReason: null, rule: 'top-level-unit', ruleVersion: 1, path: 'src' },
        { id: '_tree-contains-1', fact: 'contains', epistemic: 'observed', unknownReason: null, rule: 'top-level-unit', ruleVersion: 1, path: 'src' },
      ],
    });
    // The derived facts are no claim of the draft: they enter neither the claims nor the counts.
    expect(JSON.stringify(machine['claims'])).not.toContain('_tree-');
  });

  it('marks every draft figure curated and only the derived figure computed, and draws no draft element solid', () => {
    const files = withDerived(derived());
    const figures = [...files].flatMap(([file, html]) => (file.endsWith('.html') ? [...html.matchAll(/<figure\b[^>]*>/gu)].map((m) => `${file} ${m[0]}`) : []));
    expect(figures.length).toBeGreaterThan(1);
    for (const figure of figures) expect(figure).toMatch(/ data-visual-provenance="(?:curated|computed)"/u);
    expect(figures.filter((figure) => figure.includes('"computed"'))).toEqual([`index.html <figure class="derived-figure" data-visual-provenance="computed" data-derived-record="sha256:${SHA}">`]);
    for (const [file, html] of files) {
      if (!file.endsWith('.html')) continue;
      const draftOnly = html.replace(/<section id="derived-structure"[^]*?<\/section>/u, '');
      expect(draftOnly, file).not.toMatch(/class="(?:node|edge|edge-text) observed/u);
      expect(draftOnly, file).not.toContain('Solid: observed');
    }
  });

  it('places the region after the header where the draft layer is withheld, and states missing or unknown in the machine view with no record', () => {
    const missing = withDerived({ state: 'missing', revision: REV, unknownReason: 'missing-evidence' },
      (local) => ({ ...local, draftLayer: { state: 'unknown', reason: 'unconsented-source-or-provider', why: ['fixture reason'] } }));
    const index = missing.get('index.html')!;
    expect(index).toContain('</header><section id="derived-structure" data-reading-level="1" data-topics=""><h2>Derived by Syzygy: top-level directories</h2><p class="derived-unknown"');
    expect(missing.has('derived-structure.json')).toBe(false);
    expect(index).not.toContain('<figure class="derived-figure"');
    expect(JSON.parse(missing.get('machine.json')!).derivedStructure).toEqual({ file: null, sha256: null, revision: REV, state: 'missing', currencyPolicy: null, facts: [] });
    const unknown = withDerived({ state: 'unknown', revision: REV, unknownReason: 'source-uncaptured-or-unreachable' });
    expect(JSON.parse(unknown.get('machine.json')!).derivedStructure).toEqual({ file: null, sha256: null, revision: REV, state: 'unknown', currencyPolicy: null, facts: [] });
    expect(unknown.has('derived-structure.json')).toBe(false);
  });

  it('refuses a page of the draft that would take the record\'s name', () => {
    const input = readingInput();
    const page = { path: 'derived-structure.json', title: 'Taken', intro: 'x', groups: [] };
    expect(() => renderLocalDossier({ ...input, local: { ...input.local, pages: [...input.local.pages, page], derivedStructure: derived() } })).toThrow('page-path-collision');
  });
});
