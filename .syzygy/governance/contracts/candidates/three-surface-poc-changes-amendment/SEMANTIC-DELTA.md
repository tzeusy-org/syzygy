# Semantic delta T6 S1 — Trajectory answers what changed

**Artifact(s):** `openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md`;
`openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md`; generated `openspec/changes/three-surface-poc-experience/GOVERNING-DEPENDENCIES.md`.
**Stable IDs affected:** POC-REQ-044 (the *what changed* limb replaced;
*what it cost* kept as its own limb; Scope, Case, Oracle, Falsifier; the
first Scenario's wording; two new Scenarios; RFC2-2 and RFC8-2 added to its
contracts); POC-REQ-042 (the `changed` parameter joins the closed set; the
machine answer declares the default window). CONTRACT-COVERAGE: the RFC2-2
row gains the window limb and POC-REQ-044; the RFC8-2 row's limb (c)
sentence now points to two new rows, limb (c)'s change part (covered) and
its cost and authority parts (Unknown). Part A goes from 176 rows (126
covered, 50 Unknown) to 178 (127, 51) over the same 88 clauses.
**Change class:** Normative (an amended requirement, and a new read).
**Author:** agent lane `coordinator:claude-20261122-81840bd5`, bead
`syzygy-t3jk.21` (Trajectory pursuit move T6, slice S1).
**Date:** 2026-11-24

## Current meaning

POC-REQ-044's *what changed* answer is always Unknown: "No movement source
is read: the observation holds each work item's current status and recorded
instants, not its history of changes." RFC8-2(c) names the board that
cannot answer "what did the fleet change, at what cost, under whose
authority … for a past window" as an anti-thesis, and the coverage table
recorded limb (c) as untouched by POC scope.

## Proposed meaning

The changed answer becomes counted facts over three windows, in order:
`day`, `week` and `since-last`. The day and week windows start at the
newest commit in the observed revision's own history at or before the
observation instant less 24 hours or 7 days. Ties go to the ascending hash.
Every window ends at the observed work-item revision, never a fresh head.

The history is read by two read-only statements through the work-item
runner. The first is `dolt_log('<revision>')`, by `commit_hash` and `date`
only. The second is `dolt_diff('<start>', '<revision>', 'issues')`, by
`diff_type`, `from_id`, `to_id`, `from_status` and `to_status` only. In-prefix
rows are listed, and one aggregate row per window counts the rest. No title,
message, committer or other free-text column is named (SEC-5).

Each changed in-prefix item is listed once, in ascending id, as exactly one
of these kinds:

- added: diff type `added`.
- removed: diff type `removed`.
- closed: a status other than `closed` became `closed`.
- reopened: `closed` became another status.
- re-stated: any other status change.

A modified row whose status did not change is counted as "updated without
a status change" and is not listed. An out-of-prefix row is counted and
never named.

A window is Unknown with its reason, never zero, in these cases:

- The work-item revision or the observation instant is unavailable.
- A read fails, returns another shape or does not confirm the revision.
  This makes both timed windows Unknown, never a partial count.
- The history holds no commit that old. This affects that window only.
- The history between the start and the revision holds a merge, or the
  start has an ancestor dated after the bound, so the start found by date is
  not a point on one line of history (`history-non-linear`, that window
  only; added after review finding F1).
- For `since-last`: no previous evaluation's revision is recorded, which is
  true at this base.

Every Unknown window is stated in the one `region:trajectory-changed`
disclosure, with each window's reason and the route, and every page shows
each Unknown window's reason and that disclosure, whichever window it
selects.

The machine answer carries every window and every fact. The page shows
one window, selected by the new `changed` parameter of POC-REQ-042, with
`day` as the default. It links the other windows with their counts and
lists at most 250 changed items, counting the rest. `changed` alone keeps
the default selection; with another parameter it rides that view. Any
other value is refused with HTTP 400.

## What explicitly does NOT change

- No Syzygy-side retention: `since-last` stays Unknown, and recording the
  previous evaluation's revision is out of scope (the bead says so).
- No commit-subject join (move T10), no merge facts, no committer, no
  title, no per-person figure, no rate or velocity.
- The other four answers, the board, the views, eligibility and the
  outline.
