import { describe, expect, it } from 'vitest';
import type { LocalDerivedFact, LocalDerivedStructure, LocalManifestFact, LocalManifestFacts, LocalManifestFileEntry, LocalManifestRecognizerEntry } from '@syzygy/polaris-generation-core/live';
import { readingInput } from './dossier-reading.testkit.js';
import { renderDossierSite, renderLocalDossier } from './dossier-site.js';

// syzygy-3efd.36: the computed map pages (REQ-polaris-generation-034 version 2.9). Inputs are built here from a fixture tree and fixture
// manifest files; every expected string, count, caption, identity and mark is a literal written from the requirement's words.

const REV = 'c'.repeat(40);
const SHA = 'd'.repeat(64);
const AT = '2026-11-22T09:30:00.000Z';
const OBSERVED = { epistemic: 'observed', unknownReason: null } as const;

/** A derived structure over `units` ([path, files]); the tree's counts are given separately, as the render re-derives them. */
function structure(rootFiles: number, units: readonly (readonly [string, number])[], tree: { secret?: number; submodules?: number; notListed?: readonly number[] } = {}, countsMatch = true,
  mark: Pick<LocalDerivedFact, 'epistemic' | 'unknownReason'> = OBSERVED): LocalDerivedStructure {
  const base = { rule: 'top-level-unit', ruleVersion: 1 };
  const facts: LocalDerivedFact[] = [
    { id: '_tree-root', fact: 'tree-root', ...base, path: '.', count: rootFiles, to: null, ...mark },
    ...units.map(([unit, files], i) => ({ id: `_tree-unit-${i + 1}`, fact: 'top-level-unit' as const, ...base, path: unit, count: files, to: null, ...mark })),
    ...units.map(([unit], i) => ({ id: `_tree-contains-${i + 1}`, fact: 'contains' as const, ...base, path: unit, count: null, to: `_tree-unit-${i + 1}`, ...mark })),
  ];
  const unitFiles = units.reduce((n, [, files]) => n + files, 0);
  const notListed = tree.notListed ?? [];
  const secret = tree.secret ?? 0;
  return {
    state: 'derived', revision: REV, recordRevision: REV, capturedAt: AT, recordText: '{}\n', sha256: SHA, currencyPolicy: null, facts, unitsNotListed: notListed.length,
    tree: { files: rootFiles + unitFiles + notListed.reduce((n, f) => n + f, 0) + secret, rootFiles, unitsListed: units.length, unitFiles, unitsNotListed: notListed.length, secretPathsLeftOut: secret, submodules: tree.submodules ?? 0 },
    countsMatch,
  };
}

const recognizer = (rule: string, counts: Partial<LocalManifestRecognizerEntry> = {}): LocalManifestRecognizerEntry => ({
  rule, ruleVersion: 1, label: 'inferred', candidates: 0, secretPathsLeftOut: 0, setApart: 0, inferred: 0, unknown: 0, valuesLeftOut: 0, facts: 0, files: [], filesNotListed: 0, ...counts,
});
const file = (path: string, facts: number): LocalManifestFileEntry => ({ path, epistemic: 'inferred', unknownReason: null, parseFault: null, facts, valuesLeftOut: 0 });
const unknownFile = (path: string, reason: string, parseFault: string | null = null): LocalManifestFileEntry => ({ path, epistemic: 'unknown', unknownReason: reason, parseFault, facts: null, valuesLeftOut: null });
const fact = (k: number, kind: string, rule: string, path: string, line: number, members: Record<string, string | null>): LocalManifestFact => ({
  id: `_manifest-${k}`, fact: kind, rule, ruleVersion: 1, path, lines: [line, line], ...members, epistemic: 'inferred',
});
const POLICY = { policyId: 'POLARIS-DOSSIER-SCREENING-POLICY', policyVersion: '2.0.0', sha256: 'a'.repeat(64) };
const NPM = 'npm-package-manifest', WF = 'github-actions-workflow';

