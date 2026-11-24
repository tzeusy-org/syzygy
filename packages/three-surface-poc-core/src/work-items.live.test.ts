import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

import { observeCodeStructure } from './code-structure.js';
import { observeWorkItems } from './work-items.js';

// Gated exactly like the existing SYZYGY_FRESH_CLONE system-test gate
// (see AGENTS.md "Notes to self"): runs only when a real, configured
// Butlers checkout with a live Dolt server is available, so the default
// suite stays hermetic while this oracle-faithful check remains available
// on demand.
const BUTLERS_REPO = process.env.SYZYGY_POC_BUTLERS_REPO;
const describeLive = BUTLERS_REPO === undefined ? describe.skip : describe;

describeLive('live Butlers observation (SYZYGY_POC_BUTLERS_REPO gated)', () => {
  const repoRoot = BUTLERS_REPO as string;

  it('matches `git rev-parse HEAD` and a direct Dolt read (POC-REQ-001, POC-REQ-010 oracles)', () => {
    const expectedGitRevision = execFileSync('git', ['-C', repoRoot, 'rev-parse', 'HEAD'], {
      encoding: 'utf8',
    }).trim();
    const structure = observeCodeStructure({
      repoRoot,
      revision: expectedGitRevision,
      capturedAt: new Date().toISOString(),
    });
    expect(structure.kind).toBe('observed');
    if (structure.kind !== 'observed') throw new Error('unreachable');
    expect(structure.provenance.revision).toBe(expectedGitRevision);
    expect(structure.files.length).toBeGreaterThan(0);

    const workItems = observeWorkItems({
      repoRoot,
      beadPrefix: 'bu',
      capturedAt: new Date().toISOString(),
    });
    expect(workItems.kind).toBe('observed');
    if (workItems.kind !== 'observed') throw new Error('unreachable');

    const expectedRevision = execFileSync(
      'bd',
      ['--readonly', '--json', '-C', repoRoot, 'sql', "SELECT dolt_hashof('HEAD') AS revision"],
      { encoding: 'utf8' },
    );
    const expected = (JSON.parse(expectedRevision) as readonly { revision: string }[])[0];
    expect(workItems.provenance.revision).toBe(expected?.revision);
    expect(workItems.items.every((item) => item.id.startsWith('bu-'))).toBe(true);

    const sampled = workItems.items[0];
    expect(sampled).toBeDefined();
    const direct = execFileSync(
      'bd',
      [
        '--readonly',
        '--json',
        '-C',
        repoRoot,
        'sql',
        `SELECT status, created_at, updated_at FROM issues AS OF '${workItems.provenance.revision}' WHERE id = '${sampled?.id}'`,
      ],
      { encoding: 'utf8' },
    );
    const directRow = (
      JSON.parse(direct) as readonly { status: string; created_at: string; updated_at: string }[]
    )[0];
    expect(directRow?.status).toBe(sampled?.status);
    expect(directRow?.created_at).toBe(sampled?.createdAt);
  });
});
