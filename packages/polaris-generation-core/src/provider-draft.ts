import type { DiscoveryStage, GenerationStage, PromptStage } from './prompts.js';
import { check, handle, list, object, refs, text, type Schema } from './closed-schema.js';
import { disposition, draft, draftHandles, fidelity, treeBlocks, unique, validateRequestedAssets, type AssetDisposition, type DossierDraft, type DraftBlock, type DraftDiagram,
  type DraftDiagramEdge, type DraftDiagramNode, type DraftParagraph, type FidelityBlockSupport, type FidelityInventoryCoverage, type FidelityReview, type RequestedAsset } from './draft-model.js';
import { SOURCE_TEXT_MAX_LENGTH } from './source-model.js';

// Provider-local intermediate records only. These neither mint identities nor
// implement the authored asset bundle, source admission or semantic review.
// Coverage lists record what the reviewer claims to have checked; they cannot
// prove entailment or inventory completeness beyond the source denominator.
// Plain strings remain inert, including markup-looking text; renderers must
// escape them. This schema provides no executable markup or external link role.
// The draft and review records, and the closed-schema checker every stage shares, live in draft-model.ts and
// closed-schema.ts (the live dossier path imports them there); this module re-exports them under the names the
// provider pipeline uses.
export { SOURCE_ID_MAX_LENGTH, SOURCE_ID_MIN_LENGTH, SOURCE_ID_PATTERN, SOURCE_TEXT_MAX_LENGTH } from './source-model.js';
export { DIAGRAM_KINDS, diagramToMermaid, reviewVerdict, validateDraftRecord, validateRequestedAssets, type AssetDisposition, type DiagramKind, type EpistemicMarking, type RequestedAsset } from './draft-model.js';
export type ProviderParagraph = DraftParagraph;
export type ProviderBlock = DraftBlock;
export type ProviderDiagramNode = DraftDiagramNode;
export type ProviderDiagramEdge = DraftDiagramEdge;
export type ProviderDraft = DossierDraft;
export type ProviderDiagram = DraftDiagram;
export type ProviderInventoryCoverage = FidelityInventoryCoverage;
export type ProviderBlockSupport = FidelityBlockSupport;
export type ProviderReview = FidelityReview;

const inventory = object({ entries: list(object({ id: handle, sourceIds: refs(), statement: text, kind: { ...text, enum: ['purpose', 'beneficiary', 'thesis', 'capability', 'choice', 'term', 'qualification', 'conflict', 'other'] }, disposition }), 1) });
const plan = object({ sections: list(object({ id: handle, title: text, reason: text, sourceIds: refs(), disposition }), 1, 30) });
/** Bounds a discovery claim; discovery.ts truncates at `maxClaimChars` (default 400). */
export const DISCOVERY_CLAIM_MAX_LENGTH = 400;
export const DISCOVERY_RELEVANCE_MAX = 10;
// Fixed and closed; the blob ids a reply may name are the call's own input,
// checked by validateDiscoveryReply, never written into this schema.
const discoveryMap = object({ claims: list(object({
  blobId: handle, claim: { type: 'string', minLength: 1, maxLength: DISCOVERY_CLAIM_MAX_LENGTH },
  relevance: { type: 'number', minimum: 0, maximum: DISCOVERY_RELEVANCE_MAX },
}), 0, 200) });
const discoveryReduce = object({ ranked: { ...list(handle, 0, 200), uniqueItems: true } });
const schemas: Record<PromptStage, Schema> = { inventory, plan, author: draft, edit: draft, repair: draft, fidelity, 'discovery-map': discoveryMap, 'discovery-reduce': discoveryReduce };
// v2: tree blocks and marked, kinded diagrams. Only the draft stages changed shape.
const schemaVersions: Record<PromptStage, 'v1' | 'v2'> = { inventory: 'v1', plan: 'v1', author: 'v2', edit: 'v2', repair: 'v2', fidelity: 'v1', 'discovery-map': 'v1', 'discovery-reduce': 'v1' };

