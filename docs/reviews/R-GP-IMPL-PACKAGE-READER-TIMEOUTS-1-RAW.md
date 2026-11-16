# R-GP-IMPL-PACKAGE-READER-TIMEOUTS-1 — CC-REV-1 implementation review of syzygy-bpyt.4.13, round 1
Verdict: REVISE
Reviewed commit: 3e563ec4
Subject: r1-review.diff sha256 051d1a16c794059c41c10cfe2a78499fd2a102e5f6671c582cd0c67c9ebaff94

Reviewer: fresh-context CC-REV-1 reviewer (rev-520), 2026-10-24. I did not author the change and did not change it. I fetched
no target repository content. All runs were in scratch clones under `rev-520/`, each suite under its own `/tmp/r520-*` TMPDIR.
The clones and TMPDIRs are deleted.

Why REVISE: one blocking finding (F1). With `--profile`, `scripts/measure_vitest_test_durations.py` can leave tracked files
instrumented. I reproduced this twice, once from an exception and once from SIGTERM. The brief's verdict rule makes "a script
that can leave the tree dirty" blocking. The test-file change itself is sound. It is byte-identical to the base apart from the
timeout arguments, the rule is applied exactly as stated to the whole population, and nothing outside the sixteen came near
the default in 16 runs. The six notes can go to dispositions and follow-up beads.

## 1. Subject identity checks

- [Observed] `sha256sum r1-review.diff` gives
  `051d1a16c794059c41c10cfe2a78499fd2a102e5f6671c582cd0c67c9ebaff94`, the digest the brief names.
- [Observed] In my clone, `git diff ce322e1a 3e563ec4` hashes to the same digest (`tools/rederived.diff`). The stat line is
  "12 files changed, 37908 insertions(+), 16 deletions(-)".
- [Observed] `gh pr view 520` gives head `3e563ec4ccabd0f2a40fa423c39b5efeb9fd5e4a`, state OPEN, MERGEABLE.
- [Observed] `git merge-base` of GitHub main `19c80e90` and `3e563ec4` is `ce322e1a65b784c6304d51b05fb347351912a926`.
- **#509 and #517 against the subject.**
  - [Observed] Main changed 210 paths between `ce322e1a` and `19c80e90`. None of the 12 subject paths is among them (`comm`
    of the two name lists in `tools/main-changed.txt` and `tools/subject-changed.txt`).
  - [Observed] In the consent package, main changed `README.md`, `package.json`, `src/consent-ports.ts`, `src/in-force.ts`
    (new), `src/live.ts` (new) and `src/package-reader.ts`.
  - [Observed] #509's `vitest.config.ts` change adds a `/live` alias and a `globalSetup` to the `@syzygy/three-surface-poc-app`
    project only. The consent project is untouched.
- **#517's move does not change what the slow tests exercise.**
  - [Observed] `tools/compare_in_force.py` extracts six declarations: `ref`, `Dead`, `effective`, `inForceRecords`,
    `NotInForce` and `notInForceRecords`. Each is byte-identical between `consent-ports.ts` at `ce322e1a` and `in-force.ts` at
    `19c80e90`, once a leading `export` is stripped.
  - [Observed] `package-reader.ts` now imports them from `./in-force.js`. `package-reader.test.ts` still imports
    `inForceRecords` from `./consent-ports.js`, which re-exports it. So both sides of the agreement test still run the one
    implementation.
  - [Observed] I merged `3e563ec4` with `19c80e90` into a local commit, `712d8caa`, which was never pushed. The merge had no
    conflicts. The test file and the testkit are unchanged by it.
  - [Observed] On that merged tree the file passed in 2 of 2 runs ("299 passed"), and `size_vitest_test_timeouts.py --check`
    printed "299 collected, 16 sized (10 from a lower bound), 0 problems" (`merge-sizing-check.json`, `check.holds: true`).
- **Evidence digests.**
  - [Observed] `timeout-sizing.json` lists each input's sha256, and each equals the committed file.
  - [Observed] Its `script.sha256` `c8a439a23a01d7c5cfdc7463dfa6aef2417b351d1357e57c052f8bea4414e7d2` is the committed sizing
    script.
  - [Observed] All six duration records name script sha256
    `0ef82cd0563f4e09646a51234a33a835ec3f676150456d35a84835b08c128290`, which is the committed measurement script.
  - [Observed] The test file is `ea6aa505e8bd77004c4a5910dbe27a58588c668d370f7978660ba1d738b8b3c8` at the base and
    `ff2e1d5622da2e4598b7d7a5592d980ee7e2e0b2fc13854c6486e82aab332cd9` at the head. The testkit is
    `3576a99df9c6da7cec515632b362f237d59028069d5f239e983bc337b31e6fc3` at both.
