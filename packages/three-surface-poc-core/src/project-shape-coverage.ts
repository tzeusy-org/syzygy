// PWB-REQ-002 / PWB-REQ-004 — coverage as data, contradictions preserved.
//
// Two populations. The source-path population comes from the manifest and
// never shrinks: every source is listed with either a known item
// denominator or an Unknown one carrying the classifier's fixed reason. The
// item population is the union of every admitted source's extracted items;
// each identity `(class, key)` appears exactly once in exactly one of the
// three states modeled / unknown / contradicted, so per class
// modeled + unknown + contradicted equals the declared count.
//
// Facts are reconciled from declarations. Two declarations of one fact that
// disagree — or two declarations of one item identity, whatever their
// values — are a conflict. A conflict is resolved only by a layer rule that
// Butlers itself declares in the root index's precedence table (PWB-REQ-004
// as amended 2026-09-05; registry `observationGrammar.precedence` and
// `factFamilyRows`) and that the model can cite by an anchor in the admitted
// source population: the fact's family names one layer row, that row's home
// must hold at least one admitted source, and exactly one declaration must
// sit under it. Otherwise every declaration is retained and the fact is
// Unknown with reason `contradicted-pending-adjudication` (RFC2-24
// verbatim). Nothing here ever drops a declaration or hard-codes a winner.

import {
  type ClassifiedSource,
  type ClassificationRecord,
  type FixedUnknown,
  PWB_SECRET_POLICY,
  type SecretClassificationPolicy,
  parseFailureExclusion,
  resourceLimitExclusion,
} from './content-classification.js';
import { EXTRACTION_CLASSES, SOURCE_RULE_NEEDS_ROOT_INDEX, type ExtractionClass, type ManifestSource } from './project-shape-manifest.js';
import {
  CATALOG_HEADINGS,
  type ExtractedItem,
  type ExtractionFailure,
  type ExtractionFailureRecord,
  INERT_HOME,
  type LayerOrdinal,
  type LayerRow,
  PROJECT_ACCOUNT_KEYS,
  ROSTER_HOME_TEMPLATE,
  type SourceExtraction,
  type StatedCount,
  type UnenumeratedHeading,
} from './project-shape-extraction.js';

// ---------------------------------------------------------------------
// Vocabulary.

export const COVERAGE_STATES = ['modeled', 'unknown', 'contradicted'] as const;
export type CoverageState = (typeof COVERAGE_STATES)[number];

// RFC2-24 reasons this module can emit, spelled verbatim.
export const CONTRADICTED_REASON = 'contradicted-pending-adjudication' as const;

export const DECLARATION_BASES = ['extracted-item', 'derived-count', 'stated-summary'] as const;
export type DeclarationBasis = (typeof DECLARATION_BASES)[number];

export interface DeclarationAnchor {
  readonly path: string;
  readonly line?: number;
  readonly contentDigest?: string;
}

export interface Declaration {
  // The fact declared, in the registry's closed grammar:
  // `item:<class>:<key>`, `count:<class>`, `catalog-count:<catalog-key>`,
  // `project-account:<key>`.
  readonly fact: string;
  readonly value: string;
  readonly basis: DeclarationBasis;
  readonly anchors: readonly DeclarationAnchor[];
}

// The registry's closed fact grammar (`observationGrammar.factFamilies`,
// `factFamilyRows`): every fact belongs to one family, and every family is
// owned by exactly one layer row of the root index's precedence table.
// No code reads this list (`FactFamily` below spells the same four kinds); it
// stays because the registry-currency amendment packet cites it by name.
export const FACT_FAMILIES = ['item', 'count', 'catalog-count', 'project-account'] as const;

export type FactFamily =
  | { readonly kind: 'item' | 'count'; readonly class: ExtractionClass }
  | { readonly kind: 'catalog-count' }
  | { readonly kind: 'project-account' };

const CLASS_ROWS: Readonly<Record<ExtractionClass, LayerOrdinal>> = {
  'project-account-section': 1,
  principle: 1,
  'success-criterion': 1,
  'catalog-entry': 1,
  'design-contract': 2,
  'baseline-spec': 3,
  'craft-policy': 4,
  'topology-component': 5,
  'roster-identity': 6,
};

// The twenty `factFamilyRows` entries, spelled as the registry spells them.
export const FACT_FAMILY_ROWS: Readonly<Record<string, LayerOrdinal>> = {
  ...Object.fromEntries(EXTRACTION_CLASSES.flatMap((cls) => [[`item:${cls}`, CLASS_ROWS[cls]], [`count:${cls}`, CLASS_ROWS[cls]]])),
  'catalog-count': 1,
  'project-account': 1,
};

