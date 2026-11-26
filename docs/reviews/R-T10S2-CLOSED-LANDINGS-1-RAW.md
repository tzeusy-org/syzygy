# Review R-T10S2-CLOSED-LANDINGS-1
Verdict: REVISE
Reviewer: fresh-context Claude Code review subagent, CC-REV-1, read-only
Subject: commit 8b7549c31

## Bytes bound

- Commit: `8b7549c3132b916cf574c2d922312b7d649c071c` (parent `origin/main` is an ancestor, checked with `git merge-base --is-ancestor`). Reviewed `git diff 8b7549c31~1 8b7549c31`, 11 files, +407/-19.
- sha256 at 8b7549c31, by `git show 8b7549c31:<path> | sha256sum`:
  - `openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md`: `be56a6ab27870e5fccf4982db7c1682dd451fafc012cd0485b1fb9109209b658` (equal to the source digest GOVERNING-DEPENDENCIES.md states)
  - `apps/three-surface-poc/src/trajectory.ts`: `03ed39dedfefa72f8c6b6ef239b7d1ffa8aa034c602a64dd17f3addcf9d55174`

## What was checked

- [Observed] Both named test files pass at the subject: 97/97 (`npx vitest run packages/three-surface-poc-core/src/trajectory-projection.test.ts apps/three-surface-poc/src/trajectory.test.ts`).
- [Observed] Criterion 1: `closedLanding` (trajectory-projection.ts) filters `workItems.items` (every served item, not the rendered selection) and derives each landing only from `status === 'closed'` and membership in `joins.items`. `closedItemLanding` is the one per-card function. The projection and the renderer read the same `commitJoins` value: model-slices.ts passes it to `projectTrajectory` and returns it as `model.commitJoins`.
- [Observed] Criterion 2, Unknown: the projection returns `{state:'unknown', disclosure:'region:trajectory-commit-joins', closed}` and no counts. model.ts adds the subject exactly when that state holds. `answersRegion` is rendered on the observed page and on every narrowed and grouped view (`renderTrajectoryPage` calls it in both branches, and views keep the base answers), so the `id="n-commit-joins"` target exists on every page where a closed card can appear. Cards link to it through `cardMark`.
- [Observed] Criterion 4: test 1 compares `/api/poc`'s `closedLanding` with literals, and test 3 compares every card's `data-landing` on the default and `status=closed` views with the machine answer's join and status. The set of card ids those views cover equals the served population.
- [Observed] Criterion 5: no subject text reaches either channel (the LANDMARKER asserts). The renderer reads only `hash` and `at`.
- [Observed] Criterion 9: I recounted Part A by script (Python over the `| RFC` rows between the Part A header and "Part A totals", with the clause taken by `RFC\d+-\d+`) and got 185 rows, 90 clauses, 132 covered, 53 Unknown, 0 other. An awk/`grep -cF` second method gave 185 / 132 / 53. The parent gives 184 / 90 / 131 / 53. `build_three_surface_poc_spec_dependencies.py --check` matches (32 requirements, 115 authorities).

## Findings

1. **must-fix — RFC4-22's per-item limb is contradicted and the coverage row describing it is now false.** RFC4-22 (fidelity-joins-and-mappings.md:87-89), quoted: "A join that can no longer be established (branch deleted, message tag absent) renders Unknown — never fuzzy-matched." This change gives a closed item that no read commit names a positive per-item state. The card shows the plain, non-epistemic label "Closed, no commit names it", and the answer has an Observed count "N are closed with no commit that names them" [Observed, trajectory.ts `noNamingCommitLabel`, `closedLandingSentence`]. That is the "message tag absent" case the clause says renders Unknown. The CONTRACT-COVERAGE.md row the commit leaves unchanged (line 255) still says, for RFC4-22: "an item no read commit names gets no entry and no per-item state". After this commit that sentence is false [Observed]. The bead's outcome text asks for the label, so the conflict is between the bead and the contract clause. Neither the spec text of POC-REQ-065 nor the coverage table discloses it [Observed: POC-REQ-065 cites RFC4-22 in `contracts:` but its body never addresses the absent-tag limb]. Repair: either render that landing with the Unknown encoding of the link (for example "Closed; whether a commit landed it is Unknown: no commit read names it", marked and linked) while keeping the count, or keep the label and amend the RFC4-22 coverage row to say POC-REQ-065 renders the absence as an observed "no naming commit read" state and why that does not breach the clause. Either way, the stale row sentence must change.

