import type { CheckFinding } from './check-model.js';
import { isHandle } from './finding-names.js';

/** Secret-shaped draft identities (syzygy-3efd.95). The identity form, a handle, admits a string a secret detector matches (a token is
 * letters, digits and an underscore), and an identity is rendered as an `id`, an anchor, a link and a `machine.json` member. So check
 * screens every handle-shaped string the submitted document holds, at any depth and under any member, with the screen that screens finding
 * details, and a match, or a case screening cannot decide, is a `schema` finding at that member's path with a fixed detail that names no
 * value: the document never passes check, and so never renders. Fail-closed by position: the sweep does not ask which members are
 * identities, so a member a later schema adds is screened without a change here; the denominator is every string of the document. */

/** The detail of the finding: fixed words, never the value. */
export const IDENTITY_WITHHELD_DETAIL = 'is withheld under source screening: a secret detector matches it, so it cannot be an identity; choose another';

/** The `schema` findings of every handle-shaped string of `doc` that `admit` does not admit, in the order a depth-first reading of the
 * document meets them (list entries in index order, an object's members in the order the document writes them). Each distinct value is
 * screened once. The reading keeps its own stack, so a deep document cannot exhaust the call stack. */
export function withheldIdentityFindings(doc: unknown, admit: (value: string) => 'admitted' | 'withheld' | 'unavailable'): { readonly findings: CheckFinding[]; readonly values: ReadonlySet<string> } {
  const seen = new Map<string, boolean>();
  const clear = (value: string): boolean => {
    let ok = seen.get(value);
    if (ok === undefined) {
      try { ok = admit(value) === 'admitted'; } catch { ok = false; }
      seen.set(value, ok);
    }
    return ok;
  };
  const out: CheckFinding[] = [];
  const values = new Set<string>();
  const stack: { readonly value: unknown; readonly at: string }[] = [{ value: doc, at: '$' }];
  while (stack.length > 0) {
    const { value, at } = stack.pop()!;
    if (typeof value === 'string') {
      if (isHandle(value) && !clear(value)) { out.push({ kind: 'schema', at, detail: IDENTITY_WITHHELD_DETAIL }); values.add(value); }
    } else if (Array.isArray(value)) {
      for (let i = value.length - 1; i >= 0; i--) stack.push({ value: value[i], at: `${at}[${i}]` });
    } else if (typeof value === 'object' && value !== null) {
      const keys = Object.keys(value);
      for (let k = keys.length - 1; k >= 0; k--) stack.push({ value: (value as Record<string, unknown>)[keys[k]!], at: `${at}.${keys[k]}` });
    }
  }
  return { findings: out, values };
}

/** The fixed words that replace a withheld identity wherever an output would carry it. */
export const IDENTITY_WITHHELD_WORDS = 'withheld-identity';

/** `value` with every occurrence of each `withheld` identity, in any string or member name at any depth, replaced by the fixed words; `value`
 * itself where `withheld` is empty, so a draft with no withheld identity writes the bytes it wrote before. The outputs a failed draft still
 * writes (its check record, the run's advice file built from the records, and check's report) read the draft for advice and counts, and
 * each is passed through this before it is written or returned, whatever member names an identity. */
export function withoutWithheldIdentities<T>(value: T, withheld: ReadonlySet<string>): T {
  if (withheld.size === 0) return value;
  const longestFirst = [...withheld].sort((a, b) => b.length - a.length);
  const words = (text: string): string => {
    let out = text;
    for (const id of longestFirst) if (out.includes(id)) out = out.split(id).join(IDENTITY_WITHHELD_WORDS);
    return out;
  };
  const copy = (item: unknown): unknown => {
    if (typeof item === 'string') return words(item);
    if (Array.isArray(item)) { const out: unknown[] = []; for (const entry of item) out.push(copy(entry)); return out; }
    if (typeof item === 'object' && item !== null) {
      const out: Record<string, unknown> = {};
      for (const [key, entry] of Object.entries(item)) out[words(key)] = copy(entry);
      return out;
    }
    return item;
  };
  return copy(value) as T;
}
