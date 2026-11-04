import { DESIGN_TOKENS_CSS } from '../design-tokens.js';

import {
  DOSSIER_FORMAT, OWNER_TOPICS, PAGE_SINK_CONTRACT, checkDraftQuotes, diagramToMermaid, isDossierPagePath, parseDossierManifest, readerCost, reviewVerdict, scanDossierPage, sourceTextById, withoutReviewStatusRegion,
  generationSpanRange, validateGenerationSources,
  type DossierDraft, type DossierManifest, type DraftBlock, type DraftDiagram, type DraftParagraph, type EpistemicMarking, type GenerationSource, type LocalPageItem,
  type LocalRenderInput, type LocalSegment, type OwnerTopic, type QuoteFinding,
} from '@syzygy/polaris-generation-core/live';
import { sha256 } from '@syzygy/support';
import { renderDiagramSvg } from './diagram-layout.js';
import { LOCAL_CSS, LOCAL_MACHINE_VIEW, anchorAttributes, anchorDetails, disclosureMarkup, regionMarkup } from './dossier-render-local.js';
import { DRAFT_PREVIEW_CSP_META, DRAFT_PREVIEW_CSS, MARKING_LABEL, escapeHtml as escape } from './draft-preview.js';
import { assertInertSvg } from './svg-inert.js';

/**
 * Multi-page static dossier (gap #8), from the view of a run: a provider pipeline's final output (`dossier-render.ts` builds
 * its view) or an operator-agent run's inputs (`renderLocalDossier`). It
 * emits exactly the `polaris-dossier-v1` markup the evaluation harness reads
 * (`packages/polaris-generation-core/src/dossier-evaluation.ts`):
 *
 * - `index.html` (depth 0): title, introduction and open questions at reading
 *   level 0; every section at level 1, each linking its deep dives.
 * - `contents.html`, `glossary.html`, `sources/index.html` (depth 1).
 * - `deep-dives/<id>.html` (depth 1): one per produced deep dive, level 2.
 * - `sources/<anchor-digest>.html` (depth 2): one per quotable source, its
 *   exact admitted text as one quote with byte offsets, level 3.
 * - `dossier.json`, and `size-report.json` with `size-report.html` (reader
 *   cost, measured from the rendered bytes by the harness's own scanner; the
 *   report pages are linked but are not manifest pages, so they do not count
 *   themselves).
 *
 * Quote offsets are blob-absolute, as anchors are: a piece of a split blob
 * quotes from `segment.start + span.start`. A source CR is written `&#13;`,
 * since an HTML parser turns a raw CR into LF.
 *
 * Topics. Without a `topics` map, a section or deep dive declares the owner
 * topics among its own produced asset ids (the dossier profile's assets are
 * named by owner topic); an unresolved one declares none.
 *
 * Labels. A generated sentence is an LLM assertion, so a block the fidelity
 * review judged `supported` is Inferred and any other block is Unknown;
 * diagram elements keep their own marking; glossary terms are Inferred; open
 * questions are Unknown. Nothing here is Observed except what the draft's
 * diagram records say is.
 *
 * Claim ids. Provider handles may contain `:` but never `/`, so every id this
 * renderer mints carries a `/` (`run-stopped/entry`, `run-stopped/dive/<deep-dive id>`,
 * `not-generated/<id>`, `unresolved/<n>`, `glossary/<term id>`) and can never
 * equal a draft block, diagram or inventory id; `evaluateDossier` counts a
 * repeated `data-claim-id` as a duplicate.
 *
 * Source routes derive from each source's anchor (blob identity plus byte
 * range), never from `generationSourceIdentity`, which every piece of a
 * segmented blob shares: two pieces of one blob get two pages.
 *
 * An operator-agent run (`local`, syzygy-qkea.10) renders through the same
 * pages from inputs `packages/polaris-dossier` derives at its render step.
 * Every label, quotation and anchor is the caller's; the renderer adds the
 * run disclosure and the named review-status region to every page, the run's
 * own pages, RFC7-10 anchors in place of the provider anchor id, and a
 * machine view (`machine.json`) holding every claim it rendered with its
 * label. A quotation renders from the caller's segment, which holds
 * Syzygy's own bytes, never the agent's copy. While the draft layer is
 * Unknown (RFC7-20), no part of the draft renders: the entry page states the
 * policy state, and the source pages, the run's pages the caller passes and
 * the disclosure stay.
 *
 * This module imports nothing from the parked provider island, so the `syzygy` CLI, which injects `renderLocalDossier` into the
 * dossier render step, never loads it (`packages/polaris-generation-core/src/island-boundary.test.ts`).
 */

export interface RenderedDossier {
  /** Every file of the run directory by relative path, `dossier.json` and the size report included. */
  readonly files: ReadonlyMap<string, string>;
  readonly manifest: DossierManifest;
}

export class DossierRenderError extends Error {
  constructor(readonly code: 'not-renderable' | 'missing-requested-assets' | 'unknown-source' | 'unquotable-source' | 'ambiguous-source-anchor' | 'unknown-section' | 'unknown-topic' | 'page-path-collision' | 'invalid-inventory' | 'unknown-stop-reason' | 'unknown-block' | 'duplicate-claim') {
    super(`Dossier render refused: ${code}`);
    this.name = 'DossierRenderError';
  }
}

// Test seam: exported for the tests; production code reaches it only inside this file.
/** The page a quotable source's exact text lives on, from its anchor alone. */
export function sourceRoute(source: Pick<GenerationSource, 'spans' | 'redaction'>): string {
  if (source.spans.length === 0 || (source.redaction === undefined && source.spans.length !== 1)) throw new DossierRenderError('ambiguous-source-anchor');
  return `sources/${sha256(source.spans.map(span => span.anchorId).join('\n')).slice(0, 24)}.html`;
}

