# Semantic delta T10 S2 — Trajectory renders closed work that merged apart from closed work no commit names

**Artifact(s):** `openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md`;
`openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md`; generated
`openspec/changes/three-surface-poc-experience/GOVERNING-DEPENDENCIES.md`.
**Stable IDs affected:** POC-REQ-065 (new: closed landings, two
Scenarios). CONTRACT-COVERAGE: RFC8-21 gains one covered row (the rendered
work item → commits link); its chain-walk row stays Unknown. RFC4-22's
per-item Unknown row is split: covered for closed items, Unknown for
items that are not closed. Part A goes from 184 rows (131 covered, 53
Unknown) to 186 (133, 53), over the same 90 clauses; Parts B1 and B2 are
unchanged.
**Change class:** Normative (a new requirement over both channels).
**Author:** agent lane `coordinator:claude-20261122-81840bd5`, bead
`syzygy-t3jk.26` (Trajectory pursuit move T10, slice S2).
**Date:** 2026-11-26

## Current meaning

POC-REQ-064 serves the commit join on the machine answer only. Trajectory
counts closed items by tracker status and says closed is not verification;
it cannot say which closed items landed. The page renders no commit.

## Proposed meaning

- **Landing.** A served closed item is `merged-by-convention` when a commit
  the join read names it, and `no-naming-commit-read` otherwise; an item
  that is not closed has none. A `no-naming-commit-read` landing is Unknown
  (RFC4-22: a join that cannot be established, "message tag absent",
  renders Unknown), disclosed once as `region:trajectory-landing-unnamed`
  with reason `missing-evidence`, the count and how much history was read.
  While the join itself is Unknown, no closed item's landing is known or
  counted.
- **The answer.** `remains.closedLanding`, over every served closed item:
  the closed count, the two landing counts summing to it, the basis, the
  fidelity, the commits read and truncation; or Unknown with the closed
  count and the `region:trajectory-commit-joins` disclosure, whose reason
  names the join's closed reason.
- **Words.** "merged by naming convention", with reduced fidelity and "not
  that it satisfied its intent"; never a bare "merged"; no verdict word.
  A truncated read says only the newest commits were checked, in the
  answer and on every card without a naming commit.
- **The card.** "Merged (by naming convention, reduced fidelity)"; or, in
  the Unknown encoding linked to the unnamed-landing disclosure, "Landing:
  Unknown, no commit names it" (past the bound, "... no commit among the
  newest N read names it"); or "Landing: Unknown" linked to the commit-join
  disclosure. For any named item: the count of its naming commits and up
  to three of them, newest first (twelve hash characters and the committer
  instant), with the count of the rest.
- **Unchanged.** Verification stays Unknown; the intent answer is
  unchanged. The closure notice now says a naming commit shows where an
  item landed, not that it works, instead of "no test or merge evidence is
  ingested".

## What explicitly does NOT change

- No subject or other commit text is read here or rendered.
- No new read: the landing derives from POC-REQ-064's join and the item's
  status alone.
- No narrowing parameter: the closed view (`status=closed`, POC-REQ-042)
  already holds every closed card.

## Choices the review may contest

1. **The closure answer is *what remains*.** The bead names "the closure
   answer"; the five answers have none by that name, and *what remains*
   already counts the closed status, so the landing counts sit beside it.
   The fifth answer (intent) stays as it is, as the bead requires.