export function factFamilyOf(fact: string): FactFamily | undefined {
  const [kind, second] = fact.split(':');
  if ((kind === 'item' || kind === 'count') && (EXTRACTION_CLASSES as readonly string[]).includes(second ?? '')) {
    return { kind, class: second as ExtractionClass };
  }
  if (kind === 'catalog-count' && (CATALOG_HEADINGS as readonly string[]).includes(fact.slice('catalog-count:'.length))) return { kind };
  if (kind === 'project-account' && (PROJECT_ACCOUNT_KEYS as readonly string[]).includes(fact.slice('project-account:'.length))) return { kind };
  return undefined;
}

// The layer row that owns a fact, or undefined for a fact outside the grammar.
export function factFamilyRow(fact: string): LayerOrdinal | undefined {
  const family = factFamilyOf(fact);
  if (family === undefined) return undefined;
  return FACT_FAMILY_ROWS[family.kind === 'item' || family.kind === 'count' ? `${family.kind}:${family.class}` : family.kind];
}

// One admitted row of the root index's precedence table: Butlers' own
// words, anchored where the root says them. Never synthesized.
export interface LayerRule extends LayerRow {
  readonly id: string;
  readonly anchor: DeclarationAnchor;
}

export const layerRuleId = (ordinal: LayerOrdinal): string => `layer:${ordinal}`;

export const RULE_REJECTIONS = [
  'anchor-not-in-population',
  'fact-out-of-scope',
  'home-inert',
  'home-not-applied',
  'no-declaration-under-home',
  'more-than-one-declaration-under-home',
] as const;
export type RuleRejection = (typeof RULE_REJECTIONS)[number];

export interface PrecedenceCitation {
  readonly ruleId: string;
  readonly ordinal: LayerOrdinal;
  readonly layer: string;
  readonly anchor: DeclarationAnchor;
  // The row as declared, normalized to the registry cell syntax.
  readonly statement: string;
}

export interface ConsideredRule {
  readonly ruleId: string;
  readonly outcome: 'applied' | RuleRejection;
}

export type ReconciledFact =
  | {
      readonly fact: string;
      readonly state: 'modeled';
      readonly value: string;
      readonly declarations: readonly Declaration[];
      // Present only when declarations disagreed and one rule decided.
      readonly disagreement?: {
        readonly effective: Declaration;
        readonly superseded: readonly Declaration[];
        readonly precedence: PrecedenceCitation;
      };
      readonly rulesConsidered: readonly ConsideredRule[];
    }
  | {
      readonly fact: string;
      readonly state: 'contradicted';
      readonly declarations: readonly Declaration[];
      readonly unknownReason: typeof CONTRADICTED_REASON;
      readonly rulesConsidered: readonly ConsideredRule[];
    }
  | {
      readonly fact: string;
      readonly state: 'unknown';
      readonly declarations: readonly Declaration[];
      readonly unknownReason: string;
      readonly rulesConsidered: readonly ConsideredRule[];
    };

// The Unknown a heading no row declares leaves behind: the items beneath it
// are not read, and the grammar has no row for them (RFC2-24 #1, "mapping"),
// so the reason word is `unenumerated-heading` and the closed reason is
// `missing-declaration`.
export interface UnenumeratedUnknown {
  readonly reason: 'unenumerated-heading';
  readonly unknownReason: 'missing-declaration';
}
export const UNENUMERATED_UNKNOWN: UnenumeratedUnknown = { reason: 'unenumerated-heading', unknownReason: 'missing-declaration' };

export type ItemDenominator =
  | { readonly kind: 'known'; readonly value: number }
  | {
      readonly kind: 'unknown';
      readonly unknown: FixedUnknown | UnenumeratedUnknown;
      // The first failed class's failure, when a class failed.
      readonly grammarFailure?: ExtractionFailureRecord;
      // The count of unenumerated headings across the source's classes.
      readonly unenumeratedHeadings?: number;
    };

// One class's item denominator within one source (PWB-REQ-002 as amended):
// known, or Unknown with the reason word (a closed grammar failure, the
// `unenumerated-heading` flag, or `source-withheld` when no class could be
// read) and the closed RFC2-24 reason the claim carries.
export type ClassDenominator =
  | { readonly kind: 'known'; readonly value: number }
  | {
      readonly kind: 'unknown';
      readonly reason: ExtractionFailure | 'unenumerated-heading' | 'source-withheld';
      readonly unknownReason: string;
      readonly failure?: ExtractionFailureRecord;
      readonly unenumeratedHeadings?: number;
    };

