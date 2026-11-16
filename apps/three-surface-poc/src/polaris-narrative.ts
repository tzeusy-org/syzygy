/**
 * Polaris narrative claim blocks (PWB-REQ-014; RFC7-2, RFC7-3, RFC7-9).
 *
 * Every owner-visible narrative unit on Polaris carries exactly one claim
 * role plus the `presentation-artifact` and `non-citable` attributes. An
 * anchored block additionally carries a typed, revision-bound anchor set that
 * covers every claim it renders and contains no unused anchor. Blocks use
 * their own machine type — never the kernel claim tuple — and the whole
 * structure is a presentation artifact: deleting it leaves `/api/poc`
 * byte-identical, because nothing here is written back onto the model.
 */
import type {
  PocProvenance,
  ProjectShapeClaim,
  ProjectShapeSupport,
  ProposedWork,
} from '@syzygy/three-surface-poc-core';
import { deepFreeze } from '@syzygy/support';

import type { DeepDiveMachineForm } from './capability-detail.js';
import { resolveAnchors, type AnchorsResolved } from './polaris-anchor-resolution.js';

const NARRATIVE_CLAIM_ROLES = ['anchored-project-fact', 'non-normative-framing', 'epistemic-claim'] as const;
export type NarrativeClaimRole = (typeof NARRATIVE_CLAIM_ROLES)[number];

/** Closed anchor target classes (PWB-REQ-014). */
const ANCHOR_TARGET_CLASSES = ['doctrine', 'contract', 'requirement', 'decision', 'evidence', 'work'] as const;
export type AnchorTargetClass = (typeof ANCHOR_TARGET_CLASSES)[number];

export interface CapturedTargetState {
  readonly label: string;
  readonly tier: string;
  readonly reason: string;
}

export interface NarrativeAnchor {
  readonly anchorId: string;
  readonly targetClass: AnchorTargetClass;
  /** Durable target identity — a registry identity, digest or revision;
   * never a label, a bare path or a line coordinate. */
  readonly targetId: string;
  readonly revision: string;
  /** Claim ids inside the block that this anchor supports. */
  readonly supports: readonly string[];
  /** The target's state as captured at render time; frozen, never re-read. */
  readonly captured: CapturedTargetState;
  /** Human locator (path[:line]) — display only, not identity. */
  readonly locator: string;
}

/** A block as registered: its anchors are fixed at registration, its
 * `anchorsResolved` pair only once the machine answer is known. */
interface RegisteredBlock {
  readonly kind: 'narrative-block';
  readonly blockId: string;
  readonly role: NarrativeClaimRole;
  readonly presentation: 'presentation-artifact';
  readonly citable: false;
  readonly claims: readonly string[];
  readonly anchors: readonly NarrativeAnchor[];
}

/** The served block: the registered block plus its counted pair (PWB-REQ-014
 * `anchorsResolved`). The pair is presentation, never authority: `citable`
 * stays false whatever it reads. */
interface NarrativeBlock extends RegisteredBlock {
  readonly anchorsResolved: AnchorsResolved;
}

// Test seam: exported type the tests name; production code uses it only inside this file.
export interface PolarisNarrative {
  readonly kind: 'polaris-narrative';
  readonly presentation: 'presentation-artifact';
  readonly citable: false;
  readonly roles: readonly NarrativeClaimRole[];
  readonly anchorTargetClasses: readonly AnchorTargetClass[];
  readonly blocks: readonly NarrativeBlock[];
  /** The sum of the blocks' pairs, or Unknown where each of theirs is. */
  readonly anchorsResolved: AnchorsResolved;
  /** Capability deep dives: band composition, verbatim state and the
   * proposals' non-anchorable, non-status-bearing futures (PWB-REQ-015). */
  readonly deepDives: readonly DeepDiveMachineForm[];
}

/** Personal view state (which on-demand blocks start open). It lives here,
 * outside the truth model, and changes only presentation. */
export interface PolarisViewState {
  readonly openCoverageCounts?: readonly string[];
}

export function claimRoleAttrs(role: NarrativeClaimRole): string {
  return ` data-claim-role="${role}" data-presentation-artifact data-non-citable`;
}

const PROVENANCE_CLASS: Readonly<Record<PocProvenance['kind'], AnchorTargetClass>> = {
  'repository-file': 'evidence',
  'git-revision': 'evidence',
  'dolt-revision': 'work',
  'manual-mapping': 'evidence',
  'materialization-record': 'work',
  'test-artifact-record': 'evidence',
  'project-shape-source': 'evidence',
  'owner-act': 'decision',
};