- **The sizing record's subject commit.**
  - [Observed] The record names `9e748e68`, not the reviewed head. Between `9e748e68` and `3e563ec4` only four evidence files
    change.
  - [Observed] My `--check` run at `3e563ec4` (`mut-M0.json`) reproduces the committed record's `tests`, `denominator` and
    `inputs` exactly.
- **The load-127 extract.**
  - [Observed] Its source, `scratchpad/lane-b/suite821.json`, is still present at the declared sha256
    `c383659e032f3bf9e832684cde946b1d6a781ab53249d8adc293392c53467e22` and 756,210 bytes.
  - [Observed] The extract's `package-reader.test.ts` suite entry is deep-equal to the source's. `startTime`,
    `numTotalTests` and `numFailedTests` are equal too (`check-extract.txt`).
  - [Observed] It holds 299 tests with 299 distinct full names. 10 are `failed`, and each failure stack begins
    "Error: STACK_TRACE_ERROR".
  - [Inferred] That stack head is what a timeout leaves in vitest 3.2.7. `makeTimeoutError` copies the stack of the test's
    `STACK_TRACE_ERROR` (`@vitest/runner/dist/chunk-hooks.js:2005-2011`), so the ten are timeouts, as the PR says.
- **The load-127 commit `8b143272` against the base.**
  - [Observed] `package-reader.test.ts` is identical at both commits.
  - [Observed] Under `scripts/`, only two `.mjs` files differ (`differential_line_slot.mjs` and
    `measure_label_row_reads.mjs`). The testkit runs neither: it names only `.py` recorders.
  - [Observed] Under the consent `src`, only `recorder-template.ts` (+51/−3, the 8.21 linear label-row read) and its test
    differ. PR #514 is still OPEN.
  - [Observed] Side by side at load1 13–16, 3 runs each with `--testTimeout=600000` (`ab-summary.txt`):

    | Commit | File test time (ms) | Agreement test (ms) |
    |---|---|---|
    | `ce322e1a` | 5,799 / 6,283 / 6,352 | 1,900 / 2,157 / 2,298 |
    | `8b143272` | 5,902 / 5,867 / 6,241 | 2,153 / 2,012 / 2,167 |

    No material difference, so using the load-127 run at `8b143272` does not bias the sizing.

## 2. Clauses relied on, and the class ruling

- **CC-REV-1** (`.syzygy/governance/policies/craft-and-care/review-and-documentation.md:18-20`): "Changes touching any of
  seven classes require review by an independent, fresh-context reviewer, and the agent performing the change never finally
  decides which classes it touches."
  - Line 37: "4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
  - Line 49: "**The change record states** which classes the change touches, or "none,""
  - The PR states "None claimed … The reviewer rules."
- **GP-Q0, Part 1** (`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md:52-55`):
  ""Behavior-preserving" means none of the following changes: a rendered byte, a wire format, a refusal string or an exit
  code; a signed or digest-bound artifact; a consent, security or retention decision."
- **AGENTS.md at `3e563ec4`**:
  - Rule 4: "Read a check's output, not its exit code, and check its denominator against the whole population."
  - Rule 6: "Mutate the input and confirm the check fails, per predicate, before trusting it".
  - Rule 9: "A claim of absence needs a sweep with a denominator."
  - Rule 11: "An evidence record names its subject and the subject's digest; a record that names neither cannot be
    re-checked against the bytes it describes."
- **Test-rigor bar 6** (`th-engineering/subskills/test-rigor/SKILL.md:79-82`): "**Deterministic or quarantined** — A test that
  fails intermittently is worse than no test: it trains people to ignore red. Fix the nondeterminism (time, ordering, shared
  state) or delete the test; never retry-until-green."
- **Suite discipline** (`references/suite-discipline.md`):
  - Lines 37-39: "a scoped run must mean the same as the full run — no order dependence, no shared mutable state across
    tests."
  - Lines 44-46: "Make runtime budgets contract tests: a test that fails when the unit tier exceeds its budget gives suite
    latency an owner instead of a slow boil."

**Class ruling: none.**
- [Observed] The diff changes only the timeout argument of 16 tests and adds a comment (§5). The assertions are
  byte-identical, so it changes no authority boundary, identity, observation, public interface or certificate logic.
- The file tests the egress consent reader, so class 4 is adjacent. I rule it untouched: the change alters only when vitest
  declares a test timed out, never what a test asserts or what the reader admits or refuses.
- The two new scripts are evidence tools. No battery step, CI workflow or package entry point reaches them. [Observed]
  `git grep -n -F` for either script name in `PROJECT-STATUS.md` and `.github` returns nothing.
- GP-Q0: no listed output changes (§5).

## 3. What I ran, and the results

Load for the whole session ran from load1 12.46 to 35.55 on 12 cores. That is lighter than the implementer's 28–57, and far
below the 127.56 the rule draws on.

**Byte identity (`tools/check_identity.py`, output in `check-identity.txt`).**
- [Observed] Method 1 reverses the change: drop the 4-line comment and the blank line after it, and turn each `}, N_000);`
  back into `});`. The result equals the base file: "METHOD 1 reversed head == base bytes: True". The base has 0 lines of the
  form `}, N_000);` and the head has 16.
