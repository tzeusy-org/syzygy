// PWB mutation sweep plan — task 4.2 (syzygy-1z3.18).
//
// One re-runnable plan over every mutation class the signed change names
// for rule-6 proof: the source denominator (PWB-REQ-001), the coverage
// partition (PWB-REQ-002), the precedence guard (PWB-REQ-004), the secret
// sentinel (PWB-REQ-003), the capability-first regression (PWB-REQ-010),
// the meta-copy prohibition (PWB-REQ-012), every admission invalid case
// with exact provenance state, exact disclosure, no-fallback and
// prior-evaluation history (PWB-REQ-005), every judgment invalid case with
// the same four properties (PWB-REQ-022), and the parity markers
// (PWB-REQ-020).
//
// Each group names its subject files, the independent test files that must
// catch the mutation, and its mutations: predicate sites are enumerated
// from `// mutation-point:` markers (task 2.5's shape, reused verbatim);
// literal mutations are hand-listed exact-fragment replacements with the
// test names that must be among the failures.
//
// This module never touches the filesystem; `pwb-mutation-sweep-main.ts`
// reads, mutates, tests, restores and verifies digests.

import {
  CORE_SOURCE,
  DISCLOSURE_SOURCE,
  LITERAL_MUTATIONS,
  OBSERVER_SOURCE,
  listPredicateMutations,
  type LiteralMutation,
  type PredicateMutation,
} from './pwb-mutation.js';

const JUDGMENT_SOURCE = 'packages/three-surface-poc-core/src/walkthrough-judgment.ts';
const MANIFEST_SOURCE = 'packages/three-surface-poc-core/src/project-shape-manifest.ts';
const OBSERVATION_SOURCE = 'packages/three-surface-poc-core/src/project-shape-observation.ts';
const COVERAGE_SOURCE = 'packages/three-surface-poc-core/src/project-shape-coverage.ts';
const CLASSIFICATION_SOURCE = 'packages/three-surface-poc-core/src/content-classification.ts';
const POLARIS_SOURCE = 'apps/three-surface-poc/src/polaris.ts';
const POLARIS_COPY_SOURCE = 'apps/three-surface-poc/src/polaris-copy.ts';
const TRAJECTORY_SOURCE = 'apps/three-surface-poc/src/trajectory.ts';
const ORRERY_SOURCE = 'apps/three-surface-poc/src/orrery.ts';
const EXACT_TABLES_SOURCE = 'apps/three-surface-poc/src/exact-tables.ts';

// The closed set of mutation classes task 4.2 names. Every group belongs
// to exactly one; the sweep's summary reports each class's denominator.
export const SWEEP_CLASSES = [
  'source-denominator',
  'coverage-partition',
  'precedence-guard',
  'secret-sentinel',
  'capability-first-regression',
  'meta-copy-prohibition',
  'admission-invalid-cases',
  'judgment-invalid-cases',
  'parity-markers',
] as const;
type SweepClass = (typeof SWEEP_CLASSES)[number];

// How a disabled predicate's expected failures are named: task 2.5's
// authority-instance naming, or the judgment table's plain case id.
type PredicateNaming = 'authority-instances' | 'judgment-case';

interface PredicateSubject {
  readonly file: string;
  readonly naming: PredicateNaming;
}

export interface SweepGroup {
  readonly id: string;
  readonly sweepClass: SweepClass;
  readonly requirement: string;
  readonly description: string;
  readonly testFiles: readonly string[];
  readonly predicateSubjects: readonly PredicateSubject[];
  readonly literals: readonly LiteralMutation[];
}

function literal(id: string, file: string, description: string, from: string, to: string, mustFail: readonly string[]): LiteralMutation {
  return { kind: 'literal', id, file, description, from, to, mustFail };
}

// ---------------------------------------------------------------------
// PWB-REQ-001 — the source denominator never shrinks.

