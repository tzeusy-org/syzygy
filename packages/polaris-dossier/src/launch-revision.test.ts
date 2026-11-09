import { describe, expect, it } from 'vitest';
import type { CloneSnapshot, RefValue } from './launch-clone.js';
import { pinLaunchRevision } from './launch-revision.js';

/** REQ-polaris-generation-047: the pin, from fabricated snapshots of a clone's references (the snapshot reader is exercised against real
 * clones in launch.test.ts). Every expected pin, reference and refusal is a literal written from the clause. */

const A = 'a'.repeat(40), B = 'b'.repeat(40), C = 'c'.repeat(40), D = 'd'.repeat(40);
const oid = (o: string): RefValue => ({ kind: 'oid', oid: o });
const sym = (target: string): RefValue => ({ kind: 'symbolic', target });
const snap = (head: RefValue, refs: Record<string, RefValue>): CloneSnapshot => ({ gitDir: '/c/.git', head, refs: new Map(Object.entries(refs)), remotes: [] });
const ports = { storedIds: async () => new Set([A, B, C, D, 'abcd'.repeat(10), `abcd${'e'.repeat(36)}`]), isCommit: async (o: string) => o !== D };
const pin = (snapshot: CloneSnapshot, more: { revision?: string; headConsented?: boolean } = {}) =>
  pinLaunchRevision({ clone: '/c', snapshot, headConsented: more.headConsented ?? false, ...(more.revision === undefined ? {} : { revision: more.revision }) }, ports);

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

  it('refuses a name that resolves to no commit, or to more than one', async () => {
    expect(await pin(snap(oid(A), {}), { revision: 'ffff' })).toEqual({ ok: false, refusal: { stage: 'revision', reason: '--revision "ffff" resolves to no object the clone holds' } });
    expect(await pin(snap(oid(A), {}), { revision: 'abcd' })).toEqual({ ok: false, refusal: { stage: 'revision', reason: '--revision "abcd" is ambiguous: it resolves to 2 objects' } });
    expect(await pin(snap(oid(D), {}), { revision: D })).toEqual({ ok: false, refusal: { stage: 'revision', reason: `--revision ${D} resolves to ${D}, which is not a commit the clone's store holds` } });
  });

  it('several remote defaults and none origin: no one remote default, refused naming --revision', async () => {
    const s = snap(oid(A), { 'refs/remotes/a/HEAD': sym('refs/remotes/a/main'), 'refs/remotes/a/main': oid(A), 'refs/remotes/b/HEAD': sym('refs/remotes/b/main'), 'refs/remotes/b/main': oid(A) });
    expect(await pin(s)).toEqual({ ok: false, refusal: { stage: 'revision', reason: 'the remotes a, b each record a default branch and none is origin, so the clone records no one remote default; name the revision with --revision' } });
  });
});
