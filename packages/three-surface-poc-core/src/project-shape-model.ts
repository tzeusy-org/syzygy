// Project-shape model — the composed PWB pipeline behind `PocModel.projectShape`
// (PWB 2.7; PWB-REQ-001…007, PWB-REQ-020).
//
// Composition, in order, every step already landed and separately proven:
//   P1 gate (`observeProjectShape`) → phase A observation
//   (`observeProjectShapeSources`) → exact object reader
//   (`createExactObjectReader`) → secret policy (`classifyManifestSources`)
//   → literal extraction (`extractSource`) → coverage and precedence
//   (`buildProjectShapeCoverage`).
//
// This module adds nothing to those judgments. It only (a) runs them in the
// lawful order — no Git command is issued unless the authority evaluation
// admits — and (b) stamps every emitted fact with the complete epistemic
// tuple PWB-REQ-007 requires, using cap1-core's closed vocabularies verbatim
// (three labels, six tiers, twelve Unknown reasons, four freshness states).
// No Butlers body text is stored: statements and contexts are the extracted
// facts; excluded sources carry hash-not-body provenance only.

import {
  FRESHNESS_STATES,
  RENDERING_TIERS,
  type EpistemicState,
  type FreshnessState,
  type RenderingTier,
  type UnknownReason,
} from '@syzygy/cap1-core';

import { discloseAuthority, type AuthorityDisclosure } from './authority-disclosure.js';
import {
  AUTHORITY_KINDS,
  type BodyReadAuthorityEvaluation,
  type Rfc316aContradiction,
} from './body-read-authority.js';
import {
  PWB_SECRET_POLICY,
  classifyPhaseASeed,
  classifyManifestSources,
  classificationCounts,
  compileDetectors,
  type ClassificationCounts,
  type ClassificationRecord,
  type Exclusion,
  type FixedUnknown,
  type SecretClassificationPolicy,
} from './content-classification.js';
import { createExactObjectReader } from './git-object-reader.js';
import {
  buildProjectShapeCoverage,
  type ClassCoverage,
  type DeclarationAnchor,
  type ItemCoverage,
  type PrecedenceDisclosure,
  type ReconciledFact,
  type RootSummaryDisclosure,
  type SourceCoverage,
  type SurfacedUnenumeratedHeading,
} from './project-shape-coverage.js';
import { PROJECT_ACCOUNT_KEYS, extractBaselineSpec, extractSource, type ProjectAccountKey, type SourceExtraction } from './project-shape-extraction.js';
import type { ExtractionClass, ManifestSource, PillarDiscovery, PillarKey, SourceRule } from './project-shape-manifest.js';
import {
  PWB_FAILURE_STATES,
  PWB_RESOURCE_LIMITS,
  observePhaseA,
  type DeterministicInputs,
  type EmissionStamp,
  type ObservationDegradation,
  type ObservationScope,
  type PWB_OBSERVER_IDENTITY,
} from './project-shape-observation.js';
import { observeProjectShape, type AdmissionFailureReason } from './project-shape-observer.js';
import type { GitRunner, PwbResourceLimits, ResourceLimitBreach } from './pwb-types.js';
import { createResourceLedger, type ResourceLedgerSummary } from './resource-ledger.js';
import { createTransientBodies } from './transient-bodies.js';

// The one consented repository identity (the consent record's scope anchor;
// `governance-inputs.ts` proves the expectation byte-equal).
export const PWB_REPOSITORY_ID = 'repository:butlers-configured-poc' as const;

// The POC has no challenge mechanism (RFC2-8 challenges are a deferred
// wave), so the only challenge state a claim can carry is closed at one.
export const CHALLENGE_STATES = ['unchallenged'] as const;
export type ChallengeState = (typeof CHALLENGE_STATES)[number];

// RFC2-24's resolution route per reason, one short phrase each, keyed by
// the closed twelve. `project-shape-model.test.ts` proves the key set equals
// cap1-core's `UNKNOWN_REASONS` exactly.
export type { UnknownReason };

