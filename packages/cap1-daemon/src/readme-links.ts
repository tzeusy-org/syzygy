import { HUMAN_ENTRY_PATH } from '@syzygy/cap1-core';
import { Marked } from 'marked';
import { parseFragment } from 'parse5';

// syzygy-u2a.7 (plan Task 6) — does a root README link to the fixed entry?
// (CAP1-REQ-050/051; RFC7-40.) The README is untrusted repository content.
// It is rendered by `marked` (GFM) into an intermediate HTML string that is
// handed ONLY to `parse5.parseFragment`; the walk reads `<a href>` values and
// the HTML is discarded. Nothing here serves, stores or executes that HTML.
//
// A hyperlink counts when its resolved target is the fixed entry
// (HUMAN_ENTRY_PATH). Inline, reference, autolink, GFM bare-URL and raw
// `<a href>` forms all reach the walk as anchors; plain text, code spans and
// blocks, HTML comments and images produce no anchor and never count.
//
// Resolution (one dialect, stated here and nowhere configurable). Every href
// is resolved by Node's built-in WHATWG URL parser (`URL`, the parser a
// browser uses; no other dependency), against the root README:
// - A relative href resolves from the root README, so from the repository
//   root; a root-relative href (a leading `/`, or the base's own scheme then
//   `/`) is also repository-root relative, as a forge renders a README. The
//   parser resolves `.`, `..` and `%2e` dot segments, a same-scheme
//   `https:path`, and query and fragment, which are ignored for identity.
// - An absolute href, or a network-path href (`//host/…`), is whatever host
//   the parser says. It counts only against the captured repository locator:
//   `<canonicalWebBase>/blob/<defaultBranch>/<entry path>`. Without a
//   complete locator, an absolute href whose path ends in the entry path is
//   `unclassifiable` (repository-locator-unavailable), never `no`.
// - Any other scheme (mailto:, javascript:, …) and a fragment-only href
//   name no repository file and are ignored.
// - A path that climbs above the repository root onto the entry, an
//   interior empty segment onto the entry, the entry in directory form (a
//   trailing `/`, `/.` or `/x/..`), or a case-only variant of the entry is
//   `unclassifiable` (ambiguous-target): the reader cannot say what a
//   renderer would open, so it says so.
// - A hazard leaves more than one reading: a malformed percent escape or one
//   that is not UTF-8, an encoded separator (`%2F`, `%5C`), a backslash
//   (the parser reads it as `/`; a renderer may not), a control character
//   (U+0000–U+001F, U+007F) left after the parser's own edge strip of C0
//   controls and space, or Unicode white space at either end (NBSP, BOM,
//   U+2003, U+3000: the parser keeps and encodes it; a trimming renderer
//   drops it). The href is then read every way a renderer might: controls
//   kept or removed, edges trimmed or not, a backslash as a separator or a
//   literal, escapes decoded or not, a bare `%` kept or dropped, case
//   folded, and the parser resolves each reading. If any reading names the
//   entry the href is `unclassifiable` (ambiguous-target), never `no`; if
//   none does, the href names some other file and is ignored. A hazard is
//   never a `yes`, and a hazard on an unrelated link never hides the
//   finding.
//
// The first anchor that resolves to the entry decides `yes`. With none, the
// first unclassifiable anchor decides `unclassifiable`; otherwise `no`.
// Deterministic: no clock, no I/O, no global parser state (a private
// `Marked` instance).

export const README_LINK_READER_VERSION =
  'marked@18.0.10+parse5@8.0.1;gfm=true' as const;

export interface ReadmeLinkContext {
  readonly canonicalWebBase: string | undefined;
  readonly defaultBranch: string | undefined;
}

export const NO_LINK_CONTEXT: ReadmeLinkContext = Object.freeze({
  canonicalWebBase: undefined,
  defaultBranch: undefined,
});

export type ReadmeEntryLinkResult =
  | {
      readonly state: 'classified';
      readonly linksToEntry: boolean;
      readonly qualifyingHref: string | undefined;
    }
  | {
      readonly state: 'unclassifiable';
      readonly reason: 'repository-locator-unavailable' | 'ambiguous-target';
      readonly href: string;
    };

const ENTRY_SEGMENTS: readonly string[] = HUMAN_ENTRY_PATH.split('/');
const ENTRY_LOWER = HUMAN_ENTRY_PATH.toLowerCase();

const MARKDOWN = new Marked({ gfm: true, async: false });

type HrefVerdict =
  | { readonly kind: 'entry' }
  | { readonly kind: 'other' }
  | { readonly kind: 'unclassifiable'; readonly reason: 'repository-locator-unavailable' | 'ambiguous-target' };

