# Semantic delta T9 — Trajectory measures elapsed time over every served item

**Artifact(s):** `openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md`;
`openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md`; generated `openspec/changes/three-surface-poc-experience/GOVERNING-DEPENDENCIES.md`.
**Stable IDs affected:** new POC-REQ-045 (Trajectory group; two
Scenarios); POC-REQ-041 (Required behavior and Scope); the spec's group
note (Trajectory 040–044 → 040–045); CONTRACT-COVERAGE: RFC8-18 moves
from Part B1 to Part A (a covered and an Unknown limb), RFC8-19's coverage
limb turns covered; the family table, the Part A totals and the two
verifying lines.
**Change class:** Normative (a new requirement and an amended one).
**Author:** agent lane `coordinator:claude-20261122-81840bd5`, bead
`syzygy-t3jk.17` (Trajectory pursuit move T9, slice S1).
**Date:** 2026-11-22

## Current meaning

Trajectory's only temporal encoding beyond each card's instants is a
per-card lane bar: a position and width along the span between the
rendered selection's earliest and latest instant (`timeRange`). It measures
nothing: no duration, rate or age is stated, its span changes with the
selection, and it is `aria-hidden`, so no reader without sight gets it.
The cost answer (POC-REQ-044) is Unknown for every measure, and
CONTRACT-COVERAGE holds RFC8-18 in Part B1 and RFC8-19's coverage limb
Unknown because "no cost measure is read". POC-REQ-041 allows instants
from work-item facts only.

## Proposed meaning

POC-REQ-045: four independent measures over every served item, each with
"n of m" coverage: lead time (closed, created to closed) and age (open,
created to the observation's capture instant `workItems.capturedAt`, never
a clock), each the median and nearest-rank 90th percentile in whole hours
rounded down, "not measurable" (never 0) with no item covered; arrivals and
closures per ISO 8601 week in UTC, every week between the first and last
covered event listed. An item whose needed instant is missing, invalid,
timezone-less or reversed stays in the denominator, not covered. The
measures declare their source (`tracker-recorded-instants`) and evidence
class (`observed`), and nothing combines two (RFC8-18). The page draws
them as two script-free SVG charts, one unit per axis (counts per week;
hours), each titled with labelled axes and a text alternative, and repeats
every number in tables equal to `trajectory.timeMeasures`. The cost answer
stays Unknown for every other cost and links to the measures.

POC-REQ-041 adds the capture instant as an allowed instant (the one an
age runs to) and names its scope: card instants and POC-REQ-045's charts
and tables.

## What explicitly does NOT change

- The board, its selection, columns, notices and cards (POC-REQ-040,
  042, 043); the five answers (POC-REQ-044) keep their values. The cost
  answer's state, reason and route are unchanged; it gains one link.
- No new tracker read: only the columns already selected (created,
  updated, closed instants and status). No title (SEC-5). No cycle time,
  no status history, no effort, token or money measure, no composite or
  score.
- No new Unknown and no new route: the unknown-route sweep's denominators
  are unchanged, so it gains no rule.
- POC-REQ-041's falsifier and oracle (byte-equal renders at two
  wall-clock times) are unchanged; the lane bar the old sweep counted is
  gone, and the new byte-equality test pins the rule.

## Choices the review may contest

- **New requirement, not an amended POC-REQ-041.** 041 is an invariant
  over every temporal encoding; the measures are a query with their own
  oracle and coverage rule, so they are POC-REQ-045 and 041 only widens
  its allowed instants.
- **Age runs to the capture instant.** That instant is the observation's,
  recorded once and served (`workItems.capturedAt`), so two renders of one
  observation agree. It varies with a new capture, so the response
  identity declares `trajectory.timeMeasures.age` and
  `trajectory.timeMeasures.measuredAt` excluded (25 → 27 paths), as it
  already excludes `workItems.capturedAt`.
- **Nearest rank, whole hours rounded down.** A checker can recompute
  both without interpolation; hours rounded down never overstate.
- **Lead time is a cost measure; age, arrivals and closures are flow
  measures.** Only lead time is in RFC8-18's V1 set, so only its row
  claims RFC8-18; all four disclose coverage (RFC8-19).
- **Series colours** are the dataviz reference palette's dark slots 1 and
  2 (`#3987e5`, `#d95926`), validated on the page's panel `#0c181b`
  (adjacent CVD ΔE 26.8, normal-vision 31.8, both at least 3:1); neither
  is an epistemic colour, and both series are direct-labelled.

