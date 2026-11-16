# R-GP-IMPL-GEN-MUTATION-PLAN-1 — CC-REV-1 implementation review of syzygy-kpbq, round 1
Verdict: REVISE
Reviewed commit: e40af0ea
Subject: r1-review.diff sha256 72b3e27ad9c619852e25288d3a252c69d8fce40ee3fe0dc8618d1e557c6f7ba7

Reviewer: rev-543, fresh context, 2026-10-27. PR #543 (`agent/syzygy-kpbq`), base `973965a82f82d9b90af05e4b96524aae0d9dbec4`,
head `e40af0ea2129cad9337082774fb7569f3b40fcad`. PR body judged: sha256
`69f51ea2e2240f0fdfae691dcdd3242c091de0ff1fd6bbdcc8917760532528dd` (`gh pr view 543 --json body --jq .body`, unchanged
at the start and end of the review; retained as `pr-body.md`).

The single blocking finding (F1) is one false sentence in the PR body's disclosures. No reviewed byte has to change: the
re-points, the whole-plan run, the fragment test and the class all check out. The fix is an edit to the PR body.

## 1. Subject identity checks

All digests below were computed by script in a scratch clone of `/home/tze/GitHub/syzygy`, with `Tzeusy/syzygy` fetched
as a second remote.

| Check | Expected | Re-derived | Match |
|---|---|---|---|
| `sha256(r1-review.diff)` | `72b3e27a…7ba7` | `72b3e27ad9c619852e25288d3a252c69d8fce40ee3fe0dc8618d1e557c6f7ba7` | yes [Observed] |
| `sha256(git diff 973965a8 e40af0ea)` | the same | `72b3e27ad9c619852e25288d3a252c69d8fce40ee3fe0dc8618d1e557c6f7ba7`; `cmp` against the file: identical | yes [Observed] |
| `sha256(git diff 973965a8 e40af0ea -- .github apps)` | `1a09d7ab…49eb` | `1a09d7ab61069389ba924e83d64bd115305f87a98c9d81be8c1fd2edff1f49eb` | yes [Observed] |
| Shape | 8 files, +672/−7 | `8 files changed, 672 insertions(+), 7 deletions(-)` | yes [Observed] |
| PR head on GitHub | `e40af0ea` | `gh/agent/syzygy-kpbq` = `e40af0ea2129cad9337082774fb7569f3b40fcad`; `gh pr view` headRefOid the same, state OPEN | yes [Observed] |
| Merge base with main | `973965a8` | `git merge-base gh/main e40af0ea` = `973965a82f82d9b90af05e4b96524aae0d9dbec4` | yes [Observed] |

**Main since the base.** `gh/main` was `d621bfa2` ("Merge pull request #538") on the first fetch and again on the last
fetch, just before writing [Observed]. `git diff --name-only 973965a8 gh/main` lists 131 paths. Their intersection with
the 8 PR paths is empty, and so is their intersection with the 5 mutated sources and the 4 runner test files
(`packages/polaris-generation-core/src/{canonical-json,parse-json,pipeline,provider-draft,draft-model}.ts` and
`{canonical-json,parse-json,pipeline,provider-draft}.test.ts`) [Observed]. Four main paths sit in neighbouring
directories, and none of them is a runner input: `apps/three-surface-poc/src/polaris-generation/durable-lifecycle.test.ts`,
`.../generator-install-check.test.ts`, `packages/polaris-generation-core/src/dossier-evaluation.test.ts` and
`.../dossier-profile.test.ts`. The open PRs #542 (`2ffc7405`), #537 (`5e78e852`) and #534 (`f49578ba`) had files that
matched none of the 5 sources, the plan, the runner, the test or the workflow when I queried them (`gh pr view --json
files`, filtered by regex) [Observed].

**Merge with current main.** A local merge `ff4e3f10` (parents `e40af0ea`, `d621bfa2`) was clean. On it,
`generation-mutation.test.ts` gave `Test Files  1 passed (1)` and `Tests  1 passed (1)` (load1 34.14) [Observed].

## 2. Clauses relied on, and the class ruling

**CC-REV-1** (`.syzygy/governance/policies/craft-and-care/review-and-documentation.md`, at `e40af0ea`):
- :18-19: "Changes touching any of seven classes require review by an independent, fresh-context reviewer, and the agent
  performing the change never finally decides which classes it touches."
- :49-50: "**The change record states** which classes the change touches, or "none," so a misclassification is a
  findable violation after the fact."

**GP-Q0** (`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`):
- :51: "Behavior-preserving refactors may proceed under the acts already in force. They may touch `apps/**`, `packages/**`,
  `scripts/**`, tests, CI and root manifests."
- :52-55: ""Behavior-preserving" means none of the following changes: a rendered byte, a wire format, a refusal string or
  an exit code; a signed or digest-bound artifact; a consent, security or retention decision."
