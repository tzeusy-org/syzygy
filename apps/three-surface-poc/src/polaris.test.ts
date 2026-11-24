import { rmSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';

import { renderPolarisPage } from './polaris.js';
import { DEEP_DIVE_MARKERS } from './test-deep-dive-markers.testkit.js';
import { buildFixtureModel } from './test-model-fixture.js';
import { ADMITTING_AUTHORITY, projectShapeFixtureGit } from './test-project-shape-fixture.js';

const cleanups: string[] = [];
afterEach(() => {
  for (const directory of cleanups.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('Polaris', () => {
  it('references every entity in at least one titled section (POC-REQ-030)', () => {
    const model = buildFixtureModel(cleanups);
    const html = renderPolarisPage(model);

    const sectionIds = new Set(
      [...html.matchAll(/data-polaris-section="([^"]+)"/g)].map((match) => match[1]),
    );
    const denominator = model.entities.length;
    let covered = 0;
    for (const entity of model.entities) {
      if (sectionIds.has(entity.id)) {
        covered += 1;
      }
    }
    expect(covered).toBe(denominator);
  });

  it('resolves every claim marker against the shared model, reporting the sweep denominator (POC-REQ-031)', () => {
    const model = buildFixtureModel(cleanups);
    const html = renderPolarisPage(model);

    const entityIds = new Set(model.entities.map((entity) => entity.id));
    const relationshipIds = new Set(model.relationships.map((relationship) => relationship.id));
    const syntheticRegionIds = new Set(['region:code-structure', 'region:work-items', model.proposedWork.id, `${model.proposedWork.id}/lifecycle`, ...DEEP_DIVE_MARKERS(model.capabilityId)]);

    const markers = [...html.matchAll(/data-claim-provenance="([^"]+)"/g)].map((match) => match[1]);
    expect(markers.length).toBeGreaterThan(0);
    let resolved = 0;
    for (const markerId of markers) {
      if (
        entityIds.has(markerId as string) ||
        relationshipIds.has(markerId as string) ||
        syntheticRegionIds.has(markerId as string)
      ) {
        resolved += 1;
      }
    }
    expect(resolved).toBe(markers.length);
  });

  it('discloses Unknown in place rather than asserting positively (POC-REQ-032)', () => {
    const model = buildFixtureModel(cleanups);
    const html = renderPolarisPage(model);

    const unknownEntities = model.entities.filter(
      (entity): entity is typeof entity & { epistemic: { label: 'Unknown'; reason: string } } =>
        entity.epistemic.label === 'Unknown',
    );
    expect(unknownEntities.length).toBeGreaterThan(0);
    for (const entity of unknownEntities) {
      const sectionMatch = new RegExp(
        `data-polaris-section="${entity.id}"[^>]*>([\\s\\S]*?)</section>`,
      ).exec(html);
      expect(sectionMatch).not.toBeNull();
      const section = sectionMatch?.[1] ?? '';
      expect(section).toContain(`data-unknown-disclosure="${entity.id}"`);
      expect(section).toContain(entity.epistemic.reason);
      expect(section).not.toContain(`data-claim-provenance="${entity.id}"`);
    }
  });

  it('opens with the project-level groups in the required order, before any capability claim (PWB-REQ-010)', () => {
    const model = buildFixtureModel(cleanups);
    const html = renderPolarisPage(model);

    // Hand-typed oracle from task 3.1: never imported from the renderer.
    const required = ['overview', 'boundaries', 'v1', 'architecture', 'catalog', 'capability-detail', 'evidence-and-gaps'];
    const rendered = [...html.matchAll(/data-polaris-group="([^"]+)"/g)].map((match) => match[1]);
    expect(rendered).toEqual(required);

    // Every capability entity claim is rendered after the catalog group and
    // before the evidence group; the tally of such claims equals the model's.
    const catalogIndex = html.indexOf('data-polaris-group="catalog"');
    const detailIndex = html.indexOf('data-polaris-group="capability-detail"');
    const evidenceIndex = html.indexOf('data-polaris-group="evidence-and-gaps"');
    let placed = 0;
    for (const entity of model.entities) {
      const index = html.indexOf(`data-polaris-section="${entity.id}"`);
      if (index > detailIndex && index < evidenceIndex && detailIndex > catalogIndex) placed += 1;
    }
    expect(placed).toBe(model.entities.length);

    // The slice is labeled as one capability within the catalog, and the
    // old capability-first framing is gone.
    expect(html).toContain('data-polaris-capability-scope');
    expect(html).toContain('one capability within the project catalog');
    expect(html).toContain('completeness follows its disclosed denominator');
    expect(html).not.toContain('data-polaris-movement');
    expect(html).not.toContain('data-polaris-framing');
  });

  it('moves the capability slice below the catalog with provenance and epistemic state unchanged (PWB-REQ-010, task 3.2)', () => {
    // Both fixtures: the slice must read identically whether or not the
    // project shape was observed — the move changes position, never claims.
    const unevaluated = buildFixtureModel(cleanups);
    const observed = buildFixtureModel(cleanups, {
      projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit() },
    });
    expect(unevaluated.projectShape.kind).toBe('not-evaluated');
    expect(observed.projectShape.kind).toBe('observed');

    for (const model of [unevaluated, observed]) {
      const html = renderPolarisPage(model);
      const catalogIndex = html.indexOf('data-polaris-group="catalog"');
      const detailIndex = html.indexOf('data-polaris-group="capability-detail"');
      const evidenceIndex = html.indexOf('data-polaris-group="evidence-and-gaps"');
      expect(catalogIndex).toBeGreaterThan(-1);
      expect(detailIndex).toBeGreaterThan(catalogIndex);

      // Per entity: the section sits inside Capability detail and carries
      // exactly the model's provenance (source and revision, in order) and
      // exactly the model's epistemic label and reason — nothing added,
      // nothing dropped, nothing re-labeled.
      let checked = 0;
      for (const entity of model.entities) {
        const match = new RegExp(
          `<section class="claim-section" data-polaris-section="${entity.id}"[^>]*>([\\s\\S]*?)</section>`,
        ).exec(html);
        expect(match).not.toBeNull();
        const start = match?.index ?? -1;
        expect(start).toBeGreaterThan(detailIndex);
        expect(start).toBeLessThan(evidenceIndex);
        const section = match?.[1] ?? '';
        const sources = [...section.matchAll(/data-parity-field="provenance-source"[^>]*>([^<]+)</g)].map((m) => m[1]);
        const revisions = [...section.matchAll(/data-parity-field="provenance-revision">([^<]+)</g)].map((m) => m[1]);
        if (entity.epistemic.label === 'Observed') {
          expect(section).toContain(`data-claim-provenance="${entity.id}"`);
          expect(section).not.toContain('data-unknown-disclosure=');
          expect(sources).toEqual(entity.provenance.map((item) => item.source));
          expect(revisions).toEqual(entity.provenance.map((item) => item.revision.slice(0, 12)));
        } else {
          expect(section).toContain(`data-unknown-disclosure="${entity.id}"`);
          expect(section).toContain(`Unknown — <span data-unknown-reason="${entity.epistemic.closedReason}">`);
          expect(section).toContain(`<small>${entity.epistemic.reason}</small>`);
          expect(section).not.toContain(`data-claim-provenance="${entity.id}"`);
          expect(sources).toEqual([]);
        }
        checked += 1;
      }
      expect(checked).toBe(model.entities.length);

      // Relationships: same rule, one bullet per relationship, same label.
      let bullets = 0;
      for (const relationship of model.relationships) {
        const marker = relationship.epistemic.label === 'Observed'
          ? `data-claim-provenance="${relationship.id}"`
          : `data-unknown-disclosure="${relationship.id}"`;
        const other = relationship.epistemic.label === 'Observed'
          ? `data-unknown-disclosure="${relationship.id}"`
          : `data-claim-provenance="${relationship.id}"`;
        expect(html).toContain(marker);
        expect(html).not.toContain(other);
        bullets += 1;
      }
      expect(bullets).toBe(model.relationships.length);
    }

    // The capability claims are byte-identical across the two shapes: the
    // project groups above them change, the entity sections, the proposal
    // part and the relationships do not. Only the current-authority part of
    // the proposed-work section (PWB-REQ-013) may follow the shape, because
    // that is where the shape's baseline spec is looked up — and, since 3.7,
    // the doctrine/non-goal parts, whose Unknown reason follows the shape.
    const between = (html: string, from: string, to: string): string => {
      const start = html.indexOf(from);
      const end = html.indexOf(to, start);
      expect(start).toBeGreaterThan(-1);
      expect(end).toBeGreaterThan(start);
      return html.slice(start, end);
    };
    const observedHtml = renderPolarisPage(observed);
    const unevaluatedHtml = renderPolarisPage(unevaluated);
    for (const [from, to] of [
      ['<section class="band"', 'data-proposed-work-part="current-authority"'],
      ['data-proposed-work-part="proposal"', 'data-contract-part="doctrine"'],
      ['data-band="reality"', 'data-polaris-group="evidence-and-gaps"'],
    ] as const) {
      expect(between(observedHtml, from, to)).toBe(between(unevaluatedHtml, from, to));
    }
    expect(between(observedHtml, 'data-proposed-work-part="current-authority"', 'data-proposed-work-part="proposal"'))
      .not.toBe(between(unevaluatedHtml, 'data-proposed-work-part="current-authority"', 'data-proposed-work-part="proposal"'));
  });

  it('mutation check: removing an entity from coverage would fail the sweep', () => {
    const model = buildFixtureModel(cleanups);
    const html = renderPolarisPage(model);
    const withoutOneSection = html.replace(
      new RegExp(`<section class="claim-section" data-polaris-section="${model.entities[0]?.id}"[\\s\\S]*?</section>`),
      '',
    );
    const sectionIds = new Set(
      [...withoutOneSection.matchAll(/data-polaris-section="([^"]+)"/g)].map((match) => match[1]),
    );
    expect(sectionIds.has(model.entities[0]?.id as string)).toBe(false);
  });
});
