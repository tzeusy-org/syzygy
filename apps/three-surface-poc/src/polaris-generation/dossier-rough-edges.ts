import type { LocalRoughEdgeMarker, LocalRoughEdges, LocalRoughEdgesFile } from '@syzygy/polaris-generation-core/live';
import { escapeHtml as escape } from './draft-preview.js';

/** The rough-edges reference page (REQ-polaris-generation-034 version 2.43, syzygy-5dhm.46): the TODO, FIXME, HACK, deprecation and
 * issue-reference markers recognizer `rough-edge-marker` v1 read in the admitted source files of the pinned tree, a table of them per unit,
 * the deprecation markers (what may be going away), every other listed marker with its quoted line, and the files whose markers are Unknown.
 * Every marker is Observed and carries its label and evidence in the DOM text; an issue reference also says that what it names is
 * Unknown and was never fetched. No quoted line or reference is a link. Pure; no script. */

export const ROUGH_EDGES_PAGE = { path: 'reference/rough-edges.html', title: 'Rough edges' } as const;

/** The five kinds in the member's order, each with the column heading the per-unit table gives it. */
export const MARKER_KINDS: readonly { readonly kind: string; readonly heading: string }[] = [
  { kind: 'todo', heading: 'TODO' },
  { kind: 'fixme', heading: 'FIXME' },
  { kind: 'hack', heading: 'HACK' },
  { kind: 'deprecation', heading: 'Deprecation' },
  { kind: 'issue-reference', heading: 'Issue references' },
];

/** The page's legend: the same view switch as a map page's, so a sighted reader can open the evidence view. */
export const ROUGH_EDGES_LEGEND = '<aside class="reading-legend" aria-label="How to read this page"><p class="view-switch"><a href="#evidence-view">Show the evidence view</a> · <a href="#content">Back to the reading view</a></p><span id="evidence-view"></span><ul>'
  + '<li><span class="derived-mark">Derived by Syzygy</span> marks a marker Syzygy read in a source file; the evidence view shows its label, Observed, and the file, line and blob it comes from.</li>'
  + '<li><span class="not-established">Not established.</span> introduces an Unknown statement, whose reason follows in words.</li>'
  + '</ul></aside>';

const counted = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;
const unitWords = (unit: string | null): string => (unit === null ? 'Repository root' : `${unit}/`);

/** RFC2-24's reason for each file `unknownReason`, as the test-names page gives it; a reason this version does not name refuses the page. */
const UNKNOWN_REASON: Readonly<Record<string, string>> = {
  'denied-path': 'excluded-content', 'unknown-extraction-class': 'excluded-content', 'not-utf8-text': 'excluded-content', 'secret-detector-match': 'excluded-content',
  'active-content': 'excluded-content', 'redacted-body': 'excluded-content', 'class-not-consented': 'unconsented-source-or-provider',
  'object-read-refused': 'source-uncaptured-or-unreachable', 'path-not-citable': 'mapping-coverage-absent', 'symbolic-link': 'mapping-coverage-absent',
  'over-read-limit': 'mapping-coverage-absent', 'too-large': 'mapping-coverage-absent', unparsed: 'mapping-coverage-absent',
};
function unknownReasonOf(file: LocalRoughEdgesFile): string {
  const key = file.unknownReason ?? '';
  if (!Object.hasOwn(UNKNOWN_REASON, key)) throw new Error('rough edges: a file reason this version does not name');
  return UNKNOWN_REASON[key]!;
}

/** Syzygy's words for one marker: TODO, FIXME and HACK by their marker, the others by kind and marker. */
function markerWords(marker: LocalRoughEdgeMarker): string {
  if (marker.kind === 'deprecation') return `Deprecation marker ${marker.marker}`;
  if (marker.kind === 'issue-reference') return `Issue reference ${marker.marker}`;
  return marker.marker;
}

