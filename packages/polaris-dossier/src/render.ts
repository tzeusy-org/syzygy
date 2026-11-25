import { URL_PRODUCT_READ_MILLISECONDS } from './url-product-read-limits.js';
import { isRunProductReads, protectedProductRecord, yieldForProductReads, UrlProductReadRefusal, type ProductReadEvidence } from './url-operation-products.js';
import { createHash, randomBytes } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  backtickSpans, excludedSourceId, spanTouchesWithheld, generationSourcesForBody, generationSourcesForRedactedBody, generationSpanRange, generationSourceTextAt, isDossierPagePath, leadInQuotationSpans, PAGE_SINK_CONTRACT, PAGE_SINK_SCRIPT_CONTRACT, pageSinkCspFinding, pageSinkScriptFinding,
  type EpistemicMarking, type EvidenceAnchor, type GenerationExclusionReason, type GenerationSource, type LocalBlock,
  type LocalDerivedFact, type LocalDerivedStructure, type LocalDisclosureItem, type LocalDraftLayer, type LocalEdgeRelation, type LocalPage, type LocalPageItem, type LocalRenderInput, type LocalSegment, type WithheldNote,
  type DossierDraft, type DraftBlock, type DraftDiagramHome, type DraftFigure, type DraftFigureElement, type DraftParagraph,
} from '@syzygy/polaris-generation-core/live';
import { isRecord, sha256 } from '@syzygy/support';
import { collectBlocks, deriveFindings, draftRules, type BlobRedaction, type Derived } from './check.js';
import { applyHeroFindings, relationDecisions } from './check-derive.js';
import { secretOrUnder } from './derive.js';
import { BLOB_MODES } from './git-object-reader.js';
import { witnessAtRender, witnessWords, type RelationType } from './relation-witness.js';
import { CREDENTIAL_CHECK_DISCLOSURE, credentialFindings, credentialStepCheck, storedBriefArm, type CredentialBreachFinding, type CredentialStepResult } from './credential-probe.js';
import { UNDERSTANDING_ITEMS, WORTH_KNOWING_FIELD, WORTH_KNOWING_NONE_FIELD, hasFigureKindForm, hasRelationForm, hasSubsectionForm, hasThesisBasisForm, hasWithheldHeroIdentity, hasWorthKnowingForm, heroOf } from './draft-schema.js';
import { EXECUTION_FLAGS_BASIS, executionFlags, type ExecutionFlags } from './execution-flags.js';
import type { CredentialProbe } from './execution-rule.js';
import { RECORDS_WITHIN_REACH } from './gate-sources.js';
import { GitObjectReadRefusal, openPinnedObjectReader, type TreeEntry } from './git-object-reader.js';
import { MANIFEST_BLOB_LIMIT, deriveManifestFacts, manifestFactsUnknown, type ManifestFacts } from './manifest-facts.js';
import { errno, latestInventorySession, logStep, openRun, promptRecordName, type OpenedRun } from './inventory.js';
import { briefStandardsFromRecord, briefStandardsOf, buildDesignPacket, standardsInput } from './design-review.js';
import { derivedStructureAt, readCurrencyPolicy, secretPathOf, type CurrencyPolicy } from './derived-record.js';
import type { Outcome } from './outcome.js';
import { designReviewOfRecord, latestPassedDraft, reviewOfRecord, type DesignReviewOfRecord, type ReviewDeps, type ReviewOfRecord } from './review.js';
import type { ReverifyRefusal } from './reverify.js';
import { NO_WORK_ITEM_REASON } from './run-record.js';
import { describeRawReadDisclosure, RAW_READ_DISCLOSURE_REFUSAL, readRawReadDisclosure } from './raw-read-disclosure.js';
import { CLASS_NOT_CONSENTED, unconsentedClass, unconsentedText } from './class-gate.js';
import { placementSubjectOf, screenLoaderOf, type DossierScreen, type ScreenExclusion } from './screen.js';
import { readBriefRecord } from './run-dir.js';
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
const RAW_READ_DISCLOSURE_ID = 'raw-read-disclosure';
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
  /** The derived-fact currency policy (version 2.3); by default the committed bytes at the records root's HEAD (`readCurrencyPolicy`). */
  readonly currencyPolicy?: () => CurrencyPolicy | null;
}
export interface ProducedSiteInput {
  readonly run: string; readonly runId: string; readonly pinnedRevision: string; readonly draftRevision: number;
  readonly products?: ProductReadEvidence;
  readonly input: DossierRendererInput; readonly files: ReadonlyMap<string, string>; readonly signal: AbortSignal;
  readonly packet: { readonly bytes: string; readonly sha256: string };
  readonly sourceBodies: readonly { readonly path: string; readonly objectId: string; readonly raw: string | null; readonly redacted: boolean }[];
}
export const RENDER_PRODUCER_MILLISECONDS = 5000;

export type RenderStage = 'renderer' | 'run' | 'reverify' | 'disclosure' | 'not-briefed' | 'deadline' | 'draft' | 'screen' | 'object-read' | 'rederive' | 'sources' | 'render' | 'write';

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

type DesignContinuationSource = UrlDesignRenderContinuation
  | ((input: { readonly deadline: number; readonly packetSha256: string }) => Promise<UrlDesignRenderContinuation | null>);

