# R-GP-IMPL-PWB-ONE-BLOB-READER-1 — CC-REV-1 implementation review of syzygy-bpyt.6.5 (PR 595), round 1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: af369f05abb649316eaa4f7ade0d82f6f588a2e0
Subject: `git diff 85c54814 af369f05` sha256 d28af1776f61d487cfeb4bacc6431901feedcb35aab3cefd90b1b65f90aefce4 (3,662 lines, 26 files)

Reviewer: independent, fresh-context CC-REV-1 reviewer (pr-review-task `syzygy-rfpx`), 2026-11-03. I did not write
this change. I read the bead `syzygy-bpyt.6.5` (description and its five acceptance criteria), the PR body, the diff,
the evidence under `docs/evidence/syzygy-bpyt-6-5/`, and the AGENTS.md PWB pipeline notes and verification rules 4, 6,
9 and 11. All runs used two scratch worktrees under `/tmp/r595/` (base `85c54814580a09bf07e0f8d3536259e126b9ffb5`,
head `af369f05`), `npm ci` in each before any run, Node `v24.6.0`, vitest `3.2.7`. No Butlers or other observed
repository content was read: every input was the PR's in-memory corpus or the committed fixture repository. PR 595
was not edited, commented on or merged, and no `bd` mutation ran.

CC-REV-1 classes: 3 (deterministic observation) and 4 (security: the PWB-REQ-006 read guard), as proposed. I agree.

## Verdict basis

The refactor does what the bead asks. I found no read path that bypasses the P1 authority gate or a screen, no
change to scan order, and no output change outside the one disclosed delta. That delta is a direct consequence of the
bead's stated outcome and changes no gate acceptance on any input whose two listings agree. The exceptions are
disclosure and evidence gaps (E1, E2). None of them is a defect in the shipped behaviour.

## What I checked, and what I found

1. **P1 authority gate and screens: no bypass.** [Observed] `git grep -n "cat-file"` over
   `packages/three-surface-poc-core/src/*.ts` (tests excluded) finds 2 command sites at base (`git-object-reader.ts:328`,
   `project-shape-observation.ts:404`) and 1 at head (`git-object-reader.ts:513`, inside `readBoundedBlob`). The
   other hits at head are comments and a reason string. Both callers still admit first. Phase A calls
   `admitPhaseARead` before `readBoundedBlob`. Phase B checks `maxSources`, then `admitExactObjectRead`, then the held
   body, and only then calls `readBoundedBlob`. Every read still runs inside the `read` callback of
   `observeProjectShape({ authority, read })` in `buildProjectShape` (`project-shape-model.ts`), which is unchanged.
   The differential's `not-admitted` row (REJECTING_AUTHORITY) is identical at base and head. The phase-B tree is
   assigned only after the phase-A listing at the resolved commit has parsed. The guard at
   `project-shape-model.ts:560` throws on `tree === undefined` and is unreachable on an `observed` result. The held-body
   recall still runs after admission, so a body phase A held is never returned for a path phase B refuses.

2. **Scan order is preserved as policy.** [Observed] `classifyPhaseASeed` runs the secret detectors, then the
   active-content scan. `PHASE_B_READ_POLICY.screen` runs only the active-content scan. Secrets stay in `classifySource`.
   My mutant X01 swaps the phase-A order (active content first, then secrets), and two PWB-REQ-006 ledger tests kill it.

3. **Refusal-set partition.** [Observed] `BLOB_READ_REFUSAL_REASONS` has 9 members. `READ_REFUSAL_REASONS` (8) is the
   set minus `not-a-phase-a-seed-path`. `PHASE_A_REFUSAL_REASONS` (4) is that reason plus the three tree checks.
   - The union of the two is the full set.
   - The intersection is exactly `not-in-tree`, `not-a-regular-blob` and `object-id-differs-from-tree`.

   The new partition test pins both properties. My mutant X02 drops `not-a-regular-blob` from `PHASE_A_ONLY`, and
   that test kills it. My mutant X03 makes the phase-B filter exclude `denied-basename` instead, and the partition
   test and the closed-vocabulary test kill it.

