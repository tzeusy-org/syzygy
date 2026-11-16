# R-GP-IMPL-CRLF-MASK-2 — CC-REV-1 implementation review of syzygy-bpyt.16, round 2
Verdict: REVISE
Reviewed commit: 561e4f77
Subject: r2-review.diff sha256 0c7cb106c350a2cdc82f3b27221883f5b3cbed0926e409eed6ae29817eb48709

Reviewer: rev-544-r2, an independent fresh-context reviewer. I did not write this change or its round-1 repairs, and I changed
neither. Every run below was made on 2026-10-27 between 21:35Z and 23:00Z, in scratch clones of the Syzygy repository.
I read no body of Butlers or of any other observed repository; every text measured is synthetic. I opened no credential file,
nothing under `~/.claude/`, `~/.config/` or a Chrome configuration directory.

Why the verdict is REVISE: one blocking finding, F1, and it is one parenthetical in the PR body. The repair's tests state
"(332 → 388 at the merge commit, the extra test being main's)". The merge commit, `c399eda9`, holds 386 tests in the seven
files; 388 is the repair commit's count. The brief's verdict rule makes a false sentence in the PR body blocking, and F1 carries
the exact replacement text. Everything else the repair changed holds. The two pins and the three mutant rows are at `224e8faa`
byte for byte, and nothing else in the two test files changed. No production byte changed. Each of MU17 to MU21, and my U+2029
mutant, is killed by its one pin and no other test. The separator slice is the 6,079 texts the record names, and only the slice
sees S5 and S6. C1 is 0 at head. The N2(b) and N4(b) texts are verbatim. The rest are notes (N1–N7). The most material, N1: the
F1 pin enumerates three code units, so a line end widened to VT and FF survives the pin, the suite and the differential, and
admits an LF script element that the head refuses. It is outside what the pin claims to pin, so it is a note under the rule, and
N1 carries a verified general pin.

## 1. Subject identity checks

Every digest here is computed by script (rule 3).

- [Observed] `r2-review.diff`: sha256 `0c7cb106c350a2cdc82f3b27221883f5b3cbed0926e409eed6ae29817eb48709`, as the brief says.
  `git diff c399eda9 561e4f77` is byte-equal to it (`cmp`: equal). `--stat`: "11 files changed, 723 insertions(+), 149
  deletions(-)".
- [Observed] `git diff c399eda9 561e4f77 -- apps packages scripts` hashes to
  `52f8212fd9beb34f09f7bf2ad42170b1620cade466c9f636c603f13325310c8d`, as the brief says. It holds exactly two paths,
  `packages/three-surface-poc-core/src/git-object-reader.test.ts` and
  `packages/three-surface-poc-core/src/markdown-code-context.test.ts`. The other 9 files are under
  `docs/evidence/syzygy-bpyt-16/`.
- [Observed] PR body (`gh pr view 544 -R Tzeusy/syzygy --json body --jq .body`): 14,087 bytes, sha256
  `da05eb9fb147e475a1b19b3c4c297dd5cb8ae5d54166d272b58ff354acfa9028`. **It matches** the frozen body, and is byte-equal to the
  coordinator's `lead/b16/body-r2b.md`.
- [Observed] PR #544 is OPEN, `headRefOid` `561e4f775da54a478567457e34b640d7509d619f`, and the GitHub remote's
  `agent/syzygy-bpyt.16` is the same commit. Origin `main` is `95c87a52b5a03ef4b1842e82b1c1b961cb51daa3`.
- [Observed] The brief's inputs hash as it says:
  - the round-1 raw, `1a2010ae4d7fe2de19aac036545b0ade689d69dcca0ef5c9f15333a161302964`;
  - `f1-pin.ts`, `19e0f958c3f99de58d81b9cd87390fabd3135c1a9febe2d7794bcbbe80e71b92`;
  - `f1-mutant-rows.py`, `39512a7f014255c57448518eb2022b2bfd93dc29c8c8b47080e5e185bb161156`;
  - `n2a-gap.ts`, `bb9d36edc51db21e3a41284fdc3eba8bdc2cd8e63cea0f3d1cc075b8edc2374d`.

  Each of the three blocks holds 0 U+00A0, 0 CR and no non-ASCII character.
- [Observed] Commit graph:
  - `561e4f77` is the child of `224e8faa`, which is the child of `c399eda9`;
  - `c399eda9` is the merge of `f7ea8584` into `cb8c1c72`;
  - `cb8c1c72` is the child of `6928b50a`, which is the child of `d621bfa2`.

  These are the commits the PR body names.
- [Observed] **Fidelity** (`tools/fidelity.py`, output `fidelity.txt`):
  - `f1-pin.ts` occurs once at `224e8faa` and 0 times at `c399eda9`. Removing it and the one blank line after it from the
    `224e8faa` file gives the `c399eda9` file byte for byte ("head minus pin+blank == c399eda9: True"). It sits immediately
    before the comment that begins `// This test compares a rendering with another`, as round 1 proposed.
  - The same holds for `n2a-gap.ts` in `git-object-reader.test.ts`. It sits immediately before `describe('declared resource
    limits are evaluation inputs'`.
  - `f1-mutant-rows.py` occurs once in `crlf-mask-mutants.py` at `224e8faa`.
  - Both test files hold 0 U+00A0 and 0 raw CR at `224e8faa`.
  - So nothing in the two test files changed beyond the two blocks.
- [Observed] `markdown-code-context.ts`:
  - 6,084 bytes, `a02c105a…`, at `d621bfa2` and at `f7ea8584`;
  - 7,465 bytes, `93b95f6d4eabc440344404d01040ba1f10bdceb65e69ab74c4ea59c1fa5831f7`, at `6928b50a`, `c399eda9`, `224e8faa` and
    `561e4f77`.

  It is byte-equal at all four of those commits. `git-object-reader.ts` is unchanged in the range: the code diff names only
  the two test files.