- [Observed] Method 2 is difflib over the two line lists. It finds "17 {'comment-insert': 1, 'closer-replace': 16} other: 0".
- [Observed] Method 3 walks each closer up to its opener at the same indentation. All 16 openers are `it(`, none is
  `describe`, a hook or `it.each`. The describe paths are parsed from source.
- So no assertion, fixture, hook, `describe` or test name moves.

**Re-derivation of the sixteen without the sizing script (`tools/rederive.py`, output in `rederive.txt`).**
- [Observed] The denominator is the fullNames from my 6 head runs: 299 tests, 299 distinct.
- [Observed] Every run in `before-alone`, `before-full-1` and `before-full-2`, and the extract, holds the same 299 names:
  "same set as mine: True" for each of the 8 sources. No name is observed outside the denominator, and none is unobserved.
- [Observed] The rule gives "expected sized: 16 lower bounds: 10 from load-127: 16". It matches the source exactly:
  "expected == source (names and timeouts): True".
- [Observed] The committed `timeout-sizing.json` rows agree with mine on timeout, worst case and lower-bound flag for all
  299 tests. The largest unsized worst case is 530 ms.
- [Observed] Duplicate or parametrized names cannot be mismatched.
  - `collect()` exits when two collected names are equal. Mutant R2 below shows this.
  - All 16 sized tests are plain `it`.
  - The only cross-commit input, the load-127 extract, ran at a commit whose test file is byte-identical to the base.
  - [Inferred] vitest's JSON `fullName` and the collect reporter both join the describe path with spaces
    (`vitest/dist/chunks/index.VByaPkjc.js:1727`). Two names that collide under that join would collide in one tree and make
    `collect()` exit, so they cannot mismatch silently.
- [Observed] The lower-bound handling matches the PR. A test with `status != 'passed'` in the extract is marked
  `lowerBound`, and its recorded duration is still the worst case.
  - [Inferred] Treating that duration as a lower bound is correct either way. vitest's `withTimeout` rejects when its timer
    fires, or, if a synchronous block kept the timer from firing, at completion once `now() - startTime >= timeout`
    (`chunk-hooks.js:1865-1886`). In both cases the true duration is at least the recorded one.

**The sizing check and its mutants (`tools/mutants.py`, output in `sizing-mutants.json` and `sizing-mutants.txt`, run at
`3e563ec4`).**

| Id | Mutant | Exit | Expected | Output (verbatim) |
|---|---|---|---|---|
| M0 | unmutated | 0 | 0 | "299 collected, 16 sized (10 from a lower bound), 0 problems" |
| M1 | agreement `50_000` → `45_000` | 1 | 1 | "problem: carries 45000 ms, the rule gives 50000 ms: the policy port …" |
| M3 | `15_000` on an unsized test | 1 | 1 | "problem: carries 15000 ms, the rule gives 5000 ms: package admission reader refuses when the decisions directory cannot be listed" |
| M4 | a measured test renamed | 1 | 1 | "problem: observed but not collected: …" and "problem: collected but measured in no --record: …, renamed" |
| M5 | unsized test at 2,501 ms in a record copy | 1 | 1 | "299 collected, 17 sized …", "problem: carries 5000 ms, the rule gives 10000 ms: …" |
| M6 | the same test at exactly 2,500 ms | 0 | 0 | "299 collected, 16 sized (10 from a lower bound), 0 problems" |
| R1 (mine) | agreement `50_000` → `55_000`, the direction that hides a hang | 1 | 1 | "problem: carries 55000 ms, the rule gives 50000 ms: …" |
| R2 (mine) | a second `it` with an existing test's name | 1 | 1 | "two collected tests share a name; durations cannot be told apart" |
| R3 (mine) | a new test no record measured | 1 | 1 | "300 collected, …", "problem: collected but measured in no --record: package admission reader a new test no record measured" |
| R4a (mine) | agreement worst 16,666.4 ms in an extract copy (×3 = 49,998) | 0 | 0 | "… 0 problems" |
| R4b (mine) | agreement worst 16,667 ms (×3 = 50,001, rounds to 55,000) | 1 | 1 | "problem: carries 50000 ms, the rule gives 55000 ms: …" |
| R5 (mine) | consent project `testTimeout: 60_000` in `vitest.config.ts` | **0** | 1 | "299 collected, 16 sized (10 from a lower bound), 0 problems" (**survives**, N1) |

- 11 of 12 mutants behaved as expected, and the tree was clean after each.
- M1, M3, M4, M5 and M6 reproduce the implementer's results and outputs.
- R4a and R4b pin the rounding at the 50 s step.

**The measurement script (`tools/signal_probe.py` and a direct run, at `3e563ec4`).**

