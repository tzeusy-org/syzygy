# Review R-T4S2-OUTLINE-1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewer: fresh-context Claude Code review subagent, CC-REV-1, read-only
Subject: commit 19a5d40f5

## Bytes bound

Commit `19a5d40f535c7ec79ecb3625c8fd803c053c2c1e` on branch
`agent/syzygy-t3jk.20`, diffed against its parent `19a5d40f5~1`
(`git diff 19a5d40f5~1 19a5d40f5`, 15 files, +1206 / -65). Files read:

- `.syzygy/governance/contracts/candidates/three-surface-poc-outline-amendment/SEMANTIC-DELTA.md` (whole)
- `packages/three-surface-poc-core/src/trajectory-projection.ts` (whole file at the commit)
- `packages/three-surface-poc-core/src/work-item-dependencies.ts` (diff, and lines 60-195 at the commit)
- `apps/three-surface-poc/src/trajectory.ts` (diff, and lines 280-410, 445-580 at the commit)
- `packages/three-surface-poc-core/src/trajectory-outline.test.ts` (whole)
- `apps/three-surface-poc/src/trajectory.test.ts` (diff, and lines 1265-1290)
- `apps/three-surface-poc/src/trajectory-narrowing.browser.test.ts` (diff)
- `packages/three-surface-poc-core/src/trajectory-view.test.ts`, `work-items.test.ts`, `docs/THREE-SURFACE-POC.md`,
  `scripts/check_spec_reconciliation.py`, `census.json` (diffs)
- The spec and CONTRACT-COVERAGE changes, read through the delta's "Exact text" block
- `apps/three-surface-poc/src/routes.ts` lines 125-200 (response ceilings); `work-items.ts` lines 135, 196-222 (id grammar)
- RFC8-15 (`state-vocabulary-and-cost.md`:256) and RFC8-30 (`accounting-reconciliation-and-release.md`:344), found through `DIRECTIVE-REGISTER.md`

Runs made: `npx vitest run packages/three-surface-poc-core/src/trajectory-outline.test.ts`
(11 passed) [Observed]; one throwaway probe bundled with esbuild into the session
scratchpad (outside the repository), whose output is quoted in finding 1. Nothing in the repository was edited
except this file.

Clauses relied on, quoted:

- RFC8-15: "never `merged`, never `reconciled`, never green (RFC2-20), and never under
  any label meaning done, complete, finished, or resolved."
- RFC8-30: "No Trajectory aggregate, badge, progress bar, or prose sentence renders a
  `closed` work item as done, complete, or satisfied absent a `reconciled@E`
  verdict with gate-backed evidence".
- POC-REQ-042 as amended: "A parent outside the tracker or not served SHALL be counted and
  never named"; "An item rendered twice on one page SHALL carry its fragment target once";
  Scenario "Items grouped under their parents": "the two-item cycle is stated once and not followed".

Overall [Inferred]: the core design is sound. Parent facts come from the existing
same-revision read. Only served, in-prefix identifiers are named (the dependent must
be served, and a parent is named only when `statusById.has(target)`). Positions
are paged contiguously, so each matching item lands in each of its groups exactly once.
The iterative Tarjan is correct, including at depth 20,000. Unknown dependency rows
give one "Parent Unknown" group rather than a zero. No spread-into-call over a
population appears. The findings below are repairs, not reasons to withdraw the change.

## Findings

1. **should-fix** — `packages/three-surface-poc-core/src/trajectory-projection.ts:347-349` and `:368-373`.
   The group map is keyed by its anchor string, and a parent group's anchor
   `group-<id>` shares a namespace with the class anchors `group-no-parent`,
   `group-parent-outside-tracker`, `group-parent-unobserved` and `group-parent-unknown`.
   `PREFIX_PATTERN` (`work-items.ts:135`, `/^[a-z][a-z0-9]{0,15}$/`) admits the prefixes `no` and `parent`, so
   item ids `no-parent`, `parent-unobserved` and `parent-outside-tracker` are valid.
   Failure scenario [Observed, by probe]: with prefix `no`, items `no-parent`, `no-child` and `no-orphan`, and one
   row `no-child` → `no-parent`, the grouped view returns a single group
   `[{"kind":"parent","id":"no-parent"},"group-no-parent",["no-child","no-orphan","no-parent"],…]`.
   That states two orphans as children of `no-parent`, which is a false parent fact on the page and a false entry in
   the grouping. It also gives duplicate element ids on the page. Repair: key `members` by kind plus id (e.g.
   `parent:<id>` / `class:<kind>`), and give the two families disjoint anchors (e.g. `group-item-<id>` and
   `group-class-<kind>`, or encode the id). Add the `no` prefix case as a test.

