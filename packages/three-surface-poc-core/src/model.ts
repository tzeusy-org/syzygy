import type { CodeStructureResult } from './code-structure.js';
import { GOVERNING_INTENT_UNKNOWN_BASIS, governingIntentDisclosure, workItemTitlesDisclosure, type WorkItemsResult } from './work-items.js';
import type { WorkerChangeResult } from './worker-change-observation.js';
import type { OrreryProjection } from './orrery-projection.js';
import type { TrajectoryProjection } from './trajectory-projection.js';
import type { DispatchDisclosure, MaterializationRecord } from './materialization.js';
import type { BodyReadAuthorityEvaluation } from './body-read-authority.js';
import type { GitRunner, PwbResourceLimits } from './pwb-types.js';
import type { UnknownReason } from '@syzygy/cap1-core';
import { PRODUCER_UNKNOWN_REASONS, unknown, type PocEpistemic, type PocUnknown } from './epistemic.js';
import { deepFreeze } from '@syzygy/support';

import type { ProjectShape } from './project-shape-model.js';
import type { ProposedWork } from './proposed-work.js';
import {
  walkthroughAcceptance,
  type AcceptanceSliceBuilder,
  type WalkthroughJudgmentPresentation,
  type WalkthroughReadinessPresentation,
} from './acceptance/walkthrough-acceptance.js';
import type { TestArtifactRecord, TestArtifactVerificationResult } from './test-artifact-verification.js';
import type { ResourceHeadroom } from './resource-headroom.js';
import type { PocSeedInput } from './poc-seeds.js';
import { buildResponseIdentity, responseIdentityMetadata, type ResponseIdentity } from './response-identity.js';
import {
  buildGraphSlice,
  buildOrrerySlice,
  buildProjectSlice,
  buildTrajectorySlice,
  observeSeeds,
  snapshotLabelFor,
  zeroDriftEvidence,
} from './model-slices.js';
import { validateSeedGraph } from './seed-graph.js';

export type { PocActionRoute, PocEpistemic, PocUnknown } from './epistemic.js';
export { PocObservationError } from './poc-observation-error.js';
export {
  walkthroughAcceptance,
  type AcceptanceSlice,
  type AcceptanceSliceBuilder,
  type WalkthroughAcceptanceInput,
  type WalkthroughJudgmentInputsFor,
  type WalkthroughJudgmentPresentation,
  type WalkthroughReadinessPresentation,
} from './acceptance/walkthrough-acceptance.js';

/** An Unknown the surfaces disclose that is neither an entity, a
 * relationship nor a project-shape claim — a region, a lifecycle, a
 * verification or the materialization action — so every rendered route
 * has its machine twin under the same id. */
export interface PocUnknownSubject {
  readonly id: string;
  readonly epistemic: PocUnknown;
}

export interface PocProvenance {
  readonly kind:
    | 'repository-file'
    | 'git-revision'
    | 'dolt-revision'
    | 'manual-mapping'
    | 'materialization-record'
    | 'test-artifact-record'
    | 'project-shape-source'
    | 'owner-act';
  readonly source: string;
  readonly revision: string;
  readonly digest?: string | undefined;
}

export interface PocEntity {
  readonly id: string;
  readonly kind:
    | 'project'
    | 'capability'
    | 'intent'
    | 'work-item'
    | 'code-region'
    | 'test-definition'
    | 'test-evidence'
    | 'runtime'
    | 'unknown-region';
  readonly title: string;
  readonly detail: string;
  readonly epistemic: PocEpistemic;
  readonly provenance: readonly PocProvenance[];
}

export interface PocRelationship {
  readonly id: string;
  readonly kind: string;
  readonly from: string;
  readonly to: string;
  readonly statement: string;
  readonly epistemic: PocEpistemic;
  readonly provenance: readonly PocProvenance[];
}

