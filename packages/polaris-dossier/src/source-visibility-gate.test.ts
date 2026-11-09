import { describe, expect, it } from 'vitest';
import type { StoreRead, StoredRecord } from './launch-store.js';
import { REAL_ROOT } from './screening-v8.testkit.js';
import { ACT_FORMS_MATCH_POLICY, pairVisibilityAt } from './source-visibility-gate.js';

/** A pair's visibility (screening scope version 8, `sourceVisibility.rule`): public only when every effective observation consent record
 * of the pair states public through its carrier; an unreadable record refuses. The launch store and the act-form records are injected,
 * so nothing here runs a process; the last case reads this checkout's own act records, the existing Redis consent among them. */

const NOW = Date.UTC(2026, 10, 10);
const PAIR = { repository: 'repository:o-r', commit: 'a'.repeat(40) };
const launch = (id: string, declaration: 'public' | 'not-public' | 'not-given', more: Partial<{ state: string; recordClass: string; identity: string; grantInstant: string }> = {}): StoredRecord => ({
  record: { recordClass: more.recordClass ?? 'observation-consent', recordId: id, identity: more.identity ?? 'repository:o-r', publicDeclaration: declaration,
    grantInstant: more.grantInstant ?? '2026-11-09T10:00:00Z', revision: 'b'.repeat(40) },
  digest: 'd', file: `${id}.md`, commit: 'c'.repeat(40), state: more.state ?? 'active',
} as unknown as StoredRecord);
const store = (...records: StoredRecord[]) => (): StoreRead => ({ ok: true, tip: 'c'.repeat(40), records });
const acts = (...ids: string[]) => async () => ids;
const decide = (read: () => StoreRead, act: () => Promise<readonly string[]>, subject = PAIR) =>
  pairVisibilityAt(subject, { root: '/fixture', now: NOW, readStore: read, actRecords: act });

describe('pairVisibilityAt', () => {
  it('the act-form observation forms are exactly the two acts the policy names', () => {
    expect(ACT_FORMS_MATCH_POLICY).toBe(true);
  });
  it.each([
    ['a launch record answering public', [launch('L1', 'public')], [], 'public'],
    ['a launch record answering not public', [launch('L1', 'not-public')], [], 'private'],
    ['a launch record giving no declaration', [launch('L1', 'not-given')], [], 'private'],
    ['an act-form record alone (the Redis form)', [], ['PUBLIC-OBS-X@1'], 'public'],
    ['a public pair that also holds a private record, at another revision', [launch('L1', 'public'), launch('L2', 'not-public')], [], 'private'],
    ['an act-form public pair joined by a private fork\'s record', [launch('L2', 'not-public')], ['PUBLIC-OBS-X@1'], 'private'],
    ['an act-form public pair joined by a silent record', [launch('L2', 'not-given')], ['PUBLIC-OBS-X@1'], 'private'],
    ['no effective record at all', [], [], 'private'],
    ['a revoked private record, which counts for nothing', [launch('L1', 'public'), launch('L2', 'not-public', { state: 'revoked' })], [], 'public'],
    ['a private record not yet in force', [launch('L1', 'public'), launch('L2', 'not-public', { grantInstant: '2026-12-01T00:00:00Z' })], [], 'public'],
    ['a private record of another pair', [launch('L1', 'public'), launch('L2', 'not-public', { identity: 'repository:x-y' })], [], 'public'],
    ['a drawer statement, which is not an observation record', [launch('L1', 'public'), launch('L2', 'not-public', { recordClass: 'drawer-statement' })], [], 'public'],
  ] as const)('%s: %s', async (_name, records, actIds, visibility) => {
    const decision = await decide(store(...records), acts(...actIds));
    expect(decision.ok && decision.visibility).toBe(visibility);
  });
  it('names each carrier', async () => {
    expect(await decide(store(launch('L1', 'public'), launch('L2', 'not-given')), acts('PUBLIC-OBS-X@1'))).toEqual({ ok: true, visibility: 'private',
      carriers: [{ record: 'PUBLIC-OBS-X@1', carrier: 'public' }, { record: 'L1', carrier: 'public' }, { record: 'L2', carrier: 'states-nothing' }] });
  });
  it('refuses every read while a launch record cannot be read, naming why', async () => {
    expect(await decide(() => ({ ok: false, why: 'L9.md is not a launch consent record' }), acts('PUBLIC-OBS-X@1'))).toEqual({ ok: false,
      why: 'a launch consent record cannot be read, so it could be a record of any pair and every read is refused until it is read or revoked: L9.md is not a launch consent record' });
  });
  it('refuses every read while an act record cannot be read', async () => {
    expect(await decide(store(), async () => { throw new Error('an act record is malformed'); })).toEqual({ ok: false,
      why: 'an observation consent act record cannot be read, so every read is refused: an act record is malformed' });
  });
  it('refuses a subject that is not a repository pair', async () => {
    expect(await decide(store(), acts(), { repository: 'project:x', commit: PAIR.commit })).toEqual({ ok: false, why: 'the subject project:x is not a repository pair' });
  });
  it('the existing Redis consent reads public from this checkout\'s own act records', async () => {
    const decision = await pairVisibilityAt({ repository: 'repository:redis-redis', commit: '498ecd0d6d007db11ddb3aea9428552598a78622' }, { root: REAL_ROOT, now: Date.now(), readStore: store() });
    expect(decision).toMatchObject({ ok: true, visibility: 'public' });
    if (decision.ok) expect(decision.carriers.map(c => [c.record.replace(/-\d{4}-\d{2}-\d{2}@.*$/u, ''), c.carrier])).toEqual([['PUBLIC-OBS-REDIS', 'public']]);
  });
});
