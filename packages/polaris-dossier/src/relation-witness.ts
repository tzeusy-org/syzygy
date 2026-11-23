import { isRecord, sha256 } from '@syzygy/support';
import { CARGO_MANIFEST, COMPOSE_FILE, GITHUB_ACTIONS_WORKFLOW, GO_MODULE_MANIFEST, NPM_PACKAGE_MANIFEST, PYTHON_PROJECT_MANIFEST, TOP_LEVEL_UNIT } from './derive-rules.js';
import { isComposePath } from './manifest-compose.js';
import { isWorkflowPath } from './manifest-workflow.js';

/** Rule `relation-witness` version 1 (REQ-polaris-generation-034 version 2.19, syzygy-3efd.28): for each edge of a produced graph diagram of
 * a schema-v9 draft, one witness state, `witnessed`, `challenged` or `unknown`, from the edge's relation, the units of its two end nodes and
 * the facts Syzygy derives for the revision, and from nothing else the draft carries: never a label or a model. A relation is witnessed only
 * by facts of the one kind its row names, between units of the two kinds its row names; equality is of exact code units, nothing case-folded
 * or normalised. The rule reads no file body, size or object identifier beyond what the witnessing fact's own rule reads. Pure: `check`
 * and each render call it with the facts each derives itself. */
export const RELATION_WITNESS = Object.freeze({ id: 'relation-witness', version: 1 } as const);

/** The closed list of relation types a v9 graph edge carries, in the requirement's order. */
export const RELATION_TYPES = Object.freeze(['contains', 'declares-dependency', 'needs-job', 'depends-on-service', 'calls', 'imports', 'reads', 'writes', 'sends-to', 'starts', 'relates-to'] as const);
export type RelationType = typeof RELATION_TYPES[number];

/** The six unit forms a v9 graph node may carry, by kind, each with its members (`kind` aside) in the requirement's order. */
export const UNIT_FORMS = Object.freeze({
  'repository-root': [],
  'top-level-directory': ['path'],
  'package-manifest': ['path'],
  'dependency-name': ['name'],
  'workflow-job': ['path', 'job'],
  'compose-service': ['path', 'service'],
} as const);
export type UnitKind = keyof typeof UNIT_FORMS;
export const UNIT_KINDS = Object.freeze(Object.keys(UNIT_FORMS) as UnitKind[]);
/** A directory name, dependency name, job key or service key: 1 to this many code units. */
export const UNIT_TEXT_LIMIT = 256;

export type Unit =
  | { readonly kind: 'repository-root' }
  | { readonly kind: 'top-level-directory'; readonly path: string }
  | { readonly kind: 'package-manifest'; readonly path: string }
  | { readonly kind: 'dependency-name'; readonly name: string }
  | { readonly kind: 'workflow-job'; readonly path: string; readonly job: string }
  | { readonly kind: 'compose-service'; readonly path: string; readonly service: string };

type Witnessable = 'contains' | 'declares-dependency' | 'needs-job' | 'depends-on-service';
interface RuleId { readonly id: string; readonly version: number }

/** One row of the rule: the fact kind that witnesses the relation, the unit kinds at its two ends, Syzygy's words for it on a witnessed arrow,
 * and the rule whose facts it reads, which for `declares-dependency` is the package recognizer whose path rule names the source unit's path. */
interface WitnessRow { readonly fact: string; readonly from: UnitKind; readonly to: UnitKind; readonly words: string; readonly rule: (source: Unit) => RuleId | undefined; readonly record: 'structure' | 'manifest' }

const PACKAGE_RECOGNIZERS: Readonly<Record<string, RuleId>> = {
  'package.json': NPM_PACKAGE_MANIFEST, 'Cargo.toml': CARGO_MANIFEST, 'pyproject.toml': PYTHON_PROJECT_MANIFEST, 'go.mod': GO_MODULE_MANIFEST,
};
/** The basenames a `package-manifest` unit's path ends in: one per package recognizer of version 2.7. */
export const PACKAGE_MANIFEST_BASENAMES = Object.freeze(Object.keys(PACKAGE_RECOGNIZERS));
const lastSegment = (path: string): string => path.slice(path.lastIndexOf('/') + 1);
const pathOf = (unit: Unit): string | undefined => ('path' in unit ? unit.path : undefined);

