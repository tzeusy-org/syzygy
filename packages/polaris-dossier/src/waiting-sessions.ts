import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { isRecord, sha256 } from '@syzygy/support';
import { DRAFT_MAX_BYTES, type CheckDeps } from './check.js';
import { RECORDS_WITHIN_REACH, type GateSources } from './gate-sources.js';
import {
  INVENTORY_BRIEF_FILE, checkInventory, errno, latestInventorySession, logStep, openRun, promptRecordName, readRecord, sessionsRoot,
  type InventoryCheckResult,
} from './inventory.js';
import { isoOf } from './iso-of.js';
import type { Outcome } from './outcome.js';
import type { ReverifyOptions, ReverifyRefusal } from './reverify.js';
import {
  PACKET_DIGEST_FILE, PACKET_FILE, REVIEW_CHECKS, isReviewKind, latestReviewSession, reviewCheck, reviewPromptRecordName, verdictFileName,
  writePacket, type ReviewCheckResult, type ReviewDeps, type ReviewKind,
} from './review.js';
import type { ScreenLoader } from './screen.js';
import { RUN_ID, RUN_LAYOUT } from './state-directory.js';

/** Pre-started waiting sessions (owner direction `POLARIS-DOSSIER-WAITING-SESSIONS-2026-10-08`; the candidate v1.2 of
 * `polaris-dossier-local-agent-mode`, REQ-polaris-generation-035 as amended there).
 *
 * At the start of a run the authoring session runs `syzygy dossier session-prompt <run> all`: Syzygy makes the inventory, fidelity-review
 * and design-review session directories under the sessions root, writes the inventory brief into the inventory one, and prints a command
 * per session with the narrowest tool permissions the agent tool offers for that role. The operator starts each session; Syzygy starts,
 * resumes and signals none. Each session runs `syzygy dossier await <its directory>/`, its one Syzygy command:
 *
 * - without `--submit`, it waits, a bounded slice at a time, for round N of its input (the inventory brief at once; a review packet when
 *   the authoring session next runs `session-prompt <run> review --kind <kind>`), then re-hashes what was delivered against the digest
 *   in the delivery and the record Syzygy wrote in the run directory, and says what to read. It reads only the local file system: no
 *   network, no process;
 * - with `--submit <file>`, it runs the role's check (`inventory-check` or `review-check`) on a file inside its own directory.
 *
 * A review session that has submitted its verdict may wait for round N+1: the next packet of the same kind, delivered after a repair, is
 * delivered to it rather than to a new session (the owner's sub-answer: one reviewer may continue across revisions). Every delivery is
 * recorded in the run directory; `continuationOf` reads those records, and the declared session identifiers of earlier verdicts, so the
 * review page can disclose a continuing reviewer. Every record lies within the agent sessions' write reach, so all of it is Inferred.
 *
 * Gated by a matching sign-off at or after v1.2 and its effective UTC day (OWNER-DIRECTION-POLARIS-WAIT-MODE-UTC-DAY-2026-11-05). */

export const WAIT_MODE_DIRECTION = 'POLARIS-DOSSIER-WAITING-SESSIONS-2026-10-08';
export const WAIT_MODE_SPEC = 'polaris-dossier-local-agent-mode v1.2';
export const WAITING_MODE = 'waiting';
export const DELIVERY_FORMAT = 'polaris-dossier-delivery/1';
export const AWAIT_FORMAT = 'polaris-dossier-await/1';
export const DELIVERY_FILE = 'delivery.json';
/** One wait slice, by default: under the longest shell-tool timeout an agent tool commonly allows (ten minutes in Claude Code, Inferred). */
export const DEFAULT_WAIT_MINUTES = 9;
export const MAX_WAIT_MINUTES = 60;
/** How often a wait slice looks for its delivery in the session directory. Local file system only. */
export const POLL_MS = 2_000;
/** The heredoc delimiter every printed hand-over names, always quoted, so the shell expands nothing in the JSON it carries. */
export const HEREDOC_DELIMITER = 'SYZYGY_EOF';
/** How a session passes JSON on the standard input of `command`: a heredoc with a quoted delimiter. The JSON may quote observed text
 * holding `$(…)` or backticks; under an unquoted delimiter the shell would run them. `fence` wraps the command (a backtick in a report,
 * nothing in a one-line prompt). */
export const stdinHandOver = (command: string, fence = '`'): string =>
  `${fence}${command} <<'${HEREDOC_DELIMITER}'${fence}, a heredoc whose delimiter is quoted exactly so: the JSON on the lines after it and ${HEREDOC_DELIMITER} alone on the last line. With the delimiter quoted the shell never expands the body, so nothing in it runs`;
/** The wait advice every waiting prompt carries: a slice of `DEFAULT_WAIT_MINUTES` fits the longest Bash timeout of Claude Code. */
export const WAIT_TIMEOUT_ADVICE = `Run every syzygy dossier await with your shell tool's longest timeout (600000 milliseconds in Claude Code): one call waits up to ${DEFAULT_WAIT_MINUTES} minutes`;
export const roundDirName = (round: number): string => `round-${round}`;
export const deliveryRecordName = (kind: ReviewKind, session: number, round: number): string => `${kind}-session-${session}.delivery-${round}.json`;
const DELIVERY_RECORD = (kind: ReviewKind, session: number): RegExp => new RegExp(`^${kind}-session-${session}\\.delivery-([1-9][0-9]*)\\.json$`, 'u');
/** A path a printed permission rule can carry as one shell word without quoting, so the rule matches the command the session types. */
export const PLAIN_PATH = /^\/[A-Za-z0-9._/-]+$/u;
const SIGNOFF_RECORD = /^POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v([0-9]+)\.([0-9]+)\.md$/u;
const DECISIONS = path.join('.syzygy', 'governance', 'decisions');
const DELIVERY_JSON_LIMITS = Object.freeze({ maxBytes: 65_536, maxNodes: 256, maxDepth: 4 });

