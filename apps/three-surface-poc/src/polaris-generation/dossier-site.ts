import { DESIGN_TOKENS_CSS } from '../design-tokens.js';
import { DOSSIER_STYLE as tokens } from './dossier-style-tokens.js';

import {
  CONTAINMENT_KIND, DOSSIER_FORMAT, OWNER_TOPICS, PAGE_SINK_CONTRACT, checkDraftQuotes, diagramToMermaid, figureToMermaid, isDossierPagePath, parseDossierManifest, readerCost, reviewVerdict, scanDossierPage, sourceTextById, withoutReviewStatusRegion,
  generationSourceIdentity, generationSpanRange, validateGenerationSources,
  type DossierDraft, type DossierManifest, type DraftBlock, type DraftContainmentGroup, type DraftDiagram, type DraftElement, type DraftFigure, type DraftFigureElement, type DraftParagraph, type EpistemicMarking, type GenerationSource, type LocalPageItem,
  type LocalBlock, type LocalDerivedFact, type LocalDerivedStructure, type LocalManifestFact, type LocalManifestFacts, type LocalManifestFileEntry, type LocalManifestRecognizerEntry, type LocalEdgeRelation, type LocalRenderInput, type LocalSegment, type OwnerTopic, type QuoteFinding, type WithheldNote,
} from '@syzygy/polaris-generation-core/live';
import { sha256 } from '@syzygy/support';
import { READABLE_SPACING, layoutContainment, layoutDiagram, layoutSequence, layoutSwimlane, renderContainmentSvg, renderDiagramSvg, renderSequenceSvg, renderSwimlaneSvg, type ContainmentClaim } from './diagram-layout.js';
import { TEST_NAMES_LEGEND, TEST_NAMES_PAGE, testNamesMachine, testNamesPage } from './dossier-test-names.js';
import { ROUGH_EDGES_LEGEND, ROUGH_EDGES_PAGE, roughEdgesMachine, roughEdgesPage } from './dossier-rough-edges.js';
import { DOCS_AND_CODE_LEGEND, DOCS_AND_CODE_PAGE, docsAndCodeMachine, docsAndCodePage } from './dossier-docs-and-code.js';
import { FINDING_CSS, FIND_BY_TASK_PAGE, NAME_INDEX_PAGE, NO_TASK_ROUTES, TASK_ROUTES_WITHHELD, buildNameIndex, glossaryDisplayName, glossaryNameForms, indexLinkCount, renderNameIndex, type IndexTarget, type IndexedBlock } from './dossier-finding.js';
import { LOCAL_CSS, LOCAL_MACHINE_VIEW, anchorAttributes, anchorDetails, disclosureList, regionMarkup } from './dossier-render-local.js';
import { DRAFT_PREVIEW_CSP_META, DRAFT_PREVIEW_CSS, MARKING_LABEL, escapeHtml as escape } from './draft-preview.js';
import { assertInertSvg } from './svg-inert.js';
import { citationLabel, drawSourceLines, rangesOnSource, sourceByteRange, sourceLines, type CitationRange, type SourceHighlight } from './dossier-source-lines.js';

const SOURCE_LINES_CSS = `html{scroll-behavior:auto}.source-line{position:relative;display:block;min-block-size:${tokens.length.singleRow};padding-inline-start:${tokens.length.sourceLineGutter};overflow-wrap:anywhere;`
  + `scroll-margin-block-start:${tokens.spacing.standard}}`
  + `.source-line::before{position:absolute;inset-inline-start:${tokens.length.sourceLineLabelInset};width:${tokens.length.sourceLineNumber};text-align:end;content:attr(data-line);`
  + `color:var(--muted);user-select:none}`
  + '.source-continuation{display:none}.source-continuation a{display:block;width:fit-content}'
  + `.source-continuation-target{position:absolute;inset-block-start:${tokens.spacing.none};scroll-margin-block-start:${tokens.spacing.standard}}`;

/**
 * Multi-page static dossier (gap #8), from the view of a run: a provider pipeline's final output (`dossier-render.ts` builds
 * its view) or an operator-agent run's inputs (`renderLocalDossier`). It
 * emits exactly the `polaris-dossier-v1` markup the evaluation harness reads
 * (`packages/polaris-generation-core/src/dossier-evaluation.ts`):
 *
 * - `index.html` (depth 0): title, introduction and open questions at reading
 *   level 0; every section at level 1, each linking its deep dives.
 * - `contents.html`, `glossary.html`, `sources/index.html` (depth 1).
 * - `find-by-task.html` and `name-index.html` (depth 1; operator-agent runs only, `dossier-finding.ts`): the draft's task routes,
 *   each step a claim block, and the generated index of every name the site shows.
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
  constructor(readonly code: 'not-renderable' | 'missing-requested-assets' | 'unknown-source' | 'unquotable-source' | 'ambiguous-source-anchor' | 'unknown-section' | 'unknown-topic' | 'page-path-collision' | 'invalid-inventory' | 'unknown-stop-reason' | 'unknown-block' | 'duplicate-claim' | 'invalid-poles') {
    super(`Dossier render refused: ${code}`);
    this.name = 'DossierRenderError';
  }
}

/** The line a code-read thesis renders under (REQ-polaris-generation-034 version 2.4): Syzygy's words, attributing the absence of a
 * maintainer statement of purpose to the authoring session. */
export const THESIS_BASIS_LINE = '<p class="thesis-basis" data-thesis-basis="code-reading">The authoring session found no maintainer statement of purpose, so this summary is Polaris\'s reading of the code, not the maintainers\' words.</p>';

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

const DOSSIER_CSS = `.dossier-nav{display:flex;flex-wrap:wrap;gap:${tokens.spacing.small} ${tokens.spacing.section}}.glossary dt{font-weight:${tokens.type.strongWeight};margin-top:${tokens.spacing.standard}}`
  + `.glossary dd{margin:${tokens.spacing.none} ${tokens.spacing.none} ${tokens.spacing.small}}.deep-links{font:${tokens.type.bodySmall} var(--font-mono)}`
  + `.source-path{font:${tokens.type.normalWeight} ${tokens.type.sourcePath}/${tokens.type.compactLeading} var(--font-mono);overflow-wrap:anywhere;letter-spacing:${tokens.type.normalTracking};`
  + `max-width:none;width:auto}.source-anchor{font:${tokens.type.sourceHint}/${tokens.type.bodyLeading} var(--font-mono);color:var(--muted);overflow-wrap:anywhere}`;

/** The dossier's own theme, after the shared tokens so it wins on dossier pages only (syzygy-mea.10.1): the warm soft dark palette of the
 * th-projects questionnaire page by default on operator-agent runs only (the provider mode's bytes are pinned), its light palette under `prefers-color-scheme: light`, and tinted callout panels. Every
 * callout keeps its text label ([Inferred], [Unknown], …), so no meaning rests on colour alone. Every text colour is at least 4.5:1 on every
 * page and callout background in both variants, and the focus ring has its own colour, never a claim colour (S11-F2). */
export const DOSSIER_THEME_CSS = `:root{--void:${tokens.dark.canvas};--panel:${tokens.dark.panel};--panel-raised:${tokens.dark.raisedPanel};--ink:${tokens.dark.ink};--muted:${tokens.dark.quietInk};--line:${tokens.dark.line};`
  + `--cyan:${tokens.dark.accent};--observed:${tokens.dark.observed};--amber:${tokens.dark.caution};--unknown:${tokens.dark.unknown};--proposed:${tokens.dark.proposed};--focus:${tokens.dark.focus};`
  + `--d-accent-tint:${tokens.dark.accentWash};--d-ok-tint:${tokens.dark.observedWash};--d-warn-tint:${tokens.dark.cautionWash};--d-info-tint:${tokens.dark.informationWash};--d-surface-2:${tokens.dark.insetPanel};`
  + `--font-serif:${tokens.family.alternateProse};color-scheme:dark}`
  + `@media (prefers-color-scheme:light){:root{--void:${tokens.light.canvas};--panel:${tokens.light.panel};--panel-raised:${tokens.light.raisedPanel};--ink:${tokens.light.ink};`
  + `--muted:${tokens.light.quietInk};--line:${tokens.light.line};`
  + `--cyan:${tokens.light.accent};--observed:${tokens.light.observed};--amber:${tokens.light.caution};--unknown:${tokens.light.unknown};--proposed:${tokens.light.proposed};--focus:${tokens.light.focus};`
  + `--d-accent-tint:${tokens.light.accentWash};--d-ok-tint:${tokens.light.observedWash};--d-warn-tint:${tokens.light.cautionWash};--d-info-tint:${tokens.light.informationWash};`
  + `--d-surface-2:${tokens.light.insetPanel};color-scheme:light}}`
  + 'body{background:var(--void);color:var(--ink)}'
  + `main h1,main h2,main h3{letter-spacing:${tokens.type.headingTracking}}main h2{border-bottom:${tokens.line.hairline} solid var(--line);padding-bottom:${tokens.spacing.labelGap};`
  + `margin-top:${tokens.spacing.headingSeparation}}`
  + `code{font:${tokens.type.inlineCode}/${tokens.type.compactLeading} var(--font-mono);background:var(--d-surface-2);border:${tokens.line.hairline} solid var(--line);`
  + `border-radius:${tokens.radius.hint};padding:${tokens.spacing.fineInline} ${tokens.spacing.codeInset}}`
  + `a.cite{font:${tokens.type.strongWeight} ${tokens.type.citation} var(--font-mono);text-decoration:none;vertical-align:super;line-height:${tokens.type.zeroLeading};`
  + `padding:${tokens.spacing.none} ${tokens.spacing.markerInset}}a.cite:hover{text-decoration:underline}`
  + `.pipeline-notice,.run-disclosure,.review-status{background:var(--d-surface-2);color:var(--ink);`
  + `border:${tokens.line.hairline} solid var(--line);border-radius:${tokens.radius.panel};`
  + `padding:${tokens.spacing.medium} ${tokens.spacing.standard}}`
  + `.unresolved-asset,.quote-withheld,.unknown-reason,[data-epistemic="unknown"]{background:var(--d-warn-tint);border-radius:${tokens.radius.callout}}`
  + `.unresolved-asset,[data-epistemic="unknown"]{display:block;border-left:${tokens.line.section} solid var(--unknown);padding:${tokens.spacing.mediumSmall} ${tokens.spacing.cardGap};`
  + `margin:${tokens.spacing.standard} ${tokens.spacing.none}}`
  + `.quote-withheld,.unknown-reason{padding:${tokens.spacing.none} ${tokens.spacing.tagInset}}`
  + `.deep-dive,.note,.group-note{background:var(--accent-tint);border-left:${tokens.line.section} solid var(--accent);border-radius:${tokens.radius.callout};`
  + `padding:${tokens.spacing.medium} ${tokens.spacing.standard}}`
  + `figure{background:var(--panel);border:${tokens.line.hairline} solid var(--line);border-radius:${tokens.radius.panel};padding:${tokens.spacing.standard};`
  + `margin:${tokens.spacing.section} ${tokens.spacing.none}}figcaption{font-weight:${tokens.type.strongWeight}}`
  + `q.verified-quote{background:var(--d-ok-tint);border-radius:${tokens.radius.quote};padding:${tokens.spacing.none} ${tokens.spacing.quoteInset}}`
  + `blockquote.exact-source{background:var(--d-surface-2);border-left:${tokens.line.section} solid var(--observed);border-radius:${tokens.radius.callout};`
  + `padding:${tokens.spacing.medium} ${tokens.spacing.standard}}`
  + `table{border-collapse:collapse;margin:${tokens.spacing.standard} ${tokens.spacing.none};background:var(--panel)}th,td{border:${tokens.line.hairline} solid var(--line);`
  + `padding:${tokens.spacing.compact} ${tokens.spacing.mediumSmall};text-align:left;vertical-align:top}th{background:var(--panel-raised)}`
  // v1.3 rich elements (syzygy-mea.10.5). Each tone names itself in visible text, so colour is never the only signal.
  + `.visually-hidden{position:absolute;width:${tokens.length.visuallyHidden};height:${tokens.length.visuallyHidden};overflow:hidden;`
  + `clip:rect(${tokens.spacing.none} ${tokens.spacing.none} ${tokens.spacing.none} ${tokens.spacing.none});white-space:nowrap}`
  + `.table-scroll{overflow-x:auto;margin:${tokens.spacing.panelGap} ${tokens.spacing.none}}.table-scroll table{margin:${tokens.spacing.none};min-width:${tokens.length.tableMeasureFloor}}`
  + `caption{caption-side:top;text-align:left;font-weight:${tokens.type.strongWeight};padding:${tokens.spacing.none} ${tokens.spacing.none} ${tokens.spacing.compact}}`
  + 'tbody tr:nth-child(even) td{background:var(--d-surface-2)}'
  + `.callout{border:${tokens.line.hairline} solid var(--line);border-left:${tokens.line.section} solid var(--c);background:var(--t);border-radius:${tokens.radius.card};`
  + `padding:${tokens.spacing.medium} ${tokens.spacing.standard};margin:${tokens.spacing.panelGap} ${tokens.spacing.none}}`
  // A callout's tone is its visible word (Note, Tip, Caution, Important), so its colour is the region's accent and never an evidence
  // state's (syzygy-5dhm.56, R-POLE-HUE-1 F1).
  + '.callout-note,.callout-tip,.callout-caution,.callout-important{--c:var(--accent);--t:var(--accent-tint)}'
  + `.callout-title{margin:${tokens.spacing.none} ${tokens.spacing.none} ${tokens.spacing.compact};font-weight:${tokens.type.strongWeight}}.callout-tone{color:var(--c);text-transform:uppercase;`
  + `letter-spacing:${tokens.type.labelTracking};font-size:${tokens.type.citation};margin-right:${tokens.spacing.codeInset}}`
  + `ol.steps{counter-reset:step;list-style:none;padding:${tokens.spacing.none};margin:${tokens.spacing.panelGap} ${tokens.spacing.none}}ol.steps>li{counter-increment:step;position:relative;`
  + `padding:${tokens.spacing.hairline} ${tokens.spacing.none} ${tokens.spacing.cardGap} ${tokens.spacing.numberedStepInset};border-left:${tokens.line.focus} solid var(--line);`
  + `margin-left:${tokens.spacing.cardGap}}`
  + `ol.steps>li::before{content:counter(step);position:absolute;left:${tokens.spacing.stepMarkerOffset};top:${tokens.spacing.none};width:${tokens.length.stepMarker};`
  + `height:${tokens.length.stepMarker};border-radius:${tokens.radius.circle};background:var(--panel-raised);border:${tokens.line.hairline} solid var(--accent);color:var(--ink);`
  + `font:${tokens.type.strongWeight} ${tokens.type.helper}/${tokens.type.markerLeading} var(--font-mono);text-align:center}`
  + `ol.steps>li:last-child{border-left-color:${tokens.color.clear}}`
  + `dl.definitions{display:grid;grid-template-columns:minmax(${tokens.length.definitionColumn},max-content) ${tokens.length.fraction};gap:${tokens.spacing.small} ${tokens.spacing.panelGap};`
  + `margin:${tokens.spacing.panelGap} ${tokens.spacing.none}}dl.definitions dt{font-weight:${tokens.type.strongWeight}}dl.definitions dd{margin:${tokens.spacing.none}}`
  + `@media (max-width:${tokens.length.definitionBreakpoint}){dl.definitions{grid-template-columns:${tokens.length.fraction}}`
  + `dl.definitions dd{margin:${tokens.spacing.none} ${tokens.spacing.none} ${tokens.spacing.small}}}`
  + `ul.cards{list-style:none;padding:${tokens.spacing.none};display:grid;grid-template-columns:repeat(auto-fit,minmax(${tokens.length.cardColumn},${tokens.length.fraction}));`
  + `gap:${tokens.spacing.cardGap};margin:${tokens.spacing.panelGap} ${tokens.spacing.none}}`
  + `li.card{background:var(--panel);border:${tokens.line.hairline} solid var(--line);border-radius:${tokens.radius.panel};padding:${tokens.spacing.cardInset} ${tokens.spacing.standard}}`
  + `.card-label{margin:${tokens.spacing.none} ${tokens.spacing.none} ${tokens.spacing.labelGap};font-weight:${tokens.type.strongWeight};color:var(--accent)}`
  + `details.details{border:${tokens.line.hairline} solid var(--line);border-radius:${tokens.radius.card};padding:${tokens.spacing.small} ${tokens.spacing.standard};`
  + `margin:${tokens.spacing.panelGap} ${tokens.spacing.none};background:var(--panel)}details.details>summary{cursor:pointer;font-weight:${tokens.type.strongWeight}}`
  + `details.details>summary:focus-visible{outline:${tokens.line.focus} solid var(--focus);outline-offset:${tokens.line.focus}}.details-unknown{color:var(--unknown);font-weight:${tokens.type.strongWeight}}`
  + 'td.empty-cell,th.empty-cell{color:var(--muted);font-style:italic}'
  + `figure.code-excerpt pre{margin:${tokens.spacing.small} ${tokens.spacing.none};overflow-x:auto;background:var(--d-surface-2);border:${tokens.line.hairline} solid var(--line);`
  + `border-radius:${tokens.radius.callout};padding:${tokens.spacing.medium} ${tokens.spacing.standard}}`
  + `figure.code-excerpt pre code{display:block;background:none;border:${tokens.line.none};padding:${tokens.spacing.none};font:${tokens.type.helper}/${tokens.type.bodyLeading} var(--font-mono);white-space:pre}`
  + `figure.code-excerpt figcaption{display:flex;gap:${tokens.spacing.mediumSmall};flex-wrap:wrap}.code-language{color:var(--accent);text-transform:uppercase;`
  + `letter-spacing:${tokens.type.labelTracking};font-size:${tokens.type.citation}}.code-path{font:${tokens.type.normalWeight} ${tokens.type.subtleCode} var(--font-mono);color:var(--muted);`
  + `overflow-wrap:anywhere}`
  + `.code-anchor{margin:${tokens.spacing.none};font-size:${tokens.type.small}}`
  // A modern system stack and no font download (syzygy-pdja.1, owner review of the Redis dossier). The shared stylesheet reads body text from
  // `--font-serif`, so that token carries the sans stack here. Only code, source text and diagram text keep the code face.
  + `:root{--font-serif:${tokens.family.prose};--font-mono:${tokens.family.code}}`
  + '.contents,.contents a,.contents .eyebrow,.pipeline-notice,.eyebrow,.asset-references,.sources,.diagram-legend,.marking,.deep-links,a.cite,.anchor-link,.source-anchor{font-family:var(--font-serif)}'
  // The navigation folds with no script; the reading column takes the room it leaves.
  + `.cited-on,.selected-why{display:block;font-size:${tokens.type.compact};color:var(--muted)}`
  + `.about-this-run{margin-top:${tokens.spacing.standard};border-top:${tokens.line.hairline} solid var(--line);padding-top:${tokens.spacing.small}}.about-this-run>summary{cursor:pointer;`
  + `color:var(--muted);font-weight:${tokens.type.strongWeight}}.about-this-run>summary:focus-visible{outline:${tokens.line.focus} solid var(--focus);outline-offset:${tokens.line.focus}}`
  + `.nav-panel>summary{cursor:pointer;font-weight:${tokens.type.strongWeight};color:var(--muted)}`
  + `.layout:has(>.nav-panel:not([open])){grid-template-columns:auto minmax(${tokens.length.none},${tokens.length.fraction})}`
  + `.nav-panel>summary:focus-visible,.mobile-contents>summary:focus-visible{outline-offset:${tokens.line.focusInside}}`
  // A three-column diagram (1048 px) may shrink to fit its column (text no smaller than 10.7px); any wider one keeps its size and scrolls.
  // Since syzygy-3efd.66 the readable layout stacks every diagram of two or more layers, so no operator-agent figure is 1048 px wide and
  // the rule matches none of them. A provider-mode graph is laid out on the default spacing, 320 px a layer (248, 568, 888, 1208 px ...),
  // so it is never 1048 px wide either, nor is a sequence or swimlane (40 px and 184 px a participant or lane): today the rule matches
  // no figure. It stays because REQ-polaris-generation-034 (2.2) states it. The element under the pointer stands out.
  + `.diagram-scroll svg[width="1048"]{max-width:max(${tokens.length.full},${tokens.length.legacyDiagramLimit})}.diagram-scroll g.node:hover rect{stroke-width:${tokens.line.svgEmphasis}}`
  + `.diagram-scroll g.edge:hover path{stroke-width:${tokens.line.svgEmphasis}}.diagram-scroll g.edge-text:hover rect.edge-label{stroke:var(--accent);stroke-width:${tokens.line.svgLabel}}`
  + `.diagram-scroll path.edge-leader{stroke-width:${tokens.line.svgHairline};fill:none}.diagram-scroll path.edge-echo{display:none;fill:none;stroke:var(--accent);`
  + `stroke-width:${tokens.line.svgEmphasis};pointer-events:none}.diagram-scroll g.edge-text:hover path.edge-echo{display:inline}`
  // A marker standing where withheld lines were, on a source page: present, and out of the reading.
  + `pre.redaction-note{margin:${tokens.spacing.tight} ${tokens.spacing.none};padding:${tokens.spacing.hairline} ${tokens.spacing.medium};border-left:${tokens.line.section} solid var(--line);`
  + `color:var(--muted);font:${tokens.type.sourceHint}/${tokens.type.bodyLeading} var(--font-mono);white-space:pre-wrap}`
  // A glossary term's entry on hover or keyboard focus; on touch the link opens the glossary.
  // The entry opens from its block's left edge, so it stays on the page wherever the term falls in a line.
  // An entry opens at once and closes a moment after the pointer leaves, so a pointer crossing plain text from a term far along the line
  // reaches it. A hit area that spanned the line instead would cover the citations and other terms on it. It closes by visibility: Chrome 120
  // takes a discrete display transition's element out of hit testing while it still paints, so the pointer would arrive at nothing.
  + `main [data-claim-id]{position:relative}a.term{color:inherit;text-decoration:underline dotted var(--muted);text-underline-offset:${tokens.spacing.quoteInset}}.term-pop{display:block;`
  + `visibility:hidden;position:absolute;left:${tokens.spacing.none};z-index:${tokens.layer.definition};width:min(${tokens.length.termPopupMeasure},${tokens.length.full});`
  + `background:var(--panel-raised);border:${tokens.line.hairline} solid var(--line);border-radius:${tokens.radius.callout};padding:${tokens.spacing.small} ${tokens.spacing.medium};`
  + `font-size:${tokens.type.bodySmall};font-weight:${tokens.type.normalWeight};line-height:${tokens.type.bodyLeading};transition:visibility ${tokens.timing.immediate} ${tokens.timing.popupExit}}`
  + `.term-pop::before{content:"";position:absolute;left:${tokens.spacing.none};right:${tokens.spacing.none};top:${tokens.spacing.termBridgeOffset};height:${tokens.length.termBridge}}`
  + `a.term:hover>.term-pop,a.term:focus>.term-pop{visibility:visible;transition-delay:${tokens.timing.immediate}}`
  + `.redaction-mark{margin-left:${tokens.spacing.markerInset};color:var(--muted)}.redaction-legend{margin-top:${tokens.spacing.large};color:var(--muted);font-size:${tokens.type.helper}}`
  + `.source-identity{margin:${tokens.spacing.medium} ${tokens.spacing.none}}.source-identity>summary{cursor:pointer;color:var(--muted)}`
  // Dossier spec v1.5: the reading view's marks, the evidence view (opened by a fragment link with scripts off; the clipped text is in the
  // DOM all along), a citation mark's file and lines on hover and focus, the one sentence and the legend.
  + 'main:has(#evidence-view:target) .visually-hidden.ev{position:static;width:auto;height:auto;overflow:visible;clip:auto;white-space:normal}'
  + `main:has(#evidence-view:target) .evidence-note{display:block;font:${tokens.type.sourceHint}/${tokens.type.bodyLeading} var(--font-mono);color:var(--muted);margin-top:${tokens.spacing.tight}}`
  + `.judgement-mark,.framing-mark{font:${tokens.type.strongWeight} ${tokens.type.tag} var(--font-serif);letter-spacing:${tokens.type.tagTracking};text-transform:uppercase;`
  + `border:${tokens.line.hairline} solid var(--line);border-radius:${tokens.radius.quote};padding:${tokens.spacing.none} ${tokens.spacing.tagInset};margin-left:${tokens.spacing.labelInset};`
  + `color:var(--muted);vertical-align:${tokens.type.highMarkerAlign}}`
  + `.not-established{font-weight:${tokens.type.strongWeight};color:var(--unknown)}.unknown-words{color:var(--muted);font-size:${tokens.type.bodySmall}}`
  // The pop repeats the mark's accessible name, so it is out of layout until shown: a hidden but laid-out pop widens a narrow page.
  + `a.cite{position:relative}.cite-pop{display:none;position:absolute;left:${tokens.spacing.none};top:${tokens.type.citationPopupOffset};z-index:${tokens.layer.citation};white-space:nowrap;`
  + `background:var(--panel-raised);border:${tokens.line.hairline} solid var(--line);border-radius:${tokens.radius.hint};padding:${tokens.spacing.hintInset} ${tokens.spacing.small};`
  + `font:${tokens.type.normalWeight} ${tokens.type.sourceHint}/${tokens.type.compactLeading} var(--font-mono);color:var(--ink);vertical-align:baseline}`
  + 'a.cite:hover>.cite-pop,a.cite:focus>.cite-pop,a.cite:focus-visible>.cite-pop{display:block}'
  // On a narrow viewport the hint uses the viewport edges, so a citation at either end of a line can reveal its full path.
  + `@media(max-width:${tokens.length.mobile}){.cite-pop{position:fixed;inset:auto ${tokens.spacing.standard} ${tokens.spacing.standard};white-space:normal;overflow-wrap:anywhere;pointer-events:none}}`
  // Colour (syzygy-pdja.14; syzygy-5dhm.56): six Pole hues, light and dark, each a line colour and a tint, set by a region's `data-hue`
  // and inherited by the figures, cards, notes, steps and eyebrows inside it. Outside every Pole the accent is neutral, so a colour on
  // the page names a Pole or an evidence state and nothing else; no rule colours an element by its position. Text on a tint keeps 4.5:1.
  + `:root{--h1:${tokens.dark.firstPole};--h1t:${tokens.dark.firstPoleWash};--h2:${tokens.dark.secondPole};--h2t:${tokens.dark.secondPoleWash};--h3:${tokens.dark.thirdPole};`
  + `--h3t:${tokens.dark.thirdPoleWash};--h4:${tokens.dark.fourthPole};--h4t:${tokens.dark.fourthPoleWash};--h5:${tokens.dark.fifthPole};--h5t:${tokens.dark.fifthPoleWash};`
  + `--h6:${tokens.dark.sixthPole};--h6t:${tokens.dark.sixthPoleWash};--accent:var(--muted);--accent-tint:var(--d-surface-2)}`
  + `@media (prefers-color-scheme:light){:root{--h1:${tokens.light.firstPole};--h1t:${tokens.light.firstPoleWash};--h2:${tokens.light.secondPole};--h2t:${tokens.light.secondPoleWash};`
  + `--h3:${tokens.light.thirdPole};--h3t:${tokens.light.thirdPoleWash};--h4:${tokens.light.fourthPole};--h4t:${tokens.light.fourthPoleWash};--h5:${tokens.light.fifthPole};`
  + `--h5t:${tokens.light.fifthPoleWash};--h6:${tokens.light.sixthPole};--h6t:${tokens.light.sixthPoleWash};}}`
  + '[data-hue="1"]{--accent:var(--h1);--accent-tint:var(--h1t)}[data-hue="2"]{--accent:var(--h2);--accent-tint:var(--h2t)}[data-hue="3"]{--accent:var(--h3);--accent-tint:var(--h3t)}[data-hue="4"]{--accent:var(--h4);--accent-tint:var(--h4t)}[data-hue="5"]{--accent:var(--h5);--accent-tint:var(--h5t)}[data-hue="6"]{--accent:var(--h6);--accent-tint:var(--h6t)}'
  // An arrowhead is filled, never stroked: a stroke would draw it up to 1.6 px past `arrowheadOf`'s triangle, which leader ends keep clear
  // of (syzygy-pdja.16).
  + `figure:has(.diagram-scroll){border-top:${tokens.line.section} solid var(--accent)}.diagram-scroll svg rect{fill:var(--accent-tint);stroke:var(--accent)}`
  + `.diagram-scroll svg path{stroke:var(--muted)}.diagram-scroll svg marker path{fill:var(--muted);stroke:none}.diagram-scroll svg rect.edge-label{fill:var(--panel);stroke:none}`
  + `.diagram-scroll path.edge-echo{stroke:var(--accent)}.diagram-scroll g.edge-text:hover rect.edge-label{stroke:var(--accent)}`
  + `section[data-hue]>h1{border-bottom:${tokens.line.section} solid var(--accent);padding-bottom:${tokens.spacing.compact}}`
  + `section[data-hue] h2{border-bottom-color:color-mix(in srgb,var(--accent) ${tokens.mix.sectionBorder},var(--line))}`
  + `.pole-map>ol{list-style:none;padding:${tokens.spacing.none};display:grid;grid-template-columns:repeat(auto-fit,minmax(${tokens.length.poleColumn},${tokens.length.fraction}));`
  + `gap:${tokens.spacing.cardGap}}.pole-map>ol>li{background:var(--accent-tint);border:${tokens.line.hairline} solid var(--line);border-top:${tokens.line.section} solid var(--accent);`
  + `border-radius:${tokens.radius.panel};padding:${tokens.spacing.cardInset} ${tokens.spacing.standard}}.pole-map>ol>li>a{font-weight:${tokens.type.strongWeight};`
  + `font-size:${tokens.type.poleHeading}}.pole-map>ol>li>ul{margin:${tokens.spacing.compact} ${tokens.spacing.none} ${tokens.spacing.none};padding-left:${tokens.spacing.listInset};`
  + `font-size:${tokens.type.poleMap}}`
  + `.contents li[data-hue]>a::before{content:"";display:inline-block;width:${tokens.length.poleMarker};height:${tokens.length.poleMarker};border-radius:${tokens.radius.circle};`
  + `background:var(--accent);margin-right:${tokens.spacing.markerGap};vertical-align:${tokens.type.middleMarkerAlign}}`
  + '.pole-map,.about-this-run>summary{font-family:var(--font-serif)}.legend-line{border-top-color:var(--muted)}'
  + `li.card{background:var(--accent-tint);border-top:${tokens.line.emphasis} solid var(--accent)}th{background:color-mix(in srgb,var(--accent) ${tokens.mix.tableHeading},var(--panel))}`
  + `ol.steps>li::before{border-color:var(--accent);background:var(--accent-tint)}.eyebrow{color:var(--accent)}`
  // The shared and preview sheets draw links, summaries, targeted rows and bare drawings in the decorative accent, and a notice in the
  // caution colour; on a local page each takes the region's accent or a neutral line instead (R-POLE-HUE-1 F1, F2).
  + 'a{color:var(--accent)}summary{color:var(--accent)}tr:target{outline-color:var(--accent)}svg rect{stroke:var(--accent)}svg path{stroke:var(--muted)}'
  + 'svg marker path{fill:var(--muted)}.notice{border-left-color:var(--line)}.pipeline-notice{color:var(--ink)}'
  + `.run-sentence{margin:${tokens.spacing.small} ${tokens.spacing.none};font-size:${tokens.type.bodySmall};color:var(--muted)}.reading-legend{border:${tokens.line.hairline} solid var(--line);`
  + `border-radius:${tokens.radius.card};padding:${tokens.spacing.small} ${tokens.spacing.standard};margin:${tokens.spacing.none} ${tokens.spacing.none} ${tokens.spacing.section};`
  + `font-size:${tokens.type.helper};color:var(--muted)}.reading-legend ul{margin:${tokens.spacing.tight} ${tokens.spacing.none};padding-left:${tokens.spacing.legendInset}}`
  + `.view-switch{margin:${tokens.spacing.none}}.legend-sample{font:${tokens.type.strongWeight} ${tokens.type.small} var(--font-mono)}`
  + `.diagram-tally{margin:${tokens.spacing.tight} ${tokens.spacing.none} ${tokens.spacing.none};font:${tokens.type.sourceHint} var(--font-mono);color:var(--muted)}`;

