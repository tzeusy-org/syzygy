import { describe, expect, it } from 'vitest';
import type { LocalDerivedStructure, LocalManifestFact, LocalManifestFacts, LocalManifestRecognizerEntry, LocalManifestRemainder } from '@syzygy/polaris-generation-core/live';
import { readingInput } from './dossier-reading.testkit.js';
import { renderLocalDossier } from './dossier-site.js';

// syzygy-3efd.26: the infrastructure map and the coverage remainder section (REQ-polaris-generation-034 version 2.12). Inputs are built
// here; every expected string, count and identity is a literal written from the requirement's words before the renderer ran.

const REV = 'c'.repeat(40);
const POLICY = { policyId: 'POLARIS-DOSSIER-SCREENING-POLICY', policyVersion: '2.0.0', sha256: 'a'.repeat(64) };
const RULES = ['npm-package-manifest', 'cargo-manifest', 'python-project-manifest', 'go-module-manifest', 'github-actions-workflow',
  'compose-file', 'kubernetes-manifest', 'terraform-configuration', 'makefile', 'cmake-lists'];

const derived = (rootFiles: number, units: readonly (readonly [string, number])[]): LocalDerivedStructure => {
  const base = { rule: 'top-level-unit', ruleVersion: 1, epistemic: 'observed', unknownReason: null } as const;
  const unitFiles = units.reduce((n, [, f]) => n + f, 0);
  return {
    state: 'derived', revision: REV, recordRevision: REV, capturedAt: '2026-11-22T09:30:00.000Z', recordText: '{}\n', sha256: 'd'.repeat(64), currencyPolicy: null, unitsNotListed: 0,
    facts: [
      { id: '_tree-root', fact: 'tree-root', ...base, path: '.', count: rootFiles, to: null },
      ...units.map(([path, count], i) => ({ id: `_tree-unit-${i + 1}`, fact: 'top-level-unit' as const, ...base, path, count, to: null })),
      ...units.map(([path], i) => ({ id: `_tree-contains-${i + 1}`, fact: 'contains' as const, ...base, path, count: null, to: `_tree-unit-${i + 1}` })),
    ],
    tree: { files: rootFiles + unitFiles, rootFiles, unitsListed: units.length, unitFiles, unitsNotListed: 0, secretPathsLeftOut: 0, submodules: 0 }, countsMatch: true,
  };
};
const recognizer = (rule: string, counts: Partial<LocalManifestRecognizerEntry> = {}): LocalManifestRecognizerEntry => ({
  rule, ruleVersion: 1, label: 'inferred', candidates: 0, secretPathsLeftOut: 0, setApart: 0, inferred: 0, unknown: 0, valuesLeftOut: 0, facts: 0, files: [], filesNotListed: 0, ...counts,
});
const file = (path: string, facts: number) => ({ path, epistemic: 'inferred' as const, unknownReason: null, parseFault: null, facts, valuesLeftOut: 0 });
const fact = (k: number, kind: string, rule: string, path: string, lines: [number, number], members: Record<string, string | null>): LocalManifestFact => ({
  id: `_manifest-${k}`, fact: kind, rule, ruleVersion: 1, path, lines, ...members, epistemic: 'inferred',
});
const NO_REMAINDER: LocalManifestRemainder = { files: 0, secretPathsLeftOut: 0, candidates: 0, notCandidates: 0, places: [{ place: null, files: 0, notCandidates: 0 }], placesNotListed: 0, filesInPlacesNotListed: 0, notCandidatesInPlacesNotListed: 0 };
const member = (facts: LocalManifestFact[], entries: Record<string, Partial<LocalManifestRecognizerEntry>>, remainder: LocalManifestRemainder = NO_REMAINDER): LocalManifestFacts => ({
  format: 'polaris-dossier-manifest-facts/2', state: 'derived', screeningPolicy: POLICY, facts, factsNotListed: 0,
  recognizers: RULES.map((rule) => recognizer(rule, entries[rule] ?? {})), remainder,
});
const site = (structure: LocalDerivedStructure, manifestFacts: LocalManifestFacts) => {
  const input = readingInput();
  return renderLocalDossier({ ...input, local: { ...input.local, derivedStructure: structure, manifestFacts } }).files;
};
const sectionAt = (html: string, open: string): string => {
  const at = html.indexOf(open);
  return at < 0 ? '' : html.slice(at, html.indexOf('</section>', at) + '</section>'.length);
};
const evidence = (path: string, first: number, last: number, rule: string): string =>
  ` <span class="derived-mark">Derived by Syzygy</span><span class="visually-hidden ev"> Evidence: label Inferred; declared in ${path}, lines ${first} to ${last}; read by Syzygy by rule ${rule} version 1 at revision ${REV}.</span></li>`;
