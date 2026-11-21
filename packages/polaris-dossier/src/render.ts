import { isRunProductReads, protectedProductRecord, yieldForProductReads, UrlProductReadRefusal, type ProductReadEvidence } from './url-operation-products.js';
import { createHash, randomBytes } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  excludedSourceId, spanTouchesWithheld, generationSourcesForBody, generationSourcesForRedactedBody, generationSpanRange, generationSourceTextAt, isDossierPagePath, leadInQuotationSpans, PAGE_SINK_CONTRACT, PAGE_SINK_SCRIPT_CONTRACT, pageSinkCspFinding, pageSinkScriptFinding,
  type EpistemicMarking, type EvidenceAnchor, type GenerationExclusionReason, type GenerationSource, type LocalBlock,
  type LocalDisclosureItem, type LocalDraftLayer, type LocalPage, type LocalPageItem, type LocalRenderInput, type LocalSegment, type WithheldNote,
  type DossierDraft, type DraftBlock, type DraftParagraph,
} from '@syzygy/polaris-generation-core/live';
import { isRecord, sha256 } from '@syzygy/support';
import { collectBlocks, deriveFindings, draftRules, type BlobRedaction, type Derived } from './check.js';
import { CREDENTIAL_CHECK_DISCLOSURE, credentialStepCheck, type CredentialStepResult } from './credential-probe.js';
import { UNDERSTANDING_ITEMS } from './draft-schema.js';
import { EXECUTION_FLAGS_BASIS, executionFlags, type ExecutionFlags } from './execution-flags.js';
import type { CredentialProbe } from './execution-rule.js';
import { RECORDS_WITHIN_REACH } from './gate-sources.js';
import { GitObjectReadRefusal, openPinnedObjectReader } from './git-object-reader.js';
import { errno, logStep, openRun, readRecord, type OpenedRun } from './inventory.js';
import { buildDesignPacket } from './design-review.js';
import type { Outcome } from './outcome.js';
import { designReviewOfRecord, latestPassedDraft, reviewOfRecord, type DesignReviewOfRecord, type ReviewDeps, type ReviewOfRecord } from './review.js';
import type { ReverifyRefusal } from './reverify.js';
import { NO_WORK_ITEM_REASON } from './run-record.js';
import { CLASS_NOT_CONSENTED, unconsentedClass, unconsentedText } from './class-gate.js';
import { placementSubjectOf, screenLoaderOf, type DossierScreen, type ScreenExclusion } from './screen.js';
import { RUN_LAYOUT } from './state-directory.js';
import { continuationOf, type Continuation } from './waiting-sessions.js';
import { packetSpanStanding } from './review-verdict.js';
import { citationIdsOf, isWithheldItem, type SpanStanding } from './withheld-items.js';
import { poleLimitOf } from './run-config.js';
import { effectiveUrlDisclosures, effectiveUrlProjection, readEffectiveRunRecord } from './effective-run-record.js';
import { copyOrderedRenderValue, equalOrderedRenderValue } from './url-ordered-render-value.js';
import { isLoadedUrlRenderer, urlRendererCurrent, type UrlLoadedRenderer } from './url-runtime.js';
import { checkStoredUrlRender } from './url-stored-render.js';
import { assertUrlDesignRenderContinuationCurrent, type UrlDesignRenderContinuation } from './url-session-audit.js';

/** `syzygy dossier render <run>` (REQ-polaris-generation-033, 034, 036; design "Command surface", `render`; syzygy-qkea.10).
 *
 * In this order: the renderer is wired; the pinned revision is verified again, the brief issued and the deadline not passed; the
 * adapter-credential check runs where the brief permitted execution; the latest checked draft revision must have passed and be the bytes
 * its check recorded; the screening policy in force is loaded and every check re-derived from Git objects read now at the pinned
 * revision and re-hashed, which must find nothing; the fidelity review of record is decided by rebuilding its packet now. Then the draft
 * renders through the existing multi-page dossier renderer, through the injected port, into a new numbered `site/<n>/`. The rendered-design
 * review of record is decided from the pages this render draws: it counts only while their design packet, the pages outside the one named
 * review-status region, has the digest its verdict names, and the region alone states it.
 *
 * Every rendered quotation is the span Syzygy located at this render in a blob it read and verified, never the agent's copy and never a
 * stored byte range; a source page exists only for a cited blob read now and admitted by screening; each anchor is RFC7-10's evidence
 * artifact identifier with integrity digest (the recomputed object identifier, its algorithm named, the byte range, the pinned revision),
 * the path a label. A claim block is Inferred only where the agent labels it so, no quotation of it is withheld and the counted fidelity
 * review judges it supported; an Unknown block carries its RFC2-24 reason; a non-normative block is no claim and carries no anchor.
 *
 * The draft layer is an editorial draft attributed to the declared tool and provider. Its provenance remains Inferred; the declaration
 * establishes neither actual provider transmission nor independent verification. Missing declarations render Unknown.
 *
 * Every string of the agent's that Syzygy renders passes the screen's secret detector first; a match withholds the string. */

export const RENDER_REPORT_FORMAT = 'polaris-dossier-render/1';
export const NO_RENDERER = 'no renderer wired: the dossier pages are drawn by the multi-page dossier renderer of apps/three-surface-poc, which the `syzygy` composition root injects; this caller injected none, so nothing is rendered';
const WITHHELD_TEXT = '[withheld: a secret detector matches this text]';
const SECRET_PATH = 'a path a secret detector matches (not shown)';

/** What the renderer port takes and gives: the multi-page renderer's operator-agent input and the files of the site. A renderer that
 * writes every source byte as entity-encoded text says so by carrying `pageSinkContract` (`PAGE_SINK_CONTRACT`). */
export interface DossierRendererInput { readonly local: LocalRenderInput; readonly sources: readonly GenerationSource[] }
export type DossierRenderer = ((input: DossierRendererInput) => { readonly files: ReadonlyMap<string, string> }) & { readonly pageSinkContract?: string };

/** Why the drawn site cannot be confirmed to meet the screening scope's `codeContentExemption.renderCondition` (version 7), or null when
 * it can: the renderer declares the encoding half, and every page carries the closed policy first in its head and only pinned scripts.
 * A machine view's `.json` a browser shows as text. Any other file must be named `.html`: the reader is an HTML parser, and a browser
 * reads `.svg` or `.xml` with another one, where a page this reader confirms can run a script under no policy. */
export function pageSinkUnconfirmed(renderer: DossierRenderer, files: ReadonlyMap<string, string>): string | null {
  if (renderer.pageSinkContract !== PAGE_SINK_CONTRACT && renderer.pageSinkContract !== PAGE_SINK_SCRIPT_CONTRACT) return 'the injected renderer does not declare that it writes every source byte as entity-encoded text';
  for (const [file, html] of files) {
    if (file.endsWith('.json')) continue;
    if (!file.endsWith('.html')) return `${file}: a page must be named .html, since a browser reads any other name with another parser`;
    const finding = pageSinkCspFinding(html) ?? pageSinkScriptFinding(html, renderer.pageSinkContract);
    if (finding !== null) return `${file}: ${finding}`;
  }
  return null;
}

export interface RenderDeps extends ReviewDeps {
  readonly probe: CredentialProbe;
  readonly renderer?: DossierRenderer;
  readonly urlRenderer?: UrlLoadedRenderer;
  /** Trusted host-only producer boundary. No source body is retained by this
   * port; the URL supervisor binds actual renderer inputs and output receipts
   * before any site bytes are persisted. No CLI option supplies this callback. */
  readonly admitProducedSite?: (input: ProducedSiteInput) => boolean | Promise<boolean>;
}
export interface ProducedSiteInput {
  readonly run: string; readonly runId: string; readonly pinnedRevision: string; readonly draftRevision: number;
  readonly products?: ProductReadEvidence;
  readonly input: DossierRendererInput; readonly files: ReadonlyMap<string, string>; readonly signal: AbortSignal;
  readonly packet: { readonly bytes: string; readonly sha256: string };
  readonly sourceBodies: readonly { readonly path: string; readonly objectId: string; readonly raw: string | null; readonly redacted: boolean }[];
}
export const RENDER_PRODUCER_MILLISECONDS = 5000;

export type RenderStage = 'renderer' | 'run' | 'reverify' | 'not-briefed' | 'deadline' | 'draft' | 'screen' | 'object-read' | 'rederive' | 'sources' | 'render' | 'write';

export interface RenderRefusal {
  readonly command: 'render';
  readonly outcome: 'refused';
  readonly stage: RenderStage;
  readonly reason: string;
  readonly reasons?: readonly string[];
  /** The step guard's refusals with their machine codes, when the guard refused. */
  readonly refusals?: readonly ReverifyRefusal[];
  readonly objectRead?: ReturnType<GitObjectReadRefusal['toJSON']>;
  readonly disclosures: readonly string[];
}

export interface RenderReport {
  readonly format: typeof RENDER_REPORT_FORMAT;
  readonly command: 'render';
  readonly outcome: 'rendered';
  readonly run: string;
  readonly site: string;
  readonly draftRevision: number;
  readonly draftLayer: { readonly state: 'editorial-draft' } | { readonly state: 'unknown'; readonly reason: 'missing-declaration' | 'unconsented-source-or-provider'; readonly why: readonly string[] };
  readonly fidelityReview: { readonly counts: true; readonly packetSha256: string; readonly label: 'Observed' } | { readonly counts: false; readonly why: string };
  /** The rendered-design review, decided from the design packet of these pages; its digest is what a design verdict must name. */
  readonly designReview: { readonly counts: true; readonly packetSha256: string; readonly label: 'Observed' } | { readonly counts: false; readonly packetSha256: string; readonly why: string };
  readonly pages: number;
  readonly quotations: { readonly rendered: number; readonly withheld: number; readonly label: 'Observed' };
  readonly sources: { readonly admitted: number; readonly excluded: number };
  readonly credential: CredentialStepResult;
  readonly disclosures: readonly string[];
}

export type RenderResult = Outcome<RenderReport, RenderRefusal>;

const DISCLOSURES = [
  RECORDS_WITHIN_REACH,
  'Every quotation, source page, check result and review binding on the rendered pages was derived at this render from Git objects read by identifier at the pinned revision and re-hashed now; no stored byte range, check result or packet was used.',
  'Every value the pages show from Syzygy\'s stored records rather than re-deriving it is labelled Inferred.',
];

const list = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);
const text = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
const SUBJECT_JSON_LIMITS = Object.freeze({ maxBytes: 4 * 1024 * 1024, maxNodes: 500_000, maxDepth: 16 });

const EXCLUSION_REASON: Readonly<Record<ScreenExclusion, GenerationExclusionReason>> = {
  'denied-path': 'denied-path', 'secret-detector-match': 'secret-detector-match', 'unknown-extraction-class': 'unknown-extraction-class',
  'not-utf8-text': 'not-utf-8', 'active-content': 'active-content',
};