export interface PocSurface {
  readonly id: 'polaris' | 'trajectory' | 'orrery';
  /** Doctrine plane, distinct from an entity's epistemic label or work status. */
  readonly state: 'desired' | 'execution' | 'observed';
  readonly title: string;
  readonly question: string;
  readonly entityIds: readonly string[];
  readonly relationshipIds: readonly string[];
}

/** The second, explicitly identified evaluation that compares the pinned
 * repository revision with the current head. It is a disclosure about this
 * render, never a project-shape claim or a freshness value. */
interface CurrencyProbe {
  readonly claimId: 'claim:currency-probe';
  readonly evaluationId: string;
  readonly evaluationInstant: string;
  readonly epistemic: {
    readonly label: 'Observed';
    readonly tier: 'report-fact';
    readonly challenge: 'unchallenged';
  };
  readonly pinnedRevision: string;
  readonly currentRevision: string;
  readonly changedSources: number;
  readonly addedSources: number;
}

/** Additive machine evidence block. `currencyBounds` stays empty until the
 * separately gated owner-act slice 5; no assessCurrency call belongs here. */
export interface PocEvaluationEvidence {
  readonly pinnedRevision: string;
  readonly pinnedCommitterInstant: string | null;
  readonly observationInstant: string;
  readonly probe: CurrencyProbe;
  readonly currencyBounds: readonly [];
}

export interface PocModel {
  readonly schema: 'syzygy-three-surface-poc/v1';
  readonly evaluation: {
    /** Human-oriented composite identity,
     * `<snapshotLabel>|inputs:sha256:<inputsDigest>`. Machine consumers
     * should read `snapshotLabel` and `inputsDigest` directly instead of
     * splitting this string. */
    readonly snapshot: string;
    /** The evaluation's human label, without the input-digest suffix. */
    readonly snapshotLabel: string;
    /** SHA-256 hex digest of the canonical observation inputs. */
    readonly inputsDigest: string;
    readonly asOf: string;
    readonly evidence: PocEvaluationEvidence;
  };
  readonly project: {
    readonly name: string;
    readonly root: string;
    readonly revision: string;
  };
  readonly observerRevision: string;
  /** The seed-supplied governing intent for the worker-change evidence seam.
   * Null means that this evaluation supplied no usable identity; renderers
   * must keep verification Unknown rather than borrowing a proving-case ID. */
  readonly governingIntentId: string | null;
  readonly capabilityId: string;
  readonly entities: readonly PocEntity[];
  readonly relationships: readonly PocRelationship[];
  readonly surfaces: readonly PocSurface[];
  readonly codeStructure: CodeStructureResult;
  readonly workItems: WorkItemsResult;
  readonly workerChange: WorkerChangeResult;
  readonly testArtifactVerification: TestArtifactVerificationResult;
  readonly orrery: OrreryProjection;
  readonly trajectory: TrajectoryProjection;
  /** The confirmed materialized Bead id, or null when nothing has been
   * materialized (or the record could not be confirmed against the
   * live-observed work items). The typed source for renderers — never
   * re-derived from human-readable entity text. */
  readonly materializedBeadId: string | null;
  /** Every surface Unknown that is not an entity, relationship or
   * project-shape claim, by the id its disclosure renders under (M4
   * slice 1): the human route and its machine twin share that id. */
  readonly unknownSubjects: readonly PocUnknownSubject[];
  /** The project-wide Butlers shape (PWB): body-read authority disclosure,
   * revision-bound source population, items, coverage, contradictions and
   * the project account, every fact with its complete epistemic tuple.
   * `not-evaluated` when the builder was given no authority evaluation —
   * nothing is read then. */
  readonly projectShape: ProjectShape;
  /** The resource ledger's headroom against all seven declared limits and
   * its cost record (pursuit N3, syzygy-u05.3): one tuple per id, Unknown
   * with its reason when no ledger ran. */
  readonly resourceHeadroom: ResourceHeadroom;
  /** PWB-REQ-013: the one followed OpenSpec change as a distinct type, with its lifecycle and the current authority it would amend. */
  readonly proposedWork: ProposedWork;
  /** The exact materialization packet and its observed dispatch state, or
   * null when this evaluation has no supported seed-backed work graph. */
  readonly dispatch: DispatchDisclosure | null;
  /** PWB-REQ-021/022: the owner's cold-open walkthrough judgment as the
   * PWB-REQ-022 evaluator carried it — lawful (state (1) or (2), verdict
   * carried), unlawful (no verdict), absent (no pair) — or `not-evaluated`
   * when the builder was given no run-record/judgment pair. Never a score,
   * never evidence of success. */
  readonly walkthroughJudgment: WalkthroughJudgmentPresentation;
  /** PWB-REQ-021 (as amended 2026-09-05): whether the retained walkthrough
   * record is a ready answer population against this evaluation — the nine
   * identities, resolved anchors, same surface and evaluation, Polaris-only
   * traversal, no PWB-REQ-006 breach, resolvable cited authority. An
   * execution fact only: never a verdict, never a score, and independent
   * of the PWB-REQ-022 outcome. `not-evaluated` when the builder was given
   * no run record or no traversal predicate. */
  readonly walkthroughReadiness: WalkthroughReadinessPresentation;
  /** Routes in the selected machine response, projected from the daemon's
   * registered POC routes at serve time. Absent on an unserved model. */
  readonly links?: readonly {
    readonly path: string;
    readonly method: 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE';
    readonly credentialClass: 'human-open' | 'machine-credentialed';
    readonly self: boolean;
  }[];
  /** A canonical body identity with declared capture-instant exclusions. */
  readonly responseIdentity: ResponseIdentity;
}

