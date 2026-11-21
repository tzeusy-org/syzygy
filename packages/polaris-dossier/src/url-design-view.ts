import { setImmediate as yieldToPoll } from 'node:timers/promises';
import { encodeCanonicalJson, isDossierPagePath, parseBoundedJson, REVIEW_STATUS_REGION } from '@syzygy/polaris-generation-core/live';
import { isRecord, sha256 } from '@syzygy/support';
import { designVerdictSchemaDocument } from './draft-schema.js';
import type { DossierScreen, ScreenExclusion } from './screen.js';

/** Candidate F6 representation primitive. This module authenticates no producer,
 * source, parent, renderer, sink contract or receipt, and grants no exemption.
 * A future trusted producer must supply the complete freshly rebuilt original.
 * No decoded original is returned to an artifact/tool caller. */
export const URL_DESIGN_VIEW_FORMAT = 'polaris-dossier-url-design-inert-view/1';
export const URL_DESIGN_VIEW_ENCODING = 'html-entities-five/1';
export const URL_DESIGN_VIEW_ARTIFACT = /^round-[1-9][0-9]{0,5}\/design-view\.json$/u;
const CEILING = 2_097_152;
export interface UrlDesignViewLimits {
  readonly originalBytes: number;
  readonly payloadBytes: number;
  readonly envelopeBytes: number;
  readonly files: number;
  readonly nodes: number;
  readonly depth: number;
}
const CEILINGS: UrlDesignViewLimits = Object.freeze({ originalBytes: CEILING, payloadBytes: CEILING, envelopeBytes: CEILING, files: 4096, nodes: 65_536, depth: 32 });
type Screen = Pick<DossierScreen, 'screenSecrets' | 'screenBody' | 'activeContentAsBefore'>;
export interface UrlDesignOriginalIdentity {
  readonly runId: string;
  readonly pinnedRevision: string;
  readonly sha256: string;
  readonly bytes: number;
}
export interface UrlDesignViewInput {
  /** Exact freshly rebuilt raw035 bytes, never a hash-only assertion. */
  readonly original: Uint8Array;
  readonly expected: UrlDesignOriginalIdentity;
  readonly screen: Screen;
  /** Only positive integer reductions of the fixed ceilings are supported. */
  readonly limits?: Partial<UrlDesignViewLimits>;
}
interface Envelope {
  readonly format: typeof URL_DESIGN_VIEW_FORMAT;
  readonly encoding: typeof URL_DESIGN_VIEW_ENCODING;
  readonly originalSha256: string;
  readonly originalBytes: number;
  readonly payloadSha256: string;
  readonly payloadBytes: number;
  readonly payload: string;
}
export interface ValidatedUrlDesignView {
  readonly kind: 'validated-representation-data-only';
  /** A copy of canonical inert envelope bytes. Mutability confers no authority. */
  readonly bytes: Uint8Array;
  readonly sha256: string;
  readonly byteLength: number;
  readonly originalSha256: string;
  readonly originalBytes: number;
  readonly payloadSha256: string;
  readonly payloadBytes: number;
  readonly files: number;
  readonly pages: number;
  readonly rawActive: Readonly<{ readonly status: 'failed'; readonly finding: ScreenExclusion } | { readonly status: 'passed'; readonly finding: null }>;
  readonly limits: UrlDesignViewLimits;
}
export type UrlDesignViewFailure = 'limits' | 'utf8' | 'identity' | 'json' | 'packet' | 'secret' | 'encoding' | 'envelope' | 'round-trip' | 'inert-screen';
/** Diagnostics contain no input body, path, detector fragment or property name. */
export class UrlDesignViewError extends Error {
  constructor(readonly code: UrlDesignViewFailure) { super(`url-design-view-refused:${code}`); this.name = 'UrlDesignViewError'; }
}
function refuse(code: UrlDesignViewFailure): never { throw new UrlDesignViewError(code); }
const hash = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{64}$/u.test(value);
const keys = (value: Record<string, unknown>, expected: readonly string[]): boolean => {
  const actual = Object.keys(value);
  return actual.length === expected.length && actual.every((key, i) => key === expected[i]);
};
function limitsOf(overrides: Partial<UrlDesignViewLimits> | undefined): UrlDesignViewLimits {
  if (overrides !== undefined && (!isRecord(overrides) || Object.keys(overrides).some(key => !Object.hasOwn(CEILINGS, key)))) refuse('limits');
  const limits = { ...CEILINGS, ...overrides };
  for (const key of Object.keys(CEILINGS) as (keyof UrlDesignViewLimits)[]) {
    if (!Number.isSafeInteger(limits[key]) || limits[key] <= 0 || limits[key] > CEILINGS[key]) refuse('limits');
  }
  return Object.freeze(limits);
}
function decode(bytes: Uint8Array, maximum: number): string {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength > maximum || bytes.byteLength === 0) refuse('limits');
  let text: string;
  try { text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); } catch { return refuse('utf8'); }
  if (text.includes('\u0000') || text.startsWith('\ufeff') || !Buffer.from(text).equals(Buffer.from(bytes))) refuse('utf8');
  return text;
}
function parse(text: string, maximum: number, limits: UrlDesignViewLimits): unknown {
  try { return parseBoundedJson(text, { maxBytes: maximum, maxNodes: limits.nodes, maxDepth: limits.depth }); }
  catch { return refuse('json'); }
}
function canonical(value: unknown, limits: UrlDesignViewLimits): string {
  try { return encodeCanonicalJson(value, { maxBytes: limits.envelopeBytes, maxNodes: limits.nodes, maxDepth: limits.depth }); }
  catch { return refuse('limits'); }
}
/** The scanner gets every complete projection, without repository-path exemptions.
 * Compositions are additionally bounded at 2MiB; exceeding that supported lower
 * screen-work bound refuses rather than dropping fields. Embedded JSON files are
 * parsed once with duplicate-key/depth/node checks, never HTML/entity-decoded. */
