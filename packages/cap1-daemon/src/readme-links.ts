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
// Resolution (one dialect, stated here and nowhere configurable):
// - A relative href resolves from the root README, so from the repository
//   root; a leading `/` is also repository-root relative. `.` and `..`
//   segments are normalized, empty segments collapse, and query and fragment
//   are ignored for resource identity.
// - An absolute http(s) href counts only against the captured repository
//   locator: `<canonicalWebBase>/blob/<defaultBranch>/<entry path>`. Without
//   a complete locator, an absolute href whose path ends in the entry path is
//   `unclassifiable` (repository-locator-unavailable), never `no`.
// - Any other scheme (mailto:, javascript:, …) and a fragment-only href
//   name no repository file and are ignored.
// - A malformed percent escape, an encoded separator (`%2F`, `%5C`), a
//   backslash, a path that climbs above the repository root onto the entry,
//   collapsed empty segments onto the entry, or a case-only variant of the
//   entry is `unclassifiable` (ambiguous-target): the reader cannot say what
//   a renderer would open, so it says so.
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

// Decodes each '/'-separated segment. Undefined on a malformed escape, an
// encoded separator or a backslash anywhere in the path.
function decodedSegments(path: string): readonly string[] | undefined {
  if (path.includes('\\') || /%(?:2f|5c)/i.test(path)) return undefined;
  const segments: string[] = [];
  for (const raw of path.split('/')) {
    try {
      segments.push(decodeURIComponent(raw));
    } catch {
      return undefined;
    }
  }
  return segments;
}

interface Normalized {
  readonly segments: readonly string[];
  // True when `..` climbed above the root or an empty segment collapsed:
  // renderers disagree on both, so an entry reached that way is ambiguous.
  readonly irregular: boolean;
}

function normalize(segments: readonly string[]): Normalized {
  const out: string[] = [];
  let irregular = false;
  segments.forEach((segment, index) => {
    if (segment === '') {
      // A leading '' is the root-relative slash; a trailing one is a
      // directory; any other collapses.
      if (index !== 0 && index !== segments.length - 1) irregular = true;
      return;
    }
    if (segment === '.') return;
    if (segment === '..') {
      if (out.length === 0) irregular = true;
      else out.pop();
      return;
    }
    out.push(segment);
  });
  return { segments: out, irregular };
}

function verdictForRepositoryPath(normalized: Normalized): HrefVerdict {
  const joined = normalized.segments.join('/');
  if (joined === HUMAN_ENTRY_PATH) return normalized.irregular ? AMBIGUOUS : { kind: 'entry' };
  if (joined.toLowerCase() === ENTRY_LOWER) return AMBIGUOUS;
  return OTHER;
}

function endsWithEntry(segments: readonly string[]): boolean {
  if (segments.length < ENTRY_SEGMENTS.length) return false;
  const tail = segments.slice(segments.length - ENTRY_SEGMENTS.length).join('/');
  return tail.toLowerCase() === ENTRY_LOWER;
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
  const baseSegments = decodedSegments(base.pathname);
  if (baseSegments === undefined) return undefined;
  const prefix = [
    ...normalize(baseSegments).segments,
    'blob',
    ...defaultBranch.split('/').filter((segment) => segment !== ''),
  ];
  return { origin: base.origin, prefix };
}

function classifyAbsolute(href: string, locator: Locator | undefined): HrefVerdict {
  // Hazards are judged on the raw href: the URL parser would silently turn
  // a backslash into '/'.
  const rawPath = stripQueryAndFragment(href.replace(/^[A-Za-z][A-Za-z0-9+.-]*:\/\/[^/?#]*/, ''));
  const rawSegments = decodedSegments(rawPath);
  if (rawSegments === undefined) return AMBIGUOUS;
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return AMBIGUOUS;
  }
  const normalized = normalize(rawSegments);
  if (!endsWithEntry(normalized.segments)) return OTHER;
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

function classifyHref(rawHref: string, locator: Locator | undefined): HrefVerdict {
  const href = rawHref.trim();
  if (href === '' || href.startsWith('#')) return OTHER;
  if (href.startsWith('//')) return classifyAbsolute(`https:${href}`, locator);
  const scheme = /^([A-Za-z][A-Za-z0-9+.-]*):/.exec(href);
  if (scheme !== null) {
    const name = (scheme[1] as string).toLowerCase();
    return name === 'http' || name === 'https' ? classifyAbsolute(href, locator) : OTHER;
  }
  const segments = decodedSegments(stripQueryAndFragment(href));
  if (segments === undefined) return AMBIGUOUS;
  return verdictForRepositoryPath(normalize(segments));
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
