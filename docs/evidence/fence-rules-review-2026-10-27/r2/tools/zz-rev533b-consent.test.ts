// Reviewer's probe for PR 533 round 2 (R-GP-IMPL-FENCE-RULES-2), copied into a scratch clone only, never committed.
// Which LF-exact checks of the consent admission reader refuse a CRLF record today, and does a field wholly inside a fence pass
// once only the act title check tolerates CR (the record's G4 claim)? Fixture builders follow package-reader.test.ts at 815d93bb.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { renderRecorderAct } from './recorder-fixtures.testkit.js';
import { DECISIONS_DIR, INSTANCES_DIR, createPackageAdmissionReader, type PackageReaderFs } from './package-reader.js';

const REDIS_REV = '498ecd0d6d007db11ddb3aea9428552598a78622';
const OTHER_REV = 'd2c8a4b91e8c0e6aefd1f5bc0bf582cddbe046b7';
const obsText = (): string => `# redis observation consent (public repository)

Record ID: \`PUBLIC-OBS-REDIS-2026-10-03\`

Record version: \`0.1.0-candidate.7\`

Subject: \`(project:syzygy, repository:redis-redis)\`

| Label | Commit object id |
|---|---|
| \`8.10.2\` | \`${REDIS_REV}\` |
| \`7.2.4\` | \`${OTHER_REV}\` |

Proposed revocation state: active; supersedes no earlier consent
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
const ownerAnswers = (): string => readFileSync(fileURLToPath(new URL(`../../../${DECISIONS_DIR}/${OWNER_ANSWERS_FILE}`, import.meta.url)), 'utf8');
const sha = (t: string): string => createHash('sha256').update(t, 'utf8').digest('hex');
const REDIS_PATH = `${INSTANCES_DIR}/redis/OBSERVATION-CONSENT.md`;
const EGRESS_PATH = `${INSTANCES_DIR}/egress-anthropic/EGRESS-CONSENT-ANTHROPIC.md`;
const OBS_ACT = `${DECISIONS_DIR}/PUBLIC-REPO-ADMISSION-REDIS-OBSERVATION-ACT.md`;
const EGRESS_ACT = `${DECISIONS_DIR}/PUBLIC-REPO-ADMISSION-EGRESS-ANTHROPIC-ACT.md`;
const actText = (type: string, artifact: string, text: string): string => {
  const key = artifact === EGRESS_PATH ? 'egress-anthropic' : 'redis-observation';
  return renderRecorderAct(key, '0'.repeat(64), '2026-10-04', '2026-10-04T09:30:00Z')
    .replace('0'.repeat(64), sha(text))
    .replace(/^Act type: `[^`]+`/m, `Act type: \`${type}\``).replace(/^Artifact identity: `[^`]+`/m, `Artifact identity: \`${artifact}\``);
};
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
  [OBS_ACT]: actText('consent-observation', REDIS_PATH, obsText()),
  [EGRESS_ACT]: actText('consent-egress', EGRESS_PATH, egressText()),
  [`${DECISIONS_DIR}/${OWNER_ANSWERS_FILE}`]: ownerAnswers(),
  ...over,
});
const outcome = async (files: Record<string, string>): Promise<string> => {
  try {
    const records = await createPackageAdmissionReader({ root: '/r', fs: memoryFs(files) }).read();
    return records.map(r => `${r.class}:${r.repositoryId ?? r.providerId}:${r.inForceAt === null ? 'not-in-force' : 'in-force'}`).sort().join(',') || 'none';
  } catch (error) {
    return `refused:${(error as Error).constructor.name}:${(error as Error).message}`;
  }
};
// The act record's `Date:` line moved inside a closed fence, so the field is wholly inside a fence.
const dateInsideFence = (act: string): string => {
  const m = /^Date: [^\n]*\n/m.exec(act);
  if (m === null) throw new Error('fixture: no Date line');
  return act.replace(m[0], '```\n' + m[0] + '```\n');
};

describe('rev-533b consent probe', () => {
  it('records the outcomes', async () => {
    const obsAct = actText('consent-observation', REDIS_PATH, obsText());
    const crlfEgress = egressText().replace(/\n/g, '\r\n');
    const rows = {
      baseline: await outcome(world()),
      crlfEgressInstanceBoundByDigest: await outcome(world({ [EGRESS_PATH]: crlfEgress, [EGRESS_ACT]: actText('consent-egress', EGRESS_PATH, crlfEgress) })),
      lfActDateInsideFence: await outcome(world({ [OBS_ACT]: dateInsideFence(obsAct) })),
      crlfActDateInsideFence: await outcome(world({ [OBS_ACT]: dateInsideFence(obsAct).replace(/\n/g, '\r\n') })),
      crlfActPlain: await outcome(world({ [OBS_ACT]: obsAct.replace(/\n/g, '\r\n') })),
    };
    console.log('REV533B ' + JSON.stringify(rows));
    expect(rows.baseline).toBe('egress:anthropic:in-force,observation:redis-redis:in-force');
  }, 120_000);
});
