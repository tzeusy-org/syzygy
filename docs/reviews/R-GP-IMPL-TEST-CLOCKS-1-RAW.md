# R-GP-IMPL-TEST-CLOCKS-1 — CC-REV-1 implementation review of syzygy-bpyt.4.5, round 1
Verdict: REVISE
Reviewed commit: 447d9f08
Subject: r1-review.diff sha256 e2e69768a05e8461b8d52cde590308753c0a73e668677037ffc4a5ca32765fae

Reviewer: rev-532, fresh context, default model. No target repository content was fetched; every run used Syzygy's own
fixtures in scratch clones of the Syzygy repository at the reviewed commit. Reviewer tools and result files are listed with
their digests in section 8. "Lane" below means the implementer of PR #532.

One blocking finding (F1): the kept daemon-entry text row checks a window that is wider than the two branches it names, and
the load-hook row runs only the default configuration, so three daemon-path loads of the POC app that the old text pin
failed now pass every test. Seven notes (N1–N7).

## 1. Subject identity checks

- [Observed] `sha256sum lead/b45/r1-review.diff` printed
  `e2e69768a05e8461b8d52cde590308753c0a73e668677037ffc4a5ca32765fae  lead/b45/r1-review.diff`, and in a fresh clone
  `git diff 8ff50172 447d9f08 | sha256sum` printed `e2e69768a05e8461b8d52cde590308753c0a73e668677037ffc4a5ca32765fae  -`.
  Both match the brief. `git diff --stat` ends `32 files changed, 24282 insertions(+), 56 deletions(-)`.
- [Observed] At the start of the review, `git ls-remote origin` gave `447d9f083fb120c14ddd8da646c03675f3ce7bc7 refs/heads/agent/syzygy-bpyt.4.5`
  and `8ff50172b127cba676ff32ce62c12c91b2b0d924 refs/heads/main`. `git merge-base 8ff50172 447d9f08` is `8ff50172…`.
  The branch forked at `c104771f`, an ancestor of `8ff50172`. Its one merge commit `a624b6ca` has parents `47aeacae 8ff50172`.
- [Observed] There are 32 changed paths: 9 test files and 23 files under `docs/evidence/syzygy-bpyt-4-5/`. None is under
  `.syzygy/` or `openspec/` (count 0). The changed paths outside the evidence directory are exactly the 9 test files.
- [Observed] `build_record.py`, re-run at 447d9f08 (`python3 -I docs/evidence/syzygy-bpyt-4-5/tools/build_record.py . c104771f 8ff50172 3fc3709f`),
  leaves the tree clean. So the committed `bounds-and-pins.json` is byte-identical to a rebuild from the retained results.