2. **No per-item machine field.** A card's landing is a pure function of
   two served facts (`commitJoins.items` and the item's status), exported
   as `closedItemLanding`; serving it per item would add a row per closed
   item (over 10,000 on the proving project) for no new fact. The parity
   test derives each card's landing from the machine answer.
3. **An unnamed closed item is Unknown, not "Closed, no commit names
   it".** The bead's outcome text asked for that plain label; RFC4-22
   renders a join that cannot be established Unknown, and an accepted
   contract outranks a bead's wording (review finding 1). The words keep
   the bead's sense ("no commit names it") inside the Unknown mark, and the
   count stays in the answer.
4. **Three commits per card.** Keeps the page inside its 2 MB ceiling on
   items with many naming commits; the machine answer lists every one. The
   worst-case fan-in fixture (260 items, 500-quote titles, two parents,
   three blockers and three listed commits each) measures 1,917,287 bytes,
   91.4% of the ceiling; its guard moved from 90% to 95% and says why. A
   page over the ceiling serves nothing (HTTP 503), so the margin fails
   closed, and `syzygy-262m` (bounding blockers) would recover it.
5. **"Merged" for reachability from the observed revision.** Every commit
   read is an ancestor of the observed revision by construction (POC-REQ-064
   reads `git log <revision>`), so a naming commit has reached the observed
   line of history. The word always carries its basis and fidelity.

## Warrant

- RFC8-21, quoted: "Trajectory must walk, in both directions, the chain
  ... work item → execution run(s) → commits/PR → merge fact ... each
  rendered with its declared basis (`recorded-identity` vs
  `naming-convention`, the latter `reduced-fidelity`)." and "That thinness
  must render as thinness".
- RFC4-22, quoted: convention-based joins "are `reduced-fidelity` with
  cause `derived-from-convention`".
- VIS-2: no evidence yields Unknown, never zero — the Unknown join counts
  no landing.
- VIS-3: identifiers alone do not make the board legible; which closed work
  landed is a question Trajectory must answer.

## Evidence or decision basis

- `trajectory-projection.test.ts`: landing derivation (closed, open,
  Unknown); counts over every served item, truncation, the Unknown answer.
- `trajectory.test.ts`, "Closed items by landing": a real repository naming
  one closed and one open item (counts on both channels, card labels and
  short hashes, the unnamed-landing Unknown with its machine subject, no
  subject marker); no bare "merged" or verdict word; every card's landing
  equals the machine answer's derivation over the default and closed
  views; an item four commits name (three listed newest first with their
  instants, "1 more"); the truncated wording; a failed history walk (root
  commit object removed) giving `commit-history-read-failed`, the Unknown
  answer with its reason and no bare "merged", and, over every card on the
  default and closed views, "Landing: Unknown" linked to a target on the
  same page on closed cards only.
- Updated invariants: the board's route count (the `missing-evidence`
  route now renders twice: verification and the unnamed landing), the
  answers' disclosure list, the Unknown-route sweep's Trajectory
  denominators for two fixtures (5 → 6), and the worst-case page size.
- Rule 6: thirteen mutants at `8b7549c31`, each failing at least one test:
  an open item given a landing; every closed item merged; merged counted
  over all items; an Unknown join counted as zero; truncation dropped; a
  bare "Merged" label; the truncated card wording and answer wording each
  dropped; the Unknown card mark dropped; the card's commits dropped; the
  answer sentence dropped; the Unknown subject dropped; a verdict word in
  the answer. Record:
  `docs/evidence/syzygy-t3jk-26/closed-landing-mutation-2026-11-26.json`.
  After the review's repairs, the three mutants it found surviving (the
  three-commit cap, the remainder, the instant) and the unnamed-landing
  mark dropped each fail the tests.

## Downstream impact

Method: `git grep` over `apps/`, `packages/` and `scripts/` for
`closedLanding`, `'remains'` answer consumers and
`trajectory-closed-unverified-count`.

- `trajectory-projection.ts`: `closedItemLanding`, `closedLanding`, the
  `commitJoins` option, `TRAJECTORY_COMMIT_JOINS_ID`.
- `model-slices.ts`: passes the join; `model.ts`: the Unknown subject.
- `trajectory.ts`: the answer sentence, the card block, the closure notice.
- Two existing literals updated (the remains answer in both test files) and
  the closure-notice wording test.
- `docs/THREE-SURFACE-POC.md`: one paragraph.
- R3 reads two new POC-REQ-065 scenarios from this adoption row;
  `census.json` regenerated. POC-REQ-065 is appended last, so the N6
  boundary register is unaffected.

## Migration / supersession plan

1. One pull request.
2. Adoption by an `AGENT-ADOPTIONS.md` row in a second commit.
3. After merge, the tag `three-surface-poc-closed-landings-amendment-v1.0`.

## Review

**Required class:** one fresh-context review (CC-REV-1; one round, not
gating). **Reviewer and verdict:** the retained raw named in the pull
request.

## Exact text

