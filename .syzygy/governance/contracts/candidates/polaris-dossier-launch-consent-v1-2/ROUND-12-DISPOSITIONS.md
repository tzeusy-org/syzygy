# Round 12 dispositions — Polaris dossier launch consent, version 1.2

> **Candidate — binds nothing.** [Observed] Round 12
> (`docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-12-RAW.md`), scoped to the
> round-11 repair, read commit `736d9fcd` and returned `REVISE` (line 4) with
> two revise findings and five notes. The raw is retained verbatim (`cmp`
> against the reviewer's file: identical). On 2026-11-10 the owner then
> chose "Briefs only (Recommended)" and "One more fixes-only round
> (Recommended)" (`OWNER-DIRECTION-CLONE-AND-URL-SCOPE-2026-11-09.md`,
> section "Rulings after review round 12, 2026-11-10").
>
> Line numbers refer to the post-apply spec of the commit that carries this
> page. Nothing here is a review or a verdict.

## Where the class went

Round 11's arm sweep tested every falsifier arm against REQ-046 and REQ-047
alone. Finding 1 is a duty this change put on an artifact that a predecessor
requirement governs with a closed list: REQ-polaris-generation-035's review
packet ("containing only …"). The sweep below extends the check to every
new duty on a brief, packet, record or page, against the requirement that
governs that artifact.

## Revise findings

**Finding 1 — packets and REQ-035.** Repaired by the owner's ruling "Briefs
only (Recommended)". Three places change together:

- **Line 258:** "Every brief Syzygy issues to an agent session of a
  copy-class run, the authoring brief and the inventory brief, SHALL name
  the copy as the clone to work in and tell the session not to read the
  operator's clone; that a session complied is its own report, labelled
  Inferred. A review packet of a copy-class run carries exactly the contents
  REQ-polaris-generation-035 lists, and nothing is added to it for the
  copy."
- **Scenario line 310:** "every brief names the copy as the clone to work
  in, and every review packet carries exactly REQ-polaris-generation-035's
  contents".
- **Arm 047.24** (047.23 before this round): "a brief of a copy-class run
  does not name the copy, or a review packet of a copy-class run carries
  anything REQ-polaris-generation-035 does not list".

`IMPACT-LEDGER.md` (the claim at its former line 108), `OWNER-SIGNOFF.md`
and the delta's D5 now say the same.

**Finding 2 — the copy inside the governance home.** Repaired in the body,
by the reviewer's first form. Line 248 now reads: "It SHALL create an empty
directory of its own for the copy, never derived from the operator's clone's
path and never inside the governance home's working tree, Git directory or
common Git directory; a run for which Syzygy would create it there SHALL be
refused before its copy step starts, naming the reason."

- **Arm 046.12** loses round 11's exemption ("other than a file of a copy
  that a copy step makes"). With the body rule, no copy file lies in the
  governance home. None lies in the operator's clone either, which line 242
  forbids writing to. The arm is back to its round-10 bytes.
- **New arm 047.15:** "the copy's directory is created inside the
  governance home's working tree, Git directory or common Git directory".
- **The new refusal under the stage rule.**
  - Stage: identifier named, refused before the copy step starts.
  - Class: copy-class.
  - The run states, under line 244, that no copy was made, that the commit
    was not pinned and its committer date is Unknown, that no question was
    asked, and that Syzygy issued no brief and delivered no packet. The
    launch output says that no copy was made (line 248).
  - Other class: no form. A no-copy run makes no copy directory.

## Notes

**Note 3 — "were directed".** Repaired as given, identically at lines 37
and 258. The no-copy form is now "that the run's clone, where the agent
sessions are to work, is the operator's clone, that whether a session
worked there is its own report, labelled Inferred, and that no copy was
made".

**Note 4 — tags.** Line 11 now carries "(stage: question asked; both
classes)" and "(stage: question asked; copy-class)".

**Note 5 — the v1.1 count and the 047.2 row.** Corrected here.
`ROUND-11-DISPOSITIONS.md` is not edited.

