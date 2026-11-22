# Semantic delta T3 — Trajectory opens with its five answers

**Artifact(s):** `openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md`;
`openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md`; generated `openspec/changes/three-surface-poc-experience/GOVERNING-DEPENDENCIES.md`.
**Stable IDs affected:** new POC-REQ-044 (Trajectory group; three
Scenarios); the spec's group note (Trajectory 040–043 → 040–044);
CONTRACT-COVERAGE: RFC2-18, RFC2-19(a), RFC8-8, RFC8-16, RFC8-19, RFC8-28
and RFC8-29 move from Part B2 to Part A (a covered and an Unknown limb
each, RFC8-28 two), RFC8-18 moves from Part B2 to Part B1, RFC2-24 gains a
row, RFC6-17 and RFC8-23 are extended; the family table and Part A totals.
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
requirement covers the five answers; the chain, liveness, cost and
remaining-work clauses sit in Part B2 ("the POC renders no chain state",
"POC scope excludes cost accounting").

## Proposed meaning

POC-REQ-044: the page's first content, before the scope statement,
notices and board, is five answers in a fixed order, each a fact with its
count and denominator over every served item or an explicit Unknown with
its closed reason and route, never dropped; the machine answer carries
the same five (`trajectory.answers`). Today: remains = served counts per
tracker status, summing to the total, labelled as the tracker's items only
(RFC8-8's other planes not enumerated); running = the `in_progress` count
as the tracker's claim, liveness the state-local `activity-undetermined`
(RFC8-16), with no reason and no machine Unknown;
changed and cost = Unknown (`source-uncaptured-or-unreachable`: no
movement source and no cost record is read); verified against intent =
three separate counts never added: (a) Unknown-provenance n of N, referring
to POC-REQ-014's disclosure; (b) the reconciliation chain, materialized
work whose change is on the default branch, of the materialized work, each member "reconciliation
evidence absent / Unknown" with its route and no RFC2-24 reason (Unknown
with a reason when the worker change was not observed); (c) orphaned work,
not checked, count Unknown of N served (`source-uncaptured-or-unreachable`),
never 0.
With work items Unknown, all five render as Unknown, with no count.

## What explicitly does NOT change

- The board, its selection rule, its notices and cards (POC-REQ-040 to
  043) are unchanged; the answers sit above them.
- No new tracker read: only the seven columns already selected. No title
  (SEC-5). No orphaned-work detection, no reconciliation verdict, no score
  or percentage. The wider charter (planned, blocked, why) is not added.
- POC-REQ-014's served items keep their governing-intent Unknown; count
  (a) refers to that disclosure and reclassifies nothing.
- The CONTRACT-COVERAGE row for RFC2-19 stays in Part B2 (the chain is
  still unbuilt). POC-REQ-044's warrants name exactly the clauses whose
  Part A rows it adds or extends, so Part A stays equal to the
  `contracts[]` union (85). The bead asked that RFC2-18, RFC8-8 and RFC8-16
  stay put; review finding 5 showed their Part B2 readings false once the
  answers render, so they move (disposition 5).
- The unknown-route sweep (P-71 Q1) gains no rule: every new answer part is
  a disclosure carrying a closed reason and route, or a reference mark under
  the rule `syzygy-t3jk.15` added. The chain statement (b) carries no
  Unknown encoding class, so the sweep does not count it among Unknowns
  (RFC2-19(a)).

## Choices the review may contest

- **Running liveness.** RFC8-16: until a bound is declared, claimed items
  render `activity-undetermined`, state-local, "never that reason, never
  counted among a project's Unknown-reason totals". The answer renders
  that state with no reason and no machine Unknown (the bead's suggested
  reason was overruled by review finding 1).
- **Orphaned work's reason.** `missing-evidence` names evidence sought and
  not found (RFC2-19(a) says so of a verdict never sought). The orphan check
  needs each item's creation attribution from the tracker's history
  (RFC8-8, RFC4-17), a source this observation does not read, so the reason
  is `source-uncaptured-or-unreachable`.
