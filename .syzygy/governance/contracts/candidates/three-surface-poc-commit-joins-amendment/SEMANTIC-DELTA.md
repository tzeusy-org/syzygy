# Semantic delta T10 S1 — Work items join the observed repository's commits by exact identifier tokens

**Artifact(s):** `openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md`;
`openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md`; generated
`openspec/changes/three-surface-poc-experience/GOVERNING-DEPENDENCIES.md`.
**Stable IDs affected:** POC-REQ-064 (new: the commit join, two
Scenarios). CONTRACT-COVERAGE: RFC4-22 moves from Part B2 (one covered,
two Unknown rows) and RFC8-21 from Part B1 (one covered, one Unknown) to
Part A. Part A goes from 179 rows (129 covered, 50 Unknown) over 88
clauses to 184 (131, 53) over 90; Part B1 from 29 rows over 28 clauses to
28 over 27, and Part B2 from 208 to 207 clauses (the 324 accepted clauses
unchanged). RFC2-19 stays in Part B2: the join performs no reconciliation
evaluation, so it is cited in the decision below as context, not mapped.
**Change class:** Normative (a new requirement and a new read of commit
subjects, for tokens only).
**Author:** agent lane `coordinator:claude-20261122-81840bd5`, bead
`syzygy-t3jk.25` (Trajectory pursuit move T10, slice S1).
**Date:** 2026-11-26

## Current meaning

