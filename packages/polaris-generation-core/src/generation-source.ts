import { createHash, createHmac, randomBytes } from 'node:crypto';
import { sha256 } from '@syzygy/support';

import { SOURCE_ID_MAX_LENGTH, SOURCE_ID_PATTERN, SOURCE_TEXT_MAX_LENGTH } from './source-model.js';
import { bodyLines, redactionMarker } from './secret-redaction.js';

/** In-process capabilities only: JSON cannot mint either trust marker. No key, persistence or caller-provided boolean is involved. */
const verifiedProjections = new WeakSet<object>();
const verifiedRedactedSources = new WeakSet<object>();

/** A screened projection of an original Git blob. This is transport metadata, never an assertion that the projected body hashes to
 * the original object. The gated producer verifies the original object and screens it; a pipeline consumer must re-read and re-screen
 * it through `verifySources` and compare the resulting population before use. No withheld-line digest is carried. */
export interface SourceRedaction {
  readonly redactionClass: 'redacted-span';
  readonly withheldLines: number;
  readonly withheld: readonly number[];
  readonly originalLines: number;
  readonly originalBytes: number;
  readonly contentSha256: string;
  readonly retainedSha256: string;
  readonly policySha256: string;
}
export interface GenerationSpan {
  readonly anchorId: string;
  /** Byte offsets into this source's safe body. A redacted span separately names its original Git coordinates. */
  readonly start: number;
  readonly end: number;
  readonly text: string;
  readonly original?: { readonly start: number; readonly startLine: number; readonly endLine: number };
}

/** A project-neutral, evaluation-bound Git observation, including material
 * that was counted but cannot be quoted. Offsets are UTF-8 byte offsets. */
export interface GenerationSource {
  readonly sourceId: string;
  readonly repositoryId: string;
  readonly revision: string;
  readonly path: string;
  /** Null only when the named tree entry is missing or is not a blob. */
  readonly objectId: string | null;
  readonly evaluationId: string;
  readonly classificationBasis: 'body' | 'path-only';
  readonly redaction?: SourceRedaction;
  /** Present only on one contiguous piece of a blob too long to quote whole.
   * `start`/`end` are UTF-8 byte offsets into the full blob; `body` and span
   * offsets are relative to the piece, anchors use the blob offsets. For redacted
   * sources the segment covers the safe marker projection; every evidence span
   * separately carries its original Git coordinates. */
  readonly segment?: { readonly index: number; readonly count: number; readonly start: number; readonly end: number; readonly blobBytes: number };
  readonly exclusion: { readonly excluded: false } | { readonly excluded: true; readonly reason: GenerationExclusionReason };
  /** Present only for an admitted body. Never sent to a provider except in
   * the inventory envelope or a later explicitly cited span. */
  readonly body?: string;
  readonly spans: readonly GenerationSpan[];
}

export type GenerationSourceFailure =
  | 'invalid-source' | 'duplicate-source' | 'duplicate-anchor' | 'invalid-anchor'
  | 'unquotable-source' | 'body-mismatch' | 'object-mismatch' | 'source-too-long' | 'invalid-segments';

const DEFERRED_BY_BUDGET_REASON = 'deferred-by-budget';

export class GenerationSourceError extends Error {
  constructor(readonly code: GenerationSourceFailure) {
    super(`Generation source rejected: ${code}`);
    this.name = 'GenerationSourceError';
  }
}

function fail(code: GenerationSourceFailure): never { throw new GenerationSourceError(code); }
const handle = new RegExp(SOURCE_ID_PATTERN, 'u');

/** An excluded row's id is `s-` plus 24 hex digits; the shape is checked here, the keying belongs to the emitter. */
const OPAQUE_SOURCE_ID = /^s-[0-9a-f]{24}$/u;

/** A fresh 32-byte key for one run. It keys excluded-source ids only and is
 * never serialised or logged, so those ids cannot be confirmed from a path list
 * and differ between runs. */
export const newGenerationRunKey = (): Buffer => randomBytes(32);

/** Below this a key is guessable, and an empty key makes every keyed id derivable from the path alone. */
const GENERATION_RUN_KEY_MIN_BYTES = 32;

