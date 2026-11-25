import { describe, expect, it } from 'vitest';
import type { TreeFacts } from './derive.js';
import { majorUnits, questionKindAdvice } from './question-kinds.js';

// REQ-polaris-generation-034 version 2.32 (syzygy-5dhm.135): the per-kind floor. Expected values are literals written from the
// specification, never computed by the module under test.

const V13 = 'polaris-dossier-local-draft-v13';
const ALL = ['purpose', 'structure', 'mechanism', 'rationale', 'change', 'limits'];

/** Facts of rule `top-level-unit` for a tree of 100 listed files: `src` 60, `tests` 30, `docs` 5, `misc` 4, one root file. */
const FACTS: TreeFacts = {
  files: 102, secretPathsLeftOut: 2, submodules: 0, unitsNotListed: 0,
  facts: [
    { id: '_tree-root', fact: 'tree-root', rule: 'top-level-unit', ruleVersion: 1, path: '.', rootFiles: 1 },
    { id: '_tree-unit-1', fact: 'top-level-unit', rule: 'top-level-unit', ruleVersion: 1, path: 'docs', files: 5 },
    { id: '_tree-unit-2', fact: 'top-level-unit', rule: 'top-level-unit', ruleVersion: 1, path: 'misc', files: 4 },
    { id: '_tree-unit-3', fact: 'top-level-unit', rule: 'top-level-unit', ruleVersion: 1, path: 'src', files: 60 },
    { id: '_tree-unit-4', fact: 'top-level-unit', rule: 'top-level-unit', ruleVersion: 1, path: 'tests', files: 30 },
  ],
};

const block = (id: string, paths: readonly string[], label = 'inferred') => ({
  id, label, basis: 'source', text: `Block ${id}.`, quotations: [],
  citations: paths.map((p, i) => ({ id: `c-${id}-${i}`, path: p, startLine: 1, endLine: 2 })),
});

const draftOf = (paragraphs: readonly object[], questionKinds?: readonly unknown[], schemaVersion = V13) => ({
  schemaVersion,
  introduction: block('intro', ['README.md']),
  sections: [{ id: 'one', title: 'One', paragraphs }],
  ...(questionKinds === undefined ? {} : { questionKinds }),
});

const unitOf = (advice: ReturnType<typeof questionKindAdvice>, unit: string) => {
  if (advice.state !== 'compared') throw new Error(`advice is ${advice.state}`);
  return advice.units.find((entry) => entry.unit === unit);
};