const SOURCE_DENOMINATOR: SweepGroup = {
  id: 'source-denominator',
  sweepClass: 'source-denominator',
  requirement: 'PWB-REQ-001',
  description: 'a named-but-absent, unreadable or refused source drops out of the population',
  testFiles: [
    'packages/three-surface-poc-core/src/project-shape-manifest.test.ts',
    'packages/three-surface-poc-core/src/project-shape-observation.test.ts',
  ],
  predicateSubjects: [],
  literals: [
    literal(
      'named-absent-file-dropped',
      MANIFEST_SOURCE,
      'a pillar-named file absent at the revision is silently omitted instead of recorded missing-at-revision',
      "      if (tree.entryAt(path)?.type === 'blob' && (BASELINE_SPEC.test(path) || ROSTER_BUTLER.test(path))) continue;\n      addSource({",
      "      if (tree.entryAt(path)?.type === 'blob' && (BASELINE_SPEC.test(path) || ROSTER_BUTLER.test(path))) continue;\n      if (anchorFor(tree, path).kind === 'missing-at-revision') continue;\n      addSource({",
      ['emits exactly the hand-typed source set'],
    ),
    literal(
      'unreadable-pillar-index-dropped',
      MANIFEST_SOURCE,
      'a pillar index is counted only when its body could be read',
      "    addSource({\n      path: indexPath,\n      rule: 'pillar-index',",
      "    if (readBlob(indexPath).kind === 'text') addSource({\n      path: indexPath,\n      rule: 'pillar-index',",
      ['stays a counted source'],
    ),
    literal(
      'observer-population-filtered-to-blobs',
      OBSERVATION_SOURCE,
      'the observer stamps only tree-present blobs, dropping missing-at-revision sources',
      '  const sources: StampedSource[] = manifest.sources.map((source) => {',
      "  const sources: StampedSource[] = manifest.sources.filter((source) => source.anchor.kind === 'blob').map((source) => {",
      ['exposes the complete population'],
    ),
  ],
};

// ---------------------------------------------------------------------
// PWB-REQ-002 — per-class counts reconcile to the declared denominator.

const COVERAGE_PARTITION: SweepGroup = {
  id: 'coverage-partition',
  sweepClass: 'coverage-partition',
  requirement: 'PWB-REQ-002',
  description: 'modeled + unknown + contradicted stops reconciling to declared, or an Unknown denominator is numbered',
  testFiles: ['packages/three-surface-poc-core/src/project-shape-coverage.test.ts'],
  predicateSubjects: [],
  literals: [
    literal(
      'class-count-hides-contradicted',
      COVERAGE_SOURCE,
      'the contradicted partition is reported as zero',
      "      contradicted: count('contradicted'),",
      '      contradicted: 0,',
      ['the identity appears once, contradicted'],
    ),
    literal(
      'class-denominator-known-over-unknown-source',
      COVERAGE_SOURCE,
      'a class denominator is numbered although a source of that class has an Unknown item denominator',
      "      denominator: reasons.length === 0 ? { kind: 'known', value: declared } : { kind: 'unknown', reasons, ...(unenumeratedCount === 0 ? {} : { unenumerated: { reason: 'unenumerated-heading' as const, headings: unenumeratedCount } }) },",
      "      denominator: { kind: 'known', value: declared },",
      ['hand-typed per-class counts'],
    ),
    literal(
      'count-fact-numbered-over-unknown',
      COVERAGE_SOURCE,
      'the derived count fact is modeled although the denominator is Unknown',
      '    if (primaryReason !== undefined) {\n      // A count over an Unknown denominator',
      '    if (false) {\n      // A count over an Unknown denominator',
      ['a count over an Unknown denominator is Unknown with the source reason, never a number'],
    ),
  ],
};

// ---------------------------------------------------------------------
// PWB-REQ-004 — no winner without a Butlers-declared rule.

const PRECEDENCE_GUARD: SweepGroup = {
  id: 'precedence-guard',
  sweepClass: 'precedence-guard',
  requirement: 'PWB-REQ-004',
  description: 'a contradiction is resolved by something other than exactly one applicable Butlers rule',
  testFiles: ['packages/three-surface-poc-core/src/project-shape-coverage.test.ts'],
  predicateSubjects: [],
  literals: [
    literal(
      'anchor-population-unchecked',
      COVERAGE_SOURCE,
      'a rule cited from outside the admitted population still applies',
      "  if (!population.has(rule.anchor.path)) return { outcome: 'anchor-not-in-population' };",
      "  if (false) return { outcome: 'anchor-not-in-population' };",
      ['a rule cited from a path outside the admitted population decides nothing'],
    ),
    literal(
      'last-declaration-wins-without-rule',
      COVERAGE_SOURCE,
      'with no applicable rule the newest declaration is picked instead of Unknown',
      "    return { fact, state: 'contradicted', declarations, unknownReason: CONTRADICTED_REASON, rulesConsidered };",
      "    return { fact, state: 'modeled', value: (declarations[declarations.length - 1] as Declaration).value, declarations, rulesConsidered };",
      ['without a rule: both values and sources shown, no winner'],
    ),
    literal(
      'disagreeing-rules-pick-first',
      COVERAGE_SOURCE,
      'two applicable rules that disagree let the first decide',
      '  if (winners.length === 0 || distinctWinners.size !== 1) {',
      '  if (winners.length === 0 || distinctWinners.size < 1) {',
      ['two applicable rules that disagree on the winner decide nothing'],
    ),
  ],
};

// ---------------------------------------------------------------------
// PWB-REQ-003 — the secret sentinel.

