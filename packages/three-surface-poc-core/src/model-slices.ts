// The slice builders `buildPocModel` composes into the one shared PocModel
// (syzygy-bpyt.7.1). Each slice observes what one surface owns; none keeps a
// store of its own, and the compose step in model.ts assembles a single
// instance every surface reads. They run in the order the observations were
// always issued: seed artifacts, code structure, work items, the worker
// change and its test artifact, then the project shape.

import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { deepFreeze, sha256 } from '@syzygy/support';

import { observeCodeStructure, type CodeStructureResult } from './code-structure.js';
import { observed, unknown, type PocEpistemic } from './epistemic.js';
import { buildDispatchDisclosure, type DispatchDisclosure, type MaterializationRecord } from './materialization.js';
import type { BuildPocModelInput, PocEntity, PocEvaluationEvidence, PocProvenance, PocRelationship, PocSurface } from './model.js';
import { projectOrrery, type OrreryProjection } from './orrery-projection.js';
import { PocObservationError } from './poc-observation-error.js';
import type { PocSeedInput } from './poc-seeds.js';
import { buildProjectShape, unevaluatedProjectShape, type ProjectShape } from './project-shape-model.js';
import { gitRunnerFor } from './project-shape-observation.js';
import { deriveProposedWork, type ProposedWork } from './proposed-work.js';
import { resourceHeadroom, type ResourceHeadroom } from './resource-headroom.js';
import {
  capabilityIdFromSeeds,
  entityFromSeed,
  relationshipFromSeed,
  surfacesFromSeeds,
  type ObservedArtifact,
  type SeedArtifacts,
} from './seed-graph.js';
import { resolveTestArtifactVerification, type TestArtifactVerificationResult } from './test-artifact-verification.js';
import { projectTrajectory, type TrajectoryProjection } from './trajectory-projection.js';
import { observeWorkItems, type WorkItemsResult } from './work-items.js';
import { observeWorkerChange, type WorkerChangeResult } from './worker-change-observation.js';

// Fixed populations keep the human board bounded as the live backlog grows.
const NON_CLOSED_LIMIT = 200;
const RECENT_CLOSED_WINDOW = 50;