## Machine-answer change

`trajectory.timeMeasures` on the observed projection: `source`,
`evidenceClass`, `measuredAt`, `leadTime` and `age` (`covered`, `total`,
`medianHours`, `p90Hours`), `arrivals` and `closures` (`covered`,
`total`), `weeks[]` (`week`, `arrivals`, `closures`). `timeRange` is
removed. Response identity: two new excluded paths.

## Warrant

VIS-2 (an unmeasurable value is stated not measurable, never 0; coverage
is disclosed); VIS-6 (time from recorded instants only); RFC8-18 (lead
time as an independent measure with declared source and evidence class,
no composite); RFC8-19 (every aggregate over partially known measures
discloses its coverage); RFC2-3 and RFC6-22 (as POC-REQ-041). An agent
adoption under VIS-4 as amended by D10; nothing here is owner-class.

## Evidence or decision basis

- `trajectory-time-measures.test.ts`: literal measures over nine items
  (two covered lead times, an invalid, a timezone-less and a reversed one;
  two covered ages, a reversed and an impossible date); nothing covered →
  null, never 0; nearest rank over ten items (median 5, p90 9); ISO weeks
  across 2020/21 and 2026/27 and under a +02:00 offset, by Python's
  `date.isocalendar`.
- `trajectory.test.ts` "Trajectory elapsed-time measures": the served
  measures literal by hand; every table cell equal to the machine answer
  and a mutated cell named (rule 6); two titled charts with axis labels and
  text alternatives, no script, no lane bar; the cost answer's link while
  it stays Unknown; byte-equal renders at two wall-clock times.
- `trajectory-projection.test.ts`: the projection equal under a faked
  2031 clock; `timeRange` absent.
- The response-identity census finds exactly the 27 declared paths, and
  omitting each, the new two among them, fails stability.

## Downstream impact

Method: `git grep` over `apps/`, `packages/` and `scripts/` for
`timeRange`, `laneBar`, `time-lane`, `lane-bar` and the response-identity
exclusion count. Changed: `response-identity.ts` (two paths) and the four
tests pinning its count (`response-identity.test.ts`,
`response-identity-independent.test.ts`, `polaris-parity-sweep.test.ts`,
`routes.test.ts`); `trajectory-projection.test.ts` (the `timeRange` test
replaced); `model.ts` (the cost basis sentence). R3 of
`scripts/check_spec_reconciliation.py` reads the new requirement from its
adoption row (POC 27/40 → 28/42); `census.json` regenerated. Retained
evidence that quotes "25 declared capture-time exclusions" describes its
own commit and is not edited.

## Migration / supersession plan

One pull request; adoption by an `AGENT-ADOPTIONS.md` row in a second
commit naming the change commit; tag
`three-surface-poc-elapsed-time-amendment-v1.0` after merge.

## Review

**Required class:** one fresh-context review (CC-REV-1; one round, not
gating). **Reviewer and verdict:** the retained raw named in the pull
request.

## Exact text

````diff
diff --git a/openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md b/openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md
index 99446d03a..ea2dc2958 100644
--- a/openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md
+++ b/openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md
@@ -51,7 +51,7 @@ Every clause was judged exactly once and lands in exactly one part:
 | RFC6 | 28 | 10 | 1 | 17 |
 | RFC7 | 41 | 12 | 4 | 25 |
-| RFC8 | 32 | 13 | 2 | 17 |
+| RFC8 | 32 | 14 | 1 | 17 |
 | RFC9 | 60 | 17 | 2 | 41 |
-| **Total** | **324** | **85** | **29** | **210** |
+| **Total** | **324** | **86** | **28** | **210** |
 
 The Part A clause set is exactly the `contracts[]` union in the
@@ -241,8 +241,10 @@ exhausted — a reviewer who finds an unlisted limb has found a real gap.
 | RFC8-16 | `active` and `stale-or-dead` against a declared bound with an effective owner act; worker liveness between signals; inadmissible liveness signals | **Unknown** — Amendment row (five answers); no bound is declared and no progress signal is read | — |
 | RFC8-19 | Absent cost renders Unknown, never zero | covered — Amendment row (five answers). Moved from Part B2 | POC-REQ-044 |
