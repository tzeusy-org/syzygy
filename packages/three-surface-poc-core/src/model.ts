import type { CommitJoinsResult, CommitJoinsUnknown, CommitJoinUnknownReason } from './commit-joins.js';
import type { CodeStructureResult } from './code-structure.js';
import { GOVERNING_INTENT_UNKNOWN_BASIS, workItemTitlesDisclosure, type WorkItemsResult } from './work-items.js';
import type { WorkerChangeResult } from './worker-change-observation.js';
import type { ChangeWindow, ChangeWindowReason } from './work-item-history.js';
import type { OrreryProjection } from './orrery-projection.js';
import {
  GOVERNING_INTENT_REGION_ID,
  TRAJECTORY_CHAIN_MEMBERSHIP_ID,
  TRAJECTORY_CHANGED_ID,
  TRAJECTORY_COST_ID,
  TRAJECTORY_ORPHANED_WORK_ID,
  TRAJECTORY_COMMIT_JOINS_ID,
  TRAJECTORY_LANDING_UNNAMED_ID,
  type TrajectoryProjection,
} from './trajectory-projection.js';
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
  /** POC-REQ-064 (syzygy-t3jk.25): the observed repository's commits that
   * name each served item, by the naming convention; no subject is kept. */
  readonly commitJoins: CommitJoinsResult;
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

/** POC-REQ-043: the one board-level disclosure every Trajectory card's
 * verification mark refers to (syzygy-t3jk.15). Each served item's own
 * verification stays on its fact (`trajectory.rendered[].verification`). */
const WORK_ITEM_VERIFICATION_BASIS =
  'Activity is not verification: no test evidence has been ingested for any work item.';

/** POC-REQ-044 basis sentences for the five answers' Unknown parts. */
/** syzygy-t3jk.21: why a change window is Unknown, one sentence per reason. */
export const CHANGE_WINDOW_REASON_TEXT: Readonly<Record<ChangeWindowReason, string>> = {
  'work-item-revision-unavailable': 'no exact work-item revision was available to end the window at',
  'observation-instant-unavailable': 'the observation instant could not be read, so the window bound is not known',
  'history-read-failed': 'the tracker history read failed',
  'history-result-malformed': 'the tracker history read returned rows of an unexpected shape',
  'history-revision-unverified': 'the tracker history did not confirm the observed revision',
  'history-shorter-than-window': 'the retained tracker history holds no commit as old as the window bound',
  'history-non-linear': 'the tracker history between the window start and the observed revision holds a merge or out-of-order commit dates, so the start found by date is not a point on one line of history',
  'history-not-read': 'no tracker history read was attempted for this observation',
  'no-previous-evaluation-recorded': 'no previous evaluation\'s work-item revision is recorded, so there is no start to diff from',
};

const CHANGE_WINDOW_LABEL: Readonly<Record<ChangeWindow, string>> = {
  day: 'the day window',
  week: 'the week window',
  'since-last': 'the since-last-evaluation window',
};

/** The one changed disclosure: every Unknown window with its reason. */
function changedBasis(windows: readonly { readonly window: ChangeWindow; readonly kind: string; readonly reason?: ChangeWindowReason }[]): string {
  const parts = windows.flatMap((window) => (window.kind === 'unknown' && window.reason !== undefined ? [`${CHANGE_WINDOW_LABEL[window.window]} is Unknown because ${CHANGE_WINDOW_REASON_TEXT[window.reason]}`] : []));
  return `What changed is answered from the tracker's own history between two named revisions, where it can be read; ${parts.join('; ')}. An Unknown window is never a zero.`;
}
const COST_BASIS = 'No cost record is read: no effort, compute, token, money or blocked-time measure is captured for any work item, so those costs are Unknown, never zero; elapsed time alone is measured, as lead time and age.';
const ORPHANED_WORK_BASIS = 'No orphaned-work check is implemented, and the observation does not read who created each tracker item, which that check would compare with materialization records, so how many items are orphaned is Unknown, never 0.';

/** POC-REQ-065: why each closed item's landing is Unknown, by the commit
 * join's closed reason (POC-REQ-064). */
const COMMIT_JOINS_UNKNOWN_BASIS: Readonly<Record<CommitJoinUnknownReason, string>> = {
  'work-items-unobserved': 'the work items were not observed',
  'repository-revision-unavailable': 'the observed repository revision is not a commit identifier',
  'commit-history-read-failed': "the observed repository's history could not be read",
  'commit-history-malformed': "the observed repository's history read returned rows of an unexpected shape, or did not start at the observed revision",
};

function commitJoinsBasis(joins: CommitJoinsUnknown): string {
  return `Where each closed item landed, by a commit that names it (naming convention), is Unknown: ${COMMIT_JOINS_UNKNOWN_BASIS[joins.reason]} (commit join ${joins.reason}). No closed item is counted as merged by naming convention or as having no naming commit.`;
}

/** POC-REQ-065: why a closed item no read commit names has an Unknown
 * landing, with the count and the read's extent. */
