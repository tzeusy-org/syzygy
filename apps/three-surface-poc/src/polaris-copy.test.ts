import { rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import type { PocModel } from '@syzygy/three-surface-poc-core';

import { POLARIS_COPY } from './polaris-copy.js';
import { renderPolarisSourcePage } from './polaris-source.js';
import { sourceRouteIdentities } from './polaris-source.js';
import { renderPolarisPage, renderProjectReading } from './polaris.js';
import { buildFixtureModel } from './test-model-fixture.js';
import { walkthroughJudgmentFixture } from './test-walkthrough-judgment-fixture.js';
import {
  ADMITTING_AUTHORITY,
  PROJECT_SHAPE_FIXTURE_BASELINE_SPEC_PATH,
  PROJECT_SHAPE_FIXTURE_TEXTS,
  PROJECT_SHAPE_FIXTURE_TEXTS_WITHOUT_PRECEDENCE,
  PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC,
  PROJECT_SHAPE_FIXTURE_TEXTS_WITH_SECRET,
  REJECTING_AUTHORITY,
  projectShapeFixtureGit,
} from './test-project-shape-fixture.js';

const cleanups: string[] = [];
afterEach(() => {
  for (const directory of cleanups.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Hand-typed oracle (PWB-REQ-012). Nothing below is imported from the
// renderer or the copy table: the role set, the word limits, the prohibited
// vocabulary and the word counter are all restated here.

const ROLES = ['project-fact', 'epistemic-disclosure', 'action-label', 'scope-instruction'] as const;
const HEADING_WORD_LIMIT = 6;
const LEDE_WORD_LIMIT = 20;
const PROHIBITED = /\b(page|document|reading|section|movement|presentation)\b/i;
const VOID_TAGS = new Set(['br', 'hr', 'img', 'meta', 'link', 'input', 'wbr', 'source']);

interface Violation {
  readonly rule: 'unclassified' | 'unknown-role' | 'multiply-classified' | 'heading-too-long' | 'lede-too-long' | 'prohibited-term' | 'scope-instruction-count' | 'scope-instruction-role' | 'action-label-count' | 'disclosure-role';
  readonly text: string;
}

interface CopyString {
  readonly role: string | undefined;
  readonly text: string;
}

interface Frame {
  readonly tag: string;
  readonly role: string | undefined;
  readonly kind: 'heading' | 'lede' | 'notice' | undefined;
  readonly interactive: boolean;
  text: string;
  actionLabels: number;
}

function decode(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function attr(attrs: string, name: string): string[] {
  return [...attrs.matchAll(new RegExp(`\\s${name}="([^"]*)"`, 'g'))].map((match) => match[1] as string);
}

/** Words are whitespace-separated tokens carrying at least one letter or digit. */
function countWords(text: string): number {
  return text.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

/** A plain stack extractor over the served HTML: every text node outside the
 * head, style and script elements, with the role of its innermost declaring
 * ancestor, plus the per-element checks the requirement names. */
function sweep(html: string): { strings: CopyString[]; violations: Violation[] } {
  const body = html
    .replace(/<head>[\s\S]*?<\/head>/g, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/g, '');
  const strings: CopyString[] = [];
  const violations: Violation[] = [];
  const stack: Frame[] = [];
  let pocBound = 0;
  const tokens = body.matchAll(/<!--[\s\S]*?-->|<![^>]*>|<\/([A-Za-z][\w-]*)\s*>|<([A-Za-z][\w-]*)([^>]*)>|([^<]+)/g);
  for (const token of tokens) {
    const [whole, closing, opening, rawAttrs, text] = token;
    if (whole.startsWith('<!')) continue;
    if (opening !== undefined) {
      const tag = opening.toLowerCase();
      const attrs = rawAttrs ?? '';
      const roleValues = attr(attrs, 'data-copy-role');
      let role = stack.length === 0 ? undefined : (stack[stack.length - 1] as Frame).role;
      if (roleValues.length > 1 || roleValues.some((value) => /\s/.test(value))) {
        violations.push({ rule: 'multiply-classified', text: roleValues.join(' ') });
      }
      if (roleValues.length >= 1) {
        role = roleValues[0];
        if (!(ROLES as readonly string[]).includes(role as string)) {
          violations.push({ rule: 'unknown-role', text: role as string });
        }
      }
      if (attr(attrs, 'data-scope').includes('poc-bound')) {
        pocBound += 1;
        if (roleValues[0] !== 'scope-instruction') violations.push({ rule: 'scope-instruction-role', text: attrs.trim() });
      }
      const classes = attr(attrs, 'class').join(' ');
      if (/\b(claim-tuple|unknown-disclosure|notice)\b/.test(classes) && roleValues[0] !== 'epistemic-disclosure') {
        violations.push({ rule: 'disclosure-role', text: attrs.trim() });
      }
      const kind = /^h[1-6]$/.test(tag) ? 'heading' : /\blede\b|-lede\b/.test(classes) ? 'lede' : /\bnotice\b/.test(classes) ? 'notice' : undefined;
      const frame: Frame = { tag, role, kind, interactive: tag === 'a' || tag === 'button', text: '', actionLabels: 0 };
      if (roleValues[0] === 'action-label') {
        for (const ancestor of stack) if (ancestor.interactive) ancestor.actionLabels += 1;
        if (frame.interactive) frame.actionLabels += 1;
      }
      if (!VOID_TAGS.has(tag) && !attrs.trimEnd().endsWith('/')) stack.push(frame);
      continue;
    }
    if (closing !== undefined) {
      const frame = stack.pop();
      if (frame === undefined || frame.tag !== closing.toLowerCase()) {
        throw new Error(`malformed markup: closing ${closing} against ${frame?.tag ?? 'nothing'}`);
      }
      const content = frame.text.replace(/\s+/g, ' ').trim();
      if (frame.kind === 'heading' && countWords(content) > HEADING_WORD_LIMIT) violations.push({ rule: 'heading-too-long', text: content });
      if (frame.kind === 'lede' && countWords(content) > LEDE_WORD_LIMIT) violations.push({ rule: 'lede-too-long', text: content });
      if (frame.kind !== undefined && PROHIBITED.test(content)) violations.push({ rule: 'prohibited-term', text: content });
      if (frame.interactive && frame.actionLabels > 1) violations.push({ rule: 'action-label-count', text: content });
      const parent = stack[stack.length - 1];
      if (parent !== undefined) parent.text += ` ${frame.text}`;
      continue;
    }
    if (text !== undefined) {
      const decoded = decode(text);
      const parent = stack[stack.length - 1];
      if (parent !== undefined) parent.text += decoded;
      const trimmed = decoded.replace(/\s+/g, ' ').trim();
      if (trimmed === '') continue;
      const role = parent?.role;
      strings.push({ role, text: trimmed });
      if (role === undefined) violations.push({ rule: 'unclassified', text: trimmed });
    }
  }
  if (stack.length !== 0) throw new Error(`malformed markup: ${stack.length} unclosed element(s)`);
  if (pocBound > 1) violations.push({ rule: 'scope-instruction-count', text: String(pocBound) });
  return { strings, violations };
}

// ---------------------------------------------------------------------------

type Variant = 'unevaluated' | 'rejected' | 'observed' | 'observed-without-precedence' | 'observed-bare-root' | 'observed-with-secret' | 'observed-with-baseline-spec' | 'observation-failed' | 'judgment-absent' | 'judgment-unlawful' | 'judgment-lawful' | 'judgment-ready';
const VARIANTS: readonly Variant[] = ['unevaluated', 'rejected', 'observed', 'observed-without-precedence', 'observed-bare-root', 'observed-with-secret', 'observed-with-baseline-spec', 'observation-failed', 'judgment-absent', 'judgment-unlawful', 'judgment-lawful', 'judgment-ready'];
// A root index with neither grammar: links only, as the fixture root read
// before the 2026-09-05 amendment.
const BARE_ROOT_TEXTS: Readonly<Record<string, string>> = {
  ...PROJECT_SHAPE_FIXTURE_TEXTS,
  'about/README.md': (PROJECT_SHAPE_FIXTURE_TEXTS['about/README.md'] as string).split('\n### Precedence Order')[0] as string,
};

function buildVariant(variant: Variant, owned: string[]): PocModel {
  switch (variant) {
    case 'unevaluated':
      return buildFixtureModel(owned);
    case 'rejected':
      return buildFixtureModel(owned, { projectShape: { authority: REJECTING_AUTHORITY, runGit: projectShapeFixtureGit() } });
    case 'observed':
      return buildFixtureModel(owned, { projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit() } });
    case 'observed-without-precedence':
      return buildFixtureModel(owned, { projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit(PROJECT_SHAPE_FIXTURE_TEXTS_WITHOUT_PRECEDENCE) } });
    case 'observed-bare-root':
      return buildFixtureModel(owned, { projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit(BARE_ROOT_TEXTS) } });
    case 'observed-with-secret':
      return buildFixtureModel(owned, { projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit(PROJECT_SHAPE_FIXTURE_TEXTS_WITH_SECRET) } });
    case 'observed-with-baseline-spec':
      return buildFixtureModel(owned, { projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit(PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC) } });
    case 'observation-failed': {
      const inner = projectShapeFixtureGit();
      const failing = (args: readonly string[]): Uint8Array => {
        if (args[0] === 'ls-tree') throw new Error('fixture: tree listing refused');
        return inner(args);
      };
      return buildFixtureModel(owned, { projectShape: { authority: ADMITTING_AUTHORITY, runGit: failing } });
    }
    case 'judgment-absent':
      return buildFixtureModel(owned, { walkthroughJudgment: walkthroughJudgmentFixture('absent-run-record') });
    case 'judgment-unlawful':
      return buildFixtureModel(owned, { walkthroughJudgment: walkthroughJudgmentFixture('unlawful') });
    case 'judgment-lawful':
      return buildFixtureModel(owned, { walkthroughJudgment: walkthroughJudgmentFixture('lawful-state-1') });
    case 'judgment-ready':
      // Observed shape plus a Polaris-only record anchored into it: the one
      // variant whose PWB-REQ-021 readiness is `ready`.
      return buildFixtureModel(owned, {
        projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit() },
        walkthroughJudgment: walkthroughJudgmentFixture('lawful-state-1', 'judgment-eval-0001', { traversed: ['/polaris'] }),
      });
  }
}

