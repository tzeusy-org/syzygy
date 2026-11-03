import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AdmissionRecordError } from './admission-record.js';
import { renderClassAct, renderPolicyAct, renderRecorderAct, renderRegistryAct } from './recorder-fixtures.testkit.js';
import { REGISTRY_GIT_SOURCE_ACT_FORM, createPackageAdmissionReader, readClassActState, readDigestBoundActState, readPolicyActChain, type PackageReaderFs } from './package-reader.js';

// What each act family's reader accepts and refuses, family by family, over one world where all four read ok (syzygy-bpyt.8.4). The
// families share one parser and one sweep. syzygy-bpyt.8.4 kept each family's old differences as per-family knobs: the head lines it
// holds a record to, and how another decisions file names it. Owner answer A to consent-withdrawal-knobs
// (.syzygy/governance/decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-03.md, syzygy-bpyt.1.24) aligned every knob toward
// refusal. Each row is therefore a differential: `before` is the vector the readers gave at that change's base (pinned there by this
// file), `after` the vector they give now, and every world where families disagreed only through a knob now reads `refused` for each
// family the knob concerns. What still differs by family is which stems and paths name each act, never how they are read. Verdicts and
// paths are literals.

const ALLOWLIST = vi.hoisted(() => new Map<string, { readonly sha256: string; readonly reason: string }>());
vi.mock('./citation-allowlist.js', () => ({ CITATION_ALLOWLIST: ALLOWLIST }));
afterEach(() => ALLOWLIST.clear());

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const sha = (t: string): string => createHash('sha256').update(t, 'utf8').digest('hex');
const real = (rel: string): string => readFileSync(path.join(ROOT, rel), 'utf8');
const D = '.syzygy/governance/decisions';
const REDIS = '.syzygy/governance/contracts/candidates/public-repo-admission/instances/redis/OBSERVATION-CONSENT.md';
const EGRESS = '.syzygy/governance/contracts/candidates/public-repo-admission/instances/egress-anthropic/EGRESS-CONSENT-ANTHROPIC.md';
const POLICY = '.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json';
const MODULE = '.syzygy/governance/contracts/rfcs/RFC-0005/consent-egress-secrets.md';
const ENTRY = '.syzygy/governance/contracts/candidates/public-admission-registry-entries/proposed/POLARIS-PUBLIC-GIT-SOURCE-ACQUISITION-CANDIDATE.json';
const OWNER_ANSWERS = 'PUBLIC-REPO-ADMISSION-OWNER-ANSWERS-2026-10-03.md';
const HISTORICAL = ['PWB-SECRET-CLASSIFICATION-POLICY-ACT.md', 'PWB-SECRET-CLASSIFICATION-POLICY-AMENDMENT-ACT.md', 'PWB-SECRET-CLASSIFICATION-POLICY-BEHAVIOR-CONTRACT-REPIN-ACT.md'];
const RECORD = {
  admission: 'PUBLIC-REPO-ADMISSION-REDIS-OBSERVATION-ACT.md', policy: 'PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-ACT.md',
  class: 'RFC5-PROJECT-DOCUMENTATION-CLASS-AMENDMENT-ACT.md', registry: 'PUBLIC-ADMISSION-REGISTRY-GIT-SOURCE-ACT.md',
} as const;
const INSTANT = { admission: '2026-10-04T09:30:00Z', policy: '2026-10-04T09:30:00Z', class: '2026-10-03T09:30:00Z', registry: '2026-10-07T09:30:00Z' } as const;
const NOW = Date.UTC(2026, 9, 8, 0, 0, 0);
const POLICY_IDENTITY = 'PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-APPROVAL-2026-10-04';

