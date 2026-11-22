# Semantic delta T3 — Trajectory opens with its five answers

**Artifact(s):** `openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md`;
`openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md`; generated `openspec/changes/three-surface-poc-experience/GOVERNING-DEPENDENCIES.md`.
**Stable IDs affected:** new POC-REQ-044 (Trajectory group; three
Scenarios); the spec's group note (Trajectory 040–043 → 040–044);
CONTRACT-COVERAGE Part A rows RFC2-24 (new), RFC2-19(a), RFC8-28 (two),
RFC8-29 (moved from Part B2), RFC6-17 and RFC8-23 (extended); the family
table and Part A totals.
**Change class:** Normative (a new requirement).
**Author:** agent lane `coordinator:claude-20261122-81840bd5`, bead
`syzygy-t3jk.16` (Trajectory pursuit move T3).
**Date:** 2026-11-22

## Current meaning

No sentence on Trajectory answers any of its five questions (README.md's
Trajectory row: what remains, what is running, what changed, what it cost,
and whether the result has been verified against intent). The only counts
are the board's column counts, over the rendered selection (250 of 10,971
observed items on the owner's page, pursuit report
`docs/pursuits/2026-11-21-trajectory-vision-pursuit.md`, move T3). No
requirement covers the five answers; RFC2-19(a), RFC8-28 and RFC8-29 sit
in Part B2 ("the POC renders no chain state").

## Proposed meaning

POC-REQ-044: the page's first content, before the scope statement,
notices and board, is five answers in a fixed order, each a fact with its
count and denominator over every served item or an explicit Unknown with
its closed reason and route, never dropped; the machine answer carries
the same five (`trajectory.answers`). Today: remains = served counts per
tracker status, summing to the total; running = the `in_progress` count as
the tracker's claim, liveness Unknown (`no-currency-bound-declared`);
changed and cost = Unknown (`source-uncaptured-or-unreachable`: no
movement source and no cost record is read); verified against intent =
three separate counts never added: (a) Unknown-provenance n of N, referring
to POC-REQ-014's disclosure; (b) the reconciliation chain, materialized
work whose change is on the default branch, each member "reconciliation
evidence absent / Unknown" with its route and no RFC2-24 reason (Unknown
with a reason when the worker change was not observed); (c) orphaned work,
not checked, count Unknown (`source-uncaptured-or-unreachable`), never 0.
With work items Unknown, all five render as Unknown, with no count.

## What explicitly does NOT change

- The board, its selection rule, its notices and cards (POC-REQ-040 to
  043) are unchanged; the answers sit above them.
- No new tracker read: only the seven columns already selected. No title
  (SEC-5). No orphaned-work detection, no reconciliation verdict, no score
  or percentage. The wider charter (planned, blocked, why) is not added.
- POC-REQ-014's served items keep their governing-intent Unknown; count
  (a) refers to that disclosure and reclassifies nothing.
- The CONTRACT-COVERAGE rows for RFC2-18, RFC2-19, RFC8-8 and RFC8-16 stay
  where they are; POC-REQ-044's warrants name only the clauses whose
  Part A rows it adds or extends, so Part A stays equal to the
  `contracts[]` union (81).
- The unknown-route sweep (P-71 Q1) gains no rule: every new answer part is
  a disclosure carrying a closed reason and route, or a reference mark under
  the rule `syzygy-t3jk.15` added. The chain statement (b) carries no
  Unknown encoding class, so the sweep does not count it among Unknowns
  (RFC2-19(a)).

## Choices the review may contest

- **Running liveness.** RFC8-16 makes a claimed item's *state*
  `activity-undetermined`, state-local and never the reason, while "between
  signals, worker liveness renders Unknown". The answer renders liveness
  as an Unknown with `no-currency-bound-declared`, as the bead directs; it
  does not render the per-item state.
- **Orphaned work's reason.** `missing-evidence` names evidence sought and
  not found (RFC2-19(a) says so of a verdict never sought). The orphan check
  needs each item's creation attribution from the tracker's history
  (RFC8-8, RFC4-17), a source this observation does not read, so the reason
  is `source-uncaptured-or-unreachable`.
- **Changed and cost** take `source-uncaptured-or-unreachable` for the same
  reason: the movement history and cost records are sources not read.

## Machine-answer change

`trajectory.answers` (five entries, both projection kinds). New
`unknownSubjects` on an observed board: `region:trajectory-running-liveness`,
`region:trajectory-changed`, `region:trajectory-cost`,
`region:trajectory-orphaned-work`, and `region:trajectory-chain-membership`
only when a materialized item's worker change is unobserved.

