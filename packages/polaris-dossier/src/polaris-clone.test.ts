import { describe, expect, it } from 'vitest';
import { cliVisibilityOf } from './cli.js';
import { onlyConsentMissing, supervisorClone, trunkOf, urlSlug, type CloneDeps } from './polaris.js';
import type { VisibilityDecision } from './source-visibility-gate.js';

/** `syzygy polaris` without `--clone` makes its own one-commit clone, fetching from the URL (screening scope version 8, edit 4: for a
 * private repository Syzygy fetches nothing). Git and the file system are injected, so nothing here starts a process; each case records
 * every git command the step would have run. */

const COMMIT = 'a'.repeat(40);
const CHOSEN = { label: 'trunk', commit: COMMIT };
const URL = 'https://example.invalid/o/r';
const deps = (head: { status: number; stdout: string } = { status: 128, stdout: '' }, exists = false) => {
  const ran: string[][] = [];
  const d: CloneDeps = {
    git: args => { ran.push([...args]); return args.includes('rev-parse') ? { ...head, stderr: '' } : { status: 0, stdout: '', stderr: '' }; },
    exists: () => exists, mkdir: () => undefined, event: () => undefined,
  };
  return { d, ran, fetched: () => ran.some(args => args.includes('fetch')) };
};
const decided = (decision: VisibilityDecision) => async () => decision;
const input = (visibilityOf: Parameters<typeof supervisorClone>[0]['visibilityOf'], repositoryId: unknown = 'o-r') =>
  ({ url: URL, repositoryId, chosen: CHOSEN, clonesRoot: '/clones', visibilityOf });

describe('supervisorClone', () => {
  it('fetches a public pair: init, a depth-1 fetch of the commit, a detached checkout', async () => {
    const { d, ran } = deps();
    expect(await supervisorClone(input(decided({ ok: true, visibility: 'public', carriers: [] })), d)).toEqual({ clone: '/clones/o-r-trunk' });
    expect(ran).toEqual([
      ['-C', '/clones/o-r-trunk', 'rev-parse', 'HEAD'],
      ['init', '-q', '/clones/o-r-trunk'],
      ['-C', '/clones/o-r-trunk', 'fetch', '-q', '--depth=1', URL, COMMIT],
      ['-C', '/clones/o-r-trunk', 'checkout', '-q', '--detach', 'FETCH_HEAD'],
    ]);
  });
  it.each([
    ['a private pair', decided({ ok: true, visibility: 'private', carriers: [] }), 'repository:o-r is private at this commit'],
    ['an undecidable pair', decided({ ok: false, why: 'a launch consent record cannot be read' }), 'cannot be decided (a launch consent record cannot be read)'],
    ['no decision port', undefined, 'no visibility decision is wired'],
  ] as const)('refuses %s before any fetch, naming --clone, and runs nothing but the head probe', async (_name, visibilityOf, message) => {
    const { d, ran, fetched } = deps();
    const out = await supervisorClone(input(visibilityOf), d);
    expect(typeof out === 'string' && out).toContain(message);
    expect(typeof out === 'string' && out).toContain('pass --clone <dir>');
    expect(fetched()).toBe(false);
    expect(ran).toEqual([['-C', '/clones/o-r-trunk', 'rev-parse', 'HEAD']]);
  });
  it('reuses a clone already at the commit and fetches nothing, whatever the visibility', async () => {
    const { d, fetched } = deps({ status: 0, stdout: `${COMMIT}\n` });
    expect(await supervisorClone(input(decided({ ok: true, visibility: 'private', carriers: [] })), d)).toEqual({ clone: '/clones/o-r-trunk' });
    expect(fetched()).toBe(false);
  });
  it('refuses a clone at another commit, never reusing it, and fetches nothing', async () => {
    const { d, fetched } = deps({ status: 0, stdout: `${'b'.repeat(40)}\n` }, true);
    const out = await supervisorClone(input(decided({ ok: true, visibility: 'public', carriers: [] })), d);
    expect(out).toBe(`/clones/o-r-trunk exists but is not a clone of ${COMMIT}; remove it or pass --clone`);
    expect(fetched()).toBe(false);
  });
  it('refuses a path that holds something else, before asking visibility', async () => {
    const { d, fetched } = deps({ status: 128, stdout: '' }, true);
    let asked = false;
    const out = await supervisorClone(input(async () => { asked = true; return { ok: true, visibility: 'public', carriers: [] }; }), d);
    expect(out).toBe(`/clones/o-r-trunk exists but is not a clone of ${COMMIT}; remove it or pass --clone`);
    expect([asked, fetched()]).toEqual([false, false]);
  });
});

