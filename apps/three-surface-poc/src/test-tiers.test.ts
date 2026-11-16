import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { E2E_TESTS, INTEGRATION_TESTS, LIVE_TESTS, TIERS, filesOfTier, partitionProblems, testFiles, tierOf, workspaceDirectories, type TierLists } from '../../../vitest.tiers.js';

// syzygy-bpyt.4.3: every workspace test file is in exactly one tier, and no tier list names a file that is not there.
const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const NONE: TierLists = { integration: [], e2e: [], live: [] };
const A = 'packages/a/src/a.test.ts';
const B = 'packages/a/src/b.test.ts';
const C = 'apps/c/src/c.test.ts';

describe('the test tiers', () => {
  it('put every workspace test file in exactly one tier, by the lists and the system-test suffix', () => {
    const files = testFiles(ROOT);
    expect(partitionProblems(files)).toEqual([]);
    const byTier = Object.fromEntries(TIERS.map((tier) => [tier, filesOfTier(files, tier)]));
    expect(TIERS.reduce((total, tier) => total + byTier[tier]!.length, 0)).toBe(files.length);
    expect(new Set(TIERS.flatMap((tier) => byTier[tier]!)).size).toBe(files.length);
    // The denominator: all workspaces, and a count that a mass deletion or a tier emptied by a mistake would break.
    expect(workspaceDirectories(ROOT).length).toBeGreaterThanOrEqual(10);
    expect(files.length).toBeGreaterThan(250);
    expect(byTier['unit']!.length).toBeGreaterThan(100);
    expect(byTier['e2e']).toEqual(expect.arrayContaining(['packages/cap1-system/src/fresh-clone.system.test.ts', 'packages/polaris-dossier/src/no-egress.test.ts']));
    expect(byTier['live']).toHaveLength(3);
    expect(byTier['live']!.every((path) => path.endsWith('.live.test.ts'))).toBe(true);
    expect(files.filter((path) => path.endsWith('.live.test.ts'))).toEqual(byTier['live']);
  });

  it('reads a path as unit unless a list or the system suffix places it, the first of live, e2e, integration winning', () => {
    const lists: TierLists = { integration: [A, B], e2e: [B], live: [C] };
    expect(tierOf(A, lists)).toBe('integration');
    expect(tierOf(B, lists)).toBe('e2e');
    expect(tierOf(C, lists)).toBe('live');
    expect(tierOf('packages/a/src/d.test.ts', lists)).toBe('unit');
    expect(tierOf('packages/cap1-system/src/x.system.test.ts', NONE)).toBe('e2e');
  });

  it('reports each way the lists and the tree disagree, and nothing else', () => {
    const files = [A, B, C];
    expect(partitionProblems(files, NONE)).toEqual([]);
    expect(partitionProblems(files, { integration: [A], e2e: [B], live: [C] })).toEqual([]);
    expect(partitionProblems(files, { ...NONE, integration: ['packages/a/src/gone.test.ts'] })).toEqual(['integration: packages/a/src/gone.test.ts names no test file under a workspace src/']);
    expect(partitionProblems(files, { ...NONE, integration: [A], e2e: [A] })).toEqual([`${A} is in 2 tiers (integration, e2e)`]);
    expect(partitionProblems(files, { ...NONE, integration: [A, A] })).toEqual(['integration: lists a path twice']);
    expect(partitionProblems(files, { ...NONE, integration: [B, A] })).toEqual(['integration: list is not sorted']);
    const system = 'packages/s/src/s.system.test.ts';
    expect(partitionProblems([system], { ...NONE, e2e: [system] })).toEqual([`${system} is a system test, which is e2e by its suffix and is not listed`]);
  });

  it('lists its entries sorted and without duplicates, as the config sees them', () => {
    for (const list of [INTEGRATION_TESTS, E2E_TESTS, LIVE_TESTS]) expect([...list]).toEqual([...new Set(list)].sort());
  });
});
