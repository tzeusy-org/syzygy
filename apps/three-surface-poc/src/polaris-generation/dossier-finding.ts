import { DOSSIER_STYLE as tokens } from './dossier-style-tokens.js';
/**
 * The two finding pages of an operator-agent dossier (REQ-polaris-generation-034, the index-and-task-routes change): the generated index and the
 * find-by-task page. Both are built at render from what the site already draws, with no model call and no script.
 *
 * The index lists every name of five kinds: a glossary term, a top-level directory Syzygy derived (a unit), a file a block cites
 * or names (a notable path), an identifier the agent wrote in backticks, and a figure title. Each name links to its home (the
 * glossary entry, the derived-structure region, the source page, the figure) and to every block that names it. It is navigation:
 * it states no claim and carries no label, and every name on it is text the site already shows on another page, so it has passed
 * the screening that page's text passed. Nothing here reads a repository byte.
 *
 * A link's target is never inside a `details` element: a block drawn inside a folded element is reached through that element.
 */

import { backtickSpans } from '@syzygy/polaris-generation-core/live';

export const FIND_BY_TASK_PAGE = 'find-by-task.html';
export const NAME_INDEX_PAGE = 'name-index.html';

/** Turn a screened glossary handle into its display spelling. Fragments still use the handle. */
export function glossaryDisplayName(name: string): string {
  return name.replace(/_/gu, ' ');
}

/** Recognise the display spelling alongside the exact handle and the earlier hyphen-space form. */
export function glossaryNameForms(name: string): readonly string[] {
  return [...new Set([name, name.replace(/-/gu, ' '), glossaryDisplayName(name)])];
}

/** A place a reader can be sent: a page, a fragment on it and the words the link shows. */
export interface IndexTarget { readonly page: string; readonly fragment: string; readonly label: string }

/** One claim block as the site drew it: where it is, and the text it shows. `prose` is the agent's own text and `quoted` the
 * quotations Syzygy located for it; `fragment` is the block's own target, or its folded element's where it is drawn inside one. */
export interface IndexedBlock extends IndexTarget {
  readonly id: string;
  readonly prose: string;
  readonly quoted: string;
  readonly sourceIds: readonly string[];
}

export const INDEX_KINDS = ['term', 'unit', 'path', 'identifier', 'figure'] as const;
export type IndexKind = (typeof INDEX_KINDS)[number];

export interface IndexEntry {
  readonly kind: IndexKind;
  readonly name: string;
  /** Where the name itself lives; null for an identifier, which has no page of its own. */
  readonly home: IndexTarget | null;
  /** Every block that names it, in the order the site drew them, each place once. */
  readonly blocks: readonly IndexTarget[];
  /** A file more than `PATH_LINK_MAX` places cite or name: how many do. Its `blocks` is then empty and the entry links its source
   * page only. Absent for every other entry. */
  readonly namedBy?: number;
}

export interface NameIndexInput {
  readonly blocks: readonly IndexedBlock[];
  readonly terms: readonly { readonly id: string; readonly name: string }[];
  /** Top-level directories of the derived structure, without a trailing slash. */
  readonly units: readonly string[];
  /** Each quotable file once: its path, its source ids and the page its text is on. */
  readonly paths: readonly { readonly path: string; readonly sourceIds: readonly string[]; readonly page: string }[];
  readonly figures: readonly { readonly id: string; readonly title: string; readonly home: IndexTarget; readonly repeatedBy: readonly IndexTarget[] }[];
  /** Backticked spans a secret detector matches as a path: never an identifier of the index. */
  readonly unindexed?: readonly string[];
}