export interface SourceClassOutcome {
  readonly class: ExtractionClass;
  readonly denominator: ClassDenominator;
}

export interface SourceCoverage {
  readonly path: string;
  readonly extractionClasses: readonly ExtractionClass[];
  // Known only when every class the source is assigned has a known item
  // denominator in it.
  readonly itemDenominator: ItemDenominator;
  // Each assigned class's own outcome, in class order.
  readonly classOutcomes: readonly SourceClassOutcome[];
  // Some classes failed and others read.
  readonly partiallyExtracted: boolean;
  // Surfaced, never skipped: headings no row declares, in source order.
  readonly unenumeratedHeadings: readonly UnenumeratedHeading[];
  // The classification record that governs this source (the parse-failure
  // exclusion when the grammar failed).
  readonly record: ClassificationRecord;
}

export interface ItemCoverage {
  readonly class: ExtractionClass;
  readonly key: string;
  readonly state: CoverageState;
  readonly anchors: readonly DeclarationAnchor[];
  readonly statement?: string;
  readonly context?: string;
  readonly precedence?: PrecedenceCitation;
  readonly unknownReason?: string;
}

export interface ClassCoverage {
  readonly class: ExtractionClass;
  // Items declared by admitted sources (the known part of D).
  readonly declared: number;
  readonly modeled: number;
  readonly unknown: number;
  readonly contradicted: number;
  // Sources assigned this class in which its item denominator is Unknown.
  readonly sourcesWithUnknownDenominator: number;
  // True when the root index was not read and this class counts a source of
  // a rule that does not need it: the count was derived without a read root
  // index and says so wherever it is shown.
  readonly withoutReadRootIndex: boolean;
  // Root/index discovery failures that prevent this class denominator from
  // being complete even when no class source was discovered.
  readonly discoveryUnknown: number;
  // D itself: known only when every source of the class was readable.
  readonly denominator: { readonly kind: 'known'; readonly value: number } | { readonly kind: 'unknown'; readonly reasons: readonly string[] };
}

// What the root index declared, shown whether or not any conflict needed
// it. `unknown` means the root itself was not admitted (or not manifest).
export type PrecedenceDisclosure =
  | { readonly kind: 'admitted'; readonly anchor: DeclarationAnchor; readonly rules: readonly LayerRule[] }
  | { readonly kind: 'absent'; readonly anchor: DeclarationAnchor; readonly reason: ExtractionFailure; readonly line?: number; readonly detail?: string }
  | { readonly kind: 'unknown'; readonly reason: string };

export type RootSummaryDisclosure =
  | { readonly kind: 'emitted'; readonly anchor: DeclarationAnchor; readonly declarations: readonly Declaration[] }
  | { readonly kind: 'absent'; readonly anchor: DeclarationAnchor; readonly reason: ExtractionFailure; readonly line?: number; readonly detail?: string }
  | { readonly kind: 'unknown'; readonly reason: string };

// An unenumerated heading as surfaced: its source, and the exact anchor.
export interface SurfacedUnenumeratedHeading extends UnenumeratedHeading {
  readonly path: string;
  readonly anchor: DeclarationAnchor;
}

export interface ProjectShapeCoverage {
  readonly sources: readonly SourceCoverage[];
  readonly unenumeratedHeadings: readonly SurfacedUnenumeratedHeading[];
  // The root index's body was read (admitted and within limits).
  readonly rootIndexRead: boolean;
  readonly items: readonly ItemCoverage[];
  readonly classes: Readonly<Record<ExtractionClass, ClassCoverage>>;
  readonly facts: readonly ReconciledFact[];
  readonly contradictions: readonly ReconciledFact[];
  readonly precedence: PrecedenceDisclosure;
  readonly rootSummary: RootSummaryDisclosure;
  readonly counts: {
    readonly sources: number;
    readonly sourcesWithKnownItemDenominator: number;
    readonly sourcesWithUnknownDenominator: number;
    // True when the root index was not read and the source-path population
    // holds a source of a rule that does not need it.
    readonly populationWithoutReadRootIndex: boolean;
    readonly items: number;
    readonly modeled: number;
    readonly unknown: number;
    readonly contradicted: number;
    readonly facts: number;
    readonly contradictedFacts: number;
    readonly rulesDeclared: number;
    readonly rulesApplied: number;
  };
}

// ---------------------------------------------------------------------
// Reconciliation.

