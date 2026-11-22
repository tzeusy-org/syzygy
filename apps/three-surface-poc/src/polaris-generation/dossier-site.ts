import { DESIGN_TOKENS_CSS } from '../design-tokens.js';

import {
  DOSSIER_FORMAT, OWNER_TOPICS, PAGE_SINK_CONTRACT, checkDraftQuotes, diagramToMermaid, figureToMermaid, isDossierPagePath, parseDossierManifest, readerCost, reviewVerdict, scanDossierPage, sourceTextById, withoutReviewStatusRegion,
  generationSpanRange, validateGenerationSources,
  type DossierDraft, type DossierManifest, type DraftBlock, type DraftDiagram, type DraftElement, type DraftFigure, type DraftFigureElement, type DraftParagraph, type EpistemicMarking, type GenerationSource, type LocalPageItem,
  type LocalBlock, type LocalDerivedFact, type LocalDerivedStructure, type LocalManifestFact, type LocalManifestFacts, type LocalManifestFileEntry, type LocalManifestRecognizerEntry, type LocalRenderInput, type LocalSegment, type OwnerTopic, type QuoteFinding, type WithheldNote,
} from '@syzygy/polaris-generation-core/live';
import { sha256 } from '@syzygy/support';
import { READABLE_SPACING, layoutDiagram, layoutSequence, layoutSwimlane, renderDiagramSvg, renderSequenceSvg, renderSwimlaneSvg } from './diagram-layout.js';
import { LOCAL_CSS, LOCAL_MACHINE_VIEW, anchorAttributes, anchorDetails, disclosureList, regionMarkup } from './dossier-render-local.js';
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
  + 'table{border-collapse:collapse;margin:1rem 0;background:var(--panel)}th,td{border:1px solid var(--line);padding:.4rem .6rem;text-align:left;vertical-align:top}th{background:var(--panel-raised)}'
  // v1.3 rich elements (syzygy-mea.10.5). Each tone names itself in visible text, so colour is never the only signal.
  + '.visually-hidden{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}'
  + '.table-scroll{overflow-x:auto;margin:1.25rem 0}.table-scroll table{margin:0;min-width:60%}caption{caption-side:top;text-align:left;font-weight:600;padding:0 0 .4rem}'
  + 'tbody tr:nth-child(even) td{background:var(--d-surface-2)}'
  + '.callout{border:1px solid var(--line);border-left:4px solid var(--c);background:var(--t);border-radius:10px;padding:.75rem 1rem;margin:1.25rem 0}'
  + '.callout-note{--c:var(--proposed);--t:var(--d-info-tint)}.callout-tip{--c:var(--observed);--t:var(--d-ok-tint)}'
  + '.callout-caution{--c:var(--amber);--t:var(--d-warn-tint)}.callout-important{--c:var(--cyan);--t:var(--d-accent-tint)}'
  + '.callout-title{margin:0 0 .4rem;font-weight:600}.callout-tone{color:var(--c);text-transform:uppercase;letter-spacing:.06em;font-size:.78em;margin-right:.35em}'
  + 'ol.steps{counter-reset:step;list-style:none;padding:0;margin:1.25rem 0}ol.steps>li{counter-increment:step;position:relative;padding:.1rem 0 .9rem 2.6rem;border-left:2px solid var(--line);margin-left:.9rem}'
  + 'ol.steps>li::before{content:counter(step);position:absolute;left:-.95rem;top:0;width:1.8rem;height:1.8rem;border-radius:50%;background:var(--panel-raised);border:1px solid var(--cyan);color:var(--ink);font:600 .85rem/1.8rem var(--font-mono);text-align:center}'
  + 'ol.steps>li:last-child{border-left-color:transparent}'
  + 'dl.definitions{display:grid;grid-template-columns:minmax(8rem,max-content) 1fr;gap:.5rem 1.25rem;margin:1.25rem 0}dl.definitions dt{font-weight:600}dl.definitions dd{margin:0}'
  + '@media (max-width:40rem){dl.definitions{grid-template-columns:1fr}dl.definitions dd{margin:0 0 .5rem}}'
  + 'ul.cards{list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(13rem,1fr));gap:.9rem;margin:1.25rem 0}'
  + 'li.card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:.85rem 1rem}.card-label{margin:0 0 .35rem;font-weight:600;color:var(--cyan)}'
  + 'details.details{border:1px solid var(--line);border-radius:10px;padding:.5rem 1rem;margin:1.25rem 0;background:var(--panel)}details.details>summary{cursor:pointer;font-weight:600}'
  + 'details.details>summary:focus-visible{outline:2px solid var(--focus);outline-offset:2px}.details-unknown{color:var(--unknown);font-weight:600}'
  + 'td.empty-cell,th.empty-cell{color:var(--muted);font-style:italic}'
  + 'figure.code-excerpt pre{margin:.5rem 0;overflow-x:auto;background:var(--d-surface-2);border:1px solid var(--line);border-radius:8px;padding:.75rem 1rem}'
  + 'figure.code-excerpt pre code{display:block;background:none;border:0;padding:0;font:.85rem/1.5 var(--font-mono);white-space:pre}'
  + 'figure.code-excerpt figcaption{display:flex;gap:.6rem;flex-wrap:wrap}.code-language{color:var(--cyan);text-transform:uppercase;letter-spacing:.06em;font-size:.78em}.code-path{font:400 .85em var(--font-mono);color:var(--muted)}'
  + '.code-anchor{margin:0;font-size:.9em}'
  // A modern system stack and no font download (syzygy-pdja.1, owner review of the Redis dossier). The shared stylesheet reads body text from
  // `--font-serif`, so that token carries the sans stack here. Only code, source text and diagram text keep the code face.
  + ':root{--font-serif:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;--font-mono:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace}'
  + '.contents,.contents a,.contents .eyebrow,.pipeline-notice,.eyebrow,.asset-references,.sources,.diagram-legend,.marking,.deep-links,a.cite,.anchor-link,.source-anchor{font-family:var(--font-serif)}'
  // The navigation folds with no script; the reading column takes the room it leaves.
  + '.cited-on,.selected-why{display:block;font-size:.88rem;color:var(--muted)}'
  + '.review-report{margin-top:1rem;border-top:1px solid var(--line);padding-top:.5rem}.review-report>summary{cursor:pointer;color:var(--muted);font-weight:600}.review-report>summary:focus-visible{outline:2px solid var(--focus);outline-offset:2px}'
  + '.nav-panel>summary{cursor:pointer;font-weight:600;color:var(--muted)}.layout:has(>.nav-panel:not([open])){grid-template-columns:auto minmax(0,1fr)}.nav-panel>summary:focus-visible,.mobile-contents>summary:focus-visible{outline-offset:-3px}'
  // A three-column diagram, the widest a plain chain reaches, may shrink to fit its column (text no smaller than 10.7px); any wider one
  // keeps its size and scrolls. The element under the pointer stands out.
  + '.diagram-scroll svg[width="1048"]{max-width:max(100%,860px)}.diagram-scroll g.node:hover rect{stroke-width:3}.diagram-scroll g.edge:hover path{stroke-width:3}.diagram-scroll g.edge-text:hover rect.edge-label{stroke:var(--cyan);stroke-width:1.5}.diagram-scroll path.edge-leader{stroke-width:1;fill:none}.diagram-scroll path.edge-echo{display:none;fill:none;stroke:var(--cyan);stroke-width:3;pointer-events:none}.diagram-scroll g.edge-text:hover path.edge-echo{display:inline}'
  // A marker standing where withheld lines were, on a source page: present, and out of the reading.
  + 'pre.redaction-note{margin:.25rem 0;padding:.1rem .75rem;border-left:4px solid var(--line);color:var(--muted);font:.8rem/1.5 var(--font-mono);white-space:pre-wrap}'
  // A glossary term's entry on hover or keyboard focus; on touch the link opens the glossary.
  // The entry opens from its block's left edge, so it stays on the page wherever the term falls in a line.
  // An entry opens at once and closes a moment after the pointer leaves, so a pointer crossing plain text from a term far along the line
  // reaches it. A hit area that spanned the line instead would cover the citations and other terms on it. It closes by visibility: Chrome 120
  // takes a discrete display transition's element out of hit testing while it still paints, so the pointer would arrive at nothing.
  + 'main [data-claim-id]{position:relative}a.term{color:inherit;text-decoration:underline dotted var(--muted);text-underline-offset:.2em}.term-pop{display:block;visibility:hidden;position:absolute;left:0;z-index:5;width:min(22rem,100%);background:var(--panel-raised);border:1px solid var(--line);border-radius:8px;padding:.5rem .75rem;font-size:.9rem;font-weight:400;line-height:1.5;transition:visibility 0s .35s}.term-pop::before{content:"";position:absolute;left:0;right:0;top:-.5rem;height:.5rem}a.term:hover>.term-pop,a.term:focus>.term-pop{visibility:visible;transition-delay:0s}'
  + '.redaction-mark{margin-left:.1em;color:var(--muted)}.redaction-legend{margin-top:2rem;color:var(--muted);font-size:.85rem}'
  + '.source-identity{margin:.75rem 0}.source-identity>summary{cursor:pointer;color:var(--muted)}'
  // Dossier spec v1.5: the reading view's marks, the evidence view (opened by a fragment link with scripts off; the clipped text is in the
  // DOM all along), a citation mark's file and lines on hover and focus, the one sentence and the legend.
  + 'main:has(#evidence-view:target) .visually-hidden.ev{position:static;width:auto;height:auto;overflow:visible;clip:auto;white-space:normal}'
  + 'main:has(#evidence-view:target) .evidence-note{display:block;font:.8rem/1.5 var(--font-mono);color:var(--muted);margin-top:.25rem}'
  + '.judgement-mark,.framing-mark{font:600 .72em var(--font-serif);letter-spacing:.04em;text-transform:uppercase;border:1px solid var(--line);border-radius:4px;padding:0 .3em;margin-left:.25em;color:var(--muted);vertical-align:.1em}'
  + '.not-established{font-weight:600;color:var(--unknown)}.unknown-words{color:var(--muted);font-size:.9rem}'
  // The pop repeats the mark's accessible name, so it is out of layout until shown: a hidden but laid-out pop widens a narrow page.
  + 'a.cite{position:relative}.cite-pop{display:none;position:absolute;left:0;top:1.6em;z-index:6;white-space:nowrap;background:var(--panel-raised);border:1px solid var(--line);border-radius:6px;padding:.2rem .5rem;font:400 .8rem/1.4 var(--font-mono);color:var(--ink);vertical-align:baseline}'
  + 'a.cite:hover>.cite-pop,a.cite:focus>.cite-pop,a.cite:focus-visible>.cite-pop{display:block}'
  // Colour (syzygy-pdja.14): six hues, light and dark, each a line colour and a tint. A Pole, a diagram outside a Pole page and a card
  // each take one in turn; text stays ink on a tint, so every text contrast is the page's own. No hue carries a claim.
  + ':root{--h1:#8fb0f0;--h1t:#262d3d;--h2:#5cc6b8;--h2t:#1f302e;--h3:#b9a2f0;--h3t:#2d2740;--h4:#f08aa9;--h4t:#3a2630;--h5:#a6d16f;--h5t:#29321f;--h6:#e5937a;--h6t:#3a2c26;--accent:var(--cyan);--accent-tint:var(--d-accent-tint)}'
  + '@media (prefers-color-scheme:light){:root{--h1:#3a64b8;--h1t:#eef2fb;--h2:#0f766e;--h2t:#e7f4f2;--h3:#6d4bc3;--h3t:#f2eefb;--h4:#b4235a;--h4t:#fbeef3;--h5:#4d7c0f;--h5t:#f0f6e6;--h6:#ad4f2c;--h6t:#fbf3ee;}}'
  + '[data-hue="1"],ul.cards>li.card:nth-child(6n+1){--accent:var(--h1);--accent-tint:var(--h1t)}[data-hue="2"],ul.cards>li.card:nth-child(6n+2){--accent:var(--h2);--accent-tint:var(--h2t)}[data-hue="3"],ul.cards>li.card:nth-child(6n+3){--accent:var(--h3);--accent-tint:var(--h3t)}[data-hue="4"],ul.cards>li.card:nth-child(6n+4){--accent:var(--h4);--accent-tint:var(--h4t)}[data-hue="5"],ul.cards>li.card:nth-child(6n+5){--accent:var(--h5);--accent-tint:var(--h5t)}[data-hue="6"],ul.cards>li.card:nth-child(6n+0){--accent:var(--h6);--accent-tint:var(--h6t)}'
  // An arrowhead is filled, never stroked: a stroke would draw it up to 1.6 px past `arrowheadOf`'s triangle, which leader ends keep clear
  // of (syzygy-pdja.16).
  + 'figure:has(.diagram-scroll){border-top:4px solid var(--accent)}.diagram-scroll svg rect{fill:var(--accent-tint);stroke:var(--accent)}.diagram-scroll svg path{stroke:var(--muted)}.diagram-scroll svg marker path{fill:var(--muted);stroke:none}.diagram-scroll svg rect.edge-label{fill:var(--panel);stroke:none}.diagram-scroll path.edge-echo{stroke:var(--accent)}.diagram-scroll g.edge-text:hover rect.edge-label{stroke:var(--accent)}'
  + 'section[data-hue]>h1{border-bottom:4px solid var(--accent);padding-bottom:.4rem}section[data-hue] h2{border-bottom-color:color-mix(in srgb,var(--accent) 45%,var(--line))}'
  + '.pole-map>ol{list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));gap:.9rem}.pole-map>ol>li{background:var(--accent-tint);border:1px solid var(--line);border-top:4px solid var(--accent);border-radius:12px;padding:.85rem 1rem}.pole-map>ol>li>a{font-weight:600;font-size:1.05rem}.pole-map>ol>li>ul{margin:.4rem 0 0;padding-left:1.1rem;font-size:.92rem}'
  + '.contents li[data-hue]>a::before{content:"";display:inline-block;width:.6em;height:.6em;border-radius:50%;background:var(--accent);margin-right:.45em;vertical-align:.05em}'
  + '.pole-map,.review-report>summary{font-family:var(--font-serif)}.legend-line{border-top-color:var(--muted)}'
  + 'li.card{background:var(--accent-tint);border-top:3px solid var(--accent)}th{background:color-mix(in srgb,var(--accent) 12%,var(--panel))}ol.steps>li::before{border-color:var(--accent);background:var(--accent-tint)}'
  + '.run-sentence{margin:.5rem 0;font-size:.9rem;color:var(--muted)}.reading-legend{border:1px solid var(--line);border-radius:10px;padding:.5rem 1rem;margin:0 0 1.5rem;font-size:.85rem;color:var(--muted)}.reading-legend ul{margin:.25rem 0;padding-left:1.2rem}.view-switch{margin:0}.legend-sample{font:600 .9em var(--font-mono)}.diagram-tally{margin:.25rem 0 0;font:.8rem var(--font-mono);color:var(--muted)}';