export const WITNESS_ROWS: Readonly<Record<Witnessable, WitnessRow>> = Object.freeze({
  contains: { fact: 'contains', from: 'repository-root', to: 'top-level-directory', words: 'contains', rule: () => TOP_LEVEL_UNIT, record: 'structure' },
  'declares-dependency': { fact: 'dependency', from: 'package-manifest', to: 'dependency-name', words: 'declares a dependency on', rule: (source) => PACKAGE_RECOGNIZERS[lastSegment(pathOf(source) ?? '')], record: 'manifest' },
  'needs-job': { fact: 'job-needs', from: 'workflow-job', to: 'workflow-job', words: 'needs', rule: () => GITHUB_ACTIONS_WORKFLOW, record: 'manifest' },
  'depends-on-service': { fact: 'service-depends-on', from: 'compose-service', to: 'compose-service', words: 'depends on', rule: () => COMPOSE_FILE, record: 'manifest' },
});
const rowOf = (relation: RelationType): WitnessRow | undefined => (Object.hasOwn(WITNESS_ROWS, relation) ? WITNESS_ROWS[relation as Witnessable] : undefined);

/** Syzygy's words for a witnessed arrow of the relation. */
export const witnessWords = (relation: RelationType): string | undefined => rowOf(relation)?.words;

/** One row of the eligibility table: a rule whose facts may witness, and, for a recognizer, the path and SHA-256 of the recorded mutation
 * run that makes it eligible. A change to the table is a new version of rule `relation-witness`. */
export interface EligibilityRow { readonly rule: string; readonly version: number; readonly record: { readonly path: string; readonly sha256: string } | null }

/** The eligibility table at version 1: `top-level-unit` version 1 alone, resting on version 2.3's adoption of its facts and their declared
 * currency bound, so it names no record. None of the ten manifest recognizers is in it. */
export const ELIGIBILITY_TABLE: readonly EligibilityRow[] = Object.freeze([Object.freeze({ rule: TOP_LEVEL_UNIT.id, version: TOP_LEVEL_UNIT.version, record: null })]);

/** Each module a named record lists whose SHA-256 no longer equals the record's, and each record that cannot be read as one; empty where the
 * table names no record. A record is a JSON object whose `modules` lists `{ "path", "sha256" }`, each path as `read` takes it, and whose
 * own bytes have the SHA-256 the row gives. */
export function staleEligibilityRecords(table: readonly EligibilityRow[], read: (repositoryPath: string) => Uint8Array | undefined): string[] {
  const stale: string[] = [];
  for (const row of table) {
    if (row.record === null) continue;
    const bytes = read(row.record.path);
    if (bytes === undefined || sha256(bytes) !== row.record.sha256) { stale.push(row.record.path); continue; }
    let modules: unknown;
    try { modules = (JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as Record<string, unknown>)['modules']; } catch { stale.push(row.record.path); continue; }
    if (!Array.isArray(modules) || modules.length === 0) { stale.push(row.record.path); continue; }
    for (const entry of modules) {
      const at = isRecord(entry) && typeof entry['path'] === 'string' ? entry['path'] : undefined;
      const module = at === undefined ? undefined : read(at);
      if (at === undefined || module === undefined || sha256(module) !== entry['sha256']) stale.push(at ?? row.record.path);
    }
  }
  return stale;
}

/** Why a unit names no unit of its kind (a `unit-reference` finding), in the words its detail uses: the rule the unit fails. */
export type UnitFault = 'top-level-directory' | 'package-manifest' | 'workflow-job' | 'compose-service' | 'no-blob';
export const UNIT_FAULT_WORDS: Readonly<Record<UnitFault, string>> = Object.freeze({
  'top-level-directory': 'a top-level directory is one segment, never holding `/` and never `.` or `..`',
  'package-manifest': 'a package manifest\'s path ends in `package.json`, `Cargo.toml`, `pyproject.toml` or `go.mod`',
  'workflow-job': 'a workflow job\'s path is a workflow path of rule github-actions-workflow version 1, `.github/workflows/<name>.yml` or `.yaml`',
  'compose-service': 'a Compose service\'s path ends in one of the eight file names of rule compose-file version 1 and is not a workflow path',
  'no-blob': 'its path names no file at the pinned revision',
});

/** What the blob test reads of the pinned tree: whether a path is one a secret detector matches (itself or a directory prefix, read as a path
 * or as text) or the screen's path outcome denies, and whether a path names a blob. */
export interface UnitTree {
  readonly hidden: (repositoryPath: string) => boolean;
  readonly isBlob: (repositoryPath: string) => boolean;
}

/** The rule a unit fails, or undefined where it names a unit of its kind as far as this can tell. A path the tree hides is never tested for
 * a blob; with no tree (the listing was refused), no unit is tested for a blob. */
