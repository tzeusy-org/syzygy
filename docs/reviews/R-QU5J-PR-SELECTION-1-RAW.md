# R-QU5J-PR-SELECTION-1
Verdict: REVISE
Reviewed commit: c724e09b4e8c166a1f59693d8191627bdd0e19b7
Reviewer: fresh-context subagent

Scope: PR #1019 (`agent/syzygy-qu5j`), the diff 4b86e4285..c724e09b4 (8 files), against the acceptance
criteria of bead `syzygy-qu5j`. Experiments ran in a scratch clone at `/home/orca/.tmp/review-qu5j/clone`
with the worktree's `node_modules` copied in (the session scratchpad under `/tmp` ran out of inodes; the
clone is still there and is not cleaned up, because Bash stopped working when `/tmp` filled up). Line
numbers are for the files at c724e09b4.

## What holds

- [Observed] Workflow conditions are right. `pull_request` runs the select step and the selected runners;
  `merge_group` makes `github.event_name != 'pull_request'` true and runs the unchanged `npm test`,
  `npm run test:integration` and `npm run test:e2e` (`.github/workflows/node-ci.yml` ~118-135, ~155-169,
  ~232-250). All three tier jobs check out with `fetch-depth: 0` (lines 65-67, 143-145, 183-185), so
  `github.event.pull_request.base.sha` is present. `git diff base HEAD` against the PR merge ref is the
  PR's own change. A stale `base.sha` only widens the diff, which over-selects. `$RUNNER_TEMP` is expanded
  by the shell, and each job recomputes its own selection from the same checkout. The `node` job is
  unchanged (lines 255-269).
- [Observed] Reproduced the #1007 measurement. I checked out e08d5fdc9 (its lockfile and package.json are
  byte-identical to c724e09b4's), overlaid `ci-selection.ts` and `scripts/select_ci_tests.mjs` from
  8eeefbf07 and ran `--base e08d5fdc9^1`. Result: unit 94/227, integration 97/107, e2e 11/29, live 3/3.
  The e2e list is identical to `measurement.e2eSelected`, and no dossier browser test is selected. All 6
  test files named `*trajector*` are selected.
- [Observed] The unit runner's exact-report check catches extras. `selectedUnit` passes the chosen paths
  as Vitest CLI filters (substring matches) but feeds `expected` into `ownedRun`, and `denominator()`
  flags `collected-selection-mismatch` for any extra or missing file (`scripts/check_unit_tmpdir.mjs`
  127-131). The TMPDIR census and cleanup run unchanged around the child (141-172). The guard keeps its
  guarantees on the selected path. The only loss is the `vitest list` discovery cross-check that
  `fullUnit` does (219-226), and `npm run test:tiers` in the same job (node-ci.yml 100-101) covers the
  partition.
- [Inferred] The Vitest Node API use is sound for 3.2.7. `getRelevantTestSpecifications` globs every
  project and then calls `filterTestsBySource`. That honours `config.related`, short-circuits to all specs
  only if a related path matches `forceRerunTriggers` (workspace modules and readers never match the
  defaults), and walks `deps` plus `dynamicDeps` per spec through each project's vite-node
  (`node_modules/vitest/dist/chunks/cli-api.DVe0nWUx.js` 7792-7893). It sees literal imports only:
  template-literal `import()`, spawned children and workers are invisible to it.
- [Observed] Merge-group runs are whole, so main cannot move to a tree that failed the full suite. Every
  miss below is a PR that goes green and is then ejected by the queue, never a red main.

## Findings