- [Observed] After round 11's 047.2 repair, 22 arms are byte-identical to
  an installed v1.1 arm, not 23. The script was re-run on these bytes and
  still gives 22.
- Row 047.2 should read "changed", not "v1.1": it now begins "a run started
  without `--revision` whose HEAD an in-force consent names", where v1.1
  read "a run whose HEAD an in-force consent names".

**Note 6 — the 046.2 residual.** Closed with the reviewer's phrase.

- Line 9 now reads "the run record, as the statements this change requires
  of it, and every page, as the run record's statements, and, after a
  confirmed answer, the launch consent records".
- Arm 046.2 reads "the run record's required statements and every page, as
  the run record's statements, and the launch consent records".

**Note 7 — what the identifier width is taken from.** One clause, line 256:
"at the width of the object format its configuration records
(`extensions.objectFormat`, SHA-1 where it records none), a mismatch
failing closed in the copy's fetch or, in a no-copy run, in
REQ-polaris-generation-033's object read, each refused."

## Arms this round changes

[Observed] Both falsifiers, split on top-level `;` outside parentheses by
script, now give 31 + 27 = **58** arms. 047 gained one. 22 of the 58 are
byte-identical to an installed v1.1 arm.

| Arm | Change | Read against | Result |
|---|---|---|---|
| 046.2 | pages added (note 6) | line 9, line 37 | holds; residual closed |
| 046.12 | exemption removed (F2) | lines 35, 242, 248 | holds: a conforming copy is never in the governance home or the operator's clone |
| 047.15 | new (F2) | line 248 | holds: the arm restates the body's placement rule |
| 047.24 | briefs only; packets REQ-035's (F1) | line 258; REQ-035 | holds: brief duty matches line 258, packet arm matches REQ-035's "containing only" |

The other 54 arms keep their round-11 bytes. Round 12 confirmed ten of
round 11's twelve repairs, and the two it faulted are rows 046.12 and
047.24 above.

## Predecessor sweep: new duties on briefs, packets, records and pages

**Population.** [Observed] The sentences of REQ-046 and REQ-047 at these
bytes (body sentences and scenario THEN and AND lines), selected by script:

- each names an artifact (brief, packet, run record, page, launch output or
  question) and a duty verb (SHALL, states, names, says, discloses,
  carries);
- the case, observable, oracle and falsifier lines are left out;
- sentences found verbatim in the installed v1.1 spec are left out.

**37 sentences.**

**Test.** Each was read against the requirement that governs the artifact:

- briefs: REQ-033 (the brief names the pinned revision; the HEAD check
  before a brief; the execution rule) and REQ-034 ("The brief SHALL carry no
  project content beyond the repository identity and the pinned revision");
- review packets: REQ-035 ("containing only" six things, plus the
  changed-block list) and REQ-033 (names the pinned revision, carries no
  credential);
- run record and pages: REQ-033 (values shown from stored records are
  Inferred; no Observed label rests on a stored record; pages disclose in
  machine form with one sentence and the appendix), REQ-035 (what the
  record distinguishes about review sessions) and REQ-036 (the agent's
  account is Inferred);
- question and launch output: v1.1's REQ-046 and REQ-047, whose unchanged
  sentences must still hold.

| # | Line | Artifacts | Governing text | Result |
|---|---|---|---|---|
| D1 | 3 | question | v1.1 046 preamble | holds |
| D2 | 9 | question | v1.1 046; 047 read list | holds |
| D3 | 9 | question, launch output, run record, page | REQ-033 page disclosures | holds after note 6 |
| D4 | 11 | question (names the brief) | v1.1 046; REQ-033's "the agent reads the clone without restriction" | holds; tags per note 4 |
| D5 | 15 | question | v1.1 046 residuals | holds |
| D6 | 17 | launch output | v1.1 046 | holds |
| D7 | 17 | launch output | v1.1 046 | holds |
| D8 | 17 | run record, page | v1.1 046; REQ-033 records rule | holds |
| D9 | 17 | question | v1.1 046 | holds |
| D10 | 19 | question | v1.1 046 | holds |
| D11 | 37 | run record, page | REQ-033: page form, Inferred for stored values; REQ-035 sessions | holds [Inferred]: v1.1's own line 37 already uses "in human and machine form", and no new item is labelled Observed |
| D12 | 130 | run record, page | v1.1 046 | holds |
| D13 | 140 | question | v1.1 046 | holds |
| D14 | 146 | question | v1.1 046 | holds |
| D15 | 161 | launch output, page | v1.1 046 | holds |
| D16 | 171 | launch output, page | v1.1 046 | holds |
| D17 | 238 | launch output | v1.1 047 | holds |
| D18 | 240 | launch output, run record | v1.1 047; REQ-033 Inferred for the pinned revision | holds |
| D19 | 242 | run record | REQ-033 records rule | holds |
| D20 | 244 | question, launch output, run record, page | REQ-033 page form | holds |
| D21 | 244 | (names brief, packet) | REQ-035 delivery is recorded | holds |
| D22 | 244 | (names brief, packet) | REQ-035's record of what is Inferred about sessions | holds |
| D23 | 248 | (copy before the question or brief) | REQ-033 HEAD check before a brief: the copy's HEAD is the pinned revision | holds |
| D24 | 248 | question | v1.1 046 | holds |
| D25 | 248 | launch output | v1.1 047 | holds |
| D26 | 248 | launch output | v1.1 047 | holds |
| D27 | 258 | brief | REQ-034: no project content beyond identity and revision; REQ-033 | holds [Inferred]: the copy's location is a host path, not project content |
| D28 | 258 | review packet | REQ-035 "containing only" | holds; written to match it (F1) |
| D29 | 258 | run record | REQ-033 Inferred label | holds |
| D30 | 258 | run record | REQ-035; REQ-036; line 244 | holds after note 3 |
| D31 | 310 | question, run record, page, brief, review packet | REQ-034, REQ-035 | holds after F1 |
| D32 | 315 | run record, page | REQ-033 | holds |
| D33 | 320 | run record, page | REQ-033 | holds |
| D34 | 326 | run record | REQ-033 | holds |
| D35 | 341 | launch output | v1.1 047 | holds |
| D36 | 352 | launch output | v1.1 047 | holds |
| D37 | 353 | launch output, run record (names brief, packet) | v1.1 047; REQ-035 | holds |

**Result.** [Inferred, by reading] At these bytes, 37 of 37 hold. Three
hold only after this round's repairs: D28 and D31 through Finding 1, and D30
through note 3. D3 holds through note 6, which brings it to 4.

Before the repair, the packet halves of D28 and D31 conflicted with REQ-035;
they are the conflict Finding 1 names. The sweep found no other conflict.

Two rows rest on readings, not on clause text:

- D11: REQ-033's page form applied to v1.1's own "human and machine form"
  wording;
- D27: a host path is not project content.

**What the script cannot see.** A duty phrased without one of the listed
verbs, or with the artifact named by a pronoun, falls outside the
population. [Unknown] Whether any exists. The class-qualifier sweep, re-run
on these bytes, gives 26 clauses and 0 unplaced.

## Changed blocks since round 12

Nine lines change. The scenario count stays at 55.

| Line | Requirement | Change |
|---|---|---|
| 9 | 046, pre-answer reads | pages among the stores (note 6) |
| 11 | 046, question | tags name the class (note 4) |
| 37 | 046, disclosures | no-copy agent form (note 3) |
| 223 | 046, falsifier | 046.2 (note 6); 046.12 exemption removed (F2) |
| 248 | 047, copy step | the copy's directory never inside the governance home; refusal (F2) |
| 256 | 047, read list | identifier width from the object format (note 7) |
| 258 | 047 | briefs only, packets REQ-035's (F1); no-copy agent form (note 3) |
| 310 | 047, scenario | briefs and packets (F1) |
| 396 | 047, falsifier | new arm 047.15 (F2); 047.24 (F1) |