| Probe | Script exit | Tree after exit | `git status` lines after | Descendants alive 3 s after exit |
|---|---|---|---|---|
| D1: `--profile --file packages/polaris-generation-consent/src/recorder-template.test.ts` | 1, "the instrumentation anchor occurs 0 times" | **dirty** | " M packages/polaris-generation-consent/src/recorder-fixtures.testkit.ts" | n/a (failed before vitest) |
| SIGTERM to the script's PID mid-run | −15 | **dirty** | both the testkit and the test file "M" | **10** (npm exec, vitest and 6 workers, esbuild) |
| SIGINT to the script's PID mid-run | −2 | clean (the `finally` restored) | none | **9** |
| SIGINT to the process group mid-run | −2 | clean | none | 0 |

- I saved the D1 diff as `measure-dirty-D1.diff`, sha256
  `625c1eee4c810b835b09742a812147cd3edc7b51f665aeb7fb11fd376be41022`.
- I killed every surviving process by PID, taken from the probe's own `/proc` ppid walk. Then I restored the tree with git.
- [Observed] The records name the commit (`git rev-parse HEAD`), the test file's and the testkit's sha256 (HEAD bytes), and the
  script's own sha256. Under `--profile` they also name the instrumentation's `old` and `new` fragments. That satisfies
  rule 11.
- [Observed] Beyond `--out`, the script writes a vitest report into a `tempfile.TemporaryDirectory` under TMPDIR, which it
  removes. vitest and the tests write their own caches and fixtures, which are outside the script's control. After all my
  probes, `git status --porcelain` in the clone showed nothing, untracked files included.

**Runs of the file (`tools/run_file.py`, with vitest's configured timeouts unless noted; output in `runs/` and
`runs-summary.txt`).**

| Run | Commit | Config | load1 start→end (min–max) | Exit | Not passed | Agreement (ms) | Next two slowest (ms) |
|---|---|---|---|---|---|---|---|
| head#1 | `3e563ec4` | default | 22.47→23.45 (22.47–23.84) | 0 | 0 | 3,131 | 847 strict act reads > policy chain; 543 RFC5-14 class amendment |
| head#2 | `3e563ec4` | default | 23.45→22.15 (22.68–23.45) | 0 | 0 | 2,746 | 441 strict act reads; 345 egress v2 is read from |
| head#3 | `3e563ec4` | default | 22.15→23.07 (21.25–23.07) | 0 | 0 | 2,825 | 516 strict act reads; 491 RFC5-14 |
| head#4 | `3e563ec4` | default | 23.07→21.67 (21.67–23.07) | 0 | 0 | 2,245 | 480 RFC5-14; 415 strict act reads |
| head#5 | `3e563ec4` | default | 21.67→23.23 (21.67–23.3) | 0 | 0 | 2,723 | 435 strict act reads; 336 egress v2 is read from |
| head#6 | `3e563ec4` | default | 23.23→21.8 (22.57–23.23) | 0 | 0 | 2,348 | 391 strict act reads; 356 RFC5-14 |
| headfull#1 | `3e563ec4` | full `npx vitest run`, default | 12.46→35.46 (12.46–35.55) | 0 | 0 | 3,003 | 742 RFC5-14; 646 strict act reads |
| base#1 | `ce322e1a` | default, alone | 17.54→16.14 (16.14–17.54) | 0 | 0 | 2,620 | 331 strict act reads; 321 egress v2 is read from |
| merge#1 | `712d8caa` | default | 12.5→12.79 | 0 | 0 | 2,537 | 377; 311 |
| merge#2 | `712d8caa` | default | 12.79→12.46 | 0 | 0 | 2,613 | 507; 484 |
| abbase1–3 | `ce322e1a` | `--testTimeout=600000` | 16.14→12.95 | 0 | 0 | 1,900 / 2,157 / 2,298 | ≤ 383 |
| ab821x1–3 | `8b143272` | `--testTimeout=600000` | 15.2→12.5 | 0 | 0 | 2,153 / 2,012 / 2,167 | ≤ 388 |

- [Observed] The full suite at the head (`headfull#1`): "numTotalTests 5113, numPassedTests 5108, numFailedTests 0,
  numPendingTests 5".
- [Observed] **No test outside the sixteen came within 2× of the 5 s default.** Over all 16 runs, 4,784 test results, the
  largest duration of any test outside the sixteen is 202 ms.
- [Observed] **No sized timeout is below a duration I measured.** My worst against each timeout:

  | Tests | Timeout / my worst |
  |---|---|
  | the agreement test | 50 s against 3,131 ms, 16.0× |
  | spawn-bound, smallest ratio | 15 s against 326 ms, 46.0× |
  | spawn-bound, largest ratio | 45 s against 294 ms, 153.1× |

- [Observed] Each TMPDIR held only `node-compile-cache` after a single-file run. After the full run it also held four
  `.com.google.Chrome.*` directories from browser suites outside this change. All were deleted.
