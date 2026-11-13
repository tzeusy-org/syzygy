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

const IDENTITY = /^repository:[a-z0-9][a-z0-9._-]*$/;

/** Which reading a URL gets (046, line 17): one the operator gives (`--url`, `--upstream`), which carries no credentials, or one read
 * from the clone's remote configuration, whose user information is removed, whatever it holds, before anything is derived from it. */
export type LocatorKind = 'operator' | 'remote';

/** A locator, or the rule it fails. The rule is printed; the URL never is (046, line 17: "SHALL NOT print, store or record that URL"). */
export type LocatorRead =
  | { readonly ok: true; readonly url: NormalisedUrl; readonly userInformation: boolean }
  | { readonly ok: false; readonly rule: string };

/** The rules a URL may fail, in the words the refusal and the launch output print. */
const RULE = {
  form: 'it is not in an admitted locator form (https://, http://, git:// or ssh:// with a host and a path, or the scp form [user@]host:path); file URLs, other transports and local paths are not admitted',
  queryOrFragment: 'it carries a query or a fragment',
  percent: 'its user information or host holds a percent-encoded character',
  credentials: 'an https://, http:// or git:// locator carries no user information',
  colon: 'its user information holds a ":"',
  emptyUser: 'it has an "@" with no user name before it',
  host: 'its host is empty or holds a character other than a letter, a digit, ".", "-" or "_"',
  port: 'its port is not a decimal number',
  path: 'it names no path, or its path has an empty segment once normalised',
  scpPath: 'its scp-form path begins with "//"',
  transport: 'it is in Git\'s <transport>::<address> form (an scp-form path beginning with ":"), which names another transport',
} as const;

const HOST = /^[A-Za-z0-9._-]+$/;
const LOCATOR_SCHEME = /^([A-Za-z][A-Za-z0-9+.-]*):\/\/(.*)$/s;
/** The scp form: an optional user name and `@`, a host holding no `/` or `:`, then `:`, then a path. */
const SCP_FORM = /^(?:([^@/]*)@)?([^/:@]*):(.*)$/s;

/** Read a URL as a locator by REQ-polaris-generation-046's line 17, then normalise it by line 15: scheme, user information, port and a
 * leading `www.` removed, then a trailing `/` and then a trailing `.git`, host and path case-folded. Nothing is fetched, resolved or
 * rewritten (no Git `insteadOf`, no SSH host alias): an alias is the host it names. */
export function readLocator(input: string, kind: LocatorKind): LocatorRead {
  if (/[\s\u0000-\u001f\u007f]/.test(input) || input === '') return { ok: false, rule: RULE.form };
  if (input.includes('?') || input.includes('#')) return { ok: false, rule: RULE.queryOrFragment };
  let user: string | null, hostPort: string, rest: string, scheme: string;
  const schemed = LOCATOR_SCHEME.exec(input);
  if (schemed !== null) {
    scheme = schemed[1]!.toLowerCase();
    if (!['https', 'http', 'git', 'ssh'].includes(scheme)) return { ok: false, rule: RULE.form };
    const body = schemed[2]!;
    const slash = body.indexOf('/');
    const authority = slash < 0 ? body : body.slice(0, slash);
    rest = slash < 0 ? '' : body.slice(slash + 1);
    const at = authority.lastIndexOf('@');
    user = at < 0 ? null : authority.slice(0, at);
    hostPort = at < 0 ? authority : authority.slice(at + 1);
  } else {
    // A local path holds a "/" before any ":" (or no ":"), so the scp form below never reads one: its host holds no "/" or ":".
    const scp = SCP_FORM.exec(input);
    if (scp === null) return { ok: false, rule: RULE.form };
    scheme = 'scp';
    user = scp[1] ?? null; hostPort = scp[2]!; rest = scp[3]!;
    if (rest.startsWith('//')) return { ok: false, rule: RULE.scpPath };
    // `ext::…`, `fd::…`, `testgit::…`: Git reads a host followed by `::` as a transport, which 046 neither admits nor reads as a remote
    // locator (R-PDJA-33-SLICE-C-1 finding 1).
    if (rest.startsWith(':')) return { ok: false, rule: RULE.transport };
  }
  if ((user ?? '').includes('%') || hostPort.includes('%')) return { ok: false, rule: RULE.percent };
  if (user !== null && kind === 'operator') {
    if (scheme === 'https' || scheme === 'http' || scheme === 'git') return { ok: false, rule: RULE.credentials };
    if (user.includes(':')) return { ok: false, rule: RULE.colon };
    if (user === '') return { ok: false, rule: RULE.emptyUser };
  }
  let host = hostPort;
  if (/[[\]]/.test(hostPort)) return { ok: false, rule: RULE.host };   // a bracketed address literal is not a host name the rule names
  if (scheme !== 'scp') {
    const colon = hostPort.lastIndexOf(':');
    if (colon >= 0) {
      if (!/^\d+$/.test(hostPort.slice(colon + 1))) return { ok: false, rule: RULE.port };
      host = hostPort.slice(0, colon);
    }
  }
  if (!HOST.test(host)) return { ok: false, rule: RULE.host };
  host = host.toLowerCase().replace(/^www\./, '');
  let pathPart = rest.replace(/^\/+/, '');
  if (pathPart.endsWith('/')) pathPart = pathPart.slice(0, -1);
  if (pathPart.endsWith('.git')) pathPart = pathPart.slice(0, -4);
  pathPart = pathPart.toLowerCase();
  const segments = pathPart.split('/');
  if (host === '' || pathPart === '' || segments.some(seg => seg === '')) return { ok: false, rule: host === '' ? RULE.host : RULE.path };
  return { ok: true, url: { url: `${host}/${pathPart}`, host, segments }, userInformation: user !== null };
}

