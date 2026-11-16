/**
 * Capability deep dive — the three authority bands (PWB-REQ-015; RFC7-17).
 *
 * A deep dive composes exactly three bands in a fixed order, each in one of
 * three closed authority classes:
 *
 *   argument  — authored, non-normative framing; anchors nothing, binds nothing;
 *   contract  — referenced, verbatim-reachable current intent: the requirement
 *               leaf's identity, its text byte-for-byte from the owning
 *               artifact or not at all, governing doctrine and non-goals, and
 *               the active proposals adjacent to it as separate candidate
 *               futures that grant no status and anchor nothing;
 *   reality   — kernel-computed facts sourced only from the shared model.
 *
 * This module owns the data side: the band vocabulary, the per-capability
 * derivation from the shared model, verbatim resolution (fail-closed on
 * identity), the block ledger every band block is recorded in, and the
 * machine form the page embeds. `polaris.ts` composes the HTML from it.
 * Nothing here stores requirement, scenario, doctrine or non-goal text: the
 * verbatim reader is a render-time parameter and production passes none.
 */

import {
  UNKNOWN_REASON_ROUTES,
  gitBlobObjectId,
  type PocEntity,
  type PocModel,
  type PocRelationship,
  type ProposedWork,
  type ProposedWorkCurrentAuthority,
  type UnknownReason,
} from '@syzygy/three-surface-poc-core';
import { sha256 } from '@syzygy/support';

const DEEP_DIVE_BANDS = ['argument', 'contract', 'reality'] as const;
export type DeepDiveBand = (typeof DEEP_DIVE_BANDS)[number];

/** The three authority classes, one per band, closed (RFC7-17). */
const BAND_AUTHORITY_CLASS = {
  argument: 'authored-non-normative',
  contract: 'referenced-verbatim',
  reality: 'kernel-computed',
} as const;
type BandAuthorityClass = (typeof BAND_AUTHORITY_CLASS)[DeepDiveBand];

/** The one mode this change renders. The proposed-scenario mode (RFC7-26,
 * RFC6-24) needs a selection context and is outside PWB; its absence is
 * disclosed on the page, not defaulted into. */
const READING_MODES = ['Base'] as const;
type ReadingMode = (typeof READING_MODES)[number];
export const DEFAULT_READING_MODE: ReadingMode = 'Base';

type CapabilityAdoption =
  | { readonly kind: 'adopted'; readonly basis: string }
  | { readonly kind: 'draft'; readonly basis: string }
  | { readonly kind: 'unknown'; readonly reason: UnknownReason; readonly route: string; readonly detail: string };

interface ExclusivityGroup {
  readonly group: string;
  readonly changeIds: readonly string[];
}

export interface CapabilityDeepDive {
  readonly kind: 'capability-deep-dive';
  readonly capabilityId: string;
  readonly capability: PocEntity;
  readonly adoption: CapabilityAdoption;
  /** The current requirement leaf (the baseline spec the proposals amend). */
  readonly currentIntent: ProposedWorkCurrentAuthority;
  readonly proposals: readonly ProposedWork[];
  /** Declared exclusivity between proposals, from captured OpenSpec state. */
  readonly exclusivity: readonly ExclusivityGroup[];
  readonly exclusivityBasis: 'declared' | 'not-captured';
  /** Every non-capability entity of the slice, the project included (rendered in the reality band). */
  readonly related: readonly PocEntity[];
  readonly relationships: readonly PocRelationship[];
}

/** Whether a capability is adopted is read from the observed tree: an
 * adopted capability has its baseline spec among the shape's baseline-spec
 * population; a draft has none and is declared only by proposals. */
function deriveAdoption(currentIntent: ProposedWorkCurrentAuthority): CapabilityAdoption {
  if (currentIntent.kind === 'baseline-spec') {
    return { kind: 'adopted', basis: currentIntent.path };
  }
  if (currentIntent.reason === 'missing-declaration') {
    return { kind: 'draft', basis: currentIntent.detail };
  }
  return { kind: 'unknown', reason: currentIntent.reason as UnknownReason, route: currentIntent.route, detail: currentIntent.detail };
}

