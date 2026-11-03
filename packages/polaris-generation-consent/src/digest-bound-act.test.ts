import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadRecorderForms, HEAD_FIELD_ALTERATION, PROSE_ALTERATIONS, renderRecorderAct, renderRegistryAct } from './recorder-fixtures.testkit.js';
import {
  DECISIONS_DIR, INSTANCES_DIR, REGISTRY_GIT_SOURCE_ACT_FORM, createAdmissionRecordsPort, createPackageAdmissionReader, readDigestBoundActState,
  type DigestBoundActForm, type PackageReaderFs,
} from './package-reader.js';

// The recorder forms render once, before the file collects its tests: some tables render at collection (syzygy-bpyt.4.8).
await loadRecorderForms();

// The `Upstream:` field of an observation record, the records port's `repositoryIdsFor`, and the RFC3-16(a) cross-check of one
// digest-bound act (syzygy-qkea.4). Expected values are literals; act text comes from the real recorders.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const sha = (t: string): string => createHash('sha256').update(t, 'utf8').digest('hex');
const REDIS_REV = '498ecd0d6d007db11ddb3aea9428552598a78622';
const REDIS_PATH = `${INSTANCES_DIR}/redis/OBSERVATION-CONSENT.md`;
const REQUESTS_PATH = `${INSTANCES_DIR}/requests/OBSERVATION-CONSENT.md`;
const OWNER_ANSWERS_FILE = 'PUBLIC-REPO-ADMISSION-OWNER-ANSWERS-2026-10-03.md';
const ownerAnswers = (): string => readFileSync(path.join(ROOT, DECISIONS_DIR, OWNER_ANSWERS_FILE), 'utf8');
const AT = Date.UTC(2026, 9, 4, 9, 30, 0);

const obsText = (upstream: string | null, repository = 'redis-redis', extra = '', recordId = 'PUBLIC-OBS-REDIS-2026-10-03'): string => `# observation consent (public repository)

Record ID: \`${recordId}\`

Record version: \`0.1.0-candidate.7\`

Subject: \`(project:syzygy, repository:${repository})\`
${upstream === null ? '' : `\n${upstream}\n`}${extra}
| Label | Commit object id |
|---|---|
| \`8.10.2\` | \`${REDIS_REV}\` |

Proposed revocation state: active; supersedes no earlier consent
`;
const obsAct = (key: 'redis-observation' | 'requests-observation', text: string, date = '2026-10-04'): string =>
  renderRecorderAct(key, '0'.repeat(64), date, `${date}T09:30:00Z`).replace('0'.repeat(64), sha(text));

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
const obsWorld = (redis: string, over: Record<string, string> = {}): Record<string, string> => ({
  [REDIS_PATH]: redis,
  [`${DECISIONS_DIR}/PUBLIC-REPO-ADMISSION-REDIS-OBSERVATION-ACT.md`]: obsAct('redis-observation', redis),
  [`${DECISIONS_DIR}/${OWNER_ANSWERS_FILE}`]: ownerAnswers(),
  ...over,
});
const readObs = async (files: Record<string, string>) => (await createPackageAdmissionReader({ root: '/r', fs: memoryFs(files) }).read()).find(r => r.class === 'observation');
const UPSTREAM = 'Upstream: https://github.com/redis/redis (public; configuration, not repository identity)';

