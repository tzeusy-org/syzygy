import type { LocalLimitRow, LocalLimitsAndDefaults, LocalLimitsFile } from '@syzygy/polaris-generation-core/live';
import { escapeHtml as escape } from './draft-preview.js';

/** The cliffs reference page (REQ-polaris-generation-034 version 2.50, syzygy-5dhm.116, pursuit move R23 slice 1): every named limit
 * constant and every configuration entry recognizer `limit-default` v1 read in the admitted files of the pinned tree, a table of them per
 * unit, and each listed row with its value as written, its type and its quoted line. A row says what a file sets, never that a limit is
 * reached, enforced or right; nothing is evaluated. A row whose value no form takes is Unknown, and so is a file not read. Every row
 * carries its label and evidence in the DOM text. No value or quote is a link. Pure; no script. */

export const CLIFFS_PAGE = { path: 'reference/cliffs.html', title: 'Cliffs' } as const;

/** The page's legend: the same view switch as a map page's, so a sighted reader can open the evidence view. */
export const CLIFFS_LEGEND = '<aside class="reading-legend" aria-label="How to read this page"><p class="view-switch"><a href="#evidence-view">Show the evidence view</a> · <a href="#content">Back to the reading view</a></p><span id="evidence-view"></span><ul>'
  + '<li><span class="derived-mark">Derived by Syzygy</span> marks a limit or default Syzygy read in a file; the evidence view shows its label, Observed, and the file, line and blob it comes from.</li>'
  + '<li><span class="not-established">Not established.</span> introduces an Unknown statement, whose reason follows in words.</li>'
  + '</ul></aside>';

const counted = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;
const unitWords = (unit: string | null): string => (unit === null ? 'Repository root' : `${unit}/`);

/** RFC2-24's reason for each file `unknownReason`, as the rough-edges page gives it; a reason this version does not name refuses the page. */
const FILE_REASON: Readonly<Record<string, string>> = {
  'denied-path': 'excluded-content', 'unknown-extraction-class': 'excluded-content', 'not-utf8-text': 'excluded-content', 'secret-detector-match': 'excluded-content',
  'active-content': 'excluded-content', 'redacted-body': 'excluded-content', 'class-not-consented': 'unconsented-source-or-provider',
  'object-read-refused': 'source-uncaptured-or-unreachable', 'path-not-citable': 'mapping-coverage-absent', 'symbolic-link': 'mapping-coverage-absent',
  'over-read-limit': 'mapping-coverage-absent', 'too-large': 'mapping-coverage-absent', unparsed: 'mapping-coverage-absent',
};
function fileReasonOf(file: LocalLimitsFile): string {
  const key = file.unknownReason ?? '';
  if (!Object.hasOwn(FILE_REASON, key)) throw new Error('cliffs: a file reason this version does not name');
  return FILE_REASON[key]!;
}

/** Syzygy's words for what a row is: a constant by its kind, or a configuration entry. */
const KIND_WORDS: Readonly<Record<string, string>> = { timeout: 'a timeout constant', threshold: 'a threshold constant', limit: 'a limit constant', max: 'a maximum constant', default: 'a default constant', entry: 'a configuration entry' };
function kindWords(row: LocalLimitRow): string {
  if (!Object.hasOwn(KIND_WORDS, row.kind)) throw new Error('cliffs: a kind this version does not name');
  return KIND_WORDS[row.kind]!;
}