## Warrant

VIS-2 (an unanswerable part is Unknown, never empty); VIS-3
(comprehension); SURFACE-DECISION-RECORD.md §2 (Trajectory is the owner's
account of what remains, is active, changed, cost); RFC2-19(a), RFC2-24,
RFC6-17, RFC8-23, RFC8-28, RFC8-29. An agent adoption under VIS-4 as
amended by D10; nothing here is owner-class.

## Evidence or decision basis

- `trajectory.test.ts` "Trajectory opens with its five answers": order and
  position before the scope statement; status counts on the 252-row
  fixture (34, 34, 34, 33, 33, 33, 51 = 252; Closed column 50); running
  34 with liveness reason and route; changed and cost Unknown; the fifth
  answer's three counts, structure (no sum element) and "verified" only
  in the question; chain Unknown when the worker change is unobserved;
  rule-6 mutants. The worker-change test adds (b) = 1 with a merged item,
  0 without, (a) = 1 both times. The work-items-Unknown matrix test
  checks five Unknown answers and no count.
- `trajectory-projection.test.ts`: literal answers over a four-item
  fixture whose selection renders three; the chain count over five worker
  states.
- `unknown-route-sweep.test.ts`: denominators recounted (comment).

## Downstream impact

Method: `git grep` over `apps/`, `packages/` and `scripts/` for
`TrajectoryProjection` consumers and literal Trajectory denominators.
Changed: `routes.test.ts` (its hand-built Unknown projection gains
`answers`), `governing-intent-sweep.test.ts` (one mutant re-scoped to the
governing-intent region, since the changed answer now precedes it with the
same reason), `trajectory.test.ts` (route counts per reason),
`unknown-route-sweep.test.ts` (denominators: plain and observed-shape
trajectory 3 → 7, worker-change 4 → 8; references 15 → 16, 3 → 4, and
0 → 5 on the two boards with no work items). R3 of
`scripts/check_spec_reconciliation.py` reads the new requirement from its
adoption row (POC 26/37 → 27/40); `census.json` regenerated.

## Migration / supersession plan

One pull request; adoption by an `AGENT-ADOPTIONS.md` row in a second
commit naming the change commit; tag
`three-surface-poc-five-answers-amendment-v1.0` after merge.

## Review

**Required class:** one fresh-context review (CC-REV-1; one round, not
gating). **Reviewer and verdict:** the retained raw named in the pull
request.

## Exact text

````diff
diff --git a/openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md b/openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md
index 2d7b74082..a94fb43e2 100644
--- a/openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md
+++ b/openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md
@@ -45,5 +45,5 @@ Every clause was judged exactly once and lands in exactly one part:
 |---|---|---|---|---|
 | RFC1 | 39 | 12 | 4 | 23 |
-| RFC2 | 27 | 8 | 0 | 19 |
+| RFC2 | 27 | 9 | 0 | 18 |
 | RFC3 | 38 | 0 | 0 | 38 |
 | RFC4 | 32 | 10 | 1 | 21 |
@@ -51,7 +51,7 @@ Every clause was judged exactly once and lands in exactly one part:
 | RFC6 | 28 | 10 | 1 | 17 |
 | RFC7 | 41 | 12 | 4 | 25 |
-| RFC8 | 32 | 8 | 1 | 23 |
+| RFC8 | 32 | 10 | 1 | 21 |
 | RFC9 | 60 | 17 | 2 | 41 |
-| **Total** | **324** | **78** | **28** | **218** |
+| **Total** | **324** | **81** | **28** | **215** |
 
 The Part A clause set is exactly the `contracts[]` union in the
@@ -151,5 +151,5 @@ exhausted — a reviewer who finds an unlisted limb has found a real gap.
 | RFC6-15 | Every answer names the revision/evaluation it was computed at; same input ⇒ same answer | covered — "Filters" limb not present (no query filter surface in POC-REQ list) — folded to revision-stamping + determinism only | POC-REQ-001, POC-REQ-004, POC-REQ-010 |
 | RFC6-16 | An answer declares its scope and never presents a filtered/partial result as full coverage | covered — Bead-prefix scoping (011) and Trajectory's selection-rule/reconciling-counts disclosure (042) are declared-scope instances | POC-REQ-011, POC-REQ-042 |