/** One deep dive per capability entity the shared model carries. The model
 * captures no exclusivity declaration between proposals, so the basis is
 * `not-captured` and every proposal stays its own candidate future. */
export function deriveCapabilityDeepDives(model: PocModel): readonly CapabilityDeepDive[] {
  return model.entities
    .filter((entity) => entity.kind === 'capability')
    .map((capability) => {
      const proposals = model.proposedWork.capabilityId === capability.id ? [model.proposedWork] : [];
      const currentIntent: ProposedWorkCurrentAuthority = proposals[0]?.currentAuthority ?? {
        kind: 'unknown',
        reason: 'missing-declaration',
        route: UNKNOWN_REASON_ROUTES['missing-declaration'],
        detail: `No OpenSpec change followed by this evaluation names ${capability.id}; no baseline spec was looked up for it.`,
      };
      return {
        kind: 'capability-deep-dive',
        capabilityId: capability.id,
        capability,
        adoption: deriveAdoption(currentIntent),
        currentIntent,
        proposals,
        exclusivity: [],
        exclusivityBasis: 'not-captured',
        related: model.entities.filter((entity) => entity.kind !== 'capability'),
        relationships: model.relationships,
      };
    });
}

/** The change ids a proposal is declared exclusive with (never itself). */
export function exclusiveWith(dive: Pick<CapabilityDeepDive, 'exclusivity'>, changeId: string): readonly string[] {
  const others = new Set<string>();
  for (const group of dive.exclusivity) {
    if (!group.changeIds.includes(changeId)) continue;
    for (const other of group.changeIds) if (other !== changeId) others.add(other);
  }
  return [...others].sort();
}

// ---------------------------------------------------------------------------
// Verbatim resolution: bytes reach the page only from a render-time reader,
// only when they hash to the leaf's captured identity, and are never stored.

// Test seam: exported type the tests name; production code uses it only inside this file.
export interface VerbatimLeaf {
  readonly path: string;
  readonly revision: string;
  /** Registry git-tree-entry identity (`…#<object id>`) or `sha256:<hex>`. */
  readonly identity: string;
}

/** A reader's typed refusal: the route's gate that failed, as an Unknown
 * reason plus a detail, so the page discloses why nothing was rendered. */
export interface VerbatimRefusal {
  readonly refused: UnknownReason;
  readonly detail: string;
}

/** Returns the owning artifact's exact bytes, a typed refusal, or
 * `undefined` when the bytes could not be read at all. */
export type VerbatimLeafReader = (leaf: VerbatimLeaf) => Uint8Array | VerbatimRefusal | undefined;

/** One `### Requirement:` block of a baseline spec, with its scenarios. */
interface VerbatimRequirement {
  readonly title: string;
  readonly text: string;
}

export type VerbatimResolution =
  | {
      readonly kind: 'rendered';
      readonly identity: string;
      /** The selected requirement blocks only, in source order, joined by one newline. */
      readonly text: string;
      readonly requirements: readonly VerbatimRequirement[];
    }
  | { readonly kind: 'not-rendered'; readonly reason: UnknownReason; readonly route: string; readonly detail: string };

function isRefusal(value: Uint8Array | VerbatimRefusal | undefined): value is VerbatimRefusal {
  return value !== undefined && !(value instanceof Uint8Array) && typeof (value as VerbatimRefusal).refused === 'string';
}

// Test seam: exported for the tests; production code reaches it only inside this file.
/**
 * PWB-REQ-011 (as amended 2026-09-05): Polaris may transiently encode only the
 * selected requirement and its scenarios, verbatim — never the rest of the
 * body. The baseline OpenSpec grammar is `### Requirement: <title>` blocks
 * whose `#### Scenario:` children follow until the next `###`, `##` or `#`
 * heading; `## Purpose` prose and anything outside a requirement block is
 * withheld. Trailing blank lines before the next heading are not requirement
 * text. Bytes inside a block are kept exactly.
 */
