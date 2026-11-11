# Round 11 dispositions — Polaris dossier launch consent, version 1.2

> **Candidate — binds nothing.** [Observed] Round 11
> (`docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-11-RAW.md`), the round the
> owner ordered on 2026-11-10, read commit `e5a37fa1` and returned `REVISE`
> (line 4) with three revise findings and five notes. The raw is retained
> verbatim (`cmp` against the reviewer's file: identical).
>
> Line numbers refer to the post-apply spec of the commit that carries this
> page. Nothing here is a review or a verdict. The owner decides the next
> review step; `REVIEW-BRIEF.md` is drafted for a round 12 scoped to the
> repaired sentences and what they touch.

## Where the class went

The class of rounds 6, 7, 9 and 10 (something a conforming run cannot
truthfully do or say) moved into the falsifier arms. Rounds 10 and 11
swept the statements the stage rule governs and classed falsifier arms as
"not a statement" (`ROUND-11-PREP.md` rows "2, 9"), so no sweep tested an arm
against what the body requires. Findings 1 and 3 are two such arms; Finding
2 is a statement whose no-copy form asserted a session's act. The root
repair is the arm sweep below, run over every arm of both falsifiers.

## Revise findings

**Finding 1 — the v1.1-consent arms trip on required refusals.** Repaired
with the reviewer's first form, verbatim, in both arms. Line 223 and line
396 now read "is refused because the operator's clone holds more than one
commit, or history, branches, tags, stash or reflogs (the one-commit
requirement version 1.1 carried)". The body's alternates, reftable and
missing-object refusals of a copy-class run no longer trip either arm
(arm table rows 046.5 and 047.16).

**Finding 2 — "the sessions worked in the operator's clone".** Line 258's
no-copy form now reads exactly: "for a no-copy run, once a brief or packet
was delivered, it states that the agent sessions were directed to work in
the operator's clone, that whether a session did so is its own report,
labelled Inferred, and that no copy was made". Line 37's no-copy form is
made to agree: "for a no-copy run, once a brief or packet was delivered,
that the agent sessions were directed to work in the operator's clone, that
whether a session did so is its own report, labelled Inferred, and that no
copy was made". `ROUND-10-DISPOSITIONS.md` (F1, "Line 258") and
`ROUND-11-PREP.md` row 26 adopted the old wording; neither is edited, and
this page supersedes both on that row.

**Finding 3 — the alternates and reftable arm.** Line 396 now reads, as
the reviewer gave it: "in a copy-class run, a clone with an alternates file
is not refused before its copy step starts; in a launch-consented run, a
reftable clone is not refused before any Git process starts". The
following "a failed copy is not refused or is completed from elsewhere"
stands as its own arm.

## Notes

**Note 4 — read order of the object format.** Repaired as the reviewer
offered: line 254 now lists the configuration's object format
(`extensions.objectFormat`) among the reads for every launch-consented run,
without "in a copy-class run", since it is a configuration key and not
content. An abbreviated `--revision` can then be resolved with the
identifier width known before the class is decided. The reviewer's
observations on Git's case-insensitive key, ignored includes and rejected
`SHA256` value are not written into the spec. [Inferred] A mismatch makes
the fetch fail, which line 258 refuses.

**Note 5 — "held in the operator's own clone".** The spec text is left as
the ruling made it. `OWNER-SIGNOFF.md` now names the departure from both
halves of the v1.1 wording, and says the run record names only the half the
ruling named.

**Note 6 — "the reference it came from".** Line 240 now reads "the
reference it came from, or that `--revision` gave it", the reviewer's form.
The arm that checks it (047.6) reads "its reference or that `--revision`
gave it".

**Note 7 — the question's agent statements and the prep rows.** Both
agent-session clauses of the question (line 11) are tagged "(stage:
question asked)". `ROUND-11-PREP.md` is not edited. Its rows 5 and 6 should
read "no-copy: the question states that no copy was made (line 244)", not
"the question carries no copy statement", and its row 11 should read
"no-copy: directed to the operator's clone, whether a session did so its own
report (Inferred), no copy made". Its row 26 is superseded by Finding 2
above. Its block table rows "2, 9" ("falsifier, not a statement") are
superseded by the arm table below. The class-qualifier sweep, re-run on
these bytes with those labels, gives 26 clauses and 0 unplaced.

**Note 8 — round-10 findings and criteria 19 to 21.** No action; the
reviewer observed them repaired.

## The arm sweep