const SECRET_SENTINEL: SweepGroup = {
  id: 'secret-sentinel',
  sweepClass: 'secret-sentinel',
  requirement: 'PWB-REQ-003',
  description: 'a policy detector stops matching, so a planted sentinel reaches the model',
  testFiles: ['packages/three-surface-poc-core/src/content-classification.test.ts'],
  predicateSubjects: [],
  literals: [
    literal(
      'detect-none',
      CLASSIFICATION_SOURCE,
      'no detector ever names a match',
      '    if (detector.matches(text) && first === undefined) first = detector.id;',
      '    if (false) first = detector.id;',
      ['step 3: every detector runs over the transient text'],
    ),
    literal(
      'lastindex-not-reset',
      CLASSIFICATION_SOURCE,
      'a global-flag detector keeps its lastIndex between sources, so a second sentinel is missed',
      '        expression.lastIndex = 0;\n        return expression.test(text);',
      '        return expression.test(text);',
      ['step 3: every detector runs over the transient text'],
    ),
  ],
};

// ---------------------------------------------------------------------
// PWB-REQ-010 — the project-level sequence, never capability-first.

const CAPABILITY_FIRST_REGRESSION: SweepGroup = {
  id: 'capability-first-regression',
  sweepClass: 'capability-first-regression',
  requirement: 'PWB-REQ-010',
  description: 'the capability slice returns above the catalog or loses its one-capability scope',
  testFiles: ['apps/three-surface-poc/src/polaris.test.ts', 'apps/three-surface-poc/src/polaris-project-shape.test.ts'],
  predicateSubjects: [],
  literals: [
    literal(
      'capability-scope-marker-dropped',
      POLARIS_SOURCE,
      'the capability slice no longer declares itself one capability within the catalog',
      ' data-polaris-capability-scope data-scope="poc-bound"',
      ' data-scope="poc-bound"',
      ['opens with the project-level groups in the required order'],
    ),
    literal(
      'capability-first-framing-returns',
      POLARIS_SOURCE,
      'the retired capability-first framing marker is rendered again',
      '<p class="scope-instruction" data-polaris-capability-scope',
      '<p class="scope-instruction" data-polaris-framing data-polaris-capability-scope',
      ['opens with the project-level groups in the required order'],
    ),
    literal(
      'capability-detail-above-catalog',
      POLARIS_SOURCE,
      'the capability detail group is rendered before the catalog',
      "    ${groupHeader('catalog')}\n    ${RECONCILIATION_PLACEHOLDER}\n    ${projectGroupBody(shape, 'catalog')}\n    ${groupHeader('capability-detail')}",
      "    ${groupHeader('capability-detail')}\n    ${groupHeader('catalog')}\n    ${RECONCILIATION_PLACEHOLDER}\n    ${projectGroupBody(shape, 'catalog')}",
      ['opens with the project-level groups in the required order'],
    ),
  ],
};

// ---------------------------------------------------------------------
// PWB-REQ-012 — the meta-copy prohibition.

const META_COPY_PROHIBITION: SweepGroup = {
  id: 'meta-copy-prohibition',
  sweepClass: 'meta-copy-prohibition',
  requirement: 'PWB-REQ-012',
  description: 'a fixed string narrates the page instead of the project, or a disclosure loses its role',
  testFiles: ['apps/three-surface-poc/src/polaris-copy.test.ts'],
  predicateSubjects: [],
  literals: [
    literal(
      'prohibited-term-in-copy',
      POLARIS_COPY_SOURCE,
      'a heading names the page',
      "text: 'Project catalog' }",
      "text: 'Project catalog page' }",
      ['free of the prohibited vocabulary'],
    ),
    literal(
      'disclosure-misroled',
      POLARIS_COPY_SOURCE,
      'the epistemic notice is classified as a project fact',
      "{ id: 'notice', role: 'epistemic-disclosure', kind: 'notice',",
      "{ id: 'notice', role: 'project-fact', kind: 'notice',",
      ['free of the prohibited vocabulary'],
    ),
  ],
};

// ---------------------------------------------------------------------
// PWB-REQ-005 — every admission invalid case, exact state, exact
// disclosure, no fallback, append-only history (task 2.5's plan, reused).

const ADMISSION_INVALID_CASES: SweepGroup = {
  id: 'admission-invalid-cases',
  sweepClass: 'admission-invalid-cases',
  requirement: 'PWB-REQ-005',
  description: 'an admission predicate is disabled, or state, disclosure, fallback or history is falsified',
  testFiles: ['packages/three-surface-poc-core/src/body-read-authority.test.ts', 'apps/three-surface-poc/src/governance-inputs.test.ts'],
  predicateSubjects: [
    { file: CORE_SOURCE, naming: 'authority-instances' },
    { file: OBSERVER_SOURCE, naming: 'authority-instances' },
  ],
  literals: LITERAL_MUTATIONS,
};

// ---------------------------------------------------------------------
// PWB-REQ-022 — every judgment invalid case, exact state, exact
// disclosure, no fallback, append-only history.

