import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';

import { observeTrajectoryWorkItems, observeWorkItems } from './work-items.js';

function rowsResponse(rows: readonly Record<string, unknown>[]): string {
  return JSON.stringify(rows);
}

function workItemWitness(revision: string): Record<string, unknown> {
  return { revision, id: null, status: null, issue_type: null, priority: null, created_at: null, updated_at: null, closed_at: null };
}

const ITEM_REVISION = 'adpe9hi1llmdh05mr8aja5kagtu36eli';

describe('same-revision dependency observation (POC-REQ-062)', () => {
  const revisionA = '0123456789abcdefghijklmnopqrstuv';
  const revisionB = '1123456789abcdefghijklmnopqrstuv';
  const item = {
    revision: revisionA, id: 'bu-open', status: 'open', issue_type: 'task', priority: 1,
    created_at: '2026-08-30T00:00:00Z', updated_at: '2026-08-30T00:00:00Z', closed_at: null,
  };
  const witness = (revision: string) => ({
    revision, issue_id: null, depends_on_issue_id: null, type: null, has_external: null, has_wisp: null,
  });
  const edge = {
    revision: null, issue_id: 'bu-open', depends_on_issue_id: 'bu-open', type: 'blocks', has_external: 0, has_wisp: 0,
  };

  function observe(dependencyResponse: () => string, workItemRows: readonly Record<string, unknown>[] = [workItemWitness(revisionA), item]) {
    // syzygy-t3jk.21: the history read is its own statement (work-item-history.test.ts); here it fails.
    const isHistory = (sql: string): boolean => sql.includes('dolt_log(');
    const runQuery = vi.fn((_repoRoot: string, sql: string) => {
      if (isHistory(sql)) throw new Error('no history in this fixture');
      return sql.includes('FROM issues ') ? JSON.stringify(workItemRows) : dependencyResponse();
    });
    const result = observeTrajectoryWorkItems({ repoRoot: '/fixture', beadPrefix: 'bu', capturedAt: '2026-08-31T00:00:00Z', runQuery });
    return { ...result, calls: runQuery.mock.calls.map(([, sql]) => sql).filter((sql) => !isHistory(sql)) };
  }

  it('observes a witnessed empty set in two named, revision-pinned statements', () => {
    const result = observe(() => JSON.stringify([witness(revisionA)]));
    expect(result.workItems.kind).toBe('observed');
    expect(result.dependencies).toEqual({
      kind: 'observed', byItem: new Map(),
      counts: { total: 0, byType: { blocks: 0, 'parent-child': 0, 'discovered-from': 0, related: 0, 'relates-to': 0, tracks: 0 }, unlisted: 0, external: 0, wisp: 0, outOfPrefix: 0 },
      parentFacts: { parents: new Map(), outsideTracker: new Set(), unobserved: new Set() },
    });
    expect(result.calls).toHaveLength(2);
    expect(result.calls[0]).toContain("FROM issues AS OF 'HEAD'");
    expect(result.calls[0]).toContain("UNION ALL SELECT dolt_hashof('HEAD'), NULL");
    expect(result.calls[1]).toBe(
      'SELECT issue_id, depends_on_issue_id, type, depends_on_external IS NOT NULL AS has_external, ' +
      "depends_on_wisp_id IS NOT NULL AS has_wisp, NULL AS revision FROM dependencies AS OF '0123456789abcdefghijklmnopqrstuv' " +
      "WHERE issue_id LIKE 'bu-%' UNION ALL SELECT NULL, NULL, NULL, NULL, NULL, dolt_hashof('0123456789abcdefghijklmnopqrstuv')",
    );
  });

  it.each([
    ['empty with missing witness', []],
    ['nonempty with missing witness', [edge]],
    ['empty at another revision', [witness(revisionB)]],
    ['nonempty at another revision', [edge, witness(revisionB)]],
    ['duplicate matching witness', [witness(revisionA), witness(revisionA)]],
    ['matching revision placed on an edge', [{ ...edge, revision: revisionA }]],
  ])('refuses %s while preserving the work-item fact', (_case, rows) => {
    const result = observe(() => JSON.stringify(rows));
    expect(result.calls).toHaveLength(2);
    expect(result.workItems.kind).toBe('observed');
    if (result.workItems.kind !== 'observed') throw new Error('unreachable');
    expect(result.workItems.provenance.revision).toBe(revisionA);
    expect(result.workItems.items.map(({ id, status }) => [id, status])).toEqual([['bu-open', 'open']]);
    expect(result.dependencies).toEqual({ kind: 'unknown', reason: 'dependency-revision-unverified' });
  });

  it.each([
    ['an unserved dependent', { ...edge, issue_id: 'bu-absent' }],
    ['an unexpected field', { ...edge, unnamed_field: 'sample text' }],
    ['an invalid presence flag', { ...edge, has_external: 2 }],
  ])('refuses malformed edge metadata with %s instead of a partial count', (_case, badRow) => {
    const result = observe(() => JSON.stringify([witness(revisionA), edge, badRow]));
    expect(result.dependencies).toEqual({ kind: 'unknown', reason: 'dependency-result-malformed' });
  });

  it('keeps bad source output, transport failure and a missing work revision distinct', () => {
    expect(observe(() => 'non JSON').dependencies).toEqual({ kind: 'unknown', reason: 'dependency-result-malformed' });
    expect(observe(() => { throw new Error('fixture failure'); }).dependencies).toEqual({ kind: 'unknown', reason: 'dependency-read-failed' });
    const absent = observe(() => '[]', []);
    expect(absent.workItems).toEqual({ kind: 'unknown', reason: 'work-item observation returned no revision witness' });
    expect(absent.dependencies).toEqual({ kind: 'unknown', reason: 'work-item-revision-unavailable' });
    expect(absent.calls).toHaveLength(1);
  });

  it.each([
    ['nonempty without a revision witness', [item], 'work-item observation returned no revision witness'],
    ['invalid work-item revision', [workItemWitness('invalid-fixture-revision'), { ...item, revision: 'invalid-fixture-revision' }], 'work-item observation returned a malformed revision'],
    ['duplicate revision witness', [workItemWitness(revisionA), item, workItemWitness(revisionA)], 'work-item observation returned a malformed revision witness'],
    ['disagreement between row and revision witness', [workItemWitness(revisionB), item], 'work-item observation spanned more than one Dolt revision'],
  ])('refuses a first statement %s and skips dependency observation', (_case, rows, reason) => {
    const result = observe(() => JSON.stringify([witness(revisionA)]), rows);
    expect(result.workItems).toEqual({ kind: 'unknown', reason });
    expect(result.dependencies).toEqual({ kind: 'unknown', reason: 'work-item-revision-unavailable' });
    expect(result.calls).toHaveLength(1);
  });
});