export async function renderRun(runDir: string, deps: RenderDeps, designContinuation?: UrlDesignRenderContinuation): Promise<RenderResult> {
  try { return await render(runDir, deps, undefined, designContinuation); }
  catch (cause) {
    if (!(cause instanceof UrlProductReadRefusal)) throw cause;
    return { ok: false, refusal: { command: 'render', outcome: 'refused', stage: 'reverify', reason: cause.message, disclosures: DISCLOSURES } };
  }
}

type StoredUrlRender = { readonly path: string; readonly output: Parameters<typeof checkStoredUrlRender>[2] };

/** Host-only fresh reconstruction. Compare with the exact stored site without
 * allocating a site number or writing a render step, including on refusal. */
export async function reproduceUrlRender(runDir: string, deps: RenderDeps, site: StoredUrlRender,
  designContinuation?: UrlDesignRenderContinuation): Promise<boolean> {
  try { return (await render(runDir, deps, structuredClone(site), designContinuation)).ok; }
  catch (cause) {
    if (cause instanceof UrlProductReadRefusal) return false;
    throw cause;
  }
}

async function render(runDir: string, deps: RenderDeps, storedSite?: StoredUrlRender,
  checkedDesign?: UrlDesignRenderContinuation): Promise<RenderResult> {
  const now = deps.now();
  let logRun: string | undefined;
  const refuse = (stage: RenderStage, reason: string, extra: Partial<RenderRefusal> = {}): RenderResult => {
    if (logRun !== undefined) logStep(logRun, 'render', now, { outcome: 'refused', stage, reason });
    return { ok: false, refusal: { command: 'render', outcome: 'refused', stage, reason, ...extra, disclosures: DISCLOSURES } };
  };
  // A retained legacy run is read-only and gets its restart explanation even
  // when no renderer is installed; do not append a step or inspect its sources.
  if (deps.productReads === undefined) {
    try {
      const stored = readEffectiveRunRecord(runDir, deps.sources.effectiveRunDeclaration);
      if (!stored.ok && stored.legacy) return refuse('run', stored.reason);
    } catch { /* existing missing-run / missing-renderer handling below */ }
  }
  if (deps.renderer === undefined) return refuse('renderer', NO_RENDERER);
  const opened = await openRun(runDir, deps.sources, now, 'nothing is rendered', deps);
  if (!opened.ok) return refuse(opened.stage, opened.reason, { ...(opened.reasons ? { reasons: opened.reasons } : {}), ...(opened.refusals ? { refusals: opened.refusals } : {}) });
  const { run, runId, subject, declared } = opened;
  const urlMode = opened.effective?.kind === 'url';
  if (checkedDesign !== undefined && !urlMode) return refuse('reverify', 'The protected design continuation requires a URL run.');
  if (storedSite !== undefined && !urlMode) return refuse('reverify', 'Stored site reproduction requires a protected URL run.');
  const products = deps.productReads;
  if (urlMode && !isRunProductReads(products)) return refuse('reverify', 'A URL render requires authenticated product reads.');
  const installed = deps.urlRenderer;
  if (urlMode && (installed === undefined || !isLoadedUrlRenderer(installed) || installed.renderer !== deps.renderer
    || installed.identity.profileRegistrySha256 !== opened.effective.declaration.inference.profile.sha256
    || !(await urlRendererCurrent(installed)))) return refuse('renderer', 'The bound URL renderer is unavailable or changed.');
  if (urlMode && deps.admitProducedSite === undefined) return refuse('renderer', 'A URL render requires its checked producer admission boundary before site storage.');
  if (storedSite === undefined) logRun = run;
  const pinned = subject.pinnedRevision.commit;

  const briefRecord = products === undefined ? readRecord(path.join(run, RUN_LAYOUT.briefRecord))
    : protectedProductRecord(products, run, RUN_LAYOUT.briefRecord);
  const arm = briefRecord?.['executionRule'];
  if (urlMode && (!isRecord(arm) || arm['arm'] !== 'sec-3')) {
    return refuse('reverify', 'The authenticated URL brief does not establish the required no-execution rule.');
  }
  const credential: CredentialStepResult = urlMode ? {
    required: false, why: "the brief carried SEC-3's rule and permits no execution",
  } : await credentialStepCheck(run, 'render', deps.probe, now);

  if (products?.waitForSample !== undefined) await yieldForProductReads(products, run);
  const draftRev = latestPassedDraft(run, products);
  if (!draftRev.ok) return refuse('draft', `nothing is rendered: ${draftRev.reason}`);
  let doc: Readonly<Record<string, unknown>>;
  try {
    const parsed: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(draftRev.bytes));
    if (!isRecord(parsed) || draftRev.bytes.byteLength > SUBJECT_JSON_LIMITS.maxBytes) throw new Error('not an object');
    doc = parsed;
  } catch {
    return refuse('draft', `draft revision ${draftRev.revision} is not one bounded JSON object`);
  }

  const screenLoad = await screenLoaderOf(deps.loadScreen, deps.sources.recordsRoot, now)(placementSubjectOf(subject));
  if (!screenLoad.ok) return refuse('screen', screenLoad.why);
  const screen = screenLoad.screen;
  const reader = (deps.openReader ?? openPinnedObjectReader)({ gitDir: path.join(subject.clone.path, '.git'), revision: pinned });
  let derived: Derived;
  try {
    derived = await deriveFindings(doc, { pinned, screen, reader }, draftRules(pinned, declared.maxQuestions, poleLimitOf(declared)));
  } catch (cause) {
    if (cause instanceof GitObjectReadRefusal) return refuse('object-read', `an object at the pinned revision could not be read: ${cause.message}`, { objectRead: cause.toJSON() });
    throw cause;
  }
  if (derived.findings.length > 0) {
    return refuse('rederive', `draft revision ${draftRev.revision} passed its check, but checking it again at this render from the objects read now finds ${derived.findings.length} finding(s); the stored result is not trusted, so nothing is rendered`,
      { reasons: derived.findings.map((finding) => `${finding.kind} at ${finding.at}`) });
  }

  const review = await reviewOfRecord(opened, deps);

  // Record-derived presentation inputs are read at the operation boundary, then
  // passed explicitly into the renderer adapter. The producer read context can
  // authenticate these exact snapshots; building the local input performs no
  // hidden reread of brief or reviewer continuation history.
  const fidelityContinuation = review.counts
    ? continuationOf(run, 'fidelity', review.session, review.number, review.packetSha256, review.sessionId.value, products) : null;
  const built = buildLocalInput({ opened, doc, derived, review, screen, credential, algorithm: reader.algorithm,
    briefRecord, fidelityContinuation });
  if (!built.ok) return refuse(built.stage, built.reason);

  const renderer = deps.renderer;
  const draw = (local: LocalRenderInput, sources = built.sources): ReadonlyMap<string, string> | string => {
    try { return renderer({ local, sources }).files; } catch (cause) { return `the renderer refused the run: ${cause instanceof Error ? cause.message : 'unknown'}`; }
  };
  // The rendered-design review of record is decided from the pages this render draws, outside the review-status region, which is where
  // the decision is stated: draw once with the decision pending, decide it from those pages, then draw again with it stated, and refuse
  // unless the second drawing equals the first outside the region.
  const pendingInput = urlMode ? copyOrderedRenderValue({ local: built.local, sources: built.sources }) : null;
  const pending = draw(built.local);
  if (typeof pending === 'string') return refuse('render', pending);
  const reviewed = buildDesignPacket({ run, runId, pinnedRevision: pinned, audience: declared.audience, files: pending });
  if (!reviewed.ok) return refuse('render', `the rendered pages cannot be compared outside the review-status region: ${reviewed.reason}`);
  const design = await designReviewOfRecord(opened, reviewed, { sources: deps.sources, now: () => now, productReads: products }, checkedDesign);
  if (checkedDesign !== undefined && (!review.counts || review.verdict.blocking || review.verdict.readiness !== 'ready' || !design.counts))
    return refuse('reverify', 'The current fidelity and design reviews are required for the protected final render.');
  const designContinuation = design.counts
    ? continuationOf(run, 'design', design.session, design.number, design.packetSha256, design.sessionId.value, products,
      checkedDesign === undefined ? undefined : { round: checkedDesign.delivery.identity.round, earlierRounds: checkedDesign.earlierRounds }) : null;
  const local: LocalRenderInput = { ...built.local, reviewStatus: built.local.reviewStatus.map((item) => (item.id === 'review-status/design' ? designStatusItem(design, designContinuation) : item)) };
  const finalInput = urlMode ? copyOrderedRenderValue({ local, sources: built.sources }) : null;
  const drawn = draw(local);
  if (typeof drawn === 'string') return refuse('render', drawn);
  const files = new Map(drawn);
  const published = buildDesignPacket({ run, runId, pinnedRevision: pinned, audience: declared.audience, files });
  if (!published.ok || published.bytes !== reviewed.bytes) {
    return refuse('render', 'stating the rendered-design review in the review-status region changed the pages outside that region, so the review of record cannot be decided from them');
  }
  // The first RFC7-20 condition, checked on the output itself (dossier spec v1.5): every page carries the one sentence and its machine
  // disclosure, the appendix carries the disclosure in human form, and the machine view exists.
  const pagesMissing = [...files].filter(([file, html]) => file.endsWith('.html') && !(html.includes('class="run-sentence"') && html.includes(' data-disclosure-ids="'))).map(([file]) => file);
  const appendix = files.get('appendix.html');
  if (pagesMissing.length > 0 || appendix === undefined || !appendix.includes('class="run-disclosure"') || !files.has('machine.json')) {
    return refuse('render', `the rendered site does not carry the run disclosure: the one sentence and machine form on every page, the appendix and the machine view (${[...pagesMissing, ...(appendix === undefined ? ['appendix.html'] : [])].join(', ') || 'machine.json'})`);
  }
  // The code-content exemption (policy version 3) and the project-documentation exemption (version 5) admitted some bodies without the
  // active-content scan. Each holds at these pages only while they meet the renderCondition (version 7's text); where that cannot be confirmed,
  // each such body is scanned as before for these pages, and one with a finding is excluded whole here: a quoted or cited body cannot
  // leave the pages it is drawn on, so nothing is rendered. A redacted body is scanned over its complete body, which check kept as the
  // answer alone (`activeContentAsBefore`), so its withheld lines count and no withheld text reaches this step.
  const scannedAsBefore = [...derived.admitted].filter(([, blob]) => (blob.withheld === undefined ? screen.screenBody(blob.raw) !== undefined : blob.activeContentAsBefore === true))
    .map(([cited]) => cited);
  const unconfirmed = scannedAsBefore.length === 0 ? null : pageSinkUnconfirmed(renderer, files);
  if (unconfirmed !== null) {
    return refuse('render', `${scannedAsBefore.length} cited blob(s) were admitted only under the screening policy's code-content or project-documentation exemption, and these pages cannot be confirmed to meet its render condition (${unconfirmed}); scanned as before for these pages they hold active content, so nothing is rendered`);
  }

  // URL products use this sink check unconditionally: the source exemption's
  // conditional fallback cannot attest a new raw renderer-product species.
  if (urlMode && (renderer.pageSinkContract !== PAGE_SINK_CONTRACT || pageSinkUnconfirmed(renderer, files) !== null))
    return refuse('render', 'The complete URL renderer output does not satisfy the fixed page sink contract.');
  if (deps.admitProducedSite !== undefined) {
    const reproduce = async (signal: AbortSignal) => {
      if (!urlMode) return { input: { local, sources: built.sources }, derived };
      if (storedSite !== undefined || checkedDesign !== undefined) {
        // These operations independently rebuild the reviewed packet. Check
        // the exact inputs consumed by both draws again. The producer verifies
        // the sources and packet. The supervisor independently reproduces the
        // full final site before counting completion.
        if (signal.aborted
          || !equalOrderedRenderValue(pendingInput, { local: built.local, sources: built.sources })
          || !equalOrderedRenderValue(finalInput, { local, sources: built.sources })) return null;
        return { input: { local, sources: built.sources }, derived };
      }
      if (products?.waitForSample !== undefined) await yieldForProductReads(products, run);
      const again = latestPassedDraft(run, products);
      if (!again.ok || again.revision !== draftRev.revision || !Buffer.from(again.bytes).equals(draftRev.bytes)) return null;
      const draft: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(again.bytes));
      if (!isRecord(draft)) return null;
      const reader = deps.openReader!({ gitDir: path.join(subject.clone.path, '.git'), revision: pinned });
      const rederived = await deriveFindings(draft, { pinned, screen, reader }, draftRules(pinned, declared.maxQuestions, poleLimitOf(declared)));
      if (signal.aborted || rederived.findings.length > 0) return null;
      const fidelity = await reviewOfRecord(opened, deps);
      const fidelityContinuation = fidelity.counts
        ? continuationOf(run, 'fidelity', fidelity.session, fidelity.number, fidelity.packetSha256, fidelity.sessionId.value, products) : null;
      const rebuilt = buildLocalInput({ opened, doc: draft, derived: rederived, review: fidelity, screen, credential, algorithm: reader.algorithm,
        briefRecord: protectedProductRecord(products!, run, RUN_LAYOUT.briefRecord), fidelityContinuation });
      if (!rebuilt.ok || signal.aborted
        || !equalOrderedRenderValue(pendingInput, { local: rebuilt.local, sources: rebuilt.sources })) return null;
      const pending = draw(rebuilt.local, rebuilt.sources);
      if (typeof pending === 'string') return null;
      const candidate = buildDesignPacket({ run, runId, pinnedRevision: pinned, audience: declared.audience, files: pending });
      if (!candidate.ok || candidate.bytes !== reviewed.bytes) return null;
      const design = await designReviewOfRecord(opened, candidate, { sources: deps.sources, now: () => now, productReads: products });
      const designContinuation = design.counts
        ? continuationOf(run, 'design', design.session, design.number, design.packetSha256, design.sessionId.value, products) : null;
      const next = { ...rebuilt.local, reviewStatus: rebuilt.local.reviewStatus.map(item =>
        item.id === 'review-status/design' ? designStatusItem(design, designContinuation) : item) };
      if (!equalOrderedRenderValue(finalInput, { local: next, sources: rebuilt.sources })) return null;
      const drawn = draw(next, rebuilt.sources);
      if (typeof drawn === 'string' || drawn.size !== files.size || signal.aborted) return null;
      const expected = files.entries();
      for (const [file, bytes] of drawn) {
        const pair = expected.next().value;
        if (pair === undefined || pair[0] !== file || pair[1] !== bytes) return null;
      }
      return { input: { local: next, sources: rebuilt.sources }, derived: rederived };
    };
    const abort = new AbortController();
    const expires = performance.now() + RENDER_PRODUCER_MILLISECONDS;
    const expired = (): boolean => abort.signal.aborted || performance.now() >= expires;
    let timer: ReturnType<typeof setTimeout> | undefined, completed = false;
    try {
      const admitted = await Promise.race([
        Promise.resolve().then(async () => {
          const rebuilt = await reproduce(abort.signal);
          if (rebuilt === null || expired()) return false;
          const usedPaths = new Set(rebuilt.input.sources.filter(source => !source.exclusion.excluded).map(source => source.path));
          return deps.admitProducedSite!({ run, runId, pinnedRevision: pinned, draftRevision: draftRev.revision,
            ...(products === undefined ? {} : { products: products.revalidate() }),
            input: rebuilt.input, files: new Map(files), signal: abort.signal, packet: { bytes: published.bytes, sha256: published.sha256 },
            sourceBodies: [...rebuilt.derived.admitted].filter(([repositoryPath]) => !urlMode || usedPaths.has(repositoryPath))
              .map(([repositoryPath, blob]) => ({ path: repositoryPath, objectId: blob.objectId,
                raw: blob.withheld === undefined ? blob.raw : null, redacted: blob.withheld !== undefined })) });
        }),
        new Promise<false>(resolve => { timer = setTimeout(() => { abort.abort(); resolve(false); }, RENDER_PRODUCER_MILLISECONDS); }),
      ]);
      if (admitted !== true || expired()) return refuse('render', 'The rendered products were not admitted by the checked producer before storage.');
      completed = true;
    } catch { return refuse('render', 'The rendered products were not admitted by the checked producer before storage.'); }
    finally { clearTimeout(timer); if (!completed) abort.abort(); }
  }

  if (urlMode && !(await urlRendererCurrent(installed!))) return refuse('renderer', 'The bound URL renderer changed before site storage.');
  const productLeaseCurrent = (): boolean => products?.isLeaseOpen() === true
    && (checkedDesign === undefined || Date.now() < checkedDesign.deadline);
  const ensureStorageCurrent = (): void => {
    if (urlMode && !productLeaseCurrent()) throw new UrlProductReadRefusal();
  };
  const ensureDesignCurrent = (): void => {
    if (checkedDesign !== undefined) {
      try { assertUrlDesignRenderContinuationCurrent(checkedDesign); }
      catch { throw new UrlProductReadRefusal(); }
    }
  };
  let site: string;
  if (storedSite === undefined) {
    products?.revalidate();
    try { site = writeSite(run, files, ensureStorageCurrent, ensureDesignCurrent); } catch (cause) {
      if (cause instanceof UrlProductReadRefusal) throw cause;
      return refuse('write', `the site could not be written (${cause instanceof Error && cause.message.startsWith('invalid') ? cause.message : errno(cause)})`);
    }
  } else {
    ensureStorageCurrent();
    if (files.size !== storedSite.output.files || storedSite.output.population.some(file => {
      ensureStorageCurrent();
      const body = files.get(file.path);
      return body === undefined || file.bytes !== Buffer.byteLength(body) || file.sha256 !== sha256(body);
    }) || checkStoredUrlRender(run, storedSite.path, storedSite.output, productLeaseCurrent) === null)
      return refuse('reverify', 'The reproduced output differs from the checked stored site.');
    // The comparison is read-only. Verify the authenticated input and
    // continuation again before releasing the reproduced result.
    products!.revalidate();
    ensureDesignCurrent();
    ensureStorageCurrent();
    site = storedSite.path;
  }
  const quoted = built.local.blocks;
  const rendered = [...quoted.values()].reduce((n, block) => n + block.segments.filter((part) => part.kind === 'quotation').length, 0);
  // A withheld item (v1.5) carries none of its segments, so its withheld quotations are counted from the check's own record.
  const withheldQuotes = [...quoted].reduce((n, [id, block]) => n + (block.withheld !== undefined
    ? derived.excludedContent.filter((quotation) => quotation.blockId === id).length
    : block.segments.filter((part) => part.kind === 'withheld').length), 0);
  const report: RenderReport = {
    format: RENDER_REPORT_FORMAT,
    command: 'render',
    outcome: 'rendered',
    run,
    site,
    draftRevision: draftRev.revision,
    draftLayer: built.local.draftLayer.state === 'editorial-draft' ? { state: 'editorial-draft' } : built.local.draftLayer,
    fidelityReview: review.counts ? { counts: true, packetSha256: review.packetSha256, label: 'Observed' } : { counts: false, why: review.why },
    designReview: design.counts ? { counts: true, packetSha256: design.packetSha256, label: 'Observed' } : { counts: false, packetSha256: reviewed.sha256, why: design.why },
    pages: [...files.keys()].filter((file) => file.endsWith('.html')).length,
    quotations: { rendered: built.local.draftLayer.state === 'editorial-draft' ? rendered : 0, withheld: withheldQuotes, label: 'Observed' },
    sources: { admitted: built.sources.filter((source) => !source.exclusion.excluded).length, excluded: built.sources.filter((source) => source.exclusion.excluded).length },
    credential,
    disclosures: credential.required ? [...DISCLOSURES, CREDENTIAL_CHECK_DISCLOSURE] : DISCLOSURES,
  };
  if (storedSite === undefined) logStep(run, 'render', now, { outcome: 'rendered', site: path.relative(run, site), draftRevision: draftRev.revision, draftLayer: report.draftLayer.state });
  else ensureStorageCurrent();
  return { ok: true, report };
}