/** The surrounding operator-agent notice, wayfinding, and review status. */
interface PageChrome {
  readonly notice: string;
  readonly disclosure: (path: string) => string;
  readonly mainAttributes: string;
  readonly region: (path: string) => string;
  readonly pageTurn: (path: string) => string;
}

interface DossierNavLink { readonly path: string; readonly title: string }

const READING_NAV_CSS = `.contents a[aria-current="page"]{font-weight:${tokens.type.currentWeight};text-decoration:underline}`
  + '.contents .pole-dive-links{display:block}'
  + `.reading-column{display:grid;grid-template-columns:minmax(${tokens.length.none},${tokens.length.fraction});min-width:${tokens.length.none}}`
  + `@media(max-width:${tokens.length.mobile}){.reading-column{display:block}}`
  + `.reading-order{display:flex;flex-wrap:wrap;justify-content:space-between;gap:${tokens.spacing.small} ${tokens.spacing.section};`
  + `width:min(${tokens.length.readingOrderMeasure},calc(${tokens.length.full} - ${tokens.length.navigationInset}));margin:${tokens.spacing.section} auto ${tokens.spacing.none}}`
  + `.reading-order a{min-height:${tokens.length.pageTurnTarget};padding:${tokens.spacing.small} ${tokens.spacing.none};overflow-wrap:anywhere}`;

const LOCAL_REFLOW_CSS = new Map([
  ['appendix.html', '#appendix-disclosure{overflow-wrap:anywhere}'],
  ['clarifications.html', '#page-clarifications{overflow-wrap:anywhere}'],
  ['discovery.html', '#page-discovery{overflow-wrap:anywhere}'],
  ['executions.html', '#page-executions{overflow-wrap:anywhere}'],
  ['review.html', '#review-fidelity{overflow-wrap:anywhere}'],
  ['sources/index.html', '#sources{overflow-wrap:anywhere}'],
  ['understanding.html', '#page-understanding{overflow-wrap:anywhere}'],
]);