export const UNKNOWN_REASON_ROUTES: Readonly<Record<UnknownReason, string>> = {
  'missing-declaration': 'First-pass drafting for owner sign-off',
  'missing-evidence': 'Produce or capture evidence',
  'no-currency-bound-declared': 'Declare the bound in quality policy',
  'stale-beyond-currency-bound': 'Capture fresh evidence via a new snapshot',
  'mapping-coverage-absent': 'Run or declare the mapping',
  'unconsented-source-or-provider': 'Record consent',
  'excluded-content': 'Policy change by the owner, or accept the exclusion',
  'contradicted-pending-adjudication': 'Owner adjudication',
  'challenge-suspended': 'Challenge resolution',
  // RFC2-24's literal, because POC-REQ-014's oracle reads this one route
  // from RFC2-24 (P-100); the other rows keep their short phrases. From
  // `RFC-0002/rendering-vocabularies.md:139`: "| 10 |
  // `source-uncaptured-or-unreachable` | ... | Repair the observer/source;
  // new snapshot |".
  'source-uncaptured-or-unreachable': 'Repair the observer/source; new snapshot',
  'reference-unresolvable': 'Repair the reference, owned by the governed project',
  'execution-blocked': 'Unblock or authorize the run, then capture in a new snapshot',
};

// ---------------------------------------------------------------------
// Claims (PWB-REQ-007).

export interface ProjectShapeSupport {
  readonly path: string;
  readonly line?: number;
  readonly contentDigest?: string;
  // Registry `git-tree-entry` identity of the source, when it is in the population.
  readonly sourceIdentity?: string;
}

// The machine form of a route (M4 slice 2, P-71): who acts, the closed
// verb, and the kind of thing acted on, beside the route sentence the page
// renders verbatim. One row per reason; the classification is this
// implementation's reading of each `UNKNOWN_REASON_ROUTES` sentence
// [Inferred], never a contract value.
const ROUTE_ACTORS = ['owner', 'operator', 'agent'] as const;
type RouteActor = (typeof ROUTE_ACTORS)[number];
const ROUTE_VERBS = ['draft', 'capture', 'declare', 'consent', 'decide', 'adjudicate', 'repair', 'run'] as const;
type RouteVerb = (typeof ROUTE_VERBS)[number];
const ROUTE_TARGETS = ['artifact', 'act', 'policy', 'evaluation', 'external-work'] as const;
type RouteTarget = (typeof ROUTE_TARGETS)[number];

const UNKNOWN_REASON_ACTIONS: Readonly<Record<UnknownReason, { readonly actor: RouteActor; readonly verb: RouteVerb; readonly target: RouteTarget }>> = {
  'missing-declaration': { actor: 'agent', verb: 'draft', target: 'artifact' },
  'missing-evidence': { actor: 'operator', verb: 'capture', target: 'evaluation' },
  'no-currency-bound-declared': { actor: 'owner', verb: 'declare', target: 'policy' },
  'stale-beyond-currency-bound': { actor: 'operator', verb: 'capture', target: 'evaluation' },
  'mapping-coverage-absent': { actor: 'owner', verb: 'declare', target: 'artifact' },
  'unconsented-source-or-provider': { actor: 'owner', verb: 'consent', target: 'act' },
  'excluded-content': { actor: 'owner', verb: 'decide', target: 'policy' },
  'contradicted-pending-adjudication': { actor: 'owner', verb: 'adjudicate', target: 'act' },
  'challenge-suspended': { actor: 'owner', verb: 'adjudicate', target: 'act' },
  'source-uncaptured-or-unreachable': { actor: 'operator', verb: 'repair', target: 'evaluation' },
  'reference-unresolvable': { actor: 'operator', verb: 'repair', target: 'external-work' },
  'execution-blocked': { actor: 'operator', verb: 'run', target: 'external-work' },
};

export interface ResolutionRoute {
  readonly reason: UnknownReason;
  // The rendered route sentence, verbatim from `UNKNOWN_REASON_ROUTES`.
  readonly route: string;
  readonly actor: RouteActor;
  readonly verb: RouteVerb;
  readonly target: RouteTarget;
}

/** At least one route: an Unknown that carries a reason never has none. */
export type ResolutionRoutes = readonly [ResolutionRoute, ...ResolutionRoute[]];

export function resolutionRoute(reason: UnknownReason): ResolutionRoute {
  return { reason, route: UNKNOWN_REASON_ROUTES[reason], ...UNKNOWN_REASON_ACTIONS[reason] };
}

export interface ProjectShapeClaim {
  // Stable semantic identity: the same subject keeps the same id across
  // evaluations; `evaluationId` is the instance.
  readonly claimId: string;
  readonly evaluationId: string;
  // cap1-core's tuple verbatim: label, tier, reasons (primary + secondary), freshness.
  readonly epistemic: EpistemicState;
  // One route per carried reason, RFC2-24 order preserved.
  readonly resolutionRoutes: readonly ResolutionRoute[];
  readonly challenge: ChallengeState;
  readonly support: readonly ProjectShapeSupport[];
}

