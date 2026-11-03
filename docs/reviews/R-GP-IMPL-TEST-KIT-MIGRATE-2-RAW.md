# Review: PR #648, five polaris-dossier tests adopt the test-kit tempDir (syzygy-teqk)
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 5556e2709f526dc530606d69dd62bdab32297780
Subject: PR #648

Reviewer: beads-pr-reviewer-worker (issue syzygy-daia). Base: origin/main cc9e612834fc46f5ab97176a0baa2debc46fc9d6, which is also the merge base. Every command ran in the foreground in scratch detached worktrees at the head and at the base, each after `npm ci`, with TMPDIR set to a private directory. Method follows `R-GP-IMPL-TEST-KIT-MIGRATE-1-RAW.md` (PR #645).

## Scope read

Five files under `packages/polaris-dossier/src/` change (+28, -39), all `*.test.ts`: credential-probe, doctrine-quote, git-object-reader, launched, session-view. No product, test-kit or config file. Each drops a local `mkdtempSync` / `rmSync` (try/finally, `afterAll`, or `cleanups` push) and imports `tempDir` from `@syzygy/test-kit` (`packages/test-kit/src/temp-dir.ts`).

## Findings

E1 (exception, PR body count). The body says "139 unit and 114 integration assertions". Per tier run at the head, the five files hold 40 unit assertions (credential-probe 32, doctrine-quote 8) and 114 integration assertions (launched 43, session-view 11, git-object-reader 60); 154 in all. The integration figure is right; "139" is not the unit count of these files (40) and matches no population I could derive. The behaviour claim is unaffected.

N1 (note, chmod ordering). `credential-probe.test.ts:35` sets a token file to mode 0o000. Its fix-up (`chmodSync(dir, 0o700)` and each member to 0o700, line 17) is an `afterEach` registered at file scope. The kit removes through `removeTempDirs`, registered on `syzygyAfterTestFile` (`vitest.setup.ts`), which the setup file's `afterAll` drains once the file's tests finish. `afterEach` runs after every test, passing or failing, and strictly before that `afterAll`, so the restore precedes the removal even when the test fails between the chmod and its assertion. The restore is registered when the directory is made, so it covers a failure before the chmod too. Directory and member modes are restored by the same code as before, and `rmSync` uses `force: true`.

N2 (note, teardown timing). Directories now live to the end of the file, not the end of each test. Within a file each `tempDir` call is a unique `mkdtempSync` name, no migrated file uses concurrent tests, and doctrine-quote and session-view's `blockingWhy` test each make their own root. `launched.test.ts` keeps its `cleanups` array for the fs patch and the `keep` fd (lines 25, 126), so only the directory removal moved. `session-view.test.ts` still imports `os` (line 131 uses it). The `keep` fd is closed by `afterEach` before the file-level removal, as before.

N3 (note, kit under failure). Removal rides `afterAll`, which vitest runs after failing tests, so a failure leaves no directory. After every run below `ls $TMPDIR | grep -ci dossier` printed 0. A killed worker leaves directories, as the old code did.

N4 (note, scope). The body names what is not moved (start-gates wrappers, three-surface-poc core tests); the diff touches none.

No exception to the behaviour claim was found. The CONFIRM WITH EXCEPTIONS rests on E1 only, a wrong count in the PR body.

## Evidence

Behaviour preserved, per-file parity:
- `vitest run packages/polaris-dossier --reporter=json` at base and head: numTotalTests 1549 and 1549, passed 1548 and 1548, failed 0 and 0, pending 1 and 1, 35 test files each.
- A script compared per file the sorted (fullName, status) pairs of every assertion result: 0 of 35 files differ, none present on one side only. The five files hold 32, 8, 43, 11 and 60 assertions.
- Lines added and removed by `git diff -U0 cc9e6128 5556e270 -- packages` matching `expect(`, `it(` or `describe(`: 4 added, 4 removed, and as multisets of whitespace-stripped text they are equal (the re-indented doctrine-quote and session-view bodies). No assertion lost or added.

Gates at the head:
- `npm run typecheck`: exit 0.
- `npm test` (unit tier): 166 files, 3629 tests passed.
- `vitest run --project integration packages/polaris-dossier`: 17 files, 1045 tests passed.
- `npm run test:tiers`: "ok: every test file is in exactly one tier".
- `python3 scripts/check_governance.py`: "32 OK, 21 WARN, 0 FAIL (53 checks)".
- `gh pr checks 648` at review time: node, node (unit), node (integration), node (e2e) pass; `checks` pending.
