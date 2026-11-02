// PWB-REQ-002 as amended by `pwb-class-granular-extraction-amendment-v1.0`
// (SEMANTIC-DELTA.md Hunks 7-10): each class of a source is accounted for on
// its own, an unenumerated heading is surfaced and counted, every source names
// the rule that admitted it, and a count made without a read root index says
// so.
//
// Oracle independence. Three readers below are written from the signed
// Oracle sentence and the reader definitions, sharing no code and no
// structure with the modules under test:
//   - `oracleClass`: a heading-index reader of vision.md and v1.md (the
//     module splits a parsed document; this one indexes fence-masked lines).
//   - `oracleUnenumerated`: the heading scan, done by cutting the file into
//     level-2 chunks and testing each chunk (the module walks the heading
//     list).
//   - `oracleRules`: the source-path population derived from the tree and the
//     index texts, assigning names in the stated order.
// Every expected number is a literal typed from the fixture.

import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import type { BodyReadAuthorityEvaluation } from './body-read-authority.js';
import type { GitTreeEntry } from './git-tree.js';
import { extractSource } from './project-shape-extraction.js';
import { deriveProjectShapeManifest, SOURCE_RULE_NEEDS_ROOT_INDEX, type ExtractionClass, type SeedRead } from './project-shape-manifest.js';
import { buildProjectShape, type ProjectShape } from './project-shape-model.js';

// ---------------------------------------------------------------------
// Fixtures.

const CATALOG = ['Core Infrastructure', 'Staffers', 'Butlers', 'Modules', 'Connectors', 'Dashboard', 'Identity System', 'Situational Awareness', 'Observability'];

const VISION = (principles: readonly string[]): string =>
  [
    '# Vision',
    '',
    '## What Butlers Is',
    '',
    'A household.',
    '',
    '## What Success Looks Like',
    '',
    '- Promises are visible.',
    '- Nothing is inferred.',
    '',
    '## What Butlers Is Not',
    '',
    'Not a toy.',
    '',
    '## Non-Negotiable Rules',
    '',
    ...principles,
    '',
  ].join('\n');

const GOOD_RULES = ['1. **Fail closed** — silence is Unknown.', '2. **Cite** — carry a source.'];
const BAD_RULES = ['1. **Fail closed** — silence is Unknown.', '2. Cite or stay quiet.'];

// `before` and `after` splice lines into the "What v1 Ships" section around
// the nine catalog headings; `entries` replaces the Butlers entries.
function v1(options: { readonly extra?: readonly string[]; readonly butlers?: readonly string[]; readonly tail?: readonly string[]; readonly split?: boolean } = {}): string {
  const butlers = options.butlers ?? ['- **Atlas** - maps', '- **Bishop** - moves'];
  const headings = CATALOG.flatMap((name) => ['', `### ${name}`, '', ...(name === 'Core Infrastructure' ? ['- **Bus** - bus'] : name === 'Butlers' ? butlers : [])]);
  const body = options.split === true ? [...headings.slice(0, 15), '', '## What v1 Adds', ...headings.slice(15)] : headings;
  return [
    '# v1',
    '',
    '## What v1 Ships',
    '',
    'Ships.',
    ...body,
    ...(options.extra ?? []),
    '',
    '## What v1 Defers',
    '',
    'Defers.',
    '',
    '## Success Criteria',
    '',
    '1. Ships on time.',
    ...(options.tail ?? []),
    '',
  ].join('\n');
}

// ---------------------------------------------------------------------
// Oracle 1 — per-class outcomes of vision.md and v1.md, by a heading index.

type ClassOutcome = { readonly fail: string } | { readonly keys: readonly string[] };

interface Head {
  readonly level: number;
  readonly title: string;
  readonly at: number;
}

