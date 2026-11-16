import {
  BUTLERS_POC_SEEDS,
  buildPocModel,
  evaluateBodyReadAuthority,
  readMaterializationRecordFile,
  readTestArtifactRecordFile,
  walkthroughAcceptance,
  type PocEvaluationEvidence,
  type PocModel,
  type ProjectShapeModelInput,
} from '@syzygy/three-surface-poc-core';

import { loadBodyReadAuthorityInputs } from './governance-inputs.js';
import type { GitHorizonObservation } from './git-observation.js';
import { pwbReadinessTraversal, walkthroughJudgmentInputsFor } from './walkthrough-inputs.js';

/** The captured repository inputs that a daemon evaluation serves. */
export interface PocRuntimeCapture {
  readonly repositoryRevision: string;
  readonly observerRevision: string;
  readonly workingTreeDigest: string;
  readonly evidence: PocEvaluationEvidence;
}

interface ProductionModelBuildOptions {
  readonly capture: PocRuntimeCapture;
  readonly repoRoot: string;
  readonly stateDir: string;
  readonly observerRoot?: string;
  readonly runWorkItemQuery?: (repoRoot: string, sql: string) => string;
}

/** Builds the currency-probe evidence owned by one captured observation. */
export function buildPocEvaluationEvidence(
  observationInstant: string,
  pinnedRevision: string,
  pinnedCommitterInstant: string,
  current: Pick<GitHorizonObservation, 'currentRevision' | 'changedSources' | 'addedSources'>,
): PocEvaluationEvidence {
  return {
    pinnedRevision,
    pinnedCommitterInstant,
    observationInstant,
    probe: {
      claimId: 'claim:currency-probe',
      evaluationId: `evaluation:pwb-currency-probe:${observationInstant}`,
      evaluationInstant: observationInstant,
      epistemic: { label: 'Observed', tier: 'report-fact', challenge: 'unchallenged' },
      pinnedRevision,
      currentRevision: current.currentRevision,
      changedSources: current.changedSources,
      addedSources: current.addedSources,
    },
    currencyBounds: [],
  };
}

/**
 * Builds the served model from one captured observation. This is the same
 * builder used by main.ts for startup and human-triggered re-observation;
 * keeping the seam here makes its capture-owned identity and asOf contract
 * directly testable without importing the CLI entrypoint.
 */
export function buildProductionPocModel({ capture, repoRoot, stateDir, observerRoot = process.cwd(), runWorkItemQuery }: ProductionModelBuildOptions): PocModel {
  let materializationRecord;
  try {
    materializationRecord = readMaterializationRecordFile(stateDir);
  } catch {
    // A corrupt record must not crash startup or silently look
    // unmaterialized — model.ts's own confirmation step already
    // renders Unknown for a record that fails to resolve, so an
    // unreadable record here is simply treated the same way: no
    // positive claim is made without it.
    materializationRecord = null;
  }
  let testArtifactRecord;
  try {
    testArtifactRecord = readTestArtifactRecordFile(stateDir);
  } catch {
    // Same fail-closed posture as the materialization record above:
    // an unreadable ingested artifact must never be treated as
    // "not yet ingested" (which would be silently more permissive).
    testArtifactRecord = null;
  }
  const asOf = capture.evidence.observationInstant;
  const snapshot = [
    `${BUTLERS_POC_SEEDS.project.repositoryId}:${capture.repositoryRevision}`,
    `working-tree:${capture.workingTreeDigest}`,
    `observer:${capture.observerRevision}`,
  ].join('|');
  // PWB-REQ-005: the body-read authority gate is evaluated from the
  // Syzygy governance tree (the daemon's working directory) before the
  // model may read any project-shape body. If the governance inputs
  // cannot even be loaded, no evaluation exists and the project shape
  // stays `not-evaluated` (Unknown) with the failure named — never a
  // synthetic admitting or rejecting evaluation.
  let projectShape: ProjectShapeModelInput | undefined;
  let projectShapeDetail: string | undefined;
  try {
    const authority = evaluateBodyReadAuthority(
      loadBodyReadAuthorityInputs({
        repoRoot: observerRoot,
        governanceRevision: capture.observerRevision,
        evaluationId: `evaluation:pwb-body-read:${asOf}`,
        evaluationInstant: asOf,
      }),
    );
    projectShape = { authority };
  } catch (error: unknown) {
    projectShapeDetail = `Body-read authority inputs could not be loaded from ${observerRoot}: ${
      error instanceof Error ? error.message : String(error)
    }`;
  }
  // PWB-REQ-022: the cold-open walkthrough pair is evaluated from the
  // same governance tree. An absent pair evaluates as `absent`
  // (Unknown, never met); only a loader failure leaves the judgment
  // `not-evaluated` with the failure named. The pair binds to the exact
  // evaluation this build observes: the builder supplies the evaluation
  // identity, the loader the Polaris surface version at the observer
  // revision (a loader failure leaves both states `not-evaluated`, named).
  const walkthroughJudgment = walkthroughJudgmentInputsFor({
    repoRoot: observerRoot,
    governanceRevision: capture.observerRevision,
    evaluationId: `evaluation:pwb-walkthrough-judgment:${asOf}`,
    evaluationInstant: asOf,
  });
  return buildPocModel({
    seeds: BUTLERS_POC_SEEDS,
    repoRoot,
    repositoryRevision: capture.repositoryRevision,
    observerRevision: capture.observerRevision,
    evaluation: { snapshot, asOf },
    evidence: capture.evidence,
    ...(runWorkItemQuery === undefined ? {} : { runWorkItemQuery }),
    materializationRecord,
    testArtifactRecord,
    projectShape,
    ...(projectShapeDetail === undefined ? {} : { projectShapeDetail }),
    // The acceptance slice, composed here at the app edge: the pair, and
    // PWB-REQ-021 readiness against this evaluation's own Polaris routes.
    acceptance: walkthroughAcceptance({ judgment: walkthroughJudgment, traversal: pwbReadinessTraversal() }),
  });
}