/** HMAC-SHA256 of an identity input under the run key, as lowercase hex. Refuses a key shorter than 32 bytes. */
export const keyedDigest = (runKey: Uint8Array, input: string): string => {
  if (!(runKey instanceof Uint8Array) || runKey.byteLength < GENERATION_RUN_KEY_MIN_BYTES) throw new Error('generation run key shorter than 32 bytes');
  return createHmac('sha256', runKey).update(input).digest('hex');
};

/** `s-` plus 24 hex digits of the keyed digest: stable within a key, opaque across keys. */
export const excludedSourceId = (runKey: Uint8Array, input: string): string => `s-${keyedDigest(runKey, input).slice(0, 24)}`;

export const GENERATION_EXCLUSION_REASONS = [
  'oversize-source-excluded',
  'body-not-retained-for-generation',
  'deferred-by-budget',
  'empty-file',
  'binary-or-non-utf8',
  'denied-path',
  'resource-limit',
  'contains-nul',
  'not-utf-8',
  'active-content',
  'unknown-extraction-class',
  'parse-failure',
  'secret-detector-match',
  'not-in-manifest',
  'missing-at-revision',
  'not-a-regular-blob',
  'not-in-tree',
  'path-escapes-repository',
  'path-not-normalized',
  'object-id-mismatch',
  'git-read-failed',
  'unclassified-exclusion',
] as const;
/** The closed set above; `validateGenerationSources` refuses any other reason. */
export type GenerationExclusionReason = typeof GENERATION_EXCLUSION_REASONS[number];

export const isGenerationExclusionReason = (value: unknown): value is GenerationExclusionReason =>
  typeof value === 'string' && (GENERATION_EXCLUSION_REASONS as readonly string[]).includes(value);
const hexObjectId = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;

export function generationSourceIdentity(source: Pick<GenerationSource, 'repositoryId' | 'revision' | 'path'> & { readonly objectId: string }): string {
  return `${source.repositoryId}@${source.revision}:${source.path}#${source.objectId}`;
}

export function generationAnchorId(source: Pick<GenerationSource, 'repositoryId' | 'revision' | 'path'> & { readonly objectId: string }, start: number, end: number): string {
  return `${generationSourceIdentity(source)}:${start}-${end}`;
}

export function gitBlobObjectId(body: string, algorithm: 'sha1' | 'sha256' = 'sha1'): string {
  const bytes = Buffer.from(body, 'utf8');
  return createHash(algorithm).update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}

/** Validates fidelity-bearing sources. A redacted transport record must first be reconstructed by a gated original-object read/screen. */
export function validateGenerationSources(value: readonly GenerationSource[]): readonly GenerationSource[] {
  return validateSources(value, true);
}

/** Structural validation for a frozen request before fresh exact-source verification. This grants no quotation/evaluation authority. */
export function validateGenerationSourceTransport(value: readonly GenerationSource[]): readonly GenerationSource[] {
  return validateSources(value, false);
}