export function renderRun(runDir: string, deps: RenderDeps, designContinuation?: DesignContinuationSource): Promise<RenderResult> {
  return renderWithRefusal(runDir, deps, undefined, designContinuation);
}

type StoredUrlRender = { readonly path: string; readonly output: Parameters<typeof checkStoredUrlRender>[2] };

/** Host-only fresh reconstruction. Compare with the exact stored site without
 * allocating a site number or writing a render step, including on refusal. */
export async function reproduceUrlRender(runDir: string, deps: RenderDeps, site: StoredUrlRender,
  designContinuation?: DesignContinuationSource): Promise<RenderResult> {
  return renderWithRefusal(runDir, deps, structuredClone(site), designContinuation);
}

async function renderWithRefusal(runDir: string, deps: RenderDeps, site?: StoredUrlRender,
  designContinuation?: DesignContinuationSource): Promise<RenderResult> {
  try { return await render(runDir, deps, site, designContinuation); }
  catch (cause) {
    if (!(cause instanceof UrlProductReadRefusal)) throw cause;
    return { ok: false, refusal: { command: 'render', outcome: 'refused', stage: 'reverify', reason: cause.message, disclosures: DISCLOSURES } };
  }
}

async function render(runDir: string, deps: RenderDeps, storedSite?: StoredUrlRender,
  continuationSource?: DesignContinuationSource): Promise<RenderResult> {
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
      const stored = readEffectiveRunRecord(runDir, deps.sources?.effectiveRunDeclaration);
      if (!stored.ok && stored.legacy) return refuse('run', stored.reason);
      if (!stored.ok && stored.baseRecordUnreadable) return refuse('reverify', stored.reason);
      if (stored.ok && readRawReadDisclosure(runDir, stored.core.declared.agentProvider) === null)
        return refuse('disclosure', RAW_READ_DISCLOSURE_REFUSAL);
    } catch { /* existing missing-run / missing-renderer handling below */ }
  }
  if (deps.renderer === undefined) return refuse('renderer', NO_RENDERER);
  const opened = await openRun(runDir, deps.sources, now, 'nothing is rendered', { ...deps, requireAuthorHandoffDisclosure: true });
  if (!opened.ok) {
    if (opened.refusals?.some(item => item.code === 'raw-read-disclosure')) return refuse('disclosure', RAW_READ_DISCLOSURE_REFUSAL);
    return refuse(opened.stage, opened.reason, { ...(opened.reasons ? { reasons: opened.reasons } : {}), ...(opened.refusals ? { refusals: opened.refusals } : {}) });
  }
  const { run, runId, subject, declared } = opened;
  const urlMode = opened.effective?.kind === 'url';
  const rawRead = readRawReadDisclosure(run, declared.agentProvider);
  if (rawRead === null) return refuse('disclosure', RAW_READ_DISCLOSURE_REFUSAL);
  const disclosureUnchanged = (): boolean => readRawReadDisclosure(run, declared.agentProvider)?.authorHandoff === rawRead.authorHandoff;
  const refuseDisclosure = (): RenderResult => {
    logRun = undefined;
    return refuse('disclosure', RAW_READ_DISCLOSURE_REFUSAL);
  };
  const disclosed = describeRawReadDisclosure(rawRead);
  const transmissionScope = urlMode
    ? 'Checked URL relay facts apply to the relay’s captured traffic. Transmissions outside those captures are'
    : 'Transmissions from the operator’s authoring tool are';
  const rawReadDisclosure: LocalDisclosureItem = { id: RAW_READ_DISCLOSURE_ID, label: disclosed.label,
    text: `${disclosed.risk} The run records the author handoff as ${disclosed.authorHandoff}. ${transmissionScope} ${disclosed.uncapturedTransmissions}.`,
  };
  if (continuationSource !== undefined && !urlMode) return refuse('reverify', 'The protected design continuation requires a URL run.');
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

  const briefRecord = products === undefined ? readBriefRecord(run)
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
  if (hasWithheldHeroIdentity(doc, secretPathOf(screen))) return refuse('screen', 'the hero identity is withheld by screening');
  const reader = (deps.openReader ?? openPinnedObjectReader)({ gitDir: path.join(subject.clone.path, '.git'), revision: pinned });
  let derived: Derived;
  try {
    derived = await deriveFindings(doc, { pinned, screen, reader }, draftRules(pinned, declared.maxQuestions, poleLimitOf(declared)));
  } catch (cause) {
    if (cause instanceof GitObjectReadRefusal) return refuse('object-read', `an object at the pinned revision could not be read: ${cause.message}`, { objectRead: cause.toJSON() });
    throw cause;
  }
  const findings = [...derived.findings];
  applyHeroFindings(doc, findings);
  if (findings.length > 0) {
    return refuse('rederive', `draft revision ${draftRev.revision} passed its check, but checking it again at this render from the objects read now finds ${findings.length} finding(s); the stored result is not trusted, so nothing is rendered`,
      { reasons: findings.map((finding) => `${finding.kind} at ${finding.at}`) });
  }

  const review = await reviewOfRecord(opened, deps);

  // Record-derived presentation inputs are read at the operation boundary, then
  // passed explicitly into the renderer adapter. The producer read context can
  // authenticate these exact snapshots; building the local input performs no
  // hidden reread of brief or reviewer continuation history.
  const fidelityContinuation = review.counts
    ? continuationOf(run, 'fidelity', review.session, review.number, review.packetSha256, review.sessionId.value, products) : null;
  const input = buildLocalInput({ opened, doc, derived, review, screen, credential, algorithm: reader.algorithm,
    briefRecord, fidelityContinuation, rawReadDisclosure });
  if (!input.ok) return refuse(input.stage, input.reason);
  // URL renders read through the protected product bridge. Derived records
  // and manifest bodies need producer receipts to supply facts to the review packet.
  let built = input;
  if (!urlMode) {
    const derivedStructure = await derivedStructureAt({ run, revision: draftRev.revision, pinned,
      repositoryId: subject.repository.repositoryId, reader, isSecretPath: secretPathOf(screen),
      policy: (deps.currencyPolicy ?? (() => readCurrencyPolicy(deps.sources.recordsRoot)))() });
    // Re-derive operator-agent manifest facts from the pinned tree and bounded reader.
    const manifestFacts = await renderManifestFacts(subject.clone.path, pinned, deps, screen, opened.contentClasses, reader);
    const edgeRelations = hasRelationForm(doc['schemaVersion'])
      ? await edgeRelationsAt({ doc, derivedStructure, manifestFacts, screen, withheld: input.local.withheldElements ?? new Map(), listTree: () => reader.listTree() })
      : undefined;
    built = { ...input, local: { ...input.local, derivedStructure, manifestFacts, ...(edgeRelations === undefined ? {} : { edgeRelations }) } };
  }

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
  const standards = urlMode ? briefStandardsFromRecord(briefRecord) : briefStandardsOf(run);
  const reviewed = buildDesignPacket({ run, runId, pinnedRevision: pinned, audience: declared.audience, files: pending, ...standardsInput(standards) });
  if (!reviewed.ok) return refuse('render', `the rendered pages cannot be compared outside the review-status region: ${reviewed.reason}`);
  // Opening the run and rebuilding the pending packet use the original product
  // read lease. Obtain the short-lived verdict proof where it is first needed.
  let checkedDesign: UrlDesignRenderContinuation | undefined;
  if (typeof continuationSource === 'function') {
    if (!products!.isLeaseOpen()) throw new UrlProductReadRefusal();
    const proof = await continuationSource({ deadline: products!.deadline, packetSha256: reviewed.sha256 });
    if (proof === null || !products!.isLeaseOpen() || Date.now() >= proof.deadline) throw new UrlProductReadRefusal();
    checkedDesign = proof;
  } else checkedDesign = continuationSource;
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
  const published = buildDesignPacket({ run, runId, pinnedRevision: pinned, audience: declared.audience, files, ...standardsInput(standards) });
  if (!published.ok || published.sha256 !== reviewed.sha256) {
    return refuse('render', 'stating the rendered-design review in the review-status region changed the pages outside that region, so the review of record cannot be decided from them');
  }
  // The first RFC7-20 condition, checked on the output itself (dossier spec v1.5): every page carries the one sentence and its machine
  // disclosure, the appendix carries the disclosure in human form, and the machine view has the same raw-read item.
  const pagesMissing = [...files].filter(([file, html]) => {
    if (!file.endsWith('.html')) return false;
    const ids = / data-disclosure-ids="([^"]*)"/u.exec(html)?.[1]?.split(' ');
    return !html.includes('class="run-sentence"') || !ids?.includes(RAW_READ_DISCLOSURE_ID);
  }).map(([file]) => file);
  const appendix = files.get('appendix.html');
  const appendixItem = `data-disclosure-id="${RAW_READ_DISCLOSURE_ID}" data-label="${rawReadDisclosure.label}">${rawReadDisclosure.text.replaceAll("'", '&#39;')}`;
  if (!appendix?.includes('class="run-disclosure"') || !appendix.includes(appendixItem))
    pagesMissing.push('appendix.html');
  // The design packet above already verified the machine view’s JSON and serialization.
  const machine: { readonly disclosure?: unknown } = JSON.parse(files.get('machine.json')!);
  const matching = list(machine.disclosure).filter(item => isRecord(item) && item['id'] === RAW_READ_DISCLOSURE_ID);
  const item = matching[0];
  if (matching.length !== 1 || !isRecord(item) || item['text'] !== rawReadDisclosure.text || item['label'] !== rawReadDisclosure.label)
    pagesMissing.push('machine.json');
  if (pagesMissing.length > 0) {
    return refuse('render', `the rendered site does not carry the run disclosure: the one sentence and machine form on every page, the appendix and the machine view (${pagesMissing.join(', ')})`);
  }
  // The code-content exemption (policy version 3) and the project-documentation exemption (version 5) admitted some bodies without the
  // active-content scan. Each holds at these pages only while they meet the renderCondition (version 7's text); where that cannot be confirmed,
  // each such body is scanned as before for these pages, and one with a finding is excluded whole here: a quoted or cited body cannot
  // leave the pages it is drawn on, so nothing is rendered. A redacted body is scanned over its complete body, which check kept as the
  // answer alone (`activeContentAsBefore`), so its withheld lines count and no withheld text reaches this step.
  // A whole body is scanned with its path, so its stage's detectors run (dossier policy 2.0.0's configuration detectors never over a body
  // Stage 1 places), and the active-content scan runs with no exemption.
  const scannedAsBefore = [...derived.admitted].filter(([cited, blob]) => (blob.withheld === undefined ? screen.scannedAsBefore(blob.raw, cited) : blob.activeContentAsBefore === true))
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
        briefRecord: protectedProductRecord(products!, run, RUN_LAYOUT.briefRecord), fidelityContinuation, rawReadDisclosure });
      if (!rebuilt.ok || signal.aborted
        || !equalOrderedRenderValue(pendingInput, { local: rebuilt.local, sources: rebuilt.sources })) return null;
      const pending = draw(rebuilt.local, rebuilt.sources);
      if (typeof pending === 'string') return null;
      const candidate = buildDesignPacket({ run, runId, pinnedRevision: pinned, audience: declared.audience, files: pending, ...standardsInput(standards) });
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
    // URL reproduction shares the already-issued read deadline: it receives no
    // fresh allowance after the initial draw, and cannot outlive the run.
    const producerDeadline = urlMode ? Math.min(products!.deadline, checkedDesign?.deadline ?? Infinity) : Infinity;
    const producerMilliseconds = urlMode
      ? Math.max(0, Math.min(URL_PRODUCT_READ_MILLISECONDS.render, producerDeadline - Date.now()))
      : RENDER_PRODUCER_MILLISECONDS;
    if (producerMilliseconds === 0) return refuse('render', 'The rendered products were not admitted by the checked producer before storage.');
    const abort = new AbortController();
    const expires = performance.now() + producerMilliseconds;
    const expired = (): boolean => abort.signal.aborted || performance.now() >= expires
      || (urlMode && (Date.now() >= producerDeadline || !products!.isLeaseOpen()));
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
        new Promise<false>(resolve => { timer = setTimeout(() => { abort.abort(); resolve(false); }, producerMilliseconds); }),
      ]);
      completed = admitted === true && !expired();
    } catch { /* The checked producer supplied no admission. */ }
    finally { clearTimeout(timer); if (!completed) abort.abort(); }
    if (!completed) {
      if (!disclosureUnchanged()) return refuseDisclosure();
      return refuse('render', 'The rendered products were not admitted by the checked producer before storage.');
    }
  }

  const rendererCurrent = !urlMode || await urlRendererCurrent(installed!);
  if (!disclosureUnchanged()) return refuseDisclosure();
  if (!rendererCurrent) return refuse('renderer', 'The bound URL renderer changed before site storage.');
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

