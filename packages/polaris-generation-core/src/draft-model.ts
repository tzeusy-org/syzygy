import { check, handle, list, object, refs, text, type Schema } from './closed-schema.js';

// The dossier draft model: the draft both the provider pipeline and an operator-agent run render, the fidelity
// review of it, and the requested assets it answers. Intermediate records only: they neither mint identities nor
// implement the authored asset bundle, source admission or semantic review. Coverage lists record what the reviewer
// claims to have checked; they cannot prove entailment or inventory completeness beyond the source denominator.
// Plain strings remain inert, including markup-looking text; renderers must escape them. This schema provides no
// executable markup or external link role.

const requestedAssetsSchema = list(object({ id: handle, kind: { ...text, enum: ['section', 'diagram', 'deep-dive'] }, required: { type: 'boolean' } }), 0, 100);
const paragraph = object({ id: handle, text, sourceIds: refs() });
// A tree block: the parent summarizes its leaf children, so truncating at either
// depth leaves a coarser account. Nesting is exactly one level; the Schema type
// has no recursion. The first block of a section is its answer (prompt-stated).
const block = object({ id: handle, text, sourceIds: refs(), children: list(paragraph, 0, 12) });
const epistemic: Schema = { ...text, enum: ['observed', 'inferred', 'unknown'] };
export const DIAGRAM_KINDS = ['flow', 'lifecycle', 'state-machine', 'boundary', 'dependency', 'placement'] as const;
/** Package-internal (with `draft` and `fidelity`): the provider stage schemas in provider-draft.ts embed it. */
export const disposition: Schema = { oneOf: [
  object({ kind: { ...text, enum: ['produced'] }, assetIds: refs() }),
  object({ kind: { ...text, enum: ['omitted'] }, reason: text, references: refs() }),
  object({ kind: { ...text, enum: ['unresolved'] }, reason: text, references: refs() }),
] };
export const draft = object({
  title: text, introduction: paragraph,
  sections: list(object({ id: handle, title: text, paragraphs: list(block, 1, 30), disposition }), 1, 30),
  diagrams: list(object({ id: handle, title: text, sectionId: handle,
    kind: { ...text, enum: [...DIAGRAM_KINDS] }, relationship: text,
    nodes: list(object({ id: handle, label: text, sourceIds: refs(), epistemic }), 1, 40),
    edges: list(object({ id: handle, from: handle, to: handle, label: text, sourceIds: refs(), epistemic }), 1, 80),
    disposition,
  }), 0, 20),
  deepDives: list(object({ id: handle, title: text, sectionId: handle, paragraphs: list(block, 1, 30), disposition }), 0, 30),
  unresolved: list(object({ question: text, reason: text, references: refs() }), 0, 100),
});
const inventoryCoverage = list(object({ entryId: handle, disposition: { ...text, enum: ['represented', 'justified-omission', 'unsupported', 'unresolved'] }, blockIds: list(handle, 0, 5000), reason: text }), 1, 5000);
const blockSupport = list(object({ blockId: handle, verdict: { ...text, enum: ['supported', 'anchor-does-not-support', 'unresolved'] }, sourceIds: list(handle, 0, 200), reason: text }), 1, 5000);
export const fidelity = object({ inventoryCoverage, blockSupport,
  findings: list(object({ severity: { ...text, enum: ['blocking', 'advisory'] }, message: text, target: handle }), 0, 1000),
});

export interface DraftParagraph { id: string; text: string; sourceIds: string[] }
/** A section or deep-dive block: a parent paragraph and its 0–12 leaf children. An operator-agent draft's entry may instead be a v1.3
 * rich element (`element`, syzygy-mea.10.5), whose own id the entry carries with empty text, no sources and no children; the provider
 * pipeline never sets it. */
