# R-GP-IMPL-TEST-KIT-MIGRATE-4: PR #667 round 2 (syzygy-c7kd, start-gates no-maintenance env restored)
Verdict: CONFIRM
Reviewed commit: 2d783fe76e58b2fef7703daa6d85107357a108f4
Subject: PR #667 (round 2)

Reviewer: fresh-context CC-REV-1 round-2 pass over round-1 exception E1 (`R-GP-IMPL-TEST-KIT-MIGRATE-3-RAW.md`, not edited). Scratch detached worktree at 2d783fe7 after `npm ci`, TMPDIR=/tmp/r2667, every command in the foreground. Merge base with origin/main is c6716d73.

## Diff read

`git diff 2d783fe7~1 2d783fe7` touches `packages/polaris-dossier/src/start-gates.test.ts` alone (+8 -1). The five three-surface-poc-core test files, `package.json` and the lockfile are unchanged since round 1.

## E1 closed: every call runs under the no-maintenance env

- Line 17 imports `GIT_ENV_NO_MAINTENANCE as GIT_ENV`; the kit defines it as `GIT_ENV` plus the four `GIT_CONFIG_COUNT/KEY/VALUE` keys for `gc.auto=0` and `maintenance.auto=false` (`packages/test-kit/src/git-repo.ts:7,10`). Same keys and values as the removed local `GIT_ENV`.
- Local `gitIn(cwd, ...args)` (line 27) runs `execFileSync('git', ['-C', cwd, ...], { env: GIT_ENV })`. The kit's `git` is no longer imported (line 17 imports `GIT_ENV_NO_MAINTENANCE` and `tempDir` only).
- Enumeration: every `execFileSync` in the file (lines 27, 72, 73, 75, 80, 85, 86, 194, 434, 455, 979, 980, 984, 986, 987) passes `env: GIT_ENV`; a grep for `execFileSync` lines lacking `env: GIT_ENV` returns only the import line. The two helper aliases (`const git = (...) => gitIn(origin, ...)` line 41, `const git = gitIn` line 247) route through `gitIn`; their call sites (lines 45-65, 258-295, 433-436, 482-496) therefore run under it.

## Mutant fails

Line 17 changed to `import { GIT_ENV, tempDir } from '@syzygy/test-kit'` (plain env): `start-gates.test.ts` gives 1 failed, 104 passed; the failure is `runs the fixture git helpers with automatic gc and maintenance off (syzygy-y733)`. Reverted with `git checkout`; tree clean. Unmutated, that test passes.

## Parity

Vitest JSON over `start-gates.test.ts` at origin/main and at the head: base 104 tests, head 105, all passed. The (fullName, status) sets differ by exactly one member, the new y733 test; nothing is only in base.

## Battery at 2d783fe7

- `npm run typecheck`: no output beyond the banner, exit 0.
- `npm test` (unit): 167 files, 3644 tests passed.
- Integration over `packages/polaris-dossier` and `packages/three-surface-poc-core`: 23 files, 1121 tests passed (round 1 had 1120; the difference is the new test).
- `python3 scripts/check_governance.py`: 32 OK, 21 WARN, 0 FAIL (53 checks).

## Findings

None. E1 is resolved; round-1 notes are unchanged by this commit.