/** A v9 draft's graph edges at a render (REQ-polaris-generation-034 version 2.19), by edge id: rule `relation-witness` version 1 decided again
 * from the derived structure the region states at this render (its facts, and the counts this render re-derives from the tree) and the
 * render's own manifest member, a unit tested for a blob against the tree this render lists. An edge is witnessed only where its joining fact
 * renders Observed here; otherwise `fact-not-current`. An edge the draft labels Unknown or that renders as a withheld item is never asserted. */
export async function edgeRelationsAt(inputs: {
  readonly doc: Readonly<Record<string, unknown>>;
  readonly derivedStructure: LocalDerivedStructure;
  readonly manifestFacts: ManifestFacts;
  readonly screen: Pick<DossierScreen, 'screenPath' | 'screenBody'>;
  readonly withheld: ReadonlyMap<string, unknown>;
  readonly listTree: () => Promise<readonly Pick<TreeEntry, 'path' | 'mode'>[]>;
}): Promise<ReadonlyMap<string, LocalEdgeRelation>> {
  let blobs: ReadonlySet<string> | undefined;
  try {
    blobs = new Set((await inputs.listTree()).filter((entry) => BLOB_MODES.has(entry.mode)).map((entry) => entry.path));
  } catch (cause) {
    if (!(cause instanceof GitObjectReadRefusal)) throw cause;
  }
  return renderedEdgeRelations(inputs, blobs);
}

