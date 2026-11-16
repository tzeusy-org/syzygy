/**
 * Hierarchical, budgeted discovery (REQ-polaris-generation-030). A repository
 * with thousands of files cannot cross the provider boundary whole, and the
 * pipeline refuses more than 200 quotable sources. This module narrows a
 * counted population to a bounded selection and accounts for the rest:
 *
 *   partition into subsystems -> map (claim ledger per subsystem, bounded
 *   excerpts) -> reduce (rank across subsystems) -> select under the cap.
 *
 * Every blob it does not select stays in the population as an excluded row
 * with reason `deferred-by-budget`, so the denominator never shrinks. It is
 * pure: the map and reduce calls are injected ports, and nothing here reads
 * a repository or calls a provider. A model ranking is an Inferred claim; the
 * report says which basis ordered the selection.
 */

import { isRecord } from '@syzygy/support';
import { digestCanonicalJson } from './canonical-json.js';
import { buildExcerpt, leadingCommentChars, type ExcerptKind, type ExcerptRange } from './excerpt.js';
import { excludedSourceId, newGenerationRunKey, type GenerationSource } from './generation-source.js';

export const DEFERRED_BY_BUDGET = 'deferred-by-budget';
export const PIPELINE_QUOTABLE_CAP = 200;

export interface DiscoveryBudget {
  /** Quotable GenerationSources (pieces count one each) to keep; at most 200. */
  readonly maxSelected: number;
  /** UTF-8 bytes of quotable text to keep, all selected files together. Absent means no byte cap. A file is selected whole or deferred whole (its pieces travel together). */
  readonly maxSelectedBytes?: number;
  readonly maxMapCalls: number;
  readonly maxExcerptChars: number;
  readonly maxGroupBlobs: number;
  /** Claims per subsystem handed to the reduce call. */
  readonly claimsPerGroup: number;
  readonly maxReduceClaims: number;
  /** Longer claim text is truncated to this many characters. */
  readonly maxClaimChars: number;
}

export const DEFAULT_DISCOVERY_BUDGET: DiscoveryBudget = {
  maxSelected: PIPELINE_QUOTABLE_CAP, maxMapCalls: 40, maxExcerptChars: 1500, maxGroupBlobs: 40, claimsPerGroup: 8, maxReduceClaims: 400, maxClaimChars: 400,
};

/** The dossier run's byte cap on selected quotable text: about 400 KB fits a ~200k-token context with room for the output even at 2 to 3 bytes per token. */
export const DOSSIER_MAX_SELECTED_BYTES = 400_000;
export const DOSSIER_DISCOVERY_BUDGET: DiscoveryBudget = { ...DEFAULT_DISCOVERY_BUDGET, maxSelectedBytes: DOSSIER_MAX_SELECTED_BYTES };

export interface DiscoveryClaim { readonly blobId: string; readonly claim: string; readonly relevance: number }
export interface MapInput {
  readonly subsystem: string;
  readonly readerQuestions: readonly string[];
  readonly items: readonly { readonly blobId: string; readonly path: string; readonly excerpt: string }[];
}
export interface ReduceInput {
  readonly readerQuestions: readonly string[];
  readonly maxSelected: number;
  readonly subsystems: readonly { readonly subsystem: string; readonly blobs: number; readonly claims: readonly (DiscoveryClaim & { readonly path: string })[] }[];
}
/** `dropped` is read only when replaying receipts: a count the recording run already discarded. A live reply's own `dropped` is ignored. */
export interface MapReply { readonly claims: readonly DiscoveryClaim[]; readonly usageUnits: number | null; readonly dropped?: number }
export interface ReduceReply { readonly ranked: readonly string[]; readonly usageUnits: number | null; readonly dropped?: number }

/** One provider call, asked about before it is made. */
export interface DiscoveryCall { readonly kind: 'map' | 'reduce'; readonly subsystem?: string; readonly itemCount: number; readonly requestDigest: string }
/** The durable record of one call, shaped like a stage receipt: what was asked
 * (digest), what it cost, what happened, and the failure detail truncated. An
 * `accepted` receipt carries the validated reply, so a report can be rebuilt
 * from receipts alone (`reportFromReceipts`). A `dispatching` receipt is written
 * before the call, so a crash leaves evidence the call may have left the machine. */