- [Observed] My builds, `tsc -b`, each in its own clone:
  - base `f7ea8584`: `dist/markdown-code-context.js` `27975814…`;
  - head `561e4f77`: `dist/markdown-code-context.js` `6e22d480…`;
  - `dist/git-object-reader.js` is `0aef7466…` in both.

  These equal the record's `subject.builtModule` and round 1's builds.
- [Observed] The record `crlf-mask-2026-10-27.json` at `561e4f77` (`tools/record-verify.py`):
  - all 25 `files` rows verify, bytes and sha256; the one tracked file of the directory not in the table is the record itself;
  - `subject.repair.changedFiles` verifies at both ends, `c399eda9` and `224e8faa`;
  - `rule6.maskMutants.summary` equals the mutant output's summary;
  - `tests.line` is "Tests: +59 ~33 -3", with 332 → 388, `f7ea8584` → `224e8faa`.
- [Observed] **Main moved** (`tools/import-closure.py`, output `main-changed-closure.txt`):
  - Since `f7ea8584`, origin `main` took 57 commits. Its first-parent merges are #541 `a403b902`, #543 `81862261`, #532
    `b10e4da9`, #546 `b7bab8eb` and #547 `95c87a52`. They changed 534 paths.
  - The PR has 35 paths against that base. They share **0** paths with main's 534.
  - The import closure of the mask, `git-object-reader.ts` and the seven round-1 test files is 153 files at `561e4f77`. It
    holds **0** of main's 534 paths. The closure taken at `95c87a52` also holds 0.
  - Main changed 0 of the configuration files every run reads (`vitest.config.ts`, `vitest.setup.ts`, the `package.json`,
    lockfile and `tsconfig` files).
  - Second method: main changed 15 paths under `apps/`, `packages/` and `scripts/`, 12 of them test files. A fixed-string grep
    of the nine roots for six stems of those paths returns 0 files. The stems are `generation-mutation`, `workspace-reach`,
    `test-artifact-verification`, `dossier-profile`, `excerpt` and `dossier-evaluation`, and they cover the three non-test
    modules.
  - So no path main changed is a PR path or is read by the mask, the scan or the seven test files.

## 2. Clauses relied on (quoted), and the class

**CC-REV-1**, `.syzygy/governance/policies/craft-and-care/review-and-documentation.md` at `561e4f77`:
- Lines 13-14: "Independent review is preserved when a reviewer authors semantic changes."
- Lines 18-20: "Changes touching any of seven classes require review by an independent, fresh-context reviewer, and the agent
  performing the change never finally decides which classes it touches."
- Lines 22-27:

  > **The reviewer:**
  >
  > - did not author the change;
  > - does not share the authoring session's context;
  > - receives the artifact, its governing doctrine/RFC references, and
  >   acceptance criteria — not the author's reasoning or a desired verdict.

- Lines 35-37:

  > 3. **deterministic observation** — snapshot composition, evaluation
  >    identity, the deterministic/inferred seam (VIS-7);
  > 4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;

- Line 51: "**A reviewer or the owner** may reclassify at any time."
- Lines 57-58: "Per the canonical bar, if the reviewer authors semantic fixes, the exact resulting head gets fresh independent
  review." This round exists under that clause: round 1's reviewer wrote both pins and the three rows.

**GP-Q0**, `.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`:
- Lines 52-55:

  > - "Behavior-preserving" means none of the following changes:
  >   - a rendered byte, a wire format, a refusal string or an exit code;
  >   - a signed or digest-bound artifact;
  >   - a consent, security or retention decision.

- Lines 62-66:

  >   - **Which ones:** pull requests touching class 1 (authority boundaries), class 3 (deterministic observation) or class 4 (security), and class-6 pull requests that remove an endpoint.
  >   - **The checks:**
  >     - an old-versus-new differential over a mutated-record corpus that includes records with altered prose;
  >     - a rule-6 mutant for each predicate;
  >     - a non-blocking owner notice in the cycle report.

- Lines 95-96, the stop clause: "Any change not listed here to what a gate accepts or refuses stops and returns to the owner."

