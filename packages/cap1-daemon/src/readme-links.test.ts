import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

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

  // Round-1 F7: the manifest names the parser that ran. A bump of either
  // pin that keeps the old string fails here: the exact pin, the lock and
  // the installed package must all name the version the string names.
  it('names the versions the package pins, the lock fixes and node_modules holds', () => {
    const read = (relative: string): unknown =>
      JSON.parse(readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8'));
    const manifest = read('../package.json') as { dependencies: Record<string, string> };
    const lock = read('../../../package-lock.json') as { packages: Record<string, { version: string }> };
    const versions = (['marked', 'parse5'] as const).map((name) => {
      const pinned = manifest.dependencies[name];
      expect(pinned).toMatch(/^\d+\.\d+\.\d+$/);
      expect(lock.packages[`node_modules/${name}`]?.version).toBe(pinned);
      expect((read(`../../../node_modules/${name}/package.json`) as { version: string }).version).toBe(pinned);
      return `${name}@${pinned}`;
    });
    expect(README_LINK_READER_VERSION).toBe(`${versions.join('+')};gfm=true`);
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

// Round-1 F1: a hazard on a link that no reading could resolve to the entry
// names some other file. It must not hide the README's truthful `no`.
describe('extractReadmeEntryLink — a hazard on an unrelated link is still no', () => {
  const cases: readonly (readonly [string, string])[] = [
    ['scoped npm package badge', '[![npm](https://img.shields.io/npm/v/x.svg)](https://www.npmjs.com/package/%40scope%2Fname)'],
    ['trailing bare percent in an absolute URL', 'Coverage is [100%](https://example.com/cov/100%)'],
    ['backslash in a relative path', '[docs](docs\\guide.md)'],
    ['raw backslash in an HTML anchor', '<a href="docs\\guide.md">docs</a>'],
    ['encoded slash in a relative path', '[b](x%2Fy)'],
    ['bare percent in a relative path', '[c](%zz)'],
    ['malformed escape that names another file', '[e](.syzygy/intent/%zzOVERVIEW.md)'],
    ['escape that is not UTF-8', '[e](.syzygy/intent/OVERVIEW.md%ff)'],
    ['tab inside an unrelated href', '<a href="docs/gu&#9;ide.md">docs</a>'],
    ['newline inside an unrelated absolute href', '<a href="https://elsewhere.example/a&#10;b">x</a>'],
  ];
  for (const [form, markdown] of cases) {
    it(`${form} → no`, () => {
      expect(extractReadmeEntryLink(markdown, NO_LINK_CONTEXT)).toStrictEqual(NO);
    });
  }

  it('a hazardous absolute link to another file through the locator → no', () => {
    const markdown = '[e](https://forge.example/owner/repo/blob/main/docs%2Fguide.md)';
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
    ['malformed percent escape', '[e](.syzygy/intent/%OVERVIEW.md)', '.syzygy/intent/%OVERVIEW.md'],
    ['trailing bare percent', '[e](.syzygy/intent/OVERVIEW.md%)', '.syzygy/intent/OVERVIEW.md%'],
    ['encoded slash', '[e](.syzygy%2Fintent/OVERVIEW.md)', '.syzygy%2Fintent/OVERVIEW.md'],
    ['encoded backslash', '[e](.syzygy%5cintent/OVERVIEW.md)', '.syzygy%5cintent/OVERVIEW.md'],
    ['raw backslash', '<a href=".syzygy\\intent\\OVERVIEW.md">e</a>', '.syzygy\\intent\\OVERVIEW.md'],
    ['encoded slash and a case variant', '[e](.syzygy%2Fintent/overview.md)', '.syzygy%2Fintent/overview.md'],
    ['climbs above the root', '[e](../.syzygy/intent/OVERVIEW.md)', '../.syzygy/intent/OVERVIEW.md'],
    ['collapsed empty segment', '[e](.syzygy//intent/OVERVIEW.md)', '.syzygy//intent/OVERVIEW.md'],
    ['case-only variant', '[e](.syzygy/intent/overview.md)', '.syzygy/intent/overview.md'],
    // Round-1 F3: the entry in directory form is not the entry file.
    ['trailing slash', '[e](.syzygy/intent/OVERVIEW.md/)', '.syzygy/intent/OVERVIEW.md/'],
    ['trailing dot segment', '[e](.syzygy/intent/OVERVIEW.md/.)', '.syzygy/intent/OVERVIEW.md/.'],
    ['trailing dot-dot segment', '[e](.syzygy/intent/OVERVIEW.md/x/..)', '.syzygy/intent/OVERVIEW.md/x/..'],
    ['root-relative trailing slash', '[e](/.syzygy/intent/OVERVIEW.md/)', '/.syzygy/intent/OVERVIEW.md/'],
    // Round-1 F2: browsers strip ASCII tab and newline from a URL, so each
    // of these opens the entry. The reader never says no to them.
    ['tab inside the path', '<a href=".syzygy/intent/OVER&#9;VIEW.md">x</a>', '.syzygy/intent/OVER\tVIEW.md'],
    ['newline inside the path', '<a href=".syzygy/intent/OVER&#10;VIEW.md">x</a>', '.syzygy/intent/OVER\nVIEW.md'],
    ['carriage return inside the path', '<a href=".syzygy/&#13;intent/OVERVIEW.md">x</a>', '.syzygy/\rintent/OVERVIEW.md'],
    ['other control inside the path', '<a href=".syzygy/intent/&#127;OVERVIEW.md">x</a>', '.syzygy/intent/\u007fOVERVIEW.md'],
  ];
  for (const [form, markdown, href] of cases) {
    it(`${form} → ambiguous-target`, () => {
      expect(extractReadmeEntryLink(markdown, NO_LINK_CONTEXT)).toStrictEqual(ambiguous(href));
    });
  }

  it('the first unclassifiable anchor is named when none qualifies', () => {
    expect(
      extractReadmeEntryLink(
        '[a](docs/x.md) [b](x%2Fy) [c](.syzygy%2Fintent/OVERVIEW.md) [d](.syzygy/intent/%OVERVIEW.md)',
        NO_LINK_CONTEXT,
      ),
    ).toStrictEqual(ambiguous('.syzygy%2Fintent/OVERVIEW.md'));
  });

  it('a hazardous absolute link that ends in the entry, with no locator', () => {
    const href = 'https://forge.example/owner/repo/blob/main/.syzygy%2Fintent/OVERVIEW.md';
    expect(extractReadmeEntryLink(`[e](${href})`, NO_LINK_CONTEXT)).toStrictEqual(ambiguous(href));
  });

  it('a hazardous absolute link that ends in the entry, through the locator', () => {
    const href = 'https://forge.example/owner/repo/blob/main/.syzygy/intent\\OVERVIEW.md';
    expect(extractReadmeEntryLink(`<a href="${href}">e</a>`, LOCATOR)).toStrictEqual(ambiguous(href));
  });

  it('the entry through the locator in directory form', () => {
    const href = 'https://forge.example/owner/repo/blob/main/.syzygy/intent/OVERVIEW.md/';
    expect(extractReadmeEntryLink(`[e](${href})`, LOCATOR)).toStrictEqual(ambiguous(href));
  });

  it('a tab inside the scheme of the entry through the locator', () => {
    const href = 'ht\ttps://forge.example/owner/repo/blob/main/.syzygy/intent/OVERVIEW.md';
    expect(
      extractReadmeEntryLink(
        '<a href="ht&#9;tps://forge.example/owner/repo/blob/main/.syzygy/intent/OVERVIEW.md">x</a>',
        LOCATOR,
      ),
    ).toStrictEqual(ambiguous(href));
  });

  it('a newline inside the host of the entry through the locator', () => {
    const href = 'https://forge.exa\nmple/owner/repo/blob/main/.syzygy/intent/OVERVIEW.md';
    expect(
      extractReadmeEntryLink(
        '<a href="https://forge.exa&#10;mple/owner/repo/blob/main/.syzygy/intent/OVERVIEW.md">x</a>',
        LOCATOR,
      ),
    ).toStrictEqual(ambiguous(href));
  });
});

// Round-1 F6: <template> content is a separate fragment in parse5's tree;
// an anchor inside it is still an anchor the walk must reach.
describe('extractReadmeEntryLink — template content', () => {
  it('an anchor inside <template> → yes', () => {
    expect(
      extractReadmeEntryLink('<template><a href=".syzygy/intent/OVERVIEW.md">e</a></template>', NO_LINK_CONTEXT),
    ).toStrictEqual(yes('.syzygy/intent/OVERVIEW.md'));
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
