import { quotableGenerationSources, validateGenerationSources, validateGenerationSourceTransport, type GenerationSource } from './generation-source.js';
import { CanonicalJsonError, digestCanonicalJson, encodeCanonicalJson, type CanonicalJsonLimits } from './canonical-json.js';
import { parseBoundedJson } from './parse-json.js';
import { sha256 } from '@syzygy/support';

import { promptForStage, type GenerationStage, type PromptProfile } from './prompts.js';
import { validateRequestedAssets, type RequestedAsset } from './provider-draft.js';
import { validateReaderQuestions } from './reader-questions.js';
import { checkDraftQuotes, quoteFindingAsReviewFinding, sourceTextById, type QuoteFinding } from './quote-fidelity.js';

export interface GenerationBudget {
  readonly maxCalls: number;
  readonly maxInputBytes: number;
  readonly maxOutputBytes: number;
  readonly maxUsageUnits: number;
  readonly maxElapsedMs: number;
  readonly maxRepairCycles: number;
  readonly accountingPolicy: string;
}

export interface PipelineRequest {
  readonly requestId: string;
  readonly projectId: string;
  readonly snapshotId: string;
  readonly routes: Readonly<Record<GenerationStage, string>>;
  readonly startedAt: number;
  readonly budget: GenerationBudget;
  /** Complete counted population; only validated body spans may cross a
   * provider stage boundary. Permission is still a trusted port decision. */
  readonly sources: readonly GenerationSource[];
  readonly readerQuestions: unknown;
  /** Trusted operator request identities and requiredness, never model-supplied. */
  readonly requestedAssets: readonly RequestedAsset[];
  /** Which stage prompts the run sends; absent means `manifesto`. A dossier run sets `dossier`. */
  readonly promptProfile?: PromptProfile;
}

export interface AttemptInput {
  readonly requestId: string;
  readonly projectId: string;
  readonly snapshotId: string;
  readonly providerRoute: string;
  readonly stage: GenerationStage;
  readonly ordinal: number;
  readonly inputDigest: string;
  readonly permissionDigest: string;
  readonly bindingDigest: string;
  readonly inputBytes: number;
  readonly deadline: number;
  readonly budget: GenerationBudget;
}

export interface DispatchPermit {
  readonly attemptId: string;
  readonly maxUsageUnits: number;
  readonly maxOutputBytes: number;
}

export type AdmissionDecision =
  | { readonly kind: 'reserved'; readonly permit: DispatchPermit }
  | { readonly kind: 'completed'; readonly permit: DispatchPermit; readonly bindingDigest: string;
      readonly inputDigest: string; readonly outputDigest: string; readonly outputBytes: number;
      readonly model: string | null; readonly usageUnits: number; readonly value: unknown }
  | { readonly kind: 'refused'; readonly reason: 'in-flight' | 'uncertain' | 'identity-mismatch' | 'permission-withdrawn' | 'budget-exhausted' };

export interface ProviderReply {
  readonly body: string;
  readonly model: string | null;
  readonly usageUnits: number | null;
}

/** Which step inside the parse/validate/encode/digest chain rejected the reply.
 * Distinct from the pipeline-level 'invalid-output' StopReason: this is the
 * durable receipt's typed detail, not the caller-facing stop signal.
 * 'digest-failed' is retained as its own typed value even though it is
 * believed unreachable through this module's own call site (see the comment
 * at the digest step inside runGenerationPipeline for why) -- it still needs
 * a code so a future change to encodeCanonicalJson/digestCanonicalJson's
 * contract has somewhere typed to report through, rather than an
 * unhandled 'adapter-failure'. */
export type InvalidOutputReason = 'parse-failed' | 'schema-rejected' | 'encode-failed' | 'digest-failed';

