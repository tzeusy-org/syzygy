import { describe, expect, it } from 'vitest';
import type { LocalDerivedStructure, LocalRoughEdges } from '@syzygy/polaris-generation-core/live';
import { readingInput } from './dossier-reading.testkit.js';
import { renderLocalDossier } from './dossier-site.js';

// syzygy-5dhm.46 (REQ-polaris-generation-034 version 2.43): the rough-edges reference page and its machine member. Inputs are built here;
// every expected string and count is a literal written from the requirement's words before the renderer ran.

const REV = 'c'.repeat(40);
const BLOB = 'b'.repeat(40);
const POLICY = { policyId: 'POLARIS-DOSSIER-SCREENING-POLICY', policyVersion: '2.0.0', sha256: 'a'.repeat(64) };
const PAGE = 'reference/rough-edges.html';

const derived: LocalDerivedStructure = {
  state: 'derived', revision: REV, recordRevision: REV, capturedAt: '2026-11-22T09:30:00.000Z', recordText: '{}\n', sha256: 'd'.repeat(64), currencyPolicy: null, unitsNotListed: 0,
  facts: [{ id: '_tree-root', fact: 'tree-root', rule: 'top-level-unit', ruleVersion: 1, epistemic: 'observed', unknownReason: null, path: '.', count: 1, to: null }],
  tree: { files: 1, rootFiles: 1, unitsListed: 0, unitFiles: 0, unitsNotListed: 0, secretPathsLeftOut: 0, submodules: 0 }, countsMatch: true,
};
const zero = { todo: 0, fixme: 0, hack: 0, deprecation: 0, 'issue-reference': 0 };
const MEMBER: LocalRoughEdges = {
  format: 'polaris-dossier-rough-edges/1', state: 'derived', screeningPolicy: POLICY, unitRule: { rule: 'top-level-unit', ruleVersion: 1 },
  recognizer: {
    rule: 'rough-edge-marker', ruleVersion: 1, label: 'observed', candidates: 4, secretPathsLeftOut: 0, setApart: 1, observed: 2, unknown: 1, valuesLeftOut: 0, markers: 4,
    files: [
      { path: 'setup.py', epistemic: 'observed', unknownReason: null, parseFault: null, markers: 1, valuesLeftOut: 0 },
      { path: 'web/a.ts', epistemic: 'observed', unknownReason: null, parseFault: null, markers: 3, valuesLeftOut: 0 },
      { path: 'web/open.ts', epistemic: 'unknown', unknownReason: 'unparsed', parseFault: 'unterminated', markers: null, valuesLeftOut: null },
    ],
    filesNotListed: 0,
  },
  units: [
    { unit: null, files: 1, markers: 1, byKind: { ...zero, todo: 1 } },
    { unit: 'web', files: 1, markers: 3, byKind: { ...zero, hack: 1, deprecation: 1, 'issue-reference': 1 } },
  ],
  unitsNotListed: 0,
  markers: [
    { id: '_marker-1', kind: 'todo', marker: 'TODO', path: 'setup.py', line: 1, unit: null, blob: BLOB, quote: '# TODO: pin <versions>', epistemic: 'observed', referenceContent: null },
    { id: '_marker-2', kind: 'hack', marker: 'HACK', path: 'web/a.ts', line: 2, unit: 'web', blob: BLOB, quote: '// HACK: around #7', epistemic: 'observed', referenceContent: null },
    { id: '_marker-3', kind: 'issue-reference', marker: '#7', path: 'web/a.ts', line: 2, unit: 'web', blob: BLOB, quote: '// HACK: around #7', epistemic: 'observed', referenceContent: 'unknown' },
    { id: '_marker-4', kind: 'deprecation', marker: '@deprecated', path: 'web/a.ts', line: 5, unit: 'web', blob: BLOB, quote: '/** @deprecated use g */', epistemic: 'observed', referenceContent: null },
  ],
  markersNotListed: 0,
};
const site = (roughEdges: LocalRoughEdges | undefined, structure: LocalDerivedStructure | null = derived) => {
  const input = readingInput();
  return renderLocalDossier({ ...input, local: { ...input.local, ...(structure === null ? {} : { derivedStructure: structure }), ...(roughEdges === undefined ? {} : { roughEdges }) } }).files;
};

