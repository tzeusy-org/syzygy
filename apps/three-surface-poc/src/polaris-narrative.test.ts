import { rmSync } from 'node:fs';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import type { PocModel, ProjectShape, ProjectShapeClaim } from '@syzygy/three-surface-poc-core';

import { NarrativeRegistry } from './polaris-narrative.js';
import { renderPolarisPage, renderPolarisPresentation } from './polaris.js';
import { pocRoutes } from './routes.js';
import { SHARED_FIXTURE_TIMEOUT_MS, buildFixtureModel, sharedFixtureModels } from './test-model-fixture.js';
import {
  ADMITTING_AUTHORITY,
  PROJECT_SHAPE_FIXTURE_TEXTS_WITHOUT_BASELINE_SPEC,
  PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC,
  PROJECT_SHAPE_FIXTURE_TEXTS_WITH_SECRET,
  REJECTING_AUTHORITY,
  projectShapeFixtureGit,
} from './test-project-shape-fixture.js';

const cleanups: string[] = [];
afterEach(() => {
  for (const directory of cleanups.splice(0)) rmSync(directory, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Hand-typed expectations (PWB-REQ-014). Nothing below imports a production
// vocabulary; the anchor rules are re-derived from the captured model JSON.
const ROLES = ['anchored-project-fact', 'non-normative-framing', 'epistemic-claim'] as const;
const TARGET_CLASSES = ['doctrine', 'contract', 'requirement', 'decision', 'evidence', 'work'] as const;
const MAX_ANCHORS = 6;
const PROVENANCE_CLASS: Record<string, string> = {
  'repository-file': 'evidence',
  'git-revision': 'evidence',
  'manual-mapping': 'evidence',
  'materialization-record': 'work',
  'test-artifact-record': 'evidence',
  'project-shape-source': 'evidence',
  'owner-act': 'decision',
};

type Variant = 'unevaluated' | 'rejected' | 'observed' | 'observed-with-secret' | 'observed-with-baseline';
const VARIANTS: readonly Variant[] = ['unevaluated', 'rejected', 'observed', 'observed-with-secret', 'observed-with-baseline'];

/** A fresh model, for a test that changes it. */
function modelFor(variant: Variant, cleanupList: string[] = cleanups): PocModel {
  switch (variant) {
    case 'unevaluated':
      return buildFixtureModel(cleanupList);
    case 'rejected':
      return buildFixtureModel(cleanupList, { projectShape: { authority: REJECTING_AUTHORITY, runGit: projectShapeFixtureGit() } });
    case 'observed':
      return buildFixtureModel(cleanupList, { projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit() } });
    case 'observed-with-secret':
      return buildFixtureModel(cleanupList, { projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit(PROJECT_SHAPE_FIXTURE_TEXTS_WITH_SECRET) } });
    case 'observed-with-baseline':
      return buildFixtureModel(cleanupList, { projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit(PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC) } });
  }
}

/** Each variant built once for the file and frozen, for tests that only read it. */
const shared = sharedFixtureModels<Variant>((cleanupList) => Object.fromEntries(VARIANTS.map((variant) => [variant, modelFor(variant, cleanupList)])) as Record<Variant, PocModel>);
beforeAll(shared.prepare, SHARED_FIXTURE_TIMEOUT_MS);
afterAll(shared.remove);

interface Unit { readonly tag: string; readonly attrs: string; readonly inner: string }

/** The opening index (PWB-REQ-010 as amended, P-98) precedes the narrative
 * tree and is not one of its units: its strings carry a copy role and no
 * claim role. Exactly one per page. */
const OPENING_INDEX = /<nav\b[^>]*\sdata-polaris-opening-index[^>]*>[\s\S]*?<\/nav>/g;

/** Every element carrying a copy role or a claim role, with its inner HTML,
 * outside the opening index. */
