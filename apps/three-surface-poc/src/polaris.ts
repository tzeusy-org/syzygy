import { renderPolarisMarkdown } from './polaris-markdown.js';
import { projectReading, type ProjectReading, type ReadingFigure } from './polaris-reading.js';
import { escapeHtml } from '@syzygy/http-host';
import {
  EXTRACTION_CLASSES,
  UNKNOWN_REASON_ROUTES,
  resolutionRoute,
  type AuthorityDisclosure,
  type Declaration,
  type Exclusion,
  type ExtractionClass,
  type ObservationDegradation,
  type PillarDiscovery,
  type PocEntity,
  type PocUnknown,
  type PocModel,
  type PocProvenance,
  type PocRelationship,
  type PrecedenceCitation,
  type PrecedenceDisclosure,
  type ProjectAccountKey,
  type ProjectAccountStatement,
  type ProjectShape,
  type ProjectShapeClaim,
  type ProjectShapeClassAggregate,
  type ProjectShapeFact,
  type ProjectShapeItem,
  type ProjectShapeSource,
  type ProjectShapeSupport,
  type ProposedWork,
  type ReasonCounts,
  type RootSummaryDisclosure,
  type UnknownReason,
} from '@syzygy/three-surface-poc-core';
import { sha256 } from '@syzygy/support';

import {
  DEFAULT_READING_MODE,
  DeepDiveLedger,
  currentIntentLeaf,
  deepDiveMachineForm,
  deriveCapabilityDeepDives,
  exclusiveWith,
  resolveVerbatim,
  type CapabilityDeepDive,
  type DeepDiveBand,
  type VerbatimLeafReader,
  type VerbatimResolution,
} from './capability-detail.js';
import { pageShell, type HumanOperabilityStatus } from './page-shell.js';
import {
  CHALLENGE_ENCODING,
  FRESHNESS_ENCODING,
  PROPOSAL_DISCLOSURE,
  PROPOSAL_TREATMENT_CSS,
  TIER_ABSENCE_ENCODING,
  TIER_ENCODING,
  TUPLE_FIELD_TREATMENTS_CSS,
  TUPLE_MARKS_CSS,
  tupleFieldEncoding,
  type TupleFieldEncoding,
} from './design-tokens.js';
import { copyAttr, copyText, hasCopyRow, roleAttr, type PolarisCopyId } from './polaris-copy.js';
import {
  NarrativeRegistry,
  artifactAnchor,
  capturedStateOf,
  provenanceAnchor,
  supportAnchor,
  type AnchorInput,
  type AnchorTargetClass,
  type CapturedTargetState,
  type NarrativeAnchor,
  type PolarisViewState,
} from './polaris-narrative.js';
import { catalogReconciliation, renderCatalogReconciliation, RECONCILIATION_PLACEHOLDER, substituteCatalogReconciliation } from './polaris-reconciliation.js';
import { OPENING_INDEX_PLACEHOLDER, OPENING_INDEX_STYLE, substituteOpeningIndex } from './polaris-opening-index.js';
import { sourceRouteHref, sourceSlug } from './polaris-source.js';
import { crossSurfaceLink } from './surface-links.js';
import { actionRouteLink, unknownRoute, unknownSubject } from './unknown-marker.js';
import { TAILNET_MOUNT_PREFIX } from './tailnet.js';

export { sourceSlug };

export const POLARIS_HUMAN_PATH = '/polaris' as const;
export const POLARIS_TAILNET_PATH = `${TAILNET_MOUNT_PREFIX}/polaris` as const;

/**
 * The project-level sequence Polaris opens with (PWB-REQ-010; RFC7-1,
 * RFC7-13). The project's own account — purpose, promises, refusals,
 * architecture, V1 — comes first, then the complete catalog, and only then
 * the one capability this POC follows in depth, then the evidence behind
 * every claim and the gaps. Each group is rendered exactly once, in this
 * order, whatever the shape's epistemic state; an unobserved shape renders
 * every project group as Unknown in place with its reason and route
 * (RFC7-15), never as an empty group.
 *
 * Every owner-visible string comes from `polaris-copy.ts` or from the
 * shared model, and the element carrying it declares one `data-copy-role`
 * (PWB-REQ-012). There is no connective prose about the surface itself.
 */
export const POLARIS_GROUPS = [
  'overview',
  'boundaries',
  'v1',
  'architecture',
  'catalog',
  'capability-detail',
  'evidence-and-gaps',
] as const;
export type PolarisGroup = (typeof POLARIS_GROUPS)[number];

const CATALOG_CLASSES: readonly ExtractionClass[] = [
  'catalog-entry',
  'roster-identity',
  'design-contract',
  'baseline-spec',
  'craft-policy',
];

const FACT = roleAttr('project-fact');
const DISCLOSURE = roleAttr('epistemic-disclosure');
/** An anchored project fact: copy role project-fact, claim role anchored. */
const ANCHORED = roleAttr('project-fact', 'anchored-project-fact');

// ---------------------------------------------------------------------------
// Narrative blocks (PWB-REQ-014). One registry per render; the renderer is
// synchronous, so the active registry is module state for the duration of
// one `renderPolarisPage` call and cleared afterwards.

let activeRegistry: NarrativeRegistry | undefined;
let activeViewState: PolarisViewState = {};

/** The one page's link targets (PWB-REQ-011/016): the Unknown reasons the
 * gaps list enumerates and the source paths the sources table rows carry.
 * A reason or path outside these sets renders as text, never as a link to
 * nothing (RFC7-31's dangling-link floor). */
interface PageTargets {
  readonly gapReasons: ReadonlySet<string>;
  readonly sourcePaths: ReadonlySet<string>;
}
const NO_TARGETS: PageTargets = { gapReasons: new Set(), sourcePaths: new Set() };
let activeTargets: PageTargets = NO_TARGETS;
/** The mount the page is rendered under: the exact-source route links are
 * built relative to it. */
let activeMountPrefix = '';
/** The evaluation's exclusions and unavailable sources, so an Unknown's
 * route names its actual cause (PWB-LIVE-11): the detector, grammar or
 * observer failure that produced it — never a blanket policy change. */
let activeExclusions: readonly Exclusion[] = [];
let activeUnavailable: readonly { readonly path: string; readonly reason: string }[] = [];
/** Identities the exact-source route can serve: admitted baseline specs
 * whose body was classified and whose anchor is a blob at this revision. */
let activeExactSources: ReadonlySet<string> = new Set();

function gapId(reason: string): string {
  return `polaris-gap-${reason.replace(/[^A-Za-z0-9]+/g, '-')}`;
}

/** An Unknown reason as text, linked to its entry in the gaps list when the
 * page enumerates it there, so every reason mention reaches its route by
 * keyboard. */
function unknownReasonRef(reason: string): string {
  const span = `<span data-unknown-reason="${escapeHtml(reason)}">${escapeHtml(reason)}</span>`;
  return activeTargets.gapReasons.has(reason) ? `<a href="#${gapId(reason)}" data-gap-ref="${escapeHtml(reason)}">${span}</a>` : span;
}

/** A source location as text, linked to its row in the sources table when
 * the page carries that source. */
function sourceRef(path: string, text: string): string {
  return activeTargets.sourcePaths.has(path)
    ? `<a href="#polaris-source-${escapeHtml(sourceSlug(path))}" data-source-ref="${escapeHtml(path)}">${escapeHtml(text)}</a>`
    : escapeHtml(text);
}

/** A horizontally scrollable table region is a keyboard stop of its own
 * (tabindex 0) named by the heading above it, so a keyboard-only reader can
 * scroll a wide table without a pointer. */
function tableRegion(labelledBy: string, table: string, attrs = ''): string {
  return `<div class="table-scroll" role="region" tabindex="0" aria-labelledby="${escapeHtml(labelledBy)}"${attrs}>${table}</div>`;
}

function registry(): NarrativeRegistry {
  if (activeRegistry === undefined) throw new Error('renderPolarisPage is not active');
  return activeRegistry;
}

interface AnchoredClaim {
  readonly claimId: string;
  readonly anchors: readonly AnchorInput[];
  readonly captured: CapturedTargetState;
}

/** Registers one anchored block and returns the attributes for its element
 * plus the rendered anchor citations. Anchors are deduplicated by target so
 * a block never carries a surplus anchor; each keeps the claims it supports. */
function anchoredBlock(blockId: string, claims: readonly AnchoredClaim[]): { readonly attrs: string; readonly anchors: readonly NarrativeAnchor[] } {
  const merged = new Map<string, AnchorInput & { supports: string[]; captured: CapturedTargetState }>();
  for (const claim of claims) {
    for (const anchor of claim.anchors) {
      const key = `${anchor.targetClass}|${anchor.targetId}|${anchor.revision}|${anchor.locator}`;
      const existing = merged.get(key);
      if (existing === undefined) merged.set(key, { ...anchor, supports: [claim.claimId], captured: claim.captured });
      else if (!existing.supports.includes(claim.claimId)) existing.supports.push(claim.claimId);
    }
  }
  const block = registry().registerAnchored(blockId, claims.map((claim) => claim.claimId), [...merged.values()]);
  return { attrs: `${ANCHORED} data-narrative-block="${escapeHtml(blockId)}"`, anchors: block.anchors };
}

/** The human citation names its anchor by id only. The anchor record itself
 * (target class, durable target identity, revision, supported claims and the
 * captured label/tier/reason) lives once, frozen, in the page's narrative
 * script under that id — the machine form PWB-REQ-014 binds — and is not
 * restated on every `<cite>` (byte-ceiling trim, syzygy-1z3.27). */
function anchorAttrs(anchor: NarrativeAnchor): string {
  return ` data-anchor-id="${escapeHtml(anchor.anchorId)}"`;
}

function entityCaptured(epistemic: { readonly label: string; readonly reason?: string }): CapturedTargetState {
  return { label: epistemic.label, tier: epistemic.label === 'Observed' ? 'report-fact' : 'unstated', reason: epistemic.reason ?? 'none' };
}

function copy(id: PolarisCopyId): string {
  return escapeHtml(copyText(id));
}

function heading(level: 2 | 3 | 4, id: string, copyId: PolarisCopyId): string {
  return `<h${level} id="${escapeHtml(id)}"${copyAttr(copyId)}>${copy(copyId)}</h${level}>`;
}

// ---------------------------------------------------------------------------
// Capability-slice renderers (POC-REQ-030…032), unchanged in shape.

function provenanceCitations(provenance: readonly PocProvenance[], anchors: readonly NarrativeAnchor[]): string {
  if (provenance.length === 0) {
    return '';
  }
  const items = provenance
    .map(
      (item, index) =>
        `<cite data-parity-field="provenance-source"${anchorAttrs(anchors[index] as NarrativeAnchor)}>${escapeHtml(item.source)}</cite>@<code data-parity-field="provenance-revision">${escapeHtml(item.revision.slice(0, 12))}</code>`,
    )
    .join(', ');
  return ` <span class="citation">(${items})</span>`;
}

/** A model Unknown's disclosure body: the closed reason, its route, the
 * action route when one exists, and the basis sentence the page has always
 * rendered (M4 slice 1). */
function pocUnknownBody(id: string, epistemic: PocUnknown, model?: PocModel): string {
  const action = model === undefined ? '' : actionRouteLink(model, id, epistemic, activeMountPrefix, copyText('label.action-route'), 'label-first');
  return `${copy('label.unknown')} — ${unknownReasonRef(epistemic.closedReason)}. ${unknownRoute(epistemic, copy('label.route'))}${action}<br><small>${escapeHtml(epistemic.reason)}</small>`;
}

function entitySection(entity: PocEntity, model: PocModel, blockAttrs = ` data-polaris-section="${escapeHtml(entity.id)}"`): string {
  const link = crossSurfaceLink({ model, nameForm: 'label-first', className: 'reality-entity', sourceId: entity.id, target: 'orrery', targetId: entity.id,
    mountPrefix: activeMountPrefix, label: entity.title });
  const title = `<h3 id="polaris-${escapeHtml(entity.id)}"${FACT}>${link}</h3>`;
  if (entity.epistemic.label === 'Observed') {
    const block = anchoredBlock(`block:${entity.id}`, [{ claimId: entity.id, anchors: entity.provenance.map(provenanceAnchor), captured: entityCaptured(entity.epistemic) }]);
    return `<section class="claim-section"${blockAttrs}>
      ${title}
      <p${block.attrs}><span data-claim-provenance="${escapeHtml(entity.id)}">${escapeHtml(entity.detail)}</span>${provenanceCitations(entity.provenance, block.anchors)}</p>
    </section>`;
  }
  return `<section class="claim-section"${blockAttrs}>
    ${title}
    <p class="unknown-disclosure" data-unknown-disclosure="${escapeHtml(entity.id)}"${DISCLOSURE}>${pocUnknownBody(entity.id, entity.epistemic, model)}</p>
  </section>`;
}

function relationshipBullet(relationship: PocRelationship, entities: ReadonlyMap<string, PocEntity>, model: PocModel): string {
  const fromTitle = entities.get(relationship.from)?.title ?? relationship.from;
  const toTitle = entities.get(relationship.to)?.title ?? relationship.to;
  if (relationship.epistemic.label === 'Observed') {
    const block = anchoredBlock(`block:${relationship.id}`, [{ claimId: relationship.id, anchors: relationship.provenance.map(provenanceAnchor), captured: entityCaptured(relationship.epistemic) }]);
    return `<li${block.attrs}><span data-claim-provenance="${escapeHtml(relationship.id)}">${escapeHtml(fromTitle)} → ${escapeHtml(toTitle)}: ${escapeHtml(relationship.statement)}</span>${provenanceCitations(relationship.provenance, block.anchors)}</li>`;
  }
  return `<li class="unknown-disclosure" data-unknown-disclosure="${escapeHtml(relationship.id)}"${DISCLOSURE}>${escapeHtml(fromTitle)} → ${escapeHtml(toTitle)}: ${pocUnknownBody(relationship.id, relationship.epistemic, model)}</li>`;
}

function codeStructureSection(model: PocModel): string {
  const title = heading(3, 'polaris-region-code-structure', 'evidence.code-structure');
  if (model.codeStructure.kind === 'unknown') {
    return `<section class="claim-section" data-polaris-section="region:code-structure">
      ${title}
      <p class="unknown-disclosure" data-unknown-disclosure="region:code-structure"${DISCLOSURE}>${pocUnknownBody('region:code-structure', unknownSubject(model, 'region:code-structure'))}</p>
    </section>`;
  }
  const cs = model.codeStructure;
  const block = anchoredBlock('block:region:code-structure', [{
    claimId: 'region:code-structure',
    anchors: [{ targetClass: 'evidence', targetId: `git-tree:${cs.provenance.revision}`, revision: cs.provenance.revision, locator: 'git-ls-tree' }],
    captured: { label: 'Observed', tier: 'report-fact', reason: 'none' },
  }]);
  return `<section class="claim-section" data-polaris-section="region:code-structure">
    ${title}
    <p${block.attrs}><span data-claim-provenance="region:code-structure">The configured project's code structure was inventoried at revision ${escapeHtml(cs.provenance.revision.slice(0, 12))}, covering ${crossSurfaceLink({ model, nameForm: 'label-first', className: 'code-count', sourceId: 'region:code-structure', target: 'orrery', targetId: null, mountPrefix: activeMountPrefix, label: `${cs.files.length} files` })}.</span>
    <span class="citation">(<cite data-parity-field="provenance-source"${anchorAttrs(block.anchors[0] as NarrativeAnchor)}>git-ls-tree</cite>@<code data-parity-field="provenance-revision">${escapeHtml(cs.provenance.revision.slice(0, 12))}</code>)</span></p>
  </section>`;
}

function workItemsSection(model: PocModel): string {
  const title = heading(3, 'polaris-region-work-items', 'evidence.work-items');
  if (model.workItems.kind === 'unknown') {
    return `<section class="claim-section" data-polaris-section="region:work-items">
      ${title}
      <p class="unknown-disclosure" data-unknown-disclosure="region:work-items"${DISCLOSURE}>${pocUnknownBody('region:work-items', unknownSubject(model, 'region:work-items'))}</p>
    </section>`;
  }
  const wi = model.workItems;
  const block = anchoredBlock('block:region:work-items', [{
    claimId: 'region:work-items',
    anchors: [{ targetClass: 'work', targetId: `beads-dolt:${wi.provenance.revision}`, revision: wi.provenance.revision, locator: 'beads-dolt' }],
    captured: { label: 'Observed', tier: 'report-fact', reason: 'none' },
  }]);
  return `<section class="claim-section" data-polaris-section="region:work-items">
    ${title}
    <p${block.attrs}><span data-claim-provenance="region:work-items">${crossSurfaceLink({ model, nameForm: 'label-first', className: 'work-count', sourceId: 'region:work-items', target: 'trajectory', targetId: null, mountPrefix: activeMountPrefix, label: `${wi.items.length} work items` })} under the registered prefix <code>${escapeHtml(wi.beadPrefix)}-</code> were read from the Beads Dolt database at revision ${escapeHtml(wi.provenance.revision.slice(0, 12))}.</span>
    <span class="citation">(<cite data-parity-field="provenance-source"${anchorAttrs(block.anchors[0] as NarrativeAnchor)}>beads-dolt</cite>@<code data-parity-field="provenance-revision">${escapeHtml(wi.provenance.revision.slice(0, 12))}</code>)</span></p>
  </section>`;
}

// ---------------------------------------------------------------------------
// Project-shape renderers (PWB-REQ-010/011; RFC7-15, RFC7-16).

/** The per-claim tuple RFC7-16 and PWB-REQ-007 require beside every claim:
 * label, tier, primary reason, secondary reasons, freshness, challenge state
 * and the evaluation it belongs to — as attributes so a sweep can compare
 * them field by field to the machine answer, and as text for the reader.
 * Absent tier is an explicit absence. Missing freshness has no fifth value:
 * it stays outside the closed slot and can only accompany Unknown. */