2. **should-fix** — `apps/three-surface-poc/src/trajectory.ts:512` (and `:520`).
   `pageLink` writes `#${group.anchor}` into `href="…"` with neither HTML escaping nor URL encoding, and
   `group.anchor` carries a raw tracker id. The `data-group` and `id` sites escape the same value, so
   this is the one unescaped interpolation of tracker data in the change. Line 520 escapes but does not
   URL-encode (`#group-${escapeHtml(id)}`), while the card and blocker fragments use
   `encodeURIComponent`. Ids are prefix-checked only (`work-items.ts:216`), so nothing excludes `"`, `<`,
   space or `#` after the prefix [Observed]. Failure scenario [Inferred]: an id `bu-a"><b>x` split across pages
   breaks out of the attribute and injects markup on the human page. An id with a space or `#` yields a fragment
   that does not match the `id` attribute, so the continuation link lands on the page top.
   Repair: build every group fragment one way, `#${escapeHtml(encodeURIComponent(anchor))}` or a shared helper
   used by the card links too.

3. **should-fix** — the Scenario at `openspec/…/spec.md:1118-1129` against `apps/three-surface-poc/src/trajectory.ts:522`.
   The Scenario says "the two-item cycle is stated once". The code pushes the cycle note
   into the heading of *every* cycle member's group, so `bu-f` ↔ `bu-g` is stated twice on
   one page, and the note's own text says "shown once and not followed further" [Observed in source]. No
   HTML test renders a cycle at all: `data-group-cycle` appears in no test file [Observed, grep over
   `apps` and `packages` `*.test.ts`]. Only the outline's `cycles` array, which does hold each cycle once, is
   asserted. So the scenario's observable has no test, and the code does not match its wording. Repair:
   either state the cycle once (in the first member's group, or one cycle notice that each member's heading
   links to), or amend the scenario and note to "stated in each member's group". Then add an HTML assertion.

4. **should-fix** — spec text the grouped view contradicts. The lines are `spec.md:1033`, `:1045` and `:1103`, plus
   `trajectory-projection.ts:230,245`.
   (a) The general sentence still reads "any of them SHALL give a view of the matching items in ascending item
   id, one page of a declared fixed size". `group=parent` is now one of "them", and its order is by group, not by id.
   (b) The Falsifier "a served item on no page or on two" is violated by design for an item with two
   parents whose groups fall on different pages.
   (c) The machine answer's `trajectory.narrowing.order` stays `'ascending item id'` and `pageSize` does not say
   it counts positions for `group=parent`. The grouped order and the position rule exist only in the prose
   `selectionRule`. So the machine answer does not *declare* the grouped view's order, which the spec
   requires of `trajectory.narrowing`.
   Failure scenario [Inferred]: a checker that recomputes pages from the declared `order` and `pageSize`, as the
   spec invites, puts the grouped page's items in the wrong order, and a checker running the falsifier fails a
   correct page. Repair: scope (a) and (b) to the ungrouped views. Declare the grouped order and the position
   paging in `narrowing`, for example `groupOrder` and `groupPageUnit: 'position'`. That is a machine-answer change,
   so name it in the delta.

5. **should-fix** — `packages/three-surface-poc-core/src/trajectory-outline.test.ts:178-215`. The
   continuation marks are asserted only on the first and last group of each page. Failure scenario
   [Inferred]: the mutant `continuedFromPage: request.page > 1 ? request.page - 1 : null` marks every group on
   pages 2-3 as continued, including `bu-p2` on page 2, which starts there. It survives, and so does the
   symmetric `continuesOnPage` mutant, which wrongly marks `bu-p0` on page 1. No fixture has a group spanning three
   pages, so the middle page carrying both marks is never checked. In HTML, "Continued from"
   (`data-group-continues="prev"`), `data-group-total` and `data-group-on-page` appear in no test [Observed, grep];
   the browser test follows only the "next" end. Criterion 3 asks that both ends be marked on the page.
   Repair: assert every group's `continuedFromPage` and `continuesOnPage` on every page, add a 600-member group so a
   middle page exists, and add an HTML assertion of both marks and both counts.