function narrativeUnits(html: string): Unit[] {
  const body = html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '').replace(OPENING_INDEX, '');
  const tokens = [...body.matchAll(/<\/([A-Za-z][\w-]*)\s*>|<([A-Za-z][\w-]*)([^>]*)>/g)];
  const VOID = new Set(['br', 'hr', 'img', 'input', 'meta', 'link']);
  const units: Unit[] = [];
  const stack: { name: string; attrs: string; start: number; tracked: boolean }[] = [];
  for (const token of tokens) {
    if (token[1] !== undefined) {
      for (let depth = stack.length - 1; depth >= 0; depth -= 1) {
        const open = stack[depth] as { name: string; attrs: string; start: number; tracked: boolean };
        if (open.name === token[1]) {
          stack.splice(depth);
          if (open.tracked) units.push({ tag: open.name, attrs: open.attrs, inner: body.slice(open.start, token.index) });
          break;
        }
      }
      continue;
    }
    const name = token[2] as string;
    const attrs = token[3] as string;
    if (VOID.has(name)) continue;
    stack.push({ name, attrs, start: (token.index as number) + token[0].length, tracked: /data-copy-role=|data-claim-role=/.test(attrs) });
  }
  expect(stack.filter((open) => open.tracked)).toEqual([]);
  return units;
}

function attr(attrs: string, name: string): string | undefined {
  return new RegExp(`\\s${name}="([^"]*)"`).exec(attrs)?.[1];
}

function claimsOf(shape: ProjectShape): Map<string, ProjectShapeClaim> {
  const claims = new Map<string, ProjectShapeClaim>();
  claims.set(shape.claim.claimId, shape.claim);
  if (shape.kind !== 'observed') return claims;
  for (const group of [shape.projectAccount, shape.sources, shape.items, Object.values(shape.classes), shape.facts]) {
    for (const entry of group) claims.set(entry.claim.claimId, entry.claim);
  }
  return claims;
}

interface ExpectedAnchor { readonly cls: string; readonly target: string; readonly revision: string }

/** Independent re-derivation of each claim's anchor set from the model. */
function expectedAnchors(model: PocModel, claimId: string, blockId: string): ExpectedAnchor[] {
  const shape = model.projectShape;
  const revision = shape.kind === 'observed' ? shape.identity.revision : '';
  const entity = model.entities.find((candidate) => candidate.id === claimId);
  const relationship = model.relationships.find((candidate) => candidate.id === claimId);
  const provenance = entity?.provenance ?? relationship?.provenance;
  if (provenance !== undefined) {
    return provenance.map((item) => ({ cls: PROVENANCE_CLASS[item.kind] as string, target: `${item.kind}:${item.digest ?? item.revision}`, revision: item.revision }));
  }
  if (claimId === 'region:code-structure' && model.codeStructure.kind === 'observed') {
    return [{ cls: 'evidence', target: `git-tree:${model.codeStructure.provenance.revision}`, revision: model.codeStructure.provenance.revision }];
  }
  if (claimId === 'region:work-items' && model.workItems.kind === 'observed') {
    return [{ cls: 'work', target: `beads-dolt:${model.workItems.provenance.revision}`, revision: model.workItems.provenance.revision }];
  }
  // A proposal is never an anchored block (PWB-REQ-015: non-anchorable); the
  // capability-detail test asserts its absence from the anchor population.
  if (claimId === model.proposedWork.id) throw new Error(`proposal registered as an anchored block: ${claimId}`);
  if (claimId === 'claim:project-shape') return [{ cls: 'evidence', target: `git-tree:${revision}`, revision }];
  const claim = claimsOf(shape).get(claimId);
  if (claim === undefined) throw new Error(`no oracle for ${claimId}`);
  // The same baseline-spec item is cited as evidence in the catalog and as
  // the current requirement beside the proposal.
  const cls = blockId.endsWith('/current-authority') ? 'requirement' : 'evidence';
  return claim.support.map((support) => ({ cls, target: support.sourceIdentity ?? `sha256:${support.contentDigest as string}`, revision }));
}

const sortKey = (anchor: ExpectedAnchor): string => `${anchor.cls}|${anchor.target}|${anchor.revision}`;

