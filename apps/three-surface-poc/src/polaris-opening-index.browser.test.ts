// PWB-REQ-010 as amended by pwb-opening-index-amendment v1.0 (P-98,
// syzygy-u05.23): the opening index, its reach offsets and the one
// stopping line, checked in a real browser after load.
//
// Oracle independence (the requirement's "Oracle independence" limb):
//
// - Expected row names, order and targets are the requirement's table,
//   typed below as literals — never the renderer's mapping.
// - Targets are found by RECOGNIZER, published here before any run: it keys
//   only on visible heading text (an exact string per target) and, for the
//   exact-requirement row, on the PWB-REQ-011 exact-source route form. It
//   never keys on an id, class or attribute the renderer emits to mark an
//   index target.
// - Offsets and totals come from WORD_COUNTER, an in-page counter written
//   here that shares no code with the renderer's script: a recursive walk
//   with an inherited "counting" flag, splitting on whitespace, where the
//   renderer walks text nodes with a TreeWalker and checks ancestors.
// - The index itself is found by its accessible label and the stopping line
//   by its text (numbers and the unit "words", nothing else), so a
//   duplicated or relabelled line is found as well.
//
// The viewport each run used is published with its result. Without a
// browser the suite is skipped, never passed.
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { findBrowserExecutable, launchBrowser, type Browser, type BrowserPage } from './cdp-browser.js';
import { ACCESSIBILITY_VARIANTS, variantModel } from './polaris-accessibility-variants.js';
import { OPENING_INDEX_PLACEHOLDER, substituteOpeningIndex } from './polaris-opening-index.js';
import { renderPolarisPage } from './polaris.js';
import { tempDir } from '@syzygy/test-kit';

// ---------------------------------------------------------------------------
// The requirement's table, and the published recognizer.

/** PWB-REQ-010's table, in its order: identity, row name. */
const SIGNED_ROWS = [
  ['why', 'purpose'],
  ['promises', 'promises'],
  ['refusals-and-rule', 'non-goals'],
  ['capabilities-and-fit', 'capabilities'],
  ['exact-requirement', 'exact requirements'],
  ['unknown-or-contradiction', 'gaps'],
  ['claim-strength', 'claim strength'],
  ['architecture-and-groups', 'architecture'],
  ['v1-success', 'V1 success'],
] as const;

/**
 * How each target's first element is found, published before any run.
 *
 * A `heading` recognizer selects the first element in document order that
 * is an `h1`–`h6` or carries `role="heading"`, is not hidden (`hidden`,
 * `aria-hidden="true"` or computed `display: none` on it or an ancestor),
 * is not inside the index, and whose text content, whitespace collapsed and
 * trimmed, equals the string exactly. The `route` recognizer selects the
 * first `a` element in document order, outside the index, whose raw `href`
 * is the exact-source route form `[/<mount>]/polaris/source?identity=<id>`.
 *
 * The heading strings are the page's own vocabulary (owner answer Q12,
 * "Disclose it, as now"): the purpose, promise, non-goal and architecture
 * statements' headings, the capability catalog's heading, the opening
 * Unknown aggregate's heading, the claim-state legend's heading, and the V1
 * scope heading, which begins the V1 scope and success-criteria statements.
 */
const RECOGNIZER = {
  why: { kind: 'heading', text: 'Purpose' },
  promises: { kind: 'heading', text: 'Promises' },
  'refusals-and-rule': { kind: 'heading', text: 'Deliberate limits' },
  'capabilities-and-fit': { kind: 'heading', text: 'Declared capabilities' },
  'exact-requirement': { kind: 'route', pattern: '^(?:/[A-Za-z0-9._~-]+)?/polaris/source\\?identity=[^&#]+$' },
  'unknown-or-contradiction': { kind: 'heading', text: 'Unknown claims before the catalog' },
  'claim-strength': { kind: 'heading', text: 'What the claim states mean' },
  'architecture-and-groups': { kind: 'heading', text: 'Architecture' },
  'v1-success': { kind: 'heading', text: 'V1 scope' },
} as const;

// ---------------------------------------------------------------------------
// The in-page oracle.

/** The independent word counter. Returns the total and a map from each
 * element to the number of counted words before it. */
