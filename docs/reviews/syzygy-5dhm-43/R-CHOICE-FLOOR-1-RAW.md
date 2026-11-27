# R-CHOICE-FLOOR-1 — syzygy-5dhm.43 choice floor
Reviewed commit: a3bb87f6a5a56a7fe5d6ec05592ead4321735c7b
Verdict: REVISE

Scope: `git diff e852d0c9a a3bb87f6a` (23 files). Snapshot worktree at a3bb87f6a with `npm ci`; removed after review.

## Checks run

- [Observed] `npx vitest run packages/polaris-dossier/src/reader-standards.test.ts packages/polaris-dossier/src/check.test.ts`: 2 files, 401 tests passed.
- [Observed] `python3 scripts/check_spec_reconciliation.py --check`: "7 of 7 predicates without FAIL; PASS". `--selftest` could not run: the host `/tmp` tmpfs hit ENOSPC (`[Errno 28] No space left on device`) while copying fixtures; an environment fault, not this PR, but the selftest is unverified here.
- [Observed] `python3 scripts/count_polaris_effective_scenarios.py`: "TOTAL: 39 requirements, 569 scenarios"; PROJECT-STATUS asserts the same.
- [Observed] `python3 scripts/check_governance.py`: "22 OK, 17 WARN, 0 FAIL (39 checks)".
- [Observed] `sha256sum` of the 2.33 spec = `55f55146…69918`, equal to `CHOICE_SUBJECTS` in `scripts/check_spec_reconciliation.py`; the spec is unchanged between 7ec9dc94e and a3bb87f6a (empty diff), so the tag at 7ec9dc94e binds the pinned bytes.
- [Observed] Independent diff of 2.32 (`0e0b281d1:openspec/changes/dossier-question-kind-floor/proposed/polaris-generation/spec.md`) against 2.33: hunks only at the title (1), banner (3), one inserted paragraph (after 151), two inserted scenarios (after 1529) and the Observable, Oracle and Falsifier lines, each of which starts with its predecessor line byte-for-byte (Python `startswith` true for all three). The 220 predecessor scenarios are byte-identical. `choice_floor_inverse.py .` also prints "inverse equals 2.32: True" and "scenarios 220 222 prefix identical: True".
- [Observed] Advice cannot reach the outcome or the record: `check.ts:334-338` builds `stored` from `figureFit`, `readingLedger` and `manifestFacts` only; `readingLedger` reads `advice.advisories` alone (`reading-ledger.ts:163`); `readerAdvice` goes only onto the report (`check.ts:392`). No file under `apps/` or any renderer changes; the provider golden is untouched. The detail names only the Pole's label (already rendered, and already named by the worth-knowing advice), never an item id or path.
- [Observed] Spec paragraph and `choiceFloorAdvice` agree on every point checked: Inferred only (`entry['label'] === 'inferred'`; the schema's `understandingItem` admits only `inferred` and `unknown`), groups as the worth-knowing count (`poles` min 1 in the schema, so `poles: []` cannot pass), each section in the first Pole naming it, attribution by any citation path at any depth of the Pole's counted sections, threshold `>= 3` is no advisory, singular at 1, no-Pole detail drops the clause, absent before v13.

## Findings

F1 — blocking — `.syzygy/governance/decisions/AGENT-ADOPTIONS.md` row A-321, revert column.
[Observed] The whole-change command `git revert --no-edit e852d0c9a0fe624778924f2745e5c7d03655626a..7ec9dc94ee31ac8d8405e063a69b01c84a83b6d0` cannot run: the range contains the merge commit `e7515309b` ("Merge origin/main into agent/syzygy-5dhm.43"). Run from a detached 7ec9dc94e it reverts 7ec9dc94e and b3194e7af and then stops with `error: commit e7515309b1cebc00cdc73a6cfdb4cacb3619cdf6 is a merge but no -m option was given.` / `fatal: revert failed`. Run from a3bb87f6a (where the row will actually sit) it conflicts earlier, at the revert of b3194e7af, on `openspec/README.md` and `openspec/changes/dossier-choice-floor/tasks.md`, because the adoption commit a3bb87f6a (status, README route, tasks) is outside the range. So the row's revert command does not revert the change from any commit it could be run at.
Repair: name the non-merge commits explicitly, the adoption commit first. Verified on the snapshot from a3bb87f6a: `git revert --no-edit a3bb87f6a 7ec9dc94e b3194e7af eb7109308 698481959` applies cleanly, five revert commits, and `git diff --stat e852d0c9a HEAD` is empty afterwards. Since the row cannot name its own commit's hash, either land the row in a follow-up commit that names a3bb87f6a in full, or word the command as "revert the commit that adds this row, then `git revert --no-edit 7ec9dc94e… b3194e7af… eb7109308… 698481959…`" with full hashes. Run it once in a scratch clone after the change is merged (merge-commit merges keep these hashes; a rebase or squash merge would retire every hash in the row).

F2 — non-blocking — row A-321, commit column.
[Observed] The row names only `7ec9dc94e…` (the spec, inverse script and evidence README head). The two code commits, `69848195910d5cf1e8245fe480942f4e79230959` (`reader-advice.ts`, tests) and `eb7109308…` (mutation record, survivor test), appear nowhere in full; they are reachable only through the range in F1, which does not run. The brief for this change requires the row to list the full code commit hashes.
Repair: list `698481959…`, `eb7109308…`, `b3194e7af…` and `7ec9dc94e…` in full in the commit column (the form A-320 uses), together with the F1 repair.

F3 — non-blocking — test weakness, `packages/polaris-dossier/src/reader-advice.ts:73` (item citations).
[Observed] Mutant: item paths taken from the first citation only, `{ citations: list(entry['citations']).slice(0, 1) }` in place of `entry['citations'] === undefined ? [] : { citations: entry['citations'] }`. reader-standards and check tests: 401 passed, survived. (check.test.ts reported a 30 s `afterAll` hook timeout in `vitest.setup.ts:22` on that run with every test passing; [Inferred] a teardown flake under the near-full `/tmp`, not a kill.) The spec says "a file one of its citations names"; every fixture item carries one citation.
Repair: one reader-standards case where an item's second citation alone names the Pole's file and it counts.

F4 — non-blocking — test weakness, `packages/polaris-dossier/src/reader-advice.ts:58` (section walk "at any depth").
[Observed] Mutant: `else if (key !== 'children' && key !== 'items' && key !== 'rows') citedPathsIn(member, into);` (no descent into a block's `children`, a callout's `children`, steps/cards `items` or table `rows`). `-t choice` over both files: 5 passed, survived. The recorded `nested-citations-ignored` mutant removes all recursion, which the section → `paragraphs` step alone kills, so nesting proper is unpinned although the spec states "at any depth".
Repair: give one fixture section a paragraph whose only citation of the attributing file is inside `children` (or a callout or steps item), and assert the item counts.

F5 — non-blocking — design, `openspec/changes/dossier-choice-floor/design.md` and the spec paragraph.
[Inferred] Deep dives carry `sectionId` (`draft-schema.ts:367`) and belong to their section's Pole (A-320 gives each deep dive its Pole's hue), but the walk covers only `doc.sections`, so an Inferred choice citing a file only the Pole's deep dive cites is on record for no Pole and the Pole may be advised for it. Spec and code agree (the paragraph says "inside one of the Pole's counted sections"), so this is not a spec/code mismatch; but design.md's "it never advises a Pole for an item it cites" is true only if a Pole's deep dives are not the Pole's. The floor can over-advise in that case.
Repair: either include each produced deep dive's citations under the Pole of its `sectionId` (a spec change within this amendment, before the tag), or state in design.md that deep-dive citations do not attribute, and narrow the "never advises" sentence.

F6 — non-blocking — `packages/polaris-dossier/src/check.test.ts:2313-2322`.
[Observed] The check-record assertion `expect(read(run, 'checks/rev-0.json')).not.toContain('choiceFloor')` is made only on the run whose `choiceFloor` is `[]`; the advised case (`two`) goes through `findingsOf` and its record is never read. The outcome is asserted as `'passed'` but not compared with the same draft's outcome without the advice. [Inferred] Today nothing stores `readerAdvice`, so this is weak, not wrong.
Repair: read the check record of the advised run and assert it carries no `choiceFloor`.

## Not found

- [Observed] No off-by-one: `>= CHOICE_FLOOR` (3) skips, killed both ways by the recorded `floor-inclusive` mutant.
- [Observed] Multiple Poles sharing a file: an item may count for each, as the spec states; the second-Pole-same-section case is deduplicated by `counted` and tested.
- [Observed] Items citing no file: an Inferred item must carry at least one citation (`citations(1)`), so the only uncited items are Unknown and never counted.
- [Observed] Reconciliation wiring composes 2.33 only over an effective 2.32 (`choice_binding` with `predecessor=qkind_binding`), counts 222 − 220, and tracks the new home; `--check` passes.
