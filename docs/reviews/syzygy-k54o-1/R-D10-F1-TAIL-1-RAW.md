# R-D10-F1-TAIL-1 — independent adoption-tail review

VERDICT: REVISE

Ready to merge: not established.

[Observed] Subject: PR825 frozen commit `58bcb2138c757a569c2cfcc96401c25699e5a11b`, tree `8202874011046f55259a92fad73d27a4beed51b5`; base actual source landing `182a703b2dbae97a16ae7334cd84a32b634cedc0`. Review branch `review/syzygy-k54o-1-r1` was clean, fast-forwarded from `ebda9453387864bc534e6b56da61b41464258493` to the subject, and remained clean. No implementation, canonical Beads record, PR, or earlier raw report was changed. No delegation or full-suite/browser run was performed.

[Observed] Scope: the eight changed paths reported by `git diff --name-only BASE..HEAD`: AGENT-ADOPTIONS.md; PROJECT-STATUS.md; generated reconciliation census.json; openspec/README.md; the declared-source change's README.md and tasks.md; build_polaris_dependency_unions.py; check_spec_reconciliation.py. I read the diff and relevant surrounding implementation, the actual post-D10 VIS-4, SEC-5 and RFC3-16, the D10 act, and the unchanged proposed amendment and scoped applicability judgments. The design's acceptance section supplied the bounded delivery criteria. I applied heart-and-soul, engineering-bar and test-rigor guidance; older skill/AGENTS shorthand did not override adopted D10 clauses.

## Material findings

1. **P1 — A-4 records an inoperative revert command for its merge commit.** `.syzygy/governance/decisions/AGENT-ADOPTIONS.md:22`; `scripts/check_spec_reconciliation.py:699`.

   [Observed] A-4 names source landing `182a703b2dbae97a16ae7334cd84a32b634cedc0`, whose parents are `26b2ef360431ab71c02dcde47643665dc153b8c7` and `ebda9453387864bc534e6b56da61b41464258493`. Its recorded `git revert COMMIT` has no mainline selection, and R1 requires precisely that defective command. In an independent scratch clone at the source landing, `git revert --no-commit COMMIT` exited128: “is a merge but no -m option was given.” The `-m 1` control exited0. This fails VIS-4's required “command that reverts it” and its veto rule, “an agent runs the row's revert command.” It also contradicts RFC3-16's reverted-adoption behavior and the retained033 publication contract.

   [Observed] At the actual frozen tail, the corrected `git revert --no-commit -m 1 COMMIT` additionally encounters content/modify-delete conflicts in openspec/README.md and the declared-source README.md/tasks.md, because this tail edits source-package files. The removed bound subjects correctly make the amendment inapplicable with explicit Unknown byte findings; the retained A-4 does not falsely keep it active in that partial-revert state.

   [Inferred] Minimal fix: correct the unlanded row and matching R1/selftest literal to the actual mainline1 reversal, and verify the rollback from the final tail, including the small tail-document conflict resolution or a concrete equivalent rollback procedure. Preserve the append-only history after landing. A generic ceremony framework is unnecessary.

2. **P2 — A malformed adoption row without the required reason remains effective.** `scripts/check_spec_reconciliation.py:693`–`:703`; new mutants near `:2314`.

   [Observed] The binding checks seven cells, commit, tag, revert and subject names, but never the Why cell. Emptying only A-4's Why cell yields applicable amendment text, no record findings, no byte findings and a38-requirement/277-scenario census with no census findings. VIS-4 and RFC3-16 require the row to name “what changed, why, and the command that reverts it”; retained033 repeats that prerequisite. The acceptance condition that invalid rows map none of the amendment therefore is not met. This is a record-validation defect, independent of runtime source/provider admission.

   [Inferred] Minimal fix: reject a missing/blank required reason in the narrow A-4 binding, and add a direct missing-why mutant requiring R1 refusal and predecessor population restoration. Check the required row fields deliberately, without inventing new ceremony. Existing scope-name checks already protect the required What content.

## Verification and limits

[Observed] The three bound subjects remain byte-identical to the source landing, confirmed by direct file versus `git show BASE:path` comparisons and independently computed SHA256:

- proposed specification: `d17dad153f030bd935059a8b0df24286d72370b275a5fb4052de901b2af4e040`;
- dossier-only policy: `516cb1f2dba9ceb3e55166077c0800be6022012406b9b9b5f0df25bcb73aa499`;
- applicability judgment: `a698de216484ee2f221988142e70de3b661c9fb095b0e3eb3cf10390517588d1`.

[Observed] The remote specification tag was queried with `git ls-remote`; its peeled target is the actual source landing. This corroborates publication, not an independent git-tag check performed by R1. Local commit evidence independently establishes the PR824 merge and its parents; the separate hosted merged-at timestamp was not queried in this review.

[Observed] I executed the12 direct composition cases, separate from subject-hash refusals: one control held; eleven structural mutants were killed by both composition methods with no partial application. The control checks the five exact IDs, scenario counts5/28/17/6/3, only046's title change, and preservation of the unaffected predecessor entries. The code derives the expected scenario delta, keeps other additions ADDED-only, and separately compares the JSON warrant union using the existing two parser approaches. These focused results do not establish the complete reconciliation selftest or exact-final-head gate.

[Observed] Test delta from inspection: reconciliation adds12 record/byte/union mutants plus one composition control and11 structural mutants; union generation adds4 focused mutants, for28 added checks across those two selftests. The structural cases exercise parsers directly, avoiding hash-refusal masking. The missing-why counterexample demonstrates one unprotected required field. The root coordinator's reported running selftest and earlier gates were not duplicated or treated as independently observed results here.

[Inferred] The explicit five-ID overlay and three-subject binding are proportionate to this adoption tail. The unchanged runtime/source package was not re-reviewed. Preexisting PWB report-only Unknowns remain outside the F-1/F-5 boundary; this review does not clear them or close F-3/F-4/F-5. F-1 remains open pending the adoption tail's actual default landing and verification. Full exact-final-head checks, hosted checks and actual queue evidence remain unestablished by this review and must be assessed separately after corrections.

[Observed] Retained bounded counterexample evidence (same frozen subject):

- `R-D10-F1-TAIL-1-counterexamples.json`: malformed Why input and scratch source-landing revert/control results;
- `R-D10-F1-TAIL-1-revert-composition.json`:12 composition outcomes, frozen-tail mainline revert conflicts and inactive binding result.

These files are alongside this raw report under `/home/orca/.tmp/syzygy-beads-looper-20261114-54ebc9f1/`. The scratch clones were deleted. This raw is the review of the frozen subject only; later semantic changes require a new retained confirmation.