- **Changed and cost** take `source-uncaptured-or-unreachable` for the same
  reason: the movement history and cost records are sources not read.

## Machine-answer change

`trajectory.answers` (five entries, both projection kinds). New
`unknownSubjects` on an observed board:
`region:trajectory-changed`, `region:trajectory-cost`,
`region:trajectory-orphaned-work`, and `region:trajectory-chain-membership`
only when a materialized item's worker change is unobserved.

## Warrant

VIS-2 (an unanswerable part is Unknown, never empty); VIS-3
(comprehension); SURFACE-DECISION-RECORD.md §2 (Trajectory is the owner's
account of what remains, is active, changed, cost); RFC2-18, RFC2-19(a),
RFC2-24, RFC6-17, RFC8-8, RFC8-16, RFC8-19, RFC8-23, RFC8-28, RFC8-29. An agent adoption under VIS-4 as
amended by D10; nothing here is owner-class.

## Evidence or decision basis

- `trajectory.test.ts` "Trajectory opens with its five answers": order and
  position before the scope statement; status counts on the 252-row
  fixture (34, 34, 34, 33, 33, 33, 51 = 252; Closed column 50); running
  34 with liveness `activity-undetermined` and no Unknown encoding; changed and cost Unknown; the fifth
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
trajectory 3 → 6, worker-change 4 → 7; references 15 → 16, 3 → 4, and
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
index 2d7b74082..99446d03a 100644
--- a/openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md
+++ b/openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md
@@ -45,5 +45,5 @@ Every clause was judged exactly once and lands in exactly one part:
 |---|---|---|---|---|
 | RFC1 | 39 | 12 | 4 | 23 |
-| RFC2 | 27 | 8 | 0 | 19 |
+| RFC2 | 27 | 10 | 0 | 17 |
 | RFC3 | 38 | 0 | 0 | 38 |
 | RFC4 | 32 | 10 | 1 | 21 |
@@ -51,7 +51,7 @@ Every clause was judged exactly once and lands in exactly one part:
 | RFC6 | 28 | 10 | 1 | 17 |
 | RFC7 | 41 | 12 | 4 | 25 |
-| RFC8 | 32 | 8 | 1 | 23 |
+| RFC8 | 32 | 13 | 2 | 17 |
 | RFC9 | 60 | 17 | 2 | 41 |
-| **Total** | **324** | **78** | **28** | **218** |
+| **Total** | **324** | **85** | **29** | **210** |
 
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
@@ -227,8 +227,23 @@ exhausted — a reviewer who finds an unlisted limb has found a real gap.
 | RFC8-22 | An invalid local representation is an explicit bounded failure, never a silently skipped join, guessed value or smaller successful answer | covered — Amendment row (observation-local governedBy wire value); no governing-intent link or source-to-claim join is admitted | POC-REQ-014 |
 | RFC8-23 | Equal Unknown values stay separate countable/filterable work-item claims; sharing neither clears Unknown nor invents warrants | covered — Amendment row (observation-local governedBy wire value); existing unresolved orphaned-work and other limbs remain Unknown | POC-REQ-014 |