function page(title: string, path: string, nav: string, main: string, chrome?: PageChrome, figureKinds = '', mapCss = '', subsections = false): string {
  const content = `<main id="content" data-page="${escape(path)}"${chrome?.mainAttributes ?? ''}>${main}${chrome?.region(path) ?? ''}</main>`;
  // Wayfinding follows the reading text so the main-only converter retains its original input.
  const turn = chrome?.pageTurn(path) ?? '';
  const column = turn === '' ? content : `<div class="reading-column">${content}${turn}</div>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${DRAFT_PREVIEW_CSP_META}<title>${escape(title)}</title><style>${DESIGN_TOKENS_CSS}
${DRAFT_PREVIEW_CSS}${DOSSIER_CSS}${chrome === undefined ? '' : `${LOCAL_CSS}${DOSSIER_THEME_CSS}${READING_NAV_CSS}${LOCAL_REFLOW_CSS.get(path) ?? ''}${path === FIND_BY_TASK_PAGE || path === NAME_INDEX_PAGE ? FINDING_CSS : ''}`}${figureKinds}${subsections ? SUBSECTION_CSS : ''}${mapCss}
</style></head><body><a class="skip" href="#content">Skip to content</a><div class="pipeline-notice">${chrome?.notice ?? 'Generated dossier draft — not reviewed or adopted'}</div>${chrome?.disclosure(path) ?? ''}<div class="layout">${chrome === undefined ? `<nav class="contents desktop-contents" aria-label="Dossier">${nav}</nav>` : `<details class="contents desktop-contents nav-panel" open><summary>Contents</summary><nav aria-label="Dossier">${nav}</nav></details>`}<details class="contents mobile-contents"><summary>In this dossier</summary><nav aria-label="${chrome === undefined ? 'Dossier' : 'Dossier (mobile)'}">${nav}</nav></details>${column}</div></body></html>`;
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
  const hero = local?.hero;
  const heroFigureAttribute = ' data-hero="figure"';
  let heroRendered = false;
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
  // A diagram's page (syzygy-3efd.18): the section `sectionId` names, or, with an operator-agent `home`, a deep dive or the overview.
  const diveIds = new Set(draft.deepDives.map(dive => dive.id));
  for (const item of draft.deepDives) if (!sectionIds.has(item.sectionId)) throw new DossierRenderError('unknown-section');
  for (const d of draft.diagrams) {
    if (d.home !== undefined && local === undefined) throw new DossierRenderError('unknown-section');
    if (d.home?.kind === 'deep-dive' ? !diveIds.has(d.home.id) : d.home === undefined && !sectionIds.has(d.sectionId)) throw new DossierRenderError('unknown-section');
  }

  const deepDives = withheld ? [] : draft.deepDives.filter(dive => dive.disposition.kind === 'produced');
  const deepPaths = new Map(deepDives.map(dive => [dive.id, deepDivePath(dive.id)]));
  if (new Set(deepPaths.values()).size !== deepPaths.size) throw new DossierRenderError('page-path-collision');
  // Poles (dossier spec v1.5): page boundaries that carry no claim. The landing page holds the why section and a map; each other Pole has
  // its own page, and one holding only the why section has none. Every section is in exactly one Pole, and the why section is one of them.
  const poleSpec = withheld ? undefined : local?.poles;
  const poles = poleSpec === undefined ? [] : poleSpec.poles.map((pole, index) => ({
    label: pole.label, sections: pole.sections, hue: index < HUES ? index + 1 : null, path: pole.sections.every(id => id === poleSpec.whySection) ? null : `poles/${index + 1}.html`,
  }));
  // Colour (syzygy-pdja.14; syzygy-5dhm.56): on an operator-agent page a hue names a Pole and nothing else. Each Pole takes one of six
  // hues by its place in the Pole list, and every part of it carries that hue wherever it is drawn: its page, its why section on the
  // landing page, its deep dives, the worth-knowing blocks it lends the landing page, and the figures and cards inside them, which take the
  // hue from the region around them. Nothing takes a hue by its own position, and what belongs to no Pole is neutral. The label still says
  // which Pole a thing is in, so nothing a reader needs rests on the hue.
  const hueAttr = (hue: number): string => local === undefined ? '' : ` data-hue="${hue}"`;
  // There are six hues, so a hue names exactly one Pole: a run may declare more Poles (its `poleLimit` is unbounded), and the seventh
  // onward are neutral. Every Pole keeps its label in the navigation, the map, its page's heading and its "Part of" line, so none is
  // known by its colour alone (R-POLE-HUE-1 F3).
  const poleHue = new Map(poles.flatMap(pole => pole.hue === null ? [] : pole.sections.map(id => [id, pole.hue!] as const)));
  const poleHueAttr = (hue: number | null): string => hue === null ? '' : hueAttr(hue);
  const sectionHue = (sectionId: string): string => { const hue = poleHue.get(sectionId); return hue === undefined ? '' : hueAttr(hue); };
  // Every operator-agent figure drawn from the draft says it is curated (RFC7-28, version 2.3); the provider mode's bytes are pinned.
  const curated = local === undefined ? '' : ' data-visual-provenance="curated"';
  // The drawing is `role="img"`, named by its caption and described by its lists (`aria-labelledby="diagram-title-N"`,
  // `aria-describedby="diagram-text-N"`): an operator-agent figure carries the caption's id, and a `<div>` with the other id wraps its
  // two lists alone, so the description holds neither the summary nor the Mermaid source (syzygy-3efd.70). The provider mode's bytes
  // are pinned, so its figures keep the references without the ids or the wrapper, as they always have.
  const figureIds = (index: number): { readonly title: string; readonly textOpen: string; readonly textClose: string } => local === undefined
    ? { title: '', textOpen: '', textClose: '' }
    : { title: ` id="diagram-title-${index}"`, textOpen: `<div id="diagram-text-${index}">`, textClose: '</div>' };
  if (poleSpec !== undefined) {
    const homes = draft.sections.map(section => poles.filter(pole => pole.sections.includes(section.id)).length);
    if (poles.length === 0 || homes.some(count => count !== 1) || poles.some(pole => pole.sections.length === 0 || pole.sections.some(id => !draft.sections.some(section => section.id === id)))
      || !draft.sections.some(section => section.id === poleSpec.whySection)) throw new DossierRenderError('invalid-poles');
  }
  /** The page a section is drawn on: with Poles, the landing page for the why section and its Pole's page for every other. */
  const sectionPage = (id: string): string => poleSpec === undefined || id === poleSpec.whySection ? 'index.html' : poles.find(pole => pole.sections.includes(id))!.path!;
  const sectionHref = (from: string, id: string): string => href(from, sectionPage(id), `section-${id}`);
  const quotable = input.sources.filter(source => !source.exclusion.excluded && source.classificationBasis === 'body' && source.spans.length > 0);
  const sourcePaths = new Map(quotable.map(source => [source.sourceId, sourceRoute(source)]));
  const numberedSources = local === undefined ? undefined : sourceLines(quotable);
  const sourcePieces = new Map<string, GenerationSource[]>();
  const fileIdentity = (source: GenerationSource): string => generationSourceIdentity({ ...source, objectId: source.objectId! });
  if (numberedSources !== undefined) for (const source of quotable) {
    if (source.segment === undefined) continue;
    const identity = fileIdentity(source);
    const pieces = sourcePieces.get(identity) ?? [];
    pieces.push(source);
    sourcePieces.set(identity, pieces);
  }
  for (const pieces of sourcePieces.values()) pieces.sort((a, b) => a.segment!.index - b.segment!.index);
  const citedLines = new Map<string, Map<string, SourceHighlight>>();
  type LineTarget = { readonly sourceId: string; readonly fragment: string };
  const continuedCitations = new Map<string, Map<string, Map<string, LineTarget>>>();
  const registerRanges = (target: LineTarget, line: number, ranges: readonly CitationRange[]): void => {
    const cited = citedLines.get(target.sourceId) ?? new Map<string, SourceHighlight>();
    const prior = cited.get(target.fragment);
    const related = prior?.ranges ?? [];
    // Several marks can share one original line target. Independent continuations retain their original target identity.
    for (const range of ranges) if (!related.some(other => other.start === range.start && other.end === range.end)) related.push(range);
    cited.set(target.fragment, { line: Math.min(line, prior?.line ?? line), ranges: related });
    citedLines.set(target.sourceId, cited);
  };
  const lineFragment = (id: string, ranges: readonly CitationRange[] | undefined): string => {
    if (ranges === undefined || ranges.length === 0) return 'exact-text';
    const fragment = ranges[0]!.start;
    const spans = numberedSources?.get(id);
    if (spans === undefined || ![...spans.values()].some(rows => rows.some(row => row.number === fragment))) return 'exact-text';
    const first = { sourceId: id, fragment: `L${fragment}` };
    registerRanges(first, fragment, ranges);
    const source = sources.get(id)!;
    if (source.segment !== undefined) {
      // Different original targets may continue at the same row. Distinct empty targets retain each route's highlight there.
      const continuation = `continued-${id}-${first.fragment}`;
      let previous = first;
      for (const piece of sourcePieces.get(fileIdentity(source)) ?? []) {
        if (piece.segment!.index <= source.segment.index) continue;
        const continued = rangesOnSource(numberedSources?.get(piece.sourceId), ranges);
        if (continued.length === 0) continue;
        const next = { sourceId: piece.sourceId, fragment: continuation };
        registerRanges(next, continued[0]!.start, continued);
        const from = continuedCitations.get(previous.sourceId) ?? new Map<string, Map<string, LineTarget>>();
        const links = from.get(previous.fragment) ?? new Map<string, LineTarget>();
        links.set(next.sourceId, next);
        from.set(previous.fragment, links);
        continuedCitations.set(previous.sourceId, from);
        previous = next;
      }
    }
    return first.fragment;
  };

  // --- shared fragments, each bound to the page it is rendered on
  const label = (blockId: string): EpistemicMarking => support.get(blockId) === 'supported' && !quoteFlags.has(blockId) ? 'inferred' : 'unknown';
  const quoteNote = (blockId: string): string => quoteFlags.has(blockId)
    ? ` <span class="quote-unverified">Quotation not verified against the cited sources (${escape([...quoteFlags.get(blockId)!].join(', '))}).</span>` : '';
  const marking = (m: EpistemicMarking): string => `<span class="marking ${m}">[${MARKING_LABEL[m]}]</span>`;
  // Dossier spec v1.5: a narrative page (the landing page or a deep dive) opens in a reading view. Syzygy writes no label token and no
  // file-and-line aside into a block's visible text there; each stays in DOM text, clipped by the renderer's visually-hidden class (never
  // `hidden` or `display:none`), and shows in the evidence view. Every other page keeps its labels.
  const narrative = (from: string): boolean => local !== undefined && !withheld && (from === 'index.html' || from.startsWith('deep-dives/') || from.startsWith('poles/'));
  const clipped = (html: string): string => `<span class="visually-hidden ev">${html}</span>`;
  const mark = (from: string, m: EpistemicMarking): string => (narrative(from) ? clipped(marking(m)) : marking(m));
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
  // RFC5-17: a claim over a redacted file's surviving content states the redaction count on the claim. On an operator-agent page the
  // citation carries it, visibly as a dagger and the count (each page with one says what it means, RFC7-34) and in its accessible name,
  // tooltip and attribute, rather than a sentence after every citation in the reading text. The source page and the machine view state it
  // in full (syzygy-pdja.1).
  const citedRedaction = (id: string): { readonly attribute: string; readonly words: string; readonly mark: string } => {
    const redaction = sources.get(id)?.redaction;
    if (redaction === undefined) return { attribute: '', words: '', mark: '' };
    return { attribute: ` data-redacted-lines="${redaction.withheldLines}"`, words: `; ${redaction.withheldLines} line(s) of this file withheld by screening`, mark: `<span class="redaction-mark" aria-hidden="true">†${redaction.withheldLines}</span>` };
  };
  // Which pages cite each source, and how often, so the sources list can say why a file is there (syzygy-pdja.15). Filled as pages are
  // drawn; the sources list reads it after the reading pages and the glossary, before the run's own pages.
  const citedOn = new Map<string, Map<string, number>>();
  const pageTitles = new Map<string, string>();
  const noteCitation = (from: string, id: string): void => {
    const onPages = citedOn.get(id) ?? new Map<string, number>();
    onPages.set(from, (onPages.get(from) ?? 0) + 1);
    citedOn.set(id, onPages);
  };
  const refs = (from: string, ids: readonly string[], claimId?: string): string => `<span class="sources">${ids.map(id => {
    const source = sources.get(id);
    if (source === undefined) throw new DossierRenderError('unknown-source');
    const target = sourcePaths.get(id);
    if (target === undefined) throw new DossierRenderError('unquotable-source');
    const note = source.redaction === undefined ? '' : ` <span class="redaction-note">[redacted-span: ${source.redaction.withheldLines} withheld line(s) in this file]</span>`;
    // The provider mode's bytes are pinned (dossier-render-provider-golden.test.ts); only an operator-agent run numbers its sources.
    if (local === undefined) return `<a href="${escape(href(from, target, 'exact-text'))}" aria-label="Read source ${escape(id)}">[${escape(id)}]</a>${note}`;
    noteCitation(from, id);
    const cited = citedRedaction(id);
    // The mark shows its file and cited lines on hover and on keyboard focus (v1.5), out of the reading text until then.
    const ranges = claimId === undefined ? undefined : local.citationLines?.get(claimId)?.get(id);
    const lines = citationLabel(ranges);
    const where = `${source.path}${lines === undefined ? '' : `, ${lines}`}${cited.words}`;
    return `<a class="cite" href="${escape(href(from, target, lineFragment(id, ranges)))}" data-source-id="${escape(id)}"${cited.attribute} aria-label="${escape(`${sourceLabel(from, id)}${lines === undefined ? '' : `, ${lines}`}${cited.words}`)}">[${citeNumber(from, id)}]${cited.mark}<span class="cite-pop" aria-hidden="true">${escape(where)}</span></a>`;
  }).join(' ')}</span>`;
  // Every claim a page carries, in the order it is built; `add` files them under that page for the machine view.
  const pending: { id: string; epistemic: EpistemicMarking; unknownReason: string | null; v15?: ClaimMarks }[] = [];
  // `attributes` is markup the caller built with escape(); nothing is spliced in afterwards. `marks` are dossier spec v1.5's machine
  // attributes, present only where a claim has one, so a page without them keeps its bytes.
  const claim = (tag: string, id: string, m: EpistemicMarking, body: string, attributes = '', unknownReason: string | null = null, marks?: ClaimMarks, last = ''): string => {
    pending.push({ id, epistemic: m, unknownReason, ...(marks === undefined || Object.keys(marks).length === 0 ? {} : { v15: marks }) });
    return `<${tag}${attributes}${marks === undefined ? '' : marksAttributes(marks)} data-claim-id="${escape(id)}" data-epistemic="${m}"${last}>${body}</${tag}>`;
  };
  // An operator-agent block: its segments (Syzygy's located bytes for every quotation), its marking and reason, and the commands a claim
  // resting on execution names. A non-normative block is no claim and carries no anchor.
  const nonNormative: { page: string; id: string }[] = [];
  const quotations: { page: string; blockId: string; sourceId: string; start: number; end: number; anchor: unknown; redaction?: { redactionClass: 'redacted-span'; withheldLines: number } }[] = [];
  // Agent prose links a glossary term's first use in each section to its entry, shown on hover or focus (syzygy-pdja.1). Never a quotation
  // or a source page: only agent text passes here, and source bytes never mint an element. Case follows the term, or its capitalised form.
  const glossaryByForm = new Map<string, LocalPageItem>();
  if (local !== undefined && !withheld) {
    for (const term of local.glossary) {
      const name = term.title ?? term.id;
      // A term the understanding record marks Unknown keeps its reason on the glossary page, its one home, and links nothing.
      if (term.marking !== 'inferred') continue;
      for (const base of glossaryNameForms(name)) {
        const [first = '', ...rest] = [...base];
        const capitalised = `${first.toUpperCase()}${rest.join('')}`;
        // The record's ids are often lower case where prose writes an acronym (`aof`, AOF).
        for (const form of [base, `${base}s`, capitalised, `${capitalised}s`, base.toUpperCase()]) if (form !== '' && !glossaryByForm.has(form)) glossaryByForm.set(form, term);
      }
    }
  }
  const termPattern = glossaryByForm.size === 0 ? null : new RegExp(`(?<![\\p{L}\\p{N}_&;/.-])(${[...glossaryByForm.keys()].sort((a, b) => b.length - a.length).map(form => escape(form).replace(/[.*+?^\${}()|[\]\\]/gu, '\\$&')).join('|')})(?![\\p{L}\\p{N}_/-]|\\.[\\p{L}\\p{N}])`, 'gu');
  const termsShown = new Set<string>();
  // A cell may scroll sideways, which would clip an entry, so a table links no term.
  let termsOff = false;
  const glossaryShown: { page: string; id: string }[] = [];
  const withTerms = (from: string, text: string): string => {
    const html = prose(text);
    if (termPattern === null) return html;
    return html.split(/(<code>[^<]*<\/code>)/u).map((piece, i) => i % 2 === 1 ? piece : piece.replace(termPattern, (match: string) => {
      const term = glossaryByForm.get(match.replace(/&amp;/gu, '&').replace(/&lt;/gu, '<').replace(/&gt;/gu, '>').replace(/&quot;/gu, '"').replace(/&#39;/gu, "'"));
      if (term === undefined || termsShown.has(term.id)) return match;
      termsShown.add(term.id);
      if (!glossaryShown.some(shown => shown.page === from && shown.id === term.id)) glossaryShown.push({ page: from, id: term.id });
      // The entry stays one claim, filed under glossary.html; its other appearances are listed in the machine view (RFC7-33).
      return `<a class="term" href="${escape(href(from, 'glossary.html', `term-${term.id}`))}" aria-label="${match}, glossary entry">${match}<span class="term-pop" data-glossary-entry="${escape(term.id)}" data-epistemic="${term.marking}">${prose(term.text)} ${mark(from, term.marking)}</span></a>`;
    })).join('');
  };
  const segment = (from: string, blockId: string, part: LocalSegment): string => {
    if (part.kind === 'prose') {
      const own = local!.blocks.get(blockId);
      if (own?.withheld !== undefined) return escape(part.text);
      return termsOff || own?.marking === 'non-normative' ? prose(part.text) : withTerms(from, part.text);
    }
    if (part.kind === 'withheld') return `<span class="quote-withheld" data-unknown-reason="${escape(part.reason)}">[quotation withheld: the file it cites is excluded by screening]</span>`;
    const target = sourcePaths.get(part.sourceId);
    if (target === undefined) throw new DossierRenderError('unquotable-source');
    const redaction = sources.get(part.sourceId)?.redaction;
    const disclosure = redaction === undefined ? {} : { redaction: { redactionClass: redaction.redactionClass, withheldLines: redaction.withheldLines } };
    quotations.push({ page: from, blockId, sourceId: part.sourceId, start: part.start, end: part.end, anchor: part.anchor, ...disclosure });
    return `<q class="verified-quote" data-quote-source="${escape(part.sourceId)}" data-quote-start="${part.start}" data-quote-end="${part.end}">${escape(part.text).replace(/\r/gu, '&#13;')}</q> ${mark(from, 'observed')} ${anchorLink(from, part)}`;
  };
  // The numbered anchor after a located quotation, with its redaction note.
  const anchorLink = (from: string, part: Extract<LocalSegment, { kind: 'quotation' }>): string => {
    const target = sourcePaths.get(part.sourceId);
    if (target === undefined) throw new DossierRenderError('unquotable-source');
    noteCitation(from, part.sourceId);
    const cited = citedRedaction(part.sourceId);
    const label = `${sourceLabel(from, part.sourceId)}, ${part.anchor.fragment === null ? 'whole file' : `bytes ${part.anchor.fragment.start}–${part.anchor.fragment.end}`}${cited.words}`;
    // Like any citation mark, it shows its file and the quoted bytes on hover and on keyboard focus (v1.5).
    const where = `${sources.get(part.sourceId)!.path}, ${part.anchor.fragment === null ? 'whole file' : `bytes ${part.anchor.fragment.start}–${part.anchor.fragment.end}`}${cited.words}`;
    const range = part.anchor.fragment === null ? undefined : sourceByteRange(numberedSources?.get(part.sourceId), part.start, part.end);
    return `<a class="anchor-link cite" href="${escape(href(from, target, lineFragment(part.sourceId, range === undefined ? undefined : [range])))}" data-source-id="${escape(part.sourceId)}"${cited.attribute} aria-label="${escape(label)}"${anchorAttributes(part.anchor, escape)}>[${citeNumber(from, part.sourceId)}]${cited.mark}<span class="cite-pop" aria-hidden="true">${escape(where)}</span></a>`;
  };
  // The generated index (the index-and-task-routes change) links a name to every block that names it, so each operator-agent block is a fragment target and
  // is filed here as it is drawn, with the text it shows. A block drawn inside a folded element is reached through that element: a
  // fragment target inside a `details` strands a keyboard reader. `place` is the words a link to the block shows.
  const indexed: (IndexedBlock & { readonly rank: number })[] = [];
  const figureHomes: { id: string; title: string; home: IndexTarget }[] = [];
  const repeatedLists: { diagramId: string; target: IndexTarget }[] = [];
  let fold: string | null = null;
  let place = '';
  // Where a block stands in the index's order: the introduction (0), the sections (1), the deep dives (2), the task routes (3).
  let rank = 1;
  const folded = <T>(elementId: string, draw: () => T): T => {
    const outer = fold;
    fold = outer ?? `element-${elementId}`;
    try { return draw(); } finally { fold = outer; }
  };
  const blockTarget = (from: string, p: DraftParagraph, b: LocalBlock): string => {
    // A withheld item, or a block a secret detector matches, shows Syzygy's sentence, never the agent's text, so it names nothing.
    if (b.withheld === undefined && b.secretMatched !== true) {
      const texts = (kind: 'prose' | 'quotation'): string => b.segments.flatMap(part => part.kind === kind ? [part.text] : []).join('\n');
      indexed.push({ id: p.id, page: from, fragment: fold ?? `block-${p.id}`, label: place, prose: texts('prose'), quoted: texts('quotation'), sourceIds: p.sourceIds, rank });
    }
    return fold === null ? ` id="block-${escape(p.id)}"` : '';
  };
  const localParagraph = (from: string, p: DraftParagraph, tag: string, after = ''): string => {
    const b = local!.blocks.get(p.id);
    if (b === undefined) throw new DossierRenderError('unknown-block');
    const body = b.segments.map(part => segment(from, p.id, part)).join('');
    const reading = narrative(from);
    const target = blockTarget(from, p, b);
    if (b.marking === 'non-normative') {
      nonNormative.push({ page: from, id: p.id });
      return reading
        ? `<${tag} class="non-normative" data-non-normative="${escape(p.id)}" data-claim-kind="non-normative"${target}>${body} <span class="framing-mark">framing</span>${clipped(' <span class="marking non-normative">[Non-normative]</span> Evidence: claim-block kind non-normative; it claims nothing from a source.')}</${tag}>`
        : `<${tag} class="non-normative" data-non-normative="${escape(p.id)}"${target}>${body} <span class="marking non-normative">[Non-normative]</span>${after}</${tag}>`;
    }
    const kind = p.sourceIds.length > 0 ? 'anchored' : 'labeled';
    // In the reading view an Unknown block opens with `Not established` and its reason follows in words; the reason code is clipped.
    const reason = b.unknownReason === null ? '' : reading ? ` <span class="unknown-words">(${escape(b.basis)})</span>${clipped(` <span class="unknown-reason">(${escape(b.unknownReason)})</span>`)}`
      : ` <span class="unknown-reason">(${escape(b.unknownReason)}: ${escape(b.basis)})</span>`;
    const lead = reading && b.marking === 'unknown' ? '<span class="not-established">Not established.</span> ' : '';
    const selfReported = reading ? clipped(' (Inferred, self-reported)') : ' (Inferred, self-reported)';
    const executions = b.executions.length === 0 ? '' : ` <span class="executions">Rests on the agent's report of running ${b.executions.map(run => `<code>${escape(run.command)}</code>`).join('; ')}${selfReported}</span>`;
    const judged = b.judgement === undefined ? '' : ' <span class="judgement-mark">judgement</span>';
    const evidence = reading ? clipped(` <span class="evidence-note">${escape(evidenceNote(b, kind))}</span>`) : '';
    return claim(tag, p.id, b.marking, `${lead}${body}${judged} ${mark(from, b.marking)}${reason}${executions}${evidence} ${refs(from, p.sourceIds, p.id)}${after}`,
      `${b.unknownReason === null ? '' : ` data-unknown-reason="${escape(b.unknownReason)}"`}${reading ? ` data-claim-kind="${kind}"` : ''}`, b.unknownReason, blockMarks(b), target);
  };
  const paragraph = (from: string, p: DraftParagraph, tag: string): string => local !== undefined ? localParagraph(from, p, tag)
    : claim(tag, p.id, label(p.id), `${escape(p.text)} ${marking(label(p.id))}${quoteNote(p.id)} ${refs(from, p.sourceIds)}`);
  // A labelled record on one of the run's own pages, or a glossary term.
  const item = (from: string, tag: string, entry: LocalPageItem): string => claim(tag, entry.id, entry.marking,
    `${entry.title === null ? '' : `<strong>${escape(entry.title)}</strong>: `}${(local === undefined ? escape : prose)(entry.text)} ${marking(entry.marking)}${entry.unknownReason === null ? '' : ` <span class="unknown-reason">(${escape(entry.unknownReason)})</span>`}${entry.details.length === 0 ? '' : `<ul class="item-details">${entry.details.map(detail => `<li>${escape(detail)}</li>`).join('')}</ul>`} ${refs(from, entry.sourceIds, entry.id)}`,
    entry.unknownReason === null ? '' : ` data-unknown-reason="${escape(entry.unknownReason)}"`, entry.unknownReason);
  // A v1.3 rich element (operator-agent drafts only, syzygy-mea.10.5): semantic, inert HTML. Its labels are escaped presentation; every
  // claim inside renders through `paragraph`, so it carries its marking, reason and numbered sources as any block does.
  const TONE_NAME: Readonly<Record<string, string>> = { note: 'Note', tip: 'Tip', caution: 'Caution', important: 'Important' };
  // A list repeating a diagram of its section (dossier spec v1.5) renders collapsed, its summary Syzygy's words with the count of Unknown
  // claims inside; each item stays a claim block. The element's identity moves to the details, outside the collapsed part.
  const repeated = (from: string, id: string, diagramId: string | undefined, attrs: string, list: (own: string) => string): string => {
    if (diagramId === undefined) return list(attrs);
    const before = pending.length;
    const shownBefore = new Set(termsShown);
    repeatedLists.push({ diagramId, target: { page: from, fragment: fold ?? `element-${id}`, label: place } });
    const inner = folded(id, () => list(''));
    termsShown.clear();
    for (const id of shownBefore) termsShown.add(id);
    const unknown = pending.slice(before).filter(entry => entry.epistemic === 'unknown').length;
    const shown = draft.diagrams.find(d => d.id === diagramId)?.title ?? diagramId;
    return `<details class="details repeats-diagram"${attrs} data-repeats-diagram="${escape(diagramId)}"><summary>The diagram “${escape(shown)}” as a list${unknown === 0 ? '' : ` <span class="details-unknown">(${unknown} Unknown)</span>`}</summary>${inner}</details>`;
  };
  const element = (from: string, id: string, e: DraftElement): string => {
    const attrs = ` id="element-${escape(id)}" data-element="${e.kind}"`;
    switch (e.kind) {
      case 'table': {
        const head = `<thead><tr>${e.columns.map(column => `<th scope="col">${escape(column)}</th>`).join('')}</tr></thead>`;
        termsOff = true;
        const rows = e.rows.map(row => `<tr data-row-id="${escape(row.id)}">${row.cells.map((cell, c) => {
          const tag = e.rowHeaders && c === 0 ? 'th' : 'td';
          const html = cell === null ? `<${tag} class="empty-cell">no entry</${tag}>` : paragraph(from, cell, tag);
          // A row header names its row: the scope goes on the opening tag only, which every form above begins with.
          return tag === 'th' ? `<th scope="row"${html.slice('<th'.length)}` : html;
        }).join('')}</tr>`).join('');
        termsOff = false;
        return `<div class="table-scroll"${attrs}><table><caption>${escape(e.caption)}</caption>${head}<tbody>${rows}</tbody></table></div>`;
      }
      case 'callout':
        return `<aside class="callout callout-${e.tone}"${attrs} aria-label="${escape(`${TONE_NAME[e.tone]}: ${e.title}`)}"><p class="callout-title"><span class="callout-tone">${TONE_NAME[e.tone]}</span> ${escape(e.title)}</p>${e.children.map(child => block(from, child)).join('')}</aside>`;
      case 'steps':
        return repeated(from, id, e.repeatsDiagram, attrs, own => `<ol class="steps"${own}>${e.items.map(item => paragraph(from, item, 'li')).join('')}</ol>`);
      case 'definitions':
        return repeated(from, id, e.repeatsDiagram, attrs, own => `<dl class="definitions"${own}>${e.entries.map(entry => `<dt>${escape(entry.term)}</dt>${paragraph(from, entry.definition, 'dd')}`).join('')}</dl>`);
      case 'cards':
        return repeated(from, id, e.repeatsDiagram, attrs, own => `<ul class="cards"${own}>${e.items.map(item => `<li class="card"><p class="card-label">${escape(item.label)}</p>${paragraph(from, item.body, 'div')}</li>`).join('')}</ul>`);
      case 'details': {
        // A collapsed section never hides an Unknown silently (v1.3 note 2): its summary counts the Unknown claims inside it.
        const before = pending.length;
        // A collapsed first use does not use up the section's visible one.
        const shownBefore = new Set(termsShown);
        const inner = folded(id, () => e.elements.map(child => block(from, child)).join(''));
        termsShown.clear();
        for (const id of shownBefore) termsShown.add(id);
        const unknown = pending.slice(before).filter(entry => entry.epistemic === 'unknown').length;
        const count = unknown === 0 ? '' : ` <span class="details-unknown">(${unknown} Unknown)</span>`;
        return `<details class="details"${attrs}><summary>${escape(e.summary)}${count}</summary>${inner}</details>`;
      }
      case 'code': {
        const caption = `<figcaption><span class="code-language">${escape(e.language)}</span> <span class="code-path">${escape(e.path)}, lines ${e.startLine}–${e.endLine}</span></figcaption>`;
        const located = e.parts.filter((part): part is Extract<LocalSegment, { kind: 'quotation' }> => part.kind === 'quotation');
        if (located.length !== e.parts.length) {
          // A withheld excerpt's range is the agent's, never checked against the blob, and says so (REQ-polaris-generation-034).
          const unverified = `<figcaption><span class="code-language">${escape(e.language)}</span> <span class="code-path">${escape(e.path)}, lines ${e.startLine}–${e.endLine} as the agent gave them, unverified</span></figcaption>`;
          return claim('figure', id, 'unknown', `${unverified}<p><span class="quote-withheld" data-unknown-reason="excluded-content">[code excerpt withheld: the file it cites is excluded by screening]</span> ${mark(from, 'unknown')}</p>`,
            ` class="code-excerpt"${attrs}${curated} data-unknown-reason="excluded-content"`, 'excluded-content');
        }
        for (const part of located) {
          const redaction = sources.get(part.sourceId)?.redaction;
          quotations.push({ page: from, blockId: id, sourceId: part.sourceId, start: part.start, end: part.end, anchor: part.anchor,
            ...(redaction === undefined ? {} : { redaction: { redactionClass: redaction.redactionClass, withheldLines: redaction.withheldLines } }) });
        }
        // Entity-encoded text, so a cited `<`, `&` or `</pre>` is shown, never parsed (v1.3 note 1).
        const lines = located.map(part => `<code class="verified-quote" data-quote-source="${escape(part.sourceId)}" data-quote-start="${part.start}" data-quote-end="${part.end}">${escape(part.text).replace(/\r/gu, '&#13;')}</code>`).join('');
        return claim('figure', id, 'observed', `${caption}<pre>${lines}</pre><p class="code-anchor">${mark(from, 'observed')} ${located.map(part => anchorLink(from, part)).join(' ')}</p>`, ` class="code-excerpt"${attrs}${curated}`);
      }
    }
  };
  const block = (from: string, b: DraftBlock): string => {
    if (b.element !== undefined) {
      if (local === undefined) throw new DossierRenderError('not-renderable');
      return element(from, b.id, b.element);
    }
    const parent = paragraph(from, b, 'p');
    return b.children.length === 0 ? parent : `${parent}<ul class="block-children">${b.children.map(child => paragraph(from, child, 'li')).join('')}</ul>`;
  };
  // An operator-agent page names a referenced source by its number, or by its path where it has no page; never by its identifier.
  const assetReferences = (from: string, ids: readonly string[]): string => local === undefined ? escape(ids.join(', ')) : ids.map(id => {
    const source = sources.get(id);
    if (source === undefined) return escape(id);
    return sourcePaths.has(id) ? refs(from, [id]) : escape(source.path);
  }).join(', ');
  const notice = (from: string, id: string, disposition: { kind: string; reason?: string; references?: string[] }, asHero = false): string =>
    `<aside${asHero ? heroFigureAttribute : ''} class="unresolved-asset" data-asset-disposition="${escape(disposition.kind)}"><strong>${escape(id)}</strong>: ${escape(disposition.reason ?? '')} <span class="asset-references">(${assetReferences(from, disposition.references ?? [])})</span></aside>`;
  // A schema-v9 draft's graph edges (version 2.19): each arrow and list item carries `data-relation`; a witnessed edge is Syzygy's statement
  // of the fact that witnesses it, not the draft's claim: drawn solid and Observed in Syzygy's words, with the fact's provenance in its
  // `data-witness-*` attributes, no claim anchor, and in none of the draft's counts. `machine.json` lists every such edge as drawn.
  const relationEdges: { readonly index: number; readonly entry: Record<string, unknown> }[] = [];
  const relationOf = (id: string): LocalEdgeRelation | undefined => local?.edgeRelations?.get(id);
  type WitnessedRelation = Extract<LocalEdgeRelation, { readonly evidence: object }>;
  const witnessAttrs = (relation: LocalEdgeRelation): string => ` data-relation="${escape(relation.relation)}"${relation.evidence === undefined ? ''
    : ` data-witness-fact="${escape(relation.witness.fact)}" data-witness-rule="${escape(relation.witness.rule)}" data-witness-rule-version="${relation.witness.ruleVersion}"`}`;
  // A schema-v12 draft's model (version 2.24): its figures arrive as their views' expansions. An element or cited relationship more than one
  // view selects carries `data-element` or `data-relationship` in every figure drawing it, and its claim renders once, in its first figure:
  // the first, in draft diagram order, whose view selects it and that renders as a `<figure>`; each later figure lists it `as shown in` that
  // one. A derived relationship is no claim: Observed in Syzygy's words where witnessed, Unknown in Syzygy's words otherwise.
  const model = local?.model;
  const derivedIds = new Set(model?.relationships.flatMap(r => (r.basis === 'derived' ? [r.id] : [])) ?? []);
  const viewsOf = new Map<string, readonly string[]>([...(model?.elements ?? []), ...(model?.relationships ?? []).filter(r => r.basis === 'cited')].map(entry => [entry.id, entry.views]));
  const shared = (id: string): boolean => (viewsOf.get(id)?.length ?? 0) > 1;
  const figurePage = (d: DraftDiagram): string | undefined => {
    if (d.disposition.kind !== 'produced') return undefined;
    if (d.home?.kind === 'overview') return view.drafted ? 'index.html' : undefined;
    if (d.home?.kind === 'deep-dive' && deepPaths.has(d.home.id)) return deepPaths.get(d.home.id);
    const section = draft.sections.find(entry => entry.id === d.sectionId);
    return section === undefined || section.disposition.kind !== 'produced' || view.deferredSections.has(section.id) ? undefined : sectionPage(section.id);
  };
  const firstFigure = (id: string): { readonly index: number; readonly page: string } | undefined => {
    const views = viewsOf.get(id) ?? [];
    for (const [i, d] of draft.diagrams.entries()) {
      if (!views.includes(d.id)) continue;
      const page = figurePage(d);
      if (page !== undefined) return { index: i, page };
    }
    return undefined;
  };
  // `, as shown in <a href>title</a>` for a shared element or cited relationship listed in a figure that is not its first; undefined otherwise.
  const asShown = (from: string, id: string, index: number): string | undefined => {
    if (!shared(id)) return undefined;
    const first = firstFigure(id);
    if (first === undefined || first.index === index) return undefined;
    const target = draft.diagrams[first.index]!;
    const link = first.page === from ? `#figure-${target.id}` : href(from, first.page, `figure-${target.id}`);
    return `, as shown in <a href="${escape(link)}">${escape(target.title)}</a>`;
  };
  const sharedAttr = (id: string, kind: 'element' | 'relationship'): string => (shared(id) ? ` data-${kind}="${escape(id)}"` : '');
  const diagram = (from: string, asDrafted: DraftDiagram, index: number, asHero = false): string => {
    if (asDrafted.disposition.kind !== 'produced') return notice(from, asDrafted.id, asDrafted.disposition, asHero);
    if (asDrafted.figure?.kind === CONTAINMENT_KIND) return containmentFigure(from, asDrafted, asDrafted.figure.groups, index);
    if (asDrafted.figure !== undefined) return kindedFigure(from, asDrafted, asDrafted.figure, index);
    // `d` is the figure as drawn: a witnessed edge in Syzygy's words and marked Observed, every other element keeping the draft's label
    // and marking.
    const words = (id: string): string | undefined => relationOf(id)?.evidence?.words;
    const d: DraftDiagram = local?.edgeRelations === undefined ? asDrafted
      : { ...asDrafted, edges: asDrafted.edges.map(e => { const said = words(e.id); return said !== undefined ? { ...e, label: said, epistemic: 'observed' as const, sourceIds: [] }
        : derivedIds.has(e.id) ? { ...e, epistemic: 'unknown' as const, sourceIds: [] } : e; }) };
    const nodes = new Map(d.nodes.map(node => [node.id, node]));
    // A withheld node or edge (v1.5) reads `Withheld item` and says, in Syzygy's words, what is withheld, with its count.
    const held = (id: string): WithheldNote | undefined => local?.withheldElements?.get(id);
    const heldText = (id: string): string => held(id) === undefined ? '' : ` <span class="withheld-note">${escape(withheldWords(held(id)!))}</span>`;
    const heldAttrs = (id: string): string => held(id) === undefined ? '' : ' data-unknown-reason="excluded-content"';
    const nodeList = d.nodes.map(n => { const shown = asShown(from, n.id, index); return shown !== undefined ? `<li>${escape(n.label)}${shown}</li>` : claim('li', n.id, n.epistemic, `${escape(n.label)}${heldText(n.id)} ${mark(from, n.epistemic)} ${refs(from, n.sourceIds, n.id)}`, heldAttrs(n.id), held(n.id) === undefined ? null : 'excluded-content', held(n.id) === undefined ? undefined : { withheldSources: held(n.id)!.sources }); }).join('');
    const witnessItem = (e: DraftDiagram['edges'][number], relation: WitnessedRelation): string =>
      `<li${witnessAttrs(relation)} data-epistemic="observed">${escape(nodes.get(e.from)!.label)} → ${escape(nodes.get(e.to)!.label)}: ${escape(relation.evidence.words)} <span class="derived-mark">Witnessed by Syzygy</span>`
      + `<span class="visually-hidden ev"> ${escape(`Evidence: label Observed; witnessed by fact ${relation.witness.fact} (${relation.evidence.factKind}), derived by Syzygy by rule ${relation.witness.rule} version ${relation.witness.ruleVersion} at revision ${relation.evidence.revision}; record sha256:${relation.evidence.recordSha256}.`)}</span></li>`;
    const diagramRelationEdges: typeof relationEdges = [];
    const edgeList = d.edges.map(e => {
      const relation = relationOf(e.id);
      if (relation !== undefined) diagramRelationEdges.push({ index, entry: { diagram: d.id, page: from, id: e.id, from: e.from, to: e.to, epistemic: e.epistemic, text: e.label, ...(derivedIds.has(e.id) ? { basis: 'derived' } : {}), relation: relation.relation, witness: relation.witness } });
      if (relation?.evidence !== undefined) return witnessItem(e, relation);
      const ends = `${escape(nodes.get(e.from)!.label)} → ${escape(nodes.get(e.to)!.label)}`;
      // A derived relationship not witnessed (version 2.24): Syzygy's words for what it could not derive, and the state's reason.
      if (derivedIds.has(e.id)) {
        const reason = relation === undefined ? 'unknown' : relation.witness.state === 'challenged' ? 'challenged' : relation.witness.reason ?? 'unknown';
        return `<li data-relation="${escape(relation?.relation ?? '')}" data-unknown-reason="${escape(reason)}">${ends}: Syzygy could not derive this relation (${escape(reason)})</li>`;
      }
      const shown = asShown(from, e.id, index);
      if (shown !== undefined) return `<li>${ends}: ${escape(e.label)}${shown}</li>`;
      return claim('li', e.id, e.epistemic, `${escape(nodes.get(e.from)!.label)} → ${escape(nodes.get(e.to)!.label)}: ${escape(e.label)}${heldText(e.id)} ${mark(from, e.epistemic)} ${refs(from, e.sourceIds, e.id)}`, `${heldAttrs(e.id)}${relation === undefined ? '' : witnessAttrs(relation)}`, held(e.id) === undefined ? null : 'excluded-content', held(e.id) === undefined ? undefined : { withheldSources: held(e.id)!.sources });
    }).join('');
    // A witnessed arrow's group also carries `data-epistemic="observed"`; its line style is the `observed` class every arrow's marking gives.
    // Keyed by edge id: `renderDiagramSvg` asks the hook for nodes too, which get nothing here because check's `duplicate-id` keeps every
    // identity of a rendered (passed) draft unique, so no node shares an edge's id.
    const edgeAttrs = new Map([...d.nodes.flatMap(n => (shared(n.id) ? [[n.id, sharedAttr(n.id, 'element')] as const] : [])), ...d.edges.flatMap(e => {
      const relation = relationOf(e.id);
      const marking = relation?.evidence !== undefined ? ' data-epistemic="observed"' : derivedIds.has(e.id) ? ' data-epistemic="unknown"' : '';
      const attrs = `${sharedAttr(e.id, 'relationship')}${relation === undefined ? '' : witnessAttrs(relation)}${marking}`;
      return attrs === '' ? [] : [[e.id, attrs] as const];
    })]);
    let svg: string;
    try {
      svg = edgeAttrs.size === 0 ? renderDiagramSvg(d, index, escape, local === undefined ? undefined : READABLE_SPACING)
        : renderDiagramSvg(d, index, escape, READABLE_SPACING, id => edgeAttrs.get(id) ?? '');
      assertInertSvg(svg);
    } catch {
      return notice(from, d.id, { kind: 'unresolved', reason: 'diagram could not be rendered inertly', references: [...new Set([...d.nodes, ...d.edges].flatMap(element => element.sourceIds))] }, asHero);
    }
    for (const entry of diagramRelationEdges) relationEdges.push(entry);
    // The provider mode keeps its fixed legend (its bytes are pinned); an operator-agent figure legends only the styles it draws, with a
    // tally of its boxes and arrows by marking (syzygy-3efd.17): no figure element is observed there, so "Solid: observed" was false.
    const legend = local === undefined ? FIXED_DIAGRAM_LEGEND : figureLegend([...d.nodes, ...d.edges].map(element => element.epistemic), d.nodes.length, d.edges.length);
    // An operator-agent figure is a fragment target, so the index can send a reader to it; it is never drawn inside a folded element.
    if (local !== undefined) figureHomes.push({ id: d.id, title: d.title, home: { page: from, fragment: `figure-${d.id}`, label: 'Figure' } });
    const ids = figureIds(index);
    return `<figure${asHero ? heroFigureAttribute : ''}${curated}${local === undefined ? '' : ` id="figure-${escape(d.id)}"`}><figcaption${ids.title}>${escape(d.title)}</figcaption><p class="diagram-relationship"><span class="eyebrow">${escape(d.kind)}</span> ${escape(d.relationship)}</p><div class="diagram-scroll">${svg}</div>${legend}<details><summary>Read every component and relationship</summary>${ids.textOpen}<ul>${nodeList}</ul><ol>${edgeList}</ol>${ids.textClose}<details class="diagram-source"><summary>Declarative source (Mermaid)</summary><pre>${escape(diagramToMermaid(d))}</pre></details></details></figure>`;
  };
  // A v7 sequence or swimlane (REQ-polaris-generation-034 version 2.5): the figure a graph figure with its home takes, holding its drawing and
  // its phone form, of which the stylesheet displays one by the width of the `figure-forms` box. Each participant, lane and step is a claim
  // as a node is, and each message as an edge is, listed once; the phone form carries no identity, citation, anchor or label token.
  const figurePages = new Set<string>();
  // The pages that render a containment's two forms (version 2.23), which alone carry the outline's rules.
  const containmentPages = new Set<string>();
  // The pages that render a subsection (version 2.16), which alone carry the subsection and contents-list style rules.
  const subsectionPages = new Set<string>();
  const figureStructures: { readonly index: number; readonly entry: Record<string, unknown> }[] = [];
  // A v11 containment (version 2.23): the figure a graph figure with its home takes, holding its drawing and its phone form, a nested list.
  // Each group is a claim as a node is, listed once in preorder; a witnessed nesting is listed after them in Syzygy's words, Observed, with
  // no claim anchor, and leaves both groups' boxes, items and marks as the draft states them.
  const containmentFigure = (from: string, d: DraftDiagram, groups: readonly DraftContainmentGroup[], index: number): string => {
    const held = (id: string): WithheldNote | undefined => local?.withheldElements?.get(id);
    const heldText = (id: string): string => held(id) === undefined ? '' : ` <span class="withheld-note">${escape(withheldWords(held(id)!))}</span>`;
    const heldAttrs = (id: string): string => held(id) === undefined ? '' : ' data-unknown-reason="excluded-content"';
    const preorder: { readonly group: DraftContainmentGroup; readonly parent: DraftContainmentGroup | undefined; readonly level: number }[] = [];
    const visit = (group: DraftContainmentGroup, parent: DraftContainmentGroup | undefined, level: number): void => {
      preorder.push({ group, parent, level });
      for (const child of group.children) visit(child, group, level + 1);
    };
    for (const group of groups) visit(group, undefined, 1);
    let svg: string, layout: ReturnType<typeof layoutContainment>;
    try {
      svg = renderContainmentSvg(groups, index, escape, id => sharedAttr(id, 'element'));
      assertInertSvg(svg);
      layout = layoutContainment(groups);
    } catch {
      return notice(from, d.id, { kind: 'unresolved', reason: 'diagram could not be rendered inertly', references: [...new Set(preorder.flatMap(({ group }) => group.sourceIds))] });
    }
    const listed = preorder.map(({ group, parent }) => { const shown = asShown(from, group.id, index); return shown !== undefined
      ? `<li>${escape(group.label)}${parent === undefined ? '' : ` (in ${escape(parent.label)})`}${shown}</li>` : claim('li', group.id, group.epistemic,
      `${escape(group.label)}${parent === undefined ? '' : ` (in ${escape(parent.label)})`}${heldText(group.id)} ${mark(from, group.epistemic)} ${refs(from, group.sourceIds, group.id)}`,
      heldAttrs(group.id), held(group.id) === undefined ? null : 'excluded-content', held(group.id) === undefined ? undefined : { withheldSources: held(group.id)!.sources }); }).join('');
    const witnessed = preorder.flatMap(({ group, parent }) => {
      const relation = parent === undefined ? undefined : relationOf(group.id);
      return relation?.evidence === undefined ? [] : [`<li${witnessAttrs(relation)} data-epistemic="observed">${escape(parent!.label)} contains ${escape(group.label)}: <span class="derived-mark">Witnessed by Syzygy</span>`
        + `<span class="visually-hidden ev"> ${escape(`Evidence: label Observed; witnessed by fact ${relation.witness.fact} (${relation.evidence.factKind}), derived by Syzygy by rule ${relation.witness.rule} version ${relation.witness.ruleVersion} at revision ${relation.evidence.revision}; record sha256:${relation.evidence.recordSha256}.`)}</span></li>`];
    }).join('');
    const outline = (group: DraftContainmentGroup): string =>
      `<li class="${group.epistemic}">${escape(group.label)}${group.epistemic === 'unknown' ? ' ?' : ''}${group.children.length === 0 ? '' : `<ul>${group.children.map(outline).join('')}</ul>`}</li>`;
    const witnesses = preorder.filter(({ group, parent }) => parent !== undefined && relationOf(group.id)?.evidence !== undefined).length;
    const tallyHead = `${counted(preorder.length, 'group', 'groups')} in ${counted(layout.levels, 'level', 'levels')}`;
    const tally = figureLegend(preorder.map(({ group }) => group.epistemic), 0, 0, 'as marked', tallyHead);
    // ` {N} nestings witnessed by Syzygy.` follows the tally where at least one nesting is witnessed.
    const legend = witnesses === 0 ? tally : tally.replace(/<\/p>$/u, ` ${counted(witnesses, 'nesting', 'nestings')} witnessed by Syzygy.</p>`);
    containmentPages.add(from);
    figureStructures.push({ index, entry: { diagram: d.id, kind: CONTAINMENT_KIND, page: from, laidOutPx: layout.width,
      groups: preorder.map(({ group, parent, level }) => ({ id: group.id, parent: parent?.id ?? null, level })),
      nestings: preorder.flatMap(({ group, parent }) => (parent === undefined ? [] : [{ parent: parent.id, child: group.id, witness: relationOf(group.id)?.witness ?? null }])) } });
    if (local !== undefined) figureHomes.push({ id: d.id, title: d.title, home: { page: from, fragment: `figure-${d.id}`, label: 'Figure' } });
    const ids = figureIds(index);
    return `<figure${curated} data-figure-kind="${CONTAINMENT_KIND}"${local === undefined ? '' : ` id="figure-${escape(d.id)}"`}><figcaption${ids.title}>${escape(d.title)}</figcaption><p class="diagram-relationship"><span class="eyebrow">${CONTAINMENT_KIND}</span> ${escape(d.relationship)}</p>`
      + `<div class="figure-forms" data-figure-width="${layout.width}"><div class="diagram-scroll figure-drawing">${svg}</div><ul class="figure-outline">${groups.map(outline).join('')}</ul></div>`
      + `${legend}<details><summary>Read every component and relationship</summary>${ids.textOpen}<ul>${listed}${witnessed}</ul>${ids.textClose}<details class="diagram-source"><summary>Declarative source (Mermaid)</summary><pre>${escape(figureToMermaid({ kind: CONTAINMENT_KIND, groups: [...groups] }))}</pre></details></details></figure>`;
  };
  const kindedFigure = (from: string, d: DraftDiagram, figure: Exclude<DraftFigure, { readonly kind: typeof CONTAINMENT_KIND }>, index: number): string => {
    const held = (id: string): WithheldNote | undefined => local?.withheldElements?.get(id);
    const heldText = (id: string): string => held(id) === undefined ? '' : ` <span class="withheld-note">${escape(withheldWords(held(id)!))}</span>`;
    const heldAttrs = (id: string): string => held(id) === undefined ? '' : ' data-unknown-reason="excluded-content"';
    const listed = (element: DraftFigureElement, words: string): string => claim('li', element.id, element.epistemic, `${words}${heldText(element.id)} ${mark(from, element.epistemic)} ${refs(from, element.sourceIds, element.id)}`,
      heldAttrs(element.id), held(element.id) === undefined ? null : 'excluded-content', held(element.id) === undefined ? undefined : { withheldSources: held(element.id)!.sources });
    const owners = figure.kind === 'sequence' ? figure.participants : figure.lanes;
    const uses: readonly DraftFigureElement[] = figure.kind === 'sequence' ? figure.messages : figure.steps;
    const all = [...owners, ...uses];
    let svg: string, width: number;
    try {
      svg = figure.kind === 'sequence' ? renderSequenceSvg(figure, index, escape) : renderSwimlaneSvg(figure, index, escape);
      assertInertSvg(svg);
      width = figure.kind === 'sequence' ? layoutSequence(figure.participants, figure.messages).width : layoutSwimlane(figure.lanes, figure.steps).width;
    } catch {
      return notice(from, d.id, { kind: 'unresolved', reason: 'diagram could not be rendered inertly', references: [...new Set(all.flatMap(element => element.sourceIds))] });
    }
    const ownerLabel = new Map(owners.map(owner => [owner.id, owner.label]));
    const shownLabel = (element: DraftFigureElement): string => `${escape(element.label)}${element.epistemic === 'unknown' ? ' ?' : ''}`;
    const shownOwner = (id: string): string => shownLabel(owners.find(owner => owner.id === id)!);
    const stepper = figure.kind === 'sequence'
      ? figure.messages.map(message => `<li class="${message.epistemic}"><span class="stepper-head">${shownOwner(message.from)} → ${shownOwner(message.to)}</span> ${shownLabel(message)}</li>`).join('')
      : figure.steps.map(step => `<li class="${step.epistemic}"><span class="stepper-head">${shownOwner(step.lane)}</span> ${shownLabel(step)}</li>`).join('');
    const ownerList = owners.map(owner => listed(owner, escape(owner.label))).join('');
    const useList = figure.kind === 'sequence'
      ? figure.messages.map(message => listed(message, `${escape(ownerLabel.get(message.from)!)} → ${escape(ownerLabel.get(message.to)!)}: ${escape(message.label)}`)).join('')
      : figure.steps.map(step => listed(step, `${escape(ownerLabel.get(step.lane)!)}: ${escape(step.label)}`)).join('');
    const tallyHead = figure.kind === 'sequence'
      ? `${counted(figure.participants.length, 'participant', 'participants')} and ${counted(figure.messages.length, 'message', 'messages')}`
      : `${counted(figure.lanes.length, 'lane', 'lanes')} and ${counted(figure.steps.length, 'step', 'steps')}`;
    figurePages.add(from);
    figureStructures.push({ index, entry: figure.kind === 'sequence'
      ? { diagram: d.id, kind: 'sequence', page: from, laidOutPx: width, participants: figure.participants.map(p => p.id), messages: figure.messages.map(m => ({ id: m.id, from: m.from, to: m.to })) }
      : { diagram: d.id, kind: 'swimlane', page: from, laidOutPx: width, lanes: figure.lanes.map(l => l.id), steps: figure.steps.map(st => ({ id: st.id, lane: st.lane })) } });
    // A sequence or swimlane is a fragment target as a graph figure is (the index-and-task-routes change).
    if (local !== undefined) figureHomes.push({ id: d.id, title: d.title, home: { page: from, fragment: `figure-${d.id}`, label: 'Figure' } });
    const ids = figureIds(index);
    return `<figure${curated} data-figure-kind="${figure.kind}"${local === undefined ? '' : ` id="figure-${escape(d.id)}"`}><figcaption${ids.title}>${escape(d.title)}</figcaption><p class="diagram-relationship"><span class="eyebrow">${figure.kind}</span> ${escape(d.relationship)}</p>`
      + `<div class="figure-forms" data-figure-width="${width}"><div class="diagram-scroll figure-drawing">${svg}</div><ol class="figure-stepper">${stepper}</ol></div>`
      + `${figureLegend(all.map(element => element.epistemic), 0, 0, 'as marked', tallyHead, figure.kind === 'swimlane')}<details><summary>Read every component and relationship</summary>${ids.textOpen}<ul>${ownerList}</ul><ol>${useList}</ol>${ids.textClose}<details class="diagram-source"><summary>Declarative source (Mermaid)</summary><pre>${escape(figureToMermaid(figure))}</pre></details></details></figure>`;
  };
  const topicAttr = (id: string): string => ` data-topics="${escape((topics[id] ?? []).join(' '))}"`;
  const localPages = local?.pages ?? [];
  const reserved = new Set(['index.html', 'contents.html', 'glossary.html', 'dossier.json', 'size-report.json', 'size-report.html', APPENDIX, LOCAL_MACHINE_VIEW, DERIVED_SITE_FILE, FIND_BY_TASK_PAGE, NAME_INDEX_PAGE, ...deepPaths.values(), ...sourcePaths.values(),
    ...poles.flatMap(pole => pole.path === null ? [] : [pole.path])]);
  for (const localPage of localPages) {
    if (!isDossierPagePath(localPage.path) || localPage.path.includes('/') || !localPage.path.endsWith('.html') || reserved.has(localPage.path)) throw new DossierRenderError('page-path-collision');
    reserved.add(localPage.path);
  }
  const overview = { path: 'index.html', title: 'Overview' };
  const contentsLink = { path: 'contents.html', title: 'Contents' };
  const glossaryLink = { path: 'glossary.html', title: 'Glossary' };
  const sourceIndexLink = { path: 'sources/index.html', title: 'Sources' };
  const diveLinks = deepDives.map(dive => ({ path: deepPaths.get(dive.id)!, title: dive.title, sectionId: dive.sectionId }));
  const standaloneDives = poleSpec === undefined ? diveLinks : [];
  // Both the sidebar and the page turns use this order, including the maps only when the site renders them.
  const maps = local?.derivedStructure !== undefined && local.manifestFacts !== undefined ? { derived: local.derivedStructure, manifests: local.manifestFacts } : undefined;
  // Version 2.38: the test-names reference page, after the maps, only where the render derived the member and holds a derived record.
  const testNames = local?.derivedStructure !== undefined && local.testNames !== undefined ? { derived: local.derivedStructure, member: local.testNames } : undefined;
  // Version 2.43: the rough-edges reference page, after the test-names page, under the same condition on its own member.
  const roughEdges = local?.derivedStructure !== undefined && local.roughEdges !== undefined ? { derived: local.derivedStructure, member: local.roughEdges } : undefined;
  // Version 2.48: the docs-and-code reference page, after the rough-edges page, under the same condition on its own member.
  const docsAndCode = local?.derivedStructure !== undefined && local.docsAndCode !== undefined ? { derived: local.derivedStructure, member: local.docsAndCode } : undefined;
  const referenceLinks = [...(testNames === undefined ? [] : [TEST_NAMES_PAGE]), ...(roughEdges === undefined ? [] : [ROUGH_EDGES_PAGE]), ...(docsAndCode === undefined ? [] : [DOCS_AND_CODE_PAGE])];
  const findingLinks = local === undefined ? [] : [{ path: FIND_BY_TASK_PAGE, title: 'Find by task' }, { path: NAME_INDEX_PAGE, title: 'Index' }];
  const readingGroups = [
    ...[overview, ...findingLinks].map(link => ({ title: link.title, link, dives: [], hue: null })),
    ...poles.map(pole => ({
      title: pole.label,
      link: pole.path === null ? null : { path: pole.path, title: pole.label },
      dives: diveLinks.filter(dive => pole.sections.includes(dive.sectionId)),
      hue: pole.hue,
    })),
    ...[contentsLink, ...standaloneDives, glossaryLink, sourceIndexLink, ...(maps === undefined ? [] : COMPUTED_MAPS), ...referenceLinks]
      .map(link => ({ title: link.title, link, dives: [], hue: null })),
  ];
  // How the dossier was made stays apart from its subject. The appendix is the last page of the reading order.
  const reportLinks = [...localPages, { path: 'size-report.html', title: 'Size report' }, ...(local === undefined ? [] : [{ path: APPENDIX, title: 'Appendix' }])];
  const navigationLink = (from: string, link: DossierNavLink): string =>
    `<a href="${escape(href(from, link.path))}"${local !== undefined && from === link.path ? ' aria-current="page"' : ''}>${escape(link.title)}</a>`;
  const navigationItems = (from: string, links: readonly DossierNavLink[]): string =>
    links.map(link => `<li>${navigationLink(from, link)}</li>`).join('');
  const reportItems = (from: string): string => navigationItems(from, reportLinks);
  const reviewReport = (from: string): string => local === undefined ? `${reportItems(from)}</ol>`
    : `</ol><details class="about-this-run"${reportLinks.some(link => link.path === from) ? ' open' : ''}><summary>${ABOUT_THIS_RUN}</summary><ol>${reportItems(from)}</ol></details>`;
  const sidebarItems = (from: string): string => readingGroups.map(group => {
    if (group.link === null && group.dives.length === 0) return '';
    const label = group.link === null ? escape(group.title) : navigationLink(from, group.link);
    const dives = group.dives.length === 0 ? '' : `<ol class="pole-dive-links">${navigationItems(from, group.dives)}</ol>`;
    return `<li${poleHueAttr(group.hue)}>${label}${dives}</li>`;
  }).join('');
  const nav = (from: string): string => `<span class="eyebrow">${escape(title)}</span><ol>${sidebarItems(from)}${reviewReport(from)}`;
  const readingOrder = [...readingGroups.flatMap(group => [...(group.link === null ? [] : [group.link]), ...group.dives]), ...reportLinks];
  const readingPosition = new Map(readingOrder.map((link, index) => [link.path, index]));
  const pageTurn = (from: string): string => {
    const position = readingPosition.get(from);
    if (position === undefined) return ''; // Exact source pages are outside the reading order.
    const links = (['prev', 'next'] as const).map(direction => {
      const target = readingOrder[position + (direction === 'prev' ? -1 : 1)];
      if (target === undefined) return '';
      return `<a rel="${direction}" href="${escape(href(from, target.path))}">${direction === 'prev' ? 'Previous' : 'Next'}: ${escape(target.title)}</a>`;
    });
    return `<nav class="reading-order" aria-label="Reading order">${links.join('')}</nav>`;
  };
  // The dossier's open questions and Unknown claims, counted for the one sentence before any page is drawn.
  const openQuestions = withheld ? 0 : draft.unresolved.length;
  const unknownClaims = local === undefined || withheld ? 0 : [...local.blocks.values()].filter(b => b.marking === 'unknown').length
    + draft.diagrams.filter(d => d.disposition.kind === 'produced').flatMap(d => [...d.nodes, ...d.edges, ...figureElements(d)]).filter(element => element.epistemic === 'unknown').length;
  const tally = [openQuestions === 0 ? '' : `${openQuestions} open question(s)`, unknownClaims === 0 ? '' : `${unknownClaims} Unknown claim(s)`].filter(part => part !== '');
  const runSentence = local === undefined ? '' : withheld
    ? 'The draft layer of this dossier is Unknown, so none of the agent\'s draft is shown; no human review is recorded.'
    : `This is a draft written by ${local.authoring?.tool ?? 'the operator\'s agent tool'} with ${local.authoring?.model ?? 'an operator-declared model'}; no human review is recorded.${tally.length === 0 ? '' : ` It has ${tally.join(' and ')}.`}`;
  const chrome: PageChrome | undefined = local === undefined ? undefined : {
    notice: withheld ? 'Operator-agent dossier — draft layer Unknown (unconsented-source-or-provider)' : 'Operator-agent editorial draft — not adopted; how it was made is stated below',
    // Dossier spec v1.5: one sentence of human text and a link to the appendix, which holds the disclosure in human form; the machine form
    // stays whole on every page, as these attributes read with the machine view.
    disclosure: (path: string) => `<p class="run-sentence">${escape(runSentence)} <a href="${escape(href(path, APPENDIX))}">How this dossier was made, its counts and its open questions</a></p>`,
    mainAttributes: `${local.draftLayer.state === 'editorial-draft'
      ? ` data-draft-state="editorial-draft" data-inference-model="${escape(local.draftLayer.inferenceProvenance.modelIdentity)}" data-inference-model-version="${escape(local.draftLayer.inferenceProvenance.modelVersion ?? 'not shown by the agent tool')}"`
      : ' data-draft-state="unknown" data-unknown-reason="unconsented-source-or-provider"'} data-disclosure-ids="${escape(local.disclosure.map(item => item.id).join(' '))}"`,
    region: regionMarkup(local.reviewStatus, escape),
    pageTurn,
  };

  const files = new Map<string, string>();
  const pages: { path: string; depth: number }[] = [];
  const claimsByPage: { page: string; id: string; epistemic: EpistemicMarking; unknownReason: string | null; v15?: ClaimMarks }[] = [];
  // A page citing a redacted file says once what the mark on its citations means (RFC7-34: a visual encoding is legended).
  const legended = (path: string, main: string): string => narrative(path) ? `${READING_LEGEND}${main}`
    : MAP_PATHS.has(path) ? `${MAP_READING_LEGEND}${main}`
    : testNames !== undefined && path === TEST_NAMES_PAGE.path ? `${TEST_NAMES_LEGEND}${main}`
    : roughEdges !== undefined && path === ROUGH_EDGES_PAGE.path ? `${ROUGH_EDGES_LEGEND}${main}`
    : docsAndCode !== undefined && path === DOCS_AND_CODE_PAGE.path ? `${DOCS_AND_CODE_LEGEND}${main}`
    : local !== undefined && main.includes('class="redaction-mark"')
    ? `${main}<p class="redaction-legend"><span aria-hidden="true">†N</span> on a citation: N lines of that file are withheld by screening. Its source page marks where.</p>` : main;
  const deferredSourceLeaves = new Map<string, () => string>();
  const add = (path: string, depth: number, pageTitle: string, main: string | (() => { markup: string; styles: string }), mapCss = ''): void => {
    pageTitles.set(path, pageTitle);
    const draw = (markup: string, styles: string): string =>
      page(`${pageTitle} — ${title}`, path, nav(path), legended(path, markup), chrome, figureKindsCss(figurePages.has(path), containmentPages.has(path)), styles, subsectionPages.has(path));
    if (typeof main === 'string') files.set(path, draw(main, mapCss));
    else {
      files.set(path, '');
      deferredSourceLeaves.set(path, () => {
        const { markup, styles } = main();
        return draw(markup, styles);
      });
    }
    pages.push({ path, depth });
    claimsByPage.push(...pending.splice(0).map(entry => ({ page: path, ...entry })));
  };

  // --- entry page
  const from = 'index.html';
  // The structure Syzygy derived from the pinned tree (version 2.3), in its own region at the end of the landing page's main content.
  const derivedRegion = local?.derivedStructure === undefined ? '' : renderDerivedRegion(local.derivedStructure, maps !== undefined);
  // The open questions: on the overview for a provider run; for an operator-agent run, on the appendix (v1.5), drawn there.
  const openQuestionClaims = (at: string): string => withheld ? '' : draft.unresolved.map((item, index) => claim('aside', `unresolved/${index + 1}`, 'unknown',
    `<strong>${escape(item.question)}</strong>: ${escape(item.reason)} ${marking('unknown')} <span class="asset-references">(${assetReferences(at, item.references)})</span>`)).join('');
  const unresolved = local === undefined ? openQuestionClaims(from) : '';
  const notGenerated = (id: string, kind: string): string => claim('aside', `not-generated/${id}`, 'unknown',
    `<strong>${escape(id)}</strong> (${escape(kind)}): not generated; the run stopped before it was written (${escape(stop!.shown)}). ${marking('unknown')}`,
    ` class="unresolved-asset" data-asset-disposition="not-generated" data-stop-reason="${escape(stop!.shown)}"`);
  const sectionMarkup = (from: string, section: DossierDraft['sections'][number], index: number): string => {
    termsShown.clear();
    place = section.title;
    rank = 1;
    const head = `<span class="eyebrow">${String(index + 1).padStart(2, '0')}</span><h2>${escape(section.title)}</h2>`;
    if (view.deferredSections.has(section.id)) return `<section id="section-${escape(section.id)}" data-reading-level="1" data-topics="">${head}${notGenerated(section.id, 'section')}</section>`;
    if (section.disposition.kind !== 'produced') return `<section id="section-${escape(section.id)}" data-reading-level="1"${topicAttr(section.id)}>${head}${notice(from, section.id, section.disposition)}</section>`;
    // A figure homed on a deep dive that has no page of its own (not produced, or the draft layer withheld) shows in the dive's section.
    const figures = draft.diagrams.map((d, i) => (d.home === undefined || (d.home.kind === 'deep-dive' && !deepPaths.has(d.home.id))) && d.sectionId === section.id ? diagram(from, d, i) : '').join('');
    const dives = draft.deepDives.filter(dive => dive.sectionId === section.id).map(dive => dive.disposition.kind === 'produced'
      ? `<li><a href="${escape(href(from, deepPaths.get(dive.id)!))}">Explore: ${escape(dive.title)}</a></li>` : `<li>${notice(from, dive.id, dive.disposition)}</li>`).join('');
    // An operator-agent section leads with its diagrams (syzygy-mea.10.4); the provider mode's bytes are pinned, so its figures follow.
    // A worth-knowing block (version 2.26) renders once, in its page's callout, and not again here.
    const body = section.paragraphs.filter(b => !worthKnowingIds.has(b.id)).map(b => block(from, b)).join('');
    // A v8 section's subsections follow its own paragraphs and precede its deep-dive links (version 2.16): each its title as an `h3`, its
    // answer first, rendered as the introduction's block is, then its paragraphs as the section's own are.
    const subsections = (section.subsections ?? []).map(sub => `<section class="subsection" id="subsection-${escape(sub.id)}"><h3>${escape(sub.title)}</h3><div class="subsection-answer">${paragraph(from, sub.answer, 'p')}</div>${sub.paragraphs.map(b => block(from, b)).join('')}</section>`).join('');
    if (subsections !== '') subsectionPages.add(from);
    return `<section id="section-${escape(section.id)}" data-reading-level="1"${topicAttr(section.id)}${from.startsWith('poles/') ? '' : sectionHue(section.id)}>${head}${local === undefined ? `${body}${figures}` : `${figures}${body}`}${subsections}${dives ? `<ul class="deep-links">${dives}</ul>` : ''}</section>`;
  };
  // The worth-knowing callout (version 2.26): on a page that draws sections, before them, the marked blocks of the sections it draws, in
  // draft order, each a claim block rendered as any is and followed by a link to its section. A Pole that marks none and says why gets
  // Syzygy's sentence that none was found; the author's reason is never rendered. Only a v13 draft carries marks, so an earlier draft's
  // pages keep their bytes.
  const worthKnowingIds: ReadonlySet<string> = new Set(withheld ? [] : local?.worthKnowing?.blockIds ?? []);
  const worthKnowingCallout = (from: string, shown: readonly DossierDraft['sections'][number][], noneFound: boolean): string => {
    const items = shown.filter(section => !view.deferredSections.has(section.id) && section.disposition.kind === 'produced').flatMap(section => section.paragraphs
      .filter(b => worthKnowingIds.has(b.id)).map(b => {
        termsShown.clear();
        place = section.title;
        rank = 1;
        return `<div class="worth-knowing-item"${from.startsWith('poles/') ? '' : sectionHue(section.id)}>${block(from, b)}<p class="worth-knowing-from">In <a href="${escape(sectionPage(section.id) === from ? `#section-${section.id}` : sectionHref(from, section.id))}">${escape(section.title)}</a></p></div>`;
      }));
    if (items.length > 0) return `<aside class="callout callout-important worth-knowing" id="worth-knowing" aria-label="Worth knowing"><p class="callout-title"><span class="callout-tone">Worth knowing</span> What a newcomer would not guess</p>${items.join('')}</aside>`;
    return noneFound ? `<aside class="callout callout-note worth-knowing" id="worth-knowing" data-worth-knowing="none" aria-label="Worth knowing"><p class="callout-title"><span class="callout-tone">Worth knowing</span> None found</p><p>The authoring session reports that no fact in this part meets the test of what a newcomer would not guess (Inferred, self-reported).</p></aside>` : '';
  };
  const noneFoundFor = (poleIndex: number): boolean => !withheld && (local?.worthKnowing?.nonePoles ?? []).includes(poleIndex);
  // The on-page contents list (version 2.16): on a page that renders at least one subsection, one item per section the page renders, in
  // page order, each holding its rendered subsections. A section that renders no content of the draft renders no subsection.
  const rendersSubsections = (section: DossierDraft['sections'][number]): boolean =>
    !view.deferredSections.has(section.id) && section.disposition.kind === 'produced' && (section.subsections ?? []).length > 0;
  const pageContents = (shown: readonly DossierDraft['sections'][number][]): string => !shown.some(rendersSubsections) ? ''
    : `<nav class="page-contents" aria-label="On this page"><p class="page-contents-title">On this page</p><ol>${shown.map(section => `<li><a href="#section-${escape(section.id)}">${escape(section.title)}</a>${rendersSubsections(section)
      ? `<ol>${section.subsections!.map(sub => `<li><a href="#subsection-${escape(sub.id)}">${escape(sub.title)}</a></li>`).join('')}</ol>` : ''}</li>`).join('')}</ol></nav>`;
  const onLanding = poleSpec === undefined ? draft.sections : draft.sections.filter(section => section.id === poleSpec.whySection);
  // The landing page's callout holds the why section's marked blocks, or every section's in a draft with no Poles; the none-found sentence
  // of a Pole with no page of its own (one holding only the why section) is drawn here.
  const landingCallout = withheld ? '' : worthKnowingCallout(from, onLanding, poles.some((pole, index) => pole.path === null && noneFoundFor(index)));
  const sections = withheld ? '' : `${landingCallout}${pageContents(onLanding)}${onLanding.map(section => sectionMarkup(from, section, draft.sections.indexOf(section))).join('')}`;
  // The map of the Poles: each Pole's label linking to its page (the why section's Pole to the section here), with its sections.
  const poleMap = poles.length === 0 ? '' : `<nav class="pole-map" aria-label="The parts of this dossier"><h2>The parts of this dossier</h2><ol>${poles.map(pole => {
    const target = pole.path === null ? href(from, 'index.html', `section-${poleSpec!.whySection}`) : href(from, pole.path);
    return `<li${poleHueAttr(pole.hue)}><a href="${escape(target)}">${escape(pole.label)}</a><ul>${pole.sections.map(id => `<li><a href="${escape(sectionHref(from, id))}">${escape(draft.sections.find(section => section.id === id)!.title)}</a></li>`).join('')}</ul></li>`;
  }).join('')}</ol></nav>`;
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
    add(from, 0, 'Overview', `<header data-reading-level="0"><span class="eyebrow">Polaris · Draft layer Unknown</span><h1>${escape(title)}</h1>${policy}</header>${derivedRegion}`);
  } else {
    termsShown.clear();
    place = 'Overview';
    rank = 0;
    // A v6 draft whose thesis is a reading of the code (version 2.4): Syzygy's one line, immediately before the introduction's block and
    // outside it, carrying no label token, citation or anchor; none where the introduction or the draft layer is withheld.
    const thesisLine = local?.thesisBasis?.lineRendered === true ? THESIS_BASIS_LINE : '';
    const introduction = view.drafted ? `${thesisLine}${paragraph(from, draft.introduction, 'p')}` : '';
    const overviewQuestions = hero === undefined ? unresolved : draft.unresolved.length === 0 ? ''
      : `<div id="open-questions">${openQuestionClaims(from)}</div>`;
    const missingList = view.notGenerated.length === 0 ? '' : `<section id="not-generated" data-reading-level="1" data-topics=""><h2>Not generated</h2>${view.notGenerated.map(item => notGenerated(item.id, item.kind)).join('')}</section>`;
    // The named hero or reasoned omission leads the overview's own figures. Other figures keep their draft order.
    const overviewDiagrams = view.drafted
      ? draft.diagrams.flatMap((entry, index) => entry.home?.kind === 'overview' ? [{ entry, index }] : []) : [];
    const heroDiagram = hero?.form === 'figure' ? overviewDiagrams.find(({ entry }) => entry.id === hero.diagram) : undefined;
    const lead = !view.drafted ? '' : hero?.form === 'omitted'
      ? `<div data-hero="omitted"><p class="hero-omitted">The authoring session left out the overview figure, for the reason that follows.</p>${paragraph(from, hero.reason, 'p')}</div>`
      : heroDiagram === undefined ? '' : diagram(from, heroDiagram.entry, heroDiagram.index, true);
    heroRendered = lead !== '';
    const overviewDrawn = lead + overviewDiagrams.filter((entry) => entry !== heroDiagram).map(({ entry, index }) => diagram(from, entry, index)).join('');
    const overviewFigures = overviewDrawn === '' ? '' : `<section id="overview-figures" data-reading-level="1" data-topics="">${overviewDrawn}</section>`;
    add(from, 0, 'Overview', `<header data-reading-level="0"><span class="eyebrow">Polaris · Editorial draft</span><h1>${escape(draft.title)}</h1>${banner}${introduction}${overviewQuestions}</header>${overviewFigures}${poleMap}${sections}${missingList}${derivedRegion}`);
  }

  // --- find by task (the index-and-task-routes change): the draft's task routes, right after the overview in the reading order. A step is a claim block and
  // renders as one, with its label, its numbered sources and, in words, the file and lines it cites and the part of the dossier that
  // explains it. A draft with no routes gets the page and a plain sentence; Syzygy writes no route of its own.
  if (local !== undefined) {
    const at = FIND_BY_TASK_PAGE;
    const routes = withheld ? [] : local.taskRoutes ?? [];
    const routeFragment = (id: string): string => `route-${id}`;
    const where = (stepId: string, sourceIds: readonly string[]): string => {
      // One file once, however many source pieces of it the step cites: linked at the first piece cited, with each piece's lines.
      const cited = [...new Set(sourceIds)].flatMap(id => {
        const source = sources.get(id), target = sourcePaths.get(id);
        return source === undefined || target === undefined ? [] : [{ id, path: source.path, target, ranges: local.citationLines?.get(stepId)?.get(id) }];
      });
      const files = [...new Set(cited.map(piece => piece.path))].map(path => {
        const pieces = cited.filter(piece => piece.path === path);
        const lines = pieces.flatMap(piece => citationLabel(piece.ranges) ?? []);
        const first = pieces.find(piece => piece.ranges !== undefined) ?? pieces[0]!;
        return `<a href="${escape(href(at, first.target, lineFragment(first.id, first.ranges)))}"><code>${escape(path)}</code></a>${lines.length === 0 ? '' : `, ${escape(lines.join(', '))}`}`;
      });
      return files.length === 0 ? '' : `<span class="route-where">Read or change: ${files.join('; ')}</span>`;
    };
    const see = (step: NonNullable<LocalRenderInput['taskRoutes']>[number]['steps'][number]): string => {
      if (step.see === undefined) return '';
      const dive = step.see.kind === 'deep-dive' ? draft.deepDives.find(candidate => candidate.id === step.see!.id) : undefined;
      const section = draft.sections.find(candidate => candidate.id === (dive?.sectionId ?? step.see!.id));
      // A deep dive with no page of its own is explained in its section.
      const target = dive !== undefined && deepPaths.has(dive.id) ? { to: href(at, deepPaths.get(dive.id)!), title: dive.title }
        : section === undefined ? undefined : { to: sectionHref(at, section.id), title: section.title };
      return target === undefined ? '' : `<span class="route-see">In this dossier: <a href="${escape(target.to)}">${escape(target.title)}</a></span>`;
    };
    const drawn = routes.map(route => {
      termsShown.clear();
      place = route.task;
      rank = 3;
      const shown = (id: string): boolean => { const own = local.blocks.get(id); return own?.withheld === undefined && own?.secretMatched !== true; };
      const steps = route.steps.map(step => localParagraph(at, step.paragraph, 'li', shown(step.paragraph.id) ? `${where(step.paragraph.id, step.paragraph.sourceIds)}${see(step)}` : '')).join('');
      return `<section id="${escape(routeFragment(route.id))}" class="task-route" data-task-route="${escape(route.id)}"><h2>${escape(route.task)}</h2><ol class="steps route-steps">${steps}</ol></section>`;
    }).join('');
    const body = withheld ? `<p class="no-routes" data-task-routes="withheld">${escape(TASK_ROUTES_WITHHELD)}</p>`
      : routes.length === 0 ? `<p class="no-routes" data-task-routes="none">${escape(NO_TASK_ROUTES)} To find where something is named, use <a href="${escape(href(at, NAME_INDEX_PAGE))}">the index</a>.</p>`
      : `<p class="route-note">${routes.length === 1 ? '1 task' : `${routes.length} tasks`} a reader may bring to this project, each answered by a short route. Every step is the authoring agent's claim, labelled and checked like any block of this dossier: it cites the file and lines to read or change at the pinned revision. Names are listed on <a href="${escape(href(at, NAME_INDEX_PAGE))}">the index</a>.</p>`
        + `<nav class="route-list" aria-label="Tasks"><ol>${routes.map(route => `<li><a href="#${escape(routeFragment(route.id))}">${escape(route.task)}</a></li>`).join('')}</ol></nav>${drawn}`;
    add(at, 1, 'Find by task', `<section id="find-by-task" data-topics="" data-task-route-count="${routes.length}"><h1>Find by task</h1>${body}</section>`);
  }

  // --- Pole pages, in the map's order, after the landing page: each draws its sections; the why section stays on the landing page,
  // and its Pole's page links back to it rather than repeating it.
  for (const [poleIndex, pole] of poles.entries()) {
    if (pole.path === null) continue;
    const at = pole.path;
    const rendered = pole.sections.filter(id => id !== poleSpec!.whySection).map(id => draft.sections.find(candidate => candidate.id === id)!);
    const callout = worthKnowingCallout(at, rendered, noneFoundFor(poleIndex));
    const body = pole.sections.map(id => {
      const section = draft.sections.find(candidate => candidate.id === id)!;
      return id === poleSpec!.whySection
        ? `<p class="pole-why"><a href="${escape(href(at, 'index.html', `section-${id}`))}">${escape(section.title)}</a> is on the overview.</p>`
        : sectionMarkup(at, section, draft.sections.indexOf(section));
    }).join('');
    add(at, 1, pole.label, `<section id="pole" data-reading-level="1" data-pole="${escape(at)}"${poleHueAttr(pole.hue)}><span class="eyebrow">Part of <a href="${escape(href(at, 'index.html'))}">${escape(draft.title)}</a></span><h1>${escape(pole.label)}</h1>${bannerFor(`run-stopped/pole/${at}`)}${callout}${pageContents(rendered)}${body}</section>`);
  }

  // --- deep dives
  for (const dive of deepDives) {
    const path = deepPaths.get(dive.id)!;
    termsShown.clear();
    place = dive.title;
    rank = 2;
    const parent = draft.sections.find(section => section.id === dive.sectionId)!;
    // A deep dive leads with the figures whose home it is, as a section does (syzygy-3efd.18).
    const diveFigures = draft.diagrams.map((d, i) => d.home?.kind === 'deep-dive' && d.home.id === dive.id ? diagram(path, d, i) : '').join('');
    add(path, 1, dive.title, `<section id="deep-dive-${escape(dive.id)}" data-reading-level="2"${topicAttr(dive.id)}${sectionHue(dive.sectionId)}><span class="eyebrow">Deep dive · <a href="${escape(sectionHref(path, parent.id))}">${escape(parent.title)}</a></span><h1>${escape(dive.title)}</h1>${bannerFor(`run-stopped/dive/${dive.id}`)}${diveFigures}${dive.paragraphs.map(b => block(path, b)).join('')}</section>`);
  }

  // --- contents
  const contents = `<ol>${local === undefined ? '' : `<li><a href="${FIND_BY_TASK_PAGE}">Find by task</a></li><li><a href="${NAME_INDEX_PAGE}">Index</a></li>`}${(withheld ? [] : draft.sections).map(section => `<li><a href="${escape(sectionHref('contents.html', section.id))}">${escape(section.title)}</a>${draft.deepDives.some(dive => dive.sectionId === section.id && deepPaths.has(dive.id))
    ? `<ol>${draft.deepDives.filter(dive => dive.sectionId === section.id && deepPaths.has(dive.id)).map(dive => `<li><a href="${escape(href('contents.html', deepPaths.get(dive.id)!))}">${escape(dive.title)}</a></li>`).join('')}</ol>` : ''}</li>`).join('')}<li><a href="glossary.html">Glossary</a></li><li><a href="sources/index.html">Sources</a></li>${maps === undefined ? '' : COMPUTED_MAPS.map(m => `<li><a href="${m.path}">${m.title}</a></li>`).join('')}${referenceLinks.map(link => `<li><a href="${link.path}">${link.title}</a></li>`).join('')}${local === undefined ? `${reportItems('contents.html')}</ol>` : `</ol><h2 id="about-this-run">${ABOUT_THIS_RUN}</h2><p>How this dossier was made, apart from what it says about the project.</p><ol>${reportItems('contents.html')}</ol>`}`;
  add('contents.html', 1, 'Contents', `<section id="contents"><h1>Contents</h1>${contents}</section>`);

  // --- glossary: inventory terms, each an Inferred claim; for an operator-agent run, the understanding record's terminology
  const entries = local !== undefined ? [] : (view.inventory as { entries?: unknown } | null)?.entries;
  if (!Array.isArray(entries) && !(stop !== null && view.inventory === null)) throw new DossierRenderError('invalid-inventory');
  const terms = Array.isArray(entries) ? (entries as { id: string; kind: string; statement: string; sourceIds: string[] }[]).filter(entry => entry.kind === 'term') : [];
  const glossary = local !== undefined
    ? withheld ? '<p>The draft layer is Unknown, so the agent\'s terminology is not shown.</p>'
      : local.glossary.length === 0 ? '<p>The understanding record states no terms, so this glossary is empty.</p>'
      : `<dl class="glossary">${local.glossary.map(term => `<dt id="term-${escape(term.id)}"><dfn>${escape(glossaryDisplayName(term.title ?? term.id))}</dfn></dt>${item('glossary.html', 'dd', { ...term, title: null })}`).join('')}</dl>`
    : !Array.isArray(entries)
    ? claim('p', 'glossary/not-generated', 'unknown', `No inventory was produced before the run stopped (${escape(stop!.shown)}), so this glossary is empty. ${marking('unknown')}`)
    : terms.length === 0
    ? '<p>The inventory recorded no terms, so this glossary is empty.</p>'
    : `<dl class="glossary">${terms.map(term => `<dt id="term-${escape(term.id)}">${escape(term.id)}</dt>${claim('dd', `glossary/${term.id}`, 'inferred', `${escape(term.statement)} ${marking('inferred')} ${refs('glossary.html', term.sourceIds)}`)}`).join('')}</dl>`;
  add('glossary.html', 1, 'Glossary', `<section id="glossary"><h1>Glossary</h1>${glossary}</section>`);

  // --- the generated index (the index-and-task-routes change), after every page that holds a block is drawn: each glossary term, derived top-level
  // directory, cited or named file, backticked identifier and figure title, with its home and every block that names it.
  const nameIndex = local === undefined ? [] : buildNameIndex({
    // In reading order, whatever order the pages were drawn in: the introduction, the sections, the deep dives, the task routes.
    blocks: [0, 1, 2, 3].flatMap(stage => indexed.filter(block => block.rank === stage)),
    terms: withheld ? [] : local.glossary.map(term => ({ id: term.id, name: term.title ?? term.id })),
    units: local.derivedStructure?.state === 'derived' ? local.derivedStructure.facts.flatMap(fact => fact.fact === 'top-level-unit' && fact.epistemic === 'observed' ? [fact.path] : []) : [],
    paths: [...new Set(quotable.map(source => source.path))].map(path => {
      const pieces = quotable.filter(source => source.path === path);
      return { path, sourceIds: pieces.map(source => source.sourceId), page: sourcePaths.get(pieces[0]!.sourceId)! };
    }),
    unindexed: local.unindexedNames ?? [],
    figures: figureHomes.map(figure => ({ ...figure, repeatedBy: repeatedLists.filter(list => list.diagramId === figure.id).map(list => list.target) })),
  });
  if (local !== undefined) {
    add(NAME_INDEX_PAGE, 1, 'Index', renderNameIndex(nameIndex, target => href(NAME_INDEX_PAGE, target.page, target.fragment), escape, !withheld));
  }

  // --- sources: the whole population as a denominator, then one page per quotable source
  // An operator-agent page keeps the identifier on the source page's identity details and in the machine view (syzygy-pdja.1).
  const shownId = (id: string): string => local === undefined ? ` [${escape(id)}]` : '';
  // An operator-agent run says, for each source, the pages that cite it and how often; a source no page cites says so.
  const citedOnNote = (id: string): string => {
    if (local === undefined) return '';
    const onPages = citedOn.get(id);
    if (onPages === undefined) return ' <span class="cited-on">Not cited on the dossier\'s pages.</span>';
    return ` <span class="cited-on">Cited on ${[...onPages].map(([at, times]) => `<a href="${escape(href('sources/index.html', at))}">${escape(pageTitles.get(at) ?? at)}</a>${times === 1 ? '' : ` (${times} times)`}`).join(', ')}.</span>`;
  };
  // And why the agent chose it, in its own words from its discovery record: self-reported, so Inferred (syzygy-pdja.15). Only on a source
  // with admitted text: beside an excluded or withheld file the agent's words may derive from what screening kept out (RFC2-23).
  const selectedNote = (path: string): string => {
    const reason = local?.selectionReasons?.get(path);
    return reason === undefined ? '' : ` <span class="selected-why">Why the agent chose it, as it reports: ${escape(reason)} ${marking('inferred')}</span>`;
  };
  const list = input.sources.map(source => {
    const target = sourcePaths.get(source.sourceId);
    const redactedNote = source.redaction === undefined ? '' : ` · redacted-span: ${source.redaction.withheldLines} withheld line(s) in this file`;
    const reason = source.exclusion.excluded ? source.exclusion.reason : source.classificationBasis === 'path-only' ? 'path-only; body not read' : 'body unavailable for citation';
    return target === undefined
      ? `<li>${escape(source.path)}${shownId(source.sourceId)} — counted; exact text unavailable: ${escape(reason)}${escape(redactedNote)}.</li>`
      : `<li><a href="${escape(href('sources/index.html', target))}">${escape(source.path)}</a>${shownId(source.sourceId)}${escape(redactedNote)}${citedOnNote(source.sourceId)}${selectedNote(source.path)}</li>`;
  }).join('');
  const citedCount = local === undefined ? '' : ` ${input.sources.filter(source => citedOn.has(source.sourceId)).length} cited by the dossier's pages; each says where.`;
  add('sources/index.html', 1, 'Sources', `<section id="sources"><h1>Sources</h1><p>${input.sources.length} sources counted, ${quotable.length} with admitted text.${citedCount}</p><ul>${list}</ul></section>`);
  for (const source of quotable) {
    const path = sourcePaths.get(source.sourceId)!;
    const span = source.spans[0]!;
    const [start, end] = generationSpanRange(source, span);
    const anchor = local?.sourceAnchors.get(source.sourceId);
    if (local !== undefined && anchor === undefined) throw new DossierRenderError('unquotable-source');
    const identity = anchor === undefined ? ` · <code>${escape(span.anchorId)}</code></p>` : `</p><details class="source-identity"><summary>Source identity</summary><p>${escape(source.sourceId)}</p>${anchorDetails(anchor, escape)}</details>`;
    const read = anchor === undefined ? '' : `<p class="read-note">${marking('observed')} Syzygy read the original Git blob at the pinned revision at this render and recomputed its object identifier before screening.</p>`;
    const sourceLeaf = (): { markup: string; styles: string } => {
      const rules: string[] = [];
      const quote = (text: string, from: number, to: number): string => {
        const rows = numberedSources?.get(source.sourceId)?.get(from);
        const numbered = rows === undefined ? undefined : drawSourceLines(rows, citedLines.get(source.sourceId), escape);
        if (numbered !== undefined) for (const rule of numbered.styles) rules.push(rule);
        const content = numbered?.markup ?? escape(text).replace(/\r/gu, '&#13;');
        return `<blockquote class="exact-source" data-quote-source="${escape(source.sourceId)}" data-quote-start="${from}" data-quote-end="${to}">${content}</blockquote>`;
      };
      let exact = '';
      if (source.redaction === undefined) exact = quote(span.text, start, end);
      else {
        // Only surviving original spans are quotation evidence. Projection gaps are the screen's marker lines, never quotable bytes.
        const bytes = Buffer.from(source.body!);
        let at = 0;
        for (const kept of source.spans) {
          if (kept.start > at) exact += `<pre class="redaction-note">${escape(bytes.subarray(at, kept.start).toString('utf8')).replace(/\r/gu, '&#13;')}</pre>`;
          const [from, to] = generationSpanRange(source, kept);
          exact += quote(kept.text, from, to);
          at = kept.end;
        }
        if (at < bytes.length) exact += `<pre class="redaction-note">${escape(bytes.subarray(at).toString('utf8')).replace(/\r/gu, '&#13;')}</pre>`;
      }
      const extent = source.redaction === undefined ? `bytes ${start}–${end} of the file` : `redacted-span: ${source.redaction.withheldLines} withheld line(s) in this file; surviving spans use original Git byte coordinates`;
      const continuations: string[] = [];
      const continuationRules: string[] = [];
      for (const [target, destinations] of continuedCitations.get(source.sourceId) ?? []) {
        const links = [...destinations.values()].map(next => {
          const label = citationLabel(citedLines.get(next.sourceId)?.get(next.fragment)?.ranges)!;
          return `<a href="${escape(href(path, sourcePaths.get(next.sourceId)!, next.fragment))}">Continue this citation: ${escape(label)}</a>`;
        }).join('');
        continuations.push(`<div class="source-continuation" data-citation-target="${escape(target)}">${links}</div>`);
        continuationRules.push(`#exact-text:has([id="${target}"]:target)>.source-continuation[data-citation-target="${target}"]{display:block}`);
      }
      const markup = `<section id="exact-text" data-reading-level="3"><h1 class="source-path">${escape(source.path)}</h1><p class="source-anchor">${anchor === undefined ? `${escape(source.sourceId)} · ` : ''}${extent}${identity}${exact}${continuations.join('')}${read}</section>`;
      const styles = local === undefined ? '' : SOURCE_LINES_CSS + ` .source-line:target,.source-line:has(>.source-continuation-target:target)${rules.length === 0 ? '' : `,${rules.join(',')}`}{background:var(--accent-tint);box-shadow:inset ${tokens.line.sourceLineMarker} ${tokens.spacing.none} var(--accent)}${continuationRules.join('')}`;
      return { markup, styles };
    };
    add(path, 2, source.path, local === undefined ? sourceLeaf().markup : sourceLeaf);
  }

  // --- the computed map pages (version 2.9), after the sources and before the run's own pages: each its own style rules, which no other page
  // carries, with one container query for each width its figures take.
  let mapFigures: { readonly directories: number; readonly units: number; readonly ci: number; readonly infrastructure: number } | undefined;
  if (maps !== undefined) {
    const drawn = {
      directories: directoryMap(maps.derived, maps.manifests), units: unitMap(maps.manifests, maps.derived), ci: ciMap(maps.manifests, maps.derived),
      infrastructure: infrastructureMap(maps.manifests, maps.derived),
    };
    for (const m of COMPUTED_MAPS) {
      const map = drawn[m.map];
      add(m.path, 1, m.title, map.main, map.figures === 0 ? '' : `${MAP_FORMS_CSS}${[...new Set(map.widths)].sort((a, b) => a - b).map(mapWidthQuery).join('')}`);
    }
    mapFigures = { directories: drawn.directories.figures, units: drawn.units.figures, ci: drawn.ci.figures, infrastructure: drawn.infrastructure.figures };
  }

  // --- the test-names reference page (version 2.42), after the maps.
  if (testNames !== undefined) add(TEST_NAMES_PAGE.path, 1, TEST_NAMES_PAGE.title, testNamesPage(testNames.member, testNames.derived.revision));
  // --- the rough-edges reference page (version 2.43), after the test-names page.
  if (roughEdges !== undefined) add(ROUGH_EDGES_PAGE.path, 1, ROUGH_EDGES_PAGE.title, roughEdgesPage(roughEdges.member, roughEdges.derived.revision));
  // --- the docs-and-code reference page (version 2.48), after the rough-edges page.
  if (docsAndCode !== undefined) add(DOCS_AND_CODE_PAGE.path, 1, DOCS_AND_CODE_PAGE.title, docsAndCodePage(docsAndCode.member, docsAndCode.derived.revision));

  // --- the operator-agent run's own pages: understanding, discovery, clarifications, executions, review
  for (const localPage of localPages) {
    const groups = localPage.groups.map(group => `<section id="${escape(group.id)}" data-reading-level="1" data-topics=""><h2>${escape(group.heading)}</h2><p class="group-note">${escape(group.note)}</p>${group.items.length === 0 ? `<p>${escape(group.empty)}</p>` : `<ul class="local-items">${group.items.map(entry => item(localPage.path, 'li', entry)).join('')}</ul>`}</section>`).join('');
    add(localPage.path, 1, localPage.title, `<section id="page-${escape(localPage.path.replace(/\.html$/u, ''))}" data-topics=""><h1>${escape(localPage.title)}</h1><p>${escape(localPage.intro)}</p>${groups}</section>`);
  }
  // --- the appendix (v1.5): the last page of the reading order, holding the run disclosure in human form, the counts and the open questions.
  if (local !== undefined) {
    const counts = local.counts;
    const countRows: [string, string][] = counts === undefined ? [] : [
      ['uncited-judgements', `Blocks the agent marks as its own judgement and that cite nothing: ${counts.uncitedJudgements}.`],
      ['withheld-items', `Withheld items, whose every cited source screening withholds, shown Unknown in Syzygy's words: ${counts.withheldItems}.`],
      ['withheld-excerpts', `Code excerpts withheld: ${counts.withheldExcerpts}.`],
      ['withheld-inventory-entries', counts.withheldInventoryEntries === null ? 'Inventory entries withheld: Unknown, since no fidelity review counts at this render.' : `Inventory entries withheld, rendered nowhere: ${counts.withheldInventoryEntries}.`],
    ];
    const questions = hero === undefined ? openQuestionClaims(APPENDIX) : !withheld && draft.unresolved.length > 0
      ? `<p><a href="${href(APPENDIX, from, 'open-questions')}">Read the open questions in the overview.</a></p>` : '';
    add(APPENDIX, 1, 'Appendix', `<section id="appendix"><h1>Appendix</h1><p>${escape(runSentence)}</p>`
      + `<section id="appendix-disclosure" class="run-disclosure" aria-label="How this dossier was made"><h2>How this dossier was made</h2>${disclosureList(local.disclosure, escape)}<p>Syzygy can see only the marking: whether an unmarked claim rests on the agent's building or running of the project is the agent's report.</p></section>`
      + `<section id="appendix-counts"><h2>Counts</h2><ul>${countRows.map(([id, words]) => `<li data-count="${id}">${escape(words)}</li>`).join('')}<li data-count="unknown-claims">${escape(`Unknown claims in the argument: ${unknownClaims}.`)}</li><li data-count="open-questions">${escape(`Open questions: ${openQuestions}.`)}</li></ul></section>`
      + `<section id="appendix-questions"><h2>Open questions</h2>${questions === '' ? '<p>The draft records no open question.</p>' : questions}</section></section>`);
  }
  if (local !== undefined) {
    const ids = claimsByPage.map(entry => entry.id);
    if (new Set(ids).size !== ids.length) throw new DossierRenderError('duplicate-claim');
  }

  // Late run pages can cite sources too. Keep source leaves in their original manifest order and draw their highlights after those references.
  for (const [path, draw] of deferredSourceLeaves) files.set(path, draw());

  // The index is drawn last of the reading pages, since it lists every block, but it is read third: directly after find-by-task, as it
  // is listed in every page's navigation and on the contents page (the reader's edition, syzygy-5dhm.136).
  const indexAt = pages.findIndex(p => p.path === NAME_INDEX_PAGE);
  if (indexAt !== -1) pages.splice(pages.findIndex(p => p.path === FIND_BY_TASK_PAGE) + 1, 0, ...pages.splice(indexAt, 1));
  const manifest = parseDossierManifest(JSON.stringify({ format: DOSSIER_FORMAT, title, entryPage: 'index.html', pages }));
  files.set('dossier.json', `${JSON.stringify(manifest, null, 2)}\n`);
  // An operator-agent page is measured without its review-status region, so a render that changes only the region leaves the size
  // report unchanged and a rendered-design review counted.
  // Nor a glossary entry that only shows on hover or focus; the report's closing sentence says so.
  const measured = (html: string): string => (local === undefined ? html : (withoutReviewStatusRegion(html) ?? html).replace(/<span class="term-pop"[^>]*>.*?(?:<span class="visually-hidden ev">)?<span class="marking [a-z-]+">[^<]*<\/span>(?:<\/span>)?<\/span>/gsu, ''));
  const scanned = new Map(pages.map(p => [p.path, scanDossierPage(measured(files.get(p.path)!))]));
  const cost = readerCost(manifest, scanned);
  files.set('size-report.json', `${JSON.stringify({ format: 'polaris-dossier-size-report-v1', ...cost }, null, 2)}\n`);
  const first = cost.firstReadingLevel;
  // An operator-agent report names a source page by its file, not its hashed route.
  const pageNames = new Map(local === undefined ? [] : quotable.map(source => [sourcePaths.get(source.sourceId)!, source.path]));
  const count = (value: number | null): string => value === null ? 'Unknown' : String(value);
  files.set('size-report.html', page(`Size report — ${title}`, 'size-report.html', nav('size-report.html'), `<section id="size-report"><h1>Size report</h1>`
    + `<p>What a reader loads before choosing where to go: the first reading level of <a href="index.html">the overview</a>, ${count(first.bytesThroughFirstLevel)} bytes and ${count(first.words)} words, of an entry page of ${first.entryPageBytes} bytes. All ${cost.pages.length} pages: ${cost.pages.reduce((n, p) => n + p.bytes, 0)} bytes. No budget is declared, so nothing here is within or over one.</p>`
    + `<table><thead><tr><th>Link depth</th><th>Pages</th><th>Bytes</th><th>Words</th></tr></thead><tbody>${cost.perPageDepth.map(row => `<tr><td>${row.depth}</td><td>${row.pages}</td><td>${row.bytes}</td><td>${row.words}</td></tr>`).join('')}</tbody></table>`
    + `<table><thead><tr><th>Page</th><th>Depth</th><th>Bytes</th><th>Words</th></tr></thead><tbody>${cost.pages.map(row => `<tr><td><a href="${escape(row.path)}"${local === undefined ? '' : ' style="overflow-wrap:anywhere"'}>${escape(pageNames.get(row.path) ?? row.path)}</a></td><td>${row.depth}</td><td>${row.bytes}</td><td>${Object.values(row.wordsByReadingLevel).reduce((n, w) => n + w, 0) + row.unlabelledWords}</td></tr>`).join('')}</tbody></table>`
    + `<p>Measured from the rendered bytes by the evaluation harness's scanner. This page and size-report.json are not counted${local === undefined ? '' : ', and each page is measured without its review-status region and its glossary entries'}.</p></section>`, chrome));
  // The kept record, published byte for byte; none where no derived record is in force for this render.
  if (local?.derivedStructure?.state === 'derived') files.set(DERIVED_SITE_FILE, local.derivedStructure.recordText);
  if (local !== undefined) {
    // The machine channel of the same render: every claim it rendered with its label and page, the non-normative blocks, every
    // quotation with its anchor, the source anchors, the disclosure, the draft layer and the review-status region.
    files.set(LOCAL_MACHINE_VIEW, `${JSON.stringify({
      format: 'polaris-dossier-local-machine-view/1',
      title,
      draftLayer: local.draftLayer,
      disclosure: local.disclosure,
      reviewStatus: local.reviewStatus,
      ...(local.thesisBasis === undefined ? {} : { thesisBasis: { value: local.thesisBasis.value, declaredBy: 'the authoring session', label: 'Inferred', lineRendered: local.thesisBasis.lineRendered } }),
      ...(hero === undefined ? {} : { hero: { form: hero.form, diagram: !withheld && hero.form === 'figure' ? hero.diagram : null, rendered: heroRendered } }),
      ...(local.derivedStructure === undefined ? {} : { derivedStructure: derivedMachine(local.derivedStructure) }),
      ...(maps === undefined || mapFigures === undefined ? {} : { computedMaps: computedMapsMachine(maps.derived, maps.manifests, mapFigures) }),
      ...(testNames === undefined ? {} : { testNames: testNamesMachine(testNames.member) }),
      ...(roughEdges === undefined ? {} : { roughEdges: roughEdgesMachine(roughEdges.member) }),
      ...(docsAndCode === undefined ? {} : { docsAndCode: docsAndCodeMachine(docsAndCode.member) }),
      // Present only for a render holding a sequence or swimlane figure (version 2.5), so every other machine view keeps its bytes.
      ...(figureStructures.length === 0 ? {} : { figureStructures: [...figureStructures].sort((a, b) => a.index - b.index).map(({ entry }) => entry) }),
      // Present only for a schema-v9 draft (version 2.19): each graph edge as drawn, with its relation and witness state. A witnessed edge is
      // labelled `observed`, its text is Syzygy's words, and it is in no list of `claims`.
      ...(local.edgeRelations === undefined ? {} : { edges: [...relationEdges].sort((a, b) => a.index - b.index).map(({ entry }) => entry) }),
      // Present only for a schema-v12 draft (version 2.24): its model, each element and relationship once, with the views selecting it and,
      // for a relationship, the witness state a rule gave it at this render, null where no rule decides it.
      ...(local.model === undefined ? {} : { model: {
        elements: local.model.elements.map(e => ({ id: e.id, type: e.type, parent: e.parent, views: e.views })),
        relationships: local.model.relationships.map(r => ({ id: r.id, from: r.from, to: r.to, relation: r.relation, basis: r.basis, views: r.views, witness: local.edgeRelations?.get(r.id)?.witness ?? null })),
      } }),
      pages: [...pages.map(p => p.path), 'size-report.html'],
      claims: claimsByPage,
      nonNormative,
      glossaryShown,
      // The index-and-task-routes change: the task routes as drawn (each step is one of `claims`), and the generated index's names with every link.
      taskRoutes: (withheld ? [] : local.taskRoutes ?? []).map(route => ({ id: route.id, page: FIND_BY_TASK_PAGE, steps: route.steps.map(step => step.paragraph.id) })),
      nameIndex: { page: NAME_INDEX_PAGE, entries: nameIndex.length, links: indexLinkCount(nameIndex),
        names: nameIndex.map(entry => ({ kind: entry.kind, name: entry.name, home: entry.home === null ? null : { page: entry.home.page, fragment: entry.home.fragment }, blocks: entry.blocks.map(target => ({ page: target.page, fragment: target.fragment })), ...(entry.namedBy === undefined ? {} : { namedBy: entry.namedBy }) })) },
      quotations,
      sources: quotable.map(source => ({ sourceId: source.sourceId, page: sourcePaths.get(source.sourceId)!, anchor: local.sourceAnchors.get(source.sourceId)!, ...(source.redaction === undefined ? {} : { redaction: { redactionClass: source.redaction.redactionClass, withheldLines: source.redaction.withheldLines } }) })),
      localPages: localPages,
      ...(local.counts === undefined ? {} : { counts: local.counts }),
      ...(local.withheldElements === undefined || local.withheldElements.size === 0 ? {} : { withheldElements: Object.fromEntries(local.withheldElements) }),
    }, null, 2)}\n`);
  }
  return { files, manifest };
}

/** The laid-out width of an operator-agent figure, as `renderLocalDossier` draws it: what the `syzygy` CLI injects into the dossier
 * check step, which measures figure fit with it (syzygy-3efd.20). The layout reads identities and edges only, never labels, so a
 * withheld element's replaced label at render changes no width, and check's width depends on the draft's bytes alone. It throws for a
 * figure the site would not draw (one that is not inert), whose fit is then Unknown. */
export function figureLaidOutWidth(figure: Parameters<typeof renderDiagramSvg>[0]
  | ({ readonly kind: 'sequence' } & Parameters<typeof renderSequenceSvg>[0]) | ({ readonly kind: 'swimlane' } & Parameters<typeof renderSwimlaneSvg>[0])
  | { readonly kind: typeof CONTAINMENT_KIND; readonly groups: readonly ContainmentClaim[] }): number {
  if ('kind' in figure && figure.kind === CONTAINMENT_KIND) {
    assertInertSvg(renderContainmentSvg(figure.groups, 0, escape));
    return layoutContainment(figure.groups).width;
  }
  // A figure the site cannot draw inertly renders a notice, not a drawing, so it has no width to fit: throwing makes its fit Unknown.
  if ('kind' in figure && figure.kind === 'sequence') {
    assertInertSvg(renderSequenceSvg(figure, 0, escape));
    return layoutSequence(figure.participants, figure.messages).width;
  }
  if ('kind' in figure && figure.kind === 'swimlane') {
    assertInertSvg(renderSwimlaneSvg(figure, 0, escape));
    return layoutSwimlane(figure.lanes, figure.steps).width;
  }
  const graph = figure as Parameters<typeof renderDiagramSvg>[0];
  assertInertSvg(renderDiagramSvg(graph, 0, escape, READABLE_SPACING));
  return layoutDiagram(graph.nodes, graph.edges, READABLE_SPACING).width;
}

/** An operator-agent run's site: what the `syzygy` CLI injects into the dossier render step. */
export function renderLocalDossier(input: LocalDossierRenderInput): RenderedDossier {
  return renderDossierSite(input, localView(input.local));
}
/** The encoding half of the screening scope's render condition (version 7's text): every page writes each source byte through
 * `escape` and carries `DRAFT_PREVIEW_CSP_META` first in its head. `page-sink.test.ts` fails if either stops holding. */
renderLocalDossier.pageSinkContract = PAGE_SINK_CONTRACT;

/** A claim's dossier spec v1.5 machine attributes: the judgement mark, a withheld item's count of withheld sources, a mixed block's count
 * of withheld spans. */
interface ClaimMarks { readonly judgement?: 'uncited' | 'cited'; readonly withheldSources?: number; readonly withheldSpans?: number }

function blockMarks(block: LocalBlock): ClaimMarks {
  return {
    ...(block.judgement === undefined ? {} : { judgement: block.judgement }),
    ...(block.withheld === undefined ? {} : { withheldSources: block.withheld.sources }),
    ...(block.withheldSpans === undefined ? {} : { withheldSpans: block.withheldSpans }),
  };
}

function marksAttributes(marks: ClaimMarks): string {
  return `${marks.judgement === undefined ? '' : ` data-judgement="${marks.judgement}"`}${marks.withheldSources === undefined ? '' : ` data-withheld-sources="${marks.withheldSources}"`}${marks.withheldSpans === undefined ? '' : ` data-withheld-spans="${marks.withheldSpans}"`}`;
}

/** A withheld diagram element's words: the count, and the files Syzygy may name. */
function withheldWords(note: WithheldNote): string {
  const unnamed = note.sources - note.named.length;
  const names = [...note.named, ...(unnamed === 0 ? [] : [`${unnamed} not named, because a secret detector matches the path`])];
  return `(withheld from this dossier: it rests on ${note.sources} source file(s) that screening withholds: ${names.join('; ')})`;
}

/** How many Pole hues an operator-agent page has (syzygy-pdja.14); Poles past this many are neutral (syzygy-5dhm.56). */
const HUES = 6;

/** The appendix page (dossier spec v1.5). */
const APPENDIX = 'appendix.html';
/** The one entry, last in every operator-agent page's navigation, under which the run's own pages fold (syzygy-5dhm.136). */
export const ABOUT_THIS_RUN = 'About this run';

/** The provider mode's figure legend, whatever the figure draws. */
const FIXED_DIAGRAM_LEGEND = '<ul class="diagram-legend" aria-label="Line styles"><li><span class="legend-line observed" aria-hidden="true"></span>Solid: observed</li><li><span class="legend-line inferred" aria-hidden="true"></span>Dashed: inferred</li><li><span class="legend-line unknown" aria-hidden="true"></span>Dotted: unknown (label ends “?”)</li></ul>';
const LEGEND_ENTRIES: readonly (readonly [EpistemicMarking, string])[] = [
  ['observed', 'Solid: observed'], ['inferred', 'Dashed: inferred'], ['unknown', 'Dotted: unknown (label ends “?”)'],
];
const ORDER_LEGEND_ENTRY = '<li><span class="legend-line order" aria-hidden="true"></span>Thin grey arrow: step order, no claim</li>';
const counted = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** An operator-agent figure's legend: an entry for each line style the figure draws, in a fixed order, and never one it does not (RFC7-34
 * legends a used encoding); then one line counting its boxes and arrows by marking. Every count is Syzygy's, from the draft's own marks. */
