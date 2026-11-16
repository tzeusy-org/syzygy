import {
  computeCoverage,
  computeShapeAnswers,
  registerProject,
  type CoverageResult,
  type FactModel,
  type NamedValidationFailure,
  type ObservationOutcome,
  type PreObservationConsentDecision,
  type ProjectId,
  type RegistrationResult,
  type ServedFact,
  type ShapeAnswerSet,
} from '@syzygy/cap1-core';

import type { DeclarationObservation } from './observation.js';
import {
  captureProjectInputs,
  isCaptureFailure,
  type CaptureDependencies,
  type CaptureFailure,
  type CapturedProjectInputs,
} from './source-snapshot.js';

// RT3 — the daemon's capture → consent → evaluation pipeline.
//
// `evaluateProject` is `captureProjectInputs` followed by
// `evaluateCapturedProject`: every disk fact arrives once, through the
// capture (source-snapshot.ts), and the evaluation is a pure function of
// that immutable capture. The evaluation identity is the pair (snapshot
// digest of the canonical manifest, explicit as-of): no caller supplies a
// snapshot label and no clock is read here (RFC2-3; CAP1-REQ-042/060).
//
// Consent: coverage is an ordinal projection of the closed pre-observation
// decisions — one per declared repository, in declaration order — and never
// reloads or re-resolves a record. A refused pair renders unconsented with
// its typed basis, and no observation outcome exists for it: none was read
// (CAP1-REQ-011/016).
//
// Polarity: no evidence yields Unknown, never green; failures flow through
// as NAMED values (VIS-2).

export { CONSENT_DECISIONS_RELATIVE_PATH } from './source-snapshot.js';

// The scenario context every daemon-served FactModel carries
// (CAP1-REQ-042's equivalence coordinate; one spelling, fixed here).
export const DAEMON_SCENARIO_CONTEXT = 'daemon-runtime' as const;

export type PipelineDependencies = CaptureDependencies;

// The pipeline result — a discriminated union over `kind`, every arm
// carrying its named evidence and the capture it was evaluated from. No
// arm discards a failure.
export type ProjectEvaluation =
  | {
      readonly kind: 'project-evaluated';
      readonly projectId: ProjectId;
      // The one FactModel both channels (RT4 machine, RT5 human) serve
      // from — the same shape the integration conformance test builds.
      readonly model: FactModel;
      readonly answers: ShapeAnswerSet;
      readonly registration: RegistrationResult;
      readonly coverage: CoverageResult;
      // One closed decision per declared repository, declaration order.
      readonly consentDecisions: readonly PreObservationConsentDecision[];
      readonly observations: readonly ObservationOutcome[];
      readonly declarationObservation: Extract<
        DeclarationObservation,
        { kind: 'declaration-read' }
      >;
      readonly capture: CapturedProjectInputs;
    }
  | {
      // The declaration was read but did not validate: registration is
      // core's named-failure arm; there is no validated project id, so
      // no answer set is minted for a project that never registered.
      readonly kind: 'declaration-invalid';
      readonly declarationObservation: Extract<
        DeclarationObservation,
        { kind: 'declaration-read' }
      >;
      readonly registration: Extract<RegistrationResult, { status: 'failed' }>;
      readonly failures: readonly NamedValidationFailure[];
      readonly capture: CapturedProjectInputs;
    }
  | {
      // Nothing was read: the observation's own named arm — missing
      // declaration (evidence of absence) or unreachable (absence of
      // evidence), each already carrying its Unknown reason verbatim.
      readonly kind: 'no-declaration-observed';
      readonly declarationObservation: Extract<
        DeclarationObservation,
        { kind: 'declaration-missing' | 'declaration-unreachable' }
      >;
      readonly capture: CapturedProjectInputs;
    }
  | {
      // The capture itself failed (a source changed between its read and
      // its revalidation, or the as-of was not an instant). Nothing is
      // evaluated and nothing partial is served; there is no retry.
      readonly kind: 'capture-failed';
      readonly failure: CaptureFailure;
      readonly asOf: string;
    };

// Maps a shape-answer set onto served facts — the integration
// conformance test's own mapping, reproduced as the one runtime
// serialization (label parity: the epistemic label travels verbatim
// from the render arm; RFC6-14).
export function factsFromAnswers(answers: ShapeAnswerSet): readonly ServedFact[] {
  return answers.answers.map((answer): ServedFact => {
    const render = answer.render;
    if (render.value === 'Unknown' && 'reasons' in render) {
      return {
        name: answer.name,
        value: render.value,
        epistemic: { label: 'Unknown', reasons: render.reasons },
      };
    }
    if (render.value === 'not evaluated' && 'basis' in render) {
      return {
        name: answer.name,
        value: render.value,
        epistemic: { label: 'Unknown', basis: 'deferred' },
      };
    }
    return {
      name: answer.name,
      value: render.value,
      epistemic: { label: 'Observed' },
    };
  });
}

/**
 * Evaluate one immutable capture. Pure: no I/O, no clock — the capture
 * carries its own as-of. Identical captures give identical evaluations.
 */
export function evaluateCapturedProject(captured: CapturedProjectInputs): ProjectEvaluation {
  const declarationObservation = captured.declaration;
  if (declarationObservation.kind !== 'declaration-read') {
    return { kind: 'no-declaration-observed', declarationObservation, capture: captured };
  }

  const read = declarationObservation.result;
  const registration = registerProject(read, captured.snapshot);
  if (!read.ok || registration.status === 'failed') {
    // `registration.status === 'failed'` exactly when `!read.ok`
    // (registerProject's own contract); both checks appear so the
    // narrowing is type-level, not an assumption.
    if (registration.status !== 'failed') {
      throw new Error(
        'registerProject returned registered for a failed read — core contract violated',
      );
    }
    return {
      kind: 'declaration-invalid',
      declarationObservation,
      registration,
      failures: registration.failures,
      capture: captured,
    };
  }

  const declaration = read.declaration;
  const projectId = declaration.project.id;
  const evaluation = { snapshot: captured.snapshot, asOf: captured.asOf };
  const consentDecisions = captured.repositories.map((repository) => repository.decision);
  const observations = captured.repositories.flatMap((repository) =>
    repository.root.state === 'captured' ? [repository.root.observation] : [],
  );

  const coverage = computeCoverage(declaration, consentDecisions, observations);
  const answers = computeShapeAnswers(projectId, evaluation, { registration, coverage });

  const model: FactModel = {
    selection: `project:${projectId}`,
    evaluation,
    scenarioContext: DAEMON_SCENARIO_CONTEXT,
    declaredFilters: {},
    facts: factsFromAnswers(answers),
  };

  return {
    kind: 'project-evaluated',
    projectId,
    model,
    answers,
    registration,
    coverage,
    consentDecisions,
    observations,
    declarationObservation,
    capture: captured,
  };
}

/**
 * Capture the project declared at `observedRootDir` and evaluate that
 * capture — the daemon's one pipeline from disk to FactModel.
 */
export async function evaluateProject(
  observedRootDir: string,
  deps: PipelineDependencies,
): Promise<ProjectEvaluation> {
  const captured = await captureProjectInputs(observedRootDir, deps);
  if (isCaptureFailure(captured)) {
    return { kind: 'capture-failed', failure: captured, asOf: deps.asOf };
  }
  return evaluateCapturedProject(captured);
}
