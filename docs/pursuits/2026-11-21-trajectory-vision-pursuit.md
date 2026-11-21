# Vision pursuit — Trajectory, run 1 — 2026-11-21

This file is for planning only. It is not authority and not a review verdict. Every move bead
filed from it depends on the plan-hold bead named under "Planned epic". Claims carry the labels
`[Observed]`, `[Inferred]` or `[Unknown]`. Every finding and move, with its measurements, is in
`docs/pursuits/2026-11-21-trajectory-vision-pursuit-data.json`:

```sh
jq '.ranked_moves[] | {id, title, owner_value, build_cost, prereq}' docs/pursuits/2026-11-21-trajectory-vision-pursuit-data.json
jq '.units[] | select(.unit=="board-page")' docs/pursuits/2026-11-21-trajectory-vision-pursuit-data.json
```

## Scope and provenance

| Item | Value |
|---|---|
| Run | The first pursuit scoped to Trajectory, the work surface. The four earlier runs (2026-09-13, 09-22, 11-09, 11-21) were scoped to Polaris; run 2 says Trajectory, Orrery and the home page "were captured and never tiered". There is no tier baseline, so this run reports no movement. |
| Owner's question | "Explore the status of Trajectory, and chart a course for the gaps between Trajectory's vision and reality." |
| Syzygy | Read at `origin/main` `c62d4cf79`. The four Trajectory source files are byte-identical between that commit and the observer commit of the page measured. |
| Subject output | The owner's running daemon's Trajectory page, fetched once at 2026-11-21 (508,101 bytes; observer `52f50f1c9`; proving project at its commit `a2a5b731f8d7`; evaluation as of 11:54:39Z). Layout was measured in headless Chrome on that saved copy at 1440 and 390 px wide. The daemon stopped answering during the run; nothing here touched it. |
| Method | Six surfaces, so the audit and the lenses ran inline in one session, as the pursuit rules prescribe for a small surface count. One fresh reviewer then challenged this report and returned REVISE; every finding was repaired once (see "Corrections after independent review"). Mid-run the owner asked that the th-projects progress dashboard be taken into account; it is a lens below. |
| Limits | The credentialed machine answer was not read (the request returned 401), so every statement about the machine channel comes from source and from the page. The proving project's repository and tracker are not readable from this session; probes of dependency edges, Dolt history and commit subjects were run on Syzygy's own tracker and say what Beads and Dolt offer, not what the proving project holds `[Inferred]` for that project. No engineering audit of test rigor ran `[Unknown]`. |

## North star (quoted)

The README states Trajectory's job as five questions: "What remains, what is running, what
changed, what it cost, and whether the result has been verified against intent. Five questions,
and the fifth is the one no issue tracker answers: a merged change is not a satisfied intent."

The surface charter (SDR §2) adds provenance and a refusal: "with dependencies and provenance
navigable from intent through execution and verification. *Not satisfied by:* a Kanban board,
Beads mirror, or issue list that cannot account for execution and resulting changes."

Doctrine stages it. V0 (`v1.md`): "Work navigation — pending and completed work as navigable
dependency graphs", and one working slice of the loop: "from one signed-off spec delta, dispatch
one scheduled work item end to end for a worker to materialize". V1 adds post-hoc execution
telemetry (SDR-5), cost that is "Unknown, never zero" (SDR-6) and the computed reconciliation
gap (SDR-12). Order of values is VIS-1: truth, then comprehension, then momentum.

## The answer in brief

**Trajectory today is an honest list of identifiers. It is truthful, and it answers one and a
half of its five questions.** The page is what the charter says does not satisfy it: a board
over a Beads mirror. The course below does not start with new machinery. It starts by reading
what the tracker already records, and by saying each Unknown once.

| Question | Today `[Observed]` | Verdict |
|---|---|---|
| What remains? | Counts for a selection of 250 of 10,971 items. No count of open items over the whole set, no titles, no dependencies, no readiness. | weak |
| What is running? | 20 cards under "In Progress", from the tracker's own word. No claimant, no last signal, no way to tell a live lane from a dead claim. | weak |
| What changed? | Nothing. The page states "movement Unknown". One bounded seam can observe one worker's commits for one demonstrated item; on the live page that item does not exist. | absent |
| What did it cost? | Nothing, not even a stated Unknown. Lead time, one of the V1 measures RFC8-18 lists, is derivable from instants the page already holds. | absent |
| Verified against intent? | Governing intent is Unknown for 10,971 of 10,971, counted once with its reason and route; verification is Unknown on each rendered card and is counted nowhere. Honest, and empty: no item names an intent. | honest, empty |

