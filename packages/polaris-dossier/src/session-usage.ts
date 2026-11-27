import * as fs from 'node:fs';
import * as path from 'node:path';
import { isRecord } from '@syzygy/support';
import { PastBoundError, readBoundedFile } from './check-record-read.js';
import { launchedMarkerState } from './launched.js';
import { agentHome } from './run-dir.js';
import { utcInstantMs } from './step-measures.js';

/** Per-session usage, read by Syzygy from the agent tool's own transcripts, a run total and the one cost line (REQ-polaris-generation-033
 * version 2.41; syzygy-5dhm.26).
 *
 * Only a launched run (`syzygy polaris`) has sessions whose usage Syzygy can attribute: it started each role's session itself, in a private
 * home under the run's agents root, and the agent tool (Claude Code, with `CLAUDE_CONFIG_DIR` set to that home's `.claude`) keeps that
 * session's transcripts under its `projects/` directory. Syzygy reads each transcript there and takes from it only numbers: for each model
 * response, the four token counts the tool recorded for it, and each entry's instant, to measure the span. No text, path inside the home,
 * identifier or instant is copied (SEC-5); the session can write its own home, so every figure is Inferred, never Observed, and never a
 * provider receipt. A run the operator started is Unknown as a whole: Syzygy started none of its sessions and has no transcript it can
 * attribute to one. A role whose transcripts cannot be read in full is Unknown with a fixed reason, and a figure resting on it is Unknown:
 * no evidence is never zero (VIS-2). Money is always Unknown: Syzygy holds no price receipt. */

export const SESSION_USAGE_FORMAT = 'polaris-dossier-session-usage/1';
export const SESSION_USAGE_BASIS = 'read by Syzygy from the agent tool\'s own transcripts in the private home Syzygy gave each session it launched; each session can write its home, so every figure is Inferred and none is a provider receipt';
/** The roles a launched run starts, in the order the record lists them. */
export const SESSION_ROLES = ['author', 'inventory', 'fidelity', 'design'] as const;
export type SessionRole = (typeof SESSION_ROLES)[number];
/** The bound on one transcript file: 268,435,456 bytes, read without following a link. */
export const TRANSCRIPT_BYTES_MAX = 268_435_456;
/** At most 256 transcript files per role, and directories at most four levels below `projects/`. */
export const TRANSCRIPT_FILES_MAX = 256;
export const TRANSCRIPT_DEPTH_MAX = 4;
/** The agent tool's marker for a response it made up itself (an error notice), which no model produced. */
const SYNTHETIC_MODEL = '<synthetic>';
export const NO_PRICE_RECEIPT = { label: 'Unknown', why: 'no-price-receipt' } as const;

export type TokenField = 'input' | 'output' | 'cacheCreation' | 'cacheRead';
const TOKEN_KEYS: Readonly<Record<TokenField, string>> = {
  input: 'input_tokens', output: 'output_tokens', cacheCreation: 'cache_creation_input_tokens', cacheRead: 'cache_read_input_tokens',
};
const TOKEN_FIELDS = Object.keys(TOKEN_KEYS) as TokenField[];

export type Count = { readonly state: 'counted'; readonly value: number } | { readonly state: 'unknown'; readonly why: 'field-unreadable' | 'sum-not-exact-integer' | 'session-unknown' };
export type Span = { readonly state: 'measured'; readonly ms: number } | { readonly state: 'unknown'; readonly why: 'no-instant' | 'session-unknown' };
export type Tokens = Readonly<Record<TokenField | 'total', Count>>;

export type RoleUnknownReason =
  | 'no-agent-home' | 'no-transcript' | 'transcript-unreadable' | 'transcript-over-bound' | 'too-many-transcripts' | 'link-or-special-entry'
  | 'transcript-malformed-line' | 'response-without-identity' | 'response-without-usage';
export type RoleUsage =
  | { readonly role: SessionRole; readonly label: 'Inferred'; readonly transcripts: number; readonly responses: number; readonly tokens: Tokens; readonly spanMs: Span }
  | { readonly role: SessionRole; readonly label: 'Unknown'; readonly why: RoleUnknownReason };

interface Head { readonly format: typeof SESSION_USAGE_FORMAT; readonly basis: typeof SESSION_USAGE_BASIS; readonly money: typeof NO_PRICE_RECEIPT }
export type SessionUsage =
  | (Head & { readonly label: 'Inferred'; readonly sessions: readonly RoleUsage[]; readonly total: { readonly responses: Count; readonly tokens: Tokens; readonly spanMs: Span } })
  | (Head & { readonly label: 'Unknown'; readonly why: 'operator-started' | 'launched-marker-unreadable' });

const head: Head = { format: SESSION_USAGE_FORMAT, basis: SESSION_USAGE_BASIS, money: NO_PRICE_RECEIPT };