describe('observation record Upstream field', () => {
  it('is read from the one Upstream line, without its parenthesis', async () => {
    expect((await readObs(obsWorld(obsText(UPSTREAM))))?.upstream).toBe('https://github.com/redis/redis');
  });
  it('is null when the record states none', async () => {
    expect((await readObs(obsWorld(obsText(null))))?.upstream).toBeNull();
  });
  it.each([
    ['repeated', obsText(UPSTREAM, 'redis-redis', `\n${UPSTREAM}\n`)],
    ['only inside a fence', obsText(null, 'redis-redis', `\n\`\`\`text\n${UPSTREAM}\n\`\`\`\n`)],
    ['not an https URL', obsText('Upstream: http://github.com/redis/redis (public)')],
    ['a URL with a space', obsText('Upstream: https://github.com/redis/re dis')],
  ])('refuses the read when it is %s', async (_name, text) => {
    await expect(createPackageAdmissionReader({ root: '/r', fs: memoryFs(obsWorld(text)) }).read()).rejects.toThrow('invalid-records');
  });
  it('is the real redis instance\'s URL', async () => {
    const real = readFileSync(path.join(ROOT, REDIS_PATH), 'utf8');
    expect((await readObs(obsWorld(real)))?.upstream).toBe('https://github.com/redis/redis');
  });
});

describe('records port: repositoryIdsFor', () => {
  const port = (files: Record<string, string>, now = AT) => createAdmissionRecordsPort({ reader: createPackageAdmissionReader({ root: '/r', fs: memoryFs(files) }), now: () => now });
  it('names the in-force record whose Upstream is exactly the URL', async () => {
    expect(await port(obsWorld(obsText(UPSTREAM))).repositoryIdsFor('https://github.com/redis/redis')).toEqual(['redis-redis']);
  });
  it.each([
    ['another URL', 'https://github.com/redis/redis-py'],
    ['a trailing slash', 'https://github.com/redis/redis/'],
    ['another case', 'https://github.com/Redis/redis'],
  ])('names none for %s', async (_name, url) => {
    expect(await port(obsWorld(obsText(UPSTREAM))).repositoryIdsFor(url)).toEqual([]);
  });
  it('names none before the act is in force', async () => {
    expect(await port(obsWorld(obsText(UPSTREAM)), AT - 1).repositoryIdsFor('https://github.com/redis/redis')).toEqual([]);
  });
  it('names none when the record states no Upstream', async () => {
    expect(await port(obsWorld(obsText(null))).repositoryIdsFor('https://github.com/redis/redis')).toEqual([]);
  });
  it('names every record that claims the URL, so a caller can refuse on several', async () => {
    const requests = obsText(UPSTREAM, 'psf-requests', '', 'PUBLIC-OBS-REQUESTS-2026-10-03');
    const files = obsWorld(obsText(UPSTREAM), { [REQUESTS_PATH]: requests, [`${DECISIONS_DIR}/PUBLIC-REPO-ADMISSION-REQUESTS-OBSERVATION-ACT.md`]: obsAct('requests-observation', requests) });
    expect(await port(files).repositoryIdsFor('https://github.com/redis/redis')).toEqual(['psf-requests', 'redis-redis']);
  });
});

// Why no consent is in force for a URL (R-POLARIS-DOSSIER-S3-GATES-1 note 4): reporting only, never a grant.
describe('records port: consentAbsenceFor', () => {
  const URL_ = 'https://github.com/redis/redis';
  const why = (files: Record<string, string>, now = AT) =>
    createAdmissionRecordsPort({ reader: createPackageAdmissionReader({ root: '/r', fs: memoryFs(files) }), now: () => now }).consentAbsenceFor!(URL_);
  it('says when no record names the URL as its Upstream', async () => {
    expect(await why(obsWorld(obsText(null)))).toBe('no observation record names https://github.com/redis/redis as its Upstream');
  });
  it('says when the record is not in force yet', async () => {
    expect(await why(obsWorld(obsText(UPSTREAM)), AT - 1)).toBe('the observation record(s) naming https://github.com/redis/redis are not in force: PUBLIC-OBS-REDIS-2026-10-03@0.1.0-candidate.7 is not in force yet');
  });
  it('says when the record\'s bytes are not the act\'s argument', async () => {
    const files = obsWorld(obsText(UPSTREAM));
    files[REDIS_PATH] = obsText(UPSTREAM, 'redis-redis', '\n<!-- edited -->\n');
    expect(await why(files)).toBe('the observation record(s) naming https://github.com/redis/redis are not in force: PUBLIC-OBS-REDIS-2026-10-03@0.1.0-candidate.7 has no owner act in force over its current bytes');
  });
  it('says when the records cannot be read at all', async () => {
    expect(await why(obsWorld(obsText(UPSTREAM, 'redis-redis', `\n${UPSTREAM}\n`)))).toBe('the admission act records could not be read (invalid-records), so no consent can be established');
  });
  it('names a record in force as such, never as absent', async () => {
    expect(await why(obsWorld(obsText(UPSTREAM)))).toBe('the observation record(s) naming https://github.com/redis/redis: PUBLIC-OBS-REDIS-2026-10-03@0.1.0-candidate.7 is in force');
  });
});

