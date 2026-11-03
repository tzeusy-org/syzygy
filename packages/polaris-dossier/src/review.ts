import * as fs from 'node:fs';
import * as path from 'node:path';
import { isRecord, sha256 } from '@syzygy/support';
import { isoOf } from './iso-of.js';
import { expectedLaunch, launchFormRefusal, launchedMarkerState } from './launched.js';
import { declaredSessionId } from './check.js';
import { LOCAL_FIDELITY_VERDICT_SCHEMA_VERSION } from './draft-schema.js';
import { RECORDS_WITHIN_REACH } from './gate-sources.js';
import { INVENTORY_INFERRED, authoringSessionIds, errno, logStep, openRun, readRecord, type OpenedRun } from './inventory.js';
import { designBlocking, validateDesignVerdict, type DesignPacketBuild } from './design-review.js';
import type { Outcome } from './outcome.js';
import type { ReverifyRefusal } from './reverify.js';
import { recheckSessionStatement, type SessionStatementOfRecord } from './session-statement.js';
import { RUN_LAYOUT } from './state-directory.js';
import { REVIEW_CHECKS, REVIEW_CHECK_FORMAT, type ReviewCheckRecord, type ReviewCheckResult, type ReviewDeps, type ReviewInferred, type ReviewKind, type ReviewObserved, type ReviewProblem, VERDICT_FILE, VERDICT_MAX_BYTES, isReviewKind, latestReviewSession, list, reviewLaunchRecordName, reviewPromptRecordName, reviewSessionDirectory, verdictFileName } from './review-model.js';
import { DESIGN_PACKET_DISCLOSURES, PACKET_DISCLOSURES, buildFidelityPacket, buildStoredDesignPacket, parseSubject, writePacket } from './review-packet.js';
import { derivedBlocking, nextVerdictNumber, validateVerdict } from './review-verdict.js';
export { FIDELITY_PACKET_FORMAT, REVIEW_CHECK_FORMAT, PACKET_FILE, PACKET_DIGEST_FILE, VERDICT_FILE, REVIEW_KINDS, isReviewKind, REVIEW_CHECKS, packetDirName, verdictFileName, reviewSessionDirName, reviewPromptRecordName, reviewLaunchRecordName, reviewSessionDirectory, latestReviewSession } from './review-model.js';
export type { ReviewKind, PacketSpan, SpanRedaction, SpanCitation, PacketBuild, ReviewDeps, ReviewProblemKind, ReviewProblem, ReviewCheckRecord, ReviewCheckResult, ReviewObserved, ReviewInferred } from './review-model.js';
export { fidelityCriteria, latestPassedDraft, buildFidelityPacket, writePacket, buildStoredDesignPacket } from './review-packet.js';
export { validateVerdict } from './review-verdict.js';

/** `syzygy dossier review-packet` and `syzygy dossier review-check` (REQ-polaris-generation-035, 006; design decision 5).
 *
 * Syzygy builds the fidelity packet itself, from the latest frozen draft revision (which must have passed its check) and the inventory
 * of record: the draft with its understanding record and without its read account (`discovery`), the frozen inventory as the criterion
 * coverage is measured against, every span the draft and the inventory cite as Syzygy read it now at the pinned revision (screening-
 * admitted, in a content class the run's statement lists, only; any other span is listed without a byte), Syzygy's criteria, the verdict schema and the pinned revision. Its digest
 * is the SHA-256 of `packet.json`, written beside it in `packet.sha256` so the review session can re-hash the packet before reading it.
 *
 * `review-check` rebuilds the packet from the current frozen subject and validates the verdict against it: schema, packet digest,
 * pinned revision, session identifier distinct from the authoring and inventory sessions', an entry for every inventory entry and claim
 * block, the accuracy of every inventory entry, every quotation it relies on, and no declared readiness beside a blocking finding. Every
 * verdict is frozen and its result recorded, refused or validated; a validated verdict counts only while the packet rebuilt then still
 * has the digest it names and its session's launch form is recorded (`reviewOfRecord`). A new draft or inventory revision changes the
 * packet, so it retires the verdicts bound to the old one.
 *
 * The rendered-design review (`--kind design`) works the same way over the latest rendered site: its packet is the rendered pages
 * excluding the one named review-status region (`design-review.ts`), its verdict judges every page, and `render` decides the design review
 * of record by building the packet from the pages it has just rendered, so a render that changes anything outside the region retires the
 * review while one that changes only the region keeps it counted. */