/** The workspace and the workflow of the requirement's scenarios. */
function workspaceMember(): LocalManifestFacts {
  const facts: LocalManifestFact[] = [
    fact(1, 'workflow', WF, '.github/workflows/ci.yml', 1, { name: 'CI' }),
    fact(2, 'workflow-trigger', WF, '.github/workflows/ci.yml', 2, { event: 'push' }),
    fact(3, 'workflow-trigger', WF, '.github/workflows/ci.yml', 3, { event: 'pull_request' }),
    fact(4, 'job', WF, '.github/workflows/ci.yml', 5, { job: 'build' }),
    fact(5, 'job', WF, '.github/workflows/ci.yml', 7, { job: 'test' }),
    fact(6, 'job-needs', WF, '.github/workflows/ci.yml', 8, { from: 'test', to: 'build' }),
    fact(7, 'job', WF, '.github/workflows/ci.yml', 10, { job: 'deploy' }),
    fact(8, 'job-needs', WF, '.github/workflows/ci.yml', 11, { from: 'deploy', to: 'test' }),
    fact(9, 'job-needs', WF, '.github/workflows/ci.yml', 11, { from: 'deploy', to: 'release' }),
    fact(10, 'package', NPM, 'package.json', 2, { name: 'root' }),
    fact(11, 'workspace-member', NPM, 'package.json', 3, { pattern: 'packages/*' }),
    fact(12, 'workspace-member', NPM, 'package.json', 3, { pattern: 'tools/*' }),
    fact(13, 'package', NPM, 'packages/a/package.json', 2, { name: 'a' }),
    fact(14, 'dependency', NPM, 'packages/a/package.json', 4, { name: 'b', section: 'dependencies', group: null }),
    fact(15, 'package', NPM, 'packages/b/package.json', 2, { name: 'b' }),
  ];
  return {
    format: 'polaris-dossier-manifest-facts/1', state: 'derived', screeningPolicy: POLICY, facts, factsNotListed: 0,
    recognizers: [
      recognizer(NPM, { candidates: 4, inferred: 3, unknown: 1, facts: 6, files: [file('package.json', 3), file('packages/a/package.json', 2), file('packages/b/package.json', 1), unknownFile('vendor-free/package.json', 'unparsed', 'syntax')] }),
      recognizer('cargo-manifest'), recognizer('python-project-manifest'), recognizer('go-module-manifest'),
      recognizer(WF, { candidates: 2, inferred: 1, unknown: 1, secretPathsLeftOut: 0, facts: 9, files: [file('.github/workflows/ci.yml', 9), unknownFile('.github/workflows/deploy.yml', 'class-not-consented')] }),
    ],
  };
}

const site = (derived: LocalDerivedStructure, manifestFacts: LocalManifestFacts | undefined) => {
  const input = readingInput();
  return renderLocalDossier({ ...input, local: { ...input.local, derivedStructure: derived, ...(manifestFacts === undefined ? {} : { manifestFacts }) } }).files;
};
const sectionOf = (html: string): string => html.slice(html.indexOf('<section id="computed-map"'), html.indexOf('</section>', html.indexOf('<section id="computed-map"')) + '</section>'.length);
const figuresOf = (html: string): string[] => [...html.matchAll(/<figure class="computed-map"[^]*?<\/figure>/gu)].map((m) => m[0]);
/** Every drawn group: its kind, its marking and its identity attributes. */
const drawn = (html: string): string[] => [...html.matchAll(/<g class="(node|edge|edge-text) (observed|inferred|unknown)(?: back)?"([^>]*)>/gu)].map((m) => `${m[1]} ${m[2]}${m[3]}`);
const widthOf = (figure: string): number => Number(/data-figure-width="([0-9.]+)"/u.exec(figure)![1]);
const boxesOf = (figure: string): number => drawn(figure).filter((g) => g.startsWith('node ')).length;