export function figureLegend(markings: readonly EpistemicMarking[], boxes: number, arrows: number, how = 'as marked', head?: string, orderArrows = false): string {
  const count = (m: EpistemicMarking): number => markings.filter(x => x === m).length;
  const entries = LEGEND_ENTRIES.filter(([m]) => count(m) > 0).map(([m, words]) => `<li><span class="legend-line ${m}" aria-hidden="true"></span>${words}</li>`).join('')
    // A swimlane draws its step order in thin grey arrows that claim nothing (version 2.5): the legend names them too (RFC7-34).
    + (orderArrows ? ORDER_LEGEND_ENTRY : '');
  // A sequence or swimlane (version 2.5) names its own elements: `{P} participants and {M} messages` or `{L} lanes and {S} steps`.
  return `<ul class="diagram-legend" aria-label="Line styles">${entries}</ul><p class="diagram-tally">${head ?? `${counted(boxes, 'box', 'boxes')} and ${counted(arrows, 'arrow', 'arrows')}`}, ${how}: ${count('observed')} observed, ${count('inferred')} inferred, ${count('unknown')} unknown.</p>`;
}

/** A v7 figure kind's claims, participants or lanes then messages or steps; none for a graph figure. */
const figureElements = (d: DraftDiagram): readonly DraftFigureElement[] => d.figure === undefined ? []
  : d.figure.kind === CONTAINMENT_KIND ? containmentClaims(d.figure.groups) : d.figure.kind === 'sequence' ? [...d.figure.participants, ...d.figure.messages] : [...d.figure.lanes, ...d.figure.steps];