export function unitFault(unit: Unit, tree: UnitTree | undefined): UnitFault | undefined {
  switch (unit.kind) {
    case 'repository-root': case 'dependency-name': return undefined;
    case 'top-level-directory': return unit.path.includes('/') || unit.path === '.' || unit.path === '..' ? 'top-level-directory' : undefined;
    case 'package-manifest': if (!PACKAGE_MANIFEST_BASENAMES.includes(lastSegment(unit.path))) return 'package-manifest'; break;
    case 'workflow-job': if (!isWorkflowPath(unit.path)) return 'workflow-job'; break;
    case 'compose-service': if (!isComposePath(unit.path)) return 'compose-service'; break;
  }
  return tree === undefined || tree.hidden(unit.path) || tree.isBlob(unit.path) ? undefined : 'no-blob';
}

export type WitnessReason = 'edge-not-inferred' | 'no-witness-rule' | 'endpoint-without-unit' | 'endpoint-unit-invalid' | 'endpoint-kind-mismatch'
  | 'recognizer-not-eligible' | 'facts-unknown' | 'coverage-partial' | 'fact-not-current';

export type WitnessDecision =
  | { readonly state: 'witnessed'; readonly reason: null; readonly fact: string; readonly factKind: string; readonly rule: string; readonly ruleVersion: number }
  | { readonly state: 'challenged'; readonly reason: null; readonly factKind: string; readonly rule: string; readonly ruleVersion: number }
  | { readonly state: 'unknown'; readonly reason: WitnessReason };

/** An end of an edge: its node's unit, and whether that unit drew a `unit-reference` finding; undefined where the node carries no unit. */
export type EdgeEnd = { readonly unit: Unit; readonly invalid: boolean } | undefined;

export interface WitnessEdge {
  /** Whether the draft asserts the edge: labelled Inferred and not rendered as a withheld item. */
  readonly asserted: boolean;
  readonly relation: RelationType;
  readonly from: EdgeEnd;
  readonly to: EdgeEnd;
}

/** The structure record as the rule reads it: its facts (a `contains` fact names its target unit fact in `to`) and the three counts that
 * decide coverage. */
export type StructureFacts =
  | { readonly state: 'derived'; readonly facts: readonly { readonly id: string; readonly fact: string; readonly path: string; readonly to?: string | null }[]; readonly secretPathsLeftOut: number; readonly submodules: number; readonly unitsNotListed: number }
  | { readonly state: 'unknown' };

/** The `manifestFacts` member as the rule reads it. */
export type ManifestFactsInput =
  | {
    readonly state: 'derived';
    readonly facts: readonly ({ readonly id: string; readonly fact: string; readonly rule: string; readonly ruleVersion: number; readonly path: string } & Readonly<Record<string, unknown>>)[];
    readonly factsNotListed: number;
    readonly recognizers: readonly { readonly rule: string; readonly ruleVersion: number; readonly files: readonly { readonly path: string; readonly epistemic: string; readonly valuesLeftOut: number | null }[] }[];
  }
  | { readonly state: 'unknown' };

export interface WitnessInputs {
  readonly structure: StructureFacts;
  readonly manifest: ManifestFactsInput;
  /** Whether a unit's path is one a secret detector matches or the screen denies: such an end of a recognizer's relation makes coverage
   * partial. Coverage for `contains` never reads it: its three counts decide it alone. */
  readonly hidden: (repositoryPath: string) => boolean;
}

/** The first fact of the witnessing kind, in its record's order, that joins the two units. */
function joiningFact(relation: Witnessable, from: Unit, to: Unit, inputs: WitnessInputs, rule: RuleId): string | undefined {
  if (relation === 'contains') {
    if (inputs.structure.state !== 'derived' || to.kind !== 'top-level-directory') return undefined;
    const facts = inputs.structure.facts;
    const unitAt = new Map(facts.filter((fact) => fact.fact === 'top-level-unit').map((fact) => [fact.id, fact.path]));
    return facts.find((fact) => fact.fact === 'contains' && typeof fact.to === 'string' && unitAt.get(fact.to) === to.path)?.id;
  }
  if (inputs.manifest.state !== 'derived') return undefined;
  const kind = WITNESS_ROWS[relation].fact;
  return inputs.manifest.facts.find((fact) => {
    if (fact.fact !== kind || fact.rule !== rule.id || fact.ruleVersion !== rule.version) return false;
    if (relation === 'declares-dependency') return from.kind === 'package-manifest' && to.kind === 'dependency-name' && fact.path === from.path && fact['name'] === to.name;
    if (relation === 'needs-job') return from.kind === 'workflow-job' && to.kind === 'workflow-job' && fact.path === from.path && fact.path === to.path && fact['from'] === from.job && fact['to'] === to.job;
    return from.kind === 'compose-service' && to.kind === 'compose-service' && fact.path === from.path && fact.path === to.path && fact['from'] === from.service && fact['to'] === to.service;
  })?.id;
}