const WORD_COUNTER = `function WORD_COUNTER(excludedRoots) {
  const before = new Map();
  let total = 0;
  const visit = (node, counting) => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (!counting) return;
      const style = getComputedStyle(node.parentElement);
      if (style.visibility !== 'visible') return;
      total += node.data.split(/\\s+/).filter((piece) => piece !== '').length;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    before.set(node, total);
    let inside = counting;
    const tag = node.localName;
    if (tag === 'script' || tag === 'style' || tag === 'template' || tag === 'noscript') inside = false;
    if (node.hasAttribute('hidden') || node.getAttribute('aria-hidden') === 'true') inside = false;
    if (getComputedStyle(node).display === 'none') inside = false;
    if (excludedRoots.includes(node)) inside = false;
    if (tag === 'details' && !node.open) {
      const summary = Array.prototype.find.call(node.children, (child) => child.localName === 'summary');
      for (const child of node.childNodes) visit(child, inside && child === summary);
      return;
    }
    for (const child of node.childNodes) visit(child, inside);
  };
  for (const child of document.body.childNodes) visit(child, true);
  return { before, total };
}`;

function oracleScript(table: typeof SIGNED_ROWS, recognizer: typeof RECOGNIZER, checkFirstReadingLevel: boolean): string {
  return `(() => {
  ${WORD_COUNTER}
  const violations = [];
  const fail = (kind, detail) => violations.push({ kind, detail });
  const norm = (text) => text.replace(/\\s+/g, ' ').trim();
  const table = ${JSON.stringify(table)};
  const recognizer = ${JSON.stringify(recognizer)};
  const indexes = Array.from(document.querySelectorAll('nav[aria-label="Opening index"]'));
  if (indexes.length !== 1) { fail('index-count', String(indexes.length)); return { violations }; }
  const index = indexes[0];
  // The stopping line: every element whose text is numbers and the unit
  // "words" and nothing else, innermost only.
  const lineText = (element) => /^[0-9\\s/·,.:;–—-]*words$/.test(norm(element.textContent)) && /[0-9]/.test(element.textContent);
  const lines = Array.from(document.body.querySelectorAll('*')).filter((element) => !index.contains(element) && lineText(element) && !Array.from(element.children).some(lineText));
  const { before, total } = WORD_COUNTER([index, ...lines]);
  const hidden = (element) => { for (let node = element; node; node = node.parentElement) { if (node.hasAttribute('hidden') || node.getAttribute('aria-hidden') === 'true' || getComputedStyle(node).display === 'none') return true; } return false; };
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]')).filter((element) => !index.contains(element) && !hidden(element));
  const recognize = (identity) => {
    const rule = recognizer[identity];
    if (rule.kind === 'heading') return headings.find((element) => norm(element.textContent) === rule.text) || null;
    const pattern = new RegExp(rule.pattern);
    return Array.from(document.querySelectorAll('a[href]')).find((element) => !index.contains(element) && pattern.test(element.getAttribute('href'))) || null;
  };
  if (${checkFirstReadingLevel}) {
    const main = document.querySelector('main');
    const after = headings.filter((element) => index.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING);
    const earlier = headings.filter((element) => main.contains(element) && (index.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_PRECEDING));
    if (!main || !main.contains(index)) fail('index-outside-main', '');
    if (earlier.length > 0) fail('heading-before-index', norm(earlier[0].textContent));
    if (!after[0] || after[0].localName !== 'h2' || norm(after[0].textContent) !== 'What Butlers is') fail('index-does-not-begin-first-reading-level', after[0] ? norm(after[0].textContent) : 'none');
  }
  const rows = Array.from(index.querySelectorAll('li'));
  if (rows.length !== table.length) fail('row-count', String(rows.length));
  const measured = [];
  table.forEach(([identity, name], position) => {
    const row = rows[position];
    if (!row) return;
    const text = norm(row.textContent);
    if (!text.startsWith(name)) { fail('row-name', position + ': ' + text); return; }
    const rest = text.slice(name.length);
    const target = recognize(identity);
    const routes = Array.from(row.querySelectorAll('[href], [tabindex], button'));
    if (target === null) {
      if (routes.length > 0) fail('unrendered-row-routes', identity);
      if (/[0-9]/.test(rest)) fail('unrendered-row-offset', identity + ': ' + rest);
      if (!/not rendered/.test(rest)) fail('unrendered-row-silent', identity + ': ' + rest);
      measured.push({ identity, rendered: false });
      return;
    }
    const links = row.querySelectorAll('a[href^="#"]');
    if (links.length !== 1 || routes.length !== 1) { fail('row-route-count', identity + ': ' + routes.length); return; }
    let routed = null;
    try { routed = document.getElementById(decodeURIComponent(links[0].getAttribute('href').slice(1))); } catch (error) { routed = null; }
    if (routed !== target) fail('row-target', identity + ': ' + links[0].getAttribute('href'));
    const offset = before.get(target);
    const numbers = rest.match(/[0-9]+/g) || [];
    if (numbers.length !== 1 || Number(numbers[0]) !== offset) fail('row-offset', identity + ': shows ' + rest + ', counted ' + offset);
    measured.push({ identity, rendered: true, offset, target });
  });
  for (const element of [index, ...lines]) if (element.matches('[data-parity-field], [data-claim-role], [data-epistemic-label], .claim-tuple') || element.querySelector('[data-parity-field], [data-claim-role], [data-epistemic-label], .claim-tuple')) fail('index-carries-claim-markup', norm(element.textContent).slice(0, 40));
  // Never a verdict (RFC7-31): no word of the index or the line says or
  // implies that a prompt is, or can be, answered.
  const verdict = /\\b(answer|answers|answered|answerable|complete|completed|done|enough|finished|stop|ready|understood|understand|covered|sufficient)\\b/i;
  for (const element of [index, ...lines]) if (verdict.test(norm(element.textContent))) fail('verdict-word', norm(element.textContent));
  // The line's place.
  const rendered = measured.filter((entry) => entry.rendered);
  let setter = null;
  for (const entry of rendered) {
    if (setter === null || entry.offset > setter.offset || (entry.offset === setter.offset && (setter.target.compareDocumentPosition(entry.target) & Node.DOCUMENT_POSITION_FOLLOWING))) setter = entry;
  }
  let place = index;
  if (setter !== null) {
    place = setter.target;
    for (let node = setter.target; node && node !== document.body; node = node.parentElement) {
      if ((node.localName === 'details' && !node.open) || ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'dl', 'table'].includes(node.localName)) place = node;
    }
  }
  if (lines.length !== 1) fail('line-count', String(lines.length));
  const line = lines[0];
  let lineNumbers = [];
  if (line) {
    lineNumbers = (norm(line.textContent).match(/[0-9]+/g) || []).map(Number);
    // Numbers and their unit, nothing else: the largest offset and the
    // total joined by one slash, or the total alone.
    if (!/^[0-9]+( \\/ [0-9]+)? words$/.test(norm(line.textContent))) fail('line-text', norm(line.textContent));
    const expected = setter === null ? [total] : [setter.offset, total];
    if (JSON.stringify(lineNumbers) !== JSON.stringify(expected)) fail('line-numbers', norm(line.textContent) + ' expected ' + expected.join(' '));
    let previous = line.previousSibling;
    while (previous && previous.nodeType === Node.TEXT_NODE && previous.data.trim() === '') previous = previous.previousSibling;
    if (previous !== place) fail('line-place', (previous && previous.nodeType === 1 ? previous.localName + (previous.id ? '#' + previous.id : '') : String(previous)) + ' expected ' + place.localName + (place.id ? '#' + place.id : ''));
    for (let node = line.parentElement; node; node = node.parentElement) if (node.localName === 'details' && !node.open) fail('line-inside-closed-details', '');
  }
  return {
    viewport: { width: innerWidth, height: innerHeight },
    total,
    rows: measured.map(({ identity, rendered, offset }) => rendered ? { identity, offset } : { identity, rendered: false }),
    setter: setter === null ? null : setter.identity,
    setterInsideClosedDetails: setter === null ? false : (() => { for (let node = setter.target.parentElement; node; node = node.parentElement) if (node.localName === 'details' && !node.open) return true; return false; })(),
    line: line ? norm(line.textContent) : null,
    violations,
  };
})()`;
}

