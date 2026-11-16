# R-RECORDER-SELFTEST-WORDING-1 — PR #575 review of syzygy-wsei (review bead syzygy-awig)
Verdict: CONFIRM
Reviewed commit: a9980775f4126893bf5041c35fb82ab37a626e8d
Subject: git diff ca65b1beb375fce350ac0fbbc8f608c53a76a6c1 a9980775f4126893bf5041c35fb82ab37a626e8d sha256 8e976c90998c2f9d58d29985536f05359f8f0ab1ca1296f2da4096a95bc22fe7

Reviewer: fresh-context PR-review worker (Claude Sonnet 5.5), GitHub login Tzeusy, 2026-11-02.
Base: merge base `ca65b1be`; `origin/main` is `e423811a`. No rebase performed.
Scope: one commit, three files, +21 -6: `scripts/record_contract_readability_restyle.py`,
`scripts/record_spec_policy_readability_restyle.py`, `scripts/record_rfc7_scoped_values_successor.py`.

## Verdict basis

No finding. The claim holds: the three selftests asserted Python's own `strptime` text,
and that text differs by interpreter. Each recorder now says its own refusal.

## Checks run

- [Observed] The wording differs. On this host `datetime.strptime('2026-02-30T00:00:00Z', ...)`
  raises `day 30 must be in range 1..28 for month 2 in year 2026` under Python 3.14.4
  and `day is out of range for month` under 3.12. The old fixture asserted the substring
  `day is out of range`.
- [Observed] The validation is unchanged apart from the message. In each script the
  diff replaces the bare `datetime.strptime(instant, "%Y-%m-%dT%H:%M:%SZ")` with the same
  call inside `try`, re-raising `ValueError("invalid act instant: not a calendar date")
  from None`. The format string, the `INSTANT` regex gate before it, and the
  exception type are the same.
- [Observed] No other refusal path is affected. The first refusal
  (`INSTANT.fullmatch`, text `invalid act instant`) lacks the new suffix, so the fixture
  (`2026-02-30T00:00:00Z`, which matches the regex) can only pass through the calendar
  branch. Each script has exactly one `strptime` call (`grep -n strptime`). The
  `except` wraps only that call. `git diff` touches no other hunk.
- [Observed] No other code asserts the old wording. `git grep -F 'day is out of range'`
  at the head returns 0 files in any tracked path, evidence included.
- [Observed] No digest-bound or act-bound artifact changed. The diff lists three files,
  all under `scripts/`. None of them is a row of any package manifest or a key of
  `ACT_DIGEST_COPY_FILES`. The base-side sha256 of each script (`df4db1f2…`, `17b0bde4…`,
  `d0630046…`) is cited by tracked files only under
  `docs/evidence/p115-implementation-authorization-2026-10-28/` (CONSUMER-CENSUS,
  CURRENT-SOURCE-REFRESH, MANIFEST, SOURCE-BINDINGS), where each is a retained-source
  census row tied to a `sourceHead`. That is a historical snapshot of the sources at
  preparation, not an act argument, and nothing in the repo compares it to the working
  tree. See the note below.
- [Observed] The three selftests at the exact head (`git rev-parse HEAD` =
  `a9980775f4126893bf5041c35fb82ab37a626e8d`, clean tree): contract restyle 33 fixtures,
  spec-policy restyle 34, rfc7 scoped-values 33, each `0 failing`, exit 0. The same under
  `python3.12` and `python3.14`. Python 3.11, which CI uses, is not installed here.
- [Observed] `python3 scripts/check_governance.py`: `32 OK, 21 WARN, 0 FAIL (53 checks)`,
  exit 0. `python3 scripts/check_governance.py --selftest`: `406 fixtures, 0 failing`.
- [Observed] `gh pr checks 575`: `checks` pass (25m30s) and `node` pass (4m42s). Both ran on
  the head `a9980775`.
- [Observed] Merge: `git merge-tree --write-tree origin/main origin/agent/syzygy-wsei`
  exits 0, and `origin/main` has no change to the three scripts since the merge base
  (`git diff --stat ca65b1be origin/main -- <three paths>` is empty).

## Rule-6 mutations (run on the head, each script, reverted with `git checkout`)

- [Observed] Mutant A, calendar check removed (the `strptime` line replaced by `pass`):
  the `invalid instant` fixture FAILs in all three scripts (`1 failing` each).
- [Observed] Mutant B, wording reverted to `day is out of range`: the same fixture FAILs
  in all three scripts (`1 failing` each).
- [Observed] Unmutated: 0 failing, so each fixture fails only for its own mutant.

## Notes (none changes the verdict)

- [Inferred] The P115 evidence rows hash the pre-change scripts. They are retained
  history, and the PR does not need to touch them.
- [Unknown] Behaviour on Python 3.11 was not run here. The fixed text no longer depends
  on the interpreter's wording, and CI's `checks` job passed on the head.
- [Observed] The new tests are +0 ~3 -0, as the PR body states. This is an edit to the
  three existing assertions, not new tests.