**The owner's ruling** (`bd comments syzygy-bpyt.1.14`, "[owner ruling, recorded by coord-9297eba3 on 2026-10-27]"), "What this
authorizes": "inside maskMarkdownCodeContexts, a line ends at CRLF, CR or LF, and the split keeps every terminator and offset. …
every LF decision is unchanged. It authorizes nothing beyond that: no spec or policy byte change …, no other reader (G2–G4 of PR
#533 stay open), and no change to LF behaviour."

**The coordinator's routing** (`bd comments syzygy-bpyt.40`, 2026-10-27 16:36): "apply the reviewer's exact pin and MU17-MU19
rows … and an LF slice with U+2028, U+2029 and U+0085 in the differential's C1. Also take N2(a)'s GAP pin …, N2(b)'s residual
sentence, and N4(a)-(c) in the PR body. No production byte changes." The correction at 17:47 orders this round.

**AGENTS.md** at `561e4f77`:
- Rule 6 (line 126): "Mutate the input and confirm the check fails, per predicate, before trusting it".
- Rule 10 (line 133): "Freeze the bytes a review is bound to; any later edit retires the review."
- Rule 11 (line 134): "An evidence record names its subject and the subject's digest".

**The test-rigor bar**, `git show 561e4f77:.claude/skills/th-engineering/subskills/test-rigor/SKILL.md`:
- Lines 42-43: "**A test is worth keeping only if some plausible bug makes it fail.**"
- Lines 58-59 (bar 2): "**Every bugfix ships a regression test** — Written to fail on pre-fix code."
- Lines 66-67 (bar 4): "Expected values are literals or independently derived."
- Lines 82-84 (bar 7): "**A failure names the defect** — … A maintainer should localize the bug from failure output alone."
- Lines 93-94 (bar 10): "A test is worth *adding* only if it catches a plausible bug no existing test catches".
- Lines 103-104 (workflow 2): "name a one-line bug in the code under test this test would *not* catch but should."

**The class: 3 and 4, unchanged.**
- [Observed] The repair changes no production byte. Its code part is two test files, and both built modules hash as at round 1's
  reviewed commit.
- [Inferred] So the gate accepts and refuses exactly what it did at `c399eda9`, which round 1 found inside the owner's ruling on
  every corpus. Nothing a gate accepts or refuses changes beyond the ruling on `syzygy-bpyt.1.14`, and GP-Q0's stop clause is not
  reached.
- [Observed] The merge with current main (section 3, run 16) leaves the mask at `93b95f6d…` and `git-object-reader.ts` at
  `76ac22aa…`, the same as at `561e4f77`.
- Classes 1 and 6 stay unclaimed, for round 1's reasons: no authority table, endpoint or wire format is touched.
- GP-Q0's three checks:
  - the differential: present, and stronger by the slice;
  - "a rule-6 mutant for each predicate": now met for the widening direction of `LINE_END` (section 6), with N1 and N3 as
    residual gaps;
  - the owner notice: still to come, as round 1's N7 says.

## 3. What I ran, and the results

Each vitest run used its own TMPDIR, `/tmp/r544b-<n>`, and one ran at a time. The battery's Python checks ran alongside the
mutant runs; no vitest run timed out (section 4). Every TMPDIR and clone is deleted.

| # | Run | Commit | loadavg (1-min, before → after) | Result (verbatim) |
|---|---|---|---|---|
| 1 | seven test files | `561e4f77` | 27.25 → 29.37 | "tests 388 passed 388 failed 0 files 7" |
| 2 | `npm run build`, then `npm run typecheck` | `561e4f77` | 29.85 → 29.71 | "build exit 0", "typecheck exit 0" |
| 3 | full vitest suite, once | `561e4f77` | 28.62 → 42.98 | "files 253 suites 894 tests 5560 passed 5554 failed 1 pending 5 todo 0 success False" |
| 3a | the one failing file, alone | `561e4f77` | 33.13 → 30.36 | "tests 104 passed 104 failed 0 pending 0 success True" |
| 4 | `crlf-differential.mjs` (base build `f7ea8584`, head build `561e4f77`) | | 24.25 → 24.25 | exit 0; output sha256 `60723b16…`, byte-identical to the committed output |
| 5 | `crlf-differential-selftest.mjs` | | 27.02 → 29.18 | exit 0; output sha256 `4661ec24…`, byte-identical; "killed 6 total 6" |
| 6 | the vet's `run.mjs` over the head build | | | `summary` and `oracleDisagreeLf` equal `vet-run-at-head-summary.json` (True, True) |
| 7 | `crlf-mask-mutants.py`, all 21 mutants and BASE | `224e8faa` | 39.59 → 35.41 | output sha256 `4d7b65dd…`, byte-identical to the output committed at `561e4f77`; see below |
| 8 | my mutants RW1–RW12 (`tools/reviewer-mutants-r2.py`) | `224e8faa` | 36.50 → 39.99 | CONTROL "388 0"; see section 4 |
| 9 | `tools/slice-rebuild.mjs` | | | see below |
| 10 | `tools/diff-mutants.mjs` (10 builds, both differentials) | | 28.63 → 34.75 | see below |
| 11 | `tools/dist-probe.mjs`, `tools/rw9-probe.mjs` | | | see N1 and N3 |
| 12 | candidate general pin (`tools/general-pin.py`), unit file only | `561e4f77` | 27.52 → 29.13 | head "43 0"; RW3 "43 1"; MU17 "43 2" |
| 13 | seven test files | `c399eda9` | 27.50 → 26.51 | "tests 386 passed 386 failed 0 files 7" |
| 14 | seven test files | `f7ea8584` | 26.51 → 30.37 | "tests 332 passed 332 failed 0 files 7" |
| 15 | test delta by (file, full name), `tools/name-delta.py` | | | `f7ea8584` → `561e4f77`: "added 59 removed 3"; `c399eda9` → `561e4f77`: "added 2 removed 0" |
| 16 | seven test files on a local merge `d6500106` = `561e4f77` + origin/main `95c87a52` (no conflict) | | 27.17 → 29.88 | "tests 388 passed 388 failed 0 files 7" |
| 17 | the canonical battery, `PROJECT-STATUS.md` §"How to verify this page", line by line in a fresh clone (`tools/battery-run.py`) | `561e4f77` | 40.73 → 26.24 | "commit=561e4f775da54a478567457e34b640d7509d619f commands=114 nonzero=0"; `check_governance.py`: "32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted"; `check_quotations.py`: "… 40 quotations examined in 21 of 979 .md files scanned …, 0 findings" |
| 18 | hosted checks, `gh pr checks 544 -R Tzeusy/syzygy` | `561e4f77` | | "checks pass 26m0s", "node pass 4m15s"; both runs `headSha` `561e4f77`, event `pull_request`, conclusion `success` |

Detail:
- [Observed] **Run 3.** One failure:
  - test: `packages/polaris-dossier/src/start-gates.test.ts`, "init: the clone holds the consented commit alone (syzygy-qkea.24)
    refuses config naming a remote, a promisor, an include or a command the agent's git would run (R-POLARIS-DOSSIER-CLONE-SHAPE-2
    finding 1)";
  - message: "Error: STACK_TRACE_ERROR", at 5,204 ms. That is vitest's placeholder error, over the 5,000 ms default timeout;
  - load at the end: 42.98.

  Alone (run 3a), the file passes 104 of 104, and that test takes 2,422 ms. The file is not a PR path. So the failure passes
  alone (N6). The totals agree with the PR body's second run: 5,555 passed and 5 skipped make 5,560, and 250 + 3 files make 253.
