import { describe, expect, it } from 'vitest';
import type { StoreRead, StoredRecord } from './launch-store.js';
import { REAL_ROOT } from './screening-v8.testkit.js';
import { PUBLIC_BY_FORM_ACTS } from '@syzygy/polaris-generation-core/live';
import { actFormsMatchPolicy, fetchRefusal, OBSERVATION_ACT_FORM_FILES, pairVisibilityAt, type VisibilityDecision } from './source-visibility-gate.js';

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
const decide = (read: () => StoreRead, act: () => Promise<readonly string[]>, subject = PAIR, observationForms?: readonly string[]) =>
  pairVisibilityAt(subject, { root: '/fixture', now: NOW, readStore: read, actRecords: act, ...(observationForms === undefined ? {} : { observationForms }) });
const REDIS_FORM = '.syzygy/governance/decisions/PUBLIC-REPO-ADMISSION-REDIS-OBSERVATION-ACT.md';
const REQUESTS_FORM = '.syzygy/governance/decisions/PUBLIC-REPO-ADMISSION-REQUESTS-OBSERVATION-ACT.md';
const THIRD_FORM = '.syzygy/governance/decisions/PUBLIC-REPO-ADMISSION-THIRD-OBSERVATION-ACT.md';
const FORMS_REFUSED = { ok: false, why: 'the observation act forms the reader reads are not exactly the acts the policy names as public by form' };