describe('the rough-edges reference page (version 2.43)', () => {
  it('renders a per-unit table, the deprecation markers, every other marker with its quoted line and evidence, and the Unknown files', () => {
    const page = site(MEMBER).get(PAGE)!;
    expect(page).toContain('<caption>Markers per unit, as counts of what the rule read: 2 units with a source file read</caption>');
    expect(page).toContain('<tr><th scope="col">Unit</th><th scope="col">Files read</th><th scope="col">TODO</th><th scope="col">FIXME</th><th scope="col">HACK</th><th scope="col">Deprecation</th><th scope="col">Issue references</th><th scope="col">All markers</th></tr>');
    expect(page).toContain('<tr data-rough-edges-unit="." data-epistemic="observed"><th scope="row">Repository root</th><td>1</td><td>1</td><td>0</td><td>0</td><td>0</td><td>0</td><td>1</td></tr>');
    expect(page).toContain('<tr data-rough-edges-unit="web" data-epistemic="observed"><th scope="row">web/</th><td>1</td><td>0</td><td>0</td><td>1</td><td>1</td><td>1</td><td>3</td></tr>');
    expect(page).toContain('<li data-marker-id="_marker-1" data-epistemic="observed" data-marker-kind="todo" data-marker-path="setup.py" data-marker-line="1">'
      + 'TODO, in setup.py at line 1: <q># TODO: pin &lt;versions&gt;</q> <span class="derived-mark">Derived by Syzygy</span><span class="visually-hidden ev"> Evidence: label Observed; line 1 of setup.py, blob '
      + `${BLOB}, quoted exactly but for its leading and trailing spaces and tabs; read by Syzygy by rule rough-edge-marker version 1 at revision ${REV}.</span></li>`);
    expect(page).not.toContain('<versions>');
    expect(page).toContain('Issue reference #7, in web/a.ts at line 2: <q>// HACK: around #7</q>');
    expect(page).toContain('<span class="reference-unknown" data-epistemic="unknown" data-unknown-reason="source-uncaptured-or-unreachable"><span class="not-established">Not established.</span> What #7 names is Unknown: it lies outside the clone, and Syzygy fetched nothing.</span>');
    const away = page.slice(page.indexOf('<h2>Deprecation markers</h2>'), page.indexOf('<h2>Every other marker, by unit</h2>'));
    expect(away).toContain('<p>What may be going away: each is a line that writes a deprecation form, never a claim that anything is deprecated; a Python line may handle or silence a deprecation warning rather than raise one.</p>');
    expect(away).toContain('Deprecation marker @deprecated, in web/a.ts at line 5:');
    expect(away).not.toContain('_marker-2');
    expect(page.slice(page.indexOf('<h2>Every other marker, by unit</h2>'))).not.toContain('_marker-4');
    expect(page).toContain('<li data-epistemic="unknown" data-unknown-reason="mapping-coverage-absent" data-rough-edges-path="web/open.ts" data-rough-edges-file-reason="unparsed, unterminated"><span class="not-established">Not established.</span> web/open.ts: which markers it writes is Unknown (unparsed, unterminated).</li>');
    expect(page).toContain('rough-edge-marker: 4 candidate files; 2 read for markers, 1 Unknown with no markers taken; 0 left out and not named, because a secret detector matches their path; 1 set apart as vendored or generated paths; 0 markers left out because the value checks refuse its line; 4 markers.');
    expect(page).toContain('<p class="rough-edges-floor" data-epistemic="unknown" data-unknown-reason="mapping-coverage-absent"><span class="not-established">Not established.</span> What 1 candidate file whose markers are Unknown or left out writes is counted in no row, so each count is of the files read and never a total: a unit with no row may hold markers.</p>');
    expect(page).toContain('nothing is fetched');
    expect(page).toContain('Show the evidence view');
    expect(page).not.toContain('<script');
    expect(page).not.toContain('href="https://');
  });

  it('links the page from the contents page and names the member in the machine view', () => {
    const files = site(MEMBER);
    expect(files.get('contents.html')).toContain(`<li><a href="${PAGE}">Rough edges</a></li>`);
    // The last of the reference items: here, with no computed maps and no test-names page, right after Sources (R-ROUGH-EDGES-1 F7).
    expect(files.get('contents.html')).toContain(`<li><a href="sources/index.html">Sources</a></li><li><a href="${PAGE}">Rough edges</a></li>`);
    const machine = JSON.parse(files.get('machine.json')!) as { roughEdges: { page: string; state: string; markers: unknown[] } };
    expect([machine.roughEdges.page, machine.roughEdges.state, machine.roughEdges.markers.length]).toEqual([PAGE, 'derived', 4]);
  });

  it('follows the test-names page when that is published (R-ROUGH-EDGES-1 F7)', () => {
    const input = readingInput();
    const testNames = { format: 'polaris-dossier-test-names/1', state: 'unknown', why: 'the pinned tree could not be listed (corrupt-object)' } as const;
    const files = renderLocalDossier({ ...input, local: { ...input.local, derivedStructure: derived, testNames, roughEdges: MEMBER } }).files;
    expect(files.get('contents.html')).toContain('<li><a href="reference/test-names.html">Test names</a></li><li><a href="reference/rough-edges.html">Rough edges</a></li>');
  });

  it('says counts are never a total when files are left out for a secret path and none is Unknown (R-ROUGH-EDGES-1 F10)', () => {
    if (MEMBER.state !== 'derived') throw new Error('fixture');
    const page = site({ ...MEMBER, recognizer: { ...MEMBER.recognizer, unknown: 0, secretPathsLeftOut: 2, files: MEMBER.recognizer.files.filter(f => f.epistemic !== 'unknown') } }).get(PAGE)!;
    expect(page).toContain('What 2 candidate files whose markers are Unknown or left out write is counted in no row, so each count is of the files read and never a total');
  });

  it('states the member Unknown in words when the tree could not be listed', () => {
    const page = site({ format: 'polaris-dossier-rough-edges/1', state: 'unknown', why: 'the pinned tree could not be listed (corrupt-object)' }).get(PAGE)!;
    expect(page).toContain(`<p class="derived-unknown" data-epistemic="unknown" data-unknown-reason="source-uncaptured-or-unreachable"><span class="not-established">Not established.</span> Which markers the source files at revision ${REV} write is Unknown at this render: the pinned tree could not be listed.</p>`);
  });

  it('renders no page, link or member without the rough-edges member or a derived record, keeping those sites\' bytes', () => {
    const before = site(undefined);
    for (const files of [before, site(MEMBER, null)]) {
      expect(files.has(PAGE)).toBe(false);
      for (const [, text] of files) expect(text).not.toContain('rough-edges');
    }
    expect([...site(undefined)]).toEqual([...before]);
  });
});