const entry = (id: number, kind: string, rule: string, path: string, first: number, last: number, words: string): string =>
  `<li data-manifest-id="_manifest-${id}" data-manifest-fact="${kind}" data-epistemic="inferred" data-manifest-rule="${rule}" data-manifest-rule-version="1" data-manifest-path="${path}" data-manifest-lines="${first}-${last}">${words}${evidence(path, first, last, rule)}`;

/** The Compose file of the scenario "Compose services, images, ports and dependencies" and a root Makefile declaring one target. */
function scenarioMember(): LocalManifestFacts {
  const C = 'compose-file', M = 'makefile';
  return member([
    fact(1, 'make-target', M, 'Makefile', [1, 1], { target: 'build' }),
    fact(2, 'service', C, 'compose.yaml', [2, 9], { service: 'web' }),
    fact(3, 'service-image', C, 'compose.yaml', [3, 3], { service: 'web', image: 'nginx:${TAG}' }),
    fact(4, 'service-port', C, 'compose.yaml', [5, 5], { service: 'web', port: '8080:80' }),
    fact(5, 'service-port', C, 'compose.yaml', [6, 6], { service: 'web', port: '443' }),
    fact(6, 'service-port', C, 'compose.yaml', [7, 8], { service: 'web', port: '9001:9000' }),
    fact(7, 'service-depends-on', C, 'compose.yaml', [9, 9], { from: 'web', to: 'db' }),
    fact(8, 'service', C, 'compose.yaml', [10, 13], { service: 'db' }),
    fact(9, 'service-depends-on', C, 'compose.yaml', [12, 13], { from: 'db', to: 'cache' }),
  ], {
    [C]: { candidates: 1, inferred: 1, facts: 8, files: [file('compose.yaml', 8)] },
    [M]: { candidates: 1, inferred: 1, facts: 1, files: [file('Makefile', 1)] },
  });
}

