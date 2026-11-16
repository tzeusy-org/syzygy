import { types } from 'node:util';
import { sha256 } from '@syzygy/support';

export const CANONICAL_JSON_ENCODING = 'polaris-json-v1' as const;

export interface CanonicalJsonLimits {
  readonly maxBytes: number;
  readonly maxNodes: number;
  /** Root is depth zero. The implementation supports at most 256 levels. */
  readonly maxDepth: number;
}

export type CanonicalJsonFailure =
  | 'invalid-limits'
  | 'unsupported-value'
  | 'unsupported-object'
  | 'unsupported-property'
  | 'cycle'
  | 'byte-limit'
  | 'node-limit'
  | 'depth-limit';

/** Diagnostics deliberately contain no source values or property names. */
export class CanonicalJsonError extends Error {
  constructor(readonly code: CanonicalJsonFailure) {
    super(`Canonical JSON rejected: ${code}`);
    this.name = 'CanonicalJsonError';
  }
}

/**
 * Encodes JSON data, not a parsed/authorized generator record. Objects have sorted
 * UTF-16 keys; arrays retain order; ECMAScript JSON primitive spelling is used.
 * No normalization, toJSON call, getters, or source identity interpretation occurs. Not the PWB encoder (canonicalJson): the two differ on purpose (docs/evidence/syzygy-bpyt-6-3/dc3-decode-and-canonical-json-2026-10-25.json).
 */
export function encodeCanonicalJson(value: unknown, limits: CanonicalJsonLimits): string {
  if (![limits.maxBytes, limits.maxNodes].every((n) => Number.isSafeInteger(n) && n > 0)
    || !Number.isSafeInteger(limits.maxDepth) || limits.maxDepth < 0 || limits.maxDepth > 256) {
    throw new CanonicalJsonError('invalid-limits');
  }
  const chunks: string[] = [];
  const ancestors = new Set<object>();
  let bytes = 0;
  let nodes = 0;
  const reject = (code: CanonicalJsonFailure): never => { throw new CanonicalJsonError(code); };
  const append = (text: string): void => {
    bytes += Buffer.byteLength(text, 'utf8');
    if (bytes > limits.maxBytes) reject('byte-limit');
    chunks.push(text);
  };
  const quoted = (text: string): void => {
    if (text.length > limits.maxBytes - bytes) reject('byte-limit');
    append(JSON.stringify(text));
  };
  const visit = (item: unknown, depth: number): void => {
    if (depth > limits.maxDepth) reject('depth-limit');
    if (++nodes > limits.maxNodes) reject('node-limit');
    if (item === null) { append('null'); return; }
    if (typeof item === 'string') { quoted(item); return; }
    if (typeof item === 'boolean') { append(String(item)); return; }
    if (typeof item === 'number') {
      if (!Number.isFinite(item)) reject('unsupported-value');
      append(JSON.stringify(item));
      return;
    }
    if (typeof item !== 'object') reject('unsupported-value');
    const object = item as object;
    if (types.isProxy(object)) reject('unsupported-object');
    const array = Array.isArray(object);
    const prototype: unknown = Object.getPrototypeOf(object);
    if (array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) {
      reject('unsupported-object');
    }
    if (ancestors.has(object)) reject('cycle');
    ancestors.add(object);
    const keys = Reflect.ownKeys(object);
    if (array) {
      const length = (object as unknown[]).length;
      if (length > limits.maxNodes - nodes) reject('node-limit');
      if (keys.length !== length + 1) reject('unsupported-property');
      const descriptors = Object.getOwnPropertyDescriptors(object);
      append('[');
      for (let index = 0; index < length; index++) {
        const property = descriptors[String(index)];
        if (!property || !('value' in property) || !property.enumerable) reject('unsupported-property');
        if (index) append(',');
        visit(property!.value, depth + 1);
      }
      append(']');
    } else {
      if (keys.length > limits.maxNodes - nodes) reject('node-limit');
      const descriptors = Object.getOwnPropertyDescriptors(object);
      for (const key of keys) {
        if (typeof key !== 'string' || ['__proto__', 'prototype', 'constructor'].includes(key)) {
          reject('unsupported-property');
        }
        const property = descriptors[key as string]!;
        if (!('value' in property) || !property.enumerable) reject('unsupported-property');
      }
      append('{');
      const sorted = (keys as string[]).sort();
      sorted.forEach((key, index) => {
        if (index) append(',');
        quoted(key);
        append(':');
        visit(descriptors[key]!.value, depth + 1);
      });
      append('}');
    }
    ancestors.delete(object);
  };
  visit(value, 0);
  return chunks.join('');
}

/** Exact UTF-8 content digest; does not confer validation, fidelity or adoption. */
export function digestCanonicalJson(value: unknown, limits: CanonicalJsonLimits): {
  readonly encoding: typeof CANONICAL_JSON_ENCODING;
  readonly algorithm: 'sha256';
  readonly digest: string;
} {
  return {
    encoding: CANONICAL_JSON_ENCODING,
    algorithm: 'sha256',
    digest: sha256(encodeCanonicalJson(value, limits)),
  };
}