export interface ReasonCounts {
  readonly primary: Readonly<Partial<Record<UnknownReason, number>>>;
  readonly secondary: Readonly<Partial<Record<UnknownReason, number>>>;
}

function routesFor(state: EpistemicState): readonly ResolutionRoute[] {
  if (state.label !== 'Unknown' || !('reasons' in state)) return [];
  const reasons = [state.reasons.primary, ...state.reasons.secondary];
  return reasons.map(resolutionRoute);
}

interface ClaimInput {
  readonly claimId: string;
  readonly evaluationId: string;
  readonly support: readonly ProjectShapeSupport[];
}

// Every project-shape claim is bound to the exact evaluated revision, so
// the evaluation itself is the currency: `fresh`. An immutable model never
// carries a claim from an earlier evaluation, which is what `superseded`
// would mean; no currency bound is involved (RFC2-9 bounds evidence
// currency, and these are declaration facts at one revision).
const FRESH: FreshnessState = FRESHNESS_STATES[0];
const REPORT_FACT: RenderingTier = RENDERING_TIERS[1];
const SUSPENDED: RenderingTier = RENDERING_TIERS[5];

function claim(input: ClaimInput, epistemic: EpistemicState): ProjectShapeClaim {
  return {
    claimId: input.claimId,
    evaluationId: input.evaluationId,
    epistemic,
    resolutionRoutes: routesFor(epistemic),
    challenge: 'unchallenged',
    support: input.support,
  };
}

// "The source declares X" is Observed as a fact about the source
// (RFC2-25 `report-fact`); X's satisfaction is not thereby claimed.
function observedClaim(input: ClaimInput): ProjectShapeClaim {
  return claim(input, { label: 'Observed', tier: REPORT_FACT, freshness: FRESH });
}

function unknownClaim(input: ClaimInput, primary: UnknownReason, secondary: readonly UnknownReason[] = [], tier?: RenderingTier): ProjectShapeClaim {
  return claim(input, {
    label: 'Unknown',
    reasons: { primary, secondary: secondary.filter((reason, index, all) => reason !== primary && all.indexOf(reason) === index) },
    ...(tier === undefined ? {} : { tier }),
    freshness: FRESH,
  });
}

// ---------------------------------------------------------------------
// The model.

export interface ProjectShapeIdentity {
  readonly repositoryId: string;
  readonly requestedRevision: string;
  readonly revision: string;
  readonly capturedAt: string;
  readonly sourceClaimedInstant: { readonly kind: 'git-committer-instant'; readonly instant: string };
  readonly scope: ObservationScope;
  readonly observer: typeof PWB_OBSERVER_IDENTITY;
  readonly policy: { readonly policyId: string; readonly policyVersion: string };
  readonly manifestIdentity: string;
  readonly manifestDigest: string;
  readonly observationDigest: string;
  readonly deterministicInputs: DeterministicInputs;
}

export interface ProjectShapeSource extends SourceCoverage {
  readonly identity: string;
  readonly stamp: EmissionStamp;
  readonly rule: SourceRule;
  readonly pillar?: PillarKey;
  readonly declaredBy?: string;
  readonly anchor: ManifestSource['anchor'];
  readonly claim: ProjectShapeClaim;
}

export interface ProjectShapeItem extends ItemCoverage {
  readonly claim: ProjectShapeClaim;
}

// An unenumerated heading surfaced as a fact (PWB-REQ-002 as amended): its
// text, level and exact anchor, the source it routes to, and an Unknown claim
// whose route says the grammar has no row for it. It mints no item.
interface ProjectShapeUnenumeratedHeading extends SurfacedUnenumeratedHeading {
  readonly sourceIdentity: string;
  readonly claim: ProjectShapeClaim;
}

export interface ProjectShapeClassAggregate extends ClassCoverage {
  // Aggregate disclosure (PWB-REQ-007): label, tier, freshness and separate
  // primary/secondary reason counts over the members — never a headline.
  readonly claim: ProjectShapeClaim;
  readonly reasonCounts: ReasonCounts;
}

export interface ProjectAccountStatement {
  readonly key: ProjectAccountKey;
  readonly statement?: string;
  readonly context?: string;
  readonly anchors: readonly DeclarationAnchor[];
  readonly claim: ProjectShapeClaim;
}

