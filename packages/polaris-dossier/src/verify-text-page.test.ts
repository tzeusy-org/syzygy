import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAGE_SINK_CONTRACT, pageSinkCspFinding, pageSinkScriptFinding } from '@syzygy/polaris-generation-core/live';
import { describe, expect, it } from 'vitest';
import type { PinnedObjectReader, TreeEntry } from './git-object-reader.js';
import { buildDossierScreen } from './screen.js';
import { annotateText, verifyText, type VerifiedText } from './verify-text.js';
import { renderVerifiedTextPage } from './verify-text-page.js';

// syzygy-5dhm.24 (R2 S2): the checked text as one HTML page in a neutral shell. Every expected fragment is a literal written before
// the renderer ran, never taken from the module under test.

const PINNED = 'b'.repeat(40);
const ZERO = { 'quotation-verified': 0, 'reference-unverified': 0, 'path-missing': 0, 'quotation-not-found': 0, unanchored: 0, withheld: 0 } as const;

/** A result written by hand: three claims, one of them a path screening withholds by name. */
const MARKDOWN = 'Intro "keeps <every> key" (`src/a.c:1-2`).\nstill intro.\n\n- Lives in `lib/a.h` & more.\n- Secret at docs/x.txt:1.\n\nNo file here, "just words".\n';
const VERIFIED: VerifiedText = {
  claims: [
    { index: 1, startLine: 1, endLine: 2, outcome: 'quotation-verified', references: [{ written: 'src/a.c', path: 'src/a.c', ranges: [{ start: 1, end: 2 }], state: 'resolves' }], quotations: ['verified'], uncheckedQuotations: 0 },
    { index: 2, startLine: 4, endLine: 4, outcome: 'reference-unverified', references: [{ written: 'a.h', path: 'lib/a.h', ranges: [], state: 'resolves' }], quotations: [], uncheckedQuotations: 0 },
    { index: 3, startLine: 5, endLine: 5, outcome: 'withheld', references: [{ written: null, path: null, ranges: [{ start: 1, end: 1 }], state: 'withheld' }], quotations: [], uncheckedQuotations: 0 },
    { index: 4, startLine: 7, endLine: 7, outcome: 'unanchored', references: [], quotations: [], uncheckedQuotations: 1 },
  ],
  // Every count distinct (and none equal to the four claims), so a figure read from the wrong field fails. The page reads these
  // counts as given; it never recounts the claims.
  tally: { 'quotation-verified': 11, 'reference-unverified': 12, 'path-missing': 13, 'quotation-not-found': 14, unanchored: 15, withheld: 16 },
  items: { references: { resolves: 21, missing: 22, 'lines-missing': 23, withheld: 24 }, quotations: { verified: 31, 'not-found': 32, withheld: 33, 'no-file': 34, unanchored: 35 } },
  skipped: { headingLines: 0, fencedLines: 0, tableHeaderLines: 0, tableSeparatorLines: 0 },
};