const SIGNOFF_PACKAGE = 'polaris-dossier-local-agent-mode';
const AGGREGATE = 'ACCEPTANCE-ACT-RECORD.md';

/** Read a trusted-checkout record whose structural subset holds: the first twelve nonblank lines carry the recorder's title, package,
 * version, tag, reviewed commit and confirming verdict; the aggregate has exactly one marked block. This is not full-template or
 * owner-act provenance verification. Effective-day eligibility is evaluated separately, after matching the applied subject. */
function readSignoffRecord(decisions: string, name: string, version: string): string | undefined {
  let text: string, aggregate: string;
  try {
    text = fs.readFileSync(path.join(decisions, name), 'utf8');
    aggregate = fs.readFileSync(path.join(decisions, AGGREGATE), 'utf8');
  } catch { return undefined; }
  const head = text.split('\n').filter((line) => line.trim() !== '').slice(0, 12);
  const field = (key: string): string | undefined => head.find((line) => line.startsWith(`${key}: `))?.slice(key.length + 2);
  const headHolds = head[0] === `# Polaris dossier local-agent mode — version-tagged sign-off v${version}`
    && field('Package') === SIGNOFF_PACKAGE && field('Version') === version && field('Tag') === `${SIGNOFF_PACKAGE}-v${version}`
    && /^[0-9a-f]{40}$/u.test(field('Reviewed commit') ?? '') && (field('Review verdict') === 'CONFIRM' || field('Review verdict') === 'CONFIRM WITH EXCEPTIONS');
  const start = `<!-- versioned-signoff:${SIGNOFF_PACKAGE}:v${version} -->`, end = `<!-- /versioned-signoff:${SIGNOFF_PACKAGE}:v${version} -->`;
  const blockHolds = aggregate.split(start).length === 2 && aggregate.split(end).length === 2 && aggregate.indexOf(start) < aggregate.indexOf(end);
  return headHolds && blockHolds ? text : undefined;
}

export function signoffRecordHolds(decisions: string, name: string, version: string): boolean {
  return readSignoffRecord(decisions, name, version) !== undefined;
}

const INSTALLED_SPEC = path.join('openspec', 'changes', SIGNOFF_PACKAGE, 'specs', 'polaris-generation', 'spec.md');
const MANIFEST_LINE = /^Manifest SHA-256: ([0-9a-f]{64})$/u;

/** Whether the records root carries the applied, signed bytes of `version`, as the v1.2 builder's signed check reads them: the review the
 * record names (a path inside the records root) carries exactly one `Manifest SHA-256` in its head, its first four non-blank lines; the
 * installed spec hashes to it; and the spec's head names the version. A record written by hand, with no review and no applied patch,
 * opens nothing. */
export function appliedSubjectHolds(recordsRoot: string, recordFile: string, version: string): boolean {
  let record: string, spec: Buffer;
  try {
    record = fs.readFileSync(recordFile, 'utf8');
    spec = fs.readFileSync(path.join(recordsRoot, INSTALLED_SPEC));
  } catch { return false; }
  const review = /^Review: (.+)$/mu.exec(record)?.[1];
  // path.join keeps even an absolute review path inside the records root; only a '..' segment could leave it.
  if (review === undefined || review.split('/').includes('..')) return false;
  let reviewText: string;
  try { reviewText = fs.readFileSync(path.join(recordsRoot, review), 'utf8'); } catch { return false; }
  const digests = reviewText.split(/\r?\n/u).filter((line) => line.trim() !== '').slice(0, 4)
    .flatMap((line) => { const match = MANIFEST_LINE.exec(line); return match === null ? [] : [match[1]]; });
  return digests.length === 1 && sha256(spec) === digests[0] && spec.toString('utf8').includes(`Exact behavioral delta, version ${version}.`);
}

/** A matching applied subject may still lack effective-day authorization. These temporal states never assert installed-byte drift. */
export type WaitModeStatus = 'signed' | 'drifted' | 'unsigned' | 'future' | 'missing-date' | 'invalid-date' | 'invalid-evaluation';

/** The local-agent recorder has a Date-only dialect, distinct from registry Recorded-at instants. The owner direction
 * OWNER-DIRECTION-POLARIS-WAIT-MODE-UTC-DAY-2026-11-05 makes it an effective UTC day, not an exact signing instant. */
function signoffDateStatus(text: string, utcDay: number): 'signed' | 'future' | 'missing-date' | 'invalid-date' {
  const lines = text.split('\n').filter((line) => line.trim() !== '');
  const dates = lines.filter((line) => line.startsWith('Date:'));
  if (dates.length === 0) return 'missing-date';
  if (dates.length !== 1 || lines[1] !== dates[0]) return 'invalid-date';
  const match = /^Date: ([0-9]{4}-[0-9]{2}-[0-9]{2})$/u.exec(dates[0]!);
  if (match === null) return 'invalid-date';
  const day = Date.parse(`${match[1]}T00:00:00Z`);
  if (!Number.isFinite(day) || new Date(day).toISOString().slice(0, 10) !== match[1]) return 'invalid-date';
  return day / 86_400_000 > utcDay ? 'future' : 'signed';
}

/** One entry evaluation over a trusted checkout, using one captured instant for every candidate. Reads of the record, aggregate,
 * review and specification are not an atomic snapshot. A matching in-force candidate wins regardless of directory order; otherwise
 * matching temporal refusals take precedence (future, invalid, missing), then an unmatched recorded subject, then absence. */
