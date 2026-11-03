/**
 * The provider envelope for hierarchical discovery's map and reduce calls
 * (REQ-polaris-generation-030). Discovery takes structured inputs and expects
 * claims or a ranking back; this module builds what a generate port sends for
 * each call and parses what comes back. It never calls a provider and authors
 * no instruction text: the system prompt is `promptForStage(stage)` and the
 * reply schema is `stageSchema(stage)`, for the stages `discovery-map` and
 * `discovery-reduce`, so the two symbols the instruction-text rule names stay
 * the only source of it.
 *
 * The envelope has the pipeline stage envelope's five fields (promptVersion,
 * system, responseSchemaVersion, responseSchema, inputs). Each call reads every
 * request field exactly once into a plain snapshot, validates the snapshot, and
 * builds `inputs` and the candidate ids from it alone, so a caller's extra
 * property never crosses the boundary and a getter cannot answer validation
 * and encoding differently. A reduce request's claims carry the bounds a map
 * reply's claims do (1..400 code points, relevance 0..10). The schema is fixed; which blob ids a reply may name is the
 * call's own business, checked by `validateDiscoveryReply`: a map reply only
 * its input's blob ids, a reduce reply only the blob ids its input's claims
 * name, at most `maxSelected`. Any breach refuses the whole reply.
 *
 * The request shapes match discovery.ts's `MapInput` and `ReduceInput`
 * structurally, so a discovery port can pass its input straight through.
 */

import { isRecord } from '@syzygy/support';
import { encodeCanonicalJson, type CanonicalJsonLimits } from './canonical-json.js';
import { parseBoundedJson } from './parse-json.js';
import { promptForStage, type DiscoveryStage } from './prompts.js';
import { DISCOVERY_CLAIM_MAX_LENGTH, DISCOVERY_RELEVANCE_MAX, stageSchema, validateDiscoveryReply } from './provider-draft.js';

export interface DiscoveryMapRequest {
  readonly subsystem: string;
  readonly readerQuestions: readonly string[];
  readonly items: readonly { readonly blobId: string; readonly path: string; readonly excerpt: string }[];
}
export interface DiscoveryReduceRequest {
  readonly readerQuestions: readonly string[];
  readonly maxSelected: number;
  readonly subsystems: readonly {
    readonly subsystem: string;
    readonly blobs: number;
    readonly claims: readonly { readonly blobId: string; readonly path: string; readonly claim: string; readonly relevance: number }[];
  }[];
}
export interface DiscoveryReplyClaim { readonly blobId: string; readonly claim: string; readonly relevance: number }
export interface DiscoveryEnvelope {
  readonly promptVersion: string;
  readonly system: string;
  readonly responseSchemaVersion: string;
  readonly responseSchema: Readonly<Record<string, unknown>>;
  readonly inputs: Readonly<Record<string, unknown>>;
}

export type DiscoveryProviderFailure = 'invalid-map-request' | 'invalid-reduce-request' | 'invalid-map-reply' | 'invalid-reduce-reply';
/** Diagnostics carry no request or reply content. */
export class DiscoveryProviderError extends Error {
  constructor(readonly code: DiscoveryProviderFailure) {
    super(`Discovery provider envelope refused: ${code}`);
    this.name = 'DiscoveryProviderError';
  }
}

/** Bounds for an encoded envelope and a parsed reply. */
export const DISCOVERY_JSON_LIMITS: CanonicalJsonLimits = { maxBytes: 4_000_000, maxNodes: 100_000, maxDepth: 16 };

/** `@syzygy/support`'s `isRecord`, and a plain object's prototype. */
const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  isRecord(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value) as object | null);
const isText = (value: unknown): value is string => typeof value === 'string' && value.length > 0;
const isQuestions = (value: unknown): value is string[] => Array.isArray(value) && value.length > 0 && value.every(isText);
const distinct = (values: readonly string[]): boolean => new Set(values).size === values.length;

/** Reads an array's length once and each element once; anything else is refused. */
function snapshotList<T>(value: unknown, read: (item: unknown) => T): T[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const length = value.length;
  const items: T[] = [];
  for (let index = 0; index < length; index++) items.push(read(value[index]));
  return items;
}
const textList = (value: unknown): string[] | undefined => snapshotList(value, item => item as string);
const isClaimText = (value: unknown): value is string => isText(value) && [...value].length <= DISCOVERY_CLAIM_MAX_LENGTH;
// NaN fails both comparisons, so the bounds also refuse a non-finite relevance.
const isRelevance = (value: unknown): value is number => typeof value === 'number' && value >= 0 && value <= DISCOVERY_RELEVANCE_MAX;

interface MapSnapshot { readonly inputs: DiscoveryMapRequest; readonly candidateIds: readonly string[] }
interface ReduceSnapshot { readonly inputs: DiscoveryReduceRequest; readonly candidateIds: readonly string[] }

function mapSnapshot(request: DiscoveryMapRequest): MapSnapshot {
  const fail = (): never => { throw new DiscoveryProviderError('invalid-map-request'); };
  if (!isPlainRecord(request)) fail();
  const subsystem: unknown = request.subsystem;
  const readerQuestions = textList(request.readerQuestions);
  const items = snapshotList(request.items, item => {
    if (!isPlainRecord(item)) return fail();
    return { blobId: item.blobId as unknown, path: item.path as unknown, excerpt: item.excerpt as unknown };
  });
  if (!isText(subsystem) || !isQuestions(readerQuestions) || items === undefined || items.length === 0) return fail();
  for (const item of items) if (!isText(item.blobId) || !isText(item.path) || typeof item.excerpt !== 'string') fail();
  const valid = items as { blobId: string; path: string; excerpt: string }[];
  const candidateIds = valid.map(item => item.blobId);
  if (!distinct(candidateIds)) fail();
  return { inputs: { subsystem, readerQuestions, items: valid }, candidateIds };
}

