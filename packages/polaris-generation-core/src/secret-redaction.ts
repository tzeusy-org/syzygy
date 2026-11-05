import { isRecord, sha256 } from '@syzygy/support';

import type { PublicSourceContentClass } from './public-source-classification.js';

/** The public-source screening scope's `secretRedaction` (policy version 4, approved 2026-10-20, variant `span`; RFC5-17's
 * `redacted-span`), shared by the any-repo reader's screen and the dossier's screen so the two cannot read the rule differently.
 *
 * As for the class rule and the code-content exemption, every text this module implements is pinned by digest: the screen implements
 * one reading of one text, and any other text refuses the screen. The parameters (`redactedClasses`, `wholeArtifactDetectors`,
 * `wholeArtifactFragments`, `guardLines`) are read from the bytes; the line pattern is pinned with the rule text, because the rule says
 * how it is applied (to each line without its terminator, so a JavaScript `RegExp` without the `m` flag is run once per line, never
 * once over the body, where `^` would anchor only the first line).
 *
 * The reading, in the rule's order:
 * - every detector's matches are every match it makes from every start offset (a sticky regular expression tried at each UTF-16 offset;
 *   a literal at each `indexOf` hit), overlapping matches included;
 * - no match: the body is admitted unredacted (`clean`), as before;
 * - a match from a `wholeArtifactDetectors` detector, any `wholeArtifactFragments` entry anywhere in the body (exact, case-sensitive),
 *   any line matching the line pattern, a class outside `redactedClasses` (code-content included), a match that cannot be placed on
 *   lines (zero length), or more than `MAX_MATCHES` matches: excluded whole, as before;
 * - otherwise each line a match touches, and `guardLines` lines before and after it, is withheld; the retained text is the body with
 *   each withheld line emptied but its terminator kept; the original line array carries line identity, even where emptying a line
 *   brings a CR next to an LF from a different line. Every detector runs again over the joined retained text, and any match
 *   excludes the body whole.
 *
 * Lines are split at LF, CRLF or CR, and a final terminator opens no line, as the generator counts lines (`lineCount`).
 *
 * Resource bounds: the ordinary first-match scan decides clean bodies and classes that cannot redact before any every-offset work.
 * Whole-artifact checks also precede that work. The overlapping scan stops at `MAX_MATCHES` or when summed match lengths exceed eight
 * times the body length; a breach excludes whole. This bounds repeated successful scans of long suffixes, rather than just their count.
 * The pinned credential-bearing URL pattern uses exact linear recognition, including failed searches and retained-text re-screening; other declared regexes have no nested ambiguous quantifier (version 6's `config-secret-directive` included: each `#` iteration consumes a `#`, and `secret-redaction.test.ts` bounds it over long blank, `#` and ACL lines). The length limit still bounds overlapping successful suffix matches. Not repaired here (the policy's own residuals):
 * a secret no detector matches, beyond the guard lines or continuing past
 * them, is admitted; the whole body's digest and object id stay recorded and can check a guess at a short withheld line. */

/** sha256 of each text this module implements, UTF-8 (the version-4 bytes approved 2026-10-20). `unchanged` has a second text, version
 * 5's (approved 2026-11-03), which names the project-documentation exemption beside the code-content one; both say the scan runs over
 * the complete body exactly as the exemptions' own rules say, which is what the screens do with or without that exemption declared. */