describe('supervisorClone for a repository trunkOf read anonymously', () => {
  it('fetches with no visibility record at all', async () => {
    const { d, fetched } = deps();
    const out = await supervisorClone({ ...input(undefined, null), publicByProbe: true }, d);
    expect(out).toEqual({ clone: '/clones/o-r-trunk' });
    expect(fetched()).toBe(true);
  });
  it('still refuses without the probe when no decision is wired', async () => {
    const { d, fetched } = deps();
    const out = await supervisorClone(input(undefined, null), d);
    expect(typeof out === 'string' && out).toContain('pass --clone <dir>');
    expect(fetched()).toBe(false);
  });
});

describe('trunkOf: the commit a run pins with no --revision', () => {
  const git = (r: { status: number; stdout: string; stderr?: string }) => {
    const ran: string[][] = [];
    return { ran, deps: { git: (args: readonly string[]) => { ran.push([...args]); return { stderr: '', ...r }; } } };
  };
  it('reads the remote HEAD with no credential helper', () => {
    const { ran, deps: d } = git({ status: 0, stdout: `${COMMIT}\tHEAD\n` });
    expect(trunkOf(URL, d)).toEqual({ commit: COMMIT });
    expect(ran).toEqual([['-c', 'credential.helper=', 'ls-remote', URL, 'HEAD']]);
  });
  it('refuses a URL that does not answer without a credential, naming --clone', () => {
    const out = trunkOf(URL, git({ status: 128, stdout: '', stderr: 'Authentication failed' }).deps);
    expect(typeof out === 'string' && out).toContain('Authentication failed');
    expect(typeof out === 'string' && out).toContain('--clone <dir>');
  });
  it('refuses an answer with no HEAD line', () => {
    expect(trunkOf(URL, git({ status: 0, stdout: `${COMMIT}\trefs/heads/x\n` }).deps)).toBe(`${URL} names no HEAD commit`);
  });
});

describe('onlyConsentMissing: the one gate D10 retired', () => {
  it('is true when every missing gate is an observation-consent record', () => {
    expect(onlyConsentMissing({ missing: ['observation consent: none in force'] })).toBe(true);
  });
  it.each([
    ['another gate missing too', { missing: ['observation consent: none', 'screening policy: absent'] }],
    ['only another gate', { missing: ['registry entry: absent'] }],
    ['nothing missing', { missing: [] }],
    ['no list', {}],
  ])('is false with %s', (_name, doc) => {
    expect(onlyConsentMissing(doc)).toBe(false);
  });
});

describe('urlSlug', () => {
  it.each([
    ['https://github.com/tzeusy-org/butlers', 'tzeusy-org-butlers'],
    ['https://github.com/redis/redis.git', 'redis-redis'],
    ['git@github.com:o/r.git', 'o-r'],
  ])('%s → %s', (url, slug) => { expect(urlSlug(url)).toBe(slug); });
});

describe('cliVisibilityOf: the decision the supervisor fetches by', () => {
  const injected = async (): Promise<VisibilityDecision> => ({ ok: true, visibility: 'public', carriers: [] });
  it('is the injected decision when one is given', () => {
    expect(cliVisibilityOf({ visibilityOf: injected })).toBe(injected);
  });
  it('is none, so nothing is fetched, when the gate sources are injected and no decision is', () => {
    expect(cliVisibilityOf({ sources: {} as never })).toBeUndefined();
  });
  it('is this checkout\'s own decision when nothing is injected', () => {
    expect(typeof cliVisibilityOf({})).toBe('function');
  });
});
