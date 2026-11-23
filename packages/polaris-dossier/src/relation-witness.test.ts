import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ELIGIBILITY_TABLE, decideWitness, staleEligibilityRecords, unitFault, unitOf, witnessAtRender, witnessWords, type EligibilityRow, type Unit, type WitnessEdge, type WitnessInputs } from './relation-witness.js';

// Rule `relation-witness` version 1 (REQ-polaris-generation-034 version 2.19, syzygy-3efd.28). Every expected state, reason, fact identity
// and word below is a literal written from the requirement's text and the hand-built facts here before the rule ran, never taken from the
// module under test.

const ROOT: Unit = { kind: 'repository-root' };
const tld = (path: string): Unit => ({ kind: 'top-level-directory', path });
const pkg = (path: string): Unit => ({ kind: 'package-manifest', path });
const dep = (name: string): Unit => ({ kind: 'dependency-name', name });
const job = (path: string, key: string): Unit => ({ kind: 'workflow-job', path, job: key });
const svc = (path: string, key: string): Unit => ({ kind: 'compose-service', path, service: key });
const end = (unit: Unit, invalid = false) => ({ unit, invalid });
const edge = (relation: WitnessEdge['relation'], from: Unit | undefined, to: Unit | undefined, over: Partial<WitnessEdge> = {}): WitnessEdge =>
  ({ asserted: true, relation, from: from === undefined ? undefined : end(from), to: to === undefined ? undefined : end(to), ...over });

// The facts rule top-level-unit version 1 derives over README.md, src/a.ts and web/package.json, written by hand.
const R = { rule: 'top-level-unit', ruleVersion: 1 };
const TREE_FACTS = [
  { id: '_tree-root', fact: 'tree-root', ...R, path: '.' },
  { id: '_tree-unit-1', fact: 'top-level-unit', ...R, path: 'src' },
  { id: '_tree-unit-2', fact: 'top-level-unit', ...R, path: 'web' },
  { id: '_tree-contains-1', fact: 'contains', ...R, path: 'src', to: '_tree-unit-1' },
  { id: '_tree-contains-2', fact: 'contains', ...R, path: 'web', to: '_tree-unit-2' },
];
const complete = { state: 'derived' as const, facts: TREE_FACTS, secretPathsLeftOut: 0, submodules: 0, unitsNotListed: 0 };
const NPM = { rule: 'npm-package-manifest', ruleVersion: 1 };
const MANIFEST: WitnessInputs['manifest'] = {
  state: 'derived', factsNotListed: 0,
  facts: [
    { id: '_manifest-1', fact: 'package', ...NPM, path: 'web/package.json', name: 'web' },
    { id: '_manifest-2', fact: 'dependency', ...NPM, path: 'web/package.json', name: 'left-pad', section: 'dependencies', group: null },
    { id: '_manifest-3', fact: 'job-needs', rule: 'github-actions-workflow', ruleVersion: 1, path: '.github/workflows/ci.yml', from: 'test', to: 'build' },
    { id: '_manifest-4', fact: 'service-depends-on', rule: 'compose-file', ruleVersion: 1, path: 'compose.yaml', from: 'web', to: 'db' },
  ],
  recognizers: [
    { rule: 'npm-package-manifest', ruleVersion: 1, files: [{ path: 'web/package.json', epistemic: 'inferred', valuesLeftOut: 0 }, { path: 'lib/package.json', epistemic: 'inferred', valuesLeftOut: 1 }, { path: 'api/package.json', epistemic: 'unknown', valuesLeftOut: null }] },
    { rule: 'github-actions-workflow', ruleVersion: 1, files: [{ path: '.github/workflows/ci.yml', epistemic: 'inferred', valuesLeftOut: 0 }] },
    { rule: 'compose-file', ruleVersion: 1, files: [{ path: 'compose.yaml', epistemic: 'inferred', valuesLeftOut: 0 }] },
  ],
};
const inputs = (over: Partial<WitnessInputs> = {}): WitnessInputs => ({ structure: complete, manifest: MANIFEST, hidden: () => false, ...over });
/** A table holding every recognizer the rows name, so the rule's search and coverage for a recognizer's relation can be exercised: no
 * version of the requirement adopts it, and the rule never runs with it outside these tests. */