const underHome = (path: string, home: string): boolean => path.startsWith(home);

// The homes a row's `Home` cell expands to: rows 1–5 their exact root, row
// 6 one `roster/<key>/` per admitted roster key, row 7 nothing (inert).
export function expandedHomes(rule: Pick<LayerRule, 'home'>, rosterKeys: ReadonlySet<string>): readonly string[] {
  if (rule.home === INERT_HOME) return [];
  if (rule.home === ROSTER_HOME_TEMPLATE) return [...rosterKeys].sort().map((key) => ROSTER_HOME_TEMPLATE.replace('{butler}', key));
  return [rule.home];
}

export interface ReconcileInput {
  readonly rules: readonly LayerRule[];
  // Paths of the admitted source population a rule may be cited from and
  // a home may be applied over.
  readonly population: ReadonlySet<string>;
  // Declared keys of admitted roster identities: row 6 expands only to these.
  readonly rosterKeys: ReadonlySet<string>;
}

export function considerRule(
  rule: LayerRule,
  fact: string,
  declarations: readonly Declaration[],
  input: ReconcileInput,
): { readonly outcome: 'applied'; readonly winner: Declaration } | { readonly outcome: RuleRejection } {
  const { population } = input;
  if (!population.has(rule.anchor.path)) return { outcome: 'anchor-not-in-population' };
  if (factFamilyRow(fact) !== rule.ordinal) return { outcome: 'fact-out-of-scope' };
  const homes = expandedHomes(rule, input.rosterKeys);
  if (homes.length === 0) return { outcome: 'home-inert' };
  const applied = homes.filter((home) => [...population].some((path) => underHome(path, home)));
  if (applied.length === 0) return { outcome: 'home-not-applied' };
  const under = declarations.filter((d) => d.anchors.length > 0 && d.anchors.every((a) => applied.some((home) => underHome(a.path, home))));
  if (under.length === 0) return { outcome: 'no-declaration-under-home' };
  if (under.length > 1) return { outcome: 'more-than-one-declaration-under-home' };
  return { outcome: 'applied', winner: under[0] as Declaration };
}

export function rowStatement(rule: LayerRow): string {
  return `| ${rule.ordinal} | ${rule.layer} | ${rule.owns} | ${rule.home} |`;
}

// Reconciles every declaration of one fact. `identity` marks facts whose
// duplicate declaration is itself a conflict even when the values agree.
export function reconcileFact(fact: string, declarations: readonly Declaration[], input: ReconcileInput, identity: boolean): ReconciledFact {
  if (declarations.length === 0) throw new Error(`reconcileFact: ${fact} has no declarations`);
  const values = new Set(declarations.map((d) => d.value));
  const conflict = declarations.length > 1 && (identity || values.size > 1);
  if (!conflict) {
    return { fact, state: 'modeled', value: (declarations[0] as Declaration).value, declarations, rulesConsidered: [] };
  }
  const rulesConsidered: ConsideredRule[] = [];
  const winners: { rule: LayerRule; winner: Declaration }[] = [];
  for (const rule of input.rules) {
    const result = considerRule(rule, fact, declarations, input);
    rulesConsidered.push({ ruleId: rule.id, outcome: result.outcome });
    if (result.outcome === 'applied') winners.push({ rule, winner: result.winner });
  }
  // Exactly one rule must decide, and if several apply they must agree on
  // the winner; otherwise no rule decides.
  const distinctWinners = new Set(winners.map((w) => w.winner));
  if (winners.length === 0 || distinctWinners.size !== 1) {
    return { fact, state: 'contradicted', declarations, unknownReason: CONTRADICTED_REASON, rulesConsidered };
  }
  const { rule, winner } = winners[0] as { rule: LayerRule; winner: Declaration };
  return {
    fact,
    state: 'modeled',
    value: winner.value,
    declarations,
    disagreement: {
      effective: winner,
      superseded: declarations.filter((d) => d !== winner),
      precedence: { ruleId: rule.id, ordinal: rule.ordinal, layer: rule.layer, anchor: rule.anchor, statement: rowStatement(rule) },
    },
    rulesConsidered,
  };
}

// ---------------------------------------------------------------------
// Coverage.

export type CoverageSourceInput = ClassifiedSource<SourceExtraction>;

export interface CoverageInput {
  // Every declaration and every rule comes from these admitted sources;
  // there is no seam for injected facts or rules.
  readonly sources: readonly CoverageSourceInput[];
  readonly policy?: SecretClassificationPolicy;
  readonly discoveryUncertainties?: readonly {
    readonly classes: readonly ExtractionClass[];
    readonly unknown: FixedUnknown;
  }[];
}