/** Write the site into a new numbered directory under `site/`, through a staging directory renamed into place only when every file is
 * written. Returns the directory. */
function writeSite(run: string, files: ReadonlyMap<string, string>, ensureCurrent: () => void, ensureDesignCurrent: () => void): string {
  ensureCurrent();
  for (const file of files.keys()) if (!isDossierPagePath(file)) throw new Error('invalid-output-path');
  const root = path.join(run, RUN_LAYOUT.site);
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  const taken = fs.readdirSync(root).flatMap((name) => (/^(0|[1-9][0-9]*)$/.test(name) ? [Number(name)] : []));
  const target = path.join(root, String(taken.length === 0 ? 0 : Math.max(...taken) + 1));
  const staging = path.join(root, `.partial-${randomBytes(8).toString('hex')}`);
  fs.mkdirSync(staging, { mode: 0o700 });
  try {
    for (const [file, content] of files) {
      ensureCurrent();
      const out = path.join(staging, file);
      fs.mkdirSync(path.dirname(out), { recursive: true, mode: 0o700 });
      fs.writeFileSync(out, content, { mode: 0o600, flag: 'wx' });
    }
    if (fs.existsSync(target)) throw new Error('site-directory-exists');
    ensureDesignCurrent();
    ensureCurrent();
    fs.renameSync(staging, target);
    return target;
  } catch (cause) {
    fs.rmSync(staging, { recursive: true, force: true });
    throw cause;
  }
}

