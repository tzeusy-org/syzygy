# R-QU5J-READ-CENSUS-1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 98ff70dcb39f811ae7df01b49e7fb30acdead849
Reviewer: fresh-context subagent

Subject: PR #1034, `agent/syzygy-qu5j-census`. Environment: Vitest 3.2.7, Node v24.6.0, worktree
`.worktrees/parallel-agents/syzygy-qu5j-census`. Scratch under `/home/orca/.tmp/review-census/`.

What I ran (all at the reviewed commit, tracked files restored after each mutant; `git status` clean afterwards):

- `SYZYGY_READ_CENSUS=<dir> npx vitest run --project unit`: 230 files passed, 230 census lines (230 distinct files,
  none outside the root). Checker: `files=230 paths=985 pairs=3597 full-run-paths=20 misses=0`, exit 0. The evidence
  records 984 / 3596 / 19; the one-path difference is consistent with the evidence file itself not yet being
  committed when the author's census ran [Inferred].
- `SYZYGY_READ_CENSUS=<dir> npm test` (TMPDIR-guarded runner): exit 0, empty leftovers, 230 census lines [Observed].
- Evidence mutants `island-boundary-row-dropped` and `multi-level-parent-not-rooted` re-run against my census: 283 and
  260 misses, as recorded [Observed]. The six sha256 digests in the evidence `subject` equal the HEAD blobs [Observed].
- Two recorder mutants (F1) and a probe suite (F2) run from a scratch Vitest config that loads the two root setup files.

## Findings

1. **F1, should-fix: the checker cannot tell a partly broken recorder from a clean tree.** The only floor is
   `recorded === 0` (`scripts/check_read_census.mjs:106-107`). Mutant: `vitest.read-census.setup.ts:43`
   `const READS = ['readFile', 'readFileSync', 'createReadStream', 'open', 'openSync'];` →
   `const READS = ['readFile', 'createReadStream', 'open', 'openSync'];`. Unit census then gave
   `paths=550 pairs=801 full-run-paths=0 misses=0`, exit 0 [Observed]. So about 78% of the pairs vanished and the guard
   stayed green. All four rule-6 mutants in the evidence mutate `ci-selection.ts`. None mutates the recorder, so no
   recorder predicate has been shown to fail (rule 6, per predicate). Suggested repair: pin canary pairs the census must
   contain, such as `packages/polaris-generation-consent/src/real-tree.test.ts` reading a
   `.syzygy/governance/decisions/*.md` path. Or add a selftest fixture that reads one tracked file through each wrapped
   API and asserts each lands. Also record a recorder mutant in the evidence.

2. **F2, should-fix: in-process read routes the recorder does not see, and limits stated narrower than they are.**
   A probe test reading worktree files recorded the following [Observed]:
   - Recorded: named `readFileSync` at module level, `fs/promises` named `readFile`, namespace and default `readFile`,
     `fs.promises.readFile`, `fsPromises.open`, a `file:` URL, `createRequire(...)` of `package.json`.
   - Not recorded: `fs.copyFileSync(package-lock.json, …)`, `fs.cpSync(docs/evidence/syzygy-qu5j, …)`,
     `fs.openAsBlob(tsconfig.json)`, and a `worker_threads` Worker's `readFileSync(ci-selection.ts)`.

   The repository already treats these as read routes: `packages/polaris-dossier/src/fs-patch.testkit.ts:9-31` lists
   `copyFileSync`, `copyFile`, `cpSync`, `cp`, `openAsBlob` and the `fs/promises` `copyFile`/`cp`. Today's `cpSync` call
   sites copy temp templates (`packages/test-kit/src/git-repo.ts:43`, `apps/three-surface-poc/src/test-model-fixture.ts:48`,
   `packages/three-surface-poc-core/src/model.test.ts:99`). So I know of no present miss through these routes
   [Inferred from a grep over 738 tracked workspace modules: 7 files name `copyFile`, 8 `cpSync`, 3 `openAsBlob`,
   1 `new Worker`]. A future test that copies a tracked file into a fixture and reads the copy would still pass the
   merge-group check while missing on PRs. Two fixes are possible:
   - Wrap `copyFile`/`copyFileSync`/`cp`/`cpSync`/`openAsBlob` on both objects, recording the source argument; or
   - Name these routes and worker threads in the limits.

   The limits as written cover only child processes and listings: the PR body "Limits", `CONTRIBUTING.md` (new bullet,
   last two lines), and the evidence `limits[0]`, tagged [Observed] for a closed list it did not sweep.

3. **F3, should-fix: stale prose in `ci-selection.ts`'s head comment.**
   - Lines 2-3 say "Merge-group runs never read this". `scripts/check_read_census.mjs:76` now imports `planSelection` in
     every merge-group run.
   - Lines 10-13 describe `ROOTED` as `new URL('../..')`, `process.cwd()` and `git rev-parse`. They name neither the new
     bare multi-level literal (line 66) nor `DECLARED_READERS` (lines 68-89) as a way a change reaches a test.
   - Lines 22-25 say "no unit test fails when a new test escapes the rule, and the full merge-group run is what catches
     it". For in-process reads it is now the census check that catches it, and only that check names the escape.