function claimTuple(claim: ProjectShapeClaim): string {
  const tier = claim.epistemic.tier ?? 'unstated';
  const epistemic = claim.epistemic;
  const freshness = epistemic.freshness;
  if (freshness === undefined && epistemic.label !== 'Unknown') {
    throw new Error(`positive claim has no freshness: ${claim.claimId}`);
  }
  const primary = 'reasons' in epistemic ? epistemic.reasons.primary : 'basis' in epistemic ? epistemic.basis : 'none';
  const secondary = 'reasons' in epistemic ? epistemic.reasons.secondary : [];
  const reasonText = epistemic.label === 'Unknown'
    ? ` (${escapeHtml(primary)}${secondary.length === 0 ? '' : `; ${secondary.map(escapeHtml).join(', ')}`})`
    : '';
  const freshnessAttribute = freshness === undefined ? '' : ` data-epistemic-freshness="${escapeHtml(freshness)}"`;
  const freshnessText = freshness === undefined ? '' : ` · ${escapeHtml(freshness)}`;
  const absence = freshness === undefined
    ? `<span class="freshness-absence" data-unknown-disclosure="${escapeHtml(claim.claimId)}:currency" data-unknown-reason="no-currency-bound-declared"${DISCLOSURE}>Currency bound not declared; this claim remains Unknown. ${copy('label.route')} ${escapeHtml(UNKNOWN_REASON_ROUTES['no-currency-bound-declared'])}.</span>`
    : '';
  return `<span class="claim-tuple" data-claim-id="${escapeHtml(claim.claimId)}" data-epistemic-label="${escapeHtml(epistemic.label)}" data-epistemic-tier="${escapeHtml(tier)}" data-epistemic-primary-reason="${escapeHtml(primary)}" data-epistemic-secondary-reasons="${escapeHtml(secondary.join(','))}"${freshnessAttribute} data-challenge-state="${escapeHtml(claim.challenge)}" data-evaluation-id="${escapeHtml(claim.evaluationId)}" aria-describedby="polaris-claim-states-lede"${DISCLOSURE}>${escapeHtml(epistemic.label)}${reasonText} · ${escapeHtml(tier)}${freshnessText} · ${escapeHtml(claim.challenge)}</span>${tupleMarks(tier, freshness, claim.challenge)}${absence}`;
}

/** The declared treatment of each tuple field (syzygy-dov.3.2; P-70 M3
 * slice 5): the tuple's attributes select each value's symbol and token in
 * generated CSS (TUPLE_MARKS_CSS), so the only markup is one empty <i>
 * whose two pseudo-elements carry freshness and challenge. The tuple stays
 * one text node, so the words remain the carrier (RFC7-34) and the
 * PWB-REQ-020 sweep still reads it as a leaf; an undeclared value refuses
 * to render. */
function tupleMarks(tier: string, freshness: string | undefined, challenge: string): string {
  tupleFieldEncoding('tier', tier);
  if (freshness !== undefined) tupleFieldEncoding('freshness', freshness);
  tupleFieldEncoding('challenge', challenge);
  return '<i></i>';
}

/** PWB-REQ-007: an aggregate discloses its members' primary and secondary
 * Unknown reason counts separately, each with its route — never a headline
 * status, a maturity or a success. */
export function reasonCountsBlock(claimId: string, counts: ReasonCounts): string {
  const list = (which: 'primary' | 'secondary', entries: ReasonCounts['primary']): string => {
    const rows = reasonCountRows(entries);
    if (rows.length === 0) return '';
    return `<p${DISCLOSURE}>${copy(which === 'primary' ? 'label.primary-reasons' : 'label.secondary-reasons')}</p>
      <ul data-reason-counts-${which}="${escapeHtml(claimId)}"${DISCLOSURE}>${rows
        .map(([reason, count]) => `<li data-reason="${escapeHtml(reason)}" data-count="${count}">${unknownReasonRef(reason)}: ${count}. <details class="reason-remedies"><summary${copyAttr('label.source-remedies')}>${copy('label.source-remedies')} — ${escapeHtml(reason)} for ${escapeHtml(claimId)}</summary>${reasonRemedyHtml(reason)}</details></li>`)
        .join('')}</ul>`;
  };
  const primary = list('primary', counts.primary);
  const secondary = list('secondary', counts.secondary);
  const body = primary === '' && secondary === ''
    ? `<p${copyAttr('sentence.no-member-unknowns')}>${copy('sentence.no-member-unknowns')}</p>`
    : `${primary}${secondary}`;
  return `<div class="reason-counts" data-reason-counts="${escapeHtml(claimId)}">${body}</div>`;
}

/** Coverage counts stay available on demand, never as the default view. */
function onDemandCounts(claimId: string, text: string): string {
  const open = activeViewState.openCoverageCounts?.includes(claimId) === true ? ' open' : '';
  return `<details class="coverage-counts" data-coverage-counts="${escapeHtml(claimId)}"${open}><summary${copyAttr('label.coverage-counts')}>${copy('label.coverage-counts')} — ${escapeHtml(claimId)}</summary><p${FACT}>${text}</p></details>`;
}

/** The claim-state glossary (PWB-REQ-007; RFC2-25): every field of the
 * tuple beside each claim, in ordinary words, and the only routes that
 * strengthen a claim. One disclosure, once, described-by from every tuple. */
function claimStatesBlock(model: PocModel): string {
  const sentence = (id: PolarisCopyId): string => `<p${copyAttr(id)}>${copy(id)}</p>`;
  // Generated from the declared encodings (syzygy-dov.3.2): one row per
  // declared value, in its treatment class; a value that declares a
  // reachability note states it when no claim carries the value.
  const claims = shapeClaims(model.projectShape);
  const used = (entry: TupleFieldEncoding): boolean => claims.some((claim) => entry.field === 'freshness' ? claim.epistemic.freshness === entry.value : entry.field === 'tier' ? (claim.epistemic.tier ?? 'unstated') === entry.value : claim.challenge === entry.value);
  const group = (labelId: PolarisCopyId, entries: readonly TupleFieldEncoding[]): string =>
    `<p${copyAttr(labelId)}>${copy(labelId)}</p><ul>${entries.map((entry) => {
      const marker = entry.unreachable === undefined || used(entry) ? '' : ` ${entry.unreachable}`;
      return `<li class="${entry.className}"${copyAttr(entry.description)}>${escapeHtml(copyText(entry.description) + marker)}</li>`;
    }).join('')}</ul>`;
  // The legend's heading stands outside the disclosure, so the opening
  // index's claim-strength row (PWB-REQ-010, P-98) routes to a heading a
  // keyboard reader can continue from.
  return `<div class="claim-states-legend">${heading(3, 'polaris-claim-states-heading', 'states.heading')}<details id="polaris-claim-states" class="claim-states" data-polaris-claim-states>
    <summary${copyAttr('label.claim-states')}>${copy('label.claim-states')} — definitions</summary>
    <p class="lede" id="polaris-claim-states-lede"${copyAttr('states.lede')}>${copy('states.lede')}</p>
    ${sentence('states.observed')}
    ${sentence('states.inferred')}
    ${sentence('states.unknown')}
    ${group('states.tier', [...TIER_ENCODING, TIER_ABSENCE_ENCODING])}
    ${group('states.freshness', FRESHNESS_ENCODING)}
    ${group('states.challenge', CHALLENGE_ENCODING)}
    ${proposalLegend(model)}
    ${sentence('states.strengthen')}
  </details></div>`;
}

/** The proposal disclosure's glossary row, generated from its declaration
 * and kept apart from the claim states (syzygy-dov.3.2; P-70 M3 slice 6).
 * It states its reachability note exactly when no proposal is served. */
function proposalLegend(model: PocModel): string {
  const served = deriveCapabilityDeepDives(model).reduce((sum, dive) => sum + dive.proposals.length, 0);
  const entry = PROPOSAL_DISCLOSURE;
  const marker = served > 0 ? '' : ` ${entry.unreachable}`;
  return `<p${copyAttr('states.disclosures')}>${copy('states.disclosures')}</p><ul><li class="${entry.labelClassName}" data-disclosure-legend="${entry.value}" data-disclosure-served="${served}"${copyAttr(entry.description)}>${escapeHtml(copyText(entry.description) + marker)}</li></ul>`;
}

/** The tuple vocabulary glossed where it first appears (syzygy-u05.4;
 * S1-F1): each value of the first claim's tuple with its sentence from the
 * complete explanation, which still follows the overview. A value with no
 * sentence is left out here, as it is there. */
function tupleGloss(claim: ProjectShapeClaim): string {
  const epistemic = claim.epistemic;
  const label = `states.${epistemic.label.toLowerCase()}`;
  const fields = [
    tupleFieldEncoding('tier', epistemic.tier ?? 'unstated'),
    ...(epistemic.freshness === undefined ? [] : [tupleFieldEncoding('freshness', epistemic.freshness)]),
    tupleFieldEncoding('challenge', claim.challenge),
  ];
  const rows = [
    ...(hasCopyRow(label) ? [`<li${copyAttr(label)}>${copy(label)}</li>`] : []),
    ...fields.map((entry) => `<li class="${entry.className}"${copyAttr(entry.description)}>${copy(entry.description)}</li>`),
  ];
  return `<div class="tuple-gloss" data-polaris-tuple-gloss="${escapeHtml(claim.claimId)}"${DISCLOSURE}><p${copyAttr('gloss.tuple')}>${copy('gloss.tuple')}</p><ul>${rows.join('')}</ul><p><a href="#polaris-claim-states"${copyAttr('label.claim-states')}>${copy('label.claim-states')}</a></p></div>`;
}

/** The claim whose tuple the page renders first: Purpose's, else the whole
 * shape's. */
function firstTupleClaim(shape: ProjectShape): ProjectShapeClaim {
  if (shape.kind !== 'observed') return shape.claim;
  return shape.projectAccount.find((entry) => entry.key === 'purpose')?.claim ?? shape.claim;
}

function currencyProbeBand(model: PocModel): string {
  const evidence = model.evaluation.evidence;
  const probe = evidence.probe;
  const tuple = `${probe.epistemic.label} · ${probe.epistemic.tier} · unchallenged · probe ${probe.evaluationId}`;
  return `<section class="currency-probe" data-polaris-currency-probe aria-labelledby="polaris-currency-probe-heading">
    <h3 id="polaris-currency-probe-heading"${copyAttr('evidence.currency-probe')} data-presentation-artifact data-non-citable>${copy('evidence.currency-probe')}</h3>
    <p${copyAttr('evidence.currency-probe-disclosure')} data-presentation-artifact data-non-citable>${copy('evidence.currency-probe-disclosure')}</p>
    <p class="currency-probe-facts" data-copy-role="epistemic-disclosure" data-claim-role="epistemic-claim" data-presentation-artifact data-non-citable data-currency-probe-evaluation="${escapeHtml(probe.evaluationId)}" data-currency-probe-pinned="${escapeHtml(probe.pinnedRevision)}" data-currency-probe-current="${escapeHtml(probe.currentRevision)}" data-currency-probe-changed="${escapeHtml(String(probe.changedSources))}" data-currency-probe-added="${escapeHtml(String(probe.addedSources))}">
      Evaluated at revision <code>${escapeHtml(probe.pinnedRevision)}</code>; observation <code>${escapeHtml(evidence.observationInstant)}</code>; probe <code>${escapeHtml(probe.evaluationId)}</code>. Since that revision, <strong>${escapeHtml(String(probe.changedSources))} sources changed</strong> and <strong>${escapeHtml(String(probe.addedSources))} were added</strong>.
      <span data-currency-probe-tuple>${escapeHtml(tuple)}</span>
    </p>
  </section>`;
}

/** Progressive disclosure (PWB-REQ-011): an exhaustive population stays
 * complete on the page, behind one native disclosure whose control names
 * the population and its count. Nothing is hidden by style; the reader
 * opens it by keyboard. The sources table is not wrapped: its rows are
 * fragment targets, and Chrome restarts sequential focus at the first
 * focusable of a `<details>` after navigating to a target inside it, so a
 * reader who follows a citation could not continue past the row. The
 * sources table is routed instead — the last depth, reached by the depth
 * list and by citations. */
function population(kind: 'items' | 'exclusions', key: string, count: number, labelId: PolarisCopyId, inner: string): string {
  return `<details class="population" data-polaris-${kind}="${escapeHtml(key)}"><summary${copyAttr(labelId)}>${copy(labelId)} (${count}) — ${escapeHtml(key)}</summary>${inner}</details>`;
}

/** The href remains the identity carrier; the label names the same row's path. */
function exactTextLink(identity: string, path: string): string {
  return `<a href="${escapeHtml(sourceRouteHref(activeMountPrefix, identity))}"${copyAttr('label.exact-text')}>${copy('label.exact-text')} — ${escapeHtml(path)}</a>`;
}

function tupleLine(claim: ProjectShapeClaim): string {
  return `<p class="tuple-line"${DISCLOSURE}>${claimTuple(claim)}</p>`;
}

function shortDigest(digest: string): string {
  return digest.replace(/^sha256:/, '').slice(0, 12);
}

/** Exact-source citations: path, line and the exact content digest of the
 * bytes the claim was read from, each linked to its source row below. */
function supportCitations(support: readonly ProjectShapeSupport[], anchors: readonly NarrativeAnchor[]): string {
  if (support.length === 0) {
    return '';
  }
  const items = support
    .map((anchor, index) => {
      const where = anchor.line === undefined ? anchor.path : `${anchor.path}:${anchor.line}`;
      const digest = anchor.contentDigest === undefined ? '' : `@<code data-parity-field="shape-anchor-digest">${escapeHtml(shortDigest(anchor.contentDigest))}</code>`;
      return `<a href="#polaris-source-${escapeHtml(sourceSlug(anchor.path))}"><cite data-parity-field="shape-anchor"${anchorAttrs(anchors[index] as NarrativeAnchor)}>${escapeHtml(where)}</cite></a>${digest}`;
    })
    .join(', ');
  return ` <span class="citation">(${items})</span>`;
}

/** One anchored block for one Observed shape claim: its support anchors,
 * bound to the evaluated revision, with the claim's own captured state. */
function shapeClaimBlock(claim: ProjectShapeClaim, revision: string, targetClass: AnchorTargetClass = 'evidence', blockId = `block:${claim.claimId}`): { readonly attrs: string; readonly anchors: readonly NarrativeAnchor[] } {
  const anchors = claim.support.map((support) => supportAnchor(support, revision, targetClass)).filter((anchor): anchor is AnchorInput => anchor !== undefined);
  return anchoredBlock(blockId, [{ claimId: claim.claimId, anchors, captured: capturedStateOf(claim) }]);
}

/** The cause-correct route for one exclusion: what produced it and what,
 * in Butlers or by the owner, resolves it. A parse failure is a repair in
 * Butlers or an owner gate on the grammar, never a policy change; a detector
 * match is a rotation in Butlers or an owner change to that detector. */
function excludedCauseRoute(exclusion: Exclusion): string {
  const path = exclusion.repositoryRelativePath;
  if (exclusion.detectorId !== undefined) {
    return `${path} matched the ${exclusion.detectorId} detector: rotate and remove the matched text in Butlers, then a new snapshot; or an owner policy change to that detector`;
  }
  switch (exclusion.exclusionReason) {
    case 'parse-failure':
      return `${path} does not parse under the declared grammar${exclusion.detail === undefined ? '' : ` (${exclusion.detail})`}: repair the row in Butlers, then a new snapshot; or an owner gate amending the grammar. No policy change is involved`;
    case 'active-content':
      return `${path} carries active content${exclusion.detail === undefined ? '' : ` (${exclusion.detail} marker(s))`}: remove it in Butlers, then a new snapshot; or an owner policy change admitting it`;
    case 'resource-limit':
      return `${path} exceeds a declared resource limit: reduce the source in Butlers, then a new snapshot; or an owner act raising the limit`;
    case 'denied-path':
      return `${path} is a denied path: only an owner policy change admits it`;
    case 'contains-nul':
    case 'not-utf-8':
      return `${path} is not UTF-8 text: make it text in Butlers, then a new snapshot`;
    case 'unknown-extraction-class':
      return `${path} names no registered extraction class: an owner registry change, then a new snapshot`;
    default:
      return `${path}: ${UNKNOWN_REASON_ROUTES['excluded-content']}`;
  }
}

function unavailableCauseRoute(source: { readonly path: string; readonly reason: string }): string {
  return `${source.path} was not captured (${source.reason}): repair the observer or the source in Butlers, then a new snapshot`;
}

/** The routes by cause for one reason over a set of paths: the exclusions
 * or uncaptured sources among them, or all of the evaluation's when the
 * claim's support does not name one. Undefined when the evaluation records
 * no cause of that kind. */
function causeRoutes(reason: string, paths: ReadonlySet<string> | undefined): readonly string[] | undefined {
  if (reason === 'excluded-content') {
    const own = paths === undefined ? [] : activeExclusions.filter((exclusion) => paths.has(exclusion.repositoryRelativePath));
    const matched = own.length > 0 ? own : activeExclusions;
    return matched.length === 0 ? undefined : [...new Set(matched.map(excludedCauseRoute))];
  }
  if (reason === 'source-uncaptured-or-unreachable') {
    const own = paths === undefined ? [] : activeUnavailable.filter((source) => paths.has(source.path));
    const matched = own.length > 0 ? own : activeUnavailable;
    return matched.length === 0 ? undefined : [...new Set(matched.map(unavailableCauseRoute))];
  }
  return undefined;
}

/** A reason-count record's rows, in its own key order, with a positive
 * count. `Object.entries` widens keys to `string`; a `ReasonCounts` record is
 * keyed by its reasons, so the rows keep that type. */
function reasonCountRows(counts: ReasonCounts['primary']): readonly (readonly [UnknownReason, number])[] {
  return (Object.entries(counts) as [UnknownReason, number | undefined][]).filter((entry): entry is [UnknownReason, number] => typeof entry[1] === 'number' && entry[1] > 0);
}

/** `deferred` stands for a claim with no Unknown reasons; it has no generic
 * route, so only its causes or the no-route label can answer. */
function routeOf(claim: ProjectShapeClaim, reason: UnknownReason | 'deferred'): string {
  const causes = causeRoutes(reason, new Set(claim.support.map((support) => support.path)));
  if (causes !== undefined) return causes.join('; ');
  const route = claim.resolutionRoutes.find((entry) => entry.reason === reason)?.route;
  return route ?? (reason === 'deferred' ? copyText('label.no-route') : UNKNOWN_REASON_ROUTES[reason]);
}

/** The route text of one reason in the gaps list: the generic route, then
 * the evaluation's causes when it records any, so the reader reaches the
 * actual cause without leaving the list. */
