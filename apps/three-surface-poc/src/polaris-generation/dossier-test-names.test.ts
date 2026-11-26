import { describe, expect, it } from 'vitest';
import type { LocalDerivedStructure, LocalTestNames, LocalTestNamesRecognizer } from '@syzygy/polaris-generation-core/live';
import { readingInput } from './dossier-reading.testkit.js';
import { renderLocalDossier } from './dossier-site.js';

// syzygy-5dhm.45 (REQ-polaris-generation-034 version 2.34): the test-names reference page and its machine member. Inputs are built here;
// every expected string and count is a literal written from the requirement's words before the renderer ran.

const REV = 'c'.repeat(40);
const POLICY = { policyId: 'POLARIS-DOSSIER-SCREENING-POLICY', policyVersion: '2.0.0', sha256: 'a'.repeat(64) };
const PAGE = 'reference/test-names.html';

const derived: LocalDerivedStructure = {
  state: 'derived', revision: REV, recordRevision: REV, capturedAt: '2026-11-22T09:30:00.000Z', recordText: '{}\n', sha256: 'd'.repeat(64), currencyPolicy: null, unitsNotListed: 0,
  facts: [{ id: '_tree-root', fact: 'tree-root', rule: 'top-level-unit', ruleVersion: 1, epistemic: 'observed', unknownReason: null, path: '.', count: 1, to: null }],
  tree: { files: 1, rootFiles: 1, unitsListed: 0, unitFiles: 0, unitsNotListed: 0, secretPathsLeftOut: 0, submodules: 0 }, countsMatch: true,
};
const recognizer = (rule: string, counts: Partial<LocalTestNamesRecognizer> = {}): LocalTestNamesRecognizer => ({
  rule, ruleVersion: 1, label: 'inferred', candidates: 0, secretPathsLeftOut: 0, setApart: 0, inferred: 0, unknown: 0, valuesLeftOut: 0, names: 0, files: [], filesNotListed: 0, ...counts,
});
const zero = { 'pytest-test-name': 0, 'js-test-call': 0, 'go-test-function': 0, 'junit-test-method': 0 };
const MEMBER: LocalTestNames = {
  format: 'polaris-dossier-test-names/1', state: 'derived', screeningPolicy: POLICY, unitRule: { rule: 'top-level-unit', ruleVersion: 1 },
  recognizers: [
    recognizer('pytest-test-name', {
      candidates: 3, inferred: 2, unknown: 1, names: 2,
      files: [
        { path: 'test_root.py', epistemic: 'inferred', unknownReason: null, parseFault: null, names: 1, valuesLeftOut: 0 },
        { path: 'tests/test_api.py', epistemic: 'inferred', unknownReason: null, parseFault: null, names: 1, valuesLeftOut: 0 },
        { path: 'tests/test_open.py', epistemic: 'unknown', unknownReason: 'unparsed', parseFault: 'unterminated', names: null, valuesLeftOut: null },
      ],
    }),
    recognizer('js-test-call', { candidates: 1, inferred: 1, names: 1, files: [{ path: 'web/a.test.ts', epistemic: 'inferred', unknownReason: null, parseFault: null, names: 1, valuesLeftOut: 0 }] }),
    recognizer('go-test-function'),
    recognizer('junit-test-method'),
  ],
  units: [
    { unit: null, files: 1, names: 1, byRule: { ...zero, 'pytest-test-name': 1 } },
    { unit: 'tests', files: 1, names: 1, byRule: { ...zero, 'pytest-test-name': 1 } },
    { unit: 'web', files: 1, names: 1, byRule: { ...zero, 'js-test-call': 1 } },
  ],
  unitsNotListed: 0,
  names: [
    { id: '_test-name-1', name: 'test_at_root', kind: 'test', rule: 'pytest-test-name', ruleVersion: 1, path: 'test_root.py', line: 1, unit: null, epistemic: 'inferred' },
    { id: '_test-name-2', name: 'test_get', kind: 'test', rule: 'pytest-test-name', ruleVersion: 1, path: 'tests/test_api.py', line: 2, unit: 'tests', epistemic: 'inferred' },
    { id: '_test-name-3', name: 'renders <b>', kind: 'suite', rule: 'js-test-call', ruleVersion: 1, path: 'web/a.test.ts', line: 3, unit: 'web', epistemic: 'inferred' },
  ],
  namesNotListed: 0,
};
const site = (testNames: LocalTestNames | undefined, structure: LocalDerivedStructure | null = derived) => {
  const input = readingInput();
  return renderLocalDossier({ ...input, local: { ...input.local, ...(structure === null ? {} : { derivedStructure: structure }), ...(testNames === undefined ? {} : { testNames }) } }).files;
};