-| RFC6-17 | An aggregate discloses its membership count/composition rather than a bare total | covered — Fold: only basic count-disclosure limb; full RFC6-22-tuple composition (tier/sibling/challenge/chain-state counts) not built. POC-REQ-043's verification notice discloses its served, inside and outside counts | POC-REQ-042, POC-REQ-043, POC-REQ-051 |
+| RFC6-17 | An aggregate discloses its membership count/composition rather than a bare total | covered — Fold: only basic count-disclosure limb; full RFC6-22-tuple composition (tier/sibling/challenge/chain-state counts) not built. POC-REQ-043's verification notice discloses its served, inside and outside counts, and POC-REQ-044's answers give each count with its denominator | POC-REQ-042, POC-REQ-043, POC-REQ-044, POC-REQ-051 |
 | RFC6-18 | Two surfaces must not differ in which facts/labels exist for one underlying selection — divergence is a model defect, not UI variance | covered — Fold: the dedicated "evidence drawer" container / "Why this answer?" naming is not built; only the general non-divergence principle applies | POC-REQ-020, POC-REQ-060 |
 | RFC6-19 | Evidence content travels as resolvable links carrying source/provenance | covered — Fold to class 3/4 (evidence+provenance) only; classes 1,2,5,6,7,8 (lifecycle, warrant, challenge, policy/consent, work-state) explicitly Unknown/out of scope this slice | POC-REQ-031 |
@@ -185,5 +185,5 @@ exhausted — a reviewer who finds an unlisted limb has found a real gap.
 | RFC8-22 | A join is never reconstructed by similarity, interpolation or inference | covered — Amendment row; the fixture-title counterexample observes the title case | POC-REQ-014 |
 | RFC8-22 | Everything downstream of a broken link renders with provenance degraded accordingly | **Unknown** — Amendment row; the POC renders no link downstream of the work item, and no requirement observes degraded downstream provenance | — |
-| RFC8-23 | A work item with no traceable warrant renders Unknown-provenance: counted over the served set, filterable within Trajectory's rendered selection, never green, its route resolvable by supplying a warrant stated beside the count | covered — Amendment row; the oracle decides the count, the narrowed board over the rendered selection, the Unknown encoding against POC-REQ-060's table, and the resolution statement by literal match | POC-REQ-014 |
+| RFC8-23 | A work item with no traceable warrant renders Unknown-provenance: counted over the served set, filterable within Trajectory's rendered selection, never green, its route resolvable by supplying a warrant stated beside the count | covered — Amendment row; the oracle decides the count, the narrowed board over the rendered selection, the Unknown encoding against POC-REQ-060's table, and the resolution statement by literal match; POC-REQ-044's fifth answer states the same count, n of N served | POC-REQ-014, POC-REQ-044 |
 | RFC8-23 | Unknown-provenance items outside Trajectory's rendered selection are filterable | **Unknown** — Amendment row; POC-REQ-042 lets Trajectory render a selection, so items outside it are counted on Trajectory but not rendered, and no requirement observes filtering them | — |
 | RFC8-23 | Unknown-provenance work is never silently pooled into warranted work | **Unknown** — Amendment row; no served item is warranted, so the oracle has no warranted population to keep it apart from | — |
@@ -227,8 +227,13 @@ exhausted — a reviewer who finds an unlisted limb has found a real gap.
 | RFC8-22 | An invalid local representation is an explicit bounded failure, never a silently skipped join, guessed value or smaller successful answer | covered — Amendment row (observation-local governedBy wire value); no governing-intent link or source-to-claim join is admitted | POC-REQ-014 |
 | RFC8-23 | Equal Unknown values stay separate countable/filterable work-item claims; sharing neither clears Unknown nor invents warrants | covered — Amendment row (observation-local governedBy wire value); existing unresolved orphaned-work and other limbs remain Unknown | POC-REQ-014 |
+| RFC2-24 | Each of Trajectory's five answers, or part of one, that is Unknown carries one closed reason and its route, with a machine twin under its id | covered — Amendment row (five answers, syzygy-t3jk.16) | POC-REQ-044 |
+| RFC2-19(a) | Merged-but-unreconciled work renders "reconciliation evidence absent / Unknown" as a fact of the render, counted in its own right and routed to running a reconciliation evaluation, never stamped with or counted among RFC2-24 reasons | covered — Amendment row (five answers); the oracle reads the chain count and its statement and finds no RFC2-24 reason on it. Moved from Part B2 | POC-REQ-044 |
+| RFC8-28 | The merged, not yet evaluated chain state renders as its own counted answer, never sharing a rendering with another state | covered — Amendment row (five answers); the count of materialized work on the default branch, with its own wording. Moved from Part B2 | POC-REQ-044 |
+| RFC8-28 | The six chain states are queryable and filterable on each item's durable identity, beside its normalized state | **Unknown** — Amendment row (five answers); the POC computes no chain state per item and no requirement observes a query or filter on one | — |
+| RFC8-29 | Every merged-but-unreconciled item renders "reconciliation evidence absent / Unknown"; nothing simulates a verdict | covered — Amendment row (five answers); stated once for the counted members, not on each card. Moved from Part B2 | POC-REQ-044 |
 
 Part A totals `[Observed, computed by the sweep in "Verifying this
-table"]`: **154 consequence rows over 78 clauses — 112 covered,
-42 Unknown.**
+table"]`: **159 consequence rows over 81 clauses — 116 covered,
+43 Unknown.**
 
 **Amendment disclosure — the RFC1-26 closure row (ruling P-75 Q3).**