function markerEntry(marker: LocalRoughEdgeMarker, revision: string): string {
  const reference = marker.kind !== 'issue-reference' ? ''
    : ` <span class="reference-unknown" data-epistemic="unknown" data-unknown-reason="source-uncaptured-or-unreachable"><span class="not-established">Not established.</span> ${escape(`What ${marker.marker} names is Unknown: it lies outside the clone, and Syzygy fetched nothing.`)}</span>`;
  return `<li data-marker-id="${escape(marker.id)}" data-epistemic="observed" data-marker-kind="${escape(marker.kind)}" data-marker-path="${escape(marker.path)}" data-marker-line="${marker.line}">`
    + `${escape(`${markerWords(marker)}, in ${marker.path} at line ${marker.line}:`)} <q>${escape(marker.quote)}</q> <span class="derived-mark">Derived by Syzygy</span>`
    + `<span class="visually-hidden ev"> ${escape(`Evidence: label Observed; line ${marker.line} of ${marker.path}, blob ${marker.blob}, quoted exactly but for its leading and trailing spaces and tabs; read by Syzygy by rule rough-edge-marker version 1 at revision ${revision}.`)}</span>${reference}</li>`;
}

/** Listed markers grouped by unit, the root first and then the directories in code-unit order. */
function byUnit(markers: readonly LocalRoughEdgeMarker[], revision: string): string {
  const groups = new Map<string | null, LocalRoughEdgeMarker[]>();
  for (const marker of markers) groups.set(marker.unit, [...(groups.get(marker.unit) ?? []), marker]);
  const units = [...groups.keys()].sort((a, b) => (a === null ? -1 : b === null ? 1 : a < b ? -1 : a > b ? 1 : 0));
  return units.map(unit => `<h3>${escape(unitWords(unit))}</h3><ul class="rough-edges">${groups.get(unit)!.map(marker => markerEntry(marker, revision)).join('')}</ul>`).join('');
}