function reduceSnapshot(request: DiscoveryReduceRequest): ReduceSnapshot {
  const fail = (): never => { throw new DiscoveryProviderError('invalid-reduce-request'); };
  if (!isPlainRecord(request)) fail();
  const readerQuestions = textList(request.readerQuestions);
  const maxSelected: unknown = request.maxSelected;
  const subsystems = snapshotList(request.subsystems, entry => {
    if (!isPlainRecord(entry)) return fail();
    const claims = snapshotList(entry.claims, claim => {
      if (!isPlainRecord(claim)) return fail();
      return { blobId: claim.blobId as unknown, path: claim.path as unknown, claim: claim.claim as unknown, relevance: claim.relevance as unknown };
    });
    return { subsystem: entry.subsystem as unknown, blobs: entry.blobs as unknown, claims };
  });
  if (!isQuestions(readerQuestions) || typeof maxSelected !== 'number' || !Number.isSafeInteger(maxSelected) || maxSelected < 1 || subsystems === undefined) return fail();
  for (const entry of subsystems) {
    if (!isText(entry.subsystem) || typeof entry.blobs !== 'number' || !Number.isSafeInteger(entry.blobs) || entry.blobs < 0 || entry.claims === undefined) fail();
    for (const claim of entry.claims ?? []) {
      if (!isText(claim.blobId) || !isText(claim.path) || !isClaimText(claim.claim) || !isRelevance(claim.relevance)) fail();
    }
  }
  const valid = subsystems as DiscoveryReduceRequest['subsystems'][number][];
  const candidateIds = valid.flatMap(entry => entry.claims.map(claim => claim.blobId));
  if (candidateIds.length === 0 || !distinct(candidateIds)) fail();
  return { inputs: { readerQuestions, maxSelected, subsystems: valid }, candidateIds };
}

function envelopeFor(stage: DiscoveryStage, inputs: Record<string, unknown>): { readonly envelope: DiscoveryEnvelope; readonly input: string } {
  const prompt = promptForStage(stage);
  const schema = stageSchema(stage);
  const envelope: DiscoveryEnvelope = { promptVersion: prompt.version, system: prompt.system, responseSchemaVersion: schema.version, responseSchema: schema.schema, inputs };
  return { envelope, input: encodeCanonicalJson(envelope, DISCOVERY_JSON_LIMITS) };
}

/** The envelope a map call sends, and its canonical encoding (the user message). */
export function discoveryMapEnvelope(request: DiscoveryMapRequest): { readonly envelope: DiscoveryEnvelope; readonly input: string } {
  const { inputs } = mapSnapshot(request);
  return envelopeFor('discovery-map', { subsystem: inputs.subsystem, readerQuestions: inputs.readerQuestions, items: inputs.items });
}

/** The envelope a reduce call sends, and its canonical encoding (the user message). */
export function discoveryReduceEnvelope(request: DiscoveryReduceRequest): { readonly envelope: DiscoveryEnvelope; readonly input: string } {
  const { inputs } = reduceSnapshot(request);
  return envelopeFor('discovery-reduce', { readerQuestions: inputs.readerQuestions, maxSelected: inputs.maxSelected, subsystems: inputs.subsystems });
}

/** One reply body, parsed and validated against its own call; any breach refuses all of it. */
function parseReply(stage: DiscoveryStage, body: string, call: { readonly candidateIds: readonly string[]; readonly maxSelected?: number }, code: DiscoveryProviderFailure): unknown {
  try { return validateDiscoveryReply(stage, parseBoundedJson(body, DISCOVERY_JSON_LIMITS), call); }
  catch { throw new DiscoveryProviderError(code); }
}

/**
 * Parses a map reply body against its request: exactly `{claims: [...]}`, each
 * claim exactly `{blobId, claim, relevance}`, a blobId from the request's items
 * at most once, a claim of 1..400 code points and a relevance in 0..10.
 */
export function parseDiscoveryMapReply(request: DiscoveryMapRequest, body: string): { readonly claims: readonly DiscoveryReplyClaim[] } {
  const value = parseReply('discovery-map', body, { candidateIds: mapSnapshot(request).candidateIds }, 'invalid-map-reply') as { claims: DiscoveryReplyClaim[] };
  return { claims: value.claims.map(claim => ({ blobId: claim.blobId, claim: claim.claim, relevance: claim.relevance })) };
}

/**
 * Parses a reduce reply body against its request: exactly `{ranked: [...]}`,
 * each id one the request's claims name, at most once, at most `maxSelected`.
 */
export function parseDiscoveryReduceReply(request: DiscoveryReduceRequest, body: string): { readonly ranked: readonly string[] } {
  const { inputs, candidateIds } = reduceSnapshot(request);
  const value = parseReply('discovery-reduce', body, { candidateIds, maxSelected: inputs.maxSelected }, 'invalid-reduce-reply') as { ranked: string[] };
  return { ranked: [...value.ranked] };
}