const EVERY: readonly EligibilityRow[] = ['top-level-unit', 'npm-package-manifest', 'cargo-manifest', 'python-project-manifest', 'go-module-manifest', 'github-actions-workflow', 'compose-file']
  .map((rule) => ({ rule, version: 1, record: null }));

describe('rule relation-witness version 1: the order it decides in', () => {
  it('witnesses a contains arrow from the root to a directory the tree holds, naming the first joining fact', () => {
    expect(decideWitness(edge('contains', ROOT, tld('src')), inputs())).toEqual({ state: 'witnessed', reason: null, fact: '_tree-contains-1', factKind: 'contains', rule: 'top-level-unit', ruleVersion: 1 });
    expect(decideWitness(edge('contains', ROOT, tld('web')), inputs())).toEqual({ state: 'witnessed', reason: null, fact: '_tree-contains-2', factKind: 'contains', rule: 'top-level-unit', ruleVersion: 1 });
  });

  it('matches the target by exact code units: no case folding, no normalisation', () => {
    expect(decideWitness(edge('contains', ROOT, tld('Src')), inputs())).toEqual({ state: 'challenged', reason: null, factKind: 'contains', rule: 'top-level-unit', ruleVersion: 1 });
    expect(decideWitness(edge('contains', ROOT, tld('src ')), inputs()).state).toBe('challenged');
  });

  it('challenges a contains arrow to a directory the tree lacks only under complete coverage', () => {
    expect(decideWitness(edge('contains', ROOT, tld('docs')), inputs())).toEqual({ state: 'challenged', reason: null, factKind: 'contains', rule: 'top-level-unit', ruleVersion: 1 });
    for (const partial of [{ secretPathsLeftOut: 1 }, { submodules: 1 }, { unitsNotListed: 1 }]) {
      expect(decideWitness(edge('contains', ROOT, tld('docs')), inputs({ structure: { ...complete, ...partial } })), JSON.stringify(partial)).toEqual({ state: 'unknown', reason: 'coverage-partial' });
      // A found fact witnesses whatever the coverage.
      expect(decideWitness(edge('contains', ROOT, tld('src')), inputs({ structure: { ...complete, ...partial } })).state).toBe('witnessed');
    }
  });

  it('decides an edge the draft does not assert unknown first, before any other case', () => {
    expect(decideWitness(edge('contains', ROOT, tld('src'), { asserted: false }), inputs())).toEqual({ state: 'unknown', reason: 'edge-not-inferred' });
    expect(decideWitness(edge('calls', undefined, undefined, { asserted: false }), inputs({ structure: { state: 'unknown' } }))).toEqual({ state: 'unknown', reason: 'edge-not-inferred' });
  });

  it('gives no-witness-rule for each of the seven relation types no fact witnesses, whatever its ends', () => {
    for (const relation of ['calls', 'imports', 'reads', 'writes', 'sends-to', 'starts', 'relates-to'] as const) {
      expect(decideWitness(edge(relation, ROOT, tld('src')), inputs()), relation).toEqual({ state: 'unknown', reason: 'no-witness-rule' });
      expect(decideWitness(edge(relation, undefined, undefined), inputs()), relation).toEqual({ state: 'unknown', reason: 'no-witness-rule' });
    }
  });

  it('gives endpoint-without-unit where either end carries no unit, before an invalid or mismatched end', () => {
    expect(decideWitness(edge('contains', ROOT, undefined), inputs())).toEqual({ state: 'unknown', reason: 'endpoint-without-unit' });
    expect(decideWitness(edge('contains', undefined, tld('src')), inputs())).toEqual({ state: 'unknown', reason: 'endpoint-without-unit' });
    expect(decideWitness({ asserted: true, relation: 'contains', from: undefined, to: end(tld('src/lib'), true) }, inputs())).toEqual({ state: 'unknown', reason: 'endpoint-without-unit' });
  });

  it('gives endpoint-unit-invalid where either end drew a unit-reference finding, before a kind mismatch', () => {
    expect(decideWitness({ asserted: true, relation: 'contains', from: end(ROOT), to: end(tld('src/lib'), true) }, inputs())).toEqual({ state: 'unknown', reason: 'endpoint-unit-invalid' });
    expect(decideWitness({ asserted: true, relation: 'contains', from: end(pkg('README.md'), true), to: end(tld('docs')) }, inputs())).toEqual({ state: 'unknown', reason: 'endpoint-unit-invalid' });
  });

  it('gives endpoint-kind-mismatch where an end is of another kind than the row takes there', () => {
    expect(decideWitness(edge('contains', ROOT, pkg('web/package.json')), inputs())).toEqual({ state: 'unknown', reason: 'endpoint-kind-mismatch' });
    expect(decideWitness(edge('contains', tld('src'), tld('web')), inputs())).toEqual({ state: 'unknown', reason: 'endpoint-kind-mismatch' });
    expect(decideWitness(edge('declares-dependency', dep('left-pad'), pkg('web/package.json')), inputs())).toEqual({ state: 'unknown', reason: 'endpoint-kind-mismatch' });
    expect(decideWitness(edge('needs-job', job('.github/workflows/ci.yml', 'test'), svc('compose.yaml', 'db')), inputs())).toEqual({ state: 'unknown', reason: 'endpoint-kind-mismatch' });
  });

  it('gives recognizer-not-eligible for every recognizer relation at version 1, though a fact joins the units', () => {
    expect(decideWitness(edge('declares-dependency', pkg('web/package.json'), dep('left-pad')), inputs())).toEqual({ state: 'unknown', reason: 'recognizer-not-eligible' });
    expect(decideWitness(edge('needs-job', job('.github/workflows/ci.yml', 'test'), job('.github/workflows/ci.yml', 'build')), inputs())).toEqual({ state: 'unknown', reason: 'recognizer-not-eligible' });
    expect(decideWitness(edge('depends-on-service', svc('compose.yaml', 'web'), svc('compose.yaml', 'db')), inputs())).toEqual({ state: 'unknown', reason: 'recognizer-not-eligible' });
    // ...and for contains where the table lacks its rule, or holds another version of it.
    expect(decideWitness(edge('contains', ROOT, tld('src')), inputs(), [])).toEqual({ state: 'unknown', reason: 'recognizer-not-eligible' });
    expect(decideWitness(edge('contains', ROOT, tld('src')), inputs(), [{ rule: 'top-level-unit', version: 2, record: null }])).toEqual({ state: 'unknown', reason: 'recognizer-not-eligible' });
  });

  it('gives facts-unknown only where the record the relation\'s row reads is unknown', () => {
    expect(decideWitness(edge('contains', ROOT, tld('src')), inputs({ structure: { state: 'unknown' } }))).toEqual({ state: 'unknown', reason: 'facts-unknown' });
    expect(decideWitness(edge('contains', ROOT, tld('src')), inputs({ manifest: { state: 'unknown' } })).state).toBe('witnessed');
    expect(decideWitness(edge('declares-dependency', pkg('web/package.json'), dep('left-pad')), inputs({ manifest: { state: 'unknown' } }), EVERY)).toEqual({ state: 'unknown', reason: 'facts-unknown' });
    expect(decideWitness(edge('declares-dependency', pkg('web/package.json'), dep('left-pad')), inputs({ structure: { state: 'unknown' } }), EVERY).state).toBe('witnessed');
  });
});

