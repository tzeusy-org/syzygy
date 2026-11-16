# R-GP-IMPL-OBJECT-ISO-HELPERS-3 — CC-REV-1 implementation review of syzygy-bpyt.6.3 stack 4, round 3
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 2df14d7d
Subject: r3-review.diff sha256 95c8d585dbc82061e4e35cb101d7a730446d273245ba92feb9386ee4d6c4e676

Reviewer: rev-548-r3, a fresh-context agent. I did not write the change, its repairs or the earlier review rounds. Brief:
`scratchpad/lead/b63iso/brief-r3.md`. Reviewed 2026-10-28. PR #548, branch `agent/syzygy-bpyt.6.3-iso`, head
`2df14d7d2580f453da5b61b5681097d1bfc902c3`. The review is narrow, as the brief directs: Fix A of round 2's F1, its N2,
production bytes, figures, and the sentences the repair added or changed.

Verdict in one paragraph. [Observed] No production byte changed: of the 7 paths in `4d92ac95..2df14d7d`, one is a test
file, five are under `docs/evidence/syzygy-bpyt-6-3-iso/` and one is `AGENTS.md`. Fix A is met. The three test lines, the
PR body's N8 bullet and the record's `reading` tail equal round 2's text, compared by script; that script fails under a
mutation of each of its four predicates. Round 2's mutant F, re-run at the head, is killed at :102, :121 and :132. At
each the one failing test is that site's `true` row (1/32), and against the 4d92ac95 test file it survives (0/27). N2 is
met: the AGENTS.md text equals round 2's, and the hunk changes nothing else. The figures re-derive: 551 tests over the 8
files, all pass, 137 added; the digest sweep is clean by two methods over 7,338 files; the record rebuilds byte for byte.
Hosted `checks` and `node` pass. I found no false sentence among those the repair added or changed. One note is about a
sentence the repair kept: restoring the `true` row makes it stale (N1). The other is a count word (N2). Neither blocks.

## 1. Subject identity checks

All re-derived by script in my own clone (`git clone /home/tze/GitHub/syzygy`, then `agent/syzygy-bpyt.6.3-iso` and
`main` fetched from GitHub).

| Check | Result |
|---|---|
| `git diff 4d92ac95 2df14d7d` written to a file, `sha256sum` | `95c8d585dbc82061e4e35cb101d7a730446d273245ba92feb9386ee4d6c4e676`; `cmp` against `lead/b63iso/r3-review.diff` prints nothing: **matches** (7 files, 173 insertions, 38 deletions) [Observed] |
| `sha256sum` of `lead/b63iso/r3-review.diff` | `95c8d585…e4e676`, as the brief states [Observed] |
| PR body, `gh pr view 548 -R Tzeusy/syzygy --json body --jq .body > f; sha256sum f` | `05bcb73b90f27fafc06632a2b36460cf602d7e482aab48cca541d3ef1b1c3c03`, **matches** the brief [Observed] |
| Branch tip on GitHub and `headRefOid` | `2df14d7d2580f453da5b61b5681097d1bfc902c3` both; `state` OPEN, `mergeable` MERGEABLE [Observed] |
| Commit shape | `2df14d7d` parent `094a3b34`; `094a3b34` parent `4d92ac95`; both single-parent, so main was not merged again [Observed] |
| Round-2 raw | `sha256sum`: `2693097ed4d5929d979d03944c39b45bba471e815dac034430727b505554590c`, as the brief and the PR body state [Observed] |
| Main | `gh/main` = `e4a3a607333614575d0f3c40bcb063dea8fa0177` at my fetch; 4d92ac95's main parent is `a1b9bde2` (`merge-base --is-ancestor` true; `merge-base 2df14d7d gh/main` = `a1b9bde2…`) [Observed] |

## 2. Clauses relied on, and the class ruling

CC-REV-1, `.syzygy/governance/policies/craft-and-care/review-and-documentation.md` at `2df14d7d`:
- "Changes touching any of seven classes require review by an independent, fresh-context reviewer, and the agent
  performing the change never finally decides which classes it touches."