export interface ProjectShapeFact extends ProjectShapeClaimCarrier {
  readonly fact: ReconciledFact;
}

interface ProjectShapeClaimCarrier {
  readonly claim: ProjectShapeClaim;
}

export interface ProjectShapeCounts {
  readonly sources: number;
  readonly sourcesWithKnownItemDenominator: number;
  readonly sourcesWithUnknownDenominator: number;
  // The root index was not read and the population holds a source of a rule
  // that does not need it: the source-path population total says so.
  readonly populationWithoutReadRootIndex: boolean;
  readonly items: number;
  readonly modeled: number;
  readonly unknown: number;
  readonly contradicted: number;
  readonly facts: number;
  readonly contradictedFacts: number;
  readonly rulesDeclared: number;
  readonly rulesApplied: number;
  readonly exclusions: number;
  readonly classification: ClassificationCounts;
}

export type ProjectShape =
  | {
      readonly kind: 'not-evaluated';
      readonly authority: undefined;
      readonly detail: string;
      readonly claim: ProjectShapeClaim;
    }
  | {
      readonly kind: 'not-admitted';
      readonly authority: AuthorityDisclosure;
      readonly reason: AdmissionFailureReason;
      readonly secondaryReasons: readonly AdmissionFailureReason[];
      readonly contradiction: Rfc316aContradiction;
      readonly claim: ProjectShapeClaim;
    }
  | {
      readonly kind: 'observation-failed';
      readonly authority: AuthorityDisclosure;
      readonly failure: {
        readonly failureState: string | undefined;
        readonly degradationState: string | undefined;
        readonly reason: UnknownReason;
        readonly detail: string;
      };
      readonly claim: ProjectShapeClaim;
    }
  | {
      readonly kind: 'observed';
      readonly authority: AuthorityDisclosure;
      readonly identity: ProjectShapeIdentity;
      readonly sources: readonly ProjectShapeSource[];
      // Every heading no grammar row declares, surfaced beside the sources.
      readonly unenumeratedHeadings: readonly ProjectShapeUnenumeratedHeading[];
      // The root index's body was read (admitted and within limits).
      readonly rootIndexRead: boolean;
      readonly items: readonly ProjectShapeItem[];
      readonly classes: Readonly<Record<ExtractionClass, ProjectShapeClassAggregate>>;
      readonly facts: readonly ProjectShapeFact[];
      readonly contradictions: readonly ProjectShapeFact[];
      // The root index's own declarations, disclosed whether or not any
      // conflict needed them: the seven layer rules and the two stated
      // summary counts, or why each is absent.
      readonly precedence: PrecedenceDisclosure;
      readonly rootSummary: RootSummaryDisclosure;
      readonly exclusions: readonly Exclusion[];
      // Every breach of the one evaluation-wide envelope, both phases, in
      // order; `resourceUse` is the ledger's closing count.
      readonly limitBreaches: readonly ResourceLimitBreach[];
      readonly resourceUse: ResourceLedgerSummary;
      readonly degradation: ObservationDegradation | undefined;
      // Phase A's discovery outcome per pillar (PWB-RECON-02): the page and
      // the machine answer both say which home was found, which index was
      // read, and why a pillar is Unknown — never only the aggregate reason.
      readonly discovery: readonly PillarDiscovery[];
      readonly projectAccount: readonly ProjectAccountStatement[];
      readonly counts: ProjectShapeCounts;
      readonly claim: ProjectShapeClaim;
    };

interface ProjectShapeBuildInput {
  readonly authority: BodyReadAuthorityEvaluation;
  readonly revision: string;
  readonly capturedAt: string;
  readonly runGit: GitRunner;
  readonly repositoryId?: string;
  readonly policy?: SecretClassificationPolicy;
  // The registry envelope by default; tests narrow it to reach a breach.
  readonly resourceLimits?: PwbResourceLimits;
  // Precedence rules and stated summary counts come only from the admitted
  // root index (PWB-REQ-004 as amended); nothing is injected here.
}

const NOT_EVALUATED_ID = 'evaluation:not-evaluated' as const;

// The model was built without any body-read authority evaluation: nothing
// was read and the whole project shape is Unknown as unconsented.
export function unevaluatedProjectShape(detail: string): ProjectShape {
  return {
    kind: 'not-evaluated',
    authority: undefined,
    detail,
    claim: unknownClaim({ claimId: 'claim:project-shape', evaluationId: NOT_EVALUATED_ID, support: [] }, 'unconsented-source-or-provider'),
  };
}

