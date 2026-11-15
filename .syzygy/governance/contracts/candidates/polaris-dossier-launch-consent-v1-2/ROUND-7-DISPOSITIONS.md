# Round 7 dispositions — Polaris dossier launch consent, version 1.2

> **Candidate — binds nothing.** [Observed] Round 7
> (`docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-7-RAW.md`) read commit
> `33309d11` and returned `REVISE` (line 4): one revise finding and three
> notes. The loop continues while rounds converge, per the owner's 2026-11-10
> instruction relayed by the coordinating session. This page disposes each
> finding, re-runs the stage sweep with the two new terms, and lists every
> occurrence of "copy" in REQ-046 and REQ-047 with the term each now uses.
> Line numbers are those of the post-apply spec of the commit that carries
> this page. Nothing here is a review or a verdict; round 8 decides that.

## 1 — "A run that makes a copy" named both a launch-time class and a run that made one

**Repaired at the root.** Two terms are defined once, in REQ-047 (line 242),
and every sentence, arm and scenario now uses one of them:

- **copy-class run.** "A run that this rule requires to run on a copy is a
  copy-class run, and every other run this requirement pins is a no-copy
  run; which class a run is in is decided at launch, from the consents and
  the pinned revision, before any Git process starts."
- **a run whose copy step started.** "A copy-class run's copy step is the Git
  processes the next paragraph states, and the copy step has started once
  Syzygy has started the first of them; a copy exists only in a copy-class
  run whose copy step has started."
- **The refused-before-the-step rule.** "A copy-class run refused before its
  copy step starts has no copy, and wherever this change requires the launch
  output, the run record or a page to state how the copy was made, what Git
  or Syzygy read to make it, that the agent sessions work in it, its
  location, or whether it was kept or removed, such a run states only that
  no copy was made."

Where the terms are applied:

- **The run record's copy clause** (line 37) is scoped to "a copy-class run
  whose copy step started". It adds "for a copy-class run refused before its
  copy step started, that no copy was made, and no other copy statement".
- **REQ-046's falsifier arm** (line 223) is scoped the same way. It also
  trips when such a refused run states "anything of a copy but that no copy
  was made". REQ-047's arm (line 386) carries the same pair.
- **The removal rule** (line 244) removes the copy "where its copy step
  started". Otherwise the launch output "SHALL say that no copy was made".
- **The alternates refusal** applies "in a copy-class run" (line 251). Its
  scenario (lines 340 to 343) now adds "the launch output and the run record
  state that no copy was made, and no other copy statement".
- **Every "makes no copy"** in a scenario and the falsifier now reads "is a
  no-copy run". The scenario heading "HEAD elsewhere with no copy" is
  renamed "HEAD elsewhere in a no-copy run", here and in the builder's
  `V12_SCENARIOS`.
- **The four scenarios of completed copy runs** now say "the run is a
  copy-class run" before "Syzygy makes the copy".
- **REQ-046's conformance case** (line 219) now varies "whether the run is a
  copy-class run and, if so, the stage at which it is refused, before or
  after its copy step started".
- **The question's copy statements** (line 11) are scoped to "a copy-class
  run, whose copy is made before the question". A copy-class run reaches
  the question only after its copy step and form check have succeeded.
- **REQ-046's pre-answer list** (line 9) names the run's clone as "the copy
  once its copy step has started" in a copy-class run, and the operator's
  clone in a no-copy run. A copy-class run refused before its copy step
  therefore has no clone Syzygy may read objects from, which is consistent
  with line 246: object reads of the operator's clone are only for a no-copy
  run.

[Observed] After the repair, `makes a copy`, `made a copy`, `makes no copy`
and `run with a copy` occur 0 times in the post-apply spec. This was checked
by two methods: `grep -c -E` and a Python `re.findall` over the whole file.
Over the round-6 spec, rebuilt to the digest in the round-7 raw's head, the same
`re.findall` counted 18: 9 of "makes a copy", 7 of "makes no copy" and 2 of
"run with a copy".

## 2 — Line 240 listed a departing copy among the Unknown-date runs

**Repaired.** Line 240 now says the date "turns on that read alone, never on
the refusal". The following state Unknown:

- a copy-class run refused before its copy step starts, an alternates file
  among the reasons;
- a run refused for a non-commit.