interface BuildInputs {
  readonly opened: Extract<OpenedRun, { ok: true }>;
  readonly doc: Readonly<Record<string, unknown>>;
  readonly derived: Derived;
  readonly review: ReviewOfRecord;
  /** The rendered-design review of record; absent while it is not yet decided, before the pages it is decided from are rendered. */
  readonly design?: DesignReviewOfRecord;
  readonly screen: DossierScreen;
  readonly credential: CredentialStepResult;
  readonly algorithm: 'sha1' | 'sha256';
  readonly briefRecord: Readonly<Record<string, unknown>> | undefined;
  readonly fidelityContinuation: Continuation | null;
  readonly designContinuation?: Continuation | null;
}

type Built = { readonly ok: true; readonly local: LocalRenderInput; readonly sources: readonly GenerationSource[] } | { readonly ok: false; readonly stage: RenderStage; readonly reason: string };

/** How much of a redacted-span body screening kept: partially retained, or, where the emptied body no longer matches a detector and
 * `redactBody` withholds every line, retained with every line withheld (syzygy-mea.3 round-1 note 6). Never "not retained". */
export const redactedExtent = ({ withheld, lines }: { readonly withheld: number; readonly lines: number }): string => (withheld >= lines
  ? `retained by screening as redacted-span with every one of its ${lines} line(s) withheld`
  : `partially retained by screening as redacted-span: ${withheld} of its ${lines} line(s) withheld`);

/** A redacted body's provenance as the discovery row states it: the detectors that matched and the withheld line ranges, never the
 * matched text (syzygy-ts8u). */
export const redactionDetails = (redaction: BlobRedaction | undefined): string[] => (redaction === undefined ? [] : [
  `detectors matched: ${redaction.detectorIds.join(', ')}`,
  `withheld lines: ${redaction.withheldLineRanges.map(([first, last]) => (first === last ? `${first}` : `${first}\u2013${last}`)).join(', ')}`,
]);

/** The adapter from the checked local draft to the renderer's operator-agent input. */
/** A code excerpt's language where the draft names none (v1.3 note 5): read from the path's extension, never from the bytes. */
const LANGUAGES: Readonly<Record<string, string>> = { c: 'C', h: 'C', cc: 'C++', cpp: 'C++', hpp: 'C++', rs: 'Rust', go: 'Go', py: 'Python', js: 'JavaScript', mjs: 'JavaScript',
  ts: 'TypeScript', tsx: 'TypeScript', java: 'Java', rb: 'Ruby', lua: 'Lua', tcl: 'Tcl', sh: 'Shell', bash: 'Shell', md: 'Markdown', json: 'JSON', yml: 'YAML', yaml: 'YAML',
  toml: 'TOML', conf: 'Configuration', txt: 'Text', sql: 'SQL', html: 'HTML', css: 'CSS' };
export function languageOf(repositoryPath: string): string {
  const base = repositoryPath.slice(repositoryPath.lastIndexOf('/') + 1);
  if (base === 'Makefile' || base === 'makefile') return 'Makefile';
  const dot = base.lastIndexOf('.');
  return (dot > 0 ? LANGUAGES[base.slice(dot + 1).toLowerCase()] : undefined) ?? 'Source';
}

