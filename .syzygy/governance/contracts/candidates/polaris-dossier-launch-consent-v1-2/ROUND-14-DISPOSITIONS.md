# Round 14 dispositions — Polaris dossier launch consent, version 1.2

> **Candidate — binds nothing.** [Observed] Round 14
> (`docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-14-RAW.md`) was scoped to the
> round-13 repair. It read commit `67dd3554` and returned `REVISE` (line 4)
> with one revise finding and seven notes. The raw is retained verbatim:
> `cmp` against the reviewer's file shows it identical.
>
> [Observed, by the coordinating session's message] The round ran under the
> owner's ruling "Fixes-only rounds until clean". The full option text was
> not relayed and is [Unknown].
>
> Line numbers refer to the post-apply spec of the commit that carries this
> page. Nothing here is a review or a verdict.

## Revise finding

**Finding 1 — both briefs named, one issued.** Repaired with the reviewer's
option (a), verbatim.

- Line 37's copy-class statement now reads "that each brief Syzygy issued, of
  the authoring brief and the inventory brief, directed its session to work
  in the copy".
- The delta's D5 quotes the same words.
- A run that issued the authoring brief and ended before the inventory brief
  states the first and says nothing false about the second.
- Line 11 keeps the present-tense arrangement the reviewer found right
  (note 5).

### Sweep: statements naming more than one artifact or session

**Population.** [Observed] Every unit of REQ-046 and REQ-047 at these bytes
that names more than one artifact or session and carries a statement verb,
selected by script.

- **Units.** Body sentences split at ". " before a capital, and then on
  top-level `;`. Falsifier arms split on top-level `;`. Scenario lines.
  Case, Observable and Oracle lines are left out.
- **More than one artifact or session.** Any of: `sessions`, `briefs`,
  `packets`, "brief or packet", "brief and packet", "authoring brief and the
  inventory brief", "authoring and inventory", "every brief", "every packet",
  "each brief", "issued no brief and delivered no packet".
- **Statement verb.** SHALL, state, disclose, say, name, print, tell or
  direct, with their inflections.

That gives **12 units**: 10 body, 2 scenario, 0 arms. The script is
`multisweep.py`, in the drafting session's scratch directory.

The test: can a run reach the unit's stage having issued or delivered one of
the items it names and not another, and then be bound to say something false
about the one it did not issue?

| # | Line | Kind | Unit | Result |
|---|---|---|---|---|
| M1 | 11 | body | the question: "the agent sessions read the clone without restriction" | holds: a disclosure of what the mode permits, not an event |
| M2 | 11 | body | the question: authoring and inventory sessions "are directed, by their briefs" | holds: an arrangement stated before any brief exists (note 5) |
| M3 | 15 | body | configuration within "the agent sessions' write reach" | holds: a standing fact |
| M4 | 37 | body | copy-class: each brief issued directed its session | repaired (finding 1) |
| M5 | 244 | body | the stage rule's subjects, "the agent sessions" | holds: a definition |
| M6 | 244 | body | unreached form "Syzygy issued no brief and delivered no packet" | holds: the stage is unreached only when neither was issued |
| M7 | 244 | body | nothing about a session but its own report | holds |
| M8 | 258 | body | every brief issued names the copy | holds: a duty per brief, as each is issued |
| M9 | 258 | body | "whether a session stayed in the copy is its own report" | holds: true of any session or none |
| M10 | 258 | body | no-copy: "where the agent sessions are to work, is the operator's clone" | holds: an arrangement, true whichever briefs were issued |
| M11 | 310 | scenario | every brief names the copy; every review packet REQ-035's contents | holds: a universal over what was issued |
| M12 | 353 | scenario | no brief and no packet (refused before the question) | holds |

**Result** [Inferred, by reading]: of the 12 units, 11 hold and 1 is
repaired (M4).

**Outside the predicate.** [Unknown] A unit that names its items in the
singular, or through a pronoun, is not selected. For example, line 37's
"once a brief or packet was delivered" is selected, but its "the copy's
location" is not.

## Notes

**Note 2 — round-13 findings land.** No action.

**Note 3 — the governance-home placement is closed.** No action.

**Note 4 — the operator's side.** Widened to the governance side with the
reviewer's text. Line 248 and arm 047.15 now name "the operator's clone's
working tree, Git directory or common Git directory, or any linked worktree
of its repository". `OWNER-SIGNOFF.md` says the same in plain words.

**Note 5 — line 11's present tense.** Kept, as the reviewer found right.

**Note 6 — the re-test's predicate.** No action. The reviewer checked the
"change" and "write" clauses it leaves out (line 242 and 047's "changes the
operator's clone"), and both hold.

**Note 7 — "the Git-failure rule".** The spec defines no clause by that
name, and its clauses are cited by content, not by line. Line 248 now reads
"an object format Git does not support fails the copy's `init`, and is
refused as every failure of a Git process for the copy is refused below".
That refusal is the one stated later in the same requirement: "Every failure
of a Git process for the copy SHALL be refused, naming that process and its
failure as Git reported it". The older residual is carried. Line 256 gives
no width for an unrecognised object format with an abbreviated
`--revision`, and such a run fails at resolution, which no arm reads as a
refusal for its object format.

**Note 8 — the consent instruction is conditional.** `OWNER-SIGNOFF.md` now
reads "in any packet that mentions consent, version 1.1's instruction".

## Class-qualifier sweep

[Observed] Re-run on these bytes: 27 clauses, 0 unplaced.

## Changed blocks since round 14

Three lines change. The scenario count stays at 55.

| Line | Requirement | Change |
|---|---|---|
| 37 | 046, disclosures | each brief issued directed its session (finding 1) |
| 248 | 047, copy step | the operator's side widened (note 4); the Git-failure refusal cited by content (note 7) |
| 396 | 047, falsifier | arm 047.15 widened as line 248 (note 4) |
