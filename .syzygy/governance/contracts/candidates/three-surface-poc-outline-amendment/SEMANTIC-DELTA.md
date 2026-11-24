# Semantic delta T4 S2 — Trajectory groups work items by parent

**Artifact(s):** `openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md`;
`openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md`; generated `openspec/changes/three-surface-poc-experience/GOVERNING-DEPENDENCIES.md`.
**Stable IDs affected:** POC-REQ-042 (Required behavior: the `group`
parameter, a new "Grouped by parent" paragraph and the grouped-view link;
Scope; Falsifier; one new Scenario; RFC8-15 and RFC8-30 added to its
contracts and POC-REQ-062 to its parent requirements); POC-REQ-062 (the
edge-type sentence and Scope: `parent-child` rows now feed POC-REQ-042's
parent facts); CONTRACT-COVERAGE: the RFC8-15 and RFC8-30 rows gain the
grouped-view limb and POC-REQ-042. The Part A clause set and totals do not
change (both clauses were already mapped).
**Change class:** Normative (an amended requirement).
**Author:** agent lane `coordinator:claude-20261122-81840bd5`, bead
`syzygy-t3jk.20` (Trajectory pursuit move T4, slice S2; also move T8's
second slice).
**Date:** 2026-11-24

## Current meaning

POC-REQ-062 (`syzygy-t3jk.19`) reads the tracker's dependency rows at the
work-item revision and derives eligibility from `blocks` rows only;
`parent-child` rows are counted by type and nothing else. Its Scope
excludes "parent grouping" and "changed trajectory selection parameter".
POC-REQ-042 offers views by status, governing-intent Unknown and page, each
in ascending item id. A reader cannot see which items belong to which epic
or parent: the board is a flat list of identifiers (pursuit report
`docs/pursuits/2026-11-21-trajectory-vision-pursuit.md` at `db0fed1d9`,
moves T4 and T8).

## Proposed meaning

POC-REQ-042's closed parameter set gains `group=parent`. It groups the
matching items, which are the non-closed served items unless `status`
names a status, closed included, under their parents. A parent is the
`depends_on_issue_id` of an item's `parent-child` row, read by
POC-REQ-062's read under its identifier rules. An item sits under each
served parent, once per parent. Items whose parent row names an external
item, a wisp or another prefix sit under "parent outside this tracker",
counted and never named. Items whose in-prefix parent is not served sit
under "parent not served". Items with none of these sit under "no parent
recorded". When the dependency read is Unknown, every item sits under one
"parent Unknown" group that states the reason. Parent groups come first by
ascending parent id, then the four classes in that order; items are in
ascending id. The page size counts positions, and `trajectory.narrowing`
declares the grouped order and its page unit.

Each parent heading names the parent with its tracker status as recorded
and links to the parent's card and to the groups the parent sits under. It
states the group's whole count and its count on the page, and marks a group
split across pages at both ends with a link. A parent in a cycle is stated
once, with its members, in its first member's group; the other members'
groups link there; the cycle is not followed. Parent-group and class
element ids cannot collide. No group states
completion, progress or a percentage, and a closed parent with open items
shows both as recorded (RFC8-15, RFC8-30). An item rendered twice on one
page carries its fragment target once. The machine answer carries the
parent facts once, as `trajectory.outline`, so any grouped page is
recomputable. Every page links to the grouped view with its count.
POC-REQ-062 says that `parent-child` rows feed those facts.

## What explicitly does NOT change

- The default selection. The bead (`syzygy-t3jk.20`) asked that the
  default view group by parent; this amendment adds the grouped view as a
  declared view and leaves the default as POC-REQ-042 states it, because
  the default page is pinned by literal-denominator oracles across five
  test files and the five answers' region. Making the grouped view the
  default is a further amendment, filed as `syzygy-t3jk.22`.
- No new tracker read: the parent facts come from the same statement
  POC-REQ-062 runs, with the same columns.
- Eligibility, its counts, the blocked cause set and blocker links.
- No type narrowing (`syzygy-z5ls`), no title (SEC-5), no rollup of
  children into a parent state.

## Choices the review may contest

1. **Grouped view, not grouped default.** Above. The cost is that a reader
   follows one link to see the outline. The benefit is that no existing
   oracle changes meaning in this slice.
