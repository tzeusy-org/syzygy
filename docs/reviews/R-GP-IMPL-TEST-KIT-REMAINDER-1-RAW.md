# Review: PR #684, thirteen three-surface-poc tests adopt the test-kit tempDir (syzygy-ykfg)
Verdict: CONFIRM
Reviewed commit: 47d8a9c01b8b5dbf19aafbdc7385acfb726a5c7f
Subject: PR #684

Reviewer: beads-pr-reviewer-worker (issue syzygy-vnxv). Base: origin/main e405d03e5320256581772ed015a7f723ef07ba65, which is also the merge base. Every command ran in the foreground in a scratch detached worktree at the head, after `npm ci`, with TMPDIR set to a private directory. Method follows `R-GP-IMPL-TEST-KIT-MIGRATE-2-RAW.md` (PR #648).

## Scope read

Fifteen files change (+56, -89): thirteen `*.test.ts` under `apps/three-surface-poc/src/` (four at the top level, nine under `polaris-generation/`), plus `apps/three-surface-poc/package.json` and `package-lock.json`, which add `@syzygy/test-kit` as a devDependency (the same spelling `packages/three-surface-poc-core` and `packages/polaris-dossier` already use). No product, test-kit or config file changes. Each test file drops its local `mkdtempSync` / `rmSync` / `cleanups` / `afterEach` / `afterAll` and calls `tempDir` from `@syzygy/test-kit` (`packages/test-kit/src/temp-dir.ts`).

## Behaviour, per file

The kit differs from the code it replaces in two ways only: it returns `realpathSync` of the directory, and it removes every directory once, when the test file finishes (`syzygyAfterTestFile`, `vitest.setup.ts:21`), where `afterEach` files used to remove after each test.

1. `capture-test-artifact-main`: `afterEach` removal becomes file-end removal. Paths now canonical. No assertion reads a temp path in a form the real path would change. Identical.
2. `git-blob-batch`: the one gitlink test, same. No git environment was set by the removed code; the `git init`, `gc.auto` and `maintenance.auto` lines are untouched. Identical.
3. `governance-inputs`: `realGovernanceFixture()` is called twice; both directories live to file end. Small (authority files only). The git setup lines are untouched. Identical.
4. `main-entry`: already used `realpathSync(mkdtempSync(...))` in `beforeAll` and `rmSync` in `afterAll`. Now `tempDir` in `beforeAll`, kit removal at file end. Same timing, same realpath. Identical.
5. `dossier-cap-measure`, `redis-shaped-discovery`: `beforeAll` / `afterAll` becomes `beforeAll` / file end. Realpath added. Identical.
6. `dossier-evaluation-main`: `afterEach` becomes file end; `rmSync` is still imported because three tests delete files inside the run directory (lines 61, 70, 77). Identical.
7. `durable-lifecycle`, `durable-lifecycle-generate`: `scratch()` helpers return `tempDir(...)`; `afterEach` becomes file end. Each test still gets its own directory. Identical.
8. `generator-install-check`: `afterEach` becomes file end; each `checkoutWith` call still makes its own directory. Identical.
9. `pipeline-demo` (e2e tier): the onramp clone-and-install scratch is removed at file end instead of after the test; it is the file's only user of the directory. Identical.
10. `public-source-screening`: `fixtureRepo` calls `tempDir` in `beforeAll`; removal moves from `afterAll` to file end. Same timing. Identical.
11. `self-corpus`: the fixture test calls `tempDir` inside the test; `afterEach` becomes file end. Identical.

The `GIT_ENV_NO_MAINTENANCE` loss that round 1 of PR #667 caught does not apply here: none of the thirteen files used a git environment from the removed code, they set `gc.auto` and `maintenance.auto` on the repository with `git config`, and those lines are unchanged in every file.

## Verification

- `npm run typecheck`: exit 0.
- `npm test` (unit): 167 files, 3647 tests, all passed.
- `npm run test:integration`: 88 files, 2549 tests, all passed. `restart.test.ts` did not flake.
- `pipeline-demo.test.ts` is in `E2E_TESTS`, so neither command above runs it. Run alone with `--project e2e`: 5 passed. `product-build.test.ts` (e2e, the guard that no built module imports a test or test support), run alone: 25 passed.
- `python3 scripts/check_governance.py`: exit 0, "32 OK, 21 WARN, 0 FAIL (53 checks)".
- All thirteen files appear in the runs above (11 by the unit and integration runs, `pipeline-demo` by the e2e run). Denominator: the unit and integration logs name `main-entry`, `durable-lifecycle` and `durable-lifecycle-generate` in the unit log and the other nine in the integration log.

## Leaks

TMPDIR was an empty private directory before each run. After `npm test`, after `npm run test:integration`, after `pipeline-demo` and after `product-build`, it held only Node's own `node-compile-cache`. No `syzygy-*` or `poc-*` directory remained.

## Mutants of my own (rule 6)

- M1, the leak check itself: in `dossier-evaluation-main.test.ts` the import is replaced with a local `tempDir` that calls `mkdtempSync(join(tmpdir(), prefix))` and removes nothing. The six tests still pass, and the TMPDIR diff shows 5 left-over `syzygy-dossier-eval-*` directories. The check detects a leak, so the clean result above is not vacuous. This pattern (a file whose directories were removed by `afterEach`) was not among the author's samples.
- M2, symlinked temp directory: the unit and integration tiers were rerun for the twelve files that run there, with TMPDIR set to a symlink to the private directory (`/tmp/r684/link`), the only case where the kit's `realpathSync` differs from the old `mkdtempSync` result. 12 files, 214 tests, all passed, and nothing was left behind. So no test depends on the non-canonical path.

## Findings

None that change the verdict.

- N1 (nit, no action required): whitespace left behind by the edits. `main-entry.test.ts` now starts with an empty first line; `capture-test-artifact-main.test.ts` and `dossier-evaluation-main.test.ts` each have two consecutive blank lines where the `cleanups` lines were; `capture-test-artifact-main.test.ts` `scratch()` is now `const dir = tempDir(...); return dir;` and could return the call directly.
- N2 (note): removal now happens at file end for every `afterEach` file, so the directories of one file coexist. The largest is the `pipeline-demo` clone-and-install, which is one test. Not a problem at present; it would be one for a file that makes many large directories.
- N3 (out of scope, stated): 28 test files under `apps/three-surface-poc/src/` still contain `mkdtempSync` at this head (`grep -rl mkdtempSync apps/three-surface-poc/src --include=*.test.ts`), which is the remainder the PR says it leaves.

## Not verified

Hosted CI on this head was not consulted; the local runs above are the evidence. Only the Linux host was exercised.