export interface DraftBlock extends DraftParagraph { children: DraftParagraph[]; element?: DraftElement }
/** A v1.3 rich element. Labels are presentation; every `DraftParagraph` inside is a claim, rendered as a block is. */
export type DraftElement =
  | { kind: 'table'; caption: string; columns: string[]; rowHeaders: boolean; rows: { id: string; cells: (DraftParagraph | null)[] }[] }
  | { kind: 'callout'; tone: 'note' | 'tip' | 'caution' | 'important'; title: string; children: DraftBlock[] }
  | { kind: 'steps'; items: DraftParagraph[] }
  | { kind: 'definitions'; entries: { term: string; definition: DraftParagraph }[] }
  | { kind: 'cards'; items: { label: string; body: DraftParagraph }[] }
  | { kind: 'details'; summary: string; elements: DraftBlock[] };
export type DiagramKind = typeof DIAGRAM_KINDS[number];
export type EpistemicMarking = 'observed' | 'inferred' | 'unknown';
export interface DraftDiagramNode { id: string; label: string; sourceIds: string[]; epistemic: EpistemicMarking }
export interface DraftDiagramEdge { id: string; from: string; to: string; label: string; sourceIds: string[]; epistemic: EpistemicMarking }
export interface RequestedAsset { readonly id: string; readonly kind: 'section' | 'diagram' | 'deep-dive'; readonly required: boolean }
export type AssetDisposition =
  | { kind: 'produced'; assetIds: string[] }
  | { kind: 'omitted'; reason: string; references: string[] }
  | { kind: 'unresolved'; reason: string; references: string[] };
export interface DossierDraft {
  title: string;
  introduction: DraftParagraph;
  sections: { id: string; title: string; paragraphs: DraftBlock[]; disposition: AssetDisposition }[];
  diagrams: DraftDiagram[];
  deepDives: { id: string; title: string; sectionId: string; paragraphs: DraftBlock[]; disposition: AssetDisposition }[];
  unresolved: { question: string; reason: string; references: string[] }[];
}
export interface DraftDiagram {
  id: string; title: string; sectionId: string; kind: DiagramKind; relationship: string;
  nodes: DraftDiagramNode[]; edges: DraftDiagramEdge[]; disposition: AssetDisposition;
}
export interface FidelityInventoryCoverage { entryId: string; disposition: 'represented' | 'justified-omission' | 'unsupported' | 'unresolved'; blockIds: string[]; reason: string }
export interface FidelityBlockSupport { blockId: string; verdict: 'supported' | 'anchor-does-not-support' | 'unresolved'; sourceIds: string[]; reason: string }
export interface FidelityReview { inventoryCoverage: FidelityInventoryCoverage[]; blockSupport: FidelityBlockSupport[]; findings: { severity: 'blocking' | 'advisory'; message: string; target: string }[] }

/** Package-internal, with `treeBlocks` and `draftHandles`: `validateStage` (provider-draft.ts) shares them. */
export function unique(values: string[]): Set<string> {
  const set = new Set(values);
  if (set.size !== values.length) throw new Error('duplicate-handle');
  return set;
}

export function validateRequestedAssets(value: unknown): RequestedAsset[] {
  check(requestedAssetsSchema, value);
  const assets = value as RequestedAsset[];
  unique(assets.map(asset => asset.id));
  return structuredClone(assets);
}

/** Every claim of a tree, parent first: children are blocks everywhere. A rich element's shell entry is no claim; the claims inside it are,
 * in document order (syzygy-mea.10.5), so every reader of a tree — handles, quote checks, review packets — sees them as blocks. */
export function treeBlocks(blocks: readonly DraftBlock[]): DraftParagraph[] {
  return blocks.flatMap(block => block.element === undefined ? [block, ...block.children] : elementClaims(block.element));
}

/** The claims a rich element holds, in document order. */
export function elementClaims(element: DraftElement): DraftParagraph[] {
  switch (element.kind) {
    case 'table': return element.rows.flatMap(row => row.cells.filter((cell): cell is DraftParagraph => cell !== null));
    case 'callout': return treeBlocks(element.children);
    case 'steps': return [...element.items];
    case 'definitions': return element.entries.map(entry => entry.definition);
    case 'cards': return element.items.map(item => item.body);
    case 'details': return treeBlocks(element.elements);
  }
}