export function waitModeStatus(recordsRoot: string, now = Date.now()): WaitModeStatus {
  if (!Number.isFinite(now) || !Number.isFinite(new Date(now).getTime())) return 'invalid-evaluation';
  const utcDay = Math.floor(now / 86_400_000);
  const decisions = path.join(recordsRoot, DECISIONS);
  let names: string[];
  try { names = fs.readdirSync(decisions); } catch { return 'unsigned'; }
  let recorded = false;
  const temporal = new Set<WaitModeStatus>();
  for (const name of names) {
    const match = SIGNOFF_RECORD.exec(name);
    if (match === null || !(Number(match[1]) > 1 || (Number(match[1]) === 1 && Number(match[2]) >= 2))) continue;
    const version = `${match[1]}.${match[2]}`;
    const text = readSignoffRecord(decisions, name, version);
    if (text === undefined) continue;
    recorded = true;
    if (!appliedSubjectHolds(recordsRoot, path.join(decisions, name), version)) continue;
    const status = signoffDateStatus(text, utcDay);
    if (status === 'signed') return 'signed';
    temporal.add(status);
  }
  for (const status of ['future', 'invalid-date', 'missing-date'] as const) if (temporal.has(status)) return status;
  return recorded ? 'drifted' : 'unsigned';
}

/** Whether a matching eligible local-agent sign-off is in force for this operation's UTC day; see `waitModeStatus`. */
export function waitModeSignedIn(recordsRoot: string, now = Date.now()): boolean {
  return waitModeStatus(recordsRoot, now) === 'signed';
}

/** A session directory that passed the link checks, with its real path, or why it may not be written into. */
export type ResolvedSessionDirectory = { readonly ok: true; readonly real: string } | { readonly ok: false; readonly reason: string };

/** Check a session directory once and hand back the real path the checks resolved, so that a caller writes through that path and never
 * resolves the lexical one a second time (review-408 round 3, note 1). The sessions root and the session directory must each be a
 * directory itself, never a link (lstat), and each real path must be its real parent's entry of its own name: a linked root would move
 * the root and its entries together, so checking the entry against the resolved root alone is not enough. Then no write Syzygy makes
 * for a session lands outside the root, or the root outside its parent in the state directory.
 *
 * Residual, named: a real path is still a path. A writer racing in the state root between this check and the writes could replace the
 * session directory's own entry (or the root's) with a link, and Node offers no `openat` to pin the checked inode. Writing through
 * `real` removes the re-resolution of the lexical path (a link in an ancestor swapped in after the check no longer moves the writes),
 * not that last swap. The window is a few synchronous calls wide, and the writer is the party the F1 threat already names. */
export function resolveSessionDirectory(root: string, directory: string): ResolvedSessionDirectory {
  const refuse = (reason: string): ResolvedSessionDirectory => ({ ok: false, reason });
  let rootStats: fs.Stats;
  try { rootStats = fs.lstatSync(root); } catch (cause) { return refuse(`the sessions root ${root} cannot be read (${errno(cause)})`); }
  if (!rootStats.isDirectory()) return refuse(`the sessions root ${root} is not a directory of its own (a link, or another kind of file), so Syzygy writes nothing through it`);
  let realRoot: string, realParent: string;
  try { realRoot = fs.realpathSync(root); realParent = fs.realpathSync(path.dirname(root)); } catch (cause) { return refuse(`the sessions root ${root} cannot be resolved (${errno(cause)})`); }
  if (realRoot !== path.join(realParent, path.basename(root))) return refuse(`the sessions root ${root} resolves to ${realRoot}, not to its parent's ${path.basename(root)}, so Syzygy writes nothing there`);
  let stats: fs.Stats;
  try { stats = fs.lstatSync(directory); } catch (cause) { return refuse(`${directory} cannot be read (${errno(cause)})`); }
  if (!stats.isDirectory()) return refuse(`${directory} is not a directory of its own (a link, or another kind of file), so Syzygy writes nothing through it`);
  let real: string;
  try { real = fs.realpathSync(directory); } catch (cause) { return refuse(`${directory} cannot be resolved (${errno(cause)})`); }
  if (real !== path.join(realRoot, path.basename(directory))) return refuse(`${directory} resolves to ${real}, not to the sessions root's ${path.basename(directory)}, so Syzygy writes nothing there`);
  return { ok: true, real };
}

/** Why a session directory may not be written into, or null; see `resolveSessionDirectory`. */
export function sessionDirectoryRefusal(root: string, directory: string): string | null {
  const resolved = resolveSessionDirectory(root, directory);
  return resolved.ok ? null : resolved.reason;
}

export const WAIT_MODE_UNSIGNED = `wait mode is specified only by ${WAIT_MODE_SPEC}, which the owner has not signed off; until the version-tagged sign-off is recorded, hand each session over with session-prompt as signed in v1.1`;
/** The same refusal when a sign-off record exists but its applied subject no longer holds (review-408 round 3, note 3): failing closed is
 * right, and the reason says which state it is. It refines the reason text only; the gate opens and closes exactly as before. */
export const WAIT_MODE_DRIFTED = `wait mode is specified only by ${WAIT_MODE_SPEC}; a sign-off record for it exists, but the signed subject it names is not what is installed (the installed specification does not hash to the digest in the review the record names, or that review or the specification's version head is missing or disagrees); hand each session over with session-prompt as signed in v1.1, and tell the owner`;

/** The reason a wait-mode step refuses, or null when the gate is open. An injected `signed` (a test's, or a caller's) can say only open or
 * closed, so its closed state keeps the unsigned reason. */
export function waitModeRefusal(recordsRoot: string, signed?: () => boolean, now = Date.now()): string | null {
  if (signed !== undefined) return signed() ? null : WAIT_MODE_UNSIGNED;
  const status = waitModeStatus(recordsRoot, now);
  switch (status) {
    case 'signed': return null;
    case 'drifted': return WAIT_MODE_DRIFTED;
    case 'unsigned': return WAIT_MODE_UNSIGNED;
    case 'future': return "wait mode cannot be authorized by the matching local-agent sign-off because its Date is later than this operation's UTC day; it is not in force yet for wait mode; hand each session over with session-prompt as signed in v1.1";
    case 'missing-date': return 'wait mode cannot be authorized by the local-agent sign-off because its recorder-position Date is missing; hand each session over with session-prompt as signed in v1.1';
    case 'invalid-date': return 'wait mode cannot be authorized by the local-agent sign-off because its Date is duplicate, misplaced, malformed or not a real calendar day; hand each session over with session-prompt as signed in v1.1';
    case 'invalid-evaluation': return 'wait mode cannot be evaluated because this operation has no finite, representable evaluation instant; hand each session over with session-prompt as signed in v1.1';
  }
}

