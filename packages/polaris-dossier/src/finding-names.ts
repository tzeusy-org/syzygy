import { checkShape, handle } from '@syzygy/polaris-generation-core/live';
import type { CheckFinding } from './check-model.js';

/** How a finding's detail names a draft-supplied identity (syzygy-3efd.93). A detail names an identity only where it has the identity form,
 * a handle: any other value (a path, a sentence, a string past the length bound) may be a secret path or any text at all, and the finding's
 * `at` already locates it. Where a detail would name a value of another form, it names the member by its path or says "named here"
 * instead. A handle can still match a secret detector; `screenFindingDetails` withholds any detail a detector matches, whatever named it. */

/** Whether `value` is a string of the identity form (the draft schema's `handle`: its pattern and its length bound). */
export const isHandle = (value: unknown): value is string => typeof value === 'string' && checkShape({ root: handle, defs: {} }, value).length === 0;

/** A draft-supplied identity as a detail quotes it: `"<id>"` where it is a handle, else the words `named here`. */
export const identityWords = (value: unknown): string => (isHandle(value) ? JSON.stringify(value) : 'named here');

/** A draft-supplied identity bare, where it is a handle; else `fallback` (the member's path, or words naming it). */
export const handleOr = (value: unknown, fallback: string): string => (isHandle(value) ? value : fallback);

/** The fixed detail of a finding whose own detail a secret detector matches or names a secret path. */
export const FINDING_DETAIL_WITHHELD = 'Finding detail withheld under source screening.';

/** The characters a detail's words are split at: whitespace, quotes, backticks, parentheses, commas and semicolons. */
export const DETAIL_WORD_BREAK = /[\s"`'(),;]+/u;

/** Every finding as check reports and records it, its detail screened (syzygy-3efd.93): the fixed detail `FINDING_DETAIL_WITHHELD`
 * replaces a detail where a secret detector matches it, read whole or word by word (`admit`), where any of its words names a denied path
 * (`deniedWord`: a basename, suffix or directory the screening policy denies, which `admit` alone admits), or where screening cannot decide.
 * Fail-closed: the backstop behind every builder, whatever value a builder interpolates; the finding keeps its kind and location, so the
 * repair loop still reaches it. Each distinct value is screened once per call. */
export function screenFindingDetails(findings: readonly CheckFinding[], admit: (value: string) => 'admitted' | 'withheld' | 'unavailable',
  deniedWord: (word: string) => boolean = () => false): CheckFinding[] {
  const seen = new Map<string, boolean>();
  const clear = (value: string, word: boolean): boolean => {
    const key = `${word ? 'w' : 'd'}${value}`;
    let ok = seen.get(key);
    if (ok === undefined) {
      try { ok = admit(value) === 'admitted' && !(word && deniedWord(value)); } catch { ok = false; }
      seen.set(key, ok);
    }
    return ok;
  };
  const admitted = (detail: string): boolean => clear(detail, false) && detail.split(DETAIL_WORD_BREAK).every((word) => word.length === 0 || clear(word, true));
  // A location (syzygy-3efd.95): each member name of `at` screened as a word, a matched one replaced by the fixed name, and then the whole
  // location, which falls back to the root where it still does not pass. A member name is the draft's own where the schema did not know it.
  // The whole is read with each index written `[]`: an index is Syzygy's own digits, and the shape alone repeats, so a draft of many
  // findings costs one screen call per distinct member name and per distinct shape.
  const located = (at: string): string => {
    const named = at.replace(AT_WORD, (word) => (/^[0-9]+$/u.test(word) || clear(word, true) ? word : AT_MEMBER_WITHHELD));
    return clear(named.replace(/\[[0-9]+\]/gu, '[]'), false) ? named : '$';
  };
  const out: CheckFinding[] = [];
  for (const finding of findings) {
    const at = located(finding.at);
    const detail = admitted(finding.detail) ? finding.detail : FINDING_DETAIL_WITHHELD;
    // A block or citation identity is the draft's: a finding keeps it only where screening admits it (syzygy-3efd.95).
    const keepBlock = finding.blockId === undefined || clear(finding.blockId, true);
    const keepCitation = finding.citationId === undefined || clear(finding.citationId, true);
    if (at === finding.at && detail === finding.detail && keepBlock && keepCitation) { out.push(finding); continue; }
    // Rebuilt member by member in the finding's own order, so the record's bytes move only where screening withholds.
    const rebuilt: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(finding)) {
      if (key === 'at') rebuilt[key] = at;
      else if (key === 'detail') rebuilt[key] = detail;
      else if ((key === 'blockId' && !keepBlock) || (key === 'citationId' && !keepCitation)) continue;
      else rebuilt[key] = value;
    }
    out.push(rebuilt as unknown as CheckFinding);
  }
  return out;
}

/** The member names and indices of a location: every run between `.`, `[`, `]` and the root `$`. */
const AT_WORD = /[^.[\]$]+/gu;
/** The fixed member name that replaces one screening withholds in a finding's `at`. */
export const AT_MEMBER_WITHHELD = 'withheld-member';
