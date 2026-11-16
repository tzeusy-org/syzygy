# R-GP-IMPL-SUPPORT-LEAF-GUARDS-3 — CC-REV-1 implementation review of syzygy-bpyt.6.14, round 3
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 12d70cf0
Subject: r3-review.diff sha256 0650f7548a0bfbe68125ff6f5efc2d6e9ae571f07aef151c6570554ab52efd8a

Reviewer: fresh-context CC-REV-1 reviewer (Claude Opus 5.5), 2026-10-28. I did not write this change or any of its repairs.
I changed no pull request, branch or worktree. I pushed nothing, commented nowhere and dispatched no workflow. I fetched no
target repository content: every run used this repository's sources and the fixtures its tests build. I opened no credential
file and nothing under `~/.claude/` or `~/.config/`. Paths are relative to the repository unless they name `rev-545/`,
`rev-545-r2/` or `rev-545-r3/`, which are directories in
`/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/`.

Verdict in one line: the round-2 repair is exactly what the repair list asked for, and nothing else. Lines 60 and 64 are
round 2's two fix texts byte for byte, and no other line of any test or source changed. W5, W6 and W7 are committed rows,
and each fails the N1 row alone at `191d8277` in both dist states, in the lane's records and in my own runs. Every PR-body
text is present verbatim and true, and every figure the repair changed that a record or a run can reach is right. Nothing
blocks. Two notes:
- **N1:** one changed figure, the load1 range on the "Alone at the code head" line, has no committed record.
- **N2:** the three new rows' fragments are checked against no committed record, unlike every other reviewer row.

## 1. Subject identity checks

Every digest here was computed by script (rule 3) [Observed].

| Check | Result |
|---|---|
| Round-1 raw, `sha256sum rev-545/R-GP-IMPL-SUPPORT-LEAF-GUARDS-1-RAW.md` | `bf317e35fd05a21b6c1b9a22911f22fdcd0545c9a2b61187a31bcfa16b4d98c4`: **matches** the brief |
| Round-2 raw, `sha256sum rev-545-r2/R-GP-IMPL-SUPPORT-LEAF-GUARDS-2-RAW.md` | `43569be3f3e2644bd2333d4883c60464eb9cc7b6606d569db133b1e2c67f9d94`: **matches** |
| `sha256sum lead/b614/r3-review.diff` | `0650f7548a0bfbe68125ff6f5efc2d6e9ae571f07aef151c6570554ab52efd8a`: **matches** |
| `git diff ecea355b 12d70cf0 \| sha256sum` | the same digest. `cmp` against the subject file prints "identical". `--shortstat`: `16 files changed, 1348 insertions(+), 1088 deletions(-)` |
| `git diff ecea355b 12d70cf0 -- packages \| sha256sum` | `d95e031335212eedb74664ee626a2b9662595388bbedae8dd168c8c0ec2d2ec5`: **matches**; `1 file changed, 2 insertions(+), 2 deletions(-)` |
| `git diff --stat 191d8277 12d70cf0 -- packages` | empty: the evidence head changes no package path |
| PR body (`gh pr view 545 -R Tzeusy/syzygy --json body --jq .body > f; sha256sum f`) | `06fcc977e6891d85f5887c161e6ff93fcbb68f0b0abaeed76d9d844d70f93e31`: **matches**, and `cmp` with `lead/b614/body-r3.md` is identical. Re-read by pipe at 06:58 +08:00, just before I wrote this raw: the same digest |
| PR state (`gh pr view 545 --json headRefOid,state,mergeable,comments`) | head `12d70cf09cbb5cf0368f747d9f4245c57d7c6bed`, OPEN, MERGEABLE, 0 comments. The body's last edit is 2026-10-27T21:14:47Z (GraphQL `userContentEdits`) |
| Branch commits `ecea355b..12d70cf0` | `191d8277` ("test: the PR 545 round-2 repair: the scan fixture names the x forms and both exclusions' edges") and `12d70cf0` ("docs: re-run the 6.14 evidence at the round-2 repair head 191d8277") |
| `git diff --stat ecea355b 191d8277` | `docs/evidence/syzygy-bpyt-6-14/tools/mutants.py` (+5) and `packages/support/src/support-purity.test.ts` (+2/−2): the code commit carries the new rows' expectations before the re-run commit |
| GitHub `main` (`git ls-remote`) / merge base with `12d70cf0` | `95c87a52b5a03ef4b1842e82b1c1b961cb51daa3` / `f7ea858480b30ffc4407154a84d1d03f3fe4a549` |

**Main since the merge base.** `git diff --name-only f7ea8584 95c87a52` lists 534 paths (`rev-545-r3/main-changed.txt`)
[Observed]:
- **PR paths:** 0 of the PR's 30 (`comm -12` of the sorted lists). `pr-paths.txt` hashes equal to round 2's file
  (`fd61ac60…`), so the PR touches the same 30 paths as at `ecea355b`.