- [Observed] My own record check (`tools/record_check_rev.py`) reads every evidence file from git objects at 447d9f08. It
  printed 319 `OK` lines, 4 `FAIL` lines and 5 `INFO` lines (one per full-suite attempt summary); its last line was
  `TOTAL FAIL 4`. The four:
  - `FAIL cpu-separation.json: cases digest at HEAD`. The digest it records is that of `tools/mutant-cases.json` as of
    `0a6645ae` (also the copy at `ab70ef7b`, where the separation ran). It is not the retained copy, which `3fc3709f`
    changed. The fragments `cpu-separation.json` embeds for its four mutants equal the retained file's (checked by
    script). This is note N4.
  - Three lines `FAIL <BOUND>: mutant runs per row [3] (brief asks >= 10)` for EDGE_TRIM, TAG_SCAN (two rows) and
    ATTRIBUTE_SCAN. The lane's tool stops a row after 3 capped runs, which the coordinator's ruling permits ("the mutant's
    minimum"). These are informational, and my own rerun (section 3) gives 10 runs per row.
  - The check covers:
    - every commit the record names, each an ancestor of the head;
    - `testDiffSha256`, recomputed over `git diff 8ff50172 3fc3709f -- <9 tests>`;
    - the test files, unchanged from 3fc3709f to the head;
    - all 23 evidence-file digests, and that `files` covers every tracked evidence file;
    - each result's tool digest, at 3fc3709f and at the head;
    - for each of the 33 rule-6 cases, its fragments equal `mutant-cases.json`, and each `old` occurs exactly once in its
      file at the commit that side ran on;
    - for each of the 65 sides, its outcome agrees with its exit code and failed rows;
    - for each daemon-entry mutant, its `old` occurs once, or it is recorded as skipped, and its exit agrees with its
      failed rows;
    - that the CPU separation's tree differs from 3fc3709f only in `const …_CPU_MS =` lines;
    - each head maximum, mutant minimum and geometric-mean bound, recomputed.
- [Observed] Hosted checks at the head: `gh run view` gave `governance-docs 447d9f083fb120c14ddd8da646c03675f3ce7bc7 success`
  and `node-ci 447d9f083fb120c14ddd8da646c03675f3ce7bc7 success`.
- [Observed] Main moved while I worked. At the end, `refs/heads/main` was `546f1ff066e2ffef749c757cdb4621336039113b`
  (#529, `@syzygy/http-host`). `git diff --name-only 8ff50172 546f1ff0` lists 99 paths, and their intersection with the
  32 subject paths is empty (`comm -12`). Main's change does touch `apps/syzygy/src/main.ts`, the file the daemon-entry
  rows read: the shutdown handler moves into `closeOnSignal`, and `createDaemon` is imported from `@syzygy/http-host`.
  So I merged 546f1ff0 into 447d9f08 in a scratch branch, never pushed, and ran it after `npm ci` and `npm run build`:
  - the daemon-entry file: `Tests  16 passed (16)`;
  - the 8 changed unit files plus `subpath-imports.test.ts` and `island-boundary.test.ts`: `Tests  308 passed (308)`.

  The full list is `results/main-moved-paths.txt`.

## 2. Clauses relied on, and the class ruling

Quoted at the reviewed commit:

- CC-REV-1 (`.syzygy/governance/policies/craft-and-care/review-and-documentation.md:18-20`): "Changes touching any of seven
  classes require review by an independent, fresh-context reviewer, and the agent performing the change never finally
  decides which classes it touches." The classes, at `:31-32`, `:37` and `:40-41`:
  - "1. **authority boundaries** — write-universe, typed-authority table, adapter authorization (VIS-5, VIS-6);"
  - "4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
  - "6. **public interface** — machine-queryable endpoints, adapter contracts, anything an external consumer can depend on;"

  And `:49-50`: "**The change record states** which classes the change touches, or "none,"".
- GP-Q0 (`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`):
  - `:52-55`: "“Behavior-preserving” means none of the following changes: a rendered byte, a wire format, a refusal string
    or an exit code; a signed or digest-bound artifact; a consent, security or retention decision."
  - `:62-66`: "**Which ones:** pull requests touching class 1 (authority boundaries), class 3 (deterministic observation)
    or class 4 (security) … an old-versus-new differential over a mutated-record corpus …; a rule-6 mutant for each
    predicate; a non-blocking owner notice in the cycle report."
  - `:95-96`: "Any change not listed here to what a gate accepts or refuses stops and returns to the owner."
- The test-rigor bar (`git show 447d9f08:.claude/skills/th-engineering/subskills/test-rigor/SKILL.md`):
  - `:42-43`: "**A test is worth keeping only if some plausible bug makes it fail.**"
  - `:52-54`: "1. **Assert behavior, not implementation** — … A pure refactor should not break tests; a behavior change must."
  - `:64-67`: "4. **No tautologies** — A test that mirrors the implementation's logic to compute its expected value … verifies
    nothing. Expected values are literals or independently derived."
  - `:78-81`: "6. **Deterministic or quarantined** — A test that fails intermittently is worse than no test: it trains people to
    ignore red."
  - `:82-83`: "7. **A failure names the defect** — Test names state expected behavior".
- AGENTS.md verification rules, at 447d9f08:
  - `:126-127`: "6. Mutate the input and confirm the check fails, per predicate, before trusting it".
  - `:132`: "9. A claim of absence needs a sweep with a denominator."
  - `:134-135`: "11. An evidence record names its subject and the subject's digest".

**Class ruling: classes 1, 4 and 6.**
- **Classes 1 and 6, as the lane declared.** [Inferred] The changed daemon-entry rows are the evidence that the daemon path
  stays outside the POC app, which is the authority boundary #525 ruled on. The same file runs the daemon's CLI contract
  (`--help`, `--bogus`, exit codes, usage bytes). A test-only change touches a class when weakening it lets that class's
  regression land green, and F1 shows this one does.
- **Class 4, which I add.** [Inferred] The reader rows (`git-object-reader.test.ts`: special files "never block", the
  per-call byte budget, the delta-depth cap, the stored bound), the JUnit scan rows and the FIFO capture row test refusals
  of hostile bytes: a store inside the agent sessions' write reach, an operator- or project-supplied JUnit artifact, and a
  FIFO. Those are security bounds in CC-REV-1's sense ("anything under SEC-1…SEC-5").

The procedural consequence is nil. Class 1 already brings in every GP-Q0 check (`:62-66`), and this review is the
independent review.

**GP-Q0 gates.** [Observed] No product file changed: the changed paths outside the evidence directory are the 9 test
files, and my record check prints `OK   no product file changed base..HEAD`. So nothing a product gate accepts or refuses
changes, and no rendered byte, wire format, refusal string or exit code changes (`:52-55`). The 16 daemon-entry rows,
which pin the entry's bytes and exit codes, pass 5 of 5 times at the head. What does change is what the test suite
refuses: at base it refuses R1, R2 and R3 (F1); at head it accepts them. That is a defect to fix in the reviewed bytes,
not a gate decision for the owner. The stop clause (`:95-96`) is not triggered.

**The differential.** The lane's stand-in runs the old test against the new over the daemon-entry mutant corpus. In form
it is the right shape for a test-only change; its population was incomplete, as F1 shows.

## 3. What I ran and the results

All runs were on Node v24.6.0, 12 CPUs, in scratch clones at 447d9f08 after `npm ci`, each with a private TMPDIR. The host
was heavily loaded by other sessions throughout: load1 ranged from 31 to 148 across my runs (each run's figure is in its
result file).

### 3.1 Elapsed-time census (`tools/census_rev.mjs`; independent of the lane's `timing_census.py`)

- **Method.** The population is every tracked file under `apps/` or `packages/` matching `/\.test\.[cm]?[jt]sx?$/`, read
  from git objects and parsed with the TypeScript compiler.
  - Clock reads are calls of `Date.now`, `performance.now`, `process.hrtime`, `process.hrtime.bigint`,
    `process.cpuUsage`, `process.threadCpuUsage`, and argument-less `new Date()`.
  - Taint follows variables, assignments, destructuring and named functions to a fixed point.
  - Recorded: every `<`, `<=`, `>` or `>=` with a tainted operand; every `expect(A).toBe{Less,Greater}Than[OrEqual]` or
    `toBeCloseTo` with a tainted argument; every `setTimeout` whose callback rejects or throws; every `Promise.race`.
- **Second method, the denominator check.** Plain occurrence counts of each clock token over the same files.
  - At 8ff50172: `{'Date.now(': 38, 'performance.now(': 6, 'new Date()': 8, …} 52 ast reads 52`.
  - At 447d9f08: `{'Date.now(': 30, 'performance.now(': 0, 'new Date()': 8, 'process.threadCpuUsage(': 7, …} 45 ast reads 45`.
  - The token counts equal the AST read counts at both commits, so the AST reached every read.
  - A `git grep -F` sweep for `hrtime`, `process.uptime`, `performance.timeOrigin`, `performance.mark`, `console.time`,
    `Temporal.`, `.getTime()`, `os.uptime`, `Atomics.wait` and `expect.poll` returns 0 at both commits.
  - `setInterval(` (1 hit, a string literal in `watch-mode.test.ts:108`) and `vi.waitFor` (1, `main.test.ts:402`, a
    bounded wait) are the same at both commits.
- **Results.**
  - [Observed] Population: 250 files at 8ff50172 and 250 at 447d9f08. At `c104771f`, the lane's census base, it is 249,
    with the same 7 elapsed assertions.
  - [Observed] Wall-clock elapsed `expect` assertions: **7 at 8ff50172, 0 at 447d9f08.** The 7 are
    `capture-test-artifact-main.test.ts:381`, `main.test.ts:547`, `git-object-reader.test.ts:581`,
    `dossier-profile.test.ts:167`, `excerpt.test.ts:262` and `test-artifact-verification.test.ts:96` and `:103`.
  - [Observed] Race timers: 3 at base (`git-object-reader.test.ts:391` and `:392`, which are `refusedWithin`, and
    `cdp-browser.test.ts:22`); 1 at head (`cdp-browser.test.ts:22`).
  - [Observed] `refusedWithin` across `apps/**` and `packages/**`: at base, 10 occurrences (1 definition and 9
    `await refusedWithin(` call sites); at head, 0.
- **Every remainder at the head, classified.** These are all 45 clock reads and all 16 tainted comparisons:
  - **4 CPU-time assertions**, `expect(cpuMsSince(cpu)).toBeLessThan(…)` at `dossier-profile.test.ts:176`,
    `excerpt.test.ts:267` and `test-artifact-verification.test.ts:103` and `:110`. They involve 7 reads: 3 helper bodies
    and 4 region starts. They measure this thread's CPU, not wall time (section 3.2).
  - **13 deadline reads, behind 7 real comparisons.** These are at `main.test.ts:189-190`, `restart.test.ts:93-115` and
    `:266-294`, and `daemon-entry-unchanged.system.test.ts:101-104`. Each comparison ends a poll loop and throws a named
    error ("did not announce its address", "did not exit", "was not serving within"). They bound a wait; no speed is
    asserted. They are harness bounds of the same kind as explicit timeouts (`syzygy-bpyt.4.31`).
  - **25 now-input reads.** These are clock readings passed as inputs (`startedAt`, `asOf`, `now`, `capturedAt`,
    `toISOString()`), plus `new Date()` as a value in `canonical-json.test.ts:44`. No bound is compared against them. The
    lane's "16 now-input lines" counts `Date.now()` lines only; mine counts occurrences and includes `new Date()`. Both
    describe the same population.
  - **5 tainted comparisons that are not clock comparisons.** They come from taint by name: `main.test.ts:190`
    (`fake.registered() < 2`) and `:191`, `restart.test.ts:239` and `:240` (index checks), and
    `work-items.live.test.ts:30` (`files.length`).
  - **1 race timer**, the CDP fake's never-acknowledging `send` (`cdp-browser.test.ts:22`). It rejects after the
    `timeoutMs` it is handed (5 ms in the test) to simulate a socket that never answers. It is not an assertion.
- [Inferred] Every remainder is listed in the lane's record (`ac1Sweep`) and justified there or above. AC1's two named
  coverage items both hold: `main.test.ts:547` is in the base population and gone at the head, and so are the 9
  `refusedWithin` call sites.

### 3.2 CPU-time bounds

**My separation run** (`tools/cpu_sep_rev.py`).
- **Method.** It uses the lane's probe approach, but every (mutant, title) row runs 10 times with no early stop. Each site
  is capped at 11× its committed bound, so a capped run proves at least 11× separation. HOSTILE_LINE runs to completion.
- [Observed] Results (`results/cpu-sep-rev.json`, tree 447d9f08). Head figures are from 10 isolated runs; mutant figures
  are from 10 runs per row.

  | Bound | Committed | Head max | Bound ÷ head max | Mutant min (capped runs / runs) | Mutant min ÷ bound | load1 |
  |---|---|---|---|---|---|---|
  | EDGE_TRIM_CPU_MS | 1,900 | 57.43 ms | 33.1× | ≥ 20,902.7 ms (10/10) | ≥ 11.0× | 38–83 |
  | HOSTILE_LINE_CPU_MS | 140 | 1.847 ms | 75.8× | 14,559.5 ms (0/10) | 104.0× | 37–65 |
  | TAG_SCAN_CPU_MS | 1,500 | 60.16 ms | 24.9× | ≥ 16,504.0 ms (opening and plural rows, 10/10 each) | ≥ 11.0× | 34–115 |
  | ATTRIBUTE_SCAN_CPU_MS | 3,000 | 196.2 ms | 15.3× | ≥ 33,010.5 ms (10/10) | ≥ 11.0× | 45–148 |

- The capped figures are lower bounds by construction. The lane's own figures for the capped rows (31.6×, 40.0× and 20.0×)
  come from 60 s caps; mine show at least 11× by design.
- TAG_SCAN's near-miss row: the mutant does not reach it (`"notReached": [["scans near-miss tag names at the ceiling", 16.831]]`).
  This is N3.
- **Separation holds on both sides for all four bounds, under a heavier load than the lane's (load1 up to 148, against
  10.7–20.8).**

**Flake check, faithful whole-file runs** (`tools/cpu_flake_rev.py`).
- **Method.** Each assertion stays in place. One synchronous file append, logging the reading, is inserted before it.
  Each run is the whole file, so each region follows that file's other tests, as in a suite run. There were 50 runs per
  file and 4 runs at a time.
- [Observed] `nonzeroExits 0 failedRows 0 load1Range [38.09, 89.88]`, over 4,700 rows in 150 file runs.

  | Bound | n | max | p50 | Bound ÷ max |
  |---|---|---|---|---|
  | EDGE_TRIM | 50 | 65.88 ms | 58.89 | 28.8× |
  | HOSTILE_LINE | 100 | 1.03 ms | 0 | 136× |
  | TAG_SCAN | 150 | 54.75 ms | 34.55 | 27.4× |
  | ATTRIBUTE_SCAN | 50 | 188.4 ms | 151.15 | 15.9× |

- **No bound failed in 50 faithful runs per file under load.** That clears the brief's "fails once in 50" threshold.
- **Can load inflate thread CPU time enough to flake?**
  - [Inferred] Thread CPU excludes time spent waiting to run, so host load enters only through SMT and cache contention and
    frequency scaling. Here that moved max over median by at most 1.25× in the whole-file runs.
  - [Inferred] Garbage collection and compilation done on the test thread are counted, but they are already inside the
    measured maxima. The heaviest region (ATTRIBUTE_SCAN, 196 ms at its worst over 60 readings) sits 15.3× under its bound.
  - [Observed] Readings of 0 ms in excerpt regions show that the per-thread CPU figure moves in steps. This is irrelevant
    at a 140 ms bound.
- **The timed regions.**
  - [Observed] The excerpt, tag and attribute regions hold only the parse or build call and a trivial `expect`; their
    inputs are built before `process.threadCpuUsage()` is read.
  - [Observed] The dossier-profile region (`dossier-profile.test.ts:169-176`) also builds its inputs (`filler.repeat(40_000)`
    three times per pass, 8 passes) and awaits `clarify`. That is O(n) work, inside a 65.9 ms worst case against 1,900.
  - It is acceptable.

**The `engines` question.**
- [Observed] Node v22.18.0, which `package.json` `"node": ">=22.15"` admits, has
  `typeof process.threadCpuUsage === 'undefined'`, while `module.registerHooks` is a function there.
- [Observed] On it, the three CPU-bound files at 447d9f08 give `Tests  7 failed | 87 passed (94)`, each with
  `→ process.threadCpuUsage is not a function`. The same three files at 8ff50172 give `Tests  94 passed (94)`.
- [Observed] On Node 22.18, the daemon-entry file at the head gives `Tests  16 passed (16)`, with no warning on stderr.
- **Ruling:** a throw, never a skip or a silent pass, so the failure is loud and fail-closed. CI runs Node 24 only
  (`node-ci.yml:46`, `generation-mutation-gate.yml:38`). **A note (N1), not a blocking finding**: the change makes the
  suite red on a runtime the repository says it supports.

### 3.3 Daemon entry

**The lane's own population against both tests** (the lane's `daemon_entry_probe.py`, run unchanged).
- [Observed] Against the new test (`results/de-lane-new.json`), the outcomes equal the lane's table row for row:
  - every P- defect fails at least one new row; P-transitive fails the hook row only;
  - P-start-failure, P-entry-read and P-close-failure fail only the kept text row;
  - E-type-only-import fails the text row (spuriously);
  - E-comment-in-branch, E-renamed-binding and E-branch-swap pass (`exit 0 passed 16`);
  - H-hook-blind and H-no-preload fail the hook row.