const REDACTION_TEXTS = {
  appliesTo: 'd2db3aa87aebba3b42a72a5ff1c435cb3a6bb61288b5ffb0076f68d62891503e',
  wholeArtifactLinePattern: '63f957c57bc1565c86a7ad614469755172102540a0d19b4df3dcd1854b4fefa0',
  rule: '2ef91873fead23d281dd7f627907374be428165ce6c5825fb6419fec08c85c74',
  withheldLines: '9878b9d7a10057981508f7cc9b36bcab649116a52b07ea0e35842030764efd82',
  citedSpanRule: '1d583b499faa94320e106774a5b7e1804fb757e33d34c1b0680ef217b9d495c6',
  provenance: '361eb887bca9149b771b66b0891d71adb5626b3178df48502696144a8b9e0dc1',
  unchanged: ['74f0bc88dc1c99324bcfdbc554234c011b0131627adb9eb37d9c34792ea79bdb', 'e00788b3ee20697408b02a984c5f5a93a3ad100909e1b8fe93367e08fa08fd4c'],
  consequence: 'fbccac9121d61a3cf617a26dfc4b54f378753a22b9c5b7f431ba13447ffb6566',
} as const;
const REDACTION_KEYS = ['appliesTo', 'redactedClasses', 'redactionClass', 'wholeArtifactDetectors', 'wholeArtifactLinePattern', 'wholeArtifactFragments',
  'guardLines', 'rule', 'withheldLines', 'citedSpanRule', 'provenance', 'unchanged', 'consequence'] as const;
const KNOWN_CLASSES: readonly PublicSourceContentClass[] = ['project-documentation', 'code-content'];
/** More matches than this excludes the body whole: the match set is held in memory and each match is placed on lines. */
export const MAX_MATCHES = 10_000;
const MAX_MATCH_LENGTH_MULTIPLE = 8;
// This exact policy pattern has quadratic failed backtracking on many colons before a missing @.
const CREDENTIAL_URL_PATTERN = String.raw`https?://[^/@\s]+:[^/@\s]+@`;
const MAX_GUARD_LINES = 100;

export interface SecretRedaction {
  readonly redactedClasses: readonly PublicSourceContentClass[];
  readonly wholeArtifactDetectors: readonly string[];
  /** Applied to each line without its terminator; never to the body as a whole. */
  readonly wholeArtifactLinePattern: RegExp;
  readonly wholeArtifactFragments: readonly string[];
  readonly guardLines: number;
}
/** `redaction` is null when the scope declares none (versions 1 to 3). */
export type SecretRedactionRead = { readonly ok: true; readonly redaction: SecretRedaction | null } | { readonly ok: false; readonly why: string };

/** Reads `secretRedaction` from a policy's `publicSourceScope`. `detectorIds` are the ids of every detector this scope runs: the policy's
 * own and, from version 5, its `scopeDetectors` (`readScopeDetectors`); a whole-artifact detector that names none of them refuses. Any
 * malformed or unrecognised field refuses. */
export function readSecretRedaction(scope: unknown, detectorIds: readonly string[]): SecretRedactionRead {
  const refuse = (why: string): SecretRedactionRead => ({ ok: false, why: `its secret redaction ${why}` });
  if (!isRecord(scope) || !Object.hasOwn(scope, 'secretRedaction')) return { ok: true, redaction: null };
  const red = scope['secretRedaction'];
  if (!isRecord(red)) return refuse('is not an object');
  const keys = Object.keys(red);
  if (keys.length !== REDACTION_KEYS.length || REDACTION_KEYS.some(key => !keys.includes(key))) return refuse(`carries the fields ${keys.join(', ')}, not exactly ${REDACTION_KEYS.join(', ')}`);
  for (const key of Object.keys(REDACTION_TEXTS) as (keyof typeof REDACTION_TEXTS)[]) {
    const value = red[key], accepted: string | readonly string[] = REDACTION_TEXTS[key];
    if (typeof value !== 'string' || !(typeof accepted === 'string' ? [accepted] : accepted).includes(sha256(value))) return refuse(`${key} is not the text this screen implements`);
  }
  if (red['redactionClass'] !== 'redacted-span') return refuse('redactionClass is not redacted-span');
  const distinctStrings = (value: unknown): value is readonly string[] => Array.isArray(value) && value.length > 0 && new Set(value).size === value.length
    && value.every(entry => typeof entry === 'string' && entry.length > 0);
  const classes = red['redactedClasses'];
  if (!distinctStrings(classes) || !classes.every(entry => (KNOWN_CLASSES as readonly string[]).includes(entry))) return refuse('redactedClasses is not a non-empty list of distinct known classes');
  const whole = red['wholeArtifactDetectors'];
  if (!distinctStrings(whole) || !whole.every(id => detectorIds.includes(id))) return refuse('wholeArtifactDetectors is not a non-empty list of distinct detector ids of this policy');
  const fragments = red['wholeArtifactFragments'];
  if (!distinctStrings(fragments)) return refuse('wholeArtifactFragments is not a non-empty list of distinct non-empty strings');
  const guard = red['guardLines'];
  if (typeof guard !== 'number' || !Number.isSafeInteger(guard) || guard < 1 || guard > MAX_GUARD_LINES) return refuse(`guardLines is not an integer from 1 to ${MAX_GUARD_LINES}`);
  let pattern: RegExp;
  try { pattern = new RegExp(red['wholeArtifactLinePattern'] as string, 'u'); } catch { return refuse('wholeArtifactLinePattern does not compile'); }
  return { ok: true, redaction: Object.freeze({
    redactedClasses: Object.freeze([...classes]) as readonly PublicSourceContentClass[], wholeArtifactDetectors: Object.freeze([...whole]),
    wholeArtifactLinePattern: pattern, wholeArtifactFragments: Object.freeze([...fragments]), guardLines: guard,
  }) };
}