- "1. **authority boundaries** — write-universe, typed-authority table, adapter authorization (VIS-5, VIS-6);"
- "**Class membership is contested by default and is never finally determined by the agent performing the change**"
- "**A reviewer or the owner** may reclassify at any time."
- "Per the canonical bar, if the reviewer authors semantic fixes, the exact resulting head gets fresh independent review."

Test rigor, `git show 2df14d7d:.claude/skills/th-engineering/subskills/test-rigor/SKILL.md`, :42:
"**A test is worth keeping only if some plausible bug makes it fail.**"

AGENTS.md at `2df14d7d`: rule 6, "Mutate the input and confirm the check fails, per predicate, before trusting it"; rule
9, "A claim of absence needs a sweep with a denominator."; rule 10, "Freeze the bytes a review is bound to; any later edit
retires the review."

**Class ruling** (mine). The repair restores one test-table row and changes a note in AGENTS.md. It changes no production
byte (section 5). The three calls the row pins (`authority-artifact-fields.ts:102`, `:121`, `:132`) still decide whether
a policy or registry artifact is type- or shape-invalid. That is class 1, as rounds 1 and 2 ruled. The repair does not
change that class or any other ruling of rounds 1 and 2.

## 3. What I ran, and the results

Clone: `rev-548-r3/clone` at `2df14d7d`, `npm ci` exit 0 ("added 117 packages in 3s"). TMPDIR `/tmp/r548c-1`. One vitest
process at a time.