- [Observed] Two extra probes, each with scratch instrumentation, restored afterwards:
  - With `-t` selecting "egress version 2 record binds the exact bytes: an edited record is not in force" alone, that test
    took 1,511 ms. In-file it takes 5, 4, 35, 4, 5 and 4 ms over head#1–6 (N4).
  - A print in the agreement test showed "R520WORLDS 118 88": 118 collected worlds, 88 distinct, as the PR states (N2).

**Profile claims.**
- [Observed] Re-summed from `before-profile.json`: "profile rows 299 sum totalMs 16360 sum spawnMs 6963 spawns 28".
- [Observed] The agreement test took 5,245 ms with 0 spawns. Each of the other 15 sized tests has 1–4 spawns, carrying
  85–99% of its time.

**Other retained evidence (`tools/sweep_other_evidence.py`, output in `sweep-other-evidence.txt`).**
- [Observed] I swept every tracked JSON under `docs/evidence` outside `syzygy-bpyt-4-13`: 496 files.
- The predicate: any object with a string equal to a package-reader test's full name, or to its `<describe> > <title>`
  form, and a numeric key matching `/(^duration$|ms$)/i` above 2,500.
- [Observed] One hit, a sized test: `recorder-testkit-sync-render-timing-2026-10-21.json` `summedMs` 4430 for "strict act
  reads > policy chain …" (timeout 40 s). No retained JSON shows an unsized test of this file above 2.5 s.
- [Unknown] Markdown sources were not swept. Bead comment 3 cites "two egress version 2 record tests" at 5,789 and 5,207 ms
  without naming them.

**Gates at `3e563ec4`.**
- [Observed] `npm run typecheck`: exit 0.
- [Observed] `python3 scripts/check_governance.py`: exit 0, "32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not
  asserted".
- [Observed] `python3 scripts/check_quotations.py`: exit 0, "35 quotations examined in 16 of 935 .md files scanned … 0
  findings".
- I did not run the PROJECT-STATUS battery. The lane reports "commands=110 nonzero=0".

**The "after" records.**
- [Observed] `after-alone.json` and `after-full.json` were taken with `--testTimeout=600000`. Their "0 failed" therefore never
  exercised the 5 s default on the 283 unsized tests.
- My 9 default-config runs at the head and the merged tree, and one full suite, cover that gap: 0 failures.

## 4. Findings

### F1 — `measure_vitest_test_durations.py --profile` can leave tracked files instrumented (blocking)

**Severity:** medium. This is evidence tooling, not product, but the brief's verdict rule names it blocking.

**Evidence:**
- [Observed] `instrument()` writes the testkit before it checks the test file's anchor. The call
  (`scripts/measure_vitest_test_durations.py:62`) sits before the `try:` at line 64, so the restore in `finally` (lines 66-68)
  never covers it.
- [Observed] D1 shows the exception path. `--profile` with any `--file` whose vitest import line is not
  `import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';` exits 1 and leaves the testkit modified
  (`measure-dirty-D1.diff`). The script takes `--file` as a parameter and describes itself as measuring "one vitest file".
  The same happens if package-reader.test.ts's import line ever changes.
- [Observed] SIGTERM, for example from `timeout`, a job runner or a harness stopping a background task, runs no `finally`.
  Both files stay instrumented, and the npm/vitest subtree, 10 processes, keeps running the instrumented suite with no parent.
- [Observed] SIGINT to the script alone restores the tree but orphans 9 descendants. `subprocess.run` kills only `npm exec`.
- [Observed] The docstring's claim at line 15, "It writes only OUT.json, and the two instrumented files while a profiled run
  is in progress", is false in the dirty cases. So is the PR's "restoring both from git".

**Failure scenario:** someone profiles another file, or stops a long profiled run. The testkit's `spawnSync` wrapper and the
test file's `PROF` hooks stay in the worktree.
- The next measurement refuses with "tracked files not clean". That fails closed for this script.
- A `git commit -a`, or a lane committing "all changes", ships instrumentation into a test helper that 46 call sites use.
- The orphaned vitest keeps loading a host that other lanes are timing.

**Proposed fix:**
1. In `instrument()`, read both files and check both anchors before writing either.
2. Call `instrument()` inside the `try`, and restore only what was written.
3. At start, map SIGTERM and SIGHUP to `SystemExit`, for example
   `signal.signal(signal.SIGTERM, lambda s, f: sys.exit(128 + s))`, so `finally` runs.
4. Start vitest with `Popen(..., start_new_session=True)`, and in `finally` send `os.killpg(proc.pid, SIGTERM)`, then SIGKILL
   after a grace period.
5. Record a rule-6 run of the restore paths: D1 and a SIGTERM probe, each requiring an empty `git status --porcelain` and no
   surviving descendant.
6. Correct the docstring and the PR's "Changed outputs" sentence.

A simpler alternative avoids editing tracked files at all: run the profiled measurement in a throwaway `git worktree`, or
inject the wrapper through a temporary `--setupFiles` module.