/** The version-5 scope's own detectors (`publicSourceScope.scopeDetectors`, approved 2026-11-03): added to the policy's detectors for this
 * scope only, so the public-source screens run them wherever they run the policy's (paths, bodies, the every-offset scan, retained text
 * and agent text), and the Butlers base screen never reads them. The `rule` and `consequence` texts are pinned; each detector is read as
 * the policy's are (`id`, `kind` and `pattern` with `flags`, or `values`), and an id the policy's detectors or another scope detector
 * already uses refuses. The patterns are compiled by the screens with the policy's own compiler, which refuses one that does not compile.
 * `consequence` is version 6's text (approved 2026-11-05, variant `p`): version 5's with the config-secret-directive clause appended; the
 * `rule` text is version 5's, unchanged. Version 5's consequence no longer reads, so the version-5 bytes refuse, as every superseded
 * scope-detector text does. */
const SCOPE_DETECTOR_TEXTS = {
  rule: '6503580ee657dac1536178c1b90f25c62b10a97211a2e883071c7538a0d257c5',
  consequence: '04aa0cd069c69ba9997f3ff9f55762c78db9c8aa36051325a5009b708e6dafc9',
} as const;
const SCOPE_DETECTOR_KEYS = ['rule', 'detectors', 'consequence'] as const;
/** `detectors` is empty when the scope declares none (versions 1 to 4). */
export type ScopeDetectorsRead = { readonly ok: true; readonly detectors: readonly RedactionDetector[] } | { readonly ok: false; readonly why: string };