| # | Run | Result |
|---|---|---|
| 1 | `git diff 4d92ac95 2df14d7d`, `sha256sum`, `cmp` | Matches (section 1) [Observed] |
| 2 | `npx vitest run packages/three-surface-poc-core/src/authority-artifact-fields.test.ts` at head (load `22.14 23.69 25.54 13/9711 969884`) | "Tests  32 passed (32)" [Observed] |
| 3 | `git diff --quiet 28024ade 2df14d7d -- packages/three-surface-poc-core/src/authority-artifact-fields.ts` | exit 0: the production file is unchanged from the commit the recorded mutants ran at [Observed] |
| 4 | `tools/aaf-rerun.py` (`aaf-rerun.json`): at the head, every recorded mutant whose test set holds `authority-artifact-fields.test.ts` (C: 15, N: 5; S and I name no such test, 0 of 9 and 0 of 5), round 2's mutant F at :102, :121, :132 against the head test file and against the `4d92ac95` test file, and two controls. Load per row in the file, `22.x`–`26.x` | Controls: unmutated 0/32 fail, a comment 0/32 fail. **20 of 20** recorded mutants give their recorded outcome (killed/survived) at the head. F: "F-L102-tests-at-2df14d7d KILLED 1/32", "F-L102-tests-at-4d92ac95 SURVIVED 0/27", "F-L121-tests-at-2df14d7d KILLED 1/32", "F-L121-tests-at-4d92ac95 SURVIVED 0/27", "F-L132-tests-at-2df14d7d KILLED 1/32", "F-L132-tests-at-4d92ac95 SURVIVED 0/27". The one failing test each time: "refuse a policy document that is true", "refuse a registry document that is true", "surface a first registry entry that is true as the malformed entries list" [Observed] |
| 5 | Same run, the lane's mutant E (`typeof x !== 'string'` form) at the head | Killed at :102, :121, :132 by **two** tests each, the `a number` row and the `true` row, e.g. "refuse a policy document that is a number", "refuse a policy document that is true" (2/32). Recorded at `28024ade`: one test, the `a number` row (1/27) (N1) [Observed] |
| 6 | `tools/compare-texts.py` (`compare-texts.json`) against the round-2 raw and the PR body | `testLines.equal` true (found at line 68, replacing old 68–70); `n8Bullet.equal` true; `reading.prefixKept` true, `tailEqual` true, `literalEvaluatesToRecord` true (2 `\'` escapes); `n2.present` true, 1 occurrence, 1 hunk `@@ -185,2 +185,3 @@`, `minusPlusEqualOutsideN2` true [Observed] |
| 7 | Rule 6 on run 6: one mutation each to the raw's three prescribed texts and to the body's N8 bullet | All four predicates false: "False False False False" [Observed] |
| 8 | `npx vitest run --reporter=json` over the eight test files at head (load before `33.97 27.35 26.43 32/9857 1032888`, after `43.72 30.64 27.57 56/9893 1045002`) | exit 0; "total 551 passed 551 failed 0 files 8 distinct 551"; every one of `test-delta.json`'s 137 `added` names is in the head run, and the head minus those is 414 names (`test-runs-r3.json`) [Observed] |
| 9 | `tools/digest-sweep.py` (`digest-sweep.json`): sha256 and blob id, full and 12, of the two edited files at `4d92ac95` and head (16 needles); every tracked file at head outside `docs/evidence/syzygy-bpyt-6-3-iso/` | population 7,338, blobs read 7,338, method 1 hits `{}`, method 2 (`git grep -F -i -l`) hits `{}`, methods agree. The four digest pairs equal `digest-citers-repair2.json`'s. `git ls-tree -r --name-only 094a3b34` outside that directory also gives 7,338 [Observed] |
| 10 | Rule 6 on run 9: exclusion directory replaced by a non-existent one | population 7,374; 16 of 16 needles hit by both methods, in `digest-citers-repair.json` and `digest-citers-repair2.json` only [Observed] |
| 11 | `build-record.py . 81862261 22142d9f <copy of the evidence dir> 28024ade 2e7ab2ec d6242fb0 2f33f137 2d9039bb 094a3b34 4d92ac95` | exit 0; "wrote … sha256 56d1b3471b8879dabc9ed5d441fc0bea2ad404cb5bb041a783cb3facca0fbb93"; `cmp` with the tracked record: identical [Observed] |
| 12 | Rule 6 on run 11's three new refusals: reviewed head `2d9039bb`; repair and reviewed head both `4d92ac95`; one `added` row removed | Each refuses: "the round-2 digest sweep is of another range, its methods disagree, or a digest is cited"; that plus "the test runs are not the 551 tests (+137) of the round-2 repair commit" and "the round-2 repair touches []"; "the test runs are not the 551 tests (+137) of the round-2 repair commit" [Observed] |
| 13 | Main moved: `git diff --name-only a1b9bde2 gh/main` (40 paths, `main-moved-paths.txt`) against `git diff --name-only a1b9bde2 2df14d7d` (68 PR paths) | One common path, `AGENTS.md` (main edits the fence-rules note, line 212: "G2 and G3 were ruled by the owner on 2026-10-28"). The changed test reads `authority-artifact-fields.ts` and `@syzygy/support`; main changed no path under `packages/support/`, no `authority-artifact-fields*` file, and not `package.json` or `package-lock.json`. 0 of 40 are read by the test [Observed] |
| 14 | Local merge of `gh/main` `e4a3a607` into `2df14d7d` (`d87d129a`), then the changed test (load `39.78 31.00 27.79 22/9856 1052634`) | "Auto-merging AGENTS.md", no conflict; the merged AGENTS.md holds both the N2 text and main's line; 0 `packages/` paths differ from the head; "Tests  32 passed (32)" [Observed] |
| 15 | `gh pr checks 548 -R Tzeusy/syzygy` | "checks	pass	25m7s" (run 40634720247), "node	pass	3m36s" (run 40634720275); `gh run list --commit 2df14d7d…`: both `headSha` 2df14d7d, `conclusion` success [Observed] |
| 16 | `gh run view 40634720275 --log`, test lines | Checkout "HEAD is now at 8eb085b7 Merge 2df14d7d2580f453da5b61b5681097d1bfc902c3 into 1a8864d94f825fb7abff04f61a4588f325e2b098"; "Test Files  253 passed | 3 skipped (256)"; "Tests  5679 passed | 5 skipped (5684)" [Observed] |
| 17 | `bd show syzygy-bpyt.64` (read-only, main checkout) | "PR #548 round-2 N1: site-equivalence selftest misses an isoOf import from another module or after another import [P4 · OPEN]" [Observed] |