const deepDivePath = (id: string): string => `deep-dives/${id.replace(/[^A-Za-z0-9_.-]/gu, '_')}.html`;

/** A relative href from one page to another path (and optional fragment). */
function href(from: string, to: string, fragment?: string): string {
  const up = '../'.repeat(from.split('/').length - 1);
  return `${up}${to}${fragment === undefined ? '' : `#${fragment}`}`;
}

/** Agent prose, escaped, with each complete single-line backtick pair drawn as inline code (SCHEMA-CONTRACT's content tree has inline
 * code; DESIGN-ACCEPTANCE "Rendering" counts raw Markdown syntax as a failure). An unpaired backtick stays literal. Quotations and
 * exact-source text never pass through here. */
export const prose = (text: string): string => escape(text).replace(/`([^`\n]+)`/gu, '<code>$1</code>');

const DOSSIER_CSS = '.dossier-nav{display:flex;flex-wrap:wrap;gap:.5rem 1.5rem}.glossary dt{font-weight:600;margin-top:1rem}.glossary dd{margin:0 0 .5rem}.deep-links{font:.9rem var(--font-mono)}.source-path{font:400 1.4rem/1.4 var(--font-mono);overflow-wrap:anywhere;letter-spacing:0;max-width:none;width:auto}.source-anchor{font:.8rem/1.5 var(--font-mono);color:var(--muted);overflow-wrap:anywhere}';

/** The dossier's own theme, after the shared tokens so it wins on dossier pages only (syzygy-mea.10.1): the warm soft dark palette of the
 * th-projects questionnaire page by default on operator-agent runs only (the provider mode's bytes are pinned), its light palette under `prefers-color-scheme: light`, and tinted callout panels. Every
 * callout keeps its text label ([Inferred], [Unknown], …), so no meaning rests on colour alone. Every text colour is at least 4.5:1 on every
 * page and callout background in both variants, and the focus ring has its own colour, never a claim colour (S11-F2). */
export const DOSSIER_THEME_CSS = ':root{--void:#262624;--panel:#30302e;--panel-raised:#2a2a28;--ink:#f0eee6;--muted:#a6a39a;--line:#3d3c39;'
  + '--cyan:#e5937a;--observed:#6cc28f;--amber:#e0a64a;--unknown:#e0a64a;--proposed:#8fb0f0;--focus:#d0a8ff;'
  + '--d-accent-tint:#3a2c26;--d-ok-tint:#263229;--d-warn-tint:#352d22;--d-info-tint:#262d3d;--d-surface-2:#2a2a28;'
  + '--font-serif:"Iowan Old Style","Charter","Palatino Linotype","Book Antiqua",Georgia,serif;color-scheme:dark}'
  + '@media (prefers-color-scheme:light){:root{--void:#faf9f5;--panel:#ffffff;--panel-raised:#f3f1ea;--ink:#1f1e1d;--muted:#6b6a65;--line:#e6e3da;'
  + '--cyan:#ad4f2c;--observed:#276b43;--amber:#8f5300;--unknown:#8f5300;--proposed:#3a64b8;--focus:#7a3fc8;'
  + '--d-accent-tint:#fbf3ee;--d-ok-tint:#eef6f0;--d-warn-tint:#fbf3e4;--d-info-tint:#eef2fb;--d-surface-2:#f3f1ea;color-scheme:light}}'
  + 'body{background:var(--void);color:var(--ink)}'
  + 'main h1,main h2,main h3{letter-spacing:-.01em}main h2{border-bottom:1px solid var(--line);padding-bottom:.35rem;margin-top:2.5rem}'
  + 'code{font:.88em/1.4 var(--font-mono);background:var(--d-surface-2);border:1px solid var(--line);border-radius:6px;padding:.05em .35em}'
  + 'a.cite{font:600 .78em var(--font-mono);text-decoration:none;vertical-align:super;line-height:0;padding:0 .1em}a.cite:hover{text-decoration:underline}'
  + '.pipeline-notice,.run-disclosure,.review-status{background:var(--d-info-tint);border:1px solid color-mix(in srgb,var(--proposed) 35%,transparent);border-radius:12px;padding:.75rem 1rem}'
  + '.unresolved-asset,.quote-withheld,.unknown-reason,[data-epistemic="unknown"]{background:var(--d-warn-tint);border-radius:8px}'
  + '.unresolved-asset,[data-epistemic="unknown"]{display:block;border-left:4px solid var(--unknown);padding:.6rem .9rem;margin:1rem 0}'
  + '.quote-withheld,.unknown-reason{padding:0 .3em}'
  + '.deep-dive,.note,.group-note{background:var(--d-accent-tint);border-left:4px solid var(--cyan);border-radius:8px;padding:.75rem 1rem}'
  + 'figure{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:1rem;margin:1.5rem 0}figcaption{font-weight:600}'
  + 'q.verified-quote{background:var(--d-ok-tint);border-radius:4px;padding:0 .2em}'
  + 'blockquote.exact-source{background:var(--d-surface-2);border-left:4px solid var(--observed);border-radius:8px;padding:.75rem 1rem}'
  + 'table{border-collapse:collapse;margin:1rem 0;background:var(--panel)}th,td{border:1px solid var(--line);padding:.4rem .6rem;text-align:left;vertical-align:top}th{background:var(--panel-raised)}';

/** What an operator-agent run adds to every page: its notice, the run disclosure, attributes on `main` and the review-status region. */
interface PageChrome { readonly notice: string; readonly disclosure: string; readonly mainAttributes: string; readonly region: string }

function page(title: string, path: string, nav: string, main: string, chrome?: PageChrome): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${DRAFT_PREVIEW_CSP_META}<title>${escape(title)}</title><style>${DESIGN_TOKENS_CSS}
${DRAFT_PREVIEW_CSS}${DOSSIER_CSS}${chrome === undefined ? '' : `${LOCAL_CSS}${DOSSIER_THEME_CSS}`}
</style></head><body><a class="skip" href="#content">Skip to content</a><div class="pipeline-notice">${chrome?.notice ?? 'Generated dossier draft — not reviewed or adopted'}</div>${chrome?.disclosure ?? ''}<div class="layout"><nav class="contents desktop-contents" aria-label="Dossier">${nav}</nav><details class="contents mobile-contents"><summary>In this dossier</summary><nav aria-label="Dossier">${nav}</nav></details><main id="content" data-page="${escape(path)}"${chrome?.mainAttributes ?? ''}>${main}${chrome?.region ?? ''}</main></div></body></html>`;
}

