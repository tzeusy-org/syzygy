/** The repository identity a launch proposes (REQ-polaris-generation-046, line 15), by its one rule and never another.
 *
 * "The derived identity is taken from the URL of the clone's remote whose default reference REQ-polaris-generation-047 reads, or else the
 * remote named `origin`, or else the clone's only remote, normalised by removing the scheme (`https`, `http`, `ssh`, `git` or the scp form
 * `user@host:path`), the user information, any port and a leading `www.` from the host, then a trailing `/` and then a trailing `.git`,
 * and case-folding the host and the path; the identity is `repository:` followed by the last two path segments of the normalised URL
 * joined by `-`, with every character outside `a` to `z`, `0` to `9`, `.`, `_` and `-` replaced by `-`."
 *
 * "The proposed identity SHALL be: the identity the operator gives as an option, where given; otherwise, where every matching record
 * carries one and the same identity, that identity …; otherwise, where no record matches, the derived identity. Where matching records
 * carry more than one identity and the operator gives none, Syzygy SHALL propose none and SHALL refuse before asking". The identity and
 * the URL are Inferred; the URL is a locator hint and never the identity. */

export type IdentitySource = 'operator-option' | 'matching-records' | 'derived';

export interface NormalisedUrl { readonly url: string; readonly host: string; readonly segments: readonly string[] }

const SCHEME = /^(https|http|ssh|git):\/\/(.*)$/is;
const SCP = /^(?:[^@/:\s]+@)?([^/:\s]+):(?!\/\/)(.+)$/s;
const IDENTITY = /^repository:[a-z0-9][a-z0-9._-]*$/;

/** The URL normalised by the rule, or null when it is not a form the rule names (a local path, `file://`, another scheme). */
export function normaliseUrl(input: string): NormalisedUrl | null {
  const raw = input.trim();
  let host: string, rest: string;
  const scheme = SCHEME.exec(raw);
  if (scheme !== null) {
    const body = scheme[2]!;
    const slash = body.indexOf('/');
    const authority = slash < 0 ? body : body.slice(0, slash);
    rest = slash < 0 ? '' : body.slice(slash + 1);
    const at = authority.lastIndexOf('@');
    host = (at < 0 ? authority : authority.slice(at + 1)).replace(/:\d*$/, '');
  } else {
    const scp = SCP.exec(raw);
    if (scp === null) return null;
    host = scp[1]!; rest = scp[2]!;
  }
  host = host.replace(/^www\./i, '');
  let pathPart = rest.replace(/^\/+/, '');
  if (pathPart.endsWith('/')) pathPart = pathPart.slice(0, -1);
  if (pathPart.endsWith('.git')) pathPart = pathPart.slice(0, -4);
  host = host.toLowerCase(); pathPart = pathPart.toLowerCase();
  if (host === '' || pathPart === '') return null;
  const segments = pathPart.split('/');
  if (segments.some(s => s === '')) return null;
  return { url: `${host}/${pathPart}`, host, segments };
}

/** `repository:` and the last two path segments joined by `-`, every other character replaced; null for fewer than two segments. */
export function deriveIdentity(url: NormalisedUrl): string | null {
  if (url.segments.length < 2) return null;
  const tail = url.segments.slice(-2).join('-').replace(/[^a-z0-9._-]/g, '-');
  const identity = `repository:${tail}`;
  return IDENTITY.test(identity) ? identity : null;
}

/** The operator's identity option, normalised the same way (case-folded, every other character replaced), or null when it cannot name
 * one (an identity must open with a letter or digit). */
export function normaliseIdentityOption(input: string): string | null {
  const bare = input.trim().toLowerCase().replace(/^repository:/, '').replace(/[^a-z0-9._-]/g, '-');
  const identity = `repository:${bare}`;
  return IDENTITY.test(identity) ? identity : null;
}

/** The remote the identity rule reads: the one REQ-047 read the default of, else `origin`, else the only remote. */
export function identityRemote(remotes: readonly { readonly name: string; readonly url: string }[], defaultRemote: string | null): { readonly name: string; readonly url: string } | null {
  const named = (name: string) => remotes.find(r => r.name === name) ?? null;
  if (defaultRemote !== null && named(defaultRemote) !== null) return named(defaultRemote);
  if (named('origin') !== null) return named('origin');
  return remotes.length === 1 ? remotes[0]! : null;
}