function reasonRouteHtml(reason: UnknownReason): string {
  const generic = UNKNOWN_REASON_ROUTES[reason];
  const causes = causeRoutes(reason, undefined);
  if (causes === undefined) return `${escapeHtml(generic)}.`;
  // The gaps entry lists one cause per item (syzygy-u05.4; S4-F5); the
  // reason counts split lead and list instead (reasonRouteParts), since a
  // list cannot sit in their <p>.
  return `${escapeHtml(generic)}. <span${copyAttr('label.by-cause')}>${copy('label.by-cause')}</span><ul data-polaris-gap-causes="${causes.length}">${causes.map((cause) => `<li>${escapeHtml(cause)}.</li>`).join('')}</ul>`;
}

function reasonRemedyHtml(reason: UnknownReason): string {
  const { lead, list } = reasonRouteParts(reason);
  return `<p>${copy('label.route')} ${lead}</p>${list}`;
}

/** The route split at the block boundary: `lead` is inline text, safe in a
 * paragraph; `list` is empty unless two or more causes are recorded, when it
 * is an ordered list that must follow the paragraph, never sit inside it.
 * <ol>, not <ul>: the reason-counts oracles end a block at its first </ul>. */
function reasonRouteParts(reason: UnknownReason): { lead: string; list: string } {
  const generic = UNKNOWN_REASON_ROUTES[reason];
  const causes = causeRoutes(reason, undefined);
  if (causes === undefined) return { lead: `${escapeHtml(generic)}.`, list: '' };
  const byCause = `<span${copyAttr('label.by-cause')}>${copy('label.by-cause')}</span>`;
  if (causes.length === 1) return { lead: `${escapeHtml(generic)}. ${byCause} ${escapeHtml(causes[0] as string)}.`, list: '' };
  return {
    lead: `${escapeHtml(generic)}. ${byCause}`,
    list: `<ol class="cause-routes">${causes.map((cause) => `<li>${escapeHtml(cause)}.</li>`).join('')}</ol>`,
  };
}

/** `place` names where a disclosure sits when one claim's disclosure renders
 * in several sections (an unobserved shape's claim stands in for each), so
 * each disclosure's accessible name stays distinct (PWB-REQ-016, P-99). */
function unknownRoutes(claim: ProjectShapeClaim, prefix: string, place?: string): string {
  if (!('reasons' in claim.epistemic)) {
    return `<p class="unknown-disclosure" data-unknown-disclosure="${escapeHtml(claim.claimId)}"${DISCLOSURE}>${prefix}${copy('label.unknown')} — ${copy('label.deferred')}.</p>`;
  }
  const { primary, secondary } = claim.epistemic.reasons;
  const secondaryLine = secondary.length === 0
    ? ''
    : `<br><small>${copy('label.also')} ${secondary.map((reason) => `${escapeHtml(reason)} (${copy('label.route').toLowerCase()} ${escapeHtml(routeOf(claim, reason))})`).join('; ')}</small>`;
  return `<div class="unknown-disclosure" data-unknown-disclosure="${escapeHtml(claim.claimId)}"${DISCLOSURE}><p>${prefix.startsWith('Declared by ') ? '' : prefix}${copy('label.unknown')} — ${unknownReasonRef(primary)}.</p><details class="unknown-source-details"><summary aria-label="${escapeHtml(`${copyText('label.source-remedies')} — ${claim.claimId}${place === undefined ? '' : ` — ${place}`}`)}"${copyAttr('label.source-remedies')}>${copy('label.source-remedies')}</summary><p>${prefix.startsWith('Declared by ') ? prefix : ''}${copy('label.route')} ${escapeHtml(routeOf(claim, primary))}.${secondaryLine}</p></details></div>`;
}

function readingFigure(figure: ReadingFigure, anchorId?: string): string {
  const diagram = renderPolarisMarkdown('```flow\n' + figure.nodes.join(' --> ') + '\n```', anchorId);
  return `<figure id="polaris-diagram-${escapeHtml(figure.id)}" class="source-figure" data-diagram-id="${escapeHtml(figure.id)}" data-visual-provenance="curated"><figcaption${SCOPE}><span class="figure-kicker">Declared architecture</span><h4>${escapeHtml(figure.title)}</h4></figcaption>${diagram}<details class="figure-explanation"><summary${SCOPE}>Read the diagram explanation</summary><div class="reading-prose">${renderPolarisMarkdown(figure.explanation, anchorId, 4)}</div></details></figure>`;
}

function introductoryDiagram(shape: Extract<ProjectShape, { kind: 'observed' }>): string {
  const statement = shape.projectAccount.find((entry) => entry.key === 'architecture');
  if (statement?.claim.epistemic.label !== 'Observed' || statement.statement === undefined) return '';
  const figure = projectReading(statement.statement, 'architecture').figures?.find((entry) => entry.id === 'core-loop');
  if (figure === undefined) return '';
  const block = shapeClaimBlock(statement.claim, shape.identity.revision, 'evidence', `diagram:${statement.claim.claimId}`);
  return `<section class="introductory-diagram"${block.attrs}><div data-claim-provenance="${escapeHtml(statement.claim.claimId)}">${readingFigure(figure, block.anchors.length === 1 ? block.anchors[0]!.anchorId : undefined)}</div><details class="reading-citations"><summary${copyAttr('label.source-notes')}>${copy('label.source-notes')} — ${escapeHtml(figure.title)}</summary>${supportCitations(statement.claim.support, block.anchors)}</details></section>`;
}

export function renderProjectReading(reading: ProjectReading, anchorId?: string): string {
  const withdrawal = reading.withdrawalReason === undefined
    ? ''
    : `<p class="reading-withdrawal" data-reading-withdrawal="${escapeHtml(reading.withdrawalReason)}" data-copy-role="epistemic-disclosure" data-claim-role="epistemic-claim" data-presentation-artifact data-non-citable>Reviewed selection withdrawn: <code>${escapeHtml(reading.withdrawalReason)}</code>. The complete declaration is shown; re-review the selection against the current bytes before condensing it again.</p>`;
  const label = reading.condensed ? `<p class="excerpt-label"${copyAttr('label.selected-passages')}>${copy('label.selected-passages')}</p>` : '';
  const chapters = reading.chapters;
  const full = chapters !== undefined
    ? `<section class="component-library"><h4${copyAttr('label.component-guides')}>${copy('label.component-guides')}</h4><button type="button" class="expand-declaration" aria-expanded="false"${copyAttr('label.full-account')}>${copy('label.full-account')}</button><div class="component-guides">${chapters.map((chapter) => `<section id="polaris-guide-${escapeHtml(chapter.id)}" data-component-guide><details><summary>${escapeHtml(chapter.title)}</summary><div class="reading-prose">${renderPolarisMarkdown(chapter.body, anchorId, 4)}</div></details></section>`).join('')}</div></section>`
    : reading.condensed ? `<details class="full-account"><summary${copyAttr('label.full-account')}>${copy('label.full-account')}</summary><div class="reading-prose">${renderPolarisMarkdown(reading.full, anchorId)}</div></details>` : '';
  const figures = (reading.figures ?? []).filter((figure) => figure.id !== 'core-loop').map((figure) => readingFigure(figure, anchorId)).join('');
  return `${figures}${withdrawal}${label}<div class="reading-prose">${renderPolarisMarkdown(reading.summary, anchorId)}</div>${full}`;
}

function accountStatement(statement: ProjectAccountStatement, revision: string): string {
  const body = statement.claim.epistemic.label === 'Observed' && statement.statement !== undefined
    ? ((): string => {
        const block = shapeClaimBlock(statement.claim, revision);
        const reading = projectReading(statement.statement, statement.key);
        return `<div class="account-reading"${block.attrs}><div data-claim-provenance="${escapeHtml(statement.claim.claimId)}">${renderProjectReading(reading, block.anchors.length === 1 ? block.anchors[0]!.anchorId : undefined)}</div><details class="reading-citations"><summary${copyAttr('label.source-notes')}>${copy('label.source-notes')} — ${escapeHtml(statement.key)}</summary>${supportCitations(statement.claim.support, block.anchors)}</details></div>`;
      })()
    : unknownRoutes(statement.claim, '', copyText(`account.${statement.key}`));
  return `<section class="claim-section" data-polaris-section="${escapeHtml(statement.claim.claimId)}">
    ${heading(3, `polaris-account-${statement.key}`, `account.${statement.key}`)}
    ${body}
    ${tupleLine(statement.claim)}
  </section>`;
}

function itemRow(item: ProjectShapeItem, revision: string): string {
  const block = item.claim.epistemic.label === 'Observed' ? shapeClaimBlock(item.claim, revision) : undefined;
  const identity = item.claim.support[0]?.sourceIdentity;
  const exact = block !== undefined && item.class === 'baseline-spec' && identity !== undefined && activeExactSources.has(identity) ? ` ${exactTextLink(identity, item.claim.support[0]!.path)}` : '';
  const statement = block !== undefined
    ? `<div class="reading-prose" data-claim-provenance="${escapeHtml(item.claim.claimId)}">${renderPolarisMarkdown(item.statement ?? item.key)}</div>${supportCitations(item.claim.support, block.anchors)}${exact}`
    : unknownRoutes(item.claim, '');
  // The key cell takes the table region's role (declared once on the region,
  // classBlock); the tuple cell holds only the tuple span, which declares its
  // own. The declared cell is the row's one narrative unit.
  return `<tr data-polaris-item="${escapeHtml(item.claim.claimId)}"><td><code>${escapeHtml(item.key)}</code></td><td${block?.attrs ?? FACT}>${statement}</td><td>${claimTuple(item.claim)}</td></tr>`;
}

/** One compact entry for an item whose extractor captures no statement (the
 * key is the whole declaration: baseline specs, design contracts, craft
 * policies, roster identities). It is the table row it replaces — the same
 * item marker, citations, exact-text link and tuple — without a "declared"
 * cell repeating the key. The fact role sits once on the enclosing list
 * (classBlock); the entry inherits it and the tuple span declares its own. */
function itemEntry(item: ProjectShapeItem, revision: string): string {
  const block = item.claim.epistemic.label === 'Observed' ? shapeClaimBlock(item.claim, revision) : undefined;
  const identity = item.claim.support[0]?.sourceIdentity;
  const exact = block !== undefined && item.class === 'baseline-spec' && identity !== undefined && activeExactSources.has(identity) ? ` ${exactTextLink(identity, item.claim.support[0]!.path)}` : '';
  const support = block !== undefined
    ? `<span class="item-support"${block.attrs}><span data-claim-provenance="${escapeHtml(item.claim.claimId)}">${supportCitations(item.claim.support, block.anchors)}</span>${exact}</span>`
    : unknownRoutes(item.claim, '');
  return `<li data-polaris-item="${escapeHtml(item.claim.claimId)}"><code>${escapeHtml(item.key)}</code> ${support} ${claimTuple(item.claim)}</li>`;
}

export const WITHOUT_ROOT_INDEX_SENTENCE = 'Derived without a read root index.';

export function denominatorText(aggregate: Pick<ProjectShapeClassAggregate, 'denominator' | 'modeled' | 'unknown' | 'contradicted' | 'sourcesWithUnknownDenominator'> & { readonly withoutReadRootIndex?: boolean }): string {
  const denominator = aggregate.denominator.kind === 'known'
    ? `${aggregate.denominator.value} declared`
    : `denominator Unknown (${[...aggregate.denominator.reasons, ...(aggregate.denominator.unenumerated === undefined ? [] : [`${aggregate.denominator.unenumerated.reason}: ${aggregate.denominator.unenumerated.headings}`])].join(', ')})`;
  return `${denominator}; ${aggregate.modeled} modeled, ${aggregate.unknown} Unknown, ${aggregate.contradicted} contradicted; ${aggregate.sourcesWithUnknownDenominator} source(s) unreadable.${aggregate.withoutReadRootIndex === true ? ` ${WITHOUT_ROOT_INDEX_SENTENCE}` : ''}`;
}

// PWB-REQ-002 (class-granular): each class's own outcome in a source that is
// partially extracted or carries an unenumerated heading, so the page says
// which class failed and which read.
function classOutcomesLine(source: ProjectShapeSource): string {
  if (!source.partiallyExtracted && source.unenumeratedHeadings.length === 0) return '';
  const parts = source.classOutcomes.map((outcome) => {
    const d = outcome.denominator;
    if (d.kind === 'known') return `${escapeHtml(outcome.class)}: ${d.value} item(s)`;
    const count = d.unenumeratedHeadings === undefined ? '' : ` (${d.unenumeratedHeadings} unenumerated heading(s))`;
    return `${escapeHtml(outcome.class)}: Unknown — ${escapeHtml(d.reason)}${count}`;
  });
  // The source's own item denominator is Unknown with the signed reason word
  // and the count, beside the closed reason its claim already carries.
  const own = source.itemDenominator.kind === 'unknown' && source.itemDenominator.unenumeratedHeadings !== undefined
    ? `Source item denominator Unknown — unenumerated-heading (${source.itemDenominator.unenumeratedHeadings}). `
    : '';
  return `<br><small data-source-class-outcomes="${escapeHtml(source.path)}"${DISCLOSURE}>${source.partiallyExtracted ? 'Partially extracted. ' : ''}${own}${parts.join('; ')}.</small>`;
}

// Surfaced, never skipped: each heading no grammar row declares, with its
// level, exact line and a link to its source.
function unenumeratedHeadingsList(shape: Extract<ProjectShape, { kind: 'observed' }>): string {
  if (shape.unenumeratedHeadings.length === 0) return '';
  return `<ul data-polaris-unenumerated="${shape.unenumeratedHeadings.length}">${shape.unenumeratedHeadings
    .map((heading) => `<li${DISCLOSURE}>Unenumerated heading <code>${escapeHtml('#'.repeat(heading.level))} ${escapeHtml(heading.text)}</code> (${escapeHtml(heading.class)}) — ${sourceRef(heading.path, `${heading.path}:${heading.line}`)}; the grammar has no row for it and mints no item; route: ${escapeHtml(heading.claim.resolutionRoutes[0]?.route ?? '')}.</li>`)
    .join('')}</ul>`;
}

/** The aggregate's statement: which admitted sources declare this class —
 * a fact about the sources, not a count wall or a status. */
function classStatement(shape: Extract<ProjectShape, { kind: 'observed' }>, cls: ExtractionClass): string {
  const aggregate = shape.classes[cls];
  const declaring = shape.sources.filter((source) => source.extractionClasses.includes(cls)).map((source) => source.path);
  if (declaring.length === 0 && aggregate.denominator.kind === 'unknown') return 'Source discovery is incomplete for this class.';
  return declaring.length === 0 ? 'No admitted source declares this class.' : `Declared by ${declaring.join(', ')}.`;
}

function capabilityGuide(shape: Extract<ProjectShape, { kind: 'observed' }>): string {
  const groups = new Map<string, ProjectShapeItem[]>();
  for (const item of shape.items.filter((item) => item.class === 'catalog-entry')) {
    const context = item.context ?? copyText('class.catalog-entry');
    const group = groups.get(context) ?? [];
    group.push(item);
    groups.set(context, group);
  }
  const practicalOrder = ['Butlers', 'Staffers', 'Dashboard', 'Connectors'];
  const rank = (context: string): number => { const index = practicalOrder.indexOf(context); return index < 0 ? practicalOrder.length : index; };
  const entries = [...groups.entries()].sort(([a], [b]) => rank(a) - rank(b));
  return `<section class="capability-guide" id="polaris-capability-guide">
    <p class="guide-intro"${copyAttr('label.guide-intro')}>${copy('label.guide-intro')} <a href="#polaris-class-catalog-entry"${copyAttr('label.complete-catalog')}>${copy('label.complete-catalog')}</a></p>
    <div class="guide-grid">${entries.map(([context, members]) => {
      const guideId = `polaris-guide-context-${sourceSlug(context)}-${sha256(context).slice(0, 12)}`;
      const example = members.find((item) => item.claim.epistemic.label === 'Observed' && item.statement !== undefined);
      if (example === undefined) return `<section class="guide-entry"><h3 id="${escapeHtml(guideId)}"${FACT}>${escapeHtml(context)}</h3><p${SCOPE}>${copy('label.complete-catalog')}</p></section>`;
      const block = shapeClaimBlock(example.claim, shape.identity.revision, 'evidence', `guide:${example.claim.claimId}`);
      return `<section class="guide-entry"><h3 id="${escapeHtml(guideId)}"${FACT}>${escapeHtml(context)}</h3><div${block.attrs}><div class="reading-prose" data-claim-provenance="${escapeHtml(example.claim.claimId)}">${renderPolarisMarkdown(example.statement as string)}</div><details class="reading-citations"><summary${copyAttr('label.source-notes')}>${copy('label.source-notes')} — ${escapeHtml(context)}</summary>${supportCitations(example.claim.support, block.anchors)}</details></div><details class="guide-state"><summary${DISCLOSURE}>${escapeHtml(example.claim.epistemic.label)} — ${escapeHtml(context)}</summary>${claimTuple(example.claim)}</details></section>`;
    }).join('')}</div>
  </section>`;
}