export function draftHandles(value: DossierDraft): { all: Set<string>; blocks: Set<string> } {
  const blocks = [value.introduction, ...value.sections.flatMap(s => treeBlocks(s.paragraphs)),
    ...value.diagrams.flatMap(d => [...d.nodes, ...d.edges]),
    ...value.deepDives.flatMap(d => treeBlocks(d.paragraphs))].map(b => b.id);
  return { blocks: unique(blocks), all: unique([...blocks, ...value.sections.map(s => s.id),
    ...value.diagrams.map(d => d.id), ...value.deepDives.map(d => d.id)]) };
}

/**
 * The draft's own shape and handle uniqueness, without the stage context
 * (sources, plan, inventory) `validateStage` needs. A consumer that holds only a
 * draft uses this; it never substitutes for the authoring-stage validation.
 */
export function validateDraftRecord(value: unknown): DossierDraft {
  check(draft, value);
  const data = value as DossierDraft;
  draftHandles(data);
  for (const diagram of data.diagrams) {
    const nodes = new Set(diagram.nodes.map(n => n.id));
    if (diagram.edges.some(e => !nodes.has(e.from) || !nodes.has(e.to))) throw new Error('unknown-node');
  }
  return structuredClone(data);
}

export function reviewVerdict(review: unknown): { blocking: boolean; findings: unknown[] } {
  check(fidelity, review);
  const findings = (review as FidelityReview).findings;
  const data = review as FidelityReview;
  if (data.inventoryCoverage.some(row => row.disposition === 'represented' && row.blockIds.length === 0)) throw new Error('missing-coverage-block');
  if (data.blockSupport.some(row => row.verdict === 'supported' && row.sourceIds.length === 0)) throw new Error('missing-support-source');
  const coverageBlocking = data.inventoryCoverage.some((row) => row.disposition !== 'represented' && row.disposition !== 'justified-omission');
  const supportBlocking = data.blockSupport.some((row) => row.verdict !== 'supported');
  return { blocking: coverageBlocking || supportBlocking || findings.some((finding) => finding.severity === 'blocking'), findings: structuredClone(findings) };
}

/** Mermaid string text safe inside `"…"`: every character Mermaid could read as
 * syntax becomes a numeric entity code, and any whitespace run (including a
 * newline, which would end the statement) becomes one space. */
function mermaidText(value: string): string {
  return value.replace(/\s+/gu, ' ').trim().replace(/["#|<>&[\]{}()`;:%\\]/gu, c => `#${c.codePointAt(0)!};`);
}

/**
 * The reviewable text form of a diagram. The structured record (nodes, edges and
 * their markings) is the declarative source; this export is derived from it
 * deterministically: `flowchart LR`, nodes by position (`n0`, `n1`, …, never the
 * provider handle), observed edges `-->`, inferred `-.->`, unknown `-.->` with an
 * "(unknown)" label suffix, and a class line per non-observed node marking.
 */
export function diagramToMermaid(diagram: Pick<DraftDiagram, 'nodes' | 'edges'>): string {
  const index = new Map(diagram.nodes.map((node, i) => [node.id, `n${i}`]));
  const lines = ['flowchart LR'];
  diagram.nodes.forEach((node, i) => {
    lines.push(`  n${i}["${mermaidText(node.epistemic === 'unknown' ? `${node.label} (unknown)` : node.label)}"]`);
  });
  for (const edge of diagram.edges) {
    const from = index.get(edge.from), to = index.get(edge.to);
    if (from === undefined || to === undefined) throw new Error('unknown-node');
    const label = mermaidText(edge.epistemic === 'unknown' ? `${edge.label} (unknown)` : edge.label);
    lines.push(`  ${from} ${edge.epistemic === 'observed' ? '-->' : '-.->'}|"${label}"| ${to}`);
  }
  for (const marking of ['inferred', 'unknown'] as const) {
    const members = diagram.nodes.flatMap((node, i) => node.epistemic === marking ? [`n${i}`] : []);
    if (members.length > 0) lines.push(`  class ${members.join(',')} ${marking}`);
  }
  lines.push('  classDef inferred stroke-dasharray:6 4', '  classDef unknown stroke-dasharray:2 4');
  return `${lines.join('\n')}\n`;
}
