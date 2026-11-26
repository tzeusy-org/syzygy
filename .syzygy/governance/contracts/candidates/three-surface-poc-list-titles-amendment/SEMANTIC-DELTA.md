# Semantic delta T5 S2 — Every Trajectory list names an item with its screened title

**Artifact(s):** `openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md`;
generated `openspec/changes/three-surface-poc-experience/GOVERNING-DEPENDENCIES.md`.
**Stable IDs affected:** POC-REQ-063 (the Admission bullet now names the
lists; a new **Lists** bullet; Scope, Observable, Oracle and Falsifier name
the lists; a third Scenario, "Every list names an item with its title").
CONTRACT-COVERAGE: unchanged (RFC5-16(b) and the RFC2-24 row already cite
POC-REQ-063; the lists add no clause).
**Change class:** Normative (a requirement's rendered scope grows).
**Author:** agent lane `coordinator:claude-20261122-81840bd5`, bead
`syzygy-t3jk.24` (Trajectory pursuit move T5, slice S2).
**Date:** 2026-11-26

## Current meaning

POC-REQ-063 (adopted by A-313, tag `three-surface-poc-titles-amendment-v1.0`)
renders an admitted title "on the item's card, wherever the card renders".
Every other Trajectory place that names a work item names it by identifier
alone: the outline's parent headings, what a parent sits under, a
parent-child cycle's members and the group it is stated under, a card's
blockers, and the what-changed list.

## Proposed meaning

- **Lists.** Each of those places names a served item by its identifier
  followed by its title as served, through one rendering helper the card's
  title also uses, so no list reads a title any other way.
- **Clip.** A list shows an admitted title escaped in a bidirectionally
  isolated element, clipped to its first 60 UTF-16 code units (59 when the
  60th is the first half of a surrogate pair) and followed by a visible
  ellipsis when longer. The card and the machine answer keep the whole
  title.
- **Withheld.** A list shows a withheld title as a mark with the card's
  label: its reason,
  referring to the one withheld-title disclosure.
- **Unserved.** An item not served at the observed revision (a removed item
  in the what-changed list) stays named by its identifier alone.
- **Ready set.** The ready set is the cards themselves; it adds no list.

## What explicitly does NOT change

- The policy, its detectors, its scan, its bound and its withheld record
  (`WORK-ITEM-TITLE-POLICY-v1.json` is unchanged); no detector or scan is
  loosened (SEC-5).
- The machine answer: each item's `title` and the observation's `titles`
  are as in v1.0. Lists reference items by identifier there already; the
  page's list titles equal (or are a clipped prefix of) the item's served
  title.
- The withheld-title disclosure is stated once; no new Unknown subject.
- No title goes to a model provider; no other free-text column is read.

## Choices the review may contest

1. **Clip at 60 code units.** A list title is clipped to cap each
   reference's bytes against the 2,097,152-byte human response ceiling,
   where a breach serves nothing. A page measured with 500-`"` titles,
   every item under two parents with three blockers, and a full 250-item
   changed list is 1,785,386 bytes (85%) at 60; it was 1,905,986 (91%) at
   80. The test bounds that fixture at 90%. It is a measurement of that
   fan-in, not a bound on every page (choice 2).
2. **Blockers per card stay unbounded.** That was true of the identifier-only
   list before this change; titles raise the worst per-blocker cost from
   about 200 to about 560 bytes. Bounding the list is filed as `syzygy-262m`
   rather than done here, because it changes POC-REQ-062's blocker
   rendering.
3. **Repeated cards.** Review note 6 of `R-T5S1-TITLES-1` asked whether a
   grouped page that repeats an item's card under each parent is bounded. It
   is: the grouped page holds 250 positions, not 250 items
   (`trajectory-projection.ts`, `positions / TRAJECTORY_PAGE_SIZE`), so a
   repeat displaces another position. The measured page above puts every
   item under two parents.
4. **The ellipsis sits outside the isolated element.** It is page text, not
   title text; the `data-title-clipped` attribute names the bound.

## Machine-answer change

None.

## Warrant

- POC-REQ-063 v1.0 and its warrant (the owner's answer to
  `pursuit-2026-11-21-trajectory-titles`, choice C, 2026-11-21T12:21:41Z:
  "admit titles for every observed tracker under the declared, screened
  policy"). This change renders already-admitted titles in more places on
  the same page; it admits nothing new.
- VIS-3: identifiers alone do not make the board legible.
- RFC5-16: every title shown passed the declared policy at ingest; a list
  shows only what the card shows, or a prefix of it.

## Evidence or decision basis

- `trajectory.test.ts`, describe "Every Trajectory list names an item with
  its screened title (POC-REQ-063, syzygy-t3jk.24)" (6 tests): the exact
  references on the default and grouped pages with literal expected text;
  every `data-blocker-id`, `data-group-parent` and `data-group-under` link
  inside a titled reference; a removed item by identifier alone; the machine
  answer's titles and no withheld marker on either channel; the 60-unit clip,
  surrogate-safe, with the whole title on the card; a withheld blocker's
  mark; the worst-page measurement.
- Five existing expectations updated to the titled form (outline heading,
  sits-under, cycle members, cycle reference, changed list).
- Rule 6: fourteen mutants at `491dbf915`, each failing at least one test:
  a detector match admitted; a scan finding admitted; the unclassifiable gate
  reduced to a type check; control characters and lone surrogates admitted;
  the length bound dropped; an admitted title unescaped; a clipped title
  unescaped; a withheld list title unmarked; the helper naming every item by
  identifier only; the blockers, the changed list and the parent heading
  each bypassing the helper; the clip dropped; the clip splitting a
  surrogate pair.
- Mutation evidence record: `docs/evidence/syzygy-t3jk-24/title-path-mutation-2026-11-26.json`.

## Downstream impact

Method: `git grep` over `apps/` and `packages/` for `data-blocker-id`,
`data-group-parent`, `data-group-under`, `data-group-cycle`,
`data-change-id` and `work-item-title`.

- `trajectory.ts`: `titleHtml`, `clipTitle`, `itemName`, `LIST_TITLE_LIMIT`;
  the outline, blockers and changed list call `itemName`.
- `trajectory.test.ts`: as above.
- `docs/THREE-SURFACE-POC.md`: the card paragraph.
- R3 reads one new POC-REQ-063 scenario from this adoption row;
  `census.json` regenerated.
- The N6 boundary register: POC-REQ-063 is the file's last section and
  unpinned; `build_boundary_register.py --check` verifies 98 entries.

## Migration / supersession plan

1. One pull request.
2. Adoption by an `AGENT-ADOPTIONS.md` row in a second commit, naming the
   change commits.
3. After merge, the tag `three-surface-poc-list-titles-amendment-v1.0`.

## Review

**Required class:** one fresh-context review (CC-REV-1; one round, not
gating). **Reviewer and verdict:** the retained raw named in the pull
request.

## Exact text

````diff
diff --git a/openspec/changes/three-surface-poc-experience/GOVERNING-DEPENDENCIES.md b/openspec/changes/three-surface-poc-experience/GOVERNING-DEPENDENCIES.md
index eeaacc1f7..534cf3d6a 100644
--- a/openspec/changes/three-surface-poc-experience/GOVERNING-DEPENDENCIES.md
+++ b/openspec/changes/three-surface-poc-experience/GOVERNING-DEPENDENCIES.md
@@ -8,7 +8,7 @@
 > here is overwritten and `--check` fails first. Identifiers only —
 > nothing here quotes or paraphrases any clause.
 >
-> Source: `spec.md` sha256 `f485d7c7713d18d999b3df8fbdea7a63d1df83bb960a241b28bcf21de591a81b` — 30 requirement(s), 112 distinct authorities.
+> Source: `spec.md` sha256 `9140114a69cae6e19bdb850dc0444c673d7aa844d1aa69156148c8e56f000fb6` — 30 requirement(s), 112 distinct authorities.
 
 ## doctrine (10)
 
diff --git a/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md b/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md
index 88c646f1f..16fb65874 100644
--- a/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md
+++ b/openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md
@@ -2031,7 +2031,8 @@ secret policy and the active-content scan every observed body passes.
   Markdown code-context rule: markup inside a backtick code span is inert to
   it, so such a title is admitted. An admitted title is served as the
   item's `title.text` and rendered escaped, in a bidirectionally isolated
-  element, on the item's card, wherever the card renders.
+  element, on the item's card, wherever the card renders, and in every
+  Trajectory list that names the item (Lists, below).
 - **Withholding.** Any other title is withheld, fail-closed (RFC5-16). The
   item serves the RFC5-17 hash-not-body record instead: the reason
   (`secret-matched`, `active-content` or `unclassifiable`), the redaction
@@ -2047,13 +2048,27 @@ secret policy and the active-content scan every observed body passes.
   RFC2-24 route, and each card with a withheld title carries a mark naming its
   reason that refers to that one disclosure. When every title is admitted no
   title Unknown exists and the board states the policy and the admitted count.
+- **Lists.** Every Trajectory list that names a served work item names it
+  by its identifier followed by its title as served, through one rendering
+  helper the card's title also uses: the grouped outline's parent headings,
+  what a parent sits under, a parent-child cycle's members and the group it
+  is stated under, a card's blockers, and the what-changed list. A list
+  shows an admitted title escaped in a bidirectionally isolated element,
+  clipped to its first 60 UTF-16 code units (59 when the 60th is the first
+  half of a surrogate pair) and followed by a visible ellipsis when longer;
+  the card and the machine answer keep the whole title. A list shows a
+  withheld title as a mark with the card's label, naming its reason and
+  referring to the one withheld-title disclosure. An item not served at the observed revision
+  (a removed item in the what-changed list) stays named by its identifier
+  alone. The ready set is the cards themselves and adds no list.
 - **Boundaries.** No title is sent to a model provider. No other free-text
   column of a work item is read. No detector or scan is loosened. A title is
   never parsed for an identifier: POC-REQ-014's governing intent is unchanged.
 
 - **Scope.** The work-item statement's selected columns; every served item's
-  `title`; the observation's `titles`; every Trajectory card; the titles
-  notice; the machine answer.
+  `title`; the observation's `titles`; every Trajectory card; every
+  Trajectory list that names a work item; the titles notice; the machine
+  answer.
 - **Case (fixture, counterexamples and sweep).** An independent checker
   supplies, at one revision, items whose titles are: clean text with
   characters HTML escapes; a match for each of the four detectors; an HTML
@@ -2065,13 +2080,15 @@ secret policy and the active-content scan every observed body passes.
   Each withheld title carries a distinctive marker. The checker sweeps both
   channels' bytes for every marker, every card's title, and the board's
   notice.
-- **Observable**: the admitted titles on the cards and in the machine
-  answer; the withheld records; the observation's counts; the notice; the
+- **Observable**: the admitted titles on the cards, in each list and in
+  the machine answer; the withheld records; the observation's counts; the notice; the
   statement's selected columns.
 - **Oracle**: literal expected values typed by the checker: the selected
   columns are exactly POC-REQ-010's revision witness and seven item columns
   and `title`; each
-  admitted title equals its fixture text and renders escaped; each withheld
+  admitted title equals its fixture text and renders escaped; each list
+  reference's title equals its fixture text, clipped where longer than 60
+  code units, or its withheld mark; each withheld
   record equals its literal reason, class and digest; the counts equal the
   fixture's; no marker occurs in either channel; with every title admitted
   no title Unknown subject exists.
@@ -2081,7 +2098,9 @@ secret policy and the active-content scan every observed body passes.
   with the declaration file.
 - **Falsifier**: a withheld title's text, or any marker, in either channel; a
   title admitted that a detector matches or the scan flags; an admitted title
-  rendered unescaped; a withheld title without its reason, class or digest;
+  rendered unescaped; a list naming a served item without its title, a list
+  title longer than 60 code units or a clip that splits a surrogate pair; a
+  withheld title without its reason, class or digest;
   counts that disagree with the served items; a second free-text column in
   the statement; or a title Unknown while every title is admitted.
 
@@ -2101,6 +2120,16 @@ secret policy and the active-content scan every observed body passes.
   marks its reason; and the board states 3 withheld once, with
   `excluded-content` and its route
 
+#### Scenario: Every list names an item with its title
+
+- **WHEN** a card's blockers, the outline's parents and the what-changed list
+  name served items, one title is longer than 60 code units and one blocker's
+  title is withheld
+- **THEN** each list shows each item's identifier with its escaped title,
+  the long one clipped at 60 code units with an ellipsis and whole on its
+  card, the withheld one as its reason's mark, and a removed item by its
+  identifier alone
+
 ```yaml
 warrants:
   primary: SEC-5
````

## Dispositions

Review `R-T5S2-LIST-TITLES-1` (`docs/reviews/R-T5S2-LIST-TITLES-1-RAW.md`),
verdict `CONFIRM WITH EXCEPTIONS` over `480bc0c97` and `491dbf915`: no
must-fix, two should-fix, six notes. Each is repaired or answered below;
the review gates nothing and no confirmation round follows (D10).

1. **F1, should-fix: `check_spec_reconciliation.py --check` fails at the
   change commits.** Answered, by design of the two-commit adoption, as in
   `.19`–`.23`. The R3 entry names this delta's tag, and R1, R2 and R3
   resolve the spec bytes through the `AGENT-ADOPTIONS.md` row the next
   commit appends, with the regenerated census. `--check` is read at the
   branch head after the row (pull request body) and again on the merged
   head.
2. **F2, should-fix: the "worst page" is one fixture's page, not a
   bound.** Repaired in the words, and the bound filed. The test is now
   titled for what it measures ("a page of most-escaped titles with two
   parents and three blockers per item"), its comment says it measures
   that fan-in and not a bound, and `LIST_TITLE_LIMIT`'s comment says the
   clip caps bytes per reference, not per page. Choice 1 above now calls
   the 1,785,386 bytes a measurement of that fan-in. Bounding a card's
   blocker list, as the what-changed list is bounded, changes POC-REQ-062's
   rendering and is filed as `syzygy-262m`. A page over the ceiling serves
   nothing (HTTP 503), so the gap fails closed.
3. **F3, note: the clip counts code units, not graphemes.** Answered: the
   spec states the code-unit rule, the clip never splits a surrogate pair,
   and a fragment of a combining or joined sequence before the ellipsis is
   cosmetic. The card keeps the whole title.
4. **F4, note: the demonstrated-item callout names an item by identifier
   alone.** Answered by narrowing the claim. It is a sentence, not a list,
   and POC-REQ-063's Lists bullet covers lists only. This change and its
   pull request claim "every list", not every place.
5. **F5, note: `docs/THREE-SURFACE-POC.md` said "60 characters" and
   omitted two list sites.** Repaired: it now says 60 UTF-16 code units (59
   before a surrogate pair) and names what a parent sits under and the
   cycle notes.
6. **F6, note: escaping and injection hold.** No action. The surviving
   `.wi-ref-name` CSS mutant is harmless, since `<bdi>` isolates by default.
7. **F7, note: the oracles are independent literals.** No action. The
   changed list and the cycle notes are pinned by literal assertions rather
   than the identifier sweep, and the reviewer's mutants M3, M4 and M7 were
   killed.
8. **F8, note: two small wording differences in the spec.** Repaired:
   "epic outline" is now "grouped outline", and a list's withheld mark is
   "a mark with the card's label" (it carries its own parity field,
   `work-item-ref-title`). This delta's Proposed meaning says the same.
