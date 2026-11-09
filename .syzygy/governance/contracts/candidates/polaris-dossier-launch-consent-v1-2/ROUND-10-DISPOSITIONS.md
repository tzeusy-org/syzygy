# Round 10 dispositions — Polaris dossier launch consent, version 1.2

> **Candidate — binds nothing.** [Observed] Round 10
> (`docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-10-RAW.md`) read commit
> `faeafa85` and returned `REVISE` (line 4) with three revise findings and
> three notes.
>
> The class of a required statement that a refused run cannot truthfully
> make has now recurred four times, in rounds 6, 7, 9 and 10. The
> coordinating session's stopping rule applies: repair, dispatch nothing,
> and ask the owner. **No round 11 has been dispatched over these bytes.**
> The owner decides whether to sign on this repair or to order round 11.
>
> Line numbers refer to the post-apply spec of the commit that carries this
> page. Nothing here is a review or a verdict.

## The root fix: the stage rule carries the run class

Round 10 found the class again, this time by run class rather than by stage.
Two clauses that named a stage but no class required a no-copy run to
describe a copy it never had.

The stage rule (line 244) now carries both:

- **Subjects and media.** "Every statement this change requires of the
  question, the launch output, the run record or a page about the named
  identifier, the copy, the agent sessions, the pinned commit or the
  question names the stage it needs and the run class that requires it,
  copy-class, no-copy or both, and SHALL be made only for a run of that
  class that reached that stage." The question is now named among the media
  (F5), and the named identifier among the subjects (F5, closing F3's
  class).
- **The other class.** "A run of the class a statement does not name makes,
  in its place, the form that statement gives for that class, and a no-copy
  run's form of every copy statement is that no copy was made."
- **Unreached stages, stated as what Syzygy did.** The forms are: "that no
  identifier was named, that no copy was made, that the commit was not
  pinned and its committer date is Unknown, that no question was asked, or
  that Syzygy issued no brief and delivered no packet".
- **Stages.** The list is identifier named; copy step started (copy-class
  only); commit pinned; question asked, "where a question is needed"; and
  brief or packet delivered, "once Syzygy has issued a brief or delivered a
  packet for the run".
- **Order.** The order is no longer a strict prefix (F5). "Each stage a run
  reaches comes after every earlier stage it needs: in a copy-class run the
  copy step before the commit is pinned, the commit pinned before any
  question, and a needed question before any brief or packet."
- **Agent sessions.** "Syzygy states nothing about whether an agent session
  started, received or read a brief or packet except as that session's own
  report, labelled Inferred." (F2)

Both arms now check class as well as stage:

- **REQ-046, line 223.** It trips when a governed statement "is missing …
  for a stage the run reached and a run class that requires it, or is
  stated for a stage it did not reach or for a run class that does not
  require it in place of the form that statement gives, or a stage it did
  not reach is not stated as not reached".
- **REQ-047, line 390.** It carries the same test. It adds an arm for any
  statement that an agent session started, or did not, other than as that
  session's own report labelled Inferred.

## F1 — A no-copy run had to say its sessions were directed to, and stayed in, a copy

**Repaired.**

- **Line 37.** Each governed disclosure now names its class:
  - "for a copy-class run, once a brief or packet was delivered, that the
    agent sessions were directed to work in the copy";
  - "for a no-copy run, once a brief or packet was delivered, that the
    agent sessions were directed to work in the operator's clone and no
    copy was made";
  - the copy-step disclosures are "for a copy-class run", with "for a
    no-copy run, that no copy was made";
  - whether a question was asked, the named identifier and the pinned
    revision are "for both classes".
- **Line 258.**
  - The residual is "Once a copy-class run's copy step started (stage: copy
    step started; copy-class)".
  - The sessions' statement is "Once a copy-class run's brief or packet was
    delivered … that whether a session stayed in the copy is its own
    report". Its content is unchanged: Inferred, its own report.
  - The no-copy form is "for a no-copy run, it states that the sessions
    worked in the operator's clone and that no copy was made".