function maskFences(text: string): string[] {
  let open = false;
  return text.split('\n').map((line) => {
    if (/^(```|~~~)/.test(line)) {
      open = !open;
      return '';
    }
    return open ? '' : line;
  });
}

const headIndex = (lines: readonly string[]): Head[] =>
  lines.flatMap((line, at) => {
    const m = /^(#{1,6}) +(.*?) *$/.exec(line);
    return m === null ? [] : [{ level: (m[1] as string).length, title: m[2] as string, at }];
  });

function oneHead(heads: readonly Head[], level: number, title: string): Head | string {
  const hit = heads.filter((h) => h.level === level && h.title === title);
  return hit.length === 0 ? 'missing-heading' : hit.length > 1 ? 'duplicate-key' : (hit[0] as Head);
}

function bodyOf(lines: readonly string[], heads: readonly Head[], h: Head): string[] {
  const stop = heads.find((g) => g.at > h.at && g.level <= h.level);
  return lines.slice(h.at + 1, stop === undefined ? lines.length : stop.at);
}

function oracleClass(cls: ExtractionClass, file: 'vision' | 'v1', text: string): ClassOutcome {
  const lines = maskFences(text);
  const heads = headIndex(lines);
  const need = (level: number, title: string): Head | { fail: string } => {
    const found = oneHead(heads, level, title);
    return typeof found === 'string' ? { fail: found } : found;
  };
  if (cls === 'project-account-section') {
    const titles = file === 'vision' ? ['What Butlers Is', 'What Success Looks Like', 'What Butlers Is Not'] : ['What v1 Ships', 'What v1 Defers', 'Success Criteria'];
    for (const title of titles) {
      const found = need(2, title);
      if ('fail' in found) return found;
    }
    return { keys: file === 'vision' ? ['purpose', 'promises', 'refusals'] : ['v1-scope', 'v1-success'] };
  }
  if (cls === 'principle') {
    const h = need(2, 'Non-Negotiable Rules');
    if ('fail' in h) return h;
    const rows = bodyOf(lines, heads, h).filter((l) => /^(\d+[.)]|[-*+])[ \t]/.test(l));
    if (rows.length === 0) return { fail: 'malformed-list' };
    if (rows.some((l) => /^[-*+]/.test(l))) return { fail: 'malformed-list' };
    const keys: string[] = [];
    for (const row of rows) {
      const bold = /^\d+[.)][ \t]+\*\*(.+?)\*\*/.exec(row);
      if (bold === null) return { fail: 'ambiguous-leading-label' };
      keys.push(bold[1] as string);
    }
    return { keys };
  }
  if (cls === 'success-criterion') {
    const h = need(2, file === 'vision' ? 'What Success Looks Like' : 'Success Criteria');
    if ('fail' in h) return h;
    const rows = bodyOf(lines, heads, h).filter((l) => /^(\d+[.)]|[-*+])[ \t]/.test(l));
    return rows.length === 0 ? { fail: 'malformed-list' } : { keys: rows.map((_, i) => `${file}:${i + 1}`) };
  }
  // catalog-entry
  const keys: string[] = [];
  for (const name of CATALOG) {
    const h = need(3, name);
    if ('fail' in h) return h;
    for (const row of bodyOf(lines, heads, h).filter((l) => /^(\d+[.)]|[-*+])[ \t]/.test(l))) {
      if (/^\d/.test(row)) return { fail: 'malformed-list' };
      const label = /^[-*+][ \t]+(?:\*\*(.+?)\*\*|`(.+?)`)[ \t]*[-–—]/.exec(row);
      if (label === null) return { fail: 'ambiguous-leading-label' };
      keys.push((label[1] ?? label[2]) as string);
    }
  }
  return { keys };
}

function moduleOutcome(r: ReturnType<typeof extractSource>, cls: ExtractionClass): ClassOutcome {
  if (r.kind === 'over-limit') throw new Error('unexpected over-limit');
  const failure = r.kind === 'extracted' ? undefined : (r.kind === 'unknown' ? r.failures : r.failures).find((f) => f.class === cls);
  if (failure !== undefined) return { fail: failure.reason };
  if (r.kind === 'unknown') throw new Error(`${cls} neither failed nor read`);
  return { keys: r.items.filter((item) => item.class === cls).map((item) => item.key) };
}

const VISION_CLASSES: readonly ExtractionClass[] = ['project-account-section', 'principle', 'success-criterion'];
const V1_CLASSES: readonly ExtractionClass[] = ['project-account-section', 'success-criterion', 'catalog-entry'];

describe('PWB-REQ-002 (class-granular) — two independent extractors agree per source and class', () => {
  const cases: readonly { readonly name: string; readonly file: 'vision' | 'v1'; readonly classes: readonly ExtractionClass[]; readonly text: string; readonly failed: readonly ExtractionClass[] }[] = [
    { name: 'a source assigned three classes in which one fails and two read', file: 'vision', classes: VISION_CLASSES, text: VISION(BAD_RULES), failed: ['principle'] },
    { name: 'a source whose three classes all read', file: 'vision', classes: VISION_CLASSES, text: VISION(GOOD_RULES), failed: [] },
    { name: 'v1 whose catalog fails on an unlabelled entry', file: 'v1', classes: V1_CLASSES, text: v1({ butlers: ['- Atlas without a label'] }), failed: ['catalog-entry'] },
    { name: 'v1 whose catalog has a missing heading', file: 'v1', classes: V1_CLASSES, text: v1().replace('### Modules', '### Modulez'), failed: ['catalog-entry'] },
    { name: 'v1 whose success section is gone: two classes fail, the catalog reads', file: 'v1', classes: V1_CLASSES, text: v1().replace('## Success Criteria', '## Success Criteria Gone'), failed: ['project-account-section', 'success-criterion'] },
    { name: 'vision in which every class fails', file: 'vision', classes: VISION_CLASSES, text: '# Vision\n\nNothing here.\n', failed: [...VISION_CLASSES] },
  ];
  for (const c of cases) {
    it(c.name, () => {
      const r = extractSource({ path: `heart-and-soul/${c.file}.md`, extractionClasses: c.classes }, c.text);
      const failedByOracle = c.classes.filter((cls) => 'fail' in oracleClass(cls, c.file, c.text));
      expect(failedByOracle).toEqual(c.failed);
      expect(r.kind).toBe(c.failed.length === 0 ? 'extracted' : c.failed.length === c.classes.length ? 'unknown' : 'partial');
      for (const cls of c.classes) {
        const expected = oracleClass(cls, c.file, c.text);
        const actual = moduleOutcome(r, cls);
        expect(actual, cls).toEqual(expected);
        // A class that read has its own known D; a failed class has none.
        if ('keys' in expected && r.kind !== 'unknown') expect((r as { denominators: Record<string, number> }).denominators[cls]).toBe(expected.keys.length);
        if ('fail' in expected && r.kind === 'partial') expect(cls in r.denominators).toBe(false);
      }
      // No class yields an item it failed on, and no identity appears twice.
      if (r.kind === 'partial' || r.kind === 'extracted') {
        const identities = r.items.map((item) => `${item.class}:${item.key}`);
        expect(new Set(identities).size).toBe(identities.length);
        for (const cls of c.failed) expect(r.items.some((item) => item.class === cls)).toBe(false);
      }
    });
  }
});

// ---------------------------------------------------------------------
// Oracle 2 — the unenumerated-heading scan, by level-2 chunks.

function oracleUnenumerated(text: string): { readonly text: string; readonly line: number }[] {
  const lines = maskFences(text);
  const chunkOf: number[] = [];
  let chunk = -1;
  lines.forEach((line, i) => {
    if (/^#{1,2} /.test(line)) chunk += 1;
    chunkOf[i] = chunk;
  });
  const holders = new Set<number>();
  lines.forEach((line, i) => {
    const m = /^### +(.*?) *$/.exec(line);
    if (m !== null && CATALOG.includes(m[1] as string)) holders.add(chunkOf[i] as number);
  });
  // No section holds one of the nine: the enclosed area is the whole file.
  return lines.flatMap((line, i) => {
    const m = /^### +(.*?) *$/.exec(line);
    return m !== null && (holders.size === 0 || holders.has(chunkOf[i] as number)) && !CATALOG.includes(m[1] as string) ? [{ text: m[1] as string, line: i + 1 }] : [];
  });
}

describe('PWB-REQ-002 (class-granular) — an unenumerated heading is surfaced, counted and mints nothing', () => {
  const cases: readonly { readonly name: string; readonly text: string; readonly count: number }[] = [
    { name: 'a tenth level-3 heading in the section enclosing the catalog', text: v1({ extra: ['', '### Gateways', '', '- **Hidden** - never read'] }), count: 1 },
    { name: 'two such headings, and a fenced one that is not a heading', text: v1({ extra: ['', '### Gateways', '', '### Plugins', '', '```', '### Fenced', '```'] }), count: 2 },
    { name: 'a level-3 heading in a section that holds none of the nine', text: v1({ tail: ['', '## Appendix', '', '### Elsewhere'] }), count: 0 },
    { name: 'a level-4 heading below a catalog heading', text: v1({ extra: ['', '#### Deep'] }), count: 0 },
    { name: 'a catalog split over two sections, the second holding a tenth heading', text: v1({ split: true, extra: ['', '### Extras'] }), count: 1 },
    { name: 'the nine headings only', text: v1(), count: 0 },
  ];
  for (const c of cases) {
    it(c.name, () => {
      const expected = oracleUnenumerated(c.text);
      expect(expected.length).toBe(c.count);
      const r = extractSource({ path: 'heart-and-soul/v1.md', extractionClasses: V1_CLASSES }, c.text);
      // Not a failure: the source stays extracted, every class keeps its items.
      expect(r.kind).toBe('extracted');
      if (r.kind !== 'extracted') return;
      const surfaced = (r.unenumeratedHeadings ?? []).map((h) => ({ text: h.text, line: h.line }));
      expect(surfaced).toEqual(expected);
      for (const h of r.unenumeratedHeadings ?? []) {
        expect(h.class).toBe('catalog-entry');
        expect(h.level).toBe(3);
        expect(c.text.split('\n')[h.line - 1]).toBe(`### ${h.text}`);
      }
      // Nothing is minted for it: the catalog identities are exactly the oracle's.
      const keys = oracleClass('catalog-entry', 'v1', c.text);
      expect(moduleOutcome(r, 'catalog-entry')).toEqual(keys);
      expect(r.denominators['catalog-entry']).toBe('keys' in keys ? keys.keys.length : -1);
    });
  }

  it('falls back to the whole file when none of the nine headings is found', () => {
    const text = ['# Heart and Soul', '', '## One', '', '### Alpha', '', '## Two', '', '### Beta', '', '#### Deep', ''].join('\n');
    const expected = oracleUnenumerated(text);
    expect(expected).toEqual([{ text: 'Alpha', line: 5 }, { text: 'Beta', line: 9 }]);
    const r = extractSource({ path: 'heart-and-soul/v1.md', extractionClasses: ['catalog-entry'] }, text);
    expect(r.kind).toBe('unknown');
    if (r.kind !== 'unknown') return;
    expect(r.failures.map((f) => f.class)).toEqual(['catalog-entry']);
    expect((r.unenumeratedHeadings ?? []).map((h) => ({ text: h.text, line: h.line }))).toEqual(expected);
  });

  it('a catalog entry that fails the class does not hide an unenumerated heading', () => {
    const text = v1({ butlers: ['- Atlas without a label'], extra: ['', '### Gateways'] });
    const r = extractSource({ path: 'heart-and-soul/v1.md', extractionClasses: V1_CLASSES }, text);
    expect(r.kind).toBe('partial');
    if (r.kind !== 'partial') return;
    expect(r.failures.map((f) => f.class)).toEqual(['catalog-entry']);
    expect((r.unenumeratedHeadings ?? []).map((h) => ({ text: h.text, line: h.line }))).toEqual(oracleUnenumerated(text));
    expect(r.unenumeratedHeadings?.length).toBe(1);
  });
});

// ---------------------------------------------------------------------
// The composed pipeline: machine answer for partial extraction, surfaced
// headings and the root-index qualification.

const COMMIT = '5'.repeat(40);
const encoder = new TextEncoder();
const sha1Blob = (bytes: Uint8Array): string => createHash('sha1').update(`blob ${bytes.byteLength}\0`).update(bytes).digest('hex');

const ADMITTING: BodyReadAuthorityEvaluation = {
  evaluationId: 'evaluation:class-granular',
  evaluationInstant: '2026-11-02T00:00:00Z',
  admits: true,
  authorizationMode: 'owner-trusted-bootstrap',
  consent: { kind: 'valid', provenance: 'state-1', actIdentity: 'act:consent', artifactDigest: 'sha256:c'.padEnd(71, '0'), actInstant: '2026-09-02T00:00:00Z' },
  policy: { kind: 'valid', provenance: 'state-1', actIdentity: 'act:policy', artifactDigest: 'sha256:p'.padEnd(71, '0'), actInstant: '2026-09-02T00:00:00Z' },
  registry: { kind: 'valid', provenance: 'state-1', actIdentity: 'act:registry', artifactDigest: 'sha256:r'.padEnd(71, '0'), actInstant: '2026-09-02T00:00:00Z' },
  contradiction: undefined,
};

const ROOT = '# Fixture\n\n[Heart and Soul](heart-and-soul/) · [Legends and Lore](legends-and-lore/) ·\n[Spec and Spine](spec-and-spine/) · [Lay and Land](lay-and-land/) · [Craft and Care](craft-and-care/)\n';

function texts(vision: string, v1Text: string): Record<string, string> {
  return {
    'about/README.md': ROOT,
    'about/heart-and-soul/README.md': '- [Vision](vision.md)\n- [Architecture](architecture.md)\n- [v1](v1.md)\n',
    'about/heart-and-soul/vision.md': vision,
    'about/heart-and-soul/architecture.md': '# Architecture\n\n## Runtime\n\nOne process.\n',
    'about/heart-and-soul/v1.md': v1Text,
    'about/legends-and-lore/README.md': '# Lore\n\n## Index\n\n| Contract | Status |\n| --- | --- |\n| [RFC 0001](0001.md) | accepted |\n',
    'about/legends-and-lore/0001.md': '# RFC 0001\n',
    'about/spec-and-spine/README.md': 'Specs.\n',
    'about/lay-and-land/README.md': '[Components](components.md)\n',
    'about/lay-and-land/components.md': '# Components\n\n## 1 Runtime\n\n| Component | Role |\n|---|---|\n| **Daemon** | serves |\n',
    'about/craft-and-care/README.md': '# Craft\n\n### Reading Order\n\n| Order | File |\n|---|---|\n| 1 | [Spec policy](policies/cc-spec.md) |\n',
    'about/craft-and-care/policies/cc-spec.md': '# Spec policy\n',
    'openspec/specs/alpha/spec.md': '# Alpha\n',
    'roster/atlas/butler.toml': '[butler]\nname = "atlas"\n',
    'roster/atlas/MANIFESTO.md': '# Atlas\n',
  };
}

function observe(files: Record<string, string>): Extract<ProjectShape, { kind: 'observed' }> {
  const bytes = new Map(Object.entries(files).map(([path, text]) => [path, encoder.encode(text)]));
  const entries: GitTreeEntry[] = [...bytes.entries()].map(([path, body]) => ({ mode: '100644', type: 'blob', objectId: sha1Blob(body), sizeBytes: body.byteLength, path }));
  const byOid = new Map(entries.map((entry) => [entry.objectId, bytes.get(entry.path) as Uint8Array]));
  const listing = entries.map((e) => `${e.mode} ${e.type} ${e.objectId} ${String(e.sizeBytes).padStart(7)}\t${e.path}\x00`).join('');
  const shape = buildProjectShape({
    authority: ADMITTING,
    revision: 'main',
    capturedAt: '2026-11-02T01:00:00.000Z',
    runGit: (args) => {
      switch (args[0]) {
        case 'rev-parse':
          return encoder.encode(`${COMMIT}\n`);
        case 'show':
          return encoder.encode('2026-10-30T10:00:00+00:00\n');
        case 'ls-tree':
          return encoder.encode(listing);
        case 'cat-file': {
          const body = byOid.get(args[2] ?? '');
          if (body === undefined) throw new Error(`no object ${args[2] ?? ''}`);
          return body;
        }
        default:
          throw new Error(`unexpected git command ${args.join(' ')}`);
      }
    },
  });
  if (shape.kind !== 'observed') throw new Error(`expected observed, got ${shape.kind}`);
  return shape;
}

describe('PWB-REQ-002 (class-granular) — a failing class keeps its siblings in the machine answer', () => {
  const shape = observe(texts(VISION(BAD_RULES), v1()));
  const vision = shape.sources.find((s) => s.path === 'about/heart-and-soul/vision.md');

  it('the failed class is Unknown in its source and its siblings keep their own known D', () => {
    expect(vision?.partiallyExtracted).toBe(true);
    const outcomes = Object.fromEntries((vision?.classOutcomes ?? []).map((o) => [o.class, o.denominator]));
    expect(outcomes['principle']).toMatchObject({ kind: 'unknown', reason: 'ambiguous-leading-label', unknownReason: 'excluded-content' });
    expect(outcomes['project-account-section']).toEqual({ kind: 'known', value: 3 });
    expect(outcomes['success-criterion']).toEqual({ kind: 'known', value: 2 });
  });

  it('the source D is Unknown and the source is not withheld whole', () => {
    expect(vision?.itemDenominator.kind).toBe('unknown');
    expect(vision?.record.outcome).toBe('classified');
    expect(shape.counts.exclusions).toBe(0);
    expect(shape.counts.sourcesWithUnknownDenominator).toBe(1);
    expect(vision?.claim.epistemic.label).toBe('Unknown');
  });

  it('the sibling classes keep their items modeled; the failed class yields none', () => {
    const modeled = (cls: string): string[] => shape.items.filter((i) => i.class === cls && i.state === 'modeled').map((i) => i.key);
    expect(modeled('project-account-section').sort()).toEqual(['architecture', 'promises', 'purpose', 'refusals', 'v1-scope', 'v1-success']);
    expect(modeled('success-criterion').sort()).toEqual(['v1:1', 'vision:1', 'vision:2']);
    expect(shape.items.filter((i) => i.class === 'principle')).toEqual([]);
  });

  it('class and category D are Unknown only for the failed class', () => {
    expect(shape.classes.principle.denominator).toEqual({ kind: 'unknown', reasons: ['excluded-content'] });
    expect(shape.classes.principle.sourcesWithUnknownDenominator).toBe(1);
    expect(shape.classes['success-criterion'].denominator).toEqual({ kind: 'known', value: 3 });
    expect(shape.classes['project-account-section'].denominator).toEqual({ kind: 'known', value: 6 });
    expect(shape.classes['success-criterion'].sourcesWithUnknownDenominator).toBe(0);
    expect(shape.classes['success-criterion'].claim.epistemic.label).toBe('Observed');
    expect(shape.classes.principle.claim.epistemic.label).toBe('Unknown');
  });
});

describe('PWB-REQ-002 (class-granular) — an unenumerated heading in the composed answer', () => {
  const shape = observe(texts(VISION(GOOD_RULES), v1({ extra: ['', '### Gateways', '', '- **Hidden** - never read'] })));
  const source = shape.sources.find((s) => s.path === 'about/heart-and-soul/v1.md');

  it('is surfaced with its text, level, class, exact anchor and a route to its source', () => {
    expect(shape.unenumeratedHeadings.map(({ path, class: cls, level, text, line }) => ({ path, cls, level, text, line }))).toEqual([
      { path: 'about/heart-and-soul/v1.md', cls: 'catalog-entry', level: 3, text: 'Gateways', line: 37 },
    ]);
    const [heading] = shape.unenumeratedHeadings;
    expect(heading?.sourceIdentity).toBe(source?.identity);
    expect(heading?.anchor).toMatchObject({ path: 'about/heart-and-soul/v1.md', line: 37 });
    expect(heading?.claim.epistemic).toMatchObject({ label: 'Unknown', reasons: { primary: 'missing-declaration' } });
    expect(heading?.claim.resolutionRoutes[0]?.route).toBe('First-pass drafting for owner sign-off');
  });

  it('mints no item and keeps the nine headings\' items modeled', () => {
    expect(shape.items.filter((i) => i.class === 'catalog-entry').map((i) => [i.key, i.state])).toEqual([
      ['Bus', 'modeled'],
      ['Atlas', 'modeled'],
      ['Bishop', 'modeled'],
    ]);
  });

  it('leaves the catalog-entry class D and the source D Unknown with the reason, not partial', () => {
    expect(shape.classes['catalog-entry'].denominator).toEqual({ kind: 'unknown', reasons: ['missing-declaration'], unenumerated: { reason: 'unenumerated-heading', headings: 1 } });
    expect(source?.partiallyExtracted).toBe(false);
    expect(source?.itemDenominator).toMatchObject({ kind: 'unknown', unenumeratedHeadings: 1, unknown: { unknownReason: 'missing-declaration' } });
    const catalog = source?.classOutcomes.find((o) => o.class === 'catalog-entry')?.denominator;
    expect(catalog).toMatchObject({ kind: 'unknown', reason: 'unenumerated-heading', unenumeratedHeadings: 1 });
    expect(source?.classOutcomes.find((o) => o.class === 'success-criterion')?.denominator).toEqual({ kind: 'known', value: 1 });
  });

  it('makes every derived catalog count Unknown', () => {
    const counts = shape.facts.filter((f) => f.fact.fact.startsWith('catalog-count:'));
    expect(counts.length).toBe(9);
    expect(counts.every((f) => f.fact.state === 'unknown')).toBe(true);
  });
});

describe('PWB-REQ-002 (class-granular) — counts without a read root index say so', () => {
  const files = texts(VISION(GOOD_RULES), v1());
  const { 'about/README.md': _root, ...withoutRoot } = files;
  const unread = observe(withoutRoot);
  const read = observe(files);

  it('admits the tree-rule sources and qualifies the counts that include them', () => {
    expect(unread.rootIndexRead).toBe(false);
    expect(unread.counts.populationWithoutReadRootIndex).toBe(true);
    expect(unread.classes['baseline-spec']).toMatchObject({ withoutReadRootIndex: true, declared: 1, denominator: { kind: 'known', value: 1 } });
    expect(unread.classes['roster-identity']).toMatchObject({ withoutReadRootIndex: true, declared: 1, denominator: { kind: 'known', value: 1 } });
    expect(unread.sources.filter((s) => s.rule === 'baseline-spec-tree' || s.rule === 'roster-tree').map((s) => s.path)).toEqual([
      'openspec/specs/alpha/spec.md',
      'roster/atlas/MANIFESTO.md',
      'roster/atlas/butler.toml',
    ]);
  });

  it('mints no item from a rule that needs the root index', () => {
    expect(unread.sources.map((s) => s.rule).sort()).toEqual(['baseline-spec-tree', 'root-index', 'roster-tree', 'roster-tree']);
    expect(unread.items.map((i) => i.class).sort()).toEqual(['baseline-spec', 'roster-identity']);
  });

  it('qualifies nothing when the root index was read', () => {
    expect(read.rootIndexRead).toBe(true);
    expect(read.counts.populationWithoutReadRootIndex).toBe(false);
    for (const aggregate of Object.values(read.classes)) expect(aggregate.withoutReadRootIndex).toBe(false);
  });

  it('classes made only of root-needing rules are never qualified', () => {
    expect(unread.classes.principle.withoutReadRootIndex).toBe(false);
    expect(unread.classes.principle.denominator.kind).toBe('unknown');
  });
});

// ---------------------------------------------------------------------
// Oracle 3 — rule names from an independent derivation of the population.

const TREE_PATHS = [
  'about/README.md',
  'about/heart-and-soul/README.md',
  'about/heart-and-soul/vision.md',
  'about/heart-and-soul/craft/README.md',
  'about/heart-and-soul/craft/policy.md',
  'about/legends-and-lore/README.md',
  'about/legends-and-lore/a.md',
  'openspec/README.md',
  'openspec/specs/alpha/spec.md',
  'openspec/specs/beta/spec.md',
  'roster/README.md',
  'roster/atlas/butler.toml',
  'roster/atlas/MANIFESTO.md',
  'roster/bishop/butler.toml',
  'roster/bishop/MANIFESTO.md',
  'roster/bishop/notes.md',
];

const INDEX_TEXT: Readonly<Record<string, string>> = {
  'about/README.md': [
    '# Fixture',
    '',
    '| Pillar | Directory |',
    '|---|---|',
    '| Heart and Soul | `about/heart-and-soul/` |',
    '| Legends and Lore | `about/legends-and-lore/` |',
    '| Spec and Spine | `openspec/` |',
    '| Lay and Land | `roster/` |',
    '| Craft and Care | `about/heart-and-soul/craft/` |',
    '',
  ].join('\n'),
  // Heart and Soul's index names the nested pillar's own index.
  'about/heart-and-soul/README.md': '[Vision](vision.md) [Craft index](craft/README.md)\n',
  'about/heart-and-soul/craft/README.md': '[Policy](policy.md)\n',
  'about/legends-and-lore/README.md': '[A](a.md)\n',
  // Spec and Spine declared at openspec/ names a baseline spec.
  'openspec/README.md': '[Alpha](specs/alpha/spec.md)\n',
  // Lay and Land declared at roster/ names a butler.toml, its MANIFESTO.md and a stray file.
  'roster/README.md': '[Atlas](atlas/butler.toml) [Manifesto](atlas/MANIFESTO.md) [Notes](bishop/notes.md)\n',
};

// The stated order, written out: root index; a pillar's index; a tree
// population (baseline spec, roster butler.toml); any other file a pillar's
// index names; otherwise the fourth rule's roster MANIFESTO.md.
function oracleRules(tree: readonly string[], rootRead: boolean): Map<string, string> {
  const out = new Map<string, string>();
  const has = (path: string): boolean => tree.includes(path);
  if (has('about/README.md')) out.set('about/README.md', 'root-index');
  const roots: string[] = [];
  if (rootRead) {
    for (const row of (INDEX_TEXT['about/README.md'] as string).split('\n')) {
      const m = /^\|[^|]+\|\s*`([^`]+)\/`\s*\|$/.exec(row);
      if (m !== null) roots.push(m[1] as string);
    }
  }
  const indexes = roots.map((root) => `${root}/README.md`).filter(has);
  for (const index of indexes) out.set(index, 'pillar-index');
  for (const path of tree) {
    if (/^openspec\/specs\/[^/]+\/spec\.md$/.test(path)) if (!out.has(path)) out.set(path, 'baseline-spec-tree');
    if (/^roster\/[^/]+\/butler\.toml$/.test(path)) if (!out.has(path)) out.set(path, 'roster-tree');
  }
  for (const index of indexes) {
    const root = index.slice(0, -'/README.md'.length);
    for (const link of (INDEX_TEXT[index] ?? '').matchAll(/\]\(([^)]+)\)/g)) {
      const target = `${root}/${link[1] as string}`;
      if (has(target) && !out.has(target)) out.set(target, 'pillar-named-file');
    }
  }
  for (const path of tree) {
    if (/^roster\/[^/]+\/MANIFESTO\.md$/.test(path) && !out.has(path) && has(path.replace('MANIFESTO.md', 'butler.toml'))) out.set(path, 'roster-tree');
  }
  return out;
}

function manifestRules(rootRead: boolean): Map<string, string> {
  const tree: GitTreeEntry[] = TREE_PATHS.map((path, n) => ({ mode: '100644', type: 'blob', objectId: n.toString(16).padStart(40, '0'), sizeBytes: 10, path }));
  const result = deriveProjectShapeManifest({
    repositoryId: 'repository:fixture',
    revision: 'e'.repeat(40),
    tree,
    readSeed: ({ path }): SeedRead =>
      path === 'about/README.md' && !rootRead
        ? { kind: 'unavailable', reason: 'fixture withholds the root index' }
        : INDEX_TEXT[path] === undefined
          ? { kind: 'unavailable', reason: 'no text' }
          : { kind: 'text', text: INDEX_TEXT[path] },
  });
  if (result.kind !== 'manifest') throw new Error(result.reason);
  return new Map(result.manifest.sources.map((s) => [s.path, s.rule]));
}

describe('PWB-REQ-002 (class-granular) — every source names the rule that admitted it, by the stated order', () => {
  it('matches an independent derivation of the population, doubly admitted sources included', () => {
    const expected = oracleRules(TREE_PATHS, true);
    expect(Object.fromEntries([...manifestRules(true)].sort())).toEqual(Object.fromEntries([...expected].sort()));
  });

  it('hand-typed: the order decides each doubly admitted source', () => {
    const rules = manifestRules(true);
    // The root index is root-index; every pillar's own index is pillar-index, even the one another index names.
    expect(rules.get('about/README.md')).toBe('root-index');
    expect(rules.get('about/heart-and-soul/craft/README.md')).toBe('pillar-index');
    expect(rules.get('openspec/README.md')).toBe('pillar-index');
    // A baseline spec and a roster butler.toml keep their tree rule though a pillar index names them.
    expect(rules.get('openspec/specs/alpha/spec.md')).toBe('baseline-spec-tree');
    expect(rules.get('roster/atlas/butler.toml')).toBe('roster-tree');
    // A roster MANIFESTO.md a pillar index names is a named file; one none names is the fourth rule's.
    expect(rules.get('roster/atlas/MANIFESTO.md')).toBe('pillar-named-file');
    expect(rules.get('roster/bishop/MANIFESTO.md')).toBe('roster-tree');
    expect(rules.get('about/heart-and-soul/craft/policy.md')).toBe('pillar-named-file');
  });

  it('with the root index unread only the root-independent rules admit, beside the root index itself', () => {
    const expected = oracleRules(TREE_PATHS, false);
    expect(Object.fromEntries([...manifestRules(false)].sort())).toEqual(Object.fromEntries([...expected].sort()));
    expect(new Set(manifestRules(false).values())).toEqual(new Set(['root-index', 'baseline-spec-tree', 'roster-tree']));
  });

  it('each rule declares whether it needs the root index', () => {
    expect(SOURCE_RULE_NEEDS_ROOT_INDEX).toEqual({
      'root-index': true,
      'pillar-index': true,
      'pillar-named-file': true,
      'baseline-spec-tree': false,
      'roster-tree': false,
    });
  });
});