````diff
diff --git a/openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md b/openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md
index 7d3f52232..32e1091f9 100644
--- a/openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md
+++ b/openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md
@@ -252,13 +252,15 @@ exhausted — a reviewer who finds an unlisted limb has found a real gap.
 | RFC8-17 | The blocked cause set includes the proven dependency cause and explicitly discloses cause Unknown when empty | covered — Amendment row (eligibility); the mixed edge fixture keeps the proven cause while overall eligibility is undetermined. Moved from Part B2 | POC-REQ-062 |
 | RFC8-17 | Derivations of `pr-wait`, `external` and `decision` blocked causes | **Unknown** — Amendment row (eligibility); those input families remain unread | — |
 | RFC4-22 | The work item ↔ commit link declares its basis, `naming-convention`, and is `reduced-fidelity` with cause `derived-from-convention`, and is never fuzzy-matched; a history that cannot be read is Unknown with its reason | covered — Amendment row (commit joins). Moved from Part B2 | POC-REQ-064 |
-| RFC4-22 | A per-item join that cannot be established renders Unknown | **Unknown** — Amendment row (commit joins); an item no read commit names gets no entry and no per-item state, and beyond the bound its absence is not "no commits" | — |
+| RFC4-22 | A closed item's join that cannot be established (no commit read names it) renders Unknown | covered — Amendment row (closed landings); its landing renders Unknown with one counted disclosure saying how much history was read. The commit-joins amendment's row here said such an item got "no entry and no per-item state"; POC-REQ-065 now gives a closed one that Unknown state | POC-REQ-065 |
+| RFC4-22 | A join that cannot be established renders Unknown for an item that is not closed | **Unknown** — Amendment row (closed landings); an open item no read commit names shows no commits and no per-item state | — |
 | RFC4-22 | The work item ↔ branch/worktree, commit → PR, PR → merge-fact and gate-outcome → artifact links | **Unknown** — Amendment row (commit joins); those inputs are unread | — |
 | RFC8-21 | The chain's work item → commits link, joined on an RFC4-22 adapter join with its declared basis | covered — Amendment row (commit joins); the machine answer serves it. Moved from Part B1, whose row said POC-REQ-014 renders the chain's first link as Unknown and no requirement renders any other | POC-REQ-064 |
-| RFC8-21 | Trajectory walks the whole chain in both directions, rendering each link's basis and its thinness as thinness | **Unknown** — Amendment row (commit joins); no requirement renders the commit link or walks the chain | — |
+| RFC8-21 | Trajectory renders the work item → commits link with its declared basis and fidelity, and a read that stopped at its bound as thinness | covered — Amendment row (closed landings); each card and the remains answer say "by naming convention, reduced fidelity", and a truncated read says only the newest commits were checked | POC-REQ-065 |
+| RFC8-21 | Trajectory walks the whole chain in both directions, rendering each link's basis and its thinness as thinness | **Unknown** — Amendment row (commit joins; closed landings); POC-REQ-065 renders the commit link alone, and no requirement walks the chain | — |
 
 Part A totals `[Observed, computed by the sweep in "Verifying this
-table"]`: **184 consequence rows over 90 clauses — 131 covered,
+table"]`: **186 consequence rows over 90 clauses — 133 covered,
 53 Unknown.**
 
 **Amendment disclosure — the RFC1-26 closure row (ruling P-75 Q3).**
diff --git a/openspec/changes/three-surface-poc-experience/GOVERNING-DEPENDENCIES.md b/openspec/changes/three-surface-poc-experience/GOVERNING-DEPENDENCIES.md
index d8df1ed27..0af61fc47 100644
--- a/openspec/changes/three-surface-poc-experience/GOVERNING-DEPENDENCIES.md
+++ b/openspec/changes/three-surface-poc-experience/GOVERNING-DEPENDENCIES.md
@@ -8,7 +8,7 @@
 > here is overwritten and `--check` fails first. Identifiers only —
 > nothing here quotes or paraphrases any clause.
 >
-> Source: `spec.md` sha256 `4dbf3bacd2b291d9c2f671fb68bad9f57eccb37bc5347c5b40f6a504184ad6c7` — 31 requirement(s), 114 distinct authorities.
+> Source: `spec.md` sha256 `97641453697dda04bdf9f05287c4e535dcc5aea1dbd215051db7dd5f372aea6b` — 32 requirement(s), 115 distinct authorities.
 
 ## doctrine (10)
 
