import { describe, expect, it } from 'vitest';
import { deriveIdentity, identityRemote, matchRecords, normaliseIdentityOption, normaliseUrl, proposeIdentity, readLocator, type MatchableRecord } from './launch-identity.js';

/** REQ-polaris-generation-046, line 15: the identity proposal rule. Expected values are literals written from the clause, never computed
 * by the module under test. */

const P = 'a'.repeat(40), Q = 'b'.repeat(40), PARENT = 'c'.repeat(40);
const rec = (recordId: string, identity: string, normalisedUrl: string | null, revision: string | null, state = 'active'): MatchableRecord =>
  ({ recordId, identity, normalisedUrl, revisions: revision === null ? [] : [revision], state, madeBy: 'launch' });

describe('normalisation (line 15: scheme, user information, port, leading www., trailing / then .git, case folding)', () => {
  it.each([
    ['https://github.com/Redis/Redis.git', 'github.com/redis/redis'],
    ['http://www.GitHub.com/redis/redis/', 'github.com/redis/redis'],
    ['ssh://git@github.com:22/redis/redis.git', 'github.com/redis/redis'],
    ['git://example.org:9418/a/b/c.git', 'example.org/a/b/c'],
    ['git@github.com:tzeusy-org/syzygy.git', 'github.com/tzeusy-org/syzygy'],
    ['https://user:pw@gitlab.example.com:8443/Group/Sub/Name.git/', 'gitlab.example.com/group/sub/name'],
  ])('%s normalises to %s', (input, expected) => {
    expect(normaliseUrl(input)?.url).toBe(expected);
  });

  it('removes the trailing / before the trailing .git, in that order', () => {
    expect(normaliseUrl('https://h.example/a/b.git/')?.url).toBe('h.example/a/b');
    expect(normaliseUrl('https://h.example/a/b/.git')).toBe(null);   // "b/.git" loses ".git" and leaves an empty segment: no URL
  });

  it.each(['/srv/repo', 'file:///srv/repo', 'ftp://h/a/b', ''])('%s is not a form the rule normalises', input => {
    expect(normaliseUrl(input)).toBe(null);
  });
});

const FORM = 'it is not in an admitted locator form (https://, http://, git:// or ssh:// with a host and a path, or the scp form [user@]host:path); file URLs, other transports and local paths are not admitted';
const QUERY = 'it carries a query or a fragment';
const PERCENT = 'its user information or host holds a percent-encoded character';
const CREDENTIALS = 'an https://, http:// or git:// locator carries no user information';
const COLON = 'its user information holds a ":"';
const HOST_RULE = 'its host is empty or holds a character other than a letter, a digit, ".", "-" or "_"';
const PORT = 'its port is not a decimal number';
const PATH_RULE = 'it names no path, or its path has an empty segment once normalised';
const SCP_PATH = 'its scp-form path begins with "//"';
const TRANSPORT = 'it is in Git\'s <transport>::<address> form (an scp-form path beginning with ":"), which names another transport';