function classBlock(shape: Extract<ProjectShape, { kind: 'observed' }>, cls: ExtractionClass, withItems: boolean): string {
  const aggregate = shape.classes[cls];
  const items = shape.items.filter((item) => item.class === cls);
  const table = !withItems
    ? ''
    : items.length === 0
      ? `<p${copyAttr('sentence.no-items')}><small>${copy('sentence.no-items')}</small></p>`
      : items.every((item) => item.statement === undefined)
        ? population('items', cls, items.length, 'label.show-items', `<ul class="item-list"${FACT}>${items.map((item) => itemEntry(item, shape.identity.revision)).join('')}</ul>`)
        : population('items', cls, items.length, 'label.show-items', tableRegion(`polaris-class-${cls}`, `<table><thead><tr><th scope="col"${copyAttr('table.key')}>${copy('table.key')}</th><th scope="col"${copyAttr('table.declared')}>${copy('table.declared')}</th><th scope="col"${copyAttr('table.epistemic-state')}>${copy('table.epistemic-state')}</th></tr></thead><tbody>${items.map((item) => itemRow(item, shape.identity.revision)).join('')}</tbody></table>`, FACT));
  const summary = aggregate.claim.epistemic.label === 'Observed'
    ? ((): string => {
        const block = shapeClaimBlock(aggregate.claim, shape.identity.revision);
        const contexts = cls === 'catalog-entry' ? [...new Set(items.map((item) => item.context).filter((context): context is string => context !== undefined))] : [];
        const guide = contexts.length === 0 ? '' : `<ul class="catalog-contexts">${contexts.map((context) => `<li>${escapeHtml(context)}</li>`).join('')}</ul>`;
        return `<details class="class-provenance"><summary${copyAttr('label.source-notes')}>${copy('label.source-notes')} — ${escapeHtml(cls)}</summary><div${block.attrs}><div data-claim-provenance="${escapeHtml(aggregate.claim.claimId)}">${guide}<p>${escapeHtml(classStatement(shape, cls))}</p></div>${supportCitations(aggregate.claim.support, block.anchors)}</div></details>`;
      })()
    : unknownRoutes(aggregate.claim, `${escapeHtml(classStatement(shape, cls))} `);
  return `<section class="claim-section" data-polaris-section="${escapeHtml(aggregate.claim.claimId)}" data-polaris-class="${escapeHtml(cls)}">
    ${heading(3, `polaris-class-${cls}`, `class.${cls}`)}
    ${summary}
    ${tupleLine(aggregate.claim)}
    ${reasonCountsBlock(aggregate.claim.claimId, aggregate.reasonCounts)}
    ${onDemandCounts(aggregate.claim.claimId, escapeHtml(denominatorText(aggregate)))}
    ${table}
  </section>`;
}

function accountByKey(shape: Extract<ProjectShape, { kind: 'observed' }>, key: ProjectAccountKey): string {
  const statement = shape.projectAccount.find((entry) => entry.key === key);
  if (statement === undefined) {
    // The model always carries all six keys; an absent one is a defect in
    // the model, disclosed as such rather than hidden.
    return `<section class="claim-section" data-polaris-section="claim:project-account:${escapeHtml(key)}">
      ${heading(3, `polaris-account-${key}`, `account.${key}`)}
      <p class="unknown-disclosure" data-unknown-disclosure="claim:project-account:${escapeHtml(key)}"${DISCLOSURE}>${copy('label.unknown')} — ${copy('sentence.missing-statement')}</p>
    </section>`;
  }
  return accountStatement(statement, shape.identity.revision);
}

function shapeUnknownBlock(shape: Exclude<ProjectShape, { kind: 'observed' }>, group: PolarisGroup): string {
  let detail: string;
  switch (shape.kind) {
    case 'not-evaluated':
      detail = `<p${DISCLOSURE}><small>${copy('sentence.not-evaluated')} ${escapeHtml(shape.detail)}</small></p>`;
      break;
    case 'not-admitted':
      detail = `<p${DISCLOSURE}><small>${copy('sentence.gate-refused')} (${escapeHtml(shape.reason)}${shape.secondaryReasons.length === 0 ? '' : `; ${copy('label.also').toLowerCase()} ${escapeHtml(shape.secondaryReasons.join(', '))}`}). ${escapeHtml(shape.contradiction.clause)}: ${escapeHtml(shape.contradiction.statement)}</small></p>`;
      break;
    case 'observation-failed':
      detail = `<p${DISCLOSURE}><small>${copy('sentence.observer-failed')}${shape.failure.failureState === undefined ? '' : ` (${escapeHtml(shape.failure.failureState)})`}: ${escapeHtml(shape.failure.detail)}</small></p>`;
      break;
  }
  return `<section class="claim-section" data-polaris-section="shape:${escapeHtml(group)}">
    ${unknownRoutes(shape.claim, '', copyText(`group.${group}`))}
    ${detail}
    ${shape.authority === undefined || group !== 'overview' ? '' : authorityLine(shape.authority)}
    ${tupleLine(shape.claim)}
  </section>`;
}

/** PWB-REQ-005/020: every body-read authority's state, the authorization
 * mode and the evaluation the states belong to, each as its own parity
 * marker so the human channel keeps one marker per authority (multiplicity)
 * and names the evaluation it was disclosed at. */
/** The cause-correct route for one Unknown pillar (PWB-RECON-02): what
 * phase A could not find and what, in Butlers or by owner gate, would
 * resolve it. Exhaustive over the closed reason set by type. */
function pillarRoute(pillar: Extract<PillarDiscovery, { state: 'unknown' }>): string {
  const home = pillar.root === undefined ? 'its home' : pillar.root;
  const index = pillar.indexPath === undefined ? 'its index' : pillar.indexPath;
  switch (pillar.reason) {
    case 'root-index-missing-at-revision':
      return 'the root index is absent at this revision, so no pillar home is named: restore it in Butlers, then a new snapshot';
    case 'root-index-unavailable':
      return `the root index could not be read${pillar.detail === undefined ? '' : ` (${pillar.detail})`}: restore its body in Butlers, then a new snapshot`;
    case 'not-named-in-root-index':
      return 'the root index names no home for this pillar: add its link in Butlers, then a new snapshot; or an owner gate amending the pillar set';
    case 'named-root-ambiguous':
      return 'the root index names more than one home for this pillar: keep exactly one in Butlers, then a new snapshot';
    case 'root-missing-at-revision':
      return `the named home ${home} is absent at this revision: create it in Butlers, then a new snapshot`;
    case 'index-missing-at-revision':
      return `the home ${home} carries no index at ${index} at this revision: add that index in Butlers, then a new snapshot; or an owner gate amending the discovery rule. No policy change is involved`;
    case 'index-unavailable':
      return `the index ${index} could not be read${pillar.detail === undefined ? '' : ` (${pillar.detail})`}: restore its body in Butlers, then a new snapshot`;
  }
}

/** One marker per pillar with its discovery state; an Unknown pillar adds
 * its reason marker and the route, a discovered one its index and count. */
function discoveryLine(discovery: readonly PillarDiscovery[]): string {
  const entries = discovery
    .map((pillar) => {
      const state = `<span data-parity-field="shape-pillar-state" data-pillar="${escapeHtml(pillar.key)}">${escapeHtml(pillar.key)} — ${escapeHtml(pillar.state)}</span>`;
      if (pillar.state === 'discovered') return `${state} (${escapeHtml(pillar.indexPath)}, ${pillar.namedSources} named)`;
      return `${state} (<span data-parity-field="shape-pillar-reason" data-pillar="${escapeHtml(pillar.key)}">${escapeHtml(pillar.reason)}</span>; ${copy('label.route').toLowerCase()} ${escapeHtml(pillarRoute(pillar))})`;
    })
    .join('; ');
  return `<p${DISCLOSURE} data-shape-discovery><small>${copy('label.discovery')} ${entries}.</small></p>`;
}

/** The observation's degradation state, or the sentence that none was
 * recorded — never silence in either case. */
function degradationLine(degradation: ObservationDegradation | undefined): string {
  if (degradation === undefined) return `<p data-shape-degradation="none"${copyAttr('sentence.no-degradation')}><small>${copy('sentence.no-degradation')}</small></p>`;
  return `<p${DISCLOSURE} data-shape-degradation="${escapeHtml(degradation.failureState)}"><small>${copy('label.degradation')} <span data-parity-field="shape-degradation-state">${escapeHtml(degradation.degradationState)}</span> (${escapeHtml(degradation.failureState)}; ${escapeHtml(degradation.detail)}).</small></p>`;
}

function authorityLine(authority: AuthorityDisclosure): string {
  // PWB-REQ-005 on the human surface (PWB-RECON-01): every authority's
  // state and, beside it, its exact disclosure sentence — state (1) renders
  // the quoted sentence verbatim, the machine answer carries the same
  // string, and the parity sweep compares the two per authority.
  const entries = authority.authorities
    .map((entry) => `<span data-parity-field="authority-state" data-authority="${escapeHtml(entry.authority)}">${escapeHtml(entry.authority)} — ${escapeHtml(entry.state)}</span> (<span data-parity-field="authority-disclosure" data-authority="${escapeHtml(entry.authority)}">${escapeHtml(entry.disclosure)}</span>)`)
    .join('; ');
  const mayNot = authority.mayNot
    .map((row) => `<li data-copy-role="epistemic-disclosure" data-claim-role="epistemic-claim" data-presentation-artifact data-non-citable data-authority-may-not-id="${escapeHtml(row.id)}"><code data-parity-field="authority-may-not-id">${escapeHtml(row.id)}</code>: <span data-parity-field="authority-may-not-statement">${escapeHtml(row.statement)}</span>${row.actIdentity === undefined ? '' : ` <span data-parity-field="authority-may-not-act">${escapeHtml(row.actIdentity)}</span>`}${row.artifactDigest === undefined ? '' : ` <code data-parity-field="authority-may-not-digest">${escapeHtml(row.artifactDigest)}</code>`}</li>`)
    .join('');
  return `<p${DISCLOSURE} data-authority-evaluation><small>${copy('label.authority')} ${entries} (<span data-parity-field="authority-mode">${escapeHtml(authority.authorizationMode)}</span>), ${copy('label.evaluated-as')} <code data-parity-field="authority-evaluation-id">${escapeHtml(authority.evaluationId)}</code>.</small></p><ul class="authority-may-not-list">${mayNot}</ul>`;
}

/** PWB-REQ-021/022 on the one surface: the owner's cold-open walkthrough
 * judgment exactly as the evaluator carried it. Every state, label,
 * disclosure sentence, digest and traversed path is its own parity marker;
 * a lawful verdict is recorded human judgment — presented under the
 * epistemic-disclosure role, never as a project fact or a score. */
function walkthroughJudgmentSection(model: PocModel): string {
  const judgment = model.walkthroughJudgment;
  const head = heading(3, 'polaris-walkthrough-judgment', 'evidence.walkthrough');
  if (judgment.kind === 'not-evaluated') {
    return `<section class="claim-section" data-polaris-section="walkthrough-judgment" data-judgment-state="not-evaluated">
    ${head}
    <p${DISCLOSURE}><small>${copy('sentence.judgment-not-evaluated')} <span data-parity-field="judgment-detail">${escapeHtml(judgment.detail)}</span></small></p>
  </section>`;
  }
  const { evaluation } = judgment;
  const outcome = evaluation.outcome;
  const evaluated = `<p${DISCLOSURE}><small>${copy('label.judgment-evaluation')} <code data-parity-field="judgment-evaluation-id">${escapeHtml(evaluation.evaluationId)}</code> ${copy('label.at')} <code data-parity-field="judgment-evaluation-instant">${escapeHtml(evaluation.evaluationInstant)}</code>; ${copy('label.outcome')} <span data-parity-field="judgment-kind">${escapeHtml(outcome.kind)}</span>.</small></p>`;
  let body: string;
  switch (outcome.kind) {
    case 'absent':
      body = `<p${DISCLOSURE}><small>${copy('sentence.judgment-absent')} (<span data-parity-field="judgment-absent-what">${escapeHtml(outcome.what)}</span>): <span data-parity-field="judgment-detail">${escapeHtml(outcome.detail)}</span> ${copy('label.criterion')} <span data-parity-field="judgment-criterion">${escapeHtml(outcome.criterion)}</span>.</small></p>`;
      break;
    case 'unlawful':
      body = `<p${DISCLOSURE}><small>${copy('sentence.judgment-unlawful')} <code data-parity-field="judgment-recorded">${escapeHtml(outcome.recorded)}</code> (<code data-parity-field="judgment-case">${escapeHtml(outcome.caseId)}</code>): <span data-parity-field="judgment-detail">${escapeHtml(outcome.detail)}</span> ${copy('label.criterion')} <span data-parity-field="judgment-criterion">${escapeHtml(outcome.criterion)}</span>. ${copy('label.contradiction')} <span data-parity-field="judgment-contradiction">${escapeHtml(outcome.contradiction.clause)}</span> — ${escapeHtml(outcome.contradiction.statement)}</small></p>
    <p${DISCLOSURE}><small>${copy('label.run-record')} <code data-parity-field="judgment-run-record-digest">${escapeHtml(shortDigest(outcome.runRecordDigest))}</code>; ${copy('label.judgment-digest')} <code data-parity-field="judgment-digest">${escapeHtml(shortDigest(outcome.judgmentDigest))}</code>.</small></p>`;
      break;
    case 'lawful':
      body = `<p${DISCLOSURE}><small>${copy('label.verdict')} <code data-parity-field="judgment-verdict">${escapeHtml(`${outcome.verdict.criterion}=${outcome.verdict.value}`)}</code>, ${copy('label.judged-by')} <span data-parity-field="judgment-judging-party">${escapeHtml(outcome.verdict.judgingParty)}</span>; <span data-parity-field="judgment-evidence-kind">${escapeHtml(outcome.evidenceKind)}</span>; <span data-parity-field="judgment-state-label">${escapeHtml(outcome.stateLabel)}</span>; ${copy('label.independently-verified')} <span data-parity-field="judgment-independently-verified">${outcome.independentlyVerified ? 'yes' : 'no'}</span>. <q data-parity-field="judgment-disclosure">${escapeHtml(outcome.disclosure)}</q></small></p>
    <p${DISCLOSURE}><small>${copy('label.act')} <code data-parity-field="judgment-act">${escapeHtml(outcome.actIdentity)}</code> ${copy('label.at')} <code data-parity-field="judgment-act-instant">${escapeHtml(outcome.actInstant)}</code>; ${copy('label.judgment-digest')} <code data-parity-field="judgment-digest">${escapeHtml(shortDigest(outcome.judgmentDigest))}</code>.</small></p>
    <p${DISCLOSURE}><small>${copy('label.run-record')} <code data-parity-field="judgment-run-record">${escapeHtml(`${outcome.runRecord.identity}@${shortDigest(outcome.runRecord.digest)}`)}</code>, <span data-parity-field="judgment-mode">${escapeHtml(outcome.runRecord.mode)}</span>, <code data-parity-field="judgment-surface-version">${escapeHtml(outcome.runRecord.surfaceVersion)}</code>, <code data-parity-field="judgment-run-evaluation-identity">${escapeHtml(outcome.runRecord.evaluationIdentity)}</code>; ${copy('label.traversed')} ${outcome.runRecord.traversedPaths.map((path) => `<code data-parity-field="judgment-traversed-path">${escapeHtml(path)}</code>`).join(', ')}.</small></p>
    <p${DISCLOSURE}><small>${copy('label.rationale')} <span data-parity-field="judgment-rationale">${escapeHtml(outcome.verdict.rationale)}</span></small></p>`;
      break;
  }
  return `<section class="claim-section" data-polaris-section="walkthrough-judgment" data-judgment-state="${escapeHtml(outcome.kind)}">
    ${head}
    ${evaluated}
    ${body}
  </section>`;
}

/** PWB-REQ-021 (as amended 2026-09-05): whether the retained walkthrough
 * record is a ready answer population against this evaluation. Every
 * finding, every retained answer and every anchor is its own
 * `data-polaris-readiness*` marker (the machine channel carries the same
 * value under `walkthroughReadiness`); the owner's words are shown verbatim
 * under the disclosure role — an execution fact, never a verdict or score,
 * and separate from the judgment above. */
function walkthroughReadinessSection(model: PocModel): string {
  const readiness = model.walkthroughReadiness;
  const head = heading(3, 'polaris-walkthrough-readiness', 'evidence.walkthrough-readiness');
  if (readiness.kind === 'not-evaluated') {
    return `<section class="claim-section" data-polaris-section="walkthrough-readiness" data-polaris-readiness="not-evaluated">
    ${head}
    <p${DISCLOSURE}><small>${copy('sentence.readiness-not-evaluated')} <span data-polaris-readiness-detail>${escapeHtml(readiness.detail)}</span></small></p>
  </section>`;
  }
  const r = readiness.readiness;
  // The exact binding a record must name for this evaluation — shown in
  // every state so the recording session copies it, never invents it.
  const expected = `<p${DISCLOSURE}><small>${copy('label.expected-binding')} ${copy('label.surface-version')} <code data-polaris-readiness-expected-surface>${escapeHtml(r.expected.surfaceVersion)}</code>; ${copy('label.evaluation-identity')} <code data-polaris-readiness-expected-evaluation>${escapeHtml(r.expected.evaluationIdentity)}</code>.</small></p>`;
  if (r.kind === 'no-run-record') {
    return `<section class="claim-section" data-polaris-section="walkthrough-readiness" data-polaris-readiness="no-run-record">
    ${head}
    <p${DISCLOSURE}><small>${copy('sentence.readiness-no-run-record')} <span data-polaris-readiness-detail>${escapeHtml(r.detail)}</span></small></p>
    ${expected}
  </section>`;
  }
  const state = r.ready ? 'ready' : 'not-ready';
  const findings = r.findings.length === 0
    ? ''
    : `<p${DISCLOSURE}><small>${copy('label.readiness-findings')}</small></p>
    <ul${DISCLOSURE}>${r.findings.map((finding) => `<li data-polaris-readiness-arm="${escapeHtml(finding.arm)}"><small><code>${escapeHtml(finding.arm)}</code> — <span data-polaris-readiness-finding>${escapeHtml(finding.detail)}</span></small></li>`).join('')}</ul>`;
  const traversed = r.traversedPaths.map((path) => `<code data-polaris-readiness-traversed>${escapeHtml(path)}</code>`).join(', ');
  const answers = r.answers.length === 0
    ? ''
    : `<p${DISCLOSURE}><small>${copy('label.answers')}</small></p>
    <ol${DISCLOSURE} data-polaris-answers>${r.answers.map((answer) => {
      const anchors = answer.anchors.length === 0
        ? ''
        : `<br><small>${copy('label.sources')} ${answer.anchors.map((anchor) => `<code data-polaris-answer-anchor="${escapeHtml(anchor.path)}:${anchor.line}" data-polaris-anchor-resolved="${anchor.resolved ? 'yes' : 'no'}">${escapeHtml(`${anchor.path}:${anchor.line}`)}</code>`).join(', ')}</small>`;
      const authority = answer.authority === undefined
        ? ''
        : `<br><small>${copy('label.cited-authority')} <code data-polaris-answer-authority="${escapeHtml(answer.authority.path)}" data-polaris-authority-resolved="${answer.authority.resolved ? 'yes' : 'no'}">${escapeHtml(answer.authority.path)}</code></small>`;
      return `<li data-polaris-answer="${escapeHtml(answer.identity)}"><code>${escapeHtml(answer.identity)}</code><blockquote data-polaris-answer-text>${escapeHtml(answer.text)}</blockquote>${anchors}${authority}</li>`;
    }).join('')}</ol>`;
  return `<section class="claim-section" data-polaris-section="walkthrough-readiness" data-polaris-readiness="${state}">
    ${head}
    <p${DISCLOSURE}><small>${copy('label.readiness')} <span data-polaris-readiness-state>${state}</span>. ${copy('sentence.readiness-execution-fact')} ${copy('label.surface-version')} <code data-polaris-readiness-surface>${escapeHtml(r.surfaceVersion ?? '')}</code>; ${copy('label.evaluation-identity')} <code data-polaris-readiness-evaluation>${escapeHtml(r.evaluationIdentity ?? '')}</code>; ${traversed === '' ? '' : `${copy('label.traversed')} ${traversed}.`}</small></p>
    ${expected}
    ${findings}
    ${answers}
  </section>`;
}

