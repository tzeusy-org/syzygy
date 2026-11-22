import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

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
    expect(served.trajectory.rendered.filter((item) => item.column === 'Closed')).toHaveLength(50);
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
      // syzygy-t3jk.15: the card's mark refers to the board's one disclosure
      // and carries no route of its own.
      expect(card).toContain('<span class="epistemic epistemic-unknown" data-parity-field="work-item-title" data-unknown-ref="region:work-item-titles" data-unknown-reason="excluded-content">Title: withheld (SEC-5) <a class="mark-ref" href="#n-titles" aria-describedby="n-titles">reason and route</a></span>');
      expect(card).not.toContain(route);
    }
    expect(html.split(route).length - 1).toBe(1);
    const notice = /<p class="titles-withheld notice" id="n-titles" data-parity-field="work-item-titles-withheld" data-unknown-disclosure="region:work-item-titles" data-unknown-reason="excluded-content">([\s\S]*?)<\/p>/.exec(html)?.[1] ?? '';
    const words = notice.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    expect(words).toBe('Titles: Unknown for 5 of 5 observed work items (every one). Work-item titles are withheld under SEC-5: a title is free text, the only declared secret-classification policy covers declared-project-shape-text and none covers work-item titles, so the observation never reads them. Each item is named by its identifier. Reason: excluded-content. Route: Policy change by the owner, or accept the exclusion.');
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

    // T3 (POC-REQ-044): the merged materialized item is the reconciliation
    // chain's one member; the Unknown-provenance count is unchanged from the
    // same rows with nothing materialized.
    const unmaterialized = buildPocModel({
      seeds: BUTLERS_POC_SEEDS,
      repoRoot,
      repositoryRevision: changedRevision,
      observerRevision: revision,
      evaluation: { snapshot: 'butlers@worker-change', asOf: '2026-08-30T12:00:00Z' },
      runWorkItemQuery: (_repoRoot, sql) =>
        sql.includes('WHERE id LIKE') ? JSON.stringify(rows) : JSON.stringify([{ revision: 'dolt-rev-2' }]),
    });
    const intentOf = (m: PocModel) => m.trajectory.answers.find((answer) => answer.id === 'intent');
    expect(intentOf(model)).toMatchObject({ unknownProvenance: { count: 1, served: 1 }, reconciliationChain: { members: 1, materialized: 1 } });
    expect(intentOf(unmaterialized)).toMatchObject({ unknownProvenance: { count: 1, served: 1 }, reconciliationChain: { members: 0, materialized: 0 } });
    expect(/data-parity-field="answer-intent-chain-members">(\d+)</.exec(renderTrajectoryPage(model))?.[1]).toBe('1');
    expect(/data-parity-field="answer-intent-unknown-provenance">(\d+)</.exec(renderTrajectoryPage(model))?.[1]).toBe('1');

    const html = renderTrajectoryPage(model);
    const card = cardBody(html, 'bu-worker-change-1');
    expect(card).toContain('data-parity-field="worker-change-state"');
    expect(card).toContain('External worker: Commit on the default branch');

    // T1 (review R-T1-CLOSURE-WORDING-1 finding 1): each observed state's
    // label, rendered on the same card, says what git showed and passes the
    // closure-wording sweep with its worker-label arm non-empty.
    const observed = model.workerChange;
    for (const [state, label] of [
      ['planned', 'No commit observed'],
      ['active', 'Commit observed, not on the default branch'],
      ['changed-or-merged', 'Commit on the default branch'],
    ] as const) {
      const variant = { ...model, workerChange: { ...observed, state } } as PocModel;
      const variantHtml = renderTrajectoryPage(variant);
      expect(cardBody(variantHtml, 'bu-worker-change-1')).toContain(`<span class="worker-change-label">External worker: ${label}</span>`);
      const labels = [...variantHtml.matchAll(/<span class="worker-change-label">([\s\S]*?)<\/span>/g)];
      expect(labels).toHaveLength(1);
      expect(closureWordingPopulation(variantHtml, variant).filter((text) => CLOSURE_AS_COMPLETION.test(text))).toEqual([]);
    }
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

  it('never produces an observed item count on the Unknown projection, over every seed and work-item read (syzygy-j67q)', () => {
    const { repoRoot, revision } = fixtureRepoWithGit(cleanups);
    const reads: Record<string, (root: string, sql: string) => string> = {
      throws: () => {
        throw new Error('refused');
      },
      junk: () => 'not json',
      empty: (_root, sql) => (sql.includes('WHERE id LIKE') ? '[]' : JSON.stringify([{ revision: 'dolt-empty' }])),
      rows: (_root, sql) =>
        sql.includes('WHERE id LIKE') ? JSON.stringify([fixtureWorkItemRow('bu-open1', 'open', '2026-08-01T00:00:00Z', '2026-08-02T00:00:00Z', null)]) : JSON.stringify([{ revision: 'dolt-rows' }]),
    };
    const seedSets = { butlers: BUTLERS_POC_SEEDS, badPrefix: { ...BUTLERS_POC_SEEDS, beadPrefix: 'Bad Prefix!' } };
    const kinds = new Set<string>();
    for (const seeds of Object.values(seedSets)) {
      for (const run of Object.values(reads)) {
        const model = buildPocModel({
          seeds,
          repoRoot,
          repositoryRevision: revision,
          observerRevision: revision,
          evaluation: { snapshot: 'butlers@matrix', asOf: '2026-08-30T12:00:00Z' },
          runWorkItemQuery: run,
        });
        kinds.add(model.trajectory.kind);
        if (model.trajectory.kind === 'unknown') {
          expect(Object.keys(model.trajectory).sort()).toEqual(['answers', 'kind', 'reason']);
          // POC-REQ-044: all five answers still render, each Unknown under
          // the work-items disclosure, and none carries a count.
          expect(model.trajectory.answers).toEqual(['remains', 'running', 'changed', 'cost', 'intent'].map((id) => ({ id, state: 'unknown', disclosure: 'region:work-items' })));
          expect(renderTrajectoryPage(model).match(/data-parity-field="trajectory-answer" data-answer-id="[a-z]+"/g)).toHaveLength(5);
          expect(renderTrajectoryPage(model)).toContain(
            'Independently observed work-item denominator: Unknown (work items were not independently observed).',
          );
        } else {
          expect(Object.keys(model.trajectory)).not.toContain('observedItemCount');
        }
      }
    }
    expect([...kinds].sort()).toEqual(['observed', 'unknown']);
  });
});