function validateSources(value: readonly GenerationSource[], requireVerified: boolean): readonly GenerationSource[] {
  if (value.length === 0) fail('invalid-source');
  const sourceKeys = new Set(['sourceId', 'repositoryId', 'revision', 'path', 'objectId', 'evaluationId', 'classificationBasis', 'segment', 'redaction', 'exclusion', 'body', 'spans']);
  const spanKeys = new Set(['anchorId', 'start', 'end', 'text', 'original']);
  const sourceIds = new Set<string>();
  const identities = new Set<string>();
  const anchorIds = new Set<string>();
  const blobs = new Map<string, { whole: boolean; deferred: boolean; pieces: { index: number; count: number; start: number; end: number; blobBytes: number }[];
    redaction?: SourceRedaction; bodies: { index: number; body: string }[] }>();
  for (const source of value) {
    if (source === null || typeof source !== 'object' || Object.keys(source).some(key => !sourceKeys.has(key))
      || (Object.hasOwn(source, 'body') && source.body === undefined)
      || source.exclusion === null || typeof source.exclusion !== 'object'
      || Object.keys(source.exclusion).some(key => !['excluded', 'reason'].includes(key))
      || (source.exclusion.excluded === false && Object.hasOwn(source.exclusion, 'reason'))) fail('invalid-source');
    if (!handle.test(source.sourceId) || source.sourceId.length > SOURCE_ID_MAX_LENGTH
      // Every 046 identity ('.' included) and the github:<owner>:<repo> form, compared exactly (R-PDJA-33-RULINGS-2 finding 1).
      || !/^[A-Za-z0-9:._-]+$/u.test(source.repositoryId) || !source.evaluationId || !/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u.test(source.revision)
      || (source.objectId !== null && !hexObjectId.test(source.objectId)) || source.path.startsWith('/')
      || source.path.split('/').some(part => part === '' || part === '.' || part === '..') || source.path.includes('\0')
      || source.path.includes('\\') || !['body', 'path-only'].includes(source.classificationBasis)
      || typeof source.exclusion?.excluded !== 'boolean' || !Array.isArray(source.spans)) fail('invalid-source');
    const segment = source.segment;
    const redaction = source.redaction;
    if (redaction !== undefined && requireVerified && !verifiedRedactedSources.has(source)) fail('object-mismatch');
    if (redaction !== undefined && (redaction === null || typeof redaction !== 'object'
      || Object.keys(redaction).sort().join(',') !== 'contentSha256,originalBytes,originalLines,policySha256,redactionClass,retainedSha256,withheld,withheldLines'
      || redaction.redactionClass !== 'redacted-span' || !Number.isSafeInteger(redaction.withheldLines) || redaction.withheldLines < 1
      || !Number.isSafeInteger(redaction.originalLines) || redaction.originalLines < redaction.withheldLines
      || !Number.isSafeInteger(redaction.originalBytes) || redaction.originalBytes < 1
      || ![redaction.contentSha256, redaction.retainedSha256, redaction.policySha256].every(hash => typeof hash === 'string' && /^[0-9a-f]{64}$/u.test(hash))
      || !Array.isArray(redaction.withheld) || redaction.withheld.length !== redaction.withheldLines
      || redaction.withheld.some((line, i) => !Number.isSafeInteger(line) || line < 1 || line > redaction.originalLines || (i > 0 && line <= redaction.withheld[i - 1]!))
      || source.objectId === null || source.classificationBasis !== 'body')) fail('invalid-source');
    if (segment !== undefined && (segment === null || typeof segment !== 'object'
      || Object.keys(segment).length !== 5 || ['index', 'count', 'start', 'end', 'blobBytes'].some(key => !Number.isSafeInteger((segment as Record<string, unknown>)[key]))
      || segment.count < 2 || segment.index < 0 || segment.index >= segment.count || segment.start < 0 || segment.end <= segment.start
      || source.objectId === null || source.exclusion.excluded || source.classificationBasis !== 'body')) fail('invalid-source');
    const blobIdentity = source.objectId === null
      ? `${source.repositoryId}@${source.revision}:${source.path}#unavailable`
      : generationSourceIdentity({ ...source, objectId: source.objectId });
    const identity = segment === undefined ? blobIdentity : `${blobIdentity}[${segment.start}-${segment.end}]`;
    const blob = blobs.get(blobIdentity) ?? { whole: false, deferred: false, pieces: [], bodies: [], ...(redaction === undefined ? {} : { redaction }) };
    if ((blob.redaction === undefined) !== (redaction === undefined) || (redaction !== undefined && blob.redaction !== undefined
      && (Object.keys(redaction) as (keyof SourceRedaction)[]).some(key => JSON.stringify(blob.redaction![key]) !== JSON.stringify(redaction[key])))) fail('invalid-source');
    // A deferred-by-budget row for a blob that also has pieces marks the rest of that blob as not read; any other unsegmented row for it is a whole copy.
    if (segment !== undefined) blob.pieces.push(segment);
    else if (source.exclusion.excluded && source.exclusion.reason === DEFERRED_BY_BUDGET_REASON) blob.deferred = true;
    else blob.whole = true;
    blobs.set(blobIdentity, blob);
    if (sourceIds.has(source.sourceId) || identities.has(identity)) fail('duplicate-source');
    sourceIds.add(source.sourceId);
    identities.add(identity);
    if (source.objectId === null && !source.exclusion.excluded) fail('invalid-source');
    if (source.classificationBasis === 'path-only' || source.exclusion.excluded) {
      if (source.body !== undefined || source.spans.length !== 0) fail('unquotable-source');
      if (source.exclusion.excluded && (!isGenerationExclusionReason(source.exclusion.reason) || !OPAQUE_SOURCE_ID.test(source.sourceId))) fail('invalid-source');
      continue;
    }
    if (source.body === undefined && source.spans.length === 0) continue;
    const objectId = source.objectId;
    if (objectId === null) throw new GenerationSourceError('invalid-source');
    const body = source.body ?? (source.spans.length === 1 && source.spans[0]?.start === 0 ? source.spans[0].text : undefined);
    if (body === undefined) throw new GenerationSourceError('unquotable-source');
    const bytes = Buffer.from(body, 'utf8');
    if ([...body].length > SOURCE_TEXT_MAX_LENGTH) fail('source-too-long');
    // A piece cannot hash to its blob; its contiguity is checked below and the
    // reader (and verifySources) bind the whole blob.
    if (segment !== undefined) { if (bytes.length !== segment.end - segment.start) fail('body-mismatch'); }
    else if (redaction !== undefined) {
      if (sha256(body) !== redaction.retainedSha256) fail('body-mismatch');
    } else if (gitBlobObjectId(body, objectId.length === 40 ? 'sha1' : 'sha256') !== objectId) fail('object-mismatch');
    if (redaction !== undefined) blob.bodies.push({ index: segment?.index ?? 0, body });
    const anchorBase = segment?.start ?? 0;
    for (const span of source.spans) {
      if (span === null || typeof span !== 'object' || Object.keys(span).some(key => !spanKeys.has(key))
        || typeof span.anchorId !== 'string' || typeof span.text !== 'string') fail('invalid-anchor');
      if (!Number.isSafeInteger(span.start) || !Number.isSafeInteger(span.end)
        || span.start < 0 || span.end <= span.start || span.end > bytes.length) fail('invalid-anchor');
      const slice = bytes.subarray(span.start, span.end);
      let decoded: string;
      try { decoded = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(slice); }
      catch { throw new GenerationSourceError('invalid-anchor'); }
      if (decoded !== span.text) fail('body-mismatch');
      const original = span.original;
      if (redaction === undefined ? original !== undefined : original === undefined || original === null || typeof original !== 'object'
        || Object.keys(original).sort().join(',') !== 'endLine,start,startLine'
        || !Number.isSafeInteger(original.start) || original.start < 0 || original.start + slice.length > redaction.originalBytes
        || !Number.isSafeInteger(original.startLine) || !Number.isSafeInteger(original.endLine) || original.startLine < 1 || original.endLine < original.startLine
        || original.endLine > redaction.originalLines || redaction.withheld.some(line => line >= original.startLine && line <= original.endLine)) fail('invalid-anchor');
      const originalStart = original?.start ?? anchorBase + span.start;
      if (span.anchorId !== generationAnchorId({ ...source, objectId }, originalStart, originalStart + slice.length)) fail('invalid-anchor');
      if (anchorIds.has(span.anchorId)) fail('duplicate-anchor');
      anchorIds.add(span.anchorId);
    }
  }
  for (const blob of blobs.values()) {
    if (blob.pieces.length === 0) continue;
    const pieces = [...blob.pieces].sort((a, b) => a.index - b.index);
    // The pieces run contiguously from the first. The last piece must reach the
    // blob's declared size, so a consistently truncated tail cannot validate; the
    // one exception is a prefix (fewer pieces than the declared count) that a
    // deferred-by-budget row for the same blob accounts for.
    const complete = pieces.length === pieces[0]!.count && pieces.at(-1)!.end === pieces[0]!.blobBytes;
    if (blob.whole || pieces.some((piece, i) => piece.index !== i || piece.count !== pieces[0]!.count || piece.blobBytes !== pieces[0]!.blobBytes
      || piece.start !== (i === 0 ? 0 : pieces[i - 1]!.end)) || (complete ? blob.deferred : !blob.deferred || pieces.length >= pieces[0]!.count)) fail('invalid-segments');
    if (complete && blob.redaction !== undefined
      && sha256(blob.bodies.sort((a, b) => a.index - b.index).map(piece => piece.body).join('')) !== blob.redaction.retainedSha256) fail('body-mismatch');
  }
  return value;
}

