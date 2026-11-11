# Round 16 dispositions — Polaris dossier launch consent, version 1.2

> **Candidate — binds nothing.** [Observed] Round 16
> (`docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-16-RAW.md`) was scoped to the
> round-15 repair. It read commit `482b1252` and returned `REVISE` (line 4)
> with one revise finding and seven notes. The raw is retained verbatim:
> `cmp` against the reviewer's file shows it identical.
>
> [Observed, by the coordinating session's message] Round 16 was the last
> round under the owner's ruling. Whether a round 17 runs is the owner's
> decision, which the coordinating session is asking for; this page and the
> round-17 brief prepare it and order nothing.
>
> Line numbers refer to the post-apply spec of the commit that carries this
> page. Nothing here is a review or a verdict.

## What changed in the spec

[Observed, by script] Exactly ten post-apply lines differ from `482b1252`'s:
37, 223, 242, 246, 254, 346, 363, 368, 373 and 396. The spec keeps 408 lines
and 55 scenarios. Falsifier arms stay 31 in REQ-046 and 27 in REQ-047, 58 in
all, of which 22 are byte-identical to v1.1's (`arms_v11.py`). Each changed
line appears exactly once in `SEMANTIC-DELTA.md`.

| Line | Change | Source |
|---|---|---|
| 37 | the early-ended branches keyed on "before Syzygy started the fetch process" and "after Syzygy started the fetch process"; "and, where the fetch failed, that a fetch was started and failed, as Git reported" | F4 |
| 223 | arm 046.5: the failed-fetch form, and "no fetch was made" only where the copy step ended before Syzygy started the fetch process | F4 |
| 242 | the v1.1 statement, the same three forms | F4 |
| 246 | the copy statements include "that it was not removed, where its removal failed" | F6 |
| 254 | the configuration read as text also for `core.bare` and `core.worktree`, "to locate its repository's working trees" | F5 |
| 346, 363, 368, 373 | "and removes the copy, or names it as not removed where its removal fails", line 187's form | F1 |
| 396 | arm 047.16 (the reviewer's 17) as arm 046.5 | F4 |

## Revise finding

**Finding 1 — four scenarios removed the copy without exception.**
Repaired with the reviewer's option (a). Lines 346 ("Partial clone missing
an object"), 363 ("Revision naming an annotated tag"), 368 ("Revision
naming a blob") and 373 ("Commit whose checkout fails") now end "and
removes the copy, or names it as not removed where its removal fails".

[Observed] Round 15's matrix population said "the one scenario that states
removal for a refused run without naming a copy failure". That predicate was
wrong twice: it missed line 363, which it selects, and it excluded lines
346, 368 and 373 for a reason that has nothing to do with whether a removal
can fail. The population is now every occurrence of "remov", below.

### Sweep: every "remov" in the post-apply spec

**Population.** [Observed] Every match of `remov`, case folded, in all 408
lines of the post-apply spec, by `remsweep.py` and `remclass.py` in the
drafting session's scratch directory. Each occurrence is put in one class;
the script asserts that every occurrence is classed and that every class-A
line names a failed removal.

| Class | Occurrences | Lines |
|---|---|---|
| copy removal by Syzygy, carries the failed-removal exception in its own sentence or arm | 34 | 11, 37, 187, 246, 248, 346, 363, 368, 373, 396 |
| copy removal by Syzygy, deferred to REQ-047 ("as that requirement states") or exempted as an act | 3 | 35, 223 |
| removal by the operator ("until the operator removes it"): the operator's act, not a duty Syzygy can fail | 4 | 11, 37, 248 |
| text transformation (scheme or user information removed from a URL): string operation, cannot fail | 4 | 15, 17, 161 |
| prohibition or falsifier on removal (no file removed; a completed copy not removed without the operator): met by not acting | 3 | 35, 223, 396 |
| recording-commit removal by a revocation act: the owner's act, outside the copy step | 2 | 33 |

Denominator: 50 occurrences of `remov` (case folded) on 16 lines of the post-apply spec; every one classed; class A 34, failing 0.

[Observed] Second method: "removes the copy" occurs 4 times, at lines 346,
363, 368 and 373, and each occurrence is followed on its line by "or names
it as not removed where its removal fails". Line 187's form is "which it
removes, or names as not removed where its removal fails". No other
spelling of the removal (`delet`, "clean up", "left behind", "no copy
remains", "leaves no") occurs in the spec: 0 matches.

[Inferred] Classes B to F cannot bind a run to a removal that fails:

- B defers to REQ-047, which carries the exception, or exempts the act;
- C is the operator's act;
- D removes text from a string Syzygy holds;
- E is met by not removing;
- F is the owner's revocation of a recording commit, outside the copy step.

### The matrix, extended

Four rows are added for the scenarios above (C2 to C5). Their removal is
reached only at S7, after their own refusal; every other cell is
unreached. R marks a cell that failed at the bytes its round read and is
repaired at this head: round 15 at `acefcdd4`, round 16 at `482b1252`.

| Row | Statement | S1 directory created | S2 init | S3 config writes | S4 fetch | S5 checkout | S6 form check | S7 removal |
|---|---|---|---|---|---|---|---|---|
| Q1 | question: the copy statements, removal included | U | U | U | U | U | U | R |
| R1 | run record and pages: how the copy was made and what Git and Syzygy read | R | R | R | R | R | R | H |
| R2 | run record and pages: the copy's location | H | H | H | H | H | H | H |
| R3 | run record and pages: whether the copy was kept or removed | H | H | H | H | H | H | R |
| R4 | run record and pages: each brief Syzygy issued directed its session to the copy | U | U | U | U | U | U | U |
| R5 | run record: the pinned commit and its committer date, or that the stage was not reached | H | H | H | H | H | H | H |
| R6 | run record: v1.1 consent, the copy goes beyond its "no fetch by Syzygy" wording | R | R | R | H | H | H | H |
| R7 | stage rule: a stage not reached is stated as not reached | H | H | H | H | H | H | H |
| L1 | launch output: the copy was removed | H | H | H | H | H | H | R |
| L2 | launch output: the copy is kept, and its location (completed run) | U | U | U | U | U | U | U |
| L3 | launch output: no copy was made (copy step never started) | U | U | U | U | U | U | U |
| P1 | placement refusal before the copy step starts | U | U | U | U | U | U | U |
| F1 | form refusal before the question | U | U | U | U | U | H | U |
| F2 | object format Git does not support: init fails and the run is refused | U | H | H | U | U | U | U |
| N1 | checkout failure refused, neither as a commit nor as not a commit | U | U | U | U | H | U | U |
| G1 | every failure of a Git process for the copy refused, naming the process | U | H | H | H | H | U | U |
| G2 | Inferred: Syzygy relies on Git starting no program the clone names | H | H | H | H | H | H | H |
| C1 | scenario Write consent absent: the copy is removed | H | H | H | H | H | H | R |
| C2 | scenario Partial clone missing an object: the copy is removed (round 16) | U | U | U | U | U | U | R |
| C3 | scenario Revision naming an annotated tag: the copy is removed (round 16) | U | U | U | U | U | U | R |
| C4 | scenario Revision naming a blob: the copy is removed (round 16) | U | U | U | U | U | U | R |
| C5 | scenario Commit whose checkout fails: the copy is removed (round 16) | U | U | U | U | U | U | R |
| A046.4 | arm: a stage-rule statement is missing | H | H | H | H | H | H | H |
| A046.5 | arm: v1.1 consent statement omitted | R | R | R | H | H | H | H |
| A046.12 | arm: a file of the clone edited or removed, the copy exempt | H | H | H | H | H | H | H |
| A047.10 | arm: a copy departing from its form | H | H | H | H | H | H | H |
| A047.14 | arm: a failed copy not refused | H | H | H | H | H | H | H |
| A047.15 | arm: the copy placed inside the clone or any working tree of its repository | H | H | H | H | H | H | H |
| A047.16 | arm: v1.1 consent statement missing | R | R | R | H | H | H | H |
| A047.18 | arm: object-format refusal | H | H | H | H | H | H | H |
| A047.20 | arm: a failed checkout refused as a commit or as not one | H | H | H | H | H | H | H |
| A047.21 | arm: a copy not removed when the run ends before its brief | H | H | H | H | H | H | R |
| A047.22 | arm: launch output of a run that ends before its brief | H | H | H | H | H | H | R |
| A047.25 | arm: stage rule | H | H | H | H | H | H | H |
| A047.26 | arm: session report | U | U | U | U | U | U | U |

Denominator: 35 rows x 7 sub-steps = 245 cells. Holds 135, unreached 85, failed at the bytes the round read and repaired at this head 25, failing now 0. Rows with a repaired cell (14): Q1, R1, R3, R6, L1, C1, C2, C3, C4, C5, A046.5, A047.16, A047.21, A047.22.

The table is printed by `matrix17.py`, in the drafting session's scratch
directory, which computes the counts.

## Notes

**Note 2 — round 15 lands as disposed.** Agreed. No action.

**Note 3 — the re-checked cells hold.** Agreed. No action.

**Note 4 — the branches turned on whether Git read the clone.** Repaired.
Line 37, line 242 and arms 046.5 and 047.16 now key on "before Syzygy
started the fetch process" and "after Syzygy started the fetch process",
an event Syzygy observes. A fetch that was started and failed is stated as
"a fetch was started and failed, as Git reported". "No fetch was made" is
kept only where the copy step ended before Syzygy started the fetch
process.

- [Inferred] The reviewer's case, a clone moved or made unreadable after the
  launch reads, now falls in the "after Syzygy started" branch. Its
  statements are true: the method was used, it ended at the fetch, the copy
  had not passed its form check, and the fetch was started and failed as Git
  reported. They agree with line 258's refusal, which names that process.
- [Inferred] Matrix rows R1, R6, A046.5 and A047.16 at S4 stay H. The
  statement S4 calls for is now the failed-fetch form, which is true, and
  Syzygy can tell which form applies.
- The delta's D2 paragraph "A copy step that ends early" and the owner page
  use the same keying.

**Note 5 — locating the main working tree.** Repaired with the reviewer's
first option. Line 254 now reads the configuration file "as text only for
its remotes' names and URLs, its object format (`extensions.objectFormat`)
and, to locate its repository's working trees, `core.bare` and
`core.worktree`, and never honoured".

- [Inferred] Both are needed: `core.bare` says whether the common
  directory's parent is a main working tree at all, and `core.worktree`
  says where one is when it is not that parent.
- [Unknown] Whether "inside" is judged on resolved paths, and how a pruned
  or locked worktree entry counts, stay open, as carried from rounds 13 to
  15.

**Note 6 — failed removal, for the owner.** Agreed, and line 246 now lists
"that it was not removed, where its removal failed" among the copy
statements, so the stage rule governs it by name. The owner page states the
outcome in plain words: a refused run can leave a directory behind, and
the launch output names it.

**Note 7 — the owner page's list of what Syzygy reads.** Repaired: the list
now names "the files that locate its Git directories and its linked
worktrees, and the two settings (`core.bare`, `core.worktree`) that say
where its main working tree is, read as text".

**Note 8 — partition, delta and placement hold.** Agreed. No action.