-| RFC8-19 | Every aggregate over partially known measures discloses its coverage and never renders as a complete total | **Unknown** — Amendment row (five answers); no cost measure is read, so no aggregate exists to disclose coverage | — |
+| RFC8-19 | Every aggregate over partially known measures discloses its coverage and never renders as a complete total | covered — Amendment row (elapsed time); lead time, age, arrivals and closures each state "n of m" items covered, and an uncovered item stays in the denominator. Was Unknown (five answers) | POC-REQ-045 |
+| RFC8-18 | Lead time renders as an independent measure with its declared source and evidence class, never combined into a composite | covered — Amendment row (elapsed time); the measures declare `tracker-recorded-instants` and `observed`, and no element combines two. Moved from Part B1 | POC-REQ-045 |
+| RFC8-18 | The rest of the V1 measure set (effort and complexity tier, active compute time, blocked time, tokens, API cost, attempts, review rounds, CI time, rework, touched components) renders, each with its source and evidence class | **Unknown** — Amendment row (elapsed time); none is read, and the cost answer states them Unknown | — |
 
 Part A totals `[Observed, computed by the sweep in "Verifying this
-table"]`: **169 consequence rows over 85 clauses — 120 covered,
+table"]`: **171 consequence rows over 86 clauses — 122 covered,
 49 Unknown.**
 
@@ -304,5 +306,4 @@ direct requirement additions.
 | Clause | Observable consequence (row label) | Disposition | Requirements |
 |---|---|---|---|
-| RFC8-18 | Cost renders as independent measures with declared source and evidence class, never a composite | **Unknown** — Amendment row (five answers); the cost answer is Unknown because no measure is read, so no requirement observes a measure or the independence rule. Moved from Part B2 | — |
 | RFC1-3 | Observed-source repository is read-only; no writes emitted to Butlers | **Unknown** — Borderline: out-of-scope bars "writes to the observed project," matching RFC1-3's read-only default, but no POC-REQ's oracle tests absence of writes; consent-record specifics have no matching requirement | — |
 | RFC1-6 | VCS objects (git revision) not reified as first-class nodes, enter only as identifier/evidence | **Unknown** — POC stamps facts with "exact git revision"; no requirement's oracle checks it isn't reified as a separate Commit node | — |
@@ -567,8 +568,8 @@ Part B2 total `[Observed, computed]`: **218 clauses.**
 
 - Denominator: re-run the two counting methods named above; both must
-  return 324 for RFC1–9, and 85 + 29 + 210 = 324.
+  return 324 for RFC1–9, and 86 + 28 + 210 = 324.
 - Mapped set: `python3 scripts/build_three_surface_poc_spec_dependencies.py
   --check` — Part A's clause column must equal the generated
-  `contracts[]` union (85 identifiers).
+  `contracts[]` union (86 identifiers).
 - Totals: count rows and dispositions in this file's tables (e.g.
   Python over the `| RFC` rows); the printed totals must match the
diff --git a/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md b/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md
index 8757233f7..30b2ae0dd 100644
--- a/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md
+++ b/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md
@@ -30,5 +30,5 @@ Reader notes, binding on how this file is read:
   observation* (001–004), *Work-item observation* (010–014), *Client
   rendering and parity* (020–022), *Polaris* (030–032), *Trajectory*
-  (040–044), *Orrery* (050–053), *Cross-cutting experience* (055, 060–061).
+  (040–045), *Orrery* (050–053), *Cross-cutting experience* (055, 060–061).
   Identifiers are stable and literal: minted once, amended in place,
   retired rather than reused, never renumbered (CC-SPEC-3). Gaps in the
@@ -982,8 +982,11 @@ Group: Trajectory. Form: **invariant**.
 **Required behavior.** Every temporal position, duration, or ordering
 Trajectory renders SHALL derive from instants recorded in the observed
-work-item facts (created, updated, closed), never from render-time clocks or
-inferred ordering.
+work-item facts (created, updated, closed), or from the work-item
+observation's own capture instant (`workItems.capturedAt`, the instant an
+age runs to, POC-REQ-045), never from render-time clocks or inferred
+ordering.
 
-- **Scope.** all temporal encodings on the surface.
+- **Scope.** all temporal encodings on the surface: each card's recorded
+  instants and the elapsed-time charts and tables of POC-REQ-045.
 
 - **Case (sweep)**: a checker enumerates Trajectory's temporal markers