function anchorText(anchor: ProjectShapeSource['anchor']): string {
  switch (anchor.kind) {
    case 'blob':
      return `blob ${anchor.objectId.slice(0, 12)}`;
    case 'not-a-blob':
      return `${anchor.type} (mode ${anchor.mode})`;
    case 'missing-at-revision':
      return 'missing at revision';
  }
}

function sourceRow(source: ProjectShapeSource, index: number, revision: string): string {
  const outcome = source.record.outcome === 'classified'
    ? source.record.basis === 'path-only' ? 'path-only' : 'body-classified'
    : source.record.outcome;
  const block = source.claim.epistemic.label === 'Observed' ? shapeClaimBlock(source.claim, revision) : undefined;
  const identityCell = block === undefined
    ? `<span>${escapeHtml(source.identity)}</span>`
    : `<cite data-parity-field="shape-source-identity"${anchorAttrs(block.anchors[0] as NarrativeAnchor)}>${escapeHtml(source.identity)}</cite>`;
  const digest = source.claim.support[0]?.contentDigest;
  const denominator = source.itemDenominator.kind === 'known'
    ? `${source.itemDenominator.value} item(s)`
    : `${copyText('label.unknown')} — ${source.itemDenominator.unknown.unknownReason}${source.itemDenominator.unenumeratedHeadings === undefined ? '' : ` (unenumerated-heading: ${source.itemDenominator.unenumeratedHeadings})`}`;
  const classOutcomes = classOutcomesLine(source);
  const identityColumn = `<span class="source-record-label">${copy('label.source-record')} — ${escapeHtml(source.path)}</span><br>${identityCell}`;
  const ruleColumn = `${escapeHtml(source.rule)} · ${source.pillar === undefined ? 'no pillar declared' : escapeHtml(source.pillar)}`;
  const outcomeColumn = `${escapeHtml(outcome)} · ${escapeHtml(anchorText(source.anchor))} · ${digest === undefined ? `<small${copyAttr('sentence.no-body-read')}>${copy('sentence.no-body-read')}</small>` : `<code data-parity-field="shape-source-digest">${escapeHtml(shortDigest(digest))}</code>`}`;
  return `<tr id="polaris-source-${escapeHtml(sourceSlug(source.path))}" data-polaris-source="${escapeHtml(source.claim.claimId)}"${block?.attrs ?? FACT}><td>${index + 1}</td><td><code data-parity-field="shape-source-path">${escapeHtml(source.path)}</code>${activeExactSources.has(source.identity) ? `<br>${exactTextLink(source.identity, source.path)}` : ''}</td><td>${identityColumn}</td><td>${ruleColumn}</td><td>${outcomeColumn}</td><td>${source.claim.epistemic.label === 'Observed' ? `<span data-claim-provenance="${escapeHtml(source.claim.claimId)}">${escapeHtml(denominator)}</span>` : unknownRoutes(source.claim, '')}${classOutcomes}<br>${claimTuple(source.claim)}</td></tr>`;
}

function exclusionItem(exclusion: Exclusion): string {
  const why = exclusion.detectorId ?? exclusion.exclusionReason ?? 'unspecified';
  const digest = exclusion.contentDigest === undefined ? 'never opened' : `digest ${shortDigest(exclusion.contentDigest)}`;
  return `<li data-polaris-exclusion="${escapeHtml(exclusion.repositoryRelativePath)}"${DISCLOSURE}><code>${escapeHtml(exclusion.repositoryRelativePath)}</code> — ${escapeHtml(exclusion.redactionClass)} by ${escapeHtml(why)}${exclusion.detail === undefined ? '' : ` (${escapeHtml(exclusion.detail)})`}; ${escapeHtml(digest)}; policy ${escapeHtml(exclusion.policyId)} ${escapeHtml(exclusion.policyVersion)}. ${copy('sentence.body-withheld')}</li>`;
}

function factItem(fact: ProjectShapeFact): string {
  const declarations = fact.fact.declarations
    .map((declaration) => `${escapeHtml(declaration.value)} (${escapeHtml(declaration.basis)}, ${declaration.anchors.map((anchor) => sourceRef(anchor.path, anchor.line === undefined ? anchor.path : `${anchor.path}:${anchor.line}`)).join(', ')})`)
    .join('; ');
  return `<li id="polaris-fact-${escapeHtml(sourceSlug(fact.claim.claimId))}" data-polaris-fact="${escapeHtml(fact.claim.claimId)}"${DISCLOSURE}>${unknownRoutes(fact.claim, `${escapeHtml(fact.fact.fact)}: `)}<small>${copy('label.declarations-kept')} ${declarations}.</small><br>${claimTuple(fact.claim)}</li>`;
}

// ---------------------------------------------------------------------------
// The root index's own declarations (PWB-REQ-004 as amended; registry
// `observationGrammar`). Disclosed whether or not any fact needed them: the
// seven layer rows as admitted (or why the table is absent), the two stated
// summary counts (or why they are absent), and every disagreement one row
// decided, with the effective and superseded declarations both kept. A
// decided fact is already counted on its family's class or account
// statement, so it carries no claim tuple of its own here.

function declarationText(declaration: Declaration): string {
  const anchors = declaration.anchors.map((anchor) => sourceRef(anchor.path, anchor.line === undefined ? anchor.path : `${anchor.path}:${anchor.line}`)).join(', ');
  return `${escapeHtml(declaration.value)} (${escapeHtml(declaration.basis)}, ${anchors})`;
}

function anchorRef(anchor: { readonly path: string; readonly line?: number }): string {
  return sourceRef(anchor.path, anchor.line === undefined ? anchor.path : `${anchor.path}:${anchor.line}`);
}

function absenceText(disclosure: Extract<PrecedenceDisclosure | RootSummaryDisclosure, { kind: 'absent' | 'unknown' }>): string {
  if (disclosure.kind === 'unknown') return escapeHtml(disclosure.reason);
  const where = anchorRef(disclosure.line === undefined ? disclosure.anchor : { path: disclosure.anchor.path, line: disclosure.line });
  return `${escapeHtml(disclosure.reason)}${disclosure.detail === undefined ? '' : ` (${escapeHtml(disclosure.detail)})`} at ${where}`;
}

function precedenceBlock(precedence: PrecedenceDisclosure): string {
  if (precedence.kind !== 'admitted') {
    return `<p data-polaris-precedence="0"${DISCLOSURE}><span${copyAttr('sentence.no-precedence')}>${copy('sentence.no-precedence')}</span> ${absenceText(precedence)}.</p>`;
  }
  const rows = precedence.rules
    .map((rule) => `<tr data-polaris-precedence="${escapeHtml(rule.id)}"${FACT}><td>${rule.ordinal}</td><td>${escapeHtml(rule.layer)}</td><td>${escapeHtml(rule.owns)}</td><td><code>${escapeHtml(rule.home)}</code></td><td>${anchorRef(rule.anchor)}</td></tr>`)
    .join('');
  return `<p data-polaris-precedence="${precedence.rules.length}"${FACT}><small><span${copyAttr('label.precedence-rows')}>${copy('label.precedence-rows')}</span> ${precedence.rules.length} from ${anchorRef(precedence.anchor)}.</small></p>
    ${tableRegion('polaris-shape-root-index', `<table>
      <thead><tr>${(['table.index', 'table.layer', 'table.owns', 'table.home', 'table.declared-at'] as const).map((id) => `<th scope="col"${copyAttr(id)}>${copy(id)}</th>`).join('')}</tr></thead>
      <tbody>${rows}</tbody>
    </table>`)}`;
}

function rootSummaryBlock(summary: RootSummaryDisclosure): string {
  if (summary.kind !== 'emitted') {
    return `<p data-polaris-stated-counts="0"${DISCLOSURE}><span${copyAttr('sentence.no-stated-counts')}>${copy('sentence.no-stated-counts')}</span> ${absenceText(summary)}.</p>`;
  }
  const counts = summary.declarations.map((declaration) => `<span data-polaris-stated-count="${escapeHtml(declaration.fact)}">${escapeHtml(declaration.fact)} = ${declarationText(declaration)}</span>`).join('; ');
  return `<p data-polaris-stated-counts="${summary.declarations.length}"${FACT}><small><span${copyAttr('label.stated-counts')}>${copy('label.stated-counts')}</span> ${counts}.</small></p>`;
}

function citationText(citation: PrecedenceCitation): string {
  return `${escapeHtml(citation.ruleId)} (${escapeHtml(citation.layer)}, ${anchorRef(citation.anchor)})`;
}

function decidedItem(fact: ProjectShapeFact): string {
  if (fact.fact.state !== 'modeled' || fact.fact.disagreement === undefined) return '';
  const disagreement = fact.fact.disagreement;
  return `<li data-polaris-decided="${escapeHtml(fact.claim.claimId)}"${FACT}>${escapeHtml(fact.fact.fact)}: <span${copyAttr('label.effective')}>${copy('label.effective')}</span> ${declarationText(disagreement.effective)} by ${citationText(disagreement.precedence)}; <span${copyAttr('label.superseded')}>${copy('label.superseded')}</span> ${disagreement.superseded.map(declarationText).join('; ')}.</li>`;
}

function rootIndexSection(shape: Extract<ProjectShape, { kind: 'observed' }>): string {
  const decided = shape.facts.filter((fact) => fact.fact.state === 'modeled' && fact.fact.disagreement !== undefined);
  return `<section class="claim-section wide" data-polaris-section="shape:root-index">
    ${heading(3, 'polaris-shape-root-index', 'evidence.root-index')}
    ${precedenceBlock(shape.precedence)}
    ${rootSummaryBlock(shape.rootSummary)}
    ${decided.length === 0
      ? `<p data-polaris-decided-count="0"${copyAttr('sentence.no-decided')}>${copy('sentence.no-decided')}</p>`
      : `<p${FACT}><small${copyAttr('label.decided')}>${copy('label.decided')}</small></p><ul data-polaris-decided-count="${decided.length}">${decided.map(decidedItem).join('')}</ul>`}
  </section>`;
}

/** The Unknown reasons across every shape claim, counted and routed, with
 * `missing-declaration` foremost (RFC7-15) and `unconsented` next. */
function gapReasonCounts(claims: readonly ProjectShapeClaim[]): ReadonlyMap<UnknownReason, number> {
  const counts = new Map<UnknownReason, number>();
  for (const claim of claims) {
    if ('reasons' in claim.epistemic) {
      const reason = claim.epistemic.reasons.primary;
      counts.set(reason, (counts.get(reason) ?? 0) + 1);
    }
  }
  return counts;
}

/** Each reason's count covers every shape claim, the machine answer's
 * population; the members with no tuple line of their own (reconciled facts,
 * account-section items) are named in the entry, so every counted claim can
 * be found (syzygy-u05.4; S4-F4). */
function gapsList(claims: readonly ProjectShapeClaim[], presented: readonly ProjectShapeClaim[]): string {
  const counts = gapReasonCounts(claims);
  const shown = new Set(presented.map((claim) => claim.claimId));
  const folded = (reason: string): string => {
    const ids = claims.filter((claim) => !shown.has(claim.claimId) && 'reasons' in claim.epistemic && claim.epistemic.reasons.primary === reason).map((claim) => claim.claimId);
    return ids.length === 0 ? '' : ` <span${copyAttr('label.folded-claims')}>${copy('label.folded-claims')}</span> <span data-polaris-gap-folded="${ids.length}">${ids.map((id) => `<code>${escapeHtml(id)}</code>`).join(', ')}</span>.`;
  };
  if (counts.size === 0) {
    return `<p data-polaris-gaps="none"${copyAttr('sentence.no-gaps')}>${copy('sentence.no-gaps')}</p>`;
  }
  const foremost = ['missing-declaration', 'unconsented-source-or-provider'];
  const ordered = [...counts.entries()].sort((a, b) => {
    const ai = foremost.indexOf(a[0]);
    const bi = foremost.indexOf(b[0]);
    if (ai !== bi) return (ai === -1 ? foremost.length : ai) - (bi === -1 ? foremost.length : bi);
    return b[1] - a[1] || a[0].localeCompare(b[0]);
  });
  return `<ul data-polaris-gaps="${counts.size}"${DISCLOSURE}>${ordered
    .map(([reason, count]) => `<li id="${gapId(reason)}" data-polaris-gap="${escapeHtml(reason)}"><span data-unknown-reason="${escapeHtml(reason)}">${escapeHtml(reason)}</span>: ${count} claim(s). ${copy('label.route')} ${reasonRouteHtml(reason)}${folded(reason)}</li>`)
    .join('')}</ul>`;
}

function countReasonsOf(claims: readonly ProjectShapeClaim[]): ReasonCounts {
  const primary: Record<string, number> = {};
  const secondary: Record<string, number> = {};
  for (const member of claims) {
    if (!('reasons' in member.epistemic)) continue;
    primary[member.epistemic.reasons.primary] = (primary[member.epistemic.reasons.primary] ?? 0) + 1;
    for (const reason of member.epistemic.reasons.secondary) secondary[reason] = (secondary[reason] ?? 0) + 1;
  }
  return { primary, secondary } as ReasonCounts;
}

function shapeClaims(shape: ProjectShape): readonly ProjectShapeClaim[] {
  if (shape.kind !== 'observed') return [shape.claim];
  return [
    shape.claim,
    ...shape.projectAccount.map((entry) => entry.claim),
    ...shape.sources.map((entry) => entry.claim),
    ...shape.items.map((entry) => entry.claim),
    ...EXTRACTION_CLASSES.map((cls) => shape.classes[cls].claim),
    ...shape.facts.map((entry) => entry.claim),
  ];
}

/** The shape claims the page renders as their own tuples (syzygy-u05.4;
 * S4-F4), the rule the walkthrough preflight states: reconciled facts fold into their
 * account statements and project-account-section items into the account
 * itself; only contradictions render as fact claims. */
function presentedClaims(shape: ProjectShape): readonly ProjectShapeClaim[] {
  if (shape.kind !== 'observed') return [shape.claim];
  return [
    shape.claim,
    ...shape.projectAccount.map((entry) => entry.claim),
    ...shape.sources.map((entry) => entry.claim),
    ...shape.items.filter((entry) => entry.class !== 'project-account-section').map((entry) => entry.claim),
    ...EXTRACTION_CLASSES.map((cls) => shape.classes[cls].claim),
    ...shape.contradictions.map((entry) => entry.claim),
  ];
}

function openingUnknowns(shape: ProjectShape): readonly { readonly subject: string; readonly claim: ProjectShapeClaim; readonly target: string }[] {
  const featured: readonly { readonly subject: string; readonly claim: ProjectShapeClaim; readonly target: string }[] = shape.kind === 'observed'
    ? [
        { subject: 'Whole project shape', claim: shape.claim, target: 'polaris-shape-sources' },
        { subject: 'Roster identity', claim: shape.classes['roster-identity'].claim, target: 'polaris-class-roster-identity' },
      ]
    : [{ subject: 'Whole project shape', claim: shape.claim, target: 'polaris-shape-sources' }];
  return featured.filter(({ claim }) => claim.epistemic.label === 'Unknown');
}

/** Scale before the first diagram (syzygy-u05.4; S1-M3): three populations
 * counted from the model, each linked to where it is listed or counted. The
 * Unknown claims get a route, not a number: PWB-REQ-010 allows exactly one
 * Unknown aggregate before the catalog, and the opening band is it. */
function proofStrip(shape: Extract<ProjectShape, { kind: 'observed' }>): string {
  const segment = (key: string, count: number, id: PolarisCopyId, target: string): string =>
    `<a href="#${target}" data-proof-count="${key}" data-count="${count}">${count} <span${copyAttr(id)}>${copy(id)}</span></a>`;
  const unknownTarget = openingUnknowns(shape).length > 0 ? 'polaris-opening-unknowns' : 'polaris-shape-gaps';
  return `<p class="proof-strip" data-polaris-proof-strip${FACT}>${[
    segment('sources', shape.sources.length, 'proof.sources', 'polaris-shape-sources'),
    segment('items', shape.items.length, 'proof.items', 'polaris-shape-identity'),
    segment('facts', shape.facts.length, 'proof.facts', 'polaris-shape-identity'),
    `<a href="#${unknownTarget}" data-proof-unknown-route${copyAttr('proof.unknown')}>${copy('proof.unknown')}</a>`,
  ].join(' · ')}</p>`;
}

function openingUnknownBand(shape: ProjectShape): string {
  const unknowns = openingUnknowns(shape);
  if (unknowns.length === 0) return '';
  const total = shapeClaims(shape).filter((claim) => claim.epistemic.label === 'Unknown').length;
  const entries = unknowns.map(({ subject, claim, target }) => {
    const reason = 'reasons' in claim.epistemic ? claim.epistemic.reasons.primary : 'deferred';
    return `<li data-unknown-disclosure="${escapeHtml(claim.claimId)}"${DISCLOSURE}><strong>${escapeHtml(subject)}</strong>: ${copy('label.unknown')} — ${unknownReasonRef(reason)}. ${copy('label.route')} ${escapeHtml(routeOf(claim, reason))}. <a href="#${target}"${SCOPE}>Inspect the full claim</a>${tupleLine(claim)}</li>`;
  }).join('');
  return `<section class="opening-unknown-band" data-opening-unknown-band${DISCLOSURE}><h2 id="polaris-opening-unknowns"${SCOPE}>Unknown claims before the catalog</h2><p data-opening-unknown-count="${total}"${DISCLOSURE}>${total} Unknown claim(s) on this page; ${unknowns.length} shown here.</p><ul>${entries}</ul></section>`;
}

