# R-GP-IMPL-CHROME-SINGLETON-4 — CC-REV-1 implementation review of syzygy-emkz (PR #658), round 1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: d9e170eb926373110a03e3afef6dcfcbd9a53c0b
Subject: PR #658

Subject bytes: `git diff 5ee1c1a1...d9e170eb` (merge base `5ee1c1a1fa1ce53fc66644301aa8da6452214ad8`, equal to `origin/main` at review time). Two files: `apps/three-surface-poc/src/cdp-browser.ts` (+22 -12) and `apps/three-surface-poc/src/cdp-browser.test.ts` (+27 -4).

Reviewer: independent fresh-context reviewer (review bead `syzygy-suf7`), 2026-11-04. Governing references: bead `syzygy-emkz`; `docs/reviews/R-GP-IMPL-CHROME-SINGLETON-3-RAW.md` (E1, N1-N3). Nothing in the subject, the PR or the tracker was changed. Scratch: a detached worktree at the head under `/tmp/r658wt` with its own `npm ci`, `TMPDIR=/tmp/r658`, removed afterwards.

## Verification

| # | Command (at `d9e170eb`) | Result |
|---|---|---|
| 1 | `npm run typecheck` | exit 0 |
| 2 | `npx vitest run apps/three-surface-poc/src/cdp-browser.test.ts apps/three-surface-poc/src/cdp-browser.browser.test.ts` | 2 files, 33 passed (unit 31, real-Chrome e2e 2) |
| 3 | `npm test` | 167 files, 3643 passed |
| 4 | `python3 scripts/check_governance.py` | "32 OK, 21 WARN, 0 FAIL (53 checks)" |
| 5 | `gh pr checks 658` | `node (unit)` pass; `checks`, `node (e2e)`, `node (integration)` pending at review time |
| 6 | Comment-stripped `ts.transpileModule` emit of `cdp-browser.ts`, merge base vs head, `diff` | exactly three lines differ, listed below |

## Behaviour (GP-Q0)

[Observed: row 6.] The only emitted differences are the optional third parameter `readLink = readlinkSync` of `chromeSingletonDirectory`, its use `dirname(readLink(link))` in place of `dirname(readlinkSync(link))`, and `options.readLink` forwarded by `removeBrowserProfile`. With the option absent the default is the identical call, so every accepted and refused case is unchanged. [Observed] The only production caller passing options is `removeBrowserProfile(path, { singleton })` inside `launchBrowser`; it passes no `readLink`, and `singleton` short-circuits `chromeSingletonDirectory` entirely. The other production call, `chromeSingletonDirectory(profile)`, passes none. No CDP launch argument or spawn option changed. `removeTemporaryDirectory` receives the extra `readLink` member through `options` and ignores it (it reads only `maxAttempts` and `remove`).

## Mutants (rule 6), run at the head

| Mutant | Edit | Result |
|---|---|---|
| M1 (the PR's N1 mutant) | `readLink(link)` moved ahead of the two owner checks in `chromeSingletonDirectory` | 3 failed, 28 passed: the three refusal tests fail on `readLink` having been called. Confirmed |
| M2 | `removeBrowserProfile` stops forwarding `options.readLink` (`chromeSingletonDirectory(profile, options.lstat)`) | 31 passed, 0 failed. SURVIVES |
| E1a | `closeDisposableBrowser(... child, profile ...)` at line 606 changed to pass `other` | the new case fails (`expected 'other' to be 'profile'`). Confirmed |
| E1b | a new multi-line `removeBrowserProfile(\n p,\n)` call appended to `cdp-browser.ts` | passes. SURVIVES |
| E1c | the `mkdtempSync` line's prefix changed so the pinned literal no longer matches | fails (`Target cannot be null or undefined`, a poor message but a failure) |

## Exceptions

- **E1 (low). N1's seam is not pinned as wired.** M2 survives: all three new assertions are `expect(readLink).not.toHaveBeenCalled()` on refusal paths, which also hold when the seam is never reached. No test shows the injected `readLink` is called on an accepting path, so the seam can be unplugged without a failure, and the "reading the link before the owner checks fails those tests" claim in the PR body holds for M1 only. One accepting-path case with `expect(readLink).toHaveBeenCalledWith(link)` closes it.
- **E2 (low). The E1 pin skips call shapes it does not match.** The call-site regex matches single-line `closeDisposableBrowser(` / `removeBrowserProfile(` forms, and the loop checks only the matches (`calls.length > 0`), so a new multi-line call passing another path is not seen (E1b). The mkdtempSync count and the single-file naming check do hold. A count of all `removeBrowserProfile(` / `closeDisposableBrowser(` occurrences against the matched calls would make a missed shape fail.

## Notes

- N1. The new test asserts source text, which the test-growth gate discourages. Here it is the contract the comment states (E1 of round 3 asked to state or enforce the sole-creator premise), so it is defensible; it will fail on a reformat of the pinned `mkdtempSync` line, which is the intended trip-wire. [Inferred]
- N2. Comments checked against the code: "`mkdtempSync` (mode 0700, even under umask 0)" matches round 3 row 7; "the window before `rmSync` is in removeChromeSingletonDirectory" and the "12 of 1000 trials" figure moved intact with the identity-`lstat`/`rmSync` comment; "the owner check covers the final path component only, not its mode" matches `ownedByRunningUser`. The new `[Inferred from permission semantics]` markers are accurate (a 0700 directory can be modified by its owner or a privileged account; root is not named in the second marker, a nit).
- N3. The PR body states `Tests: +1 ~3 -0`; the diff adds one case and changes three. Matches.

No revise finding. Exceptions E1 and E2 are test-strength only; no product behaviour is at issue.