@@ -1262,4 +1265,87 @@ warrants:
 ```
 
+### Requirement: POC-REQ-045 — Trajectory measures elapsed time over every served item
+
+Group: Trajectory. Form: **state projection/query**.
+
+**Required behavior.** Trajectory SHALL measure elapsed time over every
+served work item, never the rendered selection (POC-REQ-042), as four
+independent measures, each with its coverage, "n of m" items, stated beside
+it: (1) lead time, closed items from created to closed instant; (2) age,
+non-closed items from created instant to the observation's capture instant
+(`workItems.capturedAt`), never a render-time clock (POC-REQ-041); (3)
+arrivals per ISO 8601 week in UTC, by created instant; and (4) closures per
+ISO 8601 week in UTC, by closed instant. Lead time and age SHALL be the
+median and the 90th percentile by nearest rank, in whole hours rounded
+down; with no item covered each SHALL be stated not measurable, never 0.
+An item whose needed instant is missing, invalid, written without a
+timezone, or reversed (a closed instant before its created instant, or a
+created instant after the capture instant) SHALL be counted in the
+denominator and not covered, never dropped. Every week from the first to
+the last covered event SHALL be listed, a week with none an observed 0.
+The measures SHALL declare their source (the tracker's recorded instants)
+and evidence class (observed), and no element SHALL combine two measures
+into one number (RFC8-18). The page SHALL draw them as charts, one unit per
+axis (counts per week; hours), each with a title, labelled axes and a text
+alternative, using no script, and SHALL give every number a chart draws in
+a table, each cell equal to the machine answer
+(`trajectory.timeMeasures`). The cost answer (POC-REQ-044) SHALL stay
+Unknown for every other cost and point at these measures.
+
+- **Scope.** the elapsed-time region of Trajectory and
+  `trajectory.timeMeasures`. Effort, compute, token, money and
+  blocked-time costs, cycle time and any history of status changes are
+  outside it.
+
+- **Case**: a checker serves closed items with a 48-hour and a 12-hour
+  lead time, a closed item with a timezone-less created instant, a closed
+  item closed before it was created, and two open items 48 and 12 hours
+  old at the capture instant, spanning ISO weeks 31 to 35 of 2026; it
+  renders the page at two wall-clock times; separately it measures weeks
+  across a year change.
+- **Observable**: the four measures, each with its covered and total
+  counts; the weekly rows; the two charts' titles, axis labels and text
+  alternatives; both renders' bytes.
+- **Oracle**: lead time 2 of 4 covered, median 12 and p90 48 hours; age 2
+  of 2, median 12 and p90 48; arrivals 5 of 6; closures 2 of 4; five weekly
+  rows W31 to W35 with W33 and W34 at 0; each table cell equals the machine
+  answer, and a mutated cell is named; the two renders are byte-equal; ISO
+  week names equal the checker's own calendar (2027-01-01 is 2026-W53).
+  Equality decides.
+- **Oracle independence**: expected values are computed by hand from the
+  checker's fixture instants, and ISO weeks by an independent calendar,
+  never by the module under test.
+- **Falsifier**: a measure without its coverage; an uncovered item dropped
+  from a denominator or counted as 0 hours; an age measured to a render-time
+  clock; a week missing between covered events; two units on one axis; a
+  chart number absent from the tables or unequal to the machine answer; a
+  composite of two measures; or cost rendered as known.
+
+#### Scenario: Elapsed time with partial coverage
+
+- **WHEN** four closed items are served, two with valid instants (48 and 12
+  hours), one with a timezone-less created instant and one closed before it
+  was created, and two open items 48 and 12 hours old at the capture instant
+- **THEN** lead time is covered for 2 of 4, median 12 and p90 48 hours; age
+  for 2 of 2, median 12 and p90 48 hours; and the tables equal the machine
+  answer
+
+#### Scenario: No covered item
+
+- **WHEN** no closed item has valid created and closed instants
+- **THEN** lead time is stated not measurable with 0 of its total covered,
+  never 0 hours
+
+```yaml
+warrants:
+  primary: VIS-2
+  doctrine: [VIS-2, VIS-6]
+  contracts: [RFC8-18, RFC8-19, RFC2-3, RFC6-22]
+  policies: []
+  decisions: []
+  topology: []
+  parent_requirements: [POC-REQ-041, POC-REQ-044]
+```
+
 ### Requirement: POC-REQ-050 — Orrery projects declared mappings deterministically
 
````