/** What an operator-agent run adds to every page: its notice, the run disclosure, attributes on `main` and the review-status region. */
interface PageChrome { readonly notice: string; readonly disclosure: (path: string) => string; readonly mainAttributes: string; readonly region: string }

function page(title: string, path: string, nav: string, main: string, chrome?: PageChrome, figureKinds = false, mapCss = ''): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${DRAFT_PREVIEW_CSP_META}<title>${escape(title)}</title><style>${DESIGN_TOKENS_CSS}
${DRAFT_PREVIEW_CSS}${DOSSIER_CSS}${chrome === undefined ? '' : `${LOCAL_CSS}${DOSSIER_THEME_CSS}`}${figureKinds ? FIGURE_KINDS_CSS : ''}${mapCss}
</style></head><body><a class="skip" href="#content">Skip to content</a><div class="pipeline-notice">${chrome?.notice ?? 'Generated dossier draft — not reviewed or adopted'}</div>${chrome?.disclosure(path) ?? ''}<div class="layout">${chrome === undefined ? `<nav class="contents desktop-contents" aria-label="Dossier">${nav}</nav>` : `<details class="contents desktop-contents nav-panel" open><summary>Contents</summary><nav aria-label="Dossier">${nav}</nav></details>`}<details class="contents mobile-contents"><summary>In this dossier</summary><nav aria-label="Dossier">${nav}</nav></details><main id="content" data-page="${escape(path)}"${chrome?.mainAttributes ?? ''}>${main}${chrome?.region ?? ''}</main></div></body></html>`;
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
    label: pole.label, sections: pole.sections, hue: index % HUES + 1, path: pole.sections.every(id => id === poleSpec.whySection) ? null : `poles/${index + 1}.html`,
  }));
  // Colour (syzygy-pdja.14, owner review of the Redis run): an operator-agent page gives each Pole, and each diagram outside a Pole page,
  // one of six hues in turn. A hue only tells parts apart; it carries no claim, so nothing a reader needs rests on it.
  const hueAttr = (hue: number): string => local === undefined ? '' : ` data-hue="${hue}"`;
  // Every operator-agent figure drawn from the draft says it is curated (RFC7-28, version 2.3); the provider mode's bytes are pinned.
  const curated = local === undefined ? '' : ' data-visual-provenance="curated"';
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
    const lines = claimId === undefined ? undefined : local.citationLines?.get(claimId)?.get(id);
    const where = `${source.path}${lines === undefined ? '' : `, ${lines}`}${cited.words}`;
    return `<a class="cite" href="${escape(href(from, target, 'exact-text'))}" data-source-id="${escape(id)}"${cited.attribute} aria-label="${escape(`${sourceLabel(from, id)}${lines === undefined ? '' : `, ${lines}`}${cited.words}`)}">[${citeNumber(from, id)}]${cited.mark}<span class="cite-pop" aria-hidden="true">${escape(where)}</span></a>`;
  }).join(' ')}</span>`;
  // Every claim a page carries, in the order it is built; `add` files them under that page for the machine view.
  const pending: { id: string; epistemic: EpistemicMarking; unknownReason: string | null; v15?: ClaimMarks }[] = [];
  // `attributes` is markup the caller built with escape(); nothing is spliced in afterwards. `marks` are dossier spec v1.5's machine
  // attributes, present only where a claim has one, so a page without them keeps its bytes.
  const claim = (tag: string, id: string, m: EpistemicMarking, body: string, attributes = '', unknownReason: string | null = null, marks?: ClaimMarks): string => {
    pending.push({ id, epistemic: m, unknownReason, ...(marks === undefined || Object.keys(marks).length === 0 ? {} : { v15: marks }) });
    return `<${tag}${attributes}${marks === undefined ? '' : marksAttributes(marks)} data-claim-id="${escape(id)}" data-epistemic="${m}">${body}</${tag}>`;
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
      for (const base of new Set([name, name.replace(/-/gu, ' ')])) {
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
    return `<a class="anchor-link cite" href="${escape(href(from, target, 'exact-text'))}" data-source-id="${escape(part.sourceId)}"${cited.attribute} aria-label="${escape(label)}"${anchorAttributes(part.anchor, escape)}>[${citeNumber(from, part.sourceId)}]${cited.mark}<span class="cite-pop" aria-hidden="true">${escape(where)}</span></a>`;
  };
  const localParagraph = (from: string, p: DraftParagraph, tag: string): string => {
    const b = local!.blocks.get(p.id);
    if (b === undefined) throw new DossierRenderError('unknown-block');
    const body = b.segments.map(part => segment(from, p.id, part)).join('');
    const reading = narrative(from);
    if (b.marking === 'non-normative') {
      nonNormative.push({ page: from, id: p.id });
      return reading
        ? `<${tag} class="non-normative" data-non-normative="${escape(p.id)}" data-claim-kind="non-normative">${body} <span class="framing-mark">framing</span>${clipped(' <span class="marking non-normative">[Non-normative]</span> Evidence: claim-block kind non-normative; it claims nothing from a source.')}</${tag}>`
        : `<${tag} class="non-normative" data-non-normative="${escape(p.id)}">${body} <span class="marking non-normative">[Non-normative]</span></${tag}>`;
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
    return claim(tag, p.id, b.marking, `${lead}${body}${judged} ${mark(from, b.marking)}${reason}${executions}${evidence} ${refs(from, p.sourceIds, p.id)}`,
      `${b.unknownReason === null ? '' : ` data-unknown-reason="${escape(b.unknownReason)}"`}${reading ? ` data-claim-kind="${kind}"` : ''}`, b.unknownReason, blockMarks(b));
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
  const repeated = (diagramId: string | undefined, attrs: string, list: (own: string) => string): string => {
    if (diagramId === undefined) return list(attrs);
    const before = pending.length;
    const shownBefore = new Set(termsShown);
    const inner = list('');
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
        return repeated(e.repeatsDiagram, attrs, own => `<ol class="steps"${own}>${e.items.map(item => paragraph(from, item, 'li')).join('')}</ol>`);
      case 'definitions':
        return repeated(e.repeatsDiagram, attrs, own => `<dl class="definitions"${own}>${e.entries.map(entry => `<dt>${escape(entry.term)}</dt>${paragraph(from, entry.definition, 'dd')}`).join('')}</dl>`);
      case 'cards':
        return repeated(e.repeatsDiagram, attrs, own => `<ul class="cards"${own}>${e.items.map(item => `<li class="card"><p class="card-label">${escape(item.label)}</p>${paragraph(from, item.body, 'div')}</li>`).join('')}</ul>`);
      case 'details': {
        // A collapsed section never hides an Unknown silently (v1.3 note 2): its summary counts the Unknown claims inside it.
        const before = pending.length;
        // A collapsed first use does not use up the section's visible one.
        const shownBefore = new Set(termsShown);
        const inner = e.elements.map(child => block(from, child)).join('');
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
  const notice = (from: string, id: string, disposition: { kind: string; reason?: string; references?: string[] }): string =>
    `<aside class="unresolved-asset" data-asset-disposition="${escape(disposition.kind)}"><strong>${escape(id)}</strong>: ${escape(disposition.reason ?? '')} <span class="asset-references">(${assetReferences(from, disposition.references ?? [])})</span></aside>`;
  const diagram = (from: string, d: DraftDiagram, index: number): string => {
    if (d.disposition.kind !== 'produced') return notice(from, d.id, d.disposition);
    if (d.figure !== undefined) return kindedFigure(from, d, d.figure, index);
    const nodes = new Map(d.nodes.map(node => [node.id, node]));
    // A withheld node or edge (v1.5) reads `Withheld item` and says, in Syzygy's words, what is withheld, with its count.
    const held = (id: string): WithheldNote | undefined => local?.withheldElements?.get(id);
    const heldText = (id: string): string => held(id) === undefined ? '' : ` <span class="withheld-note">${escape(withheldWords(held(id)!))}</span>`;
    const heldAttrs = (id: string): string => held(id) === undefined ? '' : ' data-unknown-reason="excluded-content"';
    const nodeList = d.nodes.map(n => claim('li', n.id, n.epistemic, `${escape(n.label)}${heldText(n.id)} ${mark(from, n.epistemic)} ${refs(from, n.sourceIds, n.id)}`, heldAttrs(n.id), held(n.id) === undefined ? null : 'excluded-content', held(n.id) === undefined ? undefined : { withheldSources: held(n.id)!.sources })).join('');
    const edgeList = d.edges.map(e => claim('li', e.id, e.epistemic, `${escape(nodes.get(e.from)!.label)} → ${escape(nodes.get(e.to)!.label)}: ${escape(e.label)}${heldText(e.id)} ${mark(from, e.epistemic)} ${refs(from, e.sourceIds, e.id)}`, heldAttrs(e.id), held(e.id) === undefined ? null : 'excluded-content', held(e.id) === undefined ? undefined : { withheldSources: held(e.id)!.sources })).join('');
    let svg: string;
    try {
      svg = renderDiagramSvg(d, index, escape, local === undefined ? undefined : READABLE_SPACING);
      assertInertSvg(svg);
    } catch {
      return notice(from, d.id, { kind: 'unresolved', reason: 'diagram could not be rendered inertly', references: [...new Set([...d.nodes, ...d.edges].flatMap(element => element.sourceIds))] });
    }
    // The provider mode keeps its fixed legend (its bytes are pinned); an operator-agent figure legends only the styles it draws, with a
    // tally of its boxes and arrows by marking (syzygy-3efd.17): no figure element is observed there, so "Solid: observed" was false.
    const legend = local === undefined ? FIXED_DIAGRAM_LEGEND : figureLegend([...d.nodes, ...d.edges].map(element => element.epistemic), d.nodes.length, d.edges.length);
    return `<figure${from.startsWith('poles/') ? '' : hueAttr(index % HUES + 1)}${curated}><figcaption>${escape(d.title)}</figcaption><p class="diagram-relationship"><span class="eyebrow">${escape(d.kind)}</span> ${escape(d.relationship)}</p><div class="diagram-scroll">${svg}</div>${legend}<details><summary>Read every component and relationship</summary><ul>${nodeList}</ul><ol>${edgeList}</ol><details class="diagram-source"><summary>Declarative source (Mermaid)</summary><pre>${escape(diagramToMermaid(d))}</pre></details></details></figure>`;
  };
  // A v7 sequence or swimlane (REQ-polaris-generation-034 version 2.5): the figure a graph figure with its home takes, holding its drawing and
  // its phone form, of which the stylesheet displays one by the width of the `figure-forms` box. Each participant, lane and step is a claim
  // as a node is, and each message as an edge is, listed once; the phone form carries no identity, citation, anchor or label token.
  const figurePages = new Set<string>();
  const figureStructures: { readonly index: number; readonly entry: Record<string, unknown> }[] = [];
  const kindedFigure = (from: string, d: DraftDiagram, figure: DraftFigure, index: number): string => {
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
    return `<figure${from.startsWith('poles/') ? '' : hueAttr(index % HUES + 1)}${curated} data-figure-kind="${figure.kind}"><figcaption>${escape(d.title)}</figcaption><p class="diagram-relationship"><span class="eyebrow">${figure.kind}</span> ${escape(d.relationship)}</p>`
      + `<div class="figure-forms" data-figure-width="${width}"><div class="diagram-scroll figure-drawing">${svg}</div><ol class="figure-stepper">${stepper}</ol></div>`
      + `${figureLegend(all.map(element => element.epistemic), 0, 0, 'as marked', tallyHead, figure.kind === 'swimlane')}<details><summary>Read every component and relationship</summary><ul>${ownerList}</ul><ol>${useList}</ol><details class="diagram-source"><summary>Declarative source (Mermaid)</summary><pre>${escape(figureToMermaid(figure))}</pre></details></details></figure>`;
  };
  const topicAttr = (id: string): string => ` data-topics="${escape((topics[id] ?? []).join(' '))}"`;
  const localPages = local?.pages ?? [];
  const reserved = new Set(['index.html', 'contents.html', 'glossary.html', 'dossier.json', 'size-report.json', 'size-report.html', APPENDIX, LOCAL_MACHINE_VIEW, DERIVED_SITE_FILE, ...COMPUTED_MAPS.map(m => m.path), ...deepPaths.values(), ...sourcePaths.values(),
    ...poles.flatMap(pole => pole.path === null ? [] : [pole.path])]);
  for (const localPage of localPages) {
    if (!isDossierPagePath(localPage.path) || localPage.path.includes('/') || !localPage.path.endsWith('.html') || reserved.has(localPage.path)) throw new DossierRenderError('page-path-collision');
    reserved.add(localPage.path);
  }
  const localNav = (from: string): string => localPages.map(localPage => `<li><a href="${escape(href(from, localPage.path))}">${escape(localPage.title)}</a></li>`).join('');
  // How the dossier was made, kept apart from the product (owner review of the Redis run, syzygy-pdja.13): the run's own pages, the size
  // report and the appendix fold under one "Review report" entry after the product's pages. The appendix stays the last page of the
  // reading order (dossier spec v1.5), and the fold opens itself on the pages it holds.
  const reportPaths = [...localPages.map(localPage => localPage.path), 'size-report.html', ...(local === undefined ? [] : [APPENDIX])];
  const reportItems = (from: string): string => `${localNav(from)}<li><a href="${href(from, 'size-report.html')}">Size report</a></li>${local === undefined ? '' : `<li><a href="${href(from, APPENDIX)}">Appendix</a></li>`}`;
  // A provider run's bytes are pinned, so its list keeps its old shape.
  const reviewReport = (from: string): string => local === undefined ? `${reportItems(from)}</ol>` : `</ol><details class="review-report"${reportPaths.includes(from) ? ' open' : ''}><summary>Review report</summary><ol>${reportItems(from)}</ol></details>`;
  const nav = (from: string): string => `<span class="eyebrow">${escape(title)}</span><ol><li><a href="${href(from, 'index.html')}">Overview</a></li>${poles.map(pole => pole.path === null ? '' : `<li${hueAttr(pole.hue)}><a href="${escape(href(from, pole.path))}">${escape(pole.label)}</a></li>`).join('')}<li><a href="${href(from, 'contents.html')}">Contents</a></li>${deepDives.map(dive => `<li><a href="${escape(href(from, deepPaths.get(dive.id)!))}">${escape(dive.title)}</a></li>`).join('')}<li><a href="${href(from, 'glossary.html')}">Glossary</a></li><li><a href="${href(from, 'sources/index.html')}">Sources</a></li>${reviewReport(from)}`;
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
  };

  const files = new Map<string, string>();
  const pages: { path: string; depth: number }[] = [];
  const claimsByPage: { page: string; id: string; epistemic: EpistemicMarking; unknownReason: string | null; v15?: ClaimMarks }[] = [];
  // A page citing a redacted file says once what the mark on its citations means (RFC7-34: a visual encoding is legended).
  const legended = (path: string, main: string): string => narrative(path) ? `${READING_LEGEND}${main}`
    : local !== undefined && main.includes('class="redaction-mark"')
    ? `${main}<p class="redaction-legend"><span aria-hidden="true">†N</span> on a citation: N lines of that file are withheld by screening. Its source page marks where.</p>` : main;
  const add = (path: string, depth: number, pageTitle: string, main: string, mapCss = ''): void => {
    pageTitles.set(path, pageTitle);
    files.set(path, page(`${pageTitle} — ${title}`, path, nav(path), legended(path, main), chrome, figurePages.has(path), mapCss));
    pages.push({ path, depth });
    claimsByPage.push(...pending.splice(0).map(entry => ({ page: path, ...entry })));
  };

  // --- entry page
  const from = 'index.html';
  // The structure Syzygy derived from the pinned tree (version 2.3), in its own region at the end of the landing page's main content.
  // The computed map pages (version 2.9): only for an operator-agent render that carries both the derived structure and the manifest facts
  // it derived itself, as `syzygy dossier render` always does; the region then ends with the line linking them.
  const maps = local?.derivedStructure !== undefined && local.manifestFacts !== undefined ? { derived: local.derivedStructure, manifests: local.manifestFacts } : undefined;
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
    const head = `<span class="eyebrow">${String(index + 1).padStart(2, '0')}</span><h2>${escape(section.title)}</h2>`;
    if (view.deferredSections.has(section.id)) return `<section id="section-${escape(section.id)}" data-reading-level="1" data-topics="">${head}${notGenerated(section.id, 'section')}</section>`;
    if (section.disposition.kind !== 'produced') return `<section id="section-${escape(section.id)}" data-reading-level="1"${topicAttr(section.id)}>${head}${notice(from, section.id, section.disposition)}</section>`;
    // A figure homed on a deep dive that has no page of its own (not produced, or the draft layer withheld) shows in the dive's section.
    const figures = draft.diagrams.map((d, i) => (d.home === undefined || (d.home.kind === 'deep-dive' && !deepPaths.has(d.home.id))) && d.sectionId === section.id ? diagram(from, d, i) : '').join('');
    const dives = draft.deepDives.filter(dive => dive.sectionId === section.id).map(dive => dive.disposition.kind === 'produced'
      ? `<li><a href="${escape(href(from, deepPaths.get(dive.id)!))}">Explore: ${escape(dive.title)}</a></li>` : `<li>${notice(from, dive.id, dive.disposition)}</li>`).join('');
    // An operator-agent section leads with its diagrams (syzygy-mea.10.4); the provider mode's bytes are pinned, so its figures follow.
    const body = section.paragraphs.map(b => block(from, b)).join('');
    return `<section id="section-${escape(section.id)}" data-reading-level="1"${topicAttr(section.id)}>${head}${local === undefined ? `${body}${figures}` : `${figures}${body}`}${dives ? `<ul class="deep-links">${dives}</ul>` : ''}</section>`;
  };
  const onLanding = poleSpec === undefined ? draft.sections : draft.sections.filter(section => section.id === poleSpec.whySection);
  const sections = withheld ? '' : onLanding.map(section => sectionMarkup(from, section, draft.sections.indexOf(section))).join('');
  // The map of the Poles: each Pole's label linking to its page (the why section's Pole to the section here), with its sections.
  const poleMap = poles.length === 0 ? '' : `<nav class="pole-map" aria-label="The parts of this dossier"><h2>The parts of this dossier</h2><ol>${poles.map(pole => {
    const target = pole.path === null ? href(from, 'index.html', `section-${poleSpec!.whySection}`) : href(from, pole.path);
    return `<li${hueAttr(pole.hue)}><a href="${escape(target)}">${escape(pole.label)}</a><ul>${pole.sections.map(id => `<li><a href="${escape(sectionHref(from, id))}">${escape(draft.sections.find(section => section.id === id)!.title)}</a></li>`).join('')}</ul></li>`;
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
    // A v6 draft whose thesis is a reading of the code (version 2.4): Syzygy's one line, immediately before the introduction's block and
    // outside it, carrying no label token, citation or anchor; none where the introduction or the draft layer is withheld.
    const thesisLine = local?.thesisBasis?.lineRendered === true ? THESIS_BASIS_LINE : '';
    const introduction = view.drafted ? `${thesisLine}${paragraph(from, draft.introduction, 'p')}` : '';
    const missingList = view.notGenerated.length === 0 ? '' : `<section id="not-generated" data-reading-level="1" data-topics=""><h2>Not generated</h2>${view.notGenerated.map(item => notGenerated(item.id, item.kind)).join('')}</section>`;
    // Figures whose home is the overview lead the first page, after its introduction and before its sections, in a region of their own
    // at reading level 1 with no topics; none where the page shows no part of the draft (syzygy-3efd.18).
    const overviewDrawn = view.drafted ? draft.diagrams.map((d, i) => d.home?.kind === 'overview' ? diagram(from, d, i) : '').join('') : '';
    const overviewFigures = overviewDrawn === '' ? '' : `<section id="overview-figures" data-reading-level="1" data-topics="">${overviewDrawn}</section>`;
    add(from, 0, 'Overview', `<header data-reading-level="0"><span class="eyebrow">Polaris · Editorial draft</span><h1>${escape(draft.title)}</h1>${banner}${introduction}${unresolved}</header>${overviewFigures}${sections}${poleMap}${missingList}${derivedRegion}`);
  }

  // --- Pole pages, in the map's order, after the landing page: each draws its sections; the why section stays on the landing page,
  // and its Pole's page links back to it rather than repeating it.
  for (const pole of poles) {
    if (pole.path === null) continue;
    const at = pole.path;
    const body = pole.sections.map(id => {
      const section = draft.sections.find(candidate => candidate.id === id)!;
      return id === poleSpec!.whySection
        ? `<p class="pole-why"><a href="${escape(href(at, 'index.html', `section-${id}`))}">${escape(section.title)}</a> is on the overview.</p>`
        : sectionMarkup(at, section, draft.sections.indexOf(section));
    }).join('');
    add(at, 1, pole.label, `<section id="pole" data-reading-level="1" data-pole="${escape(at)}"${hueAttr(pole.hue)}><span class="eyebrow">Part of <a href="${escape(href(at, 'index.html'))}">${escape(draft.title)}</a></span><h1>${escape(pole.label)}</h1>${bannerFor(`run-stopped/pole/${at}`)}${body}</section>`);
  }

  // --- deep dives
  for (const dive of deepDives) {
    const path = deepPaths.get(dive.id)!;
    termsShown.clear();
    const parent = draft.sections.find(section => section.id === dive.sectionId)!;
    // A deep dive leads with the figures whose home it is, as a section does (syzygy-3efd.18).
    const diveFigures = draft.diagrams.map((d, i) => d.home?.kind === 'deep-dive' && d.home.id === dive.id ? diagram(path, d, i) : '').join('');
    add(path, 1, dive.title, `<section id="deep-dive-${escape(dive.id)}" data-reading-level="2"${topicAttr(dive.id)}><span class="eyebrow">Deep dive · <a href="${escape(sectionHref(path, parent.id))}">${escape(parent.title)}</a></span><h1>${escape(dive.title)}</h1>${bannerFor(`run-stopped/dive/${dive.id}`)}${diveFigures}${dive.paragraphs.map(b => block(path, b)).join('')}</section>`);
  }

  // --- contents
  const contents = `<ol>${(withheld ? [] : draft.sections).map(section => `<li><a href="${escape(sectionHref('contents.html', section.id))}">${escape(section.title)}</a>${draft.deepDives.some(dive => dive.sectionId === section.id && deepPaths.has(dive.id))
    ? `<ol>${draft.deepDives.filter(dive => dive.sectionId === section.id && deepPaths.has(dive.id)).map(dive => `<li><a href="${escape(href('contents.html', deepPaths.get(dive.id)!))}">${escape(dive.title)}</a></li>`).join('')}</ol>` : ''}</li>`).join('')}<li><a href="glossary.html">Glossary</a></li><li><a href="sources/index.html">Sources</a></li>${maps === undefined ? '' : COMPUTED_MAPS.map(m => `<li><a href="${m.path}">${m.title}</a></li>`).join('')}${local === undefined ? `${reportItems('contents.html')}</ol>` : `</ol><h2 id="review-report">Review report</h2><p>How this dossier was made, apart from what it says about the project.</p><ol>${reportItems('contents.html')}</ol>`}`;
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
    add(path, 2, source.path, `<section id="exact-text" data-reading-level="3"><h1 class="source-path">${escape(source.path)}</h1><p class="source-anchor">${anchor === undefined ? `${escape(source.sourceId)} · ` : ''}${extent}${identity}${exact}${read}</section>`);
  }

  // --- the computed map pages (version 2.9), after the sources and before the run's own pages: each its own style rules, which no other page
  // carries, with one container query for each width its figures take.
  let mapFigures: { readonly directories: number; readonly units: number; readonly ci: number } | undefined;
  if (maps !== undefined) {
    const drawn = { directories: directoryMap(maps.derived), units: unitMap(maps.manifests, maps.derived), ci: ciMap(maps.manifests, maps.derived) };
    for (const m of COMPUTED_MAPS) {
      const map = drawn[m.map];
      add(m.path, 1, m.title, map.main, map.figures === 0 ? '' : `${MAP_FORMS_CSS}${[...new Set(map.widths)].sort((a, b) => a - b).map(mapWidthQuery).join('')}`);
    }
    mapFigures = { directories: drawn.directories.figures, units: drawn.units.figures, ci: drawn.ci.figures };
  }

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
    const questions = openQuestionClaims(APPENDIX);
    add(APPENDIX, 1, 'Appendix', `<section id="appendix"><h1>Appendix</h1><p>${escape(runSentence)}</p>`
      + `<section id="appendix-disclosure" class="run-disclosure" aria-label="How this dossier was made"><h2>How this dossier was made</h2>${disclosureList(local.disclosure, escape)}<p>Syzygy can see only the marking: whether an unmarked claim rests on the agent's building or running of the project is the agent's report.</p></section>`
      + `<section id="appendix-counts"><h2>Counts</h2><ul>${countRows.map(([id, words]) => `<li data-count="${id}">${escape(words)}</li>`).join('')}<li data-count="unknown-claims">${escape(`Unknown claims in the argument: ${unknownClaims}.`)}</li><li data-count="open-questions">${escape(`Open questions: ${openQuestions}.`)}</li></ul></section>`
      + `<section id="appendix-questions"><h2>Open questions</h2>${questions === '' ? '<p>The draft records no open question.</p>' : questions}</section></section>`);
  }
  if (local !== undefined) {
    const ids = claimsByPage.map(entry => entry.id);
    if (new Set(ids).size !== ids.length) throw new DossierRenderError('duplicate-claim');
  }

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
    + `<table><thead><tr><th>Page</th><th>Depth</th><th>Bytes</th><th>Words</th></tr></thead><tbody>${cost.pages.map(row => `<tr><td><a href="${escape(row.path)}">${escape(pageNames.get(row.path) ?? row.path)}</a></td><td>${row.depth}</td><td>${row.bytes}</td><td>${Object.values(row.wordsByReadingLevel).reduce((n, w) => n + w, 0) + row.unlabelledWords}</td></tr>`).join('')}</tbody></table>`
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
      ...(local.derivedStructure === undefined ? {} : { derivedStructure: derivedMachine(local.derivedStructure) }),
      ...(maps === undefined || mapFigures === undefined ? {} : { computedMaps: computedMapsMachine(maps.derived, maps.manifests, mapFigures) }),
      // Present only for a render holding a sequence or swimlane figure (version 2.5), so every other machine view keeps its bytes.
      ...(figureStructures.length === 0 ? {} : { figureStructures: [...figureStructures].sort((a, b) => a.index - b.index).map(({ entry }) => entry) }),
      pages: [...pages.map(p => p.path), 'size-report.html'],
      claims: claimsByPage,
      nonNormative,
      glossaryShown,
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
  | ({ readonly kind: 'sequence' } & Parameters<typeof renderSequenceSvg>[0]) | ({ readonly kind: 'swimlane' } & Parameters<typeof renderSwimlaneSvg>[0])): number {
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

/** How many hues an operator-agent page cycles through (syzygy-pdja.14). */
const HUES = 6;

/** The appendix page (dossier spec v1.5). */
const APPENDIX = 'appendix.html';

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
  : d.figure.kind === 'sequence' ? [...d.figure.participants, ...d.figure.messages] : [...d.figure.lanes, ...d.figure.steps];

/** The style rules a page carries only where a sequence or swimlane figure renders its two forms (version 2.5), so every other page keeps
 * its bytes. The `figure-forms` box is a size container; it displays its drawing while it is at least the drawing's laid-out width W wide
 * and its phone form, a numbered list, while it is narrower, with no script. The list's text is the 13 px figure text, wrapped within the
 * box; each item's left border is solid, dashed or dotted by its mark, as the legend's line styles are. */
export const FIGURE_KINDS_CSS = '.figure-forms{container-type:inline-size}.figure-stepper{display:none;margin:.5rem 0;padding-left:2rem;font:13px/1.5 var(--font-mono);overflow-wrap:anywhere}'
  + '.figure-stepper>li{border-left:3px solid var(--accent);padding:.15rem 0 .15rem .6rem;margin:0 0 .4rem}.figure-stepper>li.inferred{border-left-style:dashed}.figure-stepper>li.unknown{border-left-style:dotted}'
  + '.stepper-head{display:block;font-weight:600}.figure-drawing rect.lane-band{fill:none;stroke:var(--line);stroke-dasharray:none}.figure-drawing path.step-order{stroke:var(--muted);stroke-width:1;stroke-dasharray:none}.figure-drawing marker.order-head path{fill:var(--muted)}'
  + '.legend-line.order{border-top:1px solid var(--muted)}'
  + [408, 592, 776, 960].map(w => `@container (width < ${w}px){.figure-forms[data-figure-width="${w}"]>.figure-drawing{display:none}.figure-forms[data-figure-width="${w}"]>.figure-stepper{display:block}}`).join('');

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

const unknownWords: Readonly<Record<'missing-evidence' | 'source-uncaptured-or-unreachable', string>> = {
  'missing-evidence': 'no derived record was kept when this draft revision was checked',
  'source-uncaptured-or-unreachable': 'the pinned tree could not be listed',
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
  return `${head}<figure class="derived-figure" data-visual-provenance="computed" data-derived-record="${record}"><figcaption>Derived by Syzygy from the pinned tree</figcaption>`
    + `${derivedNote(derived)}<div class="diagram-scroll">${svg}</div>${notes}${legend}<details><summary>Read every derived fact</summary><ul class="derived-facts">${derivedEntries(derived)}</ul></details></figure>${end}`;
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

/** The three map pages, their titles and their `data-map` names, in the order the region's line and the contents page link them. */
export const COMPUTED_MAPS: readonly { readonly map: 'directories' | 'units' | 'ci'; readonly path: string; readonly title: string }[] = [
  { map: 'directories', path: 'maps/directories.html', title: 'Directory map' },
  { map: 'units', path: 'maps/units.html', title: 'Unit map' },
  { map: 'ci', path: 'maps/ci.html', title: 'CI pipeline map' },
];

/** The region's closing line: it links each map by its title. */
export const DERIVED_MAPS_LINE = `<p class="derived-maps">Computed maps: ${COMPUTED_MAPS.map(m => `<a href="${m.path}">${m.title}</a>`).join(' · ')}.</p>`;

/** The readable spacing, never laid out in three columns. */
export const MAP_SPACING = { ...READABLE_SPACING, maxColumns: 2 } as const;
/** How many boxes a map drawing may hold, and how many directories, packages or modules one figure takes beside its place's box. */
export const MAP_MAX_BOXES = 25;
const MAP_CHUNK = 12;
const MAP_MAX_JOBS = 24;

/** The two forms' style rules, which only a map page carries; a page adds one container query for each W its figures take. */
export const MAP_FORMS_CSS = '.map-forms{container-type:inline-size}.map-list{display:none;margin:.5rem 0;padding-left:2rem;font:13px/1.5 var(--font-mono);overflow-wrap:anywhere}'
  + '.map-list>li{border-left:3px solid var(--accent);padding:.15rem 0 .15rem .6rem;margin:0 0 .4rem}.map-list>li.inferred{border-left-style:dashed}.map-list>li.unknown{border-left-style:dotted}'
  + '.map-head{font-weight:600}.map-coverage{font-size:.92rem}';
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
    html: `<figure class="computed-map" data-visual-provenance="computed" data-map="${map}"><figcaption>${escape(caption)}</figcaption>`
      + `<div class="map-forms" data-figure-width="${width}"><div class="diagram-scroll map-drawing">${svg}</div><ol class="map-list">${items}</ol></div>${legend}</figure>`,
  };
}

const chunks = <T>(items: readonly T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};
const byCodeUnit = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** The sentence the region and the directory map state where no derived record is in force. */
function derivedUnknownSentence(derived: Extract<LocalDerivedStructure, { state: 'missing' | 'unknown' }>): string {
  return `<p class="derived-unknown" data-epistemic="unknown" data-unknown-reason="${derived.unknownReason}"><span class="not-established">Not established.</span> The top-level directories of the tree at revision ${escape(derived.revision)} are Unknown at this render: ${unknownWords[derived.unknownReason]}.</p>`;
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

/** The directory map: the derived structure the region states, with the coverage the render re-derives from the tree. */
export function directoryMap(derived: LocalDerivedStructure): MapPage {
  if (derived.state !== 'derived') return { main: mapSection('directories', 'Directory map', derivedUnknownSentence(derived)), widths: [], figures: 0 };
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
    main: mapSection('directories', 'Directory map', `${derivedNote(derived)}${coverage}${figures.map(f => f.html).join('')}<h2>Every derived fact</h2><ul class="derived-facts">${derivedEntries(derived)}</ul>`),
    widths: figures.map(f => f.width), figures: figures.length,
  };
}

/** The four package recognizers the unit map reads, and the one the CI pipeline map reads. */
export const UNIT_MAP_RULES: readonly string[] = ['npm-package-manifest', 'cargo-manifest', 'python-project-manifest', 'go-module-manifest'];
export const CI_MAP_RULES: readonly string[] = ['github-actions-workflow'];

/** RFC2-24's reason for each file `unknownReason`. */
const MANIFEST_UNKNOWN_REASON: Readonly<Record<string, string>> = {
  'denied-path': 'excluded-content', 'unknown-extraction-class': 'excluded-content', 'not-utf8-text': 'excluded-content', 'secret-detector-match': 'excluded-content',
  'active-content': 'excluded-content', 'redacted-body': 'excluded-content', 'class-not-consented': 'unconsented-source-or-provider',
  'object-read-refused': 'source-uncaptured-or-unreachable', 'path-not-citable': 'mapping-coverage-absent', 'symbolic-link': 'mapping-coverage-absent',
  'over-read-limit': 'mapping-coverage-absent', 'too-large': 'mapping-coverage-absent', unparsed: 'mapping-coverage-absent',
};

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
    default: throw new DossierRenderError('not-renderable');
  }
}

/** A declared fact's list entry: its words, `Derived by Syzygy`, and its evidence in the DOM text, clipped in the reading view. */
function factEntry(fact: LocalManifestFact, revision: string, jobs?: ReadonlySet<string>): string {
  const [first, last] = fact.lines;
  return `<li data-manifest-id="${escape(fact.id)}" data-manifest-fact="${escape(fact.fact)}" data-epistemic="inferred" data-manifest-rule="${escape(fact.rule)}" data-manifest-rule-version="${fact.ruleVersion}" data-manifest-path="${escape(fact.path)}" data-manifest-lines="${first}-${last}">`
    + `${escape(factWords(fact, jobs))} <span class="derived-mark">Derived by Syzygy</span><span class="visually-hidden ev"> ${escape(`Evidence: label Inferred; declared in ${fact.path}, lines ${first} to ${last}; read by Syzygy by rule ${fact.rule} version ${fact.ruleVersion} at revision ${revision}.`)}</span></li>`;
}

const manifestUnknown = (revision: string): string => `<p class="derived-unknown" data-epistemic="unknown" data-unknown-reason="source-uncaptured-or-unreachable"><span class="not-established">Not established.</span> What the manifest files at revision ${escape(revision)} declare is Unknown at this render: the pinned tree could not be listed.</p>`;

type DerivedManifests = Extract<LocalManifestFacts, { state: 'derived' }>;
const recognizersOf = (member: DerivedManifests, rules: readonly string[]): readonly LocalManifestRecognizerEntry[] => member.recognizers.filter(r => rules.includes(r.rule));

/** A manifest map's note, coverage line (with `ending` appended) and closing list of Unknown files, around its own body. */
function manifestPage(map: 'units' | 'ci', title: string, member: DerivedManifests, revision: string, rules: readonly string[], ruleWords: string, ending: string, body: string): string {
  const recognizers = recognizersOf(member, rules);
  const note = `<p class="map-note">Computed by Syzygy at this render from the manifest files of the tree at revision ${escape(revision)} that the bound screening policy ${escape(member.screeningPolicy.policyId)} ${escape(member.screeningPolicy.policyVersion)} admits, read by rule ${ruleWords}, each at version 1. That revision fixes every input, so the map holds as of that revision at any instant. What a file declares, never what runs.</p>`;
  const clauses = [
    ...recognizers.map(r => `${r.rule}: ${counted(r.candidates, 'candidate file', 'candidate files')}; ${r.inferred} read for facts, ${r.unknown} Unknown with no facts taken; ${r.secretPathsLeftOut} left out and not named, because a secret detector matches their path; ${r.setApart} set apart as vendored, generated or test paths; ${counted(r.valuesLeftOut, 'value', 'values')} left out by the value checks; ${counted(r.facts, 'fact', 'facts')}.`),
    ...recognizers.filter(r => r.filesNotListed !== 0).map(r => r.filesNotListed === 1 ? `1 file of ${r.rule} is counted and not listed.` : `${r.filesNotListed} files of ${r.rule} are counted and not listed.`),
    ...(member.factsNotListed === 0 ? [] : [member.factsNotListed === 1 ? '1 fact of the manifest files is counted and not listed, so a figure or list may lack it.' : `${member.factsNotListed} facts of the manifest files are counted and not listed, so a figure or list may lack them.`]),
    ...(ending === '' ? [] : [ending]),
  ];
  const coverage = `<p class="map-coverage" data-epistemic="inferred">${escape(clauses.join(' '))}</p>`;
  const unknownFiles = recognizers.flatMap(r => r.files.filter(file => file.epistemic === 'unknown'));
  const word = (file: LocalManifestFileEntry): string => `${file.unknownReason ?? ''}${file.unknownReason === 'unparsed' && file.parseFault !== null ? `, ${file.parseFault}` : ''}`;
  const unknownList = unknownFiles.length > 0
    ? unknownFiles.map(file => `<li data-epistemic="unknown" data-unknown-reason="${MANIFEST_UNKNOWN_REASON[file.unknownReason ?? ''] ?? 'mapping-coverage-absent'}" data-manifest-path="${escape(file.path)}" data-manifest-file-reason="${escape(word(file))}">${escape(`${file.path}: Unknown, no facts taken (${word(file)}).`)}</li>`).join('')
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

/** `machine.json`'s `computedMaps` member: beside `derivedStructure` and outside `reviewStatus`. */
export function computedMapsMachine(derived: LocalDerivedStructure, member: LocalManifestFacts, figures: { readonly directories: number; readonly units: number; readonly ci: number }): unknown {
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
    },
    units: { figures: figures.units, ...(of(UNIT_MAP_RULES) as object) },
    ci: { figures: figures.ci, ...(of(CI_MAP_RULES) as object) },
  };
}