+| RFC2-24 | Each of Trajectory's five answers, or part of one, that is Unknown carries one closed reason and its route, with a machine twin under its id | covered — Amendment row (five answers, syzygy-t3jk.16) | POC-REQ-044 |
+| RFC2-19(a) | Merged-but-unreconciled work renders "reconciliation evidence absent / Unknown" as a fact of the render, counted in its own right and routed to running a reconciliation evaluation, never stamped with or counted among RFC2-24 reasons | covered — Amendment row (five answers); the oracle reads the chain count and its statement and finds no RFC2-24 reason on it. Moved from Part B2 | POC-REQ-044 |
+| RFC2-19(a) | That rendering carries the member's durable identity, its merge fact and the intent revision | **Unknown** — Amendment row (five answers); the answer gives a count and one statement, naming no member, commit or revision | — |
+| RFC8-28 | The merged, not yet evaluated chain state renders as its own counted answer, never sharing a rendering with another state | covered — Amendment row (five answers); the count of materialized work on the default branch, with its own wording. Moved from Part B2 | POC-REQ-044 |
+| RFC8-28 | The six chain states are queryable and filterable on each item's durable identity, beside its normalized state, including on the member's own card | **Unknown** — Amendment row (five answers); the POC computes no chain state per item, the member's card shows none, and no requirement observes a query or filter on one | — |
+| RFC8-29 | Merged-but-unreconciled work is stated as "reconciliation evidence absent / Unknown", and no verdict is rendered | covered — Amendment row (five answers); stated once for the counted members. Moved from Part B2 | POC-REQ-044 |
+| RFC8-29 | Each merged-but-unreconciled item renders that statement on its own rendering | **Unknown** — Amendment row (five answers); the member's card carries no chain statement | — |
+| RFC2-18 | `merged` is execution state, never proof that intent is satisfied: work that reached the default branch is counted as a chain member, never as satisfied | covered — Amendment row (five answers). Moved from Part B2 | POC-REQ-044 |
+| RFC2-18 | The chain's states are computed per item from snapshot items alone, on the item's durable identity | **Unknown** — Amendment row (five answers); the POC computes no per-item chain state | — |
+| RFC8-8 | "What remains?" labels the plane it enumerates: the tracker's work items, counted per status over every served item | covered — Amendment row (five answers); the answer says the items are the tracker's only, unchecked against materialization records. Moved from Part B2 | POC-REQ-044 |
+| RFC8-8 | Planes (a) approved claims no proposal covers and (b) approved intent not yet materialized are enumerated, and each open item is checked against the materialization record; an orphaned Syzygy-created item is a Contradiction | **Unknown** — Amendment row (five answers); the answer says these are not enumerated and orphaned work is not checked | — |
+| RFC8-16 | Until a staleness bound is declared, claimed items render `activity-undetermined`, state-local, never the reason `no-currency-bound-declared` and never counted among Unknown reasons | covered — Amendment row (five answers); stated once for the claimed count, not on each card. Moved from Part B2 | POC-REQ-044 |
+| RFC8-16 | `active` and `stale-or-dead` against a declared bound with an effective owner act; worker liveness between signals; inadmissible liveness signals | **Unknown** — Amendment row (five answers); no bound is declared and no progress signal is read | — |
+| RFC8-19 | Absent cost renders Unknown, never zero | covered — Amendment row (five answers). Moved from Part B2 | POC-REQ-044 |
+| RFC8-19 | Every aggregate over partially known measures discloses its coverage and never renders as a complete total | **Unknown** — Amendment row (five answers); no cost measure is read, so no aggregate exists to disclose coverage | — |
 
 Part A totals `[Observed, computed by the sweep in "Verifying this
-table"]`: **154 consequence rows over 78 clauses — 112 covered,
-42 Unknown.**
+table"]`: **169 consequence rows over 85 clauses — 120 covered,
+49 Unknown.**
 
 **Amendment disclosure — the RFC1-26 closure row (ruling P-75 Q3).**
@@ -289,4 +304,5 @@ direct requirement additions.
 | Clause | Observable consequence (row label) | Disposition | Requirements |
 |---|---|---|---|
+| RFC8-18 | Cost renders as independent measures with declared source and evidence class, never a composite | **Unknown** — Amendment row (five answers); the cost answer is Unknown because no measure is read, so no requirement observes a measure or the independence rule. Moved from Part B2 | — |
 | RFC1-3 | Observed-source repository is read-only; no writes emitted to Butlers | **Unknown** — Borderline: out-of-scope bars "writes to the observed project," matching RFC1-3's read-only default, but no POC-REQ's oracle tests absence of writes; consent-record specifics have no matching requirement | — |
 | RFC1-6 | VCS objects (git revision) not reified as first-class nodes, enter only as identifier/evidence | **Unknown** — POC stamps facts with "exact git revision"; no requirement's oracle checks it isn't reified as a separate Commit node | — |