type ReviewPacketRefusal = { readonly command: 'review-packet'; readonly outcome: 'refused'; readonly stage: string; readonly reason: string; readonly reasons?: readonly string[]; readonly refusals?: readonly ReverifyRefusal[]; readonly disclosures: readonly string[] };
/** One outcome per packet kind: two `ok: true` variants, as before Outcome; one variant with a union report is wider (syzygy-bpyt.8.32). */
export type ReviewPacketResult =
  | Outcome<{ readonly command: 'review-packet'; readonly outcome: 'built'; readonly run: string; readonly kind: 'fidelity'; readonly packetSha256: string; readonly directory: string; readonly draftRevision: number; readonly inventoryRevision: number; readonly spans: { readonly admitted: number; readonly excluded: number }; readonly label: 'Observed'; readonly disclosures: readonly string[] }, ReviewPacketRefusal>
  | Outcome<{ readonly command: 'review-packet'; readonly outcome: 'built'; readonly run: string; readonly kind: 'design'; readonly packetSha256: string; readonly directory: string; readonly site: number; readonly pages: number; readonly label: 'Observed'; readonly disclosures: readonly string[] }, ReviewPacketRefusal>;

/** `syzygy dossier review-packet <run> --kind fidelity|design`. */
export async function reviewPacket(runDir: string, request: { readonly kind: string }, deps: ReviewDeps): Promise<ReviewPacketResult> {
  const now = deps.now();
  const disclosures = request.kind === 'design' ? DESIGN_PACKET_DISCLOSURES : PACKET_DISCLOSURES;
  const refuse = (stage: string, reason: string, reasons?: readonly string[], run?: string, refusals?: readonly ReverifyRefusal[]): ReviewPacketResult => {
    if (run !== undefined) logStep(run, 'review-packet', now, { outcome: 'refused', stage, reason });
    return { ok: false, refusal: { command: 'review-packet', outcome: 'refused', stage, reason, ...(reasons ? { reasons } : {}), ...(refusals ? { refusals } : {}), disclosures } };
  };
  if (!isReviewKind(request.kind)) return refuse('kind', `--kind must be fidelity or design, not ${JSON.stringify(request.kind)}`);
  const opened = await openRun(runDir, deps.sources, now, 'no review packet is built', deps.openReader ? { openReader: deps.openReader } : {});
  if (!opened.ok) return refuse(opened.stage, opened.reason, opened.reasons, undefined, opened.refusals);
  if (request.kind === 'design') {
    const design = buildStoredDesignPacket(opened);
    if (!design.ok) return refuse(design.stage, design.reason, undefined, opened.run);
    let directory: string;
    try { directory = writePacket(opened.run, 'design', design); } catch (cause) { return refuse('write', `the packet could not be written (${errno(cause)})`, undefined, opened.run); }
    logStep(opened.run, 'review-packet', now, { outcome: 'built', kind: 'design', packetSha256: design.sha256, site: design.site });
    return { ok: true, report: {
      command: 'review-packet', outcome: 'built', run: opened.run, kind: 'design', packetSha256: design.sha256, directory, site: design.site!, pages: design.pages.length,
      label: 'Observed', disclosures,
    } };
  }
  const built = await buildFidelityPacket(opened, deps);
  if (!built.ok) return refuse(built.stage, built.reason, undefined, opened.run);
  let directory: string;
  try { directory = writePacket(opened.run, 'fidelity', built); } catch (cause) { return refuse('write', `the packet could not be written (${errno(cause)})`, undefined, opened.run); }
  logStep(opened.run, 'review-packet', now, { outcome: 'built', kind: 'fidelity', packetSha256: built.sha256 });
  const admitted = built.spans.filter((span) => span.outcome === 'admitted').length;
  return { ok: true, report: {
    command: 'review-packet', outcome: 'built', run: opened.run, kind: 'fidelity', packetSha256: built.sha256, directory,
    draftRevision: built.draft.revision, inventoryRevision: built.inventory.revision, spans: { admitted, excluded: built.spans.length - admitted },
    label: 'Observed', disclosures: PACKET_DISCLOSURES,
  } };
}