const itemFact = (item: Pick<ExtractedItem, 'class' | 'key'>): string => `item:${item.class}:${item.key}`;
export const countFact = (cls: ExtractionClass): string => `count:${cls}`;
export const catalogCountFact = (key: string): string => `catalog-count:${key}`;
export const projectAccountFact = (key: string): string => `project-account:${key}`;

const unknownOutcomes = (
  classes: readonly ExtractionClass[],
  reason: Extract<ClassDenominator, { kind: 'unknown' }>['reason'],
  unknownReason: string,
  failures: readonly ExtractionFailureRecord[] = [],
  headings: readonly UnenumeratedHeading[] = [],
): readonly SourceClassOutcome[] =>
  classes.map((cls) => {
    const failure = failures.find((candidate) => candidate.class === cls);
    const unenumerated = headings.filter((heading) => heading.class === cls).length;
    return {
      class: cls,
      denominator: {
        kind: 'unknown',
        reason: failure === undefined ? reason : failure.reason,
        unknownReason,
        ...(failure === undefined ? {} : { failure }),
        ...(unenumerated === 0 ? {} : { unenumeratedHeadings: unenumerated }),
      },
    };
  });

// The classes that read, each known or Unknown for an unenumerated heading.
function readOutcome(cls: ExtractionClass, count: number, headings: readonly UnenumeratedHeading[]): SourceClassOutcome {
  const unenumerated = headings.filter((heading) => heading.class === cls).length;
  return {
    class: cls,
    denominator:
      unenumerated === 0
        ? { kind: 'known', value: count }
        : { kind: 'unknown', reason: 'unenumerated-heading', unknownReason: UNENUMERATED_UNKNOWN.unknownReason, unenumeratedHeadings: unenumerated },
  };
}

function sourceCoverage(entry: CoverageSourceInput, policy: SecretClassificationPolicy): SourceCoverage {
  const { record, source } = entry;
  const extractionClasses = source.extractionClasses;
  const whole = (
    unknown: FixedUnknown,
    outcomeRecord: ClassificationRecord,
    grammarFailure?: ExtractionFailureRecord,
    failures: readonly ExtractionFailureRecord[] = [],
    headings: readonly UnenumeratedHeading[] = [],
  ): SourceCoverage => ({
    path: source.path,
    extractionClasses,
    itemDenominator: { kind: 'unknown', unknown, ...(grammarFailure === undefined ? {} : { grammarFailure }), ...(headings.length === 0 ? {} : { unenumeratedHeadings: headings.length }) },
    classOutcomes: unknownOutcomes(extractionClasses, 'source-withheld', unknown.unknownReason, failures, headings),
    partiallyExtracted: false,
    unenumeratedHeadings: headings,
    record: outcomeRecord,
  });
  if (record.outcome !== 'classified') return whole(record.unknown, record);
  const value = entry.value;
  if (value !== undefined && value.kind === 'over-limit') {
    const excluded = resourceLimitExclusion(policy, record, value.breach.limit);
    return whole(excluded.unknown, excluded);
  }
  if (value === undefined || value.kind === 'unknown') {
    const excluded = parseFailureExclusion(policy, record);
    return whole(excluded.unknown, excluded, value?.failure, value?.failures, value?.unenumeratedHeadings);
  }
  const headings = value.unenumeratedHeadings ?? [];
  const read = extractionClasses.filter((cls) => value.denominators[cls] !== undefined).map((cls) => readOutcome(cls, value.denominators[cls] as number, headings));
  if (value.kind === 'partial') {
    const unknown = parseFailureExclusion(policy, record).unknown;
    const failed = unknownOutcomes(value.failures.map((failure) => failure.class), 'source-withheld', unknown.unknownReason, value.failures, headings);
    return {
      path: source.path,
      extractionClasses,
      itemDenominator: { kind: 'unknown', unknown, grammarFailure: value.failures[0] as ExtractionFailureRecord, ...(headings.length === 0 ? {} : { unenumeratedHeadings: headings.length }) },
      classOutcomes: extractionClasses.map((cls) => (failed.find((outcome) => outcome.class === cls) ?? read.find((outcome) => outcome.class === cls)) as SourceClassOutcome),
      partiallyExtracted: true,
      unenumeratedHeadings: headings,
      record,
    };
  }
  return {
    path: source.path,
    extractionClasses,
    itemDenominator:
      headings.length === 0
        ? { kind: 'known', value: value.items.length }
        : { kind: 'unknown', unknown: UNENUMERATED_UNKNOWN, unenumeratedHeadings: headings.length },
    classOutcomes: read,
    partiallyExtracted: false,
    unenumeratedHeadings: headings,
    record,
  };
}

