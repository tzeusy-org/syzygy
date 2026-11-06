import { PAGE_SINK_CONTRACT, validateDraftRecord, validateRequestedAssets, type DossierDraft, type GenerationSource, type LocalRenderInput, type OwnerTopic, type PipelineResult, type RequestedAsset } from '@syzygy/polaris-generation-core';
import { DossierRenderError, localView, renderDossierSite, type DossierStop, type DossierView, type RenderedDossier } from './dossier-site.js';

// The `./dossier-render` subpath keeps every name it exported before the renderer moved to `dossier-site.ts`.
export { DossierRenderError, sourceRoute } from './dossier-site.js';

/**
 * The multi-page dossier (`dossier-site.ts`) from the generation pipeline's final output, complete or stopped.
 *
 * A stopped run (budget, wall clock, a refused stage) still renders: the page
 * never fails as a whole because generation ended early. The stopped result's
 * `artifacts` are its validated stage outputs, in order. The latest draft
 * (author, edit or repair) renders as above, its blocks Inferred only where a
 * fidelity review later than that draft judged them supported. With no draft,
 * each planned section, or failing a plan each requested asset, renders as a
 * not-generated notice. Every requested asset the page does not carry is such
 * a notice: an Unknown claim with the stop reason (`deferred-by-budget` for a
 * budget stop, otherwise the pipeline's reason), declaring no topics. The
 * entry page names the reason and the last validated stage.
 *
 * An operator-agent run's inputs (`local`, syzygy-qkea.10) render here exactly as `renderLocalDossier` renders them. The `syzygy`
 * CLI injects that function itself, so it never loads this module or the provider island it imports. A provider run's output is
 * unchanged (`dossier-render-provider-golden.test.ts`).
 */

// Test seam: exported type the tests name; production code uses it only inside this file.
export interface DossierRenderInput {
  /** The pipeline's final output, complete or stopped. Present exactly when `local` is absent. */
  readonly result?: PipelineResult;
  /** What the run asked for; required for a stopped result, whose missing assets it names. */
  readonly requestedAssets?: readonly RequestedAsset[];
  readonly sources: readonly GenerationSource[];
  /** Owner topics a section or deep dive answers, by draft id. Absent: each
   * produced item's asset ids that are owner topics. */
  readonly topics?: Readonly<Record<string, readonly OwnerTopic[]>>;
  /** An operator-agent run's inputs, in place of `result`. */
  readonly local?: LocalRenderInput;
}

type StopReason = Extract<PipelineResult, { status: 'stopped' }>['reason'];
/** Every reason a stopped pipeline result may carry; the type check below fails if pipeline.ts adds one. */
const STOP_REASONS = ['invalid-request', 'source-refused', 'admission-refused', 'budget-exhausted', 'cancelled', 'deadline',
  'effect-uncertain', 'invalid-output', 'usage-uncertain', 'repair-exhausted', 'adapter-failure'] as const satisfies readonly StopReason[];
const everyStopReasonListed: [Exclude<StopReason, (typeof STOP_REASONS)[number]>] extends [never] ? true : never = true;
void everyStopReasonListed;

/** What a stopped run shows for an asset it never produced. A reason outside the pipeline's set is refused. */
function stopReasonLabel(reason: string): string {
  // Deliberate throw: the reason is a closed union, so only untyped input (a hand-edited run record) can reach this branch, and it must not render.
  if (!(STOP_REASONS as readonly string[]).includes(reason)) throw new DossierRenderError('unknown-stop-reason');
  return reason === 'budget-exhausted' ? 'deferred-by-budget' : reason;
}

const DRAFT_STAGES: readonly string[] = ['author', 'edit', 'repair'];
const lastIndex = <T>(items: readonly T[], test: (item: T) => boolean): number => {
  for (let i = items.length - 1; i >= 0; i--) if (test(items[i]!)) return i;
  return -1;
};

/** The renderable view of a result: complete, or the latest validated outputs of a stopped run. */
function viewOf(input: DossierRenderInput, result: PipelineResult): DossierView {
  if (result.status === 'awaiting-rendered-review') {
    return { draft: validateDraftRecord(result.draft), drafted: true, review: result.review, inventory: result.inventory, stop: null, deferredSections: new Set(), notGenerated: [],
      quoteFindings: Array.isArray(result.quoteFindings) ? result.quoteFindings : [] };
  }
  if (result.status !== 'stopped' || !Array.isArray(result.artifacts)) throw new DossierRenderError('not-renderable');
  if (input.requestedAssets === undefined) throw new DossierRenderError('missing-requested-assets');
  const requested = validateRequestedAssets(input.requestedAssets);
  const artifacts = result.artifacts;
  const stop: DossierStop = { reason: result.reason, shown: stopReasonLabel(result.reason), lastStage: artifacts.at(-1)?.stage ?? null };
  const draftAt = lastIndex(artifacts, artifact => DRAFT_STAGES.includes(artifact.stage));
  const valueAt = (index: number): unknown => index < 0 ? null : artifacts[index]!.value;
  const inventory = valueAt(lastIndex(artifacts, artifact => artifact.stage === 'inventory'));
  let draft: DossierDraft;
  let review: unknown = null;
  if (draftAt >= 0) {
    draft = validateDraftRecord(artifacts[draftAt]!.value);
    const reviewAt = lastIndex(artifacts, artifact => artifact.stage === 'fidelity');
    review = reviewAt > draftAt ? valueAt(reviewAt) : null;
  } else {
    const planned = (valueAt(lastIndex(artifacts, artifact => artifact.stage === 'plan')) as { sections?: { id: string; title: string }[] } | null)?.sections;
    const sections = Array.isArray(planned) ? planned.map(section => ({ id: section.id, title: section.title }))
      : requested.filter(asset => asset.kind === 'section').map(asset => ({ id: asset.id, title: asset.id }));
    draft = { title: 'Dossier draft (incomplete)', introduction: { id: 'introduction', text: '', sourceIds: [] },
      sections: sections.map(section => ({ ...section, paragraphs: [], disposition: { kind: 'unresolved', reason: '', references: [] } })), diagrams: [], deepDives: [], unresolved: [] };
  }
  // An asset is present only as its own kind: a section `how` never stands in for a diagram `how`.
  const assetKey = (kind: string, id: string): string => `${kind}\u0000${id}`;
  const rendered = new Set([...draft.sections.map(item => assetKey('section', item.id)), ...draft.diagrams.map(item => assetKey('diagram', item.id)),
    ...draft.deepDives.map(item => assetKey('deep-dive', item.id))]);
  const deferredSections = new Set(draftAt >= 0 ? [] : draft.sections.map(section => section.id));
  const notGenerated = requested.filter(asset => !rendered.has(assetKey(asset.kind, asset.id))).map(asset => ({ id: asset.id, kind: asset.kind }));
  return { draft, drafted: draftAt >= 0, review, inventory, stop, deferredSections, notGenerated, quoteFindings: [] };
}

export function renderDossier(input: DossierRenderInput): RenderedDossier {
  const { result, local } = input;
  if ((result === undefined) === (local === undefined)) throw new DossierRenderError('not-renderable');
  return renderDossierSite(input, result !== undefined ? viewOf(input, result) : localView(local!));
}
/** The encoding half of the screening scope's render condition (version 7's text): every page writes each source byte through
 * `escape` and carries `DRAFT_PREVIEW_CSP_META` first in its head. `page-sink.test.ts` fails if either stops holding. */
renderDossier.pageSinkContract = PAGE_SINK_CONTRACT;