function rowEntry(row: LocalLimitRow, revision: string): string {
  const attrs = `data-limit-id="${escape(row.id)}" data-epistemic="${row.epistemic}" data-limit-kind="${escape(row.kind)}" data-limit-path="${escape(row.path)}" data-limit-line="${row.line}"`;
  const where = `${row.name}, ${kindWords(row)}, in ${row.path} at line ${row.line}:`;
  if (row.epistemic === 'unknown' || row.value === null || row.valueType === null) {
    if (row.unknownReason !== 'value-not-literal') throw new Error('cliffs: a row reason this version does not name');
    return `<li ${attrs} data-unknown-reason="mapping-coverage-absent">${escape(where)} <q>${escape(row.quote)}</q> <span class="not-established">Not established.</span> `
      + `${escape(`What ${row.name} is set to is Unknown: no value form of rule limit-default version 1 reads what this line writes, and Syzygy evaluates nothing.`)}</li>`;
  }
  return `<li ${attrs} data-limit-value-type="${escape(row.valueType)}">${escape(`${where} set to ${row.value} (${row.valueType}).`)} <q>${escape(row.quote)}</q> <span class="derived-mark">Derived by Syzygy</span>`
    + `<span class="visually-hidden ev"> ${escape(`Evidence: label Observed; line ${row.line} of ${row.path}, blob ${row.blob}, quoted exactly but for its leading and trailing spaces and tabs; the value as written, not evaluated; read by Syzygy by rule limit-default version 1 at revision ${revision}.`)}</span></li>`;
}

/** Listed rows grouped by unit, the root first and then the directories in code-unit order. */
function byUnit(rows: readonly LocalLimitRow[], revision: string): string {
  const groups = new Map<string | null, LocalLimitRow[]>();
  for (const row of rows) groups.set(row.unit, [...(groups.get(row.unit) ?? []), row]);
  const units = [...groups.keys()].sort((a, b) => (a === null ? -1 : b === null ? 1 : a < b ? -1 : a > b ? 1 : 0));
  return units.map(unit => `<h3 style="overflow-wrap:anywhere">${escape(unitWords(unit))}</h3><ul class="cliffs" style="overflow-wrap:anywhere">${groups.get(unit)!.map(row => rowEntry(row, revision)).join('')}</ul>`).join('');
}

