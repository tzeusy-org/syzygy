# Round 13 dispositions — Polaris dossier launch consent, version 1.2

> **Candidate — binds nothing.** [Observed] Round 13
> (`docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-13-RAW.md`) was the fixes-only
> round the owner ordered after round 12 ("One more fixes-only round
> (Recommended)"). It read commit `054a4f11` and returned `REVISE` (line 4)
> with one revise finding and six notes. The raw is retained verbatim: `cmp`
> against the reviewer's file shows it identical.
>
> Line numbers refer to the post-apply spec of the commit that carries this
> page. Nothing here is a review or a verdict.

## Revise finding

**Finding 1 — a copy in a linked worktree of the governance home.** Round
12 repaired one side only: it forbade the main working tree, and arm 046.12
kept watching every working tree. This round closes the placement class at
its root, from both sides.

- **Body, line 248.** The copy's directory is "never derived from the
  operator's clone's path, never inside any working tree of the governance
  home's repository, its linked worktrees included, nor inside its Git
  directory or common Git directory, and never inside the operator's
  clone's working tree or Git directory; a run for which Syzygy would create
  it in any of these SHALL be refused before its copy step starts, naming
  the reason."
- **Arm 046.12.** It now reads: "a file of the governance home or of the
  operator's clone is edited or removed, or a working tree, index or
  reference other than the dedicated one and those of a copy that a copy
  step makes changes, in either case other than by the making, keeping or
  removal of a copy that a copy step makes, or the trunk tip moves". The arm
  cannot trip on a conforming copy wherever it sits, and the body keeps every
  copy out of both repositories.
- **Arm 047.15** mirrors the body: "the copy's directory is created inside
  any working tree of the governance home's repository, its linked worktrees
  included, or inside its Git directory or common Git directory, or inside
  the operator's clone's working tree or Git directory".
- **The refusal under the stage rule.**
  - Stage: identifier named; the refusal comes before the copy step starts.
  - Class: copy-class.
  - The run states that no copy was made, that the commit was not pinned and
    its committer date is Unknown, that no question was asked, and that
    Syzygy issued no brief and delivered no packet (line 244). The launch
    output says that no copy was made (line 248).
  - Other class: no form, since a no-copy run makes no copy directory.
  - Round 13's note 6 found this account consistent for the governance-home
    case, and the operator's-clone case adds no stage.
- [Inferred] A location inside the operator's clone's common Git directory,
  where that clone is a linked worktree, is a write to the operator's clone,
  which line 242 already forbids.
- [Unknown] Whether "inside" is judged on resolved paths, through symbolic
  links and mounts, is not stated (round 13 note 6). It is carried, not
  repaired.

### Re-test: every clause naming a working tree, the governance home or removal

**Population.** [Observed] Every unit of REQ-046 and REQ-047 at these bytes
that matches `working trees?|worktrees?|governance home|remov(e|es|ed|al|ing)`:

- body sentences, split at ". " before a capital;
- falsifier arms, split on top-level `;`;
- scenario lines;
- Case, Observable and Oracle lines.

That gives **33 units**: 16 body sentences (one is a scenario heading), 6
arms, 7 scenario lines and 4 test-form lines. The script is
`wtsweep.py` in the drafting session's scratch directory. The units are
listed here by line.

| # | Line | Kind | Subject | Result |
|---|---|---|---|---|
| W1 | 11 | body | copy removed or kept (question) | holds |
| W2 | 15 | body | "removing the scheme" (normalisation) | not about files; holds |
| W3 | 17 | body | user information removed | not about files; holds |
| W4 | 21 | body | records created in the governance home | holds: the copy is never there |
| W5 | 27 | body | recording commit "without changing any working tree, index or other reference" | holds: no copy lies in any governance-home working tree |
| W6 | 31 | body | run on the governance home refused | holds; covers linked worktrees through the common Git directory |
| W7 | 33 | body | recording commits never edit or remove a file | holds |
| W8 | 35 | body | copy's directory permitted, kept or removed | holds |
| W9 | 35 | body | copy outside the write, removal and working-tree absolutes | holds; arm 046.12 now has the same exemption |
| W10 | 37 | body | copy kept or removed (disclosure) | holds |
| W11 | 161 | scenario | user information removed | not about files; holds |
| W12 | 187 | scenario | writes nothing outside the state directory, save the copy | holds |
| W13 | 195 | heading | "Self-observation from the governance home" | heading; holds |
| W14 | 197 | scenario | governance-home clone refused | holds |
| W15 | 219 | test-form | fixture governance homes | holds |
| W16 | 220 | test-form | every working tree and index of the governance home before and after | holds: no conforming copy changes one |
| W17 | 222 | test-form | working trees compared before and after | holds |
| W18 | 223 | arm | 046.12 | repaired: exemption added |
| W19 | 223 | arm | governance-home run not refused | holds |
| W20 | 246 | body | copy statements (removed, kept, none) | holds |
| W21 | 248 | body | placement rule and refusal | repaired: every working tree of both repositories |
| W22 | 248 | body | copy removed when the run ends before its brief | holds: removal touches no file of either repository |
| W23 | 248 | body | copy kept until the operator removes it | holds |
| W24 | 258 | body | the governance-home check concerns the operator's clone | holds |
| W25 | 346 | scenario | failed copy removed | holds |
| W26 | 363 | scenario | annotated tag refused, copy removed | holds |
| W27 | 368 | scenario | failed checkout refused, copy removed | holds |
| W28 | 373 | scenario | failed checkout refused, copy removed | holds |
| W29 | 393 | test-form | operator's clone's working tree before and after | holds: the copy is never inside it |
| W30 | 396 | arm | 047.15 | repaired: mirrors the body |
| W31 | 396 | arm | completed copy not removed without the operator | holds |
| W32 | 396 | arm | copy removed when the run ends before its brief | holds |
| W33 | 396 | arm | launch output on removal | holds |

**Result** [Inferred, by reading]: of the 33 units, 30 hold and 3 are
repaired (W18, W21, W30). No other unit can be tripped by a conforming copy,
or met by a forbidden one, at these bytes.

## Notes

**Note 2 — "governing criteria" (for the owner).** The spec is not
changed. `OWNER-SIGNOFF.md` now states, in plain words under "Before you
sign", the reading the owner accepts by signing: REQ-033's SEC-3 rule and
v1.1's consent instruction count as part of REQ-035's "governing criteria".
[Observed] The product code reads it that way (`fidelityCriteria()` in
`packages/polaris-dossier/src/review-packet.ts`). Round 12's predecessor
sweep omitted this duty from rows D28 and D31. Those rows hold on this
reading, and this note supersedes them on that point. `ROUND-12-DISPOSITIONS.md`
is not edited.

**Note 3 — which sessions are directed to the copy.**

- Line 37 now reads "that the authoring and inventory sessions were
  directed, by their briefs, to work in the copy".
- Line 11 reads "that the authoring and inventory sessions are directed, by
  their briefs, to work in the copy". The question is asked before any
  brief is issued, so it keeps the present tense of the clause it replaces.
  "Were directed" there would state a stage the run has not reached.
- D5 in the delta is updated to match.

**Note 4 — the artifacts that name the pinned revision.** Line 9 and arm
046.2 now add "and the artifacts REQ-polaris-generation-033 requires to name
the pinned revision, as that revision".

**Note 5 — an object format Git does not support.**

- Line 248 now reads "a clone is never refused for its object format,
  except that an object format Git does not support fails the copy's
  `init`, refused under the Git-failure rule".
- The arm reads "in a copy-class run, a clone is refused for its object
  format other than as an object format Git does not support fails the
  copy's `init`".
- The no-copy branch of line 256, which the reviewer found reachable only by
  coincidence, is left as it is: it binds no run to a false statement.

**Note 6 — the placement refusal.** Covered under Finding 1.

**Note 7 — round-12 checks.** No action. The reviewer listed duties outside
round 12's predicate: line 240's "they SHALL state" sentences, and the print
duties at lines 31 and 246 and at scenario lines 278 and 303. The reviewer
found that none conflicts with REQ-033 to 036.

## Class-qualifier sweep

[Observed] Re-run on these bytes, the sweep gives 27 clauses and 0
unplaced. The added clause is line 9's storage sentence, which now matches
the selection because it says "name". It is a storage rule, not a statement,
and is labelled so. 9 of the clauses are not statements; all 18 statements
carry a class.

## Arms

[Observed] Split by script, the arms are 31 + 27 = 58, unchanged in number.
Four change text this round: 046.2 (note 4), 046.12 (Finding 1), 047.15
(Finding 1) and the object-format arm 047.18 (note 5).

## Changed blocks since round 13

Six lines change. The scenario count stays at 55.

| Line | Requirement | Change |
|---|---|---|
| 9 | 046, pre-answer reads | the artifacts REQ-033 requires to name the pinned revision (note 4) |
| 11 | 046, question | the authoring and inventory sessions, by their briefs (note 3) |
| 37 | 046, disclosures | the same, for the run record and pages (note 3) |
| 223 | 046, falsifier | 046.2 (note 4); 046.12 exemption (F1) |
| 248 | 047, copy step | placement in both repositories, linked worktrees included (F1); unsupported object format (note 5) |
| 396 | 047, falsifier | 047.15 (F1); object-format arm (note 5) |