I did not run the full local suite. The hosted `node` count (run 16) covers it, and no finding depends on it. I did not
re-run the base-side runs (`base` 414 and `headTestsOnBase` 491/490 at `81862261`), the canonical battery,
`check_governance.py`, `check_quotations.py` or the typecheck; those figures are the lane's (section 4, figures).

## 4. Findings

No blocking finding.

**Figures, each checked.**
- Tests line, "+137 ~1 -0 … 414 → 551 passing": 551 and +137 re-derived (run 8) [Observed]. 414 is the lane's base run;
  head minus added gives 414 names, which agrees [Inferred]. `~1` versus the tool's `~51`: unchanged from earlier
  rounds; the body explains it.
- Full suite, "253 files passed, 3 skipped; 5,679 tests passed, 5 skipped, 0 failed": this is the lane's local run at
  `2df14d7d`. Hosted `node` on the merge `8eb085b7` gives the same numbers (run 16) [Observed]. "5,674 at `4d92ac95` plus
  the five generated tests of the restored `true` row" is consistent: round 2 observed 5,674, and the row adds five
  `it.each` tests (32 − 27, run 4) [Observed].
- Record counts: `test-delta.json` (`headTests` 551, `added` 137, `removed` 0) agrees with run 8 [Observed].
  `test-runs-summary.json` `head` (`094a3b34`, 551/551) agrees with run 8 at `2df14d7d`; the eight test files are equal
  between the two commits [Observed]. `headTestsOnBase` 491/490 is the lane's; it is 486 + 5 [Inferred].
  `previousMeasurement` (546, 132, 486) equals the `4d92ac95` files [Observed].
- Digest sweep: re-derived, clean by two methods over 7,338 (runs 9, 10) [Observed].
- Battery line at the round-2 head (`commands=114 nonzero=0`, 32 OK / 21 WARN / 0 FAIL, quotations 0, typecheck exit 0):
  the lane's, not re-run [Unknown to me]. Hosted `checks` pass at that head (run 15).

**The lane's inference, checked.** The body says "the restored row adds tests and removes none [Inferred]". The record
says "the restored row adds a test and removes none, so a kill there stays a kill [Inferred]". [Observed] The row adds
five generated tests and removes none (`test-delta.json` `removed: []`, run 8). Every recorded mutant over that file keeps
its recorded outcome at the head, 20 of 20 (run 4), so the conclusion about kills holds. It does not cover the sole-killer
statements the record also makes, because adding a row can add a second killer (N1).

**Sentences the repair added or changed.** I read each against the head:
- The body's "Review round 2 and its repair" section.
- The body's new round-2 Battery block.
- The record's `repair.round2Review`, its changed `N8` item, `tests.measuredAt` and `tests.previousMeasurement`, and the
  `reading` tail.
- `build-record.py`'s new docstring lines and refusals.

None is false at `2df14d7d`. Three sentences I checked closely:
- "the reviewer's mutant F … survives at … 102, 121 and 132 without the row and is killed by it alone". Run 4 confirms it
  at all three.
- "No production byte changes." Section 5 confirms it.
- "It found no decision change and the three post-merge steps met". [Inferred] This is a fair summary of round 2's raw.
  Its §6 table marks the merge, the five names and the SM4 case "**Met**". Its §5 says "Nothing a runtime gate accepts or
  refuses changes". The raw never uses the word "decision" in that sense.

### N1 — low, non-blocking: restoring the `true` row makes the kept "a-number row alone" sentences stale at three sites