function landingUnnamedBasis(count: number, read: number, truncated: boolean): string {
  const extent = truncated
    ? `only the newest ${read} commits from the observed revision were read, and older history may name them`
    : `the observed revision's whole history (${read} commits) was read`;
  return `${count} closed items have no commit that names them, so where each landed is Unknown: no commit subject carries the item's identifier as an exact token, and the join is never fuzzy-matched (RFC4-22); ${extent}. A commit that names the item resolves it.`;
}

export const WORK_ITEM_VERIFICATION_REGION_ID = 'region:work-item-verification' as const;

/** POC-REQ-014: the Trajectory region that counts the served items whose
 * governing intent is Unknown; each card's mark refers to it, and each
 * item's own value is its served `governedBy`. */
export const WORK_ITEM_GOVERNING_INTENT_REGION_ID = GOVERNING_INTENT_REGION_ID;

/** POC-REQ-063: the one disclosure every rendered card's withheld title,
 * and the board's notice, render under, present while any title is withheld. */
export const WORK_ITEM_TITLES_REGION_ID = 'region:work-item-titles' as const;

export function workerChangeVerificationId(beadId: string): string {
  return `worker-change:${beadId}/verification`;
}

interface UnknownSubjectInputs {
  readonly codeStructure: CodeStructureResult;
  readonly workItems: WorkItemsResult;
  readonly orrery: OrreryProjection;
  readonly trajectory: TrajectoryProjection;
  readonly commitJoins: CommitJoinsResult;
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
    if (input.workItems.kind === 'observed') {
      // syzygy-t3jk.15: each Unknown a card marks is disclosed once, on the
      // board, with its count (RFC2-24 aggregation). A card's mark refers to
      // that disclosure; the item's own value is its served fact
      // (`workItems.items[].governedBy`, `trajectory.rendered[].verification`).
      add(WORK_ITEM_VERIFICATION_REGION_ID, WORK_ITEM_VERIFICATION_BASIS, 'missing-evidence');
      add(WORK_ITEM_GOVERNING_INTENT_REGION_ID, GOVERNING_INTENT_UNKNOWN_BASIS, 'source-uncaptured-or-unreachable');
      // POC-REQ-063: while any title is withheld, the machine twin of the
      // board's withheld-title disclosure is the observation's own `titles`
      // with its counted basis sentence.
      const titles = workItemTitlesDisclosure(input.workItems.titles);
      if (titles !== null) subjects.push({ id: WORK_ITEM_TITLES_REGION_ID, epistemic: titles });
      // POC-REQ-044 (syzygy-t3jk.16): the five answers' Unknown parts.
      const changed = input.trajectory.answers.find((answer) => answer.id === 'changed');
      if (changed !== undefined && 'windows' in changed && changed.windows.some((window) => window.kind === 'unknown')) {
        add(TRAJECTORY_CHANGED_ID, changedBasis(changed.windows), 'source-uncaptured-or-unreachable');
      }
      add(TRAJECTORY_COST_ID, COST_BASIS, 'source-uncaptured-or-unreachable');
      add(TRAJECTORY_ORPHANED_WORK_ID, ORPHANED_WORK_BASIS, 'source-uncaptured-or-unreachable');
      // POC-REQ-065 (syzygy-t3jk.26): closed items' landings are Unknown
      // exactly when the commit join is.
      const remains = input.trajectory.answers.find((answer) => answer.id === 'remains');
      if (remains !== undefined && 'closedLanding' in remains) {
        const landing = remains.closedLanding;
        if (landing.state === 'unknown') {
          const basis = input.commitJoins.kind === 'unknown'
            ? commitJoinsBasis(input.commitJoins)
            : 'Where each closed item landed is Unknown: the commit join was not supplied to the Trajectory projection. No closed item is counted as merged by naming convention or as having no naming commit.';
          add(TRAJECTORY_COMMIT_JOINS_ID, basis, 'source-uncaptured-or-unreachable');
        } else if (landing.noNamingCommitRead > 0) {
          add(TRAJECTORY_LANDING_UNNAMED_ID, landingUnnamedBasis(landing.noNamingCommitRead, landing.commitsRead, landing.historyTruncated), 'missing-evidence');
        }
      }
      const intent = input.trajectory.answers.find((answer) => answer.id === 'intent');
      if (intent !== undefined && 'reconciliationChain' in intent && typeof intent.reconciliationChain.members !== 'number') {
        const change = input.workerChange;
        add(TRAJECTORY_CHAIN_MEMBERSHIP_ID, `Whether the materialized work item's change reached the default branch is Unknown: ${change.kind === 'unknown' ? change.reason : 'no worker change was observed'}.`, 'source-uncaptured-or-unreachable');
      }
    }
    const change = input.workerChange;
    // syzygy-t3jk.18: a card renders on the default selection or on the
    // view page that holds it (POC-REQ-042), so the twin exists whenever
    // the bead is a served item, not only when the default selection holds it.
    if (change.kind === 'observed' && input.workItems.kind === 'observed' && input.workItems.items.some((item) => item.id === change.beadId)) {
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
    commitJoins: trajectory.commitJoins,
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
