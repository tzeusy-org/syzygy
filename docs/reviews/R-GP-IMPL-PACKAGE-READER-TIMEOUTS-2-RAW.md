# R-GP-IMPL-PACKAGE-READER-TIMEOUTS-2 — CC-REV-1 implementation review of syzygy-bpyt.4.13, round 2
Verdict: REVISE
Reviewed commit: dc60c5bc
Subject: r2-review.diff sha256 136f86ee0c0053f678e2d60659505834551b51e20440000b6c40bc364572894e

Reviewer: fresh-context CC-REV-1 reviewer (rev-520b), 2026-10-25. I did not write this change or round 1, and I changed
nothing. I fetched no target repository content and opened no credential file. Every run was in one scratch clone under
`rev-520b/`, each suite under its own `/tmp/r520b-*` TMPDIR. The clone and the TMPDIRs are deleted.

Why REVISE: the round-1 repair works for every timing round 1 and the lane probed, and for SIGHUP, SIGINT to the group, an
exception between the two writes and a second SIGTERM 190 ms into the cleanup. But the script can still leave a descendant
running, and can still leave the tree dirty:
- **F2.** A stop signal that lands while `subprocess.Popen(...)` is running leaves vitest's whole tree running in a session of
  its own. I reproduced this in 16 of 36 timed attempts.
- **F3.** A second stop signal that lands before line 100 has set `SIG_IGN` skips the whole cleanup. I reproduced this in 2 of
  18 attempts. Separately, an `ESRCH` from end_group's first `killpg` skips the restore (shown by fault injection).

The brief's verdict rule makes both blocking. N1, N3, N4, N5 and F1 (a), (b), (c), (e) and (g) are repaired. Nothing in the
test file moved except comment lines.

## 1. Subject identity checks

- [Observed] `sha256sum` of the frozen files:
  - `r2-review.diff` gives `136f86ee0c0053f678e2d60659505834551b51e20440000b6c40bc364572894e`;
  - `r2-delta.diff` gives `b55fc48da5685b81233a3e5a7e47b835611afbe64d86604737de44bf123d55ea`;
  - the round-1 raw gives `13044ae25a8dc51bab23ba976eba436098c1df64b8dd507a48c963f3ff7d23d7`.
  Each is the digest the brief names.
- [Observed] In my clone, `git diff df6046a1 dc60c5bc` hashes to `136f86ee…` (`tools/rederived-review.diff`): "15 files
  changed, 38324 insertions(+), 16 deletions(-)". Its name list equals `lead/b413/r2-paths.txt`.
- [Observed] `git diff 3e563ec4 dc60c5bc --` over those 15 paths hashes to `b55fc48d…` (`tools/rederived-delta.diff`): "8
  files changed, 456 insertions(+), 40 deletions(-)".
- [Observed] `git ls-remote` gives `dc60c5bc…` for `agent/syzygy-bpyt.4.13` and `df6046a1…` for `main`.
  `gh pr view 520` gives head `dc60c5bcb6ae6f1f31beee3aa0f6117adff5d6cf`, OPEN, MERGEABLE. `git merge-base df6046a1 dc60c5bc`
  is `df6046a1`.
- [Observed] Main changed 389 paths between `ce322e1a` and `df6046a1` (`tools/main-changed.txt`). None of them is one of the
  15 subject paths, the test file or the testkit (`comm` gives 0).
- [Observed] The branch commits since round 1:
  - `33bc9985`, the fix, touches 5 files;
  - `92795c39` merges main;
  - `48ee832a` changes only `probe_measure_restore.py` (+4/−2, SIGINT reset in the probed process);
  - `dc60c5bc` changes only the three evidence JSON files.
  So the script, the tools and the test file at `dc60c5bc` are byte-identical to `48ee832a`'s, the commit the records name.

**Evidence, checked by script (`tools/check_identity.py`, output `check-identity.txt`).**
- [Observed] Script and file digests:
  - test file: `ea6aa505…` at `ce322e1a`, `ff2e1d56…` at `3e563ec4`, `bee79580…` at `dc60c5bc`;
  - testkit: `3576a99d…` at `ce322e1a` and at `dc60c5bc`;
  - measurement script: `0ef82cd0…` at `3e563ec4`, `920c5f12…` at `dc60c5bc`.
- [Observed] All six duration records (`before-alone`, `before-full-1`, `before-full-2`, `before-profile`, `after-alone`,
  `after-full`) name script sha256 `0ef82cd0…`.
