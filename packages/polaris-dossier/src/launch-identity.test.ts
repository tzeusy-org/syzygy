import { describe, expect, it } from 'vitest';
import { deriveIdentity, identityRemote, matchRecords, normaliseIdentityOption, normaliseUrl, proposeIdentity, type MatchableRecord } from './launch-identity.js';

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
