# R-GP-IMPL-TEST-CLOCKS-4 — CC-REV-1 implementation review of syzygy-bpyt.4.5, round 4
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 23af2d08
Subject: r4-review.diff sha256 92b1adb645ce21065e3bd8c0afecb5c1f5b447070d0ba94f3d0901b6119b0aed

Reviewer: an independent, fresh-context CC-REV-1 reviewer (rev-532d), 2026-10-28. Brief:
`/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/lead/b45/brief-r4.md`.
Paths below without a directory are under
`/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-532d/`.

**In one paragraph.** The round-3 repair does what the ruling asked, and nothing it asked for is missing. The base's pin
sits in the test at `23af2d08` byte for byte, exactly once. The only other change to the test file is the five-line comment
above it, after one blank line. Y1–Y5 in the probe are byte-equal to rev-532c's. Run against the whole test file, each fails the restored pin
alone, with a real assertion that took 9–22 ms, not a timeout. Each of the five known false refusals also fails the pin
alone and passes the other 16 rows. `build_record` now requires the unreached rows to be exactly the near-miss row on both
CPU paths. It also computes the geometric mean from the runs and refuses a recorded one that differs. Ten of my own
mutants aimed at those two checks are killed at the check they aim at. An eleventh, a deleted mutant row, survives
(N2). Hosted `checks` and `node` pass at `23af2d08`. The full suite is green there, and the PR's test files are green on a
merge with main at `81862261`. No product byte changed. There are four notes and no blocking finding, so under the stopping
rule this round clears the bytes.

## 1. Subject identity checks

All digests below were computed by `sha256sum` or `git`, never typed in. [Observed]
- **Subject file.** `lead/b45/r4-review.diff` hashes to `92b1adb645ce21065e3bd8c0afecb5c1f5b447070d0ba94f3d0901b6119b0aed`.
  `git diff d0467aeb 23af2d08` gives the same digest, and `cmp` against the file is silent. `--shortstat`:
  `15 files changed, 3705 insertions(+), 738 deletions(-)`. **Matches.**
- **Whole PR.** `git diff d38d7a3c 23af2d08` hashes to `6bfcc006faa92bd833fc45cc2ef62e2d3da4f70f460d41611d41a3706af19e7e`:
  `43 files changed, 39581 insertions(+), 41 deletions(-)`. **Matches.** `git merge-base d38d7a3c 23af2d08` and
  `git merge-base <main> 23af2d08` both give `d38d7a3ce632a34c2a41bdb77ad323ba0b05b777`.
- **The repair's commits** (`git log d0467aeb..23af2d08`): `ba9d990a` (test and tools), `1b0f7757` (re-run evidence),
  `97c4af30` (pin-identity mutant tool), `23af2d08` (retained mutant results and the rebuilt record). Between `ba9d990a`
  and `23af2d08`, 11 paths change, all under `docs/evidence/syzygy-bpyt-4-5/`.
- **The repair's paths.** There are 15: `packages/cap1-system/src/daemon-entry-unchanged.system.test.ts` and 14 under
  `docs/evidence/syzygy-bpyt-4-5/`.
- **PR state.** `gh pr view 532` gives head `23af2d080108aabf878845dfe41007fbb77f2c52`, state OPEN. At the end of the review,
  `git ls-remote` still gives `refs/pull/532/head` at `23af2d08…`.
- **Hosted checks at `23af2d08`** (`results/gh-pr-checks.txt`, verbatim, read after the run completed):
  `checks	pass	26m27s	https://github.com/Tzeusy/syzygy/actions/runs/40537643365/job/122307111349` and
  `node	pass	4m8s	https://github.com/Tzeusy/syzygy/actions/runs/40537643137/job/122307112065`. The runs API gives
  `node-ci` 40537643137 and `governance-docs` 40537643365, both `completed success` with `head_sha` `23af2d08…`. When I
  first read them, `checks` was pending (94 of 119 steps done, 0 failed) and `node` had passed.