- [Observed] `timeout-sizing.json`:
  - `script.sha256` is the head's sizing script (`40bf70b5…`);
  - `subject.commit` is `48ee832a` and `dirty` is false;
  - `fileSha256` equals the head's test file;
  - each of its six `inputs` hashes to the committed file;
  - every other top-level key (`rule`, `inputs`, `denominator`, `check`, `tests`, …) equals the round-1 record's;
  - `check` is `{'problems': [], 'holds': True}`.
- [Observed] `measure-restore-probes.json`:
  - `tool.sha256` is the committed tool;
  - both `scripts[]` digests match `git show <commit>:scripts/measure_vitest_test_durations.py`, and the new one is the head's
    script;
  - its results are `('P0','new',0,clean,0 survivors,pass)`, `('D1','old',1,dirty,0,fail)`, `('T','old',-15,dirty,1,fail)`,
    `('I','old',-2,clean,1,fail)`, `('D1','new',1,clean,0,pass)`, `('T','new',143,clean,0,pass)` and
    `('I','new',-2,clean,0,pass)`.
- [Observed] `sizing-check-mutants.json`:
  - the tool's and `checkScript`'s digests match the committed files;
  - eight results: M0, M1, M2, M3, M4, R5, M5 and M6, each with `asExpected: true`;
  - `allAsExpected: true`;
  - every stored `old` fragment occurs exactly once in the head's file.

## 2. Clauses relied on, and the class ruling

- **CC-REV-1** (`.syzygy/governance/policies/craft-and-care/review-and-documentation.md`, at `dc60c5bc`): "Changes touching any
  of seven classes require review by an independent, fresh-context reviewer, and the agent performing the change never finally
  decides which classes it touches."
  - Class 4: "**security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
  - "**The change record states** which classes the change touches, or "none," so a misclassification is a findable violation
    after the fact."
  - "**A reviewer or the owner** may reclassify at any time."
- **GP-Q0, Part 1** (`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`): ""Behavior-
  preserving" means none of the following changes: a rendered byte, a wire format, a refusal string or an exit code; a signed or
  digest-bound artifact; a consent, security or retention decision."
- **AGENTS.md at `dc60c5bc`**:
  - Rule 4: "Read a check's output, not its exit code, and check its denominator against the whole population."
  - Rule 6: "Mutate the input and confirm the check fails, per predicate, before trusting it".
  - Rule 9: "A claim of absence needs a sweep with a denominator."
  - Rule 11: "An evidence record names its subject and the subject's digest; a record that names neither cannot be re-checked
    against the bytes it describes."
  - Guardrail: "A rule-6 evidence record must store each mutant's `old`/`new` fragment and the commit it ran at; ids and outcomes
    alone are not re-runnable, and a rebase-merge leaves the recorded commit reachable from no ref."
- **Test-rigor bar 6** (`th-engineering/subskills/test-rigor/SKILL.md`): "**Deterministic or quarantined** — A test that fails
  intermittently is worse than no test: it trains people to ignore red. Fix the nondeterminism (time, ordering, shared state) or
  delete the test; never retry-until-green."

**Class ruling: none, confirming round 1.**
- [Observed] The delta changes:
  - comment lines in the test file (§3);
  - two evidence scripts;
  - two new evidence tools;
  - three evidence JSON files.
- [Observed] No battery step, CI workflow, package manifest, `vitest.config.ts`, `apps/**` or `packages/**` source invokes any
  of the four. `git grep -l -F` for the two script names returns 14 files: 11 under `docs/evidence/syzygy-bpyt-4-13/`, the two
  scripts, and `package-reader.test.ts`, whose comment names the sizing script. The two tool names occur in no file outside
  their own records.
- Class 4 stays adjacent and untouched. The test file still tests the egress consent reader. But no assertion moved, and the
  scripts touch no reader, consent or egress path.
- GP-Q0: no product output changes (§6).

## 3. What I ran, and the results

Load1 during my runs ranged from 13.89 to 21.81 on 12 cores (`uptime` before each batch).

**Test file and timeouts (`tools/check_identity.py`).**
- [Observed] With every line whose stripped text starts `//` removed, `3e563ec4` and `dc60c5bc` are equal: "non-comment lines
  equal 3e563ec4 vs dc60c5bc: True", 1021 lines each.
- [Observed] difflib finds "changed hunks / changed lines / all comment lines: (1, 5, True)". That is one hunk: one comment line
  rewritten and three added.
- [Observed] There are 16 `}, N_000);` closers at both commits, with the same opener, enclosing test title, value and order:
  "timeouts equal (opener, title, value, order): True". All openers are `it`. The values are 10000, 15000 ×5, 20000 ×2,
  25000, 40000 ×3, 45000 ×3 and 50000.
