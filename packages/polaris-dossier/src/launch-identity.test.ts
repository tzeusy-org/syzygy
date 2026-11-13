import { describe, expect, it } from 'vitest';
import { deriveIdentity, identityRemote, matchRecords, normaliseIdentityOption, normaliseUrl, proposeIdentity, readLocator, type MatchableRecord } from './launch-identity.js';

/** REQ-polaris-generation-046, line 15: the identity proposal rule. Expected values are literals written from the clause, never computed
 * by the module under test. */

const P = 'a'.repeat(40), Q = 'b'.repeat(40), PARENT = 'c'.repeat(40);
const rec = (recordId: string, identity: string, normalisedUrl: string | null, revision: string | null, state = 'active'): MatchableRecord =>
  ({ recordId, identity, normalisedUrl, revision, state });

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
    ['h://a/b', FORM],
    ['git@h://a/b', SCP_PATH],
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
});