const obsText = `# redis observation consent (public repository)

Record ID: \`PUBLIC-OBS-REDIS-2026-10-03\`

Record version: \`0.1.0-candidate.7\`

Subject: \`(project:syzygy, repository:redis-redis)\`

| Label | Commit object id |
|---|---|
| \`8.10.2\` | \`498ecd0d6d007db11ddb3aea9428552598a78622\` |

Proposed revocation state: active; supersedes no earlier consent
`;
const egressText = `# Public-target egress consent

Record ID: \`PUBLIC-EGRESS-anthropic\`

Record version: \`0.1.0-candidate.7\`

Subject: \`(project:syzygy, provider:anthropic)\`

Permitted content classes (RFC5-14 closed vocabulary):

- \`governance-text\`

Proposed revocation state: active; supersedes no earlier consent

## Scope

- \`(project:syzygy, repository:redis-redis)\`
`;
const policyText = JSON.stringify({ policyVersion: '1.2.0-public-source-candidate.1', publicSourceScope: { rules: [] } }, null, 1) + '\n';
const entryText = '{"entries":[{"observerId":"x"}]}\n';
// Tooling the citation cases cite: scripts whose names carry a family's stem without being an id.
const SCRIPTS = ['build_public_egress_v2.py', 'record_rfc5_project_documentation_act.py', 'check_public_admission_registry_git_source.py', 'a_b.py'];

