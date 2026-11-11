# Round 15 dispositions — Polaris dossier launch consent, version 1.2

> **Candidate — binds nothing.** [Observed] Round 15
> (`docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-15-RAW.md`) was scoped to the
> round-14 repair. It read commit `acefcdd4` and returned `REVISE` (line 4)
> with one revise finding and seven notes. The raw is retained verbatim:
> `cmp` against the reviewer's file shows it identical.
>
> [Observed, by the coordinating session's message] Round 16 is to be the
> last round under the owner's ruling. The ruling's full text was not
> relayed here and is [Unknown].
>
> Line numbers refer to the post-apply spec of the commit that carries this
> page. Nothing here is a review or a verdict.

## What changed in the spec

[Observed, by script] Exactly eight post-apply lines differ from `acefcdd4`'s:
11, 37, 187, 223, 242, 248, 252 and 396. The spec keeps 408 lines and 55
scenarios. Falsifier arms stay 31 in REQ-046 and 27 in REQ-047, 58 in all,
of which 22 are byte-identical to v1.1's (re-counted by `arms_v11.py`).

| Line | Change | Source |
|---|---|---|
| 11 | the question's removal statement: "or named with the removal's failure where its removal fails" | matrix row Q1 |
| 37 | option (a) verbatim; a second branch for a step that ended after Git began to read; "or, where its removal failed, that it was not removed" | F1; matrix rows R1, R3 |
| 187 | scenario "Write consent absent": "or names as not removed where its removal fails" | matrix row C1 |
| 223 | arm 046.5: the v1.1 statement's form where no fetch was made | matrix row A046.5 |
| 242 | the v1.1 statement: "or, where its copy step ended before Git read the operator's clone, that no fetch was made" | matrix row R6 |
| 248 | placement: "or any working tree of its repository, its linked worktrees included"; "and the run is refused"; the launch output of a failed removal | F4, F7; matrix row L1 |
| 252 | read list, first item: "and the files of its common Git directory that locate its linked worktrees" | F5 |
| 396 | arm 047.15 as line 248; arm 047.16 as line 242; arms 047.21 and 047.22 for a failed removal | F4; matrix rows A047.16, A047.21, A047.22 |

## Revise finding

**Finding 1 — a copy step that ends at `init`.** Repaired with the
reviewer's option (a), verbatim. Line 37 now reads: "how the copy was made
and what Git and Syzygy read of the operator's clone to make it, as the
question states them, or, where its copy step ended before Git read the
operator's clone, that the copy step ended there and Git read nothing of
it, …".

- The delta's D2 states the same rule in a new paragraph, "A copy step that
  ends early", and its warrant records round 15.
- The stage-sweep row is mirrored below, under "Stage sweep, round 15".
- [Inferred] Option (a) states no read of Syzygy's own for a step that
  ended before Git read. A run that ends at S1 or S2 has read only what the
  read list at lines 250 to 256 admits, the object format among it. The
  branch leaves those reads out of the copy statement, so it states nothing
  false; whether they should be stated there too is open to round 16.

The finding's last bullet names the wider class: a fetch that fails, or a
copy that departs from its form, is bound to "the copy it produced" in the
same way. The matrix below tests that class across the whole copy step.

## Root sweep: every copy statement against every sub-step of the copy step

**Sub-steps, in order.** [Observed, line 248] The copy step, as REQ-047
orders it:

- S1 directory created (the copy step has started, line 242);
- S2 `init`, with an empty template and the operator's clone's object format;
- S3 config writes. [Observed] The spec requires none of its own. `init`
  writes the copy's configuration, and every other setting reaches Git as an
  environment variable or an option of the process it starts. A run refused
  right after S3 is in S2's state, and the script asserts that every S3
  cell equals its S2 cell;
- S4 fetch of the named object over the local file transport. This is the
  first sub-step in which Git reads the operator's clone;
- S5 detached checkout (commit pinned on success);
- S6 form check, before the question;
- S7 removal, where the run ends before its brief.

**Statements.** [Observed] Every copy statement the spec requires, by its
source:

- the question's copy statements (line 11);
- the run record's and pages' copy statements (line 37);
- the committer date (line 240);
- the v1.1 consent statement (line 242);
- the stage rule's unreached forms (line 244);
- the launch output's removal, keeping and no-copy statements, and the
  placement, form and object-format refusals (line 248);
- the Git-failure refusal and the Inferred Git-program statement (line 258);
- the checkout-failure refusal (line 238);
- the one scenario that states removal for a refused run without naming a
  copy failure, "Write consent absent";
- the falsifier arms that read a copy statement or a copy-step refusal.

**The test.** For each cell: can a conforming run, refused right after that
sub-step, make that statement truthfully? H holds, U unreached (the
statement's stage or trigger is not reached by such a run), R failed at
`acefcdd4` and repaired at this head.

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

Denominator: 31 rows x 7 sub-steps = 217 cells. Holds 135, unreached 61, failed at acefcdd4 and repaired at this head 21, failing now 0. Rows with a repaired cell (10): Q1, R1, R3, R6, L1, C1, A046.5, A047.16, A047.21, A047.22.

The table is printed by `matrix16.py`, in the drafting session's scratch
directory, which computes the counts.

**The repaired cells.** [Inferred]

- **R1 at S1 to S3.** Finding 1: no Git process read the clone. Option (a).
- **R1 at S4 to S6.** The question's statement says Syzygy used "the copy it
  produced" and the copy holds the pinned commit alone; neither is true of a
  fetch that failed, a checkout that failed, or a copy that departs from its
  form. Line 37 adds: "or, where it ended after Git began to read the
  operator's clone and before the copy passed its form check, that the copy
  step used the method the question states, where it ended, and that the
  copy had not passed its form check". "Had not passed" is true both of a
  copy that failed its check and of one refused for another reason before
  the check ran, since nothing orders those refusals against the copy step.
  At S7 the statement is made from where the step ended, so R1 holds there.
- **R6, A046.5 and A047.16 at S1 to S3.** "The copy goes beyond that
  consent's "no fetch by Syzygy" wording" is false where no fetch was
  attempted. Line 242 and both arms now admit "that no fetch was made". From
  S4 on a fetch was made, so the original statement holds.
- **S7, a removal that fails** (Q1, R3, L1, C1, A047.21, A047.22). The spec
  required the copy removed and the launch output to say so, but a removal
  can fail on permissions or a full disk. No conforming run could then say
  "removed" truthfully, and every such run tripped arm 047.21. Line 248 now
  requires the launch output, where the removal fails, to say that the copy
  was not removed, name its location and the removal's failure as reported,
  and say that it is kept until the operator removes it. Line 37, the
  question at line 11, the scenario at line 187 and arms 047.21 and 047.22
  carry the same form. [Inferred] This narrows nothing an operator relies
  on: the copy is Syzygy's own directory, outside both trees, and the
  failure is named rather than hidden. It is flagged for the owner.

**What the matrix does not cover.** [Inferred] Statements outside the copy
step (identity, URL, consents, drawer and provider statements) are not copy
statements; earlier rounds' sweeps cover them. Placement (P1) is refused
before S1, so it is unreached in every column. The brief and session
statements (R4, L2, A047.26) need a stage after S7.

### Stage sweep, round 15

[Inferred] This row replaces round 9's "copy step started" row and its
"Copy" cell for the departing-copy refusal under "commit pinned"
(`ROUND-9-DISPOSITIONS.md`, "Stage sweep, round 9"). That file is left as
round 10 read it.

| Last stage reached | Example refusals | Copy |
|---|---|---|
| copy step started, before Git read the operator's clone | directory made then refused; `init` failed, an unsupported object format included | the copy step ended there and Git read nothing of the operator's clone; removed, or, where the removal failed, not removed, its location and the failure named |
| copy step started, after Git began to read | fetch failure; checkout failure; non-commit | made by the method the question states, where it ended, not past its form check; removed, or as above |
| commit pinned, before the form check passed | departing copy; any refusal unordered against the check | as the row above |
| commit pinned, after the form check passed | several identities; URL not admitted; governance home; write consent absent; no terminal (Q0) | made and read as the question states; removed, or as above |

## Notes

**Note 2 — round 14 lands as disposed.** Agreed. No action.

**Note 3 — line 37 at every brief and packet stage.** Agreed. No action.

**Note 4 — the main worktree of a linked-worktree clone.** Repaired with
the reviewer's first option. Line 248 and arm 047.15 read "the operator's
clone's working tree, Git directory or common Git directory, or any working
tree of its repository, its linked worktrees included", the governance
side's form. The owner page now reads "or any working tree of your clone's
repository, linked worktrees included", so it no longer promises more than
the spec binds.

**Note 5 — how Syzygy learns where the linked worktrees are.** Repaired
with the reviewer's first option. Line 252's first item reads "the `.git`
file or directory and the files that locate the Git directory and the
common Git directory, and the files of its common Git directory that locate
its linked worktrees". The delta's D3 list says the same.

- [Observed] The read list governs Syzygy's reads of the operator's clone
  alone; arm 047 trips on a read "of the operator's clone" outside it. The
  governance home is Syzygy's own repository, and no clause lists or limits
  Syzygy's reads of it, so the governance side needs no read-list item.
- [Unknown] Whether "inside" is judged on resolved paths, and whether a
  pruned or locked worktree entry whose directory is absent is "a linked
  worktree", stay open, carried from rounds 13 and 14. [Inferred] Neither
  makes a conforming run state something false: Syzygy chooses the
  location, and a refusal names the reason it found.

**Note 6 — the multi-item sweep has 13 units.** Corrected. [Observed] The
population is 13 units: 11 body, 2 scenario, 0 arms. The thirteenth is line
35's rule "that every record Syzygy reads for its gates lies within the
agent sessions' write reach and is disclosed so". It holds: it states a
standing fact, not an event. `ROUND-14-DISPOSITIONS.md` is left as round 15
read it.

**Note 7 — the subject of the object-format refusal.** Repaired: "…fails the
copy's `init`, and the run is refused as every failure of a Git process for
the copy is refused below." Arm 047.18 already agreed.

**Note 8 — the owner page.** Agreed. Its head now records round 15, and
its copy, object-format, version 1.1 and placement bullets carry this
round's changes in plain words.

## Checks

The check lines are in the commit that carries this page's report to the
coordinating session; the battery ran on these bytes before the commit.
