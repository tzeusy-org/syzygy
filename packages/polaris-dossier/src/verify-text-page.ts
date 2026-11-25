import { CLAIM_OUTCOMES, VERIFY_TEXT_DISCLOSURES, WITHHELD_BY_NAME, claimResults, splitLines, uncheckedWords, type VerifiedText } from './verify-text.js';

/** The checked text as one HTML page in a neutral shell (syzygy-5dhm.24, move R2 slice 2): the shell R1's graders see, the same for
 * every arm, so a grader cannot tell a dossier's text from a plain session's by its frame.
 *
 * Neutral means: no Syzygy or Polaris name, navigation, theme or link to another page; no file name (a name like `plain.md` would tell
 * the arm); every arm's text drawn the same way, as its own Markdown source, line for line, never parsed into richer markup. Each claim's
 * lines sit in one element carrying its number and outcome, with a visible mark at its last line (the annotated copy's marker, in the
 * page's own words), and the page closes with the tally, the item counts, each claim's results and the checker's disclosures. Its
 * results are `claimResults`, the list the annotated copy's closing section is written from, so a path screening withholds by name is
 * named by neither.
 *
 * Inert: every byte of the text and of each result is written as text, each of `& < > " '` as a character reference; the page carries
 * no script, no event handler and no external load, under the closed policy the dossier pages carry (`pageSinkCspFinding` in
 * `@syzygy/polaris-generation-core` accepts it, and the tests hold it to that). A pure function of the text and the result. */

const escape = (value: string): string => value.replace(/[&<>"']/gu, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** The policy every dossier page carries: no script, no remote load, no form, no base. */
const CSP_META = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">`;

/** Plain system fonts and colours only; each outcome has a label in words beside its colour, so colour carries nothing alone. */
const CSS = [
  ':root{color-scheme:light dark;--bg:#fdfdfc;--ink:#1d1d1b;--muted:#5c5c57;--line:#d6d6d0;--panel:#f3f3ef;--good:#e3f1e3;--plain:#eef0f5;--bad:#f8e3e0;--held:#f3ecd9;--none:#efefea}',
  '@media (prefers-color-scheme:dark){:root{--bg:#161615;--ink:#ecece8;--muted:#a6a69f;--line:#3a3a36;--panel:#20201e;--good:#1f3522;--plain:#232838;--bad:#3d2320;--held:#3a321d;--none:#272724}}',
  '*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:1rem/1.6 system-ui,sans-serif}',
  'main{max-width:72rem;margin:0 auto;padding:2rem 1rem}h1{font-size:1.6rem;margin:0 0 .5rem}h2{font-size:1.2rem;margin:2rem 0 .75rem}',
  '.pinned,.note{color:var(--muted)}code{font-family:ui-monospace,monospace;overflow-wrap:anywhere}',
  '.text{margin:0;padding:1rem;background:var(--panel);border:1px solid var(--line);white-space:pre-wrap;overflow-wrap:anywhere;font:.95rem/1.6 ui-monospace,monospace}',
  '.claim{display:inline}.claim:target{outline:2px solid var(--ink)}',
  '[data-outcome="quotation-verified"]{background:var(--good)}[data-outcome="reference-unverified"]{background:var(--plain)}',
  '[data-outcome="path-missing"],[data-outcome="quotation-not-found"]{background:var(--bad)}[data-outcome="withheld"]{background:var(--held)}',
  '[data-outcome="unanchored"]{background:var(--none)}.mark{font-weight:600;border:1px solid var(--line);padding:0 .25rem}',
  'table{border-collapse:collapse;margin:.5rem 0}th,td{border:1px solid var(--line);padding:.25rem .75rem;text-align:left}td.n{text-align:right;font-variant-numeric:tabular-nums}',
  'ul{padding-left:1.25rem}li{margin:.25rem 0}a{color:inherit}a:focus-visible{outline:2px solid var(--ink);outline-offset:2px}',
].join('');

const countTable = (caption: string, head: string, rows: readonly (readonly [string, number])[]): string =>
  `<table><caption class="note">${escape(caption)}</caption><thead><tr><th scope="col">${escape(head)}</th><th scope="col">Count</th></tr></thead><tbody>${
    rows.map(([name, n]) => `<tr><th scope="row">${escape(name)}</th><td class="n">${n}</td></tr>`).join('')}</tbody></table>`;

/** The page for one checked text. `pinned` is the revision the text was checked against. */
export function renderVerifiedTextPage(markdown: string, verified: VerifiedText, heading: { readonly pinned: string }): string {
  const { lines } = splitLines(markdown);
  const startOf = new Map(verified.claims.map((claim) => [claim.startLine, claim]));
  const endOf = new Map(verified.claims.map((claim) => [claim.endLine, claim]));
  const body = lines.map((line, i) => {
    const opening = startOf.get(i + 1);
    const closing = endOf.get(i + 1);
    const open = opening === undefined ? '' : `<span class="claim" id="claim-${opening.index}" data-claim="${opening.index}" data-outcome="${opening.outcome}">`;
    const close = closing === undefined ? '' : ` <span class="mark">[C${closing.index}: ${closing.outcome}]</span></span>`;
    return `${open}${escape(line)}${close}`;
  }).join('\n');

  const tally = countTable('Claims by outcome', 'Outcome', [...CLAIM_OUTCOMES.map((outcome) => [outcome, verified.tally[outcome]] as const), ['total', verified.claims.length]]);
  const references = countTable('References by state', 'State', Object.entries(verified.items.references));
  const quotations = countTable('Quotations by state', 'State', Object.entries(verified.items.quotations));
  const results = claimResults(verified).map((result) => {
    const items = [
      ...result.references.map((reference) => {
        const named = reference.named === null ? escape(WITHHELD_BY_NAME)
          : `<code>${escape(reference.named.written)}</code>${reference.named.resolved === undefined ? '' : ` (<code>${escape(reference.named.resolved)}</code>)`}`;
        return `<li>reference ${named}, ${escape(reference.where)}: ${reference.state}</li>`;
      }),
      ...result.quotations.map((state, q) => `<li>quotation ${q + 1}: ${state}</li>`),
      ...(result.uncheckedQuotations > 0 ? [`<li>${escape(uncheckedWords(result.uncheckedQuotations))}</li>`] : []),
    ];
    return `<li data-claim="${result.index}"><a href="#claim-${result.index}">C${result.index}</a> (line ${result.startLine}): ${result.outcome}<ul>${items.join('')}</ul></li>`;
  });

  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + `${CSP_META}<title>Checked text</title><style>${CSS}</style></head><body><main>`
    + `<h1>Checked text</h1><p class="pinned">Checked against the pinned revision <code>${escape(heading.pinned)}</code>.</p>`
    + `<pre class="text" aria-label="The text, each claim marked with its outcome">${body}</pre>`
    + `<h2>Tally</h2>${tally}<p>Claims that cannot be checked at all, because they name no file: ${verified.tally.unanchored}.</p>${references}${quotations}`
    + `<h2>Results by claim</h2>${results.length === 0 ? '<p>No claim names a file or quotes.</p>' : `<ul>${results.join('')}</ul>`}`
    + `<h2>What this measures</h2><ul>${VERIFY_TEXT_DISCLOSURES.map((line) => `<li>${escape(line)}</li>`).join('')}</ul>`
    + '</main></body></html>\n';
}
