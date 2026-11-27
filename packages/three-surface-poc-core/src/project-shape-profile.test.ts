import { describe, expect, it } from 'vitest';

import { BUILT_IN_PROJECT_SHAPE_PROFILE as profile } from './project-shape-profile.js';

describe('built-in project shape profile', () => {
  it('records the current manifest vocabulary and which tree rules survive a missing root', () => {
    expect(profile.profileVersion).toBe('project-shape-profile-v1');
    expect(profile.rootIndex).toBe('about/README.md');
    expect(profile.indexDepth).toBe(3);
    expect(profile.pillars.map(({ key, label }) => [key, label])).toEqual([
      ['heart-and-soul', 'Heart and Soul'],
      ['legends-and-lore', 'Legends and Lore'],
      ['spec-and-spine', 'Spec and Spine'],
      ['lay-and-land', 'Lay and Land'],
      ['craft-and-care', 'Craft and Care'],
    ]);
    expect(profile.sourceRules).toEqual({
      'root-index': true,
      'pillar-index': true,
      'pillar-named-file': true,
      'baseline-spec-tree': false,
      'roster-tree': false,
    });
    expect(profile.treePopulations).toEqual([
      { rule: 'baseline-spec-tree', pathPattern: 'openspec/specs/<key>/spec.md' },
      { rule: 'roster-tree', pathPattern: 'roster/<key>/butler.toml', companion: 'MANIFESTO.md' },
    ]);
  });

  it('records the literal classes, source bindings, containers and key forms in PWB-REQ-002', () => {
    expect(profile.extractionClasses).toEqual([
      'project-account-section', 'principle', 'success-criterion', 'catalog-entry',
      'design-contract', 'baseline-spec', 'topology-component', 'craft-policy', 'roster-identity',
    ]);
    expect(profile.projectAccountKeys).toEqual(['purpose', 'promises', 'refusals', 'architecture', 'v1-scope', 'v1-success']);
    expect(profile.catalogKeys).toEqual([
      'Core Infrastructure', 'Staffers', 'Butlers', 'Modules', 'Connectors', 'Dashboard',
      'Identity System', 'Situational Awareness', 'Observability',
    ]);
    const rows = profile.grammarRows.map(({ class: cls, source, container, itemKey }) => [
      cls,
      'relativePath' in source ? [source.rule, source.pillar, source.relativePath]
        : 'pillar' in source ? [source.rule, source.pillar] : [source.rule],
      'headings' in container ? [container.kind, ...container.headings.map(({ text, level }) => [text, level])]
        : 'table' in container ? [container.kind, container.table, container.field] : [container.kind],
      'key' in itemKey ? [itemKey.kind, itemKey.key]
        : 'prefix' in itemKey ? [itemKey.kind, itemKey.prefix]
        : 'column' in itemKey ? [itemKey.kind, itemKey.column] : [itemKey.kind],
    ]);
    expect(rows).toEqual([
      ['project-account-section', ['pillar-named-file', 'heart-and-soul', 'vision.md'], ['heading-section', ['What Butlers Is', 2]], ['fixed', 'purpose']],
      ['project-account-section', ['pillar-named-file', 'heart-and-soul', 'vision.md'], ['heading-section', ['What Success Looks Like', 2]], ['fixed', 'promises']],
      ['project-account-section', ['pillar-named-file', 'heart-and-soul', 'vision.md'], ['heading-section', ['What Butlers Is Not', 2]], ['fixed', 'refusals']],
      ['project-account-section', ['pillar-named-file', 'heart-and-soul', 'architecture.md'], ['every-level-2-section'], ['fixed', 'architecture']],
      ['project-account-section', ['pillar-named-file', 'heart-and-soul', 'v1.md'], ['heading-section', ['What v1 Ships', 2], ['What v1 Defers', 2]], ['fixed', 'v1-scope']],
      ['project-account-section', ['pillar-named-file', 'heart-and-soul', 'v1.md'], ['heading-section', ['Success Criteria', 2]], ['fixed', 'v1-success']],
      ['principle', ['pillar-named-file', 'heart-and-soul', 'vision.md'], ['top-level-decimal-list', ['Non-Negotiable Rules', 2]], ['leading-bold']],
      ['success-criterion', ['pillar-named-file', 'heart-and-soul', 'vision.md'], ['top-level-list', ['What Success Looks Like', 2]], ['prefixed-ordinal', 'vision']],
      ['success-criterion', ['pillar-named-file', 'heart-and-soul', 'v1.md'], ['top-level-list', ['Success Criteria', 2]], ['prefixed-ordinal', 'v1']],
      ['catalog-entry', ['pillar-named-file', 'heart-and-soul', 'v1.md'],
        ['top-level-bulleted-list', ['Core Infrastructure', 3], ['Staffers', 3], ['Butlers', 3], ['Modules', 3],
          ['Connectors', 3], ['Dashboard', 3], ['Identity System', 3], ['Situational Awareness', 3], ['Observability', 3]],
        ['leading-bold-or-code']],
      ['design-contract', ['pillar-index', 'legends-and-lore'], ['first-table-rows', ['Index', undefined]], ['first-cell-link-text']],
      ['baseline-spec', ['baseline-spec-tree'], ['tree-path'], ['tree-key']],
      ['topology-component', ['pillar-named-file', 'lay-and-land', 'components.md'], ['ordinal-section-table-rows'], ['ordinal-and-label']],
      ['craft-policy', ['pillar-index', 'craft-and-care'], ['first-table-rows', ['Reading Order', undefined]], ['link-target-basename', 'File']],
      ['roster-identity', ['roster-tree'], ['toml-table-field', 'butler', 'name'], ['tree-key']],
    ]);
  });

  it('contains the current root summary and precedence vocabulary and freezes the nested profile', () => {
    expect(profile.rootSummary).toEqual({
      heading: { text: 'Key Architectural Facts', level: 2 },
      statedCountFacts: ['catalog-count:Staffers', 'catalog-count:Butlers'],
    });
    expect(profile.precedence.heading).toEqual({ text: 'Precedence Order When Layers Disagree', level: 3 });
    expect(profile.precedence.columns).toEqual(['#', 'Layer', 'Owns', 'Home']);
    expect(profile.precedence.rows.map(({ ordinal, layer, home }) => [ordinal, layer, home])).toEqual([
      [1, 'Heart and Soul', 'about/heart-and-soul/'],
      [2, 'Legends and Lore', 'about/legends-and-lore/rfcs/'],
      [3, 'Spec and Spine', 'openspec/specs/'],
      [4, 'Craft and Care', 'about/craft-and-care/'],
      [5, 'Lay and Land', 'about/lay-and-land/'],
      [6, 'Roster config', 'roster/{butler}/'],
      [7, 'Code', 'src/, alembic/, tests/'],
    ]);
    const tree: unknown[] = [profile];
    while (tree.length > 0) {
      const value = tree.pop();
      if (value !== null && typeof value === 'object') {
        expect(Object.isFrozen(value)).toBe(true);
        for (const child of Object.values(value)) tree.push(child);
      }
    }
  });
});