4. **F4, should-fix: `DECLARED_READERS` patterns are wider than what the readers read.**
   - Both workspace rows use `^(apps|packages)\/[^/]+\/src\/.+\.(ts|…)$` (`ci-selection.ts:76,81`), which matches all
     370 tracked `src/**/*.test.ts` files and every testkit.
   - `island-boundary.test.ts` read 364 paths in my census. 350 match the pattern, and only 1 of those is test-shaped
     [Observed].
   - `product-build.test.ts` builds each project from a tsconfig that excludes `src/**/*.test.ts` and the testkits
     (`apps/three-surface-poc/src/product-build.test.ts:29-40`). Yet any PR touching only a test file now selects it,
     an e2e test that builds.
   - Its `why`, "builds every tracked workspace module in a clone", does not match what the census saw. `emitted()` runs
     `ts.createProgram` over `ROOT` in-process (`product-build.test.ts:56-63`).
   - This over-selects and is not unsafe. Excluding `\.test\.ts$` and testkits narrows it, and the census would flag any
     under-reach.

5. **F5, note: the widened `ROOTED` adds 40 modules (99 → 139 of 738), one of them falsely.** 39 of them are at depth 3
   with `'../../..'`, which really reaches the root. The 40th is
   `apps/three-surface-poc/src/polaris-generation/synthetic-shapes.testkit.ts` (depth 4). It matches only because a
   Terraform fixture string carries `"../../"` (lines 72-73). The pattern ignores depth, so `'../..'` from a
   `packages/x/src/` module (which reaches `packages/`) also counts. It over-selects and is harmless here: that testkit's
   one importer, `packages/polaris-dossier/src/synthetic-shapes.test.ts`, is rooted anyway. The test at
   `ci-selection.test.ts` (parent-literal case) asserts `"'../../'"` is rooted, so the over-reach is intended. A
   single-`'..'` false positive stays excluded [Observed: sweep script over `git ls-files` of the selector's module
   population].

6. **F6, note: the checker matches PR selection, and its simplifications only make it stricter.**
   - `filterTestsBySource` in Vitest 3.2.7 (`node_modules/vitest/dist/chunks/cli-api.DVe0nWUx.js:7846-7869`) selects a
     spec when a related path is the spec itself or is in `getTestDependencies(spec)`. That is what
     `check_read_census.mjs:130` does.
   - The checker skips the `forceRerunTriggers` short-circuit, which can only add tests, so leaving it out cannot turn a
     miss into a pass.
   - The single-path `M` plan is a lower bound for any multi-path PR. `related` is a union (`ci-selection.ts:154-155`),
     and status changes only `code` for a deleted module and full runs for workspace D/R.
   - Renames add the previous name to `names`, so they only widen.
   - Dropping untracked paths and a test's read of itself is right: a test's own change selects it through `related`.
   - Tiers need no modelling. Selection is tier-agnostic and only intersected with tier populations afterwards
     (`scripts/select_ci_tests.mjs:100`).

7. **F7, note: no lost-line gap that lets a run pass.**
   - In the probe, a failing test and a timed-out test both still wrote their census lines [Observed]. A file that fails
     at collection writes none, but the step fails anyway.
   - A file whose suites are all skipped writes no line, and it also tests nothing.
   - Attribution is one line per file over 230 files, all distinct [Observed].
   - All `node:fs` and `node:fs/promises` import forms are recorded (F2's probe). Removing `syncBuiltinESMExports()`
     (line 46) left the unit census identical (3597 pairs, 0 misses) [Observed]. The line is harmless but not
     load-bearing under Vitest's SSR import form.
   - Under the default `stack` hook order, the census `afterAll` runs before `vitest.setup.ts`'s `syzygyAfterTestFile`
     teardowns. Reads made in those teardowns are not recorded [Inferred; they are cleanup].

8. **F8, note: the workflow wiring is sound, with two small local-use gaps.**
   - `SYZYGY_READ_CENSUS` is set on exactly the three non-PR full steps. Each check step has the same `if`, and
     `${{ runner.temp }}` and `$RUNNER_TEMP` name the same directory.
   - e2e's two `vitest` runs append per-pid files to one directory.
   - `test:system` uses `packages/cap1-system/vitest.config.ts`, which has no root `setupFiles`, so it writes no lines.
     This is correct: `run_ci_tier.mjs:45` runs it on every PR anyway.
   - The integration selftest's Vitest fixtures use their own temp config.
   - An empty directory fails closed (`check_read_census.mjs:104`).
   - The census-on path runs only in the merge queue. A test that breaks under the wrapping (for example by asserting
     fs function identity) is first seen there. The PR body says so for this PR.
   - Locally, the `CONTRIBUTING.md` recipe reuses `/tmp/rc` and the setup appends. Lines from an earlier run of a test
     since renamed make the checker throw ("census names a test Vitest does not list"). Advise a fresh directory.
   - A relative `SYZYGY_READ_CENSUS` resolves against the worker's cwd (setup line 61).

9. **F9, note: evidence labels and claim strength.**
   - `census.contentReadsOnMainSelector` is not main's selector. Its own note says it was measured after the parent-literal
     widening. The PR body's "Main's rules missed 306 unit pairs" carries the same mislabel; the next bullet half
     corrects it. No count of content-read misses for the true main selector is recorded.
   - `beforeRepair` used a recorder variant that also logged `stat`, `exists` and `readdir`. Its code fragment is not
     stored, so that figure cannot be re-run (rule 6 lesson: store old/new).
   - The mutant records carry old/new fragments and bind the bytes by digest instead of a commit (pre-commit working
     tree). The digests match HEAD, so this is acceptable under rule 11.
   - The count figures in `census.after` and `pr1007` carry no [Observed] tag. Only `pr1007.note` and `limits` are
     tagged. F2 already covers `limits[0]` being stated as [Observed] over a list it did not sweep.