- *What it cost* stays Unknown (RFC8-19).

## Choices the review may contest

1. **Net change between two revisions, not every transition.** An item
   closed and reopened inside the window shows only its net change; the
   history is diffed between two commits, not walked commit by commit. This
   is what "between two named revisions" means, and it is cheap (one diff
   per window). A walk would need a per-commit read the bead does not ask
   for.
2. **`closed_at` and `created_at` are not read.** The bead allowed the
   closed-at pair; the kinds are decided by status alone, so the statement
   names five columns, not seven.
3. **Out-of-prefix rows are counted per window by one aggregate row.** No
   identifier outside the prefix crosses the runner, so none can be served.
4. **Windows are computed per observation, not per request.** Both timed
   windows are read when the model is built, so every render of one
   observation is byte-equal, and the machine answer carries all of them
   (RFC2-2).
5. **The window bound compares Dolt commit dates in UTC to the
   millisecond.** [Observed 2026-11-24 on this repository's tracker: a
   bound 1 ms before a commit's date excludes it, and its exact date
   includes it.]
6. **A removed item is named, not linked**: it has no card at the
   observed revision. An added or changed item still served links to its
   card on the all-items page.

## Machine-answer change

`trajectory.answers[2]` changes from `{id: 'changed', state: 'unknown',
disclosure}` to `{id: 'changed', state: 'observed', windows: [...]}`. Each
window is `{window, kind: 'observed', from: {revision, at}, to: {revision,
at}, counts, facts: [{id, kind, from, to}], updatedWithoutStatusChange,
outsidePrefix}` or `{window, kind: 'unknown', reason, disclosure}`.
`trajectory.narrowing.parameters` gains `changed: ['day', 'week',
'since-last']`, the narrowing gains `changedDefault: 'day'`, and every view
request gains `changed`. The `region:trajectory-changed` subject's basis
now lists each Unknown window's reason, and the subject is present only
while some window is Unknown (always, at this base, because of
`since-last`).

## Warrant

The following support this change:

- RFC8-2(c), quoted: "a board showing current state that cannot answer
  'what did the fleet change, at what cost, under whose authority' for a
  past window at the fidelity the preserved records support" is an
  anti-thesis. This amendment answers the change part.
- RFC2-2 (windows pinned to the observed revision; an unread source makes
  the claim Unknown).
- RFC2-24 (closed reason) and RFC8-19 (cost unchanged).
- VIS-2: an unread window is Unknown, never zero.
- `README.md:99`'s five questions.

This is an agent adoption under VIS-4 as amended by D10. The new read
names only identifier, status, diff-type, commit-hash and date columns. No
free text is read and nothing is written, so the change is not owner-class.

## Evidence or decision basis

- `work-item-history.test.ts` (new, 30 tests after the review repairs):
  - The literal facts of both windows, over a fixture of each kind plus a
    status-only update and an out-of-prefix count.
  - Both statements literal: pinned to the revision, five diff columns, and
    no free-text or person column, by regex.
  - A week window older than the history, with no week diff statement.
  - No diff when no window has a start; an observed zero.
  - Twenty-four failed or malformed reads, each making both timed windows
    Unknown.
  - A merge, and an inverted date, each making only its window Unknown.
  - No read without a revision or an instant.
- `trajectory.test.ts` "what changed" (8 tests, plus the five-answers test
  amended):
  - The day window's revisions, counts and list, served items linked and a
    removed one named, with no rate or verdict words.
  - Parity with the served `/api/poc` body: count for count and item for
    item, and the disclosure's basis.
  - `changed=week` keeps the default board, with window links on both
    paths and inside a view.
  - The since-last Unknown, with its reason and disclosure, both when
    selected and beside an observed window.
  - The refusal of `changed=month`.
  - 260 changes give 250 listed and 10 counted, and two renders are
    byte-equal.
- Rule 6: seven mutants each fail a test:
  - reopened read as re-stated;
  - the prefix check dropped;
  - a half-read start passing as a short history (it survived at first,
    and the tests were tightened until it failed);
  - the 250 cap dropped;
  - `changed` alone making a view;
  - after the review, merges ignored, and the other windows' disclosure
    dropped.