/** What one role's transcripts give, before the figures are summed: per response identity, the largest count each field reached, and the
 * first and last instants; or the reason the role is Unknown. */
interface Tally {
  readonly responses: Map<string, Partial<Record<TokenField, number>>>;
  readonly unreadable: Set<TokenField>;
  first: number | null;
  last: number | null;
}

const nonnegative = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

/** Every `.jsonl` file under `projects/`, in name order, or why the walk stops: a link, a special entry or too many files or levels. */
function transcriptFiles(projects: string): string[] | RoleUnknownReason {
  const files: string[] = [];
  const walk = (dir: string, depth: number): RoleUnknownReason | null => {
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return 'transcript-unreadable'; }
    for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (depth >= TRANSCRIPT_DEPTH_MAX) return 'too-many-transcripts';
        const stop = walk(full, depth + 1);
        if (stop !== null) return stop;
      } else if (entry.isFile()) {
        if (!entry.name.endsWith('.jsonl')) continue;
        if (files.length >= TRANSCRIPT_FILES_MAX) return 'too-many-transcripts';
        files.push(full);
      } else {
        // A link may name anything outside the home, and a FIFO or device is no transcript: neither is followed or read.
        return 'link-or-special-entry';
      }
    }
    return null;
  };
  const stop = walk(projects, 0);
  return stop ?? files;
}

/** Add one transcript's lines to the role's tally; the reason the role is Unknown otherwise. A last line with no newline after it may be
 * an entry the tool is still writing, so it is passed over when it does not parse; any other line that does not parse makes the role
 * Unknown, since it may be a response. */
function tallyTranscript(text: string, tally: Tally): RoleUnknownReason | null {
  const lines = text.split('\n');
  const unterminated = lines.pop();
  for (const [index, line] of [...lines, unterminated ?? ''].entries()) {
    if (line.trim() === '') continue;
    let entry: unknown;
    try { entry = JSON.parse(line); } catch {
      if (index === lines.length) continue;
      return 'transcript-malformed-line';
    }
    if (!isRecord(entry)) return 'transcript-malformed-line';
    const at = utcInstantMs(entry['timestamp']);
    if (at !== null) {
      tally.first = tally.first === null ? at : Math.min(tally.first, at);
      tally.last = tally.last === null ? at : Math.max(tally.last, at);
    }
    if (entry['type'] !== 'assistant') continue;
    const message = entry['message'];
    if (!isRecord(message)) return 'response-without-identity';
    if (message['model'] === SYNTHETIC_MODEL) continue;
    const id = message['id'];
    if (typeof id !== 'string' || id === '') return 'response-without-identity';
    const usage = message['usage'];
    if (!isRecord(usage)) return 'response-without-usage';
    // The tool writes one line per content block of a response, each repeating its usage; the largest value of a field is the response's.
    const counts = tally.responses.get(id) ?? {};
    for (const field of TOKEN_FIELDS) {
      const value = usage[TOKEN_KEYS[field]];
      if (!nonnegative(value)) { tally.unreadable.add(field); continue; }
      counts[field] = Math.max(counts[field] ?? 0, value);
    }
    tally.responses.set(id, counts);
  }
  return null;
}

const sum = (values: readonly number[]): Count => {
  const total = values.reduce((a, b) => a + b, 0);
  return Number.isSafeInteger(total) ? { state: 'counted', value: total } : { state: 'unknown', why: 'sum-not-exact-integer' };
};

function tokensOf(perField: Readonly<Record<TokenField, Count>>): Tokens {
  const parts = TOKEN_FIELDS.map((field) => perField[field]);
  const total: Count = parts.every((part) => part.state === 'counted')
    ? sum(parts.map((part) => (part as { value: number }).value))
    : parts.find((part) => part.state === 'unknown' && part.why === 'session-unknown') ?? { state: 'unknown', why: 'field-unreadable' };
  return { ...perField, total };
}


interface RoleRead { readonly usage: RoleUsage; readonly bounds: { readonly first: number; readonly last: number } | null }

