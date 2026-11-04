import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AdmissionRecordError } from './admission-record.js';
import { inForceRecords } from './consent-ports.js';
import { loadRecorderForms, HEAD_FIELD_ALTERATION, PROSE_ALTERATIONS, renderClassAct, renderPolicyAct, renderRecorderAct } from './recorder-fixtures.testkit.js';
import { DECISIONS_DIR, EGRESS_V2_INSTANCE, INSTANCES_DIR, POLICY_ACT_FILE, POLICY_PATH, createAdmissionRecordsPort, createPackageAdmissionReader, createPackageAdmissionRecordsPort, createPackagePolicyReader, readClassActState, readInForceEgress, readPolicyActChain, type PackageReaderFs } from './package-reader.js';

// The recorder forms render once, before the file collects its tests: some tables render at collection (syzygy-bpyt.4.8).
await loadRecorderForms();

// The citation allowlist, replaced by a map the allowlist cases fill and clear: every other case reads with no file allowlisted.
const ALLOWLIST = vi.hoisted(() => new Map<string, { readonly sha256: string; readonly reason: string }>());
vi.mock('./citation-allowlist.js', () => ({ CITATION_ALLOWLIST: ALLOWLIST }));

// Explicit timeouts: a test whose worst measured duration exceeded 2.5 s carries one, that worst case x 3 rounded up to a whole 5 s
// (syzygy-bpyt.4.13; scripts/size_vitest_test_timeouts.py). Since syzygy-bpyt.4.8 renders every recorder form once, at the top of
// this file, no test here waits on a Python spawn: the fifteen tests sized for their renders measured 52 ms at worst over five runs
// at load1 up to 21 on 12 cores, and keep vitest's default (syzygy-nyir; docs/evidence/syzygy-nyir/timeout-sizing.json). The one
// timeout left is the port-and-chain agreement sweep's, which is all reads and is syzygy-bpyt.4.23's. It keeps its 50 s from
// docs/evidence/syzygy-bpyt-4-13/timeout-sizing.json, where a run at load1 127 cut it at 16.5 s: the fresh runs alone give it 15 s,
// so the sizing --check reports that one test, and no other.

const REDIS_REV = '498ecd0d6d007db11ddb3aea9428552598a78622';
const OTHER_REV = 'd2c8a4b91e8c0e6aefd1f5bc0bf582cddbe046b7';
const obsText = (over: { subject?: string; revocation?: string; rows?: string } = {}): string => `# redis observation consent (public repository)

Record ID: \`PUBLIC-OBS-REDIS-2026-10-03\`

Record version: \`0.1.0-candidate.7\`

Subject: \`${over.subject ?? '(project:syzygy, repository:redis-redis)'}\`

| Label | Commit object id |
|---|---|
${over.rows ?? `| \`8.10.2\` | \`${REDIS_REV}\` |\n| \`7.2.4\` | \`${OTHER_REV}\` |`}

Proposed revocation state: ${over.revocation ?? 'active; supersedes no earlier consent'}
`;
const egressText = (): string => `# Public-target egress consent

Record ID: \`PUBLIC-EGRESS-anthropic\`

Record version: \`0.1.0-candidate.7\`

Subject: \`(project:syzygy, provider:anthropic)\`

Permitted content classes (RFC5-14 closed vocabulary):

- \`governance-text\`
- \`code-structure\`

Retention: elsewhere.

Proposed revocation state: active; supersedes no earlier consent

## Scope

- \`(project:syzygy, repository:psf-requests)\`
- \`(project:syzygy, repository:redis-redis)\`
`;
const OWNER_ANSWERS_FILE = 'PUBLIC-REPO-ADMISSION-OWNER-ANSWERS-2026-10-03.md';
/** The real direction, read from this checkout: the reader pins its digest. */
const ownerAnswers = (): string => readFileSync(fileURLToPath(new URL(`../../../${DECISIONS_DIR}/${OWNER_ANSWERS_FILE}`, import.meta.url)), 'utf8');
const sha = (t: string): string => createHash('sha256').update(t, 'utf8').digest('hex');
const REDIS_PATH = `${INSTANCES_DIR}/redis/OBSERVATION-CONSENT.md`;
const EGRESS_PATH = `${INSTANCES_DIR}/egress-anthropic/EGRESS-CONSENT-ANTHROPIC.md`;
/** An act record as the real recorder renders it (see recorder-fixtures.testkit.ts), with the fields a case varies replaced.
 * The artifact picks the recorder's form: the redis observation unless it is one of the egress instances. */
const actText = (type: string, artifact: string, text: string, date = '2026-10-04', digest = sha(text), instant = `${date}T09:30:00Z`): string => {
  const key = artifact === EGRESS_PATH ? 'egress-anthropic' : artifact === EGRESS_V2_INSTANCE ? 'egress-anthropic-v2' : 'redis-observation';
  return renderRecorderAct(key, '0'.repeat(64), date, instant)
    .replace('0'.repeat(64), digest)
    .replace(/^Act type: `[^`]+`/m, `Act type: \`${type}\``).replace(/^Artifact identity: `[^`]+`/m, `Artifact identity: \`${artifact}\``);
};
const AT = Date.UTC(2026, 9, 4, 9, 30, 0);   // the instant of an act dated 2026-10-04: in force from here

/** A file system over a map of repository-relative paths: a directory is any proper prefix of a key. */
function memoryFs(files: Record<string, string>): PackageReaderFs {
  return {
    readdir: async dir => {
      const prefix = `${dir.slice(3)}/`;
      const names = new Set(Object.keys(files).filter(f => f.startsWith(prefix)).map(f => f.slice(prefix.length).split('/')[0]!));
      if (!dir.startsWith('/r/') || names.size === 0) throw new Error('enoent');
      return [...names];
    },
    readFile: async file => { const key = file.slice(3); if (!(key in files)) throw new Error('enoent'); return files[key]!; },
  };
}
const world = (over: Record<string, string> = {}): Record<string, string> => ({
  [REDIS_PATH]: obsText(), [EGRESS_PATH]: egressText(),
  [`${DECISIONS_DIR}/PUBLIC-REPO-ADMISSION-REDIS-OBSERVATION-ACT.md`]: actText('consent-observation', REDIS_PATH, obsText()),
  [`${DECISIONS_DIR}/PUBLIC-REPO-ADMISSION-EGRESS-ANTHROPIC-ACT.md`]: actText('consent-egress', EGRESS_PATH, egressText()),
  [`${DECISIONS_DIR}/${OWNER_ANSWERS_FILE}`]: ownerAnswers(),
  ...over,
});
const reader = (files: Record<string, string>) => createPackageAdmissionReader({ root: '/r', fs: memoryFs(files) });
const requirement = (kind: 'observation-consent' | 'egress-consent' | 'public-source-policy', repositoryId = 'redis-redis', revision = REDIS_REV) => ({ kind, repositoryId, revision, url: 'https://github.com/redis/redis', needs: 'x' });
/** Every world a policy case below reads, copied as it was read: the last describe checks the port and the strict chain agree on each. */
const policyWorlds: Array<Readonly<Record<string, string>>> = [];
const seen = (files: Record<string, string>): Record<string, string> => { policyWorlds.push({ ...files }); return files; };

describe('package admission reader', () => {
  it('returns a record only for an instance that an act record names by path and digest', async () => {
    const records = await reader(world()).read();
    expect(records.map(r => `${r.class}:${r.repositoryId ?? r.providerId}`).sort()).toEqual(['egress:anthropic', 'observation:redis-redis']);
    const obs = records.find(r => r.class === 'observation')!;
    expect(obs).toMatchObject({ recordId: 'PUBLIC-OBS-REDIS-2026-10-03', version: '0.1.0-candidate.7', project: 'project:syzygy', withdrawnAt: null, supersedes: null, inForceAt: AT, admittedRevisions: [REDIS_REV, OTHER_REV], digest: sha(obsText()) });
    expect(records.find(r => r.class === 'egress')).toMatchObject({ admittedRepositories: ['psf-requests', 'redis-redis'], contentClasses: ['governance-text', 'code-structure'] });
    expect(obs.revisionLabels).toEqual(['8.10.2', '7.2.4']);
    expect(Object.isFrozen(obs) && Object.isFrozen(obs.admittedRevisions) && Object.isFrozen(obs.revisionLabels)).toBe(true);
  });
  it('returns nothing when no act record exists: a candidate instance binds nothing', async () => {
    const files = world();
    for (const key of Object.keys(files)) if (key.endsWith('-ACT.md')) delete files[key];
    expect(await reader(files).read()).toEqual([]);
  });
  it('marks a record not in force when the instance bytes changed after the act', async () => {
    const records = await reader(world({ [REDIS_PATH]: obsText() + '\nedited\n' })).read();
    expect(records.find(r => r.class === 'observation')!.inForceAt).toBeNull();
  });
  it('refuses the whole read on unknown shapes instead of guessing', async () => {
    const act = `${DECISIONS_DIR}/PUBLIC-REPO-ADMISSION-REDIS-OBSERVATION-ACT.md`;
    const cases: Array<[string, Record<string, string>]> = [
      ['unrecognised package decision file', { [`${DECISIONS_DIR}/PUBLIC-REPO-ADMISSION-REDIS-WITHDRAWAL.md`]: 'withdrawn' }],
      ['artifact outside the instances directory', { [act]: actText('consent-observation', '.syzygy/elsewhere.md', obsText()), '.syzygy/elsewhere.md': obsText() }],
      ['traversal in the artifact path', { [act]: actText('consent-observation', `${INSTANCES_DIR}/../x.md`, obsText()) }],
      ['act form under an unrecognised file name', { [`${DECISIONS_DIR}/PUBLIC-REPO-ADMISSION-REDIS-OBSERVATION-ACT-WITHDRAWN.md`]: actText('consent-observation', REDIS_PATH, obsText()) }],
      ['act for another project', { [act]: actText('consent-observation', REDIS_PATH, obsText()).replace('`project:syzygy`', '`project:butlers`') }],
      ['duplicate Record ID line', (() => { const t = obsText() + '\nRecord ID: `OTHER`\n'; return { [REDIS_PATH]: t, [act]: actText('consent-observation', REDIS_PATH, t) }; })()],
      ['unknown act type', { [act]: actText('consent-other', REDIS_PATH, obsText()) }],
      ['malformed digest', { [act]: actText('consent-observation', REDIS_PATH, obsText(), '2026-10-04', 'abc') }],
      ['bad date', { [act]: actText('consent-observation', REDIS_PATH, obsText(), '2026-13-45') }],
      ['artifact missing', { [act]: actText('consent-observation', `${INSTANCES_DIR}/gone/OBSERVATION-CONSENT.md`, obsText()) }],
      ['successor form not parsed', (() => { const t = obsText({ revocation: 'active; supersedes PUBLIC-OBS-REDIS-2026-09-01@1' }); return { [REDIS_PATH]: t, [act]: actText('consent-observation', REDIS_PATH, t) }; })()],
      ['duplicate revision label', (() => { const t = obsText({ rows: `| \`8.10.2\` | \`${REDIS_REV}\` |\n| \`8.10.2\` | \`${OTHER_REV}\` |` }); return { [REDIS_PATH]: t, [act]: actText('consent-observation', REDIS_PATH, t) }; })()],
      ['one commit under two labels', (() => { const t = obsText({ rows: `| \`8.10.2\` | \`${REDIS_REV}\` |\n| \`latest\` | \`${REDIS_REV}\` |` }); return { [REDIS_PATH]: t, [act]: actText('consent-observation', REDIS_PATH, t) }; })()],
      ['branch name as revision', (() => { const t = obsText({ rows: '| `short` | `abc123` |' }); return { [REDIS_PATH]: t, [act]: actText('consent-observation', REDIS_PATH, t) }; })()],
      ['subject not a pair', (() => { const t = obsText({ subject: '(project:syzygy, repository:*)' }); return { [REDIS_PATH]: t, [act]: actText('consent-observation', REDIS_PATH, t) }; })()],
    ];
    for (const [name, over] of cases) await expect(reader(world(over)).read(), name).rejects.toBeInstanceOf(AdmissionRecordError);
  });
  it('refuses when the decisions directory cannot be listed', async () => {
    await expect(createPackageAdmissionReader({ root: '/missing', fs: memoryFs(world()) }).read()).rejects.toBeInstanceOf(AdmissionRecordError);
  });
});

/** The reader's own fence rule, `outsideFences` (private; docs/evidence/syzygy-bpyt-6-3/dc3-fence-rules-2026-10-25.json, reader 4). A
 * field inside a fence is not a field, so a record in which a field counts differently with and without fences is refused. These cases
 * put a fence-shaped block after the title of an act record: the record stays in force exactly when the block does not open a fence
 * that swallows the fields below it, which pins the opener's indent limit and the closer's length rule without exporting the function.
 * On CRLF the function recognizes no fence (its opener ends in `(.*)$` and `.` does not match CR), so a field wholly inside a fence
 * would pass `one()`; the record is refused anyway, by the title, table and heading checks that compare whole lines against LF. The
 * two CRLF cases pin that refusal, not the mechanism, and a change that makes those checks CR-tolerant must make the fence guard so too. */
describe('fence reading of the act records', () => {
  const ACT_KEY = `${DECISIONS_DIR}/PUBLIC-REPO-ADMISSION-REDIS-OBSERVATION-ACT.md`;
  const afterTitle = (act: string, block: string): string => act.replace('\n\n', `\n\n${block}\n\n`);
  const states = async (files: Record<string, string>): Promise<string[]> =>
    (await reader(files).read()).map(r => `${r.class}:${r.repositoryId ?? r.providerId}:${r.inForceAt === null ? 'not-in-force' : 'in-force'}`).sort();
  const IN_FORCE = ['egress:anthropic:in-force', 'observation:redis-redis:in-force'];

  it('a line indented four spaces is not a fence opener: the record stays in force', async () => {
    expect(await states(world())).toEqual(IN_FORCE);
    expect(await states(world({ [ACT_KEY]: afterTitle(world()[ACT_KEY]!, '    ```') }))).toEqual(IN_FORCE);
  });
  it('a closed example fence after the title is blanked, and its closer of the opener\'s length closes it: the record stays in force', async () => {
    expect(await states(world({ [ACT_KEY]: afterTitle(world()[ACT_KEY]!, '```\nexample\n```') }))).toEqual(IN_FORCE);
  });
  it('refuses an act record written with CRLF line ends', async () => {
    await expect(reader(world({ [ACT_KEY]: world()[ACT_KEY]!.replace(/\n/g, '\r\n') })).read()).rejects.toBeInstanceOf(AdmissionRecordError);
  });
  it('refuses an instance written with CRLF line ends, even when its act record binds its digest', async () => {
    const crlf = obsText().replace(/\n/g, '\r\n');
    await expect(reader(world({ [REDIS_PATH]: crlf, [ACT_KEY]: actText('consent-observation', REDIS_PATH, crlf) })).read()).rejects.toBeInstanceOf(AdmissionRecordError);
  });
});