describe('pairVisibilityAt', () => {
  it('the act-form observation forms are exactly the two acts the policy names', () => {
    expect([...OBSERVATION_ACT_FORM_FILES].sort()).toEqual([REDIS_FORM, REQUESTS_FORM]);
    expect([...PUBLIC_BY_FORM_ACTS].sort()).toEqual([REDIS_FORM, REQUESTS_FORM]);
    expect(actFormsMatchPolicy(OBSERVATION_ACT_FORM_FILES)).toBe(true);
    expect(actFormsMatchPolicy([REQUESTS_FORM, REDIS_FORM])).toBe(true);
  });
  // A form added to the reader's list never states public without a policy that names it; nor does a list that lost one.
  it.each([
    ['a third observation form the policy does not name', [REDIS_FORM, REQUESTS_FORM, THIRD_FORM]],
    ['one of the two named forms missing', [REDIS_FORM]],
    ['a named form swapped for an unnamed one', [REDIS_FORM, THIRD_FORM]],
    ['a named form repeated in place of the other', [REDIS_FORM, REDIS_FORM]],
    ['both named forms, one of them listed twice', [REDIS_FORM, REQUESTS_FORM, REDIS_FORM]],
    ['no form at all', []],
  ] as const)('refuses every read when the reader\'s forms are %s', async (_name, forms) => {
    expect(actFormsMatchPolicy(forms)).toBe(false);
    expect(await decide(store(launch('L1', 'public')), acts('PUBLIC-OBS-X@1'), PAIR, forms)).toEqual(FORMS_REFUSED);
  });
  it('refuses when the policy names a form the reader does not read', () => {
    expect(actFormsMatchPolicy([REDIS_FORM, REQUESTS_FORM], [REDIS_FORM, REQUESTS_FORM, THIRD_FORM])).toBe(false);
  });
  it('reads the pair with the two named forms injected', async () => {
    expect(await decide(store(launch('L1', 'public')), acts(), PAIR, [REQUESTS_FORM, REDIS_FORM])).toMatchObject({ ok: true, visibility: 'public' });
  });
  // Each is refused although `Date.parse` reads the last three: a 31 November, a 30 February at a valid hour, and an hour 24 roll over.
  it.each(['2026-13-01T00:00:00Z', '2026-02-30T25:00:00Z', 'not an instant', '2026-11-31T00:00:00Z', '2026-02-30T10:00:00Z', '2026-11-09T24:00:00Z'])('refuses every read when a pair\'s grant instant is not a real calendar instant (%s), never drops the record', async instant => {
    expect(await decide(store(launch('L1', 'public'), launch('L2', 'not-public', { grantInstant: instant })), acts())).toEqual({ ok: false,
      why: `the launch consent record L2.md has a grant instant that cannot be read (${instant}), so its effectiveness is unknown, it could be a record of any pair, and every read is refused until it is read or revoked` });
  });
  it('refuses a read of one pair while another pair\'s observation record has an unreadable grant instant, naming its file', async () => {
    expect(await decide(store(launch('L1', 'public'), launch('L9', 'public', { identity: 'repository:other', grantInstant: '2026-13-01T00:00:00Z' })), acts('PUBLIC-OBS-X@1'))).toEqual({ ok: false,
      why: 'the launch consent record L9.md has a grant instant that cannot be read (2026-13-01T00:00:00Z), so its effectiveness is unknown, it could be a record of any pair, and every read is refused until it is read or revoked' });
  });
  it('refuses a read of one pair while another pair\'s record names a rolled-over date (31 November), naming its file', async () => {
    expect(await decide(store(launch('L1', 'public'), launch('L9', 'not-public', { identity: 'repository:other', grantInstant: '2026-11-31T00:00:00Z' })), acts('PUBLIC-OBS-X@1'))).toEqual({ ok: false,
      why: 'the launch consent record L9.md has a grant instant that cannot be read (2026-11-31T00:00:00Z), so its effectiveness is unknown, it could be a record of any pair, and every read is refused until it is read or revoked' });
  });
  it('reads a real instant, the last second of a month included', async () => {
    expect(await decide(store(launch('L1', 'public', { grantInstant: '2026-02-28T23:59:59Z' }), launch('L2', 'public', { grantInstant: '2024-02-29T00:00:00Z' })), acts()))
      .toMatchObject({ ok: true, visibility: 'public' });
  });
  it('ignores an unreadable grant instant on a revoked record or on a record that is not an observation record', async () => {
    const bad = { identity: 'repository:other', grantInstant: '2026-13-01T00:00:00Z' };
    expect(await decide(store(launch('L1', 'public'), launch('L8', 'public', { ...bad, state: 'revoked' }), launch('L9', 'public', { ...bad, recordClass: 'drawer-statement' })), acts()))
      .toMatchObject({ ok: true, visibility: 'public' });
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

describe('fetchRefusal: the supervisor fetches only a pair that reads public (screening scope version 8, edit 4)', () => {
  const decided = (decision: VisibilityDecision) => async () => decision;
  it('lets the fetch go ahead for a public pair, asking for the pair and commit', async () => {
    const asked: unknown[] = [];
    expect(await fetchRefusal('redis-redis', PAIR.commit, async subject => { asked.push(subject); return { ok: true, visibility: 'public', carriers: [] }; })).toBeNull();
    expect(asked).toEqual([{ repository: 'repository:redis-redis', commit: PAIR.commit }]);
  });
  it.each([
    ['a private pair', 'o-r', decided({ ok: true, visibility: 'private', carriers: [] }), 'repository:o-r is private at this commit: Syzygy fetches no private repository and uses no credential for its host'],
    ['an undecidable pair', 'o-r', decided({ ok: false, why: 'a launch consent record cannot be read' }), 'the visibility of repository:o-r cannot be decided (a launch consent record cannot be read), so Syzygy fetches nothing'],
    ['a decision that throws', 'o-r', async () => { throw new Error('boom'); }, 'the visibility of repository:o-r cannot be decided (boom), so Syzygy fetches nothing'],
    ['no decision port', 'o-r', undefined, 'no visibility decision is wired for repository:o-r, so Syzygy fetches nothing'],
    ['no repository named', undefined, decided({ ok: true, visibility: 'public', carriers: [] }), 'the preflight names no repository, so its visibility cannot be decided and Syzygy fetches nothing'],
    ['an empty repository id', '', decided({ ok: true, visibility: 'public', carriers: [] }), 'the preflight names no repository'],
  ] as const)('refuses %s, naming --clone', async (_name, id, visibilityOf, message) => {
    const why = await fetchRefusal(id, PAIR.commit, visibilityOf);
    expect(why).toContain(message);
    expect(why).toContain('pass --clone <dir>');
  });
});