describe('work-items observer', () => {
  it('reads items via bd sql and stamps them with the Dolt revision read (POC-REQ-010)', () => {
    const calls: string[] = [];
    const runQuery = vi.fn((_repoRoot: string, sql: string) => {
      calls.push(sql);
      return rowsResponse([
        workItemWitness(ITEM_REVISION),
        {
          revision: ITEM_REVISION,
          id: 'bu-000rb',
          title: 'Sample item',
          status: 'closed',
          issue_type: 'task',
          priority: 1,
          created_at: '2026-07-23T05:21:44Z',
          updated_at: '2026-07-24T01:25:16Z',
          closed_at: '2026-07-24T01:25:16Z',
        },
      ]);
    });

    const result = observeWorkItems({
      repoRoot: '/repo',
      beadPrefix: 'bu',
      capturedAt: '2026-08-30T00:00:00Z',
      runQuery,
    });

    expect(result.kind).toBe('observed');
    if (result.kind !== 'observed') throw new Error('unreachable');
    expect(result.provenance).toEqual({
      kind: 'dolt-revision',
      source: 'Beads Dolt database (bu)',
      revision: 'adpe9hi1llmdh05mr8aja5kagtu36eli',
    });
    expect(result.items).toHaveLength(1);
    // The item takes the revision from the one record; it does not restate it.
    expect(Object.values(result.items[0] ?? {})).not.toContain('adpe9hi1llmdh05mr8aja5kagtu36eli');
    expect(calls[0]).toContain("dolt_hashof('HEAD')");
  });

  it('scopes the query to the registered bead-prefix and rejects out-of-prefix rows (POC-REQ-011)', () => {
    const runQuery = vi.fn((_repoRoot: string, sql: string) => {
      expect(sql).toContain("id LIKE 'bu-%'");
      return rowsResponse([
        workItemWitness(ITEM_REVISION),
        {
          revision: ITEM_REVISION,
          id: 'other-1',
          title: 'wrong prefix',
          status: 'open',
          issue_type: 'task',
          priority: 1,
          created_at: '2026-08-30T00:00:00Z',
          updated_at: '2026-08-30T00:00:00Z',
          closed_at: null,
        },
      ]);
    });

    const result = observeWorkItems({
      repoRoot: '/repo',
      beadPrefix: 'bu',
      capturedAt: '2026-08-30T00:00:00Z',
      runQuery,
    });
    expect(result).toEqual({ kind: 'unknown', reason: 'work-item observation returned an out-of-prefix identifier' });
  });

  it('never touches the passive JSONL export or any derived file (POC-REQ-012)', () => {
    // Static prohibition: the module's own source is the population swept
    // (CC-SPEC oracle style) — it must import no filesystem API and name no
    // JSONL/export path, so its only possible work-item channel is the
    // injected/shelled SQL query.
    const modulePath = fileURLToPath(new URL('./work-items.ts', import.meta.url));
    const source = readFileSync(modulePath, 'utf8');
    expect(source).not.toMatch(/from ['"]node:fs['"]/);
    expect(source.toLowerCase()).not.toContain('.jsonl');
    expect(source.toLowerCase()).not.toContain('issues.export');

    const runQuery = vi.fn(
      () =>
        // deliberately disagrees with what a mutated export would say, to
        // prove the observer's only source is the injected query channel
        rowsResponse([
          workItemWitness(ITEM_REVISION),
          {
            revision: ITEM_REVISION,
            id: 'bu-divergent',
            title: 'from Dolt, not JSONL',
            status: 'in_progress',
            issue_type: 'task',
            priority: 2,
            created_at: '2026-08-30T00:00:00Z',
            updated_at: '2026-08-30T00:00:00Z',
            closed_at: null,
          },
        ]),
    );

    const result = observeWorkItems({
      repoRoot: '/repo',
      beadPrefix: 'bu',
      capturedAt: '2026-08-30T00:00:00Z',
      runQuery,
    });

    expect(result.kind).toBe('observed');
    if (result.kind !== 'observed') throw new Error('unreachable');
    expect(result.items[0]?.status).toBe('in_progress');
  });

  it('renders Unknown with a named reason when the database is unreachable (POC-REQ-013)', () => {
    const runQuery = vi.fn(() => {
      throw new Error('connection refused');
    });
    const result = observeWorkItems({
      repoRoot: '/repo',
      beadPrefix: 'bu',
      capturedAt: '2026-08-30T00:00:00Z',
      runQuery,
    });
    expect(result.kind).toBe('unknown');
    if (result.kind !== 'unknown') throw new Error('unreachable');
    expect(result.reason.length).toBeGreaterThan(0);
  });

  it('distinguishes an observed-empty result from Unknown', () => {
    const runQuery = vi.fn(() => rowsResponse([workItemWitness(ITEM_REVISION)]));
    const result = observeWorkItems({
      repoRoot: '/repo',
      beadPrefix: 'bu',
      capturedAt: '2026-08-30T00:00:00Z',
      runQuery,
    });
    expect(result.kind).toBe('observed');
    if (result.kind !== 'observed') throw new Error('unreachable');
    expect(result.items).toEqual([]);
    expect(result.provenance.revision).toBe(ITEM_REVISION);
    expect(runQuery).toHaveBeenCalledExactlyOnceWith('/repo', expect.stringContaining("FROM issues AS OF 'HEAD'"));
  });

  it('rejects a malformed configured prefix rather than shelling an unsafe query', () => {
    const runQuery = vi.fn();
    const result = observeWorkItems({
      repoRoot: '/repo',
      beadPrefix: "bu'; DROP TABLE issues; --",
      capturedAt: '2026-08-30T00:00:00Z',
      runQuery,
    });
    expect(result.kind).toBe('unknown');
    expect(runQuery).not.toHaveBeenCalled();
  });

  describe('SEC-5: work-item titles are withheld, never read (owner answer 2026-10-20, syzygy-jytt)', () => {
    // Literals, typed here: RFC2-24's `excluded-content` route, and the
    // columns the observation may read.
    const WITHHELD = {
      label: 'Unknown',
      closedReason: 'excluded-content',
      resolutionRoutes: [{ reason: 'excluded-content', route: 'Policy change by the owner, or accept the exclusion', actor: 'owner', verb: 'decide', target: 'policy' }],
    };
    const ITEM_ROW = {
      revision: ITEM_REVISION, id: 'bu-t1', status: 'open', issue_type: 'task', priority: 2,
      created_at: '2026-08-30T00:00:00Z', updated_at: '2026-08-30T01:00:00Z', closed_at: null,
    };

    function observe(rows: readonly Record<string, unknown>[], calls: string[] = []) {
      return observeWorkItems({
        repoRoot: '/repo',
        beadPrefix: 'bu',
        capturedAt: '2026-08-30T02:00:00Z',
        runQuery: (_root, sql) => {
          calls.push(sql);
          return rowsResponse([workItemWitness(ITEM_REVISION), ...rows]);
        },
      });
    }

    it('selects exactly the eight non-free-text columns, and never the title', () => {
      const calls: string[] = [];
      observe([ITEM_ROW], calls);
      const columns = /^SELECT (.*) FROM issues /.exec(calls[0] ?? '')?.[1]?.split(', ');
      expect(columns).toEqual(["dolt_hashof('HEAD') AS revision", 'id', 'status', 'issue_type', 'priority', 'created_at', 'updated_at', 'closed_at']);
      expect(calls[0]).not.toMatch(/\btitle\b/i);
    });

    it('admits a row with no title, and copies no title from a row that carries one', () => {
      const untitled = observe([ITEM_ROW]);
      expect(untitled.kind).toBe('observed');
      const titled = observe([{ ...ITEM_ROW, title: 'Unclassified free text qz7k' }]);
      if (titled.kind !== 'observed') throw new Error('unreachable');
      expect(Object.keys(titled.items[0] ?? {}).sort()).toEqual(['closedAt', 'createdAt', 'governedBy', 'id', 'issueType', 'priority', 'status', 'updatedAt']);
      expect(JSON.stringify(titled)).not.toContain('qz7k');
    });

    it('states the withheld title once on the observation, as excluded-content with its route', () => {
      const observed = observe([ITEM_ROW]);
      const empty = observe([]);
      if (observed.kind !== 'observed' || empty.kind !== 'observed') throw new Error('unreachable');
      expect(observed.titles).toEqual(WITHHELD);
      expect(empty.titles).toEqual(WITHHELD);
    });
  });

  it('exercises the real subprocess path against a repository with no Beads database', () => {
    const result = observeWorkItems({
      repoRoot: '/tmp',
      beadPrefix: 'bu',
      capturedAt: '2026-08-30T00:00:00Z',
    });
    expect(result.kind).toBe('unknown');
  });
});