A run refused for "a failed copy, a departing copy or a departing clone"
states the date where Syzygy read it, and Unknown otherwise. The departing
clone is the full clone under a v1.1-scoped consent: the reviewer's B-cell
point. The stage sweep below uses "Unknown unless read" wherever a read was
permitted.

## 3 — Refusal-sweep stage for "Not declared public"; the failed-checkout refusal of a `--revision`

**Repaired.**

- The refusal sweep's row "Not declared public, no policy (A46.70)" belongs
  at stage Q. The declaration is "asked for in the question" (line 11), so
  the refusal follows it. Round 6's table is left as the review read it, and
  the stage is corrected here. [Inferred] No statement changes: the copy is
  removed either way.
- The failed-checkout refusal now names "the pinned identifier, `--revision`
  where one was given, and the checkout's failure" (line 238).
- The blob scenario (line 358) names "the identifier, `--revision` and the
  checkout's failure".

## 4 — Earlier concerns: rounds 1 to 6 answered, except finding 1's reopening

**Noted.** Finding 1 is repaired above. The stage sweep below re-runs every
statement row with the two terms, and the copy listing gives every
occurrence of "copy" in the two requirements.

The round-6 self-review's F47.19 refusal column read "a refused run asks no
question; its record says the copy was removed". [Inferred] Under the new
arm (line 386) that holds only for a copy-class run whose copy step started.
A copy-class run refused before its copy step instead states that no copy
was made. The round-6 table is left as the review read it.

## Stage sweep, round 7: every statement, by the stage at which a run is refused

[Inferred, the drafter's own judgments. Method as in round 6, with the
stages split by the two terms. Whether a refused run writes a run record is
not stated by these requirements, so each row holds whether or not it does.]

Stages:

- **U** — refused before any revision is pinned: no trunk, several remote
  defaults, ambiguous abbreviation, or reftable where no pin was reached.
- **N** — a no-copy run refused before the question:
  - a HEAD mismatch;
  - a departing clone, which includes a full clone under a v1.1-scoped
    consent;
  - reftable.
- **C0** — a copy-class run refused before its copy step started: an
  alternates file, or reftable.
- **D** — a copy-class run refused during its copy step: a fetch or
  checkout failure.
- **P** — a copy-class run refused after its copy step, before the question:
  - a non-commit;
  - a departing copy;
  - several identities;
  - a URL not admitted;
  - the governance home;
  - the write consent absent.
- **Q** — refused after the question: no terminal, no answer or a wrong
  phrase, a statement declined, or not declared public.

