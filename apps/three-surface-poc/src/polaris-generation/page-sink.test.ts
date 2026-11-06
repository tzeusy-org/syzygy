import { beforeAll, describe, expect, it } from 'vitest';
import { pageSinkCspFinding, type EvidenceAnchor, type GenerationSource, type LocalRenderInput, type PipelineResult, type ProviderDraft } from '@syzygy/polaris-generation-core';
import { renderDossier } from './dossier-render.js';
import { renderLocalDossier } from './dossier-site.js';
import { renderDraftPreview } from './draft-preview.js';
import { runSyntheticProject, syntheticProjects } from './pipeline-demo.js';
import { syntheticGenerationSource } from './synthetic-source.js';

// syzygy-wsev / P-105 (owner act of 2026-10-08): the version-3 screening scope exempts a listed code-content body from the
// active-content scan only while every page that writes it meets the scope's renderCondition. This app's page sinks are the
// dossier renderer and the draft preview (public-source-screening.ts names this file); a canary body carrying markup, the
// `a<b && c>d` form the exemption exists for, and both quote kinds must leave each one entity-encoded, and every page must
// pass the policy half (`pageSinkCspFinding`). The dossier renderer has two entries: a provider run's (`renderDossier`) and
// the operator-agent run's the `syzygy` CLI injects (`renderLocalDossier`, syzygy-bpyt.8.1); each is held here.

const CANARY = 'int f(int a, int b, int c, int d) { return a<b && c>d; } /* <script>alert("x")</script> \'q\' */';
const ENCODED = 'int f(int a, int b, int c, int d) { return a&lt;b &amp;&amp; c&gt;d; } /* &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &#39;q&#39; */';
const RAW_FRAGMENTS = ['<script>', 'a<b && c>d', 'alert("x")'];
const REVISION = 'c'.repeat(40);

type Success = Extract<PipelineResult, { status: 'awaiting-rendered-review' }>;
let run: { sources: readonly GenerationSource[]; result: Success };
let canarySources: GenerationSource[];
beforeAll(async () => {
  const synthetic = await runSyntheticProject(syntheticProjects[0]!);
  if (synthetic.result.status !== 'awaiting-rendered-review') throw new Error('synthetic pipeline stopped');
  run = { sources: synthetic.sources, result: synthetic.result };
  canarySources = run.sources.map(source => syntheticGenerationSource('canary', REVISION, source.sourceId, CANARY));
});

/** An operator-agent run whose every caller-supplied string the renderer writes is the canary: a prose segment, a located
 * quotation, a glossary term, the run disclosure and the review-status region. */
function localCanary(): LocalRenderInput {
  const first = canarySources[0]!;
  const anchor = (source: GenerationSource): EvidenceAnchor => ({ targetClass: 'evidence-artifact-identifier-with-integrity-digest',
    identifier: source.objectId!, algorithm: 'sha1', fragment: null, targetState: REVISION, pathLabel: source.path });
  return {
    draft: { title: 'Canary dossier', introduction: { id: 'introduction', text: CANARY, sourceIds: [first.sourceId] }, sections: [], diagrams: [], deepDives: [], unresolved: [] },
    withheldTitle: 'Canary dossier, withheld',
    draftLayer: { state: 'editorial-draft', ruling: 'canary-ruling', inferenceProvenance: { modelIdentity: 'canary-model', modelVersion: null, declaredBy: 'operator', label: 'Inferred' } },
    blocks: new Map([['introduction', { marking: 'inferred', unknownReason: null, basis: 'canary', executions: [], segments: [
      { kind: 'prose', text: CANARY },
      { kind: 'quotation', sourceId: first.sourceId, start: 0, end: Buffer.byteLength(CANARY), text: CANARY, anchor: anchor(first) },
    ] }]]),
    glossary: [{ id: 'glossary/canary', marking: 'inferred', unknownReason: null, title: CANARY, text: CANARY, details: [CANARY], sourceIds: [] }],
    disclosure: [{ id: 'disclosure/canary', text: CANARY, label: null }],
    sourceAnchors: new Map(canarySources.map(source => [source.sourceId, anchor(source)])),
    pages: [],
    reviewStatus: [{ id: 'review-status/canary', text: CANARY, label: 'Unknown' }],
  };
}

function expectEncodedPages(files: ReadonlyMap<string, string>): void {
  const pages = [...files.entries()].filter(([path]) => path.endsWith('.html'));
  expect(pages.length).toBeGreaterThan(0);
  expect(pages.some(([, html]) => html.includes(ENCODED))).toBe(true);
  for (const [path, html] of pages) {
    expect(pageSinkCspFinding(html), path).toBeNull();
    for (const fragment of RAW_FRAGMENTS) expect(html.includes(fragment), `${path}: ${fragment}`).toBe(false);
  }
}

describe('page sinks under the renderCondition', () => {
  it('the dossier renderer writes the canary body entity-encoded, never raw, on every page under the policy CSP', () => {
    expect(renderDossier.pageSinkContract).toBe('polaris/page-sink/escaped-text-under-csp/1');
    expectEncodedPages(renderDossier({ result: run.result, sources: canarySources }).files);
  });

  it('the operator-agent entry the CLI injects writes every canary string entity-encoded, never raw, on every page under the policy CSP', () => {
    expect(renderLocalDossier.pageSinkContract).toBe('polaris/page-sink/escaped-text-under-csp/1');
    const { files } = renderLocalDossier({ local: localCanary(), sources: canarySources });
    expectEncodedPages(files);
    const index = files.get('index.html')!;
    for (const region of ['class="verified-quote"', 'class="run-disclosure"', 'data-review-status-region="review-status"']) expect(index, region).toContain(region);
    expect(files.get('glossary.html')!).toContain(`<dt id="term-glossary/canary">${ENCODED}</dt>`);
  });

  it('the draft preview writes the canary body entity-encoded, never raw, under the policy CSP', () => {
    const html = renderDraftPreview(run.result.draft as ProviderDraft, canarySources);
    expect(html).toContain(ENCODED);
    expect(pageSinkCspFinding(html)).toBeNull();
    for (const fragment of RAW_FRAGMENTS) expect(html.includes(fragment), fragment).toBe(false);
  });
});