@@ -373,5 +378,4 @@ are listed so the owner can review or contest each one directly.
 | RFC2-18 | The post-merge reconciliation chain state machine; not rendered anywhere in the POC |
 | RFC2-19 | Reconciliation trigger and V0/V1 staging of that chain; the chain itself is unbuilt |
-| RFC2-19(a) | Chain-state-local exemption for the reconciliation-pending Unknown; no such chain state exists to exempt |
 | RFC2-21 | Composite "no gap at E" semantics requiring Aligned/challenge/reconciled tracking; none of that machinery exists in POC |
 | RFC2-22 | Fixed-point idempotence across repeated evaluations of an unchanged no-gap snapshot; POC is one-shot, not a repeated-evaluation loop |
@@ -509,6 +513,4 @@ are listed so the owner can review or contest each one directly.
 | RFC8-26 | Compaction preservation set (what survives compaction); no compaction machinery in POC |
 | RFC8-27 | Expired-detail tier rendering after compaction/retention events; no compaction/retention machinery in POC |
-| RFC8-28 | Six-value RFC2-18 reconciliation chain-state field rendered beside normalized state; POC renders no such field — the relationship stays wholesale Unknown |
-| RFC8-29 | V0 per-item "reconciliation evidence absent/Unknown" rendering; POC doesn't attempt per-item reconciliation-evidence checks at all |
 | RFC8-32 | The RFC→OpenSpec phase-boundary/coverage-matrix authoring obligation; a process rule governing this sweep itself, not a capability-rendered entity or behavior |
 | RFC9-2 | This RFC's own semantics-vs-rendering-technology scope boundary — a self-referential meta-rule, not an entity/behavior POC renders |
@@ -559,8 +561,8 @@ Part B2 total `[Observed, computed]`: **218 clauses.**
 
 - Denominator: re-run the two counting methods named above; both must
-  return 324 for RFC1–9, and 78 + 28 + 218 = 324.
+  return 324 for RFC1–9, and 81 + 28 + 215 = 324.
 - Mapped set: `python3 scripts/build_three_surface_poc_spec_dependencies.py
   --check` — Part A's clause column must equal the generated
-  `contracts[]` union (78 identifiers).
+  `contracts[]` union (81 identifiers).
 - Totals: count rows and dispositions in this file's tables (e.g.
   Python over the `| RFC` rows); the printed totals must match the
diff --git a/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md b/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md
index 037001aa9..e5cd34135 100644
--- a/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md
+++ b/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md
@@ -30,5 +30,5 @@ Reader notes, binding on how this file is read:
   observation* (001–004), *Work-item observation* (010–014), *Client
   rendering and parity* (020–022), *Polaris* (030–032), *Trajectory*
-  (040–043), *Orrery* (050–053), *Cross-cutting experience* (055, 060–061).
+  (040–044), *Orrery* (050–053), *Cross-cutting experience* (055, 060–061).
   Identifiers are stable and literal: minted once, amended in place,
   retired rather than reused, never renumbered (CC-SPEC-3). Gaps in the
