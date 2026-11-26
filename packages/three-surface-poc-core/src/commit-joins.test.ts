import { describe, expect, it } from 'vitest';

import { COMMIT_HISTORY_BOUND, observeCommitJoins, subjectTokens } from './commit-joins.js';
import type { WorkItemsResult } from './work-items.js';

// POC-REQ-064 (syzygy-t3jk.25): commits join served items by exact
// identifier tokens in their subjects; no subject is kept. Every expected
// value below is a literal typed here.

const REVISION = 'a'.repeat(40);
const H2 = 'b'.repeat(40);
const H3 = 'c'.repeat(40);
const H4 = 'd'.repeat(40);
const H5 = 'e'.repeat(40);
const US = '\x1f';
const line = (hash: string, at: string, subject: string) => `${hash}${US}${at}${US}${subject}`;
const served = (...ids: string[]) => ({ kind: 'observed', items: ids.map((id) => ({ id })) }) as unknown as WorkItemsResult;
const ITEMS = served('bu-a1', 'bu-b2', 'bu-c3.1');

function run(lines: readonly string[], calls: string[][] = []) {
  return (_root: string, args: readonly string[]): string => {
    calls.push([...args]);
    return `${lines.join('\n')}\n`;
  };
}

describe('subject tokens (POC-REQ-064)', () => {
  it('splits on non-identifier characters and trims sentence punctuation, nothing more', () => {
    expect(subjectTokens('Fix the outline [bu-a1]')).toEqual(['Fix', 'the', 'outline', 'bu-a1']);
    expect(subjectTokens('Merge pull request #12 from org/agent/bu-c3.1')).toEqual(['Merge', 'pull', 'request', '12', 'from', 'org', 'agent', 'bu-c3.1']);
    expect(subjectTokens('Closes bu-a1. Then bu-b2-')).toEqual(['Closes', 'bu-a1', 'Then', 'bu-b2']);
    expect(subjectTokens('(bu-a1,bu-b2)')).toEqual(['bu-a1', 'bu-b2']);
    expect(subjectTokens('...  --')).toEqual([]);
  });
});

describe('commit joins (POC-REQ-064, syzygy-t3jk.25)', () => {
  it('joins each served item to the commits whose subject names it exactly, and keeps no subject', () => {
    const calls: string[][] = [];
    const result = observeCommitJoins({
      repoRoot: '/fixture', revision: REVISION, workItems: ITEMS,
      runGit: run([
        line(REVISION, '2026-11-26T10:00:00+08:00', 'Land the outline [bu-a1] SUBJECTMARKERone'),
        line(H2, '2026-11-25T10:00:00Z', 'Merge pull request #7 from org/agent/bu-c3.1 SUBJECTMARKERtwo'),
        line(H3, '2026-11-24T10:00:00Z', 'Near misses bu-a10 BU-A1 xbu-a1 bu-a bu-c3 SUBJECTMARKERthree'),
        line(H4, '2026-11-23T10:00:00Z', 'Both bu-a1 and bu-b2, bu-a1 again, and unserved bu-z9 SUBJECTMARKERfour'),
        line(H5, '2026-11-22T10:00:00Z', ''),
      ], calls),
    });
    expect(result).toEqual({
      kind: 'observed',
      revision: REVISION,
      basis: 'naming-convention',
      fidelity: 'reduced-fidelity',
      cause: 'derived-from-convention',
      bound: 5000,
      read: 5,
      truncated: false,
      joined: 3,
      unjoined: 2,
      items: [
        { id: 'bu-a1', commits: [{ hash: REVISION, at: '2026-11-26T10:00:00+08:00' }, { hash: H4, at: '2026-11-23T10:00:00Z' }] },
        { id: 'bu-b2', commits: [{ hash: H4, at: '2026-11-23T10:00:00Z' }] },
        { id: 'bu-c3.1', commits: [{ hash: H2, at: '2026-11-25T10:00:00Z' }] },
      ],
    });
    expect(JSON.stringify(result)).not.toMatch(/SUBJECTMARKER|Merge|Near|outline|bu-z9/);
    // One read, pinned to the observed revision and bounded; never `--all`.
    expect(calls).toEqual([['log', '--max-count=5001', '--format=%H\x1f%cI\x1f%s', REVISION, '--']]);
  });

  it('reads at most the bound and says when older history was not read', () => {
    const hashes = Array.from({ length: COMMIT_HISTORY_BOUND + 1 }, (_, index) => index.toString(16).padStart(40, '0'));
    hashes[0] = REVISION;
    const lines = hashes.map((hash, index) => line(hash, '2026-11-01T00:00:00Z', index === COMMIT_HISTORY_BOUND ? 'beyond the bound [bu-b2]' : 'work [bu-a1]'));
    const result = observeCommitJoins({ repoRoot: '/fixture', revision: REVISION, workItems: ITEMS, runGit: run(lines) });
    if (result.kind !== 'observed') throw new Error('expected observed');
    expect([result.read, result.truncated, result.joined, result.unjoined]).toEqual([5000, true, 5000, 0]);
    expect(result.items.map((item) => [item.id, item.commits.length])).toEqual([['bu-a1', 5000]]);
    const exact = observeCommitJoins({ repoRoot: '/fixture', revision: REVISION, workItems: ITEMS, runGit: run(lines.slice(0, 5000)) });
    expect(exact.kind === 'observed' && [exact.read, exact.truncated]).toEqual([5000, false]);
  });

  it('serves an observed zero when no subject names a served item', () => {
    const result = observeCommitJoins({ repoRoot: '/fixture', revision: REVISION, workItems: ITEMS, runGit: run([line(REVISION, '2026-11-26T00:00:00Z', 'chore')]) });
    expect(result).toMatchObject({ kind: 'observed', read: 1, joined: 0, unjoined: 1, items: [] });
  });

  it('is Unknown, with its closed reason, whenever the join cannot be read at the observed revision', () => {
    const good = run([line(REVISION, '2026-11-26T00:00:00Z', '[bu-a1]')]);
    const unknown = { kind: 'unknown' } as unknown as WorkItemsResult;
    const cases: [string, Parameters<typeof observeCommitJoins>[0]][] = [
      ['work-items-unobserved', { repoRoot: '/f', revision: REVISION, workItems: unknown, runGit: good }],
      ['repository-revision-unavailable', { repoRoot: '/f', revision: 'HEAD', workItems: ITEMS, runGit: good }],
      ['repository-revision-unavailable', { repoRoot: '/f', revision: '', workItems: ITEMS, runGit: good }],
      ['commit-history-read-failed', { repoRoot: '/f', revision: REVISION, workItems: ITEMS, runGit: () => { throw new Error('git failed'); } }],
      ['commit-history-malformed', { repoRoot: '/f', revision: REVISION, workItems: ITEMS, runGit: run([`${REVISION}${US}2026-11-26T00:00:00Z`]) }],
      ['commit-history-malformed', { repoRoot: '/f', revision: REVISION, workItems: ITEMS, runGit: run([line('not-a-hash', '2026-11-26T00:00:00Z', '[bu-a1]')]) }],
      ['commit-history-malformed', { repoRoot: '/f', revision: REVISION, workItems: ITEMS, runGit: run([line(REVISION, 'yesterday', '[bu-a1]')]) }],
      ['commit-history-malformed', { repoRoot: '/f', revision: REVISION, workItems: ITEMS, runGit: run([line(H2, '2026-11-26T00:00:00Z', '[bu-a1]')]) }],
    ];
    for (const [reason, input] of cases) expect(observeCommitJoins(input)).toEqual({ kind: 'unknown', reason });
  });
});