describe('admission records port', () => {
  const port = (files: Record<string, string>, now: number) => createAdmissionRecordsPort({ reader: reader(files), now: () => now });
  it('satisfies observation and egress exactly when an act is in force, and not before the act\'s instant', async () => {
    expect(await port(world(), AT).check(requirement('observation-consent'))).toEqual({ satisfied: true, record: 'PUBLIC-OBS-REDIS-2026-10-03@0.1.0-candidate.7' });
    expect(await port(world(), AT).check(requirement('egress-consent'))).toEqual({ satisfied: true, record: 'PUBLIC-EGRESS-anthropic@0.1.0-candidate.7' });
    expect((await port(world(), AT - 1).check(requirement('observation-consent'))).satisfied).toBe(false);
  });
  it('is unsatisfied for an unadmitted revision, an unadmitted repository, a stale instance and the policy record', async () => {
    const p = port(world(), AT);
    expect(await p.check(requirement('observation-consent', 'redis-redis', 'f'.repeat(40)))).toMatchObject({ satisfied: false });
    expect(await p.check(requirement('observation-consent', 'psf-requests', REDIS_REV))).toMatchObject({ satisfied: false });
    expect(await p.check(requirement('egress-consent', 'butlers'))).toMatchObject({ satisfied: false });
    expect(await p.check(requirement('public-source-policy'))).toMatchObject({ satisfied: false });
    expect(await port(world({ [REDIS_PATH]: obsText() + 'x' }), AT).check(requirement('observation-consent'))).toMatchObject({ satisfied: false });
  });
  it('does not take another provider\'s egress record for the Anthropic requirement', async () => {
    const other = egressText().replace('provider:anthropic', 'provider:other');
    expect(await port(world({ [EGRESS_PATH]: other, [`${DECISIONS_DIR}/PUBLIC-REPO-ADMISSION-EGRESS-ANTHROPIC-ACT.md`]: actText('consent-egress', EGRESS_PATH, other) }), AT).check(requirement('egress-consent'))).toMatchObject({ satisfied: false });
  });
  it('is unsatisfied, with a reason, when records cannot be read or none exist', async () => {
    const none = world(); for (const key of Object.keys(none)) if (key.endsWith('-ACT.md')) delete none[key];
    expect(await port(none, AT).check(requirement('observation-consent'))).toMatchObject({ satisfied: false, why: expect.stringContaining('no record found') });
    expect(await port(world({ [`${DECISIONS_DIR}/PUBLIC-REPO-ADMISSION-X-WITHDRAWAL.md`]: 'x' }), AT).check(requirement('egress-consent'))).toMatchObject({ satisfied: false, why: expect.stringContaining('could not be read') });
  });
  it('reads fresh on every check: a later withdrawal-form file turns a satisfied answer into a refusal', async () => {
    const files = world();
    const p = port(files, AT);
    expect((await p.check(requirement('egress-consent'))).satisfied).toBe(true);
    files[`${DECISIONS_DIR}/PUBLIC-REPO-ADMISSION-EGRESS-ANTHROPIC-WITHDRAWAL.md`] = 'withdrawn';
    expect((await p.check(requirement('egress-consent'))).satisfied).toBe(false);
  });
});

describe('consented revisions for a repository', () => {
  const port = (files: Record<string, string>, now: number) => createAdmissionRecordsPort({ reader: reader(files), now: () => now });
  it('returns the owner\'s label and full commit id for each revision of the repository, in force now', async () => {
    expect(await port(world(), AT).consentedRevisionsFor('redis-redis')).toEqual([{ label: '8.10.2', commitId: REDIS_REV }, { label: '7.2.4', commitId: OTHER_REV }]);
  });
  it('is empty before the act, for another repository, for stale bytes, with no act, and when the records cannot be read', async () => {
    expect(await port(world(), AT - 1).consentedRevisionsFor('redis-redis')).toEqual([]);
    expect(await port(world(), AT).consentedRevisionsFor('psf-requests')).toEqual([]);
    expect(await port(world({ [REDIS_PATH]: obsText() + 'x' }), AT).consentedRevisionsFor('redis-redis')).toEqual([]);
    const none = world(); for (const key of Object.keys(none)) if (key.endsWith('-ACT.md')) delete none[key];
    expect(await port(none, AT).consentedRevisionsFor('redis-redis')).toEqual([]);
    expect(await port(world({ [`${DECISIONS_DIR}/PUBLIC-REPO-ADMISSION-X-WITHDRAWAL.md`]: 'x' }), AT).consentedRevisionsFor('redis-redis')).toEqual([]);
  });
  it('is empty when records in force disagree: one label for two commits, or one commit under two labels', async () => {
    const records = (rows: Array<{ label: string; id: string }>) => rows.map((r, i) => ({ recordId: `R${i}`, version: '1', class: 'observation' as const, project: 'project:syzygy', repositoryId: 'redis-redis', providerId: null, upstream: null, digest: '1'.repeat(64), inForceAt: 1, withdrawnAt: null, supersedes: null, supersessionAt: null, admittedRevisions: [r.id], revisionLabels: [r.label], admittedRepositories: [], contentClasses: [] }));
    const of = (rows: Array<{ label: string; id: string }>) => createAdmissionRecordsPort({ reader: { read: async () => records(rows) }, now: () => 5 });
    expect(await of([{ label: 'a', id: REDIS_REV }, { label: 'b', id: OTHER_REV }]).consentedRevisionsFor('redis-redis')).toHaveLength(2);
    expect(await of([{ label: 'a', id: REDIS_REV }, { label: 'a', id: OTHER_REV }]).consentedRevisionsFor('redis-redis')).toEqual([]);
    expect(await of([{ label: 'a', id: REDIS_REV }, { label: 'b', id: REDIS_REV }]).consentedRevisionsFor('redis-redis')).toEqual([]);
    expect(await of([{ label: 'a', id: REDIS_REV }, { label: 'a', id: REDIS_REV }]).consentedRevisionsFor('redis-redis')).toEqual([{ label: 'a', commitId: REDIS_REV }]);   // the same pair twice is not a conflict
  });
});

describe('act instant', () => {
  const withInstant = (instant: string, date = '2026-10-04'): string => actText('consent-observation', REDIS_PATH, obsText(), date).replace(/Recorded at \(UTC\): \S+/, `Recorded at (UTC): ${instant}`);
  const actPath = `${DECISIONS_DIR}/PUBLIC-REPO-ADMISSION-REDIS-OBSERVATION-ACT.md`;
  it('uses the Recorded at (UTC) instant when the record carries exactly one', async () => {
    const records = await reader(world({ [actPath]: withInstant('2026-10-04T11:15:30Z') })).read();
    expect(records.find(r => r.class === 'observation')!.inForceAt).toBe(Date.UTC(2026, 9, 4, 11, 15, 30));
  });
  it('refuses a record with no instant: there is no date-only reading', async () => {
    const dateOnly = actText('consent-observation', REDIS_PATH, obsText()).replace(/Recorded at \(UTC\): \S+\n\n/, '');
    expect(dateOnly).not.toContain('Recorded at');
    await expect(reader(world({ [actPath]: dateOnly })).read()).rejects.toBeInstanceOf(AdmissionRecordError);
  });
  it('refuses a malformed, repeated, wrong-day or non-whole-second instant', async () => {
    for (const bad of ['2026-10-04T09:30:00', '2026-10-04T09:30:00.5Z', '2026-10-05T00:00:00Z', '2026-10-04T25:00:00Z', '2026-10-04T24:00:00Z', '2026-02-30T00:00:00Z', 'soon'])
      await expect(reader(world({ [actPath]: withInstant(bad) })).read(), bad).rejects.toBeInstanceOf(AdmissionRecordError);
    const twice = withInstant('2026-10-04T09:30:00Z').replace('Recorded at (UTC): 2026-10-04T09:30:00Z', 'Recorded at (UTC): 2026-10-04T09:30:00Z\n\nRecorded at (UTC): 2026-10-04T10:30:00Z');
    await expect(reader(world({ [actPath]: twice })).read()).rejects.toBeInstanceOf(AdmissionRecordError);
  });
  it('refuses any other spelling or placement of a recorded-at line instead of falling back', async () => {
    for (const loose of ['  Recorded at (UTC): 2026-10-04T09:30:00Z', 'recorded at (utc): 2026-10-04T09:30:00Z', 'Recorded at: 2026-10-04T09:30:00Z', 'Recorded At (UTC):  2026-10-04T09:30:00Z', 'RECORDED AT (UTC): 2026-10-04T09:30:00Z']) {
      const text = actText('consent-observation', REDIS_PATH, obsText()).replace(/Recorded at \(UTC\): \S+/, loose);
      await expect(reader(world({ [actPath]: text })).read(), loose).rejects.toBeInstanceOf(AdmissionRecordError);
    }
    const strictAndLoose = withInstant('2026-10-04T09:30:00Z').replace('Owner: Tzeusy', 'Owner: Tzeusy\n\n  recorded at 2026-10-04T10:00:00Z');
    await expect(reader(world({ [actPath]: strictAndLoose })).read()).rejects.toBeInstanceOf(AdmissionRecordError);
  });
  it('accepts only the pinned owner-answers file by name and bytes', async () => {
    const dir = (name: string) => `${DECISIONS_DIR}/${name}`;
    await expect(reader(world({ [dir(OWNER_ANSWERS_FILE)]: ownerAnswers() + ' ' })).read()).rejects.toBeInstanceOf(AdmissionRecordError);   // edited bytes
    await expect(reader(world({ [dir('PUBLIC-REPO-ADMISSION-OWNER-ANSWERS-2026-10-04.md')]: ownerAnswers() })).read()).rejects.toBeInstanceOf(AdmissionRecordError);   // another name, same bytes
    await expect(reader(world({ [dir('PUBLIC-REPO-ADMISSION-OWNER-ANSWERS-2026-10-04.md')]: 'direction, not an act' })).read()).rejects.toBeInstanceOf(AdmissionRecordError);
  });
});

describe('public-source policy act', () => {
  const policyText = (scope = true): string => JSON.stringify({ policyVersion: '1.2.0-public-source-candidate.1', ...(scope ? { publicSourceScope: { rules: [] } } : {}) }, null, 1) + '\n';
  // The act text is what the recorder itself renders (scripts/record_public_source_screening_scope_act.py and its version 2), so the
  // reader's expected forms cannot drift from the writer's. Only the fields a case varies are replaced afterwards.
  const policyAct = (over: { type?: string; digest?: string; instant?: string | null; project?: string; identity?: string; date?: string; version?: 1 | 2 } = {}, text = policyText()): string => {
    const date = over.date ?? '2026-10-04';
    let act = renderPolicyAct('0'.repeat(64), date, `${date}T09:30:00Z`, over.version ?? 1).replace('0'.repeat(64), over.digest ?? sha(text));
    act = over.instant === null ? act.replace(/Recorded at \(UTC\): \S+\n\n/, '') : over.instant === undefined ? act : act.replace(/(Recorded at \(UTC\): )\S+/, `$1${over.instant}`);
    if (over.type !== undefined) act = act.replace(/^Act type: `[^`]+`/m, `Act type: \`${over.type}\``);
    if (over.identity !== undefined) act = act.replace(/^Act identity: `[^`]+`/m, `Act identity: \`${over.identity}\``);
    if (over.project !== undefined) act = act.replace(/^Project identity: `[^`]+`/m, `Project identity: \`${over.project}\``);
    return act;
  };
  const POLICY_ACT = `${DECISIONS_DIR}/${POLICY_ACT_FILE}`;
  const policyWorld = (policy = policyText(), act = policyAct({}, policy), extra: Record<string, string> = {}): Record<string, string> => ({ ...world(), [POLICY_PATH]: policy, [POLICY_ACT]: act, ...extra });
  const policyReader = (files: Record<string, string>) => createPackagePolicyReader({ root: '/r', fs: memoryFs(seen(files)) });
  const check = (files: Record<string, string>, now: number) => createPackageAdmissionRecordsPort({ root: '/r', now: () => now, fs: memoryFs(seen(files)) }).check(requirement('public-source-policy'));

  it('recognises the recorder\'s record by its exact path and format, in force from its instant', async () => {
    expect(await policyReader(policyWorld()).read()).toEqual([{ actIdentity: 'PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-APPROVAL-2026-10-04', digest: sha(policyText()), inForceAt: AT, until: null }]);
    expect(await check(policyWorld(), AT)).toEqual({ satisfied: true, record: 'PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-APPROVAL-2026-10-04' });
    expect(await check(policyWorld(), AT - 1)).toMatchObject({ satisfied: false });
  });
  it('uses the act instant when present', async () => {
    const files = policyWorld(policyText(), policyAct({ instant: '2026-10-04T09:30:00Z' }));
    expect(await check(files, Date.UTC(2026, 9, 4, 9, 30, 0))).toMatchObject({ satisfied: true });
    expect(await check(files, Date.UTC(2026, 9, 4, 9, 29, 59))).toMatchObject({ satisfied: false });
  });
  it('is unsatisfied when the policy declares no public-source scope, even under an act over those bytes', async () => {
    const old = policyText(false);
    expect(await check(policyWorld(old, policyAct({}, old)), AT)).toMatchObject({ satisfied: false });
  });
  it('is unsatisfied when the policy bytes changed after the act, or the act is another type', async () => {
    expect(await check(policyWorld(policyText() + ' ', policyAct({}, policyText())), AT)).toMatchObject({ satisfied: false });
    expect(await check(policyWorld(policyText(), policyAct({ type: 'adopt-doctrine' })), AT)).toMatchObject({ satisfied: false });
  });
  it('is unsatisfied with no act record', async () => {
    const files = policyWorld(); delete files[POLICY_ACT];
    expect(await check(files, AT)).toMatchObject({ satisfied: false });
  });
  it('refuses the read on a record that names the policy without a readable act form, or for another project', async () => {
    for (const act of [policyAct({ digest: 'abc' }), policyAct({ project: 'project:butlers' }), policyAct({ instant: 'soon' }), policyAct().replace('Act identity:', 'Act ident:')])
      await expect(policyReader(policyWorld(policyText(), act)).read(), act).rejects.toBeInstanceOf(AdmissionRecordError);
    expect(await check(policyWorld(policyText(), policyAct({ digest: 'abc' })), AT)).toMatchObject({ satisfied: false, why: expect.stringContaining('could not be read') });
  });
  it('refuses when the policy file is missing or not JSON', async () => {
    const files = policyWorld(); delete files[POLICY_PATH];
    await expect(policyReader(files).read()).rejects.toBeInstanceOf(AdmissionRecordError);
    await expect(policyReader(policyWorld('not json')).read()).rejects.toBeInstanceOf(AdmissionRecordError);
  });
  it('refuses a record other than the recorder\'s that names the policy as its artifact (packets, quotations, other act types)', async () => {
    const line = `Artifact identity: \`${POLICY_PATH}\``;
    const forms: Record<string, string> = {
      'a prepared packet quoting an act': `# PREPARED packet\n\n${policyAct()}`,
      'a fenced quotation': `# Notes\n\n\`\`\`text\n${line}\n\`\`\`\n`,
      'another act type under another name': policyAct({ type: 'adopt-doctrine' }),
    };
    for (const [name, text] of Object.entries(forms)) await expect(policyReader(policyWorld(policyText(), policyAct(), { [`${DECISIONS_DIR}/SOME-OTHER-RECORD.md`]: text })).read(), name).rejects.toBeInstanceOf(AdmissionRecordError);
    // a block-quoted mention is not a line that names the artifact, and the three historical acts are skipped by name
    const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
    const historical = ['PWB-SECRET-CLASSIFICATION-POLICY-ACT.md', 'PWB-SECRET-CLASSIFICATION-POLICY-AMENDMENT-ACT.md', 'PWB-SECRET-CLASSIFICATION-POLICY-BEHAVIOR-CONTRACT-REPIN-ACT.md'];
    const realBytes = Object.fromEntries(historical.map(name => [`${DECISIONS_DIR}/${name}`, readFileSync(path.join(repoRoot, DECISIONS_DIR, name), 'utf8')]));
    const quiet = { [`${DECISIONS_DIR}/NOTES.md`]: `> ${line}\n`, ...realBytes };
    const files = policyWorld(policyText(false), policyAct({}, policyText(false)), quiet); delete files[POLICY_ACT];
    expect(await policyReader(files).read()).toEqual([]);
    // the same file names, edited: a forged withdrawal in a historical act refuses the read, whichever file it is placed in
    for (const name of Object.keys(realBytes)) await expect(policyReader({ ...files, [name]: `${realBytes[name]}\nWithdrawn: this act is withdrawn.\n` }).read(), name).rejects.toBeInstanceOf(AdmissionRecordError);
  });
  it('does not count a Recorded-at line inside a code fence (both readers)', async () => {
    const fence = '\n```text\nRecorded at (UTC): 2026-10-04T00:00:01Z\n```\n';
    // a real line beside a fenced one is a field that counts differently with and without fences: refused, not guessed
    await expect(policyReader(policyWorld(policyText(), policyAct() + fence)).read()).rejects.toBeInstanceOf(AdmissionRecordError);
    await expect(policyReader(policyWorld(policyText(), policyAct({ instant: null }) + fence)).read()).rejects.toBeInstanceOf(AdmissionRecordError);
    const key = Object.keys(world()).find(k => k.endsWith('-ACT.md') && k.includes('OBSERVATION'))!;
    await expect(reader(world({ [key]: world()[key]! + fence })).read()).rejects.toBeInstanceOf(AdmissionRecordError);
    await expect(reader(world({ [key]: world()[key]!.replace(/Recorded at \(UTC\): \S+\n\n/, '') + fence })).read()).rejects.toBeInstanceOf(AdmissionRecordError);
  });
  it('counts a field only in prose: a fenced copy of any act or instance field refuses both readers', async () => {
    const quote = (line: string): string => `\n\`\`\`text\n${line}\n\`\`\`\n`;
    for (const line of ['Act type: `approve-policy`', 'Act identity: `PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-APPROVAL-2026-10-04`', `Exact digest (SHA-256): \`${'a'.repeat(64)}\``, 'Date: 2026-10-04'])
      await expect(policyReader(policyWorld(policyText(), policyAct() + quote(line))).read(), line).rejects.toBeInstanceOf(AdmissionRecordError);
    const key = Object.keys(world()).find(k => k.endsWith('-ACT.md') && k.includes('OBSERVATION'))!;
    for (const line of ['Act type: `consent-observation`', `Exact digest (SHA-256): \`${'a'.repeat(64)}\``, 'Project identity: `project:syzygy`'])
      await expect(reader(world({ [key]: world()[key]! + quote(line) })).read(), line).rejects.toBeInstanceOf(AdmissionRecordError);
    for (const line of ['Record ID: `OTHER`', 'Subject: `(project:syzygy, repository:other)`', 'Proposed revocation state: active; supersedes no earlier consent'])
      await expect(reader(world({ [REDIS_PATH]: obsText() + quote(line), [key]: actText('consent-observation', REDIS_PATH, obsText() + quote(line)) })).read(), line).rejects.toBeInstanceOf(AdmissionRecordError);
  });
  it('refuses the recorder\'s file when its act type, identity, title or provenance is not the recorder\'s form', async () => {
    for (const bad of [policyAct({ type: 'amend-policy' }), policyAct({ type: 'amend-policy', identity: 'PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-APPROVAL-2026-10-04' }), policyAct({ identity: 'something-else' }), policyAct().replace('(public-source screening scope)', ''), policyAct().replace('owner-adopted (bootstrap, uncorrelated)', 'owner-adopted'), policyAct({ date: '2026-10-05' }).replace('2026-10-05', '2026-10-04')])
      await expect(policyReader(policyWorld(policyText(), bad)).read(), bad).rejects.toBeInstanceOf(AdmissionRecordError);
  });
  it('refuses a malformed recorded-at line in the policy act', async () => {
    for (const loose of ['  Recorded at (UTC): 2026-10-04T09:30:00Z', 'recorded at (utc): 2026-10-04T09:30:00Z']) {
      const act = policyAct().replace('Owner: Tzeusy', `${loose}\n\nOwner: Tzeusy`);
      await expect(policyReader(policyWorld(policyText(), act)).read(), loose).rejects.toBeInstanceOf(AdmissionRecordError);
    }
  });
  it('without a policy reader the requirement stays unsatisfied', async () => {
    expect(await createAdmissionRecordsPort({ reader: reader(world()), now: () => AT }).check(requirement('public-source-policy'))).toMatchObject({ satisfied: false });
  });
});

