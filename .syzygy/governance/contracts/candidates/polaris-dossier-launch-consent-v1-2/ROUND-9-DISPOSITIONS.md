# Round 9 dispositions — Polaris dossier launch consent, version 1.2

> **Candidate — binds nothing.** [Observed] Round 9
> (`docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-9-RAW.md`) read commit
> `35e46950` and returned `REVISE` (line 4) with three revise findings and
> three notes. Finding 1 is the class that came back in rounds 6, 7 and 9:
> a statement that a run refused at some stage is required to make but
> cannot make truthfully. The coordinating session directed a root fix
> instead of another per-statement repair. This page records:
>
> - that fix;
> - the two terms it needed;
> - the sweeps over "pin" and "copy";
> - the stage sweep rebuilt from the new rule.
>
> Line numbers are those of the post-apply spec of the commit that carries
> this page. Nothing here is a review or a verdict; round 10 decides that.

## The root fix: one stage rule

The stages are now named once, in REQ-047 (line 244). A run reaches them in
order, and it reaches as many as it gets to:

1. **identifier named** — the run's pin rule has given a named identifier.
2. **copy step started** — for a copy-class run only.
3. **commit pinned** — the named identifier has been shown to be a commit.
   In a copy-class run, this is when the copy holds the commit.
4. **question asked**
5. **brief issued**
6. **agent session started** — an agent session of the run has been given a
   brief or packet by Syzygy, so it never comes before brief issued.

The coordinator's six stage names map onto these as follows:

- "pinned" splits into **identifier named** and **commit pinned** (finding 2);
- "copy held the commit" is **commit pinned** in a copy-class run;
- the other four keep their names.

The rule (line 244): "Every statement this change requires of the launch
output, the run record or a page about the copy, the agent sessions, the
pinned commit or the question SHALL be made only for a stage the run
reached, and each such statement names the stage it needs; for each such
stage the run did not reach, the run SHALL state that it was not reached,
as that no identifier was named, that no copy was made, that the commit was
not pinned and its committer date is Unknown, that no question was asked,
that no brief was issued or that no agent session was started, and SHALL
NOT state the thing itself. A no-copy run states that no copy was made."

REQ-046 refers to the rule. Each specific clause is reduced to what it
states once its stage is reached:

- **Line 37 (run record and pages).** The clause now says "under
  REQ-polaris-generation-047's stage rule, each for the stage it needs". It
  covers:
  - whether a question was asked;
  - once the copy step started: how the copy was made, the reads, the
    location, and kept or removed;
  - once a brief was issued: that the agent sessions were directed to work
    in the copy (finding 1);
  - once an identifier was named: the named identifier and how it was
    chosen;
  - once the commit was pinned: that it is the pinned revision;
  - for each stage not reached: that it was not reached.