export function buildLocalInput(inputs: BuildInputs): Built {
  const { opened, doc, derived, review, design, screen, credential, algorithm, briefRecord, fidelityContinuation, designContinuation } = inputs;
  const { run, runId, subject, declared } = opened;
  const pinned = subject.pinnedRevision.commit;
  const clean = (value: string): string => (screen.screenBody(value) === 'secret-detector-match' ? WITHHELD_TEXT : value);
  const shownPath = (repositoryPath: string): string => (screen.screenPath(repositoryPath) === 'secret-detector-match' ? SECRET_PATH : repositoryPath);

  // The class gate (`class-gate.ts`): the design packet carries these pages to a review session, so a blob screening admitted under a
  // class the run does not declare is neither quoted nor put on a source page; it is a counted row naming the class.
  const consented = opened.contentClasses;
  const withheldClass = new Map<string, string>();
  for (const repositoryPath of derived.admitted.keys()) {
    const missing = unconsentedClass(screen.contentClass(repositoryPath), consented);
    if (missing !== undefined) withheldClass.set(repositoryPath, missing);
  }
  // A body retained as redacted-span is partially retained, never "not retained" (syzygy-ts8u): its withheld and total line counts.
  const redacted = new Map([...derived.admitted].flatMap(([repositoryPath, blob]) => (blob.withheld === undefined ? [] : [[repositoryPath, { withheld: blob.withheld.length, lines: blob.retainedLines!.length }] as const])));
  const admitted = new Map([...derived.admitted].filter(([repositoryPath]) => !withheldClass.has(repositoryPath)));

  // Dossier spec v1.5 (`withheld-items.ts`): how each cited span stands at this render, read as the fidelity packet reads it. A span is
  // withheld when its blob is excluded whole or is not UTF-8, or when its range touches a line screening redacts, or its retained text
  // matches a detector; a span of a blob the class gate keeps from agent-bound artifacts keeps its own treatment.
  const outcomeOf = new Map(derived.citedBlobs.flatMap((cited) => (cited.path === null ? [] : [[cited.path, cited.outcome] as const])));
  const spanStanding = (citation: Readonly<Record<string, unknown>>): SpanStanding => {
    const cited = text(citation['path']);
    if (cited === undefined) return 'other';
    const blob = admitted.get(cited);
    // A blob the class gate withholds is not in `admitted` and its screening outcome is `admitted`, so it stands `other`.
    if (blob === undefined) {
      const outcome = outcomeOf.get(cited) ?? screen.screenPath(cited);
      return outcome === undefined || outcome === 'admitted' ? 'other' : packetSpanStanding(outcome);
    }
    const startLine = citation['startLine'], endLine = citation['endLine'];
    if (typeof startLine !== 'number' || typeof endLine !== 'number') return 'other';
    if (blob.withheld === undefined) return 'admitted';
    if (spanTouchesWithheld(blob.withheld, startLine, endLine)) return 'withheld';
    return screen.screenBody(blob.retainedLines!.slice(startLine - 1, endLine).join('')) === 'secret-detector-match' ? 'withheld' : 'admitted';
  };
  const standingIn = (value: Readonly<Record<string, unknown>>): ((citationId: string) => SpanStanding) => {
    const by = new Map(list(value['citations']).filter(isRecord).flatMap((citation) => (text(citation['id']) === undefined ? [] : [[text(citation['id'])!, spanStanding(citation)] as const])));
    return (citationId) => by.get(citationId) ?? 'other';
  };
  // A withheld item's note: the withheld files it rests on, cited or quoted, and those it may name.
  const withheldNote = (value: Readonly<Record<string, unknown>>): WithheldNote | undefined => {
    const standing = standingIn(value);
    if (!isWithheldItem(value, standing)) return undefined;
    const { cited, quoted } = citationIdsOf(value);
    const ids = new Set([...cited, ...quoted].filter((id) => standing(id) === 'withheld'));
    const files = new Set(list(value['citations']).filter(isRecord).flatMap((citation) => (ids.has(text(citation['id']) ?? '') && text(citation['path']) !== undefined ? [text(citation['path'])!] : [])));
    const named = [...files].filter((file) => screen.screenPath(file) !== 'secret-detector-match').sort();
    return { sources: files.size, named };
  };
  const withheldSpanCount = (value: Readonly<Record<string, unknown>>): number => {
    const standing = standingIn(value);
    return citationIdsOf(value).cited.filter((id) => standing(id) === 'withheld').length;
  };

  // Sources: every cited blob read now and admitted (whole, or in pieces when too long to quote whole), and every cited blob screening
  // excluded or the class gate withheld as a counted row with its reason. A blob whose path a secret detector matches is named nowhere.
  const sources: GenerationSource[] = [];
  const pieces = new Map<string, GenerationSource[]>();
  const sourceIdOf = (repositoryPath: string): string => `src-${sha256(repositoryPath).slice(0, 24)}`;
  for (const [repositoryPath, blob] of [...admitted].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    const identity = { sourceId: sourceIdOf(repositoryPath), repositoryId: subject.repository.repositoryId, revision: pinned, path: repositoryPath, objectId: blob.objectId, evaluationId: runId };
    const own = blob.withheld === undefined ? generationSourcesForBody({ ...identity, body: blob.raw })
      : generationSourcesForRedactedBody({ ...identity, projection: blob.projection!, policySha256: screen.policySha256 });
    pieces.set(repositoryPath, [...own]);
    sources.push(...own);
  }
  // The excluded rows' identifiers are keyed by the run and its pinned revision, not by a fresh key per render, so a later render of the
  // same subject names them alike and a rendered-design review of these pages survives it. The key hides nothing the page does not show:
  // each such row names its path, and no row is written for a path a secret detector matches.
  const runKey = createHash('sha256').update(`polaris-dossier excluded-source key\u0000${runId}\u0000${pinned}`).digest();
  for (const cited of derived.citedBlobs) {
    if (cited.path === null || cited.objectId === null) continue;
    // The closed exclusion vocabulary has no class reason; a withheld body is one not carried into generation, and its class is named on
    // the discovery page's row for it.
    const reason = cited.outcome !== 'admitted' ? EXCLUSION_REASON[cited.outcome] : withheldClass.has(cited.path) ? 'body-not-retained-for-generation' : undefined;
    if (reason === undefined) continue;
    sources.push({
      // Version 8: a private repository's excluded or withheld blob keeps its object id only in the run directory's check records and
      // review packets, never on a page (the code-structure rule).
      sourceId: excludedSourceId(runKey, cited.path), repositoryId: subject.repository.repositoryId, revision: pinned, path: cited.path, objectId: screen.visibility === 'private' ? null : cited.objectId,
      evaluationId: runId, classificationBasis: cited.read ? 'body' : 'path-only', exclusion: { excluded: true, reason }, spans: [],
    });
  }
  if (sources.length === 0) return { ok: false, stage: 'sources', reason: 'the draft cites no blob Syzygy can name, so there is no source population to render' };
  const byteOf = (raw: string, line: number): number => {
    let at = 0;
    for (let seen = 1; seen < line; seen++) {
      const next = raw.slice(at).search(/\r\n|\r|\n/u);
      if (next === -1) return Buffer.byteLength(raw);
      at += next + (raw.slice(at + next, at + next + 2) === '\r\n' ? 2 : 1);
    }
    return Buffer.byteLength(raw.slice(0, at));
  };
  const pieceAt = (repositoryPath: string, byte: number): GenerationSource | undefined => {
    const own = pieces.get(repositoryPath);
    if (own === undefined) return undefined;
    return own.find(piece => piece.redaction === undefined
      ? piece.segment === undefined || (byte >= piece.segment.start && byte < piece.segment.end)
      : piece.spans.some(span => { const [start, end] = generationSpanRange(piece, span); return byte >= start && byte < end; }));
  };
  const citedSources = (value: Readonly<Record<string, unknown>>): string[] => [...new Set(list(value['citations']).flatMap((citation) => {
    if (!isRecord(citation)) return [];
    const cited = text(citation['path']);
    const blob = cited === undefined ? undefined : admitted.get(cited);
    const piece = blob === undefined ? undefined : pieceAt(cited!, blob.lineByteOffsets?.[(typeof citation['startLine'] === 'number' ? citation['startLine'] : 1) - 1] ?? byteOf(blob.raw, typeof citation['startLine'] === 'number' ? citation['startLine'] : 1));
    return piece === undefined ? [] : [piece.sourceId];
  }))];
  // The cited lines behind each citation mark, by claim and source piece: a mark shows its file and lines on hover and focus (v1.5). These
  // are the draft's ranges, checked against the blob at this render; a withheld item's are never shown, since it cites no admitted piece.
  const citationLines = new Map<string, Map<string, string>>();
  const cites = (claimId: string, value: Readonly<Record<string, unknown>>): string[] => {
    const lines = new Map<string, string[]>();
    for (const citation of list(value['citations']).filter(isRecord)) {
      const [sourceId] = citedSources({ citations: [citation] });
      const startLine = citation['startLine'], endLine = citation['endLine'];
      if (sourceId === undefined || typeof startLine !== 'number' || typeof endLine !== 'number') continue;
      lines.set(sourceId, [...(lines.get(sourceId) ?? []), startLine === endLine ? `line ${startLine}` : `lines ${startLine}\u2013${endLine}`]);
    }
    if (lines.size > 0) citationLines.set(claimId, new Map([...lines].map(([sourceId, ranges]) => [sourceId, [...new Set(ranges)].join(', ')])));
    return citedSources(value);
  };
  const anchorOf = (source: GenerationSource, start: number, end: number): EvidenceAnchor => ({
    targetClass: 'evidence-artifact-identifier-with-integrity-digest', identifier: source.objectId!, algorithm, fragment: { start, end }, targetState: pinned, pathLabel: source.path,
  });
  const sourceAnchors = new Map(sources.filter((source) => !source.exclusion.excluded && source.spans.length > 0).map((source) => {
    const [start, end] = generationSpanRange(source, source.spans[0]!);
    return [source.sourceId, anchorOf(source, start, end)] as const;
  }));

  // Claim blocks: segments from the agent's text with every quotation replaced by Syzygy's located bytes, and the marking.
  // A quotation verified against a body the class gate withholds is withheld like one from an excluded file, naming the class.
  const verified = new Map(derived.quotations.filter((quotation) => !withheldClass.has(quotation.path)).map((quotation) => [`${quotation.blockId}\u0000${quotation.index}`, quotation]));
  const classOf = new Map(derived.quotations.filter((quotation) => withheldClass.has(quotation.path)).map((quotation) => [`${quotation.blockId}\u0000${quotation.index}`, withheldClass.get(quotation.path)!]));
  const excluded = new Set([...derived.excludedContent.map((quotation) => `${quotation.blockId}\u0000${quotation.index}`), ...classOf.keys()]);
  const executions = new Map(list(doc['executions']).flatMap((entry) => (isRecord(entry) && text(entry['id']) !== undefined ? [[text(entry['id'])!, clean(text(entry['command']) ?? '')] as const] : [])));
  const support = review.counts ? review.verdict.blockSupport : {};
  const blocks = new Map<string, LocalBlock>();
  let withheldExcerpts = 0;
  for (const block of collectBlocks(doc).filter((candidate) => candidate.textKey === 'text')) {
    const value = block.value;
    const id = text(value['id'])!;
    const prose = text(value['text']) ?? '';
    const label = value['label'];
    // A withheld item (dossier spec v1.5): none of the agent's text for it renders, since the agent read the clone without restriction and
    // its text may derive from what screening withheld (RFC2-23). Syzygy says what is withheld, with the count on the item (RFC5-17).
    const held = label === 'non-normative' ? undefined : withheldNote(value);
    if (held !== undefined) {
      blocks.set(id, { marking: 'unknown', unknownReason: 'excluded-content', basis: WITHHELD_BASIS, segments: [{ kind: 'prose', text: withheldSentence(held) }], executions: [], withheld: held });
      continue;
    }
    const judgement = label === 'inferred' && value['judgement'] === true ? (list(value['citations']).length === 0 ? 'uncited' as const : 'cited' as const) : undefined;
    const marks = { ...(judgement === undefined ? {} : { judgement }), ...(withheldSpanCount(value) === 0 ? {} : { withheldSpans: withheldSpanCount(value) }) };
    let segments: LocalSegment[] = [];
    let at = 0;
    let withheld = false;
    const unconsented = new Set<string>();
    leadInQuotationSpans(prose).forEach((span, index) => {
      segments.push({ kind: 'prose', text: prose.slice(at, span.open) });
      const key = `${id}\u0000${index}`;
      const found = verified.get(key);
      if (found !== undefined) {
        const blob = admitted.get(found.path)!;
        const [start, end] = found.byteRange;
        const piece = pieceAt(found.path, start)!;
        segments.push({ kind: 'quotation', sourceId: piece.sourceId, start, end, text: generationSourceTextAt(piece, start, end)!, anchor: anchorOf(piece, start, end) });
      } else {
        if (!excluded.has(key)) throw new Error(`render: quotation ${index + 1} of block ${id} was neither verified nor excluded at this render`);
        segments.push({ kind: 'withheld', reason: 'excluded-content' });
        withheld = true;
        if (classOf.has(key)) unconsented.add(classOf.get(key)!);
      }
      at = span.close + 1;
    });
    segments.push({ kind: 'prose', text: prose.slice(at) });
    const secret = screen.screenBody(prose) === 'secret-detector-match';
    if (secret) segments = [{ kind: 'prose', text: WITHHELD_TEXT }];
    segments = segments.filter((part) => part.kind !== 'prose' || part.text !== '');
    const named = list(value['executionIds']).flatMap((executionId) => (typeof executionId === 'string' && executions.has(executionId) ? [{ id: executionId, command: executions.get(executionId)! }] : []));
    const unknown = (reason: string, basis: string): LocalBlock => ({ marking: 'unknown', unknownReason: reason, basis, segments, executions: named, ...marks });
    if (label === 'non-normative') blocks.set(id, { marking: 'non-normative', unknownReason: null, basis: 'the agent marks this block non-normative: it claims nothing from a source', segments, executions: [] });
    else if (label === 'unknown') blocks.set(id, unknown(text(value['reason']) ?? 'missing-evidence', 'the agent labels this block Unknown'));
    else if (withheld || secret) {
      blocks.set(id, unknown('excluded-content', secret ? 'a secret detector matches its text, so it is withheld'
        : unconsented.size > 0 ? `a quotation it rests on is from a ${[...unconsented].sort().join(' or ')} file, ${unconsentedText([...unconsented].sort().join(' or '), consented).replace(/^withheld/u, 'which is withheld')}, so the quotation is not shown`
          : 'a quotation it rests on is from a file screening excludes, so the quotation is neither verified nor shown'));
    }
    else if (support[id] === 'supported') {
      blocks.set(id, { marking: 'inferred', unknownReason: null, basis: 'the agent\'s claim, which the counted fidelity review judged supported by the spans it cites', segments, executions: named, ...marks });
    } else if (judgement === 'uncited' && support[id] === 'advisory') {
      blocks.set(id, { marking: 'inferred', unknownReason: null, basis: JUDGEMENT_BASIS, segments, executions: named, ...marks });
    } else {
      blocks.set(id, unknown('missing-evidence', review.counts ? `the counted fidelity review judged it ${support[id] ?? 'not at all'}, not supported` : `no fidelity review counts for this draft: ${review.why}`));
    }
  }

  // A code excerpt: the cited lines from Syzygy's own read, as one quotation per source piece they fall in, never the draft's text. A
  // blob screening or the class gate withholds, or a range touching a withheld line, renders withheld with none of its bytes.
  const excerpt = (repositoryPath: string, startLine: number, endLine: number): LocalSegment[] => {
    const withheld: LocalSegment[] = [{ kind: 'withheld', reason: 'excluded-content' }];
    const blob = admitted.get(repositoryPath);
    if (blob === undefined || (blob.withheld !== undefined && blob.withheld.some((n) => n >= startLine && n <= endLine))) return withheld;
    const start = blob.lineByteOffsets?.[startLine - 1] ?? byteOf(blob.raw, startLine);
    const end = blob.lineByteOffsets === undefined ? byteOf(blob.raw, endLine + 1) : blob.lineByteOffsets[endLine] ?? blob.originalBytes!;
    const parts: LocalSegment[] = [];
    for (let at = start; at < end;) {
      const piece = pieceAt(repositoryPath, at);
      if (piece === undefined) return withheld;
      const covering = piece.redaction === undefined ? [piece.segment?.start ?? 0, piece.segment?.end ?? Buffer.byteLength(blob.raw)]
        : piece.spans.map((span) => generationSpanRange(piece, span)).find(([a, b]) => at >= a && at < b);
      if (covering === undefined) return withheld;
      const until = Math.min(end, covering[1]!);
      const shown = generationSourceTextAt(piece, at, until);
      if (shown === undefined) return withheld;
      parts.push({ kind: 'quotation', sourceId: piece.sourceId, start: at, end: until, text: shown, anchor: anchorOf(piece, at, until) });
      at = until;
    }
    return parts.length === 0 ? withheld : parts;
  };

  // The draft in the renderer's shape. Only admitted sources are cited; a block whose every citation is excluded cites none.
  const plain = (id: string): string => {
    const block = blocks.get(id);
    const joined = block === undefined ? '' : block.segments.map((part) => (part.kind === 'withheld' ? '[withheld]' : part.text)).join('');
    return joined === '' ? '[no text]' : joined;
  };
  const paragraph = (value: unknown): DraftParagraph => {
    const record = isRecord(value) ? value : {};
    return { id: text(record['id'])!, text: plain(text(record['id'])!), sourceIds: record['label'] === 'non-normative' ? [] : cites(text(record['id'])!, record) };
  };
  const label = (value: unknown): string => clean(text(value) ?? '');
  // A code excerpt whose cited span is withheld (v1.5): counted, and a label over it alone reads `Withheld item`.
  const excerptHeld = (record: Readonly<Record<string, unknown>>): boolean => isRecord(record['citation']) && spanStanding(record['citation']) === 'withheld';
  // Whether everything a short label stands over is withheld: at least one claim block or excerpt, every one a withheld item or a
  // withheld excerpt. Such a label is the agent's text over withheld content, so it renders as Syzygy's `Withheld item` (v1.5).
  const leaves = (value: unknown): boolean[] => {
    if (Array.isArray(value)) return value.flatMap(leaves);
    if (!isRecord(value)) return [];
    if (value['kind'] === 'code') return [excerptHeld(value)];
    if (value['kind'] === 'empty') return [];
    const own = typeof value['id'] === 'string' && blocks.has(value['id']) ? [blocks.get(value['id'])!.withheld !== undefined] : [];
    return [...own, ...['children', 'items', 'entries', 'rows', 'cells', 'elements', 'definition', 'body', 'paragraphs'].flatMap((key) => leaves(value[key]))];
  };
  const heldOver = (value: unknown): boolean => { const all = leaves(value); return all.length > 0 && all.every(Boolean); };
  const over = (content: unknown, value: unknown): string => (heldOver(content) ? WITHHELD_LABEL : label(value));
  const repeats = (record: Readonly<Record<string, unknown>>): { readonly repeatsDiagram?: string } => (text(record['repeatsDiagram']) === undefined ? {} : { repeatsDiagram: text(record['repeatsDiagram'])! });
  const entry = (value: unknown): DraftBlock => {
    const record = isRecord(value) ? value : {};
    const kind = record['kind'];
    if (kind === undefined) return { ...paragraph(value), children: list(record['children']).map(paragraph) };
    const shell = { id: text(record['id'])!, text: '', sourceIds: [], children: [] };
    const records = (key: string): Readonly<Record<string, unknown>>[] => list(record[key]).filter(isRecord);
    switch (kind) {
      case 'table': return { ...shell, element: { kind: 'table', caption: over(record['rows'], record['caption']), columns: list(record['columns']).map((column) => over(record['rows'], column)), rowHeaders: record['rowHeaders'] === true,
        rows: records('rows').map((row) => ({ id: text(row['id'])!, cells: list(row['cells']).map((cell) => (isRecord(cell) && cell['kind'] === 'empty' ? null : paragraph(cell))) })) } };
      case 'callout': return { ...shell, element: { kind: 'callout', tone: record['tone'] as 'note' | 'tip' | 'caution' | 'important', title: over(record['children'], record['title']), children: list(record['children']).map(entry) } };
      case 'steps': return { ...shell, element: { kind: 'steps', items: list(record['items']).map(paragraph), ...repeats(record) } };
      case 'definitions': return { ...shell, element: { kind: 'definitions', entries: records('entries').map((item) => ({ term: over(item['definition'], item['term']), definition: paragraph(item['definition']) })), ...repeats(record) } };
      case 'cards': return { ...shell, element: { kind: 'cards', items: records('items').map((item) => ({ label: over(item['body'], item['label']), body: paragraph(item['body']) })), ...repeats(record) } };
      case 'details': return { ...shell, element: { kind: 'details', summary: over(record['elements'], record['summary']), elements: list(record['elements']).map(entry) } };
      case 'code': {
        const cited = isRecord(record['citation']) ? record['citation'] : {};
        const repositoryPath = text(cited['path'])!;
        const startLine = cited['startLine'] as number, endLine = cited['endLine'] as number;
        if (excerptHeld(record)) withheldExcerpts += 1;
        const language = text(record['language']) === undefined ? languageOf(repositoryPath) : label(record['language']);
        return { ...shell, element: { kind: 'code', language, path: shownPath(repositoryPath), startLine, endLine, parts: excerpt(repositoryPath, startLine, endLine) } };
      }
      default: throw new Error(`render: unknown element kind ${JSON.stringify(kind)}`);
    }
  };
  const tree = (values: unknown): DraftBlock[] => list(values).map(entry);
  const disposition = (value: unknown): DossierDraft['sections'][number]['disposition'] => {
    const record = isRecord(value) ? value : {};
    if (record['kind'] === 'produced') return { kind: 'produced', assetIds: list(record['assetIds']).filter((id): id is string => typeof id === 'string') };
    return { kind: record['kind'] === 'omitted' ? 'omitted' : 'unresolved', reason: clean(text(record['reason']) ?? ''), references: citedSources(record) };
  };
  const title = (value: unknown): string => clean(text(value) ?? '');
  // Diagram nodes and edges, and understanding items, that are withheld items, by claim id (v1.5).
  const withheldElements = new Map<string, WithheldNote>();
  const element = (prefix: string, value: Readonly<Record<string, unknown>>): { readonly held: WithheldNote | undefined } => {
    const held = withheldNote(value);
    if (held !== undefined) withheldElements.set(`${prefix}${text(value['id'])!}`, held);
    return { held };
  };
  const diagramHeld = (diagram: Readonly<Record<string, unknown>>): boolean => {
    const parts = [...list(diagram['nodes']), ...list(diagram['edges'])].filter(isRecord);
    return parts.length > 0 && parts.every((part) => withheldNote(part) !== undefined);
  };
  // A section's or deep dive's title over paragraphs and diagrams that are all withheld.
  const containerTitle = (container: Readonly<Record<string, unknown>>, diagrams: readonly Readonly<Record<string, unknown>>[]): string => {
    const paragraphs = leaves(container['paragraphs']);
    const held = paragraphs.every(Boolean) && diagrams.every(diagramHeld) && paragraphs.length + diagrams.length > 0;
    return held ? WITHHELD_LABEL : title(container['title']);
  };
  const diagramRecords = list(doc['diagrams']).filter(isRecord);
  const draft: DossierDraft = {
    title: title(doc['title']),
    introduction: paragraph(doc['introduction']),
    sections: list(doc['sections']).filter(isRecord).map((section) => ({ id: text(section['id'])!, title: containerTitle(section, diagramRecords.filter((diagram) => diagram['sectionId'] === section['id'])), paragraphs: tree(section['paragraphs']), disposition: disposition(section['disposition']) })),
    diagrams: diagramRecords.map((diagram) => {
      const held = diagramHeld(diagram);
      return {
        id: text(diagram['id'])!, title: held ? WITHHELD_LABEL : title(diagram['title']), sectionId: text(diagram['sectionId'])!, kind: diagram['kind'] as DossierDraft['diagrams'][number]['kind'], relationship: held ? WITHHELD_LABEL : title(diagram['relationship']),
        nodes: list(diagram['nodes']).filter(isRecord).map((node) => {
          const { held: gone } = element('', node);
          return { id: text(node['id'])!, label: gone === undefined ? title(node['label']) : WITHHELD_LABEL, sourceIds: cites(text(node['id'])!, node), epistemic: gone === undefined && node['epistemic'] === 'inferred' ? 'inferred' as const : 'unknown' as const };
        }),
        edges: list(diagram['edges']).filter(isRecord).map((edge) => {
          const { held: gone } = element('', edge);
          return { id: text(edge['id'])!, from: text(edge['from'])!, to: text(edge['to'])!, label: gone === undefined ? title(edge['label']) : WITHHELD_LABEL, sourceIds: cites(text(edge['id'])!, edge), epistemic: gone === undefined && edge['epistemic'] === 'inferred' ? 'inferred' as const : 'unknown' as const };
        }),
        disposition: disposition(diagram['disposition']),
      };
    }),
    deepDives: list(doc['deepDives']).filter(isRecord).map((dive) => ({ id: text(dive['id'])!, title: containerTitle(dive, []), sectionId: text(dive['sectionId'])!, paragraphs: tree(dive['paragraphs']), disposition: disposition(dive['disposition']) })),
    unresolved: list(doc['unresolved']).filter(isRecord).map((item) => ({ question: title(item['question']), reason: title(item['reason']), references: citedSources(item) })),
  };

  // The run's own pages.
  const understanding = isRecord(doc['understanding']) ? doc['understanding'] : {};
  const understandingItem = (prefix: string, value: unknown): LocalPageItem => {
    const record = isRecord(value) ? value : {};
    // An understanding item's identity is its short label (a glossary term is its id), so a withheld one takes a Syzygy-numbered identity.
    const held = withheldNote(record);
    if (held !== undefined) {
      const id = `${prefix}/withheld-${[...withheldElements.keys()].filter((key) => key.startsWith(`${prefix}/`)).length + 1}`;
      withheldElements.set(id, held);
      return { id, marking: 'unknown', unknownReason: 'excluded-content', title: WITHHELD_LABEL, text: withheldSentence(held), details: [], sourceIds: citedSources(record) };
    }
    const unknown = record['label'] === 'unknown';
    return {
      id: `${prefix}/${text(record['id'])!}`, marking: unknown ? 'unknown' : 'inferred', unknownReason: unknown ? text(record['reason']) ?? 'missing-evidence' : null,
      title: text(record['id'])!, text: clean(text(record['statement']) ?? ''), details: [`Scope: ${clean(text(record['scope']) ?? '')}`], sourceIds: cites(`${prefix}/${text(record['id'])!}`, record),
    };
  };
  // A term drawn from a withheld item renders nowhere in the glossary (v1.5); the understanding page counts it as withheld.
  const glossary = list(understanding['terminology']).filter((value) => !isRecord(value) || withheldNote(value) === undefined).map((value) => understandingItem('glossary', value));
  const understandingPage: LocalPage = {
    path: 'understanding.html', title: 'Understanding',
    intro: 'The agent\'s understanding record, which it reports forming before it drafted the argument (that order is its own report). Every item is its self-reported understanding: Inferred where it cites the files it rests on, Unknown with its reason where it could not be established.',
    groups: UNDERSTANDING_ITEMS.map((key) => ({ id: `understanding-${key}`, heading: UNDERSTANDING_HEADINGS[key], note: 'Self-reported by the agent; Inferred or Unknown.', empty: 'No entry.', items: list(understanding[key]).map((value) => understandingItem('understanding', value)) })),
  };
  const discovery = isRecord(doc['discovery']) ? doc['discovery'] : {};
  const reported = (part: string): LocalPageItem[] => list(discovery[part]).filter(isRecord).map((entry, i) => ({
    id: `discovery/${part}/${i + 1}`, marking: 'inferred', unknownReason: null, title: shownPath(text(entry['path']) ?? ''), text: clean(text(entry['reason']) ?? ''), details: [], sourceIds: [],
  }));
  // Each selected path's reason, for the sources index; repeated entries for one path keep every distinct reason, in order. The index
  // looks a reason up by a listed source's path, which is never a path a secret detector matches.
  const reasonsByPath = new Map<string, Set<string>>();
  for (const entry of list(discovery['selected']).filter(isRecord)) {
    const path = text(entry['path']), reason = clean(text(entry['reason']) ?? '');
    if (path === undefined) continue;
    reasonsByPath.set(path, (reasonsByPath.get(path) ?? new Set()).add(reason));
  }
  const selectionReasons: ReadonlyMap<string, string> = new Map([...reasonsByPath].map(([path, reasons]) => [path, [...reasons].join(' ')]));
  const inspected = list(discovery['inspected']).filter((entry): entry is string => typeof entry === 'string');
  const observedReads: LocalPageItem[] = derived.citedBlobs.map((cited, i) => ({
    id: `discovery/read/${i + 1}`, marking: 'observed', unknownReason: null,
    title: cited.path === null ? SECRET_PATH : cited.path,
    text: cited.outcome !== 'admitted' ? `${cited.read ? 'read at this render and re-hashed' : 'named by the pinned tree and not read'}; excluded by screening (${cited.outcome})`
      : cited.path !== null && withheldClass.has(cited.path) ? `read at this render, re-hashed, and admitted by screening as ${withheldClass.get(cited.path)!}; ${unconsentedText(withheldClass.get(cited.path)!, consented)} (${CLASS_NOT_CONSENTED})`
        : cited.path !== null && redacted.has(cited.path) ? `read at this render, re-hashed, and ${redactedExtent(redacted.get(cited.path)!)}; each withheld run is marked on its source page; surviving spans retain their original coordinates`
        : 'read at this render, re-hashed, and admitted by screening',
    details: [`object ${cited.objectId === null || (screen.visibility === 'private' && (cited.outcome !== 'admitted' || (cited.path !== null && withheldClass.has(cited.path)))) ? '(not shown)' : `${algorithm}:${cited.objectId}`}`, `revision ${pinned}`, ...redactionDetails(cited.redaction)],
    sourceIds: cited.outcome === 'admitted' && cited.path !== null ? (pieces.get(cited.path) ?? []).slice(0, 1).map((source) => source.sourceId) : [],
  }));
  const discoveryPage: LocalPage = {
    path: 'discovery.html', title: 'Discovery',
    intro: 'Two populations, kept apart. The first is the agent\'s own account of what it read, selected and set aside: self-reported, Inferred, never complete or verified, and no Observed coverage or not-read figure is drawn from it. The second is the set of objects this render itself read at the pinned revision, each re-hashed: Observed. Which objects earlier steps read is not shown.',
    groups: [
      { id: 'discovery-inspected', heading: 'Inspected, as the agent reports', note: 'Self-reported; Inferred.', empty: 'The agent reports no inspected path.', items: inspected.length === 0 ? [] : [{ id: 'discovery/inspected', marking: 'inferred', unknownReason: null, title: null, text: `The agent reports inspecting ${inspected.length} path(s).`, details: inspected.map(shownPath), sourceIds: [] }] },
      { id: 'discovery-selected', heading: 'Selected, as the agent reports', note: 'Self-reported, with the agent\'s reasons; Inferred.', empty: 'None reported.', items: reported('selected') },
      { id: 'discovery-excluded', heading: 'Excluded, as the agent reports', note: 'Self-reported, with the agent\'s reasons; Inferred.', empty: 'None reported.', items: reported('excluded') },
      { id: 'discovery-unresolved', heading: 'Could not resolve, as the agent reports', note: 'Self-reported, with the agent\'s reasons; Inferred.', empty: 'None reported.', items: reported('unresolved') },
      { id: 'discovery-deferred', heading: 'Deferred, as the agent reports', note: 'Self-reported, with the agent\'s reasons; Inferred.', empty: 'None reported.', items: reported('deferred') },
      { id: 'discovery-stopping', heading: 'Stopping reason, as the agent reports', note: 'Self-reported; Inferred.', empty: 'None reported.', items: [{ id: 'discovery/stopping-reason', marking: 'inferred', unknownReason: null, title: null, text: clean(text(discovery['stoppingReason']) ?? ''), details: [], sourceIds: [] }] },
      { id: 'discovery-read', heading: 'Read by this render', note: `Every cited object this render read by identifier at revision ${pinned}, its identifier recomputed from the bytes, with its screening outcome; Observed at this render.`, empty: 'This render read no object.', items: observedReads },
    ],
  };
  const clarificationsPage: LocalPage = {
    path: 'clarifications.html', title: 'Clarifications',
    intro: 'The questions the agent asked and the answers it records, each attributed to the operator. That the operator gave the answer is the agent\'s record: Inferred.',
    groups: [{ id: 'clarifications-asked', heading: 'Questions and answers', note: 'As the draft records them; Inferred.', empty: 'The agent recorded no question.', items: list(doc['clarifications']).filter(isRecord).map((entry) => ({
      id: `clarification/${text(entry['id'])!}`, marking: 'inferred' as const, unknownReason: null, title: clean(text(entry['question']) ?? ''), text: clean(text(entry['answer']) ?? ''),
      details: [`Answer kind: ${text(entry['answerKind']) ?? ''}`, `Consequence: ${clean(text(entry['consequence']) ?? '')}`, ...list(entry['options']).flatMap((option) => (typeof option === 'string' ? [`Option: ${clean(option)}`] : [])), 'Answered by the operator, as the agent records it'],
      sourceIds: citedSources({ citations: entry['evidence'] }),
    })) }],
  };
  const executionList = list(doc['executions']).filter(isRecord);
  const rawArm = isRecord(briefRecord?.['executionRule']) ? briefRecord['executionRule']['arm'] : undefined;
  const briefArm = rawArm === 'sec-3' || rawArm === 'permitting' ? rawArm : null;
  const flags = executionFlags(executionList, subject.clone.path, briefArm);
  const executionsPage: LocalPage = {
    path: 'executions.html', title: 'Executions',
    intro: 'Every command the agent reports having run. Syzygy cannot observe what the agent ran and ran nothing itself: the list is the agent\'s own report, Inferred, and not complete or Observed.',
    groups: [{ id: 'executions-reported', heading: 'Reported commands', note: 'Self-reported; Inferred.', empty: 'The agent reports running no command.', items: executionList.map((entry, index) => ({
      id: `execution/${text(entry['id'])!}`, marking: 'inferred' as const, unknownReason: null, title: clean(text(entry['command']) ?? ''), text: clean(text(entry['purpose']) ?? ''),
      details: [
        `Working directory: ${text(entry['workingDirectory']) === undefined ? 'not reported' : clean(text(entry['workingDirectory'])!)}`,
        ...(flags.applies ? [`Scope, as the agent states it: ${flags.commands[index]!.scope === 'not-stated' ? 'not stated' : flags.commands[index]!.scope}`] : []),
        ...(flags.applies ? flags.commands[index]!.flags.map((flag) => `Flagged (Inferred, self-reported): ${flag.detail}`) : []),
      ], sourceIds: [],
    })) }],
  };
  if (review.counts && fidelityContinuation === null) return { ok: false, stage: 'render', reason: 'The counted fidelity review has no captured continuation input.' };
  const reviewItems: LocalPageItem[] = review.counts ? [
    { id: 'review/fidelity/binding', marking: 'observed', unknownReason: null, title: 'Fidelity review binding', text: `Syzygy rebuilt the fidelity packet from the frozen draft and inventory at this render; its digest is ${review.packetSha256}, and the counted verdict names that digest.`, details: [], sourceIds: [] },
    { id: 'review/fidelity/verdict', marking: 'inferred', unknownReason: null, title: 'Fidelity verdict', text: `The review session declares the draft ${review.verdict.readiness}${review.verdict.blocking ? ', beside a blocking finding' : ''}.`,
      details: [`Review session identifier ${review.sessionId.value}, as that session declares it`, `Launch form ${review.launchForm.value}, as the operator declares it`, ...review.inferred.basis], sourceIds: [] },
    // A reviewer that continued across revisions is disclosed (owner direction POLARIS-DOSSIER-WAITING-SESSIONS-2026-10-08).
    // The item renders for every counted verdict, whether or not v1.2 is signed in (review-408 round 4, finding 4): it adds a disclosure, never a
    // permission, and a reviewer that continued is disclosed under v1.1 too. Only the wait-mode steps wait on the sign-off.
    { id: 'review/fidelity/continuation', marking: 'inferred', unknownReason: null, title: fidelityContinuation!.continuing ? 'Continuing reviewer' : 'Reviewer continuity', text: fidelityContinuation!.text,
      details: [`From ${fidelityContinuation!.basis}`], sourceIds: [] },
  ] : [{ id: 'review/fidelity/none', marking: 'unknown', unknownReason: 'missing-evidence', title: 'Fidelity review', text: `No fidelity review counts for this draft: ${review.why}.`, details: [], sourceIds: [] }];
  const reviewPage: LocalPage = {
    path: 'review.html', title: 'Review',
    intro: 'The fidelity review of record. Only the packet Syzygy rebuilt, its digest and that the verdict names it are Observed; everything the verdict says is the review session\'s, Inferred. That the session read the packet unaltered, or had nothing else, is not observable.',
    groups: [
      { id: 'review-fidelity', heading: 'Fidelity review', note: 'Rebuilt and bound at this render.', empty: 'None.', items: reviewItems },
      // This page is part of what the design review reviews, so it never states that review's status: only the region does.
      { id: 'review-design', heading: 'Rendered-design review', note: 'Of these rendered pages, excluding the review-status region.', empty: DESIGN_REVIEW_WHERE, items: [] },
    ],
  };

  // RFC7-20 as the owner's reading applies it. The disclosure condition is checked on the rendered output (renderRun); the tool and
  // provider are declared in the run record, which refuses any run without them; every quotation is located at this render.
  const why: string[] = [];
  if (declared.agentTool.trim() === '' || declared.agentProvider.trim() === '') why.push('the agent tool or provider is not declared and recorded');
  const draftLayer: LocalDraftLayer = why.length === 0
    ? { state: 'editorial-draft', inferenceProvenance: { provider: declared.agentProvider, modelIdentity: declared.model,
      modelVersion: opened.effective?.kind === 'url' ? null : declared.modelVersion,
      declaredBy: opened.effective?.kind === 'url' && opened.effective.declaration.inference.modelSelection === 'supported-default' ? 'supported-default' : 'operator', label: 'Inferred' } }
    : { state: 'unknown', reason: 'missing-declaration', why };

  const quotationCount = [...blocks.values()].reduce((n, block) => n + block.segments.filter((part) => part.kind === 'quotation').length, 0);
  const disclosure = disclosureItems({ opened, draftLayer, executionList, flags, quotationCount, credential, clean, briefRecord });
  const reviewStatus: LocalDisclosureItem[] = [
    review.counts
      ? { id: 'review-status/fidelity', text: `Fidelity review: one counts, bound to packet ${review.packetSha256} rebuilt at this render; its verdict, ${review.verdict.readiness}, is the review session's.${fidelityContinuation!.continuing ? ' Its reviewer continued across revisions (see the review page).' : ''}`, label: 'Inferred' }
      : { id: 'review-status/fidelity', text: `Fidelity review: none counts (${review.why}).`, label: 'Unknown' },
    designStatusItem(design, designContinuation ?? null),
  ];

  const editorial = draftLayer.state === 'editorial-draft';
  const pages = editorial ? [understandingPage, discoveryPage, clarificationsPage, executionsPage, reviewPage] : [discoveryPage, executionsPage, reviewPage];
  return {
    ok: true,
    sources,
    local: {
      draft, withheldTitle: `Dossier of ${subject.repository.url} at ${pinned.slice(0, 12)}`, draftLayer, blocks, glossary, disclosure,
      sourceAnchors, pages, reviewStatus, withheldElements, citationLines,
      authoring: { tool: declared.agentTool, model: declared.model },
      ...(opened.effective?.kind === 'url' ? { effectiveRun: effectiveUrlProjection({ subject }, opened.effective.declaration) } : {}),
      selectionReasons,
      // A checked draft's Poles are whole: every section in one Pole and a named why section (check-derive's Pole findings).
      ...(Array.isArray(doc['poles']) && typeof doc['whySection'] === 'string' ? { poles: {
        whySection: doc['whySection'],
        // A Pole's label is a short label over its sections: over only withheld ones it reads as any such label does (v1.5).
        poles: doc['poles'].filter(isRecord).map((pole) => {
          const sections = list(pole['sections']).filter((id): id is string => typeof id === 'string');
          const held = sections.length > 0 && sections.every((id) => draft.sections.find((section) => section.id === id)?.title === WITHHELD_LABEL);
          return { label: held ? WITHHELD_LABEL : title(pole['label']), sections };
        }),
      } } : {}),
      counts: {
        uncitedJudgements: [...blocks.values()].filter((block) => block.judgement === 'uncited').length,
        withheldItems: [...blocks.values()].filter((block) => block.withheld !== undefined).length + withheldElements.size,
        withheldExcerpts,
        withheldInventoryEntries: review.counts ? review.withheldInventoryEntries : null,
      },
    },
  };
}

