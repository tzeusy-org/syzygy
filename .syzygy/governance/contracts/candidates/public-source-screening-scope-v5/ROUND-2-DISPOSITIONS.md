# Round 2 dispositions — public-source screening scope, version 5

> **Candidate — binds nothing.** The raw is
> `docs/reviews/R-HA5B-SCREENING-SCOPE-V5-2-RAW.md`: verdict
> `CONFIRM WITH EXCEPTIONS` (line 5), over `9daf9e04`. It has three notes and no
> revise or blocking finding. Under the stopping rule agreed before round 1, a
> notes-only round 2 **clears the bytes it read**. So no package file reviewed
> at `9daf9e04` is edited: an edit would retire the review (verification rule
> 10). The notes are classified here for the owner and for the install.

The raw also discloses (lines 18-22) that the shell became unavailable late in
the review, so its criterion-9 word sweep was done by reading the files rather
than by a second scripted method. The builder's 64-hex predicate and its
mutant ran before that.

| Finding | Classification | Where it lands |
|---|---|---|
| 1 — the packet's residual list omits `--pass`; `ROUND-1-DISPOSITIONS.md` line 17 says both lists add it | **Accepted as a note, not repaired.** The packet's list reads "such as", and `--pass <password>` is the same shape as `-a <password>`, which the packet names. The delta (lines 278-279) names `--pass`. The round-1 disposition sentence overstates its own repair for the packet; it stays as written, since it is among the reviewed bytes. | for the owner to see before signing |
| 2 — the packet names vendors (OpenAI, GitLab, Google, Azure) whose other key forms T does not catch | **Accepted as a note, not repaired.** The delta binds and lists the exact forms, and none of the uncaught forms is a loosening: each passes version 4 too. The uncaught forms are OpenAI `sk-svcacct-`, `sk-admin-` and legacy `sk-` keys; GitLab `gldt-` and `glrt-`; an Azure `AccountKey = ` written with spaces; and Google `GOCSPX-` client secrets. They are residuals of every version. A later tightening could add them. | for the owner; a candidate list for a later version |
| 3 — the ledger points the D reader at `unmatchable`, whose `/` clause would refuse modules/modules.md | **Accepted as a note, for the install.** The ledger's own parenthetical, "(an A-Z letter)", narrows the test correctly. A placement path is a whole repository path, so it may contain `/`, and the install must not apply `unmatchable`'s segment-separator test to it. Reusing that test verbatim would fail closed: the screen refuses, and the builder's `CLASS_FIXTURES` would catch it. | the install (D), with this disposition as its note |

## State after round 2

- Round 2 cleared the bytes at `9daf9e04` under the stopping rule. The four
  manifest rows are those of
  `PUBLIC-SOURCE-SCREENING-SCOPE-V5-MANIFEST.txt` at that commit.
- The raw's head binds the manifest file's digest. A recorder, written after
  this review, takes the chosen row as the act's argument.
- P-116 is ready to be offered to the owner. Nothing is signed.

## Addendum, 2026-11-03: the notes repaired in the post-round-2 extension

After round 2, the packet, the delta and the ledger were re-edited to carry
two things:

- the owner's metadata measurement;
- rows `bcdp` and `bcdpx`, beyond the owner's chosen scope.

That edit retires round 2's clearance for those three files, so the three
notes were repaired in the same edit. The table above stays as written.

- **Note 1.** The packet's residual list now names `--pass` beside
  `redis-cli -a`.
- **Note 2.** The packet now names the vendor forms T catches precisely:
  GitLab personal tokens, Google API keys, OpenAI project keys, and an Azure
  `AccountKey=` written without spaces. It lists the uncaught forms as
  residuals: `sk-svcacct-`, `sk-admin-`, legacy `sk-`, `gldt-`, `glrt-`, a
  spaced `AccountKey`, and `GOCSPX-`.
- **Note 3.** The ledger's D section now says that the install must not reuse
  `unmatchable` verbatim. It also says what refuses a placed path.

Rows `bcd`, `bd`, `b` and `t` and their patches are untouched, and are still
the bytes round 2 cleared. The changed text and the two new rows await round 3
(`REVIEW-BRIEF.md`, "Round 3").