- **Manifests and config:** 0 `package.json`, `package-lock.json`, `tsconfig*` or `vitest*` paths among the 534.
- **Implementation paths:** 15 under `packages/` or `apps/`. Since round 2's main (`b10e4da9`), 98 paths changed. 3 of
  them are implementation paths: `generation-mutation.ts` and its test, and `workspace-reach.testkit.ts`. The testkit is
  the one the S10 alias derivation reads, and all 16 of its changed lines are doc-comment lines (` *`), 0 code (by script
  over `git diff -U0 b10e4da9 95c87a52`).

## 2. Clauses relied on, and the class

**CC-REV-1** (`.syzygy/governance/policies/craft-and-care/review-and-documentation.md`, at `12d70cf0`):
- `:18-20`: "Changes touching any of seven classes require review by an independent, fresh-context reviewer, and the agent
  performing the change never finally decides which classes it touches."
- `:35-37`: "3. **deterministic observation** — snapshot composition, evaluation identity, the deterministic/inferred seam
  (VIS-7);" and "4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
- `:49-51`: "**The change record states** which classes the change touches, or "none," so a misclassification is a findable
  violation after the fact." and "**A reviewer or the owner** may reclassify at any time."
- `:57-58`: "Per the canonical bar, if the reviewer authors semantic fixes, the exact resulting head gets fresh independent
  review." This round reviews the exact head that results from round 2's fix texts.

**GP-Q0** (`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`, at `12d70cf0`):
- `:52-55`: "'Behavior-preserving' means none of the following changes: a rendered byte, a wire format, a refusal string or an exit
  code; a signed or digest-bound artifact; a consent, security or retention decision."
- `:60`: "Each pull request states which CC-REV-1 classes it touches."
- `:62`: "pull requests touching class 1 (authority boundaries), class 3 (deterministic observation) or class 4 (security)".
- `:64-66`: "an old-versus-new differential over a mutated-record corpus that includes records with altered prose; a rule-6 mutant
  for each predicate; a non-blocking owner notice in the cycle report."
- `:95-96`, the stop clause: "Any change not listed here to what a gate accepts or refuses stops and returns to the owner."

**AGENTS.md at `12d70cf0`:**
- rule 2 (`:120-121`): "No 'zero / all / 100%' claim without running that exact sweep this session, confirmed by a second
  method. Enumerate remainders."
- rule 6 (`:126-127`): "Mutate the input and confirm the check fails, per predicate, before trusting it".
- rule 7 (`:128-129`): "Run the battery in a clone before calling it green; the report is valid only for that commit."
- rule 9 (`:132`): "A claim of absence needs a sweep with a denominator."
- rule 10 (`:133`): "Freeze the bytes a review is bound to; any later edit retires the review."
- rule 11 (`:134-135`): "An evidence record names its subject and the subject's digest; a record that names neither cannot be
  re-checked against the bytes it describes."
- the rule-6 guardrail (`:292-294`): "A rule-6 evidence record must store each mutant's `old`/`new` fragment and the commit it ran
  at; ids and outcomes alone are not re-runnable".

**Test-rigor bar** (`git show 12d70cf0:.claude/skills/th-engineering/subskills/test-rigor/SKILL.md`):
- `:42`: "**A test is worth keeping only if some plausible bug makes it fail.**"
- `:64-67`, bar 4: "Expected values are literals or independently derived."
- `:82-84`, bar 7: "Test names state expected behavior … A maintainer should localize the bug from failure output alone."
- `:93-96`, bar 10: "A test is worth *adding* only if it catches a plausible bug no existing test catches … Reviews state the net test
  delta".
- `:103-104`, workflow step 2: "name a one-line bug in the code under test this test would *not* catch but should."

**Class ruling: the repair changes none of round 2's.**
- **Class 4 stays.** The PR still verifies an egress path (S10), plus the purity guard that egress-relevant code inherits.
- **Class 3 stays.** The guard still keeps `sha256`, `deepFreeze` and `decodeUtf8` deterministic.
- **Not class 1.** The repair's one code file is a test [Observed, the diff's path list].

**What any gate accepts or refuses: unchanged.**
- No product byte changes (§5).
- The repair adds 4 names to a fixture written into a fresh temporary directory, and its expected list. `sourcesUnder` and
  every other line of the test file are unchanged (`fidelity-r3.json`: "linesDifferingFromBase": [60, 64]). So `SOURCES` and
  every other row see the inputs they saw at `ecea355b`.
- The guard refuses nothing new in today's sources. It now also fails three weakenings of its own scan.
- Round 1 and round 2 ruled that a test guard is not a gate. The stop clause is not reached.

**GP-Q0's three further checks, for this round:**
- **The differential:** 1,028 of 1,028 non-test `dist/` files are identical. The S10 bundle reads none of the changed bytes
  (§5).
- **A rule-6 mutant per predicate:** the fixture row pins three new edges, and W5, W6 and W7 each break one. summary.py's
  three new pins were each mutated, and each mutation was caught (§3).
- **The owner notice:** the coordinator's to write.