- [Observed 2026-11-24] Both statements run as written against this
  repository's tracker, through `bd --readonly --json sql`.
  - The day window returned 198 rows of the expected keys, one of them
    the outside-prefix count row (0).
  - By kind: 66 added, 75 modified with a status change, and 56 with
    none. No row changed its id.

## Downstream impact

Method: `git grep` over `apps/`, `packages/` and `scripts/` for
`TrajectoryViewRequest`, `answers`, `TRAJECTORY_CHANGED_ID`, `region:trajectory-changed`,
`runQuery` and `narrowing`.

Changed source files:

- `work-item-history.ts`: new; the read.
- `work-items.ts`: the runner also runs the history read, and
  `WORK_ITEM_STATUSES` is exported.
- `model-slices.ts`: plumbing.
- `trajectory-projection.ts`: the answer, the parameter and the
  declaration.
- `model.ts`: the disclosure basis and the reason sentences.
- `index.ts`: exports.
- `trajectory.ts`: the changed answer, the route and `viewHref`.
- `test-model-fixture.ts`: history SQL is routed to `runHistoryQuery`,
  which fails by default.

Changed tests:

- `trajectory-view.test.ts` and `trajectory.test.ts`: literal shapes gain
  `changed`.
- `trajectory-projection.test.ts`: the changed answer's literal.
- `work-items.test.ts`: the history call is filtered out of the
  dependency-statement count.

Other changes:

- `docs/THREE-SURFACE-POC.md`: the five answers' changed bullet.
- R3 reads two new POC-REQ-044 scenarios from this adoption row, and
  `census.json` was regenerated.

## Migration / supersession plan

The steps, in order:

1. One pull request.
2. Adoption by an `AGENT-ADOPTIONS.md` row in a second commit, naming the
   change commit.
3. After merge, the tag `three-surface-poc-changes-amendment-v1.0`.

The since-last window needs a recorded previous evaluation. That is a
further bead, if wanted.

## Review

**Required class:** one fresh-context review (CC-REV-1; one round, not
gating). **Reviewer and verdict:** the retained raw named in the pull
request.

## Exact text

````diff
diff --git a/openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md b/openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md
index ee7a26861..e09c2d08b 100644
--- a/openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md
+++ b/openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md
@@ -97,7 +97,7 @@ exhausted — a reviewer who finds an unlisted limb has found a real gap.
 | RFC1-31 | Work items: scheduler-owned lifecycle, mirrored with labeled staleness when adapter degrades, never invisibly | covered — Direct match | POC-REQ-013 |
 | RFC1-31 | Observed classes: appear in snapshot / absence is a fact / failed observation renders Unknown with named reason | covered | POC-REQ-003 |
 | RFC2-1 | Observed inputs (repo, Dolt DB) identified by revision/hash, not by description | covered — Only the revision-identification limb of the 11-item list is touched; challenge/evidence/act-record items (4,6,9,11) are unbuilt | POC-REQ-001, POC-REQ-004, POC-REQ-010 |
-| RFC2-2 | Uncaptured/unreachable source never silently influences a claim; affected claims → Unknown with reason | covered — Direct instance of the closed-snapshot rule for structure and Dolt observation | POC-REQ-003, POC-REQ-013 |
+| RFC2-2 | Uncaptured/unreachable source never silently influences a claim; affected claims → Unknown with reason | covered — Direct instance of the closed-snapshot rule for structure and Dolt observation. Amendment row (what changed, syzygy-t3jk.21): each change window ends at the observed work-item revision, never a fresh head, and an unread, unconfirmed or too-short history makes that window Unknown with its reason, never a partial count | POC-REQ-003, POC-REQ-013, POC-REQ-044 |
 | RFC2-3 | Facts deterministic given an identical revision (identity test) | covered — Only the determinism consequence is touched, not the full evaluation/as-of/kind apparatus | POC-REQ-004 |
 | RFC2-3 | Time-sensitive rendering computed from recorded instants, never ambient wall-clock | covered — Matches "as-of instant explicit, never ambient wall-clock" near-verbatim | POC-REQ-041 |
 | RFC2-6 | Coverage record for an executed mapping/oracle, with reconciling counts | covered — Thin/partial touch — only the coverage-record sub-item of the full immutable observation-record artifact is instanced; no persisted record, claim instances, tiers, evidence links, or challenge sets exist | POC-REQ-042, POC-REQ-051 |