4. **Behaviour identity (AC 3): reproduced.** [Observed] I copied `differential-harness.test.ts.txt` (its sha256
   matches the record) into each worktree and ran it there. The comparator (its sha256 also matches) exits 0, and its
   summary equals the record's `comparison` object field for field:
   - 2,671 shapes: 2,611 identical, 60 different.
   - 2,670 phase-A observations, 80 reader rows and 19 models: all identical.
   - Git call logs: 121 identical and 2,550 with the second listing dropped.

   The comparator's call-log test only checks the head log against a prefix (`after[: len(calls) - 1]`), so I ran a
   stricter check. In all 2,490 unfaulted scenarios that differ, the head log equals the base log with exactly its
   second `ls-tree` removed. In all 60 of the 60 second-listing-fault scenarios, the head shape equals the head shape
   of the same scenario unfaulted. The 19 changed package files hash to the record's `subjectFiles` digests at the
   head (19 of 19).

5. **Rule 6.** [Observed] With the PR's own runner (`run_rule6_mutants.py`), I re-ran four of the PR's mutants and
   added four of my own, on the `@syzygy/three-surface-poc-core` suite at the head. All 8 were killed.

   | Mutant | Source | Killed by |
   |---|---|---|
   | R05 (object-id check) | PR | 2 tests |
   | R13 (phase-B recall) | PR | 15 tests |
   | R23 (phase-A active budget) | PR | 1 test |
   | R25 (one listing) | PR | the new count test |
   | X01 (phase-A scan order swapped) | reviewer | 2 tests |
   | X02 (phase-A vocabulary drops `not-a-regular-blob`) | reviewer | 1 test |
   | X03 (phase-B filter excludes `denied-basename`) | reviewer | 2 tests |
   | X04 (phase-B exclusion drops its `activeContent` findings) | reviewer | 19 tests |

   The PR's mutant list has no fragment for the scan order or for the two vocabulary filters. X01 to X03 cover those
   predicates, and the existing tests kill all three.

6. **Exceptions removed (AC 4).** [Observed] `ParsePassBudgetExceeded` no longer appears anywhere outside the evidence
   directory and retained raws. I ran my own Tarjan SCC over value and type relative imports in
   `packages/three-surface-poc-core/src` (tests excluded):
   - base: 2 cyclic components;
   - head: 1, the pre-existing `[code-structure, model, orrery-projection, poc-seeds, proposed-work,
     trajectory-projection, work-items]`.

   This matches the PR. The new `code-structure.ts` → `project-shape-observation.ts` edge closes no cycle.

7. **Registry-bound `PWB_RESOURCE_LIMITS`.** [Observed] The constant stays in `project-shape-observation.ts` (now line
   65), and only the `PwbResourceLimits` interface moved to `pwb-types.ts`.
   `python3 scripts/build_pwb_registry_machine_ceiling_amendment.py --check` reports "applied, verifies".
   `check_quotations.py` exits 0.

8. **Gates at head.** [Observed]
   - `npm run typecheck`: exit 0.
   - `npx vitest run`: 257 test files passed and 3 skipped; 6,028 tests passed and 5 skipped. No failures.
   - `python3 scripts/check_governance.py`: 32 OK, 21 WARN, 0 FAIL.

   I did not run the canonical PROJECT-STATUS battery in a clean clone.

## The disclosed delta (GP-Q0)

[Observed] The base listed the tree twice in each evaluation, both times at the same resolved commit id. Phase A
listed it, and phase B listed it again. The head lists it once and passes the parsed index to phase B. The bead's
Outcome text says this in so many words: "the phase-A tree listing is read once and passed down". AC 2 requires a
count test, and the PR adds one. The base's two phase-B arms (`git ls-tree failed`, `ls-tree record is malformed`)
could only fire when a runner answered the same commit differently on two consecutive calls, so on such an input the
base failed closed on its second answer. On the head, the tree that bounds phase B is exactly the tree phase A
validated its seeds against. There is no window between the listings, and every admission, budget and screen still
applies to every phase-B read.

[Inferred] The delta changes no gate's acceptance on any consistent input, so it is within GP-Q0. Because it does
change an output under a fault, it belongs in the `syzygy-bpyt.10` owner notice by name.

## Exceptions

- **E1 — AC 3's "and a capture" is neither met nor disclosed.** [Observed] AC 3 reads: "Ledger counts, breach
  findings, degradation state and all rendered/machine bytes identical on fixtures and a capture."
  - The differential is fixtures only. The PR says "Fixtures only; no Butlers read" but does not say that the capture
    half of the criterion was left unrun.
  - [Inferred] Guardrail 4 forbids an agent from reading the observed repository, so a capture run would have to be an
    operator command, or a replay of a retained capture if one exists that `buildProjectShape` can consume.
  - Required: say this explicitly in the PR text and in the `syzygy-bpyt.10` notice, or obtain an operator capture
    run before the bead closes.