/** The lawful inputs of the project-shape pipeline: the PWB-REQ-005
 * evaluation the daemon performed against Syzygy's governance tree, plus
 * an injectable byte-level Git runner for hermetic tests. No Git command
 * is issued unless the evaluation admits. */
export interface ProjectShapeModelInput {
  readonly authority: BodyReadAuthorityEvaluation;
  readonly runGit?: GitRunner;
  readonly repositoryId?: string;
  /** The PWB-REQ-006 envelope; absent → the registry's `PWB_RESOURCE_LIMITS`. */
  readonly resourceLimits?: PwbResourceLimits;
}


export interface BuildPocModelInput {
  readonly repoRoot: string;
  readonly repositoryRevision: string;
  readonly observerRevision: string;
  readonly evaluation: { readonly snapshot: string; readonly asOf: string };
  /** Additive evidence disclosure; absent callers receive a deterministic
   * zero-drift probe for their pinned evaluation. */
  readonly evidence?: PocEvaluationEvidence;
  /** The implementation-plane seeds: the graph, artifacts and mappings
   * every surface is observed through. */
  readonly seeds: PocSeedInput;
  /** Replaces the code-structure and worker-change observers' git runner: it returns git's stdout decoded as strict UTF-8, or throws,
   * since a replacing decoder would record a lossy path as Observed (syzygy-bpyt.6.1). */
  readonly runGit?: (repoRoot: string, args: readonly string[]) => string;
  readonly runWorkItemQuery?: (repoRoot: string, sql: string) => string;
  readonly materializationRecord?: MaterializationRecord | null;
  readonly testArtifactRecord?: TestArtifactRecord | null;
  /** Absent → `projectShape.kind === 'not-evaluated'` (no read); the
   * optional detail says why no evaluation was supplied. */
  readonly projectShape?: ProjectShapeModelInput | undefined;
  readonly projectShapeDetail?: string;
  /** The acceptance slice, composed at the app edge (`walkthroughAcceptance`
   * in `acceptance/walkthrough-acceptance.ts`): it receives the built
   * project shape and fills `walkthroughJudgment` and
   * `walkthroughReadiness`. Absent → both `not-evaluated`. */
  readonly acceptance?: AcceptanceSliceBuilder | undefined;
}

/** Exported for the renderers: the work-item verification Unknown every
 * Trajectory card discloses, and the worker-change verification beside it. */
const WORK_ITEM_VERIFICATION_BASIS =
  'Activity is not verification: no test evidence has been ingested for this item.';

