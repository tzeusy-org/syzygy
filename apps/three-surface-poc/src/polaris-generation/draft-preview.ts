import { DESIGN_TOKENS_CSS } from '../design-tokens.js';

import {
  diagramToMermaid, validateGenerationSources,
  type EpistemicMarking, type GenerationSource, type DossierDraft, type DraftBlock, type DraftDiagram, type DraftParagraph,
} from '@syzygy/polaris-generation-core/live';
import { sha256 } from '@syzygy/support';
import { renderDiagramSvg } from './diagram-layout.js';
import { assertInertSvg } from './svg-inert.js';

interface DraftPreviewOptions {
  /** The inert-SVG boundary. Injectable for tests only; defaults to `assertInertSvg`. */
  readonly assertSvg?: (svg: string) => void;
}

/** The preview's strict policy: no script, no remote load; shared with the dossier renderer. */
export const DRAFT_PREVIEW_CSP_META = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">`;
/** The preview's stylesheet after the design tokens; shared with the dossier renderer. */
export const DRAFT_PREVIEW_CSS = `*{box-sizing:border-box}body{margin:0;background:var(--void);color:var(--ink);font-family:var(--font-serif);line-height:1.7}a{color:var(--cyan);text-underline-offset:.2em}a:focus-visible,summary:focus-visible{outline:3px solid var(--focus);outline-offset:5px}.skip{position:absolute;left:1rem;top:-5rem}.skip:focus{top:1rem;background:var(--panel);padding:1rem;z-index:2}.pipeline-notice{padding:.65rem 2rem;border-bottom:1px solid var(--line);font: .8rem/1.5 var(--font-mono);color:var(--amber)}.unresolved-asset{padding:1rem;margin:1rem 0;border:1px solid var(--amber);background:var(--panel);color:var(--ink)}.asset-references{font:.8rem var(--font-mono);color:var(--muted)}.layout{display:grid;grid-template-columns:220px minmax(0,1fr);gap:4vw;max-width:1600px;margin:auto;padding:3rem 4vw}.contents{align-self:start;position:sticky;top:2rem;font: .9rem/1.5 var(--font-mono);max-height:90vh;overflow:auto}.mobile-contents{display:none}.contents ol{padding-left:1.5rem}.contents li{margin:.85rem 0}.contents a{text-decoration:none}main{min-width:0}header{padding:1rem 0 3rem;border-bottom:1px solid var(--line)}h1{font-weight:400;font-size:clamp(2.8rem,5vw,5.5rem);line-height:1.08;letter-spacing:-.04em;margin:.4em 0;overflow-wrap:anywhere}h2{font-size:clamp(1.8rem,3vw,3rem);font-weight:400;line-height:1.2;margin:.4rem 0 1.5rem}p{max-width:76ch;font-size:1.1rem;white-space:pre-wrap;overflow-wrap:anywhere}header p{font-size:1.4rem;max-width:60ch;}section{padding:3rem 0;border-bottom:1px solid var(--line);scroll-margin-top:1rem}.eyebrow{font:.8rem var(--font-mono);color:var(--muted)}.sources{font:.75rem var(--font-mono);white-space:normal}.sources a{display:inline-block;padding:.1rem .15rem}figure{margin:2.5rem 0;padding:1.5rem;background:var(--panel);border:1px solid var(--line)}figcaption{font-size:1.3rem;margin-bottom:1rem}.diagram-scroll{overflow:auto}svg{display:block;max-width:none;height:auto}svg rect{fill:var(--panel-raised);stroke:var(--cyan);stroke-width:1.5}svg rect.edge-label{fill:var(--panel);stroke:none}svg text{fill:var(--ink);font:13px var(--font-mono)}svg text.note{fill:var(--muted);font-size:12px}svg path{fill:none;stroke:var(--cyan);stroke-width:2}svg marker path{fill:var(--cyan);stroke:none}svg .inferred>path,svg .inferred>rect{stroke-dasharray:6 4}svg .unknown>path,svg .unknown>rect{stroke-dasharray:2 4}svg .unknown>rect.edge-label,svg .inferred>rect.edge-label{stroke:none}.diagram-relationship{font-size:1rem;color:var(--muted)}.diagram-legend{display:flex;flex-wrap:wrap;gap:.5rem 1.5rem;list-style:none;padding:0;margin:.75rem 0 0;font:.8rem var(--font-mono);color:var(--muted)}.legend-line{display:inline-block;width:2.2rem;margin-right:.5rem;vertical-align:middle;border-top:2px solid var(--cyan)}.legend-line.inferred{border-top-style:dashed}.legend-line.unknown{border-top-style:dotted}.marking{font:.8rem var(--font-mono);color:var(--muted)}.diagram-source pre{white-space:pre-wrap;overflow-wrap:anywhere;font:.8rem/1.5 var(--font-mono)}.block-children{max-width:72ch;margin:-.5rem 0 1.25rem;padding-left:1.5rem;font-size:1.05rem}.block-children li{margin:.4rem 0;overflow-wrap:anywhere}summary{cursor:pointer;color:var(--cyan);padding:.75rem 0}details li{overflow-wrap:anywhere}.deep-dive{padding:.5rem 1.2rem;border-left:2px solid var(--cyan);margin:1.5rem 0;background:var(--panel)}.exact-source{white-space:pre-wrap;overflow-wrap:anywhere;font: .9rem/1.6 var(--font-mono);max-width:90ch}.source-item{padding:1.25rem 0;border-top:1px solid var(--line);scroll-margin-top:1rem}@media(max-width:800px){.desktop-contents{display:none}.mobile-contents{display:block}.layout{display:block;padding:1.5rem}.contents{position:static;max-height:none;border-bottom:1px solid var(--line);padding-bottom:1rem}.contents ol{display:flex;gap:1rem 2rem;flex-wrap:wrap}.contents li{margin:.25rem 0}figure{padding:1rem}section{padding:2rem 0}}`;

