import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { readingInput } from './dossier-reading.testkit.js';
import { renderLocalDossier } from './dossier-site.js';

// The reader's edition (syzygy-5dhm.136): the subject first, the run's own pages behind one "About this run" entry at the end of the
// navigation, the two finding pages near the top, every link resolving, and every disclosure that qualifies a claim on that claim's page.
// Expected values are literals, never read from the renderer.

type Files = ReadonlyMap<string, string>;
type Poles = NonNullable<ReturnType<typeof readingInput>['local']['poles']>;
const POLES: Poles = { whySection: 'one', poles: [
  { label: 'Why it exists', sections: ['one'] },
  { label: 'Words', sections: ['two', 'three', 'four'] },
  { label: 'The rest', sections: ['five', 'six', 'seven', 'nine', 'eight'] },
] };
const render = (): Files => { const input = readingInput(); return renderLocalDossier({ ...input, local: { ...input.local, poles: POLES } }).files; };
/** The fixture with an Unknown block on the landing page (`forms`) and a withheld item on a Pole page (`plural`). */
function disclosing(): Files {
  const input = readingInput();
  const blocks = new Map(input.local.blocks);
  blocks.set('forms', { ...blocks.get('forms')!, marking: 'unknown', unknownReason: 'missing-evidence', basis: 'no file states it' });
  blocks.set('plural', { ...blocks.get('plural')!, marking: 'unknown', unknownReason: 'excluded-content', withheld: { sources: 1, named: ['docs/held.md'] },
    segments: [{ kind: 'prose', text: 'Withheld from this dossier: it rests on 1 source file that screening withholds (docs/held.md), so its text is not shown.' }] });
  return renderLocalDossier({ ...input, local: { ...input.local, poles: POLES, blocks } }).files;
}

/** The one page-class definition the text converter and the pilot read (`scripts/dossier_page_classes.json`). */
const CLASSES_FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../scripts/dossier_page_classes.json');
interface PageClasses { readonly format: string; readonly classes: readonly { readonly class: string; readonly paths: readonly string[]; readonly prefixes: readonly string[] }[] }
const pageClass = (classes: PageClasses, page: string): string =>
  classes.classes.find(row => row.paths.includes(page) || row.prefixes.some(prefix => page.startsWith(prefix)))?.class ?? 'other';