@@ -179,7 +179,9 @@ exhausted — a reviewer who finds an unlisted limb has found a real gap.
 | RFC7-33 | Narrative claim-block type name kept distinct from kernel Claim entity | **Unknown** | — |
 | RFC7-34 | Every distinction recoverable without colour/position/layout; legended encodings | covered | POC-REQ-061 |
 | RFC7-34 | Disclosure paths operable without a pointing device | covered | POC-REQ-061, POC-REQ-022 |
-| RFC8-2 | Beads closure/activity never rendered as done/green/complete | covered — Anti-thesis limb (b) matches directly, including its wording: closure is headed "Closed", never a word for done (POC-REQ-043 wording limb); limb (a) [no editable store — POC never writes] and limb (c) [fleet-change/cost/authority accounting] aren't touched by POC scope, so only (b) rows here | POC-REQ-043 |
+| RFC8-2 | Beads closure/activity never rendered as done/green/complete | covered — Anti-thesis limb (b) matches directly, including its wording: closure is headed "Closed", never a word for done (POC-REQ-043 wording limb); limb (a) [no editable store — POC never writes] isn't touched by POC scope; limb (c) has its own two rows below (amended by syzygy-t3jk.21) | POC-REQ-043 |
+| RFC8-2 | Limb (c), the change part: Trajectory answers what changed for a past window at the fidelity the preserved records support | covered — Amendment row (what changed, syzygy-t3jk.21): the day and week windows from the tracker's own Dolt history, between two named revisions, each changed item listed with its kind; the since-last window is Unknown while no previous evaluation's revision is recorded | POC-REQ-044 |
+| RFC8-2 | Limb (c), the cost and authority parts: at what cost, and under whose authority, for a past window | **Unknown** — Amendment row (syzygy-t3jk.21); cost stays Unknown (RFC8-19) and no authority record is read for a change | — |
 | RFC8-12 | Kanban state field renders only a declared, closed set of status values — no minted/free-form values | covered — POC's "declared closed status-vocabulary mapping" exercises the closed-vocabulary/no-minting invariant; the specific 13-value partition, chain-state field separation, and `reconciled` carve-out aren't adopted since Trajectory renders no reconciliation chain state | POC-REQ-040 |
 | RFC8-15 | Closure without a merge/verification fact never rendered as a normalized "done"/complete/finished/resolved label | covered — Matches the terminal-state closure-fallacy rule (`closed-unmerged` analog) this clause states directly; the wording limb forbids done/complete/finished/resolved on every heading, label and served column value; amendment row (grouped view): a closed parent's group shows the parent closed and its items' own statuses, and no group heading reads either as the other's completion | POC-REQ-042, POC-REQ-043 |
 | RFC8-22 | The unestablished first link of the chain, work item to warrant, renders Unknown with its RFC2-24 reason, never silently skipped | covered — Amendment row | POC-REQ-014 |
@@ -250,8 +252,8 @@ exhausted — a reviewer who finds an unlisted limb has found a real gap.
 | RFC8-17 | Derivations of `pr-wait`, `external` and `decision` blocked causes | **Unknown** — Amendment row (eligibility); those input families remain unread | — |
 
 Part A totals `[Observed, computed by the sweep in "Verifying this
-table"]`: **176 consequence rows over 88 clauses — 126 covered,
-50 Unknown.**
+table"]`: **178 consequence rows over 88 clauses — 127 covered,
+51 Unknown.**
 
 **Amendment disclosure — the RFC1-26 closure row (ruling P-75 Q3).**
 The signed RFC1-26 row whose consequence reads "Relations outside the closed
diff --git a/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md b/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md
index b615b3b27..ac1a20d01 100644
--- a/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md
+++ b/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md
@@ -1032,7 +1032,11 @@ parameter set, `status` (one of the seven tracker statuses of POC-REQ-040),
 Unknown), `group=parent` and `page` (a positive integer), and any of them SHALL give a view
 of the matching items in ascending item id (with `group=parent`, in the
 grouped order below), one page of a declared fixed size, whose scope
