import type { UnknownReason } from '@syzygy/cap1-core';

import type { CodeStructureResult } from './code-structure.js';
import {
  UNKNOWN_REASON_ROUTES,
  type ProjectShape,
  type ProjectShapeClaim,
} from './project-shape-model.js';

/**
 * PWB-REQ-013 — proposed work stays subordinate to current project truth.
 *
 * The one OpenSpec change this POC follows is described here as a distinct
 * machine type, never as a project-account statement or a catalog item: its
 * lifecycle state comes from the exact Git tree listing at the evaluated
 * revision (metadata only), and the current authority it proposes to amend
 * is looked up in the observed project shape's baseline-spec class. Polaris
 * renders this object only inside the affected capability's detail, with
 * the current authority adjacent (`project-shape-model.ts` owns the shape;
 * `polaris.ts` owns the placement).
 */

const PROPOSED_WORK_LIFECYCLE_STATES = ['active', 'archived'] as const;
type ProposedWorkLifecycleState = (typeof PROPOSED_WORK_LIFECYCLE_STATES)[number];

interface ProposedWorkArtifact {
  readonly path: string;
  readonly revision: string;
  readonly digest: string;
}

type ProposedWorkLifecycle =
  | {
      readonly kind: 'observed';
      readonly state: ProposedWorkLifecycleState;
      /** Tree paths the state was read from — never their bodies. */
      readonly evidence: readonly string[];
      readonly basis: string;
    }
  | {
      readonly kind: 'unknown';
      readonly reason: string;
      /** The RFC2-24 reason the producing branch establishes (M4 slice 1). */
      readonly closedReason: UnknownReason;
    };

export type ProposedWorkCurrentAuthority =
  | {
      readonly kind: 'baseline-spec';
      readonly key: string;
      readonly path: string;
      /** The project shape's own claim for the item — identity and tuple preserved. */
      readonly claim: ProjectShapeClaim;
    }
  | {
      readonly kind: 'unknown';
      /** The closed RFC2-24 reason, or, on the no-seed-set placeholder alone,
       * `NO_SEED_SET_CURRENT_AUTHORITY_REASON` (served as-is; see there). */
      readonly reason: UnknownReason | typeof NO_SEED_SET_CURRENT_AUTHORITY_REASON;
      readonly route: string;
      readonly detail: string;
    };

/** The no-seed-set placeholder's current-authority `reason`: a sentence, not
 * one of the twelve RFC2-24 reasons. It is served inside `/api/poc` as it has
 * always been, so it is named here rather than changed (syzygy-bpyt.6.4). */
export const NO_SEED_SET_CURRENT_AUTHORITY_REASON = 'No seeded proposed-work artifacts were supplied to this evaluation.';

export interface ProposedWork {
  readonly kind: 'proposed-work';
  /** Stable marker identity: `proposed-work:<changeId>`; its Unknown parts are `<id>/current-authority` and `<id>/lifecycle`. */
  readonly id: string;
  readonly changeId: string;
  readonly capabilityId: string;
  /** The `openspec/specs/<key>/spec.md` directory the change proposes to amend. */
  readonly specKey: string;
  readonly proposal: ProposedWorkArtifact;
  readonly delta: ProposedWorkArtifact;
  readonly lifecycle: ProposedWorkLifecycle;
  readonly currentAuthority: ProposedWorkCurrentAuthority;
}

const CHANGE_DELTA = /^openspec\/changes\/([^/]+)\/specs\/([^/]+)\/spec\.md$/;

interface ParsedChangeDelta {
  readonly changeId: string;
  readonly specKey: string;
}

/** The change id and amended spec directory a change-delta path names. */
export function parseChangeDeltaPath(path: string): ParsedChangeDelta | undefined {
  const m = CHANGE_DELTA.exec(path);
  if (m === null) return undefined;
  return { changeId: m[1] as string, specKey: m[2] as string };
}