describe('the directory map', () => {
  it('holds the region\'s note, a coverage line that partitions the files, three figures of at most twelve directories and the list of every fact', () => {
    const units = Array.from({ length: 30 }, (_, i) => [`d${String(i + 1).padStart(2, '0')}`, 2] as const);
    const files = site(structure(3, units, { secret: 2, submodules: 1 }), workspaceMember());
    const page = files.get('maps/directories.html')!;
    const main = sectionOf(page);
    expect(main.startsWith('<section id="computed-map" data-map="directories" data-reading-level="1" data-topics=""><h1>Directory map</h1>'
      + `<p class="derived-note">Derived by Syzygy from the paths and modes of the tree at revision ${REV}, listed at ${AT}, by rule top-level-unit version 1. No file body, size or object id was read. Current for that revision only.</p>`
      + '<p class="map-coverage" data-epistemic="observed">Coverage: 65 files in the tree at that revision: 3 at the root; 60 under the 30 top-level directories listed here; 0 under 0 more top-level directories counted and not listed; 2 left out and not named, because a secret detector matches their path; and 1 submodule, not followed. Directories below the top level are not mapped: no rule of this version derives them.</p>'
      + '<figure class="computed-map" data-visual-provenance="computed" data-map="directories"><figcaption>Top-level directories 1 to 12 of 30, by path</figcaption><div class="map-forms" data-figure-width="648"><div class="diagram-scroll map-drawing"><svg ')).toBe(true);
    const figures = figuresOf(page);
    expect(figures.map((f) => /<figcaption>([^<]*)<\/figcaption>/u.exec(f)![1])).toEqual(['Top-level directories 1 to 12 of 30, by path', 'Top-level directories 13 to 24 of 30, by path', 'Top-level directories 25 to 30 of 30, by path']);
    expect(drawn(figures[2]!).filter((g) => !g.startsWith('edge-text'))).toEqual([
      ...[25, 26, 27, 28, 29, 30].map((k) => `edge observed data-derived-id="_tree-contains-${k}"`),
      'node observed data-derived-id="_tree-root"', ...[25, 26, 27, 28, 29, 30].map((k) => `node observed data-derived-id="_tree-unit-${k}"`),
    ]);
    // The text form: one item per arrow, in the drawing's order, each label whole.
    expect(figures[2]).toContain('<ol class="map-list"><li class="observed"><span class="map-head">Repository root</span> contains d25/ (2 files)</li><li class="observed"><span class="map-head">Repository root</span> contains d26/ (2 files)</li>');
    expect(figures[2]).toContain('</ol></div><ul class="diagram-legend" aria-label="Line styles"><li><span class="legend-line observed" aria-hidden="true"></span>Solid: observed</li></ul><p class="diagram-tally">7 boxes and 6 arrows, derived by Syzygy: 13 observed, 0 inferred, 0 unknown.</p></figure>');
    // The list: each entry exactly the region's entry for that fact.
    const index = files.get('index.html')!;
    const regionList = /<ul class="derived-facts">([^]*?)<\/ul>/u.exec(index)![1];
    expect(main).toContain(`<h2>Every derived fact</h2><ul class="derived-facts">${regionList}</ul></section>`);
    expect(main.match(/<li data-derived-id=/gu)).toHaveLength(61);
    // The region ends with the line linking the three maps, and the contents page lists them after Sources.
    expect(index).toContain('</details></figure><p class="derived-maps">Computed maps: <a href="maps/directories.html">Directory map</a> · <a href="maps/units.html">Unit map</a> · <a href="maps/ci.html">CI pipeline map</a>.</p></section>');
    expect(files.get('contents.html')).toContain('<li><a href="sources/index.html">Sources</a></li><li><a href="maps/directories.html">Directory map</a></li><li><a href="maps/units.html">Unit map</a></li><li><a href="maps/ci.html">CI pipeline map</a></li></ol>');
    // A page of the site: the pages' navigation, the run's one sentence, the CSP, no script, at depth 1 of dossier.json.
    expect(page).toContain('<p class="run-sentence">');
    expect(page).toContain('<a href="../appendix.html">How this dossier was made');
    expect(page).toContain('<a href="../index.html">Overview</a>');
    expect(page).toContain(`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">`);
    expect(JSON.parse(files.get('dossier.json')!).pages).toEqual(expect.arrayContaining([{ path: 'maps/directories.html', depth: 1 }, { path: 'maps/units.html', depth: 1 }, { path: 'maps/ci.html', depth: 1 }]));
    expect(JSON.parse(files.get('size-report.json')!).pages.map((p: { path: string }) => p.path)).toEqual(expect.arrayContaining(['maps/directories.html', 'maps/units.html', 'maps/ci.html']));
  });

  it('counts the files the render re-derives and marks the line Unknown where the record\'s counts differ from the tree\'s', () => {
    // The tree holds 8 files; the record's `files` was edited, which the region and the map never show.
    const edited = structure(2, [['docs', 2], ['src', 3]], { secret: 1 }, false);
    const main = sectionOf(site(edited, workspaceMember()).get('maps/directories.html')!);
    expect(main).toContain('<p class="map-coverage" data-epistemic="unknown" data-unknown-reason="stale-beyond-currency-bound">Coverage: 8 files in the tree at that revision: 2 at the root; 5 under the 2 top-level directories listed here; 0 under 0 more top-level directories counted and not listed; 1 left out and not named, because a secret detector matches their path; and 0 submodules, not followed. Directories below the top level are not mapped: no rule of this version derives them. The derived record\'s counts differ from the tree\'s at this revision.</p>');
    // Its figures and list are the region's, unchanged: still Observed.
    expect(drawn(figuresOf(main)[0]!).every((g) => g.split(' ')[1] === 'observed')).toBe(true);
    // A count of one takes the singular.
    const one = sectionOf(site(structure(0, [['a', 1]], { submodules: 1, notListed: [1] }), workspaceMember()).get('maps/directories.html')!);
    expect(one).toContain('Coverage: 2 files in the tree at that revision: 0 at the root; 1 under the 1 top-level directory listed here; 1 under 1 more top-level directory counted and not listed; 0 left out and not named, because a secret detector matches their path; and 1 submodule, not followed.');
  });

  it('draws 300 directories as 21 figures of at most 13 boxes, each fitting at 1440 and at 390, with a query for its width', () => {
    // 250 listed and 50 counted and not listed, as check's record holds them.
    const units = Array.from({ length: 250 }, (_, i) => [`u${String(i + 1).padStart(3, '0')}`, 4] as const);
    const page = site(structure(1, units, { notListed: Array.from({ length: 50 }, () => 3) }), workspaceMember()).get('maps/directories.html')!;
    const figures = figuresOf(page);
    expect(figures).toHaveLength(21);
    expect(figures.map(boxesOf)).toEqual([...Array.from({ length: 20 }, () => 13), 11]);
    expect(page).toContain('1 at the root; 1000 under the 250 top-level directories listed here; 150 under 50 more top-level directories counted and not listed;');
    for (const figure of figures) {
      const width = widthOf(figure);
      expect(width).toBeLessThanOrEqual(648);
      // Taken as figure fit takes a sequence or swimlane figure: at 1440 (column 966) the drawing, unscaled; at 390 (column 261) the text form.
      expect(width <= 966).toBe(true);
      expect(width > 261).toBe(true);
      expect(figure).toContain(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} `);
      expect(page).toContain(`@container (width < ${width}px){.map-forms[data-figure-width="${width}"]>.map-drawing{display:none}.map-forms[data-figure-width="${width}"]>.map-list{display:block}}`);
    }
    expect(page).toContain('.map-list{display:none;margin:.5rem 0;padding-left:2rem;font:13px/1.5 var(--font-mono);overflow-wrap:anywhere}');
  });

  it('holds its heading and the Not established sentence alone with no readable record, and draws each unit place Unknown', () => {
    const files = site({ state: 'missing', revision: REV, unknownReason: 'missing-evidence' }, workspaceMember());
    expect(sectionOf(files.get('maps/directories.html')!)).toBe('<section id="computed-map" data-map="directories" data-reading-level="1" data-topics=""><h1>Directory map</h1>'
      + `<p class="derived-unknown" data-epistemic="unknown" data-unknown-reason="missing-evidence"><span class="not-established">Not established.</span> The top-level directories of the tree at revision ${REV} are Unknown at this render: no derived record was kept when this draft revision was checked.</p></section>`);
    expect(files.get('maps/directories.html')).not.toContain('.map-forms');
    const units = files.get('maps/units.html')!;
    expect(drawn(units).filter((g) => g.startsWith('node '))).toEqual([
      'node unknown data-unknown-reason="missing-evidence"', 'node inferred data-manifest-id="_manifest-10"',
      'node unknown data-unknown-reason="missing-evidence"', 'node inferred data-manifest-id="_manifest-13"', 'node inferred data-manifest-id="_manifest-15"',
    ]);
    expect(units).toContain('<li class="inferred"><span class="map-head">Repository root ?</span> declares root</li>');
  });
});

describe('the unit map', () => {
  it('places each package in its root or top-level directory, draws no arrow between packages and lists every declared fact', () => {
    const files = site(structure(1, [['.github', 1], ['packages', 2]]), workspaceMember());
    const page = files.get('maps/units.html')!;
    const main = sectionOf(page);
    expect(main.startsWith('<section id="computed-map" data-map="units" data-reading-level="1" data-topics=""><h1>Unit map</h1>'
      + `<p class="map-note">Computed by Syzygy at this render from the manifest files of the tree at revision ${REV} that the bound screening policy POLARIS-DOSSIER-SCREENING-POLICY 2.0.0 admits, read by rule npm-package-manifest, cargo-manifest, python-project-manifest and go-module-manifest, each at version 1. That revision fixes every input, so the map holds as of that revision at any instant. What a file declares, never what runs.</p>`
      + '<p class="map-coverage" data-epistemic="inferred">npm-package-manifest: 4 candidate files; 3 read for facts, 1 Unknown with no facts taken; 0 left out and not named, because a secret detector matches their path; 0 set apart as vendored, generated or test paths; 0 values left out by the value checks; 6 facts. '
      + 'cargo-manifest: 0 candidate files; 0 read for facts, 0 Unknown with no facts taken; 0 left out and not named, because a secret detector matches their path; 0 set apart as vendored, generated or test paths; 0 values left out by the value checks; 0 facts. '
      + 'python-project-manifest: 0 candidate files; 0 read for facts, 0 Unknown with no facts taken; 0 left out and not named, because a secret detector matches their path; 0 set apart as vendored, generated or test paths; 0 values left out by the value checks; 0 facts. '
      + 'go-module-manifest: 0 candidate files; 0 read for facts, 0 Unknown with no facts taken; 0 left out and not named, because a secret detector matches their path; 0 set apart as vendored, generated or test paths; 0 values left out by the value checks; 0 facts. '
      + 'Places are path-derived: each package or module sits under the top-level directory its manifest&#39;s path begins with, and may move on refactor. Arrows between packages are not drawn: no rule of this version states that a dependency names a package of this tree.</p>')).toBe(true);
    const figures = figuresOf(page);
    expect(figures.map((f) => /<figcaption>([^<]*)<\/figcaption>/u.exec(f)![1])).toEqual([
      'Repository root: packages and modules 1 to 1 of 1, as their manifests declare, placed by path',
      'packages/: packages and modules 1 to 2 of 2, as their manifests declare, placed by path',
    ]);
    expect(drawn(figures[1]!).filter((g) => !g.startsWith('edge-text'))).toEqual([
      'edge inferred data-manifest-id="_manifest-13"', 'edge inferred data-manifest-id="_manifest-15"',
      'node observed data-derived-id="_tree-unit-2"', 'node inferred data-manifest-id="_manifest-13"', 'node inferred data-manifest-id="_manifest-15"',
    ]);
    expect(drawn(figures[0]!)[1]).toBe('node observed data-derived-id="_tree-root"');
    // No arrow between two packages: every arrow is a `declares` from a place.
    expect(page.match(/<title>declares \(inferred\)<\/title>/gu)).toHaveLength(6);
    expect(page).not.toMatch(/<title>(?!declares)[^<]* \(inferred\)<\/title><path d/u);
    expect(figures[1]).toContain('<ol class="map-list"><li class="inferred"><span class="map-head">packages/</span> declares a</li><li class="inferred"><span class="map-head">packages/</span> declares b</li></ol>');
    expect(figures[1]).toContain('<li><span class="legend-line observed" aria-hidden="true"></span>Solid: observed</li><li><span class="legend-line inferred" aria-hidden="true"></span>Dashed: inferred</li></ul><p class="diagram-tally">3 boxes and 2 arrows, derived by Syzygy: 1 observed, 4 inferred, 0 unknown.</p>');
    expect(main).toContain('<h2>Every declared fact</h2><ul class="map-facts"><li data-manifest-path="package.json" data-epistemic="inferred">package.json: 3 facts.<ul>');
    expect(main).toContain('<li data-manifest-path="packages/a/package.json" data-epistemic="inferred">packages/a/package.json: 2 facts.<ul><li data-manifest-id="_manifest-13" data-manifest-fact="package" data-epistemic="inferred" data-manifest-rule="npm-package-manifest" data-manifest-rule-version="1" data-manifest-path="packages/a/package.json" data-manifest-lines="2-2">Package a. <span class="derived-mark">Derived by Syzygy</span>'
      + `<span class="visually-hidden ev"> Evidence: label Inferred; declared in packages/a/package.json, lines 2 to 2; read by Syzygy by rule npm-package-manifest version 1 at revision ${REV}.</span></li>`
      + '<li data-manifest-id="_manifest-14" data-manifest-fact="dependency" data-epistemic="inferred" data-manifest-rule="npm-package-manifest" data-manifest-rule-version="1" data-manifest-path="packages/a/package.json" data-manifest-lines="4-4">Declares a dependency named b in dependencies. <span class="derived-mark">');
    expect(main).toContain('>Workspace member pattern packages/*. <span class="derived-mark">');
    expect(main).toContain('packages/b/package.json: 1 fact.<ul>');
    expect(main.endsWith('<h2>Files whose facts are Unknown</h2><ul class="map-unknown-files"><li data-epistemic="unknown" data-unknown-reason="mapping-coverage-absent" data-manifest-path="vendor-free/package.json" data-manifest-file-reason="unparsed, syntax">vendor-free/package.json: Unknown, no facts taken (unparsed, syntax).</li></ul></section>')).toBe(true);
    // Every element and entry is Inferred where a manifest fact draws it: none Observed.
    expect(main.match(/data-manifest-id="[^"]+" data-manifest-fact="[^"]+" data-epistemic="(?!inferred)/gu)).toBeNull();
    for (const g of drawn(page)) if (g.includes('data-manifest-id')) expect(g.split(' ')[1]).toBe('inferred');
  });

  it('states a zero-fact file, an Unknown member and the empty lists in Syzygy\'s words', () => {
    const member = workspaceMember() as Extract<LocalManifestFacts, { state: 'derived' }>;
    const zero: LocalManifestFacts = { ...member, facts: [], recognizers: member.recognizers.map((r) => (r.rule === NPM ? { ...r, candidates: 1, inferred: 1, unknown: 0, facts: 0, files: [file('package.json', 0)] } : r.rule === WF ? recognizer(WF) : r)) };
    const files = site(structure(1, []), zero);
    const units = sectionOf(files.get('maps/units.html')!);
    expect(units).toContain('<h2>Every declared fact</h2><ul class="map-facts"><li data-manifest-path="package.json" data-epistemic="inferred">package.json: no fact of the fields read.</li></ul>');
    expect(units).toContain('<ul class="map-unknown-files"><li>Every candidate file not left out or set apart was read for facts.</li></ul>');
    expect(units).not.toContain('<figure');
    expect(files.get('maps/units.html')).not.toContain('.map-forms');
    expect(sectionOf(files.get('maps/ci.html')!)).toContain('<ul class="map-unknown-files"><li>No candidate file.</li></ul>');
    const unknown = site(structure(1, []), { format: 'polaris-dossier-manifest-facts/1', state: 'unknown', why: 'the pinned tree could not be listed (object-missing)' });
    for (const [path, map, title] of [['maps/units.html', 'units', 'Unit map'], ['maps/ci.html', 'ci', 'CI pipeline map']] as const) {
      expect(sectionOf(unknown.get(path)!)).toBe(`<section id="computed-map" data-map="${map}" data-reading-level="1" data-topics=""><h1>${title}</h1>`
        + `<p class="derived-unknown" data-epistemic="unknown" data-unknown-reason="source-uncaptured-or-unreachable"><span class="not-established">Not established.</span> What the manifest files at revision ${REV} declare is Unknown at this render: the pinned tree could not be listed.</p></section>`);
    }
    expect(JSON.parse(unknown.get('machine.json')!).computedMaps).toEqual({
      pages: ['maps/directories.html', 'maps/units.html', 'maps/ci.html'],
      directories: { state: 'derived', figures: 0 },
      manifests: { state: 'unknown', screeningPolicy: null, recognizers: [], factsNotListed: null },
      units: { figures: 0, facts: [], files: [] },
      ci: { figures: 0, facts: [], files: [] },
    });
  });

  it('names each Unknown file with its word and RFC2-24 reason, and counts unlisted files and facts in the coverage line', () => {
    const member = workspaceMember() as Extract<LocalManifestFacts, { state: 'derived' }>;
    const reasons = ['denied-path', 'unknown-extraction-class', 'not-utf8-text', 'secret-detector-match', 'active-content', 'redacted-body', 'class-not-consented', 'object-read-refused', 'path-not-citable', 'symbolic-link', 'over-read-limit', 'too-large'];
    const listed: LocalManifestFacts = { ...member, factsNotListed: 1, recognizers: member.recognizers.map((r) => (r.rule === 'go-module-manifest'
      ? { ...r, candidates: 13, unknown: 12, secretPathsLeftOut: 1, filesNotListed: 1, files: reasons.map((reason, i) => unknownFile(`m${i}/go.mod`, reason)) } : r)) };
    const units = sectionOf(site(structure(1, []), listed).get('maps/units.html')!);
    expect(units).toContain('go-module-manifest: 13 candidate files; 0 read for facts, 12 Unknown with no facts taken; 1 left out and not named, because a secret detector matches their path;');
    expect(units).toContain('0 facts. 1 file of go-module-manifest is counted and not listed. 1 fact of the manifest files is counted and not listed, so a figure or list may lack it. Places are path-derived');
    expect([...units.matchAll(/<li data-epistemic="unknown" data-unknown-reason="([^"]+)" data-manifest-path="([^"]+)" data-manifest-file-reason="([^"]+)">/gu)].map((m) => `${m[2]} ${m[3]} ${m[1]}`)).toEqual([
      'vendor-free/package.json unparsed, syntax mapping-coverage-absent',
      'm0/go.mod denied-path excluded-content', 'm1/go.mod unknown-extraction-class excluded-content', 'm2/go.mod not-utf8-text excluded-content',
      'm3/go.mod secret-detector-match excluded-content', 'm4/go.mod active-content excluded-content', 'm5/go.mod redacted-body excluded-content',
      'm6/go.mod class-not-consented unconsented-source-or-provider', 'm7/go.mod object-read-refused source-uncaptured-or-unreachable',
      'm8/go.mod path-not-citable mapping-coverage-absent', 'm9/go.mod symbolic-link mapping-coverage-absent', 'm10/go.mod over-read-limit mapping-coverage-absent', 'm11/go.mod too-large mapping-coverage-absent',
    ]);
    expect(units).toContain('>m6/go.mod: Unknown, no facts taken (class-not-consented).</li>');
  });
});

describe('the CI pipeline map', () => {
  it('states the workflow and its triggers, draws its jobs and the needs that name a job of the file, and lists the rest', () => {
    const files = site(structure(1, [['.github', 1]]), workspaceMember());
    const page = files.get('maps/ci.html')!;
    const main = sectionOf(page);
    expect(main).toContain('read by rule github-actions-workflow, each at version 1.');
    expect(main).toContain('<p class="map-coverage" data-epistemic="inferred">github-actions-workflow: 2 candidate files; 1 read for facts, 1 Unknown with no facts taken; 0 left out and not named, because a secret detector matches their path; 0 set apart as vendored, generated or test paths; 0 values left out by the value checks; 9 facts.</p>');
    expect(main).toContain('<h2>.github/workflows/ci.yml</h2><ul class="map-workflow"><li data-manifest-id="_manifest-1" data-manifest-fact="workflow" data-epistemic="inferred" data-manifest-rule="github-actions-workflow" data-manifest-rule-version="1" data-manifest-path=".github/workflows/ci.yml" data-manifest-lines="1-1">Workflow CI. <span');
    expect(main).toContain('>Triggered by push. <span');
    expect(main).toContain('>Triggered by pull_request. <span');
    const [figure] = figuresOf(page);
    expect(figuresOf(page)).toHaveLength(1);
    expect(figure).toContain('<figcaption>.github/workflows/ci.yml: jobs and what each needs, as declared</figcaption>');
    expect(drawn(figure!).filter((g) => !g.startsWith('edge-text'))).toEqual([
      'edge inferred data-manifest-id="_manifest-6"', 'edge inferred data-manifest-id="_manifest-8"',
      'node inferred data-manifest-id="_manifest-4"', 'node inferred data-manifest-id="_manifest-5"', 'node inferred data-manifest-id="_manifest-7"',
    ]);
    expect(figure).toContain('<ol class="map-list"><li class="inferred"><span class="map-head">test</span> needs build</li><li class="inferred"><span class="map-head">deploy</span> needs test</li></ol>');
    expect(figure).toContain('<p class="diagram-tally">3 boxes and 2 arrows, derived by Syzygy: 0 observed, 5 inferred, 0 unknown.</p>');
    expect(main).toContain('>Job deploy needs release, which names no job of this file. <span');
    expect(main).toContain('>Job test needs build. <span');
    expect(main).not.toMatch(/data-epistemic="observed"|class="(?:node|edge) observed/u);
    expect(main).toContain('<li data-epistemic="unknown" data-unknown-reason="unconsented-source-or-provider" data-manifest-path=".github/workflows/deploy.yml" data-manifest-file-reason="class-not-consented">');
  });

  it('stacks a job graph that is not a plain chain, with a query for its own width, and lists 25 jobs undrawn', () => {
    const member = workspaceMember() as Extract<LocalManifestFacts, { state: 'derived' }>;
    const path = '.github/workflows/skip.yml', many = '.github/workflows/many.yml';
    const skip = [fact(1, 'workflow', WF, path, 1, { name: null }), fact(2, 'job', WF, path, 2, { job: 'a' }), fact(3, 'job', WF, path, 3, { job: 'b' }),
      fact(4, 'job-needs', WF, path, 4, { from: 'b', to: 'a' }), fact(5, 'job', WF, path, 5, { job: 'c' }), fact(6, 'job-needs', WF, path, 6, { from: 'c', to: 'b' }), fact(7, 'job-needs', WF, path, 6, { from: 'c', to: 'a' })];
    const jobs = Array.from({ length: 25 }, (_, i) => fact(100 + i, 'job', WF, many, 10 + i, { job: `j${i + 1}` }));
    const stacked: LocalManifestFacts = { ...member, facts: [...skip, ...jobs], recognizers: [...member.recognizers.slice(0, 4), recognizer(WF, { candidates: 2, inferred: 2, facts: 32, files: [file(path, 7), file(many, 25)] })] };
    const page = site(structure(1, []), stacked).get('maps/ci.html')!;
    const figures = figuresOf(page);
    expect(figures).toHaveLength(1);
    const width = widthOf(figures[0]!);
    expect(width).not.toBe(648);
    expect(width).toBeLessThan(648);
    expect(page).toContain(`@container (width < ${width}px){.map-forms[data-figure-width="${width}"]>.map-drawing{display:none}.map-forms[data-figure-width="${width}"]>.map-list{display:block}}`);
    expect(page).not.toContain('data-figure-width="648"');
    expect(page).toContain('>Workflow with no name. <span');
    expect(page).toContain('<li>No trigger is declared.</li>');
    expect(page).toContain(`<h2>${many}</h2>`);
    expect(page).toContain('<p class="map-note">25 jobs are declared: too many to draw in one figure, so they are listed below.</p>');
    expect(page.match(/data-manifest-fact="job" /gu)).toHaveLength(28);
  });
});

describe('computed maps on the site', () => {
  it('carries computedMaps in the machine view beside derivedStructure, each member as the render derived it', () => {
    const files = site(structure(1, [['.github', 1], ['packages', 2]]), workspaceMember());
    const machine = JSON.parse(files.get('machine.json')!) as Record<string, unknown>;
    const keys = Object.keys(machine);
    expect(keys[keys.indexOf('derivedStructure') + 1]).toBe('computedMaps');
    const maps = machine['computedMaps'] as Record<string, Record<string, unknown>>;
    expect(maps['pages']).toEqual(['maps/directories.html', 'maps/units.html', 'maps/ci.html']);
    expect(maps['directories']).toEqual({ state: 'derived', figures: 1 });
    expect(maps['manifests']).toEqual({ state: 'derived', screeningPolicy: POLICY, factsNotListed: 0, recognizers: [
      { rule: NPM, ruleVersion: 1, label: 'inferred', candidates: 4, secretPathsLeftOut: 0, setApart: 0, inferred: 3, unknown: 1, valuesLeftOut: 0, facts: 6, filesNotListed: 0 },
      ...['cargo-manifest', 'python-project-manifest', 'go-module-manifest'].map((rule) => ({ rule, ruleVersion: 1, label: 'inferred', candidates: 0, secretPathsLeftOut: 0, setApart: 0, inferred: 0, unknown: 0, valuesLeftOut: 0, facts: 0, filesNotListed: 0 })),
      { rule: WF, ruleVersion: 1, label: 'inferred', candidates: 2, secretPathsLeftOut: 0, setApart: 0, inferred: 1, unknown: 1, valuesLeftOut: 0, facts: 9, filesNotListed: 0 },
    ] });
    expect(maps['units']!['figures']).toBe(2);
    expect((maps['units']!['facts'] as { id: string }[]).map((f) => f.id)).toEqual(['_manifest-10', '_manifest-11', '_manifest-12', '_manifest-13', '_manifest-14', '_manifest-15']);
    expect((maps['units']!['files'] as { path: string }[]).map((f) => f.path)).toEqual(['package.json', 'packages/a/package.json', 'packages/b/package.json', 'vendor-free/package.json']);
    expect(maps['ci']!['figures']).toBe(1);
    expect((maps['ci']!['facts'] as { id: string }[])[0]).toEqual({ id: '_manifest-1', fact: 'workflow', rule: WF, ruleVersion: 1, path: '.github/workflows/ci.yml', lines: [1, 1], name: 'CI', epistemic: 'inferred' });
    // Two renders of one input give the same map pages and member.
    const again = site(structure(1, [['.github', 1], ['packages', 2]]), workspaceMember());
    for (const path of ['maps/directories.html', 'maps/units.html', 'maps/ci.html', 'machine.json']) expect(again.get(path), path).toBe(files.get(path));
  });

  it('gives every drawn element its fact\'s identity, every figure computed provenance, no script, and the map rules to map pages alone', () => {
    const files = site(structure(1, [['.github', 1], ['packages', 2]]), workspaceMember());
    for (const [path, html] of files) {
      if (!path.endsWith('.html')) continue;
      expect(html, path).not.toMatch(/<script\b/iu);
      if (!path.startsWith('maps/')) { expect(html, path).not.toMatch(/\.map-forms|\.map-list|map-drawing/u); continue; }
      for (const figure of [...html.matchAll(/<figure\b[^>]*>/gu)].map((m) => m[0])) expect(figure, path).toContain(' data-visual-provenance="computed"');
      for (const g of drawn(html)) expect(g, path).toMatch(/ data-(?:derived|manifest)-id="_(?:tree|manifest)-[a-z0-9-]+"/u);
    }
    // No text of the draft on a map page, and no figure of it: the reading fixture's quotation and its diagram labels appear nowhere there.
    for (const path of ['maps/directories.html', 'maps/units.html', 'maps/ci.html']) {
      expect(files.get(path), path).not.toContain('The event loop reads each replica.');
      expect(files.get(path), path).not.toContain('data-visual-provenance="curated"');
    }
  });

  it('renders no map page, line, item or member without the render-time manifest facts, and none in the provider mode', () => {
    const files = site(structure(1, []), undefined);
    expect([...files.keys()].filter((path) => path.startsWith('maps/'))).toEqual([]);
    expect(files.get('index.html')).not.toContain('derived-maps');
    expect(files.get('contents.html')).not.toContain('maps/');
    expect(JSON.parse(files.get('machine.json')!)).not.toHaveProperty('computedMaps');
    // A draft page may not take a map's path.
    const input = readingInput();
    const page = { path: 'maps/units.html', title: 'Taken', intro: 'x', groups: [] };
    expect(() => renderLocalDossier({ ...input, local: { ...input.local, pages: [...input.local.pages, page], derivedStructure: structure(1, []), manifestFacts: workspaceMember() } })).toThrow('page-path-collision');
    expect(typeof renderDossierSite).toBe('function');
  });
});