/** The URL as a remote locator, normalised, or null when it is not one (a local path, `file://`, another scheme, a query, …). */
export function normaliseUrl(input: string): NormalisedUrl | null {
  const read = readLocator(input, 'remote');
  return read.ok ? read.url : null;
}

/** The locator an operator gives a dossier command (`--url`, the preflight argument), normalised: the URL every run record and page
 * carries, for every host (046, line 17). Refused by its rule, never quoted. */
export function dossierLocator(input: string, option = '--url'): { readonly ok: true; readonly url: string } | { readonly ok: false; readonly reason: string } {
  const read = readLocator(input, 'operator');
  return read.ok ? { ok: true, url: read.url.url } : { ok: false, reason: `the ${option} URL is not admitted: ${read.rule}; it is not printed, stored or recorded` };
}

/** Whether `text` is a locator in the normalised form the rule writes (`host/path`, case-folded, no `www.`, no trailing `/` or `.git`):
 * the form a run record carries. */
export function isNormalisedLocator(text: string): boolean {
  const read = readLocator(`https://${text}`, 'operator');
  return read.ok && read.url.url === text;
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
export function identityRemote<R extends { readonly name: string }>(remotes: readonly R[], defaultRemote: string | null): R | null {
  const named = (name: string) => remotes.find(r => r.name === name) ?? null;
  if (defaultRemote !== null && named(defaultRemote) !== null) return named(defaultRemote);
  if (named('origin') !== null) return named('origin');
  return remotes.length === 1 ? remotes[0]! : null;
}

/** A record as the matching rule reads it, in any state: a launch consent record, or an observation consent made by another act, whose
 * normalised URL is its `Upstream:` URL normalised by the same rule (046, line 17) and whose revisions are those it admits. */
export interface MatchableRecord {
  readonly recordId: string;
  readonly identity: string;
  readonly normalisedUrl: string | null;
  readonly revisions: readonly string[];
  readonly state: string;
  readonly madeBy: 'launch' | 'another act';
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
    if (record.revisions.includes(pinned)) by.push('revision');
    if (record.revisions.some(r => parents.includes(r))) by.push('parent');
    return by.length === 0 ? [] : [{ record, by }];
  });
}

export type IdentityProposal =
  | { readonly ok: true; readonly identity: string; readonly source: IdentitySource; readonly url: string; readonly urlSource: string;
      readonly matches: readonly RecordMatch[]; readonly notCarrying: readonly RecordMatch[]; readonly locatorStatements: readonly string[] }
  | { readonly ok: false; readonly reason: string; readonly matches: readonly RecordMatch[] };

export interface IdentityInput {
  /** A remote whose `url` is null has no single URL the rule can read (`urlLines` of them). */
  readonly remotes: readonly { readonly name: string; readonly url: string | null; readonly urlLines?: number }[];
  readonly defaultRemote: string | null;
  readonly identityOption?: string;
  readonly upstreamOption?: string;
  readonly records: readonly MatchableRecord[];
  readonly pinned: string;
  readonly parents: readonly string[];
}

const describe = (m: RecordMatch): string => `${m.record.recordId} (${m.record.identity}, ${m.record.state}; matched by ${m.by.join(' and ')})`;