describe('the infrastructure map (version 2.12)', () => {
  it('holds its note, coverage line, no figure, every declared fact in Syzygy\'s words, and its closing list (scenario "Infrastructure map rendered")', () => {
    const files = site(derived(2, []), scenarioMember());
    const page = files.get('maps/infrastructure.html')!;
    const zero = (rule: string): string => `${rule}: 0 candidate files; 0 read for facts, 0 Unknown with no facts taken; 0 left out and not named, because a secret detector matches their path; 0 set apart as vendored, generated or test paths; 0 values left out by the value checks; 0 facts.`;
    const one = (rule: string, facts: string): string => `${rule}: 1 candidate file; 1 read for facts, 0 Unknown with no facts taken; 0 left out and not named, because a secret detector matches their path; 0 set apart as vendored, generated or test paths; 0 values left out by the value checks; ${facts}.`;
    const C = 'compose-file';
    expect(sectionAt(page, '<section id="computed-map"')).toBe('<section id="computed-map" data-map="infrastructure" data-reading-level="1" data-topics=""><h1>Infrastructure map</h1>'
      + `<p class="map-note">Computed by Syzygy at this render from the infrastructure files of the tree at revision ${REV} that the bound screening policy POLARIS-DOSSIER-SCREENING-POLICY 2.0.0 admits, read by rule compose-file, kubernetes-manifest, terraform-configuration, makefile and cmake-lists, each at version 1. That revision fixes every input, so the map holds as of that revision at any instant. What a file declares, never what runs.</p>`
      + `<p class="map-coverage" data-epistemic="inferred">${one('compose-file', '8 facts')} ${zero('kubernetes-manifest')} ${zero('terraform-configuration')} ${one('makefile', '1 fact')} ${zero('cmake-lists')} No figure is drawn: no rule of this version draws one from these facts.</p>`
      + '<h2>Every declared fact</h2><ul class="map-facts">'
      + '<li data-manifest-path="compose.yaml" data-epistemic="inferred">compose.yaml: 8 facts.<ul>'
      + entry(2, 'service', C, 'compose.yaml', 2, 9, 'Service web.')
      + entry(3, 'service-image', C, 'compose.yaml', 3, 3, 'Service web names image nginx:${TAG}.')
      + entry(4, 'service-port', C, 'compose.yaml', 5, 5, 'Service web declares port 8080:80.')
      + entry(5, 'service-port', C, 'compose.yaml', 6, 6, 'Service web declares port 443.')
      + entry(6, 'service-port', C, 'compose.yaml', 7, 8, 'Service web declares port 9001:9000.')
      + entry(7, 'service-depends-on', C, 'compose.yaml', 9, 9, 'Service web depends on db.')
      + entry(8, 'service', C, 'compose.yaml', 10, 13, 'Service db.')
      + entry(9, 'service-depends-on', C, 'compose.yaml', 12, 13, 'Service db depends on cache.')
      + '</ul></li><li data-manifest-path="Makefile" data-epistemic="inferred">Makefile: 1 fact.<ul>'
      + entry(1, 'make-target', 'makefile', 'Makefile', 1, 1, 'Make target build.')
      + '</ul></li></ul><h2>Files whose facts are Unknown</h2><ul class="map-unknown-files"><li>Every candidate file not left out or set apart was read for facts.</li></ul></section>');
    expect(page).not.toContain('<figure');
    expect(page).not.toContain('.map-forms');
    expect(page).not.toContain('<script');
    // The region's line and the contents page link it fourth; machine.json holds its facts and file entries exactly as the member does.
    expect(files.get('index.html')).toContain('<p class="derived-maps">Computed maps: <a href="maps/directories.html">Directory map</a> · <a href="maps/units.html">Unit map</a> · <a href="maps/ci.html">CI pipeline map</a> · <a href="maps/infrastructure.html">Infrastructure map</a>.</p></section>');
    expect(files.get('contents.html')).toContain('<li><a href="maps/ci.html">CI pipeline map</a></li><li><a href="maps/infrastructure.html">Infrastructure map</a></li></ol>');
    const machine = JSON.parse(files.get('machine.json')!);
    const m = scenarioMember() as Extract<LocalManifestFacts, { state: 'derived' }>;
    expect(machine.computedMaps.infrastructure).toEqual({ figures: 0, facts: m.facts, files: [file('compose.yaml', 8), file('Makefile', 1)] });
    expect(machine.pages).toContain('maps/infrastructure.html');
    expect(JSON.parse(files.get('dossier.json')!).pages).toContainEqual({ path: 'maps/infrastructure.html', depth: 1 });
    // The unit and CI maps take none of these facts.
    expect(machine.computedMaps.units.facts).toEqual([]);
    expect(machine.computedMaps.ci.facts).toEqual([]);
  });

  it('words every kind of version 2.12, a null Kubernetes name and a zero-fact file, and lists an over-read-limit count', () => {
    const K = 'kubernetes-manifest', T = 'terraform-configuration', X = 'cmake-lists';
    const files = site(derived(1, []), member([
      fact(1, 'cmake-project', X, 'CMakeLists.txt', [1, 1], { name: 'Kestrel' }),
      fact(2, 'cmake-target', X, 'CMakeLists.txt', [2, 2], { target: 'kestrel', targetKind: 'executable' }),
      fact(3, 'terraform-resource', T, 'infra/main.tf', [1, 3], { type: 'aws_instance', name: 'web' }),
      fact(4, 'terraform-module', T, 'infra/main.tf', [5, 7], { name: 'vpc', source: './modules/vpc' }),
      fact(5, 'kubernetes-object', K, 'k8s/app.yaml', [1, 4], { kind: 'Deployment', name: 'api' }),
      fact(6, 'kubernetes-object', K, 'k8s/app.yaml', [6, 7], { kind: 'Service', name: null }),
    ], {
      [K]: { candidates: 2, inferred: 2, facts: 2, files: [file('deploy/values.yaml', 0), file('k8s/app.yaml', 2)] },
      [T]: { candidates: 111, inferred: 100, unknown: 11, facts: 2, files: [file('infra/main.tf', 2), { path: 'infra/x.tf', epistemic: 'unknown', unknownReason: 'unparsed', parseFault: 'syntax', facts: null, valuesLeftOut: null }], filesNotListed: 10 },
      [X]: { candidates: 1, inferred: 1, facts: 2, files: [file('CMakeLists.txt', 2)] },
    }));
    const main = sectionAt(files.get('maps/infrastructure.html')!, '<section id="computed-map"');
    for (const words of ['Kubernetes object of kind Deployment named api.', 'Kubernetes object of kind Service with no name.', 'Terraform resource aws_instance named web.',
      'Terraform module vpc from source ./modules/vpc.', 'CMake project Kestrel.', 'CMake executable target kestrel.']) expect(main).toContain(`>${words} <span class="derived-mark">`);
    expect(main).toContain('<li data-manifest-path="deploy/values.yaml" data-epistemic="inferred">deploy/values.yaml: no fact of the fields read.</li>');
    // Recognizer by recognizer in the member's order: Kubernetes files, then Terraform, then CMake.
    expect(main.indexOf('deploy/values.yaml:')).toBeLessThan(main.indexOf('infra/main.tf:'));
    expect(main.indexOf('infra/main.tf:')).toBeLessThan(main.indexOf('CMakeLists.txt:'));
    expect(main).toContain('10 files of terraform-configuration are counted and not listed. No figure is drawn: no rule of this version draws one from these facts.</p>');
    expect(main).toContain('<ul class="map-unknown-files"><li data-epistemic="unknown" data-unknown-reason="mapping-coverage-absent" data-manifest-path="infra/x.tf" data-manifest-file-reason="unparsed, syntax">infra/x.tf: Unknown, no facts taken (unparsed, syntax).</li><li>10 files whose facts are Unknown are counted and not listed.</li></ul>');
  });

  it('says No candidate file where its five recognizers have none', () => {
    const main = sectionAt(site(derived(1, []), member([], {})).get('maps/infrastructure.html')!, '<section id="computed-map"');
    expect(main).toContain('<h2>Every declared fact</h2><ul class="map-facts"></ul><h2>Files whose facts are Unknown</h2><ul class="map-unknown-files"><li>No candidate file.</li></ul></section>');
  });
});

