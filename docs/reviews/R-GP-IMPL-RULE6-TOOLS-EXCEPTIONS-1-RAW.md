# R-GP-IMPL-RULE6-TOOLS-EXCEPTIONS-1 — CC-REV-1 implementation review of syzygy-pghd (closing E1-E4 of R-GP-IMPL-UNIT-GUARD-RULE6-1 in the rule-6 evidence tools), round 1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: e9dc6d512f4abae70638876db8b8216aa830d38d
Subject: PR #657

Reviewer: fresh-context beads-pr-reviewer-worker (syzygy-jx2u). Three files, +34 -8 (`rerun_rule6_mutants_selected_tests.py`, `rule6_projects.py`, `rule6_timeout_rerun.py`).

## Method
- Scratch detached worktree at e9dc6d51 (`git rev-parse HEAD` checked), TMPDIR `/tmp/r657`, every command in the foreground.
- `python3 -I scripts/<tool>.py --selftest` at the head, exit 0: rerun_rule6_mutants_selected_tests 9 cases, rule6_projects 11, rule6_timeout_rerun 10, rule6_mutation_runner 13 (unchanged).
- `scripts/check_governance.py` at the head: 32 OK, 21 WARN, 0 FAIL (53 checks).
- Each original gap re-applied by `sed` on the head, selftest read, then `git checkout` of the file:
  - E1: `or result['fileErrors']` removed from `classify`: FAILS, naming both new cases (failed + fileErrors scored killed; fileErrors with exit 0 scored survived).
  - E2: `os.killpg(p.pid, signal.SIGKILL)` replaced by `p.kill()`: FAILS, `['the whole process group dies on timeout']`; the call blocked 61 s (the grandchild held the pipe) so the 20 s bound is what trips it.
  - E3: `total - skipped <= 0` reverted to `total == 0`: FAILS, `((5, 0, 0, False, 5), 'errored', 'passed')`.
- E2 timing: idle run of the whole rule6_projects selftest 4.05 s; with 36 busy-loop processes on 12 cores (load average 6 to 9 beforehand) three runs took 4.19, 4.25, 4.29 s. The assertion bound is 20 s against a 3 s kill limit (about 3 s of the 4 s is the limit itself), so the margin is large. The thinner margin is the 3 s limit itself: the child must start, spawn the grandchild and write the pidfile before it fires, else `gpid` is None and the check fails; that held under 3x oversubscription but is not proven at higher load. The poll of the grandchild's death allows 5 s, treats a zombie as dead, and the cleanup `SIGKILL`s a survivor, so a failing run leaks no sleeper (checked with `pgrep` after the mutant run: none).
- E4 reasoning checked against `vitest.tiers.ts` (`TIER_LISTS` has `integration`, `e2e` and `live` only; the header says a test not in them is a unit test) and `tier_of`: it returns `unit` for any path no list names, so refusing unknown files would refuse every unit test. The author's argument holds. Behavior of vitest on a missing file checked directly, see E5.

## Scoring effects (past records)
- E1 and E2: fixtures and a selftest only; no scoring code changed. No past record changes meaning.
- E3 is the one scoring change: `rule6_timeout_rerun.outcome` now scores `errored` where it scored `passed` for a run in which every result is neither passed nor failed (skipped, todo, pending, disabled). A mutant run that reported `passed` only because all its tests were skipped would now be `errored`. A record produced before this head carries no `skippedTests` key, so its past `passed` rows cannot be re-scored from the record; none was re-derived here. Direction is only passed to errored; no killed or survived-equivalent outcome moves. The new `skippedTests` field is additive.
- The skip definition differs in form from `rule6_mutation_runner.classify` (that parses vitest's summary and counts `skipped|todo`; this counts every JSON status other than `passed` and `failed`): on vitest's JSON statuses (`passed`, `failed`, `skipped`, `pending`, `todo`, `disabled`) they agree on what did not run. Not faulted.

## Findings (none blocks merge)
- E5 (docstring, new): the corrected `rule6_projects.py` sentence says "a missing one runs no test and scores `errored`". That holds only when the missing file is the sole filter. Checked at the head with `npx vitest run --project unit packages/support/src/decode-utf8.test.ts packages/support/src/nonexistent-zzz.test.ts`: 1 file, 6 tests passed, the missing path silently dropped (exit 0); the lone missing path alone exits with an error and no test, which scores `errored`. So a mutant naming one real and one misspelled file is scored on the real one only. The claim should say a missing file is dropped and the mutant scores on the remaining files, `errored` only when none remain. Behavior is unchanged from before the PR; only the new sentence overstates.
- N1 (note): the E2 selftest's pass depends on the 3 s kill limit being long enough for the grandchild's pidfile write; a larger limit (5 s) would cost 2 s and remove that dependence.
- N2 (note): the corrected docstring line in `rule6_projects.py` has lost the comma after "span tiers" ("span tiers never guessed;"), which reads as a run-on.

## GP-Q0 note
Evidence tools only, not a daemon path or a `check_governance` rule; the one scoring change (E3) is the one the bead asks for and is stated above. No owner question raised.

## Test growth
Selftest fixtures: +2 cases (rerun_selected), +3 (timeout_rerun), +1 check (rule6_projects). Expected values are literals; no cloned setup.

Verdict: CONFIRM WITH EXCEPTIONS
