import type { LocalDocRow, LocalDocsAndCode, LocalDocsFile } from '@syzygy/polaris-generation-core/live';
import { escapeHtml as escape } from './draft-preview.js';

/** The docs-and-code reference page (REQ-polaris-generation-034 version 2.48, syzygy-5dhm.119, pursuit move R24 slice 1): every path and
 * identifier recognizer `doc-reference` v1 read in the admitted Markdown documents of the pinned tree, each `resolves`, `document only`
 * or Unknown, with the rules that decided it. A row says what the tree holds, never that a document is wrong; no stated value is
 * compared, so no row is `agrees`. Every row carries its label and evidence in the DOM text. No value or quote is a link. Pure; no
 * script. */

export const DOCS_AND_CODE_PAGE = { path: 'reference/docs-and-code.html', title: 'Docs and code' } as const;

/** The page's legend: the same view switch as a map page's, so a sighted reader can open the evidence view. */
export const DOCS_AND_CODE_LEGEND = '<aside class="reading-legend" aria-label="How to read this page"><p class="view-switch"><a href="#evidence-view">Show the evidence view</a> · <a href="#content">Back to the reading view</a></p><span id="evidence-view"></span><ul>'
  + '<li><span class="derived-mark">Derived by Syzygy</span> marks a row Syzygy resolved against the pinned tree; the evidence view shows its label, Observed, and what the tree holds.</li>'
  + '<li><span class="not-established">Not established.</span> introduces an Unknown statement, whose reason follows in words.</li>'
  + '</ul></aside>';

const counted = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** RFC2-24's reason for each file `unknownReason`, as the rough-edges page gives it; a reason this version does not name refuses the page. */
const FILE_REASON: Readonly<Record<string, string>> = {
  'denied-path': 'excluded-content', 'unknown-extraction-class': 'excluded-content', 'not-utf8-text': 'excluded-content', 'secret-detector-match': 'excluded-content',
  'active-content': 'excluded-content', 'redacted-body': 'excluded-content', 'class-not-consented': 'unconsented-source-or-provider',
  'object-read-refused': 'source-uncaptured-or-unreachable', 'path-not-citable': 'mapping-coverage-absent', 'symbolic-link': 'mapping-coverage-absent',
  'over-read-limit': 'mapping-coverage-absent', 'too-large': 'mapping-coverage-absent', unparsed: 'mapping-coverage-absent',
};
/** Each row `unknownReason`: its RFC2-24 reason and Syzygy's words for it. */
const ROW_REASON: Readonly<Record<string, { readonly reason: string; readonly words: string }>> = {
  'ambiguous-form': { reason: 'mapping-coverage-absent', words: 'its form is as often a name in prose as a path, and the tree lists no file or directory it names' },
  'outside-tree': { reason: 'source-uncaptured-or-unreachable', words: 'it climbs above the repository root, outside the tree' },
  submodule: { reason: 'source-uncaptured-or-unreachable', words: 'it lies in a submodule, whose tree is not in the clone' },
  'build-output-path': { reason: 'source-uncaptured-or-unreachable', words: 'it is a vendored or generated path, which a build or an install may make and the tree need not hold' },
  'code-not-fully-read': { reason: 'mapping-coverage-absent', words: 'no code file read holds it, and not every code file the rule searches was read' },
};
function lookup<T>(table: Readonly<Record<string, T>>, key: string | null, what: string): T {
  if (key === null || !Object.hasOwn(table, key)) throw new Error(`docs and code: a ${what} this version does not name`);
  return table[key]!;
}

const formWords = (row: LocalDocRow): string => `${row.form === 'path' ? 'Path' : 'Identifier'} ${row.value}, ${row.written === 'link' ? 'a link' : 'a code span'} in ${row.document} at line ${row.line}:`;