export type AttemptOutcome =
  | { readonly kind: 'validated'; readonly outputDigest: string; readonly model: string | null; readonly usageUnits: number; readonly outputBytes: number; readonly value: unknown }
  /** 'detail' is a diagnostic message, truncated to 200 characters, that becomes part of a
   * durable receipt (see PipelinePorts.record). Contract: it must never carry the provider's
   * raw reply body, any source/reader-question content, or a credential/secret -- only the
   * failing step's own, hard-coded, content-free error message. This holds today because
   * every 'detail' seen here originates from one of: parseBoundedJson/CanonicalJsonError
   * (deterministic, code-only messages that never echo the bytes they reject -- see
   * canonical-json.ts's 'Diagnostics deliberately contain no source values or property
   * names'), or PipelinePorts.validate's own thrown message, whose contract (below) commits
   * to the same never-echo-content discipline. A future validate() implementation or a new
   * fallible step inserted into this chain must preserve that contract, not just truncate. */
  | { readonly kind: 'invalid-output'; readonly usageUnits: number | null; readonly reason: InvalidOutputReason; readonly detail: string }
  | { readonly kind: 'usage-uncertain' | 'effect-uncertain'; readonly usageUnits: number | null };

/** Effect ports are trusted implementations, never fields supplied by a model. */
export interface PipelinePorts {
  readonly now: () => number;
  /** Checks snapshot bytes against owning sources, screening and effective policy. */
  /** Ordinary sources may return true. Redacted projections require the freshly re-read, re-screened source population: self-declared
   * redaction metadata cannot bind safe text to an original Git object. The pipeline compares each projection before any dispatch. */
  readonly verifySources: (request: PipelineRequest) => Promise<boolean | readonly GenerationSource[]>;
  /** Current effective permission identity from a trusted authority adapter,
   * never a caller approval flag or old cached positive answer. */
  readonly permissionIdentity: (input: Omit<AttemptInput, 'permissionDigest' | 'bindingDigest'>) => Promise<string>;
  /** Atomic durable reservation, verified completed reuse, or refusal.
   * Owns original deadline, cumulative reservations, immutable request binding,
   * fresh scheduler observation, execution warrant and consent evaluation.
   * In-flight and uncertain identities MUST refuse; lease expiry cannot replay.
   */
  readonly admit: (input: AttemptInput) => Promise<AdmissionDecision>;
  /** Rechecks effect permission immediately before dispatch. */
  readonly permitted: (input: AttemptInput, permit: DispatchPermit) => Promise<boolean>;
  readonly releaseUnsent: (permit: DispatchPermit) => Promise<void>;
  readonly responseSchema: (stage: GenerationStage) => { readonly version: string; readonly schema: unknown };
  readonly generate: (input: {
    readonly permit: DispatchPermit;
    readonly stage: GenerationStage;
    readonly system: string;
    readonly input: string;
    readonly responseSchema: unknown;
    readonly signal: AbortSignal;
  }) => Promise<ProviderReply>;
  /** Closed schema, source-reference and screening validation. Throws on refusal.
   * Returns a validated data record, not an acceptance/permission assertion.
   * Contract: a thrown message is retained (truncated to 200 chars) in the durable
   * AttemptOutcome.detail below, so it must never quote the provider's raw reply body,
   * a source's raw content, or any credential/secret -- name the failing field or rule
   * only (e.g. "missing required field 'summary'"), never the offending value.
   */
  readonly validate: (stage: GenerationStage, value: unknown, context: Readonly<Record<string, unknown>>) => unknown;
  /** Durable, idempotent receipt; diagnostics contain no invalid output bodies. */
  readonly record: (permit: DispatchPermit, outcome: AttemptOutcome) => Promise<void>;
  /** Late receipts resolve the original reservation, even after a stopped run. */
  readonly lateReceipt: (permit: DispatchPermit, receipt: { readonly model: string | null; readonly usageUnits: number | null }) => Promise<void>;
  /** Trusted interpretation of the validated fidelity record, not provider flags. */
  readonly fidelity: (review: unknown) => { readonly blocking: boolean; readonly findings: unknown };
}

export interface StageReceipt {
  readonly stage: GenerationStage;
  readonly attemptId: string;
  readonly reused: boolean;
  readonly providerRoute: string;
  readonly model: string | null;
  readonly inputDigest: string;
  readonly outputDigest: string;
  readonly promptVersion: string;
  /** The profile and the sha256 of the exact system text sent, so the record names which prompt a stage ran. */
  readonly promptProfile: PromptProfile;
  readonly promptDigest: string;
}

export interface ValidatedStageOutput {
  readonly stage: GenerationStage;
  readonly value: unknown;
}