- [Observed] The PR's identity claim holds. Remove the 7-line comment and the blank line after it, and turn each closer back
  into `});`, and the result equals `ce322e1a`'s bytes: "reversed head == ce322e1a bytes … True".

**Restore and process-group probes (`tools/restore_probe.py`, records under `probes/`, all listed in `probes-summary.txt`).**

How the probe works:
- Each probe starts the script in a session of its own, with SIGINT and SIGHUP reset to `SIG_DFL` and a private
  `/tmp/r520b-*` TMPDIR.
- It finds descendants by two methods:
  - walking `/proc` ppid links from the script's PID every 50 ms;
  - any process whose cwd is inside my clone and which started after the probe. This catches a child orphaned before a walk saw
    it.
- 3 s after the script exits, a descendant survives if:
  - its PID still has the recorded start time; or
  - it sits in a recorded process group or session; or
  - it is a cwd-in-clone process.
- Survivors were sent SIGKILL by PID, and a dirty tree was restored with `git checkout` of the two files.
- 85 records: 76 ran the head's script (`920c5f12…`), 9 ran `3e563ec4`'s (`0ef82cd0…`, copied to
  `tools/old_measure_vitest_test_durations.py`).

| Probe | Script | Exit | Tree after | Survivors | Pass |
|---|---|---|---|---|---|
| P0, profiled run to the end | new | 0, "299 tests of the file, 0 failed", 299 profile rows | clean | 0 | yes |
| D1, `--file consent-ports.test.ts` | new | 1, "the instrumentation anchor occurs 0 times" | clean | 0 | yes |
| D1 | old | 1 | " M …recorder-fixtures.testkit.ts" | 0 | no |
| second-write: OSError (ENOSPC) on opening the test file for write (`tools/inject.py second-write`; script bytes unedited) | new | 1, OSError traceback | clean | 0 | yes |
| second-write | old | 1 | testkit "M" | 0 | no |
| SIGTERM to PID, 3 s after vitest starts | new | 143 | clean | 0 | yes |
| SIGTERM to PID | old | −15 | both files "M" | 1, "node (vitest 1)" | no |
| SIGHUP to PID | new | 129 | clean | 0 | yes |
| SIGHUP to PID | old | −1 | both files "M" | 1 | no |
| SIGINT to the script's process group | new | −2 | clean | 0 | yes |
| SIGINT to the group | old | −2 | clean | 0 | yes (as round 1) |
| SIGTERM, then a second SIGTERM 190 ms later, while the group was still alive (inside the cleanup) | new | 143 | clean | 0 | yes |
| the same | old | −15 | both "M" | 1 | no |
| `timeout 3` (uutils coreutils 0.10.0, which signals the child, then its group), ×10 | new | 124 ×10 | clean ×10 | 0 ×10 | yes |
| `timeout 3`, ×2 | old | 124 ×2 | both "M" ×2 | 0 | no |

- [Observed] So F1's targeted repair holds for every case the brief asked for. The cases are SIGHUP, SIGINT to the group, an
  exception between the writes, and a second SIGTERM during the grace period. The probe discriminates: the old script fails
  every case except group SIGINT.
- [Observed] What the script writes, from P0's snapshot (`probes/new-p0.json`, `writtenSnapshot`).
  - Under the tree, the paths modified after the start were:
    - the two instrumented files, restored;
    - `node_modules/.vite/vitest/<hash>/results.json`;
    - 17 `scripts/__pycache__/*.pyc`.
  - `git status --porcelain --untracked-files=all` was empty afterwards.
  - The TMPDIR held only my `--out` file (`measure-out.json`) and `node-compile-cache`.
  - [Inferred] The results cache is vitest's and the `.pyc` files come from the recorder renders the tests spawn. A survivor
    cmdline in F2 shows one: `python3 -c import sys; sys.path.insert(0, 'scripts'); import record_public_source_screening_scope_v4_act`.
    So the script itself still writes only OUT.json, the two instrumented files, and a TemporaryDirectory it removes.

**Timing probes beyond the lane's record (F2, F3).**