- :60: "Each pull request states which CC-REV-1 classes it touches."
- :95: "Any change not listed here to what a gate accepts or refuses stops and returns to the owner."

**AGENTS.md at `e40af0ea`:**
- rule 6 (:126): "Mutate the input and confirm the check fails, per predicate, before trusting it".
- rule 9 (:132): "A claim of absence needs a sweep with a denominator."
- guardrail :277: "A mutation that throws at describe time reports zero tests and scores as survived — build fixtures in
  `beforeAll`."
- guardrail :279: "A rule-6 evidence record must store each mutant's `old`/`new` fragment and the commit it ran at".
- guardrail :256: "`npm run poc:pwb-*-mutation-*` rewrites sources in place (~35 min): never edit or commit while it
  runs." (The generation runner does the same thing, and the same caution applies.)

**Test-rigor bar** (`git show e40af0ea:.claude/skills/th-engineering/subskills/test-rigor/SKILL.md`):
- :42: "**A test is worth keeping only if some plausible bug makes it fail.**"
- :58-59: "**Every bugfix ships a regression test** — Written to fail on pre-fix code."
- :82-84: "**A failure names the defect** — … assertion messages make the diff readable. A maintainer should localize the
  bug from failure output alone."
- :93-95: "**Growth is governed** — A test is worth *adding* only if it catches a plausible bug no existing test catches".

**Class ruling: CC-REV-1 classes "none"** [Inferred: reviewer ruling]. The change is a CI-workflow comment, a runner
header comment, two data edits in the mutation plan plus one plan comment, one new test, and evidence files. It touches
none of the seven classes. It changes no authority boundary, graph identity, observation path, security or egress
surface, migration, public interface or certificate.

**GP-Q0 Part 1: behavior-preserving** [Observed for each of the three limbs]:
- **No rendered byte, wire format or refusal string changes.** All 5 mutated sources are byte-identical between base and
  head, by sha256 prefix: pipeline `89df81566b51fdcc`, provider-draft `9294fd906187fd2a`, draft-model `0c64dd7330a52676`,
  canonical-json `4d7e745dc505c0de` and parse-json `f56eafe27e3881fb`. `git diff --stat 973965a8 e40af0ea -- packages` is
  empty.
- **No signed or digest-bound artifact changes.** I hashed the base bytes of the 3 modified code files and searched all
  5,988 tracked files at `e40af0ea` for each digest. The workflow and the plan have 0 citers. The runner's base digest
  appears in 4 evidence JSON rows of other reviews' comment-only checks (for example
  `docs/evidence/syzygy-bpyt-6-3/comment-only-negative-control.json` `rows[8].sourceSha256Head`). Those rows record
  history; they do not bind the file. `STATIC-TRACE.json` in a candidate package names both files with older digests that
  did not match even at the base.
- **No consent, security or retention decision changes.**

**What a gate accepts or refuses.**
- **The generation-mutation gate's rule is unchanged** [Observed]. The runner diff and the workflow diff are
  comment-only. The runner still exits 0 only when `survived === 0 && restoreFailures === 0`
  (`generation-mutation-run-main.ts:187`), and the workflow's clean-tree step (`generation-mutation-gate.yml:52-55`) is
  untouched. The gate's outcome goes from red to green because the plan's fragments apply again. It again refuses
  disabling the same 12 predicates that it refused at `2546a99d`.
- **The runner's exit code on main changes from non-zero (an uncaught throw) to 0.** This is the same fact as the gate
  going green. The coordinator's owner notice covers it.
- **A second, prospective change.** node-ci now refuses any PR in which a plan fragment does not occur exactly once in its
  source. That is bead scope item 3's stated purpose, and it is a test addition that GP-Q0:51 permits ("tests, CI"). It
  refuses nothing at `e40af0ea` or on the merge `ff4e3f10` [Observed].
- **Does the coordinator's "only gate-outcome change" hold?** I agree that the scheduled gate going green is the only
  change in a *current* outcome. It is not the only change in what a CI gate *will* refuse. N9 asks the owner notice to
  name both. No product gate's accept or refuse set changes.

## 3. What I ran, and the results

All runs used a private TMPDIR (`/tmp/r543-1`, `/tmp/r543-2`), one vitest process at a time. `/proc/loadavg` load1 is
given beside each run.