1. **F1, must-fix: tests that scan the workspace's own source files are never selected for workspace-module
   changes, and neither the PR nor the code discloses this class of miss.** The ROOTED reader rule
   applies only when the changed path is outside the workspaces (`ci-selection.ts:92`,
   `const rooted = !WORKSPACE.test(change.path);`). For a workspace module, the only readers are modules
   that name its basename (`ci-selection.ts:64`). Repository-wide guards that walk the source tree
   therefore never select themselves for the code they guard. Two mutations, each committed in the
   scratch clone and run with `node scripts/select_ci_tests.mjs --base c724e09b4`:
   - (a) Added a new file `packages/support/src/clock.ts` containing `export const now = (): number => Date.now();`.
     Selection: `unit: 0 of 229, integration: 0 of 108, e2e: 0 of 29`, so the PR runs nothing and goes
     green. On that tree, `packages/support/src/support-purity.test.ts` fails 2 tests ("names no
     identifier outside its literal list…", expected `[ 'clock.ts: Date', 'clock.ts: now' ]` to equal `[]`).
   - (b) Appended to the existing module `packages/polaris-dossier/src/figure-fit.ts` a
     `runSync('npm', ['install'])` call through `execFileSync`. Selection: integration 30 of 108, without
     `apps/three-surface-poc/src/sync-child-process-guard.test.ts`. On that tree the guard fails ("runs
     only short local tools synchronously…", 1 failed | 9 passed).

   122 test-reachable workspace modules call `readdirSync`/`readdir(`/`ls-files`/`ls-tree`/glob. Among
   the tests that do are `product-build`, `polaris-authority-sweep`, `sync-child-process-guard`,
   `barrel-guard`, `argv` and `support-purity`. This class is wider than both disclosures. The head
   comment (`ci-selection.ts:16-17`) names "a path assembled from parts that never name a token, a tree
   walk from a root handed in by a caller it does not import". The PR body and evidence note 3 name "a
   root it gets from a module it does not import". These guards walk from their own `import.meta.url` or
   a ROOTED root, which neither description covers. The disclosed blind spot is tagged [Inferred] when a
   broader one is observable, which overstates the rule's reach. Fix by either:
   - treating ROOTED readers and modules that walk source directories as readers of every workspace
     module, then measuring the new #1007 cost; or
   - restating the blind spot accurately (with these two reproductions) in the head comment,
     CONTRIBUTING.md, the PR body and the evidence record, and accepting more queue ejections.

2. **F2, should-fix: the #1007 acceptance item is narrower in the PR than in the bead, and the PR does not
   say so.** The bead says the selection "excludes the Polaris dossier tests … and includes every
   Trajectory and core test". In my reproduction, 77 of the 90 `packages/polaris-dossier/` test files are
   selected, and 117 of the 186 files with `polaris` in the path. The PR body and the evidence claim only
   "no dossier browser test", which is true and probably the flake-driven intent. Also, 11 of the 48
   `packages/three-surface-poc-core/` tests are not selected, for example `markdown-code-context.test.ts`
   and `owner-act-drafter.test.ts`. That is correct if "core test" means tests that reach the change, but
   unstated. The evidence should record how it reads the criterion and the dossier counts. The 77 come
   largely from the ROOTED rule firing on the governed documents in the diff.

3. **F3, should-fix: the bead's fs-path design was replaced without saying so, and the replacement has no
   completeness guard.** The bead specified a script-derived trigger list of the paths fs-reading tests
   read, plus a unit test that fails when a new fs-reading test names a path the list lacks. The PR
   substitutes reader selection. For documents outside the workspaces this is sound and arguably
   stronger, because any module that locates the repository is a reader, which is why integration is
   97/107. But it drops the self-check: nothing fails when a new reader escapes both ROOTED and basename
   naming (F1 is one such escape). Neither the PR body, CONTRIBUTING.md nor `ci-selection.ts` says that
   the bead's design was replaced or why. The rule-6 item "drop the fs-path list" was mapped onto the
   `rooted-readers-dropped` mutant, which is reasonable, but say so.

4. **F4, should-fix: changed modules outside the workspaces are never given to the module graph.** `code`
   takes only `apps/*`/`packages/*` modules (`ci-selection.ts:90`). Suppose a test imports
   `../../../scripts/a.mjs`, which imports `scripts/b.mjs`, and the PR changes `b.mjs`. That test is
   selected only if it is ROOTED for other reasons or names `b.mjs`. An import specifier such as
   `'../../../scripts/a.mjs'` matches no ROOTED form. [Inferred from the code; not run, because Bash
   became unavailable.] Passing every changed `.ts/.mjs/.js` outside the triggers to `related` would let
   Vitest's graph close this at no extra cost.

5. **F5, should-fix: renames select readers of the new path only.** `planSelection` pushes
   `documents` for `change.path` only (`ci-selection.ts:93-96`). A full run is forced only when the old
   path is under a workspace (`:89`). Take a non-workspace doc renamed, read by a module through a
   non-ROOTED literal such as `new URL('../../../docs/OLD.md', import.meta.url)`: that module names only
   the old basename and is not selected, although it now reads a missing file. [Inferred from the code.]
   Add `change.previous`'s tokens.

6. **F6, note: in selected e2e runs the browser preflight runs only if it was itself selected.**
   `scripts/run_ci_tier.mjs:40` runs `cdp-browser.browser.test.ts` first only `if (chosen.includes(...))`.
   When other `.browser.test.ts` files are chosen without it, a browser that fails to launch surfaces as N
   browser-test failures instead of the one preflight diagnosis the full script gives. Consider always
   prepending the preflight when any browser test is chosen.

7. **F7, note: the integration and e2e runners do not check the report against the selection.** Unlike
   the unit runner, `run_ci_tier.mjs:34` passes paths as Vitest substring filters and checks only the exit
   status. An extra match over-runs, which is harmless. A filter that matches nothing makes Vitest exit
   non-zero, so a chosen file cannot silently not run. That depends on Vitest's "No test files found"
   exit, which is [Inferred] here and was not exercised.

8. **F8, note: the evidence covers `ci-selection.ts` alone.** The mutants in
   `docs/evidence/syzygy-qu5j/pr-selection-2026-11-27.json` all target that file. The runner checks (the
   stray refusal, `collected-selection-mismatch` on the selected path, the empty-tier pass) are claimed
   in the PR body ("exercised locally … a stray file (refused)") with no retained output or command, so
   they are not re-checkable (rule 11). The record's subject is 8eeefbf07 with per-file digests, which is
   adequate for the measurement.

9. **F9, note: the triggers cover the bead's list, with one narrowing.** The trigger list
   (`ci-selection.ts:41-51`) and its test (`ci-selection.test.ts:47-58`) cover vitest config, tiers and
   setup, tsconfig, manifests, the lockfile, `.npmrc`, the selector and runners, and `node-ci.yml`. A PR
   touching `vitest.config.ts` or the lockfile is full on every tier, and the test pins each trigger. The
   bead said `.github/workflows/**`; the PR narrows this to `node-ci.yml`. Other workflows do not affect
   this one, so that is fine but should be stated.