2. **One level per group, nesting by link.** Each group lists a parent's
   direct items; deeper nesting is navigated through "the parent sits
   under" links rather than drawn as an indented tree. A tree of 10,971
   items cannot fit one page, and a paged tree would split subtrees in
   ways a reader cannot follow. Each group is a list with a heading, so it
   is its own text equivalent.
3. **Positions, not items, are paged.** An item with two parents takes two
   positions so that every group is complete across pages; the scope
   sentence states the position total beside the item counts.
4. **Closed parents still group.** A closed parent's open items group
   under it; the heading says the parent is closed and that neither status
   is read as the other's completion.
5. **The "under" link targets the parent's parent group in this view when
   it exists, else the grandparent's card on its all-items page.** A
   grandparent group may be absent from a view (for example when the
   parent is closed and the view leaves closed items out).

## Machine-answer change

`trajectory.outline` is added to the observed projection: `{kind:
'observed', parents, outsideTracker, unobserved, cycles}` or `{kind:
'unknown', reason}`. `trajectory.narrowing.parameters` gains `group:
['parent']` and every view request gains `group`. Item identifiers outside
the prefix never appear (a test asserts the serialized projection lacks
them).

## Warrant

VIS-2 and VIS-3 (a navigable account a reader can follow); V0's
"navigable dependency graph" as the pursuit report quotes it; RFC8-15 and
RFC8-30 (closure is never completion, now also at parent level); RFC8-23
and the RFC2/RFC6 clauses as before. An agent adoption under VIS-4 as
amended by D10; nothing here is owner-class (no new column, no title, no
write).

## Evidence or decision basis

- `trajectory-outline.test.ts` (new, 14 tests after the review repairs): the outline over a
  fixture three deep, with a two-parent item, a closed parent, a two-item
  cycle, an out-of-prefix parent, an external parent, an unserved
  in-prefix parent and a closed child; no foreign identifier in the
  serialized projection; a 20,000-item chain plus a self-parent without
  exhausting the stack; the Unknown outline; group order, totals and
  members; parent facts; closed items only with `status=closed`; the
  Unknown group; a grandparent with no group linked to its card on page 2; 640 positions over three pages against the test's own
  grouping, with split groups marked at both ends; a refused group value.
- `trajectory.test.ts` "grouped by parent" (8 tests after the review
  repairs): group regions in order, the two-parent card twice with one
  fragment target, every element id distinct, no foreign parent named;
  two renders byte-equal; parent heading and "sits under" links; no
  verdict words in any group region (population: the six group regions
  outside their cards); a cycle stated once; split-group marks with their
  counts; the page's groups and members equal the test's own grouping of
  the served machine answer; the navigation link on both paths; the
  Unknown group with its reason.
- `trajectory-narrowing.browser.test.ts`: on both paths, Enter on the
  "continues on page 2" link, reached by Tab, lands on the split group's heading
  on page 2, and the "sits under" link lands on the grandparent's group;
  the view-link keyboard sweep now reaches thirteen links.
- Four rule-6 mutants each fail the suite: closed items admitted to the
  grouped view (3 tests), the no-parent class ignoring outside and
  unobserved parents (1), every duplicate card anchored (1), and the
  continued-from mark dropped (1); after the review, a continued-from
  mark on every later-page group and a cycle stated in every member's
  group each fail one test.

## Downstream impact

Method: `git grep` over `apps/`, `packages/` and `scripts/` for
`TrajectoryViewRequest`, `narrowing`, `parentFacts`, `group=` and the view
link census. Changed: `work-item-dependencies.ts` (parent facts from the
same rows), `trajectory-projection.ts` (outline, grouped view, the
parameter), `trajectory.ts` (the grouped page and its link),
`trajectory-view.test.ts` and `work-items.test.ts` (literal shapes gain
`group` and `parentFacts`), `trajectory.test.ts` (view link list and
declared parameters), `trajectory-narrowing.browser.test.ts` (link list),
`docs/THREE-SURFACE-POC.md` (a "Grouped by parent" paragraph). R3 of
`scripts/check_spec_reconciliation.py` reads the new Scenario from its
adoption row (POC 42: one more); `census.json` regenerated.

## Migration / supersession plan

One pull request; adoption by an `AGENT-ADOPTIONS.md` row in a second
commit naming the change commit; tag
`three-surface-poc-outline-amendment-v1.0` after merge. A follow-up bead
makes the grouped view the default selection.