| Probe | Attempts | Dirty | With survivors | Where the exit was raised (traced attempts) |
|---|---|---|---|---|
| term-early: SIGTERM d µs after the instrumented test-file write, d ∈ {0, 200, 500, 1000, 1500, 2000, 3000, 5000, 10000}, ×2 | 18 | 0 | 3 (d = 1000, 1500, 2000) | not traced |
| term-early traced (`inject.py trace-exit`, which only prints a SystemExit's traceback), d ∈ {800, 1000, 1200, 1500, 1800, 2200}, ×3 | 18 | 0 | 13 | all 13: inside `subprocess.Popen.__init__` → `_execute_child`, after `fork_exec` (subprocess.py:1796, 1809, 1811); the 5 clean ones: before the fork (`instrument` line 64, `os.get_exec_path`) or after `proc` was bound (`communicate`) |
| term-gap: two SIGTERMs g µs apart (busy wait), g ∈ {0, 30, 60, 100, 150, 200, 300, 500, 1000}, ×2, traced | 18 | 2 (g = 60, 200) | 2 | both dirty ones: second SystemExit raised in line 100's dict comprehension (`signal.py` → line 27's lambda); the 16 clean ones show a single exit from `communicate` |
| killpg-log: three normal runs, `os.killpg` passed through and logged | 3 | 0 | 0 | each logs one call, "KILLPG <pid> 0 -> ESRCH": the group was gone when end_group probed it |
| killpg-race: first `killpg(pid, 0)` ESRCH answered "alive", then the script's own `killpg(pid, SIGTERM)` gets the kernel's real answer | 1 | 1 (both files "M") | 0 | `ProcessLookupError: [Errno 3] No such process` at line 74, raised through line 103; exit 1, no OUT.json |
| hup-nohup: SIGHUP to PID with SIGHUP inherited ignored, as `nohup` starts it | 1 + 1 | 0 | 0 | new: exit 129, no record; old: exit 0, "299 tests of the file", 299 profile rows (N7) |

- The survivors in F2 were 10–11 processes in vitest's session. For example, `probes/early/new-term-early-2000-2.json` shows:
  - `npm exec vitest run …`, `sh -c "vitest" run …` and `node (vitest)`;
  - esbuild;
  - `node (vitest 1)` … `node (vitest 6)`;
  - a running `python3` recorder render.
  They were state S or R 3 s after the script exited 143. The tree was clean in all 36 term-early attempts.
- [Observed] After all probes, no process had its cwd in my clone ("processes with cwd in clone: 0"). `git status --porcelain`
  in the clone was empty before I deleted it.
- **Tool history.** I extended `restore_probe.py` twice during the session: `--inject` for any mode, the `timeout` mode, and a
  fix to the survivors print.
  - In two first-sweep attempts the old print crashed on a `None` cmdline. Both crashes came after the survivors were killed and
    the JSON was written.
  - The earlier modes' behaviour is otherwise unchanged. The kept tool is the final version.

**The sizing check and N1's mutants.**
- [Observed] The lane's `sizing_check_mutants.py` re-run at the head reproduces all 8 records (`sizing-mutants-lane-rerun.txt`).
  - M0 and M6: exit 0, "299 collected, 16 sized (10 from a lower bound), 0 problems".
  - M1–M5 and R5: exit 1.
  - R5 prints "problem: the default the tests carry is 60000 ms, not 5000 ms: the threshold assumes a 5000 ms default".