export interface BodyPiece { readonly start: number; readonly end: number; readonly text: string }

/** Splits an over-long body into pieces of at most `maxChars` characters,
 * preferring the last line break in the final fifth of a piece and never
 * cutting inside a code point. Offsets are UTF-8 bytes into `body`. */
export function segmentBody(body: string, maxChars: number = SOURCE_TEXT_MAX_LENGTH): readonly BodyPiece[] {
  if (!Number.isSafeInteger(maxChars) || maxChars < 1) throw new GenerationSourceError('invalid-source');
  const chars = [...body];
  const pieces: BodyPiece[] = [];
  let at = 0, byte = 0;
  while (at < chars.length) {
    let stop = Math.min(chars.length, at + maxChars);
    if (stop < chars.length) {
      for (let i = stop; i > at + Math.floor(maxChars * 0.8); i--) if (chars[i - 1] === '\n') { stop = i; break; }
    }
    const text = chars.slice(at, stop).join('');
    const length = Buffer.byteLength(text, 'utf8');
    pieces.push({ start: byte, end: byte + length, text });
    byte += length;
    at = stop;
  }
  return pieces;
}

export interface BodySourceInput {
  readonly sourceId: string;
  readonly repositoryId: string;
  readonly revision: string;
  readonly path: string;
  readonly objectId: string;
  readonly evaluationId: string;
  readonly body: string;
  /** What to do with a body over the quotable limit; default `split`. */
  readonly oversize?: 'split' | 'exclude';
}

