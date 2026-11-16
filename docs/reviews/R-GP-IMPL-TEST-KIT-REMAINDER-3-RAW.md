# Review: PR #701 (syzygy-ykfg batch 3), mkdtempSync to test-kit tempDir, 11 files

Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: e13a956524e1462fdbef6f7c6ab7cc2a23f0a33f
Subject: PR #701

Reviewer: beads-pr-reviewer-worker (syzygy-zk8b), fresh context, no author session. Base `origin/main` at review time.
Scratch: detached worktree at the reviewed commit, `npm ci` first, `TMPDIR=/tmp/r701/tmp` (deleted afterwards).

## Verdict basis

The migration is behaviour-identical per file. Every gate is green at the head, no directory is left behind, and
every file but one is killed by at least one of my own mutants. One exclusion rationale does not hold
(exception 1, a follow-up, not a defect in the 11 files).

## 1. Behaviour per file, and shared-path reuse [Observed]

Read all 11 diffs (`git diff origin/main...e13a9565 -- apps`; 61 insertions, 119 deletions).

- Every site calls `tempDir(prefix)`, which is `realpathSync(mkdtempSync(join(tmpdir(), prefix)))`: a fresh
  directory per call. No site stores a directory in a module-level variable that two tests share.
  The `beforeAll` sites (accessibility, names, opening-index `pages`; dossier-trigger `repo`, `cmd`;
  repo-corpus `root`, `hostile`; trigger-isolation `repo`) were already one directory per file.
- Cleanup moved from `afterEach` or `afterAll` to the kit's file-end hook (`vitest.setup.ts`
  `syzygyAfterTestFile`, run from an `afterAll` registered in the setup file, so it runs after the file's own
  `afterAll`). Daemon and browser close in the file's `afterAll` before the directories go. A test therefore
  can no longer see a sibling's directory removed, and none reads a sibling's: each per-test site names a
  new prefix-unique directory.
- Added realpath: dossier-render's `real` test already took `realpathSync`; the other sites now resolve a symlinked
  `TMPDIR`, which only matters on such a host. Not a behaviour change here (`/tmp` is not a link).
- dossier-trigger `removes its scratch checkout...` creates `priv = scratch()` before it sets `process.env.TMPDIR`,
  so the kit's `tmpdir()` call happened first; the `readdirSync(priv)` empty check is unchanged.
- surface-routes: the local `tempDir` is replaced by the kit import. The cross-links block keeps `localCleanups`
  for its fixture repo only.
- Leftover `cleanups` arrays in the three browser files and production-reobserve still feed `buildFixtureModel`,
  `renderVariant`, `variantModel` and `fixtureRepoWithGit`; they are not dead. `tsc` (noUnusedLocals) agrees.

## 2. production-reobserve [Observed]

`buildProductionPocModel` reads `readMaterializationRecordFile(stateDir)` and `readTestArtifactRecordFile(stateDir)`,
both tolerant of absence; the tests write nothing into `stateDir`. The directory is an existing, empty, per-test
path before and after the migration, so what each test proves (served bytes and asOf stable, atomic swap,
two distinct identities, prior model retained on failure) is unchanged. Consequence for mutants: this file survives
both a shared-directory mutant and a missing-path mutant (below); the PR author reported the same and killed it
with a throwing `tempDir`. I agree that is the only mutant that can kill it, and I accept it: the directory is a
required argument, not an asserted behaviour.

## 3. The seven exclusions [Observed]

Read the `mkdtempSync` sites in each.

- restart.test: kill-then-remove order in `afterEach` (flake `syzygy-exj7`). Justified.
- main.test: asserts `join(tmpdir(), 'syzygy-three-surface-poc', digest)`, tests tmpdir handling. Justified.
- cdp-browser.test: mocks `os.tmpdir()` for the rest of a test and asserts on `mkdtempSync` in source. Justified.
- fixture-directories.test: `vi.doMock('node:os', ...)` replaces `tmpdir`. Justified.
- test-model-fixture.test: `freshHelper` stubs `TMPDIR` and counts the helper's own directories; the shared-fixture
  test asserts the helper removes its repositories. Justified.
- unit-tier-guard-file.test: creates its scratch under `node_modules/.cache`, not `tmpdir()`. Justified (not a
  tmpdir site at all).
- product-build.test: NOT justified by the stated rule (see exception 1).

## 4. TMPDIR before and after [Observed]

`TMPDIR=/tmp/r701/tmp`, listing before: `node-compile-cache`. After each of `npm test`, `npm run test:integration`
and `vitest run --project e2e`: `node-compile-cache` only (three listings). Control: my mutant M1 (removal made a
no-op) passed every test and left 96 directories, so the listing does detect a leak.

## 5. Rule-6 mutants of my own [Observed]

Applied to `packages/test-kit/src/temp-dir.ts` in the scratch worktree and reverted. Integration project (7 files)
and e2e project (surface-routes plus three browser files) run separately.

| Mutant | integration | e2e | Survivors |
|---|---|---|---|
| M1 removal is a no-op | 135 pass | 72 pass | leak only (96 dirs left in TMPDIR) |
| M2 every call returns one shared directory | 43 fail, 6 of 7 files | 8 fail, 2 of 4 files | production-reobserve; accessible-names; opening-index |
| M3 path under a nonexistent parent | 12 fail, 56 skipped, 6 of 7 files | 20 fail, 13 skipped, 4 of 4 files | production-reobserve |

M2 survivors are expected: accessible-names and opening-index keep one `pages` directory per file and write
distinct file names into it, and production-reobserve never writes. The M3 survivor is production-reobserve alone,
as section 2 explains. No file survives M1 except through the TMPDIR listing, which is the only detector for it.

## 6. Gates at the head [Observed]

Detached worktree at e13a9565, `npm ci` first, all in the foreground.

- `npm run typecheck`: exit 0.
- `npm test`: 167 files, 3744 tests, exit 0.
- `npm run test:integration`: 89 files, 2552 tests, exit 0.
- `vitest run --project e2e` (browser tier, Chrome present): 13 files, 125 passed, 2 skipped, exit 0; the three
  migrated browser files ran (opening-index has one skipped test; I did not verify that it skips at the base).
- `python3 scripts/check_governance.py`: 32 OK, 21 WARN, 0 FAIL, exit 0.
- Hosted CI: `gh pr view 701` listed one check, `node (unit)`; merge state `BLOCKED` at review time. I did not
  inspect why; the coordinator owns merge readiness.

## Exceptions

1. [Observed] product-build.test is left out under "test directory handling or tmpdir itself", but it does neither.
   Its `scratchTree()` builds a fake checkout for `scripts/clean_build.mjs`; `cleanups` drain in an ordinary
   `afterEach` and the `KEPT_OUTSIDE` reads happen inside the test body. It looks migratable like the other 11.
   Non-blocking: leave out is safe, and the PR body's own count (7 remaining) is accurate. Either migrate it in
   a fourth batch or correct the stated reason. Not a defect in the 11 migrated files.
2. [Inferred] The PR claims "Tests: +0 ~11 -0"; my runs agree on counts (no test added or removed in the diff).

## Not done

- I did not run the base-commit suites for an A/B timing comparison; the TMPDIR comparison rests on the
  after-listing plus the M1 control.
- `test:system`, `test:live` and the PWB mutation runners were not run.