/** The Syzygy-written short label over content that is all withheld (dossier spec v1.5). */
export const WITHHELD_LABEL = 'Withheld item';
const WITHHELD_BASIS = 'every source it cites is withheld from this dossier by screening, or it quotes a withheld file, so the agent\'s text for it is not shown';
const JUDGEMENT_BASIS = 'the agent\'s own judgement, which cites nothing and asserts no project fact; the counted fidelity review found it advisory';

/** What Syzygy says in place of a withheld item's text: how many withheld files it rests on, naming those it may. */
export function withheldSentence(note: WithheldNote): string {
  const unnamed = note.sources - note.named.length;
  const names = [...note.named, ...(unnamed === 0 ? [] : [`${unnamed} not named, because a secret detector matches the path`])];
  return `Withheld from this dossier: it rests on ${note.sources} source file(s) that screening withholds (${names.join('; ')}), so its text is not shown.`;
}

const DESIGN_REVIEW_WHERE = 'Whether a rendered-design review counts for these pages is stated in the review-status region at the foot of every page, the only part of a page a later render may change without retiring that review; this page is part of what that review reviews, so it does not repeat it.';

/** The review-status region's line for the rendered-design review. */
export function designStatusItem(design: DesignReviewOfRecord | undefined, continuation: Continuation | null): LocalDisclosureItem {
  if (design === undefined) return { id: 'review-status/design', text: 'Rendered-design review: not yet decided at this render.', label: 'Unknown' };
  if (!design.counts) return { id: 'review-status/design', text: `Rendered-design review: none counts (${design.why}).`, label: 'Unknown' };
  // The design review's status lives only in this region, so its reviewer's continuity, continuing or not, is disclosed here, never on a
  // reviewed page.
  if (continuation === null) throw new Error('counted-design-continuation-unavailable');
  return { id: 'review-status/design', text: `Rendered-design review: one counts, bound to packet ${design.packetSha256}, which Syzygy built at this render from these pages outside this region; its verdict, ${design.verdict.readiness}${design.verdict.blocking ? ' beside a blocking finding' : ''}, is the review session's. ${continuation.text} (Inferred, from ${continuation.basis}.)`, label: 'Inferred' };
}

