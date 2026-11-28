import { describe, expect, it } from 'vitest';
import type { LocalDerivedStructure, LocalDocsAndCode } from '@syzygy/polaris-generation-core/live';
import { readingInput } from './dossier-reading.testkit.js';
import { renderLocalDossier } from './dossier-site.js';

// syzygy-5dhm.119 (REQ-polaris-generation-034 version 2.48): the docs-and-code reference page and its machine member. Inputs are built here;
// every expected string and count is a literal written from the requirement's words before the renderer ran.

const REV = 'c'.repeat(40);
const BLOB = 'b'.repeat(40);
const POLICY = { policyId: 'POLARIS-DOSSIER-SCREENING-POLICY', policyVersion: '2.0.0', sha256: 'a'.repeat(64) };
const PAGE = 'reference/docs-and-code.html';

const derived: LocalDerivedStructure = {
  state: 'derived', revision: REV, recordRevision: REV, capturedAt: '2026-11-22T09:30:00.000Z', recordText: '{}\n', sha256: 'd'.repeat(64), currencyPolicy: null, unitsNotListed: 0,
  facts: [{ id: '_tree-root', fact: 'tree-root', rule: 'top-level-unit', ruleVersion: 1, epistemic: 'observed', unknownReason: null, path: '.', count: 1, to: null }],
  tree: { files: 1, rootFiles: 1, unitsListed: 0, unitFiles: 0, unitsNotListed: 0, secretPathsLeftOut: 0, submodules: 0 }, countsMatch: true,
};
const row = (id: string, line: number, value: string, form: 'path' | 'identifier', outcome: 'resolves' | 'document-only' | 'unknown', unknownReason: string | null, resolution: NonNullable<LocalDocsAndCode & { state: 'derived' }>['rows'][number]['resolution']) => ({
  id, document: 'README.md', line, quote: `Use \`${value}\` <here>`, quoteExcerpt: line === 3, written: 'code-span' as const, value, form, outcome, epistemic: outcome === 'unknown' ? 'unknown' as const : 'observed' as const, unknownReason, resolution,
});
const MEMBER: LocalDocsAndCode = {
  format: 'polaris-dossier-docs-and-code/1', state: 'derived', screeningPolicy: POLICY, rule: { rule: 'doc-reference', ruleVersion: 1 },
  documents: {
    candidates: 3, secretPathsLeftOut: 0, setApart: 1, observed: 1, unknown: 1, spansNotChecked: 2, linksNotChecked: 1, valuesLeftOut: 0,
    files: [
      { path: 'README.md', epistemic: 'observed', unknownReason: null, parseFault: null, resolves: 2, documentOnly: 1, unknown: 1, valuesLeftOut: 0 },
      { path: 'docs/open.md', epistemic: 'unknown', unknownReason: 'unparsed', parseFault: 'unclosed-fence', resolves: null, documentOnly: null, unknown: null, valuesLeftOut: null },
    ],
    filesNotListed: 0,
  },
  code: { read: true, candidates: 1, secretPathsLeftOut: 0, setApart: 0, observed: 1, unknown: 0, files: [], filesNotListed: 0 },
  counts: { resolves: 2, documentOnly: 1, unknown: 1 },
  rows: [
    row('_docref-1', 1, 'src/app.py', 'path', 'resolves', null, { entry: 'file', path: 'src/app.py' }),
    row('_docref-2', 2, 'src/gone.py', 'path', 'document-only', null, null),
    row('_docref-3', 3, 'runApp()', 'identifier', 'resolves', null, { entry: 'identifier', path: 'src/app.py', line: 4, blob: BLOB, searched: 'code-text' }),
    row('_docref-4', 4, 'Node.js', 'path', 'unknown', 'ambiguous-form', null),
  ],
  rowsNotListed: 0,
};
const site = (docsAndCode: LocalDocsAndCode | undefined, structure: LocalDerivedStructure | null = derived) => {
  const input = readingInput();
  return renderLocalDossier({ ...input, local: { ...input.local, ...(structure === null ? {} : { derivedStructure: structure }), ...(docsAndCode === undefined ? {} : { docsAndCode }) } }).files;
};