## 3. What I ran, and the results

Everything ran in one clone, `rev-545-r3/head`, of `/home/tze/GitHub/syzygy`, with `agent/syzygy-bpyt.6.14` and `main` fetched
from GitHub. `npm ci` gave "added 117 packages in 1s". Each run used a private TMPDIR, `/tmp/r545c-1` to `/tmp/r545c-6`, all
since deleted. I ran one vitest process at a time. `load1` is from `/proc/loadavg`, on a 12-core host.

| Run | load1 | Result (verbatim where quoted) |
|---|---|---|
| `tools/fidelity_r3.py`: `support-purity.test.ts` at `191d8277` and at `12d70cf0`, against `ecea355b` with lines 60 and 64 replaced by `rev-545-r2/tools/fix-r2-sources-list.ts.txt` and `fix-r2-sources-expect.ts.txt` (sha256 `8d6917d5…ffb3` and `dcac436a…77b7`, as round 2's table lists) | n/a | `"line60EqualsFix": true`, `"line64EqualsFix": true`, `"fileEqualsBaseWithTwoLinesReplaced": true`, `"linesDifferingFromBase": [60, 64]`, 170 lines on each side, at both commits. 0 U+00A0 in either fix file or the test file. `git diff --name-only ecea355b <head> -- packages apps` lists only `packages/support/src/support-purity.test.ts`, at both heads [Observed] |
| `tools/fragments_r3.py`: W5, W6 and W7's edits, read by AST from `rev-545-r2/tools/r2_mutants.py` (sha256 `3b954d84…5a4f`, the digest the committed comment names) and from `mutants.py` at `191d8277` | n/a | `"editsEqual": true` for all three. Each `old` occurs exactly once in the purity test at `191d8277` (`"oldCountInPurity": [1]`). The lane's rows expect `'killed'` at head and `None` at base [Observed] |
| `tools/records_r3.py`: the lane's head records at `12d70cf0` against the same records at `ecea355b`, by row id | n/a | Both states: `"newCommit": "191d82779ea07f45be612b00ff3cafc9aa7446b8"`, `{'rows': 52, 'asExpected': 52, 'unexpected': []}`, `"added"` exactly W5, W6 and W7, `"removed": []`, `"changedVsOld": []` over the 49 shared rows (observed outcome, failing set and edits), `"timedOutMessages": 0`, `"newStatusAfter": ""`. `"absentVsPresentDiffer": []`. The four base records are byte-unchanged, and each is `{'rows': 35, 'asExpected': 35, 'unexpected': []}` at `f7ea8584` [Observed] |
| The lane's `ROWS`, loaded from `mutants.py` at `12d70cf0` | n/a | 52 rows, 52 with head edits, 35 with base edits. Each record's id sequence equals the tool's, in order, in all four records [Observed] |
| `summary.py . --check` and `--selftest` at `12d70cf0` | n/a | `check: summary.json matches its inputs and no check fails`; `selftest: all 19 mutations caught`. `summary.json` sha256 `2a23954833add12c07b4cd56015b7a3d4bfe1b777ea4f5f43544c47f1a7c4910`, as the body says. Its `subjectSha256` for the purity test is `5a923028…c51a`, the file's hash at `191d8277` [Observed] |
| `tools/summary_pins_r3.py`: rule 6 on summary.py's three new pins, one committed record mutated at a time, restored by `git checkout --` | n/a | P1 (W6 also failing the createHash row), P2 (W7's row dropped) and P3 (W5 surviving as expected) each fail `--check`. P1's message: `head-present W6-test-exclusion-broadened-to-any-test-substring: killed by [… N1 row, … createHash row], not [… N1 row]`. `"survived": []`, `"statusAfter": ""` [Observed] |
| `tools/r3_mutants.py … absent all` at `191d8277`, every `dist/` absent | 23.07–25.65 | `summary {'rows': 17, 'asExpected': 17, 'unexpected': []} status after ''` [Observed] |
| `npm run typecheck` at `191d8277`, from no `dist/` | 28.59 → 26.73 | exit 0; 12 `dist/` [Observed] |
| The same 17 rows, all twelve `dist/` built | 26.21–29.95 | `summary {'rows': 17, 'asExpected': 17, 'unexpected': []} status after ''`. Every observation and failing set equals the dist-absent run's [Observed] |
| Full suite once at `12d70cf0`, all `dist/` built (`npx vitest run`, JSON reporter) | 29.95 at start, 45.42 at end | `total 5528 passed 5523 failed 0 pending 5 todo 0 files 253 failedFiles 0 success True`. Per-file test counts equal `suite-head.json`'s `perFile` for all 253 files (`differ []`). The purity test 33 passed; no-egress 7, with 1 skipped; drafter 3 [Observed] |
| Trial merge: `git merge-tree --write-tree 12d70cf0 95c87a52`, then a local merge | n/a | Clean, tree `92f6f2ef5a2334a52d630e648b1bffb81a05dd48`. The lane's local `95464ce6` (`git cat-file`, read-only, in `/home/tze/GitHub/syzygy`) has parents `12d70cf0` and `95c87a52` and the same tree. GitHub has no such commit (`gh api …/commits/95464ce6…`: `HTTP 422`, "No commit found") [Observed] |
| That merge, every `dist/` absent: `packages/support`, `owner-act-drafter.test.ts`, `no-egress.test.ts`, `workspace-reach.test.ts` | 31.42 → 30.36 | `total 113 passed 112 failed 0 pending 1 files 7 success True`: decode-utf8 6, deep-freeze 6, sha256 4, support-purity 33, workspace-reach 54, no-egress 6 of 7, drafter 3 [Observed] |
| `python3 scripts/check_governance.py` at `12d70cf0` | 25.97 | exit 0; `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted` [Observed] |
| `python3 scripts/check_quotations.py` at `12d70cf0` | — | exit 0; `OK    QC-1  a quotation beside a path:line locator was said by that file — 40 quotations examined in 21 of 979 .md files scanned (loc-paren-quote 3, loc-colon-quote 26, quote-paren-loc 11), 0 findings` [Observed] |
| `tools/battery_r3.py`: `PROJECT-STATUS.md`'s "How to verify this page" block, at `ecea355b`, in the clone, one command per line | 27.11 → 25.68 | `commit=ecea355ba96b0082ad8aad11e9799518f87c2e19 commands=114 nonzero=0 recorded=114 wall=3877.1 status-after=''`. The block has 117 lines: 114 commands and 2 assignments (`CS=`, `DR=`). `PROJECT-STATUS.md` is byte-identical at `ecea355b` and `12d70cf0` [Observed] |
| `tools/dist_compare_r3.py`: every `dist/` built from scratch at `ecea355b`, then at `191d8277` | 24.01 / 25.91 | Both builds exit 0, 12 `dist/` each. Non-test files: 1,028 on each side, 1,028 identical, `"differ": []`, none on only one side. Test outputs: 1,052 on each side. Only `packages/support/dist/support-purity.test.js` and its `.js.map` differ (`.tsbuildinfo` excluded) [Observed] |
| `tools/body_digests_r3.py` and `tools/body_figures_r3.py`: every digest, count and figure in the body's Evidence and Tests sections | n/a | See §5 [Observed] |
| Hosted, `gh pr checks 545 -R Tzeusy/syzygy`, at 2026-10-28T05:33:51+08:00 and again at 06:58:07 | — | `checks	pass	19m56s` and `node	pass	4m45s`. Runs `40584887112` (governance-docs) and `40584887166` (node-ci) both have `"headSha":"12d70cf09cbb5cf0368f747d9f4245c57d7c6bed"`, conclusion success [Observed] |
| Hosted at `ecea355b` (`gh run list --commit ecea355b…`) | — | governance-docs and node-ci: `"conclusion":"success"` [Observed] |