The six duration records will keep naming script sha256 `0ef82cd0…` after the fix. That is correct under rule 11, since it
is the script that produced them, but the PR should say so.

### N1 — `--check` does not pin the default it measures against (mutant R5 survives)

**Severity:** low.

**Evidence:**
- [Observed] `size_vitest_test_timeouts.py:95` takes `default` as the most common collected timeout. Line 104 compares each
  unsized test with that value.
- [Observed] R5 adds `testTimeout: 60_000` to the consent project in `vitest.config.ts`. `--check` still prints "0 problems"
  and exits 0.

**Failure scenario:**
- The bead says "Do not raise the global default", and `RULE` says "exceeds 2500 ms (half the 5000 ms default)".
- A later config change raises the default, and the check stays green. The threshold's premise silently stops holding, and
  the unsized tests' 2× headroom claim with it.

**Proposed fix:** fail when `default != 2 * THRESHOLD_MS`, or derive the threshold from the collected default and record both.
Add R5 to `sizing-check-mutants.json`.

### N2 — The new ceilings let a 10× slowdown through at ordinary load, and nothing owns the agreement sweep's cost

**Severity:** low for this PR. It needs a new bead.

**Evidence, against my worst at the head (load1 ≤ 35.55):**

| Test | Timeout | My worst | 10× that | Inside the timeout? | Under the old 5 s default |
|---|---|---|---|---|---|
| "egress version 2 record > is read from the recorder's act…" | 40 s | 501 ms | 5,010 ms | yes | would fail |
| "…refuses when version 2 did not take effect strictly after version 1…" | 45 s | 484 ms | 4,840 ms | yes | would pass |
| "the policy port and the strict policy chain agree > on every world…" | 50 s | 3,131 ms | 31,310 ms | yes | would fail |

- So all three ceilings mask a 10× regression at this load.
- They are still reasonable *hang* ceilings: a promise that never settles still fails at 40–50 s.
- [Inferred] A hang inside a recorder spawn was never catchable. The testkit's `spawnSync` calls pass no `timeout`
  (`recorder-fixtures.testkit.ts:19,44,57,72,86,99,110,142`), and vitest's timer cannot fire while a synchronous spawn blocks
  the event loop.
- [Observed] The agreement test is compute-bound: 0 spawns (`before-profile.json`). Its cost is reads of 118 worlds (88
  distinct) × 8 instants, through both the port and the chain.
- [Observed] Those worlds are collected from every policy-world read earlier in the file, so the cost grows with each such
  test added.
- [Observed] No bead owns this cost. I swept 806 beads (`bd list --all --json --limit 0`):
  - `stemFolds|findActRecords|namesAct` matches 4 beads (1.12, 8.4, 8.22, 8.29), none about cost.
  - `strict policy chain agree` matches only syzygy-bpyt.4.8.
  - 4.8's description puts this test's timeout down to synchronous python3 renders, which the profile contradicts.

**Failure scenario:** a reader change makes the withdrawal sweep 10× slower, or the file gains policy-world tests. CI and this
host stay green under 50 s until the suite is materially slower.

**Proposed fix:**
- File a bead for the agreement sweep's cost, separate from 4.8. The suite-discipline rule's runtime budgets fit here:
  1. Deduplicate worlds by content before the sweep (118 → 88).
  2. Add a deterministic budget, in syzygy-bpyt.4.5's style: an injected count of reader calls or sweep iterations per world,
     or a bound on distinct worlds, instead of wall time.
  3. Then size this one timeout down from the new cost.
- Correct 4.8's description so it does not claim this test.

### N3 — The ×3 margin on the ten lower bounds is unverified at the envelope it is sized for

**Severity:** low. The PR discloses it as a residual.

**Evidence:**
- [Observed] Spawn-bound tests degrade far faster with load than the compute-bound one. Load-127 lower bound against the
  worst outside load-127:

  | Test | Load-127 lower bound | Worst outside load-127 | Ratio |
  |---|---|---|---|
  | the agreement test | 16,465 ms | 6,890 ms | 2.4× (load ratio about 2.2) |
  | "returns a record only…" | 14,149 ms | 934 ms | 15× |
  | "counts the version 2 act…" | 14,198 ms | 916 ms | 15.5× |
  | "refuses when version 2…" | 13,826 ms | 1,190 ms | 11.6× |

- [Unknown] The true load-127 durations of the ten.
- I did not induce load to approach 127, because two other reviewers share this host. My runs never exceeded load1 35.55.

**Failure scenario:** at or above the lane-B envelope, with the consent and dossier projects spawning together, a spawn-bound
test's true duration exceeds 3× its lower bound and times out again.

**Proposed fix:** name the PR's own residual as a step on a bead: one `--testTimeout=600000` run at load1 ≥ 100 to replace the
ten lower bounds. Or state the envelope in the test-file comment, for example "sized for load1 up to about 127 on 12 cores".