function supportOf(anchors: readonly DeclarationAnchor[], identities: ReadonlyMap<string, string>): readonly ProjectShapeSupport[] {
  return anchors.map((anchor) => ({
    path: anchor.path,
    ...(anchor.line === undefined ? {} : { line: anchor.line }),
    ...(anchor.contentDigest === undefined ? {} : { contentDigest: anchor.contentDigest }),
    ...(identities.has(anchor.path) ? { sourceIdentity: identities.get(anchor.path) as string } : {}),
  }));
}

function recordDigest(record: ClassificationRecord): string | undefined {
  if (record.outcome === 'classified') return record.contentDigest;
  if (record.outcome === 'excluded') return record.exclusion.contentDigest;
  return undefined;
}

function sourceClaim(coverage: SourceCoverage, identity: string, evaluationId: string): ProjectShapeClaim {
  const digest = recordDigest(coverage.record);
  const support: ProjectShapeSupport[] = [{ path: coverage.path, sourceIdentity: identity, ...(digest === undefined ? {} : { contentDigest: digest }) }];
  const input = { claimId: `claim:source:${coverage.path}`, evaluationId, support };
  if (coverage.itemDenominator.kind === 'known') return observedClaim(input);
  return unknownClaim(input, coverage.itemDenominator.unknown.unknownReason);
}

// Exported for its own test: coverage's item contract admits three states,
// only two of which the P2.5 grammar can produce.
export function itemClaim(item: ItemCoverage, identities: ReadonlyMap<string, string>, evaluationId: string): ProjectShapeClaim {
  const input = { claimId: `claim:item:${item.class}:${item.key}`, evaluationId, support: supportOf(item.anchors, identities) };
  if (item.state === 'modeled') return observedClaim(input);
  if (item.state === 'contradicted') return unknownClaim(input, 'contradicted-pending-adjudication', [], SUSPENDED);
  return unknownClaim(input, item.unknownReason ?? PWB_FAILURE_STATES.sourceMissingOrUnreadable.unknownReason);
}

function factClaim(fact: ReconciledFact, identities: ReadonlyMap<string, string>, evaluationId: string): ProjectShapeClaim {
  const anchors = fact.declarations.flatMap((declaration) => declaration.anchors);
  const input = { claimId: `claim:fact:${fact.fact}`, evaluationId, support: supportOf(anchors, identities) };
  if (fact.state === 'modeled') return observedClaim(input);
  if (fact.state === 'contradicted') return unknownClaim(input, fact.unknownReason, [], SUSPENDED);
  return unknownClaim(input, fact.unknownReason);
}

export function countReasons(claims: readonly ProjectShapeClaim[]): ReasonCounts {
  const primary: Partial<Record<UnknownReason, number>> = {};
  const secondary: Partial<Record<UnknownReason, number>> = {};
  for (const member of claims) {
    const state = member.epistemic;
    if (state.label !== 'Unknown' || !('reasons' in state)) continue;
    primary[state.reasons.primary] = (primary[state.reasons.primary] ?? 0) + 1;
    for (const reason of state.reasons.secondary) secondary[reason] = (secondary[reason] ?? 0) + 1;
  }
  return { primary, secondary };
}

function classAggregate(coverage: ClassCoverage, members: readonly ProjectShapeItem[], sources: readonly ProjectShapeSource[], evaluationId: string): ProjectShapeClassAggregate {
  const classSources = sources.filter((source) => source.extractionClasses.includes(coverage.class));
  const input = { claimId: `claim:class:${coverage.class}`, evaluationId, support: classSources.flatMap((source) => source.claim.support) };
  let aggregate: ProjectShapeClaim;
  if (coverage.denominator.kind === 'unknown') {
    const [primary, ...secondary] = coverage.denominator.reasons;
    aggregate = unknownClaim(input, primary ?? PWB_FAILURE_STATES.sourceMissingOrUnreadable.unknownReason, secondary);
  } else if (coverage.contradicted > 0) {
    aggregate = unknownClaim(input, 'contradicted-pending-adjudication', [], SUSPENDED);
  } else {
    aggregate = observedClaim(input);
  }
  // Reason counts over the class's members and its declaring sources: an
  // excluded or uncaptured source declares nothing, so its reason would
  // otherwise vanish from the aggregate.
  const discoveryClaims = Array.from({ length: coverage.discoveryUnknown }, () => aggregate);
  // A source in which this class read adds nothing; one in which it is
  // Unknown adds that class's own reason, not the source's.
  const sourceClaims = classSources.flatMap((source) => {
    const denominator = source.classOutcomes.find((outcome) => outcome.class === coverage.class)?.denominator;
    return denominator === undefined || denominator.kind === 'known'
      ? []
      : [unknownClaim({ claimId: source.claim.claimId, evaluationId, support: source.claim.support }, denominator.unknownReason)];
  });
  return { ...coverage, claim: aggregate, reasonCounts: countReasons([...members.map((entry) => entry.claim), ...sourceClaims, ...discoveryClaims]) };
}