/** The style rules a page carries only where a sequence or swimlane figure renders its two forms (version 2.5), so every other page keeps
 * its bytes. The `figure-forms` box is a size container; it displays its drawing while it is at least the drawing's laid-out width W wide
 * and its phone form, a numbered list, while it is narrower, with no script. The list's text is the 13 px figure text, wrapped within the
 * box; each item's left border is solid, dashed or dotted by its mark, as the legend's line styles are. */
export const FIGURE_KINDS_CSS = `.figure-forms{container-type:inline-size}.figure-stepper{display:none;margin:${tokens.spacing.small} ${tokens.spacing.none};padding-left:${tokens.spacing.large};`
  + `font:${tokens.type.figureStepper}/${tokens.type.bodyLeading} var(--font-mono);overflow-wrap:anywhere}`
  + `.figure-stepper>li{border-left:${tokens.line.emphasis} solid var(--accent);padding:${tokens.spacing.stepInset} ${tokens.spacing.none} ${tokens.spacing.stepInset} ${tokens.spacing.mediumSmall};`
  + `margin:${tokens.spacing.none} ${tokens.spacing.none} ${tokens.spacing.compact}}.figure-stepper>li.inferred{border-left-style:dashed}.figure-stepper>li.unknown{border-left-style:dotted}`
  + `.stepper-head{display:block;font-weight:${tokens.type.strongWeight}}.figure-drawing rect.lane-band{fill:none;stroke:var(--line);stroke-dasharray:none}`
  + `.figure-drawing path.step-order{stroke:var(--muted);stroke-width:${tokens.line.svgHairline};stroke-dasharray:none}.figure-drawing marker.order-head path{fill:var(--muted)}`
  + `.legend-line.order{border-top:${tokens.line.hairline} solid var(--muted)}`
  + tokens.figureFormWidths.map(w => `@container (width < ${w}px){.figure-forms[data-figure-width="${w}"]>.figure-drawing{display:none}.figure-forms[data-figure-width="${w}"]>.figure-stepper{display:block}}`).join('');