// T1 (syzygy-t3jk.14; RFC8-2(b), RFC8-15, RFC8-30; POC-REQ-043 wording limb):
// no heading, count label, worker-row label or notice on the page, and no
// column value on the machine answer, presents tracker closure as completion
// or a tracker claim as observed activity.
//
// Population (stated, and printed): the page h1 and lede; the text of every
// h2 and every aria-label inside `.board`; every `.worker-change-label`; every
// `.notice` in the Trajectory body; and, on the machine answer, every
// `trajectory.rendered[].column` and every STATUS_TO_COLUMN value. The card's
// own `work-item-status` text and `workerChange.state` are outside the
// population by rule: they are the tracker's and the observer's identifiers.
// Predicate: case-folded, word-bounded, exactly this regex.
const CLOSURE_AS_COMPLETION = /\b(?:done|complete|completed|finished|resolved|satisfied|in[ _-]progress|active)\b/i;

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function closureWordingPopulation(html: string, served: PocModel): string[] {
  const texts: string[] = [];
  const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html);
  if (h1?.[1] === undefined) throw new Error('page h1 missing');
  texts.push(stripTags(h1[1]));
  const lede = /<p class="lede"[^>]*>([\s\S]*?)<\/p>/.exec(html);
  if (lede?.[1] === undefined) throw new Error('page lede missing');
  texts.push(stripTags(lede[1]));
  const boardStart = html.indexOf('<div class="board"');
  if (boardStart < 0) throw new Error('board missing');
  const board = html.slice(boardStart);
  for (const m of board.matchAll(/<h2>([\s\S]*?)<\/h2>/g)) texts.push(stripTags(m[1]!));
  for (const m of board.matchAll(/aria-label="([^"]*)"/g)) texts.push(m[1]!);
  for (const m of html.matchAll(/<span class="worker-change-label">([\s\S]*?)<\/span>/g)) texts.push(stripTags(m[1]!));
  for (const m of html.matchAll(/<p class="[^"]*\bnotice\b[^"]*"[^>]*>([\s\S]*?)<\/p>/g)) texts.push(stripTags(m[1]!));
  if (served.trajectory.kind !== 'observed') throw new Error('unreachable');
  for (const item of served.trajectory.rendered) texts.push(item.column);
  texts.push(...Object.values(STATUS_TO_COLUMN));
  return texts;
}

async function servedAnswer(model: PocModel): Promise<PocModel> {
  const machineRoute = pocRoutes(() => model).find((route) => route.path === '/api/poc')!;
  const response = await machineRoute.handle({ request: { method: 'GET', path: '/api/poc', query: new URLSearchParams(), headers: {} } });
  expect(response.status).toBe(200);
  return JSON.parse(response.body) as PocModel;
}

function closureRows() {
  const instant = '2026-08-01T00:00:00Z';
  const statuses = ['open', 'in_progress', 'blocked', 'deferred', 'pinned', 'hooked'];
  return [
    ...Array.from({ length: 201 }, (_, i) => fixtureWorkItemRow(`bu-current-${String(i).padStart(3, '0')}`, statuses[i % 6]!, instant, instant, null)),
    ...Array.from({ length: 51 }, (_, i) => fixtureWorkItemRow(`bu-closed-${String(i).padStart(3, '0')}`, 'closed', instant, instant, instant)),
  ];
}