function anchorOf(item: ExtractedItem, contentDigest: string | undefined): DeclarationAnchor {
  return { path: item.path, line: item.line, ...(contentDigest === undefined ? {} : { contentDigest }) };
}

// The root index's two grammars as coverage disclosures. Both come only
// from an admitted root; anything else is Unknown with the root's reason.
function rootDisclosures(
  input: CoverageInput,
  sources: readonly SourceCoverage[],
): { readonly precedence: PrecedenceDisclosure; readonly rootSummary: RootSummaryDisclosure } {
  const roots = input.sources.filter((entry) => entry.source.rule === 'root-index');
  if (roots.length !== 1) {
    const reason = roots.length === 0 ? 'no root index in the manifest' : 'more than one root index in the manifest';
    return { precedence: { kind: 'unknown', reason }, rootSummary: { kind: 'unknown', reason } };
  }
  const root = roots[0] as CoverageSourceInput;
  const coverage = sources.find((s) => s.path === root.source.path) as SourceCoverage;
  if (coverage.itemDenominator.kind === 'unknown' || root.record.outcome !== 'classified' || root.value === undefined || root.value.kind !== 'extracted') {
    const reason = coverage.itemDenominator.kind === 'unknown' ? coverage.itemDenominator.unknown.unknownReason : 'root index not extracted';
    return { precedence: { kind: 'unknown', reason }, rootSummary: { kind: 'unknown', reason } };
  }
  const extracted = root.value.rootIndex;
  if (extracted === undefined) {
    const reason = 'root index grammar not evaluated';
    return { precedence: { kind: 'unknown', reason }, rootSummary: { kind: 'unknown', reason } };
  }
  const digest = root.record.contentDigest;
  const anchor = (line: number): DeclarationAnchor => ({ path: root.source.path, line, ...(digest === undefined ? {} : { contentDigest: digest }) });
  const precedence: PrecedenceDisclosure =
    extracted.precedence.kind === 'admitted'
      ? {
          kind: 'admitted',
          anchor: anchor(extracted.precedence.line),
          rules: extracted.precedence.rules.map(({ line, ...row }) => ({ ...row, id: layerRuleId(row.ordinal), anchor: anchor(line) })),
        }
      : { kind: 'absent', anchor: anchor(extracted.precedence.line ?? 1), reason: extracted.precedence.reason, ...(extracted.precedence.line === undefined ? {} : { line: extracted.precedence.line }), ...(extracted.precedence.detail === undefined ? {} : { detail: extracted.precedence.detail }) };
  const rootSummary: RootSummaryDisclosure =
    extracted.summary.kind === 'emitted'
      ? {
          kind: 'emitted',
          anchor: anchor(extracted.summary.line),
          declarations: extracted.summary.declarations.map((d: StatedCount) => ({ fact: d.fact, value: d.value, basis: 'stated-summary', anchors: [anchor(d.line)] })),
        }
      : { kind: 'absent', anchor: anchor(extracted.summary.line ?? 1), reason: extracted.summary.reason, ...(extracted.summary.line === undefined ? {} : { line: extracted.summary.line }), ...(extracted.summary.detail === undefined ? {} : { detail: extracted.summary.detail }) };
  return { precedence, rootSummary };
}

