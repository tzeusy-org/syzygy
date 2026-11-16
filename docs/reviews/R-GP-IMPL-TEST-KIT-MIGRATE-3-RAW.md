# R-GP-IMPL-TEST-KIT-MIGRATE-3: PR #667 round 1 (syzygy-c7kd, start-gates git env and three-surface-poc-core tests onto the test-kit)
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: e342b9b6eb9018bbb18fff3c541b3c0dc0dcd142
Subject: PR #667

Reviewer: fresh-context CC-REV-1 round-1 pass. Scratch detached worktrees at the head (e342b9b6) and at its merge base with main (16ef447a, PR #648), each after `npm ci`, TMPDIR=/tmp/r667, every command foreground. Note: origin/main had moved to a7c1fa98 when the review ran; the base used for the parity comparison is the PR's own merge base.

## Diff read (16ef447a..e342b9b6)

Eight files, +34 -77: `package-lock.json` (+3), `packages/three-surface-poc-core/package.json` (+3), `packages/polaris-dossier/src/start-gates.test.ts`, and five three-surface-poc-core test files (`code-structure`, `materialization`, `model-observations`, `test-artifact-verification`, `worker-change-observation`). `model.test.ts` is not in the diff.

## Commands run (head)

- `npm run typecheck`: exit 0.
- `npm test` (unit): 167 files, 3644 tests passed.
- Integration tier for the touched packages (`vitest run --project integration packages/polaris-dossier packages/three-surface-poc-core apps/three-surface-poc/src/product-build.test.ts`): 23 files, 1120 tests passed.
- `workspace-reach.test.ts` (unit tier): 81 passed. `product-build.test.ts` and `no-egress.test.ts` (integration tier): passed within the run above (no-egress is under `packages/polaris-dossier`; product-build named explicitly).
- `python3 scripts/check_governance.py`: 32 OK, 21 WARN, 0 FAIL.
- `gh pr checks 667` at read time: node, node (unit), node (integration), node (e2e) pass; the `checks` aggregate pending.

## Behaviour parity

Vitest JSON (`--reporter=json`) at base and at head, unit project over the two unit-tier files and integration project over the five integration-tier files (the seven files the PR body names, `model.test.ts` included): 201 tests, 201 passed, 0 failed at both; the (file, full title, status) maps are equal in both directions (201 keys each, symmetric difference empty).

## Assertions

The diff touches no `expect(` line: every removed line is an import, a `cleanups` declaration or `afterEach`/`afterAll`, a `mkdtempSync`/`cleanups.push` pair, or the inline env and git helper in start-gates. No assertion lost.

## Findings

E1 (exception, not a revise): the start-gates `git` helper no longer runs under the no-maintenance environment. Base `GIT_ENV` was `{...process.env, GIT_CONFIG_GLOBAL, GIT_CONFIG_SYSTEM, ...NO_MAINTENANCE, dates}`. The PR aliases the kit's `GIT_ENV_NO_MAINTENANCE as GIT_ENV` for the remaining `execFileSync` sites and that object is key-and-value identical to the base one (compared by a scratch vitest file, since deleted: sorted entry lists equal). But the two helpers it replaced (`git` inside `beforeAll`, and the `git` in the clone-shape describe, `start-gates.test.ts` lines 38 and 240) now call the kit's `git(cwd, ...)`, which runs under the kit's plain `GIT_ENV` (`packages/test-kit/src/git-repo.ts`), without `GIT_CONFIG_COUNT=2`, `gc.auto=0`, `maintenance.auto=false`. A scratch run showed the plain kit env carries only the ambient `GIT_CONFIG_COUNT` of the host (credential keys), not the gc keys. So the PR body's "the inline env had the identical key set and values" is true of the object and false of the calls: those commit, checkout and repack calls lost the syzygy-y733 protection (a detached `git maintenance run --auto` can write while the fixture is removed). No test failed. Repair: a one-line local helper `execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', env: GIT_ENV }).trim()`, or a kit `git` that takes an env.

N1: `Tests: +0 ~0 -0` and "7 touched files": six test files changed, none of their titles, counts or statuses (the parity above), so +0 -0 holds; `model.test.ts` is the seventh file of the parity run and is unchanged. The count of files changed is 8 including the manifest and lockfile.

N2: cleanup moved from per test to end of file. No cross-test interference found: every directory comes from `mkdtemp` under a unique name, the code-structure `beforeAll` block no longer needs its `cleanups.splice` workaround, and the fake-`git` PATH tests restore `PATH` as before. The cost is disk held until the end of each file. `tempDir` returns `realpathSync` paths; parity shows no test depended on the unresolved form on this host.

N3: lockfile change is minimal and correct: `npm install --package-lock-only` at the head leaves `package-lock.json` byte-identical (no diff), and the only hunk is the `devDependencies` entry on the `packages/three-surface-poc-core` workspace block.

N4: `code-structure.test.ts` still imports `tmpdir` and `execFileSync`, both still used (typecheck 0).