describe('rule relation-witness version 1: a recognizer row once eligible (a table no version adopts)', () => {
  it('witnesses each recognizer relation by its own fact kind and exact members, whatever the fact\'s section', () => {
    expect(decideWitness(edge('declares-dependency', pkg('web/package.json'), dep('left-pad')), inputs(), EVERY)).toEqual({ state: 'witnessed', reason: null, fact: '_manifest-2', factKind: 'dependency', rule: 'npm-package-manifest', ruleVersion: 1 });
    expect(decideWitness(edge('needs-job', job('.github/workflows/ci.yml', 'test'), job('.github/workflows/ci.yml', 'build')), inputs(), EVERY)).toEqual({ state: 'witnessed', reason: null, fact: '_manifest-3', factKind: 'job-needs', rule: 'github-actions-workflow', ruleVersion: 1 });
    expect(decideWitness(edge('depends-on-service', svc('compose.yaml', 'web'), svc('compose.yaml', 'db')), inputs(), EVERY)).toEqual({ state: 'witnessed', reason: null, fact: '_manifest-4', factKind: 'service-depends-on', rule: 'compose-file', ruleVersion: 1 });
  });

  it('never takes a fact of another kind, direction, path or rule as a witness', () => {
    // Reversed: no job-needs fact runs from build to test.
    expect(decideWitness(edge('needs-job', job('.github/workflows/ci.yml', 'build'), job('.github/workflows/ci.yml', 'test')), inputs(), EVERY)).toEqual({ state: 'challenged', reason: null, factKind: 'job-needs', rule: 'github-actions-workflow', ruleVersion: 1 });
    // Two workflow files: a fact's path must equal both units' path.
    expect(decideWitness(edge('needs-job', job('.github/workflows/ci.yml', 'test'), job('.github/workflows/cd.yml', 'build')), inputs(), EVERY).state).toBe('challenged');
    expect(decideWitness(edge('depends-on-service', svc('compose.yaml', 'db'), svc('compose.yaml', 'web')), inputs(), EVERY).state).toBe('challenged');
    expect(decideWitness(edge('declares-dependency', pkg('web/package.json'), dep('Left-pad')), inputs(), EVERY).state).toBe('challenged');
    // The package fact names `web`; only a dependency fact witnesses declares-dependency.
    expect(decideWitness(edge('declares-dependency', pkg('web/package.json'), dep('web')), inputs(), EVERY).state).toBe('challenged');
    // A Cargo manifest's relation reads the cargo recognizer's facts, which hold none for this path.
    expect(decideWitness(edge('declares-dependency', pkg('web/Cargo.toml'), dep('left-pad')), inputs(), EVERY)).toEqual({ state: 'unknown', reason: 'coverage-partial' });
    // A fact of the right kind, path and name that another rule (or another version) derived never witnesses.
    const foreign = (rule: string, ruleVersion: number): WitnessInputs['manifest'] => ({ ...MANIFEST, facts: [{ id: '_manifest-9', fact: 'dependency', rule, ruleVersion, path: 'web/Cargo.toml', name: 'left-pad', section: 'dependencies', group: null }] } as WitnessInputs['manifest']);
    expect(decideWitness(edge('declares-dependency', pkg('web/Cargo.toml'), dep('left-pad')), inputs({ manifest: foreign('npm-package-manifest', 1) }), EVERY).state).toBe('unknown');
    expect(decideWitness(edge('declares-dependency', pkg('web/Cargo.toml'), dep('left-pad')), inputs({ manifest: foreign('cargo-manifest', 2) }), EVERY).state).toBe('unknown');
    expect(decideWitness(edge('declares-dependency', pkg('web/Cargo.toml'), dep('left-pad')), inputs({ manifest: foreign('cargo-manifest', 1) }), EVERY)).toEqual({ state: 'witnessed', reason: null, fact: '_manifest-9', factKind: 'dependency', rule: 'cargo-manifest', ruleVersion: 1 });
  });

  it('is complete for a recognizer only where the member lists no fact unlisted and the source file is listed Inferred dropping no value', () => {
    const absent = (from: Unit): WitnessEdge => edge('declares-dependency', from, dep('right-pad'));
    expect(decideWitness(absent(pkg('web/package.json')), inputs(), EVERY).state).toBe('challenged');
    expect(decideWitness(absent(pkg('lib/package.json')), inputs(), EVERY)).toEqual({ state: 'unknown', reason: 'coverage-partial' });
    expect(decideWitness(absent(pkg('api/package.json')), inputs(), EVERY)).toEqual({ state: 'unknown', reason: 'coverage-partial' });
    expect(decideWitness(absent(pkg('cli/package.json')), inputs(), EVERY)).toEqual({ state: 'unknown', reason: 'coverage-partial' });
    expect(decideWitness(absent(pkg('web/package.json')), inputs({ manifest: { ...MANIFEST, factsNotListed: 1 } as WitnessInputs['manifest'] }), EVERY)).toEqual({ state: 'unknown', reason: 'coverage-partial' });
    // A source path the screen hides is never taken as complete.
    expect(decideWitness(absent(pkg('web/package.json')), inputs({ hidden: (path) => path === 'web/package.json' }), EVERY)).toEqual({ state: 'unknown', reason: 'coverage-partial' });
    expect(decideWitness(edge('depends-on-service', svc('compose.yaml', 'db'), svc('compose.yaml', 'web')), inputs({ hidden: (path) => path === 'compose.yaml' }), EVERY)).toEqual({ state: 'unknown', reason: 'coverage-partial' });
  });
});