const quoteRegex = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
const WORD = '\\p{L}\\p{N}_';
/** A name as a whole word, whatever its case, with an optional plural `s`. */
const wordPattern = (forms: readonly string[]): RegExp => new RegExp(`(?<![${WORD}])(?:${forms.map(quoteRegex).join('|')})s?(?![${WORD}])`, 'iu');
/** A figure's title exactly as it is written. */
const titlePattern = (title: string): RegExp => new RegExp(`(?<![${WORD}])${quoteRegex(title)}(?![${WORD}])`, 'u');
/** A repository path written out whole: not the tail of a longer path, and not the head of one. */
const pathPattern = (path: string): RegExp => new RegExp(`(?<![${WORD}./-])${quoteRegex(path)}(?![${WORD}/-]|\\.[${WORD}])`, 'u');
/** A top-level directory as the head of a path. */
const unitPattern = (unit: string): RegExp => new RegExp(`(?<![${WORD}./-])${quoteRegex(unit)}/`, 'u');

/** A file that more places than this cite or name is one entry with a count and a link to its source page, never that many links. */
export const PATH_LINK_MAX = 24;

/** Lower-case words too common to find anything by: a backticked span that is exactly one of them is not an identifier. */
export const COMMON_WORDS: ReadonlySet<string> = new Set([
  'call', 'client', 'data', 'false', 'file', 'get', 'id', 'key', 'make', 'name', 'no', 'none', 'null', 'ok', 'run', 'server', 'set', 'test',
  'true', 'type', 'use', 'user', 'value', 'yes',
]);

/** The identifiers a block's prose writes in backticks: one token with no white space, 2 to 80 Unicode code points, holding a letter,
 * that is not an assignment (it holds no `=`, so a build flag written `NAME=value` is left out) and not one of `COMMON_WORDS`. */
export function identifiersIn(prose: string): string[] {
  const out: string[] = [];
  for (const span of backtickSpans(prose)) {
    const length = [...span].length;
    if (length >= 2 && length <= 80 && !/\s/u.test(span) && /\p{L}/u.test(span) && !span.includes('=') && !COMMON_WORDS.has(span)) out.push(span);
  }
  return out;
}

const byName = (a: { readonly name: string }, b: { readonly name: string }): number => {
  const x = a.name.toLowerCase(), y = b.name.toLowerCase();
  return x < y ? -1 : x > y ? 1 : a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
};

/** The places a predicate holds for, each once: first the places given, then each block's, numbered where several show the same words. */
function naming(blocks: readonly IndexedBlock[], names: (block: IndexedBlock) => boolean, first: readonly IndexTarget[] = []): IndexTarget[] {
  const seen = new Set<string>();
  const perLabel = new Map<string, number>();
  const out: IndexTarget[] = [];
  for (const target of first) {
    const key = `${target.page}#${target.fragment}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const nth = (perLabel.get(target.label) ?? 0) + 1;
    perLabel.set(target.label, nth);
    out.push({ page: target.page, fragment: target.fragment, label: nth === 1 ? target.label : `${target.label} (${nth})` });
  }
  for (const block of blocks) {
    const key = `${block.page}#${block.fragment}`;
    if (seen.has(key) || !names(block)) continue;
    seen.add(key);
    const nth = (perLabel.get(block.label) ?? 0) + 1;
    perLabel.set(block.label, nth);
    out.push({ page: block.page, fragment: block.fragment, label: nth === 1 ? block.label : `${block.label} (${nth})` });
  }
  return out;
}