/** One role's usage from its private home under the agents root, read once, with its first and last instants for the run total. */
function readRole(run: string, role: SessionRole): RoleRead {
  const unknown = (why: RoleUnknownReason): RoleRead => ({ usage: { role, label: 'Unknown', why }, bounds: null });
  const home = agentHome(run, role);
  let homeStat: fs.Stats;
  try { homeStat = fs.lstatSync(home); } catch { return unknown('no-agent-home'); }
  if (!homeStat.isDirectory()) return unknown('link-or-special-entry');
  const projects = path.join(home, '.claude', 'projects');
  for (const dir of [path.join(home, '.claude'), projects]) {
    let stat: fs.Stats;
    try { stat = fs.lstatSync(dir); } catch { return unknown('no-transcript'); }
    if (!stat.isDirectory()) return unknown('link-or-special-entry');
  }
  const files = transcriptFiles(projects);
  if (typeof files === 'string') return unknown(files);
  if (files.length === 0) return unknown('no-transcript');
  const tally: Tally = { responses: new Map(), unreadable: new Set(), first: null, last: null };
  for (const file of files) {
    let bytes: Buffer;
    try { bytes = readBoundedFile(file, TRANSCRIPT_BYTES_MAX, { followLink: false }); } catch (cause) {
      return unknown(cause instanceof PastBoundError ? 'transcript-over-bound' : 'transcript-unreadable');
    }
    const stop = tallyTranscript(bytes.toString('utf8'), tally);
    if (stop !== null) return unknown(stop);
  }
  const responses = [...tally.responses.values()];
  const perField = Object.fromEntries(TOKEN_FIELDS.map((field) => [field,
    tally.unreadable.has(field) ? { state: 'unknown', why: 'field-unreadable' } : sum(responses.map((counts) => counts[field] ?? 0))])) as Record<TokenField, Count>;
  const bounds = tally.first === null || tally.last === null ? null : { first: tally.first, last: tally.last };
  return {
    usage: {
      role, label: 'Inferred', transcripts: files.length, responses: responses.length, tokens: tokensOf(perField),
      spanMs: bounds === null ? { state: 'unknown', why: 'no-instant' } : { state: 'measured', ms: bounds.last - bounds.first },
    },
    bounds,
  };
}

/** The run total: each figure the sum over every session, Unknown where any session's is; the span from the earliest to the latest
 * instant of any session, which needs every session's. */
function totalOf(reads: readonly RoleRead[]): { responses: Count; tokens: Tokens; spanMs: Span } {
  const known = reads.map((read) => read.usage).filter((usage): usage is Extract<RoleUsage, { label: 'Inferred' }> => usage.label === 'Inferred');
  const all = known.length === reads.length;
  const across = (pick: (usage: Extract<RoleUsage, { label: 'Inferred' }>) => Count): Count => {
    if (!all) return { state: 'unknown', why: 'session-unknown' };
    const counts = known.map(pick);
    return counts.find((count) => count.state === 'unknown') ?? sum(counts.map((count) => (count as { value: number }).value));
  };
  const perField = Object.fromEntries(TOKEN_FIELDS.map((field) => [field, across((usage) => usage.tokens[field])])) as Record<TokenField, Count>;
  const bounds = reads.map((read) => read.bounds);
  const spanMs: Span = !all ? { state: 'unknown', why: 'session-unknown' }
    : bounds.some((b) => b === null) ? { state: 'unknown', why: 'no-instant' }
      : { state: 'measured', ms: Math.max(...bounds.map((b) => b!.last)) - Math.min(...bounds.map((b) => b!.first)) };
  return { responses: across((usage) => ({ state: 'counted', value: usage.responses })), tokens: tokensOf(perField), spanMs };
}

/** The run's session usage, read now: one row per role a launched run starts, and the run total. A session's own first and last instants
 * serve only the total's span; no instant enters the result. */
export function sessionUsage(run: string): SessionUsage {
  const marker = launchedMarkerState(run);
  if (marker === 'absent') return { ...head, label: 'Unknown', why: 'operator-started' };
  if (marker === 'unreadable') return { ...head, label: 'Unknown', why: 'launched-marker-unreadable' };
  const reads = SESSION_ROLES.map((role) => readRole(run, role));
  return { ...head, label: 'Inferred', sessions: reads.map((read) => read.usage), total: totalOf(reads) };
}

/** Thousands grouped with commas, so a figure reads the same on every host. */
export const grouped = (value: number): string => String(value).replace(/\B(?=(\d{3})+(?!\d))/gu, ',');

