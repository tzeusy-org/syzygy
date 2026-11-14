import { describe, expect, it } from 'vitest';
import { carriesUserInformation, deriveIdentity, remoteUserInformationStatement, identityRemote, isNormalisedLocator, matchRecords, normaliseIdentityOption, normaliseUrl, proposeIdentity, readLocator, type MatchableRecord } from './launch-identity.js';

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
const HOST_RULE = 'its host is empty, or is neither a host name (ASCII letters, digits, ".", "-" and "_", or a Unicode name that IDNA maps to one), nor a bracketed IPv6 address literal';
const PORT = 'its port is not a decimal number';
const PATH_RULE = 'it names no path, or its path has an empty segment once normalised';
const SCP_PATH = 'its scp-form path begins with "//"';
const SCP_HOST = 'its scp-form host is a bracketed address: an scp-form host holds no ":" (046, line 17), so an IPv6 literal is admitted only in an https://, http://, git:// or ssh:// URL';
const TRANSPORT = 'it is in Git\'s <transport>::<address> form (an scp-form path beginning with ":"), which names another transport';

describe('a Unicode host normalises by IDNA to its punycode form, so every spelling of one host matches (owner ruling 2026-11-14)', () => {
  it('upper or lower case, composed or decomposed, or already punycode: one normalised URL', () => {
    const urls = ['https://B\u00dcCHER.de/a/b', 'https://b\u00fccher.de/a/b', 'https://bu\u0308cher.de/a/b', 'https://xn--bcher-kva.de/a/b', 'https://www.b\u00fccher.de:/a/b']
      .map(u => readLocator(u, 'operator')).map(r => (r.ok ? r.url.url : r.rule));
    expect(urls).toEqual(['xn--bcher-kva.de/a/b', 'xn--bcher-kva.de/a/b', 'xn--bcher-kva.de/a/b', 'xn--bcher-kva.de/a/b', 'xn--bcher-kva.de/a/b']);
    expect(normaliseUrl('git@b\u00fccher.de:a/b')?.url).toBe('xn--bcher-kva.de/a/b');
    expect(isNormalisedLocator('xn--bcher-kva.de/a/b')).toBe(true);
    expect(isNormalisedLocator('[::1]/a/b')).toBe(true);
    expect(isNormalisedLocator('b\u00fccher.de/a/b')).toBe(false);   // a stored URL is the normalised (punycode) form
    expect(isNormalisedLocator('[0::1]/a/b')).toBe(false);
  });

  it('one rule for ASCII and non-ASCII names alike (R-PDJA-33-RULINGS-1 finding 2): an IPv4 spelling and an xn-- label are read the same either way', () => {
    const read = (u: string) => { const r = readLocator(u, 'operator'); return r.ok ? r.url.url : r.rule; };
    // A name that parses as an IPv4 address is its dotted-decimal form, in ASCII or fullwidth digits.
    expect(['https://0x7f.1/a/b', 'https://\uff10x7f.1/a/b', 'https://127.0.0.1/a/b', 'https://0177.0.0.1/a/b'].map(read)).toEqual(['127.0.0.1/a/b', '127.0.0.1/a/b', '127.0.0.1/a/b', '127.0.0.1/a/b']);
    // An xn-- label that decodes to nothing is no host, in an ASCII name as in a Unicode one.
    expect(['https://xn--zz.de/a/b', 'https://\u00fc.xn--zz/a/b'].map(read)).toEqual([HOST_RULE, HOST_RULE]);
    // A name that only looks numeric, or a number out of range, is no host.
    expect(['https://999.1.1.1/a/b', 'https://foo.123/a/b'].map(read)).toEqual([HOST_RULE, HOST_RULE]);
    // Plain ASCII names keep their spelling, case-folded; an underscore stays.
    expect(['https://GitHub.COM/a/b', 'https://my_host.example/a/b', 'git@GitLab.Example.co.uk:a/b'].map(read)).toEqual(['github.com/a/b', 'my_host.example/a/b', 'gitlab.example.co.uk/a/b']);
    expect(isNormalisedLocator('0x7f.1/a/b')).toBe(false);
  });

  it('a host\'s normalisation never changes the identity: it is derived from the path alone', () => {
    for (const host of ['0x7f.1', '127.0.0.1', 'b\u00fccher.de', 'GitHub.com']) {
      const url = normaliseUrl(`https://${host}/Redis/Redis.git`);
      expect(url === null ? null : deriveIdentity(url)).toBe('repository:redis-redis');
    }
  });
});

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
    // Widened by the owner, 2026-11-14: an empty port, a bracketed IPv6 literal (canonical form), a Unicode host (IDNA, to punycode).
    ['https://github.com:/a/b', 'github.com/a/b'],
    ['https://[::1]/a/b', '[::1]/a/b'],
    ['ssh://git@[0:0:0::1]:22/a/b', '[::1]/a/b'],
    ['https://[2001:DB8::0:1]:/a/b', '[2001:db8::1]/a/b'],
    ['https://b\u00fccher.de/a/b', 'xn--bcher-kva.de/a/b'],
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
    ['https://git.example.org//a/b', PATH_RULE],
    ['ssh://git@git.example.org:22//a/b', PATH_RULE],
    ['git@h:/a/b', 'admitted'],
    ['https://git.example.org:x/a/b', PORT],
    ['https://[::1/a/b', HOST_RULE],
    ['https://[zz::1]/a/b', HOST_RULE],
    ['https://[]/a/b', HOST_RULE],
    ['https://[::1]x/a/b', PORT],
    ['https://[::1]:x/a/b', PORT],
    // 046's scp host holds no ":": a bracketed scp host is refused by name, with or without a user, an IPv6 literal or not.
    ['git@[::1]:a/b', SCP_HOST],
    ['[::1]:a/b', SCP_HOST],
    ['git@[::1]::x', SCP_HOST],
    ['[github.com]:a/b', SCP_HOST],
    ['[a]/b:c', FORM],                      // a "/" before the ":": a local path
    ['https://b\u00fc_cher\u2603\u0000.de/a/b', FORM],
    ['https://xn--zz\u00fc.de/a/b', HOST_RULE],   // IDNA maps it to no name
    ['https://\u00fc:1:2/a/b', HOST_RULE],      // the name before the port holds a ':'
    ['ssh://\u00fc]x/a/b', HOST_RULE],
    ['https://\u00fc!.de/a/b', HOST_RULE],       // IDNA maps it to xn--!-dha.de, which is no host name
    ['https://\u00fc%2ecom/a/b', PERCENT],       // refused before IDNA, which would percent-decode it to xn--tda.com
    ['https://xn--bcher-kva.de/a/b', 'admitted'],
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

  it('a remote URL with user information: removed before anything derives, printed nowhere (scenario "Credentials in a remote URL"); the launch says so from the clone step', () => {
    const p = proposeIdentity({ ...base, remotes: [{ name: 'origin', url: 'https://bob:hunter2@git.example.org/a/b.git', userInformation: true }] });
    expect(p).toEqual({ ok: true, identity: 'repository:a-b', source: 'derived', url: 'git.example.org/a/b', urlSource: 'the clone\'s remote origin', matches: [], notCarrying: [],
      locatorStatements: [] });
    expect(JSON.stringify(p)).not.toContain('hunter2');
    expect(JSON.stringify(p)).not.toContain('bob');
  });

  it('the identity\'s first-character rule, narrower than 046 states, is named in each refusal it causes, --identity\'s included (R-PDJA-33-SLICE-C-1 finding 5)', () => {
    const RULE = 'Syzygy admits only an identity whose part after "repository:" opens with a letter or a digit once case-folded and every other character replaced by "-", a rule narrower than REQ-polaris-generation-046 states, which applies to --identity as to a derived identity';
    expect(proposeIdentity({ ...base, remotes: [{ name: 'origin', url: 'https://h.example/_org/x' }] })).toEqual({ ok: false, matches: [],
      reason: `no identity derives from the normalised URL h.example/_org/x: its last two segments, joined and replaced, do not open with a letter or digit, and ${RULE}; give --identity` });
    expect(proposeIdentity({ ...base, identityOption: '-x' })).toMatchObject({ ok: false, reason: `--identity cannot name a repository identity: ${RULE}` });
  });

  it('the identity remote with several url lines, or none, refuses, naming it and the rule, and never falls through to another remote (R-PDJA-33-SLICE-C-1 finding 6)', () => {
    const fork = { name: 'fork', url: 'https://h/fork/repo' };
    const several = proposeIdentity({ ...base, remotes: [{ name: 'origin', url: null, urlLines: 2 }, fork], defaultRemote: null });
    expect(several).toEqual({ ok: false, matches: [],
      reason: 'the clone\'s remote origin, which the identity rule reads, has no one URL (it has 2 url lines, and the rule reads a remote with exactly one non-empty url), so it derives nothing, as for a clone with no remote; give --identity and --upstream',
      locatorStatements: ['The clone\'s remote origin has no one URL to read, so it derives nothing: it has 2 url lines, and the rule reads a remote with exactly one non-empty url. Syzygy does not print, store or record its URLs.'] });
    // The only remote, counted with the one that has no URL: still that remote, never the other.
    const only = proposeIdentity({ ...base, remotes: [{ name: 'mirror', url: null, urlLines: 0 }], defaultRemote: null });
    expect(only).toMatchObject({ ok: false, reason: 'the clone\'s remote mirror, which the identity rule reads, has no one URL (it has 0 url lines, and the rule reads a remote with exactly one non-empty url), so it derives nothing, as for a clone with no remote; give --identity and --upstream' });
    const given = proposeIdentity({ ...base, remotes: [{ name: 'origin', url: null, urlLines: 2 }, fork], defaultRemote: null, identityOption: 'x-y', upstreamOption: 'https://h.example/x/y' });
    expect(given).toMatchObject({ ok: true, identity: 'repository:x-y', urlSource: 'the operator\'s --upstream option',
      locatorStatements: ['The clone\'s remote origin has no one URL to read, so it derives nothing: it has 2 url lines, and the rule reads a remote with exactly one non-empty url. Syzygy does not print, store or record its URLs.'] });
  });

  it('the user-information statement, for the remote the identity rule reads, whatever its URL then fares (R-PDJA-33-SLICE-CD-3 finding 1)', () => {
    const SEVERAL = 'A url line of the clone\'s remote origin carried user information; Syzygy does not print, store or record it, and reads none of that remote\'s URLs as a locator.';
    expect(remoteUserInformationStatement([{ name: 'origin', url: 'https://x/a/b', userInformation: true }], null)).toBe('The URL of the clone\'s remote origin carried user information; Syzygy does not print, store or record it, and removes it before deriving anything from that URL.');
    expect(remoteUserInformationStatement([{ name: 'origin', url: null, urlLines: 2, userInformation: true }], null)).toBe(SEVERAL);
    expect(remoteUserInformationStatement([{ name: 'origin', url: 'https://x/a/b' }], null)).toBeNull();
    // The identity remote alone: the default's remote, else origin, else the only remote; another remote's user information is not it.
    const two = [{ name: 'origin', url: 'https://x/a/b' }, { name: 'up', url: 'https://x/c/d', userInformation: true }];
    expect(remoteUserInformationStatement(two, null)).toBeNull();
    expect(remoteUserInformationStatement(two, 'up')).toBe('The URL of the clone\'s remote up carried user information; Syzygy does not print, store or record it, and removes it before deriving anything from that URL.');
    expect(remoteUserInformationStatement([{ name: 'fork', url: 'https://x/c/d', userInformation: true }], null)).toBe('The URL of the clone\'s remote fork carried user information; Syzygy does not print, store or record it, and removes it before deriving anything from that URL.');
    expect(remoteUserInformationStatement([{ name: 'a', url: 'https://x', userInformation: true }, { name: 'b', url: 'https://y' }], null)).toBeNull();
    // The proposal itself carries only what the URL reading says.
    expect(proposeIdentity({ ...base, remotes: [{ name: 'origin', url: null, urlLines: 2, userInformation: true }], defaultRemote: null })).toMatchObject({ ok: false, locatorStatements: [
      'The clone\'s remote origin has no one URL to read, so it derives nothing: it has 2 url lines, and the rule reads a remote with exactly one non-empty url. Syzygy does not print, store or record its URLs.',
    ] });
  });

  it('whether a URL carries user information: an @ in a scheme URL\'s authority, which ends at the first /, ? or #, or an scp-form user (R-PDJA-33-SLICE-CD-3 findings 3 and 4)', () => {
    expect([
      'https://bob:pw@h/a/b', 'ssh://bob@h/a/b', 'git@h:a/b', 'https://bob:pw@h', 'https://bob:pw@h?x=1', 'ftp://bob:pw@h/a', 'https://bob%41:pw@h/a',
      'https://h/a@b', 'h:a/b', 'https://h/a/b', 'https://h', 'https://h?x@y/a/b', 'https://h#@/a', 'file:///x@y/z', 'not a url',
    ].map(carriesUserInformation)).toEqual([true, true, true, true, true, true, true, false, false, false, false, false, false, false, false]);
  });

  it('a remote URL that is no remote locator derives nothing, names the remote and the rule, never the URL (scenario "Remote URL that is not a locator")', () => {
    const remotes = [{ name: 'origin', url: 'https://git.example.org/a/b?private_token=x' }];
    const p = proposeIdentity({ ...base, remotes });
    expect(p).toEqual({ ok: false, reason: 'the URL of the clone\'s remote origin is not a remote locator (it carries a query or a fragment), so it derives nothing, as for a clone with no remote; give --identity and --upstream', matches: [],
      locatorStatements: ['The URL of the clone\'s remote origin is not a remote locator, so it derives nothing: it carries a query or a fragment. Syzygy does not print, store or record it.'] });
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
      locatorStatements: [] });
    expect(proposeIdentity({ ...base, remotes: [{ name: 'origin', url: 'https://github.com/redis/redis' }] })).toMatchObject({ ok: true, identity: 'repository:redis-redis', url: 'github.com/redis/redis', locatorStatements: [] });
    expect(proposeIdentity({ ...base, remotes: [{ name: 'origin', url: 'git@git.example.org:team/sub/tool.git' }] })).toMatchObject({ ok: true, identity: 'repository:sub-tool', url: 'git.example.org/team/sub/tool' });
    for (const url of ['git://git.example.org/a/b.git', 'http://git.example.org/a/b']) {
      expect(proposeIdentity({ ...base, remotes: [{ name: 'origin', url }] })).toMatchObject({ ok: true, identity: 'repository:a-b', url: 'git.example.org/a/b' });
    }
  });
});