-statement names the page, the page count and the matching count. No parameter SHALL give the default selection. Any other name, a
+statement names the page, the page count and the matching count. No parameter SHALL give the default selection. The set also holds
+`changed` (one of POC-REQ-044's change windows, `day`, `week` or
+`since-last`), which selects the window the changed answer shows and
+nothing else: alone it SHALL keep the default selection, and with another
+parameter it SHALL ride that view. Any other name, a
 repeated name, a value outside its set, a page that is not a positive
 integer, or a page past the last SHALL be refused with HTTP 400 naming the
 parameter, the reason and the allowed set, never ignored. When the
@@ -1042,7 +1046,8 @@ link, by real anchors outside any collapsed element and reachable by
 keyboard, to the default selection, every item by id, each status, the
 governing-intent Unknown and the grouped view with their whole-population
 counts, and the current view's previous and next page. The machine answer
-SHALL take no parameter and SHALL declare the parameter set, the page size,
+SHALL take no parameter and SHALL declare the parameter set, the default
+change window, the page size,
 the order, and the grouped order and its page unit, `position`
 (`trajectory.narrowing`), so any page is recomputable from
 `workItems.items` and `trajectory.outline`.
@@ -1269,9 +1274,45 @@ equal values (`trajectory.answers`). Today:
   state `activity-undetermined` while no staleness bound is declared
   (RFC8-16): state-local, carrying no RFC2-24 reason and no machine
   Unknown, with what resolves it.
-- *What changed* and *what it cost* SHALL each be an Unknown with its
-  closed reason and route while no movement source or cost record is read
-  (RFC8-19: absent cost is Unknown, never zero).
+- *What changed* SHALL be the tracker's net change between two named Dolt
+  revisions, for three windows in this order: `day` and `week`, each from
+  the newest commit in the observed revision's own history at or before
+  the observation instant less 24 hours or 7 days, and `since-last`, from
+  the previous evaluation's work-item revision. Every window SHALL end at
+  the observed work-item revision, never a fresh head, and SHALL be read
+  through the same read-only runner as the work items, by two statements
+  naming only commit hash and date (`dolt_log`) and item id, status and
+  diff type (`dolt_diff` over `issues`), never a title, message, committer
+  or other free text (SEC-5). For an observed window the answer SHALL
+  state both revisions with their recorded instants and count each changed
+  item, ascending id, as exactly one of: added (a row the window start did
+  not hold), closed (a status other than `closed` became `closed`),
+  reopened (`closed` became another status), re-stated (another status
+  change) or removed (a row the observed revision no longer holds); the
+  counts SHALL sum to the listed items. A row whose status did not change
+  SHALL be counted as updated without a status change and never listed, and
+  a row outside the observed prefix SHALL be counted and never named. No
+  window SHALL state a rate, a velocity, a verdict or a per-person figure,
+  and a readable window with no change SHALL say it is an observed zero.
+  A window SHALL be Unknown with its reason, never zero, when the work-item
+  revision or the observation instant is unavailable, when a history read
+  fails, returns another shape or does not confirm the observed revision
+  (any of these makes every timed window Unknown, never a partial count),
+  when the history holds no commit as old as the window bound, when the
+  history between the window start and the observed revision holds a
+  merge or a commit dated after the bound behind the start (so the start
+  found by date is not a point on one line of history), or, for
+  `since-last`, while no previous evaluation's revision is recorded. The
+  machine answer SHALL carry every window with every changed item; the page
+  SHALL show one window (the `changed` parameter of POC-REQ-042, `day` by
+  default), link to the others with their counts, and list at most 250
+  changed items, counting the rest. Every Unknown window SHALL be stated in
+  one disclosure with each window's reason and the route, and every page
+  SHALL show each Unknown window's reason and that disclosure, whichever
+  window it selects.
+- *What it cost* SHALL be an Unknown with its closed reason and route
+  while no cost record is read (RFC8-19: absent cost is Unknown, never
+  zero).
 - *Verified against intent* SHALL give three separately labelled counts,
   each with its own denominator, and no element SHALL add any two of them:
   (a) Unknown-provenance, the served items with no traceable warrant, n of
@@ -1289,14 +1330,19 @@ When work items are not observed, all five answers SHALL render, each an
 Unknown referring to the work-items disclosure, and no count SHALL appear.
 
 - **Scope.** the answers region of Trajectory and `trajectory.answers` on