| # | Run | Load1 | Result |
|---|---|---|---|
| 1 | `npm ci`, then `npm run build:poc` at `e40af0ea` | 35.58 / 36.53 | exit 0 / exit 0 [Observed] |
| 2 | Plan dumped from the built module (`plan-e40af0ea.json`); both PR run records compared to it by script | — | Whole-plan record: 12/12 entries equal to the head plan in id, file, description, old = from, new = to and mustFail, in plan order. Cap record: 1/1 equal [Observed] |
| 3 | The cap mutant alone, `tools/apply_and_read.py`, against `pipeline.test.ts` | 35.51, then 31.57 | `total 33 passed 30 failed 3`; source restored, sha256 `89df8156…5164` before and after (details below) [Observed] |
| 4 | The draft-model mutant alone, against the runner's 4 test files | 34.50 → 38.20 | `total 107 passed 103 failed 4`; restored, `0c64dd73…` before and after (details below) [Observed] |
| 5 | The whole plan: `npm run poc:generation-mutation-run -- --date 2026-10-27-r543` at `e40af0ea`; nothing was edited while it ran | 39.76 → 38.28 | `baseline: 107/107 passed; 12 mutations`, 12 `killed` lines, `summary: 12/12 killed, 0 survived, 0 restore failures`, `exit 0`. Record `whole-plan-r543.json`: commit `e40af0ea…`, `uncommittedChanges: []`, sourceDigestsBefore == After over 5 files. Per-mutant records equal the PR's `…-2026-10-27.json` in 12/12 (including observed counts); testFiles equal [Observed] |
| 6 | Both PR records' digests checked against `git show e40af0ea:<file>` | — | 5/5 equal [Observed] |
| 7 | `generation-mutation.test.ts` alone at `e40af0ea` | 27.47 | 1 passed [Observed] |
| 8 | `python3 -I docs/evidence/syzygy-kpbq/plan_test_mutants.py` at `e40af0ea` | 27.37 | `control passed; 7/7 killed; 7 restored`. Each mutant's first failure message equals the PR record's (7/7), and the planSha256 matches [Observed] |
| 9 | My own test mutants, `tools/own_test_mutants.py` (§7) | 28.63 → 36.38 | control passed; R1–R5 survived, R6–R8 killed, all 8 restored [Observed] |
| 10 | The test against the **base** plan (`git show 973965a8:<plan>` written over the plan, then `git checkout`) | 35.38 | vitest exit 1, with one failure: `pipeline-repair-cycle-cap-disabled: expected +0 to be 1`. Restored sha `45df0eb0…` equals `e40af0ea`'s blob [Observed] |
| 11 | Two extra source mutants on the inner `verdict.reviewerBlocking` predicate (`tools/extra-mutants.json`) | 35.33 | `if (true)`: 1 failing, the quote-survives test at `pipeline.test.ts:335-340`. `if (false)`: 2 failing, `:249` and `:349-353`. Both assertion errors; restored [Observed] |
| 12 | The full vitest suite at `e40af0ea` (`npx vitest run`, default and JSON reporters) | 39.50 → 40.83 | exit 0; `Test Files  245 passed \| 3 skipped (248)`, `Tests  5438 passed \| 5 skipped (5443)`; `generation-mutation.test.ts` passed [Observed] |
| 13 | `npm run typecheck` | 34.39 | exit 0 [Observed] |
| 14 | `python3 scripts/check_governance.py` | 32.11 | exit 0; `32 OK, 21 WARN, 0 FAIL (53 checks)` [Observed] |
| 15 | `python3 scripts/check_quotations.py` | 33.87 | exit 0; `OK    QC-1 … 39 quotations examined …, 0 findings` [Observed] |
| 16 | The merge `ff4e3f10` with main `d621bfa2`: fragment test | 34.14 | 1 passed [Observed] |
| 17 | Hosted: `gh pr checks 543` | — | `checks pass 19m15s` (governance-docs 40508133986) and `node pass 4m40s` (40508133978, headSha `e40af0ea`, `pull_request`). The node log shows `✓ … generation-mutation.test.ts (1 test)` [Observed] |
| 18 | Gate history: `gh run list --workflow generation-mutation-gate.yml --limit 60` (36 runs listed), then `tools/sweep_gate_logs.py` over the newest 26 | — | See the history sweep below [Observed] |

**Run 3, the cap mutant.**
- The 3 failures are assertion errors that took 18.6 ms, 10.0 ms and 6.2 ms. None is a timeout.
- The must-fail test, "stops when calls or repairs are exhausted and when usage is unknown", fails at
  `pipeline.test.ts:257:175`, the `maxRepairCycles: 0` call with an always-blocking fidelity. The default reporter's diff
  (`cap-mutant-default-reporter.txt`) reads:
  ```
  -   "reason": "repair-exhausted",
  +   "reason": "budget-exhausted",
  ```
- The other two failures come from tests that 5955f8c0 added:
  - "does not stop the run when a misquote survives the last repair…" (`-   "status": "awaiting-rendered-review",` /
    `+   "status": "stopped",`);
  - "still stops as repair-exhausted when the reviewer's own verdict blocks after the last repair"
    (`+   "reason": "budget-exhausted",`).

**Run 4, the draft-model mutant.** All 4 failures are assertion errors:
- "refuses missing admitted sources, unknown support and duplicate local identities": `expected [Function] to throw an
  error` (`provider-draft.test.ts:88`);