describe('question kinds: major units (rule major-unit version 1)', () => {
  it('is the whole repository, then each directory holding at least 1 in 20 of the listed files, largest first', () => {
    expect(majorUnits(FACTS)).toEqual([{ unit: '.', files: 100 }, { unit: 'src', files: 60 }, { unit: 'tests', files: 30 }, { unit: 'docs', files: 5 }]);
  });

  it('keeps at most eight directories, ties by code unit', () => {
    const many: TreeFacts = { ...FACTS, files: 90, secretPathsLeftOut: 0, facts: [FACTS.facts[0]!,
      ...['j', 'i', 'h', 'g', 'f', 'e', 'd', 'c', 'b'].map((name, i) => ({ id: `_tree-unit-${i + 1}`, fact: 'top-level-unit' as const, rule: 'top-level-unit', ruleVersion: 1, path: name, files: 10 }))] };
    expect(majorUnits(many).map((entry) => entry.unit)).toEqual(['.', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']);
  });
});

describe('question kinds: the advice per major unit', () => {
  it('advises a unit with no `change` block, and nothing for a unit whose blocks answer all six', () => {
    const draft = draftOf(
      [block('a', ['src/server.c']), block('b', ['src/net.c', 'tests/net.py']), block('c', ['tests/run.py'])],
      [
        { blockId: 'intro', kinds: ['purpose'] },
        { blockId: 'a', kinds: ['structure', 'mechanism', 'rationale'] },
        { blockId: 'b', kinds: ['change', 'limits', 'purpose'] },
        { blockId: 'c', kinds: ['purpose', 'structure', 'mechanism', 'rationale', 'limits'] },
      ]);
    const advice = questionKindAdvice(draft, FACTS);
    expect(advice).toMatchObject({ state: 'compared', rule: { id: 'question-kind-floor', version: 1 }, kinds: ALL, label: 'Inferred',
      majorUnits: { rule: { id: 'major-unit', version: 1 }, share: '1/20', limit: 8, unitsNotListed: 0 },
      declarations: { rows: 4, counted: 4, unmatched: [], duplicated: [] } });
    expect(unitOf(advice, 'src')).toEqual({ unit: 'src', files: 60, answered: { purpose: 1, structure: 1, mechanism: 1, rationale: 1, change: 1, limits: 1 }, missing: [] });
    expect(unitOf(advice, 'tests')).toEqual({ unit: 'tests', files: 30, answered: { purpose: 2, structure: 1, mechanism: 1, rationale: 1, change: 1, limits: 2 }, missing: [] });
    expect(unitOf(advice, '.')).toMatchObject({ files: 100, missing: [] });
    expect(unitOf(advice, 'docs')).toEqual({ unit: 'docs', files: 5, answered: { purpose: 0, structure: 0, mechanism: 0, rationale: 0, change: 0, limits: 0 }, missing: ALL });

    const noChange = questionKindAdvice(draftOf([block('a', ['src/server.c'])], [{ blockId: 'a', kinds: ['purpose', 'structure', 'mechanism', 'rationale', 'limits'] }]), FACTS);
    expect(unitOf(noChange, 'src')?.missing).toEqual(['change']);
    expect(unitOf(noChange, '.')?.missing).toEqual(['change']);
  });

  it('counts a block for the whole repository only where it cites no file inside a major directory', () => {
    const advice = questionKindAdvice(draftOf([block('a', ['misc/x.c', 'README.md']), block('j', [])], [{ blockId: 'a', kinds: ['change'] }, { blockId: 'j', kinds: ['rationale'] }]), FACTS);
    expect(unitOf(advice, '.')?.missing).toEqual(['purpose', 'structure', 'mechanism', 'limits']);
    expect(unitOf(advice, 'src')?.missing).toEqual(ALL);
    expect(unitOf(advice, 'misc')).toBeUndefined();
  });

  it('counts only claim blocks labelled Inferred, joins a repeated row, and lists rows naming no such block', () => {
    const advice = questionKindAdvice(draftOf([block('a', ['src/a.c']), block('u', ['src/b.c'], 'unknown')], [
      { blockId: 'a', kinds: ['change'] }, { blockId: 'u', kinds: ['limits'] }, { blockId: 'ghost', kinds: ['purpose'] }, { blockId: 'a', kinds: ['limits'] },
      { blockId: 'x', kinds: ['not-a-kind'] }, { kinds: ['purpose'] }, 'row',
    ]), FACTS);
    expect(advice).toMatchObject({ declarations: { rows: 4, counted: 1, unmatched: ['u', 'ghost'], duplicated: ['a'] } });
    expect(unitOf(advice, 'src')?.answered).toEqual({ purpose: 0, structure: 0, mechanism: 0, rationale: 0, change: 1, limits: 1 });
  });

  it('is Unknown, never six missing kinds, where nothing is declared, the schema has no member or the tree was not listed', () => {
    const none = questionKindAdvice(draftOf([block('a', ['src/a.c'])]), FACTS);
    expect(none).toMatchObject({ state: 'unknown', why: 'the draft declares no question kind in `questionKinds`, so which kinds its blocks answer is not known' });
    expect(none).not.toHaveProperty('units');
    const empty = questionKindAdvice(draftOf([block('a', ['src/a.c'])], [{ blockId: 'a', kinds: [] }]), FACTS);
    expect(empty.state).toBe('unknown');
    const v10 = questionKindAdvice(draftOf([block('a', ['src/a.c'])], [{ blockId: 'a', kinds: ['change'] }], 'polaris-dossier-local-draft-v10'), FACTS);
    expect(v10).toMatchObject({ state: 'unknown', why: 'this draft\'s schema has no `questionKinds`; it is a member of draft schema polaris-dossier-local-draft-v13' });
    const unlisted = questionKindAdvice(draftOf([block('a', ['src/a.c'])], [{ blockId: 'a', kinds: ['change'] }]), undefined);
    expect(unlisted).toMatchObject({ state: 'unknown', why: 'the pinned tree could not be listed, so its major units are not known' });
  });
});