function rowEntry(row: LocalDocRow, revision: string): string {
  const open = `<li data-doc-row-id="${escape(row.id)}" data-epistemic="${row.epistemic}" data-doc-outcome="${escape(row.outcome)}" data-doc-path="${escape(row.document)}" data-doc-line="${row.line}"`;
  const head = `${escape(formWords(row))} <q>${escape(row.quote)}</q>${row.quoteExcerpt ? ` ${escape('(an exact excerpt of the line)')}` : ''}`;
  if (row.outcome === 'unknown') {
    const why = lookup(ROW_REASON, row.unknownReason, 'row reason');
    return `${open} data-unknown-reason="${why.reason}">${head} <span class="not-established">Not established.</span> ${escape(`Whether the tree holds what it names is Unknown: ${why.words}.`)}</li>`;
  }
  const r = row.resolution;
  const held = row.outcome === 'document-only'
    ? (row.form === 'path' ? 'the pinned tree lists no file or directory at the path it names' : 'no code file the rule searches holds that name as an identifier token, and every one was read')
    : r === null ? '' : r.entry === 'identifier'
      ? `the identifier token occurs in ${r.searched === 'code-text' ? 'the code text (comments and strings blanked)' : 'the file text'} of ${r.path} at line ${r.line}, blob ${r.blob}`
      : `the pinned tree lists a ${r.entry} at ${r.path}`;
  const outcome = row.outcome === 'document-only' ? 'Document only' : 'Resolves';
  return `${open}>${head} ${escape(`${outcome}.`)} <span class="derived-mark">Derived by Syzygy</span>`
    + `<span class="visually-hidden ev"> ${escape(`Evidence: label Observed; ${held}; read by Syzygy by rule doc-reference version 1 at revision ${revision}.`)}</span></li>`;
}

/** Rows grouped by document, in the member's order. A path or value has no space to break at, so each list wraps anywhere: the page fits
 * 390 CSS pixels. */
function byDocument(rows: readonly LocalDocRow[], revision: string): string {
  const groups = new Map<string, LocalDocRow[]>();
  for (const row of rows) groups.set(row.document, [...(groups.get(row.document) ?? []), row]);
  return [...groups].map(([document, list]) => `<h3 style="overflow-wrap:anywhere">${escape(document)}</h3><ul class="docs-and-code" style="overflow-wrap:anywhere">${list.map(row => rowEntry(row, revision)).join('')}</ul>`).join('');
}

const fileWord = (file: LocalDocsFile): string => `${file.unknownReason ?? ''}${file.parseFault === null ? '' : `, ${file.parseFault}`}`;
function unknownFiles(files: readonly LocalDocsFile[], total: number, what: string): string {
  const listed = files.filter(file => file.epistemic === 'unknown');
  const items = listed.map(file => `<li data-epistemic="unknown" data-unknown-reason="${lookup(FILE_REASON, file.unknownReason, 'file reason')}" data-docs-path="${escape(file.path)}" data-docs-file-reason="${escape(fileWord(file))}"><span class="not-established">Not established.</span> ${escape(`${file.path}: what it ${what} is Unknown (${fileWord(file)}).`)}</li>`).join('');
  const more = total - listed.length;
  return items + (more === 0 ? '' : `<li>${escape(`${counted(more, 'more such file is', 'more such files are')} counted and not listed.`)}</li>`);
}