- [Observed] **Run 7.** Its summary is
  `{"codeCommit": "224e8faaaf60e2809fd167ce934d2dda3d63f131", "baseCommit": "d621bfa2", "mutants": 21, "killed": 20,
  "survivedEquivalent": 1, "survived": [], "killedByExpectedKillerOnly": 5, "expectedKillerNotAlone": []}`.
  Each of MU17 to MU21 has exactly one failing test, and its assertion is a real one (verbatim):
  - MU17: "unit 1", the U+2028/U+2029/U+0085 pin: "AssertionError: "<U+2028>": expected 'a   \u2028   d' to be 'a       d' // Object.is equality"
  - MU18: "unit 1", the same pin: "AssertionError: "<U+0085>": expected 'a   \u0085   d' to be 'a       d' // Object.is equality"
  - MU19: "unit 1", the same pin: "AssertionError: "<U+2028>": expected 'a   \u2028   d' to be 'a       d' // Object.is equality"
  - MU20: "callSites 1", the GAP pin "reported positions in CRLF and bare-CR texts CRLF as LF; a bare CR counted by the malformed
    line only": "AssertionError: expected [ …(2) ] to deeply equal [ …(2) ]"
  - MU21: "callSites 1", the same pin: "AssertionError: expected [ …(2) ] to deeply equal [ …(2) ]"

  (I write a raw separator character in a label as `<U+XXXX>`; a backslash escape is vitest's own text.) Each fragment equals
  round 1's (MU17 = RM7, MU18 = RM11, MU19 = RM12, MU20 = RM8, MU21 = RM10, compared against `rev-544/tools/`). At `c399eda9`
  those five mutants survived, with 386 tests and 0 failed, in round 1's runs. The two test files at head are `c399eda9`'s plus
  the pins, byte for byte. [Inferred] So each pin alone makes its kill.
- [Observed] **Run 9**, my rebuild of the separator slice. The corpora are read as the differential reads them, the six N2
  cases are retyped, and the construction is my own code. Output `slice-rebuild-out.json`:
  - "texts": 6079 and "withCr": 0;
  - sorted-set sha256 `50916c03…`, equal to the set the differential itself builds (dumped by `tools/slice-dump.py`): "equalSets":
    true;
  - "excludedByHead": 4864;
  - each separator is in 2,026 texts;
  - by an instrumented head mask, the texts holding the separator inside a fence / inside a span / outside every context / at
    a text the head calls malformed:
    - U+2028: 370 / 198 / 457 / 1,075;
    - U+2029: 370 / 198 / 457 / 1,075;
    - U+0085: 572 / 123 / 368 / 982.

  So the slice is built as the record says, with each separator at fence and span positions. One of the 6,079 texts holds no
  separator (N5).
- [Observed] **Run 10.** Each build is the head build with one mutation. "Head" is the differential at `561e4f77`; "c399eda9"
  is the differential as it stood at `c399eda9`, which has no slice. Each cell gives the exit code, the failing checks and
  the failure count:

  | build | head | c399eda9 |
  |---|---|---|
  | none | 0, [], 0 | 0, 0 |
  | S5 (JS set) | 1, [C1], 2,918 | 0, 0 |
  | S6 (U+0085) | 1, [C1], 1,394 | 0, 0 |
  | MU17 (U+2028) | 1, [C1], 1,459 | 0, 0 |
  | RW1 (U+2029) | 1, [C1], 1,459 | 0, 0 |
  | RW3 (VT, FF) | **0, [], 0** | 0, 0 |
  | RW5 (closer tolerates a trailing separator) | 1, [C1], 324 | 0, 0 |
  | RW7 (span reset at U+2028) | 1, [C1], 424 | 0, 0 |
  | RW9 (LF CR one line end) | **0, [], 0** | 0, 0 |
  | RW10 (`positionOf` counts U+2028) | 1, [C1], 261 | 0, 0 |

  So S5 and S6 fail exactly C1, and only the slice sees them. Every listed C1 failure is the `lf-separators` corpus (50 of 50
  listed in each). Unmutated, C1 is 0 over 1,825 LF forms and 6,079 slice texts: **0 LF decisions changed at head**.
- [Observed] The committed output at `c399eda9` equals the one at `561e4f77` with `checks.C1_lfUnchanged.separatorSliceTexts` and
  `population.separatorSlice` deleted (True). That output was first committed at `cb8c1c72`, over modules `27975814` and
  `6e22d480`. This is the check the PR body says `build-record.py` makes; I made it independently.

## 4. Findings

### F1 — blocking. A test count in the PR body is attached to a commit that does not hold it

- **Severity:** blocking under this round's verdict rule ("a false sentence in the PR body"). It is the one figure in the body
  that names a commit and is wrong there. The landing owner notice will copy the body's figures (round 1, N7).
- **Evidence:**
  - [Observed] The body's Tests line reads: "Tests: +59 ~33 -3 (by file and name over the seven test files, 331 → 387 (332 →
    388 at the merge commit, the extra test being main's); `test-delta-output.json` measures 332 → 388 from `f7ea8584` to
    `224e8faa`, and 387 is the 385 measured at the code commit plus the two pins [Inferred]; …".
  - [Observed] The branch has one merge commit, `c399eda9`, the merge of main `f7ea8584`. The body names it so itself ("the
    reviewed head `c399eda9` (which merged main `f7ea8584`, PR 534, …)", and "the merge of main `f7ea8584` (with PR 534)"). At
    `c399eda9`, the seven files hold 386 (run 13: "tests 386 passed 386 failed 0 files 7"). Round 1 measured 386 there too, and
    its N4(c) text read "332 → 386 at the merge commit".
  - [Observed] 388 is the count at `224e8faa` and `561e4f77` (runs 1 and 7). It is 386 plus the two pins (run 15: "added 2
    removed 0").
  - [Observed] 387 is held by no commit. The body labels it [Inferred], and it is 385 at `6928b50a` plus 2.
  - [Inferred] One other reading makes the parenthetical true: "the merge commit" as the future landing merge, where the local
    merge `d6500106` holds 388 (run 16). But the body defines "the merge" as `c399eda9` and never mentions a landing merge. The
    repair changed round 1's figure 386 to 388 and kept round 1's commit.
- **Failure scenario:** the owner notice copies "332 → 388 at the merge commit". A reader who checks it at `c399eda9`, the only
  commit that phrase can name, finds 386.
- **Exact fix** (PR body only; no file changes). In the Tests line, replace:

  ```
  331 → 387 (332 → 388 at the merge commit, the extra test being main's); `test-delta-output.json` measures 332 → 388 from `f7ea8584` to `224e8faa`, and 387 is the 385 measured at the code commit plus the two pins [Inferred];
  ```

  with:

  ```
  332 → 388 from main's `f7ea8584` to the repair commit `224e8faa`, as `test-delta-output.json` measures; the merge commit `c399eda9` holds 386, and the repair adds the two pins; before the merge, the code commit `6928b50a` held 385 over 331 at its parent `d621bfa2`, the one test more at `f7ea8584` being main's;
  ```

  Every figure in the replacement is measured here (runs 1, 13, 14, 15) or in the record's `tests.previousMeasurement` (331 and
  385). The rest of the line, from "`~` is the 33 generated rows" on, stays.

### N1 — note. The F1 pin is an enumeration: a line end widened to VT and FF survives it, the suite and the differential

- **Severity:** note. It is the same failure class as round 1's F1: a widened `LINE_END` admits an LF script element the head
  refuses. But it is outside the weakening this pin claims to pin. The pin's title is "U+2028, U+2029 and U+0085 are line
  content, not line ends", and round 1 named those three and the JavaScript set.
- **Evidence:**
  - [Observed] RW3, `LINE_END` = `/\r\n|[\r\n\v\f]/g`, **survives** the seven files: 388 tests, 0 failed, 0 timeouts. It also
    survives the differential with its slice (run 10: exit 0, 0 failures).
  - [Observed] `dist-probe-out.txt`. Take the LF text whose lines `x`, `~~~`, `<script>x</script>` and `~~~` are joined by VT
    (U+000B), with no CR or LF anywhere. The head refuses it with "script-element@1:7,script-element@1:16"; RW3 "admit"s it.
    The same three tilde lines joined by VT or by FF: the head gives "malformed-code-context:unclosed-fence@1:1", and RW3 admits.
  - [Observed] Every complete line-terminator set I tried includes a pinned unit, so the pin kills it:
    - RW2, the Unicode newline-guidelines set `[\n\v\f\r\x85\u2028\u2029]`;
    - RW4, Python's `str.splitlines` set;
    - MU19, the JavaScript set.

    So only a partial widening evades the pin, for example "vertical whitespace" `[\v\f]`, or U+001C to U+001E.
  - [Observed] The pin's comment opens "Only CR and LF end a line", which is broader than the three units it checks.
- **Failure scenario:** a maintainer adds `\v` and `\f` to `LINE_END` as "the other vertical whitespace". An LF Markdown file that
  joins lines by VT then admits a script element that the head refuses, and the seven files, the full suite and
  `crlf-differential.mjs` stay green.
- **Proposed fix** (a follow-up bead, or this PR if the coordinator prefers). Add this test immediately after the F1 pin, inside
  the same describe:

  ```ts
    // Every other UTF-16 code unit is line content too, so a line end widened past the three above (VT, FF, or U+001C to U+001E as
    // Python's str.splitlines reads them) fails here; the failure lists, in hex, each unit the mask kept as a line end.
    it('no code unit but CR and LF ends a line', () => {
      const kept: string[] = [];
      for (let unit = 0; unit <= 0xffff; unit += 1) {
        if (unit === 0x0a || unit === 0x0d || unit === 0x60) continue;
        const mask = maskMarkdownCodeContexts(`a \`b${String.fromCharCode(unit)}c\` d`);
        if (mask.kind !== 'masked' || mask.masked !== 'a       d') kept.push(unit.toString(16));
      }
      expect(kept).toEqual([]);
    });
  ```

  [Observed] I verified it (run 12, `general-pin-out.json`), using the unit file alone:
  - at head: 43 tests, 0 failed, with the candidate taking 128 ms;
  - under RW3: 1 failed, the candidate alone, with "AssertionError: expected [ 'b', 'c' ] to deeply equal []";
  - under MU17: 2 failed, the F1 pin and the candidate ("AssertionError: expected [ '2028' ] to deeply equal []").

  `dist-probe.mjs` runs the same predicate over the dist builds. It misses 0 units at head, and under each widening it misses
  exactly the widened units, for example "U+000B", "U+000C" under RW3. Also add VT and FF to the differential's `SEPARATORS`,
  with a selftest mutant for them.

### N2 — note. A separator read as a line end at fence positions only is seen by the differential, never by a test

- **Severity:** note. Neither mutant changes `LINE_END`. The slice catches both, but the differential is evidence and no CI job
  runs it.
- **Evidence:**
  - [Observed] RW5, a closer that tolerates a trailing U+2028, U+2029 or U+0085 (`/^ {0,3}(`{3,}|~{3,})[ <LS><PS><NEL>]*$/` in
    escape form), **survives** the seven files with 388 tests and 0 failed. The slice fails it in C1, with 324 failures.
  - [Observed] It changes LF decisions (`dist-probe-out.txt`). Take an LF text: a backtick fence around a script whose closer
    ends in U+2028. The head gives "malformed-code-context:unclosed-fence@1:1", and RW5 "admit"s it.
  - [Observed] RW10, `positionOf` counting U+2028, **survives** the seven files. It moves an LF finding's position: for
    "a<U+2028><script>…", the head gives "script-element@1:3", and RW10 gives "script-element@2:1". The slice fails it in C1,
    with 261 failures.
  - [Observed] The F1 pin tests a separator inside a span only. The CR analogue of RW5, MU7 (a closer that tolerates a trailing
    CR), is killed by many tests.