const JUDGMENT_VALID_STATE_1 = 'valid state (1): owner-adopted';
const JUDGMENT_VALID_STATE_2 = 'valid state (2): Syzygy-verified';
const JUDGMENT_ANY_INVALID = 'run-record-outside-records-home';
const JUDGMENT_ANY_ABSENT = 'no-run-record';

const JUDGMENT_INVALID_CASES: SweepGroup = {
  id: 'judgment-invalid-cases',
  sweepClass: 'judgment-invalid-cases',
  requirement: 'PWB-REQ-022',
  description: 'a judgment predicate is disabled, or state, disclosure, fallback, absence or history is falsified',
  testFiles: ['packages/three-surface-poc-core/src/walkthrough-judgment.test.ts'],
  predicateSubjects: [{ file: JUDGMENT_SOURCE, naming: 'judgment-case' }],
  literals: [
    literal(
      'judgment-exact-state-inflated',
      JUDGMENT_SOURCE,
      'a valid state-(1) judgment is labelled Syzygy-verified',
      "const stateLabel = provenance === 'state-2' ? STATE_2_LABEL : STATE_1_LABEL;",
      'const stateLabel = STATE_2_LABEL;',
      [JUDGMENT_VALID_STATE_1],
    ),
    literal(
      'judgment-exact-state-collapsed',
      JUDGMENT_SOURCE,
      'a valid state-(2) judgment is labelled owner-adopted',
      "const stateLabel = provenance === 'state-2' ? STATE_2_LABEL : STATE_1_LABEL;",
      'const stateLabel = STATE_1_LABEL;',
      [JUDGMENT_VALID_STATE_2],
    ),
    literal(
      'judgment-independently-verified-always',
      JUDGMENT_SOURCE,
      'every lawful judgment claims independent verification',
      "    independentlyVerified: provenance === 'state-2',",
      '    independentlyVerified: true,',
      [JUDGMENT_VALID_STATE_1],
    ),
    literal(
      'judgment-disclosure-hidden',
      JUDGMENT_SOURCE,
      'the state-(1) disclosure sentence is replaced by the state-(2) one',
      "    disclosure: provenance === 'state-2' ? STATE_2_DISCLOSURE : STATE_1_DISCLOSURE,",
      '    disclosure: STATE_2_DISCLOSURE,',
      [JUDGMENT_VALID_STATE_1],
    ),
    literal(
      'judgment-failed-correlation-downgrades',
      JUDGMENT_SOURCE,
      'a failed state-(2) correlation falls back to state (1)',
      "  if (correlation === 'failed') return unlawful('state-2-correlation-failed', 'claimed state (2) but A1 correlation failed; no fallback to state (1)');",
      "  if (correlation === 'failed') { claimed = 'state-1'; }",
      ['a failed state-(2) correlation is unlawful'],
    ),
    literal(
      'judgment-absent-fabricates-verdict',
      JUDGMENT_SOURCE,
      'an absent pair carries a fabricated met verdict',
      "    what,\n    detail,\n    criterion: 'unknown-never-met',\n    verdict: undefined,",
      "    what,\n    detail,\n    criterion: 'unknown-never-met',\n    verdict: { criterion: 'polaris-cold-open-comprehension', value: 'met', rationale: '', judgingParty: '' } as never,",
      [JUDGMENT_ANY_ABSENT],
    ),
    literal(
      'judgment-absent-renders-success',
      JUDGMENT_SOURCE,
      'an absent pair renders the success criterion',
      "    what,\n    detail,\n    criterion: 'unknown-never-met',",
      "    what,\n    detail,\n    criterion: 'owner-verdict-carried' as never,",
      [JUDGMENT_ANY_ABSENT],
    ),
    literal(
      'judgment-unlawful-carries-verdict',
      JUDGMENT_SOURCE,
      'an unlawful pair still carries a verdict',
      "    detail,\n    criterion: 'unknown-never-met',\n    verdict: undefined,\n    claimedProvenance",
      "    detail,\n    criterion: 'unknown-never-met',\n    verdict: { criterion: 'polaris-cold-open-comprehension', value: 'met', rationale: '', judgingParty: '' } as never,\n    claimedProvenance",
      [JUDGMENT_ANY_INVALID],
    ),
    literal(
      'judgment-unlawful-renders-success',
      JUDGMENT_SOURCE,
      'an unlawful pair renders the success criterion',
      "    detail,\n    criterion: 'unknown-never-met',\n    verdict: undefined,\n    claimedProvenance",
      "    detail,\n    criterion: 'owner-verdict-carried' as never,\n    verdict: undefined,\n    claimedProvenance",
      [JUDGMENT_ANY_INVALID],
    ),
    literal(
      'judgment-verdict-unlawful-literal',
      JUDGMENT_SOURCE,
      'the recorded literal is not verdict-unlawful',
      "export const VERDICT_UNLAWFUL = 'verdict-unlawful' as const;",
      "export const VERDICT_UNLAWFUL = 'verdict-invalid' as const;",
      [JUDGMENT_ANY_INVALID],
    ),
    literal(
      'judgment-history-rewritten',
      JUDGMENT_SOURCE,
      're-recording an evaluation identity replaces the earlier entry',
      '      throw new Error(`evaluation ${evaluation.evaluationId} is already recorded; history is append-only`);',
      '      return Object.freeze([...history.filter((entry) => entry.evaluationId !== evaluation.evaluationId), deepFreeze(evaluation)]);',
      ['re-recording an evaluation identity throws instead of rewriting'],
    ),
    literal(
      'judgment-history-not-frozen',
      JUDGMENT_SOURCE,
      'the appended history is mutable',
      '  return Object.freeze([...history, deepFreeze(evaluation)]);',
      '  return [...history, evaluation];',
      ['later correlation is a new entry'],
    ),
    literal(
      'judgment-lawful-called-observed',
      JUDGMENT_SOURCE,
      'a lawful judgment is presented as Observed evidence',
      "    evidenceKind: 'recorded-human-judgment',",
      "    evidenceKind: 'observed' as never,",
      ['a lawful outcome is recorded human judgment'],
    ),
  ],
};