/** The prompt record of a waiting session: written by `session-prompt <run> all`. */
export interface WaitingSession { readonly session: number; readonly record: Readonly<Record<string, unknown>> }

/** The latest session of a review kind, when its prompt record says it was started to wait. */
export function waitingReviewSession(run: string, kind: ReviewKind): WaitingSession | null {
  const session = latestReviewSession(run, kind);
  if (session === 0) return null;
  const record = readRecord(path.join(run, RUN_LAYOUT.reviews, reviewPromptRecordName(kind, session)));
  return record !== undefined && record['mode'] === WAITING_MODE ? { session, record } : null;
}

/** The rounds delivered to a waiting review session, with their packet digests, in order. */
export function deliveries(run: string, kind: ReviewKind, session: number): readonly { readonly round: number; readonly packetSha256: string }[] {
  let names: string[];
  try { names = fs.readdirSync(path.join(run, RUN_LAYOUT.reviews)); } catch { return []; }
  const pattern = DELIVERY_RECORD(kind, session);
  return names.flatMap((name) => {
    const match = pattern.exec(name);
    if (match === null) return [];
    const record = readRecord(path.join(run, RUN_LAYOUT.reviews, name));
    const round = Number(match[1]);
    return record !== undefined && record['round'] === round && typeof record['packetSha256'] === 'string' ? [{ round, packetSha256: record['packetSha256'] }] : [];
  }).sort((a, b) => a.round - b.round);
}

export interface DeliveryReport {
  readonly command: 'session-prompt';
  readonly outcome: 'delivered';
  readonly role: 'review';
  readonly kind: ReviewKind;
  readonly run: string;
  readonly session: number;
  readonly round: number;
  /** Round 2 or later: the session reviewed an earlier revision and continues. */
  readonly continuing: boolean;
  readonly directory: string;
  readonly packetSha256: string;
  readonly next: string;
  readonly disclosures: readonly string[];
}

export const DELIVERY_DISCLOSURES = [
  RECORDS_WITHIN_REACH,
  'Syzygy built this packet at this step and wrote it, with its digest, into the waiting session\'s directory as the next round; it started, resumed and signalled no session. That the session waiting there is the one the operator started, and that it reads the packet unaltered, is Inferred.',
  `A round after the first is delivered to a session that reviewed an earlier revision: it has seen its own earlier verdict, which may anchor this one. The review page discloses it (${WAIT_MODE_DIRECTION}).`,
];

/** Deliver a built packet to a waiting review session as its next round: the run's delivery record first, then the session's
 * `round-N/` files, `delivery.json` last and by rename, so a waiting slice never sees a partial round. */