- [Observed] The record's `mutants.repairRows.reading` (`dc4-object-and-iso-helpers-2026-10-28.json:812`, generated from
  `build-record.py:407`; the brief's `:393` is the pre-repair line) still opens: "The a-number row is the only test that
  fails a string-naming test at 4 of the 12 call sites it was run at (authority-artifact-fields.ts 102, 121, 132 and
  screen.ts 83)." `killedOnlyByANumberRow` (record :751) lists the same four.
- [Observed] PR body line 38 says that mutant E "is killed by an `a number` row alone at 4 of 12 sites
  (authority-artifact-fields.ts 102, 121, 132 and screen.ts 83)".
- [Observed] At the head, E at :102, :121 and :132 fails the `true` row too (run 5). So the `a number` row is alone only
  at `screen.ts:83`, whose table has no `true` row.
- Why it does not block:
  - Both sentences are scoped to `28024ade`: the record's `repairRows.commit` is `28024ade…`, and line 38 says N "run
    there", the repair commit. Both were true there.
  - Neither is a sentence the repair added or changed. Round 2's Fix A replaced the `reading` only "from 'None of the
    mutants run' to the end".
  - The new tail in the same string says "E admits both", which is correct.
  - The test comment makes no claim about `true` catching E, so it stays true.
- Failure scenario: [Inferred] A reader takes the record's `reading` as describing the head. They conclude that the `a
  number` row of `authority-artifact-fields.test.ts` is the only guard against a string-only deny-list at :102. They then
  drop the `true` row a second time "as redundant with E's killer", or keep `a number` for the wrong reason.
- Fix (follow-up, or with any later regeneration of the record). In `build-record.py:407`, replace "The a-number row is
  the only test that fails a string-naming test at 4 of the 12 call sites it was run at (authority-artifact-fields.ts 102,
  121, 132 and screen.ts 83)." with:

  > At the round-1 repair commit, before the true row was restored, the a-number row was the only test that failed a
  > string-naming test at 4 of the 12 call sites it was run at (authority-artifact-fields.ts 102, 121, 132 and screen.ts
  > 83); at the round-2 head the restored true row fails it too at the three authority-artifact-fields.ts sites, so the
  > a-number row is alone only at screen.ts 83 [Observed by R-GP-IMPL-OBJECT-ISO-HELPERS-3].

  In PR body line 38, after "(authority-artifact-fields.ts 102, 121, 132 and screen.ts 83)", insert:

  > (at that commit; the restored `true` row also kills it at the three `authority-artifact-fields.ts` sites, so the `a
  > number` row is alone only at `screen.ts` 83)

### N2 — info, non-blocking: "adds a test" counts one where the row adds five

- [Observed] The record's `repair.round2Review.F1` (`build-record.py:463`, record :1113) says "the restored row adds a
  test and removes none". The row is one table row and adds five generated tests (run 8; `test-delta.json`, 5 `true`
  names). The body's matching sentence says "adds tests", which is right.
- The load-bearing part, "removes none, so a kill there stays a kill", is true (run 4). Fix with N1, if taken: replace
  "adds a test" with "adds five generated tests".

## 5. Every changed output, or the evidence that there is none

- [Observed] `git diff --name-only 4d92ac95 2df14d7d`: 7 paths.
  - 5 are under `docs/evidence/syzygy-bpyt-6-3-iso/`: `build-record.py`, the record, `digest-citers-repair2.json` (new),
    `test-delta.json` and `test-runs-summary.json`.
  - 1 is a test file, `packages/three-surface-poc-core/src/authority-artifact-fields.test.ts`.
  - 1 is `AGENTS.md`.
  - **Non-test, non-evidence, production: 0 of 7.** `AGENTS.md` is not production code. Some tracked files name it
    (`git grep -l -F 'AGENTS.md'` lists, among others, `scripts/build_directive_register.py` and
    `code-structure.test.ts`), and hosted `checks` and `node` pass at the head (run 15) [Observed].
- [Observed] `094a3b34` touches only the test file and `AGENTS.md`. `2df14d7d` touches only the five evidence paths.
- [Observed] `authority-artifact-fields.ts` is byte-identical between `28024ade` and the head (run 3), so no runtime
  acceptance or refusal changes.
- The one test-side acceptance that changes: five generated tests now refuse `true` at the five `NOT_OBJECTS` uses. The
  production code refuses `true` there: run 2 passes at the head, and round 2 observed the same at `2e7ab2ec`
  [Observed]. Fix A declares the restored row.
- [Observed] Digest-bound artifacts: no tracked file outside the evidence directory cites a digest of either edited file
  (run 9).

## 6. Verdict on Fix A and N2

| Item | Verdict | Evidence |
|---|---|---|
| Fix A, three test lines | **Met** | Run 6: equal to the raw's block, at lines 68–70, replacing the old 68–70; no adaptation |
| Fix A, PR body N8 bullet | **Met** | Run 6: whitespace-normalised equal to the raw's quoted text; one N8 line in the body; no adaptation |
| Fix A, `build-record.py` reading text | **Met** | Run 6: the record's tail equals the raw's text exactly, and the kept prefix equals the `4d92ac95` prefix. The lane's one adaptation: two `\'` escapes in the Python literal (`lane\'s`, `review\'s`). They evaluate to the raw's straight apostrophes (`literalEvaluatesToRecord` true), so the meaning is unchanged. The text now sits at `:407`, not `:393` |
| Fix A, re-measure and rebuild | **Met** | Runs 8, 11: 551/+137, record reproduces byte for byte; refusals pinned (run 12) |
| Fix A, Tests line and full-suite figure | **Met** | "+137 ~1 -0 … 414 → 551 … 136 + 1", the raw's expected form; full suite 5,679, hosted agrees (run 16) |
| Mutant F at :102, :121, :132 | **Killed at all three by the `true` row alone** | Run 4: 1/32 each, the one failure that site's `true` row; survives 0/27 without it |
| N2 | **Met** | Run 6: the raw's text present once in AGENTS.md; the diff is one hunk whose removed and added text differ only by the N2 substitution and a reflow |
| No production byte changed | **Met** | Section 5: 0 of 7 |
| Class | **Unchanged, class 1** | Section 2 |

