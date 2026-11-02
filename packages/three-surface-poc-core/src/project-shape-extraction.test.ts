// PWB-REQ-002 — two independent extractors apply the literal grammar.
//
// The module under test is a line parser. The oracle below is a second,
// regex-only extractor written from the spec's "Reader definitions" without
// reading the module; the two must mint the same identities and the same
// per-class denominators over every fixture, and the module must yield no
// partial set on any malformed fixture.

import { isDeepStrictEqual } from 'node:util';

import { describe, expect, it } from 'vitest';

import { maskMarkdownCodeContexts } from './markdown-code-context.js';
import { EXTRACTION_CLASSES, type ExtractionClass } from './project-shape-manifest.js';
import {
  CATALOG_HEADINGS,
  EXTRACTION_FAILURES,
  PROJECT_ACCOUNT_KEYS,
  extractClass,
  extractRootIndex,
  extractSource,
  semanticCellText,
  type ExtractedItem,
  type RootIndexExtraction,
  type SourceExtraction,
} from './project-shape-extraction.js';
import { ParsePassBudgetExceeded, type ParsePassIdentity } from './resource-ledger.js';

// ---------------------------------------------------------------------
// Fixtures — hand-written in the literal grammar. Composed characters use
// NFD in the source (e.g. "é") so the NFC requirement is observable.

const VISION = [
  '# Butlers',
  '',
  'Intro paragraph mentioning ## What Butlers Is inline, which is not a heading.',
  '',
  '## What Butlers Is',
  '',
  'A household of agents that keep promises.',
  '',
  '### Detail',
  '',
  'Nested detail belongs to the purpose section.',
  '',
  '## What Success Looks Like',
  '',
  '- Every promise is visible.',
  '- Nothing is inferred silently.',
  '  - a nested bullet mints nothing',
  '',
  '  continuation text',
  '* Cafe\u0301 keeps its accent.',
  '',
  '## What Butlers Is Not',
  '',
  'Not a chat toy.',
  '',
  '## Non-Negotiable Rules',
  '',
  '1. **Fail closed** — silence is Unknown.',
  '2. **Cite or stay quiet** — every claim carries a source.',
  '',
  '```',
  '## Not A Heading',
  '3. **Fenced rule** — never counted.',
  '```',
  '',
  '3. **Cafe\u0301 rule** — composed key.',
  '',
  '## Appendix',
  '',
  '1. **Not a principle** — outside the rules section.',
  '',
].join('\n');

const ARCHITECTURE = ['# Architecture', '', 'Preamble.', '', '## Runtime', '', 'One process.', '', '## Storage', '', 'One database.', ''].join('\n');

const V1 = [
  '# v1',
  '',
  '## What v1 Ships',
  '',
  'Ships text.',
  '',
  '### Core Infrastructure',
  '',
  '- **Bus** - the message bus',
  '- `scheduler` — the clock',
  '',
  '### Staffers',
  '',
  '- **Butler Prime** – the first staffer',
  '',
  '### Butlers',
  '',
  '### Modules',
  '',
  '- **Mail** - mail module',
  '',
  '### Connectors',
  '',
  '- `whatsapp` - connector',
  '',
  '### Dashboard',
  '',
  '### Identity System',
  '',
  '- **Identity** - resolution',
  '',
  '### Situational Awareness',
  '',
  '### Observability',
  '',
  '- **Tracing** - spans',
  '',
  '## What v1 Defers',
  '',
  'Defers text.',
  '',
  '## Success Criteria',
  '',
  '1. Ships on time.',
  '2. Stays honest.',
  '',
].join('\n');

const LORE_README = [
  '# Legends and Lore',
  '',
  '## Index',
  '',
  '| Contract | Status |',
  '| --- | --- |',
  '| [RFC 0001](0001.md) | accepted |',
  '| [RFC 0002](0002.md) | candidate |',
  '',
  '## Other',
  '',
  '| Contract | Status |',
  '|---|---|',
  '| [RFC 0099](0099.md) | not indexed |',
  '',
].join('\n');

const COMPONENTS = [
  '# Components',
  '',
  '## Overview',
  '',
  '| Name | Role |',
  '|---|---|',
  '| **Ignored** | no ordinal |',
  '',
  '## 1 Runtime',
  '',
  '| Component | Role |',
  '|---|---|',
  '| **Daemon** | serves |',
  '| **Store** | keeps |',
  '',
  '## 2a Adapters',
  '',
  'Prose.',
  '',
  '| Component | Role |',
  '|---|---|',
  '| **Daemon** | same label, other ordinal |',
  '',
  '## 12. Tools',
  '',
  '| Component | Role |',
  '|---|---|',
  '| **cli** | drives |',
  '',
  '## 3ab Not an ordinal',
  '',
  '| Component | Role |',
  '|---|---|',
  '| **Ghost** | never minted |',
  '',
].join('\n');

const CRAFT_README = [
  '# Craft and Care',
  '',
  '### Reading Order',
  '',
  '| Order | File | Why |',
  '|---|---|---|',
  '| 1 | [Spec policy](policies/cc-spec.md) | first |',
  '| 2 | [Impact](./cc-impact.md#top) | second |',
  '',
].join('\n');

const ROSTER = ['# comment', '', '[meta]', 'name = "not this one"', '', '[butler]', 'kind = "x"', 'name = "Alfred"  # trailing', ''].join('\n');

interface Fixture {
  readonly path: string;
  readonly classes: readonly ExtractionClass[];
  readonly text: string;
}

const FIXTURES: readonly Fixture[] = [
  { path: 'heart-and-soul/vision.md', classes: ['project-account-section', 'principle', 'success-criterion'], text: VISION },
  { path: 'heart-and-soul/architecture.md', classes: ['project-account-section'], text: ARCHITECTURE },
  { path: 'heart-and-soul/v1.md', classes: ['project-account-section', 'success-criterion', 'catalog-entry'], text: V1 },
  { path: 'legends-and-lore/README.md', classes: ['design-contract'], text: LORE_README },
  { path: 'lay-and-land/components.md', classes: ['topology-component'], text: COMPONENTS },
  { path: 'craft-and-care/README.md', classes: ['craft-policy'], text: CRAFT_README },
  { path: 'roster/alfred/butler.toml', classes: ['roster-identity'], text: ROSTER },
  { path: 'openspec/specs/identity/spec.md', classes: ['baseline-spec'], text: '# spec\n' },
];

// ---------------------------------------------------------------------
// Oracle — a regex-only reading of the grammar, independent of the module.

const N = (s: string): string => s.normalize('NFC');

// It reads plain column-0 fences, which is every fence in the fixtures above; the module reads the PWB-REQ-006 profile's fences (indent, closer
// shapes, recovery), which the describe at the end of this file pins.
function stripFences(text: string): string {
  return text.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[ \t]*$/gm, '');
}

// Body of the H<level> heading with exact text: from the heading line to
// the next heading of level <= level.
function sectionBody(text: string, level: number, heading: string): string | undefined {
  const hashes = '#'.repeat(level);
  const src = stripFences(text);
  const re = new RegExp(`^${hashes} ${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[ \\t]*$`, 'm');
  const m = re.exec(src);
  if (!m) return undefined;
  const after = src.slice(m.index + m[0].length);
  const stop = new RegExp(`^#{1,${level}} `, 'm').exec(after);
  return stop ? after.slice(0, stop.index) : after;
}

function topLevelItems(body: string, marker: 'decimal' | 'bullet' | 'any'): string[] {
  const re = marker === 'decimal' ? /^\d+[.)] +(.+)$/gm : marker === 'bullet' ? /^[-*+] +(.+)$/gm : /^(?:\d+[.)]|[-*+]) +(.+)$/gm;
  return [...body.matchAll(re)].map((m) => N((m[1] as string).trim()));
}

