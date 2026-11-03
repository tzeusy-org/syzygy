# R-GP-IMPL-CG26-COUNT-WORDS-1 — implementation review of syzygy-8tsz, round 1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: c40487d47366fa87cbfd1372fcce4013fc4331fa
Subject: PR #630

Reviewer: fresh context, independent of the lane. Branch `agent/syzygy-8tsz`, one file changed
(`scripts/check_governance.py`, +161/-11). No target-repository content was read. Runs were in a scratch detached
worktree at the head; the mutants rewrote a scratch copy only, restored after each run.

## Runs at the head

- `python3 scripts/check_governance.py`: `OK  CG-26 ... 113 checks examined, 0 findings — 113 published, 113 hosted,
  113 shared`; whole run `32 OK, 21 WARN, 0 FAIL (53 checks)`.
- `python3 scripts/check_governance.py --selftest`: `418 fixtures, 0 failing`.
- `gh pr checks 630` at review time: `checks` and `node (unit)` both pending (not yet a result).

## Parser (`_number_word`), probed directly

Read correctly: `one hundred and five` 105, `one hundred five` 105, `one hundred` 100, `two hundred` 200,
`two hundred and thirteen` 213, `nine hundred ninety-nine` 999, `one hundred and ninety-nine` 199, `one hundred ten` 110,
`one hundred twenty-one` 121, `ninety-nine` 99, mixed case and doubled spaces.
Refused (None, so a finding): `one hundred and`, `hundred`, `zero hundred`, `ten hundred`, `twenty hundred`,
`one hundred zero`, `one hundred and zero`, `one hundred-five`, `one-hundred`, `twenty one`, `one hundred twenty one`,
`one thousand`, `one hundred and five and`, `one hundred and one hundred`, `one hundred and ninety-ten`.
No wrong value was found. Out-of-range (1000 and over) is refused, not guessed.

## Scope of "no sentence is a FAIL" (GP-Q0 check)

The new finding sits after the two early exits, so it only applies when both files are readable and the `sh` block under
the battery heading exists; a missing block already FAILed before the change, and an unreadable file still WARNs.
On the current tree CG-26 stays OK. No other check's state changes: the diff touches only `cg26_battery_parity`,
the number helpers and fixtures. The one new failing state is a PROJECT-STATUS count sentence that no longer matches
the recognizer (reworded, digits, capitalized words), which is the bead's stated acceptance ("missing count claims").
No owner question.

## Mutants (rule 6): author's nine not re-run in full; ten of mine, each over the full selftest

Killed (selftest exit 1): zero tail after `hundred` allowed; dangling `and` returns a value; the no-claims finding
disabled (two fixtures fail); `lead * 100` changed to `lead * 10`.
SURVIVED (selftest exit 0), each a real gap in the fixtures, none a wrong output on the current tree:
- M1 `1 <= lead <= 9` widened to `<= 10`: no fixture reads `ten hundred`.
- M2 the whitespace after `checks above are the same ` replaced by single literal spaces: the wrapped fixture
  breaks only inside the number phrase, so wrapping elsewhere in the sentence is unpinned.
- M3 `if len(rest) != 1` replaced by `rest = rest[:1]`: no fixture has a trailing extra word after `hundred and <n>`.
- M4 the `chunks[1] != "hundred"` guard removed: `one two` would read as 100; no fixture feeds a two-word non-hundred.
- M5 `\s+` before `the hosted workflow` replaced by a literal space: the same wrap gap as M2, second position.
- M6 `_NUMBER_WORDS.get(chunks[0], 0)` default changed to 1: nothing feeds an unknown lead word.

## Findings

- E1 (exception): six survivors above. M4 is the most direct: the helper's own docstring promises a `hundred`
  without a leading one-to-nine word is unreadable, and the guard that rejects a non-`hundred` second word is unpinned.
  Add a direct table-driven fixture over the refused list above, plus one fixture that wraps at `checks\nabove` and at
  `same\none hundred`.
- E2 (note): the capitalized form `The One Hundred ...` does not match and now FAILs as "no sentence". That is the
  intended fail-closed direction but the finding text does not say case is the reason.
- Notes: the fixture oracle `_spell` is independent of the parser (good); the default `_st` claim now generates a
  true sentence, which changes what the existing CG-26 fixtures exercise, though all still pass.

Not done: CI result of the head was pending; no clean-clone full battery beyond check_governance and its selftest.