- [Observed] Against the base test, `8ff50172`'s copy (`results/de-lane-old.json`), the outcomes also equal the lane's:
  - every P- mutant except P-transitive, and all four E- mutants, fail the old pin;
  - P-transitive passes the old pin (`P-transitive defect exit 0 passed 15 failed []`);
  - both H- mutants are skipped.

**My mutants** (`tools/de_rev_mutants.py`). Each runs against three test sets: the new test, the old pin, and the four
unit files that read `main.ts` or walk its import graph (`subpath-imports.test.ts`, `island-boundary.test.ts`,
`argv.test.ts` and `workspace-reach.test.ts`, 133 rows). [Observed] `results/de-rev-mutants.json`:

| Mutant | What it does | New test | Old pin | Static rows |
|---|---|---|---|---|
| R0-first-import | `import '@syzygy/three-surface-poc-app/dossier-site';` as main.ts's first import | **fail** (hook and text) | fail | pass |
| R1-flag-between-branches | `if (process.env.SYZYGY_PRELOAD_RENDERER === '1') await import(…dossier-site);` between the dossier and polaris branches | **pass 16/16** | fail | pass 133/133 |
| R2-flag-createRequire-before-daemon | the same flag; `process.getBuiltinModule('node:module').createRequire(import.meta.url)(…dossier-site)` just before the daemon line | **pass 16/16** | fail | pass 133/133 |
| R3-runtime-hook | unconditional, just before the daemon line: `registerHooks` (taken from `process.getBuiltinModule`) with a load hook that short-circuits POC-app URLs, then `await import(…dossier-site)` | **pass 16/16** | fail | pass 133/133 |
| R4-createRequire-transitive | `state-directory.ts` requires the POC app at module top through `createRequire`; main.ts unchanged | **fail** (hook row) | pass (missed) | pass |
| R5-worker-thread | a `Worker` evaluating dossier-site, started unconditionally before the daemon line | **fail** (hook row) | fail | pass |
| R6-island-barrel | `await import('@syzygy/polaris-generation-core')` (the provider island's barrel) before the daemon line | pass | pass | **fail** (`island-boundary`: "reaches no island module from the CLI entry") |
| R7-island-computed-flag | the island barrel by a computed name through `createRequire`, behind the flag | pass | pass | pass |

**The loads are real** (`tools/de_rev_demonstrate.py`). It runs the built mutant's `--help` with the PR's own hook text
preloaded, and separately under `strace -f -e trace=openat`, an observer independent of Node's module hooks. [Observed]
- **R1**, flag unset: `"hookLoggedPocUrls": 0`, `"straceOpenedPocDistFiles": 0`. Flag set: `"hookLoggedPocUrls": 6`,
  `"straceOpenedPocDistFiles": 6`. The six files are dossier-site.js and its imports under
  `apps/three-surface-poc/dist/`.
- **R2**: the same pattern, 0 and 0 unset, 6 and 6 set.
- **R3**, with the flag unset and with it set: `"hookLoggedPocUrls": 0` and `"straceOpenedPocDistFiles": 6`. The daemon
  path loads the POC app on every invocation, and the PR's hook never sees it.

**Answers.**
- **Is the hook installed before the entry's first import?** Yes [Observed]. R0, an import placed before every other
  import of main.ts, fails the hook row. `--import` preloads run before the entry module is resolved.
- **The hook sees** `require` through `createRequire` (R2 with the flag set, and R4) and worker threads (R5) [Observed].
- **It does not see** loads behind a condition the test does not set (R1, R2), or loads that a hook registered later
  short-circuits (R3) [Observed].
- **R1, R2 and R3 are daemon-path loads that the old pin caught and that every test now passes.** That is F1.
- **R7 passes at base and head alike.** It is a pre-existing gap and not a regression (N5).
- **Dropping the three equivalent kills** (E-comment-in-branch, E-renamed-binding, E-branch-swap): **right.**
  - Test-rigor bar 1 (`:52-54`): "A pure refactor should not break tests". Nothing on any daemon path loads the POC app in
    these three.
  - But the old pin's exactness was also what killed R1–R3. The replacement must keep those kills while passing the
    equivalents. The fix proposed in F1 does both (verified below).

**The F1 fix, checked in scratch** (`results/fix-check-lane.json`, `results/fix-check-rev.json`).
- **What I changed, in scratch only.** The kept text row now asks that every line naming the POC app lie strictly inside
  `  if (argv[0] === 'dossier') {` … the first following `  }`, or inside the polaris equivalent. This was a local
  commit, never pushed; it is not a proposal of exact bytes for the PR.
- [Observed] Against the lane's population:
  - all 10 P- defects fail; P-daemon-dynamic now fails the text row as well as the hook row;
  - E-comment-in-branch, E-renamed-binding and E-branch-swap pass (`exit 0 passed 16`);
  - E-type-only-import still fails the text row;
  - both H- mutants fail the hook row.
- [Observed] Against my mutants, R0, R1, R2, R3 and R5 fail the narrowed row, R4 fails the hook row, R6 fails only
  `island-boundary`, and R7 passes everything.

### 3.4 Byte and commit pins

- [Observed] In the record, each of the 5 `dossier-evaluation` mutants fails at both sides with a named value, for example
  `expected 669 to be 670`.
- [Observed] `redis-stop-at-first-misfit` fails at the head on the new greedy check. I re-ran it with the full message
  kept: `AssertionError: LICENSE.txt: expected 592 to be greater than 4228` at `redis-shaped-discovery.test.ts:144`. At
  base it failed only later, on the totals line.
- [Inferred] Independence (test-rigor bar 4, `:64-67`):
  - `INDEX_FIRST_LEVEL_BYTES` is located in the fixture text by a fixture-specific string (`'</details></section>'`), not
    by the module's element-close algorithm, so it is independent.
  - `INDEX_BYTES` and `DEEP_BYTES` use the same expression as the module (`Buffer.byteLength(html, 'utf8')`). For page
    bytes no other independent derivation than a literal exists. The residual the lane already discloses (ASCII-only
    fixtures, so a string-length miscount passes at both sides) is the real gap, and it was equally present with the
    literals.
  - `inputBytes` in the redis check is summed from the input corpus (`run.corpus.sources`), not from the capped
    selection under test, so it is independent of `discoverAndSelect`.
- [Observed] `self-corpus.test.ts:11` (`PINNED_MAIN`, the bead's "self-corpus.test.ts:9 pins commit 133106eb") is
  unchanged. Neither the PR body, the record (`"133106eb"` and `"PINNED_MAIN"` each occur 0 times in `bounds-and-pins.json`),
  the commit messages nor the lane's report disposes of it. The brief's summary says it "is handled per the PR"; it is
  not. This is N2.

### 3.5 Rule-6 mutants and outcome texts

- [Observed] The record's 33 cases give 65 sides, 65 as expected, recomputed (section 1).
- [Observed] Three head sides record only the first line `Error: STACK_TRACE_ERROR`: started-waits-for-bound,
  reader-no-depth-cap and reader-blocking-open. I re-ran them at the head (`results/mutant-failure-text.json`), and the
  default reporter shows the failing predicate: `Error: Test timed out in 5000ms.` for reader-no-depth-cap. The JSON
  reporter's first line for a vitest timeout is that placeholder (`node_modules/@vitest/runner/dist/chunk-hooks.js:638`,
  `new Error("STACK_TRACE_ERROR")`).
- So at the head these three properties are held by the per-test timeout, as ruling 1's fallback allows, but the record
  does not say which predicate failed. This is part of N4.
- [Observed] Independent row delta (`tools/row_delta_rev.mjs`, rows as written): `files 9; Tests: +2 ~17 -1`. This
  matches the PR.

### 3.6 Determinism

[Observed] `results/determinism-rev.json`: tree 447d9f08, Node v24.6.0, unmodified bytes, tree clean after.

| Run | Result | load1 at start |
|---|---|---|
| 8 changed unit files, × 5 | 277/277 passed each time | 36.7–47.4 |
| the changed system file, × 5 | 16/16 passed each time | 32.0–36.1 |
| 4 affected root projects (`--project` three-surface-poc-app, polaris-dossier, polaris-generation-core, three-surface-poc-core), × 2 | #1: 4,341 passed, 32 failed, 5 skipped of 4,378; #2: 4,335 passed, 38 failed, 5 skipped of 4,378. **0 failures in the 9 changed files**; 69 of the 70 failures are vitest timeouts, and 1 is a browser-profile drain error | 34.5→63.4, 63.4→127.4 |
| whole system suite, × 2 | 49 passed, 1 skipped of 50, both | 127.4, 103.0 |

[Inferred] The 70 project-run failures sit in files this PR does not touch (for example `waiting-sessions`, `close`,
`run-evidence`, `start-gates`, `render`, `review` and browser tests), at load1 up to 127 on 12 cores. They are the
load-sensitive timeout class the lane's attempts 1–3 recorded at the base (`c104771f`) too: in attempt 3 the base run
failed 8 rows, none in changed files. They are not attributable to this change (N7).

### 3.7 Gates

[Observed]
- `npm run typecheck` exit 0 at 447d9f08.
- `python3 scripts/check_governance.py` exit 0, ending `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted`.
  A grep of its output for the bead or any of the 9 test files returns nothing, so no WARN names this change.
- `python3 scripts/check_quotations.py` exit 0.
- I did not run the canonical battery. The PR's `commands=110 nonzero=0` is [Unknown] to me; the hosted runs at the head
  succeeded (section 1).

## 4. Findings

### F1 — blocking. The kept text row checks a window wider than the two branches, and three daemon-path loads the old pin caught now pass every test

- **Severity:** blocking. The brief's REVISE rule names "a daemon-path load the new row misses that the old pin caught".
  It is also a class-1 guard weakened with the suite green (test-rigor core rule, `:42-43`).
- **Evidence.**
  - The kept row, `daemon-entry-unchanged.system.test.ts:244-253`, fails only lines with
    `index < Math.min(...branches) || index > daemon`. That is the window from `main.ts:172` (the dossier branch opens) to
    `main.ts:196` (`  let parsed = parseCli(…)`). The window holds main.ts lines 186–189 and 195, which lie inside neither
    the dossier block (172–185) nor the polaris block (190–194). Code placed there runs for every argv that reaches the
    daemon.
  - The hook row (`:217-239`) runs only the default configuration: no feature variable, and no module hooks other than
    its own.
  - R1, R2 and R3 (section 3.3) each pass the new test 16/16 and the 133 static rows, and fail the old pin (`"old": [1, 14,
    ["…: each import is dynamic and inside the `dossier` or `polaris` branch"]]`). Each really loads 6 POC-app modules on
    `--help`: R1 and R2 with the flag set (hook and strace both 6); R3 unconditionally, with the hook at 0 and strace at 6.
  - The row's own name says "sits in the `dossier` and `polaris` branches", which the check does not test (test-rigor
    bar 7, `:82-83`).