2. **should-fix — the Unknown answer says "merged" with no "naming convention", against POC-REQ-065's own oracle.** `commitJoinsBasis` (model.ts) renders "Whether each closed item merged, by a commit that names it, is Unknown: … No closed item is counted as merged or as having no naming commit." `answerDisclosure` places that text in the remains answer whenever the join is Unknown [Observed from code; test 5 asserts part of this sentence in the machine subject]. The spec oracle reads: "the landing labels and the answer's words, with tags removed, hold no verdict word and no 'merged' without 'naming convention'". The Unknown answer contains "merged" twice and "naming convention" never. The words test (test 2) sweeps only the observed case, so nothing catches it. Repair: reword to "merged by naming convention" or "landed", and extend the words sweep to the Unknown fixture.

3. **should-fix — the card's commit-list predicates survive mutation (criterion 7).** I applied three single-site mutants to trajectory.ts, ran both test files after each, and restored the file:
   - `commits.slice(0, CARD_COMMIT_LIMIT)` → `commits` (no three-commit cap): 97/97 pass, so the mutant survives.
   - `${listed}${more}` → `${listed}` (the "N more in the machine answer" count is dropped): 97/97 pass, survives.
   - ` <time datetime=…>${commit.at}</time>` → `` (the committer instant is dropped): 97/97 pass, survives.

   Every fixture item has at most one naming commit, so the cap, the remainder count and the newest-first order the spec requires are all unexercised. No test asserts the instant, which the spec ("each as its first twelve hash characters and its committer instant") and the bead both require. Repair: add a fixture item named by at least four commits, and assert three listed newest first with instants and "1 more".

4. **should-fix — no page-size measurement covers the new card content (criterion 6).** [Observed] I temporarily appended a scratch describe to trajectory.test.ts and reverted it with `git checkout`. It took the existing worst-case fixture (260 items, 500-`"` titles, two parents and three blockers each) and injected an observed join naming every item 19 times. The largest page was then 1,884,241 bytes of the 2,097,152 ceiling (89.8%), against 1,787,412 without commits. Each card gained about 765 bytes. The page stays under the ceiling, because the card cap bounds it at three commits per card. But the existing 90% guard would now pass by 0.2% if it carried commits, and no test measures a page with commit lists at all. Repair: give the worst-case size fixture full commit lists, so the cap's contribution is measured, and state the margin.

5. **should-fix — the Unknown case checks one closed card, not every closed card.** The spec ("the Unknown case … marks every closed card"; the case calls for "A sweep over every served item's card on the default and closed views") and acceptance criterion 2 call for every closed card. Test 5 checks only `bu-closed-old` on `status=closed`, plus `bu-open1` for absence. The observed-case sweep (test 3) is not repeated for Unknown. A per-card mutant that marked only some closed cards would not be caught [Inferred from the test text; not run]. Repair: repeat test 3's loop over the Unknown model, and assert on each closed card its `data-unknown-ref`, the link `href="#n-commit-joins"`, and that the target id is present on that page.

6. **note — `COMMIT_JOINS_UNKNOWN_BASIS` is typed `Record<string, string>`, not `Record<CommitJoinUnknownReason, string>`.** A fifth reason added to `COMMIT_JOIN_UNKNOWN_REASONS` would fall through silently to the raw code. The `'the commit join was not read'` / `'unread'` arm of `commitJoinsBasis` is unreachable, because the function is called only when the join is Unknown. Only one of the four reason sentences is tested (`commit-history-read-failed`).

7. **note — `check_spec_reconciliation.py --check` fails at the subject and passes at its parent.** [Observed in a scratch `--shared` clone; removed afterwards] At `8b7549c31~1`, R1–R5 and R7 are OK and R6 WARNs. At `8b7549c31`, R1 (1 finding), R2 (16 findings) and R3 (3 findings: "POC: 32 requirements / 61 scenarios, expected 26 / 28" and a census mismatch) FAIL. The commit adds `('three-surface-poc-closed-landings-amendment-v1.0', {"065": 2})` to `POC_SCENARIO_AMENDMENTS`, but no such tag exists, and `AGENT-ADOPTIONS.md` has no `t3jk.26` row [Observed: `git tag -l` empty; `grep -c` 0]. [Inferred] The failures clear when the adoption row and tag land, as they did for t3jk.25 (`ff09b309d`). The battery is not green for this commit alone.

8. **note — wording in the Unknown sentence.** "Of 2 closed items, Where each landed: Unknown. …" puts a capitalised label mid-sentence after a comma. The "Landing: Unknown" card mark carries `data-unknown-reason="source-uncaptured-or-unreachable"`, while the join's own reason (`commit-history-read-failed`, …) appears only in the disclosure text. That meets the spec ("whose reason names the join's own closed reason"), but only inside the prose.

Criteria with no finding: 1, 4, 5, 9 [Observed]; 8 holds except where findings 1 and 2 apply.

## Count

8 findings: 1 must-fix, 4 should-fix, 3 note.