Three findings carry most of the gap.

1. **The page spends its bytes repeating three sentences.** Each card is an identifier, the
   tracker's state word, a bar, and three boxed Unknowns that are the same on every card.
   The 250 cards are 95.5% of the page; the boxed Unknowns alone are 70.7% of it (359,474
   bytes). Two of the three (governing intent and the withheld title) are already stated once
   above the board; verification has no board-level statement or count. The page shows 753 Unknown marks and 4 Observed ones. Priority and item type are
   read and never shown; dates exist only as an unlabelled bar hidden from assistive
   technology `[Observed]`.
2. **The observation reads rows and no relationships.** One query reads seven columns of one
   table. Beads also records, with no free text, who blocks whom and which item is whose
   parent (835 `blocks` and 641 `parent-child` edges in Syzygy's own tracker), and Dolt keeps
   every past revision (256 row changes to items in the last day there). V0's own wording is
   a dependency graph, and "what changed" is a query the substrate already answers
   `[Observed]` on Syzygy's tracker, `[Inferred]` for the proving project.
3. **The one working slice of the loop is switched off by a ruling whose premise changed
   today.** The materialize panel reads "The write is not available … Foreclosed by owner
   ruling P-71-Q5 … Lifting it needs a dated owner act". Since D10 that kind of act is retired,
   and at `c62d4cf79` the owner added the proving project to the list of repositories the
   owner owns. `[Inferred]` lifting the foreclosure is now an agent adoption with a row; the
   click that triggers the write stays the owner's.

One defect is about truth and should not wait for anything: **closed items sit under a column
headed "Done"**. The contract package forbids exactly that word (RFC8-2(b): not "a view in
which scheduler closure renders as done"; RFC8-15: never "under any label meaning done,
complete, finished, or resolved"). Each card under it does say "Verification: Unknown", so no
verified claim is made; the heading is still the closure fallacy's own word, and the coverage
table records RFC8-15 as covered `[Observed]`.

## A working miniature: the progress dashboard

The owner's th-projects progress dashboard already does, for one agent session, part of what
Trajectory is chartered to do for a project `[Observed, skill text and scripts]`. It keeps the
tracker authoritative and only projects it. It splits work into in progress, to do and
complete, under the tracker's own ids. It lists the session's agents with a status it calls
"an observation, not a liveness lease", stale instants left visible. It measures token use
from runtime logs it was explicitly handed, reads counters and no text, says "never fill gaps
with guesses", and reports coverage over measured sources only. It takes steering as queued
feedback with a recorded disposition, never as a command.

Those are Trajectory's rules at a smaller scale: RFC8-3's rebuildable projection, RFC8-16's
liveness, SDR-6 and RFC8-19's cost. Three consequences for the course:

- **The cost producer exists.** The first draft ranked cost last for want of one. The
  dashboard's usage adapter is one, for both agent runtimes the fleet uses. T13 is re-scoped
  and moved up.
- **"What is running" has two halves.** The tracker knows what is claimed; only a session
  record knows which agents are working on which item now. Trajectory needs both.
- **The difference is the epistemic grade.** A dashboard is written by the session it
  describes. In Syzygy's terms its summaries are a worker's report, Observed as a report fact
  only (SDR-9), while its token counters are deterministic reads of runtime records. The
  dashboard is also scoped to one session and forgets across sessions; Trajectory's job is the
  account across them.

Retained, not ranked: the dashboard's feedback queue as a model for an owner note attached to
a work item, with a recorded disposition. It borders the live control SDR-5 defers.

## Tier board

First Trajectory run: tiers only, no movement column. Tiers are gap to the ideal, not pass or
fail.

| Surface | Tier | One-line gap |
|---|---|---|
| Work-item observation (`work-items.ts`) | weak | Deterministic and SEC-5 safe, but seven columns of one table: no edges, claimant, closure reason or reference outward. |
| Selection (`trajectory-projection.ts`) | functional | Well bounded and declared (three review rounds), but ranked by recency, and the 10,721 items outside it cannot be reached at all. |
| Board page (`trajectory.ts`) | weak | Identifier-only cards; no totals over the whole set; "Done"; 63,731 px tall at 1440, with the closed column starting at 47,139 px; 205 words of apparatus before the first work fact; sideways scroll at both widths. |
| Time visualization | weak | A bar with no axis, no dates in text, hidden from assistive technology. The direction asked for "kanban boards with time visualizations". |
| Dispatch slice (materialize) | weak | Built, tested, and unavailable; its refusal text describes a regime D10 retired. |
| Worker change and verification seam | functional | Honest and capped at report-fact, for one item; no row on the live page. |
| Machine channel | functional | Serves every item with the same facts `[Inferred from source]`; inherits the observation's thinness. |
| Cross-surface join | weak | Two links to Polaris and one to Orrery from the page chrome; no card leads to an intent, a commit or a place in the code. |

Against the contract `[Observed, CONTRACT-COVERAGE.md]`: of RFC 0008's 32 clauses the adopted
POC spec covers some limb of 8, records 1 as Unknown and sets 23 out of scope. Five
requirements govern the surface (POC-REQ-014 and 040 to 043).

## Systemic themes

1. **Honest, and nearly empty.** The truth floor holds everywhere. Comprehension and momentum,
   the second and third values, have had no work. Exemplars: A3-F1, A3-F2.
2. **Rows without relationships.** No edge of any kind is read. Exemplars: A1-F1, A1-F2.
3. **A board of now.** Nothing compares two instants, on a substrate that versions every
   change. Exemplars: A1-F3, A4-F1.
4. **The tracker's words, not the contract's.** "Done" and "In Progress" are scheduler words
   the contract either forbids or makes conditional on a declared staleness bound (RFC8-16).
   Exemplars: A3-F3, A3-F4.
5. **The loop is built and parked.** Exemplar: A5-F1.
6. **Trajectory has never been the subject.** Four pursuits, one spec group of four
   requirements, and a V1 readiness drive (`syzygy-rrrd`) whose artifacts are outside this
   repository. Meanwhile the owner built the session-scale version elsewhere. Exemplar: A7-F1.

## Ranked moves

Ranking rule: owner value in VIS-1 order, then enabling order, then the inverse of build cost.
Scores are value/cost on 1–5. Ids are T1…T13, distinct from M, N, P and Q. None touches
doctrine: each serves a V0 or V1 mandate already adopted, so none is vision-extending. Under
VIS-4 each specification change is an agent adoption with its row, except T5 and T10, which
wait on the owner; slices and measurements are
under `.ranked_moves[]`.

**T1 — Retire the closure words (truth; 5/1).** Head the closed column with the tracker's own
word, "Closed", and a standing line: closed is not merged, verified or reconciled. The same file
labels the worker row "Active" and "Changed / merged": the first is the state RFC8-16 makes
unrenderable without a declared bound, the second a word RFC8-13 keeps for a VCS merge fact.
Rename both to what the seam observed (commits seen on the bounded seam). "In Progress" is the
weaker case, since the spec sets RFC8-16 out of scope; head it "Claimed" in the same change.
Add the falsifier to POC-REQ-043: no heading, count or sentence names closure with a word
meaning done. Correct the RFC8-15 coverage row in the same amendment.

**T2 — Say each Unknown once, and give the card back to the item (comprehension; 5/2).** Add
the missing board-level verification Unknown with its count, then state the three per-item
Unknowns once per board, as scopes the cards inherit (the technique the
Polaris tuples already use), keeping each card's machine-readable marker for the parity sweep.
That returns about 70% of the page. Spend it on what is already read: priority, created,
updated and closed dates as text, and age. Item type waits for `syzygy-z5ls`, which found it
may carry free text and is served raw; it renders once that bead gives it a closed list. Fix the gutter of the status strip, the sideways
scroll (one long code string), and the column wrap that puts closed work 47,000 px down.

**T3 — The five answers, first (comprehension; 5/2).** Open the page with five rows, one per
question, each an answer or its Unknown with reason and route: remaining (counts by state over
all 10,971 served items, not the selection), running (claimed count; liveness undetermined),
changed (Unknown until T6), cost (Unknown, never zero, until T9 and T13), verified (0 of N).
This renders Trajectory's own gap honestly, which is the product's thesis, and makes every
later move visible as a row that changes.

**T4 — Read the edges (V0 mandate; 5/3).** Observe the dependency table: item, depends-on item
and a closed list of edge types, nothing else. From the snapshot alone (RFC8-13 forbids asking
the tracker live) derive blocked-by, the ready set, and parent and child. Render the navigable
dependency graph V0 names: an epic outline with a text equivalent, each blocked card linking to
its blockers, and the `dependency` blocked cause (RFC8-17). Unknown edge types fail closed.
The query names its columns, so no free-text column rides along. The adoption row cites the
2026-10-28 P-115 direction, which asked an owner act for a "new observation column/content
class", as superseded by VIS-4 for a column that carries no free text.

**T5 — Titles, under a declared policy (comprehension; 5/3; owner gate).** A board of
identifiers cannot be an account. The move: declare a secret-classification policy for the
work-item title class, run the existing detectors and the active-content scan on each title,
and keep a matching or unclassifiable title withheld with its exclusion rendered. This is the
owner's to decide. SEC-5 reserves "a change that makes the policy detect less, admits
unclassifiable content, or lets a secret be indexed, rendered or sent"; titles are excluded
today because they are unclassifiable, the owner answered exactly this question on 2026-10-20
(titles excluded), and pattern detectors over free text can miss a secret that would then be
rendered. Nothing is built until the owner answers (see "Owner gates this run").

**T6 — What changed, from the substrate's own history (5/3).** Dolt keeps every revision. For
a window the reader chooses (since the last evaluation, a day, a week), list items added,
closed, reopened and re-stated between two named revisions, each fact carrying both revisions.
The diff query names its columns; the history tables carry title columns too, and none is read.
It needs no Syzygy-side retention. This is the first real answer to the third question and to
RFC8-2(c)'s "for a past window".

**T7 — Lift the stale foreclosure and run the loop once (momentum, V0 mandate; 5/2).** This
reopens slice 6 of `syzygy-dov.4` ("run the return path once"), the slice P-71-Q5 closed with
"No write into Butlers or any repository"; the adoption row quotes that sentence. Adopt the
registry change that names the one write, pass the real write surface to the authorization
(`syzygy-mxas`, a prerequisite), replace the refusal text that asks for a retired kind of act,
and leave the trigger with the owner. Then run the slice once on the proving
project: materialize, observe the worker's change, capture a test artifact, and record it.
After it, one item of 10,971 has a governing intent from Syzygy's own record, and the
warranted and Unknown-provenance populations both exist for the first time.

**T8 — Reach every item (4/2).** Server-side narrowing by state and parent (and by type once
`syzygy-z5ls` closes), with the selection rule and counts restated, so the 10,721 items outside
the selection are reachable and the coverage row recorded as Unknown, "Unknown-provenance
items outside Trajectory's rendered selection are filterable", can be observed. After T2 the default selection can be the whole non-closed set, grouped by parent.

**T9 — Time, drawn and written (V1 cost measure; 4/2).** From recorded instants only: lead
time of closed items, age of open ones, arrivals and closures per week, each an independent
measure with its coverage (RFC8-18, RFC8-19), drawn with an axis and given as a table. Replaces
the unlabelled bar. Tokens and money stay Unknown, stated.

**T10 — Commits by naming convention (what changed, per item; 5/3; owner gate).** Read commit
subjects only for tokens that match the item-identifier grammar, keep the tokens and discard
the rest, and join item to commits to the merge fact, basis `naming-convention`, rendered
`reduced-fidelity` as RFC8-21 requires. It separates merged from closed-unmerged. In Syzygy's
own history 85 of the last 175 subjects carry such a token `[Observed]`; the proving project's
convention is `[Unknown]`. A commit subject is free text of the same class as a title, so
whether reading it to extract a token is admitted is asked with T5. Related and not shown to
bind this join `[Unknown]`: the parked merge-fact clarification (`syzygy-a4ry`, `syzygy-nosn`).

**T11 — The contract's vocabulary (4/4).** Adopt RFC8-12 and RFC8-13 into the spec: the
thirteen normalized values and the chain state as a second field, each derived or honestly
absent (`activity-undetermined` for claimed items, `eligibility-undetermined` where edges were
not read). Needs T4 and T10. This is where the board stops being the tracker's columns.

**T12 — Syzygy's own work as the second project (5/4).** Point Trajectory at this repository's
tracker: 1,343 items, 1,580 edges, item identifiers in half its commit subjects, and a fleet
whose stale claims a coordinator audited by hand on 2026-11-02. It is the owner's daily
"oversized diffs and scattered completions with no coherent account". It changes the POC's
single-project bound, which is an adoption with a row. The proving project's name is
hard-coded in the board, the authorization and the materialize route, so this costs more than
a registry entry. Titles here still wait on T5's answer.

**T13 — Sessions as execution records: who is running, and what it cost (V1, SDR-5; 5/3).**
The producer exists (see "A working miniature"). Ingest each session workspace's structured
record: the session and its child agents, the tracker ids they name, last-update instants, and
measured token counters with their coverage. Take identities, instants and numbers only; a
session's own summaries are a worker's report (Observed as a report fact, SDR-9) and free
text, so they are withheld. It gives the second question its live half, which no tracker
holds, and the fourth question its first measured answer, Unknown where unmeasured. It stays
post-hoc and read-only: steering and live control remain deferred (SDR-5).

### What to build first

- **Wave 1, no new reads:** T1, T2, T3, T9, T8. After it the page answers the first question
  in counts, states the other four honestly in five rows, and is a fifth of its height.
- **Wave 2, new reads, each with an adoption row:** T4, T6, then T7.
- **Wave 3, the account:** T13, T12, then T11; T10 if the owner admits it.
- **Waiting on the owner:** T5 and T10.

## Strongest objections

- **Trajectory is a POC surface; the contract's full account is V1.** True, and T11 is ranked
  late for it. But T1 to T4, T6 and T7 are V0's own words (dependency graphs,
  absences, one dispatched item), and they are unbuilt.
- **Hoisting the Unknowns weakens the per-claim honesty the POC was built to prove.** The
  marker stays on every card for the machine and the sweep; only the repeated sentence moves
  to its scope. The parity requirement (POC-REQ-020) is per tuple, and must be re-proved.
- **Reading titles risks a secret on a page.** Yes; that is why T5 is the owner's decision
  and builds nothing before it.
- **A fleet is mid-flight on other epics.** T2 and T8 touch the POC shared model's renderer,
  which has WIP one; the plan-hold exists so a lead session sequences them.

## Owner gates this run

One packet, two items, each reviewed by an independent subagent before it was served. The
packet path and decision ids are recorded on the plan-hold bead and in the data file under
`.owner_packet`. Both are asked under VIS-4's rule: when unsure, treat the change as
owner-class and ask.

- `pursuit-2026-11-21-trajectory-titles` (T5): whether work-item titles may be read, screened
  and rendered under a declared policy. It would reverse the owner's answer of 2026-10-20.
- `pursuit-2026-11-21-trajectory-commit-subjects` (T10): whether commit subjects may be read
  only to extract item identifiers, with the rest discarded.

Release is not asked: when implementation starts is an agent decision under VIS-4, reported
and open to veto. Two moves change something the owner decided before D10 and say so in their
beads: T7 (ruling P-71-Q5; its write is triggered by the owner alone) and T12 (the POC's
single-project bound).

## Planned epic

The epic and plan-hold ids are recorded in the data file under `.epic` once filed. Each move
bead depends on the plan-hold, an ordinary sequencing bead, not an owner gate: this run was
asked to chart a course, so it files a plan and starts nothing. A lead session releases wave 1
by filing its slices as ready beads and reporting them.

## Corrections after independent review

One round, verdict REVISE; the full findings are in the data file under `.review`. Repaired
here, each re-checked against the file it names:

- "No owner gates" did not hold: T5 is owner-class under SEC-5's own sentence, and T10 reads
  the same class of free text. Both are now asked, and neither is in a wave.
- The first draft said three board-level notices repeat the three per-card Unknowns. There are
  two; verification has none, and the "10,971 of 10,971" figure is governing intent's.
- Lead time is one of RFC8-18's V1 measures, not "the contract's first cost measure".
- Two quotations were not verbatim (the 2026-09-22 dossier; the RFC8-23 coverage row).
- T1 missed two contract words in the worker row; T2 and T8 depend on `syzygy-z5ls`; T7
  reopens a slice of `syzygy-dov.4` and needs `syzygy-mxas`; T12 was under-costed; T10's
  stated prerequisite was not shown to bind.
- Not re-measured by the reviewer: the page's byte, pixel and mark counts (the daemon was
  down). They rest on this run's one capture.

## Known ledger and deviations

- **Deduplicated against** the open beads that touch this surface: `syzygy-mxas` (the real
  write surface in the authorization), `syzygy-k0np` (accessible
  names on Trajectory), `syzygy-z5ls` (item type and identifier as free-text carriers),
  `syzygy-jytt` (titles and SEC-5), `syzygy-pya8` (stale RFC4-15 coverage wording),
  `syzygy-a4ry` and `syzygy-nosn` (merge-fact reading), `syzygy-dov.4`, `syzygy-dov.9`,
  `syzygy-bpyt.5.3` (HTML component layer), and the V1 readiness drive `syzygy-rrrd`,
  `syzygy-qd2t`, `syzygy-oq3x`, whose working files are not in this repository `[Unknown]`.
- **Retention deviation.** The deliverables rule keeps only the two newest data files. The
  older data files have live citers (recorded by the fourth Polaris run), so none was pruned.
- **File name.** The fourth Polaris run holds today's default name, so this run's files carry
  the surface in their names.
- **No harvest file.** The run was inline; the data file holds every unit's output.
