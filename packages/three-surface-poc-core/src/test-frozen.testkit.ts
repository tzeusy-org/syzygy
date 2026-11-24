// Test support: only this package's tests call it (model.test.ts, body-read-authority.test.ts and
// test-frozen.test.ts), and the package barrel does not export it.

/**
 * Every object reachable from `value` through own enumerable properties, and the path of each one that is not frozen.
 * Unlike `deepFreeze`, the walk does not stop at a frozen shell, so an unfrozen member below one is found. `visited`
 * is the denominator: a census over an object that was never walked reports no unfrozen path and a `visited` of 0.
 * Typed-array views are skipped (a non-empty one cannot be frozen).
 */
export function frozenCensus(value: unknown): { readonly visited: number; readonly unfrozen: readonly string[] } {
  const seen = new Set<object>();
  const unfrozen: string[] = [];
  const walk = (node: unknown, path: string): void => {
    if (node === null || typeof node !== 'object' || ArrayBuffer.isView(node) || seen.has(node)) return;
    seen.add(node);
    if (!Object.isFrozen(node)) unfrozen.push(path);
    for (const [key, member] of Object.entries(node)) walk(member, `${path}.${key}`);
  };
  walk(value, '$');
  return { visited: seen.size, unfrozen };
}