/** The index of a drawn site. Deterministic: entries by kind in `INDEX_KINDS` order, then by name. */
export function buildNameIndex(input: NameIndexInput): IndexEntry[] {
  const shown = (block: IndexedBlock): string => `${block.prose}\n${block.quoted}`;
  const entries: IndexEntry[] = [];

  const glossary = input.terms.map((term) => ({ id: term.id, name: glossaryDisplayName(term.name) }));
  for (const term of glossary.sort(byName)) {
    const pattern = wordPattern([...new Set([term.name, term.name.replace(/-/gu, ' ')])]);
    entries.push({ kind: 'term', name: term.name, home: { page: 'glossary.html', fragment: `term-${term.id}`, label: 'Glossary entry' }, blocks: naming(input.blocks, (block) => pattern.test(shown(block))) });
  }

  const unitNames = new Set(input.units);
  for (const { unit } of [...unitNames].map((value) => ({ unit: value, name: `${value}/` })).sort(byName)) {
    const pattern = unitPattern(unit);
    entries.push({ kind: 'unit', name: `${unit}/`, home: { page: 'index.html', fragment: 'derived-structure', label: 'Derived structure' }, blocks: naming(input.blocks, (block) => pattern.test(shown(block))) });
  }

  // A notable path: a file at least one block cites or writes out. A file no block touches is on the sources list, not here.
  const pathNames = new Set<string>();
  for (const file of [...input.paths].map((value) => ({ ...value, name: value.path })).sort(byName)) {
    if (pathNames.has(file.path)) continue;
    const pattern = pathPattern(file.path);
    const ids = new Set(file.sourceIds);
    const blocks = naming(input.blocks, (block) => block.sourceIds.some((id) => ids.has(id)) || pattern.test(shown(block)));
    if (blocks.length === 0) continue;
    pathNames.add(file.path);
    const home = { page: file.page, fragment: 'exact-text', label: 'Source text' };
    entries.push(blocks.length > PATH_LINK_MAX ? { kind: 'path', name: file.path, home, blocks: [], namedBy: blocks.length } : { kind: 'path', name: file.path, home, blocks });
  }

  // An identifier: a backticked token of some block's prose that is not already a path, a unit or a term of this index.
  const taken = new Set([...pathNames, ...unitNames, ...[...unitNames].map((unit) => `${unit}/`)]);
  for (const span of input.unindexed ?? []) taken.add(span);
  const termNames = new Set(glossary.map((term) => term.name.toLowerCase()));
  const spans = new Map<string, Set<string>>();
  for (const block of input.blocks) spans.set(block.id, new Set(identifiersIn(block.prose)));
  const identifiers = new Set([...spans.values()].flatMap((own) => [...own]).filter((span) => !taken.has(span) && !termNames.has(span.toLowerCase())));
  for (const name of [...identifiers].map((value) => ({ name: value })).sort(byName)) {
    entries.push({ kind: 'identifier', name: name.name, home: null, blocks: naming(input.blocks, (block) => spans.get(block.id)!.has(name.name)) });
  }

  for (const figure of [...input.figures].map((value) => ({ ...value, name: value.title })).sort(byName)) {
    const pattern = titlePattern(figure.title);
    entries.push({ kind: 'figure', name: figure.title, home: figure.home, blocks: naming(input.blocks, (block) => pattern.test(shown(block)), figure.repeatedBy) });
  }
  return entries;
}

/** How many links an index draws: each entry's home and each of its blocks. */
export const indexLinkCount = (entries: readonly IndexEntry[]): number => entries.reduce((n, entry) => n + (entry.home === null ? 0 : 1) + entry.blocks.length, 0);

const KIND_HEADING: Readonly<Record<IndexKind, string>> = {
  term: 'Glossary terms', unit: 'Top-level directories', path: 'Files', identifier: 'Identifiers', figure: 'Figures',
};
const KIND_EMPTY: Readonly<Record<IndexKind, string>> = {
  term: 'The glossary holds no term.',
  unit: 'No top-level directory is listed: the derived structure is not established at this render, or the tree has none.',
  path: 'No block cites or names a file with admitted text.',
  identifier: 'No block writes an identifier in backticks.',
  figure: 'The dossier draws no figure.',
};
const counted = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** The index page's main content. `link` gives the href from this page to a target; `escape` is the site's own. `agentNames` is false
 * while the draft layer is Unknown, when no name of the agent's is shown anywhere and so none is indexed. */
