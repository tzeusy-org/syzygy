import {
  consentDecisionTuple,
  evaluationId,
  type ConsentDecisionTuple,
  extractConsentDistinction,
  extractDistinctions,
  extractProposalDistinctions,
  coverageIdentityFields,
  registrationIdentityFields,
  renderState,
  serveMachine,
  sweepDistinctions,
  type DistinctionSweep,
  type EvaluationId,
  type IdentityField,
  type MachineAnswer,
  type MachineReadableDistinction,
  type Proposal,
  type RepositoryCoverage,
  type StateRendering,
} from '@syzygy/cap1-core';
import type { Route } from '@syzygy/http-host';

import type { ProjectEvaluation } from './pipeline.js';

// RT4 — the authenticated JSON machine endpoint (CAP1-REQ-040..046,
// 060, 062..064 at the transport). This module is TRANSPORT ONLY: every
// fact in the response body is an unchanged core output over the shared
// evaluation — `serveMachine` for the fact set (RFC6-13: one truth, two
// consumers), `renderState`/`renderProposal` for the proposed-vs-current
// plane, `extract*Distinctions`/`sweepDistinctions` for CAP1-REQ-064's
// machine-readable distinctions, and the stable-identity enumerations
// for CAP1-REQ-060. Nothing here mints, renames, or drops a fact; no
// clock is read, no randomness is drawn, no file is touched.
//
// The evaluation source is INJECTED (`getEvaluation`) and is the same
// single source the human page serves from — the composition root wires
// both channels to one evaluation, so the two channels expose the same
// facts by construction (CAP1-REQ-041), judged only by the independent
// parity oracle in the tests, never by this module's claim.
//
// Honesty on the non-evaluated arms (VIS-2): a declaration that failed
// to validate or was never observed is served as its NAMED arm with its
// verbatim reasons — never a 500, never an empty or favourable 200.

// R-S2 finding #4 parity fix: the consent/withdrawal record a coverage
// entry cites, threaded onto the machine channel's per-repository
// distinction the same way routes-human.ts's renderBoundaryRecord cites
// it (CAP1-REQ-041 parity by construction — both channels read this
// citation off the SAME `RepositoryCoverage` entry core computed, never
// off each other). Scoped to exactly the states this fix touches
// (capture-failed, stale, unconsented-by-withdrawal): observed and
// degraded-partial already have their own established machine-channel
// shape and are out of this fix's scope.
function consentCitationForDistinction(
  entry: RepositoryCoverage,
): { recordId: string; scope: string; attribution: string; grantState: string } | undefined {
  switch (entry.state) {
    case 'capture-failed':
    case 'stale':
      return entry.consent;
    case 'unconsented':
      return entry.basis === 'withdrawn' ? entry.consent : undefined;
    case 'observed':
    case 'degraded-partial':
      return undefined;
  }
}

// The one machine route this wave mounts. Exact pathname; the daemon's
// route registry matches it byte-for-byte.
export const MACHINE_PROJECT_PATH = '/api/project' as const;

export const MACHINE_CONTENT_TYPE = 'application/json' as const;

export interface MachineRouteDependencies {
  // The one evaluation source, supplied by the composition root — the
  // SAME source RT5's human page uses (parity by construction,
  // CAP1-REQ-041). This module never runs the pipeline itself.
  readonly getEvaluation: () => ProjectEvaluation | Promise<ProjectEvaluation>;
}

// Per-fact distinctions: the fact's name beside core's extracted
// machine-readable attributes — recoverable by text, never by pixels
// (CAP1-REQ-064; RFC7-33/34).
export interface FactDistinctions {
  readonly fact: string;
  readonly distinctions: readonly MachineReadableDistinction[];
}

// Per-repository consent-state distinction, from the coverage result's
// own state value (the coverage/consent boundary, CAP1-REQ-040's
// boundary class), via core's extractor.
export interface RepositoryConsentDistinction {
  readonly repositoryId: string;
  readonly distinctions: readonly MachineReadableDistinction[];
}

// The machine body for an evaluated project. Every field is a core
// output or a core-produced enumeration over the evaluation:
//
// - `state`: core `renderState` over the machine answer — `current` IS
//   `serveMachine(model)` by reference, `proposed` renders each open
//   proposal with its proposed marking and no status authority
//   (CAP1-REQ-063: no code path merges a proposal into `current`).
// - `evaluationId`: core's canonical id of the answer's own stamp — the
//   stamp itself travels on `state.current.evaluation` (CAP1-REQ-042/
//   060; RFC6-15: an answer that cannot name its evaluation is not an
//   answer).
// - `identities`: the stable identity-field enumerations, verbatim from
//   core (CAP1-REQ-060's sweep denominator).
// - `distinctions`: CAP1-REQ-064's machine-readable attributes — per
//   fact, per repository consent state, per proposal — plus core's
//   sweep, which HONESTLY lists uncovered distinction kinds as missing
//   (never claimed covered; VIS-2).
//
// Freshness and staleness (CAP1-REQ-062) travel verbatim inside each
// fact's epistemic state on `state.current.facts`; nothing here can
// flip an answer by wall clock, because nothing here reads one.
// CAP1-REQ-046 v1.0: one consent decision tuple per declared repository,
// declaration order — the same `consentDecisionTuple` projection the human
// fact set renders, plus the evaluation it belongs to.
export interface MachineConsentDecision extends ConsentDecisionTuple {
  readonly evaluationId: EvaluationId;
}