// ---------------------------------------------------------------------
// PWB-REQ-020 — parity markers on every surface.

const PARITY_MARKERS: SweepGroup = {
  id: 'parity-markers',
  sweepClass: 'parity-markers',
  requirement: 'PWB-REQ-020',
  description: 'a rendered parity marker is renamed or dropped so the human answer no longer resolves to the machine answer',
  testFiles: [
    'apps/three-surface-poc/src/polaris.test.ts',
    'apps/three-surface-poc/src/polaris-project-shape.test.ts',
    'apps/three-surface-poc/src/trajectory.test.ts',
    'apps/three-surface-poc/src/orrery.test.ts',
    'apps/three-surface-poc/src/routes.test.ts',
    'apps/three-surface-poc/src/polaris-parity-sweep.test.ts',
  ],
  predicateSubjects: [],
  literals: [
    // Task 4.3 (PWB-REQ-020): four marker classes × five kinds, each caught
    // by the exhaustive Polaris sweep's per-family multiset comparison.
    // fact — project-shape source rows.
    literal(
      'polaris-fact-marker-missing',
      POLARIS_SOURCE,
      'fact/missing: the source-path marker is renamed so the source facts drop out of the human channel',
      '<code data-parity-field="shape-source-path">${escapeHtml(source.path)}</code>',
      '<code data-parity-field="source-path">${escapeHtml(source.path)}</code>',
      ['observed shape / not-evaluated judgment'],
    ),
    literal(
      'polaris-fact-marker-duplicated',
      POLARIS_SOURCE,
      'fact/duplicated: every source row is rendered twice',
      '<tbody>${shape.sources.map((source, index) => sourceRow(source, index, shape.identity.revision)).join(\'\')}</tbody>',
      '<tbody>${[...shape.sources, ...shape.sources].map((source, index) => sourceRow(source, index, shape.identity.revision)).join(\'\')}</tbody>',
      ['observed shape / not-evaluated judgment'],
    ),
    literal(
      'polaris-fact-marker-changed',
      POLARIS_SOURCE,
      'fact/changed: the rendered source path is not the machine path',
      '<code data-parity-field="shape-source-path">${escapeHtml(source.path)}</code>',
      '<code data-parity-field="shape-source-path">${escapeHtml(source.path.toUpperCase())}</code>',
      ['observed shape / not-evaluated judgment'],
    ),
    literal(
      'polaris-fact-marker-collapsed',
      POLARIS_SOURCE,
      'fact/collapsed: sources sharing a pillar directory collapse into one row',
      '<tbody>${shape.sources.map((source, index) => sourceRow(source, index, shape.identity.revision)).join(\'\')}</tbody>',
      '<tbody>${shape.sources.filter((source, index, all) => all.findIndex((other) => other.path.split(\'/\').slice(0, 2).join(\'/\') === source.path.split(\'/\').slice(0, 2).join(\'/\')) === index).map((source, index) => sourceRow(source, index, shape.identity.revision)).join(\'\')}</tbody>',
      ['observed shape / not-evaluated judgment'],
    ),
    literal(
      'polaris-fact-marker-wrong-evaluation',
      POLARIS_SOURCE,
      'fact/wrong-evaluation: the observation digest shown is the manifest digest of another stage',
      'data-parity-field="shape-observation-digest">${escapeHtml(shortDigest(identity.observationDigest))}<',
      'data-parity-field="shape-observation-digest">${escapeHtml(shortDigest(identity.manifestDigest))}<',
      ['observed shape / not-evaluated judgment'],
    ),
    // authority-state — the body-read authority line.
    literal(
      'polaris-authority-state-missing',
      POLARIS_SOURCE,
      'authority-state/missing: the first authority is not rendered',
      '  const entries = authority.authorities\n    .map((entry) =>',
      '  const entries = authority.authorities.slice(1)\n    .map((entry) =>',
      ['observed shape / not-evaluated judgment'],
    ),
    literal(
      'polaris-authority-state-duplicated',
      POLARIS_SOURCE,
      'authority-state/duplicated: every authority is rendered twice',
      '  const entries = authority.authorities\n    .map((entry) =>',
      '  const entries = [...authority.authorities, ...authority.authorities]\n    .map((entry) =>',
      ['observed shape / not-evaluated judgment'],
    ),
    literal(
      'polaris-authority-state-changed',
      POLARIS_SOURCE,
      'authority-state/changed: the state word shown is not the machine state',
      '${escapeHtml(entry.authority)} — ${escapeHtml(entry.state)}</span>',
      '${escapeHtml(entry.authority)} — ${escapeHtml(entry.state.toUpperCase())}</span>',
      ['observed shape / not-evaluated judgment'],
    ),
    literal(
      'polaris-authority-state-collapsed',
      POLARIS_SOURCE,
      'authority-state/collapsed: authorities sharing a state collapse into one marker',
      '  const entries = authority.authorities\n    .map((entry) =>',
      '  const entries = authority.authorities.filter((entry, index, all) => all.findIndex((other) => other.state === entry.state) === index)\n    .map((entry) =>',
      ['observed shape / not-evaluated judgment'],
    ),
    literal(
      'polaris-authority-state-wrong-evaluation',
      POLARIS_SOURCE,
      'authority-state/wrong-evaluation: the authority line names the evaluation instant where the evaluation id belongs',
      '<code data-parity-field="authority-evaluation-id">${escapeHtml(authority.evaluationId)}<',
      '<code data-parity-field="authority-evaluation-id">${escapeHtml(authority.evaluationInstant)}<',
      ['observed shape / not-evaluated judgment'],
    ),
    // authority-disclosure — PWB-REQ-005's sentence on the human page (PWB-RECON-01).
    literal(
      'polaris-authority-disclosure-missing',
      POLARIS_SOURCE,
      'authority-disclosure/missing: the disclosure marker is renamed so the sentence drops out of the human channel',
      '<span data-parity-field="authority-disclosure" data-authority="${escapeHtml(entry.authority)}">${escapeHtml(entry.disclosure)}</span>',
      '<span data-parity-field="authority-sentence" data-authority="${escapeHtml(entry.authority)}">${escapeHtml(entry.disclosure)}</span>',
      ['observed shape / not-evaluated judgment'],
    ),
    literal(
      'polaris-authority-disclosure-changed',
      POLARIS_SOURCE,
      'authority-disclosure/changed: the sentence shown is not the evaluation\'s sentence',
      '<span data-parity-field="authority-disclosure" data-authority="${escapeHtml(entry.authority)}">${escapeHtml(entry.disclosure)}</span>',
      '<span data-parity-field="authority-disclosure" data-authority="${escapeHtml(entry.authority)}">${escapeHtml(entry.disclosure.replace(\'forgeable\', \'verifiable\'))}</span>',
      ['observed shape / not-evaluated judgment'],
    ),
    // shape-pillar-state / shape-pillar-reason / shape-degradation-state —
    // discovery and degradation on the page (PWB-RECON-02).
    literal(
      'polaris-pillar-state-missing',
      POLARIS_SOURCE,
      'shape-pillar-state/missing: the first pillar is not rendered',
      '  const entries = discovery\n    .map((pillar) => {',
      '  const entries = discovery.slice(1)\n    .map((pillar) => {',
      ['observed shape / not-evaluated judgment'],
    ),
    literal(
      'polaris-pillar-state-changed',
      POLARIS_SOURCE,
      'shape-pillar-state/changed: every pillar is shown discovered whatever the model holds',
      '${escapeHtml(pillar.key)} — ${escapeHtml(pillar.state)}</span>`;',
      '${escapeHtml(pillar.key)} — discovered</span>`;',
      ['observed-undiscovered shape / not-evaluated judgment', "discloses every pillar's discovery state, and a missing pillar index with its reason and a cause-correct route"],
    ),
    literal(
      'polaris-pillar-reason-changed',
      POLARIS_SOURCE,
      'shape-pillar-reason/changed: the reason marker carries the state word where the reason belongs',
      'data-pillar="${escapeHtml(pillar.key)}">${escapeHtml(pillar.reason)}</span>',
      'data-pillar="${escapeHtml(pillar.key)}">${escapeHtml(pillar.state)}</span>',
      ['observed-undiscovered shape / not-evaluated judgment', "discloses every pillar's discovery state, and a missing pillar index with its reason and a cause-correct route"],
    ),
    literal(
      'polaris-degradation-missing',
      POLARIS_SOURCE,
      'shape-degradation-state/missing: a degraded observation is rendered as though none was recorded',
      "  if (degradation === undefined) return `<p data-shape-degradation=\"none\"",
      "  if (degradation !== null) return `<p data-shape-degradation=\"none\"",
      ['observed-excluded shape / not-evaluated judgment'],
    ),
    // judgment-state — the walkthrough judgment section.
    literal(
      'polaris-judgment-state-missing',
      POLARIS_SOURCE,
      'judgment-state/missing: the judgment kind marker is renamed',
      '<span data-parity-field="judgment-kind">${escapeHtml(outcome.kind)}</span>',
      '<span data-parity-field="judgment-outcome">${escapeHtml(outcome.kind)}</span>',
      ['observed shape / lawful-state-1 judgment', 'observed shape / unlawful judgment', 'observed shape / absent-run-record judgment'],
    ),
    literal(
      'polaris-judgment-state-duplicated',
      POLARIS_SOURCE,
      'judgment-state/duplicated: every traversed path is rendered twice',
      'traversedPaths.map((path) => `<code data-parity-field="judgment-traversed-path">${escapeHtml(path)}</code>`)',
      'traversedPaths.flatMap((path) => [path, path]).map((path) => `<code data-parity-field="judgment-traversed-path">${escapeHtml(path)}</code>`)',
      ['observed shape / lawful-state-1 judgment'],
    ),
    literal(
      'polaris-judgment-state-changed',
      POLARIS_SOURCE,
      'judgment-state/changed: the kind word shown is not the machine kind',
      '<span data-parity-field="judgment-kind">${escapeHtml(outcome.kind)}</span>',
      '<span data-parity-field="judgment-kind">${escapeHtml(outcome.kind === \'lawful\' ? \'valid\' : outcome.kind)}</span>',
      ['observed shape / lawful-state-1 judgment'],
    ),
    literal(
      'polaris-judgment-state-collapsed',
      POLARIS_SOURCE,
      'judgment-state/collapsed: repeated traversed paths collapse into one',
      'traversedPaths.map((path) => `<code data-parity-field="judgment-traversed-path">${escapeHtml(path)}</code>`)',
      'traversedPaths.filter((path, index, all) => all.indexOf(path) === index).map((path) => `<code data-parity-field="judgment-traversed-path">${escapeHtml(path)}</code>`)',
      ['observed shape / lawful-state-1 judgment'],
    ),
    literal(
      'polaris-judgment-state-wrong-evaluation',
      POLARIS_SOURCE,
      'judgment-state/wrong-evaluation: the judgment names the model snapshot label where its own evaluation id belongs',
      'data-parity-field="judgment-evaluation-id">${escapeHtml(evaluation.evaluationId)}',
      'data-parity-field="judgment-evaluation-id">${escapeHtml(model.evaluation.snapshotLabel)}',
      ['observed shape / lawful-state-1 judgment'],
    ),
    // disclosure — the state disclosure sentence, Unknown disclosures and the
    // evaluation instant they are bound to.
    literal(
      'polaris-disclosure-missing',
      POLARIS_SOURCE,
      'disclosure/missing: the state disclosure loses its marker',
      '<q data-parity-field="judgment-disclosure">${escapeHtml(outcome.disclosure)}<',
      '<q>${escapeHtml(outcome.disclosure)}<',
      ['observed shape / lawful-state-1 judgment'],
    ),
    literal(
      'polaris-disclosure-duplicated',
      POLARIS_SOURCE,
      'disclosure/duplicated: the state disclosure is rendered twice',
      '<q data-parity-field="judgment-disclosure">${escapeHtml(outcome.disclosure)}<',
      '<q data-parity-field="judgment-disclosure">${escapeHtml(outcome.disclosure)}</q><q data-parity-field="judgment-disclosure">${escapeHtml(outcome.disclosure)}<',
      ['observed shape / lawful-state-1 judgment'],
    ),
    literal(
      'polaris-disclosure-changed',
      POLARIS_SOURCE,
      'disclosure/changed: the disclosure sentence shown is not the machine sentence',
      '<q data-parity-field="judgment-disclosure">${escapeHtml(outcome.disclosure)}<',
      '<q data-parity-field="judgment-disclosure">${escapeHtml(outcome.disclosure.replace(\'only\', \'fully\'))}<',
      ['observed shape / lawful-state-1 judgment'],
    ),
    literal(
      'polaris-disclosure-collapsed',
      POLARIS_SOURCE,
      'disclosure/collapsed: Unknown relationship disclosures sharing a reason collapse into one',
      'const relationshipList = dive.relationships.map((relationship) => relationshipBullet(relationship, entitiesById, model)).join(\'\');',
      'const relationshipList = dive.relationships.filter((relationship, index, all) => relationship.epistemic.label !== \'Unknown\' || all.findIndex((other) => other.epistemic.label === \'Unknown\') === index).map((relationship) => relationshipBullet(relationship, entitiesById, model)).join(\'\');',
      ['observed shape / not-evaluated judgment'],
    ),
    literal(
      'polaris-disclosure-wrong-evaluation',
      POLARIS_SOURCE,
      'disclosure/wrong-evaluation: the judgment disclosure is bound to the model as-of instant instead of its own evaluation instant',
      'data-parity-field="judgment-evaluation-instant">${escapeHtml(evaluation.evaluationInstant)}',
      'data-parity-field="judgment-evaluation-instant">${escapeHtml(model.evaluation.asOf)}',
      ['observed shape / lawful-state-1 judgment'],
    ),
    // Task 4.2 originals.
    literal(
      'polaris-provenance-revision-marker-renamed',
      POLARIS_SOURCE,
      'the capability-item provenance revision marker is renamed',
      'data-parity-field="provenance-revision">${escapeHtml(item.revision.slice(0, 12))}',
      'data-parity-field="provenance-rev">${escapeHtml(item.revision.slice(0, 12))}',
      ['moves the capability slice below the catalog'],
    ),
    literal(
      'polaris-shape-anchor-marker-dropped',
      POLARIS_SOURCE,
      'the project-shape anchor marker is dropped from every citation',
      '<cite data-parity-field="shape-anchor"${anchorAttrs(',
      '<cite${anchorAttrs(',
      ['reaches the exact source from every observed statement'],
    ),
    literal(
      'polaris-shape-anchor-digest-truncated',
      POLARIS_SOURCE,
      'the anchor digest shown differs from the exact digest the machine answer carries',
      'shortDigest(anchor.contentDigest)',
      'anchor.contentDigest.slice(0, 4)',
      ['reaches the exact source from every observed statement'],
    ),
    literal(
      'trajectory-work-item-status-marker-renamed',
      TRAJECTORY_SOURCE,
      'the work-item status marker is renamed',
      'data-parity-field="work-item-status">${escapeHtml(item.status)}',
      'data-parity-field="work-item-state">${escapeHtml(item.status)}',
      ['places every rendered item in the column'],
    ),
    literal(
      'orrery-unmapped-count-marker-renamed',
      ORRERY_SOURCE,
      'the unmapped-count marker is renamed',
      '<span data-parity-field="orrery-unmapped-count">${orrery.unmappedFileCount}</span>',
      '<span data-parity-field="orrery-unmapped">${orrery.unmappedFileCount}</span>',
      ['reconciles declared mapped and unmapped counts'],
    ),
    literal(
      'home-provenance-kind-marker-renamed',
      EXACT_TABLES_SOURCE,
      'the exact-table provenance kind marker is renamed',
      '<span data-parity-field="provenance-kind">${escapeHtml(provenance.kind)}</span>',
      '<span data-parity-field="provenance-type">${escapeHtml(provenance.kind)}</span>',
      ['serves one model through human and authenticated machine views'],
    ),
  ],
};