## Review

**Required class:** one fresh-context review (CC-REV-1; one round, not
gating). **Reviewer and verdict:** the retained raw named in the pull
request.

## Exact text

````diff
diff --git a/openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md b/openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md
index 8f34cf67d..ee7a26861 100644
--- a/openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md
+++ b/openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md
@@ -181,7 +181,7 @@ exhausted — a reviewer who finds an unlisted limb has found a real gap.
 | RFC7-34 | Disclosure paths operable without a pointing device | covered | POC-REQ-061, POC-REQ-022 |
 | RFC8-2 | Beads closure/activity never rendered as done/green/complete | covered — Anti-thesis limb (b) matches directly, including its wording: closure is headed "Closed", never a word for done (POC-REQ-043 wording limb); limb (a) [no editable store — POC never writes] and limb (c) [fleet-change/cost/authority accounting] aren't touched by POC scope, so only (b) rows here | POC-REQ-043 |
 | RFC8-12 | Kanban state field renders only a declared, closed set of status values — no minted/free-form values | covered — POC's "declared closed status-vocabulary mapping" exercises the closed-vocabulary/no-minting invariant; the specific 13-value partition, chain-state field separation, and `reconciled` carve-out aren't adopted since Trajectory renders no reconciliation chain state | POC-REQ-040 |
-| RFC8-15 | Closure without a merge/verification fact never rendered as a normalized "done"/complete/finished/resolved label | covered — Matches the terminal-state closure-fallacy rule (`closed-unmerged` analog) this clause states directly; the wording limb forbids done/complete/finished/resolved on every heading, label and served column value | POC-REQ-043 |
+| RFC8-15 | Closure without a merge/verification fact never rendered as a normalized "done"/complete/finished/resolved label | covered — Matches the terminal-state closure-fallacy rule (`closed-unmerged` analog) this clause states directly; the wording limb forbids done/complete/finished/resolved on every heading, label and served column value; amendment row (grouped view): a closed parent's group shows the parent closed and its items' own statuses, and no group heading reads either as the other's completion | POC-REQ-042, POC-REQ-043 |
 | RFC8-22 | The unestablished first link of the chain, work item to warrant, renders Unknown with its RFC2-24 reason, never silently skipped | covered — Amendment row | POC-REQ-014 |
 | RFC8-22 | A join is never reconstructed by similarity, interpolation or inference | covered — Amendment row; the fixture-title counterexample observes the title case | POC-REQ-014 |
 | RFC8-22 | Everything downstream of a broken link renders with provenance degraded accordingly | **Unknown** — Amendment row; the POC renders no link downstream of the work item, and no requirement observes degraded downstream provenance | — |
@@ -196,7 +196,7 @@ exhausted — a reviewer who finds an unlisted limb has found a real gap.
 | RFC8-24 | Unknown aggregation follows RFC2-24's rendering rule: the governing-intent Unknowns aggregate to one count, disclose their reason count, and expand to their members within Trajectory's rendered selection | covered — Amendment row; one reason, so the served count is that reason's count; the narrowed board is the expansion over the rendered selection. Since syzygy-t3jk.15 the verification Unknowns aggregate the same way, to one board notice with served, inside and outside counts, its reason and route, each card keeping a mark that refers to it | POC-REQ-014, POC-REQ-043 |
 | RFC8-24 | The rest of the aggregation rule: expansion to members outside Trajectory's rendered selection, and the full RFC6-17 disclosure the rendering rule cites (per-label, per-tier, per-freshness counts, the equivalence tuple) for this aggregate | **Unknown** — Amendment row; no requirement observes either for the governing-intent count | — |
 | RFC8-24 | These are claim reasons only: the normalized state's four absence values take no reason, are counted separately, and are never absorbed by an aggregate of Unknowns | **Unknown** — Amendment row; Trajectory renders no RFC8-12 normalized state with absence values, so no requirement observes the separation | — |