describe('egress version 2 record', () => {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  const v2Text = (): string => readFileSync(path.join(repoRoot, EGRESS_V2_INSTANCE), 'utf8');   // the real candidate bytes
  const CLASS_MODULE = '.syzygy/governance/contracts/rfcs/RFC-0005/consent-egress-secrets.md';
  const moduleText = (): string => readFileSync(path.join(repoRoot, CLASS_MODULE), 'utf8');   // the real installed RFC-0005 module
  const V2_ACT = `${DECISIONS_DIR}/PUBLIC-EGRESS-V2-ANTHROPIC-ACT.md`;
  const V1_ACT = `${DECISIONS_DIR}/PUBLIC-REPO-ADMISSION-EGRESS-ANTHROPIC-ACT.md`;
  const CLASS_ACT = `${DECISIONS_DIR}/RFC5-PROJECT-DOCUMENTATION-CLASS-AMENDMENT-ACT.md`;
  const classAct = (over: { digest?: string; date?: string; instant?: string } = {}): string => {
    const date = over.date ?? '2026-10-03';
    return renderClassAct(over.digest ?? sha(moduleText()), date, over.instant ?? `${date}T09:30:00Z`);
  };
  /** Version 1 took effect the day before version 2 (version 2 supersedes it only by being strictly later), and the RFC5-14 class
   * amendment that version 2's project-documentation class depends on is recorded, before version 2. */
  const v2World = (over: Record<string, string> = {}): Record<string, string> => world({
    [V1_ACT]: actText('consent-egress', EGRESS_PATH, egressText(), '2026-10-03'), [EGRESS_V2_INSTANCE]: v2Text(), [V2_ACT]: actText('consent-egress', EGRESS_V2_INSTANCE, v2Text()),
    [CLASS_ACT]: classAct(), [CLASS_MODULE]: moduleText(), ...over,
  });
  const egressVersions = (records: Awaited<ReturnType<ReturnType<typeof reader>['read']>>, now: number): string[] => inForceRecords(records, now).filter(r => r.class === 'egress').map(r => r.version);
  const port = (files: Record<string, string>, now: number) => createAdmissionRecordsPort({ reader: reader(files), now: () => now });
  const V1_AT = Date.UTC(2026, 9, 3, 9, 30, 0);

  it('is read from the recorder\'s act: version 2 supersedes version 1 once in force', async () => {
    const records = await reader(v2World()).read();
    const v2 = records.find(r => r.version === '0.2.0-candidate.1')!;
    expect(v2).toMatchObject({ class: 'egress', providerId: 'anthropic', digest: sha(v2Text()), inForceAt: AT, supersedes: 'PUBLIC-EGRESS-anthropic@0.1.0-candidate.7', supersessionAt: AT, admittedRepositories: ['psf-requests', 'redis-redis'] });
    expect(v2.contentClasses).toContain('project-documentation');
    expect(egressVersions(records, AT)).toEqual(['0.2.0-candidate.1']);
    expect(await port(v2World(), AT).check(requirement('egress-consent'))).toEqual({ satisfied: true, record: 'PUBLIC-EGRESS-anthropic@0.2.0-candidate.1' });
  });
  it('leaves version 1 standing before the version 2 act takes effect, and with no version 1 act at all', async () => {
    expect(egressVersions(await reader(v2World()).read(), AT - 1)).toEqual(['0.1.0-candidate.7']);   // version 2 is not in force yet
    const later = v2World({ [V2_ACT]: actText('consent-egress', EGRESS_V2_INSTANCE, v2Text(), '2026-10-09') });
    expect(egressVersions(await reader(later).read(), AT)).toEqual(['0.1.0-candidate.7']);
    const only = v2World(); delete only[V1_ACT];
    expect(egressVersions(await reader(only).read(), AT)).toEqual(['0.2.0-candidate.1']);
  });
  it('refuses when version 2 did not take effect strictly after version 1: the same instant, or earlier', async () => {
    await expect(reader(v2World({ [V1_ACT]: actText('consent-egress', EGRESS_PATH, egressText(), '2026-10-04') })).read()).rejects.toBeInstanceOf(AdmissionRecordError);   // same instant
    await expect(reader(v2World({ [V1_ACT]: actText('consent-egress', EGRESS_PATH, egressText(), '2026-10-04', undefined, '2026-10-04T09:30:01Z') })).read()).rejects.toBeInstanceOf(AdmissionRecordError);   // version 1 a second later
    await expect(reader(v2World({ [V1_ACT]: actText('consent-egress', EGRESS_PATH, egressText(), '2026-10-05') })).read()).rejects.toBeInstanceOf(AdmissionRecordError);   // version 1 later
    expect((await reader(v2World({ [V1_ACT]: actText('consent-egress', EGRESS_PATH, egressText(), '2026-10-04', undefined, '2026-10-04T09:29:59Z') })).read()).length).toBe(3);   // one second earlier is enough
  });
  it('binds the exact bytes: an edited record is not in force', async () => {
    const edited = await reader(v2World({ [EGRESS_V2_INSTANCE]: `${v2Text()}\nedited\n` })).read();
    expect(edited.find(r => r.version === '0.2.0-candidate.1')!.inForceAt).toBeNull();
  });
  it('supersession follows the version 2 act\'s instant, not its current bytes: drifted version 2 leaves version 1 replaced and nothing granted', async () => {
    const drifted = v2World({ [EGRESS_V2_INSTANCE]: `${v2Text()}\nedited\n` });
    const records = await reader(drifted).read();
    expect(egressVersions(records, AT)).toEqual([]);   // version 1 is replaced from the act's instant; version 2's bytes no longer match
    expect(egressVersions(records, AT - 1)).toEqual(['0.1.0-candidate.7']);   // before the act, version 1 stands
    expect(egressVersions(records, V1_AT)).toEqual(['0.1.0-candidate.7']);
    expect(await port(drifted, AT).check(requirement('egress-consent'))).toMatchObject({ satisfied: false });
    expect(await port(drifted, AT - 1).check(requirement('egress-consent'))).toMatchObject({ satisfied: true });
  });
  it('accepts the closed list only: other names, identities, artifacts, titles and revocation lines refuse the read', async () => {
    const cases: Array<[string, Record<string, string>]> = [
      ['another file name under the version 2 prefix', { [`${DECISIONS_DIR}/PUBLIC-EGRESS-V2-ANTHROPIC-WITHDRAWAL.md`]: 'withdrawn' }],
      ['a copy of the act under another name', { [`${DECISIONS_DIR}/PUBLIC-EGRESS-V2-OTHER-ACT.md`]: actText('consent-egress', EGRESS_V2_INSTANCE, v2Text()) }],
      ['the version 1 identity on the version 2 act', { [V2_ACT]: actText('consent-egress', EGRESS_V2_INSTANCE, v2Text()).replace(/^Act identity: `[^`]+`/m, 'Act identity: `PUBLIC-EGRESS-ANTHROPIC-2026-10-04`') }],
      ['the version 1 instance under the version 2 act', { [V2_ACT]: actText('consent-egress', EGRESS_PATH, egressText()) }],
      ['an observation type on the version 2 act', { [V2_ACT]: actText('consent-observation', EGRESS_V2_INSTANCE, v2Text()) }],
      ['observation bytes at the egress instance path under an observation-typed act', { [EGRESS_V2_INSTANCE]: obsText(), [V2_ACT]: actText('consent-observation', EGRESS_V2_INSTANCE, obsText()) }],
      ['a title that is not the recorder\'s', { [V2_ACT]: actText('consent-egress', EGRESS_V2_INSTANCE, v2Text()).replace(', version 2', '') }],
      ['version 1 revocation wording in the version 2 record', (() => { const t = v2Text().replace(/^Proposed revocation state: .*$/m, 'Proposed revocation state: active; supersedes no earlier consent'); return { [EGRESS_V2_INSTANCE]: t, [V2_ACT]: actText('consent-egress', EGRESS_V2_INSTANCE, t) }; })()],
      ['an altered successor in the version 2 record', (() => { const t = v2Text().replace('0.1.0-candidate.7', '0.0.9'); return { [EGRESS_V2_INSTANCE]: t, [V2_ACT]: actText('consent-egress', EGRESS_V2_INSTANCE, t) }; })()],
      ['a version 2 record under another record id', (() => { const t = v2Text().replace('Record ID: `PUBLIC-EGRESS-anthropic`', 'Record ID: `PUBLIC-EGRESS-other`'); return { [EGRESS_V2_INSTANCE]: t, [V2_ACT]: actText('consent-egress', EGRESS_V2_INSTANCE, t) }; })()],
      ['a version 2 act over the version 1 record id and version', (() => { const t = v2Text().replace('0.2.0-candidate.1', '0.1.0-candidate.7'); return { [EGRESS_V2_INSTANCE]: t, [V2_ACT]: actText('consent-egress', EGRESS_V2_INSTANCE, t) }; })()],
    ];
    for (const [name, over] of cases) await expect(reader(v2World(over)).read(), name).rejects.toBeInstanceOf(AdmissionRecordError);
  });
  it('refuses a version 1 act typed as an observation over observation bytes at the egress instance path', async () => {
    // Without the act-type check this input is read as an observation consent for the egress instance's path.
    const files = world({ [`${DECISIONS_DIR}/PUBLIC-REPO-ADMISSION-EGRESS-ANTHROPIC-ACT.md`]: actText('consent-observation', EGRESS_PATH, obsText()), [EGRESS_PATH]: obsText() });
    await expect(reader(files).read()).rejects.toBeInstanceOf(AdmissionRecordError);
    expect(await port(files, AT).check(requirement('observation-consent'))).toMatchObject({ satisfied: false });
  });
  it('ignores a Recorded-at line inside a code fence in the version 2 act, and refuses it', async () => {
    const fence = '\n```text\nRecorded at (UTC): 2026-10-04T00:00:01Z\n```\n';
    await expect(reader(v2World({ [V2_ACT]: actText('consent-egress', EGRESS_V2_INSTANCE, v2Text()) + fence })).read()).rejects.toBeInstanceOf(AdmissionRecordError);
    const dateOnly = actText('consent-egress', EGRESS_V2_INSTANCE, v2Text()).replace(/Recorded at \(UTC\): \S+\n\n/, '');
    await expect(reader(v2World({ [V2_ACT]: dateOnly + fence })).read()).rejects.toBeInstanceOf(AdmissionRecordError);
  });

  describe('the RFC5-14 class amendment version 2 depends on', () => {
    it('is required: no record, an edited module, a wrong form, or an amendment later than version 2 all refuse', async () => {
      const cases: Array<[string, Record<string, string>]> = [
        ['an installed module that no longer matches the act digest', { [CLASS_MODULE]: `${moduleText()}\nedited\n` }],
        ['a digest of other bytes', { [CLASS_ACT]: classAct({ digest: 'a'.repeat(64) }) }],
        ['an amendment taking effect after version 2', { [CLASS_ACT]: classAct({ date: '2026-10-04', instant: '2026-10-04T09:30:01Z' }) }],
        ['a title that is not the recorder\'s', { [CLASS_ACT]: classAct().replace('# Owner act — RFC5-14', '# Owner act — RFC5-15') }],
        ['another act type', { [CLASS_ACT]: classAct().replace(/^Act type: `[^`]+`/m, 'Act type: `adopt-doctrine`') }],
        ['another artifact', { [CLASS_ACT]: classAct().replace(/^Artifact identity: `[^`]+`/m, 'Artifact identity: `.syzygy/governance/contracts/rfcs/RFC-0004/x.md`') }],
        ['another project', { [CLASS_ACT]: classAct().replace('`project:syzygy`', '`project:butlers`') }],
        ['an identity that is not the date\'s', { [CLASS_ACT]: classAct().replace(/^Act identity: `[^`]+`/m, 'Act identity: `RFC5-PROJECT-DOCUMENTATION-AMEND-2026-10-01`') }],
        ['a fenced second instant', { [CLASS_ACT]: `${classAct()}\n\`\`\`text\nAct instant: 2026-10-03T00:00:01Z\n\`\`\`\n` }],
      ];
      for (const [name, over] of cases) await expect(reader(v2World(over)).read(), name).rejects.toBeInstanceOf(AdmissionRecordError);
      const noRecord = v2World(); delete noRecord[CLASS_ACT];
      const noModule = v2World(); delete noModule[CLASS_MODULE];
      await expect(reader(noRecord).read(), 'no class act record').rejects.toBeInstanceOf(AdmissionRecordError);
      await expect(reader(noModule).read(), 'no installed module').rejects.toBeInstanceOf(AdmissionRecordError);
      expect((await reader(v2World({ [CLASS_ACT]: classAct({ date: '2026-10-04', instant: '2026-10-04T09:30:00Z' }) })).read()).length).toBe(3);   // the same instant as version 2 is allowed
    });
    it('is found only at the top of the decisions directory: a copy in a subdirectory is not the recorder\'s file', async () => {
      const nested = v2World(); const moved = nested[CLASS_ACT]!; delete nested[CLASS_ACT]; nested[`${DECISIONS_DIR}/archive/RFC5-PROJECT-DOCUMENTATION-CLASS-AMENDMENT-ACT.md`] = moved;
      await expect(reader(nested).read()).rejects.toBeInstanceOf(AdmissionRecordError);
    });
    it('is not asked of a world without version 2', async () => {
      expect((await reader(world()).read()).length).toBe(2);
    });
  });

  describe('withdrawal and forgery forms the reader does not define', () => {
    const naming = (text: string): Record<string, string> => ({ [`${DECISIONS_DIR}/NOTES.md`]: text });
    const sub = (name: string, text: string): Record<string, string> => ({ [`${DECISIONS_DIR}/archive/deep/${name}`]: text });
    it('refuses a file outside the closed list that names an admission artifact, act identity or record id, in any case, dash spelling or directory', async () => {
      const variants = [
        `Artifact identity: \`${EGRESS_V2_INSTANCE}\``,
        `Artifact identity: \`${REDIS_PATH}\``,
        `artifact   identity :  ${REDIS_PATH.toUpperCase()}`,
        '- **Act identity**: `PUBLIC-OBS-REDIS-2026-10-05`',
        'Act identity: `public\u2011egress\u2010anthropic-2026-10-05`',
        'Act identity: `PUBLIC\uFF0DEGRESS-ANTHROPIC-V2-2026-10-05`',
        'Record ID: `PUBLIC-EGRESS-anthropic`',
        '> Record ID: `public-obs-requests-2026-10-03`',
        'Act identity: `\uFF30\uFF35\uFF22\uFF2C\uFF29\uFF23-OBS-REDIS-2026-10-05`',   // fullwidth letters fold to the ASCII spelling
        'This revokes the consent recorded in PUBLIC-OBS-REDIS-2026-10-03 in full.',   // named in prose, not on a field line
        `The artifact ${REDIS_PATH} is withdrawn.`,
      ];
      for (const line of variants) {
        await expect(reader(v2World(naming(`# Withdrawal\n\n${line}\n`))).read(), line).rejects.toBeInstanceOf(AdmissionRecordError);
        await expect(reader(v2World(sub('withdrawal.md', `# Withdrawal\n\n${line}\n`))).read(), `sub: ${line}`).rejects.toBeInstanceOf(AdmissionRecordError);
      }
    });
    it('applies the field-line rule to the aggregate acceptance record, which is exempt from the whole-text rule only', async () => {
      const aggregate = (extra: string): Record<string, string> => ({ [`${DECISIONS_DIR}/ACCEPTANCE-ACT-RECORD.md`]: `# Acceptance act record\n\n| Recording | \`${V2_ACT}\` |\n${extra}` });
      expect((await reader(v2World(aggregate(''))).read()).length).toBe(3);
      for (const line of [`Artifact identity: \`${REDIS_PATH}\``, 'Record ID: `PUBLIC-OBS-REDIS-2026-10-03`', 'Act identity: `PUBLIC-EGRESS-ANTHROPIC-2026-10-09`'])
        await expect(reader(v2World(aggregate(`\n${line}\n`))).read(), line).rejects.toBeInstanceOf(AdmissionRecordError);
    });
    it('refuses a file whose name carries an admission stem, in a subdirectory too', async () => {
      for (const name of ['public-obs-redis-withdrawal.md', 'Public\u2011Egress-Anthropic-WITHDRAWN.md', 'PUBLIC-REPO-ADMISSION-NOTES.md'])
        await expect(reader(v2World(sub(name, 'x'))).read(), name).rejects.toBeInstanceOf(AdmissionRecordError);
    });
    it('does not refuse unrelated records, including ones in subdirectories', async () => {
      expect((await reader(v2World({ ...naming('# Notes\n\nAct identity: `SOMETHING-ELSE-2026-10-05`\nArtifact identity: `.syzygy/x.md`\n'), ...sub('other.md', 'plain text') })).read()).length).toBe(3);
    });
    it('does not refuse the recorders\' other act records or the aggregate acceptance record they append to', async () => {
      const policy = JSON.stringify({ policyVersion: '1.2.0-public-source-candidate.2', publicSourceScope: { rules: [] } });
      const earlier = JSON.stringify({ policyVersion: '1.2.0-public-source-candidate.1', publicSourceScope: { rules: [] } });
      const others = {
        [`${DECISIONS_DIR}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-ACT.md`]: renderPolicyAct(sha(earlier), '2026-10-03', '2026-10-03T09:30:00Z', 1),
        [`${DECISIONS_DIR}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V2-ACT.md`]: renderPolicyAct(sha(policy), '2026-10-04', '2026-10-04T09:30:00Z', 2, sha(earlier)),
        [`${DECISIONS_DIR}/ACCEPTANCE-ACT-RECORD.md`]: `# Acceptance act record\n\n| Act type / artifact | \`consent-observation\` / \`${REDIS_PATH}\` |\n| Recording | \`${V2_ACT}\` |\n`,
      };
      expect((await reader(v2World(others)).read()).length).toBe(3);
      expect(await createPackagePolicyReader({ root: '/r', fs: memoryFs(v2World({ ...others, [POLICY_PATH]: policy })) }).read()).toHaveLength(1);   // only the version 2 act binds these bytes
    });
    it('refuses when a subdirectory cannot be listed or the tree is too deep', async () => {
      const deep = `${DECISIONS_DIR}/${'d/'.repeat(8)}f.md`;
      await expect(reader(v2World({ [deep]: 'x' })).read()).rejects.toBeInstanceOf(AdmissionRecordError);
    });
  });

  describe('instance sections', () => {
    const key = `${DECISIONS_DIR}/PUBLIC-REPO-ADMISSION-REDIS-OBSERVATION-ACT.md`;
    it('takes admitted repositories only from the Scope section', async () => {
      const text = `${egressText()}\n## Not admitted\n\n- \`(project:syzygy, repository:elsewhere)\`\n`;
      const files = world({ [EGRESS_PATH]: text, [`${DECISIONS_DIR}/PUBLIC-REPO-ADMISSION-EGRESS-ANTHROPIC-ACT.md`]: actText('consent-egress', EGRESS_PATH, text) });
      expect((await reader(files).read()).find(r => r.class === 'egress')!.admittedRepositories).toEqual(['psf-requests', 'redis-redis']);
      const twice = `${egressText()}\n## Scope\n\n- \`(project:syzygy, repository:elsewhere)\`\n`;
      await expect(reader(world({ [EGRESS_PATH]: twice, [`${DECISIONS_DIR}/PUBLIC-REPO-ADMISSION-EGRESS-ANTHROPIC-ACT.md`]: actText('consent-egress', EGRESS_PATH, twice) })).read()).rejects.toBeInstanceOf(AdmissionRecordError);
    });
    it('takes admitted revisions only from the one revisions table', async () => {
      const other = 'f'.repeat(40);
      const text = `${obsText()}\n| Label | Notes |\n|---|---|\n| \`x\` | \`${other}\` |\n`;
      const files = world({ [REDIS_PATH]: text, [key]: actText('consent-observation', REDIS_PATH, text) });
      expect((await reader(files).read()).find(r => r.class === 'observation')!.admittedRevisions).toEqual([REDIS_REV, OTHER_REV]);
      const second = `${obsText()}\n| Label | Commit object id |\n|---|---|\n| \`x\` | \`${other}\` |\n`;
      await expect(reader(world({ [REDIS_PATH]: second, [key]: actText('consent-observation', REDIS_PATH, second) })).read()).rejects.toBeInstanceOf(AdmissionRecordError);
    });
  });
});