- **Failure scenario.**
  - Someone adds `if (process.env.SYZYGY_PRELOAD_RENDERER === '1') await import('@syzygy/three-surface-poc-app/dossier-site');`
    between the two branches, to warm the renderer.
  - At base the text pin goes red. At this head every daemon-entry row, `subpath-imports`, `island-boundary`, `argv` and
    `workspace-reach` stay green.
  - An operator who sets the variable then runs a daemon that loads the POC app.
- **Proposed fix.**
  - **The fix.** Confine the kept text row to the branch blocks: every line naming `three-surface-poc-app` must lie strictly
    between `  if (argv[0] === 'dossier') {` and the first following line equal to `  }`, or between the polaris
    equivalents.
  - **Rename and re-comment.** Rename the row to say "inside the `dossier` or the `polaris` branch", and change its comment
    at `:241-243`.
  - **Checked in scratch.** That variant kills R1, R2, R3, every lane defect, and P-daemon-dynamic by text as well as by
    hook. It still passes the three equivalents whose kills were dropped (section 3.3).
  - **Optional, in the static walk.** Add to `subpath-imports.test.ts` that `walkDaemonPath().reachable` holds no module
    under `apps/three-surface-poc/`. That kills R1 and R3 by import graph, independent of line text. R2 needs the text row,
    because `createRequire(…)(…)` is not an edge the walk reads.
  - **Record.** Add R1, R2 and R3, or equivalents, to the daemon-entry mutant population, and re-run the old-against-new
    stand-in.