export function selectRequirementSections(text: string): readonly VerbatimRequirement[] {
  const lines = text.split(/\r?\n/);
  const out: VerbatimRequirement[] = [];
  let current: { title: string; lines: string[] } | undefined;
  const flush = (): void => {
    if (current === undefined) return;
    const block = [...current.lines];
    while (block.length > 0 && (block[block.length - 1] as string).trim() === '') block.pop();
    out.push({ title: current.title, text: block.join('\n') });
    current = undefined;
  };
  for (const line of lines) {
    const requirement = /^### Requirement:\s*(.*)$/.exec(line);
    if (requirement !== null) {
      flush();
      current = { title: (requirement[1] ?? '').trim(), lines: [line] };
      continue;
    }
    if (/^#{1,3} /.test(line)) {
      flush();
      continue;
    }
    if (current !== undefined) current.lines.push(line);
  }
  flush();
  return out;
}

function notRendered(reason: UnknownReason, detail: string): VerbatimResolution {
  return { kind: 'not-rendered', reason, route: UNKNOWN_REASON_ROUTES[reason], detail };
}

function identityMatches(identity: string, bytes: Uint8Array): boolean | undefined {
  if (identity.startsWith('sha256:')) {
    return sha256(bytes) === identity.slice('sha256:'.length);
  }
  const hash = identity.lastIndexOf('#');
  if (hash === -1) return undefined;
  const objectId = identity.slice(hash + 1);
  if (/^[0-9a-f]{40}$/.test(objectId)) return gitBlobObjectId(bytes, 'sha1') === objectId;
  if (/^[0-9a-f]{64}$/.test(objectId)) return gitBlobObjectId(bytes, 'sha256') === objectId;
  return undefined;
}

export function resolveVerbatim(leaf: VerbatimLeaf, reader: VerbatimLeafReader | undefined): VerbatimResolution {
  if (reader === undefined) {
    return notRendered(
      'unconsented-source-or-provider',
      `The requirement leaf ${leaf.path} lies outside the consented content class; only its identity at ${leaf.revision.slice(0, 12)} was captured.`,
    );
  }
  const offered = reader(leaf);
  if (isRefusal(offered)) return notRendered(offered.refused, offered.detail);
  const bytes = offered;
  if (bytes === undefined) {
    return notRendered('source-uncaptured-or-unreachable', `The owning artifact ${leaf.path} could not be read at ${leaf.revision.slice(0, 12)}.`);
  }
  const matches = identityMatches(leaf.identity, bytes);
  if (matches === undefined) {
    return notRendered('reference-unresolvable', `The captured identity of ${leaf.path} names no digest the reader's bytes can be checked against.`);
  }
  if (!matches) {
    return notRendered('reference-unresolvable', `The bytes offered for ${leaf.path} do not hash to its captured identity; nothing was rendered.`);
  }
  if (bytes.includes(0)) {
    return notRendered('excluded-content', `The owning artifact ${leaf.path} is not text; nothing was rendered.`);
  }
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return notRendered('excluded-content', `The owning artifact ${leaf.path} is not UTF-8 text; nothing was rendered.`);
  }
  const requirements = selectRequirementSections(text);
  if (requirements.length === 0) {
    return notRendered('reference-unresolvable', `The baseline spec ${leaf.path} carries no requirement heading to select; nothing was rendered.`);
  }
  return { kind: 'rendered', identity: leaf.identity, text: requirements.map((requirement) => requirement.text).join('\n'), requirements };
}