**My mutant rows, every one as expected in both dist states.** "Alone" means that row fails and no other does. Every kill is
an `AssertionError` on the fixture's expected list, and 0 messages say "timed out" [Observed]:

| Id | Mutant | Result |
|---|---|---|
| C0 | unmutated | 33 of 33 pass |
| W5 | the filter narrowed to `/\.[cm]?[jt]s$/u` (the lane's committed edit) | killed by the N1 row alone: `expected [ 'a.ts', 'c.mts', 'd.cjs', …(3) ] to deeply equal [ 'a.ts', 'c.mts', 'd.cjs', …(5) ]` |
| W6 | `!name.endsWith('.test.ts')` → `!name.includes('test')` | killed by the N1 row alone |
| W7 | `name !== 'purity.testkit.ts'` → `!name.endsWith('purity.testkit.ts')` | killed by the N1 row alone |
| W6b | W6, plus `src/latest.ts` holding `export * from 'node:crypto';`, re-exported by `index.ts` (round 2's reach case) | killed by the N1 row alone: the reach round 2 found is closed |
| W8 | `!name.endsWith('.test.ts')` → `!name.endsWith('test.ts')` (the dot dropped) | killed by the N1 row alone (`latest.ts`) |
| W9 | `name !== 'purity.testkit.ts'` → `!name.includes('testkit')` | killed by the N1 row alone (`io/purity.testkit.ts`) |
| V7, V9 | round 2's, read from its tool by AST | each **survives**, 33 of 33, as the body's residual line says |
| V8 | round 2's | **survives**, as the createHash residual line says |
| U4, U5 | round 2's | each **survives**, as the no-write residual line says |
| U6 | `for (Object.freeze of [(value) => value]);` | **survives** |
| U7 | `for (Object.values in Object);` | **survives** |
| U8 | `Object.isFrozen++;` | **survives** |
| U9 | `Object.values--;` | **survives** |
| U10 | `delete Object.freeze;` | **survives**: so the body's "[Inferred]" clause holds at the test level |

## 4. Findings

No blocking finding. Under the verdict rule:
- no product byte changed (§5);
- no guard is weaker than at `ecea355b` for any input: `sourcesUnder` and every other row are byte-unchanged, and the
  fixture row only gained entries (§2);
- the N1 row fails W5, W6 and W7, each alone, in both dist states;
- I found no false sentence in the PR body (§5);
- the full suite and hosted CI pass at the reviewed commit.

### N1 — note. The "Alone at the code head" line's load1 range rests on no committed record

- **Severity:** low (rule 11). No figure is shown false.
- **Evidence:**
  - Body line 89 says "Alone at the code head, with load1 at 27.2–28.8: …". The repair changed the range from "28.6–29.8".
  - I swept the 26 tracked files under `docs/evidence/syzygy-bpyt-6-14/` at `12d70cf0`: 13 JSON and 13 text (`.log`, `.py`).
    That gives 0 load leaves in [27.15, 27.25) and 0 text matches of `27\.2\d?`.
  - The nearest records do not give it either:
    - `bundle-test-durations.json`: load1 min 26.66, max 28.77;
    - `no-egress-hook-durations.json`: min 25.23, max 28.32;
    - the mutant records carry no load at all.
  - The counts on the line are right: 33, 3, and 6 with 1 skipped [Observed, the full suite, the merge run and the C0/D0/N0
    rows]. Its load range is [Unknown] to me. Round 2 left the earlier range [Unknown] the same way.
- **Failure scenario:** a later reader cannot re-check the one load figure the line gives, so it is a claim and not a record.
- **Proposed fix (optional; the stopping rule clears it):** either drop "with load1 at 27.2–28.8", or name the record it comes
  from.

### N2 — note. W5, W6 and W7's fragments are checked against no committed record

- **Severity:** low. The copy is verified today; what is weaker is how a later reader could re-check it.
- **Evidence:**
  - The three rows carry their edits as literals in `mutants.py`. Its comment says "Fragments copied by script from the
    round-2 review's tools/r2_mutants.py (sha256 3b954d84e97771016b6dcccf2d3e826a9225e46d02330d9c94b23831fb0a5a4f)".
  - The digest matches the file in `rev-545-r2/tools/`, and my AST compare finds the edits equal [Observed].
  - `summary.py` checks the edits of two other sets of reviewer rows against committed bytes:
    - PR 530 round 2's, against `ROUND2`'s four records, by digest;
    - PR 545 round 1's, against `reviewer-r1-fragments.json`.
  - It checks W5–W7 only for their failing set (P1–P3 above). An edit to a W row's fragment, re-run, would still pass
    `--check`, provided that row still failed the N1 row.
  - Body line 67 says "The reviewer's fragments are read by id from the committed round-2 records, never retyped, and each
    record's sha256 is stored". Line 79 states the different provenance for W5–W7, so the body is not false. Read alone, line
    67 suggests more than holds for these three rows.
- **Failure scenario:** after landing, `rev-545-r2/tools/` is gone. A reader can then confirm that the records match the
  tool, but not that the tool matches the review.
- **Proposed fix (optional):** retain `rev-545-r2/tools/r2_mutants.py` beside round 2's raw when the reviews land. Or, under
  `syzygy-bpyt.46`, copy the three rows into a committed fragments record, as `reviewer_r1_fragments.py` did for round 1.

### Information, no action

- **The battery line names an untracked tool.** `battery_clone.py` is in no tracked path. My own runner, written from
  `PROJECT-STATUS.md`'s block, reproduces the line's figures exactly at `ecea355b` (§3).
  - Rule 7 makes that report valid for `ecea355b` only.
  - Whether any battery has run at `12d70cf0` is [Unknown] to me. I ran none there, the body claims none, and between the
    two commits only the 16 subject files changed.
  - Hosted governance-docs, `check_governance` and `check_quotations` are clean at `12d70cf0`.
- **"Each fix text is the review's own `fix-*.ts.txt`, inserted byte for byte" (line 31) describes round 1's insertion.** At
  `191d8277`, 6 of round 1's 7 blocks still occur verbatim. The seventh, `fix-n-sources-row.ts.txt`, now differs in exactly
  the two lines round 2 replaced, which line 7 states. Read in order, the body is accurate.
- **The N3 disclosure's "[Inferred]" clause is now observed.** U6–U10 each pass 33 of 33 in both dist states. Changing the
  label is optional.

## 5. Every changed output, or the evidence that there is none

- **Product code:** none changed. The code diff is `support-purity.test.ts` (+2/−2) [Observed].
- **Built output:** 1,028 of 1,028 non-test `dist/` files are identical between from-scratch builds of `ecea355b` and
  `191d8277`. Only the test's own `support-purity.test.js` and its map differ (`dist-compare-r3.json`) [Observed].
- **The S10 bundle:**
  - The lane's record at `191d8277` gives 935,757 bytes and sha256 `18172eb2…3340` on both sides, `"identical": true`.
  - Round 2's input list (`rev-545-r2/bundle-inputs-merge.json`) holds 126 workspace inputs. Of `packages/support`'s files it
    holds only `decode-utf8.ts`, `deep-freeze.ts`, `index.ts` and `sha256.ts`, and it does not hold the test.
  - So the one changed byte range is not a bundle input [Observed in the record; Inferred for `191d8277`, whose sources
    differ from `ecea355b` in that test file alone].
- **Test results:** the purity test has 33 tests at `ecea355b` and at `191d8277`, so the repair's net delta is 0. The full
  suite has 5,528 tests, as at round 2 [Observed].
- **Governance:** `32 OK, 21 WARN, 0 FAIL` and 0 quotation findings, the figures the body gives [Observed].
- **No refusal string, exit code, wire format or rendered byte changes** [Observed, by the comparisons above].

**The evidence diff, by script** (`tools/evidence_diff_r3.py` and `records_r3.py`, 14 changed files under
`docs/evidence/syzygy-bpyt-6-14/`) [Observed]:

| File | What changed, and why |
|---|---|
| `tools/mutants.py` | +5: a two-line comment and the three W rows (head `killed`, base `None`) |
| `tools/summary.py` | +6/−4: the docstring names round 2's F2 and the old head, `HEAD` is `191d8277`, and `KILLED_BY` gains W5, W6 and W7 → `N1_ROW` |
| `mutants-head-{absent,present}.json` | `commit` is `191d8277`. W5–W7 are added, and 0 of the 49 shared rows changed outcome, failing set or edits. The only other changes are clone-path text inside messages (`/tmp/la-545r/` → `/tmp/la-545s/`). The summary goes from 49 to 52 |
| `mutants-head-{absent,present}.log` | +3 lines (W5–W7 `expected killed observed killed 32 1 [N1 row]`), and the summary line goes from 49 to 52 |
| `residuals-head.json`, `shared-reader-identity.json`, `titles.json` | the head commit only |
| `suite-head.json` | the commit, `load1` 33.7 → 29.0, `wallSeconds` 238.3 → 243.4 |
| `suite-head.log` | the re-run's vitest output: +793/−744 lines of order and timing |
| `bundle-differential.json` | the head run's commit, and the clone and copy paths |
| `bundle-test-durations.json`, `no-egress-hook-durations.json` | the subject commit, the start times, load1 and per-test or per-hook durations of the re-runs |
| `summary.json` | derived from the above: the head, the counts (killed 44 → 47, rows 49 → 52), the timing ranges, the three new `mutants` and `round1KilledBy` entries, and the purity test's subject digest `5a923028…` |

**The body, against `12d70cf0`.** `diff lead/b614/body-r2.md` against the live body: every change is one the repair list
names. Each text was checked by `tools/body_texts_r3.py`, as a whole line at the place named [Observed]:
- **F1:**
  - The R2 replacement is at line 103. The old R2 text is absent.
  - The insertion is at line 106, directly after "R2's class includes a newline …" (105).
  - "All five" occurs 0 times, and "All seven" once (107). Line 107 ends "(`residuals-head.json`). V7 and V9 are observed
    surviving at `ecea355b` in that review's records."
- **N1:** the createHash residual is at line 110.
- **N3:** the coordinator's disclosure is at line 111.
- **N5:** the battery line is at line 93.
- 0 U+00A0 in the body.

**The body's sentences, checked:**
- **True** [Observed]:
  - line 7, the round-2 repair statement;
  - lines 57–58, the heads;
  - lines 61–64, all six subject diffs: each digest, file count and +/− equal by script, including the
    `f7ea8584..191d8277 -- packages` `+258/−50` and `f7ea8584..12d70cf0` 30 files;
  - line 65, `summary.json`;
  - line 55, `--check` and 19 of 19;
  - line 67, "52 of 52 at head (re-run at `191d8277`) and 35 of 35 at main, in both dist states";
  - line 79, W5–W7, each killed by the N1 row alone and pinned;
  - line 87:
    - 18 titles at main and 42 at head, 27 added and 3 removed;
    - per file: support-purity 13 → 33, no-egress 2 → 6, drafter 3 → 3;
  - line 88, 253 files, 5,528, 5,523, 0, 5, exit 0, load1 29.0, which equals the record and my own run's counts;
  - line 89, 33, 3, 6 with 1 skipped, and `npm run typecheck` exit 0;
  - line 90:
    - five alone runs, load1 max 28.77;
    - bundle test 345–696 ms;
    - guard row 265–499 ms;
    - `beforeAll` 576–992 ms;
  - line 91, the bundle at `191d8277`;
  - line 92, the unmutated rows (C0, D0, N0) in `mutants-head-absent.json`;
  - line 93, the battery figures (reproduced) and hosted success at `ecea355b`;
  - line 94;
  - line 95, the merge with `95c87a52` (after #546 and #547, by `git log`): clean, `95464ce6` local and not on GitHub, and
    112 of 113 with 1 skipped;
  - lines 101–109: R1, R2, Y3, Y5b, Y5c and Z7 `survives` at `191d8277` in `residuals-head.json`, and V7 and V9 at
    `ecea355b` in round 2's records, and at `191d8277` in mine;
  - "All seven": R1, R2, Y3, Y5b, Y5c, V7 and V9 is seven;
  - lines 108–109, "0 of 12": at `191d8277` the root `workspaces` globs `['packages/*', 'apps/*']` give 12 manifests, and
    0 names outside `@syzygy/`;
  - lines 110–111, V8, U4 and U5 survive at `191d8277`, and so do U6–U10;
  - line 117, "+24 ~3 -0": 27 added less 3 retitled, unchanged by this repair.
- **[Unknown]:** line 89's load1 range (N1).
- **False:** none that I found.

## 6. Verdict on each round-2 item taken

| Round-2 item | Verdict | Basis |
|---|---|---|
| F1 (PR body) | **met** | The replacement and the insertion are each a whole line, verbatim, at the places named. "All seven" replaces "All five", and the appended sentence ends that line. The new R2 sentence is true: the reader reads only string literals (`purity.testkit.ts:12`), and V7 and V9 survive at `191d8277` |
| F2 (code) | **met** | Lines 60 and 64 are the two fix files byte for byte, and nothing else in any test or source changed. W5, W6 and W7 are committed with old/new, and the records store the edits and `191d8277`. Each fails the N1 row alone in both dist states, in the lane's records and in my runs. `summary.py` pins each, and each pin is mutation-tested (P1–P3) |
| N1 (residual line) | **met** | Verbatim at line 110. V8 survives at `191d8277` |
| N3 (disclose, not fix) | **met** | The coordinator's line is verbatim at 111. U4 and U5 survive, and U6–U10 confirm its inferred clause. Not fixed, as ruled. The repair does not touch the write visitor, so it makes nothing worse |
| N5 (battery line) | **met** | The line gives a result labelled `ecea355b`. My independent run gives `commands=114 nonzero=0` at that commit |

The repair re-opened nothing that was left out of scope: N2's reader rows, N3's fix and N4's import-call row. The two readers,
the write visitor and the import token are byte-unchanged [Observed, `fidelity-r3.json`].

## 7. Test quality

- **Bar 4** (`SKILL.md:64-67`): met. The fixture's names and its expected list are literals, and none is derived from
  `sourcesUnder`.
- **Bar 7** (`:82-84`): met.
  - The failure names the row and gives both lists, for example `expected [ 'a.ts', 'c.mts', 'd.cjs', …(3) ] to deeply equal
    [ 'a.ts', 'c.mts', 'd.cjs', …(5) ]`. vitest's printed diff names the missing entries [Inferred: my records keep only the
    first line of each message].
  - The title, "lists a module at any depth and with any extension, and skips only the tests and the testkit", now holds
    for the forms the fixture names:
    - `g.tsx` and `h.jsx`, for the `x` forms;
    - `latest.ts`, a module whose name contains `test` and ends `test.ts`;
    - `io/purity.testkit.ts`, the testkit's name at another depth.
- **Bar 10** (`:93-96`): the repair's net test delta is 0. It extends the nearest existing test instead of adding one, and
  that test now kills W5–W9 and W6b, which no row killed at `ecea355b`.
- **Workflow step 2** (`:103-104`): I found no remaining one-line weakening of the scan that a natural refactor would make:
  - the six I ran (W5–W9 and W6b) are all killed;
  - round 2's W1–W4 are pinned by entries the repair kept.

  Two edits survive the fixture by construction, and neither breaks the title:
  - `!/\.test\./u.test(name)` skips `x.test.mts`, which the title counts among "the tests";
  - `!name.startsWith('purity.testkit')` needs a deliberately named module.

  [Inferred; not run.]
- **Determinism:** the row writes into a fresh `mkdtempSync` directory and removes it in `finally`, and its list is sorted.
  The repair adds no sleep, retry or timeout. Unmutated, under load1 23–45 in my runs, the file never failed [Observed].
- **Evidence records:** the new rows meet the rule-6 guardrail: old/new and the commit are stored, and `git status` is empty
  after. `summary.py` pins their failing sets. N2 is the one gap: no record backs their fragments.

## 8. Cleanup, and every file kept

- **Deleted** [Observed]:
  - the clone `rev-545-r3/head`, with its `r3-merge` branch, which was never pushed;
  - every TMPDIR, `/tmp/r545c-1` to `/tmp/r545c-6` (`ls -d /tmp/r545c-*`: "No such file or directory"). That includes the
    2.1 MB full-suite JSON, whose totals are in `suite-head-summary.txt`;
  - the `npm ci` and typecheck logs;
  - my one copy of the PR body (`body.tmp`). The governance and quotations output lived only in a TMPDIR.
- **Not done:** nothing under `rev-545/` or `rev-545-r2/` was modified. No worktree under `.worktrees/` was touched. No process
  outside my own tree was killed.
- **Kept:** 32 files besides this raw. None is over 300 KB (`find -size +300k`: 0).

| File | sha256 |
|---|---|
| `battery-ecea355b.json` | `c005e42d3a7726bc772525c9b164fc490264ed417e7fde21ee80490ff5236c19` |
| `battery-ecea355b.log` | `ba176069f006039ebd6e4f8d882283f0fe02bdd469f8c6cbbc95d48652bf6bdc` |
| `body-digests-r3.json` | `c3cc28c3c74f641390597fe5a1368e1d5deb69dd4a5942ba9839d0e4b4dc7270` |
| `body-figures-r3.json` | `364fa96a1dc4dee66289e9b9101d446a1e83e35411befc2c26dc547f04ad628c` |
| `body-texts-r3.json` | `e50417933371b6d540ba6233e86816ccb02496ec064a9cf24f10945fdaa0637a` |
| `dist-compare-r3.json` | `c5c67218d773eb0a0d07ac0fa91c11563743aa1ed6727cbb8d7518e677f17f29` |
| `evidence-diff-r3.json` | `4313887d08e6de5ccae1b44e86fcbe9a6542c79ee332a9f8f1c8232eacec9418` |
| `fidelity-r3.json` | `c8ce0150bc79d9d4a65e6106346ba16e8c84cbbbabd82d5211b87f126d767506` |
| `fragments-r3.json` | `ed9259bcc9fdb2d0e53f1eb8f9606baf848c78cc96e3864e32508c3d2e3483b8` |
| `main-changed.txt` | `1537efe433fa2f156a6cb2ba3425b3baafbfdef30b98420526694910035a750a` |
| `merge-four-absent.log` | `fd9ffd9deceb5a9a998e79896a41721a568bbfbee87b8001b7e1be2ba4de3d6f` |
| `pr-paths.txt` | `fd61ac608de0ffdd1df819aef7b574b63b7a92b9d244dbeef35da72d177368ca` |
| `r3-mutants-absent.json` | `811e9470e61eda6a85ec44d47440e9443060274bd28c4f8557c18de134c600a0` |
| `r3-mutants-absent.log` | `b102a8ea5e672da53dded711223138b12728064d896298970e4924b5126ad952` |
| `r3-mutants-present.json` | `8f4262f5cf6a53a731fd167f3a1fe92a7f140ca9e4ed226eb2609c1be8f151cf` |
| `r3-mutants-present.log` | `3ada31679ef9d33650aa29ca4d42b19e2f691b25790c2bc0e196120d50d2a24c` |
| `records-r3.json` | `ef9112678c8fc28816ccaf962aad8de17a4f0085a4d873b61a6ce41465f679b7` |
| `suite-head-summary.txt` | `92317e1dd05eca2a1160c527800c8993bfe15bcc7111224b350dc7739cf7c2b2` |
| `suite-head.log` | `43160558648036c54b862c2f27fe578ab26071746c2ba0b9e4e39be947579978` |
| `suite-load-start.txt` | `fedba9361f7e8d07082d0831aa77c048c05e8e9ccea2937f79bf82fee0293d39` |
| `summary-pins-r3.json` | `2db65143c6150f19e5f34a02a6993093d333a583a6ff3f1ba193fd5f97bcd5e4` |
| `tools/battery_r3.py` | `02c770c155bd0a7afb0f54cc5f08a4a66733f37bca4e975cdaa802689980c8a9` |
| `tools/body_digests_r3.py` | `22b49d3f25690c7bd9cfd406191944b8ad963a5e72d72f47401dca587d025348` |
| `tools/body_figures_r3.py` | `3a3772a4858ce884564c81c2f2f414036567af15af2e707f74a4179f76cd81bc` |
| `tools/body_texts_r3.py` | `828e4351fdbd362065e841651f7daec5f99b30b48d2bd61c0b915c0ee31dd41d` |
| `tools/dist_compare_r3.py` | `4c233cdb77e1bb82d34e1f5812dfae308d48ceaf418e525f8e80cd4c345a34f1` |
| `tools/evidence_diff_r3.py` | `ebe09e50964eeae86a28ffe0c2c7314222fc4d4e9445221a4476f2126aaa071f` |
| `tools/fidelity_r3.py` | `ccd17ac54126c2d00e9d682bee170c7bfb5d3314b88a720533d147a30071247c` |
| `tools/fragments_r3.py` | `90ffb214136cd6ed7b94ff7564c640106aba820d534e2ff1e4683f69d1aacc55` |
| `tools/r3_mutants.py` | `0f50935b16841771ef4e6cf0a84e3bc1b3969ed841a67516b7dca4d058d54d7d` |
| `tools/records_r3.py` | `0c214fa50be759a3a1ceaf42eea7c7aca70be277b4259e63cc0cf8c6fbf32b28` |
| `tools/summary_pins_r3.py` | `88dbd821c369b28a902451e3654bd4bd332c1bd0c6945537bd95c1a7f1f47106` |

`pr-paths.txt` shares its digest with round 2's file of the same name: the PR's path list is the same 30 paths.