describe('the checked text as an HTML page', () => {
  const html = renderVerifiedTextPage(MARKDOWN, VERIFIED, { pinned: PINNED });

  it('marks each claim in place, escaped, with its number and outcome', () => {
    const text = html.slice(html.indexOf('<section'), html.indexOf('</section>') + 10);
    expect(text).toBe('<section role="region" aria-labelledby="text-heading"><h2 id="text-heading">The text, each claim marked with its outcome</h2><pre class="text">'
      + '<span class="claim" id="claim-1" data-claim="1" data-outcome="quotation-verified">Intro &quot;keeps &lt;every&gt; key&quot; (`src/a.c:1-2`).\nstill intro. <span class="mark">[C1: quotation-verified]</span></span>\n'
      + '\n'
      + '<span class="claim" id="claim-2" data-claim="2" data-outcome="reference-unverified">- Lives in `lib/a.h` &amp; more. <span class="mark">[C2: reference-unverified]</span></span>\n'
      + '<span class="claim" id="claim-3" data-claim="3" data-outcome="withheld">- Secret at docs/x.txt:1. <span class="mark">[C3: withheld]</span></span>\n'
      + '\n'
      + '<span class="claim" id="claim-4" data-claim="4" data-outcome="unanchored">No file here, &quot;just words&quot;. <span class="mark">[C4: unanchored]</span></span>\n'
      + '</pre></section>');
  });

  it('closes with the tally, the unanchored count, and the item counts', () => {
    expect(html).toContain('<tr><th scope="row">quotation-verified</th><td class="n">11</td></tr><tr><th scope="row">reference-unverified</th><td class="n">12</td></tr>'
      + '<tr><th scope="row">path-missing</th><td class="n">13</td></tr><tr><th scope="row">quotation-not-found</th><td class="n">14</td></tr>'
      + '<tr><th scope="row">unanchored</th><td class="n">15</td></tr><tr><th scope="row">withheld</th><td class="n">16</td></tr>'
      + '<tr><th scope="row">total</th><td class="n">4</td></tr>');
    expect(html).toContain('<p>Claims that cannot be checked at all, because they name no file: 15.</p>');
    expect(html).toContain('<tr><th scope="row">resolves</th><td class="n">21</td></tr><tr><th scope="row">missing</th><td class="n">22</td></tr>'
      + '<tr><th scope="row">lines-missing</th><td class="n">23</td></tr><tr><th scope="row">withheld</th><td class="n">24</td></tr>');
    expect(html).toContain('<tr><th scope="row">verified</th><td class="n">31</td></tr><tr><th scope="row">not-found</th><td class="n">32</td></tr>'
      + '<tr><th scope="row">withheld</th><td class="n">33</td></tr><tr><th scope="row">no-file</th><td class="n">34</td></tr><tr><th scope="row">unanchored</th><td class="n">35</td></tr>');
  });

  it('states what the checker measures, never whether an unquoted claim is true', () => {
    const section = html.slice(html.indexOf('<h2>What this measures</h2>'));
    expect(section.startsWith('<h2>What this measures</h2><ul><li>The checker measures whether a claim can be checked and whether its quotation is real, not whether an unquoted claim is true')).toBe(true);
    expect(section.split('<li>').length - 1).toBe(6);
    // The lead-in rule in words that name neither the dossier nor the lead-in phrase.
    expect(section).toContain('A quotation that itself contains a fixed lead-in phrase the checker reserves cannot be checked and counts as not found.</li></ul>');
  });

  it('lists each claim\'s results, linking to the claim, and names no path screening withholds by name', () => {
    expect(html).toContain('<li data-claim="1"><a href="#claim-1">C1</a> (line 1): quotation-verified<ul><li>reference <code>src/a.c</code>, lines 1-2: resolves</li><li>quotation 1: verified</li></ul></li>');
    expect(html).toContain('<li data-claim="2"><a href="#claim-2">C2</a> (line 4): reference-unverified<ul><li>reference <code>a.h</code> (<code>lib/a.h</code>), whole file: resolves</li></ul></li>');
    expect(html).toContain('<li data-claim="3"><a href="#claim-3">C3</a> (line 5): withheld<ul><li>reference (a path screening withholds by name), line 1: withheld</li></ul></li>');
    expect(html).toContain('<li data-claim="4"><a href="#claim-4">C4</a> (line 7): unanchored<ul><li>1 quotation(s) not checked: the claim names no file</li></ul></li>');
    // The withheld path occurs only where the text itself writes it.
    expect(html.split('docs/x.txt').length - 1).toBe(1);
  });

  it('is a neutral shell: the pinned revision, no file name, no product name, no navigation', () => {
    expect(html).toContain(`<title>Checked text</title>`);
    expect(html).toContain(`<p class="pinned">Checked against the pinned revision <code>${PINNED}</code>.</p>`);
    expect(html).not.toMatch(/syzygy|polaris|dossier|the project states/iu);
    expect(html).not.toMatch(/<nav|<header|<footer/iu);
    // Every link is a fragment within the page.
    expect([...html.matchAll(/href="([^"]*)"/gu)].map((m) => m[1])).toEqual(['#claim-1', '#claim-2', '#claim-3', '#claim-4']);
  });

  it('carries the closed no-script policy and no script, handler or remote load', () => {
    expect(pageSinkCspFinding(html)).toBeNull();
    expect(pageSinkScriptFinding(html, PAGE_SINK_CONTRACT)).toBeNull();
    expect(html).not.toMatch(/<script|\son[a-z]+=|javascript:|src=|url\(|@import/iu);
  });

  it('writes a hostile text as text', () => {
    const hostile = '<script>alert(1)</script> <img src=x onerror="y"> \'q\' `src/a.c`';
    const page = renderVerifiedTextPage(hostile, { ...VERIFIED, claims: [{ ...VERIFIED.claims[1]!, startLine: 1, endLine: 1 }] }, { pinned: PINNED });
    expect(page).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &lt;img src=x onerror=&quot;y&quot;&gt; &#39;q&#39; `src/a.c`');
    expect(pageSinkScriptFinding(page, PAGE_SINK_CONTRACT)).toBeNull();
    expect(page).not.toMatch(/<script|<img/iu);
  });

  it('says so when no claim names a file or quotes', () => {
    const page = renderVerifiedTextPage('Words.', { ...VERIFIED, claims: [{ index: 1, startLine: 1, endLine: 1, outcome: 'unanchored', references: [], quotations: [], uncheckedQuotations: 0 }] }, { pinned: PINNED });
    expect(page).toContain('<h2>Results by claim</h2><p>No claim names a file or quotes.</p>');
  });
});

// The same text through the real checker: the page and the annotated copy carry the same outcome per claim.
const REAL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const LIVE_POLICY = JSON.parse(fs.readFileSync(path.join(REAL_ROOT, '.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json'), 'utf8'));
const SCREEN = ((load) => { if (!load.ok) throw new Error(load.why); return load.screen; })(buildDossierScreen(new TextEncoder().encode(JSON.stringify({
  policyId: 'fixture-public-source', policyVersion: '1', detectors: LIVE_POLICY.detectors, sourceAdmission: LIVE_POLICY.sourceAdmission,
  publicSourceScope: { contentClassification: { rules: [{ class: 'code-content', sourceExtensions: ['.c'] }] } },
}))));
const FILES: Readonly<Record<string, string>> = { 'src/kestrel.c': 'Kestrel keeps every key in memory.\nint main(void) { return 0; }\n' };
const reader = {
  revision: PINNED, algorithm: 'sha1',
  listTree: async (): Promise<TreeEntry[]> => Object.keys(FILES).map((file, i) => ({ path: file, mode: '100644', id: String(i).padStart(40, '0') })),
  readBlobs: async (paths: readonly string[]) => paths.map((wanted, i) => ({ path: wanted, mode: '100644', id: String(i).padStart(40, '0'), bytes: new TextEncoder().encode(FILES[wanted]!) })),
} as unknown as PinnedObjectReader;

describe('the page over a checked text', () => {
  it('renders the checker\'s outcomes, the same as the annotated copy', async () => {
    const markdown = 'It "keeps every key in memory" (`src/kestrel.c:1`).\n\nSee `src/gone.c`.\n\nNo file.\n';
    const { verified, annotated } = await verifyText(markdown, { pinned: PINNED, screen: SCREEN, reader }, 'answer.md');
    const page = renderVerifiedTextPage(markdown, verified, { pinned: PINNED });
    expect([...page.matchAll(/data-claim="(\d+)" data-outcome="([a-z-]+)"/gu)].map((m) => `${m[1]}:${m[2]}`)).toEqual(['1:quotation-verified', '2:path-missing', '3:unanchored']);
    expect([...annotated.matchAll(/\[verify C(\d+): ([a-z-]+)\]/gu)].map((m) => `${m[1]}:${m[2]}`)).toEqual(['1:quotation-verified', '2:path-missing', '3:unanchored']);
    expect(annotateText(markdown, verified, { pinned: PINNED, file: 'answer.md' })).toBe(annotated);
  });
});

// The frame is the same for every arm: everything but the text, the counts and the results by claim, pinned as a literal.
const frameOf = (html: string): string => html
  .replace(/<style>[\s\S]*?<\/style>/u, '<style>STYLE</style>')
  .replace(/<pre class="text">[\s\S]*?<\/pre>/u, '<pre class="text">TEXT</pre>')
  .replace(/<td class="n">\d+<\/td>/gu, '<td class="n">N</td>')
  .replace(/name no file: \d+\./u, 'name no file: N.')
  .replace(/(<h2>Results by claim<\/h2>)[\s\S]*?(<h2>What this measures<\/h2>)/u, '$1RESULTS$2');
const COUNT_ROWS = (names: readonly string[]): string => names.map((name) => `<tr><th scope="row">${name}</th><td class="n">N</td></tr>`).join('');
const FRAME = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
  + '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; base-uri \'none\'; form-action \'none\'">'
  + '<title>Checked text</title><style>STYLE</style></head><body><main>'
  + `<h1>Checked text</h1><p class="pinned">Checked against the pinned revision <code>${PINNED}</code>.</p>`
  + '<section role="region" aria-labelledby="text-heading"><h2 id="text-heading">The text, each claim marked with its outcome</h2><pre class="text">TEXT</pre></section>'
  + '<h2>Tally</h2><table><caption class="note">Claims by outcome</caption><thead><tr><th scope="col">Outcome</th><th scope="col">Count</th></tr></thead><tbody>'
  + COUNT_ROWS(['quotation-verified', 'reference-unverified', 'path-missing', 'quotation-not-found', 'unanchored', 'withheld', 'total']) + '</tbody></table>'
  + '<p>Claims that cannot be checked at all, because they name no file: N.</p>'
  + '<table><caption class="note">References by state</caption><thead><tr><th scope="col">State</th><th scope="col">Count</th></tr></thead><tbody>'
  + COUNT_ROWS(['resolves', 'missing', 'lines-missing', 'withheld']) + '</tbody></table>'
  + '<table><caption class="note">Quotations by state</caption><thead><tr><th scope="col">State</th><th scope="col">Count</th></tr></thead><tbody>'
  + COUNT_ROWS(['verified', 'not-found', 'withheld', 'no-file', 'unanchored']) + '</tbody></table>'
  + '<h2>Results by claim</h2>RESULTS<h2>What this measures</h2><ul>'
  + '<li>The checker measures whether a claim can be checked and whether its quotation is real, not whether an unquoted claim is true: a reference that resolves says only that the file and lines exist at the pinned revision.</li>'
  + '<li>A claim is a paragraph, a list item or a table row outside fenced code; a reference is a repository path, optionally with lines (path:N, path:N-M, path#LN-LM, &quot;path, lines N-M&quot;); a quotation is a double-quoted span (straight or curly) outside code spans.</li>'
  + '<li>A quotation is checked only against the files its own claim names; a quotation in a claim that names no file is counted unanchored, never searched for.</li>'
  + '<li>A path the screen withholds is reported withheld and never read; a quotation resting on withheld lines of a redacted file is withheld too, and so is a quotation found in no resolving file of a claim that also names a withheld path.</li>'
  + '<li>Not a reference: an absolute path, a URL, a host, a glob, a name that is only an extension, or a slashed name with neither an extension nor lines. A bare name without a slash is one only with lines, as a dotfile in code marks, or with one of these extensions: '
  + 'c, h, cc, cpp, cxx, hpp, hh, md, markdown, txt, rst, conf, cfg, ini, json, yaml, yml, toml, xml, py, tcl, js, mjs, cjs, ts, tsx, jsx, rs, go, sh, bash, lua, rb, java, kt, mk, cmake, html, css, sql, proto, lock, in; '
  + 'with js, ts, in (`Node.js` in prose) only in code marks or with lines. A path written both with lines and alone is checked for both. Lines below 1 or past 9007199254740991 name nothing.</li>'
  + '<li>A quotation holds at least one letter or digit and may wrap across lines of its claim; a straight-quoted span inside a curly-quoted one is part of it. Backslash escapes are not interpreted. A quotation that itself contains a fixed lead-in phrase the checker reserves cannot be checked and counts as not found.</li>'
  + '</ul></main></body></html>\n';

describe('the frame is the same for every arm', () => {
  it('draws a plain answer and a dossier text in byte-identical frames, and pins that frame', async () => {
    const plain = 'Kestrel keeps keys in memory (`src/kestrel.c`).\n\nIt is fast.\n';
    const dossier = '# page index.html\n\nThe project states: "Kestrel keeps every key in memory." (`src/kestrel.c:1`)\n\n- See `src/gone.c:3`.\n';
    const pages = await Promise.all([plain, dossier].map(async (markdown) => {
      const { verified } = await verifyText(markdown, { pinned: PINNED, screen: SCREEN, reader }, 'answer.md');
      return renderVerifiedTextPage(markdown, verified, { pinned: PINNED });
    }));
    expect(pages[0]).not.toBe(pages[1]);
    expect(frameOf(pages[0]!)).toBe(frameOf(pages[1]!));
    expect(frameOf(pages[0]!)).toBe(FRAME);
    // The stylesheet loads nothing and generates no text a grader could read.
    const style = /<style>([\s\S]*?)<\/style>/u.exec(pages[0]!)![1]!;
    expect(style).not.toMatch(/url\(|@import|content\s*:/iu);
  });
});