/** The page's main content: its section, from the member and the revision of the derived record the render holds. */
export function roughEdgesPage(member: LocalRoughEdges, revision: string): string {
  const open = `<section id="rough-edges" data-reading-level="1" data-topics=""><h1>${ROUGH_EDGES_PAGE.title}</h1>`;
  if (member.state !== 'derived') {
    return `${open}<p class="derived-unknown" data-epistemic="unknown" data-unknown-reason="source-uncaptured-or-unreachable"><span class="not-established">Not established.</span> ${escape(`Which markers the source files at revision ${revision} write is Unknown at this render: the pinned tree could not be listed.`)}</p></section>`;
  }
  const r = member.recognizer;
  const note = `<p class="map-note">${escape(`Computed by Syzygy at this render from the Python, JavaScript, TypeScript, Go and Java source files of the tree at revision ${revision} that the bound screening policy ${member.screeningPolicy.policyId} ${member.screeningPolicy.policyVersion} admits, read by rule ${r.rule} version ${r.ruleVersion}. `
    + 'TODO, FIXME, HACK, the comment deprecation forms and issue references are read in comments only; Java\'s @Deprecated annotation and Python\'s deprecation warnings are read in code; nothing is read inside a string, a Python docstring included. '
    + 'Each marker\'s line is quoted from the file. A marker says what a maintainer wrote, never that the code is broken. An issue reference is a reference only: what it names lies outside the clone, so it is Unknown, and nothing is fetched. '
    + `Each marker sits under the unit its path begins with, by rule ${member.unitRule.rule} version ${member.unitRule.ruleVersion}: a top-level directory, or the repository root.`)}</p>`;
  const clauses = [
    `${r.rule}: ${counted(r.candidates, 'candidate file', 'candidate files')}; ${r.observed} read for markers, ${r.unknown} Unknown with no markers taken; ${r.secretPathsLeftOut} left out and not named, because a secret detector matches their path; ${r.setApart} set apart as vendored or generated paths; ${counted(r.valuesLeftOut, 'marker', 'markers')} left out because the value checks refuse its line; ${counted(r.markers, 'marker', 'markers')}.`,
    ...(r.filesNotListed === 0 ? [] : [`${counted(r.filesNotListed, 'file', 'files')} counted and not listed.`]),
  ];
  const coverage = `<p class="map-coverage" data-epistemic="observed">${escape(clauses.join(' '))}</p>`;

  const head = `<tr><th scope="col">Unit</th><th scope="col">Files read</th>${MARKER_KINDS.map(k => `<th scope="col">${escape(k.heading)}</th>`).join('')}<th scope="col">All markers</th></tr>`;
  const rows = member.units.map(u => `<tr data-rough-edges-unit="${escape(u.unit ?? '.')}" data-epistemic="observed"><th scope="row">${escape(unitWords(u.unit))}</th><td>${u.files}</td>${MARKER_KINDS.map(k => `<td>${u.byKind[k.kind] ?? 0}</td>`).join('')}<td>${u.markers}</td></tr>`).join('');
  const table = member.units.length === 0
    ? '<p>No source file was read for markers, so no unit has a row.</p>'
    : `<div class="table-scroll"><table class="rough-edges-units"><caption>${escape(`Markers per unit, as counts of what the rule read: ${counted(member.units.length, 'unit', 'units')} with a source file read`)}${member.unitsNotListed === 0 ? '' : escape(`; ${counted(member.unitsNotListed, 'more unit', 'more units')} counted and not listed`)}</caption><thead>${head}</thead><tbody>${rows}</tbody></table></div>`;
  // The table counts only files read for markers, so the Unknown files, and the files left out for a secret path, are named beside it as
  // missing from every row, never as zero (R-ROUGH-EDGES-1 F10).
  const unread = r.unknown + r.secretPathsLeftOut;
  const floor = unread === 0 ? ''
    : `<p class="rough-edges-floor" data-epistemic="unknown" data-unknown-reason="mapping-coverage-absent"><span class="not-established">Not established.</span> ${escape(`What ${counted(unread, 'candidate file whose markers are Unknown or left out writes', 'candidate files whose markers are Unknown or left out write')} is counted in no row, so each count is of the files read and never a total: a unit with no row may hold markers.`)}</p>`;

  const going = member.markers.filter(m => m.kind === 'deprecation');
  const rest = member.markers.filter(m => m.kind !== 'deprecation');
  // A row is a line that writes a deprecation form, never a claim that anything is deprecated (R-ROUGH-EDGES-1 F5).
  const away = `<h2>Deprecation markers</h2><p>${escape('What may be going away: each is a line that writes a deprecation form, never a claim that anything is deprecated; a Python line may handle or silence a deprecation warning rather than raise one.')}</p>${going.length === 0 ? '<p>No listed marker is a deprecation marker.</p>' : byUnit(going, revision)}`;
  const notListed = member.markersNotListed === 0 ? '' : `<p>${escape(`${counted(member.markersNotListed, 'more marker is', 'more markers are')} counted in the table and not listed.`)}</p>`;
  const every = `<h2>Every other marker, by unit</h2>${rest.length === 0 ? '<p>No other marker is listed.</p>' : byUnit(rest, revision)}${notListed}`;

  const unknownFiles = r.files.filter(file => file.epistemic === 'unknown');
  const word = (file: LocalRoughEdgesFile): string => `${file.unknownReason ?? ''}${file.parseFault === null ? '' : `, ${file.parseFault}`}`;
  const unknownNotListed = r.unknown - unknownFiles.length;
  const unknownItems = unknownFiles.map(file => `<li data-epistemic="unknown" data-unknown-reason="${unknownReasonOf(file)}" data-rough-edges-path="${escape(file.path)}" data-rough-edges-file-reason="${escape(word(file))}"><span class="not-established">Not established.</span> ${escape(`${file.path}: which markers it writes is Unknown (${word(file)}).`)}</li>`).join('')
    + (unknownNotListed === 0 ? '' : `<li>${escape(`${counted(unknownNotListed, 'more file whose markers are Unknown is', 'more files whose markers are Unknown are')} counted and not listed.`)}</li>`);
  const unknown = `<h2>Files whose markers are Unknown</h2><ul class="rough-edges-unknown">${unknownItems === '' ? `<li>${r.candidates === 0 ? 'No candidate file.' : 'Every candidate file not left out or set apart was read for markers.'}</li>` : unknownItems}</ul>`;

  return `${open}${note}${coverage}<h2>Per unit</h2>${table}${floor}${away}${every}${unknown}</section>`;
}

/** `machine.json`'s `roughEdges` member: the page and the member as the render derived it. */
export const roughEdgesMachine = (member: LocalRoughEdges): unknown => ({ page: ROUGH_EDGES_PAGE.path, ...member });