/** A v11 containment's groups in preorder (version 2.23). */
const containmentClaims = (groups: readonly DraftContainmentGroup[]): DraftFigureElement[] => groups.flatMap(group => [group, ...containmentClaims(group.children)]);

/** The phone form of a containment (version 2.23): a nested list at the 13 px figure text, each nested list indented 12 px, each item drawn
 * with a left border solid, dashed or dotted by its mark, wrapping within its box. Carried only by a page that renders a containment's two
 * forms. */
export const CONTAINMENT_OUTLINE_CSS = `.figure-outline{display:none;margin:${tokens.spacing.small} ${tokens.spacing.none};padding-left:${tokens.spacing.none};list-style:none;`
  + `font:${tokens.type.figureStepper}/${tokens.type.bodyLeading} var(--font-mono);overflow-wrap:anywhere}.figure-outline ul{list-style:none;margin:${tokens.spacing.none};padding-left:${tokens.spacing.outlineIndent}}`
  + `.figure-outline li{border-left:${tokens.line.emphasis} solid var(--accent);padding:${tokens.spacing.stepInset} ${tokens.spacing.none} ${tokens.spacing.stepInset} ${tokens.spacing.mediumSmall};margin:${tokens.spacing.none} ${tokens.spacing.none} ${tokens.spacing.compact}}`
  + `.figure-outline li.inferred{border-left-style:dashed}.figure-outline li.unknown{border-left-style:dotted}`;