function screenPopulation(text: string, value: unknown, screen: Screen, limits: UrlDesignViewLimits, active: boolean,
  fileContents: readonly { readonly path: string; readonly content: string }[] = []): void {
  let nodes = 0;
  const values: string[] = [], keyed: string[] = [], fileValues: string[] = [], fileKeyed: string[] = [];
  const screened = new Set<string>();
  const inspect = (s: string): void => {
    if (screened.has(s)) return;
    if (Buffer.byteLength(s) > CEILING) refuse('limits');
    // U+FEFF inside a JSON string is data, not a stream BOM; preserve it.
    // In Unicode mode the surrogate range matches only lone surrogates.
    if (/[\u0000\uD800-\uDFFF]/u.test(s)) refuse('utf8');
    const finding = active ? screen.screenBody(s) : screen.screenSecrets(s);
    if (finding === 'secret-detector-match') refuse('secret');
    if (finding !== undefined) refuse('inert-screen');
    screened.add(s);
  };
  const visit = (item: unknown, depth: number, strings: string[], withKeys: string[]): void => {
    if (++nodes > limits.nodes || depth > limits.depth) refuse('limits');
    if (typeof item === 'string') { inspect(item); strings.push(item); withKeys.push(item); }
    else if (Array.isArray(item)) for (const child of item) visit(child, depth + 1, strings, withKeys);
    else if (isRecord(item)) for (const [key, child] of Object.entries(item)) { inspect(key); withKeys.push(key); visit(child, depth + 1, strings, withKeys); }
  };
  const composition = (parts: readonly string[]): void => {
    let size = 0;
    for (const part of parts) { size += Buffer.byteLength(part); if (size > CEILING) refuse('limits'); }
    inspect(parts.join(''));
  };
  inspect(text); visit(value, 0, values, keyed); composition(values); composition(keyed);
  // File contents were already screened as exact decoded packet fields above.
  // Also inspect the embedded JSON fields and the full file compositions.
  for (const file of fileContents) {
    if (file.path.endsWith('.json')) {
      const parsed = parse(file.content, limits.originalBytes, limits);
      const ownValues: string[] = [], ownKeyed: string[] = [];
      visit(parsed, 0, ownValues, ownKeyed); composition(ownValues); composition(ownKeyed);
      for (const s of ownValues) fileValues.push(s);
      for (const s of ownKeyed) fileKeyed.push(s);
    } else { fileValues.push(file.content); fileKeyed.push(file.content); }
  }
  composition(fileContents.map(file => file.content)); composition(fileValues); composition(fileKeyed);
}
interface Original { readonly text: string; readonly files: number; readonly pages: number; readonly rawActive: ValidatedUrlDesignView['rawActive']; }
function originalOf(input: UrlDesignViewInput, limits: UrlDesignViewLimits): Original {
  const text = decode(input.original, limits.originalBytes), expected = input.expected;
  if (!expected || !hash(expected.sha256) || !Number.isSafeInteger(expected.bytes) || expected.bytes !== input.original.byteLength
    || sha256(input.original) !== expected.sha256 || typeof expected.runId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/u.test(expected.runId)
    || typeof expected.pinnedRevision !== 'string' || !/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u.test(expected.pinnedRevision)) refuse('identity');
  const value = parse(text, limits.originalBytes, limits);
  if (!isRecord(value) || !keys(value, ['format', 'kind', 'runId', 'pinnedRevision', 'region', 'files', 'criteria', 'verdictSchema'])
    || value['format'] !== 'polaris-dossier-design-packet/1' || value['kind'] !== 'design'
    || value['runId'] !== expected.runId || value['pinnedRevision'] !== expected.pinnedRevision
    || !isRecord(value['region']) || !keys(value['region'], ['name', 'excluded']) || value['region']['name'] !== REVIEW_STATUS_REGION
    || value['region']['excluded'] !== `the element of every HTML page marked data-review-status-region="${REVIEW_STATUS_REGION}", and the reviewStatus member of machine.json: the only part a later render may change without retiring this review`
    || !Array.isArray(value['files']) || value['files'].length === 0 || value['files'].length > limits.files
    || !Array.isArray(value['criteria']) || value['criteria'].length === 0 || !value['criteria'].every(s => typeof s === 'string' && s.length > 0)
    || JSON.stringify(value['verdictSchema']) !== JSON.stringify(designVerdictSchemaDocument({ pinnedRevision: expected.pinnedRevision }))
    || `${JSON.stringify(value, null, 2)}\n` !== text) refuse('packet');
  const files: { path: string; content: string }[] = [];
  let previous = '', pages = 0;
  for (const row of value['files']) {
    if (!isRecord(row) || !keys(row, ['path', 'sha256', 'content']) || !isDossierPagePath(row['path']) || row['path'] <= previous
      || !hash(row['sha256']) || typeof row['content'] !== 'string' || sha256(row['content']) !== row['sha256']) refuse('packet');
    previous = row['path']; if (row['path'].endsWith('.html')) pages++;
    files.push({ path: row['path'], content: row['content'] });
  }
  if (!pages || !files.some(file => file.path === 'machine.json')) refuse('packet');
  screenPopulation(text, value, input.screen, limits, false, files);
  // The raw text already passed the full secret screen above.
  const rawActive = Object.freeze(input.screen.activeContentAsBefore(text)
    ? { status: 'failed' as const, finding: 'active-content' as const }
    : { status: 'passed' as const, finding: null });
  return { text, files: files.length, pages, rawActive };
}
const emitted: Readonly<Record<string, string>> = Object.freeze({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' });
function encodeFive(original: string, maximum: number): string {
  if (original.length > CEILING) refuse('limits');
  let predicted = Buffer.byteLength(original);
  for (const c of original) { const token = emitted[c]; if (token !== undefined) predicted += token.length - 1; if (predicted > maximum) refuse('limits'); }
  return original.replace(/[&<>"']/gu, c => emitted[c]!);
}
/** Independent parser: exactly one token is consumed at each ampersand. This
 * deliberately shares no replacement table or decoding library with encodeFive. */
function inverseFive(payload: string): string {
  if (payload.length > CEILING) refuse('limits');
  const chunks: string[] = [];
  const special = /[&<>"']/gu;
  let offset = 0;
  for (let match = special.exec(payload); match !== null; match = special.exec(payload)) {
    let i = match.index;
    chunks.push(payload.slice(offset, i));
    if (match[0] !== '&') refuse('encoding');
    if (payload.startsWith('&amp;', i)) { chunks.push('&'); i += 5; }
    else if (payload.startsWith('&lt;', i)) { chunks.push('<'); i += 4; }
    else if (payload.startsWith('&gt;', i)) { chunks.push('>'); i += 4; }
    else if (payload.startsWith('&quot;', i)) { chunks.push('"'); i += 6; }
    else if (payload.startsWith('&#39;', i)) { chunks.push("'"); i += 5; }
    else refuse('encoding');
    offset = i;
    special.lastIndex = i;
  }
  chunks.push(payload.slice(offset));
  return chunks.join('');
}
/** Predict JSON string escaping before asking the canonical encoder to allocate. */
function quotedBytes(text: string): number {
  let bytes = Buffer.byteLength(text) + 2;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c === 34 || c === 92 || c === 8 || c === 9 || c === 10 || c === 12 || c === 13) bytes++;
    else if (c < 32) bytes += 5;
  }
  return bytes;
}
function checkedEnvelope(text: string, value: unknown, limits: UrlDesignViewLimits): Envelope {
  // Canonical key order follows encodeCanonicalJson, not insertion order.
  if (!isRecord(value) || !keys(value, ['encoding', 'format', 'originalBytes', 'originalSha256', 'payload', 'payloadBytes', 'payloadSha256'])
    || value['format'] !== URL_DESIGN_VIEW_FORMAT || value['encoding'] !== URL_DESIGN_VIEW_ENCODING
    || !hash(value['originalSha256']) || !Number.isSafeInteger(value['originalBytes'])
    || Number(value['originalBytes']) < 1 || Number(value['originalBytes']) > limits.originalBytes
    || !hash(value['payloadSha256']) || typeof value['payload'] !== 'string' || !Number.isSafeInteger(value['payloadBytes'])
    || (value['payloadBytes'] as number) < 0 || (value['payloadBytes'] as number) > limits.payloadBytes
    || Buffer.byteLength(value['payload']) !== value['payloadBytes'] || sha256(value['payload']) !== value['payloadSha256']
    || canonical(value, limits) !== text) refuse('envelope');
  return value as unknown as Envelope;
}

/** Check canonical inert transport bytes without an inverse transform. */
export function inspectUrlDesignEnvelope(text: string): Envelope {
  return checkedEnvelope(text, parse(text, CEILING, CEILINGS), CEILINGS);
}

/** Reconstruct the registered view only for transient host-side secret
 * projections. A matching envelope never constitutes a producer receipt. */
export function inspectUrlDesignSecretContribution<T>(text: string, runId: string,
  visit: (view: Envelope, original: string, fields: Record<string, unknown>) => T): T {
  const view = inspectUrlDesignEnvelope(text);
  const original = inverseFive(view.payload);
  if (Buffer.byteLength(original) !== view.originalBytes || sha256(original) !== view.originalSha256
    || original.startsWith('\ufeff') || /[\u0000\uD800-\uDFFF]/u.test(original)) refuse('round-trip');
  const fields = parse(original, CEILING, CEILINGS);
  if (!isRecord(fields) || fields['format'] !== 'polaris-dossier-design-packet/1'
    || fields['kind'] !== 'design' || fields['runId'] !== runId) refuse('packet');
  return visit(view, original, fields);
}

function checkedView(text: string, parsed: unknown, input: UrlDesignViewInput, original: Original, limits: UrlDesignViewLimits): ValidatedUrlDesignView {
  const value = checkedEnvelope(text, parsed, limits);
  if (value.originalSha256 !== input.expected.sha256 || value.originalBytes !== input.expected.bytes) refuse('envelope');
  const reconstructed = inverseFive(value.payload);
  if (!Buffer.from(reconstructed).equals(Buffer.from(input.original)) || encodeFive(original.text, limits.payloadBytes) !== value['payload']) refuse('round-trip');
  screenPopulation(text, value, input.screen, limits, true);
  return Object.freeze({ kind: 'validated-representation-data-only' as const, bytes: Buffer.from(text), sha256: sha256(text), byteLength: Buffer.byteLength(text),
    originalSha256: input.expected.sha256, originalBytes: input.expected.bytes, payloadSha256: value['payloadSha256'], payloadBytes: value['payloadBytes'] as number,
    files: original.files, pages: original.pages, rawActive: original.rawActive, limits });
}
function encodeEnvelope(input: UrlDesignViewInput, original: Original, limits: UrlDesignViewLimits): string {
  const payload = encodeFive(original.text, limits.payloadBytes);
  const value: Envelope = { format: URL_DESIGN_VIEW_FORMAT, encoding: URL_DESIGN_VIEW_ENCODING, originalSha256: input.expected.sha256,
    originalBytes: input.expected.bytes, payloadSha256: sha256(payload), payloadBytes: Buffer.byteLength(payload), payload };
  if (Buffer.byteLength(canonical({ ...value, payload: '' }, limits)) + quotedBytes(payload) - 2 > limits.envelopeBytes) refuse('limits');
  return canonical(value, limits);
}
export function createUrlDesignView(input: UrlDesignViewInput): ValidatedUrlDesignView {
  const limits = limitsOf(input.limits), original = originalOf(input, limits);
  const text = encodeEnvelope(input, original, limits);
  return checkedView(text, parse(text, limits.envelopeBytes, limits), input, original, limits);
}

/** Keep the complete codec checks on the same captured subject while the host
 * services resource polls. An expired render lease cannot release a view. */
export async function createUrlDesignViewWithPolling(input: UrlDesignViewInput,
  leaseCurrent: () => boolean, waitForCheck: () => Promise<void> = yieldToPoll): Promise<ValidatedUrlDesignView | null> {
  if (!leaseCurrent()) return null;
  const limits = limitsOf(input.limits), bytes = input.original;
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0 || bytes.byteLength > limits.originalBytes) refuse('limits');
  const subject = { original: Uint8Array.from(bytes), expected: { ...input.expected }, screen: { ...input.screen } };
  await waitForCheck();
  if (!leaseCurrent()) return null;
  const original = originalOf(subject, limits);
  await waitForCheck();
  if (!leaseCurrent()) return null;
  const text = encodeEnvelope(subject, original, limits);
  await waitForCheck();
  if (!leaseCurrent()) return null;
  const view = checkedView(text, parse(text, limits.envelopeBytes, limits), subject, original, limits);
  return leaseCurrent() ? view : null;
}

export function verifyUrlDesignView(input: UrlDesignViewInput & { readonly view: Uint8Array }): ValidatedUrlDesignView {
  const limits = limitsOf(input.limits), original = originalOf(input, limits), text = decode(input.view, limits.envelopeBytes);
  return checkedView(text, parse(text, limits.envelopeBytes, limits), input, original, limits);
}