export interface DossierStop { readonly reason: string; readonly shown: string; readonly lastStage: string | null }
/** What a run's pages render from: its draft and what its pipeline recorded about it. An operator-agent run records nothing beyond
 * its draft (`localView`). */
export interface DossierView {
  readonly draft: DossierDraft; readonly drafted: boolean; readonly review: unknown; readonly inventory: unknown; readonly stop: DossierStop | null;
  /** Sections a stopped run planned or requested but never drafted; each renders in place as a notice. */
  readonly deferredSections: ReadonlySet<string>;
  /** Requested assets the page carries nowhere else; listed under "Not generated". */
  readonly notGenerated: readonly { id: string; kind: string }[];
  /** The pipeline's quotation findings, checked again here against the draft; null for an operator-agent run, whose labels are the
   * caller's. */
  readonly quoteFindings: readonly QuoteFinding[] | null;
}

/** What every run's pages share: the source population, and the owner topics by draft id. */
interface DossierSiteInput {
  readonly sources: readonly GenerationSource[];
  /** Owner topics a section or deep dive answers, by draft id. Absent: each
   * produced item's asset ids that are owner topics. */
  readonly topics?: Readonly<Record<string, readonly OwnerTopic[]>>;
}

/** What `renderLocalDossier` takes: an operator-agent run's inputs, which `packages/polaris-dossier` derives at its render step. */
interface LocalDossierRenderInput extends DossierSiteInput {
  readonly local: LocalRenderInput;
}

/** An operator-agent run's view: its checked draft, and nothing a provider pipeline's stages record. */
export const localView = (local: LocalRenderInput): DossierView => ({
  draft: local.draft, drafted: true, review: null, inventory: null, stop: null, deferredSections: new Set(), notGenerated: [], quoteFindings: null,
});

