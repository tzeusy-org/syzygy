# Semantic delta T1 — Trajectory never words closure as done

**Artifact(s):** `openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md`;
`openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md`; generated `openspec/changes/three-surface-poc-experience/GOVERNING-DEPENDENCIES.md`
(regenerated, warrants unchanged).
**Stable IDs affected:** POC-REQ-043 (Required behavior, Scope, Oracle,
Falsifier, one new Scenario); POC-REQ-014's Scenario "A title names a
requirement" (wording only); CONTRACT-COVERAGE rows RFC8-2, RFC8-15,
RFC8-30 and RFC4-15.
**Change class:** Normative (POC-REQ-043 gains an obligation); the
POC-REQ-014 Scenario and RFC4-15 row edits are Clarifying.
**Author:** agent lane `coordinator:claude-20261122-81840bd5`, bead
`syzygy-t3jk.14` (Trajectory pursuit move T1), riding `syzygy-pya8`.
**Date:** 2026-11-22

## Current meaning

POC-REQ-043 forbids rendering closure as satisfaction or verification, and
its Falsifier names only "a verified, satisfied, or green encoding". It
says nothing about words. The board heads the closed column "Done" and the
in-progress column "In Progress"; the worker-change row reads "Planned",
"Active" or "Changed / merged". CONTRACT-COVERAGE calls RFC8-2(b)
("a view in which scheduler closure renders as done, green, or complete"),
RFC8-15 ("never under any label meaning done, complete, finished, or
resolved") and RFC8-30 (no aggregate, badge or prose sentence) covered by
POC-REQ-043, though none of its oracles reads a word [Observed: pursuit
`docs/pursuits/2026-11-21-trajectory-vision-pursuit.md`, move T1].

Riders (`syzygy-pya8`): since titles are withheld (SEC-5, PR #493), the
RFC4-15 row's "the work-item title, the only free text the POC reads" is
false, and POC-REQ-014's Scenario "WHEN a served item's title reads …"
describes a state that cannot be served.

## Proposed meaning

- POC-REQ-043 gains a wording limb: no heading, count label, badge,
  worker-change label or sentence on the surface, and no column value on
  the machine answer, names tracker closure or a tracker claim with a word
  done, complete, completed, finished, resolved, satisfied, in progress or
  active (the Oracle's regex). The
  closed column is "Closed", the claimed column "Claimed"; the worker row
  says only what git showed. One notice above the board states the rendered
  closed count and that verification is Unknown for each of them, with its reason.
- The Oracle publishes the predicate (case-folded, word-bounded regex over
  a stated population); the Falsifier adds the wording failure; one
  Scenario, "Closed is the tracker's word, not done", is added.
- POC-REQ-014's Scenario now says the tracker holds the title and the POC
  never reads it; its THEN clause is unchanged. The RFC4-15 row says the
  title is withheld and never read into the model.

## What explicitly does NOT change

- No layout change and no new tracker read; the notice's two counts are
  derived from `trajectory.rendered[]` on render, not a new served field; the card keeps the
  tracker's own status word, and `workerChange.state` values (`planned`,
  `active`, `changed-or-merged`) stay as identifiers.
- No other requirement, Scenario or coverage row moves; RFC8-16 stays out
  of scope (CONTRACT-COVERAGE records it), so "Claimed" claims no liveness.
- The closure notice is not a new Unknown disclosure and adds no
  `unknownSubjects` entry; each card keeps its own verification Unknown.
- POC-REQ-014's governing-intent behavior is unchanged.

## Warrant

RFC8-2(b), RFC8-15 and RFC8-30 (quoted above) already forbid the words;
the coverage matrix claimed them covered without an oracle that could
fail. This closes that gap. An agent adoption under VIS-4 as amended by
D10; nothing here is owner-class.

## Evidence or decision basis

- Pursuit move T1 and its finding ids in
  `docs/pursuits/2026-11-21-trajectory-vision-pursuit-data.json`.
- The code change in the same pull request:
  `packages/three-surface-poc-core/src/trajectory-projection.ts`
  (`STATUS_TO_COLUMN`), `apps/three-surface-poc/src/trajectory.ts`, and the
  sweep in `apps/three-surface-poc/src/trajectory.test.ts`.

## Terms introduced / retired

None. "Closed" and "Claimed" are column labels, not registry terms.

## Downstream impact

Method: `git grep -n -F` for `'Done'`, `'In Progress'`, `Changed / merged`
and `In Progress` over `apps/`, `packages/`, `scripts/` and
`docs/THREE-SURFACE-POC.md`, plus `Planned` and `Active` as label
literals in `trajectory.ts` (8 hits in 4 files, all updated: the projection
map, the page's column order and labels, two test assertions, and the doc).
Generated: `GOVERNING-DEPENDENCIES.md` (source digest);
`docs/evidence/spec-readability-reconciliation-2026-10-02/census.json` and
the R3 literal in `scripts/check_spec_reconciliation.py` (POC 26/34 → 26/35;
POC-REQ-043 1 → 2 Scenarios).

## Migration / supersession plan

All in one pull request: code, tests, doc, spec, coverage rows and
regenerated files. Adoption by an `AGENT-ADOPTIONS.md` row in a second
commit naming the change commit (the POC pins accept it since
`syzygy-k54o.5.1`), and tag `three-surface-poc-closure-wording-amendment-v1.0`
after merge.

## Review

**Required class:** one fresh-context review (CC-REV-1; one round, not
gating).
**Reviewer:** see the retained raw named in the pull request.
**Verdict:** recorded there verbatim.

## Exact text

````diff
diff --git a/openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md b/openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md
index 48c69b026..3b44e0f2f 100644
--- a/openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md
+++ b/openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md
@@ -138,5 +138,5 @@ exhausted — a reviewer who finds an unlisted limb has found a real gap.
 | RFC4-15 | Reads only the live/authoritative substrate, never a derived passive export, as a work-item source | covered — export-mutation oracle is exactly this authority-boundary check | POC-REQ-012 |
 | RFC4-15 | Degraded mode: substrate unreadable renders Unknown-with-reason, distinct from a genuinely empty result | covered — matches "export unavailable → last-good marked stale," applied as Unknown-vs-empty distinction | POC-REQ-013 |
-| RFC4-15 | Authority is work lifecycle state, never intent: the work-item title, the only free text the POC reads, is never read as a work item's governing intent | covered — Amendment row; the fixture-title counterexample observes it | POC-REQ-014 |
+| RFC4-15 | Authority is work lifecycle state, never intent: the work-item title, which the POC withholds (SEC-5) and never reads into the model, is never a work item's governing intent | covered — Amendment row; the fixture-title counterexample observes it | POC-REQ-014 |
 | RFC4-26 | Capability/entity↔code mappings are declared-only, inferred mappings excluded | covered — Orrery's declared-mappings-only design is exactly class (i) with class (ii) excluded, matching the scope's "no inferred mappings or edges" | POC-REQ-050, POC-REQ-052 |
 | RFC4-27 | Unmapped/absence claim requires an executed coverage record with reconciling counts, never silent absence | covered — "unmapped code a visible Unknown region with reconciling counts" is this clause's coverage-record duty applied to Orrery | POC-REQ-051 |
@@ -179,7 +179,7 @@ exhausted — a reviewer who finds an unlisted limb has found a real gap.
 | RFC7-34 | Every distinction recoverable without colour/position/layout; legended encodings | covered | POC-REQ-061 |
 | RFC7-34 | Disclosure paths operable without a pointing device | covered | POC-REQ-061, POC-REQ-022 |
-| RFC8-2 | Beads closure/activity never rendered as done/green/complete | covered — Anti-thesis limb (b) matches directly; limb (a) [no editable store — POC never writes] and limb (c) [fleet-change/cost/authority accounting] aren't touched by POC scope, so only (b) rows here | POC-REQ-043 |
+| RFC8-2 | Beads closure/activity never rendered as done/green/complete | covered — Anti-thesis limb (b) matches directly, including its wording: closure is headed "Closed", never a word for done (POC-REQ-043 wording limb); limb (a) [no editable store — POC never writes] and limb (c) [fleet-change/cost/authority accounting] aren't touched by POC scope, so only (b) rows here | POC-REQ-043 |
 | RFC8-12 | Kanban state field renders only a declared, closed set of status values — no minted/free-form values | covered — POC's "declared closed status-vocabulary mapping" exercises the closed-vocabulary/no-minting invariant; the specific 13-value partition, chain-state field separation, and `reconciled` carve-out aren't adopted since Trajectory renders no reconciliation chain state | POC-REQ-040 |
-| RFC8-15 | Closure without a merge/verification fact never rendered as a normalized "done"/complete/finished/resolved label | covered — Matches the terminal-state closure-fallacy rule (`closed-unmerged` analog) this clause states directly | POC-REQ-043 |
+| RFC8-15 | Closure without a merge/verification fact never rendered as a normalized "done"/complete/finished/resolved label | covered — Matches the terminal-state closure-fallacy rule (`closed-unmerged` analog) this clause states directly; the wording limb forbids done/complete/finished/resolved on every heading, label and served column value | POC-REQ-043 |
 | RFC8-22 | The unestablished first link of the chain, work item to warrant, renders Unknown with its RFC2-24 reason, never silently skipped | covered — Amendment row | POC-REQ-014 |
 | RFC8-22 | A join is never reconstructed by similarity, interpolation or inference | covered — Amendment row; the fixture-title counterexample observes the title case | POC-REQ-014 |
@@ -196,5 +196,5 @@ exhausted — a reviewer who finds an unlisted limb has found a real gap.
 | RFC8-24 | The rest of the aggregation rule: expansion to members outside Trajectory's rendered selection, and the full RFC6-17 disclosure the rendering rule cites (per-label, per-tier, per-freshness counts, the equivalence tuple) for this aggregate | **Unknown** — Amendment row; no requirement observes either for the governing-intent count | — |
 | RFC8-24 | These are claim reasons only: the normalized state's four absence values take no reason, are counted separately, and are never absorbed by an aggregate of Unknowns | **Unknown** — Amendment row; Trajectory renders no RFC8-12 normalized state with absence values, so no requirement observes the separation | — |
-| RFC8-30 | No aggregate, badge, progress bar, or prose sentence renders closed work as done/complete/satisfied absent verification evidence | covered — Same closure-fallacy prohibition restated at module-3 level; disclosed fold — RFC8-2(b), RFC8-15, and RFC8-30 all map to the same one POC requirement from three angles | POC-REQ-043 |
+| RFC8-30 | No aggregate, badge, progress bar, or prose sentence renders closed work as done/complete/satisfied absent verification evidence | covered — Same closure-fallacy prohibition restated at module-3 level, and the standing closure notice states closed counts with verification Unknown, never a done sentence; disclosed fold — RFC8-2(b), RFC8-15, and RFC8-30 all map to the same one POC requirement from three angles | POC-REQ-043 |
 | RFC8-31 | Every rendered state/cause/absence value recoverable by text alone (no colour/position-only encoding); every traversal keyboard-operable | covered — Non-visual-parity limb matches the design-token/epistemic-encoding and accessibility-floor requirements directly; the RFC 0006 selection/drawer/scenario-context conformance bundle this clause also invokes is not touched (no drawer/selection UX in the POC-REQ list), so that limb is omitted rather than rowed | POC-REQ-060, POC-REQ-061 |
 | RFC9-1 | Map surface is a non-authoritative projection of the shared fact model | covered — POC's Orrery projects the same shared fact model that parity (020) enforces; intended/proposed/historical planes and RFC2/RFC6 vocabulary limbs not touched | POC-REQ-020 |
diff --git a/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md b/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md
index 1e28c408c..68b2599be 100644
--- a/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md
+++ b/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md
@@ -664,5 +664,7 @@ warranted, green or complete state.
 #### Scenario: A title names a requirement
 
-- **WHEN** a served item's title reads "Implement POC-REQ-010"
+- **WHEN** the tracker holds an item whose title reads "Implement
+  POC-REQ-010" (the POC withholds titles, SEC-5, so the title is never read
+  into the model)
 - **THEN** that item's `governedBy` is the same Unknown, and nothing served
   for it names POC-REQ-010 as its governing intent
@@ -1044,7 +1046,19 @@ Group: Trajectory. Form: **prohibition**.
 
 **Required behavior.** Trajectory SHALL NOT render work-item activity,
-closure, or merge state as intent satisfaction or verification.
-
-- **Scope.** every satisfaction/verification encoding on the surface.
+closure, or merge state as intent satisfaction or verification. No text in
+the wording population (Scope) SHALL name tracker closure or a tracker claim
+with the words done, complete, completed, finished, resolved, satisfied, in
+progress or active: the closed column is headed "Closed" and the claimed
+column "Claimed", and the worker-change state label says only what git
+showed on the bounded seam. One notice above the board SHALL state how many
+rendered items are closed and that verification is Unknown for each of
+them, with its reason.
+
+- **Scope.** every satisfaction/verification encoding on the surface, and
+  the wording population: the page heading and lede, every board heading
+  and label, every worker-change label, every notice, and every
+  `trajectory.rendered[].column` and status-to-column value on the machine
+  answer. The card's own tracker status word and the worker-change state
+  identifier are outside it.
 
 - **Case (counterexample schema + sweep)**: a checker closes an
@@ -1056,9 +1070,15 @@ closure, or merge state as intent satisfaction or verification.
 - **Oracle**: the rendered verification encoding equals the machine
   answer's relationship state (not the item's activity state); equality
-  decides.
+  decides. For wording, a case-folded, word-bounded match of
+  `done|complete|completed|finished|resolved|satisfied|in[ _-]progress|active`
+  over the wording population finds nothing, and the notice's closed count
+  equals the machine answer's rendered items with status closed.
 - **Oracle independence**: the relationship state comes from the
   machine answer; the checker induced the mismatch.
 - **Falsifier**: a closed or merged item rendered with a verified,
-  satisfied, or green encoding while its relationship lacks evidence.
+  satisfied, or green encoding while its relationship lacks evidence; or a
+  heading, label, sentence or served column value in the wording
+  population that names closure as done, complete, finished or resolved,
+  or a claim as in progress or active.
 
 #### Scenario: Closed but unverified
@@ -1069,4 +1089,13 @@ closure, or merge state as intent satisfaction or verification.
   verification state as not verified/Unknown, distinctly encoded
 
+#### Scenario: Closed is the tracker's word, not done
+
+- **WHEN** the board renders closed and claimed items
+- **THEN** their columns read "Closed" and "Claimed" on the page and on the
+  machine answer, no heading, label or notice in the wording population
+  reads done, complete, finished, resolved, in progress or active, and one
+  notice above the board states the rendered closed count and that
+  verification is Unknown for each of them
+
 ```yaml
 warrants:
````

## Dispositions

Review `docs/reviews/R-T1-CLOSURE-WORDING-1-RAW.md`, verdict
`CONFIRM WITH EXCEPTIONS`, over commit `a765e621f`. The exact text above is
regenerated after the repairs; the review is bound to the earlier bytes
(rule 10).

1. Worker labels never reached the sweep — accepted. The worker-change test
   now renders each of the three states on its card, asserts its label, and
   runs the sweep with one label present.
2. The notice gave no reason — accepted. It now says no test or merge
   evidence is ingested for a work item and that each card carries its own
   disclosure and route.
3. Required behavior wider than the oracle — accepted. Required behavior
   now names the wording population in Scope and the closed word list
   rather than "a word meaning"; badges stay under the first limb.
4. The regex missed `satisfied` and `in-progress`/`in_progress` — accepted.
   The test and the Oracle now use
   `done|complete|completed|finished|resolved|satisfied|in[ _-]progress|active`.
5. The population runs from the board to the page end — noted; it is a
   superset of the board, so it can only find more.
6. The answer-side mutant could be skipped — accepted. On the 252-row
   fixture the test now asserts a closed item exists before mutating.
7. Mutants cover only the heading and the served column — noted; the regex
   is shared by every arm.
8. The notice's counts have no served field — noted; the bead asks for a
   count derived from the model, and the answer's `trajectory.rendered[]`
   is the twin.
9. "Named by the tracker's word" was false for Claimed and Backlog —
   accepted; the doc now says the heading never uses a word for done.
10. "The worker-change row says only what git showed" — accepted; it now
    says the worker-change state label.
11. "No new fact" was loose and the sweep missed `Planned`/`Active` —
    accepted; both sentences above are corrected.
12. The adoption row's shape — accepted as the plan: the row names
    `three-surface-poc-experience` and the change commit, in the
    seven-column form.