export function readScopeDetectors(scope: unknown, policyDetectorIds: readonly string[]): ScopeDetectorsRead {
  const refuse = (why: string): ScopeDetectorsRead => ({ ok: false, why: `its scope detectors ${why}` });
  if (!isRecord(scope) || !Object.hasOwn(scope, 'scopeDetectors')) return { ok: true, detectors: Object.freeze([]) };
  const object = scope['scopeDetectors'];
  if (!isRecord(object)) return refuse('is not an object');
  const keys = Object.keys(object);
  if (keys.length !== SCOPE_DETECTOR_KEYS.length || SCOPE_DETECTOR_KEYS.some(key => !keys.includes(key))) return refuse(`carries the fields ${keys.join(', ')}, not exactly ${SCOPE_DETECTOR_KEYS.join(', ')}`);
  for (const key of ['rule', 'consequence'] as const) {
    const value = object[key];
    if (typeof value !== 'string' || sha256(value) !== SCOPE_DETECTOR_TEXTS[key]) return refuse(`${key} is not the text this screen implements`);
  }
  const list = object['detectors'];
  if (!Array.isArray(list) || list.length === 0) return refuse('declares no detector');
  const seen = new Set(policyDetectorIds), out: RedactionDetector[] = [];
  for (const entry of list) {
    if (!isRecord(entry) || typeof entry['id'] !== 'string' || entry['id'].length === 0) return refuse('lists a detector without an id');
    const id = entry['id'];
    if (seen.has(id)) return refuse(`repeats the detector id ${id}`);
    seen.add(id);
    const fields = Object.keys(entry).sort().join(',');
    if (entry['kind'] === 'regular-expression' && fields === 'flags,id,kind,pattern' && typeof entry['pattern'] === 'string' && entry['pattern'].length > 0
      && typeof entry['flags'] === 'string') {
      out.push(Object.freeze({ id, kind: 'regular-expression', pattern: entry['pattern'], flags: entry['flags'] }));
    } else if (entry['kind'] === 'literal-fragment' && fields === 'id,kind,values' && Array.isArray(entry['values']) && entry['values'].length > 0
      && entry['values'].every((value: unknown) => typeof value === 'string' && value.length > 0)) {
      out.push(Object.freeze({ id, kind: 'literal-fragment', values: Object.freeze([...entry['values'] as string[]]) }));
    } else return refuse(`detector ${id} is not read as the policy's detectors are`);
  }
  return { ok: true, detectors: Object.freeze(out) };
}

/** A detector as the policy declares it (`@syzygy/three-surface-poc-core`'s `SecretDetector`). */
export type RedactionDetector =
  | { readonly id: string; readonly kind: 'literal-fragment'; readonly values: readonly string[] }
  | { readonly id: string; readonly kind: 'regular-expression'; readonly pattern: string; readonly flags: string };
export interface DetectorMatch { readonly detectorId: string; readonly start: number; readonly end: number }
export interface EveryOffsetMatcher {
  /** Ordinary first-match search, optionally restricted to the named detectors. */
  readonly first: (text: string, detectorIds?: readonly string[]) => DetectorMatch | undefined;
  /** Every starting offset, bounded by both match count and summed match lengths. */
  readonly all: (text: string, limit: number) => { readonly matches: readonly DetectorMatch[]; readonly limited: boolean };
}

/** Exact linear recognition for the pinned URL pattern. A URL's authority runs to the first /, @ or whitespace. A match needs an @
 * terminator and a colon with at least one authority character on each side. Prefixes and authority runs cannot overlap across /, so
 * failed authorities are scanned once, including those with many colons and no @. This is tied to pattern + flags, never a detector id. */
function credentialUrls(text: string, detectorId: string, take: (match: DetectorMatch) => boolean): void {
  const prefix = /https?:\/\//gi;
  for (let match = prefix.exec(text); match !== null; match = prefix.exec(text)) {
    const start = prefix.lastIndex;
    let end = start, colon = -1;
    while (end < text.length && text[end] !== '/' && text[end] !== '@' && !/\s/u.test(text[end]!)) {
      if (text[end] === ':' && end > start && colon === -1) colon = end;
      end++;
    }
    if (text[end] === '@' && colon !== -1 && colon < end - 1
      && !take({ detectorId, start: match.index, end: end + 1 })) return;
  }
}

/** Compiles the policy's detectors for every match from every start offset. Throws on a detector the policy's own compiler would also
 * refuse (the screens compile the same list with `compileDetectors` first). */