// Each variant's model is built once for the suite (syzygy-4d15): three
// tests rebuilt the same twelve models up to twenty times each and timed
// out at the default 5 s under parallel load. Models are deep-frozen, so a
// test that mutated a shared model would fail rather than leak into another.
const variantCleanups: string[] = [];
const VARIANT_MODELS = new Map<Variant, PocModel>();

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

// Measured worst case for the twelve builds under the parallel-load
// protocol is recorded in docs/evidence/poc-test-timeouts-2026-10-03.json.
beforeAll(() => {
  for (const variant of VARIANTS) VARIANT_MODELS.set(variant, deepFreeze(buildVariant(variant, variantCleanups)));
}, 60_000); // before this hoist, tests building these models took up to 13.1 s each under parallel load (docs/evidence/poc-test-timeouts-2026-10-03.json)

afterAll(() => {
  for (const directory of variantCleanups.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function modelFor(variant: Variant): PocModel {
  const model = VARIANT_MODELS.get(variant);
  if (model === undefined) throw new Error(`variant model not built: ${variant}`);
  return model;
}

function multiSourceModel(): PocModel {
  const texts = { ...PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC,
    'openspec/specs/beta/spec.md': '# Beta\n\n### Requirement: Beta\n\n- SHALL remain bounded.\n' };
  return buildFixtureModel(cleanups, { projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit(texts) } });
}

const FRESHNESS_VALUES = ['fresh', 'stale', 'broken', 'superseded'] as const;
type FreshnessValue = (typeof FRESHNESS_VALUES)[number];

/** Independent structural census of the claims the project-shape model owns.
 * This deliberately does not import the renderer's claim walker or copy. */
function freshnessCounts(model: PocModel): Readonly<Record<FreshnessValue, number>> {
  const counts: Record<FreshnessValue, number> = { fresh: 0, stale: 0, broken: 0, superseded: 0 };
  const visit = (value: unknown): void => {
    if (value === null || typeof value !== 'object') return;
    if ('epistemic' in value) {
      const epistemic = (value as { epistemic?: unknown }).epistemic;
      if (epistemic !== null && typeof epistemic === 'object' && 'freshness' in epistemic) {
        const freshness = (epistemic as { freshness?: unknown }).freshness;
        if (typeof freshness === 'string' && FRESHNESS_VALUES.includes(freshness as FreshnessValue)) counts[freshness as FreshnessValue] += 1;
      }
    }
    for (const child of Object.values(value)) visit(child);
  };
  visit(model.projectShape);
  return counts;
}

/** Produces fixture states without copying the renderer's reachability logic. */
function withEveryShapeClaimFreshness(model: PocModel, freshness: FreshnessValue): PocModel {
  const clone = JSON.parse(JSON.stringify(model)) as unknown;
  const rewrite = (value: unknown): void => {
    if (value === null || typeof value !== 'object') return;
    if ('epistemic' in value) {
      const epistemic = (value as { epistemic?: unknown }).epistemic;
      if (epistemic !== null && typeof epistemic === 'object' && 'freshness' in epistemic) {
        (epistemic as { freshness: FreshnessValue }).freshness = freshness;
      }
    }
    for (const child of Object.values(value)) rewrite(child);
  };
  rewrite((clone as { projectShape: unknown }).projectShape);
  return clone as PocModel;
}

function freshnessGlossaryItem(html: string, freshness: FreshnessValue): string {
  const item = html.match(new RegExp(`<li[^>]*>${freshness} — [^<]*</li>`))?.[0];
  if (item === undefined) throw new Error(`freshness glossary item missing: ${freshness}`);
  return item;
}

describe('Polaris copy roles (PWB-REQ-012)', () => {
  it('classifies each interpolated source control and preserves exact-source href order and multiplicity', () => {
    const model = multiSourceModel();
    if (model.projectShape.kind !== 'observed') throw new Error('fixture must observe source population');
    const html = renderPolarisPage(model);
    expect(sweep(html).violations).toEqual([]);
    const sources = model.projectShape.sources;
    expect(sources).toHaveLength(17);
    const labels = [...html.matchAll(/<span class="source-record-label"([^>]*)>([^<]*)<\/span>/g)];
    expect(labels).toHaveLength(sources.length);
    for (const [index, label] of labels.entries()) {
      expect(label[1]).not.toContain('data-copy-role=');
      expect(decode(label[2] as string)).toBe(`Source record — ${sources[index]!.path}`);
    }
    expect(sweep(html).strings.filter(entry => entry.text.startsWith('Source record — ')).every(entry => entry.role === 'project-fact')).toBe(true);
    const identities = sourceRouteIdentities(html);
    expect(identities).toHaveLength(8);
    expect(createHash('sha256').update(identities.join('\n')).digest('hex'))
      .toBe('7e8907a1f45c543a49bd06c6a442b05e455630077a47e7b7fa504fa505a3ea60');
    const paths = new Map(sources.map(source => [source.identity, source.path]));
    const links = [...html.matchAll(/<a href="[^"]*\/polaris\/source\?identity=[^"]+"([^>]*)>([^<]+)<\/a>/g)];
    expect(links).toHaveLength(identities.length);
    for (const [index, link] of links.entries()) {
      expect(link[1]).toContain('data-copy-role="action-label"');
      expect(decode(link[2] as string)).toBe(`Exact text — ${paths.get(identities[index]!)}`);
    }
  });
  it('gives every summary and native anchor a distinct accessible name unless its href is identical', () => {
    const html = renderPolarisPage(multiSourceModel())
      .replace(/<head>[\s\S]*?<\/head>/g, '')
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
    const controls = [...html.matchAll(/<(summary|a)\b([^>]*)>([\s\S]*?)<\/\1>/g)].map((match, index) => {
      const attributes = match[2] as string;
      const visible = decode((match[3] as string).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
      const accessible = /\saria-label="([^"]+)"/.exec(attributes)?.[1];
      const href = /\shref="([^"]+)"/.exec(attributes)?.[1];
      return { tag: match[1], name: accessible === undefined ? visible : decode(accessible),
        target: href === undefined ? `summary:${index}` : decode(href) };
    });
    const summaries = controls.filter(control => control.tag === 'summary');
    const anchors = controls.filter(control => control.tag === 'a');
    expect(summaries).toHaveLength(39);
    // 144, plus the opening gloss's glossary link and the proof strip's four
    // segments (syzygy-u05.4), plus intent-to-work's action route (M4 slice 1);
    // 150, plus the opening index's eight routed rows (its gaps row routes
    // nowhere here) and the outline's link to the claim-state legend's
    // heading (PWB-REQ-010 as amended, P-98).
    expect(anchors).toHaveLength(159);
    const byName = new Map<string, Set<string>>();
    for (const control of controls) {
      expect(control.name).not.toBe('');
      const targets = byName.get(control.name) ?? new Set<string>();
      targets.add(control.target);
      byName.set(control.name, targets);
    }
    expect([...byName].filter(([, targets]) => targets.size > 1).map(([name]) => name)).toEqual([]);
  });
  it('renders the seven shape states and three judgment states with every string classified once, within the word bounds, free of the prohibited vocabulary, with one POC-bound scope instruction and at most one action label per control', () => {
    const shapeKinds = new Set<string>();
    for (const variant of VARIANTS) {
      const model = modelFor(variant);
      shapeKinds.add(model.projectShape.kind);
      const html = renderPolarisPage(model);
      const { strings, violations } = sweep(html);
      expect(violations, `${variant}: ${JSON.stringify(violations.slice(0, 5))}`).toEqual([]);
      expect(strings.length).toBeGreaterThan(40);
      // Exactly one POC-bound scope instruction, and it is the capability one.
      const pocBound = [...html.matchAll(/<[^>]*data-scope="poc-bound"[^>]*>/g)];
      expect(pocBound.length).toBe(1);
      expect(pocBound[0]?.[0]).toContain('data-polaris-capability-scope');
      expect(pocBound[0]?.[0]).toContain('data-copy-role="scope-instruction"');
      // The four roles are all in use on every variant.
      const rolesUsed = new Set(strings.map((entry) => entry.role));
      for (const role of ROLES) expect(rolesUsed.has(role), `${variant} lacks ${role}`).toBe(true);
    }
    // The fixtures reach all four shape kinds, so the sweep covers every arm.
    expect([...shapeKinds].sort()).toEqual(['not-admitted', 'not-evaluated', 'observation-failed', 'observed']);
  });

  it('marks exactly the zero-denominator freshness values across observed and unobserved fixture matrices', () => {
    for (const variant of ['observed', 'unevaluated'] as const) {
      for (const freshness of FRESHNESS_VALUES) {
        const used = withEveryShapeClaimFreshness(modelFor(variant), freshness);
        const unusedValue = FRESHNESS_VALUES.find((value) => value !== freshness) as FreshnessValue;
        const unused = withEveryShapeClaimFreshness(modelFor(variant), unusedValue);
        for (const model of [used, unused]) {
          const counts = freshnessCounts(model);
          const expectedMarker = counts[freshness] === 0;
          expect(
            freshnessGlossaryItem(renderPolarisPage(model), freshness).includes('Not reachable at this evaluation'),
            `${variant}/${freshness}: ${JSON.stringify(counts)}`,
          ).toBe(expectedMarker);
        }
      }
    }
  });

  it('keeps no group lede and no connective prose between groups: each group header is one heading', () => {
    const html = renderPolarisPage(modelFor('observed'));
    const headers = [...html.matchAll(/<header class="group"[^>]*>([\s\S]*?)<\/header>/g)].map((match) => (match[1] as string).trim());
    expect(headers.length).toBe(7);
    for (const header of headers) {
      expect(header).toMatch(/^<h2 id="polaris-group-[a-z0-9-]+" data-copy-role="project-fact" data-claim-role="non-normative-framing" data-presentation-artifact data-non-citable>[^<]+<\/h2>$/);
    }
    expect(html).not.toContain('group-lede');
  });

  it('flags meta-narration: the counterexample fixture fails every rule the sweep enforces', () => {
    const counterexample = `<main>
      <header class="group"><h2>This section of the page walks the reader through the presentation</h2></header>
      <p>An unclassified sentence about what the reader is about to read.</p>
      <p data-copy-role="narrative">A role outside the closed set.</p>
      <p data-copy-role="project-fact epistemic-disclosure">Two roles on one string.</p>
      <p class="lede" data-copy-role="project-fact">One two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty twenty-one.</p>
      <p class="notice" data-copy-role="epistemic-disclosure">A notice about this document.</p>
      <p data-scope="poc-bound" data-copy-role="scope-instruction">First bound.</p>
      <p data-scope="poc-bound" data-copy-role="project-fact">Second bound with the wrong role.</p>
      <a href="#x"><span data-copy-role="action-label">Open</span> <span data-copy-role="action-label">Close</span></a>
      <span class="claim-tuple" data-copy-role="project-fact">Unknown · unstated · fresh</span>
    </main>`;
    const { violations } = sweep(counterexample);
    const rules = new Set(violations.map((violation) => violation.rule));
    expect([...rules].sort()).toEqual([
      'action-label-count',
      'disclosure-role',
      'heading-too-long',
      'lede-too-long',
      'multiply-classified',
      'prohibited-term',
      'scope-instruction-count',
      'scope-instruction-role',
      'unclassified',
      'unknown-role',
    ]);
    expect(violations.filter((violation) => violation.rule === 'prohibited-term').length).toBe(2);
    // A clean fragment produces nothing.
    expect(sweep('<main><h2 data-copy-role="project-fact">What Butlers is</h2><p data-copy-role="project-fact">A fact.</p></main>').violations).toEqual([]);
  });

  it('keeps the copy table closed and rendered: unique ids, roles and kinds from the closed sets, and every row present with its role in some rendered state', () => {
    const ids = POLARIS_COPY.map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
    const kinds = ['heading', 'lede', 'notice', 'sentence', 'label'];
    for (const row of POLARIS_COPY) {
      expect(ROLES).toContain(row.role);
      expect(kinds).toContain(row.kind);
      if (row.kind === 'heading') expect(countWords(row.text), row.id).toBeLessThanOrEqual(HEADING_WORD_LIMIT);
      if (row.kind === 'lede') expect(countWords(row.text), row.id).toBeLessThanOrEqual(LEDE_WORD_LIMIT);
      if (row.kind !== 'sentence' && row.kind !== 'label') expect(row.text, row.id).not.toMatch(PROHIBITED);
    }
    const rendered: CopyString[] = [];
    for (const variant of VARIANTS) rendered.push(...sweep(renderPolarisPage(modelFor(variant))).strings);
    rendered.push(...sweep(`<div data-copy-role="project-fact">${renderProjectReading({ summary: 'Selected complete paragraph.', full: 'Complete declaration.', condensed: true })}</div>`).strings);
    rendered.push(...sweep(`<div data-copy-role="project-fact">${renderProjectReading({ summary: 'A complete statement.', full: 'Example component\n\nA complete statement.', condensed: true, chapters: [{ id: 'example', title: 'Example component', body: 'A complete statement.' }] })}</div>`).strings);
    // The exact-source route's own strings: rendered text, an identity the
    // population does not carry, an empty identity, and an unobserved shape.
    const withSpec = modelFor('observed-with-baseline-spec');
    const specIdentity = withSpec.projectShape.kind === 'observed' ? withSpec.projectShape.sources.find((source) => source.path === PROJECT_SHAPE_FIXTURE_BASELINE_SPEC_PATH)?.identity ?? '' : '';
    const specBytes = new TextEncoder().encode(PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC[PROJECT_SHAPE_FIXTURE_BASELINE_SPEC_PATH] as string);
    rendered.push(...sweep(renderPolarisSourcePage(withSpec, specIdentity, '', { verbatim: () => specBytes })).strings);
    rendered.push(...sweep(renderPolarisSourcePage(withSpec, 'nobody@0:none#0')).strings);
    rendered.push(...sweep(renderPolarisSourcePage(withSpec, '')).strings);
    rendered.push(...sweep(renderPolarisSourcePage(modelFor('unevaluated'), specIdentity)).strings);
    // Rows the five fixtures cannot reach, restated by hand so a newly
    // reachable row must be removed from here rather than silently pass.
    const UNREACHED_IN_FIXTURES = new Set<string>([
      'label.deferred',
      'label.limit-breaches',
      'label.no-route',
      'label.secondary-reasons',
      'label.exclusive-with',
      'sentence.no-competitor',
      'sentence.no-intent-declared',
      'sentence.separate-futures',
      'sentence.missing-statement',
    ]);
    for (const row of POLARIS_COPY) {
      const present = rendered.some((entry) => entry.role === row.role && (entry.text === row.text || entry.text.startsWith(row.text) || entry.text.includes(row.text)));
      if (UNREACHED_IN_FIXTURES.has(row.id)) {
        expect(present, `${row.id} is now reachable; drop it from UNREACHED_IN_FIXTURES`).toBe(false);
      } else {
        expect(present, `${row.id} ("${row.text}") never rendered with role ${row.role}`).toBe(true);
      }
    }
  });
});