/** A record as the matching rule reads it: any launch consent record, in any state. */
export interface MatchableRecord {
  readonly recordId: string;
  readonly identity: string;
  readonly normalisedUrl: string | null;
  readonly revision: string | null;
  readonly state: string;
}
export type MatchKind = 'identity' | 'url' | 'revision' | 'parent';
export interface RecordMatch { readonly record: MatchableRecord; readonly by: readonly MatchKind[] }

/** "An existing record, in any state, matches the run when its subject identity equals the derived identity, its recorded normalised URL
 * equals the derived URL, or it names the pinned revision or a parent of the pinned commit." */
export function matchRecords(records: readonly MatchableRecord[], derived: { readonly identity: string | null; readonly url: string | null }, pinned: string, parents: readonly string[]): readonly RecordMatch[] {
  return records.flatMap(record => {
    const by: MatchKind[] = [];
    if (derived.identity !== null && record.identity === derived.identity) by.push('identity');
    if (derived.url !== null && record.normalisedUrl === derived.url) by.push('url');
    if (record.revision !== null && record.revision === pinned) by.push('revision');
    if (record.revision !== null && parents.includes(record.revision)) by.push('parent');
    return by.length === 0 ? [] : [{ record, by }];
  });
}

export type IdentityProposal =
  | { readonly ok: true; readonly identity: string; readonly source: IdentitySource; readonly url: string; readonly urlSource: string;
      readonly matches: readonly RecordMatch[]; readonly notCarrying: readonly RecordMatch[] }
  | { readonly ok: false; readonly reason: string; readonly matches: readonly RecordMatch[] };

export interface IdentityInput {
  readonly remotes: readonly { readonly name: string; readonly url: string }[];
  readonly defaultRemote: string | null;
  readonly identityOption?: string;
  readonly upstreamOption?: string;
  readonly records: readonly MatchableRecord[];
  readonly pinned: string;
  readonly parents: readonly string[];
}

const describe = (m: RecordMatch): string => `${m.record.recordId} (${m.record.identity}, ${m.record.state}; matched by ${m.by.join(' and ')})`;

export function proposeIdentity(input: IdentityInput): IdentityProposal {
  const remote = identityRemote(input.remotes, input.defaultRemote);
  let url: NormalisedUrl | null, urlSource: string;
  if (remote !== null) {
    url = normaliseUrl(remote.url);
    urlSource = `the clone's remote ${remote.name}`;
    if (url === null) return { ok: false, reason: `the URL of the clone's remote ${remote.name} is not one the identity rule normalises (https, http, ssh, git or user@host:path); give --identity and --upstream`, matches: [] };
  } else {
    if (input.upstreamOption === undefined || input.identityOption === undefined) {
      return { ok: false, reason: input.remotes.length === 0
        ? 'the clone has no remote, so the operator must give --identity and --upstream'
        : `the clone has ${input.remotes.length} remotes and none is origin, so no remote is read; give --identity and --upstream`, matches: [] };
    }
    url = normaliseUrl(input.upstreamOption);
    urlSource = 'the operator\'s --upstream option';
    if (url === null) return { ok: false, reason: '--upstream is not a URL the identity rule normalises (https, http, ssh, git or user@host:path)', matches: [] };
  }
  const derived = deriveIdentity(url);
  const matches = matchRecords(input.records, { identity: derived, url: url.url }, input.pinned, input.parents);
  const carried = [...new Set(matches.map(m => m.record.identity))].sort();
  if (input.identityOption !== undefined) {
    const identity = normaliseIdentityOption(input.identityOption);
    if (identity === null) return { ok: false, reason: '--identity cannot name a repository identity: after normalising it must open with a letter or digit', matches };
    return { ok: true, identity, source: 'operator-option', url: url.url, urlSource, matches, notCarrying: matches.filter(m => m.record.identity !== identity) };
  }
  if (carried.length > 1) {
    return { ok: false, reason: `the matching records carry more than one identity, so Syzygy proposes none: ${matches.map(describe).join('; ')}; give the identity with --identity`, matches };
  }
  if (carried.length === 1) return { ok: true, identity: carried[0]!, source: 'matching-records', url: url.url, urlSource, matches, notCarrying: [] };
  if (derived === null) return { ok: false, reason: `the normalised URL ${url.url} has fewer than two path segments, so no identity derives from it; give --identity`, matches };
  return { ok: true, identity: derived, source: 'derived', url: url.url, urlSource, matches, notCarrying: [] };
}