The POC reads no commit of the observed repository for work items. The
worker-change observer reads commits on one seam for one materialized
item; no other item has any commit. CONTRACT-COVERAGE records RFC4-22 as
believed not applicable ("Trajectory reads raw work items only, no
branch/commit/PR correlation"), RFC2-19 as believed not applicable ("the
chain itself is unbuilt"), and RFC8-21 as applicable but uncovered.

## Proposed meaning

- **Read.** In the observation pass that reads the work items, one
  `git log --max-count=5001 --format=%H%x1f%cI%x1f%s <revision> --`, from
  the pinned repository revision and no other ref, newest first, at most
  5,000 commits kept.
- **Token rule.** A token is a maximal run of letters, digits, `.`, `_` and
  `-`, with `.`, `_` and `-` trimmed from its ends. A commit names a served
  item when a token equals its identifier exactly: no prefix, substring or
  case-folded match.
- **Keep.** The subject is read for its tokens and dropped. The join keeps
  each commit's hash and committer instant, under each item it names. The
  author is never read.
- **Serve.** `commitJoins` on the machine answer: the revision, basis
  `naming-convention`, fidelity `reduced-fidelity` with cause
  `derived-from-convention`, the bound, commits read, whether older history
  went unread, joined and unjoined counts, and the named items with their
  commits.
- **Unknown.** One closed reason: `work-items-unobserved`,
  `repository-revision-unavailable`, `commit-history-read-failed` or
  `commit-history-malformed` (a row of an unexpected shape, an empty read,
  or a newest row that is not the pinned revision). Never an observed zero,
  never fuzzy-matched.
- **Absence.** A served item with no entry is not observed to have no
  commits; when older history went unread it may be named there. No
  per-item Unknown is served, and CONTRACT-COVERAGE says so in an Unknown
  RFC4-22 row.

## What explicitly does NOT change

- No subject, author or other commit text is stored, served, indexed or
  sent; no title is read here.
- The page renders nothing new: showing merged apart from closed is T10 S2
  (`syzygy-t3jk.26`).
- No reconciliation chain state is computed (RFC2-18's per-item chain row
  stays Unknown).
- The worker-change observer is unchanged.

## The merge-fact confinement (RFC2-18/19, `syzygy-a4ry`)

The bead asked first whether this read is a merge fact that the accepted
text confines to a deliberately triggered pass. The clauses, quoted:

- RFC2-18: "**reconciliation-pending** attaches automatically and
  deterministically at the first evaluation that captures the merge fact
  (inside RFC2-19's deliberately triggered passes — never on a live merge
  event)".
- RFC2-19: "The loop is human-triggered: reconciliation evaluations run
  inside a deliberately triggered propagate/sync or observation pass, never
  autonomously on merge events."

Decision [Inferred, from the code read]: the join is within the
confinement under all three readings `syzygy-a4ry` names. The read runs in
`buildTrajectorySlice` (`model-slices.ts`), inside the one observation
pass; the POC runs that pass when the daemon starts, when an operator
re-observes (`reobserve-action.ts`), and in the rebuild after an operator
materializes (`afterMaterialized` in `reobserve-session.ts`), each a human
act, with no timer and no merge hook
[Observed: no `setInterval` or re-observation timer in
`apps/three-surface-poc/src`]. So the narrow reading (merges of materialized
items), the wide reading (any merge) and the broadest reading (no
unprompted re-observation at all) are each met. The join also computes no
chain state. No contract text changes, and no adoption of the
clarification is needed here; the decision is recorded as a comment on
`syzygy-a4ry`, which stays open for the clarification itself.

## Choices the review may contest

1. **5,000 commits.** The bound keeps the read and the answer small; on the
   proving project it reaches back to 2026-04-25, seven months before its
   2026-11-25 head [Observed: the 5,000th commit's committer date], and
   older history is stated unread (`truncated`), never counted as
   unjoined.
2. **Token trimming.** Trimming `.`, `_` and `-` lets "closes bu-a1." join;
   tracker identifiers never end in those characters [Inferred, from the
   identifier shapes observed]. Everything else is exact equality.
3. **Merge subjects join.** "Merge pull request #7 from org/agent/bu-a1"
   names `bu-a1` through its branch path. That is the naming convention
   too; the join's basis says so.
4. **The newest-row check.** A read from the pinned revision must return
   that revision first; anything else is malformed rather than trusted.
5. **Serving per item, not per commit.** The bead asks for per-item
   commits; a commit naming two items appears under each.

## Machine-answer change

`PocModel` gains `commitJoins`: `{kind: 'observed', revision, basis,
fidelity, cause, bound, read, truncated, joined, unjoined, items: [{id,
commits: [{hash, at}]}]}` or `{kind: 'unknown', reason}`.

## Warrant

- RFC4-22, quoted: "Every adapter-owned link of the change-accounting chain
  — work item ↔ branch/worktree, branch → commits, commit → PR, PR → merge
  fact, gate outcome → artifact — declares its **basis**: ...
  `naming-convention` (derived from a path/branch/message convention).
  Convention-based joins are legitimate and labeled as such; they are
  `reduced-fidelity` with cause `derived-from-convention` ... A join that can
  no longer be established (branch deleted, message tag absent) renders
  Unknown — never fuzzy-matched."
- RFC8-21, quoted: "Trajectory must walk, in both directions, the chain ...
  work item → execution run(s) → commits/PR → merge fact ... each rendered
  with its declared basis (`recorded-identity` vs `naming-convention`, the
  latter `reduced-fidelity`)."
- VIS-3: identifiers alone do not make the board legible; which work merged
  is a question Trajectory must answer.
- The wave's shared rule: the commit-subject read is adopted by this row,
  "read for tokens and never stored". Reading the owner's own repository
  needs no other record (VIS-4).

## Evidence or decision basis

- `commit-joins.test.ts` (new, 5 tests): the token rule's literals; the
  join with literal hashes, instants and counts, no marker or subject word
  in the result, and the exact read arguments; the bound and truncation at
  5,000 and 5,001; an observed zero; every Unknown reason, including a
  malformed hash after a good first row and an empty read.
- `trajectory.test.ts`, "Commit joins in the observation": a real
  repository through the model and `GET /api/poc`: one naming commit joins,
  a later naming commit after the observed revision does not, and no
  subject marker reaches either channel.
- Proving-project measurement:
  `docs/evidence/syzygy-t3jk-25/proving-project-commit-join-measurement-2026-11-26.json`:
  at Butlers `74d81c49`, `observeCommitJoins` itself, run over the history
  with 10,517 tracker identifiers, joins 3,804 of the newest 5,000 commits
  (76%) to 3,532 items; an independent Python replica agrees; history
  beyond 5,000 is not read.
- Rule 6: fourteen mutants at `1eafbd3c2`, each failing at least one test:
  a prefix token joins; a case-folded token joins; punctuation untrimmed;
  subjects split on whitespace only; the read over `--all`; the bound
  dropped; truncation hidden; a read failure served as an observed zero; a
  malformed row accepted; the newest-row check dropped; the revision check
  dropped; the subject kept; unjoined miscounted; the model dropping the
  join. Record:
  `docs/evidence/syzygy-t3jk-25/commit-join-mutation-2026-11-26.json`.
  The review's repairs add two cases, each confirmed to fail its mutant:
  the empty-read guard restored to `read > 0`, and the per-row hash check
  dropped (Dispositions 1 and 5).

## Downstream impact

Method: `git grep` over `apps/`, `packages/` and `scripts/` for
`commitJoins`, `PocModel` keys and `buildTrajectorySlice`.

- `commit-joins.ts`: new.
- `model-slices.ts`, `model.ts`, `index.ts`: the field and its wiring.
- `docs/THREE-SURFACE-POC.md`: one paragraph.
- R3 reads two new POC-REQ-064 scenarios from this adoption row;
  `census.json` regenerated.
- The N6 boundary register: POC-REQ-064 is appended after every pinned
  section; `build_boundary_register.py --check` verifies 98 entries.

## Migration / supersession plan

1. One pull request.
2. Adoption by an `AGENT-ADOPTIONS.md` row in a second commit, naming the
   change commits.
3. After merge, the tag `three-surface-poc-commit-joins-amendment-v1.0`.

## Review

**Required class:** one fresh-context review (CC-REV-1; one round, not
gating). **Reviewer and verdict:** the retained raw named in the pull
request.

## Exact text

````diff
diff --git a/openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md b/openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md
index f1405d17c..7d3f52232 100644
--- a/openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md
+++ b/openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md
@@ -46,13 +46,13 @@ Every clause was judged exactly once and lands in exactly one part:
 | RFC1 | 39 | 12 | 4 | 23 |
 | RFC2 | 27 | 10 | 0 | 17 |
 | RFC3 | 38 | 0 | 0 | 38 |
-| RFC4 | 32 | 10 | 1 | 21 |
+| RFC4 | 32 | 11 | 1 | 20 |
 | RFC5 | 27 | 1 | 15 | 11 |
 | RFC6 | 28 | 10 | 1 | 17 |
 | RFC7 | 41 | 12 | 4 | 25 |
-| RFC8 | 32 | 16 | 1 | 15 |
+| RFC8 | 32 | 17 | 0 | 15 |
 | RFC9 | 60 | 17 | 2 | 41 |
-| **Total** | **324** | **88** | **28** | **208** |
+| **Total** | **324** | **90** | **27** | **207** |
 
 The Part A clause set is exactly the `contracts[]` union in the
 generated `GOVERNING-DEPENDENCIES.md` (verified below).
@@ -251,10 +251,15 @@ exhausted — a reviewer who finds an unlisted limb has found a real gap.
 | RFC8-13 | The rest of the normalized work-state, PR, VCS and liveness derivations | **Unknown** — Amendment row (eligibility); the metadata read carries no such inputs | — |
 | RFC8-17 | The blocked cause set includes the proven dependency cause and explicitly discloses cause Unknown when empty | covered — Amendment row (eligibility); the mixed edge fixture keeps the proven cause while overall eligibility is undetermined. Moved from Part B2 | POC-REQ-062 |
 | RFC8-17 | Derivations of `pr-wait`, `external` and `decision` blocked causes | **Unknown** — Amendment row (eligibility); those input families remain unread | — |
+| RFC4-22 | The work item ↔ commit link declares its basis, `naming-convention`, and is `reduced-fidelity` with cause `derived-from-convention`, and is never fuzzy-matched; a history that cannot be read is Unknown with its reason | covered — Amendment row (commit joins). Moved from Part B2 | POC-REQ-064 |
+| RFC4-22 | A per-item join that cannot be established renders Unknown | **Unknown** — Amendment row (commit joins); an item no read commit names gets no entry and no per-item state, and beyond the bound its absence is not "no commits" | — |
+| RFC4-22 | The work item ↔ branch/worktree, commit → PR, PR → merge-fact and gate-outcome → artifact links | **Unknown** — Amendment row (commit joins); those inputs are unread | — |
+| RFC8-21 | The chain's work item → commits link, joined on an RFC4-22 adapter join with its declared basis | covered — Amendment row (commit joins); the machine answer serves it. Moved from Part B1, whose row said POC-REQ-014 renders the chain's first link as Unknown and no requirement renders any other | POC-REQ-064 |
+| RFC8-21 | Trajectory walks the whole chain in both directions, rendering each link's basis and its thinness as thinness | **Unknown** — Amendment row (commit joins); no requirement renders the commit link or walks the chain | — |
 
 Part A totals `[Observed, computed by the sweep in "Verifying this
-table"]`: **179 consequence rows over 88 clauses — 129 covered,
-50 Unknown.**
+table"]`: **184 consequence rows over 90 clauses — 131 covered,
+53 Unknown.**
 
 **Amendment disclosure — the RFC1-26 closure row (ruling P-75 Q3).**
 The signed RFC1-26 row whose consequence reads "Relations outside the closed
@@ -339,12 +344,11 @@ direct requirement additions.
 | RFC7-3 | No other component/citation resolves to a Polaris rendering as authority | **Unknown** — applicable since Polaris is built and Cap1 runtime is reused, but no POC-REQ oracle checks cross-component citation | — |
 | RFC7-12 | Adjudicative source material (e.g. work-item text) rendered as owned text, never paraphrased in normative position | **Unknown** — applicable to any quoted work-item/structure fact; no POC-REQ tests verbatim-vs-paraphrase | — |
 | RFC7-16 | Status renders minimal (label+tier+reason+freshness), no composite maturity number/metric walls | **Unknown** — reuses Cap1 epistemic vocabulary; no POC-REQ tests the no-composite-score prohibition | — |
-| RFC8-21 | Trajectory walks the warrant→plan→materialization→work-item→run→PR→merge→reconciliation chain in both directions, each link with its declared basis, thinness rendered as thinness | **Unknown** — Amendment row, moved from Part B2: POC-REQ-014 renders the chain's first link, work item to warrant, as Unknown (RFC8-22), so the POC now renders part of the chain this clause governs; no requirement walks the chain or renders any other link | — |
 | RFC9-15 | Adding an entity must not perturb existing declared entities' coordinates across re-observations | **Unknown** — Borderline: POC's digest doesn't say whether coordinates are stable across repeated observations of an evolving repo one way or the other | — |
 | RFC9-26 | Channel/encoding meaning is declared once and stays consistent, never repurposed or unlegended | **Unknown** — POC-REQ-060's one-token-set requirement is adjacent, but no requirement tests a fail-closed unregistered-channel behavior or a formal registry | — |
 
-Part B1 totals `[Observed, computed]`: **29 consequence rows over
-28 clauses — all Unknown.**
+Part B1 totals `[Observed, computed]`: **28 consequence rows over
+27 clauses — all Unknown.**
 
 ## Part B2 — clauses believed not applicable (author's reading, non-binding)
 
@@ -451,7 +455,6 @@ are listed so the owner can review or contest each one directly.
 | RFC4-19 | The minimum durable run envelope's fields; no Execution Records exist in POC |
 | RFC4-20 | Enrichment-optionality and derivation-collision handling for run records; no run records exist to collide |
 | RFC4-21 | Model/timing/token/cost semantics on run records; no cost/token/run accounting in POC scope |
-| RFC4-22 | The change-accounting chain's join bases (work item↔branch↔commit↔PR↔merge↔gate); Trajectory reads raw work items only, no branch/commit/PR correlation |
 | RFC4-23 | Worker-liveness rendering from progress signals and a staleness bound carrying an effective state-(1) or state-(2) owner act, never the act itself as liveness evidence; Trajectory renders item status/instants, not live worker liveness — live-runtime relationship stays Unknown |
 | RFC4-24 | The reduced-fidelity granularity/cause labeling schema (RFC2-25 tiers); POC renders binary Observed/Unknown, not tiered reduced-fidelity facts |
 | RFC4-25 | Per-observer degradation-state registry declarations and cross-evaluation staleness rendering; no registry, no multi-evaluation staleness in the single-snapshot POC |
@@ -568,15 +571,15 @@ are listed so the owner can review or contest each one directly.
 | RFC9-51 | Illumination/highlight as non-truth-bearing interaction state; no highlighting feature established in POC scope |
 | RFC9-52 | The RFC-prose-to-OpenSpec authority boundary and coverage-matrix obligation; this non-binding sweep doesn't cite RFC9 as binding authority for the POC spec |
 
-Part B2 total `[Observed, computed]`: **208 clauses.**
+Part B2 total `[Observed, computed]`: **207 clauses.**
 
 ## Verifying this table
 
 - Denominator: re-run the two counting methods named above; both must
-  return 324 for RFC1–9, and 88 + 28 + 208 = 324.
+  return 324 for RFC1–9, and 90 + 27 + 207 = 324.
 - Mapped set: `python3 scripts/build_three_surface_poc_spec_dependencies.py
   --check` — Part A's clause column must equal the generated
-  `contracts[]` union (88 identifiers).
+  `contracts[]` union (90 identifiers).
 - Totals: count rows and dispositions in this file's tables (e.g.
   Python over the `| RFC` rows); the printed totals must match the
   count — they were computed that way, not transcribed.
diff --git a/openspec/changes/three-surface-poc-experience/GOVERNING-DEPENDENCIES.md b/openspec/changes/three-surface-poc-experience/GOVERNING-DEPENDENCIES.md
index 534cf3d6a..d8df1ed27 100644
--- a/openspec/changes/three-surface-poc-experience/GOVERNING-DEPENDENCIES.md
+++ b/openspec/changes/three-surface-poc-experience/GOVERNING-DEPENDENCIES.md
@@ -8,7 +8,7 @@
 > here is overwritten and `--check` fails first. Identifiers only —
 > nothing here quotes or paraphrases any clause.
 >
-> Source: `spec.md` sha256 `9140114a69cae6e19bdb850dc0444c673d7aa844d1aa69156148c8e56f000fb6` — 30 requirement(s), 112 distinct authorities.
+> Source: `spec.md` sha256 `4dbf3bacd2b291d9c2f671fb68bad9f57eccb37bc5347c5b40f6a504184ad6c7` — 31 requirement(s), 114 distinct authorities.
 
 ## doctrine (10)
 
@@ -19,13 +19,13 @@
 | `SEC-3` | POC-REQ-002, POC-REQ-021 |
 | `SEC-5` | POC-REQ-002, POC-REQ-062, POC-REQ-063 |
 | `VIS-1` | POC-REQ-003, POC-REQ-013, POC-REQ-014, POC-REQ-020, POC-REQ-022, POC-REQ-030, POC-REQ-031, POC-REQ-032, POC-REQ-042, POC-REQ-043, POC-REQ-051, POC-REQ-052, POC-REQ-053, POC-REQ-055, POC-REQ-060, POC-REQ-061 |
-| `VIS-2` | POC-REQ-001, POC-REQ-003, POC-REQ-010, POC-REQ-013, POC-REQ-014, POC-REQ-022, POC-REQ-031, POC-REQ-032, POC-REQ-041, POC-REQ-042, POC-REQ-043, POC-REQ-044, POC-REQ-045, POC-REQ-051, POC-REQ-052, POC-REQ-060, POC-REQ-062, POC-REQ-063 |
-| `VIS-3` | POC-REQ-020, POC-REQ-022, POC-REQ-030, POC-REQ-040, POC-REQ-042, POC-REQ-044, POC-REQ-050, POC-REQ-053, POC-REQ-060, POC-REQ-061, POC-REQ-063 |
+| `VIS-2` | POC-REQ-001, POC-REQ-003, POC-REQ-010, POC-REQ-013, POC-REQ-014, POC-REQ-022, POC-REQ-031, POC-REQ-032, POC-REQ-041, POC-REQ-042, POC-REQ-043, POC-REQ-044, POC-REQ-045, POC-REQ-051, POC-REQ-052, POC-REQ-060, POC-REQ-062, POC-REQ-063, POC-REQ-064 |
+| `VIS-3` | POC-REQ-020, POC-REQ-022, POC-REQ-030, POC-REQ-040, POC-REQ-042, POC-REQ-044, POC-REQ-050, POC-REQ-053, POC-REQ-060, POC-REQ-061, POC-REQ-063, POC-REQ-064 |
 | `VIS-4` | POC-REQ-062 |
 | `VIS-6` | POC-REQ-001, POC-REQ-004, POC-REQ-010, POC-REQ-011, POC-REQ-012, POC-REQ-014, POC-REQ-040, POC-REQ-041, POC-REQ-045, POC-REQ-050, POC-REQ-052 |
 | `VIS-7` | POC-REQ-001, POC-REQ-004, POC-REQ-010, POC-REQ-011, POC-REQ-012, POC-REQ-014, POC-REQ-020, POC-REQ-031, POC-REQ-041, POC-REQ-050, POC-REQ-055 |
 
-## contracts (88)
+## contracts (90)
 
 | Authority | Cited by |
 |---|---|
@@ -59,6 +59,7 @@
 | `RFC4-11` | POC-REQ-001 |
 | `RFC4-12` | POC-REQ-001, POC-REQ-002, POC-REQ-003 |
 | `RFC4-15` | POC-REQ-010, POC-REQ-012, POC-REQ-013, POC-REQ-014, POC-REQ-062 |
+| `RFC4-22` | POC-REQ-064 |
 | `RFC4-26` | POC-REQ-050, POC-REQ-052 |
 | `RFC4-27` | POC-REQ-051 |
 | `RFC5-16` | POC-REQ-002, POC-REQ-063 |
@@ -93,6 +94,7 @@
 | `RFC8-17` | POC-REQ-062 |
 | `RFC8-18` | POC-REQ-045 |
 | `RFC8-19` | POC-REQ-044, POC-REQ-045 |
+| `RFC8-21` | POC-REQ-064 |
 | `RFC8-22` | POC-REQ-014 |
 | `RFC8-23` | POC-REQ-014, POC-REQ-042, POC-REQ-044 |
 | `RFC8-24` | POC-REQ-014, POC-REQ-043 |
@@ -139,11 +141,11 @@
 
 | Authority | Cited by |
 |---|---|
-| `POC-REQ-010` | POC-REQ-062, POC-REQ-063 |
+| `POC-REQ-010` | POC-REQ-062, POC-REQ-063, POC-REQ-064 |
 | `POC-REQ-012` | POC-REQ-062 |
 | `POC-REQ-013` | POC-REQ-062 |
 | `POC-REQ-014` | POC-REQ-042, POC-REQ-063 |
-| `POC-REQ-020` | POC-REQ-062, POC-REQ-063 |
+| `POC-REQ-020` | POC-REQ-062, POC-REQ-063, POC-REQ-064 |
 | `POC-REQ-040` | POC-REQ-062 |
 | `POC-REQ-041` | POC-REQ-045 |
 | `POC-REQ-042` | POC-REQ-062 |
diff --git a/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md b/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md
index 16fb65874..f731082dc 100644
--- a/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md
+++ b/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md
@@ -2140,3 +2140,95 @@ warrants:
   topology: []
   parent_requirements: [POC-REQ-010, POC-REQ-014, POC-REQ-020]
 ```
+
+### Requirement: POC-REQ-064 — Work items join the observed repository's commits by exact identifier tokens
+
+Group: Work-item observation. Form: **state projection/query**.
+
+**Required behavior.** In the observation pass that reads the work items,
+the POC SHALL read the observed repository's history once, from the
+repository revision the observation pins and from no other ref, newest
+first and at most 5,000 commits, and SHALL join each served work item to
+the commits that name it by the naming convention (RFC4-22).
+
+- **Token rule.** A commit names an item when a token of its subject equals
+  the item's identifier exactly. A token is a maximal run of letters,
+  digits, `.`, `_` and `-`, with `.`, `_` and `-` trimmed from its ends. No
+  prefix, substring or case-folded match joins, and a token that equals no
+  served identifier joins nothing.
+- **What is kept.** Each commit's subject is read for its tokens and then
+  dropped: it is never stored, served, indexed or sent. The join keeps only
+  each commit's hash, its committer instant and the identifiers it names.
+  The author is never read.
+- **What is served.** The machine answer serves the join once per
+  observation: the revision read, the basis `naming-convention`, the
+  fidelity `reduced-fidelity` with cause `derived-from-convention`, the
+  bound, the commits read, whether older history went unread, the joined
+  and unjoined commit counts, and, for each served item some commit names,
+  its commits newest first, each as its hash and instant.
+- **Unknown.** The join is Unknown, with one closed reason and nothing
+  else, when the work items were not observed
+  (`work-items-unobserved`), the pinned revision is not a commit identifier
+  (`repository-revision-unavailable`), the history read fails
+  (`commit-history-read-failed`), or a returned row has an unexpected shape
+  or the newest row is not the pinned revision
+  (`commit-history-malformed`). A failed join is never served as an
+  observed zero, and a missing join is never fuzzy-matched.
+- **When.** The read runs inside the observation pass, which runs only on a
+  human-triggered observation or rebuild (the daemon starting, an operator
+  re-observing, and the rebuild after an operator materializes), never on a
+  merge event. It computes no reconciliation chain state.
+- **Absence.** A served item with no entry is not observed to have no
+  commits: no commit read names it, and when older history went unread it
+  may be named there. The join serves no per-item Unknown.
+
+- **Scope.** The history read; the token rule; the machine answer's
+  `commitJoins`.
+- **Case (fixture, counterexamples and sweep).** An independent checker
+  supplies histories whose subjects name served items in brackets, after a
+  branch path in a merge subject and before sentence punctuation; near
+  misses (a longer identifier, another case, a prefix, a substring, an
+  unserved identifier); one subject naming two items and one naming an item
+  twice; an empty subject; a history one commit longer than the bound; and
+  each malformed row and each failure. Each subject carries a distinctive
+  marker. A real repository adds a naming commit after the observed
+  revision.
+- **Observable**: the machine answer's `commitJoins`; the read's arguments.
+- **Oracle**: literal expected values typed by the checker: the joined items
+  with their hashes and instants, the counts, the bound and truncation, each
+  Unknown reason; no marker and no subject text in either channel; the read
+  names the pinned revision and the bound and never `--all`; a commit after
+  the observed revision joins nothing.
+- **Oracle independence**: the fixture rows, hashes, instants and expected
+  joins are literals the checker types, never derived from the module.
+- **Falsifier**: a join from a prefix, substring, case-folded or unserved
+  token; a subject, or any marker, in either channel; a read not pinned to
+  the observed revision or not bounded; a commit after the observed revision
+  joined; a failed or malformed read served as observed; or counts that
+  disagree with the joined commits.
+
+#### Scenario: Commits that name an item join it
+
+- **WHEN** the history from the observed revision holds a commit whose
+  subject names a served item in brackets, a merge whose subject names one
+  after its branch path, and a commit naming no served item
+- **THEN** the machine answer serves each named item with those commits'
+  hashes and instants, two joined and one unjoined, basis
+  `naming-convention` and fidelity `reduced-fidelity`, and no subject text
+
+#### Scenario: A history that cannot be read is Unknown
+
+- **WHEN** the history read fails, or returns a row of an unexpected shape
+- **THEN** the join is Unknown with `commit-history-read-failed` or
+  `commit-history-malformed`, never an observed zero
+
+```yaml
+warrants:
+  primary: VIS-3
+  doctrine: [VIS-2, VIS-3]
+  contracts: [RFC4-22, RFC8-21]
+  policies: []
+  decisions: []
+  topology: []
+  parent_requirements: [POC-REQ-010, POC-REQ-020]
+```
````

## Dispositions

Review `R-T10S1-COMMIT-JOINS-1` (`docs/reviews/R-T10S1-COMMIT-JOINS-1-RAW.md`),
verdict `REVISE` over `1eafbd3c2`: three must-fix, four should-fix, two
notes. Each is repaired or answered below; the review gates nothing and no
confirmation round follows (D10).

1. **F1, must-fix: an empty history read is served as an observed zero.**
   Repaired. The first-row check no longer requires `read > 0`: an empty
   read, or a first row that does not begin with the pinned revision and
   the field separator, is `commit-history-malformed`. The Unknown table
   test adds the empty read, and restoring the old guard fails it.
2. **F2, must-fix: the Part B1 and Part B2 totals are stale.** Repaired,
   recounted by script after Disposition 6: Part B1 prints 28 consequence
   rows over 27 clauses, Part B2 207 clauses; Part A 184 rows over 90
   clauses, 131 covered and 53 Unknown; the family table and the
   verification sum read 90 + 27 + 207 = 324.
3. **F3, must-fix: RFC4-22's "renders Unknown" limb is claimed covered.**
   Repaired by narrowing. The covered RFC4-22 row now claims the declared
   basis, the fidelity, no fuzzy match, and an unreadable history being
   Unknown with its reason. A new Unknown row says a per-item join that
   cannot be established renders no per-item Unknown: an item no read
   commit names has no entry, and beyond the bound its absence is not "no
   commits". The spec adds an Absence bullet saying the same, and the
   `items` field's comment says it. Serving a per-item state is left to
   the rendering slice (`syzygy-t3jk.26`), which must not show absence as
   "no commits".
4. **F4, should-fix: the trigger statement omits the post-materialize
   rebuild.** Repaired. The spec, the `model-slices.ts` comment and this
   delta's decision name all three human-triggered passes: the daemon
   starting, an operator re-observing, and the rebuild after an operator
   materializes. The conclusion is unchanged.
5. **F5, should-fix: the per-row hash check survives mutation.** Repaired.
   The Unknown table adds a malformed hash in the second row after a good
   first row; dropping `!REVISION.test(hash)` now fails it.
6. **F6, should-fix: the RFC2-19 Part A row maps a limb the clause does
   not state.** Repaired by withdrawal. RFC2-19 leaves POC-REQ-064's
   warrants and stays in Part B2 with its row as signed; its two new Part
   A rows are removed. The decision section still quotes RFC2-18 and
   RFC2-19, as context for why the read is lawful, not as coverage.
7. **F7, should-fix: the spec reconciliation battery fails at
   `1eafbd3c2` alone.** Answered, by design of the two-commit adoption, as
   in `.19`–`.24`. The R3 entry names this delta's tag, and R1, R2 and R3
   resolve the spec bytes through the `AGENT-ADOPTIONS.md` row the next
   commit appends, with the regenerated census and this package. `--check`
   is read at the branch head after the row (pull request body) and again
   on the merged head.
8. **F8, note: the measurement used a replica.** Repaired.
   `observeCommitJoins` itself, at the digest the record names, was run
   once over the same history and identifier set and gave the same
   figures; the record names both runs.
9. **F9, note: bound semantics.** Answered: no change. The 5,001st row is
   read only to set `truncated`, and a malformed row anywhere in the first
   5,000 makes the whole join Unknown, which is the fail-closed reading.