| Statement (source) | U | N | C0 | D | P | Q |
|---|---|---|---|---|---|---|
| Pinned revision in full, its reference, no network request, update command (line 240) | the refusal alone | stated | stated | stated | stated | stated |
| Committer date (line 240) | the refusal alone | read where read, else Unknown (operator's clone, line 246) | Unknown: no clone to read objects from (lines 9, 246) | Unknown unless read | non-commit: Unknown; departing copy: Unknown unless read; other refusals: read | read |
| Local branch differs from the remote default | from reference data, where read | true | true | true | true | true |
| Remote carried user information; remote not a locator | from configuration text, where read | true | true | true | true | true |
| Launch output: copy removed, or no copy made (line 244) | no copy statement (no class decided before a pin) | no copy statement (no-copy run) | "no copy was made" | removed | removed | removed |
| Copy location and kept (line 244) | — | — | — | — | — | completed runs only |
| Copy statements in the question (line 11) | no question | no question | no question | no question | no question | stated before the answer: the copy step and form check passed |
| Run record copy disclosures (line 37) | none | none (no-copy run) | "that no copy was made, and no other copy statement" | made, read, removed | made, read, removed | made, read, removed or kept |
| Run record: Git-programs residual (line 254) | none | none | none: the clause is scoped to a started copy step | stated | stated | stated |
| Brief and packet name the copy (line 254) | no brief | no brief | no brief | no brief | no brief | brief only after a confirmed answer |
| Identity, URL and residuals, Inferred | where derived | true | true | true | true | true |
| Preview label | not shown | not shown | not shown | not shown | where shown | shown |
| Who answered, Inferred | no answer | no answer | no answer | no answer | no answer | where recorded |
| Records recorded at launch | none | none | none | none | none | only where confirmed |

[Inferred] Every cell names a statement a conforming run at that stage can
truthfully make. Two cells were false at round 6 and are repaired by
findings 1 and 2: the C0 cell of "Run record copy disclosures", and the date
cells for runs that read the commit.

## Every occurrence of "copy" in REQ-046 and REQ-047, with the term it now uses

[Observed] The population is every match of `\bcop(y|ies|ied)\b`, case
folded, in lines 7 to 398 of the post-apply spec (both requirements, their
scenarios and evidence blocks): 156 occurrences. Hyphenated forms count:
`copy-class` and `no-copy` each match once. A script assigned each term from
the words around the match. The ten occurrences it could not place were
labelled by hand: rows 15, 35, 46, 48, 59, 60, 66, 83, 147 and 155.

[Inferred] Every "the copy" occurrence sits in a clause that applies only
once a copy step has started: the copy step itself, the form check that
follows it, the question, a brief, a removal, a kept copy, or a refusal
during or after the step. None applies to a copy-class run refused before
its copy step.

Counts by term:

| Term | Occurrences |
|---|---|
| the copy (object; exists only once the copy step started), all forms | 61 |
| copy-class run (launch class), the definition and its rule included | 30 |
| run whose copy step started, "a copy exists only" included | 18 |
| no-copy run (launch class) | 10 |
| copy step (the Git processes) | 10 |
| copy statements (scoped by the clause's run term) | 8 |
| the copy, as made by the copy step | 7 |
| no copy was made, or no copy (refused before the copy step) | 7 |
| copy rules (REQ-047) | 3 |
| "anything of a copy" (what a copy-class run refused before its copy step may not state) | 2 |
| **Total** | **156** |

| # | Line | Term now used | Context |
|---|---|---|---|
| 1 | 9 | the copy (object; exists only once the copy step started) | … operator's clone, the reads REQ-polaris-generation-047 lists; of the copy that a copy-class run's copy step makes… |
| 2 | 9 | copy-class run (launch class) | …clone, the reads REQ-polaris-generation-047 lists; of the copy that a copy-class run's copy step makes, as REQ-pol… |
| 3 | 9 | copy step (the Git processes) | …REQ-polaris-generation-047 lists; of the copy that a copy-class run's copy step makes, as REQ-polaris-generation-0… |
| 4 | 9 | the copy (object; exists only once the copy step started) | …tion-047 defines those terms, the files of its Git directory that the copy's form check reads; and, as Git objects… |
| 5 | 9 | copy-class run (launch class) | …d, as Git objects by object identifier in the run's clone, which in a copy-class run is the copy once its copy ste… |
| 6 | 9 | the copy (object; exists only once the copy step started) | …bject identifier in the run's clone, which in a copy-class run is the copy once its copy step has started and in a… |
| 7 | 9 | run whose copy step started | …er in the run's clone, which in a copy-class run is the copy once its copy step has started and in a no-copy run i… |
| 8 | 9 | no-copy run (launch class) | …copy-class run is the copy once its copy step has started and in a no-copy run is the operator's clone, the pinned… |
| 9 | 9 | copy step (the Git processes) | … process, of either clone. The reads made by the Git processes of the copy step, in the operator's clone and in th… |
| 10 | 9 | the copy (object; exists only once the copy step started) | …he Git processes of the copy step, in the operator's clone and in the copy, are not Syzygy's reads under this requ… |
| 11 | 9 | copy rules (REQ-047) | …t Syzygy's reads under this requirement: REQ-polaris-generation-047's copy rules alone govern them, and Syzygy SHA… |
| 12 | 9 | the copy (object; exists only once the copy step started) | …les alone govern them, and Syzygy SHALL use nothing they read but the copy they produce. From the tree listing alo… |
| 13 | 11 | copy-class run (launch class) | …clone without restriction whatever classes the statement names; for a copy-class run, whose copy is made before th… |
| 14 | 11 | the copy (object; exists only once the copy step started) | …ion whatever classes the statement names; for a copy-class run, whose copy is made before the question, that the r… |
| 15 | 11 | the copy (object; a copy-class run's question follows its completed copy step) | …un, whose copy is made before the question, that the run's clone is a copy of the pinned commit alone, which Syzyg… |
| 16 | 11 | the copy (object; exists only once the copy step started) | …jects included, to make it, that Syzygy used nothing Git read but the copy it produced and itself read of the oper… |
| 17 | 11 | the copy (object; exists only once the copy step started) | …on-047 lists, and that the agent sessions are directed to work in the copy while the operator's clone stays on the… |
| 18 | 11 | the copy (object; exists only once the copy step started) | …perator's clone stays on the host, so that a session's staying in the copy is its own report; and that the copy, i… |
| 19 | 11 | the copy (object; exists only once the copy step started) | … that a session's staying in the copy is its own report; and that the copy, its checked-out files included, was ma… |
| 20 | 21 | the copy (object; exists only once the copy step started) | …b objects reachable from its root tree, and nothing else, held in the copy that REQ-polaris-generation-047 makes f… |
| 21 | 35 | copy-class run (launch class) | …ing to a location derived from the clone's path, are unchanged. For a copy-class run, every one of which is launch… |
| 22 | 35 | the copy (object; exists only once the copy step started) | …h is launch-consented, the same words are read as also permitting the copy its copy step makes, in a directory Syz… |
| 23 | 35 | copy step (the Git processes) | …ch-consented, the same words are read as also permitting the copy its copy step makes, in a directory Syzygy creat… |
| 24 | 35 | the copy (object; exists only once the copy step started) | … creates for it and keeps or removes as that requirement states. That copy, its making, its keeping and its remova… |
| 25 | 37 | copy-class run (launch class) | …how the identity was proposed and the identity residuals above; for a copy-class run whose copy step started, whet… |
| 26 | 37 | run whose copy step started | …proposed and the identity residuals above; for a copy-class run whose copy step started, whether or not a question… |
| 27 | 37 | the copy (object; exists only once the copy step started) | …whose copy step started, whether or not a question was asked, how the copy was made and what Git and Syzygy read o… |
| 28 | 37 | the copy (object; exists only once the copy step started) | …ion states them, that the agent sessions were directed to work in the copy, the copy's location, and whether the c… |
| 29 | 37 | the copy (object; exists only once the copy step started) | … them, that the agent sessions were directed to work in the copy, the copy's location, and whether the copy was ke… |
| 30 | 37 | the copy (object; exists only once the copy step started) | …re directed to work in the copy, the copy's location, and whether the copy was kept, until the operator removes it… |
| 31 | 37 | copy-class run (launch class) | …r the copy was kept, until the operator removes it, or removed; for a copy-class run refused before its copy step … |
| 32 | 37 | run whose copy step started | …rator removes it, or removed; for a copy-class run refused before its copy step started, that no copy was made, an… |
| 33 | 37 | no copy was made (stated by a run refused before its copy step) | …d; for a copy-class run refused before its copy step started, that no copy was made, and no other copy statement; … |
| 34 | 37 | copy statements (scoped by the clause's run term) | …sed before its copy step started, that no copy was made, and no other copy statement; the pinned revision and how … |
| 35 | 187 | the copy (object; written only once a copy step started) | …- **AND** writes nothing outside the run's state directory, save a copy REQ-polaris-generation-047 makes, which… |
| 36 | 219 | copy-class run (launch class) | …placements at and away from the pinned revision; whether the run is a copy-class run and, if so, the stage at whic… |
| 37 | 219 | run whose copy step started | …run and, if so, the stage at which it is refused, before or after its copy step started, and the operator's clone'… |
| 38 | 222 | the copy (object; exists only once the copy step started) | …the reads Syzygy makes in process, of the operator's clone and of the copy, and the Git processes of the copy step… |
| 39 | 222 | copy step (the Git processes) | …of the operator's clone and of the copy, and the Git processes of the copy step are captured by an independent pro… |
| 40 | 222 | copy rules (REQ-047) | …nd file capture and checked only against REQ-polaris-generation-047's copy rules. Commits, references, working tre… |
| 41 | 223 | copy-class run (launch class) | …ads anything of a clone that the pre-answer list does not name; for a copy-class run whose copy step started, the … |
| 42 | 223 | run whose copy step started | …ne that the pre-answer list does not name; for a copy-class run whose copy step started, the question, the run rec… |
| 43 | 223 | copy statements (scoped by the clause's run term) | …ose copy step started, the question, the run record or a page omits a copy statement, or, for a copy-class run ref… |
| 44 | 223 | copy-class run (launch class) | … question, the run record or a page omits a copy statement, or, for a copy-class run refused before its copy step … |
| 45 | 223 | run whose copy step started | …e omits a copy statement, or, for a copy-class run refused before its copy step started, the run record or a page … |
| 46 | 223 | "anything of a copy": what a copy-class run refused before its copy step may not state | … its copy step started, the run record or a page states anything of a copy but that no copy was made; the question… |
| 47 | 223 | no copy was made (stated by a run refused before its copy step) | …arted, the run record or a page states anything of a copy but that no copy was made; the question omits any statem… |
| 48 | 223 | the copy (object, made by a copy step) | … tree, index or reference other than the dedicated one and those of a copy that a copy step makes changes, or the … |
| 49 | 223 | copy step (the Git processes) | … or reference other than the dedicated one and those of a copy that a copy step makes changes, or the trunk tip mo… |
| 50 | 238 | the copy (object; exists only once the copy step started) | … tells these cases apart without reading the object itself. Where the copy's detached checkout succeeds and leaves… |
| 51 | 238 | the copy (object; exists only once the copy step started) | …ct itself. Where the copy's detached checkout succeeds and leaves the copy's `HEAD` at an object other than the pi… |
| 52 | 238 | the copy (object; exists only once the copy step started) | …efusal takes the place of the form check's refusal below for the same copy. What Git reads of that object to make … |
| 53 | 238 | the copy (object; exists only once the copy step started) | …the same copy. What Git reads of that object to make or check out the copy is the copy step's, not Syzygy's.… |
| 54 | 238 | copy step (the Git processes) | …y. What Git reads of that object to make or check out the copy is the copy step's, not Syzygy's.… |
| 55 | 240 | copy-class run (launch class) | … refused run states turns on that read alone, never on the refusal: a copy-class run refused before its copy step … |
| 56 | 240 | run whose copy step started | …read alone, never on the refusal: a copy-class run refused before its copy step starts, an alternates file among t… |
| 57 | 240 | the copy (object; exists only once the copy step started) | …un refused for a non-commit state Unknown; a run refused for a failed copy, a departing copy or a departing clone … |
| 58 | 240 | the copy (object; exists only once the copy step started) | …on-commit state Unknown; a run refused for a failed copy, a departing copy or a departing clone states the date wh… |
| 59 | 242 | copy-class run: the defining rule ("SHALL run on a copy") | …rement pins, the run its first sentence pins included, SHALL run on a copy unless its pinned revision is named by … |
| 60 | 242 | copy-class run: the definition | ….1 of this change recorded. A run that this rule requires to run on a copy is a copy-class run, and every other ru… |
| 61 | 242 | copy-class run (launch class) | … change recorded. A run that this rule requires to run on a copy is a copy-class run, and every other run this req… |
| 62 | 242 | no-copy run (launch class) | …s a copy-class run, and every other run this requirement pins is a no-copy run; which class a run is in is decided… |
| 63 | 242 | copy-class run (launch class) | …he consents and the pinned revision, before any Git process starts. A copy-class run's copy step is the Git proces… |
| 64 | 242 | copy step (the Git processes) | …he pinned revision, before any Git process starts. A copy-class run's copy step is the Git processes the next para… |
| 65 | 242 | run whose copy step started | …n's copy step is the Git processes the next paragraph states, and the copy step has started once Syzygy has starte… |
| 66 | 242 | run whose copy step started: "a copy exists only" there | …he copy step has started once Syzygy has started the first of them; a copy exists only in a copy-class run whose c… |
| 67 | 242 | copy-class run (launch class) | …ed once Syzygy has started the first of them; a copy exists only in a copy-class run whose copy step has started. … |
| 68 | 242 | run whose copy step started | …arted the first of them; a copy exists only in a copy-class run whose copy step has started. A copy-class run refu… |
| 69 | 242 | copy-class run (launch class) | …a copy exists only in a copy-class run whose copy step has started. A copy-class run refused before its copy step … |
| 70 | 242 | run whose copy step started | … run whose copy step has started. A copy-class run refused before its copy step starts has no copy, and wherever t… |
| 71 | 242 | no copy (refused before its copy step) | … started. A copy-class run refused before its copy step starts has no copy, and wherever this change requires the … |
| 72 | 242 | the copy (object; exists only once the copy step started) | …requires the launch output, the run record or a page to state how the copy was made, what Git or Syzygy read to ma… |
| 73 | 242 | no copy was made (stated by a run refused before its copy step) | …on, or whether it was kept or removed, such a run states only that no copy was made. A no-copy run's clone is the … |
| 74 | 242 | no-copy run (launch class) | …s kept or removed, such a run states only that no copy was made. A no-copy run's clone is the operator's own, as R… |
| 75 | 244 | copy-class run (launch class) | …In a copy-class run, before the question, or befo… |
| 76 | 244 | the copy, as made by the copy step | …or before the brief where no question is asked, Syzygy SHALL make the copy as follows and in no other way; the Git… |
| 77 | 244 | copy step (the Git processes) | …ows and in no other way; the Git processes it starts to do so are the copy step. It SHALL create an empty director… |
| 78 | 244 | the copy (object; exists only once the copy step started) | … the copy step. It SHALL create an empty directory of its own for the copy, never derived from the operator's clon… |
| 79 | 244 | the copy (object; exists only once the copy step started) | …n check that commit out detached. Every Git process it starts for the copy SHALL run with the system and global Gi… |
| 80 | 244 | the copy (object; exists only once the copy step started) | …h no hook path, so that no network request is made and no hook of the copy runs; these processes execute nothing o… |
| 81 | 244 | the copy (object; exists only once the copy step started) | … as one. The operator's HEAD need not be the pinned revision, and the copy's HEAD is the pinned revision. The copy… |
| 82 | 244 | the copy (object; exists only once the copy step started) | … the pinned revision, and the copy's HEAD is the pinned revision. The copy SHALL hold the pinned commit and the tr… |
| 83 | 244 | the copy (object; the form check follows the copy step) | …es, and Syzygy SHALL check that form before the question and refuse a copy that departs from it. Where the run end… |
| 84 | 244 | the copy (object; exists only once the copy step started) | …a refusal or an answer that confirms nothing, Syzygy SHALL remove the copy where its copy step started, and the la… |
| 85 | 244 | run whose copy step started | … answer that confirms nothing, Syzygy SHALL remove the copy where its copy step started, and the launch output SHA… |
| 86 | 244 | run whose copy step started | … copy step started, and the launch output SHALL say so, or, where the copy step never started, SHALL say that no c… |
| 87 | 244 | no copy was made (stated by a run refused before its copy step) | …HALL say so, or, where the copy step never started, SHALL say that no copy was made. Otherwise the copy is the run… |
| 88 | 244 | the copy (object; exists only once the copy step started) | …py step never started, SHALL say that no copy was made. Otherwise the copy is the run's clone for the rest of the … |
| 89 | 246 | the copy, as made by the copy step | …To make the copy, Git reads the operator's clone: its co… |
| 90 | 246 | the copy (object; exists only once the copy step started) | …inned commit's objects included. Syzygy uses nothing Git read but the copy it produced. For every launch-consented… |
| 91 | 246 | no-copy run (launch class) | …n process, of the operator's clone SHALL be only these, and, for a no-copy run, the object reads REQ-polaris-gener… |
| 92 | 251 | copy-class run (launch class) | …- whether `objects/info/alternates` exists, and, in a copy-class run, a clone where it does SHALL … |
| 93 | 254 | the copy, as made by the copy step | …achable from it, a partial clone's missing object included, fails the copy, and Syzygy SHALL refuse, naming the re… |
| 94 | 254 | the copy (object; exists only once the copy step started) | …ch nothing from anywhere else. Every failure of a Git process for the copy SHALL be refused, naming that process a… |
| 95 | 254 | run whose copy step started | …ct or a non-commit among them, that Syzygy has not observed. Once the copy step has started, the copy is the clone… |
| 96 | 254 | the copy (object; exists only once the copy step started) | …em, that Syzygy has not observed. Once the copy step has started, the copy is the clone that REQ-polaris-generatio… |
| 97 | 254 | copy-class run (launch class) | … clone. Every brief and packet Syzygy issues to an agent session of a copy-class run SHALL name the copy as the cl… |
| 98 | 254 | the copy (object; exists only once the copy step started) | … Syzygy issues to an agent session of a copy-class run SHALL name the copy as the clone to work in and tell the se… |
| 99 | 254 | copy-class run (launch class) | …; that a session complied is its own report, labelled Inferred. For a copy-class run whose copy step started, the … |
| 100 | 254 | run whose copy step started | …lied is its own report, labelled Inferred. For a copy-class run whose copy step started, the run record SHALL stat… |
| 101 | 254 | the copy (object; exists only once the copy step started) | …perator's clone's own configuration or hooks name while it serves the copy.… |
| 102 | 263 | no-copy run (launch class) | …ns HEAD exactly as REQ-polaris-generation-033 states, the run is a no-copy run, Syzygy asks nothing, and does not … |
| 103 | 294 | copy-class run (launch class) | …- **THEN** the run is a copy-class run, Syzygy makes the copy at the… |
| 104 | 294 | the copy, as made by the copy step | …- **THEN** the run is a copy-class run, Syzygy makes the copy at the pinned revision and does not ref… |
| 105 | 294 | the copy (object; exists only once the copy step started) | …out, branch and uncommitted changes are unchanged and absent from the copy… |
| 106 | 296 | no-copy run (launch class) | …#### Scenario: HEAD elsewhere in a no-copy run… |
| 107 | 299 | no-copy run (launch class) | …- **THEN** the run is a no-copy run, and Syzygy refuses before asking f… |
| 108 | 304 | copy-class run (launch class) | …gy pins the commit `refs/remotes/origin/main` points to, the run is a copy-class run, and Syzygy makes the copy be… |
| 109 | 304 | the copy, as made by the copy step | …in/main` points to, the run is a copy-class run, and Syzygy makes the copy before the question, one commit fetched… |
| 110 | 306 | copy statements (scoped by the clause's run term) | …- **AND** the question, the run record and every page state the copy statements, and every brief and packet … |
| 111 | 306 | the copy (object; exists only once the copy step started) | … page state the copy statements, and every brief and packet names the copy as the clone to work in… |
| 112 | 310 | the copy (object; exists only once the copy step started) | …nsent names, recorded with the scope this version states (held in the copy), and every statement the subject needs… |
| 113 | 311 | copy-class run (launch class) | …- **THEN** Syzygy pins that HEAD, the run is a copy-class run, Syzygy makes the copy, and a… |
| 114 | 311 | the copy, as made by the copy step | … Syzygy pins that HEAD, the run is a copy-class run, Syzygy makes the copy, and asks nothing, and the run record a… |
| 115 | 311 | copy statements (scoped by the clause's run term) | …e copy, and asks nothing, and the run record and every page state the copy statements… |
| 116 | 316 | copy-class run (launch class) | …is a launch-consented run: Syzygy pins the named commit, the run is a copy-class run, Syzygy makes the copy, asks … |
| 117 | 316 | the copy, as made by the copy step | … pins the named commit, the run is a copy-class run, Syzygy makes the copy, asks nothing, reads of the operator's … |
| 118 | 316 | copy statements (scoped by the clause's run term) | …t this requirement lists, and the run record and every page state the copy statements… |
| 119 | 321 | no-copy run (launch class) | …- **THEN** the run is a no-copy run, and Syzygy refuses before asking, … |
| 120 | 336 | the copy (object; exists only once the copy step started) | …- **THEN** the copy fails, Syzygy refuses with its reason, … |
| 121 | 336 | the copy (object; exists only once the copy step started) | …gy refuses with its reason, makes no network request, and removes the copy… |
| 122 | 340 | copy-class run (launch class) | …EN** the operator's clone has an `objects/info/alternates` file, in a copy-class run… |
| 123 | 343 | no copy was made (stated by a run refused before its copy step) | …- **AND** the launch output and the run record state that no copy was made, and no other copy statement… |
| 124 | 343 | copy statements (scoped by the clause's run term) | …h output and the run record state that no copy was made, and no other copy statement… |
| 125 | 348 | the copy (object; exists only once the copy step started) | …- **THEN** the copy is made and none of those commands or h… |
| 126 | 353 | the copy (object; exists only once the copy step started) | …ion`, does not follow the tag to the commit it names, and removes the copy… |
| 127 | 358 | the copy (object; exists only once the copy step started) | …- **THEN** the copy's detached checkout fails, Syzygy refus… |
| 128 | 358 | the copy (object; exists only once the copy step started) | …t was not shown to be a commit, reads no blob itself, and removes the copy… |
| 129 | 363 | the copy (object; exists only once the copy step started) | … shown to be a commit, never that it is not a commit, and removes the copy… |
| 130 | 378 | no-copy run (launch class) | …- **THEN** the run is a no-copy run, and that stated form binds the run… |
| 131 | 383 | the copy (object; exists only once the copy step started) | …ct store and working tree before and after, Syzygy's reads of it, the copy's location and form, the processes star… |
| 132 | 383 | copy statements (scoped by the clause's run term) | …m, the processes started and their configuration and environment, the copy statements, and captured network effect… |
| 133 | 385 | the copy (object; exists only once the copy step started) | …ing layer outside the code under test, attributed by process, and the copy's Git processes, their reads and their … |
| 134 | 385 | copy rules (REQ-047) | …rom an independent process and file capture, checked only against the copy rules.… |
| 135 | 386 | no-copy run (launch class) | … or refused for the trunk tip; the pin changes within a run; for a no-copy run, a HEAD mismatch is not refused, or… |
| 136 | 386 | copy-class run (launch class) | …EAD mismatch is not refused, or is refused only after the question; a copy-class run is refused for the operator's… |
| 137 | 386 | the copy (object; exists only once the copy step started) | …work request, fetches from anywhere but the operator's clone into the copy, or changes the operator's clone; a run… |
| 138 | 386 | copy-class run (launch class) | …ne; a run that an observation consent made by another act covers is a copy-class run or starts a copy step, or a r… |
| 139 | 386 | copy step (the Git processes) | …on consent made by another act covers is a copy-class run or starts a copy step, or a run that neither such a cons… |
| 140 | 386 | the copy (object; exists only once the copy step started) | …rded with the operator's-own-clone scope covers runs without one; the copy is made other than as this requirement … |
| 141 | 386 | the copy (object; exists only once the copy step started) | …ther than as this requirement states, or the run goes on although the copy holds more than the pinned commit and w… |
| 142 | 386 | the copy (object; exists only once the copy step started) | …its root tree reaches or departs from its form; a Git process for the copy runs with the system or global configur… |
| 143 | 386 | the copy (object; exists only once the copy step started) | …rnates file is not refused before any Git process starts, or a failed copy is not refused or is completed from els… |
| 144 | 386 | copy-class run (launch class) | …tion consent recorded with the operator's-own-clone scope covers is a copy-class run or starts a copy step, or run… |
| 145 | 386 | copy step (the Git processes) | …the operator's-own-clone scope covers is a copy-class run or starts a copy step, or runs on a clone that departs f… |
| 146 | 386 | the copy (object; exists only once the copy step started) | …ne that departs from the one-commit form unrefused; a completed run's copy is removed without the operator, or its… |
| 147 | 386 | the copy (object; copy step started) | …n whose checkout failed is refused as not a commit, or as a commit; a copy whose copy step started is not removed … |
| 148 | 386 | run whose copy step started | …ckout failed is refused as not a commit, or as a commit; a copy whose copy step started is not removed when the ru… |
| 149 | 386 | the copy (object; exists only once the copy step started) | …en the run ends before its brief; a brief or packet does not name the copy; for a copy-class run whose copy step s… |
| 150 | 386 | copy-class run (launch class) | …nds before its brief; a brief or packet does not name the copy; for a copy-class run whose copy step started, the … |
| 151 | 386 | run whose copy step started | … a brief or packet does not name the copy; for a copy-class run whose copy step started, the copy statements are m… |
| 152 | 386 | copy statements (scoped by the clause's run term) | … not name the copy; for a copy-class run whose copy step started, the copy statements are missing, or a copy-class… |
| 153 | 386 | copy-class run (launch class) | …ss run whose copy step started, the copy statements are missing, or a copy-class run refused before its copy step … |
| 154 | 386 | run whose copy step started | …e copy statements are missing, or a copy-class run refused before its copy step started states anything of a copy … |
| 155 | 386 | "anything of a copy": what a copy-class run refused before its copy step may not state | …y-class run refused before its copy step started states anything of a copy but that no copy was made; or the trunk… |
| 156 | 386 | no copy was made (stated by a run refused before its copy step) | …ed before its copy step started states anything of a copy but that no copy was made; or the trunk tip is presented… |
