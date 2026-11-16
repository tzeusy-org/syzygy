# R-GP-IMPL-CG26-COUNT-WORDS-FIXTURES-1 — review of PR #651 (syzygy-r219)
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: f66dbc9c662f07d8df723e38f5a4aea3c889065e
Subject: PR #651

Scope: `scripts/check_governance.py` only (+61/-1). Reviewed in a scratch detached worktree at the head; mutants
rewrote that copy only and the file was restored after each run. Hosted checks (`checks`, `node (unit)`) were pending
when read.

## GP-Q0: no accept/refuse behaviour changed

- `git diff origin/main...HEAD` has two hunks. The production hunk adds a second `re.search(..., re.I)` named
  `folded` inside `if not claims:` and appends `case_note` to the existing finding string.
- The `claims` regex, `_number_word`, `_number_below_hundred` and `_NUMBER_WORDS` are byte-unchanged. `folded` is read
  only to build the message; it never sets or clears a finding and is evaluated only after `claims` is already empty.
  The set of inputs that FAIL, WARN or OK is therefore identical. No owner question.

## Gates on the head

- `python3 scripts/check_governance.py`: exit 0, "32 OK, 21 WARN, 0 FAIL (53 checks)".
- `python3 scripts/check_governance.py --selftest`: exit 0, "425 fixtures, 0 failing".

## Mutants (rule 6): the six from R-GP-IMPL-CG26-COUNT-WORDS-1, each over the full selftest, exit codes read

All six now KILLED (selftest exit 1):
- M1 `1 <= lead <= 9` to `<= 10`: killed by "refused phrases stay unreadable" (`ten hundred`).
- M2 whitespace after `checks above are the same ` made literal spaces: killed by the `checks/above` and
  `same/number` wrap fixtures.
- M3 `if len(rest) != 1: return None` removed: killed by "refused phrases" and "extra tail word after count".
- M4 `chunks[1] != "hundred"` guard removed: killed by "refused phrases" (`one two`).
- M5 `\s+` before `the hosted workflow` made a literal space: killed by the `number/the` wrap fixture.
- M6 `_NUMBER_WORDS.get(chunks[0], 0)` default changed to 1: killed by "refused phrases" (`foo hundred five`).

## Fixture verdicts

- Refused table asserts `None` for seven phrases; accepted table asserts `[99, 100, 105, 105, 213]`. Both are literals,
  not imported from the module under test.
- The three wrap fixtures assert OK; the tail-word fixture asserts FAIL with "cannot read"; the capitalized fixture
  asserts FAIL with a finding containing "case". All verdicts are the intended direction.

## Findings

- E1 (exception): wrap coverage is two joints plus the number/the joint, not the sentence. Replacing each other
  `\s+` of the fixed text with one literal space, one at a time, SURVIVES (selftest exit 0) at: `The <N>`/`checks`,
  `above`/`are`, `are`/`the`, `the`/`same`, `the`/`hosted`, `hosted`/`workflow`, `workflow`/`runs`. Killed: `checks`/`above`,
  `same`/number, number/`the`. M2 and M5 as the earlier review defined them are killed, but the claim "wrapping outside
  the number phrase" is pinned at three of ten joints. A fixture that wraps at every joint would close it.
- N1 (note): the capitalized fixture asserts the substring "case"; a different finding that happens to contain "case"
  would satisfy it. A distinctive phrase (`case is ignored`) would be stricter.
- N2 (note): no fixture asserts the no-sentence finding carries no case note when the sentence is absent entirely.
- Not done: hosted CI on this head was pending; no clean-clone full battery beyond check_governance and its selftest.