export type PipelineResult = {
  readonly status: 'awaiting-rendered-review';
  readonly draft: unknown;
  readonly inventory: unknown;
  readonly review: unknown;
  /** Quotations still not found in a cited source after the last repair; each block named here is Unknown, whatever the reviewer said. */
  readonly quoteFindings: readonly QuoteFinding[];
  readonly receipts: readonly StageReceipt[];
  readonly artifacts: readonly ValidatedStageOutput[];
} | {
  readonly status: 'stopped';
  readonly reason: 'invalid-request' | 'source-refused' | 'admission-refused' | 'budget-exhausted' | 'cancelled' | 'deadline' | 'effect-uncertain' | 'invalid-output' | 'usage-uncertain' | 'repair-exhausted' | 'adapter-failure';
  readonly receipts: readonly StageReceipt[];
  readonly artifacts: readonly ValidatedStageOutput[];
};

type StopReason = Extract<PipelineResult, { status: 'stopped' }>['reason'];
class PipelineStop extends Error {
  constructor(readonly reason: StopReason) { super(reason); }
}

const dataLimits = (bytes: number): CanonicalJsonLimits => ({ maxBytes: bytes, maxNodes: 100_000, maxDepth: 64 });

function compactSource(source: GenerationSource): GenerationSource {
  if (source.redaction !== undefined || source.body === undefined || source.spans.length !== 1 || source.spans[0]?.start !== 0
    || source.spans[0]?.end !== Buffer.byteLength(source.body)) return source;
  const { body: _duplicate, ...bound } = source;
  return bound;
}

/** Runs the reusable editorial pipeline. This never awards rendered readiness or
 * authorship, and has no default provider, filesystem or live lifecycle adapter.
 */
