import type { EvaluationIdentity, RepositoryId } from './identity.js';
import type { RepositoryRole } from './declaration.js';
import type { EpistemicState } from './epistemic.js';
import type { Proposal } from './proposal.js';
import { renderState, type StateRendering } from './proposal.js';
import type { CoverageBoundary } from './coverage.js';
import type { ExplanationFactSet } from './drawer.js';
import type { Sha256Digest } from './snapshot.js';
import {
  UNKNOWN_REASONS,
  type DiscoverabilityValue,
  type EpistemicLabel,
  type UnknownReason,
} from './vocabulary.js';
import { HUMAN_ENTRY_PATH } from './entry.js';

// Repository discoverability — pure domain logic, no I/O, no clock.
// Behavior is bound by CAP1-REQ-050…053 and the cited contract clauses
// RFC7-40 (per-repository discoverability in four-value vocabulary),
// RFC7-41 (yes/no require evidence; missing = Unknown with reason),
// RFC7-42 (not-applicable only for repositories with no governance
// root), and RFC7-43 (may propose link; never writes README; proposal
// renders as proposed).
//
// syzygy-u2a.7: evidence is identity-bearing (the captured README's
// relative path and digest), the finding's basis is required and typed,
// and one served row per declared repository carries the complete tuple
// both channels serialize.

// The read subject — the repository's ROOT README; "no configurable
// landing document is an input to this finding" (CAP1-REQ-050).
export const DISCOVERABILITY_README_PATH = 'README.md' as const;

// The evidence for one repository's finding (CAP1-REQ-051). `not-read`
// is the observed-source arm: applicability decides before any read, so
// there is no README evidence at all (CAP1-REQ-052).
export type ReadmeEvidence =
  | {
      readonly state: 'captured';
      readonly relativePath: typeof DISCOVERABILITY_README_PATH;
      readonly digest: Sha256Digest;
      readonly linksToEntry: boolean;
    }
  | {
      readonly state: 'uncaptured';
      readonly relativePath: typeof DISCOVERABILITY_README_PATH;
      // 'missing', 'no-root', or the read's errno code.
      readonly failure: string;
    }
  | { readonly state: 'unconsented' }
  | { readonly state: 'undeclared' }
  | { readonly state: 'not-read'; readonly reason: 'no-governance-root' };

// Why the finding has its value — required on every finding.
export type DiscoverabilityBasis =
  | { readonly kind: 'no-governance-root' }
  | {
      readonly kind: 'readme-captured';
      readonly relativePath: typeof DISCOVERABILITY_README_PATH;
      readonly digest: Sha256Digest;
      readonly linksToEntry: boolean;
    }
  | {
      readonly kind: 'readme-uncaptured';
      readonly relativePath: typeof DISCOVERABILITY_README_PATH;
      readonly failure: string;
    }
  | { readonly kind: 'consent-not-admitted' }
  | { readonly kind: 'membership-undeclared' };

// One repository's discoverability finding (CAP1-REQ-050).
export interface DiscoverabilityFinding {
  readonly repositoryId: RepositoryId;
  readonly value: DiscoverabilityValue;
  readonly epistemic: EpistemicState;
  readonly basis: DiscoverabilityBasis;
}

// Spellings taken from the closed vocabulary by position (RFC2-24).
const MISSING_DECLARATION: 'missing-declaration' = UNKNOWN_REASONS[0];
const UNCONSENTED: 'unconsented-source-or-provider' = UNKNOWN_REASONS[5];
const UNCAPTURED: 'source-uncaptured-or-unreachable' = UNKNOWN_REASONS[9];

function unknown(reason: UnknownReason): EpistemicState {
  return { label: 'Unknown', reasons: { primary: reason, secondary: [] } };
}

// Computes discoverability for one repository (CAP1-REQ-050…052).
// Checks applicability FIRST (REQ-052), then evidence (REQ-051).
export function computeDiscoverability(
  repositoryId: RepositoryId,
  role: RepositoryRole,
  evidence: ReadmeEvidence,
): DiscoverabilityFinding {
  if (role === 'observed-source') {
    return {
      repositoryId,
      value: 'not-applicable',
      epistemic: { label: 'Observed' },
      basis: { kind: 'no-governance-root' },
    };
  }

  switch (evidence.state) {
    case 'captured':
      return {
        repositoryId,
        value: evidence.linksToEntry ? 'yes' : 'no',
        epistemic: { label: 'Observed' },
        basis: {
          kind: 'readme-captured',
          relativePath: evidence.relativePath,
          digest: evidence.digest,
          linksToEntry: evidence.linksToEntry,
        },
      };
    case 'uncaptured':
      return {
        repositoryId,
        value: 'Unknown',
        epistemic: unknown(UNCAPTURED),
        basis: { kind: 'readme-uncaptured', relativePath: evidence.relativePath, failure: evidence.failure },
      };
    case 'unconsented':
      return {
        repositoryId,
        value: 'Unknown',
        epistemic: unknown(UNCONSENTED),
        basis: { kind: 'consent-not-admitted' },
      };
    case 'not-read':
      // A governance root whose README was never read: nothing was
      // captured, so the finding is Unknown, never `no`.
      return {
        repositoryId,
        value: 'Unknown',
        epistemic: unknown(UNCAPTURED),
        basis: { kind: 'readme-uncaptured', relativePath: DISCOVERABILITY_README_PATH, failure: 'not-read' },
      };
    case 'undeclared':
      return {
        repositoryId,
        value: 'Unknown',
        epistemic: unknown(MISSING_DECLARATION),
        basis: { kind: 'membership-undeclared' },
      };
  }
}