export function buildProjectShapeCoverage(input: CoverageInput): ProjectShapeCoverage {
  const policy = input.policy ?? PWB_SECRET_POLICY;
  const sources = input.sources.map((entry) => sourceCoverage(entry, policy));
  const { precedence, rootSummary } = rootDisclosures(input, sources);
  const rules: readonly LayerRule[] = precedence.kind === 'admitted' ? precedence.rules : [];
  // The stated summary counts, retained as declarations whatever else says.
  const stated: readonly Declaration[] = rootSummary.kind === 'emitted' ? rootSummary.declarations : [];

  // Admitted items with their anchors, in source order. A partially extracted
  // source admits the items of the classes that read.
  const admitted: { readonly item: ExtractedItem; readonly anchor: DeclarationAnchor }[] = [];
  const population = new Set<string>();
  for (const entry of input.sources) {
    if (entry.record.outcome !== 'classified' || entry.value === undefined || (entry.value.kind !== 'extracted' && entry.value.kind !== 'partial')) continue;
    population.add(entry.source.path);
    for (const item of entry.value.items) admitted.push({ item, anchor: anchorOf(item, entry.record.contentDigest) });
  }
  // The root index is read when its body is: admitted and within limits. A
  // root whose grammar fails is still read.
  const rootEntry = input.sources.find((entry) => entry.source.rule === 'root-index');
  const rootIndexRead = rootEntry !== undefined && rootEntry.record.outcome === 'classified' && rootEntry.record.basis === 'body' && rootEntry.value?.kind !== 'over-limit';
  const independentOfRoot = (path: string): boolean => input.sources.some((entry) => entry.source.path === path && !SOURCE_RULE_NEEDS_ROOT_INDEX[entry.source.rule]);
  const populationWithoutReadRootIndex = !rootIndexRead && input.sources.some((entry) => !SOURCE_RULE_NEEDS_ROOT_INDEX[entry.source.rule]);
  const rosterKeys = new Set(admitted.filter((a) => a.item.class === 'roster-identity').map((a) => a.item.key));
  const reconcile: ReconcileInput = { rules, population, rosterKeys };

  // Item identities: one fact per (class, key); a duplicate declaration of
  // an identity is a conflict whatever its statement says.
  const byIdentity = new Map<string, { readonly item: ExtractedItem; readonly anchor: DeclarationAnchor }[]>();
  for (const a of admitted) {
    const fact = itemFact(a.item);
    const list = byIdentity.get(fact);
    if (list === undefined) byIdentity.set(fact, [a]);
    else list.push(a);
  }
  const items: ItemCoverage[] = [];
  const facts: ReconciledFact[] = [];
  for (const [fact, entries] of byIdentity) {
    const declarations: Declaration[] = entries.map((e) => ({
      fact,
      value: e.item.statement ?? e.item.context ?? e.item.key,
      basis: 'extracted-item',
      anchors: [e.anchor],
    }));
    const reconciled = reconcileFact(fact, declarations, reconcile, true);
    facts.push(reconciled);
    const first = (entries[0] as { item: ExtractedItem }).item;
    const effective =
      reconciled.state === 'modeled' && reconciled.disagreement !== undefined
        ? (entries.find((e) => e.anchor === (reconciled.disagreement as { effective: Declaration }).effective.anchors[0]) as { item: ExtractedItem }).item
        : first;
    items.push({
      class: first.class,
      key: first.key,
      state: reconciled.state,
      anchors: entries.map((e) => e.anchor),
      ...(effective.statement === undefined ? {} : { statement: effective.statement }),
      ...(effective.context === undefined ? {} : { context: effective.context }),
      ...(reconciled.state === 'modeled' && reconciled.disagreement !== undefined ? { precedence: reconciled.disagreement.precedence } : {}),
      ...(reconciled.state === 'contradicted' ? { unknownReason: reconciled.unknownReason } : {}),
    });
  }

  // Per-class coverage and the derived count facts.
  const digestOf = new Map(input.sources.flatMap((e) => (e.record.outcome === 'classified' ? [[e.source.path, e.record.contentDigest] as const] : [])));
  const classes = {} as Record<ExtractionClass, ClassCoverage>;
  for (const cls of EXTRACTION_CLASSES) {
    const ofClass = items.filter((i) => i.class === cls);
    const outcomeOf = (s: SourceCoverage): ClassDenominator | undefined => s.classOutcomes.find((o) => o.class === cls)?.denominator;
    const unknownSources = sources.filter((s) => outcomeOf(s)?.kind === 'unknown');
    const discoveryUnknowns = (input.discoveryUncertainties ?? []).filter((entry) => entry.classes.includes(cls));
    const reasons = [...new Set([
      ...unknownSources.map((s) => (outcomeOf(s) as Extract<ClassDenominator, { kind: 'unknown' }>).unknownReason),
      ...discoveryUnknowns.map((entry) => entry.unknown.unknownReason),
    ])];
    const declared = ofClass.length;
    const count = (state: CoverageState): number => ofClass.filter((i) => i.state === state).length;
    classes[cls] = {
      class: cls,
      declared,
      modeled: count('modeled'),
      unknown: count('unknown'),
      contradicted: count('contradicted'),
      sourcesWithUnknownDenominator: unknownSources.length,
      withoutReadRootIndex: !rootIndexRead && sources.some((s) => s.extractionClasses.includes(cls) && independentOfRoot(s.path)),
      discoveryUnknown: discoveryUnknowns.length,
      denominator: reasons.length === 0 ? { kind: 'known', value: declared } : { kind: 'unknown', reasons },
    };
    const fact = countFact(cls);
    const derived: Declaration = {
      fact,
      value: String(declared),
      basis: 'derived-count',
      anchors: sources
        .filter((s) => outcomeOf(s)?.kind === 'known')
        .map((s) => ({ path: s.path, ...(digestOf.get(s.path) === undefined ? {} : { contentDigest: digestOf.get(s.path) as string }) })),
    };
    const declarations = [derived, ...stated.filter((d) => d.fact === fact)];
    if (reasons.length > 0) {
      // A count over an Unknown denominator is itself Unknown, whatever a
      // summary states; every declaration is retained.
      facts.push({ fact, state: 'unknown', declarations, unknownReason: reasons[0] as string, rulesConsidered: [] });
      continue;
    }
    facts.push(reconcileFact(fact, declarations, reconcile, false));
  }

  // The nine derived catalog counts (`catalog-count:<catalog-key>`): one per
  // literal V1 catalog heading, anchored at that heading, counting the
  // catalog entries declared under it. The root summary's stated Staffers
  // and Butlers counts join their facts as further declarations.
  const catalogReasons = classes['catalog-entry'].denominator.kind === 'unknown' ? classes['catalog-entry'].denominator.reasons : [];
  for (const key of CATALOG_HEADINGS) {
    const fact = catalogCountFact(key);
    const derived: Declaration[] = [];
    for (const entry of input.sources) {
      if (entry.record.outcome !== 'classified' || entry.value === undefined || (entry.value.kind !== 'extracted' && entry.value.kind !== 'partial') || entry.value.catalogHeadings === undefined) continue;
      const heading = entry.value.catalogHeadings.find((h) => h.key === key);
      if (heading === undefined) continue;
      const digest = entry.record.contentDigest;
      derived.push({
        fact,
        value: String(entry.value.items.filter((i) => i.class === 'catalog-entry' && i.context === key).length),
        basis: 'derived-count',
        anchors: [{ path: entry.source.path, line: heading.line, ...(digest === undefined ? {} : { contentDigest: digest }) }],
      });
    }
    const declarations = [...derived, ...stated.filter((d) => d.fact === fact)];
    if (catalogReasons.length > 0) {
      facts.push({ fact, state: 'unknown', declarations, unknownReason: catalogReasons[0] as string, rulesConsidered: [] });
      continue;
    }
    if (declarations.length === 0) continue;
    facts.push(reconcileFact(fact, declarations, reconcile, false));
  }

  // The six project-account facts: each admitted `project-account-section`
  // item's statement, under the registry's `project-account:<key>` family.
  for (const key of PROJECT_ACCOUNT_KEYS) {
    const fact = projectAccountFact(key);
    const declarations: Declaration[] = admitted
      .filter((a) => a.item.class === 'project-account-section' && a.item.key === key)
      .map((a) => ({ fact, value: a.item.statement ?? a.item.key, basis: 'extracted-item', anchors: [a.anchor] }));
    if (declarations.length === 0) continue;
    facts.push(reconcileFact(fact, declarations, reconcile, true));
  }

  const contradictions = facts.filter((f) => f.state === 'contradicted');
  const rulesApplied = new Set(facts.flatMap((f) => (f.state === 'modeled' && f.disagreement !== undefined ? [f.disagreement.precedence.ruleId] : []))).size;
  const unenumeratedHeadings: SurfacedUnenumeratedHeading[] = [];
  for (const source of sources) {
    for (const heading of source.unenumeratedHeadings) unenumeratedHeadings.push({ ...heading, path: source.path, anchor: { path: source.path, line: heading.line, ...(digestOf.get(source.path) === undefined ? {} : { contentDigest: digestOf.get(source.path) as string }) } });
  }
  return {
    sources,
    unenumeratedHeadings,
    rootIndexRead,
    items,
    classes,
    facts,
    contradictions,
    precedence,
    rootSummary,
    counts: {
      sources: sources.length,
      sourcesWithKnownItemDenominator: sources.filter((s) => s.itemDenominator.kind === 'known').length,
      sourcesWithUnknownDenominator: sources.filter((s) => s.itemDenominator.kind === 'unknown').length,
      populationWithoutReadRootIndex,
      items: items.length,
      modeled: items.filter((i) => i.state === 'modeled').length,
      unknown: items.filter((i) => i.state === 'unknown').length,
      contradicted: items.filter((i) => i.state === 'contradicted').length,
      facts: facts.length,
      contradictedFacts: contradictions.length,
      rulesDeclared: rules.length,
      rulesApplied,
    },
  };
}