## F2 — "Agent session started" turned on an event Syzygy does not observe

**Repaired.**

- The last stage is now defined by Syzygy's own recorded act: "brief or
  packet delivered, once Syzygy has issued a brief or delivered a packet
  for the run". It replaces both "brief issued" and "agent session
  started".
- Its unreached form is "that Syzygy issued no brief and delivered no
  packet", which states what Syzygy did.
- "No agent session was started" is never stated. [Observed] It now occurs
  0 times in the post-apply spec. The patterns `brief issued`, `brief was
  issued`, `no agent session` and `Once an agent session` also give 0. The
  only two hits for `agent session (was )?started` are the prohibition at
  line 244 and its arm at line 390.
- The alternates scenario (line 347) now states "that Syzygy issued no
  brief and delivered no packet".

## F3 — The governance-home command needed a named identifier that a run with none lacks

**Repaired.** Line 31 now reads: "checked out at the named identifier where
one was named, and otherwise naming `--revision`". The scenario at line 198
mirrors it.

- The root of the class is closed by adding "the named identifier" to the
  stage rule's subjects (above).
- [Inferred] On the reviewer's sub-point: where the named identifier is a
  blob or a tree, the printed command names an object that cannot be checked
  out. The refusal is still truthful, because it prints a command and claims
  nothing about the object. This is left for the owner, as a note.

## F4 — Two triggers for "pinned" in a no-copy run

**Repaired.**

- **Line 238.** The clause "which an observation consent's naming of it as a
  revision already shows" is deleted. A no-copy run reaches commit pinned
  "when Syzygy reads it as a commit object", and not before.
- **Line 303.** It now reads "prints the command that checks out the named
  identifier".
- **Correction to `ROUND-9-DISPOSITIONS.md`**, which is left unedited. Its
  stage-table note says that a no-copy run "reaches commit pinned as soon as
  it is named". That is wrong under the text as it now stands, and was not
  the text's main clause before.
  - A no-copy run reaches commit pinned only at Syzygy's read of the commit
    object.
  - A no-copy run refused for a HEAD mismatch whose clone lacks the
    consented commit is therefore unpinned, and states the date as Unknown.
  - Round 9's "pin" sweep labelled line 303 "used where the stage commit
    pinned is reached". That line now names the named identifier instead.

## F5 — The rule's media, order and subjects

**Repaired**, as set out above:

- the question is named in the media;
- the order is not a prefix: "question asked, where a question is needed";
- the named identifier is a subject.

Line 37's opening disclosures now carry their unreached forms: "that the
consents were recorded at launch, with each record's identity and its
recording commit, or that none was recorded", and the public declaration
"or that none was made".

## F6 — Earlier concerns

**Noted.** The reviewer found round 9's findings repaired except as F1 to
F5.

[Unknown] The reviewer did not re-run the quotation re-extraction. This
page does not claim every quotation in the package is exact. The scripted
check covers only the delta's exact blocks.

## Sweep: every statement the stage rule governs, with its stage and run class

[Observed] The population was built by script over every normative
paragraph of REQ-046 and REQ-047; scenarios and evidence blocks are
excluded. It takes every sentence that requires the question, the launch
output, the run record or a page to state, disclose, name, print or say
something, and every sentence written "they SHALL state", "SHALL print" or
"states that". Each sentence is split at top-level semicolons, and a clause
is kept when it speaks of a governed subject: the named identifier, the
copy or copy step, an agent session, the pinned revision or commit, the
committer date, whether a question was asked, or a brief or packet.

- **Denominator:** 25 clauses.
- **Each clause** is placed by a rule naming its stage, its run class, and
  the form for the other class; 0 are unplaced.
- **Not statements:** 8 clauses are definitions, read rules or the stage
  rule itself (rows 1, 2, 9, 16, 17, 18, 19 and 20).
- **Governed statements:** the other 17 each name a stage and a class
  (copy-class, no-copy or both). None lacks a class qualifier.
- **Missing qualifiers:** round 9's bytes lacked a class qualifier in two
  places, F1's line-37 and line-258 clauses. Both now carry one.

