import {
  computeCoverage,
  computeDiscoverability,
  computeShapeAnswers,
  coverageBoundary,
  discoverabilityRow,
  explainDiscoverability,
  registerProject,
  type AuthorityExposure,
  type CoverageResult,
  type EvaluatedDiscoverability,
  type EvaluationIdentity,
  type Proposal,
  type ReadmeEvidence,
  type Sha256Digest,
  type FactModel,
  type NamedValidationFailure,
  type ObservationOutcome,
  type PreObservationConsentDecision,
  type ProjectId,
  type RegistrationResult,
  type ServedFact,
  type ShapeAnswerSet,
} from '@syzygy/cap1-core';

import { README_RELATIVE_PATH, type DeclarationObservation } from './observation.js';
import { extractReadmeEntryLink } from './readme-links.js';
import {
  captureProjectInputs,
  isCaptureFailure,
  type CaptureDependencies,
  type CaptureFailure,
  type CapturedEntry,
  type CapturedProjectInputs,
  type CapturedRepositoryInput,
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

// --- Required evaluated planes (syzygy-u2a.7) -------------------------------
//
// Every evaluated project carries all four planes; none is optional and no
// route supplies one of its own (CAP1-REQ-041: one evaluation, two
// channels). An input that is not designed renders as its named state,
// never as an empty success (VIS-2).

// Discoverability: one row per declared repository, declaration order — or,
// when a captured README holds a link whose target the reader cannot
// classify, the whole plane is unavailable and names that link. A partial
// plane is never served, and an unclassifiable link is never `no`.
export type DiscoverabilityPlane =
  | { readonly state: 'available'; readonly rows: readonly EvaluatedDiscoverability[] }
  | {
      readonly state: 'unavailable';
      readonly reason: 'target-unclassifiable';
      readonly repositoryId: string;
      readonly readme: { readonly relativePath: typeof README_RELATIVE_PATH; readonly digest: Sha256Digest };
      readonly href: string;
      readonly classifier: 'repository-locator-unavailable' | 'ambiguous-target';
    };

// Authority exposure (CAP1-REQ-046): no authority-exposure input is designed
// (a held limb), so the daemon serves the named unavailable state.
export type AuthorityPlane =
  | { readonly state: 'available'; readonly values: readonly AuthorityExposure[] }
  | { readonly state: 'unavailable'; readonly reason: 'authority-input-not-designed' };

// Proposals (CAP1-REQ-053/063): proposal production is not designed.
export type ProposalPlane =
  | { readonly state: 'available'; readonly values: readonly Proposal[] }
  | { readonly state: 'not-produced'; readonly reason: 'proposal-input-not-designed' };

export interface EvaluatedProjectPlanes {
  readonly discoverability: DiscoverabilityPlane;
  readonly authorityExposures: AuthorityPlane;
  readonly proposals: ProposalPlane;
  // The entry exactly as the capture holds it; no channel re-reads it.
  readonly entry: CapturedEntry;
}

// The entry as both channels serve it: the captured arm with its digest,
// or its named state. A consent-refused governance root is its own
// `not-read` state with its Unknown reason (syzygy-s6cp), never folded into
// `unreadable`.
export type ServedEntry =
  | { readonly state: 'captured'; readonly digest: Sha256Digest; readonly text: string }
  | { readonly state: 'missing'; readonly failureCode: string }
  | { readonly state: 'unreadable'; readonly label: 'Unknown'; readonly failureCode: string }
  | {
      readonly state: 'not-read';
      readonly reason: 'unconsented-governance-root';
      readonly label: 'Unknown';
      readonly unknownReason: 'unconsented-source-or-provider';
    };

export function servedEntry(entry: CapturedEntry): ServedEntry {
  switch (entry.state) {
    case 'captured':
      return { state: 'captured', digest: entry.digest, text: entry.text };
    case 'missing':
      return { state: 'missing', failureCode: entry.failureCode };
    case 'unreadable':
      return { state: 'unreadable', label: 'Unknown', failureCode: entry.failureCode };
    case 'not-read':
      return {
        state: 'not-read',
        reason: entry.reason,
        label: 'Unknown',
        unknownReason: 'unconsented-source-or-provider',
      };
  }
}

export const AUTHORITY_PLANE_NOT_DESIGNED: AuthorityPlane = Object.freeze({
  state: 'unavailable',
  reason: 'authority-input-not-designed',
});

export const PROPOSAL_PLANE_NOT_PRODUCED: ProposalPlane = Object.freeze({
  state: 'not-produced',
  reason: 'proposal-input-not-designed',
});

type ReadmeJudgment =
  | { readonly kind: 'evidence'; readonly evidence: ReadmeEvidence }
  | { readonly kind: 'unclassifiable'; readonly plane: Extract<DiscoverabilityPlane, { state: 'unavailable' }> };

// Role, then consent, then README (CAP1-REQ-052 before 051). The parser
// runs only over a README the capture holds for an admitted governance root.
function readmeJudgment(repository: CapturedRepositoryInput): ReadmeJudgment {
  if (repository.role === 'observed-source') {
    return { kind: 'evidence', evidence: { state: 'not-read', reason: 'no-governance-root' } };
  }
  if (repository.decision.authorization !== 'admitted') {
    return { kind: 'evidence', evidence: { state: 'unconsented' } };
  }
  const readme = repository.readme;
  switch (readme.state) {
    case 'captured': {
      const link = extractReadmeEntryLink(readme.text, repository.linkContext);
      if (link.state === 'unclassifiable') {
        return {
          kind: 'unclassifiable',
          plane: {
            state: 'unavailable',
            reason: 'target-unclassifiable',
            repositoryId: repository.repositoryId,
            readme: { relativePath: readme.relativePath, digest: readme.digest },
            href: link.href,
            classifier: link.reason,
          },
        };
      }
      return {
        kind: 'evidence',
        evidence: {
          state: 'captured',
          relativePath: readme.relativePath,
          digest: readme.digest,
          linksToEntry: link.linksToEntry,
        },
      };
    }
    case 'missing':
    case 'unreadable':
      return {
        kind: 'evidence',
        evidence: { state: 'uncaptured', relativePath: readme.relativePath, failure: readme.failureCode },
      };
    case 'not-read':
      return {
        kind: 'evidence',
        evidence: { state: 'uncaptured', relativePath: README_RELATIVE_PATH, failure: readme.reason },
      };
  }
}

export function discoverabilityPlane(
  captured: CapturedProjectInputs,
  context: {
    readonly projectSelection: string;
    readonly evaluation: EvaluationIdentity;
    readonly scenarioContext: string;
    readonly coverage: CoverageResult;
  },
): DiscoverabilityPlane {
  const boundary = coverageBoundary(context.coverage);
  const rows: EvaluatedDiscoverability[] = [];
  for (const repository of captured.repositories) {
    const judgment = readmeJudgment(repository);
    if (judgment.kind === 'unclassifiable') return judgment.plane;
    const finding = computeDiscoverability(repository.repositoryId, repository.role, judgment.evidence);
    rows.push({
      finding,
      row: discoverabilityRow(finding, 'not-produced'),
      explanation: explainDiscoverability(finding, { ...context, boundary }),
    });
  }
  return { state: 'available', rows };
}

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
      readonly planes: EvaluatedProjectPlanes;
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

  const planes: EvaluatedProjectPlanes = {
    discoverability: discoverabilityPlane(captured, {
      projectSelection: model.selection,
      evaluation,
      scenarioContext: DAEMON_SCENARIO_CONTEXT,
      coverage,
    }),
    authorityExposures: AUTHORITY_PLANE_NOT_DESIGNED,
    proposals: PROPOSAL_PLANE_NOT_PRODUCED,
    entry: captured.entry,
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
    planes,
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
