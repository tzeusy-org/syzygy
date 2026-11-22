# Semantic delta T2 — Trajectory states each Unknown once per board; a card shows its own facts

**Artifact(s):** `openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md`;
`openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md`; generated `openspec/changes/three-surface-poc-experience/GOVERNING-DEPENDENCIES.md`.
**Stable IDs affected:** POC-REQ-040 (Required behavior, Case, Observable,
Oracle, Falsifier, one new Scenario); POC-REQ-043 (Required behavior,
Oracle, Falsifier, one new Scenario, warrants gain RFC6-17 and RFC8-24);
CONTRACT-COVERAGE rows RFC8-24 (aggregation) and RFC6-17.
**Change class:** Normative (both requirements gain obligations).
**Author:** agent lane `coordinator:claude-20261122-81840bd5`, bead
`syzygy-t3jk.15` (Trajectory pursuit move T2).
**Date:** 2026-11-22

## Current meaning

Each Trajectory card repeats three Unknown disclosures in full: the
withheld title, the governing intent and the verification, each with its
reason sentence and route. Only the title and governing-intent Unknowns
have a board-level statement; verification has none. POC-REQ-040 asks a
card for its column and identifier only; priority and recorded instants are
served but not shown. On the owner daemon's page (2026-11-21, 508,101
bytes, 250 cards) cards were 95.5% of the bytes and the three repeated
notices 70.7%; at 1440 px the document was 2,091 px wide [Observed: pursuit
`docs/pursuits/2026-11-21-trajectory-vision-pursuit.md`, move T2].

## Proposed meaning

- POC-REQ-043: verification Unknown is stated once per board, in one
  notice with served, inside and outside counts equal to the machine
  answer's `trajectory.verificationUnknown`, its reason sentence and
  route. Each rendered item keeps one verification mark with the Unknown
  encoding and closed reason, referring to that notice.
- POC-REQ-040: each card shows its priority and recorded created, updated
  and (when present) closed instants as text, equal to the machine answer.
- RFC2-24's rendering rule ("Unknown regions may aggregate ... but must
  disclose reason counts and expand; every reason routes to its resolving
  action") now covers the title and verification Unknowns as it already
  covered governing intent: one board notice each with count, reason and
  route; the cards are the expansion.

## What explicitly does NOT change

- Every item's three epistemic states stay individually readable: on its
  card (a mark with the Unknown encoding and closed reason) and on the
  machine answer (`workItems.items[].governedBy`,
  `trajectory.rendered[].verification`, `workItems.titles`).
- POC-REQ-014 is unchanged: each rendered item is still marked, and reason
  and route still stand beside the count. Its sweep
  (`governing-intent-sweep.test.ts`) passes with its denominators
  unchanged.
- POC-REQ-060 and the Vocabulary rule are unchanged: the marks use the same
  encoding table, and every rendered Unknown still carries its closed
  reason.
- No new tracker read, no title, no item type, no paging; the narrowing
  toggle and the per-card time bar stay.

## Machine-answer change

`unknownSubjects` no longer carries per-card entries
`work-item:<id>/verification` and `work-item:<id>/governed-by` (they
existed for the default selection only, one per rendered card); it gains
`region:work-item-verification`. `trajectory` gains `verificationUnknown`
and each `trajectory.rendered[]` gains `priority`. `unknownSubjects` still
holds one entry per disclosure a surface renders.
Two basis sentences now read for the board rather than one item:
verification "... ingested for any work item." (was "for this item")
and governing intent "No governing intent was captured for any work item:
..." (was "for this work item").

## Warrant

VIS-3 ranks comprehension second only to truth; RFC2-24's rendering rule
permits the aggregation on the conditions stated; RFC6-17 asks an
aggregate to disclose its membership count. An agent adoption under VIS-4
as amended by D10; nothing here is owner-class.

## The P-71 Q1 sweep

`apps/three-surface-poc/src/unknown-route-sweep.test.ts` enforces owner
ruling P-71 Q1 (every rendered Unknown carries a closed reason and a
route). It gains one explicit rule and nothing is removed: an element
carrying `data-unknown-ref` resolves to exactly one in-page disclosure
with that id, the same closed reason and a route, and its link targets that
disclosure's element id. Mutants for a dangling reference, a differing
reason and a mislinked mark each fail. Trajectory denominators: plain and
observed-shape 17 → 3 (17 − 5 cards × 3 + 1 new notice), worker-change
6 → 4 (6 − 1 × 3 + 1); references counted separately (15, 15, 0, 0, 3).
Changing what that sweep accepts is recorded in this amendment's adoption
row.

## Evidence or decision basis