/** The current requirement leaf, when the shape observed its baseline spec. */
export function currentIntentLeaf(currentIntent: ProposedWorkCurrentAuthority, revision: string): VerbatimLeaf | undefined {
  if (currentIntent.kind !== 'baseline-spec') return undefined;
  const support = currentIntent.claim.support[0];
  const identity = support?.sourceIdentity ?? (support?.contentDigest === undefined ? undefined : `sha256:${support.contentDigest}`);
  if (identity === undefined) return undefined;
  return { path: currentIntent.path, revision, identity };
}

// ---------------------------------------------------------------------------
// Block ledger and machine form.

interface DeepDiveBlock {
  readonly band: DeepDiveBand;
  readonly blockId: string;
}

export interface DeepDiveMachineForm {
  readonly kind: 'capability-deep-dive';
  readonly capabilityId: string;
  readonly readingMode: ReadingMode;
  readonly adoption: CapabilityAdoption['kind'];
  readonly bands: readonly {
    readonly band: DeepDiveBand;
    readonly authorityClass: BandAuthorityClass;
    readonly blockIds: readonly string[];
  }[];
  readonly intent: {
    readonly leaf?: VerbatimLeaf;
    readonly verbatim: 'rendered' | 'not-rendered';
    readonly reason?: UnknownReason;
    /** Titles of the selected requirement blocks (rendered only); never the text. */
    readonly requirements?: readonly string[];
  };
  readonly proposals: readonly {
    readonly changeId: string;
    readonly exclusiveWith: readonly string[];
    readonly anchorable: false;
    readonly statusBearing: false;
  }[];
  readonly exclusivityBasis: CapabilityDeepDive['exclusivityBasis'];
}

/** Records every block a deep dive renders under exactly one band. A block
 * id registered twice, or under a second band, is a renderer defect. */
export class DeepDiveLedger {
  private readonly blocks: DeepDiveBlock[] = [];
  private readonly seen = new Set<string>();

  constructor(private readonly escape: (value: string) => string) {}

  /** The attributes a band block carries: exactly one `data-band`, its class, and its id. */
  block(band: DeepDiveBand, blockId: string): string {
    if (this.seen.has(blockId)) throw new Error(`deep-dive block registered twice: ${blockId}`);
    this.seen.add(blockId);
    this.blocks.push({ band, blockId });
    return ` data-polaris-section="${this.escape(blockId)}" data-band="${band}" data-authority-class="${BAND_AUTHORITY_CLASS[band]}"`;
  }

  bands(): DeepDiveMachineForm['bands'] {
    return DEEP_DIVE_BANDS.map((band) => ({
      band,
      authorityClass: BAND_AUTHORITY_CLASS[band],
      blockIds: this.blocks.filter((block) => block.band === band).map((block) => block.blockId),
    }));
  }
}

export function deepDiveMachineForm(
  dive: CapabilityDeepDive,
  ledger: DeepDiveLedger,
  intent: { readonly leaf?: VerbatimLeaf; readonly resolution?: VerbatimResolution },
): DeepDiveMachineForm {
  return {
    kind: 'capability-deep-dive',
    capabilityId: dive.capabilityId,
    readingMode: DEFAULT_READING_MODE,
    adoption: dive.adoption.kind,
    bands: ledger.bands(),
    intent: {
      ...(intent.leaf === undefined ? {} : { leaf: intent.leaf }),
      verbatim: intent.resolution?.kind === 'rendered' ? 'rendered' : 'not-rendered',
      ...(intent.resolution?.kind === 'not-rendered' ? { reason: intent.resolution.reason } : {}),
      // Titles only: the selected requirement text itself never enters the machine form.
      ...(intent.resolution?.kind === 'rendered' ? { requirements: intent.resolution.requirements.map((requirement) => requirement.title) } : {}),
    },
    proposals: dive.proposals.map((proposal) => ({
      changeId: proposal.changeId,
      exclusiveWith: exclusiveWith(dive, proposal.changeId),
      anchorable: false,
      statusBearing: false,
    })),
    exclusivityBasis: dive.exclusivityBasis,
  };
}
