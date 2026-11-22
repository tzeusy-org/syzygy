import { describe, expect, it } from 'vitest';
import type { LocalDerivedStructure, LocalRenderInput } from '@syzygy/polaris-generation-core/live';
import { computedMapsInput, figureKindsInput, readingInput } from './dossier-reading.testkit.js';
import { renderLocalDossier } from './dossier-site.js';

// syzygy-3efd.70: every figure's drawing is `role="img"`, named by `aria-labelledby` and described by `aria-describedby`. Each id those
// attributes name must exist on the same page, once, or the drawing has no accessible name. Read from the post-render HTML of every page
// of the operator-agent site; expected values are literals.

const REV = 'e'.repeat(40);
const derived: LocalDerivedStructure = {
  state: 'derived', revision: REV, recordRevision: REV, capturedAt: '2026-11-22T08:00:00.000Z', recordText: '{}\n', sha256: 'f'.repeat(64), currencyPolicy: null, unitsNotListed: 0,
  facts: [
    { id: '_tree-root', fact: 'tree-root', rule: 'top-level-unit', ruleVersion: 1, path: '.', count: 2, to: null, epistemic: 'observed', unknownReason: null },
    { id: '_tree-unit-1', fact: 'top-level-unit', rule: 'top-level-unit', ruleVersion: 1, path: 'src', count: 9, to: null, epistemic: 'observed', unknownReason: null },
    { id: '_tree-contains-1', fact: 'contains', rule: 'top-level-unit', ruleVersion: 1, path: 'src', count: null, to: '_tree-unit-1', epistemic: 'observed', unknownReason: null },
  ],
  tree: { files: 11, rootFiles: 2, unitsListed: 1, unitFiles: 9, unitsNotListed: 0, secretPathsLeftOut: 0, submodules: 0 }, countsMatch: true,
};

const SITES: readonly (readonly [string, () => ReturnType<typeof renderLocalDossier>['files']])[] = [
  ['graph figures', () => renderLocalDossier(readingInput()).files],
  ['graph figures on Pole pages', () => {
    const input = readingInput();
    const poles: NonNullable<LocalRenderInput['poles']> = { whySection: 'one', poles: [
      { label: 'Why', sections: ['one'] }, { label: 'Words', sections: ['two', 'three', 'four'] }, { label: 'The rest', sections: ['five', 'six', 'seven', 'nine', 'eight'] }] };
    return renderLocalDossier({ ...input, local: { ...input.local, poles } }).files;
  }],
  ['sequence and swimlane figures', () => renderLocalDossier(figureKindsInput()).files],
  ['the derived figure', () => { const input = readingInput(); return renderLocalDossier({ ...input, local: { ...input.local, derivedStructure: derived } }).files; }],
  ['the computed map figures', () => renderLocalDossier(computedMapsInput()).files],
];

/** Every `aria-labelledby` and `aria-describedby` reference on a page, one per id token, with the tag of the element carrying the id. */
function references(html: string): { readonly attribute: string; readonly id: string; readonly tags: readonly string[] }[] {
  const holders = new Map<string, string[]>();
  for (const match of html.matchAll(/<([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?\sid="([^"]*)"/gu)) holders.set(match[2]!, [...holders.get(match[2]!) ?? [], match[1]!]);
  return [...html.matchAll(/\s(aria-labelledby|aria-describedby)="([^"]*)"/gu)].flatMap(match =>
    match[2]!.split(/\s+/u).filter(Boolean).map(id => ({ attribute: match[1]!, id, tags: holders.get(id) ?? [] })));
}

describe('figure accessible names: every aria reference resolves (syzygy-3efd.70)', () => {
  it.each(SITES)('%s: each reference names exactly one element on its page, a caption or the figure\'s list', (_name, render) => {
    let checked = 0;
    for (const [path, html] of render()) {
      if (!path.endsWith('.html')) continue;
      for (const ref of references(html)) {
        checked += 1;
        const where = `${path} ${ref.attribute}="${ref.id}"`;
        expect(ref.tags, where).toHaveLength(1);
        // A map figure's text form is its list (`ol.map-list`); every other figure's is its `<details>`.
        if (ref.id.startsWith('diagram-')) expect(ref.tags, where).toEqual([ref.attribute === 'aria-labelledby' ? 'figcaption' : ref.id.startsWith('diagram-text-map-') ? 'ol' : 'details']);
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('counts the references it checks: two per drawn figure', () => {
    const count = (files: ReadonlyMap<string, string>): number => [...files].reduce((n, [path, html]) => n + (path.endsWith('.html') ? references(html).length : 0), 0);
    expect(SITES.map(([name, render]) => [name, count(render())])).toEqual([
      ['graph figures', 6], ['graph figures on Pole pages', 6], ['sequence and swimlane figures', 4], ['the derived figure', 8], ['the computed map figures', 14]]);
  });

  it('names the drawing by its caption and describes it by its list, inside the one figure', () => {
    const index = renderLocalDossier(figureKindsInput()).files.get('index.html')!;
    const figure = index.slice(index.indexOf('<figure data-hue="1"'), index.indexOf('</figure>', index.indexOf('<figure data-hue="1"')));
    expect(figure).toContain('<figcaption id="diagram-title-0">Handshake</figcaption>');
    expect(figure).toContain('role="img" aria-labelledby="diagram-title-0" aria-describedby="diagram-text-0"');
    expect(figure).toContain('<details id="diagram-text-0"><summary>Read every component and relationship</summary>');
  });
});