### N1 — note. `engines` admits Node versions on which the four CPU-bound sites throw

- **Evidence** (section 3.2). On Node 22.18.0 the head gives `Tests  7 failed | 87 passed (94)` with
  `process.threadCpuUsage is not a function`; the base passes 94/94. `package.json:5` reads `"node": ">=22.15"`, and
  `docs/CAPABILITY-1-IMPLEMENTATION-PLAN.md:25` says "TypeScript on Node.js (≥22.15".
- **Failure scenario.** A contributor on a supported Node 22 sees 7 red rows on a clean checkout and learns to ignore red
  (test-rigor bar 6, `:78-81`).
- **Why it is a note.** The failure is a loud throw, never a silent pass. CI and the host run Node 24.
- **Proposed fix**, one of:
  - raise `engines.node` to `>=23.9`, and the docs that state ≥22.15, in a bead that checks nothing else depends on 22;
  - or let `cpuMsSince` fall back to `process.cpuUsage()` when `threadCpuUsage` is absent, with the fallback named in the
    helper's comment. Process CPU counts other threads, but the 15–100× margins above leave room for it.

  Do not skip the rows: a skip passes the property unseen.

### N2 — note. Two exact pins the bead names, or that sit beside a replaced one, carry no recorded disposition

- **Evidence.**
  - `apps/three-surface-poc/src/polaris-generation/self-corpus.test.ts:11` pins `PINNED_MAIN` (the bead: "self-corpus.test.ts:9
    pins commit 133106eb, forcing fetch-depth 0"). The PR body, the record and the lane's report do not mention it.
  - `redis-shaped-discovery.test.ts:159` keeps `{ selected: 399_579, deferred: 3_471_698, cap: 400_000 }` in the
    `[Observed]` measurement row next to the replaced 390k window, with no stated reason.
  - The bead: "where a byte figure is the spec's contract … keep it and say so in the test name".
- **Failure scenario.** The bead closes with its outcome ("exact byte or commit pins remain only on deterministic fixtures
  whose bytes are the contract") unverified for these two, and `fetch-depth: 0` stays without a recorded reason.
- **Proposed fix.** Record a disposition for each in the record's `sites`, with a reason. For example: the M7 evidence
  binds the self-corpus commit; the `[Observed]` row's totals are the measurement it reports. Say so in each test's name or
  comment, as the bead asks. Or file a follow-up bead.

### N3 — note. The near-miss tag-names case carries TAG_SCAN_CPU_MS with no mutant that reaches it

- **Evidence.** My run: `"notReached": [["scans near-miss tag names at the ceiling", 16.831]]`. The lane gives 12.7 ms.
  The row shares the `it.each` bound at `test-artifact-verification.test.ts:103`. Ruling 1 says that where 10× cannot be
  shown, the site falls back to the per-site test timeout. AGENTS.md rule 6 asks for a failing mutant per predicate.
- **Failure scenario.** A future maintainer reads the bound as tested for this input when no known regression makes it
  fail.
- **Proposed fix.** Either write a mutant that is super-linear on `<testsuitex ` runs and measure it, or say in the test,
  in one line, that this case's bound has no mutant of its own. The PR body says so; the test does not.

### N4 — note. The record's links to two of its inputs are weaker than the rest (rule 11)

- **Evidence.**
  - `cpu-separation.json` names a `mutant-cases.json` digest that matches the copy at `0a6645ae`, not the retained file. The
    fragments it embeds match the retained file, so this is recoverable from git.
  - Three head sides record their failure only as `Error: STACK_TRACE_ERROR`, which is vitest's timeout. The record never
    says that those properties now rest on the per-test timeout.
- **Proposed fix.**
  - Have `build_record.py` check each result's `cases` digest, or record which commit's cases file a result used.
  - Have `bound_and_pin_mutants.py` keep the failure's message line rather than the first line. Or have the record state,
    per site, "fails by the test timeout" where that is the predicate.

### N5 — note. Daemon-path loads that neither the old pin nor the new rows catch (pre-existing)

- **Evidence.**
  - R7: the provider island's barrel, reached through a computed `createRequire` name behind a flag, passes every test at
    base and head.
  - [Inferred] By the same reasoning, a lazy import in a transitively imported module on a request path other than `/`
    (the hook row requests only `/`) passes both. The old pin never read transitive modules (P-transitive).
- **Failure scenario.** A provider-egress module loads on a daemon path with every test green.
- **Proposed fix**, a follow-up bead:
  - extend the hook row's prefix set to the island modules `island-boundary.test.ts` lists;
  - drive one machine route as well as `/`;
  - and/or have the static walk refuse `process.getBuiltinModule` and `createRequire(…)(…)` call forms on the daemon path,
    as it already refuses `node:module` edges.

### N6 — note. The kept text row fails a type-only import (residual, pre-existing in the old pin)

- **Evidence.** E-type-only-import fails the text row at the head, and also under the narrowed fix. Nothing loads.
  Test-rigor bar 1, `:52-54`.
- **Proposed fix.** Skip lines that start with `import type` when collecting naming lines, and add the type-only import
  as an equivalent mutant the row must pass.

### N7 — note. Affected-project runs at high host load fail in untouched files (pre-existing)

- **Evidence** (section 3.6). There were 32 and 38 failures at load1 up to 127, 0 in changed files, 69 of 70 of them
  vitest timeouts.
- **Proposed fix.** None in this PR. Attach these figures to the lane's discovered follow-up ("Pre-existing default-timeout
  failures when two full suites run at once") or to `syzygy-bpyt.4.31`.

## 5. Changed outputs

There are none. [Observed]
- The 32 changed paths are 9 test files and 23 evidence files. Product files changed: 0 (my record check:
  `OK   no product file changed base..HEAD`).
- No path is under `.syzygy/` or `openspec/` (0 of 32).
- The rows that pin the daemon entry's rendered bytes, usage text, refusal strings and exit codes pass 16/16 in all 5
  runs at the head, and on the scratch merge with main 546f1ff0.
- What changed are test rows (`Tests: +2 ~17 -1`) and what the test suite refuses (F1).

## 6. Verdict per acceptance criterion

- **AC1, "Sweep for elapsed-time assertions … returns only listed, justified cases": met.** [Observed] My census over 250
  head files finds 0 wall-clock elapsed assertions, and every remainder is listed and justified (section 3.1).
  `main.test.ts:547` and the 9 `refusedWithin` call sites are covered.
- **AC2, "Each replaced pin keeps a failing case (rule-6: break the property, confirm failure)": not met for the daemon
  entry.**
  - The bound and byte sites each keep a failing case [Observed]: 65/65 sides as expected, recomputed. N3 covers the one
    case without its own mutant, and the edge trim's case is now non-vacuous.
  - For the daemon-entry text pin, the property "the daemon path never loads the POC app" breaks with every test green
    under R1, R2 and R3 (F1).
- **AC3, "Full suite green twice under parallel load": met as recorded.**
  - [Observed] Attempt 5 at `d1dbac8d`: two sequential runs, 5,301 passed and 5 skipped of 5,306 each, load1 11.53–27.73.
    447d9f08 adds only evidence files.
  - [Observed] My own runs: 5 of 5 green for the changed files, and 2 of 2 for the system suite.
  - [Inferred] The affected-project failures at load1 up to 127 are pre-existing and outside the change (N7).
- **The coordinator's three rulings.**
  - Ruling 1 (CPU bounds): met. I confirm the separations; only N3 remains.
  - Ruling 2 (the load-hook row with its positive control): met, except that the kept part of the pin is wider than the
    defects it was kept for (F1).
  - Ruling 3 (timeouts left to `syzygy-bpyt.4.31`): met. No timeout changed except those the removed bounds implied.

## 7. Test quality

- **Good.**
  - The CPU bounds are now set from measurements, named, and reasoned in place.
  - The dossier-profile input now has the shape the old regex is quadratic on, which turns a vacuous guard into a live
    one.
  - The redis greedy check fails the stop-at-first-misfit mutant at the assertion that names the property, where the base
    caught it only on a totals line.
  - The load-hook row has a positive control (`dossier render` logs `dist/polaris-generation/dossier-site.js`), so a blind
    hook fails (H-hook-blind, H-no-preload).
  - In 4,700 faithful CPU-bound rows under load, 0 failed (bar 6).
- **Weaker than before.** The kept daemon-entry text row (F1). Its name states more than it checks (bar 7).
- **Unchanged weaknesses, disclosed by the lane.**
  - ASCII-only byte fixtures (bar 4).
  - The FIFO capture blocks in a synchronous open without the lstat refusal, at both sides.
  - The type-only-import spurious kill (N6).
- **Narrower detection.** `main.test.ts:547` now detects a report that is late past the 30 s test timeout, where the base
  bound was 5 s (`WAIT_MS / 2`). [Inferred] The helper is test code and the mutant that waits for its bound is killed, so
  this is acceptable.
- **Net delta** (bar 10): `+2 ~17 -1`. The +2 replace one removed row, a growth of one row in the daemon-entry file, which
  the hook row's new coverage (P-transitive) justifies.

## 8. Cleanup

- **Deleted:** my 5 scratch clones (`rev-532/clone`, `clone2`, `clone3`, `clone4`, `clone5`) and my TMPDIRs
  `/tmp/r532-1` to `/tmp/r532-7`.
- **Never pushed:** the scratch merge branch and the scratch fix-check commit. Nothing was pushed, commented or merged.
- **Daemons:** every one I started was a test's own child, on port 0 with a private state directory. `pgrep -af
  scratchpad/rev-532` listed no surviving process.
- **Kept**, under `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-532/`,
  each under 300 KB, with sha256:

| Kept file | sha256 |
|---|---|
| `pr-body.md` (PR #532's body, as read at review time) | `652d088aece3223f8a96e80427987ef54e9b9f9f037e8d4d0150b250e655a032` |
| `results/census-rev-447d9f08.json` | `5c8b966bc34c7e564f0aa0df111261462fea5068000eda8ff62da767e6b97a17` |
| `results/census-rev-8ff50172.json` | `53d7211adca53279682c77a2c7d3268c717b162d147bd97147b697391eb0f97b` |
| `results/census-rev-c104771f.json` | `e0808ee1b93b69ed81371e74e4c872d48d4dd4c2377d9c4b8d5888321c7076c6` |
| `results/check-governance.log` | `f21646e110b9afea6cf66ac453b64fc4d1734cf4f2aade8a573e25a91d3df6d2` |
| `results/check-quotations.log` | `9263aaccbc5e85b3f15ecdce7aa1ec184c9f7b0df1b7120e3852f997e54f071f` |
| `results/combined-daemon-entry.log` | `ef42825da0ffca897802cfa56d52b11739203d3c124fd983c15fb7f21c587b24` |
| `results/combined-unit.log` | `10036f7adb097cd326359327c1769a8a79a5ed87273a3cd90f1111d62ab93162` |
| `results/cpu-flake-rev.json` | `e1a284a615ed84d74dd4a114091c0470f565cdac7a14d89b39ab4469ad247852` |
| `results/cpu-flake-rev.log` | `51adec32cd0ce30b8b9c64beec910e1ed2089fc32b48ae7e2c41edc360cfb74b` |
| `results/cpu-sep-rev.json` | `a4d00ff4fc3ca709cb21e622053a3dc20f3731e352ac4b4d86e7521a9701def8` |
| `results/cpu-sep-rev.log` | `95772bb93e134ff73f689d07c896fb0ecb2b0c7a3ca7c079949c03057fec45ed` |
| `results/de-demo-R1.json` | `c2caf0518f6136380c86c867bc7aa26a49325c8de612b7000c59c8c93c0c21ca` |
| `results/de-demo-R2.json` | `201e69a99f096251491a9ea4c1ba8d2ea9bbd7a9dc57be582a0ed5dc31dd4ee6` |
| `results/de-demo-R3.json` | `b901761fe142a4bf0bd4a4ad20f4676518a4c095833916fb9d4e472407e30c21` |
| `results/de-lane-new.json` | `ace88771079a906759c361ad2429db11c66f1eec9d4531e4116078cca11bdac6` |
| `results/de-lane-new.log` | `c1e6dc4fecf153116dd12af844b7c92fbfe9727d7b997dc4f50cad2285453c9b` |
| `results/de-lane-old.json` | `f5db131756ecc71219d5f1d6296b38d4dfc2b1a03362bdf64aca17c4b07b0e01` |
| `results/de-lane-old.log` | `e7f9b1f803fec428e00a02aca5e865f3e357baba2b527bae8f24bb39c85a6cc9` |
| `results/de-rev-mutants.json` | `972488c682870deb9b9651f3986a7dbcf2e9ba1c24a5717a74201edf71c93de4` |
| `results/de-rev-mutants.log` | `39fa02b0e9fc554fefd25bd3dac8c1c451ce09cf1ebf7c2fdb55e18df832918a` |
| `results/determinism-rev.json` | `0fcb783b1d05134e9d0b94dcf436700fa30dce732a8c573d8f8a3da704c18474` |
| `results/determinism-rev.log` | `b33a349446467f677b400af89a6021e8918bd869777d0a7b070990342a84dea1` |
| `results/fix-check-lane.json` | `1b5b24adbafef679105a98de8c0516855cd69a57ad76ed84cf4b2fdea0601f1f` |
| `results/fix-check-lane.log` | `5021df571490677861704b95b45becfaf210c14ed5aa7b2145d57e289555578e` |
| `results/fix-check-rev.json` | `b41feeda9abb3bf73885821c69bc97c96e9cc3a6be9572008e99dc7be7b24280` |
| `results/fix-check-rev.log` | `d026ec3a3ad188192da185303ce43a618ab3352641028275fa42bde58e8a0131` |
| `results/main-moved-paths.txt` | `add0fc4d4a82da23d3c9bcb6e20278a914aa51db7540e355263531c3e548c50e` |
| `results/mutant-failure-text.json` | `50a2ab09debf73d13f236f418a0aff4c5b0940e83a726d7d29f2f03caefccc87` |
| `results/node22-cpu-files-base.log` | `2e824d65778a696f71ecf22e10db5ff9b7f5f5b094f009dfda2779cd5d28ef5b` |
| `results/node22-cpu-files.log` | `d685537ae5a781731b4a26f8729106c91eac81e190bbf668c6cb36d4abac9d05` |
| `results/node22-daemon-entry.log` | `b49fd0882f2ea61a3109328c5bf4d52b2c840cc50fd75fac6dfd4750ac2a27c0` |
| `results/record-check.txt` | `a16a8b5fc8adefbb4977a6b07bb1f291426378544ebe62bfc37e9ba9425007c5` |
| `results/row-delta-rev.txt` | `af291f20db681d9bc4a9db57b1a77846039feca90c6981c4b2613f794b83c22d` |
| `results/subject-paths.txt` | `160121adf7ced1c440b8c5e5dd76f0f4cce1744c7e29a64c64ab2fcaddec1592` |
| `results/typecheck.log` | `e2c8b37ba8c2974699631485e9c24406b9eb7c793bbbd178345cd4a0f86ce13f` |
| `tools/census_rev.mjs` | `79a649be989fe47828012e63b96f986e3e873d71157bdee0fe9a2090fae9525f` |
| `tools/cpu_flake_rev.py` | `c38dc88100b7535a839ac84357252674076f85542df6007c35f18e3aaf4900cb` |
| `tools/cpu_sep_rev.py` | `7ae4a15df6528010bd2c72475bfbf6ab048e5acc3e99001f964270d4dc01b5d4` |
| `tools/de_rev_demonstrate.py` | `9726dadf5ddaab3caa2bf8c24c7640b9cec9b3f18a16a7ed72e9805b83220618` |
| `tools/de_rev_mutants.py` | `c1408b3e655931239a2100ca1bca3d565593d32f535cce4fced587a31a4ee2cc` |
| `tools/determinism_rev.py` | `8534bf8a1a5db2e76afcd453d94b3c05212836d0d9db403efad42d762d16954d` |
| `tools/lane_daemon_entry_probe.py` (a copy of the lane's `docs/evidence/syzygy-bpyt-4-5/tools/daemon_entry_probe.py`; byte-identical to `git show 447d9f08:` of that path) | `4f00316eb90f0707059865156c22fa6aa58419aca77cbbba1ff16705707e5a31` |
| `tools/mutant_failure_text_rev.py` | `6378498d929e408f3654c9d55f95dc054e4158e7339390838d459af7ebf8181e` |
| `tools/record_check_rev.py` | `6a9c0be62bce083441412645f44bb6a881fc468916055e9a28aa190ae5c3c40e` |
| `tools/row_delta_rev.mjs` | `cf80c89309134a64586e10849787bdf291770dea4858cff0d8fee27d006b9a0c` |

46 kept files (10 tools, 35 results, `pr-body.md`), the largest `results/check-governance.log` at 171,832 bytes. This raw
is the 47th; its own sha256 cannot appear in itself and is given in the reply to `main`.