const decode = (text: string): string => text.replace(/&quot;/gu, '"').replace(/&#39;/gu, "'").replace(/&lt;/gu, '<').replace(/&gt;/gu, '>').replace(/&amp;/gu, '&');
/** The page a link names, from the page it is on, and its fragment; null for a link out of the site. */
function target(from: string, href: string): { readonly page: string; readonly fragment: string } | null {
  const raw = decode(href);
  if (/^[a-z][a-z0-9+.-]*:/iu.test(raw) || raw.startsWith('//')) return null;
  const [file = '', fragment = ''] = raw.split('#');
  const page = file === '' ? from : path.posix.normalize(path.posix.join(path.posix.dirname(from), file));
  return { page, fragment };
}
const idsOf = (html: string): Set<string> => new Set([...html.matchAll(/ id="([^"]*)"/gu)].map(match => decode(match[1]!)));

/** Every internal link of every page, and those that do not resolve to a file of the site and, with a fragment, an id on that page. */
export function linkCensus(files: Files): { readonly links: number; readonly unresolved: readonly string[] } {
  const ids = new Map([...files].filter(([file]) => file.endsWith('.html')).map(([file, html]) => [file, idsOf(html)]));
  let links = 0;
  const unresolved: string[] = [];
  for (const [from, html] of files) {
    if (!from.endsWith('.html')) continue;
    for (const match of html.matchAll(/ href="([^"]*)"/gu)) {
      const to = target(from, match[1]!);
      if (to === null) continue;
      links += 1;
      const onPage = ids.get(to.page);
      if (onPage === undefined || (to.fragment !== '' && !onPage.has(to.fragment))) unresolved.push(`${from} -> ${match[1]}`);
    }
  }
  return { links, unresolved };
}

/** The navigation entries of a page, in order: each link's page, or the fold's summary as `[summary]`. */
function navEntries(html: string, from: string): string[] {
  const open = '<details class="contents desktop-contents nav-panel" open><summary>Contents</summary><nav aria-label="Dossier">';
  const at = html.indexOf(open);
  const nav = html.slice(at + open.length, html.indexOf('</nav>', at));
  return [...nav.matchAll(/<summary>([^<]*)<\/summary>|href="([^"]*)"/gu)].map(match => match[1] !== undefined ? `[${match[1]}]` : target(from, match[2]!)!.page);
}

/** Where the element opening at `start` closes: past its matching end tag, counting nested elements of the same name. */
function elementEnd(html: string, start: number): number {
  const name = /^<([a-z0-9]+)/u.exec(html.slice(start))![1]!;
  const tags = new RegExp(`<(/?)${name}(?=[\\s>])[^>]*>`, 'gu');
  tags.lastIndex = start;
  let depth = 0;
  for (let match = tags.exec(html); match !== null; match = tags.exec(html)) {
    depth += match[1] === '/' ? -1 : 1;
    if (depth === 0) return match.index + match[0].length;
  }
  return html.length;
}

interface MachineClaim { readonly id: string; readonly page: string; readonly epistemic: string; readonly unknownReason: string | null; readonly v15?: { readonly withheldSources?: unknown } }
/** Each Unknown or withheld claim whose disclosure is not on the page that makes the claim: its element, labelled Unknown, with its reason
 * in its text and, for a withheld item, Syzygy's words for it (`render.ts` writes "Withheld from this dossier: …"; a short label over withheld items
 * reads "Withheld item"), all inside that element. */
export function disclosuresOffTheirPage(files: Files): string[] {
  const claims = (JSON.parse(files.get('machine.json')!) as { claims: MachineClaim[] }).claims;
  const off: string[] = [];
  for (const claim of claims.filter(c => c.epistemic === 'unknown' || c.unknownReason !== null || c.v15?.withheldSources !== undefined)) {
    const html = files.get(claim.page) ?? '';
    const marker = `data-claim-id="${claim.id.replace(/&/gu, '&amp;').replace(/"/gu, '&quot;')}"`;
    const at = html.indexOf(marker);
    if (at === -1 || html.indexOf(marker, at + 1) !== -1) { off.push(`${claim.id}: on ${claim.page} ${at === -1 ? 'not at all' : 'twice'}`); continue; }
    const start = html.lastIndexOf('<', at);
    const element = html.slice(start, elementEnd(html, start));
    const tag = element.slice(0, element.indexOf('>') + 1);
    if (!tag.includes(`data-epistemic="${claim.epistemic}"`)) off.push(`${claim.id}: label not ${claim.epistemic} on ${claim.page}`);
    if (claim.epistemic === 'unknown' && !/\[Unknown\]|Not established\./u.test(element)) off.push(`${claim.id}: no Unknown marking on ${claim.page}`);
    // The reason in the element's own text, not only in an attribute, so plain-text extraction and an assistive technology read it; a
    // withheld item's reason is said by Syzygy's withheld words.
    const withheldWords = /Withheld from this dossier|Withheld item/u.test(element.slice(tag.length));
    if (claim.v15?.withheldSources !== undefined && !withheldWords) off.push(`${claim.id}: withheld words not on ${claim.page}`);
    else if (claim.unknownReason !== null && claim.v15?.withheldSources === undefined && !element.slice(tag.length).includes(claim.unknownReason)) off.push(`${claim.id}: reason ${claim.unknownReason} not on ${claim.page}`);
  }
  return off;
}

describe('the reader\'s edition (syzygy-5dhm.136)', () => {
  let files: Files;
  let classes: PageClasses;
  beforeAll(() => {
    files = render();
    classes = JSON.parse(fs.readFileSync(CLASSES_FILE, 'utf8')) as PageClasses;
  });

  it('lists the subject first, the finding pages near the top, and the run behind one entry at the end, in this literal order', () => {
    expect(navEntries(files.get('index.html')!, 'index.html')).toEqual([
      'index.html', 'find-by-task.html', 'name-index.html', 'poles/2.html', 'poles/3.html', 'contents.html', 'glossary.html', 'sources/index.html',
      '[About this run]', 'understanding.html', 'size-report.html', 'appendix.html',
    ]);
    // From a page one level down, the same entries.
    expect(navEntries(files.get('poles/2.html')!, 'poles/2.html')).toEqual(navEntries(files.get('index.html')!, 'index.html'));
    const order = (JSON.parse(files.get('dossier.json')!) as { pages: { path: string }[] }).pages.map(page => page.path).filter(page => !page.startsWith('sources/') || page === 'sources/index.html');
    expect(order).toEqual(['index.html', 'find-by-task.html', 'name-index.html', 'poles/2.html', 'poles/3.html', 'contents.html', 'glossary.html', 'sources/index.html', 'understanding.html', 'appendix.html']);
  });

  it('folds exactly the pages the one page-class definition calls run, and keeps every other page on the reading path', () => {
    expect(classes.format).toBe('polaris-dossier-page-classes/1');
    const rendered = [...files.keys()].filter(file => file.endsWith('.html') && (!file.startsWith('sources/') || file === 'sources/index.html'));
    const run = rendered.filter(page => pageClass(classes, page) === 'run').sort();
    expect(run).toEqual(['appendix.html', 'size-report.html', 'understanding.html']);
    expect(rendered.filter(page => pageClass(classes, page) === 'other')).toEqual([]);
    for (const [file, html] of files) {
      if (!file.endsWith('.html')) continue;
      const entries = navEntries(html, file);
      const fold = entries.indexOf('[About this run]');
      expect(fold, file).toBe(entries.length - 1 - run.length);
      expect(entries.slice(fold + 1).sort(), file).toEqual(run);
      expect(entries.slice(0, fold).some(page => pageClass(classes, page) === 'run'), file).toBe(false);
    }
    const contents = files.get('contents.html')!.split('<section id="contents">')[1]!;
    const about = contents.indexOf('<h2 id="about-this-run">About this run</h2>');
    expect(about).toBeGreaterThan(0);
    const linked = [...contents.matchAll(/href="([^"#]*)/gu)].map(match => ({ page: match[1]!, at: match.index! }));
    for (const link of linked) expect(link.at > about, link.page).toBe(pageClass(classes, link.page) === 'run');
  });

  it('opens the landing page with the thesis, then the map of the parts, before any section', () => {
    const main = files.get('index.html')!.split('<main')[1]!;
    const header = main.indexOf('</header>');
    expect(main.slice(header, header + '</header><nav class="pole-map"'.length)).toBe('</header><nav class="pole-map"');
    expect(main.indexOf('<section id="section-one"')).toBeGreaterThan(main.indexOf('<nav class="pole-map"'));
    expect(main.indexOf('data-claim-id="introduction"')).toBeGreaterThan(-1);
    expect(main.indexOf('data-claim-id="introduction"')).toBeLessThan(header);
  });

  it('resolves every link of the site: 432 of 432, the run pages reached from every page', () => {
    const census = linkCensus(files);
    expect(census.unresolved).toEqual([]);
    expect(census.links).toBe(432);
    // A canary for the predicate: a link to a page or a fragment the site does not hold is reported.
    const broken = new Map(files);
    broken.set('glossary.html', `${files.get('glossary.html')!}<a href="nowhere.html"></a><a href="index.html#no-such-id"></a>`);
    expect(linkCensus(broken).unresolved).toEqual(['glossary.html -> nowhere.html', 'glossary.html -> index.html#no-such-id']);
    for (const [file, html] of files) if (file.endsWith('.html')) expect(html.includes(`href="${file.includes('/') ? '../' : ''}appendix.html"`), file).toBe(true);
  });

  it('keeps every Unknown and withheld disclosure on the page that makes the claim', () => {
    const site = disclosing();
    const claims = (JSON.parse(site.get('machine.json')!) as { claims: MachineClaim[] }).claims;
    expect(claims.find(claim => claim.id === 'forms')).toMatchObject({ page: 'index.html', epistemic: 'unknown', unknownReason: 'missing-evidence' });
    expect(claims.find(claim => claim.id === 'plural')).toMatchObject({ page: 'poles/2.html', epistemic: 'unknown', unknownReason: 'excluded-content', v15: { withheldSources: 1 } });
    expect(disclosuresOffTheirPage(site)).toEqual([]);
    // Mutations of the rendered site: each moves or drops one disclosure, and each is reported.
    const index = site.get('index.html')!;
    const moved = new Map(site);
    moved.set('index.html', index.replace(/(id="block-forms">)<span class="not-established">Not established\.<\/span> ([\s\S]*?)<span class="marking unknown">\[Unknown\]<\/span>/u, '$1$2'));
    moved.set('appendix.html', `${site.get('appendix.html')!}<span class="not-established">Not established.</span>`);
    expect(disclosuresOffTheirPage(moved)).toContain('forms: no Unknown marking on index.html');
    const reasonless = new Map(site);
    reasonless.set('index.html', index.split('missing-evidence').join(''));
    expect(disclosuresOffTheirPage(reasonless)).toContain('forms: reason missing-evidence not on index.html');
    const relabelled = new Map(site);
    relabelled.set('index.html', index.replace('data-claim-id="forms" data-epistemic="unknown"', 'data-claim-id="forms" data-epistemic="inferred"'));
    expect(disclosuresOffTheirPage(relabelled)).toContain('forms: label not unknown on index.html');
    const pole = site.get('poles/2.html')!;
    const unheld = new Map(site);
    unheld.set('poles/2.html', pole.replace(/Withheld from this dossier[^<]*/u, 'Moved to the appendix.'));
    expect(disclosuresOffTheirPage(unheld)).toContain('plural: withheld words not on poles/2.html');
    const elsewhere = new Map(site);
    elsewhere.set('poles/2.html', pole.replace('data-claim-id="plural"', 'data-claim-id="moved"'));
    expect(disclosuresOffTheirPage(elsewhere)).toContain('plural: on poles/2.html not at all');
  });
});