export interface MachineProjectEvaluatedBody {
  readonly kind: 'project-evaluated';
  readonly state: StateRendering<MachineAnswer>;
  readonly evaluationId: EvaluationId;
  readonly consentDecisions: readonly MachineConsentDecision[];
  readonly identities: {
    readonly registration: readonly IdentityField[];
    readonly coverage: readonly IdentityField[];
  };
  readonly distinctions: {
    readonly perFact: readonly FactDistinctions[];
    readonly perRepositoryConsent: readonly RepositoryConsentDistinction[];
    readonly perProposal: readonly (readonly MachineReadableDistinction[])[];
    readonly sweep: DistinctionSweep;
  };
}

// The full body union: the evaluated body, or one of the pipeline's own
// named non-evaluated arms, verbatim.
export type MachineProjectBody =
  | MachineProjectEvaluatedBody
  | {
      readonly kind: 'declaration-invalid';
      // Core's named validation failures, verbatim — kept, never
      // collapsed (VIS-2).
      readonly failures: Extract<
        ProjectEvaluation,
        { kind: 'declaration-invalid' }
      >['failures'];
    }
  | {
      readonly kind: 'no-declaration-observed';
      // The observation's own named arm with its verbatim Unknown
      // reason (missing-declaration, or
      // source-uncaptured-or-unreachable).
      readonly declarationObservation: Extract<
        ProjectEvaluation,
        { kind: 'no-declaration-observed' }
      >['declarationObservation'];
    }
  | {
      // The capture failed; nothing was evaluated and nothing is retried.
      readonly kind: 'capture-failed';
      readonly failure: Extract<ProjectEvaluation, { kind: 'capture-failed' }>['failure'];
    };

// The evaluation carries no proposal plane today: the pipeline's
// project-evaluated arm has no proposals field, so the open-proposal
// list is empty — rendered through core `renderState` all the same, so
// the proposed plane's polarity (nothing merges into current) is core's
// code path, not this module's. When the evaluation grows proposals,
// they are passed here and nowhere else.
const OPEN_PROPOSALS: readonly Proposal[] = [];

/**
 * Build the machine body for one evaluation — pure, deterministic, and
 * composed ENTIRELY of core outputs (see the type's field notes).
 * Exported so tests can hold the transport's serialization against the
 * exact structures it was built from.
 */
export function machineProjectBody(evaluation: ProjectEvaluation): MachineProjectBody {
  switch (evaluation.kind) {
    case 'project-evaluated': {
      const answer = serveMachine(evaluation.model);
      const state = renderState(answer, OPEN_PROPOSALS);
      const id = evaluationId(answer.evaluation);
      return {
        kind: 'project-evaluated',
        state,
        evaluationId: id,
        consentDecisions: evaluation.consentDecisions.map((decision) => ({
          ...consentDecisionTuple(decision),
          evaluationId: id,
        })),
        identities: {
          registration: registrationIdentityFields(evaluation.registration),
          coverage: coverageIdentityFields(evaluation.coverage),
        },
        distinctions: {
          perFact: answer.facts.map((fact) => ({
            fact: fact.name,
            distinctions: extractDistinctions(fact),
          })),
          perRepositoryConsent: evaluation.coverage.repositories.map((entry) => ({
            repositoryId: entry.repositoryId,
            distinctions: extractConsentDistinction(
              entry.state,
              consentCitationForDistinction(entry),
            ),
          })),
          perProposal: state.proposed.map((rendering) =>
            extractProposalDistinctions(rendering),
          ),
          sweep: sweepOver(evaluation, state),
        },
      };
    }
    case 'declaration-invalid':
      return { kind: 'declaration-invalid', failures: evaluation.failures };
    case 'no-declaration-observed':
      return {
        kind: 'no-declaration-observed',
        declarationObservation: evaluation.declarationObservation,
      };
    case 'capture-failed':
      return { kind: 'capture-failed', failure: evaluation.failure };
  }
}

// Core's distinction sweep over everything this response carries. The
// authority and discoverability planes contribute nothing here because
// the pipeline evaluation carries no authority exposure and no
// discoverability finding — so the sweep lists their distinction kinds
// as MISSING, honestly, rather than this module inventing coverage.
function sweepOver(
  evaluation: Extract<ProjectEvaluation, { kind: 'project-evaluated' }>,
  state: StateRendering<MachineAnswer>,
): DistinctionSweep {
  return sweepDistinctions(
    state.current.facts.flatMap((fact) => extractDistinctions(fact)),
    state.proposed.flatMap((rendering) => extractProposalDistinctions(rendering)),
    [],
    [],
    evaluation.coverage.repositories.flatMap((entry) =>
      extractConsentDistinction(entry.state, consentCitationForDistinction(entry)),
    ),
  );
}

/**
 * The machine routes — plugged into the daemon's route registry by the
 * composition root. Admission (bearer credential) runs in the daemon
 * BEFORE `handle`; an unadmitted request never reaches this code
 * (CAP1-REQ-012's admission gate, RT3's mount property).
 */
export function machineRoutes(deps: MachineRouteDependencies): Route[] {
  return [
    {
      method: 'GET',
      path: MACHINE_PROJECT_PATH,
      credentialClass: 'machine-credentialed',
      async handle() {
        const evaluation = await deps.getEvaluation();
        const body = machineProjectBody(evaluation);
        return {
          status: 200,
          contentType: MACHINE_CONTENT_TYPE,
          body: JSON.stringify(body),
        };
      },
    },
  ];
}