export function workItemVerificationId(itemId: string): string {
  return `work-item:${itemId}/verification`;
}

/** POC-REQ-014: the governing-intent disclosure on a rendered card, and the
 * Trajectory region that counts the served items carrying it. */
export function workItemGoverningIntentId(itemId: string): string {
  return `work-item:${itemId}/governed-by`;
}

export const WORK_ITEM_GOVERNING_INTENT_REGION_ID = 'region:work-item-governing-intent' as const;

/** SEC-5: the one disclosure every rendered card's withheld title, and the
 * board's notice, render under. One id, since one policy gap withholds
 * every title. */
export const WORK_ITEM_TITLES_REGION_ID = 'region:work-item-titles' as const;

export function workerChangeVerificationId(beadId: string): string {
  return `worker-change:${beadId}/verification`;
}

interface UnknownSubjectInputs {
  readonly codeStructure: CodeStructureResult;
  readonly workItems: WorkItemsResult;
  readonly orrery: OrreryProjection;
  readonly trajectory: TrajectoryProjection;
  readonly workerChange: WorkerChangeResult;
  readonly testArtifactVerification: TestArtifactVerificationResult;
  readonly governingIntentId: string | null;
  /** Null when no seed set evaluated proposed work: no surface renders it. */
  readonly proposedWork: ProposedWork | null;
  readonly dispatch: DispatchDisclosure | null;
}

/** One entry per non-claim Unknown some surface renders, existing exactly
 * when that disclosure renders. Each closed reason is the one its producer
 * establishes: carried on the typed result where the serialized shape has
 * it (`lifecycle.closedReason`, `governedBy`, `titles`), and otherwise read
 * from `PRODUCER_UNKNOWN_REASONS`. */
function deriveUnknownSubjects(input: UnknownSubjectInputs): readonly PocUnknownSubject[] {
  const subjects: PocUnknownSubject[] = [];
  const add = (id: string, basis: string, reason: UnknownReason): void => {
    subjects.push({ id, epistemic: unknown(reason, basis) });
  };
  const code = input.codeStructure.kind === 'unknown' ? input.codeStructure : input.orrery.kind === 'unknown' ? input.orrery : null;
  if (code !== null) add('region:code-structure', code.reason, PRODUCER_UNKNOWN_REASONS.codeStructure);
  const work = input.workItems.kind === 'unknown' ? input.workItems : input.trajectory.kind === 'unknown' ? input.trajectory : null;
  if (work !== null) add('region:work-items', work.reason, PRODUCER_UNKNOWN_REASONS.workItems);
  const lifecycle = input.proposedWork?.lifecycle;
  if (input.proposedWork !== null && lifecycle?.kind === 'unknown') add(`${input.proposedWork.id}/lifecycle`, lifecycle.reason, lifecycle.closedReason);
  if (input.trajectory.kind === 'observed') {
    for (const item of input.trajectory.rendered) add(workItemVerificationId(item.id), WORK_ITEM_VERIFICATION_BASIS, 'missing-evidence');
    if (input.workItems.kind === 'observed') {
      // POC-REQ-014: the machine twin of each rendered card's mark is that
      // item's own `governedBy` with its basis sentence, and the count
      // region's is the same Unknown.
      const served = new Map(input.workItems.items.map((item) => [item.id, item.governedBy]));
      for (const item of input.trajectory.rendered) {
        const governedBy = served.get(item.id);
        if (governedBy !== undefined) subjects.push({ id: workItemGoverningIntentId(item.id), epistemic: governingIntentDisclosure(governedBy) });
      }
      add(WORK_ITEM_GOVERNING_INTENT_REGION_ID, GOVERNING_INTENT_UNKNOWN_BASIS, 'source-uncaptured-or-unreachable');
      // SEC-5: the machine twin of the board's withheld-title disclosure is
      // the observation's own `titles` with its basis sentence.
      subjects.push({ id: WORK_ITEM_TITLES_REGION_ID, epistemic: workItemTitlesDisclosure(input.workItems.titles) });
    }
    const change = input.workerChange;
    if (change.kind === 'observed' && input.trajectory.rendered.some((item) => item.id === change.beadId)) {
      const verification = input.testArtifactVerification;
      if (verification.kind === 'unknown') add(workerChangeVerificationId(change.beadId), verification.reason, PRODUCER_UNKNOWN_REASONS.testArtifact);
      else if (verification.kind === 'reported' && input.governingIntentId !== null) {
        // RFC5-19: an operator-reported run caps at report-fact, so the
        // verification relationship stays Unknown with its disclosure. The
        // evidence is present but not believed: what would make it count is
        // a run Syzygy launches under an approved execution profile, and
        // without one that run does not launch, which RFC5-18 names
        // `execution-blocked` (RFC2-24 #12), not `missing-evidence`.
        add(workerChangeVerificationId(change.beadId), verification.disclosure, 'execution-blocked');
      } else if (input.governingIntentId === null) {
        add(workerChangeVerificationId(change.beadId), 'The captured test artifact has no governing intent identity in this evaluation.', 'reference-unresolvable');
      }
    }
  }
  if (input.dispatch === null) {
    add('materialization', 'No seed-backed proposed-work graph was evaluated for this model, so the human-triggered materialization action is disabled.', 'source-uncaptured-or-unreachable');
  }
  return subjects;
}