/** Whether coverage is complete, so that the absence of a joining fact is a challenge: for `contains`, exactly the structure record derived
 * with no secret path left out, no submodule and no unit unlisted; for a recognizer's relation, the member derived with no fact unlisted and
 * the source unit's path a listed file entry of that recognizer, Inferred and dropping no value, where an end at a hidden path (a
 * `package-manifest`, `workflow-job` or `compose-service` unit's, the kinds the hidden-path rule names) makes it partial. */
function coverageComplete(relation: Witnessable, from: Unit, to: Unit, inputs: WitnessInputs, rule: RuleId): boolean {
  if (relation === 'contains') {
    const s = inputs.structure;
    return s.state === 'derived' && s.secretPathsLeftOut === 0 && s.submodules === 0 && s.unitsNotListed === 0;
  }
  if ([pathOf(from), pathOf(to)].some((at) => at !== undefined && inputs.hidden(at))) return false;
  const m = inputs.manifest;
  if (m.state !== 'derived' || m.factsNotListed !== 0) return false;
  const source = pathOf(from);
  return m.recognizers.some((entry) => entry.rule === rule.id && entry.ruleVersion === rule.version
    && entry.files.some((file) => file.path === source && file.epistemic === 'inferred' && file.valuesLeftOut === 0));
}

/** Rule `relation-witness` version 1, in its order: the first case that applies gives the state and, for `unknown`, the reason. */
export function decideWitness(edge: WitnessEdge, inputs: WitnessInputs, table: readonly EligibilityRow[] = ELIGIBILITY_TABLE): WitnessDecision {
  const unknown = (reason: WitnessReason): WitnessDecision => ({ state: 'unknown', reason });
  if (!edge.asserted) return unknown('edge-not-inferred');
  const row = rowOf(edge.relation);
  if (row === undefined) return unknown('no-witness-rule');
  if (edge.from === undefined || edge.to === undefined) return unknown('endpoint-without-unit');
  if (edge.from.invalid || edge.to.invalid) return unknown('endpoint-unit-invalid');
  const from = edge.from.unit, to = edge.to.unit;
  if (from.kind !== row.from || to.kind !== row.to) return unknown('endpoint-kind-mismatch');
  const rule = row.rule(from);
  if (rule === undefined || !table.some((entry) => entry.rule === rule.id && entry.version === rule.version)) return unknown('recognizer-not-eligible');
  if ((row.record === 'structure' ? inputs.structure : inputs.manifest).state !== 'derived') return unknown('facts-unknown');
  const relation = edge.relation as Witnessable;
  const fact = joiningFact(relation, from, to, inputs, rule);
  if (fact !== undefined) return { state: 'witnessed', reason: null, fact, factKind: row.fact, rule: rule.id, ruleVersion: rule.version };
  if (!coverageComplete(relation, from, to, inputs, rule)) return unknown('coverage-partial');
  return { state: 'challenged', reason: null, factKind: row.fact, rule: rule.id, ruleVersion: rule.version };
}

/** A render's decision (version 2.19): an edge is witnessed there only where the joining fact renders Observed; otherwise it is `unknown`
 * with `fact-not-current`. Check reads no currency policy for this rule and never applies this. */
export function witnessAtRender(decision: WitnessDecision, rendersObserved: (factId: string) => boolean): WitnessDecision {
  return decision.state === 'witnessed' && !rendersObserved(decision.fact) ? { state: 'unknown', reason: 'fact-not-current' } : decision;
}

/** A node's `unit` as the rule reads it, or undefined where the value is no unit of the six forms (a schema finding's matter). */
export function unitOf(value: unknown): Unit | undefined {
  if (!isRecord(value) || typeof value['kind'] !== 'string' || !Object.hasOwn(UNIT_FORMS, value['kind'])) return undefined;
  const kind = value['kind'] as UnitKind;
  const members = UNIT_FORMS[kind] as readonly string[];
  if (Object.keys(value).length !== members.length + 1 || members.some((member) => typeof value[member] !== 'string')) return undefined;
  return value as unknown as Unit;
}