function observeArtifact(
  repoRoot: string,
  artifactPath: string,
  requiredMarkers: readonly string[] = [],
): ObservedArtifact {
  const absolutePath = resolve(repoRoot, artifactPath);
  try {
    if (!statSync(absolutePath).isFile()) {
      throw new PocObservationError('required-artifact-unreadable', artifactPath);
    }
    const bytes = readFileSync(absolutePath);
    if (requiredMarkers.some((marker) => !bytes.includes(Buffer.from(marker, 'utf8')))) {
      throw new PocObservationError('required-artifact-semantic-mismatch', artifactPath);
    }
    return { path: artifactPath, digest: sha256(bytes) };
  } catch (cause) {
    if (cause instanceof PocObservationError) {
      throw cause;
    }
    if ((cause as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new PocObservationError('required-artifact-missing', artifactPath);
    }
    throw new PocObservationError('required-artifact-unreadable', artifactPath);
  }
}

/** The seeded intent and mapping artifacts, hashed, and the evaluation
 * identity they enter. */
export interface SeedObservation {
  readonly repoRoot: string;
  readonly artifacts: SeedArtifacts;
  readonly inputsDigest: string;
  readonly mappingProvenance: PocProvenance;
  readonly gitProvenance: PocProvenance;
}

export function observeSeeds(input: BuildPocModelInput): SeedObservation {
  const { seeds } = input;
  const repoRoot = resolve(input.repoRoot);
  const artifacts = {
    design: observeArtifact(repoRoot, seeds.artifacts.design, seeds.intentMarkers.design),
    proposal: observeArtifact(repoRoot, seeds.artifacts.proposal, seeds.intentMarkers.proposal),
    requirement: observeArtifact(repoRoot, seeds.artifacts.requirement, seeds.intentMarkers.requirement),
    code: observeArtifact(repoRoot, seeds.artifacts.code),
    test: observeArtifact(repoRoot, seeds.artifacts.test),
  };
  const mappingDigest = sha256(JSON.stringify({ ARTIFACT_PATHS: seeds.artifacts, INTENT_MARKERS: seeds.intentMarkers }));
  const inputsDigest = sha256(
    JSON.stringify({
      repoRoot,
      repositoryRevision: input.repositoryRevision,
      observerRevision: input.observerRevision,
      artifacts: [artifacts.design, artifacts.proposal, artifacts.requirement, artifacts.code, artifacts.test],
      mappingDigest,
    }),
  );
  return {
    repoRoot,
    artifacts,
    inputsDigest,
    mappingProvenance: {
      kind: 'manual-mapping',
      source: 'packages/three-surface-poc-core/src/model.ts#ARTIFACT_PATHS',
      revision: input.observerRevision,
      digest: `sha256:${mappingDigest}`,
    },
    gitProvenance: { kind: 'git-revision', source: seeds.project.provenanceSource, revision: input.repositoryRevision },
  };
}

/** Orrery: the observed code structure and its capability-to-path projection. */
export interface OrrerySlice {
  readonly codeStructure: CodeStructureResult;
  readonly orrery: OrreryProjection;
}

export function buildOrrerySlice(input: BuildPocModelInput, seed: SeedObservation): OrrerySlice {
  const codeStructure = observeCodeStructure({
    repoRoot: seed.repoRoot,
    revision: input.repositoryRevision,
    capturedAt: input.evaluation.asOf,
    provenanceSource: seed.gitProvenance.source,
    ...(input.runGit === undefined ? {} : { runGit: input.runGit }),
  });
  return { codeStructure, orrery: projectOrrery(codeStructure, input.seeds.orreryMappings) };
}

export interface MaterializationEpistemic {
  readonly epistemic: PocEpistemic;
  readonly beadId: string | null;
  /** From the record's origin field; null for pre-origin records, where
   * only "created or reused" can be honestly claimed. */
  readonly origin: 'created' | 'reused' | null;
  readonly createdAt: string | null;
  readonly provenance: readonly PocProvenance[];
}

function unconfirmed(epistemic: PocEpistemic): MaterializationEpistemic {
  return { epistemic, beadId: null, origin: null, createdAt: null, provenance: [] };
}

/**
 * A materialization record is local, human-authored state — it becomes
 * an Observed claim only once the named Bead is confirmed present in
 * this same evaluation's live-observed work items, never from the
 * record file alone (VIS-2: a claim needs resolvable, current
 * provenance, not a memory of a past write).
 */
function resolveMaterializationEpistemic(
  record: MaterializationRecord | null,
  workItems: WorkItemsResult,
): MaterializationEpistemic {
  if (record === null) {
    return unconfirmed(unknown('missing-evidence', 'No POC work item has been materialized.'));
  }
  if (workItems.kind === 'unknown') {
    return unconfirmed(unknown('source-uncaptured-or-unreachable', 'A materialization record exists but work items could not be observed to confirm it.'));
  }
  const found = workItems.items.find((item) => item.id === record.beadId);
  if (found === undefined) {
    return unconfirmed(unknown('reference-unresolvable', 'A materialization record names a Bead that was not found among the observed work items.'));
  }
  return {
    epistemic: observed(`The materialized Bead ${found.id} was confirmed present in the observed work items.`),
    beadId: found.id,
    origin: record.origin ?? null,
    createdAt: record.createdAt,
    provenance: [
      {
        kind: 'materialization-record',
        source: `Beads (${workItems.beadPrefix}) — ${found.id}`,
        revision: workItems.provenance.revision,
      },
    ],
  };
}

/** Trajectory: work items, the materialization they confirm, the worker
 * change and its test artifact, the board projection and the dispatch. */
export interface TrajectorySlice {
  readonly workItems: WorkItemsResult;
  readonly materialization: MaterializationEpistemic;
  readonly workerChange: WorkerChangeResult;
  readonly testArtifactVerification: TestArtifactVerificationResult;
  readonly trajectory: TrajectoryProjection;
  readonly dispatch: DispatchDisclosure | null;
}

export function buildTrajectorySlice(input: BuildPocModelInput, seed: SeedObservation): TrajectorySlice {
  const { seeds } = input;
  const capturedAt = input.evaluation.asOf;
  const workItems = observeWorkItems({
    repoRoot: seed.repoRoot,
    beadPrefix: seeds.beadPrefix,
    capturedAt,
    ...(input.runWorkItemQuery === undefined ? {} : { runQuery: input.runWorkItemQuery }),
  });
  const materialization = resolveMaterializationEpistemic(input.materializationRecord ?? null, workItems);
  const workerChange = observeWorkerChange({
    repoRoot: seed.repoRoot,
    beadId: materialization.beadId,
    seam: seeds.workerChangeSeam,
    capturedAt,
    ...(input.runGit === undefined ? {} : { runGit: input.runGit }),
  });
  const commit = workerChange.kind === 'observed' ? workerChange.commit : null;
  const testArtifactVerification = resolveTestArtifactVerification({
    record: input.testArtifactRecord ?? null,
    expectedScope: seeds.workerChangeSeam.testPath,
    observedCommit: workerChange.kind === 'observed' && workerChange.state === 'changed-or-merged' && commit !== null ? commit.sha : null,
    commitAuthoredAt: commit === null ? null : commit.authoredAt,
    evaluationAsOf: capturedAt,
  });
  const dispatch = buildDispatchDisclosure({
    seedRepositoryId: seeds.project.repositoryId,
    targetRepoRoot: seed.repoRoot,
    proposalPath: seed.artifacts.proposal.path,
    designPath: seed.artifacts.design.path,
    materializedBeadId: materialization.beadId,
    materializedCreatedAt: materialization.createdAt,
  });
  return {
    workItems,
    materialization,
    workerChange,
    testArtifactVerification,
    trajectory: projectTrajectory(workItems, { nonClosedLimit: NON_CLOSED_LIMIT, recentClosedWindow: RECENT_CLOSED_WINDOW }),
    dispatch: dispatch === null ? null : deepFreeze(dispatch),
  };
}

/** Polaris: the project shape, its resource headroom, the followed proposed
 * work, and the seed identities the desired-state account names. */
export interface ProjectSlice {
  readonly projectShape: ProjectShape;
  readonly resourceHeadroom: ResourceHeadroom;
  readonly proposedWork: ProposedWork;
  readonly capabilityId: string;
  readonly governingIntentId: string | null;
}

export function buildProjectSlice(input: BuildPocModelInput, seed: SeedObservation, codeStructure: CodeStructureResult): ProjectSlice {
  const shapeInput = input.projectShape;
  const projectShape: ProjectShape =
    shapeInput === undefined
      ? unevaluatedProjectShape(
          input.projectShapeDetail ??
            'No body-read authority evaluation was supplied to this evaluation; no project-shape source was read.',
        )
      : buildProjectShape({
          authority: shapeInput.authority,
          revision: input.repositoryRevision,
          capturedAt: input.evaluation.asOf,
          runGit: shapeInput.runGit ?? gitRunnerFor(seed.repoRoot),
          ...(shapeInput.repositoryId === undefined ? {} : { repositoryId: shapeInput.repositoryId }),
          ...(shapeInput.resourceLimits === undefined ? {} : { resourceLimits: shapeInput.resourceLimits }),
        });
  const capabilityId = capabilityIdFromSeeds(input.seeds);
  const artifactAt = (artifact: ObservedArtifact) => ({
    path: artifact.path,
    revision: input.repositoryRevision,
    digest: `sha256:${artifact.digest}`,
  });
  const intentId = input.seeds.workerChangeIntentId;
  return {
    projectShape,
    resourceHeadroom: deepFreeze(resourceHeadroom(projectShape, shapeInput?.resourceLimits)),
    proposedWork: deriveProposedWork({
      capabilityId,
      proposal: artifactAt(seed.artifacts.proposal),
      delta: artifactAt(seed.artifacts.requirement),
      codeStructure,
      projectShape,
    }),
    capabilityId,
    governingIntentId: typeof intentId === 'string' && intentId.trim() !== '' ? intentId : null,
  };
}

/** The seeded graph every surface selects from: entities and relationships
 * claimed per role, and each surface's membership. */
export interface GraphSlice {
  readonly entities: readonly PocEntity[];
  readonly relationships: readonly PocRelationship[];
  readonly surfaces: readonly PocSurface[];
}

export function buildGraphSlice(seeds: PocSeedInput, seed: SeedObservation, materialization: MaterializationEpistemic): GraphSlice {
  const context = { ...seed, materialization };
  const entities = seeds.entities.map((entity) => entityFromSeed(entity, seeds, context));
  const relationships = seeds.relationships.map((relationship) => relationshipFromSeed(relationship, seeds, context));
  return { entities, relationships, surfaces: deepFreeze(surfacesFromSeeds(seeds, entities, relationships)) };
}

/**
 * A production snapshot already begins with the opaque repository identity
 * and may contain several structured components. Preserve that complete
 * label; parsing from the last delimiter would silently discard earlier
 * components (for example the repository revision and working-tree digest).
 * Test and non-daemon callers use a human-facing label followed by one
 * explicit suffix delimiter: replace only that leading label, preserving
 * every remaining component in order.
 */
export function snapshotLabelFor(snapshot: string, repositoryId: string): string {
  if (
    snapshot === repositoryId ||
    snapshot.startsWith(`${repositoryId}:`) ||
    snapshot.startsWith(`${repositoryId}@`) ||
    snapshot.startsWith(`${repositoryId}|`)
  ) {
    return snapshot;
  }
  const delimiter = ['@', '|', ':']
    .map((candidate) => snapshot.indexOf(candidate))
    .filter((index) => index > 0)
    .sort((left, right) => left - right)[0];
  if (delimiter !== undefined && delimiter < snapshot.length - 1) {
    return `${repositoryId}${snapshot.slice(delimiter)}`;
  }
  return repositoryId;
}

/** Absent callers receive a deterministic zero-drift probe for their pinned evaluation. */
export function zeroDriftEvidence(input: BuildPocModelInput): PocEvaluationEvidence {
  const asOf = input.evaluation.asOf;
  return {
    pinnedRevision: input.repositoryRevision,
    pinnedCommitterInstant: null,
    observationInstant: asOf,
    probe: {
      claimId: 'claim:currency-probe',
      evaluationId: `evaluation:pwb-currency-probe:${asOf}`,
      evaluationInstant: asOf,
      epistemic: { label: 'Observed', tier: 'report-fact', challenge: 'unchallenged' },
      pinnedRevision: input.repositoryRevision,
      currentRevision: input.repositoryRevision,
      changedSources: 0,
      addedSources: 0,
    },
    currencyBounds: [],
  };
}