@@ -371,7 +387,5 @@ are listed so the owner can review or contest each one directly.
 | RFC2-16 | Aligned/Converged as formal claim predicates requiring gate-backed evaluation machinery; POC never computes or renders either |
 | RFC2-17 | Word reservation of "reconciliation"/"unsatisfied"/"contradiction-raised" against scheduler-substrate terms; Trajectory only maps status vocabulary to columns, never these reserved words |
-| RFC2-18 | The post-merge reconciliation chain state machine; not rendered anywhere in the POC |
 | RFC2-19 | Reconciliation trigger and V0/V1 staging of that chain; the chain itself is unbuilt |
-| RFC2-19(a) | Chain-state-local exemption for the reconciliation-pending Unknown; no such chain state exists to exempt |
 | RFC2-21 | Composite "no gap at E" semantics requiring Aligned/challenge/reconciled tracking; none of that machinery exists in POC |
 | RFC2-22 | Fixed-point idempotence across repeated evaluations of an unchanged no-gap snapshot; POC is one-shot, not a repeated-evaluation loop |
@@ -495,5 +509,4 @@ are listed so the owner can review or contest each one directly.
 | RFC8-6 | Compaction-record schema and retention-fact discipline; POC performs no compaction |
 | RFC8-7 | Pre-materialization Proposal lifecycle (drafted→…→materialized) and post-materialization scheduler-state read discipline; POC renders raw Beads status only, no Proposal lifecycle |
-| RFC8-8 | "What remains?" three-plane enumeration, orphaned-work Contradiction, exclusivity/candidate-futures; POC has no approved-intent/materialization enumeration or exclusivity groups |
 | RFC8-9 | SDR-18 Trajectory-vs-Polaris drafting-queue ownership boundary; POC's Polaris/Trajectory split has no drafting-queue concept |
 | RFC8-10 | Materialization-record one-way-door join (proposal identity, work-item-set, pinned revision); POC builds no materialization records — the relationship is left Unknown by design |
@@ -501,14 +514,9 @@ are listed so the owner can review or contest each one directly.
 | RFC8-13 | Per-value derivation logic (dispatch-eligibility queries, PR-lane facts, VCS merge facts, liveness); POC's kanban columns derive from Beads' own status field only |
 | RFC8-14 | Raw-status-visibility/`state-undetermined` resolution routed through the RFC3-16(a)-authorized governance-plane derivation mapping; POC's status mapping isn't a `.syzygy/governance/**` authorization-bearing artifact |
-| RFC8-16 | `active`/`stale-or-dead` liveness classification against a staleness bound with an effective state-(1) or state-(2) owner act and fail-closed missing/invalid behavior; POC's time visualization displays recorded instants, not a claim-liveness state machine |
 | RFC8-17 | Closed blocked-cause taxonomy; POC's kanban has no `blocked`-cause rendering |
-| RFC8-18 | Independent cost measures, no composite "effort" score; POC scope excludes cost accounting |
-| RFC8-19 | Absent-cost-means-Unknown-never-zero aggregation; same cost-machinery exclusion as RFC8-18 |
 | RFC8-20 | Execution-Record-sourced telemetry staging; POC has no Execution Records or telemetry |
 | RFC8-25 | Inherited-mutation sub-entry accounting and warrant-coverage test; no diff/mutation attribution in POC |
 | RFC8-26 | Compaction preservation set (what survives compaction); no compaction machinery in POC |
 | RFC8-27 | Expired-detail tier rendering after compaction/retention events; no compaction/retention machinery in POC |
-| RFC8-28 | Six-value RFC2-18 reconciliation chain-state field rendered beside normalized state; POC renders no such field — the relationship stays wholesale Unknown |
-| RFC8-29 | V0 per-item "reconciliation evidence absent/Unknown" rendering; POC doesn't attempt per-item reconciliation-evidence checks at all |
 | RFC8-32 | The RFC→OpenSpec phase-boundary/coverage-matrix authoring obligation; a process rule governing this sweep itself, not a capability-rendered entity or behavior |
 | RFC9-2 | This RFC's own semantics-vs-rendering-technology scope boundary — a self-referential meta-rule, not an entity/behavior POC renders |