export function compileEveryOffsetMatcher(detectors: readonly RedactionDetector[]): EveryOffsetMatcher {
  const each = detectors.map(detector => {
    if (detector.kind === 'literal-fragment') {
      const values = [...detector.values];
      return { id: detector.id,
        first: (text: string): DetectorMatch | undefined => {
          for (const value of values) { const start = text.indexOf(value); if (start !== -1) return { detectorId: detector.id, start, end: start + value.length }; }
          return undefined;
        },
        all: (text: string, take: (match: DetectorMatch) => boolean): void => {
          for (const value of values) for (let at = text.indexOf(value); at !== -1; at = text.indexOf(value, at + 1)) {
            if (!take({ detectorId: detector.id, start: at, end: at + value.length })) return;
          }
        },
      };
    }
    // Sticky, without the global flag: `exec` then matches only at `lastIndex`, which is every offset in turn.
    const flags = detector.flags.replace(/[gy]/gu, '');
    if (detector.pattern === CREDENTIAL_URL_PATTERN && flags === 'i') return { id: detector.id,
      first: (text: string): DetectorMatch | undefined => {
        let first: DetectorMatch | undefined;
        credentialUrls(text, detector.id, match => { first = match; return false; });
        return first;
      },
      all: (text: string, take: (match: DetectorMatch) => boolean): void => credentialUrls(text, detector.id, take),
    };
    const search = new RegExp(detector.pattern, flags), sticky = new RegExp(detector.pattern, `${flags}y`);
    return { id: detector.id,
      first: (text: string): DetectorMatch | undefined => {
        const match = search.exec(text);
        return match === null ? undefined : { detectorId: detector.id, start: match.index, end: match.index + match[0].length };
      },
      all: (text: string, take: (match: DetectorMatch) => boolean): void => {
        for (let at = 0; at < text.length; at++) {
          sticky.lastIndex = at;
          const match = sticky.exec(text);
          if (match !== null && !take({ detectorId: detector.id, start: match.index, end: match.index + match[0].length })) return;
        }
      },
    };
  });
  return {
    first: (text, detectorIds) => {
      for (const detector of each) {
        if (detectorIds !== undefined && !detectorIds.includes(detector.id)) continue;
        const match = detector.first(text);
        if (match !== undefined) return match;
      }
      return undefined;
    },
    all: (text, limit) => {
      const matches: DetectorMatch[] = [];
      let matchedLength = 0, limited = false;
      const take = (match: DetectorMatch): boolean => {
        matches.push(match);
        matchedLength += match.end - match.start;
        limited = matches.length > limit || matchedLength > MAX_MATCH_LENGTH_MULTIPLE * text.length;
        return !limited;
      };
      for (const detector of each) { detector.all(text, take); if (limited) break; }
      return { matches, limited };
    },
  };
}

/** A body's lines, each with its terminator; a final terminator ends the last line and opens none. */
export function bodyLines(body: string): readonly string[] {
  const out: string[] = [];
  let start = 0;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c !== '\n' && c !== '\r') continue;
    if (c === '\r' && body[i + 1] === '\n') i++;
    out.push(body.slice(start, i + 1));
    start = i + 1;
  }
  if (start < body.length) out.push(body.slice(start));
  return out;
}
const withoutTerminator = (line: string): string => line.replace(/(?:\r\n|\r|\n)$/u, '');

export type WholeExclusionCause = 'no-redaction-rule' | 'whole-artifact-detector' | 'key-header-fragment' | 'key-header-line' | 'class-not-redacted' | 'unplaceable-match'
  | 'match-limit' | 'retained-text-matches';
export type RedactionOutcome =
  /** No detector matched: the body is admitted unredacted, as before. */
  | { readonly kind: 'clean' }
  /** Excluded whole, as before, for the cause named. */
  | { readonly kind: 'excluded'; readonly cause: WholeExclusionCause }
  /** Retained as redacted-span: `withheld` are the 1-based withheld line numbers, ascending; `retained` is the body with each withheld
   * line emptied and its terminator kept; `detectorIds` are the ids of the detectors that matched, in policy order. */
  | { readonly kind: 'redacted'; readonly withheld: readonly number[]; readonly retained: string; readonly retainedLines: readonly string[];
      readonly lineByteOffsets: readonly number[]; readonly originalBytes: number; readonly contentSha256: string; readonly detectorIds: readonly string[] };