/** One verified blob body as sources: whole when it fits, otherwise
 * contiguous pieces (`<sourceId>-p1`...) or one excluded row with a reason.
 * The caller has already checked the body against `objectId`. */
export function generationSourcesForBody(input: BodySourceInput): readonly GenerationSource[] {
  const { body, sourceId, oversize = 'split', ...base } = input;
  const bytes = Buffer.byteLength(body, 'utf8');
  if ([...body].length <= SOURCE_TEXT_MAX_LENGTH) {
    return [{ ...base, sourceId, classificationBasis: 'body', exclusion: { excluded: false }, body,
      spans: [{ anchorId: generationAnchorId(base, 0, bytes), start: 0, end: bytes, text: body }] }];
  }
  if (oversize === 'exclude') {
    return [{ ...base, sourceId, classificationBasis: 'body', exclusion: { excluded: true, reason: 'oversize-source-excluded' }, spans: [] }];
  }
  const pieces = segmentBody(body);
  return pieces.map((piece, index) => ({ ...base, sourceId: `${sourceId}-p${index + 1}`, classificationBasis: 'body' as const,
    segment: { index, count: pieces.length, start: piece.start, end: piece.end, blobBytes: bytes }, exclusion: { excluded: false as const }, body: piece.text,
    spans: [{ anchorId: generationAnchorId(base, piece.start, piece.end), start: 0, end: piece.end - piece.start, text: piece.text }] }));
}

/** Safe retained output produced only after this constructor re-hashes the original Git body and invokes the gated screen. */
export interface VerifiedRedactedBody {
  readonly objectId: string;
  readonly retainedLines: readonly string[];
  readonly withheld: readonly number[];
  readonly lineByteOffsets: readonly number[];
  readonly originalBytes: number;
  readonly contentSha256: string;
}
export type RedactedBodyScreen = (body: string, repositoryPath: string) => { readonly kind: 'clean' | 'admitted' | 'excluded' } | {
  readonly kind: 'redacted'; readonly retainedLines: readonly string[]; readonly withheld: readonly number[];
  readonly lineByteOffsets: readonly number[]; readonly originalBytes: number; readonly contentSha256: string;
};

/** `screen` is the policy-act-checked screen capability supplied by the producer, never a JSON field. The raw body is transient and
 * is not retained in the projection. Even a producer cannot accidentally attach a different original Git identity to these bytes. */
