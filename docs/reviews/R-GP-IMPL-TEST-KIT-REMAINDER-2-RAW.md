# Review: PR #687, syzygy-ykfg batch 2 (test-kit remainder, apps/three-surface-poc)

Verdict: CONFIRM
Reviewed commit: 7ef5ea09b3d39a4b9a63c799c4c493b77b0c8fc0
Subject: PR #687

Reviewer: beads-pr-reviewer-worker, bead syzygy-mlkd. Fresh context; artifact is the PR diff only.

## Scope

[Observed] 12 files: 10 `apps/three-surface-poc/src/*.test.ts` (two browser: `orrery.browser`, `trajectory-narrowing.browser`), `apps/three-surface-poc/package.json` and `package-lock.json`. Each test file replaces `mkdtempSync(join(tmpdir(), p))` plus `cleanups.push(dir)` (or a local `tempDir` helper) with `tempDir` from `@syzygy/test-kit`.

## Findings

1. Behaviour per file is identical. [Observed] Every call site creates a fresh directory per call, inside the test or the helper that the test calls; no migrated file holds a directory in module scope or reuses a path across tests. The two `trajectory-narrowing.browser` tests each call `tempDir` with the same prefix and get distinct directories (mkdtemp suffix).
2. Moving cleanup to file end cannot leak state between tests. [Observed] Rule-6 mutant A: `tempDir` made to write a `zz-stale` file into every new directory, 10 files rerun (integration 6 files / 68 tests, e2e 5 files / 32 tests): all pass, so no test relies on an empty directory. [Inferred] Since each test owns a fresh path, end-of-file removal differs from per-test removal only in disk lifetime.
3. One deliberate difference: `tempDir` returns `realpathSync` of the directory. [Inferred] Harmless unless tmpdir is a symlink, where it only makes paths agree with what git and the daemon print.
4. Manifest lines merge cleanly after #684. [Observed] The `apps/three-surface-poc/package.json` and `package-lock.json` hunks are byte-identical in #684 and #687 (same blob `19c40fbf` for the package.json). `git merge-tree --write-tree pr684 pr687` exits 0 and prints a tree id with no conflict. No test file overlaps between the two PRs (#684: capture-test-artifact-main, git-blob-batch, governance-inputs, main-entry and the polaris-generation tests; #687: the ten here).
5. No directory is left behind. [Observed] With `TMPDIR=/tmp/r687` (empty before): after `npm test` (167 files / 3658 tests), `npm run test:integration` (88 / 2549), the ten files again under integration, and `--project e2e`, `ls /tmp/r687` held only `node-compile-cache` (Node's own cache) beside my log files. Rule-6 mutant B: `removeTempDirs` made a no-op; two files rerun, tests still pass and 18 `syzygy-*` directories were left, so the TMPDIR diff does detect a leak. [Unknown] Whether any test in the suite itself fails on a leak: this mutant did not fail the two migrated files (the kit's own test is the pin, not run in isolation here).
6. Browser tests ran, not skipped. [Observed] `google-chrome` present; `orrery.browser` (1 test) and `trajectory-narrowing.browser` (2 tests) passed under `--project e2e`. `proposal-disclosure` and `tuple-encoding` browser branches are in the integration run and passed.
7. Leftover `cleanups`/`rmSync` are still used. [Observed] Files that still declare `cleanups` pass it to `buildFixtureModel` or still remove other directories; `typecheck` is clean. `polaris-anchor-resolution` and `tuple-encoding` dropped their `cleanups`/`rmSync` entirely; `sharedFixtureModels` keeps its own cleanup list.

## Gates at 7ef5ea09 (detached scratch worktree, `npm ci` first)

- `npm run typecheck`: exit 0.
- `npm test` (unit): 167 files, 3658 tests passed.
- `npm run test:integration`: 88 files, 2549 tests passed. restart.test.ts did not flake.
- `npx vitest run --project e2e`: ran with Chrome; the migrated browser files passed (read from output, not exit code).
- `npm run test:tiers`: ok, every test file in exactly one tier (282).
- `python3 scripts/check_governance.py`: 32 OK, 21 WARN, 0 FAIL (53 checks).

## Exceptions

None that change the verdict. Note for the author: #687 depends on nothing in #684 except the identical manifest hunk; whichever merges second rebases without conflict.