/** The rule over one body admitted under `contentClass`. `redaction` null (versions 1 to 3) excludes every matching body whole. */
export function redactBody(body: string, contentClass: PublicSourceContentClass | undefined, matcher: EveryOffsetMatcher, redaction: SecretRedaction | null): RedactionOutcome {
  if (matcher.first(body) === undefined) return { kind: 'clean' };
  if (redaction === null) return { kind: 'excluded', cause: 'no-redaction-rule' };
  if (contentClass === undefined || !redaction.redactedClasses.includes(contentClass)) return { kind: 'excluded', cause: 'class-not-redacted' };
  if (matcher.first(body, redaction.wholeArtifactDetectors) !== undefined) return { kind: 'excluded', cause: 'whole-artifact-detector' };
  if (redaction.wholeArtifactFragments.some(fragment => body.includes(fragment))) return { kind: 'excluded', cause: 'key-header-fragment' };
  const lines = bodyLines(body);
  if (lines.some(line => redaction.wholeArtifactLinePattern.test(withoutTerminator(line)))) return { kind: 'excluded', cause: 'key-header-line' };
  const scan = matcher.all(body, MAX_MATCHES), found = scan.matches;
  if (scan.limited) return { kind: 'excluded', cause: 'match-limit' };
  if (found.some(match => match.end <= match.start)) return { kind: 'excluded', cause: 'unplaceable-match' };
  const starts: number[] = [];
  let at = 0;
  for (const line of lines) { starts.push(at); at += line.length; }
  /** The 1-based line holding the character at `offset`. */
  const lineOf = (offset: number): number => {
    let lo = 0, hi = starts.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid]! <= offset) lo = mid; else hi = mid - 1; }
    return lo + 1;
  };
  const held = new Set<number>();
  for (const match of found) {
    const first = lineOf(match.start), last = lineOf(match.end - 1);
    for (let n = first - redaction.guardLines; n <= last + redaction.guardLines; n++) if (n >= 1 && n <= lines.length) held.add(n);
  }
  const retainedLines = Object.freeze(lines.map((line, i) => (held.has(i + 1) ? line.slice(withoutTerminator(line).length) : line)));
  const retained = retainedLines.join('');
  if (matcher.first(retained) !== undefined) return { kind: 'excluded', cause: 'retained-text-matches' };
  const ids = [...new Set(found.map(match => match.detectorId))];
  let byte = 0;
  const lineByteOffsets = Object.freeze(lines.map(line => { const start = byte; byte += Buffer.byteLength(line, 'utf8'); return start; }));
  return { kind: 'redacted', withheld: Object.freeze([...held].sort((a, b) => a - b)), retained, retainedLines, lineByteOffsets,
    originalBytes: byte, contentSha256: sha256(body), detectorIds: Object.freeze(ids) };
}

/** Whether the inclusive 1-based line range `[startLine, endLine]` includes a withheld line: such a span is withheld whole. */
export function spanTouchesWithheld(withheld: readonly number[], startLine: number, endLine: number): boolean {
  return withheld.some(line => line >= startLine && line <= endLine);
}

/** The marker that replaces one run of consecutive withheld lines wherever a retained body is shown or carried: it names the redaction
 * and the body's total withheld-line count (`secretRedaction.withheldLines`). */
export const redactionMarker = (total: number): string => `[redacted-span: ${total} withheld line(s) in this file]`;

/** The retained body as it may be shown or carried: each run of consecutive withheld lines becomes one marker line (with the run's
 * last terminator, or none at the end of a body without one). */
export function retainedWithMarkers(lines: readonly string[], withheld: readonly number[]): string {
  const held = new Set(withheld), marker = redactionMarker(withheld.length);
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!held.has(i + 1)) { out.push(lines[i]!); continue; }
    let j = i;
    while (j + 1 < lines.length && held.has(j + 2)) j++;
    out.push(marker + lines[j]!);
    i = j;
  }
  return out.join('');
}
