import { describe, expect, it } from 'vitest';

import {
  extractReadmeEntryLink,
  NO_LINK_CONTEXT,
  README_LINK_READER_VERSION,
  type ReadmeLinkContext,
} from './readme-links.js';

// syzygy-u2a.7 — the semantic README hyperlink matrix (CAP1-REQ-050/051).
// Every expected result is a literal of this file. The entry path is spelled
// out here, never imported, so a moved constant fails these tests.

const LOCATOR: ReadmeLinkContext = {
  canonicalWebBase: 'https://forge.example/owner/repo',
  defaultBranch: 'main',
};

const yes = (href: string) => ({ state: 'classified', linksToEntry: true, qualifyingHref: href });
const NO = { state: 'classified', linksToEntry: false, qualifyingHref: undefined };
const ambiguous = (href: string) => ({ state: 'unclassifiable', reason: 'ambiguous-target', href });
const locatorUnavailable = (href: string) => ({
  state: 'unclassifiable',
  reason: 'repository-locator-unavailable',
  href,
});

describe('README_LINK_READER_VERSION', () => {
  it('names both exact parser pins and the GFM setting', () => {
    expect(README_LINK_READER_VERSION).toBe('marked@18.0.10+parse5@8.0.1;gfm=true');
  });
});

describe('extractReadmeEntryLink — hyperlink forms that count', () => {
  const cases: readonly (readonly [string, string, string])[] = [
    ['inline', 'See [the entry](.syzygy/intent/OVERVIEW.md).', '.syzygy/intent/OVERVIEW.md'],
    ['inline with title', '[e](.syzygy/intent/OVERVIEW.md "Overview")', '.syzygy/intent/OVERVIEW.md'],
    ['reference', '[e][ov]\n\n[ov]: ./.syzygy/intent/OVERVIEW.md', './.syzygy/intent/OVERVIEW.md'],
    ['raw HTML anchor', '<a href=".syzygy/intent/OVERVIEW.md">entry</a>', '.syzygy/intent/OVERVIEW.md'],
    ['root-relative', '[e](/.syzygy/intent/OVERVIEW.md)', '/.syzygy/intent/OVERVIEW.md'],
    ['dot segments', '[e](docs/../.syzygy/./intent/OVERVIEW.md)', 'docs/../.syzygy/./intent/OVERVIEW.md'],
    ['query and fragment ignored', '[e](.syzygy/intent/OVERVIEW.md?plain=1#top)', '.syzygy/intent/OVERVIEW.md?plain=1#top'],
    ['valid percent escape', '[e](.syzygy/intent/%4FVERVIEW.md)', '.syzygy/intent/%4FVERVIEW.md'],
  ];
  for (const [form, markdown, href] of cases) {
    it(`${form} → yes`, () => {
      expect(extractReadmeEntryLink(markdown, NO_LINK_CONTEXT)).toStrictEqual(yes(href));
    });
  }

  it('an autolink through the captured locator → yes', () => {
    const href = 'https://forge.example/owner/repo/blob/main/.syzygy/intent/OVERVIEW.md';
    expect(extractReadmeEntryLink(`<${href}>`, LOCATOR)).toStrictEqual(yes(href));
  });

  it('a GFM bare URL through the captured locator → yes', () => {
    const href = 'https://forge.example/owner/repo/blob/main/.syzygy/intent/OVERVIEW.md';
    expect(extractReadmeEntryLink(`Read ${href} first.`, LOCATOR)).toStrictEqual(yes(href));
  });

  it('the first qualifying anchor decides, even after an unclassifiable one', () => {
    expect(
      extractReadmeEntryLink('[x](a%zz) and [e](.syzygy/intent/OVERVIEW.md)', NO_LINK_CONTEXT),
    ).toStrictEqual(yes('.syzygy/intent/OVERVIEW.md'));
  });
});