- Bytes on the 252-row fixture: 511,127 at base `291bafa19`, 454,357 at
  the head (445,382 before the review repairs added link descriptions), although each card gained priority and up to three instants.
- `trajectory.test.ts`: each route literal and basis sentence occurs once
  on that page and on no card; the notice counts equal the answer (252,
  250, 2); card facts equal the answer.
- `trajectory-narrowing.browser.test.ts`: at 1440 px the seven headings
  share one row; at 1440 and 390 px document `scrollWidth` does not exceed
  the viewport (both failed before the layout change: 7 headings on two
  rows; 880 px wide at 390).

## Downstream impact

Method: `git grep -n` for `workItemVerificationId`,
`workItemGoverningIntentId`, `work-item:` subject ids and the card mark
fields over `apps/`, `packages/` and `scripts/` (users: `trajectory.ts`,
`model.ts`, `unknown-route-sweep.test.ts`, `trajectory.test.ts`).
`scripts/check_p115_compatibility_examples.py` reads signed literal
fixtures, not the renderer; its fixtures are not edited, and
`syzygy-1poh`'s sample still shows the old per-card mark. Generated:
`GOVERNING-DEPENDENCIES.md`; `census.json` and R3's amendment table in
`scripts/check_spec_reconciliation.py` (POC 26/35 → 26/37 once this row is
in the tree; POC-REQ-040 1 → 2, POC-REQ-043 2 → 3).

## Migration / supersession plan

One pull request: code, tests, doc, spec, coverage rows, regenerated
files. Adoption by an `AGENT-ADOPTIONS.md` row in a second commit naming
the change commit; tag `three-surface-poc-board-unknowns-amendment-v1.0`
after merge.

## Review

**Required class:** one fresh-context review (CC-REV-1; one round, not
gating). **Reviewer and verdict:** the retained raw named in the pull
request.

## Exact text

````diff
diff --git a/openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md b/openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md
index 3b44e0f2f..2d7b74082 100644
--- a/openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md
+++ b/openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md
@@ -151,5 +151,5 @@ exhausted — a reviewer who finds an unlisted limb has found a real gap.
 | RFC6-15 | Every answer names the revision/evaluation it was computed at; same input ⇒ same answer | covered — "Filters" limb not present (no query filter surface in POC-REQ list) — folded to revision-stamping + determinism only | POC-REQ-001, POC-REQ-004, POC-REQ-010 |
 | RFC6-16 | An answer declares its scope and never presents a filtered/partial result as full coverage | covered — Bead-prefix scoping (011) and Trajectory's selection-rule/reconciling-counts disclosure (042) are declared-scope instances | POC-REQ-011, POC-REQ-042 |
-| RFC6-17 | An aggregate discloses its membership count/composition rather than a bare total | covered — Fold: only basic count-disclosure limb; full RFC6-22-tuple composition (tier/sibling/challenge/chain-state counts) not built | POC-REQ-042, POC-REQ-051 |
+| RFC6-17 | An aggregate discloses its membership count/composition rather than a bare total | covered — Fold: only basic count-disclosure limb; full RFC6-22-tuple composition (tier/sibling/challenge/chain-state counts) not built. POC-REQ-043's verification notice discloses its served, inside and outside counts | POC-REQ-042, POC-REQ-043, POC-REQ-051 |
 | RFC6-18 | Two surfaces must not differ in which facts/labels exist for one underlying selection — divergence is a model defect, not UI variance | covered — Fold: the dedicated "evidence drawer" container / "Why this answer?" naming is not built; only the general non-divergence principle applies | POC-REQ-020, POC-REQ-060 |
 | RFC6-19 | Evidence content travels as resolvable links carrying source/provenance | covered — Fold to class 3/4 (evidence+provenance) only; classes 1,2,5,6,7,8 (lifecycle, warrant, challenge, policy/consent, work-state) explicitly Unknown/out of scope this slice | POC-REQ-031 |
@@ -192,6 +192,6 @@ exhausted — a reviewer who finds an unlisted limb has found a real gap.
 | RFC8-23 | Unknown-provenance never absorbs orphaned work: where an item is both, the orphaned-work Contradiction governs | **Unknown** — Amendment row; the POC detects no orphaned work, and POC-REQ-014's Scope leaves this limb to the amendment that specifies orphaned-work detection, so no requirement observes the Contradiction governing | — |
 | RFC8-24 | Trajectory renders `source-uncaptured-or-unreachable` on a claim with its route visible | covered — Amendment row; the governing-intent claim on every work item | POC-REQ-014 |
