# Review: PR #672 (syzygy-7o89) cdp-browser readLink pins and multi-line call sites
Verdict: CONFIRM
Reviewed commit: 7b1b8ea1f2bc8feb0ef779cc4a2b46f7ff27ff67
Subject: PR #672

## Scope

Bead syzygy-7o89 asks for two pins from R-GP-IMPL-CHROME-SINGLETON-4 (PR #658):
E1, that `removeBrowserProfile` forwards `options.readLink`; E2, that the
call-site source test sees multi-line `closeDisposableBrowser` and
`removeBrowserProfile` calls. The PR changes one file,
`apps/three-surface-poc/src/cdp-browser.test.ts` (+27 -4), and no source.

## Coverage of the bead

- [Observed] E1: new test "reads the profile's link through the readLink it
  is given" asserts the injected `readLink` is called exactly once with the
  `SingletonSocket` link and that the victim directory is removed.
- [Observed] E2: the call-site test now finds each call by name, balances
  `(`, `{` and `[`, splits at depth-1 commas, and reads the profile argument.
  It pins 3 `closeDisposableBrowser` calls and 0 direct `removeBrowserProfile`
  calls.

## Gates at 7b1b8ea1 (scratch detached worktree, npm ci first, TMPDIR /tmp/r672)

- typecheck: exit 0.
- npm test: exit 0; 167 files, 3646 tests passed (restart.test.ts did not flake).
- check_governance: exit 0; 32 OK, 21 WARN, 0 FAIL.

## Reviewer rule-6 mutants (own, beyond the author's M1-M3)

Each run against `cdp-browser.test.ts` (32 tests at baseline), then reverted.

- N1 `options.lstat, options.readLink` -> `options.lstat, undefined` (line 370): killed by the new readLink test.
- N2 readLink passed in the lstat slot: killed by 4 tests, including the new one.
- N3 line 583 `child, profile, group` -> `child, dirname(profile), group`: killed by the call-site test.
- N6 line 606 profile argument -> `(group ? profile : profile)`, a comma-free ternary inside parentheses: killed by the call-site test.
- N7 line 606 profile argument -> a template literal containing `,)`: killed by the call-site test (argument no longer reads `profile`).
- N8 line 330 `readLink` invoked twice: killed by `toHaveBeenCalledExactlyOnceWith`.
- N4 line 541 `(options.removeProfile ?? removeBrowserProfile)(profile)` -> `(dirname(profile))`: SURVIVED.
- N5 line 548 `(path) => removeBrowserProfile(path, { singleton })` -> `removeBrowserProfile(dirname(path), ...)`: SURVIVED.

## Findings

- [Observed] N4 and N5 survive because the scan excludes the arrow-body form
  (`(?<!=>\s*)`) and does not match the parenthesised-callee form. Both
  exclusions are inherited from the pre-PR regex (`(?<!=> )` and a name-anchored
  `closeDisposableBrowser(`), so the PR does not regress them. They are outside
  the two gaps the bead names. Non-blocking.
- [Inferred] The hard-coded `closes.length` of 3 will need a bump when a fourth
  close site is added; this is a deliberate census pin, not a defect.
- [Observed] The new test follows the nearest existing test's `linkedProfile()`
  setup rather than cloning it. PR body states `Tests: +1 ~1 -0`, matching the diff.

## Verdict

CONFIRM. Both bead items are pinned, the author's three mutants plus six of my
own are killed, and the gates are green at the reviewed head. The two surviving
mutants are pre-existing exemptions and are noted, not required.
