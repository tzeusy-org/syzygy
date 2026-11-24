# Vision pursuit — Polaris dossier generation, run 5 — 2026-11-21

This file is for planning only. It is not authority and not a review verdict. Claims carry the
labels `[Observed]`, `[Inferred]` or `[Unknown]` that the lanes gave them. Every finding and
move, with its full basis, is in `docs/pursuits/2026-11-21b-vision-pursuit-data.json`:

```sh
jq '.ranked_moves[] | {id, title, owner_value, build_cost, prereq}' docs/pursuits/2026-11-21b-vision-pursuit-data.json
jq '.units[] | select(.unit=="economy")' docs/pursuits/2026-11-21b-vision-pursuit-data.json
jq '.score' docs/pursuits/2026-11-21b-vision-pursuit-data.json
```

## Scope and provenance

| Item | Value |
|---|---|
| Run | Fifth Polaris pursuit, the third scoped to dossier generation. It chains from `docs/pursuits/2026-11-21-vision-pursuit.md` (run 4, moves Q1–Q14, epic `syzygy-3efd`) and `docs/pursuits/2026-11-09-vision-pursuit.md` (run 3, moves P1–P15, epic `syzygy-fnry`). |
| Owner's question | "Factoring in all planned work, have we really done all we can (or even 80% of the way there) to get Polaris close to our vision? Is the end product one that you would be proud of, and one that is a substantial improvement over vanilla sessions asking LLMs for syntheses of their repositories? If not: proceed with more rounds until we get to an 85% point." |
| Why a fifth run | The orchestrator's own judgement of the plan after run 4 was 50 to 60 percent. Runs 3 and 4 covered truth, structure, figures and generality. Six areas had no audit at all: proof against a plain session, depth of insight, prose, beauty, economy, and life after close. This run covers those six and nothing else. |
| Syzygy | Read at `origin/main` `93b710b55`. |
| Subject output | The newest real dossier (Redis 8.10.2, closed 2026-11-15) and the five other stored runs of the same repository. Run directories were read only; no run was started. |
| Lanes | Two long-lived lanes, one checkpoint file per unit: an audit lane (vanilla baseline, insight depth, prose, beauty, economy, lifecycle, sweep) and an ideation lane (beat vanilla, the why, craft, voice, economy, living document, cross-lens). Figures come from small scripts the lanes wrote over the stored runs. |
| Scoring | An eight-dimension rubric, fixed before the lanes ran, with one rule: a dimension with no planned way to measure it cannot score above 60. A fresh reviewer scored the plan before and after this run; see "Where the plan stands". |
| Limit | All six real runs are of redis/redis. No plain-session output exists on disk, so every statement about how a plain session performs is `[Inferred]`. |

## The answer in brief

*Where it ended, 2026-11-21:* after ten rounds two independent reviewers score the plan 85.8
and 81.2. Neither figure is a measurement of a dossier. The first measurements, over the six
stored runs, confirm one planned saving, empty another, and show that a single run today
holds 14 to 51 percent of what six runs found together. See "Rounds 8 to 10" under "Where the
plan stands". Twenty-nine moves follow, not the twenty this section counted when written.

*And the first comparison with a plain session, run the same day as a pilot:* readers got 33
percent of the required facts from the newest dossier, 46 percent from a plain session's
synthesis, up to 61 percent from an earlier dossier of the same commit, and 95 percent by asking a
session that had the source. See "Round 11".

No: before this run the plan would not have produced something that is demonstrably better than
asking a capable model to explain a repository. It would have produced something more
*trustworthy*, with better figures, and nobody could have shown that it was better.

The audit found three causes behind all six thin areas.

1. **One session is asked to do every job at once.** The author's brief is 4,910 words; 711 are
   about citation, quotation and labelling and 170 about how to write `[Observed]`. The same
   session must explore, cover an independent inventory it has never seen, stay under 300 words
   a section, and write well. The result is correct and flat: the newest draft is 2,100 words
   for all of Redis, with one choice, one trade-off and one limit on record, no judgement and
   no Inferred block `[Observed]`.
2. **The rules forbid whole kinds of content instead of labelling them.** History is never
   read (the clone holds one commit). No test file is cited (300 exist). The author may not
   compare the project's choice with any alternative, and may not state an advantage the
   project does not state, even marked Inferred (`brief.ts:72-73`) `[Observed]`. Doctrine
   already provides the labels that would make this content honest. A plain session supplies
   all of it freely, unchecked.
3. **Nothing is measured against anything outside the dossier.** The reader test can only
   replay answers written in advance and grades none of them. No run records what it cost in
   tokens. Three question sets disagree. No check looks at the first screen `[Observed]`.

One finding changes the economics. Fidelity review said "not ready" in 20 of 27 verdicts, and
of 134 blocking findings 63 were about inventory entries the draft did not mention, against 7
where a cited span did not support its claim `[Observed]`. Most review rounds are bookkeeping,
not falsehood. A mechanical pre-check can list those entries before any reviewer is asked.

Twenty moves follow: fifteen from the lanes, and five more after an independent reviewer
scored the first fifteen at 74 and named the gaps (R16–R20). In order of what they are for:

- **Prove it** (R1–R3): a benchmark against a plain session with a win rule fixed in advance,
  a checker that runs over any free-form text, and recorded cost.
- **Make it cheaper** (R4–R5): coverage settled before review; never review the same bytes
  twice; a labelled fast draft.
- **Make it read well** (R6–R7): an editor session that check fences from changing any claim;
  quotations set as evidence, not spliced into sentences.
- **Make it deeper** (R8–R10): ask for the non-obvious by name; comparison under a label; the
  why from tests, release notes and markers; history as a consented class.
- **Make it beautiful** (R11–R12): one token system with a lint; the first screen composed and
  asserted in pixels.
- **Make it live** (R13–R15, R20): print and bundle; refresh to a new commit with a "what
  changed" page; find by task and ask, with checked answers; a staleness stamp.
- **Make it improve itself** (R16–R19): agent-started runs over a corpus of public
  repositories; readers rate the surface; every benchmark loss becomes a repair; coverage is
  checked against what the repository itself says matters.

## Where the plan stands

An independent reviewer scored the end product *if every planned move is built as written*,
three times, each time as strictly as the first. Scores are 0 to 100 per dimension; the total is
weighted. All of it is `[Inferred]`: a reviewer's judgement of a plan, not a measurement.