function renderedEdgeRelations(inputs: {
  readonly doc: Readonly<Record<string, unknown>>;
  readonly derivedStructure?: LocalDerivedStructure;
  readonly manifestFacts?: ManifestFacts;
  readonly screen: Pick<DossierScreen, 'screenPath' | 'screenBody'>;
  readonly withheld: ReadonlyMap<string, unknown>;
}, blobs?: ReadonlySet<string>): ReadonlyMap<string, LocalEdgeRelation> {
  const { doc, derivedStructure: derived, manifestFacts, screen, withheld } = inputs;
  const isSecretPath = secretPathOf(screen);
  const hidden = (repositoryPath: string): boolean => secretOrUnder(repositoryPath.split('/'), isSecretPath) || screen.screenPath(repositoryPath) === 'denied-path';
  // An edge is asserted where it is labelled Inferred and is no withheld item. `withheld` is the render's `withheldElements`, whose graph
  // edges are keyed by bare id and entered by `isWithheldItem` (review-reach.ts), the predicate check's `isWithheldElement` applies, over
  // the same frozen revision: one notion of a withheld edge in both.
  const decisions = relationDecisions(doc, (edge) => edge['epistemic'] === 'inferred' && !withheld.has(text(edge['id']) ?? ''),
    blobs === undefined ? undefined : { hidden, isBlob: (repositoryPath) => blobs.has(repositoryPath) }, {
      structure: derived?.state === 'derived'
        ? { state: 'derived', facts: derived.facts, secretPathsLeftOut: derived.tree.secretPathsLeftOut, submodules: derived.tree.submodules, unitsNotListed: derived.tree.unitsNotListed }
        : { state: 'unknown' },
      manifest: manifestFacts?.state === 'derived' ? manifestFacts : { state: 'unknown' },
      hidden,
    });
  const facts = derived?.state === 'derived' ? new Map(derived.facts.map((fact) => [fact.id, fact])) : new Map<string, LocalDerivedFact>();
  return new Map(decisions.edges.map(({ id, relation, decision: checked }): [string, LocalEdgeRelation] => {
    // At version 1 every eligible fact is a structure fact, so `facts` (the structure record's, as this render derives them) holds every
    // fact a decision can name, and the evidence names that record; a fact found in no rendered record is not current.
    const decision = witnessAtRender(checked, (factId) => facts.get(factId)?.epistemic === 'observed');
    if (decision.state === 'witnessed' && derived?.state === 'derived') {
      return [id, { relation, witness: { state: 'witnessed', reason: null, fact: decision.fact, rule: decision.rule, ruleVersion: decision.ruleVersion },
        evidence: { words: witnessWords(relation as RelationType)!, factKind: decision.factKind, revision: derived.recordRevision, recordSha256: derived.sha256 } }];
    }
    const reason = decision.state === 'witnessed' ? 'fact-not-current' : decision.reason;
    return [id, { relation, witness: { state: decision.state === 'witnessed' ? 'unknown' : decision.state, reason, fact: null, rule: null, ruleVersion: null } }];
  }));
}