const UNDERSTANDING_HEADINGS: Readonly<Record<(typeof UNDERSTANDING_ITEMS)[number], string>> = {
  purpose: 'Purpose', beneficiary: 'Beneficiary', proposition: 'Proposition', capabilities: 'Capabilities', components: 'Components and relationships',
  choices: 'Choices and alternatives', tradeOffs: 'Trade-offs', limits: 'Limits', terminology: 'Terminology', contradictions: 'Contradictory accounts', openQuestions: 'Open questions',
};

/** The run disclosure REQ-polaris-generation-036 requires on every page and in the machine view. */
function disclosureItems(inputs: {
  readonly opened: Extract<OpenedRun, { ok: true }>; readonly draftLayer: LocalDraftLayer; readonly executionList: readonly Readonly<Record<string, unknown>>[];
  readonly flags: ExecutionFlags; readonly quotationCount: number; readonly credential: CredentialStepResult; readonly clean: (value: string) => string; readonly briefRecord: Readonly<Record<string, unknown>> | undefined;
}): LocalDisclosureItem[] {
  const { opened, draftLayer, executionList, flags, quotationCount, credential, clean, briefRecord: brief } = inputs;
  const { subject, declared } = opened;
  const rule = isRecord(brief) && isRecord(brief['executionRule']) ? brief['executionRule'] : {};
  const commands = executionList.map((entry) => clean(text(entry['command']) ?? ''));
  const items: LocalDisclosureItem[] = [
    { id: 'mode', text: 'Authoring mode: operator-agent. The operator\'s own agent session read the clone and wrote the draft; Syzygy pinned the revision, checked the draft and rendered these pages.', label: null },
    { id: 'agent', text: `Agent tool ${declared.agentTool} ${declared.agentToolVersion}, provider ${declared.agentProvider}, model ${declared.model}${declared.modelVersion === null ? ' (version not shown by the agent tool)' : ` ${declared.modelVersion}`}, as the operator declared them; no provider-reported model version exists in this mode.`, label: 'Inferred' },
    { id: 'declared-content-classes', text: `Eligible content classes: ${subject.contentClasses.join(', ')}; declarations, not an account of what the agent transmitted.`, label: 'Inferred' },
    { id: 'source-screening-boundary', text: 'SEC-2 and SEC-5 require the agent to send content only to its declared provider and never send secrets. Syzygy screens its own reads and artifacts; actual agent transmissions and compliance are not observed.', label: null },
    { id: 'read-account', text: 'The agent\'s account of what it read is its own report (Discovery): self-reported, never complete or verified.', label: 'Inferred' },
    rule['arm'] === 'permitting'
      ? { id: 'execution-rule', text: `The brief permitted building and running the observed project from the authoring session, under the owner's execution choice it names (who entered the choice is the operator's declaration). What that costs, as D9 states: ${isRecord(rule['cost']) ? text(rule['cost']['text']) ?? '' : ''}`, label: 'Inferred' }
      : { id: 'execution-rule', text: 'The brief carried SEC-3\'s rule: no building or running of the observed project outside an explicit, opt-in execution profile, and it granted none.', label: 'Inferred' },
    { id: 'reported-commands', text: commands.length === 0 ? 'The agent reports building or running nothing.' : `The agent reports running ${commands.length} command(s), whether or not a claim rests on them: ${commands.join('; ')}. This is its own report, not complete and not observed.`, label: 'Inferred' },
    ...(flags.applies ? [{ id: 'execution-flags', text: `Flagged reported commands: ${flags.flagged} of ${flags.commands.length}, each flag shown beside its command on the Executions page: a command without a reported working directory, with one outside the clone, or that the agent states falls outside the owner's execution choice. ${EXECUTION_FLAGS_BASIS}`, label: 'Inferred' as const }] : []),
    { id: 'no-provider-call', text: 'Syzygy made no provider call and transmitted no project content.', label: null },
    { id: 'pinned-revision', text: `Pinned revision ${subject.pinnedRevision.commit} of ${subject.repository.url}; declared Repository role ${subject.repository.role}; governance-root material keeps the same repository identity. Selection history comes from the writable run record.`, label: 'Inferred' },
    { id: 'pinned-revision-verified', text: 'At this render Syzygy rehashed the pinned commit, trees and used blobs, and checked the committed screening policy against this run binding. No consent, registry act or provider statement was verified.', label: 'Observed' },
    { id: 'source-visibility', text: `Source visibility ${subject.visibility.value}, from ${subject.visibility.source}, attributed to ${subject.visibility.declaredBy}; no network or credential check verifies it.`, label: 'Inferred' },
    { id: 'screening-policy-binding', text: `Screening policy ${subject.screeningPolicy.policyId} ${subject.screeningPolicy.policyVersion}, digest ${subject.screeningPolicy.sha256}; its selected commit is stored run provenance.`, label: 'Inferred' },
    { id: 'quotations', text: `Each of the ${quotationCount} quotation(s) shown was located by Syzygy at this render in the blob it read at the pinned revision, the object identifiers recomputed from the bytes read; never the agent's copy or a stored byte range.`, label: 'Observed' },
    { id: 'stored-records', text: 'Every value shown from Syzygy\'s stored records rather than re-derived at this render is Inferred: the repair-cycle count, the instants of earlier steps, the run record\'s history, the pinned revision chosen, the brief and the execution rule it carried, the execution choice and who entered it, session identifiers and launch forms, and which objects earlier steps read.', label: 'Inferred' },
    { id: 'records-within-reach', text: `The run and its declarations lie within the agent sessions' write reach: ${RECORDS_WITHIN_REACH}.`, label: null },
    { id: 'unattributed-execution', text: `This run has no scheduler work item: ${NO_WORK_ITEM_REASON}.`, label: null },
    draftLayer.state === 'editorial-draft'
      ? { id: 'draft-layer', text: 'Draft layer: an editorial draft with the declared model as inference provenance; provider identity is declared, not observed transmission.', label: null }
      : { id: 'draft-layer', text: `Draft layer: Unknown (missing-declaration), so no part of the draft is shown: ${draftLayer.why.join('; ')}.`, label: 'Unknown' },
  ];
  if (credential.required) {
    items.push(credential.passed
      ? { id: 'adapter-credential', text: `At this render no adapter credential of the ${credential.checked} listed was readable as the operator's user.`, label: 'Observed' }
      : { id: 'adapter-credential', text: `At this render an adapter credential was readable as the operator's user: ${credential.finding.why}. ${credential.finding.instruction}`, label: 'Observed' });
  }
  if (opened.effective?.kind === 'url') {
    const replacements = effectiveUrlDisclosures({ subject }, opened.effective.declaration);
    const ids = new Set(replacements.map(item => item.id));
    const retained = items.filter(item => item.id !== 'no-provider-call' && !ids.has(item.id));
    return [...replacements, ...retained];
  }
  return items;
}