| Dimension (weight) | Before run 5 | R1–R15 | + round 6 | + round 7 |
|---|---|---|---|---|
| 1 Truth (15) | 80 | 83 | 84 | 85 |
| 2 Comprehension (15) | 68 | 77 | 79 | 82 |
| 3 Visual richness (15) | 75 | 78 | 79 | 80 |
| 4 Generality (15) | 68 | 71 | 80 | 83 |
| 5 Depth of insight (10) | 45 (capped) | 70 | 76 | 77 |
| 6 Beauty (10) | 38 (capped) | 58 (capped) | 65 | 72 |
| 7 Measured advantage over a plain session (10) | 10 (capped) | 68 | 76 | 80 |
| 8 Economy and lifecycle (10) | 30 (capped) | 76 | 78 | 80 |
| **Total** | **56** | **74** | **78** | **80** |

*Superseded later on 2026-11-21 by "Rounds 8 to 10" below: the same reviewer then scored the
plan 85.8 and a second, independent reviewer 81.2. The paragraph is kept as written.*

**The plan reaches 80, not 85, and the reviewer's judgement is that no further planning can
reach 85.** Its words: "Every instrument … is now planned, calibrated and bounded; I find no
missing instrument worth more than about 1 point. Scoring a plan cannot credit a win that has
not been measured." The remaining points belong to outcomes: generality *shown*, an advantage
*measured*, a reader who *does* trust the page. They are earned by building the critical path
to the first corpus pass and rescoring from numbers (R22), not by another round of this
pursuit. After the third score, three small changes it named were applied and not rescored
(about one point each by its estimate): the loss loop also chases the maintainer-documentation
ceiling, the human panel pools answers to a minimum sample, and the full-reach arm was put to
the owner.

Two conditions move the total. If a dossier run without a consent record (`syzygy-k54o.3`)
does not land, the corpus cannot run and the total is 74. With the run-3 gate shut it was 75;
the owner closed that gate during this run.

### Rounds 8 to 10: a second reviewer, six more moves, and the first measurements

The owner's condition was 85, so the run continued. Three things happened.

**A second reviewer scored the plan cold.** It had seen none of the first reviewer's scores
files. Both reviewers then rescored after each revision. All scores are `[Inferred]`.

| Dimension (weight) | First reviewer, round 7 | First reviewer, round 10 | Second reviewer, first | Second reviewer, round 10 |
|---|---|---|---|---|
| 1 Truth (15) | 85 | 90 | 88 | 92 |
| 2 Comprehension (15) | 82 | 87 | 80 | 85 |
| 3 Visual richness (15) | 80 | 85 | 78 | 82 |
| 4 Generality (15) | 83 | 86 | 76 | 80 |
| 5 Depth of insight (10) | 77 | 86 | 72 | 79 |
| 6 Beauty (10) | 72 | 79 | 70 | 76 |
| 7 Measured advantage (10) | 80 | 85 | 66 | 70 |
| 8 Economy and lifecycle (10) | 80 | 86 | 72 | 78 |
| **Total** | **80** | **85.8** | **76.3** | **81.2** |

**The two reviewers disagree, and the lower score is the safer one to plan from.** The first
reviewer has followed every revision and puts the plan at 85.8, with a ceiling of 87.6 for any
plan. The second puts it at 81.2 (81.5 with the measurements below) and holds that no plan can
pass about 83, because generality and measured advantage are worded as outcomes. They agree on
what matters: another planning round is worth about one point, and the rest is earned by one
three-repository benchmark pass. The second reviewer names the five results that would take
its score to about 85: the dossier wins the frozen rule against the full-reach plain session
on Redis and two other shapes; the owner, reading blind, prefers the dossier and the model
grades agree with the owner; both non-Redis runs close within budget, one of a shape no pack
matches; the fidelity reviewer catches seeded false claims at its stated rate; recorded cost
stays inside the ceilings.

**Six moves were added** (R23 to R28, described under "Ranked moves"), and both reviewers'
faults were applied. The most serious: the dossier's author would have read the same question
file the benchmark grades on, while the plain session met those questions cold. The graded
questions, depth list and reader tasks are now held out of every authoring session, and check
asserts their absence.

**The first measurements were taken**, over the six stored Redis runs, with no new run and
nothing sent anywhere. The record with predicates, denominators and the digest of every file
read is `docs/evidence/pursuit-2026-11-21b/measure-now.json`. All six runs are of one commit,
but they span brief versions 1 to 7, so the differences mix session variance with the
mechanism changing.

| Measured `[Observed]` | Result | What it decides |
|---|---|---|
| Would a mechanical coverage pre-check have caught first-round omissions? (R4) | It lists 151 of the 181 inventory entries that first fidelity verdicts marked unsupported (recall 0.83); 12 of the 184 it lists were entries the reviewer accepted | The pre-check becomes a default step. The thresholds (recall at least 0.60, wrongly listed under 30 percent) were written before the result was read |
| How much of what six runs found does one run hold? | 14 to 51 percent of 545 pooled supported-claim clusters; 10 clusters are in all six. The newest run holds 18 percent | A dossier today is one draw. The benchmark now needs two runs per repository and judges the weaker |
| Does that depend on how "same claim" is defined? | Yes. Any overlapping cited span: 79 percent of a run's blocks have a counterpart in another run. Strict match: 32 percent | The pooled figure is reported under more than one rule; the two-author mode (R28) waits for two fresh runs at one brief |
| Are review rounds ever sent the same bytes twice? (R5) | No: 0 of 16 later fidelity deliveries repeat the previous packet | R5's "stop on an unchanged packet" would have saved nothing. It stays as a guard |
| How much of a later review packet is unchanged? (R5) | 30 percent of canonical bytes, 20 percent of file bytes | At the edge of the 30 percent fixed beforehand. Delta packets are built as an option and judged on review minutes in the first corpus pass |
| Where does a run's time go? | Review rounds take 171 of 302 wall minutes (57 percent); a fidelity round's median is 5.1 minutes | R4 and R5 aim at the right place |
| Does the reviewer agree with itself? | Five re-submitted verdicts over identical packets agree on readiness every time; support verdicts per block agree fully | Same session each time, so this is a floor on consistency, not an independent check |
| Do runs agree on structure? | Three of six runs have no Poles; Pole labels overlap at 0.29 across the three that do | Mostly the mechanism changing between brief versions |

**What the measurements are worth.** Little to the plan's score (the first reviewer says
about 0.05, the second 0.3) and a good deal to the plan itself: one of its savings is
confirmed, one is shown to be empty, and the benchmark design changed.

**The second reviewer's advice is to cut now, not after the first pass.** Every slice is filed
ready, so lanes would build what R22 would later cut. Twenty-one slices on the critical path
are therefore priority 1, and fourteen slices it named are parked at priority 4 until R22.
Nothing was closed: closing run-3 and run-4 beads as superseded is left to R22, which will
have numbers.