function projectAccountOf(items: readonly ProjectShapeItem[], sources: readonly ProjectShapeSource[], classes: Readonly<Record<ExtractionClass, ProjectShapeClassAggregate>>, evaluationId: string): readonly ProjectAccountStatement[] {
  const accountSources = sources.filter((source) => source.extractionClasses.includes('project-account-section'));
  return PROJECT_ACCOUNT_KEYS.map((key) => {
    const item = items.find((candidate) => candidate.class === 'project-account-section' && candidate.key === key);
    if (item !== undefined) {
      return {
        key,
        ...(item.statement === undefined ? {} : { statement: item.statement }),
        ...(item.context === undefined ? {} : { context: item.context }),
        anchors: item.anchors,
        claim: { ...item.claim, claimId: `claim:project-account:${key}` },
      };
    }
    // No admitted source declared this section: the statement is Unknown
    // with the first Unknown source's reason, or `missing-declaration`
    // when every account source was read and simply lacks it.
    const classDenominator = (source: ProjectShapeSource) => source.classOutcomes.find((outcome) => outcome.class === 'project-account-section')?.denominator;
    const unknownSource = accountSources.find((source) => classDenominator(source)?.kind === 'unknown');
    const unknownDenominator = unknownSource === undefined ? undefined : classDenominator(unknownSource);
    const accountDenominator = classes['project-account-section'].denominator;
    const reason: UnknownReason =
      unknownDenominator !== undefined && unknownDenominator.kind === 'unknown'
        ? unknownDenominator.unknownReason
        : accountDenominator.kind === 'unknown'
          ? accountDenominator.reasons[0] ?? PWB_FAILURE_STATES.sourceMissingOrUnreadable.unknownReason
          : 'missing-declaration';
    return {
      key,
      anchors: [],
      claim: unknownClaim({ claimId: `claim:project-account:${key}`, evaluationId, support: accountSources.flatMap((source) => source.claim.support) }, reason),
    };
  });
}

function observationFailed(authority: BodyReadAuthorityEvaluation, failure: Extract<ProjectShape, { kind: 'observation-failed' }>['failure']): ProjectShape {
  return {
    kind: 'observation-failed',
    authority: discloseAuthority(authority),
    failure,
    claim: unknownClaim({ claimId: 'claim:project-shape', evaluationId: authority.evaluationId, support: [] }, failure.reason),
  };
}