### N4 — The sized timeouts hold only for the whole file run in order

**Severity:** low. The cause predates this PR, and the sizing inherits it.

**Evidence:**
- [Observed] "egress version 2 record binds the exact bytes: an edited record is not in force" is unsized. It takes 4–35 ms
  in-file over head#1–6, but 1,511 ms when run alone with `-t` (`runs/filtered-binds.report.json`).
- The sized tests are slow because each is "the first test to need some render", which is the PR's own wording. The renders
  are cached per process, so a filtered or shuffled run moves the cost to whichever test needs them first.
- [Observed] The agreement test cannot run filtered at all: "Tests 1 failed | 298 skipped (299)". Its world set is collected
  by the tests above it, by design.

**Failure scenario:** [Inferred] under the load where the first renderers took ≥ 11.8 s, a `-t` run or a
`--sequence.shuffle` run times an unsized test out at 5 s. This is the "scoped run must mean the same as the full run" rule.

**Proposed fix:** add one sentence to the test-file comment saying the timeouts are sized for the whole file in order, and that
a filtered run moves the render cost. Let syzygy-bpyt.4.8 option (b), batch-rendering in `beforeAll`/`globalSetup`, remove the
cause.

### N5 — The PR body's dangling "follow-up below"

**Severity:** editorial.

**Evidence:** [Observed] the residuals say "The spawn-bound timeouts could come down after the follow-up below", and no
follow-up follows.

**Proposed fix:** name **syzygy-bpyt.4.8**, "Render the recorder testkit's act fixtures without blocking the vitest worker"
(open). Say that it covers only the fifteen spawn-bound tests, and point the agreement test at the N2 bead.

### N6 — Closing 4.13 on this PR would drop the scope its comments added

**Severity:** low. This is tracking, not the bytes.

**Evidence:**
- [Observed] Five coordinator comments of 2026-10-22 widened 4.13 beyond this file:
  - 5 s timeouts in start-gates, gate-acts (7), screen (4), close (3), execution-flags (2) and run-evidence (1);
  - the explicit bounds of gate-acts' "follow the tree in either state" (60 s) and git-object-reader's "reviewer's
    amplification shape" (30 s);
  - the act-families 10 s hook.
- The coordinator's ruling limits this PR to `package-reader.test.ts`.
- [Observed] Carriers exist for some of it:
  - start-gates → syzygy-y3uc (open);
  - act-families hook → 4.8, per its comment of 2026-10-22;
  - the git-object-reader wall-clock bound → 4.5, which lists `git-object-reader.test.ts:581` "(<30 s)".
- [Observed] No bead carries the rest: the gate-acts, screen, close, execution-flags and run-evidence timeouts, and gate-acts'
  60 s bound. In the 806-bead sweep, `close\.test` and `execution-flags` match 0 beads. `screen\.test` matches only 4.3,
  about tiering. `gate-acts\.test` matches s6xo, 1.5, kgv5 and 3.2, and none of those mentions a timeout. `run-evidence\.test`
  matches only 5.1, about moving tools.
- The sweep covers bead fields, not comments.

**Proposed fix:** before 4.13 closes, file one bead for the dossier-project load timeouts listed in 4.13's comments, or keep
4.13 open and re-scoped.

## 5. Every changed output, or the evidence that there is none

- **Product code.** [Observed] The subject changes no file under `apps/**` or `packages/**` outside
  `package-reader.test.ts`. It does not touch `vitest.config.ts`, the testkit, any `package.json`, `.syzygy/**` or
  `openspec/**`.
- **GP-Q0's list.**
  - No rendered byte, wire format, refusal string or exit code of any product changes.
  - No signed or digest-bound artifact changes. [Observed] No manifest under `.syzygy/` or `openspec/`, and no `*MANIFEST*`
    file, cites the test file's path.
  - [Observed] The base digest `ea6aa505…` is cited only by four earlier evidence records:
    `consent-gate-recognition-models-mutants-consent-2026-10-21.json`, `…-mutants-dossier-2026-10-21.json`,
    `decisions-sweep-mutants-2026-10-22.json` and `decisions-sweep-mutants-void-high-load-2026-10-22.json`. Under rule 10 they
    now confirm history, and no act binds them.
  - No consent, security or retention decision changes.
- **What a gate accepts or refuses.** No product gate changes. The vitest gate's verdict changes as intended: 16 tests now
  fail at 10–50 s instead of 5 s. The assertions are byte-identical, so the gate passes and refuses the same behaviour.
- **New scripts.** Two evidence tools that nothing in the battery, CI or packages reaches. Their only effect on the tree is
  F1's.
- **Evidence.** Nine JSON files under `docs/evidence/syzygy-bpyt-4-13/`. `check_governance` and `check_quotations` stay clean.

## 6. Verdict per acceptance criterion

The bead has no `acceptance_criteria` field (`null`). I judge against its description and the coordinator's rulings in the
brief.