- "refuses dangling diagram endpoints, deep-dive parents and duplicate draft handles": `expected [Function] to throw
  error including 'duplicate-handle' but got 'unknown-asset'` (`:101`);
- "counts child blocks as blocks in handles, produced assets and fidelity coverage" (`:241`);
- "rejects duplicate or malformed trusted asset requests before provider dispatch" (`pipeline.test.ts:217`).

Both must-fail names are among the failures.

**History sweep (run 18).** I checked all 24 failing scheduled runs, plus the last green run and the dispatched branch
run: 26 logs, with no sampling.
- The 24 failing scheduled runs run from 37196853549 (2026-10-04, `ac35c998`) to 40486647289 (2026-10-27, `41932c3b`).
  Each prints `baseline: 107/107 passed; 12 mutations` and exactly 7 `killed` lines, with 0 `SURVIVED`. The killed-id
  sequence is the same in all 24: mutants 1–7, `canonical-json-sorted-keys-disabled` … `pipeline-max-calls-disabled`.
  Each prints exactly one line matching `expected exactly one occurrence of the fragment, found \d+`, and it names
  `pipeline-repair-cycle-cap-disabled` (24/24). Each prints no `summary:` line.
- The last green run, 37115637827 (2026-10-03, `2546a99d`), prints `summary: 12/12 killed, 0 survived, 0 restore
  failures` (its baseline was 96/96).
- The dispatched run, 40508139318 (`workflow_dispatch`, `e40af0ea`), prints `summary: 12/12 killed, 0 survived, 0 restore
  failures`. Its per-mutant failing counts equal my local whole-plan run's, line for line.
- On the failing runs, step 6 "confirm sources restored" is `skipped` (checked on 37196853549 by `--json jobs`). On
  40508139318 it is `success`.
- Ancestry: 5955f8c0 is in `ac35c998` and not in `2546a99d`. 69995614 is in `9a30237e` (the 2026-10-22 run) and not in
  `fdc866af` (the 2026-10-21 run) [Observed].

**The lane's full-suite timeouts.** The PR body says 25 failures in 6 files at load1 42–56. No log of that run is
retained in the PR, so the claim is [Unknown] to me. My own full run at load1 39.5–40.8 had 0 failures, which is
consistent with the lane's host-load explanation [Inferred]. There was no failing file for me to re-run alone.

## 4. Findings

### F1 — A disclosure sentence about `draft-model.ts` is false (blocking under the brief's rule; low severity; PR body only)

- **Sentence.** In "Ruling and disclosures", the second bullet: "Only the gate's CI scratch run mutates it, and that run
  restores it digest-verified."
- **First clause, evidence** [Observed].
  - The runner rewrites the sources of whatever checkout it is run in. It writes `join(REPO_ROOT, mutation.file)`
    (`generation-mutation-run-main.ts:127-133`), and REPO_ROOT is the checkout (`:30`).
  - Its header says it "reads and rewrites only this repository's own source files" (`:14-16`), and it is documented for
    local use (`:18-19`, `npm run poc:generation-mutation-run`).
  - The PR's own evidence comes from such local runs. The whole-plan record at `3669ae24` lists `draft-model.ts` in
    `sourceDigestsBefore` and `sourceDigestsAfter`, and its mutant 10 targets `draft-model.ts`. My run 5 also rewrote it
    in my clone.
  - So the scheduled CI job is not the only thing that mutates `draft-model.ts`. Any local
    `npm run poc:generation-mutation-run` rewrites it in place in the operator's checkout, as this PR's own evidence run
    did.
- **Second clause, evidence** [Observed]. The clause is true only on the normal path:
  - Per mutant, the digest is checked after the inner `finally` (`:134-136`).
  - If a mutant throws (the fragment error that every scheduled run since 2026-10-04 hit, or a vitest crash in
    `runTests`), the outer `finally` (`:188-191`) rewrites the captured bytes with no digest check.
  - In CI, the workflow's "confirm sources restored" step is then `skipped`, as in run 37196853549 (step 6), because it has
    no `if: always()`.
- **Failure scenario.**
  - The coordinator asked for this disclosure. It tells a cold reader, and the owner notice that will draw on it, that a
    `/live` module reached by the `syzygy` CLI is mutated only inside a throwaway CI checkout.
  - An operator who believes that may edit, build or commit `draft-model.ts` while a local run holds a mutant in it. That is the in-place rewriting hazard that guardrail :256 records for the PWB runner.
  - Before this PR, a local run never touched `draft-model.ts`.