### Round 11: the first comparison with a plain session

Both reviewers said the missing points could only be earned by measuring, and that one
measurement needed no new run. It was run the same day as a pilot. The protocol was written
before any arm ran; the full record is under `docs/evidence/pursuit-2026-11-21b/pilot/`.

**Method.** Redis at the commit the stored runs pinned, cut down by the dossier's own screen
code to the 1,178 files its author could read (two of them with the same 23 lines withheld).
One session read that tree and wrote 24 questions a new engineer needs answered, four in each
of six kinds, with 81 required facts. A second session, given the same tree and one sentence
("Explain this repository to an engineer who is new to it"), wrote a synthesis of 2,768 words.
Fresh readers then answered the questions from one thing each, and two graders scored the
answers blind. A separate checker tested 30 sampled claims from each text against the tree.

Three graders scored, each blind and each over a different set of arms. Only the first
grading was in the protocol; the other dossiers and graders were added after its result was
read, so those rows are exploration, not a pre-registered test.

| Reader answered from `[Observed]` | Brief | Words (reader pages) | Share of 81 required facts, graders 1, 2, 3 |
|---|---|---|---|
| The source tree itself, asked directly | n/a | n/a | 0.94, 0.95, not graded |
| Stored dossier `d9411d26` | 1 | 15,897 (10,872) | not graded, 0.57, 0.61 |
| Stored dossier `2ecdcab0` | 2 | 15,281 (10,863) | not graded, not graded, 0.48 |
| The plain session's synthesis | n/a | 2,768 | 0.48, 0.46, 0.47 |
| Stored dossier `4465d22f` | 1 | 7,883 (4,306) | not graded, not graded, 0.41 |
| Stored dossier `ffe579c7` | 4 | 14,227 (9,002) | not graded, not graded, 0.39 |
| Newest stored dossier `658f2f90` | 7 | 12,574 (7,195) | 0.34, 0.33, 0.33 |

No arm made a statement a grader counted as wrong. The sixth stored run was never rendered.

By kind of question (third grader), the five dossiers and the plain synthesis fail in
opposite places:

| Kind | Dossiers, lowest to highest | Plain synthesis |
|---|---|---|
| How the parts fit | 0.29 to 0.57 | 0.79 |
| Where to change something | 0.00 to 0.50 | 0.58 |
| Why it is built this way | 0.31 to 0.65 | 0.27 |
| Limits and failure | 0.38 to 0.65 | 0.12 |

| Claim check, 30 sampled claims each `[Observed]` | Supported | Partly | Contradicted or not found |
|---|---|---|---|
| Plain synthesis | 30 | 0 | 0 |
| Newest dossier | 28 | 2 | 0 |

**What it shows.**

1. **The newest dossier lost to a plain synthesis a fifth its length**, by the rule fixed
   beforehand. Its weakest kinds were "where do I change this" (0.04 against 0.58) and how the
   parts fit (0.29 against 0.79).
2. **Two of the five stored dossiers matched or beat that synthesis, and the share falls as
   the brief version rises** (0.61 and 0.41 at version 1, 0.48 at 2, 0.39 at 4, 0.33 at 7).
   The mechanism became worse at teaching and nothing showed it. The runs differ in brief,
   schema and renderer at once, so the cause is `[Inferred]`; the 300-word section limit is a
   suspect and R29 tests it before anything is changed.
3. **Dossiers and a plain synthesis are good at different things.** Every dossier beat the
   synthesis on why the system is built as it is and on its limits; every dossier lost on how
   the parts fit and on where to change something. The plan's structure figures
   (run 4) and find-by-task (R15) aim at exactly the two losing kinds.
4. **Density is the gap.** The plain synthesis carries about 14 required facts per thousand
   words, the newest dossier about 2. Between 3,326 and 4,611 words of each eight-to-sixteen-thousand
   word dossier are pages about the run itself.
5. **No truth advantage appeared.** The plain synthesis made no unsupported claim in the
   sample. The plan had assumed a plain session errs more; here it did not.
6. **Asking beats reading either artifact.** A session with the source answered 95 percent.
   A dossier that cannot be asked has to justify itself some other way.

**What it does not show.** The second reviewer's list, which is right:

- Redis is in the model's training data. The plain author, the key writer and every reader may
  lean on memory, and the protocol did not name this limit. A repository the model has not
  seen is the test that matters.
- The key writer and the plain author are the same model exploring the same tree unbriefed, so
  part of the synthesis's lead, and most of the source reader's 0.95, may be one explorer
  agreeing with itself.
- Readers and graders are models. The dossiers were read as flattened text: no figures, no
  navigation, no source pages. One run per arm, one repository, no cost recorded.
- Thirty supported claims of thirty only bounds the error rate below roughly ten percent.

**Deviations from the protocol.** The claim checker sampled every fourth claim, not every
tenth, because neither text has 300; it used a "partly" verdict the protocol did not define;
the truth rule ("at most half the plain arm's rate") cannot be met when that rate is zero; and
four dossier arms and two graders were added after the first result.

**What changed in the plan.** The pilot is kept as a regression over stored runs, reported on
every brief, schema or renderer change, with a floor per question kind (R29, new). "Find by
task" and "ask" (R15) moved to
priority 1. The benchmark's truth term is now "no more errors than the plain arm", and each
pass measures what reading gives that asking does not.

R29's key rotates and gains a second repository so it cannot become the thing the brief is
tuned to; it reports facts per thousand words and per thousand tokens; R25 and R26, which add
words, are held until density stops falling.

**Both reviewers rescored after reading the pilot** (first grading and the richest dossier;
the three later arms came after). All `[Inferred]`.

| | First reviewer | Second reviewer |
|---|---|---|
| The plan, before the pilot | 85.8 | 81.2 |
| The plan, after the pilot | 80.2 | 79.5 |
| The product as it is today | about 49 | about 39 |

The first reviewer's words: "the 85.8 does not survive the pilot." Both say no further
planning round is worth running. The second reviewer's order of next steps: a second key and
three more plain runs; the same test on a repository the model has not seen, one the owner
owns; an asking session with and without the dossier loaded; one sitting of the owner, plain
against dossier; then build only what the losses name, and take everything else off the ready
queue.

**Where this leaves the owner's question.** Not at 85, and not by a margin another round of
planning can close. The plan is about 80 by two reviewers who now agree. The product, on the
only comparison ever run, is not yet a substantial improvement over asking a capable model:
its newest output teaches a reader less than a plain synthesis a fifth its length, and far
less than a session that can be asked. It is better at the why and the limits, and its
pointers check out. That is a real base and not yet a product to be proud of.