describe('Polaris narrative claim blocks (PWB-REQ-014; RFC7-2, RFC7-3, RFC7-9)', () => {
  it('classifies every narrative unit with exactly one role and marks it a non-citable presentation artifact', () => {
    let anchored = 0;
    for (const variant of VARIANTS) {
      const html = renderPolarisPage(shared.get(variant));
      const index = html.match(OPENING_INDEX) ?? [];
      expect(index, `${variant}: one opening index`).toHaveLength(1);
      expect(index[0], `${variant}: the opening index carries no claim role`).not.toMatch(/data-claim-role=|data-presentation-artifact|data-non-citable|data-narrative-block/);
      const units = narrativeUnits(html);
      expect(units.length).toBeGreaterThan(40);
      for (const unit of units) {
        const roles = [...unit.attrs.matchAll(/\sdata-claim-role="([^"]*)"/g)].map((m) => m[1]);
        expect(roles, `${variant}: <${unit.tag}${unit.attrs}>`).toHaveLength(1);
        expect(ROLES).toContain(roles[0]);
        expect(unit.attrs).toMatch(/\sdata-presentation-artifact(\s|$)/);
        expect(unit.attrs).toMatch(/\sdata-non-citable(\s|$)/);
        if (roles[0] === 'anchored-project-fact') {
          anchored += 1;
          expect(attr(unit.attrs, 'data-narrative-block')).toBeDefined();
          expect(unit.inner).toContain('data-claim-provenance=');
        } else {
          // Only anchored blocks state project facts with provenance.
          expect(unit.inner.split('data-claim-provenance=').length - 1, `${variant}: provenance outside an anchored block: <${unit.tag}${unit.attrs}>`).toBe(0 + (unit.inner.match(/data-claim-role="anchored-project-fact"/g)?.length ?? 0) * 0 + countNested(unit.inner));
        }
        if (roles[0] === 'epistemic-claim') {
          const copyRole = attr(unit.attrs, 'data-polaris-group-opening') === undefined ? 'epistemic-disclosure' : 'project-fact';
          expect(attr(unit.attrs, 'data-copy-role')).toBe(copyRole);
        }
      }
    }
    expect(anchored).toBeGreaterThan(40);
  });

  it('pairs each unavailable project opening with its own visible disclosure and keeps it out of the resolved anchor counts', () => {
    const expected = [
      ['overview', 'project-category', 'Butlers\u2019 purpose and promises are unknown.'],
      ['boundaries', 'project-category', 'The scope and principles are unknown.'],
      ['v1', 'project-category', 'The declared V1 scope is unknown.'],
      ['architecture', 'project-category', 'The declared architecture is unknown.'],
      ['catalog', 'catalog', 'The project catalog is unknown.'],
    ] as const;
    for (const variant of ['unevaluated', 'rejected'] as const) {
      const { html, narrative } = renderPolarisPresentation(shared.get(variant));
      expect(narrative.openings.filter((opening) => opening.groupClass !== 'evidence')).toEqual(expected.map(([group, groupClass]) => ({
        kind: 'group-opening',
        groupId: `polaris-group-${group}`,
        groupClass,
        label: 'Unknown',
        childIds: ['claim:project-shape'],
        role: 'epistemic-claim',
        presentation: 'presentation-artifact',
        citable: false,
      })));
      for (const opening of narrative.openings) {
        expect(opening).not.toHaveProperty('anchors');
        expect(opening).not.toHaveProperty('anchorsResolved');
      }
      const ledes = narrativeUnits(html).filter((unit) => attr(unit.attrs, 'data-polaris-group-opening')?.startsWith('polaris-group-'));
      expect(ledes.map((unit) => [attr(unit.attrs, 'data-polaris-group-opening'), unit.inner]))
        .toEqual(expected.map(([group, , sentence]) => [`polaris-group-${group}`, sentence]));
      for (const [group] of expected) {
        const target = `polaris-shape-status-${group}`;
        expect(html.match(new RegExp(`id="${target}"`, 'g'))).toHaveLength(1);
        expect(html).toContain(`href="#${target}" data-opening-child="claim:project-shape"`);
        expect(html).toContain(`<section class="claim-section" id="${target}" data-polaris-section="shape:${group}"`);
      }
      expect(narrative.blocks.flatMap((block) => block.anchors).some((anchor) => anchor.supports.includes('claim:project-shape'))).toBe(false);
    }
  });



  it('puts the unavailable answer first even over the existing tuple key and reconciliation', () => {
    const { html } = renderPolarisPresentation(shared.get('rejected'));
    for (const group of ['overview', 'boundaries', 'v1', 'architecture', 'catalog']) {
      const header = new RegExp(`<header class="group" data-polaris-group="${group}"[^>]*>.*?</header>`, 's');
      const end = header.exec(html);
      expect(end, group).not.toBeNull();
      const following = html.slice((end?.index ?? 0) + (end?.[0].length ?? 0)).trimStart();
      expect(following.startsWith(`<p class="group-lede" data-polaris-group-opening="polaris-group-${group}"`), group).toBe(true);
    }
  });

  it('matches every unavailable category evidence opening to the existing machine claim and its in-place disclosure', () => {
    const categories = ['overview', 'boundaries', 'v1', 'architecture', 'catalog'] as const;
    for (const variant of ['unevaluated', 'rejected'] as const) {
      const model = shared.get(variant);
      const machine = JSON.parse(JSON.stringify(model)) as PocModel;
      const claim = machine.projectShape.claim;
      expect(claim).toMatchObject({ claimId: 'claim:project-shape', epistemic: { label: 'Unknown' } });
      const primary = 'reasons' in claim.epistemic ? claim.epistemic.reasons.primary : undefined;
      const route = claim.resolutionRoutes.find((entry) => entry.reason === primary)?.route;
      expect(route).toBeDefined();
      const { html, narrative } = renderPolarisPresentation(model);
      const openings = narrative.openings.filter((opening) => opening.groupClass === 'evidence');
      expect(openings).toEqual(categories.map((category) => ({
        kind: 'group-opening',
        groupId: `polaris-evidence-${category}`,
        groupClass: 'evidence',
        label: claim.epistemic.label,
        childIds: [claim.claimId],
        role: 'epistemic-claim',
        presentation: 'presentation-artifact',
        citable: false,
      })));
      const units = narrativeUnits(html);
      for (const category of categories) {
        const target = `polaris-evidence-status-${category}`;
        const group = `polaris-evidence-${category}`;
        expect(html).toContain(`data-polaris-section="shape:${category}" data-polaris-evidence-owner="polaris-group-${category}"`);
        const headings = units.filter((unit) => attr(unit.attrs, 'data-polaris-group-opening') === group);
        expect(headings.map((unit) => unit.inner)).toEqual(['Evidence for this group is unavailable.']);
        const links = units.filter((unit) => unit.tag === 'a' && attr(unit.attrs, 'href') === `#${target}`);
        expect(links).toHaveLength(1);
        expect(attr(links[0]?.attrs ?? '', 'data-opening-child')).toBe(claim.claimId);
        expect(attr(links[0]?.attrs ?? '', 'data-copy-role')).toBe('action-label');
        expect(html.match(new RegExp(`id="${target}"`, 'g'))).toHaveLength(1);
        expect(html).toContain(`id="${target}"><div class="unknown-disclosure" data-unknown-disclosure="${claim.claimId}"`);
        const targetIndex = html.indexOf(`id="${target}"`);
        const disclosure = html.slice(targetIndex, html.indexOf('</section>', targetIndex));
        expect(disclosure).toContain(`data-unknown-reason="${primary}"`);
        expect(disclosure).toContain(route?.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
          .replaceAll('"', '&quot;').replaceAll("'", '&#39;'));
      }
    }
  });

  it('reads the empty baseline catalog from its existing claim without promoting a withheld aggregate', () => {
    const model = buildFixtureModel(cleanups, {
      projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit(PROJECT_SHAPE_FIXTURE_TEXTS_WITHOUT_BASELINE_SPEC) },
    });
    const shape = model.projectShape;
    expect(shape.kind).toBe('observed');
    if (shape.kind !== 'observed') throw new Error('synthetic project shape unavailable');
    expect(shape.items.some((item) => item.class === 'baseline-spec')).toBe(false);

    const groupId = 'polaris-class-baseline-spec';
    const group = (input: PocModel) => {
      const { html, narrative } = renderPolarisPresentation(input);
      return { html, opening: narrative.openings.find((opening) => opening.groupId === groupId) };
    };
    const empty = group(model);
    expect(empty.opening).toMatchObject({ groupClass: 'catalog', label: 'Observed', childIds: ['claim:class:baseline-spec'] });
    expect(empty.html).toMatch(/data-polaris-group-opening="polaris-class-baseline-spec"[^>]*>No items were declared by admitted sources\.<\/p>/);
    expect(empty.html).not.toContain('href="#polaris-class-status-baseline-spec"');

    const aggregate = shape.classes['baseline-spec'];
    const unavailable = shared.get('rejected').projectShape.claim;
    const withheld: PocModel = {
      ...model,
      projectShape: {
        ...shape,
        classes: {
          ...shape.classes,
          'baseline-spec': {
            ...aggregate,
            claim: { ...aggregate.claim, epistemic: unavailable.epistemic, resolutionRoutes: unavailable.resolutionRoutes },
          },
        },
      },
    };
    const unknown = group(withheld);
    expect(unknown.opening).toMatchObject({ label: 'Unknown', childIds: ['claim:class:baseline-spec'] });
    expect(unknown.html).toMatch(/data-polaris-group-opening="polaris-class-baseline-spec"[^>]*>The declarations for this class are unknown[.]<\/p>/);
    expect(unknown.html).toContain('href="#polaris-class-status-baseline-spec" data-opening-child="claim:class:baseline-spec"');
    expect(unknown.html).toContain('<div id="polaris-class-status-baseline-spec"><div class="unknown-disclosure" data-unknown-disclosure="claim:class:baseline-spec"');
    expect(unknown.html).toContain('data-unknown-reason="unconsented-source-or-provider"');
    const populated = group(shared.get('observed-with-baseline'));
    expect(populated.html).not.toMatch(/data-polaris-group-opening="polaris-class-baseline-spec"[^>]*>No items were declared/);
  });

  const catalogGroupId = 'polaris-class-catalog-entry';
  const catalogChildIds = ['claim:class:catalog-entry', 'claim:item:catalog-entry:Bus', 'claim:item:catalog-entry:Atlas', 'claim:item:catalog-entry:Bishop'];
  const catalogHosts = ['127.0.0.1:1', 'tzeusy.parrot-hen.ts.net'];
  const catalogReason = 'contradicted-pending-adjudication';
  const catalogGap = `polaris-gap-${catalogReason}`;

  async function catalogResponses(input: PocModel, host: string) {
    const routes = pocRoutes(() => input);
    const get = async (path: string): Promise<string> => {
      const route = routes.find((candidate) => candidate.method === 'GET' && candidate.path === path);
      if (route === undefined) throw new Error(`Missing Polaris route: ${path}`);
      const response = await route.handle({ request: { method: 'GET', path, headers: { host }, query: new URLSearchParams() } });
      expect(response.status, `${host} ${path}`).toBe(200);
      if (typeof response.body !== 'string') throw new Error(`Expected a string response at ${path}`);
      return response.body;
    };
    const html = await get('/polaris');
    const envelope = JSON.parse(await get('/api/poc/polaris')) as { narrative: ReturnType<typeof renderPolarisPresentation>['narrative'] };
    const start = html.indexOf('data-polaris-class="catalog-entry"');
    return {
      html, group: html.slice(start, html.indexOf('</section>', start)),
      openings: envelope.narrative.openings.filter((opening) => opening.groupId === catalogGroupId),
    };
  }

  it('opens the populated catalog with only its existing declaration and source-status children', async () => {
    for (const host of catalogHosts) {
      const { group, openings } = await catalogResponses(shared.get('observed'), host);
      expect([...group.matchAll(/data-polaris-item="([^"]+)"/g)].map((match) => match[1]), host).toEqual(catalogChildIds.slice(1));
      expect(group, host).toMatch(/<\/h3>\s*<p[^>]*data-polaris-group-opening="polaris-class-catalog-entry"[^>]*>This catalog lists its entries and shows their source status\.<\/p>/);
      expect(openings, host).toEqual([{
        kind: 'group-opening', role: 'epistemic-claim', presentation: 'presentation-artifact', citable: false,
        groupId: catalogGroupId, groupClass: 'catalog', label: 'Observed', childIds: catalogChildIds,
      }]);
      expect(group, host).not.toContain('data-opening-child=');
    }
  });

  it('retains each Unknown populated catalog child and routes only to its exact existing remedy', async () => {
    const base = shared.get('observed');
    const shape = base.projectShape;
    if (shape.kind !== 'observed') throw new Error('synthetic project shape unavailable');
    const unknownIds = ['claim:item:catalog-entry:Bus', 'claim:item:catalog-entry:Atlas'];
    const makeAdverse = (route: string): PocModel => ({
      ...base,
      projectShape: {
        ...shape,
        items: shape.items.map((item) => unknownIds.includes(item.claim.claimId) ? {
          ...item, state: 'contradicted', unknownReason: catalogReason,
          claim: {
            ...item.claim,
            epistemic: { label: 'Unknown', reasons: { primary: catalogReason, secondary: [] }, tier: 'suspended', freshness: 'fresh' },
            resolutionRoutes: [{ reason: catalogReason, route, actor: 'owner', verb: 'adjudicate', target: 'act' }],
          },
        } : item),
      },
    });
    for (const host of catalogHosts) {
      const { html, group, openings } = await catalogResponses(makeAdverse('Owner adjudication'), host);
      expect(openings, host).toEqual([expect.objectContaining({ label: 'Unknown', childIds: catalogChildIds })]);
      expect(group, host).toMatch(/data-claim-role="epistemic-claim"[^>]*>This catalog lists its entries and shows their source status\.<\/p>\s*<p><span[^>]*>Unknown<\/span>/);
      const targets = [...group.matchAll(/<a href="#([^"]+)" data-opening-child="([^"]+)"[^>]*data-copy-role="action-label"/g)];
      expect(targets.map((match) => [match[1], match[2]]), host).toEqual(unknownIds.map((id) => [catalogGap, id]));
      expect(html, host).toMatch(/id="polaris-gap-contradicted-pending-adjudication"[^>]*>[\s\S]*?Route: Owner adjudication\./);
      for (const id of unknownIds) {
        expect(group, host).toContain(`data-unknown-disclosure="${id}"`);
      }

      const differentRemedy = await catalogResponses(makeAdverse('Owner adjudication for this item only'), host);
      expect(differentRemedy.openings, host).toEqual([]);
      expect(differentRemedy.group, host).not.toContain('data-polaris-group-opening=');
      expect(differentRemedy.group, host).toContain('Owner adjudication for this item only');
    }
  });

  it('keeps the populated catalog source-status remedy in its own section when source status is Unknown', async () => {
    const base = shared.get('observed');
    const shape = base.projectShape;
    if (shape.kind !== 'observed') throw new Error('synthetic project shape unavailable');
    const aggregate = shape.classes['catalog-entry'];
    const refused = shared.get('rejected').projectShape.claim;
    const input: PocModel = {
      ...base,
      projectShape: {
        ...shape,
        classes: {
          ...shape.classes,
          'catalog-entry': {
            ...aggregate,
            claim: { ...aggregate.claim, epistemic: refused.epistemic, resolutionRoutes: refused.resolutionRoutes },
          },
        },
      },
    };
    for (const host of catalogHosts) {
      const { group, openings } = await catalogResponses(input, host);
      expect(openings, host).toEqual([expect.objectContaining({ label: 'Unknown', childIds: catalogChildIds })]);
      expect(group, host).toContain('href="#polaris-class-status-catalog-entry" data-opening-child="claim:class:catalog-entry"');
      expect(group, host).toMatch(/id="polaris-class-status-catalog-entry"><div class="unknown-disclosure" data-unknown-disclosure="claim:class:catalog-entry"[^>]*>[\s\S]*?data-unknown-reason="unconsented-source-or-provider"/);
    }
  });

  it('binds every named diagram element to its source declaration anchor', () => {
    const path = 'about/heart-and-soul/architecture.md';
    const texts = { ...PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC,
      [path]: PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC[path] + '\n```flow\nReceive --> Decide --> Act\n```\n' };
    const model = buildFixtureModel(cleanups, { projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit(texts) } });
    const { html, narrative } = renderPolarisPresentation(model);
    const nodes = [...html.matchAll(/<span class="flow-node"([^>]*)>/g)];
    expect(nodes).toHaveLength(3);
    const block = narrative.blocks.find((entry) => entry.claims.includes('claim:project-account:architecture'));
    expect(block?.anchors).toHaveLength(1);
    for (const node of nodes) expect(attr(node[1]!, 'data-anchor-id')).toBe(block!.anchors[0]!.anchorId);
    expect(block!.anchors[0]!.locator).toContain(path);
    expect(html).toContain('data-visual-provenance="curated"');
  });

  it('gives every anchored block a typed, revision-bound anchor set that exactly covers its claims (no uncovered claim, no surplus anchor) and captures target state', () => {
    let blocks = 0;
    for (const variant of VARIANTS) {
      const model = shared.get(variant);
      const { html, narrative } = renderPolarisPresentation(model);
      const machine = JSON.parse(JSON.stringify(model)) as PocModel;
      // The human page carries no copy of the machine form (it is served at
      // the presentation route from this same render).
      expect(html).not.toContain('<script type="application/json"');
      expect(narrative.kind).toBe('polaris-narrative');
      expect(narrative.citable).toBe(false);
      expect(narrative.presentation).toBe('presentation-artifact');
      const blockIds = narrative.blocks.map((block) => block.blockId);
      expect(new Set(blockIds).size).toBe(blockIds.length);
      const units = narrativeUnits(html).filter((unit) => attr(unit.attrs, 'data-claim-role') === 'anchored-project-fact');
      expect(units.map((unit) => attr(unit.attrs, 'data-narrative-block')).sort()).toEqual([...blockIds].sort());
      const claims = claimsOf(machine.projectShape);
      for (const unit of units) {
        const blockId = attr(unit.attrs, 'data-narrative-block') as string;
        const block = narrative.blocks.find((candidate) => candidate.blockId === blockId);
        if (block === undefined) throw new Error(blockId);
        expect(block.kind).toBe('narrative-block');
        expect(block.role).toBe('anchored-project-fact');
        expect(block.citable).toBe(false);
        expect(block.presentation).toBe('presentation-artifact');
        // Distinct machine type: none of the kernel claim tuple's fields.
        for (const field of ['claimId', 'epistemic', 'resolutionRoutes', 'challenge', 'evaluationId']) expect(block).not.toHaveProperty(field);
        // Claims in the block are exactly the provenance spans it renders.
        const rendered = [...unit.inner.matchAll(/data-claim-provenance="([^"]+)"/g)].map((m) => m[1] as string);
        expect([...block.claims].sort()).toEqual([...new Set(rendered)].sort());
        // Anchor set: exact covering and minimality against the independent oracle.
        const expected = block.claims.flatMap((claimId) => expectedAnchors(machine, claimId, blockId)).map(sortKey).sort();
        const actual = block.anchors.map((anchor) => sortKey({ cls: anchor.targetClass, target: anchor.targetId, revision: anchor.revision })).sort();
        expect(actual, `${variant}: ${blockId}`).toEqual([...new Set(expected)].sort());
        expect(block.anchors.length).toBeGreaterThan(0);
        expect(block.anchors.length).toBeLessThanOrEqual(MAX_ANCHORS);
        // Human form: each anchor is rendered inside the block, naming its claims.
        for (const anchor of block.anchors) {
          expect(TARGET_CLASSES).toContain(anchor.targetClass);
          expect(anchor.supports.length).toBeGreaterThan(0);
          for (const supported of anchor.supports) expect(block.claims).toContain(supported);
          expect(anchor.revision).not.toBe('');
          // Durable identity: never a bare path, label or coordinate.
          expect(anchor.targetId).toMatch(/^(sha256:[0-9a-f]{64}|git-tree:[0-9a-f]{40}|beads-dolt:.+|[a-z-]+:(sha256:[0-9a-f]{64}|.+)|[^/\s]+@[0-9a-f]{40}:.+#.+)$/);
          expect(anchor.targetId).not.toMatch(/\.[a-z]+:\d+$/); // never path:line
          // The citation names the anchor by id alone; class, target, supported
          // claims and captured state are read from the machine record under
          // that id (asserted above and below), never restated on the cite.
          const cite = new RegExp(`<cite[^>]*data-anchor-id="${anchor.anchorId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`).exec(unit.inner)?.[0];
          expect(cite, `${variant}: anchor ${anchor.anchorId} not rendered in its block`).toBeDefined();
          expect((cite as string).match(/\sdata-anchor-[a-z]+=/g)).toEqual([' data-anchor-id=']);
          expect(anchor.anchorId.startsWith(`${blockId}#a`)).toBe(true);
          // Captured target state equals the machine claim's state at capture.
          const claim = claims.get(anchor.supports[0] as string);
          if (claim !== undefined) {
            expect(anchor.captured.label).toBe(claim.epistemic.label);
            expect(anchor.captured.tier).toBe(claim.epistemic.tier ?? 'unstated');
            expect(anchor.captured.reason).toBe('reasons' in claim.epistemic ? claim.epistemic.reasons.primary : 'none');
          } else {
            expect(anchor.captured.label).toBe('Observed');
          }
        }
        // Named diagram elements may reference the same canonical anchor.
        // References remain closed over the block's independently checked set.
        const citedIds = [...unit.inner.matchAll(/data-anchor-id="([^"]+)"/g)].map((match) => match[1]);
        expect([...new Set(citedIds)].sort(), `${variant}: ${blockId} anchor references`).toEqual(block.anchors.map((anchor) => anchor.anchorId).sort());
        blocks += 1;
      }
    }
    expect(blocks).toBeGreaterThan(60);
  });

  it('freezes captured target state: a later mutation of the model cannot rewrite an anchor', () => {
    const model = modelFor('observed');
    const before = renderPolarisPresentation(model).narrative;
    const beforeSnapshot = JSON.parse(JSON.stringify(before)) as typeof before;
    const shape = model.projectShape;
    if (shape.kind !== 'observed') throw new Error('fixture must observe');
    const source = shape.sources[0] as { claim: { epistemic: { tier?: string } } };
    // A declared tier other than the captured one: the renderer refuses an
    // undeclared tier value (syzygy-dov.3.2).
    (source.claim.epistemic as { tier?: string }).tier = 'reduced-fidelity';
    // The already-rendered artifact is unchanged; a fresh render reflects the
    // later-read state as a *new* capture, never by rewriting the old one.
    expect(JSON.parse(JSON.stringify(before))).toEqual(beforeSnapshot);
    const after = renderPolarisPresentation(model).narrative;
    const sourceBlock = (n: typeof before): string | undefined => n.blocks.find((block) => block.blockId === `block:${shape.sources[0]?.claim.claimId ?? ''}`)?.anchors[0]?.captured.tier;
    expect(sourceBlock(before)).toBe('report-fact');
    expect(sourceBlock(after)).toBe('reduced-fidelity');
  });

  it('clones and freezes anchors at registration so the caller cannot rewrite a captured state afterwards', () => {
    const registry = new NarrativeRegistry();
    const captured = { label: 'Observed', tier: 'report-fact', reason: 'none' };
    const supports = ['claim:x'];
    const block = registry.registerAnchored('block:x', ['claim:x'], [{ targetClass: 'evidence', targetId: 'sha256:' + 'a'.repeat(64), revision: 'r', locator: 'p', supports, captured }]);
    expect(Object.isFrozen(block)).toBe(true);
    expect(Object.isFrozen(block.anchors)).toBe(true);
    expect(Object.isFrozen(block.anchors[0])).toBe(true);
    expect(Object.isFrozen(block.anchors[0]?.captured)).toBe(true);
    expect(() => { (block.anchors[0] as { captured: { label: string } }).captured.label = 'Inferred'; }).toThrow();
    // The caller's own objects were copied, not adopted.
    expect(Object.isFrozen(captured)).toBe(false);
    captured.label = 'Inferred';
    supports.push('claim:y');
    expect(block.anchors[0]?.captured.label).toBe('Observed');
    expect(block.anchors[0]?.supports).toEqual(['claim:x']);
    expect(registry.narrative({}).blocks[0]?.anchors[0]?.captured.label).toBe('Observed');
    expect(() => registry.registerAnchored('block:x', [], [])).toThrow(/twice/);
  });

  it('keeps personal view state and the presentation artifact outside the truth model', () => {
    const model = modelFor('observed');
    const truthBefore = JSON.stringify(model);
    const plainRender = renderPolarisPresentation(model);
    const withViewRender = renderPolarisPresentation(model, '', { openCoverageCounts: ['claim:class:principle', 'claim:project-shape'] });
    const plain = plainRender.html;
    const withView = withViewRender.html;
    expect(JSON.stringify(model)).toBe(truthBefore);
    expect(withView).not.toBe(plain);
    expect(withView.replace(/<details class="coverage-counts" data-coverage-counts="[^"]+" open>/g, (m) => m.replace(' open', ''))).toBe(plain);
    expect(withView.match(/<details class="coverage-counts"[^>]* open>/g)?.length).toBe(2);
    expect(withViewRender.narrative).toEqual(plainRender.narrative);
    // Deleting Polaris presentation leaves truth unchanged: the model carries
    // no narrative, role, anchor or view field at all.
    expect(truthBefore).not.toMatch(/"(narrative|blocks|claimRole|anchorId|targetClass|viewState|openCoverageCounts|presentation|citable)"/);
  });
});

function countNested(inner: string): number {
  // Provenance spans inside a *nested* anchored block are that block's, not
  // the enclosing framing unit's.
  let total = 0;
  for (const nested of inner.matchAll(/<(p|li|td|tr|span)([^>]*data-claim-role="anchored-project-fact"[^>]*)>([\s\S]*?)<\/\1>/g)) {
    total += nested[3]?.match(/data-claim-provenance=/g)?.length ?? 0;
  }
  return total;
}