/** The page's main content: its section, from the member and the revision of the derived record the render holds. */
export function docsAndCodePage(member: LocalDocsAndCode, revision: string): string {
  const open = `<section id="docs-and-code" data-reading-level="1" data-topics=""><h1>${DOCS_AND_CODE_PAGE.title}</h1>`;
  if (member.state !== 'derived') {
    return `${open}<p class="derived-unknown" data-epistemic="unknown" data-unknown-reason="source-uncaptured-or-unreachable"><span class="not-established">Not established.</span> ${escape(`Which paths and identifiers the documents at revision ${revision} name, and what the tree holds of them, is Unknown at this render: the pinned tree could not be listed.`)}</p></section>`;
  }
  const d = member.documents, c = member.code;
  const note = `<p class="map-note">${escape(`Computed by Syzygy at this render from the Markdown documents of the tree at revision ${revision} that the bound screening policy ${member.screeningPolicy.policyId} ${member.screeningPolicy.policyVersion} admits, read by rule ${member.rule.rule} version ${member.rule.ruleVersion}. `
    + 'It reads the content of each inline code span and the destination of each inline link outside fenced code, nothing else. A span is a path when it is slash-joined segments, a bare name with a listed extension, or a dotfile; an identifier when it is names joined by a dot or :: carrying an underscore, a capital after a lowercase letter, a separator or (). '
    + 'A path resolves when the tree lists a file or a directory at it, from the repository root or the document\'s directory (a link from the document\'s directory only), or, for a code span not starting ./ or ../, where a listed path ends with it after a slash, so a bare name resolves by a file name; otherwise it is document only. '
    + 'An identifier resolves when its last name occurs as an identifier token in a code file read, in the code text with comments and strings blanked for Python, JavaScript, TypeScript, Go and Java and in the whole text otherwise; it is document only only when every code file the rule searches was read. '
    + 'A row says what the tree holds, never that a document is wrong; no stated value is compared, so no row agrees or disagrees, and code that no document names is not listed at this version.')}</p>`;
  const coverage = `<p class="map-coverage" data-epistemic="observed">${escape([
    `Documents: ${counted(d.candidates, 'candidate', 'candidates')}; ${d.observed} read, ${d.unknown} Unknown; ${d.secretPathsLeftOut} left out and not named, because a secret detector matches their path; ${d.setApart} set apart as vendored or generated paths; ${counted(d.spansNotChecked, 'code span', 'code spans')} and ${counted(d.linksNotChecked, 'link', 'links')} of a form the rule does not read; ${counted(d.valuesLeftOut, 'row', 'rows')} left out because the value checks refuse it.`,
    c.read
      ? `Code files searched for identifiers: ${counted(c.candidates, 'candidate', 'candidates')}; ${c.observed} read, ${c.unknown} Unknown; ${c.secretPathsLeftOut} left out and not named; ${c.setApart} set apart and not searched.`
      : `No row is an identifier, so no code file was read (${counted(c.candidates, 'candidate', 'candidates')}).`,
  ].join(' '))}</p>`;

  const k = member.counts;
  const classes = `<div class="table-scroll"><table class="docs-and-code-classes"><caption>Rows by class</caption><thead><tr><th scope="col">Class</th><th scope="col">Rows</th></tr></thead><tbody>`
    + `<tr data-epistemic="observed"><th scope="row">Resolves</th><td>${k.resolves}</td></tr><tr data-epistemic="observed"><th scope="row">Document only</th><td>${k.documentOnly}</td></tr>`
    + `<tr data-epistemic="unknown"><th scope="row">Unknown</th><td>${k.unknown}</td></tr></tbody></table></div>`;
  const read = d.files.filter(file => file.epistemic === 'observed');
  const perDoc = read.length === 0 ? '<p>No document was read, so no document has a row.</p>'
    : `<div class="table-scroll"><table class="docs-and-code-documents"><caption>${escape(`Rows per document read: ${counted(read.length, 'document', 'documents')} listed`)}</caption><thead><tr><th scope="col">Document</th><th scope="col">Resolves</th><th scope="col">Document only</th><th scope="col">Unknown</th></tr></thead><tbody>`
      + read.map(file => `<tr data-docs-document="${escape(file.path)}" data-epistemic="observed"><th scope="row">${escape(file.path)}</th><td>${file.resolves ?? 0}</td><td>${file.documentOnly ?? 0}</td><td>${file.unknown ?? 0}</td></tr>`).join('')
      + '</tbody></table></div>';
  const unread = d.unknown + d.secretPathsLeftOut;
  const floor = unread === 0 ? ''
    : `<p class="docs-and-code-floor" data-epistemic="unknown" data-unknown-reason="mapping-coverage-absent"><span class="not-established">Not established.</span> ${escape(`What ${counted(unread, 'document that was not read names', 'documents that were not read name')} is in no row, so each count is of the documents read and never a total.`)}</p>`;

  const section = (outcome: LocalDocRow['outcome'], heading: string, none: string): string => {
    const rows = member.rows.filter(row => row.outcome === outcome);
    return `<h2>${heading}</h2>${rows.length === 0 ? `<p>${none}</p>` : byDocument(rows, revision)}`;
  };
  const notListed = member.rowsNotListed === 0 ? '' : `<p>${escape(`${counted(member.rowsNotListed, 'more row is', 'more rows are')} counted in the table and not listed.`)}</p>`;
  const files = `<h2>Files not read</h2><ul class="docs-and-code-unknown" style="overflow-wrap:anywhere">${(unknownFiles(d.files, d.unknown, 'names') + (c.read ? unknownFiles(c.files, c.unknown, 'holds') : '')) || '<li>Every candidate not left out or set apart was read.</li>'}</ul>`;

  return `${open}${note}${coverage}${classes}<h2>Per document</h2>${perDoc}${floor}`
    + `${section('document-only', 'Document only', 'No listed row is document only.')}${section('unknown', 'Unknown', 'No listed row is Unknown.')}${section('resolves', 'Resolves', 'No listed row resolves.')}${notListed}${files}</section>`;
}

/** `machine.json`'s `docsAndCode` member: the page and the member as the render derived it. */
export const docsAndCodeMachine = (member: LocalDocsAndCode): unknown => ({ page: DOCS_AND_CODE_PAGE.path, ...member });