## Tier board

Tiers are the lanes' own, for the six areas this run audited. Runs 3 and 4 hold the tiers for
truth, structure, figures and generality.

| Area | Tier | What is right | What is missing |
|---|---|---|---|
| Proof against a plain session | broken | A reader-test engine, seven frozen questions and reference sites exist | No plain-session arm, no graded answer, no stored reader result |
| Depth of insight | weak | Every claim is cited and verified | 72 percent of 293 citations fall in four files; one choice and one trade-off; no tests, no history |
| Economy | weak | Every step is logged with times | 30 to 81 minutes a run; 3 to 7 drafts; 12 to 15 operator actions; tokens unrecorded |
| Life after close | weak | Every page names its commit and packet digest | No refresh, comparison, search, question or export; a refresh is a full run |
| Prose | functional | Sentences average 16.7 words; every section opens with an answer; apparatus phrases fell from 57 to 10 between two runs | Nine "The project states:" formulas; no judgement; no editor |
| Beauty | functional | Checked contrast in two themes, reduced motion respected, no web fonts, no script | 23 font sizes, 7 radii, 31 borders; the thesis starts about 750 pixels down; no print style |

## Ranked moves

Value and cost are on a 1 to 5 scale. "Rubric" names the dimensions a move raises: 1 truth,
2 comprehension, 3 visual richness, 4 generality, 5 depth of insight, 6 beauty, 7 measured
advantage over a plain session, 8 economy and lifecycle. Slices, integration points and the
basis for each move are in the data file.

### R1 — A benchmark Polaris can lose (value 5, cost 3; rubric 7, 2, 1, 5)

Four arms per proving repository at one pinned commit: the dossier; a plain session at equal
reach (same model, the screened clone the author reads, a fixed published prompt and three
fixed follow-ups); a plain session at full reach, which is what a user would really get; and
the maintainers' own documentation as a ceiling. Only a win at full reach is called an
advantage over a real plain session. Before anything is generated, one question file is frozen:
reader questions, a depth list of non-obvious facts drawn from maintainer documents by a
session that sees neither arm, and five reader tasks. Fresh readers answer from one arm;
a grader that does not know which arm it holds scores them; forty claims per arm are checked
against the tree. The win rule is written first: Polaris wins only if its claim error rate is
at most half the plain session's, comprehension and depth are not more than ten percent lower,
and cost is within a stated multiple. Anything else is published as a loss. The three question
sets in the repository become one file. *Extends P7 (which plans the
reader) and Q13's live scorecard; new: the plain arm, the blind grader, the ceiling arm, the
win rule.*

### R2 — Check any synthesis (value 4, cost 2; rubric 1, 7)

A command that takes any free-form text about a pinned repository, extracts each claim that
names a path and lines or quotes a span, and checks it against the tree with the existing
quotation machinery: verified, resolves but unverified, not found, or no reference at all. It
is R1's accuracy instrument and R15's answer check, and it makes the dossier's advantage
visible beside a plain answer. *New.*

### R3 — What a dossier costs, recorded (value 4, cost 1; rubric 8, 7)

Wall time, turns and token use per session, read by Syzygy from the agent tool and never typed
by the operator; a budget per stage with stop-and-ask; one cost line on the review page; a
cross-run ledger. `[Unknown]` which usage fields the agent tool exposes: the first slice finds
out. *New.*

### R4 — Settle coverage before prose (value 5, cost 2; rubric 8, 2, 5)

After the inventory exists, check lists each inventory entry no draft block cites near, by
identifier and path only, so the inventory stays independent. The author represents it or
records a justified omission. Later, a coverage plan assigns every entry to a page, a deep
dive or an omission before prose is written, and the fidelity brief narrows to one question:
is each claim true to its citation? *New; the plan sharpens Q8's outline.*

### R5 — Never review the same bytes twice (value 4, cost 2; rubric 8)

No review is dispatched for an unchanged packet (five identical consecutive verdicts are on
record). After round one, fidelity sees only changed blocks and open findings, with carried
verdicts keyed by digest and a full re-review every third round; design sees only changed
pages. A fast mode writes one unreviewed draft with a banner on every page saying so, and can
only be replaced by a full run. *Sharpens P15.*

### R6 — An editor session fenced by check; style taught by example (value 5, cost 3; rubric 2, 6)

A fresh editor gets the checked draft, the rendered pages and the house style, never the
repository. It may reword, reorder and merge. Check refuses any change to a citation, label,
quotation, judgement mark, figure or Unknown. House style becomes twelve to twenty
before-and-after pairs over a fictional project, replacing rules spread across the brief.
*New for this loop; the parked provider pipeline already defines an Edit stage.*

### R7 — Quotations as typeset evidence; a thesis per section; a prose ledger (value 4, cost 2; rubric 2, 6, 1)

A quotation becomes its own element, set as a pull quote with file and lines, attached to the
author's own sentence; "The project states:" leaves the prose. Each section gets a thesis line.
Model-free prose measures are stored per run and shown to reviewers and the editor, never to
the author and never as a gate. *New element; sharpens Q8 and Q11.*

### R8 — Ask for insight by name (value 5, cost 2; rubric 5, 2, 7)