describe('the test-names reference page (version 2.34)', () => {
  it('renders a per-unit table, every name with its label and evidence, and the Unknown files with their reasons', () => {
    const files = site(MEMBER);
    const page = files.get(PAGE)!;
    expect(page).toContain('<caption>Test names per unit, as counts of names each rule read: 3 units with a test file read</caption>');
    expect(page).toContain('<tr><th scope="col">Unit</th><th scope="col">Files read</th><th scope="col">pytest</th><th scope="col">JavaScript and TypeScript</th><th scope="col">Go</th><th scope="col">JUnit</th><th scope="col">All names</th></tr>');
    expect(page).toContain('<tr data-test-names-unit="." data-epistemic="inferred"><th scope="row">Repository root</th><td>1</td><td>1</td><td>0</td><td>0</td><td>0</td><td>1</td></tr>');
    expect(page).toContain('<tr data-test-names-unit="web" data-epistemic="inferred"><th scope="row">web/</th><td>1</td><td>0</td><td>1</td><td>0</td><td>0</td><td>1</td></tr>');
    expect(page).toContain('<li data-test-name-id="_test-name-2" data-epistemic="inferred" data-test-name-kind="test" data-test-name-rule="pytest-test-name" data-test-name-rule-version="1" data-test-name-path="tests/test_api.py" data-test-name-line="2">'
      + 'Test test_get, in tests/test_api.py at line 2. <span class="derived-mark">Derived by Syzygy</span><span class="visually-hidden ev"> Evidence: label Inferred; declared in tests/test_api.py, line 2; '
      + `read by Syzygy by rule pytest-test-name version 1 at revision ${REV}. A declared name, never a claim that the test runs or passes.</span></li>`);
    expect(page).toContain('Suite renders &lt;b&gt;, in web/a.test.ts at line 3.');
    expect(page).not.toContain('renders <b>');
    expect(page).toContain('<li data-epistemic="unknown" data-unknown-reason="mapping-coverage-absent" data-test-names-path="tests/test_open.py" data-test-names-file-reason="unparsed, unterminated"><span class="not-established">Not established.</span> tests/test_open.py: which names it declares is Unknown (unparsed, unterminated).</li>');
    expect(page).toContain('pytest-test-name: 3 candidate files; 2 read for names, 1 Unknown with no names taken; 0 left out and not named, because a secret detector matches their path; 0 set apart as vendored or generated paths; 0 names left out by the value checks; 2 names.');
    expect(page).toContain('never a claim that the test runs or passes');
    expect(page).toContain('Show the evidence view');
    expect(page).not.toContain('<script');
  });

  it('links the page from the contents page and names the member in the machine view', () => {
    const files = site(MEMBER);
    expect(files.get('contents.html')).toContain(`<li><a href="${PAGE}">Test names</a></li>`);
    const machine = JSON.parse(files.get('machine.json')!) as { testNames: { page: string; state: string; names: unknown[] } };
    expect([machine.testNames.page, machine.testNames.state, machine.testNames.names.length]).toEqual([PAGE, 'derived', 3]);
  });

  it('states the member Unknown in words when the tree could not be listed', () => {
    const page = site({ format: 'polaris-dossier-test-names/1', state: 'unknown', why: 'the pinned tree could not be listed (corrupt-object)' }).get(PAGE)!;
    expect(page).toContain(`<p class="derived-unknown" data-epistemic="unknown" data-unknown-reason="source-uncaptured-or-unreachable"><span class="not-established">Not established.</span> Which test names the test files at revision ${REV} declare is Unknown at this render: the pinned tree could not be listed.</p>`);
  });

  it('renders no page, link or member without the test-names member or a derived record, keeping those sites\' bytes', () => {
    const before = site(undefined);
    for (const files of [before, site(MEMBER, null)]) {
      expect(files.has(PAGE)).toBe(false);
      for (const [, text] of files) expect(text).not.toContain('test-names');
    }
    expect([...site(undefined)]).toEqual([...before]);
  });
});