// --- The served row (CAP1-REQ-040/041/050/064) ----------------------------

// Proposal state beside a row. Proposal production is not designed
// (syzygy-u2a.7 non-goal), so the only state served today is
// `not-produced`; a proposal never changes the row's value (REQ-053).
export type DiscoverabilityProposalState = 'not-produced';

// The complete tuple both channels serialize for one repository.
export interface DiscoverabilityRow {
  readonly repositoryId: RepositoryId;
  readonly value: DiscoverabilityValue;
  readonly label: EpistemicLabel;
  readonly primaryReason: UnknownReason | null;
  readonly basis: DiscoverabilityBasis;
  // The evidence identity: the captured README, or null where none was
  // captured (an Unknown or not-applicable finding).
  readonly evidence: {
    readonly relativePath: typeof DISCOVERABILITY_README_PATH;
    readonly digest: Sha256Digest;
  } | null;
  readonly proposal: DiscoverabilityProposalState;
}

export function discoverabilityRow(
  finding: DiscoverabilityFinding,
  proposal: DiscoverabilityProposalState,
): DiscoverabilityRow {
  const basis = finding.basis;
  return {
    repositoryId: finding.repositoryId,
    value: finding.value,
    label: finding.epistemic.label,
    primaryReason:
      finding.epistemic.label === 'Unknown' && 'reasons' in finding.epistemic
        ? finding.epistemic.reasons.primary
        : null,
    basis,
    evidence:
      basis.kind === 'readme-captured'
        ? { relativePath: basis.relativePath, digest: basis.digest }
        : null,
    proposal,
  };
}

// The selection a discoverability explanation answers for.
export function discoverabilitySelection(projectSelection: string, repositoryId: RepositoryId): string {
  return `${projectSelection}/discoverability:${repositoryId}`;
}

// "Why this answer?" for one finding (CAP1-REQ-040): only the RFC6-19
// classes the finding's provenance carries — the evaluation, the evidence
// classification, the Unknown reasons where applicable, the captured
// README digest as the evidence revision, and the coverage-and-consent
// boundary of the same evaluation. No other class is invented.
export function explainDiscoverability(
  finding: DiscoverabilityFinding,
  context: {
    readonly projectSelection: string;
    readonly evaluation: EvaluationIdentity;
    readonly scenarioContext: string;
    readonly boundary: CoverageBoundary;
  },
): ExplanationFactSet {
  const epistemic = finding.epistemic;
  return {
    selection: discoverabilitySelection(context.projectSelection, finding.repositoryId),
    evaluation: context.evaluation,
    scenarioContext: context.scenarioContext,
    evidenceClassification: epistemic,
    unknownReasons: epistemic.label === 'Unknown' && 'reasons' in epistemic ? epistemic.reasons : undefined,
    sourceRevision: finding.basis.kind === 'readme-captured' ? finding.basis.digest : undefined,
    coverageAndConsentBoundary: context.boundary,
  };
}

// One evaluated repository: its finding, its served row and its
// explanation.
export interface EvaluatedDiscoverability {
  readonly finding: DiscoverabilityFinding;
  readonly row: DiscoverabilityRow;
  readonly explanation: ExplanationFactSet;
}

// --- Proposals (CAP1-REQ-053) ---------------------------------------------

// Proposes a README entry link without writing it (CAP1-REQ-053).
export function proposeEntryLink(
  repositoryId: RepositoryId,
  entryPath: typeof HUMAN_ENTRY_PATH,
): Proposal {
  return {
    id: `propose-entry-link-${repositoryId}`,
    kind: 'code-change-set',
    subject: `Add link to ${entryPath} in repository ${repositoryId} README`,
    exclusivityGroup: `entry-link-${repositoryId}`,
    plane: 'proposed',
  };
}

// A finding with an optional proposal rendered beside it (CAP1-REQ-053).
export type DiscoverabilityWithProposal = StateRendering<DiscoverabilityFinding>;

// The finding value is UNCHANGED by the proposal's existence
// (CAP1-REQ-053). The proposal renders beside it as proposed material.
export function computeDiscoverabilityWithProposal(
  finding: DiscoverabilityFinding,
  proposal: Proposal | undefined,
): DiscoverabilityWithProposal {
  return renderState(finding, proposal !== undefined ? [proposal] : []);
}