-| RFC8-24 | The other reasons Trajectory renders (`missing-evidence`, `no-currency-bound-declared`, `stale-beyond-currency-bound`, `missing-declaration`), and a retention loss rendered citing the retention event | **Unknown** — Amendment row; no requirement observes them on Trajectory's claims | — |
-| RFC8-24 | Unknown aggregation follows RFC2-24's rendering rule: the governing-intent Unknowns aggregate to one count, disclose their reason count, and expand to their members within Trajectory's rendered selection | covered — Amendment row; one reason, so the served count is that reason's count; the narrowed board is the expansion over the rendered selection | POC-REQ-014 |
+| RFC8-24 | The other reasons Trajectory renders (`missing-evidence`, `no-currency-bound-declared`, `stale-beyond-currency-bound`, `missing-declaration`), and a retention loss rendered citing the retention event | **Unknown** — Amendment row; since syzygy-t3jk.15 POC-REQ-043's oracle observes `missing-evidence` on the work-item verification notice and marks; no requirement observes the other three reasons or a retention loss on Trajectory's claims | POC-REQ-043 (`missing-evidence` only) |
+| RFC8-24 | Unknown aggregation follows RFC2-24's rendering rule: the governing-intent Unknowns aggregate to one count, disclose their reason count, and expand to their members within Trajectory's rendered selection | covered — Amendment row; one reason, so the served count is that reason's count; the narrowed board is the expansion over the rendered selection. Since syzygy-t3jk.15 the verification Unknowns aggregate the same way, to one board notice with served, inside and outside counts, its reason and route, each card keeping a mark that refers to it | POC-REQ-014, POC-REQ-043 |
 | RFC8-24 | The rest of the aggregation rule: expansion to members outside Trajectory's rendered selection, and the full RFC6-17 disclosure the rendering rule cites (per-label, per-tier, per-freshness counts, the equivalence tuple) for this aggregate | **Unknown** — Amendment row; no requirement observes either for the governing-intent count | — |
 | RFC8-24 | These are claim reasons only: the normalized state's four absence values take no reason, are counted separately, and are never absorbed by an aggregate of Unknowns | **Unknown** — Amendment row; Trajectory renders no RFC8-12 normalized state with absence values, so no requirement observes the separation | — |
diff --git a/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md b/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md
index 68b2599be..037001aa9 100644
--- a/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md
+++ b/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md
@@ -930,16 +930,24 @@ Group: Trajectory. Form: **state projection/query**.
 items onto board columns drawn from a declared closed mapping of the Beads
 status vocabulary, with every rendered item placed by its observed status and
-carrying its identifier.
+carrying its identifier. Each rendered item SHALL also show, as text, its
+tracker priority and its recorded created, updated and (when present) closed
+instants, each equal to the machine answer's value for that item
+(`trajectory.rendered[]`).
 
 - **Case**: a checker loads Trajectory at a known Dolt revision with
-  known item statuses.
+  known item statuses, priorities and recorded instants.
 - **Observable**: each rendered item sits in the column its observed
-  status maps to.
+  status maps to, and its card shows its priority and recorded instants.
 - **Oracle**: per sampled item, the rendered column equals the declared
   mapping applied to the status read directly from Dolt at the served