export function buildProjectShape(input: ProjectShapeBuildInput): ProjectShape {
  const repositoryId = input.repositoryId ?? PWB_REPOSITORY_ID;
  const policy = input.policy ?? PWB_SECRET_POLICY;
  const phaseADetectors = compileDetectors(policy);
  const gated = observeProjectShape({
    authority: input.authority,
    read: ({ authority }) => {
      // One evaluation-wide resource envelope (registry
      // `resourceLimitSemantics`, PWB-REQ-006 as amended): phase A and
      // phase B share the byte counter, the parse-pass counters and the
      // breach list; nothing resets between phases.
      const ledger = createResourceLedger(input.resourceLimits ?? PWB_RESOURCE_LIMITS);
      // The validated phase-A seed bodies phase B reuses instead of reading.
      const bodies = createTransientBodies();
      // Phase A: revision, tree, source population, seeds (P2.1/P2.2).
      const { result: observation, tree } = observePhaseA({
        repositoryId,
        revision: input.revision,
        capturedAt: input.capturedAt,
        runGit: input.runGit,
        authority,
        classifyPhaseA: (text, charge) => classifyPhaseASeed(phaseADetectors, text, charge),
        ledger,
        bodies,
      });
      if (observation.kind === 'invalid-input') {
        return observationFailed(authority, {
          failureState: undefined,
          degradationState: undefined,
          reason: PWB_FAILURE_STATES.gitCaptureFailed.unknownReason,
          detail: observation.reason,
        });
      }
      if (observation.kind === 'unknown') {
        return observationFailed(authority, {
          failureState: observation.failureState,
          degradationState: observation.degradationState,
          reason: observation.reason,
          detail: observation.detail,
        });
      }
      // Phase B: the exact tree phase A listed at the resolved commit bounds
      // every read; it is listed once per evaluation (syzygy-bpyt.6.5).
      if (tree === undefined) throw new Error('an observed phase A always carries the tree it listed');
      const reader = createExactObjectReader({ runGit: input.runGit, tree, ledger, bodies });
      // Policy before admission (P2.4), literal grammar (P2.5) on the transient body.
      const population = classifyManifestSources<SourceExtraction>(
        observation.manifest,
        reader,
        (source, text) => extractSource(source, text, ledger.chargeFor(source.path)),
        policy,
        (source) => {
          if (source.rule !== 'baseline-spec-tree') return { kind: 'body' };
          const extracted = extractBaselineSpec(source.path);
          const value: SourceExtraction = extracted.kind === 'items'
            ? { kind: 'extracted', path: source.path, classes: source.extractionClasses, items: extracted.items, denominators: { 'baseline-spec': extracted.items.length } }
            : { kind: 'unknown', path: source.path, classes: source.extractionClasses, failure: extracted.failure, failures: [extracted.failure] };
          return { kind: 'derived', value };
        },
        ledger,
      );
      // Phase B has read: the phase-A bodies the ledger held are dropped.
      bodies.release();
      const discoveryUnknown: FixedUnknown = {
        failureState: 'sourceMissingOrUnreadable',
        degradationState: PWB_FAILURE_STATES.sourceMissingOrUnreadable.degradationState,
        unknownReason: PWB_FAILURE_STATES.sourceMissingOrUnreadable.unknownReason,
      };
      const classesForPillar: Readonly<Record<PillarKey, readonly ExtractionClass[]>> = {
        'heart-and-soul': ['project-account-section', 'principle', 'success-criterion', 'catalog-entry'],
        'legends-and-lore': ['design-contract'],
        // Baseline-spec identity is owned by the independent exact-tree rule,
        // not by an optional openspec/README.md body.
        'spec-and-spine': [],
        'lay-and-land': ['topology-component'],
        'craft-and-care': ['craft-policy'],
      };
      const uncoveredDiscovery = observation.manifest.pillars.filter(
        (pillar) => pillar.state === 'unknown' && !observation.manifest.sources.some(
          (source) => source.pillar === pillar.key && source.extractionClasses.some((cls) => classesForPillar[pillar.key].includes(cls)),
        ),
      );
      // Coverage and precedence (P2.6).
      const coverage = buildProjectShapeCoverage({
        sources: population.results,
        policy,
        discoveryUncertainties: uncoveredDiscovery
          .map((pillar) => ({ classes: classesForPillar[pillar.key], unknown: discoveryUnknown })),
      });

      const evaluationId = authority.evaluationId;
      const identities = new Map(observation.sources.map((source) => [source.path, source.identity]));
      const stamped = new Map(observation.sources.map((source) => [source.path, source]));
      const sources: ProjectShapeSource[] = coverage.sources.map((source) => {
        const origin = stamped.get(source.path);
        if (origin === undefined) throw new Error(`coverage names ${source.path}, which the observation did not stamp`);
        return {
          ...source,
          identity: origin.identity,
          stamp: origin.stamp,
          rule: origin.rule,
          ...(origin.pillar === undefined ? {} : { pillar: origin.pillar }),
          ...(origin.declaredBy === undefined ? {} : { declaredBy: origin.declaredBy }),
          anchor: origin.anchor,
          claim: sourceClaim(source, origin.identity, evaluationId),
        };
      });
      const items: ProjectShapeItem[] = coverage.items.map((item) => ({ ...item, claim: itemClaim(item, identities, evaluationId) }));
      const classes = Object.fromEntries(
        Object.entries(coverage.classes).map(([cls, classCoverage]) => [
          cls,
          classAggregate(classCoverage, items.filter((item) => item.class === cls), sources, evaluationId),
        ]),
      ) as Record<ExtractionClass, ProjectShapeClassAggregate>;
      const unenumeratedHeadings: ProjectShapeUnenumeratedHeading[] = coverage.unenumeratedHeadings.map((heading) => {
        const sourceIdentity = identities.get(heading.path) as string;
        return {
          ...heading,
          sourceIdentity,
          claim: unknownClaim(
            { claimId: `claim:unenumerated-heading:${heading.path}:${heading.line}`, evaluationId, support: supportOf([heading.anchor], identities) },
            'missing-declaration',
          ),
        };
      });
      const facts: ProjectShapeFact[] = coverage.facts.map((fact) => ({ fact, claim: factClaim(fact, identities, evaluationId) }));
      const contradictions = facts.filter((entry) => entry.fact.state === 'contradicted');
      const projectAccount = projectAccountOf(items, sources, classes, evaluationId);
      const finalRecords = coverage.sources.map((source) => source.record);
      const finalExclusions = finalRecords.flatMap((record) => record.outcome === 'excluded' ? [record.exclusion] : []);
      const finalClassification = classificationCounts(finalRecords);

      // The whole-shape claim derives from its members: Observed only when
      // no source and no reconciled fact is Unknown (every item is a fact,
      // and the count facts carry the reachable contradictions); otherwise
      // the first Unknown member's reason is primary and every other member
      // reason is secondary (PWB-REQ-007: exactly one primary). Observer
      // degradation is disclosed as data beside it; the population never
      // shrinks, so every degraded source is itself an Unknown member.
      const discoveryReasons = uncoveredDiscovery.length > 0
        ? [PWB_FAILURE_STATES.sourceMissingOrUnreadable.unknownReason]
        : [];
      const memberReasons = [
        ...discoveryReasons,
        ...[...sources, ...facts].flatMap((entry) => ('reasons' in entry.claim.epistemic ? [entry.claim.epistemic.reasons.primary] : [])),
      ];
      const shapeInput = { claimId: 'claim:project-shape', evaluationId, support: sources.flatMap((source) => source.claim.support) };
      const [firstReason, ...otherReasons] = memberReasons;
      const shapeClaim: ProjectShapeClaim = firstReason === undefined ? observedClaim(shapeInput) : unknownClaim(shapeInput, firstReason, otherReasons);

      const shape: ProjectShape = {
        kind: 'observed',
        authority: discloseAuthority(authority),
        identity: {
          repositoryId,
          requestedRevision: observation.requestedRevision,
          revision: observation.revision,
          capturedAt: observation.capturedAt,
          sourceClaimedInstant: observation.sourceClaimedInstant,
          scope: observation.scope,
          observer: observation.observer,
          policy: { policyId: population.policyId, policyVersion: population.policyVersion },
          manifestIdentity: observation.manifestIdentity,
          manifestDigest: observation.manifest.digest,
          observationDigest: observation.observationDigest,
          deterministicInputs: observation.deterministicInputs,
        },
        sources,
        unenumeratedHeadings,
        rootIndexRead: coverage.rootIndexRead,
        items,
        classes,
        facts,
        contradictions,
        precedence: coverage.precedence,
        rootSummary: coverage.rootSummary,
        exclusions: finalExclusions,
        limitBreaches: [...ledger.breaches],
        resourceUse: ledger.summary(),
        degradation: observation.degradation,
        discovery: observation.manifest.pillars,
        projectAccount,
        counts: { ...coverage.counts, exclusions: finalExclusions.length, classification: finalClassification },
        claim: shapeClaim,
      };
      return shape;
    },
  });
  if (gated.kind === 'admitted') return gated.result;
  return {
    kind: 'not-admitted',
    authority: discloseAuthority(gated.authority),
    reason: gated.reason,
    secondaryReasons: gated.secondaryReasons,
    contradiction: gated.contradiction,
    claim: unknownClaim(
      { claimId: 'claim:project-shape', evaluationId: gated.authority.evaluationId, support: [] },
      gated.reason,
      gated.secondaryReasons,
    ),
  };
}

// Owner-act provenance for a disclosed authority triple — the plan's
// `owner-act` provenance kind, one entry per authority in `AUTHORITY_KINDS` order.
// Test seam: no production code calls it; project-shape-model.test.ts pins the
// provenance entries through it.
export function ownerActProvenance(authority: AuthorityDisclosure): readonly { readonly kind: 'owner-act'; readonly source: string; readonly revision: string; readonly digest?: string }[] {
  return AUTHORITY_KINDS.map((kind) => {
    const state = authority.authorities.find((entry) => entry.authority === kind);
    if (state === undefined) throw new Error(`authority disclosure lacks ${kind}`);
    return {
      kind: 'owner-act',
      source: state.actIdentity ?? `${kind}: ${state.state}`,
      revision: state.state,
      ...(state.artifactDigest === undefined ? {} : { digest: state.artifactDigest }),
    };
  });
}
