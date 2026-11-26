import type { LocalTestName, LocalTestNames, LocalTestNamesFile } from '@syzygy/polaris-generation-core/live';
import { escapeHtml as escape } from './draft-preview.js';

/** The test-names reference page (REQ-polaris-generation-034 version 2.35, syzygy-5dhm.45): the names four lexical recognizers read in
 * the admitted test files of the pinned tree, a table of them per unit, every listed name with its file and line, and the files whose
 * names are Unknown. Every name is Inferred and carries its label and evidence in the DOM text; the table states counts in words beside
 * its numbers. Pure; no script. */

export const TEST_NAMES_PAGE = { path: 'reference/test-names.html', title: 'Test names' } as const;

/** The four recognizers in the member's order, each with the column heading the per-unit table gives it. */
export const TEST_NAME_RULES: readonly { readonly rule: string; readonly heading: string }[] = [
  { rule: 'pytest-test-name', heading: 'pytest' },
  { rule: 'js-test-call', heading: 'JavaScript and TypeScript' },
  { rule: 'go-test-function', heading: 'Go' },
  { rule: 'junit-test-method', heading: 'JUnit' },
];

/** The page's legend: the same view switch as a map page's, so a sighted reader can open the evidence view. */
export const TEST_NAMES_LEGEND = '<aside class="reading-legend" aria-label="How to read this page"><p class="view-switch"><a href="#evidence-view">Show the evidence view</a> · <a href="#content">Back to the reading view</a></p><span id="evidence-view"></span><ul>'
  + '<li><span class="derived-mark">Derived by Syzygy</span> marks a name Syzygy read from a test file; the evidence view shows its label, Inferred, and the file and line it comes from.</li>'
  + '<li><span class="not-established">Not established.</span> introduces an Unknown statement, whose reason follows in words.</li>'
  + '</ul></aside>';

const counted = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;
const unitWords = (unit: string | null): string => (unit === null ? 'Repository root' : `${unit}/`);
const ruleWords = TEST_NAME_RULES.map(r => r.rule).join(', ').replace(/, ([^,]*)$/u, ' and $1');

/** RFC2-24's reason for each file `unknownReason`, as the manifest maps give it; a reason this version does not name refuses the page. */
const UNKNOWN_REASON: Readonly<Record<string, string>> = {
  'denied-path': 'excluded-content', 'unknown-extraction-class': 'excluded-content', 'not-utf8-text': 'excluded-content', 'secret-detector-match': 'excluded-content',
  'active-content': 'excluded-content', 'redacted-body': 'excluded-content', 'class-not-consented': 'unconsented-source-or-provider',
  'object-read-refused': 'source-uncaptured-or-unreachable', 'path-not-citable': 'mapping-coverage-absent', 'symbolic-link': 'mapping-coverage-absent',
  'over-read-limit': 'mapping-coverage-absent', 'too-large': 'mapping-coverage-absent', unparsed: 'mapping-coverage-absent',
};
function unknownReasonOf(file: LocalTestNamesFile): string {
  const key = file.unknownReason ?? '';
  if (!Object.hasOwn(UNKNOWN_REASON, key)) throw new Error('test names: a file reason this version does not name');
  return UNKNOWN_REASON[key]!;
}

function nameEntry(name: LocalTestName, revision: string): string {
  const what = name.kind === 'suite' ? 'Suite' : 'Test';
  return `<li data-test-name-id="${escape(name.id)}" data-epistemic="inferred" data-test-name-kind="${name.kind}" data-test-name-rule="${escape(name.rule)}" data-test-name-rule-version="${name.ruleVersion}" data-test-name-path="${escape(name.path)}" data-test-name-line="${name.line}">`
    + `${escape(`${what} ${name.name}, in ${name.path} at line ${name.line}.`)} <span class="derived-mark">Derived by Syzygy</span><span class="visually-hidden ev"> ${escape(`Evidence: label Inferred; declared in ${name.path}, line ${name.line}; read by Syzygy by rule ${name.rule} version ${name.ruleVersion} at revision ${revision}. A declared name, never a claim that the test runs or passes.`)}</span></li>`;
}