export const SWEEP_GROUPS: readonly SweepGroup[] = [
  SOURCE_DENOMINATOR,
  COVERAGE_PARTITION,
  PRECEDENCE_GUARD,
  SECRET_SENTINEL,
  CAPABILITY_FIRST_REGRESSION,
  META_COPY_PROHIBITION,
  ADMISSION_INVALID_CASES,
  JUDGMENT_INVALID_CASES,
  PARITY_MARKERS,
];

// The disclosure module belongs to the admission group's literals; listed
// so the runner loads every subject it may rewrite.
export function groupSubjectFiles(group: SweepGroup): readonly string[] {
  return [...new Set([...group.predicateSubjects.map((s) => s.file), ...group.literals.map((m) => m.file)])];
}

// Expected failing-test substrings for a disabled predicate under the
// group's naming: the judgment table names each test by its case id.
export function judgmentExpectedFailures(mutation: PredicateMutation): readonly string[] {
  // The one non-case marker guards append-only history; its falsifier is
  // the re-recording test rather than a case row.
  if (mutation.caseName === 'history-append-only') return ['re-recording an evaluation identity throws instead of rewriting'];
  return [` ${mutation.caseName}`];
}

export function listGroupPredicateMutations(group: SweepGroup, read: (file: string) => string): readonly PredicateMutation[] {
  return group.predicateSubjects.flatMap((subject) => listPredicateMutations(subject.file, read(subject.file)));
}

export { DISCLOSURE_SOURCE };