@@ -1147,4 +1147,107 @@ warrants:
 ```
 
+### Requirement: POC-REQ-044 — Trajectory opens with its five answers
+
+Group: Trajectory. Form: **state projection/query**.
+
+**Required behavior.** Trajectory's first content, before its scope
+statement, notices and board, SHALL be five answers in this fixed order,
+one per question of the Trajectory row of `README.md`: what remains, what
+is running, what changed, what it cost, and whether the result has been
+verified against intent. Each answer SHALL be a fact with its count and
+denominator over every served work item, never the rendered selection
+(POC-REQ-042), or an explicit Unknown carrying its closed reason and route;
+an answer whose value is Unknown SHALL be rendered, never dropped. The
+machine answer SHALL carry the same five answers, in the same order, with
+equal values (`trajectory.answers`). Today:
+
+- *What remains* SHALL give the served items' count for every tracker
+  status in the status vocabulary (POC-REQ-040), summing to the served
+  total.
+- *What is running* SHALL give how many served items the tracker marks
+  `in_progress`, worded as the tracker's claim, and their liveness as an
+  Unknown (reason `no-currency-bound-declared`).
+- *What changed* and *what it cost* SHALL each be an Unknown with its
+  closed reason and route while no movement source or cost record is read.
+- *Verified against intent* SHALL give three separately labelled counts,
+  each with its own denominator, and no element SHALL add any two of them:
+  (a) Unknown-provenance, the served items with no traceable warrant, n of
+  N, referring to POC-REQ-014's governing-intent disclosure; (b) the
+  reconciliation chain, the count of materialized work items whose change
+  is on the default branch, each member stated as "reconciliation evidence
+  absent / Unknown" with its route (run a reconciliation evaluation) and no
+  RFC2-24 reason, or an Unknown with its reason when the materialized
+  item's change could not be observed; and (c) orphaned work, stated as not
+  checked, its count an Unknown with its reason, never 0. The word
+  "verified" SHALL NOT name a state among the answers.
+
+When work items are not observed, all five answers SHALL render, each an
+Unknown referring to the work-items disclosure, and no count SHALL appear.
+
+- **Scope.** the answers region of Trajectory and `trajectory.answers` on
+  the machine answer. The wider charter (what is planned, blocked, and why
+  the work exists), orphaned-work detection and any reconciliation verdict
+  are outside it.
+
+- **Case**: a checker serves 252 work items, of which the selection
+  renders 250, and reads Trajectory and the machine answer; then repeats
+  with a materialized item whose change is on the default branch, and with
+  the work-item observation Unknown.
+- **Observable**: five answers in order before the scope statement; the
+  status counts, claimed count and three fifth-answer counts with their
+  denominators; each Unknown part's reason and route.
+- **Oracle**: the five question labels and the machine answer's ids
+  equal the fixed order; each status count equals the count of served
+  items with that status, they sum to the served total, and the closed
+  count differs from the rendered Closed column when the selection leaves
+  a closed item outside; the claimed count equals the served `in_progress`
+  items; each Unknown part carries a closed reason and a route and has a
+  machine twin under its id (POC-REQ-060); count (a) equals
+  `workItems.governedByUnknownCount`; count (b) is 1 with a merged
+  materialized item and 0 without one while (a) is unchanged; (c) renders
+  Unknown, never a number; with work items Unknown, five answers render
+  and none carries a count. Equality decides.
+- **Oracle independence**: expected counts are the checker's own fixture
+  rows, counted by the checker, never the renderer's model.
+- **Falsifier**: an answer missing, out of order or dropped for being
+  Unknown; a count taken over the rendered selection; status counts that
+  do not sum to the served total; a running count worded as observed
+  activity; an Unknown part with no reason or route; an element adding two
+  of the fifth answer's counts; orphaned work rendered as 0; a chain member
+  stated under an RFC2-24 reason; or "verified" naming a state.
+
+#### Scenario: Five answers before the board
+
+- **WHEN** 252 work items are served and the selection renders 250
+- **THEN** five answers render first, in order: the served count of each
+  tracker status summing to 252, the tracker's claimed count with liveness
+  Unknown, what changed and what it cost as Unknowns with their reasons and
+  routes, and three separate counts for verification against intent; the
+  machine answer carries the same five with equal values
+
+#### Scenario: A merged materialized item enters the chain
+
+- **WHEN** the materialized work item's change is on the default branch
+- **THEN** the reconciliation-chain count is 1, stated with
+  "reconciliation evidence absent / Unknown" and its route, and the
+  Unknown-provenance count is unchanged
+
+#### Scenario: Work items not observed
+
+- **WHEN** the work-item observation is Unknown
+- **THEN** all five answers render, each an Unknown referring to the
+  work-items disclosure, and no count appears
+
+```yaml
+warrants:
+  primary: VIS-2
+  doctrine: [VIS-2, VIS-3]
+  contracts: [RFC2-19(a), RFC2-24, RFC6-17, RFC8-23, RFC8-28, RFC8-29]
+  policies: []
+  decisions: []
+  topology: []
+  parent_requirements: []
+```
+
 ### Requirement: POC-REQ-050 — Orrery projects declared mappings deterministically
 
````