/** The render's own manifest-facts member (version 2.9): the tree listed by `reader`, each manifest read alone through a second pinned
 * reader on the same clone whose object bound is `MANIFEST_BLOB_LIMIT`; `unknown` where the tree cannot be listed. */
export async function renderManifestFacts(clonePath: string, pinned: string, deps: Pick<RenderDeps, 'openReader'>, screen: DossierScreen,
  consented: readonly string[] | null, reader: { readonly listTree: () => Promise<readonly TreeEntry[]> }): Promise<ManifestFacts> {
  let entries: readonly TreeEntry[];
  try {
    entries = await reader.listTree();
  } catch (cause) {
    if (!(cause instanceof GitObjectReadRefusal)) throw cause;
    return manifestFactsUnknown(cause.reason);
  }
  const manifestReader = (deps.openReader ?? openPinnedObjectReader)({ gitDir: path.join(clonePath, '.git'), revision: pinned, maxObjectBytes: MANIFEST_BLOB_LIMIT });
  return deriveManifestFacts({ entries, screen, consented, read: async (manifestPath) => (await manifestReader.readBlobs([manifestPath]))[0]! });
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
  readonly rawReadDisclosure: LocalDisclosureItem;
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
  const { opened, doc, derived, review, design, screen, credential, algorithm, briefRecord, fidelityContinuation, designContinuation, rawReadDisclosure } = inputs;
  const { run, runId, subject, declared } = opened;
  const pinned = subject.pinnedRevision.commit;
  const clean = (value: string): string => (screen.screenBody(value) === 'secret-detector-match' ? WITHHELD_TEXT : value);
  const isSecretPath = secretPathOf(screen);
  const shownPath = (repositoryPath: string): string => (isSecretPath(repositoryPath) ? SECRET_PATH : repositoryPath);

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
  const unnamedBlob = derived.citedBlobs.some((cited) => cited.path === null);
  const spanStanding = (citation: Readonly<Record<string, unknown>>): SpanStanding => {
    const cited = text(citation['path']);
    if (cited === undefined) return 'other';
    const blob = admitted.get(cited);
    // A blob the class gate withholds is not in `admitted` and its screening outcome is `admitted`, so it stands `other`.
    if (blob === undefined) {
      // A blob recorded without its path (`path: null`) is one `isSecretPath` answers for, as `review-reach.ts` reads it. The path screen
      // alone does not: it admits a Stage-2 path whose own text a configuration detector matches, and a span of such a file whose body
      // screening excluded would stand `other` and its item's text would render (syzygy-8hm6, review 1 of the fix).
      const outcome = outcomeOf.get(cited) ?? (unnamedBlob && isSecretPath(cited) ? 'secret-detector-match' : screen.screenPath(cited));
      return outcome === undefined || outcome === 'admitted' ? 'other' : packetSpanStanding(outcome);
    }
    const startLine = citation['startLine'], endLine = citation['endLine'];
    if (typeof startLine !== 'number' || typeof endLine !== 'number') return 'other';
    if (blob.withheld === undefined) return 'admitted';
    if (spanTouchesWithheld(blob.withheld, startLine, endLine)) return 'withheld';
    return screen.screenBody(blob.retainedLines!.slice(startLine - 1, endLine).join(''), cited) === 'secret-detector-match' ? 'withheld' : 'admitted';
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
    const named = [...files].filter((file) => !isSecretPath(file)).sort();
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
  const citationLines = new Map<string, Map<string, { start: number; end: number }[]>>();
  const cites = (claimId: string, value: Readonly<Record<string, unknown>>): string[] => {
    const lines = new Map<string, { start: number; end: number }[]>();
    for (const citation of list(value['citations']).filter(isRecord)) {
      const [sourceId] = citedSources({ citations: [citation] });
      const startLine = citation['startLine'], endLine = citation['endLine'];
      if (sourceId === undefined || typeof startLine !== 'number' || typeof endLine !== 'number') continue;
      const ranges = lines.get(sourceId) ?? [];
      if (!ranges.some(range => range.start === startLine && range.end === endLine)) ranges.push({ start: startLine, end: endLine });
      lines.set(sourceId, ranges);
    }
    if (lines.size > 0) citationLines.set(claimId, lines);
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
  const unindexedNames = new Set<string>();
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
    // A backticked span the path detector matches is never a name of the generated index (the index-and-task-routes change).
    // Spans are paired inside each prose segment, as the index reads them, never across a quotation.
    for (const part of segments) if (part.kind === 'prose') for (const span of backtickSpans(part.text)) if (screen.screenPath(span) === 'secret-detector-match') unindexedNames.add(span);
    if (secret) segments = [{ kind: 'prose', text: WITHHELD_TEXT }];
    segments = segments.filter((part) => part.kind !== 'prose' || part.text !== '');
    const named = list(value['executionIds']).flatMap((executionId) => (typeof executionId === 'string' && executions.has(executionId) ? [{ id: executionId, command: executions.get(executionId)! }] : []));
    const matched = secret ? { secretMatched: true as const } : {};
    const unknown = (reason: string, basis: string): LocalBlock => ({ marking: 'unknown', unknownReason: reason, basis, segments, executions: named, ...marks, ...matched });
    if (label === 'non-normative') blocks.set(id, { marking: 'non-normative', unknownReason: null, basis: 'the agent marks this block non-normative: it claims nothing from a source', segments, executions: [], ...matched });
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
  // A v7 sequence or swimlane (version 2.5): its participants, lanes and steps are rendered as nodes are, its messages as edges are.
  const figureKind = (diagram: Readonly<Record<string, unknown>>): 'sequence' | 'swimlane' | undefined =>
    (hasFigureKindForm(doc['schemaVersion']) && (diagram['kind'] === 'sequence' || diagram['kind'] === 'swimlane') ? diagram['kind'] : undefined);
  const elementsOf = (diagram: Readonly<Record<string, unknown>>): unknown[] => {
    const kind = figureKind(diagram);
    return kind === 'sequence' ? [...list(diagram['participants']), ...list(diagram['messages'])]
      : kind === 'swimlane' ? [...list(diagram['lanes']), ...list(diagram['steps'])] : [...list(diagram['nodes']), ...list(diagram['edges'])];
  };
  const diagramHeld = (diagram: Readonly<Record<string, unknown>>): boolean => {
    const parts = elementsOf(diagram).filter(isRecord);
    return parts.length > 0 && parts.every((part) => withheldNote(part) !== undefined);
  };
  // A section's or deep dive's title over paragraphs and diagrams that are all withheld.
  // A v8 section's subsections (version 2.16): their answers and paragraphs are the section's claims, so its title takes them in too.
  const subsectionRecords = (container: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>>[] =>
    (hasSubsectionForm(doc['schemaVersion']) ? list(container['subsections']).filter(isRecord) : []);
  const subsectionContent = (subsection: Readonly<Record<string, unknown>>): unknown[] => [subsection['answer'], ...list(subsection['paragraphs'])];
  const containerTitle = (container: Readonly<Record<string, unknown>>, diagrams: readonly Readonly<Record<string, unknown>>[]): string => {
    const paragraphs = [...leaves(container['paragraphs']), ...leaves(subsectionRecords(container).flatMap(subsectionContent))];
    const held = paragraphs.every(Boolean) && diagrams.every(diagramHeld) && paragraphs.length + diagrams.length > 0;
    return held ? WITHHELD_LABEL : title(container['title']);
  };
  const diagramRecords = list(doc['diagrams']).filter(isRecord);
  // A v5 diagram names its page in `home` (syzygy-3efd.18). On a section it becomes the same diagram a v4 draft's `sectionId` gives, so
  // its page is byte-identical; on a deep dive it belongs to that deep dive's section; on the overview, to none.
  const diveSection = new Map(list(doc['deepDives']).filter(isRecord).map((dive) => [text(dive['id'])!, text(dive['sectionId'])!]));
  const placement = (diagram: Readonly<Record<string, unknown>>): { readonly sectionId: string; readonly home?: DraftDiagramHome } => {
    const home = diagram['home'];
    if (!isRecord(home)) return { sectionId: text(diagram['sectionId'])! };
    if (home['kind'] === 'deep-dive') return { sectionId: diveSection.get(text(home['target'])!)!, home: { kind: 'deep-dive', id: text(home['target'])! } };
    if (home['kind'] === 'overview') return { sectionId: '', home: { kind: 'overview' } };
    return { sectionId: text(home['target'])! };
  };
  const draft: DossierDraft = {
    title: title(doc['title']),
    introduction: paragraph(doc['introduction']),
    sections: list(doc['sections']).filter(isRecord).map((section) => ({ id: text(section['id'])!, title: containerTitle(section, diagramRecords.filter((diagram) => placement(diagram).home === undefined && placement(diagram).sectionId === section['id'])), paragraphs: tree(section['paragraphs']),
      ...(subsectionRecords(section).length === 0 ? {} : { subsections: subsectionRecords(section).map((subsection) => ({ id: text(subsection['id'])!, title: over(subsectionContent(subsection), subsection['title']), answer: paragraph(subsection['answer']), paragraphs: tree(subsection['paragraphs']) })) }),
      disposition: disposition(section['disposition']) })),
    diagrams: diagramRecords.map((diagram) => {
      const held = diagramHeld(diagram);
      const kind = figureKind(diagram);
      if (kind !== undefined) {
        const claimOf = (value: Readonly<Record<string, unknown>>): DraftFigureElement => {
          const { held: gone } = element('', value);
          return { id: text(value['id'])!, label: gone === undefined ? title(value['label']) : WITHHELD_LABEL, sourceIds: cites(text(value['id'])!, value), epistemic: gone === undefined && value['epistemic'] === 'inferred' ? 'inferred' as const : 'unknown' as const };
        };
        const records = (key: string): Readonly<Record<string, unknown>>[] => list(diagram[key]).filter(isRecord);
        const figure: DraftFigure = kind === 'sequence'
          ? { kind, participants: records('participants').map(claimOf), messages: records('messages').map((message) => ({ ...claimOf(message), from: text(message['from'])!, to: text(message['to'])! })) }
          : { kind, lanes: records('lanes').map(claimOf), steps: records('steps').map((step) => ({ ...claimOf(step), lane: text(step['lane'])! })) };
        return {
          id: text(diagram['id'])!, title: held ? WITHHELD_LABEL : title(diagram['title']), ...placement(diagram), kind, relationship: held ? WITHHELD_LABEL : title(diagram['relationship']),
          nodes: [], edges: [], figure, disposition: disposition(diagram['disposition']),
        };
      }
      return {
        id: text(diagram['id'])!, title: held ? WITHHELD_LABEL : title(diagram['title']), ...placement(diagram), kind: diagram['kind'] as DossierDraft['diagrams'][number]['kind'], relationship: held ? WITHHELD_LABEL : title(diagram['relationship']),
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
    deepDives: list(doc['deepDives']).filter(isRecord).map((dive) => ({ id: text(dive['id'])!, title: containerTitle(dive, diagramRecords.filter((diagram) => { const home = placement(diagram).home; return home?.kind === 'deep-dive' && home.id === dive['id']; })), sectionId: text(dive['sectionId'])!, paragraphs: tree(dive['paragraphs']), disposition: disposition(dive['disposition']) })),
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
  const disclosure = disclosureItems({ opened, draftLayer, executionList, flags, quotationCount, credential, clean, briefRecord, rawReadDisclosure });
  const reviewStatus: LocalDisclosureItem[] = [
    review.counts
      ? { id: 'review-status/fidelity', text: `Fidelity review: one counts, bound to packet ${review.packetSha256} rebuilt at this render; its verdict, ${review.verdict.readiness}, is the review session's.${fidelityContinuation!.continuing ? ' Its reviewer continued across revisions (see the review page).' : ''}`, label: 'Inferred' }
      : { id: 'review-status/fidelity', text: `Fidelity review: none counts (${review.why}).`, label: 'Unknown' },
    designStatusItem(design, designContinuation ?? null),
  ];

  const declaredHero = heroOf(doc);
  const hero: LocalRenderInput['hero'] = declaredHero?.form === 'figure' && typeof declaredHero.value === 'string'
    ? { form: 'figure', diagram: declaredHero.value }
    : declaredHero?.form === 'omitted' ? { form: 'omitted', reason: paragraph(declaredHero.value) } : undefined;
  const editorial = draftLayer.state === 'editorial-draft';
  const pages = editorial ? [understandingPage, discoveryPage, clarificationsPage, executionsPage, reviewPage] : [discoveryPage, executionsPage, reviewPage];
  // Both URL draws and their reproduction project the authenticated v9 draft.
  // An edge whose witness needs an unreceipted fact reports Unknown.
  const edgeRelations = opened.effective?.kind === 'url' && hasRelationForm(doc['schemaVersion'])
    ? renderedEdgeRelations({ doc, screen, withheld: withheldElements })
    : undefined;
  return {
    ok: true,
    sources,
    local: {
      draft, withheldTitle: `Dossier of ${subject.repository.url} at ${pinned.slice(0, 12)}`, draftLayer, blocks, glossary, disclosure,
      sourceAnchors, pages, reviewStatus, withheldElements, citationLines,
      ...(edgeRelations === undefined ? {} : { edgeRelations }),
      authoring: { tool: declared.agentTool, model: declared.model },
      ...(opened.effective?.kind === 'url' ? { effectiveRun: effectiveUrlProjection({ subject }, opened.effective.declaration) } : {}),
      selectionReasons,
      // A v6 draft's thesis basis (version 2.4): the code-reading line renders only while the draft layer and the introduction both show.
      ...(hasThesisBasisForm(doc['schemaVersion']) && (doc['thesisBasis'] === 'stated' || doc['thesisBasis'] === 'code-reading' || doc['thesisBasis'] === 'none') ? { thesisBasis: {
        value: doc['thesisBasis'],
        lineRendered: doc['thesisBasis'] === 'code-reading' && editorial && blocks.get(draft.introduction.id)?.withheld === undefined,
      } } : {}),
      ...(hero === undefined ? {} : { hero }),
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
      // Task routes (the index-and-task-routes change). Each step is a claim block of `blocks`; a task over only withheld steps reads as any short label
      // over withheld content does.
      ...(unindexedNames.size === 0 ? {} : { unindexedNames: [...unindexedNames].sort() }),
      ...(Array.isArray(doc['taskRoutes']) ? { taskRoutes: doc['taskRoutes'].filter(isRecord).map((route) => ({
        id: text(route['id'])!, task: over(route['steps'], route['task']),
        steps: list(route['steps']).filter(isRecord).map((step) => {
          const see = isRecord(step['see']) ? step['see'] : undefined;
          return { paragraph: paragraph(step), ...(see === undefined ? {} : { see: { kind: see['kind'] === 'deep-dive' ? 'deep-dive' as const : 'section' as const, id: text(see['target'])! } }) };
        }),
      })) } : {}),
      // A v13 draft's worth-knowing marks (version 2.26): the marked blocks of the sections' own paragraphs, where check admits the mark,
      // and the Poles that say none was found. The reason a Pole gives is never rendered. Only a block the counted review found supported,
      // rendering Inferred, neither withheld nor matched by a secret detector, is lifted into the callout; any other marked block stays
      // in its section, as it renders there unmarked, so the callout never carries an Unknown or withheld claim under "Worth knowing".
      ...(hasWorthKnowingForm(doc['schemaVersion']) ? { worthKnowing: {
        blockIds: list(doc['sections']).filter(isRecord).flatMap((section) => list(section['paragraphs'])
          .flatMap((entry) => (isRecord(entry) && entry[WORTH_KNOWING_FIELD] === true && typeof entry['id'] === 'string'
            && liftable(blocks.get(entry['id'])) ? [entry['id']] : []))),
        nonePoles: list(doc['poles']).flatMap((pole, index) => (isRecord(pole) && typeof pole[WORTH_KNOWING_NONE_FIELD] === 'string' ? [index] : [])),
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

/** Whether a block marked worth knowing is lifted into its page's callout (REQ-polaris-generation-034 version 2.26): it renders Inferred
 * on the counted review's support, carries no judgement mark, is not a withheld item and matches no secret detector. */
const liftable = (block: LocalBlock | undefined): boolean => block !== undefined && block.marking === 'inferred' && block.judgement === undefined
  && block.withheld === undefined && block.secretMatched === undefined;

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
  readonly rawReadDisclosure: LocalDisclosureItem;
}): LocalDisclosureItem[] {
  const { opened, draftLayer, executionList, flags, quotationCount, credential, clean, briefRecord: brief, rawReadDisclosure } = inputs;
  const { subject, declared } = opened;
  const rule = isRecord(brief) && isRecord(brief['executionRule']) ? brief['executionRule'] : {};
  const commands = executionList.map((entry) => clean(text(entry['command']) ?? ''));
  const items: LocalDisclosureItem[] = [
    { id: 'mode', text: 'Authoring mode is operator-agent. The operator\'s own agent session supplies the draft. Syzygy pinned the revision, checked the draft and rendered these pages.', label: null },
    { id: 'agent', text: `Agent tool ${declared.agentTool} ${declared.agentToolVersion}, provider ${declared.agentProvider}, model ${declared.model}${declared.modelVersion === null ? ' (version not shown by the agent tool)' : ` ${declared.modelVersion}`}, as the operator declared them; no provider-reported model version exists in this mode.`, label: 'Inferred' },
    { id: 'declared-content-classes', text: `Eligible content classes: ${subject.contentClasses.join(', ')}; declarations, not an account of what the agent transmitted.`, label: 'Inferred' },
    { id: 'source-screening-boundary', text: 'Syzygy screens the Git objects and artifacts it reads through its checked flow. SEC-2 and SEC-5 govern that flow.', label: null },
    rawReadDisclosure,
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
    if (credential.passed) {
      items.push({ id: 'adapter-credential', text: `At this render no adapter credential of the ${credential.checked} listed was readable as the operator's user.`, label: 'Observed' });
    } else {
      for (const finding of credentialFindings(credential)) {
        const id = finding === credential.finding ? 'adapter-credential' : 'adapter-credential-readable';
        items.push(credentialFindingDisclosure(id, finding));
      }
    }
  }
  if (opened.effective?.kind === 'url') {
    const replacements = effectiveUrlDisclosures({ subject }, opened.effective.declaration);
    const ids = new Set(replacements.map(item => item.id));
    const retained = items.filter(item => item.id !== 'no-provider-call' && !ids.has(item.id));
    return [...replacements, ...retained];
  }
  return items;
}

function credentialFindingDisclosure(id: string, finding: CredentialBreachFinding): LocalDisclosureItem {
  const detail = `${finding.why}. ${finding.instruction}`;
  switch (finding.kind) {
    case 'adapter-credential-readable':
      return { id, text: `At this render an adapter credential was readable as the operator's user: ${detail}`, label: 'Observed' };
    case 'adapter-credential-configuration-refused':
      return { id, text: `The adapter-credential check at this render refused the configuration because ${detail}`, label: 'Unknown' };
    case 'adapter-credential-undetermined':
      return { id, text: `The adapter-credential check at this render ended without a definite result because ${detail}`, label: 'Unknown' };
  }
}