-  the machine answer. The wider charter (what is planned, blocked, and why
-  the work exists), orphaned-work detection and any reconciliation verdict
-  are outside it.
+  the machine answer, and the history read behind the changed answer. The
+  wider charter (what is planned, blocked, and why the work exists),
+  orphaned-work detection, any reconciliation verdict, a record of the
+  previous evaluation's revision, a join to commit subjects, and merge
+  facts are outside it.
 
 - **Case**: a checker serves 252 work items, of which the selection
   renders 250, and reads Trajectory and the machine answer; then repeats
   with a materialized item whose change is on the default branch, and with
-  the work-item observation Unknown.
+  the work-item observation Unknown; then reads the changed answer over a
+  history fixture holding each kind of change, a status-only update and an
+  out-of-prefix row, over a history shorter than the week, over each
+  failed or malformed history read, and with each `changed` value.
 - **Observable**: five answers in order before the scope statement; the
   status counts, claimed count and three fifth-answer counts with their
   denominators; the liveness state; each Unknown part's reason and route.
@@ -1312,8 +1358,14 @@ Unknown referring to the work-items disclosure, and no count SHALL appear.
   machine answer's; count (a) equals `workItems.governedByUnknownCount`;
   count (b) is 1 of 1 with a merged materialized item and 0 of 0 without
   one while (a) is unchanged; (c) renders Unknown, never a number; with
-  work items Unknown, five answers render and none carries a count.
-  Equality decides.
+  work items Unknown, five answers render and none carries a count. For
+  the changed answer: each fixture item is listed once under its kind,
+  ascending id, the kind counts sum to the list, the status-only and
+  out-of-prefix rows are counted and never listed, both revisions and the
+  listed items equal the machine answer's, the history statements name no
+  free-text column, a short history makes only that window Unknown, every
+  failed or malformed read makes both timed windows Unknown, and
+  `since-last` renders Unknown with its reason. Equality decides.
 - **Oracle independence**: expected counts are the checker's own fixture
   rows, counted by the checker, never the renderer's model.
 - **Falsifier**: an answer missing, out of order or dropped for being
@@ -1321,7 +1373,10 @@ Unknown referring to the work-items disclosure, and no count SHALL appear.
   do not sum to the served total; a running count worded as observed
   activity, or liveness rendered as `active` or under an RFC2-24 reason;
   a count shown without its denominator; an Unknown part with no reason
-  or route; an element adding two
+  or route; a change window rendered as zero when unread, ending anywhere
+  but the observed revision, stating a rate or a per-person figure, naming
+  a free-text column or an out-of-prefix item, or listing an item twice or
+  under two kinds; an element adding two
   of the fifth answer's counts; orphaned work rendered as 0; a chain member
   stated under an RFC2-24 reason; or "verified" naming a state.
 
@@ -1330,8 +1385,8 @@ Unknown referring to the work-items disclosure, and no count SHALL appear.
 - **WHEN** 252 work items are served and the selection renders 250
 - **THEN** five answers render first, in order: the served count of each
   tracker status summing to 252, the tracker's claimed count with liveness
-  `activity-undetermined`, what changed and what it cost as Unknowns with their reasons and
-  routes, and three separate counts for verification against intent; the
+  `activity-undetermined`, what changed per window, what it cost as an
+  Unknown with its reason and route, and three separate counts for verification against intent; the
   machine answer carries the same five with equal values
 
 #### Scenario: A merged materialized item enters the chain
@@ -1347,11 +1402,32 @@ Unknown referring to the work-items disclosure, and no count SHALL appear.
 - **THEN** all five answers render, each an Unknown referring to the
   work-items disclosure, and no count appears
 