/** A file system over a map of repository-relative paths under `/r`: a directory is any proper prefix of a key. */
function memoryFs(files: Readonly<Record<string, string>>): PackageReaderFs {
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

const FAMILIES = ['admission', 'policy', 'class', 'registry'] as const;
type Family = typeof FAMILIES[number];
type Verdict = 'ok' | 'absent' | 'refused';
type Verdicts = readonly [Verdict, Verdict, Verdict, Verdict];
/** Alignment toward refusal: for every family, a world refused before is refused after, and a changed verdict changed only to refused. */
const towardRefusal = (before: Verdicts, after: Verdicts): boolean => before.every((was, i) => was === after[i] || after[i] === 'refused');
async function verdict(family: Family, files: Readonly<Record<string, string>>): Promise<Verdict> {
  const fs = memoryFs(files);
  if (family === 'admission') {
    try { await createPackageAdmissionReader({ root: '/r', fs }).read(); return 'ok'; } catch (error) { if (error instanceof AdmissionRecordError) return 'refused'; throw error; }
  }
  if (family === 'policy') return (await readPolicyActChain({ root: '/r', fs, now: NOW })).state;
  if (family === 'class') return (await readClassActState({ root: '/r', fs, now: NOW })).state;
  return (await readDigestBoundActState({ root: '/r', fs, now: NOW, form: REGISTRY_GIT_SOURCE_ACT_FORM })).state;
}
const verdicts = (files: Readonly<Record<string, string>>): Promise<Verdict[]> => Promise.all(FAMILIES.map(family => verdict(family, files)));

/** One record of each family in force at `NOW`, each over its artifact's bytes, beside the pinned files the real tree holds. */
let BASE: Readonly<Record<string, string>> = {};
beforeAll(() => {
  const module = real(MODULE);
  BASE = Object.freeze({
    [REDIS]: obsText, [EGRESS]: egressText, [POLICY]: policyText, [MODULE]: module, [ENTRY]: entryText,
    ...Object.fromEntries(SCRIPTS.map(name => [`scripts/${name}`, '# tooling\n'])),
    [`${D}/README.md`]: '# decisions\n',
    [`${D}/${OWNER_ANSWERS}`]: real(`${D}/${OWNER_ANSWERS}`),
    ...Object.fromEntries(HISTORICAL.map(name => [`${D}/${name}`, real(`${D}/${name}`)])),
    [`${D}/${RECORD.admission}`]: renderRecorderAct('redis-observation', '0'.repeat(64), '2026-10-04', INSTANT.admission).replace('0'.repeat(64), sha(obsText)),
    [`${D}/PUBLIC-REPO-ADMISSION-EGRESS-ANTHROPIC-ACT.md`]: renderRecorderAct('egress-anthropic', '0'.repeat(64), '2026-10-04', INSTANT.admission).replace('0'.repeat(64), sha(egressText)),
    [`${D}/${RECORD.policy}`]: renderPolicyAct(sha(policyText), '2026-10-04', INSTANT.policy, 1),
    [`${D}/${RECORD.class}`]: renderClassAct(sha(module), '2026-10-03', INSTANT.class),
    [`${D}/${RECORD.registry}`]: renderRegistryAct(sha(entryText), '2026-10-07', INSTANT.registry),
  });
});
const withFile = (rel: string, text: string): Record<string, string> => ({ ...BASE, [`${D}/${rel}`]: text });

describe('the act families over one world', () => {
  it('read every family\'s record in force, with the head fields each parser takes from it', async () => {
    const fs = memoryFs(BASE);
    expect((await createPackageAdmissionReader({ root: '/r', fs }).read()).map(r => `${r.recordId}@${r.inForceAt}`).sort())
      .toEqual([`PUBLIC-EGRESS-anthropic@${Date.UTC(2026, 9, 4, 9, 30, 0)}`, `PUBLIC-OBS-REDIS-2026-10-03@${Date.UTC(2026, 9, 4, 9, 30, 0)}`]);
    expect(await readPolicyActChain({ root: '/r', fs, now: NOW })).toMatchObject({ state: 'ok', final: {
      file: RECORD.policy, identity: POLICY_IDENTITY, type: 'approve-policy', artifact: POLICY, project: 'project:syzygy', digest: sha(policyText), date: '2026-10-04',
      recordedAt: Date.UTC(2026, 9, 4, 9, 30, 0), supersession: expect.stringMatching(/^Supersession \/ revocation: this act supersedes, for the `approve-policy` role only, the 2026-10-02 act /),
    } });
    expect(await readClassActState({ root: '/r', fs, now: NOW })).toMatchObject({ state: 'ok', moduleDigest: sha(real(MODULE)), act: {
      file: RECORD.class, identity: 'RFC5-PROJECT-DOCUMENTATION-AMEND-2026-10-03', type: 'contract-amendment', artifact: MODULE, project: 'project:syzygy', date: '2026-10-03',
      recordedAt: Date.UTC(2026, 9, 3, 9, 30, 0), supersession: 'Supersession / revocation: none recorded by this act. This act is revoked only by a later exact owner act naming it.',
    } });
    expect(await readDigestBoundActState({ root: '/r', fs, now: NOW, form: REGISTRY_GIT_SOURCE_ACT_FORM })).toMatchObject({ state: 'ok', artifactDigest: sha(entryText), act: {
      file: RECORD.registry, identity: 'PUBLIC-ADMISSION-REGISTRY-GIT-SOURCE-2026-10-07', type: 'adopt-registry-entry', artifact: ENTRY, digest: sha(entryText),
      recordedAt: Date.UTC(2026, 9, 7, 9, 30, 0), supersession: expect.stringMatching(/^Supersession \/ revocation: none recorded by this act; an earlier version of the same record/),
    } });
  });
});

const REFUSED: Verdicts = ['refused', 'refused', 'refused', 'refused'];
const PROVENANCE = 'Provenance state: `owner-adopted (bootstrap, uncorrelated)` — state (1),\n';
/** Each family's own record changed one way, read by that family alone: [admission, policy, class, registry], before and after. */
const DIALECT: ReadonlyArray<readonly [string, (text: string, family: Family) => string, Verdicts, Verdicts]> = [
  // The act-type pattern (knob 7): any value now counts as the field, so a second line of any value is a repeated field.
  ['a second Act type line whose value has capitals and a space', t => `${t}\nAct type: \`Approve Policy\`\n`, ['ok', 'ok', 'refused', 'refused'], REFUSED],
  ['a second Act type line of lowercase letters and dashes', t => `${t}\nAct type: \`other-type\`\n`, ['ok', 'refused', 'refused', 'refused'], REFUSED],
  ['a second Act type line naming an admission act type', t => `${t}\nAct type: \`consent-egress\`\n`, REFUSED, REFUSED],
  // The fixed recorder lines (knobs 3, 4 and 5): every family holds a record to all three, and to the provenance line's opening.
  ['no Owner line', t => t.replace('Owner: Tzeusy\n\n', ''), ['ok', 'ok', 'ok', 'refused'], REFUSED],
  ['the Owner line twice', t => t.replace('Owner: Tzeusy\n', 'Owner: Tzeusy\n\nOwner: Tzeusy\n'), ['ok', 'ok', 'ok', 'refused'], REFUSED],
  ['no A1 line', t => t.replace('A1 audit-record identity (RFC3-16(b) item 9): **explicitly absent**\n', ''), ['ok', 'ok', 'ok', 'refused'], REFUSED],
  ['the provenance line without its state tail', t => t.replace(' — state (1),\n', '\n'), ['ok', 'ok', 'ok', 'refused'], REFUSED],
  ['the provenance line naming another state', t => t.replace('`owner-adopted (bootstrap, uncorrelated)`', '`owner-adopted`'), ['ok', 'refused', 'ok', 'refused'], REFUSED],
  ['a second provenance line with the same opening and another tail', t => t.replace(PROVENANCE, `${PROVENANCE}\nProvenance state: \`owner-adopted (bootstrap, uncorrelated)\` — state (2),\n`), ['ok', 'refused', 'ok', 'ok'], REFUSED],
  // The instant label: a family refuses a line under the label it does not read, as it refuses a second line under its own.
  ['a second instant labelled Act instant', (t, f) => `${t}\nAct instant: ${INSTANT[f]}\n`, ['ok', 'ok', 'refused', 'ok'], REFUSED],
  ['a second instant labelled Recorded at (UTC)', (t, f) => `${t}\nRecorded at (UTC): ${INSTANT[f]}\n`, ['refused', 'refused', 'ok', 'refused'], REFUSED],
  ['the one instant under the other label', t => (t.includes('\nAct instant:') ? t.replace('\nAct instant:', '\nRecorded at (UTC):') : t.replace('\nRecorded at (UTC):', '\nAct instant:')), REFUSED, REFUSED],
  // The supersession field (knob 4): every family reads it, so a repeated one refuses.
  ['a second Supersession / revocation field', t => `${t}\nSupersession / revocation: none.\n`, ['ok', 'refused', 'refused', 'refused'], REFUSED],
];
describe('each family holds its own record to every head line its recorder writes, aligned toward refusal (syzygy-bpyt.1.24)', () => {
  for (const [why, change, before, after] of DIALECT) {
    it(why, async () => {
      expect(towardRefusal(before, after), 'the change only adds refusals').toBe(true);
      const got: Verdict[] = [];
      for (const family of FAMILIES) {
        const file = `${D}/${RECORD[family]}`, changed = change(BASE[file]!, family);
        expect(changed, `${family}: the change applies`).not.toBe(BASE[file]);
        got.push(await verdict(family, { ...BASE, [file]: changed }));
      }
      expect(got).toEqual(after);
    });
  }
});

const AGGREGATE_PROSE = `# Acceptance act record

## Acts

PUBLIC-OBS-REDIS-2026-10-03, public-egress-v2, ${POLICY_IDENTITY}, RFC5-PROJECT-DOCUMENTATION-AMEND-2026-10-03, ${MODULE},
public-admission-registry-git-source and ${ENTRY}.
`;
/** One more decisions file, read by every family: [admission, policy, class, registry], before and, where a knob changed it, after.
 * A row with no `after` reads the same now. The knobs aligned here: a `>` field line counts for every family (knob 1); text and field
 * values count once read loosely (backticks dropped) in every family (knob 6); every family reads all four field labels; and the
 * policy family sweeps its policy path in text, as the class and digest-bound families sweep their artifacts. */
const SWEEP: ReadonlyArray<readonly [string, string, string, Verdicts, Verdicts?]> = [
  ['an unrelated file', 'NOTES.md', '# Notes\n', ['ok', 'ok', 'ok', 'ok']],
  ['a name carrying an admission stem', 'PUBLIC-OBS-PROBE.md', '# Notes\n', ['refused', 'ok', 'ok', 'ok']],
  ['a name carrying the screening-scope stem', 'PUBLIC-SOURCE-SCOPE-PROBE.md', '# Notes\n', ['ok', 'refused', 'ok', 'ok']],
  ['a name carrying the class stem', 'RFC5-PROJECT-DOCUMENTATION-PROBE.md', '# Notes\n', ['ok', 'ok', 'refused', 'ok']],
  ['a name carrying the registry stem', 'PUBLIC-ADMISSION-REGISTRY-GIT-SOURCE-PROBE.md', '# Notes\n', ['ok', 'ok', 'ok', 'refused']],
  ['a name carrying the registry stem split by backticks', 'public-admission-`registry`-git-source.md', '# Notes\n', ['ok', 'ok', 'ok', 'ok']],
  ['a name carrying the policy stem and a withdrawal word', 'PWB-SECRET-CLASSIFICATION-POLICY-WITHDRAWAL.md', '# Notes\n', ['ok', 'refused', 'ok', 'ok']],
  ['a name carrying the policy stem and a revocation word', 'sub/pwb_secret_classification_policy_revoked.md', '# Notes\n', ['ok', 'refused', 'ok', 'ok']],
  ['a name carrying the policy stem alone', 'PWB-SECRET-CLASSIFICATION-POLICY-NOTES.md', '# Notes\n', ['ok', 'ok', 'ok', 'ok']],
  ['a name carrying a withdrawal word alone', 'NOTES-WITHDRAWAL.md', '# Notes\n', ['ok', 'ok', 'ok', 'ok']],
  ['text carrying an admission stem', 'NOTES.md', 'See public-egress-v2.\n', ['refused', 'ok', 'ok', 'ok']],
  ['text carrying the screening-scope stem', 'NOTES.md', 'See Public Source Scope.\n', ['ok', 'refused', 'ok', 'ok']],
  ['text carrying the policy path and the policy stem', 'NOTES.md', `See ${POLICY} and pwb-secret-classification-policy.\n`, ['ok', 'ok', 'ok', 'ok'], ['ok', 'refused', 'ok', 'ok']],
  ['text carrying the policy path alone', 'NOTES.md', `See ${POLICY}.\n`, ['ok', 'ok', 'ok', 'ok'], ['ok', 'refused', 'ok', 'ok']],
  // Not a knob, and not aligned: the policy stem names the whole Butlers policy, which the earlier acts and the decisions citing them
  // carry in prose; as a text needle it refuses this checkout's tree (syzygy-bpyt.1.24 probe), so it names the policy on field lines only.
  ['text carrying the policy stem alone', 'NOTES.md', 'See pwb-secret-classification-policy.\n', ['ok', 'ok', 'ok', 'ok']],
  ['text carrying the class module path', 'NOTES.md', `See ${MODULE}.\n`, ['ok', 'ok', 'refused', 'ok']],
  ['text carrying the class stem', 'NOTES.md', 'See rfc5-project-documentation.\n', ['ok', 'ok', 'refused', 'ok']],
  ['text carrying the registry artifact path', 'NOTES.md', `See ${ENTRY}.\n`, ['ok', 'ok', 'ok', 'refused']],
  ['text carrying the registry stem', 'NOTES.md', 'See public-admission-registry-git-source.\n', ['ok', 'ok', 'ok', 'refused']],
  ['every family named in the aggregate record\'s prose', 'ACCEPTANCE-ACT-RECORD.md', AGGREGATE_PROSE, ['ok', 'ok', 'ok', 'ok']],
  ['the same prose in a file of that name elsewhere', 'sub/ACCEPTANCE-ACT-RECORD.md', AGGREGATE_PROSE, ['refused', 'refused', 'refused', 'refused']],
  ['an admission record id on a Record ID line', 'ACCEPTANCE-ACT-RECORD.md', 'Record ID: `PUBLIC-OBS-REDIS-2026-10-03`\n', ['refused', 'ok', 'ok', 'ok']],
  ['an admission stem on a Subject line', 'ACCEPTANCE-ACT-RECORD.md', 'Subject: public-egress-anthropic\n', ['refused', 'ok', 'ok', 'ok']],
  ['the class identity on an Act identity line', 'ACCEPTANCE-ACT-RECORD.md', 'Act identity: `RFC5-PROJECT-DOCUMENTATION-AMEND-2026-10-03`\n', ['ok', 'ok', 'refused', 'ok']],
  ['the class module on an Artifact identity line', 'ACCEPTANCE-ACT-RECORD.md', `Artifact identity: \`${MODULE}\`\n`, ['ok', 'ok', 'refused', 'ok']],
  ['the class module on an Artifact identity line spaced and cased otherwise', 'ACCEPTANCE-ACT-RECORD.md', `ARTIFACT   Identity : ${MODULE}\n`, ['ok', 'ok', 'refused', 'ok']],
  ['the class identity on a Record ID line and its stem on a Subject line', 'ACCEPTANCE-ACT-RECORD.md', 'Record ID: RFC5-PROJECT-DOCUMENTATION-AMEND-2026-10-03\n\nSubject: rfc5-project-documentation\n', ['ok', 'ok', 'ok', 'ok'], ['ok', 'ok', 'refused', 'ok']],
  ['a policy act identity on an Act identity line', 'ACCEPTANCE-ACT-RECORD.md', `Act identity: ${POLICY_IDENTITY}\n`, ['ok', 'refused', 'ok', 'ok']],
  ['the policy path on an Act identity line', 'ACCEPTANCE-ACT-RECORD.md', `Act identity: ${POLICY}\n`, ['ok', 'refused', 'ok', 'ok']],
  ['the policy path on an Artifact identity line', 'ACCEPTANCE-ACT-RECORD.md', `Artifact identity: \`${POLICY}\`\n`, ['ok', 'refused', 'ok', 'ok']],
  ['a policy act identity on an Artifact identity line', 'ACCEPTANCE-ACT-RECORD.md', `Artifact identity: ${POLICY_IDENTITY}\n`, ['ok', 'ok', 'ok', 'ok'], ['ok', 'refused', 'ok', 'ok']],
  ['the policy path on a Record ID line and a Subject line', 'ACCEPTANCE-ACT-RECORD.md', `Record ID: ${POLICY}\n\nSubject: ${POLICY}\n`, ['ok', 'ok', 'ok', 'ok'], ['ok', 'refused', 'ok', 'ok']],
  ['the registry stem on a Record ID line', 'ACCEPTANCE-ACT-RECORD.md', 'Record ID: public-admission-registry-git-source\n', ['ok', 'ok', 'ok', 'refused']],
  ['the registry artifact on a Subject line', 'ACCEPTANCE-ACT-RECORD.md', `Subject: ${ENTRY}\n`, ['ok', 'ok', 'ok', 'refused']],
  ['a bulleted policy field line', 'ACCEPTANCE-ACT-RECORD.md', `- **Act identity**: ${POLICY_IDENTITY}\n`, ['ok', 'refused', 'ok', 'ok']],
  ['a quoted policy field line', 'ACCEPTANCE-ACT-RECORD.md', `> Act identity: ${POLICY_IDENTITY}\n`, ['ok', 'ok', 'ok', 'ok'], ['ok', 'refused', 'ok', 'ok']],
  ['a quoted admission field line', 'ACCEPTANCE-ACT-RECORD.md', '> Record ID: PUBLIC-OBS-REDIS-2026-10-03\n', ['refused', 'ok', 'ok', 'ok']],
  ['a quoted class field line', 'ACCEPTANCE-ACT-RECORD.md', '> Act identity: RFC5-PROJECT-DOCUMENTATION-AMEND-2026-10-03\n', ['ok', 'ok', 'refused', 'ok']],
  ['a quoted registry field line', 'ACCEPTANCE-ACT-RECORD.md', '> Subject: public-admission-registry-git-source\n', ['ok', 'ok', 'ok', 'refused']],
  ['an admission stem split by backticks in text', 'NOTES.md', 'See public-`obs`-redis.\n', ['ok', 'ok', 'ok', 'ok'], ['refused', 'ok', 'ok', 'ok']],
  ['the screening-scope stem split by backticks in text', 'NOTES.md', 'See public-`source`-scope.\n', ['ok', 'ok', 'ok', 'ok'], ['ok', 'refused', 'ok', 'ok']],
  ['the class stem split by backticks in text', 'NOTES.md', 'See rfc5-`project`-documentation.\n', ['ok', 'ok', 'ok', 'ok'], ['ok', 'ok', 'refused', 'ok']],
  ['the registry stem split by backticks in text', 'NOTES.md', 'See public-admission-`registry`-git-source.\n', ['ok', 'ok', 'ok', 'refused']],
  ['an admission stem split by backticks on a field line', 'ACCEPTANCE-ACT-RECORD.md', 'Record ID: public-`obs`-redis\n', ['ok', 'ok', 'ok', 'ok'], ['refused', 'ok', 'ok', 'ok']],
  ['the policy stem split by backticks on a field line', 'ACCEPTANCE-ACT-RECORD.md', 'Act identity: pwb-`secret`-classification-policy\n', ['ok', 'ok', 'ok', 'ok'], ['ok', 'refused', 'ok', 'ok']],
  ['the class stem split by backticks on a field line', 'ACCEPTANCE-ACT-RECORD.md', 'Act identity: rfc5-`project`-documentation\n', ['ok', 'ok', 'ok', 'ok'], ['ok', 'ok', 'refused', 'ok']],
  ['the registry stem split by backticks on a field line', 'ACCEPTANCE-ACT-RECORD.md', 'Record ID: public-admission-`registry`-git-source\n', ['ok', 'ok', 'ok', 'refused']],
];
describe('each family\'s sweep names it in another decisions file, aligned toward refusal (syzygy-bpyt.1.24)', () => {
  for (const [why, rel, text, before, after] of SWEEP) {
    it(why, async () => {
      if (after !== undefined) expect(towardRefusal(before, after) && after.join() !== before.join(), 'a changed row only adds refusals').toBe(true);
      expect(await verdicts(withFile(rel, text))).toEqual(after ?? before);
    });
  }
});

describe('each family\'s pinned files and records are read by name and bytes', () => {
  it('a pinned file with other bytes refuses its own family only, whether or not the bytes name it', async () => {
    expect(await verdicts(withFile(OWNER_ANSWERS, '# x\n'))).toEqual(['refused', 'ok', 'ok', 'ok']);
    expect(await verdicts(withFile(HISTORICAL[0]!, '# x\n'))).toEqual(['ok', 'refused', 'ok', 'ok']);
    expect(await verdicts(withFile(HISTORICAL[2]!, `${BASE[`${D}/${HISTORICAL[2]}`]}\nWithdrawn.\n`))).toEqual(['ok', 'refused', 'ok', 'ok']);
  });
  it('a pinned file\'s bytes under another name are swept', async () => {
    expect(await verdicts(withFile('NOTES.md', BASE[`${D}/${OWNER_ANSWERS}`]!))).toEqual(['refused', 'ok', 'ok', 'ok']);
  });
  it('a family\'s record copied into a subdirectory is not its record and names it', async () => {
    expect(await verdicts(withFile(`archive/${RECORD.class}`, BASE[`${D}/${RECORD.class}`]!))).toEqual(['ok', 'ok', 'refused', 'ok']);
    expect(await verdicts(withFile(`archive/${RECORD.registry}`, BASE[`${D}/${RECORD.registry}`]!))).toEqual(['ok', 'ok', 'ok', 'refused']);
  });
});

// The allowlist (knob 2) now applies in every family. No citation carries a policy-family needle, so for the policy family it can only
// add a refusal: a set-aside citation that joins the screening-scope stem (the last row), as it joins any other family's.
describe('each family sets aside exact tooling citations in an allowlisted file, the policy family too (syzygy-bpyt.1.24)', () => {
  const allowlisted = (text: string): Record<string, string> => { ALLOWLIST.set('NOTES.md', { sha256: sha(text), reason: 'test' }); return withFile('NOTES.md', text); };
  /** [text, allowlisted before, allowlisted after, not allowlisted]. */
  const CITATIONS: ReadonlyArray<readonly [string, Verdicts, Verdicts, Verdicts]> = [
    ['Built by scripts/build_public_egress_v2.py.\n', ['ok', 'ok', 'ok', 'ok'], ['ok', 'ok', 'ok', 'ok'], ['refused', 'ok', 'ok', 'ok']],
    ['Recorded by scripts/record_rfc5_project_documentation_act.py.\n', ['ok', 'ok', 'ok', 'ok'], ['ok', 'ok', 'ok', 'ok'], ['ok', 'ok', 'refused', 'ok']],
    ['Checked by scripts/check_public_admission_registry_git_source.py.\n', ['ok', 'ok', 'ok', 'ok'], ['ok', 'ok', 'ok', 'ok'], ['ok', 'ok', 'ok', 'refused']],
    // Set aside, the citation leaves `public-source- -scope`, which folds to the screening-scope stem: before, the policy sweep read the
    // whole text and accepted it; now it reads the set-aside text and refuses, as the class family refuses its own stem joined so.
    ['public-source- scripts/a_b.py -scope\n', ['ok', 'ok', 'ok', 'ok'], ['ok', 'refused', 'ok', 'ok'], ['ok', 'ok', 'ok', 'ok']],
    ['rfc5-project- scripts/a_b.py -documentation\n', ['ok', 'ok', 'refused', 'ok'], ['ok', 'ok', 'refused', 'ok'], ['ok', 'ok', 'ok', 'ok']],
  ];
  for (const [text, before, after, otherwise] of CITATIONS) {
    it(text.trim(), async () => {
      expect(towardRefusal(before, after), 'the change only adds refusals').toBe(true);
      expect(await verdicts(withFile('NOTES.md', text)), 'not allowlisted').toEqual(otherwise);
      expect(await verdicts(allowlisted(text)), 'allowlisted').toEqual(after);
    });
  }
});