describe('digest-bound act cross-check (RFC3-16(a))', () => {
  const ENTRY = '{"entries":[{"observerId":"x"}]}\n';
  const ACT_FILE = `${DECISIONS_DIR}/PUBLIC-ADMISSION-REGISTRY-GIT-SOURCE-ACT.md`;
  const act = (digest = sha(ENTRY), date = '2026-10-07'): string => renderRegistryAct(digest, date, `${date}T09:30:00Z`);
  const NOW = Date.UTC(2026, 9, 7, 12, 0, 0);
  const read = (files: Record<string, string>, now = NOW, form: DigestBoundActForm = REGISTRY_GIT_SOURCE_ACT_FORM) =>
    readDigestBoundActState({ root: '/r', fs: memoryFs(files), now, form });
  // An unrelated decisions file keeps the directory present when a case removes the act.
  const world = (over: Record<string, string> = {}): Record<string, string> => ({ [REGISTRY_GIT_SOURCE_ACT_FORM.artifact]: ENTRY, [ACT_FILE]: act(), [`${DECISIONS_DIR}/UNRELATED.md`]: '# Unrelated\n', ...over });

  it('is ok when the recorder\'s record binds the artifact\'s current bytes and is in force', async () => {
    const state = await read(world());
    expect(state.state).toBe('ok');
    if (state.state === 'ok') expect([state.act.identity, state.artifactDigest, state.act.recordedAt]).toEqual(['PUBLIC-ADMISSION-REGISTRY-GIT-SOURCE-2026-10-07', sha(ENTRY), Date.UTC(2026, 9, 7, 9, 30, 0)]);
  });
  it('is absent when no record exists, whatever the artifact says', async () => {
    const files = world({ [REGISTRY_GIT_SOURCE_ACT_FORM.artifact]: '{"status":"in force","accepted":true}\n' });
    delete files[ACT_FILE];
    expect(await read(files)).toEqual({ state: 'absent', why: `no owner-act record ${ACT_FILE} exists` });
  });
  it('is absent before the act\'s instant', async () => {
    expect((await read(world(), Date.UTC(2026, 9, 7, 9, 29, 59))).state).toBe('absent');
  });
  it('is refused when the artifact\'s bytes differ from the argument', async () => {
    expect(await read(world({ [REGISTRY_GIT_SOURCE_ACT_FORM.artifact]: `${ENTRY} ` }))).toEqual({ state: 'refused', why: `the bytes of ${REGISTRY_GIT_SOURCE_ACT_FORM.artifact} differ from the act's argument` });
  });
  it('is refused when the artifact cannot be read', async () => {
    const files = world();
    delete files[REGISTRY_GIT_SOURCE_ACT_FORM.artifact];
    expect((await read(files)).state).toBe('refused');
  });
  it.each([
    ['another title', (t: string) => t.replace('# Owner act — public Git-hosting', '# Owner act — Git-hosting')],
    ['another act type', (t: string) => t.replace('`adopt-registry-entry`', '`approve-policy`')],
    ['another identity', (t: string) => t.replace('PUBLIC-ADMISSION-REGISTRY-GIT-SOURCE-2026-10-07', 'PUBLIC-ADMISSION-REGISTRY-GIT-SOURCE-2026-10-08')],
    ['another artifact', (t: string) => t.replace('POLARIS-PUBLIC-GIT-SOURCE-ACQUISITION-CANDIDATE.json', 'OTHER.json')],
    ['no recording instant', (t: string) => t.replace(/^Recorded at \(UTC\): .*\n/m, '')],
    ['an instant on another day', (t: string) => t.replace('Recorded at (UTC): 2026-10-07T09:30:00Z', 'Recorded at (UTC): 2026-10-06T09:30:00Z')],
    ['its digest only inside a fence', (t: string) => t.replace(/^(Exact digest \(SHA-256\): `[0-9a-f]{64}`)$/m, '```\n$1\n```')],
    // The recorder's RFC3-16(b) lines, read for a form with no template (R-POLARIS-DOSSIER-GATE-SOURCES-1 note 4).
    ['no owner line', (t: string) => t.replace(/^Owner: Tzeusy\n/m, '')],
    ['another owner', (t: string) => t.replace(/^Owner: Tzeusy$/m, 'Owner: an agent')],
    ['no provenance state', (t: string) => t.replace(/^Provenance state: .*\n/m, '')],
    ['no A1 line', (t: string) => t.replace(/^A1 audit-record identity .*\n/m, '')],
  ])('is refused for %s', async (_name, mutate) => {
    const mutated = mutate(act());
    expect(mutated).not.toBe(act());
    expect((await read(world({ [ACT_FILE]: mutated }))).state).toBe('refused');
  });
  // syzygy-bpyt.8.10, characterization: a form with no template reads the head fields and the recorder's RFC3-16(b) lines only, so the
  // recorder's record still counts with its prose altered. The literal pins today's verdict; changing it is an owner decision (GP-Q0).
  it.each(PROSE_ALTERATIONS)('still counts the recorder\'s record with %s (characterization, syzygy-bpyt.8.10)', async (_name, alter) => {
    expect(alter(act())).not.toBe(act());
    expect(await read(world({ [ACT_FILE]: alter(act()) }))).toMatchObject({ state: 'ok', act: { identity: 'PUBLIC-ADMISSION-REGISTRY-GIT-SOURCE-2026-10-07' } });
  });
  it('refuses the recorder\'s record with a head field altered (the control, syzygy-bpyt.8.10)', async () => {
    expect((await read(world({ [ACT_FILE]: HEAD_FIELD_ALTERATION(act()) }))).state).toBe('refused');
  });
  it.each([
    ['a file named for the act', 'PUBLIC-ADMISSION-REGISTRY-GIT-SOURCE-WITHDRAWAL.md', 'The owner withdraws it.\n'],
    ['a file citing the artifact path', 'NOTE.md', `See \`${REGISTRY_GIT_SOURCE_ACT_FORM.artifact}\`.\n`],
    ['a file naming the stem in another spelling', 'NOTE.md', 'public_admission_registry git source is withdrawn\n'],
  ])('is refused when another decisions file names it: %s', async (_name, file, text) => {
    expect((await read(world({ [`${DECISIONS_DIR}/${file}`]: text }))).state).toBe('refused');
  });
  it('lets the aggregate acceptance record name it in prose', async () => {
    expect((await read(world({ [`${DECISIONS_DIR}/ACCEPTANCE-ACT-RECORD.md`]: `## PUBLIC-ADMISSION-REGISTRY-GIT-SOURCE act\n\nRecorded; see ${REGISTRY_GIT_SOURCE_ACT_FORM.artifact}.\n` }))).state).toBe('ok');
  });
  it('is absent on this checkout: no registry-entry act is recorded', async () => {
    const state = await readDigestBoundActState({ root: ROOT, now: Date.now(), form: REGISTRY_GIT_SOURCE_ACT_FORM });
    expect(state).toEqual({ state: 'absent', why: `no owner-act record ${ACT_FILE} exists` });
  });
});