describe('the coverage remainder on the directory map\'s page (version 2.12)', () => {
  const SCENARIO: LocalManifestRemainder = {
    files: 10, secretPathsLeftOut: 1, candidates: 5, notCandidates: 4,
    places: [{ place: null, files: 3, notCandidates: 1 }, { place: '.github', files: 1, notCandidates: 0 }, { place: 'infra', files: 2, notCandidates: 1 }, { place: 'src', files: 3, notCandidates: 2 }],
    placesNotListed: 0, filesInPlacesNotListed: 0, notCandidatesInPlacesNotListed: 0,
  };
  const RULE_WORDS = 'npm-package-manifest, cargo-manifest, python-project-manifest, go-module-manifest, github-actions-workflow, compose-file, kubernetes-manifest, terraform-configuration, makefile and cmake-lists';
  const OPEN = '<section id="coverage-remainder" data-reading-level="1" data-topics=""><h2>What no rule read for facts</h2>';

  it('states the counts and one item per place, after the computed-map section (scenario "Coverage remainder on the directory map\'s page")', () => {
    const page = site(derived(3, [['.github', 1], ['infra', 2], ['src', 3]]), member([], {}, SCENARIO)).get('maps/directories.html')!;
    const map = sectionAt(page, '<section id="computed-map"');
    const remainder = sectionAt(page, '<section id="coverage-remainder"');
    expect(page.indexOf(remainder)).toBe(page.indexOf(map) + map.length);
    expect(remainder).toBe(`${OPEN}<p class="map-coverage" data-epistemic="inferred">Files in the tree at revision ${REV}: 10. Candidates of a manifest or infrastructure rule, counted on the unit, CI pipeline and infrastructure maps whether read or not: 5. `
      + `Left out and not named, because a secret detector matches their path: 1. Candidates of no rule, from which Syzygy took no declared fact, whatever they hold: 4. The rules are ${RULE_WORDS}, each at version 1.</p>`
      + '<ul class="map-remainder"><li data-remainder-place=".">Repository root: files 3; candidates of no rule 1.</li><li data-remainder-place=".github">.github/: files 1; candidates of no rule 0.</li>'
      + '<li data-remainder-place="infra">infra/: files 2; candidates of no rule 1.</li><li data-remainder-place="src">src/: files 3; candidates of no rule 2.</li></ul></section>');
    expect(remainder).not.toContain('<figure');
    expect(remainder).not.toContain('data-epistemic="unknown"');
  });

  it('ends with the places it counts and does not list, and stands beside the directory map\'s Not established. sentence', () => {
    const many: LocalManifestRemainder = {
      files: 260, secretPathsLeftOut: 0, candidates: 0, notCandidates: 260,
      places: [{ place: null, files: 0, notCandidates: 0 }, ...Array.from({ length: 250 }, (_, i) => ({ place: `d${String(i).padStart(3, '0')}`, files: 1, notCandidates: 1 }))],
      placesNotListed: 10, filesInPlacesNotListed: 10, notCandidatesInPlacesNotListed: 10,
    };
    const listed = sectionAt(site(derived(0, []), member([], {}, many)).get('maps/directories.html')!, '<section id="coverage-remainder"');
    expect(listed.match(/<li data-remainder-place=/gu)).toHaveLength(251);
    expect(listed.endsWith('<li data-remainder-place="d249">d249/: files 1; candidates of no rule 1.</li><li>More top-level directories, counted and not listed: 10; their files 10; candidates of no rule among them 10.</li></ul></section>')).toBe(true);
    const missing = site({ state: 'missing', revision: REV, unknownReason: 'missing-evidence' }, member([], {}, SCENARIO)).get('maps/directories.html')!;
    expect(sectionAt(missing, '<section id="computed-map"')).toContain('Not established.');
    expect(sectionAt(missing, '<section id="coverage-remainder"')).toBe(sectionAt(site(derived(3, [['.github', 1], ['infra', 2], ['src', 3]]), member([], {}, SCENARIO)).get('maps/directories.html')!, '<section id="coverage-remainder"'));
  });

  it('states Not established. where the render\'s member is unknown, and escapes a place as HTML text', () => {
    const unknown = site(derived(1, []), { format: 'polaris-dossier-manifest-facts/2', state: 'unknown', why: 'the pinned tree could not be listed (object-missing)' }).get('maps/directories.html')!;
    expect(sectionAt(unknown, '<section id="coverage-remainder"')).toBe(`${OPEN}<p class="derived-unknown" data-epistemic="unknown" data-unknown-reason="source-uncaptured-or-unreachable"><span class="not-established">Not established.</span> Which files at revision ${REV} no rule read for facts is Unknown at this render: the pinned tree could not be listed.</p></section>`);
    const odd = site(derived(0, []), member([], {}, { ...NO_REMAINDER, places: [{ place: null, files: 0, notCandidates: 0 }, { place: 'a<b&"c', files: 1, notCandidates: 1 }] })).get('maps/directories.html')!;
    expect(odd).toContain('<li data-remainder-place="a&lt;b&amp;&quot;c">a&lt;b&amp;&quot;c/: files 1; candidates of no rule 1.</li>');
  });
});