export interface DiscoveryReceipt {
  readonly kind: 'map' | 'reduce';
  readonly ordinal: number;
  readonly subsystem?: string;
  readonly requestDigest: string;
  readonly itemCount: number;
  readonly outcome: 'dispatching' | 'accepted' | 'failed' | 'refused';
  readonly usageUnits: number | null;
  readonly dropped: number;
  readonly reply?: { readonly claims: readonly DiscoveryClaim[] } | { readonly ranked: readonly string[] };
  readonly detail?: string;
  /** Map receipts only: how each item's excerpt was taken (local audit; not part of the request). */
  readonly excerpts?: readonly ExcerptAudit[];
}
/** What one map item's excerpt was, kept in the local receipt and never sent: its kind, the blob byte ranges it quotes, and the leading licence comment left out. Offsets only, no text. */
export interface ExcerptAudit { readonly blobId: string; readonly kind: ExcerptKind; readonly ranges: readonly ExcerptRange[]; readonly licenceSkipped: ExcerptRange | null }
export interface DiscoveryPorts {
  /** Asked once per provider call; anything but `true` means the call is not made. */
  readonly permitted: (call: DiscoveryCall) => Promise<boolean>;
  readonly map?: (input: MapInput, signal: AbortSignal) => Promise<MapReply>;
  /** Blob ids in priority order; unknown ids are dropped and counted. */
  readonly reduce?: (input: ReduceInput, signal: AbortSignal) => Promise<ReduceReply>;
  /** Required with `map` or `reduce`; a rejection stops discovery. */
  readonly receipt?: (receipt: DiscoveryReceipt) => Promise<void>;
  /** Keys the id of every row deferred by budget (syzygy-75ds); a fresh key per call when absent, never serialised. */
  readonly runKey?: Buffer;
}

export interface DiscoveryReport {
  readonly boundary: string;
  readonly population: { readonly sources: number; readonly alreadyExcluded: number; readonly candidateBlobs: number };
  readonly subsystems: number;
  readonly mapCalls: number;
  readonly mapFailures: number;
  readonly refusedCalls: number;
  readonly unmappedSubsystems: readonly string[];
  readonly reduceCalls: number;
  readonly reduceFailures: number;
  readonly rankingBasis: 'model-reduce' | 'model-map' | 'heuristic';
  readonly basisNote: string;
  readonly droppedUnknownIds: number;
  /** `blobs` counts files selected whole; `sources` counts every quotable source kept, pieces of a partly selected file included. */
  readonly selected: { readonly blobs: number; readonly sources: number };
  /** Split files of which only a leading run of pieces was kept (each also has one deferred row naming the rest). `selected.blobs + deferred.length` is the candidate count. */
  readonly partialBlobs: number;
  /** UTF-8 bytes of quotable text: kept, deferred (every candidate not kept), and the cap that applied (null when none). */
  readonly bytes: { readonly selected: number; readonly deferred: number; readonly cap: number | null };
  readonly deferred: readonly { readonly blobId: string; readonly path: string; readonly detail: string }[];
  readonly ledger: readonly (DiscoveryClaim & { readonly path: string })[];
}
export interface DiscoveryResult { readonly sources: readonly GenerationSource[]; readonly report: DiscoveryReport; readonly receipts: readonly DiscoveryReceipt[] }

export class DiscoveryRefusal extends Error {
  constructor(readonly reason: string) { super(`Discovery refused: ${reason}`); this.name = 'DiscoveryRefusal'; }
}

interface Blob { readonly blobId: string; readonly path: string; readonly pieces: readonly GenerationSource[]; readonly bytes: number; heuristic: number }

const pieceBase = (source: GenerationSource): string =>
  source.segment === undefined ? source.sourceId : source.sourceId.replace(/-p[0-9]+$/u, '');

/** UTF-8 bytes of the quotable text of these pieces. */
const pieceBytes = (piece: GenerationSource): number => quotableBytes([piece]);
const quotableBytes = (pieces: readonly GenerationSource[]): number =>
  pieces.reduce((total, piece) => total + piece.spans.reduce((n, span) => n + Buffer.byteLength(span.text, 'utf8'), 0), 0);