const MARKING_LABEL: Record<EpistemicMarking, string> = { observed: 'Observed', inferred: 'Inferred', unknown: 'Unknown' };

const escape = (value: string): string => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function dispositionNotice(asset: { readonly id: string; readonly disposition: DraftDiagram['disposition'] }): string {
  if (asset.disposition.kind === 'produced') return '';
  const refs = asset.disposition.references.join(', ');
  return `<aside class="unresolved-asset" data-asset-disposition="${asset.disposition.kind}" id="unresolved-${escape(asset.id)}"><strong>${escape(asset.id)}</strong>: ${escape(asset.disposition.reason)} <span class="asset-references">(${escape(refs)})</span></aside>`;
}

/** Intermediate editorial preview only; no adoption, source admission or review verdict. */
export function renderDraftPreview(draft: DossierDraft, sources: readonly GenerationSource[], routeForAnchor?: (source: GenerationSource, anchorId: string) => string, options: DraftPreviewOptions = {}): string {
  const assertSvg = options.assertSvg ?? assertInertSvg;
  validateGenerationSources(sources);
  const sourceIndex = new Map(sources.map(source => [source.sourceId, source]));
  if (sourceIndex.size !== sources.length) throw new Error('duplicate-source');
  const localAnchor = (anchorId: string): string => `source-${sha256(anchorId).slice(0, 24)}`;
  const sourceAnchor = (source: GenerationSource): string => {
    if (source.exclusion.excluded || source.classificationBasis !== 'body' || source.spans.length === 0) throw new Error('unquotable-source');
    if (source.spans.length !== 1) throw new Error('ambiguous-source-anchor');
    return source.spans[0]!.anchorId;
  };
  const handles = new Set<string>();
  const register = (id: string): void => {
    if (handles.has(id)) throw new Error('duplicate-draft-handle');
    handles.add(id);
  };
  const refs = (ids: readonly string[]): string => {
    if (!ids.length) throw new Error('missing-source-reference');
    return `<span class="sources">${ids.map(id => {
      const source = sourceIndex.get(id);
      if (source === undefined) throw new Error('unknown-source');
      const anchorId = sourceAnchor(source);
      const href = routeForAnchor?.(source, anchorId) ?? `#${localAnchor(anchorId)}`;
      return `<a href="${escape(href)}" aria-label="Read source ${escape(id)}">[${escape(id)}]</a>`;
    }).join(' ')}</span>`;
  };
  const paragraph = (p: DraftParagraph): string => {
    register(p.id);
    return `<p>${escape(p.text)} ${refs(p.sourceIds)}</p>`;
  };
  const leaf = (p: DraftParagraph): string => {
    register(p.id);
    return `<li>${escape(p.text)} ${refs(p.sourceIds)}</li>`;
  };
  // A tree block: the parent paragraph, then its leaf children nested beneath it.
  const block = (b: DraftBlock): string => {
    const parent = paragraph(b);
    return b.children.length === 0 ? parent : `${parent}<ul class="block-children">${b.children.map(leaf).join('')}</ul>`;
  };
  const marking = (m: EpistemicMarking): string => `<span class="marking ${m}">[${MARKING_LABEL[m]}]</span>`;
  const sectionIds = new Set(draft.sections.map(s => s.id));
  for (const item of [...draft.diagrams, ...draft.deepDives]) {
    if (!sectionIds.has(item.sectionId)) throw new Error('unknown-section');
  }
  const diagram = (d: DraftDiagram, index: number): string => {
    register(d.id);
    if (d.disposition.kind !== 'produced') return dispositionNotice(d);
    const nodes = new Map(d.nodes.map(node => [node.id, node]));
    d.nodes.forEach(node => register(node.id));
    for (const edge of d.edges) {
      register(edge.id);
      if (!nodes.has(edge.from) || !nodes.has(edge.to)) throw new Error('unknown-node');
    }
    const connected = new Set(d.edges.flatMap(edge => [edge.from, edge.to]));
    const nodeList = d.nodes.map(n => `<li>${escape(n.label)}${connected.has(n.id) ? '' : ' — No relationship supplied'} ${marking(n.epistemic)} ${refs(n.sourceIds)}</li>`).join('');
    const edgeList = d.edges.map(e => `<li>${escape(nodes.get(e.from)!.label)} → ${escape(nodes.get(e.to)!.label)}: ${escape(e.label)} ${marking(e.epistemic)} ${refs(e.sourceIds)}</li>`).join('');
    let svg: string;
    try {
      svg = renderDiagramSvg(d, index, escape);
      assertSvg(svg);
    } catch {
      // Never emit an SVG the boundary refused or a layout that failed: the asset
      // is unresolved in this preview.
      const references = [...new Set([...d.nodes, ...d.edges].flatMap(element => element.sourceIds))];
      return dispositionNotice({ id: d.id, disposition: { kind: 'unresolved', reason: 'diagram could not be rendered inertly', references } });
    }
    const legend = `<ul class="diagram-legend" aria-label="Line styles"><li><span class="legend-line observed" aria-hidden="true"></span>Solid: observed</li><li><span class="legend-line inferred" aria-hidden="true"></span>Dashed: inferred</li><li><span class="legend-line unknown" aria-hidden="true"></span>Dotted: unknown (label ends “?”)</li></ul>`;
    const source = `<details class="diagram-source"><summary>Declarative source (Mermaid)</summary><pre>${escape(diagramToMermaid(d))}</pre></details>`;
    return `<figure><figcaption id="diagram-title-${index}">${escape(d.title)}</figcaption><p class="diagram-relationship"><span class="eyebrow">${escape(d.kind)}</span> ${escape(d.relationship)}</p><div class="diagram-scroll">${svg}</div>${legend}<details id="diagram-text-${index}"><summary>Read every component and relationship</summary><ul>${nodeList}</ul><ol>${edgeList}</ol>${source}</details></figure>`;
  };
  const intro = paragraph(draft.introduction);
  const sections = draft.sections.map((section, index) => {
    register(section.id);
    if (section.disposition.kind !== 'produced') {
      return `<section id="section-${index}" aria-labelledby="heading-${index}"><span class="eyebrow">${String(index + 1).padStart(2, '0')}</span><h2 id="heading-${index}">${escape(section.title)}</h2>${dispositionNotice(section)}</section>`;
    }
    return `<section id="section-${index}" aria-labelledby="heading-${index}"><span class="eyebrow">${String(index + 1).padStart(2, '0')}</span><h2 id="heading-${index}">${escape(section.title)}</h2>${section.paragraphs.map(block).join('')}${draft.diagrams.map((d, i) => d.sectionId === section.id ? diagram(d, i) : '').join('')}${draft.deepDives.map((d, i) => {
      if (d.sectionId !== section.id) return '';
      register(d.id);
      if (d.disposition.kind !== 'produced') return dispositionNotice(d);
      return `<div class="deep-dive" id="deep-dive-${i}"><details><summary>Explore: ${escape(d.title)}</summary>${d.paragraphs.map(block).join('')}</details></div>`;
    }).join('')}</section>`;
  }).join('');
  const contents = `<ol><li><a href="#manifesto">Introduction</a></li>${draft.sections.map((s, i) => `<li><a href="#section-${i}">${escape(s.title)}</a></li>`).join('')}<li><a href="#sources">Exact source text</a></li></ol>`;
  const unresolved = draft.unresolved.map(item => `<aside class="unresolved-asset" data-asset-disposition="unresolved"><strong>${escape(item.question)}</strong>: ${escape(item.reason)} <span class="asset-references">(${escape(item.references.join(', '))})</span></aside>`).join('');
  const sourceList = sources.map(source => {
    const quotable = !source.exclusion.excluded && source.classificationBasis === 'body' && source.spans.length === 1;
    const id = quotable ? localAnchor(source.spans[0]!.anchorId) : `source-unavailable-${sha256(source.sourceId).slice(0, 24)}`;
    const reason = source.exclusion.excluded ? source.exclusion.reason : source.classificationBasis === 'path-only' ? 'path-only; body not read' : 'body unavailable for citation';
    return `<article class="source-item" id="${id}"><h3>${escape(source.path)}</h3>${quotable ? `<div class="exact-source">${escape(source.spans[0]!.text)}</div>` : `<p>Source counted; exact text unavailable: ${escape(reason)}.</p>`}</article>`;
  }).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${DRAFT_PREVIEW_CSP_META}<title>${escape(draft.title)} — draft preview</title><style>${DESIGN_TOKENS_CSS}
${DRAFT_PREVIEW_CSS}
</style></head><body><a class="skip" href="#manifesto">Skip to manifesto</a><div class="pipeline-notice">Pipeline draft preview — not reviewed or adopted</div><div class="layout"><nav class="contents desktop-contents" aria-label="Manifesto sections"><span class="eyebrow">In this manifesto</span>${contents}</nav><details class="contents mobile-contents"><summary>In this manifesto</summary><nav aria-label="Manifesto sections">${contents}</nav></details><main id="manifesto"><header><span class="eyebrow">Polaris · Editorial draft</span><h1>${escape(draft.title)}</h1>${intro}${unresolved}</header>${sections}<section id="sources"><h2>Exact source text</h2><p>These supplied excerpts support the draft’s references. Reference presence does not establish fidelity or approval.</p>${sourceList}</section></main></div></body></html>`;
}

/** Shared with the dossier renderer so both surfaces escape and label identically. */
export { escape as escapeHtml, MARKING_LABEL };