/** Composes the slice builders into the one shared PocModel every surface
 * reads (never one store per surface), then derives the cross-slice
 * Unknowns and the response identity over the whole. */
export function buildPocModel(input: BuildPocModelInput): PocModel {
  validateSeedGraph(input.seeds);
  const seed = observeSeeds(input);
  const orrery = buildOrrerySlice(input, seed);
  const trajectory = buildTrajectorySlice(input, seed);
  const project = buildProjectSlice(input, seed, orrery.codeStructure);
  const graph = buildGraphSlice(input.seeds, seed, trajectory.materialization);
  const acceptance = (input.acceptance ?? walkthroughAcceptance())(project.projectShape);
  const snapshotLabel = snapshotLabelFor(input.evaluation.snapshot, input.seeds.project.repositoryId);

  const model: Omit<PocModel, 'responseIdentity'> & {
    readonly responseIdentity: ReturnType<typeof responseIdentityMetadata>;
  } = {
    schema: 'syzygy-three-surface-poc/v1',
    evaluation: {
      snapshot: `${snapshotLabel}|inputs:sha256:${seed.inputsDigest}`,
      snapshotLabel,
      inputsDigest: seed.inputsDigest,
      asOf: input.evaluation.asOf,
      evidence: input.evidence ?? zeroDriftEvidence(input),
    },
    project: { name: input.seeds.project.displayName, root: seed.repoRoot, revision: input.repositoryRevision },
    observerRevision: input.observerRevision,
    governingIntentId: project.governingIntentId,
    capabilityId: project.capabilityId,
    entities: graph.entities,
    relationships: graph.relationships,
    codeStructure: orrery.codeStructure,
    workItems: trajectory.workItems,
    workerChange: trajectory.workerChange,
    testArtifactVerification: trajectory.testArtifactVerification,
    orrery: orrery.orrery,
    trajectory: trajectory.trajectory,
    unknownSubjects: deepFreeze(deriveUnknownSubjects({
      ...orrery,
      ...trajectory,
      governingIntentId: project.governingIntentId,
      proposedWork: project.proposedWork,
    })),
    materializedBeadId: trajectory.materialization.beadId,
    projectShape: project.projectShape,
    resourceHeadroom: project.resourceHeadroom,
    proposedWork: project.proposedWork,
    dispatch: trajectory.dispatch,
    walkthroughJudgment: acceptance.walkthroughJudgment,
    walkthroughReadiness: acceptance.walkthroughReadiness,
    surfaces: graph.surfaces,
    responseIdentity: responseIdentityMetadata(),
  };
  return { ...model, responseIdentity: buildResponseIdentity(model) };
}
