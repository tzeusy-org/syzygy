# Semantic delta T8 — Every served work item is reachable on Trajectory

**Artifact(s):** `openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md`;
`openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md`; generated `openspec/changes/three-surface-poc-experience/GOVERNING-DEPENDENCIES.md`.
**Stable IDs affected:** POC-REQ-042 (Required behavior, Scope, Case,
Observable, Oracle, Oracle independence, Falsifier, one new Scenario, and
RFC8-23 added to its warrants); CONTRACT-COVERAGE: RFC8-23's row
"Unknown-provenance items outside Trajectory's rendered selection are
filterable" turns covered; the Part A totals.
**Change class:** Normative (an amended requirement).
**Author:** agent lane `coordinator:claude-20261122-81840bd5`, bead
`syzygy-t3jk.18` (Trajectory pursuit move T8, slice S1).
**Date:** 2026-11-22

## Current meaning

POC-REQ-042 asks Trajectory to declare its selection rule and the counts
inside and outside it. Nothing lets a reader reach an item outside the
selection: the owner's page renders 250 of 10,971 items and the other
10,721 cannot be reached (pursuit report
`docs/pursuits/2026-11-21-trajectory-vision-pursuit.md`, move T8). The
route ignores its query; the only narrowing is a CSS checkbox over
rendered cards (POC-REQ-014). CONTRACT-COVERAGE holds RFC8-23's
outside-the-selection filtering limb Unknown.

## Proposed meaning

POC-REQ-042 keeps its declaration and adds reach. The route accepts a
closed parameter set: `status` (one of the seven tracker statuses),
`governing-intent=unknown` (items carrying POC-REQ-014's Unknown) and
`page` (a positive integer). Any parameter gives a view: matching items in
ascending id, one page of a declared fixed size (250), its scope statement
naming the page, page count and matching count, rendered plus excluded
equal to the total. No parameter gives the default selection. Another
name, a repeated name, a value outside its set, a non-integer page or a
page past the last is refused with HTTP 400 naming the parameter, reason
and allowed set. Every page links, by real anchors outside any collapsed
element and reachable by keyboard, to the default selection, every item by
id, each status and the governing-intent Unknown with their
whole-population counts, and the previous and next page. The machine
answer takes no parameter and declares the parameter set, page size and
order (`trajectory.narrowing`).

## What explicitly does NOT change

- The default selection's rule, the five answers, the elapsed-time
  measures and the notices: answers and measures stay over every served
  item on every view.
- No new tracker read; no title (SEC-5); no narrowing by item type
  (`syzygy-z5ls`), no grouping by parent (move T4), no free-text search,
  no script or client fetch. The POC-REQ-014 checkbox keeps working on
  every page.
- `GET /api/poc` takes no parameter: its response identity and ETag are
  unchanged in form.
- No new kind of Unknown subject: the governing-intent and verification
  card marks keep the board-level reference form `syzygy-t3jk.15`
  settled. The one per-item twin that remains, the worker-change
  verification disclosure, now exists whenever its bead is a served item
  (it used to need the default selection to hold it), since a view page
  may render that card.
- RFC8-23's other rows (pooling, ingest rejection, warrant edits,
  orphaned work) stay Unknown.

## Choices the review may contest