/** A span in whole hours and minutes, or seconds under a minute. */
export function spanWords(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

const ROLE_UNKNOWN_WORDS: Readonly<Record<RoleUnknownReason, string>> = {
  'no-agent-home': 'no private home', 'no-transcript': 'no transcript', 'transcript-unreadable': 'a transcript cannot be read',
  'transcript-over-bound': 'a transcript past its bound', 'too-many-transcripts': 'too many transcripts',
  'link-or-special-entry': 'a link or special entry in its home', 'transcript-malformed-line': 'a transcript line that does not parse',
  'response-without-identity': 'a response without an identity', 'response-without-usage': 'a response without usage',
};

export const COST_LINE_BASIS = 'read by Syzygy from each session\'s own transcript, which that session can write; not a provider receipt';

/** The one cost line: the run total of tokens by kind, model responses and the span, then money, which is always Unknown. Where the
 * total is Unknown the line says which session made it so, and still gives each session's known tokens. */
export function costLine(usage: SessionUsage): { readonly text: string; readonly label: 'Inferred' | 'Unknown' } {
  if (usage.label === 'Unknown') {
    return {
      label: 'Unknown',
      text: usage.why === 'operator-started'
        ? 'Cost: Unknown. Syzygy did not start this run\'s sessions, so it reads no usage of theirs; money Unknown (no price receipt).'
        : 'Cost: Unknown. The run\'s launched marker cannot be read, so which sessions Syzygy started cannot be told; money Unknown (no price receipt).',
    };
  }
  const { tokens, responses, spanMs } = usage.total;
  const money = 'money Unknown (no price receipt)';
  if (tokens.total.state === 'counted') {
    const kinds = (['input', 'output', 'cacheCreation', 'cacheRead'] as const).map((field) => {
      const count = tokens[field];
      return `${field === 'cacheCreation' ? 'cache writes' : field === 'cacheRead' ? 'cache reads' : field} ${count.state === 'counted' ? grouped(count.value) : 'Unknown'}`;
    });
    const parts = [
      `${grouped(tokens.total.value)} tokens over ${usage.sessions.length} sessions (${kinds.join('; ')})`,
      responses.state === 'counted' ? `${grouped(responses.value)} model responses` : 'model responses Unknown',
      spanMs.state === 'measured' ? `${spanWords(spanMs.ms)} from the first to the last transcript entry` : 'span Unknown',
      money,
    ];
    return { label: 'Inferred', text: `Cost: ${parts.join(', ')}; ${COST_LINE_BASIS}.` };
  }
  const unknown = usage.sessions.flatMap((session) => (session.label === 'Unknown' ? [`${session.role}: ${ROLE_UNKNOWN_WORDS[session.why]}`]
    : session.tokens.total.state === 'unknown' ? [`${session.role}: a token count that cannot be read`] : []));
  const known = usage.sessions.flatMap((session) => (session.label === 'Inferred' && session.tokens.total.state === 'counted'
    ? [`${session.role} ${grouped(session.tokens.total.value)} tokens`] : []));
  return {
    label: 'Unknown',
    text: `Cost: run total Unknown (${unknown.join('; ')})${known.length === 0 ? '' : `; known: ${known.join(', ')}`}; ${money}; ${COST_LINE_BASIS}.`,
  };
}

const isCount = (value: unknown): value is Count => isRecord(value) && (
  (value['state'] === 'counted' && nonnegative(value['value']) && Object.keys(value).length === 2)
  || (value['state'] === 'unknown' && ['field-unreadable', 'sum-not-exact-integer', 'session-unknown'].includes(value['why'] as string) && Object.keys(value).length === 2));
const isSpan = (value: unknown): value is Span => isRecord(value) && (
  (value['state'] === 'measured' && nonnegative(value['ms']) && Object.keys(value).length === 2)
  || (value['state'] === 'unknown' && ['no-instant', 'session-unknown'].includes(value['why'] as string) && Object.keys(value).length === 2));
const isTokens = (value: unknown): value is Tokens => isRecord(value) && Object.keys(value).length === 5
  && [...TOKEN_FIELDS, 'total'].every((field) => isCount(value[field]));
const isRoleUsage = (value: unknown, role: SessionRole): value is RoleUsage => isRecord(value) && value['role'] === role && (
  (value['label'] === 'Unknown' && Object.keys(value).length === 3 && typeof value['why'] === 'string' && Object.hasOwn(ROLE_UNKNOWN_WORDS, value['why']))
  || (value['label'] === 'Inferred' && Object.keys(value).length === 6 && nonnegative(value['transcripts']) && nonnegative(value['responses'])
    && isTokens(value['tokens']) && isSpan(value['spanMs'])));

/** Whether a stored value is session usage in the form close writes: the status reader trusts no other shape. */
export function isSessionUsage(value: unknown): value is SessionUsage {
  if (!isRecord(value) || value['format'] !== SESSION_USAGE_FORMAT || value['basis'] !== SESSION_USAGE_BASIS) return false;
  if (!isRecord(value['money']) || value['money']['label'] !== 'Unknown' || value['money']['why'] !== 'no-price-receipt') return false;
  if (value['label'] === 'Unknown') return Object.keys(value).length === 5 && (value['why'] === 'operator-started' || value['why'] === 'launched-marker-unreadable');
  if (value['label'] !== 'Inferred' || Object.keys(value).length !== 6) return false;
  const sessions = value['sessions'], total = value['total'];
  return Array.isArray(sessions) && sessions.length === SESSION_ROLES.length && SESSION_ROLES.every((role, index) => isRoleUsage(sessions[index], role))
    && isRecord(total) && Object.keys(total).length === 3 && isCount(total['responses']) && isTokens(total['tokens']) && isSpan(total['spanMs']);
}