export function baselineSpecPath(specKey: string): string {
  return `openspec/specs/${specKey}/spec.md`;
}

export function deriveLifecycle(changeId: string, codeStructure: CodeStructureResult): ProposedWorkLifecycle {
  if (codeStructure.kind === 'unknown') {
    return { kind: 'unknown', reason: `The tree listing was not observed (${codeStructure.reason}); the change's lifecycle state was not read.`, closedReason: 'source-uncaptured-or-unreachable' };
  }
  const activePrefix = `openspec/changes/${changeId}/`;
  const archivedPattern = new RegExp(`^openspec/changes/archive/(?:[^/]*-)?${changeId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`);
  const active = codeStructure.files.filter((file) => file.path.startsWith(activePrefix)).map((file) => file.path);
  const archived = codeStructure.files.filter((file) => archivedPattern.test(file.path)).map((file) => file.path);
  if (active.length > 0 && archived.length > 0) {
    return { kind: 'unknown', reason: `Both an active and an archived entry for ${changeId} are present at this revision; the lifecycle state is contradicted.`, closedReason: 'contradicted-pending-adjudication' };
  }
  if (active.length > 0) {
    return { kind: 'observed', state: 'active', evidence: active, basis: `openspec/changes/${changeId}/ is present in the tree listing at this revision and no archived copy is.` };
  }
  if (archived.length > 0) {
    return { kind: 'observed', state: 'archived', evidence: archived, basis: `Only an archived copy of ${changeId} is present in the tree listing at this revision.` };
  }
  return { kind: 'unknown', reason: `No OpenSpec change entry named ${changeId} is present in the tree listing at this revision.`, closedReason: 'reference-unresolvable' };
}

export function deriveCurrentAuthority(specKey: string, projectShape: ProjectShape): ProposedWorkCurrentAuthority {
  const path = baselineSpecPath(specKey);
  if (projectShape.kind !== 'observed') {
    const epistemic = projectShape.claim.epistemic;
    const reason: UnknownReason = 'reasons' in epistemic ? epistemic.reasons.primary : 'unconsented-source-or-provider';
    return {
      kind: 'unknown',
      reason,
      route: UNKNOWN_REASON_ROUTES[reason],
      detail: `The project shape is ${projectShape.kind}; ${path} was not looked up.`,
    };
  }
  const item = projectShape.items.find((entry) => entry.class === 'baseline-spec' && entry.key === specKey);
  if (item === undefined) {
    return {
      kind: 'unknown',
      reason: 'missing-declaration',
      route: UNKNOWN_REASON_ROUTES['missing-declaration'],
      detail: `${path} is not among the ${projectShape.classes['baseline-spec'].modeled + projectShape.classes['baseline-spec'].unknown} baseline spec(s) in the observed shape.`,
    };
  }
  return { kind: 'baseline-spec', key: item.key, path: item.anchors[0]?.path ?? path, claim: item.claim };
}

interface DeriveProposedWorkInput {
  readonly capabilityId: string;
  readonly proposal: ProposedWorkArtifact;
  readonly delta: ProposedWorkArtifact;
  readonly codeStructure: CodeStructureResult;
  readonly projectShape: ProjectShape;
}

export function deriveProposedWork(input: DeriveProposedWorkInput): ProposedWork {
  const parsed = parseChangeDeltaPath(input.delta.path);
  if (parsed === undefined) {
    throw new Error(`not an OpenSpec change delta path: ${input.delta.path}`);
  }
  return {
    kind: 'proposed-work',
    id: `proposed-work:${parsed.changeId}`,
    changeId: parsed.changeId,
    capabilityId: input.capabilityId,
    specKey: parsed.specKey,
    proposal: input.proposal,
    delta: input.delta,
    lifecycle: deriveLifecycle(parsed.changeId, input.codeStructure),
    currentAuthority: deriveCurrentAuthority(parsed.specKey, input.projectShape),
  };
}