- **Proposed fix.** Edit the PR body only; no reviewed byte changes. Suggested replacement: "The mutation runner rewrites
  it in place wherever it runs: the scheduled job's CI checkout, or a local checkout running `npm run
  poc:generation-mutation-run`, as this PR's own run at 3669ae24 did. Never edit, build or commit while it runs. Each
  mutant's restore is digest-checked (`generation-mutation-run-main.ts:134-136`). After a mid-run throw, the outer
  `finally` writes the original bytes back without a digest check, and the workflow's clean-tree step is skipped."

### N1 — The change record states no CC-REV-1 classes (note; PR body)

- **Evidence** [Observed].
  - CC-REV-1:49-50 requires that "**The change record states** which classes the change touches, or "none,"".
  - GP-Q0:60 requires "Each pull request states which CC-REV-1 classes it touches."
  - The PR body (sha `69f51ea2…`) contains no "CC-REV" string. Its one use of "class" ("Its class is *the move followed
    through*") is about direction, not CC-REV-1.
  - The 5 commit messages contain neither "CC-REV" nor "class".
- **Failure scenario.** A later misclassification cannot be found from the record. That is the property the clause exists
  to keep.
- **Fix.** Add "CC-REV-1 classes: none" (this review's ruling, §2) to the PR body in the same edit as F1.

### N2 — The fragment test stops at the first drift, and two of its assertions do not name the mutant (note; test bytes)

- **Evidence: the first drift masks the rest** [Observed].
  - The test is one `it` with a `for` loop of hard `expect`s (`generation-mutation.test.ts:19-27`).
  - Against the base plan, which carries both real drifts (run 10), it reports only
    `pipeline-repair-cycle-cap-disabled: expected +0 to be 1`. The second drift, `provider-draft-duplicate-handle-check-disabled`,
    is not reported.
  - This is the masking class the PR documents: the runner throws at the first missing fragment, and that is how mutant
    10 hid behind mutant 8.
- **Evidence: unnamed failures** [Observed]. `expect(applyLiteralMutation(source, mutation)).not.toBe(source)` (`:24`) and
  `expect(mutation.mustFail.length).toBeGreaterThan(0)` (`:25`) carry no `mutation.id` message.
  - On T4, the failure prints only the first bytes of `canonical-json.ts`: `expected 'import { types } from …' not to be
    …`.
  - On T5, it prints only `expected 0 to be greater than 0`.
  - Test-rigor :82-84: "A maintainer should localize the bug from failure output alone."
- **Failure scenario.** A PR that drifts two fragments goes red on one. The author re-points it, pushes, and goes red again
  on the next: one CI round per drift.
- **Fix.** Use `it.each(GENERATION_LITERAL_MUTATIONS.map(m => [m.id, m]))('%s: fragment occurs once …', …)` or
  `expect.soft`, so every drift is reported in one run, and pass `mutation.id` as the message to the `:24` and `:25`
  expectations. The length and distinct-id checks stay in their own `it`.

### N3 — The fragment test is textual: four plan or source mutants survive it (note; for syzygy-bpyt.4.6)

- **Evidence** [Observed], from `own-test-mutants.json` (§7):
  - **R1:** a fragment that occurs once, in a comment only, after the guard's code is rewritten;
  - **R2:** a wrong `file` that contains the fragment. The plan file itself contains 11 of the 12 fragments exactly once:
    every one except the cap fragment, whose `\n` is an escape in the plan;
  - **R4:** a `mustFail` name that matches no test;
  - **R5:** a `to` that differs from `from` only by whitespace.

  Each survives. Each would surface in the scheduled gate as `SURVIVED` (`mustFailMissing`, or `failed === 0`), not as
  a crash, so the gate still goes red, but only on schedule and not on the PR [Inferred, from
  `generation-mutation-run-main.ts:137-139`].
- **Fix.**
  - R2 is a one-line assertion that the plan header already states: `generation-mutation.ts:13-14` says "Every mutation
    targets `packages/polaris-generation-core/src/**`". Assert `mutation.file.startsWith('packages/polaris-generation-core/src/')`
    and that it is not a `.test.ts`.
  - R4 is already routed: the coordinator's comment on `syzygy-kpbq` reads "pin each mustFail name to an existing test
    title", and `syzygy-bpyt.4.6` carries it.
  - R1 and R5 need a parser, or the gate's own kill. Leave them to `syzygy-bpyt.4.6`, and say so in the test header so the
    test is not read as a semantic check.

### N4 — The plan comment "three per subject file" is false at head (note; reviewed bytes)

- **Evidence** [Observed]. `generation-mutation.ts:41` reads "Hand-listed semantic mutations, three per subject file". At
  `e40af0ea`, the plan's `file` counts are canonical-json 3, parse-json 3, pipeline 3, provider-draft 2 and draft-model 1.
  This PR made the comment false by moving one mutant's `file`.
- **Fix.** Reword it, for example: "three per original subject file; provider-draft.ts's first now targets draft-model.ts,
  where its guard moved".

### N5 — The PR body's line anchor `generation-mutation-run-main.ts:121-124` is base-relative (note; PR body and bead comment)

- **Evidence** [Observed]. At `973965a8`, lines 121-124 run from the `for` loop to the `applyLiteralMutation` call. The
  PR's one-line header growth shifts them by one, so at `e40af0ea` line 121 is blank and the call is at `:125`. The throw
  statement itself is at `generation-mutation.ts:36`. The same anchor was copied into the `syzygy-bpyt.4.6` comment.
- **Fix.** Cite `generation-mutation-run-main.ts:125` and `generation-mutation.ts:36` at `e40af0ea`, or name the commit
  beside the anchor.

### N6 — Restoration after a throw is unverified, and CI skips its restore check on failure (note; pre-existing; for syzygy-bpyt.4.6)

- **Evidence** [Observed]. See F1, second clause:
  - the outer `finally` (`generation-mutation-run-main.ts:188-191`) has no digest check;
  - `generation-mutation-gate.yml:52-55` has no `if: always()`;
  - step 6 was `skipped` on run 37196853549.

  The PR did not change this. The bytes written back are the in-memory originals, so restoration is correct in practice
  [Inferred]. It is not verified.
- **Fix.** Add `if: always()` to "confirm sources restored", and re-hash every source in the outer `finally`, writing
  stderr and exiting non-zero on a mismatch.

### N7 — The predicate 5955f8c0 added has no plan mutant, although tests pin it (note; for syzygy-bpyt.4.6)

- **Evidence** [Observed, run 11]. Inside the cap block, `if (verdict.reviewerBlocking) stop('repair-exhausted');`
  (`pipeline.ts:460`) decides between stopping and returning `awaiting-rendered-review` with quote findings.
  - `→ if (true)` is killed by the test at `pipeline.test.ts:335-340`.
  - `→ if (false)` is killed by the tests at `:249` and `:349-353`.

  The `if (false)` arm is the more dangerous of the two: a reviewer-blocking draft comes back as a successful run.
- **Fix.** Add both as literal mutants when the plan is next opened. Optionally, add `still stops as repair-exhausted when
  the reviewer's own verdict blocks after the last repair` to the cap mutant's `mustFail`. Out of this bead's scope.

### N8 — The count in the test header was already stale when committed (note; reviewed bytes)

- **Evidence** [Observed].
  - `generation-mutation.test.ts:5` says "syzygy-kpbq found the gate red for 23 runs". That matches the bead's text.
  - The PR body and my sweep count 24 failing scheduled runs. The 24th, 40486647289, ran at 2026-10-27T10:12Z, before
    `3669ae24` was committed at 2026-10-27T11:33Z.
- **Fix.** Drop the count, or date it: "red from 2026-10-04 to 2026-10-27".

### N9 — The owner notice should name both CI-gate changes (note; landing)

- **Evidence.** §2: the scheduled gate goes from red to green, and node-ci gains a prospective refusal of fragment drift.
  It also adds one test: 5443 at head, against 5442 [Inferred: base count not run].
- **Fix.** The `syzygy-bpyt.10` notice says both.

## 5. Changed outputs

**Product.** None changed [Observed]:
- The 5 mutated sources are byte-identical between base and head (§2).
- No `packages/**` file changed.
- The plan module (`generation-mutation.ts`) is imported only by the runner and the new test. A `git grep` for
  `generation-mutation` outside `docs/evidence` shows only the workflow, `package.json:33`, the runner, the test, the
  candidate `STATIC-TRACE.json` path rows and the `island-boundary.test.ts` island list.

**CI.** These change:
1. The scheduled generation-mutation gate goes from failure to success, as on 40508139318. The runner's exit code on main
   goes from non-zero to 0.
2. The gate's uploaded evidence JSON now carries 12 mutant records and 5 source digests. Every failing run since
   2026-10-04 wrote none, because the runner threw before writing.
3. The gate's scratch run also mutates and restores `draft-model.ts`.
4. node-ci runs one more test file with 1 test, and it passes.

**Retained evidence.** Four new files under `docs/evidence/`.

## 6. Verdicts on the bead's scope items and the approved re-point

**Scope 1 (re-point the cap mutant): met** [Observed].
- **The source over time.**
  - `pipeline.ts` at `2546a99d`:400 and at `5955f8c0^`:402 carries the one-line `if (repairs >= budget.maxRepairCycles)
    stop('repair-exhausted');`.
  - At `5955f8c0`:424-425 and at base and head :459-461, it carries the two-line block plus `break;`.
- **The new mutant is minimal.** Its `to` is its `from` with exactly one substring replaced,
  `repairs >= budget.maxRepairCycles` by `false`; the script check was True, with 1 occurrence. It starts at line 459 and
  spans 2 lines.
- **The mutated behaviour is the same before and after the split.** The cap never fires, and the loop ends only on a
  non-blocking verdict or another stop, in practice `budget-exhausted` at `maxCalls`.
- **One extra effect.** At head the mutant also disables the quote-only `break`. That is unavoidable, because the same
  predicate guards it. It disables nothing else.
- **The kill is the right one.** Run 3 gives a reason mismatch, `budget-exhausted` received where `repair-exhausted` is
  expected, from the test written for that cap. It is not a timeout.

**Scope 2 (run once with old/new and the commit, then the whole plan): met** [Observed].
- The cap record names `1d37276d` and carries old and new, as guardrail :279 requires.
- I re-ran the cap mutant at `e40af0ea` and it was killed.
- The whole plan, the gate's own command at `e40af0ea`: 12/12 applied and killed, 0 restore failures, record equal to the
  PR's.
- The hosted dispatch: 12/12.

**Scope 3 (the fragment test): met, with notes N2 and N3** [Observed].
- It covers all 12 mutants and asserts exactly one occurrence.
- It reads the same files the runner mutates. Both resolve `REPO_ROOT` as `new URL('../../../../', import.meta.url)`: the
  test from `src/polaris-generation/`, the runner from `dist/polaris-generation/`. Both read `join(REPO_ROOT, file)` and
  take the plan from the same export.
- It fails on zero occurrences (T1, T2, R6), on two occurrences (T3, R8) and on an empty fragment (R7), and it fails on
  the base plan (run 10).
- It reads files inside `it`, not at describe time, so guardrail :277 is respected. R6's ENOENT reports as 1 failed test,
  not 0 tests.

**The approved `draft-model.ts` re-point: met** [Observed].
- **The move was verbatim.** 69995614 moved `unique()` with its body unchanged. By script, `draft-model.ts` at
  `69995614`, minus a leading `export `, equals `provider-draft.ts` at `69995614^`:156-160; the head equals `69995614`.
  The fragment occurs 1 time in `draft-model.ts` (at :73) and 0 times in `provider-draft.ts` at both `69995614` and head.
- **Only `file` changed.** The diff of that entry changes only `file`. Id, description, from, to and mustFail are
  unchanged.
- **The tests reach `unique()` through two files.**
  - From `provider-draft.ts`: it imports `unique`, and 11 of its lines call it.
  - From `draft-model.ts` itself: `validateRequestedAssets` at :80 and `draftHandles` at :93.

  So `provider-draft.ts` is not the only caller the tests reach. Both of the `draft-model.ts` callers were in
  `provider-draft.ts` at `69995614^` (:179 and :255) and moved with `unique()`, so the mutant's reach is the same set of
  call sites as before the move. The 4th failure, the pipeline asset-request test, also failed at `2546a99d` (4 failing
  there too, per the green run log).
- **Restoration.** Restore is digest-verified on the normal path (run 4; the whole-plan record). It is not verified after
  a throw (F1, N6).

## 7. Test quality

**Against the test-rigor bar.**
- :42: a plausible bug makes it fail. The two real drifts each kill it (T1, T2), and so does the base plan.
- :58-59 is met: it fails on the pre-fix plan (run 10).
- :93-95: it extends an existing pattern (`pwb-mutation.test.ts:71-74`, the same predicate and title) rather than
  inventing one. The net test delta is +1 test.
- It has no tautology. The expected values (`12`, `1`) are literals, and it calls the runner's own
  `applyLiteralMutation`, which is the path under test.
- Weaknesses: N2 (first-failure masking, unnamed failures) and N3 (textual predicate).

**The PR's own mutant tool (`plan_test_mutants.py`).** It was re-run with 7/7 killed, with the expected messages. Its
record stores each mutant's old and new and the commit, and the plan sha256 matches. It writes the plan back after every
mutant and checks the digest.

**My mutants** (`tools/own_test_mutants.py` → `own-test-mutants.json`, commit `e40af0ea`; the control passed):

| Id | Mutant | Outcome |
|---|---|---|
| R1 | In `pipeline.ts`, the max-calls guard rewritten as `if (budget.maxCalls <= calls) …`, with the old fragment kept once in a trailing `// was:` comment | **SURVIVED** |
| R2 | Mutant 10's `file` set to the plan's own path, which contains the fragment once | **SURVIVED** |
| R3 | The test's loop cut to `.slice(0, 7)`, plus T1's pre-5955f8c0 cap fragment planted | **SURVIVED.** This is a check-side mutant: the length assertion pins the plan, not the loop. It is not a gap in the test |
| R4 | `mustFail: ['rejects pollution keyz']` | **SURVIVED** |
| R5 | `to` equal to `from` up to one extra space | **SURVIVED** |
| R6 | `file` names a missing path | killed: `Error: ENOENT …` |
| R7 | `from: ''` | killed: `canonical-json-sorted-keys-disabled: expected 4828 to be 1` |
| R8 | `from: "unique("`, which occurs 4 times in `draft-model.ts` | killed: `provider-draft-duplicate-handle-check-disabled: expected 4 to be 1` |

**Is any survivor a real gap against the bead's stated predicate** ("every fragment … occurs exactly once in its
source")? No. R1, R2, R4 and R5 are outside a textual occurrence check, and each would still turn the scheduled gate red
as `SURVIVED`. R2 and R4 have cheap fixes (N3). I rate these as notes, not blocking. All 8 mutants restored their files
(sha256 equal), and the clone was clean after every run.

## 8. Cleanup

- The scratch clone `rev-543/clone` (including its `r543-merge` branch and `node_modules`) is deleted.
- The TMPDIRs `/tmp/r543-1` and `/tmp/r543-2` are deleted. Nothing else in `/tmp` was touched.
- Nothing was pushed, commented, merged or dispatched, and no `bd` mutation was run. `bd show` was used read-only.
- No process was killed.
- Every kept file is under 300 KB; the largest is `governance.txt` at 178,476 bytes.
- `chr(0xa0)` count in the three tools: 0, 0 and 0.

Kept files (paths relative to `rev-543/`):

| Path | sha256 |
|---|---|
| `base-plan-test.txt` | `d8d1cea28178fbf3d4d7d9c82025de3b9362cfae54d0733e925260b306d01788` |
| `cap-mutant-default-reporter.txt` | `b9293af967fdd763badfa659d3f6ce770243af740b1e72bbb39bd2a7fcfeec20` |
| `cap-mutant-read.txt` | `5654f8ee6883440f444d70eab5e01e6c510459c54dd9f90e9121d6eb80b4221a` |
| `dm-mutant-default-reporter.txt` | `b077344280a6a2f9aeba930130d5aa119ab3e957e698bcc7157d8ac35c130206` |
| `dm-mutant-read.txt` | `394e186022f59d69a53e64452de5267b29ee580ea0323fdfd114e19109b4e81c` |
| `extra-mutants-read.txt` | `fe335809e0caaf3badf1e38437ac3b1f46856b0dbe519810a8834f2e6ec8103b` |
| `full-suite-load.txt` | `9700982a723aa6bc70265f3f96f4b89013e12cda0edc366f695e6a420c9cedc5` |
| `full-suite-summary.txt` | `0a76541d71903c53254940c048970901c7ce3ffa4fdc7ddce163dbcf8c283b30` |
| `gate-log-sweep.jsonl` | `2c313aae2191835590eba6709e4affd54450b9a45220026283e79c47874222e3` |
| `gate-runs-26.tsv` | `1bc029c3fe9c7fc486058c20843b3701eb0b5f5e3524ce15398443060bffbc06` |
| `gate-runs.tsv` | `674576cb81dcb7f302bc7f59e9cddaf1f01f1d309006063eb17ec401bc65c6fa` |
| `governance.txt` | `179579db31b4ebd49d099acfad014c5d8fd71e0421cef7359e14a3c1aa05e97e` |
| `merge-fragment-test.txt` | `418db4d135b32932ce921614d58fb8d781539d6d6d9c9a918d860948344e2153` |
| `npm-ci.log` | `8948f6f3246243344b904ec08788e37e94fa7dfc6eb823af96968c041b60ac4b` |
| `own-test-mutants.json` | `a7651074d7498a620c53c93394a03892409174c98dc420e2c6463ca2ce81b909` |
| `plan-e40af0ea.json` | `58625ecf5933bded04644f703b7b7d136733aa51e1f4b93ef3bfde6e4bfdfa76` |
| `plan-test-mutants-r543.json` | `f9676e1d4ba9a834e82eb8ea9cc317a12bccb8b04185fb1c2911f44fde54c0e9` |
| `pr-body.md` | `69f51ea2e2240f0fdfae691dcdd3242c091de0ff1fd6bbdcc8917760532528dd` |
| `quotations.txt` | `9f7b708d1077db48ed8a48eebbae0ba9710c4ecee6050513923f1cd8074999e1` |
| `tools/apply_and_read.py` | `4dbf6e66441de0a1151e8d2fa531e0b7cd3960e385e6913a598b9d4840b9e5e6` |
| `tools/extra-mutants.json` | `2210458c9a20e975d9c4920b9ed37661ec37ddf9dd05cc096654b2b5b40b0ead` |
| `tools/own_test_mutants.py` | `d2424e20e7a7da2c64f4c32060a6b6fbdef8eeb727ef44479c147125175f870f` |
| `tools/sweep_gate_logs.py` | `feb8b4ee7aaa38dadf1048171773c72959150c224a2648b0ca71f583754d719d` |
| `typecheck.txt` | `f21762922bb179fa5dc8c33e881c4f062ef1c33bf48c7d3dad2dd0e5cd30ee98` |
| `whole-plan-load.txt` | `6640fe82c7eecc5b30ba23ccd36d793e77f077301940e9028ba29cab2423d5a3` |
| `whole-plan-r543.json` | `80bf6cdde62ba34fdade20da8cd8d80d4c621f6337fb1b1a52d20af7f2f47e12` |
| `whole-plan-run.txt` | `1cc4edcd438fa9b5aec41bfec1c083bbef2728f0ca40461d464fcbe157081cf5` |