## Stage × class table, derived from the rule

[Inferred, derived from the stage rule. For each statement: the stage it
needs, the class that requires it, and the form for an unreached stage and
for the other class.]

| Statement (source) | Stage | Class | Unreached form | Other-class form |
|---|---|---|---|---|
| Named identifier in full, its reference, no network request, update command (line 240) | identifier named | both | no identifier was named | — |
| Named identifier and how it was chosen (line 37) | identifier named | both | no identifier was named | — |
| Governance-home command at the named identifier (line 31) | identifier named | both | names `--revision` | — |
| Committer date (line 240) | commit pinned | both | the commit was not pinned; date Unknown | — |
| That it is the pinned revision (line 37) | commit pinned | both | the commit was not pinned | — |
| How the copy was made, what Git and Syzygy read (line 37) | copy step started | copy-class | no copy was made | no copy was made |
| Copy location, kept or removed (line 37; launch output, line 248) | copy step started | copy-class | no copy was made | no copy was made |
| Git-programs residual, Inferred (line 258) | copy step started | copy-class | no copy was made | no copy was made |
| Copy statements in the question (line 11) | question asked | copy-class | no question was asked | no copy statement in the question |
| Pinned revision, record list and other question statements (lines 11, 17) | question asked | both | no question was asked | — |
| Whether a question was asked (line 37) | question asked | both | no question was asked | — |
| Sessions directed to work in the copy (line 37) | brief or packet delivered | copy-class | Syzygy issued no brief and delivered no packet | directed to the operator's clone; no copy was made |
| Whether a session stayed in the copy is its own report, Inferred (line 258) | brief or packet delivered | copy-class | Syzygy issued no brief and delivered no packet | sessions worked in the operator's clone; no copy was made |
| Consents recorded at launch (line 37) | (outside the stages) | both | or that none was recorded | — |
| Public declaration (line 37) | (outside the stages) | both | or that none was made | — |

## Every changed block since round 9

[Observed] A line diff between the round-9 spec, rebuilt to the digest in
the round-10 raw's head, and this commit's post-apply spec gives 11
changed lines, each a single paragraph or scenario line:

| Line | Block | Change |
|---|---|---|
| 31 | REQ-046 governance home | command "where one was named, and otherwise naming `--revision`" (F3) |
| 37 | REQ-046 run record and pages | opening disclosures' unreached forms; each governed disclosure names stage and class (F1, F5) |
| 198 | scenario: governance home | mirrors line 31 (F3) |
| 223 | REQ-046 falsifier | class as well as stage (root fix) |
| 238 | REQ-047 pin paragraph | the no-copy "already shows" clause deleted (F4) |
| 240 | REQ-047 revision statements | "(stage: …; both classes)" (root fix) |
| 244 | REQ-047 stage rule | run class, media, subjects, order, brief or packet delivered, sessions only as their own report (root fix, F2, F5) |
| 258 | REQ-047 copy paragraph | residual and sessions statement scoped to copy-class, with the no-copy form (F1, F2) |
| 303 | scenario: HEAD elsewhere in a no-copy run | "checks out the named identifier" (F4) |
| 347 | scenario: alternates | "Syzygy issued no brief and delivered no packet" (F2) |
| 390 | REQ-047 falsifier | class as well as stage; the agent-session arm (root fix, F2) |

[Observed] The other sweeps, re-run over this commit's post-apply spec:

- **"copy":** 181 occurrences, all labelled.
- **"pin":** 85 occurrences, all labelled.
- **Pronoun pass:** 80 arm and THEN/AND lines, 82 hits, 0 class-rule hits.

Their tables are not repeated here. The scripts and labelling rules are
those of rounds 8 and 9.

## The class-qualifier sweep, in full