-  revision; equality decides.
-- **Oracle independence**: expected statuses are direct database reads.
+  revision, and the priority and instants shown equal the machine
+  answer's for that item; equality decides.
+- **Oracle independence**: expected statuses, priorities and instants
+  are direct database reads (in a fixture, the checker's own rows), never
+  the renderer's model.
 - **Falsifier**: an item rendered in a column that contradicts its
-  observed status, or a column outside the declared mapping.
+  observed status, a column outside the declared mapping, or a card whose
+  priority or recorded instant differs from the machine answer's or is
+  missing.
 
 #### Scenario: Items placed by observed status
@@ -950,4 +958,11 @@ carrying its identifier.
   column the declared mapping assigns to `in_progress`
 
+#### Scenario: A card shows its own facts
+
+- **WHEN** an item at revision D has priority 3 and recorded created,
+  updated and closed instants
+- **THEN** its card shows priority 3 and those three instants as text,
+  each equal to the machine answer's value for that item
+
 ```yaml
 warrants:
@@ -1053,5 +1068,11 @@ column "Claimed", and the worker-change state label says only what git
 showed on the bounded seam. One notice above the board SHALL state how many
 rendered items are closed and that verification is Unknown for each of
-them, with its reason.
+them, with its reason. Trajectory SHALL state the verification Unknown once
+per board: one notice giving how many served items it holds for, how many of
+those the selection renders and how many it leaves outside, each equal to
+the machine answer (`trajectory.verificationUnknown`), with the reason
+sentence and its route. Each rendered item SHALL keep its own verification
+mark, carrying the Unknown encoding and closed reason and referring to that
+notice; the reason sentence and route are not repeated per item.
 
 - **Scope.** every satisfaction/verification encoding on the surface, and
@@ -1073,5 +1094,11 @@ them, with its reason.
   `done|complete|completed|finished|resolved|satisfied|in[ _-]progress|active`
   over the wording population finds nothing, and the notice's closed count
-  equals the machine answer's rendered items with status closed.
+  equals the machine answer's rendered items with status closed. For the
+  board-level count, the notice's served, inside and outside figures equal
+  `trajectory.verificationUnknown`; every rendered item carries exactly
+  one verification mark whose reference resolves to that notice (the mark
+  names the notice's subject and links to its element); and no rendered
+  item's card contains the reason sentence or the route literal, each of
+  which occurs once on the page.
 - **Oracle independence**: the relationship state comes from the
   machine answer; the checker induced the mismatch.
@@ -1080,5 +1107,8 @@ them, with its reason.
   heading, label, sentence or served column value in the wording
   population that names closure as done, complete, finished or resolved,
-  or a claim as in progress or active.
+  or a claim as in progress or active; or a verification notice whose
+  counts differ from the machine answer's, a rendered item with no
+  verification mark or a mark referring to no notice, or a card that
+  repeats the reason sentence or route.
 
 #### Scenario: Closed but unverified
@@ -1098,9 +1128,17 @@ them, with its reason.
   verification is Unknown for each of them
 
+#### Scenario: Verification is Unknown once per board, with its count
+
+- **WHEN** 252 items are served and the selection renders 250
+- **THEN** one notice says verification is Unknown for 252 served items,
+  250 in the selection and 2 outside it, with the reason and route, and
+  each of the 250 cards carries one verification mark that refers to it
+  and repeats neither the reason sentence nor the route
+
 ```yaml
 warrants:
   primary: VIS-2
   doctrine: [VIS-1, VIS-2]
-  contracts: [RFC1-19, RFC1-22, RFC1-23, RFC1-24, RFC2-20, RFC8-2, RFC8-15, RFC8-30]
+  contracts: [RFC1-19, RFC1-22, RFC1-23, RFC1-24, RFC2-20, RFC6-17, RFC8-2, RFC8-15, RFC8-24, RFC8-30]
   policies: []
   decisions: [POC-DIR-2026-08-29, POC-DIR-2026-08-30]
````

## Dispositions

Review `docs/reviews/R-T2-BOARD-UNKNOWNS-1-RAW.md`, verdict
`CONFIRM WITH EXCEPTIONS`, over commit `0cec8ef7c`. The exact text above is
regenerated after the repairs; the review is bound to the earlier bytes
(rule 10).

1. The RFC8-24 "other reasons" row stayed fully Unknown — accepted; it now
   names POC-REQ-043 for `missing-evidence` only and keeps the other
   three reasons and the retention limb Unknown.
2. The titles notice had no count — accepted; it now reads "Unknown for N
   of N observed work items (every one)", N being the served item count.
3. 750 identical "reason and route" links — accepted in part. Each link is
   now `aria-describedby` its notice, so focusing it reads the notice's
   count, reason and route with no activation; the link stays because the
   bead asks for the notice to be one activation away, and its name is
   determined in context by the mark it sits in (WCAG 2.4.4). A distinct
   `aria-label` per link was tried and dropped: it made the 252-row page
   larger than the base (523,177 bytes), which the acceptance forbids.
   Notice ids were shortened (`n-titles`, `n-intent`, `n-verification`)
   for the same reason. Tab stops stay at four per card; reducing them is
   left to `syzygy-t3jk.18`, which decides the board's paging.
4. "Not repeated per item" was decided by no clause — accepted; the Oracle
   now says no card contains the reason sentence or the route literal and
   each occurs once on the page, and the Falsifier names a card that
   repeats either. "Resolves" is defined there: the mark names the
   notice's subject and links to its element.
5. POC-REQ-040's oracle independence covered statuses only — accepted; it
   now names priorities and instants as direct reads (the checker's own
   fixture rows), never the renderer's model. The test compares typed
   literals as well as the answer.
6. The governing-intent reason sentence appeared nowhere on the page —
   accepted; the governing-intent notice now states it, and the test
   asserts it occurs once. Both basis sentences reworded for a board are
   listed under "Machine-answer change".
7. Notes: the stale `closureNotice` comment is corrected and the closure
   notice links the verification notice; the unused
   `governingIntentDisclosure` is removed; R3 now matches an amendment's
   tag only as a whole backticked token; the mark's link inherits the
   mark's colour. Noted without change: per-item verification is served
   for rendered items only and `served` equals the item count by
   construction (every served item's verification is Unknown); the
   reference rule does not check `<details>` (no notice sits in one); the
   byte and before-layout figures are the author's, re-measured after the
   repairs.