/** The page's main content: its section, from the member and the revision of the derived record the render holds. */
export function testNamesPage(member: LocalTestNames, revision: string): string {
  const open = `<section id="test-names" data-reading-level="1" data-topics=""><h1>${TEST_NAMES_PAGE.title}</h1>`;
  if (member.state !== 'derived') {
    return `${open}<p class="derived-unknown" data-epistemic="unknown" data-unknown-reason="source-uncaptured-or-unreachable"><span class="not-established">Not established.</span> ${escape(`Which test names the test files at revision ${revision} declare is Unknown at this render: the pinned tree could not be listed.`)}</p></section>`;
  }
  const note = `<p class="map-note">${escape(`Computed by Syzygy at this render from the test files of the tree at revision ${revision} that the bound screening policy ${member.screeningPolicy.policyId} ${member.screeningPolicy.policyVersion} admits, read by rules ${ruleWords}, each at version 1. `
    + 'Each rule reads names alone, never a test\'s body, and skips every comment and string, so a name written in either is not one. A name is what a file declares, never a claim that the test runs or passes. '
    + `Each name sits under the unit its path begins with, by rule ${member.unitRule.rule} version ${member.unitRule.ruleVersion}: a top-level directory, or the repository root.`)}</p>`;
  const clauses = [
    ...member.recognizers.map(r => `${r.rule}: ${counted(r.candidates, 'candidate file', 'candidate files')}; ${r.inferred} read for names, ${r.unknown} Unknown with no names taken; ${r.secretPathsLeftOut} left out and not named, because a secret detector matches their path; ${r.setApart} set apart as vendored or generated paths; ${counted(r.valuesLeftOut, 'name', 'names')} left out by the value checks; ${counted(r.names, 'name', 'names')}.`),
    ...member.recognizers.filter(r => r.filesNotListed !== 0).map(r => `${counted(r.filesNotListed, 'file', 'files')} of ${r.rule} counted and not listed.`),
  ];
  const coverage = `<p class="map-coverage" data-epistemic="inferred">${escape(clauses.join(' '))}</p>`;

  const head = `<tr><th scope="col">Unit</th><th scope="col">Files read</th>${TEST_NAME_RULES.map(r => `<th scope="col">${escape(r.heading)}</th>`).join('')}<th scope="col">All names</th></tr>`;
  const rows = member.units.map(u => `<tr data-test-names-unit="${escape(u.unit ?? '.')}" data-epistemic="inferred"><th scope="row">${escape(unitWords(u.unit))}</th><td>${u.files}</td>${TEST_NAME_RULES.map(r => `<td>${u.byRule[r.rule] ?? 0}</td>`).join('')}<td>${u.names}</td></tr>`).join('');
  const table = member.units.length === 0
    ? '<p>No test file was read for names, so no unit has a row.</p>'
    : `<div class="table-scroll"><table class="test-names-units"><caption>${escape(`Test names per unit, as counts of names each rule read: ${counted(member.units.length, 'unit', 'units')} with a test file read`)}${member.unitsNotListed === 0 ? '' : escape(`; ${counted(member.unitsNotListed, 'more unit', 'more units')} counted and not listed`)}</caption><thead>${head}</thead><tbody>${rows}</tbody></table></div>`;

  // Version 2.35: the table counts only files read for names, so the Unknown files are named beside it as missing from every row,
  // never as zero names.
  const unknownTotal = member.recognizers.reduce((sum, r) => sum + r.unknown, 0);
  const floor = unknownTotal === 0 ? ''
    : `<p class="test-names-floor" data-epistemic="unknown" data-unknown-reason="mapping-coverage-absent"><span class="not-established">Not established.</span> ${escape(`What ${counted(unknownTotal, 'candidate file whose names are Unknown declares', 'candidate files whose names are Unknown declare')} is counted in no row, so each count is of the files read and never a total: a unit with no row may hold tests.`)}</p>`;
  const byUnit = new Map<string | null, LocalTestName[]>();
  for (const name of member.names) byUnit.set(name.unit, [...(byUnit.get(name.unit) ?? []), name]);
  const units = [...byUnit.keys()].sort((a, b) => (a === null ? -1 : b === null ? 1 : a < b ? -1 : a > b ? 1 : 0));
  const lists = units.map(unit => `<h3>${escape(unitWords(unit))}</h3><ul class="test-names">${byUnit.get(unit)!.map(name => nameEntry(name, revision)).join('')}</ul>`).join('');
  const notListed = member.namesNotListed === 0 ? '' : `<p>${escape(`${counted(member.namesNotListed, 'more name is', 'more names are')} counted in the table and not listed.`)}</p>`;
  const every = `<h2>Every name, by unit</h2>${lists === '' ? '<p>No name was read.</p>' : lists}${notListed}`;

  const unknownFiles = member.recognizers.flatMap(r => r.files.filter(file => file.epistemic === 'unknown'));
  const word = (file: LocalTestNamesFile): string => `${file.unknownReason ?? ''}${file.parseFault === null ? '' : `, ${file.parseFault}`}`;
  const unknownNotListed = member.recognizers.reduce((sum, r) => sum + r.unknown - r.files.filter(file => file.epistemic === 'unknown').length, 0);
  const unknownItems = unknownFiles.map(file => `<li data-epistemic="unknown" data-unknown-reason="${unknownReasonOf(file)}" data-test-names-path="${escape(file.path)}" data-test-names-file-reason="${escape(word(file))}"><span class="not-established">Not established.</span> ${escape(`${file.path}: which names it declares is Unknown (${word(file)}).`)}</li>`).join('')
    + (unknownNotListed === 0 ? '' : `<li>${escape(`${counted(unknownNotListed, 'more file whose names are Unknown is', 'more files whose names are Unknown are')} counted and not listed.`)}</li>`);
  const unknown = `<h2>Files whose names are Unknown</h2><ul class="test-names-unknown">${unknownItems === '' ? `<li>${member.recognizers.every(r => r.candidates === 0) ? 'No candidate file.' : 'Every candidate file not left out or set apart was read for names.'}</li>` : unknownItems}</ul>`;

  return `${open}${note}${coverage}<h2>Per unit</h2>${table}${floor}${every}${unknown}</section>`;
}

/** `machine.json`'s `testNames` member: the page and the member as the render derived it. */
export const testNamesMachine = (member: LocalTestNames): unknown => ({ page: TEST_NAMES_PAGE.path, ...member });