- **Main moved twice while I worked.** It stood at `f7ea8584` (#534) when I started, moved to `a403b902` (#541), then to
  `81862261` (#543). Section 3.5 lists what each move touched.

## 2. Clauses relied on, and the class ruling

Each clause is quoted at `23af2d08`. `git diff --quiet d0467aeb 23af2d08` over `AGENTS.md`, the CC-REV-1 policy, the GP-Q0
direction and the test-rigor skill exits 0, so none of them changed in the repair.

- **CC-REV-1** (`.syzygy/governance/policies/craft-and-care/review-and-documentation.md`):
  - `:18-20`: "Changes touching any of seven classes require review by an independent, fresh-context reviewer, and the
    agent performing the change never finally decides which classes it touches."
  - `:31-32`: "1. **authority boundaries** — write-universe, typed-authority table, adapter authorization (VIS-5, VIS-6);"
  - `:40-41`: "6. **public interface** — machine-queryable endpoints, adapter contracts, anything an external consumer can
    depend on;"
  - `:49-50`: "**The change record states** which classes the change touches, or "none," so a misclassification is a
    findable violation after the fact."
- **GP-Q0** (`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`):
  - `:52-55` (list items joined with semicolons): ""Behavior-preserving" means none of the following changes: a rendered
    byte, a wire format, a refusal string or an exit code; a signed or digest-bound artifact; a consent, security or
    retention decision."
  - `:62` and `:64-66` (joined; the ellipsis is mine): "**Which ones:** pull requests touching class 1 (authority
    boundaries), class 3 (deterministic observation) or class 4 (security) … an old-versus-new differential over a
    mutated-record corpus that includes records with altered prose; a rule-6 mutant for each predicate; a non-blocking
    owner notice in the cycle report."
  - `:95-96`: "Any change not listed here to what a gate accepts or refuses stops and returns to the owner."
- **The test-rigor bar** (`.claude/skills/th-engineering/subskills/test-rigor/SKILL.md`, read with `git show 23af2d08:`):
  - `:42`: "**A test is worth keeping only if some plausible bug makes it fail.**"
  - `:52-54`: "1. **Assert behavior, not implementation** — … A pure refactor should not break tests; a behavior change must."
  - `:82-83`: "7. **A failure names the defect** — Test names state expected behavior ("rejects_expired_token"); assertion
    messages make the diff readable."
- **AGENTS.md verification rules**:
  - `:122`: "3. Digests are scripted, never transcribed; totals are computed."
  - `:123-124`: "4. Read a check's output, not its exit code, and check its denominator against the whole population."
  - `:126-127`: "6. Mutate the input and confirm the check fails, per predicate, before trusting it".
  - `:132`: "9. A claim of absence needs a sweep with a denominator."
  - `:133`: "10. Freeze the bytes a review is bound to; any later edit retires the review."
- **The coordinator's round-3 ruling** (`lead/b45/brief-r4.md:43-51`). F1: "Restore `d38d7a3c`'s pin … byte-identical
  to the base's lines. Add Y1–Y5 to the probe and to `build_record` as rows the pin kills. Accept the stated cost: the pin
  again fails E-comment-in-branch, E-renamed-binding, E-branch-swap, L2 and L3, listed as the pin's known false refusals."
  F2: "`build_record` must require the unreached set to be exactly the near-miss row." F3: "Compute
  `geometricMeanNowMs` from the runs." N6: "Keep MAIN at `d38d7a3c`, and disclose what main changed since."
- **The subject's own claims:**
  - The new comment above the pin (`daemon-entry-unchanged.system.test.ts:274-278`): "The two rows above pass a
    then-block that loads the POC app and then falls through, re-enters main(), breaks out of a label or schedules a
    callback (rev-532c's Y1-Y5); this pin fails each, since each adds a line naming the app. Its known false refusals,
    which the rows above pass: a comment naming the app in the dossier branch, the renderer bound under another name, the
    two branches swapped, the dossier import in a nested function and the polaris import in a nested try."
  - `build_record.py:29-37`: "The rows not reached must be exactly the ones declared here (UNREACHED: the near-miss
    tag-names row under TAG_SCAN_CPU_MS, on both paths), so a row that runs under its bound is refused rather than left
    out. … each later run's mean, the square root of the derived head maximum times the derived mutant minimum rounded
    down to two significant figures (cpu_separation.py's rounding), is computed here, must equal the separation's
    `proposedBoundMs`, and is recorded as `geometricMeanNowMs`. The test file must hold the base's old text pin byte for
    byte (its `it` block on PIN and the one comment line above it, as BASE_COMMIT has them), exactly once."

**Class ruling.** [Inferred] The repair's one test change, the restored pin, is class-1 and class-6 evidence: the daemon
path stays outside the POC app, beside the daemon's CLI-byte and exit-code rows. The PR as a whole stays at classes 1, 4
and 6, as rounds 1–3 ruled. I do not revisit that. The procedural consequence is nil: class 1 already brings in every
GP-Q0 check, and this review is the independent one.

**GP-Q0.**
- [Observed] The repair changes 1 test file and 14 evidence files. The whole PR changes 10 test files and 33 evidence
  files. Of the 43 paths, 0 are product files and 0 are under `.syzygy/` or `openspec/`.
- [Observed] The daemon-entry file passes 17/17 at `23af2d08` and on both merges. The system suite gives 50 passed and
  1 pending, of 51 (3.4).
- So no rendered byte, wire format, refusal string or exit code changes, and nothing a product gate accepts or refuses
  changes (`:52-55`).
- What changes is what the test suite refuses. It again refuses what the base's pin refused: Y1–Y5, the five listed false
  refusals, and G1–G3 (3.2). It keeps refusing S1–S7, which earlier rounds added.
- That restores the base's own behaviour for the pin, which the owner pre-ruled. It is not a new gate decision, so the
  stop clause (`:95-96`) is not triggered.

## 3. What I ran and the results

Each vitest run used its own short TMPDIR (`/tmp/r532d-1` to `/tmp/r532d-5`), and only one vitest process ran at a time.
`load1` is the first field of `/proc/loadavg`, at the start → the end of the run. The node is `v24.6.0`. The vitest clone
was at `23af2d08` after `npm ci` and `npm run typecheck`, which runs the same `tsc -b` as `build` (exit 0).

### 3.1 Item 1: the restored pin's identity (`tools/identity_r4.py`, `results/identity-r4.json`)

- **The base block.** It is `d38d7a3c`'s daemon-entry test, lines 212–227: 16 lines, sha256
  `ff9d5016fbd23ac63caad459acd2da3789f52d212bed59d0bb3653e93414cc6a`.
  - Line 212 is `  // The `polaris` branch (prototype, POLARIS-DOSSIER-ONE-COMMAND-RUN-2026-10-14) injects the same renderer the same way.`
  - Line 213 is the `it('the daemon path never loads the POC app: each import is dynamic and inside the `dossier` or `polaris` branch', () => {` line.
  - Line 227 is `  });`.
  - The test blob is `12e98403` at both `d38d7a3c` and `c104771f`. build_record's `BASE_COMMIT` is `c104771f`, so it reads
    the same bytes.
- **Exactly once at `23af2d08`, by two methods.** [Observed]
  - A substring count of the block (newline-joined, with a trailing newline) gives `1`.
  - A scan of 16-line windows gives one start, line `279`.
  - At `d0467aeb` the count is `0`.
- **Nothing else changed.** [Observed] A line diff (`difflib`, no autojunk) from `d0467aeb` (blob `4a495489`) to
  `23af2d08` (blob `c483abf2`) gives exactly one opcode: `insert` of 22 lines after line 272, the `  });` that closes
  the compiler-API row. The 22 lines are:
  - one blank line;
  - five comment lines, each beginning `  // `;
  - the 16-line base block, byte-equal to it.
  - No line was removed or replaced.
- **The comment block, sentence by sentence.**
  - "Restored from the base byte for byte (syzygy-bpyt.4.5, round 3's stopping rule)." **True** [Observed], as above.
  - "The two rows above pass a then-block that loads the POC app and then falls through, re-enters main(), breaks out of
    a label or schedules a callback (rev-532c's Y1-Y5)". **True** [Observed, 3.2]. Each of Y1–Y5 passes the load-hook row
    (`:218`) and the compiler-API row (`:249`), and every other row except the pin. Y3 re-enters `main()` after it
    rewrites `argv` under a flag, which the sentence's "re-enters main()" covers.
  - "this pin fails each, since each adds a line naming the app." **True** [Observed]. Each fails at `:284` with
    `expected [ …(3) ] to deeply equal [ …(2) ]`, a third mention line.
  - "Its known false refusals, which the rows above pass: a comment naming the app in the dossier branch, the renderer
    bound under another name, the two branches swapped, the dossier import in a nested function and the polaris import in
    a nested try." **Each of the five is stated correctly** [Observed, 3.2]: each fails the pin alone and passes the other
    16 rows. The probe's notes match the words:
    - "a comment naming the POC app inside the dossier branch";
    - "the polaris branch binds the renderer under another name";
    - "the polaris branch moved above the dossier branch";
    - "the dossier import moved into a nested async function inside the branch";
    - "the polaris import inside a nested try block in the branch".
  - **The list is not complete, though.** rev-532c's G1 and G2 are known false refusals too, and they pass both rows above
    (N1).

### 3.2 Item 2: Y1–Y5 and the false refusals against the whole test (`tools/de_rows_r4.py`, `results/de-rows-r4-head.json`)

- **Byte equality.** [Observed] `tools/identity_r4.py` loads the probe's `MUTANTS` at `23af2d08`, executing only the
  module up to the `MUTANTS` assignment. It also loads `rev-532c/tools/r3_variants.py` (sha256
  `9e4e0fd3be2221b3d7a1c6098029d6e940425a8581dcd95cf509bd13a03cb536`, as listed in round 3's cleanup).
  - For each of Y1–Y5, the probe's `(old, new)` equals rev-532c's single edit: `fragmentsEqual: true` ×5.
  - Applied to `main.ts` at `23af2d08` (blob `0c03e8bf`), the probe's and rev-532c's edits give identical bytes:
    `appliedEqual: true` ×5.
  - The probe's kind for each is `defect`. Its notes equal rev-532c's, or are a prefix of them; Y3's drops rev-532c's
    trailing parenthesis.
- **The runs.** Each mutant is taken from the tree's own probe, or for G1–G3 from `r3_variants.py`. Each is applied to
  `main.ts`, then `npx tsc -b apps/syzygy` runs, then the whole daemon-entry file runs under the system config. Every
  build exited 0, and no run was killed. Over the 14 runs, load1 went from 26.98 → 31.87. The quoted line is each failed
  row's first failure line, verbatim.

| Variant | Exit | Passed of 17 | Failed row | Its failure, and its duration |
|---|---|---|---|---|
| control | 0 | 17 | — | — |
| Y1, Y2, Y3, Y4, Y5 | 1 | 16 each | the restored pin (`:280`), alone | `AssertionError: expected [ …(3) ] to deeply equal [ …(2) ]`; 9.7, 21.8, 14.1, 10.3, 9.2 ms |
| E-comment-in-branch | 1 | 16 | the restored pin, alone | `expected [ …(3) ] to deeply equal [ …(2) ]`; 8.2 ms |
| E-renamed-binding | 1 | 16 | the restored pin, alone | `expected [ …(2) ] to deeply equal [ …(2) ]`; 10.2 ms |
| E-branch-swap | 1 | 16 | the restored pin, alone | `expected 7481 to be greater than 7758`; 21.4 ms |
| L2-nested-function-in-dossier | 1 | 16 | the restored pin, alone | `expected [ …(2) ] to deeply equal [ …(2) ]`; 40.2 ms |
| L3-nested-try-in-polaris | 1 | 16 | the restored pin, alone | `expected [ …(2) ] to deeply equal [ …(2) ]`; 34.6 ms |
| G1 (rev-532c: Allman brace, import wrapped over three lines) | 1 | 16 | the restored pin, alone | `expected [ …(2) ] to deeply equal [ …(2) ]`; 11.4 ms |
| G2 (rev-532c: block comments around `else` and inside the condition) | 1 | 16 | the restored pin, alone | `expected -1 to be greater than 7254`; 6.2 ms |
| G3 (rev-532c: else-if order swapped) | 1 | 16 | the restored pin, alone | `expected 7481 to be greater than 7760`; 15.6 ms |

- **These are real kills, not timeouts.** [Observed] Every failed row ran in 6.2–40.2 ms and failed with an assertion.
  The slowest row in any run took 2,240 ms (a daemon row). No run reached the tool's 600 s limit.
- **The record agrees.** [Observed] `tools/record_de_check_r4.py` (`results/record-de-check-r4.json`) compares 11 ids,
  the control and the 10 the record holds, with the record's `daemon-entry-head.json` (commit `ba9d990a`, test sha256
  `a05821cb…`, the same as the test at `23af2d08`). There are `disagree: []`. The record's `daemon-entry-base-test.json`
  shows the old pin failing all five Ys (`oldPinFailsY` true ×5). G1–G3 are not in the record.
- **A disabled pin is caught downstream.** [Observed] With the pin wrapped in `/* */` (my M13, 3.3) and Y1 or Y3 applied,
  the whole file gives 16 of 16 passed and 0 failed (`results/de-rows-r4-M13.json`, load1 28.80 → 27.59).

### 3.3 Item 3: `build_record.py`'s new checks

**Reading `separated()`** (`build_record.py:116-146` at `23af2d08`). [Observed]
- **Unreached set.** `:132-133`:
  `if sorted(r['title'] for r in rows if not r['reached']) != UNREACHED.get(s['bound'], []): sys.exit(…)`, with
  `UNREACHED = {'TAG_SCAN_CPU_MS': ['scans near-miss tag names at the ceiling']}` (`:109`).
  - It is a sorted-list equality, so an extra, a missing or a duplicated unreached row is refused. A bound absent from
    `UNREACHED` must have none.
  - It runs before `if not reached`, and `separated()` is called for every site of both separations: `fallback`
    (`cpu-separation-node22`, `:149-150`) and `separation` (`cpu-separation`, `:152-157`). **So it holds on both CPU paths.**
- **Geometric mean.** `:139-140`: `mean = round_down_2sf(math.sqrt(head_max * mutant_min))`, then
  `if mean != s['proposedBoundMs']: sys.exit(…)`.
  - `head_max` and `mutant_min` are the values derived from the runs at `:121-136`.
  - `round_down_2sf` (`:110-112`) is the same three lines as `cpu_separation.py:109-111`.
  - The record's `geometricMeanNowMs` is written from `mean`, on the thread path (`:157`, `figures['geometricMeanNowMs']`)
    and in `underProcessCpuFallback` (`:149-150`).
- **Nothing recorded on this path is still trusted.** [Observed] Every figure `separated()` returns is derived:
  `headRuns` as a count, `headMaxMs`, the rows, `mutantMinMs`, `mutantMinIsLowerBound`, the two ratios and the mean.
  Copied through are only the narrative `file`, the Node 22 `node` string (checked to start `v22.`) and the constant
  `cpuSource`.

**Rebuild.** [Observed] I ran `python3 -I docs/evidence/syzygy-bpyt-4-5/tools/build_record.py . c104771f d38d7a3c
ba9d990a 447d9f08 9e00252a d621bfa2`, the record's own subject and `laterMain`. It exits 0, and `git status --porcelain`
is then empty, so the committed record is reproduced byte for byte. Its last line begins `{"rowDelta": "Tests: +2 ~17 -0",
"testFiles": 10, "productFilesChanged": [], "mutantTotals": {"cases": 33, "sides": 65, "asExpected": 65}` and carries
`"pinRowAlone": {"defects": ["Y1-…", "Y2-…", "Y3-…", "Y4-…", "Y5-…"], "knownFalseRefusals": ["E-comment-in-branch",
"E-renamed-binding", "L2-nested-function-in-dossier", "L3-nested-try-in-polaris", "E-branch-swap"]}`
(`results/build-record-rebuild-23af2d08.log`).

**The lane's mutants, re-run at `23af2d08`.**
- `build_record_mutants.py`: 40 of 40 as expected (`results/lane-build-record-mutants-r4.json`). Its B3 is refused with
  `cpu-separation: TAG_SCAN_CPU_MS: the rows not reached are ['scans near-miss tag names at the ceiling', 'scans
  unterminated plural tags at the ceiling'], not the declared […]`, and B4 with `cpu-separation: ATTRIBUTE_SCAN_CPU_MS:
  the runs give a geometric mean of 2900; the separation records 9900`.
  - Against the lane's retained `build-record-mutants.json`, 38 of 40 last lines are identical. The other 2 (K18, K29)
    differ only because I passed the base and the round-1 commits abbreviated: those two mutants write an argument into
    the record they edit. Their exits and the checks that refuse them are the same.
- `pin_identity_mutants.py`: 6 of 6 as expected (`results/lane-pin-identity-mutants-r4.json`). Its ids, exits, last lines
  and scratch commit ids all equal the lane's retained `pin-identity-mutants.json`, because the tool's commits use fixed
  dates.

**My 16 mutants** (`tools/my_mutants_r4.py`, `results/my-mutants-r4.json`).
- A `json` mutant edits a retained separation in the working tree, with every summary it touches edited to agree.
- A `test` mutant is a scratch commit object whose one parent is `ba9d990a`, made with a temporary index. It is never
  checked out by the tool, and never pushed.
- A `checker` mutant edits `build_record.py` itself.
- "At the check" means the last line is that check's refusal.

| Id | Edit | Sound | Outcome, last line |
|---|---|---|---|
| control | none | pass | exit 0 |
| M1 | **Node 22** TAG_SCAN `plural` row uncapped at 600 ms on every run, under the 1,500 bound (B3 on the other path) | fail | **killed at the check**: `cpu-separation-node22: TAG_SCAN_CPU_MS: the rows not reached are ['scans near-miss tag names at the ceiling', 'scans unterminated plural tags at the ceiling'], not the declared […]` |
| M2 | thread TAG_SCAN near-miss row uncapped at 70,000 ms (it now reaches; the mutant min stays 60,021.3) | fail | **killed at the check**: `… the rows not reached are [], not the declared ['scans near-miss tag names at the ceiling']` |
| M3 | thread TAG_SCAN near-miss row held twice | fail | **killed at the check**: `… are ['…near-miss…', '…near-miss…'], not the declared […]` |
| M4 | an extra unreached row: Node 22 TAG_SCAN opening-tags row uncapped at 300 ms (under 10× the 64.5 ms head max); the mutant min stays the plural row's | fail | **killed at the check**: `cpu-separation-node22: … ['…near-miss…', 'scans unterminated opening tags at the ceiling'], not the declared […]` |
| **M5** | **thread TAG_SCAN `plural` row deleted from the record** | fail | **survives: exit 0** (N2) |
| M6 | thread ATTRIBUTE_SCAN `proposedBoundMs` 2900 → 2800 (one off in the second significant figure) | fail | **killed at the check**: `cpu-separation: ATTRIBUTE_SCAN_CPU_MS: the runs give a geometric mean of 2900; the separation records 2800` |
| M7 | Node 22 EDGE_TRIM `proposedBoundMs` 2300 → 2400 | fail | **killed at the check**: `… the runs give a geometric mean of 2300; the separation records 2400` |
| M8 | Node 22 HOSTILE_LINE `proposedBoundMs` 160 → 150 | fail | **killed at the check**: `… the runs give a geometric mean of 160; the separation records 150` |
| M9 | thread EDGE_TRIM: one head region raised to 150 ms, with `headMaxMs` and `fileBound` agreeing; `proposedBoundMs` left at 1900 | fail | **killed at the check**: `… EDGE_TRIM_CPU_MS: the runs give a geometric mean of 3000; the separation records 1900`. So the mean is derived from the runs, not from the summary |
| M10 | `proposedBoundMs` 2900 written as 2900.0 | pass | exit 0 (correct: the same number) |
| M11 | the exact pin, then a second copy with `[line, line]` → `[line,line]` | not refused by the pin check | the pin check passes it (the exact block occurs once); refused next by `mutants ran at ba9d990a…, not 57c4b66a…` |
| M12 | the altered copy first, the exact block second | the same | the same; `… not 9fff8642…` |
| M13 | the exact pin wrapped in `/* */` | the same | the same; `… not 3a05f9b4…` |
| M14 | the exact pin inside `describe.skip(…)` | the same | the same; `… not a766afba…` |
| M15 | checker: `UNREACHED` also names the plural row | fail | **killed at the check**: `cpu-separation-node22: TAG_SCAN_CPU_MS: the rows not reached are ['…near-miss…'], not the declared ['…near-miss…', 'scans unterminated plural tags at the ceiling']` |
| M16 | checker: `UNREACHED` declares ATTRIBUTE_SCAN's one row | fail | **killed at the check**: `cpu-separation-node22: ATTRIBUTE_SCAN_CPU_MS: the rows not reached are [], not the declared [...]` |

How I read the survivors:
- **M11–M14** pass the identity predicate, which is textual by design: the docstring says "byte for byte … exactly
  once", and that is what it checks.
  - None of them can build green. The record's results are bound to `ba9d990a` (mutants, census and the four
    daemon-entry runs, `:79-85`), so a test edit forces a re-run.
  - A re-run shows a disabled pin. Under M13, Y1 and Y3 pass all 16 rows (3.2), and `build_record` then refuses at
    `:244`: "the record says the new test fails it at the restored pin alone" [Inferred from the code. I did not
    re-run the probe and the record at that commit].
  - An extra altered copy beside the exact one weakens nothing, because the exact copy still runs.
  - Not a finding.
- **M5** survives. A row deleted from the record leaves the unreached set unchanged and the minimum unchanged. N2.

### 3.4 Suites and gates

| Run | Tree | Result | load1 |
|---|---|---|---|
| The PR's 9 root-config test files | `23af2d08` | exit 0: 281 passed of 281, 9 files | 23.57 → 22.38 |
| System suite (`--config packages/cap1-system/vitest.config.ts`), which holds the daemon-entry file | `23af2d08` | exit 0: 50 passed, 1 pending, of 51, 10 files | 22.43 → 24.82 |
| **Full suite** (`npx vitest run`, once) | `23af2d08` | **exit 0: 5374 passed, 0 failed, 5 pending, of 5379, 246 files** | 23.87 → 32.41. In its last minute, `npm ci` and `npm run build` ran in my other clone (no vitest) |
| The PR's 9 root-config test files | merge `bc0414e1` (main `a403b902`) | exit 0: 283 of 283 | 30.18 → 30.18 |
| System suite | merge `bc0414e1` | exit 0: 50 passed, 1 pending, of 51 | 30.18 → 36.19 |
| The PR's 9 root-config test files | merge `f0f0feaa` (main `81862261`) | exit 0: 283 of 283 | 18.07 → 17.83 |
| System suite | merge `f0f0feaa` | exit 0: 50 passed, 1 pending, of 51 | 17.83 → 20.41 |
| `npm run typecheck` | `23af2d08` | exit 0 | 26.52 → 27.92 |
| `python3 scripts/check_governance.py` | `23af2d08` | `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted`, exit 0; 0 lines name the bead | — |
| `python3 scripts/check_quotations.py` | `23af2d08` | exit 0; `OK    QC-1  a quotation beside a path:line locator was said by that file — 37 quotations examined in 18 of 971 .md files scanned (loc-paren-quote 2, loc-colon-quote 25, quote-paren-loc 10), 0 findings` | — |

- The full-suite figure equals the lane's run at `ba9d990a` (5,374 passed, 5 skipped, of 5,379).
- Between `ba9d990a` and `23af2d08` only evidence files change, so the two trees run the same tests.
- The merges add 2 rows to the 9 files (283). [Inferred] They come from main's `b214ef10`, which adds test code to
  `dossier-profile.test.ts` and `dossier-evaluation.test.ts`.
- The system suite has one row more than round 3's (49 + 1 pending of 50), and that row is the restored pin.

### 3.5 Main's movement, and the local merges (`tools/main_moved_r4.py`)

The watched sets are:
- the PR's 43 paths;
- the four inputs the daemon-entry runs bind: `main.ts`, `state-directory.ts`, `shutdown.ts` and the daemon-entry test
  (`build_record.py:83-85`);
- the 13 distinct files of rev-532c's region closures (`rev-532c/results/region-closure-r3.json`).

**`d38d7a3c` → `a403b902`: 1,206 paths changed** (`results/main-moved-r4-a403b902.json`). [Observed]
- **4 of the 43 PR paths moved.** For each: commits, then blobs at `d38d7a3c` → main, then the PR's blob.
  - `apps/three-surface-poc/src/main.test.ts`: `3fa4817c` (syzygy-bpyt.7.15); `a815251b` → `a99a124a`; PR `d2aaf098`.
  - `apps/three-surface-poc/src/polaris-generation/self-corpus.test.ts`: `1785a905` and `0e513a9b` (syzygy-bpyt.4.31,
    #537); `fddc4aa9` → `39fb1090`; PR `2758fda6`. The two hunks are independent: the PR adds a comment at `:11-13`, and
    main adds a trailing comment to a timeout at `:46`.
  - `packages/polaris-generation-core/src/dossier-evaluation.test.ts`: `b214ef10` (syzygy-bpyt.6.13); `17ce4471` →
    `77b3d3bd`; PR `5901a209`.
  - `packages/polaris-generation-core/src/dossier-profile.test.ts`: `b214ef10`; `156ace6f` → `fb0e968e`; PR `411e61fe`.
    Main adds one `it` block in the `REQ-031 clarification` describe, at `:48-59`. That is outside the EDGE_TRIM region.
- **1 of the 4 bound inputs moved.** `packages/http-host/src/shutdown.ts`: `adf908c6` (syzygy-bpyt.7.15), `409e3247` →
  `d83885cd`, 6 comment lines. `main.ts` (`0c03e8bf`), `state-directory.ts` (`26ad83ea`) and the daemon-entry test
  (`12e98403` on main) did not move.
- **1 of the 13 closure files moved.** `packages/support/src/index.ts`: `0e2640e9` (syzygy-bpyt.6.3), `11bd1b83` →
  `41a9a88a`, adding one line, `export { decodeUtf8 } from './decode-utf8.js';`. It is in EDGE_TRIM's closure.
- **The record's `mainMovedSince`** was built against `d621bfa2`. It names 4 of the 5 paths above: every one except
  `self-corpus.test.ts`, which #537 brought in after `d621bfa2` (N3).
- **#541** (`f7ea8584` → `a403b902`, 164 paths) touches 0 PR paths, 0 bound inputs and 0 closure files.
- **#543** (`a403b902` → `81862261`, 33 paths) touches 0 PR paths and 0 bound inputs. `d38d7a3c` → `81862261` (1,238
  paths) gives the same 4 PR paths, 1 bound input and 1 closure file as above (`results/main-moved-r4-81862261.json`).

**The local merges.** None was pushed.
- `bc0414e1` has parents `23af2d08` and `a403b902`. `f0f0feaa` has parents `23af2d08` and `81862261`.
- Each merged with no conflict. Git auto-merged the 4 overlapping files.
- Each differs from its main in exactly the 43 PR paths: `cmp` against `results/pr-paths.txt` is silent
  (`results/merge-vs-main-paths.txt` is `bc0414e1`'s list).
- `npm ci` and `npm run build` exit 0 on both. Suites: 3.4.
- **`build_record` on the merges.**
  - With the record's own arguments (`laterMain` `d621bfa2`), it exits 0, and `git status` is empty afterwards.
  - With `LATER_MAIN` set to `a403b902` or `81862261`, it exits 0 and rewrites `bounds-and-pins.json` by `+8/−1` lines:
    the new `laterMain`, and a `self-corpus.test.ts` entry naming `0e513a9b…` and `1785a905…`
    (`results/build-record-on-merge-81862261.log`).
  - At `23af2d08`, with MAIN set to main as it then stood (`f7ea8584`), it refuses on the first moved path, as the
    record's note says it will: `AGENTS.md differs between c104771f… and f7ea8584…`.

## 4. Round 3's F1, F2, F3 and N6: resolved?

- **F1 (Y1–Y5 passed every test; restore the old pin): resolved.** [Observed]
  - The pin is byte-identical and present exactly once, and nothing else in the file changed (3.1).
  - Y1–Y5 are rev-532c's bytes. Each fails the restored pin alone (3.2), and each fails the old pin in the record's
    base-test run.
  - `build_record` requires both: `:243-244`, refusing "the old pin passes it" and "fails it at the restored pin alone".
    It also requires the defect and false-refusal sets of `pinRowAlone` to be exactly Y1–Y5 and the five (`:270-271`).
    The lane's K32–K37 kill mutations of those records.
  - The cost is stated where the ruling asked. The test comment and the record's `residuals` and
    `daemonEntry.pinRowAlone.knownFalseRefusals` each name the five. All five are stated correctly.
  - The stated list is not complete (N1).
- **F2 (an unreached row was dropped from the check): resolved, on both CPU paths.** [Observed]
  - The lane's B3 (thread) and my M1 (Node 22) are killed at the new check.
  - So are M2 (the declared row reaches), M3 (the declared row twice), M4 (an extra unreached row), and M15 and M16 (the
    checker declares more than the data holds).
  - M5, a deleted row, survives. That row is never unreached; it is absent. This is a population gap of round 3's N2
    class, not an exactness gap in this check (N2).
- **F3 (`geometricMeanNowMs` copied): resolved.** [Observed]
  - The mean is computed from the derived head max and mutant min, compared with `proposedBoundMs`, and written from the
    derivation on both paths.
  - The lane's B4 and my M6, M7, M8 and M9 are killed at that check. M9 shows that the derivation reads the runs, not
    the `headMaxMs` summary. M10 passes, as it should.
  - No figure on this path is still copied (3.3).
- **N6 (record MAIN vs moved main): resolved as ruled.** [Observed]
  - MAIN stays `d38d7a3c`, and the base side was not re-run.
  - `mainMovedSince` lists the moved paths among the change's files and the four bound inputs, against `laterMain`
    `d621bfa2`. Those were main's moves when the record was built.
  - Main has since moved, by #537's `self-corpus.test.ts` (N3).

**Scope: what the repair changes beyond the ruling.** [Observed] Everything stays within the one test file and the
evidence directory. Beyond the asks, the repair:
- adds a **pin-identity check** to `build_record.py` (`:65-70`), with its own rule-6 tool `tools/pin_identity_mutants.py`
  (`97c4af30`) and its retained results `pin-identity-mutants.json`. It supports F1 and is sound for what it claims (3.3);
- adds **K32–K37** to `build_record_mutants.py`, besides the asked-for B3 and B4;
- replaces `pinKillsDropped` with **`pinRowAlone`** and adds a `newPinRow` column. It also generalises the per-equivalent
  check into `EQUIVALENT_FAILS` and bumps the schema to `/3`. All of these follow from F1;
- adds a **`LATER_MAIN`** argument and **`mainMovedSince`**. They follow from N6;
- re-runs the **census, the bound-and-pin mutants, the four daemon-entry runs and one full suite** (attempt 7) at
  `ba9d990a`. `build_record` requires each of those results to be at EVIDENCE;
- adds two **residual paragraphs** (Y1–Y5, and the five false refusals);
- makes one **cosmetic regression**: `HOOK_ROW ='the daemon path …'` lost the space before `=` (`build_record.py:201`).

There are 0 product files and 0 paths under `.syzygy/` or `openspec/` (`productFilesChanged: []`).

## 5. New findings

No blocking finding. Four notes.

### N1 — note. The comment's list of the pin's "known false refusals" leaves out two that rev-532c recorded, G1 and G2

- **Severity:** note. The five it names are stated correctly. The ruling named those five. The cost of the omission is a
  false red that someone did not expect, never a missed load.
- **Evidence.** [Observed] (3.2)
  - rev-532c's G1 puts the dossier brace on its own line and wraps the import over three lines. G2 chains the branches,
    with block comments around `else` and inside the condition. Both are legitimate shapes, and nothing on the daemon
    path loads in them.
  - At `23af2d08` each fails the restored pin alone, and passes the other 16 rows:
    - G1: `expected [ …(2) ] to deeply equal [ …(2) ]`;
    - G2: `expected -1 to be greater than 7254`.
  - Round 3 recorded both as failing the old pin (`R-GP-IMPL-TEST-CLOCKS-3-RAW.md`, 3.1, row "G1, G2, G3"). So they are
    known.
  - G3 (the else-if order swapped) behaves the same, but "the two branches swapped" covers it in words.
  - The record's residual is precise ("it also fails five mutants", of the probe's population), so the record is not
    wrong. The test comment's "Its known false refusals, which the rows above pass:" reads as the full list.
- **Failure scenario.**
  - A formatter adopts Allman braces or wraps long imports, or someone comments the else-if chain.
  - The reader of `:276-278` expects the pin to stay green, and it goes red.
  - That is the cost the owner accepted, but it is not the one the comment describes.
- **Proposed fix (a follow-up bead, not at landing).** Any edit to the daemon-entry test changes bytes that the four
  daemon-entry runs bind (`build_record.py:83-85`), so a landing edit would force those runs to be re-run.
  - Reword `:276` to "Among its false refusals, which the rows above pass:", and add "a formatter's Allman brace or
    wrapped import, and block comments in a branch condition".
  - Add G1–G3 to `tools/daemon_entry_probe.py` as `equivalent` mutants, with the bytes from `rev-532c/tools/r3_variants.py`.
    Extend `PIN_FALSE_REFUSALS` with them, then re-run the four daemon-entry runs and rebuild.

### N2 — note. `build_record` does not pin each site's mutant-row population, so a row deleted from a separation builds green (M5)

- **Severity:** note. It is round 3's N2 class, which the coordinator sent to a follow-up: a population of primary
  observations that is not checked against its source.
- **No honest run produces it.** [Observed] `cpu_separation.py:114-131` emits every row its hard-coded `SITES` lists,
  and exits on a fragment that does not apply (`:82`) or a run that neither caps nor probes (`:128`). Its digest is bound to EVIDENCE
  (`build_record.py:94-96`). So a row disappears only by a hand edit or a visible change to the producer.
- **Evidence.** [Observed] M5 deletes thread TAG_SCAN's `plural` row and exits 0. The unreached set is still the
  near-miss row, and the mutant min is still the opening row's 60,021.3. The rebuilt record states TAG_SCAN at 22.7× and
  40.0× over two mutant rows instead of three.
- **Failure scenario.** The plural case stops killing the mutant: a change makes the scan fast on plural tags. A later
  lane drops that row from `cpu_separation.py`'s `SITES` and re-measures. `build_record` accepts the smaller population,
  with nothing to say that the bound now rests on one fewer case.
- **Proposed fix (with round 3's N2, in the follow-up bead).**
  - In `separated()`, before the unreached check, require
    `sorted((m['id'], m['title']) for m in s['mutants'])` to equal a declared list per bound. Declare it as a literal
    beside `UNREACHED`, or read it from `cpu_separation.py`'s `SITES` at EVIDENCE with `ast`.
  - Add M5 to `tools/build_record_mutants.py` as a `fail` case.

### N3 — note. The record's `mainMovedSince` is stale against current main by one PR path

- **Severity:** note. The field is true for its own `laterMain` (`d621bfa2`), which the docstring defines as "main as it
  stands when the record is built" (`build_record.py:8-10`).
- **Evidence.** [Observed] (3.5) Since `d621bfa2`, #537 changed `self-corpus.test.ts`, a PR path. On my merges,
  `build_record` with `LATER_MAIN` `a403b902` or `81862261` exits 0 and changes `bounds-and-pins.json` by `+8/−1`
  lines, adding that path.
- **Failure scenario.** A reader at landing takes `mainMovedSince` as the full list of PR paths main touched, and misses
  `self-corpus.test.ts`.
- **Proposed fix, either at landing (mechanical) or in the dispositions.**
  - Rebuild with `LATER_MAIN` set to the final main, and commit the regenerated record. Two checks show it applied:
    `mainMovedSince.paths` lists `main.test.ts`, `self-corpus.test.ts`, `shutdown.ts`, `dossier-evaluation.test.ts` and
    `dossier-profile.test.ts`, or more if main moves again; and a second rebuild leaves `git status --porcelain` empty.
  - Or leave the record as it is, and name the fifth path in the dispositions record.

### N4 — note. The compiler-API row's comment still calls itself "The kept part of the old text pin"

- **Severity:** note, wording. The line is unchanged by the repair (`:242`).
- **Evidence.** [Observed] `:242` opens "The kept part of the old text pin." The old pin is now kept whole, 32 lines
  below. A reader can take the compiler-API row for what is left of a pin that is in fact still there.
- **Proposed fix (the follow-up bead, for the same binding reason as N1).** Open it "The compiler-API text row." and leave
  the rest.

Round 3's N1–N5 were not repaired, as ruled. They go to a follow-up bead at landing, and I do not revisit them.

## 6. Changed outputs

[Observed] There are none outside tests and evidence.
- The repair's 15 paths are 1 `*.test.ts` file and 14 files under `docs/evidence/syzygy-bpyt-4-5/`.
- The whole PR's 43 paths are 10 test files and 33 evidence files.
- The rebuilt record has `productFilesChanged: []`.
- All 17 daemon-entry rows pass at `23af2d08` and on both merges. They include the entry's usage-byte, refusal-message and
  exit-code rows. The system suite gives 50 passed and 1 pending, of 51, at all three.
- No rendered byte, wire format, refusal string, exit code or digest-bound artifact changes.

## 7. What the coordinator must re-run or re-check at landing on current main

1. **Fetch main again.** At my last `git ls-remote` it was `81862261ddbc2b3c8e8481851f3c27129217d477` (#543). If anything
   has landed since, re-list main's changes against:
   - the 43 PR paths (`results/pr-paths.txt`);
   - the 4 bound inputs (`main.ts`, `state-directory.ts`, `shutdown.ts`, the daemon-entry test);
   - the 13 closure files.
   Today the overlap is 4 PR paths, 1 bound input (`shutdown.ts`, comments only) and 1 closure file (3.5).
   `tools/main_moved_r4.py` does this in one call.
2. **`mainMovedSince` (N3).** Either rebuild with `LATER_MAIN` set to the final main and commit the `+8/−1` change, or name
   `self-corpus.test.ts` in the dispositions record. Then rebuild once more and require `git status --porcelain` to be
   empty.
3. **Do not edit the daemon-entry test at landing.** The fixes for N1 and N4 go to the follow-up bead. The record's
   results are bound to EVIDENCE `ba9d990a`, so after such an edit the test that lands is no longer the one the record
   describes. Rebuilding with the landing commit as EVIDENCE refuses at the first binding: `mutants ran at ba9d990a…,
   not <commit>` (`build_record.py:79-80`), as my M11–M14 show.
4. **On the final merged tree,** run each of these once, one at a time, and record load1:
   - `npm ci` and `npm run build`;
   - the PR's 9 root-config test files;
   - `npm run test:system`, which holds the restored pin. That pin reads `main.ts` by exact line, so a later main change
     to either branch turns it red even when git reports a clean merge;
   - the full root suite.
5. **Confirm hosted `checks` and `node`** on the final head with `gh pr checks`. At `23af2d08` both pass (1). A new head
   needs new runs. Merge with `--match-head-commit`.
6. **File the follow-up bead.** It covers round 3's N1–N5 (as ruled), this round's N1, N2 and N4, and N3 if it is not
   taken at landing.
   - Carry the closure note into it. `support/index.ts` (in EDGE_TRIM's closure) and `dossier-profile.test.ts` (a timed
     file) changed on main.
   - `build_record`'s emit-equal check compares the separation trees with EVIDENCE (`ba9d990a`), never with the merged
     tree, so it does not see those two changes.
   - [Inferred] Neither changes the EDGE_TRIM region's CPU: one adds an export, and the other adds an `it` block outside
     the region. Whether it does is [Unknown]: I did not measure it, and the ruling asks for no re-measurement.

## 8. Cleanup

- **Deleted.** [Observed]
  - My scratch clones, `clone/` (275 MB, at `23af2d08`) and `clone-br/` (229 MB, which held the local merges
    `bc0414e1` and `f0f0feaa`).
  - The local merges, and the scratch commits my mutant tool and the lane's pin-identity tool made with git plumbing.
    They lived only in those clones.
  - My TMPDIRs `/tmp/r532d-0` to `/tmp/r532d-5`. Afterwards, `ls /tmp | grep -c r532d` gives `0`.
  - No process of mine survives: `pgrep -af 'rev-532d/clone'` matched 0 lines before deletion.
- **Never done.** Nothing was pushed. No PR was commented on or merged. No worktree under
  `/home/tze/GitHub/syzygy/.worktrees/` was edited. No body of an observed repository and no credential file was read.
- **Not kept,** as the brief says: the governance, quotations, typecheck and `npm ci` logs. Their result lines are quoted
  in 3.4. I did not fetch the PR body.
- **Kept.** 6 tools under `tools/` and 31 result files under `results/`, 37 files in all. None is over 300 KB:
  `find tools results -type f -size +300k` gives 0. Each tool and this raw were checked for U+00A0 with Python, and
  the count was 0 for each. Each kept file is listed with its sha256 below. This raw is not in the table.

| Path (relative to `rev-532d/`) | sha256 |
|---|---|
| `results/build-record-on-merge-81862261.log` | `2f73cc03c0349dc6b8e5ca9e4e72076035e80d83c709fcfc43174691a50e4810` |
| `results/build-record-on-merge-a403.log` | `2f73cc03c0349dc6b8e5ca9e4e72076035e80d83c709fcfc43174691a50e4810` |
| `results/build-record-on-merge-d621.log` | `331cc2b0dedf53ed840fb61b2767010a42cf73b3141c3b1cf171a785bc7db883` |
| `results/build-record-rebuild-23af2d08.log` | `331cc2b0dedf53ed840fb61b2767010a42cf73b3141c3b1cf171a785bc7db883` |
| `results/de-rows-r4-M13.json` | `4fd3dc17200140ceef5b4039c1eea35274b7444c65b0083c4ed1c28f3ea986b5` |
| `results/de-rows-r4-M13.log` | `8540e2372d6f539b661a6e4efa4ae325b6117f40cbefb6e62cba6f1a86a166e8` |
| `results/de-rows-r4-head.json` | `913e1da67f46f18cd38b6f3f67776acaaa477ad9f1fbfc0ed15fe434a7e8d01d` |
| `results/de-rows-r4-head.log` | `42f2fe5d7ce8a50f12827d0aa29cd2954995f4400dfacc02c1dfdaa3eacea6fa` |
| `results/full-suite-23af2d08.json` | `5f87190394908380d68d4ca56679beb23f88e5a2e4f5b624f962b3f0c1f1e030` |
| `results/full-suite-23af2d08.log` | `8d8657dac97c7f620407a0aa65648dc9e97dd3fc9f70b73749550be476cfe5d4` |
| `results/gh-pr-checks.txt` | `7c06de8f4791efce0f6790085f9c4bb10a01ac297d41d91026b5da964e6a2f61` |
| `results/identity-r4.json` | `a82751a8f31236a1aee56d51b841673f187a6f0f523410f713247f43819e8ae9` |
| `results/lane-build-record-mutants-r4.json` | `b010713571030f2954ae480542534906006cc0ad5242ff49b3dd9e72094cf81f` |
| `results/lane-build-record-mutants-r4.log` | `f44f923eaa09a12e599b7eefe3dd98e57c9f6d31749f875c4b7217de448a33ee` |
| `results/lane-pin-identity-mutants-r4.json` | `0096c6ae6022050355bc8f326d4e7089e6f83450689878c1e5cde87ddcf1152a` |
| `results/lane-pin-identity-mutants-r4.log` | `ffea5730b3c1d37e811f14dc943da0c60228be5f673ead7462bf26d331e11615` |
| `results/main-moved-paths-f7ea8584.txt` | `499840cd4882f9ffbbc06803a558b1f6d382a0f7051806e7737b2a1c5e66191e` |
| `results/main-moved-r4-81862261.json` | `226d1187a788b0b7aac0c6ac3776330d5968bf2fe59ddfd4fa3dd9b5854a66d4` |
| `results/main-moved-r4-a403b902.json` | `d73794cc634a526fce397ef519efb9581b3fbb5aa81be05508e4b7fc6da0e79b` |
| `results/main-moved-r4-f7ea8584.json` | `9f61bd493d2a90e3d14530f325729ca2221e60466471003881313fd43b89bd95` |
| `results/merge-vs-main-paths.txt` | `71d36141e9747e093f43313899863a4a45a3d897245c349714c567ce35573891` |
| `results/my-mutants-r4.json` | `7cdbc19633915b10f66d9b61410aa1fe07f931fd5a34b7b52d25a26b6c588a7c` |
| `results/my-mutants-r4.log` | `1b5c8ac3d90f79e28a3f85c49c552d76cdfd259c58d978861d164bc152e4fe98` |
| `results/pr-files-root-23af2d08.json` | `7b280d9ce85c17916c47ff5242018eb9ce547ddb6763d6cbdcb79d7fd1edc582` |
| `results/pr-files-root-merge-bc0414e1.json` | `dbd7f70c3d6d3f9ce55ecf692e26feaa1b9fb5feab83a192d1a0c6748d9f7125` |
| `results/pr-files-root-merge-f0f0feaa.json` | `f5265b165484b10f2e5d4ac89ec3f91f959743661e9035b75bfaf60978d942d2` |
| `results/pr-paths.txt` | `71d36141e9747e093f43313899863a4a45a3d897245c349714c567ce35573891` |
| `results/record-de-check-r4.json` | `b573bb55293987980ed57d0c2ffba5ccac9d41dc67d9476559c94474eaa4ea84` |
| `results/system-suite-23af2d08.json` | `470dfee6ee828154928b88ed30b594211761d0d2313f7a831409c3410e276427` |
| `results/system-suite-merge-bc0414e1.json` | `46a4b9c38ad2e5a118ed06d52694e51730c076cd08d9d3087ff8de846c374a1b` |
| `results/system-suite-merge-f0f0feaa.json` | `efbf38d4406d39c264eeeadeb5e2243d99c8ba4bd11982dee161d290d220dbe3` |
| `tools/de_rows_r4.py` | `c39cee6e5975f04074b648b2bc6fc7dee0f5b158d7448e613ac1bdcdd147e506` |
| `tools/identity_r4.py` | `114e1b09c743410e1f0300065fddd25a6de2a834b6b6ffa3f0efe50a6b4d0c3c` |
| `tools/main_moved_r4.py` | `ff60fc7be41b7a4584c97e90277c8a6129c50213a48bf787d9721dfb71ea45ad` |
| `tools/my_mutants_r4.py` | `3304168300415997c721c67224f820364cef3baa1359b5ee8c17d9ca26d051b1` |
| `tools/record_de_check_r4.py` | `0faa485480ddfa035e50eb57b9e47cfbff4cf0c6e00e9b843b6795a975e11d88` |
| `tools/suite_r4.py` | `de323a14ec41e7f913a15c735395019a709698ae06db3ba1330dd9130095e99b` |