const OTHER: HrefVerdict = { kind: 'other' };
const ENTRY: HrefVerdict = { kind: 'entry' };
const AMBIGUOUS: HrefVerdict = { kind: 'unclassifiable', reason: 'ambiguous-target' };

interface ParseNode {
  readonly nodeName: string;
  readonly attrs?: readonly { readonly name: string; readonly value: string }[];
  readonly childNodes?: readonly ParseNode[];
  readonly content?: ParseNode;
}

function anchorHrefs(node: ParseNode, out: string[]): void {
  if (node.nodeName === 'a') {
    const href = node.attrs?.find((attribute) => attribute.name === 'href');
    if (href !== undefined) out.push(href.value);
  }
  for (const child of node.childNodes ?? []) anchorHrefs(child, out);
  // <template> content is a separate fragment in parse5's tree.
  if (node.content !== undefined) anchorHrefs(node.content, out);
}

function stripQueryAndFragment(href: string): string {
  const cut = href.search(/[?#]/);
  return cut === -1 ? href : href.slice(0, cut);
}

// One resolved path, split into decoded segments. `irregular` is true when
// the path climbed above the repository root, an interior empty segment
// collapsed, or the path ends in directory form: renderers disagree on all
// three, so an entry reached that way is ambiguous.
interface Normalized {
  readonly segments: readonly string[];
  readonly irregular: boolean;
}

// The segments of a URL pathname (already normalized by the WHATWG parser:
// `.`, `..`, `%2e` dot segments resolved), each percent-decoded. A trailing
// empty segment is the directory form; an interior one collapses. Undefined
// when a segment does not decode (the caller screened that as a hazard).
function pathSegments(pathname: string, climbed: boolean): Normalized | undefined {
  const raw = pathname.split('/').slice(1);
  let irregular = climbed;
  if (raw.length > 1 && raw[raw.length - 1] === '') {
    irregular = true;
    raw.pop();
  }
  const segments: string[] = [];
  for (const segment of raw) {
    if (segment === '') {
      irregular = true;
      continue;
    }
    try {
      segments.push(decodeURIComponent(segment));
    } catch {
      return undefined;
    }
  }
  return { segments, irregular };
}

function verdictForRepositoryPath(normalized: Normalized): HrefVerdict {
  const joined = normalized.segments.join('/');
  if (joined === HUMAN_ENTRY_PATH) return normalized.irregular ? AMBIGUOUS : ENTRY;
  if (joined.toLowerCase() === ENTRY_LOWER) return AMBIGUOUS;
  return OTHER;
}

function isEntry(segments: readonly string[]): boolean {
  return segments.join('/').toLowerCase() === ENTRY_LOWER;
}

function endsWithEntry(segments: readonly string[]): boolean {
  if (segments.length < ENTRY_SEGMENTS.length) return false;
  return isEntry(segments.slice(segments.length - ENTRY_SEGMENTS.length));
}

// Valid escapes decoded run by run; a run that is not UTF-8 stays literal,
// and so does a bare '%'.
function lenientDecode(text: string): string {
  return text.replace(/(?:%[0-9A-Fa-f]{2})+/g, (run) => {
    try {
      return decodeURIComponent(run);
    } catch {
      return run;
    }
  });
}

interface Locator {
  readonly origin: string;
  readonly prefix: readonly string[];
}

// The captured locator, or undefined when either half is absent or unusable.
function locatorOf(context: ReadmeLinkContext): Locator | undefined {
  const { canonicalWebBase, defaultBranch } = context;
  if (canonicalWebBase === undefined || defaultBranch === undefined || defaultBranch === '') {
    return undefined;
  }
  let base: URL;
  try {
    base = new URL(canonicalWebBase);
  } catch {
    return undefined;
  }
  if ((base.protocol !== 'https:' && base.protocol !== 'http:') || base.search !== '' || base.hash !== '') {
    return undefined;
  }
  if (base.pathname.includes('\\') || /%(?:2f|5c)/i.test(base.pathname)) return undefined;
  const baseSegments = pathSegments(base.pathname, false);
  if (baseSegments === undefined) return undefined;
  const prefix = [
    ...baseSegments.segments,
    'blob',
    ...defaultBranch.split('/').filter((segment) => segment !== ''),
  ];
  return { origin: base.origin, prefix };
}

// Every href is resolved by Node's built-in WHATWG URL parser, against
// synthetic bases that stand for the root README of the repository: two
// hosts and two sentinel root directories, so the parser itself says
// whether the href is relative to the README (it lands on the base's host)
// and whether it stayed inside the repository root (it kept the sentinel).
// The scheme is the captured locator's, or https without one.
const SENTINEL_HOSTS = ['readme-a.invalid', 'readme-b.invalid'] as const;
const SENTINEL_ROOTS = ['/syzygy-root-a/', '/syzygy-root-b/'] as const;

function resolve(href: string, base: string): URL | undefined {
  try {
    return new URL(href, base);
  } catch {
    return undefined;
  }
}

type Resolution =
  | { readonly kind: 'repository'; readonly pathname: string; readonly climbed: boolean }
  | { readonly kind: 'absolute'; readonly url: URL }
  | { readonly kind: 'unresolvable' };

// Where a hazard-free href leads. A root-relative href (one leading `/`,
// or the base's own scheme then `/`) is repository-root relative, as a
// forge renders a README; the WHATWG parser would take it to the host root.
function resolveHref(href: string, scheme: string): Resolution {
  const bases = SENTINEL_HOSTS.map((host, i) => `${scheme}//${host}${SENTINEL_ROOTS[i]}README.md`);
  const first = resolve(href, bases[0] as string);
  const second = resolve(href, bases[1] as string);
  if (first === undefined || second === undefined) return { kind: 'unresolvable' };
  if (first.host !== SENTINEL_HOSTS[0] || second.host !== SENTINEL_HOSTS[1]) {
    return first.href === second.href ? { kind: 'absolute', url: first } : { kind: 'unresolvable' };
  }
  const leadingScheme = /^([A-Za-z][A-Za-z0-9+.-]*):/.exec(href);
  const rest =
    leadingScheme !== null && `${(leadingScheme[1] as string).toLowerCase()}:` === scheme
      ? href.slice(leadingScheme[0].length)
      : href;
  const rooted = rest.startsWith('/');
  const readings = SENTINEL_ROOTS.map((root, i) =>
    rooted
      ? resolve(`${root.slice(0, -1)}${rest}`, bases[i] as string)
      : i === 0
        ? first
        : second,
  );
  const [a, b] = readings;
  if (a === undefined || b === undefined) return { kind: 'unresolvable' };
  const [rootA, rootB] = SENTINEL_ROOTS;
  // Kept under both sentinel names: a path that climbed out cannot re-enter
  // two different root directories at once.
  if (a.pathname.startsWith(rootA) && b.pathname.startsWith(rootB)) {
    return { kind: 'repository', pathname: a.pathname.slice(rootA.length - 1), climbed: false };
  }
  // It left the repository root: read it as clamped at the root, flagged.
  const clamped = resolve(rooted ? rest : href, `${scheme}//${SENTINEL_HOSTS[0]}/README.md`);
  return clamped === undefined
    ? { kind: 'unresolvable' }
    : { kind: 'repository', pathname: clamped.pathname, climbed: true };
}

function isWebScheme(url: URL): boolean {
  return url.protocol === 'https:' || url.protocol === 'http:';
}

function classifyAbsolute(url: URL, locator: Locator | undefined): HrefVerdict {
  if (!isWebScheme(url)) return OTHER;
  const normalized = pathSegments(url.pathname, false);
  if (normalized === undefined || !endsWithEntry(normalized.segments)) return OTHER;
  if (locator === undefined) {
    return { kind: 'unclassifiable', reason: 'repository-locator-unavailable' };
  }
  if (url.origin !== locator.origin) return OTHER;
  const head = normalized.segments.slice(0, locator.prefix.length);
  if (head.length !== locator.prefix.length || head.some((segment, i) => segment !== locator.prefix[i])) {
    return OTHER;
  }
  return verdictForRepositoryPath({
    segments: normalized.segments.slice(locator.prefix.length),
    irregular: normalized.irregular,
  });
}

// A hazard-free href: one reading, the WHATWG parser's.
function classifyCleanHref(href: string, locator: Locator | undefined, scheme: string): HrefVerdict {
  if (href === '' || href.startsWith('#')) return OTHER;
  const resolution = resolveHref(href, scheme);
  switch (resolution.kind) {
    case 'absolute':
      return classifyAbsolute(resolution.url, locator);
    case 'repository': {
      const normalized = pathSegments(resolution.pathname, resolution.climbed);
      return normalized === undefined ? AMBIGUOUS : verdictForRepositoryPath(normalized);
    }
    case 'unresolvable':
      // The parser refuses it; a renderer may not. Never `no` if it looks
      // like the entry.
      return readingNamesEntry(href, scheme) ? AMBIGUOUS : OTHER;
  }
}

// Does this reading of an href name the entry under any repository? Used
// only to choose between ambiguous and other; never to say yes.
function readingNamesEntry(reading: string, scheme: string): boolean {
  const resolution = resolveHref(reading, scheme);
  if (resolution.kind === 'unresolvable') {
    const path = lenientDecode(stripQueryAndFragment(reading)).replace(/\\/g, '/');
    return endsWithEntry(path.split('/').filter((segment) => segment !== ''));
  }
  const pathname = resolution.kind === 'absolute' ? resolution.url.pathname : resolution.pathname;
  if (resolution.kind === 'absolute' && !isWebScheme(resolution.url)) return false;
  const segments = pathname
    .split('/')
    .filter((segment) => segment !== '')
    .map((segment) => lenientDecode(segment));
  return resolution.kind === 'absolute' ? endsWithEntry(segments) : isEntry(segments);
}

// What the WHATWG parser strips from either end of a URL string: C0
// controls and U+0020. Anything else at an end is kept (and encoded).
const URL_EDGE = /^[\u0000- ]+|[\u0000- ]+$/g;
// A control character left inside an href: the WHATWG parser removes tab
// and newline and encodes the rest; other renderers may not.
const CONTROL = /[\u0000-\u001F\u007F]/;
const CONTROLS = /[\u0000-\u001F\u007F]/g;
// Unicode white space at an end that the parser keeps but a trimming
// renderer drops (NBSP, BOM, U+2003, U+3000, …).
const EDGE_SPACE = /^\s|\s$/u;

// A hazard leaves more than one reading of the href: renderers disagree.
function hasHazard(href: string): boolean {
  if (CONTROL.test(href) || EDGE_SPACE.test(href) || href.includes('\\')) return true;
  const path = stripQueryAndFragment(href);
  if (/%(?:2f|5c)/i.test(path) || /%(?![0-9A-Fa-f]{2})/.test(path)) return true;
  for (const run of path.match(/(?:%[0-9A-Fa-f]{2})+/g) ?? []) {
    try {
      decodeURIComponent(run);
    } catch {
      return true;
    }
  }
  return false;
}

// Every reading a renderer might take of a hazardous href: controls kept
// or removed, Unicode edge space kept or trimmed, a backslash as a
// separator or a literal character, escapes decoded or not, a bare `%`
// kept or dropped. The parser then resolves each reading.
function hazardReadings(href: string): readonly string[] {
  const readings = new Set<string>();
  for (const controls of [href, href.replace(CONTROLS, '')]) {
    for (const edges of [controls, controls.trim()]) {
      for (const slashes of [edges, edges.replace(/\\/g, '/'), edges.replace(/\\/g, '%5C')]) {
        for (const escapes of [slashes, lenientDecode(slashes)]) {
          readings.add(escapes);
          readings.add(escapes.replace(/%(?![0-9A-Fa-f]{2})/g, ''));
        }
      }
    }
  }
  return [...readings];
}

function classifyHref(rawHref: string, locator: Locator | undefined): HrefVerdict {
  const href = rawHref.replace(URL_EDGE, '');
  const scheme = locator === undefined ? 'https:' : new URL(locator.origin).protocol;
  if (!hasHazard(href)) return classifyCleanHref(href, locator, scheme);
  return hazardReadings(href).some((reading) => readingNamesEntry(reading, scheme)) ? AMBIGUOUS : OTHER;
}

/**
 * Classify whether `markdown` (a root README's decoded text) links to the
 * fixed entry. Pure and deterministic.
 */
export function extractReadmeEntryLink(
  markdown: string,
  context: ReadmeLinkContext,
): ReadmeEntryLinkResult {
  const html = MARKDOWN.parse(markdown, { async: false });
  const hrefs: string[] = [];
  anchorHrefs(parseFragment(html) as unknown as ParseNode, hrefs);

  const locator = locatorOf(context);
  let firstUnclassifiable: Extract<ReadmeEntryLinkResult, { state: 'unclassifiable' }> | undefined;
  for (const href of hrefs) {
    const verdict = classifyHref(href, locator);
    if (verdict.kind === 'entry') {
      return { state: 'classified', linksToEntry: true, qualifyingHref: href };
    }
    if (verdict.kind === 'unclassifiable' && firstUnclassifiable === undefined) {
      firstUnclassifiable = { state: 'unclassifiable', reason: verdict.reason, href };
    }
  }
  return firstUnclassifiable ?? { state: 'classified', linksToEntry: false, qualifyingHref: undefined };
}