export function proposeIdentity(input: IdentityInput): IdentityProposal {
  // An operator-given URL is refused when it is not admitted, naming the rule and never the URL (046, line 17).
  let upstream: NormalisedUrl | null = null;
  if (input.upstreamOption !== undefined) {
    const given = readLocator(input.upstreamOption, 'operator');
    if (!given.ok) return { ok: false, reason: `the --upstream URL is not admitted: ${given.rule}; it is not printed, stored or recorded`, matches: [] };
    upstream = given.url;
  }
  // The remote's URL, read as a remote locator: its user information removed whatever it holds, and said so; a URL that is no remote
  // locator derives nothing, as for a clone with no remote, and the output names the remote and the rule, never the URL.
  const remote = identityRemote(input.remotes, input.defaultRemote);
  const locatorStatements: string[] = [];
  let url: NormalisedUrl | null = null, urlSource = '', remoteRule: string | null = null;
  if (remote !== null && remote.url === null) {
    // A remote with several url lines, or none, has no one URL to read: it derives nothing, and the rule never falls through to another
    // remote (R-PDJA-33-SLICE-C-1 finding 6).
    remoteRule = `it has ${remote.urlLines ?? 0} url lines, and the rule reads a remote with exactly one non-empty url`;
    locatorStatements.push(`The clone's remote ${remote.name} has no one URL to read, so it derives nothing: ${remoteRule}. Syzygy does not print, store or record its URLs.`);
  } else if (remote !== null && remote.url !== null) {
    const read = readLocator(remote.url, 'remote');
    if (read.ok) {
      url = read.url;
      urlSource = `the clone's remote ${remote.name}`;
      if (read.userInformation) locatorStatements.push(`The URL of the clone's remote ${remote.name} carried user information; Syzygy removed it before deriving anything and does not print, store or record it.`);
    } else {
      remoteRule = read.rule;
      locatorStatements.push(`The URL of the clone's remote ${remote.name} is not a remote locator, so it derives nothing: ${read.rule}. Syzygy does not print, store or record it.`);
    }
  }
  if (url === null) {
    if (upstream === null || input.identityOption === undefined) {
      const why = remote !== null && remote.url === null ? `the clone's remote ${remote.name}, which the identity rule reads, has no one URL (${remoteRule}), so it derives nothing, as for a clone with no remote; give --identity and --upstream`
        : remote !== null ? `the URL of the clone's remote ${remote.name} is not a remote locator (${remoteRule}), so it derives nothing, as for a clone with no remote; give --identity and --upstream`
        : input.remotes.length === 0 ? 'the clone has no remote, so the operator must give --identity and --upstream'
          : `the clone has ${input.remotes.length} remotes and none is origin, so no remote is read; give --identity and --upstream`;
      return { ok: false, reason: why, matches: [] };
    }
    url = upstream;
    urlSource = 'the operator\'s --upstream option';
  }
  const derived = deriveIdentity(url);
  const matches = matchRecords(input.records, { identity: derived, url: url.url }, input.pinned, input.parents);
  const carried = [...new Set(matches.map(m => m.record.identity))].sort();
  if (input.identityOption !== undefined) {
    const identity = normaliseIdentityOption(input.identityOption);
    if (identity === null) return { ok: false, reason: '--identity cannot name a repository identity: after normalising it must open with a letter or digit', matches };
    return { ok: true, identity, source: 'operator-option', url: url.url, urlSource, matches, notCarrying: matches.filter(m => m.record.identity !== identity), locatorStatements };
  }
  // The two-segment floor: "a normalised path of fewer than two segments derives no identity, and the operator SHALL give the identity
  // option", whatever the matching records carry.
  if (url.segments.length < 2) return { ok: false, reason: `the normalised URL ${url.url} has fewer than two path segments, so no identity derives from it; give --identity`, matches };
  if (carried.length > 1) {
    return { ok: false, reason: `the matching records carry more than one identity, so Syzygy proposes none: ${matches.map(describe).join('; ')}; give the identity with --identity`, matches };
  }
  if (carried.length === 1) return { ok: true, identity: carried[0]!, source: 'matching-records', url: url.url, urlSource, matches, notCarrying: [], locatorStatements };
  if (derived === null) return { ok: false, reason: `no identity derives from the normalised URL ${url.url}: its last two segments do not open with a letter or digit once joined; give --identity`, matches };
  return { ok: true, identity: derived, source: 'derived', url: url.url, urlSource, matches, notCarrying: [], locatorStatements };
}