function shapeEvidence(shape: ProjectShape): string {
  if (shape.kind !== 'observed') {
    return `<section class="claim-section" data-polaris-section="shape:evidence">
      ${heading(3, 'polaris-shape-sources', 'evidence.sources')}
      ${unknownRoutes(shape.claim, `${copy('sentence.no-source-read')} `, copyText('evidence.sources'))}
      ${tupleLine(shape.claim)}
    </section>
    <section class="claim-section" data-polaris-section="shape:gaps">
      ${heading(3, 'polaris-shape-gaps', 'evidence.gaps')}
      ${gapsList(shapeClaims(shape), presentedClaims(shape))}
    </section>`;
  }
  const identity = shape.identity;
  const counts = `${shape.counts.classification.classifiedByBasis.body} of ${shape.counts.sources} source bodies readable; ${shape.counts.classification.classifiedByBasis['path-only']} path-only source identities; ${shape.counts.items} items (${shape.counts.modeled} modeled, ${shape.counts.unknown} Unknown, ${shape.counts.contradicted} contradicted); ${shape.counts.facts} facts (${shape.counts.contradictedFacts} contradicted); ${shape.counts.exclusions} exclusion(s).${shape.counts.populationWithoutReadRootIndex ? ` Source-path population: ${WITHOUT_ROOT_INDEX_SENTENCE}` : ''}`;
  const statement = `Declared project shape of ${identity.repositoryId} at revision ${identity.revision.slice(0, 12)}.`;
  const whole = shape.claim.epistemic.label === 'Observed'
    ? ((): string => {
        // The whole shape is anchored to the one evaluated tree; each source is
        // anchored individually in the sources table below.
        const block = anchoredBlock('block:claim:project-shape', [{
          claimId: shape.claim.claimId,
          anchors: [{ targetClass: 'evidence', targetId: `git-tree:${identity.revision}`, revision: identity.revision, locator: 'git-ls-tree' }],
          captured: capturedStateOf(shape.claim),
        }]);
        return `<p${block.attrs}><span data-claim-provenance="${escapeHtml(shape.claim.claimId)}">${escapeHtml(statement)}</span> <span class="citation">(<cite data-parity-field="shape-tree"${anchorAttrs(block.anchors[0] as NarrativeAnchor)}>git-ls-tree</cite>@<code data-parity-field="provenance-revision">${escapeHtml(identity.revision.slice(0, 12))}</code>)</span></p>`;
      })()
    : unknownRoutes(shape.claim, `${escapeHtml(statement)} `);
  return `<section class="claim-section" data-polaris-section="${escapeHtml(shape.claim.claimId)}">
    ${heading(3, 'polaris-shape-identity', 'evidence.observation')}
    ${whole}
    ${tupleLine(shape.claim)}
    ${reasonCountsBlock(shape.claim.claimId, countReasonsOf(shapeClaims(shape).slice(1)))}
    ${onDemandCounts(shape.claim.claimId, escapeHtml(counts))}
    <p${FACT}><small>Revision <code data-parity-field="shape-revision">${escapeHtml(identity.revision.slice(0, 12))}</code> (requested <code>${escapeHtml(identity.requestedRevision)}</code>), committed <code>${escapeHtml(identity.sourceClaimedInstant.instant)}</code>, captured <code>${escapeHtml(identity.capturedAt)}</code> by <code>${escapeHtml(identity.observer.observerId)}</code> ${escapeHtml(identity.observer.observerVersion)} under policy <code>${escapeHtml(identity.policy.policyId)}</code> ${escapeHtml(identity.policy.policyVersion)}; manifest <code data-parity-field="shape-manifest-digest">${escapeHtml(shortDigest(identity.manifestDigest))}</code>, observation <code data-parity-field="shape-observation-digest">${escapeHtml(shortDigest(identity.observationDigest))}</code>.</small></p>
    ${authorityLine(shape.authority)}
    ${discoveryLine(shape.discovery)}
    ${degradationLine(shape.degradation)}
  </section>
  <section class="claim-section wide" data-polaris-section="shape:sources">
    ${heading(3, 'polaris-shape-sources', 'evidence.sources')}
    <p${copyAttr('label.browse-source-records')}>${copy('label.browse-source-records')}</p>
    ${unenumeratedHeadingsList(shape)}
    <p id="polaris-source-legend" class="source-legend"${copyAttr('legend.sources')}>${copy('legend.sources')}</p>
    ${tableRegion('polaris-shape-sources', `<table><thead><tr>${(['table.index', 'table.source', 'table.source-identity', 'table.rule-and-pillar', 'table.outcome-anchor-digest', 'table.items'] as const).map((id) => `<th scope="col"${copyAttr(id)}>${copy(id)}</th>`).join('')}</tr></thead><tbody>${shape.sources.map((source, index) => sourceRow(source, index, shape.identity.revision)).join('')}</tbody></table>`, ' data-source-index aria-describedby="polaris-source-legend"')}
  </section>
  <section class="claim-section" data-polaris-section="shape:exclusions">
    ${heading(3, 'polaris-shape-exclusions', 'evidence.exclusions')}
    ${shape.exclusions.length === 0 ? `<p data-polaris-exclusions="0"${copyAttr('sentence.no-exclusions')}>${copy('sentence.no-exclusions')}</p>` : population('exclusions', shape.claim.claimId, shape.exclusions.length, 'label.show-exclusions', `<ul data-polaris-exclusions="${shape.exclusions.length}">${shape.exclusions.map(exclusionItem).join('')}</ul>`)}
    ${shape.limitBreaches.length === 0 ? '' : `<p${FACT}><small>${copy('label.limit-breaches')} ${shape.limitBreaches.map((breach) => `${escapeHtml(breach.limit)} ${breach.observed} &gt; ${breach.declared}${breach.path === undefined ? '' : ` (${escapeHtml(breach.path)})`}`).join('; ')}.</small></p>`}
  </section>
  ${rootIndexSection(shape)}
  <section class="claim-section" data-polaris-section="shape:contradictions">
    ${heading(3, 'polaris-shape-contradictions', 'evidence.contradictions')}
    ${shape.contradictions.length === 0 ? `<p data-polaris-contradictions="0"${copyAttr('sentence.no-contradictions')}>${copy('sentence.no-contradictions')}</p>` : `<ul data-polaris-contradictions="${shape.contradictions.length}">${shape.contradictions.map(factItem).join('')}</ul>`}
  </section>
  <section class="claim-section" data-polaris-section="shape:gaps">
    ${heading(3, 'polaris-shape-gaps', 'evidence.gaps')}
    ${gapsList(shapeClaims(shape), presentedClaims(shape))}
  </section>`;
}

// ---------------------------------------------------------------------------
// Capability deep dive (PWB-REQ-015; RFC7-17): argument, contract, reality.
// Proposed work (PWB-REQ-013) renders inside the contract band beside the
// current intent, as separate candidate futures that anchor nothing.

const SCOPE = roleAttr('scope-instruction');

function artifactCitation(artifact: ProposedWork['proposal']): string {
  return `<cite data-parity-field="provenance-source" data-proposal-artifact="${escapeHtml(artifact.digest)}">${escapeHtml(artifact.path)}</cite>@<code data-parity-field="provenance-revision">${escapeHtml(artifact.revision.slice(0, 12))}</code>`;
}

function unknownLine(marker: string, reason: string, route: string, detail: string): string {
  return `<p class="unknown-disclosure" data-unknown-disclosure="${escapeHtml(marker)}"${DISCLOSURE}>${copy('label.unknown')} — ${unknownReasonRef(reason)}. ${copy('label.route')} ${escapeHtml(route)}.<br><small>${escapeHtml(detail)}</small></p>`;
}

function verbatimSlot(dive: CapabilityDeepDive, resolution: VerbatimResolution | undefined, ledger: DeepDiveLedger): string {
  const marker = `${dive.capabilityId}/requirement-text`;
  const attrs = ledger.block('contract', `contract:${dive.capabilityId}/requirement-text`);
  const body = ((): string => {
    if (resolution === undefined) {
      const intent = dive.currentIntent;
      return intent.kind === 'unknown'
        ? unknownLine(marker, intent.reason, intent.route, intent.detail)
        : unknownLine(marker, 'reference-unresolvable', UNKNOWN_REASON_ROUTES['reference-unresolvable'], `The baseline spec ${intent.path} carries no captured identity to verify text against.`);
    }
    if (resolution.kind === 'not-rendered') return unknownLine(marker, resolution.reason, resolution.route, resolution.detail);
    // One block per selected requirement (PWB-REQ-011 as amended): the
    // requirement heading and its scenarios, byte-for-byte; nothing else of
    // the owning artifact reaches the page.
    return resolution.requirements
      .map((requirement) => `<pre class="verbatim" data-verbatim-text data-verbatim-requirement="${escapeHtml(requirement.title)}" data-verbatim-identity="${escapeHtml(resolution.identity)}"${roleAttr('project-fact', 'anchored-project-fact')}>${escapeHtml(requirement.text)}</pre>`)
      .join('\n');
  })();
  return `<section class="claim-section" data-contract-part="requirement-text" data-verbatim="${resolution?.kind === 'rendered' ? 'rendered' : 'not-rendered'}"${attrs}>
      ${heading(4, `polaris-${dive.capabilityId}-requirement-text`, 'label.requirement-text')}
      <p class="lede"${copyAttr('contract.verbatim-lede')}>${copy('contract.verbatim-lede')}</p>
      ${body}
    </section>`;
}

function currentIntentPart(dive: CapabilityDeepDive, revision: string, resolution: VerbatimResolution | undefined, ledger: DeepDiveLedger): string {
  const current = dive.currentIntent;
  const identity = current.kind === 'baseline-spec'
    ? ((): string => {
        const block = anchoredBlock(`block:${dive.capabilityId}/current-authority`, [{
          claimId: current.claim.claimId,
          anchors: current.claim.support.map((support) => supportAnchor(support, revision, 'requirement')).filter((anchor): anchor is AnchorInput => anchor !== undefined),
          captured: capturedStateOf(current.claim),
        }]);
        return `<p${block.attrs}><span data-claim-provenance="${escapeHtml(current.claim.claimId)}"><code data-parity-field="current-authority-path">${escapeHtml(current.path)}</code></span>${supportCitations(current.claim.support, block.anchors)}${((): string => { const leaf = currentIntentLeaf(current, revision); return leaf !== undefined && activeExactSources.has(leaf.identity) ? ` ${exactTextLink(leaf.identity, leaf.path)}` : ''; })()}</p>
      ${tupleLine(current.claim)}`;
      })()
    : unknownLine(`${dive.capabilityId}/current-authority`, current.reason, current.route, current.detail);
  const adoption = dive.adoption.kind === 'unknown'
    ? unknownLine(`${dive.capabilityId}/adoption`, dive.adoption.reason, dive.adoption.route, dive.adoption.detail)
    : `<p${FACT}>${copy('label.adoption')} <span data-capability-adoption-state="${dive.adoption.kind}">${copy(dive.adoption.kind === 'adopted' ? 'adoption.adopted' : 'adoption.draft')}</span> — ${escapeHtml(dive.adoption.basis)}</p>`;
  return `<section class="claim-section" data-proposed-work-part="current-authority"${ledger.block('contract', `contract:${dive.capabilityId}/current-authority`)}>
      ${heading(4, `polaris-${dive.capabilityId}-current`, 'proposed.current')}
      ${identity}
      ${adoption}
    </section>
    ${verbatimSlot(dive, resolution, ledger)}`;
}

/** One proposal: adjacent to the current intent, labeled, non-anchorable and
 * non-status-bearing. It registers no narrative block and carries no anchor. */
function proposalPart(dive: CapabilityDeepDive, work: ProposedWork, ledger: DeepDiveLedger): string {
  const exclusive = exclusiveWith(dive, work.changeId);
  const lifecycle = work.lifecycle.kind === 'observed'
    ? `<p${FACT}>${copy('label.lifecycle')} <span data-proposal-lifecycle-state="${escapeHtml(work.lifecycle.state)}">${escapeHtml(work.lifecycle.state)}</span> — ${escapeHtml(work.lifecycle.basis)}</p>`
    : `<p class="unknown-disclosure" data-unknown-disclosure="${escapeHtml(work.id)}/lifecycle"${DISCLOSURE}>${copy('label.lifecycle')} ${pocUnknownBody(`${work.id}/lifecycle`, { label: 'Unknown', reason: work.lifecycle.reason, closedReason: work.lifecycle.closedReason, resolutionRoutes: [resolutionRoute(work.lifecycle.closedReason)] })}</p>`;
  const futures = exclusive.length === 0
    ? `<p${FACT}>${copy('label.candidate-future')} — ${copy(dive.exclusivityBasis === 'declared' ? 'sentence.no-competitor' : 'sentence.exclusivity-not-captured')}</p>`
    : `<p${FACT}>${copy('label.candidate-future')} — ${copy('label.exclusive-with')} ${exclusive.map((other) => `<code data-exclusive-change="${escapeHtml(other)}">${escapeHtml(other)}</code>`).join(', ')}. ${copy('sentence.separate-futures')}</p>`;
  const attrs = ledger.block('contract', `contract:${dive.capabilityId}/proposal:${work.changeId}`);
  return `<section class="claim-section ${PROPOSAL_DISCLOSURE.className}" data-proposed-work-part="proposal" data-candidate-future="${escapeHtml(work.changeId)}" data-exclusive-with="${escapeHtml(exclusive.join('\t'))}" data-anchorable="false" data-status-bearing="false"${attrs}>
      ${heading(4, `polaris-proposed-${work.changeId}`, 'proposed.change')}
      <p class="${PROPOSAL_DISCLOSURE.labelClassName}" data-proposal-label${copyAttr('label.proposed')}>${copy('label.proposed')}</p>
      <p${FACT}><span data-proposal-identity="${escapeHtml(work.id)}"><code data-parity-field="proposal-change-id">${escapeHtml(work.changeId)}</code> ${copy('label.amends')} <code>openspec/specs/${escapeHtml(work.specKey)}/spec.md</code>.</span> <span class="citation">(${artifactCitation(work.proposal)}, ${artifactCitation(work.delta)})</span></p>
      ${lifecycle}
      ${futures}
    </section>`;
}

function proposedWorkSection(dive: CapabilityDeepDive, revision: string, resolution: VerbatimResolution | undefined, ledger: DeepDiveLedger): string {
  const changeIds = dive.proposals.map((work) => work.changeId);
  const lifecycles = dive.proposals.map((work) => (work.lifecycle.kind === 'observed' ? work.lifecycle.state : 'unknown'));
  const single = dive.proposals.length === 1 ? ` data-proposal-change="${escapeHtml(changeIds[0] as string)}" data-proposal-lifecycle="${escapeHtml(lifecycles[0] as string)}"` : '';
  return `<section class="claim-section"${ledger.block('contract', `contract:${dive.capabilityId}/proposed-work`)} data-proposal-changes="${escapeHtml(changeIds.join('\t'))}" data-proposal-count="${dive.proposals.length}"${single} data-proposal-capability="${escapeHtml(dive.capabilityId)}" data-exclusivity-basis="${dive.exclusivityBasis}">
    ${heading(3, `polaris-${dive.capabilityId}-proposed-work`, 'proposed.heading')}
    <div class="adjacent">
      ${currentIntentPart(dive, revision, resolution, ledger)}
      ${dive.proposals.map((work) => proposalPart(dive, work, ledger)).join('')}
    </div>
  </section>`;
}

function undeclaredContractPart(dive: CapabilityDeepDive, part: 'doctrine' | 'non-goals', shape: ProjectShape, ledger: DeepDiveLedger): string {
  const reason = shape.kind === 'observed'
    ? 'missing-declaration'
    : ('reasons' in shape.claim.epistemic ? shape.claim.epistemic.reasons.primary : 'unconsented-source-or-provider');
  const detail = shape.kind === 'observed'
    ? `The consented sources declare no ${part === 'doctrine' ? 'doctrine' : 'non-goal'} link for ${dive.capabilityId}; none is restated here.`
    : `The project shape is ${shape.kind}; no declaration was read.`;
  return `<section class="claim-section" data-contract-part="${part}"${ledger.block('contract', `contract:${dive.capabilityId}/${part}`)}>
      ${heading(4, `polaris-${dive.capabilityId}-${part}`, part === 'doctrine' ? 'label.doctrine' : 'label.non-goals')}
      ${unknownLine(`${dive.capabilityId}/${part}`, reason, UNKNOWN_REASON_ROUTES[reason], detail)}
    </section>`;
}

function bandHeader(band: DeepDiveBand, dive: CapabilityDeepDive): string {
  return `${heading(3, `polaris-${dive.capabilityId}-band-${band}`, `band.${band}`)}
    <p class="lede"${copyAttr(`band.${band}-lede`)}>${copy(`band.${band}-lede`)}</p>`;
}

function entityLink(entity: PocEntity): string {
  return `<a href="#polaris-${escapeHtml(entity.id)}" data-argument-ref="${escapeHtml(entity.id)}">${escapeHtml(entity.title)}</a>`;
}

function argumentBand(dive: CapabilityDeepDive, ledger: DeepDiveLedger): string {
  const intents = dive.related.filter((entity) => entity.kind === 'intent');
  const why = intents.length === 0
    ? `<p${FACT}>${copy('label.why')} — ${copy('sentence.no-intent-declared')}</p>`
    : `<p${FACT}>${copy('label.why')} — ${intents.map(entityLink).join(', ')}. <a href="#polaris-group-overview" data-argument-ref="group:overview">${copy('group.overview')}</a>.</p>`;
  return `<section class="band"${ledger.block('argument', `argument:${dive.capabilityId}`)}>
      ${bandHeader('argument', dive)}
      <p${FACT}>${copy('label.thesis')} — ${escapeHtml(dive.capability.title)}.</p>
      ${why}
      <p${FACT}>${copy('label.related')} — ${dive.related.filter((entity) => entity.kind !== 'intent' && entity.kind !== 'project').map(entityLink).join(', ')}.</p>
    </section>`;
}