export function stageSchema(stage: PromptStage): { version: string; schema: Schema } {
  if (!Object.hasOwn(schemas, stage)) throw new Error('invalid-stage');
  return { version: `polaris-provider-${stage}-${schemaVersions[stage]}`, schema: structuredClone(schemas[stage]) };
}

export interface ProviderInventory { entries: { id: string; sourceIds: string[]; statement: string; kind: 'purpose' | 'beneficiary' | 'thesis' | 'capability' | 'choice' | 'term' | 'qualification' | 'conflict' | 'other'; disposition: AssetDisposition }[] }
export interface ProviderPlan { sections: { id: string; title: string; reason: string; sourceIds: string[]; disposition: AssetDisposition }[] }

function same(actual: string[], expected: Set<string>): void {
  const set = unique(actual);
  if (set.size !== expected.size || [...set].some(id => !expected.has(id))) throw new Error('incomplete-coverage');
}
function references(value: unknown, sources: Set<string>): void {
  if (Array.isArray(value)) {
    for (const child of value) references(child, sources);
  } else if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.sourceIds) && record.sourceIds.some(id => !sources.has(id))) throw new Error('unknown-source');
    if (Array.isArray(record.references) && record.references.some(id => !sources.has(id))) throw new Error('unknown-source');
    for (const child of Object.values(record)) references(child, sources);
  }
}

function draftBlocks(value: ProviderDraft): Map<string, ProviderParagraph | ProviderDiagramNode | ProviderDiagramEdge> {
  return new Map([
    value.introduction,
    ...value.sections.flatMap(section => treeBlocks(section.paragraphs)),
    ...value.diagrams.flatMap(diagram => [...diagram.nodes, ...diagram.edges]),
    ...value.deepDives.flatMap(deepDive => treeBlocks(deepDive.paragraphs)),
  ].map(block => [block.id, block]));
}

function producedHandles(value: ProviderDraft): Set<string> {
  return new Set([
    value.introduction.id,
    ...value.sections.flatMap(section => section.disposition.kind === 'produced' ? [section.id, ...treeBlocks(section.paragraphs).map(p => p.id)] : []),
    ...value.diagrams.flatMap(diagram => diagram.disposition.kind === 'produced' ? [diagram.id, ...diagram.nodes.map(n => n.id), ...diagram.edges.map(e => e.id)] : []),
    ...value.deepDives.flatMap(deepDive => deepDive.disposition.kind === 'produced' ? [deepDive.id, ...treeBlocks(deepDive.paragraphs).map(p => p.id)] : []),
  ]);
}

type RequestedAssetOutput =
  | { kind: 'section'; asset: ProviderDraft['sections'][number] }
  | { kind: 'diagram'; asset: ProviderDraft['diagrams'][number] }
  | { kind: 'deep-dive'; asset: ProviderDraft['deepDives'][number] };

function requestedAssetOutput(request: RequestedAsset, draft: ProviderDraft): RequestedAssetOutput {
  switch (request.kind) {
    case 'section': {
      const asset = draft.sections.find(candidate => candidate.id === request.id);
      if (asset === undefined) throw new Error('missing-requested-asset');
      return { kind: request.kind, asset };
    }
    case 'diagram': {
      const asset = draft.diagrams.find(candidate => candidate.id === request.id);
      if (asset === undefined) throw new Error('missing-requested-asset');
      return { kind: request.kind, asset };
    }
    case 'deep-dive': {
      const asset = draft.deepDives.find(candidate => candidate.id === request.id);
      if (asset === undefined) throw new Error('missing-requested-asset');
      return { kind: request.kind, asset };
    }
  }
}

function requestedOutputHandles(output: RequestedAssetOutput): Set<string> {
  switch (output.kind) {
    case 'section':
      return new Set([output.asset.id, ...treeBlocks(output.asset.paragraphs).map(paragraph => paragraph.id)]);
    case 'diagram':
      return new Set([output.asset.id, ...output.asset.nodes.map(node => node.id), ...output.asset.edges.map(edge => edge.id)]);
    case 'deep-dive':
      return new Set([output.asset.id, ...treeBlocks(output.asset.paragraphs).map(paragraph => paragraph.id)]);
  }
}

