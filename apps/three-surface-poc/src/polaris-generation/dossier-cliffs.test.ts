import { describe, expect, it } from 'vitest';
import type { LocalDerivedStructure, LocalLimitsAndDefaults } from '@syzygy/polaris-generation-core/live';
import { readingInput } from './dossier-reading.testkit.js';
import { renderLocalDossier } from './dossier-site.js';

// syzygy-5dhm.116 (REQ-polaris-generation-034 version 2.50): the cliffs reference page and its machine member. Inputs are built here;
// every expected string and count is a literal written from the requirement's words before the renderer ran.

const REV = 'c'.repeat(40);
const BLOB = 'b'.repeat(40);
const POLICY = { policyId: 'POLARIS-DOSSIER-SCREENING-POLICY', policyVersion: '2.0.0', sha256: 'a'.repeat(64) };
const PAGE = 'reference/cliffs.html';

const derived: LocalDerivedStructure = {
  state: 'derived', revision: REV, recordRevision: REV, capturedAt: '2026-11-22T09:30:00.000Z', recordText: '{}\n', sha256: 'd'.repeat(64), currencyPolicy: null, unitsNotListed: 0,
  facts: [{ id: '_tree-root', fact: 'tree-root', rule: 'top-level-unit', ruleVersion: 1, epistemic: 'observed', unknownReason: null, path: '.', count: 1, to: null }],
  tree: { files: 1, rootFiles: 1, unitsListed: 0, unitFiles: 0, unitsNotListed: 0, secretPathsLeftOut: 0, submodules: 0 }, countsMatch: true,
};
const MEMBER: LocalLimitsAndDefaults = {
  format: 'polaris-dossier-limits-and-defaults/1', state: 'derived', screeningPolicy: POLICY, unitRule: { rule: 'top-level-unit', ruleVersion: 1 },
  recognizer: {
    rule: 'limit-default', ruleVersion: 1, candidates: 4, secretPathsLeftOut: 0, setApart: 0, observed: 2, unknown: 2, valuesLeftOut: 0, sequenceItemsNotRead: 3, rows: 3,
    files: [
      { path: 'setup.py', source: 'code', epistemic: 'observed', unknownReason: null, parseFault: null, rows: 2, valuesLeftOut: 0 },
      { path: 'chart/values.yaml', source: 'config', epistemic: 'observed', unknownReason: null, parseFault: null, rows: 1, valuesLeftOut: 0 },
      { path: 'redis.conf', source: 'config', epistemic: 'unknown', unknownReason: 'unknown-extraction-class', parseFault: null, rows: null, valuesLeftOut: null },
      { path: 'web/open.yaml', source: 'config', epistemic: 'unknown', unknownReason: 'unparsed', parseFault: 'outside-grammar', rows: null, valuesLeftOut: null },
    ],
    filesNotListed: 0,
  },
  units: [
    { unit: null, files: 1, constants: 2, entries: 0, valuesUnknown: 1 },
    { unit: 'chart', files: 1, constants: 0, entries: 1, valuesUnknown: 0 },
  ],
  unitsNotListed: 0,
  rows: [
    { id: '_limit-1', source: 'config', kind: 'entry', name: 'service.port', value: '8080', valueType: 'integer', path: 'chart/values.yaml', line: 3, unit: 'chart', blob: BLOB, quote: 'port: 8080', epistemic: 'observed', unknownReason: null },
    { id: '_limit-2', source: 'code', kind: 'max', name: 'MAX_NAME', value: '"<a>"', valueType: 'string', path: 'setup.py', line: 1, unit: null, blob: BLOB, quote: 'MAX_NAME = "<a>"', epistemic: 'observed', unknownReason: null },
    { id: '_limit-3', source: 'code', kind: 'timeout', name: 'READ_TIMEOUT', value: null, valueType: null, path: 'setup.py', line: 2, unit: null, blob: BLOB, quote: 'READ_TIMEOUT = compute()', epistemic: 'unknown', unknownReason: 'value-not-literal' },
  ],
  rowsNotListed: 0,
};
const site = (limitsAndDefaults: LocalLimitsAndDefaults | undefined, structure: LocalDerivedStructure | null = derived) => {
  const input = readingInput();
  return renderLocalDossier({ ...input, local: { ...input.local, ...(structure === null ? {} : { derivedStructure: structure }), ...(limitsAndDefaults === undefined ? {} : { limitsAndDefaults }) } }).files;
};