**Population.** Every arm of the two falsifiers the change carries:
REQ-polaris-generation-046's (line 223) and REQ-polaris-generation-047's
(line 396). Each falsifier is split on top-level `;`, outside parentheses.
That gives 31 arms for 046 and 26 for 047, **57 in all**. 23 of them are
byte-identical to an arm of the installed v1.1 falsifiers, and 34 are new
or changed in v1.2. The splitter and the v1.1 comparison are scripted, and
the counts are computed, not transcribed.

**Test.** Each arm was read against every refusal and statement the body
requires, for:

- a copy-class run at each stage: refused before the copy step, after it,
  at checkout, at the form check, at the question, declined, and completed;
- a launch-consented no-copy run;
- a no-copy run that records no launch record (the preamble's predecessor
  class).

The question for each arm: can a run that does everything the body
requires trip it, or can a run the body forbids pass it?

**Result** (counted from the table's last column by script):

- 44 arms hold.
- 12 arms are repaired:
  - 046.5 and 047.16 by Finding 1;
  - 046.4 and 047.24, the two stage-rule arms, by Finding 2;
  - 047.12 and 047.13 by Finding 3;
  - 047.6 by note 6;
  - 5 found by this sweep: 046.12, 046.19, 047.2, 047.17 and 047.23.
- 1 arm holds with a residual carried, not repaired (046.2).

A label of [Inferred] means the test was a reading, not an execution.

| Arm | v1.1 | What it checks | Copy-class, every stage | No-copy (launch-consented, predecessor) | Result |
|---|---|---|---|---|---|
| 046.1 | new | no blob read, only root tree, parents and date before the answer | form check reads Git-directory files, not objects; tree entries only; Git's reads are not Syzygy's | object reads REQ-033/046 permit | holds [Inferred] |
| 046.2 | new | pre-answer read results stored only in the question, launch output, run record statements and records | pages also disclose the named identifier and how it was chosen (line 37); the body's line-9 list names no page either | same | holds with residual: body and arm agree; read as pages rendering the run record's statements. Carried to round 12 |
| 046.3 | new | nothing read before the answer outside the pre-answer list | the list takes 047's reads, now with the object format for every launch-consented run | the consent's form check is in 047's list | holds |
| 046.4 | new | the stage rule | made achievable by Finding 2 (line 258) and note 7 (line 11); 26-clause sweep, 0 unplaced | no-copy forms at lines 37, 244, 258 | repaired (F2) |
| 046.5 | new | v1.1-consent run: refusal and run-record statement | alternates, reftable and missing-object refusals no longer trip it | (not such a run) | repaired (F1) |
| 046.6 | v1.1 | the question's statements | conditional copy statements made by class; no-copy states no copy was made | same | holds |
| 046.7 | v1.1 | record preconditions | records only on a confirmed answer | same | holds |
| 046.8 | v1.1 | one record, one kind | — | — | holds |
| 046.9 | v1.1 | provider statement scope | — | — | holds |
| 046.10 | v1.1 | drawer statement only on "none exists" | — | — | holds |
| 046.11 | v1.1 | a record names the pinned revision only | — | — | holds |
| 046.12 | new | no edit or removal of governance-home or operator's-clone files | removing the copy trips it if the copy's directory lies inside the governance home, which the body does not forbid; line 35 puts the copy outside these absolutes | — | repaired by this sweep: "other than a file of a copy that a copy step makes" |
| 046.13 | v1.1 | no push of the dedicated reference | — | — | holds |
| 046.14 | v1.1 | the proposal rule, Inferred label | — | — | holds |
| 046.15 | v1.1 | several identities refused before asking | — | — | holds |
| 046.16 | v1.1 | URL never the identity | — | — | holds |
| 046.17 | new | locator admission; credentials never printed | an ssh user name alone is not a credential, read on the arm's parse | same | holds [Inferred] |
| 046.18 | new | two-segment derivation | a given or record-taken identity is not derived | same | holds |
| 046.19 | new | no network request, no rewriting | the required normalisation is a rewriting of the URL; the body forbids only one "from Git or SSH configuration" | same | repaired by this sweep: "from Git or SSH configuration" |
| 046.20 | new | non-locator remote never printed | — | — | holds |
| 046.21 | new | the `Upstream:` URL match | — | — | holds |
| 046.22 | new | visibility never inferred | — | — | holds |
| 046.23 | v1.1 | preview label | — | — | holds |
| 046.24 | v1.1 | revoked records named | — | — | holds |
| 046.25 | v1.1 | governance-home run refused | — | — | holds |
| 046.26 | v1.1 | record set reused | — | — | holds |
| 046.27 | v1.1 | disclosures present | each disclosure governed by the stage rule makes its unreached or other-class form | same | holds |
| 046.28 | v1.1 | placements Unknown | — | — | holds |
| 046.29 | v1.1 | non-public warning before the answer | — | — | holds |
| 046.30 | v1.1 | no execution choice | the copy's Git processes are not one (line 248) | — | holds |
| 046.31 | v1.1 | who answered never Observed | — | — | holds |
| 047.1 | v1.1 | the pin rule | — | — | holds |
| 047.2 | v1.1 | consented HEAD pinned | a run with `--revision` on a clone whose HEAD a consent names pins the `--revision` object ("pinned elsewhere"); the body's first sentence is for a run "started without `--revision`" | same | repaired by this sweep: "started without `--revision`" |
| 047.3 | v1.1 | pin never changes | — | — | holds |
| 047.4 | new | no-copy HEAD mismatch refused before the question | — | line 246 | holds |
| 047.5 | new | copy-class never refused for the operator's HEAD | no rule reads HEAD for a copy-class pin | — | holds |
| 047.6 | new | identifier, reference, no-network, update command | a `--revision` run has no reference | same | repaired (note 6) |
| 047.7 | new | committer date once pinned, else Unknown | line 240 | line 240 | holds |
| 047.8 | new | no network, no other source, operator's clone unchanged | — | — | holds |
| 047.9 | new | the class rule | v1.1-scoped runs are copy-class; a run with no named identifier has no class | another act's consent | holds |
| 047.10 | new | copy made as stated; form checked | — | — | holds |
| 047.11 | new | Git process settings; no hook runs | that Git runs no hook is relied on, labelled Inferred (line 258) | — | holds; residual stated in the spec |
| 047.12 | new | alternates refused before the copy step | split from the old arm, copy-class only | not bound | repaired (F3) |
| 047.13 | new | reftable refused before any Git process | every launch-consented run, as line 253's list heading says | predecessor class not bound | repaired (F3) |
| 047.14 | new | failed copy refused, never completed elsewhere | — | — | holds |
| 047.15 | new | Syzygy's closed read list | — | form check reads in the list | holds |
| 047.16 | new | v1.1-consent run copy-class, no one-commit refusal, run-record statement | alternates, reftable and missing-object refusals no longer trip it | (not such a run) | repaired (F1) |
| 047.17 | new | object format | — | a no-copy run's clone is bound by its consent's stated form (line 246), which may refuse a format; "never refused for its object format" is a copy-step rule | repaired by this sweep: "in a copy-class run" |
| 047.18 | new | completed copy kept and located | — | no copy | holds |
| 047.19 | new | non-commit never pinned, told apart without reading the object | — | a no-copy named identifier is one an observation consent names as a revision [Inferred: always a commit] | holds [Inferred] |
| 047.20 | new | failed checkout says neither | — | — | holds |
| 047.21 | new | copy removed when the run ends before its brief | — | no copy | holds |
| 047.22 | new | launch output on removal, keeping, or no copy | — | — | holds |
| 047.23 | new | briefs name the copy | — | a no-copy run's brief has no copy to name; line 258's duty is copy-class only | repaired by this sweep: "of a copy-class run" |
| 047.24 | new | the stage rule | as 046.4 | as 046.4 | repaired (F2) |
| 047.25 | new | nothing about a session but its own report | line 258's no-copy form no longer asserts one | — | holds (after F2) |
| 047.26 | v1.1 | trunk tip never "latest" as Observed | — | — | holds |

Totals over the 57 rows: 44 hold, 12 repaired and 1 residual (44 + 12 + 1 = 57).

## Changed blocks since round 11

Seven lines change. The scenario count stays at 55.

| Line | Requirement | Change |
|---|---|---|
| 11 | 046, question | both agent-session clauses tagged "(stage: question asked)" (note 7) |
| 37 | 046, disclosures | the no-copy agent form agrees with line 258 (F2) |
| 223 | 046, falsifier | v1.1 arm bound (F1); arms 046.12 and 046.19 (sweep) |
| 240 | 047 | "or that `--revision` gave it" (note 6) |
| 254 | 047, read list | the object format read in every launch-consented run (note 4) |
| 258 | 047 | the no-copy agent form, exactly as given (F2) |
| 396 | 047, falsifier | arms 047.2 and 047.23 (sweep); 047.6 (note 6); F3; F1; 047.17 (sweep) |