-| RFC8-30 | No aggregate, badge, progress bar, or prose sentence renders closed work as done/complete/satisfied absent verification evidence | covered — Same closure-fallacy prohibition restated at module-3 level, and the standing closure notice states closed counts with verification Unknown, never a done sentence; disclosed fold — RFC8-2(b), RFC8-15, and RFC8-30 all map to the same one POC requirement from three angles | POC-REQ-043 |
+| RFC8-30 | No aggregate, badge, progress bar, or prose sentence renders closed work as done/complete/satisfied absent verification evidence | covered — Same closure-fallacy prohibition restated at module-3 level, and the standing closure notice states closed counts with verification Unknown, never a done sentence; disclosed fold — RFC8-2(b), RFC8-15, and RFC8-30 all map to POC-REQ-043 from three angles; amendment row (grouped view): no group heading states its parent's completion, progress or a percentage | POC-REQ-042, POC-REQ-043 |
 | RFC8-31 | Every rendered state/cause/absence value recoverable by text alone (no colour/position-only encoding); every traversal keyboard-operable | covered — Non-visual-parity limb matches the design-token/epistemic-encoding and accessibility-floor requirements directly; the RFC 0006 selection/drawer/scenario-context conformance bundle this clause also invokes is not touched (no drawer/selection UX in the POC-REQ list), so that limb is omitted rather than rowed | POC-REQ-060, POC-REQ-061 |
 | RFC9-1 | Map surface is a non-authoritative projection of the shared fact model | covered — POC's Orrery projects the same shared fact model that parity (020) enforces; intended/proposed/historical planes and RFC2/RFC6 vocabulary limbs not touched | POC-REQ-020 |
 | RFC9-3 | Every rendered encoding traceable to an identified/declared artifact, reachable from the element | covered — No relationship/encoding beyond declared mappings; the surface-local "shared drawer" mechanism itself isn't built | POC-REQ-050, POC-REQ-052, POC-REQ-053 |
diff --git a/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md b/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md
index 8d21c3c9d..b615b3b27 100644
--- a/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md
+++ b/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md
@@ -1029,25 +1029,62 @@ that selection, so an excluded-item population is never silently invisible.
 Every served item SHALL be reachable: the route SHALL accept a closed
 parameter set, `status` (one of the seven tracker statuses of POC-REQ-040),
 `governing-intent=unknown` (the items carrying POC-REQ-014's governing-intent
-Unknown) and `page` (a positive integer), and any of them SHALL give a view
-of the matching items in ascending item id, one page of a declared fixed
-size, whose scope statement names the page, the page count and the matching
-count. No parameter SHALL give the default selection. Any other name, a
+Unknown), `group=parent` and `page` (a positive integer), and any of them SHALL give a view
+of the matching items in ascending item id (with `group=parent`, in the
+grouped order below), one page of a declared fixed size, whose scope
+statement names the page, the page count and the matching count. No parameter SHALL give the default selection. Any other name, a
 repeated name, a value outside its set, a page that is not a positive
 integer, or a page past the last SHALL be refused with HTTP 400 naming the
 parameter, the reason and the allowed set, never ignored. When the
 work-item population is Unknown, a well-formed view SHALL render the
 Unknown board, since no served item gives a view or a last page. Every page SHALL
 link, by real anchors outside any collapsed element and reachable by
-keyboard, to the default selection, every item by id, each status and the
-governing-intent Unknown with their whole-population counts, and the
-current view's previous and next page. The machine answer SHALL take no
-parameter and SHALL declare the parameter set, the page size and the order
+keyboard, to the default selection, every item by id, each status, the
+governing-intent Unknown and the grouped view with their whole-population
+counts, and the current view's previous and next page. The machine answer
+SHALL take no parameter and SHALL declare the parameter set, the page size,
+the order, and the grouped order and its page unit, `position`
 (`trajectory.narrowing`), so any page is recomputable from