describe('the cliffs reference page (version 2.50)', () => {
  it('renders a per-unit table, every listed row with its value, type, quoted line and evidence, and the Unknown files', () => {
    const page = site(MEMBER).get(PAGE)!;
    expect(page).toContain('<section id="cliffs" data-reading-level="1" data-topics=""><h1>Cliffs</h1>');
    expect(page).toContain('<caption>Limits and defaults per unit, as counts of what the rule read: 2 units with a file read</caption>');
    expect(page).toContain('<tr><th scope="col">Unit</th><th scope="col">Files read</th><th scope="col">Constants</th><th scope="col">Configuration entries</th><th scope="col">Values Unknown</th></tr>');
    expect(page).toContain('<tr data-cliffs-unit="." data-epistemic="observed"><th scope="row">Repository root</th><td>1</td><td>2</td><td>0</td><td>1</td></tr>');
    expect(page).toContain('<tr data-cliffs-unit="chart" data-epistemic="observed"><th scope="row">chart/</th><td>1</td><td>0</td><td>1</td><td>0</td></tr>');
    expect(page).toContain('<li data-limit-id="_limit-2" data-epistemic="observed" data-limit-kind="max" data-limit-path="setup.py" data-limit-line="1" data-limit-value-type="string">'
      + 'MAX_NAME, a maximum constant, in setup.py at line 1: set to &quot;&lt;a&gt;&quot; (string). <q>MAX_NAME = &quot;&lt;a&gt;&quot;</q> <span class="derived-mark">Derived by Syzygy</span>'
      + `<span class="visually-hidden ev"> Evidence: label Observed; line 1 of setup.py, blob ${BLOB}, quoted exactly but for its leading and trailing spaces and tabs; the value as written, not evaluated; read by Syzygy by rule limit-default version 1 at revision ${REV}.</span></li>`);
    expect(page).not.toContain('<a>');
    expect(page).toContain('or that starts DEFAULT_ after any leading underscores, read from its one line in code only, wherever it stands (a keyword argument in a call and a macro a preprocessor condition disables among them)');
    expect(page).toContain('JSON, TOML and environment-file configuration, command-line flag defaults and values computed at run time are not read by this version, so a limit set only there is not on this page.');
    expect(page).toContain('service.port, a configuration entry, in chart/values.yaml at line 3: set to 8080 (integer). <q>port: 8080</q>');
    expect(page).toContain('<li data-limit-id="_limit-3" data-epistemic="unknown" data-limit-kind="timeout" data-limit-path="setup.py" data-limit-line="2" data-unknown-reason="mapping-coverage-absent">'
      + 'READ_TIMEOUT, a timeout constant, in setup.py at line 2: <q>READ_TIMEOUT = compute()</q> <span class="not-established">Not established.</span> What READ_TIMEOUT is set to is Unknown: no value form of rule limit-default version 1 reads what this line writes, and Syzygy evaluates nothing.</li>');
    // The root's rows come before chart's.
    expect(page.indexOf('_limit-2')).toBeLessThan(page.indexOf('_limit-1'));
    expect(page).toContain('<li data-epistemic="unknown" data-unknown-reason="excluded-content" data-cliffs-path="redis.conf" data-cliffs-file-reason="unknown-extraction-class"><span class="not-established">Not established.</span> redis.conf: which limits and defaults it sets is Unknown (unknown-extraction-class).</li>');
    expect(page).toContain('<li data-epistemic="unknown" data-unknown-reason="mapping-coverage-absent" data-cliffs-path="web/open.yaml" data-cliffs-file-reason="unparsed, outside-grammar">');
    expect(page).toContain('limit-default: 4 candidate files; 2 read, 2 Unknown with no rows taken; 0 left out and not named, because a secret detector matches their path; 0 set apart as vendored or generated paths; 0 rows left out because the value checks refuse its line; 3 sequence items not read; 3 rows.');
    expect(page).toContain('<p class="cliffs-floor" data-epistemic="unknown" data-unknown-reason="mapping-coverage-absent"><span class="not-established">Not established.</span> What 2 candidate files that were not read set is counted in no row, so each count is of the files read and never a total: a unit with no row may hold limits.</p>');
    expect(page).toContain('never that a limit is reached, enforced or right');
    expect(page).toContain('Show the evidence view');
    expect(page).not.toContain('<script');
    expect(page).not.toContain('href="https://');
    expect(page).not.toContain('href="setup.py');
  });

  it('links the page from the contents page and names the member in the machine view', () => {
    const files = site(MEMBER);
    expect(files.get('contents.html')).toContain(`<li><a href="sources/index.html">Sources</a></li><li><a href="${PAGE}">Cliffs</a></li>`);
    const machine = JSON.parse(files.get('machine.json')!) as { limitsAndDefaults: { page: string; state: string; rows: unknown[] } };
    expect([machine.limitsAndDefaults.page, machine.limitsAndDefaults.state, machine.limitsAndDefaults.rows.length]).toEqual([PAGE, 'derived', 3]);
  });

  it('follows the docs-and-code page when that is published', () => {
    const input = readingInput();
    const docsAndCode = { format: 'polaris-dossier-docs-and-code/1', state: 'unknown', why: 'the pinned tree could not be listed (corrupt-object)' } as const;
    const files = renderLocalDossier({ ...input, local: { ...input.local, derivedStructure: derived, docsAndCode, limitsAndDefaults: MEMBER } }).files;
    expect(files.get('contents.html')).toContain('<li><a href="reference/docs-and-code.html">Docs and code</a></li><li><a href="reference/cliffs.html">Cliffs</a></li>');
  });

  it('says counts are never a total when files are left out for a secret path and none is Unknown', () => {
    if (MEMBER.state !== 'derived') throw new Error('fixture');
    const page = site({ ...MEMBER, recognizer: { ...MEMBER.recognizer, unknown: 0, secretPathsLeftOut: 1, files: MEMBER.recognizer.files.filter(f => f.epistemic !== 'unknown') } }).get(PAGE)!;
    expect(page).toContain('What 1 candidate file that was not read sets is counted in no row');
    expect(page).toContain('<li>Every candidate file not left out or set apart was read.</li>');
  });

  it('renders a row the member marks Unknown as Not established, whatever value it carries', () => {
    const page = site({ ...MEMBER, rows: [{ ...MEMBER.rows[2]!, value: '5', valueType: 'integer' }] }).get(PAGE)!;
    expect(page).toContain('What READ_TIMEOUT is set to is Unknown');
    expect(page).not.toContain('set to 5 (integer)');
  });

  it('gives a withheld class its own reason, and counts the Unknown files it does not list', () => {
    if (MEMBER.state !== 'derived') throw new Error('fixture');
    const withheld = { path: 'deploy/values.yaml', source: 'config', epistemic: 'unknown', unknownReason: 'class-not-consented', parseFault: null, rows: null, valuesLeftOut: null } as const;
    const page = site({ ...MEMBER, recognizer: { ...MEMBER.recognizer, unknown: 5, files: [...MEMBER.recognizer.files, withheld], filesNotListed: 2 } }).get(PAGE)!;
    expect(page).toContain('<li data-epistemic="unknown" data-unknown-reason="unconsented-source-or-provider" data-cliffs-path="deploy/values.yaml" data-cliffs-file-reason="class-not-consented">');
    expect(page).toContain('<li>2 more files whose limits are Unknown are counted and not listed.</li>');
  });

  it('refuses a file reason or a kind this version does not name', () => {
    if (MEMBER.state !== 'derived') throw new Error('fixture');
    const badFile = { ...MEMBER, recognizer: { ...MEMBER.recognizer, files: [{ ...MEMBER.recognizer.files[2]!, unknownReason: 'guessed' }] } };
    expect(() => site(badFile)).toThrow('cliffs: a file reason this version does not name');
    expect(() => site({ ...MEMBER, rows: [{ ...MEMBER.rows[0]!, kind: 'minimum' }] })).toThrow('cliffs: a kind this version does not name');
    expect(() => site({ ...MEMBER, rows: [{ ...MEMBER.rows[2]!, unknownReason: 'guessed' }] })).toThrow('cliffs: a row reason this version does not name');
  });

  it('states the member Unknown in words when the tree could not be listed', () => {
    const page = site({ format: 'polaris-dossier-limits-and-defaults/1', state: 'unknown', why: 'the pinned tree could not be listed (corrupt-object)' }).get(PAGE)!;
    expect(page).toContain(`<p class="derived-unknown" data-epistemic="unknown" data-unknown-reason="source-uncaptured-or-unreachable"><span class="not-established">Not established.</span> Which limits and defaults the files at revision ${REV} set is Unknown at this render: the pinned tree could not be listed.</p>`);
  });

  it('renders no page, link or member without the limits member or a derived record, keeping those sites\' bytes', () => {
    const before = site(undefined);
    for (const files of [before, site(MEMBER, null)]) {
      expect(files.has(PAGE)).toBe(false);
      for (const [, text] of files) { expect(text).not.toContain('cliffs'); expect(text).not.toContain('limitsAndDefaults'); }
    }
    expect([...site(undefined)]).toEqual([...before]);
  });
});