export const REVIEW_INFERRED: readonly string[] = Object.freeze([
  'the reviewer\'s reading of the emitted packet: every judgement, finding and readiness the verdict declares, which Syzygy checks for shape, completeness, quotation and consistency and never for truth',
  'that the review session read the packet Syzygy emitted, unaltered',
  'that each session was a top-level session the operator started, in the launch form declared, and not a subagent or process of the authoring session',
  'that each context was fresh, that the review session saw nothing beyond its packet and that the inventory session did not see the draft',
  'that the verdict and the inventory were written by the sessions declared for them, and the session identifiers themselves',
  INVENTORY_INFERRED.completeness,
]);

const CHECK_DISCLOSURES = [
  RECORDS_WITHIN_REACH,
  'Syzygy rebuilt the packet at this step from the current frozen draft, the inventory of record and Git objects read by identifier at the pinned revision; the rebuilt packet, its digest and whether the verdict names it are Observed. Everything else about the review is Inferred, as listed.',
  'A verdict counts only while the packet rebuilt then has the digest it names and once the launch form of its session is recorded with `syzygy dossier launch-form`; passing this check does not make it count.',
];

/** What stays Inferred about a rendered-design review however its verdict validates. */
export const DESIGN_REVIEW_INFERRED: readonly string[] = Object.freeze([
  'the reviewer\'s reading of the emitted packet: every judgement, finding and readiness the verdict declares, which Syzygy checks for shape, completeness and consistency and never for truth',
  'that the review session read the packet Syzygy emitted, unaltered',
  'that the session was a top-level session the operator started, in the launch form declared, and not a subagent or process of the authoring session',
  'that its context was fresh and that it saw nothing beyond its packet',
  'that the verdict was written by the session declared for it, and the session identifier itself',
]);

const DESIGN_CHECK_DISCLOSURES = [
  RECORDS_WITHIN_REACH,
  'Syzygy rebuilt the packet at this step from the files of the latest rendered site as it read them now, with the review-status region removed; the rebuilt packet, its digest and whether the verdict names it are Observed. Everything else about the review is Inferred, as listed.',
  'A design verdict counts only once the launch form of its session is recorded with `syzygy dossier launch-form`, and only while a render, at that render, builds from the pages it has just rendered a packet with the digest the verdict names; passing this check does not make it count.',
];

/** `syzygy dossier review-check <run> [--kind fidelity|design] [--verdict <file>]`: validate the latest session's verdict of the kind
 * (fidelity by default) against the packet rebuilt now, freeze it as `reviews/<kind>-verdict-N.json` and record the result in
 * `reviews/checks/`. A verdict that fails validation is recorded and does not count. */