describe('the admitted locator forms (046, line 17): what an operator may give', () => {
  it.each([
    ['https://git.example.org/a/b', 'git.example.org/a/b'],
    ['HTTPS://Git.Example.org:8443/A/B.git', 'git.example.org/a/b'],
    ['http://git.example.org/a/b', 'git.example.org/a/b'],
    ['git://git.example.org/a/b.git', 'git.example.org/a/b'],
    ['ssh://git.example.org/team/sub/tool.git', 'git.example.org/team/sub/tool'],
    ['ssh://git@git.example.org:2222/team/sub/tool.git', 'git.example.org/team/sub/tool'],
    ['git@git.example.org:team/sub/tool.git', 'git.example.org/team/sub/tool'],
    ['git.example.org:c/d', 'git.example.org/c/d'],
    ['https://www.github.com/redis/redis/', 'github.com/redis/redis'],
  ])('admits %s, normalised to %s', (input, url) => {
    expect(readLocator(input, 'operator')).toEqual({ ok: true, url: { url, host: url.split('/')[0], segments: url.split('/').slice(1) }, userInformation: input.includes('@') });
  });

  it.each([
    ['https://user@git.example.org/a/b', CREDENTIALS],
    ['http://user:token@git.example.org/a/b', CREDENTIALS],
    ['git://u@git.example.org/a/b', CREDENTIALS],
    ['ssh://git:secret@git.example.org/a/b', COLON],
    ['ssh://git%40x@git.example.org/a/b', PERCENT],
    ['https://git%2eexample.org/a/b', PERCENT],
    ['https://git.example.org/a/b?private_token=x', QUERY],
    ['https://git.example.org/a/b#frag', QUERY],
    ['file:///srv/repo', FORM],
    ['ftp://h/a/b', FORM],
    ['ext::ssh h', FORM],
    ['/srv/repo', FORM],
    ['./repo', FORM],
    ['~/repo', FORM],
    ['', FORM],
    ['https://git.example.org/a b', FORM],
    ['https://git.example.org', PATH_RULE],
    ['https://git.example.org/a//b', PATH_RULE],
    ['https://git.example.org:x/a/b', PORT],
    ['https://[::1]/a/b', HOST_RULE],
    ['h:/a', 'admitted'],
    ['.h:a/b', 'admitted'],
    ['./x:y/z', FORM],
    ['/srv/x:y', FORM],
    ['h://a/b', FORM],
    ['git@h://a/b', SCP_PATH],
    ['ext::x/a/b', TRANSPORT],
    ['fd::3/a/b', TRANSPORT],
    ['persistent-https::h/a/b', TRANSPORT],
    ['testgit::/a/b', TRANSPORT],
  ])('%s is not admitted: %s', (input, rule) => {
    if (rule === 'admitted') { expect(readLocator(input, 'operator').ok).toBe(true); return; }
    expect(readLocator(input, 'operator')).toEqual({ ok: false, rule });
  });
});

describe('the remote-locator forms (046, line 17): what a remote URL may be', () => {
  it('removes the user information, whatever it holds, and says it was there', () => {
    expect(readLocator('https://user:token@git.example.org/a/b', 'remote')).toEqual({ ok: true, url: { url: 'git.example.org/a/b', host: 'git.example.org', segments: ['a', 'b'] }, userInformation: true });
    expect(readLocator('ssh://git:pw@git.example.org/a/b', 'remote')).toMatchObject({ ok: true, userInformation: true });
    expect(readLocator('https://git.example.org/a/b', 'remote')).toMatchObject({ ok: true, userInformation: false });
  });

  it('is never a locator with a query, a fragment, a percent-encoded user or host, another transport or a local path', () => {
    expect(readLocator('https://git.example.org/a/b?private_token=x', 'remote')).toEqual({ ok: false, rule: QUERY });
    expect(readLocator('https://u%3Ap@git.example.org/a/b', 'remote')).toEqual({ ok: false, rule: PERCENT });
    expect(readLocator('file:///srv/repo', 'remote')).toEqual({ ok: false, rule: FORM });
    expect(readLocator('/srv/repo', 'remote')).toEqual({ ok: false, rule: FORM });
    // Git's <transport>::<address> form (R-PDJA-33-SLICE-C-1 finding 1), user name or none.
    for (const input of ['ext::x/a/b', 'fd::3/a/b', 'persistent-https::h/a/b', 'testgit::/a/b', 'git@ext::x/a/b']) expect(readLocator(input, 'remote')).toEqual({ ok: false, rule: TRANSPORT });
  });
});

describe('the two-segment floor (046, line 15)', () => {
  it('a normalised path of one segment derives no identity, on any host', () => {
    expect(deriveIdentity(normaliseUrl('https://github.com/redis')!)).toBe(null);
    expect(deriveIdentity(normaliseUrl('git@git.example.org:tool.git')!)).toBe(null);
  });
});