describe('Trajectory closure wording (T1)', () => {
  it.each([
    ['default fixture', undefined],
    ['252-row fixture', 'rows'],
  ] as const)('finds no completion word over the stated population on the %s', async (_name, which) => {
    const model = buildFixtureModel(cleanups, which === 'rows' ? { workItemRows: closureRows() } : undefined);
    const html = renderTrajectoryPage(model);
    const served = await servedAnswer(model);
    const population = closureWordingPopulation(html, served);
    console.info(`T1 closure-wording sweep (${_name}): population ${population.length} texts`);
    expect(population.length).toBeGreaterThan(Object.keys(STATUS_TO_COLUMN).length);
    expect(population.filter((text) => CLOSURE_AS_COMPLETION.test(text))).toEqual([]);

    // Rule 6: 'Done' restored on the page, and on the answer, each fails.
    const mutatedPage = html.replace('<h2>Closed ', '<h2>Done ');
    expect(mutatedPage).not.toBe(html);
    expect(closureWordingPopulation(mutatedPage, served).some((text) => CLOSURE_AS_COMPLETION.test(text))).toBe(true);
    if (served.trajectory.kind !== 'observed') throw new Error('unreachable');
    const closedIndex = served.trajectory.rendered.findIndex((item) => item.column === 'Closed');
    if (which === 'rows') expect(closedIndex).toBeGreaterThanOrEqual(0);
    if (closedIndex >= 0) {
      const mutatedAnswer = structuredClone(served) as PocModel & { trajectory: { rendered: { column: string }[] } };
      mutatedAnswer.trajectory.rendered[closedIndex]!.column = 'Done';
      expect(closureWordingPopulation(html, mutatedAnswer).some((text) => CLOSURE_AS_COMPLETION.test(text))).toBe(true);
    }
  });

  it('heads the closed and claimed columns Closed and Claimed, page and answer alike', async () => {
    const model = buildFixtureModel(cleanups, { workItemRows: closureRows() });
    const html = renderTrajectoryPage(model);
    const served = await servedAnswer(model);
    if (served.trajectory.kind !== 'observed') throw new Error('unreachable');
    expect(html).toContain('<h2>Closed <span class="count">(50)</span></h2>');
    expect(html).toMatch(/<h2>Claimed <span class="count">\(\d+\)<\/span><\/h2>/);
    expect(new Set(served.trajectory.rendered.filter((item) => item.status === 'closed').map((item) => item.column))).toEqual(new Set(['Closed']));
    expect(new Set(served.trajectory.rendered.filter((item) => item.status === 'in_progress').map((item) => item.column))).toEqual(new Set(['Claimed']));
  });

  it('states once, above the board, how many rendered items are closed and that their verification is Unknown', async () => {
    const model = buildFixtureModel(cleanups, { workItemRows: closureRows() });
    const html = renderTrajectoryPage(model);
    const served = await servedAnswer(model);
    if (served.trajectory.kind !== 'observed') throw new Error('unreachable');
    const closed = served.trajectory.rendered.filter((item) => item.status === 'closed');
    const unverified = closed.filter((item) => item.verification === 'unknown').length;
    expect(closed).toHaveLength(50);
    expect(html.match(/data-parity-field="trajectory-closure-notice"/g)).toHaveLength(1);
    expect(html.indexOf('trajectory-closure-notice')).toBeLessThan(html.indexOf('<div class="board"'));
    expect(html).toContain(`data-parity-field="trajectory-closed-count">${closed.length}</span> of these items are closed in the tracker. Closed is the tracker's word, not a verification`);
    expect(html).toContain(`data-parity-field="trajectory-closed-unverified-count">${unverified}</span> of them, because no test or merge evidence is ingested for a work item`);
  });
});