export async function reviewCheck(runDir: string, request: { readonly verdictFile?: string; readonly kind?: string }, deps: ReviewDeps): Promise<ReviewCheckResult> {
  const now = deps.now();
  const kind = request.kind ?? 'fidelity';
  const disclosures = kind === 'design' ? DESIGN_CHECK_DISCLOSURES : CHECK_DISCLOSURES;
  const refuse = (stage: string, reason: string, reasons?: readonly string[], run?: string, refusals?: readonly ReverifyRefusal[]): ReviewCheckResult => {
    if (run !== undefined) logStep(run, 'review-check', now, { outcome: 'refused', stage, reason });
    return { ok: false, refusal: { command: 'review-check', outcome: 'refused', stage, reason, ...(reasons ? { reasons } : {}), ...(refusals ? { refusals } : {}), disclosures } };
  };
  if (!isReviewKind(kind)) return refuse('kind', `--kind must be fidelity or design, not ${JSON.stringify(kind)}`);
  const opened = await openRun(runDir, deps.sources, now, 'no verdict is checked', deps.openReader ? { openReader: deps.openReader } : {});
  if (!opened.ok) return refuse(opened.stage, opened.reason, opened.reasons, undefined, opened.refusals);
  const { run, runId } = opened;
  const session = latestReviewSession(run, kind);
  if (session === 0) return refuse('session', `no ${kind} review session has been handed over: the operator starts it from \`syzygy dossier session-prompt ${run} review --kind ${kind}\`, and a verdict from any other session is not checked`, undefined, run);

  const file = request.verdictFile === undefined ? path.join(reviewSessionDirectory(run, kind, session), VERDICT_FILE) : path.resolve(request.verdictFile);
  let bytes: Uint8Array;
  try {
    const stats = fs.statSync(file);
    if (!stats.isFile()) return refuse('verdict', `${file} is not a regular file`, undefined, run);
    if (stats.size > VERDICT_MAX_BYTES) return refuse('verdict', `${file} is larger than the ${VERDICT_MAX_BYTES}-byte verdict bound`, undefined, run);
    bytes = new Uint8Array(fs.readFileSync(file));
  } catch (cause) { return refuse('verdict', `the verdict ${file} cannot be read (${errno(cause)})`, undefined, run); }

  const verdict = parseSubject(bytes);
  const notJson: ReviewProblem[] = [{ kind: 'not-json', at: '$', detail: 'the verdict is not one bounded UTF-8 JSON object' }];
  let problems: ReviewProblem[], blockingOf: (doc: Readonly<Record<string, unknown>>) => boolean;
  let packet: ReviewCheckRecord['packet'], distinctFrom: string, basis: string, counts: string;
  if (kind === 'design') {
    const built = buildStoredDesignPacket(opened);
    if (!built.ok) return refuse(built.stage, `the packet cannot be rebuilt, so no verdict is checked: ${built.reason}`, undefined, run);
    problems = verdict === undefined ? notJson : validateDesignVerdict(verdict, built, opened.subject.pinnedRevision.commit, authoringSessionIds(run).ids);
    blockingOf = designBlocking;
    packet = { sha256: built.sha256, site: built.site! };
    distinctFrom = 'the authoring session\'s identifiers declared by the frozen draft revisions';
    basis = 'the verdict\'s own rows: a blocking finding or a page not acceptable';
    counts = `only once the launch form of design session ${session} is recorded, and only while a render builds from the pages it has just rendered a packet with the digest this verdict names`;
  } else {
    const built = await buildFidelityPacket(opened, deps);
    if (!built.ok) return refuse(built.stage, `the packet cannot be rebuilt, so no verdict is checked: ${built.reason}`, undefined, run);
    problems = verdict === undefined ? notJson : validateVerdict(verdict, built, authoringSessionIds(run).ids);
    blockingOf = derivedBlocking;
    packet = { sha256: built.sha256, draftRevision: built.draft.revision, inventoryRevision: built.inventory.revision };
    distinctFrom = `the authoring session's identifiers declared by the frozen draft revisions, and the inventory session's of inventory revision ${built.inventory.revision}`;
    basis = 'the verdict\'s own rows: a blocking finding, an entry neither represented nor justifiably omitted, an entry not accurate, or a block not supported';
    counts = `only once the launch form of fidelity session ${session} is recorded, and only while the packet rebuilt then has the digest this verdict names`;
  }
  const named = verdict !== undefined && typeof verdict['packetSha256'] === 'string' ? verdict['packetSha256'] : null;
  const blocking = verdict === undefined || problems.some((problem) => problem.kind === 'schema') ? null : blockingOf(verdict);
  const declared = verdict !== undefined && (verdict['readiness'] === 'ready' || verdict['readiness'] === 'not-ready') ? verdict['readiness'] : null;

  const reviews = path.join(run, RUN_LAYOUT.reviews), checks = path.join(run, REVIEW_CHECKS);
  const number = nextVerdictNumber(reviews, kind);
  const frozen = path.join(RUN_LAYOUT.reviews, verdictFileName(kind, number));
  const checkFile = path.join(run, REVIEW_CHECKS, verdictFileName(kind, number));
  const outcome = problems.length === 0 ? 'validated' : 'refused';
  const record: ReviewCheckRecord = {
    format: REVIEW_CHECK_FORMAT,
    runId,
    kind,
    number,
    checkedAt: isoOf(now),
    outcome,
    verdict: { file: frozen, sha256: sha256(bytes), bytes: bytes.byteLength, packetSha256Named: named },
    packet,
    session: {
      number: session, sessionId: verdict === undefined ? null : declaredSessionId(verdict), declaredBy: 'the review session', label: 'Inferred',
      distinctFrom,
    },
    problems,
    readiness: { declared, blocking, basis, declaredBy: 'the review session', label: 'Inferred' },
    counts: outcome === 'validated' ? counts : 'never: the verdict failed validation',
    label: 'Inferred',
  };
  try {
    fs.mkdirSync(checks, { recursive: true, mode: 0o700 });
    fs.writeFileSync(path.join(run, frozen), bytes, { mode: 0o600, flag: 'wx' });
    fs.writeFileSync(checkFile, `${JSON.stringify(record, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
  } catch (cause) {
    return refuse('write', `verdict ${number} could not be frozen or its result written (${errno(cause)})`, undefined, run);
  }
  logStep(run, 'review-check', now, { outcome, kind, number, problems: problems.length });
  return { ok: true, report: {
    command: 'review-check', run, checkFile, ...record,
    observed: { packetSha256: packet.sha256, verdictNamesPacket: named === packet.sha256, label: 'Observed' },
    inferred: { basis: kind === 'design' ? DESIGN_REVIEW_INFERRED : REVIEW_INFERRED, label: 'Inferred' },
    disclosures,
  } };
}

export type ReviewOfRecord =
  | {
    readonly counts: true; readonly kind: 'fidelity'; readonly number: number; readonly session: number; readonly packetSha256: string;
    /** The verdict's content: its readiness, whether it blocks, and its support judgement of each claim block, by block id. */
    readonly verdict: {
      readonly readiness: 'ready' | 'not-ready'; readonly blocking: boolean;
      readonly blockSupport: Readonly<Record<string, 'supported' | 'anchor-does-not-support' | 'unresolved'>>;
      readonly declaredBy: 'the review session'; readonly label: 'Inferred';
    };
    readonly sessionId: { readonly value: string; readonly declaredBy: 'the review session'; readonly label: 'Inferred' };
    readonly launchForm: { readonly value: 'terminal' | 'bang' | 'syzygy-launched'; readonly declaredBy: 'operator' | 'syzygy'; readonly label: 'Inferred' | 'Observed' };
    /** The per-project statement the review session's work stands on now; null when the run relies on none. */
    readonly providerStatement: SessionStatementOfRecord | null;
    readonly observed: ReviewObserved; readonly inferred: ReviewInferred; readonly label: 'Inferred';
  }
  | { readonly counts: false; readonly why: string };

type CheckedVerdict =
  | {
    readonly ok: true; readonly number: number; readonly session: number; readonly verdict: Readonly<Record<string, unknown>>; readonly form: 'terminal' | 'bang' | 'syzygy-launched';
    readonly providerStatement: SessionStatementOfRecord | null;
  }
  | { readonly ok: false; readonly why: string };

/** The latest checked verdict of a kind, validated, its frozen bytes unchanged, written in a session whose launch form is recorded against
 * that session's prompt and whose cited per-project statement still governs the session's pair at `now` (`recheckSessionStatement`).
 * Whether it still names the packet rebuilt now is the caller's. */
async function latestCheckedVerdict(
  run: string, kind: ReviewKind, packetCheck: (verdict: Readonly<Record<string, unknown>>, number: number) => string | undefined, recheck: Pick<ReviewDeps, 'sources' | 'now'>,
): Promise<CheckedVerdict> {
  const no = (why: string): CheckedVerdict => ({ ok: false, why });
  const number = nextVerdictNumber(path.join(run, RUN_LAYOUT.reviews), kind) - 1;
  if (number < 0) return no(`no ${kind} verdict has been checked`);
  const check = readRecord(path.join(run, REVIEW_CHECKS, verdictFileName(kind, number)));
  if (check === undefined || check['format'] !== REVIEW_CHECK_FORMAT || check['number'] !== number) return no(`the result of ${kind} verdict ${number} cannot be read`);
  if (check['outcome'] !== 'validated') return no(`${kind} verdict ${number} failed validation`);
  const frozen = path.join(RUN_LAYOUT.reviews, verdictFileName(kind, number));
  let bytes: Uint8Array;
  try { bytes = new Uint8Array(fs.readFileSync(path.join(run, frozen))); } catch (cause) { return no(`the frozen verdict ${frozen} cannot be read (${errno(cause)})`); }
  const recorded = isRecord(check['verdict']) ? check['verdict'] : {};
  if (recorded['file'] !== frozen || recorded['sha256'] !== sha256(bytes)) return no(`the frozen verdict ${frozen} is not the bytes its check recorded`);
  const verdict = parseSubject(bytes);
  if (verdict === undefined) return no(`the frozen verdict ${frozen} is not one bounded JSON object`);
  const stale = packetCheck(verdict, number);
  if (stale !== undefined) return no(stale);
  const sessionRecord = isRecord(check['session']) ? check['session'] : {};
  const session = sessionRecord['number'];
  if (typeof session !== 'number' || !Number.isSafeInteger(session) || session < 1) return no(`the result of ${kind} verdict ${number} names no session`);
  const prompt = readRecord(path.join(run, RUN_LAYOUT.reviews, reviewPromptRecordName(kind, session)));
  const promptSha = prompt !== undefined && typeof prompt['prompt'] === 'string' ? sha256(prompt['prompt']) : undefined;
  if (promptSha === undefined || prompt!['promptSha256'] !== promptSha) return no(`the prompt record of ${kind} session ${session} cannot be read or does not match its own digest`);
  const launch = readRecord(path.join(run, RUN_LAYOUT.reviews, reviewLaunchRecordName(kind, session)));
  if (launch === undefined) return no(`no launch form is recorded for ${kind} session ${session}: run \`syzygy dossier launch-form ${run} review terminal|bang${kind === 'design' ? ' --kind design' : ''}\` with the operator's answer`);
  const form = isRecord(launch['form']) ? launch['form'] : {};
  const formRefusal = launchFormRefusal(run, form);
  if (formRefusal !== null || launch['role'] !== 'review' || launch['kind'] !== kind || launch['session'] !== session || launch['promptSha256'] !== promptSha) {
    return no(`the launch-form record of ${kind} session ${session} is not ${expectedLaunch(launchedMarkerState(run))} of that session's prompt`);
  }
  const statement = await recheckSessionStatement(run, `${kind} session ${session}`, prompt!, recheck.sources, recheck.now());
  if (!statement.ok) return no(statement.why);
  return { ok: true, number, session, verdict, form: form['value'] as 'terminal' | 'bang' | 'syzygy-launched', providerStatement: statement.statement };
}

/** The fidelity review that counts, if any: the latest checked verdict, validated, its frozen bytes unchanged, naming the packet Syzygy
 * rebuilds now from the current frozen subject, under an identifier neither the authoring nor the inventory session declares, written in
 * a session whose launch form is recorded against that session's prompt. */
export async function reviewOfRecord(opened: Extract<OpenedRun, { ok: true }>, deps: ReviewDeps): Promise<ReviewOfRecord> {
  const { run } = opened;
  if (nextVerdictNumber(path.join(run, RUN_LAYOUT.reviews), 'fidelity') === 0) return { counts: false, why: 'no fidelity verdict has been checked' };
  const built = await buildFidelityPacket(opened, deps);
  const checked = await latestCheckedVerdict(run, 'fidelity', (verdict, number) => {
    if (!built.ok) return `the packet cannot be rebuilt now: ${built.reason}`;
    const problems = validateVerdict(verdict, built, authoringSessionIds(run).ids);
    return problems.length === 0 ? undefined : `fidelity verdict ${number} no longer validates against the packet rebuilt now (${problems.map((problem) => problem.kind).join(', ')}); a revision of the draft or the inventory retires it`;
  }, deps);
  if (!checked.ok || !built.ok) return { counts: false, why: checked.ok ? 'the packet cannot be rebuilt now' : checked.why };
  const { number, session, verdict, form, providerStatement } = checked;
  return {
    counts: true, kind: 'fidelity', number, session, packetSha256: built.sha256,
    verdict: {
      readiness: verdict['readiness'] as 'ready' | 'not-ready', blocking: derivedBlocking(verdict),
      blockSupport: Object.fromEntries(list(verdict['blockSupport']).filter(isRecord).map((row) => [row['blockId'] as string, row['verdict'] as 'supported' | 'anchor-does-not-support' | 'unresolved'])),
      declaredBy: 'the review session', label: 'Inferred',
    },
    sessionId: { value: declaredSessionId(verdict)!, declaredBy: 'the review session', label: 'Inferred' },
    launchForm: form === 'syzygy-launched' ? { value: form, declaredBy: 'syzygy', label: 'Observed' } : { value: form, declaredBy: 'operator', label: 'Inferred' },
    providerStatement,
    observed: { packetSha256: built.sha256, verdictNamesPacket: true, label: 'Observed' },
    inferred: { basis: REVIEW_INFERRED, label: 'Inferred' },
    label: 'Inferred',
  };
}

export type DesignReviewOfRecord =
  | {
    readonly counts: true; readonly kind: 'design'; readonly number: number; readonly session: number; readonly packetSha256: string;
    readonly verdict: { readonly readiness: 'ready' | 'not-ready'; readonly blocking: boolean; readonly declaredBy: 'the review session'; readonly label: 'Inferred' };
    readonly sessionId: { readonly value: string; readonly declaredBy: 'the review session'; readonly label: 'Inferred' };
    readonly launchForm: { readonly value: 'terminal' | 'bang' | 'syzygy-launched'; readonly declaredBy: 'operator' | 'syzygy'; readonly label: 'Inferred' | 'Observed' };
    readonly providerStatement: SessionStatementOfRecord | null;
    readonly observed: ReviewObserved; readonly inferred: ReviewInferred; readonly label: 'Inferred';
  }
  | { readonly counts: false; readonly why: string };

/** The rendered-design review that counts for `built`, the design packet of the pages a render has just produced: the latest checked
 * design verdict, validated, its frozen bytes unchanged, still valid against that packet (so naming its digest), under an identifier the
 * authoring session does not declare, written in a session whose launch form is recorded. Any change to the pages outside the
 * review-status region changes the packet, so it retires the review; so does the withdrawal of the statement the session was handed over
 * under (`recheckSessionStatement`). */
export async function designReviewOfRecord(
  opened: Extract<OpenedRun, { ok: true }>, built: Extract<DesignPacketBuild, { ok: true }>, recheck: Pick<ReviewDeps, 'sources' | 'now'>,
): Promise<DesignReviewOfRecord> {
  const { run } = opened;
  const checked = await latestCheckedVerdict(run, 'design', (verdict, number) => {
    const problems = validateDesignVerdict(verdict, built, opened.subject.pinnedRevision.commit, authoringSessionIds(run).ids);
    return problems.length === 0 ? undefined : `design verdict ${number} no longer validates against the packet built from these pages (${problems.map((problem) => problem.kind).join(', ')}); a change to the pages outside the review-status region retires it`;
  }, recheck);
  if (!checked.ok) return { counts: false, why: checked.why };
  const { number, session, verdict, form, providerStatement } = checked;
  return {
    counts: true, kind: 'design', number, session, packetSha256: built.sha256,
    verdict: { readiness: verdict['readiness'] as 'ready' | 'not-ready', blocking: designBlocking(verdict), declaredBy: 'the review session', label: 'Inferred' },
    sessionId: { value: declaredSessionId(verdict)!, declaredBy: 'the review session', label: 'Inferred' },
    launchForm: form === 'syzygy-launched' ? { value: form, declaredBy: 'syzygy', label: 'Observed' } : { value: form, declaredBy: 'operator', label: 'Inferred' },
    providerStatement,
    observed: { packetSha256: built.sha256, verdictNamesPacket: true, label: 'Observed' },
    inferred: { basis: DESIGN_REVIEW_INFERRED, label: 'Inferred' },
    label: 'Inferred',
  };
}

export { LOCAL_FIDELITY_VERDICT_SCHEMA_VERSION };