describe('derivation', () => {
  it.each([
    ['https://github.com/redis/redis', 'repository:redis-redis'],
    ['https://github.com/tzeusy-org/syzygy.git', 'repository:tzeusy-org-syzygy'],
    ['https://gitlab.example.com/x/sub/name', 'repository:sub-name'],
    ['https://h.example/Owner/Repo+Plus%20x', 'repository:owner-repo-plus-20x'],
    ['https://h.example/o/foo_bar.js', 'repository:o-foo_bar.js'],
  ])('%s derives %s', (url, identity) => {
    expect(deriveIdentity(normaliseUrl(url)!)).toBe(identity);
  });

  it('derives nothing from a URL with one path segment', () => {
    expect(deriveIdentity(normaliseUrl('https://h.example/only')!)).toBe(null);
  });

  it('two repositories sharing their last two segments derive one identity (the third residual)', () => {
    expect(deriveIdentity(normaliseUrl('https://h/x/sub/name')!)).toBe('repository:sub-name');
    expect(deriveIdentity(normaliseUrl('https://h/y/sub/name')!)).toBe('repository:sub-name');
  });

  it('normalises the identity option the same way', () => {
    expect(normaliseIdentityOption('Repository:My Repo')).toBe('repository:my-repo');
    expect(normaliseIdentityOption('owner-name')).toBe('repository:owner-name');
    expect(normaliseIdentityOption('-x')).toBe(null);
  });
});

describe('the remote read: the one 047 read the default of, else origin, else the only remote', () => {
  const remotes = [{ name: 'upstream', url: 'https://h/u/r' }, { name: 'origin', url: 'https://h/o/r' }];
  it('takes the default remote first', () => expect(identityRemote(remotes, 'upstream')?.name).toBe('upstream'));
  it('else origin', () => expect(identityRemote(remotes, null)?.name).toBe('origin'));
  it('else the only remote', () => expect(identityRemote([{ name: 'fork', url: 'https://h/f/r' }], null)?.name).toBe('fork'));
  it('else none', () => expect(identityRemote([{ name: 'a', url: 'x' }, { name: 'b', url: 'y' }], null)).toBe(null));
});

describe('matching (an existing record, in any state, matches by identity, URL, the pinned revision or a parent)', () => {
  it('names each way a record matches', () => {
    const records = [
      rec('R1', 'repository:redis-redis', null, null),
      rec('R2', 'repository:other', 'github.com/redis/redis', null),
      rec('R3', 'repository:other', null, P, 'revoked'),
      rec('R4', 'repository:third', null, PARENT),
      rec('R5', 'repository:none', 'h/x/y', Q),
    ];
    const m = matchRecords(records, { identity: 'repository:redis-redis', url: 'github.com/redis/redis' }, P, [PARENT]);
    expect(m.map(x => [x.record.recordId, x.by])).toEqual([['R1', ['identity']], ['R2', ['url']], ['R3', ['revision']], ['R4', ['parent']]]);
  });
});