-`workItems.items`.
+`workItems.items` and `trajectory.outline`.
+
+**Grouped by parent.** `group=parent` SHALL group the matching items by
+parent, where the matching items are the non-closed served items unless
+`status` names a status, closed included. An item's parents are the
+`depends_on_issue_id` of its `parent-child` rows, read by POC-REQ-062's
+same-revision dependency read and its identifier rules. The machine answer
+SHALL carry them once, as `trajectory.outline`: each served item's served
+parents, the items whose parent row names an external item, a wisp or
+another prefix, the items whose in-prefix parent is not served, and every
+set of served items whose parent links form a cycle; or, when that read is
+Unknown, the read's reason. An item SHALL sit under each served parent it
+has, once per parent; under "parent outside this tracker" for a parent row
+that names an external item, a wisp, another prefix or no target, and under
+"parent not served" for an in-prefix parent the observation did not serve; under "no parent recorded" when it has none of
+these; and, when the read is Unknown, every item SHALL sit under one
+"parent Unknown" group that states the reason. A parent outside the tracker
+or not served SHALL be counted and never named. Parent groups SHALL come
+first in ascending parent id, then those four groups in that order, and
+items in ascending id within a group; the page size counts positions, so
+an item under two parents takes two, and the view SHALL state the position
+total and that an item with several parents sits under each. A group's
+heading SHALL name its parent with the parent's tracker status as recorded,
+link to the parent's card and to the groups the parent itself sits under
+(to that parent's card on its all-items page when it has no group in this
+view),
+state the group's whole count and its count on this page, and mark a group
+split across pages at both ends with a link to the other page. A cycle
+SHALL be stated once, with its members, in the group of its first member in
+the grouped order; each other member's group SHALL link to that statement,
+and the cycle SHALL NOT be followed. Element ids of parent groups and of the
+four classes SHALL NOT collide, whatever an item's identifier. A closed parent with non-closed items, or the reverse, SHALL be
+shown as recorded: no group states completion, progress or a percentage of
+its parent (RFC8-15, RFC8-30). An item rendered twice on one page SHALL
+carry its fragment target once. The default selection is unchanged by this
+parameter; making the grouped view the default is a further amendment.
 
 - **Scope.** the rendered scope statement against the full observed item
-  set; the route's parameters, refusals and view links.
+  set; the route's parameters, refusals and view links; the grouped view and
+  `trajectory.outline`.
 
 - **Case**: a checker loads Trajectory over a database whose total item
   count exceeds the rendered selection; then, over 640 items (three pages),
@@ -1070,9 +1107,13 @@ parameter and SHALL declare the parameter set, the page size and the order
   count; expected pages are the checker's own slices of the machine answer.
 - **Falsifier**: a board whose counts do not reconcile with the
   database total, or no visible scope statement; a served item on no page
-  or on two; a parameter outside the set ignored rather than refused; a
+  or on two of an ungrouped view; a parameter outside the set ignored rather than refused; a
   view link missing, inside a collapsed element or unreachable by keyboard;
-  or a page the machine answer cannot reproduce.
+  or a page the machine answer cannot reproduce; in the grouped view, a
+  non-closed item missing from a parent it has, a parent outside the tracker
+  named, a cycle followed past its members, a group stating its parent's
+  completion, a cycle stated twice, two elements sharing an id, or a split
+  group unmarked.
 
 #### Scenario: Bounded board over a large history
 
@@ -1081,6 +1122,18 @@ parameter and SHALL declare the parameter set, the page size and the order
 - **THEN** the surface states the selection rule and that 6,772 items
   are outside it, and the three numbers reconcile
 
+#### Scenario: Items grouped under their parents
+
+- **WHEN** a closed parent has two open items, one of them also sits under
+  a second parent, two items are each other's parent, one item's parent is
+  in another tracker and the reader opens `group=parent`
+- **THEN** the shared item appears under both parents with one fragment
+  target, the closed parent is shown closed with its items' own statuses,
+  the two-item cycle is stated once and not followed, the other tracker's
+  parent is counted under "parent outside this tracker" and never named,
+  and the groups' items equal the checker's own grouping of the machine
+  answer
+
 #### Scenario: Every item reachable by state and page
 
 - **WHEN** 640 items are served and the reader follows the view links
@@ -1092,11 +1145,11 @@ parameter and SHALL declare the parameter set, the page size and the order
 warrants:
   primary: VIS-2
   doctrine: [VIS-1, VIS-2, VIS-3]
-  contracts: [RFC2-6, RFC6-14, RFC6-16, RFC6-17, RFC6-22, RFC6-23, RFC8-23]
+  contracts: [RFC2-6, RFC6-14, RFC6-16, RFC6-17, RFC6-22, RFC6-23, RFC8-15, RFC8-23, RFC8-30]
   policies: []
   decisions: [POC-DIR-2026-08-30]
   topology: []