- **E2 — the differential record is reproducible only from its comparator summary, and its run anchors are loose.**
  [Observed] Three gaps:
  - **The harness header's run command fails.** The command at `differential-harness.test.ts.txt:4` uses
    `--project three-surface-poc`, and vitest answers "No projects matched the filter". The record's `harness.run`
    form, which runs the test file by path, does work.
  - **The output digests depend on the environment.** My base and head outputs have exactly the recorded byte counts
    (30,859,987 and 31,299,219), but their sha256 values differ from the recorded `outputs.*.sha256`. A head run
    repeated in my environment reproduced its own digest. The comparator summary does reproduce, so the record is
    confirmable. The output digests are not, and the record does not say why.
  - **The test-file digests postdate the run.** The record says the head run used `c7acb223`, but the
    `subjectFiles` digests are of the final head, whose test files were changed afterwards by `a51b5e39`. The
    non-test source digests are a valid anchor for the run (`a51b5e39` touched only tests and evidence). The
    test-file digests are not (rule 11).

  Required: fix the header command, and add a note on output-digest variability and on which subject digests anchor
  the run.

## Notes (no change required for this round)

- **N1 — AC 2 is met for the PWB evaluation, not for every listing the bead counted.** The bead's evidence counts three
  `ls-tree` runs, the third being `code-structure.ts:109`. The PR keeps that one and says why (it runs outside the P1
  gate, against the unresolved revision). I uphold the reason: sharing it would move a Git command across the authority
  gate. The count test asserts one listing per `buildProjectShape`, which is the evaluation the AC names.
- **N2 — `readBoundedBlob`, `PHASE_B_READ_POLICY` and `phaseAReadPolicy` are exported through the barrel, and the
  primitive does no admission.** These are `git-object-reader.ts:445`, `:460` and `:499`. This adds no new capability,
  because `gitRunnerFor` is already exported. But the comment calls it "the one door", while nothing stops a caller
  from skipping `admit*`. Say in its comment that callers must admit first, or drop it from the barrel (cf.
  `syzygy-bpyt.7.12`).
- **N3 — the reader never reads `BlobReadPolicy.refusals` (`git-object-reader.ts:439`).** It is declarative only. A
  reader of the policy could take it for an enforced constraint.
- **N4 — the code-structure default runner now copies its output outside the try.** `gitRunnerFor` wraps
  `execFileSync`'s Buffer in `new Uint8Array(...)`, a full copy, before `defaultRunGit` (`code-structure.ts:116-118`)
  wraps it again. That has two effects at the 256 MiB bound:
  - Peak memory is one more copy of the listing.
  - A failure to allocate that copy is now reported as "repository or revision was unreadable", not the decode reason
    the comment still says the module "has always given" for a copy it cannot allocate.

  This is reachable only under memory exhaustion. Also, `code-structure.ts:1` is now an empty line.
- **N5 — some `project-shape-observation.ts` line locators in the inert ceiling-amendment candidate prose move another
  12 lines.** They were already stale at base: `:75-83` and `:82` against base lines 77-85 and 84, now 65-73 and 72.
  They bind nothing, and `check_quotations.py` passes.
- **N6 — test hygiene.**
  - `project-shape-model.test.ts:20-21` imports `./project-shape-observation.js` twice.
  - The PR states "Tests: +4 ~13 -0", but `phase B tree listing failure is gitCaptureFailed too` was removed and a
    differently named test added. Counted strictly, that is +5 -1.
- **N7 — the scope question the PR raises is pre-existing and correctly left alone.** Phase A and the ledger can use
  different envelopes when a caller narrows `resourceLimits`. It is a candidate for its own decision bead, not for this
  PR.

## Reviewer artifacts (not retained)

- My mutant list is `/tmp/r595/s/mutants.json` (R05, R13, R23 and R25 copied from `rule6_mutants.json`; X01 to X04
  defined there with exact old/new fragments). Its run output is `/tmp/r595/s/mutants-out.json`, at head `af369f05`.
- The differential outputs and comparator summary are `/tmp/r595/diff-{base,head}.json` and `/tmp/r595/cmp.json`.

All of these are scratch files, deleted after this review.