export function deliverToWaiting(
  run: string, runId: string, kind: ReviewKind, waiting: WaitingSession, built: { readonly bytes: string; readonly sha256: string },
  packet: Readonly<Record<string, unknown>>, now: number, afterCheck: () => void = () => undefined,
): { readonly ok: true; readonly report: DeliveryReport } | { readonly ok: false; readonly reason: string } {
  const { session } = waiting;
  const relative = waiting.record['directory'];
  if (typeof relative !== 'string') return { ok: false, reason: `the prompt record of waiting ${kind} session ${session} names no directory` };
  const directory = path.join(path.dirname(run), relative);
  if (path.dirname(directory) !== sessionsRoot(run)) return { ok: false, reason: `the prompt record of waiting ${kind} session ${session} names a directory outside the sessions root` };
  const resolved = resolveSessionDirectory(sessionsRoot(run), directory);
  if (!resolved.ok) return { ok: false, reason: resolved.reason };
  // `afterCheck` is a test seam, run in the window between the check and the writes; every write for the session goes through `resolved.real`.
  afterCheck();
  const earlier = deliveries(run, kind, session);
  const round = earlier.length === 0 ? 1 : earlier[earlier.length - 1]!.round + 1;
  const record = {
    format: DELIVERY_FORMAT, role: 'review', kind, runId, session, round, packetSha256: built.sha256, packet, deliveredAt: isoOf(now),
    continuing: round > 1, earlierRounds: earlier.map((entry) => entry.round), label: 'Inferred',
  };
  const roundDir = path.join(resolved.real, roundDirName(round));
  try {
    writePacket(run, kind, built);
    fs.writeFileSync(path.join(run, RUN_LAYOUT.reviews, deliveryRecordName(kind, session, round)), `${JSON.stringify(record, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
    fs.mkdirSync(roundDir, { mode: 0o700 });
    fs.writeFileSync(path.join(roundDir, PACKET_FILE), built.bytes, { mode: 0o600, flag: 'wx' });
    fs.writeFileSync(path.join(roundDir, PACKET_DIGEST_FILE), `${built.sha256}  ${PACKET_FILE}\n`, { mode: 0o600, flag: 'wx' });
    const pending = path.join(roundDir, `.${DELIVERY_FILE}.pending`);
    fs.writeFileSync(pending, `${JSON.stringify({ format: DELIVERY_FORMAT, kind, runId, session, round, packetSha256: built.sha256 }, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
    fs.renameSync(pending, path.join(roundDir, DELIVERY_FILE));
  } catch (cause) {
    return { ok: false, reason: `round ${round} could not be delivered to waiting ${kind} session ${session} (${errno(cause)}); anything already written stays, and the next delivery takes the next round` };
  }
  logStep(run, 'session-prompt', now, { outcome: 'delivered', role: 'review', kind, session, round, packetSha256: built.sha256 });
  return { ok: true, report: {
    command: 'session-prompt', outcome: 'delivered', role: 'review', kind, run, session, round, continuing: round > 1, directory, packetSha256: built.sha256,
    next: `Syzygy delivered round ${round} to the waiting ${kind} session ${session}; its \`syzygy dossier await\` returns with it. Start nothing and signal nothing: the session hands its verdict to \`await --submit --stdin\`, and Syzygy writes and checks it. When it has, run \`syzygy dossier status ${run}\` to see whether the review counts.`,
    disclosures: DELIVERY_DISCLOSURES,
  } };
}

/** What the review page says of a counted review's session: whether it reviewed earlier revisions. */
export interface Continuation {
  readonly continuing: boolean;
  /** The round of the counted verdict's packet, where Syzygy delivered it to a waiting session; null otherwise. */
  readonly round: number | null;
  /** The rounds delivered to the same session before it. */
  readonly earlierRounds: readonly number[];
  /** Earlier checked verdicts of the same kind that declare the same session identifier. */
  readonly earlierVerdicts: readonly number[];
  readonly text: string;
  readonly basis: string;
  readonly label: 'Inferred';
}

const CONTINUATION_BASIS = 'Syzygy\'s delivery records and the session identifiers earlier verdicts declare, all within the agent sessions\' write reach';

/** Whether the session of a counted verdict continued across revisions: it was delivered an earlier round, or an earlier checked verdict
 * of the same kind declares the same session identifier. */
export function continuationOf(run: string, kind: ReviewKind, session: number, number: number, packetSha256: string, sessionId: string): Continuation {
  const delivered = deliveries(run, kind, session);
  const matching = delivered.filter((entry) => entry.packetSha256 === packetSha256);
  const round = matching.length === 0 ? null : matching[matching.length - 1]!.round;
  const earlierRounds = delivered.filter((entry) => (round === null ? true : entry.round < round)).map((entry) => entry.round);
  const earlierVerdicts: number[] = [];
  for (let n = 0; n < number; n++) {
    const check = readRecord(path.join(run, REVIEW_CHECKS, verdictFileName(kind, n)));
    const recorded = check !== undefined && isRecord(check['session']) ? check['session']['sessionId'] : undefined;
    if (recorded === sessionId) earlierVerdicts.push(n);
  }
  const continuing = earlierRounds.length > 0 || earlierVerdicts.length > 0;
  const parts: string[] = [];
  if (earlierRounds.length > 0) parts.push(`Syzygy delivered ${earlierRounds.length} earlier packet(s) to this ${kind} session (round${earlierRounds.length > 1 ? 's' : ''} ${earlierRounds.join(', ')}) before the one this verdict names${round === null ? '' : `, round ${round}`}`);
  if (earlierVerdicts.length > 0) parts.push(`earlier ${kind} verdict(s) ${earlierVerdicts.join(', ')} declare the same session identifier`);
  const text = continuing
    ? `Continuing reviewer: ${parts.join('; ')}. It reviewed an earlier revision and has seen its own earlier verdict, which may anchor this one; the owner permits one reviewer to continue across revisions, disclosed here (${WAIT_MODE_DIRECTION}).`
    : 'No earlier packet was delivered to this review session, and no earlier verdict declares its session identifier.';
  return { continuing, round, earlierRounds, earlierVerdicts, text, basis: CONTINUATION_BASIS, label: 'Inferred' };
}

export interface AwaitRequest {
  /** The round to wait for; 1 when not given. */
  readonly round?: string;
  /** A file inside the session directory to check, instead of waiting. */
  readonly submit?: string;
  /** Take the submitted file's content from standard input, and write it at `submit` before checking it: a waiting session is
   * pre-approved no write, so Syzygy writes the file. `submit` must then name the role's own file. */
  readonly stdin?: boolean;
  /** The longest this call waits, in whole minutes. */
  readonly waitMinutes?: string;
}

export interface AwaitDeps {
  readonly sources: GateSources;
  readonly now: () => number;
  /** Wait between looks at the session directory; a timer by default. */
  readonly sleep?: (ms: number) => Promise<void>;
  /** Standard input, read whole as bytes; null when it holds more than `maxBytes`. Only `--stdin` reads it. */
  readonly readStdin?: (maxBytes: number) => Promise<Uint8Array | null>;
  /** Whether version 1.2 is signed off; by default `waitModeSignedIn` over the records root. */
  readonly waitModeSigned?: () => boolean;
  readonly probe: CheckDeps['probe'];
  readonly loadScreen?: ScreenLoader;
  readonly openReader?: ReverifyOptions['openReader'];
}

type Role = { readonly role: 'inventory'; readonly session: number } | { readonly role: 'review'; readonly kind: ReviewKind; readonly session: number };

export type AwaitReport =
  | {
    readonly command: 'await'; readonly format: typeof AWAIT_FORMAT; readonly outcome: 'delivered'; readonly role: 'inventory' | 'review'; readonly kind?: ReviewKind;
    readonly session: number; readonly round: number; readonly continuing: boolean; readonly read: string; readonly sha256: string;
    readonly next: string; readonly label: 'Inferred'; readonly disclosures: readonly string[];
  }
  | {
    readonly command: 'await'; readonly format: typeof AWAIT_FORMAT; readonly outcome: 'waiting'; readonly role: 'inventory' | 'review'; readonly kind?: ReviewKind;
    readonly session: number; readonly round: number; readonly waitedUntil: string; readonly deadline: string; readonly next: string; readonly disclosures: readonly string[];
  }
  | {
    readonly command: 'await'; readonly format: typeof AWAIT_FORMAT; readonly outcome: 'ended'; readonly role: 'inventory' | 'review'; readonly kind?: ReviewKind;
    readonly session: number; readonly round: number; readonly why: string; readonly next: string; readonly disclosures: readonly string[];
  }
  | {
    readonly command: 'await'; readonly format: typeof AWAIT_FORMAT; readonly outcome: 'submitted'; readonly role: 'inventory' | 'review'; readonly kind?: ReviewKind;
    readonly session: number; readonly passed: boolean; readonly check: Readonly<Record<string, unknown>>; readonly next: string; readonly disclosures: readonly string[];
  };

export interface AwaitRefusal {
  readonly command: 'await'; readonly outcome: 'refused'; readonly stage: string; readonly reason: string;
  readonly reasons?: readonly string[]; readonly refusals?: readonly ReverifyRefusal[]; readonly disclosures: readonly string[];
}

export type AwaitResult = Outcome<AwaitReport, AwaitRefusal>;

export const AWAIT_DISCLOSURES = [
  RECORDS_WITHIN_REACH,
  'await reads only the session directory and the run\'s records on the local file system, and the Git objects of the pinned revision through the step guard; it makes no network request and starts no process. It verifies the gates again when it starts and when it returns.',
  'The digest it compares is the one Syzygy wrote when it delivered; the delivered files and that record lie within the agent sessions\' write reach, so that the session reads the bytes Syzygy built is Inferred.',
];

const realOrNull = (file: string): string | null => { try { return fs.realpathSync(file); } catch { return null; } };

/** The file a waiting session may hand over on standard input: its inventory, or its verdict in a round Syzygy delivered. */
const STDIN_REVIEW_FILE = /^round-([1-9][0-9]{0,5})\/verdict\.json$/u;
export const INVENTORY_SUBMIT_FILE = 'inventory.json';

/** A stream (standard input of this process, by default) read whole as bytes; null once past `maxBytes`, reading no further. */
export async function readStdinBytes(maxBytes: number, stream: AsyncIterable<unknown> = process.stdin): Promise<Uint8Array | null> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    size += buffer.length;
    if (size > maxBytes) return null;
    chunks.push(buffer);
  }
  return new Uint8Array(Buffer.concat(chunks));
}

const SUBMIT_JSON_LIMITS = Object.freeze({ maxBytes: DRAFT_MAX_BYTES, maxNodes: 500_000, maxDepth: 16 });

/** Write the role's own file inside the session directory from standard input, by rename so a check never reads half a file. Null when
 * written; otherwise why not. Only the inventory's `inventory.json`, or `round-N/verdict.json` for a round Syzygy delivered, is written,
 * and only bounded UTF-8 JSON: a submission that is not one bounded JSON document is refused before the rename and never replaces the
 * file there. That is a syntax check only: well-formed JSON that fails the role's check still replaces it, and the check then reports
 * its findings (the spec's order: Syzygy writes the content, then checks it). */
async function writeFromStdin(
  realDir: string, role: Role, name: string, readStdin: (maxBytes: number) => Promise<Uint8Array | null>,
): Promise<string | null> {
  let target: string;
  if (role.role === 'inventory') {
    if (name !== INVENTORY_SUBMIT_FILE) return `with --stdin an inventory session submits ${INVENTORY_SUBMIT_FILE}, nothing else`;
    target = path.join(realDir, INVENTORY_SUBMIT_FILE);
  } else {
    const match = STDIN_REVIEW_FILE.exec(name);
    if (match === null) return 'with --stdin a review session submits round-N/verdict.json, nothing else';
    const roundDir = realOrNull(path.join(realDir, roundDirName(Number(match[1]))));
    if (roundDir === null || path.dirname(roundDir) !== realDir || !fs.existsSync(path.join(roundDir, DELIVERY_FILE))) {
      return `round ${match[1]} has not been delivered to this session, so it takes no verdict`;
    }
    target = path.join(roundDir, 'verdict.json');
  }
  const bytes = await readStdin(DRAFT_MAX_BYTES);
  if (bytes === null) return `standard input holds more than ${DRAFT_MAX_BYTES} bytes`;
  let text: string;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { return 'standard input is not UTF-8 text; nothing is written'; }
  if (text.trim() === '') return 'standard input is empty: pass the file\'s JSON as the command\'s standard input';
  try { parseBoundedJson(text, SUBMIT_JSON_LIMITS); } catch { return `standard input is not one bounded JSON document; nothing is written, and ${name} stays as it was`; }
  const pending = path.join(path.dirname(target), `.${path.basename(target)}.stdin`);
  try {
    // Never follow a link left at the pending name: remove it, then create the file exclusively.
    fs.rmSync(pending, { force: true });
    fs.writeFileSync(pending, bytes, { mode: 0o600, flag: 'wx' });
    fs.renameSync(pending, target);
  } catch (cause) {
    return `${name} could not be written (${errno(cause)})`;
  }
  return null;
}

/** `syzygy dossier await <session directory>/ [--round N] [--submit <file>] [--wait-minutes M]`. */
export async function awaitSession(directoryArg: string, request: AwaitRequest, deps: AwaitDeps): Promise<AwaitResult> {
  const startedAt = deps.now();
  const refuse = (stage: string, reason: string, reasons?: readonly string[], refusals?: readonly ReverifyRefusal[]): AwaitResult =>
    ({ ok: false, refusal: { command: 'await', outcome: 'refused', stage, reason, ...(reasons ? { reasons } : {}), ...(refusals ? { refusals } : {}), disclosures: AWAIT_DISCLOSURES } });
  const gateRefusal = waitModeRefusal(deps.sources.recordsRoot, deps.waitModeSigned, startedAt);
  if (gateRefusal !== null) return refuse('unsigned', gateRefusal);

  // The directory: absolute, normalised, ending in one slash, so the printed permission rule's prefix names exactly this session.
  if (!PLAIN_PATH.test(directoryArg) || !directoryArg.endsWith('/') || path.normalize(directoryArg) !== directoryArg || directoryArg.split('/').some((part) => part === '.' || part === '..')) {
    return refuse('directory', `the session directory must be given as its absolute, normalised path ending in one slash, exactly as the printed command gives it; got ${JSON.stringify(directoryArg)}`);
  }
  const directory = directoryArg.slice(0, -1);
  const parent = path.dirname(directory);
  const runId = path.basename(parent).replace(/\.sessions$/u, '');
  if (!path.basename(parent).endsWith('.sessions') || !RUN_ID.test(runId)) return refuse('directory', `${directory} is not a session directory under a run's sessions root`);
  const run = path.join(path.dirname(parent), runId);
  const name = path.basename(directory);
  const inventoryMatch = /^session-([1-9][0-9]*)$/u.exec(name), reviewMatch = /^(fidelity|design)-([1-9][0-9]*)$/u.exec(name);
  const role: Role | null = inventoryMatch !== null ? { role: 'inventory', session: Number(inventoryMatch[1]) }
    : reviewMatch !== null && isReviewKind(reviewMatch[1]) ? { role: 'review', kind: reviewMatch[1], session: Number(reviewMatch[2]) } : null;
  if (role === null) return refuse('directory', `${directory} is not an inventory or review session directory`);
  const kindField = role.role === 'review' ? { kind: role.kind } : {};
  const recordFile = role.role === 'inventory' ? path.join(run, RUN_LAYOUT.inventory, promptRecordName(role.session)) : path.join(run, RUN_LAYOUT.reviews, reviewPromptRecordName(role.kind, role.session));
  const prompt = readRecord(recordFile);
  if (prompt === undefined || typeof prompt['prompt'] !== 'string' || prompt['promptSha256'] !== sha256(prompt['prompt'])) {
    return refuse('session', `the prompt record of ${name} cannot be read or does not match its own digest`);
  }
  if (prompt['mode'] !== WAITING_MODE) return refuse('session', `${name} was not started to wait: only a session started from \`syzygy dossier session-prompt ${run} all\` waits`);
  if (prompt['directory'] !== path.relative(path.dirname(run), directory)) return refuse('session', `the prompt record of ${name} names another directory`);

  const what = 'the session waits for nothing more';
  const opened = await openRun(run, deps.sources, startedAt, what, deps.openReader ? { openReader: deps.openReader } : {});
  if (!opened.ok) return refuse(opened.stage, opened.reason, opened.reasons, opened.refusals);
  const self = `syzygy dossier await ${directoryArg}`;
  const resolved = resolveSessionDirectory(parent, directory);
  if (!resolved.ok) return refuse('directory', resolved.reason);
  const realDir = resolved.real;

  if (request.stdin === true && request.submit === undefined) return refuse('usage', '--stdin applies only with --submit');
  if (request.submit !== undefined) {
    if (request.round !== undefined || request.waitMinutes !== undefined) return refuse('usage', '--submit takes no --round or --wait-minutes');
    const latest = role.role === 'inventory' ? latestInventorySession(run) : latestReviewSession(run, role.kind);
    if (latest !== role.session) return refuse('submit', `${name} is no longer the latest ${role.role === 'inventory' ? 'inventory' : role.kind} session, so its file is not checked`);
    if (request.stdin === true) {
      // The session holds no write permission: Syzygy writes the role's own file from standard input, then checks it.
      const stdinRefusal = await writeFromStdin(realDir, role, request.submit, deps.readStdin ?? ((maxBytes) => readStdinBytes(maxBytes)));
      if (stdinRefusal !== null) return refuse('submit', stdinRefusal);
    }
    const file = realOrNull(path.resolve(realDir, request.submit));
    if (file === null || !file.startsWith(`${realDir}${path.sep}`)) return refuse('submit', `the file to submit must exist inside ${directory}`);
    const deps2: CheckDeps & ReviewDeps = {
      sources: deps.sources, now: deps.now, probe: deps.probe, ...(deps.loadScreen ? { loadScreen: deps.loadScreen } : {}), ...(deps.openReader ? { openReader: deps.openReader } : {}),
    };
    if (role.role === 'inventory') {
      const result: InventoryCheckResult = await checkInventory(run, { inventoryFile: file }, deps2);
      if (!result.ok) return refuse('check', result.refusal.reason, result.refusal.reasons);
      const passed = result.report.outcome === 'passed';
      return { ok: true, report: {
        command: 'await', format: AWAIT_FORMAT, outcome: 'submitted', role: 'inventory', session: role.session, passed, check: result.report as unknown as Readonly<Record<string, unknown>>,
        next: passed ? 'The inventory passed its check. Your work is done: tell the operator, and end this session.' : `Repair every finding in your inventory and pass it again on the standard input of ${stdinHandOver(`${self} --submit ${request.submit} --stdin`)}.`,
        disclosures: AWAIT_DISCLOSURES,
      } };
    }
    const result: ReviewCheckResult = await reviewCheck(run, { verdictFile: file, kind: role.kind }, deps2);
    if (!result.ok) return refuse('check', result.refusal.reason, result.refusal.reasons);
    const passed = result.report.outcome === 'validated';
    const delivered = deliveries(run, role.kind, role.session);
    const nextRound = (delivered.length === 0 ? 0 : delivered[delivered.length - 1]!.round) + 1;
    return { ok: true, report: {
      command: 'await', format: AWAIT_FORMAT, outcome: 'submitted', role: 'review', kind: role.kind, session: role.session, passed, check: result.report as unknown as Readonly<Record<string, unknown>>,
      next: passed
        ? `Your verdict is recorded. If the subject is revised after a repair, Syzygy delivers its next packet to you: run \`${self} --round ${nextRound}\` to wait for it, review it afresh from that packet alone, and stop when await reports that the run ended.`
        : `Repair what the check reports and pass the verdict again on the standard input of ${stdinHandOver(`${self} --submit ${request.submit} --stdin`)}.`,
      disclosures: AWAIT_DISCLOSURES,
    } };
  }

  const round = request.round === undefined ? 1 : /^[1-9][0-9]{0,5}$/u.test(request.round) ? Number(request.round) : null;
  if (round === null) return refuse('usage', '--round takes a positive integer');
  const minutes = request.waitMinutes === undefined ? DEFAULT_WAIT_MINUTES : /^[1-9][0-9]{0,2}$/u.test(request.waitMinutes) ? Number(request.waitMinutes) : null;
  if (minutes === null || minutes > MAX_WAIT_MINUTES) return refuse('usage', `--wait-minutes takes a whole number from 1 to ${MAX_WAIT_MINUTES}`);

  if (role.role === 'inventory') {
    if (round !== 1) return refuse('usage', 'an inventory session has one round: its brief, delivered when it was started');
    const brief = prompt['brief'];
    const expected = isRecord(brief) && typeof brief['sha256'] === 'string' ? brief['sha256'] : undefined;
    let bytes: Uint8Array;
    try { bytes = new Uint8Array(fs.readFileSync(path.join(directory, INVENTORY_BRIEF_FILE))); } catch (cause) { return refuse('rehash', `the inventory brief cannot be read (${errno(cause)})`); }
    if (expected === undefined || sha256(bytes) !== expected) return refuse('rehash', `${INVENTORY_BRIEF_FILE} does not hash to the digest Syzygy recorded when it wrote it; stop, and tell the operator`);
    logStep(run, 'await', startedAt, { outcome: 'delivered', role: 'inventory', session: role.session, round });
    return { ok: true, report: {
      command: 'await', format: AWAIT_FORMAT, outcome: 'delivered', role: 'inventory', session: role.session, round, continuing: false,
      read: path.join(directory, INVENTORY_BRIEF_FILE), sha256: expected,
      next: `Read ${INVENTORY_BRIEF_FILE} in this directory and do what it says, with one change: you write no file. Where it says to write inventory.json and run \`syzygy dossier inventory-check\`, pass the inventory's JSON as the standard input of ${stdinHandOver(`${self} --submit inventory.json --stdin`)}. Syzygy writes inventory.json in this directory and runs the same check.`,
      label: 'Inferred', disclosures: AWAIT_DISCLOSURES,
    } };
  }

  const roundDir = path.join(directory, roundDirName(round));
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms); }));
  const sliceEnds = Math.min(startedAt + minutes * 60_000, opened.deadlineEnds);
  for (;;) {
    if (fs.existsSync(path.join(roundDir, DELIVERY_FILE))) break;
    if (fs.existsSync(path.join(run, RUN_LAYOUT.record))) {
      logStep(run, 'await', deps.now(), { outcome: 'ended', role: 'review', kind: role.kind, session: role.session, round });
      return { ok: true, report: {
        command: 'await', format: AWAIT_FORMAT, outcome: 'ended', role: 'review', ...kindField, session: role.session, round,
        why: 'the run is closed: its Execution Record is written, so no further packet is delivered', next: 'Your work is done. End this session.', disclosures: AWAIT_DISCLOSURES,
      } };
    }
    if (deps.now() >= sliceEnds) {
      const atDeadline = sliceEnds >= opened.deadlineEnds;
      return { ok: true, report: {
        command: 'await', format: AWAIT_FORMAT, outcome: 'waiting', role: 'review', ...kindField, session: role.session, round,
        waitedUntil: isoOf(sliceEnds), deadline: isoOf(opened.deadlineEnds),
        next: atDeadline
          ? 'The run\'s deadline has come; Syzygy refuses every step after it. End this session.'
          : `No packet yet. Run \`${self}${round === 1 ? '' : ` --round ${round}`}\` again, with your shell tool's longest timeout; it waits until the run's deadline at most.`,
        disclosures: AWAIT_DISCLOSURES,
      } };
    }
    await sleep(POLL_MS);
  }

  // Delivered: the gates again, then the digest three ways.
  const at = deps.now();
  const reopened = await openRun(run, deps.sources, at, what, deps.openReader ? { openReader: deps.openReader } : {});
  if (!reopened.ok) return refuse(reopened.stage, reopened.reason, reopened.reasons, reopened.refusals);
  let delivery: unknown, packetBytes: Uint8Array, digestLine: string;
  try {
    delivery = parseBoundedJson(fs.readFileSync(path.join(roundDir, DELIVERY_FILE), 'utf8'), DELIVERY_JSON_LIMITS);
    packetBytes = new Uint8Array(fs.readFileSync(path.join(roundDir, PACKET_FILE)));
    digestLine = fs.readFileSync(path.join(roundDir, PACKET_DIGEST_FILE), 'utf8');
  } catch (cause) { return refuse('rehash', `round ${round} cannot be read (${errno(cause)}); stop, and tell the operator`); }
  const record = readRecord(path.join(run, RUN_LAYOUT.reviews, deliveryRecordName(role.kind, role.session, round)));
  const actual = sha256(packetBytes);
  const named = isRecord(delivery) && delivery['round'] === round && delivery['kind'] === role.kind && delivery['session'] === role.session ? delivery['packetSha256'] : undefined;
  if (named !== actual || digestLine !== `${actual}  ${PACKET_FILE}\n` || record === undefined || record['packetSha256'] !== actual) {
    logStep(run, 'await', at, { outcome: 'refused', stage: 'rehash', role: 'review', kind: role.kind, session: role.session, round });
    return refuse('rehash', `round ${round}'s ${PACKET_FILE} does not hash to the digest in ${DELIVERY_FILE}, ${PACKET_DIGEST_FILE} and the delivery record Syzygy wrote; do not read it: stop, and tell the operator`);
  }
  logStep(run, 'await', at, { outcome: 'delivered', role: 'review', kind: role.kind, session: role.session, round, packetSha256: actual });
  const verdictFile = path.join(roundDirName(round), 'verdict.json');
  return { ok: true, report: {
    command: 'await', format: AWAIT_FORMAT, outcome: 'delivered', role: 'review', kind: role.kind, session: role.session, round, continuing: round > 1,
    read: path.join(roundDir, PACKET_FILE), sha256: actual,
    next: `${round > 1 ? 'This is the next revision: judge it from this packet alone, not from your earlier verdict. ' : ''}Read only ${roundDirName(round)}/${PACKET_FILE} and do only what its criteria say, with one change: you write no file. Where the criteria say to write the verdict and run \`syzygy dossier review-check\`, pass the verdict's JSON as the standard input of ${stdinHandOver(`${self} --submit ${verdictFile} --stdin`)}. Syzygy writes ${verdictFile} in this directory and runs the same check.`,
    label: 'Inferred', disclosures: AWAIT_DISCLOSURES,
  } };
}