/** Every file of a run's site from its view. `local` is present exactly for an operator-agent run. */
export function renderDossierSite(input: DossierSiteInput & { readonly local?: LocalRenderInput }, view: DossierView): RenderedDossier {
  const { local } = input;
  const { draft, stop } = view;
  // While the draft layer is Unknown no part of the draft renders: not its title, argument, assets, glossary or open questions.
  const withheld = local !== undefined && local.draftLayer.state === 'unknown';
  const title = withheld ? local!.withheldTitle : draft.title;
  if (view.review !== null) reviewVerdict(view.review);
  const support = new Map(view.review === null ? [] : (view.review as { blockSupport: { blockId: string; verdict: string }[] }).blockSupport.map(row => [row.blockId, row.verdict]));
  validateGenerationSources(input.sources);
  const sources = new Map(input.sources.map(source => [source.sourceId, source]));
  // A block whose quotation is not in a cited source is Unknown whatever the reviewer said: the pipeline's own record and a fresh deterministic check over the draft are both honoured.
  // An operator-agent run's labels are the caller's, derived from quotations Syzygy located at its render step.
  const quoteFlags = new Map<string, Set<string>>();
  if (view.quoteFindings !== null) {
    for (const finding of [...view.quoteFindings, ...checkDraftQuotes(draft, sourceTextById(input.sources))]) {
      quoteFlags.set(finding.blockId, (quoteFlags.get(finding.blockId) ?? new Set()).add(finding.kind));
    }
  }
  const owned = (ids: readonly string[]): OwnerTopic[] => ids.filter((id): id is OwnerTopic => (OWNER_TOPICS as readonly string[]).includes(id));
  const topics: Readonly<Record<string, readonly OwnerTopic[]>> = input.topics
    ?? Object.fromEntries([...draft.sections, ...draft.deepDives].map(item => [item.id, item.disposition.kind === 'produced' ? owned(item.disposition.assetIds) : []]));
  for (const list of Object.values(topics)) if (list.some(topic => !(OWNER_TOPICS as readonly string[]).includes(topic))) throw new DossierRenderError('unknown-topic');
  const sectionIds = new Set(draft.sections.map(section => section.id));
  for (const item of [...draft.diagrams, ...draft.deepDives]) if (!sectionIds.has(item.sectionId)) throw new DossierRenderError('unknown-section');

  const deepDives = withheld ? [] : draft.deepDives.filter(dive => dive.disposition.kind === 'produced');
  const deepPaths = new Map(deepDives.map(dive => [dive.id, deepDivePath(dive.id)]));
  if (new Set(deepPaths.values()).size !== deepPaths.size) throw new DossierRenderError('page-path-collision');
  const quotable = input.sources.filter(source => !source.exclusion.excluded && source.classificationBasis === 'body' && source.spans.length > 0);
  const sourcePaths = new Map(quotable.map(source => [source.sourceId, sourceRoute(source)]));

  // --- shared fragments, each bound to the page it is rendered on
  const label = (blockId: string): EpistemicMarking => support.get(blockId) === 'supported' && !quoteFlags.has(blockId) ? 'inferred' : 'unknown';
  const quoteNote = (blockId: string): string => quoteFlags.has(blockId)
    ? ` <span class="quote-unverified">Quotation not verified against the cited sources (${escape([...quoteFlags.get(blockId)!].join(', '))}).</span>` : '';
  const marking = (m: EpistemicMarking): string => `<span class="marking ${m}">[${MARKING_LABEL[m]}]</span>`;
  // Each page numbers its sources [1], [2], … in the order it first cites them; the identifier rides on `data-source-id` and the source
  // page, never in the reading text (DESIGN-ACCEPTANCE "Depth and evidence": references must not dominate the narrative).
  const numbering = new Map<string, Map<string, number>>();
  const citeNumber = (from: string, id: string): number => {
    let onPage = numbering.get(from);
    if (onPage === undefined) { onPage = new Map(); numbering.set(from, onPage); }
    let n = onPage.get(id);
    if (n === undefined) { n = onPage.size + 1; onPage.set(id, n); }
    return n;
  };
  const sourceLabel = (from: string, id: string): string => `Source ${citeNumber(from, id)}: ${sources.get(id)!.path}`;
  const refs = (from: string, ids: readonly string[]): string => `<span class="sources">${ids.map(id => {
    const source = sources.get(id);
    if (source === undefined) throw new DossierRenderError('unknown-source');
    const target = sourcePaths.get(id);
    if (target === undefined) throw new DossierRenderError('unquotable-source');
    const note = source.redaction === undefined ? '' : ` <span class="redaction-note">[redacted-span: ${source.redaction.withheldLines} withheld line(s) in this file]</span>`;
    // The provider mode's bytes are pinned (dossier-render-provider-golden.test.ts); only an operator-agent run numbers its sources.
    if (local === undefined) return `<a href="${escape(href(from, target, 'exact-text'))}" aria-label="Read source ${escape(id)}">[${escape(id)}]</a>${note}`;
    return `<a class="cite" href="${escape(href(from, target, 'exact-text'))}" data-source-id="${escape(id)}" aria-label="${escape(sourceLabel(from, id))}" title="${escape(source.path)}">[${citeNumber(from, id)}]</a>${note}`;
  }).join(' ')}</span>`;
  // Every claim a page carries, in the order it is built; `add` files them under that page for the machine view.
  const pending: { id: string; epistemic: EpistemicMarking; unknownReason: string | null }[] = [];
  // `attributes` is markup the caller built with escape(); nothing is spliced in afterwards.
  const claim = (tag: string, id: string, m: EpistemicMarking, body: string, attributes = '', unknownReason: string | null = null): string => {
    pending.push({ id, epistemic: m, unknownReason });
    return `<${tag}${attributes} data-claim-id="${escape(id)}" data-epistemic="${m}">${body}</${tag}>`;
  };
  // An operator-agent block: its segments (Syzygy's located bytes for every quotation), its marking and reason, and the commands a claim
  // resting on execution names. A non-normative block is no claim and carries no anchor.
  const nonNormative: { page: string; id: string }[] = [];
  const quotations: { page: string; blockId: string; sourceId: string; start: number; end: number; anchor: unknown; redaction?: { redactionClass: 'redacted-span'; withheldLines: number } }[] = [];
  const segment = (from: string, blockId: string, part: LocalSegment): string => {
    if (part.kind === 'prose') return prose(part.text);
    if (part.kind === 'withheld') return `<span class="quote-withheld" data-unknown-reason="${escape(part.reason)}">[quotation withheld: the file it cites is excluded by screening]</span>`;
    const target = sourcePaths.get(part.sourceId);
    if (target === undefined) throw new DossierRenderError('unquotable-source');
    const redaction = sources.get(part.sourceId)?.redaction;
    const disclosure = redaction === undefined ? {} : { redaction: { redactionClass: redaction.redactionClass, withheldLines: redaction.withheldLines } };
    quotations.push({ page: from, blockId, sourceId: part.sourceId, start: part.start, end: part.end, anchor: part.anchor, ...disclosure });
    return `<q class="verified-quote" data-quote-source="${escape(part.sourceId)}" data-quote-start="${part.start}" data-quote-end="${part.end}">${escape(part.text).replace(/\r/gu, '&#13;')}</q> ${marking('observed')} <a class="anchor-link cite" href="${escape(href(from, target, 'exact-text'))}" data-source-id="${escape(part.sourceId)}" aria-label="${escape(`${sourceLabel(from, part.sourceId)}, ${part.anchor.fragment === null ? 'whole file' : `bytes ${part.anchor.fragment.start}–${part.anchor.fragment.end}`}`)}"${anchorAttributes(part.anchor, escape)}>[${citeNumber(from, part.sourceId)}]</a>${redaction === undefined ? '' : ` <span class="redaction-note">[redacted-span: ${redaction.withheldLines} withheld line(s) in this file]</span>`}`;
  };
  const localParagraph = (from: string, p: DraftParagraph, tag: string): string => {
    const b = local!.blocks.get(p.id);
    if (b === undefined) throw new DossierRenderError('unknown-block');
    const body = b.segments.map(part => segment(from, p.id, part)).join('');
    if (b.marking === 'non-normative') {
      nonNormative.push({ page: from, id: p.id });
      return `<${tag} class="non-normative" data-non-normative="${escape(p.id)}">${body} <span class="marking non-normative">[Non-normative]</span></${tag}>`;
    }
    const reason = b.unknownReason === null ? '' : ` <span class="unknown-reason">(${escape(b.unknownReason)}: ${escape(b.basis)})</span>`;
    const executions = b.executions.length === 0 ? '' : ` <span class="executions">Rests on the agent's report of running ${b.executions.map(run => `<code>${escape(run.command)}</code>`).join('; ')} (Inferred, self-reported)</span>`;
    return claim(tag, p.id, b.marking, `${body} ${marking(b.marking)}${reason}${executions} ${refs(from, p.sourceIds)}`,
      b.unknownReason === null ? '' : ` data-unknown-reason="${escape(b.unknownReason)}"`, b.unknownReason);
  };
  const paragraph = (from: string, p: DraftParagraph, tag: string): string => local !== undefined ? localParagraph(from, p, tag)
    : claim(tag, p.id, label(p.id), `${escape(p.text)} ${marking(label(p.id))}${quoteNote(p.id)} ${refs(from, p.sourceIds)}`);
  // A labelled record on one of the run's own pages, or a glossary term.
  const item = (from: string, tag: string, entry: LocalPageItem): string => claim(tag, entry.id, entry.marking,
    `${entry.title === null ? '' : `<strong>${escape(entry.title)}</strong>: `}${(local === undefined ? escape : prose)(entry.text)} ${marking(entry.marking)}${entry.unknownReason === null ? '' : ` <span class="unknown-reason">(${escape(entry.unknownReason)})</span>`}${entry.details.length === 0 ? '' : `<ul class="item-details">${entry.details.map(detail => `<li>${escape(detail)}</li>`).join('')}</ul>`} ${refs(from, entry.sourceIds)}`,
    entry.unknownReason === null ? '' : ` data-unknown-reason="${escape(entry.unknownReason)}"`, entry.unknownReason);
  const block = (from: string, b: DraftBlock): string => {
    const parent = paragraph(from, b, 'p');
    return b.children.length === 0 ? parent : `${parent}<ul class="block-children">${b.children.map(child => paragraph(from, child, 'li')).join('')}</ul>`;
  };
  const notice = (id: string, disposition: { kind: string; reason?: string; references?: string[] }): string =>
    `<aside class="unresolved-asset" data-asset-disposition="${escape(disposition.kind)}"><strong>${escape(id)}</strong>: ${escape(disposition.reason ?? '')} <span class="asset-references">(${escape((disposition.references ?? []).join(', '))})</span></aside>`;
  const diagram = (from: string, d: DraftDiagram, index: number): string => {
    if (d.disposition.kind !== 'produced') return notice(d.id, d.disposition);
    const nodes = new Map(d.nodes.map(node => [node.id, node]));
    const nodeList = d.nodes.map(n => claim('li', n.id, n.epistemic, `${escape(n.label)} ${marking(n.epistemic)} ${refs(from, n.sourceIds)}`)).join('');
    const edgeList = d.edges.map(e => claim('li', e.id, e.epistemic, `${escape(nodes.get(e.from)!.label)} → ${escape(nodes.get(e.to)!.label)}: ${escape(e.label)} ${marking(e.epistemic)} ${refs(from, e.sourceIds)}`)).join('');
    let svg: string;
    try {
      svg = renderDiagramSvg(d, index, escape);
      assertInertSvg(svg);
    } catch {
      return notice(d.id, { kind: 'unresolved', reason: 'diagram could not be rendered inertly', references: [...new Set([...d.nodes, ...d.edges].flatMap(element => element.sourceIds))] });
    }
    const legend = '<ul class="diagram-legend" aria-label="Line styles"><li><span class="legend-line observed" aria-hidden="true"></span>Solid: observed</li><li><span class="legend-line inferred" aria-hidden="true"></span>Dashed: inferred</li><li><span class="legend-line unknown" aria-hidden="true"></span>Dotted: unknown (label ends “?”)</li></ul>';
    return `<figure><figcaption>${escape(d.title)}</figcaption><p class="diagram-relationship"><span class="eyebrow">${escape(d.kind)}</span> ${escape(d.relationship)}</p><div class="diagram-scroll">${svg}</div>${legend}<details><summary>Read every component and relationship</summary><ul>${nodeList}</ul><ol>${edgeList}</ol><details class="diagram-source"><summary>Declarative source (Mermaid)</summary><pre>${escape(diagramToMermaid(d))}</pre></details></details></figure>`;
  };
  const topicAttr = (id: string): string => ` data-topics="${escape((topics[id] ?? []).join(' '))}"`;
  const localPages = local?.pages ?? [];
  const reserved = new Set(['index.html', 'contents.html', 'glossary.html', 'dossier.json', 'size-report.json', 'size-report.html', LOCAL_MACHINE_VIEW, ...deepPaths.values(), ...sourcePaths.values()]);
  for (const localPage of localPages) {
    if (!isDossierPagePath(localPage.path) || localPage.path.includes('/') || !localPage.path.endsWith('.html') || reserved.has(localPage.path)) throw new DossierRenderError('page-path-collision');
    reserved.add(localPage.path);
  }
  const localNav = (from: string): string => localPages.map(localPage => `<li><a href="${escape(href(from, localPage.path))}">${escape(localPage.title)}</a></li>`).join('');
  const nav = (from: string): string => `<span class="eyebrow">${escape(title)}</span><ol><li><a href="${href(from, 'index.html')}">Overview</a></li><li><a href="${href(from, 'contents.html')}">Contents</a></li>${deepDives.map(dive => `<li><a href="${escape(href(from, deepPaths.get(dive.id)!))}">${escape(dive.title)}</a></li>`).join('')}<li><a href="${href(from, 'glossary.html')}">Glossary</a></li><li><a href="${href(from, 'sources/index.html')}">Sources</a></li>${localNav(from)}<li><a href="${href(from, 'size-report.html')}">Size report</a></li></ol>`;
  const chrome: PageChrome | undefined = local === undefined ? undefined : {
    notice: withheld ? 'Operator-agent dossier — draft layer Unknown (unconsented-source-or-provider)' : 'Operator-agent editorial draft — not adopted; how it was made is stated below',
    disclosure: disclosureMarkup(local.disclosure, escape),
    mainAttributes: local.draftLayer.state === 'editorial-draft'
      ? ` data-draft-state="editorial-draft" data-inference-model="${escape(local.draftLayer.inferenceProvenance.modelIdentity)}" data-inference-model-version="${escape(local.draftLayer.inferenceProvenance.modelVersion ?? 'not shown by the agent tool')}"`
      : ' data-draft-state="unknown" data-unknown-reason="unconsented-source-or-provider"',
    region: regionMarkup(local.reviewStatus, escape),
  };

  const files = new Map<string, string>();
  const pages: { path: string; depth: number }[] = [];
  const claimsByPage: { page: string; id: string; epistemic: EpistemicMarking; unknownReason: string | null }[] = [];
  const add = (path: string, depth: number, pageTitle: string, main: string): void => {
    files.set(path, page(`${pageTitle} — ${title}`, path, nav(path), main, chrome));
    pages.push({ path, depth });
    claimsByPage.push(...pending.splice(0).map(entry => ({ page: path, ...entry })));
  };

  // --- entry page
  const from = 'index.html';
  const unresolved = withheld ? '' : draft.unresolved.map((item, index) => claim('aside', `unresolved/${index + 1}`, 'unknown',
    `<strong>${escape(item.question)}</strong>: ${escape(item.reason)} ${marking('unknown')} <span class="asset-references">(${escape(item.references.join(', '))})</span>`)).join('');
  const notGenerated = (id: string, kind: string): string => claim('aside', `not-generated/${id}`, 'unknown',
    `<strong>${escape(id)}</strong> (${escape(kind)}): not generated; the run stopped before it was written (${escape(stop!.shown)}). ${marking('unknown')}`,
    ` class="unresolved-asset" data-asset-disposition="not-generated" data-stop-reason="${escape(stop!.shown)}"`);
  const sections = withheld ? '' : draft.sections.map((section, index) => {
    const head = `<span class="eyebrow">${String(index + 1).padStart(2, '0')}</span><h2>${escape(section.title)}</h2>`;
    if (view.deferredSections.has(section.id)) return `<section id="section-${escape(section.id)}" data-reading-level="1" data-topics="">${head}${notGenerated(section.id, 'section')}</section>`;
    if (section.disposition.kind !== 'produced') return `<section id="section-${escape(section.id)}" data-reading-level="1"${topicAttr(section.id)}>${head}${notice(section.id, section.disposition)}</section>`;
    const figures = draft.diagrams.map((d, i) => d.sectionId === section.id ? diagram(from, d, i) : '').join('');
    const dives = draft.deepDives.filter(dive => dive.sectionId === section.id).map(dive => dive.disposition.kind === 'produced'
      ? `<li><a href="${escape(deepPaths.get(dive.id)!)}">Explore: ${escape(dive.title)}</a></li>` : `<li>${notice(dive.id, dive.disposition)}</li>`).join('');
    return `<section id="section-${escape(section.id)}" data-reading-level="1"${topicAttr(section.id)}>${head}${section.paragraphs.map(b => block(from, b)).join('')}${figures}${dives ? `<ul class="deep-links">${dives}</ul>` : ''}</section>`;
  }).join('');
  // Claim ids are unique across the dossier, so each page's banner carries its own.
  const bannerFor = (claimId: string): string => stop === null ? '' : claim('aside', claimId, 'unknown',
    `<strong>Incomplete dossier.</strong> The run stopped (${escape(stop.shown)}) ${stop.lastStage === null ? 'before any stage completed' : `after the ${escape(stop.lastStage)} stage`}${view.drafted && view.review === null ? '; no fidelity review covers this draft, so every generated sentence is Unknown' : ''}. ${marking('unknown')}`,
    ` class="run-stopped" data-stop-reason="${escape(stop.shown)}"`);
  const banner = bannerFor('run-stopped/entry');
  if (withheld) {
    const why = (local!.draftLayer as Extract<LocalRenderInput['draftLayer'], { state: 'unknown' }>).why;
    const policy = claim('aside', 'draft-layer/policy-state', 'unknown',
      `<strong>The draft layer is Unknown (unconsented-source-or-provider).</strong> No part of the agent's draft is shown: under the owner's reading of RFC7-20 an operator-computed draft renders only while every condition holds, and ${why.length === 1 ? 'one does' : `${why.length} do`} not. ${marking('unknown')}<ul class="item-details">${why.map(reason => `<li>${escape(reason)}</li>`).join('')}</ul> The source pages Syzygy read and screened, and how this run was made, remain readable.`,
      ' class="policy-state" data-unknown-reason="unconsented-source-or-provider"', 'unconsented-source-or-provider');
    add(from, 0, 'Overview', `<header data-reading-level="0"><span class="eyebrow">Polaris · Draft layer Unknown</span><h1>${escape(title)}</h1>${policy}</header>`);
  } else {
    const introduction = view.drafted ? paragraph(from, draft.introduction, 'p') : '';
    const missingList = view.notGenerated.length === 0 ? '' : `<section id="not-generated" data-reading-level="1" data-topics=""><h2>Not generated</h2>${view.notGenerated.map(item => notGenerated(item.id, item.kind)).join('')}</section>`;
    add(from, 0, 'Overview', `<header data-reading-level="0"><span class="eyebrow">Polaris · Editorial draft</span><h1>${escape(draft.title)}</h1>${banner}${introduction}${unresolved}</header>${sections}${missingList}`);
  }

  // --- deep dives
  for (const dive of deepDives) {
    const path = deepPaths.get(dive.id)!;
    const parent = draft.sections.find(section => section.id === dive.sectionId)!;
    add(path, 1, dive.title, `<section id="deep-dive-${escape(dive.id)}" data-reading-level="2"${topicAttr(dive.id)}><span class="eyebrow">Deep dive · <a href="${escape(href(path, 'index.html', `section-${parent.id}`))}">${escape(parent.title)}</a></span><h1>${escape(dive.title)}</h1>${bannerFor(`run-stopped/dive/${dive.id}`)}${dive.paragraphs.map(b => block(path, b)).join('')}</section>`);
  }

  // --- contents
  const contents = `<ol>${(withheld ? [] : draft.sections).map(section => `<li><a href="${escape(href('contents.html', 'index.html', `section-${section.id}`))}">${escape(section.title)}</a>${draft.deepDives.some(dive => dive.sectionId === section.id && deepPaths.has(dive.id))
    ? `<ol>${draft.deepDives.filter(dive => dive.sectionId === section.id && deepPaths.has(dive.id)).map(dive => `<li><a href="${escape(href('contents.html', deepPaths.get(dive.id)!))}">${escape(dive.title)}</a></li>`).join('')}</ol>` : ''}</li>`).join('')}<li><a href="glossary.html">Glossary</a></li><li><a href="sources/index.html">Sources</a></li>${localNav('contents.html')}<li><a href="size-report.html">Size report</a></li></ol>`;
  add('contents.html', 1, 'Contents', `<section id="contents"><h1>Contents</h1>${contents}</section>`);

  // --- glossary: inventory terms, each an Inferred claim; for an operator-agent run, the understanding record's terminology
  const entries = local !== undefined ? [] : (view.inventory as { entries?: unknown } | null)?.entries;
  if (!Array.isArray(entries) && !(stop !== null && view.inventory === null)) throw new DossierRenderError('invalid-inventory');
  const terms = Array.isArray(entries) ? (entries as { id: string; kind: string; statement: string; sourceIds: string[] }[]).filter(entry => entry.kind === 'term') : [];
  const glossary = local !== undefined
    ? withheld ? '<p>The draft layer is Unknown, so the agent\'s terminology is not shown.</p>'
      : local.glossary.length === 0 ? '<p>The understanding record states no terms, so this glossary is empty.</p>'
      : `<dl class="glossary">${local.glossary.map(term => `<dt id="term-${escape(term.id)}">${escape(term.title ?? term.id)}</dt>${item('glossary.html', 'dd', { ...term, title: null })}`).join('')}</dl>`
    : !Array.isArray(entries)
    ? claim('p', 'glossary/not-generated', 'unknown', `No inventory was produced before the run stopped (${escape(stop!.shown)}), so this glossary is empty. ${marking('unknown')}`)
    : terms.length === 0
    ? '<p>The inventory recorded no terms, so this glossary is empty.</p>'
    : `<dl class="glossary">${terms.map(term => `<dt id="term-${escape(term.id)}">${escape(term.id)}</dt>${claim('dd', `glossary/${term.id}`, 'inferred', `${escape(term.statement)} ${marking('inferred')} ${refs('glossary.html', term.sourceIds)}`)}`).join('')}</dl>`;
  add('glossary.html', 1, 'Glossary', `<section id="glossary"><h1>Glossary</h1>${glossary}</section>`);

  // --- sources: the whole population as a denominator, then one page per quotable source
  const list = input.sources.map(source => {
    const target = sourcePaths.get(source.sourceId);
    const redactedNote = source.redaction === undefined ? '' : ` · redacted-span: ${source.redaction.withheldLines} withheld line(s) in this file`;
    const reason = source.exclusion.excluded ? source.exclusion.reason : source.classificationBasis === 'path-only' ? 'path-only; body not read' : 'body unavailable for citation';
    return target === undefined
      ? `<li>${escape(source.path)} [${escape(source.sourceId)}] — counted; exact text unavailable: ${escape(reason)}${escape(redactedNote)}.</li>`
      : `<li><a href="${escape(href('sources/index.html', target))}">${escape(source.path)}</a> [${escape(source.sourceId)}]${escape(redactedNote)}</li>`;
  }).join('');
  add('sources/index.html', 1, 'Sources', `<section id="sources"><h1>Sources</h1><p>${input.sources.length} sources counted, ${quotable.length} with admitted text.</p><ul>${list}</ul></section>`);
  for (const source of quotable) {
    const path = sourcePaths.get(source.sourceId)!;
    const span = source.spans[0]!;
    const [start, end] = generationSpanRange(source, span);
    const anchor = local?.sourceAnchors.get(source.sourceId);
    if (local !== undefined && anchor === undefined) throw new DossierRenderError('unquotable-source');
    const identity = anchor === undefined ? ` · <code>${escape(span.anchorId)}</code></p>` : `</p>${anchorDetails(anchor, escape)}`;
    const read = anchor === undefined ? '' : `<p class="read-note">${marking('observed')} Syzygy read the original Git blob at the pinned revision at this render and recomputed its object identifier before screening.</p>`;
    let exact = '';
    if (source.redaction === undefined) exact = `<blockquote class="exact-source" data-quote-source="${escape(source.sourceId)}" data-quote-start="${start}" data-quote-end="${end}">${escape(span.text).replace(/\r/gu, '&#13;')}</blockquote>`;
    else {
      // Only surviving original spans are quotation evidence. Projection gaps are the screen's marker lines, never quotable bytes.
      const bytes = Buffer.from(source.body!);
      let at = 0;
      for (const kept of source.spans) {
        if (kept.start > at) exact += `<pre class="redaction-note">${escape(bytes.subarray(at, kept.start).toString('utf8')).replace(/\r/gu, '&#13;')}</pre>`;
        const [from, to] = generationSpanRange(source, kept);
        exact += `<blockquote class="exact-source" data-quote-source="${escape(source.sourceId)}" data-quote-start="${from}" data-quote-end="${to}">${escape(kept.text).replace(/\r/gu, '&#13;')}</blockquote>`;
        at = kept.end;
      }
      if (at < bytes.length) exact += `<pre class="redaction-note">${escape(bytes.subarray(at).toString('utf8')).replace(/\r/gu, '&#13;')}</pre>`;
    }
    const extent = source.redaction === undefined ? `bytes ${start}–${end} of the file` : `redacted-span: ${source.redaction.withheldLines} withheld line(s) in this file; surviving spans use original Git byte coordinates`;
    add(path, 2, source.path, `<section id="exact-text" data-reading-level="3"><h1 class="source-path">${escape(source.path)}</h1><p class="source-anchor">${escape(source.sourceId)} · ${extent}${identity}${exact}${read}</section>`);
  }

  // --- the operator-agent run's own pages: understanding, discovery, clarifications, executions, review
  for (const localPage of localPages) {
    const groups = localPage.groups.map(group => `<section id="${escape(group.id)}" data-reading-level="1" data-topics=""><h2>${escape(group.heading)}</h2><p class="group-note">${escape(group.note)}</p>${group.items.length === 0 ? `<p>${escape(group.empty)}</p>` : `<ul class="local-items">${group.items.map(entry => item(localPage.path, 'li', entry)).join('')}</ul>`}</section>`).join('');
    add(localPage.path, 1, localPage.title, `<section id="page-${escape(localPage.path.replace(/\.html$/u, ''))}" data-topics=""><h1>${escape(localPage.title)}</h1><p>${escape(localPage.intro)}</p>${groups}</section>`);
  }
  if (local !== undefined) {
    const ids = claimsByPage.map(entry => entry.id);
    if (new Set(ids).size !== ids.length) throw new DossierRenderError('duplicate-claim');
  }

  const manifest = parseDossierManifest(JSON.stringify({ format: DOSSIER_FORMAT, title, entryPage: 'index.html', pages }));
  files.set('dossier.json', `${JSON.stringify(manifest, null, 2)}\n`);
  // An operator-agent page is measured without its review-status region, so a render that changes only the region leaves the size
  // report unchanged and a rendered-design review counted.
  const measured = (html: string): string => (local === undefined ? html : withoutReviewStatusRegion(html) ?? html);
  const scanned = new Map(pages.map(p => [p.path, scanDossierPage(measured(files.get(p.path)!))]));
  const cost = readerCost(manifest, scanned);
  files.set('size-report.json', `${JSON.stringify({ format: 'polaris-dossier-size-report-v1', ...cost }, null, 2)}\n`);
  const first = cost.firstReadingLevel;
  const count = (value: number | null): string => value === null ? 'Unknown' : String(value);
  files.set('size-report.html', page(`Size report — ${title}`, 'size-report.html', nav('size-report.html'), `<section id="size-report"><h1>Size report</h1>`
    + `<p>What a reader loads before choosing where to go: the first reading level of <a href="index.html">the overview</a>, ${count(first.bytesThroughFirstLevel)} bytes and ${count(first.words)} words, of an entry page of ${first.entryPageBytes} bytes. All ${cost.pages.length} pages: ${cost.pages.reduce((n, p) => n + p.bytes, 0)} bytes. No budget is declared, so nothing here is within or over one.</p>`
    + `<table><thead><tr><th>Link depth</th><th>Pages</th><th>Bytes</th><th>Words</th></tr></thead><tbody>${cost.perPageDepth.map(row => `<tr><td>${row.depth}</td><td>${row.pages}</td><td>${row.bytes}</td><td>${row.words}</td></tr>`).join('')}</tbody></table>`
    + `<table><thead><tr><th>Page</th><th>Depth</th><th>Bytes</th><th>Words</th></tr></thead><tbody>${cost.pages.map(row => `<tr><td><a href="${escape(row.path)}">${escape(row.path)}</a></td><td>${row.depth}</td><td>${row.bytes}</td><td>${Object.values(row.wordsByReadingLevel).reduce((n, w) => n + w, 0) + row.unlabelledWords}</td></tr>`).join('')}</tbody></table>`
    + `<p>Measured from the rendered bytes by the evaluation harness's scanner. This page and size-report.json are not counted${local === undefined ? '' : ', and each page is measured without its review-status region'}.</p></section>`, chrome));
  if (local !== undefined) {
    // The machine channel of the same render: every claim it rendered with its label and page, the non-normative blocks, every
    // quotation with its anchor, the source anchors, the disclosure, the draft layer and the review-status region.
    files.set(LOCAL_MACHINE_VIEW, `${JSON.stringify({
      format: 'polaris-dossier-local-machine-view/1',
      title,
      draftLayer: local.draftLayer,
      disclosure: local.disclosure,
      reviewStatus: local.reviewStatus,
      pages: [...pages.map(p => p.path), 'size-report.html'],
      claims: claimsByPage,
      nonNormative,
      quotations,
      sources: quotable.map(source => ({ sourceId: source.sourceId, page: sourcePaths.get(source.sourceId)!, anchor: local.sourceAnchors.get(source.sourceId)!, ...(source.redaction === undefined ? {} : { redaction: { redactionClass: source.redaction.redactionClass, withheldLines: source.redaction.withheldLines } }) })),
      localPages: localPages,
    }, null, 2)}\n`);
  }
  return { files, manifest };
}

/** An operator-agent run's site: what the `syzygy` CLI injects into the dossier render step. */
export function renderLocalDossier(input: LocalDossierRenderInput): RenderedDossier {
  return renderDossierSite(input, localView(input.local));
}
/** The encoding half of the screening scope's render condition (policy version 3): every page writes each source byte through
 * `escape` and carries `DRAFT_PREVIEW_CSP_META` first in its head. `page-sink.test.ts` fails if either stops holding. */
renderLocalDossier.pageSinkContract = PAGE_SINK_CONTRACT;