-  parent_requirements: []
+  parent_requirements: [POC-REQ-062]
 ```
 
 ### Requirement: POC-REQ-043 — Activity is never rendered as satisfaction
@@ -1788,7 +1841,7 @@ Group: Trajectory. Form: **state projection/query**.
 
 The dependency statement SHALL return exactly one distinguishable revision witness from Dolt resolving the same immutable revision as the table read, including when there are no dependency rows. The reader SHALL verify the witness before accepting the data. A request value echoed by the caller, a missing, extra or invalid witness, a mismatched revision, an unreadable response or an unexpected result shape makes the dependency observation unavailable. A valid witness with no edge rows makes the dependency set observed empty. The work-item observation and its substrate statuses retain their own epistemic states and their one served provenance record under POC-REQ-010.
 
-The dependent is `issue_id` and the target is `depends_on_issue_id`. The closed recognized edge types are `blocks`, `parent-child`, `discovered-from`, `related`, `relates-to` and `tracks`. Count their rows by type. Only `blocks` derives an eligibility fact in this slice. Count unlisted types in a separate total using a fixed diagnostic reason. Withhold their raw type values. Count external, wisp and out-of-prefix targets without rendering source values. A target may appear as a blocker identifier only when it passes the existing observed prefix check and exactly matches a served work item at that revision. The output shall disclose no additional tracker strings. Unreadable query output, new columns, titles, descriptions, notes, metadata values and external-reference text never enter either channel.
+The dependent is `issue_id` and the target is `depends_on_issue_id`. The closed recognized edge types are `blocks`, `parent-child`, `discovered-from`, `related`, `relates-to` and `tracks`. Count their rows by type. Only `blocks` derives an eligibility fact; `parent-child` rows derive only the parent facts POC-REQ-042's grouped view reads, under the same identifier rules. Count unlisted types in a separate total using a fixed diagnostic reason. Withhold their raw type values. Count external, wisp and out-of-prefix targets without rendering source values. A target may appear as a blocker identifier only when it passes the existing observed prefix check and exactly matches a served work item at that revision. The output shall disclose no additional tracker strings. Unreadable query output, new columns, titles, descriptions, notes, metadata values and external-reference text never enter either channel.
 
 For an observed dependency feed, a known blocker is the served target of a `blocks` edge whose observed tracker status is other than `closed`, where the row has neither the external nor the wisp flag. Deduplicate blocker identifiers. An unlisted edge type, external or wisp blocker, out-of-prefix blocker, or absent blocker status makes the applicable item's eligibility undetermined. Use a fixed reason for each applicable failure class and stable reason ordering if several apply. Count these rows even where their targets or raw types are withheld. A row with an unidentifiable dependent or a malformed input that prevents reliable row accounting makes the feed unavailable. No malformed record can create an observed-empty or ready result.
 
@@ -1808,7 +1861,7 @@ A derived `blocked` result and an observed tracker `blocked` status each require
 
 On Trajectory, each card SHALL show the derived eligibility where present, and any fixed reason. A card with a derived blocked result or a tracker `blocked` status SHALL show its cause set or cause-Unknown, and each of its known blocker identifiers SHALL link to its existing work-item card via the paging rules of POC-REQ-042. Links SHALL work without client script from the default and narrowed views on the direct and tailnet paths. Trajectory SHALL declare the served non-closed denominator, each of the four eligibility counts, and the count of records with absent eligibility so those figures reconcile. It SHALL likewise disclose dependency rows observed, each recognized type's count, unlisted type rows, and external, wisp, and out-of-prefix target counts. One dependency row may contribute to more than one target-withholding count. When the feed is unavailable the edge counts SHALL be unavailable with the fixed reason, preserving the observed work-item denominator. The machine answer SHALL carry the same facts and link identities from the one shared model.
 
-- **Scope.** An identified work-item evaluation and its same-revision dependency metadata, every served item's state, and the displayed totals and links over that exact population. No live tracker readiness call, source-body read, parent grouping, changed trajectory selection parameter, or derivation of PR, external-event or decision causes enters this slice.
+- **Scope.** An identified work-item evaluation and its same-revision dependency metadata, every served item's state, and the displayed totals and links over that exact population. No live tracker readiness call, source-body read, changed default selection, or derivation of PR, external-event or decision causes enters this slice.
 - **Case (fixture, counterexamples and sweep).** An independent checker supplies fixed work statuses and dependency rows at a captured revision A. A distinct revision B carries different rows. The checker exercises the complete table, witnessed empty, witnessed and unwitnessed refusal cases, unsupported types, missing/foreign targets, a known and a withheld blocker on the same item, and dependency read failure. The checker reads both channels, including a blocker on another page, and sweeps every relevant card and board count.
 - **Observable.** Fixed-column queries, source-returned revision witness, classified edge totals, four eligibility counts and absent count, item-local reasons, blocked-cause set, exact blocker card targets, and unchanged epistemic status for the work-item observation.
 - **Oracle.** Literal fixture expectations independently classify every included row and every served status, compare the complete wire counts and card outcomes, follow every blocker link, and check query shape, one exact source revision, and no dependency read when that revision cannot be established. A changed-only revision B may not affect results from A. Captured metadata values not admitted by the output alternatives are absent from both wire forms.
````

## Dispositions

Review R-T4S2-OUTLINE-1 (`docs/reviews/R-T4S2-OUTLINE-1-RAW.md`), verdict
`CONFIRM WITH EXCEPTIONS` over commit `19a5d40f5`: 0 blocking, 7
should-fix, 6 notes. One round, not gating (D13); each finding repaired
once in the commit after it, or answered here.

1. **Should-fix: parent anchors collided with class anchors.** Taken.
   A parent group's id is now `group-p-<id>`, a class's `group-<kind>`, and
   no kind begins `p-` (`groupAnchor`, exported and used by the renderer).
   New test: an item named `no-parent` under the prefix `no` keeps its own
   group beside the `no-parent` class. The page test now asserts every
   element id on the grouped page is distinct.
2. **Should-fix: raw anchor in `href`.** Taken. Every group fragment is
   URL-encoded and then HTML-escaped (`fragment()` in `trajectory.ts`).
3. **Should-fix: the cycle stated in every member's group.** Taken. A cycle
   is stated once, with its members, in the group of its first member in
   the grouped order; each other member's group links to that statement
   (`cycle: {members} | {statedUnder, page}`). The spec says so. A page test
   renders a two-member cycle and counts one statement; a mutant stating it
   in every member's group fails it.
4. **Should-fix: spec sentences the grouped view contradicts.** Taken. The
   view sentence now says "in ascending item id (with `group=parent`, in
   the grouped order below)"; the falsifier's "on no page or on two" is
   limited to an ungrouped view; `trajectory.narrowing` declares
   `groupedOrder` and `groupedPageUnit: 'position'`, and the spec names
   both.
5. **Should-fix: continuation marks under-tested.** Taken. The three-page
   test now checks the group list of every page and both marks of every
   group against the test's own placement; a mutant marking every group on
   a later page fails it. New tests: a group spanning three pages (marks
   1 and 3 on its middle page), and the page's rendered "Continues on" and
   "Continued from" sentences with their counts.
6. **Should-fix: no determinism test.** Taken. Two renders of one model,
   and a render of its JSON round trip, are byte-equal.
7. **Should-fix: cycle notes could breach the ceiling.** Taken by finding
   3's repair: a cycle's members are listed once per page at most, and the
   other members' groups carry one link each.
8. **Note: the verdict sweep's population.** Partly taken. The sweep now
   covers all six group regions of the fixture (headings, counts and
   notes: both cycle notes, the closed-parent note, the outside-tracker and
   no-parent notes) and adds `resolved` and `satisfied`. The
   parent-unobserved and parent-unknown notes are literal constants that
   the fixture does not render together; the Unknown group's note is
   asserted by literal in its own test.
9. **Note: a null parent target called "outside this tracker".** Taken as
   a spec statement: a parent row naming no target counts as outside this
   tracker (it names no served item, and its target cannot be named).
10. **Note: the "sits under" fallback was unstated.** Taken: the spec now
    says the link goes to the grandparent's card on its all-items page when
    the grandparent has no group in this view.
11. **Note: the parity test regrouped the serialized model, membership
    only.** Taken. It now reads the served `/api/poc` body (`servedAnswer`)
    and checks the group order as well as each group's members in order.
12. **Note: the browser test focused links by script.** Taken. It now
    presses Tab until the link has focus (at most 600 presses) and then
    Enter, on both paths.
13. **Note: the follow-up bead was unnamed.** Taken: `syzygy-t3jk.22`
    makes the grouped view the default selection.

The campaign file `docs/review-campaigns/t4s2-outline.md` the reviewer saw
untracked was written by the lead session for this raw.