export function verifiedRedactedBody(body: string, objectId: string, repositoryPath: string, screen: RedactedBodyScreen): VerifiedRedactedBody {
  if (!hexObjectId.test(objectId) || gitBlobObjectId(body, objectId.length === 40 ? 'sha1' : 'sha256') !== objectId) fail('object-mismatch');
  const screened = screen(body, repositoryPath);
  if (screened.kind !== 'redacted' || !('retainedLines' in screened)) fail('unquotable-source');
  const lines = bodyLines(body), held = new Set(screened.withheld);
  let byte = 0;
  if (screened.originalBytes !== Buffer.byteLength(body) || screened.contentSha256 !== sha256(body)
    || screened.retainedLines.length !== lines.length || screened.lineByteOffsets.length !== lines.length
    || lines.some((line, index) => {
      const offset = byte; byte += Buffer.byteLength(line);
      const retained = held.has(index + 1) ? (/(?:\r\n|\r|\n)$/u.exec(line)?.[0] ?? '') : line;
      return screened.lineByteOffsets[index] !== offset || screened.retainedLines[index] !== retained;
    })) fail('body-mismatch');
  const projection: VerifiedRedactedBody = Object.freeze({ objectId, retainedLines: Object.freeze([...screened.retainedLines]),
    withheld: Object.freeze([...screened.withheld]), lineByteOffsets: Object.freeze([...screened.lineByteOffsets]),
    originalBytes: screened.originalBytes, contentSha256: screened.contentSha256 });
  verifiedProjections.add(projection);
  return projection;
}

export interface RedactedBodySourceInput extends Omit<BodySourceInput, 'body'> {
  readonly projection: VerifiedRedactedBody;
  readonly policySha256: string;
}

/** A verified, screened blob as a safe projection. Every withheld run becomes one marker, never an evidence span. Surviving spans keep
 * their exact original Git byte and line coordinates. Oversize pieces cover the safe projection contiguously; no marker is split.
 * These records still need exact-source revalidation at a consumer: their JSON metadata is not proof of the original object. */
export function generationSourcesForRedactedBody(input: RedactedBodySourceInput): readonly GenerationSource[] {
  const { projection, policySha256, sourceId, oversize = 'split', ...base } = input;
  if (!verifiedProjections.has(projection) || projection.objectId !== base.objectId) fail('object-mismatch');
  const { retainedLines, withheld, lineByteOffsets, originalBytes, contentSha256 } = projection;
  if (retainedLines.length !== lineByteOffsets.length) fail('invalid-source');
  const held = new Set(withheld), marker = redactionMarker(withheld.length);
  type SafeSpan = Omit<GenerationSpan, 'anchorId'>;
  const pieces: { body: string; spans: SafeSpan[] }[] = [];
  let body = '', chars = 0, spans: SafeSpan[] = [];
  const flush = (): void => { if (body !== '') { pieces.push({ body, spans }); body = ''; chars = 0; spans = []; } };
  const append = (text: string, original?: NonNullable<GenerationSpan['original']>): void => {
    const points = [...text];
    // Markers are atomic and shorter than the source bound.
    if (original === undefined && chars + points.length > SOURCE_TEXT_MAX_LENGTH) flush();
    let offset = 0, originalByte = original?.start ?? 0;
    while (offset < points.length) {
      const count = Math.min(points.length - offset, SOURCE_TEXT_MAX_LENGTH - chars);
      const part = points.slice(offset, offset + count).join(''), start = Buffer.byteLength(body), length = Buffer.byteLength(part);
      body += part; chars += count; offset += count;
      if (original !== undefined) {
        const last = spans.at(-1);
        if (last !== undefined && last.end === start && last.original!.start + Buffer.byteLength(last.text) === originalByte) {
          spans[spans.length - 1] = { start: last.start, end: start + length, text: last.text + part,
            original: { ...last.original!, endLine: original.endLine } };
        } else spans.push({ start, end: start + length, text: part, original: { ...original, start: originalByte } });
        originalByte += length;
      }
      if (chars === SOURCE_TEXT_MAX_LENGTH) flush();
    }
  };
  for (let i = 0; i < retainedLines.length; i++) {
    if (!held.has(i + 1)) { append(retainedLines[i]!, { start: lineByteOffsets[i]!, startLine: i + 1, endLine: i + 1 }); continue; }
    let last = i;
    while (last + 1 < retainedLines.length && held.has(last + 2)) last++;
    // A retained withheld line contains only its original terminator.
    if (retainedLines.slice(i, last + 1).some(line => !/^(?:\r\n|\r|\n)?$/u.test(line))) fail('invalid-source');
    append(marker + retainedLines[last]!);
    i = last;
  }
  flush();
  const safe = pieces.map(piece => piece.body).join(''), blobBytes = Buffer.byteLength(safe);
  const redaction: SourceRedaction = { redactionClass: 'redacted-span', withheldLines: withheld.length, withheld: [...withheld], originalLines: retainedLines.length,
    originalBytes, contentSha256, retainedSha256: sha256(safe), policySha256 };
  Object.freeze(redaction.withheld); Object.freeze(redaction);
  const trust = (source: GenerationSource): GenerationSource => {
    for (const span of source.spans) { if (span.original !== undefined) Object.freeze(span.original); Object.freeze(span); }
    Object.freeze(source.spans); Object.freeze(source.exclusion);
    if (source.segment !== undefined) Object.freeze(source.segment);
    Object.freeze(source); verifiedRedactedSources.add(source); return source;
  };
  if (pieces.length > 1 && oversize === 'exclude') return [trust({ ...base, sourceId, redaction, classificationBasis: 'body',
    exclusion: { excluded: true, reason: 'oversize-source-excluded' }, spans: [] })];
  let start = 0;
  return pieces.map((piece, index) => {
    const end = start + Buffer.byteLength(piece.body);
    const source: GenerationSource = { ...base, sourceId: pieces.length === 1 ? sourceId : `${sourceId}-p${index + 1}`, redaction,
      ...(pieces.length === 1 ? {} : { segment: { index, count: pieces.length, start, end, blobBytes } }), classificationBasis: 'body',
      exclusion: { excluded: false }, body: piece.body,
      spans: piece.spans.map(span => ({ ...span, anchorId: generationAnchorId(base, span.original!.start, span.original!.start + Buffer.byteLength(span.text)) })) };
    start = end;
    return trust(source);
  });
}