describe('the proposal', () => {
  const origin = [{ name: 'origin', url: 'https://github.com/redis/redis.git' }];
  const base = { remotes: origin, defaultRemote: 'origin', pinned: P, parents: [PARENT], records: [] as MatchableRecord[] };

  it('proposes the derived identity when no record matches', () => {
    const p = proposeIdentity(base);
    expect(p).toMatchObject({ ok: true, identity: 'repository:redis-redis', source: 'derived', url: 'github.com/redis/redis', urlSource: 'the clone\'s remote origin' });
  });

  it('keeps the identity every matching record carries, though the URL derives another (scenario "A changed URL keeps the recorded identity")', () => {
    const p = proposeIdentity({ ...base, records: [rec('R1', 'repository:old-name', 'github.com/old/name', PARENT)] });
    expect(p).toMatchObject({ ok: true, identity: 'repository:old-name', source: 'matching-records' });
  });

  it('refuses, proposing none, when matching records carry more than one identity and no option is given (scenario "Matching records disagree")', () => {
    const p = proposeIdentity({ ...base, records: [rec('R1', 'repository:a-a', 'github.com/redis/redis', null), rec('R2', 'repository:b-b', null, PARENT)] });
    expect(p.ok).toBe(false);
    if (!p.ok) {
      expect(p.reason).toBe('the matching records carry more than one identity, so Syzygy proposes none: R1 (repository:a-a, active; matched by url); R2 (repository:b-b, active; matched by parent); give the identity with --identity');
    }
  });

  it('takes the operator\'s option over every record, and names the matching records that do not carry it', () => {
    const p = proposeIdentity({ ...base, identityOption: 'mine', records: [rec('R1', 'repository:a-a', 'github.com/redis/redis', null)] });
    expect(p).toMatchObject({ ok: true, identity: 'repository:mine', source: 'operator-option' });
    if (p.ok) expect(p.notCarrying.map(m => m.record.recordId)).toEqual(['R1']);
  });

  it('a re-identified clone at an unnamed commit matches no earlier record (the first residual)', () => {
    const p = proposeIdentity({ ...base, remotes: [{ name: 'origin', url: 'https://h/new/place' }], records: [rec('R1', 'repository:redis-redis', 'github.com/redis/redis', Q, 'revoked')] });
    expect(p).toMatchObject({ ok: true, identity: 'repository:new-place', source: 'derived', matches: [] });
  });

  it('a clone with no remote needs both options', () => {
    expect(proposeIdentity({ ...base, remotes: [], defaultRemote: null })).toEqual({ ok: false, reason: 'the clone has no remote, so the operator must give --identity and --upstream', matches: [] });
    const p = proposeIdentity({ ...base, remotes: [], defaultRemote: null, identityOption: 'x-y', upstreamOption: 'git@h.example:X/Y.git' });
    expect(p).toMatchObject({ ok: true, identity: 'repository:x-y', url: 'h.example/x/y', urlSource: 'the operator\'s --upstream option' });
  });

  it('a remote URL with user information: removed before anything derives, and said so without printing it (scenario "Credentials in a remote URL")', () => {
    const p = proposeIdentity({ ...base, remotes: [{ name: 'origin', url: 'https://bob:hunter2@git.example.org/a/b.git' }] });
    expect(p).toEqual({ ok: true, identity: 'repository:a-b', source: 'derived', url: 'git.example.org/a/b', urlSource: 'the clone\'s remote origin', matches: [], notCarrying: [],
      locatorStatements: ['The URL of the clone\'s remote origin carried user information; Syzygy removed it before deriving anything and does not print, store or record it.'] });
    expect(JSON.stringify(p)).not.toContain('hunter2');
    expect(JSON.stringify(p)).not.toContain('bob');
  });

  it('the identity remote with several url lines, or none, refuses, naming it and the rule, and never falls through to another remote (R-PDJA-33-SLICE-C-1 finding 6)', () => {
    const fork = { name: 'fork', url: 'https://h/fork/repo' };
    const several = proposeIdentity({ ...base, remotes: [{ name: 'origin', url: null, urlLines: 2 }, fork], defaultRemote: null });
    expect(several).toEqual({ ok: false, matches: [],
      reason: 'the clone\'s remote origin, which the identity rule reads, has no one URL (it has 2 url lines, and the rule reads a remote with exactly one non-empty url), so it derives nothing, as for a clone with no remote; give --identity and --upstream' });
    // The only remote, counted with the one that has no URL: still that remote, never the other.
    const only = proposeIdentity({ ...base, remotes: [{ name: 'mirror', url: null, urlLines: 0 }], defaultRemote: null });
    expect(only).toMatchObject({ ok: false, reason: 'the clone\'s remote mirror, which the identity rule reads, has no one URL (it has 0 url lines, and the rule reads a remote with exactly one non-empty url), so it derives nothing, as for a clone with no remote; give --identity and --upstream' });
    const given = proposeIdentity({ ...base, remotes: [{ name: 'origin', url: null, urlLines: 2 }, fork], defaultRemote: null, identityOption: 'x-y', upstreamOption: 'https://h.example/x/y' });
    expect(given).toMatchObject({ ok: true, identity: 'repository:x-y', urlSource: 'the operator\'s --upstream option',
      locatorStatements: ['The clone\'s remote origin has no one URL to read, so it derives nothing: it has 2 url lines, and the rule reads a remote with exactly one non-empty url. Syzygy does not print, store or record its URLs.'] });
  });

  it('a remote URL that is no remote locator derives nothing, names the remote and the rule, never the URL (scenario "Remote URL that is not a locator")', () => {
    const remotes = [{ name: 'origin', url: 'https://git.example.org/a/b?private_token=x' }];
    const p = proposeIdentity({ ...base, remotes });
    expect(p).toEqual({ ok: false, reason: 'the URL of the clone\'s remote origin is not a remote locator (it carries a query or a fragment), so it derives nothing, as for a clone with no remote; give --identity and --upstream', matches: [] });
    const given = proposeIdentity({ ...base, remotes, identityOption: 'c-d', upstreamOption: 'https://git.example.org/c/d' });
    expect(given).toMatchObject({ ok: true, identity: 'repository:c-d', url: 'git.example.org/c/d', urlSource: 'the operator\'s --upstream option',
      locatorStatements: ['The URL of the clone\'s remote origin is not a remote locator, so it derives nothing: it carries a query or a fragment. Syzygy does not print, store or record it.'] });
    expect(JSON.stringify(given)).not.toContain('private_token');
  });

  it('an --upstream that is not admitted is refused by its rule, never printed (scenarios "Credentials in a given URL", "Locator not admitted")', () => {
    for (const [upstream, rule] of [['https://u:p@git.example.org/a/b', 'an https://, http:// or git:// locator carries no user information'], ['file:///srv/x', 'it is not in an admitted locator form (https://, http://, git:// or ssh:// with a host and a path, or the scp form [user@]host:path); file URLs, other transports and local paths are not admitted']] as const) {
      const p = proposeIdentity({ ...base, remotes: [], defaultRemote: null, identityOption: 'x-y', upstreamOption: upstream });
      expect(p).toEqual({ ok: false, reason: `the --upstream URL is not admitted: ${rule}; it is not printed, stored or recorded`, matches: [] });
    }
  });

  it('the two-segment floor: a one-segment URL proposes nothing without --identity, whatever the records carry', () => {
    const remotes = [{ name: 'origin', url: 'https://git.example.org/tool.git' }];
    expect(proposeIdentity({ ...base, remotes })).toEqual({ ok: false, reason: 'the normalised URL git.example.org/tool has fewer than two path segments, so no identity derives from it; give --identity', matches: [] });
    const withRecord = proposeIdentity({ ...base, remotes, records: [rec('R1', 'repository:t-t', null, PARENT)] });
    expect(withRecord.ok).toBe(false);
    expect(proposeIdentity({ ...base, remotes, identityOption: 'tool' })).toMatchObject({ ok: true, identity: 'repository:tool', url: 'git.example.org/tool' });
  });

  it('GitHub identities keep their form (scenario), and other hosts take the last two segments (scenario "Locator on another host over ssh")', () => {
    // A user name alone is user information too (046, line 17: "Where a remote URL carried user information, the launch output SHALL say so").
    expect(proposeIdentity({ ...base, remotes: [{ name: 'origin', url: 'ssh://git@github.com/redis/redis.git' }] })).toMatchObject({ ok: true, identity: 'repository:redis-redis', url: 'github.com/redis/redis',
      locatorStatements: ['The URL of the clone\'s remote origin carried user information; Syzygy removed it before deriving anything and does not print, store or record it.'] });
    expect(proposeIdentity({ ...base, remotes: [{ name: 'origin', url: 'https://github.com/redis/redis' }] })).toMatchObject({ ok: true, identity: 'repository:redis-redis', url: 'github.com/redis/redis', locatorStatements: [] });
    expect(proposeIdentity({ ...base, remotes: [{ name: 'origin', url: 'git@git.example.org:team/sub/tool.git' }] })).toMatchObject({ ok: true, identity: 'repository:sub-tool', url: 'git.example.org/team/sub/tool' });
    for (const url of ['git://git.example.org/a/b.git', 'http://git.example.org/a/b']) {
      expect(proposeIdentity({ ...base, remotes: [{ name: 'origin', url }] })).toMatchObject({ ok: true, identity: 'repository:a-b', url: 'git.example.org/a/b' });
    }
  });
});