export async function runGenerationPipeline(request: PipelineRequest, ports: PipelinePorts, signal: AbortSignal): Promise<PipelineResult> {
  const receipts: StageReceipt[] = [];
  const artifacts: ValidatedStageOutput[] = [];
  let calls = 0;
  let usage = 0;
  let inputBytes = 0;
  let outputBytes = 0;
  const stop: (reason: StopReason) => never = (reason) => { throw new PipelineStop(reason); };
  try {
    const b = request.budget;
    if (![request.requestId, request.projectId, request.snapshotId, b.accountingPolicy].every(x => typeof x === 'string' && x.length > 0)
      || ![b.maxCalls, b.maxInputBytes, b.maxOutputBytes, b.maxUsageUnits, b.maxElapsedMs].every(x => Number.isSafeInteger(x) && x > 0)
      || !Number.isSafeInteger(b.maxRepairCycles) || b.maxRepairCycles < 0
      || !Number.isSafeInteger(request.startedAt) || request.startedAt > ports.now()
      || !Number.isSafeInteger(request.startedAt + b.maxElapsedMs)) stop('invalid-request');
    if (Object.keys(request.routes ?? {}).sort().join(',') !== 'author,edit,fidelity,inventory,plan,repair'
      || Object.values(request.routes).some(route => typeof route !== 'string' || route.length === 0)) stop('invalid-request');
    try { validateRequestedAssets(request.requestedAssets); } catch { stop('invalid-request'); }
    try { validateReaderQuestions(request.readerQuestions); } catch { stop('invalid-request'); }
    if (request.promptProfile !== undefined && request.promptProfile !== 'manifesto' && request.promptProfile !== 'dossier') stop('invalid-request');
    // Canonicalize before inspecting nested caller-owned records: this rejects
    // getters/proxies and detaches them before the first asynchronous boundary.
    let detached: PipelineRequest;
    try { detached = JSON.parse(encodeCanonicalJson(request, dataLimits(Math.max(b.maxInputBytes, 4_000_000)))) as PipelineRequest; }
    catch (error) { stop(error instanceof CanonicalJsonError && error.code === 'byte-limit' ? 'budget-exhausted' : 'invalid-request'); }
    try { validateGenerationSourceTransport(detached.sources); } catch { stop('invalid-request'); }
    // A full-file span already retains the exact verified body. Do not bill a
    // second copy; partial spans keep the owning body for validation.
    const compact = { ...detached, sources: detached.sources.map(compactSource) };
    let frozen: PipelineRequest;
    try { frozen = JSON.parse(encodeCanonicalJson(compact, dataLimits(b.maxInputBytes))) as PipelineRequest; }
    catch (error) { stop(error instanceof CanonicalJsonError && error.code === 'byte-limit' ? 'budget-exhausted' : 'invalid-request'); }
    const budget = frozen.budget;
    const promptProfile: PromptProfile = frozen.promptProfile ?? 'manifesto';
    const deadline = frozen.startedAt + budget.maxElapsedMs;
    const check = (): void => {
      if (signal.aborted) stop('cancelled');
      if (ports.now() >= deadline) stop('deadline');
    };
    const bounded = async <T>(job: () => Promise<T>, allowExpired = false): Promise<T> => {
      if (!allowExpired) check();
      let timer: ReturnType<typeof setTimeout> | undefined;
      let cancel!: () => void;
      const interruption = new Promise<never>((_, reject) => {
        cancel = () => reject(new PipelineStop('cancelled'));
        const arm = (): void => {
          const remaining = deadline - ports.now();
          if (remaining <= 0) reject(new PipelineStop('deadline'));
          else timer = setTimeout(arm, Math.min(remaining, 2_147_483_647));
        };
        signal.addEventListener('abort', cancel, { once: true });
        arm();
        if (signal.aborted) cancel();
      });
      try { return await Promise.race([Promise.resolve().then(job), interruption]); }
      finally { clearTimeout(timer); signal.removeEventListener('abort', cancel); }
    };
    check();
    const verifiedSources = await bounded(() => ports.verifySources(frozen));
    if (!verifiedSources) stop('source-refused');
    const hasRedacted = frozen.sources.some(source => source.redaction !== undefined);
    if (Array.isArray(verifiedSources)) {
      try { validateGenerationSources(verifiedSources); } catch { stop('source-refused'); }
      if (verifiedSources.length !== frozen.sources.length) stop('source-refused');
      // Opaque excluded ids are keyed afresh by each read. Only the alias/carrier differs: all safe metadata, reasons and multiplicity
      // must still match. Such rows have no body, original object id or anchor; their aliases preserve the frozen consent population.
      const opaque = (source: GenerationSource): boolean => source.objectId === null && source.exclusion.excluded && source.path === `withheld/${source.sourceId}`;
      const keyOf = (source: GenerationSource): string => {
        const compact = compactSource(source);
        return encodeCanonicalJson(opaque(source) ? { ...compact, sourceId: null, path: null } : compact, dataLimits(budget.maxInputBytes));
      };
      const fresh = new Map<string, GenerationSource[]>();
      try {
        for (const source of verifiedSources) {
          const key = keyOf(source);
          const bucket = fresh.get(key);
          if (bucket === undefined) fresh.set(key, [source]); else bucket.push(source);
        }
        const sources = frozen.sources.map(requested => {
          const verified = fresh.get(keyOf(requested))?.pop();
          if (verified === undefined) stop('source-refused');
          return opaque(verified) ? { ...verified, sourceId: requested.sourceId, path: requested.path } : compactSource(verified);
        });
        // Every row used below comes from the fresh gated read, including ordinary bodies in mixed requests.
        frozen = { ...frozen, sources };
      } catch { stop('source-refused'); }
    } else if (hasRedacted) stop('source-refused');
    const admitted = quotableGenerationSources(frozen.sources);
    if (admitted.length === 0 || admitted.length > 200) stop('source-refused');
    const sourcePopulation = frozen.sources.map(source => ({ sourceId: source.sourceId, classificationBasis: source.classificationBasis,
      excluded: source.exclusion.excluded, ...(source.exclusion.excluded ? { reason: source.exclusion.reason } : {}),
      ...(source.redaction === undefined ? {} : { redaction: { redactionClass: source.redaction.redactionClass, withheldLines: source.redaction.withheldLines } }) }));
    const context: Record<string, unknown> = { sources: admitted.map(({ sourceId, text }) => ({ sourceId, text })), readerQuestions: frozen.readerQuestions, requestedAssets: frozen.requestedAssets };
    const citedSpans = (value: unknown): readonly { readonly sourceId: string; readonly anchorId: string; readonly text: string;
      readonly redaction?: { readonly redactionClass: 'redacted-span'; readonly withheldLines: number } }[] => {
      const referenced = new Set<string>();
      const visit = (node: unknown): void => {
        if (Array.isArray(node)) for (const item of node) visit(item);
        else if (node !== null && typeof node === 'object') {
          const record = node as Record<string, unknown>;
          if (Array.isArray(record.sourceIds)) for (const id of record.sourceIds) if (typeof id === 'string') referenced.add(id);
          for (const child of Object.values(record)) visit(child);
        }
      };
      visit(value);
      return frozen.sources.filter(source => referenced.has(source.sourceId)).flatMap(source => source.spans.map(span => ({ sourceId: source.sourceId, anchorId: span.anchorId, text: span.text,
        ...(source.redaction === undefined ? {} : { redaction: { redactionClass: source.redaction.redactionClass, withheldLines: source.redaction.withheldLines } }) })));
    };
    const stage = async (name: GenerationStage, inputs: Readonly<Record<string, unknown>>): Promise<unknown> => {
      check();
      if (calls >= budget.maxCalls) stop('budget-exhausted');
      const prompt = promptForStage(name, promptProfile);
      const promptDigest = sha256(prompt.system);
      const schema = ports.responseSchema(name);
      const envelope = { promptVersion: prompt.version, system: prompt.system, responseSchemaVersion: schema.version, responseSchema: schema.schema, inputs };
      let encoded: string;
      try { encoded = encodeCanonicalJson(envelope, dataLimits(budget.maxInputBytes)); }
      catch (error) { stop(error instanceof CanonicalJsonError && error.code === 'byte-limit' ? 'budget-exhausted' : 'invalid-request'); }
      const size = Buffer.byteLength(encoded, 'utf8');
      if (inputBytes + size > budget.maxInputBytes || outputBytes >= budget.maxOutputBytes || usage >= budget.maxUsageUnits) stop('budget-exhausted');
      const baseInput: Omit<AttemptInput, 'permissionDigest' | 'bindingDigest'> = {
        requestId: frozen.requestId, projectId: frozen.projectId, snapshotId: frozen.snapshotId,
        providerRoute: frozen.routes[name], stage: name, ordinal: calls,
        inputDigest: digestCanonicalJson(envelope, dataLimits(budget.maxInputBytes)).digest,
        inputBytes: size, deadline, budget,
      };
      const permissionDigest = await bounded(() => ports.permissionIdentity(baseInput));
      if (typeof permissionDigest !== 'string' || permissionDigest.length === 0) stop('admission-refused');
      const bindingDigest = digestCanonicalJson({ ...baseInput, permissionDigest }, dataLimits(budget.maxInputBytes)).digest;
      const input: AttemptInput = { ...baseInput, permissionDigest, bindingDigest };
      const admission = await bounded(() => ports.admit(input));
      if (admission.kind === 'refused') stop(admission.reason === 'uncertain' ? 'effect-uncertain' : admission.reason === 'budget-exhausted' ? 'budget-exhausted' : 'admission-refused');
      const permit = admission.permit;
      if (admission.kind === 'completed') {
        if (admission.bindingDigest !== bindingDigest || admission.inputDigest !== input.inputDigest
          || !Number.isSafeInteger(admission.usageUnits) || admission.usageUnits < 0
          || !Number.isSafeInteger(admission.outputBytes) || admission.outputBytes < 0
          || admission.usageUnits > permit.maxUsageUnits || admission.outputBytes > permit.maxOutputBytes
          || usage + admission.usageUnits > budget.maxUsageUnits || outputBytes + admission.outputBytes > budget.maxOutputBytes) stop('admission-refused');
        if (!await bounded(() => ports.permitted(input, permit))) stop('admission-refused');
        let restored: unknown;
        try {
          restored = ports.validate(name, admission.value, context);
          if (digestCanonicalJson(restored, dataLimits(permit.maxOutputBytes)).digest !== admission.outputDigest) stop('admission-refused');
        } catch { stop('admission-refused'); }
        calls++;
        inputBytes += size;
        usage += admission.usageUnits;
        outputBytes += admission.outputBytes;
        receipts.push({ stage: name, attemptId: permit.attemptId, reused: true, providerRoute: input.providerRoute, model: admission.model,
          inputDigest: input.inputDigest, outputDigest: admission.outputDigest, promptVersion: prompt.version, promptProfile, promptDigest });
        artifacts.push({ stage: name, value: restored });
        check();
        return restored;
      }
      if (!Number.isSafeInteger(permit.maxUsageUnits) || permit.maxUsageUnits <= 0 || permit.maxUsageUnits > budget.maxUsageUnits - usage
        || !Number.isSafeInteger(permit.maxOutputBytes) || permit.maxOutputBytes <= 0 || permit.maxOutputBytes > budget.maxOutputBytes - outputBytes) {
        await bounded(() => ports.releaseUnsent(permit), true);
        stop('budget-exhausted');
      }
      const permitted = await bounded(() => ports.permitted(input, permit));
      if (signal.aborted || ports.now() >= deadline || !permitted) {
        await bounded(() => ports.releaseUnsent(permit), true);
        check();
        stop('admission-refused');
      }
      // Admission is already durable. Any exception from this point is potentially sent.
      calls++;
      inputBytes += size;
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      let interrupted = false;
      let interrupt!: (reason: StopReason) => void;
      const interruption = new Promise<never>((_, reject) => {
        interrupt = reason => { interrupted = true; controller.abort(); reject(new PipelineStop(reason)); };
      });
      const cancel = (): void => interrupt('cancelled');
      signal.addEventListener('abort', cancel, { once: true });
      const armDeadline = (): void => {
        const remaining = deadline - ports.now();
        if (remaining <= 0) interrupt('deadline');
        else timer = setTimeout(armDeadline, Math.min(remaining, 2_147_483_647));
      };
      armDeadline();
      const pending = Promise.resolve().then(() => {
        if (controller.signal.aborted) throw new PipelineStop(signal.aborted ? 'cancelled' : 'deadline');
        return ports.generate({ permit: permit, stage: name, system: prompt.system, input: encoded, responseSchema: JSON.parse(encoded).responseSchema, signal: controller.signal });
      });
      let reply: ProviderReply;
      try {
        reply = await Promise.race([pending, interruption]);
      } catch (error) {
        // The adapter owns durable late capture even if the caller stops awaiting.
        if (interrupted) void pending.then(r => ports.lateReceipt(permit, { model: r.model, usageUnits: r.usageUnits }), () => undefined).catch(() => undefined);
        await bounded(() => ports.record(permit, { kind: 'effect-uncertain', usageUnits: null }), true);
        if (error instanceof PipelineStop) throw error;
        stop('effect-uncertain');
      } finally {
        clearTimeout(timer);
        signal.removeEventListener('abort', cancel);
      }
      if (reply.usageUnits === null || !Number.isSafeInteger(reply.usageUnits) || reply.usageUnits < 0 || reply.usageUnits > permit.maxUsageUnits) {
        await bounded(() => ports.record(permit, { kind: 'usage-uncertain', usageUnits: null }), true);
        stop('usage-uncertain');
      }
      const actualUsage = reply.usageUnits;
      usage += actualUsage;
      let validated: unknown;
      let digest: string;
      let invalidOutputReason: InvalidOutputReason = 'parse-failed';
      try {
        const parsed = parseBoundedJson(reply.body, dataLimits(permit.maxOutputBytes));
        invalidOutputReason = 'schema-rejected';
        validated = ports.validate(name, parsed, context);
        invalidOutputReason = 'encode-failed';
        const bytes = encodeCanonicalJson(validated, dataLimits(permit.maxOutputBytes));
        validated = JSON.parse(bytes);
        // 'digest-failed' is believed unreachable here: digestCanonicalJson (below) re-runs
        // encodeCanonicalJson on `validated` under the SAME `dataLimits(permit.maxOutputBytes)`
        // limits the encode step just satisfied, and `validated` was reconstructed via
        // JSON.parse(bytes) from that very encoder's own output -- a plain object/array tree
        // with no Proxy, no foreign prototype, and (being a freshly built JSON.parse tree) no
        // cycle. Canonical encoding is deterministic (sorted keys, ECMAScript JSON primitive
        // spelling; see canonical-json.ts), so this second pass re-derives the identical
        // `bytes` and therefore cannot exceed a byte/node/depth limit it already met, nor
        // trigger an unsupported-object/property/cycle check that JSON.parse's own output can
        // never produce. Left as a distinct, typed step (not merged into 'encode-failed' and
        // not removed) because that guarantee belongs to encodeCanonicalJson/
        // digestCanonicalJson's contract, not to this call site: if it ever changes, this
        // still needs somewhere typed to report through rather than an unhandled
        // 'adapter-failure'.
        invalidOutputReason = 'digest-failed';
        digest = digestCanonicalJson(validated, dataLimits(permit.maxOutputBytes)).digest;
        outputBytes += Buffer.byteLength(reply.body, 'utf8');
      } catch (error) {
        // The step marker (set immediately before each fallible call) identifies which
        // stage rejected the reply; the message is truncated so a diagnostic can never
        // carry the invalid output body itself (PipelinePorts.record's contract).
        const detail = (error instanceof Error ? error.message : String(error)).slice(0, 200);
        await bounded(() => ports.record(permit, { kind: 'invalid-output', usageUnits: actualUsage, reason: invalidOutputReason, detail }), true);
        stop('invalid-output');
      }
      await bounded(() => ports.record(permit, { kind: 'validated', outputDigest: digest, model: reply.model,
        usageUnits: actualUsage, outputBytes: Buffer.byteLength(reply.body, 'utf8'), value: validated }), true);
      receipts.push({ stage: name, attemptId: permit.attemptId, reused: false, providerRoute: input.providerRoute, model: reply.model, inputDigest: input.inputDigest, outputDigest: digest, promptVersion: prompt.version, promptProfile, promptDigest });
      artifacts.push({ stage: name, value: validated });
      check();
      return validated;
    };
    context.inventory = await stage('inventory', { sources: context.sources, sourcePopulation, readerQuestions: context.readerQuestions, requestedAssets: context.requestedAssets });
    context.plan = await stage('plan', { sources: sourcePopulation, readerQuestions: context.readerQuestions, inventory: context.inventory, requestedAssets: context.requestedAssets });
    context.draft = await stage('author', { sources: citedSpans(context.plan), readerQuestions: context.readerQuestions, inventory: context.inventory, plan: context.plan, requestedAssets: context.requestedAssets });
    context.draft = await stage('edit', { sources: citedSpans(context.draft), readerQuestions: context.readerQuestions, inventory: context.inventory, plan: context.plan, draft: context.draft, requestedAssets: context.requestedAssets });
    let review = await stage('fidelity', { sources: citedSpans(context.draft), readerQuestions: context.readerQuestions, inventory: context.inventory, draft: context.draft, requestedAssets: context.requestedAssets });
    // A deterministic quote check the model cannot waive runs beside the reviewer. It earns the draft a repair, but only the reviewer's own blocking verdict ends the run: quote findings that survive the last repair are returned per block, and the renderer shows those blocks as Unknown.
    const quoteTexts = sourceTextById(frozen.sources);
    const judge = (reviewed: unknown): { readonly blocking: boolean; readonly findings: unknown; readonly reviewerBlocking: boolean; readonly quoteFindings: readonly QuoteFinding[] } => {
      const verdict = ports.fidelity(reviewed);
      const quoteFindings = checkDraftQuotes(context.draft, quoteTexts);
      if (quoteFindings.length === 0) return { ...verdict, reviewerBlocking: verdict.blocking, quoteFindings };
      const prior = verdict.findings === undefined ? [] : Array.isArray(verdict.findings) ? verdict.findings : [verdict.findings];
      return { blocking: true, findings: [...prior, ...quoteFindings.map(quoteFindingAsReviewFinding)], reviewerBlocking: verdict.blocking, quoteFindings };
    };
    let verdict = judge(review);
    for (let repairs = 0; verdict.blocking; repairs++) {
      if (repairs >= budget.maxRepairCycles) {
        if (verdict.reviewerBlocking) stop('repair-exhausted');
        break;
      }
      context.draft = await stage('repair', { sources: citedSpans(context.draft), readerQuestions: context.readerQuestions, inventory: context.inventory, draft: context.draft, findings: verdict.findings, requestedAssets: context.requestedAssets });
      review = await stage('fidelity', { sources: citedSpans(context.draft), readerQuestions: context.readerQuestions, inventory: context.inventory, draft: context.draft, requestedAssets: context.requestedAssets });
      verdict = judge(review);
    }
    check();
    return { status: 'awaiting-rendered-review', draft: context.draft, inventory: context.inventory, review, quoteFindings: verdict.quoteFindings, receipts, artifacts };
  } catch (error) {
    return { status: 'stopped', reason: error instanceof PipelineStop ? error.reason : 'adapter-failure', receipts, artifacts };
  }
}