function contractBand(dive: CapabilityDeepDive, model: PocModel, revision: string, resolution: VerbatimResolution | undefined, ledger: DeepDiveLedger): string {
  return `<section class="band"${ledger.block('contract', `contract:${dive.capabilityId}`)}>
      ${bandHeader('contract', dive)}
      ${proposedWorkSection(dive, revision, resolution, ledger)}
      ${undeclaredContractPart(dive, 'doctrine', model.projectShape, ledger)}
      ${undeclaredContractPart(dive, 'non-goals', model.projectShape, ledger)}
    </section>`;
}

function realityBand(dive: CapabilityDeepDive, model: PocModel, ledger: DeepDiveLedger): string {
  const entitiesById = new Map(model.entities.map((entity) => [entity.id, entity]));
  const sections = model.entities
    .filter((entity) => entity.id === dive.capabilityId || dive.related.some((related) => related.id === entity.id))
    .map((entity) => entitySection(entity, model, ledger.block('reality', entity.id)))
    .join('');
  const relationshipList = dive.relationships.map((relationship) => relationshipBullet(relationship, entitiesById, model)).join('');
  return `<section class="band"${ledger.block('reality', `reality:${dive.capabilityId}`)}>
      ${bandHeader('reality', dive)}
      ${sections}
      <section class="relationships"${ledger.block('reality', 'relationships')}>
        ${heading(3, 'polaris-relationships', 'evidence.relationships')}
        <p class="relationships-lede"${copyAttr('evidence.relationships-lede')}>${copy('evidence.relationships-lede')}</p>
        <ul>${relationshipList}</ul>
      </section>
    </section>`;
}

/** One capability deep dive: the three bands in order, Base mode, every
 * block under exactly one band, the machine form registered beside the
 * narrative. Verbatim text is resolved here, at render, and never stored. */
function capabilityDeepDive(dive: CapabilityDeepDive, model: PocModel, revision: string, verbatim: VerbatimLeafReader | undefined): string {
  const ledger = new DeepDiveLedger(escapeHtml);
  const leaf = currentIntentLeaf(dive.currentIntent, revision);
  const resolution = leaf === undefined ? undefined : resolveVerbatim(leaf, verbatim);
  const bands = `${argumentBand(dive, ledger)}${contractBand(dive, model, revision, resolution, ledger)}${realityBand(dive, model, ledger)}`;
  registry().registerDeepDive(deepDiveMachineForm(dive, ledger, { ...(leaf === undefined ? {} : { leaf }), ...(resolution === undefined ? {} : { resolution }) }));
  return `<section class="deep-dive" id="polaris-deep-dive-${escapeHtml(sourceSlug(dive.capabilityId))}" data-capability-deep-dive="${escapeHtml(dive.capabilityId)}" data-reading-mode="${DEFAULT_READING_MODE}" data-capability-adoption="${dive.adoption.kind}">
      <p${SCOPE}>${copy('label.mode')} <span data-reading-mode-value="${DEFAULT_READING_MODE}">${DEFAULT_READING_MODE}</span> — ${copy('sentence.base-mode')}</p>
      ${bands}
    </section>`;
}

// ---------------------------------------------------------------------------

function groupHeader(group: PolarisGroup): string {
  return `<header class="group" data-polaris-group="${escapeHtml(group)}">
    ${heading(2, `polaris-group-${group}`, `group.${group}`)}
  </header>`;
}

function projectGroupBody(shape: ProjectShape, group: Exclude<PolarisGroup, 'capability-detail' | 'evidence-and-gaps'>): string {
  if (shape.kind !== 'observed') {
    return shapeUnknownBlock(shape, group);
  }
  switch (group) {
    case 'overview':
      return `${accountByKey(shape, 'purpose')}${proofStrip(shape)}${introductoryDiagram(shape)}${accountByKey(shape, 'promises')}${classBlock(shape, 'project-account-section', false)}`;
    case 'boundaries':
      return `${accountByKey(shape, 'refusals')}${classBlock(shape, 'principle', true)}`;
    case 'architecture':
      return `${accountByKey(shape, 'architecture')}${classBlock(shape, 'topology-component', true)}`;
    case 'v1':
      return `${capabilityGuide(shape)}${accountByKey(shape, 'v1-scope')}${accountByKey(shape, 'v1-success')}${classBlock(shape, 'success-criterion', true)}`;
    case 'catalog':
      return CATALOG_CLASSES.map((cls) => classBlock(shape, cls, true)).join('');
  }
}

const SECTION_NAV_SCRIPT = `<script>
(() => {
  const drawer = document.querySelector('.reading-sidebar .contents-list');
  if (!drawer) return;
  const hiddenCount = drawer.querySelector('[data-outline-hidden-count]');
  const updateHiddenCount = () => {
    if (hiddenCount) hiddenCount.textContent = String(drawer.open ? 0 : drawer.querySelectorAll('a').length) + ' links hidden';
  };
  drawer.addEventListener('toggle', updateHiddenCount);
  const wide = matchMedia('(min-width: 1000px)');
  const adapt = () => { drawer.open = wide.matches; updateHiddenCount(); };
  adapt();
  wide.addEventListener('change', adapt);
  document.querySelector('.reading-sidebar').addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('a') && !wide.matches) drawer.open = false;
  });
  document.addEventListener('DOMContentLoaded', () => {
    let handledHash;
    const openGuide = (hash, explicitClick = false) => {
      if (!explicitClick && hash === handledHash) return;
      handledHash = hash;
      let id;
      try { id = decodeURIComponent(hash.slice(1)); } catch { return; }
      const guide = document.getElementById(id);
      if (guide && guide.matches('[data-component-guide]')) guide.querySelector('details').open = true;
    };
    document.addEventListener('click', (event) => {
      const link = event.target instanceof Element ? event.target.closest('a[href^="#polaris-guide-"]') : null;
      if (link) openGuide(link.hash, true);
    });
    addEventListener('hashchange', () => openGuide(location.hash));
    openGuide(location.hash);
    for (const library of document.querySelectorAll('.component-library')) {
      const button = library.querySelector('.expand-declaration');
      const sections = Array.from(library.querySelectorAll('[data-component-guide] > details'));
      button.addEventListener('click', () => {
        const open = !sections.every((section) => section.open);
        for (const section of sections) section.open = open;
        button.setAttribute('aria-expanded', String(open));
      });
      library.addEventListener('toggle', () => button.setAttribute('aria-expanded', String(sections.every((section) => section.open))), true);
    }
    const headings = Array.from(document.querySelectorAll('h2[id^="polaris-group-"]'));
    const links = Array.from(drawer.querySelectorAll('a'));
    let queued = false;
    const update = () => {
      queued = false;
      let active = headings[0];
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top <= 160) active = heading;
      }
      for (const link of links) {
        if (active && link.hash === '#' + active.id) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      }
    };
    addEventListener('scroll', () => {
      if (!queued) { queued = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  });
})();
</script>`;

const POLARIS_STYLE = `${OPENING_INDEX_STYLE}
  html { scroll-behavior: auto; }
  .band { max-width: 74ch; margin: 0 auto 2rem; padding: 0.5rem 0 0; border-left: 3px solid var(--line); padding-left: 1rem; }
  .band[data-band="argument"] { border-left-style: dotted; }
  .band[data-band="contract"] { border-left-style: double; }
  .verbatim { white-space: pre-wrap; border: 1px solid var(--line); padding: 0.75rem; overflow-x: auto; }
  .claim-section { max-width: 74ch; margin: 0 auto 3rem; padding-top: 1.5rem; border-top: 1px solid var(--line); }
  .claim-section.wide { max-width: 100ch; }
  .claim-section h3 { font-size: clamp(1.25rem, 2.4vw, 1.7rem); margin: 0 0 .8rem; }
  .claim-section p { font-size: 1.05rem; }
  .group { max-width: 74ch; margin: 3.5rem auto 1.5rem; }
  .group h2 { font-size: clamp(1.6rem, 3.2vw, 2.4rem); margin: 0 0 .6rem; }
  .scope-instruction, .relationships-lede { font-size: 1.05rem; color: var(--muted); max-width: 74ch; }
  .scope-instruction { margin: 0 auto 1rem; }
  .citation { color: var(--muted); font-family: var(--font-mono); font-size: .82rem; }
  .citation a { color: inherit; }
  .claim-tuple, .claim-tuple + i { font-family: var(--font-mono); font-size: .78rem; letter-spacing: .04em; font-style: normal; }
  ${TUPLE_FIELD_TREATMENTS_CSS}
  ${TUPLE_MARKS_CSS}
  .tuple-line { margin-top: -.4rem; }
  .reason-counts { font-size: .95rem; }
  .reason-counts ul, .cause-routes { padding-left: 1.2rem; }
  .coverage-counts { margin: .6rem 0 1rem; }
  .coverage-counts summary { cursor: pointer; color: var(--muted); font-size: .9rem; }
  .population { margin: .6rem 0 1rem; }
  .population summary, .claim-states summary { cursor: pointer; color: var(--muted); font-size: .95rem; }
  .claim-states { max-width: 74ch; margin: 0 auto 2rem; padding: .5rem 1rem; border: 1px dashed var(--line); font-size: .95rem; }
  .claim-states ul { padding-left: 1.2rem; }
  .unknown-disclosure { padding-left: .9rem; }
  .opening-unknown-band { max-width: 74ch; margin: 2rem auto; padding: 1rem; border: 1px solid var(--line); background: var(--panel); }
  .opening-unknown-band h2 { margin: 0; font-size: 1.25rem; }
  .opening-unknown-band ul { padding-left: 1.5rem; }
  .opening-unknown-band li { margin: 1rem 0; }
  .table-scroll { overflow-x: auto; }
  .item-list { margin: 0; padding-left: 1.2rem; }
  .item-list li { margin: .35rem 0; overflow-wrap: anywhere; }
  .depth-nav { max-width: 74ch; margin: 0 auto 2rem; font-size: .95rem; }
  .depth-nav p { margin: 0 0 .3rem; }
  .depth-nav ol { margin: 0; padding-left: 1.4rem; }
  .depth-nav li { margin-bottom: .3rem; }
  .relationships { max-width: 74ch; margin: 0 auto 3rem; }
  .relationships ul { padding-left: 1.2rem; }
  .relationships li { margin-bottom: .5rem; }
  ${PROPOSAL_TREATMENT_CSS}
  [data-proposal-label] { font-family: var(--font-mono); font-size: .85rem; letter-spacing: .04em; text-transform: uppercase; }
  .proposal .adjacent { display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr)); }
  .proposal h4 { margin: 0 0 .5rem; font-size: 1.05rem; }

  header { width: min(74ch, calc(100% - 2rem)); padding: 2.8rem 0 1rem; }
  header h1 { font-size: clamp(3.5rem, 7vw, 5.5rem); line-height: 1; margin-block: .7rem 1.4rem; }
  header .lede { max-width: 48ch; font-size: 1.25rem; line-height: 1.6; }
  main > .legend { max-width: 74ch; margin: 1.25rem auto 2rem; gap: .5rem 1rem; }
  .tuple-gloss { max-width: 74ch; margin: 0 auto 1.5rem; font-size: .9rem; color: var(--muted); }
  .tuple-gloss ul { margin: .25rem 0; }
  .proof-strip { font-size: .95rem; }
  main > .notice { max-width: 74ch; margin: 0 auto 2rem; background: transparent; border-left: 1px solid var(--line); font-size: .9rem; color: var(--muted); }
  .group { margin-top: 4rem; padding: 1.5rem 0 0; border-top: 1px solid var(--line); }
  .group h2 { font-size: clamp(2rem, 4vw, 3rem); line-height: 1.15; letter-spacing: -.025em; }
  .claim-section { border: 0; margin-bottom: 2.5rem; padding-top: .7rem; }
  .claim-section h3 { font-size: 1.05rem; color: var(--muted); font-weight: normal; letter-spacing: .02em; }
  .reading-prose { max-width: 66ch; font-size: 1.12rem; line-height: 1.75; overflow-wrap: anywhere; }
  .reading-prose p { font-size: inherit; margin: 0 0 1.2em; }
  .reading-prose h4, .reading-prose h5, .reading-prose h6 { font-size: 1.3rem; line-height: 1.3; margin: 2rem 0 .8rem; color: var(--ink); }
  .reading-prose ul, .reading-prose ol { padding-left: 1.4rem; margin: .5rem 0 1.5rem; }
  .reading-prose li { margin-bottom: .7rem; padding-left: .2rem; }
  .reading-prose li p { margin-bottom: .3rem; }
  .reading-prose strong { font-weight: bold; color: var(--ink); }
  .reading-prose code { font-size: .84em; color: var(--cyan); }
  .reading-prose pre { max-width: 100%; overflow-x: auto; padding: 1rem; background: var(--panel); line-height: 1.5; }
  .reading-prose blockquote { border-left: 2px solid var(--cyan); margin: 1rem 0; padding-left: 1.3rem; font-size: 1.2em; }
  .markdown-table { overflow-x: auto; margin-block: 1.5rem; }
  main, footer { overflow-wrap: anywhere; }
  :target { scroll-margin-top: 5rem; }
  .reading-citations { margin-block: .5rem; font-size: .85rem; }
  .class-provenance { font-size: .85rem; margin-block: .7rem; }
  .class-provenance > summary { cursor: pointer; color: var(--muted); }
  .reading-citations > summary { cursor: pointer; color: var(--muted); }
  .excerpt-label { color: var(--muted); font-size: .85rem !important; }
  main > .group:first-of-type { margin-top: 1rem; }
  .reading-citations .citation { font-size: .72rem; overflow-wrap: anywhere; }
  .tuple-line { margin-top: .7rem; }
  .claim-tuple, .claim-tuple + i { letter-spacing: 0; font-size: .72rem; }
  .full-account { border-left: 1px solid var(--line); padding: .6rem 0 .6rem 1.2rem; margin: 1.5rem 0; }
  .full-account > summary { cursor: pointer; color: var(--cyan); }
  .full-account[open] > summary { margin-bottom: 1.3rem; }
  .depth-nav { position: static; border: 0; background: transparent; backdrop-filter: none; padding: 0; font-family: var(--font-serif); }
  .contents-list { border-block: 1px solid var(--line); padding: 1rem 0; }
  .contents-list > summary { cursor: pointer; color: var(--cyan); font-size: 1rem; }
  .contents-list ol { margin: 1rem 0 0; padding-left: 1.4rem; }
  .contents-list li { margin: .75rem 0; line-height: 1.7; }
  .guide-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.5rem 2rem; }
  .capability-guide { max-width: 74ch; margin: 1.5rem auto 3rem; }
  .guide-entry { border-top: 1px solid var(--line); padding-top: 1rem; }
  .guide-entry h3 { font-size: 1.35rem; margin: 0 0 .75rem; }
  .guide-entry .reading-prose { font-size: 1rem; line-height: 1.6; }
  .guide-intro { color: var(--muted); }
  .guide-state { color: var(--muted); font-size: .75rem; }
  .guide-state > summary, .unknown-source-details > summary { cursor: pointer; }
  .unknown-disclosure > p { margin: 0 0 .5rem; }
  .unknown-source-details, .reason-remedies { font-size: .9rem; }
  .reason-remedies > summary { cursor: pointer; color: var(--muted); }
  .quick-links { display: flex; flex-wrap: wrap; gap: .5rem 1.25rem; padding: .45rem clamp(1rem, 3vw, 3rem); margin: 0; font-size: .9rem; background: var(--panel); }
  .catalog-contexts { columns: 2; column-gap: 2.5rem; padding-left: 1.2rem; font-size: 1.15rem; line-height: 1.5; }
  .catalog-contexts li { break-inside: avoid; margin-bottom: .8rem; }
  .population { border-block: 1px solid var(--line); padding: .75rem 0; }
  .population > summary { font-size: 1rem; color: var(--cyan); }
  .population[open] > summary { margin-bottom: 1rem; }
  [data-source-index] { max-height: min(70vh, 30rem); overflow: auto; }
  [data-source-index] td:first-child { white-space: nowrap; }
  .source-record-label { display: inline-block; font-size: .85rem; color: var(--muted); }
  .population .reading-prose { font-size: 1rem; min-width: 22ch; }
  .population .reading-prose p:last-child { margin-bottom: 0; }
  .claim-states { border: 0; border-left: 1px solid var(--line); padding: .3rem 1rem; }
  .reading-layout { display: grid; grid-template-columns: 14rem minmax(0, 1fr); grid-template-areas: "sidebar header" "sidebar content" "sidebar footer"; column-gap: clamp(2rem, 4vw, 4rem); max-width: 96rem; padding-inline: clamp(1rem, 3vw, 3rem); margin-inline: auto; }
  .reading-sidebar { grid-area: sidebar; position: sticky; top: 5rem; align-self: start; max-height: calc(100vh - 6rem); overflow: auto; margin-top: 3rem; padding-right: .75rem; }
  .reading-layout > header { grid-area: header; }
  .reading-layout > main { grid-area: content; }
  .reading-layout > footer { grid-area: footer; }
  .reading-layout > header, .reading-layout > main, .reading-layout > footer { min-width: 0; width: 100%; margin-inline: 0; }
  .reading-layout .group, .reading-layout .claim-section, .reading-layout .band, .reading-layout .relationships, .reading-layout .capability-guide, .reading-layout .scope-instruction, .reading-layout .claim-states { max-width: 91ch; margin-left: 0; }
  .reading-layout .claim-section.wide, .reading-layout .claim-section:has(.source-figure) { max-width: none; }
  .reading-prose { max-width: 74ch; }
  .introductory-diagram { margin: 2rem 0 3rem; }
  .source-figure { margin: 1.5rem 0 2.5rem; padding: 1.6rem; border: 1px solid var(--line); border-top: 3px solid var(--cyan); background: var(--panel); }
  .figure-kicker { color: var(--cyan); font: .75rem var(--mono); text-transform: uppercase; letter-spacing: .14em; }
  .source-figure h4 { margin: .5rem 0 1.6rem; font-size: clamp(1.3rem, 2vw, 1.8rem); }
  .source-figure .source-flow { margin: 1.5rem 0 2rem; }
  .source-figure .flow-node { min-height: 5.2rem; padding: .9rem .65rem; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 1rem; border-top: 1px solid var(--cyan); }
  .source-figure .flow-arrow::after { color: var(--cyan); font-size: 1.4rem; }
  .figure-explanation { font-size: .9rem; }
  .figure-explanation summary { cursor: pointer; color: var(--cyan); }
  .figure-explanation[open] summary { margin-bottom: 1.5rem; }
  @media (max-width: 800px) {
    .source-figure { padding: 1rem; }
    .source-figure .flow-node { min-height: 3.2rem; }
  }
  .source-flow { display: grid; grid-template-columns: repeat(var(--flow-columns), minmax(0, 1fr)); gap: 1.3rem; list-style: none; padding: 1.25rem 0; margin: 1.5rem 0; }
  .source-flow li { position: relative; min-width: 0; padding: 0; margin: 0; }
  .flow-node { display: block; height: 100%; border: 1px solid var(--line); border-top: 2px solid var(--cyan); background: var(--panel); padding: .75rem .5rem; font: .85rem var(--font-mono); text-transform: capitalize; }
  .flow-arrow { position: absolute; display: flex; align-items: center; justify-content: center; line-height: 1; top: 50%; right: -1.3rem; width: 1.3rem; text-align: center; transform: translateY(-50%); font-size: 0; }
  .flow-arrow::after { content: '→'; font-size: 1.2rem; color: var(--muted); }
  .source-flow[data-flow-long] { grid-template-columns: 1fr; }
  .source-flow[data-flow-long] .flow-arrow { top: auto; right: calc(50% - .65rem); bottom: -1.3rem; height: 1.3rem; transform: none; }
  .source-flow[data-flow-long] .flow-arrow::after { content: '↓'; }
  @media (max-width: 800px) {
    .source-flow { grid-template-columns: 1fr; }
    .source-flow .flow-arrow { top: auto; right: calc(50% - .65rem); bottom: -1.3rem; height: 1.3rem; transform: none; }
    .source-flow .flow-arrow::after { content: '↓'; }
  }
  .source-relationships { display: grid; gap: 1rem; margin-block: 1.5rem; }
  .source-relationship { border: 1px solid var(--line); background: var(--panel); padding: 1.25rem; }
  .relationship-nodes { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: 1rem; font-size: 1rem; }
  .relationship-nodes > strong { padding: .6rem; border-bottom: 2px solid var(--line); }
  .relationship-arrow { color: var(--muted); font-size: 1.5rem; }
  .relationship-description { margin-top: 1rem; font-size: .95rem; }
  .relationship-description p:last-child { margin-bottom: 0; }
  .component-library { margin-block: 2rem; }
  .component-library > h4 { font-size: 1.4rem; margin-bottom: .75rem; }
  .expand-declaration { background: transparent; border: 1px solid var(--line); color: var(--cyan); padding: .6rem .9rem; cursor: pointer; margin-bottom: 1rem; font: inherit; }
  .component-guides { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
  [data-component-guide] { min-width: 0; border: 1px solid var(--line); background: var(--panel); padding: 1rem; }
  [data-component-guide]:has(details[open]) { grid-column: 1 / -1; }
  [data-component-guide] summary { cursor: pointer; font-size: 1.1rem; line-height: 1.5; }
  [data-component-guide] details[open] > summary { margin-bottom: 1.5rem; }


  .reading-sidebar .contents-list { border-top: 0; }
  [data-outline-hidden-count] { margin-inline-start: .5rem; color: var(--muted); font: .75rem var(--font-mono); }
  .reading-sidebar .contents-list ol, .reading-sidebar .contents-list ul { list-style: none; padding: 0; }
  .reading-sidebar .contents-list > ol > li { margin: 1.25rem 0; }
  .reading-sidebar .contents-list ul { margin: .4rem 0 0; }
  .reading-sidebar .contents-list ul li { margin: .15rem 0; line-height: 1.4; }
  .depth-group-label { color: var(--muted); font: .7rem var(--font-mono); text-transform: uppercase; letter-spacing: .08em; }
  .reading-sidebar .contents-list a { display: block; padding: .35rem .5rem; border-left: 2px solid transparent; text-decoration: none; }
  .reading-sidebar .contents-list a[aria-current="location"] { color: var(--ink); border-color: var(--cyan); background: var(--panel); }
  @media (max-width: 999px) {
    .reading-layout { display: block; padding-inline: 1rem; }
    .reading-sidebar { position: static; max-height: none; margin-top: 1rem; padding: 0; }
    .reading-sidebar .depth-nav { max-width: none; margin-bottom: 0; }
    .reading-sidebar .contents-list { border-block: 1px solid var(--line); }
    .reading-sidebar .contents-list > ol { columns: 2; column-gap: 2rem; }
    .reading-sidebar .contents-list > ol > li { break-inside: avoid; }
  }
  @media (max-width: 640px) {
    header { padding-top: 2.5rem; }
    .reading-sidebar .contents-list > ol { columns: 1; }
    .catalog-contexts { columns: 1; }
    .component-guides { grid-template-columns: 1fr; }
    .guide-grid { grid-template-columns: 1fr; }
    .site-nav ul { gap: 1rem; font-size: .85rem; }
    .reading-prose { font-size: 1.05rem; }
    .group { margin-top: 3rem; }
  }
`;

