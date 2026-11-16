import { describe, expect, it } from 'vitest';
import { cliVisibilityOf } from './cli.js';
import { supervisorClone, type CloneDeps } from './polaris.js';
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