- **Line 240 (launch output and run record).** Once an identifier is named:
  the named identifier in full, its reference, the no-network statement and
  the update command. Once the commit is pinned: the committer date, which
  Syzygy reads. A run that did not reach that stage states that the commit
  was not pinned and that its date is Unknown. The old wording ("where read,
  else Unknown", "the refusal alone") is gone.
- **Line 258 (run record).** The Git-programs residual is stated once the
  copy step started, "for every Git process the copy step started". A new
  statement is required once an agent session started: whether a session
  stayed in the copy is its own report, labelled Inferred.
- **Line 246.** The copy statements are defined as before, and "the stage
  rule governs each".
- **Both arms.**
  - Line 223, REQ-046: "a statement REQ-polaris-generation-047's stage rule
    governs is missing from the question, the launch output, the run record
    or a page for a stage the run reached, or is stated for a stage it did
    not reach, or a stage it did not reach is not stated as not reached".
  - Line 390, REQ-047: the same, worded for the stage rule.
- **The alternates scenario** (lines 344 to 347).
  - It now refuses "before its copy step starts".
  - Its launch output states the named identifier, that the commit was not
    pinned, and the date as Unknown.
  - It also states that no copy was made, no question was asked, no brief
    was issued and no agent session was started.

## 1 — A run refused after its copy step started had to state that sessions were directed to the copy

**Repaired by the stage rule.** The direction statement now needs the
stage brief issued (line 37).

- A run refused at D, P, Q0 or Q states "no brief was issued" and "no agent
  session was started".
- It does not state the direction.
- The statement-declined run (lines 73–77) is one of these.

## 2 — A non-commit `--revision` was both "SHALL NOT pin" and pinned

**Repaired by two terms, defined once** (line 238):

- **The named identifier.** "The full object identifier a run's pin rule
  gives, before any object is read, is the run's named identifier."
- **The pinned revision, or pinned commit.** The named identifier becomes it
  "only once it is shown to be a commit":
  - in a copy-class run, when the copy's detached checkout leaves the copy's
    `HEAD` at the named identifier;
  - in a no-copy run, when Syzygy reads it as a commit object as REQ-033 and
    REQ-046 permit, "which an observation consent's naming of it as a
    revision already shows".
- "Wherever this change says pinned revision or pinned commit, it means
  that commit, and a rule that acts before it is shown acts on the named
  identifier."

Each place now uses the right term:

- **The non-commit.** "the run is never pinned". Syzygy refuses, naming
  `--revision` or the reference the named identifier came from, and "SHALL
  NOT follow that object to any object it names or use it beyond the copy
  step and that refusal". The arm (line 390) reads "a named identifier that
  is not a commit is pinned or followed, or used beyond the copy step and
  its refusal".
- **`--revision`.** It gives the named identifier, and a name that resolves
  to no object identifier is refused.
- **The class decision** (line 242) is made "from the consents and the named
  identifier". "Every run to which this requirement's pin rule gives a named
  identifier" replaces "every run this requirement pins".
- **The fetch** (line 248) takes "the object the named identifier names
  alone".
- **The refusals.** The failed-checkout refusal names the named identifier.
  The copy-failure rule (line 258) speaks of "the named object".
- **Line 240** is as above.
- **The pre-answer list** (line 9) reads the commit object "in a copy-class
  run only once the commit is pinned".
- **Other uses that act before the commit is shown** now name the named
  identifier:
  - the governance-home command (line 31, and its scenario);
  - the WHEN of the copy-failure scenario;
  - the WHEN of the commit-whose-checkout-fails scenario;
  - the delta-base clause of line 250;
  - the conformance case.
- **The packed-refs sub-point.** Syzygy "SHALL NOT tell an object's type
  from a `packed-refs` peel line or any other reference data". So an
  annotated tag is always refused after its copy step. The THEN of the
  scenario "removes the copy" therefore holds as written.

## 3 — The copy's directory could exist before the copy step started

**Repaired.** The copy step now begins with the directory (lines 242 and
248): "the creation of the copy's directory and the Git processes … are
the copy step, … started once Syzygy has created that directory".

- The removal rule removes "the copy, its directory included".
- The alternates refusal (line 255) is now "before the copy step starts".
- The reftable refusal stays "before any Git process starts". A copy-class
  run refused for reftable after creating the directory has reached copy
  step started, so it removes the directory and says so.

## 4 — Pre-answer reads stored in the run record (G5)

**Repaired in the text, and carried to the owner.**

- **Line 9** now lets Syzygy store the results of its pre-answer reads in
  "the run record, as the statements this change requires of it".
- **The arm at line 223** reads "stored outside the question, the launch
  output, the run record's required statements and the launch consent
  records".
- **The owner page** gains a note. It records that v1.0 round 2's G5 is
  resolved this way, and that refused runs made this unavoidable.

## 5 — "Only such a launch observation consent"

**Repaired** (line 246, and the arm at line 390). The rule now reads: "Where
no observation consent made by another act covers a no-copy run, so that a
launch observation consent of that scope does". The one-commit form
therefore binds a revision that launch consents of both scopes name. The
arm now trips for "a run that a launch observation consent recorded with
the operator's-own-clone scope covers [that] is a copy-class run or starts
a copy step, or, where no observation consent made by another act covers
it, runs on a clone that departs from the one-commit form unrefused".

## 6 — Earlier concerns

**Noted.** The class of finding 1 is now governed by one rule and two arms,
not by a statement-by-statement scope.

## Stage sweep, round 9: derived from the stage rule

[Inferred, derived from the stage rule. Each statement is made when its
stage is reached and replaced by its "not reached" form otherwise.]

| Statement (source) | Stage it needs | Form when the stage was not reached |
|---|---|---|
| Named identifier in full, its reference, no network request, update command (line 240) | identifier named | no identifier was named |
| Named identifier and how it was chosen (line 37) | identifier named | no identifier was named |
| Committer date (line 240) | commit pinned | the commit was not pinned; date Unknown |
| That it is the pinned revision (line 37) | commit pinned | the commit was not pinned |
| How the copy was made, what Git and Syzygy read (line 37) | copy step started | no copy was made |
| Copy location, kept or removed (line 37; launch output, line 248) | copy step started | no copy was made |
| Git-programs residual, Inferred (line 258) | copy step started | no copy was made |
| Copy statements in the question (line 11) | question asked | no question was asked |
| Whether a question was asked (line 37) | question asked | no question was asked |
| Who answered, Inferred (line 37) | question asked | no question was asked |
| Agent sessions directed to work in the copy (line 37) | brief issued | no brief was issued |
| A session's staying in the copy is its own report, Inferred (line 258) | agent session started | no agent session was started |

Applied by the last stage a run reached:

| Last stage reached | Example refusals | Named identifier | Copy | Pinned and date | Question | Brief | Agent session |
|---|---|---|---|---|---|---|---|
| none | no trunk; several remote defaults; ambiguous abbreviation | no identifier was named | no copy was made | not pinned; Unknown | no question was asked | no brief was issued | none was started |
| identifier named, copy-class | alternates; reftable before the directory | stated | no copy was made | not pinned; Unknown | none was asked | none was issued | none was started |
| identifier named, no-copy | (see note) | stated | no copy was made | pinned once named: date read | none was asked | none was issued | none was started |
| copy step started | fetch or checkout failure; non-commit; reftable after the directory | stated | made, read, removed | not pinned; Unknown | none was asked | none was issued | none was started |
| commit pinned | departing copy or clone; several identities; URL not admitted; governance home; write consent absent; no terminal (Q0); HEAD mismatch (no-copy) | stated | made, read, removed (no-copy: no copy was made) | pinned; date read | none was asked | none was issued | none was started |
| question asked | no answer; wrong phrase; statement declined; not declared public | stated | made, read, removed | pinned; date read | asked, with its statements | none was issued | none was started |
| brief issued | (a run that ends before any session) | stated | kept, location named | pinned; date read | asked or not | directed to the copy | none was started |
| agent session started | completed run | stated | kept, location named | pinned; date read | asked or not | directed to the copy | stated, Inferred |

[Inferred] Notes on this table:

- In a no-copy run, the named identifier is a revision a consent names, so
  it reaches commit pinned as soon as it is named. Its row "identifier
  named, no-copy" is therefore empty of refusals and is shown only for
  completeness.
- Nothing orders these refusals against the copy step: several
  identities, URL not admitted, governance home, write consent absent, and
  no terminal (Q0). Each falls in the row of the last stage it reached. The
  table lists them under commit pinned only as an example.
- Every cell is either the statement, made because its stage was reached,
  or its "not reached" form. No cell needs a statement the run cannot make
  truthfully.

## Sweep: every "pin", "pins", "pinned" and "pinning" in REQ-046 and REQ-047

[Observed] Population: every match of `\bpin(s|ned|ning)?\b`, case folded,
in lines 7 to 402 of the post-apply spec: 84 occurrences. A script labels
each one by its context, and the full list is below.

[Inferred] The 37 rows labelled "used where the stage commit pinned is
reached" were read by hand. Each sits in one of these:

- a question, record, brief or page statement, which needs that stage;
- the copy's form check, which follows the checkout;
- a no-copy run, which is pinned once named;
- a scenario whose run completes.

| Term | Occurrences |
|---|---|
| pinned revision / pinned commit, used where the stage commit pinned is reached | 37 |
| pin (verb): the pin rule choosing the run's revision | 19 |
| stage: commit pinned (named in the stage rule) | 14 |
| REQ-033's consented-HEAD pin (pinned once named) | 9 |
| definition of pinned revision / pinned commit | 4 |
| heading (REQ-047's title) | 1 |
| **Total** | **84** |

The copy sweep was re-run over the same lines: 165 occurrences of
`\bcop(y|ies|ied)\b`. Every occurrence is placed, and the script's
assertion that none is left unlabelled passes. The pronoun pass covers 80
arm and THEN/AND lines, gives 77 hits, and finds 0 class-rule hits. The
retired phrasings ("makes a copy", "made a copy", "makes no copy", "run
with a copy", "runs without one") occur 0 times.

| # | Line | Word | Term | Context |
|---|---|---|---|---|
| 1 | 9 | pinned | pinned revision / pinned commit: used where the stage commit pinned is reached | …t REQ-polaris-generation-033 requires for the repository at the run's pinned revision (REQ-polaris-generation-047), Syzyg… |
| 2 | 9 | pinned | stage: commit pinned (named in the stage rule) | …e named identifier names, in a copy-class run only once the commit is pinned, of which it SHALL use only the root tree id… |
| 3 | 9 | pinned | pinned revision / pinned commit: used where the stage commit pinned is reached | …poses, and the content classes its path classification assigns at the pinned revision. Those classes are a preview: the e… |
| 4 | 11 | pinned | pinned revision / pinned commit: used where the stage commit pinned is reached | …he repository identity and the first twelve hexadecimal digits of the pinned revision. The question SHALL state, before t… |
| 5 | 11 | pinned | pinned revision / pinned commit: used where the stage commit pinned is reached | …erator) and that it is Inferred, and that the phrase declares it; the pinned revision in full and how it was chosen; that… |
| 6 | 11 | pinned | pinned revision / pinned commit: used where the stage commit pinned is reached | …py is made before the question, that the run's clone is a copy of the pinned commit alone, which Syzygy made from the ope… |
| 7 | 11 | pinned | pinned revision / pinned commit: used where the stage commit pinned is reached | …erences and object store, the stored bytes of delta bases outside the pinned commit's objects included, to make it, that … |
| 8 | 15 | pinned | pinned revision / pinned commit: used where the stage commit pinned is reached | …, its recorded normalised URL equals the derived URL, or it names the pinned revision or a parent of the pinned commit. T… |
| 9 | 15 | pinned | pinned revision / pinned commit: used where the stage commit pinned is reached | …s the derived URL, or it names the pinned revision or a parent of the pinned commit. The proposed identity SHALL be: the … |
| 10 | 17 | pinned | pinned revision / pinned commit: used where the stage commit pinned is reached | …st, named in the question with how it matched, and where it names the pinned revision it is an in-force consent the run h… |
| 11 | 17 | pinned | pinned revision / pinned commit: used where the stage commit pinned is reached | …at does not match by URL may still match by identity or by naming the pinned revision or a parent, and a HEAD that any in… |
| 12 | 17 | pinned | pin rule, REQ-033's consented HEAD (a revision a consent names: pinned once named) | …d revision or a parent, and a HEAD that any in-force consent names is pinned as that requirement states. By URL alone, a … |
| 13 | 21 | pinned | pinned revision / pinned commit: used where the stage commit pinned is reached | …and RFC3-7 define it: class observation; subject that pair; scope the pinned revision's commit object and the tree and bl… |
| 14 | 23 | pinned | pinned revision / pinned commit: used where the stage commit pinned is reached | …on-governed under a launch drawer statement only when the tree at the pinned revision also meets REQ-polaris-generation-0… |
| 15 | 25 | pinned | pinned revision / pinned commit: used where the stage commit pinned is reached | …se classes include every class the path classification assigns at the pinned revision SHALL be reused and named, and noth… |
| 16 | 27 | pin | pin (verb): the pin rule choosing the run's revision | …SHALL NOT be the trunk, the current branch or any reference a run may pin; it SHALL create the record files and the co… |
| 17 | 27 | pins | pin (verb): the pin rule choosing the run's revision | … the trunk tip and never becomes part of a revision the trunk default pins, the observing project's own included. A rec… |
| 18 | 35 | pinned | pinned revision / pinned commit: used where the stage commit pinned is reached | …tion consent names, which a launch consent record meets by naming the pinned revision; its per-project statement and its … |
| 19 | 37 | pinned | stage: commit pinned (named in the stage rule) | … the named identifier and how it was chosen, and, once the commit was pinned, that it is the pinned revision; and, for ea… |
| 20 | 37 | pinned | stage: commit pinned (named in the stage rule) | …nd how it was chosen, and, once the commit was pinned, that it is the pinned revision; and, for each such stage the run d… |
| 21 | 45 | pinned | pinned revision / pinned commit: used where the stage commit pinned is reached | … a repository declared public that no record names, whose tree at the pinned revision holds no `openspec/**` path and no … |
| 22 | 46 | pinned | pinned revision / pinned commit: used where the stage commit pinned is reached | …gy asks the question, proposing the derived identity as Inferred, the pinned revision and what each record permits… |
| 23 | 51 | pinned | pinned revision / pinned commit: used where the stage commit pinned is reached | …- **WHEN** the tree at the pinned revision holds an `openspec/**` path, and th… |
| 24 | 63 | pinned | pinned revision / pinned commit: used where the stage commit pinned is reached | …declared provider whose classes include every class assigned at a new pinned revision… |
| 25 | 69 | pinned | pinned revision / pinned commit: used where the stage commit pinned is reached | …-force statement's classes do not include a class assigned at the new pinned revision, and the owner gives the phrase for… |
| 26 | 98 | pinned | pinned revision / pinned commit: used where the stage commit pinned is reached | …**WHEN** in-force records already hold the observation consent at the pinned revision and every statement the subject nee… |
| 27 | 110 | pinned | pinned revision / pinned commit: used where the stage commit pinned is reached | … repository with a revoked record carries another remote URL, and the pinned commit and its parents are named by no recor… |
| 28 | 145 | pinned | pinned revision / pinned commit: used where the stage commit pinned is reached | … and the `Upstream:` URL `https://git.example.org/c/d.git`, names the pinned revision, and the clone's `origin` remote is… |
| 29 | 193 | pins | pin (verb): the pin rule choosing the run's revision | …- **AND** the second run pins the same trunk tip, finds the in-force recor… |
| 30 | 200 | pinned | pinned revision / pinned commit: used where the stage commit pinned is reached | …#### Scenario: Owner placements absent at the pinned revision… |
| 31 | 202 | pinned | pinned revision / pinned commit: used where the stage commit pinned is reached | …- **WHEN** a launch-consented run's pinned revision is named by no owner placement… |
| 32 | 219 | pinned | pinned revision / pinned commit: used where the stage commit pinned is reached | …tity option given or not; existing records matching by identity, URL, pinned revision or parent, in each state, carrying … |
| 33 | 219 | pinned | pinned revision / pinned commit: used where the stage commit pinned is reached | …ctory is the governance home's; owner placements at and away from the pinned revision; whether the run is a copy-class ru… |
| 34 | 223 | pinned | pinned revision / pinned commit: used where the stage commit pinned is reached | …ated on any answer but that none exists; a record names more than the pinned revision; a file of the governance home or o… |
| 35 | 223 | pin | pin rule, REQ-033's consented HEAD (a revision a consent names: pinned once named) | …al, or the URL match prevents a match by identity or revision, or the pin of a consented HEAD; visibility is inferred … |
| 36 | 236 | pinned | heading (title of REQ-047) | …### Requirement: Trunk-tip revision pinned at launch… |
| 37 | 238 | pin | pin rule, REQ-033's consented HEAD (a revision a consent names: pinned once named) | …ever that consent's subject identity and whichever act made it, SHALL pin that HEAD exactly as REQ-polaris-generation-… |
| 38 | 238 | pinned | pin rule, REQ-033's consented HEAD (a revision a consent names: pinned once named) | …requirement changes nothing else in how the revision of such a run is pinned. The full object identifier a run's pin rule… |
| 39 | 238 | pin | pin (verb): the pin rule choosing the run's revision | … revision of such a run is pinned. The full object identifier a run's pin rule gives, before any object is read, is th… |
| 40 | 238 | pinned | definition: pinned revision / pinned commit | …y object is read, is the run's named identifier; it becomes the run's pinned revision, its pinned commit, only once it is… |
| 41 | 238 | pinned | definition: pinned revision / pinned commit | …the run's named identifier; it becomes the run's pinned revision, its pinned commit, only once it is shown to be a commit… |
| 42 | 238 | pinned | definition: pinned revision / pinned commit | …s naming of it as a revision already shows. Wherever this change says pinned revision or pinned commit, it means that com… |
| 43 | 238 | pinned | definition: pinned revision / pinned commit | … revision already shows. Wherever this change says pinned revision or pinned commit, it means that commit, and a rule tha… |
| 44 | 238 | pin | pin (verb): the pin rule choosing the run's revision | …efore it is shown acts on the named identifier. Every other run SHALL pin exactly one revision at launch, before the q… |
| 45 | 238 | pin | pin (verb): the pin rule choosing the run's revision | …le a remote default is recorded, no local branch is consulted for the pin: where a local branch of the same name point… |
| 46 | 238 | pinned | stage: commit pinned (named in the stage rule) | …ect that is not a commit, an annotated tag included, the run is never pinned: Syzygy SHALL refuse, naming `--revision` wh… |
| 47 | 240 | pinned | stage: commit pinned (named in the stage rule) | …wn command to update the clone before a later run. Once the commit is pinned (stage: commit pinned), they SHALL state its… |
| 48 | 240 | pinned | stage: commit pinned (named in the stage rule) | …he clone before a later run. Once the commit is pinned (stage: commit pinned), they SHALL state its committer date as the… |
| 49 | 240 | pinned | stage: commit pinned (named in the stage rule) | …s; a run that did not reach that stage states that the commit was not pinned and that its committer date is Unknown, neve… |
| 50 | 242 | pin | pin (verb): the pin rule choosing the run's revision | …k, check out in or write to it. Every run to which this requirement's pin rule gives a named identifier, the run its f… |
| 51 | 242 | pins | pin rule, REQ-033's consented HEAD (a revision a consent names: pinned once named) | …ement's pin rule gives a named identifier, the run its first sentence pins included, SHALL run on a copy unless its nam… |
| 52 | 244 | pin | pin (verb): the pin rule choosing the run's revision | …er, as many of these stages as it gets to: identifier named, once its pin rule has given a named identifier; copy step… |
| 53 | 244 | pinned | stage: commit pinned (named in the stage rule) | …n a named identifier; copy step started, for a copy-class run; commit pinned, once the named identifier is shown to be a … |
| 54 | 244 | pinned | pinned revision / pinned commit: used where the stage commit pinned is reached | …put, the run record or a page about the copy, the agent sessions, the pinned commit or the question SHALL be made only fo… |
| 55 | 244 | pinned | stage: commit pinned (named in the stage rule) | … identifier was named, that no copy was made, that the commit was not pinned and its committer date is Unknown, that no q… |
| 56 | 246 | pinned | stage: commit pinned (named in the stage rule) | … reason, a clone that departs from it. The named identifier, and once pinned the pinned revision, is the revision the lau… |
| 57 | 246 | pinned | stage: commit pinned (named in the stage rule) | …clone that departs from it. The named identifier, and once pinned the pinned revision, is the revision the launch consent… |
| 58 | 248 | pinned | pinned revision / pinned commit: used where the stage commit pinned is reached | …ever recorded or rendered as one. The operator's HEAD need not be the pinned revision, and the copy's HEAD is the pinned … |
| 59 | 248 | pinned | pinned revision / pinned commit: used where the stage commit pinned is reached | …or's HEAD need not be the pinned revision, and the copy's HEAD is the pinned revision. The copy SHALL hold the pinned com… |
| 60 | 248 | pinned | pinned revision / pinned commit: used where the stage commit pinned is reached | …, and the copy's HEAD is the pinned revision. The copy SHALL hold the pinned commit and the trees and blobs reachable fro… |
| 61 | 267 | pins | pin rule, REQ-033's consented HEAD (a revision a consent names: pinned once named) | …- **THEN** Syzygy pins HEAD exactly as REQ-polaris-generation-033 s… |
| 62 | 272 | pins | pin rule, REQ-033's consented HEAD (a revision a consent names: pinned once named) | …- **THEN** Syzygy still pins HEAD exactly as REQ-polaris-generation-033 s… |
| 63 | 272 | pin | pin rule, REQ-033's consented HEAD (a revision a consent names: pinned once named) | …l pins HEAD exactly as REQ-polaris-generation-033 states and does not pin the trunk tip or refuse for it… |
| 64 | 277 | pins | pin (verb): the pin rule choosing the run's revision | …- **THEN** Syzygy pins the commit `main` points to, and states it i… |
| 65 | 283 | pins | pin (verb): the pin rule choosing the run's revision | …- **THEN** Syzygy pins the commit `master` points to… |
| 66 | 293 | pins | pin (verb): the pin rule choosing the run's revision | …- **THEN** Syzygy pins that commit's full identifier, and any quest… |
| 67 | 297 | pinned | pinned revision / pinned commit: used where the stage commit pinned is reached | …- **WHEN** the pinned revision is the trunk tip, which no in-force… |
| 68 | 298 | pinned | pinned revision / pinned commit: used where the stage commit pinned is reached | …- **THEN** the run is a copy-class run, Syzygy makes the copy at the pinned revision and does not refuse, and the operat… |
| 69 | 303 | pinned | pinned revision / pinned commit: used where the stage commit pinned is reached | …nges nothing in the clone, and prints the command that checks out the pinned revision… |
| 70 | 308 | pins | pin (verb): the pin rule choosing the run's revision | …- **THEN** Syzygy pins the commit `refs/remotes/origin/main` points… |
| 71 | 315 | pins | pin rule, REQ-033's consented HEAD (a revision a consent names: pinned once named) | …- **THEN** Syzygy pins that HEAD, the run is a copy-class run, Syzy… |
| 72 | 320 | pins | pin (verb): the pin rule choosing the run's revision | …- **THEN** the run is a launch-consented run: Syzygy pins the named commit, the run is a copy-class ru… |
| 73 | 335 | pins | pin (verb): the pin rule choosing the run's revision | …- **THEN** Syzygy pins the commit `refs/remotes/origin/main` points… |
| 74 | 346 | pinned | stage: commit pinned (named in the stage rule) | …e named identifier in full and its reference, that the commit was not pinned, and the committer date as Unknown… |
| 75 | 381 | pinned | pinned revision / pinned commit: used where the stage commit pinned is reached | …tates that the operator fetches the consented commit alone, names the pinned revision, whether or not the run also relies… |
| 76 | 387 | pinned | pinned revision / pinned commit: used where the stage commit pinned is reached | …- **Observable:** The pinned revision, its stated reference and date, the… |
| 77 | 388 | pins | pin (verb): the pin rule choosing the run's revision | …- **Oracle:** Expected pins, statements and refusals derived by an indep… |
| 78 | 389 | pins | pin (verb): the pin rule choosing the run's revision | …- **Oracle independence:** Fixture clones, records and expected pins are built outside the code under test; netwo… |
| 79 | 390 | pins | pin (verb): the pin rule choosing the run's revision | …- **Falsifier:** A run pins a commit other than the rule's; a run whose … |
| 80 | 390 | pinned | pin (verb): the pin rule choosing the run's revision | … in-force consent names, whatever the identity its remote derives, is pinned elsewhere or refused for the trunk tip; the … |
| 81 | 390 | pin | pin (verb): the pin rule choosing the run's revision | …remote derives, is pinned elsewhere or refused for the trunk tip; the pin changes within a run; for a no-copy run, a H… |
| 82 | 390 | pinned | stage: commit pinned (named in the stage rule) | …e, the no-network statement or the update command; once the commit is pinned, they lack its committer date as the commit … |
| 83 | 390 | pinned | pinned revision / pinned commit: used where the stage commit pinned is reached | …ment states, or the run goes on although the copy holds more than the pinned commit and what its root tree reaches or dep… |
| 84 | 390 | pinned | stage: commit pinned (named in the stage rule) | …its location is not named; a named identifier that is not a commit is pinned or followed, or used beyond the copy step an… |