/** The page's main content: its section, from the member and the revision of the derived record the render holds. */
export function cliffsPage(member: LocalLimitsAndDefaults, revision: string): string {
  const open = `<section id="cliffs" data-reading-level="1" data-topics=""><h1>${CLIFFS_PAGE.title}</h1>`;
  if (member.state !== 'derived') {
    return `${open}<p class="derived-unknown" data-epistemic="unknown" data-unknown-reason="source-uncaptured-or-unreachable"><span class="not-established">Not established.</span> ${escape(`Which limits and defaults the files at revision ${revision} set is Unknown at this render: the pinned tree could not be listed.`)}</p></section>`;
  }
  const r = member.recognizer;
  const note = `<p class="map-note">${escape(`Computed by Syzygy at this render from the Python, JavaScript, TypeScript, Go, Java, C and C++ source files and the ini-form and yaml-form configuration files of the tree at revision ${revision} that the bound screening policy ${member.screeningPolicy.policyId} ${member.screeningPolicy.policyVersion} admits, read by rule ${r.rule} version ${r.ruleVersion}. `
    + 'A constant is a definition whose upper-case name has a word starting MAX, LIMIT, THRESHOLD or TIMEOUT, or that starts DEFAULT_ after any leading underscores, read from its one line in code only, wherever it stands (a keyword argument in a call and a macro a preprocessor condition disables among them): never in a comment or a string. A configuration entry is a key the file sets; an ini value continued on an indented line is Unknown, and commented-out entries, sequence items and what lies under them are not read. '
    + 'Each value is shown as written and never evaluated, and each line is quoted from the file. A row says what a file sets, never that a limit is reached, enforced or right; a value the rule cannot read whole is Unknown. '
    + 'JSON, TOML and environment-file configuration, command-line flag defaults and values computed at run time are not read by this version, so a limit set only there is not on this page. '
    + `Each row sits under the unit its path begins with, by rule ${member.unitRule.rule} version ${member.unitRule.ruleVersion}: a top-level directory, or the repository root.`)}</p>`;
  const clauses = [
    `${r.rule}: ${counted(r.candidates, 'candidate file', 'candidate files')}; ${r.observed} read, ${r.unknown} Unknown with no rows taken; ${r.secretPathsLeftOut} left out and not named, because a secret detector matches their path; ${r.setApart} set apart as vendored or generated paths; ${counted(r.valuesLeftOut, 'row', 'rows')} left out because the value checks refuse its line; ${counted(r.sequenceItemsNotRead, 'sequence item', 'sequence items')} not read; ${counted(r.rows, 'row', 'rows')}.`,
    ...(r.filesNotListed === 0 ? [] : [`${counted(r.filesNotListed, 'file', 'files')} counted and not listed.`]),
  ];
  const coverage = `<p class="map-coverage" data-epistemic="observed">${escape(clauses.join(' '))}</p>`;

  const head = '<tr><th scope="col">Unit</th><th scope="col">Files read</th><th scope="col">Constants</th><th scope="col">Configuration entries</th><th scope="col">Values Unknown</th></tr>';
  const rows = member.units.map(u => `<tr data-cliffs-unit="${escape(u.unit ?? '.')}" data-epistemic="observed"><th scope="row">${escape(unitWords(u.unit))}</th><td>${u.files}</td><td>${u.constants}</td><td>${u.entries}</td><td>${u.valuesUnknown}</td></tr>`).join('');
  const table = member.units.length === 0
    ? '<p>No file was read for limits and defaults, so no unit has a row.</p>'
    : `<div class="table-scroll"><table class="cliffs-units"><caption>${escape(`Limits and defaults per unit, as counts of what the rule read: ${counted(member.units.length, 'unit', 'units')} with a file read`)}${member.unitsNotListed === 0 ? '' : escape(`; ${counted(member.unitsNotListed, 'more unit', 'more units')} counted and not listed`)}</caption><thead>${head}</thead><tbody>${rows}</tbody></table></div>`;
  // The table counts only files read, so the Unknown files and the files left out for a secret path are named beside it as missing from
  // every row, never as zero.
  const unread = r.unknown + r.secretPathsLeftOut;
  const floor = unread === 0 ? ''
    : `<p class="cliffs-floor" data-epistemic="unknown" data-unknown-reason="mapping-coverage-absent"><span class="not-established">Not established.</span> ${escape(`What ${counted(unread, 'candidate file that was not read sets', 'candidate files that were not read set')} is counted in no row, so each count is of the files read and never a total: a unit with no row may hold limits.`)}</p>`;

  const notListed = member.rowsNotListed === 0 ? '' : `<p>${escape(`${counted(member.rowsNotListed, 'more row is', 'more rows are')} counted in the table and not listed.`)}</p>`;
  const every = `<h2>Limits and defaults, by unit</h2>${member.rows.length === 0 ? '<p>No row is listed.</p>' : byUnit(member.rows, revision)}${notListed}`;

  const unknownFiles = r.files.filter(file => file.epistemic === 'unknown');
  const word = (file: LocalLimitsFile): string => `${file.unknownReason ?? ''}${file.parseFault === null ? '' : `, ${file.parseFault}`}`;
  const unknownNotListed = r.unknown - unknownFiles.length;
  const unknownItems = unknownFiles.map(file => `<li data-epistemic="unknown" data-unknown-reason="${fileReasonOf(file)}" data-cliffs-path="${escape(file.path)}" data-cliffs-file-reason="${escape(word(file))}"><span class="not-established">Not established.</span> ${escape(`${file.path}: which limits and defaults it sets is Unknown (${word(file)}).`)}</li>`).join('')
    + (unknownNotListed === 0 ? '' : `<li>${escape(`${counted(unknownNotListed, 'more file whose limits are Unknown is', 'more files whose limits are Unknown are')} counted and not listed.`)}</li>`);
  const unknown = `<h2>Files whose limits are Unknown</h2><ul class="cliffs-unknown" style="overflow-wrap:anywhere">${unknownItems === '' ? `<li>${r.candidates === 0 ? 'No candidate file.' : 'Every candidate file not left out or set apart was read.'}</li>` : unknownItems}</ul>`;

  return `${open}${note}${coverage}<h2>Per unit</h2>${table}${floor}${every}${unknown}</section>`;
}

/** `machine.json`'s `limitsAndDefaults` member: the page and the member as the render derived it. */
export const cliffsMachine = (member: LocalLimitsAndDefaults): unknown => ({ page: CLIFFS_PAGE.path, ...member });