- [Observed] My mutants (`tools/my_mutants.py`, `my-mutants.txt` and `my-mutants.json`), each run against the head's check and
  `3e563ec4`'s (`c8a439a2…`):

  | Id | Mutant | Head | `3e563ec4` |
  |---|---|---|---|
  | control | none | 0, "0 problems" | 0, "0 problems" |
  | R5 | consent project `testTimeout: 60_000` (the lane's) | 1 | 0, "0 problems" |
  | R6 (mine) | consent project `testTimeout: 2_000`, the default lowered, the direction R5 does not test | 1, "the default the tests carry is 2000 ms, not 5000 ms…" | 0 |
  | R7 (mine) | `vi.setConfig({ testTimeout: 60_000 });` after the vitest import in the test file, the default raised by the file rather than the config | 1, "…is 60000 ms, not 5000 ms…" | 0 |

  The tree was clean after each.

**Suites and gates at `dc60c5bc`.**
- [Observed] `package-reader.test.ts` alone, default config, load1 15.27→13.96: exit 0, "Tests  299 passed (299)". The agreement
  test took 1,975 ms and the next slowest 852 ms (`file-run-head.log`, `file-run-head.report.json`).
- [Observed] The consent project: exit 0, "Test Files  7 passed (7)", "Tests  503 passed (503)" (`project-run-head.log`).
- [Observed] `npm run typecheck`: exit 0 (`typecheck.log`).
- [Observed] `python3 scripts/check_governance.py`: exit 0, "32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted"
  (`check-governance.log`).
- [Observed] `python3 scripts/check_quotations.py`: exit 0, "36 quotations examined in 17 of 939 .md files scanned
  (loc-paren-quote 2, loc-colon-quote 24, quote-paren-loc 10), 0 findings" (`check-quotations.log`).
- [Observed] The PROJECT-STATUS battery: I ran it in the clone with `tools/battery.py`. The tool takes the first `sh` block under
  "## How to verify this page", runs one line per command, and lets assignments set the environment. It printed
  "commit=dc60c5bcb6ae6f1f31beee3aa0f6117adff5d6cf commands=110 nonzero=0" (`battery.log`, `battery.json`).
  - I also read each command's last output line. Only one contains "FAIL" other than as "0 FAIL": "7 of 7 predicates without
    FAIL; PASS".
  - This reproduces the lane's line.

## 4. Round 1's findings

| Item | Verdict | Evidence |
|---|---|---|
| F1 (a): check both anchors before writing either | **Repaired** | `instrument()` reads both files and checks both anchors before any write (lines 55-64). D1: the head is clean with exit 1; `3e563ec4` leaves the testkit "M". |
| F1 (b): `instrument()` inside the `try`; restore only what was written | **Repaired** | Lines 93-104: the call is at line 96 inside `try`, `written` is appended before each write, and `git checkout -- *written`. The second-write injection: the head is clean, `3e563ec4` leaves the testkit "M". |
| F1 (c): SIGTERM and SIGHUP to `SystemExit` | **Repaired as specified**, with N7 | Line 27. SIGTERM exits 143, SIGHUP 129, clean, 0 survivors; old dirty with 1 survivor each. But the handler also overrides an inherited `SIG_IGN` (N7), and raising from a handler is what opens F3 (a). |
| F1 (d): vitest in its own session, `killpg` SIGTERM then SIGKILL in `finally` | **Not repaired in full** (F2, F3 (b)) | Lines 66-80, 97 and 103 do this whenever `proc` is bound. But the session exists before `proc` is bound: 13 of 13 traced orphanings were raised between `fork_exec` and the assignment. Line 74's `killpg(SIGTERM)` is unguarded. |
| F1 (e): rule-6 record of D1 and SIGTERM | **Repaired** | `measure-restore-probes.json` stores the commit `48ee832a`, both script digests (verified against `git show`), each probe's command and signal, and the predicate. D1, T and I fail against `0ef82cd0…` and pass against `920c5f12…`; P0 is the new-only control. My own D1 and SIGTERM reproduce both sides. The old script's bytes are recoverable from `3e563ec4`, which stays reachable as long as PRs land by merge commit. [Observed] The last 8 first-parent commits on `main` are all "Merge pull request". |
| F1 (f): correct the docstring and the PR's "Changed outputs" sentence | **Not repaired** (F2, F3) | Both were rewritten. But each new sentence is false in a case shown in §3. Docstring lines 14-16: "whichever file was written is restored from git when the run ends, however it ends short of SIGKILL". Lines 18-19: "so no descendant outlives the run". PR body line 105: "It restores whichever it wrote, however the run ends short of a SIGKILL of the script itself". |
| F1 (g): say the six records keep the old digest | **Repaired** | PR body line 17 says so. By script, all six name `0ef82cd0…`. |
| N1: `--check` fails unless the default is 2 × THRESHOLD_MS; R5 recorded and killed | **Repaired** | Line 98. R5 is in the record and reproduced (exit 1). My R6 (lowered default) and R7 (`vi.setConfig` in the file) are killed by the head and survive `3e563ec4`. |
| N3: the comment names the load envelope | **Repaired** | "They are sized for load1 up to about 127 on 12 cores, and ten of the sixteen from lower bounds: tests that timed out at that load." Comment lines only (§3). |
| N4: the comment names the whole-file-in-order dependence | **Repaired** | "They are also sized for the whole file run in order. The render cache moves each render's cost to whichever test needs it first, so a run filtered with -t, or shuffled, can time out a test that carries no timeout." No timeout or assertion moved (16 of 16 equal; non-comment lines equal). |
| N5: the PR body names 4.8 and 4.23 | **Repaired** | PR body line 111. `bd show`: syzygy-bpyt.4.8 is "Render the recorder testkit's act fixtures without blocking the vitest worker" (open); syzygy-bpyt.4.23 is "package-reader.test.ts: give the policy-port/strict-chain agreement sweep a count-based budget and dedupe its worlds (PR 520 R1 N2)" (open). |
| N2, N6: named correctly in the PR body | **Yes** | PR body lines 111-112 name 4.23 and 4.24. syzygy-bpyt.4.24 is "Size the dossier-project load timeouts that syzygy-bpyt.4.13's comments added (gate-acts, screen, close, execution-flags, run-evidence) (PR 520 R1 N6)" (open). Both 4.23 and 4.24 list syzygy-bpyt.4.13 as `blocks`, so "4.23 and 4.24 both depend on 4.13" holds. |

## 5. New findings

### F2 — A stop signal during `subprocess.Popen(...)` leaves vitest's whole tree running (blocking)

**Severity:** medium. This is evidence tooling, not product. It is blocking under the brief's rule: "A script that can still
leave … a descendant running, is blocking."

**Evidence:**
- [Observed] `one_run` binds `proc` only when `subprocess.Popen(..., start_new_session=True)` returns (line 97). The `finally`
  ends the group only `if proc is not None` (line 103).
- [Observed] Line 27's handler raises `SystemExit` at the next bytecode boundary. If that boundary falls inside `Popen.__init__`
  after `fork_exec`, three things follow:
  - the child, `npm exec vitest …`, is already running in its own session;
  - `proc` stays `None`;
  - no process-group signal ever reaches it.
  [Observed] In CPython 3.10.12's `subprocess.py`:
  - the child exists once `fork_exec` returns (line 1796);
  - the parent then closes pipe ends (lines 1809 and 1811) and waits on the exec error pipe (line 1818);
  - `Popen.__init__`'s `except:` clause (line 980) closes the pipes and re-raises, and kills nothing.
- [Observed] SIGTERM 0.8–2.2 ms after the instrumented test-file write left 10–11 processes alive 3 s after the script exited
  143, in 16 of 36 attempts (3 of 18 untraced, 13 of 18 traced). In all 13 traced cases the exit was raised inside
  `_execute_child` after `fork_exec`. In all 5 traced clean cases it was raised before the fork or after `proc` was bound.
- [Observed] The tree was clean in all 36. The restore still runs: `written` is set, only `end_group` is skipped.
- [Inferred] The same window takes SIGHUP (same handler) and SIGINT, since `KeyboardInterrupt` follows the same path. There is
  one window per run, so `--runs N` has N of them.
- Because vitest is in its own session, the orphan is out of reach of every group-based stop: neither a terminal's SIGINT nor a
  `timeout` or harness signal to the script's group reaches it. The old script orphaned vitest on any SIGTERM, so this is not a
  regression from `0ef82cd0…`. It is a gap in repair (d), and it makes "so no descendant outlives the run" false.

**Failure scenario:** syzygy-bpyt.4.24 instructs lanes to measure five dossier files "with the committed
scripts/measure_vitest_test_durations.py (with its F1 restore repair)". A lane, harness or user stops a measurement just as a
run starts, for example a cancelled background task or a Ctrl-C right after launch. The ~1 ms window per run is hit.
- vitest's six workers and its recorder renders keep loading a host that other lanes are timing.
- Nothing will stop them short of a PID-level kill, and the script has already exited 143 without saying so.

**Proposed fix:** see the shared fix after F3. Rule-6 for this finding: probe E in that fix.

### F3 — The restore and the group stop in `finally` can still be skipped (blocking)

**Severity:** medium (a), low (b). Blocking under the brief's rule: "A script that can still leave the tree dirty … is
blocking."

**Evidence:**
- **(a) A second stop signal before line 100 has set `SIG_IGN`.**
  - [Observed] The first `SystemExit` unwinds to the `finally`, whose first statement is the dict comprehension that calls
    `signal.signal(s, SIG_IGN)` for SIGINT, then SIGTERM, then SIGHUP.
  - A second SIGTERM whose Python handler runs inside that comprehension raises a second `SystemExit` out of the `finally`. Both
    the inner `try` and its own `finally` are skipped: no `end_group`, no `git checkout`.
  - [Observed] With two SIGTERMs 60 µs and 200 µs apart, 2 of 18 attempts left both files " M" and one `node (vitest 1)`
    running (state R). Both traces end in line 100's `<dictcomp>` → `signal.py` → line 27's `<lambda>`
    (`probes/gap/new-term-gap-60-2.json`, `…-200-1.json`).
  - [Observed] Ten runs under `timeout 3` (uutils 0.10.0), which sends SIGTERM to the child and then to its group, were all clean.
    So on this host I did not reproduce a natural double sender. [Unknown] whether GNU `timeout`, a closing terminal (SIGHUP to
    the foreground group, then from the shell) or a harness that signals a PID and then its group lands two signals inside the
    window.
- **(b) `ESRCH` from end_group's first `killpg`.**
  - [Observed] Line 74, `os.killpg(proc.pid, signal.SIGTERM)`, is not guarded, while line 78's SIGKILL is.
  - If the group empties between `alive()`'s `killpg(pid, 0)` (line 70) and line 74, `ProcessLookupError` propagates out of
    `end_group` at line 103, before line 104's `git checkout`.
  - [Observed] Under injection (`tools/inject.py killpg-race`), which makes only the probe at line 70 answer "alive" once and
    leaves the SIGTERM call to the kernel, a complete normal run exits 1 with
    "ProcessLookupError: [Errno 3] No such process", both files left " M" and no OUT.json.
  - [Observed] On 3 of 3 normal runs `alive()` already saw ESRCH, so the normal path returns early and does not reach line 74.
  - [Inferred] The interleaving needs a group that is dying when the stop signal arrives, for example vitest finishing, or a
    supervisor signalling both. It is narrow and I did not reproduce it without injection.
- Either way the docstring's "however it ends short of SIGKILL" is false. So is PR body line 13's "further stop signals are
  ignored during cleanup".

**Failure scenario:** a profiled measurement stopped by a sender that delivers two signals tens of microseconds apart leaves
the testkit's `spawnSync` wrapper and the test file's `PROF` hooks in the worktree, with a worker still running. A lane
committing "all changes" ships the instrumentation into a helper with 46 call sites. That is round 1's F1 scenario, narrowed,
not closed.

**Proposed fix (F2 and F3):**
1. Let the stop handlers only record the signal, for example set a flag and `signal.set_wakeup_fd`, and never raise. Cover
   SIGINT too. Install each only where the inherited disposition is not `SIG_IGN` (N7).
2. Replace `proc.communicate()` with a stdout reader thread and a loop on `proc.poll()` and the flag. Run the cleanup in ordinary
   control flow once the loop ends. No exception can then arrive between `fork_exec` and `proc =`, or inside the cleanup.
   A flag set before the fork is seen right after `proc` is bound.
3. In `end_group`, treat `ProcessLookupError` from the first `killpg` as "already gone". Put `git checkout -- *written` in a
   `finally` of its own, so nothing in `end_group` can skip it.
4. Optionally, round 1's alternative: instrument a throwaway `git worktree` instead of the caller's tree. That removes the
   dirty-tree class even under SIGKILL. The orphan class still needs (1)–(2).
5. Extend `docs/evidence/syzygy-bpyt-4-13/tools/probe_measure_restore.py` with four probes:
   - E: SIGTERM 0.8–2.2 ms after the instrumented test-file write, at least 18 attempts;
   - G: two SIGTERMs 0–1000 µs apart, at least 18 attempts;
   - K: the `killpg` ESRCH injection;
   - H: SIGHUP with SIGHUP inherited ignored.

   Each of E, G and K must fail in at least one attempt against `dc60c5bc`'s script (`920c5f12…`) and pass in every attempt
   against the fix. Store attempts, denominators, the commit and both digests. `rev-520b/tools/restore_probe.py` and
   `inject.py` reproduce E, G and K today.
6. Correct docstring lines 14-19 and PR body lines 13 and 105 to what the fix guarantees.

### N7 — The SIGHUP handler overrides an inherited `SIG_IGN`, so `nohup` no longer protects a measurement

**Severity:** low. The tree stays clean; a run is lost.

**Evidence:** [Observed] Line 27 installs the handler unconditionally. Started with SIGHUP ignored, as `nohup` starts it, and
sent SIGHUP 3 s into vitest:
- the head's script exits 129 with no record (`probes/new-hup-nohup.json`);
- `3e563ec4`'s script ignores it and finishes: exit 0, 299 tests, 299 profile rows (`probes/old-hup-nohup.json`).

**Failure scenario:** someone runs a long `--mode full --runs N` measurement under `nohup` and closes the terminal. The run that
nohup was meant to protect ends at the hangup.

**Proposed fix:** install the SIGTERM and SIGHUP handlers only when `signal.getsignal(s) is not signal.SIG_IGN`, as CPython does
for SIGINT. Add probe H (F3 fix, step 5) to the record.

## 6. Every changed output, or the evidence that there is none

- **Product code.** [Observed] The subject changes no file under `apps/**` or `packages/**` other than
  `package-reader.test.ts`, and none of `vitest.config.ts`, the testkit, any `package.json`, `.syzygy/**` or `openspec/**`
  (15-path list, §1). The delta changes only comment lines in the test file.
- **GP-Q0's list.**
  - No rendered byte, wire format, refusal string or exit code of any product changes.
  - No signed or digest-bound artifact changes. [Observed] The swept citers of the scripts are the 14 files in §2. None is a
    manifest under `.syzygy/` or `openspec/`.
  - The test file's digest moves from `ff2e1d56…` to `bee79580…`. `timeout-sizing.json` names the new digest and is
    regenerated.
  - No consent, security or retention decision changes.
- **What a gate accepts or refuses.** Unchanged since round 1. The 16 timeouts are byte-identical, so the vitest verdict is
  what round 1 described. No battery step or CI job runs either script ("commands=110 nonzero=0").
- **The evidence tools' own outputs.** Changed, as intended or as found:
  - `size_vitest_test_timeouts.py --check` now exits 1 when the collected default is not 5000 ms (R5, R6, R7).
  - `measure_vitest_test_durations.py` exits 143 on SIGTERM and 129 on SIGHUP, where it used to die by the signal (−15 and −1).
  - It now exits on SIGHUP even when started under `nohup` (N7).
  - It no longer leaves the tree dirty in the probed cases. F2 and F3 are its remaining gaps.
- **Evidence.** One new JSON (`measure-restore-probes.json`), two regenerated (`sizing-check-mutants.json` and
  `timeout-sizing.json`), and two new tools. `check_governance` and `check_quotations` stay clean.

## 7. Verdict per acceptance criterion

The bead has no `acceptance_criteria` field. I judge against the brief's repair list and round 1's criteria.

| Criterion | Verdict | Basis |
|---|---|---|
| F1 (a), (b), (e), (g) | Met | §4 |
| F1 (c) | Met as specified | §4. N7 is a side effect. |
| F1 (d): no descendant outlives a stopped run | **Not met** | F2. F3 (a) also leaves a worker. |
| F1 (f): the claims say what the script does | **Not met** | F2, F3 |
| Rule-6 record of the restore paths, failing old and passing new, with commit, digests and fragments | Met for the probes it has | They do not cover F2's or F3's timings (F3 fix, step 5). |
| N1 | Met | R5 reproduced; R6 and R7 killed by the head, surviving `3e563ec4` |
| N3, N4: comment lines only | Met | Non-comment lines equal; 16 of 16 timeouts equal |
| N5, and N2/N6 named correctly | Met | `bd show` titles and `blocks` edges |
| No assertion or timeout moved since round 1 | Met | §3 |
| PR body claims | Met except lines 13 and 105 | Lines 5, 15-18, 21, 22, 64, 111-112 and 115-125 reproduced by script or run, including "commands=110 nonzero=0" at `dc60c5bc`. Lines 13 and 105 are false under F2 and F3. Line 119's "load1 about 36" is the lane's; mine was 15. |
| Class ruling none | Confirmed | §2 |

## 8. Cleanup

- **Deleted:** the scratch clone `rev-520b/clone`, after `git status --porcelain` showed it clean, and every TMPDIR I made:
  `/tmp/r520b-battery`, `-file`, `-gates`, `-mut` and `-proj`, plus each probe's own `/tmp/r520b-<mode>-<pid>`, which the probe
  removed. [Observed] `ls -d /tmp/r520b-*` returns "No such file or directory". Nothing outside my TMPDIRs was deleted.
- **Processes:** every survivor was sent SIGKILL by PID, taken from my probe's own `/proc` walk or from its cwd-in-clone scan. No
  kill was by name or pattern. [Observed] Afterwards no process had its cwd in my clone.
- **Nothing pushed, commented or merged.** No worktree under `/home/tze/GitHub/syzygy/.worktrees/` was touched.
- **Kept**, all under `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-520b/`.
  `KEPT-FILES.sha256` (sha256 `b1c16c117ad82aaa8428bba20fe626a65e353c770c1139d5201802901881afe1`) lists all 125 kept files with
  their digests: every file except this raw and itself.
  - **Tools** (`tools/`): `check_identity.py`, `restore_probe.py`, `inject.py`, `my_mutants.py`, `battery.py` and
    `summarize_probes.py`.
  - **Tool inputs:** `old_measure_vitest_test_durations.py` and `old_size_vitest_test_timeouts.py`, the `3e563ec4` copies
    (`0ef82cd0…` and `c8a439a2…`).
  - **Tool logs:** `rederived-review.diff`, `rederived-delta.diff`, `subject-paths.txt`, `main-changed.txt` and `npm-ci.log`.
  - **Results** (`rev-520b/`): `check-identity.txt`, `pr-body.md` (sha256 `a54b697e…`, the body as fetched), `probes-summary.txt`,
    `sizing-mutants-lane-rerun.json` and `.txt`, `my-mutants.json` and `.txt`, `file-run-head.log`,
    `file-run-head.report.json`, `project-run-head.log`, `typecheck.log`, `check-governance.log`, `check-quotations.log`,
    `battery.log` and `battery.json`.
  - **Probes** (`probes/`): 85 JSON records and their logs, in `probes/`, `probes/early/`, `probes/early-traced/`, `probes/gap/`
    and `probes/timeout/`.