/** Quotable pieces of one file travel together: a partial set would break
 * contiguity, and the whole file is the unit a reader cites. */
function candidateBlobs(sources: readonly GenerationSource[]): Blob[] {
  const byId = new Map<string, GenerationSource[]>();
  for (const source of sources) {
    if (source.exclusion.excluded || source.spans.length === 0) continue;
    const id = pieceBase(source);
    byId.set(id, [...(byId.get(id) ?? []), source]);
  }
  return [...byId].map(([blobId, pieces]) => ({ blobId, path: pieces[0]!.path, pieces, bytes: quotableBytes(pieces), heuristic: heuristicScore(pieces[0]!.path, pieces) }));
}

/** A directory segment that marks vendored or generated code. A file under one ranks below every file that is not: the tier is strict, so
 * nothing in it (a README included) can outrank first-party code. It is still a candidate, and is counted deferred when not selected. */
const VENDORED_SEGMENT = /^(vendor|third_party|deps|node_modules|dist|build)$/iu;
export const VENDORED_TIER = -1000;
/** Size bonus ceiling, in doublings of 1 KiB of quotable text (256 KiB and above earn the same). */
export const SIZE_BONUS_MAX = 8;

const SOURCE_ROOT = /^(src|lib|libs|source|sources|core|pkg|internal|app|apps|cmd|crates|include)$/iu;
const CONFIGURATION = /\.(conf|cfg|ini|toml|ya?ml|json|xml|properties|env|lock)$/iu;
const BUILD_FILE = /^(makefile|gnumakefile|cmakelists\.txt|dockerfile|rakefile|build\.gradle|pom\.xml)$|\.(mk|cmake|gradle|bzl)$/iu;
const HISTORY_FILE = /(release[-_ ]?notes?|changelog|changes|history|news)/iu;
export const SOURCE_ROOT_BONUS = 10;
export const CONFIGURATION_PENALTY = -20;
export const BUILD_PENALTY = -15;
export const HISTORY_PENALTY = -15;
/** A leading comment of this many characters earns one point, doubling per point to the maximum. */
export const COMMENT_BONUS_UNIT = 200;
export const COMMENT_BONUS_MAX = 8;

/** Path-and-size prior used as the fallback ranking and as the tie-break. */
export function heuristicScore(path: string, pieces: readonly GenerationSource[]): number {
  const parts = path.split('/'), name = (parts.at(-1) ?? '').toLowerCase();
  let score = 0;
  if (/^(readme|overview|architecture|design|concepts?|internals?|contributing|index|rationale|notes|implementation|how[-_ ]it[-_ ]works)(\.|$)/u.test(name)) score += 50;
  if (parts.slice(0, -1).some(part => /^(docs?|documentation|design|architecture)$/iu.test(part))) score += 30;
  if (/\.(md|rst|txt|adoc)$/u.test(name) && !BUILD_FILE.test(name)) score += 10;
  if (parts.slice(0, -1).some(part => /^(tests?|__tests__|spec|fixtures?|examples?)$/iu.test(part)) || /\.(test|spec)\./u.test(name)) score -= 20;
  // Role signals, all generic. A source root outranks the rest of the tree; configuration, build and history files say little about how the project works and rank below prose and code.
  if (SOURCE_ROOT.test(parts[0] ?? '') && parts.length > 1) score += SOURCE_ROOT_BONUS;
  if (CONFIGURATION.test(name)) score += CONFIGURATION_PENALTY;
  else if (BUILD_FILE.test(name)) score += BUILD_PENALTY;
  if (HISTORY_FILE.test(name)) score += HISTORY_PENALTY;
  // A file that opens with a long comment of its own explains itself: more of its head is worth reading.
  const head = pieces[0]?.body ?? pieces[0]?.spans[0]?.text ?? '';
  score += Math.min(COMMENT_BONUS_MAX, Math.floor(Math.log2(Math.max(1, leadingCommentChars(path, head) / COMMENT_BONUS_UNIT))));
  // Among files the path rules do not separate, more quotable text means more substance; without this a tie fell to path order.
  const chars = pieces.reduce((total, piece) => total + piece.spans.reduce((n, span) => n + span.text.length, 0), 0);
  score += Math.min(SIZE_BONUS_MAX, Math.floor(Math.log2(Math.max(1, chars / 1024))));
  const vendored = parts.slice(0, -1).some(part => VENDORED_SEGMENT.test(part));
  return (vendored ? VENDORED_TIER : 0) + score - 2 * (parts.length - 1) - pieces.length;
}