@@ -19,8 +19,8 @@
 | `SEC-3` | POC-REQ-002, POC-REQ-021 |
 | `SEC-5` | POC-REQ-002, POC-REQ-062, POC-REQ-063 |
 | `VIS-1` | POC-REQ-003, POC-REQ-013, POC-REQ-014, POC-REQ-020, POC-REQ-022, POC-REQ-030, POC-REQ-031, POC-REQ-032, POC-REQ-042, POC-REQ-043, POC-REQ-051, POC-REQ-052, POC-REQ-053, POC-REQ-055, POC-REQ-060, POC-REQ-061 |
-| `VIS-2` | POC-REQ-001, POC-REQ-003, POC-REQ-010, POC-REQ-013, POC-REQ-014, POC-REQ-022, POC-REQ-031, POC-REQ-032, POC-REQ-041, POC-REQ-042, POC-REQ-043, POC-REQ-044, POC-REQ-045, POC-REQ-051, POC-REQ-052, POC-REQ-060, POC-REQ-062, POC-REQ-063, POC-REQ-064 |
-| `VIS-3` | POC-REQ-020, POC-REQ-022, POC-REQ-030, POC-REQ-040, POC-REQ-042, POC-REQ-044, POC-REQ-050, POC-REQ-053, POC-REQ-060, POC-REQ-061, POC-REQ-063, POC-REQ-064 |
+| `VIS-2` | POC-REQ-001, POC-REQ-003, POC-REQ-010, POC-REQ-013, POC-REQ-014, POC-REQ-022, POC-REQ-031, POC-REQ-032, POC-REQ-041, POC-REQ-042, POC-REQ-043, POC-REQ-044, POC-REQ-045, POC-REQ-051, POC-REQ-052, POC-REQ-060, POC-REQ-062, POC-REQ-063, POC-REQ-064, POC-REQ-065 |
+| `VIS-3` | POC-REQ-020, POC-REQ-022, POC-REQ-030, POC-REQ-040, POC-REQ-042, POC-REQ-044, POC-REQ-050, POC-REQ-053, POC-REQ-060, POC-REQ-061, POC-REQ-063, POC-REQ-064, POC-REQ-065 |
 | `VIS-4` | POC-REQ-062 |
 | `VIS-6` | POC-REQ-001, POC-REQ-004, POC-REQ-010, POC-REQ-011, POC-REQ-012, POC-REQ-014, POC-REQ-040, POC-REQ-041, POC-REQ-045, POC-REQ-050, POC-REQ-052 |
 | `VIS-7` | POC-REQ-001, POC-REQ-004, POC-REQ-010, POC-REQ-011, POC-REQ-012, POC-REQ-014, POC-REQ-020, POC-REQ-031, POC-REQ-041, POC-REQ-050, POC-REQ-055 |
@@ -59,7 +59,7 @@
 | `RFC4-11` | POC-REQ-001 |
 | `RFC4-12` | POC-REQ-001, POC-REQ-002, POC-REQ-003 |
 | `RFC4-15` | POC-REQ-010, POC-REQ-012, POC-REQ-013, POC-REQ-014, POC-REQ-062 |
-| `RFC4-22` | POC-REQ-064 |
+| `RFC4-22` | POC-REQ-064, POC-REQ-065 |
 | `RFC4-26` | POC-REQ-050, POC-REQ-052 |
 | `RFC4-27` | POC-REQ-051 |
 | `RFC5-16` | POC-REQ-002, POC-REQ-063 |
@@ -94,7 +94,7 @@
 | `RFC8-17` | POC-REQ-062 |
 | `RFC8-18` | POC-REQ-045 |
 | `RFC8-19` | POC-REQ-044, POC-REQ-045 |
-| `RFC8-21` | POC-REQ-064 |
+| `RFC8-21` | POC-REQ-064, POC-REQ-065 |
 | `RFC8-22` | POC-REQ-014 |
 | `RFC8-23` | POC-REQ-014, POC-REQ-042, POC-REQ-044 |
 | `RFC8-24` | POC-REQ-014, POC-REQ-043 |
@@ -137,7 +137,7 @@
 
 *(none declared)*
 
-## parent_requirements (10)
+## parent_requirements (11)
 
 | Authority | Cited by |
 |---|---|
@@ -149,5 +149,6 @@
 | `POC-REQ-040` | POC-REQ-062 |
 | `POC-REQ-041` | POC-REQ-045 |
 | `POC-REQ-042` | POC-REQ-062 |