interface OracleReport {
  readonly viewport: { readonly width: number; readonly height: number };
  readonly total: number;
  readonly rows: readonly ({ readonly identity: string; readonly offset: number } | { readonly identity: string; readonly rendered: false })[];
  readonly setter: string | null;
  readonly setterInsideClosedDetails: boolean;
  readonly line: string | null;
  readonly violations: readonly { readonly kind: string; readonly detail: string }[];
}

/** Waits for the load handlers to have run, then runs the oracle. */
async function measure(tab: BrowserPage, url: string, viewport: { readonly width: number; readonly height: number }, firstReadingLevel = true): Promise<OracleReport> {
  await tab.setViewport(viewport.width, viewport.height);
  await tab.navigate(url);
  await tab.evaluate(`new Promise((resolve) => { const done = () => setTimeout(() => resolve(true), 0); if (document.readyState === 'complete') done(); else addEventListener('load', done); })`);
  const report = await tab.evaluate<OracleReport | { readonly violations: OracleReport['violations'] }>(oracleScript(SIGNED_ROWS, RECOGNIZER, firstReadingLevel));
  if (!('total' in report)) return { viewport, total: -1, rows: [], setter: null, setterInsideClosedDetails: false, line: null, violations: report.violations };
  return report;
}

const WIDE = { width: 1280, height: 900 } as const;
const NARROW = { width: 390, height: 844 } as const;