describe('extractReadmeEntryLink — text that is not a hyperlink to the entry', () => {
  const cases: readonly (readonly [string, string])[] = [
    ['plain text', 'The entry lives at .syzygy/intent/OVERVIEW.md in this repository.'],
    ['code span', 'Use `[e](.syzygy/intent/OVERVIEW.md)` as the link.'],
    ['fenced code', '```md\n[e](.syzygy/intent/OVERVIEW.md)\n```'],
    ['indented code', '    <a href=".syzygy/intent/OVERVIEW.md">e</a>'],
    ['HTML comment', '<!-- [e](.syzygy/intent/OVERVIEW.md) -->'],
    ['image', '![entry](.syzygy/intent/OVERVIEW.md)'],
    ['different target', '[e](.syzygy/intent/README.md)'],
    ['near match: suffix', '[e](.syzygy/intent/OVERVIEW.mdx)'],
    ['near match: nested', '[e](docs/.syzygy/intent/OVERVIEW.md)'],
    ['anchor without href', '<a name=".syzygy/intent/OVERVIEW.md">e</a>'],
    ['fragment only', '[e](#syzygyintentoverviewmd)'],
    ['other scheme', '[e](mailto:owner@example.com?subject=.syzygy/intent/OVERVIEW.md)'],
    ['unrelated absolute URL', '[e](https://elsewhere.example/docs/index.html)'],
    ['no links at all', '# Title\n\nJust prose.\n'],
    ['empty document', ''],
  ];
  for (const [form, markdown] of cases) {
    it(`${form} → no`, () => {
      expect(extractReadmeEntryLink(markdown, NO_LINK_CONTEXT)).toStrictEqual(NO);
    });
  }

  it('an absolute link to another repository through the locator → no', () => {
    const markdown = '[e](https://forge.example/other/repo/blob/main/.syzygy/intent/OVERVIEW.md)';
    expect(extractReadmeEntryLink(markdown, LOCATOR)).toStrictEqual(NO);
  });

  it('an absolute link to another branch through the locator → no', () => {
    const markdown = '[e](https://forge.example/owner/repo/blob/dev/.syzygy/intent/OVERVIEW.md)';
    expect(extractReadmeEntryLink(markdown, LOCATOR)).toStrictEqual(NO);
  });

  it('an absolute link on another origin through the locator → no', () => {
    const markdown = '[e](https://mirror.example/owner/repo/blob/main/.syzygy/intent/OVERVIEW.md)';
    expect(extractReadmeEntryLink(markdown, LOCATOR)).toStrictEqual(NO);
  });
});

describe('extractReadmeEntryLink — unclassifiable, never no', () => {
  it('a target-looking absolute link with no captured locator', () => {
    const href = 'https://forge.example/owner/repo/blob/main/.syzygy/intent/OVERVIEW.md';
    expect(extractReadmeEntryLink(`[e](${href})`, NO_LINK_CONTEXT)).toStrictEqual(
      locatorUnavailable(href),
    );
  });

  it('a target-looking absolute link with half a locator', () => {
    const href = 'https://forge.example/owner/repo/blob/main/.syzygy/intent/OVERVIEW.md';
    expect(
      extractReadmeEntryLink(`[e](${href})`, { canonicalWebBase: LOCATOR.canonicalWebBase, defaultBranch: undefined }),
    ).toStrictEqual(locatorUnavailable(href));
  });

  it('a protocol-relative target-looking link with no locator', () => {
    const href = '//forge.example/owner/repo/blob/main/.syzygy/intent/OVERVIEW.md';
    expect(extractReadmeEntryLink(`<a href="${href}">e</a>`, NO_LINK_CONTEXT)).toStrictEqual(
      locatorUnavailable(href),
    );
  });

  const cases: readonly (readonly [string, string, string])[] = [
    ['malformed percent escape', '[e](.syzygy/intent/%zzOVERVIEW.md)', '.syzygy/intent/%zzOVERVIEW.md'],
    ['encoded slash', '[e](.syzygy%2Fintent/OVERVIEW.md)', '.syzygy%2Fintent/OVERVIEW.md'],
    ['encoded backslash', '[e](.syzygy%5cintent/OVERVIEW.md)', '.syzygy%5cintent/OVERVIEW.md'],
    ['raw backslash', '<a href=".syzygy\\intent\\OVERVIEW.md">e</a>', '.syzygy\\intent\\OVERVIEW.md'],
    ['climbs above the root', '[e](../.syzygy/intent/OVERVIEW.md)', '../.syzygy/intent/OVERVIEW.md'],
    ['collapsed empty segment', '[e](.syzygy//intent/OVERVIEW.md)', '.syzygy//intent/OVERVIEW.md'],
    ['case-only variant', '[e](.syzygy/intent/overview.md)', '.syzygy/intent/overview.md'],
  ];
  for (const [form, markdown, href] of cases) {
    it(`${form} → ambiguous-target`, () => {
      expect(extractReadmeEntryLink(markdown, NO_LINK_CONTEXT)).toStrictEqual(ambiguous(href));
    });
  }

  it('the first unclassifiable anchor is named when none qualifies', () => {
    expect(
      extractReadmeEntryLink('[a](docs/x.md) [b](x%2Fy) [c](%zz)', NO_LINK_CONTEXT),
    ).toStrictEqual(ambiguous('x%2Fy'));
  });
});

describe('extractReadmeEntryLink — determinism', () => {
  it('the same bytes and context give the same result, call after call', () => {
    const markdown = '[e](.syzygy/intent/OVERVIEW.md) <https://forge.example/x>';
    const first = extractReadmeEntryLink(markdown, LOCATOR);
    for (let i = 0; i < 5; i += 1) {
      expect(extractReadmeEntryLink(markdown, LOCATOR)).toStrictEqual(first);
    }
  });
});
