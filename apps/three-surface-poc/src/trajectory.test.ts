import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { BUTLERS_POC_SEEDS, buildPocModel, STATUS_TO_COLUMN, UNMARKED_RECORD_REASON, workerChangeVerificationId, type PocModel, type TestArtifactRecord } from '@syzygy/three-surface-poc-core';

import { renderTrajectoryPage } from './trajectory.js';
import { pocRoutes } from './routes.js';
import { buildFixtureModel, fixtureRepoWithGit, fixtureWorkItemRow } from './test-model-fixture.js';

function git(root: string, args: readonly string[]): string {
  return execFileSync('git', ['-C', root, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

function writeWorkerChangeSeam(root: string, sourceContents: string): void {
  for (const [path, contents] of [
    ['src/butlers/connectors/whatsapp_user_client.py', sourceContents],
    ['tests/connectors/test_whatsapp_user_client.py', 'def test_normalization(): pass\n'],
  ] as const) {
    const absolute = join(root, path);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, contents, 'utf8');
  }
}

const cleanups: string[] = [];
afterEach(() => {
  for (const directory of cleanups.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function cardBody(html: string, id: string): string {
  const match = new RegExp(`data-work-item-id="${id}">([\\s\\S]*?)</li>`).exec(html);
  if (match?.[1] === undefined) {
    throw new Error(`card not found: ${id}`);
  }
  return match[1];
}

describe('Trajectory', () => {
  it('places every rendered item in the column its declared status mapping assigns (POC-REQ-040)', () => {
    const model = buildFixtureModel(cleanups);
    const html = renderTrajectoryPage(model);
    if (model.trajectory.kind !== 'observed') throw new Error('unreachable');

    for (const item of model.trajectory.rendered) {
      const card = cardBody(html, item.id);
      const columnMatch = new RegExp(
        `<h2>${STATUS_TO_COLUMN[item.status]}[\\s\\S]*?</section>`,
      );
      // the card's own status text is the oracle-independent check: its
      // rendered status must equal the declared mapping's input status
      expect(card).toContain(`data-parity-field="work-item-status">${item.status}<`);
      expect(html).toMatch(columnMatch);
    }
  });

  it('serves the full machine population and reconciles the bounded board selection (POC-REQ-042)', async () => {
    const instant = '2026-08-01T00:00:00Z';
    const statuses = ['open', 'in_progress', 'blocked', 'deferred', 'pinned', 'hooked'];
    const rows = [
      ...Array.from({ length: 201 }, (_, i) => fixtureWorkItemRow(`bu-current-${String(i).padStart(3, '0')}`, statuses[i % 6]!, instant, instant, null)),
      ...Array.from({ length: 51 }, (_, i) => fixtureWorkItemRow(`bu-closed-${String(i).padStart(3, '0')}`, 'closed', instant, instant, instant)),
    ];
    const model = buildFixtureModel(cleanups, { workItemRows: rows });
    const html = renderTrajectoryPage(model);
    const machineRoute = pocRoutes(() => model).find((route) => route.path === '/api/poc')!;
    const response = await machineRoute.handle({ request: { method: 'GET', path: '/api/poc', query: new URLSearchParams(), headers: {} } });
    expect(response.status).toBe(200);
    const served = JSON.parse(response.body) as PocModel;
    if (served.workItems.kind !== 'observed' || served.trajectory.kind !== 'observed') throw new Error('unreachable');
    expect(served.workItems.items.map((item) => item.id)).toEqual(rows.map((row) => row.id));
    expect(served.workItems.items).toHaveLength(252);
    expect(served.trajectory).toMatchObject({ totalCount: 252, renderedCount: 250, excludedCount: 2 });
    const cardIds = [...html.matchAll(/data-work-item-id="([^"]+)"/g)].map((match) => match[1]);
    expect(cardIds).toHaveLength(250);
    expect(cardIds.sort()).toEqual(served.trajectory.rendered.map((item) => item.id).sort());
    expect(cardIds).not.toContain('bu-current-200');
    expect(cardIds).not.toContain('bu-closed-050');
    expect(served.trajectory.rendered.filter((item) => item.column === 'Done')).toHaveLength(50);
    expect(html).toContain('Rendering 250 of 252 observed work items (up to 200 most recently updated non-closed items, plus up to 50 most recently closed items; missing, invalid or timezone-less times last, timestamp ties and card order by ascending item id)');
    expect(html).toContain('data-parity-field="trajectory-excluded-count">2</span> items are outside this selection');
  });

  // SEC-5 (owner answer 2026-10-20, syzygy-jytt): a card is named by its
  // identifier and says its title is withheld; the board says why, once,
  // and the machine twin carries the same reason and route. Literals typed
  // here; the fixture rows carry titles (`fixture item <id>`) to prove none
  // is served.
  it('names every card by its identifier and discloses its withheld title (SEC-5)', () => {
    const model = buildFixtureModel(cleanups);
    const html = renderTrajectoryPage(model);
    if (model.trajectory.kind !== 'observed') throw new Error('unreachable');
    const route = 'Route: <span data-unknown-route="excluded-content" data-route-actor="owner" data-route-verb="decide" data-route-target="policy">Policy change by the owner, or accept the exclusion</span>.';
    const ids = model.trajectory.rendered.map((item) => item.id);
    expect(ids).toHaveLength(5);
    for (const id of ids) {
      const card = cardBody(html, id);
      expect(card).toContain(`<a class="wi-title" href="#workitem-${id}" data-parity-field="work-item-id">${id}</a>`);
      const marks = card.split('data-parity-field="work-item-title"').length - 1;
      expect(marks, id).toBe(1);
      expect(card).toContain(`<span class="epistemic epistemic-unknown" data-parity-field="work-item-title" data-unknown-disclosure="region:work-item-titles" data-unknown-reason="excluded-content">Title: withheld (SEC-5). ${route}</span>`);
    }
    const notice = /<p class="titles-withheld notice" data-parity-field="work-item-titles-withheld" data-unknown-disclosure="region:work-item-titles" data-unknown-reason="excluded-content">([\s\S]*?)<\/p>/.exec(html)?.[1] ?? '';
    const words = notice.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    expect(words).toBe('Titles: Unknown for every observed work item. Work-item titles are withheld under SEC-5: a title is free text, the only declared secret-classification policy covers declared-project-shape-text and none covers work-item titles, so the observation never reads them. Each item is named by its identifier. Reason: excluded-content. Route: Policy change by the owner, or accept the exclusion.');
    expect(html).not.toContain('fixture item');
    expect(model.unknownSubjects.find((subject) => subject.id === 'region:work-item-titles')?.epistemic).toEqual({
      label: 'Unknown',
      reason: 'Work-item titles are withheld under SEC-5: a title is free text, the only declared secret-classification policy covers declared-project-shape-text and none covers work-item titles, so the observation never reads them. Each item is named by its identifier.',
      closedReason: 'excluded-content',
      resolutionRoutes: [{ reason: 'excluded-content', route: 'Policy change by the owner, or accept the exclusion', actor: 'owner', verb: 'decide', target: 'policy' }],
    });
  });

  it('never renders closure/activity as verification satisfaction (POC-REQ-043)', () => {
    const model = buildFixtureModel(cleanups);
    const html = renderTrajectoryPage(model);
    const closedCard = cardBody(html, 'bu-closed-recent');
    expect(closedCard).toContain('data-parity-field="work-item-status">closed<');
    expect(closedCard).toContain('data-parity-field="work-item-verification"');
    expect(closedCard).toContain('Verification: Unknown');
    expect(closedCard).not.toMatch(/verified|satisfied/i);
  });

  it('renders the Unknown state distinctly from an empty-but-observed board (POC-REQ-013 rendering)', () => {
    const { repoRoot, revision } = fixtureRepoWithGit(cleanups);
    const unknownModel = buildPocModel({
      seeds: BUTLERS_POC_SEEDS,
      repoRoot,
      repositoryRevision: revision,
      observerRevision: revision,
      evaluation: { snapshot: 'butlers@unreachable', asOf: '2026-08-30T12:00:00Z' },
      runWorkItemQuery: () => {
        throw new Error('connection refused');
      },
    });
    expect(unknownModel.trajectory.kind).toBe('unknown');
    const unknownHtml = renderTrajectoryPage(unknownModel);
    expect(unknownHtml).toContain('data-unknown-disclosure="region:work-items"');
    expect(unknownHtml).not.toContain('class="board"');

    const emptyObservedModel = buildPocModel({
      seeds: BUTLERS_POC_SEEDS,
      repoRoot,
      repositoryRevision: revision,
      observerRevision: revision,
      evaluation: { snapshot: 'butlers@empty', asOf: '2026-08-30T12:00:00Z' },
      runWorkItemQuery: (_repoRoot, sql) =>
        sql.includes('WHERE id LIKE') ? JSON.stringify([]) : JSON.stringify([{ revision: 'dolt-empty' }]),
    });
    expect(emptyObservedModel.trajectory.kind).toBe('observed');
    const emptyHtml = renderTrajectoryPage(emptyObservedModel);
    expect(emptyHtml).toContain('class="board"');
    expect(emptyHtml).not.toContain('data-unknown-disclosure="region:work-items"');
    expect(emptyHtml).not.toBe(unknownHtml);

    // C3-4: the board's <section> columns are not listitems, so the
    // wrapper must not claim role="list" (invalid required-owned-elements
    // ARIA); role="group" keeps the accessible name valid.
    expect(emptyHtml).toContain('class="board" role="group"');
    expect(emptyHtml).not.toContain('role="list"');
  });

  it('renders the observed worker-change lifecycle state on the matching card, never as verified (AC3/AC4)', () => {
    const { repoRoot, revision } = fixtureRepoWithGit(cleanups);
    writeWorkerChangeSeam(repoRoot, 'x = 1\n');
    git(repoRoot, ['add', '-A']);
    git(repoRoot, ['commit', '-qm', 'fix(whatsapp): normalize single-event sender [bu-worker-change-1]']);
    const changedRevision = git(repoRoot, ['rev-parse', 'HEAD']);
    git(repoRoot, ['update-ref', 'refs/remotes/origin/main', changedRevision]);
    git(repoRoot, ['symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/main']);

    const materializationRecord = {
      beadId: 'bu-worker-change-1',
      externalRef: 'syzygy-poc:work:whatsapp-single-event-normalization',
      targetRepoRoot: repoRoot,
      createdAt: '2026-08-30T00:00:00Z',
      doltRevisionAtCreation: 'dolt-rev-1',
      attribution: 'test-actor',
    } as const;
    const rows = [
      {
        revision: 'dolt-rev-2',
        id: 'bu-worker-change-1',
        title: 'Materialized work item',
        status: 'in_progress',
        issue_type: 'task',
        priority: 2,
        created_at: '2026-08-30T00:00:00Z',
        updated_at: '2026-08-30T00:00:00Z',
        closed_at: null,
      },
    ];

    const model = buildPocModel({
      seeds: BUTLERS_POC_SEEDS,
      repoRoot,
      repositoryRevision: changedRevision,
      observerRevision: revision,
      evaluation: { snapshot: 'butlers@worker-change', asOf: '2026-08-30T12:00:00Z' },
      materializationRecord,
      runWorkItemQuery: (_repoRoot, sql) =>
        sql.includes('WHERE id LIKE') ? JSON.stringify(rows) : JSON.stringify([{ revision: 'dolt-rev-2' }]),
    });
    expect(model.workerChange.kind).toBe('observed');
    if (model.workerChange.kind !== 'observed') throw new Error('unreachable');
    expect(model.workerChange.state).toBe('changed-or-merged');

    const html = renderTrajectoryPage(model);
    const card = cardBody(html, 'bu-worker-change-1');
    expect(card).toContain('data-parity-field="worker-change-state"');
    expect(card).toContain('External worker: Changed / merged');
    expect(card).toContain('data-parity-field="worker-change-verification"');
    expect(card).toContain('Verification: Not verified');
    expect(card).not.toContain('Verification: Verified');
  });

  it.each(['REQ-alternate-governing-intent-007', 'REQ-alternate-governing-intent-008'] as const)(
    'renders a matching operator-reported run as report-fact and an unmarked record as Not verified, never Verified, for governing intent %s (AC3/AC4, syzygy-0r9, syzygy-4mbu)',
    (workerChangeIntentId) => {
    const { repoRoot, revision } = fixtureRepoWithGit(cleanups);
    writeWorkerChangeSeam(repoRoot, 'x = 1\n');
    git(repoRoot, ['add', '-A']);
    git(repoRoot, ['commit', '-qm', 'fix(whatsapp): normalize single-event sender [bu-verified-1]']);
    const changedRevision = git(repoRoot, ['rev-parse', 'HEAD']);
    const changedCommitAuthoredAt = git(repoRoot, ['log', '-1', '--format=%aI', changedRevision]);
    git(repoRoot, ['update-ref', 'refs/remotes/origin/main', changedRevision]);
    git(repoRoot, ['symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/main']);

    const materializationRecord = {
      beadId: 'bu-verified-1',
      externalRef: 'syzygy-poc:work:whatsapp-single-event-normalization',
      targetRepoRoot: repoRoot,
      createdAt: '2026-08-30T00:00:00Z',
      doltRevisionAtCreation: 'dolt-rev-1',
      attribution: 'test-actor',
    } as const;
    const rows = [
      {
        revision: 'dolt-rev-2',
        id: 'bu-verified-1',
        title: 'Materialized work item',
        status: 'in_progress',
        issue_type: 'task',
        priority: 2,
        created_at: '2026-08-30T00:00:00Z',
        updated_at: '2026-08-30T00:00:00Z',
        closed_at: null,
      },
    ];
    const capturedAt = new Date(Date.parse(changedCommitAuthoredAt) + 60 * 60 * 1000).toISOString();
    const evaluationAsOf = new Date(Date.parse(capturedAt) + 60 * 60 * 1000).toISOString();
    const alternateSeeds = {
      ...BUTLERS_POC_SEEDS,
      project: { ...BUTLERS_POC_SEEDS.project, displayName: 'Alternate project' },
      workerChangeIntentId,
    } as const;

    const passing = {
      command: ['python3', '-m', 'pytest', 'tests/connectors/test_whatsapp_user_client.py', '-q'],
      exitCode: 0,
      repositoryCommit: changedRevision,
      scope: 'tests/connectors/test_whatsapp_user_client.py',
      digest: 'sha256:' + '2'.repeat(64),
      summary: '4 passed, 0 failed, 0 errored, 0 skipped in 0.5s',
    };
    const reported: TestArtifactRecord = { ...passing, provenance: 'operator-reported', ingestedAt: capturedAt };
    const build = (seeds: typeof BUTLERS_POC_SEEDS, testArtifactRecord: TestArtifactRecord = reported) => buildPocModel({
      seeds,
      repoRoot,
      repositoryRevision: changedRevision,
      observerRevision: revision,
      evaluation: { snapshot: 'butlers@verified', asOf: evaluationAsOf },
      materializationRecord,
      runWorkItemQuery: (_repoRoot, sql) =>
        sql.includes('WHERE id LIKE') ? JSON.stringify(rows) : JSON.stringify([{ revision: 'dolt-rev-2' }]),
      testArtifactRecord,
    });
    // Round-2 note 2: a passing, binding record with no provenance (the
    // retired spawning capture's shape, or a hand-written file) fails closed.
    const unmarkedModel = build(alternateSeeds, { ...passing, capturedAt });
    expect(unmarkedModel.testArtifactVerification).toEqual({ kind: 'unknown', reason: UNMARKED_RECORD_REASON });
    const unmarkedCard = cardBody(renderTrajectoryPage(unmarkedModel), 'bu-verified-1');
    expect(unmarkedCard).toContain('Verification: Not verified.');
    expect(unmarkedCard).not.toContain('Verification: Verified');
    expect(unmarkedCard).not.toContain('4 passed, 0 failed, 0 errored, 0 skipped in 0.5s');
    expect(unmarkedModel.unknownSubjects.find((subject) => subject.id === workerChangeVerificationId('bu-verified-1'))?.epistemic.label).toBe('Unknown');

    // Built, not spread: the verification Unknown and its route are model
    // facts under the disclosure's id (M4 slice 1).
    const missingIdentityModel = build({ ...alternateSeeds, workerChangeIntentId: '' });
    expect(missingIdentityModel.governingIntentId).toBeNull();
    const missingIdentityHtml = renderTrajectoryPage(missingIdentityModel);
    const missingIdentityCard = cardBody(missingIdentityHtml, 'bu-verified-1');
    expect(missingIdentityCard).toContain('Verification: Unknown — governing intent identity unavailable');
    expect(missingIdentityCard).not.toContain('Verification: Verified');
    expect(missingIdentityCard).not.toContain(BUTLERS_POC_SEEDS.workerChangeIntentId);

    // Round-1 finding 1: the same passing run, reported by the operator,
    // caps at report-fact (RFC5-19). It renders with the declared Unknown
    // encoding and its disclosure, never Observed and never "Verified".
    const reportedModel = build(alternateSeeds);
    expect(reportedModel.testArtifactVerification.kind).toBe('reported');
    const reportedSubject = reportedModel.unknownSubjects.find((subject) => subject.id === workerChangeVerificationId('bu-verified-1'));
    expect(reportedSubject?.epistemic.label).toBe('Unknown');
    // Round-2 note 4: present but not believed, because the run that would
    // count (one Syzygy launches under a profile) does not launch (RFC5-18).
    expect(reportedSubject?.epistemic.closedReason).toBe('execution-blocked');
    const reportedCard = cardBody(renderTrajectoryPage(reportedModel), 'bu-verified-1');
    const badge = /<span class="epistemic [^"]*" data-parity-field="worker-change-verification"[^>]*>/.exec(reportedCard)?.[0] ?? '';
    expect(badge).toContain('class="epistemic epistemic-unknown"');
    // #383 round 3, note 4: report-fact is a tier of Observed (RFC2-25), so
    // the Unknown element never carries it as its own tier.
    expect(badge).not.toContain('data-evidence-tier');
    expect(reportedCard).not.toContain('data-evidence-tier');
    expect(reportedCard).toContain('Verification: Not verified by Syzygy — operator-reported (report-fact): 4 passed, 0 failed, 0 errored, 0 skipped in 0.5s.');
    expect(reportedCard).toContain('That the tests ran, at this commit, on a clean working tree, with exit status 0, is the operator&#39;s report');
    expect(reportedCard).not.toContain('Verification: Verified');
    expect(reportedCard).not.toContain('epistemic-observed" data-parity-field="worker-change-verification"');
    },
  );

  it('calls out and highlights the demonstrated item, and separates Bead status from worker-change state (PRF-2, PRF-3)', () => {
    const { repoRoot, revision } = fixtureRepoWithGit(cleanups);
    writeWorkerChangeSeam(repoRoot, 'x = 1\n');
    git(repoRoot, ['add', '-A']);
    git(repoRoot, ['commit', '-qm', 'fix(whatsapp): normalize single-event sender [bu-demo-1]']);
    const changedRevision = git(repoRoot, ['rev-parse', 'HEAD']);
    git(repoRoot, ['update-ref', 'refs/remotes/origin/main', changedRevision]);
    git(repoRoot, ['symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/main']);

    const rows = [
      {
        revision: 'dolt-rev-2',
        id: 'bu-demo-1',
        title: 'Materialized work item',
        status: 'in_progress',
        issue_type: 'task',
        priority: 2,
        created_at: '2026-08-30T00:00:00Z',
        updated_at: '2026-08-30T00:00:00Z',
        closed_at: null,
      },
      {
        revision: 'dolt-rev-2',
        id: 'bu-unrelated-1',
        title: 'Unrelated backlog item',
        status: 'open',
        issue_type: 'task',
        priority: 3,
        created_at: '2026-08-30T00:00:00Z',
        updated_at: '2026-08-30T00:00:00Z',
        closed_at: null,
      },
    ];
    const model = buildPocModel({
      seeds: BUTLERS_POC_SEEDS,
      repoRoot,
      repositoryRevision: changedRevision,
      observerRevision: revision,
      evaluation: { snapshot: 'butlers@demo', asOf: '2026-08-30T12:00:00Z' },
      materializationRecord: {
        beadId: 'bu-demo-1',
        externalRef: 'syzygy-poc:work:whatsapp-single-event-normalization',
        targetRepoRoot: repoRoot,
        createdAt: '2026-08-30T00:00:00Z',
        doltRevisionAtCreation: 'dolt-rev-1',
        attribution: 'test-actor',
        origin: 'created',
      },
      runWorkItemQuery: (_repoRoot, sql) =>
        sql.includes('WHERE id LIKE') ? JSON.stringify(rows) : JSON.stringify([{ revision: 'dolt-rev-2' }]),
    });
    const html = renderTrajectoryPage(model);

    // PRF-3: intro line names and links the demonstrated item; only its
    // card is highlighted and badged
    expect(html).toContain('The demonstrated item is <a href="#workitem-bu-demo-1">');
    const demoCard = cardBody(html, 'bu-demo-1');
    const unrelatedCard = cardBody(html, 'bu-unrelated-1');
    expect(demoCard).toContain('Demonstrated item');
    expect(html).toMatch(/wi-card wi-card-demonstrated" id="workitem-bu-demo-1"/);
    expect(unrelatedCard).not.toContain('Demonstrated item');
    expect(html).not.toMatch(/wi-card-demonstrated" id="workitem-bu-unrelated-1"/);

    // PRF-2: the dual-badge card states the two fields are independent
    expect(demoCard).toContain('Independent of the Bead status above');
    expect(unrelatedCard).not.toContain('Independent of the Bead status above');

    // N-2: the demonstrated id comes from the typed model field
    expect(model.materializedBeadId).toBe('bu-demo-1');

    // N-3: the external-worker label carries its own class, visually
    // distinct from the Bead-status field
    expect(demoCard).toContain('class="worker-change-label">External worker:');
    expect(demoCard).not.toContain('class="wi-status">External worker:');

    // no demonstrated item: neither callout variant renders
    const noneModel = buildPocModel({
      seeds: BUTLERS_POC_SEEDS,
      repoRoot,
      repositoryRevision: changedRevision,
      observerRevision: revision,
      evaluation: { snapshot: 'butlers@demo-none', asOf: '2026-08-30T12:00:00Z' },
      runWorkItemQuery: (_repoRoot, sql) =>
        sql.includes('WHERE id LIKE') ? JSON.stringify(rows) : JSON.stringify([{ revision: 'dolt-rev-2' }]),
    });
    const noneHtml = renderTrajectoryPage(noneModel);
    expect(noneHtml).not.toContain('class="demo-callout');
    expect(noneHtml).not.toContain('Demonstrated item');
  });

  it.each(['closed', 'open'] as const)('discloses a demonstrated %s item excluded by its population limit (N-1)', (status) => {
    const { repoRoot, revision } = fixtureRepoWithGit(cleanups);
    const old = '2026-01-01T00:00:00Z';
    const newer = '2026-08-01T00:00:00Z';
    const rows = [
      fixtureWorkItemRow('bu-excluded-demo', status, old, old, status === 'closed' ? old : null),
      ...Array.from({ length: status === 'closed' ? 50 : 200 }, (_, i) =>
        fixtureWorkItemRow(`bu-newer-${String(i).padStart(3, '0')}`, status, newer, newer, status === 'closed' ? newer : null)),
    ];
    const model = buildPocModel({
      seeds: BUTLERS_POC_SEEDS,
      repoRoot,
      repositoryRevision: revision,
      observerRevision: revision,
      evaluation: { snapshot: 'butlers@excluded', asOf: '2026-08-30T12:00:00Z' },
      materializationRecord: {
        beadId: 'bu-excluded-demo',
        externalRef: 'syzygy-poc:work:whatsapp-single-event-normalization',
        targetRepoRoot: repoRoot,
        createdAt: old,
        doltRevisionAtCreation: 'dolt-rev-1',
        attribution: 'test-actor',
        origin: 'created',
      },
      runWorkItemQuery: () => JSON.stringify(rows),
    });
    expect(model.materializedBeadId).toBe('bu-excluded-demo');
    if (model.trajectory.kind !== 'observed') throw new Error('unreachable');
    expect(model.trajectory.rendered.some((item) => item.id === 'bu-excluded-demo')).toBe(false);
    const html = renderTrajectoryPage(model);
    expect(html).toContain(
      'The demonstrated item <code>bu-excluded-demo</code> was materialized by this POC but falls outside the current board selection',
    );
    expect(html).not.toContain('data-work-item-id="bu-excluded-demo"');
    expect(html).not.toContain('The demonstrated item is <a');
  });

  describe('footer: composite evaluation identity and substrate revision (N4)', () => {
    it('prints the same composite evaluation identity Polaris renders, plus what this surface\'s revision is a revision of', () => {
      const model = buildFixtureModel(cleanups);
      if (model.trajectory.kind !== 'observed') throw new Error('unreachable');
      const html = renderTrajectoryPage(model);

      // The identity is Polaris's own line — model.evaluation.snapshot / asOf
      // — never a value this renderer computes independently.
      expect(html).toContain(`Evaluation <code>${model.evaluation.snapshot}</code>`);
      expect(html).toContain(`as of <code>${model.evaluation.asOf}</code>`);
      expect(html).toContain(
        `<code data-parity-field="surface-substrate-revision">${model.trajectory.doltRevision}</code>`,
      );
      expect(html).toContain('is a revision of the observed Beads work-item database (Dolt)');
      // No skew in the default fixture (workItems.capturedAt === evaluation.asOf).
      expect(html).not.toContain('data-parity-field="evaluation-skew"');
    });

    it('renders an explicit Skew line when the work-item capture instant answers at a different evaluation (mutation check)', () => {
      const model = buildFixtureModel(cleanups);
      if (model.workItems.kind !== 'observed') throw new Error('unreachable');
      const skewed = {
        ...model,
        workItems: { ...model.workItems, capturedAt: '2020-01-01T00:00:00Z' },
      };
      const html = renderTrajectoryPage(skewed);
      expect(html).toContain('<strong data-parity-field="evaluation-skew">Skew</strong>');
      expect(html).toContain('this surface&#39;s work-item capture instant');
      expect(html).toContain('<code>2020-01-01T00:00:00Z</code>');
      expect(html).toContain(`not <code>${model.evaluation.asOf}</code>`);
    });

    it('names the substrate Unknown, never a fabricated revision, when trajectory is unobserved', () => {
      const { repoRoot, revision } = fixtureRepoWithGit(cleanups);
      const model = buildPocModel({
        seeds: BUTLERS_POC_SEEDS,
        repoRoot,
        repositoryRevision: revision,
        observerRevision: revision,
        evaluation: { snapshot: 'butlers@unreachable', asOf: '2026-08-30T12:00:00Z' },
        runWorkItemQuery: () => {
          throw new Error('connection refused');
        },
      });
      const html = renderTrajectoryPage(model);
      expect(html).toContain('Unknown — this surface has no observed substrate revision to name.');
      expect(html).not.toContain('data-parity-field="surface-substrate-revision"');
    });
  });
});