describe('rule relation-witness version 1: at a render', () => {
  it('keeps a witness only where its fact renders Observed, and otherwise gives fact-not-current', () => {
    const witnessed = decideWitness(edge('contains', ROOT, tld('src')), inputs());
    expect(witnessAtRender(witnessed, (id) => id === '_tree-contains-1')).toEqual(witnessed);
    expect(witnessAtRender(witnessed, () => false)).toEqual({ state: 'unknown', reason: 'fact-not-current' });
    const challenged = decideWitness(edge('contains', ROOT, tld('docs')), inputs());
    expect(witnessAtRender(challenged, () => false)).toEqual(challenged);
    expect(witnessAtRender({ state: 'unknown', reason: 'coverage-partial' }, () => false)).toEqual({ state: 'unknown', reason: 'coverage-partial' });
  });

  it('names a witnessed arrow in Syzygy\'s words for its relation, and has none for a relation no fact witnesses', () => {
    expect(['contains', 'declares-dependency', 'needs-job', 'depends-on-service', 'calls', 'relates-to'].map((relation) => witnessWords(relation as WitnessEdge['relation'])))
      .toEqual(['contains', 'declares a dependency on', 'needs', 'depends on', undefined, undefined]);
  });
});

describe('unit-reference: a unit that names no unit of its kind', () => {
  const tree = { hidden: (path: string) => path.startsWith('conf/'), isBlob: (path: string) => ['web/package.json', '.github/workflows/ci.yml', 'compose.yaml', 'conf/package.json'].includes(path) };
  it('fails each form the requirement names, and nothing else', () => {
    const cases: [Unit, string | undefined][] = [
      [ROOT, undefined], [dep('left-pad'), undefined], [tld('src'), undefined], [tld('docs'), undefined], [tld('.github'), undefined],
      [tld('src/lib'), 'top-level-directory'], [tld('.'), 'top-level-directory'], [tld('..'), 'top-level-directory'],
      [pkg('web/package.json'), undefined], [pkg('lib/package.json'), 'no-blob'], [pkg('README.md'), 'package-manifest'], [pkg('web/package.json.bak'), 'package-manifest'],
      [pkg('Cargo.toml'), 'no-blob'], [pkg('x/pyproject.toml'), 'no-blob'], [pkg('go.mod'), 'no-blob'], [pkg('web/Package.json'), 'package-manifest'], [pkg('web/mypackage.json'), 'package-manifest'], [pkg('package.json'), 'no-blob'],
      [job('.github/workflows/ci.yml', 'build'), undefined], [job('ci.yml', 'build'), 'workflow-job'], [job('.github/workflows/sub/ci.yml', 'build'), 'workflow-job'], [job('.github/workflows/cd.yaml', 'build'), 'no-blob'],
      [svc('compose.yaml', 'db'), undefined], [svc('ops/docker-compose.override.yml', 'db'), 'no-blob'], [svc('compose.json', 'db'), 'compose-service'], [svc('.github/workflows/compose.yaml', 'db'), 'compose-service'],
      // A path the tree hides is never tested for a blob, whether or not one exists there.
      [pkg('conf/package.json'), undefined], [pkg('conf/lib/package.json'), undefined],
    ];
    expect(cases.map(([unit]) => unitFault(unit, tree))).toEqual(cases.map(([, fault]) => fault));
  });

  it('tests no blob where the tree could not be listed, but still each path rule', () => {
    expect(unitFault(pkg('lib/package.json'), undefined)).toBeUndefined();
    expect(unitFault(pkg('README.md'), undefined)).toBe('package-manifest');
  });

  it('reads a node\'s unit only in one of the six forms', () => {
    expect(unitOf({ kind: 'repository-root' })).toEqual({ kind: 'repository-root' });
    expect(unitOf({ kind: 'workflow-job', path: 'a', job: 'b' })).toEqual({ kind: 'workflow-job', path: 'a', job: 'b' });
    for (const value of [undefined, null, 'src', [], { kind: 'module', path: 'src' }, { kind: 'top-level-directory', path: 'src', name: 'x' }, { kind: 'top-level-directory' }, { kind: 'dependency-name', name: 1 }, { kind: 'compose-service', path: 'a', job: 'b' }, { kind: 'toString' }]) {
      expect(unitOf(value), JSON.stringify(value)).toBeUndefined();
    }
  });
});