/** A synthetic page: the renderer's own index over a hand-written body. */
function syntheticPage(body: string): string {
  return substituteOpeningIndex(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>synthetic</title></head><body><main>${OPENING_INDEX_PLACEHOLDER}${body}</main></body></html>`, '');
}

// Hand-checked expectations for the synthetic pages (every word counted by
// hand from the bodies below; the index and the line are not counted).
//
// TIE: "Purpose" and "Lead words here" (4) precede the hidden-text
// exact-source link and the architecture heading alike, so both offsets are
// 4; the heading is later in document order and sets the line, which stands
// after it. The purpose heading starts at 0. Excluded: the hidden span
// (displayed inline by its own style, so only the hidden attribute excludes
// it), the script, the style, the template, the noscript, the aria-hidden
// and display:none blocks, the visibility:hidden span (its visible child
// counts), and the closed details' content but not its summary.
const TIE_BODY = `<h2 id="polaris-account-purpose">Purpose</h2>
  <p>Lead <span style="visibility:hidden">ghost</span> words <span style="visibility:hidden"><span style="visibility:visible">here</span></span></p>
  <a href="/polaris/source?identity=repo%40rev%3Aspec.md"><span hidden style="display:inline">exact text</span></a><h3 id="polaris-account-architecture">Architecture</h3>
  <script>var notCounted = 'one two';</script><style>.x{}</style><template>tpl words</template><noscript>no script words</noscript>
  <div aria-hidden="true">aria hidden words</div><div style="display:none">display none words</div>
  <details><summary>Summary counts</summary><p>closed content not counted</p></details>
  <p>tail of the body</p>`;
// purpose 0; exact 4; architecture 4; total: Purpose(1) Lead words here(3)
// Architecture(1) Summary counts(2) tail of the body(4) = 11.

// NONE: no indexed target.
const NONE_BODY = `<h2>Nothing indexed here</h2><p>only two</p><details><summary>closed</summary>hidden words</details>`;
// "Nothing indexed here" (3) + "only two" (2) + "closed" (1) = 6.

const executable = findBrowserExecutable();

describe('opening index (server side)', () => {
  it('lists the nine signed names, in order, on every variant, and routes nowhere for an unrendered target', () => {
    const cleanups: string[] = [];
    try {
      for (const variant of ACCESSIBILITY_VARIANTS) {
        const html = renderPolarisPage(variantModel(variant, cleanups));
        const index = /<nav\b[^>]*aria-label="Opening index"[^>]*>([\s\S]*?)<\/nav>/.exec(html)?.[1] ?? '';
        const rows = [...index.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map((match) => match[1] as string);
        expect(rows.map((row) => row.replace(/<[^>]+>/g, '').split(' — ')[0]?.trim()), variant.id).toEqual(SIGNED_ROWS.map(([, name]) => name));
        for (const row of rows) {
          if (row.includes('not rendered')) expect(row, variant.id).not.toMatch(/href=|tabindex=/);
        }
      }
    } finally {
      for (const directory of cleanups) rmSync(directory, { recursive: true, force: true });
    }
  });

  it('finds the first exact-source link under a mount prefix', () => {
    const page = substituteOpeningIndex(`<main>${OPENING_INDEX_PLACEHOLDER}<a href="/elsewhere">x</a><a href="/butlers-syzygy/polaris/source?identity=a">a</a><a href="/butlers-syzygy/polaris/source?identity=b">b</a></main>`, '/butlers-syzygy');
    expect(page).toContain('<a href="/butlers-syzygy/polaris/source?identity=a" id="polaris-first-exact-requirement">a</a>');
    expect(page).toContain('<li data-opening-row="exact-requirement"><a href="#polaris-first-exact-requirement"');
    expect(page.match(/id="polaris-first-exact-requirement"/g)).toHaveLength(1);
  });

  it('refuses a page without exactly one placeholder', () => {
    expect(() => substituteOpeningIndex('<main></main>', '')).toThrow(/exactly once/);
    expect(() => substituteOpeningIndex(`${OPENING_INDEX_PLACEHOLDER}${OPENING_INDEX_PLACEHOLDER}`, '')).toThrow(/exactly once/);
  });
});

describe.skipIf(executable === undefined)('opening index in a real browser (PWB-REQ-010, P-98)', () => {
  let browser: Browser;
  let pages: string;
  const cleanups: string[] = [];
  const reports: { readonly page: string; readonly report: OracleReport }[] = [];

  beforeAll(async () => {
    browser = await launchBrowser(executable as string);
    pages = tempDir('syzygy-poc-opening-index-');
  }, 60_000); // launches Chrome: under 0.6 s in 10 alone runs, but a full-suite run at load1 56-71 left up to 5.1 s of its file's time to its hooks (docs/evidence/syzygy-bpyt-4-31/full-runs.json)

  afterAll(async () => {
    await browser?.close();
    for (const directory of cleanups.splice(0)) rmSync(directory, { recursive: true, force: true });
    process.stdout.write(`[P-98 opening index] ${JSON.stringify(reports)}\n`);
  });

  function write(name: string, html: string): string {
    const file = join(pages, `${name}.html`);
    writeFileSync(file, html);
    return pathToFileURL(file).href;
  }

  async function run(name: string, html: string, viewport: { readonly width: number; readonly height: number }, firstReadingLevel = true): Promise<OracleReport> {
    const tab = await browser.newPage();
    try {
      const report = await measure(tab, write(`${name}-${viewport.width}`, html), viewport, firstReadingLevel);
      reports.push({ page: name, report });
      return report;
    } finally { await tab.close(); }
  }

  const variant = (id: string): string => {
    const found = ACCESSIBILITY_VARIANTS.find((candidate) => candidate.id === id);
    if (found === undefined) throw new Error(id);
    return renderPolarisPage(variantModel(found, cleanups));
  };

  for (const viewport of [WIDE, NARROW]) {
    it(`every indexed target renders (${viewport.width}x${viewport.height}): nine routed rows, recounted offsets, one line after the last-beginning target`, async () => {
      const report = await run('observed-degraded-unlawful', variant('observed-degraded-unlawful'), viewport);
      expect(report.violations).toEqual([]);
      expect(report.viewport).toEqual(viewport);
      expect(report.rows.filter((row) => 'offset' in row)).toHaveLength(9);
    }, 60_000); // up to 4.2 s in 5 full-suite runs at load1 38-71 (docs/evidence/syzygy-bpyt-4-31/full-runs.json)

    it(`the opening Unknown aggregate is absent (${viewport.width}x${viewport.height}): the gaps row says so and routes nowhere; eight rows route`, async () => {
      const report = await run('observed', variant('observed'), viewport);
      expect(report.violations).toEqual([]);
      expect(report.rows.map((row) => ('offset' in row ? row.identity : `${row.identity}:not-rendered`))).toEqual([
        'why', 'promises', 'refusals-and-rule', 'capabilities-and-fit', 'exact-requirement', 'unknown-or-contradiction:not-rendered', 'claim-strength', 'architecture-and-groups', 'v1-success',
      ]);
      // The last-beginning target is the first exact-source link, inside a
      // closed item population: the line stands after that disclosure.
      expect(report.setter).toBe('exact-requirement');
      expect(report.setterInsideClosedDetails).toBe(true);
    });

    it(`an unobserved shape (${viewport.width}x${viewport.height}): only the gaps and claim-strength targets render`, async () => {
      const report = await run('not-admitted', variant('not-admitted'), viewport);
      expect(report.violations).toEqual([]);
      expect(report.rows.filter((row) => 'offset' in row).map((row) => row.identity)).toEqual(['unknown-or-contradiction', 'claim-strength']);
    }, 60_000); // up to 2.7 s in 5 full-suite runs at load1 38-71 (docs/evidence/syzygy-bpyt-4-31/full-runs.json)
  }

  /** Follows the exact-requirement row by keyboard (focus, Enter, Tab) and
   * reports where focus went. `nextInside` says whether the focusable after
   * the target lies in the target's own disclosure. */
  async function followExactRow(html: string, name: string): Promise<{ readonly inClosed: boolean; readonly onTarget: boolean; readonly open: boolean; readonly nextInside: boolean; readonly tabContinued: boolean }> {
    const tab = await browser.newPage();
    try {
      await tab.setViewport(WIDE.width, WIDE.height);
      await tab.navigate(write(name, html));
      const inClosed = await tab.evaluate<boolean>(`(() => {
        const row = Array.from(document.querySelectorAll('nav[aria-label="Opening index"] li')).find((li) => li.textContent.trim().startsWith('exact requirements'));
        const link = row.querySelector('a');
        const target = document.getElementById(decodeURIComponent(link.getAttribute('href').slice(1)));
        link.focus();
        return document.activeElement === link && !!target.closest('details:not([open])');
      })()`);
      await tab.press('Enter');
      await tab.evaluate(`new Promise((resolve) => setTimeout(() => resolve(true), 50))`);
      const landed = await tab.evaluate<{ readonly onTarget: boolean; readonly open: boolean; readonly nextInside: boolean }>(`(() => {
        const target = document.getElementById(location.hash.slice(1));
        const focusable = Array.from(document.querySelectorAll('a[href], summary, button, input, select, textarea')).filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);
        const next = focusable.find((element) => (target.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING) && !target.contains(element));
        window.__expectedNext = next;
        return { onTarget: document.activeElement === target, open: target.closest('details:not([open])') === null, nextInside: !!next && target.closest('details').contains(next) };
      })()`);
      await tab.press('Tab');
      const tabContinued = await tab.evaluate<boolean>(`document.activeElement === window.__expectedNext`);
      return { inClosed, ...landed, tabContinued };
    } finally { await tab.close(); }
  }

  // Review finding 1 (R-PWB-OPENING-INDEX-IMPL-1): the target begins inside
  // a disclosure closed on load. Chrome opens the disclosure on fragment
  // navigation and focuses the link, and Tab continues from it.
  it('following the exact-requirement row by keyboard lands on its target and Tab continues from it (fixture render)', async () => {
    expect(await followExactRow(variant('observed'), 'keyboard-exact')).toEqual({ inClosed: true, onTarget: true, open: true, nextInside: false, tabContinued: true });
  });

  it('the same holds where a later control shares the target\'s disclosure (synthetic body)', async () => {
    const body = `<h2>Lead</h2><details><summary>Show items</summary><p><a href="#lead">before</a> <a href="/polaris/source?identity=a">exact</a> <a href="#after">after inside</a></p></details><p><a href="#lead">outside</a></p>`;
    expect(await followExactRow(syntheticPage(body), 'keyboard-synthetic')).toEqual({ inClosed: true, onTarget: true, open: true, nextInside: true, tabContinued: true });
  });

  // A captured page, for the dated live measurement: the served bytes are
  // written by the operator (`SYZYGY_P98_PAGE`), never fetched here.
  const captured = process.env.SYZYGY_P98_PAGE;
  it.skipIf(captured === undefined)('a captured /polaris page meets the oracle at both viewports', async () => {
    const html = readFileSync(captured as string, 'utf8');
    for (const viewport of [WIDE, NARROW]) {
      const report = await run('captured', html, viewport);
      expect(report.violations).toEqual([]);
    }
  }, 60_000); // unmeasured: it runs only on an operator's capture of a served /polaris page (SYZYGY_P98_PAGE, da936967), which no hosted or local run sets; the commit holds no measurement, so this is an unmeasured residual of syzygy-bpyt.4.31

  it('a tie on the largest offset is broken by document order (synthetic body, hand-counted)', async () => {
    const report = await run('tie', syntheticPage(TIE_BODY), WIDE, false);
    expect(report.violations).toEqual([]);
    expect(report.total).toBe(11);
    expect(report.rows).toEqual([
      { identity: 'why', offset: 0 },
      { identity: 'promises', rendered: false },
      { identity: 'refusals-and-rule', rendered: false },
      { identity: 'capabilities-and-fit', rendered: false },
      { identity: 'exact-requirement', offset: 4 },
      { identity: 'unknown-or-contradiction', rendered: false },
      { identity: 'claim-strength', rendered: false },
      { identity: 'architecture-and-groups', offset: 4 },
      { identity: 'v1-success', rendered: false },
    ]);
    expect(report.setter).toBe('architecture-and-groups');
    expect(report.line).toBe('4 / 11 words');
  });

  it('with no indexed target rendered, the line follows the index and gives only the total (synthetic body, hand-counted)', async () => {
    const report = await run('none', syntheticPage(NONE_BODY), WIDE, false);
    expect(report.violations).toEqual([]);
    expect(report.total).toBe(6);
    expect(report.rows.every((row) => !('offset' in row))).toBe(true);
    expect(report.setter).toBeNull();
    expect(report.line).toBe('6 words');
  });
});
