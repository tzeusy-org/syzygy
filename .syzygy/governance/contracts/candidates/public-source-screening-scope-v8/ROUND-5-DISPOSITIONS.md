# Round-5 dispositions — public-source screening scope, version 8

> **Candidate — binds nothing.** Dispositions of
> `docs/reviews/R-SCREENING-SCOPE-V8-5-RAW.md` (verdict
> `CONFIRM WITH EXCEPTIONS`, line 4, over `b311bdbf`). The raw is retained
> verbatim and is not edited. One exception (X1) requires a change, so the
> round failed the offer condition and went back to the owner. The owner
> answered on 2026-11-08, "Repair X1, scoped round 6 (Recommended)": repair
> X1, fold in the notes, and run one more review scoped to these repairs.
> The repairs below are unreviewed; the round-6 brief is `REVIEW-BRIEF.md`.
> Line numbers here are this commit's, re-derived from the files.

| # | Finding (raw) | Disposition | Where |
|---|---|---|---|
| X1 | The launch records' location may hold every decision record the reference carries from the trunk, so "whose kind cannot be read" either refuses every run or lets an unrecognised file be ignored (raw lines 74–131) | **Repaired.** For launch records the population is now every file that a recording commit on the dedicated reference added at the launch records' location (a recording commit adds new files only), a drawer or provider statement included, and no file the reference holds that no recording commit added. A decision record carried from the trunk is not a candidate; an unrecognised file a recording commit added still refuses. The phrase "that a recording commit on the dedicated reference added" is pinned, with its own selftest mutation | builder `sourceVisibility.rule` and `RULE_PHRASES`; SEMANTIC-DELTA lines 57–62; IMPACT-LEDGER lines 58–67 and the fixtures (a trunk-carried decision record is not a candidate); packet lines 97–103 |
| N1 | The check records and review packets hold the object id, not the size (raw line 220) | **Repaired (wording).** The signed text now says the object id and size are kept "if at all, only in" those records, an upper bound. The delta, ledger and packet add that today those records hold the object id and no size | builder edit 7 and `consequence`; SEMANTIC-DELTA lines 113–117 and the digests row (line 148); IMPACT-LEDGER lines 81–85; packet lines 47–49 |
| N2 | The fidelity packet's rendered sha256 covers a withheld span's object id, but confirms nothing without the run directory (raw line 229) | **Carried as a note.** Not disclosed in the packet: the reviewer's claim is Inferred and was not re-derived here, and it adds nothing beyond the run-directory residual already stated | — |
| N3 | An object-read refusal names the object id in the command's result, on the operator's terminal (raw line 237) | **Carried as a note.** Not disclosed in the packet: the raw finds it neither rendered nor sent, and whether a resource-limit refusal counts as "withheld" is a reading of the code-structure rule, not one line of truth | — |
| N4 | The packet's answer 1 paraphrased the record while claiming to quote it; the warning covered "name" without URL (raw line 246) | **Repaired.** Answer 1 now quotes the record's words, "No: the launch answer suffices" (record at `8a4e624b`, line 64, read with `git show`), and the costs bullet now says "name and URL" | packet lines 118 and 134–136 |
| N5 | Cost wording lagged the signed text in three places (raw line 252) | **Repaired.** The delta says "one malformed or unreadable file"; the ledger restores "not shown to be revoked or superseded"; the packet says "until it is read or a later record revokes it", noting that records are only ever added | SEMANTIC-DELTA lines 71–72; IMPACT-LEDGER line 62; packet lines 99–101 |

Selftest: 51 of 51 (4 controls, 47 mutations). New case: drop the pinned
phrase "that a recording commit on the dedicated reference added".