| Criterion | Verdict | Basis |
|---|---|---|
| Profile the three named tests | Met | `before-profile.json` re-summed (§3). The agreement test is compute-bound, and the other two are spawn-bound. |
| Give each an explicit timeout sized from a measured worst case under load, or lighten their fixtures | Met | 40 s, 45 s and 50 s, plus 13 more, from the stated rule |
| Do not raise the global default | Met | `vitest.config.ts` is not in the subject. N1: `--check` does not guard it. |
| Re-locate by test name | Met | Matched by full name, 299/299 |
| Ruling: the testkit stays unchanged | Met | Testkit sha256 `3576a99d…` at base and head |
| Ruling: size every test in the file whose measured worst case exceeds 2.5 s, stating the rule and its denominator | Met | Independent re-derivation agrees, 16 of 299. No unsized test above 202 ms in my 16 runs or above 530 ms in the records. |
| Ruling: each timeout is a stated margin × the measured worst case | Met | ×3, rounded up to 5 s. R4a and R4b pin the rounding. |
| Ruling: commit the measuring script | Met, with F1 | The script is committed and records its own digest, but can leave the tree dirty |
| Ruling: no assertion changes | Met | Byte identity by two methods |
| `Tests: +a ~b -c` reported | Met | "+0 ~16 -0" is correct |
| Scope the bead's comments added (other files) | Not met by this PR, out of the ruled scope | N6 |

## 7. Test quality (test-rigor bar)

- **What the tests catch is unchanged.** Every assertion is byte-identical, so each test still fails on the defects it caught
  before.
- **Bar 6, determinism.**
  - The change does not retry until green. It moves a wall-clock failure threshold beyond the measured load envelope. That
    is an acceptable interim against a load-sensitive timeout, and the bead offered it as one of two fixes.
  - It leaves two sources of nondeterminism in place. Outside the envelope, the ten lower-bound tests can still time out (N3).
    The cost of a slow test depends on file order through the shared render cache (N4).
  - The root fixes are syzygy-bpyt.4.8 for the renders and the N2 bead for the sweep.
- **Runtime budgets.** Suite discipline wants runtime budgets as contract tests. A 50 s ceiling on a compute-bound sweep is
  the opposite: latency goes unowned and boils slowly (N2). A count-based budget, as in 4.5, would give it an owner.
- **The comment is accurate and useful.** It states the rule, where the time goes, and the record and check that confirm
  each timeout. The "one-line reason" that 4.5 asks for hand-tuned timeouts is there. It omits only the order dependence (N4).
- **The sizing check is a real check.** It has a stated denominator, fails closed on duplicate names, unmeasured tests and
  stale observations, and its rule-6 mutants are recorded with fragments and commit. The one gap is N1.
- **The measurement script** records what rule 11 needs. Its restore discipline is F1.

## 8. Cleanup

- **Deleted:** the five scratch clones (`clone`, `clone-base`, `clone-821`, `clone-merge`, `clone-mut`) and every
  `/tmp/r520-*` TMPDIR. [Observed] `ls -d /tmp/r520-*` returns nothing.
- **Processes:** every orphan the signal probes created was killed by PID from its own process tree, never by name or
  pattern.
- **Nothing pushed or commented.** The local merge commit `712d8caa` existed only in a deleted clone.
- **Kept**, all under `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-520/`.
  `KEPT-FILES.sha256`, sha256 `d474b0abb116d2772064266255cd4953964cd5fc8d9c75c34e548badcd5a91d4`, lists all 68 kept files
  with their digests, every file except this raw and itself.
  - **Tools** (`tools/`): `check_identity.py`, `rederive.py`, `mutants.py`, `signal_probe.py`, `run_file.py`, `batch1.sh`,
    `summarize_runs.py`, `compare_in_force.py`, `check_extract.py`, `record_heads.py` and `sweep_other_evidence.py`.
  - **Tool inputs and logs** (`tools/`): `rederived.diff`, `main-changed.txt`, `subject-changed.txt`, `record-heads.txt` and
    the `npm-ci*.log` files.
  - **Results** (`rev-520/`): `check-identity.txt`, `source-placement.json`, `rederive.txt`, `mut-M0.json`,
    `sizing-mutants.json`, `sizing-mutants.txt`, `measure-dirty-D1.diff`, `signal-term-pid.json`, `signal-int-pid.json`,
    `signal-int-group.json`, `merge-sizing-check.json`, `compare-in-force.txt`, `check-extract.txt`, `ab-summary.txt`,
    `runs-summary.txt`, `sweep-other-evidence.txt`, `typecheck.log`, `check-governance.log` and `check-quotations.log`.
  - **Runs** (`runs/`): `head.log`, `batch1.log`, the summary JSON for each label (head, base, merge, headfull, abbase1–3,
    ab821x1–3), each run's raw vitest report `*-<n>.report.json`, and `filtered-binds.report.json`.