-| `POC-REQ-044` | POC-REQ-045 |
+| `POC-REQ-044` | POC-REQ-045, POC-REQ-065 |
 | `POC-REQ-062` | POC-REQ-042 |
+| `POC-REQ-064` | POC-REQ-065 |
diff --git a/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md b/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md
index f731082dc..867f4dbf0 100644
--- a/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md
+++ b/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md
@@ -2232,3 +2232,96 @@ warrants:
   topology: []
   parent_requirements: [POC-REQ-010, POC-REQ-020]
 ```
+
+### Requirement: POC-REQ-065 — Trajectory renders closed work that merged apart from closed work no commit names
+
+Group: Trajectory. Form: **state projection/query**.
+
+**Required behavior.** Trajectory SHALL read each served closed item's
+landing from the commit join (POC-REQ-064) and the item's status alone, on
+both channels.
+
+- **Landing.** A closed item that some commit read names is
+  `merged-by-convention`: a commit reachable from the observed revision
+  names it. A closed item no commit read names is `no-naming-commit-read`:
+  its join cannot be established, so where it landed is Unknown (RFC4-22:
+  "message tag absent ... renders Unknown"), counted and disclosed once,
+  reason `missing-evidence`, saying how much history was read. An item
+  that is not closed has no landing. While the join is Unknown,
+  every closed item's landing is Unknown, and none is counted as either.
+- **The answer.** The *what remains* answer (POC-REQ-044) SHALL carry
+  `closedLanding`, over every served closed item, never the rendered
+  selection: the closed count, the merged-by-convention and
+  no-naming-commit-read counts (summing to it), the basis
+  `naming-convention`, the fidelity `reduced-fidelity`, the commits read
+  and whether older history went unread; or Unknown with the closed count
+  and the commit-join disclosure, whose reason names the join's own closed
+  reason and whose route is rendered.
+- **Words.** The page SHALL say "merged by naming convention" with its
+  reduced fidelity, and that it shows where work landed, not that it
+  satisfied its intent; never a bare "merged", and no verdict word (done,
+  complete, shipped, delivered). When older history went unread, the
+  answer and every card without a naming commit SHALL say only the newest
+  commits read were checked.
+- **The card.** Each card SHALL show a closed item's landing, labelled
+  "Merged (by naming convention, reduced fidelity)"; or, in the Unknown
+  encoding linked to the unnamed-landing disclosure, "Landing: Unknown, no
+  commit names it" or, when history went unread, "Landing: Unknown, no
+  commit among the newest N read names it"; or, while the join is Unknown,
+  "Landing: Unknown" linked to the commit-join disclosure. For any item a
+  commit names, the card SHALL show the count of its naming commits and at
+  most three of them, newest first, each as its first twelve hash
+  characters and its committer instant, with the count of the rest the
+  machine answer lists. No subject is rendered.
+- **Unchanged.** Verification stays Unknown for every item, and the intent
+  answer is unchanged: a commit that names an item is neither verification
+  nor reconciliation.
+
+- **Scope.** `trajectory.answers` (`remains.closedLanding`); the
+  `unknownSubjects` entries `region:trajectory-commit-joins` and
+  `region:trajectory-landing-unnamed`; the card.
+- **Case (fixture, counterexamples and sweep).** A real repository whose
+  history from the observed revision names one closed and one open item;
+  a closed item no commit names; an item four commits name; the same model with the join marked
+  truncated; and a repository whose history walk fails. A sweep over every
+  served item's card on the default and closed views.
+- **Observable**: both channels' `closedLanding`; each card's landing and
+  commits.
+- **Oracle**: literal counts typed by the checker; each card's landing
+  equals the one derived from the machine answer's join and status; the
+  landing labels and the answer's words, with tags removed, hold no verdict
+  word and no "merged" without "naming convention"; the Unknown case
+  serves no count and marks every closed card.
+- **Oracle independence**: counts, labels, hashes and reasons are literals
+  or values read from the machine answer, never from the renderer.
+- **Falsifier**: a closed item counted merged with no naming commit, or
+  counted at all while the join is Unknown; a bare "merged" or a verdict
+  word; a landing on an item that is not closed; a truncated read stated
+  as the whole history; a subject on the page.
+
+#### Scenario: Closed items read merged by naming convention or closed with no naming commit
+
+- **WHEN** the history from the observed revision names one of two closed
+  items and nothing older went unread
+- **THEN** the remains answer counts one merged by naming convention and
+  one closed with no commit that names it, whose landing is Unknown with
+  its disclosure, on both channels, and each closed card carries its
+  label
+
+#### Scenario: Closed landings are Unknown when the history cannot be read
+
+- **WHEN** the commit join is Unknown
+- **THEN** the remains answer serves the closed count with the commit-join
+  disclosure, its reason and route, counts no landing, and every closed
+  card reads "Landing: Unknown"
+
+```yaml
+warrants:
+  primary: VIS-2
+  doctrine: [VIS-2, VIS-3]
+  contracts: [RFC4-22, RFC8-21]
+  policies: []
+  decisions: []
+  topology: []
+  parent_requirements: [POC-REQ-044, POC-REQ-064]
+```
````

## Dispositions

Review `R-T10S2-CLOSED-LANDINGS-1` (`docs/reviews/R-T10S2-CLOSED-LANDINGS-1-RAW.md`),
verdict `REVISE` over `8b7549c31`: one must-fix, four should-fix, three
notes. Each is repaired or answered below; the review gates nothing and no
confirmation round follows (D10).

1. **F1, must-fix: RFC4-22's per-item limb is contradicted, and its
   coverage row is false.** Repaired by following the clause. A closed item
   no read commit names now renders its landing Unknown: the card reads
   "Landing: Unknown, no commit names it" (past the bound, "... no commit
   among the newest N read names it") in the Unknown encoding, linked to
   one disclosure, `region:trajectory-landing-unnamed`, reason
   `missing-evidence`, whose sentence gives the count and how much history
   was read. The answer still counts them and says where they landed is
   Unknown. The bead's plain label "closed, no commit names it" yields to
   the accepted clause (Choice 3). CONTRACT-COVERAGE's RFC4-22 row is split
   and corrected: covered by POC-REQ-065 for closed items, with the earlier
   "no entry and no per-item state" sentence named as superseded; Unknown
   for items that are not closed.
2. **F2, should-fix: the Unknown answer says "merged" without "naming
   convention".** Repaired. The commit-join basis now reads "Where each
   closed item landed, by a commit that names it (naming convention), is
   Unknown ... No closed item is counted as merged by naming convention or
   as having no naming commit." The Unknown test sweeps the answer's words
   for verdict words and for any "merged" without "naming convention".
3. **F3, should-fix: the card's commit-list predicates survive mutation.**
   Repaired. A new test has four commits name one item with set committer
   dates and asserts three listed newest first, each with its instant, the
   count 4 and "1 more in the machine answer". The cap, remainder and
   instant mutants each fail it now.
4. **F4, should-fix: no page-size measurement covers the card's commits.**
   Repaired. The worst-case fan-in fixture now has four commits naming
   every item, so every card carries its three-commit cap and a
   remainder. The card markup was compacted first (about 200 bytes per
   card), and the page measures 1,917,287 bytes, 91.4% of the ceiling,
   against 1,787,412 without commits. The guard moved from 90% to 95% and
   its comment states the figure (Choice 4).
5. **F5, should-fix: the Unknown case checks one closed card.** Repaired.
   The Unknown test now walks every card on the default and closed views:
   each closed card carries the commit-join reference and "Landing: Unknown"
   linking to `#n-commit-joins`, the target is on that page, and no other
   card carries a landing.
6. **F6, note: the basis map is typed by string, and one arm is
   unreachable.** Repaired. The map is typed
   `Record<CommitJoinUnknownReason, string>`, so a fifth reason fails the
   typecheck until it has a sentence; `commitJoinsBasis` takes only an
   Unknown join. The one remaining fallback, a projection given no join,
   gives its own disclosed sentence rather than throwing in the daemon.
7. **F7, note: `check_spec_reconciliation.py --check` fails at
   `8b7549c31` alone.** Answered, by design of the two-commit adoption, as
   in `.19`–`.25`: R1, R2 and R3 resolve through the `AGENT-ADOPTIONS.md`
   row the next commit appends, with the regenerated census; `--check` is
   read at the branch head (pull request body) and on the merged head.
8. **F8, note: the Unknown sentence's wording.** Repaired: "N items are
   closed. Their landing: Unknown. ..." The card mark's
   `data-unknown-reason` stays the disclosure's closed reason, as every
   board mark does; the join's own reason is in the disclosure sentence,
   which is what the spec asks.