export function renderNameIndex(entries: readonly IndexEntry[], link: (target: IndexTarget) => string, escape: (text: string) => string, agentNames: boolean): string {
  const code = (kind: IndexKind, name: string): string => (kind === 'term' || kind === 'figure' ? escape(name) : `<code>${escape(name)}</code>`);
  const anchor = (target: IndexTarget, className = ''): string => `<a${className === '' ? '' : ` class="${className}"`} href="${escape(link(target))}">${escape(target.label)}</a>`;
  const kinds = INDEX_KINDS.map((kind) => {
    const own = entries.filter((entry) => entry.kind === kind);
    const body = own.length === 0 ? `<p class="index-empty">${escape(agentNames || kind === 'unit' ? KIND_EMPTY[kind] : 'Not indexed: the draft layer is Unknown, so none of the agent\'s names is shown.')}</p>`
      : `<ul class="name-index">${own.map((entry) => `<li data-index-name="${escape(entry.name)}"><span class="index-name">${code(kind, entry.name)}</span>${entry.home === null ? '' : ` ${anchor(entry.home, 'index-home')}`}${entry.namedBy !== undefined ? ` <span class="index-many">cited or named in ${entry.namedBy} places, too many to list: open its source text</span>` : entry.blocks.length === 0 ? ' <span class="index-unnamed">named by no block</span>' : ` <span class="index-blocks">${entry.blocks.map((target) => anchor(target)).join(', ')}</span>`}</li>`).join('')}</ul>`;
    return `<section id="index-${kind}" data-index-kind="${kind}" data-index-count="${own.length}"><h2>${KIND_HEADING[kind]}</h2>${body}</section>`;
  }).join('');
  const tally = INDEX_KINDS.map((kind) => `${KIND_HEADING[kind].toLowerCase()} ${entries.filter((entry) => entry.kind === kind).length}`).join(', ');
  return `<section id="name-index" data-topics="" data-index-entries="${entries.length}" data-index-links="${indexLinkCount(entries)}"><h1>Index</h1>`
    + '<p class="index-note">Every name this dossier shows, on one page, so the browser\'s own find works over it. Syzygy built it at this render by matching each name against the text of the dossier\'s blocks; no model was called. It is navigation and makes no claim: a name with no block beside it is written out by no block, which says nothing about the project.</p>'
    + `<p class="index-counts">${counted(entries.length, 'name', 'names')} and ${counted(indexLinkCount(entries), 'link', 'links')}: ${tally}.</p>`
    + `<nav class="index-kinds" aria-label="Kinds of name"><ul>${INDEX_KINDS.map((kind) => `<li><a href="#index-${kind}">${KIND_HEADING[kind]}</a></li>`).join('')}</ul></nav>${kinds}</section>`;
}

/** What the find-by-task page says where it shows no route. */
export const NO_TASK_ROUTES = 'This run\'s draft declares no task routes, so this page has none. Syzygy writes no route of its own: a route is the authoring agent\'s claim, checked like any other.';
export const TASK_ROUTES_WITHHELD = 'The draft layer is Unknown, so the agent\'s task routes are not shown.';

export const FINDING_CSS = `.name-index{list-style:none;padding:${tokens.spacing.none};margin:${tokens.spacing.none}}.name-index>li{padding:${tokens.spacing.markInset} ${tokens.spacing.none};`
  + `border-bottom:${tokens.line.hairline} solid var(--line);overflow-wrap:anywhere}.index-name{font-weight:${tokens.type.strongWeight};margin-right:${tokens.spacing.small}}`
  + `.index-home,.index-blocks,.index-unnamed,.index-many{font-size:${tokens.type.bodySmall}}.index-unnamed,.index-many{color:var(--muted)}`
  + `.index-kinds ul,.route-list ol{display:flex;flex-wrap:wrap;gap:${tokens.spacing.tight} ${tokens.spacing.panelGap};padding:${tokens.spacing.none};list-style:none}.route-list ol{display:block}`
  + `.route-list li{padding:${tokens.spacing.stepInset} ${tokens.spacing.none}}`
  + `.task-route{margin-top:${tokens.spacing.large}}.route-where,.route-see{display:block;font-size:${tokens.type.compact};color:var(--muted);margin-top:${tokens.spacing.hintInset}}`
  + `.route-where code{overflow-wrap:anywhere}`;