describe('the eligibility table', () => {
  it('holds top-level-unit version 1 alone at version 1, naming no record, so the freshness test is vacuous and asserted to be', () => {
    expect(ELIGIBILITY_TABLE).toEqual([{ rule: 'top-level-unit', version: 1, record: null }]);
    expect(ELIGIBILITY_TABLE.filter((row) => row.record !== null)).toEqual([]);
    expect(staleEligibilityRecords(ELIGIBILITY_TABLE, () => { throw new Error('a row names no record, so nothing is read'); })).toEqual([]);
  });

  it('fails where a module a named record lists no longer has the SHA-256 the record gives it', () => {
    const sha = (text: string): string => createHash('sha256').update(text).digest('hex');
    const files = new Map<string, string>([['src/manifest-npm.ts', 'one'], ['src/manifest-json.ts', 'two']]);
    const record = JSON.stringify({ modules: [{ path: 'src/manifest-npm.ts', sha256: sha('one') }, { path: 'src/manifest-json.ts', sha256: sha('two') }] });
    files.set('docs/run.json', record);
    const read = (path: string): Uint8Array | undefined => (files.has(path) ? new TextEncoder().encode(files.get(path)!) : undefined);
    const table: EligibilityRow[] = [{ rule: 'npm-package-manifest', version: 1, record: { path: 'docs/run.json', sha256: sha(record) } }];
    expect(staleEligibilityRecords(table, read)).toEqual([]);
    files.set('src/manifest-json.ts', 'changed');
    expect(staleEligibilityRecords(table, read)).toEqual(['src/manifest-json.ts']);
    files.delete('src/manifest-npm.ts');
    expect(staleEligibilityRecords(table, read)).toEqual(['src/manifest-npm.ts', 'src/manifest-json.ts']);
    // The record itself changed, missing, unparsable or listing nothing.
    expect(staleEligibilityRecords([{ ...table[0]!, record: { path: 'docs/run.json', sha256: sha('other') } }], read)).toEqual(['docs/run.json']);
    expect(staleEligibilityRecords([{ ...table[0]!, record: { path: 'docs/none.json', sha256: sha(record) } }], read)).toEqual(['docs/none.json']);
    files.set('docs/bad.json', '{');
    expect(staleEligibilityRecords([{ ...table[0]!, record: { path: 'docs/bad.json', sha256: sha('{') } }], read)).toEqual(['docs/bad.json']);
    files.set('docs/empty.json', '{"modules":[]}');
    expect(staleEligibilityRecords([{ ...table[0]!, record: { path: 'docs/empty.json', sha256: sha('{"modules":[]}') } }], read)).toEqual(['docs/empty.json']);
  });
});
