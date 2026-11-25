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
  tally: { ...ZERO, 'quotation-verified': 1, 'reference-unverified': 1, withheld: 1, unanchored: 1 },
  items: { references: { resolves: 2, missing: 0, 'lines-missing': 0, withheld: 1 }, quotations: { verified: 1, 'not-found': 0, withheld: 0, 'no-file': 0, unanchored: 1 } },
  skipped: { headingLines: 0, fencedLines: 0, tableHeaderLines: 0, tableSeparatorLines: 0 },
};

describe('the checked text as an HTML page', () => {
  const html = renderVerifiedTextPage(MARKDOWN, VERIFIED, { pinned: PINNED });

  it('marks each claim in place, escaped, with its number and outcome', () => {
    const text = html.slice(html.indexOf('<pre'), html.indexOf('</pre>') + 6);
    expect(text).toBe('<pre class="text" aria-label="The text, each claim marked with its outcome">'
      + '<span class="claim" id="claim-1" data-claim="1" data-outcome="quotation-verified">Intro &quot;keeps &lt;every&gt; key&quot; (`src/a.c:1-2`).\nstill intro. <span class="mark">[C1: quotation-verified]</span></span>\n'
      + '\n'
      + '<span class="claim" id="claim-2" data-claim="2" data-outcome="reference-unverified">- Lives in `lib/a.h` &amp; more. <span class="mark">[C2: reference-unverified]</span></span>\n'
      + '<span class="claim" id="claim-3" data-claim="3" data-outcome="withheld">- Secret at docs/x.txt:1. <span class="mark">[C3: withheld]</span></span>\n'
      + '\n'
      + '<span class="claim" id="claim-4" data-claim="4" data-outcome="unanchored">No file here, &quot;just words&quot;. <span class="mark">[C4: unanchored]</span></span>\n'
      + '</pre>');
  });

  it('closes with the tally, the unanchored count, and the item counts', () => {
    expect(html).toContain('<tr><th scope="row">quotation-verified</th><td class="n">1</td></tr><tr><th scope="row">reference-unverified</th><td class="n">1</td></tr>'
      + '<tr><th scope="row">path-missing</th><td class="n">0</td></tr><tr><th scope="row">quotation-not-found</th><td class="n">0</td></tr>'
      + '<tr><th scope="row">unanchored</th><td class="n">1</td></tr><tr><th scope="row">withheld</th><td class="n">1</td></tr>'
      + '<tr><th scope="row">total</th><td class="n">4</td></tr>');
    expect(html).toContain('<p>Claims that cannot be checked at all, because they name no file: 1.</p>');
    expect(html).toContain('<tr><th scope="row">resolves</th><td class="n">2</td></tr>');
    expect(html).toContain('<tr><th scope="row">no-file</th><td class="n">0</td></tr><tr><th scope="row">unanchored</th><td class="n">1</td></tr>');
  });

  it('states what the checker measures, never whether an unquoted claim is true', () => {
    const section = html.slice(html.indexOf('<h2>What this measures</h2>'));
    expect(section.startsWith('<h2>What this measures</h2><ul><li>The checker measures whether a claim can be checked and whether its quotation is real, not whether an unquoted claim is true')).toBe(true);
    expect(section.split('<li>').length - 1).toBe(6);
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
    expect(html).not.toMatch(/syzygy|polaris/iu);
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
