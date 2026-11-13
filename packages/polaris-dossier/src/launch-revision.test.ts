import { describe, expect, it } from 'vitest';
import type { CloneSnapshot, RefValue } from './launch-clone.js';
import { pinLaunchRevision, quote } from './launch-revision.js';

/** REQ-polaris-generation-047: the pin, from fabricated snapshots of a clone's references (the snapshot reader is exercised against real
 * clones in launch.test.ts). Every expected pin, reference and refusal is a literal written from the clause. */

const A = 'a'.repeat(40), B = 'b'.repeat(40), C = 'c'.repeat(40), D = 'd'.repeat(40), E = 'e'.repeat(40);
const oid = (o: string): RefValue => ({ kind: 'oid', oid: o });
const sym = (target: string): RefValue => ({ kind: 'symbolic', target });
const snap = (head: RefValue, refs: Record<string, RefValue>, more: { names?: readonly string[]; objectFormat?: string } = {}): CloneSnapshot =>
  ({ gitDir: '/c/.git', head, names: new Set([...Object.keys(refs), ...(more.names ?? [])]), refs: new Map(Object.entries(refs)), remotes: [], objectFormat: more.objectFormat ?? 'sha1', alternates: false, bare: null, worktree: null });
let listings = 0;
const STORED = [A, B, C, D, 'abcd'.repeat(10), `abcd${'e'.repeat(36)}`];
const ports = { storedIds: async () => { listings += 1; return new Set(STORED); }, isCommit: async (o: string) => o !== D };
const pin = (snapshot: CloneSnapshot, more: { revision?: string; headConsented?: boolean; stored?: readonly string[] } = {}) =>
  pinLaunchRevision({ clone: '/c', snapshot, headConsented: more.headConsented ?? false, ...(more.revision === undefined ? {} : { revision: more.revision }) },
    more.stored === undefined ? ports : { ...ports, storedIds: async () => { listings += 1; return new Set(more.stored); } });
/** How many times `act` listed the store's identifiers (read (5)). */
const listingsOf = async (act: () => Promise<unknown>): Promise<number> => { const before = listings; await act(); return listings - before; };