/** Seam for the PWB-REQ-015 sweep: one deep dive rendered on its own with a
 * fresh registry, so a fixture dive (draft capability, competing proposals)
 * can be exercised without a model that carries it. Returns the fragment and
 * the machine form the page would embed. */
export function renderCapabilityDeepDive(dive: CapabilityDeepDive, model: PocModel, inputs: PolarisRenderInputs = {}): { readonly html: string; readonly narrative: ReturnType<NarrativeRegistry['narrative']> } {
  if (activeRegistry !== undefined) throw new Error('renderPolarisPage re-entered');
  activeRegistry = new NarrativeRegistry();
  try {
    const shape = model.projectShape;
    const html = capabilityDeepDive(dive, model, shape.kind === 'observed' ? shape.identity.revision : '', inputs.verbatim);
    return { html, narrative: activeRegistry.narrative(model) };
  } finally {
    activeRegistry = undefined;
  }
}

/** Render-time inputs that are not truth: a verbatim reader for the current
 * requirement leaf (production passes none — the leaf lies outside the
 * consented content class, and the page says so). */
export interface PolarisRenderInputs {
  readonly verbatim?: VerbatimLeafReader;
  /** Test seam: the machine answer the `anchorsResolved` pairs are counted
   * against (PWB-REQ-014), so a test can serve the narrative again from an
   * answer with identities withheld while the page still renders. Production
   * passes none: the model it renders is the answer of the same evaluation. */
  readonly machineAnswer?: unknown;
}

/** The presentation artifact and its machine form, from one capture: the
 * human page and the envelope `/api/poc/polaris` serves derive from the
 * same registry, so their block, anchor and band multisets are one. */
export function renderPolarisPresentation(model: PocModel, mountPrefix = '', viewState: PolarisViewState = {}, inputs: PolarisRenderInputs = {}, status?: HumanOperabilityStatus): { readonly html: string; readonly narrative: ReturnType<NarrativeRegistry['narrative']> } {
  if (activeRegistry !== undefined) throw new Error('renderPolarisPage re-entered');
  activeRegistry = new NarrativeRegistry();
  activeViewState = viewState;
  try {
    const html = renderPolarisBody(model, mountPrefix, activeRegistry, inputs, status);
    return { html, narrative: activeRegistry.narrative('machineAnswer' in inputs ? inputs.machineAnswer : model) };
  } finally {
    activeRegistry = undefined;
    activeViewState = {};
    activeTargets = NO_TARGETS;
    activeMountPrefix = '';
    activeExclusions = [];
    activeUnavailable = [];
    activeExactSources = new Set();
  }
}

export function renderPolarisPage(model: PocModel, mountPrefix = '', viewState: PolarisViewState = {}, inputs: PolarisRenderInputs = {}, status?: HumanOperabilityStatus): string {
  return renderPolarisPresentation(model, mountPrefix, viewState, inputs, status).html;
}

/** Seven native shortcuts are before the global nav, not hidden in the drawer. */
function groupQuickLinks(): string {
  return `<nav class="quick-links" aria-label="Polaris group shortcuts"${SCOPE}>${POLARIS_GROUPS.map(group =>
    `<a href="#polaris-group-${group}"${copyAttr(`group.${group}` as PolarisCopyId)}>${copy(`group.${group}` as PolarisCopyId)}</a>`).join('')}</nav>`;
}

/** The four depths PWB-REQ-011 names — summary, catalog, detail, exact
 * source — as one list of native links in document order, so a keyboard-
 * only reader descends by text alone. Every target is an id the same render
 * emits; a level lists only what this shape state renders. */
function depthNav(shape: ProjectShape, dives: readonly CapabilityDeepDive[], body: string): string {
  const observed = shape.kind === 'observed';
  const revision = observed ? shape.identity.revision : '';
  const architecture = observed ? shape.projectAccount.find((statement) => statement.key === 'architecture' && statement.claim.epistemic.label === 'Observed')?.statement : undefined;
  const reading = architecture === undefined ? undefined : projectReading(architecture, 'architecture');
  const chapters = reading?.chapters ?? [];
  const diagrams = reading?.figures ?? [];
  const link = (id: string, copyId: PolarisCopyId): string => `<a href="#${escapeHtml(id)}"${copyAttr(copyId)}>${copy(copyId)}</a>`;
  const levels: readonly (readonly [PolarisCopyId, readonly string[]])[] = [
    ['depth.summary', [link('polaris-group-overview', 'group.overview'), ...diagrams.filter((figure) => figure.id === 'core-loop').map((figure) => `<a href="#polaris-diagram-${escapeHtml(figure.id)}"${SCOPE}>${escapeHtml(figure.title)}</a>`), link('polaris-group-boundaries', 'group.boundaries'), link('polaris-group-v1', 'group.v1'), link('polaris-group-architecture', 'group.architecture'), ...diagrams.filter((figure) => figure.id !== 'core-loop').map((figure) => `<a href="#polaris-diagram-${escapeHtml(figure.id)}"${SCOPE}>${escapeHtml(figure.title)}</a>`)]],
    ['depth.catalog', [link('polaris-group-catalog', 'group.catalog'), ...(observed ? CATALOG_CLASSES.map((cls) => link(`polaris-class-${cls}`, `class.${cls}`)) : [])]],
    ['depth.detail', [...chapters.map((chapter) => `<a href="#polaris-guide-${escapeHtml(chapter.id)}"${FACT}>${escapeHtml(chapter.title)}</a>`), link('polaris-group-capability-detail', 'group.capability-detail'), ...dives.map((dive) => `<a href="#polaris-deep-dive-${escapeHtml(sourceSlug(dive.capabilityId))}" data-depth-dive="${escapeHtml(dive.capabilityId)}"${FACT}>${escapeHtml(dive.capability.title)}</a>`)]],
    ['depth.source', [
      link('polaris-group-evidence-and-gaps', 'group.evidence-and-gaps'),
      link('polaris-shape-sources', 'evidence.sources'),
      ...(observed ? [link('polaris-shape-exclusions', 'evidence.exclusions'), link('polaris-shape-root-index', 'evidence.root-index'), link('polaris-shape-contradictions', 'evidence.contradictions')] : []),
      link('polaris-shape-gaps', 'evidence.gaps'),
      ...dives.flatMap((dive) => {
        const leaf = currentIntentLeaf(dive.currentIntent, revision);
        return leaf !== undefined && activeExactSources.has(leaf.identity)
          ? [`<a href="${escapeHtml(sourceRouteHref(activeMountPrefix, leaf.identity))}" data-depth-source="${escapeHtml(dive.capabilityId)}"${copyAttr('label.exact-text')}>${copy('label.exact-text')} — ${escapeHtml(leaf.path)}</a>`]
          : [];
      }),
    ]],
  ];
  const existing = new Set(levels.flatMap(([, links]) => links.flatMap(link => [...link.matchAll(/href="#([^"]+)"/g)].map(match => match[1] as string))));
  const missing: string[][] = [[], [], [], []];
  let group: PolarisGroup = 'overview';
  for (const match of body.matchAll(/<h([23])\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g)) {
    const id = match[2] as string;
    const nextGroup = /^polaris-group-(.+)$/.exec(id)?.[1];
    if (nextGroup !== undefined && (POLARIS_GROUPS as readonly string[]).includes(nextGroup)) group = nextGroup as PolarisGroup;
    if (existing.has(id)) continue;
    const level = group === 'catalog' ? 1 : group === 'capability-detail' ? 2 : group === 'evidence-and-gaps' ? 3 : 0;
    const label = (match[3] as string).replace(/<[^>]+>/g, '');
    missing[level]!.push(`<a href="#${escapeHtml(id)}"${SCOPE}>${label} — ${escapeHtml(group)}</a>`);
    existing.add(id);
  }
  const position = (link: string): number => {
    const target = /href="#([^"]+)"/.exec(link)?.[1];
    if (target === undefined) return Number.POSITIVE_INFINITY;
    const offset = body.indexOf(` id="${target}"`);
    return offset < 0 ? Number.POSITIVE_INFINITY : offset;
  };
  const complete = levels.map(([copyId, links], index) =>
    [copyId, [...links, ...missing[index]!].sort((left, right) => position(left) - position(right))] as const);
  const hiddenLinks = complete.reduce((sum, [, links]) => sum + links.length, 0);
  return `<nav class="depth-nav" data-polaris-depth-nav aria-labelledby="polaris-depth-label">
    <details class="contents-list"><summary id="polaris-depth-label"${SCOPE}>${copy('depth.label')} <span data-outline-hidden-count>${hiddenLinks} links in outline</span></summary>
    <ol>${complete.map(([copyId, links], index) => `<li data-depth-level="${index + 1}"${SCOPE}><span class="depth-group-label"${copyAttr(copyId)}>${copy(copyId)}</span><ul>${links.map((item) => `<li>${item}</li>`).join('')}</ul></li>`).join('')}</ol></details>
  </nav>`;
}

function pageTargets(shape: ProjectShape): PageTargets {
  return {
    gapReasons: new Set(gapReasonCounts(shapeClaims(shape)).keys()),
    sourcePaths: new Set(shape.kind === 'observed' ? shape.sources.map((source) => source.path) : []),
  };
}

/** Identities the exact-source route serves for this shape: the reader's
 * own admission gates restated as a set (an admitted baseline spec whose
 * identity was classified — path-only, its body is read only at render —
 * and whose anchor is a blob), so the page links only where the route can
 * resolve. */
export function exactSourceIdentities(shape: ProjectShape): ReadonlySet<string> {
  if (shape.kind !== 'observed') return new Set();
  return new Set(shape.sources
    .filter((source) => source.rule === 'baseline-spec-tree' && source.record.outcome === 'classified' && source.anchor.kind === 'blob')
    .map((source) => source.identity));
}

function renderPolarisBody(model: PocModel, mountPrefix: string, narrative: NarrativeRegistry, inputs: PolarisRenderInputs, status?: HumanOperabilityStatus): string {
  const shape = model.projectShape;
  const revision = shape.kind === 'observed' ? shape.identity.revision : '';
  activeTargets = pageTargets(shape);
  activeMountPrefix = mountPrefix;
  activeExclusions = shape.kind === 'observed' ? shape.exclusions : [];
  activeUnavailable = shape.kind === 'observed'
    ? shape.sources.flatMap((source) => (source.record.outcome === 'unavailable' ? [{ path: source.path, reason: source.record.reason }] : []))
    : [];
  activeExactSources = exactSourceIdentities(shape);
  const dives = deriveCapabilityDeepDives(model);
  const deepDives = dives
    .map((dive) => capabilityDeepDive(dive, model, revision, inputs.verbatim))
    .join('');

  const body = `
    ${OPENING_INDEX_PLACEHOLDER}
    ${groupHeader('overview')}
    ${tupleGloss(firstTupleClaim(shape))}
    ${projectGroupBody(shape, 'overview')}
    <p class="notice"${copyAttr('notice')}>${copy('notice')} <a href="#polaris-claim-states"${copyAttr('label.claim-states')}>${copy('label.claim-states')}</a></p>
    ${claimStatesBlock(model)}
    ${currencyProbeBand(model)}
    ${groupHeader('boundaries')}
    ${projectGroupBody(shape, 'boundaries')}
    ${groupHeader('v1')}
    ${projectGroupBody(shape, 'v1')}
    ${groupHeader('architecture')}
    ${projectGroupBody(shape, 'architecture')}
    ${openingUnknownBand(shape)}
    ${groupHeader('catalog')}
    ${RECONCILIATION_PLACEHOLDER}
    ${projectGroupBody(shape, 'catalog')}
    ${groupHeader('capability-detail')}
    <p class="scope-instruction" data-polaris-capability-scope data-scope="poc-bound"${copyAttr('capability.scope')}>${copy('capability.scope')}</p>
    ${deepDives}
    ${groupHeader('evidence-and-gaps')}
    ${shapeEvidence(shape)}
    ${walkthroughJudgmentSection(model)}
    ${walkthroughReadinessSection(model)}
    ${codeStructureSection(model)}
    ${workItemsSection(model)}`;
  // The machine form of the presentation artifact is not embedded here: the
  // authenticated presentation route serves it from the same render
  // (renderPolarisPresentation), so the human page carries each fact once.

  const page = pageShell({
    title: 'Polaris · Syzygy three-surface POC',
    current: 'polaris',
    eyebrow: 'Polaris · Project manifesto',
    readingLayout: true,
    heading: copyText('shell.heading'),
    lede: copyText('shell.lede'),
    extraStyle: POLARIS_STYLE,
    body,
    earlyLinks: groupQuickLinks(),
    sidebar: depthNav(shape, dives, body) + SECTION_NAV_SCRIPT,
    footer: `Evaluation <code>${escapeHtml(model.evaluation.snapshot)}</code> as of <code>${escapeHtml(model.evaluation.asOf)}</code>.`,
    status,
    surfacePlanes: model.surfaces,
    escapeHtml,
    mountPrefix,
  });
  // The marker count is a fact about the final HTML, so the reconciliation
  // line is substituted last (M14 slice 4).
  const reconciled = substituteCatalogReconciliation(page, (markers) => renderCatalogReconciliation(catalogReconciliation(shape, markers, (claim) => {
    const reason = 'reasons' in claim.epistemic ? claim.epistemic.reasons.primary : 'deferred';
    return { reason, route: routeOf(claim, reason) };
  })));
  // Whether each opening-index target renders is also a fact about the final
  // HTML (PWB-REQ-010, P-98), so the index is substituted after it.
  return substituteOpeningIndex(reconciled, mountPrefix);
}