6. **should-fix** — criterion 2, determinism of the grouped view. The only byte-equality test,
   `apps/three-surface-poc/src/trajectory.test.ts:1274-1286`, renders the default page. No test renders
   `group=parent` twice from one observation [Observed, grep for "byte-equal" over the Trajectory tests]. The code
   reads no clock or iteration-order-dependent source in `groupedView` [Inferred], so this is a missing test, not a
   known defect. Repair: render `renderTrajectoryRoute(model, '', undefined, new URLSearchParams('group=parent&page=2'))`
   twice, under two fake system times, and compare with `toBe`.

7. **should-fix** — the response size of a cycle-bearing page, at `apps/three-surface-poc/src/trajectory.ts:522`. The cycle
   note lists every member of the SCC in every member group's heading. Failure scenario [Inferred, arithmetic, not
   measured]: take a parent-child cycle of N served items, each the parent of the next. Up to min(N, 250) groups land
   on one page, each repeating N `<code>` ids of about 40-60 bytes. At N = 200 that is about
   200 × 200 × 50 ≈ 2.0 MB of notes alone, past the 2,097,152-byte `maxHumanResponseBytes`, and `boundedResponse`
   then serves a 503 and nothing. Without cycles, a page of 250 one-item groups adds roughly 250 × 600 ≈ 150 KB of
   headings to 250 cards that the ungrouped views already serve [Inferred], which is comfortably inside the ceiling. The `under` list is
   likewise unbounded per parent but bounded by real parent fan-in. Repair: state each cycle once (this also
   resolves finding 3), or cap the listed members with a count and a link. Add a page-size test at 250 positions
   with a worst-case fixture.

8. **note** — the verdict sweep, at `apps/three-surface-poc/src/trajectory.test.ts:1440-1453`. The swept population is the four
   group regions of a fixture with no cycle, no unserved parent, no split and no Unknown group. So the
   cycle note, `GROUP_NOTE['parent-unobserved']`, the continuation sentences and the parent-unknown note are
   outside it. The regex omits "resolved" (RFC8-15) and "satisfied" (RFC8-30). The closed-parent note
   reads "neither is read as the other's completion". As a negation this states no completion [Inferred], but a
   stem sweep (`complet`) would flag it, and the `\bcomplete\b` form passes it only by word boundary.
   Criterion 4 is met for the stated population. Repair: sweep every template, with one fixture that renders all
   of them, and add the two missing words.

9. **note** — `packages/three-surface-poc-core/src/work-item-dependencies.ts:148-149`. A `parent-child` row with a
   null `depends_on_issue_id` and neither the external nor the wisp flag is classed as outside the tracker. The
   `blocks` path classes the same shape as `unobserved-blocker` (line 179). The group note
   (`trajectory.ts` `GROUP_NOTE['parent-outside-tracker']`) then tells the reader "A parent row names an external
   item, a wisp or an item of another tracker", which such a row does not do. No identifier leaks either way.
   Repair: class a flagless null target with `unobserved`, matching `blocks`, or give it its own fixed note.

10. **note** — `apps/three-surface-poc/src/trajectory.ts:517-521` against `spec.md` "link to the parent's card and to the groups
    the parent itself sits under".
    (a) When the grandparent has no group in this view, the code falls back to the grandparent's *card*. That is delta
    choice 5, but the spec text does not state the fallback.
    (b) `under` lists only served parents. A parent that itself sits under "parent outside this tracker", "not
    served" or "no parent recorded" gets no link to those groups.
    (c) When the parent is not matching (a closed parent in the default grouped view), the "sits under G" link lands
    on G's group, where the parent is not listed.
    Repair: state (a) in the spec, and either say "the served parents' groups" in the spec or link the class groups too.