- **Proposed fix (follow-up):** a fence-position row beside the F1 pin. For each of the three separators, the LF text
  `` ['```', 'x', '```' + separator].join('\n') `` gives `malformed()` = `{ reason: 'unclosed-fence', line: 1 }`.

### N3 — note. LF followed by CR read as one line end survives everything, and moves only a malformed line

- **Severity:** note. It is a gap in round 1's subject, not in the repair. No decision changes.
- **Evidence:**
  - [Observed] RW9, `LINE_END` = `/\r\n|\n\r|\r|\n/g`, **survives** the seven files with 388 tests and 0 failed. It also survives
    the differential (run 10: exit 0, 0 failures).
  - [Observed] `rw9-probe.mjs` enumerates every text of up to four lines over an eight-line alphabet, with each line ended by LF,
    CR or CRLF: 461,600 texts, 66,592 of which hold LF CR. The result: "decisionChanged": 0, "formsChanged": 0,
    "onlyLinesChanged": 3432. The probe throws if a line-only change appears in a text without LF CR, and none did.
  - [Inferred] The ruling's "a line ends at CRLF, CR or LF" makes LF then CR two line ends, so RW9 departs from it in the
    reported malformed line only. No production path reads that line (round 1, N2).
- **Proposed fix (to `syzygy-bpyt.41`):** a mixed-terminator row, `malformed('a\n\r`x')` = `{ reason: 'unclosed-inline-span',
  line: 3 }`, which is the LF form's line.

### N4 — note. The record's `subject.note`, and one residual sentence, still say the code commit is every measurement's subject

- **Severity:** note. This is evidence wording. The record names its subject and digests elsewhere (rule 11 is met by
  `subject.repair`).
- **Evidence:**
  - [Observed] The record at `561e4f77`, `subject.note`, written by `build-record.py` line 157, reads: "The record is committed
    after the code commit. The code commit is the subject of every measurement here; the PR head adds only this directory."
  - [Observed] The same record says otherwise:
    - `rule6.maskMutants.ranAt` is `224e8faa…`;
    - `subject.repair.measuredAtRepair` names "the mutant runs …, the test report … and the head build of the differential";
    - `tests.headCommit` is `224e8faa…`.
  - [Observed] Beyond the code commit, the PR head adds the merge of `f7ea8584` and the two repair test files.
  - [Observed] The PR body's last residual still reads "The measured subject is the code commit". [Inferred] This one is true
    only of the mask's bytes, which the Battery section makes explicit.
- **Proposed fix:** in `build-record.py` line 157, write: "The record is committed after the code commit. The code commit is the
  subject of the production-file digests, the built modules and the digest-citer sweep; the repair commit (subject.repair) is
  the subject of the mutant runs, the test report and the differential's head build, whose mask is the code commit's. Beyond the
  code commit, the PR head adds this directory, the merge of main f7ea8584 and the repair's two test files." Regenerate the
  record. If F1's body edit is made, "The measured subject is the code commit" can become "The measured mask is the code
  commit's".

### N5 — note. One text of the separator slice holds no separator

- **Severity:** note.
- **Evidence:**
  - [Observed] Of the 6,079 slice texts, 6,078 hold a separator, 2,026 for each of the three. One holds none: the one-line case
    `a ``b ` c`` d`, which `join(sep)` returns unchanged.
  - [Observed] The body describes the 6,079 as "LF texts whose lines hold U+2028, U+2029 and U+0085 at fence and span positions".