@@ -559,8 +567,8 @@ Part B2 total `[Observed, computed]`: **218 clauses.**
 
 - Denominator: re-run the two counting methods named above; both must
-  return 324 for RFC1–9, and 78 + 28 + 218 = 324.
+  return 324 for RFC1–9, and 85 + 29 + 210 = 324.
 - Mapped set: `python3 scripts/build_three_surface_poc_spec_dependencies.py
   --check` — Part A's clause column must equal the generated
-  `contracts[]` union (78 identifiers).
+  `contracts[]` union (85 identifiers).
 - Totals: count rows and dispositions in this file's tables (e.g.
   Python over the `| RFC` rows); the printed totals must match the
diff --git a/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md b/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md
index 037001aa9..8757233f7 100644
--- a/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md
+++ b/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md
@@ -30,5 +30,5 @@ Reader notes, binding on how this file is read:
   observation* (001–004), *Work-item observation* (010–014), *Client
   rendering and parity* (020–022), *Polaris* (030–032), *Trajectory*
-  (040–043), *Orrery* (050–053), *Cross-cutting experience* (055, 060–061).
+  (040–044), *Orrery* (050–053), *Cross-cutting experience* (055, 060–061).
   Identifiers are stable and literal: minted once, amended in place,
   retired rather than reused, never renumbered (CC-SPEC-3). Gaps in the