function requestedDisposition(request: RequestedAsset, draft: ProviderDraft): AssetDisposition {
  const output = requestedAssetOutput(request, draft);
  const disposition = output.asset.disposition;
  if (request.required && disposition.kind === 'omitted') throw new Error('required-asset-omitted');
  if (disposition.kind === 'produced' && disposition.assetIds.some(id => !requestedOutputHandles(output).has(id))) {
    throw new Error('requested-asset-output-mismatch');
  }
  return disposition;
}

/** Case-folded, whitespace-collapsed text; block boundaries become `\n`, which
 * no normalized label contains, so a label cannot match across two blocks. */
function normalizedText(value: string): string {
  return value.replace(/\s+/gu, ' ').trim().toLowerCase();
}

export function validateStage(stage: GenerationStage, value: unknown, context: Record<string, unknown>): unknown {
  check(stageSchema(stage).schema, value);
  const requestedAssets = validateRequestedAssets(context.requestedAssets);
  const sourceSchema = list(object({ sourceId: handle, text: { type: 'string', minLength: 1, maxLength: SOURCE_TEXT_MAX_LENGTH } }), 1);
  check(sourceSchema, context.sources);
  const sources = unique((context.sources as { sourceId: string; text: string }[]).map(s => s.sourceId));
  references(value, sources);
  if (stage === 'inventory') {
    const data = value as ProviderInventory;
    unique(data.entries.map((entry) => entry.id));
    same([...new Set<string>(data.entries.flatMap((entry) => entry.sourceIds))], sources);
  } else if (stage === 'plan') {
    const data = value as ProviderPlan;
    validateStage('inventory', context.inventory, { sources: context.sources, requestedAssets });
    unique(data.sections.map((section) => section.id));
    for (const request of requestedAssets.filter(asset => asset.kind === 'section')) {
      const section = data.sections.find(candidate => candidate.id === request.id);
      if (section === undefined) throw new Error('missing-requested-asset');
      if (request.required && section.disposition.kind === 'omitted') throw new Error('required-asset-omitted');
    }
  } else if (stage === 'fidelity') {
    const data = value as ProviderReview;
    validateStage('inventory', context.inventory, { sources: context.sources, requestedAssets });
    validateStage('author', context.draft, { sources: context.sources, plan: context.plan, inventory: context.inventory, requestedAssets });
    const inv = context.inventory as ProviderInventory;
    const handles = draftHandles(context.draft as ProviderDraft);
    const blocks = draftBlocks(context.draft as ProviderDraft);
    same(data.inventoryCoverage.map((row) => row.entryId), unique(inv.entries.map((entry) => entry.id)));
    same(data.blockSupport.map((row) => row.blockId), handles.blocks);
    if (data.inventoryCoverage.some((row) => row.disposition !== 'represented' && row.reason.length === 0)) throw new Error('missing-coverage-reason');
    if (data.inventoryCoverage.some((row) => row.disposition !== 'represented' && row.blockIds.length > 0)) throw new Error('invalid-coverage-blocks');
    for (const row of data.inventoryCoverage.filter(row => row.disposition === 'represented')) {
      if (row.blockIds.length === 0) throw new Error('missing-coverage-block');
      unique(row.blockIds);
      const entry = inv.entries.find(candidate => candidate.id === row.entryId)!;
      if (row.blockIds.some(id => !blocks.has(id) || !blocks.get(id)!.sourceIds.some(source => entry.sourceIds.includes(source)))) throw new Error('invalid-coverage-block');
    }
    if (data.blockSupport.some((row) => row.verdict !== 'supported' && row.reason.length === 0)) throw new Error('missing-support-reason');
    for (const row of data.blockSupport.filter(row => row.verdict === 'supported')) {
      if (row.sourceIds.length === 0) throw new Error('missing-support-source');
      unique(row.sourceIds);
      if (row.sourceIds.some(source => !blocks.get(row.blockId)!.sourceIds.includes(source))) throw new Error('support-source-outside-block');
    }
    for (const request of requestedAssets) {
      if (request.required && requestedDisposition(request, context.draft as ProviderDraft).kind === 'unresolved'
        && !data.findings.some(finding => finding.target === request.id && finding.severity === 'blocking')) throw new Error('unresolved-required-asset');
    }
    const targets = new Set([...sources, ...handles.all, ...data.inventoryCoverage.map((row) => row.entryId), ...data.blockSupport.map((row) => row.blockId)]);
    if (data.findings.some((finding) => !targets.has(finding.target))) throw new Error('unknown-finding-target');
  } else {
    const data = value as ProviderDraft;
    check(plan, context.plan);
    validateStage('inventory', context.inventory, { sources: context.sources, requestedAssets });
    references(context.plan, sources);
    draftHandles(data);
    const planned = (context.plan as ProviderPlan).sections.flatMap((section) => section.disposition.kind === 'produced' ? section.disposition.assetIds : []);
    const produced = [
      ...(context.inventory as ProviderInventory).entries.flatMap(entry => entry.disposition.kind === 'produced' ? entry.disposition.assetIds : []),
      ...planned,
      ...data.sections.flatMap((section) => section.disposition.kind === 'produced' ? section.disposition.assetIds : []),
      ...data.diagrams.flatMap((asset) => asset.disposition.kind === 'produced' ? asset.disposition.assetIds : []),
      ...data.deepDives.flatMap((asset) => asset.disposition.kind === 'produced' ? asset.disposition.assetIds : []),
    ];
    const output = producedHandles(data);
    if (produced.some((id) => !output.has(id))) throw new Error('unknown-asset');
    for (const request of requestedAssets) requestedDisposition(request, data);
    const sections = unique(data.sections.map((s) => s.id));
    same([...sections], unique((context.plan as ProviderPlan).sections.map((s) => s.id)));
    for (const diagram of data.diagrams) {
      if (!sections.has(diagram.sectionId)) throw new Error('unknown-section');
      const nodes = new Set(diagram.nodes.map((n) => n.id));
      if (diagram.edges.some((e) => !nodes.has(e.from) || !nodes.has(e.to))) throw new Error('unknown-node');
      if (diagram.disposition.kind === 'produced') {
        // Necessary, not sufficient: a label found in the section's text shows the
        // diagram names what the account states, never that the text supports it.
        const section = data.sections.find((s) => s.id === diagram.sectionId)!;
        const account = treeBlocks(section.paragraphs).map((b) => normalizedText(b.text)).join('\n');
        if ([...diagram.nodes, ...diagram.edges].some((element) => !account.includes(normalizedText(element.label)))) {
          throw new Error('diagram-label-not-in-text');
        }
      }
    }
    if (data.deepDives.some((d) => !sections.has(d.sectionId))) throw new Error('unknown-section');
  }
  return structuredClone(value);
}

/**
 * Validates a discovery reply against its stage's schema and its own call:
 * every blobId must be one of `candidateIds` (the map input's items, or the
 * blob ids the reduce input's claims name), each at most once, and a reduce
 * ranking holds at most `maxSelected` ids. Throws on any breach.
 */
export function validateDiscoveryReply(stage: DiscoveryStage, value: unknown, call: { readonly candidateIds: readonly string[]; readonly maxSelected?: number }): unknown {
  if (stage !== 'discovery-map' && stage !== 'discovery-reduce') throw new Error('invalid-stage');
  check(schemas[stage], value);
  const candidates = unique([...call.candidateIds]);
  const ids = stage === 'discovery-map' ? (value as { claims: { blobId: string }[] }).claims.map(claim => claim.blobId) : (value as { ranked: string[] }).ranked;
  unique(ids);
  if (ids.some(id => !candidates.has(id))) throw new Error('unknown-blob');
  if (stage === 'discovery-reduce' && (!Number.isSafeInteger(call.maxSelected) || ids.length > call.maxSelected!)) throw new Error('over-selection');
  return structuredClone(value);
}