/** The queries that show a containment's drawing while its box is at least the drawing's laid-out width W wide and its outline while it is
 * narrower. A page with a containment and no sequence or swimlane carries the size container and these in place of `FIGURE_KINDS_CSS`, so it
 * carries none of the stepper's rules; a page with both carries `FIGURE_KINDS_CSS` and these too (a containment may be 224 px wide, a
 * width the stepper's queries never name). */
const CONTAINMENT_QUERY_CSS = tokens.containmentFormWidths.map(w => `@container (width < ${w}px){.figure-forms[data-figure-width="${w}"]>.figure-drawing{display:none}.figure-forms[data-figure-width="${w}"]>.figure-outline{display:block}}`).join('');
const FIGURE_FORMS_CSS = '.figure-forms{container-type:inline-size}';
/** The figure-kind style rules a page carries (versions 2.5 and 2.23): the stepper's where a sequence or swimlane renders its two forms,
 * the outline's where a containment does, and neither where none does, so a page without a containment keeps its bytes. */
export function figureKindsCss(stepper: boolean, containment: boolean): string {
  if (!containment) return stepper ? FIGURE_KINDS_CSS : '';
  return stepper ? `${FIGURE_KINDS_CSS}${CONTAINMENT_OUTLINE_CSS}${CONTAINMENT_QUERY_CSS}` : `${FIGURE_FORMS_CSS}${CONTAINMENT_OUTLINE_CSS}${CONTAINMENT_QUERY_CSS}`;
}

/** The subsection and on-page contents-list rules (version 2.16), carried only by a page that renders a subsection. Never sticky: sticky
 * styling stays scoped to the site navigation. */
export const SUBSECTION_CSS = `.subsection{margin:${tokens.spacing.section} ${tokens.spacing.none} ${tokens.spacing.none}}.subsection>h3{margin:${tokens.spacing.none} ${tokens.spacing.none} ${tokens.spacing.small};`
  + `font-size:${tokens.type.subsectionHeading}}.subsection-answer{font-weight:${tokens.type.strongWeight};margin:${tokens.spacing.none} ${tokens.spacing.none} ${tokens.spacing.medium}}`
  + `.page-contents{border:${tokens.line.hairline} solid var(--line);border-radius:${tokens.radius.card};padding:${tokens.spacing.small} ${tokens.spacing.standard};`
  + `margin:${tokens.spacing.none} ${tokens.spacing.none} ${tokens.spacing.section};font-size:${tokens.type.bodySmall}}`
  + `.page-contents-title{margin:${tokens.spacing.none} ${tokens.spacing.none} ${tokens.spacing.tight};font-weight:${tokens.type.strongWeight}}`
  + `.page-contents ol{margin:${tokens.spacing.tight} ${tokens.spacing.none};padding-left:${tokens.spacing.legendInset}}`;

/** The legend every narrative page carries once (REQ-polaris-generation-034, v1.5), with the control that opens the evidence view. The
 * control is a fragment link and a CSS rule, so it works with scripts off. */
const READING_LEGEND = '<aside class="reading-legend" aria-label="How to read this page"><p class="view-switch"><a href="#evidence-view">Show the evidence view</a> · <a href="#content">Back to the reading view</a></p><span id="evidence-view"></span><ul>'
  + '<li>A numbered mark, such as <span class="legend-sample">[1]</span>, cites a source; text with such a mark is the agent\'s reading of that source.</li>'
  + '<li>The mark <span class="judgement-mark">judgement</span> is the agent\'s own assessment.</li>'
  + '<li>The mark <span class="framing-mark">framing</span> makes no claim.</li>'
  + '<li>A set-off quotation is verified against the repository.</li>'
  + '<li><span class="not-established">Not established.</span> introduces an Unknown block, whose reason follows in words.</li>'
  + '<li><span class="legend-sample">†N</span> on a citation counts the N lines of that citation\'s file that screening withheld.</li>'
  + '</ul></aside>';

/** A block's RFC7-33 distinctions as the evidence view shows them: the same values its machine attributes carry. */
function evidenceNote(block: LocalBlock, kind: 'anchored' | 'labeled'): string {
  const parts = [`label ${MARKING_LABEL[block.marking as EpistemicMarking]}`, `claim-block kind ${kind}`];
  if (block.unknownReason !== null) parts.push(`reason ${block.unknownReason}`);
  if (block.judgement !== undefined) parts.push(`judgement, ${block.judgement}`);
  if (block.withheld !== undefined) parts.push(`${block.withheld.sources} withheld source file(s)`);
  if (block.withheldSpans !== undefined) parts.push(`${block.withheldSpans} withheld span(s)`);
  parts.push('editorial draft');
  return `Evidence: ${parts.join('; ')}.`;
}

/** Where a rendered site publishes the derived-structure record (version 2.3). */
const DERIVED_SITE_FILE = 'derived-structure.json';
/** How many top-level directories the derived figure draws; the list holds every listed one. */
const DERIVED_DRAWN = 12;

/** The region's words, chosen by state (version 2.10): the reason stays `missing-evidence` for both `missing` and `unusable`, and only the
 * words and the machine view's `state` tell nothing kept apart from something kept that this render cannot use or cannot examine. */
const unknownWords: Readonly<Record<'missing' | 'unusable' | 'unknown', string>> = {
  missing: 'no derived record was kept when this draft revision was checked',
  unusable: 'this draft revision\'s derived-record path holds something this render cannot use or cannot examine; Syzygy or its screen may have changed since the revision was checked, or the path may have been altered',
  unknown: 'the pinned tree could not be listed',
};

/** The derived-structure region (REQ-polaris-generation-034 version 2.3): the figure Syzygy computes from the kept record, never from the
 * draft, with its caption, note, drawing, legend and tally, and every fact in a collapsed list; or, with no record in force, the heading
 * and the Unknown sentence alone. Every value here is Syzygy's; every path is escaped text. */
export function renderDerivedRegion(derived: LocalDerivedStructure, mapsLine = false): string {
  const head = '<section id="derived-structure" data-reading-level="1" data-topics=""><h2>Derived by Syzygy: top-level directories</h2>';
  // Version 2.9: the region ends, inside it, with the line linking the computed maps wherever the render draws them.
  const end = `${mapsLine ? DERIVED_MAPS_LINE : ''}</section>`;
  if (derived.state !== 'derived') return `${head}${derivedUnknownSentence(derived)}${end}`;
  const record = `sha256:${derived.sha256}`;
  const files = (n: number): string => counted(n, 'file', 'files');
  const units = derived.facts.filter(fact => fact.fact === 'top-level-unit');
  const drawnUnits = [...units].sort((a, b) => (b.count ?? 0) - (a.count ?? 0) || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)).slice(0, DERIVED_DRAWN);
  const drawnIds = new Set(drawnUnits.map(fact => fact.id));
  const root = derived.facts.find(fact => fact.fact === 'tree-root')!;
  const arrows = derived.facts.filter(fact => fact.fact === 'contains' && fact.to !== null && drawnIds.has(fact.to));
  const nodes = [root, ...drawnUnits].map(fact => ({ id: fact.id, label: fact.fact === 'tree-root' ? 'Repository root' : `${fact.path}/ (${files(fact.count ?? 0)})`, epistemic: fact.epistemic }));
  const edges = arrows.map(fact => ({ id: fact.id, from: root.id, to: fact.to!, label: 'contains', epistemic: fact.epistemic }));
  const svg = renderDiagramSvg({ nodes, edges }, 'derived', escape, READABLE_SPACING, id => ` data-derived-id="${escape(id)}"`);
  assertInertSvg(svg);
  const notDrawn = units.length - drawnUnits.length;
  const notes = `${notDrawn === 0 ? '' : `<p class="derived-more">${notDrawn === 1 ? '1 more top-level directory is' : `${notDrawn} more top-level directories are`} listed below and not drawn.</p>`}`
    + `${derived.unitsNotListed === 0 ? '' : `<p class="derived-more">${derived.unitsNotListed === 1 ? '1 more top-level directory is' : `${derived.unitsNotListed} more top-level directories are`} counted and not listed.</p>`}`;
  const legend = figureLegend([...nodes, ...edges].map(element => element.epistemic), nodes.length, edges.length, 'derived by Syzygy');
  return `${head}<figure class="derived-figure" data-visual-provenance="computed" data-derived-record="${record}"><figcaption id="diagram-title-derived">Derived by Syzygy from the pinned tree</figcaption>`
    + `${derivedNote(derived)}<div class="diagram-scroll">${svg}</div>${notes}${legend}<details><summary>Read every derived fact</summary><ul class="derived-facts" id="diagram-text-derived">${derivedEntries(derived)}</ul></details></figure>${end}`;
}

/** The machine view's `derivedStructure` member: beside and outside `reviewStatus`. */
function derivedMachine(derived: LocalDerivedStructure): unknown {
  if (derived.state !== 'derived') return { file: null, sha256: null, revision: derived.revision, state: derived.state, currencyPolicy: null, facts: [] };
  return {
    file: DERIVED_SITE_FILE, sha256: derived.sha256, revision: derived.revision, state: derived.state, currencyPolicy: derived.currencyPolicy,
    facts: derived.facts.map(fact => ({ id: fact.id, fact: fact.fact, epistemic: fact.epistemic, unknownReason: fact.unknownReason, rule: fact.rule, ruleVersion: fact.ruleVersion, path: fact.path })),
  };
}

// --- Computed map pages (REQ-polaris-generation-034 version 2.9, syzygy-3efd.36) ---------------------------------------------------------
//
// Three pages Syzygy computes from the pinned tree alone: the directory map from the derived structure the region states, and the unit map
// and the CI pipeline map from the manifest facts the render derived itself. No draft member reaches them. Every map figure is laid out by
// the readable layout at most two columns wide and holds at most 25 boxes, so a large map is several figures, never one shrunk drawing; each
// has a drawing and a text form, of which a container size query on its `map-forms` box shows one, with no script.

/** The four map pages (the fourth since the infrastructure recognizers), their titles and their `data-map` names, in the order the region's line and the
 * contents page link them. */
export const COMPUTED_MAPS: readonly { readonly map: 'directories' | 'units' | 'ci' | 'infrastructure'; readonly path: string; readonly title: string }[] = [
  { map: 'directories', path: 'maps/directories.html', title: 'Directory map' },
  { map: 'units', path: 'maps/units.html', title: 'Unit map' },
  { map: 'ci', path: 'maps/ci.html', title: 'CI pipeline map' },
  { map: 'infrastructure', path: 'maps/infrastructure.html', title: 'Infrastructure map' },
];

/** The region's closing line: it links each map by its title. */
const MAP_PATHS: ReadonlySet<string> = new Set(COMPUTED_MAPS.map(m => m.path));
/** The legend each map page carries (version 2.9): the same view switch as a narrative page's, outside any `<details>`, so a sighted reader
 * can open the evidence view and read each entry's label (Observed, Inferred or Unknown) and evidence; with scripts off. */
export const MAP_READING_LEGEND = '<aside class="reading-legend" aria-label="How to read this page"><p class="view-switch"><a href="#evidence-view">Show the evidence view</a> · <a href="#content">Back to the reading view</a></p><span id="evidence-view"></span><ul>'
  + '<li><span class="derived-mark">Derived by Syzygy</span> marks a fact Syzygy derived from the tree or read from a manifest file; the evidence view shows its label, Observed, Inferred or Unknown, and where it comes from.</li>'
  + '<li>In a figure, a solid line is Observed, a dashed line Inferred and a dotted line Unknown; a label ending in ? is Unknown.</li>'
  + '<li><span class="not-established">Not established.</span> introduces an Unknown statement, whose reason follows in words.</li>'
  + '</ul></aside>';
export const DERIVED_MAPS_LINE = `<p class="derived-maps">Computed maps: ${COMPUTED_MAPS.map(m => `<a href="${m.path}">${m.title}</a>`).join(' · ')}.</p>`;

/** The readable spacing, never laid out in three columns: two lay out 648 px wide (two 24 px margins, two 200 px nodes, one 200 px gap),
 * and a map whose layers would lay out wider is stacked, a plain chain of three or more among them since syzygy-3efd.66. */
export const MAP_SPACING = { ...READABLE_SPACING, stackWiderThan: 648 } as const;
/** How many boxes a map drawing may hold, and how many directories, packages or modules one figure takes beside its place's box. */
export const MAP_MAX_BOXES = 25;
const MAP_CHUNK = 12;
const MAP_MAX_JOBS = 24;

/** The two forms' style rules, which only a map page carries; a page adds one container query for each W its figures take. */
export const MAP_FORMS_CSS = `.map-forms{container-type:inline-size}.map-list{display:none;margin:${tokens.spacing.small} ${tokens.spacing.none};padding-left:${tokens.spacing.large};`
  + `font:${tokens.type.figureStepper}/${tokens.type.bodyLeading} var(--font-mono);overflow-wrap:anywhere}`
  + `.map-list>li{border-left:${tokens.line.emphasis} solid var(--accent);padding:${tokens.spacing.stepInset} ${tokens.spacing.none} ${tokens.spacing.stepInset} ${tokens.spacing.mediumSmall};`
  + `margin:${tokens.spacing.none} ${tokens.spacing.none} ${tokens.spacing.compact}}.map-list>li.inferred{border-left-style:dashed}.map-list>li.unknown{border-left-style:dotted}`
  + `.map-head{font-weight:${tokens.type.strongWeight}}.map-coverage{font-size:${tokens.type.poleMap}}`;
export const mapWidthQuery = (width: number): string => `@container (width < ${width}px){.map-forms[data-figure-width="${width}"]>.map-drawing{display:none}.map-forms[data-figure-width="${width}"]>.map-list{display:block}}`;

type MapMarking = 'observed' | 'inferred' | 'unknown';
export interface MapBox { readonly id: string; readonly label: string; readonly epistemic: MapMarking; readonly attributes: string }
export interface MapArrow extends MapBox { readonly from: string; readonly to: string }

/** One map figure: caption, the two forms, legend and tally. Throws where it would hold more than `MAP_MAX_BOXES` boxes or is not inert. */
export function mapFigure(map: string, index: string, caption: string, boxes: readonly MapBox[], arrows: readonly MapArrow[]): { readonly html: string; readonly width: number } {
  if (boxes.length === 0 || boxes.length > MAP_MAX_BOXES) throw new DossierRenderError('not-renderable');
  const attributes = new Map([...boxes, ...arrows].map(element => [element.id, element.attributes]));
  const diagram = { nodes: boxes, edges: arrows };
  const svg = renderDiagramSvg(diagram, index, escape, MAP_SPACING, id => attributes.get(id) ?? '');
  assertInertSvg(svg);
  const width = layoutDiagram(boxes, arrows, MAP_SPACING).width;
  const shown = (element: MapBox): string => escape(`${element.label}${element.epistemic === 'unknown' ? ' ?' : ''}`);
  const byId = new Map(boxes.map(box => [box.id, box]));
  const touched = new Set(arrows.flatMap(arrow => [arrow.from, arrow.to]));
  const items = arrows.map(arrow => `<li class="${arrow.epistemic}"><span class="map-head">${shown(byId.get(arrow.from)!)}</span> ${shown(arrow)} ${shown(byId.get(arrow.to)!)}</li>`).join('')
    + boxes.filter(box => !touched.has(box.id)).map(box => `<li class="${box.epistemic}"><span class="map-head">${shown(box)}</span></li>`).join('');
  const legend = figureLegend([...boxes, ...arrows].map(element => element.epistemic), boxes.length, arrows.length, 'derived by Syzygy');
  return {
    width,
    html: `<figure class="computed-map" data-visual-provenance="computed" data-map="${map}"><figcaption id="diagram-title-${index}">${escape(caption)}</figcaption>`
      + `<div class="map-forms" data-figure-width="${width}"><div class="diagram-scroll map-drawing">${svg}</div><ol class="map-list" id="diagram-text-${index}">${items}</ol></div>${legend}</figure>`,
  };
}

const chunks = <T>(items: readonly T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};
const byCodeUnit = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** The sentence the region and the directory map state where no derived record is in force. */
function derivedUnknownSentence(derived: Extract<LocalDerivedStructure, { state: 'missing' | 'unusable' | 'unknown' }>): string {
  return `<p class="derived-unknown" data-epistemic="unknown" data-unknown-reason="${derived.unknownReason}"><span class="not-established">Not established.</span> The top-level directories of the tree at revision ${escape(derived.revision)} are Unknown at this render: ${unknownWords[derived.state]}.</p>`;
}
const derivedNote = (derived: Extract<LocalDerivedStructure, { state: 'derived' }>): string =>
  `<p class="derived-note">Derived by Syzygy from the paths and modes of the tree at revision ${escape(derived.recordRevision)}, listed at ${escape(derived.capturedAt)}, by rule top-level-unit version 1. No file body, size or object id was read. Current for that revision only.</p>`;
/** Each fact's entry, as the region's list and the directory map's list both hold it. */
function derivedEntries(derived: Extract<LocalDerivedStructure, { state: 'derived' }>): string {
  const record = `sha256:${derived.sha256}`;
  const files = (n: number): string => counted(n, 'file', 'files');
  const said = (fact: LocalDerivedFact): string => fact.fact === 'tree-root' ? `Repository root: ${files(fact.count ?? 0)} at the root.`
    : fact.fact === 'top-level-unit' ? `${fact.path}/: ${files(fact.count ?? 0)}.` : `Repository root contains ${fact.path}/.`;
  const evidence = (fact: LocalDerivedFact): string => fact.epistemic === 'observed'
    ? `Evidence: label Observed; derived by Syzygy by rule ${fact.rule} version ${fact.ruleVersion}; source path ${fact.path}; record ${record}; current for revision ${derived.recordRevision}.`
    : `Evidence: label Unknown; reason ${fact.unknownReason}; derived by Syzygy by rule ${fact.rule} version ${fact.ruleVersion}; source path ${fact.path}; record ${record}.`;
  return derived.facts.map(fact => `<li data-derived-id="${escape(fact.id)}" data-derived-fact="${fact.fact}" data-epistemic="${fact.epistemic}"${fact.unknownReason === null ? '' : ` data-unknown-reason="${fact.unknownReason}"`}`
    + ` data-derived-rule="${escape(fact.rule)}" data-derived-rule-version="${fact.ruleVersion}" data-derived-path="${escape(fact.path)}" data-derived-record="${record}" data-derived-revision="${escape(derived.recordRevision)}">`
    + `${escape(said(fact))} <span class="derived-mark">Derived by Syzygy</span><span class="visually-hidden ev"> ${escape(evidence(fact))}</span></li>`).join('');
}

const derivedIdAttributes = (fact: LocalDerivedFact): string => ` data-derived-id="${escape(fact.id)}"${fact.unknownReason === null ? '' : ` data-unknown-reason="${fact.unknownReason}"`}`;

/** What one map page holds: its main content, the widths its figures take, and how many figures it has. */
interface MapPage { readonly main: string; readonly widths: readonly number[]; readonly figures: number }
const mapSection = (map: string, title: string, body: string): string => `<section id="computed-map" data-map="${map}" data-reading-level="1" data-topics=""><h1>${escape(title)}</h1>${body}</section>`;

/** The directory map: the derived structure the region states, with the coverage the render re-derives from the tree, and after it the
 * render's member's coverage remainder (infrastructure recognizers), which rests on the member alone. */