/** The original Git range a safe span supports, never the marker/projection offsets. */
export const generationSpanRange = (source: GenerationSource, span: GenerationSpan): readonly [number, number] => {
  if (source.redaction !== undefined && !verifiedRedactedSources.has(source)) fail('object-mismatch');
  const start = span.original?.start ?? (source.segment?.start ?? 0) + span.start;
  return [start, start + span.end - span.start];
};

/** Exact original bytes within one admitted contiguous span. A range crossing a withheld run has no text. */
export function generationSourceTextAt(source: GenerationSource, start: number, end: number): string | undefined {
  if (source.redaction !== undefined && !verifiedRedactedSources.has(source)) fail('object-mismatch');
  if (source.exclusion.excluded || end <= start) return undefined;
  if (source.redaction !== undefined) {
    const span = source.spans.find(candidate => { const range = generationSpanRange(source, candidate); return start >= range[0] && end <= range[1]; });
    if (span === undefined) return undefined;
    const base = generationSpanRange(source, span)[0];
    try { return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(Buffer.from(span.text).subarray(start - base, end - base)); } catch { return undefined; }
  }
  const body = source.body ?? (source.spans.length === 1 && source.spans[0]?.start === 0 ? source.spans[0].text : undefined);
  if (body === undefined) return undefined;
  const base = source.segment?.start ?? 0;
  if (start < base || end - base > Buffer.byteLength(body)) return undefined;
  try { return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(Buffer.from(body).subarray(start - base, end - base)); } catch { return undefined; }
}

/** Only quotable source text crosses the provider boundary. The population
 * count remains available separately, including excluded and path-only rows. */
export function quotableGenerationSources(sources: readonly GenerationSource[]): readonly { readonly sourceId: string; readonly text: string;
  readonly redaction?: { readonly redactionClass: 'redacted-span'; readonly withheldLines: number } }[] {
  validateGenerationSources(sources);
  return sources.flatMap(source => source.redaction !== undefined && !source.exclusion.excluded && source.spans.length > 0 && source.body !== undefined
    ? [{ sourceId: source.sourceId, text: source.body, redaction: { redactionClass: 'redacted-span' as const, withheldLines: source.redaction.withheldLines } }]
    : source.spans.length === 1 && source.spans[0]?.start === 0
    && source.spans[0]?.end === Buffer.byteLength(source.spans[0]?.text ?? '')
    ? [{ sourceId: source.sourceId, text: source.spans[0]!.text }] : []);
}
