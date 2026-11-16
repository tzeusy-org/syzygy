# Review: PR #674 (syzygy-7auj), CG-26 wrap selftest fixtures

Verdict: CONFIRM
Reviewed commit: 03016282080d70de985aa49dbd92c9d3270ee6a1
Subject: PR #674

Reviewer ran every command in the foreground in a scratch detached worktree at the reviewed commit (TMPDIR /tmp/r674, deleted afterwards).

## Scope of the diff

[Observed] One file, `scripts/check_governance.py`, +27 -1. Every hunk lies inside `selftest()` (first hunk at line 8176, after the function's start); no hunk touches `cg26_battery_parity` (the claim regex is at line 6670) or any other non-selftest code.

## Does the PR cover all 10 joints?

[Observed] Yes. The `claims = list(re.finditer(...))` regex at line 6670 has exactly ten `\s+` joints outside the number phrase: number/checks, checks/above, above/are, are/the, the/same, same/number, number/the, the/hosted, hosted/workflow, workflow/runs. Fixtures: three pre-existing (checks/above, same/number, number/the) plus seven new. Each new fixture asserts `words.startswith(before + " ")` so the wrap point is checked.

## Does CG-26 accept/refuse behaviour stay unchanged?

[Observed] Yes. The diff adds no production line. There is no GP-Q0 matter.

## Rule-6 mutants run by this reviewer

Each applied alone to the first `claims` regex, then `python3 scripts/check_governance.py --selftest`:

- `({phrase})\s+checks` to a single space: killed by exactly 1 fixture, "wrapped at number/checks".
- `checks\s+above` to a single space: killed by exactly 1, checks/above.
- `above\s+are` to a single space: killed by exactly 1, above/are.
- `are\s+the` to a single space: killed by exactly 1, are/the.
- `the\s+same` to a single space: killed by exactly 1, the/same.
- `same\s+` (before the second phrase) to a single space: killed by exactly 1, same/number.
- `({phrase})\s+the` to a single space: killed by exactly 1, number/the.
- `the\s+hosted` to a single space: killed by exactly 1, the/hosted.
- `hosted\s+workflow` to a single space: killed by exactly 1, hosted/workflow.
- `workflow\s+runs` to a single space: killed by exactly 1, workflow/runs.
- `if folded else ""` to `if True else ""`: killed by exactly 1, "absent count sentence gets no case note".
- `matching only when case is ignored was` to `matching only when case differs was`: killed by exactly 1, "capitalized count names case in the finding".
- `re.I` dropped from the folded search: killed by exactly 1, the same capitalized fixture.

[Observed] 13 of 13 mutants killed; the working tree was restored after each (`git status` clean).

## Gates at the reviewed commit

- `python3 scripts/check_governance.py --selftest`: "433 fixtures, 0 failing".
- `python3 scripts/check_governance.py`: "32 OK, 21 WARN, 0 FAIL (53 checks)".

## Findings

None blocking.

- [Inferred] The `claims` and `folded` regexes are duplicated; the fixtures pin only `claims`, so a joint mutated in `folded` alone changes only the case note. Out of scope for this PR (the folded copy only shapes a message).
- [Observed] The PR body's "+8 ~1" matches the diff: seven wrap fixtures plus one case-note fixture added, one fixture tightened.