- **Proposed fix (optional, with F1's body edit):** "6,079 texts of the separator slice (6,078 of them hold U+2028, U+2029 or
  U+0085, 2,026 each, at fence and span positions; …)".

### N6 — note. A full-suite failure under load, outside the PR, that passes alone

- **Severity:** note. It is not blocking: run 3a passes the file alone.
- **Evidence:** run 3. `start-gates.test.ts`'s "refuses config naming a remote, …" ran past the 5 s default at load ~43, and it
  takes 2.4 s alone. The PR body reports a different file failing the same way in the lane's first run (`cdp-browser.test.ts`).
- **Proposed fix:** none in this PR. [Inferred] The test is load-sensitive under bar 6. Whether it deserves its own bead is the
  coordinator's call.

### N7 — note. Two small test-quality points in the F1 pin, and the battery tool's name

- **Severity:** note.
- **Evidence:**
  - (a) [Observed] The label `JSON.stringify(separator)` prints the separator raw, because `JSON.stringify` escapes none of
    U+2028, U+2029 or U+0085. So the stored failures carry an invisible label (`"<U+2028>"`, `"<U+0085>"`). vitest's diff does
    escape it (`'a   \u2028   d'`), so the failure is still localizable (bar 7). The loop also stops at the first failing unit,
    so MU19's row names U+2028 only. The general pin in N1 lists every kept unit in hex.
  - (b) [Observed] The Battery section names `battery_clone.py`, a coordinator tool that is not tracked. No tracked file is named
    `battery_clone.py` at `561e4f77`. I re-ran the canonical block with my own copy of its method (run 17).