describe('screening scope version 2 policy act', () => {
  const V1 = `${DECISIONS_DIR}/${POLICY_ACT_FILE}`;
  const V2 = `${DECISIONS_DIR}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V2-ACT.md`;
  const p1 = JSON.stringify({ policyVersion: '1.2.0-public-source-candidate.1', publicSourceScope: { rules: [] } }, null, 1) + '\n';
  const p2 = JSON.stringify({ policyVersion: '1.2.0-public-source-candidate.2', publicSourceScope: { rules: ['more'] } }, null, 1) + '\n';
  const act = (text: string, version: 1 | 2, date = '2026-10-04'): string => renderPolicyAct(sha(text), date, `${date}T09:30:00Z`, version, sha(p1));
  const files = (policy: string, extra: Record<string, string>): Record<string, string> => ({ ...world(), [POLICY_PATH]: policy, ...extra });
  const policyReader = (f: Record<string, string>) => createPackagePolicyReader({ root: '/r', fs: memoryFs(seen(f)) });
  const check = (f: Record<string, string>, now: number) => createPackageAdmissionRecordsPort({ root: '/r', now: () => now, fs: memoryFs(seen(f)) }).check(requirement('public-source-policy'));
  const chainAt = (f: Record<string, string>, now: number) => readPolicyActChain({ root: '/r', fs: memoryFs(seen(f)), now });
  const V1_ID = 'PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-APPROVAL-2026-10-03';

  it('counts the version 2 act when the policy carries the version 2 bytes, and the version 1 act goes quiet', async () => {
    const f = files(p2, { [V1]: act(p1, 1, '2026-10-03'), [V2]: act(p2, 2) });
    expect(await policyReader(f).read()).toEqual([{ actIdentity: 'PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V2-APPROVAL-2026-10-04', digest: sha(p2), inForceAt: AT, until: null }]);
    expect(await check(f, AT)).toEqual({ satisfied: true, record: 'PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V2-APPROVAL-2026-10-04' });
  });
  it('counts the version 1 act while the policy still carries the version 1 bytes', async () => {
    const f = files(p1, { [V1]: act(p1, 1, '2026-10-03') });
    expect((await policyReader(f).read()).map(r => r.actIdentity)).toEqual([V1_ID]);
  });
  it('never brings back the superseded version 1 act when the policy bytes revert to its argument (B-4)', async () => {
    const f = files(p1, { [V1]: act(p1, 1, '2026-10-03'), [V2]: act(p2, 2) });
    // version 1's term ends where version 2's begins, whatever the bytes are
    expect(await policyReader(f).read()).toEqual([{ actIdentity: V1_ID, digest: sha(p1), inForceAt: Date.UTC(2026, 9, 3, 9, 30, 0), until: AT }]);
    expect(await check(f, AT + 1000)).toMatchObject({ satisfied: false });
    expect(await check(f, AT)).toMatchObject({ satisfied: false });
    expect(await chainAt(f, AT + 1000)).toMatchObject({ state: 'refused', why: expect.stringContaining('differ') });
    // before version 2's instant, version 1 is the act in force and binds these bytes: both views say so
    expect(await check(f, AT - 1)).toEqual({ satisfied: true, record: V1_ID });
    expect(await chainAt(f, AT - 1)).toMatchObject({ state: 'ok', final: { identity: V1_ID } });
  });
  it('a version 2 act not yet in force leaves version 1 in force, in both views', async () => {
    const f = files(p1, { [V1]: act(p1, 1, '2026-10-03'), [V2]: act(p2, 2, '2027-01-01') });
    expect(await check(f, AT)).toEqual({ satisfied: true, record: V1_ID });
    expect(await chainAt(f, AT)).toMatchObject({ state: 'ok', final: { identity: V1_ID } });
    expect(await check(f, Date.UTC(2027, 0, 2))).toMatchObject({ satisfied: false });
    expect(await chainAt(f, Date.UTC(2027, 0, 2))).toMatchObject({ state: 'refused' });
  });
  it('counts nothing for version 2 bytes with only the version 1 act, or for an edited policy under the version 2 act', async () => {
    expect(await policyReader(files(p2, { [V1]: act(p1, 1, '2026-10-03') })).read()).toEqual([]);
    expect(await policyReader(files(p2 + ' ', { [V1]: act(p1, 1, '2026-10-03'), [V2]: act(p2, 2) })).read()).toEqual([]);
  });
  it('refuses a version 2 act in a form the recorder does not write', async () => {
    const good = act(p2, 2);
    const base = { [V1]: act(p1, 1, '2026-10-03') };
    for (const bad of [good.replace(', version 2)', ')'), good.replace('V2-APPROVAL', 'APPROVAL'), good.replace(/^Act type: `[^`]+`/m, 'Act type: `adopt-doctrine`'), good.replace(/Recorded at \(UTC\): \S+\n\n/, '')])
      await expect(policyReader(files(p2, { ...base, [V2]: bad })).read(), bad.slice(0, 120)).rejects.toBeInstanceOf(AdmissionRecordError);
  });
  it('refuses an unlisted record that names the policy: another file, a subdirectory, a loose field spelling, a Unicode-hyphen identity', async () => {
    const lines = [`Artifact identity: \`${POLICY_PATH}\``, `artifact   identity :  ${POLICY_PATH.toLowerCase()}`, 'Act identity: `PWB\u2011SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V3-APPROVAL-2026-10-05`', '- **Act identity**: `pwb-secret-classification-policy-withdrawal-2026-10-05`', 'This revokes PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-APPROVAL-2026-10-04 in full.'];
    for (const line of lines) {
      const text = `# Withdrawal\n\n${line}\n`;
      await expect(policyReader(files(p1, { [V1]: act(p1, 1), [`${DECISIONS_DIR}/NOTES.md`]: text })).read(), line).rejects.toBeInstanceOf(AdmissionRecordError);
      await expect(policyReader(files(p1, { [V1]: act(p1, 1), [`${DECISIONS_DIR}/launch-gate/deep/NOTES.md`]: text })).read(), `sub: ${line}`).rejects.toBeInstanceOf(AdmissionRecordError);
    }
  });
});

// P-105 (owner act of 2026-10-08, syzygy-fxro): the third form. Version 3 supersedes version 2 as version 2 superseded version 1.
describe('screening scope version 3 policy act', () => {
  const V1 = `${DECISIONS_DIR}/${POLICY_ACT_FILE}`;
  const V2 = `${DECISIONS_DIR}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V2-ACT.md`;
  const V3 = `${DECISIONS_DIR}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V3-ACT.md`;
  const p1 = JSON.stringify({ policyVersion: '1.2.0-public-source-candidate.1', publicSourceScope: { rules: [] } }, null, 1) + '\n';
  const p2 = JSON.stringify({ policyVersion: '1.3.0-public-source-candidate.1.none', publicSourceScope: { rules: ['more'] } }, null, 1) + '\n';
  const p3 = JSON.stringify({ policyVersion: '1.4.0-public-source-candidate.1.none.code-all', publicSourceScope: { rules: ['more'], activeContent: {} } }, null, 1) + '\n';
  const V2_AT = Date.UTC(2026, 9, 4, 9, 30, 0), V3_AT = Date.UTC(2026, 9, 5, 9, 30, 0);
  const v1 = (): string => renderPolicyAct(sha(p1), '2026-10-03', '2026-10-03T09:30:00Z', 1);
  const v2 = (): string => renderPolicyAct(sha(p2), '2026-10-04', '2026-10-04T09:30:00Z', 2, sha(p1));
  const v3 = (text = p3, date = '2026-10-05', superseded = sha(p2)): string => renderPolicyAct(sha(text), date, `${date}T09:30:00Z`, 3, superseded);
  const files = (policy: string, extra: Record<string, string>): Record<string, string> => ({ ...world(), [POLICY_PATH]: policy, ...extra });
  const chainAt = (f: Record<string, string>, now: number) => readPolicyActChain({ root: '/r', fs: memoryFs(seen(f)), now });
  const check = (f: Record<string, string>, now: number) => createPackageAdmissionRecordsPort({ root: '/r', now: () => now, fs: memoryFs(seen(f)) }).check(requirement('public-source-policy'));
  const V2_ID = 'PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V2-APPROVAL-2026-10-04';
  const V3_ID = 'PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V3-APPROVAL-2026-10-05';

  it('puts version 3 in force from its instant over version 2 over version 1, in both views', async () => {
    const f = files(p3, { [V1]: v1(), [V2]: v2(), [V3]: v3() });
    expect(await chainAt(f, V3_AT)).toMatchObject({ state: 'ok', v1: { digest: sha(p1) }, v2: { digest: sha(p2) }, v3: { digest: sha(p3) }, final: { identity: V3_ID, recordedAt: V3_AT }, policyDigest: sha(p3) });
    expect(await check(f, V3_AT)).toEqual({ satisfied: true, record: V3_ID });
    expect(await createPackagePolicyReader({ root: '/r', fs: memoryFs(seen(f)) }).read()).toEqual([{ actIdentity: V3_ID, digest: sha(p3), inForceAt: V3_AT, until: null }]);
  });
  it('leaves version 2 in force before version 3\'s instant, and never brings it back after', async () => {
    const before = files(p2, { [V1]: v1(), [V2]: v2(), [V3]: v3() });
    expect(await chainAt(before, V3_AT - 1)).toMatchObject({ state: 'ok', final: { identity: V2_ID } });
    expect(await check(before, V3_AT - 1)).toEqual({ satisfied: true, record: V2_ID });
    expect(await chainAt(before, V3_AT)).toMatchObject({ state: 'refused' });
    expect(await check(before, V3_AT)).toMatchObject({ satisfied: false });
    expect(await chainAt(before, V2_AT - 1 - 86_400_000)).toMatchObject({ state: 'absent' });
  });
  it.each<[string, string, Record<string, string>]>([
    ['version 3 without version 2', p3, { [V1]: v1(), [V3]: v3() }],
    ['version 3 without version 1 or 2', p3, { [V3]: v3() }],
    ['version 3 not later than version 2', p3, { [V1]: v1(), [V2]: v2(), [V3]: v3(p3, '2026-10-04') }],
    ['version 3 over version 2\'s bytes', p2, { [V1]: v1(), [V2]: v2(), [V3]: v3(p2) }],
    ['a supersession naming version 1\'s argument', p3, { [V1]: v1(), [V2]: v2(), [V3]: v3(p3, '2026-10-05', sha(p1)) }],
    ['a supersession naming version 1\'s record', p3, { [V1]: v1(), [V2]: v2(), [V3]: v3().replace('PUBLIC-SOURCE-SCOPE-V2-ACT.md', 'PUBLIC-SOURCE-SCOPE-ACT.md') }],
    ['a version 3 record titled as version 2', p3, { [V1]: v1(), [V2]: v2(), [V3]: v3().replace(', version 3)', ', version 2)') }],
    ['a version 3 record with version 2\'s identity', p3, { [V1]: v1(), [V2]: v2(), [V3]: v3().replace('V3-APPROVAL', 'V2-APPROVAL') }],
    ['other policy bytes', `${p3} `, { [V1]: v1(), [V2]: v2(), [V3]: v3() }],
  ])('refuses %s', async (_name, policy, extra) => {
    expect(await chainAt(files(policy, extra), V3_AT + 1000)).toMatchObject({ state: 'refused' });
  });
});

// P-110 (owner act of 2026-10-20, syzygy-3sjj): the fourth form. Version 4 supersedes version 3 as version 3 superseded version 2.
describe('screening scope version 4 policy act', () => {
  const V1 = `${DECISIONS_DIR}/${POLICY_ACT_FILE}`;
  const V2 = `${DECISIONS_DIR}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V2-ACT.md`;
  const V3 = `${DECISIONS_DIR}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V3-ACT.md`;
  const V4 = `${DECISIONS_DIR}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V4-ACT.md`;
  const p1 = JSON.stringify({ policyVersion: '1.2.0-public-source-candidate.1', publicSourceScope: { rules: [] } }, null, 1) + '\n';
  const p2 = JSON.stringify({ policyVersion: '1.3.0-public-source-candidate.1.none', publicSourceScope: { rules: ['more'] } }, null, 1) + '\n';
  const p3 = JSON.stringify({ policyVersion: '1.4.0-public-source-candidate.1.none.code-all', publicSourceScope: { rules: ['more'], activeContent: {} } }, null, 1) + '\n';
  const p4 = JSON.stringify({ policyVersion: '1.5.0-public-source-candidate.1.none.code-all.redact-span', publicSourceScope: { rules: ['more'], activeContent: {}, secretRedaction: {} } }, null, 1) + '\n';
  const V4_AT = Date.UTC(2026, 9, 6, 9, 30, 0);
  const v1 = (): string => renderPolicyAct(sha(p1), '2026-10-03', '2026-10-03T09:30:00Z', 1);
  const v2 = (): string => renderPolicyAct(sha(p2), '2026-10-04', '2026-10-04T09:30:00Z', 2, sha(p1));
  const v3 = (): string => renderPolicyAct(sha(p3), '2026-10-05', '2026-10-05T09:30:00Z', 3, sha(p2));
  const v4 = (text = p4, date = '2026-10-06', superseded = sha(p3)): string => renderPolicyAct(sha(text), date, `${date}T09:30:00Z`, 4, superseded);
  const files = (policy: string, extra: Record<string, string>): Record<string, string> => ({ ...world(), [POLICY_PATH]: policy, ...extra });
  const all = (): Record<string, string> => ({ [V1]: v1(), [V2]: v2(), [V3]: v3(), [V4]: v4() });
  const chainAt = (f: Record<string, string>, now: number) => readPolicyActChain({ root: '/r', fs: memoryFs(seen(f)), now });
  const check = (f: Record<string, string>, now: number) => createPackageAdmissionRecordsPort({ root: '/r', now: () => now, fs: memoryFs(seen(f)) }).check(requirement('public-source-policy'));
  const V3_ID = 'PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V3-APPROVAL-2026-10-05';
  const V4_ID = 'PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V4-APPROVAL-2026-10-06';

  it('puts version 4 in force from its instant over versions 3, 2 and 1, in both views', async () => {
    const f = files(p4, all());
    expect(await chainAt(f, V4_AT)).toMatchObject({ state: 'ok', v3: { digest: sha(p3) }, v4: { digest: sha(p4) }, final: { identity: V4_ID, recordedAt: V4_AT }, policyDigest: sha(p4) });
    expect(await check(f, V4_AT)).toEqual({ satisfied: true, record: V4_ID });
    expect(await createPackagePolicyReader({ root: '/r', fs: memoryFs(seen(f)) }).read()).toEqual([{ actIdentity: V4_ID, digest: sha(p4), inForceAt: V4_AT, until: null }]);
  });
  it('leaves version 3 in force before version 4\'s instant, and never brings it back after', async () => {
    const before = files(p3, all());
    expect(await chainAt(before, V4_AT - 1)).toMatchObject({ state: 'ok', final: { identity: V3_ID } });
    expect(await check(before, V4_AT - 1)).toEqual({ satisfied: true, record: V3_ID });
    expect(await chainAt(before, V4_AT)).toMatchObject({ state: 'refused' });
    expect(await check(before, V4_AT)).toMatchObject({ satisfied: false });
  });
  it.each<[string, string, Record<string, string>]>([
    ['version 4 without version 3', p4, { [V1]: v1(), [V2]: v2(), [V4]: v4() }],
    ['version 4 alone', p4, { [V4]: v4() }],
    ['version 4 not later than version 3', p4, { ...all(), [V4]: v4(p4, '2026-10-05') }],
    ['version 4 over version 3\'s bytes', p3, { ...all(), [V4]: v4(p3) }],
    ['a supersession naming version 2\'s argument', p4, { ...all(), [V4]: v4(p4, '2026-10-06', sha(p2)) }],
    ['a supersession naming version 2\'s record', p4, { ...all(), [V4]: v4().replace('PUBLIC-SOURCE-SCOPE-V3-ACT.md', 'PUBLIC-SOURCE-SCOPE-V2-ACT.md') }],
    ['a version 4 record titled as version 3', p4, { ...all(), [V4]: v4().replace(', version 4)', ', version 3)') }],
    ['a version 4 record with version 3\'s identity', p4, { ...all(), [V4]: v4().replace('V4-APPROVAL', 'V3-APPROVAL') }],
    ['other policy bytes', `${p4} `, all()],
  ])('refuses %s', async (_name, policy, extra) => {
    expect(await chainAt(files(policy, extra), V4_AT + 1000)).toMatchObject({ state: 'refused' });
  });
});

// P-116 (owner act of 2026-11-03, syzygy-mea.4): the fifth form. Version 5 supersedes version 4 as version 4 superseded version 3.
describe('screening scope version 5 policy act', () => {
  const V1 = `${DECISIONS_DIR}/${POLICY_ACT_FILE}`;
  const V2 = `${DECISIONS_DIR}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V2-ACT.md`;
  const V3 = `${DECISIONS_DIR}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V3-ACT.md`;
  const V4 = `${DECISIONS_DIR}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V4-ACT.md`;
  const V5 = `${DECISIONS_DIR}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V5-ACT.md`;
  const p1 = JSON.stringify({ policyVersion: '1.2.0-public-source-candidate.1', publicSourceScope: { rules: [] } }, null, 1) + '\n';
  const p2 = JSON.stringify({ policyVersion: '1.3.0-public-source-candidate.1.none', publicSourceScope: { rules: ['more'] } }, null, 1) + '\n';
  const p3 = JSON.stringify({ policyVersion: '1.4.0-public-source-candidate.1.none.code-all', publicSourceScope: { rules: ['more'], activeContent: {} } }, null, 1) + '\n';
  const p4 = JSON.stringify({ policyVersion: '1.5.0-public-source-candidate.1.none.code-all.redact-span', publicSourceScope: { rules: ['more'], activeContent: {}, secretRedaction: {} } }, null, 1) + '\n';
  const p5 = JSON.stringify({ policyVersion: '1.6.0-public-source-candidate.1.none.code-all.redact-span.v5-bcd', publicSourceScope: { rules: ['more'], activeContent: {}, secretRedaction: {}, scopeDetectors: {} } }, null, 1) + '\n';
  const V5_AT = Date.UTC(2026, 9, 7, 9, 30, 0);
  const v1 = (): string => renderPolicyAct(sha(p1), '2026-10-03', '2026-10-03T09:30:00Z', 1);
  const v2 = (): string => renderPolicyAct(sha(p2), '2026-10-04', '2026-10-04T09:30:00Z', 2, sha(p1));
  const v3 = (): string => renderPolicyAct(sha(p3), '2026-10-05', '2026-10-05T09:30:00Z', 3, sha(p2));
  const v4 = (): string => renderPolicyAct(sha(p4), '2026-10-06', '2026-10-06T09:30:00Z', 4, sha(p3));
  const v5 = (text = p5, date = '2026-10-07', superseded = sha(p4)): string => renderPolicyAct(sha(text), date, `${date}T09:30:00Z`, 5, superseded);
  const files = (policy: string, extra: Record<string, string>): Record<string, string> => ({ ...world(), [POLICY_PATH]: policy, ...extra });
  const all = (): Record<string, string> => ({ [V1]: v1(), [V2]: v2(), [V3]: v3(), [V4]: v4(), [V5]: v5() });
  const chainAt = (f: Record<string, string>, now: number) => readPolicyActChain({ root: '/r', fs: memoryFs(seen(f)), now });
  const check = (f: Record<string, string>, now: number) => createPackageAdmissionRecordsPort({ root: '/r', now: () => now, fs: memoryFs(seen(f)) }).check(requirement('public-source-policy'));
  const V4_ID = 'PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V4-APPROVAL-2026-10-06';
  const V5_ID = 'PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V5-APPROVAL-2026-10-07';

  it('puts version 5 in force from its instant over versions 4 to 1, in both views', async () => {
    const f = files(p5, all());
    expect(await chainAt(f, V5_AT)).toMatchObject({ state: 'ok', v4: { digest: sha(p4) }, v5: { digest: sha(p5) }, final: { identity: V5_ID, recordedAt: V5_AT }, policyDigest: sha(p5) });
    expect(await check(f, V5_AT)).toEqual({ satisfied: true, record: V5_ID });
    expect(await createPackagePolicyReader({ root: '/r', fs: memoryFs(seen(f)) }).read()).toEqual([{ actIdentity: V5_ID, digest: sha(p5), inForceAt: V5_AT, until: null }]);
  });
  it('leaves version 4 in force before version 5\'s instant, and never brings it back after', async () => {
    const before = files(p4, all());
    expect(await chainAt(before, V5_AT - 1)).toMatchObject({ state: 'ok', final: { identity: V4_ID } });
    expect(await check(before, V5_AT - 1)).toEqual({ satisfied: true, record: V4_ID });
    expect(await chainAt(before, V5_AT)).toMatchObject({ state: 'refused' });
    expect(await check(before, V5_AT)).toMatchObject({ satisfied: false });
  });
  it.each<[string, string, Record<string, string>]>([
    ['version 5 without version 4', p5, { [V1]: v1(), [V2]: v2(), [V3]: v3(), [V5]: v5() }],
    ['version 5 alone', p5, { [V5]: v5() }],
    ['version 5 not later than version 4', p5, { ...all(), [V5]: v5(p5, '2026-10-06') }],
    ['version 5 over version 4\'s bytes', p4, { ...all(), [V5]: v5(p4) }],
    ['a supersession naming version 3\'s argument', p5, { ...all(), [V5]: v5(p5, '2026-10-07', sha(p3)) }],
    ['a supersession naming version 3\'s record', p5, { ...all(), [V5]: v5().replace('PUBLIC-SOURCE-SCOPE-V4-ACT.md', 'PUBLIC-SOURCE-SCOPE-V3-ACT.md') }],
    ['a version 5 record titled as version 4', p5, { ...all(), [V5]: v5().replace(', version 5)', ', version 4)') }],
    ['a version 5 record with version 4\'s identity', p5, { ...all(), [V5]: v5().replace('V5-APPROVAL', 'V4-APPROVAL') }],
    ['other policy bytes', `${p5} `, all()],
  ])('refuses %s', async (_name, policy, extra) => {
    expect(await chainAt(files(policy, extra), V5_AT + 1000)).toMatchObject({ state: 'refused' });
  });
});

describe('strict act reads', () => {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  const POLICY_V1 = `${DECISIONS_DIR}/${POLICY_ACT_FILE}`;
  const POLICY_V2 = `${DECISIONS_DIR}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V2-ACT.md`;
  const p1 = JSON.stringify({ policyVersion: '1.2.0-public-source-candidate.1', publicSourceScope: { rules: [] } }, null, 1) + '\n';
  const p2 = JSON.stringify({ policyVersion: '1.2.0-public-source-candidate.2', publicSourceScope: { rules: ['more'] } }, null, 1) + '\n';
  const v1 = (text = p1, date = '2026-10-03'): string => renderPolicyAct(sha(text), date, `${date}T09:30:00Z`, 1);
  const v2 = (text = p2, date = '2026-10-04', superseded = sha(p1)): string => renderPolicyAct(sha(text), date, `${date}T09:30:00Z`, 2, superseded);
  const chain = (policy: string, extra: Record<string, string>, now = AT) => readPolicyActChain({ root: '/r', fs: memoryFs(seen({ ...world(), [POLICY_PATH]: policy, ...extra })), now });

  it('policy chain: version 2 over version 1 over the on-disk policy is ok and returns the parsed fields', async () => {
    const got = await chain(p2, { [POLICY_V1]: v1(), [POLICY_V2]: v2() });
    expect(got).toMatchObject({ state: 'ok', policyDigest: sha(p2), final: { identity: 'PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V2-APPROVAL-2026-10-04', type: 'approve-policy', artifact: POLICY_PATH, project: 'project:syzygy', digest: sha(p2), recordedAt: AT }, v1: { digest: sha(p1) } });
    if (got.state === 'ok') expect(got.final.supersession).toContain(`\`${sha(p1)}\``);
    expect(await chain(p1, { [POLICY_V1]: v1() })).toMatchObject({ state: 'ok', v2: null, final: { digest: sha(p1) } });
  });
  it('policy chain: absent without acts; refused for a missing version 1, equal or earlier instants, equal arguments, a supersession that does not name version 1, or other policy bytes', async () => {
    expect(await chain(p1, {})).toMatchObject({ state: 'absent' });
    const cases: Array<[string, string, Record<string, string>]> = [
      ['version 2 without version 1', p2, { [POLICY_V2]: v2() }],
      ['version 2 not later than version 1', p2, { [POLICY_V1]: v1(p1, '2026-10-04'), [POLICY_V2]: v2() }],
      ['version 2 earlier than version 1', p2, { [POLICY_V1]: v1(p1, '2026-10-05'), [POLICY_V2]: v2() }],
      ['equal arguments', p1, { [POLICY_V1]: v1(), [POLICY_V2]: v2(p1) }],
      ['supersession names another argument', p2, { [POLICY_V1]: v1(), [POLICY_V2]: v2(p2, '2026-10-04', 'a'.repeat(64)) }],
      ['supersession names another record path', p2, { [POLICY_V1]: v1(), [POLICY_V2]: v2().replace('PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-ACT.md', 'OTHER.md') }],
      ['policy bytes differ from the final act', p2 + ' ', { [POLICY_V1]: v1(), [POLICY_V2]: v2() }],
      ['an unlisted record naming the policy', p1, { [POLICY_V1]: v1(), [`${DECISIONS_DIR}/sub/W.md`]: `Artifact identity: \`${POLICY_PATH}\`\n` }],
    ];
    for (const [name, policy, extra] of cases) expect(await chain(policy, extra), name).toMatchObject({ state: 'refused' });
  });
  it('policy reads count a head field only in prose: an HTML comment or fence hides nothing and adds nothing', async () => {
    for (const hidden of ['<!--\nAct type: `approve-policy`\n-->', '```\nRecorded at (UTC): 2026-10-03T00:00:01Z\n```', '```\nSupersession / revocation: forged\n```', 'Supersession / revocation: forged'])
      expect(await chain(p1, { [POLICY_V1]: `${v1()}\n${hidden}\n` }), hidden).toMatchObject({ state: 'refused' });
    // a comment that merely mentions a field on one line is not a field
    expect(await chain(p1, { [POLICY_V1]: `${v1()}\n<!-- Exact digest (SHA-256): \`${'a'.repeat(64)}\` -->\n` })).toMatchObject({ state: 'ok' });
    // a field that exists only inside a multi-line comment is absent from the prose
    expect(await chain(p1, { [POLICY_V1]: v1().replace(/^(Act type: `[^`]+`)$/m, '<!--\n$1\n-->') })).toMatchObject({ state: 'refused' });
    // a comment around the real line removes it: the field is then absent
    expect(await chain(p1, { [POLICY_V1]: v1().replace(/^(Act type: `[^`]+`)$/m, '<!-- $1 -->') })).toMatchObject({ state: 'refused' });
  });

  const MODULE = '.syzygy/governance/contracts/rfcs/RFC-0005/consent-egress-secrets.md';
  const moduleText = (): string => readFileSync(path.join(repoRoot, MODULE), 'utf8');
  const CLASS = `${DECISIONS_DIR}/RFC5-PROJECT-DOCUMENTATION-CLASS-AMENDMENT-ACT.md`;
  const classRead = (extra: Record<string, string>, now = AT) => readClassActState({ root: '/r', fs: memoryFs({ [MODULE]: moduleText(), [`${DECISIONS_DIR}/README.md`]: '# decisions\n', ...extra }), now });
  it('class act: ok with the installed module\'s digest; absent without a record; refused for a mismatch, a bad form, or a file elsewhere naming it', async () => {
    const act = renderClassAct(sha(moduleText()), '2026-10-03', '2026-10-03T09:30:00Z');
    expect(await classRead({ [CLASS]: act })).toMatchObject({ state: 'ok', moduleDigest: sha(moduleText()), act: { identity: 'RFC5-PROJECT-DOCUMENTATION-AMEND-2026-10-03', type: 'contract-amendment', artifact: MODULE, digest: sha(moduleText()), recordedAt: Date.UTC(2026, 9, 3, 9, 30, 0) } });
    expect(await classRead({})).toMatchObject({ state: 'absent' });
    expect(await classRead({ [CLASS]: renderClassAct('a'.repeat(64), '2026-10-03', '2026-10-03T09:30:00Z') })).toMatchObject({ state: 'refused' });
    expect(await classRead({ [CLASS]: act.replace('Act type: `contract-amendment`', 'Act type: `adopt-doctrine`') })).toMatchObject({ state: 'refused' });
    expect(await classRead({ [CLASS]: `${act}\n<!--\nAct instant: 2026-10-03T00:00:01Z\n-->\n` })).toMatchObject({ state: 'refused' });
    expect(await classRead({ [CLASS]: act, [`${DECISIONS_DIR}/archive/RFC5-CLASS-WITHDRAWN.md`]: 'Revokes RFC5-PROJECT-DOCUMENTATION-AMEND-2026-10-03.' })).toMatchObject({ state: 'refused' });
    expect(await classRead({ [CLASS]: act, [`${DECISIONS_DIR}/sub/x.md`]: `Artifact identity: \`${MODULE}\`\n` })).toMatchObject({ state: 'refused' });
  });

  it('egress: returns the in-force record\'s listed content classes, absent before any act and refused when the read is', async () => {
    const v2Text = readFileSync(path.join(repoRoot, EGRESS_V2_INSTANCE), 'utf8');
    const files = world({
      [`${DECISIONS_DIR}/PUBLIC-REPO-ADMISSION-EGRESS-ANTHROPIC-ACT.md`]: actText('consent-egress', EGRESS_PATH, egressText(), '2026-10-03'), [EGRESS_V2_INSTANCE]: v2Text,
      [`${DECISIONS_DIR}/PUBLIC-EGRESS-V2-ANTHROPIC-ACT.md`]: actText('consent-egress', EGRESS_V2_INSTANCE, v2Text), [MODULE]: moduleText(),
      [CLASS]: renderClassAct(sha(moduleText()), '2026-10-03', '2026-10-03T09:30:00Z'),
    });
    const at = (now: number, f = files) => readInForceEgress({ root: '/r', fs: memoryFs(f), now });
    const later = await at(AT);
    expect(later).toMatchObject({ state: 'ok', version: '0.2.0-candidate.1', digest: sha(v2Text), admittedRepositories: ['psf-requests', 'redis-redis'] });
    if (later.state === 'ok') expect(later.contentClasses).toContain('project-documentation');
    const before = await at(AT - 1);
    expect(before).toMatchObject({ state: 'ok', version: '0.1.0-candidate.7' });
    if (before.state === 'ok') expect(before.contentClasses).not.toContain('project-documentation');
    expect(await at(Date.UTC(2026, 9, 1))).toMatchObject({ state: 'absent' });
    expect(await at(AT, { ...files, [`${DECISIONS_DIR}/PUBLIC-REPO-ADMISSION-X-WITHDRAWAL.md`]: 'x' })).toMatchObject({ state: 'refused' });
  });
});

describe('round-3 review notes', () => {
  const OBS_ACT = `${DECISIONS_DIR}/PUBLIC-REPO-ADMISSION-REDIS-OBSERVATION-ACT.md`;
  const EG_ACT = `${DECISIONS_DIR}/PUBLIC-REPO-ADMISSION-EGRESS-ANTHROPIC-ACT.md`;
  const DIGEST_LINE = /^(Exact digest \(SHA-256\): `[0-9a-f]{64}`)$/m;
  const egWith = (t: string) => world({ [EGRESS_PATH]: t, [EG_ACT]: actText('consent-egress', EGRESS_PATH, t) });
  const obsWith = (t: string) => world({ [REDIS_PATH]: t, [OBS_ACT]: actText('consent-observation', REDIS_PATH, t) });

  it('closes a fence as CommonMark does: a field a renderer shows inside a code block is not in the prose (N-1)', async () => {
    const act = actText('consent-observation', REDIS_PATH, obsText());
    for (const wrap of ['````text\n```\n$1\n````', '```text\n```js\n$1\n```', '~~~~\n~~~\n$1\n~~~~', '```\n~~~\n$1\n```', '```\n``` not a closer\n$1\n```'])
      await expect(reader(world({ [OBS_ACT]: act.replace(DIGEST_LINE, wrap) })).read(), wrap).rejects.toBeInstanceOf(AdmissionRecordError);
    // a backtick run carrying a backtick in its info string opens no fence, and a longer closer closes a shorter opener
    expect(await reader(world({ [OBS_ACT]: act.replace(DIGEST_LINE, '``` `x` ```\n$1') })).read()).toHaveLength(2);
    expect(await reader(world({ [OBS_ACT]: `${act}\n\`\`\`\nnote\n\`\`\`\`\`\n` })).read()).toHaveLength(2);
  });
  it('folds soft hyphens, zero-width spaces, underscores and spaces before matching a withdrawal stem (N-2)', async () => {
    for (const line of ['Withdrawn: PUBLIC­OBS-REDIS-2026-10-03', 'Withdrawn: PUBLIC​-OBS-REDIS-2026-10-03', 'Withdrawn: PUBLIC_OBS_REDIS_2026_10_03', 'Withdrawn: PUBLIC OBS REDIS 2026-10-03', 'Withdrawn: PUB\u00ADLIC-OBS-REDIS-2026-10-03', 'Withdrawn: PUBLIC- OBS-REDIS-2026-10-03'])
      await expect(reader(world({ [`${DECISIONS_DIR}/w.md`]: `${line}\n` })).read(), line).rejects.toBeInstanceOf(AdmissionRecordError);
    const p1 = JSON.stringify({ policyVersion: '1', publicSourceScope: { rules: [] } }) + '\n';
    const files = { ...world(), [POLICY_PATH]: p1, [`${DECISIONS_DIR}/${POLICY_ACT_FILE}`]: renderPolicyAct(sha(p1), '2026-10-03', '2026-10-03T09:30:00Z', 1) };
    expect(await createPackagePolicyReader({ root: '/r', fs: memoryFs(files) }).read()).toHaveLength(1);
    for (const line of ['I retract the public source scope approval.', 'Withdrawn: PWB_SECRET_CLASSIFICATION_POLICY public­source­scope'])
      await expect(createPackagePolicyReader({ root: '/r', fs: memoryFs({ ...files, [`${DECISIONS_DIR}/OWNER-DIRECTION-X.md`]: `${line}\n` }) }).read(), line).rejects.toBeInstanceOf(AdmissionRecordError);
  });
  it('takes Scope repositories from the one list before the next heading of any level, and refuses a second list (N-3)', async () => {
    const admitted = async (t: string) => (await reader(egWith(t)).read()).find(r => r.class === 'egress')!.admittedRepositories;
    expect(await admitted(egressText().replace('repository:redis-redis)`', 'repository:redis-redis)`\n\n### Not admitted\n\n- `(project:syzygy, repository:elsewhere)`'))).toEqual(['psf-requests', 'redis-redis']);
    await expect(reader(egWith(`${egressText()}<details><summary>Examples (not admitted)</summary>\n\n- \`(project:syzygy, repository:example)\`\n\n</details>\n`)).read()).rejects.toBeInstanceOf(AdmissionRecordError);
    await expect(reader(egWith(`${egressText()}\nNot admitted:\n\n- \`(project:syzygy, repository:outside)\`\n`)).read()).rejects.toBeInstanceOf(AdmissionRecordError);
    // a bullet after a blank line continues the same (loose) list in CommonMark, so a renderer shows it in Scope: it is admitted
    expect(await admitted(`${egressText()}\n- \`(project:syzygy, repository:after-blank)\`\n`)).toEqual(['psf-requests', 'redis-redis', 'after-blank']);
    await expect(reader(egWith(egressText().replace(/## Scope\n\n[\s\S]*$/, '## Scope\n\nNone.\n'))).read()).rejects.toBeInstanceOf(AdmissionRecordError);
  });
  it('reads the real egress instances\' Scope lists, whose items wrap and nest class bullets around the repository bullets', async () => {
    const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
    const real = readFileSync(path.join(repoRoot, EGRESS_PATH), 'utf8');
    expect((await reader(egWith(real)).read()).find(r => r.class === 'egress')!.admittedRepositories).toEqual(['psf-requests', 'redis-redis']);
  });
  it('takes a time: a strict read of an act recorded after now is absent (N-4)', async () => {
    const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
    const MODULE = '.syzygy/governance/contracts/rfcs/RFC-0005/consent-egress-secrets.md';
    const moduleText = readFileSync(path.join(repoRoot, MODULE), 'utf8');
    const f = { [MODULE]: moduleText, [`${DECISIONS_DIR}/RFC5-PROJECT-DOCUMENTATION-CLASS-AMENDMENT-ACT.md`]: renderClassAct(sha(moduleText), '2027-01-01', '2027-01-01T09:30:00Z') };
    expect(await readClassActState({ root: '/r', fs: memoryFs(f), now: AT })).toMatchObject({ state: 'absent', why: expect.stringContaining('not in force yet') });
    expect(await readClassActState({ root: '/r', fs: memoryFs(f), now: Date.UTC(2027, 0, 1, 9, 30, 0) })).toMatchObject({ state: 'ok' });
    const p1 = JSON.stringify({ publicSourceScope: {} }) + '\n';
    const g = seen({ ...world(), [POLICY_PATH]: p1, [`${DECISIONS_DIR}/${POLICY_ACT_FILE}`]: renderPolicyAct(sha(p1), '2027-01-01', '2027-01-01T09:30:00Z', 1) });
    expect(await readPolicyActChain({ root: '/r', fs: memoryFs(g), now: AT })).toMatchObject({ state: 'absent', why: expect.stringContaining('in force yet') });
  });
  it('refuses labels that differ only in case, in one table and across records (N-5)', async () => {
    await expect(reader(obsWith(obsText({ rows: `| \`v8.10.2\` | \`${REDIS_REV}\` |\n| \`V8.10.2\` | \`${OTHER_REV}\` |` }))).read()).rejects.toBeInstanceOf(AdmissionRecordError);
    const records = [['v1', REDIS_REV], ['V1', OTHER_REV]].map(([label, id], i) => ({ recordId: `R${i}`, version: '1', class: 'observation' as const, project: 'project:syzygy', repositoryId: 'redis-redis', providerId: null, upstream: null, digest: '1'.repeat(64), inForceAt: 1, withdrawnAt: null, supersedes: null, supersessionAt: null, admittedRevisions: [id!], revisionLabels: [label!], admittedRepositories: [], contentClasses: [] }));
    expect(await createAdmissionRecordsPort({ reader: { read: async () => records }, now: () => 5 }).consentedRevisionsFor('redis-redis')).toEqual([]);
  });
});

describe('every stem counts wherever it sits, save exact tooling citations in an allowlisted file (R-361-1)', () => {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  const v2Text = readFileSync(path.join(repoRoot, EGRESS_V2_INSTANCE), 'utf8');
  const MODULE = '.syzygy/governance/contracts/rfcs/RFC-0005/consent-egress-secrets.md';
  const moduleText = readFileSync(path.join(repoRoot, MODULE), 'utf8');
  const p1 = JSON.stringify({ policyVersion: '1', publicSourceScope: { rules: [] } }) + '\n';
  const PKG = '.syzygy/governance/contracts/candidates';
  /** Version 1 and 2 egress, the class act, the policy under its version 1 act, three scripts and two package files: every sweep runs
   * on every read, and the citations that exist are these. */
  const full = (extra: Record<string, string>): Record<string, string> => world({
    [`${DECISIONS_DIR}/PUBLIC-REPO-ADMISSION-EGRESS-ANTHROPIC-ACT.md`]: actText('consent-egress', EGRESS_PATH, egressText(), '2026-10-03'),
    [EGRESS_V2_INSTANCE]: v2Text, [`${DECISIONS_DIR}/PUBLIC-EGRESS-V2-ANTHROPIC-ACT.md`]: actText('consent-egress', EGRESS_V2_INSTANCE, v2Text),
    [MODULE]: moduleText, [`${DECISIONS_DIR}/RFC5-PROJECT-DOCUMENTATION-CLASS-AMENDMENT-ACT.md`]: renderClassAct(sha(moduleText), '2026-10-03', '2026-10-03T09:30:00Z'),
    [POLICY_PATH]: p1, [`${DECISIONS_DIR}/${POLICY_ACT_FILE}`]: renderPolicyAct(sha(p1), '2026-10-03', '2026-10-03T09:30:00Z', 1),
    'scripts/build_public_egress_v2.py': '', 'scripts/record_rfc5_project_documentation_act.py': '', 'scripts/record_public_repo_admission_acts.py': '',
    [`${PKG}/public-egress-v2/REVIEW-BRIEF.md`]: '', [`${PKG}/public-repo-admission/templates/OBSERVATION-CONSENT-TEMPLATE.md`]: '',
    // existing files whose names carry a record id: never a citation
    'scripts/withdraw_public_obs_redis_2026_10_03.py': '', [`${PKG}/public-repo-admission/PUBLIC-OBS-REDIS-2026-10-03-WITHDRAWAL.md`]: '',
    // R-355-2: more tooling that exists, some of which is never a citation (a withdrawal word, another provider, an instances segment)
    'scripts/record_public_egress_v2_act.py': '', 'scripts/withdraw_public_egress_openai.py': '', 'scripts/build_public_egress_openai.py': '',
    [`${PKG}/public-repo-admission/WITHDRAWAL.md`]: '', [`${PKG}/public-repo-admission/templates/instances/x.md`]: '', [`${PKG}/public-egress-v2/PUBLIC-EGRESS-V2-MANIFEST.txt`]: '',
    [`${PKG}/public-repo-admission/PUBLIC-OBS-REDIS-2026-10-03-NOTES.md`]: '',
    ...extra,
  });
  const NOTE = `${DECISIONS_DIR}/OWNER-DIRECTION-SITTING-2026-10-06.md`;
  const allReads = async (files: Record<string, string>): Promise<string[]> => {
    const fs = memoryFs(files), out: string[] = [];
    try { await createPackageAdmissionReader({ root: '/r', fs }).read(); } catch { out.push('admission'); }
    try { await createPackagePolicyReader({ root: '/r', fs }).read(); } catch { out.push('policy'); }
    if ((await readClassActState({ root: '/r', fs, now: AT })).state === 'refused') out.push('class');
    if ((await readInForceEgress({ root: '/r', fs, now: AT })).state === 'refused') out.push('egress');
    return out;
  };
  const AE = ['admission', 'egress'], ACE = ['admission', 'class', 'egress'];

  const STILL_REFUSED: Array<[string, Record<string, string>, string[]]> = [
    ['A3 bare package directory', { [NOTE]: `I withdraw every consent under ${PKG}/public-repo-admission/ effective now.\n` }, AE],
    ['A4 bare package directory, short', { [NOTE]: 'The public-egress-v2/ consent is withdrawn.\n' }, AE],
    ['A5 instance file without instances/', { [NOTE]: 'Withdrawn: public-egress-v2/EGRESS-CONSENT-ANTHROPIC.md\n' }, AE],
    ['A id-named package file that does not exist', { [NOTE]: `Withdrawn: see \`${PKG}/public-repo-admission/WITHDRAWAL-PUBLIC-OBS-REDIS-2026-10-03.md\`.\n` }, AE],
    ['A2 id under the package directory', { [NOTE]: 'Withdrawn: public-repo-admission/PUBLIC-OBS-REDIS-2026-10-03\n' }, AE],
    ['F2 URL into the package', { [NOTE]: `Withdrawn: https://github.com/o/syzygy/blob/main/${PKG}/public-repo-admission/PUBLIC-OBS-REDIS-2026-10-03.md\n` }, AE],
    ['G2 link target carrying the id', { [NOTE]: `[the redis consent](${PKG}/public-repo-admission/PUBLIC-OBS-REDIS-2026-10-03.md) is withdrawn.\n` }, AE],
    ['B id as a directory before a script name', { [NOTE]: 'Withdrawn: PUBLIC-OBS-REDIS-2026-10-03/withdraw_note.py\n' }, AE],
    ['B2 instance path ending in a script name', { [NOTE]: `Withdrawn: ${INSTANCES_DIR}/redis/withdraw_consent.py\n` }, AE],
    ['H2 fullwidth slash', { [NOTE]: 'Withdrawn: public-repo-admission／PUBLIC-OBS-REDIS-2026-10-03\n' }, AE],
    ['J decisions file under a package-named directory', { [`${DECISIONS_DIR}/public-repo-admission/WITHDRAW-PUBLIC-OBS-REDIS.md`]: 'Withdrawn.\n' }, AE],
    ['K decisions file named as a script', { [`${DECISIONS_DIR}/withdraw_public_obs_redis.py`]: 'Withdrawn.\n' }, AE],
    ['L policy stem as a script name', { [NOTE]: 'Retracts: public_source_scope_approval.py\n' }, ['policy']],
    ['M class stem as a script name', { [NOTE]: 'Revokes rfc5_project_documentation_amend.py\n' }, ['admission', 'class', 'egress']],
    ['the disclosed round-4 residual', { [NOTE]: 'Withdrawn: public_obs_redis_2026_10_03.py\n' }, AE],
    ['a script name that does not exist in scripts/', { [NOTE]: 'Run scripts/build_public_egress_v3.py: PUBLIC-EGRESS-anthropic is withdrawn.\n' }, AE],
    ['an existing script under another directory', { [NOTE]: 'Run tools/build_public_egress_v2.py.\n' }, AE],
    ['an existing script in another case', { [NOTE]: 'Run scripts/BUILD_PUBLIC_EGRESS_V2.py.\n' }, AE],
    ['an existing script glued to an id', { [NOTE]: 'Withdrawn: PUBLIC-OBS-REDIS-2026-10-03-build_public_egress_v2.py\n' }, AE],
    ['a record id beside an existing script', { [NOTE]: 'Run scripts/build_public_egress_v2.py; PUBLIC-EGRESS-anthropic is withdrawn.\n' }, AE],
    ['an act record path', { [NOTE]: `Withdrawn: \`${DECISIONS_DIR}/PUBLIC-EGRESS-V2-ANTHROPIC-ACT.md\`.\n` }, AE],
    ['an egress v2 instance path', { [NOTE]: `Withdrawn: \`${EGRESS_V2_INSTANCE}\`.\n` }, AE],
    ['an observation instance path', { [NOTE]: `Withdrawn: \`${INSTANCES_DIR}/redis/OBSERVATION-CONSENT.md\`.\n` }, AE],
    ['the class act id beside its recorder', { [NOTE]: 'Revokes RFC5-PROJECT-DOCUMENTATION-AMEND-2026-10-03 (scripts/record_rfc5_project_documentation_act.py).\n' }, ['admission', 'class', 'egress']],
    ['a snake_case record id', { [NOTE]: 'Withdrawn: public_obs_redis_2026_10_03\n' }, AE],
    ['an existing script whose name carries a record id', { [NOTE]: 'Ran scripts/withdraw_public_obs_redis_2026_10_03.py.\n' }, AE],
    ['an existing package file whose name carries a record id', { [NOTE]: `See ${PKG}/public-repo-admission/PUBLIC-OBS-REDIS-2026-10-03-WITHDRAWAL.md.\n` }, AE],
    // R-355-2 N-1
    ['N-1 egress withdrawal citing its recorder', { [NOTE]: 'I withdraw the egress consent recorded by scripts/record_public_egress_v2_act.py, effective now.\n' }, AE],
    ['N-1 withdrawal citing the builder', { [NOTE]: 'The consent built by build_public_egress_v2.py is withdrawn.\n' }, AE],
    ['N-1 class revocation citing its recorder', { [NOTE]: 'Revoked: the amendment recorded by scripts/record_rfc5_project_documentation_act.py.\n' }, ['admission', 'class', 'egress']],
    ['N-1 admission withdrawal citing its recorder', { [NOTE]: 'Every consent recorded by record_public_repo_admission_acts.py is withdrawn.\n' }, AE],
    ['N-1 withdrawal citing a package file', { [NOTE]: 'Withdrawn per public-egress-v2/REVIEW-BRIEF.md.\n' }, AE],
    ['N-1 the intended-difference row of #355', { [NOTE]: 'Retracts the public source scope approval; see scripts/build_public_egress_v2.py.\n' }, ['admission', 'policy', 'egress']],
    // R-355-2 N-2
    ['N-2 a package WITHDRAWAL.md (citing it puts the word in the text)', { [NOTE]: 'See public-repo-admission/WITHDRAWAL.md.\n' }, AE],
    ['N-2 a nested instances file', { [NOTE]: `See ${PKG}/public-repo-admission/templates/instances/x.md.\n` }, AE],
    ['N-2 a script for another provider', { [NOTE]: 'Run scripts/build_public_egress_openai.py.\n' }, AE],
    ['N-2 a withdraw script for another provider', { [NOTE]: 'Ran scripts/withdraw_public_egress_openai.py.\n' }, AE],
    // R-355-2 N-3, and rows with no withdrawal word
    ['a bare package directory, no withdrawal word', { [NOTE]: 'Every consent under public-repo-admission/ ends today.\n' }, AE],
    ['an existing id-named package file, no withdrawal word', { [NOTE]: `See ${PKG}/public-repo-admission/PUBLIC-OBS-REDIS-2026-10-03-NOTES.md.\n` }, AE],
    ['N-3a bare package file name', { [NOTE]: 'See PUBLIC-EGRESS-V2-MANIFEST.txt.\n' }, AE],
    ['N-3b decisions file named as an existing script', { [`${DECISIONS_DIR}/build_public_egress_v2.py`]: 'x\n' }, AE],
    ['#355 citation: a script in a code span', { [NOTE]: 'Run `scripts/build_public_egress_v2.py --check` before the sitting.\n' }, AE],
    ['#355 citation: the class recorder', { [NOTE]: 'Then run python3 scripts/record_rfc5_project_documentation_act.py with the owner\'s phrase.\n' }, ACE],
    ['#355 citation: a bare script name', { [NOTE]: 'Record with record_public_repo_admission_acts.py.\n' }, AE],
    ['#355 citation: a package file path', { [NOTE]: `The brief is \`${PKG}/public-egress-v2/REVIEW-BRIEF.md\`.\n` }, AE],
    ['#355 citation: package path suffixes', { [NOTE]: 'See contracts/candidates/public-repo-admission/templates/OBSERVATION-CONSENT-TEMPLATE.md and public-egress-v2/REVIEW-BRIEF.md.\n' }, AE],
    ['#355 citation: a link target', { [NOTE]: '[the brief](.syzygy/governance/contracts/candidates/public-egress-v2/REVIEW-BRIEF.md)\n' }, AE],
    ['#361 unseen: a citation-only stem', { [NOTE]: 'The egress consent recorded by scripts/record_public_egress_v2_act.py ends today.\n' }, AE],
    ['#361 unseen: a citation as act identity', { [NOTE]: 'Act identity: scripts/build_public_egress_v2.py\n' }, AE],
    ['#361 unseen: a citation as artifact identity', { [NOTE]: 'Artifact identity: scripts/build_public_egress_v2.py\n' }, AE],
  ];

  // R-361-1's probe, all 148 rows: each withdrawal-word spelling and synonym before a citation of the egress recorder (E) and the class
  // recorder (C), then the file-name, sibling-file, fence, comment, manifest, script-version and instances rows. Expected: the reads
  // b60e6cd2 refused on each (R-361-1's probe-base.json, re-run against b60e6cd2 for this table).
  const E = (w: string): string => `${w}: the egress consent recorded by scripts/record_public_egress_v2_act.py.\n`;
  const C = (w: string): string => `${w}: the amendment recorded by scripts/record_rfc5_project_documentation_act.py.\n`;
  const WORDS: Array<[string, string]> = [
    ['withdraw', 'withdraw'], ['Withdrawn', 'Withdrawn'], ['WITHDRAWN', 'WITHDRAWN'], ['withdrawing', 'withdrawing'], ['withdrawal', 'withdrawal'],
    ['withdrew', 'withdrew'], ['withdrawl-typo', 'withdrawl'], ['revoked', 'revoked'], ['revocation', 'revocation'], ['revoking', 'revoking'], ['retracted', 'retracted'],
    ['retraction', 'retraction'], ['rescinded', 'rescinded'], ['rescission', 'rescission'], ['recission-typo', 'recission'], ['recinded-typo', 'recinded'],
    ['with-drawn', 'with-drawn'], ['with drawn', 'with drawn'], ['with-NL-drawn', 'with-\ndrawn'], ['with NL drawn', 'with\ndrawn'], ['with**drawn**', 'with**drawn**'],
    ['code span', '`withdrawn`'], ['heading', '# Withdrawn\n\nNote'], ['re-voked', 're-voked'], ['re U+2011 voked', 're\u2011voked'], ['soft hyphen', 'withdr\u00adawn'],
    ['ZWSP', 'withdr\u200bawn'], ['fullwidth', '\uff57\uff49\uff54\uff48\uff44\uff52\uff41\uff57\uff4e'], ['Cyrillic a', 'withdr\u0430wn'], ['Greek omicron', 'rev\u03bfked'],
    ['&shy; entity', 'with&shy;drawn'], ['&#119; entity', 'withdra&#119;n'], ['combining mark', 'withdra\u0301wn'], ['re-tract', 're-tract'], ['re-scind', 're-scind'],
    ['w/drawn', 'w/drawn'], ['W-I-T-H', 'W I T H D R A W N'],
    ['cancelled', 'Cancelled'], ['terminated', 'Terminated'], ['ends today', 'Ends today'], ['void', 'Void'], ['pulled', 'Pulled'], ['annulled', 'Annulled'],
    ['repealed', 'Repealed'], ['retired', 'Retired'], ['superseded', 'Superseded'], ['suspended', 'Suspended'], ['lapsed', 'Lapsed'], ['expired', 'Expired'],
    ['stopped', 'Stopped'], ['invalidated', 'Invalidated'], ['nullified', 'Nullified'], ['no longer consent', 'I no longer consent to'], ['no longer in force', 'No longer in force'],
    ['abandoned', 'Abandoned'], ['reversed', 'Reversed'], ['removed', 'Removed'], ['opted out', 'Opted out of'], ['disabled', 'Disabled'], ['halted', 'Halted'],
    ['do not use', 'Do not use'], ['end', 'End'], ['undone', 'Undone'], ['deauthorized', 'Deauthorized'], ['refused', 'Consent refused'],
  ];
  const D = DECISIONS_DIR, CITE = 'scripts/record_public_egress_v2_act.py';
  const PROBE: Array<[string, Record<string, string>, string[]]> = [
    ...WORDS.flatMap(([name, w]): Array<[string, Record<string, string>, string[]]> => [[`E ${name}`, { [NOTE]: E(w) }, AE], [`C ${name}`, { [NOTE]: C(w) }, ACE]]),
    ['control stem outside citation, synonym', { [NOTE]: 'Cancelled: the public egress v2 consent.\n' }, AE],
    ['name EGRESS-WITHDRAWAL.md', { [`${D}/EGRESS-WITHDRAWAL-2026-10-06.md`]: `The consent recorded by ${CITE} ends.\n` }, AE],
    ['name REVOCATION.md', { [`${D}/REVOCATION-2026-10-06.md`]: `The consent recorded by ${CITE}.\n` }, AE],
    ['split files word+cite', { [`${D}/A-WITHDRAWN.md`]: 'Withdrawn: see the note B.\n', [`${D}/B.md`]: `The consent recorded by ${CITE}.\n` }, AE],
    ['split files, word file no word in name', { [`${D}/A.md`]: 'Withdrawn: see note B.\n', [`${D}/B.md`]: `The consent recorded by ${CITE}.\n` }, AE],
    ['word in fence', { [NOTE]: `\`\`\`\nwithdraw\n\`\`\`\nThe consent recorded by ${CITE} ends.\n` }, AE],
    ['word in html comment', { [NOTE]: `<!-- withdrawn -->\nThe consent recorded by ${CITE} ends.\n` }, AE],
    ['benign: withdrawal process doc', { [NOTE]: 'A withdrawal would be recorded later. Run scripts/build_public_egress_v2.py --check.\n' }, AE],
    ['bare manifest name withdrawn', { [NOTE]: 'Withdrawn: PUBLIC-EGRESS-V2-MANIFEST.txt\n' }, AE],
    ['bare manifest name ends', { [NOTE]: 'Ends: PUBLIC-EGRESS-V2-MANIFEST.txt\n' }, AE],
    ['v2 manifest pkg-relative ends', { [NOTE]: 'Ends: public-egress-v2/PUBLIC-EGRESS-V2-MANIFEST.txt\n' }, AE],
    ['public_egress_v2x script', { 'scripts/build_public_egress_v2x.py': '', [NOTE]: 'Ends: scripts/build_public_egress_v2x.py\n' }, AE],
    ['public_egress_v20 script', { 'scripts/build_public_egress_v20.py': '', [NOTE]: 'Ends: scripts/build_public_egress_v20.py\n' }, AE],
    ['instances nested deep', { [`${PKG}/public-repo-admission/a/b/instances/c/x.md`]: '', [NOTE]: `Ends: ${PKG}/public-repo-admission/a/b/instances/c/x.md\n` }, AE],
    ['Instances capital segment', { [`${PKG}/public-repo-admission/Instances/x.md`]: '', [NOTE]: `Ends: ${PKG}/public-repo-admission/Instances/x.md\n` }, AE],
    ['instances.md file', { [`${PKG}/public-repo-admission/instances.md`]: '', [NOTE]: `Ends: ${PKG}/public-repo-admission/instances.md\n` }, AE],
    ['instance-x dir', { [`${PKG}/public-repo-admission/instance/x.md`]: '', [NOTE]: `Ends: ${PKG}/public-repo-admission/instance/x.md\n` }, AE],
  ];
  // syzygy-786c: the first `full` spawns Python five times to render the recorders' acts (about 3 s of a cold 4.5 s run, by CPU
  // profile), which landed inside this test's 5 s budget. Render them once here, under a budget of their own; the renders are cached.
  // One case per row then keeps each read (about 20 ms) far from the budget whatever the suite load.
  beforeAll(() => { full({}); }, 60_000); // five Python renders took about 3 s of a cold 4.5 s run (6c91e65a)
  it('with no file allowlisted, refuses nothing in the base world, and the table holds every row', async () => {
    expect(await allReads(full({}))).toEqual([]);
    expect(STILL_REFUSED.length + PROBE.length).toBe(50 + 147);   // R-361-1's control row is the line above
  });
  it.each([...STILL_REFUSED, ...PROBE])('with no file allowlisted, refuses the reads the pre-#355 reader refused: %s', async (name, extra, expected) => {
    expect(await allReads(full(extra)), name).toEqual(expected);
  });

  // The allowlist (mocked above, empty everywhere else in this file): an entry is a path under the decisions directory and the
  // sha256 of exact bytes.
  const allow = (rel: string, text: string): void => { ALLOWLIST.set(rel, { sha256: sha(text), reason: 'test' }); };
  afterEach(() => { ALLOWLIST.clear(); });
  const REL = 'OWNER-DIRECTION-SITTING-2026-10-06.md';
  const CITING = 'Run `scripts/build_public_egress_v2.py --check`, then record_public_repo_admission_acts.py; the brief is public-egress-v2/REVIEW-BRIEF.md.\n'
    + 'The class recorder is scripts/record_rfc5_project_documentation_act.py.\n';
  it('a file at its allowlisted path with its allowlisted bytes has its exact tooling citations set aside, and only those', async () => {
    expect(await allReads(full({ [NOTE]: CITING }))).toEqual(ACE);
    allow(REL, CITING);
    expect(await allReads(full({ [NOTE]: CITING }))).toEqual([]);
    for (const [line, expected] of [
      ['PUBLIC-EGRESS-anthropic is withdrawn.', AE], ['The public egress v2 consent ends.', AE], ['RFC5-PROJECT-DOCUMENTATION-AMEND-2026-10-03 is revoked.', ACE],
      ['Run scripts/BUILD_PUBLIC_EGRESS_V2.py.', AE], ['Run tools/build_public_egress_v2.py.', AE], ['Run scripts/build_public_egress_v3.py.', AE],
      ['Ran scripts/withdraw_public_obs_redis_2026_10_03.py.', AE], ['Run scripts/build_public_egress_openai.py.', AE],
      [`See ${PKG}/public-repo-admission/PUBLIC-OBS-REDIS-2026-10-03-NOTES.md.`, AE], ['See PUBLIC-EGRESS-V2-MANIFEST.txt.', AE],
      ['Every consent under public-repo-admission/ ends.', AE], [`See \`${EGRESS_V2_INSTANCE}\`.`, AE],
      [`See ${PKG}/public-repo-admission/templates/instances/x.md.`, AE], [`See ${PKG}/public-repo-admission/Instances/x.md.`, AE],
      [`See ${PKG}/public-repo-admission/instances.md.`, AE], [`See ${PKG}/public-repo-admission/instance/x.md.`, AE],
    ] as Array<[string, string[]]>) {
      const text = `${CITING}${line}\n`;
      ALLOWLIST.clear(); allow(REL, text);
      expect(await allReads(full({ [NOTE]: text, [`${PKG}/public-repo-admission/Instances/x.md`]: '', [`${PKG}/public-repo-admission/instances.md`]: '', [`${PKG}/public-repo-admission/instance/x.md`]: '' })), line).toEqual(expected);
    }
  });
  it('one changed byte gives the file the whole-text sweep', async () => {
    allow(REL, CITING);
    for (const text of [CITING.replace('Run', 'Ran'), CITING + ' ', CITING.slice(0, -1), '\ufeff' + CITING, CITING.replace('\n', '\r\n')]) {
      expect(text).not.toBe(CITING);
      expect(await allReads(full({ [NOTE]: text })), JSON.stringify(text.slice(0, 8))).toEqual(ACE);
    }
  });
  it('the same bytes at any other path are not allowlisted', async () => {
    allow(REL, CITING);
    for (const rel of ['OWNER-DIRECTION-SITTING-2026-10-07.md', 'owner-direction-sitting-2026-10-06.md', `sub/${REL}`, `${REL}.bak`]) {
      expect(await allReads(full({ [`${D}/${rel}`]: CITING })), rel).toEqual(ACE);
      expect(await allReads(full({ [NOTE]: CITING, [`${D}/${rel}`]: CITING })), `${rel} beside the allowlisted file`).toEqual(ACE);
    }
  });
  it('an allowlisted file named for a stem still refuses: the allowlist sets aside citations in the text, never the name', async () => {
    const rel = 'PUBLIC-EGRESS-V2-NOTES.md';
    allow(rel, CITING);
    expect(await allReads(full({ [`${D}/${rel}`]: CITING }))).toEqual(AE);
  });
});

// syzygy-bpyt.8.10, characterization: the field-parsed readers read a record's title and head field lines and nothing else, so a record
// the recorder rendered still counts with its Effect widened, its limits section removed, the owner's selection replaced or a section
// withdrawing the act appended to it. Only a recorder's `--check` line regenerates the whole record, and not every record has one in CI
// (docs/evidence/consent-gate-recognition-models-2026-10-21.md). These literals pin today's verdicts: changing one changes what counts
// as an act, which returns to the owner (GP-Q0).
describe('altered prose in a field-parsed act record (characterization, syzygy-bpyt.8.10)', () => {
  const MODULE = '.syzygy/governance/contracts/rfcs/RFC-0005/consent-egress-secrets.md';
  const POLICY = JSON.stringify({ policyVersion: '1.2.0-public-source-candidate.1', publicSourceScope: { rules: [] } }, null, 1) + '\n';
  const OBSERVATION = `${DECISIONS_DIR}/PUBLIC-REPO-ADMISSION-REDIS-OBSERVATION-ACT.md`;
  const CLASS = `${DECISIONS_DIR}/RFC5-PROJECT-DOCUMENTATION-CLASS-AMENDMENT-ACT.md`;
  const texts = { observation: '', policy: '', classAct: '', module: '' };
  beforeAll(() => {
    texts.observation = actText('consent-observation', REDIS_PATH, obsText());
    texts.policy = renderPolicyAct(sha(POLICY), '2026-10-03', '2026-10-03T09:30:00Z', 1);
    texts.module = readFileSync(fileURLToPath(new URL(`../../../${MODULE}`, import.meta.url)), 'utf8');
    texts.classAct = renderClassAct(sha(texts.module), '2026-10-03', '2026-10-03T09:30:00Z');
  });
  const FAMILIES: ReadonlyArray<readonly [string, () => string, (act: string) => Promise<string>, string]> = [
    ['the admission reader (parseAct)', () => texts.observation, async act => {
      try {
        return (await reader(world({ [OBSERVATION]: act })).read()).map(r => `${r.recordId}@${r.version} from ${new Date(r.inForceAt!).toISOString()}`).join('; ');
      } catch (error) { if (error instanceof AdmissionRecordError) return 'refused'; throw error; }
    }, 'PUBLIC-EGRESS-anthropic@0.1.0-candidate.7 from 2026-10-04T09:30:00.000Z; PUBLIC-OBS-REDIS-2026-10-03@0.1.0-candidate.7 from 2026-10-04T09:30:00.000Z'],
    ['the policy chain (parsePolicyAct)', () => texts.policy, async act => {
      const state = await readPolicyActChain({ root: '/r', fs: memoryFs({ ...world(), [POLICY_PATH]: POLICY, [`${DECISIONS_DIR}/${POLICY_ACT_FILE}`]: act }), now: AT });
      return state.state === 'ok' ? `ok ${state.final.identity}` : state.state;
    }, 'ok PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-APPROVAL-2026-10-03'],
    ['the class act (readClassAct)', () => texts.classAct, async act => {
      const state = await readClassActState({ root: '/r', fs: memoryFs({ [MODULE]: texts.module, [`${DECISIONS_DIR}/README.md`]: '# decisions\n', [CLASS]: act }), now: AT });
      return state.state === 'ok' ? `ok ${state.act.identity}` : state.state;
    }, 'ok RFC5-PROJECT-DOCUMENTATION-AMEND-2026-10-03'],
  ];
  it.each(FAMILIES)('%s counts the recorder\'s record, and still counts it with each prose alteration', async (_name, text, read, counts) => {
    expect(await read(text())).toBe(counts);
    for (const [name, alter] of PROSE_ALTERATIONS) {
      expect(alter(text()), `${name} applies`).not.toBe(text());
      expect(await read(alter(text())), name).toBe(counts);
    }
  });
  it.each(FAMILIES)('%s refuses the record with a head field altered (the control)', async (_name, text, read) => {
    expect(HEAD_FIELD_ALTERATION(text())).not.toBe(text());
    expect(await read(HEAD_FIELD_ALTERATION(text()))).toBe('refused');
  });
});

// Runs last: every policy world read above, at instants around each act. The port's answer and the strict chain must agree.
describe('the policy port and the strict policy chain agree', () => {
  const NOWS = [Date.UTC(2026, 9, 1), Date.UTC(2026, 9, 3, 9, 29, 59), Date.UTC(2026, 9, 3, 9, 30, 0), AT - 1, AT, AT + 1000, Date.UTC(2027, 0, 1, 9, 30, 0), Date.UTC(2027, 0, 2)];
  it('on every world in the fixture set, at every instant', async () => {
    expect(policyWorlds.length, 'run the whole file: the worlds are collected by the cases above').toBeGreaterThan(40);
    let satisfied = 0;
    for (const [i, files] of policyWorlds.entries()) for (const now of NOWS) {
      const answer = await createPackageAdmissionRecordsPort({ root: '/r', now: () => now, fs: memoryFs({ ...files }) }).check(requirement('public-source-policy'));
      const chain = await readPolicyActChain({ root: '/r', fs: memoryFs({ ...files }), now });
      const expected = chain.state === 'ok' ? { satisfied: true, record: chain.final.identity } : { satisfied: false };
      expect(answer, `world ${i} at ${new Date(now).toISOString()}: chain ${chain.state}${chain.state === 'ok' ? '' : ` (${chain.why})`}`).toMatchObject(expected);
      if (answer.satisfied) satisfied += 1;
    }
    expect(satisfied).toBeGreaterThan(10);   // the comparison is not vacuous
  }, 50_000); // sized from its worst measured run: docs/evidence/syzygy-bpyt-4-13/timeout-sizing.json
});
