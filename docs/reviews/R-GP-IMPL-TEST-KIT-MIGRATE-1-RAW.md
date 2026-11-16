# Review: PR #645, polaris-dossier tests adopt the test-kit tempDir (syzygy-7zyr)
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 40f940f93e08d77317324ed469daf73f87c946b7
Subject: PR #645

Reviewer: beads-pr-reviewer-worker (issue syzygy-5su5). Base: origin/main cc9e612834fc46f5ab97176a0baa2debc46fc9d6, which is also the merge base (the head is four commits on the tip). Every command ran in the foreground in scratch detached worktrees at the head and at the base, each after `npm ci`, with TMPDIR set to a private directory.

## Scope read

19 files under `packages/polaris-dossier/src/` change (+53, -164), all `*.test.ts`; no product file, no `packages/test-kit` file, no config. Each file drops a local `realpathSync(mkdtempSync(join(tmpdir(), prefix)))` helper, its `cleanups` array and its `afterEach`/`afterAll` removal, and imports `tempDir` from `@syzygy/test-kit` (`packages/test-kit/src/temp-dir.ts`).

## Findings

N1 (note, documentation). The PR body says "Migrated 17 polaris-dossier test files (brief, check, ..., no-egress: 19 incl. overlaps)". The list names 19 files, the diff changes 19 files, and the four commits split them 4, 4, 3 and 8. "17" is stale, and "19 incl. overlaps" describes no overlap. The sweep denominator is right: `git grep -l mkdtempSync -- packages apps scripts` gives 104 at the base and 85 at the head, a difference of 19.

N2 (note, teardown timing). Directories now live to the end of the file, not the end of each test. Review of cross-test interference found none: `mkdtempSync` names are unique per call, so two tests in a file never share a directory; no migrated file uses `describe.concurrent`, `it.concurrent` or `.todo`; the one `chmod 0o000` (`state-directory.test.ts:122`) is restored in a `finally` at line 128, so the end-of-file `rmSync` is not blocked by it; the TMPDIR test (`review.test.ts:579-590`) makes `leafy` first and nested directories under it, and `removeTempDirs` removes in insertion order with `force: true`, so the outer removal covers the inner and the second is a no-op. Peak disk per file (not previously bounded by a per-test removal) was not measured; the files that build full runs per test (`render`, `review`, `close`) are the ones to watch.

N3 (note, kit under failure). `tempDir` registers `removeTempDirs` on the setup file's `syzygyAfterTestFile` hook (`vitest.setup.ts:21`), which `afterAll` drains in reverse order. `afterAll` runs after failing tests, so a failure leaves no directory behind. A killed worker leaves directories, exactly as the old `afterEach` did. After every run below, `ls $TMPDIR | grep -c dossier` printed 0.

No exception to the behaviour claim was found. The CONFIRM WITH EXCEPTIONS rests on N1 only, a wrong count in the PR body.

## Evidence

Behaviour preserved, test-count parity per file:
- `vitest run packages/polaris-dossier --reporter=json` at the base and at the head: numTotalTests 1549 and 1549, passed 1548 and 1548, failed 0 and 0, pending 1 and 1, suites 192 and 192, 35 test files each.
- A script compared, per file, the sorted (fullName, status) pairs of every assertion result between the two JSON reports: 0 of 35 files differ, no file only on one side.
- The diff's added and removed lines (`git diff origin/main 40f940f9 -U0 -- packages`) contain 0 lines matching `expect(`, `it(`, `it.each` or `describe(`, so no assertion or case was added or removed; only setup and teardown lines moved.
- Three repeat runs of `--project unit --project integration packages/polaris-dossier`: 1542 passed (1542) each time, 45 s, 27 s and 27 s.

Gates at the head:
- `npm run typecheck`: exit 0.
- `npm test` (unit tier): 166 files, 3629 tests passed.
- `npm run test:tiers`: "ok: every test file is in exactly one tier".
- `python3 scripts/check_governance.py`: exit 0, "32 OK, 21 WARN, 0 FAIL (53 checks)".
- `gh pr checks 645` at review time: node, node (unit), node (integration), node (e2e) pass; `checks` pending.