11. **note** — criterion 5, at `apps/three-surface-poc/src/trajectory.test.ts:1455-1476`. The reproduction parses
    `JSON.stringify(model)`, not the served `GET /api/poc` body (the file already has `servedAnswer`). It compares
    group membership only, not group order, totals, the parent status shown, the `cardPage` and `groupPage` link
    targets, or page placement on a multi-page fixture. The design keeps `grouping` out of the machine answer and makes
    pages recomputable from `outline`, which is a sound reading of the POC-REQ-020 parity rule given the "takes no parameter"
    clause [Inferred]. Repair: read the served answer, and compare order and totals as well.

12. **note** — keyboard reach, at `apps/three-surface-poc/src/trajectory-narrowing.browser.test.ts:270-291`. The outline links
    are focused by `link.focus()` and then activated with Enter. That proves keyboard activation and that there is no `<details>` ancestor. It does
    not prove Tab reach, which the existing nav sweep proves only for the view links. Neither the parent-heading
    link (`data-group-parent`) nor a blocker link *on the grouped page* is followed, because the fixture has no
    `blocks` row. Links are plain `<a href>` outside any `details`, so Tab reach holds by construction [Inferred].
    Repair: a short Tab sweep over `.outline a` on both prefixes, plus one blocker row in the fixture.

13. **note** — the delta's "Making the grouped view the default is a further amendment, filed as its own bead" names no
    bead id. Whether that bead exists is [Unknown]: `.beads/issues.jsonl` is absent in this worktree and `bd list
    --json` returned no parseable output here. Repair: name the bead id in the delta and in the PR.

## Criteria

1. **Met, with exceptions.** `trajectory-outline.test.ts:84-97` asserts the literal outline over a fixture with
   nesting three deep (a > b > c), an orphan (a), a two-parent item (d), a two-member cycle (f, g), an
   out-of-prefix parent (h), an external parent (j), an unserved in-prefix parent (i) and a closed parent (x) with
   open children. Lines 122-137 show all ten non-closed items placed [Observed]. The cycle terminates and appears
   once in `outline.cycles`. On the page, however, it is stated in both members' groups (finding 3).
2. **Partly met.** The grouped view is a declared view, with the declared order tested (`trajectory-outline.test.ts:122-137`,
   `trajectory.test.ts` group order). No test shows two grouped renders byte-equal (finding 6).
   **The narrowing**, from "default view grouped by parent" to a declared view, is honestly disclosed in the delta
   ("What explicitly does NOT change", choice 1), in the amended spec ("The default selection is unchanged by this
   parameter; making the grouped view the default is a further amendment") and in the commit message [Observed].
   It is sound as a slice boundary, since criterion 2's own words allow "(default or grouped)". The stated reason, though, is
   test churn and not a reader's interest. The follow-up bead should be named (finding 13).
3. **Met in the projection, under-tested on the page.** Over 640 positions on three pages, each item appears once per parent,
   rendered plus outside equals 603 on every page, and the first and last groups' marks are correct
   (`trajectory-outline.test.ts:178-215`) [Observed]. Middle groups, a three-page group and the HTML marks are not
   asserted (finding 5).
4. **Met for the stated population** (four group regions). The population omits four templates and two RFC words
   (finding 8). No verdict, completion or percentage text exists in any template [Observed, by reading every
   template string in `trajectory.ts:482-557`].
5. **Met in substance.** `trajectory.outline` is carried, and a test regroups the page from the serialized model by its
   own formula. It uses the model rather than the served route, and membership only (finding 11).
6. **Met for the two followed links on both paths**, with no `<details>` ancestor of the targets [Observed in the test
   source]. Tab reach and grouped-page blocker links are not exercised (finding 12). Duplicate fragment targets for
   two-parent cards are prevented (`trajectory.ts` `anchored` set; `trajectory.test.ts` asserts one `id`), except
   for the anchor collision in finding 1.
7. **Met for this review's scope.** POC-REQ-042 is amended with a scenario, POC-REQ-062's edge-type sentence and Scope are
   amended, the RFC8-15 and RFC8-30 coverage rows gain the grouped limb, and the delta exists. Spec text that the code
   contradicts is listed in findings 3, 4 and 10. The row and tag come after this review and are not faulted.
8. Not run by this reviewer, and not faulted.