describe('the docs-and-code reference page (version 2.48)', () => {
  it('renders the class counts, the per-document table, each row with its evidence, and the Unknown files', () => {
    const page = site(MEMBER).get(PAGE)!;
    expect(page).toContain('<tr data-epistemic="observed"><th scope="row">Resolves</th><td>2</td></tr><tr data-epistemic="observed"><th scope="row">Document only</th><td>1</td></tr><tr data-epistemic="unknown"><th scope="row">Unknown</th><td>1</td></tr>');
    expect(page).toContain('<tr data-docs-document="README.md" data-epistemic="observed"><th scope="row">README.md</th><td>2</td><td>1</td><td>1</td></tr>');
    expect(page).toContain('<li data-doc-row-id="_docref-2" data-epistemic="observed" data-doc-outcome="document-only" data-doc-path="README.md" data-doc-line="2">'
      + 'Path src/gone.py, a code span in README.md at line 2: <q>Use `src/gone.py` &lt;here&gt;</q> Document only. <span class="derived-mark">Derived by Syzygy</span><span class="visually-hidden ev"> '
      + `Evidence: label Observed; the pinned tree lists no file or directory at the path it names; read by Syzygy by rule doc-reference version 1 at revision ${REV}.</span></li>`);
    expect(page).not.toContain('<here>');
    expect(page).toContain(`Identifier runApp(), a code span in README.md at line 3: <q>Use \`runApp()\` &lt;here&gt;</q> (an exact excerpt of the line) Resolves. <span class="derived-mark">Derived by Syzygy</span><span class="visually-hidden ev"> Evidence: label Observed; the identifier token occurs in the code text (comments and strings blanked) of src/app.py at line 4, blob ${BLOB}; read by Syzygy by rule doc-reference version 1 at revision ${REV}.</span>`);
    expect(page).toContain('Evidence: label Observed; the pinned tree lists a file at src/app.py;');
    expect(page).toContain('<li data-doc-row-id="_docref-4" data-epistemic="unknown" data-doc-outcome="unknown" data-doc-path="README.md" data-doc-line="4" data-unknown-reason="mapping-coverage-absent">Path Node.js, a code span in README.md at line 4: <q>Use `Node.js` &lt;here&gt;</q> <span class="not-established">Not established.</span> Whether the tree holds what it names is Unknown: its form is as often a name in prose as a path, and the tree lists no file or directory it names.</li>');
    const documentOnly = page.slice(page.indexOf('<h2>Document only</h2>'), page.indexOf('<h2>Unknown</h2>'));
    expect([documentOnly.includes('_docref-2'), documentOnly.includes('_docref-1'), documentOnly.includes('_docref-4')]).toEqual([true, false, false]);
    expect(page.slice(page.indexOf('<h2>Resolves</h2>'))).toContain('_docref-3');
    expect(page).toContain('<li data-epistemic="unknown" data-unknown-reason="mapping-coverage-absent" data-docs-path="docs/open.md" data-docs-file-reason="unparsed, unclosed-fence"><span class="not-established">Not established.</span> docs/open.md: what it names is Unknown (unparsed, unclosed-fence).</li>');
    expect(page).toContain('Documents: 3 candidates; 1 read, 1 Unknown; 0 left out and not named, because a secret detector matches their path; 1 set apart as vendored or generated paths; 2 code spans and 1 link of a form the rule does not read; 0 rows left out because the value checks refuse it. Code files searched for identifiers: 1 candidate; 1 read, 0 Unknown; 0 left out and not named; 0 set apart and not searched.');
    expect(page).toContain('<span class="not-established">Not established.</span> What 1 document that was not read names is in no row, so each count is of the documents read and never a total.</p>');
    expect(page).toContain('no stated value is compared, so no row agrees or disagrees');
    expect(page).toContain('Show the evidence view');
    expect(page).not.toContain('<script');
    expect(page).not.toContain('<a href="src/');
  });

  it('links the page from the contents page after the rough-edges page, and names the member in the machine view', () => {
    const input = readingInput();
    const roughEdges = { format: 'polaris-dossier-rough-edges/1', state: 'unknown', why: 'the pinned tree could not be listed (corrupt-object)' } as const;
    const files = renderLocalDossier({ ...input, local: { ...input.local, derivedStructure: derived, roughEdges, docsAndCode: MEMBER } }).files;
    expect(files.get('contents.html')).toContain(`<li><a href="reference/rough-edges.html">Rough edges</a></li><li><a href="${PAGE}">Docs and code</a></li>`);
    expect(site(MEMBER).get('contents.html')).toContain(`<li><a href="sources/index.html">Sources</a></li><li><a href="${PAGE}">Docs and code</a></li>`);
    const machine = JSON.parse(files.get('machine.json')!) as { docsAndCode: { page: string; state: string; rows: unknown[] } };
    expect([machine.docsAndCode.page, machine.docsAndCode.state, machine.docsAndCode.rows.length]).toEqual([PAGE, 'derived', 4]);
  });

  it('says no code file was read where no row is an identifier, and refuses a reason it does not name', () => {
    if (MEMBER.state !== 'derived') throw new Error('fixture');
    const page = site({ ...MEMBER, code: { ...MEMBER.code, read: false, observed: 0 } }).get(PAGE)!;
    expect(page).toContain('No row is an identifier, so no code file was read (1 candidate).');
    const secretOnly = site({ ...MEMBER, documents: { ...MEMBER.documents, unknown: 0, secretPathsLeftOut: 1, files: [MEMBER.documents.files[0]!] } }).get(PAGE)!;
    expect(secretOnly).toContain('What 1 document that was not read names is in no row');
    expect(() => site({ ...MEMBER, rows: [{ ...MEMBER.rows[3]!, unknownReason: 'guessed' }] })).toThrow('docs and code: a row reason this version does not name');
  });

  it('words a symbolic-link Unknown and a name found only in a comment or a string (R-DOCS-AND-CODE-1 F1, F2)', () => {
    if (MEMBER.state !== 'derived') throw new Error('fixture');
    const page = site({ ...MEMBER, rows: [
      { ...MEMBER.rows[3]!, value: 'docs/guide.md', unknownReason: 'symbolic-link' },
      { ...MEMBER.rows[2]!, resolution: { entry: 'identifier', path: 'src/app.py', line: 9, blob: BLOB, searched: 'comment-or-string' } },
    ] }).get(PAGE)!;
    expect(page).toContain('data-unknown-reason="source-uncaptured-or-unreachable">Path docs/guide.md, a code span in README.md at line 4: <q>Use `Node.js` &lt;here&gt;</q> <span class="not-established">Not established.</span> Whether the tree holds what it names is Unknown: it lies at or under a symbolic link, which the rule does not follow.</li>');
    expect(page).toContain(`Evidence: label Observed; the identifier token occurs in a comment or a string, not the code text, of src/app.py at line 9, blob ${BLOB};`);
  });

  it('states the member Unknown in words when the tree could not be listed', () => {
    const page = site({ format: 'polaris-dossier-docs-and-code/1', state: 'unknown', why: 'the pinned tree could not be listed (corrupt-object)' }).get(PAGE)!;
    expect(page).toContain(`<p class="derived-unknown" data-epistemic="unknown" data-unknown-reason="source-uncaptured-or-unreachable"><span class="not-established">Not established.</span> Which paths and identifiers the documents at revision ${REV} name, and what the tree holds of them, is Unknown at this render: the pinned tree could not be listed.</p>`);
  });

  it('renders no page, link or member without the docs-and-code member or a derived record, keeping those sites\' bytes', () => {
    const before = site(undefined);
    for (const files of [before, site(MEMBER, null)]) {
      expect(files.has(PAGE)).toBe(false);
      for (const [, text] of files) expect(text).not.toContain('docs-and-code');
    }
    expect([...site(undefined)]).toEqual([...before]);
  });
});
