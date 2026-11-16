// Reviewer's probe for PR 533 (R-GP-IMPL-FENCE-RULES-1), copied into a scratch clone only, never committed.
// (1) G4: how the whole consent admission reader treats a CRLF act record and a CRLF instance.
// (2) Whether a committed test through the public reader API (no export of outsideFences) can kill the two consent
//     mutants the record says only the probe kills (K1 opener indent 4, K2 closer strictly longer).
// Fixture builders are copied from package-reader.test.ts at 9d9c98a6.
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
const OWNER_ANSWERS_FILE = 'PUBLIC-REPO-ADMISSION-OWNER-ANSWERS-2026-10-03.md';
const ownerAnswers = (): string => readFileSync(fileURLToPath(new URL(`../../../${DECISIONS_DIR}/${OWNER_ANSWERS_FILE}`, import.meta.url)), 'utf8');
const sha = (t: string): string => createHash('sha256').update(t, 'utf8').digest('hex');
const REDIS_PATH = `${INSTANCES_DIR}/redis/OBSERVATION-CONSENT.md`;
const ACT = `${DECISIONS_DIR}/PUBLIC-REPO-ADMISSION-REDIS-OBSERVATION-ACT.md`;
const actText = (artifactText: string): string => renderRecorderAct('redis-observation', '0'.repeat(64), '2026-10-04', '2026-10-04T09:30:00Z')
  .replace('0'.repeat(64), sha(artifactText))
  .replace(/^Act type: `[^`]+`/m, 'Act type: `consent-observation`').replace(/^Artifact identity: `[^`]+`/m, `Artifact identity: \`${REDIS_PATH}\``);
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
const world = (act: string, instance = obsText()): Record<string, string> => ({ [REDIS_PATH]: instance, [ACT]: act, [`${DECISIONS_DIR}/${OWNER_ANSWERS_FILE}`]: ownerAnswers() });
const outcome = async (files: Record<string, string>): Promise<string> => {
  try {
    const records = await createPackageAdmissionReader({ root: '/r', fs: memoryFs(files) }).read();
    return records.map(r => `${r.class}:${r.repositoryId}:${r.inForceAt === null ? 'not-in-force' : 'in-force'}`).join(',') || 'none';
  } catch (error) {
    return `refused:${(error as Error).constructor.name}`;
  }
};
const afterTitle = (text: string, block: string): string => text.replace('\n\n', `\n\n${block}\n\n`);

describe('rev-533 consent probe', () => {
  it('records the outcomes', async () => {
    const act = actText(obsText());
    const crlfInstance = obsText().replace(/\n/g, '\r\n');
    const rows = {
      baseline: await outcome(world(act)),
      crlfActRecord: await outcome(world(act.replace(/\n/g, '\r\n'))),
      crlfInstanceBoundByDigest: await outcome(world(actText(crlfInstance), crlfInstance)),
      indentedFourSpaceFenceLineInAct: await outcome(world(afterTitle(act, '    ```'))),
      closedExampleFenceInAct: await outcome(world(afterTitle(act, '```\nexample\n```'))),
    };
    console.log('REV533 ' + JSON.stringify(rows));
    // Pins a committed test could carry (expected today):
    expect(rows.baseline).toBe('observation:redis-redis:in-force');
    expect(rows.indentedFourSpaceFenceLineInAct).toBe('observation:redis-redis:in-force');
    expect(rows.closedExampleFenceInAct).toBe('observation:redis-redis:in-force');
  }, 120_000);
});
