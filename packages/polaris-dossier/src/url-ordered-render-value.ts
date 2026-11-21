import { isDeepStrictEqual } from 'node:util';

/** The bounded JSON parser creates null-prototype records. Preserve them in
 * the snapshot so strict comparisons still check the exact input shape. */
export function copyOrderedRenderValue<T>(value: T): T {
  const cloned = structuredClone(value);
  const visited = new WeakSet<object>();
  function preserve(source: unknown, target: unknown): void {
    if (source === null || target === null || typeof source !== 'object' || typeof target !== 'object' || visited.has(source)) return;
    visited.add(source);
    if (Object.getPrototypeOf(source) === null) Object.setPrototypeOf(target, null);
    if (source instanceof Map && target instanceof Map) {
      const entries = target.entries();
      for (const [key, item] of source) {
        const next = entries.next();
        if (next.done) break;
        preserve(key, next.value[0]);
        preserve(item, next.value[1]);
      }
    } else if (source instanceof Set && target instanceof Set) {
      const values = target.values();
      for (const item of source) preserve(item, values.next().value);
    } else if (!ArrayBuffer.isView(source)) {
      for (const key of Object.keys(source)) preserve(Reflect.get(source, key), Reflect.get(target, key));
    }
  }
  preserve(value, cloned);
  return cloned;
}

/** Compare independent local renderer values without discarding collection
 * order. Native deep equality alone treats Maps and Sets as unordered. */
export function equalOrderedRenderValue(left: unknown, right: unknown): boolean {
  const visited = new WeakMap<object, WeakSet<object>>();
  function equal(a: unknown, b: unknown): boolean {
    return isDeepStrictEqual(a, b) && ordered(a, b);
  }
  function ordered(a: unknown, b: unknown): boolean {
    if (a === b || a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return true;
    let paired = visited.get(a);
    if (paired?.has(b)) return true;
    if (paired === undefined) { paired = new WeakSet(); visited.set(a, paired); }
    paired.add(b);
    if (a instanceof Map && b instanceof Map) {
      const expected = b.entries();
      for (const [key, value] of a) {
        const entry = expected.next();
        if (entry.done || !equal(key, entry.value[0]) || !equal(value, entry.value[1])) return false;
      }
    } else if (a instanceof Set && b instanceof Set) {
      const expected = b.values();
      for (const value of a) {
        const item = expected.next();
        if (item.done || !equal(value, item.value)) return false;
      }
    }
    const keys = Reflect.ownKeys(b);
    return Reflect.ownKeys(a).every((key, index) => key === keys[index]
      && ordered(Reflect.get(a, key), Reflect.get(b, key)));
  }
  return equal(left, right);
}