- **Decision 1, machine parity.** The machine answer is not
  parameterized: it already serves every item in `workItems.items`, and
  `trajectory.narrowing` declares the parameter set, page size and order,
  so a checker recomputes any page with its own formula (the form
  POC-REQ-041's oracle uses). Parameterizing `/api/poc` would have to vary
  its response identity and ETag per view.
- **Decision 2, per-item Unknown twins.** None are added for the card
  marks outside the default selection; each refers to its one
  board-level disclosure, which exists on every view. The worker-change
  verification twin is the exception: it is derived over served items,
  not the default selection, so its card renders on any view page.
- **Ascending id, not recency,** orders a view: stable across
  observations of one population and recomputable without the selection's
  time ranking.
- **Page size 250** keeps the largest page of the 640-item test fixture
  at about 427 KB (about 1.5 KB per fixture card, none with a
  worker-change badge), under half of the 2,097,152-byte human ceiling.
- **An Unknown population** renders the Unknown board for a well-formed
  view: with no served item there is no view and no last page to refuse.
- **The cross-surface link census** in `surface-routes.test.ts` excludes
  `.view-nav` as it excludes `.site-nav`: its links go to the same surface.
- **Combined parameters** intersect (`status` with `governing-intent`);
  the bead names each, and the intersection needs no extra rule.

## Machine-answer change

`trajectory.narrowing` on the observed projection: `parameters`
(`status`, `governing-intent`, `page`), `pageSize`, `order`, `view` (null
on the served default; a view's request, `matching` and `pageCount` on a
rendered view). `unknownSubjects` carries the worker-change verification
twin whenever its bead is a served item, also when the default selection
leaves it out.

## Warrant

VIS-2 (a population is never silently invisible); RFC8-23 ("filterable"
Unknown-provenance work, outside the rendered selection); RFC2-6, RFC6-14,
RFC6-16, RFC6-17, RFC6-22, RFC6-23 (as before). An agent adoption under
VIS-4 as amended by D10; nothing here is owner-class.

## Evidence or decision basis

- `trajectory-view.test.ts`: parsing and every refusal with literal
  bodies; over 640 items, every item on exactly one page of the
  unnarrowed view (three pages) and of each status view; the
  governing-intent pages hold exactly the 426 Unknown items; a combined
  view's counts and declaration; an empty status renders page 1 empty.
- `trajectory.test.ts` "Trajectory views": the same partition through the
  route; a page recomputed from the machine answer item for item and count
  for count; five refusals at HTTP 400; links on the direct and tailnet
  paths, outside details, followed to page 2; page bytes.
- `trajectory-narrowing.browser.test.ts`: Tab reaches each of the twelve
  view links on page 2, visible and outside details.
- Nine rule-6 mutants (page-past-end bound, page slice, intent filter,
  repeated name, page grammar, unknown name, the 400 status, the next
  link, a details element in the nav) each fail the suite.

## Downstream impact

Method: `git grep` over `apps/`, `packages/` and `scripts/` for
`renderTrajectoryPage`, `humanSurfaceRoutes`, `TrajectoryProjection`
constructions and link censuses. Changed: `routes.ts` (the human route
passes its query and returns 400 on a refusal), `surface-routes.test.ts`
(census excludes `.view-nav`), `docs/THREE-SURFACE-POC.md` (the views).
The status-marker fragment `pwb-mutation-sweep.ts` hard-codes is
unchanged. R3 of `scripts/check_spec_reconciliation.py` reads the new
Scenario from its adoption row (POC 28/42 → 28/43); `census.json`
regenerated.

## Migration / supersession plan

One pull request; adoption by an `AGENT-ADOPTIONS.md` row in a second
commit naming the change commit and both decisions; tag
`three-surface-poc-views-amendment-v1.0` after merge.

## Review

**Required class:** one fresh-context review (CC-REV-1; one round, not
gating). **Reviewer and verdict:** the retained raw named in the pull
request.

## Exact text

````diff
diff --git a/openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md b/openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md
index 24c246f1f..8cb59387b 100644
--- a/openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md
+++ b/openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md
@@ -186,5 +186,5 @@ exhausted — a reviewer who finds an unlisted limb has found a real gap.
 | RFC8-22 | Everything downstream of a broken link renders with provenance degraded accordingly | **Unknown** — Amendment row; the POC renders no link downstream of the work item, and no requirement observes degraded downstream provenance | — |
 | RFC8-23 | A work item with no traceable warrant renders Unknown-provenance: counted over the served set, filterable within Trajectory's rendered selection, never green, its route resolvable by supplying a warrant stated beside the count | covered — Amendment row; the oracle decides the count, the narrowed board over the rendered selection, the Unknown encoding against POC-REQ-060's table, and the resolution statement by literal match; POC-REQ-044's fifth answer states the same count, n of N served | POC-REQ-014, POC-REQ-044 |
-| RFC8-23 | Unknown-provenance items outside Trajectory's rendered selection are filterable | **Unknown** — Amendment row; POC-REQ-042 lets Trajectory render a selection, so items outside it are counted on Trajectory but not rendered, and no requirement observes filtering them | — |
+| RFC8-23 | Unknown-provenance items outside Trajectory's rendered selection are filterable | covered — Amendment row (views); `governing-intent=unknown` pages every item carrying the Unknown in ascending id, each page linked with its count, and the oracle checks the pages hold exactly those items. Was Unknown | POC-REQ-042 |
 | RFC8-23 | Unknown-provenance work is never silently pooled into warranted work | **Unknown** — Amendment row; no served item is warranted, so the oracle has no warranted population to keep it apart from | — |
 | RFC8-23 | Unknown-provenance is never an ingest rejection | **Unknown** — Amendment row; POC-REQ-014's denominator is the served set, so an item dropped before serving is invisible to its oracle | — |
@@ -246,6 +246,6 @@ exhausted — a reviewer who finds an unlisted limb has found a real gap.
 
 Part A totals `[Observed, computed by the sweep in "Verifying this
-table"]`: **171 consequence rows over 86 clauses — 122 covered,
-49 Unknown.**
+table"]`: **171 consequence rows over 86 clauses — 123 covered,
+48 Unknown.**
 
 **Amendment disclosure — the RFC1-26 closure row (ruling P-75 Q3).**
diff --git a/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md b/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md
index 653563bd5..18df480f2 100644
--- a/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md
+++ b/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md
@@ -1027,17 +1027,51 @@ Group: Trajectory. Form: **invariant**.
 population it renders (its selection rule) and the counts inside and outside
 that selection, so an excluded-item population is never silently invisible.
-
-- **Scope.** the rendered scope statement against the full observed item set.
+Every served item SHALL be reachable: the route SHALL accept a closed
+parameter set, `status` (one of the seven tracker statuses of POC-REQ-040),
+`governing-intent=unknown` (the items carrying POC-REQ-014's governing-intent
+Unknown) and `page` (a positive integer), and any of them SHALL give a view
+of the matching items in ascending item id, one page of a declared fixed
+size, whose scope statement names the page, the page count and the matching
+count. No parameter SHALL give the default selection. Any other name, a
+repeated name, a value outside its set, a page that is not a positive
+integer, or a page past the last SHALL be refused with HTTP 400 naming the
+parameter, the reason and the allowed set, never ignored. When the
+work-item population is Unknown, a well-formed view SHALL render the
+Unknown board, since no served item gives a view or a last page. Every page SHALL
+link, by real anchors outside any collapsed element and reachable by
+keyboard, to the default selection, every item by id, each status and the
+governing-intent Unknown with their whole-population counts, and the
+current view's previous and next page. The machine answer SHALL take no
+parameter and SHALL declare the parameter set, the page size and the order
+(`trajectory.narrowing`), so any page is recomputable from
+`workItems.items`.
+
+- **Scope.** the rendered scope statement against the full observed item
+  set; the route's parameters, refusals and view links.
 
 - **Case**: a checker loads Trajectory over a database whose total item
-  count exceeds the rendered selection.
+  count exceeds the rendered selection; then, over 640 items (three pages),
+  loads every page of the unnarrowed view, every status view and the
+  governing-intent view, a page recomputed from the machine answer, five
+  refused requests, and the view links on the direct and the tailnet path.
 - **Observable**: the surface states the selection rule, the rendered
-  count, and the excluded count.
+  count, and the excluded count; each view's cards and counts; each
+  refusal's status and reason; the links and their keyboard reach.
 - **Oracle**: rendered count + excluded count equals the total count
-  read directly from Dolt at the served revision; arithmetic decides.
+  read directly from Dolt at the served revision; every served item appears
+  on exactly one page of the unnarrowed view and of its status view, and the
+  governing-intent pages hold exactly the items carrying that Unknown; a
+  page's cards and counts equal the checker's own slice of
+  `workItems.items` (filter, ascending id, page size); `type=bug`,
+  `status=done`, `page=0`, `page=1.5` and a page past the last each return
+  400 with that reason; the links equal the expected list on both paths and
+  Tab reaches each. Arithmetic and equality decide.
 - **Oracle independence**: the total comes from a direct database
-  count.
+  count; expected pages are the checker's own slices of the machine answer.
 - **Falsifier**: a board whose counts do not reconcile with the
-  database total, or no visible scope statement.
+  database total, or no visible scope statement; a served item on no page
+  or on two; a parameter outside the set ignored rather than refused; a
+  view link missing, inside a collapsed element or unreachable by keyboard;
+  or a page the machine answer cannot reproduce.
 
 #### Scenario: Bounded board over a large history
@@ -1048,9 +1082,16 @@ that selection, so an excluded-item population is never silently invisible.
   are outside it, and the three numbers reconcile
 
+#### Scenario: Every item reachable by state and page
+
+- **WHEN** 640 items are served and the reader follows the view links
+- **THEN** each item appears on exactly one page of the unnarrowed view
+  and of its status view, every page states its scope and counts, and a
+  parameter outside the declared set is refused with 400 and its reason
+
 ```yaml
 warrants:
   primary: VIS-2
   doctrine: [VIS-1, VIS-2, VIS-3]
-  contracts: [RFC2-6, RFC6-14, RFC6-16, RFC6-17, RFC6-22, RFC6-23]
+  contracts: [RFC2-6, RFC6-14, RFC6-16, RFC6-17, RFC6-22, RFC6-23, RFC8-23]
   policies: []
   decisions: [POC-DIR-2026-08-30]
````

## Dispositions

Review R-T8-VIEWS-1 (`docs/reviews/R-T8-VIEWS-1-RAW.md`), verdict
`REVISE` over commit `c5e0a0dcd`. One round, not gating (D13); each
finding repaired once in the commit after it.

1. **Blocking: a view page holding the worker-change item threw.**
   Taken. `deriveUnknownSubjects` now derives the worker-change
   verification twin whenever the bead is a served item, not only when
   the default selection holds it. Decision 2 and "What explicitly does
   NOT change" reworded. New test: 210 newer items push the worker-change
   bead out of the default selection, and its `status=in_progress` page
   renders the card, badge, disclosure and route on the direct and the
   tailnet path. The old condition fails that test (2 failed).
2. **Should-fix: views over an Unknown population were silently
   ignored.** Taken as a declared rule: POC-REQ-042 now says a
   well-formed view over an Unknown population renders the Unknown
   board. Core test added.
3. **Note: a page of ten or more digits got the wrong reason.** Taken.
   The page grammar accepts any length, and `page=99999999999` is
   refused as `page-past-end` (core test).
4. **Note: the size figure drifts and was measured on fixture cards.**
   Taken. The docs and the delta now say about 427 KB on the 640-item
   fixture's cards, none with a worker-change badge.
5. **Note: the `.view-nav` census exclusion is broader than needed.**
   No change. The route test already pins the nav's whole href list on
   both paths, so a cross-surface link added there fails it.
6. **Note: keyboard reach on the direct path only; route refusals omit
   the repeated name.** Taken. The browser test runs on both mount
   prefixes, and the route cases include `status=open&status=closed`.
7. **Note: parity holds.** No change needed.