- **Proposed fix:** (a) is covered by N1. (b): name the block it runs ("`PROJECT-STATUS.md` §How to verify this page, line by line
  in a clean clone"), so a reader can re-run it from the tree.

## 5. Every changed output, or the evidence that there is none

- [Observed] **No gate output changes between `c399eda9` and `561e4f77`.**
  - The code part of the diff is two test files.
  - The mask is byte-equal at `6928b50a`, `c399eda9`, `224e8faa` and `561e4f77`, and `git-object-reader.ts` is unchanged.
  - The built modules hash as at round 1 (`6e22d480…`, `0aef7466…`).
  - The re-run differential equals the round-1 output on every field but the new slice fields (section 3).
  - The vet runner's summary over the head build equals the committed one (run 6).
- [Observed] So the accept/refuse delta against the base is the one round 1 verified:
  - refuses 427, accepts 3,307, other finding 2,046 and unchanged 5,274, over 11,054 texts;
  - the vet's rows: CRLF 32/48, CR 32/44, variants 4/44.
- [Observed] The evidence outputs that change, all re-derived here:
  - `crlf-differential-output.json` gains `population.separatorSlice` (`texts` 6079, `excludedByHead` 4864) and
    `checks.C1_lfUnchanged.separatorSliceTexts` 6079;
  - `crlf-differential-selftest-output.json` gains S5 and S6, each "exact": true, and goes from 4 of 4 to 6 of 6;
  - `crlf-mask-mutants-output.json` now runs at `224e8faa` and adds MU17 to MU21 with their `failingTests`;
  - `test-delta-output.json` goes from 331 → 385 to 332 → 388, "Tests: +59 ~33 -3";
  - the record carries `subject.repair`.
- [Observed] In the mutant output, several of MU1 to MU15 now have one or two more failing tests than at `6928b50a`. For
  example, MU1's callSites go from 12 to 13, and MU12's unit tests from 24 to 25.
  - [Inferred] These are the two new pins failing too: the other five files hold the same test bytes. The stored `firstFailed`
    lists four names per detector, so I did not confirm this name by name.
  - No kill turned into a survival.

## 6. Verdicts on the round-1 items taken

- **F1: met.**
  - [Observed] The pin is present byte for byte. MU17 (U+2028), MU18 (U+0085) and MU19 (the JavaScript set) are each killed by
    it alone.
  - [Observed] My RW1 (U+2029 alone) is killed by it alone: "AssertionError: "<U+2029>": expected 'a   \u2029   d' to be 'a       d' // Object.is equality"
  - [Observed] RW2 and RW4 (the Unicode and Python sets) are killed by it alone. So are RW6 (U+2028 kept in a span:
    "AssertionError: "<U+2028>": expected 'a   \u2028   d' to be 'a       d' // Object.is equality") and RW7 (a span reset at U+2028: "Error: malformed: unclosed-inline-span").
  - [Observed] The narrowing RW8 (a final bare CR read as line content) is killed by 5 other tests. The first: "AssertionError: expected { kind: 'malformed', …(2) } to deeply equal { kind: 'masked', …(3) }"
  - [Observed] All kills had 0 timeouts.
  - The residual gaps, VT and FF (N1) and fence positions (N2), are outside what the pin claims.
- **N2(a): met.**
  - [Observed] The GAP pin is present byte for byte. It holds at head, and MU20 and MU21 are each killed by it alone.
  - [Observed] My RW11 (`positionOf` counts no line end at a CRLF) and RW12 (the column restarts at a bare CR without a line
    count) are also killed by it alone: "AssertionError: expected [ …(2) ] to deeply equal [ …(2) ]" and "AssertionError: expected [ …(2) ] to deeply equal [ …(2) ]"
  - [Observed] RW10 (U+2028 counted) is outside it (N2).
- **N2(b): met.** [Observed] The proposed text is in the body verbatim: 476 characters, once (`tools/body-texts.py`). The
  round-1 wording "in a bare-CR or mixed text" is gone, and the record's first residual says "In a text that holds a bare CR".
- **N4(a): met.** [Observed] `BATTERY_PLACEHOLDER` is gone. The Battery lines are true against my runs, except as N7(b) notes:
  - typecheck: exit 0;
  - hosted `checks` and `node`: pass on `561e4f77`;
  - the commits named: as in section 1;
  - the battery itself: true against my run: "commands=114 nonzero=0", with `check_governance.py` "32 OK, 21 WARN, 0 FAIL (53 checks)" and `check_quotations.py` "0 findings", as the body says.
- **N4(b): met.** [Observed] The proposed text is in the body verbatim: 470 characters, once.
- **N4(c): partly met.** [Observed] The appended parenthetical is there with 386 changed to 388, but it still says "at the merge
  commit", which holds 386 (F1).
- **The C1 slice: met.**
  - [Observed] 6,079 texts, as the record says, rebuilt independently as an equal set, with each separator inside fences and
    spans.
  - [Observed] S5 and S6 fail exactly C1. Only the slice sees them: the `c399eda9` differential passes both.
  - [Observed] C1 is 0 at head.
  - VT and FF are absent from it (N1), and one text holds no separator (N5).

## 7. Test quality

- [Observed] Test delta of the repair: +2, 386 → 388. Against main's base: +59 −3, 332 → 388, by full name (run 15). This
  equals `test-delta-output.json`, and no duplicate full names were found at either end.
- [Observed] Bar 2: each pin fails on the weakening it pins, and failed to exist when that weakening survived. Round 1's
  RM7, RM8 and RM10–RM12 survived at `c399eda9`, and MU17 to MU21 are killed at head by the pin alone.
- [Observed] Bar 4: both pins assert hand-typed literals. The GAP pin's six finding objects are literal positions, and they are
  the ones round 1's `positions-print.mjs` measured.
- [Observed] Bar 10: each pin catches a plausible bug no other test catches. The kill matrix of run 7 has one failing test each
  for MU17 to MU21; RW1, RW11 and RW12 behave the same in run 8.
- [Inferred] The GAP pin is a change detector by design. It names the line-model follow-up (`syzygy-bpyt.1.20`), and it should
  fail when that question is ruled and fixed.
- [Observed] Workflow 2 (name a one-line bug the test would not catch): for the F1 pin, RW3 and RW5 (N1, N2); for the GAP pin,
  RW10 (N2). RW9 (N3) is a gap in round 1's tests.
- [Observed] The F1 pin's label is invisible and its loop stops at the first failure (N7(a)).

## 8. Cleanup

- [Observed] Deleted:
  - all three scratch clones: `rev-544-r2/clone` (`561e4f77`, also `224e8faa`, `c399eda9` and the local merge `d6500106`),
    `rev-544-r2/base` (`f7ea8584`) and `rev-544-r2/battery-clone` (removed by the runner), with their `node_modules` and
    `dist`;
  - every TMPDIR I made, in `/tmp/r544b-1` to `/tmp/r544b-17`, and `/tmp/r544b-10-record.json`. I deleted `/tmp/r544b-5.out`
    after run 4. `/tmp/r544b-7` and `/tmp/r544b-13` were removed by the tools that made them, and `/tmp/r544b-11` was never
    made;
  - the `npm ci`, build, typecheck and battery logs, the battery's per-command logs, and the copy of the PR body;
  - `full-suite.json` (2.1 MB; its result lines are in `full-suite-summary.txt`);
  - my re-runs of the differential and the selftest, whose sha256 equal the committed outputs (`60723b16…` and `4661ec24…`).
- [Observed] Nothing in `/tmp` outside my own TMPDIRs was touched by me, except one directory a battery command made and removed itself. The battery's P-115 signed selftest makes its own directory directly under `/tmp`: mine, `/tmp/p115-signed-selftest-2zf6tg8h`, was gone when the run ended. `/tmp/p115-signed-selftest-m_4kbahl` remains; its mtime, 2026-10-27T05:51:05Z, is before my first run at 21:35Z, so it is not mine, and I left it untouched.
- [Observed] No kept file is over 300 KB; the largest is 145,740 bytes. Each kept file holds 0 U+00A0. The tools hold no
  non-ASCII character; the result files hold only what the runs printed.
- This raw is not listed below, since its own digest is reported with it.

| Kept file, relative to rev-544-r2/ | sha256 |
|---|---|
| `base-seven.json` | `7723e5dc8c6140fc3e0766892bc0e5c6886c699bd24f8b25de3e2e51728eda96` |
| `c399eda9-seven.json` | `e0c6ee67d2eea9d44e00b307a01b5f86e9eb588fb208cead77638c76e87761b7` |
| `diff-mutants-out.json` | `e65b01130ec6fae6c47a84459740f308e1170df310f791f8c2385024af981dba` |
| `dist-probe-out.txt` | `477f99444aad9fe329aa63a65028dff4c445af7e556ffbb967e7ed81ad2087e9` |
| `fidelity.txt` | `ee643ca49b8e1405c402f59be4e951fe283f52f339a2791da5a7a2e2d76bf65b` |
| `full-suite-summary.txt` | `eaa05db4e1790c7021cacfacedab8a73224931feee182de0a452c3bb67fc283f` |
| `general-pin-out.json` | `498ea99a40386f39e004ade8ffc27f11e6f6902bfab25c31022e7b61a2f6cc1b` |
| `head-seven.json` | `01b813b96c8d195034eb523a354b50821e4ee4f75024942b2e540f5c6d6f5715` |
| `lane-mutants-rerun.json` | `4d7b65dd1916c653eb71b5955f0e957ed801dc45dd71a95cdaed8c0d2b61ec43` |
| `lane-mutants-rerun.log` | `f6cbf49e8a5e697e34d65bae5023a23cbb2d883853d235b675761a39a3e4262b` |
| `main-changed-closure.txt` | `59eee03e3a7c5fb4a61eefe88a4ec95186018ddf8c97aaa13a355cf161c4ce99` |
| `merge-main-seven.json` | `15acf9e5d2bd45b55d1f2d65d4be770a49002fcbf5af158e33f7d645b6a38bd3` |
| `reviewer-mutants-r2-out.json` | `3892244b91a7b8eb3d60f36ae82034b2f795dee38c7644868a40e7b852e635b7` |
| `reviewer-mutants-r2.log` | `7d2e9c1779607a67cae38c5f104e6a592a561c754fb3338e0db410275417a0db` |
| `rw9-probe-out.json` | `3c59988d4f85a8395d6581f9ce2246a8cac7e49e7dc53eb1e8bdcc8d005a430b` |
| `slice-rebuild-out.json` | `eb314cc1a9c4cad436344394df76aaacf319269335f38060614dfcc43759795f` |
| `tools/battery-run.py` | `cbdbc43a6a9a02a4553bb3beff136c6c6716b3ac0c67081d635f2d705c4c8bdf` |
| `tools/body-texts.py` | `8bc8f9a90cb4c4db30b39404e08ea8852d14623424bcc541b181cd1941e51b44` |
| `tools/diff-mutants.mjs` | `bdb9f99f8267fa8fd08cc32e1b58acfb6ac768da7da0997fb2600df87e515917` |
| `tools/dist-probe.mjs` | `f3cb92599e6e38c387614434cc7058e29a63f15ccaf1760a9a078e10693977b2` |
| `tools/fidelity.py` | `69e4e6b268cdf63fc64ff634673e1111a321cdef03cbd58b2fc4a6af811b9095` |
| `tools/finalize-raw.py` | `5286f4d64e683bd9bcd567d6e4349160732c9ce71b2ee9bc1965f198d3b7e381` |
| `tools/general-pin.py` | `c0f2db1f4563ccc9f57f316d9c802767f8e8868d853aac72940ded6bf4ab1a8b` |
| `tools/import-closure.py` | `1b10fe5c2851e8d998ec898af903cd8d519eece61d284419a94e3bd803439ea7` |
| `tools/name-delta.py` | `5b40674ccfbde61d05a9c1aeec3110605aeb2eccea045320968b4a75b3be9d50` |
| `tools/record-verify.py` | `b274db8cea175c6311371630f3f16081bad9408abf1bf24e577cd987d1a722e2` |
| `tools/reviewer-mutants-r2.py` | `d4e385c97d5e8c7d7bf578078c8845ab8599c9b05a9dbb51ed04113350d3828b` |
| `tools/reviewer-mutants-runner.py` | `12d2458edd309a0fd203e5b31da1a6a7526caf17cf74c6d7463c18839360afbd` |
| `tools/run-seven.sh` | `fe6c2df0ece8c931e1de652d85de54f743fb71bc45e669351efe651bef26c647` |
| `tools/rw9-probe.mjs` | `65d610187ff357a5998e42c7abaa3a77fc1a4b8de371923034b6226285559472` |
| `tools/slice-dump.py` | `50200646069090af6b7f6f0740418cecf76c9e54e729b4a20bcc245484e2b664` |
| `tools/slice-rebuild.mjs` | `be91c003770766055f370f9ec3c5d27a47e2d764a8f60470d1e8fd2e3ea126f2` |