function tableRowsAfter(body: string): string[][] | undefined {
  const m = /^\|.*\n\|?[ \t]*:?-+.*\n((?:\|.*\n?)*)/m.exec(body);
  if (!m) return undefined;
  return (m[1] as string)
    .split('\n')
    .filter((l) => l.startsWith('|'))
    .map((l) =>
      l
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((c) => N(c.trim())),
    );
}

function oracle(fixture: Fixture): ReadonlyMap<ExtractionClass, readonly string[]> {
  const out = new Map<ExtractionClass, string[]>();
  const base = fixture.path.split('/').pop() as string;
  for (const cls of fixture.classes) {
    const keys: string[] = [];
    switch (cls) {
      case 'project-account-section': {
        if (base === 'vision.md') keys.push('purpose', 'promises', 'refusals');
        if (base === 'architecture.md' && /^## /m.test(stripFences(fixture.text))) keys.push('architecture');
        if (base === 'v1.md') keys.push('v1-scope', 'v1-success');
        break;
      }
      case 'principle': {
        const body = sectionBody(fixture.text, 2, 'Non-Negotiable Rules') as string;
        for (const item of topLevelItems(body, 'decimal')) keys.push(N((/^\*\*(.+?)\*\*/.exec(item) as RegExpExecArray)[1] as string));
        break;
      }
      case 'success-criterion': {
        const prefix = base === 'vision.md' ? 'vision' : 'v1';
        const body = sectionBody(fixture.text, 2, prefix === 'vision' ? 'What Success Looks Like' : 'Success Criteria') as string;
        topLevelItems(body, 'any').forEach((_, i) => keys.push(`${prefix}:${i + 1}`));
        break;
      }
      case 'catalog-entry': {
        for (const h of CATALOG_HEADINGS) {
          const body = sectionBody(fixture.text, 3, h) as string;
          for (const item of topLevelItems(body, 'bullet')) {
            const m = /^(?:\*\*(.+?)\*\*|`(.+?)`) *[-–—]/.exec(item) as RegExpExecArray;
            keys.push(N((m[1] ?? m[2]) as string));
          }
        }
        break;
      }
      case 'design-contract': {
        const rows = tableRowsAfter(sectionBody(fixture.text, 2, 'Index') as string) as string[][];
        for (const row of rows) keys.push(N((/^\[(.+?)\]\(/.exec(row[0] as string) as RegExpExecArray)[1] as string));
        break;
      }
      case 'baseline-spec':
        keys.push((/^openspec\/specs\/([^/]+)\/spec\.md$/.exec(fixture.path) as RegExpExecArray)[1] as string);
        break;
      case 'topology-component': {
        const src = stripFences(fixture.text);
        for (const m of src.matchAll(/^## (\d+[a-z]?)\b[^\n]*\n([\s\S]*?)(?=^## |(?![\s\S]))/gm)) {
          const ordinal = m[1] as string;
          const body = m[2] as string;
          for (const table of body.matchAll(/^\|.*\n\|?[ \t]*:?-+.*\n((?:\|.*\n?)*)/gm)) {
            for (const line of (table[1] as string).split('\n').filter((l) => l.startsWith('|'))) {
              const first = (line.replace(/^\|/, '').split('|')[0] as string).trim();
              keys.push(`${ordinal}:${N((/^\*\*(.+)\*\*$/.exec(first) as RegExpExecArray)[1] as string)}`);
            }
          }
        }
        break;
      }
      case 'craft-policy': {
        const src = stripFences(fixture.text);
        const m = /^#{1,6} Reading Order[ \t]*$/m.exec(src) as RegExpExecArray;
        const body = src.slice(m.index + m[0].length);
        const header = (/^\|(.*)\|?$/m.exec(body) as RegExpExecArray)[1] as string;
        const column = header.split('|').map((c) => c.trim()).indexOf('File');
        for (const row of tableRowsAfter(body) as string[][]) {
          const target = (/\]\(([^)#\s]+)/.exec(row[column] as string) as RegExpExecArray)[1] as string;
          keys.push(N(target.split('/').pop() as string));
        }
        break;
      }
      case 'roster-identity': {
        const table = /^\[butler\][^\n]*\n((?:(?!^\[)[^\n]*\n?)*)/m.exec(fixture.text) as RegExpExecArray;
        const name = /^name *= *"([^"]*)"/m.exec(table[1] as string) as RegExpExecArray;
        if ((name[1] as string).length > 0) keys.push((/^roster\/([^/]+)\/butler\.toml$/.exec(fixture.path) as RegExpExecArray)[1] as string);
        break;
      }
    }
    out.set(cls, keys);
  }
  return out;
}

// ---------------------------------------------------------------------

const extracted = (f: Fixture): SourceExtraction & { kind: 'extracted' } => {
  const r = extractSource({ path: f.path, extractionClasses: f.classes }, f.text);
  if (r.kind !== 'extracted') throw new Error(`${f.path}: ${JSON.stringify(r.kind === 'unknown' ? r.failure : r.breach)}`);
  return r;
};

const keysOf = (r: SourceExtraction & { kind: 'extracted' }, cls: ExtractionClass): string[] =>
  r.items.filter((i) => i.class === cls).map((i) => i.key);

describe('PWB-REQ-002 — two independent extractors agree on every fixture', () => {
  for (const fixture of FIXTURES) {
    it(`${fixture.path} mints the oracle's identities and denominators`, () => {
      const result = extracted(fixture);
      const expected = oracle(fixture);
      expect(result.classes).toEqual(fixture.classes);
      for (const cls of fixture.classes) {
        expect(keysOf(result, cls)).toEqual(expected.get(cls));
        expect(result.denominators[cls]).toBe((expected.get(cls) as string[]).length);
      }
      // Every item's class is one the manifest assigned to this source.
      expect(result.items.every((i) => fixture.classes.includes(i.class))).toBe(true);
      // Identity is (class, key); anchors are the source path and a line.
      for (const item of result.items) {
        expect(item.path).toBe(fixture.path);
        expect(item.line).toBeGreaterThanOrEqual(1);
        expect(item.key).toBe(item.key.normalize('NFC'));
        expect(item.key.length).toBeGreaterThan(0);
      }
    });
  }

  it('the six project-account keys are minted exactly once across the three account files', () => {
    const keys = FIXTURES.filter((f) => f.classes.includes('project-account-section')).flatMap((f) => keysOf(extracted(f), 'project-account-section'));
    expect([...keys].sort()).toEqual([...PROJECT_ACCOUNT_KEYS].sort());
  });

  it('hand-typed expectations pin the grammar on the vision fixture', () => {
    const r = extracted(FIXTURES[0] as Fixture);
    expect(keysOf(r, 'principle')).toEqual(['Fail closed', 'Cite or stay quiet', 'Café rule']);
    expect(keysOf(r, 'success-criterion')).toEqual(['vision:1', 'vision:2', 'vision:3']);
    expect(r.denominators).toEqual({ 'project-account-section': 3, principle: 3, 'success-criterion': 3 });
    const purpose = r.items.find((i) => i.key === 'purpose') as ExtractedItem;
    expect(purpose.line).toBe(5);
    expect(purpose.statement).toBe('A household of agents that keep promises.\n\n### Detail\n\nNested detail belongs to the purpose section.');
    const third = r.items.find((i) => i.key === 'vision:3') as ExtractedItem;
    expect(third.statement).toBe('Café keeps its accent.');
  });

  it('hand-typed expectations pin the grammar on the v1, lore, components, craft and roster fixtures', () => {
    const v1 = extracted(FIXTURES[2] as Fixture);
    expect(keysOf(v1, 'catalog-entry')).toEqual(['Bus', 'scheduler', 'Butler Prime', 'Mail', 'whatsapp', 'Identity', 'Tracing']);
    expect(v1.items.filter((i) => i.class === 'catalog-entry').map((i) => i.context)).toEqual([
      'Core Infrastructure',
      'Core Infrastructure',
      'Staffers',
      'Modules',
      'Connectors',
      'Identity System',
      'Observability',
    ]);
    expect(keysOf(v1, 'success-criterion')).toEqual(['v1:1', 'v1:2']);
    const scope = v1.items.find((i) => i.key === 'v1-scope') as ExtractedItem;
    expect(scope.statement?.startsWith('What v1 Ships\n\nShips text.')).toBe(true);
    expect(scope.statement?.endsWith('What v1 Defers\n\nDefers text.')).toBe(true);
    expect(keysOf(extracted(FIXTURES[3] as Fixture), 'design-contract')).toEqual(['RFC 0001', 'RFC 0002']);
    expect(keysOf(extracted(FIXTURES[4] as Fixture), 'topology-component')).toEqual(['1:Daemon', '1:Store', '2a:Daemon', '12:cli']);
    expect(keysOf(extracted(FIXTURES[5] as Fixture), 'craft-policy')).toEqual(['cc-spec.md', 'cc-impact.md']);
    const roster = extracted(FIXTURES[6] as Fixture);
    expect(roster.items).toEqual([{ class: 'roster-identity', key: 'alfred', path: 'roster/alfred/butler.toml', line: 8, context: 'Alfred' }]);
    const arch = extracted(FIXTURES[1] as Fixture);
    expect((arch.items[0] as ExtractedItem).statement).toBe('Runtime\n\nOne process.\n\nStorage\n\nOne database.');
  });

  it('never emits HTML or body text beyond the declared statement', () => {
    for (const fixture of FIXTURES) {
      const json = JSON.stringify(extracted(fixture));
      expect(json).not.toMatch(/<[a-z]/i);
      expect(json).not.toContain('"text"');
    }
  });

  it('preserves every indented continuation line of a principle declaration', () => {
    const text = VISION.replace('1. **Fail closed** — silence is Unknown.', '1. **Fail closed** — silence is Unknown.\n   The declaration continues here.\n   And remains complete.');
    const result = extractClass('principle', 'heart-and-soul/vision.md', text);
    expect(result.kind).toBe('items');
    if (result.kind === 'items') expect(result.items[0]?.statement).toBe('**Fail closed** — silence is Unknown.\nThe declaration continues here.\nAnd remains complete.');
  });

  it.each([
    ['success-criterion' as const, 'heart-and-soul/vision.md', VISION.replace('- Every promise is visible.', '- Every promise is visible.\n  Including its wrapped qualification.'), 'Every promise is visible.\nIncluding its wrapped qualification.'],
    ['catalog-entry' as const, 'heart-and-soul/v1.md', V1.replace('- **Mail** - mail module', '- **Mail** - mail module\n  with its complete declared boundary.'), '**Mail** - mail module\nwith its complete declared boundary.'],
    ['principle' as const, 'heart-and-soul/vision.md', VISION.replace('1. **Fail closed** — silence is Unknown.', '1. **Fail\n   closed** — silence is Unknown.'), '**Fail\nclosed** — silence is Unknown.'],
    ['catalog-entry' as const, 'heart-and-soul/v1.md', V1.replace('- **Mail** - mail module', '- **Mail**\n  - mail module'), '**Mail**\n- mail module'],
  ])('preserves multiline %s declarations without minting a second item', (cls, path, text, expected) => {
    const result = extractClass(cls, path, text);
    expect(result.kind).toBe('items');
    if (result.kind === 'items') expect(result.items.find((item) => item.statement === expected)).toBeDefined();
  });
});

// ---------------------------------------------------------------------
// Malformed fixtures: the whole source is Unknown, never a partial set.

interface Malformed {
  readonly name: string;
  readonly path: string;
  readonly classes: readonly ExtractionClass[];
  readonly text: string;
  readonly reason: (typeof EXTRACTION_FAILURES)[number];
  readonly class: ExtractionClass;
  readonly line?: number;
  readonly detail?: string;
}

const MALFORMED: readonly Malformed[] = [
  {
    name: 'vision without the refusals heading',
    path: 'heart-and-soul/vision.md',
    classes: ['project-account-section', 'principle', 'success-criterion'],
    text: VISION.replace('## What Butlers Is Not', '## What Butlers Is not'),
    reason: 'missing-heading',
    class: 'project-account-section',
    detail: 'What Butlers Is Not',
  },
  {
    name: 'vision with the purpose heading twice',
    path: 'heart-and-soul/vision.md',
    classes: ['project-account-section'],
    text: `${VISION}\n## What Butlers Is\n\nagain\n`,
    reason: 'duplicate-key',
    class: 'project-account-section',
    detail: 'What Butlers Is',
  },
  {
    name: 'vision whose purpose heading is an H3',
    path: 'heart-and-soul/vision.md',
    classes: ['project-account-section'],
    text: VISION.replace('## What Butlers Is\n', '### What Butlers Is\n'),
    reason: 'missing-heading',
    class: 'project-account-section',
  },
  {
    name: 'a bullet among the decimal principles',
    path: 'heart-and-soul/vision.md',
    classes: ['principle'],
    text: VISION.replace('2. **Cite or stay quiet**', '- **Cite or stay quiet**'),
    reason: 'malformed-list',
    class: 'principle',
    line: 29,
  },
  {
    name: 'a principle without a leading bold phrase',
    path: 'heart-and-soul/vision.md',
    classes: ['principle'],
    text: VISION.replace('2. **Cite or stay quiet**', '2. Cite or stay quiet'),
    reason: 'ambiguous-leading-label',
    class: 'principle',
    line: 29,
  },
  {
    name: 'two principles with the same bold phrase',
    path: 'heart-and-soul/vision.md',
    classes: ['principle'],
    text: VISION.replace('**Cite or stay quiet**', '**Fail closed**'),
    reason: 'duplicate-key',
    class: 'principle',
    detail: 'Fail closed',
  },
  {
    name: 'a rules section with no list',
    path: 'heart-and-soul/vision.md',
    classes: ['principle'],
    text: VISION.replace(/## Non-Negotiable Rules[\s\S]*?## Appendix/, '## Non-Negotiable Rules\n\nprose only\n\n## Appendix'),
    reason: 'malformed-list',
    class: 'principle',
  },
  {
    name: 'success section with no list items',
    path: 'heart-and-soul/v1.md',
    classes: ['success-criterion'],
    text: V1.replace('1. Ships on time.\n2. Stays honest.\n', ''),
    reason: 'malformed-list',
    class: 'success-criterion',
  },
  {
    name: 'architecture with no H2 at all',
    path: 'heart-and-soul/architecture.md',
    classes: ['project-account-section'],
    text: ARCHITECTURE.replace(/^## /gm, '### '),
    reason: 'missing-heading',
    class: 'project-account-section',
    detail: 'any H2',
  },
  {
    name: 'v1 without the What v1 Defers heading',
    path: 'heart-and-soul/v1.md',
    classes: ['project-account-section'],
    text: V1.replace('## What v1 Defers', '## What v1 defers'),
    reason: 'missing-heading',
    class: 'project-account-section',
    detail: 'What v1 Defers',
  },
  {
    name: 'v1 without the Dashboard catalog heading',
    path: 'heart-and-soul/v1.md',
    classes: ['catalog-entry'],
    text: V1.replace('### Dashboard\n', ''),
    reason: 'missing-heading',
    class: 'catalog-entry',
    detail: 'Dashboard',
  },
  {
    name: 'a catalog entry without a leading bold or code span',
    path: 'heart-and-soul/v1.md',
    classes: ['catalog-entry'],
    text: V1.replace('- **Mail** - mail module', '- Mail - mail module'),
    reason: 'ambiguous-leading-label',
    class: 'catalog-entry',
  },
  {
    name: 'a catalog entry whose label is not followed by a dash',
    path: 'heart-and-soul/v1.md',
    classes: ['catalog-entry'],
    text: V1.replace('- **Mail** - mail module', '- **Mail** mail module'),
    reason: 'ambiguous-leading-label',
    class: 'catalog-entry',
  },
  {
    name: 'a decimal item in a catalog',
    path: 'heart-and-soul/v1.md',
    classes: ['catalog-entry'],
    text: V1.replace('- **Mail** - mail module', '1. **Mail** - mail module'),
    reason: 'malformed-list',
    class: 'catalog-entry',
  },
  {
    name: 'the same catalog key under two headings',
    path: 'heart-and-soul/v1.md',
    classes: ['catalog-entry'],
    text: V1.replace('- **Tracing** - spans', '- **Bus** - spans'),
    reason: 'duplicate-key',
    class: 'catalog-entry',
    detail: 'Bus',
  },
  {
    name: 'lore README without the Index heading',
    path: 'legends-and-lore/README.md',
    classes: ['design-contract'],
    text: LORE_README.replace('## Index', '## Indexes'),
    reason: 'missing-heading',
    class: 'design-contract',
  },
  {
    name: 'lore Index whose first column is not a link',
    path: 'legends-and-lore/README.md',
    classes: ['design-contract'],
    text: LORE_README.replace('| [RFC 0002](0002.md) |', '| RFC 0002 |'),
    reason: 'malformed-row',
    class: 'design-contract',
    line: 8,
  },
  {
    name: 'lore Index row with a missing column',
    path: 'legends-and-lore/README.md',
    classes: ['design-contract'],
    text: LORE_README.replace('| [RFC 0002](0002.md) | candidate |', '| [RFC 0002](0002.md) |'),
    reason: 'malformed-row',
    class: 'design-contract',
    line: 8,
  },
  {
    name: 'lore Index with no table',
    path: 'legends-and-lore/README.md',
    classes: ['design-contract'],
    text: LORE_README.replace(/\| Contract \| Status \|\n\| --- \| --- \|\n(\| \[RFC 000[12]\][^\n]*\n){2}/, 'prose\n'),
    reason: 'malformed-row',
    class: 'design-contract',
  },
  {
    name: 'lore Index whose linked contract repeats',
    path: 'legends-and-lore/README.md',
    classes: ['design-contract'],
    text: LORE_README.replace('[RFC 0002](0002.md)', '[RFC 0001](0002.md)'),
    reason: 'duplicate-key',
    class: 'design-contract',
  },
  {
    name: 'components without any ordinal H2',
    path: 'lay-and-land/components.md',
    classes: ['topology-component'],
    text: COMPONENTS.replace(/^## \d+[a-z]?\.? /gm, '## '),
    reason: 'missing-heading',
    class: 'topology-component',
  },
  {
    name: 'a component row whose first column is not entirely bold',
    path: 'lay-and-land/components.md',
    classes: ['topology-component'],
    text: COMPONENTS.replace('| **Store** |', '| **Store** (legacy) |'),
    reason: 'malformed-row',
    class: 'topology-component',
    line: 14,
  },
  {
    name: 'a component row with a missing column',
    path: 'lay-and-land/components.md',
    classes: ['topology-component'],
    text: COMPONENTS.replace('| **Store** | keeps |', '| **Store** |'),
    reason: 'malformed-row',
    class: 'topology-component',
    line: 14,
    detail: 'column count',
  },
  {
    name: 'the same component label twice under one ordinal',
    path: 'lay-and-land/components.md',
    classes: ['topology-component'],
    text: COMPONENTS.replace('| **Store** |', '| **Daemon** |'),
    reason: 'duplicate-key',
    class: 'topology-component',
    detail: '1:Daemon',
  },
  {
    name: 'craft README without the Reading Order heading',
    path: 'craft-and-care/README.md',
    classes: ['craft-policy'],
    text: CRAFT_README.replace('### Reading Order', '### Reading order'),
    reason: 'missing-heading',
    class: 'craft-policy',
  },
  {
    name: 'craft Reading Order table without a File column',
    path: 'craft-and-care/README.md',
    classes: ['craft-policy'],
    text: CRAFT_README.replace('| Order | File | Why |', '| Order | Path | Why |'),
    reason: 'malformed-row',
    class: 'craft-policy',
    line: 5,
    detail: 'no File column',
  },
  {
    name: 'craft Reading Order row whose File cell is not a link',
    path: 'craft-and-care/README.md',
    classes: ['craft-policy'],
    text: CRAFT_README.replace('[Impact](./cc-impact.md#top)', 'cc-impact.md'),
    reason: 'malformed-row',
    class: 'craft-policy',
    line: 8,
  },
  {
    name: 'craft Reading Order with two links to one basename',
    path: 'craft-and-care/README.md',
    classes: ['craft-policy'],
    text: CRAFT_README.replace('(./cc-impact.md#top)', '(other/cc-spec.md)'),
    reason: 'duplicate-key',
    class: 'craft-policy',
    detail: 'cc-spec.md',
  },
  {
    name: 'roster TOML without a [butler] table',
    path: 'roster/alfred/butler.toml',
    classes: ['roster-identity'],
    text: ROSTER.replace('[butler]', '[staff]'),
    reason: 'malformed-toml',
    class: 'roster-identity',
  },
  {
    name: 'roster TOML with an empty name',
    path: 'roster/alfred/butler.toml',
    classes: ['roster-identity'],
    text: ROSTER.replace('name = "Alfred"', 'name = ""'),
    reason: 'malformed-toml',
    class: 'roster-identity',
    line: 8,
  },
  {
    name: 'roster TOML whose [butler] table has no name',
    path: 'roster/alfred/butler.toml',
    classes: ['roster-identity'],
    text: ROSTER.replace('name = "Alfred"  # trailing', 'title = "Alfred"'),
    reason: 'malformed-toml',
    class: 'roster-identity',
  },
  {
    name: 'roster TOML with the name repeated',
    path: 'roster/alfred/butler.toml',
    classes: ['roster-identity'],
    text: `${ROSTER}name = "Bruce"\n`,
    reason: 'malformed-toml',
    class: 'roster-identity',
  },
  {
    name: 'roster TOML with two [butler] tables',
    path: 'roster/alfred/butler.toml',
    classes: ['roster-identity'],
    text: `${ROSTER}\n[butler]\n`,
    reason: 'malformed-toml',
    class: 'roster-identity',
  },
  {
    name: 'a baseline-spec path with two directories',
    path: 'openspec/specs/a/b/spec.md',
    classes: ['baseline-spec'],
    text: '',
    reason: 'unsupported-source',
    class: 'baseline-spec',
  },
  {
    name: 'a roster path that is not butler.toml',
    path: 'roster/alfred/other.toml',
    classes: ['roster-identity'],
    text: ROSTER,
    reason: 'unsupported-source',
    class: 'roster-identity',
  },
  {
    name: 'a class the grammar names for another file',
    path: 'heart-and-soul/architecture.md',
    classes: ['project-account-section', 'principle'],
    text: ARCHITECTURE,
    reason: 'unsupported-source',
    class: 'principle',
  },
];

describe('PWB-REQ-002 — any grammar failure makes the whole source Unknown', () => {
  for (const m of MALFORMED) {
    it(`${m.name} → ${m.reason}`, () => {
      const r = extractSource({ path: m.path, extractionClasses: m.classes }, m.text);
      expect(r.kind).toBe('unknown');
      if (r.kind !== 'unknown') return;
      expect(r.path).toBe(m.path);
      expect(r.classes).toEqual(m.classes);
      expect(r.failure.reason).toBe(m.reason);
      expect(r.failure.class).toBe(m.class);
      if (m.line !== undefined) expect(r.failure.line).toBe(m.line);
      if (m.detail !== undefined) expect(r.failure.detail).toBe(m.detail);
      // No partial set: nothing item-shaped survives on the Unknown arm.
      expect('items' in r).toBe(false);
      expect('denominators' in r).toBe(false);
      expect(EXTRACTION_FAILURES).toContain(r.failure.reason);
    });
  }

  it('a failing class withholds the items of the classes that succeeded', () => {
    // principle fails; project-account-section and success-criterion would succeed alone.
    const text = VISION.replace('2. **Cite or stay quiet**', '2. Cite or stay quiet');
    expect(extractClass('project-account-section', 'heart-and-soul/vision.md', text).kind).toBe('items');
    expect(extractClass('success-criterion', 'heart-and-soul/vision.md', text).kind).toBe('items');
    const r = extractSource({ path: 'heart-and-soul/vision.md', extractionClasses: ['project-account-section', 'principle', 'success-criterion'] }, text);
    expect(r.kind).toBe('unknown');
  });

  it('the fixture set exercises every closed failure reason', () => {
    const seen = new Set(MALFORMED.map((m) => m.reason));
    for (const reason of EXTRACTION_FAILURES) expect(seen.has(reason)).toBe(true);
  });

  it('a source with no extraction classes extracts nothing and is not Unknown', () => {
    expect(extractSource({ path: 'README.md', extractionClasses: [] }, '# root\n')).toEqual({
      kind: 'extracted',
      path: 'README.md',
      classes: [],
      items: [],
      denominators: {},
    });
  });

  it('catalog-entry extraction also reports the nine literal headings and their lines', () => {
    const r = extractSource({ path: 'heart-and-soul/v1.md', extractionClasses: ['catalog-entry'] }, V1);
    expect(r.kind).toBe('extracted');
    if (r.kind !== 'extracted') return;
    expect(r.catalogHeadings?.map((h) => h.key)).toEqual([...CATALOG_HEADINGS]);
    expect(r.catalogHeadings?.length).toBe(9);
    for (const h of r.catalogHeadings ?? []) expect(V1.split('\n')[h.line - 1]).toBe(`### ${h.key}`);
    expect('rootIndex' in r).toBe(false);
  });
});

// ---------------------------------------------------------------------
// Literalness: exact headings, exact levels, exact depth, NFC only.

describe('PWB-REQ-002 — the grammar is literal', () => {
  const vision = (text: string): SourceExtraction => extractSource({ path: 'heart-and-soul/vision.md', extractionClasses: ['principle', 'success-criterion'] }, text);

  it('heading matches are exact: no case folding, no trailing punctuation rewriting', () => {
    expect(vision(VISION.replace('## Non-Negotiable Rules', '## non-negotiable rules')).kind).toBe('unknown');
    expect(vision(VISION.replace('## Non-Negotiable Rules', '## Non-Negotiable Rules:')).kind).toBe('unknown');
    // Trailing closing hashes and surrounding whitespace are ATX syntax, not text.
    expect(vision(VISION.replace('## Non-Negotiable Rules', '##   Non-Negotiable Rules ##')).kind).toBe('extracted');
  });

  it('keys are NFC-normalized and nothing else', () => {
    const r = extracted(FIXTURES[0] as Fixture);
    const keys = keysOf(r, 'principle');
    expect(keys[2]).toBe('Caf\u00e9 rule');
    expect((keys[2] as string).length).toBe(9);
    expect(VISION).toContain('Cafe\u0301 rule');
    expect(keys).not.toContain('fail closed');
  });

  it('fenced code never mints headings or items', () => {
    const r = extracted(FIXTURES[0] as Fixture);
    expect(keysOf(r, 'principle')).not.toContain('Fenced rule');
    expect(r.items.some((i) => i.statement?.includes('Not A Heading') && i.key !== 'purpose')).toBe(false);
  });

  it('only top-level list items mint; nested and indented lines do not', () => {
    const r = extracted(FIXTURES[0] as Fixture);
    expect(r.denominators['success-criterion']).toBe(3);
    const withNested = VISION.replace('  - a nested bullet mints nothing', '  - a nested bullet mints nothing\n    - deeper still\n\t- tab-indented');
    const n = vision(withNested);
    expect(n.kind).toBe('extracted');
    if (n.kind === 'extracted') expect(n.denominators['success-criterion']).toBe(3);
  });

  it('inline heading-like text in a paragraph is not a heading', () => {
    const r = extractSource({ path: 'heart-and-soul/vision.md', extractionClasses: ['project-account-section'] }, VISION);
    expect(r.kind).toBe('extracted');
    if (r.kind === 'extracted') expect((r.items.find((i) => i.key === 'purpose') as ExtractedItem).line).toBe(5);
  });

  it('CRLF line endings parse the same as LF', () => {
    const lf = extracted(FIXTURES[2] as Fixture);
    const crlf = extractSource({ path: 'heart-and-soul/v1.md', extractionClasses: (FIXTURES[2] as Fixture).classes }, V1.replace(/\n/g, '\r\n'));
    expect(crlf.kind).toBe('extracted');
    if (crlf.kind === 'extracted') {
      expect(crlf.items.map((i) => [i.class, i.key, i.line])).toEqual(lf.items.map((i) => [i.class, i.key, i.line]));
    }
  });

  it('table cells honour escaped pipes and the delimiter row is required', () => {
    const escaped = LORE_README.replace('| [RFC 0002](0002.md) | candidate |', '| [RFC 0002](0002.md) | a \\| b |');
    const r = extractSource({ path: 'legends-and-lore/README.md', extractionClasses: ['design-contract'] }, escaped);
    expect(r.kind).toBe('extracted');
    const noDelimiter = LORE_README.replace('| --- | --- |\n', '');
    expect(extractSource({ path: 'legends-and-lore/README.md', extractionClasses: ['design-contract'] }, noDelimiter).kind).toBe('unknown');
  });

  it('the class vocabulary dispatch covers exactly the manifest classes', () => {
    for (const cls of EXTRACTION_CLASSES) {
      const r = extractClass(cls, 'nowhere/else.txt', '');
      expect(r.kind).toBe('failed');
      if (r.kind === 'failed') expect(r.failure.class).toBe(cls);
    }
    expect(extractClass('not-a-class' as ExtractionClass, 'x', '').kind).toBe('failed');
  });
});

// ---------------------------------------------------------------------
// Extraction charges one registry pass per class (registry amendment
// 2026-09-05: `project-account-extraction`, `declared-item-extraction`;
// PWB-REQ-006 as amended).

describe('PWB-REQ-006 (amended) — extraction charges one registry pass per class', () => {
  const source = { path: 'heart-and-soul/vision.md', extractionClasses: ['project-account-section', 'principle', 'success-criterion'] as const };

  it('charges project-account-extraction for the account section and declared-item-extraction for every item class, in class order', () => {
    const charged: ParsePassIdentity[] = [];
    const r = extractSource(source, VISION, (pass) => {
      charged.push(pass);
    });
    expect(r.kind).toBe('extracted');
    expect(charged).toEqual(['project-account-extraction', 'declared-item-extraction', 'declared-item-extraction']);
  });

  it('a spent budget yields over-limit naming the class whose traversal never ran, with no partial items', () => {
    const breach = { limit: 'maxParsePassesPerSource' as const, declared: 5, observed: 6, path: source.path };
    let calls = 0;
    const r = extractSource(source, VISION, (pass) => {
      calls += 1;
      if (calls === 2) throw new ParsePassBudgetExceeded(breach, pass);
    });
    expect(r).toEqual({ kind: 'over-limit', path: source.path, classes: [...source.extractionClasses], pass: 'declared-item-extraction', class: 'principle', breach });
    expect('items' in r).toBe(false);
    expect(calls).toBe(2);
  });

  it('an unregistered traversal is not caught: the forbidden call propagates', () => {
    expect(() =>
      extractSource(source, VISION, () => {
        throw new Error('unregistered parse pass');
      }),
    ).toThrow('unregistered parse pass');
  });

  it('with no charge the extraction is unchanged', () => {
    expect(extractSource(source, VISION)).toEqual(extractSource(source, VISION, () => undefined));
  });
});

// ---------------------------------------------------------------------
// PWB-REQ-004 (as amended 2026-09-05) — the root index's two grammars.
// Every literal below is hand-typed from the registry entry's
// `observationGrammar.rootSummary` and `observationGrammar.precedence`.

const TABLE_ROWS = [
  '| 1 | **Heart and Soul** | Principles, scope boundaries, the 7 non-negotiable rules | `about/heart-and-soul/` |',
  '| 2 | **Legends and Lore** | Wire contracts, state machines, data models, sanctioned rule exceptions | `about/legends-and-lore/rfcs/` |',
  '| 3 | **Spec and Spine** | Feature behaviour, acceptance scenarios (WHEN/THEN), per-butler contracts | `openspec/specs/` |',
  '| 4 | **Craft and Care** | Execution-quality standards, test scope, review gates, observability bar | `about/craft-and-care/` |',
  '| 5 | **Lay and Land** | Topology snapshot — where components live, how they connect, stability levels | `about/lay-and-land/` |',
  '| 6 | **Roster config** | Live butler identity: `butler.toml`, `MANIFESTO.md`, `CLAUDE.md`, skills, API routes | `roster/{butler}/` |',
  '| 7 | **Code** | Runtime behaviour — executed source, migrations, tests | `src/`, `alembic/`, `tests/` |',
];
const TABLE = ['### Precedence Order When Layers Disagree', '', '| # | Layer | Owns | Home |', '|---|-------|------|------|', ...TABLE_ROWS];
const SUMMARY = [
  '## Key Architectural Facts',
  '',
  '- **11 daemons** — 3 staffers (Switchboard, Messenger, QA) + 8 domain',
  '  butlers, each a FastMCP server on its own port.',
  '- **One database** — shared Postgres.',
];
// Lines: 1 title, 2 blank, 3 H3, 4 blank, 5 header, 6 delimiter, 7–13 rows,
// 14 blank, 15 H2, 16 blank, 17 the daemons item.
const ROOT = ['# Butlers', '', ...TABLE, '', ...SUMMARY, ''].join('\n');
const ROOT_LINES = ROOT.split('\n');

const EXPECTED_ROWS: readonly [number, string, string, string][] = [
  [1, 'Heart and Soul', 'Principles, scope boundaries, the 7 non-negotiable rules', 'about/heart-and-soul/'],
  [2, 'Legends and Lore', 'Wire contracts, state machines, data models, sanctioned rule exceptions', 'about/legends-and-lore/rfcs/'],
  [3, 'Spec and Spine', 'Feature behaviour, acceptance scenarios (WHEN/THEN), per-butler contracts', 'openspec/specs/'],
  [4, 'Craft and Care', 'Execution-quality standards, test scope, review gates, observability bar', 'about/craft-and-care/'],
  [5, 'Lay and Land', 'Topology snapshot — where components live, how they connect, stability levels', 'about/lay-and-land/'],
  [6, 'Roster config', 'Live butler identity: butler.toml, MANIFESTO.md, CLAUDE.md, skills, API routes', 'roster/{butler}/'],
  [7, 'Code', 'Runtime behaviour — executed source, migrations, tests', 'src/, alembic/, tests/'],
];

// ROOT with one line replaced (1-based) or with lines inserted after it.
const withLine = (line: number, text: string): string => ROOT_LINES.map((l, i) => (i === line - 1 ? text : l)).join('\n');
const withoutLine = (line: number): string => ROOT_LINES.filter((_, i) => i !== line - 1).join('\n');
const insertAfter = (line: number, ...lines: string[]): string => [...ROOT_LINES.slice(0, line), ...lines, ...ROOT_LINES.slice(line)].join('\n');

describe('PWB-REQ-004 — the root summary emits exactly two stated counts', () => {
  const summary = (text: string): RootIndexExtraction['summary'] => extractRootIndex(text).summary;

  it('the Butlers-shaped root yields catalog-count:Staffers 3 and catalog-count:Butlers 8 at the item line', () => {
    expect(summary(ROOT)).toEqual({
      kind: 'emitted',
      line: 17,
      declarations: [
        { fact: 'catalog-count:Staffers', value: '3', line: 17 },
        { fact: 'catalog-count:Butlers', value: '8', line: 17 },
      ],
    });
  });

  it('the cardinal form may span a wrapped continuation line but never another item', () => {
    expect(summary(withLine(17, '- **11 daemons** — 3 staffers + 8 domain butlers.')).kind).toBe('emitted');
    const unwrapped = withoutLine(18);
    expect(summary(unwrapped)).toEqual({ kind: 'absent', reason: 'malformed-list', line: 17, detail: 'no cardinal form' });
    const split = withLine(18, '- 3 staffers + 8 domain butlers');
    expect(summary(split)).toMatchObject({ kind: 'absent', reason: 'malformed-list', detail: 'no cardinal form' });
  });

  it('the heading must be the exact H2, exactly once', () => {
    expect(summary(withLine(15, '## Key architectural facts'))).toEqual({ kind: 'absent', reason: 'missing-heading', detail: 'Key Architectural Facts' });
    expect(summary(withLine(15, '### Key Architectural Facts'))).toMatchObject({ kind: 'absent', reason: 'missing-heading' });
    expect(summary(insertAfter(19, '', '## Key Architectural Facts', '- **2 daemons** — 1 staffers + 1 domain butlers'))).toEqual({ kind: 'absent', reason: 'duplicate-key', line: 21, detail: 'Key Architectural Facts' });
  });

  it('the leading label must be exactly <decimal> daemons on exactly one unordered item', () => {
    expect(summary(withLine(17, '- **11 daemon** — 3 staffers + 8 domain butlers'))).toEqual({ kind: 'absent', reason: 'malformed-list', line: 15, detail: 'no item labelled <decimal> daemons' });
    expect(summary(withLine(17, '- **eleven daemons** — 3 staffers + 8 domain butlers'))).toMatchObject({ kind: 'absent', reason: 'malformed-list' });
    expect(summary(withLine(17, '- 11 daemons — 3 staffers + 8 domain butlers'))).toMatchObject({ kind: 'absent', reason: 'malformed-list' });
    expect(summary(withLine(17, '1. **11 daemons** — 3 staffers + 8 domain butlers'))).toEqual({ kind: 'absent', reason: 'malformed-list', line: 17, detail: 'not an unordered-list item' });
    expect(summary(insertAfter(18, '- **12 daemons** — 4 staffers + 8 domain butlers'))).toEqual({ kind: 'absent', reason: 'duplicate-key', line: 19, detail: '<decimal> daemons' });
  });

  it('the cardinal form must occur exactly once and the counts are decimals', () => {
    expect(summary(withLine(17, '- **11 daemons** — three staffers + eight domain butlers'))).toMatchObject({ kind: 'absent', reason: 'malformed-list', detail: 'no cardinal form' });
    expect(summary(withLine(17, '- **11 daemons** — 3 staffers + 8 domain butlers, or 2 staffers + 9 domain butlers'))).toMatchObject({ kind: 'absent', reason: 'malformed-list', detail: 'cardinal form repeated' });
    expect(summary(withLine(17, '- **11 daemons** — 3 staffers, 8 domain butlers'))).toMatchObject({ kind: 'absent', reason: 'malformed-list', detail: 'no cardinal form' });
    expect(summary(withLine(17, '- **11 daemons** — 3 staffers + 8 butlers'))).toMatchObject({ kind: 'absent', reason: 'malformed-list', detail: 'no cardinal form' });
  });

  it('a fenced copy of the summary is inert', () => {
    const fenced = ['# Butlers', '', '```md', ...SUMMARY, '```', ''].join('\n');
    expect(summary(fenced)).toMatchObject({ kind: 'absent', reason: 'missing-heading' });
  });

  it('no other root prose mints a fact: prose counts outside the item are ignored', () => {
    const prose = insertAfter(16, 'There are 9 domain butlers in total.');
    expect(summary(prose)).toMatchObject({ kind: 'emitted', declarations: [{ value: '3' }, { value: '8' }] });
  });
});

describe('PWB-REQ-004 — the precedence table is admitted only as the exact seven registry rows', () => {
  const precedence = (text: string): RootIndexExtraction['precedence'] => extractRootIndex(text).precedence;

  it('the Butlers-shaped table yields seven rules with the registry literals, code spans unwrapped, anchored per row', () => {
    const p = precedence(ROOT);
    expect(p.kind).toBe('admitted');
    if (p.kind !== 'admitted') return;
    expect(p.line).toBe(5);
    expect(p.rules.map((r) => [r.ordinal, r.layer, r.owns, r.home])).toEqual(EXPECTED_ROWS);
    expect(p.rules.map((r) => r.line)).toEqual([7, 8, 9, 10, 11, 12, 13]);
  });

  it('row order in the source does not matter; ordinals do', () => {
    const shuffled = [...ROOT_LINES];
    [shuffled[6], shuffled[12]] = [shuffled[12] as string, shuffled[6] as string];
    const p = precedence(shuffled.join('\n'));
    expect(p.kind).toBe('admitted');
    if (p.kind === 'admitted') expect(p.rules.map((r) => [r.ordinal, r.line])).toEqual([[1, 13], [2, 8], [3, 9], [4, 10], [5, 11], [6, 12], [7, 7]]);
  });

  it('the heading must be the exact H3, exactly once, holding exactly one table', () => {
    expect(precedence(withLine(3, '### Precedence order when layers disagree'))).toEqual({ kind: 'absent', reason: 'missing-heading', detail: 'Precedence Order When Layers Disagree' });
    expect(precedence(withLine(3, '## Precedence Order When Layers Disagree'))).toMatchObject({ kind: 'absent', reason: 'missing-heading' });
    expect(precedence(insertAfter(13, '', '### Precedence Order When Layers Disagree'))).toEqual({ kind: 'absent', reason: 'duplicate-key', line: 15, detail: 'Precedence Order When Layers Disagree' });
    expect(precedence(insertAfter(13, '', '| # | Layer | Owns | Home |', '|---|---|---|---|', TABLE_ROWS[0] as string))).toEqual({ kind: 'absent', reason: 'malformed-row', line: 3, detail: 'more than one table' });
    expect(precedence(['# Butlers', '', '### Precedence Order When Layers Disagree', '', 'No table here.', ''].join('\n'))).toEqual({ kind: 'absent', reason: 'malformed-row', line: 3, detail: 'no table' });
  });

  it('the columns must be exactly #, Layer, Owns, Home', () => {
    expect(precedence(withLine(5, '| # | Layer | Owns | Path |'))).toEqual({ kind: 'absent', reason: 'malformed-row', line: 5, detail: 'columns' });
    expect(precedence(withLine(5, '| # | Layer | Owns | Home | Notes |'))).toMatchObject({ kind: 'absent', reason: 'malformed-row' });
    expect(precedence(withLine(5, '| Layer | # | Owns | Home |'))).toMatchObject({ kind: 'absent', reason: 'malformed-row', detail: 'columns' });
  });

  it('exactly seven rows with ordinals 1–7 once each', () => {
    expect(precedence(withoutLine(13))).toEqual({ kind: 'absent', reason: 'malformed-row', line: 5, detail: 'row count' });
    expect(precedence(insertAfter(13, '| 8 | **Extra** | Anything | `x/` |'))).toMatchObject({ kind: 'absent', reason: 'malformed-row', detail: 'row count' });
    expect(precedence(withLine(13, TABLE_ROWS[0] as string))).toEqual({ kind: 'absent', reason: 'duplicate-key', line: 13, detail: '1' });
    expect(precedence(withLine(13, (TABLE_ROWS[6] as string).replace('| 7 |', '| 8 |')))).toEqual({ kind: 'absent', reason: 'malformed-row', line: 13, detail: '#' });
    expect(precedence(withLine(13, (TABLE_ROWS[6] as string).replace('| 7 |', '| 07 |')))).toMatchObject({ kind: 'absent', reason: 'malformed-row', detail: '#' });
  });

  it('every cell must equal its row literal after the registry cell syntax; nothing else is normalized', () => {
    const row1 = TABLE_ROWS[0] as string;
    expect(precedence(withLine(7, row1.replace('**Heart and Soul**', 'Heart and Soul')))).toEqual({ kind: 'absent', reason: 'malformed-row', line: 7, detail: 'Layer' });
    expect(precedence(withLine(7, row1.replace('**Heart and Soul**', '**Heart** and **Soul**')))).toMatchObject({ kind: 'absent', reason: 'malformed-row', detail: 'Layer' });
    expect(precedence(withLine(7, row1.replace('**Heart and Soul**', '**Heart And Soul**')))).toMatchObject({ kind: 'absent', reason: 'malformed-row', detail: 'Layer' });
    expect(precedence(withLine(7, row1.replace('the 7 non-negotiable rules', 'the seven non-negotiable rules')))).toEqual({ kind: 'absent', reason: 'malformed-row', line: 7, detail: 'Owns' });
    expect(precedence(withLine(7, row1.replace('`about/heart-and-soul/`', '`about/heart-and-soul`')))).toEqual({ kind: 'absent', reason: 'malformed-row', line: 7, detail: 'Home' });
    expect(precedence(withLine(7, row1.replace('`about/heart-and-soul/`', 'about/heart-and-soul/')))).toMatchObject({ kind: 'admitted' });
    expect(precedence(withLine(7, row1.replace('`about/heart-and-soul/`', '`about/heart-and-soul/')))).toEqual({ kind: 'absent', reason: 'malformed-row', line: 7, detail: 'Home' });
    expect(precedence(withLine(7, row1.replace('Principles,', '  Principles,')))).toMatchObject({ kind: 'admitted' });
    expect(precedence(withLine(7, row1.replace('Principles, scope', 'Principles,  scope')))).toMatchObject({ kind: 'absent', reason: 'malformed-row', detail: 'Owns' });
    expect(precedence(withLine(11, (TABLE_ROWS[4] as string).replace('—', '-')))).toMatchObject({ kind: 'absent', reason: 'malformed-row', line: 11, detail: 'Owns' });
    expect(precedence(withLine(12, (TABLE_ROWS[5] as string).replace('`roster/{butler}/`', '`roster/{name}/`')))).toMatchObject({ kind: 'absent', reason: 'malformed-row', line: 12, detail: 'Home' });
  });

  it('a mixed-family or unrecognized row invalidates the whole table: no partial rule set', () => {
    const p = precedence(withLine(9, '| 3 | **Spec and Spine** | Feature behaviour and the roster | `openspec/specs/` |'));
    expect(p).toEqual({ kind: 'absent', reason: 'malformed-row', line: 9, detail: 'Owns' });
    expect('rules' in p).toBe(false);
  });

  it('a fenced copy of the table is inert', () => {
    const fenced = ['# Butlers', '', '```md', ...TABLE, '```', ''].join('\n');
    expect(precedence(fenced)).toMatchObject({ kind: 'absent', reason: 'missing-heading' });
  });

  it('semanticCellText trims ASCII whitespace and unwraps only complete inline code spans', () => {
    expect(semanticCellText('  `a/`, `b/` ')).toBe('a/, b/');
    expect(semanticCellText('`unclosed')).toBe('`unclosed');
    expect(semanticCellText('Keep  Case')).toBe('Keep  Case');
    expect(semanticCellText(' x')).toBe(' x');
  });
});

describe('PWB-REQ-006 (amended) — the root index charges one fact-and-precedence pass', () => {
  const root = { path: 'about/README.md', rule: 'root-index' as const, extractionClasses: [] as const };

  it('the root grammar runs only for the root-index rule and is charged once after the class passes', () => {
    const charged: ParsePassIdentity[] = [];
    const r = extractSource(root, ROOT, (pass) => {
      charged.push(pass);
    });
    expect(charged).toEqual(['fact-and-precedence-extraction']);
    expect(r.kind).toBe('extracted');
    if (r.kind === 'extracted') {
      expect(r.rootIndex?.summary.kind).toBe('emitted');
      expect(r.rootIndex?.precedence.kind).toBe('admitted');
      expect(r.items).toEqual([]);
    }
    const notRoot = extractSource({ ...root, rule: 'pillar-index' }, ROOT, (pass) => {
      charged.push(pass);
    });
    expect(charged).toEqual(['fact-and-precedence-extraction']);
    expect(notRoot.kind === 'extracted' && 'rootIndex' in notRoot).toBe(false);
  });

  it('a spent budget yields over-limit naming the root pass with no class and no grammar result', () => {
    const breach = { limit: 'maxParsePassesPerSource' as const, declared: 13, observed: 14, path: root.path };
    const r = extractSource(root, ROOT, (pass) => {
      throw new ParsePassBudgetExceeded(breach, pass);
    });
    expect(r).toEqual({ kind: 'over-limit', path: root.path, classes: [], pass: 'fact-and-precedence-extraction', breach });
    expect('rootIndex' in r).toBe(false);
  });
});

// GP-B2 Q1 (syzygy-bpyt.1.18): the class results are appended one item at a time, not by one spread call whose argument count is the
// class's item count. A call spreading 130,000 items or more overflows the stack on node 24 with the default stack.
describe('a source whose class holds 130,000 items', () => {
  const BULLETS = 130_000;
  const CLASSES = ['project-account-section', 'principle', 'success-criterion'] as const;
  const section = ['## What Success Looks Like', '', ...Array.from({ length: BULLETS }, () => '- x'), ''].join('\n');
  const long = VISION.replace(/## What Success Looks Like[\s\S]*?(?=## What Butlers Is Not)/, `${section}\n`);

  // These sizes pin the fix only where one spread call over them overflows: a larger stack (a worker-thread pool runs at
  // 4 MB) lets the old line pass every test here. This canary fails first if the test process stops overflowing.
  it('one spread call over 130,002 arguments still overflows the stack in this test process', () => {
    const sink: unknown[] = [];
    expect(() => sink.push(...new Array<unknown>(BULLETS + 2))).toThrow(RangeError);
  });

  it('is extracted, every item kept in class order', () => {
    const r = extractSource({ path: 'heart-and-soul/vision.md', extractionClasses: [...CLASSES] }, long);
    expect(r.kind).toBe('extracted');
    if (r.kind !== 'extracted') return;
    expect(r.denominators['success-criterion']).toBe(BULLETS);
    // Class order with the text as the oracle, not the module: the bullets sit on consecutive lines, so their items must too.
    const success = r.items.filter((item) => item.class === 'success-criterion');
    const first = success[0]?.line ?? 0;
    expect(success.every((item, at) => item.line === first + at), 'the success-criterion items are not in line order').toBe(true);
    expect(r.items).toHaveLength(Object.values(r.denominators).reduce((sum, n) => sum + n, 0));
    // One class alone gives the same items as its slice of the three-class result.
    let offset = 0;
    for (const cls of CLASSES) {
      const alone = extractSource({ path: 'heart-and-soul/vision.md', extractionClasses: [cls] }, long);
      expect(alone.kind).toBe('extracted');
      if (alone.kind !== 'extracted') return;
      expect(r.denominators[cls]).toBe(alone.items.length);
      expect(isDeepStrictEqual(r.items.slice(offset, offset + alone.items.length), alone.items), `${cls} items differ from its one-class result`).toBe(true);
      offset += alone.items.length;
    }
    expect(offset).toBe(r.items.length);
  }, 30_000);
});

// syzygy-bpyt.55 (the owner's GP-B2 Q2 answer C, G2): which lines sit inside a fence is the PWB-REQ-006 profile's rule. Expected values are
// literals; the same cases are read by the profile's mask in apps/three-surface-poc/src/fence-rules.test.ts.
describe('the extractor reads the profile\'s fences', () => {
  const FENCE = '```';
  const principles = (fence: readonly string[], eol = '\n'): { readonly kind: string; readonly keys: readonly string[]; readonly denominator: number | undefined } => {
    const text = ['# Vision', '', '## Non-Negotiable Rules', '', '1. **First.** one', '', ...fence, '', '2. **Second.** two', '', '3. **Third.** three', ''].join(eol);
    const r = extractSource({ path: 'heart-and-soul/vision.md', extractionClasses: ['principle'] }, text);
    return r.kind === 'extracted' ? { kind: r.kind, keys: r.items.map((item) => item.key), denominator: r.denominators['principle'] } : { kind: r.kind, keys: [], denominator: undefined };
  };
  const ALL = { kind: 'extracted', keys: ['First.', 'Second.', 'Third.'], denominator: 3 };

  it.each([['LF', '\n'], ['CRLF', '\r\n']])('%s: a fence closes at a closer indented one to three spaces', (_name, eol) => {
    expect(principles([FENCE, 'code', ' ' + FENCE], eol)).toEqual(ALL);
    expect(principles([FENCE, 'code', '   ' + FENCE], eol)).toEqual(ALL);
  });

  it.each([['LF', '\n'], ['CRLF', '\r\n']])('%s: an opener indented one to three spaces is a fence, and one indented four spaces is not', (_name, eol) => {
    expect(principles(['  ' + FENCE, '9. **Hidden.** inside', '  ' + FENCE], eol)).toEqual(ALL);
    // Four spaces: indented code in CommonMark, and nothing the profile recognizes, so the line is ordinary text and mints nothing here.
    expect(principles(['    ' + FENCE, 'code', '    ' + FENCE], eol)).toEqual(ALL);
  });

  it.each([['LF', '\n'], ['CRLF', '\r\n']])('%s: a closer-shaped line with an info string or a trailing tab does not close the fence', (_name, eol) => {
    expect(principles([FENCE, 'x', FENCE + 'js', 'y', FENCE], eol)).toEqual(ALL);
    expect(principles([FENCE, 'x', FENCE + '\t', 'y', FENCE], eol)).toEqual(ALL);
    // Longer than the opener closes; shorter does not.
    expect(principles([FENCE, 'x', '````'], eol)).toEqual(ALL);
    expect(principles(['````', 'x', FENCE, 'y', '````'], eol)).toEqual(ALL);
  });

  it('a fence that never closes runs to the end of the text (recovery; the reader excludes such a source before it gets here)', () => {
    expect(principles([FENCE, 'code'])).toEqual({ kind: 'extracted', keys: ['First.'], denominator: 1 });
    expect(maskMarkdownCodeContexts(['# Vision', '', FENCE, 'code', ''].join('\n')).kind).toBe('malformed');
  });
});
