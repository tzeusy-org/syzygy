import * as fs from 'node:fs';
import * as path from 'node:path';
import { BoundedJsonError, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { isRecord, sha256 } from '@syzygy/support';
import { CREDENTIAL_CHECK_DISCLOSURE, credentialFindings, credentialStepCheck, storedBriefArm, type CredentialStepResult } from './credential-probe.js';
import { SESSION_ID_PATTERN } from './draft-schema.js';
import { executionFlags } from './execution-flags.js';
import { GitObjectReadRefusal, openPinnedObjectReader } from './git-object-reader.js';
import { isoOf } from './iso-of.js';
import type { Outcome } from './outcome.js';
import { readRunRecord } from './run-record.js';
import { reverifyPinnedRevision } from './reverify.js';
import { poleLimitOf, type RunConfig } from './run-config.js';
import { placementSubjectOf, screenLoaderOf } from './screen.js';
import { REVISION_FILE, RUN_ID, RUN_LAYOUT } from './state-directory.js';
import { figureFitClass, readerAdvice, type ReaderAdvice } from './reader-advice.js';
import { RUN_ADVICE_FILE, computeRunAdvice, mechanismEntries, writeRunAdvice } from './run-advice.js';
import { figureFit, type FigureFit } from './figure-fit.js';
import { readingDifference, readingLedger, type ReadingDifference, type ReadingLedger } from './reading-ledger.js';
import { isWithheldElement, reviewReachAdvice, type ReviewReachAdvice } from './review-reach.js';
import { screenCensusReport, withheldCensus, type ScreenCensusReport } from './census.js';
import { deriveStructure, deriveTreeFacts, secretOrUnder, structureUnknown, type StructureRecord, type TreeFacts } from './derive.js';
import { inventoryCoverageAdvice, type InventoryCoverageAdvice } from './inventory-coverage.js';
import { questionKindAdvice, type QuestionKindAdvice } from './question-kinds.js';
import { derivedRecordFile, encodeDerivedRecord, secretPathOf } from './derived-record.js';
import { CHECK_RECORD_LIMITS, NotARegularFileError, readBoundedFile } from './check-record-read.js';
import { IMPORT_BLOB_LIMIT, deriveImportFacts, importFactsUnknown, type ImportFacts } from './import-facts.js';
import { MANIFEST_BLOB_LIMIT, deriveManifestFacts, manifestFactsUnknown, type ManifestFacts } from './manifest-facts.js';
import { BRIEF_JSON_LIMITS, CHECK_RECORD_FORMAT, type BoundedCheckRecord, type RecordMeasure, type CheckCommand, type CheckDeps, type CheckFinding, type CheckRecord, type CheckRefusal, type CheckRequest, type CheckResult, type CheckStage, type CitedBlob, DEFAULT_DRAFT, DISCLOSURES, DRAFT_JSON_LIMITS, DRAFT_MAX_BYTES, type ExcludedQuotation, type MechanismAdvice, type ReviewVisibility, type SourceExampleAdvice, STEP_LOG_FORMAT, type VerifiedQuotation, errno, list, reviewVisibility, text } from './check-model.js';
import { type Derived, type SubjectRules, applyHeroFindings, containmentRelationFindings, deriveFindings, draftRules, relationDecisions, relationFindings, type RelationDecisions } from './check-derive.js';
import { applyContainmentFindings, containmentStructuralFindings, undecidedContainments } from './containment.js';
import { BASE_BASIS, type BaseContext, type ResolvedBase, admitOf, baseNestingFindings, checkBaseMaps, readBases } from './derived-base.js';
import { expandModel, modelDecisions, modelFindings, modelIndex, modelRelationFindings, modelUndecided, undecidedViews } from './system-model.js';
import { hasModelForm, hasRelationForm, hasWithheldHeroIdentity } from './draft-schema.js';
import { walkFindings, withoutWalks } from './walk.js';
import { walkAdvice as computeWalkAdvice, type WalkAdvice } from './walk-advice.js';
import { figureAdvice as computeFigureAdvice, figurePlanFindings, plansFigures, withoutFigurePlan, type FigureAdvice } from './figure-plan.js';
import { BLOB_MODES } from './git-object-reader.js';
import { RUN_TREE_BOUNDS, readBoundedText } from './run-tree-read.js';
export { CHECK_RECORD_FORMAT, STEP_LOG_FORMAT, DEFAULT_DRAFT, DRAFT_MAX_BYTES, reviewVisibility, lineRanges, blobRedaction } from './check-model.js';
export type { BoundedCheckRecord, BoundedRecordOmits, RecordMeasure, MechanismAdvice, CheckFindingKind, CheckFinding, VerifiedQuotation, ExcludedQuotation, ReviewVisibility, CitedBlob, BlobRedaction, CheckStage, CheckCommand, CheckRefusal, CheckRecord, CheckReport, CheckResult, CheckRequest, CheckDeps } from './check-model.js';
export { deriveFindings, draftRules, collectBlocks, collectCitations } from './check-derive.js';
export type { Derived, DeriveInputs, SubjectBlock, SubjectRules, Citation } from './check-derive.js';

/** `syzygy dossier check <run> [--draft <file>]` (REQ-polaris-generation-033, 034, 036).
 *
 * One check of one draft, in this order: the pinned revision is verified again against the records in force; the deadline (from the
 * brief's issue, on Syzygy's clock) and the repair-cycle limit refuse the step when spent; the adapter-credential check runs where the
 * brief permitted execution; the draft is read; the screening policy in force is loaded and the pinned tree listed and every cited blob
 * read from the clone the run record names, each object re-hashed on the way down from the pinned commit (the clone's working tree is
 * never read, and no clone is taken from the command line); then the draft's bytes
 * are frozen as revision N and the result written to `checks/rev-N.json`. A refusal writes no revision and no result.
 *
 * The checks: the draft's schema, its revision, unique identities and resolving references; every cited path a blob at the pinned
 * revision and every line range inside it; every quotation one contiguous run of its cited blob after the core's normalisation, on word
 * boundaries, inside the cited range, with its byte range; labels and citations by block kind, the Unknown reasons, and every block
 * marked as resting on execution naming a reported command; the understanding record's items; the clarification-question limit; and
 * every path of the self-reported discovery account a blob at the pinned revision. A quotation from a blob screening excludes is not
 * verified: its block is recorded Unknown (`excluded-content`), never a finding, and no finding carries quoted or excluded text.
 *
 * Every result is derived at this step from objects read now (R1): no earlier check result, byte range or record of earlier reads is
 * read. What is stored is within the agent sessions' write reach, so the revision count and the deadline's start are Inferred.
 *
 * `inventory-check` (REQ-polaris-generation-035) runs the same check through `checkSubject` with the inventory's plan: its own schema,
 * blocks, coverage account, frozen-revision directory and record, and a gate on the session identifiers (`inventory.ts`). */


/** What one checked revision yields, from which each subject builds its own record. */
export interface CheckedRevision {
  readonly runId: string;
  readonly revision: number;
  readonly pinned: string;
  readonly checkedAt: string;
  readonly outcome: 'passed' | 'findings';
  readonly file: { readonly file: string; readonly sha256: string; readonly bytes: number };
  readonly findings: readonly CheckFinding[];
  readonly quotations: readonly VerifiedQuotation[];
  readonly excludedContent: readonly ExcludedQuotation[];
  readonly citedBlobs: readonly CitedBlob[];
  readonly screeningPolicy: CheckRecord['screeningPolicy'];
  readonly credential: CredentialStepResult;
  readonly repairCycles: CheckRecord['limits']['repairCycles'];
  readonly deadline: CheckRecord['limits']['deadline'];
  /** The parsed subject; undefined when it is not one bounded JSON document. */
  readonly doc: unknown;
  readonly run: string;
  /** The clone's path as the run record names it. */
  readonly clonePath: string;
}

/** A subject's own gate, run once the subject is parsed and before any object is read: a refusal, or what it found for the record. */
export type SubjectGate<G> = { readonly ok: false; readonly stage: CheckStage; readonly reason: string } | { readonly ok: true; readonly found: G };

/** What differs between checking the authoring draft and checking the inventory. */
export interface SubjectPlan<R extends object, G> {
  readonly command: CheckCommand;
  readonly noun: 'draft' | 'inventory';
  /** Where revisions are frozen and their results written, relative to the run directory. */
  readonly frozenDir: string;
  readonly checksDir: string;
  /** The file checked when none is named, or why none is. */
  readonly defaultFile: (run: string) => string;
  readonly rules: (pinned: string, declared: RunConfig) => SubjectRules;
  readonly gate: (run: string, doc: unknown) => SubjectGate<G>;
  readonly record: (checked: CheckedRevision, found: G, declared: RunConfig) => R;
  readonly disclosures: readonly string[];
}

/** `screenCensus` (`census.ts`), `structureRecord` (`derive.ts`), `readerAdvice` (`reader-advice.ts`), `reviewReach` (`review-reach.ts`) and `inventoryCoverageAdvice` (`inventory-coverage.ts`) and `questionKindAdvice` (`question-kinds.ts`) are on `check`'s report only: advice to the author, never written
 * to the check record and never a finding. */
/** The record part is the record written: the full record, or its bounded form (version 2.10), whose report adds `findingsLeftOut`. */
export type SubjectReport<R extends object> = (R | BoundedCheckRecord<R>) & { readonly command: CheckCommand; readonly run: string; readonly checkFile: string; readonly disclosures: readonly string[]; readonly screenCensus?: ScreenCensusReport; readonly structureRecord?: StructureRecord; readonly readerAdvice?: ReaderAdvice; readonly figureFit?: FigureFit; readonly readingLedger?: ReadingLedger; readonly readingDifference?: ReadingDifference; readonly reviewReach?: ReviewReachAdvice; readonly reviewVisibility?: ReviewVisibility; readonly mechanismAdvice?: MechanismAdvice; readonly findingsLeftOut?: readonly CheckFinding[]; readonly inventoryCoverageAdvice?: InventoryCoverageAdvice; readonly questionKindAdvice?: QuestionKindAdvice; readonly sourceExampleAdvice?: SourceExampleAdvice; readonly figureAdvice?: FigureAdvice; readonly walkAdvice?: WalkAdvice };
export type SubjectResult<R extends object> = Outcome<SubjectReport<R>, CheckRefusal>;

const DRAFT_PLAN: SubjectPlan<CheckRecord, null> = {
  command: 'check',
  noun: 'draft',
  frozenDir: RUN_LAYOUT.drafts,
  checksDir: RUN_LAYOUT.checks,
  defaultFile: (run) => path.join(run, RUN_LAYOUT.drafts, DEFAULT_DRAFT),
  rules: (pinned, declared) => draftRules(pinned, declared.maxQuestions, poleLimitOf(declared)),
  gate: () => ({ ok: true, found: null }),
  record: (checked, _found, declared) => ({
    format: CHECK_RECORD_FORMAT,
    runId: checked.runId,
    revision: checked.revision,
    supersedes: checked.revision === 0 ? null : checked.revision - 1,
    pinnedRevision: checked.pinned,
    checkedAt: checked.checkedAt,
    outcome: checked.outcome,
    draft: checked.file,
    session: { sessionId: declaredSessionId(checked.doc), declaredBy: 'the authoring session', label: 'Inferred' },
    findings: checked.findings,
    executionFlags: executionFlags(isRecord(checked.doc) ? checked.doc['executions'] : undefined, checked.clonePath, storedBriefArm(checked.run)),
    quotations: checked.quotations,
    excludedContent: checked.excludedContent,
    citedBlobs: checked.citedBlobs,
    screeningPolicy: checked.screeningPolicy,
    credential: checked.credential,
    limits: {
      repairCycles: checked.repairCycles,
      questions: { declared: declared.maxQuestions, recorded: isRecord(checked.doc) && Array.isArray(checked.doc['clarifications']) ? checked.doc['clarifications'].length : null },
      deadline: checked.deadline,
    },
    label: 'Inferred',
  }),
  disclosures: DISCLOSURES,
};

const SESSION_ID = new RegExp(SESSION_ID_PATTERN, 'u');
/** A subject's declared session identifier when it is well formed, or null. */
export const declaredSessionId = (doc: unknown): string | null => {
  const id = isRecord(doc) ? doc['sessionId'] : undefined;
  return typeof id === 'string' && id.length <= 200 && SESSION_ID.test(id) ? id : null;
};

export async function checkDraft(runDir: string, request: CheckRequest, deps: CheckDeps): Promise<CheckResult> {
  return checkSubject(runDir, request.draftFile, deps, DRAFT_PLAN) as Promise<CheckResult>;
}

/** One check of one subject at the pinned revision, in the order the file comment states. A refusal freezes and writes nothing. */
export async function checkSubject<R extends object, G>(runDir: string, file: string | undefined, deps: CheckDeps, plan: SubjectPlan<R, G>): Promise<SubjectResult<R>> {
  const run = path.resolve(runDir);
  const started = deps.now();
  const { noun } = plan;
  const log = (entry: Record<string, unknown>): void => {
    try {
      const stored = readRunRecord(readBoundedText(path.join(run, RUN_LAYOUT.config), RUN_TREE_BOUNDS.runRecord));
      if (!stored.ok && stored.legacy) return;
      fs.appendFileSync(path.join(run, RUN_LAYOUT.steps), `${JSON.stringify({ format: STEP_LOG_FORMAT, step: plan.command, at: isoOf(started), ...entry })}\n`, { mode: 0o600 });
    } catch { /* the step log is a convenience within the agent's reach; a failure to append changes no result */ }
  };
  const refuse = (stage: CheckStage, reason: string, extra: Partial<CheckRefusal> = {}): SubjectResult<R> => {
    if (stage !== 'run') log({ outcome: 'refused', stage, reason });
    return { ok: false, refusal: { command: plan.command, outcome: 'refused', stage, reason, ...extra, at: isoOf(started), disclosures: plan.disclosures } };
  };
  const runId = path.basename(run);
  if (!RUN_ID.test(runId) || !fs.existsSync(path.join(run, RUN_LAYOUT.config))) return refuse('run', `${run} is not a run directory`);

  const checked = await reverifyPinnedRevision(run, deps.sources, started, deps.openReader ? { openReader: deps.openReader } : {});
  if (!checked.ok) {
    return refuse('reverify', `the pinned revision could not be verified again, so the ${noun} is not checked`, {
      reasons: checked.reasons, refusals: checked.refusals, ...(checked.objectRead ? { objectRead: checked.objectRead } : {}),
    });
  }
  const { subject, declared } = checked.record;
  const pinned = subject.pinnedRevision.commit;

  const issued = briefIssuedAt(run, pinned, noun);
  if (typeof issued === 'string') return refuse('not-briefed', issued);
  const deadlineEnds = issued + declared.deadline.seconds * 1000;
  if (started >= deadlineEnds) return refuse('deadline', `the deadline ${declared.deadline.declared} from the brief ended at ${isoOf(deadlineEnds)} on Syzygy's clock; no step runs after it`);

  const frozenDir = path.join(run, plan.frozenDir), checksDir = path.join(run, plan.checksDir);
  const revision = nextRevision(frozenDir);
  if (revision > declared.maxRepairCycles) {
    return refuse('repair-limit', `${noun === 'draft' ? '' : `${noun} `}revision ${revision} would be repair cycle ${revision} of the ${declared.maxRepairCycles} declared; the repair-cycle limit is spent`);
  }

  const credential = await credentialStepCheck(run, plan.command, deps.probe, started);

  const subjectFile = file === undefined ? plan.defaultFile(run) : path.resolve(file);
  const bytes = readSubject(subjectFile, noun);
  if (typeof bytes === 'string') return refuse(noun, bytes);
  let doc: unknown;
  let parseFault: string | null = null;
  try {
    doc = parseBoundedJson(new TextDecoder('utf-8', { fatal: true }).decode(bytes), DRAFT_JSON_LIMITS);
  } catch {
    parseFault = `the ${noun} is not one bounded UTF-8 JSON document`;
  }
  // A v14 draft's figure plan is read by check alone (version 2.33): its findings come last, below, and every other reader is handed the
  // draft without it. The frozen bytes keep it.
  const planned = plan.command === 'check' && parseFault === null && plansFigures(doc) ? doc : undefined;
  if (planned !== undefined) doc = withoutFigurePlan(planned);
  // A v16 draft's walks (version 2.40) are read by their own findings alone; every other reader is handed the draft without them.
  const walked = doc;
  doc = withoutWalks(doc);

  const gate = plan.gate(run, parseFault === null ? doc : undefined);
  if (!gate.ok) return refuse(gate.stage, gate.reason);

  const screenLoad = await screenLoaderOf(deps.loadScreen, deps.sources.recordsRoot, started)(placementSubjectOf(subject));
  if (!screenLoad.ok) return refuse('screen', screenLoad.why);
  const screen = screenLoad.screen;
  if (isRecord(doc) && hasWithheldHeroIdentity(doc, secretPathOf(screen))) {
    return refuse('screen', 'the hero identity is withheld by screening');
  }

  const reader = (deps.openReader ?? openPinnedObjectReader)({ gitDir: path.join(subject.clone.path, '.git'), revision: pinned });
  const findings: CheckFinding[] = [];
  let quotations: VerifiedQuotation[] = [], excludedContent: ExcludedQuotation[] = [], citedBlobs: CitedBlob[] = [];
  let admitted: Derived['admitted'] = new Map();
  let shapeValid = false;
  if (parseFault !== null) findings.push({ kind: 'not-json', at: '$', detail: parseFault });
  else {
    let derived: Derived;
    try {
      derived = await deriveFindings(doc, { pinned, screen, reader }, plan.rules(pinned, declared));
    } catch (cause) {
      if (cause instanceof GitObjectReadRefusal) return refuse('object-read', `an object at the pinned revision could not be read: ${cause.message}`, { objectRead: cause.toJSON() });
      throw cause;
    }
    findings.push(...derived.findings);
    ({ quotations, excludedContent, citedBlobs, admitted, shapeValid } = derived);
  }
  // The author's path-only census of what the review will not see (syzygy-mea.3, lead ruling): every blob of the pinned tree, through the
  // same screen and the class gate, on every check from the first. The reader re-lists the tree it listed for the derivation.
  // The structure record (syzygy-3efd.16) is derived from the same listing: paths and modes alone, a secret path counted and never named.
  // The derived-structure record (REQ-polaris-generation-034 version 2.3) is derived from that listing too, by rule top-level-unit, and
  // kept once beside the check record: what a render publishes unchanged and compares with its own re-derivation.
  // Declared manifest facts (REQ-polaris-generation-034 version 2.7, syzygy-3efd.25) are read from that listing as well: each admitted
  // manifest through a second reader on the same clone whose object bound is 1 MiB, one call per file. They are kept in the draft's check
  // record (`manifestFacts`), never in an inventory check record, and derived whether or not the draft parses.
  let screenCensus: ScreenCensusReport | undefined, structureRecord: StructureRecord | undefined, derivedRecord: string | undefined;
  let manifestFacts: ManifestFacts | undefined, importFacts: ImportFacts | undefined, treeFacts: TreeFacts | undefined;
  let listedEntries: Awaited<ReturnType<typeof reader.listTree>> | undefined;
  if (plan.command === 'check') {
    // `capturedAt` is the instant this check listed the tree: taken once the listing returns, or once it is refused.
    const source = (): { repositoryId: string; revision: string; capturedAt: string } => ({ repositoryId: subject.repository.repositoryId, revision: pinned, capturedAt: isoOf(deps.now()) });
    const isSecretPath = secretPathOf(screen);
    let entries: Awaited<ReturnType<typeof reader.listTree>> | undefined;
    try {
      entries = await reader.listTree();
      const listed = source();
      screenCensus = screenCensusReport({ ok: true, census: withheldCensus(entries, screen, checked.contentClasses) });
      structureRecord = deriveStructure(entries, isSecretPath);
      treeFacts = deriveTreeFacts(entries, isSecretPath);
      derivedRecord = encodeDerivedRecord(listed, treeFacts);
    } catch (cause) {
      if (!(cause instanceof GitObjectReadRefusal)) throw cause;
      screenCensus = screenCensusReport({ ok: false, why: `the pinned tree could not be listed (${cause.reason})`, consented: checked.contentClasses });
      structureRecord = structureUnknown(`the pinned tree could not be listed (${cause.reason})`);
      derivedRecord = encodeDerivedRecord(source(), { why: `the pinned tree could not be listed (${cause.reason})` });
      manifestFacts = manifestFactsUnknown(cause.reason);
      importFacts = importFactsUnknown(cause.reason);
    }
    listedEntries = entries;
    if (entries !== undefined) {
      const manifestReader = (deps.openReader ?? openPinnedObjectReader)({ gitDir: path.join(subject.clone.path, '.git'), revision: pinned, maxObjectBytes: MANIFEST_BLOB_LIMIT });
      manifestFacts = await deriveManifestFacts({
        entries, screen, consented: checked.contentClasses,
        read: async (manifestPath) => (await manifestReader.readBlobs([manifestPath]))[0]!,
      });
      // Lexical import facts (version 2.39, syzygy-3efd.89): each admitted TypeScript file through a third reader on the same clone whose
      // object bound is 256 KiB, one call per file, collapsed to units from the listing and the manifest facts just derived.
      const importReader = (deps.openReader ?? openPinnedObjectReader)({ gitDir: path.join(subject.clone.path, '.git'), revision: pinned, maxObjectBytes: IMPORT_BLOB_LIMIT });
      importFacts = await deriveImportFacts({
        entries, screen, consented: checked.contentClasses, manifestFacts,
        read: async (filePath) => (await importReader.readBlobs([filePath]))[0]!,
      });
    }
  }
  if (credential.required && !credential.passed) {
    for (const finding of credentialFindings(credential)) {
      findings.push({ kind: finding.kind, at: '$', detail: `${finding.why}. ${finding.instruction}` });
    }
  }
  // Version 2.19 (syzygy-3efd.28): after every finding version 2.16 reports, the `unit-reference` findings and then the `relation-challenged`
  // findings of a v9 draft, from the tree this check listed, the structure facts and the manifest facts it derived. The states of the edges
  // are decided only for a draft with no schema finding; an `unknown` state is never a finding. Check reads no currency policy for them.
  // A v11 draft's group units and nestings (version 2.23), decided here and reported after its structural containment findings below.
  let containmentDecisions: Pick<RelationDecisions, 'groupUnits' | 'nestings'> | undefined;
  let checkedBases: ReadonlyMap<number, ResolvedBase> = new Map();
  if (plan.command === 'check' && parseFault === null && isRecord(doc) && hasRelationForm(doc['schemaVersion'])) {
    const isSecretPath = secretPathOf(screen);
    const blobs = new Set(listedEntries?.filter((entry) => BLOB_MODES.has(entry.mode)).map((entry) => entry.path));
    const hidden = (repositoryPath: string): boolean => secretOrUnder(repositoryPath.split('/'), isSecretPath) || screen.screenPath(repositoryPath) === 'denied-path';
    const reach = { citedBlobs, admitted, screen, consented: checked.contentClasses };
    // `isWithheldElement` is `isWithheldItem` (review-reach.ts), the predicate that enters an edge in the render's `withheldElements`, which
    // `edgeRelationsAt` reads: check and render share one notion of a withheld edge.
    const decisions = relationDecisions(doc, (edge) => edge['epistemic'] === 'inferred' && !isWithheldElement(edge, reach),
      listedEntries === undefined ? undefined : { hidden, isBlob: (repositoryPath) => blobs.has(repositoryPath) }, {
        structure: treeFacts === undefined ? { state: 'unknown' } : { state: 'derived', ...treeFacts },
        manifest: manifestFacts === undefined || manifestFacts.state !== 'derived' ? { state: 'unknown' } : manifestFacts,
        imports: importFacts === undefined || importFacts.state !== 'derived' ? { state: 'unknown' } : importFacts,
        hidden,
      }, (element) => isWithheldElement(element, reach),
      // A containment with a figure-kind, depth, size or flat finding has no nesting decided; where the draft has a schema finding no
      // nesting is decided at all (cleared below), so the structural findings are read here as if no list had one.
      undecidedContainments([...findings, ...containmentStructuralFindings(doc, new Set())]));
    const schemaFault = findings.some((finding) => finding.kind === 'schema');
    findings.push(...relationFindings(schemaFault ? { ...decisions, edges: [] } : decisions));
    containmentDecisions = schemaFault ? { ...decisions, nestings: [] } : decisions;
  }

  if (plan.command === 'check' && parseFault === null && isRecord(doc)) {
    applyHeroFindings(doc, findings);
    // Version 2.23: after every finding version 2.22 reports, a v11 draft's containment-depth, -size and -flat findings, then its groups'
    // unit-reference and its nestings' relation-challenged findings.
    applyContainmentFindings(doc, findings);
    if (containmentDecisions !== undefined) findings.push(...containmentRelationFindings(containmentDecisions));
  }

  // Version 2.24: after every finding version 2.23 reports, a v12 draft's model and view findings, then the `relation-challenged` findings
  // of its relationships and parents, decided once each from its views' expansion where no schema, unresolved-reference, element-type or
  // element-parent finding stands.
  if (plan.command === 'check' && parseFault === null && isRecord(doc) && hasModelForm(doc['schemaVersion'])) {
    const isSecretPath = secretPathOf(screen);
    const blobs = new Set(listedEntries?.filter((entry) => BLOB_MODES.has(entry.mode)).map((entry) => entry.path));
    const hidden = (repositoryPath: string): boolean => secretOrUnder(repositoryPath.split('/'), isSecretPath) || screen.screenPath(repositoryPath) === 'denied-path';
    const tree = listedEntries === undefined ? undefined : { hidden, isBlob: (repositoryPath: string) => blobs.has(repositoryPath) };
    // A v15 draft's bases read against the maps this check derived (version 2.35), their details screened.
    const baseContext: BaseContext = { maps: checkBaseMaps(treeFacts, manifestFacts), admit: admitOf(screen), hidden };
    const schemaSet = new Set(findings.filter((finding) => finding.kind === 'schema').map((finding) => finding.at));
    findings.push(...modelFindings(doc, schemaSet, tree, baseContext));
    checkedBases = readBases(doc, baseContext, schemaSet).resolved;
    if (!modelUndecided(findings)) {
      const reach = { citedBlobs, admitted, screen, consented: checked.contentClasses };
      const elements = modelIndex(doc).elementById;
      const held = (element: Readonly<Record<string, unknown>>): boolean => isWithheldElement(element, reach);
      const endHeld = (id: unknown): boolean => { const entry = typeof id === 'string' ? elements.get(id) : undefined; return entry !== undefined && held(entry.element); };
      const expanded = expandModel(doc, checkedBases).doc;
      // A relationship either of whose elements renders as a withheld item is unasserted (`edge-not-inferred`), as a withheld edge is. A base
      // element is Syzygy's (version 2.35): only its nesting inside an element of the model, which a `group` entry states, is the draft's claim.
      const decisions = relationDecisions(expanded, (edge) => (edge['basis'] === BASE_BASIS ? edge['grouped'] === true
        : edge['epistemic'] === 'inferred' && !held(edge) && !endHeld(edge['from']) && !endHeld(edge['to'])), tree, {
        structure: treeFacts === undefined ? { state: 'unknown' } : { state: 'derived', ...treeFacts },
        manifest: manifestFacts === undefined || manifestFacts.state !== 'derived' ? { state: 'unknown' } : manifestFacts,
        imports: importFacts === undefined || importFacts.state !== 'derived' ? { state: 'unknown' } : importFacts,
        hidden,
      }, held, undecidedViews(findings));
      findings.push(...modelRelationFindings(modelDecisions(doc, decisions.edges, decisions.nestings)));
      findings.push(...baseNestingFindings(doc, checkedBases, decisions.nestings, baseContext.admit));
    }
  }

  // Version 2.33: after every finding version 2.32 reports, a v14 draft's figure-plan findings.
  if (planned !== undefined) findings.push(...figurePlanFindings(planned));
  // Version 2.40: after every other finding, a v16 draft's walk findings, its base ends read against the maps this check derived.
  if (plan.command === 'check' && parseFault === null && isRecord(walked)) findings.push(...walkFindings(walked, checkBaseMaps(treeFacts, manifestFacts)));

  const frozen = path.join(frozenDir, `rev-${revision}.json`), checkFile = path.join(checksDir, `rev-${revision}.json`);
  // A derived record already in place for this revision (planted, or left by a crash) is never overwritten or adopted: refused here,
  // before the draft is frozen, so the revision is not spent.
  if (derivedRecord !== undefined && fs.existsSync(derivedRecordFile(run, revision))) {
    return refuse('freeze', `${path.relative(run, derivedRecordFile(run, revision))} already exists, but draft revision ${revision} has not been checked; Syzygy writes that record once, so the draft is not frozen. Remove the file and check again`);
  }
  try {
    fs.mkdirSync(frozenDir, { recursive: true, mode: 0o700 });
    fs.writeFileSync(frozen, bytes, { mode: 0o600, flag: 'wx' });
  } catch (cause) {
    return refuse('freeze', `the ${noun} could not be frozen as ${path.relative(run, frozen)} (${errno(cause)})`);
  }
  const outcome = findings.length === 0 ? 'passed' : 'findings';
  const record = plan.record({
    runId,
    revision,
    pinned,
    checkedAt: isoOf(started),
    outcome,
    file: { file: path.relative(run, frozen), sha256: sha256(bytes), bytes: bytes.byteLength },
    findings,
    quotations,
    excludedContent,
    citedBlobs,
    screeningPolicy: { policyId: screen.policyId, policyVersion: screen.policyVersion, sha256: screen.policySha256 },
    credential,
    repairCycles: { declared: declared.maxRepairCycles, thisRevision: revision, label: 'Inferred', basis: `the frozen ${noun} revisions in the run directory` },
    deadline: { endsAt: isoOf(deadlineEnds), label: 'Inferred', basis: 'the issue instant the brief record states, plus the declared deadline' },
    doc: parseFault === null ? doc : undefined,
    run,
    clonePath: subject.clone.path,
  }, gate.found, declared);
  // Figure fit (syzygy-3efd.20): advice like readerAdvice, but kept in the draft's check record so a later check can be compared with
  // this one; an inventory check record carries none, and a draft that does not parse states nothing about fit.
  // A v12 draft's figures, their advice and its reading ledger are its views' expansion's (version 2.24); an advisory's path is moved back
  // to the model or view member it reads, and the ledger locates it at the diagram it was found in, as the expansion's own draft would.
  // A v15 view whose base resolved at this check is drawn with its base elements (version 2.35).
  const viewed = parseFault === null && isRecord(doc) && hasModelForm(doc['schemaVersion']) ? expandModel(doc, checkedBases) : undefined;
  // A v14 draft's expansion keeps its own schema, so the rules that name schema v13 or v14 read it as render does (version 2.33); a v12
  // draft's stays v11's, as version 2.24 reports it.
  const figureDoc = viewed === undefined ? doc : planned !== undefined && isRecord(doc) ? { ...viewed.doc, schemaVersion: doc['schemaVersion'] } : viewed.doc;
  const fit = plan.command === 'check' && parseFault === null ? figureFit(figureDoc, deps.layoutFigure) : undefined;
  // The reading ledger (REQ-polaris-generation-034 version 2.4, syzygy-3efd.21): counts over the draft beside figureFit, from the same
  // draft bytes, so two checks of one draft write the same member; an inventory check record carries none.
  const expandedReaderAdvice = plan.command === 'check' && parseFault === null ? readerAdvice(figureDoc) : undefined;
  // An advisory on a shared element or relationship is located once, at the first diagram whose view selects it (version 2.24).
  const movedKey = (advisory: { readonly at: string }): string => JSON.stringify({ ...advisory, at: viewed!.move(advisory.at) });
  const ledgerAdvice = expandedReaderAdvice === undefined || viewed === undefined ? expandedReaderAdvice
    : { ...expandedReaderAdvice, advisories: expandedReaderAdvice.advisories.filter((advisory, k, all) => all.findIndex((other) => movedKey(other) === movedKey(advisory)) === k) };
  const ledger = fit === undefined || ledgerAdvice === undefined ? undefined : readingLedger(figureDoc, fit, ledgerAdvice);
  const advice = expandedReaderAdvice === undefined || viewed === undefined ? expandedReaderAdvice
    // A relationship two views share is advised once, at its one path.
    : { ...expandedReaderAdvice, advisories: [...new Map(expandedReaderAdvice.advisories.map((advisory) => ({ ...advisory, at: viewed.move(advisory.at) }))
      .map((advisory) => [JSON.stringify(advisory), advisory] as const)).values()] };
  const stored = {
    ...record, ...(fit === undefined ? {} : { figureFit: fit }), ...(ledger === undefined ? {} : { readingLedger: ledger }),
    ...(importFacts === undefined ? {} : { importFacts }), ...(manifestFacts === undefined ? {} : { manifestFacts }),
  };
  // Version 2.10 (syzygy-3efd.73 (a)): every check record written lies within the read bound. The record is measured as a reader measures
  // it before it is written; past any bound, its bounded form is written in its place, with one repair finding, and the full findings go
  // to the report alone. A record within the bound is written exactly as before.
  const fullText = `${JSON.stringify(stored, null, 2)}\n`;
  const measure = (deps.measureRecord ?? measureCheckRecord)(fullText);
  const full = measure.bytes <= CHECK_RECORD_LIMITS.maxBytes && measure.values <= CHECK_RECORD_LIMITS.maxNodes && measure.depth <= CHECK_RECORD_LIMITS.maxDepth;
  const written = full ? stored : boundedCheckRecord(stored, recordBoundFinding(measure, { quotations: quotations.length, excluded: excludedContent.length, citedFiles: citedBlobs.length, findings: findings.length }));
  try {
    if (derivedRecord !== undefined) {
      fs.mkdirSync(path.join(run, RUN_LAYOUT.derived), { recursive: true, mode: 0o700 });
      fs.writeFileSync(derivedRecordFile(run, revision), derivedRecord, { mode: 0o600, flag: 'wx' });
    }
    fs.mkdirSync(checksDir, { recursive: true, mode: 0o700 });
    fs.writeFileSync(checkFile, full ? fullText : `${JSON.stringify(written, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
  } catch (cause) {
    return refuse('write', `${noun === 'draft' ? '' : `${noun} `}revision ${revision} was frozen, but its result could not be written to ${path.relative(run, checkFile)} (${errno(cause)})`);
  }
  // The step log counts the findings of the record written: the bounded form's one.
  log({ outcome: full ? outcome : 'findings', revision, findings: full ? findings.length : 1 });
  // Advice no author can act on (version 2.9, syzygy-3efd.64): after its check record, a draft check writes the run file from the run's
  // check records, in place of any earlier one; a failure to write it changes no outcome and no record. The check record keeps every entry.
  // A bounded form holds no `figureFit`, so its report carries no `mechanismAdvice` (version 2.10); the run file is written all the same.
  let mechanismAdvice: MechanismAdvice | undefined;
  if (plan.command === 'check') {
    const runAdvice = computeRunAdvice(run, runId);
    let fileWritten = true;
    try { writeRunAdvice(run, runAdvice); } catch { fileWritten = false; }
    if (full) mechanismAdvice = { file: fileWritten ? RUN_ADVICE_FILE : null, thisRevision: mechanismEntries(stored).length, inRun: runAdvice.occurrences };
  }
  // Check's report carries only `author`-class advice: its `figureFit` leaves out every `mechanism` entry, `examined` unchanged. Where the
  // bounded form was written, the report carries no `figureFit` and lists the full record's findings as `findingsLeftOut`.
  const reportFit = fit === undefined || !full ? {} : { figureFit: { ...fit, entries: fit.entries.filter((entry) => figureFitClass(entry) === 'author') } };
  const leftOut = full ? {} : { findingsLeftOut: findings };
  const disclosures = credential.required ? [...plan.disclosures, CREDENTIAL_CHECK_DISCLOSURE] : plan.disclosures;
  const visibility = reviewVisibility(citedBlobs, screen.contentClass, checked.contentClasses);
  // The difference from the previous run of this repository: computed now from the state root, never written to any file. A bounded form
  // keeps no ledger, so it is Unknown in the bounded form's own words, never the not-parse words (version 2.11).
  const difference = plan.command === 'check' ? readingDifference(run, subject.repository.repositoryId, isoOf(started), full ? ledger : 'bounded') : undefined;
  // The claim blocks no fidelity verdict can confirm (syzygy-pdja.20), read from this derivation's own blobs.
  const reach = plan.command === 'check' && parseFault === null
    ? reviewReachAdvice(doc, { citedBlobs, admitted, screen, consented: checked.contentClasses }) : undefined;
  // The inventory entries no block of this draft covers (syzygy-5dhm.28), from the inventory of record as it reads now.
  const coverage = plan.command === 'check' && parseFault === null
    ? await inventoryCoverageAdvice(run, doc, { ...(deps.inventoryOfRecord ? { inventoryOfRecord: deps.inventoryOfRecord } : {}), sources: deps.sources, now: started,
      isSecretPath: secretPathOf(screen) })
    : undefined;
  // The kinds of newcomer question no block answers per major unit (syzygy-5dhm.135), from the draft's own declarations and the units of
  // the tree this check listed.
  const kinds = plan.command === 'check' && parseFault === null ? questionKindAdvice(doc, treeFacts, secretPathOf(screen)) : undefined;
  const sourceExample = full && plan.command === 'check' && shapeValid && isRecord(doc)
    ? sourceExampleAdvice(doc) : undefined;
  // Version 2.33: a v14 draft with no schema finding has figure advice; a failure to compute it leaves the member out, never fails check.
  let figures: FigureAdvice | undefined;
  if (planned !== undefined && !findings.some((finding) => finding.kind === 'schema')) {
    try { figures = computeFigureAdvice(planned); } catch { figures = undefined; }
  }
  // Version 2.51: a v16 draft with no schema finding has walk advice, its base ends read against the maps this check derived; a failure to
  // compute it leaves the member out, never fails check.
  let walks: WalkAdvice | undefined;
  if (plan.command === 'check' && parseFault === null && isRecord(walked)) {
    try {
      const isSecretPath = secretPathOf(screen);
      walks = computeWalkAdvice(walked, findings, checkBaseMaps(treeFacts, manifestFacts), { admit: admitOf(screen),
        hidden: (repositoryPath) => secretOrUnder(repositoryPath.split('/'), isSecretPath) || screen.screenPath(repositoryPath) === 'denied-path' });
    } catch { walks = undefined; }
  }
  return { ok: true, report: {
    command: plan.command, run, checkFile, ...written, ...reportFit, ...leftOut, ...(mechanismAdvice === undefined ? {} : { mechanismAdvice }), disclosures, ...(screenCensus === undefined ? {} : { screenCensus }),
    ...(structureRecord === undefined ? {} : { structureRecord }),
    ...(advice === undefined ? {} : { readerAdvice: advice }), ...(difference === undefined ? {} : { readingDifference: difference }), ...(reach === undefined ? {} : { reviewReach: reach }),
    ...(visibility === null ? {} : { reviewVisibility: visibility }),
    ...(coverage === undefined ? {} : { inventoryCoverageAdvice: coverage }),
    ...(kinds === undefined ? {} : { questionKindAdvice: kinds }),
    ...(sourceExample === undefined ? {} : { sourceExampleAdvice: sourceExample }),
    ...(figures === undefined ? {} : { figureAdvice: figures }),
    ...(walks === undefined ? {} : { walkAdvice: walks }),
  } };
}

/** The existing shape check has established the eligible lists before we look for a selection. */
function sourceExampleAdvice(doc: Readonly<Record<string, unknown>>): SourceExampleAdvice | undefined {
  const version = doc['schemaVersion'];
  if (version !== 'polaris-dossier-local-draft-v13' && version !== 'polaris-dossier-local-draft-v14' && version !== 'polaris-dossier-local-draft-v15' && version !== 'polaris-dossier-local-draft-v16') return;
  const isCode = (item: unknown): boolean => isRecord(item) && item['kind'] === 'code';
  const selectsCode = (part: unknown): boolean => isRecord(part) && list(part['paragraphs']).some(item =>
    isCode(item) || (isRecord(item) && item['kind'] === 'details' && list(item['elements']).some(isCode)));
  const isProduced = (part: unknown): part is Readonly<Record<string, unknown>> => {
    if (!isRecord(part)) return false;
    const disposition = part['disposition'];
    return isRecord(disposition) && disposition['kind'] === 'produced';
  };
  const sectionExample = list(doc['sections']).filter(isProduced).some(section =>
    selectsCode(section) || list(section['subsections']).some(selectsCode));
  const diveExample = list(doc['deepDives']).filter(isProduced).some(selectsCode);
  if (sectionExample || diveExample) return;
  return {
    code: 'no-source-example',
    label: 'Inferred',
    detail: 'Consider a cited source example that shows what the project does.',
  };
}

/** A check record's encoded text measured as `parseBoundedJson` measures it (version 2.10): its UTF-8 bytes, its values (the root and every
 * value below it; a key is not a value) and its deepest level below the root, the root at depth 0. */
export function measureCheckRecord(text: string): RecordMeasure {
  let values = 0, depth = 0;
  const walk = (value: unknown, level: number): void => {
    values += 1;
    if (level > depth) depth = level;
    if (Array.isArray(value)) { for (const item of value) walk(item, level + 1); }
    else if (value !== null && typeof value === 'object') { for (const item of Object.values(value)) walk(item, level + 1); }
  };
  walk(JSON.parse(text), 0);
  return { bytes: Buffer.byteLength(text, 'utf8'), values, depth };
}

/** The members a bounded check record keeps (version 2.10), in the full record's order: those whose size does not grow with the subject. */
const BOUNDED_MEMBERS: ReadonlySet<string> = new Set([
  'format', 'runId', 'revision', 'supersedes', 'pinnedRevision', 'checkedAt', 'outcome', 'draft', 'inventory', 'session', 'findings',
  'screeningPolicy', 'credential', 'limits', 'counts', 'completeness', 'label',
]);

/** The bounded form of a check record (version 2.10): the members `BOUNDED_MEMBERS` names, in the full record's order, each as the full
 * record holds it but `outcome`, which is `findings`, and `findings`, which holds `finding` alone. */
export function boundedCheckRecord<R extends object>(stored: R, finding: CheckFinding): BoundedCheckRecord<R> & { readonly findings: readonly CheckFinding[] } {
  const bounded: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(stored)) {
    if (!BOUNDED_MEMBERS.has(key)) continue;
    bounded[key] = key === 'outcome' ? 'findings' : key === 'findings' ? [finding] : value;
  }
  return bounded as BoundedCheckRecord<R> & { readonly findings: readonly CheckFinding[] };
}

/** The one repair finding of a bounded check record, its detail counting what the full record would have held. */
export function recordBoundFinding(measure: RecordMeasure, counts: { readonly quotations: number; readonly excluded: number; readonly citedFiles: number; readonly findings: number }): CheckFinding {
  return {
    kind: 'check-record-bound', at: '$',
    detail: `the check record would take ${measure.bytes} bytes, ${measure.values} values and ${measure.depth} levels below its root, past the read bound of 16,777,216 bytes, 2,000,000 values and 16 levels; it would hold ${counts.quotations} verified quotations, ${counts.excluded} excluded quotations, ${counts.citedFiles} cited files and ${counts.findings} other findings, which this record leaves out: quote and cite less, then check again`,
  };
}

/** The instant the brief record states it was issued, or why the run counts as not briefed. */
export function briefIssuedAt(run: string, pinned: string, noun = 'draft'): number | string {
  let record: unknown;
  try {
    // Read by the reader rule under the brief record's 262,144 bytes (syzygy-3efd.76): a FIFO, a device, a directory or a
    // record past the bound is one check cannot read.
    record = parseBoundedJson(readBoundedFile(path.join(run, RUN_LAYOUT.briefRecord), BRIEF_JSON_LIMITS.maxBytes).toString('utf8'), BRIEF_JSON_LIMITS);
  } catch {
    return `the run holds no readable ${RUN_LAYOUT.briefRecord}: no brief was issued, so the deadline clock has not started and no ${noun} is checked`;
  }
  if (!isRecord(record) || record['pinnedRevision'] !== pinned) return `${RUN_LAYOUT.briefRecord} does not name the pinned revision ${pinned}`;
  const issuedAt = text(record['issuedAt']);
  const instant = issuedAt === undefined || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(issuedAt) ? Number.NaN : Date.parse(issuedAt);
  return Number.isNaN(instant) ? `${RUN_LAYOUT.briefRecord} states no issue instant, so the deadline cannot be measured` : instant;
}

/** The next revision number in a directory of frozen revisions: one past the highest, or 0. */
export function nextRevision(dir: string): number {
  let names: string[];
  try { names = fs.readdirSync(dir); } catch { return 0; }
  const numbers = names.flatMap((name) => { const match = REVISION_FILE.exec(name); return match === null ? [] : [Number(match[1])]; });
  return numbers.length === 0 ? 0 : Math.max(...numbers) + 1;
}

/** The draft or inventory check is given, read by the reader rule under the draft's 4,194,304 bytes (syzygy-3efd.76): opened
 * once without blocking, refused before any byte is read where it is not a regular file or its size is past the bound, and refused where
 * more than the bound is read after its size was taken. Check freezes exactly these bytes. */
function readSubject(file: string, noun: string): Uint8Array | string {
  try {
    return new Uint8Array(readBoundedFile(file, DRAFT_MAX_BYTES));
  } catch (cause) {
    if (cause instanceof NotARegularFileError) return `${file} is not a regular file`;
    if (cause instanceof BoundedJsonError && cause.code === 'byte-limit') return `${file} is larger than the ${DRAFT_MAX_BYTES}-byte ${noun} bound`;
    return `the ${noun} ${file} cannot be read (${errno(cause)})`;
  }
}