export function directoryMap(derived: LocalDerivedStructure, member: LocalManifestFacts): MapPage {
  const remainder = coverageRemainder(member, derived.revision);
  if (derived.state !== 'derived') return { main: `${mapSection('directories', 'Directory map', derivedUnknownSentence(derived))}${remainder}`, widths: [], figures: 0 };
  const t = derived.tree;
  const root = derived.facts.find(fact => fact.fact === 'tree-root')!;
  const notListedFiles = t.files - t.rootFiles - t.unitFiles - t.secretPathsLeftOut;
  const mark = derived.countsMatch
    ? ` data-epistemic="${root.epistemic}"${root.unknownReason === null ? '' : ` data-unknown-reason="${root.unknownReason}"`}`
    : ' data-epistemic="unknown" data-unknown-reason="stale-beyond-currency-bound"';
  const coverage = `<p class="map-coverage"${mark}>Coverage: ${counted(t.files, 'file', 'files')} in the tree at that revision: ${t.rootFiles} at the root; `
    + `${t.unitFiles} under the ${counted(t.unitsListed, 'top-level directory', 'top-level directories')} listed here; `
    + `${notListedFiles} under ${counted(t.unitsNotListed, 'more top-level directory', 'more top-level directories')} counted and not listed; `
    + `${t.secretPathsLeftOut} left out and not named, because a secret detector matches their path; and ${counted(t.submodules, 'submodule', 'submodules')}, not followed. `
    + 'Directories below the top level are not mapped: no rule of this version derives them.'
    + `${derived.countsMatch ? '' : ' The derived record\'s counts differ from the tree\'s at this revision.'}</p>`;
  const units = derived.facts.filter(fact => fact.fact === 'top-level-unit');
  const contains = new Map(derived.facts.filter(fact => fact.fact === 'contains' && fact.to !== null).map(fact => [fact.to!, fact]));
  const rootBox: MapBox = { id: root.id, label: 'Repository root', epistemic: root.epistemic, attributes: derivedIdAttributes(root) };
  const figures = chunks(units, MAP_CHUNK).map((chunk, k) => {
    const boxes: MapBox[] = [rootBox, ...chunk.map(fact => ({ id: fact.id, label: `${fact.path}/ (${counted(fact.count ?? 0, 'file', 'files')})`, epistemic: fact.epistemic, attributes: derivedIdAttributes(fact) }))];
    const arrows: MapArrow[] = chunk.flatMap(fact => {
      const arrow = contains.get(fact.id);
      return arrow === undefined ? [] : [{ id: arrow.id, from: root.id, to: fact.id, label: 'contains', epistemic: arrow.epistemic, attributes: derivedIdAttributes(arrow) }];
    });
    return mapFigure('directories', `map-directories-${k + 1}`, `Top-level directories ${k * MAP_CHUNK + 1} to ${k * MAP_CHUNK + chunk.length} of ${units.length}, by path`, boxes, arrows);
  });
  return {
    main: `${mapSection('directories', 'Directory map', `${derivedNote(derived)}${coverage}${figures.map(f => f.html).join('')}<h2>Every derived fact</h2><ul class="derived-facts">${derivedEntries(derived)}</ul>`)}${remainder}`,
    widths: figures.map(f => f.width), figures: figures.length,
  };
}

/** `<rules>` in words: separated by commas, the last by ` and `. */
const ruleList = (rules: readonly string[]): string => (rules.length <= 1 ? rules.join('') : `${rules.slice(0, -1).join(', ')} and ${rules[rules.length - 1]}`);

/** The directory map page's `coverage-remainder` section (infrastructure recognizers): what no rule read for facts, as the render's member counts it. Its
 * items carry no epistemic mark: they are Syzygy's counts of what its rules claimed, never claims about the files counted. */
function coverageRemainder(member: LocalManifestFacts, revision: string): string {
  const open = '<section id="coverage-remainder" data-reading-level="1" data-topics=""><h2>What no rule read for facts</h2>';
  if (member.state !== 'derived') {
    return `${open}<p class="derived-unknown" data-epistemic="unknown" data-unknown-reason="source-uncaptured-or-unreachable"><span class="not-established">Not established.</span> ${escape(`Which files at revision ${revision} no rule read for facts is Unknown at this render: the pinned tree could not be listed.`)}</p></section>`;
  }
  const r = member.remainder;
  const line = `Files in the tree at revision ${revision}: ${r.files}. Candidates of a manifest or infrastructure rule, counted on the unit, CI pipeline and infrastructure maps whether read or not: ${r.candidates}. `
    + `Left out and not named, because a secret detector matches their path: ${r.secretPathsLeftOut}. Candidates of no rule, from which Syzygy took no declared fact, whatever they hold: ${r.notCandidates}. `
    + `The rules are ${ruleList(member.recognizers.map(entry => entry.rule))}, each at version 1.`;
  const items = r.places.map(place => (place.place === null
    ? `<li data-remainder-place=".">${escape(`Repository root: files ${place.files}; candidates of no rule ${place.notCandidates}.`)}</li>`
    : `<li data-remainder-place="${escape(place.place)}">${escape(`${place.place}/: files ${place.files}; candidates of no rule ${place.notCandidates}.`)}</li>`)).join('')
    + (r.placesNotListed === 0 ? '' : `<li>${escape(`More top-level directories, counted and not listed: ${r.placesNotListed}; their files ${r.filesInPlacesNotListed}; candidates of no rule among them ${r.notCandidatesInPlacesNotListed}.`)}</li>`);
  return `${open}<p class="map-coverage" data-epistemic="inferred">${escape(line)}</p><ul class="map-remainder">${items}</ul></section>`;
}

/** The four package recognizers the unit map reads, the one the CI pipeline map reads, and the five the infrastructure map reads. */
export const UNIT_MAP_RULES: readonly string[] = ['npm-package-manifest', 'cargo-manifest', 'python-project-manifest', 'go-module-manifest'];
export const CI_MAP_RULES: readonly string[] = ['github-actions-workflow'];
export const INFRA_MAP_RULES: readonly string[] = ['compose-file', 'kubernetes-manifest', 'terraform-configuration', 'makefile', 'cmake-lists'];

/** RFC2-24's reason for each file `unknownReason`. */
const MANIFEST_UNKNOWN_REASON: Readonly<Record<string, string>> = {
  'denied-path': 'excluded-content', 'unknown-extraction-class': 'excluded-content', 'not-utf8-text': 'excluded-content', 'secret-detector-match': 'excluded-content',
  'active-content': 'excluded-content', 'redacted-body': 'excluded-content', 'class-not-consented': 'unconsented-source-or-provider',
  'object-read-refused': 'source-uncaptured-or-unreachable', 'path-not-citable': 'mapping-coverage-absent', 'symbolic-link': 'mapping-coverage-absent',
  'over-read-limit': 'mapping-coverage-absent', 'too-large': 'mapping-coverage-absent', unparsed: 'mapping-coverage-absent',
};

/** A file's RFC2-24 reason; a file reason this version does not name refuses the render rather than taking a reason it may not have. */
function manifestUnknownReason(file: LocalManifestFileEntry): string {
  const key = file.unknownReason ?? '';
  if (!Object.hasOwn(MANIFEST_UNKNOWN_REASON, key)) throw new DossierRenderError('not-renderable');
  return MANIFEST_UNKNOWN_REASON[key]!;
}

const value = (fact: LocalManifestFact, member: string): string => { const v = fact[member]; return typeof v === 'string' ? v : ''; };
/** A fact in Syzygy's words. */
function factWords(fact: LocalManifestFact, jobs?: ReadonlySet<string>): string {
  switch (fact.fact) {
    case 'package': return `Package ${value(fact, 'name')}.`;
    case 'module': return `Module ${value(fact, 'name')}.`;
    case 'workspace-member': return `Workspace member pattern ${value(fact, 'pattern')}.`;
    case 'dependency': return `Declares a dependency named ${value(fact, 'name')} in ${value(fact, 'section')}${typeof fact['group'] === 'string' ? ` (${fact['group']})` : ''}.`;
    case 'workflow': return typeof fact['name'] === 'string' ? `Workflow ${fact['name']}.` : 'Workflow with no name.';
    case 'workflow-trigger': return `Triggered by ${value(fact, 'event')}.`;
    case 'job': return `Job ${value(fact, 'job')}.`;
    case 'job-needs': return jobs !== undefined && !jobs.has(value(fact, 'to'))
      ? `Job ${value(fact, 'from')} needs ${value(fact, 'to')}, which names no job of this file.` : `Job ${value(fact, 'from')} needs ${value(fact, 'to')}.`;
    // The infrastructure recognizers.
    case 'service': return `Service ${value(fact, 'service')}.`;
    case 'service-image': return `Service ${value(fact, 'service')} names image ${value(fact, 'image')}.`;
    case 'service-port': return `Service ${value(fact, 'service')} declares port ${value(fact, 'port')}.`;
    case 'service-depends-on': return `Service ${value(fact, 'from')} depends on ${value(fact, 'to')}.`;
    case 'kubernetes-object': return typeof fact['name'] === 'string'
      ? `Kubernetes object of kind ${value(fact, 'kind')} named ${fact['name']}.` : `Kubernetes object of kind ${value(fact, 'kind')} with no name.`;
    case 'terraform-resource': return `Terraform resource ${value(fact, 'type')} named ${value(fact, 'name')}.`;
    case 'terraform-module': return `Terraform module ${value(fact, 'name')} from source ${value(fact, 'source')}.`;
    case 'make-target': return `Make target ${value(fact, 'target')}.`;
    case 'cmake-project': return `CMake project ${value(fact, 'name')}.`;
    case 'cmake-target': return `CMake ${value(fact, 'targetKind')} target ${value(fact, 'target')}.`;
    default: throw new DossierRenderError('not-renderable');
  }
}

/** A declared fact's list entry: its words, `Derived by Syzygy`, and its evidence in the DOM text, clipped in the reading view. */
function factEntry(fact: LocalManifestFact, revision: string, jobs?: ReadonlySet<string>): string {
  const [first, last] = fact.lines;
  return `<li data-manifest-id="${escape(fact.id)}" data-manifest-fact="${escape(fact.fact)}" data-epistemic="inferred" data-manifest-rule="${escape(fact.rule)}" data-manifest-rule-version="${fact.ruleVersion}" data-manifest-path="${escape(fact.path)}" data-manifest-lines="${first}-${last}">`
    + `${escape(factWords(fact, jobs))} <span class="derived-mark">Derived by Syzygy</span><span class="visually-hidden ev"> ${escape(`Evidence: label Inferred; declared in ${fact.path}, lines ${first} to ${last}; read by Syzygy by rule ${fact.rule} version ${fact.ruleVersion} at revision ${revision}.`)}</span></li>`;
}

const manifestUnknown = (revision: string, files = 'manifest files'): string => `<p class="derived-unknown" data-epistemic="unknown" data-unknown-reason="source-uncaptured-or-unreachable"><span class="not-established">Not established.</span> What the ${files} at revision ${escape(revision)} declare is Unknown at this render: the pinned tree could not be listed.</p>`;

type DerivedManifests = Extract<LocalManifestFacts, { state: 'derived' }>;
const recognizersOf = (member: DerivedManifests, rules: readonly string[]): readonly LocalManifestRecognizerEntry[] => member.recognizers.filter(r => rules.includes(r.rule));

/** A manifest map's note, coverage line (with `ending` appended) and closing list of Unknown files, around its own body. */
function manifestPage(map: 'units' | 'ci' | 'infrastructure', title: string, member: DerivedManifests, revision: string, rules: readonly string[], ruleWords: string, ending: string, body: string): string {
  const recognizers = recognizersOf(member, rules);
  const files = map === 'infrastructure' ? 'infrastructure files' : 'manifest files';
  const note = `<p class="map-note">Computed by Syzygy at this render from the ${files} of the tree at revision ${escape(revision)} that the bound screening policy ${escape(member.screeningPolicy.policyId)} ${escape(member.screeningPolicy.policyVersion)} admits, read by rule ${ruleWords}, each at version 1. That revision fixes every input, so the map holds as of that revision at any instant. What a file declares, never what runs.</p>`;
  const clauses = [
    ...recognizers.map(r => `${r.rule}: ${counted(r.candidates, 'candidate file', 'candidate files')}; ${r.inferred} read for facts, ${r.unknown} Unknown with no facts taken; ${r.secretPathsLeftOut} left out and not named, because a secret detector matches their path; ${r.setApart} set apart as vendored, generated or test paths; ${counted(r.valuesLeftOut, 'value', 'values')} left out by the value checks; ${counted(r.facts, 'fact', 'facts')}.`),
    ...recognizers.filter(r => r.filesNotListed !== 0).map(r => r.filesNotListed === 1 ? `1 file of ${r.rule} is counted and not listed.` : `${r.filesNotListed} files of ${r.rule} are counted and not listed.`),
    ...(member.factsNotListed === 0 ? [] : [member.factsNotListed === 1 ? '1 fact of the manifest files is counted and not listed, so a figure or list may lack it.' : `${member.factsNotListed} facts of the manifest files are counted and not listed, so a figure or list may lack them.`]),
    ...(ending === '' ? [] : [ending]),
  ];
  const coverage = `<p class="map-coverage" data-epistemic="inferred">${escape(clauses.join(' '))}</p>`;
  const unknownFiles = recognizers.flatMap(r => r.files.filter(file => file.epistemic === 'unknown'));
  const word = (file: LocalManifestFileEntry): string => `${file.unknownReason ?? ''}${file.unknownReason === 'unparsed' && file.parseFault !== null ? `, ${file.parseFault}` : ''}`;
  // Version 2.11: a recognizer's `unknown` counts every Unknown file, listed or not, so the
  // difference from the Unknown entries it lists is the exact count of Unknown files left unlisted.
  const unknownNotListed = recognizers.reduce((sum, r) => sum + r.unknown - r.files.filter(file => file.epistemic === 'unknown').length, 0);
  const listed = unknownFiles.map(file => `<li data-epistemic="unknown" data-unknown-reason="${manifestUnknownReason(file)}" data-manifest-path="${escape(file.path)}" data-manifest-file-reason="${escape(word(file))}">${escape(`${file.path}: Unknown, no facts taken (${word(file)}).`)}</li>`).join('');
  const remainder = unknownNotListed > 0
    ? `<li>${unknownNotListed === 1 ? '1 file whose facts are Unknown is counted and not listed.' : `${unknownNotListed} files whose facts are Unknown are counted and not listed.`}</li>`
    : '';
  const unknownList = listed !== '' || remainder !== ''
    ? `${listed}${remainder}`
    : `<li>${recognizers.every(r => r.candidates === 0) ? 'No candidate file.' : 'Every candidate file not left out or set apart was read for facts.'}</li>`;
  return mapSection(map, title, `${note}${coverage}${body}<h2>Files whose facts are Unknown</h2><ul class="map-unknown-files">${unknownList}</ul>`);
}

const PLACES_SENTENCE = 'Places are path-derived: each package or module sits under the top-level directory its manifest\'s path begins with, and may move on refactor. Arrows between packages are not drawn: no rule of this version states that a dependency names a package of this tree.';

/** The unit map: each listed `package` and `module` fact placed in the root or the top-level directory its path begins with. */
export function unitMap(member: LocalManifestFacts, derived: LocalDerivedStructure): MapPage {
  const revision = derived.revision;
  if (member.state !== 'derived') return { main: mapSection('units', 'Unit map', manifestUnknown(revision)), widths: [], figures: 0 };
  const facts = member.facts.filter(fact => UNIT_MAP_RULES.includes(fact.rule));
  const placed = facts.filter(fact => fact.fact === 'package' || fact.fact === 'module');
  const placeOf = (fact: LocalManifestFact): string => (fact.path.includes('/') ? fact.path.slice(0, fact.path.indexOf('/')) : '');
  const places = [...new Set(placed.map(placeOf))].sort((a, b) => (a === '' ? -1 : b === '' ? 1 : byCodeUnit(a, b)));
  const figures = places.flatMap((place, p) => {
    const here = placed.filter(fact => placeOf(fact) === place);
    const name = place === '' ? 'Repository root' : `${place}/`;
    const derivedFact = derived.state !== 'derived' ? undefined
      : derived.facts.find(fact => (place === '' ? fact.fact === 'tree-root' : fact.fact === 'top-level-unit' && fact.path === place));
    const placeBox: MapBox = derivedFact === undefined
      ? { id: 'map-place', label: name, epistemic: 'unknown', attributes: ' data-unknown-reason="missing-evidence"' }
      : { id: derivedFact.id, label: name, epistemic: derivedFact.epistemic, attributes: derivedIdAttributes(derivedFact) };
    return chunks(here, MAP_CHUNK).map((chunk, k) => mapFigure('units', `map-units-${p + 1}-${k + 1}`,
      `${name}: packages and modules ${k * MAP_CHUNK + 1} to ${k * MAP_CHUNK + chunk.length} of ${here.length}, as their manifests declare, placed by path`,
      [placeBox, ...chunk.map(fact => ({ id: fact.id, label: value(fact, 'name'), epistemic: 'inferred' as const, attributes: ` data-manifest-id="${escape(fact.id)}"` }))],
      chunk.map(fact => ({ id: `${fact.id}/declares`, from: placeBox.id, to: fact.id, label: 'declares', epistemic: 'inferred' as const, attributes: ` data-manifest-id="${escape(fact.id)}"` }))));
  });
  const files = recognizersOf(member, UNIT_MAP_RULES).flatMap(r => r.files.filter(file => file.epistemic === 'inferred').map(file => ({ rule: r.rule, file })));
  const list = files.map(({ rule, file }) => {
    const own = facts.filter(fact => fact.rule === rule && fact.path === file.path);
    return file.facts === 0
      ? `<li data-manifest-path="${escape(file.path)}" data-epistemic="inferred">${escape(`${file.path}: no fact of the fields read.`)}</li>`
      : `<li data-manifest-path="${escape(file.path)}" data-epistemic="inferred">${escape(`${file.path}: ${counted(file.facts ?? 0, 'fact', 'facts')}.`)}<ul>${own.map(fact => factEntry(fact, revision)).join('')}</ul></li>`;
  }).join('');
  const body = `${figures.map(f => f.html).join('')}<h2>Every declared fact</h2><ul class="map-facts">${list}</ul>`;
  return {
    main: manifestPage('units', 'Unit map', member, revision, UNIT_MAP_RULES, 'npm-package-manifest, cargo-manifest, python-project-manifest and go-module-manifest', PLACES_SENTENCE, body),
    widths: figures.map(f => f.width), figures: figures.length,
  };
}

/** The CI pipeline map: for each workflow file read for facts, its name and triggers, a figure of its jobs and what each needs, and its list. */
export function ciMap(member: LocalManifestFacts, derived: LocalDerivedStructure): MapPage {
  const revision = derived.revision;
  if (member.state !== 'derived') return { main: mapSection('ci', 'CI pipeline map', manifestUnknown(revision)), widths: [], figures: 0 };
  const facts = member.facts.filter(fact => CI_MAP_RULES.includes(fact.rule));
  const widths: number[] = [];
  const files = recognizersOf(member, CI_MAP_RULES).flatMap(r => r.files.filter(file => file.epistemic === 'inferred').map(file => ({ rule: r.rule, file })));
  const body = files.map(({ rule, file }, w) => {
    const own = facts.filter(fact => fact.rule === rule && fact.path === file.path);
    const workflow = own.filter(fact => fact.fact === 'workflow');
    const triggers = own.filter(fact => fact.fact === 'workflow-trigger');
    const jobs = own.filter(fact => fact.fact === 'job');
    const jobNames = new Set(jobs.map(fact => value(fact, 'job')));
    const listed = own.filter(fact => fact.fact === 'job' || fact.fact === 'job-needs');
    const head = `<h2>${escape(file.path)}</h2><ul class="map-workflow">${workflow.map(fact => factEntry(fact, revision)).join('')}${triggers.length === 0 ? '<li>No trigger is declared.</li>' : triggers.map(fact => factEntry(fact, revision)).join('')}</ul>`;
    let figure = '';
    if (jobs.length > MAP_MAX_JOBS) figure = `<p class="map-note">${jobs.length} jobs are declared: too many to draw in one figure, so they are listed below.</p>`;
    else if (jobs.length > 0) {
      const boxOf = new Map<string, string>();
      for (const job of jobs) if (!boxOf.has(value(job, 'job'))) boxOf.set(value(job, 'job'), job.id);
      const arrows: MapArrow[] = own.filter(fact => fact.fact === 'job-needs' && boxOf.has(value(fact, 'to')) && boxOf.has(value(fact, 'from')))
        .map(fact => ({ id: fact.id, from: boxOf.get(value(fact, 'from'))!, to: boxOf.get(value(fact, 'to'))!, label: 'needs', epistemic: 'inferred', attributes: ` data-manifest-id="${escape(fact.id)}"` }));
      const drawn = mapFigure('ci', `map-ci-${w + 1}`, `${file.path}: jobs and what each needs, as declared`,
        jobs.map(job => ({ id: job.id, label: value(job, 'job'), epistemic: 'inferred', attributes: ` data-manifest-id="${escape(job.id)}"` })), arrows);
      widths.push(drawn.width);
      figure = drawn.html;
    }
    const list = listed.length === 0 ? '' : `<ul class="map-facts">${listed.map(fact => factEntry(fact, revision, jobNames)).join('')}</ul>`;
    return `${head}${figure}${list}`;
  }).join('');
  return { main: manifestPage('ci', 'CI pipeline map', member, revision, CI_MAP_RULES, 'github-actions-workflow', '', body), widths, figures: widths.length };
}

/** The infrastructure map (infrastructure recognizers): the facts and file entries of the five infrastructure recognizers, rested on the render's member
 * as the unit map and the CI pipeline map rest on it, with no figure. */
export function infrastructureMap(member: LocalManifestFacts, derived: LocalDerivedStructure): MapPage {
  const revision = derived.revision;
  if (member.state !== 'derived') return { main: mapSection('infrastructure', 'Infrastructure map', manifestUnknown(revision, 'infrastructure files')), widths: [], figures: 0 };
  const facts = member.facts.filter(fact => INFRA_MAP_RULES.includes(fact.rule));
  const files = recognizersOf(member, INFRA_MAP_RULES).flatMap(r => r.files.filter(file => file.epistemic === 'inferred').map(file => ({ rule: r.rule, file })));
  const list = files.map(({ rule, file }) => {
    const own = facts.filter(fact => fact.rule === rule && fact.path === file.path);
    return file.facts === 0
      ? `<li data-manifest-path="${escape(file.path)}" data-epistemic="inferred">${escape(`${file.path}: no fact of the fields read.`)}</li>`
      : `<li data-manifest-path="${escape(file.path)}" data-epistemic="inferred">${escape(`${file.path}: ${counted(file.facts ?? 0, 'fact', 'facts')}.`)}<ul>${own.map(fact => factEntry(fact, revision)).join('')}</ul></li>`;
  }).join('');
  const body = `<h2>Every declared fact</h2><ul class="map-facts">${list}</ul>`;
  return {
    main: manifestPage('infrastructure', 'Infrastructure map', member, revision, INFRA_MAP_RULES, ruleList(INFRA_MAP_RULES), 'No figure is drawn: no rule of this version draws one from these facts.', body),
    widths: [], figures: 0,
  };
}

/** `machine.json`'s `computedMaps` member: beside `derivedStructure` and outside `reviewStatus`. */
export function computedMapsMachine(derived: LocalDerivedStructure, member: LocalManifestFacts, figures: { readonly directories: number; readonly units: number; readonly ci: number; readonly infrastructure: number }): unknown {
  const derivedMember = member.state === 'derived' ? member : undefined;
  const of = (rules: readonly string[]): unknown => ({
    facts: derivedMember === undefined ? [] : derivedMember.facts.filter(fact => rules.includes(fact.rule)),
    files: derivedMember === undefined ? [] : recognizersOf(derivedMember, rules).flatMap(r => r.files),
  });
  return {
    pages: COMPUTED_MAPS.map(m => m.path),
    directories: { state: derived.state, figures: figures.directories },
    manifests: {
      state: member.state,
      screeningPolicy: derivedMember === undefined ? null : derivedMember.screeningPolicy,
      recognizers: derivedMember === undefined ? [] : derivedMember.recognizers.map(({ files: _files, ...rest }) => rest),
      factsNotListed: derivedMember === undefined ? null : derivedMember.factsNotListed,
      remainder: derivedMember === undefined ? null : derivedMember.remainder,
    },
    units: { figures: figures.units, ...(of(UNIT_MAP_RULES) as object) },
    ci: { figures: figures.ci, ...(of(CI_MAP_RULES) as object) },
    infrastructure: { figures: figures.infrastructure, ...(of(INFRA_MAP_RULES) as object) },
  };
}