| # | Line | Clause (opening) | Stage | Class | Other-class form |
|---|---|---|---|---|---|
| 1 | 9 | of the copy that a copy-class run's copy step makes, as REQ-polaris-generation-047 defines those terms, the files of it… | (a read rule of the pre-answer list, not a statement) | — | — |
| 2 | 9 | and, as Git objects by object identifier in the run's clone, which in a copy-class run is the copy once its copy step h… | (a read rule of the pre-answer list, not a statement) | — | — |
| 3 | 11 | the pinned revision in full and how it was chosen | question asked (after commit pinned) | both | — |
| 4 | 11 | for a subject that is governed or whose drawer status is unknown, the agent provider and content classes the statement … | question asked | both | — |
| 5 | 11 | for a copy-class run, whose copy is made before the question, that the run's clone is a copy of the pinned commit alone… | question asked (follows copy step and pin) | copy-class | no-copy: the question carries no copy statement (rule: no copy was made) |
| 6 | 11 | and that the copy, its checked-out files included, was made before the answer, that Syzygy has read none of its blobs, … | question asked (copy-class clause of the question) | copy-class | no-copy: the question carries no copy statement |
| 7 | 17 | it is then a matching record for the identity proposal and the record list, named in the question with how it matched, … | question asked | both | — |
| 8 | 31 | Where the clone's working tree, or its Git directory or common Git directory, is the governance home's, Syzygy SHALL re… | identifier named | both | unreached: names `--revision` |
| 9 | 37 | under REQ-polaris-generation-047's stage rule, each with the stage it needs and the run class that requires it: for bot… | (governs the list below) | both | — |
| 10 | 37 | for a copy-class run, once its copy step started, how the copy was made and what Git and Syzygy read of the operator's … | copy step started | copy-class | no-copy: that no copy was made |
| 11 | 37 | for a copy-class run, once a brief or packet was delivered, that the agent sessions were directed to work in the copy, … | brief or packet delivered | copy-class | no-copy: directed to the operator's clone, no copy made |
| 12 | 37 | for both classes, once an identifier was named, the named identifier and how it was chosen, and, once the commit was pi… | identifier named; commit pinned | both | — |
| 13 | 240 | Once an identifier is named (stage: identifier named; both classes), they SHALL state the named identifier in full, the… | identifier named | both | — |
| 14 | 240 | Once the commit is pinned (stage: commit pinned; both classes), they SHALL state its committer date as the commit objec… | commit pinned | both | — |
| 15 | 240 | a run that did not reach that stage states that the commit was not pinned and that its committer date is Unknown, never… | commit pinned (unreached form) | both | — |
| 16 | 244 | Every statement this change requires of the question, the launch output, the run record or a page about the named ident… | (the stage rule itself) | — | — |
| 17 | 244 | For each such stage the run did not reach, the run SHALL state, as what Syzygy did, that it was not reached: that no id… | (the stage rule itself) | — | — |
| 18 | 246 | The copy statements are the statements about the copy that REQ-polaris-generation-046 requires of the question, the run… | (definition) | copy-class | no-copy: no copy was made |
| 19 | 248 | In a copy-class run, before the question, or before the brief where no question is asked, Syzygy SHALL make the copy as… | (the copy-step rule, not a statement) | — | — |
| 20 | 248 | the creation of the copy's directory and the Git processes it starts to do so are the copy step. | (definition) | — | — |
| 21 | 248 | Where the run ends before its brief, by a refusal or an answer that confirms nothing, Syzygy SHALL remove the copy, its… | copy step started | copy-class | no-copy: no copy was made |
| 22 | 248 | Otherwise the copy is the run's clone for the rest of the run and is kept after it, outside the run's state directory, … | brief or packet delivered (completed run) | copy-class | no-copy: no copy was made |
| 23 | 258 | Once a copy-class run's copy step started (stage: copy step started; copy-class), the run record SHALL state, labelled … | copy step started | copy-class | no-copy: no copy was made |
| 24 | 258 | Once a copy-class run's brief or packet was delivered, the run record SHALL state, labelled Inferred, that whether a se… | brief or packet delivered | copy-class | no-copy: sessions worked in the operator's clone, no copy made |
| 25 | 258 | for a no-copy run, it states that the sessions worked in the operator's clone and that no copy was made. | brief or packet delivered | no-copy | (this is the no-copy form) |
