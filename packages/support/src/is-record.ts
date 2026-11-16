/**
 * True for a non-null object that is not an array: the test every reader of parsed JSON, a recorded file or a
 * `Record<string, unknown>` makes before it reads a key. It tests the type only. A class instance, a boxed primitive, a
 * `Map` and an object with no prototype all pass, as does a proxy of an object; a revoked proxy of an object or an array
 * throws, as `Array.isArray` does. A caller that must also refuse a non-plain object checks the prototype itself.
 */
export function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