// T2 (syzygy-t3jk.15; RFC2-24 aggregation, POC-REQ-014, POC-REQ-040,
// POC-REQ-043): each Unknown a card marks is stated once per board, with
// its count, reason and route; the card carries a short mark per Unknown
// and its own facts as text. Literals typed here.
describe('Trajectory board-level Unknowns and card facts (T2)', () => {
  // Each route occurs once per board disclosure carrying its reason:
  // excluded-content (titles); source-uncaptured-or-unreachable (governing
  // intent, and the changed, cost and orphaned-work answer parts,
  // syzygy-t3jk.16); missing-evidence (verification). The running
  // answer's liveness is the state-local activity-undetermined (RFC8-16),
  // which carries no reason and so no route.
  const ROUTE_COUNTS: readonly (readonly [string, number])[] = [
    ['Route: <span data-unknown-route="excluded-content" data-route-actor="owner" data-route-verb="decide" data-route-target="policy">Policy change by the owner, or accept the exclusion</span>.', 1],
    ['Route: <span data-unknown-route="source-uncaptured-or-unreachable" data-route-actor="operator" data-route-verb="repair" data-route-target="evaluation">Repair the observer/source; new snapshot</span>.', 4],
    ['Route: <span data-unknown-route="missing-evidence" data-route-actor="operator" data-route-verb="capture" data-route-target="evaluation">Produce or capture evidence</span>.', 1],
  ];
  const ROUTES = ROUTE_COUNTS.map(([literal]) => literal);
  const BASES = [
    'Work-item titles are withheld under SEC-5',
    'Activity is not verification: no test evidence has been ingested for any work item.',
    'No governing intent was captured for any work item: the observation reads no link from an item to the intent that warrants it, and none is taken from its title.',
  ];

  it('states each route and basis sentence once on the 252-row board, never on a card', () => {
    const model = buildFixtureModel(cleanups, { workItemRows: closureRows() });
    const html = renderTrajectoryPage(model);
    if (model.trajectory.kind !== 'observed') throw new Error('unreachable');
    const cards = [...html.matchAll(/<li class="wi-card[^"]*"[^>]*>([\s\S]*?)<\/li>/g)].map((m) => m[1]!);
    expect(cards).toHaveLength(250);
    for (const [literal, count] of [...ROUTE_COUNTS, ...BASES.map((basis) => [basis, 1] as const)]) {
      expect(html.split(literal).length - 1, literal).toBe(count);
      expect(cards.filter((card) => card.includes(literal)), literal).toEqual([]);
    }
    for (const card of cards) {
      for (const field of ['work-item-title', 'work-item-governed-by', 'work-item-verification']) {
        expect(card.split(`data-parity-field="${field}"`).length - 1, field).toBe(1);
      }
      expect(card).not.toContain('data-unknown-disclosure=');
      expect(card).not.toContain('Route:');
    }
  });

  it('states the verification Unknown once, with served, inside and outside counts equal to the machine answer', async () => {
    const model = buildFixtureModel(cleanups, { workItemRows: closureRows() });
    const html = renderTrajectoryPage(model);
    const served = await servedAnswer(model);
    if (served.trajectory.kind !== 'observed' || served.workItems.kind !== 'observed') throw new Error('unreachable');
    expect(served.trajectory.verificationUnknown).toEqual({ served: 252, inside: 250, outside: 2 });
    expect(served.workItems.items).toHaveLength(252);
    const notice = /<p class="verification-count notice" id="n-verification" data-parity-field="work-item-verification-count" data-unknown-disclosure="region:work-item-verification" data-unknown-reason="missing-evidence">([\s\S]*?)<\/p>/.exec(html)?.[1] ?? '';
    expect(notice).toContain('data-parity-field="verification-unknown-count">252</span> of 252 observed work items');
    expect(notice).toContain('data-parity-field="verification-unknown-inside">250</span> are in this selection');
    expect(notice).toContain('data-parity-field="verification-unknown-outside">2</span> are outside it');
    const words = notice.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
    expect(words).toContain('Reason: missing-evidence. Route: Produce or capture evidence.');
    expect(served.unknownSubjects.find((subject) => subject.id === 'region:work-item-verification')?.epistemic.closedReason).toBe('missing-evidence');
    expect(served.unknownSubjects.filter((subject) => subject.id.startsWith('work-item:'))).toEqual([]);
  });

  it('shows each card\'s priority and recorded instants as text, equal to the machine answer', async () => {
    const instant = (day: number): string => `2026-08-${String(day).padStart(2, '0')}T09:30:00Z`;
    const rows = [
      { ...fixtureWorkItemRow('bu-facts-open', 'open', instant(1), instant(2), null), priority: 0 },
      { ...fixtureWorkItemRow('bu-facts-closed', 'closed', instant(3), instant(4), instant(5)), priority: 3 },
    ];
    const model = buildFixtureModel(cleanups, { workItemRows: rows });
    const html = renderTrajectoryPage(model);
    const served = await servedAnswer(model);
    if (served.trajectory.kind !== 'observed') throw new Error('unreachable');
    expect(served.trajectory.rendered.map((item) => [item.id, item.priority])).toEqual([['bu-facts-closed', 3], ['bu-facts-open', 0]]);
    for (const item of served.trajectory.rendered) {
      const card = cardBody(html, item.id);
      expect(card).toContain(`data-parity-field="work-item-priority">${item.priority}</span>`);
      expect(card).toContain(`<time data-parity-field="work-item-created" datetime="${item.createdAt}">${item.createdAt}</time>`);
      expect(card).toContain(`<time data-parity-field="work-item-updated" datetime="${item.updatedAt}">${item.updatedAt}</time>`);
      if (item.closedAt === null) expect(card).not.toContain('work-item-closed');
      else expect(card).toContain(`<time data-parity-field="work-item-closed" datetime="${item.closedAt}">${item.closedAt}</time>`);
    }
    expect(cardBody(html, 'bu-facts-closed')).toContain('2026-08-05T09:30:00Z');
  });
});

/** The answers region and one answer's `<dd>` body. */
function answersRegion(html: string): string {
  return /<section class="answers"[^>]*>([\s\S]*?)<\/section>/.exec(html)?.[1] ?? '';
}
function answerBody(html: string, id: string): string {
  return new RegExp(`data-answer-id="${id}"><dt>[^<]*</dt><dd>([\\s\\S]*?)</dd></div>`).exec(answersRegion(html))?.[1] ?? '';
}

describe('Trajectory opens with its five answers (T3, POC-REQ-044)', () => {
  const QUESTIONS = ['What remains?', 'What is running?', 'What changed?', 'What did it cost?', 'Has the result been verified against intent?'];

  it('renders the five answers first, in order, with the machine answer carrying the same five', async () => {
    const model = buildFixtureModel(cleanups, { workItemRows: closureRows() });
    const html = renderTrajectoryPage(model);
    const served = await servedAnswer(model);
    if (served.trajectory.kind !== 'observed') throw new Error('unreachable');
    expect([...answersRegion(html).matchAll(/<dt>([^<]*)<\/dt>/g)].map((m) => m[1])).toEqual(QUESTIONS);
    expect(served.trajectory.answers.map((answer) => answer.id)).toEqual(['remains', 'running', 'changed', 'cost', 'intent']);
    const order = ['class="answers"', 'data-parity-field="trajectory-scope"', 'data-parity-field="trajectory-closure-notice"', 'class="board"'].map((marker) => html.indexOf(marker));
    expect(order.every((position) => position >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    const main = html.slice(html.indexOf('<main'));
    expect(main.indexOf('class="answers"')).toBeLessThan(main.indexOf('class="notice') === -1 ? Infinity : main.indexOf('class="notice'));
  });

  it('counts what remains over every served item: the statuses sum to the total and differ from the rendered columns', async () => {
    const model = buildFixtureModel(cleanups, { workItemRows: closureRows() });
    const html = renderTrajectoryPage(model);
    const served = await servedAnswer(model);
    const remains = served.trajectory.answers[0]!;
    // 201 current items cycle over six statuses (34, 34, 34, 33, 33, 33) and 51 are closed.
    expect(remains).toEqual({ id: 'remains', state: 'observed', served: 252, byStatus: { open: 34, in_progress: 34, blocked: 34, deferred: 33, pinned: 33, hooked: 33, closed: 51 } });
    const body = answerBody(html, 'remains');
    const counts = Object.fromEntries([...body.matchAll(/data-parity-field="answer-remains-([a-z_]+)">(\d+)</g)].map((m) => [m[1], Number(m[2])]));
    expect(counts).toEqual({ served: 252, open: 34, in_progress: 34, blocked: 34, deferred: 33, pinned: 33, hooked: 33, closed: 51 });
    expect(34 + 34 + 34 + 33 + 33 + 33 + 51).toBe(252);
    // The board renders 250: its Closed column holds 50, the answer 51.
    expect(/<h2>Closed <span class="count">\((\d+)\)<\/span>/.exec(html)?.[1]).toBe('50');
  });

  it('states the running count as a tracker claim with its liveness the state-local activity-undetermined (RFC8-16)', async () => {
    const model = buildFixtureModel(cleanups, { workItemRows: closureRows() });
    const served = await servedAnswer(model);
    expect(served.trajectory.answers[1]).toEqual({ id: 'running', state: 'observed', claimed: 34, served: 252, liveness: 'activity-undetermined' });
    const body = answerBody(renderTrajectoryPage(model), 'running');
    const words = body.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
    expect(words).toContain("34 of 252 served work items are claimed in the tracker (status in_progress), which is the tracker's claim.");
    expect(words).toContain('Liveness: activity-undetermined. No staleness bound is declared for claims, so no claimed item can be shown as active; declaring the bound in quality policy resolves it.');
    // State-local: no Unknown encoding, no RFC2-24 reason, no machine Unknown.
    expect(body).not.toContain('data-unknown-');
    expect(body).not.toContain('epistemic');
    expect(served.unknownSubjects.some((subject) => subject.id.includes('liveness'))).toBe(false);
    expect(body).toContain('data-parity-field="answer-running-served">252<');
  });

  it('renders what changed and what it cost as Unknown with a closed reason and a route', async () => {
    const model = buildFixtureModel(cleanups, { workItemRows: closureRows() });
    const html = renderTrajectoryPage(model);
    const served = await servedAnswer(model);
    for (const [id, subject] of [['changed', 'region:trajectory-changed'], ['cost', 'region:trajectory-cost']] as const) {
      const body = answerBody(html, id);
      expect(body).toContain(`data-unknown-disclosure="${subject}" data-unknown-reason="source-uncaptured-or-unreachable"`);
      expect(body.replace(/<[^>]+>/g, '')).toContain('Reason: source-uncaptured-or-unreachable. Route: Repair the observer/source; new snapshot.');
      expect(served.trajectory.answers.find((answer) => answer.id === id)).toEqual({ id, state: 'unknown', disclosure: subject });
      expect(served.unknownSubjects.some((entry) => entry.id === subject)).toBe(true);
    }
    expect(answerBody(html, 'cost')).toContain('never zero');
  });

  it('answers the fifth question with three labelled counts, never summed, and never names "verified" as a state', async () => {
    const model = buildFixtureModel(cleanups, { workItemRows: closureRows() });
    const html = renderTrajectoryPage(model);
    const served = await servedAnswer(model);
    if (served.workItems.kind !== 'observed') throw new Error('unreachable');
    expect(served.trajectory.answers[4]).toEqual({
      id: 'intent',
      state: 'observed',
      unknownProvenance: { count: 252, served: 252, disclosure: 'region:work-item-governing-intent' },
      reconciliationChain: { members: 0, materialized: 0, memberEvidence: 'reconciliation-evidence-absent' },
      orphanedWork: { state: 'unknown', disclosure: 'region:trajectory-orphaned-work', served: 252 },
    });
    expect(served.workItems.governedByUnknownCount).toBe(252);
    const body = answerBody(html, 'intent');
    const words = body.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
    expect(words).toContain('Unknown-provenance: 252 of 252 served work items have no traceable warrant.');
    expect(body).toContain('data-unknown-ref="region:work-item-governing-intent" data-unknown-reason="source-uncaptured-or-unreachable"');
    expect(words).toContain('Reconciliation chain: 0 of 0 materialized work items whose change is on the default branch.');
    // The chain state is a fact of the render, not an RFC2-24 Unknown.
    const chain = /<span class="chain-state" data-parity-field="answer-intent-chain-evidence">([^<]*)<\/span>/.exec(body);
    expect(chain?.[1]).toBe('reconciliation evidence absent / Unknown');
    expect(words).toContain('running a reconciliation evaluation resolves it');
    expect(words).toContain('Orphaned work, of 252 served work items: not checked. Count: Unknown.');
    expect(body).toContain('data-unknown-disclosure="region:trajectory-orphaned-work" data-unknown-reason="source-uncaptured-or-unreachable"');
    expect(words).not.toMatch(/not checked\. Count: 0/);
    expect(words).toContain('The three counts are separate and never added together.');
    expect(body).toContain('href="#n-verification"');
    // No element carries a sum of two counts (252 + 0 = 252 is ambiguous,
    // so the oracle is structural: exactly three count elements, no total).
    expect([...body.matchAll(/data-parity-field="answer-intent-[a-z-]+"/g)].map((m) => m[0])).toEqual([
      'data-parity-field="answer-intent-unknown-provenance"',
      'data-parity-field="answer-intent-unknown-provenance-served"',
      'data-parity-field="answer-intent-unknown-provenance-mark"',
      'data-parity-field="answer-intent-chain-members"',
      'data-parity-field="answer-intent-chain-materialized"',
      'data-parity-field="answer-intent-chain-evidence"',
      'data-parity-field="answer-intent-orphaned-served"',
      'data-parity-field="answer-intent-orphaned"',
    ]);
    // "verified" occurs in the answers only as the question's verb.
    expect(answersRegion(html).replace(/<[^>]+>/g, '').match(/verified/gi)).toEqual(['verified']);
  });

  it('every Unknown answer part has its machine twin, and the answers carry no count the page lacks', async () => {
    const model = buildFixtureModel(cleanups, { workItemRows: closureRows() });
    const html = renderTrajectoryPage(model);
    const served = await servedAnswer(model);
    const disclosed = [...answersRegion(html).matchAll(/data-unknown-disclosure="([^"]*)"/g)].map((m) => m[1]);
    expect(disclosed).toEqual(['region:trajectory-changed', 'region:trajectory-cost', 'region:trajectory-orphaned-work']);
    for (const id of disclosed) expect(served.unknownSubjects.some((subject) => subject.id === id), id).toBe(true);
  });

  it('renders the chain count Unknown, with reason and route, when the materialized item\'s worker change is unobserved', () => {
    const { repoRoot, revision } = fixtureRepoWithGit(cleanups);
    const rows = [{ revision: 'dolt-rev-2', id: 'bu-unobserved-1', title: 'Materialized work item', status: 'open', issue_type: 'task', priority: 2, created_at: '2026-08-30T00:00:00Z', updated_at: '2026-08-30T00:00:00Z', closed_at: null }];
    const model = buildPocModel({
      seeds: BUTLERS_POC_SEEDS,
      repoRoot,
      repositoryRevision: revision,
      observerRevision: revision,
      evaluation: { snapshot: 'butlers@chain-unknown', asOf: '2026-08-30T12:00:00Z' },
      materializationRecord: { beadId: 'bu-unobserved-1', externalRef: 'syzygy-poc:work:whatsapp-single-event-normalization', targetRepoRoot: repoRoot, createdAt: '2026-08-30T00:00:00Z', doltRevisionAtCreation: 'dolt-rev-1', attribution: 'test-actor' },
      runWorkItemQuery: (_repoRoot, sql) => (sql.includes('WHERE id LIKE') ? JSON.stringify(rows) : JSON.stringify([{ revision: 'dolt-rev-2' }])),
    });
    expect(model.workerChange.kind).toBe('unknown');
    expect(model.trajectory.answers.find((answer) => answer.id === 'intent')).toMatchObject({ reconciliationChain: { members: { state: 'unknown', disclosure: 'region:trajectory-chain-membership' } } });
    expect(model.unknownSubjects.find((subject) => subject.id === 'region:trajectory-chain-membership')?.epistemic.closedReason).toBe('source-uncaptured-or-unreachable');
    const body = answerBody(renderTrajectoryPage(model), 'intent');
    expect(body).toContain('data-parity-field="answer-intent-chain-members" data-unknown-disclosure="region:trajectory-chain-membership" data-unknown-reason="source-uncaptured-or-unreachable"');
    expect(body.replace(/<[^>]+>/g, '')).toContain('Members: Unknown.');
    expect(body).not.toMatch(/data-parity-field="answer-intent-chain-members">0</);
  });

  it('fails the oracles when a count drifts from the answer or an answer is dropped (rule 6)', async () => {
    const model = buildFixtureModel(cleanups, { workItemRows: closureRows() });
    const html = renderTrajectoryPage(model);
    const drifted = html.replace('data-parity-field="answer-remains-closed">51<', 'data-parity-field="answer-remains-closed">50<');
    expect(drifted).not.toBe(html);
    expect(Object.fromEntries([...answerBody(drifted, 'remains').matchAll(/data-parity-field="answer-remains-([a-z_]+)">(\d+)</g)].map((m) => [m[1], Number(m[2])])).closed).not.toBe(51);
    const dropped = html.replace(/<div class="answer" data-parity-field="trajectory-answer" data-answer-id="cost">[\s\S]*?<\/dd><\/div>/, '');
    expect(dropped).not.toBe(html);
    expect([...answersRegion(dropped).matchAll(/<dt>([^<]*)<\/dt>/g)].map((m) => m[1])).not.toEqual(QUESTIONS);
  });
});

/** The elapsed-time region and its parity cells, by field, in page order. */
function timeRegion(html: string): string {
  return /<section class="time-measures"[^>]*>([\s\S]*?)<\/section>/.exec(html)?.[1] ?? '';
}
function timeCells(html: string): Record<string, string[]> {
  const cells: Record<string, string[]> = {};
  for (const m of timeRegion(html).matchAll(/data-parity-field="(time-[a-z0-9-]+)"[^>]*>([^<]*)</g)) (cells[m[1]!] ??= []).push(m[2]!);
  return cells;
}
/** Every mismatch between the page's time cells and the machine measures. */
function timeParityMismatches(html: string, served: PocModel): string[] {
  if (served.trajectory.kind !== 'observed') return ['not observed'];
  const t = served.trajectory.timeMeasures;
  const hours = (v: number | null): string => (v === null ? 'not measurable' : String(v));
  const expected: Record<string, string[]> = {
    'time-measured-at': [t.measuredAt],
    'time-source': [t.source],
    'time-evidence-class': [t.evidenceClass],
    'time-lead-covered': [String(t.leadTime.covered)],
    'time-lead-total': [String(t.leadTime.total)],
    'time-lead-median': [hours(t.leadTime.medianHours)],
    'time-lead-p90': [hours(t.leadTime.p90Hours)],
    'time-age-covered': [String(t.age.covered)],
    'time-age-total': [String(t.age.total)],
    'time-age-median': [hours(t.age.medianHours)],
    'time-age-p90': [hours(t.age.p90Hours)],
    'time-arrivals-covered': [String(t.arrivals.covered)],
    'time-arrivals-total': [String(t.arrivals.total)],
    'time-closures-covered': [String(t.closures.covered)],
    'time-closures-total': [String(t.closures.total)],
    'time-week-arrivals': t.weeks.map((w) => String(w.arrivals)),
    'time-week-closures': t.weeks.map((w) => String(w.closures)),
  };
  const actual = timeCells(html);
  return [...new Set([...Object.keys(expected), ...Object.keys(actual)])]
    .filter((field) => JSON.stringify(actual[field] ?? []) !== JSON.stringify(expected[field] ?? []))
    .map((field) => `${field}: page ${JSON.stringify(actual[field] ?? [])}, machine ${JSON.stringify(expected[field] ?? [])}`);
}

describe('Trajectory elapsed-time measures (T9, POC-REQ-045)', () => {
  // As of 2026-08-30T12:00:00Z (the fixture evaluation). Hand-computed:
  // lead time over t1 (48 h) and t2 (12 h); t3 has a timezone-less created
  // instant and t4 closes before it was created, so 2 of 4 are covered.
  // Age: t5 48 h, t6 12 h. ISO weeks: 08-01 W31, 08-03..08-05 W32, 08-28 and 08-30 W35.
  const rows = () => [
    fixtureWorkItemRow('bu-t1', 'closed', '2026-08-01T00:00:00Z', '2026-08-03T00:00:00Z', '2026-08-03T00:00:00Z'),
    fixtureWorkItemRow('bu-t2', 'closed', '2026-08-01T00:00:00Z', '2026-08-01T12:00:00Z', '2026-08-01T12:00:00Z'),
    fixtureWorkItemRow('bu-t3', 'closed', '2026-08-02T00:00:00', '2026-08-05T00:00:00Z', '2026-08-05T00:00:00Z'),
    fixtureWorkItemRow('bu-t4', 'closed', '2026-08-05T00:00:00Z', '2026-08-05T00:00:00Z', '2026-08-04T00:00:00Z'),
    fixtureWorkItemRow('bu-t5', 'open', '2026-08-28T12:00:00Z', '2026-08-28T12:00:00Z', null),
    fixtureWorkItemRow('bu-t6', 'in_progress', '2026-08-30T00:00:00Z', '2026-08-30T00:00:00Z', null),
  ];

  it('serves the four measures with their coverage, literal by hand', async () => {
    const served = await servedAnswer(buildFixtureModel(cleanups, { workItemRows: rows() }));
    if (served.trajectory.kind !== 'observed') throw new Error('unreachable');
    expect(served.trajectory.timeMeasures).toEqual({
      source: 'tracker-recorded-instants',
      evidenceClass: 'observed',
      measuredAt: '2026-08-30T12:00:00Z',
      leadTime: { covered: 2, total: 4, medianHours: 12, p90Hours: 48 },
      age: { covered: 2, total: 2, medianHours: 12, p90Hours: 48 },
      arrivals: { covered: 5, total: 6 },
      closures: { covered: 2, total: 4 },
      weeks: [
        { week: '2026-W31', arrivals: 2, closures: 1 },
        { week: '2026-W32', arrivals: 1, closures: 1 },
        { week: '2026-W33', arrivals: 0, closures: 0 },
        { week: '2026-W34', arrivals: 0, closures: 0 },
        { week: '2026-W35', arrivals: 2, closures: 0 },
      ],
    });
  });

  it('gives every number in a table cell equal to the machine answer, and a mutated cell fails (rule 6)', async () => {
    const model = buildFixtureModel(cleanups, { workItemRows: rows() });
    const html = renderTrajectoryPage(model);
    const served = await servedAnswer(model);
    expect(timeParityMismatches(html, served)).toEqual([]);
    expect(timeCells(html)['time-lead-median']).toEqual(['12']);
    expect(timeCells(html)['time-week-arrivals']).toEqual(['2', '1', '0', '0', '2']);
    const mutated = html.replace('data-parity-field="time-age-p90">48<', 'data-parity-field="time-age-p90">47<');
    expect(mutated).not.toBe(html);
    expect(timeParityMismatches(mutated, served)).toEqual(['time-age-p90: page ["47"], machine ["48"]']);
  });

  it('draws two titled charts with labelled axes and a text alternative, no script, and no per-card time bar', () => {
    const html = renderTrajectoryPage(buildFixtureModel(cleanups, { workItemRows: rows() }));
    const region = timeRegion(html);
    expect([...region.matchAll(/<svg class="time-chart"[^>]*role="img"[^>]*aria-labelledby="([^"]+)"/g)].map((m) => m[1])).toEqual(['tc-weekly-title tc-weekly-desc', 'tc-hours-title tc-hours-desc']);
    for (const text of ['Work items arriving and closing per ISO week (UTC)', 'Lead time of closed items and age of open items, in hours', 'ISO week (UTC)', 'Items per week', '>Hours<', '>Arrivals<', '>Closures<']) {
      expect(region, text).toContain(text);
    }
    expect(region).toContain('<desc id="tc-weekly-desc">5 weeks from 2026-W31 to 2026-W35;');
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toContain('time-lane');
    expect(html).not.toContain('lane-bar');
    // The cost answer points at the measures, while staying Unknown.
    expect(answerBody(html, 'cost')).toContain('<a href="#time-measures">lead time and age</a>');
    expect(answerBody(html, 'cost')).toContain('Reason: <code>source-uncaptured-or-unreachable</code>');
  });

  it('renders one observation byte-equal at two wall-clock times (POC-REQ-041)', () => {
    const model = buildFixtureModel(cleanups, { workItemRows: rows() });
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-08-30T12:00:00Z'));
      const first = renderTrajectoryPage(model);
      vi.setSystemTime(new Date('2031-01-01T00:00:00Z'));
      const second = renderTrajectoryPage(model);
      expect(second).toBe(first);
    } finally {
      vi.useRealTimers();
    }
  });
});