## 7. Cleanup

Deleted:
- my clone `rev-548-r3/clone/`, with the local merge branch `r3merge` inside it;
- the TMPDIR `/tmp/r548c-1`, which held the vitest reports, the `npm ci` log, the copied evidence directory, the mutated
  raw and body copies and the mutated sweep tool;
- my working copy of the PR body, `/tmp/r548c-body.txt`;
- the re-derived subject `rev-548-r3/r3-rederived.diff`, which equals `r3-review.diff` (run 1).

Nothing was pushed, commented, merged or dispatched. No worktree under `/home/tze/GitHub/syzygy/.worktrees/` was touched.

Kept (paths relative to `rev-548-r3/`):

| File | sha256 |
|---|---|
| `tools/aaf-rerun.py` | `583b8d0ef37996768ea2dee1eaaf656090c526cc5924d47967f33052cb8d8f91` |
| `tools/compare-texts.py` | `cfa98e4990edd21e31fa6a02dc244848127465344a4bed7c0f01875e6f9d24c6` |
| `tools/digest-sweep.py` | `41b0fc44046c84168b0d5b960c564d929eae6fcbd68abb92e4a06a2b4010d813` |
| `aaf-rerun.json` | `fca65c0a771c498ed0b8dcbc0297586d18750e3650e9378f5979c6afa9a49269` |
| `compare-texts.json` | `04e11010024d199d7532638746cf7c031ea352872f98033130dd20c418a2fdfe` |
| `digest-sweep.json` | `2405a247e1c70c11ee7e4c6a895b986a4be6b59254a8c7385527883227b0fe03` |
| `test-runs-r3.json` | `f1f44e84ba578de16eb9d18d80ac5d049af2cb9145e83a5eb61259d9d92b9af9` |
| `main-moved-paths.txt` | `107332c1a8c3fb6e65b10e9bf3e4d7e4f2266c66ee35b6f63c07a2c8ff9815c3` |