+#### Scenario: What changed in the last day
+
+- **WHEN** the tracker's history holds a commit older than a day and,
+  between it and the observed revision, one item was added, one closed and
+  one removed, one item was updated without a status change, and two
+  out-of-prefix rows changed
+- **THEN** the changed answer names both revisions with their instants,
+  lists the three items with their kinds and statuses (3 changed: 1 added,
+  1 closed, 1 removed), counts the update and the two outside rows without
+  naming them, links the week and since-last windows with their counts,
+  and the machine answer carries the same window with equal values
+
+#### Scenario: A window the history cannot answer
+
+- **WHEN** the history holds no commit as old as the week bound, or a
+  history read fails
+- **THEN** that window (or, for a failed read, every timed window) renders
+  Unknown with its reason and the disclosure's route, never zero, and
+  `since-last` renders Unknown while no previous evaluation's revision is
+  recorded
+
 ```yaml
 warrants:
   primary: VIS-2
   doctrine: [VIS-2, VIS-3]
-  contracts: [RFC2-18, RFC2-19(a), RFC2-24, RFC6-17, RFC8-8, RFC8-16, RFC8-19, RFC8-23, RFC8-28, RFC8-29]
+  contracts: [RFC2-2, RFC2-18, RFC2-19(a), RFC2-24, RFC6-17, RFC8-2, RFC8-8, RFC8-16, RFC8-19, RFC8-23, RFC8-28, RFC8-29]
   policies: []
   decisions: []
   topology: []
````

## Dispositions

Review R-T6S1-CHANGES-1 (`docs/reviews/R-T6S1-CHANGES-1-RAW.md`), verdict
`CONFIRM WITH EXCEPTIONS` (line 2) over commit `a12e25991`: 0 blocking,
3 should-fix, 7 notes. One round, not gating; each finding repaired once in
the commit after it, or answered here.

1. **Should-fix: the start chosen by date on a non-linear history.**
   Taken. The diff statement now carries two more counts per window: merge
   commits between the start and the revision (`dolt_commit_ancestors`,
   `parent_index > 0`, commits in `dolt_log(revision)` and not in
   `dolt_log(start)`), and ancestors of the start dated after the bound.
   Either above zero makes that window Unknown, `history-non-linear`, never
   a count. The spec says so. Tests: a merge and an inverted date, each
   affecting only its window; a missing or repeated count is malformed. A
   mutant ignoring merges fails. [Observed 2026-11-25] both counts are 0 on
   this repository's tracker for the day window.
2. **Should-fix: Unknown windows without reason or route on the default
   page.** Taken. Each window link now shows its reason code when Unknown,
   and a page showing an observed window also shows the one
   `region:trajectory-changed` disclosure (label "Other windows") with its
   reason and route. The spec now says every page shows them, whichever
   window it selects. New test over an observed day window; a mutant
   dropping the disclosure fails it.
3. **Should-fix: parity gaps.** Taken. The parity test now compares both
   revisions and instants and every window's link figure with the served
   machine answer, and the cap test checks the unlisted remainder against
   the projection's facts.
4. **Note: untested fail-closed predicates.** Taken: eight new malformed
   cases (missing merge count, repeated count, non-integer count, a count
   row naming an item, an added row with a start id, a removed row keeping
   a status, an extra column, an unknown diff type), 24 in all.
5. **Note: the byte-equality test proves nothing about once-per-observation
   derivation.** Taken: a new test counts the history statements at model
   build (2) and after five renders across windows and a view (still 2).
6. **Note: `history-read-failed` when nothing was read.** Taken: a direct
   caller passing no history now gets `history-not-read`, with its own
   sentence.
7. **Note: the disclosure's opening claimed a read.** Taken: it now opens
   "What changed is answered from the tracker's own history between two
   named revisions, where it can be read;".
8. **Note: item and status links drop `changed`.** Answered, not changed:
   the window and page links keep it; an item link goes to that item's
   card on the all-items page, and the status and default links are the
   POC-REQ-042 navigation, whose expected hrefs are pinned literally. The
   spec states only that `changed` rides a view it is given with.
9. **Note: response size.** Answered. The page lists at most 250 changed
   items (about 65 KB [Inferred]) against the 2 MiB human ceiling, and the
   reviewer observed 38 KB for both windows' facts in the machine answer on
   this tracker, against the 16 MiB machine ceiling. The served Trajectory
   page on the live tracker was not measured in this change [Unknown].
10. **Note: one UNION statement blanks both timed windows on one failure.**
    Answered, not changed: the spec states the all-or-nothing outcome, and
    one statement keeps both windows on one read. Per-window statements
    are a later change if a too-old week start is ever observed to fail.