export interface AnchorInput {
  readonly targetClass: AnchorTargetClass;
  readonly targetId: string;
  readonly revision: string;
  readonly locator: string;
}

export function provenanceAnchor(item: PocProvenance): AnchorInput {
  return {
    targetClass: PROVENANCE_CLASS[item.kind],
    targetId: `${item.kind}:${item.digest ?? item.revision}`,
    revision: item.revision,
    locator: item.source,
  };
}

/** Shape support: the registry's `git-tree-entry` identity when the source is
 * in the population, else the exact content digest. */
export function supportAnchor(support: ProjectShapeSupport, revision: string, targetClass: AnchorTargetClass = 'evidence'): AnchorInput | undefined {
  const targetId = support.sourceIdentity ?? (support.contentDigest === undefined ? undefined : `sha256:${support.contentDigest}`);
  if (targetId === undefined) return undefined;
  return {
    targetClass,
    targetId,
    revision,
    locator: support.line === undefined ? support.path : `${support.path}:${support.line}`,
  };
}

export function artifactAnchor(artifact: ProposedWork['proposal'], targetClass: AnchorTargetClass): AnchorInput {
  return { targetClass, targetId: artifact.digest, revision: artifact.revision, locator: artifact.path };
}

export function capturedStateOf(claim: ProjectShapeClaim): CapturedTargetState {
  const epistemic = claim.epistemic;
  const reason = 'reasons' in epistemic ? epistemic.reasons.primary : 'basis' in epistemic ? epistemic.basis : 'none';
  return { label: epistemic.label, tier: epistemic.tier ?? 'unstated', reason };
}

/** Collects the blocks one render emits. Blocks are cloned and deep-frozen at
 * registration: a later mutation of the model cannot rewrite a captured
 * target state (PWB-REQ-014 later-read mutation case). */
export class NarrativeRegistry {
  private readonly blocks: RegisteredBlock[] = [];
  private readonly deepDives: DeepDiveMachineForm[] = [];
  private readonly seen = new Set<string>();

  registerDeepDive(form: DeepDiveMachineForm): void {
    if (this.deepDives.some((dive) => dive.capabilityId === form.capabilityId)) throw new Error(`deep dive registered twice: ${form.capabilityId}`);
    this.deepDives.push(deepFreeze(structuredClone(form)));
  }

  registerAnchored(blockId: string, claims: readonly string[], anchors: readonly (AnchorInput & { readonly supports: readonly string[]; readonly captured: CapturedTargetState })[]): RegisteredBlock {
    if (this.seen.has(blockId)) throw new Error(`narrative block registered twice: ${blockId}`);
    for (const claimId of claims) if (claimId.includes('\t')) throw new Error(`claim id carries a tab: ${claimId}`);
    this.seen.add(blockId);
    const block: RegisteredBlock = deepFreeze({
      kind: 'narrative-block',
      blockId,
      role: 'anchored-project-fact',
      presentation: 'presentation-artifact',
      citable: false,
      claims: [...claims],
      anchors: anchors.map((anchor, index) => ({
        anchorId: `${blockId}#a${index + 1}`,
        targetClass: anchor.targetClass,
        targetId: anchor.targetId,
        revision: anchor.revision,
        supports: [...anchor.supports],
        captured: { ...anchor.captured },
        locator: anchor.locator,
      })),
    });
    this.blocks.push(block);
    return block;
  }

  /** `answer` is the machine answer of this evaluation (`/api/poc`'s model):
   * every anchor is counted against it, and nothing else. */
  narrative(answer: unknown): PolarisNarrative {
    const pairs = resolveAnchors(this.blocks, answer);
    return deepFreeze({
      kind: 'polaris-narrative',
      presentation: 'presentation-artifact',
      citable: false,
      roles: [...NARRATIVE_CLAIM_ROLES],
      anchorTargetClasses: [...ANCHOR_TARGET_CLASSES],
      blocks: this.blocks.map((block, index) => ({ ...block, anchorsResolved: pairs.blocks[index] as AnchorsResolved })),
      anchorsResolved: pairs.narrative,
      deepDives: [...this.deepDives],
    });
  }
}

// The machine form of the presentation artifact (`PolarisNarrative`) is not
// embedded in the human page: `renderPolarisPresentation` returns it beside
// the HTML of the same render, and the authenticated envelope at
// `/api/poc/polaris` serves it. It is not `/api/poc` and never becomes part
// of it. (Until 2026-09-13 it was also an in-page JSON script; that copy was
// 30% of the page and had no reader but tests.)