@@ -1147,4 +1147,119 @@ warrants:
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
+  total, and SHALL say that these are the tracker's items only, not
+  checked against materialization records, and that RFC8-8's other two
+  planes (approved claims no proposal covers; approved intent not yet
+  materialized) are not enumerated.
+- *What is running* SHALL give how many served items the tracker marks
+  `in_progress`, worded as the tracker's claim, and their liveness as the
+  state `activity-undetermined` while no staleness bound is declared
+  (RFC8-16): state-local, carrying no RFC2-24 reason and no machine
+  Unknown, with what resolves it.
+- *What changed* and *what it cost* SHALL each be an Unknown with its
+  closed reason and route while no movement source or cost record is read
+  (RFC8-19: absent cost is Unknown, never zero).
+- *Verified against intent* SHALL give three separately labelled counts,
+  each with its own denominator, and no element SHALL add any two of them:
+  (a) Unknown-provenance, the served items with no traceable warrant, n of
+  N, referring to POC-REQ-014's governing-intent disclosure; (b) the
+  reconciliation chain, the count of materialized work items whose change
+  is on the default branch, of the materialized work items, its members
+  stated as "reconciliation evidence absent / Unknown" with their route
+  (run a reconciliation evaluation) and no RFC2-24 reason, or an Unknown
+  with its reason when the materialized item's change could not be
+  observed; and (c) orphaned work among the served items, stated as not
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
+  denominators; the liveness state; each Unknown part's reason and route.
+- **Oracle**: the five question labels and the machine answer's ids
+  equal the fixed order; each status count equals the count of served
+  items with that status, they sum to the served total, and the closed
+  count differs from the rendered Closed column when the selection leaves
+  a closed item outside; the claimed count equals the served `in_progress`
+  items, and the liveness state renders `activity-undetermined` with no
+  Unknown encoding, reason or machine Unknown; each Unknown part carries a
+  closed reason and a route and has a machine twin under its id
+  (POC-REQ-060); every count and every denominator on the page equals the
+  machine answer's; count (a) equals `workItems.governedByUnknownCount`;
+  count (b) is 1 of 1 with a merged materialized item and 0 of 0 without
+  one while (a) is unchanged; (c) renders Unknown, never a number; with
+  work items Unknown, five answers render and none carries a count.
+  Equality decides.
+- **Oracle independence**: expected counts are the checker's own fixture
+  rows, counted by the checker, never the renderer's model.
+- **Falsifier**: an answer missing, out of order or dropped for being
+  Unknown; a count taken over the rendered selection; status counts that
+  do not sum to the served total; a running count worded as observed
+  activity, or liveness rendered as `active` or under an RFC2-24 reason;
+  a count shown without its denominator; an Unknown part with no reason
+  or route; an element adding two
+  of the fifth answer's counts; orphaned work rendered as 0; a chain member
+  stated under an RFC2-24 reason; or "verified" naming a state.
+
+#### Scenario: Five answers before the board
+
+- **WHEN** 252 work items are served and the selection renders 250
+- **THEN** five answers render first, in order: the served count of each
+  tracker status summing to 252, the tracker's claimed count with liveness
+  `activity-undetermined`, what changed and what it cost as Unknowns with their reasons and
+  routes, and three separate counts for verification against intent; the
+  machine answer carries the same five with equal values
+
+#### Scenario: A merged materialized item enters the chain
+
+- **WHEN** the materialized work item's change is on the default branch
+- **THEN** the reconciliation-chain count is 1 of 1, stated with
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
+  contracts: [RFC2-18, RFC2-19(a), RFC2-24, RFC6-17, RFC8-8, RFC8-16, RFC8-19, RFC8-23, RFC8-28, RFC8-29]
+  policies: []
+  decisions: []
+  topology: []
+  parent_requirements: []
+```
+
 ### Requirement: POC-REQ-050 — Orrery projects declared mappings deterministically
 
````

## Dispositions

Review `docs/reviews/R-T3-FIVE-ANSWERS-1-RAW.md`, verdict `REVISE`, over
commit `d5d95bc00`. The exact text above is regenerated after the repairs;
the review is bound to the earlier bytes (rule 10). One review, repaired,
no confirmation round (D13).

1. (blocking) Running liveness carried `no-currency-bound-declared` and a
   machine Unknown, which RFC8-16 forbids — accepted. The answer renders
   the state `activity-undetermined` with no Unknown encoding, reason or
   `unknownSubjects` entry, and says that declaring the bound resolves it;
   `trajectory.answers[1].liveness` is that state. The spec, tests and
   sweep denominators (6 and 7, not 7 and 8) follow.
2. "What remains" misstated RFC8-8 — accepted. The answer and the spec say
   the counts are the tracker's items only, unchecked against
   materialization records, and that RFC8-8's planes (a) and (b) are not
   enumerated. The total still includes closed items: every status is
   listed so the counts sum to the served total, as the bead requires.
3. The cost basis denied an elapsed-time measure though lead time is
   derivable — accepted. It now names effort, compute, tokens and blocked
   time as not captured and lead time as derivable but not yet measured
   (`syzygy-t3jk.17` adds it).
4. Counts (b) and (c) had no denominator — accepted. (b) reads "m of k
   materialized work items" (`reconciliationChain.materialized`), (c) "of
   N served work items" (`orphanedWork.served`); the oracle now requires
   every count and denominator to equal the machine answer.
5. Part A overclaimed, and Part B2 rows went false — accepted. RFC2-19(a),
   RFC8-28 and RFC8-29 each gain an Unknown limb for what is not rendered
   (member identity, merge fact, intent revision; a chain state per item
   and on the member's card). RFC2-18, RFC8-8, RFC8-16 and RFC8-19 move to
   Part A with a covered and an Unknown limb each, and join POC-REQ-044's
   warrants; RFC8-18 moves to Part B1, since no measure is read. This
   departs from the bead's "leave RFC2-18, RFC8-8 and RFC8-16 as they are",
   which predates the rendering that made their Part B2 readings false.
   Totals re-derived by script: Part A 169 rows over 85 clauses (120
   covered, 49 Unknown), B1 29, B2 210; Part A equals the `contracts[]`
   union.
6. Notes: the orphaned-work basis now says no check is implemented; the
   "of N" denominators carry parity fields; the answers region has its own
   heading (`answers-heading`), and the board's browser test, which
   selects `.board-column h2`, is unaffected; the misplaced doc comment
   is moved; the census invariant is a finding, not an `assert`. The
   materialized item counted as Unknown-provenance predates this change
   and is filed as `syzygy-f74b`.

Rulings on the contested choices: liveness overruled (disposition 1);
orphaned-work reason accepted, with the basis amended; changed accepted;
cost accepted for the measures whose sources are not read (disposition 3).