/** Subsystems by leading path segments, refined until each holds at most
 * `maxGroupBlobs` files; a flat directory beyond the cap is chunked in path
 * order (`dir#2`). Deterministic for one population. */
export function partitionSubsystems(blobs: readonly Blob[], maxGroupBlobs: number): { readonly name: string; readonly blobs: readonly Blob[] }[] {
  if (!Number.isSafeInteger(maxGroupBlobs) || maxGroupBlobs < 1) throw new DiscoveryRefusal('invalid-budget');
  const out: { name: string; blobs: Blob[] }[] = [];
  const split = (items: Blob[], depth: number, prefix: string): void => {
    const direct: Blob[] = [], children = new Map<string, Blob[]>();
    for (const item of items) {
      const parts = item.path.split('/');
      if (parts.length - 1 <= depth) direct.push(item);
      else children.set(parts[depth]!, [...(children.get(parts[depth]!) ?? []), item]);
    }
    if (items.length <= maxGroupBlobs || children.size === 0) {
      const sorted = [...items].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
      for (let at = 0; at < sorted.length; at += maxGroupBlobs) {
        out.push({ name: `${prefix || '.'}${sorted.length > maxGroupBlobs ? `#${at / maxGroupBlobs + 1}` : ''}`, blobs: sorted.slice(at, at + maxGroupBlobs) });
      }
      return;
    }
    if (direct.length > 0) split(direct, depth, prefix);
    for (const [segment, group] of [...children].sort(([a], [b]) => a < b ? -1 : 1)) split(group, depth + 1, prefix ? `${prefix}/${segment}` : segment);
  };
  split([...blobs], 0, '');
  return out;
}

const compareBlobs = (a: Blob, b: Blob): number => b.heuristic - a.heuristic || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0);

const DIGEST_LIMITS = { maxBytes: 50_000_000, maxNodes: 2_000_000, maxDepth: 16 } as const;

export const MAP_CLAIMS_PER_ITEM = 2;
const usage = (value: unknown): number | null => (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null);

export async function discoverAndSelect(
  sources: readonly GenerationSource[], readerQuestions: readonly string[], budget: DiscoveryBudget, ports: DiscoveryPorts, signal: AbortSignal = new AbortController().signal,
): Promise<DiscoveryResult> {
  return discover(sources, readerQuestions, budget, ports, signal, false);
}

async function discover(
  sources: readonly GenerationSource[], readerQuestions: readonly string[], budget: DiscoveryBudget, ports: DiscoveryPorts, signal: AbortSignal, replay: boolean,
): Promise<DiscoveryResult> {
  if (!Number.isSafeInteger(budget.maxSelected) || budget.maxSelected < 1 || budget.maxSelected > PIPELINE_QUOTABLE_CAP
    || [budget.maxMapCalls, budget.maxExcerptChars, budget.claimsPerGroup, budget.maxReduceClaims].some(n => !Number.isSafeInteger(n) || n < 0)
    || !Number.isSafeInteger(budget.maxClaimChars) || budget.maxClaimChars < 1
    || (budget.maxSelectedBytes !== undefined && (!Number.isSafeInteger(budget.maxSelectedBytes) || budget.maxSelectedBytes < 1))) throw new DiscoveryRefusal('invalid-budget');
  if ((ports.map !== undefined || ports.reduce !== undefined) && ports.receipt === undefined) throw new DiscoveryRefusal('model-ports-need-a-receipt-port');
  const blobs = candidateBlobs(sources);
  const groups = partitionSubsystems(blobs, budget.maxGroupBlobs);

  const byId = new Map(blobs.map(blob => [blob.blobId, blob]));
  const claims = new Map<string, DiscoveryClaim>();
  const unmapped: string[] = [];
  const receipts: DiscoveryReceipt[] = [];
  let mapCalls = 0, mapFailures = 0, refusedCalls = 0, reduceCalls = 0, reduceFailures = 0, dropped = 0, ordinal = 0;

  const aborted = new Promise<never>((_, reject) => {
    const stop = (): void => reject(new DiscoveryRefusal('cancelled'));
    if (signal.aborted) stop(); else signal.addEventListener('abort', stop, { once: true });
  });
  aborted.catch(() => undefined);
  const raced = <T>(job: Promise<T>): Promise<T> => Promise.race([job, aborted]);
  const emit = async (receipt: DiscoveryReceipt): Promise<void> => {
    receipts.push(receipt);
    try { await ports.receipt!(receipt); } catch { throw new DiscoveryRefusal('receipt-write-failed'); }
  };

  /** One provider call: ask, write a dispatching receipt, call, validate, write the outcome. */
  const providerCall = async <In, Raw, Valid extends { readonly usageUnits: number | null; readonly dropped: number; readonly reply: NonNullable<DiscoveryReceipt['reply']> }>(
    kind: 'map' | 'reduce', subsystem: string | undefined, input: In, itemCount: number, invoke: (input: In, signal: AbortSignal) => Promise<Raw>, validate: (raw: Raw) => Valid, excerpts?: readonly ExcerptAudit[],
  ): Promise<Valid | undefined> => {
    if (signal.aborted) throw new DiscoveryRefusal('cancelled');
    const call: DiscoveryCall = { kind, ...(subsystem === undefined ? {} : { subsystem }), itemCount, requestDigest: digestCanonicalJson(input, DIGEST_LIMITS).digest };
    const shared = { kind, ordinal: ordinal++, ...(subsystem === undefined ? {} : { subsystem }), requestDigest: call.requestDigest, itemCount, ...(excerpts === undefined ? {} : { excerpts }) };
    let allowed = false;
    try { allowed = await raced(ports.permitted(call)) === true; } catch (error) { if (error instanceof DiscoveryRefusal) throw error; }
    if (!allowed) { refusedCalls++; await emit({ ...shared, outcome: 'refused', usageUnits: null, dropped: 0 }); return undefined; }
    await emit({ ...shared, outcome: 'dispatching', usageUnits: null, dropped: 0 });
    try {
      const valid = validate(await raced(invoke(input, signal)));
      await emit({ ...shared, outcome: 'accepted', usageUnits: valid.usageUnits, dropped: valid.dropped, reply: valid.reply });
      return valid;
    } catch (error) {
      const detail = (error instanceof Error ? error.message : String(error)).slice(0, 200);
      if (error instanceof DiscoveryRefusal && error.reason === 'receipt-write-failed') throw error;
      await emit({ ...shared, outcome: 'failed', usageUnits: null, dropped: 0, detail });
      if (error instanceof DiscoveryRefusal) throw error;
      return undefined;
    }
  };

  // Larger and more promising subsystems are mapped first when calls run short.
  const mapOrder = [...groups].sort((a, b) => Math.max(...b.blobs.map(x => x.heuristic)) - Math.max(...a.blobs.map(x => x.heuristic)) || (a.name < b.name ? -1 : 1));
  for (const group of mapOrder) {
    if (ports.map === undefined || mapCalls >= budget.maxMapCalls) { unmapped.push(group.name); continue; }
    mapCalls++;
    const known = new Set(group.blobs.map(blob => blob.blobId));
    const taken = group.blobs.map(blob => {
      const first = [...blob.pieces].sort((a, b) => (a.segment?.index ?? 0) - (b.segment?.index ?? 0))[0]!;
      return { blob, excerpt: buildExcerpt(blob.path, first.body ?? first.spans[0]?.text ?? '', first.segment?.start ?? 0, budget.maxExcerptChars) };
    });
    const input: MapInput = { subsystem: group.name, readerQuestions, items: taken.map(({ blob, excerpt }) => ({ blobId: blob.blobId, path: blob.path, excerpt: excerpt.text })) };
    const audit: ExcerptAudit[] = taken.map(({ blob, excerpt }) => ({ blobId: blob.blobId, kind: excerpt.kind, ranges: excerpt.ranges, licenceSkipped: excerpt.licenceSkipped }));
    // The whole reply is validated before any claim reaches the ledger.
    const outcome = await providerCall('map', group.name, input, input.items.length, ports.map, (raw: unknown) => {
      if (!isRecord(raw) || !Array.isArray(raw.claims)) throw new Error('invalid-map-reply');
      const accepted: DiscoveryClaim[] = [];
      let discarded = replay && typeof raw.dropped === 'number' && Number.isSafeInteger(raw.dropped) && raw.dropped > 0 ? raw.dropped : 0;
      // A reply is read up to MAP_CLAIMS_PER_ITEM claims per file; a longer one is cut and the cut is counted.
      const offered = raw.claims as unknown[], cap = input.items.length * MAP_CLAIMS_PER_ITEM;
      discarded += Math.max(0, offered.length - cap);
      for (const claim of offered.slice(0, cap)) {
        if (!isRecord(claim) || typeof claim.blobId !== 'string' || !known.has(claim.blobId) || typeof claim.relevance !== 'number' || !Number.isFinite(claim.relevance)
          || claim.relevance < 0 || claim.relevance > 10 || typeof claim.claim !== 'string' || claim.claim.length === 0) { discarded++; continue; }
        accepted.push({ blobId: claim.blobId, relevance: claim.relevance, claim: [...claim.claim].slice(0, budget.maxClaimChars).join('') });
      }
      return { usageUnits: usage(raw.usageUnits), dropped: discarded, reply: { claims: accepted } };
    }, audit);
    if (outcome === undefined) { mapFailures++; unmapped.push(group.name); continue; }
    dropped += outcome.dropped;
    for (const claim of (outcome.reply as { claims: DiscoveryClaim[] }).claims) {
      const prior = claims.get(claim.blobId);
      if (prior === undefined || claim.relevance > prior.relevance) claims.set(claim.blobId, claim);
    }
  }

  const ledgerFor = (blob: Blob): (DiscoveryClaim & { path: string }) | undefined => { const c = claims.get(blob.blobId); return c && { ...c, path: blob.path }; };
  const rankedIds: string[] = [];
  let basis: DiscoveryReport['rankingBasis'] = claims.size > 0 ? 'model-map' : 'heuristic';
  if (ports.reduce !== undefined && claims.size > 0) {
    const perGroup = Math.max(1, Math.min(budget.claimsPerGroup, Math.floor(budget.maxReduceClaims / Math.max(1, groups.length))));
    const subsystems = groups.map(group => ({ subsystem: group.name, blobs: group.blobs.length,
      claims: group.blobs.map(ledgerFor).filter((c): c is DiscoveryClaim & { path: string } => c !== undefined)
        .sort((a, b) => b.relevance - a.relevance || (a.path < b.path ? -1 : 1)).slice(0, perGroup) })).filter(entry => entry.claims.length > 0);
    reduceCalls++;
    const input: ReduceInput = { readerQuestions, maxSelected: budget.maxSelected, subsystems };
    const outcome = await providerCall('reduce', undefined, input, subsystems.reduce((n, s) => n + s.claims.length, 0), ports.reduce, (raw: unknown) => {
      if (!isRecord(raw) || !Array.isArray(raw.ranked) || raw.ranked.some(id => typeof id !== 'string')) throw new Error('invalid-reduce-reply');
      const ranked: string[] = [], seen = new Set<string>();
      let discarded = replay && typeof raw.dropped === 'number' && Number.isSafeInteger(raw.dropped) && raw.dropped > 0 ? raw.dropped : 0;
      const offered = raw.ranked as string[];
      discarded += Math.max(0, offered.length - byId.size);
      for (const id of offered.slice(0, byId.size)) { if (!byId.has(id) || seen.has(id)) { discarded++; continue; } seen.add(id); ranked.push(id); }
      return { usageUnits: usage(raw.usageUnits), dropped: discarded, reply: { ranked } };
    });
    if (outcome === undefined) reduceFailures++;
    else {
      dropped += outcome.dropped;
      rankedIds.push(...(outcome.reply as { ranked: string[] }).ranked);
      if (rankedIds.length > 0) basis = 'model-reduce';
    }
  }
  // Whatever the reduce did not rank follows by map relevance, then the prior.
  const ranked = new Set(rankedIds);
  const rest = blobs.filter(blob => !ranked.has(blob.blobId)).sort((a, b) =>
    (claims.get(b.blobId)?.relevance ?? -1) - (claims.get(a.blobId)?.relevance ?? -1) || compareBlobs(a, b));
  const order = [...rankedIds.map(id => byId.get(id)!), ...rest];

  // Rank order until a cap is hit. A file that does not fit is skipped and the next, smaller one is tried; every skip is recorded with its reason.
  // With a byte cap, a split file may be admitted by its leading run of pieces (never a gap): the longest run that fits the room left and a per-file share of the cap. The rest is one deferred row.
  const chosen = new Map<string, number>(), noFit = new Set<string>(), skipDetail = new Map<string, string>();
  const byteCap = budget.maxSelectedBytes, share = byteCap === undefined ? 0 : Math.floor(byteCap / 4);
  let used = 0, usedBytes = 0, deferredBytes = 0, partialBlobs = 0;
  for (const blob of order) {
    const sorted = [...blob.pieces].sort((a, b) => (a.segment?.index ?? 0) - (b.segment?.index ?? 0));
    const total = sorted.length;
    if (byteCap === undefined) {
      if (used + total > budget.maxSelected) { noFit.add(blob.blobId); deferredBytes += blob.bytes; continue; }
      chosen.set(blob.blobId, total); used += total; usedBytes += blob.bytes;
      continue;
    }
    const roomBytes = byteCap - usedBytes, roomCount = budget.maxSelected - used;
    if (total === 1 || sorted[0]!.segment === undefined) {
      if (total > roomCount) { noFit.add(blob.blobId); deferredBytes += blob.bytes; continue; }
      if (blob.bytes > roomBytes) {
        skipDetail.set(blob.blobId, `${blob.bytes} bytes of quotable text did not fit the remaining ${roomBytes} of the ${byteCap}-byte selection cap`);
        deferredBytes += blob.bytes;
        continue;
      }
      chosen.set(blob.blobId, total); used += total; usedBytes += blob.bytes;
      continue;
    }
    const limit = Math.min(roomBytes, share);
    let take = 0, takeBytes = 0;
    while (take < total && take < roomCount && takeBytes + pieceBytes(sorted[take]!) <= limit) { takeBytes += pieceBytes(sorted[take]!); take++; }
    if (take === 0) {
      skipDetail.set(blob.blobId, `${blob.bytes} bytes of quotable text in ${total} pieces: not even the first piece (${pieceBytes(sorted[0]!)} bytes) fit the lesser of the remaining ${roomBytes} bytes and the per-file share of ${share} bytes of the ${byteCap}-byte selection cap`);
      deferredBytes += blob.bytes;
      continue;
    }
    chosen.set(blob.blobId, take); used += take; usedBytes += takeBytes;
    if (take < total) {
      const from = sorted[take]!.segment!;
      skipDetail.set(blob.blobId, `pieces ${take + 1}..${total} of ${total} not read: bytes ${from.start}..${from.blobBytes} of the file's ${from.blobBytes} (${blob.bytes - takeBytes} bytes of quotable text); pieces 1..${take} (${takeBytes} bytes) were kept within the lesser of the remaining ${roomBytes} bytes and the per-file share of ${share} bytes of the ${byteCap}-byte selection cap`);
      deferredBytes += blob.bytes - takeBytes;
      partialBlobs++;
    }
  }
  const runKey = ports.runKey ?? newGenerationRunKey();
  const deferred: DiscoveryReport['deferred'][number][] = [];
  const emitted = new Set<string>();
  const out: GenerationSource[] = [];
  for (const source of sources) {
    if (source.exclusion.excluded || source.spans.length === 0) { out.push(source); continue; }
    const id = pieceBase(source);
    const take = chosen.get(id);
    if (take !== undefined && (source.segment === undefined || source.segment.index < take)) { out.push(source); continue; }
    if (emitted.has(id)) continue;
    emitted.add(id);
    const { body: _body, segment: _segment, spans: _spans, ...bound } = source;
    out.push({ ...bound, sourceId: excludedSourceId(runKey, id), exclusion: { excluded: true, reason: DEFERRED_BY_BUDGET }, spans: [] });
    const pieces = byId.get(id)!.pieces.length;
    deferred.push({ blobId: id, path: source.path, detail: skipDetail.get(id) ?? (noFit.has(id) && pieces > 1 && used + pieces > budget.maxSelected
      ? `${pieces} quotable sources did not fit the remaining selection cap of ${budget.maxSelected}`
      : `ranked below the selection cut for a cap of ${budget.maxSelected} quotable sources`) });
  }
  const alreadyExcluded = sources.filter(s => s.exclusion.excluded || s.spans.length === 0).length;
  return { receipts, sources: out, report: {
    boundary: deferred.length === 0 ? 'every candidate blob was selected' : 'deferred blobs were counted but not read into the account; the account does not claim whole-repository coverage',
    population: { sources: sources.length, alreadyExcluded, candidateBlobs: blobs.length }, subsystems: groups.length, mapCalls, mapFailures, refusedCalls,
    unmappedSubsystems: unmapped.sort(), reduceCalls, reduceFailures, rankingBasis: basis,
    basisNote: basis === 'heuristic' ? 'Ordered by a path-and-size prior only; no model reply was accepted.'
      : 'A model ranking is an Inferred claim. Blobs with no accepted map claim rank below every blob that has one.',
    droppedUnknownIds: dropped, selected: { blobs: [...chosen].filter(([id, take]) => take === byId.get(id)!.pieces.length).length, sources: used }, partialBlobs, bytes: { selected: usedBytes, deferred: deferredBytes, cap: byteCap ?? null }, deferred,
    ledger: order.filter(blob => chosen.has(blob.blobId)).map(ledgerFor).filter((c): c is DiscoveryClaim & { path: string } => c !== undefined) } };
}

/** Rebuilds a report from the population and the receipts alone, by replaying
 * each recorded reply. A port is installed only for a kind the receipts hold,
 * so a run that had no map (or no reduce) port replays to the same report. A
 * call the replay makes must find a receipt of the same request digest and item
 * count; a changed population or reader question fails the replay rather than
 * rendering another run's report as this one's. */
export async function reportFromReceipts(
  sources: readonly GenerationSource[], readerQuestions: readonly string[], budget: DiscoveryBudget, receipts: readonly DiscoveryReceipt[], runKey?: Buffer,
): Promise<DiscoveryResult> {
  const last = new Map<string, DiscoveryReceipt>();
  for (const receipt of receipts) last.set(`${receipt.kind}:${receipt.subsystem ?? ''}`, receipt);
  const find = (kind: 'map' | 'reduce', subsystem?: string): DiscoveryReceipt | undefined => last.get(`${kind}:${subsystem ?? ''}`);
  const hasKind = (kind: 'map' | 'reduce'): boolean => receipts.some(receipt => receipt.kind === kind);
  const recorded = (receipt: DiscoveryReceipt | undefined): DiscoveryReceipt => {
    if (receipt?.outcome !== 'accepted') throw new Error(`recorded ${receipt?.outcome ?? 'missing'}`);
    return receipt;
  };
  return discover(sources, readerQuestions, budget, {
    permitted: async call => {
      const receipt = find(call.kind, call.subsystem);
      if (receipt === undefined) throw new DiscoveryRefusal('receipt-missing-for-call');
      if (receipt.requestDigest !== call.requestDigest || receipt.itemCount !== call.itemCount) throw new DiscoveryRefusal('receipt-request-mismatch');
      return receipt.outcome !== 'refused';
    },
    ...(hasKind('map') ? { map: async (input: MapInput) => {
      const receipt = recorded(find('map', input.subsystem));
      return { claims: (receipt.reply as { claims: DiscoveryClaim[] }).claims, usageUnits: receipt.usageUnits, dropped: receipt.dropped };
    } } : {}),
    ...(hasKind('reduce') ? { reduce: async () => {
      const receipt = recorded(find('reduce'));
      return { ranked: (receipt.reply as { ranked: string[] }).ranked, usageUnits: receipt.usageUnits, dropped: receipt.dropped };
    } } : {}),
    receipt: async () => undefined,
    ...(runKey === undefined ? {} : { runKey }),
  }, new AbortController().signal, true);
}