Each Pole carries one to three "worth knowing" blocks: a cited fact a newcomer would not guess.
A labelled judgement may compare the project's choice with a named, widely known alternative,
citing the project's mechanism as premise and marking the alternative's property Inferred; it
renders as an aside, never as the maintainers' claim. The flat limits of 300 words and three
deep dives give way to budgets the evidence earns. *Extends P8, Q8 and Q10. The comparison
rule reverses an owner trade-off; it is an agent adoption the owner may veto (see "What the
owner may want to veto").*

### R9 — The why from what maintainers wrote (value 4, cost 3; rubric 5, 1, 4)

Three deterministic harvests over admitted files: test names mapped to units ("what the tests
pin down"); TODO, FIXME, deprecation and issue-reference markers ("rough edges and what is
going away"); release notes as a dated timeline with quotable reasons. Then a scout session
whose only job is to find stated reasons and costs. *New content for Q2 and Q9.*

### R10 — History as its own consented class (value 5, cost 3; rubric 5, 3, 1)

Level one, metadata only: a bounded fetch keeps commit ids, dates and changed paths and drops
authors and messages. Syzygy derives churn, age, an age for every cited span, and files that
change together with no declared link. Level two: commit messages as a screened content class
the author may quote, through the unchanged secret detectors, fail closed. Authorship stays
out of both. *Builds run 4's retained history idea. A successor source policy carries it, as
an agent adoption the owner may veto.*

### R11 — One surface made by one hand (value 4, cost 2; rubric 6, 3)

One module of role-named tokens generates the stylesheet; a test fails on any size, colour or
space that is not a token. Colour does two jobs only: Pole identity and evidence state. Every
figure kind draws from one shape vocabulary, and legends are generated from the shapes used.
Taste is settled once: three specimen renderings, one owner sitting. *Sharpens run 3's
type-scale idea, Q6 and Q7.*

### R12 — The first ten seconds (value 5, cost 2; rubric 6, 2, 3)

A fixed composition for the top of every page: title, thesis, hero figure, Pole chips, tally.
Banner, provenance and legend collapse to one line. The reader probe asserts at two viewports
and both themes that title, thesis and the top of the first figure are on the first screen.
*Sharpens P3, Q4 and P6.*

### R13 — A dossier that travels (value 3, cost 2; rubric 8, 6)

A print stylesheet with citations as numbered notes, a PDF with its digest in the run record,
and a single-directory bundle with a provenance first page. Sharing beyond the tailnet stays an
owner decision per version and is not a flag. *Sharpens run 3's print idea.*

### R14 — A dossier that keeps up (value 5, cost 3; rubric 8, 1, 2)

A refresh names a base run. Before any session, Syzygy marks each citation of the base draft
unchanged, moved, or changed. Only flagged claims go back to the author and only changed
blocks to review. Derived work is reused by blob digest. The site gains a "since commit X"
page, change marks and a version list. The Redis licence-change sequence in TARGETS is its
proving case. *Sharpens P15.*

### R15 — Finding and asking (value 4, cost 2; rubric 8, 2, 7)

A generated index of every term, unit, path and figure; a "find by task" page of cited routes;
and an `ask` command whose answer R2 checks before it is shown, filed with the run and
promotable into the next refresh. No script on any page. *New.*

### Round 6: five moves from the independent review's gaps

The reviewer scored the plan with R1 to R15 at 74 and named what kept it there. Each gap
became a move.

**R16 — Polaris makes its own evidence (value 5, cost 3; rubric 4, 7, 5, 8).** A fixed list of
six to nine public repositories of distinct shapes, each pinned. A runner starts a dossier run
for each, unattended, under the declared source policy and R3's budgets, whenever the
mechanism changes. Failures are recorded results. Every real-repository measure in runs 3 to 5
waited for the owner to start a run by hand; since D10 that wait is not required. *Waits on
`syzygy-k54o.3` (a dossier run with no consent record).*

**R17 — Measure beauty with readers (value 4, cost 2; rubric 6, 2).** Fresh readers see
unlabelled screenshots of the dossier, the plain arm and a hand-made reference; they rate
trust and clarity and, after a first-screen-only view, recall what the project is and what its
parts are. A model reader's taste is `[Inferred]` and labelled; the owner's sitting stays the
taste decision.

**R18 — Losses become work (value 5, cost 2; rubric 7, 2, 5).** Each benchmark dimension the
dossier loses yields one repair packet naming the questions lost and a cause class. The win
rule's ten percent tolerance becomes "not worse" from the third corpus pass and "better on
comprehension or depth" from the fifth.

**R19 — Cover what matters (value 4, cost 2; rubric 5, 4, 1).** Syzygy ranks units by
dependency count, size, tests and (where admitted) churn, with the formula printed. Check
advises when a top-ten unit is cited nowhere. Coverage today is measured against an inventory
a session wrote; this is independent of both sessions.

**R20 — A dossier that says when it is stale (value 4, cost 2; rubric 8, 1).** With no model
call, a re-render stamps every page with how many cited spans are unchanged against a newer
commit and marks the affected claims. The stamp names the commit it was evaluated against,
never the wall clock. A questions page keeps what readers asked.

### Round 7: two moves from the second review

The second score was 78. Its largest gaps: no human anywhere in the measures, a "plain" arm
that was not what a user would get, a narrow corpus with no pass rule and no cost bound, and no
way for measurements to delete parts of a sixty-move plan. R1 gained its full-reach arm; R16
gained strata (including a large monorepo, an infrastructure-only and a documentation-only
repository, and a synthetic private fixture), a mechanism-version digest that triggers a pass,
a budget per pass, and a pass rule written first. Two moves are new.

**R21 — People in the loop (value 5, cost 2; rubric 2, 6, 7, 1).** On each corpus pass the
owner, and up to two other readers on the tailnet, answer the frozen questions from one sampled
dossier and its full-reach plain arm without knowing which is which, rate each first screen,
and say which they would rather have been given. Every model-graded measure then shows its
agreement with them. Below a bound fixed in advance, or before a minimum pooled sample, a
measure reads "uncalibrated" or "calibrating" and cannot carry a win. About thirty minutes of
the owner per pass, counted on the cost line.

**R22 — Score the plan from measurements, and cut what they do not justify (value 4, cost 1;
rubric 8, 7).** After the first corpus pass a fresh reviewer rescores this rubric from numbers.
Every open bead across the three pursuit epics is then sorted: keep, re-scope, or close as not
justified, with the measurement named.

### Rounds 8 to 10: six moves on what a finished dossier would still lack

An ideation lens asked what the best human-made explainers have that every planned move
together would still not produce. Full text is in the data file.

**R23 — The operating envelope (value 5, cost 2; rubric 5, 1, 7).** Three deterministic
harvests: invariants from assertion calls, the failure surface from error and log strings, and
limits and defaults from configuration files and named constants. A required topic then
explains what is always true, what fails and how, and where behaviour changes. Where nothing is
found the page says so.

**R24 — Where the documents and the code disagree (value 5, cost 2; rubric 7, 1, 5).** Every
checkable statement in the project's own documents (paths, identifiers, configuration keys
with defaults, commands and flags) is checked against the tree and classed: resolves, agrees,
disagrees, document only, code only. No model judges a row. Precision is measured as well as
recall, and a row class below its bound is labelled Inferred.

**R25 — Pages that hold attention (value 4, cost 2; rubric 6, 3, 2).** A figure that stays in
view while numbered steps scroll beside it, notes in the margin, and a one-page edition built
only from checked elements. CSS only.

**R26 — A first-day path with checkpoints (value 4, cost 1; rubric 2, 7).** An ordered route
through the dossier with reading times and check-yourself questions, written by a third
session and kept apart from the benchmark's questions by a check.

**R27 — Measure now on the six stored runs (value 5, cost 1; rubric 8, 5, 7, 1).** Done in
this run; results above. Its slices land the scripts as kept, tested code.

**R28 — Two authors, one dossier (value 3, cost 2; rubric 5, 8).** Two independent drafts
merged by cited-span overlap, with conflicts shown. The offline merge of stored drafts may
proceed; the run mode is built only if a second fresh run at the same brief adds at least 25
percent more supported-claim clusters to the first.

### Round 11: one move from the pilot's loss

**R29 — No mechanism change ships blind (value 5, cost 2; rubric 2, 7, 5, 8).** The pilot's
questions, key, plain synthesis and gradings are kept. A change to the brief, the schema or the
renderer reports the reader's share of required facts before and after, per question kind, and
explains any drop of more than five points. Check also advises, per major unit, which of six
kinds of newcomer question no block answers. It re-reads stored runs, so it needs no dossier
run. The regression questions are never shown to an authoring session.

### What to build first

1. **R3 slice 1, R4 slice 1, R5 slice 1, R2 slice 1** need nothing and each is small: record
   timings, list uncovered inventory entries, stop unchanged reviews, check free-form text.
2. **R1 slices 1 to 3** next: one question file, a real reader port, the frozen protocol. After
   this every later move is scored, not judged.
3. **R6, R7, R8 slice 1, R12 slices 1 to 3, R11 slices 1 to 3**: the visible lift in reading
   and looks, each measured by step 2.
4. **R16** as soon as a dossier run needs no consent record; then **R18**, **R17**, **R21**
   and **R22**, which read its results. R22's rescore is where 85 is earned or not.
5. **R9, R10, R19, R14, R20, R15, R13** as their prerequisites land (Q2, Q8, P15).

### What this does to earlier moves

| Earlier move | Effect |
|---|---|
| P7 comprehension probe (`syzygy-fnry.7`) | R1 gives it a real reader port, a key and a comparison arm |
| P8 opinion with receipts (`syzygy-fnry.8`) | R8 adds comparison under a label and the worth-knowing mark |
| P15 regeneration and claim diff | R5 uses its digests between rounds; R14 adds carry-forward and the reader's page |
| Q8 reading depths and outline (`syzygy-3efd.8`) | R4's coverage plan is the outline; R8's budgets depend on its depths |
| Q11 reading ledger (`syzygy-3efd.11`) | R3 and R7 add cost and prose measures to it |
| Q13 live scorecard (`syzygy-3efd.13`) | R1 adds the plain arm and loss rule |

## Strongest objections

- **The benchmark may show Polaris losing.** That is its purpose. The lanes expect a plain
  session to win on speed, reach and follow-up, and Polaris on claims checked `[Inferred]`. If
  the first calibration is a loss, the loss names the next move.
- **More sessions cost more.** R6 adds an editor and R9 a scout. R4 and R5 remove more review
  rounds than these add `[Inferred]`; R3 will show whether that holds.
- **Comparison under a label could let unsupported claims in.** The premise must be a cited
  project mechanism, the alternative's property is marked Inferred general knowledge, and it
  renders apart from the maintainers' claims. The owner may veto it.
- **Unattended corpus runs spend tokens nobody watched.** R3's stage budgets stop a run that
  overspends, runs happen on a mechanism change and not on a clock, and every pass publishes
  its cost.
- **Carried verdicts could drift.** R5 keys them by digest and forces a full re-review every
  third round.

## Owner decisions, and what the owner may want to veto

Two questions were the owner's and were asked directly during the run. Both answers are
recorded on the epic bead in the owner's words.

| Asked 2026-11-21 | The owner's answer | Effect |
|---|---|---|
| Does "pursuit epics need no sign-off gate" cover the run-3 gate `syzygy-fj2q`? | "Yes, close it" | The gate is closed; run 3's fifteen moves are ready in dependency order |
| What may the benchmark's plain-session arm read and send? (SEC-5: it sends files the source policy cannot classify) | "Everything except detector matches" | R1 slice 6: the whole clone minus only files the secret detectors match. The owner chose this over the recommended variant that kept the denied-path and active-content screens. It applies to that arm and to public corpus repositories only; no detector is weakened and a dossier run reads and sends what it did before |

Everything else is agent-decided under VIS-4 as amended by D10. The first draft put three
more questions to the owner; the independent
review showed each is agent-decided ("screening and classification policy within SEC-5 …
which repositories Syzygy reads and which provider receives their content"). Three adoptions
change something the owner chose earlier or may care about, so they are named here. Each lands
with a row in `AGENT-ADOPTIONS.md` and a revert command; a veto is that revert.

| Adoption | What changes | The limit that keeps it agent-class |
|---|---|---|
| Comparison in Polaris's own voice (R8 slice 2) | The owner's rule was: a comparison only as quotation. A labelled, premise-cited comparison with a named alternative becomes allowed | It is always marked Inferred and never rendered as the maintainers' claim |
| History (R10) | A dossier run may fetch bounded history; commit messages become a screened class | Messages pass the unchanged secret detectors and fail closed; author identity is dropped at ingestion and never stored |
| Agent-started corpus runs (R16) and the equal-reach plain arm (R1) | Agents start dossier runs on public repositories and run plain sessions per repository, spending tokens under R3's stage budgets and a budget per pass | Observed code is never executed; nothing leaves the tailnet except to the declared provider |

Exposure beyond the tailnet is not proposed.

## Planned epic

Epic `syzygy-5dhm`, label `dossier`: twenty-nine move beads (`.1`–`.20`, `.98`, `.99`,
`.106`–`.111`, `.132`), each a container for its slices, and 106 slice beads. The slices on the
critical path are priority 1 and fourteen are parked at priority 4 (the data file's
`priorities` lists both). Every slice is a full packet (outcome,
approach, spec route, tests, numbered acceptance) and is ready when its predecessors close.
There is no hold bead and no `no-dispatch` label. Where a slice extends a run-3 or run-4 bead
it depends on that bead and builds only the new part.

```sh
bd list --parent syzygy-5dhm --all --limit 140
bd ready --label dossier
```

Ready with no predecessor: R1 slice 1, R2 slice 1, R3 slice 1, R4 slice 1, R5 slices 1 and 4, R6 slices 1
and 3, R8 slice 1, R11 slice 1, R14 slice 1, R16 slice 1, R17 slice 1, R27 slice 1.

## R2 slice 1: first measurement (2026-11-22)

[Observed] `syzygy dossier verify` (bead syzygy-5dhm.23) checked two texts about the pilot's Redis
revision `498ecd0d`, through the dossier check's own derivation and screen. Each claim gets one
of six outcomes. Figures and method are in
`docs/evidence/syzygy-5dhm-23/verify-text-pilot-2026-11-22.json`; "before" is the first
implementation (`d2b84f57`), "after" is the code after its review corrections (`7107dc97`).

| Claims | Plain synthesis before | after | Dossier text before | after |
|---|---|---|---|---|
| quotation-verified | 2 | 1 | 0 | 0 |
| reference-unverified | 58 | 57 | 255 | 255 |
| path-missing | 2 | 2 | 17 | 17 |
| quotation-not-found | 0 | 1 | 0 | 0 |
| unanchored | 34 | 33 | 397 | 397 |
| withheld | 7 | 7 | 20 | 20 |
| total | 103 | 101 | 689 | 689 |

- [Observed] The plain synthesis names 127 file references and attaches lines to none. The
  dossier text names 336, 180 with lines.
- [Observed] Before the corrections, one plain claim counted as verified only because the reader
  paired the quote marks of two different quotations that wrapped across a line. It "verified"
  the span ` and ` between them. Read correctly, neither quotation is a contiguous span of the
  files the claim names, so the claim is `quotation-not-found`. The other plain changes are two
  table header rows that no longer count as claims, and one prose `.js` name that is no longer a
  reference.
- [Inferred] The dossier's quotations are under-counted: `scripts/dossier_site_to_text.py` drops
  the quote marks around its rendered quotations. The dossier's 17 missing paths are mostly its
  own pages and generator files. Neither arm's figures say whether an unquoted claim is true.

## R16 slice 1: the corpus, written before any pass (2026-11-24)

Bead syzygy-5dhm.74. The corpus, the mechanism-version definition, the pass budget and the
generality pass rule are one sealed file, `docs/polaris-generation/dossier-corpus-v1.json`,
written before any corpus pass has run (none can until syzygy-k54o.3 and the runner,
syzygy-5dhm.75, land). `node scripts/dossier_corpus.mjs --check` validates it and
`packages/polaris-dossier/src/corpus.test.ts` holds its seal as a literal, so editing the rule
fails a check; a changed rule is a new file, `dossier-corpus-v2.json`, with its own adoption
row, and applies only to passes that start after it.

[Observed] Fourteen entries, chosen by tree listing and public metadata only (no body read,
nothing cloned). Each survey is the script's `--survey` output on 2026-11-24, which applies the
structure record's own rules to the listing; the tier is a selection label over listed blob
bytes (XS under 256 KiB, S under 4 MiB, M under 16 MiB, L under 128 MiB), not the scale
ladder's tier, which is not built.

| Id | Repository | Commit | Shape | Strata it fills | Tier | Server trait |
|---|---|---|---|---|---|---|
| C01 | redis/redis | `498ecd0d` | C server, data store | cost-baseline anchor | L | yes |
| C02 | psf/requests | `6e83187b` | Python library | | M | no |
| C03 | BurntSushi/ripgrep | `e89fff89` | Rust CLI workspace | | S | no |
| C04 | caddyserver/caddy | `edcdfa0e` | Go server | | M | yes |
| C05 | excalidraw/excalidraw | `9c2e462e` | TypeScript web app workspace | | L | no |
| C06 | kubernetes/kubernetes | `43cbb94e` | Go large monorepo | large monorepo | XL | yes |
| C07 | terraform-aws-modules/terraform-aws-vpc | `577ad620` | Terraform module | infrastructure-only | S | no |
| C08 | github/gitignore | `eeb775f7` | data-only templates | data or documentation only | XS | no |
| C09 | rust-lang/rfcs | `f43d5789` | documentation-only design records | data or documentation only | M | no |
| C10 | dromara/hutool | `87ec1186` | Java library workspace, Chinese docs | non-English documentation | M | no |
| C11 | torvalds/pesconvert | `d6d7001b` | C tool, no README, no docs root | no README or documentation root | XS | no |
| C12 | tzeusy-org/butlers | `be3a18d7` | owned Python application workspace | owner-owned | L | yes |
| C13 | tzeusy-org/syzygy | `21e73d5c` | owned TypeScript governance polyglot | owner-owned | XL | yes |
| C14 | synthetic notebook pipeline | `fb635704` (this repository, holding the kit) | synthetic, private | synthetic private visibility | XS | — |

The file holds the full 40-hex commits. Five candidates were left out, each with its reason in
the file (Sentry for its licence, OpenBSD because its listing is truncated).

**Mechanism version.** One SHA-256 over a format line and one `<sha256>  <path>` line per member
file, sorted, test files left out. It covers everything that shapes what a run produces, in six
groups: the brief (`brief.ts`, `reader-standards.ts`, the shape packs); the draft schema; check
(the structure rules, the census, the manifest recognizers, the relation witness); the renderer
(`render.ts`, `figure-fit.ts`, `dossier-render*.ts`, `dossier-site.ts`, findings, diagram
layout, draft preview, SVG inertness, design tokens); the screen (`screen.ts`,
`policy-snapshot.ts`, the declared-source policies, and the detectors and classifiers it calls
in `three-surface-poc-core` and `polaris-generation-core`); and the agent texts (the
`polaris-dossier` skill and its references, `polaris.ts`, `session-handover.ts`, `review*.ts`,
`design-review.ts`). The agent texts are a group of the one digest, not a second digest, so two
passes compare only at one equal digest. [Observed] At `ed1e65bf` (main on 2026-11-24) it is
`0d28717d…` over 60 files. Earlier drafts read `b9506ac8…` over 22 files at `fb635704`, then
`da891d2e…` at `3a24d409` (main had changed `dossier-render.ts` and `dossier-site.ts`). The
review of #976 then widened the members. The seal was taken again each time before adoption,
so no adopted seal changed. The command surface and run bookkeeping (`cli.ts`, `close.ts`, the
inventory) are not covered, so a change there starts no pass; a comment in a covered file does.

**Budget.** Runs go in entry-id order: for each entry, dossier run 1, dossier run 2, then its
plain-arm sessions, at most two at once. Each entry is run twice per pass. A run is re-run once
only after one of four infrastructure faults, a closed list: provider unavailable, provider
throttled, host interrupted, runner defect. A second fault leaves the run Unknown
(`infrastructure-fault`). Per run: `claude-opus-5-5`, PT4H, 30,000,000 tokens, 1,000 turns, six
repair cycles, the supervisor's four sessions. Two plain-arm sessions per public entry, on the
same pinned model (PT1H, 5,000,000 tokens each). Per pass: 72 wall hours, 550,000,000 tokens,
and at most one pass started per ISO week. [Unknown] The token figures are unmeasured
allowances: Syzygy cannot observe usage, a run's usage is only what the runner declares at
close (Inferred), and with undeclared usage the pass's token spend is Unknown. Whatever the
budget does not reach is recorded Unknown. Every started pass is recorded to its end, and the
current verdict is the latest started pass's once it ends.

**Generality pass rule.** The verdict is `pass`, `fail` or `incomplete`; an Unknown is never a
pass, and a clause that does not apply to an entry is not counted for it. The clauses:

- G1: both runs close `closed`, not `closed-with-finding`, with the last fidelity and design
  verdicts non-blocking.
- G2 (public entries): the dossier, as the mean of two runs, is below the plain arm, as the
  mean of two sessions, on at most one applicable question kind. "Below" means by more than
  one required fact (A-63's per-kind bar). G2 is a no-worse floor: a pass establishes parity
  at most.
- G3: no required figure view is missing.
- G4: per-Pole depth minimums.
- G5: each run names the traits no shape pack matched and the units left derived-only.

The key that G2 grades against is fixed before the pass:

- It is written, before the pass, by a session that has seen neither arm.
- Its digest is frozen in the pass record.
- Each kind needs at least three facts, or is marked not-applicable beforehand.
- It is held out as CONTRIBUTING rule 4 holds the pilot key.
- Comparisons across passes are made only at an equal key digest.

The pass record attributes each G2 miss to reach or to authoring, without changing the
verdict.

The advantage measure is reported beside the verdict and gates nothing. It is dossier share
minus plain share, per entry and pooled, overall and per kind. Its fixed vision target is a
pooled overall advantage of at least 10 points, called met only when two consecutive passes
reach it.

Reviewer calibration: nine known-false blocks are seeded into a copy of C01 run 1's first
fidelity packet. If fewer than seven are caught, or there is no calibration review, the pass
is uncalibrated and its verdict is at most `incomplete`.

Cost: [Observed] the six stored runs' medians are 44.75 wall minutes and five review rounds,
recomputed by the test from `measure-now.json`. The targets for the Redis anchor are at most
31.325 minutes and three rounds. [Unknown] Tokens: no stored run recorded usage, so the token
target is 0.7 of the anchor's median declared usage in the first pass that records it.

A regression needs a drop in both runs at an equal key digest (A-38, A-63), and no rise is
called a win.

**Deviations from R16's text.**

- The cost targets bind the anchor repository, not every dossier, because the baseline is of
  one repository. The pass-wide medians are reported against the same figures but decide
  nothing.
- The token baseline is not "the six stored runs' medians", because those runs recorded no
  tokens.
- [Observed] Both owned repositories are public on GitHub. So the private stratum is the
  synthetic fixture alone, and the owned repositories fill the owned stratum.
- The validator's trait check is hard-coded to the server-entry trait. A v2 corpus should read
  the traits from the shape packs' own selectors.

## R4 slice 2: the review waits for coverage (2026-11-25)

Bead syzygy-5dhm.29, spec version 2.28 (REQ-polaris-generation-035,
`openspec/changes/dossier-coverage-hold/`). Slice 1 told the author, as advice, which inventory
entries no draft block covers. Now Syzygy issues no fidelity packet while such an entry has no
outcome. An outcome is either coverage by check's rule or a line in `inventoryOmissions` with a
reason. This holds `review-packet`, a review `session-prompt` and a delivery to a waiting
reviewer, and so the URL supervisor.

- [Observed] The refusal has the stage `coverage`. It names each entry by identifier and cited
  paths only, never its statement, and never names a path a secret detector matches. It ends
  with the next step: represent the entry with a citation, or record the omission with a
  reason, then check again.
- [Observed] The supervisor tells the author once for each pair of draft and inventory
  revisions. It does not count the hold as a refused delivery, so it never gives up on it. At
  the repair-cycle limit the run ends blocked and names the hold.
- [Observed] These are unchanged: drafts of schema v2 to v4 (they cannot record an omission),
  entries screening withholds, the packet's bytes, verdict validation and the review of record.
  `review-check` rebuilds the packet without the hold, so an older verdict counts as before.
- [Observed] Rule 6: 14 of 14 mutants killed over the hold, the three issuing points and the
  supervisor's notice (`docs/evidence/syzygy-5dhm-29/coverage-hold-mutation-2026-11-25.json`).
- [Inferred] The hold uses check's mechanical rule. So an entry the draft represents in words,
  without a citation or a path, holds the review until the author adds one.
- [Unknown] Review rounds per run under the hold. Slice 4 (syzygy-5dhm.86) measures them before
  and after. No run has been made under this change.

## Known ledger and deviations

- **No release gate.** The pursuit skill asks that filed work wait behind a gate the owner
  releases. The owner said on 2026-11-21 that pursuit epics need no such gate, so every slice
  is filed ready, in dependency order.
- **One figure differs from the brief.** The run brief said 18 of 23 fidelity verdicts were not
  ready; the lanes counted 20 of 27 over all six runs. The brief had left out one run.
- **Declined on principle:** unverified opinion, per-reader tailoring inside the reviewed pages
  (it belongs in R15's ask), racing a plain session on speed, and client-side search (the pages
  forbid script, and R15's index makes it unnecessary).
- **The plan grew by addition.** Rounds 8 to 10 add six more moves and twenty slices, for
  twenty-eight moves and 103 slices in this run and fifty-seven moves across runs 3 to 5. The
  second reviewer's objection stands: in the twelve days before this run one pursuit bead
  closed. The priorities above are the answer for now; R22 is where beads are closed.
- **Thresholds were fixed minutes, not days, before the results.** R27's decision numbers were
  written into the plan before its figures c to f were read, in the same session.
- **More than fifteen moves.** The skill caps a run at fifteen. Rounds 6 and 7 add seven,
  kept apart under their own headings because they answer the reviewer's gaps, not the lanes'
  units. Rounds 6 and 7 had no lanes of their own: the reviewer's gap list was the audit.
- **Faults the reviewer found and this report corrects.** Three owner questions in the first
  draft were agent-class; ten moves did not say which earlier bead they extend; R13 named
  consent records D10 retired; R20's stamp used the wall clock; the first full-reach arm was
  labelled agent-class and is the owner's. The three raw score files are in the data file
  under `.score`.
- **Over the size cap.** This report is about 28 KB against the skill's 25 KB, because it
  carries three rounds.
- **No questionnaire packet.** The two owner questions were asked directly in the session, not
  through the questionnaire form; the reviewer had examined both scopes first.
- **Not ranked:** a served shelf of dossiers on the tailnet mount. It is useful, but R13's
  bundle covers sharing until someone asks for more.
