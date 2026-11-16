import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

import { buildPocModel } from './model.js';
import { BUTLERS_POC_SEEDS } from './poc-seeds.js';
import {
  buildOperatorReportedTestArtifactRecord,
  liveTestOperatorInstructions,
  OPERATOR_REPORTED_DISCLOSURE,
  readBoundedRegularFile,
} from './test-artifact-verification.js';

// Gated exactly like the existing SYZYGY_POC_BUTLERS_REPO-gated live
// checks (work-items.live.test.ts): the default suite stays hermetic, but
// this proves the real end-to-end path on demand — a real JUnit artifact
// from the real, configured Butlers checkout, ingested and composed through
// the full shared model (syzygy-0r9 AC1: a real focused Butlers test
// artifact captured outside Syzygy, then ingested).
//
// Syzygy never runs the observed test suite, here or anywhere (SEC-3,
// RFC5-18; syzygy-hjuz, under the owner's syzygy-4mbu direction "print the
// command"). The operator runs the focused pytest command in their own
// shell and hands the result back through the environment:
//   SYZYGY_POC_BUTLERS_JUNIT         the JUnit file the run wrote
//   SYZYGY_POC_BUTLERS_JUNIT_COMMIT  the commit it ran at (git rev-parse HEAD)
//   SYZYGY_POC_BUTLERS_JUNIT_EXIT    its exit status
//   SYZYGY_POC_BUTLERS_PYTHON        the interpreter it used (default python3)
// With the repository set and the result missing, the test fails and names
// the command to run, rather than skipping or running it.
//
// The commit, the exit status and the run itself are the operator's report
// (syzygy-4mbu round 1, finding 1): Syzygy observes only the file's bytes and
// that HEAD is the reported commit when it reads them. So the record is
// operator-reported, and the full model must resolve it to `reported`,
// capped at report-fact (RFC5-19), never to `verified`. The file is read
// through the same bounded, regular-file-only reader as the capture tool.
const BUTLERS_REPO = process.env.SYZYGY_POC_BUTLERS_REPO;
const PYTHON = process.env.SYZYGY_POC_BUTLERS_PYTHON ?? 'python3';
const JUNIT = process.env.SYZYGY_POC_BUTLERS_JUNIT;
const JUNIT_COMMIT = process.env.SYZYGY_POC_BUTLERS_JUNIT_COMMIT;
const JUNIT_EXIT = process.env.SYZYGY_POC_BUTLERS_JUNIT_EXIT;
const describeLive = BUTLERS_REPO === undefined ? describe.skip : describe;

const SCOPE = 'tests/connectors/test_whatsapp_user_client.py';

describeLive('live real focused-pytest verification (SYZYGY_POC_BUTLERS_REPO gated)', () => {
  const repoRoot = BUTLERS_REPO as string;

  it('ingests one real, passing operator-reported focused-pytest artifact and resolves it to report-fact, never Verified, through the full model (AC1/AC3, RFC5-19)', () => {
    if (JUNIT === undefined || JUNIT_COMMIT === undefined || JUNIT_EXIT === undefined) {
      throw new Error(liveTestOperatorInstructions(repoRoot, PYTHON, SCOPE));
    }
    expect(JUNIT_EXIT, 'the operator-reported exit status (SYZYGY_POC_BUTLERS_JUNIT_EXIT)').toBe('0');

    const repositoryCommit = execFileSync('git', ['-C', repoRoot, 'rev-parse', 'HEAD'], {
      encoding: 'utf8',
    }).trim();
    // A run reported at one commit is never ingested against another.
    expect(repositoryCommit, 'HEAD at ingest against the operator-reported commit (SYZYGY_POC_BUTLERS_JUNIT_COMMIT)').toBe(JUNIT_COMMIT);

    const rawJUnit = readBoundedRegularFile(JUNIT);
    {
      // Refuses a status 0 beside failing, erroring or zero tests, and any
      // count that is not a non-negative integer.
      const built = buildOperatorReportedTestArtifactRecord({
        rawJUnit,
        command: [PYTHON, '-m', 'pytest', SCOPE, '-q'],
        reportedExitCode: Number(JUNIT_EXIT),
        ingestedAt: new Date().toISOString(),
        repositoryCommit,
        scope: SCOPE,
      });
      expect(built.kind, 'the operator-reported result file').toBe('built');
      if (built.kind !== 'built') throw new Error('unreachable');
      expect(built.record.provenance).toBe('operator-reported');
      expect(built.record.summary).toMatch(/passed/);
      expect(built.record.summary).not.toContain('Traceback');

      // Compose through the full shared model, with the git-based
      // worker-change observer's `runGit` seam pointed at this same real
      // commit — the observer's own commit-discovery logic is covered by
      // worker-change-observation.test.ts; this proves the *composition*
      // with a genuinely captured artifact end-to-end.
      const model = buildPocModel({
        seeds: BUTLERS_POC_SEEDS,
        repoRoot,
        repositoryRevision: repositoryCommit,
        observerRevision: repositoryCommit,
        evaluation: {
          snapshot: 'butlers@live-capture',
          asOf: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        },
        materializationRecord: {
          beadId: 'bu-live-capture-1',
          externalRef: 'syzygy-poc:live-capture-test',
          targetRepoRoot: repoRoot,
          createdAt: new Date().toISOString(),
          doltRevisionAtCreation: null,
          attribution: 'live-test',
        },
        runWorkItemQuery: () =>
          JSON.stringify([
            {
              revision: 'dolt-live',
              id: 'bu-live-capture-1',
              title: 'live capture',
              status: 'in_progress',
              issue_type: 'task',
              priority: 1,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              closed_at: null,
            },
          ]),
        runGit: (root, args) => {
          if (args[0] === 'symbolic-ref') return 'refs/remotes/origin/main';
          if (args[0] === 'rev-parse') return repositoryCommit;
          if (args[0] === 'log') {
            const format = `${repositoryCommit}\x1f${built.record.ingestedAt}\x1flive capture [bu-live-capture-1]`;
            return `${format}\n`;
          }
          if (args[0] === 'merge-base') return '';
          if (args[0] === 'for-each-ref') return 'main\n';
          return new TextDecoder('utf-8', { fatal: true }).decode(execFileSync('git', ['--no-optional-locks', '-C', root, ...args]));
        },
        testArtifactRecord: built.record,
      });

      expect(model.workerChange.kind).toBe('observed');
      if (model.workerChange.kind !== 'observed') throw new Error('unreachable');
      expect(model.workerChange.state).toBe('changed-or-merged');
      expect(model.testArtifactVerification).toEqual({
        kind: 'reported',
        tier: 'report-fact',
        record: built.record,
        disclosure: OPERATOR_REPORTED_DISCLOSURE,
      });
    }
  }, 120_000); // unmeasured: it runs only against an operator's real Butlers checkout (SYZYGY_POC_BUTLERS_REPO, 2c1f8d5a), which no hosted or local run sets; the commit holds no measurement, so this is an unmeasured residual of syzygy-bpyt.4.31
});