describe('REQ-polaris-generation-047', () => {
  it('existing consent at HEAD keeps today\'s behaviour: pins HEAD, does not refuse for the trunk tip', async () => {
    expect(await pin(snap(oid(A), { 'refs/remotes/origin/HEAD': sym('refs/remotes/origin/main'), 'refs/remotes/origin/main': oid(B) }), { headConsented: true }))
      .toEqual({ ok: true, pinned: { kind: 'head-consented', commit: A } });
  });

  it('defaults to the remote default branch\'s tip', async () => {
    const s = snap(sym('refs/heads/main'), { 'refs/heads/main': oid(B), 'refs/remotes/origin/HEAD': sym('refs/remotes/origin/main'), 'refs/remotes/origin/main': oid(B) });
    expect(await pin(s)).toEqual({ ok: true, pinned: { kind: 'pinned', commit: B, via: 'refs/remotes/origin/HEAD -> refs/remotes/origin/main', remote: 'origin' } });
  });

  it('else main, else master', async () => {
    expect(await pin(snap(oid(A), { 'refs/heads/main': oid(A), 'refs/heads/master': oid(B) }))).toMatchObject({ ok: true, pinned: { commit: A, via: 'refs/heads/main' } });
    expect(await pin(snap(oid(B), { 'refs/heads/master': oid(B) }))).toMatchObject({ ok: true, pinned: { commit: B, via: 'refs/heads/master' } });
  });

  it('no trunk: refuses before asking, naming --revision', async () => {
    expect(await pin(snap(oid(A), { 'refs/heads/dev': oid(A) }))).toEqual({ ok: false, refusal: { stage: 'revision',
      reason: 'the clone records no remote default branch and has neither a main nor a master branch; name the revision with --revision' } });
  });

  it('HEAD elsewhere: refuses before asking and prints the one checkout command', async () => {
    expect(await pin(snap(oid(A), { 'refs/heads/main': oid(B) }))).toEqual({ ok: false, refusal: { stage: 'head',
      reason: `the clone's HEAD is ${A}, not the pinned revision ${B} (refs/heads/main); Syzygy does not change the checkout`,
      command: `git -C '/c' checkout --detach ${B}` } });
  });

  it('an explicit revision: full, abbreviated or a reference, resolved once', async () => {
    expect(await pin(snap(oid(C), {}), { revision: C })).toMatchObject({ ok: true, pinned: { commit: C, via: `--revision ${C}` } });
    expect(await pin(snap(oid(C), {}), { revision: 'cccc' })).toMatchObject({ ok: true, pinned: { commit: C } });
    expect(await pin(snap(oid(B), { 'refs/tags/v1': oid(B) }), { revision: 'v1' })).toMatchObject({ ok: true, pinned: { commit: B, via: '--revision v1' } });
  });

  it('--revision HEAD names the clone\'s HEAD, detached or through its admitted reference, and lists no store', async () => {
    expect(await listingsOf(async () => expect(await pin(snap(oid(C), {}), { revision: 'HEAD' })).toMatchObject({ ok: true, pinned: { commit: C, via: '--revision HEAD' } }))).toBe(0);
    expect(await pin(snap(sym('refs/heads/main'), { 'refs/heads/main': oid(B) }), { revision: 'HEAD' })).toMatchObject({ ok: true, pinned: { commit: B, via: '--revision HEAD' } });
    // A HEAD whose reference's value is not admitted is refused naming it, as any symbolic --revision is.
    expect(await pin(snap(sym('refs/heads/gone'), {}, { names: ['refs/heads/gone'] }), { revision: 'HEAD' })).toMatchObject({ ok: false, refusal: { stage: 'revision' } });
  });

  it('refuses a name that resolves to no object identifier, or to more than one', async () => {
    expect(await pin(snap(oid(A), {}), { revision: 'ffff' })).toEqual({ ok: false, refusal: { stage: 'revision', reason: '--revision "ffff" resolves to no object identifier' } });
    expect(await pin(snap(oid(A), {}), { revision: 'abcd' })).toEqual({ ok: false, refusal: { stage: 'revision', reason: '--revision "abcd" is ambiguous: it resolves to 2 objects' } });
    expect(await pin(snap(oid(D), {}), { revision: D })).toEqual({ ok: false, refusal: { stage: 'revision', reason: `--revision ${D} resolves to ${D}, which is not a commit the clone's store holds` } });
  });

  it('several remote defaults and none origin: no one remote default, refused naming --revision', async () => {
    const s = snap(oid(A), { 'refs/remotes/a/HEAD': sym('refs/remotes/a/main'), 'refs/remotes/a/main': oid(A), 'refs/remotes/b/HEAD': sym('refs/remotes/b/main'), 'refs/remotes/b/main': oid(A) });
    expect(await pin(s)).toEqual({ ok: false, refusal: { stage: 'revision', reason: 'the remotes a, b each record a default branch and none is origin, so the clone records no one remote default; name the revision with --revision' } });
  });

  it('read (5): the store is listed for an abbreviated --revision alone, never for a full identifier', async () => {
    expect(await listingsOf(() => pin(snap(oid(C), {}), { revision: C }))).toBe(0);
    expect(await listingsOf(() => pin(snap(oid(C), {}), { revision: 'cccc' }))).toBe(1);
    expect(await listingsOf(() => pin(snap(oid(B), { 'refs/tags/v1': oid(B) }), { revision: 'v1' }))).toBe(0);
    expect(await listingsOf(() => pin(snap(oid(C), {}), { revision: 'ccc' }))).toBe(0);   // shorter than Git's four digits: not an abbreviation
  });

  it('a full identifier names itself, even one the store does not list: a mismatch fails closed later, not here', async () => {
    expect(await pin(snap(oid(E), {}), { revision: E, stored: [] })).toEqual({ ok: true, pinned: { kind: 'pinned', commit: E, via: `--revision ${E}`, remote: null } });
  });

  it('the width is the configuration\'s object format: 40 digits abbreviate in a SHA-256 clone, 64 are full', async () => {
    const S1 = `${'1'.repeat(40)}${'2'.repeat(24)}`, S2 = `${'1'.repeat(40)}${'3'.repeat(24)}`;
    const sha256 = snap({ kind: 'oid', oid: S1 }, {}, { objectFormat: 'sha256' });
    expect(await listingsOf(() => pin(sha256, { revision: '1'.repeat(40), stored: [S1, S2] }))).toBe(1);
    expect(await pin(sha256, { revision: '1'.repeat(40), stored: [S1, S2] })).toEqual({ ok: false, refusal: { stage: 'revision', reason: `--revision "${'1'.repeat(40)}" is ambiguous: it resolves to 2 objects` } });
    expect(await pin(sha256, { revision: `${'1'.repeat(40)}2`, stored: [S1, S2] })).toEqual({ ok: true, pinned: { kind: 'pinned', commit: S1, via: `--revision ${'1'.repeat(40)}2`, remote: null } });
    expect(await listingsOf(() => pin(sha256, { revision: S1, stored: [S1] }))).toBe(0);
  });

  it('in a SHA-1 clone a name longer than 40 digits is no identifier and lists nothing', async () => {
    const long = 'c'.repeat(50);
    expect(await listingsOf(() => pin(snap(oid(C), {}), { revision: long }))).toBe(0);
    expect(await pin(snap(oid(C), {}), { revision: long })).toEqual({ ok: false, refusal: { stage: 'revision', reason: `--revision "${long}" resolves to no object identifier` } });
  });

  it('a configuration recording another object format gives no width, so no name is read as an identifier', async () => {
    const other = snap(oid(C), {}, { objectFormat: 'sha512' });
    expect(await listingsOf(() => pin(other, { revision: 'cccc' }))).toBe(0);
    expect(await pin(other, { revision: C })).toEqual({ ok: false, refusal: { stage: 'revision', reason: `--revision "${C}" resolves to no object identifier` } });
  });

  it('a symbolic reference --revision names is followed only to an admitted value, else refused naming its target', async () => {
    expect(await pin(snap(oid(A), { 'refs/heads/alias': sym('refs/heads/hidden') }, { names: ['refs/heads/hidden'] }), { revision: 'alias' })).toEqual({ ok: false, refusal: { stage: 'revision',
      reason: '--revision "alias" names refs/heads/alias, a symbolic reference to refs/heads/hidden, whose value Syzygy does not read (it reads the value of the reference --revision names, not of a reference that one names); give refs/heads/hidden or an object identifier with --revision' } });
    const admitted = snap(oid(B), { 'refs/remotes/origin/HEAD': sym('refs/remotes/origin/main'), 'refs/remotes/origin/main': oid(B) });
    expect(await pin(admitted, { revision: 'origin' })).toMatchObject({ ok: true, pinned: { commit: B, via: '--revision origin' } });
  });

  it('a reference is found by its name in the names the clone holds, Git\'s short-name order first', async () => {
    const s = snap(oid(A), { 'refs/tags/x': oid(A), 'refs/heads/x': oid(B) });
    expect(await pin(s, { revision: 'x' })).toMatchObject({ ok: true, pinned: { commit: A } });
  });
});

describe('the printed commands quote each value as one shell word (R-PDJA-33-SLICE-C-1 finding 7)', () => {
  it('single-quotes it, closing and reopening around each quote', () => {
    expect(quote('https://h.example/a/b;$(x)`y`|z')).toBe("'https://h.example/a/b;$(x)`y`|z'");
    expect(quote("it's")).toBe("'it'\\''s'");
  });
});
